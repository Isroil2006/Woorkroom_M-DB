// Ruxsatnomalar bilan ishlash moduli (Frontend)
import { API_URL, getAuthHeaders, getCurrentUser } from "../../assets/js/api.js";
const PERM_API = `${API_URL}/api/permissions`;
const NAV_ITEMS_API = `${API_URL}/api/permissions/nav-items`;

let NAV_ITEMS_CACHE = null;
let pendingNavItemsRequest = null;

export const fetchNavItems = async () => {
  if (NAV_ITEMS_CACHE) return NAV_ITEMS_CACHE;
  if (pendingNavItemsRequest) return pendingNavItemsRequest;

  pendingNavItemsRequest = (async () => {
    try {
      const res = await fetch(NAV_ITEMS_API, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        NAV_ITEMS_CACHE = await res.json();
        return NAV_ITEMS_CACHE;
      }
    } catch (err) {
      console.error("Error fetching nav items:", err);
    } finally {
      pendingNavItemsRequest = null;
    }
    return [];
  })();

  return pendingNavItemsRequest;
};


// Muayyan kalit (bo'lim) uchun ruxsat borligini tekshirish.
export const checkPermission = (perms, key) => {
  if (!perms) return true;
  if (!NAV_ITEMS_CACHE) return true;

  // 1. Kalit qaysi bo'limga tegishli ekanligini topish
  for (const item of NAV_ITEMS_CACHE) {
    // Agar asosiy bo'lim bo'lsa
    if (item.key === key) {
      return perms[key]?.access !== false;
    }
    // Agar ichki amal bo'lsa
    const action = item.actions.find((a) => a.key === key);
    if (action) {
      const section = perms[item.key];
      if (!section || section.access === false) return false;
      if (!Array.isArray(section.actions)) return true; // Default to true if not an array yet
      return section.actions.includes(action.id);
    }
  }

  return true;
};

// Ortiqcha so'rovlarni kamaytirish uchun kesh (xotira)
const permissionCache = new Map();
const pendingRequests = new Map(); // Ketayotgan so'rovlar promislari

// Serverdan foydalanuvchi ruxsatnomalarini yuklab olish.
export const getPermissions = async (userId) => {
  await fetchNavItems();

  const createDefaultPerms = () => {
    const p = {};
    NAV_ITEMS_CACHE.forEach((item) => {
      p[item.key] = {
        access: true,
        id: item.id,
        actions: item.actions.map((a) => a.id),
      };
    });
    return p;
  };

  if (!userId) return createDefaultPerms();

  if (permissionCache.has(userId)) return permissionCache.get(userId);
  if (pendingRequests.has(userId)) return pendingRequests.get(userId);

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${PERM_API}/${userId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        let perms = data && data.perms ? data.perms : null;

        // Migratsiya va ID-larni sinxronizatsiya qilish
        if (perms && typeof perms === "object" && Object.keys(perms).length > 0) {
          const OLD_ID_MAP = {
            100001: "nav_dashboard", 100002: "nav_payments", 100003: "nav_tasks",
            100004: "task_add_project", 100005: "task_add_task", 100006: "task_edit_task",
            100007: "task_delete_task", 100008: "task_delete_project",
            100009: "nav_vacations", 100010: "vac_add_tour", 100011: "vac_edit_tour", 100012: "vac_delete_tour",
            100013: "nav_employees", 100014: "emp_perm_btn", 100015: "emp_edit_btn", 100016: "emp_delete_btn",
            100017: "nav_messenger", 100018: "nav_infoportal", 100019: "nav_settings"
          };

          const syncedPerms = {};
          const isFlatArray = Array.isArray(perms.actions);
          const flatIds = isFlatArray ? perms.actions : [];

          NAV_ITEMS_CACHE.forEach((item) => {
            const oldSection = perms[item.key] || {};
            
            let hasAccess = true;
            if (isFlatArray) {
              // Eskicha flat array bo'lsa (ID-lar bo'yicha)
              hasAccess = flatIds.includes(item.id) || flatIds.some(fid => OLD_ID_MAP[fid] === item.key);
            } else {
              hasAccess = oldSection.access !== false;
            }

            let allowedActions = [];
            if (isFlatArray) {
              allowedActions = item.actions.filter(a => 
                flatIds.includes(a.id) || flatIds.some(fid => OLD_ID_MAP[fid] === a.key)
              ).map(a => a.id);
            } else if (oldSection && Array.isArray(oldSection.actions)) {
              // Yangi struktura lekin ID-lar eskirgan bo'lishi mumkin
              const currentActionKeys = new Set(oldSection.actions.map(id => OLD_ID_MAP[id]).filter(Boolean));
              // Agar OLD_ID_MAP da bo'lsa, demak bular eski ID-lar. Ularni yangisiga o'tkazamiz.
              if (currentActionKeys.size > 0) {
                allowedActions = item.actions.filter(a => currentActionKeys.has(a.key)).map(a => a.id);
              } else {
                // Agar ID-lar allaqachon yangi bo'lsa (yoki xarita topilmasa), boricha qoladi
                allowedActions = item.actions.filter(a => oldSection.actions.includes(a.id)).map(a => a.id);
              }
            } else if (oldSection && oldSection.actions && typeof oldSection.actions === "object") {
              allowedActions = item.actions.filter((a) => oldSection.actions[a.key] !== false).map((a) => a.id);
            } else {
              allowedActions = item.actions.map((a) => a.id);
            }

            syncedPerms[item.key] = {
              access: hasAccess,
              id: item.id,
              actions: allowedActions,
            };
          });
          perms = syncedPerms;
        }

        if (!perms || Object.keys(perms).length === 0) {
          perms = createDefaultPerms();
        }

        permissionCache.set(userId, perms);
        return perms;
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    } finally {
      pendingRequests.delete(userId);
    }
    return createDefaultPerms();
  })();

  pendingRequests.set(userId, fetchPromise);
  return fetchPromise;
};

// Yangi ruxsatnomalarni serverga saqlash.
export const savePermissions = async (userId, perms) => {
  if (!userId) return;
  try {
    const res = await fetch(`${PERM_API}/${userId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ perms }),
    });

    if (res.ok) {
      permissionCache.set(userId, perms);
    }
  } catch (err) {
    console.error("Error saving permissions:", err);
  }
};

// HTML elementlardagi [data-perm] bo'yicha ruxsatlarni qo'llash.
export const applyPermissions = async (userId) => {
  if (!userId) return;
  const perms = await getPermissions(userId);
  document.querySelectorAll("[data-perm]").forEach((el) => {
    const key = el.getAttribute("data-perm");
    const allowed = checkPermission(perms, key);
    
    // Yuklanish animatsiyasini olib tashlaymiz
    el.classList.remove("loading");

    if (allowed) {
      el.classList.add("perm-allowed");
    } else {
      el.classList.remove("perm-allowed");
    }
  });
};

// ─── TRANSLATIONS ────────────────────────────────────────────────
const TR = {
  uz: {
    btn_label: "Cheklovlar",
    title: "Foydalanuvchi cheklovlari",
    sub: "uchun ruxsatlar",
    save: "Saqlash",
    cancel: "Bekor qilish",
    saved: "Saqlandi ✓",
    section_nav: "Sahifalarga kirish",
    nav_dashboard: "Testlar",
    nav_vacations: "Ta'tillar",
    nav_messenger: "Messenger",
    nav_tasks: "Tasks",
    nav_employees: "Employees",
    nav_payments: "Payments",
    nav_infoportal: "InfoPortal",
    task_delete_project: "Loyihani o'chirish",
    task_add_project: "Yangi loyiha qo'shish",
    task_add_task: "Yangi vazifa qo'shish",
    task_edit_task: "Vazifani tahrirlash",
    task_delete_task: "Vazifani o'chirish",
    vac_add_tour: "Yangi tur qo'shish",
    vac_edit_tour: "Turni tahrirlash",
    vac_delete_tour: "Turni o'chirish",
    emp_edit_btn: "Xodim tahrirlash tugmasi",
    emp_delete_btn: "Xodim o'chirish tugmasi",
    emp_perm_btn: "Xodim cheklovlari tugmasi",
    expand_hint: "Ichki sozlamalar",
  },
  en: {
    btn_label: "Permissions",
    title: "User Permissions",
    sub: "permissions for",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved ✓",
    section_nav: "Page access",
    nav_dashboard: "Tests",
    nav_vacations: "Vacations",
    nav_messenger: "Messenger",
    nav_tasks: "Tasks",
    nav_employees: "Employees",
    nav_payments: "Payments",
    nav_infoportal: "InfoPortal",
    task_delete_project: "Delete project",
    task_add_project: "Add project",
    task_add_task: "Add task",
    task_edit_task: "Edit task",
    task_delete_task: "Delete task",
    vac_add_tour: "Add tour",
    vac_edit_tour: "Edit tour",
    vac_delete_tour: "Delete tour",
    emp_edit_btn: "Edit employee button",
    emp_delete_btn: "Delete employee button",
    emp_perm_btn: "Employee permissions button",
    expand_hint: "Inner settings",
  },
  ru: {
    btn_label: "Ограничения",
    title: "Ограничения пользователя",
    sub: "разрешения для",
    save: "Сохранить",
    cancel: "Отмена",
    saved: "Сохранено ✓",
    section_nav: "Доступ к страницам",
    nav_dashboard: "Тесты",
    nav_vacations: "Отпуска",
    nav_messenger: "Мессенджер",
    nav_tasks: "Задачи",
    nav_employees: "Сотрудники",
    nav_payments: "Платежи",
    nav_infoportal: "InfoPortal",
    task_delete_project: "Удалить проект",
    task_add_project: "Добавить проект",
    task_add_task: "Добавить задачу",
    task_edit_task: "Редактировать задачу",
    task_delete_task: "Удалить задачу",
    vac_add_tour: "Добавить тур",
    vac_edit_tour: "Редактировать тур",
    vac_delete_tour: "Удалить тур",
    emp_edit_btn: "Кнопка редактирования сотрудника",
    emp_delete_btn: "Кнопка удаления сотрудника",
    emp_perm_btn: "Кнопка ограничений сотрудника",
    expand_hint: "Вложенные настройки",
  },
};

// Modal bo'limlarini shakllantirish (Metadata asosida)
const getModalSections = (tr, navItems) => {
  return [
    {
      label: tr.section_nav,
      items: navItems.map((item) => ({
        key: item.key,
        label: tr[item.key] || item.key,
        id: item.id,
        subs: item.actions.length > 0 ? item.actions.map((a) => ({ key: a.key, label: tr[a.key] || a.key, id: a.id })) : null,
      })),
    },
  ];
};

const countBlockedSubs = (subs, perms, parentKey) => {
  const section = perms[parentKey];
  if (!section || !Array.isArray(section.actions)) return 0;
  return subs.filter((s) => !section.actions.includes(s.id)).length;
};

const countBadgeHtml = (count) => (count > 0 ? `<span class="perm-sub-count perm-sub-count--active">${count}</span>` : `<span class="perm-sub-count"></span>`);

// ─── Ruxsatnomalar oynasi (Modal) ───────────────────────────────
export const openPermissionsModal = async (targetUserId, targetUsername, lang = "uz") => {
  const tr = TR[lang] || TR.en;
  const perms = await getPermissions(targetUserId);

  const badgeText = (on) => (on ? (lang === "uz" ? "Ruxsat" : lang === "ru" ? "Разрешено" : "Allowed") : lang === "uz" ? "Bloklangan" : lang === "ru" ? "Заблокировано" : "Blocked");

  const toggleEl = (id, on, isSub = false, parentId = null) => `
        <div class="perm-toggle ${on ? "perm-toggle--on" : ""}" 
             data-id="${id}" 
             data-is-sub="${isSub}" 
             ${parentId ? `data-parent-id="${parentId}"` : ""}>
            <div class="perm-toggle-thumb"></div>
            <input type="checkbox" class="perm-checkbox" data-id="${id}"
            ${on ? "checked" : ""} style="display:none"/>
        </div>`;

  const rowHtml = (item, isSub = false, parentId = null, parentKey = null) => {
    let on = false;
    if (isSub && parentKey) {
      const section = perms[parentKey];
      on = section && Array.isArray(section.actions) && section.actions.includes(item.id);
    } else {
      on = perms[item.key]?.access !== false;
    }

    return `
        <div class="perm-item ${on ? "perm-item--on" : "perm-item--off"}${isSub ? " perm-item--sub" : ""}"
            data-perm-id="${item.id}" data-perm-key="${item.key}">
            <div class="perm-item-info">
                <span class="perm-item-label">${item.label}</span>
                <span class="perm-item-badge ${on ? "badge--on" : "badge--off"}">${badgeText(on)}</span>
            </div>
            <div class="perm-item-right">${toggleEl(item.id, on, isSub, parentId)}</div>
        </div>`;
  };

  const rowWithSubsHtml = (item) => {
    const on = perms[item.key]?.access !== false;
    const count = countBlockedSubs(item.subs, perms, item.key);

    return `
        <div class="perm-item-group" data-parent-id="${item.id}" data-parent-key="${item.key}">
            <div class="perm-item ${on ? "perm-item--on" : "perm-item--off"}" data-perm-id="${item.id}" data-perm-key="${item.key}">
                <div class="perm-item-info">
                    <span class="perm-item-label">${item.label}</span>
                    <span class="perm-item-badge ${on ? "badge--on" : "badge--off"}">${badgeText(on)}</span>
                </div>
                <div class="perm-item-right">
                    ${countBadgeHtml(count)}
                    <button class="perm-chevron-btn" data-expand-for="${item.id}" title="${tr.expand_hint}">
                        <svg class="perm-chevron-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5"
                                  stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    ${toggleEl(item.id, on)}
                </div>
            </div>
            <div class="perm-sub-panel" data-sub-for="${item.id}">
                <div class="perm-sub-items">
                    ${item.subs.map((s) => rowHtml(s, true, item.id, item.key)).join("")}
                </div>
            </div>
        </div>`;
  };

  const sectionsHtml = getModalSections(tr, NAV_ITEMS_CACHE)
    .map(
      (sec) => `
        <div class="perm-section">
            <div class="perm-section-label">${sec.label}</div>
            <div class="perm-items">
                ${sec.items.map((item) => (item.subs ? rowWithSubsHtml(item) : rowHtml(item))).join("")}
            </div>
        </div>`,
    )
    .join("");

  document.getElementById("perm-modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "perm-modal-overlay";
  overlay.className = "perm-overlay";
  overlay.innerHTML = `
    <div class="perm-modal">
        <div class="perm-header">
            <div class="perm-header-left">
                <div class="perm-header-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="#fff" stroke-width="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div>
                    <div class="perm-header-title">${tr.title}</div>
                    <div class="perm-header-sub">${tr.sub} ${targetUsername}</div>
                </div>
            </div>
            <button class="perm-close" id="perm-close-btn">✕</button>
        </div>
        <div class="perm-body">${sectionsHtml}</div>
        <div class="perm-footer">
            <button class="perm-btn-cancel" id="perm-cancel-btn">${tr.cancel}</button>
            <button class="perm-btn-save"   id="perm-save-btn">${tr.save}</button>
        </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll(".perm-chevron-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = overlay.querySelector(`.perm-sub-panel[data-sub-for="${btn.dataset.expandFor}"]`);
      btn.classList.toggle("perm-chevron-btn--open", panel.classList.toggle("perm-sub-panel--open"));
    });
  });

  const updateUIForRow = (id, nowOn) => {
    const row = overlay.querySelector(`.perm-item[data-perm-id="${id}"]`);
    if (!row) return;
    const bdg = row.querySelector(".perm-item-badge");
    const tog = row.querySelector(".perm-toggle");
    const cb = row.querySelector(".perm-checkbox");

    cb.checked = nowOn;
    tog.classList.toggle("perm-toggle--on", nowOn);
    row.classList.toggle("perm-item--on", nowOn);
    row.classList.toggle("perm-item--off", !nowOn);
    if (bdg) {
      bdg.className = `perm-item-badge ${nowOn ? "badge--on" : "badge--off"}`;
      bdg.textContent = badgeText(nowOn);
    }
  };

  overlay.querySelectorAll(".perm-toggle").forEach((tog) => {
    tog.addEventListener("click", (e) => {
      e.stopPropagation();
      const cb = tog.querySelector(".perm-checkbox");
      const id = parseInt(cb.dataset.id);
      const isSub = tog.dataset.isSub === "true";
      const parentId = tog.dataset.parentId ? parseInt(tog.dataset.parentId) : null;
      const nowOn = !cb.checked;

      // Update current row
      updateUIForRow(id, nowOn);

      if (!isSub) {
        if (!nowOn) {
          const panel = overlay.querySelector(`.perm-sub-panel[data-sub-for="${id}"]`);
          if (panel) {
            panel.querySelectorAll(".perm-toggle").forEach((subTog) => {
              const subId = parseInt(subTog.querySelector(".perm-checkbox").dataset.id);
              updateUIForRow(subId, false);
            });
          }
        }
      } else if (parentId) {
        if (nowOn) {
          updateUIForRow(parentId, true);
        }
      }

      // Badge update
      const activeParentId = isSub ? parentId : id;
      const group = overlay.querySelector(`.perm-item-group[data-parent-id="${activeParentId}"]`);
      if (group) {
        const countBadgeEl = group.querySelector(".perm-sub-count");
        if (countBadgeEl) {
          const blockedNow = group.querySelectorAll(".perm-sub-panel .perm-checkbox:not(:checked)").length;
          countBadgeEl.textContent = blockedNow > 0 ? blockedNow : "";
          countBadgeEl.classList.toggle("perm-sub-count--active", blockedNow > 0);
        }
      }
    });
  });

  overlay.querySelector("#perm-save-btn").addEventListener("click", async () => {
    const newPerms = {};

    NAV_ITEMS_CACHE.forEach((item) => {
      const parentRow = overlay.querySelector(`.perm-item[data-perm-id="${item.id}"]`);
      const parentCb = parentRow.querySelector(".perm-checkbox");
      
      const allowedActions = [];
      const subPanel = overlay.querySelector(`.perm-sub-panel[data-sub-for="${item.id}"]`);
      if (subPanel) {
        subPanel.querySelectorAll(".perm-checkbox:checked").forEach((cb) => {
          allowedActions.push(parseInt(cb.dataset.id));
        });
      }

      newPerms[item.key] = {
        access: parentCb.checked,
        id: item.id,
        actions: allowedActions,
      };
    });

    await savePermissions(targetUserId, newPerms);

    const btn = overlay.querySelector("#perm-save-btn");
    btn.textContent = tr.saved;
    btn.style.background = "#22c55e";
    setTimeout(() => {
      btn.textContent = tr.save;
      btn.style.background = "";
    }, 1600);

    document.dispatchEvent(
      new CustomEvent("permissions-updated", {
        detail: { userId: targetUserId },
      }),
    );
    const cu = getCurrentUser();
    if (cu?.userId === targetUserId || cu?._id === targetUserId) {
      applyPermissions(targetUserId);
    }
  });

  const close = () => {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s";
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.querySelector("#perm-close-btn").addEventListener("click", close);
  overlay.querySelector("#perm-cancel-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", esc);
    }
  });
};

export const createPermissionsBtn = (targetUserId, targetUsername, lang = "uz") => {
  const tr = TR[lang] || TR.en;
  return `
    <button class="emp-perm-btn" data-userid="${targetUserId}" data-username="${targetUsername}">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        ${tr.btn_label}
    </button>`;
};

export const initPermissionsBtn = (lang = "uz") => {
  document.querySelectorAll(".emp-perm-btn[data-userid]").forEach((btn) => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", (e) => {
      e.stopPropagation();
      openPermissionsModal(fresh.dataset.userid, fresh.dataset.username, lang);
    });
  });
};
