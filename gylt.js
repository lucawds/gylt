const GYLT_STORAGE_KEY = "gylt-dashboard-v1";

const GYLT_HABITS = [
  { id: "reset", title: "Morgen-Reset" },
  { id: "move", title: "Bewegung" },
  { id: "focus", title: "Fokus-Block" },
  { id: "fuel", title: "Energie halten" },
  { id: "shutdown", title: "Abend-Check-out" }
];

const gyltOverviewElements = {
  weekGrid: document.getElementById("gyltWeekGrid"),
  weekRange: document.getElementById("gyltWeekRange")
};

initGyltOverview();

function initGyltOverview() {
  if (!gyltOverviewElements.weekGrid || !gyltOverviewElements.weekRange) return;
  renderGyltOverviewWeek();
}

function renderGyltOverviewWeek() {
  const weekDates = getCurrentWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  gyltOverviewElements.weekRange.textContent = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;
  gyltOverviewElements.weekGrid.innerHTML = "";

  weekDates.forEach((date) => {
    const dateKey = formatDateKey(date);
    const link = document.createElement("a");

    link.className = "gyltWeekCard";
    link.href = `gylt-day.html?date=${encodeURIComponent(dateKey)}`;
    link.setAttribute("aria-label", `${formatDisplayDate(dateKey)} öffnen`);

    if (dateKey === getTodayKey()) {
      link.classList.add("isToday", "isActive");
    }

    link.innerHTML = `
      <span class="gyltWeekDay">${formatWeekdayShort(dateKey)}</span>
      <span class="gyltWeekDayNumber">${formatDayNumber(dateKey)}</span>
    `;

    gyltOverviewElements.weekGrid.appendChild(link);
  });
}

function loadGyltState() {
  try {
    const rawState = localStorage.getItem(GYLT_STORAGE_KEY);

    if (!rawState) {
      return { days: {} };
    }

    const parsedState = JSON.parse(rawState);
    return {
      days: parsedState && typeof parsedState === "object" && parsedState.days ? parsedState.days : {}
    };
  } catch (error) {
    return { days: {} };
  }
}

function getDayState(dateKey) {
  const state = loadGyltState();
  return normalizeDayState(state.days[dateKey]);
}

function normalizeDayState(dayState) {
  const defaultState = createDefaultDayState();
  return {
    ...defaultState,
    ...dayState,
    habits: { ...defaultState.habits, ...(dayState && dayState.habits ? dayState.habits : {}) },
    entries: Array.isArray(dayState && dayState.entries) ? dayState.entries : []
  };
}

function createDefaultDayState() {
  return {
    focusPreset: 45,
    reflection: "",
    updatedAt: "",
    entries: [],
    habits: Object.fromEntries(GYLT_HABITS.map((habit) => [habit.id, false]))
  };
}

function getCompletedHabitCount(dayState) {
  return GYLT_HABITS.reduce((count, habit) => count + (dayState.habits[habit.id] ? 1 : 0), 0);
}

function getCurrentWeekDates() {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const dates = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    dates.push(date);
  }

  return dates;
}

function getMondayOfWeek(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(dateKey) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(parseDateKey(dateKey));
}

function formatWeekdayShort(dateKey) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(parseDateKey(dateKey))
    .replace(".", "");
}

function formatDayNumber(dateKey) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(parseDateKey(dateKey));
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}
