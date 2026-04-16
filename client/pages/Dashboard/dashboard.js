import { createDashAnalyticsBtn, initDashAnalytics } from "./analytics.js";
import { translations } from "../Dashboard/translations.js";

let allTests = JSON.parse(localStorage.getItem("myTests")) || [];
let currentView = localStorage.getItem("currentView") || "dashboard";
let currentTestId = localStorage.getItem("currentTestId") || null;
let currentTab = localStorage.getItem("currentTab") || "basic";

const saveToLocal = () => {
    localStorage.setItem("myTests", JSON.stringify(allTests));
    localStorage.setItem("currentView", currentView);
    localStorage.setItem("currentTestId", currentTestId);
    localStorage.setItem("currentTab", currentTab);
};

let currentLang = localStorage.getItem("language") || "uz";
const t = (key) => translations[currentLang][key] || key;

// 1. DASHBOARD VA ASOSIY STRUKTURA
export const DashboardPage = () => {
    return `
        <div class="dashboard-wrapper">
        <div class="dashboard__main-content">
            <div class="total-tests-row">
                <div class="total-test-card">
                    <div class="top"><span class="total-title">${t("total_tests")}</span></div>
                    <div class="bottom"><span style="color: #3f8cff" class="total-count">0</span></div>
                </div>
                <div class="total-test-card">
                    <div class="top"><span class="total-title">${t("active_tests")}</span></div>
                    <div class="bottom"><span style="color: #3f8cff" class="total-count">0</span></div>
                </div>
                <div class="total-test-card">
                    <div class="top"><span class="total-title">${t("not_active_tests")}</span></div>
                    <div class="bottom"><span style="color: #3f8cff" class="total-count">0</span></div>
                </div>
            </div>
            <div class="tests"></div>
        </div>
        <div class="dashboard__right-content">
            <div class="dashboard__create-box">
                <span>${t("quick_actions")}</span>
                <button class="btn create-test-btn">${t("create_test")}</button>
            </div>
            <div class="dashboard__liderboard"></div>
        </div>
    </div>

    <div class="modal-overlay" id="modal" style="display:none">
        <div class="modal-content">
            <h3>${t("new_test_name")}</h3>
            <input class="input" type="text" id="test-name-input" placeholder="${t("new_test_input")}">
            <div class="modal-btns">
                <button class="cancel-btn" id="close-modal">${t("new_test_cancel")}</button>
                <button class="add-btn" id="add-test-btn">${t("new_test_btn")}</button>
            </div>
        </div>
    </div>

    <!-- Delete tasdiqlash modali -->
    <div class="modal-overlay" id="delete-confirm-modal" style="display:none">
        <div class="modal-content" style="max-width: 380px; text-align: center;">
            <h3 style="margin: 0 0 8px; color: #0f172a;">${t("delete_test")}</h3>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 28px;" id="delete-modal-desc"></p>
            <div class="modal-btns">
                <button class="cancel-btn" id="cancel-delete-btn">${t("cancel_delete")}</button>
                <button class="add-btn" id="confirm-delete-btn" style="background: #ef4444;">${t("delete")}</button>
            </div>
        </div>
    </div>
    `;
};

// 2. DETAL SAHIFASI
const renderDetailView = (container, testId) => {
    const test = allTests[testId];
    currentView = "detail";
    currentTestId = testId;
    saveToLocal();

    container.innerHTML = `
        <div class="test-detail-wrapper">
            <div class="sidebar">
                <div class="sidebar-top">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <button class="btn back-to-dash">${t("back_dash")}</button>
                        <div class="custom-select" id="dash-language-selector">
                            <div class="selected">
                                <img src="/assets/images/uzb-flag.png" alt="" />
                                <span>UZ</span>
                                <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            <ul class="options" style="display: none;">
                                <li data-value="uz"><img src="/assets/images/uzb-flag.png" alt="" /> UZ</li>
                                <li data-value="en"><img src="/assets/images/usa-flag.png" alt="" /> EN</li>
                                <li data-value="ru"><img src="/assets/images/rus-flag.png" alt="" /> RU</li>
                            </ul>
                        </div>
                    </div>
                    <nav class="nav-wrapper">
                        <div class="nav-item ${currentTab === "basic" ? "active" : ""}" data-tab="basic">${t("basic")}</div>
                        <div class="nav-item ${currentTab === "questions" ? "active" : ""}" data-tab="questions">${t("questions")}</div>
                        <div class="nav-item ${currentTab === "settings" ? "active" : ""}" data-tab="settings">${t("time")}</div>
                    </nav>
                </div>
                <div class="sidebar-bottom">
                    <button class="btn active-btn" id="activate-test-btn" style="background: #22c55e; width: 90%; margin: 10px;">
                        ${t("active_test_btn")}
                    </button>
                </div>
            </div>

            <div class="detail-content" style="flex: 1; padding: 20px;">
                <div id="tab-basic" class="tab-pane" style="display: ${currentTab === "basic" ? "flex" : "none"}">
                    <h2>${t("test_name")}</h2>
                    <input type="text" id="edit-name" value="${test.name || ""}" class="input">
                    <button class="btn save-name">${t("save")}</button>
                </div>
                <div id="tab-questions" class="tab-pane" style="display: ${currentTab === "questions" ? "block" : "none"}">
                    <div id="question-list-view">
                        <div class="q-manager-header">
                            <h2>${t("questions")}</h2>
                            <button class="btn add-q-main-btn" id="add-question-btn">${t("add_question")}</button>
                        </div>
                        <div class="created-questions-list"></div>
                    </div>
                    <div id="question-edit-view" style="display:none;"></div>
                </div>
                <div id="tab-settings" class="tab-pane" style="display: ${currentTab === "settings" ? "flex" : "none"}; flex-direction: column;">
                    <h2>${t("time")}</h2>
                    <div class="time-config-box" style="margin-top: 20px; background: #f8fafc; padding: 20px; border-radius: 12px;">
                        <div class="toggle-group" style="margin-bottom: 20px;">
                            <label><input style="margin-right: 5px" type="radio" name="time-limit-toggle" value="unlimited" ${!test.timeLimit ? "checked" : ""}>${t("time_unlimited")}</label>
                            <label style="margin-left: 15px;"><input style="margin-right: 5px" type="radio" name="time-limit-toggle" value="limited" ${test.timeLimit ? "checked" : ""}>${t("time_limited")}</label>
                        </div>
                        <div id="time-input-fields" style="display: ${test.timeLimit ? "flex" : "none"}; gap: 15px;">
                            <div><small>Min</small><br><input type="number" id="min-input" value="${test.minutes || 0}" class="input" style="width: 80px;"></div>
                            <div><small>Sec</small><br><input type="number" id="sec-input" value="${test.seconds || 0}" class="input" style="width: 80px;"></div>
                        </div>
                    </div>
                    <button class="btn save-time-btn">${t("save_settings")}</button>
                </div>
            </div>
        </div>
    `;

    const savedLang = localStorage.getItem("language") || "uz";
    const select = document.getElementById("dash-language-selector");
    if (!select) return;

    const selected = select.querySelector(".selected");
    const options = select.querySelector(".options");
    const items = select.querySelectorAll(".options li");

    items.forEach((item) => {
        if (item.dataset.value === savedLang) {
            const img = item.querySelector("img").src;
            const text = item.textContent.trim();
            selected.innerHTML = `<img src="${img}"> <span>${text}</span>`;
        }
    });

    selected.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = options.style.display === "block";
        options.style.display = isOpen ? "none" : "block";
        const chevron = selected.querySelector(".chevron-icon");
        if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });

    items.forEach((item) => {
        item.addEventListener("click", () => {
            localStorage.setItem("language", item.dataset.value);

            const calPanel = document.getElementById("cal-events-panel");
            const calEventsDate = document.getElementById("cal-events-date");
            if (calPanel?.classList.contains("active") && calEventsDate?.textContent) {
                localStorage.setItem("cal_selected_date", calEventsDate.textContent);
            }

            window.location.reload();
        });
    });

    document.addEventListener("click", (e) => {
        if (!select.contains(e.target)) {
            options.style.display = "none";
            const chevron = selected.querySelector(".chevron-icon");
            if (chevron) chevron.style.transform = "rotate(0deg)";
        }
    });

    setupGeneralEvents(container, testId);
    if (currentTab === "questions") renderQuestionList(container, testId);

    container.querySelector("#activate-test-btn").onclick = () => {
        if (test.questions.length === 0) return alert("Avval savol qo'shing!");
        test.isActive = true;
        currentView = "dashboard";
        currentTestId = null;
        saveToLocal();
        location.reload();
    };

    const saveNameBtn = container.querySelector(".save-name");
    saveNameBtn.onclick = () => {
        test.name = container.querySelector("#edit-name").value;
        saveToLocal();
        saveNameBtn.style.background = "#22c55e";
        saveNameBtn.innerHTML = "Saved";
        setTimeout(() => {
            saveNameBtn.style.background = "var(--primary-blue)";
            saveNameBtn.innerHTML = "Save";
        }, 1500);
    };

    const timeToggleGroup = container.querySelectorAll('input[name="time-limit-toggle"]');
    const timeInputFields = container.querySelector("#time-input-fields");

    timeToggleGroup.forEach((radio) => {
        radio.onchange = (e) => {
            timeInputFields.style.display = e.target.value === "limited" ? "flex" : "none";
        };
    });

    const saveTimeBtn = container.querySelector(".save-time-btn");
    if (saveTimeBtn) {
        saveTimeBtn.onclick = () => {
            const isLimited = container.querySelector('input[name="time-limit-toggle"]:checked').value === "limited";
            test.timeLimit = isLimited;
            test.minutes = parseInt(container.querySelector("#min-input").value) || 0;
            test.seconds = parseInt(container.querySelector("#sec-input").value) || 0;
            saveToLocal();
            saveTimeBtn.style.background = "#22c55e";
            saveTimeBtn.innerHTML = t("setting_saved");
            setTimeout(() => {
                saveTimeBtn.style.background = "var(--primary-blue)";
                saveTimeBtn.innerHTML = t("save_settings");
            }, 1500);
        };
    }
};

// 3. SAVOLLAR RO'YXATINI RENDER QILISH
const renderQuestionList = (container, testId) => {
    const listDiv = container.querySelector(".created-questions-list");
    const test = allTests[testId];
    if (!listDiv) return;
    listDiv.innerHTML = "";

    const uiLang = localStorage.getItem("language") || "uz";

    test.questions.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "q-item-card";

        const qText = typeof q.text === "object" ? q.text[uiLang] || q.text["uz"] : q.text;

        const answersHTML = q.answers
            .map((ans) => {
                const ansText = typeof ans.text === "object" ? ans.text[uiLang] || ans.text["uz"] : ans.text;
                return `
                <div class="ans-preview-row ${ans.isCorrect ? "correct-bg" : ""}">
                    <span class="q-circle ${ans.isCorrect ? "q-correct-circle" : ""}"></span>
                    <span class="ans-preview-text">${ansText}</span>
                </div>`;
            })
            .join("");

        card.innerHTML = `
            <div class="q-item-top">
                <div class="q-item-info">
                    <span class="q-label">Q. ${index + 1}</span>
                    <button class="del-q-btn" data-idx="${index}"><img src="/pages/Dashboard/images/trash.svg" width="18"></button>
                </div>
                <div class="q-item-meta">
                    <span>${t("type")}: ${q.type}</span>
                    <span>${t("points")}: ${q.score}</span>
                </div>
            </div>
            <div class="q-item-body">
                <p class="q-text-main">${qText}</p>
                <div class="q-answers-container">${answersHTML}</div>
            </div>
        `;

        card.querySelector(".del-q-btn").onclick = (e) => {
            e.stopPropagation();
            if (confirm(t("delete_confirm") || "O'chirilsinmi?")) {
                test.questions.splice(index, 1);
                saveToLocal();
                renderQuestionList(container, testId);
            }
        };

        card.onclick = () => openQuestionEditor(container, testId, index);
        listDiv.appendChild(card);
    });

    container.querySelector("#add-question-btn").onclick = () => openQuestionEditor(container, testId);
};

// 4. SAVOL TAHRIRLASH
const openQuestionEditor = (container, testId, qIndex = null) => {
    const listView = container.querySelector("#question-list-view");
    const editView = container.querySelector("#question-edit-view");
    const test = allTests[testId];

    listView.style.display = "none";
    editView.style.display = "flex";

    const isNew = qIndex === null;

    let qData;
    if (isNew) {
        qData = { text: { uz: "", en: "", ru: "" }, type: "single", answers: [], score: 1, penalty: 0 };
    } else {
        qData = JSON.parse(JSON.stringify(test.questions[qIndex]));
        if (typeof qData.text === "string") qData.text = { uz: qData.text, en: "", ru: "" };
    }

    let activeEditLang = "uz";

    const renderEditorUI = () => {
        editView.innerHTML = `
            <div class="editor-header">
                <button class="btn-back-q">
                    <img src="/pages/Dashboard/images/back-img.svg" alt="" />
                    ${t("question")} ${qIndex !== null ? qIndex + 1 : test.questions.length + 1}
                </button>
            </div>
            <div class="editor-body" style="width: 100%;">
                <div class="editor-section">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">${t("question_text")}</label>
                    <div class="lang-tabs" style="display: flex; gap: 5px; margin-bottom: 0;">
                        <button class="tab-btn ${activeEditLang === "uz" ? "active" : ""}" data-lang="uz">UZ</button>
                        <button class="tab-btn ${activeEditLang === "en" ? "active" : ""}" data-lang="en">EN</button>
                        <button class="tab-btn ${activeEditLang === "ru" ? "active" : ""}" data-lang="ru">RU</button>
                    </div>
                    <textarea id="q-text" class="input q-textarea"
                        style="border-top-left-radius: 0; border-top-right-radius: 0;"
                        placeholder="${t("enter_test_question")}">${qData.text[activeEditLang] || ""}</textarea>
                </div>
                <div class="editor-section">
                    <label>${t("ansver_type")}</label>
                    <select id="q-type" class="input">
                        <option value="single" ${qData.type === "single" ? "selected" : ""}>${t("single_choise")}</option>
                        <option value="multiple" ${qData.type === "multiple" ? "selected" : ""}>${t("multiple_choise")}</option>
                        <option value="true-false" ${qData.type === "true-false" ? "selected" : ""}>${t("true_false")}</option>
                    </select>
                </div>
                <div id="answers-wrapper">
                    <h4 style="margin: 20px 0 10px 0;">${t("ansvers")} (${activeEditLang.toUpperCase()})</h4>
                    <div id="answers-list"></div>
                    <button class="btn" id="add-ans-btn" style="margin-top: 10px; align-self: flex-start; display: ${qData.type === "true-false" ? "none" : "block"}">+ ${t("add_ansver")}</button>
                </div>
                <div class="score-settings" style="display: flex; gap: 20px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <div class="input-group">
                        <label>${t("points")}</label>
                        <input type="number" id="q-score" class="input" value="${qData.score}">
                    </div>
                    <div class="input-group">
                        <label>${t("penalty")}</label>
                        <input type="number" id="q-penalty" class="input" value="${qData.penalty}">
                    </div>
                </div>
                <div class="editor-actions" style="margin-top: 30px; display: flex; gap: 10px;">
                    <button class="btn save-q-btn" style="background: #22c55e;">${t("save")}</button>
                    <button class="btn cancel-q-btn" style="background: #ef4444;">${t("cancel")}</button>
                </div>
            </div>
        `;

        editView.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.onclick = () => {
                qData.text[activeEditLang] = editView.querySelector("#q-text").value;
                activeEditLang = btn.dataset.lang;
                renderEditorUI();
            };
        });

        const ansList = editView.querySelector("#answers-list");

        if (qData.type === "true-false" && qData.answers.length !== 2) {
            qData.answers = [
                { text: { uz: "Rost", en: "True", ru: "Истина" }, isCorrect: true },
                { text: { uz: "Yolg'on", en: "False", ru: "Ложь" }, isCorrect: false },
            ];
        }

        qData.answers.forEach((ans, i) => {
            if (typeof ans.text === "string") ans.text = { uz: ans.text, en: "", ru: "" };

            const div = document.createElement("div");
            div.className = "ans-edit-row";
            div.style.marginBottom = "10px";
            div.innerHTML = `
                <input type="${qData.type === "multiple" ? "checkbox" : "radio"}"
                    name="correct-ans" ${ans.isCorrect ? "checked" : ""} class="ans-check">
                <input type="text" value="${ans.text[activeEditLang] || ""}"
                    class="input ans-input-text"
                    placeholder="${activeEditLang.toUpperCase()} dagi javob..."
                    ${qData.type === "true-false" ? "readonly" : ""}>
                ${qData.type !== "true-false" ? `<button class="del-ans-btn" style="color: red; border:none; background:none; cursor:pointer; font-weight:bold; padding: 0 10px;">X</button>` : ""}
            `;

            div.querySelector(".ans-check").onclick = (e) => {
                if (qData.type !== "multiple") qData.answers.forEach((a) => (a.isCorrect = false));
                ans.isCorrect = e.target.checked;
            };

            div.querySelector(".ans-input-text").oninput = (e) => {
                ans.text[activeEditLang] = e.target.value;
            };

            if (qData.type !== "true-false") {
                div.querySelector(".del-ans-btn").onclick = () => {
                    qData.text[activeEditLang] = editView.querySelector("#q-text").value;
                    qData.answers.splice(i, 1);
                    renderEditorUI();
                };
            }
            ansList.appendChild(div);
        });

        editView.querySelector("#q-type").onchange = (e) => {
            qData.text[activeEditLang] = editView.querySelector("#q-text").value;
            qData.type = e.target.value;
            if (qData.type === "true-false") {
                qData.answers = [
                    { text: { uz: "Rost", en: "True", ru: "Истина" }, isCorrect: true },
                    { text: { uz: "Yolg'on", en: "False", ru: "Ложь" }, isCorrect: false },
                ];
            }
            renderEditorUI();
        };

        editView.querySelector("#add-ans-btn").onclick = () => {
            qData.text[activeEditLang] = editView.querySelector("#q-text").value;
            qData.answers.push({ text: { uz: "", en: "", ru: "" }, isCorrect: false });
            renderEditorUI();
        };

        editView.querySelector(".save-q-btn").onclick = () => {
            qData.text[activeEditLang] = editView.querySelector("#q-text").value;
            qData.score = parseInt(editView.querySelector("#q-score").value) || 0;
            qData.penalty = parseInt(editView.querySelector("#q-penalty").value) || 0;
            if (isNew) test.questions.push(qData);
            else test.questions[qIndex] = qData;
            saveToLocal();
            renderDetailView(container, testId);
        };

        editView.querySelector(".cancel-q-btn").onclick = () => renderDetailView(container, testId);
        editView.querySelector(".btn-back-q").onclick = () => {
            listView.style.display = "block";
            editView.style.display = "none";
            renderQuestionList(container, testId);
        };
    };

    renderEditorUI();
};

// 5. LEADERBOARD
const updateLeaderboardData = (score, testIdx) => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) return;

    let users = JSON.parse(localStorage.getItem("users")) || [];
    const test = allTests[testIdx];

    users = users.map((u) => {
        if (u.username === currentUser.username) {
            if (!u.results) u.results = [];
            const existingRes = u.results.find((r) => r.testName === test.name);
            if (!existingRes) {
                u.results.push({ testName: test.name, score, date: new Date().toLocaleDateString() });
                u.totalScore = u.results.reduce((sum, res) => sum + Number(res.score), 0);
            }
        }
        return u;
    });

    localStorage.setItem("users", JSON.stringify(users));
};

const renderLeaderboardUI = () => {
    const leaderboardDiv = document.querySelector(".dashboard__liderboard");
    if (!leaderboardDiv) return;

    let users = JSON.parse(localStorage.getItem("users")) || [];
    const sortedUsers = users.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)).slice(0, 5);

    leaderboardDiv.innerHTML = `
        <h3 class="lider-title">
            ${t("lider_board_title")}
            <img src="/pages/Dashboard/images/leaderboard-img.svg" alt="">
        </h3>
        <div class="lider-list">
            ${sortedUsers
                .map(
                    (u, index) => `
                <div class="lider-item">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; color: #3f8cff;">#${index + 1}</span>
                        <img src="${u.avatar || "./assets/images/User-avatar.png"}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                        <span style="font-size: 14px;">${u.username}</span>
                    </div>
                    <span style="font-weight: bold; color: #22c55e;">${u.totalScore || 0} ${t("points")}</span>
                </div>
            `,
                )
                .join("")}
        </div>
    `;
};

// Testni o'chirish — tasdiqlash modali orqali
const deleteTest = (index) => {
    const test = allTests[index];
    const modal = document.getElementById("delete-confirm-modal");
    const desc = document.getElementById("delete-modal-desc");
    const confirmBtn = document.getElementById("confirm-delete-btn");
    const cancelBtn = document.getElementById("cancel-delete-btn");

    desc.innerHTML = `"<b>${test.name}</b>" ${t("delete_test_text")}.`;
    modal.style.display = "flex";

    // Har safar yangi handler — eski handlerni olib tashlaymiz
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirm);

    newConfirm.onclick = () => {
        allTests.splice(index, 1);
        saveToLocal();
        modal.style.display = "none";
        location.reload();
    };

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };

    // Tashqariga bossak yopiladi
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
};

// Testni clone qilish — nusxa yaratib detail sahifasiga o'tadi
const cloneTest = (container, index) => {
    const original = allTests[index];

    // Deep copy — savollar va javoblar to'liq nusxalanadi
    const cloned = JSON.parse(JSON.stringify(original));
    cloned.name = `${original.name} (Copy)`;
    cloned.isActive = false; // Clone har doim draft holida boshlanadi

    // Asl testning pastidan qo'shamiz
    allTests.splice(index + 1, 0, cloned);
    saveToLocal();

    initDashboardLogic();
};

// 6. ASOSIY LOGIKA
export const initDashboardLogic = () => {
    const container = document.querySelector(".content");

    // ✅ Result view
    if (currentView === "result") {
        const saved = JSON.parse(localStorage.getItem("lastResult"));
        if (saved) {
            const test = allTests[saved.testId];
            if (test) {
                renderResultView(container, test, saved.userAnswers, saved.examLang);
                return;
            }
        }
        currentView = "dashboard";
        localStorage.removeItem("lastResult");
        saveToLocal();
    }

    // ✅ Quiz view
    if (currentView === "quiz") {
        const savedQuiz = JSON.parse(localStorage.getItem("currentQuiz"));
        if (savedQuiz) {
            const test = allTests[savedQuiz.testId];
            if (test) {
                renderQuizView(container, savedQuiz.testId, savedQuiz.examLang, savedQuiz.userAnswers, savedQuiz.startTime);
                return;
            }
        }
        currentView = "dashboard";
        localStorage.removeItem("currentQuiz");
        saveToLocal();
    }

    // Detail view
    if (currentView === "detail" && currentTestId !== null) {
        renderDetailView(container, currentTestId);
        return;
    }

    // Dashboard
    const testsList = document.querySelector(".tests");
    const totalCounts = document.querySelectorAll(".total-count");

    const activeTests = allTests.filter((t) => t.isActive).length;
    const notActiveTests = allTests.filter((t) => !t.isActive).length;

    if (totalCounts.length >= 3) {
        totalCounts[0].innerText = allTests.length;
        totalCounts[1].innerText = activeTests;
        totalCounts[2].innerText = notActiveTests;
    }

    renderLeaderboardUI();

    const createBtn = document.querySelector(".create-test-btn");
    const modal = document.getElementById("modal");
    const closeModal = document.getElementById("close-modal");
    const addTestBtn = document.getElementById("add-test-btn");
    const testNameInput = document.getElementById("test-name-input");

    if (createBtn) {
        createBtn.onclick = () => {
            modal.style.display = "flex";
            testNameInput.value = "";
            testNameInput.focus();
        };
    }

    if (closeModal) closeModal.onclick = () => (modal.style.display = "none");

    if (addTestBtn) {
        addTestBtn.onclick = () => {
            const name = testNameInput.value.trim();
            if (!name) return alert("Test nomini kiriting!");
            allTests.push({ name, questions: [], isActive: false, timeLimit: false, minutes: 0, seconds: 0 });
            saveToLocal();
            modal.style.display = "none";
            renderDetailView(container, allTests.length - 1);
        };
    }

    // ✅ Har qanday joyga bosilganda barcha open dropdownlarni yopamiz
    document.addEventListener("click", () => {
        document.querySelectorAll(".test-card-dropdown").forEach((d) => {
            d.style.display = "none";
        });
        document.querySelectorAll(".dots-menu-btn").forEach((b) => {
            b.classList.remove("active");
        });
    });

    const updateUI = () => {
        if (!testsList) return;
        testsList.innerHTML = "";

        allTests.forEach((test, index) => {
            const card = document.createElement("div");
            card.className = "test-card-item";

            card.innerHTML = `
                <div class="test-card-main" style="flex: 1; cursor: pointer;">
                    <h4 style="margin: 0; color: var(--primary-blue);">${test.name}</h4>
                    <small style="color: #64748b;">${test.questions.length} ${t("questions")}</small>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    ${test.isActive ? `<span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${t("active")}</span>` : `<span style="background: #FDC748; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${t("not_active")}</span>`}

                    <!-- ✅ 3 nuqtali button -->
                    <div class="test-card-menu-wrapper" style="position: relative;">
                        <button class="dots-menu-btn" data-idx="${index}" style="
                            width: 32px; height: 32px;
                            border: none; background: transparent;
                            cursor: pointer; border-radius: 8px;
                            display: flex; align-items: center; justify-content: center;
                            color: #94a3b8; transition: background 0.15s, color 0.15s;
                        ">
                            <svg width="4" height="16" viewBox="0 0 4 16" fill="none">
                                <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
                                <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
                                <circle cx="2" cy="14" r="1.5" fill="currentColor"/>
                            </svg>
                        </button>

                        <!-- Dropdown -->
                        <div class="test-card-dropdown" style="
                            display: none;
                            position: absolute; top: -25px; right: 40px;
                            background: #fff;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                            min-width: 140px;
                            z-index: 100;
                            overflow: hidden;
                            animation: dropIn 0.15s ease both;
                        ">
                            <button class="dropdown-clone-btn" data-idx="${index}" style="
                                width: 100%; padding: 11px 16px;
                                border: none; background: transparent;
                                text-align: left; cursor: pointer;
                                font-size: 14px; color: #334155;
                                display: flex; align-items: center; gap: 10px;
                                transition: background 0.15s;
                            ">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="#3f8cff" stroke-width="2"/>
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#3f8cff" stroke-width="2"/>
                                </svg>
                                Clone
                            </button>
                            <div style="height: 1px; background: #f1f5f9; margin: 0 12px;"></div>
                            <button class="dropdown-delete-btn" data-idx="${index}" style="
                                width: 100%; padding: 11px 16px;
                                border: none; background: transparent;
                                text-align: left; cursor: pointer;
                                font-size: 14px; color: #ef4444;
                                display: flex; align-items: center; gap: 10px;
                                transition: background 0.15s;
                            ">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Karta bosilganda → detail/pre-start
            card.querySelector(".test-card-main").onclick = () => {
                if (test.isActive) renderPreStartView(container, index);
                else renderDetailView(container, index);
            };

            // Status badge bosilganda ham detail ga o'tadi
            card.querySelector("span").onclick = () => {
                if (test.isActive) renderPreStartView(container, index);
                else renderDetailView(container, index);
            };

            // ✅ 3 nuqta bosilganda dropdown ochiladi/yopiladi
            const dotsBtn = card.querySelector(".dots-menu-btn");
            const dropdown = card.querySelector(".test-card-dropdown");

            dotsBtn.onclick = (e) => {
                e.stopPropagation();

                // Boshqa barcha dropdownlarni yopamiz
                document.querySelectorAll(".test-card-dropdown").forEach((d) => {
                    if (d !== dropdown) d.style.display = "none";
                });

                const isOpen = dropdown.style.display === "block";
                dropdown.style.display = isOpen ? "none" : "block";
                dotsBtn.style.background = isOpen ? "transparent" : "#f1f5f9";
                dotsBtn.style.color = isOpen ? "#94a3b8" : "#334155";
            };

            // Hover effekti
            dotsBtn.onmouseenter = () => {
                if (dropdown.style.display !== "block") {
                    dotsBtn.style.background = "#f8fafc";
                    dotsBtn.style.color = "#475569";
                }
            };
            dotsBtn.onmouseleave = () => {
                if (dropdown.style.display !== "block") {
                    dotsBtn.style.background = "transparent";
                    dotsBtn.style.color = "#94a3b8";
                }
            };

            // Dropdown ichidagi button hover effektlari
            card.querySelectorAll(".dropdown-clone-btn, .dropdown-delete-btn").forEach((btn) => {
                btn.onmouseenter = () => (btn.style.background = "#f8fafc");
                btn.onmouseleave = () => (btn.style.background = "transparent");
            });

            // ✅ Clone tugmasi
            card.querySelector(".dropdown-clone-btn").onclick = (e) => {
                e.stopPropagation();
                dropdown.style.display = "none";
                cloneTest(container, index);
            };

            // ✅ Delete tugmasi
            card.querySelector(".dropdown-delete-btn").onclick = (e) => {
                e.stopPropagation();
                dropdown.style.display = "none";
                deleteTest(index);
            };

            testsList.appendChild(card);
        });
    };

    updateUI();

    const createBox = document.querySelector(".dashboard__create-box");
    if (createBox) createBox.insertAdjacentHTML("beforeend", createDashAnalyticsBtn(currentLang));
    initDashAnalytics(currentLang);
};

// 7. PRE-START
const renderPreStartView = (container, testId) => {
    const test = allTests[testId];
    const users = JSON.parse(localStorage.getItem("users")) || [];

    const testResults = [];
    users.forEach((u) => {
        if (u.results && Array.isArray(u.results)) {
            const r = u.results.find((r) => r.testName === test.name);
            if (r) testResults.push({ username: u.username, score: parseInt(r.score) || 0, date: r.date || "" });
        }
    });

    const topPerformers = testResults.sort((a, b) => b.score - a.score).slice(0, 5);

    container.innerHTML = `
        <div class="pre-start-container">
            <div style="margin-bottom: 20px;">
                <button class="btn back-to-dash" style="background: #f1f5f9; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    ${t("back_dash")}
                </button>
            </div>
            <div class="pre-start-grid" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; align-items: start;">
                <div class="card" style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 25px rgba(0,0,0,0.05);">
                    <h1 style="font-size: 32px; color: #1e293b; margin-bottom: 10px;">${test.name}</h1>
                    <div style="display: flex; gap: 20px; margin-bottom: 35px;">
                        <div style="flex: 1; background: #f8faff; padding: 20px; border-radius: 16px; border: 1px solid #eef2ff;">
                            <span style="display: block; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">${t("questions")}</span>
                            <strong style="font-size: 24px; color: #3f8cff;">${test.questions.length}</strong>
                        </div>
                        <div style="flex: 1; background: #f8faff; padding: 20px; border-radius: 16px; border: 1px solid #eef2ff;">
                            <span style="display: block; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">${t("time_limit")}</span>
                            <strong style="font-size: 24px; color: #3f8cff;">${test.timeLimit ? test.minutes + "m " + test.seconds + "s" : "Cheksiz"}</strong>
                        </div>
                    </div>
                    <div style="margin-bottom: 35px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 12px; color: #334155;">${t("select_exam_language")}</label>
                        <select id="exam-lang-select" class="input" style="width: 100%; padding: 15px; border-radius: 12px; border: 2px solid #3f8cff; font-size: 16px; outline: none;">
                            <option value="uz">O'zbek tili</option>
                            <option value="en">English</option>
                            <option value="ru">Русский язык</option>
                        </select>
                    </div>
                    <button id="start-exam-confirm" class="btn" style="width: 100%; padding: 18px; background: #3f8cff; color: white; font-size: 18px; font-weight: bold; border: none; border-radius: 12px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 20px rgba(63, 140, 255, 0.2);">
                        ${t("start_now")}
                    </button>
                </div>
                <div class="card" style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 25px rgba(0,0,0,0.05);">
                    <h3 style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px; font-size: 20px; color: #1e293b;">
                        <span style="font-size: 24px;">🏆</span> ${t("lider_board_title")}
                    </h3>
                    <div class="mini-leaderboard">
                        ${
                            topPerformers.length > 0
                                ? topPerformers
                                      .map(
                                          (res, i) => `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #f1f5f9;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: ${i === 0 ? "#fef3c7" : "#f1f5f9"}; color: ${i === 0 ? "#d97706" : "#64748b"}; font-weight: 800; font-size: 12px;">${i + 1}</div>
                                        <span style="font-size: 15px; font-weight: 600; color: #334155;">${res.username}</span>
                                    </div>
                                    <span style="font-weight: 800; color: #10b981; background: #ecfdf5; padding: 4px 10px; border-radius: 8px;">${res.score} ball</span>
                                </div>
                            `,
                                      )
                                      .join("")
                                : `<div style="text-align: center; padding: 40px 0;"><p style="color: #94a3b8; font-size: 14px;">${t("no_results_yet")}</p></div>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelector(".back-to-dash").onclick = () => {
        currentView = "dashboard";
        location.reload();
    };

    container.querySelector("#start-exam-confirm").onclick = () => {
        const selectedLang = container.querySelector("#exam-lang-select").value;
        const startTime = Date.now();
        localStorage.setItem("currentQuiz", JSON.stringify({ testId, examLang: selectedLang, userAnswers: {}, startTime }));
        currentView = "quiz";
        saveToLocal();
        renderQuizView(container, testId, selectedLang, {}, startTime);
    };
};

// 8. QUIZ VIEW
const renderQuizView = (container, testId, examLang, savedAnswers = {}, startTime = null) => {
    const test = allTests[testId];
    let userAnswers = savedAnswers;

    const totalSeconds = (parseInt(test.minutes) || 0) * 60 + (parseInt(test.seconds) || 0);

    let timeLeft = totalSeconds;
    if (test.timeLimit && startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timeLeft = Math.max(0, totalSeconds - elapsed);
    }

    let timerInterval = null;

    const saveQuizState = () => {
        localStorage.setItem("currentQuiz", JSON.stringify({ testId, examLang, userAnswers, startTime }));
    };

    container.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-pagination" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 25px; padding: 15px; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                ${test.questions
                    .map(
                        (_, i) => `
                    <button class="q-nav-btn" data-idx="${i}"
                        style="width: 40px; height: 40px; border-radius: 8px; border: 2px solid #e2e8f0; background: white; cursor: pointer; font-weight: 600; transition: 0.2s;">
                        ${i + 1}
                    </button>
                `,
                    )
                    .join("")}
            </div>

            <div class="quiz-main-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h3 style="margin: 0; color: #1e293b;">${test.name}</h3>
                    <div id="timer-display" style="font-size: 18px; font-weight: 700; color: #ef4444; background: #fee2e2; padding: 8px 16px; border-radius: 8px;">
                        ${test.timeLimit ? "" : "∞"}
                    </div>
                </div>
                ${
                    test.timeLimit
                        ? `
                    <div class="timer-wrapper" style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 10px; margin-bottom: 25px; overflow: hidden;">
                        <div id="timer-progress-line" style="width: ${totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 100}%; height: 100%; background: linear-gradient(90deg, #ef4444, #f87171); transition: width 1s linear;"></div>
                    </div>
                `
                        : ""
                }
                <div id="question-content"></div>
                <button id="submit-quiz-btn" class="btn">${t("finish_test")}</button>
            </div>
        </div>

        <!-- Yakunlash modali -->
        <div id="finish-modal-overlay" style="
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            z-index: 1000; align-items: center; justify-content: center;">
            <div style="
                background: #fff; border-radius: 20px; padding: 40px;
                max-width: 400px; width: 90%; text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                animation: modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;">
                <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 10px;">${t("finish_test")}</h2>
                <p style="color: #64748b; font-size: 15px; margin: 0 0 28px; line-height: 1.6;">
                    ${t("finish_test_modal")}<br>
                    <strong style="color: #3f8cff;" id="answered-count">0</strong> / ${test.questions.length}.
                </p>
                <div style="display: flex; gap: 12px;">
                    <button id="modal-cancel-btn" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: #475569; font-size: 15px; font-weight: 600; cursor: pointer;">
                        ${t("continue")}
                    </button>
                    <button id="modal-confirm-btn" style="flex: 1; padding: 14px; border-radius: 12px; border: none; background: #3f8cff; color: white; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 20px rgba(63,140,255,0.3);">
                        ${t("finish")} 
                    </button>
                </div>
            </div>
        </div>

        <style>
            @keyframes modalPop {
                from { opacity: 0; transform: scale(0.85); }
                to   { opacity: 1; transform: scale(1); }
            }
            @keyframes dropIn {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;

    const finishModalOverlay = container.querySelector("#finish-modal-overlay");
    const modalCancelBtn = container.querySelector("#modal-cancel-btn");
    const modalConfirmBtn = container.querySelector("#modal-confirm-btn");

    const openFinishModal = () => {
        const answeredCount = Object.keys(userAnswers).filter((k) => userAnswers[k]?.length > 0).length;
        container.querySelector("#answered-count").textContent = answeredCount;
        finishModalOverlay.style.display = "flex";
    };

    modalCancelBtn.onclick = () => (finishModalOverlay.style.display = "none");
    modalConfirmBtn.onclick = () => {
        clearInterval(timerInterval);
        localStorage.removeItem("currentQuiz");
        currentView = "result";
        saveToLocal();
        renderResultView(container, test, userAnswers, examLang);
    };

    finishModalOverlay.onclick = (e) => {
        if (e.target === finishModalOverlay) finishModalOverlay.style.display = "none";
    };

    if (test.timeLimit && totalSeconds > 0) {
        const progressLine = container.querySelector("#timer-progress-line");
        const timerDisplay = container.querySelector("#timer-display");

        const updateTimerDisplay = () => {
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            if (timerDisplay) timerDisplay.innerText = `${m}:${s < 10 ? "0" + s : s}`;
            if (progressLine) {
                const pct = (timeLeft / totalSeconds) * 100;
                progressLine.style.width = pct + "%";
                progressLine.style.background = pct < 15 ? "#b91c1c" : "linear-gradient(90deg, #ef4444, #f87171)";
            }
        };

        updateTimerDisplay();

        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                localStorage.removeItem("currentQuiz");
                currentView = "result";
                saveToLocal();
                renderResultView(container, test, userAnswers, examLang);
                return;
            }
            timeLeft--;
            updateTimerDisplay();
        }, 1000);
    }

    const showQuestion = (idx) => {
        const q = test.questions[idx];
        const qText = q.text[examLang] || q.text["uz"];

        container.querySelectorAll(".q-nav-btn").forEach((btn, i) => {
            const isAnswered = userAnswers[i] && userAnswers[i].length > 0;
            btn.style.borderColor = i === idx ? "#3f8cff" : isAnswered ? "#10b981" : "#e2e8f0";
            btn.style.background = i === idx ? "#eff6ff" : isAnswered ? "#ecfdf5" : "white";
            btn.style.color = i === idx ? "#3f8cff" : isAnswered ? "#10b981" : "#64748b";
        });

        const content = container.querySelector("#question-content");
        content.innerHTML = `
            <h4 style="color: #64748b; margin-bottom: 10px;">${t("question")} ${idx + 1}:</h4>
            <h2 style="font-size: 22px; margin-bottom: 25px; line-height: 1.4;">${qText}</h2>
            <div style="display: grid; gap: 12px;">
                ${q.answers
                    .map((ans, i) => {
                        const isSelected = (userAnswers[idx] || []).includes(i);
                        const ansText = ans.text[examLang] || ans.text["uz"];
                        return `
                        <label style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid ${isSelected ? "#3f8cff" : "#f1f5f9"}; border-radius: 12px; cursor: pointer; transition: 0.2s; background: ${isSelected ? "#f8faff" : "white"};">
                            <input type="${q.type === "multiple" ? "checkbox" : "radio"}"
                                name="ans" value="${i}" ${isSelected ? "checked" : ""}
                                style="width: 20px; height: 20px; cursor: pointer;">
                            <span style="font-size: 16px; color: #334155;">${ansText}</span>
                        </label>
                    `;
                    })
                    .join("")}
            </div>
        `;

        content.querySelectorAll('input[name="ans"]').forEach((inp) => {
            inp.onchange = () => {
                const selected = Array.from(content.querySelectorAll('input[name="ans"]:checked')).map((v) => parseInt(v.value));
                userAnswers[idx] = selected;
                saveQuizState();

                const btn = container.querySelector(`.q-nav-btn[data-idx="${idx}"]`);
                btn.style.borderColor = "#10b981";
                btn.style.background = "#ecfdf5";
                btn.style.color = "#10b981";
            };
        });
    };

    container.querySelectorAll(".q-nav-btn").forEach((btn) => {
        btn.onclick = () => showQuestion(parseInt(btn.dataset.idx));
    });

    container.querySelector("#submit-quiz-btn").onclick = openFinishModal;

    showQuestion(0);
};

// 9. RESULT VIEW
const renderResultView = (container, test, userAnswers, examLang) => {
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    localStorage.setItem("currentView", "result");

    const resultItemsHTML = test.questions
        .map((q, idx) => {
            const userAns = userAnswers[idx] || [];
            const correctAns = q.answers.map((a, i) => (a.isCorrect ? i : null)).filter((v) => v !== null);
            const isCorrect = userAns.length === correctAns.length && userAns.every((v) => correctAns.includes(v));

            if (isCorrect) {
                totalScore += Number(q.score);
                correctCount++;
            } else {
                totalScore -= Number(q.penalty);
                wrongCount++;
            }

            const qText = q.text[examLang] || q.text["uz"];

            return `
            <div class="result-q-card ${isCorrect ? "is-correct" : "is-wrong"}">
                <div class="result-q-left">
                    <div class="result-q-number">${t("question")} ${idx + 1}</div>
                    ${
                        !isCorrect
                            ? `<div class="result-q-hint">
                                <span>⚠️</span> ${t("wrong_hint")}.
                                </div>`
                            : ""
                    }
                </div>
                <span class="result-status-badge">
                    ${isCorrect ? `${t("correct")}` : `${t("wrong")}`}
                </span>
            </div>
        `;
        })
        .join("");

    const finalScore = Math.max(0, totalScore);
    updateLeaderboardData(finalScore, allTests.indexOf(test));

    localStorage.setItem(
        "lastResult",
        JSON.stringify({
            testId: allTests.indexOf(test),
            userAnswers,
            examLang,
            finalScore,
            correctCount,
            wrongCount,
        }),
    );
    localStorage.setItem("currentView", "result");

    container.innerHTML = `
        <div class="result-page">

            <div class="result-hero">
                <h1>${t("test_ended")}</h1>

                <div class="result-score-card">
                    <span class="result-score-label">${t("total_score")}</span>
                    <span class="result-score-number">${finalScore}</span>
                    <span class="result-score-unit">${t("points")}</span>
                </div>

                <div class="result-stats-row">
                    <div class="result-stat-badge correct">
                        <span class="stat-dot"></span>
                        <b>${correctCount}</b> ${t("correct")}
                    </div>
                    <div class="result-stat-badge wrong">
                        <span class="stat-dot"></span>
                        <b>${wrongCount}</b> ${t("wrong")}
                    </div>
                </div>

                <div class="result-exit-row">
                    <button id="exit-result-btn" class="result-exit-btn">
                        ← ${t("back_dash")}
                    </button>
                </div>
            </div>

            <div class="result-details">
                <div class="result-details-title">${t("analysis_question")}</div>
                ${resultItemsHTML}
            </div>
        </div>
    `;

    container.querySelector("#exit-result-btn").onclick = () => {
        currentView = "dashboard";
        localStorage.removeItem("lastResult");
        saveToLocal();
        location.reload();
    };
};

// 10. GENERAL EVENTS
const setupGeneralEvents = (container, testId) => {
    container.querySelectorAll(".nav-item").forEach((item) => {
        item.onclick = () => {
            currentTab = item.dataset.tab;
            saveToLocal();
            renderDetailView(container, testId);
        };
    });
    container.querySelector(".back-to-dash").onclick = () => {
        currentView = "dashboard";
        currentTestId = null;
        saveToLocal();
        location.reload();
    };
};
