const mongoose = require("mongoose");
require("dotenv").config();
const Api = require("../models/Api");

const apisList = [
  // Users Module
  { _id: 101, path: "/api/users/register", method: "POST", module: "users", description: "Yangi foydalanuvchini ro'yxatdan o'tkazish" },
  { _id: 102, path: "/api/users/login", method: "POST", module: "users", description: "Tizimga kirish" },
  { _id: 103, path: "/api/users/logout", method: "POST", module: "users", description: "Tizimdan chiqish" },
  { _id: 104, path: "/api/users/me", method: "GET", module: "users", description: "Hozirgi foydalanuvchi ma'lumotlarini olish" },
  { _id: 105, path: "/api/users/search", method: "GET", module: "users", description: "Foydalanuvchilarni qidirish" },
  { _id: 106, path: "/api/users", method: "GET", module: "users", description: "Barcha foydalanuvchilarni olish" },
  { _id: 107, path: "/api/users/:id", method: "GET", module: "users", description: "Foydalanuvchini ID orqali olish" },
  { _id: 108, path: "/api/users/:id", method: "PUT", module: "users", description: "Foydalanuvchini tahrirlash" },
  { _id: 109, path: "/api/users/:id", method: "DELETE", module: "users", description: "Foydalanuvchini o'chirish" },

  // Tasks & Projects Module
  { _id: 201, path: "/api/tasks/projects", method: "GET", module: "tasks", description: "Loyihalar ro'yxatini olish" },
  { _id: 202, path: "/api/tasks/projects", method: "POST", module: "tasks", description: "Yangi loyiha yaratish" },
  { _id: 203, path: "/api/tasks/projects/:id", method: "PUT", module: "tasks", description: "Loyihani tahrirlash" },
  { _id: 204, path: "/api/tasks/projects/:projectId/history", method: "GET", module: "tasks", description: "Loyiha tarixini olish" },
  { _id: 205, path: "/api/tasks/projects/:id", method: "DELETE", module: "tasks", description: "Loyihani o'chirish" },
  { _id: 206, path: "/api/tasks/all", method: "GET", module: "tasks", description: "Barcha vazifalarni olish" },
  { _id: 207, path: "/api/tasks", method: "GET", module: "tasks", description: "Vazifalarni filtrlash orqali olish" },
  { _id: 208, path: "/api/tasks", method: "POST", module: "tasks", description: "Yangi vazifa yaratish" },
  { _id: 209, path: "/api/tasks/:id", method: "PUT", module: "tasks", description: "Vazifani tahrirlash" },
  { _id: 210, path: "/api/tasks/:id", method: "DELETE", module: "tasks", description: "Vazifani o'chirish" },
  { _id: 211, path: "/api/tasks/:id/history", method: "GET", module: "tasks", description: "Vazifa tarixini olish" },
  { _id: 212, path: "/api/tasks/:id/toggle-user-done", method: "PATCH", module: "tasks", description: "Foydalanuvchi bajarilganini belgilash" },
  { _id: 213, path: "/api/tasks/:id/status", method: "PATCH", module: "tasks", description: "Vazifa holatini o'zgartirish" },

  // Permissions Module
  { _id: 301, path: "/api/permissions/nav-items", method: "GET", module: "permissions", description: "Navigatsiya elementlarini olish" },
  { _id: 302, path: "/api/permissions/:userId", method: "GET", module: "permissions", description: "Foydalanuvchi huquqlarini olish" },
  { _id: 303, path: "/api/permissions/:userId", method: "POST", module: "permissions", description: "Foydalanuvchi huquqlarini yangilash" },

  // Files Module
  { _id: 401, path: "/api/user-photos/:userId", method: "GET", module: "files", description: "Foydalanuvchi rasmini olish" },
  { _id: 402, path: "/api/user-photos/upload", method: "POST", module: "files", description: "Rasm yuklash" },
  { _id: 403, path: "/api/user-photos/:userId", method: "DELETE", module: "files", description: "Rasmni o'chirish" },
];

const seedApis = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB-ga ulandi, seeder boshlandi...");

    await Api.deleteMany({});
    console.log("Eski APIlar o'chirildi.");

    await Api.insertMany(apisList);
    console.log("Yangi APIlar muvaffaqiyatli saqlandi!");
    
    mongoose.disconnect();
    console.log("Tugatildi. MongoDB bilan aloqa uzildi.");
    process.exit(0);
  } catch (error) {
    console.error("Xatolik yuz berdi: ", error);
    process.exit(1);
  }
};

seedApis();
