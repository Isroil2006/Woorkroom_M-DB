import { API_URL, getAuthHeaders, getCurrentUser } from "../../assets/js/api.js";
import { showNotification } from "../../components/Notification/notification.js";

export const SuperSettingsPage = () => `
<div class="ss-container">
  <div class="ss-header">
    <h1>Super Settings</h1>
    <p>Dynamic Modules & API Management</p>
  </div>

  <div class="ss-tabs">
    <button class="ss-tab active" data-target="modules">Modules & Actions</button>
    <button class="ss-tab" data-target="apis">API Endpoints</button>
  </div>

  <!-- MODULES TAB -->
  <div id="tab-modules" class="ss-tab-content active">
    <div class="ss-card">
      <div class="ss-card-header">
        <h3>Create New Module (NavItem)</h3>
      </div>
      <form id="form-module" class="ss-form">
        <input type="text" id="mod-key" placeholder="Key (e.g., nav_reports)" required />
        <input type="number" id="mod-id" placeholder="Module ID (e.g., 99)" required />
        <button type="submit" class="ss-btn primary">Create Module</button>
      </form>
    </div>

    <div class="ss-card">
      <div class="ss-card-header">
        <h3>Existing Modules</h3>
      </div>
      <div id="modules-list" class="ss-list">Loading...</div>
    </div>
  </div>

  <!-- APIS TAB -->
  <div id="tab-apis" class="ss-tab-content">
    <div class="ss-card">
      <div class="ss-card-header">
        <h3>Register New API</h3>
      </div>
      <form id="form-api" class="ss-form">
        <input type="number" id="api-id" placeholder="API ID (e.g., 100)" required />
        <input type="text" id="api-path" placeholder="Path (e.g., /api/reports)" required />
        <select id="api-method" required>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
        <input type="text" id="api-module" placeholder="Module (e.g., Reports)" required />
        <input type="text" id="api-desc" placeholder="Description" />
        <button type="submit" class="ss-btn primary">Register API</button>
      </form>
    </div>

    <div class="ss-card">
      <div class="ss-card-header">
        <h3>Existing APIs</h3>
      </div>
      <div id="apis-list" class="ss-list">Loading...</div>
    </div>
  </div>
</div>
`;

// -- LOGIC --

const BASE_URL = `${API_URL}/api/super-settings`;

const fetchModules = async () => {
  try {
    const res = await fetch(`${BASE_URL}/nav-items`, { headers: getAuthHeaders() });
    return await res.json();
  } catch (err) {
    return [];
  }
};

const fetchApis = async () => {
  try {
    const res = await fetch(`${BASE_URL}/apis`, { headers: getAuthHeaders() });
    return await res.json();
  } catch (err) {
    return [];
  }
};

const renderModules = async () => {
  const modules = await fetchModules();
  const list = document.getElementById("modules-list");
  if (!list) return;

  if (modules.length === 0) {
    list.innerHTML = "<p>No modules found.</p>";
    return;
  }

  list.innerHTML = modules.map(m => `
    <div class="ss-item">
      <div class="ss-item-info">
        <strong>${m.key}</strong> (ID: ${m.id})
      </div>
      <div class="ss-item-actions">
        <div class="ss-sub-actions">
          ${m.actions && m.actions.length > 0 ? 
            m.actions.map(a => `<span class="ss-badge">${a.key} (${a.id})</span>`).join('') :
            '<span class="ss-empty">No actions</span>'
          }
        </div>
        <button class="ss-btn danger ss-del-mod" data-id="${m._id}">Delete</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll(".ss-del-mod").forEach(btn => {
    btn.onclick = async () => {
      if(!confirm("Are you sure?")) return;
      await fetch(`${BASE_URL}/nav-items/${btn.dataset.id}`, { method: "DELETE", headers: getAuthHeaders() });
      showNotification("Deleted successfully");
      renderModules();
    };
  });
};

const renderApis = async () => {
  const apis = await fetchApis();
  const list = document.getElementById("apis-list");
  if (!list) return;

  if (apis.length === 0) {
    list.innerHTML = "<p>No APIs found.</p>";
    return;
  }

  list.innerHTML = apis.map(a => `
    <div class="ss-item">
      <div class="ss-item-info">
        <span class="ss-method ${a.method.toLowerCase()}">${a.method}</span>
        <strong>${a.path}</strong>
        <span class="ss-mod-name">${a.module}</span>
      </div>
      <div class="ss-item-actions">
        <span class="ss-desc">${a.description || ''}</span>
        <button class="ss-btn danger ss-del-api" data-id="${a._id}">Delete</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll(".ss-del-api").forEach(btn => {
    btn.onclick = async () => {
      if(!confirm("Are you sure?")) return;
      await fetch(`${BASE_URL}/apis/${btn.dataset.id}`, { method: "DELETE", headers: getAuthHeaders() });
      showNotification("Deleted successfully");
      renderApis();
    };
  });
};

export const initSuperSettingsLogic = () => {
  // Tabs
  const tabs = document.querySelectorAll(".ss-tab");
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".ss-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.target}`).classList.add("active");
      
      if (tab.dataset.target === "modules") renderModules();
      if (tab.dataset.target === "apis") renderApis();
    };
  });

  // Init fetch
  renderModules();

  // Forms
  const modForm = document.getElementById("form-module");
  if (modForm) {
    modForm.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        key: document.getElementById("mod-key").value,
        id: document.getElementById("mod-id").value,
      };
      try {
        const res = await fetch(`${BASE_URL}/nav-items`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showNotification("Module created!");
          modForm.reset();
          renderModules();
        } else {
          const err = await res.json();
          showNotification(err.message || "Error");
        }
      } catch (e) {
        showNotification("Failed to create module");
      }
    };
  }

  const apiForm = document.getElementById("form-api");
  if (apiForm) {
    apiForm.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        _id: document.getElementById("api-id").value,
        path: document.getElementById("api-path").value,
        method: document.getElementById("api-method").value,
        module: document.getElementById("api-module").value,
        description: document.getElementById("api-desc").value,
      };
      try {
        const res = await fetch(`${BASE_URL}/apis`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showNotification("API registered!");
          apiForm.reset();
          renderApis();
        } else {
          const err = await res.json();
          showNotification(err.message || "Error");
        }
      } catch (e) {
        showNotification("Failed to register API");
      }
    };
  }
};
