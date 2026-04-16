import { SAMPLE_TOURS } from "../Vacations/card-default-data.js";

const getUsers = () => JSON.parse(localStorage.getItem("users")) || [];
const getCurrent = () => JSON.parse(localStorage.getItem("currentUser"));
const getProjects = () => JSON.parse(localStorage.getItem("todo_projects")) || [];
const getMyTests = () => JSON.parse(localStorage.getItem("myTests")) || [];

const EVENT_TYPES = {
    PAYMENT_SENT: "payment_sent",
    PAYMENT_RECEIVED: "payment_received",
    TEST_COMPLETED: "test_completed",
    VACATION_BOOKED: "vacation_booked",
    TASK_ASSIGNED: "task_assigned",
    TASK_DUE: "task_due"
};

const eventColors = {
    [EVENT_TYPES.PAYMENT_SENT]: { bg: "#fee2e2", border: "#ef4444", text: "#dc2626" },
    [EVENT_TYPES.PAYMENT_RECEIVED]: { bg: "#dcfce7", border: "#22c55e", text: "#16a34a" },
    [EVENT_TYPES.TEST_COMPLETED]: { bg: "#eef0fd", border: "#5b6ef5", text: "#4f46e5" },
    [EVENT_TYPES.VACATION_BOOKED]: { bg: "#d1fae5", border: "#10b981", text: "#059669" },
    [EVENT_TYPES.TASK_ASSIGNED]: { bg: "#fef3c7", border: "#f59e0b", text: "#d97706" },
    [EVENT_TYPES.TASK_DUE]: { bg: "#fecaca", border: "#ef4444", text: "#dc2626" }
};

const eventIcons = {
    [EVENT_TYPES.PAYMENT_SENT]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
    [EVENT_TYPES.PAYMENT_RECEIVED]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
    [EVENT_TYPES.TEST_COMPLETED]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    [EVENT_TYPES.VACATION_BOOKED]: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
    [EVENT_TYPES.TASK_ASSIGNED]: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list-icon lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
    [EVENT_TYPES.TASK_DUE]: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list-icon lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`
};

let currentLang = localStorage.getItem("language") || "uz";

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
        ball: "ball"
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
        ball: "баллов"
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
        ball: "ball"
    }
};

const t = (key) => translations[currentLang]?.[key] ?? translations.uz[key] ?? key;

const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'object') return dateStr;

    if (typeof dateStr === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            const [d, m, y] = dateStr.split('.').map(Number);
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
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
};

const collectAllEvents = () => {
    const events = [];
    const currentLangLocal = localStorage.getItem("language") || "uz";
    const tLocal = (key) => translations[currentLangLocal]?.[key] ?? translations.uz[key] ?? key;
    const currentUser = getCurrent();
    if (!currentUser) return events;

    const users = getUsers();
    const myUser = users.find(u => u.username === currentUser.username);

    if (myUser?.payments) {
        myUser.payments.forEach(payment => {
            const date = parseDate(payment.date);
            if (date) {
                events.push({
                    id: `payment_${payment.docNumber || payment.date}_${Math.random()}`,
                    type: payment.isIncoming ? EVENT_TYPES.PAYMENT_RECEIVED : EVENT_TYPES.PAYMENT_SENT,
                    title: payment.desc || (payment.isIncoming ? tLocal("paymentReceived") : tLocal("paymentSent")),
                    date: dateToString(date),
                    dateObj: date,
                    timeStr: payment.time || "12:00",
                    amount: payment.amount,
                    status: payment.status
                });
            }
        });
    }

    if (myUser?.results) {
        myUser.results.forEach(result => {
            const date = parseDate(result.date);
            if (date) {
                events.push({
                    id: `test_${result.testName}_${result.date}_${Math.random()}`,
                    type: EVENT_TYPES.TEST_COMPLETED,
                    title: result.testName,
                    date: dateToString(date),
                    dateObj: date,
                    timeStr: result.time || "12:00",
                    score: result.score
                });
            }
        });
    }

    const bookings = JSON.parse(localStorage.getItem("vac_bookings") || "[]");
    const allTours = [...SAMPLE_TOURS, ...JSON.parse(localStorage.getItem("vac_tours_v2") || "[]")];
    
    bookings.forEach(booking => {
        if (booking.username === currentUser.username) {
            const startDate = parseDate(booking.bookedAt);
            if (startDate) {
                const duration = booking.tourDays || 7;
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + duration - 1);

                let tourTitle = tLocal("vacationBooked");
                let tourCity = "";
                
                if (booking.tourId) {
                    const tour = allTours.find(t => t.id === booking.tourId);
                    if (tour) {
                        if (tour.name && typeof tour.name === 'object') {
                            tourTitle = tour.name[currentLangLocal] || tour.name.uz || Object.values(tour.name)[0];
                        } else if (tour.name) {
                            tourTitle = tour.name;
                        }
                        if (tour.city && typeof tour.city === 'object') {
                            tourCity = tour.city[currentLangLocal] || tour.city.uz || "";
                        } else if (tour.city) {
                            tourCity = tour.city;
                        }
                    }
                } else if (booking.tourName) {
                    if (typeof booking.tourName === 'object') {
                        tourTitle = booking.tourName[currentLangLocal] || booking.tourName.uz || Object.values(booking.tourName)[0];
                    } else {
                        tourTitle = booking.tourName;
                    }
                }

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dayDate = new Date(d);
                    events.push({
                        id: `vacation_${booking.id}_${dayDate.getTime()}`,
                        type: EVENT_TYPES.VACATION_BOOKED,
                        title: tourTitle + (tourCity ? ` (${tourCity})` : ""),
                        date: dateToString(dayDate),
                        dateObj: dayDate,
                        timeStr: "09:00",
                        duration: duration,
                        price: booking.totalCost
                    });
                }
            }
        }
    });

    const projects = getProjects();
    const cu = getCurrent();
    projects.forEach(project => {
        if (project.tasks) {
            project.tasks.forEach(task => {
                const ids = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
                if (ids.includes(cu?.username) || !ids.length) {
                    const dueDate = parseDate(task.dueDate);
                    if (dueDate) {
                        events.push({
                            id: `task_${task.id}`,
                            type: EVENT_TYPES.TASK_DUE,
                            title: task.title,
                            date: dateToString(dueDate),
                            dateObj: dueDate,
                            timeStr: task.time || "10:00",
                            status: task.status,
                            priority: task.priority
                        });
                    }
                }
            });
        }
    });

    return events;
};

const getEventHour = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):/);
    if (match) {
        let hour = parseInt(match[1], 10);
        if (timeStr.toLowerCase().includes('pm') && hour < 12) hour += 12;
        if (timeStr.toLowerCase().includes('am') && hour === 12) hour = 0;
        return Math.min(23, Math.max(0, hour));
    }
    return 0;
};

const getPrioritizedEvents = (events, maxCount = 5) => {
    if (events.length <= maxCount) return events;

    const byType = {};
    events.forEach(e => {
        if (!byType[e.type]) byType[e.type] = [];
        byType[e.type].push(e);
    });

    let result = [];
    let keys = Object.keys(byType);

    keys.forEach(k => {
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

export const InfoPortalPage = `
<div class="cal-container">
    <div class="cal-header">
        <div class="cal-header-left">
            <h1 class="cal-title">${t("title")}</h1>
            <div class="cal-view-dropdown" id="cal-view-dropdown">
                <button class="cal-view-btn" id="cal-view-btn">
                    <span id="cal-view-label">${t("month")}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="cal-view-menu" id="cal-view-menu">
                    <button class="cal-view-option active" data-view="month">${t("month")}</button>
                    <button class="cal-view-option" data-view="week">${t("week")}</button>
                    <button class="cal-view-option" data-view="day">${t("day")}</button>
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
        <div class="cal-grid" id="cal-grid"></div>
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
</div>
`;

let viewDate = new Date();
let currentView = "month";
let selectedDate = null;
let cachedEvents = null;

const getCachedEvents = () => {
    if (!cachedEvents) {
        cachedEvents = collectAllEvents();
    }
    return cachedEvents;
};

const invalidateCache = () => {
    cachedEvents = null;
};

const getEventsForDate = (dateStr) => {
    const allEvents = getCachedEvents();
    const targetDate = parseDate(dateStr);
    return allEvents.filter(e => {
        const eventDate = e.dateObj || parseDate(e.date);
        if (!eventDate || !targetDate) return false;
        return eventDate.toDateString() === targetDate.toDateString();
    });
};

const renderCalendar = () => {
    invalidateCache();
    switch (currentView) {
        case "week":
            renderWeekView();
            break;
        case "day":
            renderDayView();
            break;
        default:
            renderMonthView();
    }
};

const renderMonthView = () => {
    const grid = document.getElementById("cal-grid");
    const weekdays = document.getElementById("cal-weekdays");
    const monthLabel = document.getElementById("cal-current-month");
    const gridWrapper = document.getElementById("cal-grid-wrapper");
    if (!grid || !monthLabel || !weekdays) return;

    gridWrapper.className = "cal-grid-wrapper";
    grid.className = "cal-grid month-grid";
    weekdays.innerHTML = t("dayNames").map(day => `<div class="cal-weekday">${day}</div>`).join('');

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

    let html = "";

    for (let i = 0; i < startDay; i++) {
        html += `<div class="cal-day cal-day-empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = dateToString(date);
        const isToday = dateStr === todayStr;
        const isSelected = selectedDate === dateStr;

        const dayEvents = getEventsForDate(dateStr);

        const dayClasses = [
            "cal-day",
            isToday ? "cal-day-today" : "",
            isSelected ? "cal-day-selected" : ""
        ].filter(Boolean).join(" ");

        let iconsHtml = '';
        if (dayEvents.length > 0) {
            const prioritized = getPrioritizedEvents(dayEvents, 5);
            iconsHtml = prioritized.map(e => {
                const color = eventColors[e.type] || eventColors[EVENT_TYPES.TASK_DUE];
                return `<span class="cal-event-icon" style="color: ${color.text}" title="${e.title}">${eventIcons[e.type] || eventIcons[EVENT_TYPES.TASK_DUE]}</span>`;
            }).join('');
        }

        html += `
            <div class="${dayClasses}" data-date="${dateStr}">
                <span class="cal-day-number">${day}</span>
                <div class="cal-day-icons">${iconsHtml}</div>
            </div>
        `;
    }

    const totalCells = startDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remainingCells; i++) {
        html += `<div class="cal-day cal-day-empty"></div>`;
    }

    grid.innerHTML = html;
    attachCalendarEvents();
};

const renderWeekView = () => {
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
    let daysHtml = '';
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        daysHtml += `<div class="cal-weekday ${isToday ? 'today' : ''}">
            <span class="cal-weekday-name">${t("dayNames")[i]}</span>
            <span class="cal-weekday-date">${d.getDate()}</span>
        </div>`;
    }
    weekdays.innerHTML = daysHtml;

    let html = '';
    for (let hour = 0; hour < 24; hour++) {
        html += `<div class="cal-time-row">
            <div class="cal-time-label">${hour.toString().padStart(2, '0')}:00</div>`;

        for (let day = 0; day < 7; day++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + day);
            const dateStr = dateToString(d);
            const today = new Date();
            const isToday = d.toDateString() === today.toDateString();

            let cellContent = '';
            const dayEvents = getEventsForDate(dateStr);
            const hourEvents = dayEvents.filter(e => getEventHour(e.timeStr) === hour);
            if (hourEvents.length > 0) {
                const prioritized = getPrioritizedEvents(hourEvents, 5);
                cellContent = prioritized.map(e =>
                    `<span class="cal-event-icon" style="color: ${eventColors[e.type]?.text || '#666'}" title="${e.title}">${eventIcons[e.type] || eventIcons[EVENT_TYPES.TASK_DUE]}</span>`
                ).join('');
            }

            html += `<div class="cal-time-cell ${isToday ? 'today' : ''}" data-date="${dateStr}" data-hour="${hour}">
                ${cellContent}
            </div>`;
        }
        html += '</div>';
    }

    grid.innerHTML = html;
    attachCalendarEvents();
};

const renderDayView = () => {
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
    const dayEvents = getEventsForDate(dateStr);

    let html = '';
    for (let hour = 0; hour < 24; hour++) {
        let cellContent = '';
        const hourEvents = dayEvents.filter(e => getEventHour(e.timeStr) === hour);
        if (hourEvents.length > 0) {
            const prioritized = getPrioritizedEvents(hourEvents, 5);
            cellContent = prioritized.map(e =>
                `<span class="cal-event-icon" style="color: ${eventColors[e.type]?.text || '#666'}" title="${e.title}">${eventIcons[e.type] || eventIcons[EVENT_TYPES.TASK_DUE]}</span>`
            ).join('');
        }
        html += `<div class="cal-time-row">
            <div class="cal-time-label">${hour.toString().padStart(2, '0')}:00</div>
            <div class="cal-time-cell full-width today" data-date="${dateStr}" data-hour="${hour}">
                ${cellContent}
            </div>
        </div>`;
    }

    grid.innerHTML = html;
    attachCalendarEvents();
};

const showEventDetails = (dateStr) => {
    currentLang = localStorage.getItem("language") || "uz";
    invalidateCache();
    const events = getEventsForDate(dateStr);
    const panel = document.getElementById("cal-events-panel");
    const dateHeader = document.getElementById("cal-events-date");
    const eventsList = document.getElementById("cal-events-list");

    if (!panel || !dateHeader || !eventsList) return;

    selectedDate = dateStr;
    dateHeader.textContent = dateStr;

    if (events.length === 0) {
        eventsList.innerHTML = `<div class="cal-no-events"><p>${t("noEvents")}</p></div>`;
    } else {
        eventsList.innerHTML = events.map(e => {
            const color = eventColors[e.type] || eventColors[EVENT_TYPES.TASK_DUE];
            
            // To'lov turi uchun belgi (+/-)
            let amountSign = "";
            if (e.type === EVENT_TYPES.PAYMENT_RECEIVED) amountSign = "+";
            else if (e.type === EVENT_TYPES.PAYMENT_SENT) amountSign = "-";

            return `
                <div class="cal-event-card" style="background: ${color.bg}; border-left: 4px solid ${color.border}">
                    <span class="cal-event-icon-large" style="color: ${color.text}">${eventIcons[e.type] || eventIcons[EVENT_TYPES.TASK_DUE]}</span>
                    <div class="cal-event-info">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div class="cal-event-title" style="color: ${color.text}">${e.title}</div>
                            <div style="font-size: 11px; color: ${color.text}; opacity: 0.8; font-weight: 600;">${e.timeStr || ""}</div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                            ${e.amount ? `<div class="cal-event-meta" style="color: ${color.text}; font-weight: 800; font-size: 14px;">${amountSign}$${e.amount}</div>` : ''}
                            ${e.score !== undefined ? `<div class="cal-event-meta" style="color: ${color.text}; font-weight: 700;">${t("result")}: ${e.score} ${t("ball")}</div>` : ''}
                            ${e.price ? `<div class="cal-event-meta" style="color: ${color.text}; font-weight: 700;">${t("price")}: $${e.price}</div>` : ''}
                            ${e.priority ? `<span style="font-size: 10px; opacity: 0.7;">• ${e.priority}</span>` : ""}
                        </div>
                        ${e.duration ? `<div class="cal-event-meta" style="color: ${color.text}; font-size: 11px;">${t("duration")}: ${e.duration} ${t("days")}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    panel.classList.add("active");
    renderCalendar();
};

export const initInfoPortalLogic = () => {
    currentLang = localStorage.getItem("language") || "uz";
    renderCalendar();

    const savedDate = localStorage.getItem("cal_selected_date");
    if (savedDate) {
        localStorage.removeItem("cal_selected_date");
        setTimeout(() => {
            showEventDetails(savedDate);
        }, 100);
    }

    const handleLanguageChange = () => {
        currentLang = localStorage.getItem("language") || "uz";
        invalidateCache();
        renderCalendar();
        if (selectedDate) {
            showEventDetails(selectedDate);
        }
    };

    window.addEventListener("storage", (e) => {
        if (e.key === "language") {
            handleLanguageChange();
        }
    });

    document.addEventListener("languageChanged", handleLanguageChange);

    const viewBtn = document.getElementById("cal-view-btn");
    const viewMenu = document.getElementById("cal-view-menu");

    viewBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMenu?.classList.toggle("active");
    });

    document.addEventListener("click", () => viewMenu?.classList.remove("active"));

    document.querySelectorAll(".cal-view-option").forEach(opt => {
        opt.addEventListener("click", () => {
            document.querySelectorAll(".cal-view-option").forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            currentView = opt.dataset.view;
            document.getElementById("cal-view-label").textContent = t(currentView);
            viewMenu?.classList.remove("active");
            renderCalendar();
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
        renderCalendar();
    });

    document.getElementById("cal-next")?.addEventListener("click", () => {
        if (currentView === "week") {
            viewDate.setDate(viewDate.getDate() + 7);
        } else if (currentView === "day") {
            viewDate.setDate(viewDate.getDate() + 1);
        } else {
            viewDate.setMonth(viewDate.getMonth() + 1);
        }
        renderCalendar();
    });

    document.getElementById("cal-today-btn")?.addEventListener("click", () => {
        viewDate = new Date();
        renderCalendar();
    });

    document.getElementById("cal-panel-close")?.addEventListener("click", () => {
        document.getElementById("cal-events-panel")?.classList.remove("active");
        selectedDate = null;
        renderCalendar();
    });
};

const attachCalendarEvents = () => {
    document.querySelectorAll(".cal-day:not(.cal-day-empty), .cal-time-cell").forEach(el => {
        el.addEventListener("click", () => {
            const dateStr = el.dataset.date;
            if (dateStr) showEventDetails(dateStr);
        });
    });
};