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
import { getCurrentLang, setLanguage, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";

const navigationWrapper = document.querySelector(".navigation-wrapper");
const contentArea = document.querySelector(".content");

// Placeholder values — will be updated after fetchCurrentUser
let userAvatar = "/assets/images/User-avatar.png";
let userName = getCurrentLang() === "uz" ? "Foydalanuvchi" : "User";

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

const t = (key) => {
  const lang = getCurrentLang();
  return translations[lang][key] || key;
};

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
  "/": "Tasks",
  "/tests": "Tests",
  "/payments": "Payments",
  "/tasks": "Tasks",
  "/index.html": "Tasks",
  "/index": "Tasks",
  "/vacations": "Vacations",
  "/employees": "Employees",
  "/messenger": "Messenger",
  "/calendar": "Infoportal",
  "/profile": "user-profile",
};

const PATH_MAP = {
  Tests: "/tests",
  Payments: "/payments",
  Tasks: "/tasks",
  Vacations: "/vacations",
  Employees: "/employees",
  Messenger: "/messenger",
  Infoportal: "/calendar",
};

// ─── NAV HTML ─────────────────────────────────────────────────────
const renderNavigation = () => {
    const lang = getCurrentLang();
    const currentPageName = ROUTES[window.location.pathname] || "Tasks";
    const cu = getCurrentUser();
    
    const displayAvatar = cu?.avatar || userAvatar;
    const displayName = cu?.username || (lang === "uz" ? "Foydalanuvchi" : "User");

    navigationWrapper.innerHTML = `
    <div class="nav-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <a href="/tasks" id="nav-logo-link"><img src="/assets/images/logo-blue.svg" alt="" /></a>
        
        <div class="custom-select" id="nav-language-selector">
            <div class="selected">
                <img src="/assets/images/${lang === 'uz' ? 'uzb-flag.png' : lang === 'en' ? 'usa-flag.png' : 'rus-flag.png'}" alt="" />
                <span>${lang.toUpperCase()}</span>
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
        <li data-page="Tasks" data-perm="nav_tasks" class="${currentPageName === "Tasks" ? "active" : ""}">
            <a href="#calendar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M7 2C7 1.44772 7.44772 1 8 1C8.55228 1 9 1.44772 9 2V3H15V2C15 1.44772 15.4477 1 16 1C16.5523 1 17 1.44772 17 2V3C19.2091 3 21 4.79086 21 7V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V7C3 4.79086 4.79086 3 7 3V2ZM15 5C15 5.55228 15.4477 6 16 6C16.5523 6 17 5.55228 17 5L17.1493 5.00549C18.1841 5.08183 19 5.94564 19 7V8H5V7L5.00549 6.85074C5.08183 5.81588 5.94564 5 7 5C7 5.55228 7.44772 6 8 6C8.55228 6 9 5.55228 9 5H15Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_calendar")}</span>
            </a>
        </li>

        <!--
        <li data-page="Vacations" data-perm="nav_vacations" class="${currentPageName === "Vacations" ? "active" : ""}">
            <a href="#vacations">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M15.5066 8.79191L15.4969 4.00276C15.4974 2.34482 14.1559 1.00046 12.5007 1.00004C10.8455 0.999621 9.50339 2.34331 9.50297 4.00125L9.49337 8.79191L3.09998 12.0137C2.42549 12.3535 2 13.0444 2 13.7997V14.8043C2 15.426 2.56138 15.8971 3.17369 15.7891L9.49245 14.6746V17.2007L8.45276 18.4579C8.15621 18.8164 7.99396 19.2672 7.99396 19.7325V20.7663C7.99396 21.4018 8.57916 21.8762 9.20099 21.7446L12.5007 21.0463L15.7769 21.7431C16.399 21.8754 16.9849 21.401 16.9849 20.765V19.7256C16.9849 19.2645 16.8256 18.8175 16.5339 18.4604L15.5075 17.2039V14.6746L21.8263 15.7891C22.4386 15.8971 23 15.426 23 14.8043V13.7997C23 13.0444 22.5745 12.3535 21.9 12.0137L15.5066 8.79191Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_vacations")}</span>
            </a>
        </li>
        -->

        <li data-page="Employees" data-perm="nav_employees" class="${currentPageName === "Employees" ? "active" : ""}">
            <a href="#employees">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M14.027 8.03308C14.7517 10.4277 13.8183 13.0131 11.7294 14.3971C13.4634 15.0352 14.9621 16.1837 16.027 17.6906C16.19 17.9215 16.2104 18.2237 16.0801 18.4744C15.9497 18.725 15.6902 18.8823 15.4071 18.8823L1.75828 18.8829C1.47518 18.8829 1.21565 18.7256 1.08524 18.4749C0.954832 18.2243 0.975266 17.9221 1.13823 17.6912C2.20309 16.184 3.702 15.0353 5.43628 14.3971C3.34738 13.0131 2.41395 10.4277 3.13865 8.03308C3.86334 5.63846 6.07507 4 8.58282 4C11.0906 4 13.3023 5.63846 14.027 8.03308ZM21.4726 7.30772C22.6404 9.8439 21.7852 12.8506 19.456 14.3971C21.1901 15.0352 22.6888 16.1837 23.7536 17.6906C23.9166 17.9215 23.9371 18.2237 23.8067 18.4743C23.6763 18.725 23.4169 18.8823 23.1338 18.8823L18.8951 18.8829C18.6006 18.8829 18.3326 18.7128 18.208 18.4465C17.6254 17.2007 16.8052 16.0799 15.7931 15.1467C15.778 15.1327 15.7643 15.118 15.7506 15.1032C15.4859 14.8622 15.2093 14.6345 14.9219 14.4211C14.6069 14.1874 14.5228 13.7527 14.728 13.4189C16.2618 10.921 16.1176 7.74356 14.364 5.39396C14.2149 5.19423 14.174 4.93413 14.2545 4.69844C14.335 4.46275 14.5266 4.28168 14.7669 4.21426C17.4607 3.45957 20.3047 4.77155 21.4726 7.30772Z"
                        fill="currentColor"/>
                </svg>
                <span>${t("nav_employees")}</span>
            </a>
        </li>
    </ul>

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
            <img src="${displayAvatar}" class="nav-user-avatar" alt="Avatar" />
            <span class="nav-user-name">${displayName}</span>
            <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
        </div>
    </div>
    `;

    // Re-attach all events
    initNavLanguage();
    attachNavClickEvents();
    attachProfileEvents();
    attachLogoEvent();
};

const initNavLanguage = () => {
    const select = document.getElementById("nav-language-selector");
    if (!select) return;

    const selected = select.querySelector(".selected");
    const options = select.querySelector(".options");
    const items = select.querySelectorAll(".options li");

    selected.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = options.style.display === "block";
        options.style.display = isOpen ? "none" : "block";
        const chevron = selected.querySelector(".chevron-icon");
        if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });

    items.forEach((item) => {
        item.addEventListener("click", () => {
            const lang = item.dataset.value;
            setLanguage(lang);
            
            const calEventsDate = document.getElementById("cal-events-date");
            if (calEventsDate?.textContent) {
                localStorage.setItem("cal_selected_date", calEventsDate.textContent);
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!select.contains(e.target)) {
            options.style.display = "none";
            const chevron = selected.querySelector(".chevron-icon");
            if (chevron) chevron.style.transform = "rotate(0deg)";
        }
    });
};

const attachNavClickEvents = () => {
    const navLinks = document.querySelectorAll(".nav-menu li");
    navLinks.forEach((link) => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            const pageID = link.getAttribute("data-page");
            const targetPath = PATH_MAP[pageID] || "/";
            const cu = getCurrentUser();
            if (cu) {
                const permKey = NAV_PERM_MAP[pageID];
                if (permKey) {
                    const perms = await getPermissions(cu.userId || cu._id);
                    if (perms[permKey] === false) return;
                }
            }
            navigateTo(targetPath);
        });
    });
};

const attachProfileEvents = () => {
    const profileContainer = document.querySelector(".profile-menu-container");
    if (!profileContainer) return;
    const profileBtn = profileContainer.querySelector(".sidebar-profile");
    const dropdown = profileContainer.querySelector(".profile-dropdown");
    const chevron = profileContainer.querySelector(".chevron-icon");

    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === "flex";
        dropdown.style.display = isOpen ? "none" : "flex";
        chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });

    document.getElementById("go-to-profile").onclick = () => {
        dropdown.style.display = "none";
        chevron.style.transform = "rotate(0deg)";
        navigateTo("/profile");
    };

    document.getElementById("sidebar-logout").onclick = () => {
        clearAuth();
        window.location.href = "login.html";
    };

    document.addEventListener("click", (e) => {
        if (!profileContainer.contains(e.target)) {
            dropdown.style.display = "none";
            chevron.style.transform = "rotate(0deg)";
        }
    });
};

const attachLogoEvent = () => {
    const logoLink = document.getElementById("nav-logo-link");
    if (logoLink) {
        logoLink.onclick = (e) => {
            e.preventDefault();
            navigateTo("/tasks");
        };
    }
};

const NotFoundPage = `
    <div class="error-container">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Sahifa topilmadi</h2>
        <p class="error-message">Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.</p>
        <button class="go-home-btn" id="error-go-home">Asosiy sahifaga qaytish</button>
    </div>
`;

const renderPage = (pageName) => {
  if (pageName === "Tests") {
    contentArea.innerHTML = DashboardPage();
    initDashboardLogic();
  } else if (pageName === "Payments") {
    contentArea.innerHTML = BusinessPage();
    initBusinessLogic();
  } else if (pageName === "Tasks") {
    contentArea.innerHTML = TodoPage();
    initTodoLogic();
  } else if (pageName === "Vacations") {
    contentArea.innerHTML = '<div class="vac-wrap"></div>';
  } else if (pageName === "Employees") {
    contentArea.innerHTML = EmployeesPage();
    initEmployeesPage();
  } else if (pageName === "Messenger") {
    contentArea.innerHTML = MassangerPage();
    initMessengerLogic();
  } else if (pageName === "Infoportal") {
    contentArea.innerHTML = InfoPortalPage();
    initInfoPortalLogic();
  } else if (pageName === "user-profile") {
    userProfileRender();
  } else {
    contentArea.innerHTML = NotFoundPage;
    const btn = document.getElementById("error-go-home");
    if (btn) btn.onclick = () => navigateTo("/tasks");
    return;
  }

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
  
  // Update active links
  document.querySelectorAll(".nav-menu li").forEach((link) => {
    const pageID = link.getAttribute("data-page");
    link.classList.toggle("active", pageID === pageName);
  });
};

window.addEventListener("popstate", (e) => {
  const path = window.location.pathname;
  navigateTo(path, false);
});

const initNavigation = async () => {
  const cu = await fetchCurrentUser();
  
  // 1. Initial render of navigation structure (required for applyPermissions to find elements)
  renderNavigation();

  if (cu) {
    // 2. Fetch profile picture separately if not in user object
    try {
      const uId = cu.userId || cu._id;
      const res = await fetch(`${API_URL}/api/user-photos/${uId}?type=image`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const file = await res.json();
        if (file && file.fileData) {
          setCurrentUser({ ...cu, avatar: file.fileData });
          // Re-render to show new avatar
          renderNavigation();
        }
      }
    } catch (err) {
      console.error("Failed to fetch nav avatar:", err);
    }
    
    // 3. Apply permissions to the now-rendered navigation items
    await applyPermissions(cu.userId || cu._id);
  }

  // 4. Initial page load
  navigateTo(window.location.pathname, false);
};

const handleLanguageChange = () => {
    renderNavigation();
    const currentPath = window.location.pathname;
    const pageName = ROUTES[currentPath] || "NotFound";
    renderPage(pageName);
};

document.addEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);

initNavigation();
