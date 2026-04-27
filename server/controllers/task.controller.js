const Project = require("../models/Project");
const Task = require("../models/Task");

// ─── PROJECTS ───────────────────────────────────────────────

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    const project = new Project({ name, createdBy });
    const saved = await project.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await Project.findByIdAndDelete(id);
    // Also delete all tasks in that project
    await Task.deleteMany({ project: id });
    res.json({ message: "Project and tasks deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── TASKS ──────────────────────────────────────────────────

exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: "Project ID required" });

    const tasks = await Task.find({ project: projectId }).populate("assignees", "username avatar email").populate("createdBy", "username avatar").sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = new Task(req.body);
    const saved = await task.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUpdate(id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await Task.findByIdAndDelete(id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, status } = req.body; // userId is string representation of ObjectId

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Update map
    task.userStatus.set(userId, status);

    // Recalculate global status if needed (optional logic)
    // For now just save
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
