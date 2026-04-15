const express = require("express");
const router  = express.Router();
const protect   = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { createOrder, verifyPayment, handleWebhook, processRefund } = require("../controllers/paymentController");

// Webhook MUST use raw body before express.json() parses it
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

router.post("/create-order", protect, createOrder);
router.post("/verify",       protect, verifyPayment);
router.post("/refund",       adminOnly, processRefund);

module.exports = router;
