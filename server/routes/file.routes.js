const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: Fayllar va rasmlar bilan ishlash
 */

/**
 * @swagger
 * /api/user-photos/{userId}:
 *   get:
 *     summary: Foydalanuvchi avatar rasmini olish
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rasm ma'lumotlari
 */
router.get("/:userId", auth, checkPermission(), fileController.getFileByUserId);

/**
 * @swagger
 * /api/user-photos/upload:
 *   post:
 *     summary: Foydalanuvchi rasm yuklashi yoki yangilashi
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               fileData:
 *                 type: string
 *                 description: Base64 formatidagi rasm
 *     responses:
 *       200:
 *         description: Rasm saqlandi
 */
router.post("/upload", auth, checkPermission(), fileController.uploadFile);

/**
 * @swagger
 * /api/user-photos/{userId}:
 *   delete:
 *     summary: Foydalanuvchi rasmini o'chirish
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rasm o'chirildi
 */
router.delete("/:userId", auth, checkPermission(), fileController.deleteFileByUserId);

module.exports = router;
