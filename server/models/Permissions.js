const mongoose = require("mongoose");

const apiPermissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true }, // Masalan: "Tasks", "Employees"
    rules: [
      {
        _id: false, // Ichki ID-lar kerak emas
        path: { type: String, required: true },
        method: { type: String, default: "ALL" },
        requiredPermission: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    collection: "permissions",
  },
);

module.exports = mongoose.model("Permissions", apiPermissionSchema);
