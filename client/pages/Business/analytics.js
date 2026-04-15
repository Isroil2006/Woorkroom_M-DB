import { PAY_TR } from "./translations.js";

const _fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const _fmtShort = (n) => {
    n = Number(n || 0);
    if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "k";
    return "$" + n.toFixed(0);
};

const _AV_COLORS = ["#5b6ef5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
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

const _esc = (s) =>
    String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const _avatarEl = (user, size = 32) => {
    if (!user) return `<div class="pay-an-avatar" style="width:${size}px;height:${size}px;background:#e2e8f0;"></div>`;
    const u = typeof user === "string" ? { username: user } : user;
    const fresh = JSON.parse(localStorage.getItem("users") || "[]").find((x) => x.username === u.username) || u;
    if (fresh.avatar && fresh.avatar !== "./assets/images/User-avatar.png") return `<img src="${fresh.avatar}" class="pay-an-avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;"/>`;
    return `<div class="pay-an-avatar" style="width:${size}px;height:${size}px;background:${_avColor(fresh.username)};font-size:${Math.round(size * 0.35)}px;">${_initials(fresh.username)}</div>`;
};

// ── Sana parse helper (DD.MM.YYYY yoki ISO ikkalasini ham qo'llab-quvvatlaydi) ──
const _parseDate = (raw) => {
    if (!raw) return null;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split(".");
        return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const pd = new Date(raw);
    return isNaN(pd.getTime()) ? null : pd;
};

const _computeStats = () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const me = allUsers.find((u) => u.username === currentUser?.username) || currentUser;
    if (!me) return null;

    const myPayments = me.payments || [];
    const myMethods = me.paymentMethods || [];

    const totalBalance = myMethods.reduce((s, m) => s + Number(m.balance || 0), 0);
    const totalPaid = myPayments.filter((p) => p.status === "paid" && !p.isIncoming).reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalWaiting = myPayments.filter((p) => p.status === "waiting" && !p.isIncoming).reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalIncoming = myPayments.filter((p) => p.isIncoming).reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalDocs = myPayments.length;
    const paidCount = myPayments.filter((p) => p.status === "paid" && !p.isIncoming).length;
    const waitingCount = myPayments.filter((p) => p.status === "waiting" && !p.isIncoming).length;
    const incomingCount = myPayments.filter((p) => p.isIncoming).length;

    // Per-recipient
    const perUserPay = {};
    myPayments
        .filter((p) => !p.isIncoming && p.recipientName)
        .forEach((p) => {
            if (!perUserPay[p.recipientName]) perUserPay[p.recipientName] = { total: 0, count: 0 };
            perUserPay[p.recipientName].total += Number(p.amount || 0);
            perUserPay[p.recipientName].count++;
        });
    const topRecipients = Object.entries(perUserPay)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([username, data]) => ({
            username,
            ...data,
            user: allUsers.find((u) => u.username === username) || { username },
        }));

    // Monthly last 6 — to'g'irlangan
    const now = new Date();
    const monthLabels = [],
        monthTotals = [];
    for (let i = 5; i >= 0; i--) {
        const targetYear = now.getMonth() - i < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const targetMonth = (now.getMonth() - i + 12) % 12;
        const d = new Date(targetYear, targetMonth, 1);
        monthLabels.push(d.toLocaleString("default", { month: "short" }));

        const total = myPayments
            .filter((p) => !p.isIncoming && p.status === "paid")
            .filter((p) => {
                const pd = _parseDate(p.createDate || p.date);
                if (!pd) return false;
                return pd.getFullYear() === targetYear && pd.getMonth() === targetMonth;
            })
            .reduce((s, p) => s + Number(p.amount || 0), 0);
        monthTotals.push(total);
    }
    // Agar hech qaysi oyda data yo'q bo'lsa — to'langan summani joriy oyga qo'yish
    if (!monthTotals.some((v) => v > 0) && totalPaid > 0) {
        monthTotals[monthTotals.length - 1] = totalPaid;
    }

    // Card vs Bank
    const cardBal = myMethods.filter((m) => m.type === "card").reduce((s, m) => s + Number(m.balance || 0), 0);
    const bankBal = myMethods.filter((m) => m.type !== "card").reduce((s, m) => s + Number(m.balance || 0), 0);
    const cardCount = myMethods.filter((m) => m.type === "card").length;
    const bankCount = myMethods.filter((m) => m.type !== "card").length;

    // Recent 6 — to'g'irlangan sort
    const recentTxns = [...myPayments]
        .sort((a, b) => {
            const da = _parseDate(a.createDate || a.date)?.getTime() || 0;
            const db = _parseDate(b.createDate || b.date)?.getTime() || 0;
            return db - da;
        })
        .slice(0, 6);

    const paidPayments = myPayments.filter((p) => p.status === "paid" && !p.isIncoming);
    const avgTxn = paidPayments.length ? paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0) / paidPayments.length : 0;

    return {
        totalBalance,
        totalPaid,
        totalWaiting,
        totalIncoming,
        totalDocs,
        paidCount,
        waitingCount,
        incomingCount,
        topRecipients,
        monthLabels,
        monthTotals,
        cardBal,
        bankBal,
        cardCount,
        bankCount,
        recentTxns,
        avgTxn,
        me,
    };
};

const _renderPanel = (s, lang) => {
    const tr = PAY_TR[lang] || PAY_TR.en;
    const paidRate = s.totalDocs ? Math.round((s.paidCount / s.totalDocs) * 100) : 0;

    const kpisHtml = `
    <div class="pay-an-kpis">
        <div class="pay-an-kpi pay-an-kpi--blue">
            <div class="pay-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 3H8L2 7h20l-6-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
                ${tr.total_balance}
            </div>
            <div class="pay-an-kpi-val" data-money="${s.totalBalance.toFixed(0)}">$0</div>
            <div class="pay-an-kpi-sub">${s.cardCount + s.bankCount} ${tr.accounts}</div>
        </div>
        <div class="pay-an-kpi pay-an-kpi--green">
            <div class="pay-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${tr.total_paid}
            </div>
            <div class="pay-an-kpi-val" data-money="${s.totalPaid.toFixed(0)}">$0</div>
            <div class="pay-an-kpi-sub"><span class="pay-an-trend-up">↑</span> ${s.paidCount} ${tr.paid_lbl}</div>
        </div>
        <div class="pay-an-kpi pay-an-kpi--amber">
            <div class="pay-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${tr.total_waiting}
            </div>
            <div class="pay-an-kpi-val" data-money="${s.totalWaiting.toFixed(0)}">$0</div>
            <div class="pay-an-kpi-sub">${s.waitingCount} ${tr.pending_count}</div>
        </div>
        <div class="pay-an-kpi pay-an-kpi--rose">
            <div class="pay-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${tr.total_incoming}
            </div>
            <div class="pay-an-kpi-val" data-money="${s.totalIncoming.toFixed(0)}">$0</div>
            <div class="pay-an-kpi-sub">${s.incomingCount} ${tr.incoming_lbl}</div>
        </div>
    </div>`;

    const maxMonth = Math.max(...s.monthTotals, 1);
    const monthBarHtml = `
    <div class="pay-an-card" style="animation-delay:0.18s">
        <div class="pay-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 3v18h18" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/><path d="M7 16l3-5 4 3 4-7" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${tr.monthly}
            <span>${_fmtShort(s.totalPaid)} jami</span>
        </div>
        <div class="pay-an-bar-chart">
            ${s.monthLabels
                .map((lbl, i) => {
                    const pct = Math.round((s.monthTotals[i] / maxMonth) * 100);
                    const isLatest = i === s.monthLabels.length - 1;
                    return `
                <div class="pay-an-bar-col">
                    <div class="pay-an-bar-inner">
                        <div class="pay-an-bar" data-height="${pct}"
                             style="height:0%;background:${isLatest ? "#5b6ef5" : "#b0c4f8"};
                                    transition:height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${0.05 + i * 0.07}s">
                            <div class="pay-an-bar-tooltip">${lbl}: ${_fmtShort(s.monthTotals[i])}</div>
                        </div>
                    </div>
                    <div class="pay-an-bar-lbl" style="${isLatest ? "color:#5b6ef5;font-weight:800" : ""}">${lbl}</div>
                </div>`;
                })
                .join("")}
        </div>
    </div>`;

    const acTotal = s.cardBal + s.bankBal || 1;
    const r = 46,
        circ = 2 * Math.PI * r;
    const donutHtml = `
    <div class="pay-an-card" style="animation-delay:0.20s">
        <div class="pay-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="#5b6ef5" stroke-width="2"/><path d="M16 3H8L2 7h20l-6-4z" stroke="#5b6ef5" stroke-width="2"/></svg>
            ${tr.method_split}
        </div>
        <div class="pay-an-donut-wrap">
            <div class="pay-an-donut-svg-wrap">
                <svg class="pay-an-donut-svg" width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f0f2f8" stroke-width="12"/>
                    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#5b6ef5" stroke-width="12"
                            stroke-dasharray="${(s.cardBal / acTotal) * circ} ${circ - (s.cardBal / acTotal) * circ}"
                            stroke-dashoffset="0" style="transition:stroke-dasharray 0.8s ease 0.3s"/>
                    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#0ea5e9" stroke-width="12"
                            stroke-dasharray="${(s.bankBal / acTotal) * circ} ${circ - (s.bankBal / acTotal) * circ}"
                            stroke-dashoffset="${-(s.cardBal / acTotal) * circ}" style="transition:stroke-dasharray 0.8s ease 0.4s"/>
                </svg>
                <div class="pay-an-donut-center">
                    <div class="pay-an-donut-center-num">${s.cardCount + s.bankCount}</div>
                    <div class="pay-an-donut-center-label">hisob</div>
                </div>
            </div>
            <div class="pay-an-donut-legend">
                <div class="pay-an-donut-legend-item">
                    <div class="pay-an-legend-dot" style="background:#5b6ef5"></div>
                    💳 ${tr.card} (${s.cardCount})
                    <span class="pay-an-legend-val">${_fmtShort(s.cardBal)}</span>
                </div>
                <div class="pay-an-donut-legend-item">
                    <div class="pay-an-legend-dot" style="background:#0ea5e9"></div>
                    🏦 ${tr.bank} (${s.bankCount})
                    <span class="pay-an-legend-val">${_fmtShort(s.bankBal)}</span>
                </div>
            </div>
        </div>
    </div>`;

    const maxRecip = s.topRecipients.length ? s.topRecipients[0].total : 1;
    const recipHtml = `
    <div class="pay-an-card" style="animation-delay:0.22s">
        <div class="pay-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="#5b6ef5" stroke-width="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/></svg>
            ${tr.top_recipients}
        </div>
        ${
            s.topRecipients.length === 0
                ? `<div style="color:#b0b8cc;font-size:12px;text-align:center;padding:20px 0">${tr.no_data}</div>`
                : `<div class="pay-an-table">
                <div class="pay-an-table-head">
                    <div class="pay-an-th">Foydalanuvchi</div>
                    <div class="pay-an-th">Jami</div>
                    <div class="pay-an-th">Tranzaksiya</div>
                    <div class="pay-an-th">Ulush</div>
                </div>
                ${s.topRecipients
                    .map((r) => {
                        const pct = Math.round((r.total / maxRecip) * 100);
                        return `
                    <div class="pay-an-table-row">
                        <div class="pay-an-user-cell">
                            ${_avatarEl(r.user, 30)}
                            <div><div class="pay-an-user-name">${_esc(r.username)}</div><div class="pay-an-user-sub">${r.count} to'lov</div></div>
                        </div>
                        <div class="pay-an-cell pay-an-cell--money">${_fmtShort(r.total)}</div>
                        <div class="pay-an-cell">${r.count}</div>
                        <div class="pay-an-cell">
                            <div class="pay-an-score-wrap">
                                <div class="pay-an-score-bg"><div class="pay-an-score-fill" data-width="${pct}" style="width:0%;background:linear-gradient(90deg,#5b6ef5,#818cf8)"></div></div>
                                <span style="font-size:10px;font-weight:700;color:#5b6ef5;min-width:26px">${pct}%</span>
                            </div>
                        </div>
                    </div>`;
                    })
                    .join("")}
            </div>`
        }
    </div>`;

    const recentHtml = `
    <div class="pay-an-card" style="animation-delay:0.24s">
        <div class="pay-an-card-title">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#5b6ef5" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/></svg>
            ${tr.recent_txns}
        </div>
        <div class="pay-an-txns">
            ${
                s.recentTxns.length === 0
                    ? `<div style="color:#b0b8cc;font-size:12px;padding:10px 0">${tr.no_data}</div>`
                    : s.recentTxns
                          .map((p) => {
                              const isIn = p.isIncoming,
                                  isW = p.status === "waiting" && !isIn;
                              const color = isIn ? "#22c55e" : isW ? "#f59e0b" : "#5b6ef5";
                              const icon = isIn ? "📥" : isW ? "⏳" : "📤";
                              const bg = isIn ? "#dcfce7" : isW ? "#fef3c7" : "#eef0fd";
                              return `
                    <div class="pay-an-txn-row">
                        <div class="pay-an-txn-icon" style="background:${bg}">${icon}</div>
                        <div class="pay-an-txn-body">
                            <div class="pay-an-txn-desc">${_esc(p.desc || "To'lov")}</div>
                            <div class="pay-an-txn-sub">${p.recipientName || "—"} · ${p.date || ""}</div>
                        </div>
                        <div class="pay-an-txn-amount" style="color:${color}">${isIn ? "+" : "-"}${_fmt(p.amount)}</div>
                    </div>`;
                          })
                          .join("")
            }
        </div>
    </div>`;

    const miniHtml = `
    <div class="pay-an-row-3">
        <div class="pay-an-mini-stat">
            <div class="pay-an-mini-label"><svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/></svg>${tr.avg_txn}</div>
            <div class="pay-an-mini-val">${_fmtShort(s.avgTxn)}</div>
            <div class="pay-an-mini-sub">${s.paidCount} ${tr.txns_lbl}</div>
        </div>
        <div class="pay-an-mini-stat">
            <div class="pay-an-mini-label"><svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${tr.paid_rate}</div>
            <div class="pay-an-mini-val" style="color:#22c55e">${paidRate}%</div>
            <div class="pay-an-mini-sub">${s.totalDocs} ${tr.of_total}</div>
        </div>
        <div class="pay-an-mini-stat">
            <div class="pay-an-mini-label"><svg width="10" height="10" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#f59e0b" stroke-width="2"/><path d="M12 7v5l3 3" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/></svg>${tr.pending_count}</div>
            <div class="pay-an-mini-val" style="color:#f59e0b">${s.waitingCount}</div>
            <div class="pay-an-mini-sub">${_fmtShort(s.totalWaiting)} kutilmoqda</div>
        </div>
    </div>`;

    const dateStr = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US");

    return `
    <div class="pay-an-panel" id="pay-an-panel">
        <div class="pay-an-header">
            <div class="pay-an-header-left">
                <div class="pay-an-header-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="#fff" stroke-width="2"/><path d="M16 3H8L2 7h20l-6-4z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>
                </div>
                <div>
                    <div class="pay-an-header-title">${tr.title}</div>
                    <div class="pay-an-header-sub">${tr.sub} · ${dateStr}</div>
                </div>
            </div>
            <button class="pay-an-close" id="pay-an-close-btn">✕</button>
        </div>
        <div class="pay-an-body">
            ${kpisHtml}
            <div class="pay-an-section-label">${tr.monthly}</div>
            <div class="pay-an-row-2">${monthBarHtml}${donutHtml}</div>
            <div class="pay-an-section-label">${tr.transactions}</div>
            <div class="pay-an-row-2">${recipHtml}${recentHtml}</div>
            ${miniHtml}
        </div>
        <div class="pay-an-footer">
            <div class="pay-an-footer-text">✦ ${tr.footer} · ${s.totalDocs} ${tr.txns_lbl} · ${_fmt(s.totalBalance)} balans</div>
        </div>
    </div>`;
};

const _animate = () => {
    document.querySelectorAll(".pay-an-kpi-val[data-money]").forEach((el) => {
        const target = parseFloat(el.dataset.money) || 0,
            start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 900, 1),
                ease = 1 - Math.pow(1 - p, 3),
                val = target * ease;
            el.textContent = val >= 1000 ? "$" + (val / 1000).toFixed(1) + "k" : "$" + Math.round(val).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    setTimeout(() => {
        document.querySelectorAll(".pay-an-bar[data-height]").forEach((b) => {
            b.style.height = b.dataset.height + "%";
        });
    }, 80);
    setTimeout(() => {
        document.querySelectorAll(".pay-an-score-fill[data-width]").forEach((el) => {
            el.style.width = el.dataset.width + "%";
        });
    }, 350);
};

const _openPanel = (lang) => {
    const stats = _computeStats(),
        tr = PAY_TR[lang] || PAY_TR.en;
    const overlay = document.createElement("div");
    overlay.className = "pay-an-overlay";
    overlay.innerHTML = stats
        ? _renderPanel(stats, lang)
        : `<div class="pay-an-panel" style="padding:60px;align-items:center;justify-content:center">
            <div style="color:#b0b8cc;font-size:15px;font-weight:600;text-align:center">${tr.no_data}</div>
            <button class="pay-an-close" id="pay-an-close-btn" style="position:absolute;top:20px;right:20px">✕</button>
          </div>`;
    document.body.appendChild(overlay);
    _animate();
    const close = () => {
        const panel = overlay.querySelector(".pay-an-panel");
        overlay.style.transition = "opacity 0.32s ease";
        overlay.style.opacity = "0";
        if (panel) {
            panel.style.transition = "transform 0.38s cubic-bezier(0.4,0,0.8,0.2), opacity 0.28s ease";
            panel.style.transform = "translateY(100%)";
            panel.style.opacity = "0.4";
        }
        setTimeout(() => overlay.remove(), 380);
    };
    overlay.querySelector("#pay-an-close-btn")?.addEventListener("click", close);
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

export const createPayAnalyticsBtn = (lang) => {
    const tr = PAY_TR[lang] || PAY_TR.en;
    return `<button class="pay-an-trigger" id="pay-an-trigger"><span class="pay-an-dot"></span><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 3H8L2 7h20l-6-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>${tr.btn}</button>`;
};

export const initPayAnalytics = (lang) => {
    const btn = document.getElementById("pay-an-trigger");
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", () => _openPanel(lang));
};
