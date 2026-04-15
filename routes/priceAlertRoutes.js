const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  createPriceAlert,
  getPriceAlerts,
  deletePriceAlert
} = require("../controllers/priceAlertController");

router.post("/", protect, createPriceAlert);
router.get("/", protect, getPriceAlerts);
router.delete("/:alertId", protect, deletePriceAlert);

module.exports = router;
