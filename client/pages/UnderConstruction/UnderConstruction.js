import { getCurrentLang } from "../../assets/js/i18n.js";

const translations = {
    uz: {
        title: "Sahifa ishlab chiqilmoqda",
        message: "Ushbu bo'lim hozirda tayyorlanmoqda. Tez orada barcha imkoniyatlardan foydalanishingiz mumkin bo'ladi.",
        btn: "Asosiy sahifaga qaytish"
    },
    en: {
        title: "Page under construction",
        message: "This section is currently under development. All features will be available soon.",
        btn: "Back to home"
    },
    ru: {
        title: "Страница в разработке",
        message: "Этот раздел в настоящее время находится в разработке. Все функции будут доступны в ближайшее время.",
        btn: "Вернуться на главную"
    }
};

export const UnderConstructionPage = () => {
    const lang = getCurrentLang();
    const t = translations[lang];

    return `
    <style id="uc-page-styles">
        .uc-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #F0F2F8;
            padding: 40px;
            animation: fadeInUc 0.4s ease-out;
            border-radius: 12px;
        }
        .uc-content {
            text-align: center;
            max-width: 600px;
            width: 100%;
            background: white;
            padding: 60px 40px;
            border-radius: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.03);
        }
        .uc-icon {
            margin-bottom: 40px;
            display: flex;
            justify-content: center;
        }
        .uc-icon svg {
            width: 140px;
            height: 140px;
            filter: drop-shadow(0 15px 25px rgba(91, 110, 245, 0.2));
        }
        .uc-title {
            font-size: 36px;
            font-weight: 850;
            color: #1a1d1f;
            margin-bottom: 20px;
            letter-spacing: -1px;
        }
        .uc-message {
            font-size: 18px;
            color: #6f767e;
            line-height: 1.7;
            margin-bottom: 40px;
            padding: 0 20px;
        }
        .uc-home-btn {
            background: #5b6ef5;
            color: white;
            border: none;
            padding: 16px 36px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 20px rgba(91, 110, 245, 0.25);
        }
        .uc-home-btn:hover {
            background: #4a5bd9;
            transform: translateY(-3px);
            box-shadow: 0 12px 28px rgba(91, 110, 245, 0.35);
        }
        @keyframes fadeInUc {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }
    </style>
    <div class="uc-container">
        <div class="uc-content">
            <div class="uc-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#5b6ef5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 22V12" stroke="#5b6ef5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 7L12 12L22 7" stroke="#5b6ef5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 4.5L7 9.5" stroke="#5b6ef5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
                </svg>
            </div>
            <h1 class="uc-title">${t.title}</h1>
            <p class="uc-message">${t.message}</p>
            <button class="uc-home-btn" id="uc-back-home">${t.btn}</button>
        </div>
    </div>
`;
};

export const initUnderConstructionLogic = () => {
  const btn = document.getElementById("uc-back-home");
  if (btn) {
    btn.onclick = () => {
      window.history.pushState({}, "", "/tasks");
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
  }
};
