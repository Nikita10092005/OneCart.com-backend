const mongoose = require("mongoose");
const sellerApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rejectionReason: { type: String, default: "" },
  businessName: { type: String, default: "" },
  gstNumber: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  businessAddress: { type: String, default: "" },
  businessType: { type: String, enum: ["Individual", "Registered Business", "Brand", ""], default: "" }
}, { timestamps: true });
module.exports = mongoose.model("SellerApplication", sellerApplicationSchema);
