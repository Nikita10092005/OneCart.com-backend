const mongoose = require("mongoose");
const payoutSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "processed"], default: "pending" },
  payoutDate: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.model("Payout", payoutSchema);
