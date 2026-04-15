const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    fileType: { type: String, enum: ["image", "video"], default: "image" },
    fileData: { type: String, required: true }, // Base64 string from frontend
  },
  { timestamps: true },
);

module.exports = mongoose.model("File", fileSchema);
