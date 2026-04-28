const mongoose = require("mongoose");

const apiSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    method: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String }, // Tavsif maydoni qaytarildi
    apiId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Api", apiSchema, "apis");
