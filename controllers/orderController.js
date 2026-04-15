const Order = require("../models/orderModel");
const Cart  = require("../models/cartModel");
const User  = require("../models/User");
const Product = require("../models/productModel");
const WalletTransaction = require("../models/walletTransactionModel");
const notificationService = require("../utils/notificationService");
const { addPoints } = require("./rewardsController");
const { recomputeResponseBadge } = require("../utils/sellerMetrics");
const { createPayoutOnDelivery } = require("./sellerPayoutController");

/* CREATE ORDER */
const createOrder = async (req, res) => {
  try {
    const userId = req.user; // req.user is the raw string ID
    const { name, phone, address, payment, paymentId, walletAmount = 0 } = req.body;

    // get cart items
    const cartItems = await Cart.find({ userId }).populate("productId");

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock availability before placing order
    for (const item of cartItems) {
      const product = item.productId;
      if (!product) continue;
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `"${product.name}" only has ${product.stock} item(s) left in stock.`
        });
      }
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + (item.productId?.price || 0) * item.quantity, 0
    ) + 49; // delivery

    // Handle wallet payment deduction
    let updatedUser = null;
    if (walletAmount > 0) {
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: walletAmount } },
        { $inc: { walletBalance: -walletAmount } },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      // Create wallet transaction record
      await WalletTransaction.create({
        userId,
        type: "debit",
        source: "checkout",
        amount: walletAmount,
        description: "Order payment",
        balanceAfter: updatedUser.walletBalance
      });
    }

    const order = new Order({
      userId,
      name,
      phone,
      address,
      payment,
      paymentId,
      status: "Ordered",
      totalAmount,
      walletAmount,
      products: cartItems.map(item => ({
        productId: item.productId._id,
        quantity:  item.quantity
      })),
      trackingStages: [{ stage: "Ordered", timestamp: new Date() }]
    });

    await order.save();

    // Deduct stock for each purchased product
    for (const item of cartItems) {
      if (item.productId?._id) {
        await Product.findByIdAndUpdate(
          item.productId._id,
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    // clear cart after order
    await Cart.deleteMany({ userId });

    // Add points for purchase (1 point per ₹10 spent, excluding delivery)
    const productTotal = cartItems.reduce(
      (sum, item) => sum + (item.productId?.price || 0) * item.quantity, 0
    );
    const pointsEarned = Math.floor(productTotal / 10);
    if (pointsEarned > 0) {
      try {
        await addPoints(userId, pointsEarned, "purchase", `Earned ${pointsEarned} points for order #${order._id.toString().slice(-6)}`, order._id);
      } catch (e) {
        console.error("Failed to add purchase points:", e);
      }
    }

    // populate for response
    const populated = await Order.findById(order._id).populate("products.productId");

    res.json(populated);

  } catch (error) {
    res.status(500).json({ message: "Order failed" });
  }
};

/* GET ORDERS OF CURRENT USER */
const getOrders = async (req, res) => {
  try {
    const userId = req.user; // req.user is the raw string ID

    const orders = await Order
      .find({ userId })
      .populate("products.productId")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* GET SINGLE ORDER BY ID */
const getOrderById = async (req, res) => {
  try {
    const order = await Order
      .findById(req.params.orderId)
      .populate("products.productId");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* CANCEL ORDER */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("products.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    order.status = "Cancelled";
    await order.save();

    // Restore stock for each product
    for (const item of order.products) {
      if (item.productId?._id) {
        await Product.findByIdAndUpdate(
          item.productId._id,
          { $inc: { stock: item.quantity } }
        );
      }
    }

    res.json({ message: "Order cancelled", order });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* UPDATE ORDER STATUS (user cancel route) */
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = req.body.status || "Cancelled";
    await order.save();

    res.json(order);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* GET ORDER TRACKING */
const getOrderTracking = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    let order;
    
    // Try to find by full ID first (24 hex chars)
    if (orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      // For partial IDs, find orders that belong to this user and match partial ID (case insensitive)
      const userOrders = await Order.find({ userId: req.user });
      order = userOrders.find(o => o._id.toString().toUpperCase().endsWith(orderId.toUpperCase()));
    }

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ownership check: user must own the order or be admin
    if (req.user.toString() !== order.userId.toString() && req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      currentStage: order.status,
      trackingStages: order.trackingStages
    });

  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* UPDATE ORDER STAGE (admin only) */
const VALID_STAGES = ["Ordered", "Packed", "Shipped", "Delivered"];

const updateOrderStage = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const currentIndex = VALID_STAGES.indexOf(order.status);
    const nextStage = VALID_STAGES[currentIndex + 1];

    if (!nextStage || req.body.status !== nextStage) {
      return res.status(400).json({
        error: `Invalid stage transition. Expected next stage after ${order.status}`
      });
    }

    order.trackingStages.push({ stage: req.body.status, timestamp: new Date() });
    order.status = req.body.status;
    await order.save();

    // Hook: recompute response badge when order is Packed
    if (req.body.status === "Packed") {
      const populatedOrder = await Order.findById(order._id).populate("products.productId");
      const sellerIds = new Set();
      for (const item of populatedOrder.products) {
        if (item.productId?.sellerId) sellerIds.add(item.productId.sellerId.toString());
      }
      for (const sellerId of sellerIds) {
        recomputeResponseBadge(sellerId);
      }
    }

    // Hook: create payout records when order is Delivered
    if (req.body.status === "Delivered") {
      const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
      const populatedOrder = await Order.findById(order._id).populate("products.productId");
      for (const item of populatedOrder.products) {
        const product = item.productId;
        if (product?.sellerId) {
          const amount = (product.price || 0) * (item.quantity || 1) * (1 - commissionRate);
          createPayoutOnDelivery(product.sellerId, order._id, amount);
        }
      }
    }

    // Notify the order's user
    const user = await User.findById(order.userId);
    if (user) {
      await notificationService.sendEmail(
        user.email,
        `Your order has been ${order.status}`,
        `<p>Your order (ID: ${order._id}) status has been updated to <strong>${order.status}</strong>.</p>`
      );
      await notificationService.createInAppNotification(
        order.userId,
        `Your order status has been updated to ${order.status}`,
        "order_update",
        order._id,
        order.status
      );
    }

    res.json({ order });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderTracking,
  updateOrderStage
};
