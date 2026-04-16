const Permission = require("../models/Permission");

exports.getPermissionsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = await Permission.findOne({ userId });
    
    if (!permissions) {
      return res.status(200).json(null); // Return null if not found, frontend will handle default
    }
    
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Permissions fetching error", error: error.message });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { perms } = req.body;

    const permissions = await Permission.findOneAndUpdate(
      { userId },
      { perms },
      { upsert: true, new: true }
    );

    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Permissions update error", error: error.message });
  }
};
