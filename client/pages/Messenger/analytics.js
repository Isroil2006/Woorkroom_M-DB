import { MSG_AN_TR } from "./translations.js";

// ─── HELPERS ────────────────────────────────────────────────────
const _esc = (s) =>
    String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const _fmt = (iso) => (!iso ? "" : new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

// Avatar color (same logic as messenger.js)
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

const _avatarEl = (user, size = 32) => {
    if (!user) return `<div class="msg-an-talker-avatar" style="width:${size}px;height:${size}px;background:#e2e8f0;"></div>`;
    const u = typeof user === "string" ? { username: user } : user;
    const freshUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const fresh = freshUsers.find((x) => x.username === u.username) || u;
    if (fresh.avatar && fresh.avatar !== "./assets/images/User-avatar.png") {
        return `<img src="${fresh.avatar}" class="msg-an-talker-avatar" style="width:${size}px;height:${size}px;"/>`;
    }
    return `<div class="msg-an-talker-avatar" style="width:${size}px;height:${size}px;background:${_avColor(fresh.username)};font-size:${Math.round(size * 0.36)}px;">
        ${_initials(fresh.username)}
    </div>`;
};

// ─── DATA COLLECTORS ────────────────────────────────────────────
const _getAllChatKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("msg_chat_")) keys.push(k);
    }
    return keys;
};

const _getAllMessages = () => {
    const all = [];
    _getAllChatKeys().forEach((k) => {
        try {
            const msgs = JSON.parse(localStorage.getItem(k)) || [];
            msgs.forEach((m) => all.push(m));
        } catch (e) {}
    });
    return all;
};

const _computeStats = () => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const allMsgs = _getAllMessages();

    if (!allMsgs.length && !users.length) return null;

    // Total counts
    const totalMsgs = allMsgs.length;
    const totalImages = allMsgs.filter((m) => m.type === "image").length;
    const totalEdited = allMsgs.filter((m) => m.edited).length;
    const totalContacts = users.filter((u) => u.username !== currentUser?.username).length;

    // Per-user message counts (who sent most to me / who I chat with most)
    const perUser = {};
    allMsgs.forEach((m) => {
        perUser[m.from] = (perUser[m.from] || 0) + 1;
    });

    // Top 5 senders (excluding current user)
    const topSenders = Object.entries(perUser)
        .filter(([u]) => u !== currentUser?.username)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([username, count]) => ({
            username,
            count,
            user: users.find((u) => u.username === username) || { username },
        }));

    // My own message count
    const myMsgCount = perUser[currentUser?.username] || 0;

    // Messages per contact (for donut — text vs image ratio)
    const textCount = allMsgs.filter((m) => m.type !== "image").length;
    const imageCount = totalImages;

    // Hour-of-day heatmap (0-23)
    const hourBuckets = new Array(24).fill(0);
    allMsgs.forEach((m) => {
        if (m.at) {
            const h = new Date(m.at).getHours();
            hourBuckets[h]++;
        }
    });

    // Day-of-week activity (0=Sun, 1=Mon … 6=Sat)
    const dayBuckets = new Array(7).fill(0);
    allMsgs.forEach((m) => {
        if (m.at) {
            const d = new Date(m.at).getDay();
            dayBuckets[d]++;
        }
    });

    // 5 most recent messages (for "recent activity" strip)
    const recentMsgs = [...allMsgs]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 5)
        .map((m) => ({
            ...m,
            fromUser: users.find((u) => u.username === m.from) || { username: m.from },
        }));

    // Most active hour
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

    // Avg messages per chat
    const chatKeys = _getAllChatKeys();
    const avgPerChat = chatKeys.length ? Math.round(totalMsgs / chatKeys.length) : 0;

    return {
        totalMsgs,
        totalImages,
        totalEdited,
        totalContacts,
        myMsgCount,
        textCount,
        imageCount,
        topSenders,
        hourBuckets,
        dayBuckets,
        recentMsgs,
        peakHour,
        avgPerChat,
        chatCount: chatKeys.length,
    };
};

// ─── RENDER PANEL ───────────────────────────────────────────────
const _renderPanel = (s, lang) => {
    const tr = MSG_AN_TR[lang] || MSG_AN_TR.en;

    /* ── KPIs ── */
    const kpisHtml = `
    <div class="msg-an-kpis">
        <div class="msg-an-kpi msg-an-kpi--blue">
            <div class="msg-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.total_msgs}
            </div>
            <div class="msg-an-kpi-val" data-target="${s.totalMsgs}">0</div>
            <div class="msg-an-kpi-sub">${s.chatCount} ${tr.all_chats}</div>
        </div>
        <div class="msg-an-kpi msg-an-kpi--violet">
            <div class="msg-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.total_imgs}
            </div>
            <div class="msg-an-kpi-val" data-target="${s.totalImages}">0</div>
            <div class="msg-an-kpi-sub">${s.totalMsgs ? Math.round((s.totalImages / s.totalMsgs) * 100) : 0}% rasmlar</div>
        </div>
        <div class="msg-an-kpi msg-an-kpi--green">
            <div class="msg-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.contacts}
            </div>
            <div class="msg-an-kpi-val" data-target="${s.totalContacts}">0</div>
            <div class="msg-an-kpi-sub">${tr.avg_per_chat}: ${s.avgPerChat}</div>
        </div>
        <div class="msg-an-kpi msg-an-kpi--amber">
            <div class="msg-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.my_msgs}
            </div>
            <div class="msg-an-kpi-val" data-target="${s.myMsgCount}">0</div>
            <div class="msg-an-kpi-sub">${tr.sent_by_me}</div>
        </div>
    </div>`;

    /* ── Top Senders + Heatmap ── */
    const maxSend = s.topSenders.length ? s.topSenders[0].count : 1;
    const sendersHtml = `
    <div class="msg-an-card" style="animation-delay:0.18s">
        <div class="msg-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="#5b6ef5" stroke-width="2"/>
            </svg>
            ${tr.top_senders}
        </div>
        <div class="msg-an-talkers">
            ${
                s.topSenders.length === 0
                    ? `<div style="color:#b0b8cc;font-size:12px;text-align:center;padding:20px 0">${tr.no_data}</div>`
                    : s.topSenders
                          .map((sender) => {
                              const pct = Math.round((sender.count / maxSend) * 100);
                              return `
                    <div class="msg-an-talker-row">
                        ${_avatarEl(sender.user, 34)}
                        <div class="msg-an-talker-info">
                            <div class="msg-an-talker-name">${_esc(sender.username)}</div>
                        </div>
                        <div class="msg-an-talker-bar-wrap">
                            <div class="msg-an-talker-bar-bg">
                                <div class="msg-an-talker-bar-fill" data-width="${pct}" style="width:0%"></div>
                            </div>
                            <span class="msg-an-talker-num">${sender.count}</span>
                        </div>
                    </div>`;
                          })
                          .join("")
            }
        </div>
    </div>`;

    /* Donut: text vs image */
    const donutTotal = s.textCount + s.imageCount;
    const r = 42,
        circ = 2 * Math.PI * r;
    const textPct = donutTotal ? s.textCount / donutTotal : 0.5;
    const imagePct = donutTotal ? s.imageCount / donutTotal : 0.5;
    const donutHtml = `
    <div class="msg-an-card" style="animation-delay:0.20s">
        <div class="msg-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#5b6ef5" stroke-width="2"/>
                <path d="M12 8v4l3 3" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.msg_type}
        </div>
        <div class="msg-an-donut-wrap">
            <div class="msg-an-donut-svg-wrap">
                <svg class="msg-an-donut-svg" width="110" height="110" viewBox="0 0 110 110">
                    <circle cx="55" cy="55" r="${r}" fill="none"
                            stroke="#f0f2f8" stroke-width="11"/>
                    <circle cx="55" cy="55" r="${r}" fill="none"
                            stroke="#5b6ef5" stroke-width="11"
                            stroke-dasharray="${textPct * circ} ${circ - textPct * circ}"
                            stroke-dashoffset="0"
                            style="transition:stroke-dasharray 0.8s ease 0.3s"/>
                    <circle cx="55" cy="55" r="${r}" fill="none"
                            stroke="#7c3aed" stroke-width="11"
                            stroke-dasharray="${imagePct * circ} ${circ - imagePct * circ}"
                            stroke-dashoffset="${-textPct * circ}"
                            style="transition:stroke-dasharray 0.8s ease 0.4s"/>
                </svg>
                <div class="msg-an-donut-center">
                    <div class="msg-an-donut-center-num">${donutTotal}</div>
                    <div class="msg-an-donut-center-label">jami</div>
                </div>
            </div>
            <div class="msg-an-donut-legend">
                <div class="msg-an-donut-legend-item">
                    <div class="msg-an-legend-dot" style="background:#5b6ef5"></div>
                    ${tr.text_msgs}
                    <span class="msg-an-legend-count">${s.textCount}</span>
                </div>
                <div class="msg-an-donut-legend-item">
                    <div class="msg-an-legend-dot" style="background:#7c3aed"></div>
                    ${tr.img_msgs}
                    <span class="msg-an-legend-count">${s.imageCount}</span>
                </div>
                ${
                    s.totalEdited > 0
                        ? `
                <div class="msg-an-donut-legend-item">
                    <div class="msg-an-legend-dot" style="background:#f59e0b"></div>
                    ${tr.edited_msgs}
                    <span class="msg-an-legend-count">${s.totalEdited}</span>
                </div>`
                        : ""
                }
            </div>
        </div>
    </div>`;

    /* ── Mini stats (peak hour, avg/chat, edited) ── */
    const peakHourStr = `${String(s.peakHour).padStart(2, "0")}:00–${String(s.peakHour + 1).padStart(2, "0")}:00`;
    const miniStatsHtml = `
    <div class="msg-an-row-3">
        <div class="msg-an-mini-stat">
            <div class="msg-an-mini-label">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="#f59e0b" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.peak_hour}
            </div>
            <div class="msg-an-mini-val" style="font-size:18px;letter-spacing:-0.3px">${peakHourStr}</div>
            <div class="msg-an-mini-sub">${s.hourBuckets[s.peakHour]} xabar</div>
        </div>
        <div class="msg-an-mini-stat">
            <div class="msg-an-mini-label">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                          stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.avg_per_chat}
            </div>
            <div class="msg-an-mini-val" data-target="${s.avgPerChat}">0</div>
            <div class="msg-an-mini-sub">${s.chatCount} suhbat</div>
        </div>
        <div class="msg-an-mini-stat">
            <div class="msg-an-mini-label">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                          stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.edited_msgs}
            </div>
            <div class="msg-an-mini-val" data-target="${s.totalEdited}">0</div>
            <div class="msg-an-mini-sub">${s.totalMsgs ? Math.round((s.totalEdited / s.totalMsgs) * 100) : 0}% of all</div>
        </div>
    </div>`;

    /* ── Hourly heatmap ── */
    const maxHour = Math.max(...s.hourBuckets, 1);
    // Show in 3 groups: 00-07, 08-15, 16-23
    const groups = [
        { label: "Tun", range: [0, 8], color: "#7c3aed" },
        { label: "Kunduz", range: [8, 16], color: "#f59e0b" },
        { label: "Kech", range: [16, 24], color: "#5b6ef5" },
    ];
    const heatmapHtml = `
    <div class="msg-an-card" style="animation-delay:0.24s">
        <div class="msg-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#5b6ef5" stroke-width="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.activity}
        </div>
        <div class="msg-an-heatmap">
            ${groups
                .map(
                    (g) => `
            <div class="msg-an-heatmap-row">
                <div class="msg-an-heatmap-label">${g.label}</div>
                ${s.hourBuckets
                    .slice(g.range[0], g.range[1])
                    .map((cnt, i) => {
                        const h = g.range[0] + i;
                        const intensity = maxHour ? cnt / maxHour : 0;
                        const alpha = 0.08 + intensity * 0.85;
                        return `
                    <div class="msg-an-heat-cell" data-h="${h}"
                         style="background:${g.color};opacity:${alpha.toFixed(2)}">
                        <div class="msg-an-heat-tooltip">${String(h).padStart(2, "0")}:00 — ${cnt} xabar</div>
                    </div>`;
                    })
                    .join("")}
            </div>`,
                )
                .join("")}
        </div>
        <div class="msg-an-heatmap-hours" style="margin-top:6px">
            ${Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? `<div class="msg-an-heatmap-hour-label">${String(i).padStart(2, "0")}</div>` : `<div class="msg-an-heatmap-hour-label"></div>`)).join("")}
        </div>
    </div>`;

    /* ── Day-of-week bar chart ── */
    const maxDay = Math.max(...s.dayBuckets, 1);
    const dayBarHtml = `
    <div class="msg-an-card" style="animation-delay:0.26s">
        <div class="msg-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <path d="M3 3v18h18" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
                <path d="M7 16l3-4 4 3 4-6" stroke="#5b6ef5" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${tr.day_activity}
        </div>
        <div class="msg-an-bar-chart">
            ${s.dayBuckets
                .map((cnt, i) => {
                    const pct = Math.round((cnt / maxDay) * 100);
                    const isToday = new Date().getDay() === i;
                    const color = isToday ? "#5b6ef5" : "#b0c4f8";
                    return `
                <div class="msg-an-bar-col">
                    <div class="msg-an-bar-inner">
                        <div class="msg-an-bar" data-height="${pct}"
                             style="height:0%;background:${color};
                                    transition:height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${0.05 + i * 0.06}s">
                            <div class="msg-an-bar-tooltip">${tr.days[i]}: ${cnt}</div>
                        </div>
                    </div>
                    <div class="msg-an-bar-lbl" style="${isToday ? "color:#5b6ef5;font-weight:800" : ""}">${tr.days[i]}</div>
                </div>`;
                })
                .join("")}
        </div>
    </div>`;

    /* ── Recent messages ── */
    const recentHtml = `
    <div class="msg-an-card" style="animation-delay:0.28s">
        <div class="msg-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="#5b6ef5" stroke-width="2"/>
                <path d="M12 6v6l4 2" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.recent}
        </div>
        <div class="msg-an-recent">
            ${
                s.recentMsgs.length === 0
                    ? `<div style="color:#b0b8cc;font-size:12px;padding:10px 0">${tr.no_data}</div>`
                    : s.recentMsgs
                          .map(
                              (m) => `
                <div class="msg-an-recent-item">
                    ${_avatarEl(m.fromUser, 32)}
                    <div class="msg-an-recent-body">
                        <div class="msg-an-recent-name">${_esc(m.from)}</div>
                        <div class="msg-an-recent-text">${m.type === "image" ? tr.photo : _esc(m.text || "")}</div>
                    </div>
                    <div class="msg-an-recent-time">${_fmt(m.at)}</div>
                </div>`,
                          )
                          .join("")
            }
        </div>
    </div>`;

    const dateStr = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US");

    return `
    <div class="msg-an-panel" id="msg-an-panel">
        <div class="msg-an-header">
            <div class="msg-an-header-left">
                <div class="msg-an-header-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                              stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div>
                    <div class="msg-an-header-title">${tr.title}</div>
                    <div class="msg-an-header-sub">${tr.sub} · ${dateStr}</div>
                </div>
            </div>
            <button class="msg-an-close" id="msg-an-close-btn">✕</button>
        </div>

        <div class="msg-an-body">
            ${kpisHtml}
            <div class="msg-an-section-label">${tr.top_senders}</div>
            <div class="msg-an-row-2">
                ${sendersHtml}
                ${donutHtml}
            </div>
            <div class="msg-an-section-label">${tr.activity}</div>
            ${heatmapHtml}
            <div class="msg-an-row-2">
                ${dayBarHtml}
                ${recentHtml}
            </div>
            ${miniStatsHtml}
        </div>

        <div class="msg-an-footer">
            <div class="msg-an-footer-text">
                ✦ ${tr.footer} · ${s.totalMsgs} ${tr.messages}
            </div>
        </div>
    </div>`;
};

// ─── ANIMATE ────────────────────────────────────────────────────
const _animate = () => {
    // Count-up
    document.querySelectorAll(".msg-an-kpi-val[data-target], .msg-an-mini-val[data-target]").forEach((el) => {
        const target = parseInt(el.dataset.target) || 0;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 800, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * ease).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    // Bar heights
    setTimeout(() => {
        document.querySelectorAll(".msg-an-bar[data-height]").forEach((b) => {
            b.style.height = b.dataset.height + "%";
        });
    }, 80);
    // Sender bars
    setTimeout(() => {
        document.querySelectorAll(".msg-an-talker-bar-fill[data-width]").forEach((el) => {
            el.style.width = el.dataset.width + "%";
        });
    }, 300);
};

// ─── OPEN PANEL ─────────────────────────────────────────────────
const _openPanel = (lang) => {
    const stats = _computeStats();
    const tr = MSG_AN_TR[lang] || MSG_AN_TR.en;

    const overlay = document.createElement("div");
    overlay.className = "msg-an-overlay";

    overlay.innerHTML = stats
        ? _renderPanel(stats, lang)
        : `<div class="msg-an-panel" style="padding:60px;align-items:center;justify-content:center">
               <div style="color:#b0b8cc;font-size:15px;font-weight:600;text-align:center">${tr.no_data}</div>
               <button class="msg-an-close" id="msg-an-close-btn"
                       style="position:absolute;top:20px;right:20px">✕</button>
           </div>`;

    document.body.appendChild(overlay);
    _animate();

    const close = () => {
        const panel = overlay.querySelector(".msg-an-panel");
        overlay.style.transition = "opacity 0.3s ease";
        overlay.style.opacity = "0";
        if (panel) {
            panel.style.transition = "transform 0.36s cubic-bezier(0.4,0,0.8,0.2), opacity 0.26s ease";
            panel.style.transform = "translateY(100%)";
            panel.style.opacity = "0.4";
        }
        setTimeout(() => overlay.remove(), 360);
    };

    overlay.querySelector("#msg-an-close-btn")?.addEventListener("click", close);
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

export const createMsgAnalyticsBtn = (lang) => {
    const tr = MSG_AN_TR[lang] || MSG_AN_TR.en;
    return `
    <button class="msg-an-trigger" id="msg-an-trigger">
        <span class="msg-an-dot"></span>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        ${tr.btn}
    </button>`;
};

export const initMsgAnalytics = (lang) => {
    const btn = document.getElementById("msg-an-trigger");
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", () => _openPanel(lang));
};
