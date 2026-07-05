const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, default: "" },
    receiverId: { type: String, required: true, index: true },
    receiverName: { type: String, default: "" },
    senderMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    receiverMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "UZS"], default: "UZS" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["waiting", "paid"], default: "waiting" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
