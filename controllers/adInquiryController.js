const AdInquiry = require("../models/adInquiryModel");

const submitInquiry = async (req, res) => {
  try {
    const { name, email, company, phone, budget, adFormat, goals } = req.body;
    if (!name || !email || !budget) return res.status(400).json({ message: "Name, email and budget are required." });
    const inquiry = await AdInquiry.create({ userId: req.user || null, name, email, company, phone, budget: Number(budget), adFormat, goals });
    res.status(201).json({ message: "Inquiry submitted! Our ads team will contact you within 1 business day.", inquiry });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const getMyInquiry = async (req, res) => {
  try {
    const inquiry = await AdInquiry.findOne({ userId: req.user }).sort({ createdAt: -1 });
    if (!inquiry) return res.status(404).json({ message: "No inquiry found" });
    res.json(inquiry);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllInquiries = async (req, res) => {
  try {
    const inquiries = await AdInquiry.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { submitInquiry, getMyInquiry, getAllInquiries };
