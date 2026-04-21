/* =========================================================
   ToDo App — FULL script.js
   Features:
   - Current week + Next week (separate storage)
   - Mini pies + badges for both weeks
   - Weekly summary (Current week, Mon–Today) + chart
   - Day detail view with big pie chart + smooth animation
   - Autosort: open first, done last
   - Drag & drop reorder (handle only, within open/done group)
   - Theme (dark blue / beige light), stored
   - Settings menu + shared backdrop
   - Archive (via settings): weekly reset archives old current week (keeps 26)
   - DetailView is fullscreen overlay + hides weekly fixed gutter card
   ========================================================= */

// ---------- Storage ----------
const STORAGE_KEY_TASKS_CURRENT = "tasks_v2";
const STORAGE_KEY_TASKS_NEXT = "tasks_next_v1";
const STORAGE_KEY_THEME = "theme";
const STORAGE_KEY_WEEKSTAMP = "week_stamp_v1";
const STORAGE_KEY_ARCHIVE = "tasks_archive_v1";
const STORAGE_KEY_LAST_ACTIVITY = "last_activity_v1";
const STORAGE_KEY_WEEK_NOTE_CURRENT = "week_note_current_v1";
const STORAGE_KEY_WEEK_NOTE_NEXT = "week_note_next_v1";

// ---------- Drag state ----------
let dragFromIndex = null;
let dragFromChecked = null;

// ---------- Days ----------
const dayLabels = {
  montag: "Montag",
  dienstag: "Dienstag",
  mittwoch: "Mittwoch",
  donnerstag: "Donnerstag",
  freitag: "Freitag",
  samstag: "Samstag",
  sonntag: "Sonntag"
};
const dayOrder = ["montag","dienstag","mittwoch","donnerstag","freitag","samstag","sonntag"];

// ---------- Week state ----------
let currentDay = null;         // e.g. "montag"
let currentWeek = "current";   // "current" | "next"

// ---------- Helpers ----------
function computeStats(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.checked).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

function sortTasksOpenFirst(tasks) {
  return [
    ...tasks.filter(t => !t.checked),
    ...tasks.filter(t => t.checked),
  ];
}

function readCssColorVar(varName, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function accentRgba(alpha, variant = "strong") {
  const varName = variant === "base" ? "--accent-rgb" : "--accent-strong-rgb";
  const fallback = variant === "base" ? "120,160,255" : "130,170,255";
  return `rgba(${readCssColorVar(varName, fallback)},${alpha})`;
}

// ISO week stamp (e.g. 2026-W06)
function getISOWeekStamp(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getMondayOfISOWeekLocal(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function formatDateShortDE(d) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function shortText(s, max = 48) {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

function setLastActivity(message) {
  if (!message) return;
  const payload = {
    message: shortText(message),
    at: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, JSON.stringify(payload));
  renderLastActivity(payload);
}

function renderLastActivity(prefilled = null) {
  if (!lastActivityText) return;

  let data = prefilled;
  if (!data) {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = null; }
    }
  }

  if (!data?.message) {
    lastActivityText.textContent = "Noch keine Aktivitaet.";
    return;
  }

  const d = new Date(data.at);
  if (Number.isNaN(d.valueOf())) {
    lastActivityText.textContent = data.message;
    return;
  }
  lastActivityText.textContent = `${data.message} (${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr)`;
}

const motivationPool = [
  "Kleine Schritte sind auch Fortschritt.",
  "Fang mit 5 Minuten an. Momentum kommt danach.",
  "Heute nur eine Aufgabe weniger offen ist schon ein Gewinn.",
  "Konstanz schlaegt Intensitaet.",
  "Ein sauber abgeschlossener Task zaehlt doppelt.",
  "Nicht perfekt, sondern fertig.",
  "Fokus auf den naechsten sinnvollen Schritt."
];

function renderMotivation() {
  if (!motivationText) return;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - yearStart) / 86400000);
  const idx = ((dayOfYear % motivationPool.length) + motivationPool.length) % motivationPool.length;
  motivationText.textContent = motivationPool[idx];
}

function getWeekNoteStorageKey(which = "current") {
  return which === "next" ? STORAGE_KEY_WEEK_NOTE_NEXT : STORAGE_KEY_WEEK_NOTE_CURRENT;
}

function loadWeekNote(which = "current") {
  return localStorage.getItem(getWeekNoteStorageKey(which)) ?? "";
}

function saveWeekNote(which, text) {
  localStorage.setItem(getWeekNoteStorageKey(which), text);
}

function nowHHMM() {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function initWeekNote(which, inputEl, statusEl) {
  if (!inputEl || !statusEl) return;

  let savedValue = loadWeekNote(which);
  let saveTimer = null;

  inputEl.value = savedValue;
  statusEl.textContent = savedValue.trim() ? "Geladen" : "Bereit";

  const doSave = () => {
    const value = inputEl.value;
    if (value === savedValue) return;
    saveWeekNote(which, value);
    savedValue = value;
    statusEl.textContent = `OK ${nowHHMM()}`;
    setLastActivity(which === "next" ? "Wochennotiz Next gespeichert" : "Wochennotiz gespeichert");
  };

  inputEl.addEventListener("input", () => {
    statusEl.textContent = "...";
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      doSave();
      saveTimer = null;
    }, 450);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      doSave();
      inputEl.blur();
    }
  });

  inputEl.addEventListener("blur", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    doSave();
  });
}

// ---------- Load/Save week tasks ----------
function emptyWeekObj() {
  const empty = {};
  for (const d in dayLabels) empty[d] = [];
  return empty;
}

function loadWeekTasks(which = "current") {
  const key = which === "next" ? STORAGE_KEY_TASKS_NEXT : STORAGE_KEY_TASKS_CURRENT;
  const raw = localStorage.getItem(key);
  const empty = emptyWeekObj();
  if (!raw) return empty;

  try {
    const data = JSON.parse(raw);
    for (const d in dayLabels) data[d] ??= [];
    return data;
  } catch {
    return empty;
  }
}

function saveWeekTasks(which, data) {
  const key = which === "next" ? STORAGE_KEY_TASKS_NEXT : STORAGE_KEY_TASKS_CURRENT;
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------- Archive ----------
function loadArchive() {
  const raw = localStorage.getItem(STORAGE_KEY_ARCHIVE);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveArchive(arr) {
  localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(arr));
}

function archiveWeek(stamp, tasksObj) {
  const archive = loadArchive();
  if (archive.some(e => e?.stamp === stamp)) return;

  archive.unshift({
    stamp,
    archivedAt: new Date().toISOString(),
    tasks: tasksObj
  });

  if (archive.length > 26) archive.length = 26;
  saveArchive(archive);
}

// Weekly reset for CURRENT week only: archives previous week then clears current tasks.
// IMPORTANT: first run will NOT reset anything (just sets stamp).
function weeklyResetIfNeeded() {
  const currentStamp = getISOWeekStamp();
  const savedStamp = localStorage.getItem(STORAGE_KEY_WEEKSTAMP);

  // first ever run: just set stamp
  if (!savedStamp) {
    localStorage.setItem(STORAGE_KEY_WEEKSTAMP, currentStamp);
    return null;
  }

  if (savedStamp !== currentStamp) {
    const oldData = loadWeekTasks("current");
    const hasAny = dayOrder.some(d => (oldData[d]?.length ?? 0) > 0);
    if (hasAny) archiveWeek(savedStamp, oldData);

    const empty = emptyWeekObj();
    saveWeekTasks("current", empty);

    localStorage.setItem(STORAGE_KEY_WEEKSTAMP, currentStamp);
    return empty;
  }

  return null;
}

// =========================================================
// DOM
// =========================================================
const themeToggle = document.getElementById("themeToggle");
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
const backdrop = document.getElementById("backdrop");

const mainView = document.getElementById("mainView");
const detailView = document.getElementById("detailView");
const backBtn = document.getElementById("backBtn");

const detailTitle = document.getElementById("detailTitle");
const detailInput = document.getElementById("detailInput");
const detailAddBtn = document.getElementById("detailAddBtn");
const detailList = document.getElementById("detailList");
const progressText = document.getElementById("progressText");

const weekSumLine = document.getElementById("weekSumLine");
const weekSumPercent = document.getElementById("weekSumPercent");

// Fixed gutter cards (left summary + optional right tools)
const gutterCards = document.querySelectorAll(".gutterCard");

// Next week toggle + section (optional)
const toggleNextWeek = document.getElementById("toggleNextWeek");
const nextWeekSection = document.getElementById("nextWeekSection");

// Archive 
const archiveBtn = document.getElementById("archiveBtn");
const archiveModal = document.getElementById("archiveModal");
const archiveCloseBtn = document.getElementById("archiveCloseBtn");
const archiveList = document.getElementById("archiveList");

const archiveDetail = document.getElementById("archiveDetail");
const archiveDetailTitle = document.getElementById("archiveDetailTitle");
const archiveDetailMeta = document.getElementById("archiveDetailMeta");
const archiveDetailDays = document.getElementById("archiveDetailDays");
const archiveBackBtn = document.getElementById("archiveBackBtn");

// Right tools (mini calendar + timer)
const miniCalMonth = document.getElementById("miniCalMonth");
const miniCalSelected = document.getElementById("miniCalSelected");
const miniCalGrid = document.getElementById("miniCalGrid");
const miniCalPrev = document.getElementById("miniCalPrev");
const miniCalNext = document.getElementById("miniCalNext");

const timerDisplay = document.getElementById("timerDisplay");
const timerStateLabel = document.getElementById("timerStateLabel");
const timerStartPause = document.getElementById("timerStartPause");
const timerReset = document.getElementById("timerReset");
const timerPresetButtons = Array.from(document.querySelectorAll(".timerPreset"));
const timerCustomMinutes = document.getElementById("timerCustomMinutes");
const timerCustomApply = document.getElementById("timerCustomApply");
const lastActivityText = document.getElementById("lastActivityText");
const motivationText = document.getElementById("motivationText");
const weekNoteInput = document.getElementById("weekNoteInput");
const weekNoteStatus = document.getElementById("weekNoteStatus");
const weekNoteNextInput = document.getElementById("weekNoteNextInput");
const weekNoteNextStatus = document.getElementById("weekNoteNextStatus");

// =========================================================
// Theme
// =========================================================
function applyThemeFromStorage() {
  const t = localStorage.getItem(STORAGE_KEY_THEME);
  const isLight = t === "light";
  document.body.classList.toggle("light", isLight);
  if (themeToggle) themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
}
applyThemeFromStorage();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem(STORAGE_KEY_THEME, isLight ? "light" : "dark");
    themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";

    // refresh charts after theme change
    const allCurrent = loadWeekTasks("current");
    updateWeeklySummary(allCurrent);

    if (currentDay) {
      const all = loadWeekTasks(currentWeek);
      const st = computeStats(all[currentDay] ?? []);
      updateDayChart(st.done, st.total - st.done);
    }

    // archive chart (if open)
    if (archiveModal && !archiveModal.classList.contains("hidden")) {
      // re-render list/detail to update colors in chart
      if (archiveDetail && !archiveDetail.classList.contains("hidden")) {
        // just trigger chart recolor by calling show detail again via stored dataset is complex;
        // simplest: do nothing here; archive chart recolors on next open.
      }
    }
  });
}

// =========================================================
// Settings menu + Backdrop
// =========================================================
function openBackdrop() {
  backdrop?.classList.remove("hidden");
}
function closeBackdropIfNothingOpen() {
  const menuOpen = settingsMenu && !settingsMenu.classList.contains("hidden");
  const modalOpen = archiveModal && !archiveModal.classList.contains("hidden");
  if (!menuOpen && !modalOpen) backdrop?.classList.add("hidden");
}
function closeSettingsMenu() {
  settingsMenu?.classList.add("hidden");
  closeBackdropIfNothingOpen();
}

if (settingsBtn && settingsMenu && backdrop) {
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("hidden");
    openBackdrop();
  });

  settingsMenu.addEventListener("click", (e) => e.stopPropagation());

  backdrop.addEventListener("click", () => {
    closeSettingsMenu();
    hideArchive();
  });
}

// ESC closes menus/modals
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    backToArchiveList();
    hideArchive();
    closeSettingsMenu();
  }
});

// =========================================================
// Next week toggle (optional)
// =========================================================
function syncNextWeekToggleLabel() {
  if (!toggleNextWeek || !nextWeekSection) return;
  const shown = !nextWeekSection.classList.contains("hidden");
  toggleNextWeek.textContent = shown ? "Hide Next Week" : "Show Next Week";
}

if (toggleNextWeek && nextWeekSection) {
  syncNextWeekToggleLabel();

  toggleNextWeek.addEventListener("click", (e) => {
    e.stopPropagation(); // damit das Settings-Menü nicht “falsch” schließt
    nextWeekSection.classList.toggle("hidden");
    syncNextWeekToggleLabel();
    setLastActivity(nextWeekSection.classList.contains("hidden") ? "Next Week ausgeblendet" : "Next Week eingeblendet");

    // Settings-Menü schließen nach Auswahl
    settingsMenu?.classList.add("hidden");
    closeBackdropIfNothingOpen();
  });
}

// =========================================================
// Charts (Detail day)
// =========================================================
let dayChart = null;

function ensureDayChart() {
  const canvas = document.getElementById("progressChart");
  if (!canvas || dayChart) return;

  dayChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels: ["Erledigt", "Offen"],
      datasets: [{
        data: [0, 0],
        backgroundColor: [accentRgba(0.85), "rgba(255,255,255,0.16)"],
        borderColor: [accentRgba(0.35), "rgba(255,255,255,0.05)"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      animation: { duration: 550, easing: "easeOutQuart" },
      transitions: {
        active: { animation: { duration: 550 } },
        resize: { animation: { duration: 0 } }
      }
    }
  });
}

function updateDayChart(done, open) {
  ensureDayChart();
  if (!dayChart) return;

  const isLight = document.body.classList.contains("light");
  dayChart.data.datasets[0].data = [done, open];
  dayChart.data.datasets[0].backgroundColor = [
    accentRgba(0.85),
    isLight ? "rgba(120,90,50,0.20)" : "rgba(255,255,255,0.16)"
  ];
  dayChart.update("active");
}

// =========================================================
// Charts (Weekly summary - CURRENT week Mon..Today)
// =========================================================
let weeklyChart = null;

function ensureWeeklyChart() {
  const canvas = document.getElementById("weeklyChart");
  if (!canvas || weeklyChart) return;

  weeklyChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Done", "Open"],
      datasets: [{
        data: [0, 0],
        backgroundColor: [accentRgba(0.85), "rgba(255,255,255,0.16)"],
        borderColor: [accentRgba(0.35), "rgba(255,255,255,0.05)"],
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: "72%",
      plugins: { legend: { display: false } },
      animation: { duration: 550, easing: "easeOutQuart" }
    }
  });
}

function updateWeeklySummary(allCurrent) {
  // Count only from Monday to today
  const jsDay = new Date().getDay();      // 0=Sun..6=Sat
  const idxToday = (jsDay + 6) % 7;       // 0=Mon..6=Sun

  let total = 0;
  let done = 0;

  for (let i = 0; i <= idxToday; i++) {
    const key = dayOrder[i];
    const st = computeStats(allCurrent[key] ?? []);
    total += st.total;
    done += st.done;
  }

  const open = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (weekSumLine) weekSumLine.textContent = `${done}/${total} done (Mon–Today)`;
  if (weekSumPercent) weekSumPercent.textContent = `${pct}% completed`;

  ensureWeeklyChart();
  if (!weeklyChart) return;

  const isLight = document.body.classList.contains("light");
  weeklyChart.data.datasets[0].data = [done, open];
  weeklyChart.data.datasets[0].backgroundColor = [
    accentRgba(0.85),
    isLight ? "rgba(120,90,50,0.20)" : "rgba(255,255,255,0.16)"
  ];
  weeklyChart.data.datasets[0].borderColor = [
    accentRgba(0.35),
    isLight ? "rgba(120,90,50,0.22)" : "rgba(255,255,255,0.05)"
  ];
  weeklyChart.update("active");
}

// =========================================================
// Dates on day cards (current + next)
// Requires elements:
// - current: id="date-montag" ... id="date-sonntag"
// - next:    id="date-next-montag" ... id="date-next-sonntag"
// =========================================================
let lastDateStamp = "";

function updateDayCardDates() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  if (stamp === lastDateStamp) return;
  lastDateStamp = stamp;

  const monday = getMondayOfISOWeekLocal(now);

  // current week
  dayOrder.forEach((key, i) => {
    const el = document.getElementById(`date-${key}`);
    if (!el) return;
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    el.textContent = formatDateShortDE(d);
  });

  // next week
  const mondayNext = new Date(monday);
  mondayNext.setDate(monday.getDate() + 7);

  dayOrder.forEach((key, i) => {
    const el = document.getElementById(`date-next-${key}`);
    if (!el) return;
    const d = new Date(mondayNext);
    d.setDate(mondayNext.getDate() + i);
    el.textContent = formatDateShortDE(d);
  });
}

// =========================================================
// Badges + mini pies (current + next)
// Requires elements:
// - current: badge-montag, pie-montag ...
// - next:    badge-next-montag, pie-next-montag ...
// =========================================================
function updateBadges(allCurrent) {
  // current
  for (const day of dayOrder) {
    const badge = document.getElementById(`badge-${day}`);
    const pie = document.getElementById(`pie-${day}`);
    const { total, done, pct } = computeStats(allCurrent[day] ?? []);
    if (badge) badge.textContent = `${done}/${total}`;
    if (pie) pie.style.setProperty("--pct", String(pct));
  }

  // next
  const allNext = loadWeekTasks("next");
  for (const day of dayOrder) {
    const badge = document.getElementById(`badge-next-${day}`);
    const pie = document.getElementById(`pie-next-${day}`);
    if (!badge && !pie) continue; // if you didn't add next week cards, skip silently
    const { total, done, pct } = computeStats(allNext[day] ?? []);
    if (badge) badge.textContent = `${done}/${total}`;
    if (pie) pie.style.setProperty("--pct", String(pct));
  }

  updateWeeklySummary(allCurrent);
}

// =========================================================
// Detail list render (uses currentWeek)
// =========================================================
function renderDetailList(all, day) {
  if (!detailList) return;

  detailList.innerHTML = "";
  const tasks = all[day] ?? [];

  tasks.forEach((task, idx) => {
    const li = document.createElement("li");
    li.className = "taskItem";
    li.setAttribute("data-index", String(idx));
    li.draggable = true;

    const handle = document.createElement("span");
    handle.className = "dragHandle";
    handle.textContent = "⋮⋮";
    handle.title = "Ziehen zum Sortieren";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!task.checked;

    const checkWrap = document.createElement("label");
    checkWrap.className = "checkWrap";
    checkWrap.appendChild(cb);
    const checkUi = document.createElement("span");
    checkUi.className = "checkUi";
    checkWrap.appendChild(checkUi);

    const text = document.createElement("div");
    text.className = "taskText";
    text.textContent = task.text;

    const del = document.createElement("button");
    del.className = "deleteBtn";
    del.type = "button";
    del.textContent = "✕";

    cb.addEventListener("change", () => {
      task.checked = cb.checked;
      all[day] = tasks;
      saveWeekTasks(currentWeek, all);
      setLastActivity(`${dayLabels[day]}: "${shortText(task.text, 24)}" ${cb.checked ? "erledigt" : "wieder offen"}`);

      // Always refresh current-week badges/summary (and next-week badges too)
      updateBadges(loadWeekTasks("current"));
      renderDetailList(all, day);

      // autosort a moment later
      setTimeout(() => {
        all[day] = sortTasksOpenFirst(all[day]);
        saveWeekTasks(currentWeek, all);
        updateBadges(loadWeekTasks("current"));
        renderDetailList(all, day);
      }, 250);
    });

    del.addEventListener("click", () => {
      setLastActivity(`${dayLabels[day]}: "${shortText(task.text, 24)}" geloescht`);
      tasks.splice(idx, 1);
      all[day] = tasks;
      saveWeekTasks(currentWeek, all);
      updateBadges(loadWeekTasks("current"));
      renderDetailList(all, day);
    });

    // drag starts only via handle
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      dragFromIndex = idx;
      dragFromChecked = !!task.checked;
    });

    li.addEventListener("dragstart", (e) => {
      if (dragFromIndex === null) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify({
        fromIndex: dragFromIndex,
        fromChecked: dragFromChecked
      }));
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      li.classList.add("dragOver");
    });

    li.addEventListener("dragleave", () => li.classList.remove("dragOver"));

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("dragOver");

      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData("text/plain")); }
      catch { return; }

      const fromIndex = payload?.fromIndex;
      const fromChecked = payload?.fromChecked;
      const toIndex = Number(li.getAttribute("data-index"));

      if (typeof fromIndex !== "number" || Number.isNaN(toIndex)) return;
      if (fromIndex === toIndex) return;

      // only reorder within open group or done group
      if (!!tasks[fromIndex]?.checked !== !!tasks[toIndex]?.checked) return;
      if (fromChecked !== !!tasks[toIndex]?.checked) return;

      const moved = tasks.splice(fromIndex, 1)[0];
      tasks.splice(toIndex, 0, moved);

      all[day] = sortTasksOpenFirst(tasks);
      saveWeekTasks(currentWeek, all);
      setLastActivity(`${dayLabels[day]}: Reihenfolge angepasst`);

      updateBadges(loadWeekTasks("current"));
      renderDetailList(all, day);

      dragFromIndex = null;
      dragFromChecked = null;
    });

    li.appendChild(handle);
    li.appendChild(checkWrap);
    li.appendChild(text);
    li.appendChild(del);
    detailList.appendChild(li);
  });

  document.addEventListener("mouseup", () => {
    dragFromIndex = null;
    dragFromChecked = null;
  }, { once: true });

  const { total, done, pct } = computeStats(all[day] ?? []);
  const open = total - done;

  if (progressText) progressText.textContent = `${pct}% erledigt (${done}/${total})`;
  updateDayChart(done, open);
}

// =========================================================
// Navigation (DetailView fullscreen + hides weekly gutter card)
// =========================================================
function resolveDetailDate(day, which = "current", explicitDate = null) {
  if (explicitDate instanceof Date && !Number.isNaN(explicitDate.valueOf())) {
    return startOfDayLocal(explicitDate);
  }
  const idx = dayOrder.indexOf(day);
  if (idx < 0) return null;

  const monday = getMondayOfISOWeekLocal(new Date());
  if (which === "next") monday.setDate(monday.getDate() + 7);
  const d = new Date(monday);
  d.setDate(monday.getDate() + idx);
  return d;
}

function openDetail(day, which = "current", explicitDate = null) {
  currentDay = day;
  currentWeek = which;

  const all = loadWeekTasks(which);

  if (detailTitle) {
    const label = dayLabels[day] ?? day;
    const detailDate = resolveDetailDate(day, which, explicitDate);
    const dateLabel = detailDate ? ` (${formatDateShortDE(detailDate)})` : "";
    detailTitle.textContent = (which === "next" ? "Next: " : "") + label + dateLabel;
  }

  // Hide main + weekly fixed card, show detail
  mainView?.classList.add("hidden");
  gutterCards.forEach(card => card.classList.add("hidden"));
  detailView?.classList.remove("hidden");
  detailView?.setAttribute("aria-hidden", "false");

  ensureDayChart();
  renderDetailList(all, day);

  if (detailInput) {
    detailInput.value = "";
    detailInput.focus();
  }
}

function closeDetail() {
  currentDay = null;

  detailView?.classList.add("hidden");
  detailView?.setAttribute("aria-hidden", "true");

  mainView?.classList.remove("hidden");
  gutterCards.forEach(card => card.classList.remove("hidden"));
}

// =========================================================
// Main page events (current + next cards)
// Cards must have data-day="montag" and optionally data-week="next"
// =========================================================
document.querySelectorAll(".day.card").forEach(card => {
  card.addEventListener("click", () => {
    const day = card.dataset.day;
    const which = card.dataset.week === "next" ? "next" : "current";
    openDetail(day, which);
  });
});

backBtn?.addEventListener("click", closeDetail);

// Add task in detail
detailAddBtn?.addEventListener("click", () => {
  if (!currentDay) return;
  const text = detailInput?.value.trim();
  if (!text) return;

  const all = loadWeekTasks(currentWeek);
  all[currentDay].push({ text, checked: false });
  all[currentDay] = sortTasksOpenFirst(all[currentDay]);
  saveWeekTasks(currentWeek, all);

  if (detailInput) detailInput.value = "";
  setLastActivity(`${dayLabels[currentDay]}: "${shortText(text, 24)}" hinzugefuegt`);

  updateBadges(loadWeekTasks("current"));
  renderDetailList(all, currentDay);
});

detailInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") detailAddBtn?.click();
});

// =========================================================
// Archive UI (settings -> Archive)
// =========================================================
function showArchive() {
  if (!archiveModal) return;

  settingsMenu?.classList.add("hidden");
  openBackdrop();

  archiveModal.classList.remove("hidden");
  archiveModal.setAttribute("aria-hidden", "false");

  backToArchiveList();
  renderArchiveList();
}

function hideArchive() {
  if (!archiveModal) return;
  archiveModal.classList.add("hidden");
  archiveModal.setAttribute("aria-hidden", "true");
  closeBackdropIfNothingOpen();
}

function backToArchiveList() {
  archiveDetail?.classList.add("hidden");
  if (archiveList) archiveList.style.display = "";
}

function renderArchiveList() {
  if (!archiveList) return;
  const archive = loadArchive();

  archiveList.innerHTML = "";
  if (archive.length === 0) {
    archiveList.innerHTML = `<div class="archiveItem small">No archived weeks yet.</div>`;
    return;
  }

  for (const entry of archive) {
    const stamp = entry?.stamp ?? "—";
    const tasks = entry?.tasks ?? {};

    let total = 0, done = 0;
    for (const d of dayOrder) {
      const st = computeStats(tasks[d] ?? []);
      total += st.total;
      done += st.done;
    }
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "archiveItem";
    item.style.textAlign = "left";
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:baseline;">
        <div><strong>${stamp}</strong></div>
        <div class="small">${done}/${total} • ${pct}%</div>
      </div>
      <div class="small" style="opacity:.8; margin-top:6px;">
        ${new Date(entry.archivedAt).toLocaleString("de-DE")}
      </div>
    `;
    item.addEventListener("click", () => showArchiveWeekDetail(entry));
    archiveList.appendChild(item);
  }
}

// Optional archive detail chart
let archiveChart = null;

function ensureArchiveChart() {
  const canvas = document.getElementById("archiveChart");
  if (!canvas || archiveChart) return;

  archiveChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Done", "Open"],
      datasets: [{
        data: [0, 0],
        backgroundColor: [accentRgba(0.85), "rgba(255,255,255,0.16)"],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: "72%",
      plugins: { legend: { display: false } },
      animation: { duration: 450, easing: "easeOutQuart" }
    }
  });
}

function updateArchiveChart(done, open) {
  ensureArchiveChart();
  if (!archiveChart) return;

  const isLight = document.body.classList.contains("light");
  archiveChart.data.datasets[0].data = [done, open];
  archiveChart.data.datasets[0].backgroundColor = [
    accentRgba(0.85),
    isLight ? "rgba(120,90,50,0.20)" : "rgba(255,255,255,0.16)"
  ];
  archiveChart.update("active");
}

function showArchiveWeekDetail(entry) {
  if (!archiveDetail || !archiveDetailDays || !archiveDetailTitle) return;

  const stamp = entry?.stamp ?? "—";
  const tasks = entry?.tasks ?? {};

  // switch UI
  archiveDetail.classList.remove("hidden");
  if (archiveList) archiveList.style.display = "none";

  let total = 0, done = 0;
  for (const d of dayOrder) {
    const st = computeStats(tasks[d] ?? []);
    total += st.total;
    done += st.done;
  }
  const open = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  archiveDetailTitle.textContent = `Week ${stamp}`;
  if (archiveDetailMeta) {
    archiveDetailMeta.textContent = `${done}/${total} done • ${pct}% completed • ${new Date(entry.archivedAt).toLocaleString("de-DE")}`;
  }

  // chart (only if canvas exists in modal)
  updateArchiveChart(done, open);

  // day breakdown
  archiveDetailDays.innerHTML = "";
  for (const day of dayOrder) {
    const list = tasks[day] ?? [];
    const st = computeStats(list);

    const box = document.createElement("div");
    box.className = "archiveDay";
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px;">
        <strong>${dayLabels[day]}</strong>
        <span class="small">${st.done}/${st.total}</span>
      </div>
      <div class="small" style="opacity:.85; margin-top:6px;">
        ${list.length ? list.map(t => (t.checked ? "✅ " : "⬜ ") + escapeHtml(t.text)).join("<br>") : "—"}
      </div>
    `;
    archiveDetailDays.appendChild(box);
  }
}

// Archive events
archiveBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  window.location.href = "archive.html";
});
archiveCloseBtn?.addEventListener("click", () => {
  hideArchive();
  closeSettingsMenu();
});
archiveBackBtn?.addEventListener("click", backToArchiveList);

// Clicking outside modal card closes (if you used overlay click close)
archiveModal?.addEventListener("click", (e) => {
  if (e.target === archiveModal) {
    hideArchive();
    closeSettingsMenu();
  }
});

// =========================================================
// Mini calendar (right sidebar)
// =========================================================
let miniCalCursor = null;
let miniCalSelectedDate = null;

function startOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMiniCalSelectedDate(d) {
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  });
}

function mapMiniCalDateToWeekDay(d) {
  const date = startOfDayLocal(d);
  const mondayCurrent = getMondayOfISOWeekLocal(new Date());
  const mondayNext = new Date(mondayCurrent);
  mondayNext.setDate(mondayCurrent.getDate() + 7);
  const mondayAfterNext = new Date(mondayCurrent);
  mondayAfterNext.setDate(mondayCurrent.getDate() + 14);

  const idx = (date.getDay() + 6) % 7; // 0=Mon..6=Sun
  const day = dayOrder[idx];

  if (date >= mondayCurrent && date < mondayNext) return { day, which: "current" };
  if (date >= mondayNext && date < mondayAfterNext) return { day, which: "next" };
  return { day, which: date < mondayNext ? "current" : "next" };
}

function renderMiniCalendar() {
  if (!miniCalMonth || !miniCalGrid || !miniCalCursor) return;

  const year = miniCalCursor.getFullYear();
  const month = miniCalCursor.getMonth();
  const today = startOfDayLocal(new Date());

  miniCalMonth.textContent = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric"
  }).format(miniCalCursor);

  miniCalGrid.innerHTML = "";

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-based
  const firstCellDate = new Date(year, month, 1 - startOffset);

  for (let i = 0; i < 42; i++) {
    const d = new Date(firstCellDate);
    d.setDate(firstCellDate.getDate() + i);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "miniCalCell";
    btn.textContent = String(d.getDate());

    if (d.getMonth() !== month) btn.classList.add("isMuted");
    if (isSameDate(d, today)) btn.classList.add("isToday");
    if (miniCalSelectedDate && isSameDate(d, miniCalSelectedDate)) btn.classList.add("isSelected");

    btn.addEventListener("click", () => {
      miniCalSelectedDate = startOfDayLocal(d);
      if (miniCalSelected) miniCalSelected.textContent = formatMiniCalSelectedDate(miniCalSelectedDate);
      renderMiniCalendar();

      const target = mapMiniCalDateToWeekDay(miniCalSelectedDate);
      openDetail(target.day, target.which, miniCalSelectedDate);
      setLastActivity(`Mini-Kalender: ${dayLabels[target.day]} (${target.which === "next" ? "Next Week" : "Current Week"}) geoeffnet`);
    });

    miniCalGrid.appendChild(btn);
  }

  if (miniCalSelected && miniCalSelectedDate) {
    miniCalSelected.textContent = formatMiniCalSelectedDate(miniCalSelectedDate);
  }
}

function initMiniCalendar() {
  if (!miniCalMonth || !miniCalGrid || !miniCalPrev || !miniCalNext) return;

  const today = startOfDayLocal(new Date());
  miniCalCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  miniCalSelectedDate = today;

  miniCalPrev.addEventListener("click", () => {
    miniCalCursor.setMonth(miniCalCursor.getMonth() - 1);
    renderMiniCalendar();
  });

  miniCalNext.addEventListener("click", () => {
    miniCalCursor.setMonth(miniCalCursor.getMonth() + 1);
    renderMiniCalendar();
  });

  renderMiniCalendar();
}

// =========================================================
// Timer (right sidebar)
// =========================================================
const TIMER_DEFAULT_SECONDS = 25 * 60;
let timerDurationSeconds = TIMER_DEFAULT_SECONDS;
let timerRemainingSeconds = TIMER_DEFAULT_SECONDS;
let timerIntervalId = null;

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function stopTimerInterval() {
  if (!timerIntervalId) return;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
}

function renderTimer() {
  if (timerDisplay) timerDisplay.textContent = formatTimer(timerRemainingSeconds);

  if (timerStartPause) {
    if (timerIntervalId) timerStartPause.textContent = "Pause";
    else if (timerRemainingSeconds > 0 && timerRemainingSeconds < timerDurationSeconds) timerStartPause.textContent = "Weiter";
    else timerStartPause.textContent = "Start";
  }

  if (timerStateLabel) {
    if (timerIntervalId) timerStateLabel.textContent = "Läuft";
    else if (timerRemainingSeconds === 0) timerStateLabel.textContent = "Fertig";
    else if (timerRemainingSeconds < timerDurationSeconds) timerStateLabel.textContent = "Pausiert";
    else timerStateLabel.textContent = "Bereit";
  }

  timerPresetButtons.forEach(btn => {
    const sec = Number(btn.dataset.seconds);
    btn.classList.toggle("active", sec === timerDurationSeconds);
  });
}

function startTimer() {
  if (timerIntervalId) return;
  if (timerRemainingSeconds <= 0) timerRemainingSeconds = timerDurationSeconds;

  timerIntervalId = setInterval(() => {
    timerRemainingSeconds -= 1;
    if (timerRemainingSeconds <= 0) {
      timerRemainingSeconds = 0;
      stopTimerInterval();
    }
    renderTimer();
  }, 1000);

  renderTimer();
}

function pauseTimer() {
  stopTimerInterval();
  renderTimer();
}

function resetTimer() {
  stopTimerInterval();
  timerRemainingSeconds = timerDurationSeconds;
  renderTimer();
}

function setTimerPreset(seconds) {
  stopTimerInterval();
  timerDurationSeconds = seconds;
  timerRemainingSeconds = seconds;
  if (timerCustomMinutes) timerCustomMinutes.value = String(Math.floor(seconds / 60));
  renderTimer();
}

function applyCustomTimerMinutes() {
  if (!timerCustomMinutes) return;

  const minutes = Number(timerCustomMinutes.value);
  if (!Number.isFinite(minutes)) return;

  const clampedMinutes = Math.min(240, Math.max(1, Math.floor(minutes)));
  timerCustomMinutes.value = String(clampedMinutes);
  setTimerPreset(clampedMinutes * 60);
}

function initTimer() {
  if (!timerDisplay || !timerStartPause || !timerReset) return;
  if (timerCustomMinutes) timerCustomMinutes.value = String(Math.floor(timerDurationSeconds / 60));

  timerStartPause.addEventListener("click", () => {
    if (timerIntervalId) pauseTimer();
    else startTimer();
  });

  timerReset.addEventListener("click", resetTimer);

  timerPresetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = Number(btn.dataset.seconds);
      if (!Number.isFinite(sec) || sec <= 0) return;
      setTimerPreset(sec);
    });
  });

  timerCustomApply?.addEventListener("click", applyCustomTimerMinutes);
  timerCustomMinutes?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyCustomTimerMinutes();
  });

  renderTimer();
}

// =========================================================
// Init
// =========================================================
updateDayCardDates();
setInterval(updateDayCardDates, 60_000);
initMiniCalendar();
initTimer();
initWeekNote("current", weekNoteInput, weekNoteStatus);
initWeekNote("next", weekNoteNextInput, weekNoteNextStatus);
renderLastActivity();
renderMotivation();
setInterval(renderMotivation, 60_000);

// Weekly reset (current week only)
const resetData = weeklyResetIfNeeded();
const initialCurrent = resetData ?? loadWeekTasks("current");

// Ensure next week storage exists (does not overwrite existing)
(function ensureNextWeekExists() {
  const raw = localStorage.getItem(STORAGE_KEY_TASKS_NEXT);
  if (!raw) saveWeekTasks("next", emptyWeekObj());
})();

// Render
updateBadges(initialCurrent);
updateWeeklySummary(initialCurrent);
