import { API_URL, getCurrentUser, fetchCurrentUser, clearAuth, getAuthHeaders, setCurrentUser } from "../../assets/js/api.js";
import { DashboardPage, initDashboardLogic } from "../../pages/Dashboard/dashboard.js";
import { BusinessPage, initBusinessLogic } from "../../pages/Business/business.js";
import { TodoPage, initTodoLogic } from "../../pages/Tasks/tasks.js";
import { VacationsPage, initVacationsLogic } from "../../pages/Vacations/vacations.js";
import { EmployeesPage, initEmployeesPage } from "../../pages/Employees/employees.js";
import { MassangerPage, initMessengerLogic } from "../../pages/Messenger/messenger.js";
import { InfoPortalPage, initInfoPortalLogic } from "../../pages/InfoPortal/infoportal.js";
import { applyPermissions, getPermissions, checkPermission } from "../../pages/Employees/permission.js";
import { userProfileRender } from "../../pages/user-profile/user-profile.js";
import { getCurrentLang, setLanguage, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";
import { UnauthorizedPage, initUnauthorizedLogic } from "../../pages/Unauthorized/Unauthorized.js";
import { NotFoundPageTemplate, initNotFoundLogic } from "../../pages/NotFound/NotFound.js";
import { UnderConstructionPage, initUnderConstructionLogic } from "../../pages/UnderConstruction/UnderConstruction.js";

// To'liq tayyor bo'lmagan sahifalarni true qilib qoyiladi
const UNDER_CONSTRUCTION = {
  Tests: true,
  Payments: true,
  Vacations: true,
  Messenger: true,
  Infoportal: true,
};

const navigationWrapper = document.querySelector(".navigation-wrapper");
const contentArea = document.querySelector(".content");

let userAvatar = "/assets/images/User-avatar.png";
let userName = getCurrentLang() === "uz" ? "Foydalanuvchi" : "User";

export const translations = {
  uz: {
    nav_tests: "Testlar",
    nav_payments: "To'lovlar",
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
    nav_payments: "Payments",
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
    nav_payments: "Платежи",
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
  Payments: "nav_payments",
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

  const displayAvatar = cu?.avatar || (cu?.gender === "Male" ? "/assets/images/user-avatar-male.png" : cu?.gender === "Female" ? "/assets/images/user-avatar-female.png" : userAvatar);
  const displayName = cu?.username || (lang === "uz" ? "Foydalanuvchi" : "User");

  navigationWrapper.innerHTML = `
    <div class="nav-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <a href="/tasks" id="nav-logo-link"><img src="/assets/images/logo-blue.svg" alt="" /></a>
        
        <div class="custom-select" id="nav-language-selector">
            <div class="selected">
                <img src="/assets/images/${lang === "uz" ? "uzb-flag.png" : lang === "en" ? "usa-flag.png" : "rus-flag.png"}" alt="" />
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
        <li data-page="Tasks" data-perm="nav_tasks" class="${currentPageName === "Tasks" ? "active" : ""} loading">
            <a href="#calendar">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check-icon lucide-clipboard-check"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
                <span>${t("nav_calendar")}</span>
            </a>
        </li>

        <li data-page="Tests" data-perm="nav_dashboard" class="${currentPageName === "Tests" ? "active" : ""} loading">
            <a href="#tests">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-check-big-icon lucide-square-check-big"><path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"/><path d="m9 11 3 3L22 4"/></svg>
                <span>${t("nav_tests")}</span>
            </a>
        </li>

        <li data-page="Payments" data-perm="nav_payments" class="${currentPageName === "Payments" ? "active" : ""} loading">
            <a href="#payments">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet-icon lucide-wallet"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
                <span>${t("nav_payments")}</span>
            </a>
        </li>

        <li data-page="Vacations" data-perm="nav_vacations" class="${currentPageName === "Vacations" ? "active" : ""} loading">
            <a href="#vacations">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tickets-plane-icon lucide-tickets-plane"><path d="M10.5 17h1.227a2 2 0 0 0 1.345-.52L18 12"/><path d="m12 13.5 3.794.506"/><path d="m3.173 8.18 11-5a2 2 0 0 1 2.647.993L18.56 8"/><path d="M6 10V8"/><path d="M6 14v1"/><path d="M6 19v2"/><rect x="2" y="8" width="20" height="13" rx="2"/></svg>
                <span>${t("nav_vacations")}</span>
            </a>
        </li>

        <li data-page="Employees" data-perm="nav_employees" class="${currentPageName === "Employees" ? "active" : ""} loading">
            <a href="#employees">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-icon lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
                <span>${t("nav_employees")}</span>
            </a>
        </li>

        <li data-page="Messenger" data-perm="nav_messenger" class="${currentPageName === "Messenger" ? "active" : ""} loading">
            <a href="#messenger">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-messages-square-icon lucide-messages-square"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/></svg>
                <span>${t("nav_messenger")}</span>
            </a>
        </li>

        <li data-page="Infoportal" data-perm="nav_infoportal" class="${currentPageName === "Infoportal" ? "active" : ""} loading">
            <a href="#calendar">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days-icon lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                <span>${t("nav_infoportal")}</span>
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
            <div class="nav-avatar-container">
                <div class="avatar-skeleton" id="nav-avatar-skeleton"></div>
                <img src="${displayAvatar}" class="nav-user-avatar" alt="Avatar" id="nav-user-img" onload="this.classList.add('loaded'); document.getElementById('nav-avatar-skeleton').style.display='none';" />
            </div>
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
          if (!checkPermission(perms, permKey)) return;
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

const renderPage = (pageName) => {
  // 1. Ishlab chiqilmoqda (Maintenance) tekshiruvi
  if (UNDER_CONSTRUCTION[pageName]) {
    contentArea.innerHTML = UnderConstructionPage();
    initUnderConstructionLogic();
    return;
  }

  // 2. Oddiy sahifalar renderi
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
  } else if (pageName === "Unauthorized") {
    contentArea.innerHTML = UnauthorizedPage();
    initUnauthorizedLogic();
  } else if (pageName === "user-profile") {
    userProfileRender();
  } else if (pageName === "NotFound") {
    contentArea.innerHTML = NotFoundPageTemplate();
    initNotFoundLogic();
  } else {
    contentArea.innerHTML = NotFoundPageTemplate();
    initNotFoundLogic();
    return;
  }

  const cu = getCurrentUser();
  if (cu) {
    applyPermissions(cu.userId || cu._id);
  }
};

const navigateTo = async (path, pushState = true) => {
  let pageName = ROUTES[path] || "NotFound";
  const cu = getCurrentUser();

  // Ruxsatni tekshirish
  if (cu && pageName !== "NotFound" && pageName !== "user-profile" && pageName !== "Unauthorized") {
    const permKey = NAV_PERM_MAP[pageName];
    if (permKey) {
      const perms = await getPermissions(cu.userId || cu._id);
      if (perms && !checkPermission(perms, permKey)) {
        pageName = "Unauthorized";
      }
    }
  }

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
  // 1. Foydalanuvchini yuklash (lekin bloklamaslik uchun paralellikka harakat qilamiz)
  const cu = await fetchCurrentUser();

  // 2. Navigatsiyani chizish (Rasm yuklanmagan bo'lsa skeleton chiqadi)
  renderNavigation();

  // 3. Sahifa mazmunini DARXOL yuklash (Rasmni kutmasdan!)
  navigateTo(window.location.pathname, false);

  if (cu) {
    // 4. Rasmni bir oz kechikish (1 sek) bilan yuklash (Priority optimization)
    setTimeout(async () => {
      try {
        const uId = cu.userId || cu._id;
        const res = await fetch(`${API_URL}/api/user-photos/${uId}?type=image`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (res.ok) {
          const file = await res.json();
          if (file && file.fileData) {
            const img = document.getElementById("nav-user-img");
            if (img) {
              img.src = file.fileData;
              setCurrentUser({ ...cu, avatar: file.fileData });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch nav avatar:", err);
      }
    }, 1000);

    // 5. Ruxsatnomalarni qo'llash
    await applyPermissions(cu.userId || cu._id);
  }
};

const handleLanguageChange = () => {
  renderNavigation();
  const currentPath = window.location.pathname;
  const pageName = ROUTES[currentPath] || "NotFound";
  renderPage(pageName);
};

document.addEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);

initNavigation();
