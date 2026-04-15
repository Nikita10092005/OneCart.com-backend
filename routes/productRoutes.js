const express = require("express");
const router = express.Router();
const Product = require("../models/productModel");
const { getMoodProducts } = require("../controllers/productController");
const upload = require("../middleware/upload");
const protect = require("../middleware/authMiddleware");

const subCategoryMap = {
  "electronics|mobiles": ["Mobiles"],
  "electronics|laptops": ["Laptops"],
  "electronics|headphones": ["Headphones"],
  "electronics|smart watches": ["Smart Watches"],
  "electronics|gaming accessories": ["Gaming Accessories"],
  "men|kurtas": ["Kurtas"],
  "men|blazers": ["Blazers"],
  "men|shirts": ["Shirts"],
  "men|t-shirts": ["T-Shirts"],
  "men|jeans": ["Jeans"],
  "men|lowers": ["Lowers"],
  "men|accessories": ["Mens Accessories"],
  "men|footwear": ["Mens Footwear"],
  "women|kurtis": ["Kurtis"],
  "women|sarees": ["Sarees"],
  "women|western wear": ["Western Wear"],
  "women|jewellery": ["Jewellery"],
  "women|accessories": ["Women Accessories"],
  "women|footwear": ["Women Footwear", "Womens Footwear"],
  "kids|clothing": ["Kids Clothing"],
  "kids|toys": ["Toys"],
  "kids|accessories": ["Kids Accessories"],
  "kids|footwear": ["Kids Footwear"],
  "home & living|furniture": ["Furniture"],
  "home & living|decor": ["Decor"],
  "home & living|kitchen": ["Kitchen"],
  "home & living|bedding": ["Bedding"],
  "home & living|storage": ["Storage"],
  "beauty|skincare": ["Skincare"],
  "beauty|makeup": ["Makeup"],
  "beauty|haircare": ["Haircare"],
  "beauty|fragrance": ["Fragrance"],
  "beauty|personal care": ["Personal Care"],
  "sports|fitness": ["Fitness"],
  "sports|sportswear": ["Sportswear"],
  "sports|equipment": ["Equipment"],
  "sports|footwear": ["Sports Footwear"],
  "sports|outdoor": ["Outdoor"],  "books|fiction": ["Fiction"],
  "books|academic": ["Academic"],
  "books|exams": ["Exams"],
  "books|self-help": ["Self-Help"],
  "books|children": ["Children"],
};

const mainCategoryMap = {
  electronics: ["Mobiles", "Laptops", "Headphones", "Smart Watches", "Gaming Accessories"],
  men: ["Kurtas", "Blazers", "Shirts", "T-Shirts", "Jeans", "Lowers", "Mens Accessories", "Mens Footwear"],
  women: ["Kurtis", "Sarees", "Western Wear", "Jewellery", "Women Accessories", "Women Footwear", "Womens Footwear"],
  kids: ["Kids Clothing", "Kids Accessories", "Kids Footwear", "Toys"],
  "home & living": ["Furniture", "Decor", "Kitchen", "Bedding", "Storage"],
  beauty: ["Skincare", "Makeup", "Haircare", "Fragrance", "Personal Care"],
  books: ["Fiction", "Academic", "Exams", "Self-Help", "Children"],
};

// GET ALL / FILTERED / SEARCHED PRODUCTS
router.get("/", async (req, res) => {
  try {
    const { main, sub, category, search } = req.query;
    let filter = {};

    // SEARCH — name or description match
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    } else if (main && sub) {
      const key = `${main.toLowerCase()}|${sub.toLowerCase()}`;
      const dbCategories = subCategoryMap[key];
      if (dbCategories) {
        filter.category = { $in: dbCategories };
      } else {
        return res.json([]);
      }
    } else if (main) {
      const dbCategories = mainCategoryMap[main.toLowerCase()];
      if (dbCategories) {
        filter.category = { $in: dbCategories };
      } else {
        return res.json([]);
      }
    } else if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET PRODUCTS BY CATEGORY
router.get("/category/:category", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET PRODUCTS BY MOOD
router.get("/mood/:mood", getMoodProducts);

// GET SINGLE PRODUCT BY ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// UPLOAD IMAGE (for reviews)
router.post("/upload", protect, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    res.json({ 
      message: "Image uploaded successfully",
      filename: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
