const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Yangi foydalanuvchini ro'yxatdan o'tkazish
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - tel
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               tel:
 *                 type: string
 *     responses:
 *       201:
 *         description: Muvaffaqiyatli ro'yxatdan o'tdi
 *       400:
 *         description: Xatolik yuz berdi
 */
router.post("/register", userController.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Foydalanuvchi tizimga kirishi
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli kirdi
 *       401:
 *         description: Login yoki parol noto'g'ri
 */
router.post("/login", userController.login);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Tizimdan chiqish
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli chiqdi
 */
router.post("/logout", userController.logout);


/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Hozirgi kirgan foydalanuvchi ma'lumotlarini olish
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Foydalanuvchi ma'lumotlari
 *       401:
 *         description: Avtorizatsiyadan o'tmagan
 */
router.get("/me", auth, userController.getMe);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Barcha foydalanuvchilar ro'yxatini olish
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Foydalanuvchilar ro'yxati
 */
router.get("/", auth, checkPermission(), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Bitta foydalanuvchini ID orqali olish
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Foydalanuvchi ma'lumotlari
 */
router.get("/:id", auth, checkPermission(), userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Foydalanuvchi ma'lumotlarini tahrirlash
 *     tags: [Users]
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
 *         description: Yangilangan ma'lumotlar
 */
router.put("/:id", auth, checkPermission(), userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Foydalanuvchini o'chirish
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Muvaffaqiyatli o'chirildi
 */
router.delete("/:id", auth, checkPermission(), userController.deleteUser);

module.exports = router;

