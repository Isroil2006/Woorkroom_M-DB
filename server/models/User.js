const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true },
    tel: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, default: "" }, // Jins
    position: { type: String, default: "" }, // ish holati
    level: { type: String, default: "" }, // daraja (junior, middle, senior)
    age: { type: Number, default: null },
  },
  { timestamps: true },
);

// Hash password and set userId
userSchema.pre("save", async function () {
  // 1. Set userId if missing
  if (!this.userId) {
    this.userId = this._id.toString();
  }

  // 2. Hash password if modified
  if (!this.isModified("password")) return;

  if (typeof this.password !== "string" || this.password.length === 0) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    console.error("Save hook error:", err);
    throw err;
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
