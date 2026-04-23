const mongoose = require("mongoose");

const userPhotoSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    fileType: { type: String, enum: ["image", "video"], default: "image" },
    fileData: { type: String, required: true }, // Base64 string
  },
  { timestamps: true },
);

// Kolleksiya nomini 'user-photos' deb majburiy belgilaymiz
module.exports = mongoose.model("UserPhoto", userPhotoSchema, "user-photos");
