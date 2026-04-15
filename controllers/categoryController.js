const Category = require("../models/categoryModel");

/* CREATE CATEGORY */
const createCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;
    const category = await Category.create({ name, parent: parent || null });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Error creating category" });
  }
};

/* GET CATEGORIES */
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("parent");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
};

module.exports = { createCategory, getCategories };
