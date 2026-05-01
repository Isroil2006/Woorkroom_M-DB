// Ruxsatnomalar bilan ishlash moduli (Frontend)
import { API_URL, getAuthHeaders, getCurrentUser } from "../../assets/js/api.js";
const PERM_API = `${API_URL}/api/permissions`;

export const DEFAULT_PERMISSIONS = {
  nav_dashboard: { access: true },
  nav_payments: { access: true },
  nav_tasks: {
    access: true,
    actions: {
      task_add_project: true,
      task_add_task: true,
      task_edit_task: true,
      task_delete_task: true,
      task_update_status: true,
      task_delete_project: true,
    },
  },
  nav_vacations: {
    access: true,
    actions: {
      vac_add_tour: true,
      vac_edit_tour: true,
      vac_delete_tour: true,
    },
  },
  nav_employees: {
    access: true,
    actions: {
      emp_perm_btn: true,
      emp_edit_btn: true,
      emp_delete_btn: true,
    },
  },
  nav_messenger: { access: true },
  nav_infoportal: { access: true },
  nav_settings: { access: true },
};

//  Eski formatdagi ruxsatnomalarni yangi (ichma-ich) formatga o'tkazish.
const migratePermissions = (perms) => {
  if (!perms) return { ...DEFAULT_PERMISSIONS };

  // Agar allaqachon yangi formatda bo'lsa, o'zini qaytaramiz
  const keys = Object.keys(perms);
  const isNewFormat = keys.some((k) => perms[k] && typeof perms[k] === "object" && "access" in perms[k]);
  if (isNewFormat) return perms;

  // Aks holda eski formatni yangisiga ko'chiramiz
  const newPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));

  for (const parentKey in newPerms) {
    if (perms[parentKey] !== undefined) {
      newPerms[parentKey].access = !!perms[parentKey];
    }
    if (newPerms[parentKey].actions) {
      for (const actionKey in newPerms[parentKey].actions) {
        if (perms[actionKey] !== undefined) {
          newPerms[parentKey].actions[actionKey] = !!perms[actionKey];
        }
      }
    }
  }
  return newPerms;
};

// Muayyan kalit (bo'lim) uchun ruxsat borligini tekshirish.
export const checkPermission = (perms, key) => {
  if (!perms) return true;

  // 1. Asosiy bo'limni tekshirish (masalan: nav_tasks)
  if (perms[key] && typeof perms[key] === "object" && "access" in perms[key]) {
    return perms[key].access;
  }

  // 2. Ichki harakatlarni tekshirish (masalan: task_add_task)
  for (const parentKey in perms) {
    const parent = perms[parentKey];
    if (parent.actions && key in parent.actions) {
      // Agar asosiy bo'lim yopiq bo'lsa, ichki harakatlar ham yopiq hisoblanadi
      if (parent.access === false) return false;
      return parent.actions[key];
    }
  }

  // 3. Eski format uchun zaxira tekshiruv
  if (typeof perms[key] === "boolean") return perms[key];

  return true;
};

// Ortiqcha so'rovlarni kamaytirish uchun kesh (xotira)
const permissionCache = new Map();
const pendingRequests = new Map(); // Ketayotgan so'rovlar promislari

// Serverdan foydalanuvchi ruxsatnomalarini yuklab olish.
export const getPermissions = async (userId) => {
  if (!userId) return { ...DEFAULT_PERMISSIONS };

  // 1. Agar keshda ma'lumot bo'lsa, uni qaytaramiz
  if (permissionCache.has(userId)) {
    return permissionCache.get(userId);
  }

  // 2. Agar aynan shu foydalanuvchi uchun so'rov ketayotgan bo'lsa, o'sha promissni qaytaramiz
  if (pendingRequests.has(userId)) {
    return pendingRequests.get(userId);
  }

  // 3. Yangi so'rov yaratamiz va uni pendingRequests ga saqlaymiz
  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${PERM_API}/${userId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const perms = migratePermissions(data && data.perms ? data.perms : null);
        permissionCache.set(userId, perms);
        return perms;
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    } finally {
      // So'rov yakunlangach, uni pendingRequests dan o'chiramiz
      pendingRequests.delete(userId);
    }
    return { ...DEFAULT_PERMISSIONS };
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
    task_update_status: "Statusni o'zgartirish",
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
    task_update_status: "Update status",
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
    task_update_status: "Обновить статус",
    vac_add_tour: "Добавить тур",
    vac_edit_tour: "Редактировать тур",
    vac_delete_tour: "Удалить тур",
    emp_edit_btn: "Кнопка редактирования сотрудника",
    emp_delete_btn: "Кнопка удаления сотрудника",
    emp_perm_btn: "Кнопка ограничений сотрудника",
    expand_hint: "Вложенные настройки",
  },
};

const getModalSections = (tr) => [
  {
    label: tr.section_nav,
    items: [
      { key: "nav_dashboard", label: tr.nav_dashboard },
      { key: "nav_payments", label: tr.nav_payments },
      {
        key: "nav_tasks",
        label: tr.nav_tasks,
        subs: [
          { key: "task_add_project", label: tr.task_add_project },
          { key: "task_add_task", label: tr.task_add_task },
          { key: "task_edit_task", label: tr.task_edit_task },
          { key: "task_delete_task", label: tr.task_delete_task },
          { key: "task_update_status", label: tr.task_update_status },
          { key: "task_delete_project", label: tr.task_delete_project },
        ],
      },
      {
        key: "nav_vacations",
        label: tr.nav_vacations,
        subs: [
          { key: "vac_add_tour", label: tr.vac_add_tour },
          { key: "vac_edit_tour", label: tr.vac_edit_tour },
          { key: "vac_delete_tour", label: tr.vac_delete_tour },
        ],
      },
      {
        key: "nav_employees",
        label: tr.nav_employees,
        subs: [
          { key: "emp_perm_btn", label: tr.emp_perm_btn },
          { key: "emp_edit_btn", label: tr.emp_edit_btn },
          { key: "emp_delete_btn", label: tr.emp_delete_btn },
        ],
      },
      { key: "nav_messenger", label: tr.nav_messenger },
      { key: "nav_infoportal", label: tr.nav_infoportal },
    ],
  },
];

const countBlockedSubs = (subs, perms, parentKey) => {
  if (!perms[parentKey] || !perms[parentKey].actions) return 0;
  return subs.filter((s) => perms[parentKey].actions[s.key] === false).length;
};

const countBadgeHtml = (count) => (count > 0 ? `<span class="perm-sub-count perm-sub-count--active">${count}</span>` : `<span class="perm-sub-count"></span>`);

// ─── Ruxsatnomalar oynasi (Modal) ───────────────────────────────
export const openPermissionsModal = async (targetUserId, targetUsername, lang = "uz") => {
  const tr = TR[lang] || TR.en;
  const perms = await getPermissions(targetUserId);

  const badgeText = (on) => (on ? (lang === "uz" ? "Ruxsat" : lang === "ru" ? "Разрешено" : "Allowed") : lang === "uz" ? "Bloklangan" : lang === "ru" ? "Заблокировано" : "Blocked");

  const toggleEl = (key, on, isSub = false, parentKey = null) => `
        <div class="perm-toggle ${on ? "perm-toggle--on" : ""}" 
             data-toggle-for="${key}" 
             data-is-sub="${isSub}" 
             ${parentKey ? `data-parent="${parentKey}"` : ""}>
            <div class="perm-toggle-thumb"></div>
            <input type="checkbox" class="perm-checkbox" data-key="${key}"
            ${on ? "checked" : ""} style="display:none"/>
        </div>`;

  const rowHtml = (item, isSub = false, parentKey = null) => {
    let on = true;
    if (isSub && parentKey) {
      on = perms[parentKey]?.actions?.[item.key] !== false;
    } else {
      on = perms[item.key]?.access !== false;
    }

    return `
        <div class="perm-item ${on ? "perm-item--on" : "perm-item--off"}${isSub ? " perm-item--sub" : ""}"
            data-perm-key="${item.key}">
            <div class="perm-item-info">
                <span class="perm-item-label">${item.label}</span>
                <span class="perm-item-badge ${on ? "badge--on" : "badge--off"}">${badgeText(on)}</span>
            </div>
            <div class="perm-item-right">${toggleEl(item.key, on, isSub, parentKey)}</div>
        </div>`;
  };

  const rowWithSubsHtml = (item) => {
    const on = perms[item.key]?.access !== false;
    const count = countBlockedSubs(item.subs, perms, item.key);

    return `
        <div class="perm-item-group" data-parent-key="${item.key}">
            <div class="perm-item ${on ? "perm-item--on" : "perm-item--off"}" data-perm-key="${item.key}">
                <div class="perm-item-info">
                    <span class="perm-item-label">${item.label}</span>
                    <span class="perm-item-badge ${on ? "badge--on" : "badge--off"}">${badgeText(on)}</span>
                </div>
                <div class="perm-item-right">
                    ${countBadgeHtml(count)}
                    <button class="perm-chevron-btn" data-expand-for="${item.key}" title="${tr.expand_hint}">
                        <svg class="perm-chevron-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5"
                                  stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    ${toggleEl(item.key, on)}
                </div>
            </div>
            <div class="perm-sub-panel" data-sub-for="${item.key}">
                <div class="perm-sub-items">
                    ${item.subs.map((s) => rowHtml(s, true, item.key)).join("")}
                </div>
            </div>
        </div>`;
  };

  const sectionsHtml = getModalSections(tr)
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

  const updateUIForRow = (key, nowOn) => {
    const row = overlay.querySelector(`.perm-item[data-perm-key="${key}"]`);
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
      const key = cb.dataset.key;
      const isSub = tog.dataset.isSub === "true";
      const parentKey = tog.dataset.parent;
      const nowOn = !cb.checked;

      // Update current row
      updateUIForRow(key, nowOn);

      // Bo'lim va ichki harakatlar o'rtasidagi bog'liqlik logikasi
      if (!isSub) {
        // Agar asosiy bo'lim o'chirilsa, barcha ichki amallarni ham o'chiramiz
        if (!nowOn) {
          const panel = overlay.querySelector(`.perm-sub-panel[data-sub-for="${key}"]`);
          if (panel) {
            panel.querySelectorAll(".perm-toggle").forEach((subTog) => {
              const subKey = subTog.querySelector(".perm-checkbox").dataset.key;
              updateUIForRow(subKey, false);
            });
          }
        }
      } else if (parentKey) {
        // Agar birorta ichki amal yoqilsa, asosiy bo'lim ham yoqilishi shart
        if (nowOn) {
          updateUIForRow(parentKey, true);
        }
      }

      // Bloklangan ichki amallar sonini yangilash (badge)
      const activeParentKey = isSub ? parentKey : key;
      const group = overlay.querySelector(`.perm-item-group[data-parent-key="${activeParentKey}"]`);
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
    const newPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));

    // Oynadagi holatdan yangi ruxsatnomalar obyektini yig'amiz
    overlay.querySelectorAll(".perm-toggle").forEach((tog) => {
      const cb = tog.querySelector(".perm-checkbox");
      const key = cb.dataset.key;
      const isSub = tog.dataset.isSub === "true";
      const parentKey = tog.dataset.parent;

      if (isSub && parentKey) {
        if (newPerms[parentKey] && newPerms[parentKey].actions) {
          newPerms[parentKey].actions[key] = cb.checked;
        }
      } else {
        if (newPerms[key]) {
          newPerms[key].access = cb.checked;
        }
      }
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
