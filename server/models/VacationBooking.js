const mongoose = require("mongoose");

const vacationBookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vacationId: { type: mongoose.Schema.Types.ObjectId, ref: "Vacation", required: true },
    guests: { type: Number, required: true, default: 1 },
    totalCost: { type: Number, required: true },
    paymentMethod: {
      type: { type: String, enum: ["card", "bank"], default: "card" },
      number: { type: String }, // e.g. masked card number or account number
    },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "confirmed" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VacationBooking", vacationBookingSchema);
