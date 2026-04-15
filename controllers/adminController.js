
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const User = require("../models/User");
const PriceAlert = require("../models/priceAlertModel");
const Review = require("../models/reviewModel");
const notificationService = require("../utils/notificationService");
const SellerApplication = require("../models/sellerApplicationModel");
const FboEnrollment = require("../models/fboEnrollmentModel");
const { updateProductRating } = require("./reviewController");

// ADD PRODUCT
const addProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock, discount } = req.body;

    // multer parses repeated fields as array or single string
    let moodTags = [];
    const raw = req.body["moodTags[]"] ?? req.body["moodTags"];
    if (raw) {
      moodTags = Array.isArray(raw) ? raw : [raw];
    }

    const product = new Product({
      name,
      price,
      category,
      description,
      stock,
      discount,
      moodTags,
      image: req.file ? req.file.filename : null
    });

    await product.save();
    res.json(product);

  } catch (err) {
    console.error("addProduct error:", err);
    res.status(500).json({ message: "Error adding product", error: err.message });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const update = { ...req.body };

    // Handle moodTags[] from FormData
    if (req.body["moodTags[]"] !== undefined) {
      update.moodTags = Array.isArray(req.body["moodTags[]"])
        ? req.body["moodTags[]"]
        : [req.body["moodTags[]"]];
      delete update["moodTags[]"];
    } else if (!update.moodTags) {
      update.moodTags = [];
    }

    if (req.file) {
      update.image = req.file.filename;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json(product);

  } catch {
    res.status(500).json({ message: "Error updating product" });
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

// GET ORDERS
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("products.productId")
      .populate("userId");

    res.json(orders);

  } catch {
    res.status(500).json({ message: "Error fetching orders" });
  }
};

// UPDATE ORDER STATUS 🔥
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("products.productId", "price sellerId");

    // Trigger payout when marked Delivered
    if (status === "Delivered" && order) {
      const { createPayoutOnDelivery } = require("./sellerPayoutController");
      const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
      for (const item of order.products) {
        const product = item.productId;
        if (product?.sellerId) {
          const amount = (product.price || 0) * (item.quantity || 1) * (1 - commissionRate);
          createPayoutOnDelivery(product.sellerId, order._id, amount);
        }
      }
    }

    res.json(order);

  } catch (e) {
    res.status(500).json({ message: "Status update failed" });
  }
};

// DASHBOARD
const getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();

    const orders = await Order.find();
    const revenue = orders.reduce(
      (acc, o) => acc + (o.totalAmount || 0),
      0
    );

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      revenue
    });

  } catch {
    res.status(500).json({ message: "Dashboard error" });
  }
};

// GET PENDING PRICE ALERTS
const getPendingAlerts = async (req, res) => {
  try {
    const alerts = await PriceAlert.find({ isActive: true, isNotified: false })
      .populate("userId", "name email")
      .populate("productId", "name image price")
      .sort({ createdAt: -1 });
    res.status(200).json(alerts);
  } catch {
    res.status(500).json({ message: "Error fetching alerts" });
  }
};

// GET ALERT STATS
const getAlertStats = async (req, res) => {
  try {
    const pending = await PriceAlert.countDocuments({ isActive: true, isNotified: false });
    const notified = await PriceAlert.countDocuments({ isNotified: true });
    res.status(200).json({ pending, notified });
  } catch {
    res.status(500).json({ message: "Error fetching alert stats" });
  }
};

// APPROVE PRICE ALERT
const approvePriceAlert = async (req, res) => {
  try {
    const alert = await PriceAlert.findOne({ _id: req.params.id, isNotified: false })
      .populate("userId", "name email")
      .populate("productId", "name price _id");

    if (!alert) {
      return res.status(404).json({ message: "Alert not found or already notified" });
    }

    const productLink = `http://localhost:5173/product/${alert.productId._id}`;
    const subject = `Price Alert: ${alert.productId.name} is now available at your target price!`;
    const html = `
      <h2>Price Alert Triggered</h2>
      <p>Hi ${alert.userId.name},</p>
      <p>The product <strong>${alert.productId.name}</strong> has reached your target price.</p>
      <p>Current Price: <strong>₹${alert.productId.price}</strong></p>
      <p>Your Target Price: <strong>₹${alert.targetPrice}</strong></p>
      <p><a href="${productLink}">View Product</a></p>
    `;

    await notificationService.sendEmail(alert.userId.email, subject, html);

    const message = `Your price alert for ${alert.productId.name} has been triggered! Current price: ₹${alert.productId.price}`;
    await notificationService.createInAppNotification(alert.userId._id, message, "promo");

    alert.isNotified = true;
    await alert.save();

    res.status(200).json({ message: "Alert approved and user notified" });
  } catch {
    res.status(500).json({ message: "Error approving alert" });
  }
};

// GET USERS
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(limitNum),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch {
    res.status(500).json({ message: "Error fetching users" });
  }
};

// UPDATE USER STATUS
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["active", "suspended", "banned"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: status },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User status updated", user });
  } catch {
    res.status(500).json({ message: "Error updating user status" });
  }
};

// REVOKE SELLER ROLE
const revokeSellerRole = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await User.findById(id);
    if (!existing) return res.status(404).json({ message: "User not found" });

    if (existing.role !== "seller") {
      return res.status(400).json({ message: "User is not a seller" });
    }

    const user = await User.findByIdAndUpdate(id, { role: "user" }, { new: true }).select("-password");

    await SellerApplication.findOneAndUpdate({ userId: id }, { status: "pending" });

    res.json({ message: "Seller role revoked", user });
  } catch {
    res.status(500).json({ message: "Error revoking seller role" });
  }
};

const getSellerApplications = async (req, res) => {
  try {
    const apps = await SellerApplication.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.json(apps);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateSellerApplicationDetails = async (req, res) => {
  try {
    const { businessName, gstNumber, phoneNumber, businessAddress, businessType } = req.body;
    const app = await SellerApplication.findByIdAndUpdate(
      req.params.id,
      { businessName, gstNumber, phoneNumber, businessAddress, businessType },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json({ message: "Details updated", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const approveSellerApplication = async (req, res) => {
  try {
    const app = await SellerApplication.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
    if (!app) return res.status(404).json({ message: "Application not found" });
    await User.findByIdAndUpdate(app.userId, { role: "seller" });
    res.json({ message: "Seller approved", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

const rejectSellerApplication = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || rejectionReason === "") {
      return res.status(400).json({ message: "rejectionReason is required" });
    }
    const app = await SellerApplication.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: "Application not found" });
    res.json({ message: "Application rejected", app });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET FBO ENROLLMENTS
const getFboEnrollments = async (req, res) => {
  try {
    const enrollments = await FboEnrollment.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(enrollments);
  } catch {
    res.status(500).json({ message: "Error fetching FBO enrollments" });
  }
};

// APPROVE FBO ENROLLMENT
const approveFboEnrollment = async (req, res) => {
  try {
    const enrollment = await FboEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
    enrollment.status = "approved";
    await enrollment.save();
    try {
      await notificationService.createInAppNotification(
        enrollment.userId,
        "Your Fulfilled by OneCart (FBO) enrollment has been approved! You are now enrolled in the FBO program.",
        "promo"
      );
    } catch (notifErr) {
      console.error("FBO approval notification failed:", notifErr.message);
    }
    res.json({ message: "FBO enrollment approved", enrollment });
  } catch (e) {
    console.error("approveFboEnrollment error:", e.message);
    res.status(500).json({ message: "Error approving FBO enrollment" });
  }
};

// REJECT FBO ENROLLMENT
const rejectFboEnrollment = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || rejectionReason.trim() === "") {
      return res.status(400).json({ message: "rejectionReason is required" });
    }
    const enrollment = await FboEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
    enrollment.status = "rejected";
    enrollment.rejectionReason = rejectionReason;
    await enrollment.save();
    try {
      await notificationService.createInAppNotification(
        enrollment.userId,
        `Your FBO enrollment was not approved. Reason: ${rejectionReason}`,
        "promo"
      );
    } catch (notifErr) {
      console.error("FBO rejection notification failed:", notifErr.message);
    }
    res.json({ message: "FBO enrollment rejected", enrollment });
  } catch (e) {
    console.error("rejectFboEnrollment error:", e.message);
    res.status(500).json({ message: "Error rejecting FBO enrollment" });
  }
};

// GET PUBLIC SELLER STATS (for Sell page)
const getPublicSellerStats = async (req, res) => {
  try {
    const [totalSellers, totalProducts, totalOrders] = await Promise.all([
      User.countDocuments({ role: "seller" }),
      Product.countDocuments(),
      Order.countDocuments(),
    ]);
    res.json({ totalSellers, totalProducts, totalOrders });
  } catch {
    res.status(500).json({ message: "Error fetching stats" });
  }
};
const getAdminReviews = async (req, res) => {
  try {
    const { productId, flagged, hidden, page = 1, limit = 20 } = req.query;
    const query = {};

    if (productId) query.productId = productId;
    if (flagged === "true") query.flagged = true;
    if (hidden === "true") query.hidden = true;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("userId", "name")
        .populate("productId", "name")
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(query)
    ]);

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch {
    res.status(500).json({ message: "Error fetching reviews" });
  }
};

// FLAG REVIEW
const flagReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { flagged: true },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review flagged", review });
  } catch {
    res.status(500).json({ message: "Error flagging review" });
  }
};

// HIDE REVIEW
const hideReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { hidden: true },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review hidden", review });
  } catch {
    res.status(500).json({ message: "Error hiding review" });
  }
};

// ADMIN DELETE REVIEW
const adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    await Review.findByIdAndDelete(req.params.id);
    await updateProductRating(review.productId);

    res.json({ message: "Review deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting review" });
  }
};

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  getPendingAlerts,
  getAlertStats,
  approvePriceAlert,
  getSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  updateSellerApplicationDetails,
  getUsers,
  updateUserStatus,
  revokeSellerRole,
  getAdminReviews,
  flagReview,
  hideReview,
  adminDeleteReview,
  getFboEnrollments,
  approveFboEnrollment,
  rejectFboEnrollment,
  getPublicSellerStats
};