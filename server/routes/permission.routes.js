const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");
const auth = require("../middleware/auth.middleware");
const checkPermission = require("../middleware/permission.middleware");

/**
 * @swagger
 * /api/permissions/nav-items:
 *   get:
 *     summary: Foydalanuvchiga ruxsat etilgan navigatsiya elementlarini olish
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Navigatsiya elementlari ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/nav-items", auth, permissionController.getNavItems);

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Foydalanuvchi ruxsatnomalarini boshqarish
 */

/**
 * @swagger
 * /api/permissions/{userId}:
 *   get:
 *     summary: Foydalanuvchining barcha ruxsatnomalarini olish
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ruxsatnomalar obyekti
 */
router.get("/:userId", auth, permissionController.getPermissionsByUserId);

/**
 * @swagger
 * /api/permissions/{userId}:
 *   post:
 *     summary: Foydalanuvchi ruxsatnomalarini saqlash/yangilash
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               perms:
 *                 type: object
 *     responses:
 *       200:
 *         description: Ruxsatnomalar saqlandi
 */
router.post("/:userId", auth, checkPermission(), permissionController.updatePermissions);

module.exports = router;
