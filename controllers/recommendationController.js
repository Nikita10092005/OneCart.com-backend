const Product = require("../models/productModel");
const BrowsingEvent = require("../models/BrowsingEvent");
const Order = require("../models/orderModel");

// Helper: get product IDs purchased by a user (from completed/confirmed orders)
async function getPurchasedProductIds(userId) {
  const orders = await Order.find({ userId });
  const ids = new Set();
  for (const order of orders) {
    for (const item of order.products) {
      ids.add(item.productId.toString());
    }
  }
  return ids;
}

// Helper: count category frequencies from browsing events
function countCategoryFrequencies(events) {
  const freq = {};
  for (const event of events) {
    freq[event.category] = (freq[event.category] || 0) + 1;
  }
  return freq;
}

// GET /api/recommendations/:productId
const getRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { category } = product;

    // Authenticated user with 3+ browsing events
    if (req.user) {
      const events = await BrowsingEvent.find({ userId: req.user });
      if (events.length >= 3) {
        const freqMap = countCategoryFrequencies(events);
        const purchasedIds = await getPurchasedProductIds(req.user);

        const candidates = await Product.find({
          category,
          _id: { $ne: productId }
        });

        const filtered = candidates.filter(
          (p) => !purchasedIds.has(p._id.toString())
        );

        // Sort by category frequency (descending), then by createdAt (newest first)
        filtered.sort((a, b) => {
          const freqA = freqMap[a.category] || 0;
          const freqB = freqMap[b.category] || 0;
          if (freqB !== freqA) return freqB - freqA;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return res.json({ recommendations: filtered.slice(0, 8) });
      }
    }

    // Fallback: 8 most recently added products in same category
    const recommendations = await Product.find({
      category,
      _id: { $ne: productId }
    })
      .sort({ createdAt: -1 })
      .limit(8);

    return res.json({ recommendations });
  } catch (err) {
    console.error("getRecommendations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/recommendations/home
const getHomeRecommendations = async (req, res) => {
  try {
    const userId = req.user;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await BrowsingEvent.find({
      userId,
      timestamp: { $gte: thirtyDaysAgo }
    });

    const purchasedIds = await getPurchasedProductIds(userId);

    if (events.length >= 3) {
      const freqMap = countCategoryFrequencies(events);

      const candidates = await Product.find({ stock: { $gt: 0 } });

      const filtered = candidates.filter(
        (p) => !purchasedIds.has(p._id.toString())
      );

      filtered.sort((a, b) => {
        const freqA = freqMap[a.category] || 0;
        const freqB = freqMap[b.category] || 0;
        if (freqB !== freqA) return freqB - freqA;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return res.json({ products: filtered.slice(0, 16), personalized: true });
    }

    // Fallback: 16 most recently added in-stock products
    const products = await Product.find({ stock: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(16);

    return res.json({ products, personalized: false });
  } catch (err) {
    console.error("getHomeRecommendations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/recommendations/browse
const recordBrowsingEvent = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await BrowsingEvent.create({
      userId: req.user,
      productId,
      category: product.category
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("recordBrowsingEvent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getRecommendations, getHomeRecommendations, recordBrowsingEvent };
