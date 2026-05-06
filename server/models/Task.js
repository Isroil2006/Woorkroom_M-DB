const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [3, 'Vazifa nomi kamida 3 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [20, 'Vazifa nomi 20 ta belgidan oshmasligi kerak']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Tavsif 1000 ta belgidan oshmasligi kerak']
  },
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
