const CardApplication = require("../models/cardApplicationModel");

// POST /api/card-application — submit application
const submitApplication = async (req, res) => {
  try {
    const { name, email, phone, pan, monthlyIncome, cardTier } = req.body;
    if (!name || !email || !phone || !pan || !monthlyIncome) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const existing = await CardApplication.findOne({ email, status: { $in: ["pending", "approved"] } });
    if (existing) {
      return res.status(400).json({ message: "An application for this email is already pending or approved." });
    }
    const app = await CardApplication.create({
      userId: req.user || null,
      name, email, phone, pan,
      monthlyIncome: Number(monthlyIncome),
      cardTier: cardTier || "basic",
    });
    res.status(201).json({ message: "Application submitted successfully!", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/card-application/my — get current user's application
const getMyApplication = async (req, res) => {
  try {
    const app = await CardApplication.findOne({ userId: req.user }).sort({ createdAt: -1 });
    if (!app) return res.status(404).json({ message: "No application found" });
    res.json(app);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/card-applications — admin list all
const getAllApplications = async (req, res) => {
  try {
    const apps = await CardApplication.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(apps);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/card-applications/:id/approve
const approveApplication = async (req, res) => {
  try {
    const app = await CardApplication.findByIdAndUpdate(
      req.params.id, { status: "approved" }, { new: true }
    );
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Application approved", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/card-applications/:id/reject
const rejectApplication = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) return res.status(400).json({ message: "Rejection reason required" });
    const app = await CardApplication.findByIdAndUpdate(
      req.params.id, { status: "rejected", rejectionReason }, { new: true }
    );
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Application rejected", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { submitApplication, getMyApplication, getAllApplications, approveApplication, rejectApplication };
