
import { API_URL, getCurrentUser, getAuthHeaders } from "../../assets/js/api.js";
import { vacTranslations } from "./translations.js";
import { SAMPLE_TOURS } from "./card-default-data.js";
import { applyPermissions } from "../Employees/permission.js";
import { getCurrentLang, createTranslationHelper } from "../../assets/js/i18n.js";

const t = createTranslationHelper(vacTranslations);

// ─── DATA ─────────────────────────────────────
let toursData = [];
const getTours = () => toursData;

const fetchToursAPI = async () => {
    try {
        const res = await fetch(`${API_URL}/api/vacations`, { headers: getAuthHeaders(), credentials: "include" });
        const json = await res.json();
        if (json.success) toursData = json.data;
    } catch (e) {
        console.error("fetchToursAPI error:", e);
    }
};

const saveTours = () => {};
const genTourId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// helper: get multilang field
const ml = (field, lang) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[lang] || field.uz || field.en || Object.values(field)[0] || "";
};

// ─── PAGE EXPORT ──────────────────────────────
export const VacationsPage = `<div class="vac-wrap" id="vac-root"></div>`;

// ─── STATE ────────────────────────────────────
let vacSearch = "";
let vacFilter = "all";
let detailTourId = null;
let editTourId = null;
let addModalOpen = false;
let activeModalTab = "tour"; // "tour" or "hotel"
let carouselIdx = 0;
let pickMap = null;
let pickMarker = null;
// form state for images
let formCoverDataUrl = null; // base64 or url
let formGalleryImages = []; // [{dataUrl, isFile}]
let formContentLang = "uz"; // which lang tab is active in form
let formDates = [];
let modalHotels = [];
let activeHotelIndex = 0;

// booking state
let bookModalOpen = false;
let bookGuests = 1;
let bookSelectedMethodIdx = 0;
let bookSelectedDateIdx = null;
let bookSelectedHotelId = null;
let bookSelectedRoomId = null;
let bookSelectedRoomBeds = null;
let bookSelectedRoomPrice = 0;
let bookStep = 1; // 1: dates, 2: hotel, 3: payment, 4: success

const $v = (id) => document.getElementById(id);
const esc = (s) =>
    String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// ─── RENDER ROOT ──────────────────────────────
const renderRoot = () => {
    const root = $v("vac-root");
    if (!root) return;
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;

    if (detailTourId) {
        root.innerHTML = renderDetailInline();
        attachDetailEvents();
        return;
    }

    root.innerHTML = `
        <div class="vac-header">
            <h1 class="vac-title">${tr.title}</h1>
            <div class="vac-header-btns">
                <button data-perm="vac_add_tour" class="vac-add-btn" id="vac-add-btn">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    ${tr.add_btn}
                </button>
            </div>
        </div>
        <div class="vac-controls">
            <div class="vac-search-wrap">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#aaa" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="#aaa" stroke-width="2" stroke-linecap="round"/></svg>
                <input type="text" id="vac-search" class="vac-search-input" placeholder="${tr.search_ph}" value="${esc(vacSearch)}"/>
            </div>
            <div class="vac-filters">
                ${["all", "beach", "mountain", "city", "nature"]
                    .map(
                        (f) => `
                <button class="vac-filter-btn ${vacFilter === f ? "active" : ""}" data-filter="${f}">
                    ${filterIcon(f)} ${tr["filter_" + f]}
                </button>`,
                    )
                    .join("")}
            </div>
        </div>
        <div class="vac-grid" id="vac-grid">${renderCards()}</div>
        ${addModalOpen ? renderAddModal() : ""}
    `;
    attachRootEvents();

    const cu = getCurrentUser();
    if (cu) applyPermissions(cu.userId || cu._id);
};

const filterIcon = (f) => {
    const icons = {
        all: `<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>`,
        beach: `<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M17 21H7M12 21V13M5 13h14M12 13C12 8 8 4 4 5c1 4 4 7 8 8zM12 13c0-5 4-9 8-8-1 4-4 7-8 8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
        mountain: `<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 20L9 8l4 6 3-4 5 10H3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
        city: `<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="10" width="7" height="11" rx="1" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="3" width="11" height="18" rx="1" stroke="currentColor" stroke-width="1.8"/><path d="M13 7h2M13 11h2M13 15h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        nature: `<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M12 22V12M12 12C12 7 7 3 3 4c1 4 4 7 9 8zM12 12c0-5 5-9 9-8-1 4-4 7-9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    };
    return icons[f] || "";
};

// ─── CARDS ────────────────────────────────────
const renderCards = () => {
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    let tours = getTours();
    if (vacSearch) tours = tours.filter((t) => ml(t.name, vacLang).toLowerCase().includes(vacSearch.toLowerCase()) || ml(t.country, vacLang).toLowerCase().includes(vacSearch.toLowerCase()) || ml(t.city, vacLang).toLowerCase().includes(vacSearch.toLowerCase()));
    if (vacFilter !== "all") tours = tours.filter((t) => t.category === vacFilter);
    if (!tours.length)
        return `
        <div class="vac-empty">
            <div class="vac-empty-icon">🌴</div>
            <div class="vac-empty-title">${tr.no_cards}</div>
            <div class="vac-empty-sub">${tr.no_cards_sub}</div>
        </div>`;
    return tours.map((t) => renderCard(t)).join("");
};

const catColors = { beach: "#0ea5e9", mountain: "#10b981", city: "#f59e0b", nature: "#22c55e" };
const categoryBadge = (cat, tr) => {
    const c = catColors[cat] || "#5b6ef5";
    return `<span class="vac-card-badge" style="background:${c}22;color:${c}">${tr[cat] || cat}</span>`;
};
const starsHtml = (r) => {
    const whole = Math.round(r); // round to nearest integer
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<span class="vac-star ${i <= whole ? "full" : "empty"}">★</span>`;
    return s;
};

const renderCard = (t) => {
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    const img = t.coverImage || (t.images && t.images[0]) || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&q=80";
    const name = ml(t.name, vacLang);
    const city = ml(t.city, vacLang);
    const country = ml(t.country, vacLang);
    return `
    <div class="vac-card" data-id="${t.id}">
        <div class="vac-card-img-wrap">
            <img src="${esc(img)}" class="vac-card-img" alt="${esc(name)}" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&q=80'"/>
            <div class="vac-card-img-overlay"></div>
            ${categoryBadge(t.category, tr)}
            <div class="vac-card-actions-top">
                <button data-perm="vac_edit_tour" class="vac-card-action-btn vac-edit-btn" data-id="${t.id}" title="${tr.edit}">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
                <button data-perm="vac_delete_tour" class="vac-card-action-btn vac-del-btn" data-id="${t.id}" title="${tr.delete}">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
            </div>
        </div>
        <div class="vac-card-body">
            <div class="vac-card-location">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2"/></svg>
                ${esc(city)}, ${esc(country)}
            </div>
            <div class="vac-card-name">${esc(name)}</div>
            <div class="vac-card-meta">
                <div class="vac-card-stars">${starsHtml(t.rating)}<span>${t.rating}</span></div>
                <div class="vac-card-duration">
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    ${t.days} ${tr.days_short}
                </div>
            </div>
            <div class="vac-card-footer">
                <div class="vac-card-price">
                    <span class="vac-price-from">${tr.from}</span>
                    <span class="vac-price-num">$${Number(t.price).toLocaleString()}</span>
                    <span class="vac-price-per">${tr.per_person}</span>
                </div>
                <button class="vac-details-btn" data-id="${t.id}">${tr.details}</button>
            </div>
        </div>
    </div>`;
};

// ─── DETAIL ──
const renderDetailInline = () => {
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    const t = getTours().find((x) => x.id === detailTourId);
    if (!t) return "";
    const imgs = t.images && t.images.length ? t.images : [t.coverImage || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80"];
    const name = ml(t.name, vacLang);
    const city = ml(t.city, vacLang);
    const country = ml(t.country, vacLang);
    const desc = ml(t.description, vacLang);
    const included = ml(t.included, vacLang);

    // Booking.com style: big main left + 3×4 thumbs right
    const mainImg = imgs[0] || "";
    const thumbs = imgs.slice(1, 13); // up to 12 thumbs (3 col × 4 row)
    // Determine which thumb gets bottom-right corner radius
    // Last thumb that is in the rightmost column (index % 3 === 2) or the very last one
    const lastIdx = thumbs.length - 1;
    const isBottomRight = (i) => {
        // If show-more button exists, last thumb needs no bottom-right radius (button has it)
        // Always give bottom-right to last thumb
        return i === lastIdx;
    };

    const galleryHtml = `
    <div class="vac-bk-gallery">
        <!-- Big main image -->
        <div class="vac-bk-main">
            <img src="${esc(mainImg)}" class="vac-bk-main-img" id="vac-bk-main-img" alt="${esc(name)}"
            onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80'"/>
            <div class="vac-bk-counter" id="vac-bk-counter">${imgs.length > 1 ? `1/${imgs.length}` : ""}</div>
            ${
                imgs.length > 1
                    ? `
            <button class="vac-bk-arrow-btn vac-bk-arrow-prev" id="vac-bk-prev" ${imgs.length <= 1 ? "style='display:none'" : ""}>
                <svg width="10" height="18" fill="none" viewBox="0 0 10 18"><path d="M9 1L1 9l8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <button class="vac-bk-arrow-btn vac-bk-arrow-next" id="vac-bk-next">
                <svg width="10" height="18" fill="none" viewBox="0 0 10 18"><path d="M1 1l8 8-8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>`
                    : ""
            }
            <button class="vac-bk-zoom-btn" id="vac-bk-zoom">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
        </div>
        <!-- 3×4 thumb grid -->
        <div class="vac-bk-thumbs">
            <div class="vac-bk-thumbs-grid">
                ${thumbs
                    .map(
                        (img, i) => `
                <div class="vac-bk-thumb${i === 0 ? " vac-bk-thumb--tr" : ""}${isBottomRight(i) ? " vac-bk-thumb--br" : ""}" data-idx="${i + 1}">
                    <img src="${esc(img)}" alt="photo ${i + 2}"
                    onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=300&q=70'"/>
                </div>`,
                    )
                    .join("")}
            </div>
            <button class="vac-bk-show-more" id="vac-bk-show-more">
                Barcha rasmlarni ko'rish
            </button>
        </div>
    </div>`;

    return `
    <div class="vac-detail-page" id="vac-detail-page">
        <button class="vac-back-btn" id="vac-detail-back">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            Orqaga
        </button>

        <div class="vac-gallery-wrap">
            ${galleryHtml}
        </div>

        <div class="vac-detail-body">
            <div class="vac-detail-main">
                <div class="vac-detail-top-row">
                    <div class="vac-detail-location">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#5b6ef5" stroke-width="2"/><circle cx="12" cy="9" r="2.5" stroke="#5b6ef5" stroke-width="2"/></svg>
                        ${esc(city)}, ${esc(country)}
                    </div>
                </div>
                <h2 class="vac-detail-name">${esc(name)}</h2>
                <div class="vac-detail-stars">${starsHtml(t.rating)}<span class="vac-detail-rating-num">${t.rating} ${tr.rating}</span></div>
                <p class="vac-detail-desc">${esc(desc)}</p>
                ${
                    Array.isArray(included) && included.length
                        ? `
                <div class="vac-detail-includes">
                    <div class="vac-detail-section-title">${tr.includes_title}</div>
                    <div class="vac-includes-grid">
                        ${included
                            .map(
                                (item) => `
                        <div class="vac-include-item">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            ${esc(item)}
                        </div>`,
                            )
                            .join("")}
                    </div>
                </div>`
                        : ""
                }
                ${
                    t.dates && t.dates.length
                        ? `
                <div class="vac-detail-dates-section" style="margin-top:24px;">
                    <div class="vac-detail-section-title" style="font-size:18px; font-weight:600; color:#1e293b; margin-bottom:12px;">Mavjud sanalar</div>
                    <div class="vac-dates-grid" style="display:flex; flex-wrap:wrap; gap:12px;">
                        ${t.dates.map(d => {
                            const sd = new Date(d.start);
                            const ed = new Date(d.end);
                            const fmt = dt => dt.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric" });
                            const isPast = ed < new Date();
                            return `
                            <div class="vac-detail-date-badge" style="padding:10px 14px; border:1px solid ${isPast ? '#e2e8f0' : '#bae6fd'}; border-radius:8px; background:${isPast ? '#f8fafc' : '#f0f9ff'}; color:${isPast ? '#94a3b8' : '#0369a1'}; font-weight:500; font-size:14px; display:flex; align-items:center; gap:8px;">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                <span>${fmt(sd)} - ${fmt(ed)}</span>
                                ${isPast ? '<span style="font-size:12px; color:#ef4444; margin-left:4px; font-weight:600;">(Tugagan)</span>' : ''}
                            </div>
                            `;
                        }).join("")}
                    </div>
                </div>`
                        : ""
                }
                ${
                    t.hotels && t.hotels.length
                        ? `
                <div class="vac-detail-hotels-section">
                    <div class="vac-detail-section-title" style="font-size:18px; font-weight:700; color:#1e293b; margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 21V7a2 2 0 012-2h6V3a2 2 0 012-2h0a2 2 0 012 2v2h6a2 2 0 012 2v14" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/><path d="M3 21h18M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9h2M7 13h2M15 9h2M15 13h2" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round"/></svg>
                        ${tr.hotel_section_title || "Mehmonxonalar"}
                        <span class="vac-hotel-count-badge">${t.hotels.length}</span>
                    </div>
                    <div class="vac-detail-hotels-grid">
                        ${t.hotels.map((h, hIdx) => {
                            const hName = ml(h.name, vacLang);
                            const hCity = ml(h.city, vacLang);
                            const hCountry = ml(h.country, vacLang);
                            const hDesc = ml(h.description, vacLang);
                            const hIncluded = h.included?.[vacLang] || h.included?.uz || [];
                            const hCover = h.coverImage || h.images?.[0] || '';
                            const hImages = h.images || [];
                            const amenityIcons = {
                                'WiFi': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M12 20h.01M8.5 16.5a5 5 0 017 0M5 13a10 10 0 0114 0M1.5 9.5a15 15 0 0121 0"/></svg>',
                                'Baseyn': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/></svg>',
                                'Pool': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/></svg>',
                                'Бассейн': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/></svg>',
                                'Restoran': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v4M17 2v18M17 8h4"/></svg>',
                                'Restaurant': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v4M17 2v18M17 8h4"/></svg>',
                                'Ресторан': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v4M17 2v18M17 8h4"/></svg>',
                                'Spa': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/></svg>',
                                'Sport zal': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6.5 6.5h11M14 6.5v11M10 6.5v11"/></svg>',
                                'Gym': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6.5 6.5h11M14 6.5v11M10 6.5v11"/></svg>',
                                'Спортзал': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6.5 6.5h11M14 6.5v11M10 6.5v11"/></svg>',
                                'Parking': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>',
                                'Парковка': '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>',
                            };
                            const minPrice = h.rooms && h.rooms.length ? Math.min(...h.rooms.flatMap(r => r.prices.map(p => p.price))) : 0;
                            return `
                            <div class="vac-premium-hotel-card">
                                <div class="vac-premium-hotel-left">
                                    <div class="vac-premium-hotel-img-wrap">
                                        <img src="${esc(hCover)}" class="vac-premium-hotel-img" alt="${esc(hName)}" onerror="this.src='https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'"/>
                                        <div class="vac-premium-hotel-img-overlay"></div>
                                        <div class="vac-premium-hotel-rating-badge">
                                            <span class="vac-premium-hotel-stars">${'★'.repeat(h.rating || 5)}</span>
                                        </div>
                                        ${minPrice ? `<div class="vac-premium-hotel-price-badge">${tr.from || 'dan'} <strong>$${minPrice}</strong> ${tr.per_night || '/ kecha'}</div>` : ''}
                                        ${hImages.length > 1 ? `
                                        <div class="vac-premium-hotel-gallery-strip">
                                            ${hImages.slice(0, 4).map((img, i) => `
                                                <div class="vac-premium-hotel-gallery-thumb"><img src="${esc(img)}" alt="photo ${i+1}" onerror="this.style.display='none'"/></div>
                                            `).join('')}
                                            ${hImages.length > 4 ? `<div class="vac-premium-hotel-gallery-more">+${hImages.length - 4}</div>` : ''}
                                        </div>` : ''}
                                    </div>
                                    <div class="vac-premium-hotel-left-body">
                                        <div class="vac-premium-hotel-header">
                                            <h3 class="vac-premium-hotel-name">${esc(hName)}</h3>
                                            <div class="vac-premium-hotel-location">
                                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2"/></svg>
                                                ${hCity ? esc(hCity) + ', ' : ''}${esc(hCountry)}
                                            </div>
                                        </div>
                                        <p class="vac-premium-hotel-desc">${esc(hDesc)}</p>
                                        ${hIncluded.length ? `
                                        <div class="vac-premium-hotel-amenities">
                                            ${hIncluded.map(item => `
                                                <span class="vac-premium-amenity-badge">
                                                    ${amenityIcons[item] || '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
                                                    ${esc(item)}
                                                </span>
                                            `).join('')}
                                        </div>` : ''}
                                    </div>
                                </div>
                                ${h.rooms && h.rooms.length ? `
                                <div class="vac-premium-hotel-right">
                                    <div class="vac-premium-rooms-title">
                                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                        ${tr.available_rooms || 'Mavjud xonalar'}
                                    </div>
                                    <div class="vac-premium-rooms-list">
                                        ${h.rooms.map(r => {
                                            const rName = esc(ml(r.name, vacLang));
                                            const rCover = r.images && r.images.length ? r.images[0] : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80';
                                            return `
                                            <div class="vac-premium-room-card">
                                                <div class="vac-premium-room-img-wrap">
                                                    <img src="${esc(rCover)}" class="vac-premium-room-img" alt="${rName}" onerror="this.src='https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80'"/>
                                                </div>
                                                <div class="vac-premium-room-info">
                                                    <span class="vac-premium-room-name" title="${rName}">${rName}</span>
                                                    <div class="vac-premium-room-prices">
                                                        ${r.prices.map(p => `
                                                            <div class="vac-premium-room-price-tag">
                                                                <span class="vac-beds">${p.beds} ${tr.room_beds || 'yotoqli'}</span>
                                                                <strong class="vac-price">$${p.price}</strong>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>` : ''}
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>`
                        : ""
                }
                ${
                    t.lat && t.lng
                        ? `
                <div class="vac-detail-map-section">
                    <div class="vac-detail-section-title">${tr.location_title}</div>
                    <div class="vac-detail-map-wrap">
                        <iframe
                            src="https://yandex.ru/map-widget/v1/?ll=${t.lng}%2C${t.lat}&z=12&pt=${t.lng}%2C${t.lat}%2Cpm2rdm&l=map"
                            class="vac-yandex-iframe" frameborder="0" allowfullscreen loading="lazy">
                        </iframe>
                    </div>
                    <div class="vac-map-coords">${t.lat.toFixed(4)}°N, ${t.lng.toFixed(4)}°E</div>
                </div>`
                        : ""
                }
            </div>
            <div class="vac-detail-side">
                <div class="vac-booking-card">
                    <div class="vac-booking-price">
                        <span class="vac-booking-from">${tr.from}</span>
                        <span class="vac-booking-num">$${Number(t.price).toLocaleString()}</span>
                        <span class="vac-booking-per">${tr.per_person}</span>
                    </div>
                    <div class="vac-booking-duration">
                        <div class="vac-booking-dur-item">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                            <span>${t.days} ${tr.days}</span>
                        </div>
                        <div class="vac-booking-dur-item">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                            <span>${t.nights} ${tr.nights}</span>
                        </div>
                    </div>
                    <button class="vac-book-btn">${tr.book_now}</button>
                </div>
            </div>
        </div>
    </div>`;
};

// ─── BOOKING MODAL ────────────────────────────
const getBookModalHTML = () => {
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    const t = getTours().find(x => x.id === detailTourId);
    if (!t) return "";

    const cu = getCurrentUser();
    if (!cu) {
        return `
            <div class="vac-book-box-center">
                <h3>${tr.book_login}</h3>
                <button class="vac-btn-primary vac-book-login-btn" id="vac-book-close">${tr.close || "Yopish"}</button>
            </div>`;
    }

    const name = ml(t.name, vacLang);
    const city = ml(t.city, vacLang);
    let totalCost = Number(t.price) * bookGuests;
    if (bookSelectedRoomPrice) {
        totalCost += Number(bookSelectedRoomPrice);
    }

    const methods = myCards || [];
    const fmt = n => Number(n||0).toLocaleString("en-US", {minimumFractionDigits:2}) + " UZS";

    // Find selected hotel/room names for display
    let selectedHotelName = '';
    let selectedRoomName = '';
    if (bookSelectedHotelId && t.hotels) {
        const sh = t.hotels.find(h => h.id === bookSelectedHotelId);
        if (sh) {
            selectedHotelName = ml(sh.name, vacLang);
            if (bookSelectedRoomId && sh.rooms) {
                const sr = sh.rooms.find(r => r.id === bookSelectedRoomId);
                if (sr) selectedRoomName = ml(sr.name, vacLang);
            }
        }
    }

    const hasHotels = t.hotels && t.hotels.length > 0;
    const totalSteps = hasHotels ? 3 : 2;
    const displayStep = hasHotels ? bookStep : (bookStep === 1 ? 1 : bookStep - 1);

    if (bookStep === 4) {
        return `
            <div class="vac-book-box-center">
                <div class="vac-book-success-icon">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h2 class="vac-book-success-title">${tr.book_success}</h2>
                <p class="vac-book-success-desc"><strong>${name}</strong> ${tr.book_success_desc}</p>
                <div class="vac-book-summary-box">
                    <div class="vac-book-summary-row">
                        <span class="vac-book-summary-label">${tr.book_guests}</span>
                        <span class="vac-book-summary-val">${bookGuests}</span>
                    </div>
                    ${selectedHotelName ? `
                    <div class="vac-book-summary-row">
                        <span class="vac-book-summary-label">${tr.book_success_hotel || 'Mehmonxona:'}</span>
                        <span class="vac-book-summary-val">${esc(selectedHotelName)}</span>
                    </div>` : ''}
                    ${selectedRoomName ? `
                    <div class="vac-book-summary-row">
                        <span class="vac-book-summary-label">${tr.book_success_room || 'Xona:'}</span>
                        <span class="vac-book-summary-val">${esc(selectedRoomName)} (${bookSelectedRoomBeds} ${tr.room_beds || 'yotoqli'})</span>
                    </div>` : ''}
                    <div class="vac-book-summary-row">
                        <span class="vac-book-summary-label">${tr.book_total}</span>
                        <span class="vac-book-summary-val-total">$${totalCost.toLocaleString()}</span>
                    </div>
                </div>
                <button class="vac-btn-primary vac-book-confirm-btn" id="vac-book-close">${tr.book_continue}</button>
            </div>`;
    }

    // Step indicator
    const stepLabels = [tr.book_step_date || 'Sana', ...(hasHotels ? [tr.book_step_hotel || 'Mehmonxona'] : []), tr.book_step_payment || "To'lov"];
    const stepIndicator = `
        <div class="vac-book-step-indicator">
            ${stepLabels.map((label, i) => {
                const stepNum = i + 1;
                const isActive = displayStep === stepNum;
                const isDone = displayStep > stepNum;
                return `
                <div class="vac-book-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}">
                    <div class="vac-book-step-circle">${isDone ? '<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' : stepNum}</div>
                    <span class="vac-book-step-label">${label}</span>
                </div>
                ${i < stepLabels.length - 1 ? '<div class="vac-book-step-line' + (isDone ? ' done' : '') + '"></div>' : ''}`;
            }).join('')}
        </div>`;

    let baseHtml = `
            <div class="vac-add-modal-header vac-book-header">
                <h2 class="vac-add-modal-title">${tr.book_title}</h2>
                <button class="vac-modal-close" id="vac-book-close">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>
            <div class="vac-add-modal-body vac-book-body" style="padding-top:16px; display: flex; flex-direction: column;">
                <div style="width: 100%; margin-bottom: 24px;">
                    ${stepIndicator}
                </div>
    `;

    if (bookStep === 1) {
        baseHtml += `
            <div class="vac-book-step-grid" style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 32px; align-items: stretch; flex: 1;">
                
                <!-- Left side: Tour Summary & Guests (was Right side) -->
                <div class="vac-book-step-left" style="align-self: start; background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; position: sticky; top: 0;">
                    <div style="font-size: 14px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                        ${tr.booking_summary || 'Buyurtma xulosasi'}
                    </div>
                    
                    <div class="vac-book-tour-info-card" style="display: flex; gap: 16px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed #cbd5e1;">
                        <img src="${t.coverImage || (t.images&&t.images[0]) || ''}" style="width: 90px; height: 90px; border-radius: 12px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=200&q=80'"/>
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                            <h4 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</h4>
                            ${city ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/></svg>
                                ${city}
                            </div>` : ''}
                            <div style="font-size: 18px; font-weight: 800; color: #5b6ef5;">$${Number(t.price).toLocaleString()} <span style="font-size: 12px; font-weight: 500; color: #94a3b8;">${tr.per_person}</span></div>
                        </div>
                    </div>

                    <div class="vac-book-section" style="margin-bottom: 0;">
                        <label class="vac-book-label" style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 12px; display: block;">${tr.book_select_guests || 'Mehmonlar soni'}</label>
                        <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 36px; height: 36px; background: #eef2ff; color: #5b6ef5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                </div>
                                <span style="font-size: 15px; font-weight: 600; color: #0f172a;">${tr.person_count || 'Kishi'}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <button class="vac-guest-btn" id="vac-g-minus" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">-</button>
                                <span class="vac-book-guest-count" style="font-size: 18px; font-weight: 800; color: #0f172a; min-width: 24px; text-align: center;">${bookGuests}</span>
                                <button class="vac-guest-btn" id="vac-g-plus" style="width: 36px; height: 36px; border-radius: 50%; border: none; background: #5b6ef5; color: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(91,110,245,0.2); transition: all 0.2s;">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right side: Dates (was Left side) -->
                <div class="vac-book-step-right" style="display: flex; flex-direction: column; gap: 32px;">
                    <div class="vac-book-section">
                        <label class="vac-book-label" style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#5b6ef5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            ${tr.book_step_date || 'Sayohat sanasini tanlang'}
                        </label>
                        <div class="vac-book-dates-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
                            ${(t.dates || []).length ? t.dates.map((d, i) => {
                                const sd = new Date(d.start);
                                const ed = new Date(d.end);
                                const isPast = ed < new Date();
                                const fmtDt = dt => dt.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric" });
                                return `
                                <label class="vac-book-date-card ${bookSelectedDateIdx === i ? 'vac-selected' : ''} ${isPast ? 'disabled' : ''}">
                                    <input type="radio" name="b-date" value="${i}" ${bookSelectedDateIdx === i ? 'checked' : ''} ${isPast ? 'disabled' : ''} class="vac-book-hidden-radio"/>
                                    <div class="vac-book-date-card-inner">
                                        <div class="vac-book-date-card-top">
                                            <span class="vac-book-date-range">${fmtDt(sd)} — ${fmtDt(ed)}</span>
                                        </div>
                                        ${isPast ? `<span class="vac-book-date-ended">${tr.ended || 'Tugagan'}</span>` : ''}
                                    </div>
                                    ${bookSelectedDateIdx === i ? `
                                    <div style="position: absolute; top: 12px; right: 12px; color: #5b6ef5;">
                                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                    </div>
                                    ` : ''}
                                </label>
                                `;
                            }).join("") : `<div class="vac-book-no-methods" style="color:#f59e0b;">${tr.no_dates_msg || 'Ushbu tur uchun sanalar kiritilmagan'}</div>`}
                        </div>
                    </div>

                    <div class="vac-book-actions" style="margin-top:auto; display:flex; justify-content:flex-end;">
                        <button class="vac-btn-primary" id="vac-book-next-1" style="width: 100%; max-width: 280px; padding: 16px; font-size: 16px; border-radius: 12px;">${tr.next_step || 'Keyingi qadam'} &rarr;</button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (bookStep === 2) {
        baseHtml += `
            <div class="vac-book-section">
                <label class="vac-book-label" style="font-size:16px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 21V7a2 2 0 012-2h6V3a2 2 0 012-2h0a2 2 0 012 2v2h6a2 2 0 012 2v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 21h18M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${tr.select_hotel || 'Mehmonxona va Xonani tanlang'}
                </label>
                <div class="vac-book-hotels-premium">
                    ${t.hotels.map(h => {
                        const isSelectedHotel = bookSelectedHotelId === h.id;
                        const hName = ml(h.name, vacLang);
                        const hDesc = ml(h.description, vacLang);
                        const hCity = ml(h.city, vacLang);
                        const hIncluded = h.included?.[vacLang] || h.included?.uz || [];
                        return `
                        <div class="vac-book-hotel-premium ${isSelectedHotel ? 'vac-selected' : ''}" data-hid="${h.id}">
                            <div class="vac-book-hotel-premium-top">
                                <div class="vac-book-hotel-premium-img-wrap">
                                    <img src="${esc(h.coverImage || h.images?.[0])}" class="vac-book-hotel-premium-img" onerror="this.src='https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80'"/>
                                    <div class="vac-book-hotel-premium-stars">${'★'.repeat(h.rating || 5)}</div>
                                </div>
                                <div class="vac-book-hotel-premium-info">
                                    <div class="vac-book-hotel-premium-radio-row">
                                        <input type="radio" name="b-hotel" ${isSelectedHotel ? 'checked' : ''} class="vac-book-method-radio"/>
                                        <h4 class="vac-book-hotel-premium-name">${esc(hName)}</h4>
                                    </div>
                                    ${hCity ? `<div class="vac-book-hotel-premium-loc">
                                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/></svg>
                                        ${esc(hCity)}
                                    </div>` : ''}
                                    <p class="vac-book-hotel-premium-desc">${esc(hDesc)}</p>
                                    ${hIncluded.length ? `
                                    <div class="vac-book-hotel-premium-amenities">
                                        ${hIncluded.slice(0, 5).map(item => `<span class="vac-book-amenity-tag">${esc(item)}</span>`).join('')}
                                    </div>` : ''}
                                </div>
                            </div>
                            ${isSelectedHotel && h.rooms && h.rooms.length ? `
                                <div class="vac-book-hotel-rooms-expanded">
                                    <div class="vac-book-rooms-divider">
                                        <span>${tr.select_room || 'Xona turini tanlang'}:</span>
                                    </div>
                                    <div class="vac-book-rooms-grid">
                                        ${h.rooms.map(r => {
                                            const rName = ml(r.name, vacLang);
                                            const rImg = r.images?.[0] || h.coverImage || '';
                                            return `
                                            <div class="vac-book-room-card">
                                                <div class="vac-book-room-card-img">
                                                    <img src="${esc(rImg)}" onerror="this.src='https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=300&q=80'"/>
                                                </div>
                                                <div class="vac-book-room-card-body">
                                                    <div class="vac-book-room-card-name">${esc(rName)}</div>
                                                    <div class="vac-book-room-card-prices">
                                                        ${r.prices.map(p => {
                                                            const isSelectedRoom = bookSelectedRoomId === r.id && bookSelectedRoomBeds === p.beds;
                                                            return `
                                                            <label class="vac-book-room-price-option ${isSelectedRoom ? 'vac-selected' : ''}">
                                                                <input type="radio" class="vac-book-room-radio" name="b-room" data-rid="${r.id}" data-beds="${p.beds}" data-price="${p.price}" ${isSelectedRoom ? 'checked' : ''}/>
                                                                 <div class="vac-book-room-price-content">
                                                                     <span class="vac-book-room-beds-label">${p.beds} ${tr.room_beds || 'yotoqli'}</span>
                                                                     <span class="vac-book-room-price-amount">+$${p.price}</span>
                                                                 </div>
                                                                 ${isSelectedRoom ? `<span class="vac-book-room-selected-badge">${tr.selected || 'Tanlangan'}</span>` : ''}
                                                            </label>
                                                            `;
                                                        }).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ""}
                        </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <div class="vac-book-actions" style="margin-top:32px; display:flex; justify-content:space-between;">
                <button class="vac-btn-secondary" id="vac-book-prev-2">${tr.prev_step || 'Orqaga'}</button>
                <button class="vac-btn-primary" id="vac-book-next-2" ${!bookSelectedRoomId ? 'disabled' : ''}>${tr.next_step || 'Keyingi qadam'}</button>
            </div>
        `;
    }
    else if (bookStep === 3) {
        baseHtml += `
                <!-- Booking Summary -->
                ${(selectedHotelName || selectedRoomName) ? `
                <div class="vac-book-summary-section">
                    <div class="vac-book-summary-title">${tr.booking_summary || 'Buyurtma xulosasi'}</div>
                    <div class="vac-book-summary-items">
                        <div class="vac-book-summary-item">
                            <span class="vac-book-summary-item-label">${tr.book_step_hotel || 'Mehmonxona'}</span>
                            <span class="vac-book-summary-item-val">${esc(selectedHotelName)}</span>
                        </div>
                        ${selectedRoomName ? `
                        <div class="vac-book-summary-item">
                            <span class="vac-book-summary-item-label">${tr.select_room || 'Xona'}</span>
                            <span class="vac-book-summary-item-val">${esc(selectedRoomName)} (${bookSelectedRoomBeds} ${tr.room_beds || 'yotoqli'})</span>
                        </div>` : ''}
                    </div>
                </div>` : ''}

                <div class="vac-book-section">
                    <label class="vac-book-label">${tr.book_select_payment}</label>
                    <div class="vac-book-methods">
                        ${methods.length ? methods.map((m, i) => `
                        <label class="vac-book-method-item ${bookSelectedMethodIdx === i ? 'active' : ''}">
                            <input type="radio" name="b-method" value="${i}" ${bookSelectedMethodIdx === i ? 'checked' : ''} class="vac-book-method-radio"/>
                            <div class="vac-book-method-info">
                                <div class="vac-book-method-top">
                                    <span class="vac-book-method-name">${m.cardName || m.type} ${m.displayNumber || m.number}</span>
                                    <span class="vac-book-method-bal ${Number(m.balance)<totalCost ? 'error' : ''}">${fmt(m.balance)}</span>
                                </div>
                                <span class="vac-book-method-sub">${m.holder || ''}</span>
                            </div>
                        </label>
                        `).join("") : `<div class="vac-book-no-methods">${tr.book_no_methods}</div>`}
                    </div>
                </div>

                <div class="vac-book-total-row" style="margin-top:24px; padding-top:16px; border-top:1px dashed #e2e8f0; border-bottom:none;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#64748b; font-weight:500;">
                        <span>${tr.tour_price_label || 'Tur narxi'} (${bookGuests} ${tr.person_count || 'kishi'}):</span>
                        <span>$${(Number(t.price) * bookGuests).toLocaleString()}</span>
                    </div>
                    ${bookSelectedRoomPrice ? `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#64748b; font-weight:500;">
                        <span>${tr.room_price_label || "Qo'shimcha xona to'lovi"}:</span>
                        <span>$${Number(bookSelectedRoomPrice).toLocaleString()}</span>
                    </div>` : ""}
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:16px; border-top:1px solid #e2e8f0;">
                        <span class="vac-book-total-label">${tr.book_total_label}</span>
                        <span class="vac-book-total-val" style="font-size:24px; color:#5b6ef5;">$${totalCost.toLocaleString()}</span>
                    </div>
                </div>

                <div class="vac-book-actions" style="margin-top:32px; display:flex; justify-content:space-between;">
                    <button class="vac-btn-secondary" id="vac-book-prev-3">${tr.prev_step || 'Orqaga'}</button>
                    <button class="vac-btn-primary vac-book-confirm-btn" id="vac-book-confirm" ${!methods.length ? 'disabled' : ''}>
                        ${tr.book_pay}
                    </button>
                </div>
        `;
    }

    baseHtml += `</div>`;
    return baseHtml;
};


// ─── ADD / EDIT MODAL ─────────────────────────
const getEmptyHotel = () => ({
    id: "temp_" + Date.now() + Math.random().toString(36).slice(2,6),
    name: { uz: "", ru: "", en: "" },
    country: { uz: "", ru: "", en: "" },
    city: { uz: "", ru: "", en: "" },
    description: { uz: "", ru: "", en: "" },
    rating: 5,
    included: { uz: [], ru: [], en: [] },
    coverImage: null,
    images: [],
    lat: null,
    lng: null,
    rooms: []
});


const saveCurrentHotelData = () => {
    if (!modalHotels[activeHotelIndex]) return;
    const h = modalHotels[activeHotelIndex];
    const cl = formContentLang;
    
    // Save text fields if they exist
    const nameEl = document.getElementById("hf-name");
    const countryEl = document.getElementById("hf-country");
    const cityEl = document.getElementById("hf-city");
    const descEl = document.getElementById("hf-desc");
    
    if (nameEl) h.name[cl] = nameEl.value;
    if (countryEl) h.country[cl] = countryEl.value;
    if (cityEl) h.city[cl] = cityEl.value;
    if (descEl) h.description[cl] = descEl.value;
    
    // Save amenities
    const selectedInc = [];
    document.querySelectorAll(".hf-amenity-checkbox:checked").forEach(cb => {
        selectedInc.push(cb.value);
    });
    // If we are on a specific language tab, amenities are usually universal, but we store in current lang
    h.included[cl] = selectedInc;
    
    const ratingEl = document.getElementById("hf-rating-select");
    if (ratingEl) h.rating = parseInt(ratingEl.value) || 5;

    const latEl = document.getElementById("hf-lat");
    const lngEl = document.getElementById("hf-lng");
    if (latEl) h.lat = parseFloat(latEl.value) || null;
    if (lngEl) h.lng = parseFloat(lngEl.value) || null;
    
    // Save rooms
    if (h.rooms) {
        document.querySelectorAll(".hf-room-card").forEach((card) => {
            const idx = parseInt(card.dataset.idx);
            if (h.rooms[idx]) {
                const typeEl = card.querySelector(".hf-room-type");
                
                if (typeEl) {
                    if (!h.rooms[idx].name) h.rooms[idx].name = {};
                    h.rooms[idx].name[cl] = typeEl.value;
                }

                // Read prices
                const newPrices = [];
                card.querySelectorAll(".hf-room-bed-cb").forEach((cb) => {
                    if (cb.checked) {
                        const beds = parseInt(cb.dataset.beds);
                        const priceInp = card.querySelector(`.hf-room-bed-price[data-beds="${beds}"]`);
                        const val = parseFloat(priceInp.value) || 0;
                        newPrices.push({ beds, price: val });
                    }
                });
                h.rooms[idx].prices = newPrices;
            }
        });
    }
};

const renderHotelSidebarList = () => {
    const vacLang = getCurrentLang();
    return modalHotels.map((h, i) => {
        const hName = ml(h.name, vacLang) || "Yangi mehmonxona " + (i + 1);
        return `
        <div class="q-list-item ${i === activeHotelIndex ? 'active' : ''}" data-idx="${i}">
            <div class="q-list-item-header">
                <strong>${esc(hName)}</strong>
                <button class="q-dots-btn hf-del-btn" data-idx="${i}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
            <p>${h.rating} Yulduzli</p>
        </div>
        `;
    }).join("");
};

const renderHotelRooms = (h) => {
    const cl = formContentLang;
    if (!h.rooms) h.rooms = [];
    
    return `
    <div class="s-card hf-rooms-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <label class="vac-label" style="margin:0; font-size:13px;">XONALAR</label>
            <button type="button" class="vac-btn-secondary hf-room-add-btn" style="font-size: 12px; padding: 6px 12px;">+ Xona qo'shish</button>
        </div>
        
        <div class="hf-rooms-list" style="display:flex; flex-direction:column; gap:16px;">
            ${h.rooms.length === 0 ? `<div class="empty-state" style="font-size:12px; padding:20px; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1; text-align:center;">Hozircha xonalar kiritilmagan</div>` : ''}
            
            ${h.rooms.map((r, i) => `
                <div class="hf-room-card" data-idx="${i}" style="padding: 24px; display:flex; flex-direction:column; gap:20px;">
                    <div class="hf-room-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #e2e8f0; padding-bottom:16px;">
                        <span class="hf-room-num" style="font-weight:700; font-size:16px; color:#1a1d2e; display:flex; align-items:center; gap:8px;">
                            <div style="width:32px; height:32px; border-radius:8px; background:#f0f2f8; color:#5b6ef5; display:flex; align-items:center; justify-content:center;">
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </div>
                            ${r.name?.[cl] || `Xona #${i + 1}`}
                        </span>
                        <button type="button" class="vac-btn-icon hf-room-remove" data-idx="${i}" style="color:#ef4444;">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                    </div>
                    <div class="vac-form-group">
                        <label class="vac-label" style="display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            Xona turi (masalan: Lux)
                        </label>
                        <input type="text" class="vac-input hf-room-type" data-idx="${i}" value="${esc(r.name?.[cl] || '')}" placeholder="Lux xona" style="font-size:14px; font-weight:500;" />
                    </div>
                    <div class="vac-form-group">
                        <label class="vac-label" style="display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            Yotoqlar va Narxlar ($ yoki so'mda, faqat raqam)
                        </label>
                        <div class="hf-room-prices-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            ${[1, 2, 3, 4].map(beds => {
                                const pObj = (r.prices || []).find(p => p.beds === beds);
                                const isChecked = !!pObj;
                                const val = pObj ? pObj.price : '';
                                return `
                                <div class="hf-room-price-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fafbff; padding:10px 16px; border-radius:12px; border:1.5px solid ${isChecked ? '#5b6ef5' : '#e2e8f0'}; min-height:50px; box-sizing:border-box; transition:all 0.2s;">
                                    <label style="display:flex; align-items:center; gap:12px; font-size:14px; font-weight:600; color:${isChecked ? '#5b6ef5' : '#5a6279'}; cursor:pointer; margin:0; transition:color 0.2s;">
                                        <input type="checkbox" class="hf-room-bed-cb" data-idx="${i}" data-beds="${beds}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer; accent-color:#5b6ef5; margin:0;"/>
                                        ${beds} yotoqli
                                    </label>
                                    <input type="number" class="vac-input hf-room-bed-price" data-idx="${i}" data-beds="${beds}" value="${val}" placeholder="Narxni kiriting" style="width:140px; display:${isChecked ? 'block' : 'none'}; padding:8px 12px; font-size:14px; margin:0; border-color:#cbd5e1; font-weight:500;" />
                                </div>
                                `;
                            }).join("")}
                        </div>
                    </div>
                    <div class="vac-form-group" style="margin-bottom:0;">
                        <label class="vac-label" style="display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            Xona rasmlari
                        </label>
                        <div class="vac-gallery-grid hf-gallery-grid-custom" style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
                            ${(r.images || []).map((img, imgIdx) => `
                                <div class="vac-gallery-item" style="width:100px; height:100px;">
                                    <img src="${esc(img)}" class="vac-gallery-thumb" style="border-radius:12px;"/>
                                    <button type="button" class="vac-img-remove hf-room-img-remove" data-ridx="${i}" data-iidx="${imgIdx}" style="width:20px; height:20px; font-size:10px;">✕</button>
                                </div>
                            `).join("")}
                            <label class="vac-gallery-add-btn hf-room-img-add" for="hf-room-img-${i}" style="width:100px; height:100px; border-radius:12px; background:#fff; border:1px dashed #cbd5e1;">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/></svg>
                            </label>
                            <input type="file" id="hf-room-img-${i}" class="hf-room-img-input" data-idx="${i}" accept="image/*" multiple style="display:none"/>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    </div>`;
};

const renderHotelEditorContent = () => {
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    const cl = formContentLang;
    
    if (modalHotels.length === 0) return `<div class="empty-state"><h3>Mehmonxona yo'q</h3></div>`;
    const h = modalHotels[activeHotelIndex];
    if (!h) return "";

    const fName = h.name[cl] || "";
    const fCountry = h.country[cl] || "";
    const fCity = h.city[cl] || "";
    const fDesc = h.description[cl] || "";
    const fIncArr = h.included[cl] || [];

    return `
    <div class="settings-editor" style="max-width: 100%;">
        <!-- Lang tabs for hotel editor -->
        <div class="vac-lang-tabs" style="margin-bottom: 20px;">
            <span class="vac-lang-tabs-label">${tr.content_lang}:</span>
            ${["uz", "ru", "en"].map(l => `
                <button class="vac-lang-tab hf-lang-tab ${cl === l ? "active" : ""}" data-lang="${l}">${tr["tab_" + l]}</button>
            `).join("")}
        </div>

        <div class="s-card">
            <h3>Asosiy Ma'lumotlar</h3>
            <div class="vac-form-row-2">
                <div class="vac-form-group">
                    <label class="vac-label">Mehmonxona Nomi *</label>
                    <input type="text" id="hf-name" class="vac-input" placeholder="Hilton Tashkent" value="${esc(fName)}"/>
                </div>
                <div class="vac-form-group">
                    <label class="vac-label">Kategoriya (Yulduz)</label>
                    <select id="hf-rating-select" class="vac-input vac-select">
                        <option value="5" ${h.rating === 5 ? "selected" : ""}>5 Yulduzli</option>
                        <option value="4" ${h.rating === 4 ? "selected" : ""}>4 Yulduzli</option>
                        <option value="3" ${h.rating === 3 ? "selected" : ""}>3 Yulduzli</option>
                        <option value="2" ${h.rating === 2 ? "selected" : ""}>2 Yulduzli</option>
                        <option value="1" ${h.rating === 1 ? "selected" : ""}>1 Yulduzli</option>
                    </select>
                </div>
            </div>
            <div class="vac-form-row-2">
                <div class="vac-form-group">
                    <label class="vac-label">${tr.field_country} *</label>
                    <input type="text" id="hf-country" class="vac-input" placeholder="O'zbekiston" value="${esc(fCountry)}"/>
                </div>
                <div class="vac-form-group">
                    <label class="vac-label">${tr.field_city}</label>
                    <input type="text" id="hf-city" class="vac-input" placeholder="Toshkent" value="${esc(fCity)}"/>
                </div>
            </div>
            <div class="vac-form-group">
                <label class="vac-label">Tavsif</label>
                <textarea id="hf-desc" class="vac-input vac-textarea" rows="3" placeholder="Batafsil ma'lumot...">${esc(fDesc)}</textarea>
            </div>
        </div>

        <div class="s-card">
            <h3>Qulayliklar (Amenities)</h3>
            <div class="vac-amenities-grid">
                ${[
                    { key: "wifi", label: "WiFi", icon: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M1.5 9.5a15 15 0 0 1 21 0"/></svg>` },
                    { key: "pool", label: "Baseyn", icon: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>` },
                    { key: "restaurant", label: "Restoran", icon: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v4M12 15V3a6 6 0 0 1 6 6v6m0 0v6M12 15h6M9 11v10M5 11v10"/></svg>` },
                    { key: "gym", label: "Sport zal", icon: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 6.5h11M6.5 17.5h11M14 6.5v11M10 6.5v11m-6-8h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zm14 0h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/></svg>` },
                    { key: "parking", label: "Parking", icon: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2" stroke-linecap="round" stroke-linejoin="round"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>` },
                    { key: "spa", label: "Spa", icon: `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>` }
                ].map(item => {
                    const isChecked = Array.isArray(fIncArr) && fIncArr.includes(item.label);
                    return `
                    <label class="vac-amenity-card ${isChecked ? 'active' : ''}">
                        <input type="checkbox" class="hf-amenity-checkbox vac-amenity-checkbox" value="${item.label}" ${isChecked ? 'checked' : ''}/>
                        <span class="vac-amenity-icon">${item.icon}</span>
                        <span class="vac-amenity-label">${item.label}</span>
                    </label>
                    `;
                }).join("")}
            </div>
        </div>

        <div class="hf-image-card">
            <div class="hf-image-col hf-image-col--left">
                <div class="hf-image-title">MUQOVA RASMI</div>
                <div class="vac-cover-upload" id="hf-cover-zone">
                    ${h.coverImage ? `
                        <div class="vac-cover-preview">
                            <img src="${esc(h.coverImage)}" class="vac-cover-img"/>
                            <button type="button" class="vac-img-remove hf-cover-remove">✕</button>
                        </div>
                    ` : `
                        <div class="vac-upload-placeholder hf-cover-placeholder">
                            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#e2e8f0"/><path d="M21 15l-5-5L5 21" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                    `}
                    <input type="file" id="hf-cover-input" accept="image/*" style="display:none"/>
                </div>
            </div>
            
            <div class="hf-image-divider"></div>

            <div class="hf-image-col hf-image-col--right">
                <div class="hf-image-title">GALEREYA RASMLARI</div>
                <div class="vac-gallery-grid hf-gallery-grid-custom" id="hf-gallery-grid">
                    ${h.images.map((img, i) => `
                        <div class="vac-gallery-item">
                            <img src="${esc(img)}" class="vac-gallery-thumb"/>
                            <button type="button" class="vac-img-remove hf-gallery-remove" data-idx="${i}">✕</button>
                        </div>
                    `).join("")}
                    <label class="vac-gallery-add-btn" for="hf-gallery-input">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </label>
                    <input type="file" id="hf-gallery-input" accept="image/*" multiple style="display:none"/>
                </div>
            </div>
        </div>

        ${renderHotelRooms(h)}

        <div class="s-card">
            <label class="vac-label">${tr.location_title}</label>
            <div class="vac-pick-map-search">
                <input type="text" id="hf-map-search" class="vac-input" placeholder="${tr.search_loc}"/>
                <button type="button" id="hf-map-search-btn" class="vac-map-search-btn">${tr.map_search}</button>
            </div>
            <div class="vac-pick-map" id="hf-pick-map"></div>
            <div class="vac-form-row-2" style="margin-top:8px">
                <div class="vac-form-group" style="margin-bottom:0">
                    <label class="vac-label" style="font-size:10px">${tr.field_lat}</label>
                    <input type="number" step="0.0001" id="hf-lat" class="vac-input" value="${h.lat || ""}"/>
                </div>
                <div class="vac-form-group" style="margin-bottom:0">
                    <label class="vac-label" style="font-size:10px">${tr.field_lng}</label>
                    <input type="number" step="0.0001" id="hf-lng" class="vac-input" value="${h.lng || ""}"/>
                </div>
            </div>
        </div>
    </div>`;
};

// Also attach event listeners to hotel sidebar and editor
const attachHotelEvents = () => {
    // Switch active hotel
    document.querySelectorAll(".q-list-item").forEach(item => {
        item.addEventListener("click", (e) => {
            if(e.target.closest(".hf-del-btn")) return;
            saveCurrentHotelData();
            activeHotelIndex = parseInt(item.dataset.idx);
            updateHotelView();
        });
    });

    // Delete hotel
    document.querySelectorAll(".hf-del-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            modalHotels.splice(idx, 1);
            if (activeHotelIndex >= modalHotels.length) activeHotelIndex = Math.max(0, modalHotels.length - 1);
            updateHotelView();
        });
    });

    // Add new hotel
    const addBtn = document.getElementById("vac-add-hotel-btn");
    if (addBtn && !addBtn.hasAttribute("data-bound")) {
        addBtn.setAttribute("data-bound", "1");
        addBtn.addEventListener("click", () => {
            saveCurrentHotelData();
            modalHotels.push(getEmptyHotel());
            activeHotelIndex = modalHotels.length - 1;
            updateHotelView();
        });
    }

    // Lang tabs in hotel editor
    document.querySelectorAll(".hf-lang-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            saveCurrentHotelData();
            formContentLang = tab.dataset.lang;
            updateHotelView();
        });
    });

    // Checkboxes
    document.querySelectorAll(".hf-amenity-checkbox").forEach(cb => {
        cb.addEventListener("change", () => {
            cb.closest(".vac-amenity-card")?.classList.toggle("active", cb.checked);
            saveCurrentHotelData();
        });
    });

    // Basic inputs save automatically on input/change
    ["hf-name", "hf-country", "hf-city", "hf-desc", "hf-rating-select", "hf-lat", "hf-lng"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", saveCurrentHotelData);
    });

    // Images
    const coverZone = document.getElementById("hf-cover-zone");
    if (coverZone) {
        coverZone.addEventListener("click", (e) => {
            if (!e.target.closest(".hf-cover-remove")) {
                document.getElementById("hf-cover-input")?.click();
            }
        });
    }

    document.getElementById("hf-cover-input")?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = ev => {
            if(modalHotels[activeHotelIndex]) {
                modalHotels[activeHotelIndex].coverImage = ev.target.result;
                updateHotelView();
            }
        };
        r.readAsDataURL(file);
        e.target.value = "";
    });

    document.querySelector(".hf-cover-remove")?.addEventListener("click", () => {
        if(modalHotels[activeHotelIndex]) {
            modalHotels[activeHotelIndex].coverImage = null;
            updateHotelView();
        }
    });

    document.getElementById("hf-gallery-input")?.addEventListener("change", (e) => {
        Array.from(e.target.files).forEach(file => {
            const r = new FileReader();
            r.onload = ev => {
                if(modalHotels[activeHotelIndex]) {
                    modalHotels[activeHotelIndex].images.push(ev.target.result);
                    updateHotelView();
                }
            };
            r.readAsDataURL(file);
        });
        e.target.value = "";
    });

    document.querySelectorAll(".hf-gallery-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.idx);
            if(modalHotels[activeHotelIndex]) {
                modalHotels[activeHotelIndex].images.splice(idx, 1);
                updateHotelView();
            }
        });
    });

    // Rooms
    document.querySelector(".hf-room-add-btn")?.addEventListener("click", () => {
        saveCurrentHotelData();
        if (modalHotels[activeHotelIndex]) {
            if (!modalHotels[activeHotelIndex].rooms) modalHotels[activeHotelIndex].rooms = [];
            modalHotels[activeHotelIndex].rooms.push({
                id: "room_" + Date.now(),
                name: { uz: "", ru: "", en: "" },
                prices: [],
                images: []
            });
            updateHotelView();
        }
    });

    document.querySelectorAll(".hf-room-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            saveCurrentHotelData();
            const idx = parseInt(btn.dataset.idx);
            if (modalHotels[activeHotelIndex]) {
                modalHotels[activeHotelIndex].rooms.splice(idx, 1);
                updateHotelView();
            }
        });
    });

    document.querySelectorAll(".hf-room-type, .hf-room-bed-price").forEach(inp => {
        inp.addEventListener("change", saveCurrentHotelData);
    });

    document.querySelectorAll(".hf-room-bed-cb").forEach(cb => {
        cb.addEventListener("change", (e) => {
            saveCurrentHotelData();
            // Show/hide price input based on checkbox state immediately without full re-render
            const row = e.target.closest(".hf-room-price-row");
            if (row) {
                const priceInp = row.querySelector(".hf-room-bed-price");
                const label = row.querySelector("label");
                const isChecked = e.target.checked;
                if (priceInp) priceInp.style.display = isChecked ? "block" : "none";
                row.style.borderColor = isChecked ? "#5b6ef5" : "#e2e8f0";
                if (label) label.style.color = isChecked ? "#5b6ef5" : "#5a6279";
            }
        });
    });

    document.querySelectorAll(".hf-room-img-input").forEach(inp => {
        inp.addEventListener("change", (e) => {
            const ridx = parseInt(e.target.dataset.idx);
            Array.from(e.target.files).forEach(file => {
                const r = new FileReader();
                r.onload = ev => {
                    if(modalHotels[activeHotelIndex] && modalHotels[activeHotelIndex].rooms[ridx]) {
                        saveCurrentHotelData(); // First save what was written in inputs
                        modalHotels[activeHotelIndex].rooms[ridx].images.push(ev.target.result);
                        updateHotelView();
                    }
                };
                r.readAsDataURL(file);
            });
            e.target.value = "";
        });
    });

    document.querySelectorAll(".hf-room-img-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            saveCurrentHotelData();
            const ridx = parseInt(btn.dataset.ridx);
            const iidx = parseInt(btn.dataset.iidx);
            if(modalHotels[activeHotelIndex] && modalHotels[activeHotelIndex].rooms[ridx]) {
                modalHotels[activeHotelIndex].rooms[ridx].images.splice(iidx, 1);
                updateHotelView();
            }
        });
    });
};

const updateHotelView = () => {
    const listWrap = document.getElementById("vac-hotel-list");
    const editorWrap = document.getElementById("vac-hotel-editor-wrap");
    if (listWrap) listWrap.innerHTML = renderHotelSidebarList();
    if (editorWrap) {
        editorWrap.innerHTML = renderHotelEditorContent();
        attachHotelEvents();
        setTimeout(() => {
            if (activeModalTab === "hotel" && modalHotels.length > 0) {
                initPickMapForHotel();
            }
        }, 150);
    }
};

let hfPickMap = null;
let hfPickMarker = null;

const initPickMapForHotel = () => {
    const mapEl = document.getElementById("hf-pick-map");
    if (!mapEl) return;
    mapEl.innerHTML = "";
    
    if (hfPickMap) {
        try { hfPickMap.remove(); } catch(e) {}
        hfPickMap = null;
        hfPickMarker = null;
    }

    const h = modalHotels[activeHotelIndex];
    const lat = h?.lat || 41.2995;
    const lng = h?.lng || 69.2401;
    const zoom = h?.lat && h?.lng ? 12 : 5;

    loadLeaflet(() => {
        hfPickMap = window.L.map(mapEl, { zoomControl: true }).setView([lat, lng], zoom);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
            maxZoom: 19,
        }).addTo(hfPickMap);
        
        if (h?.lat && h?.lng) {
            hfPickMarker = window.L.marker([lat, lng], { draggable: true }).addTo(hfPickMap);
            hfPickMarker.on("dragend", () => {
                const pos = hfPickMarker.getLatLng();
                const li = document.getElementById("hf-lat");
                const lo = document.getElementById("hf-lng");
                if (li) li.value = pos.lat.toFixed(6);
                if (lo) lo.value = pos.lng.toFixed(6);
                saveCurrentHotelData();
            });
        }
        
        hfPickMap.on("click", (e) => {
            const { lat: la, lng: lo } = e.latlng;
            if (hfPickMarker) hfPickMarker.setLatLng([la, lo]);
            else {
                hfPickMarker = window.L.marker([la, lo], { draggable: true }).addTo(hfPickMap);
                hfPickMarker.on("dragend", () => {
                    const pos = hfPickMarker.getLatLng();
                    const li = document.getElementById("hf-lat");
                    const lo2 = document.getElementById("hf-lng");
                    if (li) li.value = pos.lat.toFixed(6);
                    if (lo2) lo2.value = pos.lng.toFixed(6);
                    saveCurrentHotelData();
                });
            }
            const li = document.getElementById("hf-lat");
            const lo2 = document.getElementById("hf-lng");
            if (li) li.value = la.toFixed(6);
            if (lo2) lo2.value = lo.toFixed(6);
            saveCurrentHotelData();
        });

        const searchBtn = document.getElementById("hf-map-search-btn");
        const searchInp = document.getElementById("hf-map-search");
        if (searchBtn && searchInp) {
            const doSearch = () => {
                const currentInp = document.getElementById("hf-map-search");
                const q = currentInp ? currentInp.value.trim() : "";
                if (!q) return;
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ru`)
                    .then((r) => r.json())
                    .then((data) => {
                        if (!data || !data[0]) return;
                        const la = parseFloat(data[0].lat);
                        const lo = parseFloat(data[0].lon);
                        hfPickMap.setView([la, lo], 13);
                        if (hfPickMarker) hfPickMarker.setLatLng([la, lo]);
                        else {
                            hfPickMarker = window.L.marker([la, lo], { draggable: true }).addTo(hfPickMap);
                            hfPickMarker.on("dragend", () => {
                                const pos = hfPickMarker.getLatLng();
                                const li = document.getElementById("hf-lat");
                                const lo2 = document.getElementById("hf-lng");
                                if (li) li.value = pos.lat.toFixed(6);
                                if (lo2) lo2.value = pos.lng.toFixed(6);
                                saveCurrentHotelData();
                            });
                        }
                        const li = document.getElementById("hf-lat");
                        const lng2 = document.getElementById("hf-lng");
                        if (li) li.value = la.toFixed(6);
                        if (lng2) lng2.value = lo.toFixed(6);
                        saveCurrentHotelData();
                    }).catch(() => {});
            };
            const nb = searchBtn.cloneNode(true);
            searchBtn.parentNode.replaceChild(nb, searchBtn);
            nb.addEventListener("click", doSearch);
            
            const ni = searchInp.cloneNode(true);
            searchInp.parentNode.replaceChild(ni, searchInp);
            ni.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    doSearch();
                }
            });
        }
    });
};
const renderAddModal = () => {
    if (!addModalOpen) return "";
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    
    // For Tour Form
    let t = null;
    if (editTourId) t = getTours().find((x) => x.id === editTourId);
    const isEdit = !!t;
    const cl = formContentLang;
    const buf = window._vacFormBuffer || {};

    const fName = (buf.name?.[cl] ?? (isEdit ? ml(t.name, cl) : "")) || "";
    const fCountry = (buf.country?.[cl] ?? (isEdit ? ml(t.country, cl) : "")) || "";
    const fCity = (buf.city?.[cl] ?? (isEdit ? ml(t.city, cl) : "")) || "";
    const fDesc = (buf.desc?.[cl] ?? (isEdit ? ml(t.description, cl) : "")) || "";
    const fIncRaw = buf.inc?.[cl] ?? (isEdit ? ml(t.included, cl) : []);
    const fIncStr = Array.isArray(fIncRaw) ? fIncRaw.join("\n") : fIncRaw || "";
    
    const coverSrc = formCoverDataUrl || (isEdit ? t.coverImage : null);
    const galleryPreviews = formGalleryImages.length ? formGalleryImages : isEdit && t.images ? t.images.map((u) => ({ dataUrl: u, isFile: false })) : [];

    return `
    <div class="vac-overlay" id="vac-add-overlay">
        <div class="vac-add-modal" id="vac-add-modal">
            <div class="vac-add-modal-header">
                    <div class="vac-modal-header-tabs" style="margin-right: auto; margin-left: 20px;">
                        <button class="vac-modal-header-tab ${activeModalTab === 'tour' ? 'active' : ''}" id="vac-tab-tour-btn">${tr.tab_tour}</button>
                        <button class="vac-modal-header-tab ${activeModalTab === 'hotel' ? 'active' : ''}" id="vac-tab-hotel-btn">${tr.tab_hotel}</button>
                    </div>
                <button class="vac-modal-close" id="vac-add-close">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>

            <div class="vac-add-modal-body" style="padding: 0; display: block;">
                <!-- ================= TOUR FORM ================= -->
                <div id="vac-form-tour-container" style="display: ${activeModalTab === 'tour' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; width: 100%;">
                    <!-- LEFT: FORM -->
                    <div class="vac-form-col">
                        <div class="vac-lang-tabs" id="vac-lang-tabs">
                            <span class="vac-lang-tabs-label">${tr.content_lang}:</span>
                            ${["uz", "ru", "en"].map(l => `
                                <button class="vac-lang-tab ${cl === l ? "active" : ""}" data-lang="${l}">${tr["tab_" + l]}</button>
                            `).join("")}
                        </div>
                        <div class="vac-form-row-2">
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_name} *</label>
                                <input type="text" id="vf-name" class="vac-input" placeholder="${tr.ph_name}" value="${esc(fName)}"/>
                            </div>
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_category}</label>
                                <select id="vf-category" class="vac-input vac-select">
                                    ${["beach", "mountain", "city", "nature"].map(c => `
                                        <option value="${c}" ${(t?.category || "beach") === c ? "selected" : ""}>${tr[c] || c}</option>
                                    `).join("")}
                                </select>
                            </div>
                        </div>
                        <div class="vac-form-row-2">
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_country} *</label>
                                <input type="text" id="vf-country" class="vac-input" placeholder="${tr.ph_country}" value="${esc(fCountry)}"/>
                            </div>
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_city}</label>
                                <input type="text" id="vf-city" class="vac-input" placeholder="${tr.ph_city}" value="${esc(fCity)}"/>
                            </div>
                        </div>
                        <div class="vac-form-row-3">
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_price} *</label>
                                <div class="vac-input-prefix-wrap">
                                    <span class="vac-input-prefix">$</span>
                                    <input type="number" id="vf-price" class="vac-input vac-input--prefix" placeholder="${tr.ph_price}" value="${t?.price || ""}"/>
                                </div>
                            </div>
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_duration_days}</label>
                                <input type="number" id="vf-days" class="vac-input" min="1" max="90" value="${t?.days || 7}"/>
                            </div>
                            <div class="vac-form-group">
                                <label class="vac-label">${tr.field_duration_nights}</label>
                                <input type="number" id="vf-nights" class="vac-input" min="1" max="90" value="${t?.nights || 6}"/>
                            </div>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.field_rating}</label>
                            <div class="vac-rating-input">
                                ${[1, 2, 3, 4, 5].map(n => `
                                    <button type="button" class="vac-rating-star ${Math.round(t?.rating || 5) >= n ? "active" : ""}" data-val="${n}">★</button>
                                `).join("")}
                                <span class="vac-rating-val" id="vac-rating-val">${Math.round(t?.rating || 5)}</span>
                            </div>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.field_description}</label>
                            <textarea id="vf-desc" class="vac-input vac-textarea" rows="3" placeholder="${tr.ph_desc}">${esc(fDesc)}</textarea>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.field_included}</label>
                            <textarea id="vf-included" class="vac-input vac-textarea" rows="3" placeholder="${tr.ph_included}">${esc(fIncStr)}</textarea>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">Sanalar (Qachondan - Qachongacha)</label>
                            <div id="vac-dates-list" class="vac-dates-list">
                                ${formDates.map((d, i) => `
                                <div class="vac-date-row" data-idx="${i}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                                    <input type="date" class="vac-input vac-date-input" value="${d.start ? new Date(d.start).toISOString().substring(0,10) : ''}" data-field="start" data-idx="${i}"/>
                                    <span style="color:#8a99af">-</span>
                                    <input type="date" class="vac-input vac-date-input" value="${d.end ? new Date(d.end).toISOString().substring(0,10) : ''}" data-field="end" data-idx="${i}"/>
                                    <button type="button" class="vac-btn-icon vac-date-remove" data-idx="${i}" style="width:32px; height:32px; border-radius:4px; border:1px solid #e2e8f0; background:#fff; color:#ef4444; cursor:pointer;">✕</button>
                                </div>
                                `).join("")}
                            </div>
                            <button type="button" class="vac-btn-secondary vac-date-add" id="vac-date-add" style="margin-top: 8px; font-size: 12px; padding: 6px 12px;">+ Sana qo'shish</button>
                        </div>
                    </div>
                    <!-- RIGHT: IMAGES + MAP -->
                    <div class="vac-form-col vac-form-col--right">
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.cover_photo}</label>
                            <div class="vac-cover-upload" id="vac-cover-zone">
                                ${coverSrc ? `
                                    <div class="vac-cover-preview">
                                        <img src="${esc(coverSrc)}" class="vac-cover-img" id="vac-cover-img"/>
                                        <button type="button" class="vac-img-remove" id="vac-cover-remove">✕</button>
                                    </div>
                                ` : `
                                    <div class="vac-upload-placeholder" id="vac-cover-placeholder">
                                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#c0c7d4" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#c0c7d4"/><path d="M21 15l-5-5L5 21" stroke="#c0c7d4" stroke-width="1.5" stroke-linecap="round"/></svg>
                                        <span>${tr.add_cover}</span>
                                    </div>
                                `}
                                <input type="file" id="vac-cover-input" accept="image/*" style="display:none"/>
                            </div>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.gallery_photos}</label>
                            <div class="vac-gallery-grid" id="vac-gallery-grid">
                                ${galleryPreviews.map((img, i) => `
                                    <div class="vac-gallery-item" data-idx="${i}">
                                        <img src="${esc(img.dataUrl)}" class="vac-gallery-thumb" onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=200&q=60'"/>
                                        <button type="button" class="vac-img-remove vac-gallery-remove" data-idx="${i}">✕</button>
                                    </div>
                                `).join("")}
                                <label class="vac-gallery-add-btn" for="vac-gallery-input">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#5b6ef5" stroke-width="2.5" stroke-linecap="round"/></svg>
                                </label>
                                <input type="file" id="vac-gallery-input" accept="image/*" multiple style="display:none"/>
                            </div>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.location_title}</label>
                            <div class="vac-pick-map-search">
                                <input type="text" id="vac-map-search" class="vac-input" placeholder="${tr.search_loc}"/>
                                <button type="button" id="vac-map-search-btn" class="vac-map-search-btn">${tr.map_search}</button>
                            </div>
                            <div class="vac-pick-map" id="vac-pick-map"></div>
                            <div class="vac-form-row-2" style="margin-top:8px">
                                <div class="vac-form-group" style="margin-bottom:0">
                                    <label class="vac-label" style="font-size:10px">${tr.field_lat}</label>
                                    <input type="number" step="0.0001" id="vf-lat" class="vac-input" placeholder="41.2995" value="${t?.lat || ""}"/>
                                </div>
                                <div class="vac-form-group" style="margin-bottom:0">
                                    <label class="vac-label" style="font-size:10px">${tr.field_lng}</label>
                                    <input type="number" step="0.0001" id="vf-lng" class="vac-input" placeholder="69.2401" value="${t?.lng || ""}"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ================= HOTEL FORM (MULTI-HOTEL SIDEBAR) ================= -->
                <div id="vac-form-hotel-container" class="questions-editor-layout vac-hotel-layout" style="display: ${activeModalTab === 'hotel' ? 'flex' : 'none'};">
                    <!-- SIDEBAR -->
                    <div class="qe-sidebar vac-hotel-sidebar">
                        <span class="qe-sidebar-title">MEHMONXONALAR RO'YXATI</span>
                        <div class="qe-list" id="vac-hotel-list">
                            ${renderHotelSidebarList()}
                        </div>
                        <button type="button" class="add-new-q-btn" id="vac-add-hotel-btn">+ Yangi mehmonxona</button>
                    </div>
                    <!-- MAIN EDITOR -->
                    <div class="qe-main vac-hotel-main">
                        <div id="vac-hotel-editor-wrap">
                            ${renderHotelEditorContent()}
                        </div>
                    </div>
                </div>

            </div>

            <div class="vac-add-modal-footer">
                <button class="vac-btn-secondary" id="vac-form-cancel">${tr.cancel}</button>
                <button class="vac-btn-primary" id="vac-form-save">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${tr.save}
                </button>
            </div>
        </div>
    </div>`;
};

const renderDatesListUI = () => {
    const list = document.getElementById("vac-dates-list");
    if (!list) return;
    list.innerHTML = formDates.map((d, i) => `
        <div class="vac-date-row" data-idx="${i}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
            <input type="date" class="vac-input vac-date-input" value="${d.start ? new Date(d.start).toISOString().substring(0,10) : ''}" data-field="start" data-idx="${i}"/>
            <span style="color:#8a99af">-</span>
            <input type="date" class="vac-input vac-date-input" value="${d.end ? new Date(d.end).toISOString().substring(0,10) : ''}" data-field="end" data-idx="${i}"/>
            <button type="button" class="vac-btn-icon vac-date-remove" data-idx="${i}" style="width:32px; height:32px; border-radius:4px; border:1px solid #e2e8f0; background:#fff; color:#ef4444; cursor:pointer;">✕</button>
        </div>
    `).join("");

    list.querySelectorAll(".vac-date-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            formDates.splice(parseInt(btn.dataset.idx), 1);
            renderDatesListUI();
        });
    });
    list.querySelectorAll(".vac-date-input").forEach(inp => {
        inp.addEventListener("change", (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            if (formDates[idx]) {
                formDates[idx][field] = e.target.value;
            }
        });
    });
};

// ─── EVENTS ───────────────────────────────────
const attachRootEvents = () => {
    $v("vac-add-btn")?.addEventListener("click", () => {
        editTourId = null;
        addModalOpen = true;
        activeModalTab = "tour";
        formCoverDataUrl = null;
        formGalleryImages = [];
        formContentLang = "uz";
        formDates = [];
        // INIT MULTI-HOTEL STATE
        modalHotels = [getEmptyHotel()];
        activeHotelIndex = 0;
        
        autosave();
        renderRoot();
        setTimeout(() => initPickMap(), 120);
    });
    $v("vac-search")?.addEventListener("input", (e) => {
        vacSearch = e.target.value;
        refreshGrid();
    });
    document.querySelectorAll(".vac-filter-btn").forEach((b) =>
        b.addEventListener("click", () => {
            vacFilter = b.dataset.filter;
            renderRoot();
        }),
    );

    // Cards
    document.querySelectorAll(".vac-card").forEach((card) => {
        card.addEventListener("click", (e) => {
            if (e.target.closest(".vac-edit-btn") || e.target.closest(".vac-del-btn")) return;
            carouselIdx = 0;
            detailTourId = card.dataset.id;
            autosave();
            renderRoot();
        });
    });
    document.querySelectorAll(".vac-details-btn").forEach((b) =>
        b.addEventListener("click", (e) => {
            e.stopPropagation();
            carouselIdx = 0;
            detailTourId = b.dataset.id;
            autosave();
            renderRoot();
        }),
    );
    document.querySelectorAll(".vac-edit-btn").forEach((b) =>
        b.addEventListener("click", (e) => {
            e.stopPropagation();
            editTourId = b.dataset.id;
            addModalOpen = true;
            const t = getTours().find((x) => x.id === b.dataset.id) || {};
            activeModalTab = t.category === "hotel" ? "hotel" : "tour";
            formCoverDataUrl = t.coverImage || null;
            formGalleryImages = (t.images || []).map((u) => ({ dataUrl: u, isFile: false }));
            formContentLang = "uz";
            formDates = t.dates ? JSON.parse(JSON.stringify(t.dates)) : [];
            
            // If it's a hotel, load it into modalHotels
            if (activeModalTab === "hotel") {
                modalHotels = [{
                    id: t.id,
                    name: JSON.parse(JSON.stringify(t.name || {})),
                    country: JSON.parse(JSON.stringify(t.country || {})),
                    city: JSON.parse(JSON.stringify(t.city || {})),
                    description: JSON.parse(JSON.stringify(t.description || {})),
                    rating: t.rating || 5,
                    included: JSON.parse(JSON.stringify(t.included || {})),
                    coverImage: t.coverImage || null,
                    images: [...(t.images || [])],
                    lat: t.lat || null,
                    lng: t.lng || null
                }];
                activeHotelIndex = 0;
            } else {
                modalHotels = [getEmptyHotel()];
                activeHotelIndex = 0;
            }

            autosave();
            renderRoot();
            
            if (activeModalTab === "tour") {
                setTimeout(() => initPickMap(editTourId), 120);
            } else {
                setTimeout(() => updateHotelView(), 120);
            }
        }),
    );
    document.querySelectorAll(".vac-del-btn").forEach((b) =>
        b.addEventListener("click", (e) => {
            e.stopPropagation();
            openDeleteModal(b.dataset.id, async () => {
                try {
                    const res = await fetch(`${API_URL}/api/vacations/${b.dataset.id}`, {
                        method: "DELETE",
                        headers: getAuthHeaders(),
                        credentials: "include"
                    });
                    if (res.ok) {
                        toursData = toursData.filter((t) => t.id !== b.dataset.id);
                        refreshGrid();
                    }
                } catch (e) { console.error(e); }
            });
        }),
    );

    // Add modal close
    $v("vac-add-close")?.addEventListener("click", closeAddModal);
    $v("vac-add-overlay")?.addEventListener("click", (e) => {
        if (e.target === $v("vac-add-overlay")) closeAddModal();
    });
    $v("vac-form-cancel")?.addEventListener("click", closeAddModal);
    $v("vac-form-save")?.addEventListener("click", saveTourForm);

    // Tab buttons switching
    $v("vac-tab-tour-btn")?.addEventListener("click", () => {
        if (activeModalTab === "tour") return;
        saveLangTabValues();
        activeModalTab = "tour";
        autosave();
        updateModalTabsAndBody();
    });
    $v("vac-tab-hotel-btn")?.addEventListener("click", () => {
        if (activeModalTab === "hotel") return;
        saveLangTabValues();
        activeModalTab = "hotel";
        autosave();
        updateModalTabsAndBody();
    });

    // Attach initial body events if modal is open
    if (addModalOpen) {
        attachModalBodyEvents();
    }
};

const updateModalTabsAndBody = () => {
    const tabTour = document.getElementById("vac-tab-tour-btn");
    const tabHotel = document.getElementById("vac-tab-hotel-btn");
    if (tabTour) tabTour.classList.toggle("active", activeModalTab === "tour");
    if (tabHotel) tabHotel.classList.toggle("active", activeModalTab === "hotel");

    const tContainer = document.getElementById("vac-form-tour-container");
    const hContainer = document.getElementById("vac-form-hotel-container");
    if(tContainer) tContainer.style.display = activeModalTab === "tour" ? "grid" : "none";
    if(hContainer) hContainer.style.display = activeModalTab === "hotel" ? "flex" : "none";
    
    const modal = document.getElementById("vac-add-modal");
    if(modal) {
        // widths are handled by CSS now
    }

    if (activeModalTab === "hotel") {
        updateHotelView();
    } else {
        initPickMap(editTourId || null);
    }
};

const attachModalBodyEvents = () => {
    // Lang tabs — update only modal body, NOT full renderRoot (prevents flash)
    document.querySelectorAll(".vac-lang-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            saveLangTabValues();
            formContentLang = tab.dataset.lang;
            // save autosave before partial re-render
            autosave();
            // Update only the modal body — no full page re-render
            const modalBody = document.querySelector(".vac-add-modal-body");
            if (!modalBody) return;
            // re-build only left column content (lang-sensitive fields)
            const tr = vacTranslations[getCurrentLang()] || vacTranslations.uz;
            const cl = formContentLang;
            let t2 = editTourId ? getTours().find((x) => x.id === editTourId) : null;
            const buf = window._vacFormBuffer || {};
            const fName = buf.name?.[cl] || (t2 ? ml(t2.name, cl) || "" : "");
            const fCountry = buf.country?.[cl] || (t2 ? ml(t2.country, cl) || "" : "");
            const fCity = buf.city?.[cl] || (t2 ? ml(t2.city, cl) || "" : "");
            const fDesc = buf.desc?.[cl] || (t2 ? ml(t2.description, cl) || "" : "");
            const fIncArr = buf.inc?.[cl] || (t2 ? ml(t2.included, cl) || [] : []);
            const fIncStr = Array.isArray(fIncArr) ? fIncArr.join("\n") : fIncArr || "";
            // Update lang tabs highlight
            document.querySelectorAll(".vac-lang-tab").forEach((t) => t.classList.toggle("active", t.dataset.lang === cl));
            // Update text fields
            if ($v("vf-name")) $v("vf-name").value = fName;
            if ($v("vf-country")) $v("vf-country").value = fCountry;
            if ($v("vf-city")) $v("vf-city").value = fCity;
            if ($v("vf-desc")) $v("vf-desc").value = fDesc;
            
            if (activeModalTab === "hotel") {
                document.querySelectorAll(".vac-amenity-checkbox").forEach(cb => {
                    const isChecked = fIncArr.includes(cb.value);
                    cb.checked = isChecked;
                    cb.closest(".vac-amenity-card")?.classList.toggle("active", isChecked);
                });
            } else {
                if ($v("vf-included")) $v("vf-included").value = fIncStr;
            }
        });
    });

    // Rating stars
    document.querySelectorAll(".vac-rating-star").forEach((s) => {
        s.addEventListener("click", () => {
            const v = parseFloat(s.dataset.val);
            document.querySelectorAll(".vac-rating-star").forEach((x, i) => x.classList.toggle("active", i < v));
            const rv = $v("vac-rating-val");
            if (rv) rv.textContent = v;
            autosave();
        });
    });

    // Autosave on any input change in form
    ["vf-name", "vf-country", "vf-city", "vf-price", "vf-days", "vf-nights", "vf-desc", "vf-included", "vf-lat", "vf-lng", "vf-category", "vf-rating-select"].forEach((id) => {
        $v(id)?.addEventListener("input", autosave);
        $v(id)?.addEventListener("change", autosave);
    });

    // Cover upload
    const coverZone = $v("vac-cover-zone");
    if (coverZone) {
        coverZone.addEventListener("click", (e) => {
            if (e.target.closest(".vac-img-remove")) return;
            $v("vac-cover-input")?.click();
        });
        $v("vac-cover-input")?.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = (ev) => {
                formCoverDataUrl = ev.target.result;
                rerenderImgArea();
            };
            r.readAsDataURL(file);
            e.target.value = "";
        });
        $v("vac-cover-remove")?.addEventListener("click", (e) => {
            e.stopPropagation();
            formCoverDataUrl = null;
            rerenderImgArea();
        });
    }

    // Gallery upload
    $v("vac-gallery-input")?.addEventListener("change", (e) => {
        Array.from(e.target.files).forEach((file) => {
            const r = new FileReader();
            r.onload = (ev) => {
                formGalleryImages.push({ dataUrl: ev.target.result, isFile: true });
                rerenderImgArea();
            };
            r.readAsDataURL(file);
        });
        e.target.value = "";
    });
    document.querySelectorAll(".vac-gallery-remove").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            formGalleryImages.splice(parseInt(btn.dataset.idx), 1);
            rerenderImgArea();
        });
    });

    // Map
    $v("vf-lat")?.addEventListener("change", updateMarkerFromInputs);
    $v("vf-lng")?.addEventListener("change", updateMarkerFromInputs);

    // Dates
    $v("vac-date-add")?.addEventListener("click", () => {
        formDates.push({ start: "", end: "" });
        renderDatesListUI();
    });
    const initialDatesList = $v("vac-dates-list");
    if (initialDatesList) {
        initialDatesList.querySelectorAll(".vac-date-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                formDates.splice(parseInt(btn.dataset.idx), 1);
                renderDatesListUI();
            });
        });
        initialDatesList.querySelectorAll(".vac-date-input").forEach(inp => {
            inp.addEventListener("change", (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                if (formDates[idx]) {
                    formDates[idx][field] = e.target.value;
                }
            });
        });
    }

    // Hotel amenities card click toggle
    document.querySelectorAll(".vac-amenity-checkbox").forEach(cb => {
        cb.addEventListener("change", () => {
            cb.closest(".vac-amenity-card")?.classList.toggle("active", cb.checked);
            autosave();
        });
    });
};

// Save current lang-tab values before switching tab
const saveLangTabValues = () => {
    if (!addModalOpen) return;
    const cl = formContentLang;
    const name = $v("vf-name")?.value.trim() || "";
    const country = $v("vf-country")?.value.trim() || "";
    const city = $v("vf-city")?.value.trim() || "";
    const desc = $v("vf-desc")?.value.trim() || "";
    let inc = [];
    if (activeModalTab === "hotel") {
        document.querySelectorAll(".vac-amenity-checkbox:checked").forEach(cb => {
            inc.push(cb.value);
        });
    } else {
        inc = ($v("vf-included")?.value || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    // store in a temporary state object
    if (!window._vacFormBuffer) window._vacFormBuffer = { name: {}, country: {}, city: {}, desc: {}, inc: {} };
    window._vacFormBuffer.name[cl] = name;
    window._vacFormBuffer.country[cl] = country;
    window._vacFormBuffer.city[cl] = city;
    window._vacFormBuffer.desc[cl] = desc;
    window._vacFormBuffer.inc[cl] = inc;
};

const rerenderImgArea = () => {
    const tr = vacTranslations[getCurrentLang()] || vacTranslations.uz;
    // re-render cover
    const coverZone = $v("vac-cover-zone");
    if (coverZone) {
        if (formCoverDataUrl) {
            coverZone.innerHTML = `
            <div class="vac-cover-preview">
                <img src="${esc(formCoverDataUrl)}" class="vac-cover-img" id="vac-cover-img"/>
                <button type="button" class="vac-img-remove" id="vac-cover-remove">✕</button>
            </div>
            <input type="file" id="vac-cover-input" accept="image/*" style="display:none"/>`;
        } else {
            coverZone.innerHTML = `
            <div class="vac-upload-placeholder" id="vac-cover-placeholder">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#c0c7d4" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#c0c7d4"/><path d="M21 15l-5-5L5 21" stroke="#c0c7d4" stroke-width="1.5" stroke-linecap="round"/></svg>
                <span>${tr.add_cover}</span>
            </div>
            <input type="file" id="vac-cover-input" accept="image/*" style="display:none"/>`;
        }
        coverZone.querySelector("#vac-cover-input")?.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = (ev) => {
                formCoverDataUrl = ev.target.result;
                rerenderImgArea();
            };
            r.readAsDataURL(file);
            e.target.value = "";
        });
        coverZone.querySelector("#vac-cover-remove")?.addEventListener("click", (e) => {
            e.stopPropagation();
            formCoverDataUrl = null;
            rerenderImgArea();
        });
        if (!formCoverDataUrl)
            coverZone.addEventListener("click", (e) => {
                if (e.target.closest(".vac-img-remove")) return;
                coverZone.querySelector("#vac-cover-input")?.click();
            });
    }
    // re-render gallery
    const grid = $v("vac-gallery-grid");
    if (grid) {
        grid.innerHTML = `
        ${formGalleryImages
            .map(
                (img, i) => `
        <div class="vac-gallery-item" data-idx="${i}">
            <img src="${esc(img.dataUrl)}" class="vac-gallery-thumb" onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=200&q=60'"/>
            <button type="button" class="vac-img-remove vac-gallery-remove" data-idx="${i}">✕</button>
        </div>`,
            )
            .join("")}
        <label class="vac-gallery-add-btn" for="vac-gallery-input">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#5b6ef5" stroke-width="2.5" stroke-linecap="round"/></svg>
        </label>
        <input type="file" id="vac-gallery-input" accept="image/*" multiple style="display:none"/>`;
        grid.querySelector("#vac-gallery-input")?.addEventListener("change", (e) => {
            Array.from(e.target.files).forEach((file) => {
                const r = new FileReader();
                r.onload = (ev) => {
                    formGalleryImages.push({ dataUrl: ev.target.result, isFile: true });
                    rerenderImgArea();
                };
                r.readAsDataURL(file);
            });
            e.target.value = "";
        });
        grid.querySelectorAll(".vac-gallery-remove").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                formGalleryImages.splice(parseInt(btn.dataset.idx), 1);
                rerenderImgArea();
            });
        });
    }
};

const restoreFormFields = () => {
    const f = window._vacFormFields;
    if (!f) return;
    if ($v("vf-name")) $v("vf-name").value = f.name || "";
    if ($v("vf-country")) $v("vf-country").value = f.country || "";
    if ($v("vf-city")) $v("vf-city").value = f.city || "";
    if ($v("vf-price")) $v("vf-price").value = f.price || "";
    if ($v("vf-days")) $v("vf-days").value = f.days || "";
    if ($v("vf-nights")) $v("vf-nights").value = f.nights || "";
    if ($v("vf-desc")) $v("vf-desc").value = f.desc || "";
    if ($v("vf-included")) $v("vf-included").value = f.included || "";
    if ($v("vf-lat")) $v("vf-lat").value = f.lat || "";
    if ($v("vf-lng")) $v("vf-lng").value = f.lng || "";
    if ($v("vf-category")) $v("vf-category").value = f.category || "beach";
    const r = parseInt(f.rating) || 5;
    document.querySelectorAll(".vac-rating-star").forEach((s, i) => s.classList.toggle("active", i < r));
    const rv = $v("vac-rating-val");
    if (rv) rv.textContent = r;
    window._vacFormFields = null;
};

const closeAddModal = () => {
    addModalOpen = false;
    editTourId = null;
    pickMap = null;
    pickMarker = null;
    formCoverDataUrl = null;
    formGalleryImages = [];
    window._vacFormBuffer = null;
    window._vacFormFields = null;
    clearUiState();
    renderRoot();
};

const closeBookModal = () => {
    bookModalOpen = false;
    const container = document.getElementById("vac-book-modal-container");
    if (container) container.remove();
};

const updateBookModalUI = () => {
    const box = document.getElementById("vac-book-modal-box");
    if (box) {
        const scrollEl = box.querySelector(".vac-book-body");
        const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
        box.innerHTML = getBookModalHTML();
        attachBookModalEvents();
        const newScrollEl = box.querySelector(".vac-book-body");
        if (newScrollEl && scrollTop) {
            newScrollEl.scrollTop = scrollTop;
        }
    }
};

let myCards = [];

const openBookModal = async () => {
    bookModalOpen = true;
    bookGuests = 1;
    bookSelectedMethodIdx = 0;
    bookSelectedDateIdx = null;
    bookSelectedHotelId = null;
    bookSelectedRoomId = null;
    bookSelectedRoomBeds = null;
    bookSelectedRoomPrice = 0;
    bookStep = 1;

    let ol = document.getElementById("vac-book-modal-container");
    if (!ol) {
        ol = document.createElement("div");
        ol.className = "vac-overlay";
        ol.id = "vac-book-modal-container";
        const inner = document.createElement("div");
        inner.className = "vac-add-modal vac-book-modal-box vac-book-modal-large";
        inner.id = "vac-book-modal-box";
        ol.appendChild(inner);
        document.body.appendChild(ol);
    }
    
    try {
        const res = await fetch(`${API_URL}/api/payments/methods`, { headers: getAuthHeaders(), credentials: "include" });
        if (res.ok) {
            myCards = await res.json();
        }
    } catch(e) {}

    updateBookModalUI();
};

const attachBookModalEvents = () => {
    $v("vac-book-close")?.addEventListener("click", closeBookModal);

    const ol = $v("vac-book-modal-container");
    if (ol) ol.addEventListener("click", (e) => {
        if (e.target === ol) closeBookModal();
    });

    const t = getTours().find(x => x.id === detailTourId);

    if (bookStep === 1) {
        $v("vac-g-minus")?.addEventListener("click", () => {
            if (bookGuests > 1) { bookGuests--; updateBookModalUI(); }
        });
        $v("vac-g-plus")?.addEventListener("click", () => {
            if (bookGuests < 20) { bookGuests++; updateBookModalUI(); }
        });

        document.querySelectorAll('input[name="b-date"]').forEach(r => {
            r.addEventListener("change", (e) => {
                bookSelectedDateIdx = parseInt(e.target.value);
                updateBookModalUI();
            });
        });

        $v("vac-book-next-1")?.addEventListener("click", () => {
            if ((t.dates && t.dates.length > 0) && bookSelectedDateIdx === null) {
                alert("Iltimos, borish sanasini tanlang");
                return;
            }
            if (t.hotels && t.hotels.length > 0) {
                bookStep = 2;
            } else {
                bookStep = 3;
            }
            updateBookModalUI();
        });
    }

    if (bookStep === 2) {
        document.querySelectorAll(".vac-book-hotel-premium").forEach(item => {
            item.addEventListener("click", (e) => {
                // Ignore clicks directly on radio inputs to prevent double toggling if handled
                if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'radio' && e.target.name === 'b-room') return;
                
                const hid = item.dataset.hid;
                if (bookSelectedHotelId !== hid) {
                    bookSelectedHotelId = hid;
                    bookSelectedRoomId = null;
                    bookSelectedRoomBeds = null;
                    bookSelectedRoomPrice = 0;
                    updateBookModalUI();
                }
            });
        });

        document.querySelectorAll('input.vac-book-room-radio').forEach(r => {
            r.addEventListener("change", (e) => {
                bookSelectedRoomId = e.target.dataset.rid;
                bookSelectedRoomBeds = parseInt(e.target.dataset.beds);
                bookSelectedRoomPrice = parseInt(e.target.dataset.price);
                updateBookModalUI();
            });
            // Stop propagation so clicking room doesn't trigger hotel click
            r.addEventListener("click", e => e.stopPropagation());
        });

        $v("vac-book-prev-2")?.addEventListener("click", () => {
            bookStep = 1;
            updateBookModalUI();
        });
        $v("vac-book-next-2")?.addEventListener("click", () => {
            if (!bookSelectedRoomId) {
                alert(tr.select_room_msg || "Iltimos, xona tanlang");
                return;
            }
            bookStep = 3;
            updateBookModalUI();
        });
    }

    if (bookStep === 3) {
        document.querySelectorAll('input[name="b-method"]').forEach(r => {
            r.addEventListener("change", (e) => {
                bookSelectedMethodIdx = parseInt(e.target.value);
                updateBookModalUI();
            });
        });

        $v("vac-book-prev-3")?.addEventListener("click", () => {
            if (t.hotels && t.hotels.length > 0) {
                bookStep = 2;
            } else {
                bookStep = 1;
            }
            updateBookModalUI();
        });

        $v("vac-book-confirm")?.addEventListener("click", processTourPayment);
    }
};

const processTourPayment = async () => {
    const t = getTours().find(x => x.id === detailTourId);
    if (!t) return;
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    
    let totalCost = Number(t.price) * bookGuests;
    if (bookSelectedRoomPrice) {
        totalCost += Number(bookSelectedRoomPrice);
    }

    try {
        const method = myCards[bookSelectedMethodIdx];
        if (!method) return;

        if (Number(method.balance) < totalCost) {
            const btn = document.getElementById("vac-book-confirm");
            if (btn) {
                const oldHtml = btn.innerHTML;
                const oldBg = btn.style.backgroundColor;
                btn.style.backgroundColor = "#ef4444";
                btn.textContent = tr.insufficient_funds || "Mablag' yetarli emas";
                setTimeout(() => {
                    btn.style.backgroundColor = oldBg;
                    btn.innerHTML = oldHtml;
                }, 2000);
            }
            return;
        }

        let selectedDateObj = null;
        if (t.dates && t.dates[bookSelectedDateIdx]) {
            selectedDateObj = t.dates[bookSelectedDateIdx];
        }

        // Prepare hotel data
        let hotelName = '';
        let roomName = '';
        if (bookSelectedHotelId && t.hotels) {
            const sh = t.hotels.find(h => h.id === bookSelectedHotelId);
            if (sh) {
                hotelName = ml(sh.name, vacLang);
                if (bookSelectedRoomId && sh.rooms) {
                    const sr = sh.rooms.find(r => r.id === bookSelectedRoomId);
                    if (sr) roomName = ml(sr.name, vacLang);
                }
            }
        }

        // Save booking to backend API
        try {
            const res = await fetch(`${API_URL}/api/vacations/${t.id}/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                credentials: "include",
                body: JSON.stringify({
                    guests: bookGuests,
                    totalCost,
                    paymentMethod: { type: method.type, number: method.number || method.displayNumber },
                    paymentMethodId: method._id,
                    selectedDate: selectedDateObj,
                    hotelId: bookSelectedHotelId,
                    hotelName,
                    roomId: bookSelectedRoomId,
                    roomName,
                    roomBeds: bookSelectedRoomBeds,
                    roomPrice: bookSelectedRoomPrice
                })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || "Xatolik yuz berdi");
                return;
            }
        } catch (e) {
            console.error("Booking API error:", e);
            return;
        }

        bookStep = 4; // Success step
        updateBookModalUI();
        fetchCurrentUser().then(u => {
            if (u && typeof window.updateMainBalance === "function") {
                window.updateMainBalance();
            }
        });
    } catch (e) {
        console.error(e);
    }
};

// ─── DETAIL EVENTS ────────────────────────────
let mainImgIdx = 0; // current index in big main image


const attachDetailEvents = () => {
    $v("vac-detail-back")?.addEventListener("click", () => {
        detailTourId = null;
        mainImgIdx = 0;
        clearUiState();
        renderRoot();
    });

    const bd = $v("vac-detail-page");
    if (bd) {
        bd.querySelector(".vac-book-btn")?.addEventListener("click", openBookModal);
    }

    const t = getTours().find((x) => x.id === detailTourId);
    const imgs = t?.images && t.images.length ? t.images : [t?.coverImage || ""];
    const name = ml(t?.name || "", getCurrentLang());

    // Prev / Next arrows on main image
    const updateMainImg = () => {
        const imgEl = $v("vac-bk-main-img");
        const ctr = $v("vac-bk-counter");
        const prev = $v("vac-bk-prev");
        const next = $v("vac-bk-next");
        if (imgEl) imgEl.src = imgs[mainImgIdx];
        if (ctr) ctr.textContent = `${mainImgIdx + 1}/${imgs.length}`;
        if (prev) prev.disabled = mainImgIdx === 0;
        if (next) next.disabled = mainImgIdx === imgs.length - 1;
    };

    $v("vac-bk-prev")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (mainImgIdx > 0) {
            mainImgIdx--;
            updateMainImg();
        }
    });
    $v("vac-bk-next")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (mainImgIdx < imgs.length - 1) {
            mainImgIdx++;
            updateMainImg();
        }
    });

    // Zoom btn — open fullscreen at current main idx
    $v("vac-bk-zoom")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openFullGallery(imgs, mainImgIdx, name);
    });

    // Thumb clicks → set main image + open fullscreen
    document.querySelectorAll(".vac-bk-thumb").forEach((el) => {
        el.addEventListener("click", () => {
            mainImgIdx = parseInt(el.dataset.idx) || 0;
            updateMainImg();
            openFullGallery(imgs, mainImgIdx, name);
        });
    });

    // "Show all" → fullscreen from beginning
    $v("vac-bk-show-more")?.addEventListener("click", () => {
        openFullGallery(imgs, mainImgIdx, name);
    });

    // Main image click → fullscreen
    $v("vac-bk-main-img")?.addEventListener("click", () => {
        openFullGallery(imgs, mainImgIdx, name);
    });

    // Initial state
    updateMainImg();
};

// ─── FULLSCREEN GALLERY LIGHTBOX ──────────────
let galleryLightboxIdx = 0;
let galleryLightboxImgs = [];

const openFullGallery = (imgs, startIdx, title) => {
    galleryLightboxImgs = imgs;
    galleryLightboxIdx = startIdx;

    const lb = document.createElement("div");
    lb.className = "vac-fullgallery";
    lb.id = "vac-fullgallery";
    document.body.appendChild(lb);
    renderFullGallery(lb, title);

    // keyboard nav
    const keyHandler = (e) => {
        if (e.key === "Escape") {
            lb.remove();
            document.removeEventListener("keydown", keyHandler);
        }
        if (e.key === "ArrowRight") {
            galleryLightboxIdx = Math.min(galleryLightboxImgs.length - 1, galleryLightboxIdx + 1);
            renderFullGallery(lb, title);
        }
        if (e.key === "ArrowLeft") {
            galleryLightboxIdx = Math.max(0, galleryLightboxIdx - 1);
            renderFullGallery(lb, title);
        }
    };
    document.addEventListener("keydown", keyHandler);
};

const renderFullGallery = (lb, title) => {
    const imgs = galleryLightboxImgs;
    const idx = galleryLightboxIdx;
    lb.innerHTML = `
        <div class="vac-fg-header">
            <div class="vac-fg-title">${esc(title)}</div>
            <button class="vac-fg-close" id="vac-fg-close">✕</button>
        </div>
        <div class="vac-fg-main">
            <button class="vac-fg-nav prev" id="vac-fg-prev" ${idx === 0 ? "disabled" : ""}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <div class="vac-fg-img-wrap">
                <img src="${esc(imgs[idx])}" class="vac-fg-img" alt="photo ${idx + 1}"
                     onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80'"/>
                <div class="vac-fg-counter">${idx + 1} / ${imgs.length}</div>
            </div>
            <button class="vac-fg-nav next" id="vac-fg-next" ${idx === imgs.length - 1 ? "disabled" : ""}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
        </div>
        <div class="vac-fg-strip">
            ${imgs
                .map(
                    (img, i) => `
            <div class="vac-fg-strip-item ${i === idx ? "active" : ""}" data-i="${i}">
                <img src="${esc(img)}" onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=100&q=60'"/>
            </div>`,
                )
                .join("")}
        </div>
    `;

    lb.querySelector("#vac-fg-close")?.addEventListener("click", () => lb.remove());
    lb.querySelector("#vac-fg-prev")?.addEventListener("click", () => {
        if (galleryLightboxIdx > 0) {
            galleryLightboxIdx--;
            renderFullGallery(lb, title);
        }
    });
    lb.querySelector("#vac-fg-next")?.addEventListener("click", () => {
        if (galleryLightboxIdx < imgs.length - 1) {
            galleryLightboxIdx++;
            renderFullGallery(lb, title);
        }
    });
    lb.querySelectorAll(".vac-fg-strip-item").forEach((el) => {
        el.addEventListener("click", () => {
            galleryLightboxIdx = parseInt(el.dataset.i);
            renderFullGallery(lb, title);
        });
    });

    // scroll active thumb into view
    setTimeout(() => {
        const strip = lb.querySelector(".vac-fg-strip");
        const active = lb.querySelector(".vac-fg-strip-item.active");
        if (strip && active) strip.scrollLeft = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
    }, 0);
};
const refreshGrid = () => {
    const g = $v("vac-grid");
    if (!g) return;
    g.innerHTML = renderCards();
    attachGridOnlyEvents();

    const cu = getCurrentUser();
    if (cu) applyPermissions(cu.userId || cu._id);
};
const attachGridOnlyEvents = () => {
    document.querySelectorAll(".vac-card").forEach((card) => {
        card.addEventListener("click", (e) => {
            if (e.target.closest(".vac-edit-btn") || e.target.closest(".vac-del-btn")) return;
            carouselIdx = 0;
            detailTourId = card.dataset.id;
            renderRoot();
        });
    });
    document.querySelectorAll(".vac-edit-btn").forEach((b) =>
        b.addEventListener("click", (e) => {
            e.stopPropagation();
            editTourId = b.dataset.id;
            addModalOpen = true;
            const t = getTours().find((x) => x.id === b.dataset.id) || {};
            formCoverDataUrl = t.coverImage || null;
            formGalleryImages = (t.images || []).map((u) => ({ dataUrl: u, isFile: false }));
            formContentLang = "uz";
            renderRoot();
            setTimeout(() => initPickMap(editTourId || null), 120);
        }),
    );
    document.querySelectorAll(".vac-del-btn").forEach((b) =>
        b.addEventListener("click", (e) => {
            e.stopPropagation();
            openDeleteModal(b.dataset.id, async () => {
                try {
                    const res = await fetch(`${API_URL}/api/vacations/${b.dataset.id}`, {
                        method: "DELETE",
                        headers: getAuthHeaders(),
                        credentials: "include"
                    });
                    if (res.ok) {
                        toursData = toursData.filter((t) => t.id !== b.dataset.id);
                        refreshGrid();
                    }
                } catch (e) { console.error(e); }
            });
        }),
    );
};

// ─── SAVE FORM ────────────────────────────────
const saveTourForm = async () => {
    // Flush both tabs' active inputs
    saveLangTabValues();
    if (activeModalTab === "hotel") {
        saveCurrentHotelData();
    }

    const buf = window._vacFormBuffer || {};
    const cl = formContentLang;

    if (!buf.name) buf.name = {};
    if (!buf.country) buf.country = {};
    if (!buf.city) buf.city = {};
    if (!buf.desc) buf.desc = {};
    if (!buf.inc) buf.inc = {};

    buf.name[cl] = document.getElementById("vf-name")?.value.trim() || buf.name[cl] || "";
    buf.country[cl] = document.getElementById("vf-country")?.value.trim() || buf.country[cl] || "";
    buf.city[cl] = document.getElementById("vf-city")?.value.trim() || buf.city[cl] || "";
    buf.desc[cl] = document.getElementById("vf-desc")?.value.trim() || buf.desc[cl] || "";
    
    let selectedInc = (document.getElementById("vf-included")?.value || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    buf.inc[cl] = selectedInc;

    if (!Object.values(buf.name).some(Boolean)) {
        // Switch back to tour tab to show error
        activeModalTab = "tour";
        updateHotelView();
        document.getElementById("vf-name")?.focus();
        return;
    }
    if (!Object.values(buf.country).some(Boolean)) {
        activeModalTab = "tour";
        updateHotelView();
        document.getElementById("vf-country")?.focus();
        return;
    }

    const ratingStars = document.querySelectorAll(".vac-rating-star.active");
    const rating = ratingStars.length || 5;

    const oldTour = editTourId ? getTours().find((t) => t.id === editTourId) : null;
    const coverImage = formCoverDataUrl || oldTour?.coverImage || formGalleryImages[0]?.dataUrl || null;
    const images = formGalleryImages.map((x) => x.dataUrl);

    const mergeLang = (bufObj, oldObj) => {
        const langs = ["uz", "ru", "en"];
        const result = {};
        langs.forEach((l) => {
            result[l] = bufObj?.[l] || (typeof oldObj === "object" ? oldObj?.[l] : "") || "";
        });
        return result;
    };
    const mergeIncLang = (bufObj, oldObj) => {
        const langs = ["uz", "ru", "en"];
        const result = {};
        langs.forEach((l) => {
            const fromBuf = bufObj?.[l];
            const fromOld = typeof oldObj === "object" ? oldObj?.[l] : null;
            result[l] = Array.isArray(fromBuf) && fromBuf.length ? fromBuf : Array.isArray(fromOld) && fromOld.length ? fromOld : [];
        });
        return result;
    };

    // Filter valid hotels
    const validHotels = modalHotels.filter(h => {
        const hasName = h.name.uz || h.name.ru || h.name.en;
        const hasCountry = h.country.uz || h.country.ru || h.country.en;
        return hasName && hasCountry;
    }).map(h => {
        const newH = { ...h };
        if (newH.id && newH.id.startsWith("temp_")) {
            delete newH.id;
        }
        if (newH.rooms) {
            newH.rooms = newH.rooms.map(r => {
                const newR = { ...r };
                if (newR.id && newR.id.startsWith("room_")) delete newR.id;
                return newR;
            });
        }
        return newH;
    });

    const tour = {
        name: mergeLang(buf.name, oldTour?.name),
        country: mergeLang(buf.country, oldTour?.country),
        city: mergeLang(buf.city, oldTour?.city),
        description: mergeLang(buf.desc, oldTour?.description),
        included: mergeIncLang(buf.inc, oldTour?.included),
        category: document.getElementById("vf-category")?.value || "beach",
        price: parseFloat(document.getElementById("vf-price")?.value || 0) || 0,
        days: parseInt(document.getElementById("vf-days")?.value || 7) || 7,
        nights: parseInt(document.getElementById("vf-nights")?.value || 6) || 6,
        rating,
        coverImage,
        images: images.length ? images : oldTour?.images || [],
        lat: parseFloat(document.getElementById("vf-lat")?.value) || null,
        lng: parseFloat(document.getElementById("vf-lng")?.value) || null,
        dates: formDates.filter(d => d.start && d.end),
        hotels: validHotels
    };


    const saveBtn = document.getElementById("vac-form-save");
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    if (saveBtn) {
        saveBtn.innerHTML = '<div class="vac-spinner" style="width:14px;height:14px;border-width:2px;"></div> Saqlanmoqda...';
        saveBtn.disabled = true;
    }

    try {
        const url = editTourId ? `${API_URL}/api/vacations/${editTourId}` : `${API_URL}/api/vacations`;
        const method = editTourId ? "PUT" : "POST";
        const res = await fetch(url, {
            method,
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(tour),
            credentials: "include",
        });
        const json = await res.json();
        if (json.success) {
            addModalOpen = false;
            fetchToursAPI().then(() => {
                if (document.getElementById("vac-grid")) {
                    renderRoot();
                } else {
                    refreshGrid();
                }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = '<svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + tr.save;
            saveBtn.disabled = false;
        }
    }
};

const loadLeaflet = (cb) => {
    if (window.L) {
        cb();
        return;
    }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = cb;
    document.head.appendChild(js);
};

const initPickMap = (editId) => {
    const el = $v("vac-pick-map");
    if (!el) return;
    if (pickMap) {
        try {
            pickMap.remove();
        } catch (e) {}
        pickMap = null;
        pickMarker = null;
    }
    el.innerHTML = "";

    let lat = 41.2995,
        lng = 69.2401,
        zoom = 5;
    const existLat = parseFloat($v("vf-lat")?.value);
    const existLng = parseFloat($v("vf-lng")?.value);
    if (!isNaN(existLat) && !isNaN(existLng)) {
        lat = existLat;
        lng = existLng;
        zoom = 11;
    } else if (editId) {
        const t = getTours().find((x) => x.id === editId);
        if (t?.lat && t?.lng) {
            lat = t.lat;
            lng = t.lng;
            zoom = 11;
        }
    }

    loadLeaflet(() => {
        pickMap = window.L.map(el, { zoomControl: true }).setView([lat, lng], zoom);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
            maxZoom: 19,
        }).addTo(pickMap);

        if (zoom > 5) {
            pickMarker = window.L.marker([lat, lng], { draggable: true }).addTo(pickMap);
            pickMarker.on("dragend", () => {
                const pos = pickMarker.getLatLng();
                const li = $v("vf-lat"),
                    lo = $v("vf-lng");
                if (li) li.value = pos.lat.toFixed(6);
                if (lo) lo.value = pos.lng.toFixed(6);
                autosave();
            });
        }

        pickMap.on("click", (e) => {
            const { lat: la, lng: lo } = e.latlng;
            if (pickMarker) pickMarker.setLatLng([la, lo]);
            else {
                pickMarker = window.L.marker([la, lo], { draggable: true }).addTo(pickMap);
                pickMarker.on("dragend", () => {
                    const pos = pickMarker.getLatLng();
                    const li = $v("vf-lat"),
                        lo2 = $v("vf-lng");
                    if (li) li.value = pos.lat.toFixed(6);
                    if (lo2) lo2.value = pos.lng.toFixed(6);
                    autosave();
                });
            }
            const li = $v("vf-lat"),
                lo2 = $v("vf-lng");
            if (li) li.value = la.toFixed(6);
            if (lo2) lo2.value = lo.toFixed(6);
            autosave();
        });

        // Attach search events after map is ready
        const searchBtn = $v("vac-map-search-btn");
        const searchInp = $v("vac-map-search");
        if (searchBtn) {
            const nb = searchBtn.cloneNode(true);
            searchBtn.parentNode.replaceChild(nb, searchBtn);
            nb.addEventListener("click", doMapSearch);
        }
        if (searchInp) {
            const ni = searchInp.cloneNode(true);
            searchInp.parentNode.replaceChild(ni, searchInp);
            ni.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    doMapSearch();
                }
            });
        }
    });
};

const updateMarkerFromInputs = () => {
    const lat = parseFloat($v("vf-lat")?.value),
        lng = parseFloat($v("vf-lng")?.value);
    if (!isNaN(lat) && !isNaN(lng) && pickMap && window.L) {
        if (pickMarker) pickMarker.setLatLng([lat, lng]);
        else pickMarker = window.L.marker([lat, lng], { draggable: true }).addTo(pickMap);
        pickMap.panTo([lat, lng]);
    }
};

const doMapSearch = () => {
    const inp = document.querySelector("#vac-map-search");
    const q = (inp?.value || "").trim();
    if (!q) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=ru`)
        .then((r) => r.json())
        .then((data) => {
            if (!data || !data[0]) return;
            const la = parseFloat(data[0].lat),
                lo = parseFloat(data[0].lon);
            if (!pickMap || !window.L) return;
            pickMap.setView([la, lo], 13);
            if (pickMarker) pickMarker.setLatLng([la, lo]);
            else {
                pickMarker = window.L.marker([la, lo], { draggable: true }).addTo(pickMap);
                pickMarker.on("dragend", () => {
                    const pos = pickMarker.getLatLng();
                    const li = $v("vf-lat"),
                        lo2 = $v("vf-lng");
                    if (li) li.value = pos.lat.toFixed(6);
                    if (lo2) lo2.value = pos.lng.toFixed(6);
                });
            }
            const li = $v("vf-lat"),
                lng2 = $v("vf-lng");
            if (li) li.value = la.toFixed(6);
            if (lng2) lng2.value = lo.toFixed(6);
            autosave();
        })
        .catch(() => {});
};

// ─── UI STATE PERSISTENCE (refresh ga chidamli) ───
const VAC_STATE_KEY = "vac_ui_state";

const saveUiState = () => {
    const state = {
        detailTourId,
        addModalOpen,
        editTourId,
        formContentLang,
        formCoverDataUrl,
        formGalleryImages,
        vacFilter,
        vacSearch,
        activeModalTab,
        formBuffer: window._vacFormBuffer || null,
        // save current form field values too
        formFields: addModalOpen
            ? {
                  name: $v("vf-name")?.value || "",
                  country: $v("vf-country")?.value || "",
                  city: $v("vf-city")?.value || "",
                  price: $v("vf-price")?.value || "",
                  days: $v("vf-days")?.value || "",
                  nights: $v("vf-nights")?.value || "",
                  desc: $v("vf-desc")?.value || "",
                  included: $v("vf-included")?.value || "",
                  lat: $v("vf-lat")?.value || "",
                  lng: $v("vf-lng")?.value || "",
                  category: $v("vf-category")?.value || "",
                  rating: document.querySelectorAll(".vac-rating-star.active").length || 5,
              }
            : null,
    };
    try {
        localStorage.setItem(VAC_STATE_KEY, JSON.stringify(state));
    } catch (e) {}
};

const loadUiState = () => {
    try {
        const raw = localStorage.getItem(VAC_STATE_KEY);
        if (!raw) return false;
        const s = JSON.parse(raw);
        detailTourId = s.detailTourId || null;
        addModalOpen = s.addModalOpen || false;
        editTourId = s.editTourId || null;
        formContentLang = s.formContentLang || "uz";
        formCoverDataUrl = s.formCoverDataUrl || null;
        formGalleryImages = s.formGalleryImages || [];
        vacFilter = s.vacFilter || "all";
        vacSearch = s.vacSearch || "";
        activeModalTab = s.activeModalTab || "tour";
        window._vacFormBuffer = s.formBuffer || null;
        window._vacFormFields = s.formFields || null;
        return true;
    } catch (e) {
        return false;
    }
};

const clearUiState = () => {
    localStorage.removeItem(VAC_STATE_KEY);
};

// Auto-save state every time something changes
const autosave = () => saveUiState();

// ─── INIT ─────────────────────────────────────
export const initVacationsLogic = async () => {
    await fetchToursAPI();
    const cu = getCurrentUser();
    const vacLang = getCurrentLang();
    // Restore UI state from before refresh
    const restored = loadUiState();
    if (!restored) {
        vacSearch = "";
        vacFilter = "all";
        detailTourId = null;
        editTourId = null;
        addModalOpen = false;
        activeModalTab = "tour";
        formCoverDataUrl = null;
        formGalleryImages = [];
        formContentLang = "uz";
        window._vacFormBuffer = null;
    }
    mainImgIdx = 0;
    pickMap = null;
    pickMarker = null;
    renderRoot();
    // Restore map after render
    if (addModalOpen) setTimeout(() => initPickMap(editTourId || null), 200);
    // Restore form fields after render
    if (addModalOpen && window._vacFormFields) {
        setTimeout(() => restoreFormFields(), 50);
    }
};

// ─── DELETE CONFIRM MODAL ─────────────────────
const openDeleteModal = (tourId, onConfirm) => {
    const vacLang = getCurrentLang();
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    const tour = getTours().find((t) => t.id === tourId);

    const overlay = document.createElement("div");
    overlay.className = "vac-del-overlay";
    overlay.id = "vac-del-overlay";
    overlay.innerHTML = `
        <div class="vac-del-modal">
            <div class="vac-del-icon-wrap">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                          stroke="#E24B4A" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="vac-del-content">
                <div class="vac-del-title">${tr.confirm_delete_title || "Tur paketni o'chirish"}</div>
            </div>
            <div class="vac-del-actions">
                <button class="vac-del-cancel" id="vac-del-cancel">${tr.cancel}</button>
                <button class="vac-del-confirm" id="vac-del-confirm">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                              stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    ${tr.delete}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector("#vac-del-cancel").addEventListener("click", close);
    overlay.querySelector("#vac-del-confirm").addEventListener("click", () => {
        close();
        onConfirm();
    });
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function esc(e) {
        if (e.key === "Escape") {
            close();
            document.removeEventListener("keydown", esc);
        }
    });
};