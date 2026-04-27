const User = require("../models/User");
const UserPhoto = require("../models/UserPhoto");
const Permission = require("../models/Permission");

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

    // Foydalanuvchi uchun default ruxsatnomalar yaratish
    const defaultPerms = new Permission({
      userId: newUser.userId || newUser._id.toString(),
      perms: {
        nav_dashboard: { access: true },
        nav_payments: { access: true },
        nav_tasks: {
          access: true,
          actions: {
            task_add_project: true,
            task_add_task: true,
            task_delete_project: true,
          },
        },
        nav_vacations: {
          access: true,
          actions: {
            vac_add_tour: true,
            vac_edit_tour: true,
            vac_delete_tour: true,
          },
        },
        nav_employees: {
          access: true,
          actions: {
            emp_perm_btn: true,
            emp_edit_btn: true,
            emp_delete_btn: true,
          },
        },
        nav_messenger: { access: true },
        nav_infoportal: { access: true },
        nav_settings: { access: true },
      },
    });
    await defaultPerms.save();

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
        maxAge: 24 * 60 * 60 * 1000, // 24 soat
      });

      // User ma'lumotlarini password'siz qaytarish
      const userObj = user.toObject();
      delete userObj.password;

      // Avatar'ni yuklash (agar bo'lsa)
      const photo = await UserPhoto.findOne({ userId: userObj.userId || userObj._id });
      if (photo) {
        userObj.avatar = photo.fileData;
      }

      res.status(200).json({ user: userObj });
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
  res.clearCookie("token");
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
      userObj.avatar = photo.fileData;
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
