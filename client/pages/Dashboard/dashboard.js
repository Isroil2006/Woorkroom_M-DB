import { API_URL, getAuthHeaders, fetchCurrentUser } from "../../assets/js/api.js";
import { getCurrentLang, createTranslationHelper, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";
import { translations } from "./translations.js";

const t = createTranslationHelper(translations);

// STATE
let currentTestMenu = "questions"; // Default to "questions" as requested
let allTests = [];
let currentUser = null;
let currentBankTab = "others"; // "others" yoki "mine"
let currentTestId = null; // Agar test yaratilayotgan yoki tahrirlanayotgan bo'lsa
let testDraft = null;
let currentTab = "questions"; // "questions" yoki "settings"
let selectedQuestionIndex = 0;
let activeTestSession = null; // Test yechilayotgan vaqtdagi ma'lumotlar
let activeTestResult = null; // Test natijalari
let completedTestsHistory = []; // user tugatgan testlar tarixi (DB dan keladi)
let completedTests = {}; // lookup xaritasiga aylantirilgan tarix
let activatedTestIds = []; // ID orqali faollashtirilgan testlar ro'yxati
let creatorTestResults = []; // Creator ko'radigan natijalar ro'yxati

const generateRandomID = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const avatarColors = ["#5b6ef5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#6d505f"];
const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
const avatarHtml = (user, size = 42, extraClass = "") => {
  const s = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;flex-shrink:0;`;
  if (!user) return `<div class="${extraClass}" style="${s}background:#e2e8f0;display:flex;align-items:center;justify-content:center;border-radius:50%;color:white;">?</div>`;
  if (user.avatar && user.avatar !== "./assets/images/User-avatar.png")
    return `<img src="${user.avatar}" class="${extraClass}" style="width:${size}px;height:${size}px;flex-shrink:0;border-radius:50%;object-fit:cover;" />`;
  return `<div class="${extraClass}" style="${s}background:${avatarColor(user.username)};display:flex;align-items:center;justify-content:center;border-radius:50%;color:white;font-weight:600;">${initials(user.username)}</div>`;
};

setInterval(async () => {
    if (testDraft && currentTestId && currentTestMenu === "questions" && currentTab === "questions") {
        saveCurrentDraftState();
        const hasUnsaved = testDraft.questions.some(q => q._isSaved === false);
        if (hasUnsaved) {
            const saved = await saveTestAPI(testDraft, false);
            if (saved) {
                testDraft = saved;
                testDraft.questions.forEach(q => q._isSaved = true);
                
                document.querySelectorAll('.q-list-item').forEach(item => {
                    const dot = item.querySelector('.q-status-dot');
                    if (dot) {
                        dot.classList.remove('unsaved');
                        dot.classList.add('saved');
                    }
                });
            }
        }
    }
}, 30000);

export const showAlert = (message, type = 'error') => {
    let alertModal = document.getElementById('custom-alert-modal');
    
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.id = 'custom-alert-modal';
        alertModal.className = 'custom-modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'custom-modal animated-modal';
        modalContent.style.textAlign = 'center';
        modalContent.style.maxWidth = '400px';
        modalContent.style.padding = '30px 24px';
        
        const iconDiv = document.createElement('div');
        iconDiv.id = 'alert-icon';
        iconDiv.style.marginBottom = '20px';
        
        const msgP = document.createElement('p');
        msgP.id = 'alert-message';
        msgP.style.fontSize = '16px';
        msgP.style.color = '#334155';
        msgP.style.marginBottom = '25px';
        msgP.style.fontWeight = '500';
        
        const okBtn = document.createElement('button');
        okBtn.className = 'btn primary';
        okBtn.innerText = t('understood_btn');
        okBtn.style.width = '100%';
        okBtn.onclick = () => {
            alertModal.classList.remove('active');
        };
        
        modalContent.appendChild(iconDiv);
        modalContent.appendChild(msgP);
        modalContent.appendChild(okBtn);
        alertModal.appendChild(modalContent);
        
        document.body.appendChild(alertModal);
    }
    
    const iconDiv = document.getElementById('alert-icon');
    const msgP = document.getElementById('alert-message');
    
    msgP.innerText = message;
    
    if (type === 'error') {
        iconDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="background:#fee2e2; padding:10px; border-radius:50%;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
        iconDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="background:#fef3c7; padding:10px; border-radius:50%;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
        iconDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="background:#dbeafe; padding:10px; border-radius:50%;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
    
    setTimeout(() => {
        alertModal.classList.add('active');
    }, 10);
};

window.addEventListener(LANGUAGE_CHANGED_EVENT, () => {
    updateContentArea();
});

export const showConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
        let confirmModal = document.getElementById('custom-confirm-modal');
        
        if (!confirmModal) {
            confirmModal = document.createElement('div');
            confirmModal.id = 'custom-confirm-modal';
            confirmModal.className = 'custom-modal-overlay';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'custom-modal animated-modal';
            modalContent.style.textAlign = 'center';
            modalContent.style.maxWidth = '400px';
            modalContent.style.padding = '30px 24px';
            
            const iconDiv = document.createElement('div');
            iconDiv.id = 'confirm-icon-wrapper';
            iconDiv.style.marginBottom = '20px';
            
            const msgP = document.createElement('p');
            msgP.id = 'confirm-message';
            msgP.style.fontSize = '16px';
            msgP.style.color = '#334155';
            msgP.style.marginBottom = '25px';
            msgP.style.fontWeight = '500';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'confirm-cancel-btn';
            cancelBtn.className = 'btn secondary';
            cancelBtn.innerText = t('cancel_btn');
            cancelBtn.style.flex = '1';
            
            const okBtn = document.createElement('button');
            okBtn.id = 'confirm-ok-btn';
            okBtn.className = 'btn primary';
            okBtn.style.flex = '1';
            okBtn.style.color = 'white';
            
            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(okBtn);
            
            modalContent.appendChild(iconDiv);
            modalContent.appendChild(msgP);
            modalContent.appendChild(btnContainer);
            confirmModal.appendChild(modalContent);
            
            document.body.appendChild(confirmModal);
            
            cancelBtn.onclick = () => {
                confirmModal.classList.remove('active');
                if (confirmModal._resolve) confirmModal._resolve(false);
            };
            
            okBtn.onclick = () => {
                confirmModal.classList.remove('active');
                if (confirmModal._resolve) confirmModal._resolve(true);
            };
        }
        
        const type = options.type || 'delete';
        const okBtn = document.getElementById('confirm-ok-btn');
        const iconDiv = document.getElementById('confirm-icon-wrapper');
        const msgP = document.getElementById('confirm-message');
        
        if (type === 'leave') {
            okBtn.innerText = options.okText || t('yes_leave');
            okBtn.style.background = '#f59e0b';
            okBtn.style.borderColor = '#f59e0b';
            iconDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="background:#fef3c7; padding:10px; border-radius:50%;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        } else {
            okBtn.innerText = options.okText || t('yes_delete');
            okBtn.style.background = '#ef4444';
            okBtn.style.borderColor = '#ef4444';
            iconDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48" style="background:#fee2e2; padding:10px; border-radius:50%;"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        }
        
        msgP.innerText = message;
        confirmModal._resolve = resolve;
        
        setTimeout(() => {
            confirmModal.classList.add('active');
        }, 10);
    });
};

const fetchCompletedTests = async () => {
    try {
        const res = await fetch(`${API_URL}/api/tests/history`, { 
            headers: getAuthHeaders(),
            credentials: "include"
        });
        if (res.ok) {
            completedTestsHistory = await res.json();
            completedTests = {};
            completedTestsHistory.forEach(h => {
                if(h.testId) completedTests[h.testId] = h;
            });
        }
    } catch (err) {
        console.error("Test tarixini olishda xatolik:", err);
    }
};

const saveTestResultAPI = async (resultData) => {
    try {
        await fetch(`${API_URL}/api/tests/history`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify(resultData),
            credentials: "include"
        });
        await fetchCompletedTests(); // yangilash
    } catch (err) {
        console.error("Test natijasini saqlashda xatolik:", err);
    }
};

const loadActivatedTests = () => {
    const cuStr = localStorage.getItem("currentUser");
    const cu = cuStr ? JSON.parse(cuStr) : null;
    const uid = cu ? (cu.userId || cu._id) : 'guest';
    const saved = localStorage.getItem(`activatedTests_${uid}`);
    if (saved) {
        try { activatedTestIds = JSON.parse(saved); }
        catch (e) { activatedTestIds = []; }
    } else { activatedTestIds = []; }
};

const saveActivatedTests = () => {
    const cuStr = localStorage.getItem("currentUser");
    const cu = cuStr ? JSON.parse(cuStr) : null;
    const uid = cu ? (cu.userId || cu._id) : 'guest';
    localStorage.setItem(`activatedTests_${uid}`, JSON.stringify(activatedTestIds));
};

// API FUNCTIONS
const fetchTests = async () => {
    try {
        const res = await fetch(`${API_URL}/api/tests`, { 
            headers: getAuthHeaders(),
            credentials: "include"
        });
        if (res.ok) {
            allTests = await res.json();
        }
    } catch (err) {
        console.error("Testlarni olishda xatolik:", err);
    }
};

const saveTestAPI = async (testData, isNew) => {
    try {
        const url = isNew ? `${API_URL}/api/tests` : `${API_URL}/api/tests/${currentTestId}`;
        const method = isNew ? "POST" : "PUT";
        
        const res = await fetch(url, {
            method,
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(testData)
        });
        
        if (res.ok) {
            const data = await res.json();
            return data;
        } else {
            const err = await res.json();
            showAlert("Xatolik: " + err.message, "error");
            return null;
        }
    } catch (err) {
        console.error(err);
        return null;
    }
};

const deleteTestAPI = async (id) => {
    try {
        const res = await fetch(`${API_URL}/api/tests/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
            credentials: "include"
        });
        if (res.ok) {
            return true;
        } else {
            const err = await res.json();
            showAlert("Xatolik: " + err.message, "error");
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
};

// 1. DASHBOARD SAHIFASINING ASOSIY HTML STRUKTURASI
export const DashboardPage = () => {
    return `
        <div class="test-dashboard-wrapper">
            <div class="test-content"></div>
        </div>

        <!-- Password Modal -->
        <div id="password-modal" class="custom-modal-overlay">
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <h3>${t('enter_password')}</h3>
                    <button class="close-modal-btn" onclick="document.getElementById('password-modal').classList.remove('active')">&times;</button>
                </div>
                <div class="custom-modal-body">
                    <p>${t('password_required_msg')}</p>
                    <input type="text" id="test-password-input" class="s-input" placeholder="${t('password_placeholder')}" />
                    <p id="password-error" style="color: #ef4444; font-size: 13px; margin-top: 5px; display: none;">${t('password_error')}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="btn secondary" onclick="document.getElementById('password-modal').classList.remove('active')">${t('cancel_btn')}</button>
                    <button class="btn primary" id="submit-password-btn">${t('confirm_btn')}</button>
                </div>
            </div>
        </div>

        <!-- ID Activation Modal -->
        <div id="id-activation-modal" class="custom-modal-overlay">
            <div class="custom-modal">
                <div class="custom-modal-header">
                    <h3>${t('activate_test')}</h3>
                    <button class="close-modal-btn" onclick="document.getElementById('id-activation-modal').classList.remove('active')">&times;</button>
                </div>
                <div class="custom-modal-body">
                    <p>${t('enter_id_msg')}</p>
                    <input type="text" id="test-id-input" class="s-input" placeholder="123456" maxlength="6" style="font-family: monospace; font-size: 18px; letter-spacing: 5px; text-align: center;" />
                    <p id="id-error" style="color: #ef4444; font-size: 13px; margin-top: 5px; display: none;"></p>
                </div>
                <div class="custom-modal-footer">
                    <button class="btn secondary" onclick="document.getElementById('id-activation-modal').classList.remove('active')">${t('cancel_btn')}</button>
                    <button class="btn primary" id="submit-id-btn">${t('activate_btn')}</button>
                </div>
            </div>
        </div>
    `;
};

// 2. KONTENTNI RENDER QILUVCHI FUNKSIYALAR
const renderMainPanel = () => {
    return `
        <div class="content-placeholder">
            <h2>${t('main_panel_title')}</h2>
            <p>${t('main_panel_desc')}</p>
        </div>
    `;
};

const renderResultsPanel = () => {
    return `
        <div class="content-placeholder">
            <h2>${t('results_leaderboard')}</h2>
            <p>${t('results_leaderboard_desc')}</p>
        </div>
    `;
};

const renderQuestionsBank = () => {
    let filteredTests = [];
    if (currentBankTab !== "completed") {
        filteredTests = allTests.filter(t => {
            if (currentBankTab === "others") {
                const isOthers = (!currentUser || (t.createdBy !== currentUser.userId && t.createdBy !== currentUser._id)) && !completedTests[t._id];
                if (t.accessType === 'id') {
                    return isOthers && activatedTestIds.includes(t._id);
                }
                return isOthers;
            } else if (currentBankTab === "mine") {
                return currentUser && (t.createdBy === currentUser.userId || t.createdBy === currentUser._id);
            }
            return false;
        });
    }

    let listHtml = '';
    
    const emptyStateHtml = `<div class="empty-state">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-open"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
               <h3>${t('no_tests_yet')}</h3>
               <p>${t('no_tests_desc')}</p>
           </div>`;

    if (currentBankTab === "completed") {
        listHtml = completedTestsHistory.length === 0 
            ? emptyStateHtml
            : completedTestsHistory.map(h => {
                const title = h.testSnapshot && h.testSnapshot.title ? h.testSnapshot.title : t('untitled_test');
                const desc = h.testSnapshot && h.testSnapshot.description ? h.testSnapshot.description : t('no_description');
                const questionCount = h.testSnapshot ? h.testSnapshot.questionCount : 0;
                const dateStr = new Date(h.submittedAt).toLocaleDateString();
                
                let timeText = "∞";
                let tRef = h.testSnapshot;
                if (!tRef || tRef.hasTimeLimit === undefined) {
                    tRef = (h.testId && allTests.find(t => t._id === h.testId)) || null;
                }
                if (tRef && tRef.hasTimeLimit) {
                    let parts = [];
                    if (tRef.timeHours > 0) parts.push(`${tRef.timeHours} ${t('hours_short')}`);
                    if (tRef.timeMinutes > 0) parts.push(`${tRef.timeMinutes} ${t('mins_short')}`);
                    if (parts.length > 0) timeText = parts.join(" ");
                }
                
                return `
                <div class="test-card" style="view-transition-name: test-card-${h.testId || h._id};">
                    <div class="test-card-header">
                        <h4 title="${title}">${title}</h4>
                        <span class="badge" style="background:#e0e7ff; color:#4f46e5;">${t('completed_badge')}</span>
                    </div>
                    <div class="test-card-body">
                        <p class="test-desc">${desc}</p>
                        <div class="test-meta">
                            <div class="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                                <span>${questionCount} ${t('questions_count')}</span>
                            </div>
                            <div class="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>${timeText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="test-card-footer" style="display: flex; gap: 10px;">
                        <button class="btn view-res-btn" data-id="${h.testId || h._id}" style="flex: 1; background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bar-chart-2" width="16" height="16"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                            ${t('result_btn')}
                        </button>
                        ${(h.testId && allTests.find(t => t._id === h.testId)) ? `
                        <button class="btn retake-t-btn" data-id="${h.testId}" style="flex: 1; border: 1px solid #cbd5e1; background: white; color: #475569;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw" width="16" height="16"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            ${t('retake')}
                        </button>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join("");
    } else {
        listHtml = filteredTests.length === 0 
            ? emptyStateHtml
            : filteredTests.map(testObj => {
                const questionCount = testObj.questions ? testObj.questions.length : 0;
                const dateStr = testObj.createdAt ? new Date(testObj.createdAt).toLocaleDateString() : t('new_badge');
                const statusClass = testObj.status === 'active' ? 'b-active' : 'b-draft';
                const statusText = testObj.status === 'active' ? t('active_badge') : t('draft_badge');
                
                let timeText = "∞";
                if (testObj.hasTimeLimit) {
                    let parts = [];
                    if (testObj.timeHours > 0) parts.push(`${testObj.timeHours} ${t('hours_short')}`);
                    if (testObj.timeMinutes > 0) parts.push(`${testObj.timeMinutes} ${t('mins_short')}`);
                    if (parts.length > 0) timeText = parts.join(" ");
                }
                
                return `
                <div class="test-card" style="view-transition-name: test-card-${testObj._id};">
                    <div class="test-card-header">
                        <h4 title="${testObj.title}" style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                            ${testObj.accessType === 'password' ? `<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="flex-shrink:0;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` : ''}
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${testObj.title || t('untitled_test')}</span>
                        </h4>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="test-card-body">
                        <p class="test-desc">${testObj.description || t('no_description')}</p>
                        <div class="test-meta">
                            <div class="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                                <span>${questionCount} ${t('questions_count')}</span>
                            </div>
                            <div class="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>${timeText}</span>
                            </div>
                        </div>
                    </div>
                    <div class="test-card-footer" style="display: flex; gap: 10px;">
                        ${(currentUser && (testObj.createdBy === currentUser.userId || testObj.createdBy === currentUser._id)) ? `
                        ${testObj.accessType === 'id' ? `
                        <div style="width:max-content; display: flex; align-items: center; gap: 5px; background: #f1f5f9; padding: 0 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <span style="font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 2px;">${testObj.accessId || '------'}</span>
                            <button class="icon-btn copy-t-id-btn" data-id="${testObj.accessId}" style="margin-left: auto; padding: 4px; color: #3b82f6; display: flex; align-items: center; justify-content: center; padding: 0;" title="${t('copy_btn')}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy" width="16" height="16"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                            </button>
                        </div>
                        ` : ''}
                        <div style="margin-left: auto; display: flex; gap: 10px;">
                            <button class="btn view-creator-res-btn" data-id="${testObj._id}" style="display: flex; align-items: center; justify-content: center; padding: 10px 15px; border-radius: 10px; transition: 0.2s; background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe;" title="${t('results_leaderboard')}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bar-chart-2" width="16" height="16" style="margin-right: 5px;"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                                Natijalar
                            </button>
                            ${testObj.status !== 'active' ? `
                            <button class="btn edit-t-btn" data-id="${testObj._id}" style="display: flex; align-items: center; justify-content: center; padding: 10px; border-radius: 10px; transition: 0.2s;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil" width="16" height="16"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            ` : ''}
                            <button class="btn del-t-btn" data-id="${testObj._id}" style="background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; display: flex; align-items: center; justify-content: center; padding: 10px; border-radius: 10px; transition: 0.2s;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2" width="16" height="16"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
                        ` : `
                        ${testObj.status === 'active' ? `
                        <button class="btn take-t-btn" data-id="${testObj._id}" style="width: 100%; color: white; background: #3b82f6; border: 1px solid #2563eb;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            ${t('start_btn')}
                        </button>
                        ` : `
                        <button class="btn" style="width: 100%; color: #94a3b8; background: #f1f5f9; border: 1px solid #e2e8f0; cursor: not-allowed;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock" width="16" height="16"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            ${t('inactive_badge')}
                        </button>
                        `}
                        `}
                    </div>
                </div>
            `}).join("");
    }

    let statsHtml = '';
    if (currentBankTab === "completed") {
        const total = completedTestsHistory.length;
        let avgScore = 0;
        let totalScoreSum = 0;
        let totalCorrectAnswers = 0;

        if (total > 0) {
            const sumPercent = completedTestsHistory.reduce((acc, curr) => acc + curr.percent, 0);
            avgScore = Math.round(sumPercent / total);
            totalScoreSum = completedTestsHistory.reduce((acc, curr) => acc + curr.score, 0);
            totalCorrectAnswers = completedTestsHistory.reduce((acc, curr) => acc + curr.correctCount, 0);
        }

        statsHtml = `
        <div class="completed-stats-sidebar">
            <h3 class="css-title">${t('general_stats')}</h3>
            
            <div class="css-card">
                <div class="css-icon blue"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-check-big-icon lucide-square-check-big"><path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"/><path d="m9 11 3 3L22 4"/></svg></div>
                <div class="css-info">
                    <span>${t('solved_tests')}</span>
                    <strong>${total}</strong>
                </div>
            </div>

            <div class="css-card">
                <div class="css-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
                <div class="css-info">
                    <span>${t('avg_result')}</span>
                    <strong>${avgScore}%</strong>
                </div>
            </div>

            <div class="css-card">
                <div class="css-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div class="css-info">
                    <span>${t('total_correct_ans')}</span>
                    <strong>${totalCorrectAnswers}</strong>
                </div>
            </div>

            <div class="css-card">
                <div class="css-icon red"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coins-icon lucide-coins"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="M15 6h1v4"/><path d="m6.134 14.768.866-.5 2 3.464"/><circle cx="16" cy="8" r="6"/></svg></div>
                <div class="css-info">
                    <span>${t('total_collected_points')}</span>
                    <strong>${totalScoreSum}</strong>
                </div>
            </div>
        </div>
        `;
    }

    return `
        <div class="questions-bank">
            <div class="qb-banner">
                <div class="qb-banner-content">
                    <h2>${t('tests_title')}</h2>
                </div>
                <div class="qb-banner-actions" style="display: flex; gap: 10px; align-items: center;">
                    ${currentBankTab === 'others' ? `
                    <button id="activate-id-test-btn" class="test-activate-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key" width="18" height="18"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                        ${t('activate_test')}
                    </button>
                    ` : ''}
                    <button id="create-new-test-btn" class="btn premium-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        ${t('create_test')}
                    </button>
                </div>
            </div>
            
            <div class="qb-toolbar">
                <div class="qb-search-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input type="text" placeholder="${t('search_test')}" class="q-search-modern" />
                </div>
                
                <div class="segmented-control qb-tab-control">
                    <label class="segment-btn ${currentBankTab === 'others' ? 'active' : ''}">
                        <input type="radio" name="bank-tab" value="others" ${currentBankTab === 'others' ? 'checked' : ''} style="display:none;" />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                        ${t('tests')}
                    </label>
                    <label class="segment-btn ${currentBankTab === 'mine' ? 'active' : ''}">
                        <input type="radio" name="bank-tab" value="mine" ${currentBankTab === 'mine' ? 'checked' : ''} style="display:none;" />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                        ${t('my_tests')}
                    </label>
                    <label class="segment-btn ${currentBankTab === 'completed' ? 'active' : ''}">
                        <input type="radio" name="bank-tab" value="completed" ${currentBankTab === 'completed' ? 'checked' : ''} style="display:none;" />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        ${t('completed_tests')}
                    </label>
                </div>
            </div>

            <div class="${currentBankTab === 'completed' ? 'completed-layout' : ''}">
                ${statsHtml}
                <div class="${(currentBankTab === 'completed' ? completedTestsHistory.length === 0 : filteredTests.length === 0) ? 'qb-empty-container' : 'qb-grid'}" ${currentBankTab === 'completed' ? 'style="flex: 1;"' : ''}>
                    ${listHtml}
                </div>
            </div>
        </div>
    `;
};

// Yaratish/Tahrirlash ekrani
const renderTestCreator = () => {
    if (!testDraft) return '';

    return `
        <div class="test-creator">
            <div class="tc-header">
                <div class="tc-title" style="display: flex; align-items: center; gap: 15px;">
                    <button id="back-to-bank-btn" class="icon-btn" style="background: #f1f5f9; padding: 8px; border-radius: 8px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left" width="20" height="20"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    </button>
                    <div>
                        <h2>${testDraft.title || t('new_test')}</h2>
                        <span>${t('questions')}: ${testDraft.questions.length} ${t('count')}</span>
                    </div>
                </div>
                <div class="tc-actions">
                    <button id="save-draft-btn" class="btn secondary">${t('save')}</button>
                    ${testDraft.status !== 'active' ? `<button id="activate-test-btn" class="btn success">${t('activate')}</button>` : ''}
                </div>
            </div>
            
            <div class="tc-tabs">
                <button class="t-tab ${currentTab === 'questions' ? 'active' : ''}" data-tab="questions">${t('questions')}</button>
                <button class="t-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">${t('test_settings')}</button>
            </div>

            <div class="tc-body">
                ${currentTab === 'questions' ? renderQuestionsEditor() : renderSettingsEditor()}
            </div>
        </div>
    `;
};

// Sozlamalar ekrani
const renderSettingsEditor = () => {
    return `
        <div class="settings-editor-container" style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;">
            <div class="s-card">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #334155; font-size: 16px; margin-bottom: 20px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                    ${t('general_settings')}
                </h3>
                <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">${t('test_name')} <span style="color: #ef4444;">*</span></label>
                <input type="text" id="s-title" value="${testDraft.title}" class="s-input" placeholder="${t('test_name')}" />
                
                <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block; margin-top: 15px;">${t('test_desc_optional')}</label>
                <textarea id="s-desc" class="s-input" rows="3" placeholder="${t('test_desc_placeholder')}">${testDraft.description}</textarea>
            </div>
            
            <div class="s-card">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #334155; font-size: 16px; margin-bottom: 20px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>
                    ${t('time_limit_title')}
                </h3>
                <label class="s-toggle-box" style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer;">
                    <div>
                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${t('enable_time_limit')}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${t('time_limit_desc')}</div>
                    </div>
                    <div class="custom-toggle">
                        <input type="checkbox" id="s-timelimit" ${testDraft.hasTimeLimit ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </div>
                </label>
                
                <div class="time-inputs ${testDraft.hasTimeLimit ? 'expanded' : ''}">
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">${t('hours')}</label>
                        <div class="score-input-group" style="display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; width: 100%;">
                            <button id="s-hours-minus" style="width: 40px; height: 36px; border: none; background: #f8fafc; cursor: pointer; border-right: 1px solid #e2e8f0; color: #64748b; font-weight: bold; font-size: 16px; transition: 0.2s;">-</button>
                            <input type="number" id="s-hours" class="score-input" value="${testDraft.timeHours || 0}" min="0" style="flex: 1; height: 36px; padding: 0; border: none; text-align: center; outline: none; -moz-appearance: textfield; font-weight: 600; color: #1e293b;" />
                            <button id="s-hours-plus" style="width: 40px; height: 36px; border: none; background: #f8fafc; cursor: pointer; border-left: 1px solid #e2e8f0; color: #64748b; font-weight: bold; font-size: 16px; transition: 0.2s;">+</button>
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">${t('minutes')}</label>
                        <div class="score-input-group" style="display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; width: 100%;">
                            <button id="s-minutes-minus" style="width: 40px; height: 36px; border: none; background: #f8fafc; cursor: pointer; border-right: 1px solid #e2e8f0; color: #64748b; font-weight: bold; font-size: 16px; transition: 0.2s;">-</button>
                            <input type="number" id="s-minutes" class="score-input" value="${testDraft.timeMinutes || 0}" min="0" max="59" style="flex: 1; height: 36px; padding: 0; border: none; text-align: center; outline: none; -moz-appearance: textfield; font-weight: 600; color: #1e293b;" />
                            <button id="s-minutes-plus" style="width: 40px; height: 36px; border: none; background: #f8fafc; cursor: pointer; border-left: 1px solid #e2e8f0; color: #64748b; font-weight: bold; font-size: 16px; transition: 0.2s;">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="s-card">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #334155; font-size: 16px; margin-bottom: 20px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                    ${t('shuffle_settings')}
                </h3>
                
                <label class="s-toggle-box" style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; margin-bottom: 10px;">
                    <div>
                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${t('shuffle_questions')}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${t('shuffle_questions_desc')}</div>
                    </div>
                    <div class="custom-toggle">
                        <input type="checkbox" id="s-shuffle-questions" ${testDraft.shuffleQuestions ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </div>
                </label>

                <label class="s-toggle-box" style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer;">
                    <div>
                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${t('shuffle_answers')}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${t('shuffle_answers_desc')}</div>
                    </div>
                    <div class="custom-toggle">
                        <input type="checkbox" id="s-shuffle-answers" ${testDraft.shuffleAnswers ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </div>
                </label>
            </div>



            <div class="s-card">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #334155; font-size: 16px; margin-bottom: 20px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    ${t('access_rights')}
                </h3>
                <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 10px; display: block;">${t('access_method')}</label>
                
                <div class="segmented-control" style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <label class="segment-btn ${testDraft.accessType === 'public' || !testDraft.accessType ? 'active' : ''}">
                        <input type="radio" name="s-access" value="public" ${testDraft.accessType === 'public' || !testDraft.accessType ? 'checked' : ''} style="display:none;" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                        ${t('public_access')}
                    </label>
                    <label class="segment-btn ${testDraft.accessType === 'password' ? 'active' : ''}">
                        <input type="radio" name="s-access" value="password" ${testDraft.accessType === 'password' ? 'checked' : ''} style="display:none;" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                        ${t('password_access')}
                    </label>
                    <label class="segment-btn ${testDraft.accessType === 'id' ? 'active' : ''}">
                        <input type="radio" name="s-access" value="id" ${testDraft.accessType === 'id' ? 'checked' : ''} style="display:none;" />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                        ${t('id_access')}
                    </label>
                </div>
                
                <div id="password-input-area" class="password-area ${testDraft.accessType === 'password' ? 'expanded' : ''}">
                    <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">${t('enter_password')}</label>
                    <input type="text" id="s-password" value="${testDraft.password || ''}" class="s-input" placeholder="${t('enter_password')}" />
                </div>

                <div id="id-input-area" class="password-area ${testDraft.accessType === 'id' ? 'expanded' : ''}">
                    <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">${t('random_id_for_test')}</label>
                    <div style="display: flex; gap: 10px; align-items: center; padding-bottom:10px;">
                        <input type="text" id="s-access-id" value="${testDraft.accessId || ''}" readonly class="s-input" style="width: 200px; text-align: center; background: #f1f5f9; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 2px; height: 42px;" />
                        <button id="s-copy-id" type="button" class="btn secondary" style="white-space: nowrap; height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 6px; margin: 0;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy" width="16" height="16"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                            ${t('copy_btn') || 'Nusxalash'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Yangi qo'shilgan: Muddat va Foydalanuvchilarni biriktirish -->
            <div class="s-card">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #334155; font-size: 16px; margin-bottom: 20px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Test muddati (qachondan - qachongacha)
                </h3>
                <div style="display: flex; gap: 15px;">
                    <div style="flex: 1;">
                        <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">Qachondan boshlanadi</label>
                        <input type="date" id="s-valid-from" value="${testDraft.validFrom ? new Date(testDraft.validFrom).toISOString().slice(0, 10) : ''}" class="s-input" />
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: block;">Qachon tugaydi</label>
                        <input type="date" id="s-valid-until" value="${testDraft.validUntil ? new Date(testDraft.validUntil).toISOString().slice(0, 10) : ''}" class="s-input" />
                    </div>
                </div>
            </div>

            <div class="user-assign-card" id="user-assign-card-container">
                <h3 style="display: flex; align-items: center; gap: 10px; color: #334155; font-size: 16px; margin-bottom: 15px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Foydalanuvchilarni biriktirish
                </h3>
                <p style="font-size: 12px; color: #64748b; margin-top: -10px; margin-bottom: 15px;">
                    Agar foydalanuvchilar biriktirilsa, "Kirish huquqlari" sozlamasi avtomatik o'chiriladi.
                </p>
                
                <div class="ua-selected-list" id="ua-selected-list" style="display: flex; flex-wrap: wrap; margin-bottom: 15px;">
                    <!-- Tanlangan userlar shu yerda bo'ladi -->
                </div>

                <input type="text" id="ua-search-input" class="ua-search-input" placeholder="Foydalanuvchi ismi yoki emailini qidiring..." />
                
                <div class="ua-users-list" id="ua-users-list">
                    <!-- Userlar ro'yxati -->
                </div>
                
                <div class="ua-pagination">
                    <button class="ua-page-btn" id="ua-prev-page">Oldingi</button>
                    <span class="ua-page-info" id="ua-page-info">1 / 1</span>
                    <button class="ua-page-btn" id="ua-next-page">Keyingi</button>
                </div>
            </div>
        </div>
    `;
};

// Savollar muharriri ekrani
const renderQuestionsEditor = () => {
    let qListHtml = testDraft.questions.map((q, idx) => {
        const dotClass = q._isSaved === false ? 'unsaved' : 'saved';
        return `
        <div class="q-list-item ${selectedQuestionIndex === idx ? 'active' : ''}" data-idx="${idx}">
            <div class="q-list-item-header">
                <strong>${idx + 1}. ${t('question')}</strong>
                <div class="q-status-dot ${dotClass}"></div>
            </div>
            <p>${(q.text || "").replace(/<[^>]+>/g, '').substring(0, 30) || t('empty_question')}</p>
        </div>
    `}).join("");

    let qFormHtml = "";
    if (testDraft.questions.length > 0 && testDraft.questions[selectedQuestionIndex]) {
        let activeQ = testDraft.questions[selectedQuestionIndex];
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        
        qFormHtml = `
            <div class="q-form">
                <div class="q-form-header">
                    <span class="q-badge">${t('question')} #${selectedQuestionIndex + 1}</span>
                    <div class="q-select-wrapper">
                        <div class="custom-select" id="custom-q-type" data-value="${activeQ.type}">
                            <div class="selected">
                                <span>${activeQ.type === 'single' ? t('single_choise') : (activeQ.type === 'multiple' ? t('multiple_choise') : t('true_false'))}</span>
                                <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            <ul class="options">
                                <li data-value="single" class="${activeQ.type === 'single' ? 'active' : ''}">${t('single_choise')}</li>
                                <li data-value="multiple" class="${activeQ.type === 'multiple' ? 'active' : ''}">${t('multiple_choise')}</li>
                                <li data-value="true-false" class="${activeQ.type === 'true-false' ? 'active' : ''}">${t('true_false')}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="q-score-wrapper" style="margin-left: 15px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; color: #64748b; font-weight: 500;">${t('points_title')}</span>
                        <div class="score-input-group" style="display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">
                            <button id="score-minus" style="width: 32px; height: 32px; border: none; background: #f8fafc; cursor: pointer; border-right: 1px solid #e2e8f0; color: #64748b; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: 0.2s;">-</button>
                            <input type="number" id="q-score" class="score-input" value="${activeQ.score || 1}" min="1" style="width: 45px; height: 32px; padding: 0; border: none; text-align: center; outline: none; -moz-appearance: textfield; font-weight: 600; color: #1e293b;" />
                            <button id="score-plus" style="width: 32px; height: 32px; border: none; background: #f8fafc; cursor: pointer; border-left: 1px solid #e2e8f0; color: #64748b; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: 0.2s;">+</button>
                        </div>
                    </div>
                    <div class="q-header-actions" style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                        <button id="save-q-btn" class="btn success" style="padding: 6px 12px; font-size: 13px; border-radius: 6px;">${t('save')}</button>
                        <button id="del-q-btn" class="icon-btn danger">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                </div>
                
                <label class="q-label">${t('question_text')}</label>
                <div class="q-editor-wrapper" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                    <div id="q-text-editor" style="min-height: 150px; font-family: inherit; font-size: 15px;"></div>
                </div>

                <label class="q-label">${t('answer_variants')}</label>
                <div class="q-answers-list">
                    ${activeQ.answers.map((a, i) => `
                        <div class="ans-row-wrapper">
                            <div class="ans-letter">${letters[i] || '-'}</div>
                            <div class="ans-row ${a.isCorrect ? 'correct' : ''}">
                                <input type="text" class="ans-text" data-idx="${i}" value="${a.text}" placeholder="${t('enter_variant')}" ${activeQ.type === 'true-false' ? 'readonly' : ''} />
                                ${a.isCorrect ? `<span class="ans-correct-badge">${t('correct_ans')}</span>` : ''}
                                <input type="${activeQ.type === 'multiple' ? 'checkbox' : 'radio'}" name="ans-correct" class="ans-radio" data-idx="${i}" ${a.isCorrect ? 'checked' : ''} />
                                ${activeQ.type !== 'true-false' ? `<button class="del-ans" data-idx="${i}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                </button>` : ''}
                            </div>
                        </div>
                    `).join("")}
                </div>
                ${activeQ.type !== 'true-false' ? `<button id="add-ans-btn" class="add-variant-btn">${t('add_ansver_btn')}</button>` : ''}
            </div>
        `;
    } else {
        qFormHtml = `<div class="content-placeholder">${t('select_q_edit')}</div>`;
    }

    return `
        <div class="questions-editor-layout">
            <div class="qe-sidebar">
                <span class="qe-sidebar-title">${t('questions_list')}</span>
                <div class="qe-list">${qListHtml}</div>
                <button id="add-new-q-btn" class="add-new-q-btn">${t('add_new_q')}</button>
            </div>
            <div class="qe-main">
                ${qFormHtml}
            </div>
        </div>
    `;
};

// ─── TEST TAKING UI FUNCTIONS ───

const renderTestTakingUI = () => {
    if (!activeTestSession) return '';
    const { test, answers, currentQuestionIndex, timeRemaining } = activeTestSession;
    const currentQ = test.questions[currentQuestionIndex];
    if (!currentQ) return `<div class="content-placeholder">${t('error_q_not_found')}</div>`;
    
    // Calculate answered count
    const answeredCount = answers.filter(a => a !== null && a !== undefined && (Array.isArray(a) ? a.length > 0 : true)).length;

    // Time format
    let timeHtml = '';
    if (test.hasTimeLimit) {
        const h = Math.floor(timeRemaining / 3600).toString().padStart(2, '0');
        const m = Math.floor((timeRemaining % 3600) / 60).toString().padStart(2, '0');
        const s = (timeRemaining % 60).toString().padStart(2, '0');
        timeHtml = `
            <div class="tt-box tt-timer-box">
                <span class="tt-timer-label">${t('time_left')}</span>
                <div id="tt-timer-val-box" class="tt-timer-value ${timeRemaining < 300 ? 'danger' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span id="tt-timer-text">${h}:${m}:${s}</span>
                </div>
            </div>
        `;
    }

    // Grid html
    const gridHtml = test.questions.map((q, i) => {
        const isAnswered = answers[i] !== null && answers[i] !== undefined && (Array.isArray(answers[i]) ? answers[i].length > 0 : true);
        const isCurrent = i === currentQuestionIndex;
        let classes = 'tt-grid-btn';
        if (isAnswered) classes += ' answered';
        if (isCurrent) classes += ' current';
        
        return `<button class="${classes}" data-index="${i}">${i + 1}</button>`;
    }).join("");

    // Answers html
    const isMultiple = currentQ.type === 'multiple';
    const currentAns = answers[currentQuestionIndex];
    
    const optionsHtml = currentQ.answers.map((ans, i) => {
        let isChecked = false;
        if (isMultiple) {
            isChecked = Array.isArray(currentAns) && currentAns.includes(i);
        } else {
            isChecked = currentAns === i;
        }

        return `
            <label class="tt-option ${isMultiple ? 'multiple-opt' : ''} ${isChecked ? 'selected' : ''}">
                <input type="${isMultiple ? 'checkbox' : 'radio'}" name="tt-q-opt" value="${i}" ${isChecked ? 'checked' : ''} style="display:none;" />
                <div class="tt-opt-box"></div>
                <div class="tt-opt-text">${ans.text}</div>
            </label>
        `;
    }).join("");

    return `
        <div class="test-taking-wrapper">
            <div class="tt-main">
                <div class="tt-header">
                    <button class="icon-btn" id="tt-leave-btn" title="Chiqish" style="background: #f1f5f9; padding: 8px; border-radius: 8px;">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left" width="20" height="20"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    </button>
                    <h1>${test.title}</h1>
                </div>
                
                <div class="tt-question-container">
                    <div class="tt-q-meta">
                        <h3>${currentQuestionIndex + 1}. ${t('choose_correct_ans')}</h3>
                        <span class="tt-q-type-badge">${isMultiple ? t('multiple_choise') : (currentQ.type === 'true-false' ? t('true_false') : t('single_choise'))}</span>
                    </div>
                    <div class="tt-q-text">
                        ${currentQ.text}
                    </div>
                    
                    <div class="tt-options-list">
                        ${optionsHtml}
                    </div>
                </div>
                
                <div class="tt-actions">
                    <button class="btn secondary" id="tt-prev-btn" ${currentQuestionIndex === 0 ? 'disabled' : ''}>${t('prev')}</button>
                    ${currentQuestionIndex === test.questions.length - 1 
                        ? `<button class="btn success" id="tt-finish-btn">${t('finish')}</button>`
                        : `<button class="btn primary" id="tt-next-btn">${t('next')}</button>`
                    }
                </div>
            </div>
            
            <div class="tt-sidebar">
                ${timeHtml}
                
                <div class="tt-box tt-grid-box">
                    <div class="tt-grid-header">
                        <span>${t('all_tests')}</span>
                        <span style="color: #64748b;">${answeredCount}/${test.questions.length}</span>
                    </div>
                    <div class="tt-grid">
                        ${gridHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const attachTestTakingEvents = () => {
    if (!activeTestSession) return;

    // Leave button
    const leaveBtn = document.getElementById("tt-leave-btn");
    if (leaveBtn) {
        leaveBtn.onclick = async () => {
            const confirmed = await showConfirm(t('leave_test_confirm'), { type: 'leave' });
            if (confirmed) {
                if (activeTestSession.intervalId) clearInterval(activeTestSession.intervalId);
                activeTestSession = null;
                currentTestMenu = "questions"; // return to test bank
                updateContentArea();
            }
        };
    }

    // Grid buttons
    document.querySelectorAll(".tt-grid-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-index"));
            activeTestSession.currentQuestionIndex = idx;
            updateContentArea();
        };
    });

    // Options
    document.querySelectorAll('input[name="tt-q-opt"]').forEach(input => {
        input.onchange = (e) => {
            const val = parseInt(e.target.value);
            const isMultiple = activeTestSession.test.questions[activeTestSession.currentQuestionIndex].type === 'multiple';
            
            if (isMultiple) {
                let currentAns = activeTestSession.answers[activeTestSession.currentQuestionIndex];
                if (!Array.isArray(currentAns)) currentAns = [];
                
                if (e.target.checked) {
                    if (!currentAns.includes(val)) currentAns.push(val);
                } else {
                    currentAns = currentAns.filter(v => v !== val);
                }
                activeTestSession.answers[activeTestSession.currentQuestionIndex] = currentAns;
            } else {
                activeTestSession.answers[activeTestSession.currentQuestionIndex] = val;
            }
            
            updateContentArea();
        };
    });

    // Prev / Next / Finish
    const prevBtn = document.getElementById("tt-prev-btn");
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (activeTestSession.currentQuestionIndex > 0) {
                activeTestSession.currentQuestionIndex--;
                updateContentArea();
            }
        };
    }

    const nextBtn = document.getElementById("tt-next-btn");
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (activeTestSession.currentQuestionIndex < activeTestSession.test.questions.length - 1) {
                activeTestSession.currentQuestionIndex++;
                updateContentArea();
            }
        };
    }

    const finishBtn = document.getElementById("tt-finish-btn");
    if (finishBtn) {
        finishBtn.onclick = () => {
            finishTest();
        };
    }
};

const finishTest = () => {
    if (activeTestSession.intervalId) clearInterval(activeTestSession.intervalId);
    
    const test = activeTestSession.test;
    const answers = activeTestSession.answers;
    
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    
    const timeSpentMs = Date.now() - activeTestSession.startTime;
    const timeSpentSec = Math.floor(timeSpentMs / 1000);
    const m = Math.floor(timeSpentSec / 60);
    const s = timeSpentSec % 60;
    const timeSpentFormatted = `${m}:${s.toString().padStart(2, '0')} min`;

    const questionsData = test.questions.map((q, i) => {
        const qScore = q.score || 1;
        maxScore += qScore;
        const userAns = answers[i];
        
        const isMultiple = q.type === 'multiple';
        
        let isCorrect = false;
        let correctIndexes = [];
        q.answers.forEach((a, idx) => { if (a.isCorrect) correctIndexes.push(idx); });
        
        if (isMultiple) {
            const uAns = Array.isArray(userAns) ? userAns : [];
            if (uAns.length === correctIndexes.length && uAns.every(v => correctIndexes.includes(v))) {
                isCorrect = true;
            }
        } else {
            if (userAns === correctIndexes[0]) {
                isCorrect = true;
            }
        }
        
        if (isCorrect) {
            totalScore += qScore;
            correctCount++;
        }
        
        return {
            question: q,
            userAns,
            correctIndexes,
            isCorrect
        };
    });

    const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    let grade = "Qoniqarsiz";
    if (percent >= 86) grade = "A'lo";
    else if (percent >= 70) grade = "Yaxshi";
    else if (percent >= 56) grade = "Qoniqarli";

    activeTestResult = {
        test,
        totalScore,
        maxScore,
        correctCount,
        incorrectCount: test.questions.length - correctCount,
        percent,
        grade,
        timeSpentFormatted,
        questionsData,
        submittedAt: new Date()
    };
    
    // API orqali DB ga saqlash
    saveTestResultAPI({
        testId: test._id,
        testSnapshot: {
            title: test.title,
            description: test.description || "",
            questionCount: test.questions.length,
            hasTimeLimit: test.hasTimeLimit,
            timeHours: test.timeHours,
            timeMinutes: test.timeMinutes
        },
        score: totalScore,
        maxScore,
        percent,
        correctCount,
        timeSpentFormatted,
        grade,
        questionsData
    });
    
    // Vaqtinchalik UI uchun saqlab qo'yamiz (API dan ma'lumot kelgunicha)
    completedTests[test._id] = activeTestResult;
    
    activeTestSession = null;
    currentTestMenu = "test-results";
    updateContentArea();
};

const startTest = (test) => {
    let timeRemaining = null;
    if (test.hasTimeLimit) {
        timeRemaining = test.timeHours * 3600 + test.timeMinutes * 60;
    }
    
    let testCopy = JSON.parse(JSON.stringify(test));
    
    if (testCopy.shuffleAnswers) {
        testCopy.questions.forEach(q => {
            q.answers = q.answers.map(value => ({ value, sort: Math.random() }))
                                 .sort((a, b) => a.sort - b.sort)
                                 .map(({ value }) => value);
        });
    }

    if (testCopy.shuffleQuestions) {
        testCopy.questions = testCopy.questions.map(value => ({ value, sort: Math.random() }))
                                 .sort((a, b) => a.sort - b.sort)
                                 .map(({ value }) => value);
    }
    
    activeTestSession = {
        test: testCopy,
        answers: new Array(testCopy.questions.length).fill(null),
        currentQuestionIndex: 0,
        startTime: Date.now(),
        timeRemaining: timeRemaining,
        intervalId: null
    };

    if (test.hasTimeLimit) {
        activeTestSession.intervalId = setInterval(() => {
            if (activeTestSession.timeRemaining > 0) {
                activeTestSession.timeRemaining--;
                
                const h = Math.floor(activeTestSession.timeRemaining / 3600).toString().padStart(2, '0');
                const m = Math.floor((activeTestSession.timeRemaining % 3600) / 60).toString().padStart(2, '0');
                const s = (activeTestSession.timeRemaining % 60).toString().padStart(2, '0');
                const timerSpan = document.getElementById("tt-timer-text");
                if (timerSpan) timerSpan.innerText = `${h}:${m}:${s}`;
                
                const timerValueBox = document.getElementById("tt-timer-val-box");
                if (timerValueBox && activeTestSession.timeRemaining < 300) {
                    timerValueBox.classList.add("danger");
                }
            } else {
                showAlert("Vaqt tugadi!", "warning");
                finishTest(); // Time's up
            }
        }, 1000);
    }
    
    currentTestMenu = "take-test";
    updateContentArea();
};

const renderTestResultsUI = () => {
    if (!activeTestResult) return '';
    const { test, testSnapshot, score, totalScore, maxScore, correctCount, incorrectCount, percent, grade, timeSpentFormatted, questionsData, submittedAt } = activeTestResult;

    const parsedDate = typeof submittedAt === 'string' ? new Date(submittedAt) : submittedAt;
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const year = parsedDate.getFullYear();
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const mins = String(parsedDate.getMinutes()).padStart(2, '0');
    const formattedDate = `${day}.${month}.${year} ${hours}:${mins}`;

    const title = test ? test.title : (testSnapshot ? testSnapshot.title : "Nomsiz test");
    const displayScore = score !== undefined ? score : (totalScore || 0);
    const displayMaxScore = maxScore || 0;
    
    const actualIncorrectCount = incorrectCount !== undefined ? incorrectCount : ((testSnapshot?.questionCount || questionsData?.length || 0) - (correctCount || 0));

    let displayGrade = t('grade_poor') || "Qoniqarsiz";
    if (percent >= 86) displayGrade = t('grade_excellent') || "A'lo";
    else if (percent >= 70) displayGrade = t('grade_good') || "Yaxshi";
    else if (percent >= 56) displayGrade = t('grade_satisfactory') || "Qoniqarli";

    let formattedTime = timeSpentFormatted || "0s";
    if (formattedTime.includes(" min")) {
        let parts = formattedTime.replace(" min", "").split(":");
        if (parts.length === 2) {
            let m = parseInt(parts[0]);
            let s = parseInt(parts[1]);
            formattedTime = m > 0 ? `${m}m ${s}s` : `${s}s`;
        }
    }

    const detailsHtml = (questionsData || []).map((data, i) => {
        const q = data.question;
        const isMultiple = q.type === 'multiple';
        const isCorrect = data.isCorrect;
        const icon = isCorrect 
            ? `<svg viewBox="0 0 24 24" fill="#10b981" width="20" height="20"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1.833-6.26l-3.535-3.536 1.414-1.414 2.121 2.122 4.95-4.95 1.415 1.414-6.365 6.364z"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="#ef4444" width="20" height="20"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm3.536-12.121l-1.415-1.415L12 10.586 9.879 8.464 8.464 9.88l2.122 2.121-2.122 2.121 1.415 1.415L12 13.414l2.121 2.122 1.415-1.415L13.414 12l2.122-2.121z"/></svg>`;

        let userAnsHtml = '';
        let correctAnsHtml = '';

        if (isCorrect) {
            if (isMultiple) {
                userAnsHtml = (data.userAns || []).map(idx => `<div class="res-ans-box correct"><div class="res-ans-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg></div><div class="res-ans-text">${q.answers[idx]?.text || '-'}</div><span class="res-ans-badge">${t('your_answer')}</span></div>`).join('');
            } else {
                const aIdx = data.userAns;
                userAnsHtml = `<div class="res-ans-box correct"><div class="res-ans-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg></div><div class="res-ans-text">${q.answers[aIdx]?.text || '-'}</div><span class="res-ans-badge">${t('your_answer')}</span></div>`;
            }
        } else {
            if (data.userAns !== null && data.userAns !== undefined && (!isMultiple || data.userAns.length > 0)) {
                if (isMultiple) {
                    userAnsHtml = (data.userAns || []).map(idx => `<div class="res-ans-box incorrect"><div class="res-ans-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" width="16" height="16"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div><div class="res-ans-text">${q.answers[idx]?.text || '-'}</div><span class="res-ans-badge">${t('your_answer')}</span></div>`).join('');
                } else {
                    const aIdx = data.userAns;
                    userAnsHtml = `<div class="res-ans-box incorrect"><div class="res-ans-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" width="16" height="16"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div><div class="res-ans-text">${q.answers[aIdx]?.text || '-'}</div><span class="res-ans-badge">${t('your_answer')}</span></div>`;
                }
            } else {
                userAnsHtml = `<div class="res-ans-box missed"><div class="res-ans-text">${t('you_did_not_answer')}</div></div>`;
            }

            if (isMultiple) {
                correctAnsHtml = data.correctIndexes.map(idx => `<div class="res-ans-box true-ans"><div class="res-ans-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg></div><div class="res-ans-text">${q.answers[idx]?.text || '-'}</div><span class="res-ans-badge">${t('correct_answer_badge')}</span></div>`).join('');
            } else {
                const aIdx = data.correctIndexes[0];
                if (aIdx !== undefined) {
                    correctAnsHtml = `<div class="res-ans-box true-ans"><div class="res-ans-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg></div><div class="res-ans-text">${q.answers[aIdx]?.text || '-'}</div><span class="res-ans-badge">${t('correct_answer_badge')}</span></div>`;
                }
            }
        }

        return `
            <div class="res-q-card">
                <div class="res-q-header">
                    <div class="res-q-status-icon">${icon}</div>
                    <div class="res-q-badge">${i + 1}-${t('question').toLowerCase()}</div>
                    <div class="res-q-category">${t('category_general')}</div>
                </div>
                <div class="res-q-text">${q.text}</div>
                <div class="res-q-answers">
                    ${userAnsHtml}
                    ${correctAnsHtml}
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="test-results-wrapper">
            <div class="tr-header">
                <div class="tr-title-area">
                    <h2>${title}</h2>
                    <p>${t('submitted_time')} ${formattedDate}</p>
                </div>
                <div class="tr-actions">
                    <button class="btn" id="tr-home-btn" style="border: 1px solid #cbd5e1; background: white; color: #475569;">${t('back_home')}</button>
                    <button class="btn primary" id="tr-retake-btn" style="display: flex; align-items: center; gap: 8px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw" width="16" height="16"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        ${t('retake')}
                    </button>
                </div>
            </div>

            <div class="tr-dashboard">
                <div class="tr-main-card">
                    <div class="tr-mc-content">
                        <h3>${t('general_result')}</h3>
                        <p>${percent >= 56 ? t('test_success_msg') : t('test_completed_msg')} ${t('test_avg_msg')} ${percent}%.</p>
                        <div class="tr-stats-row">
                            <div class="tr-stat-block">
                                <span>${t('total_score_cap')}</span>
                                <strong><span class="text-blue">${displayScore}</span> / ${displayMaxScore}</strong>
                            </div>
                            <div class="tr-stat-block">
                                <span>${t('time_spent_cap')}</span>
                                <strong>${formattedTime}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="tr-mc-chart-area">
                        <div class="circular-chart" style="background: conic-gradient(#1d4ed8 ${percent}%, #e2e8f0 0);">
                            <div class="circular-chart-inner">
                                <span>${percent}%</span>
                            </div>
                        </div>
                        <div class="tr-grade-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                            ${displayGrade}
                        </div>
                    </div>
                </div>

                <div class="tr-side-cards">
                    <div class="tr-side-card correct-card">
                        <div class="tr-sc-icon correct-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div class="tr-sc-info">
                            <strong>${correctCount}</strong>
                            <span>${t('correct_answers_count')}</span>
                        </div>
                    </div>
                    <div class="tr-side-card incorrect-card">
                        <div class="tr-sc-icon incorrect-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </div>
                        <div class="tr-sc-info">
                            <strong>${actualIncorrectCount}</strong>
                            <span>${t('wrong_answers_count')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tr-details-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                ${t('detailed_analysis')}
            </div>

            <div class="tr-details-list">
                ${detailsHtml}
            </div>
        </div>
    `;
};

const attachTestResultsEvents = () => {
    const homeBtn = document.getElementById("tr-home-btn");
    if (homeBtn) {
        homeBtn.onclick = () => {
            activeTestResult = null;
            currentTestMenu = "questions";
            updateContentArea();
        };
    }
    
    const retakeBtn = document.getElementById("tr-retake-btn");
    if (retakeBtn) {
        retakeBtn.onclick = () => {
            const test = activeTestResult.test;
            activeTestResult = null;
            startTest(test);
        };
    }
};

const renderCreatorTestResults = () => {
    let listHtml = '';
    let topHtml = '';

    if (!creatorTestResults || creatorTestResults.length === 0) {
        listHtml = `
            <div class="empty-state" style="grid-column: 1 / -1;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-open"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
               <h3>${t('no_results_yet')}</h3>
            </div>`;
    } else {
        // Leaderboard (Top 3)
        const top3 = creatorTestResults.slice(0, 3);
        const medals = ['#fbbf24', '#94a3b8', '#cd7f32']; // Gold, Silver, Bronze
        topHtml = top3.map((res, index) => `
            <div class="leaderboard-item">
                <div class="lb-rank" style="background: ${medals[index] || '#e2e8f0'}; color: ${index < 3 ? 'white' : '#475569'};">${index + 1}</div>
                ${avatarHtml(res.userId, 48, 'lb-avatar')}
                <div class="lb-info">
                    <h4>${res.userId?.username || "Noma'lum foydalanuvchi"}</h4>
                    <span>${res.score} ${t('score')} • ${res.percent}%</span>
                </div>
            </div>
        `).join("");

        // Barcha natijalar jadvali
        listHtml = creatorTestResults.map((res, index) => {
            const dateStr = new Date(res.submittedAt).toLocaleString();
            
            let formattedTime = res.timeSpentFormatted || "0s";
            if (formattedTime.includes(" min")) {
                let parts = formattedTime.replace(" min", "").split(":");
                if (parts.length === 2) {
                    let m = parseInt(parts[0]);
                    let s = parseInt(parts[1]);
                    formattedTime = m > 0 ? `${m}m ${s}s` : `${s}s`;
                }
            }

            return `
                <div class="result-list-item">
                    <div class="r-idx">${index + 1}</div>
                    ${avatarHtml(res.userId, 40, 'r-avatar')}
                    <div class="r-user-info">
                        <h4>${res.userId?.username || "Noma'lum"}</h4>
                        <span class="r-date">${dateStr}</span>
                    </div>
                    <div class="r-stats" style="align-items: center; gap: 15px;">
                        <div class="r-stat-box" style="align-items: center;">
                            <span class="r-label">Foiz</span>
                            <span class="r-val ${res.percent >= 80 ? 'text-green' : res.percent >= 56 ? 'text-blue' : 'text-red'}">${res.percent}%</span>
                        </div>
                        <div class="r-stat-divider" style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                        <div class="r-stat-box" style="align-items: center;">
                            <span class="r-label">Ball</span>
                            <span class="r-val">${res.score}</span>
                        </div>
                        <div class="r-stat-divider" style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                        <div class="r-stat-box" style="align-items: center;">
                            <span class="r-label" style="color: #10b981;">To'g'ri</span>
                            <span class="r-val">${res.correctCount || 0}</span>
                        </div>
                        <div class="r-stat-divider" style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                        <div class="r-stat-box" style="align-items: center;">
                            <span class="r-label" style="color: #ef4444;">Xato</span>
                            <span class="r-val">${(res.testSnapshot?.questionCount || 0) - (res.correctCount || 0)}</span>
                        </div>
                        <div class="r-stat-divider" style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                        <div class="r-stat-box" style="align-items: center;">
                            <span class="r-label">Vaqt</span>
                            <span class="r-val">${formattedTime}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    return `
        <div class="creator-results-wrapper">
            <div class="cr-header">
                <button class="btn secondary" id="cr-back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m15 18-6-6 6-6"/></svg>
                    ${t('back_dash')}
                </button>
                <h2>${t('results_leaderboard')}</h2>
            </div>
            <div class="creator-results-layout">
                <div class="results-table-container">
                    <h3>Barcha natijalar</h3>
                    <div class="results-list">
                        ${listHtml}
                    </div>
                </div>
                <div class="leaderboard-panel">
                    <h3>Top natijalar</h3>
                    <div class="lb-list">
                        ${topHtml || '<p style="text-align:center; color:#94a3b8; margin-top:20px;">Top reyting hali mavjud emas</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const attachCreatorTestResultsEvents = () => {
    const backBtn = document.getElementById("cr-back-btn");
    if (backBtn) {
        backBtn.onclick = () => {
            currentTestMenu = "questions";
            updateContentArea();
        };
    }
};

// ─── END TEST TAKING UI FUNCTIONS ───

const updateContentArea = async () => {
    const contentArea = document.querySelector('.test-content');
    if (!contentArea) return;

    // Scroll pozitsiyalarini saqlab qolish (sakrashni oldini olish uchun)
    const scrolls = {
        main: contentArea.scrollTop,
        qeMain: document.querySelector('.qe-main') ? document.querySelector('.qe-main').scrollTop : 0,
        qeList: document.querySelector('.qe-list') ? document.querySelector('.qe-list').scrollTop : 0,
        tcBody: document.querySelector('.tc-body') ? document.querySelector('.tc-body').scrollTop : 0,
        qAnswers: document.querySelector('.q-answers-list') ? document.querySelector('.q-answers-list').scrollTop : 0
    };

    if (currentTestMenu === "main") {
        contentArea.innerHTML = renderMainPanel();
        testDraft = null;
    } else if (currentTestMenu === "results") {
        contentArea.innerHTML = renderResultsPanel();
        testDraft = null;
    } else if (currentTestMenu === "take-test") {
        contentArea.innerHTML = renderTestTakingUI();
        attachTestTakingEvents();
    } else if (currentTestMenu === "test-results") {
        contentArea.innerHTML = renderTestResultsUI();
        attachTestResultsEvents();
    } else if (currentTestMenu === "creator-test-results") {
        contentArea.innerHTML = renderCreatorTestResults();
        attachCreatorTestResultsEvents();
    } else if (currentTestMenu === "questions") {
        if (testDraft) {
            contentArea.innerHTML = renderTestCreator();
            attachCreatorEvents();

            // Scroll pozitsiyalarini joyiga qaytarish
            contentArea.scrollTop = scrolls.main;
            const newQeMain = document.querySelector('.qe-main');
            if (newQeMain) newQeMain.scrollTop = scrolls.qeMain;
            const newQeList = document.querySelector('.qe-list');
            if (newQeList) newQeList.scrollTop = scrolls.qeList;
            const newTcBody = document.querySelector('.tc-body');
            if (newTcBody) newTcBody.scrollTop = scrolls.tcBody;
            const newQAnswers = document.querySelector('.q-answers-list');
            if (newQAnswers) newQAnswers.scrollTop = scrolls.qAnswers;

        } else {
            if (!currentUser) currentUser = await fetchCurrentUser();
            await fetchTests();
            contentArea.innerHTML = renderQuestionsBank();
            attachBankEvents();
        }
    }
};

const attachBankEvents = () => {
    const createBtn = document.getElementById("create-new-test-btn");
    if (createBtn) {
        createBtn.onclick = async () => {
            currentTestId = null;
            const tempDraft = {
                title: "Nomsiz test", description: "",
                hasTimeLimit: false, timeHours: 0, timeMinutes: 0,
                scoringType: "standard", accessType: "public", password: "",
                accessId: generateRandomID(),
                shuffleQuestions: false, status: "draft", questions: []
            };
            
            const saved = await saveTestAPI(tempDraft, true);
            if (saved) {
                currentTestId = saved._id;
                testDraft = saved;
                if(!testDraft.questions) testDraft.questions = [];
                currentTab = "settings"; 
                updateContentArea();
            }
        };
    }

    document.querySelectorAll(".edit-t-btn").forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute("data-id");
            if (!id) return; // For the "Ko'rish" button which doesn't have data-id
            currentTestId = id;
            testDraft = JSON.parse(JSON.stringify(allTests.find(t => t._id === id)));
            currentTab = "questions";
            selectedQuestionIndex = 0;
            updateContentArea();
        };
    });

    document.querySelectorAll(".view-creator-res-btn").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.getAttribute("data-id");
            if (!id) return;
            currentTestId = id;
            try {
                const res = await fetch(`${API_URL}/api/tests/${id}/results`, { headers: getAuthHeaders(), credentials: "include" });
                if (res.ok) {
                    creatorTestResults = await res.json();
                    currentTestMenu = "creator-test-results";
                    updateContentArea();
                } else {
                    showAlert("Natijalarni yuklashda xatolik", "error");
                }
            } catch (err) {
                console.error(err);
                showAlert("Natijalarni yuklashda xatolik", "error");
            }
        };
    });

    document.querySelectorAll(".del-t-btn").forEach(btn => {
        btn.onclick = async () => {
            const confirmed = await showConfirm(t('delete_test_confirm'));
            if (confirmed) {
                const card = btn.closest('.test-card');
                if (card) {
                    card.classList.add('deleting');
                    await new Promise(r => setTimeout(r, 400));
                }
                const id = btn.getAttribute("data-id");
                const success = await deleteTestAPI(id);
                if (success) {
                    await fetchTests();
                    if (document.startViewTransition) {
                        document.startViewTransition(() => updateContentArea());
                    } else {
                        updateContentArea();
                    }
                } else {
                    if (card) card.classList.remove('deleting');
                }
            }
        };
    });

    document.querySelectorAll(".take-t-btn").forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute("data-id");
            if (!id) return;
            const test = allTests.find(t => t._id === id);
            if (!test) return;

            if (test.accessType === 'password') {
                const modal = document.getElementById("password-modal");
                const submitBtn = document.getElementById("submit-password-btn");
                const passInput = document.getElementById("test-password-input");
                const errText = document.getElementById("password-error");
                
                if (modal && submitBtn && passInput && errText) {
                    passInput.value = "";
                    errText.style.display = "none";
                    modal.classList.add("active");
                    
                    submitBtn.onclick = () => {
                        if (passInput.value === test.password) {
                            modal.classList.remove("active");
                            startTest(test);
                        } else {
                            errText.style.display = "block";
                        }
                    };
                }
            } else {
                startTest(test);
            }
        };
    });

    document.querySelectorAll(".retake-t-btn").forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute("data-id");
            if (!id) return;
            const test = allTests.find(t => t._id === id);
            if (!test) return;
            startTest(test);
        };
    });

    document.querySelectorAll(".view-res-btn").forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute("data-id");
            if (!id || !completedTests[id]) return;
            activeTestResult = completedTests[id];
            currentTestMenu = "test-results";
            updateContentArea();
        };
    });

    // Bank tabs event listener
    document.querySelectorAll('input[name="bank-tab"]').forEach(radio => {
        radio.onchange = (e) => {
            currentBankTab = e.target.value;
            updateContentArea(); // Re-render to show filtered tests
        };
    });

    const actIdBtn = document.getElementById("activate-id-test-btn");
    if (actIdBtn) {
        actIdBtn.onclick = () => {
            const modal = document.getElementById("id-activation-modal");
            const submitBtn = document.getElementById("submit-id-btn");
            const idInput = document.getElementById("test-id-input");
            const errText = document.getElementById("id-error");

            if (modal && submitBtn && idInput && errText) {
                idInput.value = "";
                errText.style.display = "none";
                modal.classList.add("active");

                submitBtn.onclick = () => {
                    const val = idInput.value.trim();
                    if (val.length !== 6) {
                        errText.textContent = "ID 6 xonali bo'lishi kerak.";
                        errText.style.display = "block";
                        return;
                    }
                    const foundTest = allTests.find(t => t.accessType === 'id' && t.accessId === val);
                    if (!foundTest) {
                        errText.textContent = "Bunday ID ga ega test topilmadi.";
                        errText.style.display = "block";
                        return;
                    }
                    if (currentUser && (foundTest.createdBy === currentUser.userId || foundTest.createdBy === currentUser._id)) {
                        errText.textContent = "Siz o'zingiz yaratgan testni aktivlashtira olmaysiz.";
                        errText.style.display = "block";
                        return;
                    }
                    if (!activatedTestIds.includes(foundTest._id)) {
                        activatedTestIds.push(foundTest._id);
                        saveActivatedTests();
                    }
                    modal.classList.remove("active");
                    updateContentArea();
                };
            }
        };
    }

    document.querySelectorAll(".copy-t-id-btn").forEach(btn => {
        btn.onclick = () => {
            const textToCopy = btn.getAttribute("data-id");
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const icon = btn.innerHTML;
                    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>`;
                    setTimeout(() => { btn.innerHTML = icon; }, 2000);
                });
            }
        };
    });
};

const attachCreatorEvents = () => {
    // TABS
    document.querySelectorAll(".t-tab").forEach(tab => {
        tab.onclick = () => {
            saveCurrentDraftState();
            currentTab = tab.getAttribute("data-tab");
            updateContentArea();
        };
    });

    // SETTINGS EVENTS
    if (currentTab === "settings") {
        const timeLimitToggle = document.getElementById("s-timelimit");
        if (timeLimitToggle) {
            timeLimitToggle.onchange = (e) => {
                testDraft.hasTimeLimit = e.target.checked;
                const timeInputs = document.querySelector(".time-inputs");
                if (timeInputs) {
                    if (e.target.checked) timeInputs.classList.add("expanded");
                    else timeInputs.classList.remove("expanded");
                }
            };
        }

        const shuffleQ = document.getElementById("s-shuffle-questions");
        if (shuffleQ) {
            shuffleQ.onchange = (e) => testDraft.shuffleQuestions = e.target.checked;
        }

        const shuffleA = document.getElementById("s-shuffle-answers");
        if (shuffleA) {
            shuffleA.onchange = (e) => testDraft.shuffleAnswers = e.target.checked;
        }

        const accessRadios = document.querySelectorAll('input[name="s-access"]');
        accessRadios.forEach(radio => {
            radio.onchange = (e) => {
                testDraft.accessType = e.target.value;
                const passArea = document.getElementById("password-input-area");
                const idArea = document.getElementById("id-input-area");
                const idInput = document.getElementById("s-access-id");

                if (passArea) {
                    if (e.target.value === 'password') passArea.classList.add("expanded");
                    else passArea.classList.remove("expanded");
                }
                if (idArea) {
                    if (e.target.value === 'id') {
                        idArea.classList.add("expanded");
                        if (!testDraft.accessId) {
                            testDraft.accessId = generateRandomID();
                            if (idInput) idInput.value = testDraft.accessId;
                        }
                    } else {
                        idArea.classList.remove("expanded");
                    }
                }
                
                document.querySelectorAll('.segment-btn').forEach(btn => {
                    const input = btn.querySelector('input');
                    if (input && input.value === e.target.value) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            };
        });

        const copyIdBtn = document.getElementById("s-copy-id");
        if (copyIdBtn) {
            copyIdBtn.onclick = () => {
                const idInput = document.getElementById("s-access-id");
                if (idInput && idInput.value) {
                    navigator.clipboard.writeText(idInput.value).then(() => {
                        const originalHTML = copyIdBtn.innerHTML;
                        copyIdBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Nusxalandi`;
                        setTimeout(() => { copyIdBtn.innerHTML = originalHTML; }, 2000);
                    });
                }
            };
        }

        const hInp = document.getElementById("s-hours");
        const hMin = document.getElementById("s-hours-minus");
        const hPlu = document.getElementById("s-hours-plus");

        if (hMin) {
            hMin.onclick = () => {
                let v = parseInt(hInp.value) || 0;
                if (v > 0) {
                    hInp.value = v - 1;
                    testDraft.timeHours = v - 1;
                }
            };
        }
        if (hPlu) {
            hPlu.onclick = () => {
                let v = parseInt(hInp.value) || 0;
                hInp.value = v + 1;
                testDraft.timeHours = v + 1;
            };
        }
        if (hInp) {
            hInp.onchange = (e) => testDraft.timeHours = parseInt(e.target.value) || 0;
        }

        const mInp = document.getElementById("s-minutes");
        const mMin = document.getElementById("s-minutes-minus");
        const mPlu = document.getElementById("s-minutes-plus");

        if (mMin) {
            mMin.onclick = () => {
                let v = parseInt(mInp.value) || 0;
                if (v > 0) {
                    mInp.value = v - 1;
                    testDraft.timeMinutes = v - 1;
                }
            };
        }
        if (mPlu) {
            mPlu.onclick = () => {
                let v = parseInt(mInp.value) || 0;
                if (v < 59) {
                    mInp.value = v + 1;
                    testDraft.timeMinutes = v + 1;
                }
            };
        }
        if (mInp) {
            mInp.onchange = (e) => testDraft.timeMinutes = parseInt(e.target.value) || 0;
        }

        // VALID FROM / UNTIL EVENTS
        const validFromInp = document.getElementById("s-valid-from");
        const validUntilInp = document.getElementById("s-valid-until");
        if (validFromInp) validFromInp.onchange = (e) => testDraft.validFrom = e.target.value;
        if (validUntilInp) validUntilInp.onchange = (e) => testDraft.validUntil = e.target.value;

        // USER ASSIGNMENT LOGIC
        if (!testDraft.assignedUsers) testDraft.assignedUsers = [];
        let assignPage = 1;
        let assignTotalPages = 1;
        
        const renderAssignedUsers = () => {
            const list = document.getElementById("ua-selected-list");
            if (!list) return;
            
            list.innerHTML = testDraft.assignedUsers.map(u => `
                <div class="ua-selected-item" style="display: inline-flex; align-items: center; background: #eff6ff; border: 1px solid #3b82f6; color: #1e3a8a; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; margin: 4px;">
                    <span>${u.username || u.email}</span>
                    <button type="button" class="ua-remove-btn" data-id="${u._id}" style="background: none; border: none; color: #3b82f6; margin-left: 6px; cursor: pointer; display: flex; align-items: center; padding: 0;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            `).join('');

            // Disable access rights if assigned users > 0
            const accessRadios = document.querySelectorAll('input[name="s-access"]');
            const segmentBtns = document.querySelectorAll('.segment-btn');
            if (testDraft.assignedUsers.length > 0) {
                accessRadios.forEach(r => r.disabled = true);
                segmentBtns.forEach(btn => btn.style.opacity = '0.5');
            } else {
                accessRadios.forEach(r => r.disabled = false);
                segmentBtns.forEach(btn => btn.style.opacity = '1');
            }
            
            document.querySelectorAll(".ua-remove-btn").forEach(btn => {
                btn.onclick = () => {
                    const id = btn.getAttribute("data-id");
                    testDraft.assignedUsers = testDraft.assignedUsers.filter(u => u._id !== id);
                    renderAssignedUsers();
                    fetchUsersForAssign();
                };
            });
        };

        const fetchUsersForAssign = async () => {
            const searchInput = document.getElementById("ua-search-input");
            const query = searchInput ? searchInput.value : "";
            try {
                const res = await fetch(`${API_URL}/api/users/assign-list?page=${assignPage}&limit=5&query=${query}`, { headers: getAuthHeaders(), credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    assignTotalPages = data.totalPages || 1;
                    const uList = document.getElementById("ua-users-list");
                    const pageInfo = document.getElementById("ua-page-info");
                    if (pageInfo) pageInfo.textContent = `${assignPage} / ${assignTotalPages}`;
                    
                    if (uList) {
                        // filter out already assigned users
                        const filteredUsers = data.users.filter(u => !testDraft.assignedUsers.find(au => au._id === u._id));
                        uList.innerHTML = filteredUsers.map(u => `
                            <div class="ua-user-row">
                                <div class="ua-user-info">
                                    ${u.avatar ? `<img src="${u.avatar}" />` : `<div style="width:32px; height:32px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`}
                                    <div class="ua-user-details">
                                        <span class="ua-user-name">${u.username}</span>
                                        <span class="ua-user-email">${u.email}</span>
                                    </div>
                                </div>
                                <button type="button" class="ua-add-btn" data-user='${JSON.stringify(u)}'>Qo'shish</button>
                            </div>
                        `).join('');

                        document.querySelectorAll(".ua-add-btn").forEach(btn => {
                            btn.onclick = () => {
                                const userObj = JSON.parse(btn.getAttribute("data-user"));
                                testDraft.assignedUsers.push(userObj);
                                renderAssignedUsers();
                                fetchUsersForAssign();
                            };
                        });
                    }
                    
                    const prevBtn = document.getElementById("ua-prev-page");
                    const nextBtn = document.getElementById("ua-next-page");
                    if (prevBtn) prevBtn.disabled = assignPage <= 1;
                    if (nextBtn) nextBtn.disabled = assignPage >= assignTotalPages;
                }
            } catch (err) {
                console.error("Foydalanuvchilarni yuklashda xatolik", err);
            }
        };

        const sInput = document.getElementById("ua-search-input");
        if (sInput) {
            sInput.oninput = () => {
                assignPage = 1;
                fetchUsersForAssign();
            };
        }

        const prevBtn = document.getElementById("ua-prev-page");
        const nextBtn = document.getElementById("ua-next-page");
        if (prevBtn) prevBtn.onclick = () => { if (assignPage > 1) { assignPage--; fetchUsersForAssign(); } };
        if (nextBtn) nextBtn.onclick = () => { if (assignPage < assignTotalPages) { assignPage++; fetchUsersForAssign(); } };

        renderAssignedUsers();
        fetchUsersForAssign();
    }

    // QUESTIONS EVENTS
    if (currentTab === "questions") {
        const markAsUnsaved = () => {
            if (testDraft.questions[selectedQuestionIndex]) {
                testDraft.questions[selectedQuestionIndex]._isSaved = false;
                const activeItem = document.querySelector(`.q-list-item[data-idx="${selectedQuestionIndex}"] .q-status-dot`);
                if (activeItem) {
                    activeItem.classList.remove('saved');
                    activeItem.classList.add('unsaved');
                }
            }
        };

        const saveQBtn = document.getElementById("save-q-btn");
        if (saveQBtn) {
            saveQBtn.onclick = async () => {
                saveCurrentDraftState();
                const saved = await saveTestAPI(testDraft, false);
                if (saved) {
                    testDraft = saved;
                    testDraft.questions.forEach(q => q._isSaved = true);
                    updateContentArea();
                }
            };
        }

        const addQBtn = document.getElementById("add-new-q-btn");
        if (addQBtn) {
            addQBtn.onclick = () => {
                saveCurrentDraftState();
                testDraft.questions.push({
                    text: "", type: "single", score: 1, penalty: 0,
                    answers: [{text:"", isCorrect:true}],
                    _isSaved: false
                });
                selectedQuestionIndex = testDraft.questions.length - 1;
                updateContentArea();
            };
        }

        document.querySelectorAll(".q-list-item").forEach(item => {
            item.onclick = () => {
                saveCurrentDraftState();
                selectedQuestionIndex = parseInt(item.getAttribute("data-idx"));
                updateContentArea();
            };
        });

        const delQBtn = document.getElementById("del-q-btn");
        if (delQBtn) {
            delQBtn.onclick = async () => {
                if (await showConfirm(t('delete_question_confirm'))) {
                    testDraft.questions.splice(selectedQuestionIndex, 1);
                    selectedQuestionIndex = Math.max(0, selectedQuestionIndex - 1);
                    markAsUnsaved();
                    updateContentArea();
                }
            };
        }

        const addAnsBtn = document.getElementById("add-ans-btn");
        if (addAnsBtn) {
            addAnsBtn.onclick = () => {
                saveCurrentDraftState();
                testDraft.questions[selectedQuestionIndex].answers.push({text:"", isCorrect:false});
                markAsUnsaved();
                updateContentArea();
            };
        }
        const editorContainer = document.getElementById("q-text-editor");
        let quillInstance = null;
        if (editorContainer && window.Quill) {
            quillInstance = new Quill('#q-text-editor', {
                theme: 'snow',
                placeholder: t('enter_question_placeholder') || 'Savol matnini kiriting...',
                modules: {
                    toolbar: {
                        container: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'color': [] }, { 'background': [] }],
                            ['link', 'image', 'video', 'code-block'],
                            ['clean']
                        ],
                        handlers: {
                            image: imageHandler
                        }
                    }
                }
            });

            // Set initial content
            quillInstance.root.innerHTML = testDraft.questions[selectedQuestionIndex].text || "";

            // Listen for changes
            quillInstance.on('text-change', () => {
                testDraft.questions[selectedQuestionIndex].text = quillInstance.root.innerHTML;
                markAsUnsaved();
            });

            function imageHandler() {
                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'image/*');
                input.click();

                input.onchange = async () => {
                    const file = input.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const base64Data = e.target.result;
                            try {
                                const cuStr = localStorage.getItem("currentUser");
                                const cu = cuStr ? JSON.parse(cuStr) : null;
                                const userId = cu ? (cu.userId || cu._id) : null;

                                const response = await fetch(`${API_URL}/api/test-photos/upload`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        ...getAuthHeaders()
                                    },
                                    credentials: "include",
                                    body: JSON.stringify({ fileData: base64Data, userId })
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    const range = quillInstance.getSelection() || { index: quillInstance.getLength() };
                                    
                                    // Insert image with API URL
                                    quillInstance.insertEmbed(range.index, 'image', `${API_URL}${data.url}`);
                                    
                                    // Move cursor to next position
                                    quillInstance.setSelection(range.index + 1);

                                    // Make images lazy load
                                    const images = quillInstance.root.querySelectorAll('img');
                                    images.forEach(img => {
                                        if (!img.getAttribute('loading')) {
                                            img.setAttribute('loading', 'lazy');
                                        }
                                        if (!img.style.maxWidth) {
                                            img.style.maxWidth = '100%';
                                        }
                                    });
                                } else {
                                    const err = await response.json();
                                    showAlert(err.message || "Rasm yuklashda xatolik", "error");
                                }
                            } catch (err) {
                                console.error(err);
                                showAlert("Rasm yuklashda xatolik", "error");
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                };
            }
        }

        const qScoreInput = document.getElementById("q-score");
        const btnMinus = document.getElementById("score-minus");
        const btnPlus = document.getElementById("score-plus");
        
        const updateScore = (val) => {
            testDraft.questions[selectedQuestionIndex].score = val;
            if (qScoreInput) qScoreInput.value = val;
            markAsUnsaved();
        };

        if (btnMinus) {
            btnMinus.onclick = () => {
                let current = parseInt(qScoreInput.value) || 1;
                if (current > 1) updateScore(current - 1);
            };
        }
        if (btnPlus) {
            btnPlus.onclick = () => {
                let current = parseInt(qScoreInput.value) || 1;
                updateScore(current + 1);
            };
        }
        if (qScoreInput) {
            qScoreInput.onchange = (e) => {
                updateScore(parseInt(e.target.value) || 1);
            };
        }

        const customSelect = document.getElementById("custom-q-type");
        if (customSelect) {
            const selected = customSelect.querySelector(".selected");
            const options = customSelect.querySelector(".options");
            const items = customSelect.querySelectorAll(".options li");
            
            selected.onclick = (e) => {
                e.stopPropagation();
                const isOpen = options.style.display === "block";
                options.style.display = isOpen ? "none" : "block";
                const chevron = selected.querySelector(".chevron-icon");
                if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
            };

            items.forEach(opt => {
                opt.onclick = () => {
                    saveCurrentDraftState();
                    const newType = opt.getAttribute("data-value");
                    testDraft.questions[selectedQuestionIndex].type = newType;
                    if (newType === "true-false") {
                        testDraft.questions[selectedQuestionIndex].answers = [
                            {text: "Rost", isCorrect: true},
                            {text: "Yolg'on", isCorrect: false}
                        ];
                    }
                    markAsUnsaved();
                    updateContentArea();
                };
            });

            // Tashqariga bosganda yopish
            document.addEventListener('click', (e) => {
                if (!customSelect.contains(e.target)) {
                    options.style.display = "none";
                    const chevron = selected.querySelector(".chevron-icon");
                    if (chevron) chevron.style.transform = "rotate(0deg)";
                }
            });
        }

        // To'g'ri javobni belgilash
        document.querySelectorAll(".ans-radio").forEach(radio => {
            radio.onchange = (e) => {
                const qType = testDraft.questions[selectedQuestionIndex].type;
                const idx = parseInt(e.target.getAttribute("data-idx"));
                
                if (qType === "single" || qType === "true-false") {
                    testDraft.questions[selectedQuestionIndex].answers.forEach(a => a.isCorrect = false);
                }
                testDraft.questions[selectedQuestionIndex].answers[idx].isCorrect = e.target.checked;
                markAsUnsaved();
                updateContentArea();
            };
        });

        // Variant matni o'zgarganda
        document.querySelectorAll(".ans-text").forEach(inp => {
            inp.oninput = (e) => {
                const idx = parseInt(e.target.getAttribute("data-idx"));
                testDraft.questions[selectedQuestionIndex].answers[idx].text = e.target.value;
                markAsUnsaved();
            };
        });

        document.querySelectorAll(".del-ans").forEach(btn => {
            btn.onclick = () => {
                saveCurrentDraftState();
                const idx = parseInt(btn.getAttribute("data-idx"));
                testDraft.questions[selectedQuestionIndex].answers.splice(idx, 1);
                markAsUnsaved();
                updateContentArea();
            };
        });
    }

    // SAVE & ACTIVATE BUTTONS
    const saveBtn = document.getElementById("save-draft-btn");
    if (saveBtn) {
        saveBtn.onclick = async () => {
            saveCurrentDraftState();
            testDraft.status = "draft";
            const saved = await saveTestAPI(testDraft, !currentTestId);
            if (saved) {
                testDraft = null;
                updateContentArea();
            }
        };
    }

    const actBtn = document.getElementById("activate-test-btn");
    if (actBtn) {
        actBtn.onclick = async () => {
            saveCurrentDraftState();
            if (testDraft.questions.length === 0) return showAlert("Kamida 1 ta savol qo'shing!", "warning");
            if (!testDraft.title) return showAlert("Test nomini kiriting (Sozlamalar tabidan)", "warning");
            
            testDraft.status = "active";
            const saved = await saveTestAPI(testDraft, !currentTestId);
            if (saved) {
                testDraft = null;
                updateContentArea();
            }
        };
    }

    const backBtn = document.getElementById("back-to-bank-btn");
    if (backBtn) {
        backBtn.onclick = () => {
            saveCurrentDraftState();
            testDraft = null;
            currentTestId = null;
            updateContentArea();
        };
    }
};

const saveCurrentDraftState = () => {
    if (currentTab === "settings") {
        const titleEl = document.getElementById("s-title");
        if (titleEl) testDraft.title = titleEl.value;
        const descEl = document.getElementById("s-desc");
        if (descEl) testDraft.description = descEl.value;
        const hourEl = document.getElementById("s-hours");
        if (hourEl) testDraft.timeHours = parseInt(hourEl.value) || 0;
        const minEl = document.getElementById("s-minutes");
        if (minEl) testDraft.timeMinutes = parseInt(minEl.value) || 0;
        const pwdEl = document.getElementById("s-password");
        if (pwdEl) testDraft.password = pwdEl.value;
        const shufQEl = document.getElementById("s-shuffle-questions");
        if (shufQEl) testDraft.shuffleQuestions = shufQEl.checked;
        const shufAEl = document.getElementById("s-shuffle-answers");
        if (shufAEl) testDraft.shuffleAnswers = shufAEl.checked;
        const idEl = document.getElementById("s-access-id");
        if (idEl && testDraft.accessType === 'id') testDraft.accessId = idEl.value;
    } else if (currentTab === "questions" && testDraft.questions.length > 0 && testDraft.questions[selectedQuestionIndex]) {
        const qTextEl = document.querySelector("#q-text-editor .ql-editor");
        if (qTextEl) testDraft.questions[selectedQuestionIndex].text = qTextEl.innerHTML;
        const qScoreEl = document.getElementById("q-score");
        if (qScoreEl) testDraft.questions[selectedQuestionIndex].score = parseFloat(qScoreEl.value) || 1;
        
        document.querySelectorAll(".ans-text").forEach(inp => {
            const idx = parseInt(inp.getAttribute("data-idx"));
            testDraft.questions[selectedQuestionIndex].answers[idx].text = inp.value;
        });
    }
};

export const initDashboardLogic = () => {
    fetchCompletedTests().then(() => {
        updateContentArea();
    });
    loadActivatedTests();
    updateContentArea();

    document.addEventListener(LANGUAGE_CHANGED_EVENT, () => {
        updateContentArea();
        
        // Modallarni til o'zgarganda yangilash
        const pwTitle = document.querySelector('#password-modal h3');
        if (pwTitle) pwTitle.innerText = t('enter_password');
        const pwMsg = document.querySelector('#password-modal .custom-modal-body p');
        if (pwMsg) pwMsg.innerText = t('password_required_msg');
        const pwInput = document.getElementById('test-password-input');
        if (pwInput) pwInput.placeholder = t('password_placeholder');
        const pwErr = document.getElementById('password-error');
        if (pwErr) pwErr.innerText = t('password_error');
        const pwCancel = document.querySelector('#password-modal .custom-modal-footer .btn.secondary');
        if (pwCancel) pwCancel.innerText = t('cancel_btn');
        const pwConfirm = document.getElementById('submit-password-btn');
        if (pwConfirm) pwConfirm.innerText = t('confirm_btn');

        const idTitle = document.querySelector('#id-activation-modal h3');
        if (idTitle) idTitle.innerText = t('activate_test');
        const idMsg = document.querySelector('#id-activation-modal .custom-modal-body p');
        if (idMsg) idMsg.innerText = t('enter_id_msg');
        const idCancel = document.querySelector('#id-activation-modal .custom-modal-footer .btn.secondary');
        if (idCancel) idCancel.innerText = t('cancel_btn');
        const idConfirm = document.getElementById('submit-id-btn');
        if (idConfirm) idConfirm.innerText = t('activate_btn');
    });

    const menuButtons = document.querySelectorAll('.test-menu-btn');
    menuButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            menuButtons.forEach(b => b.classList.remove('active'));
            const clickedBtn = e.currentTarget;
            clickedBtn.classList.add('active');

            currentTestMenu = clickedBtn.getAttribute('data-menu');
            testDraft = null; // Menyu alishsa editor yopiladi
            updateContentArea();
        });
    });
};
