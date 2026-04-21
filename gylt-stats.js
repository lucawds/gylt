const GYLT_STATS_STORAGE_KEY = "gylt-dashboard-v1";
const GYLT_FRIENDS_STORAGE_KEY = "gylt-friends-v1";
const GYLT_NOTIFY_STORAGE_KEY = "gylt-streak-reminder-v1";
const GYLT_GROUPS_STORAGE_KEY = "gylt-groups-v1";
const GYLT_LEVEL_XP_STEP = 250;

const GYLT_TASK_LIBRARY = [
  { id: "reset", title: "Morgen-Reset" },
  { id: "move", title: "Bewegung" },
  { id: "focus", title: "Fokus-Block" },
  { id: "fuel", title: "Energie halten" },
  { id: "shutdown", title: "Abend-Check-out" }
];

const statsElements = {
  successQuote: document.getElementById("gyltStatsSuccessQuote"),
  successText: document.getElementById("gyltStatsSuccessText"),
  strongestDay: document.getElementById("gyltStatsStrongestDay"),
  strongestText: document.getElementById("gyltStatsStrongestText"),
  momentum: document.getElementById("gyltStatsMomentum"),
  momentumText: document.getElementById("gyltStatsMomentumText"),
  weekBars: document.getElementById("gyltStatsWeekBars"),
  challengeList: document.getElementById("gyltStatsChallengeList"),
  level: document.getElementById("gyltStatsLevel"),
  xp: document.getElementById("gyltStatsXp"),
  levelText: document.getElementById("gyltStatsLevelText"),
  sharedStatsList: document.getElementById("gyltSharedStatsList"),
  myRank: document.getElementById("gyltStatsMyRank"),
  myRankText: document.getElementById("gyltStatsMyRankText"),
  flame: document.getElementById("gyltStatsFlame"),
  flameCount: document.getElementById("gyltStatsFlameCount"),
  notifyButton: document.getElementById("gyltStatsNotifyButton"),
  notifyStatus: document.getElementById("gyltStatsNotifyStatus"),
  groupForm: document.getElementById("gyltGroupForm"),
  groupName: document.getElementById("gyltGroupName"),
  groupCreateButton: document.getElementById("gyltGroupCreateButton"),
  groupFriendOptions: document.getElementById("gyltGroupFriendOptions"),
  groupStatus: document.getElementById("gyltGroupStatus"),
  groupList: document.getElementById("gyltGroupList")
};

let gyltNotifyTimer = null;

initStatsPage();

function initStatsPage() {
  bindStatsEvents();
  renderStatsPage();
  initNotificationLoop();
}

function bindStatsEvents() {
  statsElements.notifyButton?.addEventListener("click", async () => {
    await requestNotificationPermission();
    updateNotificationUi();
    maybeSendReminder();
  });

  statsElements.groupForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const groupName = String(statsElements.groupName?.value || "").trim();
    if (!groupName) {
      setGroupStatus("Gib deiner Crew erst einen Namen.");
      statsElements.groupName?.focus();
      return;
    }

    const selectedFriendIds = getSelectedGroupFriendIds();
    if (!selectedFriendIds.length) {
      setGroupStatus("Wähle mindestens einen Freund für deine Crew aus.");
      return;
    }

    const groups = loadGroups();
    groups.unshift({
      id: `group-${Date.now()}`,
      name: groupName,
      memberIds: selectedFriendIds
    });

    saveGroups(groups);
    statsElements.groupForm.reset();
    setGroupStatus(`${groupName} wurde erstellt.`);
    renderStatsPage();
  });

  statsElements.groupList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-remove-group-id]");
    if (!target) return;

    const removeId = target.dataset.removeGroupId;
    const groups = loadGroups();
    const group = groups.find((entry) => entry.id === removeId);
    const nextGroups = groups.filter((entry) => entry.id !== removeId);
    saveGroups(nextGroups);
    setGroupStatus(group ? `${group.name} wurde entfernt.` : "Crew entfernt.");
    renderStatsPage();
  });
}

function renderStatsPage() {
  const state = loadGyltState();
  const allDays = state.days || {};
  const history = buildHistory(allDays);
  const weekDates = getCurrentWeekDates();
  const weekEntries = weekDates.map((date) => createDayEntry(formatDateKey(date), allDays));
  const streakInfo = getStreakInfo(allDays);
  const friends = getFriends();
  const xpState = buildXpState(allDays, weekEntries, history, streakInfo, friends);
  const compareEntries = buildCompareEntries(friends, weekEntries, streakInfo.count, xpState);

  renderOwnStats(weekEntries, streakInfo);
  renderChallenges(xpState);
  renderSharedStats(compareEntries);
  renderGroupFriendOptions(friends);
  renderGroups(loadGroups(), compareEntries);
  renderStreakFlame(streakInfo);
  updateNotificationUi(streakInfo);
}

function renderOwnStats(weekEntries, streakInfo) {
  const totals = weekEntries.reduce((sum, entry) => ({
    completed: sum.completed + entry.completedCount,
    possible: sum.possible + entry.totalCount
  }), { completed: 0, possible: 0 });
  const successQuote = totals.possible === 0 ? 0 : Math.round((totals.completed / totals.possible) * 100);
  const strongestEntry = [...weekEntries].sort((a, b) => b.completionPercent - a.completionPercent || b.completedCount - a.completedCount)[0];

  statsElements.successQuote.textContent = `${successQuote}%`;
  statsElements.successText.textContent =
    successQuote >= 70
      ? "Starke Woche. Genau auf solchen Phasen baut dein nächstes Level auf."
      : totals.possible > 0
        ? "Deine Woche ist in Bewegung. Saubere Wiederholungen bringen jetzt XP."
        : "Wähle erst Tagesaufgaben im Tagebuch, dann wird deine Woche messbar.";

  statsElements.strongestDay.textContent = strongestEntry && strongestEntry.totalCount > 0
    ? strongestEntry.weekdayName
    : "Noch keiner";
  statsElements.strongestText.textContent =
    strongestEntry && strongestEntry.totalCount > 0
      ? `${strongestEntry.completedCount} von ${strongestEntry.totalCount} Aufgaben haben an diesem Tag gesessen.`
      : "Sobald du Tage nutzt, wird hier dein stärkster Tag sichtbar.";

  statsElements.momentum.textContent = `${streakInfo.count} ${streakInfo.count === 1 ? "Tag" : "Tage"}`;
  statsElements.momentumText.textContent =
    streakInfo.alive
      ? "Deine Serie lebt. Heute sauber bleiben hält die Flamme an."
      : streakInfo.count > 0
        ? "Die letzte Serie ist gerissen. Heute kann die nächste starten."
        : "Sobald du komplette Tage sammelst, wächst hier deine Serie.";

  renderWeekBars(weekEntries);
}

function renderWeekBars(weekEntries) {
  if (!statsElements.weekBars) return;

  statsElements.weekBars.innerHTML = "";

  weekEntries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "gyltBarRow";
    row.innerHTML = `
      <span>${entry.weekdayShort}</span>
      <div class="gyltBarTrack"><span class="gyltBarFill" style="width:${entry.completionPercent}%"></span></div>
      <strong>${entry.totalCount ? `${entry.completedCount}/${entry.totalCount}` : "0/0"}</strong>
    `;
    statsElements.weekBars.appendChild(row);
  });
}

function renderChallenges(xpState) {
  if (statsElements.level) statsElements.level.textContent = `Level ${xpState.level}`;
  if (statsElements.xp) statsElements.xp.textContent = `${xpState.totalXp} XP`;
  if (statsElements.levelText) {
    statsElements.levelText.textContent = `${xpState.xpIntoLevel}/${GYLT_LEVEL_XP_STEP} XP bis Level ${xpState.level + 1}.`;
  }
  if (!statsElements.challengeList) return;

  statsElements.challengeList.innerHTML = "";

  xpState.challenges.forEach((challenge) => {
    const card = document.createElement("article");
    card.className = `gyltInsightCard gyltChallengeCard${challenge.completed ? " isDone" : ""}`;
    card.innerHTML = `
      <div class="gyltChallengeMeta">
        <div>
          <div class="small">${escapeHtml(challenge.category)}</div>
          <strong>${escapeHtml(challenge.title)}</strong>
        </div>
        <span class="gyltChallengeXp">+${challenge.rewardXp} XP</span>
      </div>
      <p>${escapeHtml(challenge.description)}</p>
      <div class="gyltChallengeProgress">
        <span class="gyltChallengeProgressBar" style="width:${challenge.progressPct}%"></span>
      </div>
      <div class="small">${escapeHtml(challenge.progressLabel)}</div>
    `;
    statsElements.challengeList.appendChild(card);
  });
}

function renderSharedStats(compareEntries) {
  if (!statsElements.sharedStatsList) return;

  statsElements.sharedStatsList.innerHTML = "";

  if (compareEntries.length <= 1) {
    statsElements.sharedStatsList.innerHTML = `
      <div class="gyltEmptyState">
        Noch keine Freunde gespeichert. Füge in „Mein Profil“ erste Freunde hinzu, damit Rangliste, Challenges und Crews Druck aufbauen können.
      </div>
    `;
    statsElements.myRank.textContent = "#1";
    statsElements.myRankText.textContent = "Du bist gerade allein unterwegs.";
    return;
  }

  const myIndex = compareEntries.findIndex((entry) => entry.isMe);
  const aheadEntry = myIndex > 0 ? compareEntries[myIndex - 1] : null;
  statsElements.myRank.textContent = `#${myIndex + 1}`;
  statsElements.myRankText.textContent = aheadEntry
    ? `${aheadEntry.name} liegt gerade vor dir. Perfekt für ein bisschen Freundesdruck.`
    : "Du setzt gerade das Tempo in deiner Rangliste.";

  compareEntries.forEach((entry, index) => {
    const isFriend = !entry.isMe && entry.id;
    const cardTag = isFriend ? "a" : "article";
    const card = document.createElement(cardTag);
    const leaderClass = index === 0 ? " isLeader" : "";
    card.className = `gyltCompareCard${entry.isMe ? " isMe" : ""}${leaderClass}${isFriend ? " isLink" : ""}`;
    if (isFriend) {
      card.href = `gylt-friend-shared.html?id=${encodeURIComponent(entry.id)}`;
      card.setAttribute("aria-label", `${entry.name} genauer ansehen`);
    }

    const detailText = isFriend ? "Tippen für geteilten Stand" : "Dein aktueller Stand";

    card.innerHTML = `
      <div class="gyltCompareRank">#${index + 1}</div>
      <div class="gyltCompareBody">
        <strong>${escapeHtml(entry.name)}</strong>
        <p>${entry.weeklyPct}% Woche · ${entry.streak} ${entry.streak === 1 ? "Tag" : "Tage"} Streak · LV ${entry.level} · ${entry.xp} XP · ${detailText}</p>
      </div>
    `;
    statsElements.sharedStatsList.appendChild(card);
  });
}

function renderGroupFriendOptions(friends) {
  if (!statsElements.groupFriendOptions || !statsElements.groupCreateButton) return;

  statsElements.groupFriendOptions.innerHTML = "";
  if (!friends.length) {
    statsElements.groupFriendOptions.innerHTML = `
      <div class="gyltEmptyState">Sobald du Freunde hinzugefügt hast, kannst du hier kleine Crews erstellen.</div>
    `;
    statsElements.groupCreateButton.disabled = true;
    return;
  }

  statsElements.groupCreateButton.disabled = false;

  friends.forEach((friend) => {
    const option = document.createElement("label");
    option.className = "gyltGroupOption";
    option.innerHTML = `
      <input type="checkbox" value="${escapeHtml(friend.id)}" />
      <span>${escapeHtml(friend.name)}</span>
    `;
    statsElements.groupFriendOptions.appendChild(option);
  });
}

function renderGroups(groups, compareEntries) {
  if (!statsElements.groupList) return;

  statsElements.groupList.innerHTML = "";

  if (!groups.length) {
    statsElements.groupList.innerHTML = `
      <div class="gyltEmptyState">Noch keine Crew erstellt. Lege eine kleine Gruppe an, um gezielt Druck und Vergleich aufzubauen.</div>
    `;
    return;
  }

  const compareMap = new Map(compareEntries.map((entry) => [entry.id, entry]));

  groups.forEach((group) => {
    const members = [
      compareMap.get("me"),
      ...group.memberIds.map((memberId) => compareMap.get(memberId))
    ].filter(Boolean);

    const uniqueMembers = Array.from(new Map(members.map((member) => [member.id, member])).values())
      .sort((a, b) => b.score - a.score || b.weeklyPct - a.weeklyPct || b.xp - a.xp);

    const card = document.createElement("article");
    card.className = "gyltGroupCard";
    card.innerHTML = `
      <div class="gyltGroupCardTop">
        <div>
          <div class="small">Crew</div>
          <strong>${escapeHtml(group.name)}</strong>
          <p>${uniqueMembers.length} Mitglieder · Wer oben bleibt, hält den Druck hoch.</p>
        </div>
        <button class="gyltDeleteButton" type="button" data-remove-group-id="${group.id}">Entfernen</button>
      </div>
      <div class="gyltGroupMembers">
        ${uniqueMembers.map((member, index) => `
          <div class="gyltGroupMemberRow">
            <span class="gyltGroupMemberRank">#${index + 1}</span>
            <strong>${escapeHtml(member.name)}</strong>
            <span>${member.weeklyPct}%</span>
            <span>LV ${member.level}</span>
          </div>
        `).join("")}
      </div>
    `;
    statsElements.groupList.appendChild(card);
  });
}

function renderStreakFlame(streakInfo) {
  if (!statsElements.flame || !statsElements.flameCount) return;

  statsElements.flameCount.textContent = String(streakInfo.count);
  statsElements.flame.classList.toggle("isAlive", streakInfo.alive);
  statsElements.flame.classList.toggle("isOff", !streakInfo.alive);
  statsElements.flame.setAttribute(
    "aria-label",
    streakInfo.alive ? `Streak lebt, aktuell ${streakInfo.count} Tage` : "Streak ist aktuell nicht aktiv"
  );
}

function buildXpState(allDays, weekEntries, history, streakInfo, friends) {
  const lifetimeEntries = Object.keys(allDays)
    .sort()
    .map((dateKey) => createDayEntry(dateKey, allDays));
  const lifetimeCompletedTasks = lifetimeEntries.reduce((sum, entry) => sum + entry.completedCount, 0);
  const perfectDays = lifetimeEntries.filter((entry) => entry.allDone).length;
  const weekTotals = weekEntries.reduce((sum, entry) => ({
    completed: sum.completed + entry.completedCount,
    possible: sum.possible + entry.totalCount
  }), { completed: 0, possible: 0 });
  const weeklyRate = weekTotals.possible === 0 ? 0 : Math.round((weekTotals.completed / weekTotals.possible) * 100);
  const myPressureScore = weeklyRate + (streakInfo.count * 4);
  const beatenFriends = friends.filter((friend) => myPressureScore > (friend.weeklyPct + (friend.streak * 4))).length;

  const challenges = [
    createChallenge({
      category: "Woche",
      title: "Woche auf Zug",
      description: "Erreiche in dieser Woche mindestens 70% Erfolgsquote.",
      value: weeklyRate,
      target: 70,
      rewardXp: 120,
      unit: "%"
    }),
    createChallenge({
      category: "Streak",
      title: "Flamme schützen",
      description: "Halte eine aktive Serie von 3 sauberen Tagen.",
      value: streakInfo.count,
      target: 3,
      rewardXp: 90,
      unit: "Tage"
    }),
    createChallenge({
      category: "Freunde",
      title: "Freundesdruck",
      description: friends.length
        ? "Zieh in deiner Wochenform an mindestens einem Freund vorbei."
        : "Sobald Freunde da sind, wird diese Challenge aktiviert.",
      value: friends.length ? beatenFriends : 0,
      target: 1,
      rewardXp: 150,
      unit: friends.length ? "Freund" : "Freund"
    }),
    createChallenge({
      category: "Konstanz",
      title: "12er-Woche",
      description: "Erledige in dieser Woche mindestens 12 Tagesaufgaben.",
      value: weekTotals.completed,
      target: 12,
      rewardXp: 110,
      unit: "Aufgaben"
    })
  ];

  const baseXp = (lifetimeCompletedTasks * 35) + (perfectDays * 20) + (history.bestStreak * 12);
  const bonusXp = challenges.filter((challenge) => challenge.completed).reduce((sum, challenge) => sum + challenge.rewardXp, 0);
  const totalXp = baseXp + bonusXp;
  const level = Math.max(1, Math.floor(totalXp / GYLT_LEVEL_XP_STEP) + 1);
  const xpIntoLevel = totalXp - ((level - 1) * GYLT_LEVEL_XP_STEP);

  return {
    totalXp,
    level,
    xpIntoLevel,
    challenges
  };
}

function createChallenge({ category, title, description, value, target, rewardXp, unit }) {
  const safeValue = Math.max(0, Math.round(value));
  const safeTarget = Math.max(1, Math.round(target));
  const completed = safeValue >= safeTarget;
  const progressPct = Math.max(8, Math.min(100, Math.round((safeValue / safeTarget) * 100)));

  return {
    category,
    title,
    description,
    rewardXp,
    completed,
    progressPct,
    progressLabel: completed
      ? `Geschafft · ${safeValue}/${safeTarget} ${unit}`
      : `${safeValue}/${safeTarget} ${unit}`,
  };
}

function buildCompareEntries(friends, weekEntries, myStreak, xpState) {
  const totals = weekEntries.reduce((sum, entry) => ({
    completed: sum.completed + entry.completedCount,
    possible: sum.possible + entry.totalCount
  }), { completed: 0, possible: 0 });
  const myWeeklyPct = totals.possible === 0 ? 0 : Math.round((totals.completed / totals.possible) * 100);
  const entries = [
    createCompareEntry({
      id: "me",
      name: "Du",
      weeklyPct: myWeeklyPct,
      streak: myStreak,
      xp: xpState.totalXp,
      level: xpState.level
    }, true),
    ...friends.map((friend) => {
      const derivedProgress = deriveFriendProgress(friend);
      return createCompareEntry({
        ...friend,
        xp: derivedProgress.xp,
        level: derivedProgress.level
      }, false);
    })
  ];

  return entries.sort((a, b) => b.score - a.score || b.weeklyPct - a.weeklyPct || b.xp - a.xp);
}

function createCompareEntry(entry, isMe) {
  return {
    id: entry.id,
    name: entry.name,
    weeklyPct: clampNumber(entry.weeklyPct, 0, 100, 0),
    streak: clampNumber(entry.streak, 0, 999, 0),
    xp: clampNumber(entry.xp, 0, 999999, 0),
    level: clampNumber(entry.level, 1, 999, 1),
    isMe,
    score: clampNumber(entry.weeklyPct, 0, 100, 0) + (clampNumber(entry.streak, 0, 999, 0) * 4) + (clampNumber(entry.level, 1, 999, 1) * 10)
  };
}

function deriveFriendProgress(friend) {
  const weeklyPct = clampNumber(friend.weeklyPct, 0, 100, 0);
  const streak = clampNumber(friend.streak, 0, 999, 0);
  const xp = (weeklyPct * 8) + (streak * 26) + 120;
  const level = Math.max(1, Math.floor(xp / GYLT_LEVEL_XP_STEP) + 1);
  return { xp, level };
}

function createDayEntry(dateKey, allDays) {
  const dayState = normalizeDayState(allDays[dateKey]);
  const completedCount = getCompletedTaskCount(dayState);
  const totalCount = getTotalTaskCount(dayState);

  return {
    dateKey,
    weekdayShort: formatWeekdayShort(dateKey),
    weekdayName: formatWeekdayName(dateKey),
    completedCount,
    totalCount,
    completionPercent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    state: dayState,
    allDone: totalCount > 0 && completedCount === totalCount
  };
}

function buildHistory(allDays) {
  const normalizedDays = Object.keys(allDays).sort().map((key) => ({
    key,
    state: normalizeDayState(allDays[key])
  }));

  let bestStreak = 0;
  let currentStreak = 0;
  normalizedDays.forEach((entry) => {
    const total = entry.state.tasks.length;
    const completed = getCompletedTaskCount(entry.state);
    if (total > 0 && completed === total) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return { bestStreak };
}

function normalizeDayState(dayState) {
  const defaultState = createDefaultDayState();
  const normalizedTasks = normalizeTasks(dayState && dayState.tasks);

  if (normalizedTasks.length) {
    return {
      reflection: dayState && typeof dayState.reflection === "string" ? dayState.reflection : "",
      updatedAt: dayState && typeof dayState.updatedAt === "string" ? dayState.updatedAt : "",
      tasks: normalizedTasks
    };
  }

  const legacyHabits = { ...defaultState.habits, ...(dayState && dayState.habits ? dayState.habits : {}) };
  const legacyTasks = GYLT_TASK_LIBRARY
    .filter((task) => legacyHabits[task.id])
    .map((task) => ({
      id: `legacy-${task.id}`,
      title: task.title,
      subtitle: "Aus alter Version übernommen.",
      done: true,
      source: "legacy",
      presetId: task.id
    }));

  return {
    reflection: dayState && typeof dayState.reflection === "string" ? dayState.reflection : "",
    updatedAt: dayState && typeof dayState.updatedAt === "string" ? dayState.updatedAt : "",
    tasks: legacyTasks
  };
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .filter((task) => task && typeof task.title === "string" && task.title.trim())
    .map((task) => ({
      id: typeof task.id === "string" ? task.id : `task-${Date.now()}`,
      title: task.title.trim(),
      subtitle: typeof task.subtitle === "string" ? task.subtitle.trim() : "",
      done: Boolean(task.done),
      source: typeof task.source === "string" ? task.source : "custom",
      presetId: typeof task.presetId === "string" ? task.presetId : ""
    }));
}

function createDefaultDayState() {
  return {
    reflection: "",
    updatedAt: "",
    tasks: [],
    habits: Object.fromEntries(GYLT_TASK_LIBRARY.map((task) => [task.id, false]))
  };
}

function getCompletedTaskCount(dayState) {
  return dayState.tasks.reduce((count, task) => count + (task.done ? 1 : 0), 0);
}

function getTotalTaskCount(dayState) {
  return dayState.tasks.length;
}

function getStreakInfo(allDays) {
  const todayKey = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);
  const todayEntry = createDayEntry(todayKey, allDays);
  const yesterdayEntry = createDayEntry(yesterdayKey, allDays);

  let streak = 0;
  let currentDate = todayEntry.allDone ? parseDateKey(todayKey) : parseDateKey(yesterdayKey);

  while (true) {
    const currentKey = formatDateKey(currentDate);
    const entry = createDayEntry(currentKey, allDays);
    if (!entry.allDone) break;
    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return {
    count: streak,
    alive: todayEntry.allDone || yesterdayEntry.allDone,
    todayEntry
  };
}

function getSelectedGroupFriendIds() {
  if (!statsElements.groupFriendOptions) return [];
  return Array.from(statsElements.groupFriendOptions.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value)
    .filter(Boolean);
}

function loadGyltState() {
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

function loadGroups() {
  try {
    const raw = localStorage.getItem(GYLT_GROUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((group) => group && typeof group.name === "string")
      .map((group) => ({
        id: typeof group.id === "string" ? group.id : `group-${Date.now()}`,
        name: group.name.trim() || "Crew",
        memberIds: Array.isArray(group.memberIds)
          ? Array.from(new Set(group.memberIds.filter((memberId) => typeof memberId === "string" && memberId.trim())))
          : []
      }));
  } catch (error) {
    return [];
  }
}

function saveGroups(groups) {
  localStorage.setItem(GYLT_GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

function setGroupStatus(message) {
  if (statsElements.groupStatus) statsElements.groupStatus.textContent = message;
}

function updateNotificationUi(streakInfo = getStreakInfo(loadGyltState().days || {})) {
  if (!statsElements.notifyButton || !statsElements.notifyStatus) return;

  if (!("Notification" in window)) {
    statsElements.notifyButton.disabled = true;
    statsElements.notifyStatus.textContent = "Dieser Browser unterstützt hier keine Erinnerungen.";
    return;
  }

  if (Notification.permission === "granted") {
    statsElements.notifyButton.textContent = "Erinnerungen aktiv";
    statsElements.notifyStatus.textContent = streakInfo.alive
      ? "Lokale Streak-Erinnerung ist aktiv."
      : "Erinnerung aktiv. Du bekommst Hinweise, wenn deine Serie in Gefahr ist.";
    return;
  }

  if (Notification.permission === "denied") {
    statsElements.notifyButton.disabled = true;
    statsElements.notifyStatus.textContent = "Benachrichtigungen wurden im Browser blockiert.";
    return;
  }

  statsElements.notifyButton.disabled = false;
  statsElements.notifyButton.textContent = "Erinnerung aktivieren";
  statsElements.notifyStatus.textContent = "Aktiviere lokale Browser-Erinnerungen für deine Streak.";
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted" || Notification.permission === "denied") return;
  await Notification.requestPermission();
}

function initNotificationLoop() {
  updateNotificationUi();
  maybeSendReminder();

  if (gyltNotifyTimer) window.clearInterval(gyltNotifyTimer);
  gyltNotifyTimer = window.setInterval(() => {
    maybeSendReminder();
    renderStatsPage();
  }, 60000);
}

function maybeSendReminder() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const state = loadGyltState();
  const streakInfo = getStreakInfo(state.days || {});
  const hour = new Date().getHours();
  if (hour < 18) return;

  const todayKey = formatDateKey(new Date());
  const alreadyNotified = localStorage.getItem(GYLT_NOTIFY_STORAGE_KEY) === todayKey;
  if (alreadyNotified) return;

  const todayEntry = streakInfo.todayEntry;
  const hasOpenTasks = todayEntry.totalCount > 0 && todayEntry.completedCount < todayEntry.totalCount;
  const noTasksChosen = todayEntry.totalCount === 0;

  if (!hasOpenTasks && !noTasksChosen) return;

  const body = streakInfo.alive
    ? hasOpenTasks
      ? `Deine Streak lebt noch. Heute fehlen noch ${todayEntry.totalCount - todayEntry.completedCount} Aufgabe(n).`
      : "Deine Serie lebt. Wähle heute noch Aufgaben aus, damit sie nicht still ausläuft."
    : hasOpenTasks
      ? `Heute fehlen noch ${todayEntry.totalCount - todayEntry.completedCount} Aufgabe(n). Starte wieder sauber rein.`
      : "Zeit für einen neuen sauberen Tag in GYLT.";

  new Notification("GYLT Erinnerung", {
    body,
    tag: "gylt-streak-reminder"
  });

  localStorage.setItem(GYLT_NOTIFY_STORAGE_KEY, todayKey);
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

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekdayShort(dateKey) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" })
    .format(parseDateKey(dateKey))
    .replace(".", "");
}

function formatWeekdayName(dateKey) {
  const formatted = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(parseDateKey(dateKey));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
