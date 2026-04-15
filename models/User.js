const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: { type: String, default: "user" },

  isVerified: { type: Boolean, default: false },

  verificationToken: String,

  phone: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  gender: {
    type: String,
    enum: ["male", "female", "other", ""],
    default: ""
  },

  profilePic: {
    type: String,
    default: ""
  },

  walletBalance: {
    type: Number,
    default: 0
  },

  points: {
    type: Number,
    default: 0
  },

  totalPointsEarned: {
    type: Number,
    default: 0
  },

  tier: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze"
  },

  sellerRating: {
    type: Number,
    default: null
  },

  reviewCount: {
    type: Number,
    default: 0
  },

  responseBadge: {
    type: String,
    enum: ["Fast", "Standard", "Slow", "New"],
    default: "New"
  },

  vacationMode: {
    type: Boolean,
    default: false
  },

  accountStatus: {
    type: String,
    enum: ["active", "suspended", "banned"],
    default: "active"
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);