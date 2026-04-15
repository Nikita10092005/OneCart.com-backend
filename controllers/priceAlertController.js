const PriceAlert = require("../models/priceAlertModel");
const Product = require("../models/productModel");
const User = require("../models/User");
const notificationService = require("../utils/notificationService");

// CREATE PRICE ALERT
const createPriceAlert = async (req, res) => {
  try {
    const { productId, targetPrice } = req.body;
    const userId = req.user; // This is the user ID string from auth middleware

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if alert already exists
    const existingAlert = await PriceAlert.findOne({
      userId,
      productId,
      isActive: true
    });

    if (existingAlert) {
      return res.status(400).json({ message: "Price alert already exists for this product" });
    }

    const priceAlert = new PriceAlert({
      userId,
      productId,
      targetPrice,
      currentPrice: product.price
    });

    await priceAlert.save();

    res.status(201).json({
      message: "Price alert created successfully",
      alert: priceAlert
    });

  } catch (error) {
    console.error("Error creating price alert:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET USER'S PRICE ALERTS
const getPriceAlerts = async (req, res) => {
  try {
    const userId = req.user;

    const alerts = await PriceAlert.find({ userId, isActive: true })
      .populate('productId', 'name price image')
      .sort({ createdAt: -1 });

    res.json(alerts);

  } catch (error) {
    console.error("Error fetching price alerts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE PRICE ALERT
const deletePriceAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user;

    const alert = await PriceAlert.findOne({ _id: alertId, userId });
    if (!alert) {
      return res.status(404).json({ message: "Price alert not found" });
    }

    alert.isActive = false;
    await alert.save();

    res.json({ message: "Price alert deleted successfully" });

  } catch (error) {
    console.error("Error deleting price alert:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// CHECK PRICE DROPS (for scheduled job)
const checkPriceDrops = async () => {
  try {
    const alerts = await PriceAlert.find({ isActive: true, isNotified: false })
      .populate('productId')
      .populate('userId', 'email name');

    for (const alert of alerts) {
      const product = alert.productId;
      
      if (product.price <= alert.targetPrice) {
        // Send notification
        await notificationService.sendEmail(
          alert.userId.email,
          `Price Drop Alert: ${product.name}`,
          `<p>Good news! The price of <strong>${product.name}</strong> has dropped to ₹${product.price}.</p>
           <p>Target price: ₹${alert.targetPrice}</p>
           <p><a href="http://localhost:5173/product/${product._id}">View Product</a></p>`
        );

        // Mark as notified
        alert.isNotified = true;
        await alert.save();
      } else {
        // Update current price
        alert.currentPrice = product.price;
        await alert.save();
      }
    }
  } catch (error) {
    console.error("Error checking price drops:", error);
  }
};

module.exports = {
  createPriceAlert,
  getPriceAlerts,
  deletePriceAlert,
  checkPriceDrops
};
