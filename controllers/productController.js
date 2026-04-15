
const Product = require("../models/productModel");


/* ADD PRODUCT */

const addProduct = async (req, res) => {

  try {

    const { name, price, category, description } = req.body;

    const product = new Product({
      name,
      price,
      category,
      description,
      image: req.file ? req.file.filename : null
    });

    await product.save();

    res.json(product);

  } catch (error) {
    res.status(500).json({ message: "Error adding product" });
  }

};



/* GET PRODUCTS WITH PAGINATION + SEARCH + CATEGORY */

const getProducts = async (req, res) => {

  try {

    const page = Number(req.query.page) || 1;
    const limit = req.query.limit ? Number(req.query.limit) : 12;

    const skip = (page - 1) * limit;

    const { category, search, minPrice, maxPrice } = req.query;

    const query = {};

    // Category filter
    if (category && category !== "All") {
      query.category = { $regex: category, $options: "i" };
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query)
      .populate("sellerId", "sellerRating reviewCount responseBadge name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }

};
const getProductById = async (req, res) => {

  try {

    const product = await Product.findById(req.params.id).populate("sellerId", "sellerRating reviewCount responseBadge name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);

  } catch (error) {

    res.status(500).json({ message: "Error fetching product" });

  }

};



/* GET PRODUCTS BY MOOD */
const getMoodProducts = async (req, res) => {
  try {
    const { mood } = req.params;
    const validMoods = ["Casual", "Party", "Fitness"];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ error: "Invalid mood. Must be one of: Casual, Party, Fitness" });
    }
    // Query using $in to match mood inside the moodTags array
    const products = await Product.find({ moodTags: { $in: [mood] } });
    res.json({ products });
  } catch (error) {
    console.error("getMoodProducts error:", error);
    res.status(500).json({ message: "Error fetching mood products" });
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  getMoodProducts
};