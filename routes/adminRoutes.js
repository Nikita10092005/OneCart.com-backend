// const express = require("express");
// const router = express.Router();
// const adminOnly = require("../middleware/adminMiddleware");
// const upload = require("../middleware/upload");

// const {
//   addProduct,
//   updateProduct,
//   deleteProduct,
//   getAllOrders,
//   getDashboardStats
// } = require("../controllers/adminController");

// router.post("/product", adminOnly, upload.single("image"), addProduct);
// router.put("/product/:id", adminOnly, upload.single("image"), updateProduct);
// router.delete("/product/:id", adminOnly, deleteProduct);
// router.get("/orders", adminOnly, getAllOrders);
// router.get("/dashboard", adminOnly, getDashboardStats);

// module.exports = router;

const express = require("express");
const router = express.Router();

const adminOnly = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");

const {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  getPendingAlerts,
  getAlertStats,
  approvePriceAlert,
  getSellerApplications,
  approveSellerApplication,
  getUsers,
  updateUserStatus,
  revokeSellerRole,
  getAdminReviews,
  flagReview,
  hideReview,
  adminDeleteReview,
  rejectSellerApplication,
  updateSellerApplicationDetails,
  getFboEnrollments,
  approveFboEnrollment,
  rejectFboEnrollment,
  getPublicSellerStats
} = require("../controllers/adminController");

// PUBLIC — no auth required
router.get("/public/seller-stats", getPublicSellerStats);

router.post("/product", adminOnly, upload.single("image"), addProduct);
router.put("/product/:id", adminOnly, upload.single("image"), updateProduct);
router.delete("/product/:id", adminOnly, deleteProduct);

router.get("/orders", adminOnly, getAllOrders);
router.put("/orders/:id", adminOnly, updateOrderStatus); // 🔥 NEW

router.get("/dashboard", adminOnly, getDashboardStats);

router.get("/price-alerts/stats", adminOnly, getAlertStats);
router.get("/price-alerts", adminOnly, getPendingAlerts);
router.put("/price-alerts/:id/approve", adminOnly, approvePriceAlert);

router.get("/seller-applications", adminOnly, getSellerApplications);
router.put("/seller-applications/:id/approve", adminOnly, approveSellerApplication);
router.put("/seller-applications/:id/reject", adminOnly, rejectSellerApplication);
router.put("/seller-applications/:id/details", adminOnly, updateSellerApplicationDetails);

router.get("/fbo-enrollments", adminOnly, getFboEnrollments);
router.put("/fbo-enrollments/:id/approve", adminOnly, approveFboEnrollment);
router.put("/fbo-enrollments/:id/reject", adminOnly, rejectFboEnrollment);

// User management
router.get("/users", adminOnly, getUsers);
router.put("/users/:id/status", adminOnly, updateUserStatus);
router.put("/users/:id/revoke-seller", adminOnly, revokeSellerRole);

// Review moderation
router.get("/reviews", adminOnly, getAdminReviews);
router.put("/reviews/:id/flag", adminOnly, flagReview);
router.put("/reviews/:id/hide", adminOnly, hideReview);
router.delete("/reviews/:id", adminOnly, adminDeleteReview);

// Admin: get all seller payouts
router.get("/seller-payouts", adminOnly, async (req, res) => {
  try {
    const Payout = require("../models/payoutModel");
    const payouts = await Payout.find()
      .populate("sellerId", "name email")
      .populate("orderId", "totalAmount")
      .sort({ payoutDate: -1 });
    res.json(payouts);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;