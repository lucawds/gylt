const GYLT_FRIENDS_STORAGE_KEY = "gylt-friends-v1";
const GYLT_STATS_STORAGE_KEY = "gylt-dashboard-v1";

const sharedElements = {
  name: document.getElementById("gyltFriendSharedName"),
  lead: document.getElementById("gyltFriendSharedLead"),
  rank: document.getElementById("gyltFriendSharedRank"),
  weekly: document.getElementById("gyltFriendSharedWeekly"),
  weeklyText: document.getElementById("gyltFriendSharedWeeklyText"),
  streak: document.getElementById("gyltFriendSharedStreak"),
  streakText: document.getElementById("gyltFriendSharedStreakText"),
  bars: document.getElementById("gyltFriendSharedBars"),
  compareTitle: document.getElementById("gyltFriendSharedCompareTitle"),
  compareText: document.getElementById("gyltFriendSharedCompareText"),
  trendTitle: document.getElementById("gyltFriendSharedTrendTitle"),
  trendText: document.getElementById("gyltFriendSharedTrendText")
};

initSharedFriendPage();

function initSharedFriendPage() {
  const friendId = new URLSearchParams(window.location.search).get("id");
  const friends = getFriends();
  const friend = friends.find((entry) => entry.id === friendId);

  if (!friend) {
    renderMissingFriend();
    return;
  }

  renderFriendShared(friend, friends);
}

function renderFriendShared(friend, friends) {
  const myStats = getMyStats();
  const ranking = buildRanking(friends, myStats);
  const rankIndex = ranking.findIndex((entry) => entry.id === friend.id);
  const derivedWeek = buildDerivedWeek(friend);
  const diff = friend.weeklyPct - myStats.weeklyPct;

  document.title = `GYLT - ${friend.name}`;
  sharedElements.name.textContent = friend.name;
  sharedElements.lead.textContent = "Hier siehst du die aktuell freigegebenen Werte dieses Freundes.";
  sharedElements.rank.textContent = `#${rankIndex + 1}`;
  sharedElements.weekly.textContent = `${friend.weeklyPct}%`;
  sharedElements.weeklyText.textContent =
    friend.weeklyPct >= 75 ? "Sehr starke Woche mit klarer Konstanz." : "Gerade im Aufbau, aber sichtbar aktiv.";
  sharedElements.streak.textContent = `${friend.streak} ${friend.streak === 1 ? "Tag" : "Tage"}`;
  sharedElements.streakText.textContent =
    friend.streak >= 7 ? "Die Serie wirkt aktuell sehr stabil." : "Die Serie lebt, braucht aber noch mehr Tiefe.";

  sharedElements.compareTitle.textContent =
    diff === 0 ? "Ihr seid gleichauf" : diff > 0 ? `${friend.name} liegt vor dir` : `Du liegst vor ${friend.name}`;
  sharedElements.compareText.textContent =
    diff === 0
      ? "Ihr teilt gerade dieselbe Wochenquote."
      : `${Math.abs(diff)} Prozentpunkte Unterschied in der Wochenquote.`;

  sharedElements.trendTitle.textContent =
    friend.streak >= 10 ? "Sehr konstant" : friend.streak >= 4 ? "Im Zug" : "Noch wechselhaft";
  sharedElements.trendText.textContent =
    friend.streak >= 10
      ? "Die Serie deutet auf einen sehr stabilen Lauf hin."
      : friend.streak >= 4
        ? "Es baut sich gerade eine gute Serie auf."
        : "Hier ist noch deutlich Luft nach oben.";

  renderDerivedWeek(derivedWeek);
}

function renderMissingFriend() {
  sharedElements.name.textContent = "Freund nicht gefunden";
  sharedElements.lead.textContent = "Dieser freigegebene Eintrag ist nicht mehr verfügbar.";
  sharedElements.rank.textContent = "#-";
  sharedElements.weekly.textContent = "0%";
  sharedElements.weeklyText.textContent = "Keine Daten.";
  sharedElements.streak.textContent = "0 Tage";
  sharedElements.streakText.textContent = "Keine Daten.";
  sharedElements.compareTitle.textContent = "Noch kein Vergleich";
  sharedElements.compareText.textContent = "Der Eintrag wurde möglicherweise gelöscht.";
  sharedElements.trendTitle.textContent = "Noch offen";
  sharedElements.trendText.textContent = "Keine Daten verfügbar.";
  if (sharedElements.bars) {
    sharedElements.bars.innerHTML = `<div class="gyltEmptyState">Kein geteilter Fortschritt gefunden.</div>`;
  }
}

function renderDerivedWeek(days) {
  if (!sharedElements.bars) return;
  sharedElements.bars.innerHTML = "";

  days.forEach((day) => {
    const row = document.createElement("div");
    row.className = "gyltBarRow";
    row.innerHTML = `
      <span>${day.label}</span>
      <div class="gyltBarTrack"><span class="gyltBarFill" style="width:${day.value}%"></span></div>
      <strong>${day.value}%</strong>
    `;
    sharedElements.bars.appendChild(row);
  });
}

function buildDerivedWeek(friend) {
  const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const seed = Array.from(friend.name).reduce((sum, char) => sum + char.charCodeAt(0), 0) + friend.weeklyPct + friend.streak;
  const values = [];

  for (let index = 0; index < 7; index += 1) {
    const wave = ((seed + (index * 17)) % 23) - 11;
    const value = clamp(friend.weeklyPct + wave, 8, 100);
    values.push(value);
  }

  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const adjust = friend.weeklyPct - avg;

  return values.map((value, index) => ({
    label: labels[index],
    value: clamp(value + adjust, 4, 100)
  }));
}

function buildRanking(friends, myStats) {
  return [
    { id: "me", name: "Du", weeklyPct: myStats.weeklyPct, streak: myStats.streak, score: myStats.weeklyPct + (myStats.streak * 4) },
    ...friends.map((friend) => ({
      id: friend.id,
      name: friend.name,
      weeklyPct: friend.weeklyPct,
      streak: friend.streak,
      score: friend.weeklyPct + (friend.streak * 4)
    }))
  ].sort((a, b) => b.score - a.score || b.weeklyPct - a.weeklyPct || b.streak - a.streak);
}

function getMyStats() {
  const state = loadState();
  const weekDates = getCurrentWeekDates();
  const totals = weekDates.reduce((sum, date) => {
    const dateKey = formatDateKey(date);
    const dayState = normalizeDayState(state.days?.[dateKey]);
    return {
      completed: sum.completed + getCompletedTaskCount(dayState),
      possible: sum.possible + dayState.tasks.length
    };
  }, { completed: 0, possible: 0 });

  return {
    weeklyPct: totals.possible === 0 ? 0 : Math.round((totals.completed / totals.possible) * 100),
    streak: getMyStreak(state.days || {})
  };
}

function getMyStreak(allDays) {
  let streak = 0;
  let currentDate = new Date();

  while (true) {
    const dateKey = formatDateKey(currentDate);
    const dayState = normalizeDayState(allDays[dateKey]);
    const total = dayState.tasks.length;
    const completed = getCompletedTaskCount(dayState);
    if (!total || completed < total) break;
    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

function loadState() {
  try {
    const raw = localStorage.getItem(GYLT_STATS_STORAGE_KEY);
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { days: {} };
  } catch (error) {
    return { days: {} };
  }
}

function getFriends() {
  try {
    const raw = localStorage.getItem(GYLT_FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeDayState(dayState) {
  const tasks = Array.isArray(dayState && dayState.tasks)
    ? dayState.tasks.filter((task) => task && typeof task.title === "string")
    : [];

  return { tasks };
}

function getCompletedTaskCount(dayState) {
  return dayState.tasks.reduce((count, task) => count + (task.done ? 1 : 0), 0);
}

function getCurrentWeekDates() {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function getMondayOfWeek(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
