const Project = require("../models/Project");
const Task = require("../models/Task");
const Permission = require("../models/Permission");
const NavItem = require("../models/NavItem");
const TaskHistory = require("../models/TaskHistory");

// ─── PROJECTS ───────────────────────────────────────────────

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Loyiha egasi, a'zosi yoki ochiq loyihalarni ko'ra oladi
    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { "members.user": userId },
        { isPublic: true }
      ]
    }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const ProjectHistory = require("../models/ProjectHistory");

exports.createProject = async (req, res) => {
  try {
    const { name, members } = req.body;
    const project = new Project({ 
      name, 
      createdBy: req.user.userId,
      members: members || []
    });
    const saved = await project.save();
    
    // Log member additions
    try {
      if (members && members.length > 0) {
        const User = require("../models/User");
        const memberIds = members.map(m => m.user);
        const users = await User.find({ _id: { $in: memberIds } }).lean();
        
        for (const m of members) {
          const userObj = users.find(u => String(u._id) === String(m.user));
          const username = userObj ? userObj.username || userObj.email : "User";
          
          const history = new ProjectHistory({
            action: "member_added",
            projectId: saved._id,
            user: req.user.userId,
            details: {
              member: m.user,
              memberUsername: username,
              newRole: m.role || "viewer"
            }
          });
          await history.save();
        }
      }
    } catch (errHistory) {
      console.error("Failed to log project history for creation:", errHistory);
    }
    
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, members } = req.body;
    const userId = req.user.userId;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Loyiha topilmadi" });

    // Faqat yaratuvchi tahrirlay oladi
    if (String(project.createdBy) !== String(userId)) {
       return res.status(403).json({ message: "Faqat loyiha egasi tahrirlay oladi" });
    }

    const oldMembers = project.members || [];

    if (name) project.name = name;
    if (members) project.members = members;
    if (typeof req.body.isPublic !== 'undefined') project.isPublic = req.body.isPublic;

    const saved = await project.save();

    // Calculate and log member changes
    if (members) {
      try {
        const User = require("../models/User");
        const allUserIds = [
          ...oldMembers.map(m => String(m.user)),
          ...members.map(m => String(m.user))
        ];
        const users = await User.find({ _id: { $in: allUserIds } }).lean();
        const getUserName = (uid) => {
          const u = users.find(x => String(x._id) === String(uid));
          return u ? u.username || u.email : "User";
        };

        // Added members & role changes
        for (const newM of members) {
          const oldM = oldMembers.find(m => String(m.user) === String(newM.user));
          if (!oldM) {
            // member_added
            const history = new ProjectHistory({
              action: "member_added",
              projectId: saved._id,
              user: userId,
              details: {
                member: newM.user,
                memberUsername: getUserName(newM.user),
                newRole: newM.role || "viewer"
              }
            });
            await history.save();
          } else if (oldM.role !== newM.role) {
            // member_role_changed
            const history = new ProjectHistory({
              action: "member_role_changed",
              projectId: saved._id,
              user: userId,
              details: {
                member: newM.user,
                memberUsername: getUserName(newM.user),
                oldRole: oldM.role,
                newRole: newM.role
              }
            });
            await history.save();
          }
        }

        // Removed members
        for (const oldM of oldMembers) {
          const newM = members.find(m => String(m.user) === String(oldM.user));
          if (!newM) {
            // member_removed
            const history = new ProjectHistory({
              action: "member_removed",
              projectId: saved._id,
              user: userId,
              details: {
                member: oldM.user,
                memberUsername: getUserName(oldM.user),
                oldRole: oldM.role
              }
            });
            await history.save();
          }
        }
      } catch (historyErr) {
        console.error("Failed to log project history:", historyErr);
      }
    }

    res.json(saved);
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

    // Loyihaga ruxsati bormi tekshiramiz
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Loyiha topilmadi" });

    const isOwner = String(project.createdBy) === String(userId);
    const isMember = project.members.some(m => String(m.user) === String(userId));
    const isPublic = project.isPublic;

    if (!isOwner && !isMember && !isPublic) {
      return res.status(403).json({ message: "Ushbu loyihani ko'rishga ruxsat yo'q" });
    }

    // Agar loyihaga ruxsati bo'lsa, barcha tasklarni ko'ra oladi
    const tasks = await Task.find({ project: projectId })
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

    // Log history
    try {
      const projHistory = new ProjectHistory({
        action: "task_created",
        projectId: saved.project,
        user: req.user.userId,
        details: {
          task: saved._id,
          taskTitle: saved.title
        }
      });
      await projHistory.save();

      const taskHistory = new TaskHistory({
        action: "created",
        taskId: saved._id,
        taskTitle: saved.title,
        projectId: saved.project,
        user: req.user.userId,
      });
      await taskHistory.save();
    } catch (errHistory) {
      console.error("Failed to save task history log:", errHistory);
    }

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

    const oldStatus = task.status;

    let updatedGlobalStatus = false;

    if (req.body.status) {
      if (isAssignee && !isOwner && !isAdmin) {
        // Faqat ijrochi bo'lsa, o'zining userStatus'ini o'zgartiradi
        if (!task.userStatus) task.userStatus = new Map();
        task.userStatus.set(userId, req.body.status);
        task.markModified("userStatus");
        delete req.body.status; // Global statusni o'zgartirmaslik uchun
        
        // Yangi global statusni hisoblaymiz
        const allDone = task.assignees.every(aId => task.userStatus.get(String(aId)) === "done");
        const anyProgressOrDone = task.assignees.some(aId => ["progress", "done"].includes(task.userStatus.get(String(aId))));

        if (allDone) {
          task.status = "done";
          updatedGlobalStatus = true;
        } else if (anyProgressOrDone) {
          task.status = "progress";
          updatedGlobalStatus = true;
        } else {
          task.status = "todo";
          updatedGlobalStatus = true;
        }
      } else {
        // Owner yoki Admin bo'lsa, global status o'zgaradi
        if (isAssignee) {
          if (!task.userStatus) task.userStatus = new Map();
          task.userStatus.set(userId, req.body.status);
          task.markModified("userStatus");
        }
        updatedGlobalStatus = true;
      }
    }

    // 3. Yangilash
    Object.assign(task, req.body);
    const updated = await task.save();
    
    // Populate qaytarish (frontend kutayotgan formatda)
    const populated = await Task.findById(updated._id)
      .populate("assignees", "username avatar email")
      .populate("createdBy", "username avatar");

    // Log history
    try {
      const isStatusChange = req.body.status && req.body.status !== oldStatus;
      if (isStatusChange) {
        const history = new TaskHistory({
          action: "status_changed",
          taskId: populated._id,
          taskTitle: populated.title,
          projectId: populated.project,
          user: userId,
          details: {
            oldStatus: oldStatus,
            newStatus: populated.status,
          }
        });
        await history.save();
      }
    } catch (errHistory) {
      console.error("Failed to save task update history log:", errHistory);
    }

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Vazifa topilmadi" });

    await Task.findByIdAndDelete(id);

    // Log history
    try {
      const projHistory = new ProjectHistory({
        action: "task_deleted",
        projectId: task.project,
        user: req.user.userId,
        details: {
          task: id,
          taskTitle: task.title
        }
      });
      await projHistory.save();

      const taskHistory = new TaskHistory({
        action: "deleted",
        taskId: id,
        taskTitle: task.title,
        projectId: task.project,
        user: req.user.userId,
      });
      await taskHistory.save();
    } catch (errHistory) {
      console.error("Failed to save task deletion history log:", errHistory);
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleUserDone = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Vazifa topilmadi" });

    // Faqat biriktirilgan foydalanuvchilar o'z statusini o'zgartira oladi
    const isAssignee = task.assignees.some(a => String(a) === String(userId));
    if (!isAssignee) {
      return res.status(403).json({ message: "Siz ushbu vazifaga biriktirilmagansiz" });
    }

    const oldStatus = task.status;

    // userStatus map-ni yangilash
    const currentStatus = task.userStatus.get(userId);
    const nextStatus = currentStatus === "done" ? "progress" : "done";
    task.userStatus.set(userId, nextStatus);
    task.markModified("userStatus");

    // Hamma assignees statusiga qarab global statusni yangilash
    const allDone = task.assignees.every(aId => task.userStatus.get(String(aId)) === "done");
    const anyProgressOrDone = task.assignees.some(aId => ["progress", "done"].includes(task.userStatus.get(String(aId))));

    if (allDone) {
      task.status = "done";
    } else if (anyProgressOrDone) {
      task.status = "progress";
    } else {
      task.status = "todo";
    }

    const updated = await task.save();
    const populated = await Task.findById(updated._id)
      .populate("assignees", "username avatar email")
      .populate("createdBy", "username avatar");

    // Log history
    try {
      const history = new TaskHistory({
        action: "status_changed",
        taskId: populated._id,
        taskTitle: populated.title,
        projectId: populated.project,
        user: userId,
        details: {
          oldStatus: oldStatus,
          newStatus: populated.status,
        }
      });
      await history.save();
    } catch (errHistory) {
      console.error("Failed to save task status toggle history log:", errHistory);
    }

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Find all projects where the user is an owner or member
    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { "members.user": userId }
      ]
    });
    const projectIds = projects.map(p => p._id);

    // Get all tasks in those projects
    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate("assignees", "username avatar email")
      .populate("createdBy", "username avatar")
      .populate("project", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProjectHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const history = await ProjectHistory.find({ projectId })
      .populate("user", "username email tel avatar")
      .populate("details.member", "username email avatar")
      .sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTaskHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await TaskHistory.find({ taskId: id })
      .populate("user", "username email tel avatar")
      .sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

