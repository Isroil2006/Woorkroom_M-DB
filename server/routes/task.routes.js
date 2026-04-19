const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const auth = require("../middleware/auth.middleware");

// Projects
router.get("/projects", auth, taskController.getProjects);
router.post("/projects", auth, taskController.createProject);
router.delete("/projects/:id", auth, taskController.deleteProject);

// Tasks
router.get("/", auth, taskController.getTasks);
router.post("/", auth, taskController.createTask);
router.put("/:id", auth, taskController.updateTask);
router.delete("/:id", auth, taskController.deleteTask);
router.put("/:id/user-status", auth, taskController.updateUserStatus);

module.exports = router;
