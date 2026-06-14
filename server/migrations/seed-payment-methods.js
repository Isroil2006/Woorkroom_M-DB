/**
 * Mavjud foydalanuvchilar uchun default bank hisob yaratish migratsiyasi.
 * Har bir userga tekshiradi — agar PaymentMethod yo'q bo'lsa, 
 * $10,000 balansli "Woorkroom Bank" hisob yaratadi.
 * Bu skript bir marta ishlatilishi kerak: node server/migrations/seed-payment-methods.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const PaymentMethod = require("../models/PaymentMethod");

const MONGODB_URI = process.env.MONGODB_URI;

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");

    const users = await User.find({});
    console.log(`📦 ${users.length} ta foydalanuvchi topildi`);

    let created = 0;
    for (const user of users) {
      const uid = user.userId || user._id.toString();
      const existing = await PaymentMethod.findOne({ userId: uid });
      if (existing) {
        console.log(`   ⏭️  ${user.username} — allaqachon hisob mavjud`);
        continue;
      }

      const BANK_CODE = "2020";
      const userIdPart = String(uid).padStart(6, "0").slice(-6);
      const randomPart = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
      const accountNumber = BANK_CODE + userIdPart + randomPart;
      const displayAccNum = accountNumber.replace(/(.{4})/g, "$1 ").trim();

      await PaymentMethod.create({
        userId: uid,
        type: "bank",
        number: accountNumber,
        displayNumber: displayAccNum,
        holder: user.username,
        bank: "Woorkroom Bank",
        balance: 10000,
        isDefault: true,
      });

      console.log(`   ✅ ${user.username} — default bank hisob yaratildi ($10,000)`);
      created++;
    }

    console.log(`\n🎉 Tayyor! ${created} ta yangi hisob yaratildi.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Xatolik:", err);
    process.exit(1);
  }
};

run();
