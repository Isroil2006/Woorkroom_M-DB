const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const Api = require("../../models/Api");

// 6 xonali SONLI ID-lar (Tirnoqlarsiz)
const apisData = [
  // --- USERS (100...) ---
  { _id: 100001, path: "/api/users/register", method: "POST", module: "Users", description: "Register new user" },
  { _id: 100002, path: "/api/users/login", method: "POST", module: "Users", description: "User login" },
  { _id: 100003, path: "/api/users/logout", method: "POST", module: "Users", description: "User logout" },
  { _id: 100004, path: "/api/users/me", method: "GET", module: "Users", description: "Get current user profile" },
  { _id: 100005, path: "/api/users", method: "GET", module: "Users", description: "Get all users list" },
  { _id: 100006, path: "/api/users/:id", method: "GET", module: "Users", description: "Get user by ID" },
  { _id: 100007, path: "/api/users/:id", method: "PUT", module: "Users", description: "Update user details" },
  { _id: 100008, path: "/api/users/:id", method: "DELETE", module: "Users", description: "Delete user account" },

  // --- TASKS (200...) ---
  { _id: 200001, path: "/api/tasks/projects", method: "GET", module: "Tasks", description: "Get list of projects" },
  { _id: 200002, path: "/api/tasks/projects", method: "POST", module: "Tasks", description: "Create new project" },
  { _id: 200003, path: "/api/tasks/projects/:id", method: "DELETE", module: "Tasks", description: "Remove project" },
  { _id: 200004, path: "/api/tasks", method: "GET", module: "Tasks", description: "Get all tasks" },
  { _id: 200005, path: "/api/tasks", method: "POST", module: "Tasks", description: "Create new task" },
  { _id: 200006, path: "/api/tasks/:id", method: "PUT", module: "Tasks", description: "Edit task details" },
  { _id: 200007, path: "/api/tasks/:id", method: "DELETE", module: "Tasks", description: "Delete task" },
  { _id: 200008, path: "/api/tasks/:id/user-status", method: "PUT", module: "Tasks", description: "Update task status" },

  // --- FILES (300...) ---
  { _id: 300001, path: "/api/user-photos/:userId", method: "GET", module: "Files", description: "Get user avatar image" },
  { _id: 300002, path: "/api/user-photos/upload", method: "POST", module: "Files", description: "Upload new avatar" },
  { _id: 300003, path: "/api/user-photos/:userId", method: "DELETE", module: "Files", description: "Remove user avatar" },

  // --- PERMISSIONS (400...) ---
  { _id: 400001, path: "/api/permissions/:userId", method: "GET", module: "Permissions", description: "Get user permissions" },
  { _id: 400002, path: "/api/permissions/:userId", method: "POST", module: "Permissions", description: "Save user permissions" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    await Api.deleteMany({});

    const formattedApis = apisData.map((item) => ({
      _id: item._id, // Endi bu Number
      path: item.path,
      method: item.method,
      module: item.module,
      description: item.description,
      apiId: item._id, 
    }));

    await Api.insertMany(formattedApis);

    console.log(`${formattedApis.length} ta API muvaffaqiyatli saqlandi!`);
    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

seed();
