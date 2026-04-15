// Feature: razorpay-payment-integration
const fc     = require("fast-check");
const crypto = require("crypto");

// ── helpers ──────────────────────────────────────────────────────────────────

const TEST_KEY_SECRET = "test_key_secret_for_verify";

function computeExpectedSig(orderId, paymentId) {
  return crypto
    .createHmac("sha256", TEST_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(body = {}) {
  return { body };
}

// ── Property 5 ────────────────────────────────────────────────────────────────

describe("Property 5 – HMAC signature verification correctness", () => {
  /**
   * Validates: Requirements 4.2, 4.3, 4.4
   * Computing the real HMAC and passing it returns 200.
   * Any random/tampered signature returns 400.
   */

  beforeEach(() => {
    jest.resetModules();
    process.env.RAZORPAY_KEY_ID     = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
    jest.mock("../../models/orderModel",  () => ({}));
    jest.mock("../../models/refundModel", () => ({}));
  });

  it("returns 200 when the correct HMAC signature is provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (orderId, paymentId) => {
          jest.resetModules();
          process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
          jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
          jest.mock("../../models/orderModel",  () => ({}));
          jest.mock("../../models/refundModel", () => ({}));

          const { verifyPayment } = require("../../controllers/paymentController");

          const sig = computeExpectedSig(orderId, paymentId);
          const req = makeReq({
            razorpay_order_id:   orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature:  sig,
          });
          const res = makeRes();

          await verifyPayment(req, res);

          expect(res.status).toHaveBeenCalledWith(200);
          const jsonArg = res.json.mock.calls[0][0];
          expect(jsonArg.success).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("returns 400 when a random/tampered signature is provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        // A random hex string that is very unlikely to match the real HMAC
        fc.stringMatching(/^[0-9a-f]{10,64}$/),
        async (orderId, paymentId, fakeSignature) => {
          const realSig = computeExpectedSig(orderId, paymentId);
          // Skip the rare case where the random string happens to match
          fc.pre(fakeSignature !== realSig);

          jest.resetModules();
          process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
          jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({})));
          jest.mock("../../models/orderModel",  () => ({}));
          jest.mock("../../models/refundModel", () => ({}));

          const { verifyPayment } = require("../../controllers/paymentController");

          const req = makeReq({
            razorpay_order_id:   orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature:  fakeSignature,
          });
          const res = makeRes();

          await verifyPayment(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
        }
      ),
      { numRuns: 50 }
    );
  });
});
