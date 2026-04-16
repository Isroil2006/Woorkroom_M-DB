//  permission.js
import { API_URL } from "../../assets/js/api.js";
const PERM_API = `${API_URL}/api/permissions`;

const DEFAULT_PERMISSIONS = {
    nav_dashboard: true,
    nav_vacations: true,
    nav_messenger: true,
    nav_tasks: true,
    nav_employees: true,
    nav_business: true,
    nav_infoportal: true,

    // Vacations
    vac_add_tour: true,
    vac_edit_tour: true,
    vac_delete_tour: true,

    // Tasks
    task_delete_project: true,
    task_add_project: true,
    task_add_task: true,

    // Employees
    emp_perm_btn: true,
    emp_edit_btn: true,
    emp_delete_btn: true,
};

// Internal cache to avoid redundant fetches within the same session
const permissionCache = new Map();

/**
 * Fetches permissions for a given userId from the server.
 * Returns DEFAULT_PERMISSIONS if not found in DB.
 */
export const getPermissions = async (userId) => {
    if (!userId) return { ...DEFAULT_PERMISSIONS };
    
    // Check cache first
    if (permissionCache.has(userId)) {
        return permissionCache.get(userId);
    }

    try {
        const res = await fetch(`${PERM_API}/${userId}`);
        if (res.ok) {
            const data = await res.json();
            const perms = data && data.perms ? { ...DEFAULT_PERMISSIONS, ...data.perms } : { ...DEFAULT_PERMISSIONS };
            permissionCache.set(userId, perms);
            return perms;
        }
    } catch (err) {
        console.error("Error fetching permissions:", err);
    }
    
    return { ...DEFAULT_PERMISSIONS };
};

/**
 * Saves permissions for a given userId to the server.
 */
export const savePermissions = async (userId, perms) => {
    if (!userId) return;
    try {
        const res = await fetch(`${PERM_API}/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ perms }),
        });
        if (res.ok) {
            permissionCache.set(userId, perms);
        }
    } catch (err) {
        console.error("Error saving permissions:", err);
    }
};

/**
 * Applies permissions to elements with [data-perm] attribute.
 * Now handles async data fetching.
 */
export const applyPermissions = async (userId) => {
    if (!userId) return;
    const perms = await getPermissions(userId);
    document.querySelectorAll("[data-perm]").forEach((el) => {
        const key = el.getAttribute("data-perm");
        if (perms[key] !== false) {
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
        nav_business: "Payments",
        nav_infoportal: "InfoPortal",
        task_delete_project: "Loyihani o'chirish",
        task_add_project: "Yangi loyiha qo'shish",
        task_add_task: "Yangi vazifa qo'shish",
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
        nav_business: "Payments",
        nav_infoportal: "InfoPortal",
        task_delete_project: "Delete project",
        task_add_project: "Add project",
        task_add_task: "Add task",
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
        nav_business: "Платежи",
        nav_infoportal: "InfoPortal",
        task_delete_project: "Удалить проект",
        task_add_project: "Добавить проект",
        task_add_task: "Добавить задачу",
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
            { key: "nav_business", label: tr.nav_business },
            {
                key: "nav_tasks",
                label: tr.nav_tasks,
                subs: [
                    { key: "task_add_project", label: tr.task_add_project },
                    { key: "task_add_task", label: tr.task_add_task },
                    { key: "task_delete_project", label: tr.task_delete_project }
                ]
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

const blockedCount = (subs, perms) => subs.filter((s) => perms[s.key] === false).length;
const countBadgeHtml = (count) => (count > 0 ? `<span class="perm-sub-count perm-sub-count--active">${count}</span>` : `<span class="perm-sub-count"></span>`);

// ─── MODAL ───────────────────────────────────────────────────────
export const openPermissionsModal = async (targetUserId, targetUsername, lang = "uz") => {
    const tr = TR[lang] || TR.en;
    const perms = await getPermissions(targetUserId);

    const badgeText = (on) => (on ? (lang === "uz" ? "Ruxsat" : lang === "ru" ? "Разрешено" : "Allowed") : lang === "uz" ? "Bloklangan" : lang === "ru" ? "Заблокировано" : "Blocked");

    const toggleEl = (key, on) => `
        <div class="perm-toggle ${on ? "perm-toggle--on" : ""}" data-toggle-for="${key}">
            <div class="perm-toggle-thumb"></div>
            <input type="checkbox" class="perm-checkbox" data-key="${key}"
            ${on ? "checked" : ""} style="display:none"/>
        </div>`;

    const rowHtml = (item, isSub = false) => {
        const on = perms[item.key] !== false;
        return `
        <div class="perm-item ${on ? "perm-item--on" : "perm-item--off"}${isSub ? " perm-item--sub" : ""}"
            data-perm-key="${item.key}">
            <div class="perm-item-info">
                <span class="perm-item-label">${item.label}</span>
                <span class="perm-item-badge ${on ? "badge--on" : "badge--off"}">${badgeText(on)}</span>
            </div>
            <div class="perm-item-right">${toggleEl(item.key, on)}</div>
        </div>`;
    };

    const rowWithSubsHtml = (item) => {
        const on = perms[item.key] !== false;
        const count = blockedCount(item.subs, perms);

        return `
        <div class="perm-item-group">
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
                    ${item.subs.map((s) => rowHtml(s, true)).join("")}
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

    overlay.querySelectorAll(".perm-toggle").forEach((tog) => {
        tog.addEventListener("click", (e) => {
            e.stopPropagation();
            const cb = tog.querySelector(".perm-checkbox");
            const key = cb.dataset.key;
            const nowOn = !cb.checked;
            cb.checked = nowOn;
            tog.classList.toggle("perm-toggle--on", nowOn);

            const row = overlay.querySelector(`.perm-item[data-perm-key="${key}"]`);
            const bdg = row?.querySelector(".perm-item-badge");
            row?.classList.toggle("perm-item--on", nowOn);
            row?.classList.toggle("perm-item--off", !nowOn);
            if (bdg) {
                bdg.className = `perm-item-badge ${nowOn ? "badge--on" : "badge--off"}`;
                bdg.textContent = badgeText(nowOn);
            }

            const group = row?.closest(".perm-item-group");
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
        const newPerms = { ...perms };
        overlay.querySelectorAll(".perm-checkbox[data-key]").forEach((cb) => {
            newPerms[cb.dataset.key] = cb.checked;
        });
        
        await savePermissions(targetUserId, newPerms);

        const btn = overlay.querySelector("#perm-save-btn");
        btn.textContent = tr.saved;
        btn.style.background = "#22c55e";
        setTimeout(() => {
            btn.textContent = tr.save;
            btn.style.background = "";
        }, 1600);

        document.dispatchEvent(new CustomEvent("permissions-updated", { detail: { userId: targetUserId } }));
        const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
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
