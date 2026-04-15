const router = require("express").Router();
const protect = require("../middleware/authMiddleware");

const {
  createReview,
  getProductReviews,
  markReviewHelpful,
  deleteReview,
  addReview,
  getReviews
} = require("../controllers/reviewController");

// Public routes
router.get("/product/:productId", getProductReviews);

// Protected routes
router.post("/", protect, createReview);
router.patch("/:reviewId/helpful", protect, markReviewHelpful);
router.delete("/:reviewId", protect, deleteReview);

// Legacy routes for backward compatibility
router.post("/add", protect, addReview);
router.get("/:productId", getReviews);

module.exports = router;