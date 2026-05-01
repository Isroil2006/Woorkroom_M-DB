const Permission = require("../models/Permission");
const PermissionsRegistry = require("../models/Permissions");
const Api = require("../models/Api");

// Super adminlar bypass
const SUPER_ADMIN_EMAILS = ["isroil@gmail.com", "admin@gmail.com", "test@gmail.com"];

/**
 * Express-style pathni regexga o'tkazish
 * Masalan: /api/tasks/:id -> ^\/api\/tasks\/[^/]+$
 */
const pathToRegex = (path) => {
  const pattern = path
    .replace(/\//g, "\\/") // Slashlarni escape qilish
    .replace(/:[^\/]+/g, "([^\\/]+)"); // :id kabi parametrlarni regex guruhiga aylantirish
  return new RegExp(`^${pattern}$`);
};

const checkPermission = (manualPageKey = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const userEmail = req.user?.email;

      if (!userId) {
        return res.status(401).json({ message: "Foydalanuvchi identifikatori topilmadi." });
      }

      // 1. Super adminlar hamma narsaga ruxsat
      if (SUPER_ADMIN_EMAILS.includes(userEmail)) return next();

      // 2. O'ziga tegishli URL bo'lsa ruxsat (masalan profile yoki o'z rasmi)
      const currentUrl = req.originalUrl.split("?")[0];
      if (currentUrl.includes(userId)) return next();

      let requiredModule = manualPageKey;

      // 3. Agar modul qo'lda berilmagan bo'lsa, API Registrydan qidiramiz
      if (!requiredModule) {
        const method = req.method;
        const fullPath = currentUrl.replace(/\/$/, "") || "/";

        const allApis = await Api.find().lean();
        const matchedApi = allApis.find((api) => {
          const apiRegex = pathToRegex(api.path);
          return apiRegex.test(fullPath) && (api.method === method || api.method === "ALL");
        });

        if (matchedApi) {
          // PermissionsRegistry (permissions collection) dan modulni topamiz
          const registry = await PermissionsRegistry.findOne({ apis: matchedApi.apiId }).lean();
          if (registry) {
            requiredModule = registry.module;
          } else {
            // Agar registryda yo'q bo'lsa, Api modelidagi modulni ishlatishimiz mumkin
            requiredModule = matchedApi.module;
          }
        }
      }

      // 4. Agar modul aniqlanmasa, hozircha o'tkazib yuboramiz (fail-open)
      // Kelajakda buni return res.status(403) qilish xavfsizroq
      if (!requiredModule) return next();

      // 5. Foydalanuvchi ruxsatlarini tekshirish
      const userPermissions = await Permission.findOne({ userId }).lean();

      if (!userPermissions || !userPermissions.perms) {
        return res.status(403).json({ message: "Sizda ruxsatnomalar o'rnatilmagan", errorCode: "NO_PERMISSIONS" });
      }

      const perms = userPermissions.perms;
      let isAllowed = true;

      // Frontend logicasi bilan bir xil tekshirish
      // 1. To'g'ridan-to'g'ri modulni tekshirish (masalan: nav_tasks)
      if (perms[requiredModule] !== undefined) {
        if (typeof perms[requiredModule] === "object" && "access" in perms[requiredModule]) {
          if (perms[requiredModule].access === false) isAllowed = false;
        } else if (perms[requiredModule] === false) {
          isAllowed = false;
        }
      } else {
        // 2. Ichki harakatlarni tekshirish (masalan: task_add_task)
        let foundAction = false;
        for (const parentKey in perms) {
          const parent = perms[parentKey];
          if (parent && typeof parent === "object" && parent.actions && requiredModule in parent.actions) {
            foundAction = true;
            // Agar asosiy bo'lim yopiq bo'lsa, ichki harakat ham yopiq
            if (parent.access === false) {
              isAllowed = false;
            } else {
              isAllowed = parent.actions[requiredModule] !== false;
            }
            break;
          }
        }
        
        // Agar na modul, na action topilmasa, default true qoladi (fail-open)
        // Lekin xavfsizlik uchun buni ham o'ylab ko'rish kerak
      }

      if (!isAllowed) {
        return res.status(403).json({ 
          message: `Sizda ushbu amal uchun ruxsat yo'q (${requiredModule})`, 
          errorCode: "FORBIDDEN" 
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
