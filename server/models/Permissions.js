const mongoose = require("mongoose");

const apiPermissionSchema = new mongoose.Schema(
  {
    path: { type: String, required: true }, // masalan: "/api/tasks"
    method: { type: String, default: "ALL" }, // GET, POST, ALL
    requiredPermission: { type: String, required: true }, // masalan: "tasks"
  },
  {
    timestamps: true,
    collection: "permissions",
  },
);

module.exports = mongoose.model("Permissions", apiPermissionSchema);
