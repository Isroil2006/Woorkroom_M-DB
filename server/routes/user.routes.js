const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

// Public routes (auth kerak emas)
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", userController.logout);


// Protected routes (auth kerak)
router.get("/me", auth, userController.getMe);
router.get("/", auth, checkPermission(), userController.getAllUsers);
router.get("/:id", auth, checkPermission(), userController.getUserById);
router.put("/:id", auth, checkPermission(), userController.updateUser);
router.delete("/:id", auth, checkPermission(), userController.deleteUser);


module.exports = router;

