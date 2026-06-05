const express = require("express");
const router = express.Router();
const testPhotoController = require("../controllers/testPhoto.controller");
const auth = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: TestPhotos
 *   description: Test savollaridagi rasmlar bilan ishlash
 */

/**
 * @swagger
 * /api/test-photos/upload:
 *   post:
 *     summary: Test savoli uchun rasm yuklash
 *     tags: [TestPhotos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileData:
 *                 type: string
 *                 description: Base64 formatidagi rasm
 *     responses:
 *       201:
 *         description: Rasm muvaffaqiyatli saqlandi
 */
router.post("/upload", auth, testPhotoController.uploadTestPhoto);

/**
 * @swagger
 * /api/test-photos/{id}:
 *   get:
 *     summary: ID orqali rasmni olish
 *     tags: [TestPhotos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rasm buffer formatida qaytadi
 */
router.get("/:id", testPhotoController.getTestPhotoById);

module.exports = router;
