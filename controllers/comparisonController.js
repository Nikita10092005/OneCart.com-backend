const ProductComparison = require("../models/productComparisonModel");
const Product = require("../models/productModel");

// CREATE COMPARISON
const createComparison = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get or create user's comparison list
    let comparison = await ProductComparison.findOne({ 
      userId, 
      isActive: true 
    });

    if (!comparison) {
      comparison = new ProductComparison({
        userId,
        products: [],
        name: "My Product Comparison"
      });
    }

    // Check if product already in comparison
    const existingProduct = comparison.products.find(
      p => p.productId.toString() === productId
    );

    if (existingProduct) {
      return res.status(400).json({ message: "Product already in comparison" });
    }

    // Check max 4 products
    if (comparison.products.length >= 4) {
      return res.status(400).json({ message: "Maximum 4 products can be compared" });
    }

    // Add product to comparison
    comparison.products.push({
      productId,
      addedAt: new Date()
    });

    await comparison.save();

    const populatedComparison = await ProductComparison.findById(comparison._id)
      .populate('products.productId', 'name price image category description features');

    res.status(201).json({
      message: "Product added to comparison",
      comparison: populatedComparison
    });

  } catch (error) {
    console.error("Error creating comparison:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET USER'S COMPARISON
const getComparison = async (req, res) => {
  try {
    const userId = req.user;

    const comparison = await ProductComparison.findOne({ 
      userId, 
      isActive: true 
    })
      .populate('products.productId', 'name price image category description features')
      .sort({ createdAt: -1 });

    if (!comparison) {
      return res.json({ products: [] });
    }

    res.json(comparison);

  } catch (error) {
    console.error("Error fetching comparison:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// REMOVE PRODUCT FROM COMPARISON
const removeFromComparison = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user;

    const comparison = await ProductComparison.findOne({ 
      userId, 
      isActive: true 
    });

    if (!comparison) {
      return res.status(404).json({ message: "Comparison list not found" });
    }

    // Remove product from comparison
    comparison.products = comparison.products.filter(
      p => p.productId.toString() !== productId
    );

    await comparison.save();

    const populatedComparison = await ProductComparison.findById(comparison._id)
      .populate('products.productId', 'name price image category description features');

    res.json({
      message: "Product removed from comparison",
      comparison: populatedComparison
    });

  } catch (error) {
    console.error("Error removing from comparison:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// CLEAR COMPARISON
const clearComparison = async (req, res) => {
  try {
    const userId = req.user;

    const comparison = await ProductComparison.findOne({ 
      userId, 
      isActive: true 
    });

    if (!comparison) {
      return res.status(404).json({ message: "Comparison list not found" });
    }

    comparison.products = [];
    await comparison.save();

    res.json({ message: "Comparison cleared successfully" });

  } catch (error) {
    console.error("Error clearing comparison:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createComparison,
  getComparison,
  removeFromComparison,
  clearComparison
};
