// routes/payment.js — Razorpay test payment integration
//
// HOW IT WORKS (interview explanation):
//   1. Frontend calls POST /api/payment/create-order with cart total
//   2. Backend creates a Razorpay order (gets order_id from Razorpay)
//   3. Frontend opens Razorpay checkout modal with that order_id
//   4. User pays using TEST card details
//   5. Razorpay returns payment_id, order_id, signature
//   6. Backend verifies the signature using HMAC-SHA256
//   7. If signature matches → payment is genuine → order confirmed

const express = require("express");
const router  = express.Router();
const crypto  = require("crypto"); // built-in Node.js module — no install needed

// Razorpay is only initialised if keys are present
let razorpay = null;
try {
  const Razorpay = require("razorpay");
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("Razorpay initialised ✅");
  } else {
    console.log("Razorpay keys not set — running in mock mode");
  }
} catch (e) {
  console.log("razorpay npm package not installed — running in mock mode");
}

// POST /api/payment/create-order
// body: { amount, currency, receipt }
router.post("/create-order", async (req, res) => {
  const { amount, currency = "INR", receipt = "order_001" } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Valid amount required." });
  }

  // If Razorpay is configured — create real test order
  if (razorpay) {
    try {
      const order = await razorpay.orders.create({
        amount:   Math.round(amount * 100), // Razorpay takes amount in paise
        currency,
        receipt,
        payment_capture: 1,
      });
      return res.json({
        success:  true,
        mode:     "razorpay",
        orderId:  order.id,
        amount:   order.amount,
        currency: order.currency,
        keyId:    process.env.RAZORPAY_KEY_ID,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: "Razorpay order creation failed: " + e.message });
    }
  }

  // Mock mode — simulate order creation without Razorpay keys
  const mockOrderId = "mock_order_" + Date.now();
  return res.json({
    success:  true,
    mode:     "mock",
    orderId:  mockOrderId,
    amount:   Math.round(amount * 100),
    currency,
    keyId:    null,
  });
});

// POST /api/payment/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock } = req.body;

  // Mock mode — just confirm
  if (mock) {
    return res.json({
      success:   true,
      message:   "Mock payment verified",
      paymentId: "mock_pay_" + Date.now(),
      orderId:   razorpay_order_id,
    });
  }

  // Real Razorpay verification using HMAC-SHA256 signature check
  const secret    = process.env.RAZORPAY_KEY_SECRET;
  const body      = razorpay_order_id + "|" + razorpay_payment_id;
  const expected  = crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (expected === razorpay_signature) {
    console.log("Payment verified ✅", razorpay_payment_id);
    return res.json({
      success:   true,
      message:   "Payment verified successfully",
      paymentId: razorpay_payment_id,
      orderId:   razorpay_order_id,
    });
  } else {
    console.log("Payment verification FAILED ❌");
    return res.status(400).json({ success: false, message: "Payment verification failed — possible tampering." });
  }
});

module.exports = router;