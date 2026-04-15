const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  createComparison,
  getComparison,
  removeFromComparison,
  clearComparison
} = require("../controllers/comparisonController");

router.post("/", protect, createComparison);
router.get("/", protect, getComparison);
router.delete("/:productId", protect, removeFromComparison);
router.delete("/", protect, clearComparison);

module.exports = router;
