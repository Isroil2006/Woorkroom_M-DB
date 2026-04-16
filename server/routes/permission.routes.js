const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");

router.get("/:userId", permissionController.getPermissionsByUserId);
router.post("/:userId", permissionController.updatePermissions);

module.exports = router;
