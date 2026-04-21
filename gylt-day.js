const GYLT_STORAGE_KEY = "gylt-dashboard-v1";

const GYLT_TASK_LIBRARY = [
  { id: "reset", title: "Morgen-Reset", subtitle: "Wasser und Plan." },
  { id: "move", title: "Bewegung", subtitle: "Mindestens 20 Minuten." },
  { id: "focus", title: "Fokus-Block", subtitle: "Ohne Ablenkung." },
  { id: "fuel", title: "Energie halten", subtitle: "Essen und Trinken." },
  { id: "shutdown", title: "Abend-Check-out", subtitle: "Sauber abschließen." }
];

const gyltElements = {
  weekGrid: document.getElementById("gyltWeekGrid"),
  weekRange: document.getElementById("gyltWeekRange"),
  scoreRing: document.getElementById("gyltScoreRing"),
  completionPercent: document.getElementById("gyltCompletionPercent"),
  completedCount: document.getElementById("gyltCompletedCount"),
  habitStatus: document.getElementById("gyltHabitStatus"),
  streakCount: document.getElementById("gyltStreakCount"),
  taskCountSummary: document.getElementById("gyltTaskCountSummary"),
  taskCountText: document.getElementById("gyltTaskCountText"),
  dayHeroTitle: document.getElementById("gyltDayHeroTitle"),
  dayHeroText: document.getElementById("gyltDayHeroText"),
  dayDetailHeading: document.getElementById("gyltDayDetailHeading"),
  dayDetailMeta: document.getElementById("gyltDayDetailMeta"),
  dayRhythmTitle: document.getElementById("gyltDayRhythmTitle"),
  dayRhythmText: document.getElementById("gyltDayRhythmText"),
  dayClosureTitle: document.getElementById("gyltDayClosureTitle"),
  dayClosureText: document.getElementById("gyltDayClosureText"),
  selectedDayTitle: document.getElementById("gyltSelectedDayTitle"),
  selectedDayMeta: document.getElementById("gyltSelectedDayMeta"),
  reflectionHeading: document.getElementById("gyltReflectionHeading"),
  reflectionMeta: document.getElementById("gyltReflectionMeta"),
  reflectionLabel: document.getElementById("gyltReflectionLabel"),
  reflectionInput: document.getElementById("gyltReflectionInput"),
  reflectionStatus: document.getElementById("gyltReflectionStatus"),
  addButton: document.getElementById("gyltAddButton"),
  addSheet: document.getElementById("gyltAddSheet"),
  addClose: document.getElementById("gyltAddClose"),
  addCancel: document.getElementById("gyltAddCancel"),
  addSave: document.getElementById("gyltAddSave"),
  entryInput: document.getElementById("gyltEntryInput"),
  taskList: document.getElementById("gyltTaskList"),
  resetDayButton: document.getElementById("gyltResetDay"),
  presetButtons: Array.from(document.querySelectorAll("[data-preset-task]"))
};

let gyltState = loadGyltState();
let gyltSelectedDateKey = getInitialDateKey();

initGyltDay();

function initGyltDay() {
  ensureDayState(gyltSelectedDateKey);
  bindGyltEvents();
  renderGylt();
}

function bindGyltEvents() {
  gyltElements.reflectionInput?.addEventListener("input", () => {
    const selectedState = getDayState(gyltSelectedDateKey);
    selectedState.reflection = gyltElements.reflectionInput.value;
    selectedState.updatedAt = new Date().toISOString();
    saveGyltState();
    renderReflectionStatus(selectedState.reflection, selectedState.updatedAt);
    renderTaskDetails(selectedState);
  });

  gyltElements.resetDayButton?.addEventListener("click", () => {
    gyltState.days[gyltSelectedDateKey] = createDefaultDayState();
    saveGyltState();
    closeAddSheet();
    renderGylt();
  });

  gyltElements.addButton?.addEventListener("click", openAddSheet);
  gyltElements.addClose?.addEventListener("click", closeAddSheet);
  gyltElements.addCancel?.addEventListener("click", closeAddSheet);
  gyltElements.addSave?.addEventListener("click", saveCustomTask);
  gyltElements.entryInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      saveCustomTask();
    }
  });

  gyltElements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const presetId = button.dataset.presetTask;
      addPresetTask(presetId);
    });
  });

  gyltElements.taskList?.addEventListener("click", (event) => {
    const toggleTarget = event.target.closest("[data-task-id]");
    if (toggleTarget) {
      const taskId = toggleTarget.dataset.taskId;
      toggleTask(taskId);
      return;
    }

    const removeTarget = event.target.closest("[data-task-remove]");
    if (!removeTarget) return;

    const removeId = removeTarget.dataset.taskRemove;
    removeTask(removeId);
  });
}

function renderGylt() {
  ensureDayState(gyltSelectedDateKey);

  const selectedState = getDayState(gyltSelectedDateKey);
  const completedCount = getCompletedTaskCount(selectedState);
  const totalCount = getTotalTaskCount(selectedState);
  const completionPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const streak = getMomentumStreak(gyltSelectedDateKey);
  const isToday = gyltSelectedDateKey === getTodayKey();
  const selectedWeekday = getWeekdayName(gyltSelectedDateKey);

  document.title = `GYLT - ${selectedWeekday}`;
  gyltElements.dayHeroTitle.textContent = formatDisplayDate(gyltSelectedDateKey);
  gyltElements.dayHeroText.textContent = totalCount ? "Deine gewählten Aufgaben." : "Wähle zuerst Aufgaben mit +.";
  gyltElements.completionPercent.textContent = `${completionPercent}%`;
  gyltElements.completedCount.textContent = totalCount ? `${completedCount} / ${totalCount}` : "0 / 0";
  gyltElements.habitStatus.textContent = getTaskStatusText(completedCount, totalCount);
  gyltElements.streakCount.textContent = `${streak} ${streak === 1 ? "Tag" : "Tage"}`;
  gyltElements.taskCountSummary.textContent = `${totalCount} aktiv`;
  gyltElements.taskCountText.textContent = totalCount ? "Ausgewählt für heute." : "Noch nichts gewählt.";
  gyltElements.dayDetailHeading.textContent = `Tagesdetails · ${selectedWeekday}`;
  gyltElements.dayDetailMeta.textContent = isToday ? "heute" : "ausgewählt";
  gyltElements.selectedDayTitle.textContent = `${selectedWeekday} · Tagesaufgaben`;
  gyltElements.selectedDayMeta.textContent = totalCount ? `${completedCount} von ${totalCount} erledigt` : "Noch keine Aufgabe";
  gyltElements.reflectionHeading.textContent = `Check-in · ${selectedWeekday}`;
  gyltElements.reflectionMeta.textContent = isToday ? "lokal" : "gespeichert";
  gyltElements.reflectionLabel.textContent = "Kurzer Check-in";
  gyltElements.reflectionInput.value = selectedState.reflection;
  gyltElements.scoreRing?.style.setProperty("--gylt-progress", String(completionPercent));

  renderTaskList(selectedState.tasks);
  renderPresetAvailability(selectedState.tasks);
  renderTaskDetails(selectedState);
  renderWeekCards();
  renderReflectionStatus(selectedState.reflection, selectedState.updatedAt);
}

function renderTaskList(tasks) {
  if (!gyltElements.taskList) return;

  gyltElements.taskList.innerHTML = "";

  if (!tasks.length) {
    gyltElements.taskList.innerHTML = `
      <div class="gyltEmptyState">Noch keine Tagesaufgabe. Tippe auf + und wähle welche aus.</div>
    `;
    return;
  }

  tasks.forEach((task) => {
    const row = document.createElement("div");
    row.className = "gyltCustomTaskRow";
    row.innerHTML = `
      <button class="gyltHabitButton${task.done ? " isDone" : ""}" type="button" data-task-id="${task.id}" aria-pressed="${task.done}">
        <span class="gyltHabitCheck" aria-hidden="true"></span>
        <span class="gyltHabitMeta">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle || "Eigene Aufgabe.")}</span>
        </span>
      </button>
      <button class="gyltTaskRemove" type="button" data-task-remove="${task.id}" aria-label="Aufgabe entfernen">×</button>
    `;
    gyltElements.taskList.appendChild(row);
  });
}

function renderPresetAvailability(tasks) {
  const selectedPresetIds = new Set(tasks.filter((task) => task.source === "preset").map((task) => task.presetId));

  gyltElements.presetButtons.forEach((button) => {
    const presetId = button.dataset.presetTask;
    const isSelected = selectedPresetIds.has(presetId);
    button.disabled = isSelected;
    button.classList.toggle("isSelected", isSelected);
  });
}

function renderTaskDetails(dayState) {
  const completedCount = getCompletedTaskCount(dayState);
  const totalCount = getTotalTaskCount(dayState);
  const reflection = dayState.reflection.trim();
  const halfReached = totalCount > 0 && completedCount >= Math.max(1, Math.ceil(totalCount / 2));

  gyltElements.dayRhythmTitle.textContent =
    totalCount === 0 ? "Leer" :
    completedCount === totalCount ? "Komplett" :
    halfReached ? "Im Zug" : "Startet";
  gyltElements.dayRhythmText.textContent =
    totalCount === 0 ? "Wähle Aufgaben aus." :
    completedCount === totalCount ? "Alles erledigt." :
    halfReached ? "Mehr als die Hälfte sitzt." : "Der Tag läuft an.";

  gyltElements.dayClosureTitle.textContent =
    reflection ? "Check-in da" : "Noch offen";
  gyltElements.dayClosureText.textContent =
    reflection ? "Kurz notiert." : "Check-in fehlt noch.";
}

function renderWeekCards() {
  if (!gyltElements.weekGrid || !gyltElements.weekRange) return;

  const weekDates = getWeekDatesForSelectedDay();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  gyltElements.weekRange.textContent = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;
  gyltElements.weekGrid.innerHTML = "";

  weekDates.forEach((date) => {
    const dateKey = formatDateKey(date);
    const link = document.createElement("a");

    link.className = "gyltWeekCard";
    link.href = `gylt-day.html?date=${encodeURIComponent(dateKey)}`;
    link.setAttribute("aria-label", `${formatDisplayDate(dateKey)} öffnen`);

    if (dateKey === gyltSelectedDateKey) link.classList.add("isActive");
    if (dateKey === getTodayKey()) link.classList.add("isToday");

    link.innerHTML = `
      <span class="gyltWeekDay">${formatWeekdayShort(dateKey)}</span>
      <span class="gyltWeekDayNumber">${formatDayNumber(dateKey)}</span>
    `;

    gyltElements.weekGrid.appendChild(link);
  });
}

function renderReflectionStatus(reflection, updatedAt) {
  const trimmedReflection = reflection.trim();

  if (!trimmedReflection) {
    gyltElements.reflectionStatus.textContent = "Noch kein Check-in.";
    return;
  }

  if (!updatedAt) {
    gyltElements.reflectionStatus.textContent = "Lokal gespeichert.";
    return;
  }

  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(updatedAt));

  gyltElements.reflectionStatus.textContent = `Gespeichert um ${time} Uhr.`;
}

function openAddSheet() {
  gyltElements.addSheet?.classList.remove("hidden");
  gyltElements.entryInput?.focus();
}

function closeAddSheet() {
  gyltElements.addSheet?.classList.add("hidden");
  if (gyltElements.entryInput) gyltElements.entryInput.value = "";
}

function addPresetTask(presetId) {
  const preset = GYLT_TASK_LIBRARY.find((task) => task.id === presetId);
  if (!preset) return;

  const selectedState = getDayState(gyltSelectedDateKey);
  const alreadyExists = selectedState.tasks.some((task) => task.source === "preset" && task.presetId === presetId);
  if (alreadyExists) return;

  selectedState.tasks.push({
    id: `preset-${presetId}`,
    title: preset.title,
    subtitle: preset.subtitle,
    done: false,
    source: "preset",
    presetId
  });
  selectedState.updatedAt = new Date().toISOString();
  saveGyltState();
  closeAddSheet();
  renderGylt();
}

function saveCustomTask() {
  if (!gyltElements.entryInput) return;

  const text = gyltElements.entryInput.value.trim();
  if (!text) {
    gyltElements.entryInput.focus();
    return;
  }

  const selectedState = getDayState(gyltSelectedDateKey);
  selectedState.tasks.push({
    id: `task-${Date.now()}`,
    title: text,
    subtitle: "Eigene Aufgabe.",
    done: false,
    source: "custom"
  });
  selectedState.updatedAt = new Date().toISOString();
  saveGyltState();
  closeAddSheet();
  renderGylt();
}

function toggleTask(taskId) {
  const selectedState = getDayState(gyltSelectedDateKey);
  const task = selectedState.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.done = !task.done;
  selectedState.updatedAt = new Date().toISOString();
  saveGyltState();
  renderGylt();
}

function removeTask(taskId) {
  const selectedState = getDayState(gyltSelectedDateKey);
  selectedState.tasks = selectedState.tasks.filter((task) => task.id !== taskId);
  selectedState.updatedAt = new Date().toISOString();
  saveGyltState();
  renderGylt();
}

function getInitialDateKey() {
  const params = new URLSearchParams(window.location.search);
  const requestedDate = params.get("date");
  return isValidDateKey(requestedDate) ? requestedDate : getTodayKey();
}

function isValidDateKey(dateKey) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const parsed = parseDateKey(dateKey);
  return formatDateKey(parsed) === dateKey;
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

function saveGyltState() {
  localStorage.setItem(GYLT_STORAGE_KEY, JSON.stringify(gyltState));
}

function ensureDayState(dateKey) {
  gyltState.days[dateKey] = normalizeDayState(gyltState.days[dateKey]);
}

function getDayState(dateKey) {
  ensureDayState(dateKey);
  return gyltState.days[dateKey];
}

function normalizeDayState(dayState) {
  const defaultState = createDefaultDayState();
  const normalizedTasks = normalizeTasks(dayState && dayState.tasks);

  return {
    ...defaultState,
    reflection: dayState && typeof dayState.reflection === "string" ? dayState.reflection : "",
    updatedAt: dayState && typeof dayState.updatedAt === "string" ? dayState.updatedAt : "",
    tasks: normalizedTasks.length ? normalizedTasks : []
  };
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .filter((task) => task && typeof task.title === "string" && task.title.trim())
    .map((task) => ({
      id: typeof task.id === "string" ? task.id : `task-${Date.now()}`,
      title: task.title.trim(),
      subtitle: typeof task.subtitle === "string" && task.subtitle.trim() ? task.subtitle.trim() : "Eigene Aufgabe.",
      done: Boolean(task.done),
      source: task.source === "preset" ? "preset" : "custom",
      presetId: typeof task.presetId === "string" ? task.presetId : ""
    }));
}

function createDefaultDayState() {
  return {
    reflection: "",
    updatedAt: "",
    tasks: []
  };
}

function getCompletedTaskCount(dayState) {
  return dayState.tasks.reduce((count, task) => count + (task.done ? 1 : 0), 0);
}

function getTotalTaskCount(dayState) {
  return dayState.tasks.length;
}

function getTaskStatusText(completedCount, totalCount) {
  if (totalCount === 0) return "Noch keine Aufgabe aktiv.";
  if (completedCount === 0) return "Der Tag ist offen.";
  if (completedCount < totalCount) return "Du bist im Zug.";
  return "Alles erledigt.";
}

function getMomentumStreak(dateKey) {
  let streak = 0;
  let currentDate = parseDateKey(dateKey);

  while (true) {
    const currentKey = formatDateKey(currentDate);
    const dayState = getDayState(currentKey);
    const totalCount = getTotalTaskCount(dayState);
    const completedCount = getCompletedTaskCount(dayState);

    if (!totalCount || completedCount < totalCount) break;

    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

function getWeekDatesForSelectedDay() {
  const monday = getMondayOfWeek(parseDateKey(gyltSelectedDateKey));
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

function getWeekdayName(dateKey) {
  const formatted = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(parseDateKey(dateKey));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
