const Permission = require("../models/Permission");
const PermissionsRegistry = require("../models/Permissions"); //API mapping modeli

// Super adminlar bypass
const SUPER_ADMIN_EMAILS = ["isroil@gmail.com", "admin@gmail.com", "test@gmail.com"];

const checkPermission = (manualPageKey = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const userEmail = req.user.email;
      const baseUrl = req.baseUrl; // masalan: /api/tasks

      if (!userId) {
        return res.status(401).json({ message: "Foydalanuvchi identifikatori topilmadi." });
      }

      // 1. Super Admin bypass
      if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        return next();
      }

      // 2. Dinamik ruxsatnomani aniqlash
      let requiredPage = manualPageKey;
      if (!requiredPage) {
        const mapping = await PermissionsRegistry.findOne({ path: baseUrl });
        if (mapping) {
          requiredPage = mapping.requiredPermission;
        }
      }

      // Agar ruxsatnoma belgilanmagan bolsa otkazib yuboriladi
      if (!requiredPage) {
        return next();
      }

      const userPermissions = await Permission.findOne({ userId });

      // 3. Agar foydalanuvchida bu bolim false bolsa
      if (userPermissions && userPermissions.perms && userPermissions.perms[requiredPage] === false) {
        return res.status(403).json({
          message: "Ushbu bo'limga kirish ruxsati yo'q.",
          errorCode: "FORBIDDEN",
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Ruxsatni tekshirishda xatolik" });
    }
  };
};

module.exports = checkPermission;
