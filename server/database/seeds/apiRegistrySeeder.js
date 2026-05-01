const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const Api = require("../../models/Api");

// Statik ID-lar ro'yxati (Ular hech qachon o'zgarmaydi)
const apisData = [
  // --- USERS ---
  { _id: "69f2361f9f5e7709d05e7c01", path: "/api/users/register", method: "POST", module: "Users", description: "Register new user" },
  { _id: "69f2361f9f5e7709d05e7c02", path: "/api/users/login", method: "POST", module: "Users", description: "User login" },
  { _id: "69f2361f9f5e7709d05e7c03", path: "/api/users/logout", method: "POST", module: "Users", description: "User logout" },
  { _id: "69f2361f9f5e7709d05e7c04", path: "/api/users/me", method: "GET", module: "Users", description: "Get current user profile" },
  { _id: "69f2361f9f5e7709d05e7c05", path: "/api/users", method: "GET", module: "Users", description: "Get all users list" },
  { _id: "69f2361f9f5e7709d05e7c06", path: "/api/users/:id", method: "GET", module: "Users", description: "Get user by ID" },
  { _id: "69f2361f9f5e7709d05e7c07", path: "/api/users/:id", method: "PUT", module: "Users", description: "Update user details" },
  { _id: "69f2361f9f5e7709d05e7c08", path: "/api/users/:id", method: "DELETE", module: "Users", description: "Delete user account" },

  // --- TASKS ---
  { _id: "69f2361f9f5e7709d05e7c11", path: "/api/tasks/projects", method: "GET", module: "Tasks", description: "Get list of projects" },
  { _id: "69f2361f9f5e7709d05e7c12", path: "/api/tasks/projects", method: "POST", module: "Tasks", description: "Create new project" },
  { _id: "69f2361f9f5e7709d05e7c13", path: "/api/tasks/projects/:id", method: "DELETE", module: "Tasks", description: "Remove project" },
  { _id: "69f2361f9f5e7709d05e7c14", path: "/api/tasks", method: "GET", module: "Tasks", description: "Get all tasks" },
  { _id: "69f2361f9f5e7709d05e7c15", path: "/api/tasks", method: "POST", module: "Tasks", description: "Create new task" },
  { _id: "69f2361f9f5e7709d05e7c16", path: "/api/tasks/:id", method: "PUT", module: "Tasks", description: "Edit task details" },
  { _id: "69f2361f9f5e7709d05e7c17", path: "/api/tasks/:id", method: "DELETE", module: "Tasks", description: "Delete task" },
  { _id: "69f2361f9f5e7709d05e7c18", path: "/api/tasks/:id/user-status", method: "PUT", module: "Tasks", description: "Update task status" },

  // --- FILES ---
  { _id: "69f2361f9f5e7709d05e7c21", path: "/api/user-photos/:userId", method: "GET", module: "Files", description: "Get user avatar image" },
  { _id: "69f2361f9f5e7709d05e7c22", path: "/api/user-photos/upload", method: "POST", module: "Files", description: "Upload new avatar" },
  { _id: "69f2361f9f5e7709d05e7c23", path: "/api/user-photos/:userId", method: "DELETE", module: "Files", description: "Remove user avatar" },

  // --- PERMISSIONS ---
  { _id: "69f2361f9f5e7709d05e7c31", path: "/api/permissions/:userId", method: "GET", module: "Permissions", description: "Get user permissions" },
  { _id: "69f2361f9f5e7709d05e7c32", path: "/api/permissions/:userId", method: "POST", module: "Permissions", description: "Save user permissions" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    await Api.deleteMany({});

    const formattedApis = apisData.map((item) => ({
      _id: item._id,
      path: item.path,
      method: item.method,
      module: item.module,
      description: item.description,
      apiId: item._id, // apiId endi har doim _id bilan bir xil bo'ladi
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
