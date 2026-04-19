import { API_URL, getCurrentUser, fetchCurrentUser, clearAuth, getAuthHeaders, setCurrentUser } from "../../assets/js/api.js";
import {
  DashboardPage,
  initDashboardLogic,
} from "../../pages/Dashboard/dashboard.js";
import {
  BusinessPage,
  initBusinessLogic,
} from "../../pages/Business/business.js";
import { TodoPage, initTodoLogic } from "../../pages/Tasks/tasks.js";
import {
  VacationsPage,
  initVacationsLogic,
} from "../../pages/Vacations/vacations.js";
import {
  EmployeesPage,
  initEmployeesPage,
} from "../../pages/Employees/employees.js";
import {
  MassangerPage,
  initMessengerLogic,
} from "../../pages/Messenger/messenger.js";
import {
  InfoPortalPage,
  initInfoPortalLogic,
} from "../../pages/InfoPortal/infoportal.js";
import {
  applyPermissions,
  getPermissions,
} from "../../pages/Employees/permission.js";
import { userProfileRender } from "../../pages/user-profile/user-profile.js";

const navigationWrapper = document.querySelector(".navigation-wrapper");
const currentLang = localStorage.getItem("language") || "uz";

// Placeholder values — will be updated after fetchCurrentUser
let userAvatar = "/assets/images/User-avatar.png";
let userName = currentLang === "uz" ? "Foydalanuvchi" : "User";

export const translations = {
  uz: {
    nav_tests: "Testlar",
    nav_business: "To'lovlar",
    nav_calendar: "Vazifalar",
    nav_vacations: "Ta'tillar",
    nav_employees: "Xodimlar",
    nav_messenger: "Messenger",
    nav_infoportal: "Kalendar",
    nav_support: "Yordam",
    nav_logout: "Chiqish",
    nav_profile: "Profil",
  },
  en: {
    nav_tests: "Tests",
    nav_business: "Payments",
    nav_calendar: "Tasks",
    nav_vacations: "Vacations",
    nav_employees: "Employees",
    nav_messenger: "Messenger",
    nav_infoportal: "Calendar",
    nav_support: "Support",
    nav_logout: "Logout",
    nav_profile: "Profile",
  },
  ru: {
    nav_tests: "Тесты",
    nav_business: "Платежи",
    nav_calendar: "Задачи",
    nav_vacations: "Отпуска",
    nav_employees: "Сотрудники",
    nav_messenger: "Мессенджер",
    nav_infoportal: "Календарь",
    nav_support: "Поддержка",
    nav_logout: "Выход",
    nav_profile: "Профиль",
  },
};

const t = (key) => translations[currentLang][key] || key;

const NAV_PERM_MAP = {
  Tests: "nav_dashboard",
  Payments: "nav_business",
  Tasks: "nav_tasks",
  Vacations: "nav_vacations",
  Employees: "nav_employees",
  Messenger: "nav_messenger",
  Infoportal: "nav_infoportal",
};

const ROUTES = {
  "/": "Tests",
  "/tests": "Tests",
  "/payments": "Payments",
  "/tasks": "Tasks",
  "/vacations": "Vacations",
  "/employees": "Employees",
  "/messenger": "Messenger",
  "/calendar": "Infoportal",
  "/profile": "user-profile",
};

const filterNavByPermissions = async () => {
  const cu = getCurrentUser();
  if (!cu) return;
  await applyPermissions(cu.userId || cu._id);
};

// ─── Determine initial page from URL ──────────────────────────────
const initialPath = window.location.pathname;
const initialPage = ROUTES[initialPath] || "Tasks";

// ─── NAV HTML ─────────────────────────────────────────────────────
navigationWrapper.innerHTML = `
    <div class="nav-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <a href="/tasks" id="nav-logo-link"><img src="/assets/images/logo-blue.svg" alt="" /></a>
        
        <div class="custom-select" id="nav-language-selector">
            <div class="selected">
                <img src="/assets/images/uzb-flag.png" alt="" />
                <span>UZ</span>
                <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <ul class="options" style="display: none;">
                <li data-value="uz">
                    <img src="/assets/images/uzb-flag.png" alt="" />
                    UZ
                </li>
                <li data-value="en">
                    <img src="/assets/images/usa-flag.png" alt="" />
                    EN
                </li>
                <li data-value="ru">
                    <img src="/assets/images/rus-flag.png" alt="" />
                    RU
                </li>
            </ul>
        </div>
    </div>

    <ul class="nav-menu">
        <li data-page="Tests" data-perm="nav_dashboard" class="${initialPage === "Tests" ? "active" : ""}">
            <a href="#tests">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M6 3C4.34315 3 3 4.34315 3 6V8C3 9.65685 4.34315 11 6 11H8C9.65685 11 11 9.65685 11 8V6C11 4.34315 9.65685 3 8 3H6ZM16 3C14.3431 3 13 4.34315 13 6V8C13 9.65685 14.3431 11 16 11H18C19.6569 11 21 9.65685 21 8V6C21 4.34315 19.6569 3 18 3H16ZM3 16C3 14.3431 4.34315 13 6 13H8C9.65685 13 11 14.3431 11 16V18C11 19.6569 9.65685 21 8 21H6C4.34315 21 3 19.6569 3 18V16ZM16 13C14.3431 13 13 14.3431 13 16V18C13 19.6569 14.3431 21 16 21H18C19.6569 21 21 19.6569 21 18V16C21 14.3431 19.6569 13 18 13H16Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_tests")}</span>
            </a>
        </li>

        <li data-page="Payments" class="${initialPage === "Payments" ? "active" : ""}">
            <a href="#business">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M13.0423 2.63625C12.4024 2.2456 11.5978 2.2456 10.9579 2.63625L4.84895 6.36588C3.5594 7.15317 3.57497 9.03115 4.8774 9.79696L11.0093 13.4024C11.6364 13.7712 12.4143 13.7703 13.0406 13.4001L19.1339 9.79908C20.4329 9.03137 20.4463 7.15655 19.1585 6.37028L13.0423 2.63625ZM19.6032 11.4709C20.0833 11.198 20.6938 11.3661 20.9666 11.8462C21.22 12.2921 21.0932 12.8503 20.6894 13.1463L20.5913 13.2097L13.9967 16.9572C13.167 17.4329 12.1543 17.4657 11.2965 17.0535L11.1151 16.9584L4.59833 13.207C4.11968 12.9314 3.95503 12.3201 4.23056 11.8414C4.48641 11.397 5.03184 11.2232 5.49169 11.4213L5.59612 11.4736L12.1095 15.2231C12.3498 15.3601 12.6429 15.377 12.8983 15.2725L13.0053 15.2202L19.6032 11.4709ZM19.5062 15.1307C19.9864 14.8579 20.5968 15.0259 20.8697 15.5061C21.1231 15.952 20.9963 16.5102 20.5924 16.8061L20.4943 16.8696L13.8998 20.617C13.07 21.0928 12.0573 21.1255 11.1995 20.7133L11.0182 20.6182L4.50137 16.8668C4.02273 16.5913 3.85807 15.9799 4.1336 15.5013C4.38945 15.0568 4.93489 14.8831 5.39473 15.0811L5.49916 15.1335L12.0126 18.8829C12.2528 19.02 12.5459 19.0369 12.8014 18.9323L12.9083 18.8801L19.5062 15.1307Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_business")}</span>
            </a>
        </li>

        <li data-page="Tasks" data-perm="nav_tasks" class="${initialPage === "Tasks" ? "active" : ""}">
            <a href="#calendar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M7 2C7 1.44772 7.44772 1 8 1C8.55228 1 9 1.44772 9 2V3H15V2C15 1.44772 15.4477 1 16 1C16.5523 1 17 1.44772 17 2V3C19.2091 3 21 4.79086 21 7V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V7C3 4.79086 4.79086 3 7 3V2ZM15 5C15 5.55228 15.4477 6 16 6C16.5523 6 17 5.55228 17 5L17.1493 5.00549C18.1841 5.08183 19 5.94564 19 7V8H5V7L5.00549 6.85074C5.08183 5.81588 5.94564 5 7 5C7 5.55228 7.44772 6 8 6C8.55228 6 9 5.55228 9 5H15Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_calendar")}</span>
            </a>
        </li>

        <li data-page="Vacations" data-perm="nav_vacations" class="${initialPage === "Vacations" ? "active" : ""}">
            <a href="#vacations">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M15.5066 8.79191L15.4969 4.00276C15.4974 2.34482 14.1559 1.00046 12.5007 1.00004C10.8455 0.999621 9.50339 2.34331 9.50297 4.00125L9.49337 8.79191L3.09998 12.0137C2.42549 12.3535 2 13.0444 2 13.7997V14.8043C2 15.426 2.56138 15.8971 3.17369 15.7891L9.49245 14.6746V17.2007L8.45276 18.4579C8.15621 18.8164 7.99396 19.2672 7.99396 19.7325V20.7663C7.99396 21.4018 8.57916 21.8762 9.20099 21.7446L12.5007 21.0463L15.7769 21.7431C16.399 21.8754 16.9849 21.401 16.9849 20.765V19.7256C16.9849 19.2645 16.8256 18.8175 16.5339 18.4604L15.5075 17.2039V14.6746L21.8263 15.7891C22.4386 15.8971 23 15.426 23 14.8043V13.7997C23 13.0444 22.5745 12.3535 21.9 12.0137L15.5066 8.79191Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_vacations")}</span>
            </a>
        </li>

        <li data-page="Employees" data-perm="nav_employees" class="${initialPage === "Employees" ? "active" : ""}">
            <a href="#employees">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M14.027 8.03308C14.7517 10.4277 13.8183 13.0131 11.7294 14.3971C13.4634 15.0352 14.9621 16.1837 16.027 17.6906C16.19 17.9215 16.2104 18.2237 16.0801 18.4744C15.9497 18.725 15.6902 18.8823 15.4071 18.8823L1.75828 18.8829C1.47518 18.8829 1.21565 18.7256 1.08524 18.4749C0.954832 18.2243 0.975266 17.9221 1.13823 17.6912C2.20309 16.184 3.702 15.0353 5.43628 14.3971C3.34738 13.0131 2.41395 10.4277 3.13865 8.03308C3.86334 5.63846 6.07507 4 8.58282 4C11.0906 4 13.3023 5.63846 14.027 8.03308ZM21.4726 7.30772C22.6404 9.8439 21.7852 12.8506 19.456 14.3971C21.1901 15.0352 22.6888 16.1837 23.7536 17.6906C23.9166 17.9215 23.9371 18.2237 23.8067 18.4743C23.6763 18.725 23.4169 18.8823 23.1338 18.8823L18.8951 18.8829C18.6006 18.8829 18.3326 18.7128 18.208 18.4465C17.6254 17.2007 16.8052 16.0799 15.7931 15.1467C15.778 15.1327 15.7643 15.118 15.7506 15.1032C15.4859 14.8622 15.2093 14.6345 14.9219 14.4211C14.6069 14.1874 14.5228 13.7527 14.728 13.4189C16.2618 10.921 16.1176 7.74356 14.364 5.39396C14.2149 5.19423 14.174 4.93413 14.2545 4.69844C14.335 4.46275 14.5266 4.28168 14.7669 4.21426C17.4607 3.45957 20.3047 4.77155 21.4726 7.30772Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_employees")}</span>
            </a>
        </li>

        <li data-page="Messenger" data-perm="nav_messenger" class="${initialPage === "Messenger" ? "active" : ""}">
            <a href="#messenger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M22.1131 17.1417C23.2813 15.0135 23.2963 12.4606 22.153 10.3196C21.0098 8.17856 18.8557 6.72546 16.3968 6.43648C15.313 3.96537 12.925 2.27316 10.1786 2.03006C7.43221 1.78695 4.77042 3.03217 3.24746 5.27253C1.72449 7.5129 1.58606 10.387 2.88697 12.7565L2.30716 14.7344C2.17615 15.181 2.30391 15.6617 2.64093 15.9902C2.97795 16.3187 3.47124 16.4433 3.92957 16.3157L5.95948 15.7506C6.7809 16.179 7.67719 16.4543 8.60228 16.5622C9.42916 18.4471 11.03 19.9072 13.0148 20.5867C14.9995 21.2661 17.1857 21.1025 19.0407 20.1357L21.0705 20.7008C21.5288 20.8284 22.0221 20.7038 22.3591 20.3754C22.6961 20.047 22.824 19.5663 22.693 19.1197L22.1131 17.1417ZM20.6612 16.675C20.5556 16.848 20.5279 17.0558 20.5847 17.2494L21.1581 19.205L19.1512 18.6463C18.9526 18.591 18.7394 18.618 18.5619 18.7209C17.1753 19.5217 15.5165 19.7454 13.9588 19.3419C12.4012 18.9383 11.0754 17.9413 10.28 16.5753C12.3569 16.3658 14.2498 15.3212 15.5024 13.6933C16.7549 12.0655 17.2534 10.002 16.8777 8.00059C18.7362 8.42838 20.2748 9.69239 21.0218 11.405C21.7687 13.1175 21.6348 15.0742 20.6612 16.675Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_messenger")}</span>
            </a>
        </li>

        <li data-page="Infoportal" data-perm="nav_infoportal" class="${initialPage === "Infoportal" ? "active" : ""}">
            <a href="#infoportal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M22.7133 9.96615C22.427 9.56926 21.9681 9.33394 21.4793 9.33333H20.2529L20.2392 8.26013C20.2252 7.16563 19.3339 6.28571 18.2394 6.28571H12.4751C12.258 6.28571 12.0468 6.21507 11.8734 6.08444L9.6407 4.40254C9.2939 4.1413 8.8715 4 8.43731 4H4C2.89543 4 2 4.89543 2 6L2 18C2 19.1046 2.89543 20 4 20H18.5968C19.458 20 20.2224 19.4488 20.4944 18.6318L22.9223 11.339C23.0763 10.8743 22.9986 10.3637 22.7133 9.96615ZM8.25749 5.52381C8.47416 5.52381 8.68496 5.59418 8.85818 5.72432L11.2278 7.50474C11.4915 7.70195 11.8115 7.80883 12.1405 7.80952H17.7318C18.2841 7.80952 18.7318 8.25724 18.7318 8.80952V9.33333H6.35086C5.69595 9.33274 5.11436 9.75267 4.90782 10.3753L3.52108 14.543V6.52381C3.52108 5.97153 3.96879 5.52381 4.52108 5.52381H8.25749Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_infoportal")}</span>
            </a>
        </li>
    </ul>

    <!--
    <div class="support">
        <img src="/components/Navigation/images/support.svg" alt="" />
        <button class="btn">${t("nav_support")}</button>
    </div>
    -->

    <div class="profile-menu-container">
        <div class="profile-dropdown" style="display: none;">
            <div class="dropdown-item" id="go-to-profile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>${t("nav_profile")}</span>
            </div>
            <div class="dropdown-item logout-item" id="sidebar-logout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>${t("nav_logout")}</span>
            </div>
        </div>

        <div class="user-profile-btn sidebar-profile">
            <img src="${userAvatar}" class="nav-user-avatar" alt="Avatar" />
            <span class="nav-user-name">${userName}</span>
            <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
        </div>
    </div>
`;

// ─── LANGUAGE SELECTOR LOGIC ──────────────────────────────────────
const initNavLanguage = () => {
  const select = document.getElementById("nav-language-selector");
  if (!select) return;

  const selected = select.querySelector(".selected");
  const options = select.querySelector(".options");
  const items = select.querySelectorAll(".options li");

  // 1️⃣ Set current language UI
  items.forEach((item) => {
    if (item.dataset.value === currentLang) {
      const img = item.querySelector("img").src;
      const text = item.textContent.trim();
      selected.innerHTML = `<img src="${img}"> <span>${text}</span>`;
    }
  });

  // 2️⃣ Toggle dropdown
  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = options.style.display === "block";
    options.style.display = isOpen ? "none" : "block";
    const chevron = selected.querySelector(".chevron-icon");
    if (chevron)
      chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  // 3️⃣ Select language
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const lang = item.dataset.value;
      localStorage.setItem("language", lang);

      // Save calendar date if needed
      const calEventsDate = document.getElementById("cal-events-date");
      if (calEventsDate?.textContent) {
        localStorage.setItem("cal_selected_date", calEventsDate.textContent);
      }
      window.location.reload();
    });
  });

  // 4️⃣ Close on outside click
  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      options.style.display = "none";
      const chevron = selected.querySelector(".chevron-icon");
      if (chevron) chevron.style.transform = "rotate(0deg)";
    }
  });
};

initNavLanguage();

// ─── RENDER PAGE ──────────────────────────────────────────────────
const contentArea = document.querySelector(".content");

// 404 Page Template
const NotFoundPage = `
    <div class="error-container">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Sahifa topilmadi</h2>
        <p class="error-message">Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.</p>
        <button class="go-home-btn" id="error-go-home">Asosiy sahifaga qaytish</button>
    </div>
`;

// Helper to attach event for 404 button
const attachNotFoundEvents = () => {
  const btn = document.getElementById("error-go-home");
  if (btn) btn.onclick = () => navigateTo("/tasks");
};

const renderPage = (pageName) => {
  if (pageName === "Tests") {
    contentArea.innerHTML = DashboardPage();
    initDashboardLogic();
  } else if (pageName === "Payments") {
    contentArea.innerHTML = BusinessPage;
    initBusinessLogic();
  } else if (pageName === "Tasks") {
    contentArea.innerHTML = TodoPage;
    initTodoLogic();
  } else if (pageName === "Vacations") {
    contentArea.innerHTML = VacationsPage;
    initVacationsLogic();
  } else if (pageName === "Employees") {
    contentArea.innerHTML = EmployeesPage;
    initEmployeesPage();
  } else if (pageName === "Messenger") {
    contentArea.innerHTML = MassangerPage;
    initMessengerLogic();
  } else if (pageName === "Infoportal") {
    contentArea.innerHTML = InfoPortalPage;
    initInfoPortalLogic();
  } else if (pageName === "user-profile") {
    userProfileRender();
  } else {
    contentArea.innerHTML = NotFoundPage;
    attachNotFoundEvents();
    return;
  }

  // Update Active Link in Sidebar
  document.querySelectorAll(".nav-menu li").forEach((link) => {
    const pageID = link.getAttribute("data-page");
    link.classList.toggle("active", pageID === pageName);
  });

  // ── Page render bo'lgandan keyin permissions qo'llash ──
  const cu = getCurrentUser();
  if (cu) {
    applyPermissions(cu.userId || cu._id);
  }
};

const navigateTo = (path, pushState = true) => {
  const pageName = ROUTES[path] || "NotFound";

  if (pushState) {
    window.history.pushState({ path, pageName }, pageName, path);
  }

  renderPage(pageName);
};

window.addEventListener("popstate", (e) => {
  const path = window.location.pathname;
  navigateTo(path, false);
});

// ─── BOSHLANG'ICH YUKLASH (ASYNC) ────────────────────────────────

const initNavigation = async () => {
  // 1. Server'dan current user olish
  const cu = await fetchCurrentUser();

  if (cu) {
    // 2. Sidebar'dagi user ismini va avatarni yangilash
    const nameEl = document.querySelector(".nav-user-name");
    if (nameEl) nameEl.textContent = cu.username || userName;

    // 3. Avatar serverdan olish
    try {
      const uId = cu.userId || cu._id;
      const res = await fetch(`${API_URL}/api/user-photos/${uId}?type=image`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const file = await res.json();
        if (file && file.fileData) {
          const sideAvatar = document.querySelector(".nav-user-avatar");
          if (sideAvatar) sideAvatar.src = file.fileData;
          // Update cached user with avatar
          setCurrentUser({ ...cu, avatar: file.fileData });
        }
      }
    } catch (err) {
      console.error("Failed to fetch nav avatar:", err);
    }

    // 4. Permissions qo'llash
    await applyPermissions(cu.userId || cu._id);
  }

  // 5. Sahifani URL orqali yuklash
  navigateTo(initialPath, false);
};

initNavigation();

// ─── NAV CLICK EVENTS ─────────────────────────────────────────────
const navLinks = document.querySelectorAll(".nav-menu li");

const PATH_MAP = {
  Tests: "/tests",
  Payments: "/payments",
  Tasks: "/tasks",
  Vacations: "/vacations",
  Employees: "/employees",
  Messenger: "/messenger",
  Infoportal: "/calendar",
};

navLinks.forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    const pageID = link.getAttribute("data-page");
    const targetPath = PATH_MAP[pageID] || "/";

    // Bloklangan sahifaga o'tishga urinish — oldini olish
    const cu = getCurrentUser();
    if (cu) {
      const permKey = NAV_PERM_MAP[pageID];
      if (permKey) {
        const perms = await getPermissions(cu.userId || cu._id);
        if (perms[permKey] === false) {
          return;
        }
      }
    }

    navigateTo(targetPath);
  });
});

// ─── PROFILE DROPDOWN LOGIC ───────────────────────────────────────
const profileContainer = document.querySelector(".profile-menu-container");
if (profileContainer) {
  const profileBtn = profileContainer.querySelector(".sidebar-profile");
  const dropdown = profileContainer.querySelector(".profile-dropdown");
  const chevron = profileContainer.querySelector(".chevron-icon");

  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === "flex";
    dropdown.style.display = isOpen ? "none" : "flex";
    chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  document.addEventListener("click", (e) => {
    if (!profileContainer.contains(e.target)) {
      dropdown.style.display = "none";
      chevron.style.transform = "rotate(0deg)";
    }
  });

  document.getElementById("go-to-profile").onclick = () => {
    navigateTo("/profile");
    dropdown.style.display = "none";
    chevron.style.transform = "rotate(0deg)";
  };

  document.getElementById("sidebar-logout").onclick = () => {
    clearAuth();
    window.location.href = "login.html";
  };
}

// ─── LOGO CLICK EVENT ─────────────────────────────────────────────
const logoLink = document.getElementById("nav-logo-link");
if (logoLink) {
  logoLink.onclick = (e) => {
    e.preventDefault();
    navigateTo("/tasks");
  };
}
