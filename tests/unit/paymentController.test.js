// Feature: razorpay-payment-integration
const crypto = require("crypto");

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(body = {}, headers = {}) {
  return { body, headers, ip: "127.0.0.1" };
}

const TEST_KEY_SECRET     = "unit_test_key_secret";
const TEST_WEBHOOK_SECRET = "unit_test_webhook_secret";

function computePaymentSig(orderId, paymentId) {
  return crypto
    .createHmac("sha256", TEST_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function computeWebhookSig(rawBody) {
  return crypto
    .createHmac("sha256", TEST_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
}

// ── createOrder ───────────────────────────────────────────────────────────────

describe("createOrder", () => {
  it("returns 503 when Razorpay keys are missing", async () => {
    jest.resetModules();
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { createOrder } = require("../../controllers/paymentController");
    const res = makeRes();
    await createOrder(makeReq({ amount: 500 }), res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("returns 200 with the mocked Razorpay order on success", async () => {
    const fakeOrder = { id: "order_abc123", amount: 50000, currency: "INR" };
    const mockCreate = jest.fn().mockResolvedValue(fakeOrder);

    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () =>
      jest.fn().mockImplementation(() => ({ orders: { create: mockCreate } }))
    );
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { createOrder } = require("../../controllers/paymentController");
    const res = makeRes();
    await createOrder(makeReq({ amount: 500 }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.order).toEqual(fakeOrder);
  });

  it("returns 502 when Razorpay throws an error", async () => {
    const mockCreate = jest.fn().mockRejectedValue(new Error("Razorpay API down"));

    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () =>
      jest.fn().mockImplementation(() => ({ orders: { create: mockCreate } }))
    );
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { createOrder } = require("../../controllers/paymentController");
    const res = makeRes();
    await createOrder(makeReq({ amount: 500 }), res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it("returns 400 for amount = 0", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({ orders: { create: jest.fn() } })));
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { createOrder } = require("../../controllers/paymentController");
    const res = makeRes();
    await createOrder(makeReq({ amount: 0 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for negative amount", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({ orders: { create: jest.fn() } })));
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { createOrder } = require("../../controllers/paymentController");
    const res = makeRes();
    await createOrder(makeReq({ amount: -100 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ── verifyPayment ─────────────────────────────────────────────────────────────

describe("verifyPayment", () => {
  it("returns 200 for a valid HMAC signature", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { verifyPayment } = require("../../controllers/paymentController");

    const orderId   = "order_unit_test";
    const paymentId = "pay_unit_test";
    const sig       = computePaymentSig(orderId, paymentId);

    const res = makeRes();
    await verifyPayment(makeReq({
      razorpay_order_id:   orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature:  sig,
    }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it("returns 400 for an invalid signature", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));

    const { verifyPayment } = require("../../controllers/paymentController");

    const res = makeRes();
    await verifyPayment(makeReq({
      razorpay_order_id:   "order_unit_test",
      razorpay_payment_id: "pay_unit_test",
      razorpay_signature:  "totally_wrong_signature",
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ── handleWebhook ─────────────────────────────────────────────────────────────

describe("handleWebhook", () => {
  function buildWebhookReq(eventPayload, secret = TEST_WEBHOOK_SECRET) {
    const rawBody = Buffer.from(JSON.stringify(eventPayload));
    const sig     = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return {
      body:    rawBody,
      headers: { "x-razorpay-signature": sig },
      ip:      "127.0.0.1",
    };
  }

  it("returns 400 for an invalid webhook signature", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID         = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET     = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({ findOne: jest.fn() }));
    jest.mock("../../models/refundModel", () => ({ findOne: jest.fn() }));

    const { handleWebhook } = require("../../controllers/paymentController");

    const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }));
    const req = {
      body:    rawBody,
      headers: { "x-razorpay-signature": "bad_signature" },
      ip:      "127.0.0.1",
    };
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updates Order.payment to Razorpay on payment.captured", async () => {
    const mockSave  = jest.fn().mockResolvedValue(true);
    const mockOrder = { payment: "COD", save: mockSave };

    jest.resetModules();
    process.env.RAZORPAY_KEY_ID         = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET     = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({ findOne: jest.fn().mockResolvedValue(mockOrder) }));
    jest.mock("../../models/refundModel", () => ({ findOne: jest.fn() }));

    const { handleWebhook } = require("../../controllers/paymentController");

    const payload = {
      event:   "payment.captured",
      payload: { payment: { entity: { order_id: "order_captured_test" } } },
    };
    const req = buildWebhookReq(payload);
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockOrder.payment).toBe("Razorpay");
    expect(mockSave).toHaveBeenCalled();
  });

  it("sets Order.status to Cancelled on payment.failed", async () => {
    const mockSave  = jest.fn().mockResolvedValue(true);
    const mockOrder = { status: "Ordered", save: mockSave };

    jest.resetModules();
    process.env.RAZORPAY_KEY_ID         = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET     = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({ findOne: jest.fn().mockResolvedValue(mockOrder) }));
    jest.mock("../../models/refundModel", () => ({ findOne: jest.fn() }));

    const { handleWebhook } = require("../../controllers/paymentController");

    const payload = {
      event:   "payment.failed",
      payload: { payment: { entity: { order_id: "order_failed_test" } } },
    };
    const req = buildWebhookReq(payload);
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockOrder.status).toBe("Cancelled");
    expect(mockSave).toHaveBeenCalled();
  });

  it("updates Refund.status to completed on refund.processed", async () => {
    const mockSave   = jest.fn().mockResolvedValue(true);
    const mockRefund = { status: "processing", save: mockSave };

    jest.resetModules();
    process.env.RAZORPAY_KEY_ID         = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET     = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({ findOne: jest.fn().mockResolvedValue(null) }));
    jest.mock("../../models/refundModel", () => ({ findOne: jest.fn().mockResolvedValue(mockRefund) }));

    const { handleWebhook } = require("../../controllers/paymentController");

    const payload = {
      event:   "refund.processed",
      payload: { refund: { entity: { id: "rfnd_test123" } } },
    };
    const req = buildWebhookReq(payload);
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockRefund.status).toBe("completed");
    expect(mockSave).toHaveBeenCalled();
  });
});

// ── processRefund ─────────────────────────────────────────────────────────────

describe("processRefund", () => {
  it("returns 400 when paymentId is missing", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({ payments: { refund: jest.fn() } })));
    jest.mock("../../models/orderModel",  () => ({ findOneAndUpdate: jest.fn() }));
    jest.mock("../../models/refundModel", () => ({ findByIdAndUpdate: jest.fn() }));

    const { processRefund } = require("../../controllers/paymentController");
    const res = makeRes();
    await processRefund(makeReq({ amount: 100 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when amount is missing", async () => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({ payments: { refund: jest.fn() } })));
    jest.mock("../../models/orderModel",  () => ({ findOneAndUpdate: jest.fn() }));
    jest.mock("../../models/refundModel", () => ({ findByIdAndUpdate: jest.fn() }));

    const { processRefund } = require("../../controllers/paymentController");
    const res = makeRes();
    await processRefund(makeReq({ paymentId: "pay_test" }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 502 when Razorpay refund throws", async () => {
    const mockRefundFn = jest.fn().mockRejectedValue(new Error("Razorpay refund error"));

    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () =>
      jest.fn().mockImplementation(() => ({ payments: { refund: mockRefundFn } }))
    );
    jest.mock("../../models/orderModel",  () => ({ findOneAndUpdate: jest.fn() }));
    jest.mock("../../models/refundModel", () => ({ findByIdAndUpdate: jest.fn() }));

    const { processRefund } = require("../../controllers/paymentController");
    const res = makeRes();
    await processRefund(makeReq({ paymentId: "pay_test", amount: 200 }), res);

    expect(res.status).toHaveBeenCalledWith(502);
  });
});
