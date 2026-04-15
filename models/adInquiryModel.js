const mongoose = require("mongoose");
const adInquirySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:      { type: String, required: true },
  email:     { type: String, required: true },
  company:   { type: String, default: "" },
  phone:     { type: String, default: "" },
  budget:    { type: Number, required: true },
  adFormat:  { type: String, enum: ["sponsored", "banner", "email", "all"], default: "sponsored" },
  goals:     { type: String, default: "" },
  status:    { type: String, enum: ["new", "contacted", "active", "closed"], default: "new" },
}, { timestamps: true });
module.exports = mongoose.model("AdInquiry", adInquirySchema);
