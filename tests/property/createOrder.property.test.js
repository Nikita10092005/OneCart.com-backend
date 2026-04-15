// Feature: razorpay-payment-integration
const fc = require("fast-check");

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(body = {}) {
  return { body };
}

// ── module-level mock setup ───────────────────────────────────────────────────
// We need to control keysPresent and the razorpay instance per test, so we
// re-require the controller inside each test after setting env vars.

describe("Property 1 – Amount-to-paise conversion is exact", () => {
  /**
   * Validates: Requirements 2.2, 7.7
   * For any positive float, Math.round(amount * 100) is sent to Razorpay.
   */
  it("sends Math.round(amount * 100) to Razorpay for any positive amount", async () => {
    await fc.assert(
      fc.asyncProperty(fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }), async (amount) => {
        const mockCreate = jest.fn().mockResolvedValue({ id: "order_test", amount: Math.round(amount * 100), currency: "INR" });
        jest.resetModules();
        process.env.RAZORPAY_KEY_ID     = "test_key_id";
        process.env.RAZORPAY_KEY_SECRET = "test_key_secret";

        jest.mock("razorpay", () =>
          jest.fn().mockImplementation(() => ({ orders: { create: mockCreate } }))
        );
        jest.mock("../../models/orderModel",  () => ({}));
        jest.mock("../../models/refundModel", () => ({}));

        const { createOrder } = require("../../controllers/paymentController");
        const req = makeReq({ amount });
        const res = makeRes();

        await createOrder(req, res);

        expect(mockCreate).toHaveBeenCalledTimes(1);
        const callArg = mockCreate.mock.calls[0][0];
        expect(callArg.amount).toBe(Math.round(amount * 100));
      }),
      { numRuns: 50 }
    );
  });
});

describe("Property 2 – Currency is always INR", () => {
  /**
   * Validates: Requirements 2.3
   * For any valid order creation request, currency sent to Razorpay is "INR".
   */
  it("always passes currency: INR to Razorpay", async () => {
    await fc.assert(
      fc.asyncProperty(fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }), async (amount) => {
        const mockCreate = jest.fn().mockResolvedValue({ id: "order_test", amount: Math.round(amount * 100), currency: "INR" });
        jest.resetModules();
        process.env.RAZORPAY_KEY_ID     = "test_key_id";
        process.env.RAZORPAY_KEY_SECRET = "test_key_secret";

        jest.mock("razorpay", () =>
          jest.fn().mockImplementation(() => ({ orders: { create: mockCreate } }))
        );
        jest.mock("../../models/orderModel",  () => ({}));
        jest.mock("../../models/refundModel", () => ({}));

        const { createOrder } = require("../../controllers/paymentController");
        const req = makeReq({ amount });
        const res = makeRes();

        await createOrder(req, res);

        const callArg = mockCreate.mock.calls[0][0];
        expect(callArg.currency).toBe("INR");
      }),
      { numRuns: 50 }
    );
  });
});

describe("Property 3 – Receipt format matches /^receipt_\\d+$/", () => {
  /**
   * Validates: Requirements 2.4
   * For any order creation call, receipt field matches /^receipt_\d+$/.
   */
  it("always generates a receipt matching /^receipt_\\d+$/", async () => {
    await fc.assert(
      fc.asyncProperty(fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }), async (amount) => {
        const mockCreate = jest.fn().mockResolvedValue({ id: "order_test", amount: Math.round(amount * 100), currency: "INR" });
        jest.resetModules();
        process.env.RAZORPAY_KEY_ID     = "test_key_id";
        process.env.RAZORPAY_KEY_SECRET = "test_key_secret";

        jest.mock("razorpay", () =>
          jest.fn().mockImplementation(() => ({ orders: { create: mockCreate } }))
        );
        jest.mock("../../models/orderModel",  () => ({}));
        jest.mock("../../models/refundModel", () => ({}));

        const { createOrder } = require("../../controllers/paymentController");
        const req = makeReq({ amount });
        const res = makeRes();

        await createOrder(req, res);

        const callArg = mockCreate.mock.calls[0][0];
        expect(callArg.receipt).toMatch(/^receipt_\d+$/);
      }),
      { numRuns: 50 }
    );
  });
});

describe("Property 4 – Invalid amounts return 400 without calling Razorpay", () => {
  /**
   * Validates: Requirements 2.7
   * Zero, negative, or absent amounts return 400 and never invoke Razorpay.
   */
  it("returns 400 and does not call Razorpay for invalid amounts", async () => {
    const invalidAmounts = fc.oneof(
      fc.constant(0),
      fc.float({ min: Math.fround(-100000), max: Math.fround(-0.001), noNaN: true }),
      fc.constant(undefined),
      fc.constant(null),
      fc.constant("")
    );

    await fc.assert(
      fc.asyncProperty(invalidAmounts, async (amount) => {
        const mockCreate = jest.fn();
        jest.resetModules();
        process.env.RAZORPAY_KEY_ID     = "test_key_id";
        process.env.RAZORPAY_KEY_SECRET = "test_key_secret";

        jest.mock("razorpay", () =>
          jest.fn().mockImplementation(() => ({ orders: { create: mockCreate } }))
        );
        jest.mock("../../models/orderModel",  () => ({}));
        jest.mock("../../models/refundModel", () => ({}));

        const { createOrder } = require("../../controllers/paymentController");
        const req = makeReq({ amount });
        const res = makeRes();

        await createOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockCreate).not.toHaveBeenCalled();
      }),
      { numRuns: 50 }
    );
  });
});
