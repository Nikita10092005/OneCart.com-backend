const express = require("express");
const router = express.Router();
const adminOnly = require("../middleware/adminMiddleware");
const protect = require("../middleware/authMiddleware");

const {
  /* Coupons */
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  /* Taxes */
  getAllTaxes,
  createTax,
  updateTax,
  deleteTax,
  calculateTax,
  /* Refunds */
  getMyRefunds,
  getAllRefunds,
  createRefundRequest,
  updateRefundStatus,
  getRefundStats,
  /* Payment Settings */
  getAllPaymentSettings,
  createPaymentSettings,
  updatePaymentSettings,
  togglePaymentProvider,
  initializeDefaultPaymentSettings
} = require("../controllers/financialController");

/* ================ COUPON ROUTES ================ */
router.get("/coupons", adminOnly, getAllCoupons);
router.post("/coupons", adminOnly, createCoupon);
router.put("/coupons/:id", adminOnly, updateCoupon);
router.delete("/coupons/:id", adminOnly, deleteCoupon);
router.post("/coupons/validate", validateCoupon);

/* ================ TAX ROUTES ================ */
router.get("/taxes", adminOnly, getAllTaxes);
router.post("/taxes", adminOnly, createTax);
router.put("/taxes/:id", adminOnly, updateTax);
router.delete("/taxes/:id", adminOnly, deleteTax);
router.post("/taxes/calculate", calculateTax);

/* ================ REFUND ROUTES ================ */
router.get("/refunds/my", protect, getMyRefunds);
router.get("/refunds", adminOnly, getAllRefunds);
router.get("/refunds/stats", adminOnly, getRefundStats);
router.post("/refunds", createRefundRequest);
router.put("/refunds/:id", adminOnly, updateRefundStatus);

/* ================ PAYMENT SETTINGS ROUTES ================ */
router.get("/payment-settings", adminOnly, getAllPaymentSettings);
router.post("/payment-settings/init", adminOnly, initializeDefaultPaymentSettings);
router.post("/payment-settings", adminOnly, createPaymentSettings);
router.put("/payment-settings/:provider", adminOnly, updatePaymentSettings);
router.patch("/payment-settings/:provider/toggle", adminOnly, togglePaymentProvider);

module.exports = router;
