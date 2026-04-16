import { TASK_TR } from "./trasnslations.js";

// ─── HELPERS ────────────────────────────────────────────────────
const _esc = (s) =>
    String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const _AV_COLORS = ["#5b6ef5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#6d505f"];
const _avColor = (name = "") => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return _AV_COLORS[Math.abs(h) % _AV_COLORS.length];
};
const _initials = (name = "") =>
    name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0] || "")
        .join("")
        .toUpperCase();

const _avatarEl = (username, size = 32) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const u = users.find((x) => x.username === username) || { username };
    if (u.avatar && u.avatar !== "./assets/images/User-avatar.png") return `<img src="${u.avatar}" class="task-an-av" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;"/>`;
    return `<div class="task-an-av" style="width:${size}px;height:${size}px;background:${_avColor(username)};font-size:${Math.round(size * 0.36)}px;">${_initials(username)}</div>`;
};

// ─── COMPUTE STATS ──────────────────────────────────────────────
const _computeStats = () => {
    const projects = JSON.parse(localStorage.getItem("todo_projects") || "[]");
    if (!projects.length) return null;

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    // Collect ALL tasks across all projects
    const allTasks = [];
    projects.forEach((p) => {
        (p.tasks || []).forEach((t) => {
            allTasks.push({ ...t, projectName: p.name, projectId: p.id });
        });
    });

    const totalProjects = projects.length;
    const totalTasks = allTasks.length;

    // Status counts (global status)
    const todoCount = allTasks.filter((t) => (t.status || "todo") === "todo").length;
    const progressCount = allTasks.filter((t) => (t.status || "todo") === "progress").length;
    const doneCount = allTasks.filter((t) => (t.status || "todo") === "done").length;
    const doneRate = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

    // Priority breakdown
    const priorityCounts = { none: 0, low: 0, medium: 0, high: 0, urgent: 0 };
    allTasks.forEach((t) => {
        priorityCounts[t.priority || "none"]++;
    });

    // Overdue tasks
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueTasks = allTasks
        .filter((t) => {
            if (!t.dueDate) return false;
            if ((t.status || "todo") === "done") return false;
            return new Date(t.dueDate) < now;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

    // Top assignees
    const assigneeCount = {};
    const assigneeDone = {};
    allTasks.forEach((t) => {
        const ids = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
        ids.forEach((id) => {
            assigneeCount[id] = (assigneeCount[id] || 0) + 1;
            if ((t.status || "todo") === "done") assigneeDone[id] = (assigneeDone[id] || 0) + 1;
        });
    });
    const topAssignees = Object.entries(assigneeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([username, count]) => ({
            username,
            count,
            done: assigneeDone[username] || 0,
        }));

    // Per-project stats
    const projectStats = projects
        .map((p) => {
            const tasks = p.tasks || [];
            const done = tasks.filter((t) => (t.status || "todo") === "done").length;
            return {
                name: p.name,
                total: tasks.length,
                done,
                pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
            };
        })
        .sort((a, b) => b.total - a.total);

    // Today's tasks
    const todayStr = new Date().toISOString().split("T")[0];
    const todayTasks = allTasks.filter((t) => t.dueDate === todayStr && (t.status || "todo") !== "done").length;

    // Tasks created this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekNew = allTasks.filter((t) => t.createdAt && new Date(t.createdAt) > weekAgo).length;

    return {
        totalProjects,
        totalTasks,
        todoCount,
        progressCount,
        doneCount,
        doneRate,
        priorityCounts,
        overdueTasks,
        topAssignees,
        projectStats,
        todayTasks,
        weekNew,
    };
};

// ─── TRANSLATIONS ────────────────────────────────────────────────

// ─── RENDER PANEL ────────────────────────────────────────────────
const _renderPanel = (s, lang) => {
    const tr = TASK_TR[lang] || TASK_TR.en;

    /* ── KPIs ── */
    const kpisHtml = `
    <div class="task-an-kpis">
        <div class="task-an-kpi task-an-kpi--blue">
            <div class="task-an-kpi-icon">📋</div>
            <div class="task-an-kpi-label">${tr.total_tasks}</div>
            <div class="task-an-kpi-val" data-count="${s.totalTasks}">0</div>
            <div class="task-an-kpi-sub">${s.totalProjects} ${tr.project_lbl}</div>
        </div>
        <div class="task-an-kpi task-an-kpi--green">
            <div class="task-an-kpi-icon">✅</div>
            <div class="task-an-kpi-label">${tr.total_done}</div>
            <div class="task-an-kpi-val" data-count="${s.doneCount}">0</div>
            <div class="task-an-kpi-sub">${s.doneRate}% ${tr.tasks_lbl}</div>
        </div>
        <div class="task-an-kpi task-an-kpi--amber">
            <div class="task-an-kpi-icon">⚡</div>
            <div class="task-an-kpi-label">${tr.in_progress}</div>
            <div class="task-an-kpi-val" data-count="${s.progressCount}">0</div>
            <div class="task-an-kpi-sub">${s.todoCount} ${tr.todo_lbl}</div>
        </div>
        <div class="task-an-kpi task-an-kpi--violet">
            <div class="task-an-kpi-icon">🗂️</div>
            <div class="task-an-kpi-label">${tr.total_projects}</div>
            <div class="task-an-kpi-val" data-count="${s.totalProjects}">0</div>
            <div class="task-an-kpi-sub">${s.overdueTasks.length} ${tr.overdue_lbl}</div>
        </div>
    </div>`;

    /* ── Status donut ── */
    const total = s.totalTasks || 1;
    const r = 42,
        circ = 2 * Math.PI * r;
    const todoF = s.todoCount / total;
    const progressF = s.progressCount / total;
    const doneF = s.doneCount / total;
    const donutHtml = `
    <div class="task-an-card" style="animation-delay:0.18s">
        <div class="task-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="#5b6ef5" stroke-width="2"/>
                <path d="M12 7v5l3 3" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.status_dist}
            <span class="task-an-card-badge">${s.totalTasks} jami</span>
        </div>
        <div class="task-an-donut-wrap">
            <div class="task-an-donut-svg-wrap">
                <svg class="task-an-donut-svg" width="110" height="110" viewBox="0 0 110 110">
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#f0f2f8" stroke-width="11"/>
                    <!-- todo -->
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#8892a4" stroke-width="11"
                            stroke-dasharray="${todoF * circ} ${circ - todoF * circ}"
                            stroke-dashoffset="0"
                            style="transition:stroke-dasharray 0.8s ease 0.25s"/>
                    <!-- progress -->
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#5b6ef5" stroke-width="11"
                            stroke-dasharray="${progressF * circ} ${circ - progressF * circ}"
                            stroke-dashoffset="${-todoF * circ}"
                            style="transition:stroke-dasharray 0.8s ease 0.38s"/>
                    <!-- done -->
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#22c55e" stroke-width="11"
                            stroke-dasharray="${doneF * circ} ${circ - doneF * circ}"
                            stroke-dashoffset="${-(todoF + progressF) * circ}"
                            style="transition:stroke-dasharray 0.8s ease 0.5s"/>
                </svg>
                <div class="task-an-donut-center">
                    <div class="task-an-donut-center-num">${s.doneRate}%</div>
                    <div class="task-an-donut-center-lbl">done</div>
                </div>
            </div>
            <div class="task-an-donut-legend">
                <div class="task-an-donut-legend-item">
                    <div class="task-an-legend-dot" style="background:#8892a4"></div>
                    ${tr.todo_lbl}
                    <span class="task-an-legend-val">${s.todoCount}</span>
                </div>
                <div class="task-an-donut-legend-item">
                    <div class="task-an-legend-dot" style="background:#5b6ef5"></div>
                    ${tr.prog_lbl}
                    <span class="task-an-legend-val">${s.progressCount}</span>
                </div>
                <div class="task-an-donut-legend-item">
                    <div class="task-an-legend-dot" style="background:#22c55e"></div>
                    ${tr.done_lbl}
                    <span class="task-an-legend-val">${s.doneCount}</span>
                </div>
            </div>
        </div>
    </div>`;

    /* ── Priority bars ── */
    const PRI_META = {
        urgent: { label: tr.pri_urgent, icon: "🔥", color: "#7c3aed", bg: "linear-gradient(90deg,#7c3aed,#a78bfa)" },
        high: { label: tr.pri_high, icon: "🔴", color: "#ef4444", bg: "linear-gradient(90deg,#ef4444,#fb7185)" },
        medium: { label: tr.pri_medium, icon: "🟡", color: "#f59e0b", bg: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
        low: { label: tr.pri_low, icon: "🟢", color: "#22c55e", bg: "linear-gradient(90deg,#22c55e,#4ade80)" },
        none: { label: tr.pri_none, icon: "⬜", color: "#8892a4", bg: "linear-gradient(90deg,#8892a4,#b0b8cc)" },
    };
    const maxPri = Math.max(...Object.values(s.priorityCounts), 1);
    const priHtml = `
    <div class="task-an-card" style="animation-delay:0.20s">
        <div class="task-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M3 6h18M3 12h12M3 18h8" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.priority_dist}
        </div>
        <div class="task-an-pri-bars">
            ${["urgent", "high", "medium", "low", "none"]
                .map((key, i) => {
                    const meta = PRI_META[key];
                    const count = s.priorityCounts[key] || 0;
                    const pct = Math.round((count / maxPri) * 100);
                    return `
                <div class="task-an-pri-row" style="animation-delay:${0.22 + i * 0.04}s">
                    <div class="task-an-pri-top">
                        <span class="task-an-pri-label">${meta.icon} ${meta.label}</span>
                        <span class="task-an-pri-count">${count}</span>
                    </div>
                    <div class="task-an-pri-track">
                        <div class="task-an-pri-fill" data-width="${pct}"
                             style="width:0%;background:${meta.bg}"></div>
                    </div>
                </div>`;
                })
                .join("")}
        </div>
    </div>`;

    /* ── Top assignees ── */
    const maxAssign = s.topAssignees.length ? s.topAssignees[0].count : 1;
    const assigneeHtml = `
    <div class="task-an-card" style="animation-delay:0.22s">
        <div class="task-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="#5b6ef5" stroke-width="2"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.top_assignees}
        </div>
        ${
            s.topAssignees.length === 0
                ? `<div style="color:#b0b8cc;font-size:12px;padding:12px 0">${tr.no_data}</div>`
                : `<div class="task-an-assignee-list">
                ${s.topAssignees
                    .map((a) => {
                        const pct = Math.round((a.count / maxAssign) * 100);
                        return `
                    <div class="task-an-assignee-row">
                        ${_avatarEl(a.username, 30)}
                        <div class="task-an-av-info">
                            <div class="task-an-av-name">${_esc(a.username)}</div>
                            <div class="task-an-av-sub">${a.done}/${a.count} done</div>
                        </div>
                        <div class="task-an-av-bar-bg">
                            <div class="task-an-av-bar-fill" data-width="${pct}" style="width:0%"></div>
                        </div>
                        <span class="task-an-av-num">${a.count}</span>
                    </div>`;
                    })
                    .join("")}
            </div>`
        }
    </div>`;

    /* ── Project progress ── */
    const projHtml = `
    <div class="task-an-card" style="animation-delay:0.24s">
        <div class="task-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
                      stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.projects_prog}
        </div>
        ${
            s.projectStats.length === 0
                ? `<div style="color:#b0b8cc;font-size:12px;padding:12px 0">${tr.no_data}</div>`
                : `<div class="task-an-project-list">
                ${s.projectStats
                    .slice(0, 5)
                    .map(
                        (p, i) => `
                <div class="task-an-project-row" style="animation-delay:${0.26 + i * 0.04}s">
                    <div class="task-an-proj-icon">🗂️</div>
                    <div class="task-an-proj-info">
                        <div class="task-an-proj-name">${_esc(p.name)}</div>
                        <div class="task-an-proj-sub">
                            ${p.done}/${p.total} ${tr.tasks_lbl}
                        </div>
                    </div>
                    <div class="task-an-proj-done-bar">
                        <div class="task-an-proj-done-fill" data-width="${p.pct}" style="width:0%"></div>
                    </div>
                    <span class="task-an-proj-pct">${p.pct}%</span>
                </div>`,
                    )
                    .join("")}
            </div>`
        }
    </div>`;

    /* ── Overdue tasks ── */
    const overdueHtml = `
    <div class="task-an-card" style="animation-delay:0.26s">
        <div class="task-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="#ef4444" stroke-width="2"/>
                <path d="M12 7v5l3 3" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.overdue}
            <span class="task-an-card-badge" style="background:#fee2e2;color:#ef4444">${s.overdueTasks.length}</span>
        </div>
        ${
            s.overdueTasks.length === 0
                ? `<div style="color:#22c55e;font-size:12px;padding:12px 0;display:flex;align-items:center;gap:6px">
                <span>✅</span> Barcha vazifalar o'z vaqtida!
               </div>`
                : `<div class="task-an-overdue-list">
                ${s.overdueTasks
                    .map((t, i) => {
                        const daysOver = Math.floor((new Date() - new Date(t.dueDate)) / 86400000);
                        return `
                    <div class="task-an-overdue-row" style="animation-delay:${0.28 + i * 0.04}s">
                        <div class="task-an-overdue-dot"></div>
                        <div class="task-an-overdue-body">
                            <div class="task-an-overdue-title">${_esc(t.title)}</div>
                            <div class="task-an-overdue-meta">${_esc(t.projectName)}</div>
                        </div>
                        <span class="task-an-overdue-date">-${daysOver}d</span>
                    </div>`;
                    })
                    .join("")}
            </div>`
        }
    </div>`;

    /* ── Bottom strip ── */
    const stripHtml = `
    <div class="task-an-strip">
        <div class="task-an-strip-item">
            <div class="task-an-strip-icon" style="background:#eef0fd">📅</div>
            <div class="task-an-strip-info">
                <div class="task-an-strip-label">${tr.today_tasks}</div>
                <div class="task-an-strip-val" data-count="${s.todayTasks}">0</div>
                <div class="task-an-strip-sub">bugun muddati</div>
            </div>
        </div>
        <div class="task-an-strip-item">
            <div class="task-an-strip-icon" style="background:#dcfce7">✅</div>
            <div class="task-an-strip-info">
                <div class="task-an-strip-label">${tr.done_rate}</div>
                <div class="task-an-strip-val" style="color:#22c55e" data-pct="${s.doneRate}">0%</div>
                <div class="task-an-strip-sub">${s.doneCount}/${s.totalTasks}</div>
            </div>
        </div>
        <div class="task-an-strip-item">
            <div class="task-an-strip-icon" style="background:#fef3c7">🆕</div>
            <div class="task-an-strip-info">
                <div class="task-an-strip-label">${tr.new_this_week}</div>
                <div class="task-an-strip-val" data-count="${s.weekNew}">0</div>
                <div class="task-an-strip-sub">so'nggi 7 kun</div>
            </div>
        </div>
    </div>`;

    const dateStr = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US");

    return `
    <div class="task-an-panel" id="task-an-panel">
        <div class="task-an-header">
            <div class="task-an-header-left">
                <div class="task-an-header-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <path d="M9 11l3 3L22 4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div>
                    <div class="task-an-header-title">${tr.title}</div>
                    <div class="task-an-header-sub">${tr.sub} · ${dateStr}</div>
                </div>
            </div>
            <button class="task-an-close" id="task-an-close-btn">✕</button>
        </div>

        <div class="task-an-body">
            ${kpisHtml}

            <div class="task-an-section-label">${tr.status_dist} & ${tr.priority_dist}</div>
            <div class="task-an-row-2">
                ${donutHtml}
                ${priHtml}
            </div>

            <div class="task-an-section-label">${tr.top_assignees} & ${tr.projects_prog}</div>
            <div class="task-an-row-2">
                ${assigneeHtml}
                ${projHtml}
            </div>

            <div class="task-an-section-label">${tr.overdue}</div>
            ${overdueHtml}

            ${stripHtml}
        </div>

        <div class="task-an-footer">
            <div class="task-an-footer-text">✦ ${tr.footer}</div>
            <div class="task-an-footer-stats">
                <div class="task-an-footer-badge">${s.totalTasks} ${tr.tasks_lbl}</div>
                <div class="task-an-footer-badge">${s.totalProjects} ${tr.project_lbl}</div>
            </div>
        </div>
    </div>`;
};

// ─── ANIMATE ─────────────────────────────────────────────────────
const _animate = () => {
    // Count-up
    document.querySelectorAll(".task-an-kpi-val[data-count], .task-an-strip-val[data-count]").forEach((el) => {
        const target = parseInt(el.dataset.count) || 0;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 800, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    // Pct
    document.querySelectorAll(".task-an-strip-val[data-pct]").forEach((el) => {
        const target = parseInt(el.dataset.pct) || 0;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 800, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + "%";
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    // Bar fills
    setTimeout(() => {
        document.querySelectorAll(".task-an-pri-fill[data-width], .task-an-av-bar-fill[data-width], .task-an-proj-done-fill[data-width]").forEach((el) => {
            el.style.width = el.dataset.width + "%";
        });
    }, 100);
};

// ─── OPEN PANEL ──────────────────────────────────────────────────
const _openPanel = (lang) => {
    const stats = _computeStats();
    const tr = TASK_TR[lang] || TASK_TR.en;

    const overlay = document.createElement("div");
    overlay.className = "task-an-overlay";

    overlay.innerHTML = stats
        ? _renderPanel(stats, lang)
        : `<div class="task-an-panel" style="display:flex;align-items:center;justify-content:center;min-height:200px">
               <div style="color:#b0b8cc;font-size:14px;font-weight:600">${tr.no_data}</div>
               <button class="task-an-close" id="task-an-close-btn" style="position:absolute;top:20px;right:20px">✕</button>
           </div>`;

    document.body.appendChild(overlay);
    _animate();

    const close = () => {
        const panel = overlay.querySelector(".task-an-panel");
        overlay.style.transition = "opacity 0.32s ease";
        overlay.style.opacity = "0";
        if (panel) {
            panel.style.transition = "transform 0.38s cubic-bezier(0.4,0,0.8,0.2), opacity 0.28s ease";
            panel.style.transform = "translateY(100%)";
            panel.style.opacity = "0.4";
        }
        setTimeout(() => overlay.remove(), 380);
    };

    overlay.querySelector("#task-an-close-btn")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    const onKey = (e) => {
        if (e.key === "Escape") {
            close();
            document.removeEventListener("keydown", onKey);
        }
    };
    document.addEventListener("keydown", onKey);
};

// ═══════════════════════════════════════════════════════════════
//  PUBLIC EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Trigger button HTML.
 * .todo-header-right ga insertAdjacentHTML("afterbegin", ...) bilan qo'shing.
 */
export const createTaskAnalyticsBtn = (lang) => {
    const tr = TASK_TR[lang] || TASK_TR.en;
    return `
    <button class="task-an-trigger" id="task-an-trigger">
        <span class="task-an-dot"></span>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        ${tr.btn}
    </button>`;
};

/**
 * initTodoLogic() oxiriga qo'shing:
 *   initTaskAnalytics(currentLang);
 */
export const initTaskAnalytics = (lang) => {
    const btn = document.getElementById("task-an-trigger");
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", () => _openPanel(lang));
};
