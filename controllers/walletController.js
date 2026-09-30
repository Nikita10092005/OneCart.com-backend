const crypto = require("crypto");
const Razorpay = require("razorpay");
const User = require("../models/User");
const WalletTransaction = require("../models/walletTransactionModel");

const mongoose = require('mongoose');
const PaymentReceipt = require('../models/paymentReceiptModel');
const {verifiedPayment} = require('../utils/paymentGateway');
const MAX_WALLET = 10000;

const keysPresent = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
const razorpay = keysPresent
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

// GET /api/wallet/balance
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user).select("walletBalance");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ balance: user.walletBalance || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/wallet/create-order  { amount }
exports.createReloadOrder = async (req, res) => {
  if (!keysPresent) return res.status(503).json({ message: "Payment service unavailable" });

  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 10 || amount > MAX_WALLET)
    return res.status(400).json({ message: "Amount must be between ₹10 and ₹10,000" });

  try {
    const user = await User.findById(req.user).select("walletBalance");
    if ((user.walletBalance || 0) + amount > MAX_WALLET)
      return res.status(400).json({ message: `Wallet limit is ₹${MAX_WALLET}. Current balance: ₹${user.walletBalance}` });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
      notes:{userId:String(req.user),purpose:'wallet'},
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(502).json({ message: "Failed to create payment order" });
  }
};

// GET /api/wallet/transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user })
      .sort({ createdAt: -1 })
      .select("_id type amount source description balanceAfter createdAt");
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/wallet/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }
exports.verifyReload = async (req, res) => {
  if (!keysPresent) return res.status(503).json({message:'Payment service unavailable'});
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedHex = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isValid =
      Buffer.from(expectedHex, "utf8").length === Buffer.from(razorpay_signature || "", "utf8").length &&
      crypto.timingSafeEqual(Buffer.from(expectedHex, "utf8"), Buffer.from(razorpay_signature || "", "utf8"));

    if (!isValid) return res.status(400).json({ success: false, message: "Invalid payment signature" });

    const verified = await verifiedPayment(razorpay_payment_id,req.user,'wallet');
    if (verified.order.id !== razorpay_order_id) return res.status(400).json({message:'Payment order mismatch'});
    const creditedAmount = verified.payment.amount / 100;
    if (creditedAmount < 10 || creditedAmount > MAX_WALLET) return res.status(400).json({message:'Invalid reload amount'});
    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async()=>{
        await PaymentReceipt.create([{_id:razorpay_payment_id,userId:req.user,purpose:'wallet',amount:creditedAmount}],{session});
        user = await User.findOneAndUpdate({_id:req.user,walletBalance:{$lte:MAX_WALLET-creditedAmount}},{$inc:{walletBalance:creditedAmount}},{new:true,session});
        if (!user) throw new Error('Wallet limit reached; contact support for this payment');
        await WalletTransaction.create([{userId:req.user,type:'credit',source:'reload',amount:creditedAmount,description:'Wallet reload',balanceAfter:user.walletBalance}],{session});
      });
    } finally { await session.endSession(); }
    res.json({success:true,balance:user.walletBalance});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
