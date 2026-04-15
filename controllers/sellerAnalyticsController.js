const Product = require("../models/productModel");
const Order = require("../models/orderModel");

const getAnalytics = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    // Sanitize
    if (!startDate || startDate === "undefined") startDate = undefined;
    if (!endDate || endDate === "undefined") endDate = undefined;

    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    console.log(`[Analytics] Seller: ${req.user} | start: ${start.toISOString()} | end: ${end.toISOString()}`);

    // Find seller's products — handle both string and ObjectId
    const mongoose = require("mongoose");
    const sellerObjId = mongoose.Types.ObjectId.isValid(req.user) ? new mongoose.Types.ObjectId(req.user) : req.user;
    const products = await Product.find({ sellerId: sellerObjId });
    const productMap = {};
    products.forEach(p => { productMap[p._id.toString()] = p; });
    const productIds = Object.keys(productMap);

    console.log(`[Analytics] Products: ${productIds.length}`);

    if (!productIds.length) {
      return res.json({ totalRevenue: 0, totalOrders: 0, totalUnitsSold: 0, topProducts: [], dailyData: [], dateRange: { start, end } });
    }

    // Find ALL delivered orders with seller's products
    const allOrders = await Order.find({
      status: "Delivered",
      "products.productId": { $in: productIds }
    }).populate("products.productId", "price name sellerId");

    console.log(`[Analytics] Delivered orders total: ${allOrders.length}`);
    allOrders.forEach(o => console.log(`  -> ${o._id} | createdAt: ${o.createdAt}`));

    // Apply date filter only if dates were explicitly provided
    const orders = (startDate || endDate)
      ? allOrders.filter(o => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end)
      : allOrders;

    console.log(`[Analytics] After date filter: ${orders.length}`);

    let totalRevenue = 0, totalOrders = 0, totalUnitsSold = 0;
    const productSales = {};
    const dailyRevenue = {};

    for (const order of orders) {
      let hasSellerProduct = false;
      for (const item of order.products) {
        const pid = item.productId?._id?.toString() || item.productId?.toString();
        if (!pid || !productMap[pid]) continue;

        const price = item.productId?.price ?? productMap[pid]?.price ?? 0;
        const qty = item.quantity || 1;
        const revenue = price * qty;

        totalRevenue += revenue;
        totalUnitsSold += qty;
        hasSellerProduct = true;
        productSales[pid] = (productSales[pid] || 0) + qty;

        const day = new Date(order.createdAt).toISOString().split("T")[0];
        dailyRevenue[day] = (dailyRevenue[day] || 0) + revenue;
      }
      if (hasSellerProduct) totalOrders++;
    }

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pid, units]) => {
        const p = productMap[pid];
        return { productId: pid, name: p?.name || "Unknown", unitsSold: units, revenue: (p?.price || 0) * units };
      });

    const dailyData = Object.entries(dailyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    res.json({ totalRevenue, totalOrders, totalUnitsSold, topProducts, dailyData, dateRange: { start, end } });
  } catch (e) {
    console.error("Analytics error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
};

module.exports = { getAnalytics };
