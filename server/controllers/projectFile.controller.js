const ProjectFile = require("../models/ProjectFile");
const Task = require("../models/Task");

// Upload a file (PDF limit 5MB)
exports.uploadFile = async (req, res) => {
  try {
    const { taskId, projectId, fileName, fileType, fileData, fileSize } = req.body;
    
    // 1. Check file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    
    // Estimate size of base64 if fileSize is not perfectly sent
    // Base64 size = (characters * 3 / 4) - padding
    const estimatedSize = fileData ? (fileData.length * 3 / 4) : 0;
    const sizeToCheck = fileSize || estimatedSize;
    
    if (sizeToCheck > MAX_SIZE) {
      return res.status(400).json({ message: "Fayl hajmi 5MB dan oshmasligi kerak!" });
    }
    
    // 2. Check if it's a PDF
    if (fileType !== "application/pdf" && !fileName.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ message: "Faqat PDF fayllarni yuklash mumkin!" });
    }
    
    const newFile = new ProjectFile({
      fileName,
      fileType,
      fileData,
      fileSize: sizeToCheck,
      taskId,
      projectId,
      uploadedBy: req.user ? req.user.userId : null
    });
    
    const savedFile = await newFile.save();
    
    // Add to Task if taskId is provided
    if (taskId) {
      await Task.findByIdAndUpdate(taskId, { $push: { files: savedFile._id } });
    }
    
    // Return file metadata without the huge base64 data to save bandwidth
    res.status(201).json({
      _id: savedFile._id,
      fileName: savedFile.fileName,
      fileSize: savedFile.fileSize,
      fileType: savedFile.fileType,
      message: "Fayl muvaffaqiyatli yuklandi"
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Get file by ID
exports.getFile = async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "Fayl topilmadi" });
    
    res.json(file);
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "Fayl topilmadi" });
    
    // Remove from task if it's attached
    if (file.taskId) {
      await Task.findByIdAndUpdate(file.taskId, { $pull: { files: file._id } });
    }
    
    await ProjectFile.findByIdAndDelete(req.params.id);
    res.json({ message: "Fayl o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};
