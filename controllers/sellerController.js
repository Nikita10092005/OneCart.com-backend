const User = require("../models/User");
const Product = require("../models/productModel");
const SellerApplication = require("../models/sellerApplicationModel");
const FboEnrollment = require("../models/fboEnrollmentModel");

// Task 2.1 - Updated applyForSeller
const applyForSeller = async (req, res) => {
  try {
    const { businessName, gstNumber, phoneNumber, businessAddress, businessType } = req.body;
    const existing = await SellerApplication.findOne({ userId: req.user });

    if (existing) {
      if (existing.status === "approved") {
        return res.status(400).json({ message: "Application already approved" });
      }
      // pending or rejected: update fields and (re-)set status to pending
      existing.businessName = businessName;
      existing.gstNumber = gstNumber;
      existing.phoneNumber = phoneNumber;
      existing.businessAddress = businessAddress;
      existing.businessType = businessType;
      existing.status = "pending";
      existing.rejectionReason = "";
      await existing.save();
      return res.status(200).json({ message: "Application updated successfully" });
    }

    await SellerApplication.create({
      userId: req.user,
      businessName,
      gstNumber,
      phoneNumber,
      businessAddress,
      businessType,
    });
    res.status(201).json({ message: "Application submitted successfully" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Task 2.2 - getMyApplication
const getMyApplication = async (req, res) => {
  try {
    const application = await SellerApplication.findOne({ userId: req.user });
    if (!application) return res.status(404).json({ message: "No application found" });
    res.json(application);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Task 2.3 - fboEnroll
const fboEnroll = async (req, res) => {
  try {
    const { warehousePickupAddress, skuCount, bankAccountNumber } = req.body;
    const existing = await FboEnrollment.findOne({ userId: req.user });
    if (existing) return res.status(400).json({ message: "FBO enrollment already submitted" });

    await FboEnrollment.create({
      userId: req.user,
      warehousePickupAddress,
      skuCount,
      bankAccountNumber,
    });
    res.status(201).json({ message: "FBO enrollment submitted successfully" });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// Task 2.4 - getMyFboEnrollment
const getMyFboEnrollment = async (req, res) => {
  try {
    const enrollment = await FboEnrollment.findOne({ userId: req.user });
    if (!enrollment) return res.status(404).json({ message: "No FBO enrollment found" });
    res.json(enrollment);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const getSellerProfile = async (req, res) => {
  try {
    const seller = await User.findById(req.params.sellerId).select("name sellerRating reviewCount responseBadge");
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    const products = await Product.find({ sellerId: req.params.sellerId });
    res.json({ seller, products });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const setVacationMode = async (req, res) => {
  try {
    const { enabled } = req.body;
    await User.findByIdAndUpdate(req.user, { vacationMode: !!enabled });
    res.json({ message: `Vacation mode ${enabled ? "enabled" : "disabled"}` });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { applyForSeller, getMyApplication, fboEnroll, getMyFboEnrollment, getSellerProfile, setVacationMode };
