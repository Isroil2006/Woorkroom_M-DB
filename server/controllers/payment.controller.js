const PaymentMethod = require("../models/PaymentMethod");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.PUSHER_CLUSTER || "ap2",
  useTLS: true,
});

// ─── PAYMENT METHODS ──────────────────────────────────────────

// 1. Joriy foydalanuvchi ning barcha hisoblarini olish
exports.getMethods = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const methods = await PaymentMethod.find({ userId }).sort({ createdAt: 1 });
    res.status(200).json(methods);
  } catch (error) {
    res.status(500).json({ message: "Hisoblarni yuklashda xatolik", error: error.message });
  }
};

// 2. Yangi karta/hisob qo'shish
exports.addMethod = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { type, cardName, number, displayNumber, holder, expiry, bank, balance, cvv } = req.body;

    const method = new PaymentMethod({
      userId,
      type: type || "card",
      cardName: cardName || "",
      number,
      displayNumber: displayNumber || "",
      holder: holder || "",
      expiry: expiry || "",
      bank: bank || "",
      cvv: cvv || "",
      balance: balance || 0,
      isDefault: false,
    });

    await method.save();

    try {
      await pusher.trigger(`user-${userId}`, "method-added", { method });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(201).json(method);
  } catch (error) {
    res.status(500).json({ message: "Hisob qo'shishda xatolik", error: error.message });
  }
};

// 3. Hisobni o'chirish
exports.deleteMethod = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const method = await PaymentMethod.findById(id);
    if (!method) return res.status(404).json({ message: "Hisob topilmadi" });
    if (method.userId !== userId) return res.status(403).json({ message: "Ruxsat yo'q" });
    if (method.isDefault) return res.status(400).json({ message: "Asosiy hisobni o'chirib bo'lmaydi" });

    await PaymentMethod.findByIdAndDelete(id);

    try {
      await pusher.trigger(`user-${userId}`, "method-deleted", { methodId: id });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(200).json({ message: "Hisob o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "O'chirishda xatolik", error: error.message });
  }
};

// ─── TRANSACTIONS ──────────────────────────────────────────────

// 4. Joriy foydalanuvchi ning barcha tranzaksiyalarini olish
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const transactions = await Transaction.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderMethodId", "number type")
      .populate("receiverMethodId", "number type")
      .sort({ createdAt: 1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Tranzaksiyalarni yuklashda xatolik", error: error.message });
  }
};

// 5. Yangi to'lov hujjati yaratish (waiting holat)
exports.createTransaction = async (req, res) => {
  try {
    const senderId = req.user.userId || req.user.id;
    let { receiverId, amount, description } = req.body;

    // Draft mode: if receiverId is not provided or "draft", it's a draft document.
    const isDraft = !receiverId || receiverId === "draft";
    
    const sender = await User.findOne({ $or: [{ userId: senderId }, { _id: senderId }] }).select("username");
    
    let receiver = null;
    if (!isDraft) {
      receiver = await User.findOne({ $or: [{ userId: receiverId }, { _id: receiverId }] }).select("username");
      if (!receiver) return res.status(404).json({ message: "Qabul qiluvchi topilmadi" });
    }

    const transaction = new Transaction({
      senderId,
      senderName: sender?.username || "Unknown",
      receiverId: receiver ? (receiver.userId || receiver._id.toString()) : "draft",
      receiverName: receiver ? receiver.username : "-",
      amount: amount || 0,
      description: description || "-",
      status: "waiting",
    });

    await transaction.save();

    // Qabul qiluvchiga real-time bildirishnoma
    try {
      await pusher.trigger(`user-${transaction.receiverId}`, "new-transaction", { transaction });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Tranzaksiya yaratishda xatolik", error: error.message });
  }
};

// 6. To'lovni amalga oshirish (SMS tasdiqlashdan keyin)
exports.executeTransaction = async (req, res) => {
  try {
    const senderId = req.user.userId || req.user.id;
    const { transactionId } = req.params;
    const { senderMethodId, receiverMethodId, amount, description, receiverId } = req.body;

    let transaction;
    if (transactionId === "new") {
      const sender = await User.findOne({ $or: [{ userId: senderId }, { _id: senderId }] }).select("username");
      transaction = new Transaction({
        senderId,
        senderName: sender?.username || "Unknown",
        status: "waiting"
      });
    } else {
      transaction = await Transaction.findById(transactionId);
      if (!transaction) return res.status(404).json({ message: "Tranzaksiya topilmadi" });
      if (transaction.senderId !== senderId) return res.status(403).json({ message: "Ruxsat yo'q" });
      if (transaction.status === "paid") return res.status(400).json({ message: "Bu tranzaksiya allaqachon to'langan" });
    }

    // Update receiverId if provided (for draft execution)
    let actualReceiverId = transaction.receiverId;
    if (receiverId && receiverId !== "draft") {
      actualReceiverId = receiverId;
      const recUser = await User.findOne({ $or: [{ userId: receiverId }, { _id: receiverId }] }).select("username");
      if (recUser) {
        transaction.receiverId = recUser.userId || recUser._id.toString();
        transaction.receiverName = recUser.username;
      }
    }

    if (!actualReceiverId || actualReceiverId === "draft") {
      return res.status(400).json({ message: "Qabul qiluvchi tanlanmagan" });
    }

    // Jo'natuvchi va qabul qiluvchi hisoblarini tekshirish
    const senderMethod = await PaymentMethod.findById(senderMethodId);
    if (!senderMethod) return res.status(404).json({ message: "Jo'natuvchi hisob topilmadi" });
    if (senderMethod.userId !== senderId) return res.status(403).json({ message: "Bu sizning hisobingiz emas" });

    const receiverMethod = await PaymentMethod.findById(receiverMethodId);
    if (!receiverMethod) return res.status(404).json({ message: "Qabul qiluvchi hisob topilmadi" });

    const txAmount = amount || transaction.amount;
    if (!txAmount || txAmount <= 0) {
      return res.status(400).json({ message: "Noto'g'ri summa" });
    }
    if (senderMethod.balance < txAmount) {
      return res.status(400).json({ message: "Balans yetarli emas" });
    }

    // Balanslarni yangilash
    senderMethod.balance -= txAmount;
    receiverMethod.balance += txAmount;
    await senderMethod.save();
    await receiverMethod.save();

    // Tranzaksiyani yangilash
    transaction.status = "paid";
    transaction.amount = txAmount;
    transaction.description = description || transaction.description;
    transaction.senderMethodId = senderMethodId;
    transaction.receiverMethodId = receiverMethodId;
    transaction.paidAt = new Date();
    await transaction.save();

    await transaction.populate("senderMethodId", "number type");
    await transaction.populate("receiverMethodId", "number type");

    // Har ikkala foydalanuvchiga real-time bildirishnoma
    const eventData = { transaction, senderBalance: senderMethod.balance, receiverBalance: receiverMethod.balance };
    try {
      await pusher.trigger(`user-${transaction.senderId}`, "transaction-completed", eventData);
      // Only send to receiver if it's a different user (avoid double event for self-transfers)
      if (transaction.senderId !== transaction.receiverId) {
        await pusher.trigger(`user-${transaction.receiverId}`, "transaction-completed", eventData);
      }
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: "To'lovni amalga oshirishda xatolik", error: error.message });
  }
};

// 7. Kutilayotgan tranzaksiyani bekor qilish (o'chirish)
exports.deleteTransaction = async (req, res) => {
  try {
    const senderId = req.user.userId || req.user.id;
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: "Tranzaksiya topilmadi" });
    if (transaction.senderId !== senderId) return res.status(403).json({ message: "Ruxsat yo'q" });
    if (transaction.status !== "waiting") return res.status(400).json({ message: "Faqat kutilayotgan to'lovni o'chirish mumkin" });

    await Transaction.findByIdAndDelete(transactionId);

    // Xabar yuborish agar qabul qiluvchi aniq bo'lsa
    if (transaction.receiverId !== "draft" && transaction.receiverId !== senderId) {
       try {
         await pusher.trigger(`user-${transaction.receiverId}`, "transaction-deleted", { transactionId });
       } catch (err) {
         console.error("Pusher error:", err);
       }
    }

    res.status(200).json({ message: "Tranzaksiya o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "O'chirishda xatolik", error: error.message });
  }
};

// ─── STATS & USERS ─────────────────────────────────────────────

// 7. Statistik ma'lumotlar
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const methods = await PaymentMethod.find({ userId });
    const totalBalance = methods.reduce((s, m) => s + (m.balance || 0), 0);

    const transactions = await Transaction.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const outgoing = transactions.filter((t) => t.senderId === userId);
    const incoming = transactions.filter((t) => t.receiverId === userId && t.status === "paid");

    const waitingSum = outgoing.filter((t) => t.status === "waiting").reduce((s, t) => s + t.amount, 0);
    const paidSum = outgoing.filter((t) => t.status === "paid").reduce((s, t) => s + t.amount, 0);
    const incomingSum = incoming.reduce((s, t) => s + t.amount, 0);

    const otherUsersCount = await User.countDocuments({ _id: { $ne: req.user.id } });

    res.status(200).json({
      totalBalance,
      waitingSum,
      paidSum,
      incomingSum,
      usersCount: otherUsersCount,
      methodsCount: methods.length,
      transactionsCount: transactions.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Statistika olishda xatolik", error: error.message });
  }
};

// 8. Boshqa foydalanuvchilar (to'lov uchun recipient tanlash)
exports.getPaymentUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const users = await User.find({ _id: { $ne: currentUserId } }).select("-password");

    // Har bir user uchun payment methods va tranzaksiyalarni olish
    const enriched = await Promise.all(
      users.map(async (u) => {
        const uid = u.userId || u._id.toString();
        const methods = await PaymentMethod.find({ userId: uid });
        const transactions = await Transaction.find({
          $or: [{ senderId: uid }, { receiverId: uid }],
        });

        const balance = methods.reduce((s, m) => s + (m.balance || 0), 0);
        const userObj = u.toObject();
        userObj.paymentMethods = methods;
        userObj.transactionsCount = transactions.length;
        userObj.paidCount = transactions.filter((t) => t.status === "paid" && t.senderId === uid).length;
        userObj.totalBalance = balance;
        return userObj;
      })
    );

    res.status(200).json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Foydalanuvchilarni olishda xatolik", error: error.message });
  }
};
