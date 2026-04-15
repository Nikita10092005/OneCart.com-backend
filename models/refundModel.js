const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      required: true
    }
  }],
  totalRefundAmount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ["damaged", "wrong_item", "not_as_described", "changed_mind", "late_delivery", "other"]
  },
  detailedReason: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "processing", "completed"],
    default: "pending"
  },
  refundMethod: {
    type: String,
    enum: ["original_payment", "store_credit", "bank_transfer"],
    default: "original_payment"
  },
  adminNotes: {
    type: String,
    default: ""
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  refundTransactionId: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model("Refund", refundSchema);
