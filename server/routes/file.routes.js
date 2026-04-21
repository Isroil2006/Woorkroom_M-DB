const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

router.post("/upload", auth, checkPermission("employees"), fileController.uploadFile);
router.get("/:userId", auth, checkPermission("employees"), fileController.getFileByUserId);
router.delete("/:userId", auth, checkPermission("employees"), fileController.deleteFileByUserId);

module.exports = router;

