const TestPhoto = require("../models/TestPhoto");

// Upload test photo
exports.uploadTestPhoto = async (req, res) => {
  try {
    const { fileData } = req.body;
    // Assuming auth middleware sets req.user
    const userId = req.user ? (req.user.id || req.user.userId) : req.body.userId;

    if (!fileData) {
      return res.status(400).json({ message: "Rasm ma'lumotlari kiritilishi shart!" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Foydalanuvchi aniqlanmadi!" });
    }

    const newPhoto = new TestPhoto({
      fileData,
      uploadedBy: userId,
    });

    await newPhoto.save();

    res.status(201).json({
      message: "Rasm saqlandi",
      id: newPhoto._id,
      url: `/api/test-photos/${newPhoto._id}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get test photo by ID
exports.getTestPhotoById = async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await TestPhoto.findById(id);

    if (!photo) {
      return res.status(404).json({ message: "Rasm topilmadi!" });
    }

    // Since it's saved as base64, we can either return it in JSON or return the raw image
    // If we want it to be usable directly in <img src="/api/test-photos/ID">, we should return raw image.
    // Base64 string format: "data:image/png;base64,iVBORw0KGgo..."
    if (photo.fileData.startsWith("data:")) {
      const parts = photo.fileData.split(",");
      const mime = parts[0].match(/:(.*?);/)[1];
      const base64Data = parts[1];
      
      const imgBuffer = Buffer.from(base64Data, "base64");
      
      res.writeHead(200, {
        "Content-Type": mime,
        "Content-Length": imgBuffer.length,
      });
      res.end(imgBuffer);
    } else {
      // Return URL if it's stored as external URL (e.g. Cloudinary)
      res.redirect(photo.fileData);
    }
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};
