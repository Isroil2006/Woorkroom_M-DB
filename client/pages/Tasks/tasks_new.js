import { API_URL as BASE_URL, getCurrentUser, getAuthHeaders, setCurrentUser } from "../../assets/js/api.js";
import { createTaskAnalyticsBtn, initTaskAnalytics } from "./analytics.js";
import { translations } from "./trasnslations.js";
import { applyPermissions } from "../Employees/permission.js";
import { getCurrentLang, createTranslationHelper } from "../../assets/js/i18n.js";

const t = createTranslationHelper(translations);
const API_URL = `${BASE_URL}/api/tasks`;

// ─── DATA CACHE ───────────────────────────────────────────────
let projectsCache = null;
let isFetchingProjects = false;

const fetchProjects = async (forceRefresh = false) => {
  if (projectsCache && !forceRefresh) return projectsCache;
  if (isFetchingProjects) {
    // Agar so'rov ketayotgan bo'lsa, uni kutib turamiz
    while (isFetchingProjects) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return projectsCache;
  }

  isFetchingProjects = true;
  try {
    const res = await fetch(`${API_URL}/projects`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    projectsCache = Array.isArray(data) ? data : [];
    return projectsCache;
  } catch (err) {
    console.error("Fetch projects error:", err);
    return [];
  } finally {
    isFetchingProjects = false;
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

// ... (Boshqa yordamchi funksiyalar: isOwner, isAssignee va h.k. o'zgarishsiz qoladi)

// ─── RENDER VIEW ──────────────────────────────────────────────
const renderView = async () => {
  const container = document.getElementById("todo-view-container");
  if (!container) return;

  const projects = await fetchProjects();
  const noProj = document.getElementById("todo-no-projects");
  const delProjBtn = document.getElementById("todo-delete-project-btn");

  if (!projects || projects.length === 0) {
    if (noProj) noProj.style.display = "flex";
    if (delProjBtn) delProjBtn.style.display = "none";
    container.innerHTML = "";
    const title = document.getElementById("todo-project-title");
    if (title) title.textContent = t("todo_title");
    return;
  }

  if (noProj) noProj.style.display = "none";
  
  if (!currentProjectId || !projects.find(p => p._id === currentProjectId)) {
    currentProjectId = projects[0]._id;
  }

  const proj = projects.find(p => p._id === currentProjectId);
  const title = document.getElementById("todo-project-title");
  if (title && proj) title.textContent = proj.name;

  if (delProjBtn) {
    const cu = getCurrent();
    if (cu) applyPermissions(cu.userId || cu._id);
    delProjBtn.style.display = "flex";
  }

  const allTasks = await fetchTasks(currentProjectId);
  let tasks = allTasks;
  // ... filterlar (o'zgarishsiz)
  
  // Render list or board
  // ...
};
