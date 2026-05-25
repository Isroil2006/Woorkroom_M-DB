const mongoose = require("mongoose");

const taskHistorySchema = new mongoose.Schema({
  action: { 
    type: String, 
    enum: ["created", "updated", "deleted", "status_changed"], 
    required: true 
  },
  taskId: { type: String, ref: "Task", required: true },
  taskTitle: { type: String, required: true },
  projectId: { type: String, ref: "Project", required: true },
  user: { type: String, ref: "User", required: true },
  details: { 
    oldStatus: { type: String },
    newStatus: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TaskHistory", taskHistorySchema);
