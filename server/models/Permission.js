const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    perms: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
    collection: "user-permissions",
  },
);

module.exports = mongoose.model("Permission", permissionSchema);
