const mongoose = require("mongoose");
require("dotenv").config();
const Api = require("../../models/Api");

const apisData = [
  // --- USERS ---
  { path: "/api/users/register", method: "POST", module: "Users", description: "Register new user" },
  { path: "/api/users/login", method: "POST", module: "Users", description: "User login" },
  { path: "/api/users/logout", method: "POST", module: "Users", description: "User logout" },
  { path: "/api/users/me", method: "GET", module: "Users", description: "Get current user profile" },
  { path: "/api/users", method: "GET", module: "Users", description: "Get all users list" },
  { path: "/api/users/:id", method: "GET", module: "Users", description: "Get user by ID" },
  { path: "/api/users/:id", method: "PUT", module: "Users", description: "Update user details" },
  { path: "/api/users/:id", method: "DELETE", module: "Users", description: "Delete user account" },

  // --- TASKS ---
  { path: "/api/tasks/projects", method: "GET", module: "Tasks", description: "Get list of projects" },
  { path: "/api/tasks/projects", method: "POST", module: "Tasks", description: "Create new project" },
  { path: "/api/tasks/projects/:id", method: "DELETE", module: "Tasks", description: "Remove project" },
  { path: "/api/tasks", method: "GET", module: "Tasks", description: "Get all tasks" },
  { path: "/api/tasks", method: "POST", module: "Tasks", description: "Create new task" },
  { path: "/api/tasks/:id", method: "PUT", module: "Tasks", description: "Edit task details" },
  { path: "/api/tasks/:id", method: "DELETE", module: "Tasks", description: "Delete task" },
  { path: "/api/tasks/:id/user-status", method: "PUT", module: "Tasks", description: "Update task status" },

  // --- FILES ---
  { path: "/api/user-photos/:userId", method: "GET", module: "Files", description: "Get user avatar image" },
  { path: "/api/user-photos/upload", method: "POST", module: "Files", description: "Upload new avatar" },
  { path: "/api/user-photos/:userId", method: "DELETE", module: "Files", description: "Remove user avatar" },

  // --- PERMISSIONS ---
  { path: "/api/permissions/:userId", method: "GET", module: "Permissions", description: "Get user permissions" },
  { path: "/api/permissions/:userId", method: "POST", module: "Permissions", description: "Save user permissions" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    await Api.deleteMany({});

    const formattedApis = apisData.map((item) => {
      const id = new mongoose.Types.ObjectId();
      return {
        _id: id,
        path: item.path,
        method: item.method,
        module: item.module,
        description: item.description,
        apiId: id.toString(),
      };
    });

    await Api.insertMany(formattedApis);

    console.log(`${formattedApis.length} ta API muvaffaqiyatli saqlandi!`);
    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

seed();
