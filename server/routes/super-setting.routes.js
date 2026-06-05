const express = require("express");
const router = express.Router();
const superSettingController = require("../controllers/super-setting.controller");
const auth = require("../middleware/auth.middleware");

// Tizimdagi xavfsizlik: Bu route-larga faqat adminlar kira oladigan qilib sozlash mumkin
// Hozircha faqat auth tekshiramiz. Agar alohida admin logikangiz bo'lsa `checkPermission` kabi yoziladi.
const superAdminCheck = (req, res, next) => {
  const SUPER_ADMIN_EMAILS = ["isroil@gmail.com", "admin@gmail.com", "test@gmail.com"];
  if (!SUPER_ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: "Sizda super admin huquqi yo'q!" });
  }
  next();
};

// NavItems (Modules & Actions)
router.get("/nav-items", auth, superAdminCheck, superSettingController.getNavItems);
router.post("/nav-items", auth, superAdminCheck, superSettingController.createNavItem);
router.put("/nav-items/:id", auth, superAdminCheck, superSettingController.updateNavItem);
router.delete("/nav-items/:id", auth, superAdminCheck, superSettingController.deleteNavItem);

// APIs
router.get("/apis", auth, superAdminCheck, superSettingController.getApis);
router.post("/apis", auth, superAdminCheck, superSettingController.createApi);
router.put("/apis/:id", auth, superAdminCheck, superSettingController.updateApi);
router.delete("/apis/:id", auth, superAdminCheck, superSettingController.deleteApi);

module.exports = router;
