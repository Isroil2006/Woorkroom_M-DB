const mongoose = require("mongoose");

const langSchema = new mongoose.Schema(
  {
    uz: { type: String, default: "" },
    ru: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false }
);

const vacationSchema = new mongoose.Schema(
  {
    name: { type: langSchema, required: true },
    country: { type: langSchema, required: true },
    city: { type: langSchema },
    category: {
      type: String,
      enum: ["beach", "mountain", "city", "nature", "all"], // although "all" is a filter, keep standard ones
      default: "beach",
    },
    price: { type: Number, required: true, default: 0 },
    days: { type: Number, default: 7 },
    nights: { type: Number, default: 6 },
    rating: { type: Number, default: 5 },
    description: { type: langSchema },
    included: {
      uz: [{ type: String }],
      ru: [{ type: String }],
      en: [{ type: String }],
    },
    coverImage: { type: String },
    images: [{ type: String }],
    lat: { type: Number },
    lng: { type: Number },
    dates: [{
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vacation", vacationSchema);
