const Permission = require("../models/Permission");

// Super adminlar uchun bypass (Emailingizni shu yerga qo'shing)
const SUPER_ADMIN_EMAILS = ["isroil@gmail.com", "admin@gmail.com", "test@gmail.com"];

const checkPermission = (requiredPage) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const userEmail = req.user.email;
      
      if (!userId) {
        return res.status(401).json({ message: "Foydalanuvchi identifikatori topilmadi." });
      }

      // 1. Super Admin bypass
      if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        return next();
      }

      const userPermissions = await Permission.findOne({ userId });

      // 2. Agar bazada ruxsatnoma topilmasa - Sukut bo'yicha ruxsat beramiz (True by default)
      if (!userPermissions || !userPermissions.perms) {
        return next();
      }

      // 3. Faqatgina bazada aniq 'false' qilib yopilgan bo'lsa - bloklaymiz
      if (userPermissions.perms[requiredPage] === false) {
        return res.status(403).json({ 
          message: `Sizda '${requiredPage}' sahifasiga kirish uchun ruxsat yo'q.` 
        });
      }

      // Qolgan barcha holatlarda (true bo'lsa yoki kalit yo'q bo'lsa) - ruxsat beramiz
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Ruxsatni tekshirishda xatolik", error: error.message });
    }
  };
};

module.exports = checkPermission;

