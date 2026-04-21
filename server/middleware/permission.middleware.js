const Permission = require("../models/Permission");

const checkPermission = (requiredPage) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Foydalanuvchi identifikatori topilmadi." });
      }

      const userPermissions = await Permission.findOne({ userId });

      if (!userPermissions || !userPermissions.perms || !userPermissions.perms[requiredPage]) {
        return res.status(403).json({ 
          message: `Sizda '${requiredPage}' sahifasiga kirish uchun ruxsat yo'q.` 
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Ruxsatni tekshirishda xatolik", error: error.message });
    }
  };
};

module.exports = checkPermission;
