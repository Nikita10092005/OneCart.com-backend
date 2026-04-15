const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: String,
  userEmail: String, // ✅ NEW FIELD
  text: String,
  sender: String
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);