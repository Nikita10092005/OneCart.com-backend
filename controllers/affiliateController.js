const Affiliate = require("../models/affiliateModel");
const crypto = require("crypto");

const signUp = async (req, res) => {
  try {
    const { name, email, phone, platform, website, audience } = req.body;
    if (!name || !email || !platform) return res.status(400).json({ message: "Name, email and platform are required." });
    const existing = await Affiliate.findOne({ email });
    if (existing) return res.status(400).json({ message: "An affiliate account with this email already exists." });
    const referralCode = "OC" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const affiliate = await Affiliate.create({ userId: req.user || null, name, email, phone, platform, website, audience, referralCode });
    res.status(201).json({ message: "Application submitted! You'll hear from us within 24 hours.", affiliate });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ userId: req.user });
    if (!affiliate) return res.status(404).json({ message: "No affiliate profile found" });
    res.json(affiliate);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllAffiliates = async (req, res) => {
  try {
    const affiliates = await Affiliate.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.json(affiliates);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const affiliate = await Affiliate.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!affiliate) return res.status(404).json({ message: "Not found" });
    res.json({ message: `Affiliate ${status}`, affiliate });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signUp, getMyProfile, getAllAffiliates, updateStatus };
