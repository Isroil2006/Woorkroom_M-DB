const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");
const auth = require("../middleware/auth.middleware");

router.get("/:userId", auth, permissionController.getPermissionsByUserId);
router.post("/:userId", auth, permissionController.updatePermissions);

module.exports = router;
