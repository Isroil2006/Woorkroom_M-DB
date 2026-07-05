
import { translations } from "./translations.js";
import { getCurrentUser, getAuthHeaders, fetchCurrentUser, API_URL } from "../../assets/js/api.js";
import { getCurrentLang, createTranslationHelper, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";
import { showNotification } from "../../components/Notification/notification.js";
import { initResponsive, bindMiniRowClicks, bindFullRowClicks } from "./payment_responsive.js";

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
let blockedCardIds = new Set();

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
    myMethods = methods.sort((a, b) => (b.isDefault === true ? 1 : 0) - (a.isDefault === true ? 1 : 0));
    blockedCardIds = new Set(myMethods.filter(m => m.isBlocked === true).map(m => m._id));
    myTransactions = transactions;
    myStats = stats;
    paymentUsers = users;
  } catch (e) {
    console.error("Payment data load error:", e);
  }
};

// ─── FORMAT HELPERS ─────────────────────────────────────────────
const fmt = (n, isVisaOrCurrency = false) => {
  // Accept boolean (legacy) or currency string "USD"/"UZS"
  const isUSD = isVisaOrCurrency === true || isVisaOrCurrency === "USD";
  const formatted = Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isUSD ? formatted + " USD" : formatted + " UZS";
};
const fmtCardBalance = (n, isVisa = false) => {
   if (isVisa) {
     return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   }
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
          <button class="biz-btn-secondary" id="btn-view-all-cards" style="height:32px; padding:0 12px; font-size:12px; border-radius:10px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer;">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            ${t("view_all_cards")}
          </button>
        </div>
        <button class="biz-btn-primary" id="mini-create-doc-btn" style="height:32px; padding:0 14px; font-size:12px;">${t("create")}</button>
        <span class="mobile-barchasi-link" id="mobile-barchasi" style="display:none; font-size:14px; color:#5b6ef5; font-weight:600; cursor:pointer;">Barchasi &rsaquo;</span>
      </div>
      <div class="biz-full-table-header docs-cols mini-table-header">
        <span>${t("col_type")}</span>
        <span>${t("col_amount")}</span>
        <span>${t("col_date")}</span>
        <span>${t("col_sender")}</span>
        <span>${t("col_receiver")}</span>
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
          <button class="biz-back-btn" id="back-docs" style="display:flex;align-items:center;justify-content:center;gap:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" style="flex-shrink:0;"><path d="m15 18-6-6 6-6"/></svg>
            <span>${t("back")}</span>
          </button>
          <h3>${t("documents")}</h3>
        </div>
        <button class="biz-btn-primary" id="create-doc-btn">${t("create")}</button>
      </div>
      <div class="biz-doc-filters" id="full-doc-filters-container"></div>
      <div class="biz-full-table-header docs-cols">
        <span>${t("col_type")}</span>
        <span>${t("col_amount")}</span>
        <span>${t("col_date")}</span>
        <span>${t("col_sender")}</span>
        <span>${t("col_receiver")}</span>
        <span>${t("col_action")}</span>
      </div>
      <div id="docs-full-list" style="flex:1;overflow-y:auto;"></div>
      <div id="docs-pagination-container" class="biz-pagination"></div>
    </div>
  </div>

  <div id="view-all-cards" style="display:none; flex:1; flex-direction:column; overflow:hidden;">
    <div class="biz-card" style="height:100%; display:flex; flex-direction:column;">
      
      <!-- Card Head -->
      <div class="biz-card-head" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom: 1px solid #f0f2fa; padding: 16px 20px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="biz-back-btn" id="back-all-cards">${t("back")}</button>
          <h3 style="font-size:18px; font-weight:700; color:#1a1d2e;">${t("all_accounts_and_cards")}</h3>
        </div>
      </div>

      <!-- Filters & Analytics Banner -->
      <div class="biz-doc-filters" style="display:flex; justify-content:space-between; align-items:center; padding: 14px 20px; border-bottom: 1px solid #f8fafc; flex-wrap:wrap; gap:12px; background:#fafbff;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <!-- Filter Select Type -->
          <div class="custom-select" id="all-cards-type-filter-custom" style="font-size: 14px;">
            <div class="selected" style="font-size: 14px; padding: 8px 12px; border-radius: 9px; gap: 8px;">
                <span id="all-cards-filter-text">${t("all")}</span>
                <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <ul class="options" style="font-size: 14px; min-width: 140px; right: auto; left: 0;">
                <li data-value="">${t("all")}</li>
                <li data-value="Humo">Humo</li>
                <li data-value="Uzcard">Uzcard</li>
                <li data-value="Visa">Visa</li>
                <li data-value="Bank">${t("bank_account_type")}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Split Layout for Grid and Card Details -->
      <div style="flex:1; display:flex; min-height:0; overflow:hidden; padding: 20px; border-radius: 24px; background-color: #fff;">
        
        <!-- Left Column: Cards List Grid -->
        <div id="all-cards-grid-container" style="flex: 1.8; border-radius: 24px; background-color: #EEF0FD; overflow-y:auto; padding:20px; display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px; border-right:1px solid #f0f2fa; align-content:start;">
          <!-- Generated Cards list -->
        </div>

        <!-- line -->
        <div style="width: 1px; height: 100%; background-color: #e2e8f0; margin: 0 50px;"></div>

        <!-- Right Column: Card Detailed Inspector -->
        <div id="all-cards-inspector" style="flex: 1.2; overflow-y:auto; padding:20px; background-color: #EEF0FD; border-radius: 24px; display:flex; flex-direction:column; gap:20px;">
          <!-- If no card selected -->
          <div id="all-cards-no-selection" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#8892a4; padding:40px 20px; background-color:#EEF0FD;">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.6;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <p style="font-weight:600; margin:0 0 4px; font-size:14px; color:#1a1d2e;">${t("card_no_selection_title")}</p>
            <p style="font-size:12px; margin:0;">${t("card_no_selection_desc")}</p>
          </div>
          
          <!-- Card details panel (will be generated dynamically) -->
          <div id="all-cards-details-panel" style="display:none; flex-direction:column; gap:20px;">
             <!-- Details content here -->
          </div>
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
  <div class="pmt-modal" style="padding:0 !important; overflow:hidden; max-width:600px;">
    <div class="pmt-modal-header" style="padding:16px 20px; border-bottom:1px solid #f1f5f9; margin-bottom:0; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap: 12px;">
        <button class="biz-back-icon-btn" id="pmt-back-to-users">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 id="pmt-modal-title" style="font-size:18px; font-weight:700; color:#1a1d2e; margin:0;">${t("new_transfer")}</h2>
      </div>
      <button class="biz-close-btn" id="pmt-close" style="background:#f1f5f9; color:#64748b;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a'" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>

    <!-- Step 1: Search & Users List -->
    <div id="pmt-step-1" class="pmt-step" style="padding:20px; min-height:480px; display:flex; flex-direction:column;">
      <p class="pmt-step-desc" style="margin-top:0;">${t("search_receiver_title")}</p>
      
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

      <div id="pmt-all-users-list" class="pmt-users-list no-scrollbar" style="flex:1; min-height:250px;"></div>
      
      <div class="pmt-pagination-bar" style="margin-top:auto; padding-top:12px;">
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

    <!-- Step 2-3: Combined Side-by-side (O'z hisobiga o'tkazma style) -->
    <div id="pmt-step-2-3" class="pmt-step" style="display:none; width:100%; flex-direction:row !important; padding:0 !important; overflow:hidden;">
      
      <!-- Left Column: Form -->
      <div style="flex:1; padding:20px 24px; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; gap:16px; min-height:480px;">
          <!-- Receiver info card header -->
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px; padding:12px; background:#f8fafc; border-radius:16px; border:1px solid #e2e8f0;">
             <div class="pmt-user-avatar" id="pmt-found-avatar" style="width:36px; height:36px; border-radius:50%; background:#4F46E5; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;">?</div>
             <div>
                <h4 style="margin:0; font-size:15px; font-weight:700; color:#0f172a;" id="pmt-found-name">Loading...</h4>
                <p style="margin:2px 0 0; font-size:12px; color:#64748b;" id="pmt-found-contact"></p>
             </div>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:12px;">
              <div>
                  <label style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:6px; display:block;">Yuboruvchi karta (Qayerdan)</label>
                  <div id="pmt-sender-box" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"></div>
              </div>

              <div>
                  <label style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:6px; display:block;">Qabul qiluvchi karta (Qayerga)</label>
                  <div id="pmt-receiver-box" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"></div>
              </div>
          </div>

          <!-- Amount -->
          <div style="padding-top:4px;">
              <label style="color:#0f172a; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:6px; display:block;">O'TKAZMA SUMMASI</label>
              <div style="display:flex; align-items:baseline; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
                  <input type="text" id="pmt-amount" placeholder="0" style="background:transparent; border:none; font-size:32px; font-weight:700; color:#0f172a; width:100%; outline:none;" />
                  <span class="pmt-currency" style="font-size:18px; font-weight:700; color:#5b6ef5;">UZS</span>
              </div>
              <p id="pmt-step3-error" style="color:#ef4444; font-size:13px; margin:8px 0 0; font-weight:500; min-height:18px;"></p>
          </div>

          <!-- Confirm Button -->
          <div style="margin-top:auto;">
              <button class="biz-btn-primary pmt-next-btn" id="pmt-next-3" style="background:#2563eb; color:#fff; width:100%; border-radius:16px; font-size:15px; font-weight:700; border:none; padding:14px; cursor:pointer; transition:0.2s; box-shadow:0 8px 16px rgba(37,99,235,0.15); display:flex; justify-content:center; align-items:center; gap:8px;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'" disabled>
                <span class="btn-text">${t("proceed")}</span>
                <div class="btn-loader pmt-spinner-small" style="display:none;"></div>
              </button>
          </div>
      </div>

      <!-- Right Column: Selection List -->
      <div id="pmt-right-panel" style="width:300px; border-bottom-right-radius:24px; background:#f8fafc; padding:20px; display:flex; flex-direction:column; min-height:480px;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h4 id="pmt-right-title" style="margin:0; font-size:15px; font-weight:700; color:#0f172a;">${t("choose_card_title")}</h4>
         </div>
         <div id="pmt-right-list" class="ts-options-scroll" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px; max-height:380px;">
             <!-- Rendered by JS -->
         </div>
      </div>
      
    </div>

    <!-- Step 4: SMS -->
    <div id="pmt-step-sms" class="pmt-step" style="display:none; text-align:center; padding:30px 24px;">
       <div class="pmt-sms-icon" style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); margin:0 auto;">
         <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
       </div>
       <h3 id="pmt-sms-title" style="margin:16px 0 6px; font-size:18px; font-weight:800;">Email tasdiqlash</h3>
       <p id="pmt-sms-desc" style="color:#8892a4; font-size:13px; margin:0 0 15px; line-height:1.5;"></p>
       
       <p id="pmt-sms-timer" style="color:#ef4444; font-weight:bold; font-size:14px; margin-bottom:15px;"></p>
       
       <div style="display:flex; gap:12px; justify-content:center; margin-bottom: 20px;">
         <input id="pmt-sms-1" class="biz-otp-input" maxlength="1" inputmode="numeric" />
         <input id="pmt-sms-2" class="biz-otp-input" maxlength="1" inputmode="numeric" />
         <input id="pmt-sms-3" class="biz-otp-input" maxlength="1" inputmode="numeric" />
         <input id="pmt-sms-4" class="biz-otp-input" maxlength="1" inputmode="numeric" />
       </div>
       
       <p id="pmt-sms-error" class="biz-error" style="margin-bottom:15px;"></p>
       <button id="pmt-sms-resend" style="background:none; border:none; color:#4F46E5; font-size:14px; font-weight:600; cursor:pointer; text-decoration:underline; display:none; margin-bottom:15px;">Qayta yuborish</button>
       <button class="biz-btn-primary" id="pmt-sms-confirm" style="width:100%; margin-bottom:12px; background-color:#2563eb; color:#ffffff;">Tasdiqlash</button>
    </div>

    <!-- Step 5: Success -->
    <div id="pmt-step-success" class="pmt-step" style="display:none; text-align:center; padding: 40px 24px 30px;">
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
    <div style="display:flex; gap:0;">
      <div style="flex:1;">
        <label class="biz-label">${t("card_number")}</label>
        <input class="biz-input" id="cm-number" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric" />
        <div id="cm-card-detector" style="margin-top:8px; display:flex; align-items:center; gap:8px; display:none;">
          <div id="cm-detected-card" style="font-size:12px; font-weight:600; padding:4px 8px; border-radius:6px; background:#f1f5f9; color:#475569;"></div>
          <span id="cm-number-error" class="biz-error" style="font-size:12px; display:none;">Faqat Humo, Uzcard yoki Visa kiriting</span>
        </div>
      </div>
      <div id="cm-cvv-container" style="width:80px; overflow:hidden; transition:max-width 0.4s ease, opacity 0.4s ease, margin-left 0.4s ease; max-width:0; opacity:0; margin-left:0;">
        <label class="biz-label">CVV</label>
        <input class="biz-input" id="cm-cvv" placeholder="123" maxlength="3" inputmode="numeric" oninput="this.value=this.value.replace(/[^0-9]/g,'')" />
      </div>
    </div>
    <label class="biz-label">${t("card_holder")}</label>
    <input class="biz-input" id="cm-holder" placeholder="${t("full_name")}" />
    <div style="display:flex;gap:12px">
      <div style="flex:1"><label class="biz-label">${t("expiry")}</label><input class="biz-input" id="cm-expiry" placeholder="05/27" maxlength="5" inputmode="numeric"/></div>
      <div style="flex:1">
        <label class="biz-label">${t("balance")}</label>
        <div style="position:relative; display:flex; align-items:center;">
          <input class="biz-input" type="text" id="cm-balance" placeholder="0" oninput="this.value = this.value.replace(/[^\\d]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')" style="padding-right: 45px; width: 100%; box-sizing: border-box;"/>
          <span id="cm-currency-label" style="position:absolute; right:12px; font-size:14px; color:#64748b; font-weight:600; pointer-events:none;">UZS</span>
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
  <div class="biz-modal" style="width:100%; max-width:720px; border-radius: 24px; padding:24px; background:#fff; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.1); animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both; display:block;">
    <button id="cs-close" style="position:absolute; top:16px; right:16px; background:#f1f5f9; border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:all 0.2s; z-index:10;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <h3 style="margin:0 0 24px; font-size:18px; font-weight:800; color:#1e293b;">${t("card_details_title")}</h3>
    
    <div style="display:flex; gap:24px; align-items:stretch; flex-wrap:wrap;">
      <div style="flex:1; min-width:300px; display:flex; flex-direction:column;">
        <div id="cs-card-preview" style="margin-bottom:0; flex:1;"></div>
      </div>

      <div style="flex:1; min-width:300px; display:flex; flex-direction:column; gap:16px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          <div id="cs-toggle-details" style="padding:16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:#f1f5f9; transition:background 0.2s;">
            <span style="font-size:14px; font-weight:600; color:#334155;">${t("full_details_title")}</span>
            <button style="background:transparent; border:none; color:#64748b; display:flex; align-items:center; justify-content:center; cursor:pointer;">
              <svg id="cs-eye-icon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <div id="cs-details-content" style="padding:0 16px; max-height:0; overflow:hidden; transition:max-height 0.3s ease, padding 0.3s ease;">
            <div style="padding:16px 0; display:flex; flex-direction:column; gap:12px;">
              <div>
                <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">${t("card_number")}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                  <span id="cs-full-number" style="font-size:14px; font-weight:700; color:#1e293b; font-family:monospace; letter-spacing:1px;"></span>
                  <button class="cs-copy-btn" data-target="cs-full-number" style="background:transparent; border:none; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="Nusxa olish">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              <div id="cs-expiry-container">
                <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">${t("expiry_date")}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                  <span id="cs-expiry" style="font-size:14px; font-weight:700; color:#1e293b;"></span>
                  <button class="cs-copy-btn" data-target="cs-expiry" style="background:transparent; border:none; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="Nusxa olish">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              <div id="cs-cvv-container" style="display:none;">
                <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">CVV</p>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                  <span id="cs-cvv" style="font-size:14px; font-weight:700; color:#1e293b;"></span>
                  <button class="cs-copy-btn" data-target="cs-cvv" style="background:transparent; border:none; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="Nusxa olish">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              <div>
                <p style="font-size:12px; color:#64748b; margin:0 0 4px; font-weight:500;">${t("holder")}</p>
                <div style="background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                  <span id="cs-holder" style="font-size:14px; font-weight:700; color:#1e293b;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button id="cs-delete-card-btn" class="biz-btn-primary" style="width:100%; margin-top:auto; background:#fee2e2; color:#ef4444; border:none; display:flex; align-items:center; justify-content:center; gap:8px;">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          ${t("delete_card")}
        </button>
      </div>
    </div>
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
<div id="ts-modal" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px); background:rgba(15, 23, 42, 0.4); z-index:9999;">
  <div class="biz-modal" style="width:100%; max-width:820px; border-radius:24px; animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; background:#fff; box-shadow:0 24px 48px rgba(0,0,0,0.1); position:relative; display:flex; flex-direction:row !important; padding:0 !important; overflow:hidden;">
      
     <button class="biz-close-btn" id="ts-close" style="position:absolute; top:20px; right:20px; background:#f4f5f7; border:none; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#64748b; cursor:pointer; transition:0.2s; z-index:20;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a'" onmouseout="this.style.background='#f4f5f7'; this.style.color='#64748b'">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
     </button>

     <!-- Left Column: Form -->
     <div style="flex:1; padding:32px 40px; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; gap:24px;">
         <h3 style="margin:0; font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.5px;">${t("transfer_to_self")}</h3>
         
         <div style="display:flex; flex-direction:column; gap:16px; position:relative;">
             <div>
                 <label style="color:#64748b; font-size:12px; font-weight:700; text-transform:uppercase; margin-bottom:8px; display:block;">${t("from_card")}</label>
                 <div id="ts-sender-box" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"></div>
             </div>

             <div style="width:36px; height:36px; border-radius:50%; background:#fff; border:1px solid #e2e8f0; position:absolute; right:20px; top:calc(50% + 12px); transform:translateY(-50%); display:flex; align-items:center; justify-content:center; z-index:10; color:#0f172a; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                <button id="ts-swap-btn" style="background:transparent; border:none; padding:0; display:flex; cursor:pointer; color:inherit; width:100%; height:100%; justify-content:center; align-items:center;">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
                </button>
             </div>

             <div>
                 <label style="color:#64748b; font-size:12px; font-weight:700; text-transform:uppercase; margin-bottom:8px; display:block;">${t("to_card")}</label>
                 <div id="ts-receiver-box" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"></div>
             </div>
         </div>

         <!-- Amount -->
         <div style="padding-top:8px;">
             <label style="color:#0f172a; font-size:13px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:12px; display:block;">${t("transfer_amount")}</label>
             <div style="display:flex; align-items:baseline; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
                 <input type="text" id="ts-amount" placeholder="0" style="background:transparent; border:none; font-size:40px; font-weight:700; color:#0f172a; width:100%; outline:none;" oninput="this.value = this.value.replace(/[^\\d]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')" />
                 <span id="ts-currency" style="font-size:20px; font-weight:700; color:#5b6ef5;">UZS</span>
             </div>
             <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span id="ts-commission" style="color:#64748b; font-size:13px; font-weight:500;">${t("commission")}: 0 UZS</span>
             </div>
             <p id="ts-error" style="color:#ef4444; font-size:13px; margin:12px 0 0; display:none; font-weight:500;"></p>
         </div>

         <!-- Confirm Button -->
         <div style="margin-top:auto;">
             <button class="biz-btn-primary" id="ts-confirm" style="background:#0f172a; color:#fff; width:100%; border-radius:16px; font-size:16px; font-weight:700; border:none; padding:16px; cursor:pointer; transition:0.2s; box-shadow:0 8px 16px rgba(15,23,42,0.15);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">${t("proceed")}</button>
         </div>
     </div>

     <!-- Right Column: Selection List -->
     <div id="ts-right-panel" style="width:360px; background:#f8fafc; padding:32px 24px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
           <h4 id="ts-right-title" style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">${t("choose_card_title")}</h4>
        </div>
        <div id="ts-right-list" class="ts-options-scroll" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-right:8px; max-height:450px;">
            <!-- Rendered by JS -->
        </div>
     </div>
  </div>
</div>

<!-- ══ CURRENCY EXCHANGE MODAL ══ -->
<div id="ce-modal" class="biz-overlay" style="display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px); background:rgba(15, 23, 42, 0.4); z-index:9999;">
  <div class="biz-modal" style="width:100%; max-width:820px; border-radius:24px; animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; background:#fff; box-shadow:0 24px 48px rgba(0,0,0,0.1); position:relative; display:flex; flex-direction:row !important; padding:0 !important; overflow:hidden;">
      
     <button class="biz-close-btn" id="ce-close" style="position:absolute; top:20px; right:20px; background:#f4f5f7; border:none; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#64748b; cursor:pointer; transition:0.2s; z-index:20;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a'" onmouseout="this.style.background='#f4f5f7'; this.style.color='#64748b'">
       <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
     </button>

     <!-- Left Column: Form -->
     <div style="flex:1; padding:32px 40px; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; gap:24px; max-width:460px;">
         <h3 style="margin:0; font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">${t("currency_exchange")}</h3>
         
         <div style="display:flex; flex-direction:column; gap:24px; position:relative;">
             <!-- Yuborish Box -->
             <div>
                 <label style="color:#64748b; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; display:block;">${t("from_card")}</label>
                 <div id="ce-sender-box" style="cursor:pointer;"></div>
             </div>

             <!-- Swap Button -->
             <button id="ce-swap-btn" style="position:absolute; top:50%; right:24px; transform:translateY(calc(-50% + 12px)); width:36px; height:36px; background:#fff; border:1px solid #e2e8f0; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; z-index:10; box-shadow:0 2px 8px rgba(0,0,0,0.05); color:#64748b; transition:0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.color='#0f172a'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.color='#64748b'">
                 <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
             </button>

             <!-- Qabul qilish Box -->
             <div>
                 <label style="color:#64748b; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; display:block;">${t("to_card")}</label>
                 <div id="ce-receiver-box" style="cursor:pointer;"></div>
             </div>
         </div>

         <!-- Amounts -->
         <div style="padding-top:8px;">
             <!-- Yuborish Summasi -->
             <label style="color:#0f172a; font-size:13px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:12px; display:block;">${t("amount_to_send")}</label>
             <div style="display:flex; align-items:baseline; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
                 <input type="text" id="ce-amount-send" placeholder="0" style="background:transparent; border:none; font-size:32px; font-weight:700; color:#0f172a; width:100%; outline:none;" oninput="this.value = this.value.replace(/[^\\d]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')" />
                 <span id="ce-currency-send" style="font-size:18px; font-weight:700; color:#5b6ef5;">UZS</span>
             </div>

             <!-- Qabul Qilish Summasi -->
             <label style="color:#0f172a; font-size:13px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:12px; display:block;">${t("amount_to_receive")}</label>
             <div style="display:flex; align-items:baseline; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
                 <input type="text" id="ce-amount-receive" placeholder="0" style="background:transparent; border:none; font-size:24px; font-weight:700; color:#64748b; width:100%; outline:none;" disabled />
                 <span id="ce-currency-receive" style="font-size:18px; font-weight:700; color:#64748b;">USD</span>
             </div>

             <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span style="color:#64748b; font-size:13px; font-weight:500;">${t("exchange_rate_label")}</span>
                 <span id="ce-rate-display" style="color:#0f172a; font-size:13px; font-weight:600;">1 USD = ... UZS</span>
             </div>
             <p id="ce-error" style="color:#ef4444; font-size:13px; margin:12px 0 0; display:none; font-weight:500;"></p>
         </div>

         <!-- Confirm Button -->
         <div style="margin-top:auto;">
             <button class="biz-btn-primary" id="ce-confirm" style="background:#0f172a; color:#fff; width:100%; border-radius:16px; font-size:16px; font-weight:700; border:none; padding:16px; cursor:pointer; transition:0.2s; box-shadow:0 8px 16px rgba(15,23,42,0.15);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">${t("exchange_btn")}</button>
         </div>
     </div>

     <!-- Right Column: Selection List -->
     <div id="ce-right-panel" style="width:360px; background:#f8fafc; padding:32px 24px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
           <h4 id="ce-right-title" style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">${t("choose_card_title")}</h4>
        </div>
        <div id="ce-right-list" class="ts-options-scroll" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-right:8px; max-height:500px;">
            <!-- Rendered by JS -->
        </div>
     </div>
  </div>
</div>

<!-- ══ NOTIFICATION TOAST ══ -->
`;

const $ = (id) => document.getElementById(id);
let PAGE = 5;

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

  const isVisa = currentMethod ? (currentMethod.cardName === "Visa" || String(currentMethod.number || "").startsWith("4")) : false;

  if ($("stat-waiting")) $("stat-waiting").textContent = fmt(expense, isVisa);
  if ($("stat-paid")) $("stat-paid").textContent = fmt(income, isVisa);
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
          <div class="biz-acc-card ${m.type === "card" ? "card-grad" : "bank-grad"}" style="min-height:170px; position:relative;">
            ${blockedCardIds.has(m._id) ? `
            <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.7); backdrop-filter:blur(3px); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; gap:8px; z-index:2; border-radius:16px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake-icon lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
              <span style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Karta muzlatilgan</span>
            </div>
            ` : ""}
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
                <p style="font-size:18px;font-weight:700;margin:4px 0 0">${fmtCardBalance(m.balance, m.cardName === "Visa")}</p>
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
    <div style="display:flex; justify-content:center; align-items:center; margin-top:16px; gap:12px;">
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
    </div>
    <div class="mobile-action-buttons-row" style="display: flex; gap: 10px; width: 100%; margin-top: 16px;">
      <button class="biz-btn-secondary" id="transfer-to-self-btn" style="flex: 1; display:flex; justify-content:center; align-items:center; gap:8px; margin:0;">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
        <span>${t("transfer_to_self")}</span>
      </button>
      <button class="biz-btn-primary" id="mobile-create-doc-btn" style="flex: 1; display: none; justify-content:center; align-items:center; gap:8px; background:#5b6ef5; color:#fff; border:none; padding:12px; border-radius:12px; font-weight:600; cursor:pointer; margin:0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        <span>To'lov</span>
      </button>
    </div>
    <button class="biz-btn-primary" id="currency-exchange-btn" style="width:100%; margin-top:10px; display:flex; justify-content:center; align-items:center; gap:8px; background:#5b6ef5; color:#fff; border:none; padding:12px; border-radius:12px; font-weight:600; cursor:pointer;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-right-icon lucide-arrow-left-right"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
      ${t("currency_exchange")}
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

  if ($("mobile-create-doc-btn")) {
    $("mobile-create-doc-btn").onclick = () => {
      openPaymentModal("new");
    };
  }

  if ($("currency-exchange-btn")) {
     $("currency-exchange-btn").onclick = () => {
         openCurrencyExchangeModal();
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
const getMiniPageLimit = () => (window.innerWidth <= 1024 ? 5 : 20);
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
        <div class="biz-select-trigger" style="height:32px; padding:0 12px; font-size:12px; border-radius:10px; font-weight:600; color:#1a1d2e;">
           <span class="biz-select-label">${selectedOpt.label}</span>
           ${svgIcon}
        </div>
        <div class="biz-select-options" style="left:0; right:auto; min-width:140px;">
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
let fullTypeFilter = "all";
let fullCardFilter = "all";
const renderFullFilters = () => {
  const container = $("full-doc-filters-container");
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
        <div class="biz-select-trigger" style="height:32px; padding:0 12px; font-size:12px; border-radius:10px; font-weight:600; color:#1a1d2e;">
           <span class="biz-select-label">${selectedOpt.label}</span>
           ${svgIcon}
        </div>
        <div class="biz-select-options" style="left:0; right:auto; min-width:140px;">
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
  container.appendChild(createSelect("full-type-select", types, fullTypeFilter, (val) => {
     fullTypeFilter = val;
     renderFullFilters();
     dPage = 1;
     renderDocsFull();
  }));

  container.appendChild(createSelect("full-card-select", cards, fullCardFilter, (val) => {
     fullCardFilter = val;
     renderFullFilters();
     dPage = 1;
     renderDocsFull();
  }));
};

document.addEventListener("click", () => {
   document.querySelectorAll(".biz-custom-select.open").forEach(el => el.classList.remove("open"));
});
const getMethodInfo = (methodObj, methodId, isMySide) => {
    if (isMySide && typeof myMethods !== 'undefined') {
        const found = myMethods.find(m => m._id === methodId);
        if (found) return found;
    }
    if (methodObj && typeof methodObj === 'object') {
        return methodObj;
    }
    return null;
};

const buildUserCell = (name, method, isSender = true) => {
    const dispName = name || "User";
    const initial = dispName.charAt(0).toUpperCase();
    let cardStr = "****";
    if (method) {
        if (method.number) {
            cardStr = "**** " + method.number.slice(-4);
        } else if (method.cardName) {
            cardStr = method.cardName;
        }
    }
    
    return `
    <div class="biz-user-cell ${isSender ? 'tx-sender-cell' : 'tx-receiver-cell'}" style="display:flex;align-items:center;gap:8px;overflow:hidden;">
      <div style="width:28px;height:28px;border-radius:50%;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;flex-shrink:0;">
        ${initial}
      </div>
      <div style="display:flex;flex-direction:column;gap:1px;overflow:hidden;">
        <span style="font-weight:600;font-size:12px;color:#1a1d2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dispName}</span>
        <span style="font-size:10px;color:#8892a4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cardStr}</span>
      </div>
    </div>`;
};


const renderDocsMini = () => {
  const el = $("docs-mini");
  if (!el) return;
  const me = getCurrent();
  const userId = me?.userId || me?._id;
  
  let allPayments = myTransactions.slice().reverse();
  
  allPayments = allPayments.filter(p => {
      let isSent = p.senderId === userId || (p.senderId && typeof p.senderId === 'object' && p.senderId._id === userId) || p.type === 'withdraw' || p.type === 'expense';
      const isInternal = p.senderId === userId && p.receiverId === userId;
      
      const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
      const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;
      
      if (isInternal && typeof miniCardFilter !== 'undefined' && miniCardFilter !== "all") {
          if (rId === miniCardFilter) isSent = false;
      }
      
      if (miniTypeFilter === "sent" && !isSent) return false;
      if (miniTypeFilter === "received" && isSent) return false;
      
      if (miniCardFilter !== "all") {
          const methodUsedId = isSent ? sId : rId;
          if (methodUsedId !== miniCardFilter) return false;
      }
      return true;
  });

  const limit = getMiniPageLimit();
  const total = allPayments.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  if (mPage > pages) mPage = pages;
  
  const start = (mPage - 1) * limit;
  const payments = allPayments.slice(start, start + limit);
  
  if ($("mp-num")) {
    $("mp-num").textContent = mPage;
    $("mp-prev").disabled = mPage <= 1;
    $("mp-next").disabled = mPage >= pages;
  }

  el.innerHTML = payments.length
    ? payments.map((p) => {
        const isPending = p.status === "waiting";
        let isSent = p.senderId === userId;
        const isInternal = p.senderId === userId && p.receiverId === userId;
        
        const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
        const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;

        if (isInternal && typeof miniCardFilter !== 'undefined' && miniCardFilter !== "all") {
            if (rId === miniCardFilter) isSent = false;
        }

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
        
        let amountColor = isPending ? "#f59e0b" : (isSent ? "#ef4444" : "#16a34a");
        if (p.senderId === "system_tour") amountColor = "#0284c7";
        let amountSign = isSent ? "- " : "+ ";
        
        let activityText = isSent ? `${t("sending_payment_to")} ${p.receiverName || "User"}` : `${t("received_payment_from")} ${p.senderName || "User"}`;
        if (p.receiverId === "system_tour") activityText = p.description || "Tur xaridi";
        if (isInternal) activityText = t("internal_transfer");
        
        const senderMethod = getMethodInfo(p.senderMethodId, sId, isInternal ? true : isSent);
        const receiverMethod = getMethodInfo(p.receiverMethodId, rId, isInternal ? true : !isSent);
        const senderName = p.senderName || (p.senderId === "system_tour" ? "Sayohat" : "User");
        const receiverName = p.receiverName || (p.receiverId === "system_tour" ? "Sayohat" : "User");
        const senderCell = buildUserCell(senderName, senderMethod, true);
        const receiverCell = buildUserCell(receiverName, receiverMethod, false);

        let displayAmount = p.amount;
        let isVisa = false;
        
        if (isInternal && (p.description === "Valyuta almashtirish" || p.description === "Currency Exchange" || p.description === "Обмен валюты")) {
            const sIsVisa = senderMethod && senderMethod.cardName === "Visa";
            const rIsVisa = receiverMethod && receiverMethod.cardName === "Visa";
            if (!isSent) {
                const rate = exchangeRates.USD || 12800;
                if (sIsVisa && !rIsVisa) {
                    displayAmount = p.amount * rate;
                    isVisa = false;
                } else if (!sIsVisa && rIsVisa) {
                    displayAmount = p.amount / rate;
                    isVisa = true;
                } else {
                    isVisa = rIsVisa;
                }
            } else {
                isVisa = sIsVisa;
            }
        } else {
            isVisa = (isSent ? senderMethod : receiverMethod) ? (isSent ? senderMethod : receiverMethod).cardName === "Visa" : false;
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
            typeText = (p.description === "Valyuta almashtirish" || p.description === "Currency Exchange" || p.description === "Обмен валюты") 
                ? t("currency_exchange") 
                : ((p.description === "O'z hisobiga o'tkazma" || p.description === "Self Transfer" || p.description === "O'z hisobiga" || p.description === "Перевод себе") 
                    ? t("internal_transfer") 
                    : (p.description || t("internal_transfer")));
            amountSign = isSent ? "- " : "+ ";
            if (typeof miniCardFilter !== 'undefined' && miniCardFilter === "all") amountSign = "&nbsp;&nbsp;";
            amountColor = "#9333ea";
        }

        const txDirectionClass = isSent ? "tx-sent" : "tx-received";
        const txStatusClass = `tx-status-${p.status}`;
        return `
        <div class="biz-doc-row-wrap mini-table-row ${txDirectionClass} ${txStatusClass}${expanded ? " expanded" : ""}">
          <div class="biz-row docs-cols mini-table-grid">
            <div class="tx-type-col" style="display:flex;align-items:center;gap:6px">
              <div class="tx-type-icon-wrapper" style="width:20px;height:20px;border-radius:50%;background:${typeBg};color:${typeColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${typeIcon}
              </div>
              <span class="tx-type-text" style="font-weight:600;font-size:12px;color:#1a1d2e">${typeText}</span>
            </div>

            <span class="biz-cell tx-amount-cell" style="font-weight:700;color:${amountColor};font-size:12px">${amountSign}${fmt(displayAmount, p.currency === "USD" || isVisa)}</span>

            <span class="biz-cell biz-small tx-date-cell" style="font-size:10px">${date}</span>

            ${senderCell}
            ${receiverCell}

            <div class="tx-actions-cell" style="display:flex;gap:4px;align-items:center">
              ${isWait ? `
                <button class="biz-icon-btn send-btn" data-tid="${p._id}" style="background:#5b6ef5;color:#fff;width:auto;padding:0 6px;font-size:10px;font-weight:700">${t("send")}</button>
                <button class="biz-icon-btn del-btn" data-tid="${p._id}" style="background:#fee2e2;color:#ef4444;width:auto;padding:0 6px;" title="${t("cancel")}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
              ` : `
                <button class="biz-icon-btn receipt-btn" data-tid="${p._id}" style="background:#f1f3fa;color:#1a1d2e;width:auto;padding:0 6px;" title="Chekni ko'rish">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </button>
                <button class="biz-icon-btn qr-btn" data-tid="${p._id}" style="background:#f1f3fa;color:#1a1d2e;width:auto;padding:0 6px;" title="QR kod orqali ko'rish">
                  <svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code-icon lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
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

  // Mobile card click handlers: click whole card to view receipt or pay draft
  bindMiniRowClicks(el, openReceiptModal, openPaymentModal);
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

const renderDocsFull = () => {
  const me = getCurrent();
  const userId = me?.userId || me?._id;
  dFiltered = myTransactions.filter((p) => {
    // 1. Filter by Status/Type/Direction
    let matchType = true;
    if (fullTypeFilter === "sent") {
        matchType = p.senderId === userId;
    } else if (fullTypeFilter === "received") {
        matchType = p.receiverId === userId;
    }
    
    // 2. Filter by Card/Account
    let matchCard = true;
    if (fullCardFilter !== "all") {
        const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
        const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;
        matchCard = (sId === fullCardFilter || rId === fullCardFilter);
    }
    
    return matchType && matchCard;
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
        
        let amountColor = isSent ? "#1a1d2e" : "#16a34a";
        if (p.senderId === "system_tour") amountColor = "#0284c7";
        let amountSign = isSent ? "- " : "+ ";
        
        let activityText = isSent ? `${t("sending_payment_to")} ${p.receiverName || "User"}` : `${t("received_payment_from")} ${p.senderName || "User"}`;
        if (p.receiverId === "system_tour") activityText = p.description || "Tur xaridi";
        if (isInternal) activityText = t("internal_transfer");
        
        const sId = typeof p.senderMethodId === 'object' && p.senderMethodId ? p.senderMethodId._id : p.senderMethodId;
        const rId = typeof p.receiverMethodId === 'object' && p.receiverMethodId ? p.receiverMethodId._id : p.receiverMethodId;
        const senderMethod = getMethodInfo(p.senderMethodId, sId, isSent);
        const receiverMethod = getMethodInfo(p.receiverMethodId, rId, !isSent);
        const senderName = p.senderName || (p.senderId === "system_tour" ? "Sayohat" : "User");
        const receiverName = p.receiverName || (p.receiverId === "system_tour" ? "Sayohat" : "User");
        const senderCell = buildUserCell(senderName, senderMethod, true);
        const receiverCell = buildUserCell(receiverName, receiverMethod, false);

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
            typeText = (p.description === "Valyuta almashtirish" || p.description === "Currency Exchange" || p.description === "Обмен валюты") 
                ? t("currency_exchange") 
                : ((p.description === "O'z hisobiga o'tkazma" || p.description === "Self Transfer" || p.description === "O'z hisobiga" || p.description === "Перевод себе") 
                    ? t("internal_transfer") 
                    : (p.description || t("internal_transfer")));
            amountSign = "&nbsp;&nbsp;";
            amountColor = "#9333ea";
        }

        if (p.receiverId === "system_tour") {
            typeBg = "rgba(91, 110, 245, 0.15)";
            typeColor = "#5b6ef5";
            typeText = t("tour_label");
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
        }

        if (p.senderId === "system_tour") {
            typeBg = "rgba(14, 165, 233, 0.15)";
            typeColor = "#0284c7";
            typeText = t("type_refunded") || "Qaytarilgan";
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/></svg>`;
        }

        const txDirectionClass = isSent ? "tx-sent" : "tx-received";
        const txStatusClass = `tx-status-${p.status}`;
        return `
        <div class="biz-doc-row-wrap ${txDirectionClass} ${txStatusClass}${expanded ? " expanded" : ""}">
          <div class="biz-row docs-cols">
            <div class="tx-type-col" style="display:flex;align-items:center;gap:8px">
              <div class="tx-type-icon-wrapper" style="width:24px;height:24px;border-radius:50%;background:${typeBg};color:${typeColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${typeIcon}
              </div>
              <span class="tx-type-text" style="font-weight:600;font-size:13px;color:#1a1d2e">${typeText}</span>
            </div>

            <span class="biz-cell tx-amount-cell" style="font-weight:700;color:${amountColor}">${amountSign}${fmt(p.amount, p.currency === "USD" || ((isSent ? senderMethod : receiverMethod) ? (isSent ? senderMethod : receiverMethod).cardName === "Visa" : false))}</span>

            <span class="biz-cell biz-small tx-date-cell">${date}</span>

            ${senderCell}
            ${receiverCell}

            <div class="tx-actions-cell" style="display:flex;gap:5px;align-items:center">
              ${isWait ? `<button class="biz-icon-btn send-btn" data-tid="${p._id}" style="background:#5b6ef5;color:#fff;width:auto;padding:0 9px;font-size:11px;font-weight:700">${t("send")}</button>` : ""}
              ${!isWait ? `<button class="biz-icon-btn receipt-btn" data-tid="${p._id}" style="background:#f1f3fa;color:#1a1d2e" title="Chekni ko'rish"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button><button class="biz-icon-btn qr-btn" data-tid="${p._id}" style="background:#f1f3fa;color:#1a1d2e" title="QR orqali ko'rish"><svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code-icon lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg></button>` : ""}
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
                <span class="biz-exp-total-val" style="color:${amountColor}">${amountSign}${fmt(p.amount, p.currency === "USD" || ((isSent ? senderMethod : receiverMethod) ? (isSent ? senderMethod : receiverMethod).cardName === "Visa" : false))}</span>
              </div>
            </div>
          </div>` : ""}
        </div>`;
      }).join("")
    : `<p class="biz-empty">${t("no_docs_found")}</p>`;

  const pagContainer = $("docs-pagination-container");
  if (pagContainer) {
    const hasPrev = dPage > 1;
    const hasNext = dPage < pages;
    
    pagContainer.innerHTML = `
      <div class="vac-rows-per-page-container">
        <button class="vac-rows-btn" id="docs-rows-btn" style="height:32px; border-radius:10px;">
          <span>Ko'rsatish: <span id="docs-rows-val">${PAGE}</span></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="vac-rows-dropdown" id="docs-rows-dropdown" style="bottom: calc(100% + 6px); right: auto; left: 0;">
          <div class="vac-rows-option ${PAGE === 5 ? "active" : ""}" data-val="5">5</div>
          <div class="vac-rows-option ${PAGE === 10 ? "active" : ""}" data-val="10">10</div>
          <div class="vac-rows-option ${PAGE === 20 ? "active" : ""}" data-val="20">20</div>
          <div class="vac-rows-option ${PAGE === 50 ? "active" : ""}" data-val="50">50</div>
        </div>
      </div>
      
      <span id="dp-info" style="font-size:12px; font-weight:600; color:#64748b;">${total === 0 ? 0 : start + 1}–${Math.min(start + PAGE, total)} / ${total}</span>

      <div class="biz-page-btns" style="display:flex; align-items:center; gap:8px;">
        <button id="dp-prev" ${hasPrev ? "" : "disabled"} style="width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&#8249;</button>
        <span id="dp-num" style="font-weight:700; font-size:13px;">${dPage}</span>
        <button id="dp-next" ${hasNext ? "" : "disabled"} style="width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&#8250;</button>
      </div>
    `;

    const rowsBtn = pagContainer.querySelector("#docs-rows-btn");
    const dropdown = pagContainer.querySelector("#docs-rows-dropdown");
    if (rowsBtn && dropdown) {
      rowsBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("open");
      };
    }

    pagContainer.querySelectorAll(".vac-rows-option").forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        PAGE = parseInt(opt.getAttribute("data-val"));
        dPage = 1;
        renderDocsFull();
      };
    });

    const prevBtn = pagContainer.querySelector("#dp-prev");
    const nextBtn = pagContainer.querySelector("#dp-next");
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (dPage > 1) {
          dPage--;
          renderDocsFull();
        }
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (dPage < pages) {
          dPage++;
          renderDocsFull();
        }
      };
    }
  }

  el.querySelectorAll(".expand-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const tid = btn.dataset.tid;
      if (expandedTxIds.has(tid)) expandedTxIds.delete(tid);
      else { expandedTxIds.clear(); expandedTxIds.add(tid); }
      renderDocsFull();
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

  // Mobile card click handlers: click whole card to view receipt or pay draft
  bindFullRowClicks(el, openReceiptModal, openPaymentModal);
};

// ─── VIEW SWITCHER ──────────────────────────────────────────────
const showView = (name) => {
  const dashboard = $("view-dashboard");
  const clients = $("view-clients");
  const docs = $("view-docs");
  const allCards = $("view-all-cards");
  const dashRight = document.querySelector(".biz-dash-right");
  const bizRoot = document.querySelector(".biz-root");
  const statsRow = document.querySelector(".biz-stats-row");
  const header = document.querySelector(".biz-header");

  // Reset opacity/transform for smooth transitions
  [dashboard, clients, docs, allCards].forEach(view => {
    if (view) {
      view.style.opacity = "0";
      view.style.transform = "translateY(8px)";
      view.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    }
  });

  const triggerTransition = (view) => {
    if (!view) return;
    view.style.display = "flex";
    setTimeout(() => {
      view.style.opacity = "1";
      view.style.transform = "translateY(0)";
    }, 30);
  };

  if (name === "view-dashboard") {
    if (dashboard) triggerTransition(dashboard);
    if (clients) clients.style.display = "none";
    if (docs) docs.style.display = "none";
    if (allCards) allCards.style.display = "none";
    if (dashRight) dashRight.style.display = "flex";
    if (bizRoot) bizRoot.classList.remove("full-width");
    if (statsRow) statsRow.style.display = "flex";
    if (header) header.style.display = "";
  } else if (name === "view-clients") {
    if (dashboard) dashboard.style.display = "none";
    if (clients) triggerTransition(clients);
    if (docs) docs.style.display = "none";
    if (allCards) allCards.style.display = "none";
    if (dashRight) dashRight.style.display = "none";
    if (bizRoot) bizRoot.classList.add("full-width");
    if (statsRow) statsRow.style.display = "none";
    if (header) header.style.display = "none";
  } else if (name === "view-docs") {
    if (dashboard) dashboard.style.display = "none";
    if (clients) clients.style.display = "none";
    if (docs) triggerTransition(docs);
    if (allCards) allCards.style.display = "none";
    if (dashRight) dashRight.style.display = "none";
    if (bizRoot) bizRoot.classList.add("full-width");
    if (statsRow) statsRow.style.display = "none";
    if (header) header.style.display = "none";
  } else if (name === "view-all-cards") {
    if (dashboard) dashboard.style.display = "none";
    if (clients) clients.style.display = "none";
    if (docs) docs.style.display = "none";
    if (allCards) triggerTransition(allCards);
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
      const startHeight = modal.offsetHeight;
      modal.style.height = startHeight + "px";
      modal.style.overflow = "hidden";
      modal.style.transition = "none";
      
      activeSteps.forEach(el => {
          el.style.transition = "opacity 0.15s ease";
          el.style.opacity = "0";
      });
      
      setTimeout(() => {
          activeSteps.forEach(el => el.style.display = "none");
          const step = $(stepId);
          if (step) {
              step.style.opacity = "0";
              step.style.display = "flex";
          }
          
          if (stepId === "pmt-step-sms" || stepId === "pmt-step-success") {
              modal.style.maxWidth = "480px";
          } else if (stepId === "pmt-step-1") {
              modal.style.maxWidth = "600px";
          } else {
              modal.style.maxWidth = "800px";
          }
          
          modal.style.height = "auto";
          const endHeight = modal.offsetHeight;
          modal.style.height = startHeight + "px";
          
          void modal.offsetHeight;
          
          modal.style.transition = "height 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), max-width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
          modal.style.height = endHeight + "px";
          
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
          } else if (stepId === "pmt-step-1") {
              modal.style.maxWidth = "600px";
          } else {
              modal.style.maxWidth = "800px";
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
  
  // Reset all steps to default step-1 state to prevent flashing on next open
  document.querySelectorAll(".pmt-step").forEach(el => {
    el.style.display = "none";
    el.style.opacity = "1";
  });
  $("pmt-step-1").style.display = "flex";

  const modal = document.querySelector(".pmt-modal");
  if (modal) {
    modal.style.maxWidth = "600px";
    modal.style.height = "auto";
  }
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

  const isVisa = (c) => c && c.type === 'card' && (
      (c.cardName && c.cardName.toLowerCase().includes('visa')) || 
      (c.number && c.number.startsWith('4'))
  );
  
  const d = new Date(tx.paidAt || tx.createdAt);
  $("receipt-date").textContent = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  
  const txIsVisa = isVisa(senderMethodObj);
  const formattedAmt = fmt(tx.amount, txIsVisa);
  const parts = formattedAmt.split(".");
  
  $("receipt-amount-int").textContent = isSent ? "- " + (parts[0] || "0") : "+ " + (parts[0] || "0");
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
  
  // Set receiver profile details
  $("pmt-found-avatar").textContent = user.username ? user.username.charAt(0).toUpperCase() : "?";
  $("pmt-found-name").textContent = user.username;
  $("pmt-found-contact").textContent = user.tel || user.email || "";

  let senderCard = null;
  let receiverCard = null;
  let activeSelection = 'sender';

  const recMethods = user.paymentMethods || [];
  if (specificMethodId) {
     receiverCard = recMethods.find(m => m._id === specificMethodId);
     selRecipMethodId = specificMethodId;
     activeSelection = 'sender'; // default to selecting sender
  } else {
     receiverCard = null;
     selRecipMethodId = null;
  }

  // Set global function for the confirm step
  window.currentSenderMethodSelection = () => senderCard ? senderCard._id : null;

  const isVisa = (c) => c && c.type === 'card' && (
      (c.cardName && c.cardName.toLowerCase().includes('visa')) || 
      (c.number && c.number.startsWith('4'))
  );

  const renderBox = (containerId, card, isActive) => {
      const container = $(containerId);
      if (!container) return;
      if (!card) {
          container.innerHTML = `
              <div style="height:60px; border:2px dashed ${isActive ? '#4F46E5' : '#cbd5e1'}; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:8px; background:${isActive ? '#F5F3FF' : 'transparent'}; color:${isActive ? '#4F46E5' : '#94a3b8'}; transition:0.2s;">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
                  <span style="font-weight:600; font-size:13px;">${t("choose_card_title")}</span>
              </div>
          `;
          return;
      }

      container.innerHTML = `
          <div style="height:60px; border:2px solid ${isActive ? '#4F46E5' : '#e2e8f0'}; border-radius:12px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.02); display:flex; align-items:center; justify-content:space-between; padding:0 12px; transition:0.2s;">
              <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:32px; height:32px; border-radius:8px; background:${containerId === 'pmt-sender-box' ? '#4F46E5' : '#e2e8f0'}; display:flex; align-items:center; justify-content:center;">
                      ${containerId === 'pmt-sender-box' 
                        ? '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>' 
                        : '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#64748b" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>'}
                  </div>
                  <div style="display:flex; flex-direction:column;">
                      <span style="font-size:13px; font-weight:700; color:#0f172a; letter-spacing:-0.2px;">${card.type === "card" ? (card.cardName || "Karta") : (card.bank === "Woorkroom Bank" || card.bank === "Bank Hisobi" ? "Bank Hisobi" : card.bank)} ${card.number ? "•••• " + card.number.slice(-4) : ""}</span>
                      ${containerId === 'pmt-receiver-box' ? '' : `<span style="font-size:11px; color:#64748b; font-weight:500; margin-top:1px;">${card.balance.toLocaleString('en-US').replace(/,/g, ' ')} ${isVisa(card) ? "USD" : "UZS"}</span>`}
                  </div>
              </div>
          </div>
      `;
  };

  const renderRightList = () => {
      const titleEl = $("pmt-right-title");
      const listEl = $("pmt-right-list");
      if (!listEl) return;

      if (!activeSelection) {
          titleEl.innerHTML = "Karta tanlash";
          listEl.innerHTML = `
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding-top:60px; color:#cbd5e1;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
          `;
          return;
      }

      titleEl.innerHTML = activeSelection === 'sender' ? t("choose_sender_card") : t("choose_receiver_card");
      
      let availableMethods = [];
      if (activeSelection === 'sender') {
          availableMethods = myMethods;
          if (receiverCard) {
              const recVisa = isVisa(receiverCard);
              availableMethods = availableMethods.filter(m => isVisa(m) === recVisa);
          }
      } else {
          availableMethods = user.paymentMethods || [];
          if (senderCard) {
              const sendVisa = isVisa(senderCard);
              availableMethods = availableMethods.filter(m => isVisa(m) === sendVisa);
          }
      }

      if (availableMethods.length === 0) {
          listEl.innerHTML = `
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px 20px; color:#cbd5e1; text-align:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle" style="margin-bottom:12px;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <div style="font-size:13px; font-weight:600; color:#0f172a; margin-bottom:4px;">${t("cards_not_found")}</div>
                  <div style="font-size:11px; font-weight:500; color:#64748b;">Visa kartadan faqat Visa kartaga, mahalliy hisobdan faqat mahalliy hisobga yuborish mumkin.</div>
              </div>
          `;
          return;
      }

      listEl.innerHTML = availableMethods.map(m => {
          const isBlocked = blockedCardIds.has(m._id) || m.isBlocked === true;
          return `
          <div class="pmt-option-card ${isBlocked ? 'blocked-option-card' : ''}" data-id="${m._id}" style="padding:12px; border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; transition:0.2s; background:#fff; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.01);" onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 4px 10px rgba(0,0,0,0.04)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.01)'">
              <div style="display:flex; align-items:center; gap:12px; pointer-events:none;">
                  <div style="width:32px; height:32px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:2px;">
                      <div style="font-weight:600; font-size:13px; color:#0f172a; letter-spacing:-0.2px;">${m.type === "card" ? (m.cardName || t("card")) : (m.bank === "Woorkroom Bank" || m.bank === "Bank Hisobi" ? "Bank Hisobi" : m.bank)} ${m.number ? "•••• " + m.number.slice(-4) : ""}</div>
                      ${activeSelection === 'receiver' ? '' : `<div style="font-size:11px; color:#64748b; font-weight:500;">${m.balance ? m.balance.toLocaleString('en-US').replace(/,/g, ' ') : "0"} ${isVisa(m) ? "USD" : "UZS"}</div>`}
                  </div>
              </div>
              ${isBlocked ? `
              <div class="card-freeze-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
              </div>
              <div class="freeze-hover-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
                <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${t("card_frozen_label")}</span>
              </div>
              ` : ''}
          </div>
      `}).join("");

      listEl.querySelectorAll(".pmt-option-card").forEach(el => {
          el.onclick = () => {
              const selId = el.getAttribute("data-id");
              const isBlocked = blockedCardIds.has(selId) || (availableMethods.find(x => x._id === selId)?.isBlocked === true);
              if (isBlocked) {
                  showToast(t("frozen_card_click_error"), "error");
                  return;
              }
              if (activeSelection === 'sender') {
                  senderCard = myMethods.find(x => x._id === selId);
                  window.currentSenderMethodSelection = () => senderCard ? senderCard._id : null;
                  if (!receiverCard) {
                      activeSelection = 'receiver';
                  } else {
                      if (isVisa(senderCard) !== isVisa(receiverCard)) {
                          receiverCard = null;
                          selRecipMethodId = null;
                          activeSelection = 'receiver';
                      } else {
                          activeSelection = null;
                      }
                  }
              } else {
                  receiverCard = recMethods.find(x => x._id === selId);
                  selRecipMethodId = receiverCard ? receiverCard._id : null;
                  if (!senderCard) {
                      activeSelection = 'sender';
                  } else {
                      if (isVisa(senderCard) !== isVisa(receiverCard)) {
                          senderCard = null;
                          window.currentSenderMethodSelection = () => null;
                          activeSelection = 'sender';
                      } else {
                          activeSelection = null;
                      }
                  }
              }
              updateUI();
          };
      });
  };

  const updateUI = () => {
      renderBox('pmt-sender-box', senderCard, activeSelection === 'sender');
      renderBox('pmt-receiver-box', receiverCard, activeSelection === 'receiver');
      renderRightList();
      checkNextStepReady();
  };

  const checkNextStepReady = () => {
     const amount = parseFloat($("pmt-amount").value.replace(/[\s,]/g, ""));
     
     const currEl = document.querySelector(".pmt-currency");
     if (currEl) {
        if (senderCard) {
            currEl.textContent = isVisa(senderCard) ? "USD" : "UZS";
        } else if (receiverCard) {
            currEl.textContent = isVisa(receiverCard) ? "USD" : "UZS";
        } else {
            currEl.textContent = "UZS";
        }
     }
     
     const errEl = $("pmt-step3-error");
     if (errEl) errEl.textContent = "";

     if (senderCard && receiverCard) {
        if (isVisa(senderCard) !== isVisa(receiverCard)) {
            if (errEl) {
                errEl.textContent = isVisa(senderCard) 
                    ? "Mos kelmaydigan valyuta: Visa'dan faqat Visa'ga o'tkazish mumkin." 
                    : "Mos kelmaydigan valyuta: Mahalliy kartadan faqat mahalliy kartaga o'tkazish mumkin.";
            }
            $("pmt-next-3").disabled = true;
            return;
        }
     }
     
     if (senderCard && receiverCard && !isNaN(amount) && amount > 0) {
        if (senderCard.balance < amount) {
           if (errEl) errEl.textContent = t("err_insufficient") || "Mablag' yetarli emas";
           $("pmt-next-3").disabled = true;
        } else {
           $("pmt-next-3").disabled = false;
        }
     } else {
        $("pmt-next-3").disabled = true;
     }
  };

  // Click handlers on sender/receiver boxes to switch active list
  $("pmt-sender-box").onclick = () => {
      activeSelection = 'sender';
      updateUI();
  };
  $("pmt-receiver-box").onclick = () => {
      activeSelection = 'receiver';
      updateUI();
  };

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

  // Initial draw
  updateUI();
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
    loadPaymentData().then(() => { 
        refreshStats(); 
        renderDocsMini(); 
        renderDocsFull();
        renderAccounts(); 
        if ($("view-all-cards") && $("view-all-cards").style.display !== "none") renderAllCards(); 
    });
  });

  pusherChannel.bind("transaction-completed", (data) => {
    const tx = data.transaction;
    // Skip toast for internal transfers — the manual toast already handles it
    if (tx.senderId !== tx.receiverId) {
      showToast(`✅ ${fmt(tx.amount)} to'lov amalga oshirildi`, "success");
    }
    loadPaymentData().then(() => { 
        refreshStats(); 
        renderDocsMini(); 
        renderDocsFull();
        renderAccounts(); 
        if ($("view-all-cards") && $("view-all-cards").style.display !== "none") renderAllCards(); 
    });
  });

  pusherChannel.bind("method-added", () => {
    loadPaymentData().then(() => { 
        renderAccounts(); 
        refreshStats(); 
        if ($("view-all-cards") && $("view-all-cards").style.display !== "none") renderAllCards(); 
    });
  });

  pusherChannel.bind("method-deleted", () => {
    loadPaymentData().then(() => { 
        renderAccounts(); 
        refreshStats(); 
        if ($("view-all-cards") && $("view-all-cards").style.display !== "none") renderAllCards(); 
    });
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
    headers[2].textContent = t("col_date");
    headers[3].textContent = t("col_sender");
    headers[4].textContent = t("col_receiver");
    headers[5].textContent = t("col_status");
    headers[6].textContent = t("col_action");
    
    if (headers.length >= 14) {
      headers[7].textContent = t("col_type");
      headers[8].textContent = t("col_amount");
      headers[9].textContent = t("col_date");
      headers[10].textContent = t("col_sender");
      headers[11].textContent = t("col_receiver");
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
  renderFullFilters();

  initResponsive(showView, (val) => { dPage = val; }, renderDocsFull);

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
    renderFullFilters();
    renderDocsFull();
    renderClientsFull();
    refreshStats();
  });

  // Initialize Pusher
  initPusher();

  // ── View navigation ──
  $("back-clients")?.addEventListener("click", () => { showView("view-dashboard"); });
  $("btn-view-docs")?.addEventListener("click", () => { showView("view-docs"); dPage = 1; renderFullFilters(); renderDocsFull(); });
  $("back-docs")?.addEventListener("click", () => { showView("view-dashboard"); renderDocsMini(); });
  
  $("btn-view-all-cards")?.addEventListener("click", () => { showView("view-all-cards"); selectedInspectorCardId = null; renderAllCards(); });
  $("back-all-cards")?.addEventListener("click", () => { showView("view-dashboard"); renderAccounts(); });
  $("all-cards-add-btn")?.addEventListener("click", () => { $("add-card-btn").click(); });
  const customFilter = $("all-cards-type-filter-custom");
  if (customFilter) {
    const selected = customFilter.querySelector(".selected");
    const options = customFilter.querySelector(".options");
    const items = customFilter.querySelectorAll(".options li");
    const textSpan = selected.querySelector("span");

    selected.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = options.style.display === "block";
      options.style.display = isOpen ? "none" : "block";
      const chevron = selected.querySelector(".chevron-icon");
      if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });

    items.forEach(item => {
      item.addEventListener("click", () => {
         const val = item.getAttribute("data-value");
         textSpan.textContent = item.textContent;
         customFilter.dataset.value = val;
         options.style.display = "none";
         const chevron = selected.querySelector(".chevron-icon");
         if (chevron) chevron.style.transform = "rotate(0deg)";
         renderAllCards();
      });
    });

    document.addEventListener("click", (e) => {
      if (!customFilter.contains(e.target)) {
        options.style.display = "none";
        const chevron = selected.querySelector(".chevron-icon");
        if (chevron) chevron.style.transform = "rotate(0deg)";
      }
    });
  }
  $("mp-prev")?.addEventListener("click", () => { if (mPage > 1) { mPage--; renderDocsMini(); } });
  $("mp-next")?.addEventListener("click", () => {
     const total = myTransactions.length;
     const limit = getMiniPageLimit();
     if (mPage < Math.ceil(total / limit)) { mPage++; renderDocsMini(); }
  });

  $("cp-prev")?.addEventListener("click", () => { if (cPage > 1) { cPage--; renderClientsFull(); } });
  $("cp-next")?.addEventListener("click", () => { if (cPage < Math.ceil(cFiltered.length / PAGE)) { cPage++; renderClientsFull(); } });
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
    $("pmt-next-3").addEventListener("click", async () => {
      $("pmt-step3-error").textContent = "";
      const amount = parseFloat($("pmt-amount").value.replace(/[\s,]/g, ""));
      if (isNaN(amount) || amount <= 0) {
         $("pmt-step3-error").textContent = t("err_valid_amount"); return;
      }
      const selectedMyMethod = window.currentSenderMethodSelection ? window.currentSenderMethodSelection() : null;
      const myMeth = myMethods.find(m => m._id === selectedMyMethod);
      if (!myMeth) { $("pmt-step3-error").textContent = t("err_select_method"); return; }
      if (blockedCardIds.has(selectedMyMethod)) { $("pmt-step3-error").textContent = t("frozen_card_tx_error"); return; }
      if (myMeth.balance < amount) { $("pmt-step3-error").textContent = t("err_insufficient"); return; }
      
      pendingPayment = {
         amount,
         senderMethodId: selectedMyMethod,
         receiverMethodId: selRecipMethodId,
         receiverId: foundReceiverUser.userId || foundReceiverUser._id
      };
      
      try {
         $("pmt-next-3").disabled = true;
         const btnText = $("pmt-next-3").querySelector(".btn-text");
         const btnLoader = $("pmt-next-3").querySelector(".btn-loader");
         if (btnText) btnText.style.display = "none";
         if (btnLoader) btnLoader.style.display = "block";
         const otpRes = await apiFetch(`/api/payments/send-otp`, { method: "POST" });
         
         showModalStep("pmt-step-sms");
         
         $("pmt-sms-desc").textContent = "Pochtangizga tasdiqlash kodi yuborildi: " + (otpRes.email || "***");
         ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].forEach(id => { $(id).value = ""; $(id).style.borderColor = ""; });
         $("pmt-sms-error").textContent = "";
         setTimeout(() => $("pmt-sms-1").focus(), 100);
         
         // Start 1:30 timer
         startSmsTimer();
      } catch (e) {
         $("pmt-step3-error").textContent = e.message;
      } finally {
         $("pmt-next-3").disabled = false;
         const btnText = $("pmt-next-3").querySelector(".btn-text");
         const btnLoader = $("pmt-next-3").querySelector(".btn-loader");
         if (btnText) btnText.style.display = "inline";
         if (btnLoader) btnLoader.style.display = "none";
      }
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
       clearInterval(window.smsTimerInterval);
       showModalStep("pmt-step-2-3");
    });
  }

  window.smsTimerInterval = null;
  window.smsTimeLeft = 90;
  
  function startSmsTimer() {
     clearInterval(window.smsTimerInterval);
     window.smsTimeLeft = 90;
     $("pmt-sms-timer").style.display = "block";
     $("pmt-sms-resend").style.display = "none";
     $("pmt-sms-error").textContent = "";
     
     const updateTimer = () => {
        const m = Math.floor(window.smsTimeLeft / 60);
        const s = window.smsTimeLeft % 60;
        $("pmt-sms-timer").textContent = `Vaqt qoldi: ${m}:${s < 10 ? '0' : ''}${s}`;
        if (window.smsTimeLeft <= 0) {
           clearInterval(window.smsTimerInterval);
           $("pmt-sms-timer").style.display = "none";
           $("pmt-sms-resend").style.display = "inline-block";
           $("pmt-sms-error").textContent = "Kodning vaqti tugadi. Iltimos qayta yuboring.";
           ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].forEach(id => { $(id).style.borderColor = "#ef4444"; });
        }
        window.smsTimeLeft--;
     };
     updateTimer();
     window.smsTimerInterval = setInterval(updateTimer, 1000);
  }

  if ($("pmt-sms-resend")) {
     $("pmt-sms-resend").addEventListener("click", async () => {
        $("pmt-sms-resend").textContent = "Kutib turing...";
        try {
           const otpRes = await apiFetch(`/api/payments/send-otp`, { method: "POST" });
           $("pmt-sms-desc").textContent = "Pochtangizga tasdiqlash kodi yuborildi: " + (otpRes.email || "***");
           ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].forEach(id => { $(id).value = ""; $(id).style.borderColor = ""; });
           $("pmt-sms-error").textContent = "Yangi kod yuborildi!";
           $("pmt-sms-error").style.color = "#22c55e";
           setTimeout(() => { $("pmt-sms-error").style.color = ""; $("pmt-sms-error").textContent = ""; }, 3000);
           startSmsTimer();
        } catch (e) {
           $("pmt-sms-error").textContent = e.message;
        }
        $("pmt-sms-resend").textContent = "Qayta yuborish";
     });
  }

  if ($("pmt-sms-confirm")) {
    $("pmt-sms-confirm").addEventListener("click", async () => {
       const code = ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].map(id => $(id).value).join("");
       if (code.length !== 4) {
          $("pmt-sms-error").textContent = "Kodni to'liq kiriting.";
          ["pmt-sms-1", "pmt-sms-2", "pmt-sms-3", "pmt-sms-4"].forEach(id => { $(id).style.borderColor = "#ef4444"; });
          return;
       }
       if (window.smsTimeLeft < 0) {
          $("pmt-sms-error").textContent = "Kodning vaqti tugagan. Qayta yuborishni bosing.";
          return;
       }
       
       try {
          $("pmt-sms-confirm").classList.add("loading");
          $("pmt-sms-confirm").disabled = true;
          
          // Artificial 1-second delay to mimic processing
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await apiFetch(`/api/payments/send/${activeTransactionId}`, {
            method: "POST",
            body: JSON.stringify({
              senderMethodId: pendingPayment.senderMethodId,
              receiverMethodId: pendingPayment.receiverMethodId,
              amount: pendingPayment.amount,
              description: pendingPayment.desc,
              receiverId: pendingPayment.receiverId,
              otp: code
            }),
          });
          clearInterval(window.smsTimerInterval);
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
          $("pmt-sms-confirm").disabled = false;
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

  let detectedCardName = "";

  // ── Add card ──
  $("add-card-btn")?.addEventListener("click", () => {
    ["cm-number", "cm-holder", "cm-expiry", "cm-balance", "cm-cvv"].forEach((id) => { 
        if($(id)) { $(id).value = ""; $(id).style.borderColor = ""; }
    });
    detectedCardName = "";
    if ($("cm-card-detector")) $("cm-card-detector").style.display = "none";
    if ($("cm-number-error")) $("cm-number-error").style.display = "none";
    if ($("cm-cvv-container")) {
      $("cm-cvv-container").style.maxWidth = "0";
      $("cm-cvv-container").style.opacity = "0";
      $("cm-cvv-container").style.marginLeft = "0";
    }
    if ($("cm-currency-label")) $("cm-currency-label").textContent = "UZS";
    $("card-modal").style.display = "flex";
  });

  $("cm-number")?.addEventListener("input", (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = raw.match(/.{1,4}/g)?.join(" ") || raw;
    
    const detector = $("cm-card-detector");
    const detectedNameEl = $("cm-detected-card");
    const errorEl = $("cm-number-error");
    const cvvContainer = $("cm-cvv-container");
    const currencyLabel = $("cm-currency-label");
    const rawUnspaced = e.target.value.replace(/\s/g, "");

    detectedCardName = "";
    if (rawUnspaced.length > 0) {
      if (detector) detector.style.display = "flex";
      if (rawUnspaced.startsWith("9860")) {
        detectedCardName = "Humo";
      } else if (rawUnspaced.startsWith("8600") || rawUnspaced.startsWith("5614")) {
        detectedCardName = "Uzcard";
      } else if (rawUnspaced.startsWith("4")) {
        detectedCardName = "Visa";
      }
      
      if (detectedCardName) {
        if (detectedNameEl) {
          detectedNameEl.style.display = "block";
          detectedNameEl.textContent = detectedCardName;
          if (detectedCardName === "Visa") {
            detectedNameEl.style.background = "#e0e7ff";
            detectedNameEl.style.color = "#3730a3";
          } else if (detectedCardName === "Humo") {
            detectedNameEl.style.background = "#fef3c7";
            detectedNameEl.style.color = "#92400e";
          } else {
            detectedNameEl.style.background = "#dcfce7";
            detectedNameEl.style.color = "#166534";
          }
        }
        if (errorEl) errorEl.style.display = "none";
        if ($("cm-number")) $("cm-number").style.borderColor = "";
      } else {
        if (rawUnspaced.length >= 4 || (rawUnspaced.length > 0 && !["9", "8", "5", "4"].includes(rawUnspaced[0]))) {
          if (detectedNameEl) detectedNameEl.style.display = "none";
          if (errorEl) errorEl.style.display = "block";
          if ($("cm-number")) $("cm-number").style.borderColor = "#ef4444";
        } else {
          if (detectedNameEl) detectedNameEl.style.display = "none";
          if (errorEl) errorEl.style.display = "none";
          if ($("cm-number")) $("cm-number").style.borderColor = "";
        }
      }
    } else {
      if (detector) detector.style.display = "none";
      if ($("cm-number")) $("cm-number").style.borderColor = "";
    }
    
    const isVisa = detectedCardName === "Visa";
    if (cvvContainer) {
      if (isVisa) {
        cvvContainer.style.maxWidth = "80px";
        cvvContainer.style.opacity = "1";
        cvvContainer.style.marginLeft = "12px";
      } else {
        cvvContainer.style.maxWidth = "0";
        cvvContainer.style.opacity = "0";
        cvvContainer.style.marginLeft = "0";
      }
    }
    if (currencyLabel) currencyLabel.textContent = isVisa ? "$" : "UZS";
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
    const cardName = detectedCardName || "Humo";
    const cvv = $("cm-cvv")?.value.trim() || "";

    let hasError = false;
    if (raw.length !== 16 || !detectedCardName) { $("cm-number").style.borderColor = "#ef4444"; hasError = true; } else { $("cm-number").style.borderColor = ""; }
    if (holder.length < 3) { $("cm-holder").style.borderColor = "#ef4444"; hasError = true; } else { $("cm-holder").style.borderColor = ""; }
    if (expiry.length !== 5) { $("cm-expiry").style.borderColor = "#ef4444"; hasError = true; } else { $("cm-expiry").style.borderColor = ""; }
    if (cardName === "Visa" && cvv.length !== 3) { if($("cm-cvv")) $("cm-cvv").style.borderColor = "#ef4444"; hasError = true; } else { if($("cm-cvv")) $("cm-cvv").style.borderColor = ""; }
    if (hasError) return;

    const saveBtn = $("cm-save");
    const origText = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
      saveBtn.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;gap:8px;"><div class="global-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:transparent;border-color:rgba(255,255,255,0.3) rgba(255,255,255,0.3) #fff rgba(255,255,255,0.3);"></div> ${t("save")}</span>`;
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.7";
    }

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
          cvv: cardName === "Visa" ? cvv : "",
          balance: parseFloat($("cm-balance").value.replace(/[\s,]/g, "")) || 0,
        }),
      });
      myMethods.push(newMethod);
      $("card-modal").style.display = "none";
      renderAccounts();
      if ($("view-all-cards") && $("view-all-cards").style.display !== "none") {
        renderAllCards();
      }
      refreshStats();
      showToast("Karta qo'shildi ✓", "success");
    } catch (e) {
      alert(e.message);
    } finally {
      if (saveBtn) {
        saveBtn.innerHTML = origText;
        saveBtn.disabled = false;
        saveBtn.style.opacity = "1";
      }
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
          <p style="font-size:18px;font-weight:700;margin:4px 0 0">${fmt(card.balance, card.cardName === "Visa")}</p>
        </div>
      </div>
    </div>
  `;

  $("cs-full-number").textContent = fullNumSpaced;
  $("cs-expiry").textContent = card.expiry || (card.bank === "Woorkroom Bank" ? "Bank Hisobi" : card.bank) || "—";
  $("cs-holder").textContent = card.holder || "—";
  
  if ($("cs-expiry-container")) {
    $("cs-expiry-container").style.display = card.type === "bank" ? "none" : "block";
  }

  if ($("cs-cvv-container")) {
    const isVisa = card.cardName === "Visa";
    $("cs-cvv").textContent = card.cvv || "—";
    $("cs-cvv-container").style.display = isVisa ? "block" : "none";
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
    
    window.tsSenderCard = null;
    let senderCard = null;
    let receiverCard = null;
    let activeSelection = 'sender';

    const isVisa = (c) => c && c.type === 'card' && (
        (c.cardName && c.cardName.toLowerCase().includes('visa')) || 
        (c.number && c.number.startsWith('4'))
    );

    const renderBox = (containerId, card, isActive) => {
        const container = $(containerId);
        if (!card) {
            container.innerHTML = `
                <div style="height:64px; border:2px dashed ${isActive ? '#5b6ef5' : '#cbd5e1'}; border-radius:16px; display:flex; align-items:center; justify-content:center; gap:8px; background:${isActive ? '#eef2ff' : 'transparent'}; color:${isActive ? '#5b6ef5' : '#94a3b8'}; transition:0.2s;">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
                    <span style="font-weight:600; font-size:14px;">${t("choose_card_title")}</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="height:64px; border:2px solid ${isActive ? '#5b6ef5' : '#e2e8f0'}; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; align-items:center; justify-content:space-between; padding:0 16px; transition:0.2s;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:${containerId === 'ts-sender-box' ? '#5b6ef5' : '#e2e8f0'}; display:flex; align-items:center; justify-content:center;">
                        ${containerId === 'ts-sender-box' ? '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>' : '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#64748b" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'}
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:14px; font-weight:700; color:#0f172a; letter-spacing:-0.2px;">${card.type === "card" ? card.cardName : (card.bank === "Woorkroom Bank" || card.bank === "Bank Hisobi" ? "Bank Hisobi" : card.bank)} ${card.number ? "•••• " + card.number.slice(-4) : ""}</span>
                        <span style="font-size:12px; color:#64748b; font-weight:500; margin-top:2px;">${card.balance.toLocaleString('en-US').replace(/,/g, ' ')} ${isVisa(card) ? "USD" : "UZS"}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const renderRightList = () => {
        const titleEl = $("ts-right-title");
        const listEl = $("ts-right-list");

        if (!activeSelection) {
            titleEl.innerHTML = "Karta tanlash";
            listEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding-top:60px; color:#cbd5e1;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
            `;
            return;
        }

        titleEl.innerHTML = activeSelection === 'sender' ? t("choose_sender_card") : t("choose_receiver_card");
        
        const otherCardId = activeSelection === 'sender' ? (receiverCard ? receiverCard._id : null) : (senderCard ? senderCard._id : null);
        let availableMethods = myMethods.filter(m => m._id !== otherCardId);

        if (otherCardId) {
            const otherCard = myMethods.find(m => m._id === otherCardId);
            if (isVisa(otherCard)) {
                availableMethods = availableMethods.filter(m => isVisa(m));
                if (availableMethods.length === 0) {
                    listEl.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:60px 20px; color:#cbd5e1; text-align:center;">
                            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="1.5" style="margin-bottom:16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div style="font-size:14px; font-weight:600; color:#0f172a; margin-bottom:4px;">Boshqa Visa karta topilmadi</div>
                            <div style="font-size:13px; font-weight:500; color:#64748b;">Visa kartadan faqat boshqa Visa kartaga pul o'tkazish mumkin.</div>
                        </div>
                    `;
                    return;
                }
            } else {
                availableMethods = availableMethods.filter(m => !isVisa(m));
                if (availableMethods.length === 0) {
                    listEl.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:60px 20px; color:#cbd5e1; text-align:center;">
                            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="1.5" style="margin-bottom:16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div style="font-size:14px; font-weight:600; color:#0f172a; margin-bottom:4px;">${t("cards_not_found")}</div>
                            <div style="font-size:13px; font-weight:500; color:#64748b;">Bu kartadan faqat mahalliy kartalarga (yoki hisobga) o'tkazma qilish mumkin.</div>
                        </div>
                    `;
                    return;
                }
            }
        }

        listEl.innerHTML = availableMethods.map(m => {
            const isBlocked = blockedCardIds.has(m._id) || m.isBlocked === true;
            return `
            <div class="ts-option-card ${isBlocked ? 'blocked-option-card' : ''}" data-id="${m._id}" style="padding:16px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; transition:0.2s; background:#fff; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.02)'">
                <div style="display:flex; align-items:center; gap:12px; pointer-events:none;">
                    <div style="width:40px; height:40px; border-radius:12px; background:#f1f5f9; display:flex; align-items:center; justify-content:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <div style="font-weight:600; font-size:15px; color:#0f172a; letter-spacing:-0.2px;">${m.type === "card" ? (m.cardName || t("card")) : (m.bank === "Woorkroom Bank" || m.bank === "Bank Hisobi" ? "Bank Hisobi" : m.bank)} ${m.number ? "•••• " + m.number.slice(-4) : ""}</div>
                        <div style="font-size:13px; color:#64748b; font-weight:500;">${m.balance.toLocaleString('en-US').replace(/,/g, ' ')} ${isVisa(m) ? "USD" : "UZS"}</div>
                    </div>
                </div>
                ${isBlocked ? `
                <div class="card-freeze-indicator">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
                </div>
                <div class="freeze-hover-overlay">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
                  <span style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-top:2px;">${t("card_frozen_label")}</span>
                </div>
                ` : ''}
            </div>
        `}).join("");

        listEl.querySelectorAll(".ts-option-card").forEach(el => {
            el.onclick = () => {
                const selId = el.getAttribute("data-id");
                const isBlocked = blockedCardIds.has(selId) || (myMethods.find(x => x._id === selId)?.isBlocked === true);
                if (isBlocked) {
                    showToast(t("frozen_card_click_error"), "error");
                    return;
                }
                const selMethod = myMethods.find(x => x._id === selId);
                if (activeSelection === 'sender') {
                    senderCard = selMethod;
                    window.tsSenderCard = selMethod;
                    if (!receiverCard) activeSelection = 'receiver';
                    else activeSelection = null;
                } else {
                    receiverCard = selMethod;
                    if (!senderCard) activeSelection = 'sender';
                    else activeSelection = null;
                }
                updateUI();
            };
        });
    };

    const updateUI = () => {
        const hasVisa = isVisa(senderCard) || isVisa(receiverCard);
        const currency = hasVisa ? "USD" : "UZS";

        if ($("ts-currency")) $("ts-currency").innerText = currency;
        if ($("ts-commission")) $("ts-commission").innerText = `Komissiya: 0 ${currency}`;

        renderBox("ts-sender-box", senderCard, activeSelection === 'sender');
        renderBox("ts-receiver-box", receiverCard, activeSelection === 'receiver');
        renderRightList();
    };

    $("ts-sender-box").onclick = () => {
        activeSelection = 'sender';
        updateUI();
    };

    $("ts-receiver-box").onclick = () => {
        activeSelection = 'receiver';
        updateUI();
    };

    updateUI();
    $("ts-amount").value = "";
    $("ts-error").style.display = "none";
    
    modal.style.display = "flex";
    
    $("ts-swap-btn").onclick = () => {
        const temp = senderCard;
        senderCard = receiverCard;
        window.tsSenderCard = senderCard;
        receiverCard = temp;
        if (activeSelection === 'sender') activeSelection = 'receiver';
        else if (activeSelection === 'receiver') activeSelection = 'sender';
        updateUI();
    };

    $("ts-close").onclick = () => modal.style.display = "none";
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; };

    $("ts-confirm").onclick = async () => {
        if (!senderCard || !receiverCard) {
            $("ts-error").textContent = "Iltimos, o'tkazish va qabul qilish kartalarini tanlang";
            $("ts-error").style.display = "block";
            return;
        }

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
        if (blockedCardIds.has(senderCard._id)) {
            $("ts-error").textContent = t("frozen_card_tx_error");
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

const openCurrencyExchangeModal = () => {
    const modal = $("ce-modal");
    if (!modal) return;
    
    const isVisa = (c) => c && c.type === 'card' && (
        (c.cardName && c.cardName.toLowerCase().includes('visa')) || 
        (c.number && c.number.startsWith('4'))
    );

    const visaCards = myMethods.filter(m => isVisa(m));
    const nonVisaCards = myMethods.filter(m => !isVisa(m));
    
    if (visaCards.length === 0 || nonVisaCards.length === 0) {
        showToast("Valyuta almashtirish uchun sizda kamida bitta Visa va bitta boshqa karta (yoki hisob) bo'lishi kerak.", "error");
        return;
    }
    
    let senderCard = null;
    let receiverCard = null;
    let activeSelection = 'sender';

    const renderBox = (containerId, card, isActive) => {
        const container = $(containerId);
        if (!card) {
            container.innerHTML = `
                <div style="height:64px; border:2px dashed ${isActive ? '#5b6ef5' : '#cbd5e1'}; border-radius:16px; display:flex; align-items:center; justify-content:center; gap:8px; background:${isActive ? '#eef2ff' : 'transparent'}; color:${isActive ? '#5b6ef5' : '#94a3b8'}; transition:0.2s;">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
                    <span style="font-weight:600; font-size:14px;">${t("choose_card_title")}</span>
                </div>
            `;
            return;
        }

        const mIsVisa = isVisa(card);
        
        container.innerHTML = `
            <div style="height:64px; border:2px solid ${isActive ? '#5b6ef5' : '#e2e8f0'}; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; align-items:center; justify-content:space-between; padding:0 16px; transition:0.2s;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:${containerId === 'ce-sender-box' ? '#5b6ef5' : '#e2e8f0'}; display:flex; align-items:center; justify-content:center;">
                        ${containerId === 'ce-sender-box' ? '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>' : '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#64748b" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'}
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:14px; font-weight:700; color:#0f172a; letter-spacing:-0.2px;">${card.cardName || (card.bank === "Woorkroom Bank" ? "Bank Hisobi" : card.bank) || "Hisob"} ${card.number ? "•••• " + card.number.slice(-4) : ""}</span>
                        <span style="font-size:12px; color:#64748b; font-weight:500; margin-top:2px;">${card.balance.toLocaleString('en-US').replace(/,/g, ' ')} ${isVisa ? "USD" : "UZS"}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const renderRightList = () => {
        const titleEl = $("ce-right-title");
        const listEl = $("ce-right-list");

        if (!activeSelection) {
            titleEl.innerHTML = "Karta tanlash";
            listEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding-top:60px; color:#cbd5e1;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
            `;
            return;
        }

        titleEl.innerHTML = activeSelection === 'sender' ? t("choose_sender_card") : t("choose_receiver_card");
        
        let availableMethods = [];
        const allCards = myMethods;
        
        if (activeSelection === 'sender') {
            if (receiverCard && isVisa(receiverCard)) availableMethods = nonVisaCards;
            else if (receiverCard && !isVisa(receiverCard)) availableMethods = visaCards;
            else availableMethods = allCards;
        } else {
            if (senderCard && isVisa(senderCard)) availableMethods = nonVisaCards;
            else if (senderCard && !isVisa(senderCard)) availableMethods = visaCards;
            else availableMethods = allCards;
        }

        if (availableMethods.length === 0) {
            listEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding-top:40px; color:#ef4444; text-align:center;">
                    <div style="width:48px; height:48px; border-radius:50%; background:#fef2f2; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <span style="font-size:14px; font-weight:600; line-height:1.4;">Boshqa mos karta topilmadi.<br/>Valyuta almashtirish faqat Visa va Local (Uzcard/Humo) kartalar o'rtasida bo'lishi kerak.</span>
                </div>
            `;
            return;
        }

        listEl.innerHTML = availableMethods.map(m => {
            const mIsVisa = isVisa(m);
            const isBlocked = blockedCardIds.has(m._id) || m.isBlocked === true;
            return `
            <div class="ce-option-card ${isBlocked ? 'blocked-option-card' : ''}" data-id="${m._id}" style="padding:16px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; transition:0.2s; background:#fff; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.02)'">
                <div style="display:flex; align-items:center; gap:12px; pointer-events:none;">
                    <div style="width:40px; height:40px; border-radius:12px; background:#f1f5f9; display:flex; align-items:center; justify-content:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <div style="font-weight:600; font-size:15px; color:#0f172a; letter-spacing:-0.2px;">${m.cardName || (m.bank === "Woorkroom Bank" ? "Bank Hisobi" : m.bank) || t("bank")} ${m.number ? "•••• " + m.number.slice(-4) : ""}</div>
                        <div style="font-size:13px; color:#64748b; font-weight:500;">${m.balance.toLocaleString('en-US').replace(/,/g, ' ')} ${mIsVisa ? "USD" : "UZS"}</div>
                    </div>
                </div>
                ${isBlocked ? `
                <div class="card-freeze-indicator">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
                </div>
                <div class="freeze-hover-overlay">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
                  <span style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-top:2px;">${t("card_frozen_label")}</span>
                </div>
                ` : ''}
            </div>
        `}).join("");

        listEl.querySelectorAll(".ce-option-card").forEach(el => {
            el.onclick = () => {
                const selId = el.getAttribute("data-id");
                const isBlocked = blockedCardIds.has(selId) || (myMethods.find(x => x._id === selId)?.isBlocked === true);
                if (isBlocked) {
                    showToast(t("frozen_card_click_error"), "error");
                    return;
                }
                const selMethod = myMethods.find(x => x._id === selId);
                if (activeSelection === 'sender') {
                    senderCard = selMethod;
                    if (isVisa(senderCard) && receiverCard && isVisa(receiverCard)) receiverCard = null;
                    if (!isVisa(senderCard) && receiverCard && !isVisa(receiverCard)) receiverCard = null;
                    activeSelection = receiverCard ? null : 'receiver';
                } else {
                    receiverCard = selMethod;
                    if (isVisa(receiverCard) && senderCard && isVisa(senderCard)) senderCard = null;
                    if (!isVisa(receiverCard) && senderCard && !isVisa(senderCard)) senderCard = null;
                    activeSelection = senderCard ? null : 'sender';
                }
                updateUI();
                updateCalculations();
            };
        });
    };

    const updateUI = () => {
        renderBox("ce-sender-box", senderCard, activeSelection === 'sender');
        renderBox("ce-receiver-box", receiverCard, activeSelection === 'receiver');
        renderRightList();
        
        if (senderCard) {
            $("ce-currency-send").textContent = isVisa(senderCard) ? "USD" : "UZS";
        }
        if (receiverCard) {
            $("ce-currency-receive").textContent = isVisa(receiverCard) ? "USD" : "UZS";
        }
    };

    const updateCalculations = () => {
        const val = parseFloat($("ce-amount-send").value.replace(/[\s,]/g, "")) || 0;
        let result = 0;
        const rate = exchangeRates.USD || 12800; // default if not loaded
        
        if (senderCard && isVisa(senderCard)) {
            // USD to UZS
            result = val * rate;
        } else {
            // UZS to USD
            result = val / rate;
        }
        
        if (receiverCard && isVisa(receiverCard)) {
            $("ce-amount-receive").value = result > 0 ? result.toFixed(2) : "0";
        } else {
            $("ce-amount-receive").value = result > 0 ? Math.floor(result).toLocaleString('en-US').replace(/,/g, ' ') : "0";
        }
        
        $("ce-rate-display").textContent = `1 USD = ${rate.toLocaleString('en-US').replace(/,/g, ' ')} UZS`;
    };

    $("ce-sender-box").onclick = () => {
        activeSelection = 'sender';
        updateUI();
    };

    $("ce-receiver-box").onclick = () => {
        activeSelection = 'receiver';
        updateUI();
    };

    $("ce-swap-btn").onclick = () => {
        const temp = senderCard;
        senderCard = receiverCard;
        receiverCard = temp;
        activeSelection = null;
        updateUI();
        updateCalculations();
    };

    $("ce-amount-send").oninput = (e) => {
        let val = e.target.value.replace(/[^\d.]/g, "");
        if (val.split('.').length > 2) val = val.replace(/\.+$/, "");
        if (senderCard && !isVisa(senderCard)) {
            val = val.replace(/\./g, ""); // No decimals for UZS
        }
        e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        updateCalculations();
    };

    $("ce-close").onclick = () => {
        modal.style.display = "none";
    };
    
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; };

    const confirmBtn = $("ce-confirm");
    confirmBtn.onclick = async () => {
        if (!senderCard || !receiverCard) {
            $("ce-error").textContent = "Iltimos, yuboruvchi va qabul qiluvchi kartalarni tanlang";
            $("ce-error").style.display = "block";
            return;
        }
        if (senderCard.isBlocked || receiverCard.isBlocked || blockedCardIds.has(senderCard._id) || blockedCardIds.has(receiverCard._id)) {
            $("ce-error").textContent = t("frozen_card_click_error");
            $("ce-error").style.display = "block";
            return;
        }
        const raw = $("ce-amount-send").value.replace(/[\s,]/g, "");
        const amount = parseFloat(raw);
        if (!amount || amount <= 0) {
            $("ce-error").textContent = t("invalid_amount") || "Noto'g'ri summa kiritildi";
            $("ce-error").style.display = "block";
            return;
        }
        if (amount > senderCard.balance) {
            $("ce-error").textContent = t("insufficient_balance") || "Balans yetarli emas";
            $("ce-error").style.display = "block";
            return;
        }
        
        $("ce-error").style.display = "none";
        const oldTxt = confirmBtn.innerHTML;
        confirmBtn.innerHTML = `<span class="ts-spinner"></span>`;
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.7";

        try {
            const currentUserId = getCurrent().userId || getCurrent()._id;
            const rate = exchangeRates.USD || 12800;
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
                    description: "Valyuta almashtirish",
                    receiverId: currentUserId,
                    exchangeRate: rate
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Xatolik yuz berdi");
            }

            showToast("Valyuta muvaffaqiyatli almashtirildi!", "success");
            modal.style.display = "none";
            await loadPaymentData();
            refreshStats();
            renderDocsMini();
            renderAccounts();
            if ($("view-all-cards") && $("view-all-cards").style.display !== "none") renderAllCards(); 
        } catch (err) {
            $("ce-error").textContent = err.message || "Xatolik yuz berdi";
            $("ce-error").style.display = "block";
        } finally {
            confirmBtn.innerHTML = oldTxt;
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = "1";
        }
    };
    updateUI();
    $("ce-amount-send").value = "";
    $("ce-amount-receive").value = "0";
    $("ce-error").style.display = "none";
    updateCalculations();
    
    modal.style.display = "flex";
};

// ── BARCHA KARTALAR FUNCTIONS ──
let selectedInspectorCardId = null;

const renderAllCards = () => {
  const grid = $("all-cards-grid-container");
  if (!grid) return;

  const typeFilter = $("all-cards-type-filter-custom")?.dataset.value || "";

  // Filter methods
  const filtered = myMethods.filter(m => {
    let matchType = true;
    if (typeFilter) {
       if (typeFilter === "Bank") {
          matchType = m.type === "bank";
       } else {
          // Humo, Uzcard, Visa
          const name = (m.cardName || m.brand || "").toLowerCase();
          matchType = m.type === "card" && name.includes(typeFilter.toLowerCase());
       }
    }
    return matchType;
  });

  // Removed total balance logic

  let cardsHtml = "";
  if (!filtered.length) {
    cardsHtml = `
      <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 60px 20px; color:#8892a4; text-align:center;">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="2" y1="10" x2="23" y2="10"></line></svg>
        <p style="font-weight:600; margin:0 0 4px; font-size:14px; color:#1a1d2e;">${t("cards_not_found")}</p>
        <p style="font-size:12px; margin:0;">${t("no_cards_by_filters")}</p>
      </div>
    `;
    const isSelectedFiltered = filtered.some(m => m._id === selectedInspectorCardId);
    if (!isSelectedFiltered) {
      showCardInspector(null);
    }
  } else {
    cardsHtml = filtered.map(m => {
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

      const isActive = selectedInspectorCardId === m._id ? " active-card" : "";
      const isBlocked = blockedCardIds.has(m._id);
      const defaultBadge = m.isDefault ? `<span class="card-default-badge">${t("default_label")}</span>` : "";

      return `
        <div class="all-cards-item${isActive}" data-id="${m._id}">
          <div class="biz-acc-card ${m.type === "card" ? "card-grad" : "bank-grad"}" style="min-height:160px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; border-radius:16px;">
            ${defaultBadge}
            
            <!-- Blocked Overlay -->
            ${isBlocked ? `
              <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.7); backdrop-filter:blur(3px); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; gap:8px; z-index:2;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake-icon lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
                <span style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Karta muzlatilgan</span>
              </div>
            ` : ""}

            <div style="display:flex; justify-content:space-between; align-items:flex-start">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-nfc-icon lucide-nfc"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
              <span style="font-size:13px; font-weight:700; letter-spacing:1.5px; opacity:.9">${label}</span>
            </div>
            
            <div style="margin: 10px 0;">
              <span style="font-size:14px; font-weight:700; letter-spacing:1.5px;">${formatted}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end">
              <div>
                <p style="font-size:8px; opacity:.55; margin:0; text-transform:uppercase; letter-spacing:.5px;">BALANCE</p>
                <p style="font-size:16px; font-weight:700; margin:2px 0 0">${fmt(m.balance, m.cardName === "Visa")}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  const addCardHtml = `
    <div class="all-cards-item-add" style="display:flex; cursor:pointer;" onclick="document.getElementById('add-card-btn')?.click()">
      <div class="biz-acc-card" style="flex:1; min-height:160px; background:transparent; border:2px dashed #cbd5e1; border-radius:16px; display:flex; align-items:center; justify-content:center; color:#8892a4; transition:all 0.3s;" onmouseover="this.style.borderColor='#5b6ef5'; this.style.color='#5b6ef5'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.color='#8892a4'">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path d="M12 4v16m8-8H4" />
        </svg>
      </div>
    </div>
  `;

  grid.innerHTML = cardsHtml + addCardHtml;


  // Attach card click handlers
  grid.querySelectorAll(".all-cards-item").forEach(item => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      selectedInspectorCardId = id;
      grid.querySelectorAll(".all-cards-item").forEach(el => el.classList.remove("active-card"));
      item.classList.add("active-card");
      
      const card = myMethods.find(m => m._id === id);
      showCardInspector(card);
    });
  });

  // Keep showing the selected card in inspector if still valid
  const currentCard = myMethods.find(m => m._id === selectedInspectorCardId);
  if (currentCard && filtered.some(m => m._id === selectedInspectorCardId)) {
    showCardInspector(currentCard);
  } else {
    showCardInspector(null);
  }
};

const showCardInspector = (card) => {
  const noSelection = $("all-cards-no-selection");
  const panel = $("all-cards-details-panel");
  if (!noSelection || !panel) return;

  if (!card) {
    noSelection.style.display = "flex";
    panel.style.display = "none";
    return;
  }

  noSelection.style.display = "none";
  panel.style.display = "flex";

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

  // Filter transactions for this card
  const sId = card._id;
  const cardTx = myTransactions.filter(tx => {
    const txSenderId = typeof tx.senderMethodId === 'object' && tx.senderMethodId ? tx.senderMethodId._id : tx.senderMethodId;
    const txReceiverId = typeof tx.receiverMethodId === 'object' && tx.receiverMethodId ? tx.receiverMethodId._id : tx.receiverMethodId;
    return txSenderId === sId || txReceiverId === sId;
  }).reverse().slice(0, 5); // top 5 recent

  const isBlocked = blockedCardIds.has(card._id);

  panel.innerHTML = `
    <!-- Large Card Preview -->
    <div class="biz-acc-card ${card.type === "card" ? "card-grad" : "bank-grad"}" style="min-height:165px; margin:0; padding:20px; color:#fff; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 8px 18px rgba(0,0,0,0.1); position:relative; overflow:hidden;">
      <!-- Blocked Overlay -->
      ${isBlocked ? `
        <div style="position:absolute; inset:0; background:rgba(15, 23, 42, 0.7); backdrop-filter:blur(3px); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; gap:8px; z-index:2;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake-icon lucide-snowflake"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
          <span style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">${t("card_frozen_label")}</span>
        </div>
      ` : ""}
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-nfc-icon lucide-nfc"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>
        <span style="font-size:14px;font-weight:700;letter-spacing:1.5px;opacity:.9">${label}</span>
      </div>
      <div style="margin:16px 0;">
        <span style="font-size:16px;font-weight:700;letter-spacing:2px; display:flex; align-items:center; gap:8px;">
          <span id="inspector-masked-num">${formatted}</span>
          <button id="inspector-toggle-num" style="background:transparent; border:none; color:inherit; opacity:0.7; cursor:pointer; display:flex; align-items:center;">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div style="text-align:left">
          <p style="font-size:9px;opacity:.55;margin:0;text-transform:uppercase;letter-spacing:.5px">${t("balance")}</p>
          <p style="font-size:18px;font-weight:700;margin:4px 0 0">${fmt(card.balance, card.cardName === "Visa")}</p>
        </div>
        <button class="biz-card-settings-btn" id="inspector-settings-btn" style="background:transparent;border:none;color:inherit;cursor:pointer;opacity:0.8;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
      </div>
    </div>

    <!-- Switch lock card -->
    <div class="switch-container">
      <div class="switch-label-wrap">
        <span class="switch-title">${t("freeze_card")}</span>
        <span class="switch-desc">${isBlocked ? t("frozen_card_desc") : t("freeze_card_desc")}</span>
      </div>
      <label class="switch-element">
        <input type="checkbox" id="inspector-lock-switch" ${isBlocked ? "checked" : ""}>
        <span class="switch-slider"></span>
      </label>
    </div>

    <!-- Metadata Details -->
    <div style="background:#fff; padding:16px; border-radius:14px; border:1px solid #f0f2fa; display:flex; flex-direction:column;">
      <div class="inspector-detail-row">
        <span class="inspector-detail-label">${t("card_name")}</span>
        <span class="inspector-detail-value">${card.cardName || '—'}</span>
      </div>
      <div class="inspector-detail-row">
        <span class="inspector-detail-label">${t("col_type")}</span>
        <span class="inspector-detail-value" style="text-transform:uppercase;">${card.type === 'card' ? t("card_type") : t("bank_type")}</span>
      </div>
      <div class="inspector-detail-row">
        <span class="inspector-detail-label">${t("holder")}</span>
        <span class="inspector-detail-value">${card.holder || '—'}</span>
      </div>
      ${card.expiry ? `
      <div class="inspector-detail-row">
        <span class="inspector-detail-label">${t("expiry_date")}</span>
        <span class="inspector-detail-value">${card.expiry}</span>
      </div>` : ""}
      ${card.cardName === 'Visa' ? `
      <div class="inspector-detail-row">
        <span class="inspector-detail-label">CVV</span>
        <span class="inspector-detail-value" style="display:flex; align-items:center; gap:8px;">
          <span id="inspector-masked-cvv" style="font-family:monospace; font-size:12px;">***</span>
          <button id="inspector-toggle-cvv" style="background:transparent; border:none; color:inherit; opacity:0.7; cursor:pointer; display:flex; align-items:center; padding:0;">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button id="inspector-copy-cvv" style="background:#f1f3fa; border:none; border-radius:4px; padding:3px 6px; font-size:10px; font-weight:700; cursor:pointer; color:#5a6279;">${t("copy")}</button>
        </span>
      </div>` : ""}
      <div class="inspector-detail-row" style="border-bottom:none; padding-bottom:0;">
        <span class="inspector-detail-label">${t("full_number")}</span>
        <span class="inspector-detail-value" style="display:flex; align-items:center; gap:8px;">
          <span id="inspector-full-num" style="font-family:monospace; font-size:12px;">${fullNumSpaced}</span>
          <button id="inspector-copy-num" style="background:#f1f3fa; border:none; border-radius:4px; padding:3px 6px; font-size:10px; font-weight:700; cursor:pointer; color:#5a6279;">${t("copy")}</button>
        </span>
      </div>
    </div>

    <!-- Card Actions Buttons -->
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${!card.isDefault ? `
        <button class="inspector-action-btn inspector-action-secondary" id="inspector-set-default-btn">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
          ${t("set_as_default_btn")}
        </button>
      ` : `
        <div style="display:flex; align-items:center; justify-content:center; gap:6px; color:#10b981; font-weight:700; font-size:12px; background:#e6f9f0; padding:10px; border-radius:12px;">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
          ${t("default_card_set_message")}
        </div>
      `}
      
      ${!card.isDefault ? `
        <button class="inspector-action-btn inspector-action-danger" id="inspector-delete-btn">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          ${t("delete_card")}
        </button>
      ` : ""}
    </div>

    <!-- Recent Transactions For This Card -->
    <div style="display:flex; flex-direction:column; gap:8px;">
      <h4 style="font-size:13px; font-weight:700; color:#1a1d2e; margin:10px 0 2px;">${t("recent_transactions")}</h4>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${cardTx.length ? cardTx.map(tx => {
          const isPending = tx.status === "waiting";
          const me = getCurrent();
          const userId = me?.userId || me?._id;
          let isSent = tx.senderId === userId;
          const isInternal = tx.senderId === userId && tx.receiverId === userId;
          
          let displayAmount = tx.amount;
          let isVisa = card.cardName === "Visa";
          
          if (isInternal) {
             const sId = typeof tx.senderMethodId === 'object' && tx.senderMethodId ? tx.senderMethodId._id : tx.senderMethodId;
             const rId = typeof tx.receiverMethodId === 'object' && tx.receiverMethodId ? tx.receiverMethodId._id : tx.receiverMethodId;
             if (card._id === rId) {
                isSent = false;
                const isExchange = (tx.description === "Valyuta almashtirish" || tx.description === "Currency Exchange" || tx.description === "Обмен валюты");
                if (isExchange) {
                    const rate = exchangeRates.USD || 12800;
                    const sMeth = getMethodInfo(tx.senderMethodId, sId, true);
                    const sIsVisa = sMeth && sMeth.cardName === "Visa";
                    if (sIsVisa && !isVisa) displayAmount = tx.amount * rate;
                    else if (!sIsVisa && isVisa) displayAmount = tx.amount / rate;
                }
             }
          }
          
          let title = isSent ? `Yuborildi: ${tx.receiverName || "User"}` : `Qabul qilindi: ${tx.senderName || "User"}`;
          if (isInternal) {
              title = (tx.description === "Valyuta almashtirish" || tx.description === "Currency Exchange" || tx.description === "Обмен валюты") 
                  ? t("currency_exchange") 
                  : t("internal_transfer");
          }
          if (tx.receiverId === "system_tour") title = tx.description || t("tour_purchase");
          
          const badgeClass = tx.status === "paid" ? "biz-status-success" : (isPending ? "biz-status-pending" : "biz-status-failed");
          const d = new Date(tx.createdAt);
          const date = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          
          const amtColor = isPending ? "#f59e0b" : (isSent ? "#ef4444" : "#16a34a");
          const amtSign = isSent ? "-" : "+";

          return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#fff; border:1px solid #f0f2fa; border-radius:12px; transition:transform 0.2s;">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <div style="width:28px; height:28px; border-radius:50%; background:${isSent ? '#fee2e2' : '#dcfce7'}; color:${isSent ? '#ef4444' : '#16a34a'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="${isSent ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'}"/></svg>
                </div>
                <div style="min-width:0;">
                  <p style="margin:0; font-size:12px; font-weight:600; color:#1a1d2e; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
                  <p style="margin:2px 0 0; font-size:10px; color:#8892a4;">${date} • <span class="biz-status-badge ${badgeClass}" style="padding:1px 4px; font-size:8px;">${tx.status}</span></p>
                </div>
              </div>
              <span style="font-size:12px; font-weight:700; color:${amtColor}; flex-shrink:0;">${amtSign} ${fmt(displayAmount, tx.currency === "USD" || isVisa)}</span>
            </div>
          `;
        }).join("") : `<p style="font-size:11px; color:#8892a4; text-align:center; padding:12px; background:#fff; border-radius:12px; border:1px dashed #cbd5e1; margin:0;">${t("no_recent_transactions")}</p>`}
      </div>
    </div>
  `;

  // Attach inspector event handlers
  // Settings btn
  const insSettingsBtn = $("inspector-settings-btn");
  if (insSettingsBtn) {
    insSettingsBtn.onclick = () => {
      openCardSettingsModal(card);
    };
  }

  // CVV interactions
  if (card.cardName === "Visa") {
    const cvvVal = card.cvv || "—";
    let isCvvMasked = true;
    const tglBtn = $("inspector-toggle-cvv");
    if (tglBtn) {
      tglBtn.onclick = () => {
        isCvvMasked = !isCvvMasked;
        $("inspector-masked-cvv").textContent = isCvvMasked ? "***" : cvvVal;
        tglBtn.innerHTML = isCvvMasked 
          ? `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
          : `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      };
    }
    const copyCvvBtn = $("inspector-copy-cvv");
    if (copyCvvBtn) {
      copyCvvBtn.onclick = () => {
        if (cvvVal !== "—") {
          navigator.clipboard.writeText(cvvVal);
          showToast("CVV nusxalandi!", "success");
        } else {
          showToast("CVV mavjud emas", "error");
        }
      };
    }
  }

  // Copy card num
  $("inspector-copy-num").onclick = () => {
    navigator.clipboard.writeText(fullNum);
    showToast("Karta raqami nusxalandi!", "success");
  };

  // Toggle card mask
  let isMasked = true;
  $("inspector-toggle-num").onclick = () => {
    isMasked = !isMasked;
    $("inspector-masked-num").textContent = isMasked ? formatted : fullNumSpaced;
    $("inspector-toggle-num").innerHTML = isMasked 
      ? `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
      : `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  };

  // Lock/unlock toggle
  $("inspector-lock-switch").onchange = async (e) => {
    const isBlocked = e.target.checked;
    try {
      const res = await fetch(`${API_URL}/api/payments/methods/${card._id}/block`, {
        method: "PATCH",
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ isBlocked })
      });
      if (!res.ok) {
        throw new Error("Server xatoligi");
      }
      const updatedCard = await res.json();
      if (isBlocked) {
        blockedCardIds.add(card._id);
        showToast("Karta bloklandi!", "warning");
      } else {
        blockedCardIds.delete(card._id);
        showToast("Karta faollashtirildi!", "success");
      }
      card.isBlocked = isBlocked;
      const idx = myMethods.findIndex(m => m._id === card._id);
      if (idx !== -1) myMethods[idx].isBlocked = isBlocked;
    } catch (err) {
      showToast("Karta holatini yangilashda xatolik: " + err.message, "error");
      e.target.checked = !isBlocked;
    }
    // Re-render
    renderAllCards();
    renderAccounts();
  };

  // Set default
  const defaultBtn = $("inspector-set-default-btn");
  if (defaultBtn) {
    defaultBtn.onclick = () => {
      myMethods.forEach(m => {
        m.isDefault = m._id === card._id;
      });
      showToast("Asosiy hisob o'rnatildi!", "success");
      renderAllCards();
      renderAccounts();
    };
  }

  // Delete card
  const deleteBtn = $("inspector-delete-btn");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
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
          selectedInspectorCardId = null;
          renderAllCards();
          renderAccounts();
          refreshStats();
          showToast("Karta muvaffaqiyatli o'chirildi ✓", "success");
        } catch (e) {
          showToast(e.message, "error");
        }
      };
    };
  }
};
