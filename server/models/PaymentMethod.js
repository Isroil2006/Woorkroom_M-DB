const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["card", "bank"], required: true },
    cardName: { type: String, default: "" },
    number: { type: String, required: true },
    displayNumber: { type: String, default: "" },
    holder: { type: String, default: "" },
    expiry: { type: String, default: "" },
    bank: { type: String, default: "" },
    cvv: { type: String, default: "" },
    balance: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
