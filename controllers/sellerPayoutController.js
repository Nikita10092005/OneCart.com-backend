const Payout = require("../models/payoutModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const sellerTotals = require("../utils/sellerTotals");

const getPayouts = async (req, res) => {
  try {
    const payouts = await Payout.find({ sellerId: req.user }).sort({ payoutDate: -1 });
    res.json(payouts);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const createPayoutOnDelivery = async (sellerId, orderId, amount) => {
  try {
    // Avoid duplicate payouts for same order+seller
    const existing = await Payout.findOne({ sellerId, orderId });
    if (existing) return;
    await Payout.create({ sellerId, orderId, amount, status: "pending" });
  } catch (e) {
    console.error("createPayoutOnDelivery error:", e);
  }
};

const backfillPayouts = async (req, res) => {
  try {
    const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
    const products = await Product.find({ sellerId: req.user });
    const productIds = products.map(p => p._id.toString());

    if (!productIds.length) return res.json({ created: 0, message: "No products found" });

    const orders = await Order.find({
      status: "Delivered",
      "products.productId": { $in: productIds }
    }).populate("products.productId", "price sellerId");

    let created = 0;
    for (const order of orders) {
      for (const [sellerId, amount] of sellerTotals(order.products, commissionRate)) {
        if (sellerId !== req.user.toString()) continue;
        const existing = await Payout.findOne({ sellerId: req.user, orderId: order._id });
        if (existing) continue;
        await Payout.create({ sellerId: req.user, orderId: order._id, amount, status: "pending" });
        created++;
      }
    }

    res.json({ created, message: `${created} payout(s) created` });
  } catch (e) {
    console.error("backfillPayouts error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

const processPayout = async (req, res) => {
  try {
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      { status: "processed" },
      { new: true }
    );
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    res.json({ message: "Payout marked as processed", payout });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getPayouts, createPayoutOnDelivery, backfillPayouts, processPayout };
