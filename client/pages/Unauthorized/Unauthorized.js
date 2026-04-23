import { getCurrentLang } from "../../assets/js/i18n.js";

const translations = {
  uz: {
    title: "Kirish cheklangan",
    message: "Sizda ushbu sahifani ko'rish uchun yetarli huquqlar mavjud emas. Iltimos, administratorga murojaat qiling.",
    btn: "Asosiy sahifaga qaytish",
  },
  en: {
    title: "Access restricted",
    message: "You do not have enough permissions to view this page. Please contact your administrator.",
    btn: "Back to home",
  },
  ru: {
    title: "Доступ ограничен",
    message: "У вас недостаточно прав для просмотра этой страницы. Пожалуйста, свяжитесь с администратором.",
    btn: "Вернуться на главную",
  },
};

export const UnauthorizedPage = () => {
  const lang = getCurrentLang();
  const t = translations[lang];

  return `
    <style id="ua-page-styles">
        .ua-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #F0F2F8;
            animation: fadeInUa 0.4s ease-out;
            border-radius: 12px;
        }
        .ua-content {
            text-align: center;
            max-width: 500px;
            width: 100%;
            padding: 40px;
        }
        .ua-icon {
            margin-bottom: 32px;
            display: flex;
            justify-content: center;
        }
        .ua-icon svg {
            width: 100px;
            height: 100px;
        }
        .ua-title {
            font-size: 32px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 16px;
        }
        .ua-message {
            font-size: 17px;
            color: #4b5563;
            line-height: 1.6;
            margin-bottom: 40px;
        }
        .ua-home-btn {
            background: #111827;
            color: white;
            border: none;
            padding: 16px 32px;
            font-size: 15px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .ua-home-btn:hover {
            background: #1f2937;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        @keyframes fadeInUa {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
        }
    </style>
    <div class="ua-container">
        <div class="ua-content">
            <div class="ua-icon">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="11" width="14" height="10" rx="3" stroke="#ff4d4f" stroke-width="1.5"/>
                    <path d="M12 15V17" stroke="#ff4d4f" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#ff4d4f" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <h1 class="ua-title">${t.title}</h1>
            <p class="ua-message">${t.message}</p>
            <button class="ua-home-btn" id="ua-back-home">${t.btn}</button>
        </div>
    </div>
`;
};

export const initUnauthorizedLogic = () => {
  const btn = document.getElementById("ua-back-home");
  if (btn) {
    btn.onclick = () => {
      window.history.pushState({}, "", "/tasks");
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
  }
};
