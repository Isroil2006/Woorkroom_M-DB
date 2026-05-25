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
 *         description: Loyihalar ro'yxati muvaffaqiyatli qaytarildi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       401:
 *         description: Avtorizatsiyadan o'tmagan
 *       403:
 *         description: Sizda ushbu amal uchun ruxsat yo'q
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
 *         description: Loyiha muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Noto'g'ri ma'lumot yuborildi
 *       403:
 *         description: Loyiha yaratish uchun ruxsat yo'q
 */
router.post("/projects", auth, checkPermission(), taskController.createProject);
/**
 * @swagger
 * /api/tasks/projects/{id}:
 *   put:
 *     summary: Loyihani tahrirlash
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Loyiha yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
router.put("/projects/:id", auth, checkPermission(), taskController.updateProject);

/**
 * @swagger
 * /api/tasks/projects/{projectId}/history:
 *   get:
 *     summary: Loyiha tarixini olish
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loyiha tarixi muvaffaqiyatli olingan
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/projects/:projectId/history", auth, checkPermission(), taskController.getProjectHistory);

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
router.get("/all", auth, checkPermission(), taskController.getAllTasks);
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
 *     summary: Vazifani tahrirlash yoki statusini o'zgartirish
 *     description: Vazifa ma'lumotlarini tahrirlash (task_edit_task) yoki statusini o'zgartirish (task_change_status). Faqat vazifa egasi, ijrochisi yoki adminlar uchun.
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
 *       403:
 *         description: Sizda ushbu vazifani tahrirlash yoki statusini o'zgartirish huquqi yo'q
 */
router.put("/:id", auth, checkPermission(), taskController.updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Vazifani o'chirish
 *     description: Vazifa egasi yoki admin o'chira oladi (task_delete_task).
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
 *       403:
 *         description: Sizda ushbu vazifani o'chirish huquqi yo'q
 */
router.delete("/:id", auth, checkPermission(), taskController.deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/history:
 *   get:
 *     summary: Vazifa tarixini olish
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vazifa tarixi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/:id/history", auth, checkPermission(), taskController.getTaskHistory);

/**
 * @swagger
 * /api/tasks/{id}/toggle-user-done:
 *   patch:
 *     summary: Foydalanuvchi uchun vazifani bajarilgan deb belgilash
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status yangilandi
 */
router.patch("/:id/toggle-user-done", auth, checkPermission(), taskController.toggleUserDone);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Vazifa statusini o'zgartirish
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [todo, progress, done]
 *     responses:
 *       200:
 *         description: Vazifa statusi yangilandi
 */
router.patch("/:id/status", auth, checkPermission(), taskController.updateTask);



module.exports = router;
