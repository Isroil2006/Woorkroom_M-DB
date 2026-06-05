const Test = require("../models/Test");

// Barcha testlarni (yoki o'ziga tegishlilarini) olish
exports.getAllTests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tests = await Test.find({
      $or: [
        { status: "active" },
        { createdBy: userId }
      ]
    }).sort({ createdAt: -1 });
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: "Testlarni olishda xatolik yuz berdi", error: error.message });
  }
};

// Bitta testni ID bo'yicha olish
exports.getTestById = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test topilmadi" });
    
    // Ruxsat tekshiruvi
    const isCreator = test.createdBy.toString() === req.user.id;
    
    // Agar test maxsus foydalanuvchilarga biriktirilgan bo'lsa, faqat ular yoki yaratuvchisi ko'ra oladi
    if (test.assignedUsers && test.assignedUsers.length > 0) {
      const isAssigned = test.assignedUsers.some(uid => uid.toString() === req.user.id);
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: "Sizda bu testga kirish huquqi yo'q. Test faqat belgilangan foydalanuvchilar uchundir." });
      }
    }

    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: "Testni olishda xatolik yuz berdi", error: error.message });
  }
};

// Yangi test yaratish
exports.createTest = async (req, res) => {
  try {
    const { title, description, hasTimeLimit, timeHours, timeMinutes, scoringType, accessType, password, shuffleQuestions, shuffleAnswers, status, questions, validFrom, validUntil, assignedUsers } = req.body;
    
    const newTest = new Test({
      title: title || "Yangi Test",
      description,
      hasTimeLimit,
      timeHours,
      timeMinutes,
      scoringType,
      accessType,
      password,
      validFrom,
      validUntil,
      assignedUsers,
      shuffleQuestions,
      shuffleAnswers,
      status: status || "draft",
      questions: questions || [],
      createdBy: req.user.userId
    });

    await newTest.save();
    res.status(201).json(newTest);
  } catch (error) {
    res.status(500).json({ message: "Testni yaratishda xatolik yuz berdi", error: error.message });
  }
};

// Testni tahrirlash (faqat draft bo'lsa)
exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test topilmadi" });

    if (test.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Sizda bu testni tahrirlash huquqi yo'q" });
    }

    if (test.status === "active") {
      return res.status(400).json({ message: "Faol (Active) testlarni tahrirlab bo'lmaydi" });
    }

    const updatedTest = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedTest);
  } catch (error) {
    res.status(500).json({ message: "Testni tahrirlashda xatolik yuz berdi", error: error.message });
  }
};

// Testni o'chirish (faqat yaratgan odam)
exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test topilmadi" });

    if (test.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Sizda bu testni o'chirish huquqi yo'q" });
    }

    await Test.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Test muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Testni o'chirishda xatolik yuz berdi", error: error.message });
  }
};

const UserTestHistory = require("../models/UserTestHistory");

// Test natijasini tarixga saqlash
exports.saveTestHistory = async (req, res) => {
  try {
    const { testId, testSnapshot, score, maxScore, percent, correctCount, timeSpentFormatted, grade, questionsData } = req.body;
    
    const history = new UserTestHistory({
      userId: req.user.userId,
      testId,
      testSnapshot,
      score,
      maxScore,
      percent,
      correctCount,
      timeSpentFormatted,
      grade,
      questionsData
    });

    await history.save();
    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ message: "Natijani saqlashda xatolik yuz berdi", error: error.message });
  }
};

// Foydalanuvchining test tarixini olish
exports.getTestHistory = async (req, res) => {
  try {
    const history = await UserTestHistory.find({ userId: req.user.userId }).sort({ submittedAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Test tarixini olishda xatolik yuz berdi", error: error.message });
  }
};

// Foydalanuvchiga biriktirilgan (assigned) testlarni olish
exports.getAssignedTests = async (req, res) => {
  try {
    const tests = await Test.find({
      status: "active",
      assignedUsers: req.user.id
    }).sort({ createdAt: -1 });
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: "Biriktirilgan testlarni olishda xatolik yuz berdi", error: error.message });
  }
};

// Yaratuvchi uchun testning barcha natijalarini olish
exports.getTestResultsForCreator = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test topilmadi" });

    if (test.createdBy.toString() !== req.user.userId && test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Sizda bu test natijalarini ko'rish huquqi yo'q" });
    }

    const results = await UserTestHistory.find({ testId: req.params.id })
                                         .populate("userId", "username email avatar")
                                         .sort({ percent: -1, submittedAt: 1 });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Natijalarni olishda xatolik yuz berdi", error: error.message });
  }
};

