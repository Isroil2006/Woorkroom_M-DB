const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const auth = require("../middleware/auth.middleware");

router.post("/upload", auth, fileController.uploadFile);
router.get("/:userId", auth, fileController.getFileByUserId);
router.delete("/:userId", auth, fileController.deleteFileByUserId);

module.exports = router;
