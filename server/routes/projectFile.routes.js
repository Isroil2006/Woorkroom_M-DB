const express = require("express");
const router = express.Router();
const projectFileController = require("../controllers/projectFile.controller");
const auth = require("../middleware/auth.middleware");

// Upload file
router.post("/upload", auth, projectFileController.uploadFile);

// Get file
router.get("/:id", auth, projectFileController.getFile);

// Delete file
router.delete("/:id", auth, projectFileController.deleteFile);

module.exports = router;
