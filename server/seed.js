const mongoose = require("mongoose");
require("dotenv").config();
const Permissions = require("./models/Permissions");

const seedData = [
  {
    module: "Tasks",
    rules: [
      { path: "/api/tasks/projects", method: "POST", requiredPermission: "task_add_project" },
      { path: "/api/tasks/projects", method: "DELETE", requiredPermission: "task_delete_project" },
      { path: "/api/tasks", method: "POST", requiredPermission: "task_add_task" },
      { path: "/api/tasks", method: "ALL", requiredPermission: "nav_tasks" },
    ],
  },
  {
    module: "Employees",
    rules: [
      { path: "/api/users", method: "ALL", requiredPermission: "nav_employees" },
      { path: "/api/user-photos", method: "ALL", requiredPermission: "nav_employees" },
      { path: "/api/permissions", method: "ALL", requiredPermission: "nav_settings" },
    ],
  },
  {
    module: "Payments",
    rules: [
      { path: "/api/payments", method: "ALL", requiredPermission: "nav_payments" },
    ],
  },
  {
    module: "Messenger",
    rules: [
      { path: "/api/messenger", method: "ALL", requiredPermission: "nav_messenger" },
    ],
  },
];

const seed = async () => {
  try {
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    // Eskilarini tozalash (to'liq yangilash uchun)
    await Permissions.deleteMany({});
    console.log("Eski permissionlar tozalandi.");

    // Yangi guruhlangan ma'lumotlarni qo'shish
    await Permissions.insertMany(seedData);
    console.log("Yangi guruhlangan permissionlar muvaffaqiyatli qo'shildi!");

    process.exit(0);
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    process.exit(1);
  }
};

seed();
