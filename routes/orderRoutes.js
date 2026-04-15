const express = require("express");
const router  = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderTracking,
  updateOrderStage
} = require("../controllers/orderController");

router.post("/",                        protect,            createOrder);
router.get("/",                         protect,            getOrders);
router.get("/:orderId/track",           protect,            getOrderTracking);
router.patch("/:orderId/status",        protect, adminOnly, updateOrderStage);
router.get("/:orderId",                 protect,            getOrderById);
router.put("/:orderId/cancel",          protect,            cancelOrder);
router.put("/:orderId/status",          protect,            updateOrderStatus);

module.exports = router;
