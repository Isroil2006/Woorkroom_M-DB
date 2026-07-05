import { SAMPLE_TOURS } from "../Vacations/card-default-data.js";
import { getCurrentLang, createTranslationHelper, LANGUAGE_CHANGED_EVENT } from "../../assets/js/i18n.js";
import { API_URL as BASE_URL, getAuthHeaders, getCurrentUser } from "../../assets/js/api.js";

const API_URL = `${BASE_URL}/api/tasks`;

const getUsers = () => JSON.parse(localStorage.getItem("users")) || [];
const getCurrent = () => getCurrentUser();
const getProjects = () => JSON.parse(localStorage.getItem("todo_projects")) || [];
const getMyTests = () => JSON.parse(localStorage.getItem("myTests")) || [];

const EVENT_TYPES = {
  PAYMENT_SENT: "payment_sent",
  PAYMENT_RECEIVED: "payment_received",
  TEST_COMPLETED: "test_completed",
  VACATION_BOOKED: "vacation_booked",
  TASK_ASSIGNED: "task_assigned",
  TASK_DUE: "task_due",
};

const eventColors = {
  [EVENT_TYPES.PAYMENT_SENT]: {
    bg: "#fee2e2",
    border: "#ef4444",
    text: "#dc2626",
  },
  [EVENT_TYPES.PAYMENT_RECEIVED]: {
    bg: "#dcfce7",
    border: "#22c55e",
    text: "#16a34a",
  },
  [EVENT_TYPES.TEST_COMPLETED]: {
    bg: "#eef0fd",
    border: "#5b6ef5",
    text: "#4f46e5",
  },
  [EVENT_TYPES.VACATION_BOOKED]: {
    bg: "#d1fae5",
    border: "#10b981",
    text: "#059669",
  },
  [EVENT_TYPES.TASK_ASSIGNED]: {
    bg: "#fef3c7",
    border: "#f59e0b",
    text: "#d97706",
  },
  [EVENT_TYPES.TASK_DUE]: { bg: "#fecaca", border: "#ef4444", text: "#dc2626" },
};

const eventIcons = {
  [EVENT_TYPES.PAYMENT_SENT]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
  [EVENT_TYPES.PAYMENT_RECEIVED]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
  [EVENT_TYPES.TEST_COMPLETED]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  [EVENT_TYPES.VACATION_BOOKED]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  [EVENT_TYPES.TASK_ASSIGNED]: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list-icon lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
  [EVENT_TYPES.TASK_DUE]: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list-icon lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
};

const translations = {
  uz: {
    title: "Kalendar",
    today: "Bugun",
    monthNames: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
    dayNames: ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"],
    dayNamesFull: ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"],
    noEvents: "Bu kunda voqealar yo'q",
    month: "Oy",
    week: "Hafta",
    day: "Kun",
    horizontal: "(Horizontal)",
    paymentSent: "O'tkazma",
    paymentReceived: "To'lov",
    testCompleted: "Test",
    vacationBooked: "Sayohat",
    taskAssigned: "Vazifa",
    taskDue: "Muddat",
    result: "Natija",
    price: "Narxi",
    duration: "Davomiyligi",
    days: "kun",
    beach: "Sochili",
    mountain: "Tog'li",
    city: "Shahar",
    nature: "Tabiat",
    ball: "ball",
    priority: "Muhimlik",
    status: "Holat",
    more: "yana",
    task: "Vazifa",
    todo: "Kutilmoqda",
    progress: "Jarayonda",
    done: "Bajarildi",
    cancelled: "Bekor qilindi",
    high: "Yuqori",
    medium: "O'rta",
    low: "Past",
    all_events: "Barchasi",
    tasks: "Vazifalar",
    tests: "Testlar",
    vacations: "Sayohatlar",
    payments: "To'lovlar",
  },
  ru: {
    title: "Календарь",
    today: "Сегодня",
    monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    dayNames: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вск"],
    dayNamesFull: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
    noEvents: "Нет событий",
    month: "Месяц",
    week: "Неделя",
    day: "День",
    horizontal: "(Горизонтальный)",
    paymentSent: "Перевод",
    paymentReceived: "Оплата",
    testCompleted: "Тест",
    vacationBooked: "Путешествие",
    taskAssigned: "Задание",
    taskDue: "Срок",
    result: "Результат",
    price: "Цена",
    duration: "Длительность",
    days: "дней",
    beach: "Пляж",
    mountain: "Горы",
    city: "Город",
    nature: "Природа",
    ball: "баллов",
    priority: "Приоритет",
    status: "Статус",
    more: "еще",
    task: "Задача",
    todo: "В ожидании",
    progress: "В процессе",
    done: "Готово",
    cancelled: "Отменено",
    high: "Высокий",
    medium: "Средний",
    low: "Низкий",
    all_events: "Все",
    tasks: "Задачи",
    tests: "Тесты",
    vacations: "Путешествия",
    payments: "Платежи",
  },
  en: {
    title: "Calendar",
    today: "Today",
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    dayNamesFull: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    noEvents: "No events",
    month: "Month",
    week: "Week",
    day: "Day",
    horizontal: "(Horizontal)",
    paymentSent: "Transfer",
    paymentReceived: "Payment",
    testCompleted: "Test",
    vacationBooked: "Trip",
    taskAssigned: "Task",
    taskDue: "Deadline",
    result: "Result",
    price: "Price",
    duration: "Duration",
    days: "days",
    beach: "Beach",
    mountain: "Mountain",
    city: "City",
    nature: "Nature",
    ball: "ball",
    priority: "Priority",
    status: "Status",
    more: "more",
    task: "Task",
    todo: "To Do",
    progress: "In Progress",
    done: "Done",
    cancelled: "Cancelled",
    high: "High",
    medium: "Medium",
    low: "Low",
    all_events: "All Events",
    tasks: "Tasks",
    tests: "Tests",
    vacations: "Vacations",
    payments: "Payments",
  },
};

const t = createTranslationHelper(translations);

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === "object") return dateStr;

  if (typeof dateStr === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split(".").map(Number);
      return new Date(y, m - 1, d);
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
};

const dateToString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const collectAllEvents = async () => {
  const events = [];
  const currentLangLocal = getCurrentLang();

  try {
    const res = await fetch(`${API_URL}/all`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const tasks = await res.json();

    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        const dueDate = parseDate(task.dueDate);
        const startDate = parseDate(task.startDate) || dueDate;

        if (dueDate) {
          events.push({
            id: `task_${task._id}`,
            type: EVENT_TYPES.TASK_DUE,
            title: task.title,
            startDate: startDate,
            endDate: dueDate,
            date: dateToString(dueDate),
            dateObj: dueDate,
            timeStr: task.time || "",
            status: task.status,
            userStatus: task.userStatus || {},
            createdBy: task.createdBy?._id || task.createdBy,
            priority: task.priority,
            project: task.project?.name || "No Project",
            assignees: task.assignees || [],
          });
        }
      });
    }

    // Yana testlarni ham yuklab olish
    const resTests = await fetch(`${BASE_URL}/api/tests/assigned`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    
    if (resTests.ok) {
        const tests = await resTests.json();
        if (Array.isArray(tests)) {
            tests.forEach((t) => {
                const startDate = parseDate(t.validFrom);
                const endDate = parseDate(t.validUntil);
                if (startDate && endDate) {
                    events.push({
                        id: `test_${t._id}`,
                        type: EVENT_TYPES.TEST_COMPLETED, // Test event type sifatida ishlatsak bo'ladi (yoki yangi yaratish)
                        title: `Test: ${t.title}`,
                        startDate: startDate,
                        endDate: endDate,
                        date: dateToString(endDate),
                        dateObj: endDate,
                        timeStr: "",
                        status: "todo",
                        userStatus: {},
                        createdBy: t.createdBy,
                        priority: "high",
                        project: "Testlar",
                        assignees: t.assignedUsers || [],
                    });
                }
            });
        }
    }
  } catch (err) {
    console.error("Failed to fetch calendar events:", err);
  }

  // To'lovlarni yuklab olish
  try {
    const resPmt = await fetch(`${BASE_URL}/api/payments/transactions`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (resPmt.ok) {
      const pmtData = await resPmt.json();
      if (Array.isArray(pmtData)) {
        pmtData.forEach((pmt) => {
          const pmtDate = parseDate(pmt.createdAt || pmt.date);
          if (pmtDate) {
            events.push({
              id: `pmt_${pmt._id}`,
              type: pmt.amount >= 0 ? EVENT_TYPES.PAYMENT_RECEIVED : EVENT_TYPES.PAYMENT_SENT,
              title: pmt.desc || pmt.description || `To'lov: ${pmt.amount} UZS`,
              startDate: pmtDate,
              endDate: pmtDate,
              date: dateToString(pmtDate),
              dateObj: pmtDate,
              timeStr: "",
              status: "done",
              priority: "medium",
              project: "To'lovlar",
              assignees: [],
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch payments for calendar:", err);
  }

  // Sayohatlarni yuklab olish
  try {
    const resVac = await fetch(`${BASE_URL}/api/vacations/my-bookings`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (resVac.ok) {
      const vacData = await resVac.json();
      if (vacData && vacData.success && Array.isArray(vacData.data)) {
        vacData.data.forEach((booking) => {
          if (booking.status === "pending" || booking.status === "rejected") return;
          let startDate, endDate;
          if (booking.selectedDate && booking.selectedDate.start && booking.selectedDate.end) {
              startDate = parseDate(booking.selectedDate.start);
              endDate = parseDate(booking.selectedDate.end);
          } else {
              startDate = parseDate(booking.createdAt);
              if (startDate && booking.vacationId) {
                  endDate = new Date(startDate);
                  endDate.setDate(endDate.getDate() + (booking.vacationId.days || 1) - 1);
              }
          }

          if (startDate && endDate && booking.vacationId) {
            const vacName = booking.vacationId.name;
            const title = typeof vacName === 'object' ? (vacName[currentLangLocal] || vacName.uz || "Sayohat") : (vacName || "Sayohat");
            
            const now = new Date();
            now.setHours(0,0,0,0);
            const endCompare = new Date(endDate);
            endCompare.setHours(0,0,0,0);
            const isFinished = now > endCompare;

            events.push({
              id: `vac_${booking._id}`,
              type: EVENT_TYPES.VACATION_BOOKED,
              title: title,
              startDate: startDate,
              endDate: endDate,
              date: dateToString(startDate),
              dateObj: startDate,
              timeStr: "",
              status: isFinished ? "done" : (booking.status === "confirmed" ? "progress" : "todo"),
              priority: "high",
              project: "Sayohatlar",
              assignees: [],
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch vacations for calendar:", err);
  }

  return events;
};

const getEventHour = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):/);
  if (match) {
    let hour = parseInt(match[1], 10);
    if (timeStr.toLowerCase().includes("pm") && hour < 12) hour += 12;
    if (timeStr.toLowerCase().includes("am") && hour === 12) hour = 0;
    return Math.min(23, Math.max(0, hour));
  }
  return 0;
};

const getPrioritizedEvents = (events, maxCount = 5) => {
  if (events.length <= maxCount) return events;

  const byType = {};
  events.forEach((e) => {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e);
  });

  let result = [];
  let keys = Object.keys(byType);

  keys.forEach((k) => {
    if (result.length < maxCount && byType[k].length > 0) {
      result.push(byType[k].shift());
    }
  });

  for (let i = 0; i < events.length && result.length < maxCount; i++) {
    const e = events[i];
    if (!result.includes(e)) {
      result.push(e);
    }
  }

  return result;
};

export const InfoPortalPage = () => `
<div class="cal-container">
    <div class="cal-header">
        <div class="cal-header-left">
            <h1 class="cal-title">${t("title")}</h1>
            <div class="cal-view-dropdown" id="cal-view-dropdown">
                <button class="cal-view-btn" id="cal-view-btn">
                    <span id="cal-view-label">${t(currentView)}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="cal-view-menu" id="cal-view-menu">
                    <button class="cal-view-option ${currentView === 'month' ? 'active' : ''}" data-view="month">${t("month")}</button>
                    <button class="cal-view-option ${currentView === 'day' ? 'active' : ''}" data-view="day">${t("day")}</button>
                    <button class="cal-view-option ${currentView === 'horizontal' ? 'active' : ''}" data-view="horizontal">${t("horizontal")}</button>
                </div>
            </div>
            <div class="cal-view-dropdown" id="cal-filter-dropdown" style="margin-left: 10px;">
                <button class="cal-view-btn" id="cal-filter-btn" style="position:relative;" title="${currentFilter.includes('all') || currentFilter.length === 4 ? t('all_events') : currentFilter.map(f => t(f)).join(', ')}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-horizontal-icon lucide-sliders-horizontal"><path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/></svg>
                  ${(!currentFilter.includes('all') && currentFilter.length > 0 && currentFilter.length < 4) ? `
                    <span class="cal-filter-tags" style="display:flex;gap:4px;">${currentFilter.map(f => `<span style="background-color:#F0F2F8; color:#1a1d2e; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:600; white-space:nowrap;">${t(f)}</span>`).join('')}</span>
                    <span class="cal-filter-badge"></span>
                  ` : ''}
                </button>
                <div class="cal-view-menu" id="cal-filter-menu">
                    <div class="cal-filter-option ${currentFilter.includes('all') ? 'active' : ''}" data-filter="all">
                        <input type="checkbox" class="cal-filter-checkbox" data-filter="all" ${currentFilter.includes('all') ? 'checked' : ''}>
                        <span>${t("all_events")}</span>
                    </div>
                    <div class="cal-filter-option ${currentFilter.includes('tasks') ? 'active' : ''}" data-filter="tasks">
                        <input type="checkbox" class="cal-filter-checkbox" data-filter="tasks" ${currentFilter.includes('tasks') ? 'checked' : ''}>
                        <span>${t("tasks")}</span>
                    </div>
                    <div class="cal-filter-option ${currentFilter.includes('tests') ? 'active' : ''}" data-filter="tests">
                        <input type="checkbox" class="cal-filter-checkbox" data-filter="tests" ${currentFilter.includes('tests') ? 'checked' : ''}>
                        <span>${t("tests")}</span>
                    </div>
                    <div class="cal-filter-option ${currentFilter.includes('vacations') ? 'active' : ''}" data-filter="vacations">
                        <input type="checkbox" class="cal-filter-checkbox" data-filter="vacations" ${currentFilter.includes('vacations') ? 'checked' : ''}>
                        <span>${t("vacations")}</span>
                    </div>
                    <div class="cal-filter-option ${currentFilter.includes('payments') ? 'active' : ''}" data-filter="payments">
                        <input type="checkbox" class="cal-filter-checkbox" data-filter="payments" ${currentFilter.includes('payments') ? 'checked' : ''}>
                        <span>${t("payments")}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="cal-header-right">
            <button class="cal-today-btn" id="cal-today-btn">${t("today")}</button>
            <div class="cal-nav">
                <button class="cal-nav-btn" id="cal-prev">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
                <span class="cal-current-month" id="cal-current-month"></span>
                <button class="cal-nav-btn" id="cal-next">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
            </div>
        </div>
    </div>

    <div class="cal-grid-wrapper" id="cal-grid-wrapper">
        <div class="cal-weekdays" id="cal-weekdays"></div>
        <div class="cal-grid" id="cal-grid">
            <div style="display:flex;align-items:center;justify-content:center;grid-column:1/-1;min-height:300px;width:100%;">
                <div class="global-spinner"></div>
            </div>
        </div>
    </div>

    <div class="cal-events-panel" id="cal-events-panel">
        <div class="cal-events-header">
            <h3 id="cal-events-date"></h3>
            <button class="cal-panel-close" id="cal-panel-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        <div class="cal-events-list" id="cal-events-list"></div>
    </div>
    <div class="cal-panel-overlay" id="cal-panel-overlay"></div>
</div>
`;

let viewDate = new Date();
let currentView = "month";
let currentFilter = ["all"];
let selectedDate = null;
let cachedEvents = null;
let expandedDate = null; // Google style popover date

const getCachedEvents = async () => {
  if (!cachedEvents) {
    cachedEvents = await collectAllEvents();
  }
  return cachedEvents;
};

const invalidateCache = () => {
  cachedEvents = null;
};

const getFilteredEvents = async () => {
  const allEvents = await getCachedEvents();
  if (currentFilter.includes("all") || currentFilter.length === 0) return allEvents;
  return allEvents.filter(e => {
    if (currentFilter.includes('tasks') && (e.type === EVENT_TYPES.TASK_DUE || e.type === EVENT_TYPES.TASK_ASSIGNED)) return true;
    if (currentFilter.includes('tests') && e.type === EVENT_TYPES.TEST_COMPLETED) return true;
    if (currentFilter.includes('vacations') && e.type === EVENT_TYPES.VACATION_BOOKED) return true;
    if (currentFilter.includes('payments') && (e.type === EVENT_TYPES.PAYMENT_RECEIVED || e.type === EVENT_TYPES.PAYMENT_SENT)) return true;
    return false;
  });
};

const getEventsForDate = async (dateStr) => {
  const allEvents = await getFilteredEvents();
  const targetDate = parseDate(dateStr);
  return allEvents.filter((e) => {
    const start = e.startDate || e.dateObj || parseDate(e.date);
    const end = e.endDate || e.dateObj || parseDate(e.date);
    if (!start || !end || !targetDate) return false;

    // Normalize dates to midnight for comparison
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e_date = new Date(end).setHours(0, 0, 0, 0);
    const t_date = new Date(targetDate).setHours(0, 0, 0, 0);

    return t_date >= s && t_date <= e_date;
  });
};

const renderCalendar = async () => {
  invalidateCache();
  switch (currentView) {
    case "week":
      await renderWeekView();
      break;
    case "day":
      await renderDayView();
      break;
    case "horizontal":
      await renderHorizontalView();
      break;
    default:
      await renderMonthView();
  }
};

const renderMonthView = async () => {
  const grid = document.getElementById("cal-grid");
  const weekdays = document.getElementById("cal-weekdays");
  const monthLabel = document.getElementById("cal-current-month");
  const gridWrapper = document.getElementById("cal-grid-wrapper");
  if (!grid || !monthLabel || !weekdays) return;

  gridWrapper.className = "cal-grid-wrapper";
  grid.className = "cal-grid month-grid";
  weekdays.innerHTML = t("dayNames")
    .map((day) => `<div class="cal-weekday">${day}</div>`)
    .join("");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  monthLabel.textContent = `${t("monthNames")[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // ✅ Dushanbadan boshlash uchun offset: 0=Yak→6, 1=Dush→0, 2=Sesh→1, ...
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = dateToString(today);

  const totalCells = startDay + daysInMonth;
  let html = "";

  for (let i = 0; i < startDay; i++) {
    html += `<div class="cal-day cal-day-empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = dateToString(date);
    const isToday = dateStr === todayStr;
    const isSelected = selectedDate === dateStr;

    const dayEvents = await getEventsForDate(dateStr);

    const isExpanded = expandedDate === dateStr;
    const dayClasses = [
      "cal-day",
      isToday ? "cal-day-today" : "",
      isSelected ? "cal-day-selected" : "",
      isExpanded ? "is-expanded" : ""
    ].filter(Boolean).join(" ");

    let barsHtml = "";
    if (dayEvents.length > 0) {
      const sortedEvents = dayEvents.sort((a, b) => {
        // Done tasks go to the bottom
        if (a.status === "done" && b.status !== "done") return 1;
        if (a.status !== "done" && b.status === "done") return -1;

        const aLen = a.endDate - a.startDate || 0;
        const bLen = b.endDate - b.startDate || 0;
        return bLen - aLen;
      });

      // Show tasks on all days between start and end (filter out payments from being shown as bars)
      const filteredEvents = sortedEvents.filter(e => e.type !== EVENT_TYPES.PAYMENT_RECEIVED && e.type !== EVENT_TYPES.PAYMENT_SENT);

      if (filteredEvents.length > 0) {
        const maxVisible = 2;
        const visible = filteredEvents.slice(0, maxVisible);
        const moreCount = filteredEvents.length - maxVisible;

        const renderBar = (e) => {
          const start = new Date(e.startDate).setHours(0, 0, 0, 0);
          const end = new Date(e.endDate).setHours(0, 0, 0, 0);
          const curr = date.getTime();
          const isEnd = curr === end;

          const statusColors = {
            todo: { bg: "#f0f3ff", border: "#dbe4ff", text: "#313b5e" },
            progress: { bg: "#e0f2fe", border: "#bae6fd", text: "#0369a1" },
            done: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
            cancelled: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
          };

          const cu = getCurrent();
          const cuId = String(cu?.userId || cu?._id || "");
          const isAuthor = String(e.createdBy || "") === cuId;
          
          let visibleStatus = e.status;
          if (isAuthor) {
            visibleStatus = e.status;
          } else if (e.userStatus && e.userStatus[cuId] === "done") {
            visibleStatus = "done";
          }

          let cfg = statusColors[visibleStatus] || statusColors.todo;
          if (e.type === EVENT_TYPES.VACATION_BOOKED) cfg = eventColors[e.type] || cfg;
          else if (isEnd) cfg = { bg: "#fff5f5", border: "#fecaca", text: "#991b1b" };

          const isDone = visibleStatus === "done";
          const classes = ["cal-task-bar", isEnd ? "is-deadline" : "", isDone ? "is-done" : ""].join(" ");

          let icon = isEnd
            ? `<svg class="cal-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V2l8 4-8 4"/><path d="M20.561 10.222a9 9 0 1 1-12.55-5.29"/><path d="M8.002 9.997a5 5 0 1 0 8.9 2.02"/></svg>`
            : `<svg class="cal-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/></svg>`;

          if (isDone) {
            icon = `<svg class="cal-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>`;
          }

          const label = isEnd ? `${t("taskDue")}: ${e.title}` : e.title;

          return `
            <div class="${classes}" style="background-color: ${cfg.bg}; color: ${cfg.text}; border: 1px solid ${cfg.border}" title="${e.title} (${e.project})">
              ${icon} <span class="cal-task-text">${label}</span>
            </div>
          `;
        };
        const cellIndex = startDay + day;
        const totalRows = Math.ceil(totalCells / 7);
        const currentRow = Math.ceil(cellIndex / 7);
        const openUp = currentRow > totalRows / 2;

        barsHtml = `
          <div class="cal-day-content">
            <div class="cal-bars-list">
              ${visible.map(renderBar).join("")}
              ${moreCount > 0 ? `<button class="cal-more-btn" data-date="${dateStr}">+${moreCount} ${t("more") || "yana"}</button>` : ""}
            </div>
            
            ${isExpanded ? `
              <div class="cal-day-popover active ${openUp ? "open-up" : ""}">
                <div class="popover-header">
                  <div class="popover-date-info">
                     <span class="popover-day-name">${t("dayNamesFull")[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
                     <span class="popover-day-num">${day}</span>
                  </div>
                  <button class="popover-close" data-date="${dateStr}">&times;</button>
                </div>
                <div class="popover-body">
                  ${filteredEvents.map(renderBar).join("")}
                </div>
              </div>
            ` : ""}
          </div>
        `;
      }
    }

    const hasPayments = dayEvents.some(e => e.type === EVENT_TYPES.PAYMENT_RECEIVED || e.type === EVENT_TYPES.PAYMENT_SENT);
    const moneyIconHtml = hasPayments ? `<span style="color:#10b981; margin-left:5px; display:inline-flex; align-items:center; width:14px; height:14px;" title="To'lovlar mavjud">${eventIcons[EVENT_TYPES.PAYMENT_RECEIVED] || "💰"}</span>` : "";

    html += `
            <div class="${dayClasses}" data-date="${dateStr}">
                <div style="display:flex;align-items:center;margin-bottom:6px;">
                   <span class="cal-day-number" style="margin-bottom:0;">${day}</span>
                   ${moneyIconHtml}
                </div>
                <div class="cal-day-tasks">${barsHtml}</div>
            </div>
        `;
  }

  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remainingCells; i++) {
    html += `<div class="cal-day cal-day-empty"></div>`;
  }

  grid.innerHTML = html;
  attachCalendarEvents();
};

const renderWeekView = async () => {
  const grid = document.getElementById("cal-grid");
  const weekdays = document.getElementById("cal-weekdays");
  const monthLabel = document.getElementById("cal-current-month");
  const gridWrapper = document.getElementById("cal-grid-wrapper");
  if (!grid || !monthLabel || !weekdays) return;

  gridWrapper.className = "cal-grid-wrapper week-view";
  grid.className = "cal-grid week-grid";

  const startOfWeek = new Date(viewDate);
  // ✅ Dushanbadan boshlash: Yakshanba (0) → 6 kun orqaga, boshqalar → dow-1 kun orqaga
  const dow = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dow === 0 ? 6 : dow - 1));

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const startMonth = t("monthNames")[startOfWeek.getMonth()];
  const endMonth = t("monthNames")[endOfWeek.getMonth()];
  const startYear = startOfWeek.getFullYear();
  const endYear = endOfWeek.getFullYear();

  if (startMonth === endMonth) {
    monthLabel.textContent = `${startMonth} ${startYear}`;
  } else {
    monthLabel.textContent = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  }

  // ✅ Hafta kunlari: Dush(1)...Yak(0) tartibida, dayNames[0]=Dush
  const weekDayOrder = [1, 2, 3, 4, 5, 6, 0]; // JS getDay() qiymatlari
  let daysHtml = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    daysHtml += `<div class="cal-weekday ${isToday ? "today" : ""}">
            <span class="cal-weekday-name">${t("dayNames")[i]}</span>
            <span class="cal-weekday-date">${d.getDate()}</span>
        </div>`;
  }
  weekdays.innerHTML = daysHtml;

  let html = "";
  for (let hour = 0; hour < 24; hour++) {
    html += `<div class="cal-time-row">
            <div class="cal-time-label">${hour.toString().padStart(2, "0")}:00</div>`;

    for (let day = 0; day < 7; day++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + day);
      const dateStr = dateToString(d);
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();

      let cellContent = "";
      const dayEvents = await getEventsForDate(dateStr);
      const hourEvents = dayEvents.filter((e) => getEventHour(e.timeStr) === hour);
      if (hourEvents.length > 0) {
        const prioritized = getPrioritizedEvents(hourEvents, 5);
        cellContent = prioritized
          .map((e) => `<span class="cal-event-icon" style="color: ${eventColors[e.type]?.text || "#666"}" title="${e.title}">${eventIcons[e.type] || eventIcons[EVENT_TYPES.TASK_DUE]}</span>`)
          .join("");
      }

      html += `<div class="cal-time-cell ${isToday ? "today" : ""}" data-date="${dateStr}" data-hour="${hour}">
                ${cellContent}
            </div>`;
    }
    html += "</div>";
  }

  grid.innerHTML = html;
  attachCalendarEvents();
};

const renderDayView = async () => {
  const grid = document.getElementById("cal-grid");
  const weekdays = document.getElementById("cal-weekdays");
  const monthLabel = document.getElementById("cal-current-month");
  const gridWrapper = document.getElementById("cal-grid-wrapper");
  if (!grid || !monthLabel || !weekdays) return;

  gridWrapper.className = "cal-grid-wrapper week-view";
  grid.className = "cal-grid day-grid";

  // ✅ dayNamesFull endi Dushanbadan boshlanadi, shuning uchun indeksni to'g'irlash kerak
  // getDay(): 0=Yak, 1=Dush, ..., 6=Shan
  // dayNamesFull: [0]=Dush, [1]=Sesh, ..., [5]=Shan, [6]=Yak
  const dayOfWeek = viewDate.getDay();
  const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  monthLabel.textContent = `${t("dayNamesFull")[dayNameIndex]}, ${t("monthNames")[viewDate.getMonth()]} ${viewDate.getDate()}, ${viewDate.getFullYear()}`;

  weekdays.innerHTML = `<div class="cal-weekday today">
        <span class="cal-weekday-name">${t("dayNamesFull")[dayNameIndex]}</span>
        <span class="cal-weekday-date">${viewDate.getDate()}</span>
    </div>`;

  const dateStr = dateToString(viewDate);
  const dayEvents = await getEventsForDate(dateStr);

  let html = "";
  
  // All day tasks section
  let allDayContent = "";
  if (dayEvents.length > 0) {
    allDayContent = dayEvents
      .map(
        (e) => `<div class="cal-all-day-task" data-id="${e.id}" style="border-left: 3px solid ${eventColors[e.type]?.bg || '#5b6ef5'}">
           <span class="cal-all-day-project-badge">${e.project && e.project !== "No Project" ? e.project : "Loyiha biriktirilmagan"}</span>
           <span class="cal-all-day-title">${e.title}</span>
        </div>`
      )
      .join("");
  }
  
  html += `<div class="cal-time-row cal-all-day-row">
          <div class="cal-time-label" style="font-size: 11px; font-weight: 600; color: #64748b; line-height: 1.2; display: flex; align-items: center; justify-content: center;">Kun davomida</div>
          <div class="cal-time-cell full-width today" data-date="${dateStr}" data-hour="all-day" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; padding: 12px; align-items: center; justify-content: flex-start;">
              ${allDayContent}
          </div>
      </div>`;

  for (let hour = 0; hour < 24; hour++) {
    html += `<div class="cal-time-row">
            <div class="cal-time-label">${hour.toString().padStart(2, "0")}:00</div>
            <div class="cal-time-cell full-width today" data-date="${dateStr}" data-hour="${hour}">
            </div>
        </div>`;
  }

  grid.innerHTML = html;
  attachCalendarEvents();
};

const renderHorizontalView = async () => {
  const grid = document.getElementById("cal-grid");
  const weekdays = document.getElementById("cal-weekdays");
  const monthLabel = document.getElementById("cal-current-month");
  const gridWrapper = document.getElementById("cal-grid-wrapper");
  if (!grid || !monthLabel || !weekdays) return;

  gridWrapper.className = "cal-grid-wrapper gantt-view";
  grid.className = "cal-grid gantt-grid";
  weekdays.innerHTML = ""; // Clear normal weekdays

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  monthLabel.textContent = `${t("monthNames")[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const allEvents = await getFilteredEvents();
  
  const projects = {};
  const oneDayTasksSet = new Set();
  
  allEvents.forEach(e => {
      if (e.type === EVENT_TYPES.PAYMENT_RECEIVED || e.type === EVENT_TYPES.PAYMENT_SENT) return;
      const start = e.startDate || e.dateObj || parseDate(e.date);
      const end = e.endDate || e.dateObj || parseDate(e.date);
      if (!start || !end) return;

      const eStart = new Date(start).setHours(0,0,0,0);
      const eEnd = new Date(end).setHours(0,0,0,0);
      const mStart = firstDay.getTime();
      const mEnd = lastDay.getTime();

      if (eStart <= mEnd && eEnd >= mStart) {
          const projName = e.project || "No Project";
          if (!projects[projName]) projects[projName] = [];
          projects[projName].push(e);

          let sDay = new Date(start).getFullYear() === year && new Date(start).getMonth() === month ? new Date(start).getDate() : 1;
          let eDay = new Date(end).getFullYear() === year && new Date(end).getMonth() === month ? new Date(end).getDate() : daysInMonth;
          sDay = Math.max(1, Math.min(daysInMonth, sDay));
          eDay = Math.max(1, Math.min(daysInMonth, eDay));
          if (sDay === eDay) {
              oneDayTasksSet.add(sDay);
          }
      }
  });

  let gridColumnsStr = "200px";
  for (let d = 1; d <= daysInMonth; d++) {
      if (oneDayTasksSet.has(d)) {
          gridColumnsStr += " minmax(100px, 1fr)";
      } else {
          gridColumnsStr += " minmax(40px, 1fr)";
      }
  }

  let html = `<div class="gantt-header-row" style="grid-template-columns: ${gridColumnsStr};">
      <div class="gantt-proj-col">Project / Task</div>`;
      
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);
      html += `<div class="gantt-day-header ${isToday ? 'gantt-today' : ''}">${d}</div>`;
  }
  html += `</div>`;
  
  const cu = getCurrent();
  const cuId = String(cu?.userId || cu?._id || "");

  Object.keys(projects).sort().forEach(projName => {
      html += `<div class="gantt-project-row" style="grid-template-columns: ${gridColumnsStr};">
          <div class="gantt-project-title">${projName}</div>`;
      for(let d=1; d<=daysInMonth; d++) {
          html += `<div class="gantt-cell"></div>`;
      }
      html += `</div>`;

      const tasks = projects[projName].sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
      
      tasks.forEach(task => {
          const start = new Date(task.startDate || task.dateObj);
          const end = new Date(task.endDate || task.dateObj);
          
          let sDay = start.getFullYear() === year && start.getMonth() === month ? start.getDate() : 1;
          let eDay = end.getFullYear() === year && end.getMonth() === month ? end.getDate() : daysInMonth;
          
          if (start.getTime() > lastDay.getTime() || end.getTime() < firstDay.getTime()) return;
          
          sDay = Math.max(1, Math.min(daysInMonth, sDay));
          eDay = Math.max(1, Math.min(daysInMonth, eDay));
          let span = Math.max(1, (eDay - sDay) + 1);

          const isAuthor = String(task.createdBy || "") === cuId;
          let visibleStatus = task.status;
          if (isAuthor) {
            visibleStatus = task.status;
          } else if (task.userStatus && task.userStatus[cuId] === "done") {
            visibleStatus = "done";
          }
          const isDone = visibleStatus === "done";
          
          const statusColors = {
            todo: { bg: "#f0f3ff", border: "#dbe4ff", text: "#313b5e" },
            progress: { bg: "#e0f2fe", border: "#bae6fd", text: "#0369a1" },
            done: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
            cancelled: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
          };
          let cfg = statusColors[visibleStatus] || statusColors.todo;
          if (task.type === EVENT_TYPES.VACATION_BOOKED) cfg = eventColors[task.type] || cfg;

          html += `<div class="gantt-task-row" style="grid-template-columns: ${gridColumnsStr};">
              <div class="gantt-task-title" title="${task.title}">
                  ${isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'}
                  <span>${task.title}</span>
              </div>`;
              
          for(let d=1; d<=daysInMonth; d++) {
             if (d === sDay) {
                 html += `<div class="gantt-bar-container" style="grid-column: span ${span};">
                     <div class="gantt-task-bar ${isDone?'is-done':''}" style="background-color: ${cfg.bg}; color: ${cfg.text}; border: 1px solid ${cfg.border}" data-date="${dateToString(end)}">
                        <span class="gantt-bar-label">${task.title}</span>
                     </div>
                 </div>`;
                 d += span - 1;
             } else {
                 html += `<div class="gantt-cell"></div>`;
             }
          }
          html += `</div>`;
      });
  });

  if (Object.keys(projects).length === 0) {
      html += `<div class="cal-no-events" style="padding: 2rem; text-align: center;">${t("noEvents")}</div>`;
  }

  grid.innerHTML = html;
  
  // Custom click handler for gantt bars to open panel
  grid.querySelectorAll('.gantt-task-bar').forEach(bar => {
      bar.addEventListener('click', (e) => {
          e.stopPropagation();
          const d = e.currentTarget.getAttribute('data-date');
          if (d) showEventDetails(d);
      });
  });
};

const showEventDetails = async (dateStr) => {
  const currentLang = getCurrentLang();
  const panel = document.getElementById("cal-events-panel");
  const dateHeader = document.getElementById("cal-events-date");
  const eventsList = document.getElementById("cal-events-list");

  if (!panel || !dateHeader || !eventsList) return;

  selectedDate = dateStr;
  dateHeader.textContent = dateStr;

  panel.classList.add("active");
  document.getElementById("cal-panel-overlay")?.classList.add("active");
  
  eventsList.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px;">
        <div style="width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #5b6ef5; border-radius: 50%; animation: cal-spin 0.8s linear infinite;"></div>
        <style>@keyframes cal-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>
  `;

  // Start rendering calendar in background to show selected state immediately
  renderCalendar();

  invalidateCache();
  const events = await getEventsForDate(dateStr);

  if (events.length === 0) {
    eventsList.innerHTML = `<div class="cal-no-events"><p>${t("noEvents")}</p></div>`;
  } else {
    const sortedEvents = events.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return 0;
    });

    eventsList.innerHTML = sortedEvents
      .map((e) => {
        const color = eventColors[e.type] || eventColors[EVENT_TYPES.TASK_DUE];
        const isTask = e.type === EVENT_TYPES.TASK_DUE || e.type === EVENT_TYPES.TASK_ASSIGNED;

        const isPayment = e.type === EVENT_TYPES.PAYMENT_RECEIVED || e.type === EVENT_TYPES.PAYMENT_SENT;
        const isVacation = e.type === EVENT_TYPES.VACATION_BOOKED;

        let typeLabel = "task";
        if (isVacation) typeLabel = "vacationBooked";
        else if (e.type === EVENT_TYPES.PAYMENT_SENT) typeLabel = "paymentSent";
        else if (e.type === EVENT_TYPES.PAYMENT_RECEIVED) typeLabel = "paymentReceived";
        else if (e.type === EVENT_TYPES.TEST_COMPLETED) typeLabel = "testCompleted";

        // Assignee avatars
        const allUsers = getUsers();
        const assigneeAvatars = (e.assignees || []).map(id => {
            const u = allUsers.find(user => user._id === id);
            if (!u) return "";
            const photo = u.photo ? (u.photo.startsWith("http") ? u.photo : `${BASE_URL}/${u.photo}`) : "https://cdn-icons-png.flaticon.com/512/149/149071.png";
            return `<img src="${photo}" class="cal-event-avatar" title="${u.name}">`;
        }).join("");

        const cu = getCurrent();
        const cuId = String(cu?.userId || cu?._id || "");
        const isAuthor = String(e.createdBy || "") === cuId;
        
        let visibleStatus = e.status;
        if (isAuthor) {
          visibleStatus = e.status;
        } else if (e.userStatus && e.userStatus[cuId] === "done") {
          visibleStatus = "done";
        }

        const isDone = visibleStatus === "done";

        const priorityColors = {
            high: { bg: "#fee2e2", text: "#ef4444" },
            medium: { bg: "#fef3c7", text: "#f59e0b" },
            low: { bg: "#dcfce7", text: "#22c55e" }
        };
        const pColor = priorityColors[e.priority?.toLowerCase()] || { bg: "#f1f5f9", text: "#64748b" };

        const borderColor = isDone ? "#22c55e" : color.border;
        const badgeColors = isDone ? { bg: "#dcfce7", text: "#16a34a" } : color;

        let projectIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>`;
        if (isPayment) projectIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
        if (isVacation) projectIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

        let extraStyles = "";
        if (isPayment) {
            extraStyles = `border-left: 4px solid ${color.border}; background: ${color.bg}33;`;
        } else if (isVacation) {
            extraStyles = `border-left: 4px solid ${color.border}; background: ${color.bg}40; border-radius: 12px;`;
        }

        return `
                <div class="cal-event-item ${isDone ? "is-done" : ""}" style="${extraStyles}">
                    <div class="cal-event-item-top">
                        <div class="cal-event-type-badge" style="background: ${badgeColors.bg}; color: ${badgeColors.text}">
                             ${eventIcons[e.type] || eventIcons[EVENT_TYPES.TASK_DUE]}
                             <span>${t(typeLabel)}</span>
                        </div>
                        <div class="cal-event-time">${e.timeStr || (isPayment ? dateToString(e.startDate) : "")}</div>
                    </div>

                    <h4 class="cal-event-item-title" style="${isPayment || isVacation ? 'font-size: 15px; margin-bottom: 8px;' : ''}">${e.title}</h4>
                    
                    <div class="cal-event-item-project">
                        ${projectIcon}
                        <span>${e.project || "No Project"}</span>
                    </div>

                    ${!isPayment && !isVacation ? `
                    <div class="cal-event-item-footer">
                        <div class="cal-event-meta-group">
                            ${e.priority ? `<span class="cal-priority-tag" style="background: ${pColor.bg}; color: ${pColor.text}" title="${t("priority")}">${t("priority")}: ${t(e.priority.toLowerCase())}</span>` : ""}
                            ${e.status ? `<span class="cal-status-tag" title="${t("status")}">${t("status")}: ${t(e.status.toLowerCase())}</span>` : ""}
                        </div>
                        ${assigneeAvatars ? `
                        <div class="cal-event-assignees">
                            ${assigneeAvatars}
                        </div>` : ""}
                    </div>` : ""}
                </div>
            `;
      })
      .join("");
  }
  // Update the calendar again if needed, but it was already called with cache invalidation above
  // so `events` fetch updated the cache. We can just call it once more to ensure everything is perfect.
  renderCalendar();
};

const animateAndRenderCalendar = async () => {
  const grid = document.getElementById("cal-grid");
  const weekdays = document.getElementById("cal-weekdays");
  
  if (grid && weekdays) {
      weekdays.innerHTML = "";
      grid.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: 300px; grid-column: 1 / -1;">
          <div style="width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #5b6ef5; border-radius: 50%; animation: cal-spin 0.8s linear infinite;"></div>
          <style>@keyframes cal-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
      `;
      
      await new Promise(r => setTimeout(r, 200));
      await renderCalendar();
  } else {
      await renderCalendar();
  }
};

export const initInfoPortalLogic = async () => {
  await renderCalendar();

  const savedDate = localStorage.getItem("cal_selected_date");
  if (savedDate) {
    localStorage.removeItem("cal_selected_date");
    setTimeout(() => {
      showEventDetails(savedDate);
    }, 100);
  }

  const handleLanguageChange = () => {
    invalidateCache();

    const titleEl = document.querySelector('.cal-title');
    if (titleEl) titleEl.textContent = t("title");

    const todayBtn = document.getElementById("cal-today-btn");
    if (todayBtn) todayBtn.textContent = t("today");

    const viewLabel = document.getElementById("cal-view-label");
    if (viewLabel) viewLabel.textContent = t(currentView);

    document.querySelectorAll(".cal-view-option").forEach((opt) => {
      if (opt.dataset.view) {
        opt.textContent = t(opt.dataset.view);
      }
    });

    const filterBtn = document.getElementById("cal-filter-btn");
    if (filterBtn) {
      if (currentFilter.includes("all") || currentFilter.length === 0 || currentFilter.length === 4) {
        filterBtn.setAttribute("title", t("all_events"));
      } else {
        filterBtn.setAttribute("title", currentFilter.map(f => t(f)).join(", "));
      }
    }

    document.querySelectorAll(".cal-filter-option").forEach((opt) => {
      if (opt.dataset.filter) {
        const span = opt.querySelector("span");
        if (span) {
          span.textContent = t(opt.dataset.filter === 'all' ? 'all_events' : opt.dataset.filter);
        }
      }
    });

    animateAndRenderCalendar();
    if (selectedDate) {
      showEventDetails(selectedDate);
    }
  };

  document.addEventListener(LANGUAGE_CHANGED_EVENT, handleLanguageChange);

  const viewBtn = document.getElementById("cal-view-btn");
  const viewMenu = document.getElementById("cal-view-menu");

  viewBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    viewMenu?.classList.toggle("active");
  });

  document.addEventListener("click", () => viewMenu?.classList.remove("active"));

  document.querySelectorAll(".cal-view-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".cal-view-option").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      currentView = opt.dataset.view;
      document.getElementById("cal-view-label").textContent = t(currentView);
      viewMenu?.classList.remove("active");
      animateAndRenderCalendar();
    });
  });

  const filterBtn = document.getElementById("cal-filter-btn");
  const filterMenu = document.getElementById("cal-filter-menu");

  filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    filterMenu?.classList.toggle("active");
  });

  filterMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => filterMenu?.classList.remove("active"));

  const filterOptions = document.querySelectorAll(".cal-filter-option");
  filterOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      
      const cb = opt.querySelector(".cal-filter-checkbox");
      if (!cb) return;
      
      if (e.target !== cb) {
        cb.checked = !cb.checked;
      }
      
      const filterVal = cb.dataset.filter;
      
      if (filterVal === "all") {
        if (cb.checked) {
          currentFilter = ["all"];
          filterOptions.forEach((otherOpt) => {
            const otherCb = otherOpt.querySelector(".cal-filter-checkbox");
            if (otherCb && otherCb.dataset.filter !== "all") {
              otherCb.checked = false;
              otherOpt.classList.remove("active");
            }
          });
          opt.classList.add("active");
        } else {
          cb.checked = true;
        }
      } else {
        if (cb.checked) {
          currentFilter = currentFilter.filter(f => f !== "all");
          const allOpt = document.querySelector('.cal-filter-option[data-filter="all"]');
          const allCb = allOpt?.querySelector(".cal-filter-checkbox");
          if (allCb) {
            allCb.checked = false;
            allOpt.classList.remove("active");
          }
          
          if (!currentFilter.includes(filterVal)) {
            currentFilter.push(filterVal);
          }
          opt.classList.add("active");
        } else {
          currentFilter = currentFilter.filter(f => f !== filterVal);
          opt.classList.remove("active");
          
          if (currentFilter.length === 0) {
            currentFilter = ["all"];
            const allOpt = document.querySelector('.cal-filter-option[data-filter="all"]');
            const allCb = allOpt?.querySelector(".cal-filter-checkbox");
            if (allCb) {
              allCb.checked = true;
              allOpt.classList.add("active");
            }
          }
        }
      }
      
      const filterBtn = document.getElementById("cal-filter-btn");
      if (filterBtn) {
        const isAll = currentFilter.includes("all") || currentFilter.length === 4;
        filterBtn.setAttribute("title", isAll ? t("all_events") : currentFilter.map(f => t(f)).join(", "));
        filterBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-horizontal-icon lucide-sliders-horizontal"><path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/></svg>
          ${!isAll ? `
            <span class="cal-filter-tags" style="display:flex;gap:4px;">${currentFilter.map(f => `<span style="background-color:#F0F2F8; color:#1a1d2e; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:600; white-space:nowrap;">${t(f)}</span>`).join('')}</span>
            <span class="cal-filter-badge"></span>
          ` : ''}
        `;
        filterBtn.style.position = "relative";
      }
      
      animateAndRenderCalendar();
    });
  });

  document.getElementById("cal-prev")?.addEventListener("click", () => {
    if (currentView === "week") {
      viewDate.setDate(viewDate.getDate() - 7);
    } else if (currentView === "day") {
      viewDate.setDate(viewDate.getDate() - 1);
    } else {
      viewDate.setMonth(viewDate.getMonth() - 1);
    }
    animateAndRenderCalendar();
  });

  document.getElementById("cal-next")?.addEventListener("click", () => {
    if (currentView === "week") {
      viewDate.setDate(viewDate.getDate() + 7);
    } else if (currentView === "day") {
      viewDate.setDate(viewDate.getDate() + 1);
    } else {
      viewDate.setMonth(viewDate.getMonth() + 1);
    }
    animateAndRenderCalendar();
  });

  document.getElementById("cal-today-btn")?.addEventListener("click", () => {
    viewDate = new Date();
    animateAndRenderCalendar();
  });

  document.getElementById("cal-panel-close")?.addEventListener("click", () => {
    document.getElementById("cal-events-panel")?.classList.remove("active");
    document.getElementById("cal-panel-overlay")?.classList.remove("active");
    selectedDate = null;
    renderCalendar();
  });

  document.getElementById("cal-panel-overlay")?.addEventListener("click", () => {
    document.getElementById("cal-events-panel")?.classList.remove("active");
    document.getElementById("cal-panel-overlay")?.classList.remove("active");
    selectedDate = null;
    renderCalendar();
  });
};

const attachCalendarEvents = () => {
  document.querySelectorAll(".cal-day:not(.cal-day-empty), .cal-time-cell").forEach((el) => {
    el.addEventListener("click", (e) => {
      // Prevent detail modal if more btn or popover clicked
      if (e.target.closest(".cal-more-btn") || e.target.closest(".cal-day-popover")) return;
      
      const dateStr = el.dataset.date;
      if (dateStr) {
        if (window.innerWidth <= 992) {
          // On mobile, switch to day view instead of showing modal directly
          currentView = "day";
          currentDate = new Date(dateStr);
          renderCalendar();
        } else {
          showEventDetails(dateStr);
        }
      }
    });
  });

  // More button
  document.querySelectorAll(".cal-more-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      expandedDate = btn.dataset.date;
      renderMonthView(); // Just re-render month view to show popover
    });
  });

  // Popover close
  document.querySelectorAll(".popover-close").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      expandedDate = null;
      renderMonthView();
    });
  });

  // Global click to close popover
  const handleGlobalClick = (e) => {
    if (expandedDate && !e.target.closest(".cal-day-popover") && !e.target.closest(".cal-more-btn")) {
      expandedDate = null;
      renderMonthView();
      document.removeEventListener("click", handleGlobalClick);
    }
  };
  if (expandedDate) {
    document.addEventListener("click", handleGlobalClick);
  }
};
