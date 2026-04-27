const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Loyihalar va vazifalarni boshqarish
 */

// Projects
/**
 * @swagger
 * /api/tasks/projects:
 *   get:
 *     summary: Barcha loyihalar ro'yxatini olish
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Loyihalar ro'yxati
 */
router.get("/projects", auth, checkPermission(), taskController.getProjects);

/**
 * @swagger
 * /api/tasks/projects:
 *   post:
 *     summary: Yangi loyiha yaratish
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Loyiha yaratildi
 */
router.post("/projects", auth, checkPermission(), taskController.createProject);

/**
 * @swagger
 * /api/tasks/projects/{id}:
 *   delete:
 *     summary: Loyihani o'chirish
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loyiha o'chirildi
 */
router.delete("/projects/:id", auth, checkPermission(), taskController.deleteProject);

// Tasks
/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Loyiha bo'yicha vazifalarni olish
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vazifalar ro'yxati
 */
router.get("/", auth, checkPermission(), taskController.getTasks);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Yangi vazifa yaratish
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Vazifa yaratildi
 */
router.post("/", auth, checkPermission(), taskController.createTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Vazifani tahrirlash
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Yangilangan vazifa
 */
router.put("/:id", auth, checkPermission(), taskController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Vazifani o'chirish
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vazifa o'chirildi
 */
router.delete("/:id", auth, checkPermission(), taskController.deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/user-status:
 *   put:
 *     summary: Vazifa holatini (status) o'zgartirish
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Status yangilandi
 */
router.put("/:id/user-status", auth, checkPermission(), taskController.updateUserStatus);

module.exports = router;
