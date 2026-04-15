const mongoose = require("mongoose");

const browsingEventSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  category:  { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Index for efficient 30-day lookups
browsingEventSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("BrowsingEvent", browsingEventSchema);
