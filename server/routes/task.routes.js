const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

// Projects
router.get("/projects", auth, checkPermission(), taskController.getProjects);
router.post("/projects", auth, checkPermission(), taskController.createProject);
router.delete("/projects/:id", auth, checkPermission(), taskController.deleteProject);

// Tasks
router.get("/", auth, checkPermission(), taskController.getTasks);
router.post("/", auth, checkPermission(), taskController.createTask);
router.put("/:id", auth, checkPermission(), taskController.updateTask);
router.delete("/:id", auth, checkPermission(), taskController.deleteTask);
router.put("/:id/user-status", auth, checkPermission(), taskController.updateUserStatus);


module.exports = router;

