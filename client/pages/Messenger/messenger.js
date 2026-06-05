import { translations } from "./translations.js";
import { getCurrentLang, createTranslationHelper } from "../../assets/js/i18n.js";
import { API_URL, getAuthHeaders, fetchCurrentUser } from "../../assets/js/api.js";
 
const t = createTranslationHelper(translations);

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "😭",
  "🤔",
  "😅",
  "🔥",
  "👍",
  "❤️",
  "🎉",
  "✅",
  "💯",
  "🙏",
];

// ─── AVATAR ───────────────────────────────────
const avatarColors = [
  "#5b6ef5",
  "#7c3aed",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6d505f",
];
const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};
const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
const avatarHtml = (user, size = 42) => {
  const s = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;flex-shrink:0;`;
  if (!user)
    return `<div class="msg-avatar" style="${s}background:#e2e8f0;"></div>`;
  if (user.avatar && user.avatar !== "./assets/images/User-avatar.png")
    return `<img src="${user.avatar}" class="msg-avatar" style="width:${size}px;height:${size}px;flex-shrink:0;" />`;
  return `<div class="msg-avatar" style="${s}background:${avatarColor(user.username)};">${initials(user.username)}</div>`;
};

// ─── STATE & DATA ───────────────────────────────
let localUsers = [];
let localMessages = [];

const getUsers = () => localUsers;

const getMessages = (a, b) => {
    return localMessages.filter(m => 
        (m.from === a && m.to === b) || (m.from === b && m.to === a)
    );
};

// Async helpers
const loadMessengerData = async () => {
    try {
        const [usersRes, msgsRes] = await Promise.all([
            fetch(`${API_URL}/api/messenger/contacts`, { headers: getAuthHeaders(), credentials: "include" }),
            fetch(`${API_URL}/api/messenger/my-messages`, { headers: getAuthHeaders(), credentials: "include" })
        ]);
        if(usersRes.ok) localUsers = await usersRes.json();
        if(msgsRes.ok) {
            const rawMsgs = await msgsRes.json();
            const cu = currentUser;
            const oldMessages = localMessages;
            localMessages = rawMsgs.map(m => {
                const s = localUsers.find(u => u._id === m.sender || u.userId === m.sender) || (cu && (cu._id === m.sender || cu.userId === m.sender) ? cu : null);
                const r = localUsers.find(u => u._id === m.receiver || u.userId === m.receiver) || (cu && (cu._id === m.receiver || cu.userId === m.receiver) ? cu : null);
                const existingMsg = oldMessages.find(oldM => oldM.id === m._id);
                return {
                    id: m._id,
                    from: s ? s.username : "Unknown",
                    to: r ? r.username : "Unknown",
                    type: m.type,
                    text: m.text,
                    photoId: m.photoId,
                    dataUrl: existingMsg ? existingMsg.dataUrl : null, // Preserve if already fetched
                    at: m.createdAt,
                    edited: m.edited,
                    isRead: m.isRead
                };
            });
        }
    } catch(e) {
        console.error("Error loading messenger data", e);
    }
};

const fetchPhoto = async (msg) => {
    if(!msg.photoId || msg.dataUrl) return;
    try {
        const res = await fetch(`${API_URL}/api/messenger/photo/${msg.photoId}`, { headers: getAuthHeaders(), credentials: "include" });
        if(res.ok) {
            const data = await res.json();
            msg.dataUrl = data.dataUrl;
            // Update DOM directly if the skeleton is there
            const skel = document.getElementById(`skel-${msg.id}`);
            if(skel) {
                const img = document.createElement("img");
                img.src = msg.dataUrl;
                img.className = "msg-img-bubble";
                img.dataset.lightbox = msg.dataUrl;
                img.addEventListener("click", () => openLightbox(img.dataset.lightbox));
                skel.replaceWith(img);
            }
        }
    } catch(e) {
        console.error("Error loading photo", e);
    }
};

const getLastMsg = (a, b) => {
  const m = getMessages(a, b);
  return m[m.length - 1] || null;
};
const genId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const formatTime = (iso) =>
  !iso
    ? ""
    : new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
const formatDateSep = (iso, lang) => {
  const tr = translations[lang] || translations.uz;
  const d = new Date(iso),
    now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const md = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (md.getTime() === today.getTime()) return tr.today;
  if (md.getTime() === yest.getTime()) return tr.yesterday;
  return d.toLocaleDateString();
};
const isEmojiOnly = (t) =>
  /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u.test(t.trim()) &&
  t.trim().length <= 8;
const escHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getMsgCountFrom = (a, b) =>
  getMessages(a, b).filter((m) => m.from === b).length;
const getImgMsgs = (a, b) =>
  getMessages(a, b).filter((m) => m.type === "image");

const hasUnread = (me, contact) => {
  const msgs = getMessages(me, contact).filter((m) => m.from === contact);
  return msgs.some((m) => !m.isRead);
};
const markAsRead = async (me, contact) => {
   const contactUser = localUsers.find(u => u.username === contact);
   if(contactUser) {
       await fetch(`${API_URL}/api/messenger/read/${contactUser._id || contactUser.userId}`, { method: 'PUT', headers: getAuthHeaders(), credentials: "include" });
       // locally update
       localMessages.forEach(m => {
           if(m.from === contact && m.to === me) m.isRead = true;
       });
   }
};

// ─── ONLINE STATUS ────────────────────────────
const getMyStatus = () => localStorage.getItem("msg_my_status") || "online";
const setMyStatus = (s) => {
  localStorage.setItem("msg_my_status", s);
};

// avatarHtml — always reads fresh from users list so avatar changes reflect instantly
const getFreshUser = (username) => {
  if (!username) return null;
  const list = getUsers();
  return list.find((u) => u.username === username) || null;
};
const avatarHtmlFromUser = (user, size = 34) =>
  avatarHtml(getFreshUser(user?.username) || user, size);

export const MassangerPage = `<div class="messenger-wrap" id="messenger-root"></div>`;

// ─── STATE (UI) ─────────────────────────────────
let currentLang = "uz";
let currentUser = null;
let activeContact = null;
let searchQuery = "";
let pendingImages = [];
let emojiPickerOpen = false;
let sidebarCollapsed = false;
let userCardOpen = false;
let infoExpanded = false;
let attachExpanded = false;
let editingMsgId = null; // inline edit in input bar
let chatMenuOpen = false;

const $ = (id) => document.getElementById(id);

//  ROOT
const renderRoot = () => {
  const root = $("messenger-root");
  if (!root) return;
  const currentLang = getCurrentLang();
  const tr = translations[currentLang];
  root.innerHTML = `
        <h1 class="messenger-title">${tr.title}</h1>
        <div class="messenger-body">
            <div class="msg-sidebar ${sidebarCollapsed ? "collapsed" : ""}" id="msg-sidebar">
                ${renderSidebar()}
            </div>
            <div class="msg-chat-area" id="msg-chat-area">
                ${renderChatArea()}
            </div>
            ${activeContact ? `<div class="msg-info-panel" id="msg-info-panel">${renderInfoPanel()}</div>` : ""}
        </div>`;
  attachRootEvents();
};

//  SIDEBAR
const renderSidebar = () => {
  const tr = translations[currentLang];
  const users = getUsers().filter((u) => u.username !== currentUser?.username);
  const activeChats = users.filter((u) => getMessages(currentUser?.username, u.username).length > 0);
  let searchResults = [];
  if (searchQuery) {
      searchResults = users.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  if (sidebarCollapsed) {
    return `
            <div class="msg-sidebar-header msg-sidebar-header--collapsed">
                <button class="msg-icon-btn" id="msg-collapse-btn" title="Ochish">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>
            <div class="msg-contacts-list msg-contacts-list--collapsed" id="msg-contacts-list">
                ${activeChats.map((u) => renderContactMini(u)).join("")}
            </div>`;
  }

  const freshMe = getFreshUser(currentUser?.username) || currentUser;
  const myStatus = getMyStatus();
  return `
        <div class="msg-sidebar-header" style="position:relative">
            <div class="msg-current-user-wrap" id="msg-user-card-trigger">
                <div class="msg-avatar-wrap" style="flex-shrink:0">
                    ${avatarHtml(freshMe, 36)}
                    <span class="msg-status-dot ${myStatus}"></span>
                </div>
                <span class="msg-current-user-name">${escHtml(freshMe?.username || "")}</span>
            </div>
            <div class="msg-sidebar-actions">
                <button class="msg-icon-btn" id="msg-collapse-btn" title="Yig'ish">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>
            ${userCardOpen ? renderUserCard() : ""}
        </div>
        <div class="msg-search-wrap" style="position:relative">
            <div class="msg-search-inner">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#aaa" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#aaa" stroke-width="2" stroke-linecap="round"/></svg>
                <input type="text" id="msg-search-input" placeholder="${tr.search_placeholder}" value="${escHtml(searchQuery)}" autocomplete="off" />
            </div>
            ${searchQuery ? `
            <div class="msg-search-dropdown">
                ${searchResults.length === 0 ? `<div class="msg-search-empty">${tr.no_users}</div>` : 
                  searchResults.map(u => `
                    <div class="msg-search-item" data-username="${u.username}">
                        ${avatarHtml(u, 32)}
                        <span class="msg-search-item-name">${escHtml(u.username)}</span>
                    </div>
                  `).join("")}
            </div>
            ` : ""}
        </div>
        <div class="msg-contacts-label">${tr.contacts_label}</div>
        <div class="msg-contacts-list" id="msg-contacts-list">
            ${activeChats.length === 0 ? `<div style="padding:20px;text-align:center;color:#c0c7d4;font-size:12px">${tr.no_users}</div>` : activeChats.map((u) => renderContactItem(u)).join("")}
        </div>`;
};

const renderUserCard = () => {
  const tr = translations[currentLang];
  const myStatus = getMyStatus();
  const isOnline = myStatus === "online";
  const freshMe = getFreshUser(currentUser?.username) || currentUser;
  return `
    <div class="msg-user-card" id="msg-user-card">
        <div class="msg-user-card-top">
            <div style="display:flex;align-items:center;gap:10px">
                ${avatarHtml(freshMe, 38)}
                <div>
                    <div class="msg-user-card-name">${escHtml(freshMe?.username || "")}</div>
                    <div class="msg-user-card-email">${escHtml(freshMe?.email || "")}</div>
                </div>
            </div>
            <button class="msg-user-card-close-btn" id="msg-user-card-close">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    </div>`;
};

const renderContactMini = (user) => {
  const isActive = activeContact?.username === user.username;
  return `
        <div class="msg-contact-item msg-contact-mini ${isActive ? "active" : ""}" data-username="${user.username}" title="${escHtml(user.username)}">
            <div class="msg-avatar-wrap">
                ${avatarHtml(user, 38)}
                <span class="msg-status-dot offline"></span>
            </div>
        </div>`;
};

const renderContactItem = (user) => {
  const tr = translations[currentLang];
  const last = getLastMsg(currentUser.username, user.username);
  const isActive = activeContact?.username === user.username;
  const unread = !isActive && hasUnread(currentUser.username, user.username);
  let previewText = "",
    timeStr = "";
  if (last) {
    timeStr = formatTime(last.at);
    if (last.type === "image")
      previewText =
        (last.from === currentUser.username ? tr.you + ": " : "") +
        tr.sent_photo;
    else {
      previewText =
        last.from === currentUser.username ? tr.you + ": " : last.text || "";
      if (previewText.length > 28)
        previewText = previewText.slice(0, 28) + "...";
    }
  }
  return `
        <div class="msg-contact-item ${isActive ? "active" : ""}" data-username="${user.username}">
            <div class="msg-avatar-wrap">
                ${avatarHtml(user, 42)}
                <span class="msg-status-dot offline"></span>
            </div>
            <div class="msg-contact-info">
                <div class="msg-contact-row">
                    <span class="msg-contact-name ${unread ? "msg-contact-name--unread" : ""}">${escHtml(user.username)}</span>
                    <span class="msg-contact-time">${timeStr}</span>
                </div>
                <div class="msg-contact-row" style="margin-top:2px">
                    <span class="msg-contact-preview ${unread ? "msg-contact-preview--unread" : ""}">${escHtml(previewText)}</span>
                    ${unread ? `<span class="msg-unread-dot"></span>` : ""}
                </div>
            </div>
        </div>`;
};

//  INFO PANEL
const renderInfoPanel = () => {
  if (!activeContact) return "";
  const tr = translations[currentLang];
  const allMsgs = getMessages(currentUser.username, activeContact.username);
  const imgMsgs = allMsgs.filter((m) => m.type === "image");
  const fromCount = allMsgs.filter(
    (m) => m.from === activeContact.username,
  ).length;
  const phone = activeContact.phone || activeContact.tel || null;
  const email = activeContact.email || null;

  return `
        <div class="msg-info-top">
            ${avatarHtml(activeContact, 72)}
            <div class="msg-info-name">${escHtml(activeContact.username)}</div>
            <div class="msg-info-role">${escHtml(activeContact.role || activeContact.position || "")}</div>
            <div class="msg-info-msgcount">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/></svg>
                <span>${fromCount} ${tr.messages_count}</span>
            </div>
        </div>

        <div class="msg-info-section">
            <div class="msg-info-section-hdr" id="msg-info-toggle-info">
                <span>${tr.information.toUpperCase()}</span>
                <svg class="msg-info-chev ${infoExpanded ? "open" : ""}" width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div class="msg-info-section-body ${infoExpanded ? "show" : ""}">
                <div class="msg-info-row">
                    <span class="msg-info-key">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.8 9.64a19.79 19.79 0 01-3.07-8.67A2 2 0 012.71 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.53a16 16 0 006.56 6.56l1.06-1.06a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="#8892a4" stroke-width="2" stroke-linecap="round"/></svg>
                        ${tr.tel}
                    </span>
                    <span class="msg-info-val">${phone ? escHtml(phone) : `<em style="color:#c0c7d4;font-style:normal">${tr.no_phone}</em>`}</span>
                </div>
                <div class="msg-info-row">
                    <span class="msg-info-key">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#8892a4" stroke-width="2"/><polyline points="22,6 12,13 2,6" stroke="#8892a4" stroke-width="2"/></svg>
                        ${tr.email}
                    </span>
                    <span class="msg-info-val">${email ? escHtml(email) : `<em style="color:#c0c7d4;font-style:normal">${tr.no_email}</em>`}</span>
                </div>
            </div>
        </div>

        <div class="msg-info-section">
            <div class="msg-info-section-hdr" id="msg-info-toggle-attach">
                <span>${tr.attachments.toUpperCase()}${imgMsgs.length > 0 ? ` (${imgMsgs.length})` : ""}</span>
                <svg class="msg-info-chev ${attachExpanded ? "open" : ""}" width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div class="msg-info-section-body ${attachExpanded ? "show" : ""}">
                ${
                  imgMsgs.length === 0
                    ? `<div style="color:#c0c7d4;font-size:12px;padding:4px 0">—</div>`
                    : `<div class="msg-attach-grid">${imgMsgs
                        .slice(-6)
                        .map(
                          (m) =>
                            `<img src="${m.dataUrl}" class="msg-attach-thumb" data-lightbox="${m.dataUrl}" />`,
                        )
                        .join("")}</div>`
                }
            </div>
        </div>`;
};

// ═══════════════════════════════════════════════
//  CHAT AREA
// ═══════════════════════════════════════════════
const renderChatArea = () => {
  if (!activeContact) return renderNoChat();
  const tr = translations[currentLang];
  return `
        <div class="msg-chat-header">
            <div class="msg-chat-header-left">
                <div class="msg-avatar-wrap">${avatarHtml(activeContact, 38)}<span class="msg-status-dot offline"></span></div>
                <div>
                    <div class="msg-chat-recipient-name">${escHtml(activeContact.username)}</div>
                    <div class="msg-chat-status-text">${tr.offline}</div>
                </div>
            </div>
            <div class="msg-chat-header-right" style="position:relative">
                <button class="msg-icon-btn" id="msg-chat-menu-trigger" title="Sozlamalar">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 13a1 1 0 100-2 1 1 0 000 2zm0-7a1 1 0 100-2 1 1 0 000 2zm0 14a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <div class="msg-chat-menu" id="msg-chat-menu" style="display: ${chatMenuOpen ? 'flex' : 'none'};">
                    <button class="msg-chat-menu-item" id="msg-menu-clear">Chatni tozalash</button>
                    <button class="msg-chat-menu-item danger" id="msg-menu-delete">O'chirish</button>
                </div>
            </div>
        </div>
        <div class="msg-feed" id="msg-feed">${renderMessages()}</div>
        <div class="msg-input-area" id="msg-input-area" style="position:relative">
            <div class="msg-edit-indicator" id="msg-edit-indicator" style="display:none">
                <div class="msg-edit-ind-icon">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <div class="msg-edit-ind-body">
                    <span class="msg-edit-ind-label">${tr.edit_msg}</span>
                    <span class="msg-edit-ind-text"></span>
                </div>
                <button class="msg-edit-ind-cancel" id="msg-edit-ind-cancel">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>
            <div class="msg-img-preview-bar" id="msg-img-preview-bar"></div>
            <div class="msg-input-row">
                <button class="msg-emoji-btn" id="msg-emoji-toggle">
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--eva minimal__iconify__root css-eadae1" id="_r_1vj_" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16m5 9a5 5 0 0 1-10 0Z"></path></svg>
                </button>
                <textarea class="msg-text-input" id="msg-text-input" placeholder="${tr.type_message}" rows="1"></textarea>
                <div class="msg-input-actions">
                    <label class="msg-action-btn" for="msg-img-upload" style="cursor:pointer">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        <input type="file" id="msg-img-upload" accept="image/*" multiple style="display:none" />
                    </label>
                    <button class="msg-send-btn" id="msg-send-btn" disabled>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
};

const renderNoChat = () => {
  const tr = translations[currentLang];
  return `<div class="msg-no-chat">
        <div class="msg-no-chat-icon">
            <svg fill="#5b6ef5" height="50px" width="50px" version="1.1" id="Icons" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve">
                <path
                    d="M24,4H8C5.2,4,3,6.2,3,9v19c0,0.4,0.2,0.7,0.6,0.9C3.7,29,3.9,29,4,29c0.2,0,0.5-0.1,0.7-0.2C9,25,14.5,23,20.2,23H24
                c2.8,0,5-2.2,5-5V9C29,6.2,26.8,4,24,4z M14,17h-3c-0.6,0-1-0.4-1-1s0.4-1,1-1h3c0.6,0,1,0.4,1,1S14.6,17,14,17z M17,13h-6
                c-0.6,0-1-0.4-1-1s0.4-1,1-1h6c0.6,0,1,0.4,1,1S17.6,13,17,13z"
                />
            </svg>
        </div>
        <div class="msg-no-chat-title">${tr.no_chat_title}</div>
        <div class="msg-no-chat-sub">${tr.no_chat_sub}</div>
    </div>`;
};

// ═══════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════
const renderMessages = () => {
  if (!activeContact || !currentUser) return "";
  const currentLang = getCurrentLang();
  const tr = translations[currentLang];
  const msgs = getMessages(currentUser.username, activeContact.username);
  if (msgs.length === 0)
    return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#b0b8cc;height:100%">
            <div style="font-size:60px;animation:msgFloat 3s ease-in-out infinite">
                <svg fill="#5b6ef5" height="100px" width="100px" version="1.1" id="Icons" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve">
                    <path
                        d="M24,4H8C5.2,4,3,6.2,3,9v19c0,0.4,0.2,0.7,0.6,0.9C3.7,29,3.9,29,4,29c0.2,0,0.5-0.1,0.7-0.2C9,25,14.5,23,20.2,23H24
                    c2.8,0,5-2.2,5-5V9C29,6.2,26.8,4,24,4z M14,17h-3c-0.6,0-1-0.4-1-1s0.4-1,1-1h3c0.6,0,1,0.4,1,1S14.6,17,14,17z M17,13h-6
                    c-0.6,0-1-0.4-1-1s0.4-1,1-1h6c0.6,0,1,0.4,1,1S17.6,13,17,13z"
                    />
                </svg>
            </div>
            <div style="font-size:20px;font-weight:800;color:#c0c7d4">${tr.good_morning}</div>
            <div style="font-size:13px;color:#d0d6e2">${tr.write_awesome}</div>
        </div>`;

  // fresh contact avatar
  const freshContact = getFreshUser(activeContact.username) || activeContact;

  let html = "",
    lastDate = "",
    lastFrom = null;

  msgs.forEach((msg) => {
    const currentLang = getCurrentLang();
    const dateStr = formatDateSep(msg.at, currentLang);
    if (dateStr !== lastDate) {
      html += `<div class="msg-date-sep"><span>${dateStr}</span></div>`;
      lastDate = dateStr;
      lastFrom = null;
    }

    const isMine = msg.from === currentUser.username;
    const isFirstInGroup = lastFrom !== msg.from;
    lastFrom = msg.from;

    // Avatar (theirs only, group start)
    const av = !isMine
      ? isFirstInGroup
        ? avatarHtmlFromUser(freshContact, 34)
        : `<div style="width:34px;flex-shrink:0"></div>`
      : "";

    // sender name label (theirs, group start only)
    const senderLabel =
      !isMine && isFirstInGroup
        ? `<div class="msg-sender-label">${escHtml(freshContact.username)}</div>`
        : "";

    // Action buttons
    // image & emoji-only → NO edit btn (faqat delete)
    const editBtn = `<button class="msg-bact edit" data-action="edit" data-mid="${msg.id}" data-text="${escHtml(msg.text)}" title="${tr.edit_msg}">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>`;
    const delBtn = `<button class="msg-bact del" data-action="del" data-mid="${msg.id}" title="${tr.delete_msg}">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>`;

    const wrapCls = `msg-row ${isMine ? "msg-row--mine" : "msg-row--theirs"} ${isFirstInGroup ? "msg-row--first" : "msg-row--cont"}`;

    if (msg.type === "image") {
      if (!msg.dataUrl && msg.photoId) {
        fetchPhoto(msg);
      }
      const imgHtml = msg.dataUrl ? `<img src="${msg.dataUrl}" class="msg-img-bubble" data-lightbox="${msg.dataUrl}"/>` : `<div class="msg-img-skeleton" id="skel-${msg.id}"></div>`;

      // image → only delete
      const acts = `<div class="msg-hover-acts ${isMine ? "msg-ha-left" : "msg-ha-right"}">${delBtn}</div>`;
      html += `
            <div class="${wrapCls}" data-mid="${msg.id}">
                ${av}
                <div class="msg-row-body">
                    ${senderLabel}
                    <div class="msg-hover-wrap">
                        ${acts}
                        <div class="msg-img-outer">
                            ${imgHtml}
                            <span class="msg-time-in">${formatTime(msg.at)}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    } else {
      const eo = isEmojiOnly(msg.text);
      const edited = msg.edited
        ? `<span class="msg-edited">${tr.edited}</span>`
        : "";
      // emoji-only → only delete; text → edit+delete (mine) or delete (theirs)
      const acts = isMine
        ? `<div class="msg-hover-acts msg-ha-left">${eo ? "" : editBtn}${delBtn}</div>`
        : `<div class="msg-hover-acts msg-ha-right">${delBtn}</div>`;
      html += `
            <div class="${wrapCls}" data-mid="${msg.id}">
                ${av}
                <div class="msg-row-body">
                    ${senderLabel}
                    <div class="msg-hover-wrap">
                        ${acts}
                        <div class="msg-bubble ${eo ? "emoji-only" : ""}">
                            <span class="msg-bubble-text">${escHtml(msg.text)}${edited}</span>
                            <span class="msg-time-in">${formatTime(msg.at)}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }
  });
  return html;
};

// ═══════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════
const isNearBottom = () => {
  const f = $("msg-feed");
  if (!f) return true;
  return f.scrollHeight - f.scrollTop - f.clientHeight < 80;
};
const scrollFeed = () => {
  const f = $("msg-feed");
  if (f) f.scrollTop = f.scrollHeight;
};
const smartScroll = () => {
  if (isNearBottom()) scrollFeed();
};

const sendMessage = async () => {
  if (!activeContact || !currentUser) return;
  const input = $("msg-text-input"),
    text = input ? input.value.trim() : "";
  const receiverUser = localUsers.find(u => u.username === activeContact.username);
  if(!receiverUser) return;
  const receiverId = receiverUser._id || receiverUser.userId;

  // If in edit mode
  if (editingMsgId) {
    if (text) {
      try {
         const res = await fetch(`${API_URL}/api/messenger/${editingMsgId}`, {
             method: 'PUT',
             headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
             credentials: "include",
             body: JSON.stringify({ text })
         });
         if(res.ok) {
             const updated = await res.json();
             localMessages.forEach(m => {
                 if(m.id === editingMsgId) {
                     m.text = updated.text;
                     m.edited = updated.edited;
                 }
             });
         }
      } catch(e) { console.error("Edit error", e); }
    }
    cancelEdit();
    return;
  }

  // Disable send button temporarily
  const sBtn = $("msg-send-btn");
  if(sBtn) sBtn.disabled = true;

  if (pendingImages.length > 0) {
    for(let i = 0; i < pendingImages.length; i++) {
        const { dataUrl } = pendingImages[i];
        try {
            await fetch(`${API_URL}/api/messenger/send`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ receiverId, type: 'image', fileData: dataUrl })
            });
        } catch(e) { console.error("Send image error", e); }
    }
    pendingImages = [];
    renderImgPreview();
  }
  if (text) {
    try {
        await fetch(`${API_URL}/api/messenger/send`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            credentials: "include",
            body: JSON.stringify({ receiverId, type: 'text', text })
        });
        if (input) {
          input.value = "";
          autoResizeInput();
        }
    } catch(e) { console.error("Send text error", e); }
  }

  // Refresh messages
  await loadMessengerData();
  updateSendBtn();
  refreshFeed(true);
  refreshContacts();
  refreshInfoPanel();
};

const deleteMsg = async (mid) => {
  if (editingMsgId === mid) cancelEdit();
  try {
      await fetch(`${API_URL}/api/messenger/${mid}`, { method: 'DELETE', headers: getAuthHeaders(), credentials: "include" });
      localMessages = localMessages.filter((m) => m.id !== mid);
  } catch(e) { console.error("Delete error", e); }
  refreshFeed();
  refreshContacts();
  refreshInfoPanel();
};

const clearActiveChat = async (deleteUser = false) => {
  if (!activeContact) return;
  try {
    const receiverId = activeContact._id || activeContact.userId;
    if (!receiverId) return;
    await fetch(`${API_URL}/api/messenger/chat/${receiverId}`, { method: 'DELETE', headers: getAuthHeaders(), credentials: "include" });
    localMessages = localMessages.filter((m) => !(
      (m.from === currentUser.username && m.to === activeContact.username) ||
      (m.from === activeContact.username && m.to === currentUser.username)
    ));
    if (deleteUser) {
      activeContact = null;
    }
    chatMenuOpen = false;
    renderRoot();
  } catch (e) { console.error("Clear chat error", e); }
};

// Edit in input bar — no inline edit in feed
const startEdit = (mid, text) => {
  editingMsgId = mid;
  const input = $("msg-text-input");
  if (input) {
    input.value = text;
    autoResizeInput();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    updateSendBtn();
  }
  // Show edit indicator bar
  const bar = $("msg-edit-indicator");
  if (bar) {
    bar.style.display = "flex";
    bar.querySelector(".msg-edit-ind-text").textContent =
      text.slice(0, 60) + (text.length > 60 ? "…" : "");
  }
  // highlight the message being edited
  document
    .querySelectorAll(".msg-row")
    .forEach((r) => r.classList.remove("editing-active"));
  const row = document.querySelector(`.msg-row[data-mid="${mid}"]`);
  if (row) row.classList.add("editing-active");
};

const cancelEdit = () => {
  editingMsgId = null;
  const input = $("msg-text-input");
  if (input) {
    input.value = "";
    autoResizeInput();
  }
  updateSendBtn();
  const bar = $("msg-edit-indicator");
  if (bar) bar.style.display = "none";
  document
    .querySelectorAll(".msg-row")
    .forEach((r) => r.classList.remove("editing-active"));
  refreshFeed(false);
  refreshContacts();
};

// ═══════════════════════════════════════════════
//  PARTIAL REFRESH
// ═══════════════════════════════════════════════
const refreshFeed = (forceScroll = false) => {
  const f = $("msg-feed");
  if (!f) return;
  const wasNear = isNearBottom();
  f.innerHTML = renderMessages();
  attachFeedEvents();
  if (forceScroll || wasNear) scrollFeed();
};
const refreshContacts = () => {
  const sb = $("msg-sidebar");
  if (!sb) return;
  const isInputFocused = document.activeElement && document.activeElement.id === "msg-search-input";
  sb.innerHTML = renderSidebar();
  attachSidebarEvents();
  if (isInputFocused) {
    const si = $("msg-search-input");
    if (si) {
      si.focus();
      const val = si.value;
      si.setSelectionRange(val.length, val.length);
    }
  }
};
const refreshInfoPanel = () => {
  const p = $("msg-info-panel");
  if (p && activeContact) {
    p.innerHTML = renderInfoPanel();
    attachInfoEvents();
  }
};

// ═══════════════════════════════════════════════
//  IMG PREVIEW
// ═══════════════════════════════════════════════
const renderImgPreview = () => {
  const bar = $("msg-img-preview-bar");
  if (!bar) return;
  if (pendingImages.length === 0) {
    bar.innerHTML = "";
    return;
  }
  bar.innerHTML = pendingImages
    .map(
      (img, i) =>
        `<div class="msg-img-preview-item"><img src="${img.dataUrl}"/><button class="msg-img-preview-remove" data-idx="${i}">✕</button></div>`,
    )
    .join("");
  bar.querySelectorAll(".msg-img-preview-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingImages.splice(parseInt(btn.dataset.idx), 1);
      renderImgPreview();
      updateSendBtn();
    });
  });
  updateSendBtn();
};

// ═══════════════════════════════════════════════
//  EMOJI
// ═══════════════════════════════════════════════
const toggleEmojiPicker = () => {
  const ex = $("msg-emoji-picker");
  if (ex) {
    ex.remove();
    emojiPickerOpen = false;
    return;
  }
  emojiPickerOpen = true;
  const picker = document.createElement("div");
  picker.className = "msg-emoji-picker";
  picker.id = "msg-emoji-picker";
  EMOJIS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.className = "msg-emoji-item";
    btn.textContent = emoji;
    btn.addEventListener("click", () => {
      const input = $("msg-text-input");
      if (input) {
        const pos = input.selectionStart || input.value.length;
        input.value =
          input.value.slice(0, pos) + emoji + input.value.slice(pos);
        input.focus();
        input.setSelectionRange(pos + emoji.length, pos + emoji.length);
      }
      updateSendBtn();
      picker.remove();
      emojiPickerOpen = false;
    });
    picker.appendChild(btn);
  });
  const ia = $("msg-input-area");
  if (ia) ia.appendChild(picker);
};

// ═══════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════
const autoResizeInput = () => {
  const el = $("msg-text-input");
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
};
const updateSendBtn = () => {
  const btn = $("msg-send-btn"),
    input = $("msg-text-input");
  if (!btn) return;
  btn.disabled = !(
    (input && input.value.trim().length > 0) ||
    pendingImages.length > 0
  );
};
const openLightbox = (src) => {
  const lb = document.createElement("div");
  lb.className = "msg-lightbox";
  lb.innerHTML = `<img src="${src}"/><button class="msg-lightbox-close">✕</button>`;
  lb.querySelector(".msg-lightbox-close").addEventListener("click", () =>
    lb.remove(),
  );
  lb.addEventListener("click", (e) => {
    if (e.target === lb) lb.remove();
  });
  document.body.appendChild(lb);
};

// ═══════════════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════════════
const attachFeedEvents = () => {
  document
    .querySelectorAll("[data-lightbox]")
    .forEach((img) =>
      img.addEventListener("click", () => openLightbox(img.dataset.lightbox)),
    );
  document.querySelectorAll(".msg-bact").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const { action, mid, text } = btn.dataset;
      if (action === "del") deleteMsg(mid);
      if (action === "edit") startEdit(mid, text || "");
    });
  });
};

const attachContactEvents = () => {
  document.querySelectorAll(".msg-contact-item, .msg-search-item").forEach((item) => {
    item.addEventListener("click", () => {
      activeContact =
        getUsers().find((u) => u.username === item.dataset.username) || null;
      if (activeContact)
        markAsRead(currentUser.username, activeContact.username);
      emojiPickerOpen = false;
      pendingImages = [];
      infoExpanded = false;
      attachExpanded = false;
      searchQuery = "";
      renderRoot();
      scrollFeed();
    });
  });
};

const attachInfoEvents = () => {
  const it = $("msg-info-toggle-info");
  if (it)
    it.addEventListener("click", () => {
      infoExpanded = !infoExpanded;
      refreshInfoPanel();
    });
  const at = $("msg-info-toggle-attach");
  if (at)
    at.addEventListener("click", () => {
      attachExpanded = !attachExpanded;
      refreshInfoPanel();
    });
  document
    .querySelectorAll(".msg-attach-thumb")
    .forEach((img) =>
      img.addEventListener("click", () => openLightbox(img.dataset.lightbox)),
    );
};

const attachSidebarEvents = () => {
  const si = $("msg-search-input");
  if (si)
    si.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      refreshContacts();
    });
  const cb = $("msg-collapse-btn");
  if (cb)
    cb.addEventListener("click", () => {
      sidebarCollapsed = !sidebarCollapsed;
      const sb = $("msg-sidebar");
      if (sb) {
        sb.classList.toggle("collapsed", sidebarCollapsed);
        sb.innerHTML = renderSidebar();
        attachSidebarEvents();
      }
    });
  const trigger = $("msg-user-card-trigger");
  if (trigger)
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      userCardOpen = !userCardOpen;
      const sb = $("msg-sidebar");
      if (sb) {
        sb.innerHTML = renderSidebar();
        attachSidebarEvents();
      }
    });
  const close = $("msg-user-card-close");
  if (close)
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      userCardOpen = false;
      const sb = $("msg-sidebar");
      if (sb) {
        sb.innerHTML = renderSidebar();
        attachSidebarEvents();
      }
    });
  // Online/offline toggle
  const stoggle = $("msg-status-toggle");
  if (stoggle)
    stoggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const cur = getMyStatus();
      setMyStatus(cur === "online" ? "offline" : "online");
      const sb = $("msg-sidebar");
      if (sb) {
        sb.innerHTML = renderSidebar();
        attachSidebarEvents();
      }
    });
  attachContactEvents();
};

const showConfirmModal = (message, onConfirm) => {
  const existing = document.getElementById("msg-confirm-modal");
  if (existing) existing.remove();

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "msg-confirm-modal";
  modalOverlay.className = "msg-modal-overlay";
  
  modalOverlay.innerHTML = `
    <div class="msg-modal-content">
      <div class="msg-modal-body">${escHtml(message)}</div>
      <div class="msg-modal-footer">
        <button class="msg-btn-cancel">Bekor qilish</button>
        <button class="msg-btn-confirm">Tasdiqlash</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const btnCancel = modalOverlay.querySelector(".msg-btn-cancel");
  const btnConfirm = modalOverlay.querySelector(".msg-btn-confirm");

  btnCancel.addEventListener("click", () => {
    modalOverlay.remove();
  });

  btnConfirm.addEventListener("click", async () => {
    modalOverlay.remove();
    await onConfirm();
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) modalOverlay.remove();
  });
};

const attachChatEvents = () => {
  const ct = $("msg-chat-menu-trigger");
  if (ct) {
    ct.addEventListener("click", (e) => {
      e.stopPropagation();
      chatMenuOpen = !chatMenuOpen;
      const menu = $("msg-chat-menu");
      if (menu) menu.style.display = chatMenuOpen ? "flex" : "none";
    });
  }
  const mc = $("msg-menu-clear");
  if (mc) {
    mc.addEventListener("click", (e) => {
      e.stopPropagation();
      showConfirmModal("Chatdagi barcha xabarlarni tozalashni xohlaysizmi?", async () => {
          await clearActiveChat(false);
      });
    });
  }
  const md = $("msg-menu-delete");
  if (md) {
    md.addEventListener("click", (e) => {
      e.stopPropagation();
      showConfirmModal("Ushbu chatni butunlay o'chirib tashlashni xohlaysizmi?", async () => {
          await clearActiveChat(true);
      });
    });
  }

  const sb = $("msg-send-btn");
  if (sb) sb.addEventListener("click", sendMessage);
  const ti = $("msg-text-input");
  if (ti) {
    ti.addEventListener("input", () => {
      autoResizeInput();
      updateSendBtn();
    });
    ti.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === "Escape" && editingMsgId) cancelEdit();
    });
    ti.addEventListener("focus", () => {
      const p = $("msg-emoji-picker");
      if (p) {
        p.remove();
        emojiPickerOpen = false;
      }
    });
  }
  const eic = $("msg-edit-ind-cancel");
  if (eic) eic.addEventListener("click", () => cancelEdit());
  const et = $("msg-emoji-toggle");
  if (et)
    et.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleEmojiPicker();
    });
  const iu = $("msg-img-upload");
  if (iu)
    iu.addEventListener("change", () => {
      const tr = translations[currentLang];
      Array.from(iu.files).forEach((file) => {
        if (file.size > 200 * 1024) {
          alert(tr.img_too_large);
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingImages.push({ dataUrl: e.target.result, file });
          renderImgPreview();
          updateSendBtn();
        };
        reader.readAsDataURL(file);
      });
      iu.value = "";
    });
  attachFeedEvents();
  document.addEventListener("click", (e) => {
    const p = $("msg-emoji-picker"),
      t = $("msg-emoji-toggle");
    if (p && !p.contains(e.target) && e.target !== t) {
      p.remove();
      emojiPickerOpen = false;
    }
    const card = $("msg-user-card"),
      trigger = $("msg-user-card-trigger");
    if (
      card &&
      trigger &&
      !card.contains(e.target) &&
      !trigger.contains(e.target)
    ) {
      userCardOpen = false;
      const sb = $("msg-sidebar");
      if (sb) {
        sb.innerHTML = renderSidebar();
        attachSidebarEvents();
      }
    }
    
    const cMenu = $("msg-chat-menu"),
      cTrigger = $("msg-chat-menu-trigger");
    if (chatMenuOpen && cTrigger && !cTrigger.contains(e.target) && (!cMenu || !cMenu.contains(e.target))) {
      chatMenuOpen = false;
      if (cMenu) cMenu.style.display = "none";
    }
  });
  scrollFeed();
};

const attachRootEvents = () => {
  attachSidebarEvents();
  attachChatEvents();
  attachInfoEvents();
};

// ═══════════════════════════════════════════════
//  PUSHER INTEGRATION
// ═══════════════════════════════════════════════
let pusherClient = null;
let pusherChannel = null;

const handleIncomingPusherMessage = (data, action) => {
    console.log("PUSHER KELDI:", action, data);
    if (action === 'new') {
        const m = data;
        const cu = currentUser;
        const s = localUsers.find(u => String(u._id || u.userId) === String(m.sender)) || (cu && String(cu._id || cu.userId) === String(m.sender) ? cu : null);
        const r = localUsers.find(u => String(u._id || u.userId) === String(m.receiver)) || (cu && String(cu._id || cu.userId) === String(m.receiver) ? cu : null);
        
        console.log("Sender:", s, "Receiver:", r);
        const formatted = {
            id: m._id,
            from: s ? s.username : "Unknown",
            to: r ? r.username : "Unknown",
            type: m.type,
            text: m.text,
            photoId: m.photoId,
            dataUrl: null,
            at: m.createdAt,
            edited: m.edited,
            isRead: m.isRead
        };
        
        console.log("Formatted:", formatted);
        
        // Check if message already exists
        if (!localMessages.find(msg => msg.id === formatted.id)) {
            localMessages.push(formatted);
            console.log("Xabar localMessages ga qoshildi");
        }
        
        if (activeContact && (formatted.from === activeContact.username || formatted.to === activeContact.username || formatted.from === activeContact || formatted.to === activeContact)) {
            console.log("Ekranni yangilayapman: refreshFeed");
            if (typeof refreshFeed === 'function') refreshFeed(true);
        }
        if (typeof refreshContacts === 'function') refreshContacts();
        
    } else if (action === 'edit') {
        const msg = localMessages.find(m => m.id === data._id);
        if (msg) {
            msg.text = data.text;
            msg.edited = data.edited;
            if (activeContact && (msg.from === activeContact || msg.to === activeContact || msg.from === activeContact.username || msg.to === activeContact.username)) {
                if (typeof refreshFeed === 'function') refreshFeed(false);
            }
            if (typeof refreshContacts === 'function') refreshContacts();
        }
    } else if (action === 'delete') {
        localMessages = localMessages.filter(m => m.id !== data.messageId);
        if (activeContact) {
            if (typeof refreshFeed === 'function') refreshFeed(false);
        }
        if (typeof refreshContacts === 'function') refreshContacts();
    } else if (action === 'read') {
        const contactUser = localUsers.find(u => String(u._id || u.userId) === String(data.readerId));
        if (contactUser) {
            localMessages.forEach(m => {
                if (m.to === contactUser.username && m.from === currentUser.username) {
                    m.isRead = true;
                }
            });
            if (activeContact === contactUser.username) {
                if (typeof refreshFeed === 'function') refreshFeed(false);
            }
        }
    } else if (action === 'chat-delete') {
        const contactUser = localUsers.find(u => String(u._id || u.userId) === String(data.deletedBy));
        if (contactUser) {
            localMessages = localMessages.filter(m => !(m.from === contactUser.username || m.to === contactUser.username));
            if (activeContact === contactUser.username || activeContact?.username === contactUser.username) {
                activeContact = null;
            }
            if (typeof renderRoot === 'function') renderRoot();
        }
    }
};

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
export const initMessengerLogic = async () => {
  currentLang = sessionStorage.getItem("language") || "uz";
  currentUser = await fetchCurrentUser();
  activeContact = null;
  searchQuery = "";
  pendingImages = [];
  emojiPickerOpen = false;
  sidebarCollapsed = false;
  userCardOpen = false;
  infoExpanded = false;
  attachExpanded = false;
  await loadMessengerData();
  
  if (!pusherClient && window.Pusher && currentUser) {
      Pusher.logToConsole = false;
      // TODO: Replace with actual APP_KEY and CLUSTER
      pusherClient = new Pusher('a1030ba785c6160c84e2', {
          cluster: 'ap2'
      });
      
      const currentUserId = currentUser.userId || currentUser._id;
      pusherChannel = pusherClient.subscribe(`user-${currentUserId}`);

      pusherChannel.bind('new-message', (data) => handleIncomingPusherMessage(data.message, 'new'));
      pusherChannel.bind('message-edited', (data) => handleIncomingPusherMessage(data.message, 'edit'));
      pusherChannel.bind('message-deleted', (data) => handleIncomingPusherMessage(data, 'delete'));
      pusherChannel.bind('messages-read', (data) => handleIncomingPusherMessage(data, 'read'));
      pusherChannel.bind('chat-deleted', (data) => handleIncomingPusherMessage(data, 'chat-delete'));
  }

  renderRoot();
};
