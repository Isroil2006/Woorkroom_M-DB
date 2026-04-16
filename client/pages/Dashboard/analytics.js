// ═══════════════════════════════════════════════════════════════
//  dash_analytics.js — Tests / Dashboard Analytics Module
//
//  ULASH:
//    1. import "./dash_analytics.css";
//    2. import { createDashAnalyticsBtn, initDashAnalytics } from "./dash_analytics.js";
//    3. initDashboardLogic() ichida dashboard ko'rsatilgandan so'ng:
//         const createBox = document.querySelector(".dashboard__create-box");
//         if (createBox) createBox.insertAdjacentHTML("beforeend", createDashAnalyticsBtn(currentLang));
//    4. Shu joyning pastiga:
//         initDashAnalytics(currentLang);
// ═══════════════════════════════════════════════════════════════

// ─── HELPERS ────────────────────────────────────────────────────
const _esc = (s) =>
    String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

// ─── DATA ───────────────────────────────────────────────────────
const _computeStats = () => {
    const allTests = JSON.parse(localStorage.getItem("myTests") || "[]");
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");

    if (!allTests.length && !allUsers.length) return null;

    const totalTests = allTests.length;
    const activeTests = allTests.filter((t) => t.isActive).length;
    const draftTests = totalTests - activeTests;

    // Jami savollar
    const totalQuestions = allTests.reduce((s, t) => s + (t.questions?.length || 0), 0);

    // Har bir testdagi o'rtacha savol soni
    const avgQPerTest = totalTests ? Math.round(totalQuestions / totalTests) : 0;

    // Foydalanuvchilar natijalarini yig'ish
    const allResults = []; // { username, avatar, testName, score }
    allUsers.forEach((u) => {
        (u.results || []).forEach((r) => {
            allResults.push({
                username: u.username,
                avatar: u.avatar || null,
                testName: r.testName || "—",
                score: Number(r.score) || 0,
                date: r.date || "",
            });
        });
    });

    const totalAttempts = allResults.length;

    // Leaderboard (totalScore bo'yicha)
    const userScores = {};
    allUsers.forEach((u) => {
        userScores[u.username] = {
            username: u.username,
            avatar: u.avatar || null,
            total: Number(u.totalScore || 0),
            attempts: (u.results || []).length,
        };
    });
    const leaderboard = Object.values(userScores)
        .filter((u) => u.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // Har bir testning nechta urinishi bor
    const testAttempts = {};
    allResults.forEach((r) => {
        testAttempts[r.testName] = (testAttempts[r.testName] || 0) + 1;
    });

    // Eng ko'p urinilgan testlar (top 5)
    const topTests = allTests
        .map((t) => ({
            name: t.name,
            questions: t.questions?.length || 0,
            isActive: t.isActive,
            attempts: testAttempts[t.name] || 0,
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 5);

    // Har bir testning eng yuqori natijasi
    const testBestScore = {};
    allResults.forEach((r) => {
        if (!testBestScore[r.testName] || r.score > testBestScore[r.testName]) {
            testBestScore[r.testName] = r.score;
        }
    });

    // O'rtacha ball
    const avgScore = allResults.length ? Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length) : 0;

    // Eng yuqori ball
    const maxScore = allResults.length ? Math.max(...allResults.map((r) => r.score)) : 0;

    // Test turi taqsimoti: single / multiple / true-false
    const typeCounts = { single: 0, multiple: 0, "true-false": 0 };
    allTests.forEach((t) => {
        (t.questions || []).forEach((q) => {
            const tp = q.type || "single";
            typeCounts[tp] = (typeCounts[tp] || 0) + 1;
        });
    });

    return {
        totalTests,
        activeTests,
        draftTests,
        totalQuestions,
        avgQPerTest,
        totalAttempts,
        avgScore,
        maxScore,
        leaderboard,
        topTests,
        typeCounts,
    };
};

// ─── TRANSLATIONS ────────────────────────────────────────────────
const DASH_TR = {
    uz: {
        btn: "Statistika",
        title: "Testlar Statistikasi",
        sub: "Barcha testlar va natijalar",
        total_tests: "Jami testlar",
        active: "Faol testlar",
        questions: "Jami savollar",
        attempts: "Urinishlar",
        top_tests: "Eng faol testlar",
        leaderboard: "Reyting jadvali",
        q_types: "Savol turlari",
        score_dist: "Ball taqsimoti",
        no_data: "Ma'lumot yo'q",
        footer: "Barcha natijalar hisobga olindi",
        active_lbl: "faol",
        draft_lbl: "loyiha",
        tests_lbl: "test",
        avg_q: "O'rtacha savol",
        avg_score: "O'rtacha ball",
        max_score: "Eng yuqori ball",
        single: "Bir javob",
        multiple: "Ko'p javob",
        true_false: "Rost/Yolg'on",
        attempts_lbl: "urinish",
        pts: "ball",
    },
    ru: {
        btn: "Статистика",
        title: "Статистика тестов",
        sub: "Все тесты и результаты",
        total_tests: "Всего тестов",
        active: "Активные",
        questions: "Всего вопросов",
        attempts: "Попыток",
        top_tests: "Популярные тесты",
        leaderboard: "Таблица лидеров",
        q_types: "Типы вопросов",
        score_dist: "Распределение баллов",
        no_data: "Нет данных",
        footer: "Все результаты учтены",
        active_lbl: "активных",
        draft_lbl: "черновиков",
        tests_lbl: "тест",
        avg_q: "Средн. вопросов",
        avg_score: "Средний балл",
        max_score: "Макс. балл",
        single: "Один ответ",
        multiple: "Несколько",
        true_false: "Правда/Ложь",
        attempts_lbl: "попыток",
        pts: "балл",
    },
    en: {
        btn: "Analytics",
        title: "Tests Analytics",
        sub: "All tests & results overview",
        total_tests: "Total Tests",
        active: "Active Tests",
        questions: "Total Questions",
        attempts: "Attempts",
        top_tests: "Most Attempted Tests",
        leaderboard: "Leaderboard",
        q_types: "Question Types",
        score_dist: "Score Distribution",
        no_data: "No data yet",
        footer: "All results are included",
        active_lbl: "active",
        draft_lbl: "draft",
        tests_lbl: "test",
        avg_q: "Avg Questions",
        avg_score: "Avg Score",
        max_score: "Max Score",
        single: "Single",
        multiple: "Multiple",
        true_false: "True/False",
        attempts_lbl: "attempts",
        pts: "pts",
    },
};

// ─── RENDER ─────────────────────────────────────────────────────
const _renderPanel = (s, lang) => {
    const tr = DASH_TR[lang] || DASH_TR.en;

    /* ── KPIs ── */
    const kpisHtml = `
    <div class="dash-an-kpis">
        <div class="dash-an-kpi dash-an-kpi--blue">
            <div class="dash-an-kpi-icon">📝</div>
            <div class="dash-an-kpi-label">${tr.total_tests}</div>
            <div class="dash-an-kpi-val" data-count="${s.totalTests}">0</div>
            <div class="dash-an-kpi-sub">${s.activeTests} ${tr.active_lbl} · ${s.draftTests} ${tr.draft_lbl}</div>
        </div>
        <div class="dash-an-kpi dash-an-kpi--green">
            <div class="dash-an-kpi-icon">✅</div>
            <div class="dash-an-kpi-label">${tr.active}</div>
            <div class="dash-an-kpi-val" data-count="${s.activeTests}">0</div>
            <div class="dash-an-kpi-sub">${s.totalTests ? Math.round((s.activeTests / s.totalTests) * 100) : 0}% ${tr.tests_lbl}</div>
        </div>
        <div class="dash-an-kpi dash-an-kpi--amber">
            <div class="dash-an-kpi-icon">❓</div>
            <div class="dash-an-kpi-label">${tr.questions}</div>
            <div class="dash-an-kpi-val" data-count="${s.totalQuestions}">0</div>
            <div class="dash-an-kpi-sub">${tr.avg_q}: ${s.avgQPerTest}</div>
        </div>
        <div class="dash-an-kpi dash-an-kpi--violet">
            <div class="dash-an-kpi-icon">🎯</div>
            <div class="dash-an-kpi-label">${tr.attempts}</div>
            <div class="dash-an-kpi-val" data-count="${s.totalAttempts}">0</div>
            <div class="dash-an-kpi-sub">${tr.avg_score}: ${s.avgScore} ${tr.pts}</div>
        </div>
    </div>`;

    /* ── Top tests list ── */
    const maxAttempts = s.topTests.length ? Math.max(...s.topTests.map((t) => t.attempts), 1) : 1;
    const topTestsHtml = `
    <div class="dash-an-card" style="animation-delay:0.18s">
        <div class="dash-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M9 11l3 3L22 4" stroke="#5b6ef5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.top_tests}
            <span class="dash-an-card-badge">${s.totalTests} ${tr.tests_lbl}</span>
        </div>
        ${
            s.topTests.length === 0
                ? `<div style="color:#b0b8cc;font-size:12px;padding:12px 0;text-align:center">${tr.no_data}</div>`
                : `<div class="dash-an-test-list">
                ${s.topTests
                    .map(
                        (t) => `
                <div class="dash-an-test-row">
                    <div class="dash-an-test-icon">${t.isActive ? "✅" : "📝"}</div>
                    <div class="dash-an-test-info">
                        <div class="dash-an-test-name">${_esc(t.name)}</div>
                        <div class="dash-an-test-sub">
                            ${t.questions} ${tr.questions.toLowerCase()} ·
                            <div class="dash-an-score-track" style="flex:1;max-width:80px;display:inline-block;vertical-align:middle;margin:0 4px">
                                <div class="dash-an-score-fill" data-width="${Math.round((t.attempts / maxAttempts) * 100)}" style="width:0%"></div>
                            </div>
                            ${t.attempts} ${tr.attempts_lbl}
                        </div>
                    </div>
                    <span class="dash-an-test-status ${t.isActive ? "dash-an-test-status--active" : "dash-an-test-status--draft"}">
                        ${t.isActive ? tr.active_lbl : tr.draft_lbl}
                    </span>
                    <span class="dash-an-test-qcount">${t.questions}</span>
                </div>`,
                    )
                    .join("")}
            </div>`
        }
    </div>`;

    /* ── Leaderboard ── */
    const lbHtml = `
    <div class="dash-an-card" style="animation-delay:0.20s">
        <div class="dash-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.leaderboard}
        </div>
        ${
            s.leaderboard.length === 0
                ? `<div style="color:#b0b8cc;font-size:12px;padding:12px 0;text-align:center">${tr.no_data}</div>`
                : `<div class="dash-an-lb-list">
                ${s.leaderboard
                    .map(
                        (u, i) => `
                <div class="dash-an-lb-row">
                    <div class="dash-an-lb-rank dash-an-lb-rank--${i + 1}">#${i + 1}</div>
                    <img class="dash-an-lb-avatar"
                         src="${u.avatar || "./assets/images/User-avatar.png"}"
                         onerror="this.src='./assets/images/User-avatar.png'"
                         style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>
                    <span class="dash-an-lb-name">${_esc(u.username)}</span>
                    <span class="dash-an-lb-score">${u.total} ${tr.pts}</span>
                </div>`,
                    )
                    .join("")}
            </div>`
        }
    </div>`;

    /* ── Question types donut ── */
    const qtTotal = Object.values(s.typeCounts).reduce((a, b) => a + b, 0) || 1;
    const singleF = s.typeCounts.single / qtTotal;
    const multipleF = s.typeCounts.multiple / qtTotal;
    const tfF = s.typeCounts["true-false"] / qtTotal;
    const r = 42,
        circ = 2 * Math.PI * r;
    const donutHtml = `
    <div class="dash-an-card" style="animation-delay:0.22s">
        <div class="dash-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="#5b6ef5" stroke-width="2"/>
                <path d="M12 7v5l3 3" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${tr.q_types}
        </div>
        <div class="dash-an-donut-wrap">
            <div class="dash-an-donut-svg-wrap">
                <svg class="dash-an-donut-svg" width="110" height="110" viewBox="0 0 110 110">
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#f0f2f8" stroke-width="11"/>
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#5b6ef5" stroke-width="11"
                            stroke-dasharray="${singleF * circ} ${circ - singleF * circ}"
                            stroke-dashoffset="0"
                            style="transition:stroke-dasharray 0.8s ease 0.25s"/>
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#22c55e" stroke-width="11"
                            stroke-dasharray="${multipleF * circ} ${circ - multipleF * circ}"
                            stroke-dashoffset="${-singleF * circ}"
                            style="transition:stroke-dasharray 0.8s ease 0.38s"/>
                    <circle cx="55" cy="55" r="${r}" fill="none" stroke="#f59e0b" stroke-width="11"
                            stroke-dasharray="${tfF * circ} ${circ - tfF * circ}"
                            stroke-dashoffset="${-(singleF + multipleF) * circ}"
                            style="transition:stroke-dasharray 0.8s ease 0.5s"/>
                </svg>
                <div class="dash-an-donut-center">
                    <div class="dash-an-donut-center-num">${Object.values(s.typeCounts).reduce((a, b) => a + b, 0)}</div>
                    <div class="dash-an-donut-center-lbl">savol</div>
                </div>
            </div>
            <div class="dash-an-donut-legend">
                <div class="dash-an-donut-legend-item">
                    <div class="dash-an-legend-dot" style="background:#5b6ef5"></div>
                    ${tr.single}
                    <span class="dash-an-legend-val">${s.typeCounts.single}</span>
                </div>
                <div class="dash-an-donut-legend-item">
                    <div class="dash-an-legend-dot" style="background:#22c55e"></div>
                    ${tr.multiple}
                    <span class="dash-an-legend-val">${s.typeCounts.multiple}</span>
                </div>
                <div class="dash-an-donut-legend-item">
                    <div class="dash-an-legend-dot" style="background:#f59e0b"></div>
                    ${tr.true_false}
                    <span class="dash-an-legend-val">${s.typeCounts["true-false"]}</span>
                </div>
            </div>
        </div>
    </div>`;

    /* ── Score distribution — per user ── */
    const maxUserScore = s.leaderboard.length ? s.leaderboard[0].total : 1;
    const scoreDistHtml = `
    <div class="dash-an-card" style="animation-delay:0.24s">
        <div class="dash-an-card-title">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                <path d="M3 3v18h18" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/>
                <path d="M7 16l3-4 4 3 4-6" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${tr.score_dist}
        </div>
        ${
            s.leaderboard.length === 0
                ? `<div style="color:#b0b8cc;font-size:12px;padding:12px 0;text-align:center">${tr.no_data}</div>`
                : `<div class="dash-an-score-bars">
                ${s.leaderboard
                    .map((u, i) => {
                        const pct = Math.round((u.total / maxUserScore) * 100);
                        const COLORS = ["linear-gradient(90deg,#5b6ef5,#818cf8)", "linear-gradient(90deg,#22c55e,#4ade80)", "linear-gradient(90deg,#f59e0b,#fbbf24)", "linear-gradient(90deg,#7c3aed,#a78bfa)", "linear-gradient(90deg,#0ea5e9,#38bdf8)"];
                        return `
                    <div class="dash-an-score-row" style="animation-delay:${0.24 + i * 0.04}s">
                        <div class="dash-an-score-top">
                            <span class="dash-an-score-name">${_esc(u.username)}</span>
                            <span class="dash-an-score-val">${u.total} ${tr.pts}</span>
                        </div>
                        <div class="dash-an-score-track">
                            <div class="dash-an-score-fill" data-width="${pct}"
                                 style="width:0%;background:${COLORS[i % COLORS.length]}"></div>
                        </div>
                    </div>`;
                    })
                    .join("")}
            </div>`
        }
    </div>`;

    /* ── Bottom strip ── */
    const stripHtml = `
    <div class="dash-an-strip">
        <div class="dash-an-strip-item">
            <div class="dash-an-strip-icon" style="background:#eef0fd">📊</div>
            <div class="dash-an-strip-info">
                <div class="dash-an-strip-label">${tr.avg_score}</div>
                <div class="dash-an-strip-val" data-count="${s.avgScore}">0</div>
                <div class="dash-an-strip-sub">${tr.pts} ${tr.avg_score.toLowerCase()}</div>
            </div>
        </div>
        <div class="dash-an-strip-item">
            <div class="dash-an-strip-icon" style="background:#dcfce7">🏆</div>
            <div class="dash-an-strip-info">
                <div class="dash-an-strip-label">${tr.max_score}</div>
                <div class="dash-an-strip-val" style="color:#22c55e" data-count="${s.maxScore}">0</div>
                <div class="dash-an-strip-sub">${tr.pts} eng yuqori</div>
            </div>
        </div>
        <div class="dash-an-strip-item">
            <div class="dash-an-strip-icon" style="background:#fef3c7">👥</div>
            <div class="dash-an-strip-info">
                <div class="dash-an-strip-label">${tr.attempts}</div>
                <div class="dash-an-strip-val" data-count="${s.totalAttempts}">0</div>
                <div class="dash-an-strip-sub">${tr.attempts_lbl} jami</div>
            </div>
        </div>
    </div>`;

    const dateStr = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-US");

    return `
    <div class="dash-an-panel" id="dash-an-panel">
        <div class="dash-an-header">
            <div class="dash-an-header-left">
                <div class="dash-an-header-icon">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <path d="M9 11l3 3L22 4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div>
                    <div class="dash-an-title">${tr.title}</div>
                    <div class="dash-an-sub">${tr.sub} · ${dateStr}</div>
                </div>
            </div>
            <button class="dash-an-close" id="dash-an-close-btn">✕</button>
        </div>

        <div class="dash-an-body">
            ${kpisHtml}

            <div class="dash-an-section-label">${tr.top_tests} & ${tr.leaderboard}</div>
            <div class="dash-an-row-2">
                ${topTestsHtml}
                ${lbHtml}
            </div>

            <div class="dash-an-section-label">${tr.q_types} & ${tr.score_dist}</div>
            <div class="dash-an-row-2">
                ${donutHtml}
                ${scoreDistHtml}
            </div>

            ${stripHtml}
        </div>

        <div class="dash-an-footer">
            <div class="dash-an-footer-text">✦ ${tr.footer}</div>
            <div class="dash-an-footer-stats">
                <div class="dash-an-footer-badge">${s.totalTests} ${tr.tests_lbl}</div>
                <div class="dash-an-footer-badge">${s.totalQuestions} ${tr.questions.toLowerCase()}</div>
            </div>
        </div>
    </div>`;
};

// ─── ANIMATE ─────────────────────────────────────────────────────
const _animate = () => {
    document.querySelectorAll(".dash-an-kpi-val[data-count], .dash-an-strip-val[data-count]").forEach((el) => {
        const target = parseInt(el.dataset.count) || 0;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / 800, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    setTimeout(() => {
        document.querySelectorAll(".dash-an-score-fill[data-width], .dash-an-lb-bar-fill[data-width]").forEach((el) => {
            el.style.width = el.dataset.width + "%";
        });
    }, 120);
};

// ─── OPEN PANEL ──────────────────────────────────────────────────
const _openPanel = (lang) => {
    const stats = _computeStats();
    const tr = DASH_TR[lang] || DASH_TR.en;

    const overlay = document.createElement("div");
    overlay.className = "dash-an-overlay";

    overlay.innerHTML = stats
        ? _renderPanel(stats, lang)
        : `<div class="dash-an-panel" style="display:flex;align-items:center;justify-content:center;min-height:200px">
               <div style="color:#b0b8cc;font-size:14px;font-weight:600">${tr.no_data}</div>
               <button class="dash-an-close" id="dash-an-close-btn"
                       style="position:absolute;top:20px;right:20px">✕</button>
           </div>`;

    document.body.appendChild(overlay);
    _animate();

    const close = () => {
        const panel = overlay.querySelector(".dash-an-panel");
        overlay.style.transition = "opacity 0.32s ease";
        overlay.style.opacity = "0";
        if (panel) {
            panel.style.transition = "transform 0.38s cubic-bezier(0.4,0,0.8,0.2), opacity 0.28s ease";
            panel.style.transform = "translateY(100%)";
            panel.style.opacity = "0.4";
        }
        setTimeout(() => overlay.remove(), 380);
    };

    overlay.querySelector("#dash-an-close-btn")?.addEventListener("click", close);
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
 * HTML button. .dashboard__create-box ga qo'shing:
 *   createBox.insertAdjacentHTML("beforeend", createDashAnalyticsBtn(currentLang));
 */
export const createDashAnalyticsBtn = (lang) => {
    const tr = DASH_TR[lang] || DASH_TR.en;
    return `
    <button class="dash-an-trigger" id="dash-an-trigger">
        <span class="dash-an-dot"></span>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
            <path d="M3 3v18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 16l3-5 4 3 4-7" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${tr.btn}
    </button>`;
};

/**
 * initDashboardLogic() ichida updateUI() dan keyin chaqiring:
 *   initDashAnalytics(currentLang);
 */
export const initDashAnalytics = (lang) => {
    const btn = document.getElementById("dash-an-trigger");
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", () => _openPanel(lang));
};
