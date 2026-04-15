const mongoose = require("mongoose");

const priceAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  targetPrice: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isNotified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("PriceAlert", priceAlertSchema);
