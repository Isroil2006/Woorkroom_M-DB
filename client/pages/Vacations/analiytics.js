import { AN_TR } from "./translations.js";

// ─── HELPERS ────────────────────────────────────────────────────
const _ml = (field, lang) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[lang] || field.uz || field.en || Object.values(field)[0] || "";
};
const _esc = (s) =>
    String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const _fmtPrice = (n) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`);

// ─── CATEGORY META ──────────────────────────────────────────────
const CAT_META = {
    beach: { emoji: "🏖️", color: "#0ea5e9", bg: "rgba(14,165,233,0.15)" },
    mountain: { emoji: "⛰️", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
    city: { emoji: "🏙️", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
    nature: { emoji: "🌿", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
};
const CAT_COLORS = ["#5b6ef5", "#22c55e", "#f59e0b", "#f43f5e", "#a78bfa", "#0ea5e9"];

// ─── COMPUTE STATS ──────────────────────────────────────────────
const _computeStats = (tours) => {
    if (!tours.length) return null;

    const total = tours.length;
    const totalValue = tours.reduce((s, t) => s + (t.price || 0), 0);
    const avgPrice = Math.round(totalValue / total);
    const avgRating = (tours.reduce((s, t) => s + (t.rating || 0), 0) / total).toFixed(1);
    const avgDays = Math.round(tours.reduce((s, t) => s + (t.days || 0), 0) / total);

    const catCount = {};
    const catPrice = {};
    tours.forEach((t) => {
        catCount[t.category] = (catCount[t.category] || 0) + 1;
        catPrice[t.category] = (catPrice[t.category] || 0) + (t.price || 0);
    });

    const priceSorted = [...tours].sort((a, b) => b.price - a.price);
    const cheapest = Math.min(...tours.map((t) => t.price || 0));
    const priciest = Math.max(...tours.map((t) => t.price || 0));

    return { total, totalValue, avgPrice, avgRating, avgDays, catCount, catPrice, priceSorted, cheapest, priciest };
};

// ─── RENDER PANEL ───────────────────────────────────────────────
const _renderPanel = (stats, lang) => {
    const tr = AN_TR[lang] || AN_TR.en;
    const s = stats;
    const cats = Object.keys(s.catCount);

    /* ── KPIs ── */
    const kpisHtml = `
    <div class="vac-an-kpis">
        <div class="vac-an-kpi vac-an-kpi--blue">
            <div class="vac-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2.2"/>
                </svg>
                ${tr.total_tours}
            </div>
            <div class="vac-an-kpi-val" data-target="${s.total}">0</div>
            <div class="vac-an-kpi-sub">${tr.in_catalog}</div>
        </div>
        <div class="vac-an-kpi vac-an-kpi--green">
            <div class="vac-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.avg_price}
            </div>
            <div class="vac-an-kpi-val" data-prefix="$" data-target="${s.avgPrice}">$0</div>
            <div class="vac-an-kpi-sub">
                <span class="vac-an-trend-up">↑</span>
                ${tr.range}: ${_fmtPrice(s.cheapest)} – ${_fmtPrice(s.priciest)}
            </div>
        </div>
        <div class="vac-an-kpi vac-an-kpi--amber">
            <div class="vac-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                          stroke="currentColor" stroke-width="1.8"/>
                </svg>
                ${tr.avg_rating}
            </div>
            <div class="vac-an-kpi-val" data-target="${parseFloat(s.avgRating) * 10}" data-decimal="1">
                ${s.avgRating}
            </div>
            <div class="vac-an-kpi-sub">
                <span class="vac-an-trend-up">★</span> ${tr.out_of_5}
            </div>
        </div>
        <div class="vac-an-kpi vac-an-kpi--rose">
            <div class="vac-an-kpi-label">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${tr.avg_days}
            </div>
            <div class="vac-an-kpi-val" data-target="${s.avgDays}">0</div>
            <div class="vac-an-kpi-sub">${tr.days_avg}</div>
        </div>
    </div>`;

    /* ── Bar Chart ── */
    const maxAvg = Math.max(...cats.map((c) => s.catPrice[c] / s.catCount[c]));
    const barHtml = `
    <div class="vac-an-chart-card">
        <div class="vac-an-chart-title">
            ${tr.price_by_cat}
            <span style="font-size:10px;color:#b0b8cc;font-weight:600">${tr.avg_usd}</span>
        </div>
        <div class="vac-an-bar-chart">
            ${cats
                .map((cat, i) => {
                    const avg = Math.round(s.catPrice[cat] / s.catCount[cat]);
                    const pct = Math.round((avg / maxAvg) * 100);
                    const meta = CAT_META[cat] || { emoji: "🌍", color: CAT_COLORS[i % CAT_COLORS.length] };
                    return `
                <div class="vac-an-bar-group">
                    <div class="vac-an-bar-wrap">
                        <div class="vac-an-bar" data-height="${pct}"
                             style="height:0%;
                                    background:linear-gradient(180deg,${meta.color},${meta.color}88);
                                    transition:height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${0.1 + i * 0.08}s">
                            <div class="vac-an-bar-tooltip">$${avg.toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="vac-an-bar-label">${meta.emoji} ${cat}</div>
                </div>`;
                })
                .join("")}
        </div>
    </div>`;

    /* ── Donut Chart ── */
    const donutTotal = cats.reduce((acc, c) => acc + s.catCount[c], 0);
    const r = 46,
        circ = 2 * Math.PI * r;
    let offset = 0;
    const segs = cats.map((cat, i) => {
        const pct = s.catCount[cat] / donutTotal;
        const meta = CAT_META[cat] || { color: CAT_COLORS[i % CAT_COLORS.length] };
        const dash = pct * circ;
        const seg = `<circle cx="60" cy="60" r="${r}" fill="none"
            stroke="${meta.color}" stroke-width="12"
            stroke-dasharray="${dash} ${circ - dash}"
            stroke-dashoffset="${-offset * circ}"
            style="transition:stroke-dashoffset 0.8s ease ${0.2 + i * 0.1}s,
                              stroke-dasharray  0.8s ease ${0.2 + i * 0.1}s"/>`;
        offset += pct;
        return { seg, cat, meta };
    });
    const donutHtml = `
    <div class="vac-an-chart-card">
        <div class="vac-an-chart-title">${tr.distribution}</div>
        <div class="vac-an-donut-wrap">
            <div class="vac-an-donut-svg-wrap">
                <svg class="vac-an-donut-svg" width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="${r}" fill="none"
                            stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
                    ${segs.map((d) => d.seg).join("")}
                </svg>
                <div class="vac-an-donut-center">
                    <div class="vac-an-donut-center-num">${donutTotal}</div>
                    <div class="vac-an-donut-center-label">${tr.total}</div>
                </div>
            </div>
            <div class="vac-an-donut-legend">
                ${segs
                    .map(
                        (d) => `
                <div class="vac-an-donut-legend-item">
                    <div class="vac-an-legend-dot" style="background:${d.meta.color}"></div>
                    ${CAT_META[d.cat]?.emoji || ""} ${d.cat}
                    <span class="vac-an-legend-pct">${s.catCount[d.cat]}</span>
                </div>`,
                    )
                    .join("")}
            </div>
        </div>
    </div>`;

    /* ── Top 5 Table ── */
    const top5 = s.priceSorted.slice(0, 5);
    const tableHtml = `
    <div class="vac-an-table-card">
        <div class="vac-an-chart-title" style="padding:16px 20px 0;margin-bottom:0">${tr.top_tours}</div>
        <div class="vac-an-table-head">
            <div class="vac-an-table-head-cell">${tr.tour}</div>
            <div class="vac-an-table-head-cell">${tr.category}</div>
            <div class="vac-an-table-head-cell">${tr.price}</div>
            <div class="vac-an-table-head-cell">${tr.duration}</div>
            <div class="vac-an-table-head-cell">${tr.rating}</div>
        </div>
        ${top5
            .map((t) => {
                const cat = t.category;
                const meta = CAT_META[cat] || { emoji: "🌍", color: "#5b6ef5", bg: "rgba(91,110,245,0.15)" };
                const img = t.coverImage || t.images?.[0] || "";
                return `
            <div class="vac-an-table-row">
                <div class="vac-an-tour-name-cell">
                    <img class="vac-an-tour-thumb" src="${_esc(img)}" alt=""
                         onerror="this.style.background='#1e2245';this.removeAttribute('src')"/>
                    <div>
                        <div class="vac-an-tour-name">${_esc(_ml(t.name, lang))}</div>
                        <div class="vac-an-tour-country">${_esc(_ml(t.country, lang))}</div>
                    </div>
                </div>
                <div class="vac-an-cell">
                    <span style="background:${meta.bg};color:${meta.color};
                                 padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">
                        ${meta.emoji} ${cat}
                    </span>
                </div>
                <div class="vac-an-cell vac-an-cell--price">$${Number(t.price).toLocaleString()}</div>
                <div class="vac-an-cell">${t.days}d / ${t.nights}n</div>
                <div class="vac-an-cell vac-an-cell--rating">
                    <div class="vac-an-score-bar-wrap" style="width:90px">
                        <div class="vac-an-score-bar-bg">
                            <div class="vac-an-score-bar-fill"
                                 data-width="${(t.rating / 5) * 100}" style="width:0%"></div>
                        </div>
                        <span style="font-size:11px;font-weight:800;color:#f59e0b;white-space:nowrap">
                            ${t.rating}
                        </span>
                    </div>
                </div>
            </div>`;
            })
            .join("")}
    </div>`;

    /* ── Category Pills ── */
    const pillsHtml = `
    <div class="vac-an-cat-row">
        ${cats
            .map((cat) => {
                const meta = CAT_META[cat] || { emoji: "🌍", color: "#5b6ef5", bg: "rgba(91,110,245,0.15)" };
                const avg = Math.round(s.catPrice[cat] / s.catCount[cat]);
                return `
            <div class="vac-an-cat-pill">
                <div class="vac-an-cat-icon" style="background:${meta.bg};color:${meta.color}">
                    ${meta.emoji}
                </div>
                <div class="vac-an-cat-info">
                    <div class="vac-an-cat-name">${cat}</div>
                    <div class="vac-an-cat-count">${s.catCount[cat]} ${tr.tours_count}</div>
                </div>
                <div class="vac-an-cat-avg" style="color:${meta.color}">$${avg.toLocaleString()}</div>
            </div>`;
            })
            .join("")}
    </div>`;

    const dateStr = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US");

    return `
    <div class="vac-an-panel" id="vac-an-panel">
        <div class="vac-an-header">
            <div class="vac-an-header-left">
                <div class="vac-an-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                        <path d="M3 3v18h18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                        <path d="M7 16l4-6 4 4 4-8" stroke="#fff" stroke-width="2"
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div>
                    <div class="vac-an-title">${tr.panel_title}</div>
                    <div class="vac-an-subtitle">${tr.panel_sub} · ${dateStr}</div>
                </div>
            </div>
            <button class="vac-an-close" id="vac-an-close-btn">✕</button>
        </div>

        <div class="vac-an-body">
            ${kpisHtml}
            <div class="vac-an-section-label">${tr.charts}</div>
            <div class="vac-an-charts-row">${barHtml}${donutHtml}</div>
            <div class="vac-an-section-label">${tr.top_section}</div>
            ${tableHtml}
            <div class="vac-an-section-label">${tr.by_category}</div>
            ${pillsHtml}
        </div>

        <div class="vac-an-footer">
            <div class="vac-an-footer-text">
                ✦ ${tr.footer_text} · ${s.total} ${tr.tours_count} ·
                $${s.totalValue.toLocaleString()} ${tr.total_value}
            </div>
        </div>
    </div>`;
};

// ─── ANIMATE ────────────────────────────────────────────────────
const _animate = () => {
    // Count-up
    document.querySelectorAll(".vac-an-kpi-val[data-target]").forEach((el) => {
        const target = parseFloat(el.dataset.target);
        const prefix = el.dataset.prefix || "";
        const isDecimal = el.hasAttribute("data-decimal");
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 900, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = isDecimal ? ((target * ease) / 10).toFixed(1) : prefix + Math.round(target * ease).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    // Bar heights
    setTimeout(() => {
        document.querySelectorAll(".vac-an-bar[data-height]").forEach((b) => {
            b.style.height = b.dataset.height + "%";
        });
    }, 80);
    // Score bars
    setTimeout(() => {
        document.querySelectorAll(".vac-an-score-bar-fill[data-width]").forEach((el) => {
            el.style.width = el.dataset.width + "%";
        });
    }, 400);
};

// ─── OPEN PANEL ─────────────────────────────────────────────────
const _openPanel = (getTours, lang) => {
    const stats = _computeStats(getTours());
    const tr = AN_TR[lang] || AN_TR.en;

    const overlay = document.createElement("div");
    overlay.className = "vac-an-overlay";

    overlay.innerHTML = stats
        ? _renderPanel(stats, lang)
        : `<div class="vac-an-panel" style="padding:60px;align-items:center;justify-content:center">
               <div style="color:#b0b8cc;font-size:16px;font-weight:600">${tr.no_data}</div>
               <button class="vac-an-close" id="vac-an-close-btn"
                       style="position:absolute;top:20px;right:20px">✕</button>
           </div>`;

    document.body.appendChild(overlay);
    _animate();

    const close = () => {
        const panel = overlay.querySelector(".vac-an-panel");

        // Overlay: shaffoflikka o'tadi
        overlay.style.transition = "opacity 0.32s ease";
        overlay.style.opacity = "0";

        // Panel: pastga siljib chiqib ketadi
        if (panel) {
            panel.style.transition = "transform 0.38s cubic-bezier(0.4, 0, 0.8, 0.2), opacity 0.28s ease";
            panel.style.transform = "translateY(100%)";
            panel.style.opacity = "0.4";
        }

        setTimeout(() => overlay.remove(), 380);
    };

    overlay.querySelector("#vac-an-close-btn")?.addEventListener("click", close);
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
 * HTML string for the trigger button.
 * Use inside renderRoot() header template:
 *   ${createAnalyticsButton(vacLang)}
 */
export const createAnalyticsButton = (lang) => {
    const tr = AN_TR[lang] || AN_TR.en;
    return `
    <button class="vac-analytics-trigger" id="vac-analytics-btn">
        <span class="vac-an-dot"></span>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M3 3v18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 16l4-6 4 4 4-8" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${tr.btn_label}
    </button>`;
};

/**
 * Wires up the analytics button after DOM is ready.
 * Call at the end of attachRootEvents():
 *   initAnalytics(getTours, vacLang);
 *
 * @param {() => Tour[]} getTours  - same getTours() from vacations.js
 * @param {"uz"|"ru"|"en"} lang
 */
export const initAnalytics = (getTours, lang) => {
    const btn = document.getElementById("vac-analytics-btn");
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", () => _openPanel(getTours, lang));
};
