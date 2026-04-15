const { parse } = require("csv-parse/sync");
const Product = require("../models/productModel");

const bulkUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const content = req.file.buffer.toString("utf8");
    let rows;
    try {
      rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    } catch (e) {
      return res.status(400).json({ message: "Invalid CSV format" });
    }
    if (rows.length > 500) return res.status(400).json({ message: "CSV exceeds 500 row limit" });
    if (rows.length === 0) return res.status(400).json({ message: "CSV file is empty" });

    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header
      if (!row.name || !row.name.trim()) errors.push({ row: rowNum, field: "name", message: "name is required" });
      if (!row.category || !row.category.trim()) errors.push({ row: rowNum, field: "category", message: "category is required" });
      const price = parseFloat(row.price);
      if (isNaN(price) || price <= 0) errors.push({ row: rowNum, field: "price", message: "price must be a positive number" });
      const stock = parseInt(row.stock, 10);
      if (isNaN(stock) || stock < 0) errors.push({ row: rowNum, field: "stock", message: "stock must be a non-negative integer" });
    }
    if (errors.length) return res.status(400).json({ errors });

    const mongoose = require("mongoose");
    const sellerObjId = mongoose.Types.ObjectId.isValid(req.user) ? new mongoose.Types.ObjectId(req.user) : req.user;

    const docs = rows.map(row => ({
      name: row.name.trim(),
      category: row.category.trim(),
      price: parseFloat(row.price),
      stock: parseInt(row.stock, 10),
      description: row.description?.trim() || "",
      discount: parseFloat(row.discount) || 0,
      image: row.imageUrl?.trim() || "",
      sellerId: sellerObjId
    }));

    const created = await Product.insertMany(docs);
    res.status(201).json({ count: created.length, productIds: created.map(p => p._id) });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { bulkUpload };
