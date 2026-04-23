import { API_URL as BASE_URL, getCurrentUser, getAuthHeaders } from "../../assets/js/api.js";
import { createTaskAnalyticsBtn, initTaskAnalytics } from "./analytics.js";
import { translations } from "./trasnslations.js";
import { applyPermissions } from "../Employees/permission.js";
import { getCurrentLang, createTranslationHelper } from "../../assets/js/i18n.js";

const t = createTranslationHelper(translations);

// ─── DATA HELPERS (API) ──────────────────────────────────────────
const API_URL = `${BASE_URL}/api/tasks`;

const fetchProjects = async () => {
  try {
    const res = await fetch(`${API_URL}/projects`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    return await res.json();
  } catch (err) {
    console.error("Fetch projects error:", err);
    return [];
  }
};

const fetchTasks = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/?projectId=${projectId}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    return await res.json();
  } catch (err) {
    console.error("Fetch tasks error:", err);
    return [];
  }
};

const fetchUsers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/users`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    return await res.json();
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
  if (!cu) return task.status || "todo";
  const cuId = cu.userId || cu._id;
  const ids = (task.assignees || []).map((u) => u._id || u);

  if (ids.includes(cuId)) {
    return task.userStatus?.[cuId] || task.status || "todo";
  }
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

// ─── AVATAR ───────────────────────────────────────────────────
const avatarColors = [
  "#5b6ef5",
  "#7c3aed",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6d505f",
];
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

const userAvatarHtml = (user, size = 26) => {
  const s = `width:${size}px;height:${size}px;`;
  if (!user)
    return `<div class="todo-avatar-empty" style="${s}"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#aaa" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="#aaa" stroke-width="2"/></svg></div>`;
  const name = user.username || "User";
  if (user.avatar && !user.avatar.includes("User-avatar.png"))
    return `<img src="${user.avatar}" class="todo-avatar" style="${s}" title="${name}" />`;
  return `<div class="todo-avatar" style="${s};background:${avatarColor(name)};font-size:${Math.round(size * 0.35)}px;" title="${name}">${initials(name)}</div>`;
};

// Bir nechta assignee avatarlarini stack ko'rinishida chiqaradi
const assigneeStackHtml = (task, size = 26) => {
  const assignees = task.assignees || [];
  if (assignees.length === 0) return userAvatarHtml(null, size);
  const shown = assignees.slice(0, 3);
  const extra = assignees.length - 3;
  let html = `<div class="todo-avatar-stack">`;
  shown.forEach((u) => {
    html += userAvatarHtml(u, size);
  });
  if (extra > 0)
    html += `<div class="todo-avatar-extra" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.35)}px">+${extra}</div>`;
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
  if (diff < 0)
    return `<span class="todo-due-date date-overdue">${t("overdue")}</span>`;
  if (diff === 0)
    return `<span class="todo-due-date date-today">${t("today")}</span>`;
  return `<span class="todo-due-date date-normal">${due.toLocaleDateString()}</span>`;
};

// ─── PAGE HTML ────────────────────────────────────────────────
export const TodoPage = () => `
<div class="todo-wrap">
  <div class="todo-header">
    <div class="todo-header-left" style="display:flex; align-items:center;">
      <h1 class="todo-main-title" style="display:flex; align-items:center;">
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" style="flex-shrink:0">
          <path d="M9 11l3 3L22 4" stroke="#5b6ef5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span id="todo-project-title">Tasks</span>
      </h1>
      <button id="todo-delete-project-btn" class="todo-action-btn del" data-perm="task_delete_project" title="Delete Project" style="margin-left: 0; display: none; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; border: none; background: rgba(239, 68, 68, 0.1); color: #ef4444; opacity: 1;">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="todo-header-right">
      <div class="todo-view-tabs">
        <button class="todo-view-tab active" id="tab-list">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span id="tab-list-label">List</span>
        </button>
        <button class="todo-view-tab" id="tab-board">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>
          <span id="tab-board-label">Board</span>
        </button>
      </div>
      <button class="todo-add-project-btn" id="todo-add-project-btn" data-perm="task_add_project">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        <span id="todo-add-project-label">+ Project</span>
      </button>
    </div>
  </div>

  <div class="todo-toolbar">
    <div class="todo-search-wrap">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#aaa" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#aaa" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="text" id="todo-search" placeholder="Search..." />
    </div>
    <div class="todo-filters">
      <button class="todo-filter-btn active" data-filter="all"      id="filter-all">All</button>
      <button class="todo-filter-btn"        data-filter="todo"     id="filter-todo">To Do</button>
      <button class="todo-filter-btn"        data-filter="progress" id="filter-progress">In Progress</button>
      <button class="todo-filter-btn"        data-filter="done"     id="filter-done">Done</button>
    </div>
    <button class="todo-create-btn" id="todo-create-task-btn" data-perm="task_add_task">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
      <span id="todo-add-task-label">Add Task</span>
    </button>
  </div>

  <div class="todo-project-tabs" id="todo-project-tabs"></div>

  <div class="todo-content-area">
    <div class="todo-no-projects" id="todo-no-projects" style="display:none">
      <svg width="64" height="64" fill="none" viewBox="0 0 24 24" style="margin:0 auto 16px;display:block;opacity:.3">
        <path d="M9 11l3 3L22 4" stroke="#5b6ef5" stroke-width="2"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#5b6ef5" stroke-width="2"/>
      </svg>
      <p id="no-projects-msg" style="color:#8892a4;font-size:14px;text-align:center;margin:0"></p>
    </div>
    <div id="todo-view-container"></div>
  </div>
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
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-task-duedate">Due Date</label>
        <input class="todo-form-input" type="date" id="tm-duedate" />
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
  <div class="todo-detail-modal">
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
      <!-- LEFT: main content -->
      <div class="todo-detail-left">
        <h2 class="todo-detail-title" id="td-title"></h2>

        <div class="todo-detail-section">
          <p class="todo-detail-section-label" id="td-lbl-desc">Description</p>
          <p class="todo-detail-desc" id="td-desc"></p>
        </div>
      </div>

      <!-- RIGHT: meta info -->
      <div class="todo-detail-right">
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
          <span class="todo-detail-meta-key" id="td-lbl-duedate">Due Date</span>
          <span id="td-meta-duedate"></span>
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
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <h3 class="todo-del-title" id="noproj-title"></h3>
    <p  class="todo-del-desc"  id="noproj-desc"></p>
    <div class="todo-del-actions">
      <button class="todo-btn-secondary" id="noproj-cancel-btn"></button>
      <button class="todo-btn-primary"   id="noproj-create-btn"></button>
    </div>
  </div>
</div>

<!-- ══ PROJECT MODAL ══ -->
<div id="project-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal" style="max-width:400px">
    <div class="todo-modal-header">
      <h3 id="project-modal-title">${t("new_project")}</h3>
      <button class="todo-modal-close" id="project-modal-close">✕</button>
    </div>
    <div class="todo-modal-body">
      <div class="todo-form-group">
        <label class="todo-form-label" id="lbl-project-name">Project Name</label>
        <input class="todo-form-input" id="pm-name" placeholder="Enter project name..." />
      </div>
    </div>
    <div class="todo-modal-footer">
      <button class="todo-btn-secondary" id="project-modal-cancel">Cancel</button>
      <button class="todo-btn-primary"   id="project-modal-save">Create</button>
    </div>
  </div>
</div>

<!-- ══ DELETE CONFIRM MODAL ══ -->
<div id="todo-del-modal" class="todo-modal-overlay" style="display:none">
  <div class="todo-modal" style="max-width:460px;text-align:center;padding:20px">
    <div class="todo-del-icon-wrap">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
      </svg>
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

// ─── STATE ────────────────────────────────────────────────────
let currentView = "list";
let currentProjectId = null;
let currentFilter = "all";
let searchQuery = "";
let editingTaskId = null;
let deleteCallback = null;
let dragSrcTask = null;
let selectedAssignees = []; // multi-select state for modal

const $ = (id) => document.getElementById(id);

// ─── ASSIGNEE PICKER ──────────────────────────────────────────
const renderAssigneePicker = async () => {
  const picker = $("tm-assignee-picker");
  if (!picker) return;
  const users = await fetchUsers();

  if (!users.length) {
    picker.innerHTML = `<p style="color:#8892a4;font-size:12px;padding:8px 0">${t("no_users_yet") || "No users"}</p>`;
    return;
  }

  picker.innerHTML = users
    .map((u) => {
      const uId = u._id;
      const sel = selectedAssignees.includes(uId);
      return `<div class="todo-assignee-option ${sel ? "PicSelected" : ""}" data-uid="${uId}">
            ${userAvatarHtml(u, 26)}
            <span>${u.username}</span>
        </div>`;
    })
    .join("");

  picker.querySelectorAll(".todo-assignee-option").forEach((div) => {
    div.addEventListener("click", () => {
      const val = div.dataset.uid;
      if (selectedAssignees.includes(val)) {
        selectedAssignees = selectedAssignees.filter((v) => v !== val);
      } else {
        selectedAssignees.push(val);
      }
      renderAssigneePicker();
    });
  });
};

// ─── PROJECT TABS ─────────────────────────────────────────────
const renderProjectTabs = async () => {
  const projects = await fetchProjects();
  const el = $("todo-project-tabs");
  if (!el) return;
  el.innerHTML = projects
    .map(
      (p) => `
        <div class="todo-project-tab ${p._id === currentProjectId ? "active" : ""}" data-pid="${p._id}">
            <span>${p.name}</span>
        </div>
    `,
    )
    .join("");

  el.querySelectorAll(".todo-project-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      currentProjectId = tab.dataset.pid;
      renderProjectTabs();
      renderView();
    });
  });
};

const showLoader = () => {
  const container = $("todo-view-container");
  if (container) {
    container.innerHTML = `
      <div class="todo-loader-container">
        <div class="todo-spinner"></div>
      </div>`;
  }
};

// ─── RENDER VIEW ──────────────────────────────────────────────
const renderView = async () => {
  const container = $("todo-view-container");
  if (!container) return;

  // Show loader immediately
  showLoader();

  const projects = await fetchProjects();
  const noProj = $("todo-no-projects");
  const delProjBtn = $("todo-delete-project-btn");

  if (projects.length === 0) {
    if (noProj) {
      noProj.style.display = "flex";
      $("no-projects-msg").textContent = t("no_projects");
    }
    if (delProjBtn) delProjBtn.style.display = "none";
    container.innerHTML = "";
    if ($("todo-project-title"))
      $("todo-project-title").textContent = t("todo_title");
    return;
  }

  if (noProj) noProj.style.display = "none";
  if (delProjBtn) {
    const cu = getCurrent();
    if (cu) applyPermissions(cu.userId || cu._id);
    delProjBtn.style.display = "flex";
  }

  if (!currentProjectId || !projects.find((p) => p._id === currentProjectId)) {
    currentProjectId = projects[0]._id;
  }

  const proj = projects.find((p) => p._id === currentProjectId);
  if ($("todo-project-title")) $("todo-project-title").textContent = proj.name;

  // Fetch tasks for the current project
  const allTasks = await fetchTasks(currentProjectId);

  // Filter tasks locally
  let tasks = allTasks;
  if (currentFilter !== "all")
    tasks = tasks.filter((t) => getVisibleStatus(t) === currentFilter);
  if (searchQuery)
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );

  if (currentView === "list") renderListView(tasks);
  else renderBoardView(tasks);

  const cu = getCurrent();
  if (cu) applyPermissions(cu.userId || cu._id);
};

// ─── LIST VIEW ────────────────────────────────────────────────
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
  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;
  const assignees = task.assignees || [];
  const ids = assignees.map((u) => u._id || u);
  const myStatus = getVisibleStatus(task);
  const myDone = myStatus === "done";
  // check button: assignee yoki owner (assignee yo'q bo'lsa) ko'radi
  const canCheck =
    ids.length === 0 || (cu && (ids.includes(cuId) || isOwner(task)));

  return `
    <div class="todo-list-row todo-row-clickable" data-tid="${task._id}">
      <div class="todo-row-name-cell">
        <button class="todo-check-btn ${myDone ? "checked" : ""}" data-tid="${task._id}" data-action="check">
          ${myDone ? `<svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/></svg>` : ""}
        </button>
        <span class="todo-row-title ${myDone ? "done-text" : ""}">${task.title}</span>
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
      const icon = container.querySelector(
        `.todo-collapse-icon[data-status="${status}"]`,
      );
      const hidden = body.style.display === "none";
      body.style.display = hidden ? "block" : "none";
      if (icon)
        icon.style.transform = hidden ? "rotate(0deg)" : "rotate(-90deg)";
    });
  });
  container.querySelectorAll(".todo-add-in-section").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openTaskModal(null, btn.dataset.status);
    });
  });
  // Row click → detail modal (if not action button)
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

// ─── BOARD VIEW ───────────────────────────────────────────────
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
  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;
  const assignees = task.assignees || [];
  const ids = assignees.map((u) => u._id || u);
  const myStatus = getVisibleStatus(task);
  const myDone = myStatus === "done";
  // Assignee yoki owner — hamma drag qila oladi, check ko'radi
  const canDrag = cu && (ids.includes(cuId) || ids.length === 0 || owner);

  return `
    <div class="todo-board-card" draggable="${canDrag}" data-tid="${task._id}">
      <div class="todo-card-top">
        <button class="todo-check-btn ${myDone ? "checked" : ""}" data-tid="${task._id}" data-action="check">
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

// ─── DRAG & DROP ──────────────────────────────────────────────
const initDragDrop = () => {
  document
    .querySelectorAll(".todo-board-card[draggable='true']")
    .forEach((card) => {
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
      const cuId = String(cu.userId || cu._id || "");

      try {
        const tasks = await fetchTasks(currentProjectId);
        const task = tasks.find((t) => String(t._id) === String(taskId));
        if (!task) return;

        const ids = (task.assignees || []).map((u) => String(u._id || u || ""));

        if (ids.length > 0 && ids.includes(cuId)) {
          await fetch(`${API_URL}/${taskId}/user-status`, {
            method: "PUT",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ userId: cuId, status: newCol }),
          });

        } else {
          await fetch(`${API_URL}/${taskId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ status: newCol }),
          });

        }
        renderView();
      } catch (err) {
        console.error("Drop error:", err);
        renderView();
      }
    });
  });
};

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".todo-board-card:not(.dragging)"),
  ];
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

// ─── TASK ACTIONS (API) ───────────────────────────────────────
const toggleDone = async (tid) => {
  const tasks = await fetchTasks(currentProjectId);
  const task = tasks.find((t) => t._id === tid);
  if (!task) return;

  const cu = getCurrent();
  if (!cu) return;
  const cuId = cu.userId || cu._id;
  const ids = (task.assignees || []).map((u) => u._id || u);

  if (ids.length === 0 || (!ids.includes(cuId) && isOwner(task))) {
    // Global toggle
    const newStatus = task.status === "done" ? "todo" : "done";
    await fetch(`${API_URL}/${tid}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });

  } else if (ids.includes(cuId)) {
    // User specific toggle
    const cur = task.userStatus?.[cuId] || task.status || "todo";
    const next = cur === "done" ? "todo" : "done";
    await fetch(`${API_URL}/${tid}/user-status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ userId: cuId, status: next }),
    });

  }
  renderView();
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
  showDeleteConfirm(t("confirm_delete_task"), async () => {
    await fetch(`${API_URL}/${tid}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "include" });

    renderView();
  });
};

// ─── TASK CREATE / EDIT MODAL ─────────────────────────────────
const openTaskModal = async (taskId, defaultStatus = "todo") => {
  editingTaskId = taskId || null;
  const tasks = await fetchTasks(currentProjectId);
  const task = taskId ? tasks.find((t) => t._id === taskId) : null;

  $("task-modal-title").textContent = task
    ? t("modal_edit_task")
    : t("modal_create_task");
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
  selectedAssignees =
    task?.assigneeIds || (task?.assigneeId ? [task.assigneeId] : []);
  renderAssigneePicker();

  $("tm-title").value = task?.title || "";
  $("tm-desc").value = task?.desc || "";
  $("tm-status").value = task?.status || defaultStatus;
  $("tm-priority").value = task?.priority || "none";
  $("tm-duedate").value = task?.dueDate || "";

  $("tm-title").placeholder = t("task_title_placeholder");
  $("tm-desc").placeholder = t("task_desc_placeholder");
  $("task-modal").style.display = "flex";
  setTimeout(() => $("tm-title").focus(), 100);
};

const saveTask = async () => {
  const title = $("tm-title").value.trim();
  if (!title) {
    $("tm-title").style.borderColor = "#ef4444";
    return;
  }
  $("tm-title").style.borderColor = "";

  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;

  const data = {
    title,
    description: $("tm-desc").value.trim(),
    status: $("tm-status").value,
    priority: $("tm-priority").value,
    assignees: [...selectedAssignees],
    dueDate: $("tm-duedate").value || null,
    project: currentProjectId,
    createdBy: cu?._id || cu?.userId,
  };

  if (editingTaskId) {
    await fetch(`${API_URL}/${editingTaskId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });

  } else {
    await fetch(`${API_URL}`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });

  }

  $("task-modal").style.display = "none";
  renderView();
};

// ─── TASK DETAIL MODAL ────────────────────────────────────────
const openDetailModal = async (tid) => {
  const allTasks = await fetchTasks(currentProjectId);
  const task = allTasks.find((t) => t._id === tid);
  if (!task) return;

  const owner = isOwner(task);
  const cfg = statusConfig[task.status] || statusConfig.todo;
  const pcfg = priorityConfig[task.priority] || priorityConfig.none;
  const assignees = task.assignees || [];
  const cu = getCurrent();
  const cuId = cu?.userId || cu?._id;

  $("td-status-badge").className = `todo-detail-status-badge s-${task.status}`;
  $("td-status-badge").textContent = cfg.label();
  $("td-title").textContent = task.title;
  $("td-desc").textContent =
    task.description ||
    (currentLang === "uz"
      ? "Tavsif yo'q"
      : currentLang === "ru"
        ? "Нет описания"
        : "No description");

  // Labels
  $("td-lbl-desc").textContent = t("description_label");
  $("td-lbl-details").textContent =
    currentLang === "uz"
      ? "Ma'lumotlar"
      : currentLang === "ru"
        ? "Сведения"
        : "Details";
  $("td-lbl-status").textContent = t("status_label");
  $("td-lbl-priority").textContent = t("priority_label");
  $("td-lbl-duedate").textContent = t("duedate_label");
  $("td-lbl-assignees").textContent = t("assignee_label");
  $("td-lbl-created").textContent = t("create_time");
  $("td-lbl-createdby").textContent =
    currentLang === "uz"
      ? "Muallif"
      : currentLang === "ru"
        ? "Автор"
        : "Author";
  $("td-edit-label").textContent = t("edit");

  // Meta
  $("td-meta-status").innerHTML =
    `<span class="todo-detail-status-badge s-${task.status}">${cfg.label()}</span>`;
  $("td-meta-priority").innerHTML = getPriorityBadge(task.priority || "none");
  $("td-meta-duedate").innerHTML = dueDateHtml(task.dueDate);
  $("td-meta-created").textContent = task.createdAt
    ? new Date(task.createdAt).toLocaleString()
    : "—";
  $("td-meta-createdby").textContent = task.createdBy?.username || "—";

  // Assignees — har birining completion holati ko'rsatiladi
  $("td-meta-assignees").innerHTML = assignees.length
    ? assignees
        .map((u) => {
          const uId = u._id;
          const done = task.userStatus?.[uId] === "done";
          const isCu = cuId === uId;
          return `
            <div class="todo-detail-assignee-item ${done ? "assignee-done" : ""}" data-uid="${uId}">
              ${userAvatarHtml(u, 26)}
              <span class="assignee-name ${done ? "assignee-name-done" : ""}">${u?.username || "User"}</span>
              ${done ? `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" style="margin-left:auto;flex-shrink:0"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/></svg>` : `<span style="margin-left:auto;font-size:10px;color:#c0c7d4;flex-shrink:0">${isCu ? "…" : ""}</span>`}
            </div>`;
        })
        .join("")
    : `<span style="color:#8892a4;font-size:12px">—</span>`;

  // Edit button visibility
  const editBtn = $("td-edit-btn");
  editBtn.style.display = owner ? "flex" : "none";
  editBtn.onclick = () => {
    $("task-detail-modal").style.display = "none";
    openTaskModal(tid);
  };

  $("task-detail-modal").style.display = "flex";
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
  if ($("lbl-project-name"))
    $("lbl-project-name").textContent = t("project_label");
  if ($("project-modal-cancel"))
    $("project-modal-cancel").textContent = t("cancel");
  if ($("project-modal-save"))
    $("project-modal-save").textContent = t("create");
  if ($("no-projects-msg")) $("no-projects-msg").textContent = t("no_projects");
  // No-project modal
  if ($("noproj-title")) $("noproj-title").textContent = t("no_projects_title");
  if ($("noproj-desc")) $("noproj-desc").textContent = t("no_projects_desc");
  if ($("noproj-create-btn"))
    $("noproj-create-btn").textContent = t("add_project");
  if ($("noproj-cancel-btn")) $("noproj-cancel-btn").textContent = t("cancel");
};

// ─── INIT ─────────────────────────────────────────────────────
export const initTodoLogic = async () => {
  const lang = getCurrentLang();
  translateUI();

  const hr = document.querySelector(".todo-header-right");
  if (hr) {
    const btn = createTaskAnalyticsBtn(lang);
    if (!hr.querySelector(".todo-analytics-btn")) {
      hr.insertAdjacentHTML("afterbegin", btn);
    }
  }

  const projects = await fetchProjects();
  if (projects.length === 0) {
    currentProjectId = null;
  } else {
    if (!currentProjectId) currentProjectId = projects[0]._id;
  }

  renderProjectTabs();
  renderView();

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

  // View tabs
  $("tab-list")?.addEventListener("click", () => {
    currentView = "list";
    $("tab-list").classList.add("active");
    $("tab-board").classList.remove("active");
    renderView();
  });
  $("tab-board")?.addEventListener("click", () => {
    currentView = "board";
    $("tab-board").classList.add("active");
    $("tab-list").classList.remove("active");
    renderView();
  });

  // Filters
  document.querySelectorAll(".todo-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document
        .querySelectorAll(".todo-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderView();
    });
  });

  // Search
  $("todo-search")?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderView();
  });

  // Create task
  $("todo-create-task-btn")?.addEventListener("click", () => {
    if (!currentProjectId) {
      showNoProjectModal();
      return;
    }
    openTaskModal(null);
  });

  // Delete project
  $("todo-delete-project-btn")?.addEventListener("click", () => {
    if (!currentProjectId) return;
    showDeleteConfirm(t("confirm_delete_project"), async () => {
      await fetch(`${API_URL}/projects/${currentProjectId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      currentProjectId = null;
      renderProjectTabs();
      renderView();
    });
  });

  // Add project
  $("todo-add-project-btn")?.addEventListener("click", () => {
    $("pm-name").value = "";
    $("pm-name").placeholder = t("project_name_placeholder");
    $("project-modal").style.display = "flex";
    setTimeout(() => $("pm-name").focus(), 100);
  });

  $("project-modal-save")?.addEventListener("click", async () => {
    const name = $("pm-name").value.trim();
    if (!name) {
      $("pm-name").style.borderColor = "#ef4444";
      return;
    }
    $("pm-name").style.borderColor = "";

    const cu = getCurrent();
    const res = await fetch(`${API_URL}/projects`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ name, createdBy: cu?._id || cu?.userId }),
    });


    if (res.ok) {
      const newP = await res.json();
      currentProjectId = newP._id;
      $("project-modal").style.display = "none";
      renderProjectTabs();
      renderView();
    }
  });

  const closeProjModal = () => ($("project-modal").style.display = "none");
  $("project-modal-cancel")?.addEventListener("click", closeProjModal);
  $("project-modal-close")?.addEventListener("click", closeProjModal);

  // Task modal
  $("task-modal-save")?.addEventListener("click", saveTask);
  const closeTaskModal = () => ($("task-modal").style.display = "none");
  $("task-modal-cancel")?.addEventListener("click", closeTaskModal);
  $("task-modal-close")?.addEventListener("click", closeTaskModal);

  // Detail modal
  const closeDetailModal = () =>
    ($("task-detail-modal").style.display = "none");
  $("task-detail-close")?.addEventListener("click", closeDetailModal);

  // Delete modal
  $("del-modal-confirm")?.addEventListener("click", () => {
    if (deleteCallback) {
      deleteCallback();
      deleteCallback = null;
    }
    $("todo-del-modal").style.display = "none";
  });

  // No-project modal
  $("noproj-cancel-btn")?.addEventListener(
    "click",
    () => ($("no-project-modal").style.display = "none"),
  );
  $("noproj-create-btn")?.addEventListener("click", () => {
    $("no-project-modal").style.display = "none";
    $("pm-name").value = "";
    $("project-modal").style.display = "flex";
    setTimeout(() => $("pm-name").focus(), 100);
  });
  $("del-modal-cancel")?.addEventListener(
    "click",
    () => ($("todo-del-modal").style.display = "none"),
  );

  initTaskAnalytics(lang);
};
