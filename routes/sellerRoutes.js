const express = require("express");
const router = express.Router();
const multer = require("multer");

const protect = require("../middleware/authMiddleware");
const sellerOnly = require("../middleware/sellerMiddleware");

const sellerController = require("../controllers/sellerController");
const sellerAnalyticsController = require("../controllers/sellerAnalyticsController");
const sellerPayoutController = require("../controllers/sellerPayoutController");
const sellerInventoryController = require("../controllers/sellerInventoryController");
const sellerBulkUploadController = require("../controllers/sellerBulkUploadController");

// Multer with memory storage, 5MB limit for CSV bulk upload
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/seller/apply
router.post("/apply", protect, sellerController.applyForSeller);

// GET /api/seller/my-application
router.get("/my-application", protect, sellerController.getMyApplication);

// POST /api/seller/fbo-enroll
router.post("/fbo-enroll", protect, sellerController.fboEnroll);

// GET /api/seller/my-fbo-enrollment
router.get("/my-fbo-enrollment", protect, sellerController.getMyFboEnrollment);

// GET /api/seller/analytics
router.get("/analytics", protect, sellerOnly, sellerAnalyticsController.getAnalytics);

// GET /api/seller/payouts
router.get("/payouts", protect, sellerOnly, sellerPayoutController.getPayouts);

// POST /api/seller/payouts/backfill — generate payouts for existing delivered orders
router.post("/payouts/backfill", protect, sellerOnly, sellerPayoutController.backfillPayouts);

// PATCH /api/seller/payouts/:id/process — admin marks payout as processed
router.patch("/payouts/:id/process", protect, sellerPayoutController.processPayout);

// GET /api/seller/inventory
router.get("/inventory", protect, sellerOnly, sellerInventoryController.getInventory);

// PUT /api/seller/inventory/:productId
router.put("/inventory/:productId", protect, sellerOnly, sellerInventoryController.updateProduct);

// DELETE /api/seller/inventory/:productId
router.delete("/inventory/:productId", protect, sellerOnly, sellerInventoryController.deleteProduct);

// POST /api/seller/products/bulk-upload
router.post(
  "/products/bulk-upload",
  protect,
  sellerOnly,
  csvUpload.single("file"),
  sellerBulkUploadController.bulkUpload
);

// GET /api/seller/profile/:sellerId (public)
router.get("/profile/:sellerId", sellerController.getSellerProfile);

// PUT /api/seller/vacation
router.put("/vacation", protect, sellerOnly, sellerController.setVacationMode);

module.exports = router;
