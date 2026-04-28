const mongoose = require("mongoose");
require("dotenv").config();
const Permissions = require("../../models/Permissions");
const Api = require("../../models/Api"); // API ID-larni olish

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    // 1. Bazadagi barcha API-larni yuklab olamiz
    const allApis = await Api.find({});
    console.log(`${allApis.length} ta API topildi.`);

    // 2. API-larni modullar bo'yicha guruhlandi
    const tasksApis = allApis.filter((a) => a.module === "Tasks").map((a) => a.apiId);
    const usersApis = allApis.filter((a) => a.module === "Users").map((a) => a.apiId);
    const filesApis = allApis.filter((a) => a.module === "Files").map((a) => a.apiId);
    const permsApis = allApis.filter((a) => a.module === "Permissions").map((a) => a.apiId);

    // 3. Permission malumotlar
    const seedData = [
      {
        module: "nav_tasks",
        apis: tasksApis,
      },
      {
        module: "nav_employees",
        apis: usersApis,
      },
      {
        module: "nav_messenger",
        apis: [],
      },
      {
        module: "nav_calendar",
        apis: [],
      },
      {
        module: "nav_payments",
        apis: [],
      },
      {
        module: "nav_vacations",
        apis: [],
      },
      {
        module: "user-photos",
        apis: filesApis,
      },
      {
        module: "nav_permissions",
        apis: permsApis,
      },
    ];

    // 4. Bazani tozalab, yangi ma'lumotlarni yozish
    await Permissions.deleteMany({});
    await Permissions.insertMany(seedData);

    console.log("Permission Seeder: muvaffaqiyatli yakunlandi! (apiId-lar bilan)");
    process.exit();
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

seedDB();
