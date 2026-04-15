const mongoose = require("mongoose");

const fboEnrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    warehousePickupAddress: { type: String, required: true },
    skuCount: { type: Number, required: true, min: 10 },
    bankAccountNumber: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FboEnrollment", fboEnrollmentSchema);
