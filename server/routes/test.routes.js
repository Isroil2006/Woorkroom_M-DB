const express = require("express");
const router = express.Router();
const testController = require("../controllers/test.controller");
const auth = require("../middleware/auth.middleware");

// Barcha test yo'llari faqat tizimga kirgan foydalanuvchilar uchun
router.use(auth);

// GET /api/tests - Barcha testlarni olish
router.get("/", testController.getAllTests);

// POST /api/tests/history - Test tarixiga natija qo'shish
router.post("/history", testController.saveTestHistory);

// GET /api/tests/history - Test tarixini olish
router.get("/history", testController.getTestHistory);

// GET /api/tests/assigned - Biriktirilgan testlarni olish
router.get("/assigned", testController.getAssignedTests);

// GET /api/tests/:id/results - Bitta testning barcha natijalarini olish (Faqat yaratuvchi)
router.get("/:id/results", testController.getTestResultsForCreator);

// GET /api/tests/:id - Bitta testni olish
router.get("/:id", testController.getTestById);

// POST /api/tests - Yangi test yaratish
router.post("/", testController.createTest);

// PUT /api/tests/:id - Testni tahrirlash
router.put("/:id", testController.updateTest);

// DELETE /api/tests/:id - Testni o'chirish
router.delete("/:id", testController.deleteTest);

module.exports = router;
