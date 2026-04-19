const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const auth = require("../middleware/auth.middleware");

// Public routes (auth kerak emas)
router.post("/register", userController.register);
router.post("/login", userController.login);

// Protected routes (auth kerak)
router.get("/me", auth, userController.getMe);
router.get("/", auth, userController.getAllUsers);
router.get("/:id", auth, userController.getUserById);
router.put("/:id", auth, userController.updateUser);
router.delete("/:id", auth, userController.deleteUser);

module.exports = router;
