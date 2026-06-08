const User = require("../models/User");
const Message = require("../models/Message");
const MessengerPhoto = require("../models/MessengerPhoto");
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.PUSHER_CLUSTER || "ap2",
  useTLS: true
});

// 1. Foydalanuvchilarni olish (sidebar uchun)
exports.getContacts = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// 2. Barcha xabarlarimni olish (lokal filter uchun)
exports.getMyMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Xabarlarni yuklashda xatolik", error: error.message });
  }
};

// 2b. Ikki foydalanuvchi orasidagi xabarlarni olish (agar kerak bo'lsa)
exports.getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: receiverId },
        { sender: receiverId, receiver: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Xabarlarni yuklashda xatolik", error: error.message });
  }
};

// 3. Yangi xabar yuborish (text yoki rasm)
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, type, text, fileData } = req.body;
    const senderId = req.user.id;

    if (!receiverId) return res.status(400).json({ message: "Qabul qiluvchi ko'rsatilmagan" });

    let photoId = null;

    if (type === "image" && fileData) {
      // Rasmni MessengerPhoto ga saqlash
      const newPhoto = new MessengerPhoto({
        fileData,
        uploadedBy: senderId,
      });
      await newPhoto.save();
      photoId = newPhoto._id;
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      type: type || "text",
      text: text || "",
      photoId,
    });

    await newMessage.save();

    try {
      await pusher.trigger(`user-${receiverId}`, "new-message", {
        message: newMessage
      });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Xabar yuborishda xatolik", error: error.message });
  }
};

// 4. Xabarni tahrirlash
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Xabar topilmadi" });

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "Siz faqat o'zingizning xabaringizni tahrirlashingiz mumkin" });
    }

    message.text = text;
    message.edited = true;
    await message.save();

    try {
      await pusher.trigger(`user-${message.receiver}`, "message-edited", {
        message: message
      });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Tahrirlashda xatolik", error: error.message });
  }
};

// 5. Xabarni o'chirish
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Xabar topilmadi" });

    // Agar image bo'lsa rasmni ham o'chirib tashlash (ixtiyoriy, bazani tozalab turish uchun)
    if (message.type === "image" && message.photoId) {
      await MessengerPhoto.findByIdAndDelete(message.photoId);
    }

    await Message.findByIdAndDelete(messageId);

    try {
      await pusher.trigger(`user-${message.receiver}`, "message-deleted", {
        messageId: messageId,
        senderId: message.sender,
        receiverId: message.receiver
      });
      // Agar xabarni jo'natuvchi 2 ta tab ochgan bo'lsa, o'ziga ham yuborsak bo'ladi. Hozircha faqat receiver.
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(200).json({ message: "Xabar o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "O'chirishda xatolik", error: error.message });
  }
};

// 6. Rasmni o'qib olish (endpoint formati)
exports.getPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const photo = await MessengerPhoto.findById(photoId);

    if (!photo || !photo.fileData) {
      return res.status(404).json({ message: "Rasm topilmadi" });
    }

    // Base64 dan rasmni ajratish (opsional, lekin agar img tag src ga base64 berasak ham bo'ladi)
    // Front endga shunchaki base64 ni json qilib qaytarib bersak qulayroq bo'lishi mumkin loading logic uchun
    res.status(200).json({ dataUrl: photo.fileData });
  } catch (error) {
    res.status(500).json({ message: "Rasmni yuklashda xatolik", error: error.message });
  }
};

// 7. Xabarlarni o'qilgan deb belgilash
exports.markAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.user.id;

    await Message.updateMany(
      { sender: senderId, receiver: receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    try {
      // SenderId (xabar egasi) ga sening xabarlaringni o'qishdi degan signal yuboriladi
      await pusher.trigger(`user-${senderId}`, "messages-read", {
        readerId: receiverId
      });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(200).json({ message: "O'qildi" });
  } catch (error) {
    res.status(500).json({ message: "Belgilashda xatolik", error: error.message });
  }
};

// 8. Chatni tozalash (Ikkala foydalanuvchi orasidagi barcha xabarlarni o'chirish)
exports.deleteChat = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const currentUserId = req.user.id;

    // Find all messages to delete
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: receiverId },
        { sender: receiverId, receiver: currentUserId },
      ],
    });
    
    const photoIds = messages.filter(m => m.type === "image" && m.photoId).map(m => m.photoId);
    if (photoIds.length > 0) {
      await MessengerPhoto.deleteMany({ _id: { $in: photoIds } });
    }

    await Message.deleteMany({
      $or: [
        { sender: currentUserId, receiver: receiverId },
        { sender: receiverId, receiver: currentUserId },
      ],
    });

    try {
      await pusher.trigger(`user-${receiverId}`, "chat-deleted", {
        deletedBy: currentUserId
      });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(200).json({ message: "Chat tozalandi" });
  } catch (error) {
    res.status(500).json({ message: "Chatni tozalashda xatolik", error: error.message });
  }
};

