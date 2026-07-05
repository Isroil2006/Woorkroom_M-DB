const User = require("../models/User");
const UserPhoto = require("../models/UserPhoto");
const Permission = require("../models/Permission");
const NavItem = require("../models/NavItem");
const PaymentMethod = require("../models/PaymentMethod");

const jwt = require("jsonwebtoken");

// JWT Secret fallback
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only";

// Register
exports.register = async (req, res) => {
  try {
    const { userId, username, tel, email, password, gender, position, level, age } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Bu email band!" });
    }

    const newUser = new User({
      userId,
      username,
      tel: tel || "000000000", // Telefon raqami bo'sh bo'lsa default qiymat
      email,
      password: password || "123456", // Parol bo'sh bo'lsa default qiymat
      gender,
      position,
      level,
      age,
    });

    await newUser.save();

    // Foydalanuvchi uchun default ruxsatnomalar yaratish (Dinamik yangi struktura)
    const navItems = await NavItem.find({});
    const permsObject = {};
    navItems.forEach((item) => {
      permsObject[item.key] = {
        access: true,
        id: item.id,
        actions: item.actions.map((a) => a.id),
      };
    });

    const defaultPerms = new Permission({
      userId: newUser.userId || newUser._id.toString(),
      perms: permsObject,
    });
    await defaultPerms.save();

    // Foydalanuvchi uchun default bank hisob yaratish ($10,000 boshlang'ich balans)
    const userIdStr = newUser.userId || newUser._id.toString();
    const BANK_CODE = "2020";
    const userIdPart = String(userIdStr).padStart(6, "0").slice(-6);
    const randomPart = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
    const accountNumber = BANK_CODE + userIdPart + randomPart;
    const displayAccNum = accountNumber.replace(/(.{4})/g, "$1 ").trim();

    const defaultMethod = new PaymentMethod({
      userId: userIdStr,
      type: "bank",
      number: accountNumber,
      displayNumber: displayAccNum,
      holder: newUser.username,
      bank: "Bank Hisobi",
      balance: 10000,
      isDefault: true,
    });
    await defaultMethod.save();

    // Return user without password
    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json(userObj);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Ro'yxatdan o'tishda xatolik yuz berdi",
      error: error.message,
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Email yoki parol noto'g'ri" });
    }

    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      // JWT token yaratish
      const token = jwt.sign({ id: user._id, userId: user.userId, email: user.email }, JWT_SECRET, { expiresIn: "24h" });

      // Kukini o'rnatish
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000, // 24 soat
      });

      // User ma'lumotlarini password'siz qaytarish
      const userObj = user.toObject();
      delete userObj.password;

      res.status(200).json({
        user: userObj,
        token: token,
      });
    } else {
      res.status(401).json({ message: "Email yoki parol noto'g'ri" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Tizimga kirishda xatolik yuz berdi",
      error: error.message,
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  res.status(200).json({ message: "Tizimdan chiqildi" });
};

// Get current user from token
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi!" });
    }

    const userObj = user.toObject();
    const photo = await UserPhoto.findOne({ userId: userObj.userId || userObj._id });
    if (photo) {
      userObj.avatar = `/api/user-photos/${userObj.userId || userObj._id}`;
    } else {
      userObj.avatar = "/assets/images/User-avatar.png";
    }

    res.status(200).json(userObj);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get All Users (for Employees page)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params; // Document ID OR userId
    // Try searching by Object ID or custom userId
    let user;
    if (id.length === 24) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ userId: id });
    }

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi!" });
    }

    const updateData = { ...req.body };
    // Don't try to change userId if it's the same or if it might cause issues
    if (updateData.userId === user.userId) {
      delete updateData.userId;
    }

    Object.assign(user, updateData);
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      message: "Foydalanuvchini yangilashda xatolik yuz berdi",
      error: error.message,
    });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    if (id.length === 24) {
      user = await User.findByIdAndDelete(id);
    }
    if (!user) {
      user = await User.findOneAndDelete({ userId: id });
    }

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi!" });
    }
    res.status(200).json({ message: "O'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get Single User
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    if (id.length === 24) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ userId: id });
    }

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi!" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};
// Search Users (for adding to projects)
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
    .limit(10)
    .select("username email userId avatar");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Qidiruvda xatolik", error: error.message });
  }
};

// Get Users with Pagination and Search for Assignment
exports.getUsersForAssign = async (req, res) => {
  try {
    const { query, page = 1, limit = 5 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let dbQuery = {};
    if (query && query.length >= 2) {
      dbQuery = {
        $or: [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ]
      };
    }

    const users = await User.find(dbQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .select("username email userId avatar");

    const total = await User.countDocuments(dbQuery);

    res.status(200).json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};
