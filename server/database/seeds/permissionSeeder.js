const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const Permissions = require("../../models/Permissions");
const Api = require("../../models/Api");

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    // 1. Barcha API-larni yuklash
    const apis = await Api.find({});

    // API-larni guruhlash yordamchi funksiya
    const getApiId = (path, method) => {
      const found = apis.find((a) => a.path === path && a.method === method);
      return found ? found.apiId : null;
    };

    // 2. Yangi struktura bo'yicha ruxsatnomalar (Permissions)
    const seedData = [
      // --- TASKS MODULE SPLIT ---
      {
        module: "nav_tasks",
        apis: [getApiId("/api/tasks/projects", "GET"), getApiId("/api/tasks", "GET")].filter((id) => id),
      },
      {
        module: "task_add_project",
        apis: [getApiId("/api/tasks/projects", "POST")].filter((id) => id),
      },
      {
        module: "task_delete_project",
        apis: [getApiId("/api/tasks/projects/:id", "DELETE")].filter((id) => id),
      },
      {
        module: "task_add_task",
        apis: [getApiId("/api/tasks", "POST")].filter((id) => id),
      },
      {
        module: "task_edit_task",
        apis: [getApiId("/api/tasks/:id", "PUT")].filter((id) => id),
      },
      {
        module: "task_delete_task",
        apis: [getApiId("/api/tasks/:id", "DELETE")].filter((id) => id),
      },
      {
        module: "task_update_status",
        apis: [getApiId("/api/tasks/:id/user-status", "PUT")].filter((id) => id),
      },

      // --- EMPLOYEES / USERS ---
      {
        module: "nav_employees",
        apis: [getApiId("/api/users", "GET"), getApiId("/api/users/:id", "GET")].filter((id) => id),
      },
      {
        module: "emp_edit_btn",
        apis: [getApiId("/api/users/:id", "PUT")].filter((id) => id),
      },
      {
        module: "emp_delete_btn",
        apis: [getApiId("/api/users/:id", "DELETE")].filter((id) => id),
      },

      // --- PHOTOS / FILES ---
      {
        module: "user-photos",
        apis: [getApiId("/api/user-photos/:userId", "GET"), getApiId("/api/user-photos/upload", "POST"), getApiId("/api/user-photos/:userId", "DELETE")].filter((id) => id),
      },

      // --- PERMISSIONS ---
      {
        module: "nav_permissions",
        apis: [getApiId("/api/permissions/:userId", "GET"), getApiId("/api/permissions/:userId", "POST")].filter((id) => id),
      },
    ];

    // 3. Bazani yangilash
    await Permissions.deleteMany({});
    await Permissions.insertMany(seedData);

    console.log("Permission Seeder: Arxitektura granular holatga keltirildi!");
    process.exit();
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

seedDB();
