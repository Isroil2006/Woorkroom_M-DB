const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

router.post("/upload", auth, checkPermission(), fileController.uploadFile);
router.get("/:userId", auth, checkPermission(), fileController.getFileByUserId);
router.delete("/:userId", auth, checkPermission(), fileController.deleteFileByUserId);


module.exports = router;

