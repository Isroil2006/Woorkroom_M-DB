/**
 * i18n.js
 * Centralized language management utility for refresh-less switching.
 */

export const LANGUAGE_CHANGED_EVENT = "language-changed";

/**
 * Gets the currently saved language from localStorage.
 * @returns {string} The language code (e.g., 'uz', 'en', 'ru')
 */
export const getCurrentLang = () => {
    return localStorage.getItem("language") || "uz";
};

/**
 * Updates the language in localStorage and broadcasts a global event.
 * @param {string} lang The new language code.
 */
export const setLanguage = (lang) => {
    localStorage.setItem("language", lang);
    
    // Broadcast event so components can re-render
    const event = new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { lang } });
    document.dispatchEvent(event);
};

/**
 * Helper to create a translation function from a translations object.
 * This version reads the current language on every call, making it reactive.
 * @param {Object} translations The translations object.
 * @returns {Function} A function (key) => string
 */
export const createTranslationHelper = (translations) => {
    return (key) => {
        const lang = getCurrentLang();
        if (!translations[lang]) return key;
        return translations[lang][key] || key;
    };
};
