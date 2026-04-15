const Coupon = require("../models/couponModel");
const Tax = require("../models/taxModel");
const Refund = require("../models/refundModel");
const PaymentSettings = require("../models/paymentSettingsModel");
const Order = require("../models/orderModel");
const User = require("../models/User");
const WalletTransaction = require("../models/walletTransactionModel");

/* ==================== COUPON CONTROLLERS ==================== */

const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid coupon code" });
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return res.status(400).json({ success: false, message: "Coupon expired" });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required` 
      });
    }

    let discount = coupon.discountType === "percentage" 
      ? (orderAmount * coupon.discountValue) / 100 
      : coupon.discountValue;

    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    res.json({ 
      success: true, 
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================== TAX CONTROLLERS ==================== */

const getAllTaxes = async (req, res) => {
  try {
    const taxes = await Tax.find().sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, taxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTax = async (req, res) => {
  try {
    const tax = await Tax.create(req.body);
    res.json({ success: true, tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTax = async (req, res) => {
  try {
    const tax = await Tax.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!tax) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }
    res.json({ success: true, tax });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTax = async (req, res) => {
  try {
    const tax = await Tax.findByIdAndDelete(req.params.id);
    if (!tax) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }
    res.json({ success: true, message: "Tax deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const calculateTax = async (req, res) => {
  try {
    const { country, state, zipCode, amount } = req.body;
    
    let query = { country, isActive: true };
    if (state) query.state = state;
    if (zipCode) query.zipCode = zipCode;

    const taxes = await Tax.find(query).sort({ priority: -1 });
    
    let totalTaxRate = 0;
    let applicableTaxes = [];

    for (const tax of taxes) {
      totalTaxRate += tax.taxRate;
      applicableTaxes.push({
        name: tax.name,
        rate: tax.taxRate,
        amount: (amount * tax.taxRate) / 100
      });
    }

    const taxAmount = (amount * totalTaxRate) / 100;

    res.json({
      success: true,
      subtotal: amount,
      taxRate: totalTaxRate,
      taxAmount,
      total: amount + taxAmount,
      taxes: applicableTaxes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================== REFUND CONTROLLERS ==================== */

const getMyRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({ userId: req.user })
      .select("_id orderId totalRefundAmount refundMethod status createdAt adminNotes")
      .sort({ createdAt: -1 });
    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find()
      .populate("orderId", "orderId totalAmount status")
      .populate("userId", "name email")
      .populate("items.productId", "name image")
      .sort({ createdAt: -1 });
    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createRefundRequest = async (req, res) => {
  try {
    const { orderId, items, reason, detailedReason, refundMethod, totalRefundAmount: clientTotal } = req.body;
    
    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Try to calculate server-side; fall back to client-provided value if price not on item
    let totalRefundAmount = 0;
    for (const item of items) {
      const orderItem = order.products.find(
        p => p.productId?._id?.toString() === item.productId || p.productId?.toString() === item.productId
      );
      if (orderItem) {
        const price = orderItem.price || orderItem.productId?.price || 0;
        totalRefundAmount += price * item.quantity;
      }
    }

    // If calculation failed (NaN or 0), use client-provided total or order total
    if (!totalRefundAmount || isNaN(totalRefundAmount)) {
      totalRefundAmount = clientTotal || order.totalAmount || 0;
    }

    const refund = await Refund.create({
      orderId,
      userId: order.userId,
      items,
      totalRefundAmount,
      reason,
      detailedReason,
      refundMethod
    });

    res.json({ success: true, refund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRefundStatus = async (req, res) => {
  try {
    const { status, adminNotes, refundTransactionId } = req.body;
    const processedBy = req.user?._id || null;

    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ success: false, message: "Refund not found" });
    }

    if (status === "approved" && refund.refundMethod === "store_credit") {
      const user = await User.findById(refund.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        refund.userId,
        { $inc: { walletBalance: refund.totalRefundAmount } },
        { new: true }
      );

      await WalletTransaction.create({
        userId: refund.userId,
        type: "credit",
        source: "refund",
        amount: refund.totalRefundAmount,
        description: "Refund credit",
        balanceAfter: updatedUser.walletBalance
      });

      const updatedRefund = await Refund.findByIdAndUpdate(
        req.params.id,
        { status: "completed", processedBy, adminNotes, refundTransactionId, processedAt: new Date() },
        { new: true }
      );

      return res.json({ success: true, refund: updatedRefund });
    }

    if (status === "approved" && (refund.refundMethod === "original_payment" || refund.refundMethod === "bank_transfer")) {
      const updatedRefund = await Refund.findByIdAndUpdate(
        req.params.id,
        { status: "approved", processedBy, adminNotes, refundTransactionId, processedAt: new Date() },
        { new: true }
      );

      return res.json({ success: true, refund: updatedRefund });
    }

    const updatedRefund = await Refund.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes, refundTransactionId, processedBy, processedAt: new Date() },
      { new: true }
    );

    res.json({ success: true, refund: updatedRefund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRefundStats = async (req, res) => {
  try {
    const stats = await Refund.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalRefundAmount" }
        }
      }
    ]);

    const summary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      completed: 0,
      totalPendingAmount: 0,
      totalApprovedAmount: 0,
      totalCompletedAmount: 0
    };

    for (const stat of stats) {
      summary[stat._id] = stat.count;
      if (stat._id === "pending") summary.totalPendingAmount = stat.totalAmount;
      if (stat._id === "approved") summary.totalApprovedAmount = stat.totalAmount;
      if (stat._id === "completed") summary.totalCompletedAmount = stat.totalAmount;
    }

    res.json({ success: true, stats: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==================== PAYMENT SETTINGS CONTROLLERS ==================== */

const getAllPaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSettings.find().sort({ sortOrder: 1 });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSettings.create(req.body);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSettings.findOneAndUpdate(
      { provider: req.params.provider },
      req.body,
      { new: true, upsert: true }
    );
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const togglePaymentProvider = async (req, res) => {
  try {
    const settings = await PaymentSettings.findOne({ provider: req.params.provider });
    if (!settings) {
      return res.status(404).json({ success: false, message: "Payment provider not found" });
    }
    
    settings.isEnabled = !settings.isEnabled;
    await settings.save();
    
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const initializeDefaultPaymentSettings = async (req, res) => {
  try {
    const defaults = [
      {
        provider: "razorpay",
        displayName: "Razorpay",
        isEnabled: false,
        isTestMode: true,
        supportedCurrencies: ["INR"],
        supportedCountries: ["IN"]
      },
      {
        provider: "stripe",
        displayName: "Stripe",
        isEnabled: false,
        isTestMode: true,
        supportedCurrencies: ["USD", "EUR", "GBP"],
        supportedCountries: ["US", "CA", "GB", "AU"]
      },
      {
        provider: "paypal",
        displayName: "PayPal",
        isEnabled: false,
        isTestMode: true,
        supportedCurrencies: ["USD", "EUR", "GBP"],
        supportedCountries: ["US", "CA", "GB", "AU", "DE", "FR"]
      },
      {
        provider: "cash_on_delivery",
        displayName: "Cash on Delivery",
        isEnabled: true,
        isTestMode: false,
        supportedCurrencies: ["INR"],
        supportedCountries: ["IN"]
      },
      {
        provider: "bank_transfer",
        displayName: "Bank Transfer",
        isEnabled: false,
        isTestMode: false,
        supportedCurrencies: ["INR", "USD"],
        supportedCountries: ["IN", "US"]
      }
    ];

    for (const setting of defaults) {
      await PaymentSettings.findOneAndUpdate(
        { provider: setting.provider },
        setting,
        { upsert: true, new: true }
      );
    }

    const settings = await PaymentSettings.find().sort({ sortOrder: 1 });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  /* Coupons */
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  /* Taxes */
  getAllTaxes,
  createTax,
  updateTax,
  deleteTax,
  calculateTax,
  /* Refunds */
  getMyRefunds,
  getAllRefunds,
  createRefundRequest,
  updateRefundStatus,
  getRefundStats,
  /* Payment Settings */
  getAllPaymentSettings,
  createPaymentSettings,
  updatePaymentSettings,
  togglePaymentProvider,
  initializeDefaultPaymentSettings
};
