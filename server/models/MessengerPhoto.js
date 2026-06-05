const mongoose = require("mongoose");

const messengerPhotoSchema = new mongoose.Schema({
  fileData: {
    type: String, // Base64 string for the image
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("MessengerPhoto", messengerPhotoSchema);
