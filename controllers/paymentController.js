const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../models/orderModel");
const {quoteCart,fail} = require('../utils/checkout');
const {verifiedPayment} = require('../utils/paymentGateway');
const Refund = require("../models/refundModel");

// Startup validation — runs once at module load
const keysPresent =
  !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

if (!keysPresent) {
  console.warn(
    "[Payment] WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set. Payment endpoints will return 503."
  );
}

// Initialize Razorpay instance (only when keys are present to avoid constructor throw)
const razorpay = keysPresent
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

/* ------------------------------------------------------------------ */
/* createOrder                                                          */
/* ------------------------------------------------------------------ */
const createOrder = async (req, res) => {
  if (!keysPresent) {
    return res
      .status(503)
      .json({ success: false, message: "Payment service unavailable" });
  }

  try {
    const quote = await quoteCart(req.user,req.body.couponCode);
    const walletAmount = Number(req.body.walletAmount || 0);
    if (!Number.isFinite(walletAmount) || walletAmount < 0 || walletAmount >= quote.total) throw fail('Invalid wallet amount');
    const order = await razorpay.orders.create({
      amount: Math.round((quote.total-walletAmount)*100),currency:'INR',receipt:'receipt_'+Date.now(),
      notes:{userId:String(req.user),purpose:'checkout',cart:quote.fingerprint}
    });

    return res.status(200).json({ success: true, order, keyId:process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error("[Payment] createOrder error:", error);
    return res
      .status(error.status || 502)
      .json({ success: false, message: error.status ? error.message : "Failed to initiate payment. Please try again." });
  }
};

/* ------------------------------------------------------------------ */
/* verifyPayment                                                        */
/* ------------------------------------------------------------------ */
const verifyPayment = async (req, res) => {
  if (!keysPresent) return res.status(503).json({message:'Payment service unavailable'});
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedHex = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const expected = Buffer.from(expectedHex, "utf8");
    const received = Buffer.from(razorpay_signature || "", "utf8");

    const isValid =
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received);

    if (isValid) {
      const verified = await verifiedPayment(razorpay_payment_id,req.user,'checkout');
      if (verified.order.id !== razorpay_order_id) return res.status(400).json({message:'Payment order mismatch'});
      return res.status(200).json({ success: true, paymentId: razorpay_payment_id });
    }

    console.warn(`[Payment] Signature mismatch for order ${razorpay_order_id}`);
    return res
      .status(400)
      .json({ success: false, message: "Invalid payment signature" });
  } catch (error) {
    console.error("[Payment] verifyPayment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Verification failed" });
  }
};

/* ------------------------------------------------------------------ */
/* handleWebhook                                                        */
/* ------------------------------------------------------------------ */
const handleWebhook = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).json({message:'Webhook not configured'});
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) return res.status(400).json({message:'Raw body required'});
    const receivedSig = req.headers["x-razorpay-signature"] || "";

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSig, "utf8");
    const receivedBuf = Buffer.from(receivedSig, "utf8");

    const isValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isValid) {
      console.warn(`[Payment] Webhook signature mismatch from IP: ${req.ip}`);
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    // Parse body after signature validation
    const payload = JSON.parse(rawBody.toString("utf8"));
    const event = payload.event;

    // Checkout verifies captured payment before creating an order. A failed retry
    // must never cancel an already paid order.
    if (event === 'refund.processed') {
      const refundId = payload.payload.refund.entity.id;
      const refund = await Refund.findOne({ refundTransactionId: refundId });
      if (refund) {
        refund.status = "completed";
        await refund.save();
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Payment] handleWebhook error:", error);
    return res.status(500).json({ success: false });
  }
};

/* ------------------------------------------------------------------ */
/* processRefund                                                        */
/* ------------------------------------------------------------------ */
const processRefund = async (req, res) => {
  if (!keysPresent) return res.status(503).json({message:'Payment service unavailable'});
  const { paymentId, amount, refundId } = req.body;

  if (!paymentId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "paymentId and amount are required" });
  }

  let razorpayRefund;
  try {
    razorpayRefund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
    });
  } catch (error) {
    console.error("[Payment] processRefund Razorpay error:", error);
    return res
      .status(502)
      .json({ success: false, message: "Failed to process refund. Please try again." });
  }

  // Update documents only after successful Razorpay call
  if (refundId) {
    await Refund.findByIdAndUpdate(refundId, {
      refundTransactionId: razorpayRefund.id,
      status: "processing",
    });
  }

  await Order.findOneAndUpdate(
    { paymentId },
    { status: "Cancelled" }
  );

  return res.status(200).json({ success: true, refund: razorpayRefund });
};

module.exports = { createOrder, verifyPayment, handleWebhook, processRefund };
