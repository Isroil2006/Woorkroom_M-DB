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

      // 1.1 O'z ma'lumotlarini ko'rish (Self-access bypass)
      // Agar URL ichida foydalanuvchining o'z ID-si bo'lsa, ruxsat beramiz
      const currentUrl = req.originalUrl;
      if (currentUrl.includes(userId)) {
        return next();
      }

      // 2. Dinamik ruxsatnomani aniqlash
      let requiredPage = manualPageKey;
      if (!requiredPage) {
        const fullPath = req.originalUrl.split("?")[0].replace(/\/$/, "") || "/";
        const method = req.method;

        // Barcha modullarni va ularning ichidagi qoidalarni tekshiramiz
        const modules = await PermissionsRegistry.find();
        let bestMatch = null;

        for (const mod of modules) {
          for (const rule of mod.rules) {
            const isPathMatch = rule.path === fullPath || rule.path === baseUrl;
            const isMethodMatch = rule.method === method || rule.method === "ALL";

            if (isPathMatch && isMethodMatch) {
              // Eng aniq moslikni aniqlaymiz (Specific path birinchi, keyin specific method)
              if (!bestMatch || rule.path.length > bestMatch.path.length || (rule.method !== "ALL" && bestMatch.method === "ALL")) {
                bestMatch = rule;
              }
            }
          }
        }

        if (bestMatch) {
          requiredPage = bestMatch.requiredPermission;
        }
      }

      // ruxsatnoma belgilanmagan bolsa otkazib yuboriladi
      if (!requiredPage) {
        return next();
      }

      const userPermissions = await Permission.findOne({ userId });

      // 3. foydalanuvchida bu bolim false bolsa
      if (userPermissions && userPermissions.perms) {
        const perms = userPermissions.perms;
        let isAllowed = true;

        // 3.1 Top-level access check
        if (perms[requiredPage] && typeof perms[requiredPage] === "object" && "access" in perms[requiredPage]) {
          if (perms[requiredPage].access === false) isAllowed = false;
        }
        // 3.2 Action-level access check
        else {
          for (const parentKey in perms) {
            const parent = perms[parentKey];
            if (parent.actions && requiredPage in parent.actions) {
              // If parent is blocked, all its actions are blocked
              if (parent.access === false || parent.actions[requiredPage] === false) {
                isAllowed = false;
              }
              break;
            }
          }
        }

        // 3.3 Old flat format fallback (for safety)
        if (isAllowed && typeof perms[requiredPage] === "boolean" && perms[requiredPage] === false) {
          isAllowed = false;
        }

        if (!isAllowed) {
          return res.status(403).json({
            message: "Ushbu bo'limga kirish ruxsati yo'q.",
            errorCode: "FORBIDDEN",
          });
        }
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Ruxsatni tekshirishda xatolik" });
    }
  };
};

module.exports = checkPermission;
