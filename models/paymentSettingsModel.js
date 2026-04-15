const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ["razorpay", "stripe", "paypal", "cash_on_delivery", "bank_transfer"],
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  isTestMode: {
    type: Boolean,
    default: true
  },
  config: {
    keyId: {
      type: String,
      default: ""
    },
    keySecret: {
      type: String,
      default: ""
    },
    publicKey: {
      type: String,
      default: ""
    },
    privateKey: {
      type: String,
      default: ""
    },
    webhookSecret: {
      type: String,
      default: ""
    },
    merchantId: {
      type: String,
      default: ""
    },
    clientId: {
      type: String,
      default: ""
    },
    clientSecret: {
      type: String,
      default: ""
    }
  },
  supportedCurrencies: [{
    type: String,
    default: ["INR"]
  }],
  supportedCountries: [{
    type: String,
    default: ["IN"]
  }],
  processingFee: {
    type: Number,
    default: 0
  },
  processingFeeType: {
    type: String,
    enum: ["percentage", "fixed"],
    default: "percentage"
  },
  minAmount: {
    type: Number,
    default: 1
  },
  maxAmount: {
    type: Number,
    default: null
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

paymentSettingsSchema.index({ provider: 1 }, { unique: true });

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);
