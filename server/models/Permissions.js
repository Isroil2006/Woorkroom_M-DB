const mongoose = require("mongoose");

const permissionsSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    apis: [{ type: String }], // Endi rules emas, faqat apiId-lar massivi
  },
  { timestamps: true }
);

module.exports = mongoose.model("Permissions", permissionsSchema, "permissions");
