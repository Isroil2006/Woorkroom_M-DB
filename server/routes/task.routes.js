const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

// Projects
router.get("/projects", auth, checkPermission("tasks"), taskController.getProjects);
router.post("/projects", auth, checkPermission("tasks"), taskController.createProject);
router.delete("/projects/:id", auth, checkPermission("tasks"), taskController.deleteProject);

// Tasks
router.get("/", auth, checkPermission("tasks"), taskController.getTasks);
router.post("/", auth, checkPermission("tasks"), taskController.createTask);
router.put("/:id", auth, checkPermission("tasks"), taskController.updateTask);
router.delete("/:id", auth, checkPermission("tasks"), taskController.deleteTask);
router.put("/:id/user-status", auth, checkPermission("tasks"), taskController.updateUserStatus);

module.exports = router;

