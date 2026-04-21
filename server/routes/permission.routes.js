const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

router.get("/:userId", auth, checkPermission("settings"), permissionController.getPermissionsByUserId);
router.post("/:userId", auth, checkPermission("settings"), permissionController.updatePermissions);

module.exports = router;

