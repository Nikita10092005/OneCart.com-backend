const User = require("../models/User");
const Product = require("../models/productModel");
const Review = require("../models/reviewModel");
const Order = require("../models/orderModel");

const recomputeSellerRating = async (sellerId) => {
  if (!sellerId) return;
  try {
    const products = await Product.find({ sellerId });
    if (!products.length) {
      await User.findByIdAndUpdate(sellerId, { sellerRating: null, reviewCount: 0 });
      return;
    }
    const productIds = products.map(p => p._id);
    const reviews = await Review.find({ productId: { $in: productIds } });
    if (!reviews.length) {
      await User.findByIdAndUpdate(sellerId, { sellerRating: null, reviewCount: 0 });
      return;
    }
    const mean = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const sellerRating = Math.round(mean * 10) / 10;
    await User.findByIdAndUpdate(sellerId, { sellerRating, reviewCount: reviews.length });
  } catch (e) {
    console.error("recomputeSellerRating error:", e);
  }
};

const recomputeResponseBadge = async (sellerId) => {
  if (!sellerId) return;
  try {
    const products = await Product.find({ sellerId });
    if (!products.length) return;
    const productIds = products.map(p => p._id);
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const orders = await Order.find({
      "products.productId": { $in: productIds },
      createdAt: { $gte: since }
    });
    const responseTimes = [];
    for (const order of orders) {
      const packedStage = order.trackingStages?.find(s => s.stage === "Packed");
      if (packedStage?.timestamp) {
        const hours = (new Date(packedStage.timestamp) - new Date(order.createdAt)) / 3600000;
        if (hours >= 0) responseTimes.push(hours);
      }
    }
    let badge = "New";
    if (responseTimes.length >= 3) {
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      badge = avg < 12 ? "Fast" : avg <= 48 ? "Standard" : "Slow";
    }
    await User.findByIdAndUpdate(sellerId, { responseBadge: badge });
  } catch (e) {
    console.error("recomputeResponseBadge error:", e);
  }
};

module.exports = { recomputeSellerRating, recomputeResponseBadge };
