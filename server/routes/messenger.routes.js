const express = require("express");
const router = express.Router();
const messengerController = require("../controllers/messenger.controller");
const auth = require("../middleware/auth.middleware");

// Barcha yo'llar auth himoyasi ostida
router.use(auth);

// Contacts list
router.get("/contacts", messengerController.getContacts);

// Get all messages for current user
router.get("/my-messages", messengerController.getMyMessages);

// Get chat messages between current user and receiverId
router.get("/chat/:receiverId", messengerController.getMessages);

// Send message (text/image)
router.post("/send", messengerController.sendMessage);

// Edit message
router.put("/:messageId", messengerController.editMessage);

// Delete message
router.delete("/:messageId", messengerController.deleteMessage);

// Delete entire chat
router.delete("/chat/:receiverId", messengerController.deleteChat);

// Get single photo data
router.get("/photo/:photoId", messengerController.getPhoto);

// Mark as read
router.put("/read/:senderId", messengerController.markAsRead);

module.exports = router;
