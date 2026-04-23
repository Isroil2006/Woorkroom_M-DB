const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    // 1. Birinchi bo'lib kukidan qidiramiz
    let token = req.cookies.token;

    // 2. Agar kukida yo'q bolsa authorization headeridan qidiramiz
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Token topilmadi. Iltimos, login qiling." });
    }

    const secret = process.env.JWT_SECRET || "fallback_secret_for_dev_only";
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token yaroqsiz yoki muddati tugagan." });
  }
};

module.exports = auth;
