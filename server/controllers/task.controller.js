const Project = require("../models/Project");
const Task = require("../models/Task");
const Permission = require("../models/Permission");
const NavItem = require("../models/NavItem");

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
    const { name } = req.body;
    const project = new Project({ 
      name, 
      createdBy: req.user.userId // Tokendan avtomatik olish
    });
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

    const userId = req.user.userId;

    const tasks = await Task.find({
      project: projectId,
      $or: [
        { createdBy: userId }, 
        { assignees: userId }
      ]
    })
      .populate("assignees", "username avatar email")
      .populate("createdBy", "username avatar")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user.userId // Tokendan avtomatik olish
    };
    const task = new Task(taskData);
    const saved = await task.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const SUPER_ADMIN_EMAILS = ["isroil@gmail.com", "admin@gmail.com", "test@gmail.com"];

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Vazifa topilmadi" });

    // 1. Huquqni tekshirish (Admin yoki Egasi/Ijrochisi bo'lishi kerak)
    const isOwner = String(task.createdBy) === String(userId);
    const isAssignee = task.assignees.some(a => String(a) === String(userId));
    const isAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);

    if (!isOwner && !isAssignee && !isAdmin) {
      return res.status(403).json({ message: "Sizda ushbu vazifani tahrirlash huquqi yo'q" });
    }

    // 2. Status o'zgarayotgan bo'lsa, task_change_status ruxsatini tekshiramiz
    if (req.body.status && req.body.status !== task.status && !isAdmin) {
      const userPermissions = await Permission.findOne({ userId }).lean();
      const navItems = await NavItem.find().lean();
      
      const taskSection = navItems.find(n => n.key === "nav_tasks");
      const changeStatusAction = taskSection?.actions.find(a => a.key === "task_change_status");

      if (changeStatusAction) {
        const userTaskPerms = userPermissions?.perms?.["nav_tasks"];
        const hasPerm = userTaskPerms?.access !== false && 
                        Array.isArray(userTaskPerms?.actions) && 
                        userTaskPerms.actions.includes(changeStatusAction.id);

        if (!hasPerm) {
          return res.status(403).json({ message: "Sizda vazifa statusini o'zgartirish ruxsati yo'q" });
        }
      }
    }

    // 3. Yangilash
    Object.assign(task, req.body);
    const updated = await task.save();
    
    // Populate qaytarish (frontend kutayotgan formatda)
    const populated = await Task.findById(updated._id)
      .populate("assignees", "username avatar email")
      .populate("createdBy", "username avatar");

    res.json(populated);
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
