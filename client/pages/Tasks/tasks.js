import { API_URL as BASE_URL, getCurrentUser, getAuthHeaders } from "../../assets/js/api.js";
import { createTaskAnalyticsBtn, initTaskAnalytics } from "./analytics.js";
import { translations } from "./trasnslations.js";
import { applyPermissions, checkPermission, getPermissions } from "../Employees/permission.js";
import { getCurrentLang, createTranslationHelper, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";
import { showNotification } from "../../components/Notification/notification.js";

const t = createTranslationHelper(translations);

// ─── DATA HELPERS (API) ──────────────────────────────────────────
const API_URL = `${BASE_URL}/api/tasks`;

let projectsCache = null;
let usersCache = null;
let tasksCache = {}; // { projectId: [tasks] }
let isFetchingProjects = false;
let currentUserPermissions = null;

// ─── STATE ────────────────────────────────────────────────────
let currentProjectId = null;
let viewMode = "tasks"; // "tasks" or "overview"
let searchTab = "username"; // "username" or "email"
let editingProjectId = null;
let selectedProjectMembers = [];
let projectSearchQuery = "";
let currentView = "list"; // "list" or "board"
let currentFilter = "all"; // "all", "todo", "progress", "done"
let searchQuery = "";
let dragSrcTask = null;
let editingTaskId = null;
let activeDetailTaskId = null;
let selectedAssignees = [];
let deleteCallback = null;
let memberModalPage = 1;
let memberModalLimit = 5;
let memberModalQuery = "";

const $ = (id) => document.getElementById(id);

const updateLocalTaskCache = (task, fallbackPid) => {
  const pid = task.project?._id || task.project || fallbackPid;
  if (!pid || !tasksCache[pid]) return;
  const idx = tasksCache[pid].findIndex((t) => String(t._id) === String(task._id));
  if (idx > -1) {
    const oldTask = tasksCache[pid][idx];
    // Aqlli birlashtirish: Agar yangi kelgan ma'lumotda obyekt o'rniga faqat string(ID) kelsa, eskisini saqlaymiz
    const merged = { ...oldTask, ...task };
    if (task.assignees && task.assignees.length > 0 && typeof task.assignees[0] === "string") {
      merged.assignees = oldTask.assignees;
    }
    if (task.createdBy && typeof task.createdBy === "string" && oldTask.createdBy?._id) {
      merged.createdBy = oldTask.createdBy;
    }
    if (task.userStatus && oldTask.userStatus) {
      merged.userStatus = { ...oldTask.userStatus, ...task.userStatus };
    }
    tasksCache[pid][idx] = merged;
  } else {
    tasksCache[pid].unshift(task);
  }
};

const fetchProjects = async (force = false) => {
  if (projectsCache && !force) return projectsCache;
  if (isFetchingProjects) {
    while (isFetchingProjects) await new Promise((r) => setTimeout(r, 50));
    return projectsCache;
  }
  isFetchingProjects = true;
  try {
    const res = await fetch(`${API_URL}/projects`, { headers: getAuthHeaders(), credentials: "include" });
    const data = await res.json();
    projectsCache = Array.isArray(data) ? data : [];
    return projectsCache;
  } catch (err) {
    return [];
  } finally {
    isFetchingProjects = false;
  }
};

const fetchTasks = async (projectId, force = false) => {
  if (tasksCache[projectId] && !force) return tasksCache[projectId];
  try {
    const res = await fetch(`${API_URL}/?projectId=${projectId}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    tasksCache[projectId] = Array.isArray(data) ? data : [];
    return tasksCache[projectId];
  } catch (err) {
    console.error("Fetch tasks error:", err);
    return [];
  }
};

const fetchUsers = async () => {
  if (usersCache) return usersCache;
  try {
    const res = await fetch(`${BASE_URL}/api/users`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    usersCache = Array.isArray(data) ? data : [];
    return usersCache;
  } catch (err) {
    return [];
  }
};

const getCurrent = () => getCurrentUser();

// ─── PERMISSION & STATUS HELPERS ────────────────────────────
const isOwner = (task) => {
  const cu = getCurrent();
  if (!cu) return false;
  const authorId = String(task.createdBy?._id || task.createdBy || "");
  const cuId = String(cu.userId || cu._id || "");
  return authorId === cuId;
};

const isAssignee = (task) => {
  const cu = getCurrent();
  if (!cu) return false;
  const cuId = String(cu.userId || cu._id || "");
  const ids = (task.assignees || []).map((u) => String(u._id || u || ""));
  return ids.includes(cuId);
};

const canSeeTask = (task) => {
  return true; // Simplified for now, or use complex logic
};

const getVisibleStatus = (task) => {
  const cu = getCurrent();
  const cuId = String(cu?.userId || cu?._id || "");
  const isAuthor = String(task.createdBy?._id || task.createdBy || "") === cuId;
  const isAssignee = (task.assignees || []).some(a => String(a._id || a) === cuId);

  // Ijrochi (Assignee) uchun: Faqat o'zining shaxsiy statusini ko'radi
  if (isAssignee) {
    if (task.userStatus && task.userStatus[cuId]) {
      return task.userStatus[cuId];
    }
    // Hali boshlamagan bo'lsa
    return "todo";
  }

  // Yaratuvchi (Author) yoki Boshqa kuzatuvchilar uchun: Global status ko'rinadi
  return task.status || "todo";
};

// ─── CONFIGS ──────────────────────────────────────────────────
const priorityConfig = {
  none: { label: () => t("priority_none"), icon: "⬜", cls: "p-none" },
  low: { label: () => t("priority_low"), icon: "🟢", cls: "p-low" },
  medium: { label: () => t("priority_medium"), icon: "🟡", cls: "p-medium" },
  high: { label: () => t("priority_high"), icon: "🔴", cls: "p-high" },
  urgent: { label: () => t("priority_urgent"), icon: "🔥", cls: "p-urgent" },
};
const statusConfig = {
  todo: { label: () => t("status_todo"), cls: "s-todo" },
  progress: { label: () => t("status_progress"), cls: "s-progress" },
  done: { label: () => t("status_done"), cls: "s-done" },
};
const getProjectRole = () => {
  if (!currentProjectId) return "none";
  const proj = projectsCache?.find((p) => p._id === currentProjectId);
  if (!proj) return "none";

  const cu = getCurrent();
  if (!cu) return "none";
  const uid = cu.userId || cu._id;

  if (String(proj.createdBy) === String(uid)) return "admin";

  const members = proj.members || [];
  const member = members.find((m) => {
    const mId = typeof m === "string" ? m : m.user?._id || m.user;
    return String(mId) === String(uid);
  });

  if (member) return typeof member === "string" ? "viewer" : member.role || "viewer";
  if (proj.isPublic) return "viewer";

  return "none";
};

const applyProjectPermissions = () => {
  const role = getProjectRole();
  const isAdmin = role === "admin";
  const isMember = role === "member";
  const canCreate = isAdmin;
  const isViewer = role === "viewer" || role === "none";

  // Header buttons
  const createBtn = $("todo-create-task-btn");
  if (createBtn) createBtn.style.display = canCreate ? "flex" : "none";

  // Previously settingsBtn was hidden here for non-admins, now it's globally visible.
  const overviewBtn = $("project-overview-btn");
  if (overviewBtn) overviewBtn.style.display = "flex";

  // Row actions (Edit/Delete - usually for admins or owners)
  document.querySelectorAll("[data-action='edit'], [data-action='del']").forEach((btn) => {
    btn.style.display = isAdmin ? "flex" : "none";
  });

  // Section buttons
  document.querySelectorAll(".todo-add-in-section, .todo-board-add-btn").forEach((btn) => {
    btn.style.display = canCreate ? "block" : "none";
  });
};

// ─── AVATAR ───────────────────────────────────────────────────
const avatarColors = ["#5b6ef5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#6d505f"];
const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

const userAvatarHtml = (user, size = 26, isDone = false) => {
  const s = `width:${size}px;height:${size}px;`;
  const doneClass = isDone ? "is-done" : "";
  if (!user)
    return `<div class="todo-avatar-empty ${doneClass}" style="${s}"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#aaa" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="#aaa" stroke-width="2"/></svg></div>`;

  const name = user.username || user.email || "User";
  if (user.avatar && !user.avatar.includes("User-avatar.png")) {
    return `<img src="${user.avatar}" class="todo-avatar ${doneClass}" style="${s}" title="${name}" />`;
  }
  return `<div class="todo-avatar ${doneClass}" style="${s};background:${avatarColor(name)};font-size:${Math.round(size * 0.35)}px;" title="${name}">${initials(name)}</div>`;
};

// Bir nechta assignee avatarlarini stack ko'rinishida chiqaradi
const assigneeStackHtml = (task, size = 26) => {
  const assignees = task.assignees || [];
  if (assignees.length === 0) return userAvatarHtml(null, size);
  const shown = assignees.slice(0, 3);
  const extra = assignees.length - 3;
  let html = `<div class="todo-avatar-stack">`;
  shown.forEach((u) => {
    const uId = u._id || u;
    const isDone = task.userStatus && task.userStatus[uId] === "done";
    html += userAvatarHtml(u, size, isDone);
  });
  if (extra > 0) html += `<div class="todo-avatar-extra" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.35)}px">+${extra}</div>`;
  html += `</div>`;
  return html;
};

// ─── BADGES ───────────────────────────────────────────────────
const getPriorityBadge = (p) => {
  const cfg = priorityConfig[p] || priorityConfig.none;
  return `<span class="todo-priority-badge ${cfg.cls}">${cfg.icon} ${cfg.label()}</span>`;
};

const dueDateHtml = (dateStr) => {
  if (!dateStr) return `<span class="todo-due-date date-empty">—</span>`;
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((due - now) / 86400000);
  if (diff < 0) return `<span class="todo-due-date date-overdue">${t("overdue")}</span>`;
  if (diff === 0) return `<span class="todo-due-date date-today">${t("today")}</span>`;
  return `<span class="todo-due-date date-normal">${due.toLocaleDateString()}</span>`;
};

// ─── PAGE HTML ────────────────────────────────────────────────
const initMemberRoleTabs = (container) => {
  if (!container) return;
  const roleGroups = container.querySelectorAll(".member-role-tabs");
  roleGroups.forEach(group => {
    const uid = group.dataset.uid;
    const tabs = group.querySelectorAll(".role-tab");
    tabs.forEach(tab => {
      tab.onclick = () => {
        if (getProjectRole() !== "admin") {
          showNotification(t("error_no_permission") || "Sizda bunday amalni bajarish uchun ruxsat yo'q", "error");
          return;
        }
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const newRole = tab.dataset.value;
        const memberIdx = selectedProjectMembers.findIndex(m => {
          const mId = typeof m === "string" ? m : (m.user?._id || m.user);
          return String(mId) === String(uid);
        });
        if (memberIdx !== -1) {
          if (typeof selectedProjectMembers[memberIdx] === "string") {
            selectedProjectMembers[memberIdx] = { user: selectedProjectMembers[memberIdx], role: newRole };
          } else {
            selectedProjectMembers[memberIdx].role = newRole;
          }
        }
      };
    });
  });
};

const renderProjectMembersList = async (targetId = "project-members-list") => {
  const listEl = $(targetId);
  if (!listEl) return;

  if (selectedProjectMembers.length === 0) {
    listEl.innerHTML = `<div class="no-members-msg">${t("no_members_added") || "A'zolar qo'shilmagan"}</div>`;
    return;
  }

  const membersHtml = await Promise.all(
    selectedProjectMembers.map(async (m) => {
      const uid = typeof m === "string" ? m : m.user?._id || m.user;
      const role = typeof m === "string" ? "viewer" : m.role || "viewer";

      try {
        const res = await fetch(`${BASE_URL}/api/users/${uid}`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (!res.ok) throw new Error("User not found");
        const user = await res.json();
        return `
        <div class="member-card animated-item" data-uid="${uid}">
          <div class="member-card-left">
            ${userAvatarHtml(user, 42)}
            <div class="member-card-info">
              <span class="member-name">${user.username || user.email}</span>
              <span class="member-email">${user.email || ""}</span>
            </div>
          </div>
          <div class="member-card-actions">
            <div class="member-role-tabs" data-uid="${uid}">
              <button class="role-tab ${role === "viewer" ? "active" : ""}" data-value="viewer" ${getProjectRole() !== "admin" ? "disabled" : ""}>${t("role_viewer")}</button>
              <button class="role-tab ${role === "member" ? "active" : ""}" data-value="member" ${getProjectRole() !== "admin" ? "disabled" : ""}>${t("role_member")}</button>
              <button class="role-tab ${role === "admin" ? "active" : ""}" data-value="admin" ${getProjectRole() !== "admin" ? "disabled" : ""}>${t("role_admin")}</button>
            </div>
            <button class="member-delete-btn" onclick="removeProjectMember('${uid}')" title="${t("delete")}" ${getProjectRole() !== "admin" ? "disabled" : ""}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      `;
      } catch (e) {
        console.error("Member fetch error:", e);
        return "";
      }
    }),
  );
  listEl.innerHTML = membersHtml.join("");
  initMemberRoleTabs(listEl);
};

const fetchProjectHistory = async (projectId) => {
  try {
    const res = await fetch(`${BASE_URL}/api/tasks/projects/${projectId}/history`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Error fetching project history:", err);
  }
  return [];
};

const fetchTaskHistory = async (taskId) => {
  try {
    const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/history`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Error fetching task history:", err);
  }
  return [];
};

const renderProjectOverviewView = async () => {
  const container = $("todo-view-container");
  const proj = projectsCache.find((p) => p._id === currentProjectId);
  if (!proj) return;

  const cu = getCurrent();
  const isAdmin = getProjectRole() === "admin";

  selectedProjectMembers = proj.members ? [...proj.members] : [];

  showLoader(true);

  // Fetch data for history/stats
  const history = await fetchProjectHistory(currentProjectId);
  const tasks = await fetchTasks(currentProjectId);
  const users = await fetchUsers();
  const lang = getCurrentLang();
  
  // Calculate statistics
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter(t => t.status === "todo").length;
  const progressTasks = tasks.filter(t => t.status === "progress").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;

  const priorityUrgent = tasks.filter(t => t.priority === "urgent").length;
  const priorityHigh = tasks.filter(t => t.priority === "high").length;
  const priorityMedium = tasks.filter(t => t.priority === "medium").length;
  const priorityLow = tasks.filter(t => t.priority === "low").length;
  const priorityNone = tasks.filter(t => t.priority === "none").length;

  // Assignee workload
  const assigneeWorkload = {};
  tasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      const aId = a._id || a;
      const u = users.find(user => (user._id || user.userId) === String(aId));
      const name = u ? (u.username || u.email) : "Unknown User";
      if (!assigneeWorkload[name]) {
        assigneeWorkload[name] = { total: 0, done: 0, avatar: u ? u.avatar : null, userObj: u };
      }
      assigneeWorkload[name].total += 1;
      if (t.status === "done" || (t.userStatus && t.userStatus[aId] === "done")) {
        assigneeWorkload[name].done += 1;
      }
    });
  });

  const settingsTabHtml = `
    <button class="view-tab active" data-tab="settings">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>
      <span>${t("project_settings") || "Settings"}</span>
    </button>
  `;

  container.innerHTML = `
    <div class="project-settings-view animated-view project-overview-view">
      <div class="settings-header">
        <div class="settings-title-box">
          <button class="back-to-tasks" id="back-to-tasks-btn" style="margin-right: 12px;">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          
          <div class="view-switch overview-tabs" style="margin: 0;">
            ${settingsTabHtml}
            <button class="view-tab" data-tab="stats">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>${t("statistika") || "Statistic"}</span>
            </button>
            <button class="view-tab" data-tab="history">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>${t("history") || "History"}</span>
            </button>
          </div>
        </div>

        <div class="settings-actions" style="gap: 8px; display:flex;">
           <button class="todo-btn-danger" id="settings-delete-project" style="padding: 8px 16px; font-size: 13px;" ${!isAdmin ? "disabled" : ""}>${t("delete")}</button>
           <button class="todo-btn-primary" id="settings-save-project" style="padding: 8px 24px; font-size: 13px;" ${!isAdmin ? "disabled" : ""}>${t("save")}</button>
        </div>
      </div>

      <!-- SETTINGS CONTENT -->
      <div class="settings-content overview-content-section" id="overview-settings-content">
        <div class="settings-section">
          <label class="settings-label" style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">${t("project_label")}</label>
          <input type="text" id="settings-project-name" class="settings-input" style="font-size: 14px; padding: 10px 16px;" value="${proj.name}" placeholder="${t("project_name_placeholder")}" ${!isAdmin ? "disabled" : ""} />
          <span class="todo-form-error" id="settings-project-name-error" style="display: block; margin-top: 4px;"></span>
        </div>

        <div class="settings-section">
          <label class="settings-label">${t("manage_access")}</label>
          
          <div class="public-project-section">
            <div class="toggle-info">
              <span class="card-item-label">${t("public_project")}</span>
              <p class="settings-desc" style="margin-bottom: 0;">${t("public_project_desc")}</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="settings-public-toggle" ${proj.isPublic ? "checked" : ""} ${!isAdmin ? "disabled" : ""}>
              <span class="slider round"></span>
            </label>
          </div>

          <div class="member-management-card">
            <div class="member-search-header">
              <h3 class="added-members-title">${t("added_members")}</h3>
              <button class="todo-btn-primary" id="open-add-member-modal" ${!isAdmin ? "disabled" : ""}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                ${t("add_member") || "A'zo qo'shish"}
              </button>
            </div>

            <div class="added-members-container" style="padding: 16px;">
              <div id="settings-project-members-list" class="settings-members-list">
                <!-- Members will be rendered here -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STATS CONTENT -->
      <div class="settings-content overview-content-section" id="overview-stats-content" style="display:none;">
        <div class="history-stats-grid">
          <div class="history-stat-card">
            <div class="stat-card-icon blue">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="stat-card-info">
              <span class="stat-card-num">${totalTasks}</span>
              <span class="stat-card-label">${t("total_tasks") || "Jami vazifalar"}</span>
            </div>
          </div>
          <div class="history-stat-card">
            <div class="stat-card-icon purple">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="stat-card-info">
              <span class="stat-card-num">${todoTasks}</span>
              <span class="stat-card-label">${t("status_todo") || "Bajarilishi kerak"}</span>
            </div>
          </div>
          <div class="history-stat-card">
            <div class="stat-card-icon amber">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="stat-card-info">
              <span class="stat-card-num">${progressTasks}</span>
              <span class="stat-card-label">${t("status_progress") || "Jarayonda"}</span>
            </div>
          </div>
          <div class="history-stat-card">
            <div class="stat-card-icon green">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="stat-card-info">
              <span class="stat-card-num">${doneTasks}</span>
              <span class="stat-card-label">${t("status_done") || "Bajarilgan"}</span>
            </div>
          </div>
        </div>

        <div class="history-stats-details-row">
          <div class="details-card">
            <h3 class="details-card-title">${t("priority_dist") || "Prioritet taqsimoti"}</h3>
            <div class="priority-list">
              <div class="priority-progress-item">
                <div class="priority-progress-label">
                  <span class="pri-badge urgent">${t("priority_urgent")}</span>
                  <span>${priorityUrgent}</span>
                </div>
                <div class="priority-progress-bar"><div class="bar-fill urgent" style="width: ${totalTasks > 0 ? (priorityUrgent / totalTasks) * 100 : 0}%"></div></div>
              </div>
              <div class="priority-progress-item">
                <div class="priority-progress-label">
                  <span class="pri-badge high">${t("priority_high")}</span>
                  <span>${priorityHigh}</span>
                </div>
                <div class="priority-progress-bar"><div class="bar-fill high" style="width: ${totalTasks > 0 ? (priorityHigh / totalTasks) * 100 : 0}%"></div></div>
              </div>
              <div class="priority-progress-item">
                <div class="priority-progress-label">
                  <span class="pri-badge medium">${t("priority_medium")}</span>
                  <span>${priorityMedium}</span>
                </div>
                <div class="priority-progress-bar"><div class="bar-fill medium" style="width: ${totalTasks > 0 ? (priorityMedium / totalTasks) * 100 : 0}%"></div></div>
              </div>
              <div class="priority-progress-item">
                <div class="priority-progress-label">
                  <span class="pri-badge low">${t("priority_low")}</span>
                  <span>${priorityLow}</span>
                </div>
                <div class="priority-progress-bar"><div class="bar-fill low" style="width: ${totalTasks > 0 ? (priorityLow / totalTasks) * 100 : 0}%"></div></div>
              </div>
              <div class="priority-progress-item">
                <div class="priority-progress-label">
                  <span class="pri-badge none">${t("priority_none")}</span>
                  <span>${priorityNone}</span>
                </div>
                <div class="priority-progress-bar"><div class="bar-fill none" style="width: ${totalTasks > 0 ? (priorityNone / totalTasks) * 100 : 0}%"></div></div>
              </div>
            </div>
          </div>

          <div class="details-card">
            <h3 class="details-card-title">${t("top_assignees") || "Ijrochilar"} <span class="assignee-count-badge">${Object.keys(assigneeWorkload).length}</span></h3>
            <div class="assignee-workload-list">
              ${Object.keys(assigneeWorkload).length > 0 
                ? Object.entries(assigneeWorkload).map(([name, stat]) => `
                    <div class="assignee-workload-item">
                      <div class="assignee-workload-left">
                        ${userAvatarHtml(stat.userObj, 36)}
                        <div class="workload-user-info">
                          <span class="workload-user-name">${name}</span>
                          <span class="workload-user-tasks">${stat.done} / ${stat.total} ${t("tasks_done_lbl") || "vazifa bajarilgan"}</span>
                        </div>
                      </div>
                      <div class="workload-user-progress">
                        <div class="priority-progress-bar"><div class="bar-fill green" style="width: ${stat.total > 0 ? (stat.done / stat.total) * 100 : 0}%"></div></div>
                      </div>
                    </div>
                  `).join("")
                : `<div class="no-members-msg" style="padding: 30px 0;">${t("no_users_yet") || "Hozircha biriktirilgan ijrochilar yo'q"}</div>`
              }
            </div>
          </div>
        </div>
      </div>

      <!-- HISTORY CONTENT -->
      <div class="settings-content overview-content-section" id="overview-history-content" style="display: none;">
        <div class="history-timeline">
          ${history.length > 0
            ? history.map(log => {
                const logUser = log.user || { username: "System" };
                const timeStr = new Date(log.timestamp).toLocaleString();
                let iconClass = "created";
                let iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
                let actionText = "";
                let itemTitle = "";

                if (log.action === "task_created") {
                  iconClass = "created";
                  itemTitle = log.details?.taskTitle || (lang === "uz" ? "Vazifa" : lang === "ru" ? "Задача" : "Task");
                  actionText = lang === "uz" ? "yaratildi" : lang === "ru" ? "создал(а) задачу" : "created the task";
                } else if (log.action === "task_deleted") {
                  iconClass = "deleted";
                  iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                  itemTitle = log.details?.taskTitle || (lang === "uz" ? "Vazifa" : lang === "ru" ? "Задача" : "Task");
                  actionText = lang === "uz" ? "o'chirildi" : lang === "ru" ? "удалил(а) задачу" : "deleted the task";
                } else if (log.action === "member_added") {
                  iconClass = "status";
                  iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                  itemTitle = log.details?.memberUsername || (lang === "uz" ? "Foydalanuvchi" : lang === "ru" ? "Пользователь" : "User");
                  const r = log.details?.newRole || "viewer";
                  const roleStr = t("role_" + r) || r;
                  actionText = lang === "uz" ? `loyihaga qo'shildi (${roleStr})` : lang === "ru" ? `добавил(а) в проект (${roleStr})` : `added to project (${roleStr})`;
                } else if (log.action === "member_removed") {
                  iconClass = "deleted";
                  iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                  itemTitle = log.details?.memberUsername || (lang === "uz" ? "Foydalanuvchi" : lang === "ru" ? "Пользователь" : "User");
                  actionText = lang === "uz" ? `loyihadan o'chirildi` : lang === "ru" ? `удалил(а) из проекта` : `removed from project`;
                } else if (log.action === "member_role_changed") {
                  iconClass = "updated";
                  iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                  itemTitle = log.details?.memberUsername || (lang === "uz" ? "Foydalanuvchi" : lang === "ru" ? "Пользователь" : "User");
                  const oldR = log.details?.oldRole || "viewer";
                  const newR = log.details?.newRole || "viewer";
                  const oldRoleStr = t("role_" + oldR) || oldR;
                  const newRoleStr = t("role_" + newR) || newR;
                  actionText = lang === "uz" ? `roli o'zgartirildi (<span class="timeline-old-status">${oldRoleStr}</span> &rarr; <span class="timeline-new-status">${newRoleStr}</span>)` : lang === "ru" ? `изменил(а) роль (<span class="timeline-old-status">${oldRoleStr}</span> &rarr; <span class="timeline-new-status">${newRoleStr}</span>)` : `changed role (<span class="timeline-old-status">${oldRoleStr}</span> &rarr; <span class="timeline-new-status">${newRoleStr}</span>)`;
                } else {
                  itemTitle = lang === "uz" ? "Tizim hodisasi" : lang === "ru" ? "Системное событие" : "System event";
                  actionText = lang === "uz" ? "bajarildi" : lang === "ru" ? "выполнено" : "executed";
                }
                
                const userSuffix = lang === "uz" ? " tomonidan" : "";

                return `
                  <div class="timeline-item animated-item">
                    <div class="timeline-item-marker ${iconClass}">
                      ${iconSvg}
                    </div>
                    <div class="timeline-item-content">
                      <div class="timeline-item-header">
                        <span class="timeline-task-title">${itemTitle}</span>
                        <span class="timeline-time">${timeStr}</span>
                      </div>
                      <div class="timeline-item-body">
                        <span class="timeline-user">${userAvatarHtml(logUser, 20)} <strong>${logUser.username || logUser.email || "System"}</strong>${userSuffix}</span>
                        <span class="timeline-action-text">${actionText}</span>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")
            : `<div class="no-members-msg" style="padding: 80px 0; text-align: center;">
                 <svg width="48" height="48" fill="none" viewBox="0 0 24 24" style="color: #cbd5e1; margin-bottom: 12px;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 <p style="margin: 0; font-size: 14px; color: #64748b;">${t("no_history_yet") || "Tarixiy amallar hozircha mavjud emas"}</p>
               </div>`
          }
        </div>
      </div>
    </div>
  `;
  // --- EVENTS ---
  $("back-to-tasks-btn").onclick = () => {
    viewMode = "tasks";
    renderView();
  };

  const tabBtns = container.querySelectorAll(".overview-tabs .view-tab");
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      container.querySelectorAll(".overview-content-section").forEach(sec => sec.style.display = "none");
      const targetSec = $(`overview-${tab}-content`);
      if (targetSec) targetSec.style.display = "block";
    };
  });

  // settings logic for all roles (checks applied inside handlers)
    const nameInput = $("settings-project-name");
    const nameError = $("settings-project-name-error");

    if (nameInput) {
      nameInput.oninput = () => {
        nameInput.classList.remove("error");
        nameError.classList.remove("visible");
        nameError.textContent = "";
      };
    }

    const saveBtn = $("settings-save-project");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        if (getProjectRole() !== "admin") {
          showNotification(t("error_no_permission") || "Sizda bunday amalni bajarish uchun ruxsat yo'q", "error");
          return;
        }
        const nameInput = $("settings-project-name");
        const newName = nameInput.value.trim();

        if (newName.length < 3) {
          nameInput.classList.add("error");
          nameError.textContent = t("error_min_length_3") || "Kamida 3 ta belgi bo'lishi kerak";
          nameError.classList.add("visible");
          nameInput.focus();
          return;
        }

        editingProjectId = currentProjectId;
        saveBtn.classList.add("loading");

        try {
          const res = await fetch(`${BASE_URL}/api/tasks/projects/${currentProjectId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({
              name: newName,
              members: selectedProjectMembers.map((m) => {
                if (typeof m === "string") return { user: m, role: "viewer" };
                return { user: (m.user && m.user._id) ? m.user._id : m.user, role: m.role || "viewer" };
              }),
              isPublic: $("settings-public-toggle").checked,
            }),
          });

          if (res.ok) {
            const saved = await res.json();
            projectsCache = projectsCache.map((p) => (String(p._id) === String(currentProjectId) ? saved : p));
            showNotification(t("project_updated") || "Muvaffaqiyatli saqlandi", "success");
            viewMode = "tasks";
            renderView(true);
          } else {
            const errData = await res.json();
            showNotification(errData.message || t("error_saving_project") || "Saqlashda xatolik", "error");
          }
        } catch (e) {
          showNotification(t("error_occurred") || "Xatolik yuz berdi", "error");
        } finally {
          saveBtn.classList.remove("loading");
        }
      };
    }

    const delBtn = $("settings-delete-project");
    if (delBtn) {
      delBtn.onclick = () => {
        if (getProjectRole() !== "admin") {
          showNotification(t("error_no_permission") || "Sizda bunday amalni bajarish uchun ruxsat yo'q", "error");
          return;
        }
        deleteTask(null); 
      };
    }

    const addMemBtn = $("open-add-member-modal");
    if (addMemBtn) {
      addMemBtn.onclick = () => {
        if (getProjectRole() !== "admin") {
          showNotification(t("error_no_permission") || "Sizda bunday amalni bajarish uchun ruxsat yo'q", "error");
          return;
        }
        openAddMemberModal();
      };
    }

    renderProjectMembersList("settings-project-members-list");
};

const fetchAndRenderMemberModalUsers = async () => {
  const resultsEl = $("add-member-results");
  if (!resultsEl) return;

  resultsEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">${t("loading") || "Yuklanmoqda..."}</div>`;

  try {
    const res = await fetch(`${BASE_URL}/api/users/assign-list?query=${encodeURIComponent(memberModalQuery)}&page=${memberModalPage}&limit=${memberModalLimit}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch users");
    }

    const { users, total, page, totalPages } = await res.json();

    // Update page info and buttons
    const pageInfo = $("add-member-page-info");
    if (pageInfo) {
      pageInfo.textContent = `${page} / ${totalPages || 1}`;
    }

    const prevBtn = $("add-member-prev-page");
    if (prevBtn) {
      prevBtn.disabled = page <= 1;
    }

    const nextBtn = $("add-member-next-page");
    if (nextBtn) {
      nextBtn.disabled = page >= totalPages;
    }

    if (!users || users.length === 0) {
      resultsEl.innerHTML = `<div class="search-no-results" style="padding: 16px; font-size: 13px; text-align: center; color: #64748b;">${t("no_users_yet") || "Foydalanuvchilar topilmadi"}</div>`;
      return;
    }

    resultsEl.innerHTML = users
      .map((u) => {
        const uid = u.userId || u._id;
        const alreadyAdded = selectedProjectMembers.some((m) => (typeof m === "string" ? m : m.user?._id || m.user) === uid);
        return `
        <div class="search-result-item-large animated-item ${alreadyAdded ? "added" : ""}" data-uid="${uid}" style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; cursor: ${alreadyAdded ? "default" : "pointer"};">
           <div class="search-result-info" style="display: flex; align-items: center; gap: 10px;">
              ${userAvatarHtml(u, 32)}
              <div class="search-result-text" style="display: flex; flex-direction: column;">
                <span class="res-name" style="font-size: 13px; font-weight: 600; color: #1e293b;">${u.username || u.email}</span>
                <span class="res-email" style="font-size: 11px; color: #64748b;">${u.email || ""}</span>
              </div>
           </div>
           ${
             alreadyAdded
               ? `<span class="added-label-large" style="font-size: 11px; color: #10b981; font-weight: 500;">${t("added_label") || "Qo'shilgan"}</span>`
               : `<button class="add-member-action-btn-large todo-btn-primary" style="background: #5b6ef5; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 500; cursor: pointer;">${t("add") || "Qo'shish"}</button>`
           }
        </div>
      `;
      })
      .join("");

    resultsEl.querySelectorAll(".search-result-item-large:not(.added)").forEach((item) => {
      const addBtn = item.querySelector(".add-member-action-btn-large");
      const handleClick = async (e) => {
        e.stopPropagation();
        const uid = String(item.dataset.uid);
        selectedProjectMembers.push({ user: uid, role: "viewer" });
        $("add-member-modal").style.display = "none";
        await renderProjectMembersList("settings-project-members-list");
      };
      if (addBtn) addBtn.onclick = handleClick;
      item.onclick = handleClick;
    });
  } catch (err) {
    console.error("Fetch/Render members error:", err);
    resultsEl.innerHTML = `<div style="padding: 16px; color: #ef4444; text-align: center;">${t("error_occurred") || "Xatolik yuz berdi"}</div>`;
  }
};

const openAddMemberModal = () => {
  const modal = $("add-member-modal");
  const input = $("add-member-search-input");
  
  memberModalPage = 1;
  memberModalQuery = "";
  
  const limitSelect = $("add-member-limit-select");
  if (limitSelect) {
    memberModalLimit = parseInt(limitSelect.value) || 5;
  }
  
  if (input) input.value = "";
  if (modal) modal.style.display = "flex";
  
  fetchAndRenderMemberModalUsers();

  if (input) {
    input.focus();
    let timeout;
    input.oninput = (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        memberModalQuery = e.target.value.trim();
        memberModalPage = 1;
        fetchAndRenderMemberModalUsers();
      }, 300);
    };
  }

  const prevBtn = $("add-member-prev-page");
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (memberModalPage > 1) {
        memberModalPage--;
        fetchAndRenderMemberModalUsers();
      }
    };
  }

  const nextBtn = $("add-member-next-page");
  if (nextBtn) {
    nextBtn.onclick = () => {
      memberModalPage++;
      fetchAndRenderMemberModalUsers();
    };
  }

  const limitSelectEl = $("add-member-limit-select");
  if (limitSelectEl) {
    limitSelectEl.onchange = (e) => {
      memberModalLimit = parseInt(e.target.value) || 5;
      memberModalPage = 1;
      fetchAndRenderMemberModalUsers();
    };
  }
};

const renderAssigneePicker = async () => {
  const container = $("tm-assignee-picker");
  if (!container) return;

  const proj = projectsCache.find((p) => p._id === currentProjectId);
  if (!proj) return;

  const members = proj.members || [];
  if (members.length === 0) {
    container.innerHTML = `<div class="no-members-info" style="font-size: 12px; color: #64748b;">${t("no_members_added")}</div>`;
    return;
  }

  const membersData = await Promise.all(
    members.map(async (m) => {
      const uid = typeof m === "string" ? m : m.user?._id || m.user;
      try {
        const res = await fetch(`${BASE_URL}/api/users/${uid}`, { headers: getAuthHeaders(), credentials: "include" });
        return await res.json();
      } catch (e) {
        return null;
      }
    }),
  );

  container.innerHTML = membersData
    .filter((u) => u)
    .map((u) => {
      const uid = u.userId || u._id;
      const isSelected = selectedAssignees.includes(uid);
      return `
      <div class="assignee-item ${isSelected ? "selected" : ""}" data-uid="${uid}" title="${u.username}">
        ${userAvatarHtml(u, 20)}
        <span class="assignee-name">${u.username || u.email || "User"}</span>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".assignee-item").forEach((item) => {
    item.onclick = () => {
      const uid = item.dataset.uid;
      if (selectedAssignees.includes(uid)) {
        selectedAssignees = selectedAssignees.filter((id) => id !== uid);
        item.classList.remove("selected");
      } else {
        selectedAssignees.push(uid);
        item.classList.add("selected");
      }
    };
  });
};


const openProjectModal = (pid = null) => {
  if (pid === null) {
    if (!checkPermission(currentUserPermissions, "project_add_project")) {
      showNotification(t("error_no_permission"), "error");
      return;
    }
  } else {
    const role = getProjectRole();
    if (role !== "admin" && !checkPermission(currentUserPermissions, "project_edit_project")) {
      showNotification(t("error_no_permission"), "error");
      return;
    }
  }

  editingProjectId = pid;
  selectedProjectMembers = [];
  const modal = $("project-modal");
  const title = $("project-modal-title");
  const nameInput = $("pm-name");
  const delBtn = $("project-modal-delete");
  const saveBtn = $("project-modal-save");
  const membersSec = $("project-members-section");

  if (nameInput) nameInput.classList.remove("error");
  const nerr = $("pm-name-error");
  if (nerr) nerr.classList.remove("visible");

  const msi = $("member-search-input");
  if (msi) msi.value = "";
  const msr = $("member-search-results");
  if (msr) msr.style.display = "none";

  if (pid) {
    const proj = projectsCache.find((p) => p._id === pid);
    if (title) title.textContent = t("project_settings") || "Project Settings";
    if (nameInput) nameInput.value = proj ? proj.name : "";
    selectedProjectMembers = proj && proj.members ? [...proj.members] : [];
    if (delBtn) delBtn.style.display = "block";
    if (saveBtn) saveBtn.textContent = t("save_changes") || "Save Changes";
    if (membersSec) membersSec.style.display = "block";
  } else {
    if (title) title.textContent = t("new_project") || "New Project";
    if (nameInput) nameInput.value = "";
    if (delBtn) delBtn.style.display = "none";
    if (saveBtn) saveBtn.textContent = t("create") || "Create";
    if (membersSec) membersSec.style.display = "none";
  }

  renderProjectMembersList();
  if (modal) modal.style.display = "flex";
  if (nameInput) setTimeout(() => nameInput.focus(), 100);
};

window.openProjectModal = openProjectModal;
window.removeProjectMember = (uid) => {
  if (getProjectRole() !== "admin") {
    showNotification(t("error_no_permission") || "Sizda bunday amalni bajarish uchun ruxsat yo'q", "error");
    return;
  }
  selectedProjectMembers = selectedProjectMembers.filter((m) => {
    const id = typeof m === "string" ? m : m.user?._id || m.user;
    return String(id) !== String(uid);
  });
  renderProjectMembersList("settings-project-members-list");
  renderProjectMembersList("project-members-list");
};

const searchUsersForProject = async (query) => {
  // Legacy function removed in favor of searchUsersForAddMember
};

const saveProject = async () => {
  const nameInput = $("pm-name");
  const nameError = $("pm-name-error");
  if (!nameInput) return;
  const name = nameInput.value.trim();

  if (name.length < 3) {
    nameInput.classList.add("error");
    if (nameError) {
      nameError.textContent = t("error_min_length_3") || "Kamida 3 ta belgi bo'lishi kerak";
      nameError.classList.add("visible");
    }
    return;
  }

  const saveBtn = $("project-modal-save");
  if (saveBtn) saveBtn.classList.add("loading");

  try {
    const isEdit = !!editingProjectId;
    const url = isEdit ? `${API_URL}/projects/${editingProjectId}` : `${API_URL}/projects`;
    const method = isEdit ? "PUT" : "POST";

    const cu = getCurrent();
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        name,
        createdBy: cu?._id || cu?.userId,
        members: selectedProjectMembers.map((m) => (typeof m === "string" ? { user: m, role: "member" } : m)),
      }),
    });

    if (res.ok) {
      const savedProj = await res.json();
      const modal = $("project-modal");
      if (modal) modal.style.display = "none";
      if (isEdit) {
        projectsCache = projectsCache.map((p) => (String(p._id) === String(editingProjectId) ? savedProj : p));
      } else {
        if (!projectsCache) projectsCache = [];
        projectsCache.push(savedProj);
        currentProjectId = savedProj._id;
        viewMode = "settings";
      }
      showNotification(isEdit ? t("project_updated") : t("project_created"), "success");
      await renderView(true);
    } else {
      showNotification(t("error_saving_project"), "error");
    }
  } catch (err) {
    showNotification(t("error_saving_project"), "error");
  } finally {
    if (saveBtn) saveBtn.classList.remove("loading");
  }
};

export const TodoPage = () => `
<div class="tasks-container">
  <!-- ── PROJECT SIDEBAR ── -->
  <aside class="projects-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title-row">
        <h2 class="sidebar-title">${t("projects") || "Projects"}</h2>
        <button id="todo-add-project-btn" class="add-project-btn" data-perm="task_add_project" title="Add Project">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="projects-search-wrap">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#8892a4" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#8892a4" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="text" id="project-search-input" placeholder="${t("search_projects") || "Search projects..."}" />
      </div>
    </div>
    <div class="projects-list" id="todo-project-list">
      <!-- Projects will be rendered here -->
    </div>
  </aside>

  <!-- ── MAIN CONTENT AREA ── -->
  <main class="tasks-main">
    <header class="tasks-header">
      <div class="header-project-info">
        <h1 id="todo-project-title">Select a Project</h1>
        <button id="project-overview-btn" class="project-settings-btn" style="width: max-content; padding: 0 12px; gap: 6px; display: none;" title="${t('project_overview')}">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span style="font-size: 14px; font-weight: 600;">${t("project_overview")}</span>
        </button>
      </div>

      <div class="header-actions">
        <div class="view-switch">
          <button class="view-tab active" id="tab-list">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span>${t("list_view")}</span>
          </button>
          <button class="view-tab" id="tab-board">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>
            <span>${t("board_view")}</span>
          </button>
        </div>
        <button class="create-task-btn" id="todo-create-task-btn" data-perm="task_add_task">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          <span>${t("add_task")}</span>
        </button>
      </div>
    </header>

    <div class="tasks-toolbar">
      <div class="tasks-search-wrap">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#8892a4" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#8892a4" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="text" id="todo-search" placeholder="${t("search_tasks") || "Filter tasks..."}" />
      </div>
      <div class="tasks-filters">
        <button class="filter-btn active" data-filter="all" id="filter-all">${t("filter_all") || "All"}</button>
        <button class="filter-btn" data-filter="todo" id="filter-todo">${t("filter_todo") || "Todo"}</button>
        <button class="filter-btn" data-filter="progress" id="filter-progress">${t("filter_progress") || "In Progress"}</button>
        <button class="filter-btn" data-filter="done" id="filter-done">${t("filter_done") || "Done"}</button>
      </div>
    </div>

    <div class="tasks-content">
      <div id="todo-no-projects" class="empty-state" style="display:none">
        <svg width="80" height="80" fill="none" viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4" stroke="#5b6ef5" stroke-width="2"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#5b6ef5" stroke-width="2"/>
        </svg>
        <p id="no-projects-msg"></p>
      </div>
    <div id="todo-view-container" class="view-container"></div>
  </div>
</main>
</div>

<!-- ══ TASK CREATE/EDIT MODAL ══ -->
<div id="task-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal">
    <div class="todo-modal-header">
      <h3 id="task-modal-title">Create Task</h3>
      <button class="todo-modal-close" id="task-modal-close">✕</button>
    </div>
    <div class="todo-modal-body">
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-task-name">Task Name</label>
        <input class="todo-form-input" id="tm-title" placeholder="Enter task title..." />
        <span class="todo-form-error" id="tm-title-error"></span>
      </div>
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-task-file">${t("attach_file_pdf") || "PDF Fayl biriktirish (max 5MB)"}</label>
        <div class="custom-file-upload">
          <input type="file" id="tm-file" accept="application/pdf" class="hidden-file-input" multiple />
          <label for="tm-file" class="file-upload-label">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m-8-8h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="file-upload-text">${t("choose_file") || "Fayl tanlash"}</span>
          </label>
        </div>
        <div id="tm-file-list" style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;"></div>
        <div id="tm-file-quota" style="font-size: 11px; color: #64748b; text-align: right; margin-top: 4px;">0.00 MB / 5.00 MB</div>
        <span class="todo-form-error" id="tm-file-error"></span>
      </div>
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-task-desc">Description</label>
        <textarea class="todo-form-input" id="tm-desc" rows="3" placeholder="Description..."></textarea>
      </div>
      <div class="todo-form-row">
        <div class="todo-form-group">
          <label class="todo-form-label" id="lbl-task-status">Status</label>
          <select class="todo-form-input" id="tm-status"></select>
        </div>
        <div class="todo-form-group">
          <label class="todo-form-label" id="lbl-task-priority">Priority</label>
          <select class="todo-form-input" id="tm-priority"></select>
        </div>
      </div>
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-task-assignee">Assignees</label>
        <div class="todo-assignee-picker" id="tm-assignee-picker"></div>
      </div>
      <div class="todo-form-row">
        <div class="todo-form-group">
          <label class="todo-form-label" id="lbl-task-startdate">${t("start_date_label")}</label>
          <input class="todo-form-input" type="date" id="tm-startdate" />
        </div>
        <div class="todo-form-group">
          <label class="todo-form-label" id="lbl-task-duedate">${t("duedate_label")}</label>
          <input class="todo-form-input" type="date" id="tm-duedate" />
        </div>
      </div>
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-task-estimated">${t("estimated_time_label")}</label>
        <input class="todo-form-input" type="number" id="tm-estimated" min="0" placeholder="0" />
      </div>
    </div>
    <div class="todo-modal-footer">
      <button class="todo-btn-secondary" id="task-modal-cancel">Cancel</button>
      <button class="todo-btn-primary"   id="task-modal-save">Create</button>
    </div>
  </div>
</div>

<!-- ══ TASK DETAIL MODAL ══ -->
<div id="task-detail-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-detail-modal premium-modal">
    <div class="todo-detail-header">
      <div class="todo-detail-header-left">
        <span class="todo-detail-status-badge" id="td-status-badge"></span>
      </div>
      <div class="todo-detail-header-right">
        <button class="todo-detail-edit-btn" id="td-edit-btn">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span id="td-edit-label">Edit</span>
        </button>
        <button class="todo-modal-close" id="task-detail-close">✕</button>
      </div>
    </div>

    <div class="todo-detail-body">
      <div class="todo-detail-main">
        <h2 class="todo-detail-title" id="td-title"></h2>
        
        <div class="todo-detail-section">
          <p class="todo-detail-section-label" id="td-lbl-desc">Description</p>
          <p class="todo-detail-desc" id="td-desc"></p>
        </div>

        <div class="todo-detail-time-tracking" id="td-time-section">
            <div class="time-track-header">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span id="td-lbl-time-track">${t("total_spent")}</span>
            </div>
            <div class="time-track-stats">
                <div class="time-stat-box">
                    <span class="time-stat-label">${t("estimated_time_label")}</span>
                    <span class="time-stat-value"><span id="td-val-estimated">0</span> ${t("hours")}</span>
                </div>
                <div class="time-stat-box highlight">
                    <span class="time-stat-label">${t("total_spent")}</span>
                    <span class="time-stat-value"><span id="td-val-actual">0</span> ${t("hours")}</span>
                </div>
            </div>
            
            <div class="time-progress-bar">
                <div class="time-progress-fill" id="td-time-progress"></div>
            </div>

            <div class="log-time-action" id="td-log-time-container" style="display:none">
                <div class="todo-form-group" style="margin-top: 15px;">
                    <label class="todo-form-label">${t("actual_time_label")}</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="number" id="td-log-input" class="todo-form-input" min="0" step="0.5" placeholder="0" style="flex: 1" />
                        <button class="todo-btn-primary" id="td-log-btn" style="padding: 0 20px;">${t("log_time")}</button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div class="todo-detail-side">
        <p class="todo-detail-meta-heading" id="td-lbl-details">Details</p>
        
        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-status">Status</span>
          <span id="td-meta-status"></span>
        </div>
        
        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-priority">Priority</span>
          <span id="td-meta-priority"></span>
        </div>

        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-startdate">${t("start_date_label")}</span>
          <span id="td-meta-startdate" class="todo-detail-meta-val"></span>
        </div>
        
        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-duedate">Due Date</span>
          <span id="td-meta-duedate"></span>
        </div>
        
        <div class="todo-detail-meta-row" id="td-meta-file-container" style="display:none">
          <span class="todo-detail-meta-key">Fayllar</span>
          <div id="td-meta-file" style="display:flex; flex-direction:column; gap:4px"></div>
        </div>
        
        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-assignees">Assignees</span>
          <div class="todo-detail-assignees" id="td-meta-assignees"></div>
        </div>
        
        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-created">Created</span>
          <span class="todo-detail-meta-val" id="td-meta-created"></span>
        </div>
        
        <div class="todo-detail-meta-row">
          <span class="todo-detail-meta-key" id="td-lbl-createdby">Author</span>
          <span class="todo-detail-meta-val" id="td-meta-createdby"></span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══ NO PROJECT MODAL ══ -->
<div id="no-project-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal" style="max-width:460px;text-align:center;padding:20px">
    <div class="todo-del-icon-wrap" style="background:#fff3cd;border-color:#fcd34d">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/></svg>
    </div>
    <h3 class="todo-del-title" id="noproj-title"></h3>
    <p  class="todo-del-desc"  id="noproj-desc"></p>
    <div class="todo-del-actions">
      <button class="todo-btn-secondary" id="noproj-cancel-btn"></button>
      <button class="todo-btn-primary"   id="noproj-create-btn"></button>
    </div>
  </div>
</div>
<!-- ══ ADD MEMBER MODAL ══ -->
<div id="add-member-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal" style="max-width:650px;">
    <div class="todo-modal-header">
      <h3>${t("add_member") || "Add Member"}</h3>
      <button class="todo-modal-close" id="add-member-modal-close">✕</button>
    </div>
    <div class="todo-modal-body" style="padding: 20px;">
      <div class="member-search-box-large" style="margin-bottom: 12px;">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#8892a4" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#8892a4" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="text" id="add-member-search-input" placeholder="${t("search_users_placeholder")}" />
      </div>
      <div id="add-member-results" class="member-results-dropdown-inline" style="max-height: 350px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;"></div>
      
      <!-- Pagination Controls -->
      <div class="modal-pagination-controls" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b;">
          <span>${t("show") || "Ko'rsatish"}:</span>
          <select id="add-member-limit-select" style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; outline: none; font-size: 13px;">
            <option value="5" selected>5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="add-member-prev-page" class="todo-btn-secondary" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">&larr; ${t("prev") || "Oldingi"}</button>
          <span id="add-member-page-info" style="font-size: 13px; font-weight: 500; color: #334155; min-width: 60px; text-align: center;">1 / 1</span>
          <button id="add-member-next-page" class="todo-btn-secondary" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">${t("next") || "Keyingi"} &rarr;</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══ PROJECT MODAL ══ -->
<div id="project-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal" style="max-width:500px">
    <div class="todo-modal-header">
      <h3 id="project-modal-title">Project Settings</h3>
      <button class="todo-modal-close" id="project-modal-close">✕</button>
    </div>
    <div class="todo-modal-body">
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-project-name">Project Name</label>
        <input class="todo-form-input" id="pm-name" placeholder="Enter project name..." />
        <span class="todo-form-error" id="pm-name-error"></span>
      </div>
      <div id="project-members-section" style="margin-top: 24px; display: none;">
        <label class="todo-form-label">Manage Members</label>
        <div class="member-search-container">
          <div class="member-search-box">
             <input type="text" id="member-search-input" placeholder="Search by username or email..." />
          </div>
          <div id="member-search-results" class="member-results-dropdown" style="display:none"></div>
        </div>
        <div id="project-members-list" class="project-members-list"></div>
      </div>
    </div>
    <div class="todo-modal-footer">
      <button class="todo-btn-danger" id="project-modal-delete" style="display:none; margin-right: auto;">Delete Project</button>
      <button class="todo-btn-secondary" id="project-modal-cancel">Cancel</button>
      <button class="todo-btn-primary"   id="project-modal-save">Save Changes</button>
    </div>
  </div>
</div>

<!-- ══ DELETE CONFIRM MODAL ══ -->
<div id="todo-del-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal" style="max-width:460px;text-align:center;padding:20px">
    <div class="todo-del-icon-wrap">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>
    </div>
    <h3 class="todo-del-title" id="del-modal-title"></h3>
    <p  class="todo-del-desc"  id="del-modal-desc"></p>
    <div class="todo-del-actions">
      <button class="todo-btn-secondary" id="del-modal-cancel">Cancel</button>
      <button class="todo-btn-danger"    id="del-modal-confirm">Delete</button>
    </div>
  </div>
</div>
`;

// ─── PROJECT SIDEBAR ──────────────────────────────────────────
const renderProjectSidebar = async () => {
  const projects = await fetchProjects();
  const listEl = $("todo-project-list");
  if (!listEl) return;

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()));

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="sidebar-empty">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>${t("no_projects_found") || "No projects found"}</span>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map(
      (p) => `
      <div class="project-item ${p._id === currentProjectId ? "active" : ""}" data-pid="${p._id}">
        <div class="project-icon-box">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="project-name">${p.name}</span>
        <div class="project-item-actions">
           <span class="task-count-badge">...</span>
        </div>
      </div>
    `,
    )
    .join("");

  listEl.querySelectorAll(".project-item").forEach((item) => {
    item.addEventListener("click", () => {
      currentProjectId = item.dataset.pid;
      viewMode = "tasks";
      renderProjectSidebar();
      renderView();
    });
  });

  filtered.forEach(async (p) => {
    const tasks = await fetchTasks(p._id);
    const badge = listEl.querySelector(`.project-item[data-pid="${p._id}"] .task-count-badge`);
    if (badge) badge.textContent = tasks.length;
  });
};

const initProjectSidebarEvents = () => {
  const searchInput = $("project-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      projectSearchQuery = e.target.value;
      renderProjectSidebar();
    });
  }

  const addBtn = $("todo-add-project-btn");
  if (addBtn) {
    addBtn.onclick = () => openProjectModal();
  }

  const addBtnEmpty = $("todo-add-project-btn-empty");
  if (addBtnEmpty) {
    addBtnEmpty.onclick = () => openProjectModal();
  }

  const overviewBtn = $("project-overview-btn");
  if (overviewBtn) {
    overviewBtn.onclick = () => {
      if (currentProjectId) {
        viewMode = "overview";
        renderView();
      }
    };
  }
};

const showLoader = (force = false) => {
  const container = $("todo-view-container");
  if (container && (force || container.innerHTML.trim() === "")) {
    container.innerHTML = `
      <div class="todo-loader-container">
        <div class="todo-spinner"></div>
      </div>`;
  }
};

const renderView = async (forceRefresh = false) => {
  const container = document.getElementById("todo-view-container");
  if (!container) return;

  const cu = getCurrent();
  if (viewMode === "overview") {
    const overviewBtn = $("project-overview-btn");
    if (overviewBtn) overviewBtn.style.display = "none";
  }
  if (cu) {
    currentUserPermissions = await getPermissions(cu.userId || cu._id);
  }

  showLoader(forceRefresh);

  const projects = (await fetchProjects(forceRefresh)) || [];

  if (projects.length > 0) {
    if (!currentProjectId || !projects.find((p) => p._id === currentProjectId)) {
      currentProjectId = projects[0]._id;
    }
  }

  await renderProjectSidebar();

  const noProj = $("todo-no-projects");
  const settingsBtn = $("project-settings-btn");
  const tasksToolbar = document.querySelector(".tasks-toolbar");
  const tasksContent = document.querySelector(".tasks-content");

  if (projects.length === 0) {
    if (noProj) {
      noProj.style.display = "flex";
      $("no-projects-msg").textContent = t("no_projects");
    }
    const viewContainer = $("todo-view-container");
    if (viewContainer) viewContainer.style.display = "none";
    if (settingsBtn) settingsBtn.style.display = "none";
    if (tasksToolbar) tasksToolbar.style.display = "none";
    container.innerHTML = "";
    if ($("todo-project-title")) $("todo-project-title").textContent = t("todo_title");
    return;
  }

  const viewContainer = $("todo-view-container");
  if (viewContainer) viewContainer.style.display = "block";

  if (noProj) noProj.style.display = "none";
  const overviewBtn = $("project-overview-btn");
  if (overviewBtn) overviewBtn.style.display = (viewMode === "overview" || viewMode === "task-detail" || viewMode === "task-history") ? "none" : "flex";

  const proj = projects.find((p) => String(p._id) === String(currentProjectId));
  if ($("todo-project-title")) $("todo-project-title").textContent = proj ? proj.name : "Select Project";

  // Har qanday viewMode'da (list, board, task-detail) tasklarni chaqirib olish yoki keshdan olish
  const allTasks = await fetchTasks(currentProjectId, forceRefresh);

  if (viewMode === "overview" || viewMode === "task-detail" || viewMode === "task-history") {
    if (tasksToolbar) tasksToolbar.style.display = "none";
    if (tasksContent) tasksContent.classList.add("settings-mode");

    // Disable header buttons in settings/history/task-detail
    [$("tab-list"), $("tab-board"), $("todo-create-task-btn")].forEach((btn) => {
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.pointerEvents = "none";
      }
    });

    if (viewMode === "overview") {
      await renderProjectOverviewView();
    } else if (viewMode === "task-detail") {
      await renderTaskDetailView();
    } else if (viewMode === "task-history") {
      await renderTaskHistoryView();
    }
  } else {
    if (tasksToolbar) tasksToolbar.style.display = "flex";
    if (tasksContent) tasksContent.classList.remove("settings-mode");

    // Re-enable header buttons
    [$("tab-list"), $("tab-board"), $("todo-create-task-btn")].forEach((btn) => {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
      }
    });

    let tasks = allTasks;
    if (currentFilter !== "all") tasks = tasks.filter((t) => getVisibleStatus(t) === currentFilter);
    if (searchQuery) tasks = tasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()));

    if (currentView === "list") renderListView(tasks);
    else renderBoardView(tasks);
  }

  if (cu) {
    applyPermissions(cu.userId || cu._id);
    applyProjectPermissions();
  }
};

const renderListView = (tasks) => {
  const container = $("todo-view-container");
  if (!container) return;
  const statuses = ["todo", "progress", "done"];
  let html = `<div class="todo-list-view">`;

  statuses.forEach((status) => {
    const statusTasks = tasks.filter((t) => getVisibleStatus(t) === status);
    if (currentFilter !== "all" && currentFilter !== status) return;
    const cfg = statusConfig[status];
    html += `
        <div class="todo-list-section">
          <div class="todo-list-section-header" data-collapse="${status}">
            <div class="todo-section-header-left">
              <svg class="todo-collapse-icon" data-status="${status}" width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              <span class="todo-section-label ${cfg.cls}">
                <span class="todo-section-dot ${cfg.cls}"></span>
                ${cfg.label()}
              </span>
              <span class="todo-section-count ${cfg.cls}">${tasks.filter((t) => getVisibleStatus(t) === status).length}</span>
            </div>
            <button class="todo-add-in-section" data-status="${status}" data-perm="task_add_task">+ ${t("add_task")}</button>
          </div>
           <div class="todo-list-section-body" id="list-section-${status}">
            <div class="todo-list-table-header">
              <span class="todo-col-name">${t("task_name_col")}</span>
              <span class="todo-col-center">${t("status_label")}</span>
              <span class="todo-col-center">${t("assignee")}</span>
              <span class="todo-col-center">${t("due_date")}</span>
              <span class="todo-col-center">${t("priority")}</span>
              <span class="todo-col-center">${t("actions")}</span>
            </div>
            ${statusTasks.length ? statusTasks.map((task) => renderListRow(task)).join("") : `<div class="todo-list-empty">${t("no_tasks")}</div>`}
          </div>
        </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
  attachListEvents(container);
};

const renderListRow = (task) => {
  const owner = isOwner(task);
  const canEdit = owner;
  const canDel = owner;
  const myStatus = getVisibleStatus(task);
  const myDone = myStatus === "done";
  
  const role = getProjectRole();
  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;
  const isAssignee = task.assignees && task.assignees.some((a) => String(a._id || a) === String(cuId));
  const canChangeStatus = role === "admin" || (role === "member" && isAssignee);

  return `
    <div class="todo-list-row todo-row-clickable" data-tid="${task._id}">
      <div class="todo-row-name-cell">
        <button class="todo-check-btn ${myDone ? "checked" : ""}" data-tid="${task._id}" data-action="check" style="${canChangeStatus ? "" : "display:none;"}">
          ${myDone ? `<svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/></svg>` : ""}
        </button>
        <span class="todo-row-title ${myDone ? "done-text" : ""}">${task.title}</span>
      </div>
      <div class="todo-row-center-cell">
        <div class="todo-list-status-custom-select s-${myStatus} ${canChangeStatus ? "" : "disabled"}" data-tid="${task._id}" data-action="change-status-custom" style="${canChangeStatus ? "" : "pointer-events:none;"}">
          <div style="width:max-content;" class="status-selected">
            <span>${myStatus === "todo" ? t("status_todo") : myStatus === "progress" ? t("status_progress") : t("status_done")}</span>
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <ul class="status-options">
            <li data-value="todo" class="${myStatus === "todo" ? "active" : ""}">
              <span>${t("status_todo")}</span>
            </li>
            <li data-value="progress" class="${myStatus === "progress" ? "active" : ""}">
              <span>${t("status_progress")}</span>
            </li>
            <li data-value="done" class="${myStatus === "done" ? "active" : ""}">
              <span>${t("status_done")}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="todo-row-center-cell">${assigneeStackHtml(task, 26)}</div>
      <div class="todo-row-center-cell">${dueDateHtml(task.dueDate)}</div>
      <div class="todo-row-center-cell">${getPriorityBadge(task.priority || "none")}</div>
      <div class="todo-row-actions-cell">
        ${
          canEdit
            ? `
        <button class="todo-row-edit todo-action-btn edit" data-tid="${task._id}" data-action="edit" title="${t("edit")}">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>`
            : ""
        }
        ${
          canDel
            ? `
        <button class="todo-row-del todo-action-btn del" data-tid="${task._id}" data-action="del" title="${t("delete")}">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>`
            : ""
        }
      </div>
    </div>`;
};

const attachListEvents = (container) => {
  container.querySelectorAll(".todo-list-section-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      if (e.target.closest(".todo-add-in-section")) return;
      const status = header.dataset.collapse;
      const body = $(`list-section-${status}`);
      const icon = container.querySelector(`.todo-collapse-icon[data-status="${status}"]`);
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "block" : "none";
      if (icon) icon.style.transform = hidden ? "rotate(0deg)" : "rotate(-90deg)";
    });
  });

  container.querySelectorAll(".todo-add-in-section").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openTaskModal(null, btn.dataset.status);
    });
  });

  container.querySelectorAll(".todo-list-status-custom-select").forEach((select) => {
    const selected = select.querySelector(".status-selected");
    const options = select.querySelector(".status-options");
    const items = select.querySelectorAll(".status-options li");

    selected.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Close all other open status dropdowns
      document.querySelectorAll(".todo-list-status-custom-select").forEach((otherSelect) => {
        if (otherSelect !== select) {
          otherSelect.classList.remove("open");
          const otherOptions = otherSelect.querySelector(".status-options");
          if (otherOptions) otherOptions.style.display = "none";
          const otherChevron = otherSelect.querySelector(".chevron-icon");
          if (otherChevron) otherChevron.style.transform = "rotate(0deg)";
        }
      });

      const isOpen = options.style.display === "block";
      
      if (!isOpen) {
        const rect = selected.getBoundingClientRect();
        if (rect.bottom > window.innerHeight * 0.7) {
          options.classList.add("open-upwards");
        } else {
          options.classList.remove("open-upwards");
        }
      }

      options.style.display = isOpen ? "none" : "block";
      select.classList.toggle("open", !isOpen);
      const chevron = selected.querySelector(".chevron-icon");
      if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });

    items.forEach((item) => {
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        options.style.display = "none";
        select.classList.remove("open");
        const chevron = selected.querySelector(".chevron-icon");
        if (chevron) chevron.style.transform = "rotate(0deg)";

        const taskId = select.dataset.tid;
        const nextStatus = item.dataset.value;
        if (!taskId || !nextStatus) return;

        const role = getProjectRole();
        
        const tasks = tasksCache[currentProjectId] || [];
        const task = tasks.find((t) => String(t._id) === String(taskId));
        const cu = getCurrent();
        const cuId = cu?.userId || cu?._id;
        const isAssignee = task && task.assignees && task.assignees.some((a) => String(a._id || a) === String(cuId));

        if (role === "viewer" || (role === "member" && !isAssignee)) {
          showNotification(t("error_no_permission"), "error");
          renderView(true);
          return;
        }

        try {
          let url = `${API_URL}/${taskId}/status`;
          let body = { status: nextStatus };

          const myId = String(getCurrent()?.userId || getCurrent()?._id || "");
          updateLocalTaskCache({ _id: taskId, status: nextStatus, userStatus: { [myId]: nextStatus } }, currentProjectId);
          renderView();

          const res = await fetch(url, {
            method: "PATCH",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify(body),
          });

          if (res.ok) {
            const updated = await res.json();
            updateLocalTaskCache(updated, currentProjectId);
            renderView();
            showNotification(t("status_updated") || "Status updated", "success");
          } else {
            throw new Error("Update failed");
          }
        } catch (err) {
          console.error("Change status error:", err);
          showNotification(t("error_updating_task") || "Error updating task", "error");
          renderView(true);
        }
      });
    });
  });

  container.querySelectorAll(".todo-row-clickable").forEach((row) => {
    row.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (action) {
        e.stopPropagation();
        const tid = action.dataset.tid;
        const act = action.dataset.action;
        if (act === "edit") openTaskModal(tid);
        if (act === "del") deleteTask(tid);
        if (act === "check") toggleDone(tid);
        return;
      }
      const tid = row.dataset.tid;
      if (tid) openDetailModal(tid);
    });
  });
};

const renderBoardView = (tasks) => {
  const container = $("todo-view-container");
  if (!container) return;
  const columns = [
    { key: "todo", label: t("status_todo") },
    { key: "progress", label: t("status_progress") },
    { key: "done", label: t("status_done") },
  ];
  let html = `<div style="display: flex; gap: 20px;" class="todo-board-view">`;
  columns.forEach((col) => {
    const colTasks = tasks.filter((t) => getVisibleStatus(t) === col.key);
    const cfg = statusConfig[col.key];
    html += `
        <div class="todo-board-col" data-col="${col.key}">
          <div class="todo-board-col-header">
            <div class="todo-board-col-title">
              <span class="todo-board-col-dot ${cfg.cls}"></span>
              <span class="todo-board-col-label ${cfg.cls}">${col.label}</span>
              <span class="todo-board-col-count ${cfg.cls}">${colTasks.length}</span>
            </div>
            <button class="todo-board-add-btn" data-col="${col.key}" data-perm="task_add_task">+</button>
          </div>
          <div class="todo-board-col-body" id="board-col-${col.key}" data-col="${col.key}">
            ${colTasks.length ? colTasks.map((task) => renderBoardCard(task)).join("") : `<div class="todo-board-empty">${t("empty_column")}</div>`}
          </div>
        </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll(".todo-board-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => openTaskModal(null, btn.dataset.col));
  });
  container.querySelectorAll(".todo-board-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (action) {
        e.stopPropagation();
        const tid = action.dataset.tid;
        const act = action.dataset.action;
        if (act === "edit") openTaskModal(tid);
        if (act === "del") deleteTask(tid);
        if (act === "check") toggleDone(tid);
        return;
      }
      const tid = card.dataset.tid;
      if (tid) openDetailModal(tid);
    });
  });
  initDragDrop();
};

const renderBoardCard = (task) => {
  const owner = isOwner(task);
  const myStatus = getVisibleStatus(task);
  const myDone = myStatus === "done";
  
  const role = getProjectRole();
  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;
  const isAssignee = task.assignees && task.assignees.some((a) => String(a._id || a) === String(cuId));
  const canChangeStatus = role === "admin" || (role === "member" && isAssignee);

  return `
    <div class="todo-board-card" draggable="${canChangeStatus ? "true" : "false"}" data-tid="${task._id}">
      <div class="todo-card-top">
        <button class="todo-check-btn ${myDone ? "checked" : ""}" data-tid="${task._id}" data-action="check" style="${canChangeStatus ? "" : "display:none;"}">
          ${myDone ? `<svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/></svg>` : ""}
        </button>
        <span class="todo-card-title ${myDone ? "done-text" : ""}">${task.title}</span>
        <div class="todo-card-actions">
          ${
            owner
              ? `
          <button class="todo-action-btn edit" data-tid="${task._id}" data-action="edit">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button class="todo-action-btn del" data-tid="${task._id}" data-action="del">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>`
              : ""
          }
        </div>
      </div>
      ${task.description ? `<p class="todo-card-desc">${task.description}</p>` : ""}
      <div class="todo-card-footer">
        <div class="todo-card-footer-left">
          ${getPriorityBadge(task.priority || "none")}
          ${dueDateHtml(task.dueDate)}
        </div>
        ${assigneeStackHtml(task, 24)}
      </div>
    </div>`;
};

const initDragDrop = () => {
  document.querySelectorAll(".todo-board-card[draggable='true']").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragSrcTask = card.dataset.tid;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.tid);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      dragSrcTask = null;
    });
  });

  document.querySelectorAll(".todo-board-col-body").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");

      const draggingCard = document.querySelector(".todo-board-card.dragging");
      if (!draggingCard) return;

      const afterElement = getDragAfterElement(col, e.clientY);
      if (afterElement == null) {
        col.appendChild(draggingCard);
      } else {
        col.insertBefore(draggingCard, afterElement);
      }
    });

    col.addEventListener("dragleave", () => {
      col.classList.remove("drag-over");
    });

    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const taskId = dragSrcTask;
      const newCol = col.dataset.col;
      if (!taskId || !newCol) return;

      const cu = getCurrent();
      if (!cu) return;

      const role = getProjectRole();
      const cuId = cu?.userId || cu?._id;
      
      const tasksObj = tasksCache[currentProjectId] || [];
      const draggedTask = tasksObj.find((t) => String(t._id) === String(taskId));
      const isAssignee = draggedTask && draggedTask.assignees && draggedTask.assignees.some((a) => String(a._id || a) === String(cuId));

      if (role === "viewer" || (role === "member" && !isAssignee)) {
        showNotification(t("error_no_permission"), "error");
        renderView(true);
        return;
      }

      try {
        const tasks = tasksCache[currentProjectId] || [];
        const task = tasks.find((t) => String(t._id) === String(taskId));
        if (!task) return;

        const cuId = cu?.userId || cu?._id;
        const isAssignee = task.assignees.some((a) => String(a._id || a) === String(cuId));
        const role = getProjectRole();

        // Agar assignee "done" ustuniga sursa yoki undan chiqarsa, toggleUserDone mantiqini ishlatamiz
        if (isAssignee && (newCol === "done" || task.userStatus?.[cuId] === "done")) {
          const currentMyDone = task.userStatus?.[cuId] === "done";
          const draggingToDone = newCol === "done";

          // Faqat status haqiqatdan o'zgarganda (masalan progressdan done-ga yoki aksincha)
          if (currentMyDone !== draggingToDone) {
            toggleDone(taskId);
            return;
          }
        }

        let url = `${API_URL}/${taskId}/status`;
        let body = { status: newCol };

        const myId = String(cu?.userId || cu?._id || "");
        updateLocalTaskCache({ _id: taskId, status: newCol, userStatus: { [myId]: newCol } }, currentProjectId);
        renderView();

        fetch(url, {
          method: "PATCH",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(body),
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Update failed");
          })
          .then((updated) => {
            updateLocalTaskCache(updated, currentProjectId);
            showNotification(t("status_updated") || "Status updated", "success");
          })
          .catch((err) => {
            console.error("Drop error:", err);
            showNotification(t("error_updating_task") || "Error updating task", "error");
            renderView(true);
          });
      } catch (err) {
        console.error("Drop handling error:", err);
        renderView(true);
      }
    });
  });
};

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".todo-board-card:not(.dragging)")];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

const toggleDone = (tid) => {
  const role = getProjectRole();
  if (role === "viewer") {
    showNotification(t("error_no_permission"), "error");
    return;
  }

  const tasks = tasksCache[currentProjectId] || [];
  const task = tasks.find((t) => t._id === tid);
  if (!task) return;

  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;
  const isAssignee = task.assignees && task.assignees.some((a) => String(a._id || a) === String(cuId));

  if (role === "member" && !isAssignee) {
    showNotification(t("error_no_permission"), "error");
    return;
  }

  // Agar user assignee bo'lsa, /toggle-user-done chaqiramiz
  // Aks holda (Admin/Owner) statusni global o'zgartiradi
  const url = isAssignee ? `${API_URL}/${tid}/toggle-user-done` : `${API_URL}/${tid}/status`;
  const method = isAssignee ? "PATCH" : "PATCH"; // Ikkala holatda ham PATCH

  const nextStatus = task.status === "done" ? "todo" : "done";
  const body = isAssignee ? {} : { status: nextStatus };

  // Optimistik yangilash: Serverdan javob kelishini kutmasdan UI-ni yangilaymiz
  if (isAssignee) {
    if (!task.userStatus) task.userStatus = {};
    task.userStatus[cuId] = task.userStatus[cuId] === "done" ? "progress" : "done";
  } else {
    task.status = nextStatus;
  }
  updateLocalTaskCache(task, currentProjectId);
  renderView();

  fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (res.ok) return res.json();
      return res.json().then((err) => {
        throw new Error(err.message || "Update failed");
      });
    })
    .then((updated) => {
      updateLocalTaskCache(updated, currentProjectId);
      showNotification(t("status_updated") || "Status updated", "success");
    })
    .catch((err) => {
      console.error("Toggle error:", err);
      showNotification(err.message || t("error_updating_status"), "error");
      renderView(true);
    });
};

// ─── NO-PROJECT MODAL ────────────────────────────────────────
const showNoProjectModal = () => {
  $("noproj-title").textContent = t("no_projects_title");
  $("noproj-desc").textContent = t("no_projects_desc");
  $("noproj-create-btn").textContent = t("add_project");
  $("noproj-cancel-btn").textContent = t("cancel");
  $("no-project-modal").style.display = "flex";
};

const deleteTask = (tid) => {
  const isProject = tid === null;
  const role = getProjectRole();
  const perm = isProject ? "project_delete_project" : "task_delete_task";

  if (role !== "admin" && !checkPermission(currentUserPermissions, perm)) {
    showNotification(t("error_no_permission"), "error");
    return;
  }
  const idToDelete = isProject ? currentProjectId : tid;
  const msg = isProject ? t("confirm_delete_project") || "Loyihani va uning barcha vazifalarini o'chirib tashlamoqchimisiz?" : t("confirm_delete_task") || "Ushbu vazifani o'chirib tashlamoqchimisiz?";

  showDeleteConfirm(msg, async () => {
    const url = isProject ? `${API_URL}/projects/${idToDelete}` : `${API_URL}/${idToDelete}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (res.ok) {
      if (isProject) {
        if (projectsCache) {
          projectsCache = projectsCache.filter((p) => p._id !== idToDelete);
        }
        currentProjectId = null;
        viewMode = "tasks";
        $("project-modal").style.display = "none";
        showNotification(t("project_deleted") || "Loyiha o'chirildi", "success");
      } else {
        showNotification(t("task_deleted") || "Vazifa o'chirildi", "success");
      }
      await renderView(true);
    } else {
      showNotification(t("error_deleting") || "O'chirishda xatolik yuz berdi", "error");
    }
  });
};

// ─── TASK CREATE / EDIT MODAL ─────────────────────────────────
const openTaskModal = async (taskId, defaultStatus = "todo") => {
  if (taskId === null) {
    if (!checkPermission(currentUserPermissions, "task_add_task")) {
      showNotification(t("error_no_permission"), "error");
      return;
    }
  } else {
    const role = getProjectRole();
    if (role !== "admin" && !checkPermission(currentUserPermissions, "task_edit_task")) {
      showNotification(t("error_no_permission"), "error");
      return;
    }
  }

  editingTaskId = taskId || null;
  const tasks = await fetchTasks(currentProjectId);
  const task = taskId ? tasks.find((t) => t._id === taskId) : null;

  $("task-modal-title").textContent = task ? t("modal_edit_task") : t("modal_create_task");
  $("lbl-task-name").textContent = t("task_label");
  $("lbl-task-desc").textContent = t("description_label");
  $("lbl-task-status").textContent = t("status_label");
  $("lbl-task-priority").textContent = t("priority_label");
  $("lbl-task-assignee").textContent = t("assignee_label");
  $("lbl-task-duedate").textContent = t("duedate_label");
  $("task-modal-cancel").textContent = t("cancel");
  $("task-modal-save").textContent = task ? t("save") : t("create");

  $("tm-status").innerHTML = `
        <option value="todo">${t("status_todo")}</option>
        <option value="progress">${t("status_progress")}</option>
        <option value="done">${t("status_done")}</option>`;
  $("tm-priority").innerHTML = `
        <option value="none">${t("priority_none")}</option>
        <option value="low">${t("priority_low")}</option>
        <option value="medium">${t("priority_medium")}</option>
        <option value="high">${t("priority_high")}</option>
        <option value="urgent">${t("priority_urgent")}</option>`;

  // Init selected assignees
  selectedAssignees = (task?.assignees || []).map((u) => u._id || u);
  renderAssigneePicker();

  $("tm-title").value = task?.title || "";
  $("tm-desc").value = task?.description || "";
  $("tm-status").value = task?.status || defaultStatus;
  $("tm-priority").value = task?.priority || "none";
  $("tm-startdate").value = task?.startDate ? task.startDate.split("T")[0] : "";
  $("tm-duedate").value = task?.dueDate ? task.dueDate.split("T")[0] : "";
  $("tm-estimated").value = task?.estimatedTime || 0;

  $("tm-title").placeholder = t("task_title_placeholder");
  $("tm-desc").placeholder = t("task_desc_placeholder");

  // Clear error states
  $("tm-title").classList.remove("error");
  $("tm-title-error").classList.remove("visible");
  $("tm-title-error").textContent = "";

  $("task-modal").style.display = "flex";
  
  const fileInput = $("tm-file");
  const fileList = $("tm-file-list");
  const fileQuota = $("tm-file-quota");
  
  let currentExistingSize = 0;
  if (task && task.files && task.files.length > 0) {
      currentExistingSize = task.files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
  }
  
  window.currentTaskNewFiles = [];
  const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5 MB

  window.renderFileList = () => {
      if (!fileList || !fileQuota) return;
      fileList.innerHTML = "";
      
      let newFilesSize = window.currentTaskNewFiles.reduce((acc, f) => acc + f.size, 0);
      let totalSize = currentExistingSize + newFilesSize;
      
      fileQuota.textContent = `${(totalSize / 1024 / 1024).toFixed(2)} MB / 5.00 MB`;
      fileQuota.style.color = totalSize > MAX_TOTAL_SIZE ? "#ef4444" : "#64748b";

      window.currentTaskNewFiles.forEach((file, index) => {
          const item = document.createElement("div");
          item.style = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;";
          item.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#5b6ef5" stroke-width="2" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="#5b6ef5" stroke-width="2" stroke-linejoin="round"/></svg>
                  <span style="font-size: 12px; color: #1a1d2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
                  <span style="font-size: 10px; color: #8892a4; flex-shrink:0">(${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button type="button" class="todo-remove-file-btn" data-index="${index}" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:2px; display:flex;">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
          `;
          fileList.appendChild(item);
      });
      
      fileList.querySelectorAll(".todo-remove-file-btn").forEach(btn => {
          btn.onclick = (e) => {
              const idx = parseInt(e.currentTarget.dataset.index);
              window.currentTaskNewFiles.splice(idx, 1);
              window.renderFileList();
          }
      });
  };

  if (fileInput) {
    fileInput.value = "";
    window.renderFileList();
    
    fileInput.onchange = (e) => {
      const selected = Array.from(e.target.files);
      if (selected.length > 0) {
        const validFiles = selected.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (validFiles.length < selected.length) {
            showNotification("Faqat PDF fayllarni yuklash mumkin", "warning");
        }
        
        validFiles.forEach(f => {
            window.currentTaskNewFiles.push(f);
        });
        
        window.renderFileList();
      }
      fileInput.value = ""; 
    };
  }
  
  setTimeout(() => $("tm-title").focus(), 100);
};

const saveTask = async () => {
  const role = getProjectRole();
  if (role !== "admin") {
    showNotification(t("error_no_permission"), "error");
    return;
  }
  const titleInput = $("tm-title");
  const titleError = $("tm-title-error");
  const title = titleInput.value.trim();

  // Reset error state
  titleInput.classList.remove("error");
  titleError.classList.remove("visible");
  titleError.textContent = "";

  if (title.length < 3) {
    titleInput.classList.add("error");
    titleError.textContent = t("error_min_length_3") || "Kamida 3 ta belgi bo'lishi kerak";
    titleError.classList.add("visible");
    titleInput.focus();
    return;
  }
  if (title.length > 20) {
    titleInput.classList.add("error");
    titleError.textContent = t("error_max_length_20") || "Maksimal 20 ta belgi bo'lishi kerak";
    titleError.classList.add("visible");
    titleInput.focus();
    return;
  }

  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;
  const saveBtn = $("task-modal-save");

  const data = {
    title,
    description: $("tm-desc").value.trim(),
    status: $("tm-status").value,
    priority: $("tm-priority").value,
    assignees: [...selectedAssignees],
    startDate: $("tm-startdate").value || null,
    dueDate: $("tm-duedate").value || null,
    estimatedTime: Number($("tm-estimated").value) || 0,
    project: currentProjectId,
    createdBy: cu?._id || cu?.userId,
  };

  const MAX_TOTAL_SIZE = 5 * 1024 * 1024;
  const quotaText = $("tm-file-quota") ? $("tm-file-quota").textContent : "";
  if (quotaText && quotaText.includes("MB")) {
      const usedStr = quotaText.split("MB")[0].trim();
      if (parseFloat(usedStr) > 5.0) {
          showNotification("Umumiy fayllar hajmi 5MB dan oshmasligi kerak!", "error");
          return;
      }
  }

  saveBtn.classList.add("loading");

  let res;
  try {
    if (editingTaskId) {
      res = await fetch(`${API_URL}/${editingTaskId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });
    } else {
      res = await fetch(`${API_URL}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });
    }

    if (res.ok) {
      const savedTask = await res.json();
      
      if (window.currentTaskNewFiles && window.currentTaskNewFiles.length > 0) {
        try {
            await Promise.all(window.currentTaskNewFiles.map(async (f) => {
                const reader = new FileReader();
                reader.readAsDataURL(f);
                await new Promise(r => reader.onload = r);
                const fileData = reader.result;
                
                await fetch(`${BASE_URL}/api/project-files/upload`, {
                  method: "POST",
                  headers: getAuthHeaders(),
                  credentials: "include",
                  body: JSON.stringify({
                    taskId: savedTask._id || editingTaskId,
                    projectId: currentProjectId,
                    fileName: f.name,
                    fileType: f.type,
                    fileData: fileData,
                    fileSize: f.size
                  }),
                });
            }));
        } catch (e) {
          console.error("File upload error:", e);
          showNotification("Vazifa saqlandi, lekin ba'zi fayllar yuklanmadi", "error");
        }
      }

      $("task-modal").style.display = "none";
      const fileInput = $("tm-file");
      if (fileInput) fileInput.value = "";
      showNotification(editingTaskId ? t("task_updated") || "Task updated" : t("task_created") || "Task created", "success");
      await renderView(true);
    } else {
      showNotification(t("error_saving_task") || "Error saving task", "error");
    }
  } catch (err) {
    console.error("Save task error:", err);
    showNotification(t("error_saving_task") || "Error saving task", "error");
  } finally {
    saveBtn.classList.remove("loading");
  }
};

// ─── TASK DETAIL MODAL ────────────────────────────────────────
const openDetailModal = async (tid) => {
  activeDetailTaskId = tid;
  viewMode = "task-detail";
  await renderView();
};

const renderTaskHistoryView = async () => {
  const container = $("todo-view-container");
  if (!container) return;

  const allTasks = await fetchTasks(currentProjectId);
  const task = allTasks.find((t) => t._id === activeDetailTaskId);
  if (!task) {
    viewMode = "tasks";
    renderView();
    return;
  }

  const taskHistoryData = await fetchTaskHistory(activeDetailTaskId);
  const lang = getCurrentLang();

  // Task History timeline html
  let taskHistoryHtml = "";
  if (taskHistoryData && taskHistoryData.length > 0) {
    taskHistoryHtml = `
      <div class="history-timeline">
        ${taskHistoryData.map(log => {
          const logUser = log.user || { username: "System" };
          const timeStr = new Date(log.timestamp).toLocaleString();
          let actionText = "";
          let iconClass = "created";
          let iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
          let itemTitle = task.title || "Task";
          
          if (log.action === "created") {
            actionText = lang === "uz" ? "yaratdi" : lang === "ru" ? "создал(а)" : "created";
            iconClass = "created";
          } else if (log.action === "deleted") {
            actionText = lang === "uz" ? "o'chirdi" : lang === "ru" ? "удалил(а)" : "deleted";
            iconClass = "deleted";
            iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          } else if (log.action === "status_changed") {
            const oldStatusVal = log.details && log.details.oldStatus ? log.details.oldStatus : "todo";
            const newStatusVal = log.details && log.details.newStatus ? log.details.newStatus : "done";
            const oldLbl = t("status_" + oldStatusVal) || oldStatusVal;
            const newLbl = t("status_" + newStatusVal) || newStatusVal;
            actionText = lang === "uz" ? `statusni o'zgartirdi (<span class="timeline-old-status">${oldLbl}</span> &rarr; <span class="timeline-new-status">${newLbl}</span>)` : lang === "ru" ? `изменил(а) статус (<span class="timeline-old-status">${oldLbl}</span> &rarr; <span class="timeline-new-status">${newLbl}</span>)` : `changed status (<span class="timeline-old-status">${oldLbl}</span> &rarr; <span class="timeline-new-status">${newLbl}</span>)`;
            iconClass = "status";
            iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          } else if (log.action === "updated") {
            actionText = lang === "uz" ? "yangiladi" : lang === "ru" ? "обновил(а)" : "updated";
            iconClass = "updated";
            iconSvg = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          }

          return `
            <div class="timeline-item animated-item">
              <div class="timeline-item-marker ${iconClass}">
                ${iconSvg}
              </div>
              <div class="timeline-item-content">
                <div class="timeline-item-header">
                  <span class="timeline-task-title">${itemTitle}</span>
                  <span class="timeline-time">${timeStr}</span>
                </div>
                <div class="timeline-item-body">
                  <span class="timeline-user">${userAvatarHtml(logUser, 20)} <strong>${logUser.username || logUser.email || "System"}</strong></span>
                  <span class="timeline-action-text">${actionText}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else {
    taskHistoryHtml = `
      <div class="no-members-msg" style="padding: 80px 0; text-align: center;">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" style="color: #cbd5e1; margin-bottom: 12px;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <p style="margin: 0; font-size: 14px; color: #64748b;">${t("no_history_yet") || "Tarixiy amallar hozircha mavjud emas"}</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="project-settings-view animated-view project-history-view">
      <div class="settings-header">
        <div class="settings-title-box">
          <button class="back-to-tasks" id="th-back-btn">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">${task.title} - ${lang === "uz" ? "Tarix" : lang === "ru" ? "История" : "History"}</h2>
        </div>
      </div>
      <div class="settings-content stats-section-content" style="padding: 24px; overflow-y: auto; display: block; height: calc(100% - 65px);">
        ${taskHistoryHtml}
      </div>
    </div>
  `;

  $("th-back-btn").onclick = () => {
    viewMode = "task-detail";
    renderView();
  };
};

const renderTaskDetailView = async () => {
  const container = $("todo-view-container");
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 400px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #5b6ef5; border-radius: 50%; animation: cal-spin 0.8s linear infinite;"></div>
      <style>@keyframes cal-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>
  `;


  const allTasks = await fetchTasks(currentProjectId);
  const task = allTasks.find((t) => t._id === activeDetailTaskId);
  if (!task) {
    viewMode = "tasks";
    renderView();
    return;
  }

  const taskHistoryData = await fetchTaskHistory(activeDetailTaskId);

  const owner = isOwner(task);
  const myStatus = getVisibleStatus(task);
  const cfg = statusConfig[myStatus] || statusConfig.todo;
  const lang = getCurrentLang();
  const assignees = task.assignees || [];
  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;

  // Time Tracking calculations
  const est = task.estimatedTime || 0;
  const actualMap = task.actualTimeSpent || {};
  let totalActual = 0;
  if (task.actualTimeSpent) {
    const values = typeof task.actualTimeSpent.values === "function" ? Array.from(task.actualTimeSpent.values()) : Object.values(task.actualTimeSpent);
    totalActual = values.reduce((a, b) => a + (Number(b) || 0), 0);
  }
  const myActual = typeof actualMap.get === "function" ? (actualMap.get(cuId) || 0) : (actualMap[cuId] || 0);

  // Time progress bar width/color
  const progress = est > 0 ? Math.min((totalActual / est) * 100, 100) : 0;
  const progressColor = totalActual > est && est > 0 ? "#ef4444" : "#22c55e";

  // Time breakdown HTML
  let assigneesWithTime = [];
  assignees.forEach(u => {
    const uId = u._id || u;
    const spent = typeof actualMap.get === "function" ? actualMap.get(uId) : (actualMap[uId] || 0);
    assigneesWithTime.push({ user: u, spent: Number(spent) || 0 });
  });

  const userListHtml = assigneesWithTime.map(item => {
    const uId = item.user._id || item.user;
    const isDone = task.userStatus && task.userStatus[uId] === "done";
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${userAvatarHtml(item.user, 28, isDone)}
          <span style="font-size: 13px; font-weight: 600; color: #1a1d2e;">${item.user.username || item.user.email || "User"}</span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: ${item.spent > 0 ? '#10b981' : '#64748b'};">
          ${item.spent} ${t("hours")}
        </div>
      </div>
    `;
  }).join("");

  const isUserAssignee = isAssignee(task);

  // Assignee completion list
  const assigneeListHtml = assignees.length
    ? assignees
        .map((u) => {
          const uId = u._id || u;
          const isDone = task.userStatus && task.userStatus[uId] === "done";
          const spent = task.actualTimeSpent ? (typeof task.actualTimeSpent.get === "function" ? task.actualTimeSpent.get(uId) : task.actualTimeSpent[uId]) : 0;
          return `
            <div class="todo-detail-assignee-item ${isDone ? "finished" : ""}" data-uid="${uId}">
              ${userAvatarHtml(u, 30, isDone)}
              <div class="assignee-detail-info">
                <span class="assignee-name">${u?.username || "User"}</span>
                ${spent > 0 ? `<span class="assignee-spent">${spent} ${t("hours")}</span>` : ""}
              </div>
              <span class="assignee-status-badge">${isDone ? t("status_done") || "Done" : t("status_todo") || "Todo"}</span>
            </div>`;
        })
        .join("")
    : `<span style="color:#8892a4;font-size:12px">—</span>`;

  // Time logs timeline html
  const logs = task.timeLogs || [];
  let logsHtml = "";
  if (logs.length > 0) {
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    logsHtml = `
      <div class="time-logs-history" style="margin-top: 14px; border-top: 1px solid #f1f3fa; padding-top: 12px; display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <p style="font-size: 11px; font-weight: 700; color: #8892a4; text-transform: uppercase; margin: 0 0 4px 0;">
          ${lang === "uz" ? "Ish vaqti tarixi" : lang === "ru" ? "История работы" : "Time Log History"}
        </p>
        <div class="time-logs-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; padding-right: 4px;">
          ${sortedLogs.map(log => {
            const d = log.date ? new Date(log.date).toLocaleDateString() : "—";
            return `
              <div class="time-log-item" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-weight: 600; color: #1a1d2e;">${log.username || "User"}</span>
                  ${log.comment ? `<span style="font-size: 11px; color: #64748b; font-style: italic;">"${log.comment}"</span>` : ""}
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-weight: 700; color: #10b981;">+${log.hours} ${t("hours")}</span>
                  <span style="font-size: 10px; color: #94a3b8;">${d}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  container.innerHTML = `
    <div class="project-settings-view animated-view todo-task-detail-panel">
      <div class="settings-header">
        <div class="settings-title-box">
          <button class="back-to-tasks" id="back-to-tasks-btn">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0;">${task.title}</h2>
        </div>
        <div class="settings-actions" style="gap: 8px; display: flex;">
           <button class="todo-detail-history-btn" id="task-detail-chat-btn" style="position: relative; align-items: center; display: flex; gap: 6px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; color: #5a6279; transition: all 0.2s;">
             <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
             <span>${t("chat")}</span>
             <span class="task-chat-badge" id="task-chat-badge-${task._id}" style="display:none; position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 10px; font-weight: bold; min-width: 18px; height: 18px; border-radius: 9px; padding: 0 4px; align-items: center; justify-content: center;">0</span>
           </button>
           <button class="todo-detail-history-btn" id="td-history-btn" style="align-items: center; display: flex; gap: 6px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; color: #5a6279; transition: all 0.2s;">
             <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
             <span>${lang === "uz" ? "Tarix" : lang === "ru" ? "История" : "History"}</span>
           </button>
           <button class="todo-detail-edit-btn" id="td-edit-btn" style="display: ${owner ? 'flex' : 'none'}; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 600; color: #5a6279; transition: all 0.2s;">
             <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
             <span id="td-edit-label">${t("edit")}</span>
           </button>
        </div>
      </div>

      <div class="todo-detail-body" id="td-main-body">
        <div class="todo-detail-main">
          
          ${task.files && task.files.length > 0 ? `
          <div class="todo-detail-section" style="margin-bottom: 20px;">
            <p class="todo-detail-section-label">${t("attached_files") || "Fayllar (PDF)"}</p>
            <div style="display:flex; flex-direction:column; gap:8px">
              ${task.files.map(f => `
                <div style="display:flex; align-items:center; gap:8px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: max-content;">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#5b6ef5" stroke-width="2" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="#5b6ef5" stroke-width="2" stroke-linejoin="round"/></svg>
                  <a href="#" onclick="downloadFile('${f._id}', '${f.fileName}'); return false;" style="font-size:14px; color:#5b6ef5; text-decoration:none; font-weight: 500;">${f.fileName}</a>
                  <span style="font-size:12px; color:#8892a4; margin-left: 8px;">(${(f.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              `).join("")}
            </div>
          </div>` : ""}

          <div class="todo-detail-section">
            <p class="todo-detail-section-label" id="td-lbl-desc">${t("description_label")}</p>
            <p class="todo-detail-desc" id="td-desc">
              ${task.description || (lang === "uz" ? "Tavsif yo'q" : lang === "ru" ? "Нет описания" : "No description")}
            </p>
          </div>

          <div class="todo-detail-time-tracking" id="td-time-section">
              <div class="time-track-header" style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #1a1d2e;">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style="color: #5b6ef5;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span id="td-lbl-time-track">${owner ? t("time_by_users") : t("total_spent")}</span>
              </div>
              
              <div class="time-track-stats" style="display: flex; flex-direction: column; gap: 12px;">
                  <div style="display: flex; gap: 12px;">
                      <div class="time-stat-box" style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 4px;">
                          <span class="time-stat-label" style="font-size: 11px; font-weight: 600; color: #8892a4; text-transform: uppercase;">${t("estimated_time_label") || "Plan (Hours)"}</span>
                          <span class="time-stat-value" style="font-size: 16px; font-weight: 700; color: #1a1d2e;">${est} ${t("hours")}</span>
                      </div>
                  </div>
                  
                  ${assigneesWithTime.length > 0 ? `
                  <div class="time-track-user-list" style="margin-top: 4px; border-top: 1px solid #f1f3fa; padding-top: 12px;">
                    <p style="font-size: 11px; font-weight: 700; color: #8892a4; text-transform: uppercase; margin: 0 0 8px 0;">
                      ${lang === "uz" ? "Foydalanuvchilar kesimida" : lang === "ru" ? "По пользователям" : "Time by Users"}
                    </p>
                    ${userListHtml}
                  </div>
                  ` : ""}
              </div>
              


              <div class="log-time-action" id="td-log-time-container" style="display: ${isUserAssignee ? "block" : "none"}; margin-top: 8px; border-top: 1px solid #f1f3fa; padding-top: 12px;">
                  <p style="font-size: 11px; font-weight: 700; color: #8892a4; text-transform: uppercase; margin-bottom: 8px;">${t("log_time")}</p>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                      <div style="display: flex; gap: 8px;">
                          <input type="date" id="td-log-date" class="todo-form-input" style="flex: 1.2; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px;" />
                          <input type="number" id="td-log-input" class="todo-form-input" min="0" step="0.5" placeholder="${lang === "uz" ? "Soat" : lang === "ru" ? "Часы" : "Hours"}" style="flex: 0.8; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px;" />
                      </div>
                      <div style="display: flex; gap: 8px;">
                          <input type="text" id="td-log-comment" class="todo-form-input" placeholder="${lang === "uz" ? "Izoh (ixtiyoriy)..." : lang === "ru" ? "Комментарий (опционально)..." : "Comment (optional)..."}" style="flex: 1; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px;" />
                          <button class="todo-btn-primary" id="td-log-btn" style="padding: 6px 14px; border-radius: 8px; font-size: 12px;">${t("log_time")}</button>
                      </div>
                  </div>
              </div>
              
              ${logsHtml}
          </div>
        </div>

        <div class="todo-detail-side">
          <p class="todo-detail-meta-heading" id="td-lbl-details">
            ${lang === "uz" ? "Ma'lumotlar" : lang === "ru" ? "Сведения" : "Details"}
          </p>
          
          <div class="todo-detail-meta-row">
            <span class="todo-detail-meta-key">${t("status_label")}</span>
            <span id="td-meta-status"><span class="todo-detail-status-badge s-${myStatus}">${cfg.label()}</span></span>
          </div>
          
          <div class="todo-detail-meta-row">
            <span class="todo-detail-meta-key">${t("priority_label")}</span>
            <span id="td-meta-priority">${getPriorityBadge(task.priority || "none")}</span>
          </div>

          <div class="todo-detail-meta-row">
            <span class="todo-detail-meta-key">${t("start_date_label")}</span>
            <span id="td-meta-startdate">${task.startDate ? new Date(task.startDate).toLocaleDateString() : "—"}</span>
          </div>
          
          <div class="todo-detail-meta-row">
            <span class="todo-detail-meta-key">${t("duedate_label")}</span>
            <span id="td-meta-duedate">${dueDateHtml(task.dueDate)}</span>
          </div>
          
          <div class="todo-detail-meta-row">
            <span class="todo-detail-meta-key">${t("create_time")}</span>
            <span id="td-meta-created">${task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "—"}</span>
          </div>
          
          <div class="todo-detail-meta-row">
            <span class="todo-detail-meta-key">${lang === "uz" ? "Muallif" : lang === "ru" ? "Автор" : "Author"}</span>
            <span id="td-meta-createdby">${task.createdBy?.username || "—"}</span>
          </div>

          <div class="todo-detail-meta-row last-row">
            <span class="todo-detail-meta-key">${t("assignee_label")}</span>
            <div class="todo-detail-assignees" id="td-meta-assignees">
              ${assigneeListHtml}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CHAT SLIDE OVER PANEL -->
    <div class="task-chat-overlay" id="task-chat-overlay"></div>
    <div class="task-chat-panel" id="task-chat-panel">
      <div class="tc-header">
        <div class="tc-header-info">
          <h3>${t("chat_title") || "Vazifa Chati"}</h3>
          <span style="font-size:12px; color:#64748b; font-weight:normal;">${task.title}</span>
        </div>
        <button class="tc-close-btn" id="task-chat-close-btn">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="tc-feed" id="tc-feed"></div>
      <div class="tc-input-area">
        <input type="text" id="tc-input" placeholder="${t("write_msg") || "Xabar yozing..."}" autocomplete="off" />
        <button id="tc-send-btn" disabled>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
  `;

  // Attach event handlers
  $("back-to-tasks-btn").onclick = () => {
    viewMode = "tasks";
    renderView();
  };

  window.downloadFile = async (fileId, fileName) => {
    try {
      const res = await fetch(`${BASE_URL}/api/project-files/${fileId}`, { headers: getAuthHeaders(), credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const link = document.createElement("a");
        link.href = data.fileData;
        link.download = fileName;
        link.click();
      } else {
        showNotification("Faylni o'qishda xatolik", "error");
      }
    } catch (e) {
      showNotification("Server xatoligi", "error");
    }
  };

  const editBtn = $("td-edit-btn");
  if (editBtn) {
    editBtn.onclick = () => {
      openTaskModal(activeDetailTaskId);
    };
  }

  const historyBtn = $("td-history-btn");
  if (historyBtn) {
    historyBtn.onclick = () => {
      viewMode = "task-history";
      renderView();
    };
  }

  fetch(`${BASE_URL}/api/task-chat/project/${currentProjectId}/unread`, { headers: getAuthHeaders(), credentials: "include" })
    .then(r => r.json())
    .then(counts => {
        window.taskUnreadCounts = counts;
        const count = counts[task._id] || 0;
        const badge = $("task-chat-badge-" + task._id);
        if(badge && count > 0) {
            badge.textContent = count > 99 ? "99+" : count;
            badge.style.display = "flex";
        }
    }).catch(e => console.error("Unread count err:", e));

  // Handle Chat Logic
  const chatBtn = $("task-detail-chat-btn");
  const chatOverlay = $("task-chat-overlay");
  const chatPanel = $("task-chat-panel");
  const chatCloseBtn = $("task-chat-close-btn");
  const tcFeed = $("tc-feed");
  const tcInput = $("tc-input");
  const tcSendBtn = $("tc-send-btn");

  let taskPusherChannel = null;

  const openTaskChat = async () => {
    chatOverlay.classList.add("show");
    chatPanel.classList.add("show");
    document.body.style.overflow = "hidden"; // Prevent scrolling behind

    // Remove badge
    const badge = $("task-chat-badge-" + task._id);
    if(badge) badge.style.display = "none";
    if(window.taskUnreadCounts && window.taskUnreadCounts[task._id]) {
       window.taskUnreadCounts[task._id] = 0;
    }

    // Load Messages
    tcFeed.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8;"><svg class="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg></div>`;
    
    try {
       // Mark as read
       await fetch(`${BASE_URL}/api/task-chat/${task._id}/read`, { method: "PUT", headers: getAuthHeaders(), credentials: "include" });
       // Fetch messages
       const res = await fetch(`${BASE_URL}/api/task-chat/${task._id}`, { headers: getAuthHeaders(), credentials: "include" });
       if(res.ok) {
           const messages = await res.json();
           renderTaskChatMessages(messages);
           setTimeout(() => { tcFeed.scrollTop = tcFeed.scrollHeight; }, 50);
       }
    } catch(e) {
       tcFeed.innerHTML = `<div style="padding:20px; text-align:center; color:#ef4444;">Xatolik yuz berdi</div>`;
    }

    // Connect Pusher
    if(window.Pusher && !taskPusherChannel) {
        if (!window.pusherClient) {
            window.pusherClient = new Pusher('a1030ba785c6160c84e2', { cluster: 'ap2' });
        }
        taskPusherChannel = window.pusherClient.subscribe(`task-chat-${task._id}`);
        taskPusherChannel.bind("new-task-message", (data) => {
            const msg = data.message;
            const isMine = cu && (msg.sender._id === cu._id || msg.sender.userId === cu._id);
            if(!isMine) {
               // Append to feed if not mine (mine is appended optimistically or via reload depending on logic, let's append all to be safe)
               const html = generateTaskMsgHtml(msg, isMine);
               tcFeed.insertAdjacentHTML("beforeend", html);
               tcFeed.scrollTop = tcFeed.scrollHeight;
               // Mark as read immediately since we are open
               fetch(`${BASE_URL}/api/task-chat/${task._id}/read`, { method: "PUT", headers: getAuthHeaders(), credentials: "include" });
            }
        });
    }
  };

  const closeTaskChat = () => {
    chatOverlay.classList.remove("show");
    chatPanel.classList.remove("show");
    document.body.style.overflow = "";
    if(taskPusherChannel && window.pusherClient) {
       window.pusherClient.unsubscribe(`task-chat-${task._id}`);
       taskPusherChannel = null;
    }
  };

  if(chatBtn) chatBtn.onclick = openTaskChat;
  if(chatCloseBtn) chatCloseBtn.onclick = closeTaskChat;
  if(chatOverlay) chatOverlay.onclick = closeTaskChat;

  const generateTaskMsgHtml = (msg, isMine) => {
      const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const senderName = msg.sender.username || "User";
      
      let avatarHtml = `<div class="tc-avatar" style="background:#e2e8f0;">U</div>`;
      if(msg.sender.avatar && msg.sender.avatar !== "./assets/images/User-avatar.png") {
          avatarHtml = `<img src="${msg.sender.avatar}" class="tc-avatar-img" />`;
      } else {
          avatarHtml = `<div class="tc-avatar" style="background:#5b6ef5; color:white;">${senderName.charAt(0).toUpperCase()}</div>`;
      }

      if(isMine) {
         return `
            <div class="tc-msg-row mine">
               <div class="tc-msg-bubble">
                  <div class="tc-msg-text">${String(msg.text).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
                  <div class="tc-msg-time">${timeStr}</div>
               </div>
            </div>
         `;
      } else {
         return `
            <div class="tc-msg-row theirs">
               ${avatarHtml}
               <div class="tc-msg-content">
                  <div class="tc-msg-sender">${senderName}</div>
                  <div class="tc-msg-bubble">
                     <div class="tc-msg-text">${String(msg.text).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
                     <div class="tc-msg-time">${timeStr}</div>
                  </div>
               </div>
            </div>
         `;
      }
  };

  const renderTaskChatMessages = (messages) => {
     if(messages.length === 0) {
        tcFeed.innerHTML = `<div style="padding:40px 20px; text-align:center; color:#94a3b8; font-size:14px;">${t("no_msgs_yet") || "Hozircha xabarlar yo'q"}</div>`;
        return;
     }
     let html = "";
     messages.forEach(msg => {
        const isMine = cu && (msg.sender._id === cu._id || msg.sender.userId === cu._id || msg.sender === cu._id || msg.sender === cu.userId);
        html += generateTaskMsgHtml(msg, isMine);
     });
     tcFeed.innerHTML = html;
  };

  if(tcInput) {
      tcInput.addEventListener("input", (e) => {
         tcSendBtn.disabled = e.target.value.trim().length === 0;
      });
      tcInput.addEventListener("keypress", (e) => {
         if(e.key === "Enter" && !e.shiftKey) {
             e.preventDefault();
             if(!tcSendBtn.disabled) tcSendBtn.click();
         }
      });
  }

  if(tcSendBtn) {
      tcSendBtn.onclick = async () => {
          const text = tcInput.value.trim();
          if(!text) return;
          
          tcInput.value = "";
          tcSendBtn.disabled = true;

          // Optimistic UI
          const tempMsg = {
             _id: "temp_" + Date.now(),
             sender: cu,
             text: text,
             createdAt: new Date()
          };
          
          if(tcFeed.innerHTML.includes("no_msgs_yet") || tcFeed.innerHTML.includes("Hozircha xabarlar")) {
             tcFeed.innerHTML = "";
          }
          tcFeed.insertAdjacentHTML("beforeend", generateTaskMsgHtml(tempMsg, true));
          tcFeed.scrollTop = tcFeed.scrollHeight;

          try {
             await fetch(`${BASE_URL}/api/task-chat/${task._id}`, {
                 method: "POST",
                 headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                 credentials: "include",
                 body: JSON.stringify({ projectId: currentProjectId, text })
             });
             // We don't necessarily need to replace optimistic with actual because it looks fine, but real app might.
          } catch(e) {
             console.error("Send message error", e);
             showNotification("Xabar yuborishda xatolik", "error");
          }
      };
  }

  // Handle Log Time
  if (isUserAssignee) {
    const logBtn = $("td-log-btn");
    const logInput = $("td-log-input");
    const logDateInput = $("td-log-date");
    const logCommentInput = $("td-log-comment");
    
    if (logDateInput) {
      logDateInput.value = new Date().toISOString().split('T')[0];
    }

    if (logBtn && logInput && logDateInput && logCommentInput) {
      logBtn.onclick = async () => {
        const hours = Number(logInput.value);
        if (isNaN(hours) || hours <= 0) return;

        const dateVal = logDateInput.value || new Date().toISOString().split('T')[0];
        const commentVal = logCommentInput.value || "";

        logBtn.disabled = true;
        logBtn.textContent = "...";

        try {
          const logsList = task.timeLogs || [];
          const newEntry = {
            userId: cuId,
            username: cu?.username || cu?.email || "User",
            date: new Date(dateVal),
            hours: hours,
            comment: commentVal
          };
          logsList.push(newEntry);

          const currentActualMap = task.actualTimeSpent || {};
          const newActual = typeof currentActualMap.get === "function" 
            ? { ...Object.fromEntries(currentActualMap) } 
            : { ...currentActualMap };
          
          const myTotalHours = logsList
            .filter(log => String(log.userId) === String(cuId))
            .reduce((sum, log) => sum + Number(log.hours), 0);
          
          newActual[cuId] = myTotalHours;

          const res = await fetch(`${API_URL}/${activeDetailTaskId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ 
              actualTimeSpent: newActual,
              timeLogs: logsList
            }),
          });

          if (res.ok) {
            const updatedTask = await res.json();
            updateLocalTaskCache(updatedTask, currentProjectId);
            await renderTaskDetailView(); // Refresh the detail view!
            showNotification(t("status_updated") || "Muvaffaqiyatli saqlandi", "success");
          }
        } catch (err) {
          console.error("Log time error:", err);
        } finally {
          logBtn.disabled = false;
          logBtn.textContent = t("log_time");
        }
      };
    }
  }
};

// ─── DELETE CONFIRM ───────────────────────────────────────────
const showDeleteConfirm = (msg, cb) => {
  deleteCallback = cb;
  $("del-modal-title").textContent = t("delete") + "?";
  $("del-modal-desc").textContent = msg;
  $("del-modal-cancel").textContent = t("cancel");
  $("del-modal-confirm").textContent = t("delete");
  $("todo-del-modal").style.display = "flex";
};

// ─── TRANSLATE UI ─────────────────────────────────────────────
const translateUI = () => {
  const el = (id, txt) => {
    const e = $(id);
    if (e) e.textContent = txt;
  };
  const ph = (id, txt) => {
    const e = $(id);
    if (e) e.placeholder = txt;
  };
  el("tab-list-label", t("list_view"));
  el("tab-board-label", t("board_view"));
  el("todo-add-project-label", t("add_project"));
  el("todo-add-task-label", t("add_task"));
  ph("todo-search", t("search_tasks"));
  ph("tm-title", t("task_title_placeholder"));
  ph("tm-desc", t("task_desc_placeholder"));
  ph("pm-name", t("project_name_placeholder"));
  el("filter-all", t("filter_all"));
  el("filter-todo", t("filter_todo"));
  el("filter-progress", t("filter_progress"));
  el("filter-done", t("filter_done"));
  if ($("lbl-project-name")) $("lbl-project-name").textContent = t("project_label");
  if ($("project-modal-cancel")) $("project-modal-cancel").textContent = t("cancel");
  if ($("project-modal-save")) $("project-modal-save").textContent = t("create");
  if ($("no-projects-msg")) $("no-projects-msg").textContent = t("no_projects");
  // No-project modal
  if ($("noproj-title")) $("noproj-title").textContent = t("no_projects_title");
  if ($("noproj-desc")) $("noproj-desc").textContent = t("no_projects_desc");
  if ($("noproj-create-btn")) $("noproj-create-btn").textContent = t("add_project");
  if ($("noproj-cancel-btn")) $("noproj-cancel-btn").textContent = t("cancel");
};

// ─── INIT ─────────────────────────────────────────────────────
let isInitialized = false;

export const initTodoLogic = async () => {
  const lang = getCurrentLang();
  translateUI();

  await renderView();

  // Guard against duplicate event listeners on the same DOM elements
  const container = document.querySelector(".tasks-container");
  if (container) {
    if (container.dataset.eventsAttached) {
      return;
    }
    container.dataset.eventsAttached = "true";
  }

  initProjectSidebarEvents();

  const cu = getCurrent();
  if (cu) applyPermissions(cu.userId || cu._id);

  // Set initial active tab
  if (currentView === "list") {
    $("tab-list")?.classList.add("active");
    $("tab-board")?.classList.remove("active");
  } else {
    $("tab-board")?.classList.add("active");
    $("tab-list")?.classList.remove("active");
  }

  // View tabs (List/Board switch)
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.id === "tab-list" ? "list" : "board";
      document.querySelectorAll(".view-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderView();
    });
  });

  // Filters (Todo/Progress/Done)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderView();
    });
  });

  // Search tasks
  $("todo-search")?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderView();
  });

  // Clear errors on input
  $("pm-name")?.addEventListener("input", () => {
    $("pm-name").classList.remove("error");
    $("pm-name-error").classList.remove("visible");
  });
  $("tm-title")?.addEventListener("input", () => {
    $("tm-title").classList.remove("error");
    $("tm-title-error").classList.remove("visible");
  });

  // Enter key support
  $("pm-name")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("project-modal-save")?.click();
    }
  });
  $("tm-title")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("task-modal-save")?.click();
    }
  });
  $("tm-desc")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      $("task-modal-save")?.click();
    }
  });

  // Create task
  $("todo-create-task-btn")?.addEventListener("click", () => {
    if (!currentProjectId) {
      showNoProjectModal();
      return;
    }
    openTaskModal(null);
  });

  // Project modal events
  $("project-modal-save")?.addEventListener("click", saveProject);
  $("project-modal-delete")?.addEventListener("click", () => {
    if (editingProjectId) deleteTask(null);
  });
  const closeProjModal = () => ($("project-modal").style.display = "none");
  $("project-modal-cancel")?.addEventListener("click", closeProjModal);
  $("project-modal-close")?.addEventListener("click", closeProjModal);

  // Add Member modal events
  $("add-member-modal-close")?.addEventListener("click", () => ($("add-member-modal").style.display = "none"));

  // Task modal events
  $("task-modal-save")?.addEventListener("click", saveTask);
  const closeTaskModal = () => ($("task-modal").style.display = "none");
  $("task-modal-cancel")?.addEventListener("click", closeTaskModal);
  $("task-modal-close")?.addEventListener("click", closeTaskModal);

  // Detail modal events
  const closeDetailModal = () => ($("task-detail-modal").style.display = "none");
  $("task-detail-close")?.addEventListener("click", closeDetailModal);

  // Confirmation modal (Delete)
  $("del-modal-confirm")?.addEventListener("click", async () => {
    if (deleteCallback) {
      const btn = $("del-modal-confirm");
      btn?.classList.add("loading");
      try {
        await deleteCallback();
        deleteCallback = null;
        const modal = $("todo-del-modal");
        if (modal) modal.style.display = "none";
      } finally {
        btn?.classList.remove("loading");
      }
    }
  });
  $("del-modal-cancel")?.addEventListener("click", () => ($("todo-del-modal").style.display = "none"));

  // No-project modal
  $("noproj-cancel-btn")?.addEventListener("click", () => ($("no-project-modal").style.display = "none"));
  $("noproj-create-btn")?.addEventListener("click", () => {
    if (!checkPermission(currentUserPermissions, "project_add_project")) {
      showNotification(t("error_no_permission"), "error");
      return;
    }
    $("no-project-modal").style.display = "none";
    openProjectModal();
  });

  // Global Key Events - Only attach once
  if (!isInitialized) {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const delModal = $("todo-del-modal");
        if (delModal && delModal.style.display === "flex") {
          e.preventDefault();
          $("del-modal-confirm")?.click();
        }
      }
      if (e.key === "Escape") {
        $("task-modal").style.display = "none";
        $("project-modal").style.display = "none";
        $("todo-del-modal").style.display = "none";
        $("task-detail-modal").style.display = "none";
        $("no-project-modal").style.display = "none";
      }
    });

    document.addEventListener(LANGUAGE_CHANGED_EVENT, () => {
      const tabListSpan = document.querySelector("#tab-list span");
      if (tabListSpan) tabListSpan.textContent = t("list_view");

      const tabBoardSpan = document.querySelector("#tab-board span");
      if (tabBoardSpan) tabBoardSpan.textContent = t("board_view");

      const btnAddTaskSpan = document.querySelector("#todo-create-task-btn span");
      if (btnAddTaskSpan) btnAddTaskSpan.textContent = t("add_task");

      const sidebarTitle = document.querySelector(".sidebar-title");
      if (sidebarTitle) sidebarTitle.textContent = t("projects") || "Projects";

      const searchInput = document.getElementById("project-search-input");
      if (searchInput) searchInput.placeholder = t("search_projects") || "Search projects...";

      const todoSearch = document.getElementById("todo-search");
      if (todoSearch) todoSearch.placeholder = t("search_tasks") || "Filter tasks...";

      const overviewBtn = document.getElementById("project-overview-btn");
      if (overviewBtn) {
        overviewBtn.title = t("project_overview");
        const span = overviewBtn.querySelector("span");
        if (span) span.textContent = t("project_overview");
      }

      const filterAll = document.getElementById("filter-all");
      if (filterAll) filterAll.textContent = t("filter_all") || "All";

      const filterTodo = document.getElementById("filter-todo");
      if (filterTodo) filterTodo.textContent = t("filter_todo") || "Todo";

      const filterProgress = document.getElementById("filter-progress");
      if (filterProgress) filterProgress.textContent = t("filter_progress") || "In Progress";

      const filterDone = document.getElementById("filter-done");
      if (filterDone) filterDone.textContent = t("filter_done") || "Done";

      renderView();
    });

    document.addEventListener("click", (e) => {
      document.querySelectorAll(".todo-list-status-custom-select").forEach((select) => {
        if (!select.contains(e.target)) {
          select.classList.remove("open");
          const options = select.querySelector(".status-options");
          if (options) options.style.display = "none";
          const chevron = select.querySelector(".chevron-icon");
          if (chevron) chevron.style.transform = "rotate(0deg)";
        }
      });
    });

    initTaskAnalytics(lang);
    isInitialized = true;
  }

  console.log("Tasks logic initialized.");
};
