const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

// O'z ruxsatlarini olish ham hamma uchun ochiq (frontend ishlashi uchun)
router.get("/:userId", auth, permissionController.getPermissionsByUserId);

// Faqat ruxsatlarni o'zgartirish 'settings' huquqini talab qiladi
router.post("/:userId", auth, checkPermission(), permissionController.updatePermissions);


module.exports = router;


