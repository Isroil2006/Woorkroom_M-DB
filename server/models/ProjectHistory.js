const mongoose = require("mongoose");

const projectHistorySchema = new mongoose.Schema({
  action: { 
    type: String, 
    enum: ["member_added", "member_removed", "member_role_changed", "task_created", "task_deleted"], 
    required: true 
  },
  projectId: { type: String, ref: "Project", required: true },
  user: { type: String, ref: "User", required: true }, // User who performed the action
  details: {
    member: { type: String, ref: "User" },
    memberUsername: { type: String },
    oldRole: { type: String },
    newRole: { type: String },
    task: { type: String, ref: "Task" },
    taskTitle: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ProjectHistory", projectHistorySchema);
