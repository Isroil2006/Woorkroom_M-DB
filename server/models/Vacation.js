const mongoose = require("mongoose");

const langSchema = new mongoose.Schema(
  {
    uz: { type: String, default: "" },
    ru: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false }
);

const roomPriceSchema = new mongoose.Schema(
  {
    beds: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: langSchema },
    prices: [roomPriceSchema],
    images: [{ type: String }],
  },
  { _id: false }
);

const hotelSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: langSchema, required: true },
    country: { type: langSchema },
    city: { type: langSchema },
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
    rooms: [roomSchema],
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
      enum: ["beach", "mountain", "city", "nature", "all", "hotel"],
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
    rooms: [roomSchema],
    hotels: [hotelSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vacation", vacationSchema);
