const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getRecommendations,
  getHomeRecommendations,
  recordBrowsingEvent,
} = require("../controllers/recommendationController");

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
      req.user = decoded.id;
      req.userRole = decoded.role;
    } catch (e) { /* ignore invalid token */ }
  }
  next();
};

// GET /api/recommendations/home — must be before /:productId to avoid param collision
router.get("/home", protect, getHomeRecommendations);

// GET /api/recommendations/:productId — optional auth
router.get("/:productId", optionalAuth, getRecommendations);

// POST /api/recommendations/browse
router.post("/browse", protect, recordBrowsingEvent);

module.exports = router;
