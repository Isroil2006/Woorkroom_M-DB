const ProjectTaskChat = require("../models/ProjectTaskChat");
const User = require("../models/User");
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.PUSHER_CLUSTER || "ap2",
  useTLS: true
});

exports.getMessages = async (req, res) => {
  try {
    const { taskId } = req.params;
    const messages = await ProjectTaskChat.find({ taskId })
      .populate("sender", "username email avatar")
      .sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { projectId, text } = req.body;
    const senderId = req.user.id || req.user.userId;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Xabar bo'sh bo'lishi mumkin emas" });
    }

    const newMessage = new ProjectTaskChat({
      taskId,
      projectId,
      sender: senderId,
      text,
      readBy: [senderId] // Sender automatically read it
    });

    await newMessage.save();

    // Populate sender info before triggering Pusher so client gets full details
    const populatedMessage = await ProjectTaskChat.findById(newMessage._id).populate("sender", "username email avatar");

    try {
      await pusher.trigger(`task-chat-${taskId}`, "new-task-message", {
        message: populatedMessage
      });
    } catch (err) {
      console.error("Pusher error:", err);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Xabar yuborishda xatolik", error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id || req.user.userId;

    await ProjectTaskChat.updateMany(
      { taskId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    // Optional: Could trigger an event to update read status for others, but basic implementation usually skips this for simplicity
    res.status(200).json({ message: "O'qilgan deb belgilandi" });
  } catch (error) {
    res.status(500).json({ message: "O'qish belgisini qo'yishda xatolik", error: error.message });
  }
};

exports.getUnreadCountsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id || req.user.userId;
    const mongoose = require("mongoose");

    // Find all unread messages for this project and group by taskId
    const unreadMessages = await ProjectTaskChat.aggregate([
      { 
        $match: { 
          projectId: new mongoose.Types.ObjectId(projectId), 
          readBy: { $ne: new mongoose.Types.ObjectId(userId) } 
        } 
      },
      { 
        $group: { 
          _id: "$taskId", 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const counts = {};
    unreadMessages.forEach(item => {
      counts[item._id.toString()] = item.count;
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: "Xatolik", error: error.message });
  }
};
