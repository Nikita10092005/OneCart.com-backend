const express = require("express");
const router = express.Router();

const adminOnly = require("../middleware/adminMiddleware");

const {
  getSalesAnalytics,
  getCustomerAnalytics,
  getInventoryReports,
  getFinancialReports
} = require("../controllers/analyticsController");

// Sales Analytics
router.get("/sales", adminOnly, getSalesAnalytics);

// Customer Analytics  
router.get("/customers", adminOnly, getCustomerAnalytics);

// Inventory Reports
router.get("/inventory", adminOnly, getInventoryReports);

// Financial Reports
router.get("/financial", adminOnly, getFinancialReports);

module.exports = router;
