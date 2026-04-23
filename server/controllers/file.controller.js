const UserPhoto = require("../models/UserPhoto");

// Upload a file (avatar or video)
exports.uploadFile = async (req, res) => {
  try {
    const { userId, fileType, fileData } = req.body;

    if (!userId || !fileData) {
      return res
        .status(400)
        .json({ message: "Rasm/Video va userId kiritilishi shart!" });
    }

    // Check if file already exists for this user (e.g. replacing avatar)
    // Optionally, if we only want one image per user, we can replace it.
    let existingFile = await UserPhoto.findOne({
      userId,
      fileType: fileType || "image",
    });


    if (existingFile) {
      existingFile.fileData = fileData;
      await existingFile.save();
      return res.status(200).json(existingFile);
    }

    const newFile = new UserPhoto({

      userId,
      fileType: fileType || "image",
      fileData,
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get a file by userId
exports.getFileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const type = req.query.type || "image";

    const file = await UserPhoto.findOne({ userId, fileType: type });

    if (!file) {
      return res
        .status(200)
        .json({ fileData: null, message: "Fayl topilmadi!" });
    }

    res.status(200).json(file);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Delete a file by userId
exports.deleteFileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const type = req.query.type || "image";

    await UserPhoto.findOneAndDelete({ userId, fileType: type });

    res.status(200).json({ message: "Fayl o'chirildi" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};
