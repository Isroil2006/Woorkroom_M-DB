const mongoose = require("mongoose");

const userTestHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test" // May not exist if deleted, but kept for reference
  },
  testSnapshot: {
    title: { type: String, required: true },
    description: { type: String },
    questionCount: { type: Number, default: 0 }
  },
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  percent: {
    type: Number,
    required: true
  },
  correctCount: {
    type: Number,
    default: 0
  },
  timeSpentFormatted: String,
  grade: String,
  questionsData: mongoose.Schema.Types.Mixed,
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model("UserTestHistory", userTestHistorySchema);
