const mongoose = require("mongoose");

const permissionsSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    apis: [{ type: Number }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Permissions", permissionsSchema, "permissions");
