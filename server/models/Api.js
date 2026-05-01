const mongoose = require("mongoose");

const apiSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true }, // Endi haqiqiy SON
    path: { type: String, required: true },
    method: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String },
    apiId: { type: Number }, // Bu ham SON
  },
  { timestamps: true, _id: false }
);

module.exports = mongoose.model("Api", apiSchema, "apis");
