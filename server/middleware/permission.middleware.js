const Permission = require("../models/Permission");
const PermissionsRegistry = require("../models/Permissions");
const Api = require("../models/Api");

// Super adminlar bypass
const SUPER_ADMIN_EMAILS = ["isroil@gmail.com", "admin@gmail.com", "test@gmail.com"];

const checkPermission = (manualPageKey = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const userEmail = req.user.email;

      if (!userId) {
        return res.status(401).json({ message: "Foydalanuvchi identifikatori topilmadi." });
      }

      if (SUPER_ADMIN_EMAILS.includes(userEmail)) return next();

      const currentUrl = req.originalUrl;
      if (currentUrl.includes(userId)) return next();

      let requiredModule = manualPageKey;

      if (!requiredModule) {
        const fullPath = req.originalUrl.split("?")[0].replace(/\/$/, "") || "/";
        const method = req.method;

        const allApis = await Api.find();
        const matchedApi = allApis.find(api => {
          return api.path === fullPath && (api.method === method || api.method === "ALL");
        });

        if (matchedApi) {
          const registry = await PermissionsRegistry.findOne({ apis: matchedApi.apiId });
          if (registry) requiredModule = registry.module;
        }
      }

      if (!requiredModule) return next();

      const userPermissions = await Permission.findOne({ userId });

      if (userPermissions && userPermissions.perms) {
        const perms = userPermissions.perms;
        let isAllowed = true;

        if (perms[requiredModule] && typeof perms[requiredModule] === "object" && "access" in perms[requiredModule]) {
          if (perms[requiredModule].access === false) isAllowed = false;
        } else if (perms[requiredModule] === false) {
          isAllowed = false;
        }

        if (!isAllowed) {
          return res.status(403).json({ message: "Ruxsat yo'q", errorCode: "FORBIDDEN" });
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
