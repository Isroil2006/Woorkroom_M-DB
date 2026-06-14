const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controller");

// ─── PAYMENT METHODS ──────────────────────────────────────────
router.get("/methods", auth, paymentController.getMethods);
router.post("/methods", auth, paymentController.addMethod);
router.delete("/methods/:id", auth, paymentController.deleteMethod);

// ─── TRANSACTIONS ──────────────────────────────────────────────
router.get("/transactions", auth, paymentController.getTransactions);
router.post("/transactions", auth, paymentController.createTransaction);
router.post("/send/:transactionId", auth, paymentController.executeTransaction);

// ─── STATS & USERS ─────────────────────────────────────────────
router.get("/stats", auth, paymentController.getStats);
router.get("/users", auth, paymentController.getPaymentUsers);

module.exports = router;
