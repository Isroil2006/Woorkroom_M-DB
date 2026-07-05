const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controller");

// ─── PAYMENT METHODS ──────────────────────────────────────────
router.get("/methods", auth, paymentController.getMethods);
router.post("/methods", auth, paymentController.addMethod);
router.delete("/methods/:id", auth, paymentController.deleteMethod);
router.patch("/methods/:id/block", auth, paymentController.toggleBlockMethod);

// ─── TRANSACTIONS ──────────────────────────────────────────────
router.get("/transactions", auth, paymentController.getTransactions);
router.post("/transactions", auth, paymentController.createTransaction);
router.post("/send-otp", auth, paymentController.sendOtp);
router.post("/send/:transactionId", auth, paymentController.executeTransaction);
router.delete("/transactions/:transactionId", auth, paymentController.deleteTransaction);

// ─── STATS & USERS ─────────────────────────────────────────────
router.get("/stats", auth, paymentController.getStats);
router.get("/users", auth, paymentController.getPaymentUsers);

module.exports = router;
