const mongoose = require("mongoose");

const productComparisonSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  name: {
    type: String,
    default: "My Comparison"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("ProductComparison", productComparisonSchema);
