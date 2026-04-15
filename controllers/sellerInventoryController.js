const Product = require("../models/productModel");

const getInventory = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const sellerObjId = mongoose.Types.ObjectId.isValid(req.user) ? new mongoose.Types.ObjectId(req.user) : req.user;
    const products = await Product.find({ sellerId: sellerObjId });
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.sellerId?.toString() !== req.user) return res.status(403).json({ message: "Forbidden: not your product" });
    const { price, description, discount, stock } = req.body;
    if (price !== undefined && price < 0) return res.status(400).json({ message: "price and stock must be non-negative" });
    if (stock !== undefined && stock < 0) return res.status(400).json({ message: "price and stock must be non-negative" });
    const updated = await Product.findByIdAndUpdate(
      req.params.productId,
      {
        ...(price !== undefined && { price }),
        ...(description !== undefined && { description }),
        ...(discount !== undefined && { discount }),
        ...(stock !== undefined && { stock })
      },
      { new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.sellerId?.toString() !== req.user) return res.status(403).json({ message: "Forbidden: not your product" });
    await Product.findByIdAndDelete(req.params.productId);
    res.json({ message: "Product deleted" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getInventory, updateProduct, deleteProduct };
