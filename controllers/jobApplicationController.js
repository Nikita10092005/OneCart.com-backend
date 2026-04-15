const JobApplication = require("../models/jobApplicationModel");
const notificationService = require("../utils/notificationService");

// User submits application
const submitApplication = async (req, res) => {
  try {
    const { name, email, phone, position, experience, skills, education, portfolio, coverLetter } = req.body;
    const app = await JobApplication.create({
      userId: req.user || null,
      name, email, phone, position, experience, skills, education, portfolio, coverLetter
    });
    res.status(201).json({ message: "Application submitted successfully", id: app._id });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: get all applications
const getAllApplications = async (req, res) => {
  try {
    const apps = await JobApplication.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: reply to application
const replyToApplication = async (req, res) => {
  try {
    const { adminReply, status } = req.body;
    const app = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { adminReply, status: status || "reviewed", repliedAt: new Date() },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: "Application not found" });

    // Send in-app notification if user is registered
    if (app.userId) {
      await notificationService.createInAppNotification(
        app.userId,
        `Your job application for "${app.position}" has been reviewed. Check your application for the response.`,
        "promo"
      );
    }

    res.json({ message: "Reply sent", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// User: get their own applications
const getMyApplications = async (req, res) => {
  try {
    const apps = await JobApplication.find({ userId: req.user }).sort({ createdAt: -1 });
    res.json(apps);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { submitApplication, getAllApplications, replyToApplication, getMyApplications };
