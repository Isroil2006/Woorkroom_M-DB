const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');

// Projects
router.get('/projects', taskController.getProjects);
router.post('/projects', taskController.createProject);
router.delete('/projects/:id', taskController.deleteProject);

// Tasks
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/user-status', taskController.updateUserStatus);

module.exports = router;
