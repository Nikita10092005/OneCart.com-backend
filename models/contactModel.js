const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  status: { type: String, enum: ["open", "replied", "closed"], default: "open" },
  adminReply: { type: String, default: "" },
  repliedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Contact", contactSchema);
