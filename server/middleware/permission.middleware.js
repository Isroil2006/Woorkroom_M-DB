const Permission = require("../models/Permission");
const PermissionsRegistry = require("../models/Permissions");
const Api = require("../models/Api");
const NavItem = require("../models/NavItem");

let NAV_ITEMS_CACHE = null;

const getNavItems = async () => {
  if (NAV_ITEMS_CACHE) return NAV_ITEMS_CACHE;
  NAV_ITEMS_CACHE = await NavItem.find().lean();
  return NAV_ITEMS_CACHE;
};

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
      const navItems = await getNavItems();
      let isAllowed = true;

      // 1. requiredModule bo'limmi yoki ichki amalmi aniqlaymiz
      let targetNavItem = null;
      let parentSection = null;

      for (const item of navItems) {
        if (item.key === requiredModule) {
          targetNavItem = item;
          break;
        }
        const action = item.actions.find((a) => a.key === requiredModule);
        if (action) {
          targetNavItem = action;
          parentSection = item;
          break;
        }
      }

      if (targetNavItem) {
        if (parentSection) {
          // Bu ichki amal (action)
          const userSection = perms[parentSection.key];
          if (!userSection || userSection.access === false) {
            isAllowed = false;
          } else {
            // ID bo'yicha tekshiramiz
            isAllowed = Array.isArray(userSection.actions) && userSection.actions.includes(targetNavItem.id);
          }
        } else {
          // Bu asosiy bo'lim (section)
          const userSection = perms[targetNavItem.key];
          isAllowed = userSection && userSection.access !== false;
        }
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
