const mongoose = require("mongoose");
const affiliateSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  phone:     { type: String, default: "" },
  platform:  { type: String, required: true },
  website:   { type: String, default: "" },
  audience:  { type: String, default: "" },
  status:    { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  referralCode: { type: String, unique: true, sparse: true },
  totalEarnings: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model("Affiliate", affiliateSchema);
