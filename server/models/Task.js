const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ["todo", "progress", "done"], default: "todo" },
  priority: {
    type: String,
    enum: ["none", "low", "medium", "high", "urgent"],
    default: "none",
  },
  dueDate: { type: Date },
  project: { type: String, ref: "Project", required: true },
  assignees: [{ type: String, ref: "User" }],
  createdBy: { type: String, ref: "User" },
  userStatus: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", taskSchema);
