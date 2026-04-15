const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  position: { type: String, required: true },
  experience: { type: String, required: true },
  skills: { type: String, required: true },
  education: { type: String, required: true },
  portfolio: { type: String, default: "" },
  coverLetter: { type: String, required: true },
  status: { type: String, enum: ["pending", "reviewed", "shortlisted", "rejected"], default: "pending" },
  adminReply: { type: String, default: "" },
  repliedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
