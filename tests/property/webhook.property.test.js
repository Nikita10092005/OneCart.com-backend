// Feature: razorpay-payment-integration
const fc     = require("fast-check");
const crypto = require("crypto");

// ── helpers ──────────────────────────────────────────────────────────────────

const TEST_WEBHOOK_SECRET = "test_webhook_secret_32bytes_long!";

function computeWebhookSig(rawBody) {
  return crypto
    .createHmac("sha256", TEST_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeWebhookReq(rawBody, signature) {
  return {
    body:    Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody),
    headers: { "x-razorpay-signature": signature },
    ip:      "127.0.0.1",
  };
}

// ── Property 6 ────────────────────────────────────────────────────────────────

describe("Property 6 – Webhook HMAC validation", () => {
  /**
   * Validates: Requirements 6.2, 6.3
   * Valid HMAC → 200. Invalid HMAC → 400.
   */

  it("returns 200 when the correct HMAC signature is provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (bodyStr) => {
          jest.resetModules();
          process.env.RAZORPAY_KEY_ID       = "test_key_id";
          process.env.RAZORPAY_KEY_SECRET   = "test_key_secret";
          process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

          jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
          // Minimal model mocks — findOne returns null (no DB hit needed for sig check)
          jest.mock("../../models/orderModel",  () => ({ findOne: jest.fn().mockResolvedValue(null) }));
          jest.mock("../../models/refundModel", () => ({ findOne: jest.fn().mockResolvedValue(null) }));

          const { handleWebhook } = require("../../controllers/paymentController");

          // Build a minimal valid JSON payload so JSON.parse doesn't throw
          const payload = JSON.stringify({ event: "unknown.event", payload: {} });
          const rawBody = Buffer.from(payload);
          const sig     = computeWebhookSig(rawBody);

          const req = makeWebhookReq(rawBody, sig);
          const res = makeRes();

          await handleWebhook(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("returns 400 when an invalid/tampered signature is provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.stringMatching(/^[0-9a-f]{10,64}$/),
        async (bodyStr, fakeSignature) => {
          const payload = JSON.stringify({ event: "unknown.event", payload: {} });
          const rawBody = Buffer.from(payload);
          const realSig = computeWebhookSig(rawBody);
          fc.pre(fakeSignature !== realSig);

          jest.resetModules();
          process.env.RAZORPAY_KEY_ID         = "test_key_id";
          process.env.RAZORPAY_KEY_SECRET     = "test_key_secret";
          process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

          jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
          jest.mock("../../models/orderModel",  () => ({ findOne: jest.fn().mockResolvedValue(null) }));
          jest.mock("../../models/refundModel", () => ({ findOne: jest.fn().mockResolvedValue(null) }));

          const { handleWebhook } = require("../../controllers/paymentController");

          const req = makeWebhookReq(rawBody, fakeSignature);
          const res = makeRes();

          await handleWebhook(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ── Property 7 ────────────────────────────────────────────────────────────────

describe("Property 7 – Valid webhook events always return 200", () => {
  /**
   * Validates: Requirements 6.7
   * For any webhook payload with a valid HMAC, handler returns 200 regardless
   * of event type or whether a matching document exists.
   */

  const EVENT_TYPES = [
    "payment.captured",
    "payment.failed",
    "refund.processed",
    "unknown.event",
    "order.paid",
    "subscription.activated",
  ];

  it("returns 200 for any event type when signature is valid", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...EVENT_TYPES),
        async (eventType) => {
          jest.resetModules();
          process.env.RAZORPAY_KEY_ID         = "test_key_id";
          process.env.RAZORPAY_KEY_SECRET     = "test_key_secret";
          process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

          jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));

          // Mock models to return null (no matching document) — handler should still return 200
          jest.mock("../../models/orderModel", () => ({
            findOne: jest.fn().mockResolvedValue(null),
          }));
          jest.mock("../../models/refundModel", () => ({
            findOne: jest.fn().mockResolvedValue(null),
          }));

          const { handleWebhook } = require("../../controllers/paymentController");

          const payload = JSON.stringify({
            event: eventType,
            payload: {
              payment: { entity: { order_id: "order_test123" } },
              refund:  { entity: { id: "rfnd_test123" } },
            },
          });
          const rawBody = Buffer.from(payload);
          const sig     = computeWebhookSig(rawBody);

          const req = makeWebhookReq(rawBody, sig);
          const res = makeRes();

          await handleWebhook(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
        }
      ),
      { numRuns: 30 }
    );
  });
});
