const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    trim: true,
    default: ""
  },
  zipCode: {
    type: String,
    trim: true,
    default: ""
  },
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  taxType: {
    type: String,
    enum: ["vat", "gst", "sales_tax", "other"],
    default: "vat"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

taxSchema.index({ country: 1, state: 1, zipCode: 1 });

module.exports = mongoose.model("Tax", taxSchema);
