const mongoose = require("mongoose");

const projectFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileData: {
    type: String, // Base64 kodlangan fayl
    required: true,
  },
  fileSize: {
    type: Number, // Baytlarda
    default: 0,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ProjectFile", projectFileSchema);
