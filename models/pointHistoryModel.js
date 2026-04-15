const mongoose = require("mongoose");

const pointHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  points: {
    type: Number,
    required: true
  },
  
  type: {
    type: String,
    enum: ["earned", "redeemed"],
    required: true
  },
  
  action: {
    type: String,
    enum: ["registration", "purchase", "review", "referral", "daily_login", "redemption"],
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, { timestamps: true });

module.exports = mongoose.model("PointHistory", pointHistorySchema);
