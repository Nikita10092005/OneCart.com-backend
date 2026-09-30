const Order = require("../models/orderModel");
const Cart  = require("../models/cartModel");
const User  = require("../models/User");
const Product = require("../models/productModel");
const WalletTransaction = require("../models/walletTransactionModel");
const notificationService = require("../utils/notificationService");
const { addPoints } = require("./rewardsController");
const { recomputeResponseBadge } = require("../utils/sellerMetrics");
const { createPayoutOnDelivery } = require("./sellerPayoutController");
const sellerTotals = require("../utils/sellerTotals");

const mongoose = require('mongoose');
const PaymentReceipt = require('../models/paymentReceiptModel');
const Coupon = require('../models/couponModel');
const {quoteCart, money, fail} = require('../utils/checkout');
const {verifiedPayment} = require('../utils/paymentGateway');
/* CREATE ORDER */
const createOrder = async (req,res) => {
  let session;
  try {
    const {name,phone,address,payment,paymentId,couponCode} = req.body;
    if (![name,phone,address].every(v=>typeof v === 'string' && v.trim()) || !['COD','Wallet','Razorpay','Wallet+Razorpay'].includes(payment)) throw fail('Valid delivery details and payment method are required');
    if (paymentId) {
      const previous = await Order.findOne({userId:req.user,paymentId}).populate('products.productId');
      if (previous) return res.json(previous);
    }
    const quote = await quoteCart(req.user,couponCode);
    const walletAmount = Number(req.body.walletAmount || 0);
    if (!Number.isFinite(walletAmount) || walletAmount < 0 || walletAmount > quote.total || money(walletAmount) !== walletAmount) throw fail('Invalid wallet amount');
    if ((payment === 'Wallet' && walletAmount !== quote.total) || (['COD','Razorpay'].includes(payment) && walletAmount !== 0)) throw fail('Invalid payment split');
    let verified;
    if (payment.includes('Razorpay')) {
      verified = await verifiedPayment(paymentId,req.user,'checkout');
      if (verified.payment.amount !== Math.round((quote.total-walletAmount)*100) || verified.order.notes?.cart !== quote.fingerprint) throw fail('Cart or payment amount has changed. Contact support if already charged.');
    }
    session = await mongoose.startSession();
    let order;
    await session.withTransaction(async()=>{
      // Claim exactly the quoted cart rows in the transaction. A concurrent
      // checkout or quantity edit must not create another order from this cart.
      for (const item of quote.items) {
        const claimed = await Cart.deleteOne({_id:item._id,userId:req.user,quantity:item.quantity,productId:item.productId._id},{session});
        if (claimed.deletedCount !== 1) throw fail('Your cart changed. Please review it before ordering.');
      }
      if (verified) await PaymentReceipt.create([{_id:paymentId,userId:req.user,purpose:'checkout',amount:verified.payment.amount/100}],{session});
      for (const item of quote.items) {
        const result = await Product.updateOne({_id:item.productId._id,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity}},{session});
        if (result.modifiedCount !== 1) throw fail('Stock changed. Please update your cart.');
      }
      if (walletAmount > 0) {
        const user = await User.findOneAndUpdate({_id:req.user,walletBalance:{$gte:walletAmount}},{$inc:{walletBalance:-walletAmount}},{new:true,session});
        if (!user) throw fail('Insufficient wallet balance');
        await WalletTransaction.create([{userId:req.user,type:'debit',source:'checkout',amount:walletAmount,description:'Order payment',balanceAfter:user.walletBalance}],{session});
      }
      if (quote.coupon) {
        const filter = {_id:quote.coupon._id};
        if (quote.coupon.usageLimit) filter.usageCount = {$lt:quote.coupon.usageLimit};
        const result = await Coupon.updateOne(filter,{$inc:{usageCount:1}},{session});
        if (!result.modifiedCount) throw fail('Coupon usage limit reached');
      }
      [order] = await Order.create([{userId:req.user,name:name.trim(),phone:phone.trim(),address:address.trim(),payment,paymentId:verified ? paymentId : undefined,razorpayOrderId:verified?.order.id || '',walletAmount,totalAmount:quote.total,discount:quote.discount,tax:quote.tax,couponCode:quote.coupon?.code,products:quote.items.map(i=>({productId:i.productId._id,quantity:i.quantity,price:i.productId.price})),status:'Ordered',trackingStages:[{stage:'Ordered',timestamp:new Date()}]}],{session});
    });
    try { await addPoints(req.user,Math.floor(quote.subtotal/10),'purchase','Order purchase',order._id); } catch(e) { console.error('Purchase points failed:',e.message); }
    res.json(await Order.findById(order._id).populate('products.productId'));
  } catch(error) {
    res.status(error.status || (error.code === 11000 ? 409 : 500)).json({message:error.status ? error.message : 'Order could not be completed. If charged, contact support before retrying.'});
  } finally { if(session) await session.endSession(); }
};

/* GET ORDERS OF CURRENT USER */
const getOrders = async (req, res) => {
  try {
    const userId = req.user; // req.user is the raw string ID

    const orders = await Order
      .find({ userId })
      .populate("products.productId")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* GET SINGLE ORDER BY ID */
const getOrderById = async (req, res) => {
  try {
    const order = await Order
      .findById(req.params.orderId)
      .populate("products.productId");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.userId) !== String(req.user) && req.userRole !== 'admin') return res.status(403).json({message:'Access denied'});
    res.json(order);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* CANCEL ORDER */
const cancelOrder = async(req,res) => {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async()=>{
      order = await Order.findById(req.params.orderId).session(session);
      if (!order) throw Object.assign(new Error('Order not found'),{status:404});
      if (String(order.userId) !== String(req.user) && req.userRole !== 'admin') throw Object.assign(new Error('Access denied'),{status:403});
      if (!['Ordered','Packed'].includes(order.status)) throw fail('This order cannot be cancelled');
      order.status='Cancelled'; await order.save({session});
      for (const item of order.products) await Product.updateOne({_id:item.productId},{$inc:{stock:item.quantity}},{session});
      if (order.walletAmount > 0) {
        const user = await User.findByIdAndUpdate(order.userId,{$inc:{walletBalance:order.walletAmount}},{new:true,session});
        await WalletTransaction.create([{userId:order.userId,type:'credit',source:'refund',amount:order.walletAmount,description:'Cancelled order wallet refund',balanceAfter:user.walletBalance}],{session});
      }
    });
    res.json({message:'Order cancelled',order});
  } catch(error) { res.status(error.status||500).json({message:error.status ? error.message : 'Cancellation failed'}); }
  finally {await session.endSession();}
};

const updateOrderStatus = (req,res) => {
  if (req.body.status !== 'Cancelled') return res.status(403).json({message:'Only administrators can update fulfillment status'});
  return cancelOrder(req,res);
};

/* GET ORDER TRACKING */
const getOrderTracking = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    let order;
    
    // Try to find by full ID first (24 hex chars)
    if (orderId.length === 24) {
      order = await Order.findById(orderId);
    } else {
      // For partial IDs, find orders that belong to this user and match partial ID (case insensitive)
      const userOrders = await Order.find({ userId: req.user });
      order = userOrders.find(o => o._id.toString().toUpperCase().endsWith(orderId.toUpperCase()));
    }

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ownership check: user must own the order or be admin
    if (req.user.toString() !== order.userId.toString() && req.userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      currentStage: order.status,
      trackingStages: order.trackingStages
    });

  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* UPDATE ORDER STAGE (admin only) */
const VALID_STAGES = ["Ordered", "Packed", "Shipped", "Delivered"];

const updateOrderStage = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === 'Cancelled') return res.status(400).json({message:'Cancelled orders cannot be reopened'});
    const currentIndex = VALID_STAGES.indexOf(order.status);
    const nextStage = VALID_STAGES[currentIndex + 1];

    if (!nextStage || req.body.status !== nextStage) {
      return res.status(400).json({
        error: `Invalid stage transition. Expected next stage after ${order.status}`
      });
    }

    const changed = await Order.updateOne({_id:order._id,status:order.status},{$set:{status:req.body.status},$push:{trackingStages:{stage:req.body.status,timestamp:new Date()}}});
    if (!changed.modifiedCount) return res.status(409).json({message:'Order was updated; refresh and try again'});
    order.status = req.body.status;

    // Hook: recompute response badge when order is Packed
    if (req.body.status === "Packed") {
      const populatedOrder = await Order.findById(order._id).populate("products.productId");
      const sellerIds = new Set();
      for (const item of populatedOrder.products) {
        if (item.productId?.sellerId) sellerIds.add(item.productId.sellerId.toString());
      }
      for (const sellerId of sellerIds) {
        recomputeResponseBadge(sellerId).catch(e=>console.error('Seller badge:',e.message));
      }
    }

    // Hook: create payout records when order is Delivered
    if (req.body.status === "Delivered") {
      const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
      const populatedOrder = await Order.findById(order._id).populate("products.productId");
      for (const [sellerId, amount] of sellerTotals(populatedOrder.products, commissionRate)) {
        await createPayoutOnDelivery(sellerId, order._id, amount);
      }
    }

    // Notify the order's user
    const user = await User.findById(order.userId);
    if (user) {
      await notificationService.sendEmail(
        user.email,
        `Your order has been ${order.status}`,
        `<p>Your order (ID: ${order._id}) status has been updated to <strong>${order.status}</strong>.</p>`
      );
      await notificationService.createInAppNotification(
        order.userId,
        `Your order status has been updated to ${order.status}`,
        "order_update",
        order._id,
        order.status
      );
    }

    res.json({ order });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderTracking,
  updateOrderStage
};
