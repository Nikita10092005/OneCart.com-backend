const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const {
  submitApplication,
  getMyApplication,
  getAllApplications,
  approveApplication,
  rejectApplication,
} = require("../controllers/cardApplicationController");

// User routes
router.post("/", protect, submitApplication);
router.get("/my", protect, getMyApplication);

// Admin routes
router.get("/admin", adminOnly, getAllApplications);
router.put("/admin/:id/approve", adminOnly, approveApplication);
router.put("/admin/:id/reject", adminOnly, rejectApplication);

module.exports = router;
