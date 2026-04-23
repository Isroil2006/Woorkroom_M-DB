const mongoose = require("mongoose");
require("dotenv").config();
const app = require("./app");

const Permissions = require("./models/Permissions");

const seedInitialPermissions = async () => {
  try {
    const count = await Permissions.countDocuments();
    if (count === 0) {
      console.log("Permissions (API xaritasi) bo'sh. Avtomatik to'ldirilmoqda...");
    const initialMappings = [
      // API yo'llari
      { path: "/api/tasks", requiredPermission: "tasks" },
      { path: "/api/users", requiredPermission: "employees" },
      { path: "/api/user-photos", requiredPermission: "employees" },
      { path: "/api/permissions", requiredPermission: "settings" },
      
      // Frontend Sahifa yo'llari (Window location uchun)
      { path: "/employees", requiredPermission: "employees" },
      { path: "/tasks", requiredPermission: "tasks" },
      { path: "/payments", requiredPermission: "nav_business" },
      { path: "/vacations", requiredPermission: "nav_vacations" },
      { path: "/messenger", requiredPermission: "nav_messenger" },
      { path: "/calendar", requiredPermission: "nav_infoportal" }
    ];

    // Har birini bazaga yozamiz (bor bo'lsa yangilaymiz)
    for (const mapping of initialMappings) {
      await Permissions.findOneAndUpdate(
        { path: mapping.path },
        { requiredPermission: mapping.requiredPermission },
        { upsert: true }
      );
    }
    console.log("Permissions xaritasi yangilandi.");

    }
  } catch (error) {
    console.error("Auto-seed xatoligi:", error);
  }
};

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB ga muvaffaqiyatli ulandi");
    await seedInitialPermissions();
  })

  .catch((err) => {
    console.error("MongoDB ga ulanishda xatolik!");
    console.error("Error Message:", err.message);
  });

// Start Server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi`);
  });
}

module.exports = app;
