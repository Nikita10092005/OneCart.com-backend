const mongoose = require("mongoose");

const cardApplicationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:         { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, required: true },
  pan:          { type: String, required: true },
  monthlyIncome:{ type: Number, required: true },
  cardTier:     { type: String, enum: ["basic", "premium"], default: "basic" },
  status:       { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rejectionReason: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("CardApplication", cardApplicationSchema);
