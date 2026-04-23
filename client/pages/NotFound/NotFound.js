import { getCurrentLang } from "../../assets/js/i18n.js";

const translations = {
  uz: {
    title: "Sahifa topilmadi",
    message: "Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan bo'lishi mumkin.",
    btn: "Bosh sahifa",
  },
  en: {
    title: "Page not found",
    message: "The page you are looking for does not exist or may have been moved.",
    btn: "Go home",
  },
  ru: {
    title: "Страница не найдена",
    message: "Страница, которую вы ищете, не существует или была перемещена.",
    btn: "На главную",
  },
};

export const NotFoundPageTemplate = () => {
  const lang = getCurrentLang();
  const t = translations[lang];

  return `
    <style id="nf-page-styles">
        .nf-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F0F2F8;
            animation: fadeInNf 0.4s ease-out;
            border-radius: 12px;
        }
        .nf-content {
            text-align: center;
            max-width: 600px;
            width: 100%;
            padding: 40px;
        }
        .nf-code {
            font-size: 180px;
            font-weight: 900;
            margin: 0;
            line-height: 1;
            background: linear-gradient(135deg, #5b6ef5 0%, #8a99ff 100%);
            -webkit-background-clip: text;
            -webkit-fill-color: transparent;
            -webkit-text-fill-color: transparent;
            opacity: 0.12;
            user-select: none;
        }
        .nf-subtitle {
            font-size: 38px;
            font-weight: 800;
            color: #1a1d1f;
            margin-top: -60px;
            margin-bottom: 24px;
            letter-spacing: -0.5px;
        }
        .nf-text {
            font-size: 18px;
            color: #6f767e;
            line-height: 1.6;
            margin-bottom: 40px;
            padding: 0 40px;
        }
        .nf-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
        }
        .nf-btn {
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nf-btn-primary {
            background: #5b6ef5;
            color: white;
            border: none;
            box-shadow: 0 8px 20px rgba(91, 110, 245, 0.2);
        }
        .nf-btn-primary:hover {
            background: #4a5bd9;
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(91, 110, 245, 0.3);
        }
        .nf-btn-secondary {
            background: white;
            color: #1a1d1f;
            border: 1.5px solid #efefef;
        }
        .nf-btn-secondary:hover {
            background: #f8f8f8;
            transform: translateY(-2px);
        }
        @keyframes fadeInNf {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
    <div class="nf-container">
        <div class="nf-content">
            <h1 class="nf-code">404</h1>
            <h2 class="nf-subtitle">${t.title}</h2>
            <p class="nf-text">${t.message}</p>
            <div class="nf-actions">
                <button class="nf-btn nf-btn-primary" id="nf-go-home">${t.btn}</button>
            </div>
        </div>
    </div>
`;
};

export const initNotFoundLogic = () => {
  const btn = document.getElementById("nf-go-home");
  if (btn) {
    btn.onclick = () => {
      window.history.pushState({}, "", "/tasks");
      window.dispatchEvent(new PopStateEvent("popstate"));
    };
  }
};
