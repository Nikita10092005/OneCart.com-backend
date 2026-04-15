const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  name:    String,
  phone:   String,
  address: String,
  payment: String,
  paymentId: String,
  razorpayOrderId: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Ordered", "Packed", "Shipped", "Delivered", "Cancelled"],
    default: "Ordered"
  },
  totalAmount: Number,
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      quantity: Number
    }
  ],
  trackingStages: [
    {
      stage: {
        type: String,
        enum: ["Ordered", "Packed", "Shipped", "Delivered"],
        required: true
      },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  walletAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
