const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ["single", "multiple", "true-false"], default: "single" },
  score: { type: Number, default: 1 },
  penalty: { type: Number, default: 0 },
  answers: [answerSchema]
});

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  
  // Vaqt sozlamalari
  hasTimeLimit: { type: Boolean, default: false },
  timeHours: { type: Number, default: 0 },
  timeMinutes: { type: Number, default: 0 },

  // Baholash
  scoringType: { type: String, enum: ["standard", "complex"], default: "standard" },

  // Kirish huquqlari
  accessType: { type: String, enum: ["public", "password", "id"], default: "public" },
  password: { type: String, default: "" },
  accessId: { type: String, default: "" },

  // Amal qilish muddati va biriktirilgan foydalanuvchilar
  validFrom: { type: Date, default: null },
  validUntil: { type: Date, default: null },
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Boshqa sozlamalar
  shuffleQuestions: { type: Boolean, default: false }, // foydalanuvchi so'ragan xususiyat
  shuffleAnswers: { type: Boolean, default: false },

  // Holat
  status: { type: String, enum: ["draft", "active"], default: "draft" },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  questions: [questionSchema]
}, { timestamps: true });

module.exports = mongoose.model("Test", testSchema);
