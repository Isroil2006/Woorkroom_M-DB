const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");

router.post("/upload", fileController.uploadFile);
router.get("/:userId", fileController.getFileByUserId);
router.delete("/:userId", fileController.deleteFileByUserId);

module.exports = router;
