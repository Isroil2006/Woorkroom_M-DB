import { createPayAnalyticsBtn, initPayAnalytics } from "./analytics.js";
import { translations } from "./translations.js";
import { getCurrentUser, getAuthHeaders, fetchCurrentUser, API_URL } from "../../assets/js/api.js";
import { getCurrentLang, createTranslationHelper, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";

const t = createTranslationHelper(translations);
const getCurrent = () => getCurrentUser();

// ─── DATA (server-dan yuklanadi) ────────────────────────────────
let myMethods = [];
let myTransactions = [];
let paymentUsers = [];
let myStats = {};
let pusherChannel = null;

// ─── API HELPERS ─────────────────────────────────────────────────
const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${API_URL}${url}`, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Xatolik" }));
    throw new Error(err.message || "Server xatosi");
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
const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ─── PAGE TEMPLATE ──────────────────────────────────────────────
export const BusinessPage = () => `
<div class="biz-container">
<div class="biz-root">

  <div class="biz-header">
    <div>
      <p class="biz-greeting">${t("hi")} <span id="biz-username">User</span>,</p>
      <h1 class="biz-welcome">${t("biz_welcome")}</h1>
    </div>
  </div>

  <div class="biz-stats-row">
    <div class="biz-stat-card">
      <div class="biz-stat-icon waiting-icon">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
      </div>
      <div><p class="biz-stat-label">${t("waiting_to_pay")}</p><p class="biz-stat-value" id="stat-waiting">$0</p></div>
    </div>
    <div class="biz-stat-card">
      <div class="biz-stat-icon paid-icon">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div><p class="biz-stat-label">${t("already_paid")}</p><p class="biz-stat-value" id="stat-paid">$0</p></div>
    </div>
    <div class="biz-stat-card">
      <div class="biz-stat-icon clients-icon">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
      <div><p class="biz-stat-label">${t("users")}</p><p class="biz-stat-value" id="stat-clients">0</p></div>
    </div>
    <div class="biz-stat-card biz-stat-accent">
      <div class="biz-stat-icon account-icon">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 3H8L2 7h20l-6-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <p class="biz-stat-label" style="color:rgba(255,255,255,.7)">${t("account_balance")}</p>
        <p class="biz-stat-value" id="stat-balance" style="color:#fff">$0</p>
      </div>
    </div>
  </div>

  <div id="view-dashboard">
    <div class="biz-card">
      <div class="biz-card-head">
        <h3>${t("users")}</h3>
        <button class="biz-link-btn" id="btn-view-clients">${t("view_all")}</button>
      </div>
      <div id="clients-mini"></div>
    </div>
    <div class="biz-card">
      <div class="biz-card-head">
        <h3>${t("documents")}</h3>
        <button class="biz-link-btn" id="btn-view-docs">${t("view_all")}</button>
      </div>
      <div id="docs-mini"></div>
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
        <span>${t("col_description")}</span>
        <span>${t("col_from_to")}</span>
        <span>${t("col_amount")}</span>
        <span>${t("col_date")}</span>
        <span>${t("col_time")}</span>
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
  <div class="biz-card" style="height:100%">
    <div class="biz-card-head">
      <h3>${t("my_accounts")}</h3>
      <button class="biz-btn-sm" id="add-card-btn">${t("add_card")}</button>
    </div>
    <div id="accounts-list"></div>
  </div>
</div>
</div>

<!-- ══ SEND DRAWER ══ -->
<div id="send-drawer-overlay" class="biz-overlay" style="display:none">
  <div class="biz-drawer">
    <div class="biz-drawer-topbar">
      <button class="biz-link-btn" id="drawer-back">${t("go_back")}</button>
      <button class="biz-close-btn" id="drawer-close">✕</button>
    </div>
    <h2 class="biz-drawer-title">${t("fund_wallet")}</h2>
    <p style="font-size:13px;color:#8892a4;margin:-10px 0 0">${t("fund_wallet_desc")}</p>
    <div class="biz-balance-box">
      ${t("wallet_balance")}
      <strong id="drawer-my-balance">$0</strong>
    </div>
    <div id="drawer-form" style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label class="biz-label">${t("amount_label")}</label>
        <input class="biz-input" type="number" id="d-amount" placeholder="${t("amount_placeholder")}" />
      </div>
      <div>
        <label class="biz-label">${t("payment_method")}</label>
        <div style="display:flex;gap:10px;margin-bottom:8px">
          <label class="biz-radio-pill" id="pill-bank"><input type="radio" name="pay-type" value="bank" checked /> ${t("bank_transfer")}</label>
          <label class="biz-radio-pill" id="pill-card"><input type="radio" name="pay-type" value="card" /> ${t("fund_by_card")}</label>
        </div>
        <div id="my-methods-list"></div>
      </div>
      <div>
        <label class="biz-label">${t("send_to")}</label>
        <select class="biz-input" id="d-recipient">
          <option value="">${t("select_user")}</option>
        </select>
      </div>
      <div id="recipient-methods-wrap" style="display:none">
        <label class="biz-label">${t("recipient_account")}</label>
        <div id="recipient-methods-list"></div>
      </div>
      <div>
        <label class="biz-label">${t("beneficiary_name")}</label>
        <input class="biz-input" id="d-beneficiary" readonly placeholder="${t("auto_filled")}" />
      </div>
      <div>
        <label class="biz-label">${t("description")}</label>
        <textarea class="biz-input" id="d-desc" rows="3" placeholder="${t("write_description")}"></textarea>
      </div>
      <button class="biz-btn-primary" id="d-proceed" style="width:100%">${t("proceed")}</button>
      <p class="biz-error" id="d-error"></p>
    </div>

    <!-- ══ SMS VERIFY STEP ══ -->
    <div id="drawer-sms" style="display:none;flex-direction:column;align-items:center;gap:20px;padding:40px 0 20px">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#5b6ef5,#7c3aed);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(91,110,245,.35)">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.06 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>
      <div style="text-align:center">
        <h3 id="sms-title" style="margin:0 0 6px;font-size:18px;font-weight:800;color:#1a1d2e"></h3>
        <p id="sms-desc" style="margin:0;font-size:13px;color:#8892a4;line-height:1.5"></p>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <input id="sms-d1" class="biz-otp-input" maxlength="1" inputmode="numeric" type="text" />
        <input id="sms-d2" class="biz-otp-input" maxlength="1" inputmode="numeric" type="text" />
        <input id="sms-d3" class="biz-otp-input" maxlength="1" inputmode="numeric" type="text" />
        <input id="sms-d4" class="biz-otp-input" maxlength="1" inputmode="numeric" type="text" />
      </div>
      <p id="sms-error" style="color:#ef4444;font-size:12px;min-height:16px;margin:0"></p>
      <button class="biz-btn-primary" id="sms-confirm-btn" style="width:100%"></button>
      <button class="biz-link-btn" id="sms-back-btn" style="font-size:13px;color:#8892a4"></button>
    </div>

    <div id="drawer-success" style="display:none;text-align:center;padding:60px 20px">
      <svg width="64" height="64" fill="none" viewBox="0 0 24 24" style="display:block;margin:0 auto 16px">
        <circle cx="12" cy="12" r="11" stroke="#22c55e" stroke-width="1.5"/>
        <path d="M7 12l3.5 3.5L17 8" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h3 style="font-size:20px;font-weight:800;color:#1a1d2e;margin:0 0 6px">${t("transaction_success")}</h3>
      <button class="biz-btn-primary" id="d-return" style="width:100%;margin-top:24px">${t("return_dashboard")}</button>
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
    <label class="biz-label">${t("card_number")}</label>
    <input class="biz-input" id="cm-number" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric" />
    <label class="biz-label">${t("card_holder")}</label>
    <input class="biz-input" id="cm-holder" placeholder="${t("full_name")}" />
    <div style="display:flex;gap:12px">
      <div style="flex:1"><label class="biz-label">${t("expiry")}</label><input class="biz-input" id="cm-expiry" placeholder="05/27" maxlength="5" inputmode="numeric"/></div>
      <div style="flex:1"><label class="biz-label">${t("balance_dollar")}</label><input class="biz-input" type="number" id="cm-balance" placeholder="0"/></div>
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

<!-- ══ NOTIFICATION TOAST ══ -->
<div id="biz-toast" class="biz-toast" style="display:none"></div>
`;

const $ = (id) => document.getElementById(id);
const PAGE = 5;

// ─── TOAST ──────────────────────────────────────────────────────
const showToast = (msg, type = "info") => {
  const toast = $("biz-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `biz-toast biz-toast-${type}`;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 4000);
};

// ─── RENDER FUNCTIONS ───────────────────────────────────────────
const refreshStats = () => {
  const me = getCurrent();
  const totalBalance = myMethods.reduce((s, m) => s + (m.balance || 0), 0);
  const userId = me?.userId || me?._id;
  const outgoing = myTransactions.filter((t) => t.senderId === userId);
  const waiting = outgoing.filter((t) => t.status === "waiting").reduce((s, t) => s + t.amount, 0);
  const paid = outgoing.filter((t) => t.status === "paid").reduce((s, t) => s + t.amount, 0);

  if ($("stat-waiting")) $("stat-waiting").textContent = fmt(waiting);
  if ($("stat-paid")) $("stat-paid").textContent = fmt(paid);
  if ($("stat-clients")) $("stat-clients").textContent = paymentUsers.length;
  if ($("stat-balance")) $("stat-balance").textContent = fmt(totalBalance);
  if ($("biz-username")) $("biz-username").textContent = me?.username || "User";
  if ($("drawer-my-balance")) $("drawer-my-balance").textContent = fmt(totalBalance);
};

const renderAccounts = () => {
  const el = $("accounts-list");
  if (!el) return;
  el.innerHTML = myMethods.length
    ? myMethods.map((m) => {
        return `
        <div class="biz-acc-card ${m.type === "card" ? "card-grad" : "bank-grad"}">
          ${!m.isDefault ? `<button class="biz-acc-del" data-mid="${m._id}">✕</button>` : ""}
          <div class="biz-acc-top">
            <span class="biz-acc-badge">${m.type === "card" ? t("card_type") : t("bank_type")}</span>
            ${m.isDefault ? `<span class="biz-acc-badge" style="background:rgba(255,255,255,.35)">${t("default_label")}</span>` : ""}
          </div>
          <p class="biz-acc-num">${m.displayNumber || m.number}</p>
          <p class="biz-acc-holder">${m.holder || "—"}</p>
          <div class="biz-acc-foot">
            <div><p class="biz-acc-bal-label">${t("balance")}</p><p class="biz-acc-bal">${fmt(m.balance)}</p></div>
            <span style="font-size:11px;opacity:.65">${m.expiry || m.bank || ""}</span>
          </div>
        </div>`;
      }).join("")
    : `<p class="biz-empty">${t("no_accounts")}</p>`;

  el.querySelectorAll(".biz-acc-del").forEach((btn) => {
    btn.onclick = () => {
      const mid = btn.dataset.mid;
      $("del-card-title").textContent = t("delete_card_title");
      $("del-card-desc").textContent = t("delete_card_desc");
      $("del-card-cancel").textContent = t("cancel");
      $("del-card-confirm").textContent = t("delete_confirm_btn");
      $("del-card-modal").style.display = "flex";
      const confirmBtn = $("del-card-confirm");
      const newConfirm = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
      newConfirm.onclick = async () => {
        $("del-card-modal").style.display = "none";
        try {
          await apiFetch(`/api/payments/methods/${mid}`, { method: "DELETE" });
          myMethods = myMethods.filter((m) => m._id !== mid);
          renderAccounts();
          refreshStats();
        } catch (e) {
          showToast(e.message, "error");
        }
      };
    };
  });
};

const renderClientsMini = () => {
  const el = $("clients-mini");
  if (!el) return;
  const users = paymentUsers.slice(0, 3);
  el.innerHTML = users.length
    ? users.map((u) => {
        const bal = u.totalBalance || 0;
        return `
        <div class="biz-mini-row">
          <div class="biz-user-cell">
            ${avatarHTML(u, 34)}
            <div>
              <p class="biz-user-name">${u.username || "—"}</p>
              <p class="biz-user-phone">${u.tel || u.email || "—"}</p>
            </div>
          </div>
          <span style="margin-left:auto;font-size:12px;font-weight:700;color:#5b6ef5">${fmt(bal)}</span>
        </div>`;
      }).join("")
    : `<p class="biz-empty">${t("no_users_yet")}</p>`;
};

const renderDocsMini = () => {
  const el = $("docs-mini");
  if (!el) return;
  const me = getCurrent();
  const userId = me?.userId || me?._id;
  const payments = myTransactions.slice(-6).reverse();
  el.innerHTML = payments.length
    ? payments.map((p) => {
        const isIn = p.receiverId === userId && p.status === "paid";
        let color;
        if (isIn) color = "#22c55e";
        else if (p.status === "paid") color = "#ef4444";
        else color = "#f59e0b";
        const sign = isIn ? "+" : "-";
        const fromToLabel = isIn ? t("label_from") : t("label_to");
        const name = isIn ? p.senderName : p.receiverName;
        return `
        <div class="biz-doc-mini-row">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <div class="biz-doc-mini-icon"><img src="/pages/Business/images/folder icon.svg" alt=""></div>
            <div>
              <p class="biz-user-name">${p.description || t("documents")}</p>
              <p class="biz-user-phone">${fromToLabel} ${name || "—"} · ${new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <span style="font-weight:700;color:${color};font-size:13px">${sign}${fmt(p.amount)}</span>
        </div>`;
      }).join("")
    : `<p class="biz-empty">${t("no_docs_yet")}</p>`;
};

// ─── FULL VIEWS ─────────────────────────────────────────────────
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
  });
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
        const badgeClass = isIn ? "biz-badge-incoming" : isWait ? "biz-badge-pending" : "biz-badge-confirmed";
        const badgeText = isIn ? t("badge_incoming") : isWait ? t("badge_pending") : t("badge_confirmed");
        const fromToLabel = isIn ? t("label_from") : t("label_to");
        const fromToName = isIn ? p.senderName : p.receiverName;
        const date = new Date(p.createdAt).toLocaleDateString();
        const time = new Date(p.createdAt).toLocaleTimeString();
        return `
        <div class="biz-doc-row-wrap${expanded ? " expanded" : ""}">
          <div class="biz-row docs-cols">
            <div class="biz-desc-cell"><span class="${badgeClass}">${badgeText}</span></div>
            <div class="biz-user-cell">
              <div class="biz-avatar" style="background:${avatarColor(fromToName || "")};width:28px;height:28px;font-size:11px">${initials(fromToName || "?")}</div>
              <div style="display:flex;flex-direction:column;gap:1px">
                <span class="biz-small" style="font-size:10px;color:#8892a4">${fromToLabel}</span>
                <span class="biz-small" style="font-weight:600">${fromToName || "—"}</span>
              </div>
            </div>
            <span class="biz-cell" style="font-weight:700;color:${isIn ? "#22c55e" : "#1a1d2e"}">${isIn ? "+" : ""}${fmt(p.amount)}</span>
            <span class="biz-cell biz-small">${date}</span>
            <span class="biz-cell biz-small" style="color:#5b6ef5;font-weight:600">${time}</span>
            <span class="${badgeClass}">${badgeText}</span>
            <div style="display:flex;gap:5px;align-items:center">
              ${isWait ? `<button class="biz-icon-btn send-btn" data-tid="${p._id}" style="background:#5b6ef5;color:#fff;width:auto;padding:0 9px;font-size:11px;font-weight:700">${t("send")}</button>` : ""}
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
                <span class="biz-exp-val biz-exp-desc-text">${p.description || t("documents")}</span>
              </div>
              <div class="biz-exp-footer-item">
                <span class="biz-exp-label">${isIn ? t("label_from") : t("label_to")}</span>
                <span class="biz-exp-val">${fromToName || "—"}</span>
              </div>
              <div class="biz-exp-footer-item biz-exp-total">
                <span class="biz-exp-label">${t("total_amount")}</span>
                <span class="biz-exp-total-val" style="color:${isIn ? "#22c55e" : "#5b6ef5"}">${isIn ? "+" : ""}${fmt(p.amount)}</span>
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

  el.querySelectorAll(".send-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openSendDrawer(btn.dataset.tid);
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
    dashboard.style.display = "";
    clients.style.display = "none";
    docs.style.display = "none";
    if (dashRight) dashRight.style.display = "";
    if (bizRoot) bizRoot.classList.remove("full-width");
    if (statsRow) statsRow.style.display = "";
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

// ─── SEND DRAWER ────────────────────────────────────────────────
let activeTransactionId = null;
let selRecipMethodId = null;
let pendingPayment = null;

const openSendDrawer = (txId) => {
  activeTransactionId = txId;
  selRecipMethodId = null;
  const tx = myTransactions.find((t) => t._id === txId);
  if (!tx) return;

  const totalBal = myMethods.reduce((s, m) => s + (m.balance || 0), 0);
  $("drawer-my-balance").textContent = fmt(totalBal);
  $("d-amount").value = tx.amount || "";
  $("d-desc").value = tx.description || "";
  $("d-beneficiary").value = tx.receiverName || "";
  $("d-error").textContent = "";
  renderMyMethods();

  $("d-recipient").innerHTML =
    `<option value="">${t("select_user")}</option>` +
    paymentUsers.map((u) => {
      const uid = u.userId || u._id;
      return `<option value="${uid}" ${uid === tx.receiverId ? "selected" : ""}>${u.username} (${u.tel || u.email || ""})</option>`;
    }).join("");

  if (tx.receiverId) {
    const rec = paymentUsers.find((u) => (u.userId || u._id) === tx.receiverId);
    if (rec) renderRecipMethods(rec, null);
  }

  $("drawer-form").style.display = "flex";
  $("drawer-success").style.display = "none";
  $("drawer-sms").style.display = "none";
  $("send-drawer-overlay").style.display = "flex";

  $("d-recipient").onchange = () => {
    const recId = $("d-recipient").value;
    const rec = paymentUsers.find((u) => (u.userId || u._id) === recId);
    $("d-beneficiary").value = rec?.username || "";
    selRecipMethodId = null;
    if (rec) renderRecipMethods(rec, null);
    else {
      $("recipient-methods-wrap").style.display = "none";
      $("recipient-methods-list").innerHTML = "";
    }
  };
};

const renderMyMethods = () => {
  const type = document.querySelector('input[name="pay-type"]:checked')?.value || "bank";
  const filtered = myMethods.filter((m) => m.type === type);
  $("my-methods-list").innerHTML = filtered.length
    ? filtered.map((m) => `
      <label class="biz-method-radio">
        <input type="radio" name="my-method" value="${m._id}" />
        <div class="biz-method-content">
          <span>${m.type === "card" ? "💳" : "🏦"}</span>
          <div>
            <p style="font-weight:600;font-size:13px;margin:0">${m.displayNumber || m.number}</p>
            <p style="font-size:11px;color:#8892a4;margin:0">${m.bank || m.expiry || ""} — ${fmt(m.balance)}</p>
          </div>
        </div>
      </label>`).join("")
    : `<p style="color:#8892a4;font-size:13px">${t("no_type_methods")}</p>`;
};

const renderRecipMethods = (rec, selId) => {
  const methods = rec?.paymentMethods || [];
  $("recipient-methods-wrap").style.display = "block";
  $("recipient-methods-list").innerHTML = methods.length
    ? methods.map((m) => `
      <label class="biz-method-radio ${selId === m._id ? "cardselected" : ""}">
        <input type="radio" name="rec-method" value="${m._id}" ${selId === m._id ? "checked" : ""}/>
        <div class="biz-method-content">
          <span>${m.type === "card" ? "💳" : "🏦"}</span>
          <div>
            <p style="font-weight:600;font-size:13px;margin:0">${m.displayNumber || m.number}</p>
            <p style="font-size:11px;color:#8892a4;margin:0">${m.bank || m.expiry || ""} — ${fmt(m.balance)}</p>
          </div>
        </div>
      </label>`).join("")
    : `<p style="color:#8892a4;font-size:13px">${t("no_type_methods")}</p>`;

  $("recipient-methods-list").querySelectorAll('input[name="rec-method"]').forEach((inp) => {
    if (inp.checked) selRecipMethodId = inp.value;
    inp.onchange = () => {
      selRecipMethodId = inp.value;
      $("recipient-methods-list").querySelectorAll(".biz-method-radio").forEach((l) => l.classList.remove("cardselected"));
      inp.closest(".biz-method-radio").classList.add("cardselected");
    };
  });
};

// ─── SMS VERIFICATION ─────────────────────────────────────────
const showSmsStep = () => {
  const me = getCurrent();
  const phone = me?.tel || me?.email || "***";
  const masked = phone.length > 4 ? phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4) : "****";
  $("sms-title").textContent = t("sms_title") || "SMS tasdiqlash";
  $("sms-desc").textContent = (t("sms_desc") || "Raqamingizga SMS yuborildi:") + " " + masked;
  $("sms-confirm-btn").textContent = t("sms_confirm") || "Tasdiqlash";
  $("sms-back-btn").textContent = t("cancel") || "Bekor qilish";
  $("sms-error").textContent = "";
  ["sms-d1", "sms-d2", "sms-d3", "sms-d4"].forEach((id) => { $(id).value = ""; $(id).style.borderColor = ""; });
  $("drawer-form").style.display = "none";
  $("drawer-sms").style.display = "flex";
  setTimeout(() => $("sms-d1").focus(), 100);

  const inputs = ["sms-d1", "sms-d2", "sms-d3", "sms-d4"].map((id) => $(id));
  inputs.forEach((inp, i) => {
    inp.oninput = () => { inp.value = inp.value.replace(/\D/, ""); if (inp.value && i < 3) inputs[i + 1].focus(); };
    inp.onkeydown = (e) => { if (e.key === "Backspace" && !inp.value && i > 0) inputs[i - 1].focus(); };
  });
};

const executePayment = async () => {
  const { amount, desc, senderMethodId, receiverMethodId } = pendingPayment;
  try {
    $("sms-confirm-btn").classList.add("loading");
    await apiFetch(`/api/payments/send/${activeTransactionId}`, {
      method: "POST",
      body: JSON.stringify({ senderMethodId, receiverMethodId, amount, description: desc }),
    });
    // Reload data
    await loadPaymentData();
    $("drawer-sms").style.display = "none";
    $("drawer-success").style.display = "block";
    pendingPayment = null;
  } catch (e) {
    $("sms-error").textContent = e.message;
  } finally {
    $("sms-confirm-btn").classList.remove("loading");
  }
};

const closeSendDrawer = () => {
  $("send-drawer-overlay").style.display = "none";
  $("drawer-sms").style.display = "none";
  $("drawer-form").style.display = "flex";
  $("drawer-success").style.display = "none";
  activeTransactionId = null;
  selRecipMethodId = null;
  pendingPayment = null;
};

// ─── PUSHER REAL-TIME ───────────────────────────────────────────
const initPusher = () => {
  const me = getCurrent();
  if (!me || !window.Pusher || pusherChannel) return;

  const userId = me.userId || me._id;
  const client = new window.Pusher("a1030ba785c6160c84e2", { cluster: "ap2" });
  pusherChannel = client.subscribe(`user-${userId}`);

  pusherChannel.bind("new-transaction", (data) => {
    showToast(`💰 ${data.transaction.senderName} ${fmt(data.transaction.amount)} to'lov yaratdi`, "success");
    loadPaymentData().then(() => { refreshStats(); renderDocsMini(); renderAccounts(); });
  });

  pusherChannel.bind("transaction-completed", (data) => {
    showToast(`✅ ${fmt(data.transaction.amount)} to'lov amalga oshirildi`, "success");
    loadPaymentData().then(() => { refreshStats(); renderDocsMini(); renderAccounts(); });
  });

  pusherChannel.bind("method-added", () => {
    loadPaymentData().then(() => { renderAccounts(); refreshStats(); });
  });

  pusherChannel.bind("method-deleted", () => {
    loadPaymentData().then(() => { renderAccounts(); refreshStats(); });
  });
};

// ─── INIT ───────────────────────────────────────────────────────
export const initBusinessLogic = async () => {
  const currentLang = getCurrentLang();

  // Header analytics button
  const header = document.querySelector(".biz-header");
  if (header) header.insertAdjacentHTML("beforeend", createPayAnalyticsBtn(currentLang));

  // Load all data from server
  await loadPaymentData();

  refreshStats();
  renderAccounts();
  renderClientsMini();
  renderDocsMini();

  // Initialize Pusher
  initPusher();

  // ── View navigation ──
  $("btn-view-clients")?.addEventListener("click", () => { showView("view-clients"); cPage = 1; renderClientsFull(); });
  $("back-clients")?.addEventListener("click", () => { showView("view-dashboard"); renderClientsMini(); });
  $("btn-view-docs")?.addEventListener("click", () => { showView("view-docs"); dPage = 1; renderDocsFull(); });
  $("back-docs")?.addEventListener("click", () => { showView("view-dashboard"); renderDocsMini(); });
  $("cp-prev")?.addEventListener("click", () => { if (cPage > 1) { cPage--; renderClientsFull(); } });
  $("cp-next")?.addEventListener("click", () => { if (cPage < Math.ceil(cFiltered.length / PAGE)) { cPage++; renderClientsFull(); } });
  $("doc-status-filter")?.addEventListener("change", (e) => { dPage = 1; renderDocsFull(e.target.value, $("doc-num-search")?.value || ""); });
  $("doc-num-search")?.addEventListener("input", (e) => { dPage = 1; renderDocsFull($("doc-status-filter")?.value || "", e.target.value); });
  $("dp-prev")?.addEventListener("click", () => { if (dPage > 1) { dPage--; renderDocsFull(); } });
  $("dp-next")?.addEventListener("click", () => { if (dPage < Math.ceil(dFiltered.length / PAGE)) { dPage++; renderDocsFull(); } });

  // ── Create document ──
  $("create-doc-btn")?.addEventListener("click", () => {
    $("dm-recipient").innerHTML =
      `<option value="">${t("select_default")}</option>` +
      paymentUsers.map((u) => `<option value="${u.userId || u._id}">${u.username}</option>`).join("");
    $("dm-amount").value = "";
    if ($("dm-desc")) $("dm-desc").value = "";
    $("doc-modal").style.display = "flex";
  });
  $("dm-cancel")?.addEventListener("click", () => ($("doc-modal").style.display = "none"));
  $("doc-modal")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.style.display = "none"; });
  $("dm-save")?.addEventListener("click", async () => {
    const amount = parseFloat($("dm-amount").value);
    const rec = $("dm-recipient").value;
    const desc = $("dm-desc")?.value?.trim() || "";
    if (isNaN(amount) || amount <= 0) return alert(t("alert_enter_amount"));
    if (!rec) return alert(t("alert_select_recipient"));
    try {
      await apiFetch("/api/payments/transactions", {
        method: "POST",
        body: JSON.stringify({ receiverId: rec, amount, description: desc }),
      });
      await loadPaymentData();
      $("doc-modal").style.display = "none";
      renderDocsFull();
      renderDocsMini();
      refreshStats();
      showToast("Hujjat yaratildi ✓", "success");
    } catch (e) {
      alert(e.message);
    }
  });

  // ── Send drawer ──
  $("drawer-back")?.addEventListener("click", closeSendDrawer);
  $("drawer-close")?.addEventListener("click", closeSendDrawer);
  $("send-drawer-overlay")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeSendDrawer(); });

  $("d-return")?.addEventListener("click", () => {
    closeSendDrawer();
    refreshStats();
    renderDocsFull();
    renderDocsMini();
    renderAccounts();
  });

  document.querySelectorAll('input[name="pay-type"]').forEach((inp) => { inp.onchange = () => renderMyMethods(); });

  $("d-proceed")?.addEventListener("click", () => {
    const errEl = $("d-error");
    errEl.textContent = "";
    const amount = parseFloat($("d-amount").value);
    const desc = $("d-desc").value;
    const senderMethodId = document.querySelector('input[name="my-method"]:checked')?.value;
    if (isNaN(amount) || amount <= 0) { errEl.textContent = t("err_valid_amount"); return; }
    if (!$("d-recipient").value) { errEl.textContent = t("err_select_recipient"); return; }
    if (!senderMethodId) { errEl.textContent = t("err_select_method"); return; }
    if (!selRecipMethodId) { errEl.textContent = t("err_select_rec_method"); return; }

    const senderMethod = myMethods.find((m) => m._id === senderMethodId);
    if (!senderMethod) { errEl.textContent = t("err_invalid_sender"); return; }
    if (senderMethod.balance < amount) { errEl.textContent = t("err_insufficient"); return; }

    pendingPayment = { amount, desc, senderMethodId, receiverMethodId: selRecipMethodId };
    showSmsStep();
  });

  // ── SMS step ──
  $("sms-back-btn")?.addEventListener("click", () => { $("drawer-sms").style.display = "none"; $("drawer-form").style.display = "flex"; pendingPayment = null; });
  $("sms-confirm-btn")?.addEventListener("click", () => {
    const code = ["sms-d1", "sms-d2", "sms-d3", "sms-d4"].map((id) => $(id).value).join("");
    if (code !== "1234") {
      $("sms-error").textContent = t("sms_wrong_code") || "Kod noto'g'ri. 1234 kiriting.";
      ["sms-d1", "sms-d2", "sms-d3", "sms-d4"].forEach((id) => ($(id).style.borderColor = "#ef4444"));
      return;
    }
    executePayment();
  });

  // ── Add card ──
  $("add-card-btn")?.addEventListener("click", () => {
    ["cm-number", "cm-holder", "cm-expiry", "cm-balance"].forEach((id) => { $(id).value = ""; $(id).style.borderColor = ""; });
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

  $("cm-save")?.addEventListener("click", async () => {
    const raw = $("cm-number").value.trim().replace(/\s/g, "");
    const holder = $("cm-holder").value.trim();
    const expiry = $("cm-expiry").value.trim();

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
          number: raw.replace(/(.{4})/g, "$1 ").trim(),
          displayNumber: raw.slice(0, 4) + " **** **** " + raw.slice(-4),
          holder,
          expiry,
          balance: parseFloat($("cm-balance").value) || 0,
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

  initPayAnalytics(currentLang);
};
