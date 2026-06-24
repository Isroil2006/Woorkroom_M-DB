
import { translations } from "./translations.js";
import { getCurrentUser, getAuthHeaders, fetchCurrentUser, API_URL } from "../../assets/js/api.js";
import { getCurrentLang, createTranslationHelper, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";
import { showNotification } from "../../components/Notification/notification.js";

const t = createTranslationHelper(translations);
const getCurrent = () => getCurrentUser();

// ─── DATA (server-dan yuklanadi) ────────────────────────────────
let myMethods = [];
let myTransactions = [];
let paymentUsers = [];
let myStats = {};
let pusherChannel = null;
let exchangeRates = { UZS: 1, USD: 12800, RUB: 130 };
let cardCurrency = "UZS";

const fetchRates = async () => {
  try {
    const res = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
    const data = await res.json();
    const usd = data.find(d => d.Ccy === "USD");
    const rub = data.find(d => d.Ccy === "RUB");
    if (usd) exchangeRates.USD = parseFloat(usd.Rate);
    if (rub) exchangeRates.RUB = parseFloat(rub.Rate);
  } catch (e) {
    console.warn("Failed to fetch rates", e);
  }
};



// ─── API HELPERS ─────────────────────────────────────────────────
const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${API_URL}${url}`, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: t("server_error") }));
    throw new Error(err.message || t("server_error"));
  }
  return res.json();
};

const loadPaymentData = async () => {
  try {
    const [methods, transactions, stats, users] = await Promise.all([
      apiFetch("/api/payments/methods"),
      apiFetch("/api/payments/transactions"),
      apiFetch("/api/payments/stats"),
      apiFetch("/api/payments/users"),
      fetchRates(),
    ]);
    myMethods = methods;
    myTransactions = transactions;
    myStats = stats;
    paymentUsers = users;
  } catch (e) {
    console.error("Payment data load error:", e);
  }
};

// ─── FORMAT HELPERS ─────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " UZS";
const fmtCardBalance = (n) => {
   const converted = (n || 0) / exchangeRates[cardCurrency];
   const symbol = cardCurrency === "USD" ? "$" : (cardCurrency === "RUB" ? "₽" : "UZS");
   const formatted = Number(converted).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   return symbol === "UZS" ? formatted + " UZS" : symbol + formatted;
};
const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
const avatarColor = (name = "") => {
  const colors = ["#5b6ef5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};
const avatarHTML = (user, size = 34) => {
  const name = user?.username || "";
  if (user?.avatar && user.avatar !== "./assets/images/User-avatar.png" && user.avatar !== "/assets/images/User-avatar.png") {
    return `<img src="${user.avatar}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`;
  }
  return `<div class="biz-avatar" style="background:${avatarColor(name)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.35)}px">${initials(name)}</div>`;
};

const showConfirmModal = (message, confirmText = t("delete_confirm_btn") || "Ha", cancelText = t("cancel") || "Yo'q") => {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "biz-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(15, 18, 46, 0.42)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";
    
    const modal = document.createElement("div");
    modal.className = "pmt-modal";
    modal.style.maxWidth = "320px";
    modal.style.textAlign = "center";
    modal.style.padding = "24px";
    
    const msg = document.createElement("div");
    msg.style.fontSize = "16px";
    msg.style.fontWeight = "600";
    msg.style.color = "#1a1d2e";
    msg.style.marginBottom = "20px";
    msg.textContent = message;
    
    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "10px";
    
    const btnNo = document.createElement("button");
    btnNo.className = "biz-btn-secondary";
    btnNo.style.flex = "1";
    btnNo.textContent = cancelText;
    btnNo.onclick = () => { document.body.removeChild(overlay); resolve(false); };
    
    const btnYes = document.createElement("button");
    btnYes.className = "biz-btn-primary";
    btnYes.style.flex = "1";
    btnYes.style.background = "#ef4444";
    btnYes.style.border = "none";
    btnYes.textContent = confirmText;
    btnYes.onclick = () => { document.body.removeChild(overlay); resolve(true); };
    
    btns.appendChild(btnNo);
    btns.appendChild(btnYes);
    modal.appendChild(msg);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
};

// ─── PAGE TEMPLATE ──────────────────────────────────────────────
export const BusinessPage = () => `
<div class="biz-container">
<div class="biz-root">

  <div class="biz-header">
    <h1 class="biz-welcome" style="margin: 0; font-size: 24px;">Payment</h1>
  </div>

  <div id="view-dashboard">

    <div class="biz-card">
      <div class="biz-card-head" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <h3>${t("documents")}</h3>
          <div id="mini-filters-container" style="display:flex; gap:10px; z-index:10;"></div>
        </div>
        <button class="biz-btn-primary" id="mini-create-doc-btn">${t("create")}</button>
      </div>
      <div class="biz-full-table-header docs-cols mini-table-header">
        <span>${t("col_type")}</span>
        <span>${t("col_amount")}</span>
        <span>${t("col_payment_method")}</span>
        <span>${t("col_date")}</span>
        <span>${t("col_activity")}</span>
        <span>${t("col_status")}</span>
        <span>${t("col_action")}</span>
      </div>
      <div id="docs-mini"></div>
      <div class="biz-pagination" style="justify-content: flex-end;">
        <div class="biz-page-btns">
          <button id="mp-prev">&#8249;</button>
          <span id="mp-num">1</span>
          <button id="mp-next">&#8250;</button>
        </div>
      </div>
    </div>
  </div>

  <div id="view-clients" style="display:none;flex:1;flex-direction:column;overflow:hidden;">
    <div class="biz-card" style="height:100%;display:flex;flex-direction:column;">
      <div class="biz-card-head">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="biz-back-btn" id="back-clients">${t("back")}</button>
          <h3>${t("all_users")}</h3>
        </div>
      </div>
      <div class="biz-full-table-header clients-cols">
        <span>${t("col_user")}</span>
        <span>${t("col_total_payments")}</span>
        <span>${t("col_total_paid")}</span>
        <span>${t("col_balance")}</span>
        <span>${t("col_email_phone")}</span>
        <span></span>
      </div>
      <div id="clients-full-list" style="flex:1;overflow-y:auto;"></div>
      <div class="biz-pagination">
        <span id="cp-info"></span>
        <div class="biz-page-btns">
          <button id="cp-prev">&#8249;</button>
          <span id="cp-num">1</span>
          <button id="cp-next">&#8250;</button>
        </div>
      </div>
    </div>
  </div>

  <div id="view-docs" style="display:none;flex:1;flex-direction:column;overflow:hidden;">
    <div class="biz-card" style="height:100%;display:flex;flex-direction:column;">
      <div class="biz-card-head">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="biz-back-btn" id="back-docs">${t("back")}</button>
          <h3>${t("documents")}</h3>
        </div>
        <button class="biz-btn-primary" id="create-doc-btn">${t("create")}</button>
      </div>
      <div class="biz-doc-filters">
        <select id="doc-status-filter" class="biz-filter-select">
          <option value="">${t("all_status")}</option>
          <option value="waiting">${t("pending")}</option>
          <option value="paid">${t("confirmed")}</option>
          <option value="incoming">${t("incoming")}</option>
        </select>
        <div class="biz-search" style="flex:1;max-width:220px">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#aaa" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#aaa" stroke-width="2" stroke-linecap="round"/></svg>
          <input type="text" id="doc-num-search" placeholder="${t("search_placeholder")}" />
        </div>
      </div>
      <div class="biz-full-table-header docs-cols">
        <span>${t("col_type")}</span>
        <span>${t("col_amount")}</span>
        <span>${t("col_payment_method")}</span>
        <span>${t("col_date")}</span>
        <span>${t("col_activity")}</span>
        <span>${t("col_status")}</span>
        <span>${t("col_action")}</span>
      </div>
      <div id="docs-full-list" style="flex:1;overflow-y:auto;"></div>
      <div class="biz-pagination">
        <span id="dp-info"></span>
        <div class="biz-page-btns">
          <button id="dp-prev">&#8249;</button>
          <span id="dp-num">1</span>
          <button id="dp-next">&#8250;</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="biz-dash-right">
  <div class="biz-card">
    <div class="biz-card-head">
      <h3>${t("my_accounts")}</h3>
      <button class="biz-btn-sm" id="add-card-btn">${t("add_card")}</button>
    </div>
    <div id="accounts-list"></div>
  </div>


</div>
</div>

<!-- ══ PREMIUM PAYMENT MODAL ══ -->
<div id="pmt-modal-overlay" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
  <div class="pmt-modal">
    <div class="pmt-modal-header">
      <div style="display:flex; align-items:center; gap: 12px;">
        <button class="biz-back-icon-btn" id="pmt-back-to-users">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 id="pmt-modal-title">${t("new_transfer")}</h2>
      </div>
      <button class="biz-close-btn" id="pmt-close">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>

    <!-- Step 1: Search & Users List -->
    <div id="pmt-step-1" class="pmt-step">
      <p class="pmt-step-desc">${t("search_receiver_title")}</p>
      
      <div class="pmt-search-tabs">
        <button class="pmt-tab active" data-type="card">${t("search_card_tab")}</button>
        <button class="pmt-tab" data-type="phone">${t("search_phone_tab")}</button>
        <button class="pmt-tab" data-type="username">${t("search_username_tab") || "Username"}</button>
      </div>

      <div class="pmt-input-group">
        <input class="biz-input pmt-search-input" id="pmt-search-val" placeholder="0000 0000 0000 0000" autocomplete="off" />
        <button class="biz-btn-primary" id="pmt-search-btn" style="position:relative; width: 100px;">
          <span class="btn-text">${t("search_btn")}</span>
          <div class="btn-loader" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">
             <div class="pmt-spinner-small"></div>
          </div>
        </button>
      </div>
      <p class="biz-error" id="pmt-search-error" style="text-align:center; margin-top:10px;"></p>

      <div id="pmt-all-users-list" class="pmt-users-list no-scrollbar"></div>
      
      <div class="pmt-pagination-bar">
        <div class="pmt-page-size-wrap">
          <span id="pmt-page-size-label">Ko'rsatish:</span>
          <div class="biz-custom-select drop-up" id="pmt-page-size-custom">
             <div class="biz-select-trigger" style="padding: 4px 10px; font-size: 12px; height: 30px;">
                <span class="biz-select-val" id="pmt-page-size-val">10</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
             </div>
             <div class="biz-select-options" id="pmt-page-size-opts" style="min-width: 80px;">
                <div class="biz-option" data-val="10">10</div>
                <div class="biz-option" data-val="20">20</div>
                <div class="biz-option" data-val="30">30</div>
                <div class="biz-option" data-val="40">40</div>
             </div>
          </div>
        </div>
        <div class="biz-page-btns">
          <button id="pmt-user-prev">&#8249;</button>
          <span id="pmt-user-num">1</span>
          <button id="pmt-user-next">&#8250;</button>
        </div>
      </div>
    </div>

    <!-- Step 2-3: Combined Side-by-side -->
    <div id="pmt-step-2-3" class="pmt-step" style="display:none;">
      
      <div class="pmt-split-view">
        <div class="pmt-split-col">
          <p class="pmt-step-desc" style="margin-bottom:8px;">${t("receiver_info") || "Qabul qiluvchi"}</p>
          <div class="pmt-user-card" id="pmt-found-user" style="margin-bottom: 16px; padding: 12px 16px;"></div>
          
          <p class="pmt-step-desc" style="margin-bottom:8px;">${t("choose_receiver_card")}</p>
          <div id="pmt-receiver-methods" class="pmt-methods-grid no-scrollbar" style="flex:1;"></div>
        </div>

        <div class="pmt-split-col">
          <p class="pmt-step-desc" style="margin-bottom:8px;">${t("transfer_details")}</p>
          <div class="pmt-amount-box" style="margin-bottom: 16px;">
            <input type="text" id="pmt-amount" placeholder="0" class="pmt-amount-input" />
            <span class="pmt-currency" style="margin-left: 8px; margin-right: 0;">UZS</span>
          </div>
          
          <p class="pmt-step-desc" style="margin-bottom:8px;">${t("choose_sender_card")}</p>
          <div id="pmt-sender-methods" class="pmt-methods-grid no-scrollbar" style="flex:1;"></div>
          
          <p class="biz-error" id="pmt-step3-error" style="margin-top:10px;"></p>
          <button class="biz-btn-primary pmt-next-btn" id="pmt-next-3" style="margin-top:auto; width:100%" disabled>${t("proceed")}</button>
        </div>
      </div>
    </div>

    <!-- Step 4: SMS -->
    <div id="pmt-step-sms" class="pmt-step" style="display:none; text-align:center; padding:20px 0;">
       <div class="pmt-sms-icon">
         <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.06 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
       </div>
       <h3 id="pmt-sms-title" style="margin:16px 0 6px; font-size:18px; font-weight:800;">${t("sms_title")}</h3>
       <p id="pmt-sms-desc" style="color:#8892a4; font-size:13px; margin:0 0 24px; line-height:1.5;"></p>
       
       <div style="display:flex; gap:12px; justify-content:center; margin-bottom: 20px;">
         <input id="pmt-sms-1" class="biz-otp-input" maxlength="1" inputmode="numeric" />
         <input id="pmt-sms-2" class="biz-otp-input" maxlength="1" inputmode="numeric" />
         <input id="pmt-sms-3" class="biz-otp-input" maxlength="1" inputmode="numeric" />
         <input id="pmt-sms-4" class="biz-otp-input" maxlength="1" inputmode="numeric" />
       </div>
       
       <p id="pmt-sms-error" class="biz-error" style="margin-bottom:15px;"></p>
       <button class="biz-btn-primary" id="pmt-sms-confirm" style="width:100%; margin-bottom:12px;">${t("sms_confirm")}</button>
    </div>

    <!-- Step 5: Success -->
    <div id="pmt-step-success" class="pmt-step" style="display:none; text-align:center; padding: 40px 20px 20px;">
       <div class="pmt-success-circle">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" stroke="#22c55e" stroke-width="2"/><path d="M7 12l3.5 3.5L17 8" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
       </div>
       <h3 style="font-size:22px; font-weight:800; margin: 20px 0 10px; color:#1a1d2e;">${t("transaction_success")}</h3>
       <button class="biz-btn-primary" id="pmt-success-close" style="width:100%; margin-top:30px;">${t("return_dashboard")}</button>
    </div>

  </div>
</div>

<!-- ══ CREATE DOC MODAL ══ -->
<div id="doc-modal" class="biz-overlay" style="display:none">
  <div class="biz-modal">
    <h3>${t("create_document")}</h3>
    <label class="biz-label">${t("amount_dollar")}</label>
    <input class="biz-input" type="number" id="dm-amount" placeholder="0" />
    <label class="biz-label">${t("recipient")}</label>
    <select class="biz-input" id="dm-recipient" style="max-height:180px;overflow-y:auto"><option value="">${t("select_default")}</option></select>
    <label class="biz-label">${t("description")}</label>
    <input class="biz-input" id="dm-desc" placeholder="${t("write_description")}" />
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="biz-btn-secondary" id="dm-cancel" style="flex:1">${t("cancel")}</button>
      <button class="biz-btn-primary" id="dm-save" style="flex:1">${t("create_btn")}</button>
    </div>
  </div>
</div>

<!-- ══ ADD CARD MODAL ══ -->
<div id="card-modal" class="biz-overlay" style="display:none">
  <div class="biz-modal">
    <h3>${t("add_new_card")}</h3>
    <label class="biz-label">${t("card_type") || "Karta turi"}</label>
    <select class="biz-input" id="cm-card-type">
      <option value="Humo">Humo</option>
      <option value="Uzcard">Uzcard</option>
    </select>
    <label class="biz-label">${t("card_number")}</label>
    <input class="biz-input" id="cm-number" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric" />
    <label class="biz-label">${t("card_holder")}</label>
    <input class="biz-input" id="cm-holder" placeholder="${t("full_name")}" />
    <div style="display:flex;gap:12px">
      <div style="flex:1"><label class="biz-label">${t("expiry")}</label><input class="biz-input" id="cm-expiry" placeholder="05/27" maxlength="5" inputmode="numeric"/></div>
      <div style="flex:1">
        <label class="biz-label">${t("balance")}</label>
        <div style="position:relative; display:flex; align-items:center;">
          <input class="biz-input" type="text" id="cm-balance" placeholder="0" oninput="this.value = this.value.replace(/[^\\d]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')" style="padding-right: 45px; width: 100%; box-sizing: border-box;"/>
          <span style="position:absolute; right:12px; font-size:14px; color:#64748b; font-weight:600; pointer-events:none;">UZS</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="biz-btn-secondary" id="cm-cancel" style="flex:1">${t("cancel")}</button>
      <button class="biz-btn-primary" id="cm-save" style="flex:1">${t("save")}</button>
    </div>
  </div>
</div>

<!-- ══ DELETE CARD MODAL ══ -->
<div id="del-card-modal" class="biz-overlay" style="display:none">
  <div class="biz-modal" style="max-width:360px;text-align:center">
    <div style="width:52px;height:52px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>
    </div>
    <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#1a1d2e" id="del-card-title"></h3>
    <p style="margin:0 0 20px;font-size:13px;color:#8892a4;line-height:1.5" id="del-card-desc"></p>
    <div style="display:flex;gap:10px">
      <button class="biz-btn-secondary" id="del-card-cancel" style="flex:1"></button>
      <button id="del-card-confirm" style="flex:1;padding:10px;border:none;border-radius:8px;background:#ef4444;color:#fff;font-weight:700;font-size:13px;cursor:pointer"></button>
    </div>
  </div>
</div>

<!-- ══ CARD SETTINGS MODAL ══ -->
<div id="card-settings-modal" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px); z-index:9999;">
  <div class="biz-modal" style="width:100%; max-width:360px; border-radius: 24px; padding:24px; background:#fff; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.1); animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;">
    <button id="cs-close" style="position:absolute; top:16px; right:16px; background:#f1f5f9; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:all 0.2s;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <h3 style="margin:0 0 20px; font-size:18px; font-weight:800; color:#1e293b;">Karta ma'lumotlari</h3>
    
    <div id="cs-card-preview" style="margin-bottom:20px;"></div>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
      <div id="cs-toggle-details" style="padding:16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:#f1f5f9; transition:background 0.2s;">
        <span style="font-size:14px; font-weight:600; color:#334155;">To'liq ma'lumotlar</span>
        <button style="background:transparent; border:none; color:#64748b; display:flex; align-items:center; justify-content:center; cursor:pointer;">
          <svg id="cs-eye-icon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <div id="cs-details-content" style="padding:0 16px; max-height:0; overflow:hidden; transition:max-height 0.3s ease, padding 0.3s ease;">
        <div style="padding:16px 0; display:flex; flex-direction:column; gap:12px;">
          <div>
            <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">Karta raqami</p>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
              <span id="cs-full-number" style="font-size:14px; font-weight:700; color:#1e293b; font-family:monospace; letter-spacing:1px;"></span>
              <button class="cs-copy-btn" data-target="cs-full-number" style="background:transparent; border:none; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="Nusxa olish">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div id="cs-expiry-container">
            <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">Amal qilish muddati</p>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
              <span id="cs-expiry" style="font-size:14px; font-weight:700; color:#1e293b;"></span>
              <button class="cs-copy-btn" data-target="cs-expiry" style="background:transparent; border:none; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="Nusxa olish">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div>
            <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">Karta egasi</p>
            <div style="background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
              <span id="cs-holder" style="font-size:14px; font-weight:700; color:#1e293b;"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <button id="cs-delete-card-btn" class="biz-btn-primary" style="width:100%; margin-top:20px; background:#fee2e2; color:#ef4444; border:none; display:flex; align-items:center; justify-content:center; gap:8px;">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      Kartani o'chirish
    </button>
  </div>
</div>

<!-- ══ RECEIPT MODAL ══ -->
<div id="receipt-modal" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px); z-index: 9999;">
  <div style="display:flex; flex-direction:column; align-items:center; width: 100%; max-width: 380px; position: relative;">
    
    <!-- Action Buttons (outside printable area) -->
    <div style="position:absolute; top:16px; right:16px; z-index: 10; display:flex; gap:8px;">
      <button id="download-receipt-btn" title="PDF yuklab olish" style="background:#3b82f6; border:none; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 12px rgba(59, 130, 246, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button id="close-receipt-btn" title="Yopish" style="background:#ef4444; border:none; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 12px rgba(239, 68, 68, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Printable Area -->
    <div id="receipt-content-to-print" style="background:#fff; width: 100%; border-radius: 24px; padding: 40px 32px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); position: relative; -webkit-mask-image: radial-gradient(circle at 0 calc(100% - 108px), transparent 16px, black 16.5px), radial-gradient(circle at 100% calc(100% - 108px), transparent 16px, black 16.5px); -webkit-mask-size: 51% 100%; -webkit-mask-position: left, right; -webkit-mask-repeat: no-repeat;">
      
      <!-- Top Section: Amount -->
      <div style="margin-bottom: 32px;">
        <span style="font-size: 14px; font-weight: 500; color:#64748b; display:block; margin-bottom:8px;">To'lov summasi</span>
        <div style="font-family: 'Georgia', 'Times New Roman', serif; color:#1e293b; display:flex; align-items:baseline; gap:2px;">
          <span style="font-size: 42px; font-weight: 700; letter-spacing: -1px;" id="receipt-amount-int"></span>
          <span style="font-size: 24px; font-weight: 700; color:#64748b; letter-spacing: -0.5px;" id="receipt-amount-dec"></span>
        </div>
      </div>
      
      <!-- Divider with badge (Payment Details) -->
      <div style="position: relative; text-align: center; margin: 32px 0;">
        <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; background: #f1f5f9; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #475569;">To'lov tafsilotlari</span>
      </div>
      
      <!-- Key-Value Pairs -->
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:500; color:#64748b;">Sana</span>
          <span style="font-size:14px; font-weight:700; color:#1e293b;" id="receipt-date"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:500; color:#64748b;">To'lov turi</span>
          <span style="font-size:14px; font-weight:700; color:#1e293b;" id="receipt-type"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:500; color:#64748b;">Kimdan</span>
          <span style="font-size:14px; font-weight:700; color:#1e293b;" id="receipt-sender"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:500; color:#64748b;">Hisobdan</span>
          <span style="font-size:14px; font-weight:700; color:#1e293b;" id="receipt-sender-card"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:500; color:#64748b;">Kimga</span>
          <span style="font-size:14px; font-weight:700; color:#1e293b;" id="receipt-receiver"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:500; color:#64748b;">Hisobga</span>
          <span style="font-size:14px; font-weight:700; color:#1e293b;" id="receipt-receiver-card"></span>
        </div>
      </div>
      
      <!-- Dashed Divider with Cutouts -->
      <div style="position: relative; text-align: center; margin: 0 -32px; height: 32px; display:flex; align-items:center; justify-content:center;">
        <div style="position: absolute; top: 50%; left: 24px; right: 24px; height: 0; border-top: 2px dashed #cbd5e1; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; background: #f1f5f9; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #475569;">Umumiy</span>
      </div>
      
      <!-- Final Total -->
      <div style="height: 60px; padding-top: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:15px; font-weight:600; color:#64748b;">Jami</span>
          <span style="font-size:18px; font-weight:800; color:#1e293b;" id="receipt-total"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <span style="font-size:13px; font-weight:500; color:#94a3b8;">Tranzaksiya ID</span>
          <span style="font-size:13px; font-weight:600; color:#94a3b8; font-family:monospace;" id="receipt-tx-id"></span>
        </div>
      </div>

    </div>

  </div>
</div>

<!-- ══ QR MODAL ══ -->
<div id="qr-modal" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px); z-index: 9999;">
  <div class="biz-modal" style="width:100%; max-width:320px; border-radius: 24px; padding:32px; background:#fff; display:flex; flex-direction:column; align-items:center; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.1); animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;">
    <button id="close-qr-btn" style="position:absolute; top:16px; right:16px; background:#f1f5f9; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:all 0.2s;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <h3 style="margin:0 0 24px; font-size:18px; font-weight:800; color:#1e293b;">Tranzaksiya QR kodi</h3>
    <div style="background:#f8fafc; padding:16px; border-radius:16px; border:1px solid #e2e8f0; display:flex; justify-content:center; align-items:center; width:220px; height:220px;">
      <img id="qr-code-img" src="" style="max-width:100%; max-height:100%; display:none;" onload="this.style.display='block'" />
    </div>
    <p style="margin:24px 0 0; font-size:13px; color:#64748b; text-align:center; font-weight:500; line-height:1.5;">Telefon kamerasi orqali skaner qilib, chekni ko'ring</p>
  </div>
</div>

<!-- ══ TRANSFER TO SELF MODAL ══ -->
<div id="ts-modal" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
  <div class="biz-modal" style="width:100%; max-width:380px; border-radius: 24px; padding:24px; animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both; background:#fff;">
     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <h3 style="margin:0; font-size:20px; font-weight:800; color:#1a1d2e;">${t("transfer_to_self")}</h3>
        <button class="biz-close-btn" id="ts-close">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
     </div>
     
     <div style="position:relative;">
         <div style="background:#f4f5f7; border-radius:16px; padding:16px; margin-bottom:12px;">
           <label style="color:#64748b; font-size:12px; margin-bottom:6px; display:block; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${t("from_card")}</label>
           <div id="ts-sender-card-container" style="position:relative;"></div>
         </div>

         <button id="ts-swap-btn" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:40px; height:40px; background:#fff; border:4px solid #f4f5f7; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.05); color:#64748b; transition:transform 0.2s;">
           <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
         </button>

         <div style="background:#f4f5f7; border-radius:16px; padding:16px; margin-bottom:24px;">
           <label style="color:#64748b; font-size:12px; margin-bottom:6px; display:block; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${t("to_card")}</label>
           <div id="ts-receiver-card-container" style="position:relative;"></div>
         </div>
     </div>
     
     <div style="background:#f1f5f9; border-radius:16px; padding:16px; margin-bottom:24px;">
       <label style="color:#64748b; font-size:12px; margin-bottom:6px; display:block; font-weight:600;">${t("amount_dollar")}</label>
       <div style="display:flex; align-items:center;">
           <input type="text" id="ts-amount" placeholder="0" style="background:transparent; border:none; font-size:28px; font-weight:700; color:#1e293b; width:100%; outline:none;" oninput="this.value = this.value.replace(/[^\\d]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')" />
           <span style="font-size:24px; font-weight:700; color:#1e293b; margin-left:8px;">UZS</span>
       </div>
       <p id="ts-error" style="color:#ef4444; font-size:12px; margin:8px 0 0; display:none; font-weight:500;"></p>
     </div>

     <button class="biz-btn-primary" id="ts-confirm" style="width:100%; padding:16px; font-size:16px; background:#5b6ef5; color:#fff; box-shadow:0 8px 20px rgba(91,110,245,0.3); transition:all 0.2s;">${t("transfer_btn")}</button>
  </div>
</div>

<!-- ══ NOTIFICATION TOAST ══ -->
`;

const $ = (id) => document.getElementById(id);
const PAGE = 5;

// ─── TOAST ──────────────────────────────────────────────────────
const showToast = (msg, type = "info") => {
  showNotification(msg, type);
};

// ─── RENDER FUNCTIONS ───────────────────────────────────────────
const refreshStats = () => {
  const me = getCurrent();
  const userId = me?.userId || me?._id;
  
  const currentMethod = myMethods[carouselIdx];
  const totalBalance = myMethods.reduce((s, m) => s + (m.balance || 0), 0);
  const cardBalance = currentMethod ? (currentMethod.balance || 0) : 0;

  // Exclude internal transfers (senderId === receiverId) from monthly stats
  let outgoing = myTransactions.filter((t) => t.senderId === userId && t.receiverId !== userId);
  let incoming = myTransactions.filter((t) => t.receiverId === userId && t.senderId !== userId);

  if (currentMethod) {
      outgoing = outgoing.filter((t) => {
          const sId = typeof t.senderMethodId === 'object' && t.senderMethodId ? t.senderMethodId._id : t.senderMethodId;
          return sId === currentMethod._id;
      });
      incoming = incoming.filter((t) => {
          const rId = typeof t.receiverMethodId === 'object' && t.receiverMethodId ? t.receiverMethodId._id : t.receiverMethodId;
          return rId === currentMethod._id;
      });
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  outgoing = outgoing.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status === "paid";
  });
  incoming = incoming.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status === "paid";
  });

  const expense = outgoing.reduce((s, t) => s + t.amount, 0);
  const income = incoming.reduce((s, t) => s + t.amount, 0);

  if ($("stat-waiting")) $("stat-waiting").textContent = fmt(expense);
  if ($("stat-paid")) $("stat-paid").textContent = fmt(income);
  if ($("stat-clients")) $("stat-clients").textContent = paymentUsers.length;
  if ($("stat-balance")) $("stat-balance").textContent = fmt(cardBalance);
  if ($("biz-username")) $("biz-username").textContent = me?.username || "User";
  if ($("drawer-my-balance")) $("drawer-my-balance").textContent = fmt(totalBalance);
};

let carouselIdx = 0;

const renderAccounts = () => {
  renderMiniFilters();
  const el = $("accounts-list");
  if (!el) return;

  if (!myMethods.length) {
    el.innerHTML = `<p class="biz-empty">${t("no_accounts")}</p>`;
    return;
  }

  if (carouselIdx >= myMethods.length) carouselIdx = myMethods.length - 1;
  if (carouselIdx < 0) carouselIdx = 0;

  const cur = myMethods[carouselIdx];
  const canDel = !cur.isDefault;

  el.innerHTML = `
    <div class="biz-carousel-viewport">
      <div class="biz-carousel-track" id="carousel-track" style="transform:translateX(-${carouselIdx * 100}%)">
        ${myMethods.map((m) => {
          const label = m.cardName || (m.type === "card" ? "VISA" : "BANK");
          const fullNum = (m.number || m.displayNumber || "0000 0000 0000 0000").replace(/\s/g, "");
          let formatted = fullNum;
          if (fullNum.length > 8) {
            const start = fullNum.substring(0, 4);
            const end = fullNum.substring(fullNum.length - 4);
            const midLen = fullNum.length - 8;
            const mask = "*".repeat(midLen).match(/.{1,4}/g)?.join("  ") || "****";
            formatted = `${start}  ${mask}  ${end}`;
          } else {
            formatted = fullNum.match(/.{1,4}/g)?.join("  ") || fullNum;
          }
          return `
        <div class="biz-carousel-slide">
          <div class="biz-acc-card ${m.type === "card" ? "card-grad" : "bank-grad"}" style="min-height:170px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-nfc-icon lucide-nfc"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
              <span style="font-size:14px;font-weight:700;letter-spacing:1.5px;opacity:.9">${label}</span>
            </div>
            <div style="margin:auto 0">
              <span style="font-size:13px;font-weight:700;letter-spacing:2px">${formatted}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end">
              <div style="text-align:left">
                <p style="font-size:9px;opacity:.55;margin:0;text-transform:uppercase;letter-spacing:.5px">BALANCE</p>
                <p style="font-size:18px;font-weight:700;margin:4px 0 0">${fmtCardBalance(m.balance)}</p>
              </div>
              <button class="biz-card-settings-btn" data-id="${m._id}" style="background:transparent;border:none;color:inherit;cursor:pointer;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button>
            </div>
          </div>
        </div>`;
        }).join("")}
      </div>
    </div>
    <div style="display:flex; justify-content:flex-start; align-items:center; margin-top:16px; gap:12px;">
      <!-- Carousel controls -->
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="biz-carousel-arrow" id="c-prev" style="background:#f8fafc; border:1px solid #f1f5f9; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink: 0;" ${carouselIdx === 0 ? "disabled" : ""}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="biz-carousel-dots" id="c-dots" style="display:flex; gap:8px; overflow:hidden; max-width:40px; justify-content:flex-start; scroll-behavior: smooth;">
          ${myMethods.map((_, i) => `<span class="biz-carousel-dot${i === carouselIdx ? " active" : ""}" style="flex-shrink:0;"></span>`).join("")}
        </div>
        <button class="biz-carousel-arrow" id="c-next" style="background:#f8fafc; border:1px solid #f1f5f9; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink: 0;" ${carouselIdx === myMethods.length - 1 ? "disabled" : ""}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>

      <!-- Divider -->
      <div style="width:1px; height:24px; background:#e2e8f0; border-radius:1px; margin:0 4px; flex-shrink: 0;"></div>

      <!-- Currency Select and actions -->
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="biz-custom-select" id="card-currency-select" style="min-width: 85px;">
           <div class="biz-select-trigger" style="height:36px; padding:0 12px; border-radius:12px; font-weight:700; background:#f8fafc; border:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; font-size:14px; color:#0f172a; cursor:pointer;">
              <span class="biz-select-val">${cardCurrency}</span>
              <svg style="margin-left:8px;" width="16" height="16" fill="none" stroke="#64748b" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
           </div>
           <div class="biz-select-options" style="min-width: 85px;">
              <div class="biz-option ${cardCurrency === 'UZS' ? 'biz-selected' : ''}" data-value="UZS">UZS</div>
              <div class="biz-option ${cardCurrency === 'USD' ? 'biz-selected' : ''}" data-value="USD">USD</div>
              <div class="biz-option ${cardCurrency === 'RUB' ? 'biz-selected' : ''}" data-value="RUB">RUB</div>
           </div>
        </div>
        
        <!-- Action Buttons -->
        <button id="inline-refresh-btn" style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:12px; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; color:#475569;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        </button>
      </div>
    </div>
    <button class="biz-btn-secondary" id="transfer-to-self-btn" style="width:100%; margin-top:16px; display:flex; justify-content:center; align-items:center; gap:8px;">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
      ${t("transfer_to_self")}
    </button>
    
    <div class="biz-stats-col" style="margin-top:14px">
      <div class="biz-stat-card">
        <div class="biz-stat-icon waiting-icon" style="background:#fee2e2;color:#ef4444;">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 20V4M5 11l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div><p class="biz-stat-label">${t("monthly_expense")}</p><p class="biz-stat-value" id="stat-waiting">0 UZS</p></div>
      </div>
      <div class="biz-stat-card">
        <div class="biz-stat-icon paid-icon" style="background:#dcfce7;color:#16a34a;">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m7-7l-7 7-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div><p class="biz-stat-label">${t("monthly_income")}</p><p class="biz-stat-value" id="stat-paid">0 UZS</p></div>
      </div>
      <div class="biz-stat-card biz-stat-accent">
        <div class="biz-stat-icon account-icon">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 3H8L2 7h20l-6-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <p class="biz-stat-label" style="color:rgba(255,255,255,.7)">${t("account_balance")}</p>
          <p class="biz-stat-value" id="stat-balance" style="color:#fff">0 UZS</p>
        </div>
      </div>
    </div>
  `;

  // ── Carousel navigation ──
  const updateUI = () => {
    const track = $("carousel-track");
    if (track) track.style.transform = `translateX(-${carouselIdx * 100}%)`;

    if ($("c-prev")) $("c-prev").disabled = carouselIdx === 0;
    if ($("c-next")) $("c-next").disabled = carouselIdx === myMethods.length - 1;

    const dotsContainer = $("c-dots");
    if (dotsContainer) {
      const dots = dotsContainer.children;
      for (let i = 0; i < dots.length; i++) {
        const isActive = i === carouselIdx;
        dots[i].className = `biz-carousel-dot${isActive ? " active" : ""}`;
        if (isActive) {
           dots[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }

    // Refresh stats for the selected card
    refreshStats();
  };

  if ($("c-prev")) $("c-prev").onclick = () => {
    if (carouselIdx > 0) { carouselIdx--; updateUI(); }
  };
  if ($("c-next")) $("c-next").onclick = () => {
    if (carouselIdx < myMethods.length - 1) { carouselIdx++; updateUI(); }
  };

  // Restore the stats values into the freshly rendered stat blocks
  refreshStats();

  const currSelect = $("card-currency-select");
  if (currSelect) {
    const trigger = currSelect.querySelector(".biz-select-trigger");
    trigger.onclick = (e) => {
       e.stopPropagation();
       document.querySelectorAll(".biz-custom-select.open").forEach(el => {
          if (el !== currSelect) el.classList.remove("open");
       });
       currSelect.classList.toggle("open");
    };
    currSelect.querySelectorAll(".biz-option").forEach(opt => {
       opt.onclick = (e) => {
          e.stopPropagation();
          cardCurrency = opt.getAttribute("data-value");
          currSelect.classList.remove("open");
          renderAccounts();
       };
    });
  }


  if ($("inline-refresh-btn")) {
    $("inline-refresh-btn").onclick = async (e) => {
      const btn = e.currentTarget;
      const svg = btn.querySelector("svg");
      svg.style.transition = "transform 0.5s ease";
      svg.style.transform = "rotate(360deg)";
      await fetchRates();
      renderAccounts();
      setTimeout(() => { svg.style.transition = "none"; svg.style.transform = "rotate(0deg)"; }, 500);
    };
  }

  // Self Transfer btn logic
  if ($("transfer-to-self-btn")) {
     $("transfer-to-self-btn").onclick = () => {
         if (myMethods.length < 2) {
             showToast(t("not_enough_cards"), "error");
             return;
         }
         openSelfTransferModal();
     };
  }

  // Settings buttons
  const settingsBtns = document.querySelectorAll(".biz-card-settings-btn");
  settingsBtns.forEach(btn => {
    btn.onclick = (e) => {
      const mid = e.currentTarget.getAttribute("data-id");
      const card = myMethods.find(m => m._id === mid);
      if(card) {
        openCardSettingsModal(card);
      }
    };
  });
};



// ─── FULL VIEWS ─────────────────────────────────────────────────
const MINI_PAGE = 20;
let mPage = 1;

let miniTypeFilter = "all";
let miniCardFilter = "all";

const renderMiniFilters = () => {
  const container = $("mini-filters-container");
  if (!container) return;

  const types = [
    { value: "all", label: t("filter_all") || "Barchasi" },
    { value: "sent", label: t("filter_sent") || "Yuborilgan" },
    { value: "received", label: t("filter_received") || "Qabul qilingan" }
  ];

  const cards = [
    { value: "all", label: t("filter_all_accounts") || "Barcha hisoblar" },
    ...myMethods.map(m => {
       const type = m.type === "card" ? t("method_card_via") : t("method_bank_via");
       const last4 = m.number ? m.number.slice(-4) : "****";
       return { value: m._id, label: `${type} ${last4}` };
    })
  ];

  const createSelect = (id, options, currentValue, onChange) => {
     const selectedOpt = options.find(o => o.value === currentValue) || options[0];
     
     const selDiv = document.createElement("div");
     selDiv.className = "biz-custom-select";
     selDiv.id = id;
     
     const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
     
     selDiv.innerHTML = `
        <div class="biz-select-trigger">
           <span class="biz-select-label">${selectedOpt.label}</span>
           ${svgIcon}
        </div>
        <div class="biz-select-options">
           ${options.map(o => `<div class="biz-option ${o.value === currentValue ? 'biz-selected' : ''}" data-value="${o.value}">${o.label}</div>`).join('')}
        </div>
     `;
     
     const trigger = selDiv.querySelector(".biz-select-trigger");
     trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".biz-custom-select.open").forEach(el => {
           if (el !== selDiv) el.classList.remove("open");
        });
        selDiv.classList.toggle("open");
     });
     
     selDiv.querySelectorAll(".biz-option").forEach(opt => {
        opt.addEventListener("click", (e) => {
           e.stopPropagation();
           onChange(opt.getAttribute("data-value"));
           selDiv.classList.remove("open");
        });
     });
     
     return selDiv;
  };

  container.innerHTML = "";
  container.appendChild(createSelect("mini-type-select", types, miniTypeFilter, (val) => {
     miniTypeFilter = val;
     renderMiniFilters();
     mPage = 1;
     renderDocsMini();
  }));
  container.appendChild(createSelect("mini-card-select", cards, miniCardFilter, (val) => {
     miniCardFilter = val;
     renderMiniFilters();
     mPage = 1;
     renderDocsMini();
  }));
};

// Global click to close dropdowns
document.addEventListener("click", () => {
   document.querySelectorAll(".biz-custom-select.open").forEach(el => el.classList.remove("open"));
});

const renderDocsMini = () => {
  const el = $("docs-mini");
  if (!el) return;
  const me = getCurrent();
  const userId = me?.userId || me?._id;
  
  let allPayments = myTransactions.slice().reverse();
  
  allPayments = allPayments.filter(p => {
      const isSent = p.senderId === userId || (p.senderId && typeof p.senderId === 'object' && p.senderId._id === userId) || p.type === 'withdraw' || p.type === 'expense';
      
      if (miniTypeFilter === "sent" && !isSent) return false;
      if (miniTypeFilter === "received" && isSent) return false;
      
      if (miniCardFilter !== "all") {
          const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
          const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;
          const methodUsedId = isSent ? sId : rId;
          if (methodUsedId !== miniCardFilter) return false;
      }
      return true;
  });

  const total = allPayments.length;
  const pages = Math.max(1, Math.ceil(total / MINI_PAGE));
  if (mPage > pages) mPage = pages;
  
  const start = (mPage - 1) * MINI_PAGE;
  const payments = allPayments.slice(start, start + MINI_PAGE);
  
  if ($("mp-num")) {
    $("mp-num").textContent = mPage;
    $("mp-prev").disabled = mPage <= 1;
    $("mp-next").disabled = mPage >= pages;
  }

  el.innerHTML = payments.length
    ? payments.map((p) => {
        const isPending = p.status === "waiting";
        const isSent = p.senderId === userId;
        const isInternal = p.senderId === userId && p.receiverId === userId;
        const isWait = isPending && isSent;
        const expanded = expandedTxIds.has(p._id);
        
        const badgeClass = p.status === "paid" ? "biz-status-success" : (isPending ? "biz-status-pending" : "biz-status-failed");
        const badgeText = p.status === "paid" ? t("status_success") : (isPending ? t("status_incomplete") : t("status_failed"));
        const badgeIcon = p.status === "paid" 
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
            : (isPending 
                ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
                : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`);

        const d = new Date(p.createdAt);
        const date = isPending ? "-" : `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        
        const amountColor = isPending ? "#f59e0b" : (isSent ? "#ef4444" : "#16a34a");
        const amountSign = isSent ? "- " : "+ ";
        
        let activityText = isSent ? `${t("sending_payment_to")} ${p.receiverName || "User"}` : `${t("received_payment_from")} ${p.senderName || "User"}`;
        if (p.receiverId === "system_tour") activityText = p.description || "Tur xaridi";
        if (isInternal) activityText = t("internal_transfer");
        
        const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
        const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;
        let myMethodUsed = isSent ? myMethods.find(m => m._id === sId) : myMethods.find(m => m._id === rId);
        let paymentMethodText = "-";
        let paymentMethodSub = "";
        if (myMethodUsed) {
           const methodType = myMethodUsed.type === "card" ? t("method_card_via") : t("method_bank_via");
           const last4 = myMethodUsed.number ? myMethodUsed.number.slice(-4) : "****";
           paymentMethodText = methodType;
           paymentMethodSub = `**** ${last4}`;
        }

        let typeBg = isPending ? "#fef3c7" : (isSent ? "#fee2e2" : "#dcfce7");
        let typeColor = isPending ? "#f59e0b" : (isSent ? "#ef4444" : "#16a34a");
        let typeIcon = isPending
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
            : (isSent
                ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`
                : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`);
        let typeText = isPending ? (t("type_pending") || "Pending") : (isSent ? (t("type_sent") || "Sent") : (t("type_received") || "Received"));

        if (isInternal) {
            typeBg = "#f3e8ff";
            typeColor = "#9333ea";
            typeIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>`;
            typeText = t("internal_transfer");
        }

        if (p.receiverId === "system_tour") {
            typeBg = "rgba(91, 110, 245, 0.15)";
            typeColor = "#5b6ef5";
            typeText = "Sayohat";
            typeIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
        }

        return `
        <div class="biz-doc-row-wrap mini-table-row${expanded ? " expanded" : ""}">
          <div class="biz-row docs-cols mini-table-grid">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:20px;height:20px;border-radius:50%;background:${typeBg};color:${typeColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${typeIcon}
              </div>
              <span style="font-weight:600;font-size:12px;color:#1a1d2e">${typeText}</span>
            </div>

            <span class="biz-cell" style="font-weight:700;color:${amountColor};font-size:12px">${amountSign}${fmt(p.amount)}</span>

            <div style="display:flex;flex-direction:column;gap:1px">
              <span style="font-weight:600;font-size:11px;color:#1a1d2e">${paymentMethodText}</span>
              <span style="font-size:9px;color:#8892a4">${paymentMethodSub}</span>
            </div>

            <span class="biz-cell biz-small" style="font-size:10px">${date}</span>

            <span class="biz-cell" style="font-size:11px;font-weight:500;color:#1a1d2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${activityText}</span>

            <div>
              <div class="biz-status-badge ${badgeClass}" style="padding:2px 6px;font-size:9px">
                ${badgeIcon}
                ${badgeText}
              </div>
            </div>

            <div style="display:flex;gap:4px;align-items:center">
              ${isWait ? `
                <button class="biz-icon-btn send-btn" data-tid="${p._id}" style="background:#5b6ef5;color:#fff;width:auto;padding:0 6px;font-size:10px;font-weight:700">${t("send")}</button>
                <button class="biz-icon-btn del-btn" data-tid="${p._id}" style="background:#fee2e2;color:#ef4444;width:auto;padding:0 6px;" title="${t("cancel")}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
              ` : `
                <button class="biz-icon-btn receipt-btn" data-tid="${p._id}" style="background:#e0f2fe;color:#0284c7;width:auto;padding:0 6px;" title="Chekni ko'rish">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </button>
                <button class="biz-icon-btn qr-btn" data-tid="${p._id}" style="background:#fef3c7;color:#d97706;width:auto;padding:0 6px;" title="QR kod orqali ko'rish">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                </button>
              `}
            </div>
          </div>
        </div>`;
      }).join("")
    : `<p class="biz-empty">${t("no_docs_found")}</p>`;



  el.querySelectorAll(".send-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openPaymentModal(btn.dataset.tid);
    };
  });

  el.querySelectorAll(".receipt-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openReceiptModal(btn.dataset.tid);
    };
  });

  el.querySelectorAll(".qr-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openQRModal(btn.dataset.tid);
    };
  });

  el.querySelectorAll(".del-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const confirmed = await showConfirmModal(t("cancel_confirm_msg"));
      if (!confirmed) return;
      try {
        await apiFetch(`/api/payments/transactions/${btn.dataset.tid}`, { method: "DELETE" });
        myTransactions = myTransactions.filter(t => t._id !== btn.dataset.tid);
        renderDocsMini();
        refreshStats();
        loadPaymentData(); // run in background
        showToast(t("cancelled_success"), "success");
      } catch (err) {
        alert(err.message);
      }
    };
  });
};

let cPage = 1, cFiltered = [];
const renderClientsFull = () => {
  cFiltered = [...paymentUsers];
  const total = cFiltered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (cPage > pages) cPage = pages;
  const start = (cPage - 1) * PAGE, slice = cFiltered.slice(start, start + PAGE);
  const el = $("clients-full-list");
  if (!el) return;
  el.innerHTML = slice.length
    ? slice.map((u) => `
      <div class="biz-row clients-cols">
        <div class="biz-user-cell">
          ${avatarHTML(u, 34)}
          <div>
            <p class="biz-user-name">${u.username || "—"}</p>
            <p class="biz-user-phone">${u.tel || u.email || "—"}</p>
          </div>
        </div>
        <span class="biz-cell">${u.transactionsCount || 0}</span>
        <span class="biz-cell" style="color:#22c55e">${u.paidCount || 0}</span>
        <span class="biz-cell" style="font-weight:700;color:#5b6ef5">${fmt(u.totalBalance)}</span>
        <span class="biz-cell biz-small">${u.tel || u.email || "—"}</span>
        <div class="biz-row-actions"></div>
      </div>`).join("")
    : `<p class="biz-empty">${t("no_users_found")}</p>`;
  if ($("cp-info")) $("cp-info").textContent = `${total === 0 ? 0 : start + 1}–${Math.min(start + PAGE, total)} ${t("of")} ${total}`;
  if ($("cp-num")) $("cp-num").textContent = cPage;
};

let dPage = 1, dFiltered = [];
const expandedTxIds = new Set();

const renderDocsFull = (statusF = "", numF = "") => {
  const me = getCurrent();
  const userId = me?.userId || me?._id;
  dFiltered = myTransactions.filter((p) => {
    const isIn = p.receiverId === userId && p.status === "paid";
    const matchS = !statusF || (statusF === "incoming" ? isIn : (statusF === "waiting" ? p.status === "waiting" && p.senderId === userId : p.status === statusF && p.senderId === userId));
    const matchN = !numF || (p.description || "").toLowerCase().includes(numF.toLowerCase()) || (p.receiverName || "").toLowerCase().includes(numF.toLowerCase());
    return matchS && matchN;
  }).reverse();
  const total = dFiltered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (dPage > pages) dPage = pages;
  const start = (dPage - 1) * PAGE, slice = dFiltered.slice(start, start + PAGE);
  const el = $("docs-full-list");
  if (!el) return;

  el.innerHTML = slice.length
    ? slice.map((p) => {
        const isIn = p.receiverId === userId && p.status === "paid";
        const isWait = p.status === "waiting" && p.senderId === userId;
        const expanded = expandedTxIds.has(p._id);
        const isSent = p.senderId === userId;
        const isInternal = p.senderId === userId && p.receiverId === userId;
        
        const badgeClass = p.status === "paid" ? "biz-status-success" : (isWait ? "biz-status-pending" : "biz-status-failed");
        const badgeText = p.status === "paid" ? t("status_success") : (isWait ? t("status_incomplete") : t("status_failed"));
        const badgeIcon = p.status === "paid" 
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
            : (isWait 
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`);

        const d = new Date(p.createdAt);
        const date = isWait ? "-" : `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        const time = isWait ? "-" : d.toLocaleTimeString();
        
        const amountColor = isSent ? "#1a1d2e" : "#16a34a";
        const amountSign = isSent ? "- " : "+ ";
        
        let activityText = isSent ? `${t("sending_payment_to")} ${p.receiverName || "User"}` : `${t("received_payment_from")} ${p.senderName || "User"}`;
        if (p.receiverId === "system_tour") activityText = p.description || "Tur xaridi";
        if (isInternal) activityText = t("internal_transfer");
        
        const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
        const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;
        let myMethodUsed = isSent ? myMethods.find(m => m._id === sId) : myMethods.find(m => m._id === rId);
        let paymentMethodText = "-";
        let paymentMethodSub = "";
        if (myMethodUsed) {
           const methodType = myMethodUsed.type === "card" ? t("method_card_via") : t("method_bank_via");
           const last4 = myMethodUsed.number ? myMethodUsed.number.slice(-4) : "****";
           paymentMethodText = methodType;
           paymentMethodSub = `**** ${last4}`;
        }

        let typeBg = isSent ? '#fee2e2' : '#dcfce7';
        let typeColor = isSent ? '#ef4444' : '#16a34a';
        let typeIcon = isSent 
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>` 
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`;
        let typeText = isSent ? t("type_sent") : t("type_received");

        if (isInternal) {
            typeBg = "#f3e8ff";
            typeColor = "#9333ea";
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>`;
            typeText = t("internal_transfer");
        }

        if (p.receiverId === "system_tour") {
            typeBg = "rgba(91, 110, 245, 0.15)";
            typeColor = "#5b6ef5";
            typeText = "Sayohat";
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
        }

        return `
        <div class="biz-doc-row-wrap${expanded ? " expanded" : ""}">
          <div class="biz-row docs-cols">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:24px;height:24px;border-radius:50%;background:${typeBg};color:${typeColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${typeIcon}
              </div>
              <span style="font-weight:600;font-size:13px;color:#1a1d2e">${typeText}</span>
            </div>

            <span class="biz-cell" style="font-weight:700;color:${amountColor}">${amountSign}${fmt(p.amount)}</span>

            <div style="display:flex;flex-direction:column;gap:2px">
              <span style="font-weight:600;font-size:12px;color:#1a1d2e">${paymentMethodText}</span>
              <span style="font-size:10px;color:#8892a4">${paymentMethodSub}</span>
            </div>

            <span class="biz-cell biz-small">${date}</span>

            <span class="biz-cell" style="font-size:12px;font-weight:500;color:#1a1d2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${activityText}</span>

            <div>
              <div class="biz-status-badge ${badgeClass}">
                ${badgeIcon}
                ${badgeText}
              </div>
            </div>

            <div style="display:flex;gap:5px;align-items:center">
              ${isWait ? `<button class="biz-icon-btn send-btn" data-tid="${p._id}" style="background:#5b6ef5;color:#fff;width:auto;padding:0 9px;font-size:11px;font-weight:700">${t("send")}</button>` : ""}
              ${!isWait ? `<button class="biz-icon-btn receipt-btn" data-tid="${p._id}" style="background:#e0f2fe;color:#0284c7" title="Chekni ko'rish"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button><button class="biz-icon-btn qr-btn" data-tid="${p._id}" style="background:#fef3c7;color:#d97706" title="QR orqali ko'rish"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg></button>` : ""}
              <button class="biz-icon-btn expand-btn" data-tid="${p._id}" style="background:#f1f3fa;color:#5a6279">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="${expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          ${expanded ? `
          <div class="biz-doc-expanded">
            <div class="biz-exp-footer">
              <div class="biz-exp-footer-item">
                <span class="biz-exp-label">${t("create_time")}</span>
                <span class="biz-exp-val">
                  <span class="biz-exp-date-badge">📅 ${date}</span>
                  <span class="biz-exp-time-badge">🕐 ${time}</span>
                </span>
              </div>
              <div class="biz-exp-footer-item">
                <span class="biz-exp-label">${t("description")}</span>
                <span class="biz-exp-val biz-exp-desc-text">${activityText}</span>
              </div>
              <div class="biz-exp-footer-item">
                <span class="biz-exp-label">${isSent ? t("label_to") : t("label_from")}</span>
                <span class="biz-exp-val">${isSent ? (p.receiverName || "—") : (p.senderName || "—")}</span>
              </div>
              <div class="biz-exp-footer-item biz-exp-total">
                <span class="biz-exp-label">${t("total_amount")}</span>
                <span class="biz-exp-total-val" style="color:${amountColor}">${amountSign}${fmt(p.amount)}</span>
              </div>
            </div>
          </div>` : ""}
        </div>`;
      }).join("")
    : `<p class="biz-empty">${t("no_docs_found")}</p>`;

  if ($("dp-info")) $("dp-info").textContent = `${total === 0 ? 0 : start + 1}–${Math.min(start + PAGE, total)} ${t("of")} ${total}`;
  if ($("dp-num")) $("dp-num").textContent = dPage;

  el.querySelectorAll(".expand-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const tid = btn.dataset.tid;
      if (expandedTxIds.has(tid)) expandedTxIds.delete(tid);
      else { expandedTxIds.clear(); expandedTxIds.add(tid); }
      renderDocsFull(statusF, numF);
    };
  });

  el.querySelectorAll(".receipt-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openReceiptModal(btn.dataset.tid);
    };
  });

  el.querySelectorAll(".qr-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openQRModal(btn.dataset.tid);
    };
  });

  el.querySelectorAll(".send-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openPaymentModal(btn.dataset.tid);
    };
  });
};

// ─── VIEW SWITCHER ──────────────────────────────────────────────
const showView = (name) => {
  const dashboard = $("view-dashboard");
  const clients = $("view-clients");
  const docs = $("view-docs");
  const dashRight = document.querySelector(".biz-dash-right");
  const bizRoot = document.querySelector(".biz-root");
  const statsRow = document.querySelector(".biz-stats-row");
  const header = document.querySelector(".biz-header");
  if (name === "view-dashboard") {
    dashboard.style.display = "flex";
    clients.style.display = "none";
    docs.style.display = "none";
    if (dashRight) dashRight.style.display = "flex";
    if (bizRoot) bizRoot.classList.remove("full-width");
    if (statsRow) statsRow.style.display = "flex";
    if (header) header.style.display = "";
  } else if (name === "view-clients") {
    dashboard.style.display = "none";
    clients.style.display = "flex";
    docs.style.display = "none";
    if (dashRight) dashRight.style.display = "none";
    if (bizRoot) bizRoot.classList.add("full-width");
    if (statsRow) statsRow.style.display = "none";
    if (header) header.style.display = "none";
  } else if (name === "view-docs") {
    dashboard.style.display = "none";
    clients.style.display = "none";
    docs.style.display = "flex";
    if (dashRight) dashRight.style.display = "none";
    if (bizRoot) bizRoot.classList.add("full-width");
    if (statsRow) statsRow.style.display = "none";
    if (header) header.style.display = "none";
  }
};

// ─── PREMIUM PAYMENT MODAL ──────────────────────────────────────
let activeTransactionId = null;
let selRecipMethodId = null;
let pendingPayment = null;
let foundReceiverUser = null;
let pmtUserPage = 1;
let pmtUserPageSize = 10;

const renderPmtUsers = () => {
   const el = $("pmt-all-users-list");
   if (!el) return;
   
   const total = paymentUsers.length;
   const pages = Math.max(1, Math.ceil(total / pmtUserPageSize));
   if (pmtUserPage > pages) pmtUserPage = pages;
   
   const start = (pmtUserPage - 1) * pmtUserPageSize;
   const slice = paymentUsers.slice(start, start + pmtUserPageSize);
   
   el.innerHTML = slice.length ? slice.map(u => `
      <div class="pmt-user-row" data-uid="${u.userId || u._id}">
         <div class="pmt-user-row-avatar">${u.username ? u.username.charAt(0).toUpperCase() : "?"}</div>
         <div class="pmt-user-row-info">
            <p class="pmt-user-row-name">${u.username || "—"}</p>
            <p class="pmt-user-row-phone">${u.tel || u.email || "—"}</p>
         </div>
      </div>
   `).join("") : `<p class="biz-empty">${t("no_users_found") || "Foydalanuvchilar topilmadi"}</p>`;
   
   if ($("pmt-user-num")) $("pmt-user-num").textContent = pmtUserPage;
   if ($("pmt-user-prev")) $("pmt-user-prev").disabled = pmtUserPage <= 1;
   if ($("pmt-user-next")) $("pmt-user-next").disabled = pmtUserPage >= pages;
   
   el.querySelectorAll(".pmt-user-row").forEach(row => {
      row.onclick = () => {
         const uid = row.dataset.uid;
         const rec = paymentUsers.find(u => (u.userId || u._id) === uid);
         if (rec) {
            foundReceiverUser = rec;
            showReceiverStep(rec);
         }
      };
   });
};

const showModalStep = (stepId) => {
  const modal = document.querySelector(".pmt-modal");
  const activeSteps = Array.from(document.querySelectorAll(".pmt-step")).filter(el => el.style.display === "flex" || el.style.display === "block");
  
  if (activeSteps.length > 0 && modal && !activeSteps.includes($(stepId))) {
      // 1. Fix current height before fading out
      const startHeight = modal.offsetHeight;
      modal.style.height = startHeight + "px";
      modal.style.overflow = "hidden";
      modal.style.transition = "none"; // disable transition temporarily
      
      // Fade out old content
      activeSteps.forEach(el => {
          el.style.transition = "opacity 0.15s ease";
          el.style.opacity = "0";
      });
      
      setTimeout(() => {
          // 2. Hide old, show new
          activeSteps.forEach(el => el.style.display = "none");
          const step = $(stepId);
          if (step) {
              step.style.opacity = "0";
              step.style.display = "flex";
          }
          
          // 3. Set new max-width without animating yet
          if (stepId === "pmt-step-sms" || stepId === "pmt-step-success") {
              modal.style.maxWidth = "480px";
          } else {
              modal.style.maxWidth = "900px";
          }
          
          // 4. Measure new natural height
          modal.style.height = "auto";
          const endHeight = modal.offsetHeight;
          modal.style.height = startHeight + "px"; // snap back to start
          
          // Force reflow
          void modal.offsetHeight;
          
          // 5. Animate height and width
          modal.style.transition = "height 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), max-width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
          modal.style.height = endHeight + "px";
          
          // 6. Fade in new content
          setTimeout(() => {
              if (step) {
                  step.style.transition = "opacity 0.25s ease";
                  step.style.opacity = "1";
              }
          }, 100);

          // 7. Cleanup after animations
          setTimeout(() => {
              modal.style.height = "auto";
              modal.style.overflow = "visible";
              modal.style.transition = "max-width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
          }, 350);
          
      }, 150);
  } else {
      document.querySelectorAll(".pmt-step").forEach(el => { 
          el.style.display = "none"; 
          el.style.opacity = "1"; 
      });
      const step = $(stepId);
      if (step) {
          step.style.display = "flex";
          step.style.opacity = "1";
      }
      if (modal) {
          if (stepId === "pmt-step-sms" || stepId === "pmt-step-success") {
              modal.style.maxWidth = "480px";
          } else {
              modal.style.maxWidth = "900px";
          }
      }
  }
};

const openPaymentModal = (txId) => {
  activeTransactionId = txId;
  selRecipMethodId = null;
  pendingPayment = null;
  foundReceiverUser = null;
  
  $("pmt-modal-overlay").style.display = "flex";
  showModalStep("pmt-step-1");
  if ($("pmt-back-to-users")) $("pmt-back-to-users").classList.remove("visible");
  
  $("pmt-search-val").value = "";
  $("pmt-search-error").textContent = "";

  pmtUserPage = 1;
  renderPmtUsers();

  if (txId !== "new") {
    const tx = myTransactions.find((t) => t._id === txId);
    if (!tx) return;

    if (tx.receiverId && tx.receiverId !== "draft") {
       const rec = paymentUsers.find((u) => (u.userId || u._id) === tx.receiverId);
       if (rec) {
          foundReceiverUser = rec;
          showReceiverStep(rec);
       }
    }
  }
};

const closePaymentModal = () => {
  $("pmt-modal-overlay").style.display = "none";
  activeTransactionId = null;
  selRecipMethodId = null;
  pendingPayment = null;
  foundReceiverUser = null;
};

const openQRModal = (txId) => {
  const qrModal = $("qr-modal");
  if (!qrModal) return;
  const tx = myTransactions.find((t) => t._id === txId);
  if (!tx) return;

  const d = new Date(tx.paidAt || tx.createdAt);
  const dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  
  // Format amount
  const isSent = tx.senderId === (getCurrent().userId || getCurrent()._id);
  const amtStr = `${isSent ? "-" : "+"}${tx.amount.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})} USD`;

  // Generate plain text receipt
  const receiptText = `Woorkroom - Tranzaksiya Cheki\n` +
                      `-----------------------\n` +
                      `Sana: ${dateStr}\n` +
                      `Summa: ${amtStr}\n` +
                      `Tranzaksiya ID: ${tx._id.slice(-10).toUpperCase()}\n` +
                      `Kimdan: ${tx.senderName || "—"}\n` +
                      `Kimga: ${tx.receiverName || "—"}`;

  // Agar lokal kompyuterda test qilayotgan bo'lsangiz, localhost o'rniga Vercel manzili chiqishi uchun:
  let baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'https://woorkroom-five.vercel.app' 
      : window.location.origin;

  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const txShortId = tx._id.slice(-10).toUpperCase();
  const qrUrl = `${baseUrl}/receipt.html?txId=${encodeURIComponent(txShortId)}&date=${encodeURIComponent(dateStr)}&amount=${encodeURIComponent(amtStr)}&sender=${encodeURIComponent(tx.senderName || "—")}&receiver=${encodeURIComponent(tx.receiverName || "—")}`;
  $("qr-code-img").style.display = "none";
  $("qr-code-img").src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;
  qrModal.style.display = "flex";
};

const openReceiptModal = (txId) => {
  const tx = myTransactions.find((t) => t._id === txId);
  if (!tx) return;

  const me = getCurrent();
  const userId = me?.userId || me?._id;
  const isSent = tx.senderId === userId;
  const isInternal = tx.senderId === userId && tx.receiverId === userId;
  
  const senderMethodObj = typeof tx.senderMethodId === 'object' && tx.senderMethodId !== null ? tx.senderMethodId : myMethods.find(m => m._id === tx.senderMethodId);
  const receiverMethodObj = typeof tx.receiverMethodId === 'object' && tx.receiverMethodId !== null ? tx.receiverMethodId : myMethods.find(m => m._id === tx.receiverMethodId);

  let senderMethodText = "Karta / Hisob";
  let receiverMethodText = "Karta / Hisob";

  if (senderMethodObj && senderMethodObj.number) {
    const last4 = senderMethodObj.number.slice(-4);
    senderMethodText = `${senderMethodObj.type === "card" ? "Karta" : "Bank"} **** ${last4}`;
  }
  if (receiverMethodObj && receiverMethodObj.number) {
    const last4 = receiverMethodObj.number.slice(-4);
    receiverMethodText = `${receiverMethodObj.type === "card" ? "Karta" : "Bank"} **** ${last4}`;
  }
  
  if (tx.receiverId === "system_tour") {
     receiverMethodText = "Sayohat tizimi";
  }

  const d = new Date(tx.paidAt || tx.createdAt);
  $("receipt-date").textContent = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  
  const formattedAmt = fmt(tx.amount);
  const parts = formattedAmt.split(".");
  
  $("receipt-amount-int").textContent = isSent ? "- " + (parts[0] || "$0") : "+ " + (parts[0] || "$0");
  $("receipt-amount-dec").textContent = parts.length > 1 ? "." + parts[1] : ".00";
  
  $("receipt-total").textContent = formattedAmt;
  
  if (isInternal) {
      $("receipt-type").textContent = t("internal_transfer") || "O'z hisobiga o'tkazma";
      $("receipt-sender").textContent = senderMethodText;
      $("receipt-receiver").textContent = receiverMethodText;
      $("receipt-sender-card").textContent = "Mening hisobim";
      $("receipt-receiver-card").textContent = "Mening hisobim";
  } else {
      $("receipt-type").textContent = isSent ? (t("type_sent") || "Yuborilgan") : (t("type_received") || "Qabul qilingan");
      $("receipt-sender").textContent = tx.senderName || "—";
      $("receipt-receiver").textContent = tx.receiverName || "—";
      $("receipt-sender-card").textContent = senderMethodText;
      $("receipt-receiver-card").textContent = receiverMethodText;
  }
  
  $("receipt-tx-id").textContent = tx._id.slice(-10).toUpperCase();

  $("receipt-modal").style.display = "flex";
};

// Step 1: Search
document.addEventListener("DOMContentLoaded", () => {
  // We need to attach events carefully, or just define them on window / inline if they don't exist.
  // Wait, since this is an SPA module, we can attach to document or specifically inside init.
  // It's safer to attach inside initBusinessLogic. But we can define the functions here.
});

const showReceiverStep = (user, specificMethodId = null) => {
  showModalStep("pmt-step-2-3");
  if ($("pmt-back-to-users")) $("pmt-back-to-users").classList.add("visible");
  
  $("pmt-found-user").innerHTML = `
    <div class="pmt-user-avatar">${user.username ? user.username.charAt(0).toUpperCase() : "?"}</div>
    <div>
      <h3 style="margin:0 0 4px; font-size:16px;">${user.username}</h3>
      <p style="margin:0; font-size:13px; color:#8892a4;">${user.tel || user.email || ""}</p>
    </div>
  `;
  
  const methods = user.paymentMethods || [];
  
  const cardSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
  const bankSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11m-8-11v11m-4-11v11m8-11v11"/></svg>`;

  $("pmt-receiver-methods").innerHTML = methods.length ? methods.map(m => {
    // If specificMethodId is provided, ONLY show that method
    if (specificMethodId && m._id !== specificMethodId) return "";
    return `
    <div class="pmt-method-card ${specificMethodId === m._id ? "selected" : ""}" data-id="${m._id}">
       <div class="pmt-method-icon">${m.type === "card" ? cardSvg : bankSvg}</div>
       <div class="pmt-method-info">
          <p class="pmt-method-name">${m.displayNumber || m.number}</p>
          <p class="pmt-method-sub">${m.bank || t("method_account") || "Hisob"}</p>
       </div>
    </div>`;
  }).join("") : `<p style="color:#8892a4; font-size:13px;">${t("no_type_methods")}</p>`;
  
  if (specificMethodId) {
    selRecipMethodId = specificMethodId;
  } else {
    selRecipMethodId = null;
  }

  const checkNextStepReady = () => {
     const amount = parseFloat($("pmt-amount").value.replace(/[\s,]/g, ""));
     const senderSelected = window.currentSenderMethodSelection ? window.currentSenderMethodSelection() : null;
     if (selRecipMethodId && senderSelected && !isNaN(amount) && amount > 0) {
        $("pmt-next-3").disabled = false;
     } else {
        $("pmt-next-3").disabled = true;
     }
  };
  
  document.querySelectorAll("#pmt-receiver-methods .pmt-method-card").forEach(el => {
    el.onclick = () => {
       document.querySelectorAll("#pmt-receiver-methods .pmt-method-card").forEach(c => c.classList.remove("selected"));
       el.classList.add("selected");
       selRecipMethodId = el.dataset.id;
       checkNextStepReady();
    };
  });

  const tx = activeTransactionId && activeTransactionId !== "new" ? myTransactions.find((t) => t._id === activeTransactionId) : null;
  if (tx?.amount) {
    $("pmt-amount").value = Number(tx.amount).toLocaleString("en-US").replace(/\..*/, "");
  } else {
    $("pmt-amount").value = "";
  }
  $("pmt-amount").oninput = (e) => {
    let val = e.target.value.replace(/[^\d]/g, "");
    e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    checkNextStepReady();
  };
  
  renderSenderMethods(checkNextStepReady);
};

const renderSenderMethods = (onChangeCallback) => {
   const cardSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
   const bankSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11m-8-11v11m-4-11v11m8-11v11"/></svg>`;

   $("pmt-sender-methods").innerHTML = myMethods.length ? myMethods.map(m => `
    <div class="pmt-method-card" data-id="${m._id}">
       <div class="pmt-method-icon">${m.type === "card" ? cardSvg : bankSvg}</div>
       <div class="pmt-method-info">
          <p class="pmt-method-name">${m.displayNumber || m.number}</p>
          <p class="pmt-method-sub">${m.bank || t("method_account") || "Hisob"} — ${fmt(m.balance)}</p>
       </div>
    </div>
   `).join("") : `<p style="color:#8892a4; font-size:13px;">${t("err_no_funds")}</p>`;
   
   let selectedMyMethod = null;
   window.currentSenderMethodSelection = () => selectedMyMethod;
   
   document.querySelectorAll("#pmt-sender-methods .pmt-method-card").forEach(el => {
      el.onclick = () => {
         document.querySelectorAll("#pmt-sender-methods .pmt-method-card").forEach(c => c.classList.remove("selected"));
         el.classList.add("selected");
         selectedMyMethod = el.dataset.id;
         if (onChangeCallback) onChangeCallback();
      };
   });

   if (onChangeCallback) onChangeCallback();
};

// ─── PUSHER REAL-TIME ───────────────────────────────────────────
const initPusher = () => {
  const me = getCurrent();
  if (!me || !window.Pusher || pusherChannel) return;

  const userId = me.userId || me._id;
  const client = new window.Pusher("a1030ba785c6160c84e2", { cluster: "ap2" });
  pusherChannel = client.subscribe(`user-${userId}`);

  pusherChannel.bind("new-transaction", (data) => {
    const tx = data.transaction;
    // Skip toast for internal transfers (self to self)
    if (tx.senderId !== tx.receiverId) {
      showToast(`💰 ${tx.senderName} ${fmt(tx.amount)} to'lov yaratdi`, "success");
    }
    loadPaymentData().then(() => { refreshStats(); renderDocsMini(); renderAccounts(); });
  });

  pusherChannel.bind("transaction-completed", (data) => {
    const tx = data.transaction;
    // Skip toast for internal transfers — the manual toast already handles it
    if (tx.senderId !== tx.receiverId) {
      showToast(`✅ ${fmt(tx.amount)} to'lov amalga oshirildi`, "success");
    }
    loadPaymentData().then(() => { refreshStats(); renderDocsMini(); renderAccounts(); });
  });

  pusherChannel.bind("method-added", () => {
    loadPaymentData().then(() => { renderAccounts(); refreshStats(); });
  });

  pusherChannel.bind("method-deleted", () => {
    loadPaymentData().then(() => { renderAccounts(); refreshStats(); });
  });
};

// ─── TRANSLATE UI ─────────────────────────────────────────────
const translateUI = () => {
  const el = (id, txt) => {
    const e = $(id);
    if (e && txt) {
       // if element has children like a loader or icon, we might overwrite them if we just set textContent.
       // Let's be careful. Most elements here are simple buttons or spans.
       // For buttons with spans, let's select the span if it exists.
       const span = e.querySelector(".btn-text");
       if (span) span.textContent = txt;
       else e.textContent = txt;
    }
  };
  const ph = (id, txt) => {
    const e = $(id);
    if (e && txt) e.placeholder = txt;
  };
  
  el("pmt-modal-title", t("new_transfer"));
  
  const tabs = document.querySelectorAll(".pmt-tab");
  if (tabs[0]) tabs[0].textContent = t("search_card_tab");
  if (tabs[1]) tabs[1].textContent = t("search_phone_tab");
  
  const searchBtnText = document.querySelector("#pmt-search-btn .btn-text");
  if (searchBtnText) searchBtnText.textContent = t("search_btn");
  el("pmt-next-2", t("next_step"));
  el("pmt-next-3", t("proceed"));
  el("pmt-sms-confirm", t("sms_confirm"));
  el("pmt-sms-back", t("go_back"));
  el("pmt-success-close", t("return_dashboard"));
  
  el("dm-cancel", t("cancel"));
  el("dm-save", t("create_btn"));
  el("cm-cancel", t("cancel"));
  el("cm-save", t("save"));
  
  const welcome = document.querySelector(".biz-welcome");
  if (welcome) welcome.textContent = t("payment_title");
  
  const h3Docs = document.querySelector("#view-dashboard .biz-card-head h3");
  if (h3Docs) h3Docs.textContent = t("documents");
  
  const h3DocsFull = document.querySelector("#view-docs .biz-card-head h3");
  if (h3DocsFull) h3DocsFull.textContent = t("documents");
  
  const h3Users = document.querySelector("#view-clients .biz-card-head h3");
  if (h3Users) h3Users.textContent = t("all_users");
  
  el("mini-create-doc-btn", t("create"));
  el("create-doc-btn", t("create"));
  el("ts-confirm", t("transfer_btn"));
  el("back-clients", t("back"));
  el("back-docs", t("back"));
  el("add-card-btn", t("add_card"));
  
  ph("doc-num-search", t("search_placeholder"));
  ph("pmt-search-val", t("search_placeholder_pmt"));
  ph("dm-amount", t("amount_dollar"));
  ph("dm-desc", t("write_description"));
  ph("cm-holder", t("full_name"));
  
  const headers = document.querySelectorAll(".docs-cols span");
  if (headers.length >= 7) {
    headers[0].textContent = t("col_type");
    headers[1].textContent = t("col_amount");
    headers[2].textContent = t("col_payment_method");
    headers[3].textContent = t("col_date");
    headers[4].textContent = t("col_activity");
    headers[5].textContent = t("col_status");
    headers[6].textContent = t("col_action");
    
    if (headers.length >= 14) {
      headers[7].textContent = t("col_type");
      headers[8].textContent = t("col_amount");
      headers[9].textContent = t("col_payment_method");
      headers[10].textContent = t("col_date");
      headers[11].textContent = t("col_activity");
      headers[12].textContent = t("col_status");
      headers[13].textContent = t("col_action");
    }
  }
  
  const clientHeaders = document.querySelectorAll(".clients-cols span");
  if (clientHeaders.length >= 5) {
    clientHeaders[0].textContent = t("col_user");
    clientHeaders[1].textContent = t("col_total_payments");
    clientHeaders[2].textContent = t("col_total_paid");
    clientHeaders[3].textContent = t("col_balance");
    clientHeaders[4].textContent = t("col_email_phone");
  }
  
  const filter = $("doc-status-filter");
  if (filter && filter.options) {
     filter.options[0].textContent = t("all_status");
     filter.options[1].textContent = t("pending");
     filter.options[2].textContent = t("confirmed");
     filter.options[3].textContent = t("incoming");
  }

  const pmtStepDescs = document.querySelectorAll(".pmt-step-desc");
  if (pmtStepDescs[0]) pmtStepDescs[0].textContent = t("search_receiver_title");
  if (pmtStepDescs[1]) pmtStepDescs[1].textContent = t("choose_receiver_card");
  if (pmtStepDescs[2]) pmtStepDescs[2].textContent = t("transfer_details");
  if (pmtStepDescs[3]) pmtStepDescs[3].textContent = t("choose_sender_card");
  
  const smsTitle = $("pmt-sms-title");
  if (smsTitle) smsTitle.textContent = t("sms_title");
};

// ─── INIT ───────────────────────────────────────────────────────
export const initBusinessLogic = async () => {
  const currentLang = getCurrentLang();

  if ($("docs-mini")) {
    $("docs-mini").innerHTML = `<div style="display:flex;justify-content:center;padding:40px;"><div class="pmt-spinner"></div></div>`;
  }
  if ($("accounts-list")) {
    $("accounts-list").innerHTML = `<div style="display:flex;justify-content:center;padding:40px;"><div class="pmt-spinner"></div></div>`;
  }

  // Load all data from server
  await loadPaymentData();

  refreshStats();
  renderAccounts();
  renderDocsMini();

  $("close-qr-btn")?.addEventListener("click", () => ($("qr-modal").style.display = "none"));
  $("qr-modal")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) $("qr-modal").style.display = "none"; });

  const urlParams = new URLSearchParams(window.location.search);
  const receiptId = urlParams.get('receipt');
  if (receiptId) {
      setTimeout(() => openReceiptModal(receiptId), 300);
      window.history.replaceState({}, document.title, window.location.pathname);
  }
  // Language event
  document.addEventListener(LANGUAGE_CHANGED_EVENT, () => {
    translateUI();
    renderAccounts();
    renderDocsMini();
    renderDocsFull();
    renderClientsFull();
    refreshStats();
  });

  // Initialize Pusher
  initPusher();

  // ── View navigation ──
  $("back-clients")?.addEventListener("click", () => { showView("view-dashboard"); });
  $("btn-view-docs")?.addEventListener("click", () => { showView("view-docs"); dPage = 1; renderDocsFull(); });
  $("back-docs")?.addEventListener("click", () => { showView("view-dashboard"); renderDocsMini(); });
  $("mp-prev")?.addEventListener("click", () => { if (mPage > 1) { mPage--; renderDocsMini(); } });
  $("mp-next")?.addEventListener("click", () => {
     const total = myTransactions.length;
     if (mPage < Math.ceil(total / MINI_PAGE)) { mPage++; renderDocsMini(); }
  });

  $("cp-prev")?.addEventListener("click", () => { if (cPage > 1) { cPage--; renderClientsFull(); } });
  $("cp-next")?.addEventListener("click", () => { if (cPage < Math.ceil(cFiltered.length / PAGE)) { cPage++; renderClientsFull(); } });
  $("doc-status-filter")?.addEventListener("change", (e) => { dPage = 1; renderDocsFull(e.target.value, $("doc-num-search")?.value || ""); });
  $("doc-num-search")?.addEventListener("input", (e) => { dPage = 1; renderDocsFull($("doc-status-filter")?.value || "", e.target.value); });
  $("dp-prev")?.addEventListener("click", () => { if (dPage > 1) { dPage--; renderDocsFull(); } });
  $("dp-next")?.addEventListener("click", () => { if (dPage < Math.ceil(dFiltered.length / PAGE)) { dPage++; renderDocsFull(); } });

  // ── Create document ──
  const handleCreateDraft = (e) => {
    openPaymentModal("new");
  };
  $("create-doc-btn")?.addEventListener("click", handleCreateDraft);
  $("mini-create-doc-btn")?.addEventListener("click", handleCreateDraft);
  
  // Tab switching
  let currentSearchType = "card";
  document.querySelectorAll(".pmt-tab").forEach(tab => {
     tab.addEventListener("click", () => {
        document.querySelectorAll(".pmt-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentSearchType = tab.dataset.type;
        $("pmt-search-val").value = "";
        if (currentSearchType === "card") $("pmt-search-val").placeholder = "0000 0000 0000 0000";
        else if (currentSearchType === "phone") $("pmt-search-val").placeholder = "+998 90 123 45 67";
        else $("pmt-search-val").placeholder = "Foydalanuvchi nomi";
     });
  });

  if ($("pmt-search-btn")) {
    $("pmt-search-btn").addEventListener("click", () => {
      const query = $("pmt-search-val").value.trim().replace(/\s/g, "");
      if (!query) return;
      
      $("pmt-search-error").textContent = "";
      
      const btn = $("pmt-search-btn");
      const btnText = btn.querySelector(".btn-text");
      const btnLoader = btn.querySelector(".btn-loader");
      
      btnText.style.display = "none";
      btnLoader.style.display = "block";
      btn.disabled = true;
      
      setTimeout(() => {
        btnText.style.display = "block";
        btnLoader.style.display = "none";
        btn.disabled = false;
        
        let rec = null;
        let specificMethodId = null;
        
        for (const u of paymentUsers) {
           if (currentSearchType === "phone") {
             const phoneQuery = query.replace(/\D/g, "");
             const matchesPhone = phoneQuery.length > 0 && u.tel && u.tel.replace(/\D/g, "").includes(phoneQuery);
             const matchesEmail = u.email && u.email.toLowerCase() === query.toLowerCase();
             if (matchesPhone || matchesEmail) {
               rec = u;
               specificMethodId = null; // show all methods
               break;
             }
           } else if (currentSearchType === "card") {
             const meth = u.paymentMethods?.find(m => m.number && m.number.replace(/\D/g, "") === query);
             if (meth) {
                rec = u;
                specificMethodId = meth._id;
                break;
             }
           } else if (currentSearchType === "username") {
             if (u.username && u.username.toLowerCase() === query.toLowerCase()) {
                rec = u; specificMethodId = null; break;
             }
           }
        }
        
        if (rec) {
          foundReceiverUser = rec;
          showReceiverStep(rec, specificMethodId);
        } else {
          $("pmt-search-error").textContent = t("receiver_not_found") || "Receiver not found.";
        }
      }, 800); // 800ms fake loading animation for search
    });
  }

  if ($("pmt-user-prev")) {
     $("pmt-user-prev").addEventListener("click", () => {
        if (pmtUserPage > 1) { pmtUserPage--; renderPmtUsers(); }
     });
  }
  if ($("pmt-user-next")) {
     $("pmt-user-next").addEventListener("click", () => {
        const total = paymentUsers.length;
        if (pmtUserPage < Math.ceil(total / pmtUserPageSize)) { pmtUserPage++; renderPmtUsers(); }
     });
  }
  
  const customPageSize = $("pmt-page-size-custom");
  if (customPageSize) {
     const trigger = customPageSize.querySelector(".biz-select-trigger");
     const valSpan = $("pmt-page-size-val");
     trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        customPageSize.classList.toggle("open");
     });
     document.addEventListener("click", () => { customPageSize.classList.remove("open"); });
     customPageSize.querySelectorAll(".biz-option").forEach(opt => {
        opt.addEventListener("click", (e) => {
           const v = e.target.dataset.val;
           valSpan.textContent = v;
           pmtUserPageSize = parseInt(v, 10);
           pmtUserPage = 1;
           renderPmtUsers();
        });
     });
  }

  if ($("pmt-back-to-users")) {
     $("pmt-back-to-users").addEventListener("click", () => {
        if ($("pmt-step-sms") && $("pmt-step-sms").style.display === "flex") {
           showModalStep("pmt-step-2-3");
           $("pmt-back-to-users").classList.add("visible");
        } else {
           showModalStep("pmt-step-1");
           $("pmt-back-to-users").classList.remove("visible");
        }
     });
  }

  if ($("pmt-next-3")) {
    $("pmt-next-3").addEventListener("click", () => {
      $("pmt-step3-error").textContent = "";
      const amount = parseFloat($("pmt-amount").value.replace(/[\s,]/g, ""));
      if (isNaN(amount) || amount <= 0) {
         $("pmt-step3-error").textContent = t("err_valid_amount"); return;
      }
      const selectedMyMethod = window.currentSenderMethodSelection ? window.currentSenderMethodSelection() : null;
      const myMeth = myMethods.find(m => m._id === selectedMyMethod);
      if (!myMeth) { $("pmt-step3-error").textContent = t("err_select_method"); return; }
      if (myMeth.balance < amount) { $("pmt-step3-error").textContent = t("err_insufficient"); return; }
      
      pendingPayment = {
         amount,
         senderMethodId: selectedMyMethod,
         receiverMethodId: selRecipMethodId,
         receiverId: foundReceiverUser.userId || foundReceiverUser._id
      };
      
      showModalStep("pmt-step-sms");
      
      const me = getCurrent();
      const phone = me?.tel || me?.email || "***";
      const masked = phone.length > 4 ? phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4) : "****";
      $("pmt-sms-desc").textContent = (t("sms_desc") || "Raqamingizga SMS yuborildi:") + " " + masked;
      ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].forEach(id => { $(id).value = ""; $(id).style.borderColor = ""; });
      $("pmt-sms-error").textContent = "";
      setTimeout(() => $("pmt-sms-1").focus(), 100);
    });
  }

  const pmtInputs = ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].map(id => $(id));
  if (pmtInputs[0]) {
    pmtInputs.forEach((inp, i) => {
       inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/, ""); if (inp.value && i < 3) pmtInputs[i + 1].focus(); });
       inp.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !inp.value && i > 0) pmtInputs[i - 1].focus(); });
    });
  }

  if ($("pmt-sms-back")) {
    $("pmt-sms-back").addEventListener("click", () => {
       showModalStep("pmt-step-2-3");
    });
  }

  if ($("pmt-sms-confirm")) {
    $("pmt-sms-confirm").addEventListener("click", async () => {
       const code = ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].map(id => $(id).value).join("");
       if (code !== "1234") {
          $("pmt-sms-error").textContent = t("sms_wrong_code") || "Kod noto'g'ri. 1234 kiriting.";
          ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].forEach(id => { $(id).style.borderColor = "#ef4444"; });
          return;
       }
       
       try {
          $("pmt-sms-confirm").classList.add("loading");
          await apiFetch(`/api/payments/send/${activeTransactionId}`, {
            method: "POST",
            body: JSON.stringify({
              senderMethodId: pendingPayment.senderMethodId,
              receiverMethodId: pendingPayment.receiverMethodId,
              amount: pendingPayment.amount,
              description: pendingPayment.desc,
              receiverId: pendingPayment.receiverId,
            }),
          });
          showModalStep("pmt-step-success");
          loadPaymentData().then(() => {
             refreshStats();
             renderDocsFull();
             renderDocsMini();
             renderAccounts();
          });
       } catch (e) {
          $("pmt-sms-error").textContent = e.message;
       } finally {
          $("pmt-sms-confirm").classList.remove("loading");
       }
    });
  }

  if ($("pmt-success-close")) {
    $("pmt-success-close").addEventListener("click", () => {
       closePaymentModal();
       refreshStats();
       renderDocsFull();
       renderDocsMini();
       renderAccounts();
    });
  }

  if ($("pmt-close")) $("pmt-close").addEventListener("click", closePaymentModal);
  if ($("pmt-modal-overlay")) $("pmt-modal-overlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) closePaymentModal(); });

  // Update existing row action listeners
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".biz-action-btn");
    if (btn && btn.dataset.action === "send") {
      openPaymentModal(btn.dataset.tid);
    }
  });

  // ── Add card ──
  $("add-card-btn")?.addEventListener("click", () => {
    ["cm-number", "cm-holder", "cm-expiry", "cm-balance"].forEach((id) => { $(id).value = ""; $(id).style.borderColor = ""; });
    if ($("cm-card-type")) $("cm-card-type").value = "Humo";
    $("card-modal").style.display = "flex";
  });
  $("cm-number")?.addEventListener("input", (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = raw.match(/.{1,4}/g)?.join(" ") || raw;
  });
  $("cm-expiry")?.addEventListener("input", (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = raw.length >= 3 ? raw.slice(0, 2) + "/" + raw.slice(2) : raw;
  });
  $("cm-cancel")?.addEventListener("click", () => ($("card-modal").style.display = "none"));
  $("del-card-cancel")?.addEventListener("click", () => ($("del-card-modal").style.display = "none"));
  $("del-card-modal")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) $("del-card-modal").style.display = "none"; });
  $("card-modal")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.style.display = "none"; });
  
  $("close-receipt-btn")?.addEventListener("click", () => ($("receipt-modal").style.display = "none"));
  $("download-receipt-btn")?.addEventListener("click", () => {
    if (typeof html2pdf === 'undefined') {
      alert("PDF yuklab olish kutubxonasi hali yuklanmadi. Iltimos biroz kuting yoki sahifani yangilang.");
      return;
    }

    const receipt = $("receipt-content-to-print");
    const txId = $("receipt-tx-id").textContent || "chek";

    // Create A4 wrapper with receipt centered inside
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed; top:0; left:0; z-index:-9999; width:794px; min-height:1123px; background:#f4f5f7; display:flex; align-items:flex-start; justify-content:center; padding:80px 0; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif;";

    // Clone receipt and style it inside the page
    const clone = receipt.cloneNode(true);
    clone.style.cssText = "background:#fff; width:340px; border-radius:16px; padding:36px 28px 28px; box-shadow:0 2px 12px rgba(0,0,0,0.08); border:1.5px solid #e2e8f0;";
    // Remove the mask (causes rendering issues in pdf)
    clone.style.webkitMaskImage = "none";
    clone.style.maskImage = "none";

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const opt = {
      margin:       0,
      filename:     `Tolov_cheki_${txId}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#f4f5f7', width: 794, height: 1123, windowWidth: 794, windowHeight: 1123, x: 0, y: 0, scrollX: 0, scrollY: 0 },
      jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] }
    };

    html2pdf().set(opt).from(wrapper).save().then(() => {
      document.body.removeChild(wrapper);
    });
  });
  $("receipt-modal")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) $("receipt-modal").style.display = "none"; });

  $("cm-save")?.addEventListener("click", async () => {
    const raw = $("cm-number").value.trim().replace(/\s/g, "");
    const holder = $("cm-holder").value.trim();
    const expiry = $("cm-expiry").value.trim();
    const cardName = $("cm-card-type")?.value || "Humo";

    let hasError = false;
    if (raw.length !== 16) { $("cm-number").style.borderColor = "#ef4444"; hasError = true; } else { $("cm-number").style.borderColor = ""; }
    if (holder.length < 3) { $("cm-holder").style.borderColor = "#ef4444"; hasError = true; } else { $("cm-holder").style.borderColor = ""; }
    if (expiry.length !== 5) { $("cm-expiry").style.borderColor = "#ef4444"; hasError = true; } else { $("cm-expiry").style.borderColor = ""; }
    if (hasError) return;

    try {
      const newMethod = await apiFetch("/api/payments/methods", {
        method: "POST",
        body: JSON.stringify({
          type: "card",
          cardName,
          number: raw.replace(/(.{4})/g, "$1 ").trim(),
          displayNumber: raw.slice(0, 4) + " **** **** " + raw.slice(-4),
          holder,
          expiry,
          balance: parseFloat($("cm-balance").value.replace(/[\s,]/g, "")) || 0,
        }),
      });
      myMethods.push(newMethod);
      $("card-modal").style.display = "none";
      renderAccounts();
      refreshStats();
      showToast("Karta qo'shildi ✓", "success");
    } catch (e) {
      alert(e.message);
    }
  });

  initCardSettingsModal();
};

// ── Card Settings Modal Logic ──
const openCardSettingsModal = (card) => {
  const modal = $("card-settings-modal");
  if(!modal) return;
  
  const label = card.cardName || (card.type === "card" ? "VISA" : "BANK");
  const fullNum = (card.number || card.displayNumber || "0000 0000 0000 0000").replace(/\s/g, "");
  let formatted = fullNum;
  if (fullNum.length > 8) {
    const start = fullNum.substring(0, 4);
    const end = fullNum.substring(fullNum.length - 4);
    const midLen = fullNum.length - 8;
    const mask = "*".repeat(midLen).match(/.{1,4}/g)?.join("  ") || "****";
    formatted = `${start}  ${mask}  ${end}`;
  } else {
    formatted = fullNum.match(/.{1,4}/g)?.join("  ") || fullNum;
  }
  const fullNumSpaced = fullNum.match(/.{1,4}/g)?.join(" ") || fullNum;

  $("cs-card-preview").innerHTML = `
    <div class="biz-acc-card ${card.type === "card" ? "card-grad" : "bank-grad"}" style="min-height:170px; margin:0; padding:20px; color:#fff; border-radius:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 10px 20px rgba(0,0,0,0.15);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-nfc-icon lucide-nfc"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
        <span style="font-size:14px;font-weight:700;letter-spacing:1.5px;opacity:.9">${label}</span>
      </div>
      <div style="margin:20px 0;">
        <span style="font-size:16px;font-weight:700;letter-spacing:2px">${formatted}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div style="text-align:left">
          <p style="font-size:9px;opacity:.55;margin:0;text-transform:uppercase;letter-spacing:.5px">BALANCE</p>
          <p style="font-size:18px;font-weight:700;margin:4px 0 0">${fmt(card.balance)}</p>
        </div>
      </div>
    </div>
  `;

  $("cs-full-number").textContent = fullNumSpaced;
  $("cs-expiry").textContent = card.expiry || card.bank || "—";
  $("cs-holder").textContent = card.holder || "—";
  
  if ($("cs-expiry-container")) {
    $("cs-expiry-container").style.display = card.type === "bank" ? "none" : "block";
  }
  
  $("cs-details-content").style.maxHeight = "0";
  $("cs-details-content").style.padding = "0 16px";
  $("cs-eye-icon").innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  
  const delBtn = $("cs-delete-card-btn");
  if (delBtn) {
    delBtn.style.display = card.isDefault ? "none" : "flex";
    delBtn.onclick = () => {
      modal.style.display = "none";
      $("del-card-title").textContent = t("delete_card_title") || "Kartani o'chirish";
      $("del-card-desc").textContent = t("delete_card_desc") || "Haqiqatan ham ushbu kartani o'chirmoqchimisiz?";
      $("del-card-cancel").textContent = t("cancel") || "Bekor qilish";
      $("del-card-confirm").textContent = t("delete_confirm_btn") || "O'chirish";
      $("del-card-modal").style.display = "flex";
      const confirmBtn = $("del-card-confirm");
      const newConfirm = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
      newConfirm.onclick = async () => {
        $("del-card-modal").style.display = "none";
        try {
          await apiFetch(`/api/payments/methods/${card._id}`, { method: "DELETE" });
          myMethods = myMethods.filter((m) => m._id !== card._id);
          renderAccounts();
          refreshStats();
        } catch (e) {
          showToast(e.message, "error");
        }
      };
    };
  }

  modal.style.display = "flex";
};

const initCardSettingsModal = () => {
  if($("cs-close")) {
    $("cs-close").onclick = () => {
      $("card-settings-modal").style.display = "none";
    };
  }
  
  if($("cs-toggle-details")) {
    $("cs-toggle-details").onclick = () => {
      const content = $("cs-details-content");
      const eye = $("cs-eye-icon");
      if(content.style.maxHeight === "0px" || !content.style.maxHeight) {
        content.style.maxHeight = "300px";
        content.style.padding = "0 16px 16px 16px";
        eye.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
      } else {
        content.style.maxHeight = "0";
        content.style.padding = "0 16px";
        eye.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
      }
    };
  }

  document.querySelectorAll(".cs-copy-btn").forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const text = $(targetId).textContent;
      navigator.clipboard.writeText(text.replace(/\s/g, ""));
      showToast("Nusxa olindi!", "success");
    };
  });
};

// ── Self Transfer Logic ──
const openSelfTransferModal = () => {
    const modal = $("ts-modal");
    if (!modal) return;
    
    // We need at least 2 cards
    if (myMethods.length < 2) return;
    
    let senderCard = myMethods[0];
    let receiverCard = myMethods[1];

    const renderCardSelect = (containerId, selectedMethod) => {
        const container = $(containerId);
        container.innerHTML = `
            <div class="ts-custom-select" style="margin:0; position:relative; border-radius:12px;">
                <div class="ts-select-trigger" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px; font-weight:700; color:#1e293b; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:14px;">${selectedMethod.type === "card" ? selectedMethod.cardName : "Hisob"} ${selectedMethod.number ? " • " + selectedMethod.number.slice(-4) : ""}</span>
                        <span style="font-size:12px; color:#64748b; font-weight:500; margin-top:2px;">${t("account_balance")}: ${selectedMethod.balance.toLocaleString('en-US').replace(/,/g, ' ')} UZS</span>
                    </div>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#8892a4" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
                <div class="ts-options" style="display:none; position:absolute; width:100%; top:100%; left:0; margin-top:6px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; z-index:50; box-shadow:0 10px 25px rgba(0,0,0,0.1); overflow:hidden;">
                    ${myMethods.map(m => `
                        <div class="ts-option" data-value="${m._id}" style="padding:12px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;">
                            <div style="font-weight:700; font-size:14px; color:#1e293b; pointer-events:none;">${m.type === "card" ? m.cardName : "Hisob"} ${m.number ? " • " + m.number.slice(-4) : ""}</div>
                            <div style="font-size:12px; color:#64748b; font-weight:500; margin-top:2px; pointer-events:none;">${t("account_balance")}: ${m.balance.toLocaleString('en-US').replace(/,/g, ' ')} UZS</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
        
        const selDiv = container.querySelector(".ts-custom-select");
        const trigger = selDiv.querySelector(".ts-select-trigger");
        const optionsDiv = selDiv.querySelector(".ts-options");
        
        trigger.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll(".ts-options").forEach(el => {
                if (el !== optionsDiv) el.style.display = "none";
            });
            optionsDiv.style.display = optionsDiv.style.display === "none" ? "block" : "none";
        };
        
        selDiv.querySelectorAll(".ts-option").forEach(opt => {
            opt.onmouseenter = () => opt.style.background = "#f8fafc";
            opt.onmouseleave = () => opt.style.background = "#fff";
            
            opt.onclick = (e) => {
                e.stopPropagation();
                const newId = opt.getAttribute("data-value");
                const newMethod = myMethods.find(x => x._id === newId);
                if (containerId === "ts-sender-card-container") {
                    if (newMethod._id === receiverCard._id) receiverCard = senderCard;
                    senderCard = newMethod;
                } else {
                    if (newMethod._id === senderCard._id) senderCard = receiverCard;
                    receiverCard = newMethod;
                }
                optionsDiv.style.display = "none";
                updateCardSelects();
            };
        });
    };

    const updateCardSelects = () => {
        renderCardSelect("ts-sender-card-container", senderCard);
        renderCardSelect("ts-receiver-card-container", receiverCard);
    };

    updateCardSelects();
    $("ts-amount").value = "";
    $("ts-error").style.display = "none";
    
    modal.style.display = "flex";
    
    $("ts-swap-btn").onclick = () => {
        const temp = senderCard;
        senderCard = receiverCard;
        receiverCard = temp;
        updateCardSelects();
    };

    $("ts-close").onclick = () => modal.style.display = "none";
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; };

    $("ts-confirm").onclick = async () => {
        const amount = parseFloat($("ts-amount").value.replace(/[\s,]/g, ""));
        if (!amount || amount <= 0) {
            $("ts-error").textContent = t("invalid_amount") || "Noto'g'ri summa kiritildi";
            $("ts-error").style.display = "block";
            return;
        }
        if (amount > senderCard.balance) {
            $("ts-error").textContent = t("insufficient_balance") || "Balans yetarli emas";
            $("ts-error").style.display = "block";
            return;
        }
        
        const btn = $("ts-confirm");
        const oldTxt = btn.innerHTML;
        btn.innerHTML = `<span class="ts-spinner"></span>`;
        btn.disabled = true;
        btn.style.opacity = "0.7";

        try {
            // Internal transfer logic uses execution endpoint directly with a new transaction
            const currentUserId = getCurrent().userId || getCurrent()._id;
            
            const res = await fetch(`${API_URL}/api/payments/send/new`, {
                method: "POST",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    senderMethodId: senderCard._id,
                    receiverMethodId: receiverCard._id,
                    amount: amount,
                    description: t("internal_transfer") || "O'z hisobiga o'tkazma",
                    receiverId: currentUserId // Transfer to self
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Xatolik yuz berdi");
            }
            
            showToast(t("transaction_success") || "Muvaffaqiyatli o'tkazildi", "success");
            modal.style.display = "none";
            // Refresh data without full page re-render that breaks button handlers
            await loadPaymentData();
            refreshStats();
            renderDocsMini();
            renderAccounts();
        } catch(err) {
            $("ts-error").textContent = err.message;
            $("ts-error").style.display = "block";
        } finally {
            btn.innerHTML = oldTxt;
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    };
};
