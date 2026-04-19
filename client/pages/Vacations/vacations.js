import { createAnalyticsButton, initAnalytics } from "./analiytics.js";

import { vacTranslations } from "./translations.js";
import { SAMPLE_TOURS } from "./card-default-data.js";
import { applyPermissions } from "../Employees/permission.js";

// ─── DATA ─────────────────────────────────────
const getToursKey = () => "vac_tours_v2";
const getTours = () => {
    const s = localStorage.getItem(getToursKey());
    if (s) return JSON.parse(s);
    saveTours(SAMPLE_TOURS);
    return SAMPLE_TOURS;
};
const saveTours = (t) => localStorage.setItem(getToursKey(), JSON.stringify(t));
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
let vacLang = "uz";
let vacSearch = "";
let vacFilter = "all";
let detailTourId = null;
let editTourId = null;
let addModalOpen = false;
let carouselIdx = 0;
let pickMap = null;
let pickMarker = null;
// form state for images
let formCoverDataUrl = null; // base64 or url
let formGalleryImages = []; // [{dataUrl, isFile}]
let formContentLang = "uz"; // which lang tab is active in form

// booking state
let bookModalOpen = false;
let bookGuests = 1;
let bookSelectedMethodIdx = 0;
let bookStep = 1; // 1: payment form, 2: success

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
    vacLang = localStorage.getItem("language") || "uz";
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
                ${createAnalyticsButton(vacLang)}
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

    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
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
    vacLang = localStorage.getItem("language") || "uz";
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    const t = getTours().find(x => x.id === detailTourId);
    if (!t) return "";

    const cu = JSON.parse(localStorage.getItem("currentUser")) || null;
    if (!cu) {
        return `
            <div class="vac-book-box-center">
                <h3>${tr.book_login}</h3>
                <button class="vac-btn-primary vac-book-login-btn" id="vac-book-close">${tr.close || "Yopish"}</button>
            </div>`;
    }

    const name = ml(t.name, vacLang);
    const city = ml(t.city, vacLang);
    const totalCost = Number(t.price) * bookGuests;

    if (bookStep === 2) {
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
                    <div class="vac-book-summary-row">
                        <span class="vac-book-summary-label">${tr.book_total}</span>
                        <span class="vac-book-summary-val-total">$${totalCost.toLocaleString()}</span>
                    </div>
                </div>
                <button class="vac-btn-primary vac-book-confirm-btn" id="vac-book-close">${tr.book_continue}</button>
            </div>`;
    }

    const methods = cu.paymentMethods || [];
    const fmt = n => "$" + Number(n||0).toLocaleString("en-US", {minimumFractionDigits:2});

    return `
            <div class="vac-add-modal-header vac-book-header">
                <h2 class="vac-add-modal-title">${tr.book_title}</h2>
                <button class="vac-modal-close" id="vac-book-close">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>
                <div class="vac-book-body">
                <div class="vac-book-tour-info">
                    <img src="${t.coverImage || (t.images&&t.images[0]) || ''}" class="vac-book-tour-img" onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=200&q=80'"/>
                    <div>
                        <h4 class="vac-book-tour-title">${name}</h4>
                        ${city ? `<div class="vac-book-tour-city">${city}</div>` : ''}
                        <div class="vac-book-tour-price">$${Number(t.price).toLocaleString()} <span class="vac-book-tour-price-per">${tr.per_person}</span></div>
                    </div>
                </div>

                <div class="vac-book-section">
                    <label class="vac-book-label">${tr.book_select_guests}</label>
                    <div class="vac-book-guest-ctrl">
                        <button class="vac-guest-btn" id="vac-g-minus">-</button>
                        <span class="vac-book-guest-count">${bookGuests}</span>
                        <button class="vac-guest-btn" id="vac-g-plus">+</button>
                    </div>
                </div>

                <div class="vac-book-section last">
                    <label class="vac-book-label">${tr.book_select_payment}</label>
                    <div class="vac-book-methods">
                        ${methods.length ? methods.map((m, i) => `
                        <label class="vac-book-method-item ${bookSelectedMethodIdx === i ? 'active' : ''}">
                            <input type="radio" name="b-method" value="${i}" ${bookSelectedMethodIdx === i ? 'checked' : ''} class="vac-book-method-radio"/>
                            <div class="vac-book-method-info">
                                <div class="vac-book-method-top">
                                    <span class="vac-book-method-name">${m.type==='card'?'💳':'🏦'} ${m.displayNumber || m.number}</span>
                                    <span class="vac-book-method-bal ${Number(m.balance)<totalCost ? 'error' : ''}">${fmt(m.balance)}</span>
                                </div>
                                <span class="vac-book-method-sub">${m.bank || m.expiry || ''}</span>
                            </div>
                        </label>
                        `).join("") : `<div class="vac-book-no-methods">${tr.book_no_methods}</div>`}
                    </div>
                </div>

                <div class="vac-book-total-row">
                    <span class="vac-book-total-label">${tr.book_total_label}</span>
                    <span class="vac-book-total-val">$${totalCost.toLocaleString()}</span>
                </div>

                <button class="vac-btn-primary vac-book-confirm-btn" id="vac-book-confirm" ${!methods.length ? 'disabled' : ''}>
                    ${tr.book_pay}
                </button>
            </div>`;
};


// ─── ADD / EDIT MODAL ─────────────────────────
const renderAddModal = () => {
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
    let t = null;
    if (editTourId) t = getTours().find((x) => x.id === editTourId);
    const isEdit = !!t;
    const cl = formContentLang;
    const buf = window._vacFormBuffer || {};

    // Buffer first, then tour data, then empty
    const fName = (buf.name?.[cl] ?? (isEdit ? ml(t.name, cl) : "")) || "";
    const fCountry = (buf.country?.[cl] ?? (isEdit ? ml(t.country, cl) : "")) || "";
    const fCity = (buf.city?.[cl] ?? (isEdit ? ml(t.city, cl) : "")) || "";
    const fDesc = (buf.desc?.[cl] ?? (isEdit ? ml(t.description, cl) : "")) || "";
    const fIncRaw = buf.inc?.[cl] ?? (isEdit ? ml(t.included, cl) : []);
    const fIncStr = Array.isArray(fIncRaw) ? fIncRaw.join("\n") : fIncRaw || "";

    // cover preview
    const coverSrc = formCoverDataUrl || (isEdit ? t.coverImage : null);

    // gallery previews
    const galleryPreviews = formGalleryImages.length ? formGalleryImages : isEdit && t.images ? t.images.map((u) => ({ dataUrl: u, isFile: false })) : [];

    return `
    <div class="vac-overlay" id="vac-add-overlay">
        <div class="vac-add-modal" id="vac-add-modal">
            <div class="vac-add-modal-header">
                <h2 class="vac-add-modal-title">${isEdit ? tr.modal_title_edit : tr.modal_title_add}</h2>
                <button class="vac-modal-close" id="vac-add-close">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>

            <div class="vac-add-modal-body">
                <!-- ═══ LEFT: FORM ═══ -->
                <div class="vac-form-col">

                    <!-- LANG TABS for content -->
                    <div class="vac-lang-tabs" id="vac-lang-tabs">
                        <span class="vac-lang-tabs-label">${tr.content_lang}:</span>
                        ${["uz", "ru", "en"]
                            .map(
                                (l) => `
                        <button class="vac-lang-tab ${cl === l ? "active" : ""}" data-lang="${l}">
                            ${tr["tab_" + l]}
                        </button>`,
                            )
                            .join("")}
                    </div>

                    <!-- Basic fields (multilang) -->
                    <div class="vac-form-row-2">
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.field_name} *</label>
                            <input type="text" id="vf-name" class="vac-input" placeholder="${tr.ph_name}" value="${esc(fName)}"/>
                        </div>
                        <div class="vac-form-group">
                            <label class="vac-label">${tr.field_category}</label>
                            <select id="vf-category" class="vac-input vac-select">
                                ${["beach", "mountain", "city", "nature"]
                                    .map(
                                        (c) => `
                                <option value="${c}" ${(t?.category || "beach") === c ? "selected" : ""}>${tr[c] || c}</option>`,
                                    )
                                    .join("")}
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
                            ${[1, 2, 3, 4, 5]
                                .map(
                                    (n) => `
                            <button type="button" class="vac-rating-star ${Math.round(t?.rating || 5) >= n ? "active" : ""}" data-val="${n}">★</button>`,
                                )
                                .join("")}
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
                </div>

                <!-- ═══ RIGHT: IMAGES + MAP ═══ -->
                <div class="vac-form-col vac-form-col--right">

                    <!-- COVER IMAGE -->
                    <div class="vac-form-group">
                        <label class="vac-label">${tr.cover_photo}</label>
                        <div class="vac-cover-upload" id="vac-cover-zone">
                            ${
                                coverSrc
                                    ? `<div class="vac-cover-preview">
                                    <img src="${esc(coverSrc)}" class="vac-cover-img" id="vac-cover-img"/>
                                    <button type="button" class="vac-img-remove" id="vac-cover-remove">✕</button>
                                   </div>`
                                    : `<div class="vac-upload-placeholder" id="vac-cover-placeholder">
                                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#c0c7d4" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#c0c7d4"/><path d="M21 15l-5-5L5 21" stroke="#c0c7d4" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    <span>${tr.add_cover}</span>
                                   </div>`
                            }
                            <input type="file" id="vac-cover-input" accept="image/*" style="display:none"/>
                        </div>
                    </div>

                    <!-- GALLERY IMAGES -->
                    <div class="vac-form-group">
                        <label class="vac-label">${tr.gallery_photos}</label>
                        <div class="vac-gallery-grid" id="vac-gallery-grid">
                            ${galleryPreviews
                                .map(
                                    (img, i) => `
                            <div class="vac-gallery-item" data-idx="${i}">
                                <img src="${esc(img.dataUrl)}" class="vac-gallery-thumb"
                                     onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=200&q=60'"/>
                                <button type="button" class="vac-img-remove vac-gallery-remove" data-idx="${i}">✕</button>
                            </div>`,
                                )
                                .join("")}
                            <label class="vac-gallery-add-btn" for="vac-gallery-input">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#5b6ef5" stroke-width="2.5" stroke-linecap="round"/></svg>
                            </label>
                            <input type="file" id="vac-gallery-input" accept="image/*" multiple style="display:none"/>
                        </div>
                    </div>

                    <!-- MAP -->
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

// ─── EVENTS ───────────────────────────────────
const attachRootEvents = () => {
    $v("vac-add-btn")?.addEventListener("click", () => {
        editTourId = null;
        addModalOpen = true;
        formCoverDataUrl = null;
        formGalleryImages = [];
        formContentLang = "uz";
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
            formCoverDataUrl = t.coverImage || null;
            formGalleryImages = (t.images || []).map((u) => ({ dataUrl: u, isFile: false }));
            formContentLang = "uz";
            autosave();
            renderRoot();
            setTimeout(() => initPickMap(editTourId), 120);
        }),
    );
    document.querySelectorAll(".vac-del-btn").forEach((b) =>
        b.addEventListener("click", (e) => {
            e.stopPropagation();
            openDeleteModal(b.dataset.id, () => {
                saveTours(getTours().filter((t) => t.id !== b.dataset.id));
                refreshGrid();
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
            const tr = vacTranslations[vacLang] || vacTranslations.uz;
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
            if ($v("vf-included")) $v("vf-included").value = fIncStr;
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
    ["vf-name", "vf-country", "vf-city", "vf-price", "vf-days", "vf-nights", "vf-desc", "vf-included", "vf-lat", "vf-lng", "vf-category"].forEach((id) => {
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

    initAnalytics(getTours, vacLang);
};

// Save current lang-tab values before switching tab
const saveLangTabValues = () => {
    if (!addModalOpen) return;
    const cl = formContentLang;
    const name = $v("vf-name")?.value.trim() || "";
    const country = $v("vf-country")?.value.trim() || "";
    const city = $v("vf-city")?.value.trim() || "";
    const desc = $v("vf-desc")?.value.trim() || "";
    const inc = ($v("vf-included")?.value || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    // store in a temporary state object
    if (!window._vacFormBuffer) window._vacFormBuffer = { name: {}, country: {}, city: {}, desc: {}, inc: {} };
    window._vacFormBuffer.name[cl] = name;
    window._vacFormBuffer.country[cl] = country;
    window._vacFormBuffer.city[cl] = city;
    window._vacFormBuffer.desc[cl] = desc;
    window._vacFormBuffer.inc[cl] = inc;
};

const rerenderImgArea = () => {
    const tr = vacTranslations[vacLang] || vacTranslations.uz;
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
        box.innerHTML = getBookModalHTML();
        attachBookModalEvents();
    }
};

const openBookModal = () => {
    bookModalOpen = true;
    bookGuests = 1;
    bookSelectedMethodIdx = 0;
    bookStep = 1;

    let ol = document.getElementById("vac-book-modal-container");
    if (!ol) {
        ol = document.createElement("div");
        ol.className = "vac-overlay";
        ol.id = "vac-book-modal-container";
        const inner = document.createElement("div");
        inner.className = "vac-add-modal vac-book-modal-box";
        inner.id = "vac-book-modal-box";
        ol.appendChild(inner);
        document.body.appendChild(ol);
    }
    updateBookModalUI();
};

const attachBookModalEvents = () => {
    $v("vac-book-close")?.addEventListener("click", closeBookModal);

    const ol = $v("vac-book-modal-container");
    if (ol) ol.addEventListener("click", (e) => {
        if (e.target === ol) closeBookModal();
    });

    if (bookStep === 1) {
        $v("vac-g-minus")?.addEventListener("click", () => {
            if (bookGuests > 1) { bookGuests--; updateBookModalUI(); }
        });
        $v("vac-g-plus")?.addEventListener("click", () => {
            if (bookGuests < 20) { bookGuests++; updateBookModalUI(); }
        });

        document.querySelectorAll('input[name="b-method"]').forEach(r => {
            r.addEventListener("change", (e) => {
                bookSelectedMethodIdx = parseInt(e.target.value);
                updateBookModalUI();
            });
        });

        $v("vac-book-confirm")?.addEventListener("click", processTourPayment);
    }
};

const processTourPayment = () => {
    const t = getTours().find(x => x.id === detailTourId);
    if (!t) return;
    const totalCost = Number(t.price) * bookGuests;

    try {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const cuStr = localStorage.getItem("currentUser");
        if (!cuStr) return;
        const cu = JSON.parse(cuStr);

        const myUser = users.find(u => u.username === cu.username);
        if (!myUser) return;

        const method = myUser.paymentMethods && myUser.paymentMethods[bookSelectedMethodIdx];
        if (!method) return;

        if (Number(method.balance) < totalCost) {
            const btn = $v("vac-book-confirm");
            if (btn) {
                const oldHtml = btn.innerHTML;
                const oldBg = btn.style.backgroundColor;
                btn.style.backgroundColor = "#ef4444";
                btn.textContent = "Mablag' yetarli emas";
                setTimeout(() => {
                    btn.style.backgroundColor = oldBg;
                    btn.innerHTML = oldHtml;
                }, 2000);
            }
            return;
        }

        // Deduct balance
        method.balance = Number(method.balance) - totalCost;

        // Add payment record
        if (!myUser.payments) myUser.payments = [];
        const name = ml(t.name, vacLang);
        myUser.payments.push({
            docNumber: `TOUR/${Date.now()}`,
            desc: `Tur to'lovi: ${name} (${bookGuests} kishi)`,
            amount: totalCost,
            recipientName: "Workroom Agency",
            status: "paid",
            isIncoming: false,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            createDate: new Date().toLocaleDateString(),
            createTime: new Date().toLocaleTimeString(),
            method: method.type
        });

        // Save booking for calendar
        const bookings = JSON.parse(localStorage.getItem("vac_bookings") || "[]");
        const bookingId = `booking_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const bookDate = new Date();
        bookings.push({
            id: bookingId,
            username: cu.username,
            tourId: t.id,
            tourName: name,
            guests: bookGuests,
            totalCost: totalCost,
            bookedAt: bookDate.toISOString().split('T')[0],
            bookedAtFull: bookDate.toISOString(),
            tourDays: t.days || 7
        });
        localStorage.setItem("vac_bookings", JSON.stringify(bookings));

        // Save back
        localStorage.setItem("users", JSON.stringify(users));
        localStorage.setItem("currentUser", JSON.stringify(myUser));

        bookStep = 2; // Success step
        updateBookModalUI();
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
    const name = ml(t?.name || "", vacLang);

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

    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
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
            openDeleteModal(b.dataset.id, () => {
                saveTours(getTours().filter((t) => t.id !== b.dataset.id));
                refreshGrid();
            });
        }),
    );
};

// ─── SAVE FORM ────────────────────────────────
const saveTourForm = () => {
    saveLangTabValues();
    const buf = window._vacFormBuffer || {};
    const cl = formContentLang;

    // Current tab values — overwrite only current lang
    if (!buf.name) buf.name = {};
    if (!buf.country) buf.country = {};
    if (!buf.city) buf.city = {};
    if (!buf.desc) buf.desc = {};
    if (!buf.inc) buf.inc = {};

    buf.name[cl] = $v("vf-name")?.value.trim() || buf.name[cl] || "";
    buf.country[cl] = $v("vf-country")?.value.trim() || buf.country[cl] || "";
    buf.city[cl] = $v("vf-city")?.value.trim() || buf.city[cl] || "";
    buf.desc[cl] = $v("vf-desc")?.value.trim() || buf.desc[cl] || "";
    buf.inc[cl] = ($v("vf-included")?.value || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

    if (!Object.values(buf.name).some(Boolean)) {
        $v("vf-name")?.focus();
        return;
    }
    if (!Object.values(buf.country).some(Boolean)) {
        $v("vf-country")?.focus();
        return;
    }

    const ratingStars = document.querySelectorAll(".vac-rating-star.active");
    const rating = ratingStars.length || 5;

    const coverImage = formCoverDataUrl || (editTourId ? getTours().find((x) => x.id === editTourId)?.coverImage : null) || formGalleryImages[0]?.dataUrl || null;
    const images = formGalleryImages.map((x) => x.dataUrl);
    const oldTour = editTourId ? getTours().find((t) => t.id === editTourId) : null;

    // For multilang fields: merge buf values with oldTour fallback for langs not filled
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

    const tour = {
        id: editTourId || genTourId(),
        name: mergeLang(buf.name, oldTour?.name),
        country: mergeLang(buf.country, oldTour?.country),
        city: mergeLang(buf.city, oldTour?.city),
        description: mergeLang(buf.desc, oldTour?.description),
        included: mergeIncLang(buf.inc, oldTour?.included),
        category: $v("vf-category")?.value || "beach",
        price: parseFloat($v("vf-price")?.value || 0) || 0,
        days: parseInt($v("vf-days")?.value || 7) || 7,
        nights: parseInt($v("vf-nights")?.value || 6) || 6,
        rating,
        coverImage,
        images: images.length ? images : oldTour?.images || [],
        lat: parseFloat($v("vf-lat")?.value) || null,
        lng: parseFloat($v("vf-lng")?.value) || null,
        createdAt: oldTour?.createdAt || new Date().toISOString(),
    };

    let tours = getTours();
    tours = editTourId ? tours.map((t) => (t.id === editTourId ? tour : t)) : [tour, ...tours];
    saveTours(tours);
    clearUiState();
    closeAddModal();
};

// ─── LEAFLET MAP (pick location in form) ───────
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
export const initVacationsLogic = () => {
    vacLang = localStorage.getItem("language") || "uz";
    // Restore UI state from before refresh
    const restored = loadUiState();
    if (!restored) {
        vacSearch = "";
        vacFilter = "all";
        detailTourId = null;
        editTourId = null;
        addModalOpen = false;
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
};
