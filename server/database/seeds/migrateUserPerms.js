const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const Permission = require("../../models/Permission");
const NavItem = require("../../models/NavItem");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB ga ulandi...");

    const navItems = await NavItem.find({});
    const usersPerms = await Permission.find({});

    console.log(`${usersPerms.length} ta foydalanuvchi ruxsatnomalarini yangilash boshlandi...`);

    for (const userPerm of usersPerms) {
      const oldPerms = userPerm.perms;
      const newPerms = {};

      navItems.forEach((item) => {
        const oldSection = oldPerms[item.key] || { access: true, actions: [] };

        newPerms[item.key] = {
          access: oldSection.access !== false,
          id: item.id,
          actions: [],
        };

        if (newPerms[item.key].access) {
          newPerms[item.key].actions = item.actions.map((a) => a.id);
        }
      });

      userPerm.perms = newPerms;
      userPerm.markModified("perms");
      await userPerm.save();
    }

    console.log("Barcha foydalanuvchilar ruxsatnomalari yangi ID-larga muvaffaqiyatli o'tkazildi!");
    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

migrate();
