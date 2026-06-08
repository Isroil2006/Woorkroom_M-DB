const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { 
  getMessages, 
  sendMessage, 
  markAsRead, 
  getUnreadCountsByProject 
} = require("../controllers/projectTaskChat.controller");

router.get("/project/:projectId/unread", auth, getUnreadCountsByProject);
router.get("/:taskId", auth, getMessages);
router.post("/:taskId", auth, sendMessage);
router.put("/:taskId/read", auth, markAsRead);

module.exports = router;
