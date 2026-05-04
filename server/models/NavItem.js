const mongoose = require("mongoose");

const navItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    id: { type: Number, required: true, unique: true },
    actions: [
      {
        _id: false,
        key: { type: String, required: true },
        defaultValue: { type: Boolean, default: true },
        id: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("NavItem", navItemSchema);
