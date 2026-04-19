const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Register
exports.register = async (req, res) => {
  try {
    const {
      userId,
      username,
      tel,
      email,
      password,
      gender,
      position,
      level,
      age,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Bu email band!" });
    }

    const newUser = new User({
      userId,
      username,
      tel,
      email,
      password,
      gender,
      position,
      level,
      age,
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
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
      const token = jwt.sign(
        { id: user._id, userId: user.userId, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // User ma'lumotlarini password'siz qaytarish
      const userObj = user.toObject();
      delete userObj.password;

      res.status(200).json({ token, user: userObj });
    } else {
      res.status(401).json({ message: "Email yoki parol noto'g'ri" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get current user from token
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi!" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get All Users (for Employees page)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
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
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
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
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};
