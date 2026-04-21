const GYLT_FRIENDS_STORAGE_KEY = "gylt-friends-v1";
const GYLT_PROFILE_STORAGE_KEY = "gylt-profile-v1";
const GYLT_DASHBOARD_STORAGE_KEY = "gylt-dashboard-v1";
const GYLT_GROUPS_STORAGE_KEY = "gylt-groups-v1";
const GYLT_LEVEL_XP_STEP = 250;

const DEFAULT_PROFILE = {
  avatar: "G",
  avatarImage: "",
  name: "GYLT Founder Mode",
  bio: "Baue dir ein System, das dich jeden Tag in Spur hält."
};

const profileElements = {
  avatarLarge: document.getElementById("gyltProfileAvatarLarge"),
  displayName: document.getElementById("gyltProfileDisplayName"),
  bioPreview: document.getElementById("gyltProfileBioPreview"),
  topBestStreak: document.getElementById("gyltProfileTopBestStreak"),
  levelValue: document.getElementById("gyltProfileLevelValue"),
  xpValue: document.getElementById("gyltProfileXpValue"),
  editToggle: document.getElementById("gyltProfileEditToggle"),
  editPanel: document.getElementById("gyltProfileEditPanel"),
  editForm: document.getElementById("gyltProfileEditForm"),
  avatarFileInput: document.getElementById("gyltProfileAvatarFileInput"),
  nameInput: document.getElementById("gyltProfileNameInput"),
  bioInput: document.getElementById("gyltProfileBioInput"),
  editStatus: document.getElementById("gyltProfileEditStatus"),
  resetButton: document.getElementById("gyltProfileResetButton"),
  removeImageButton: document.getElementById("gyltProfileRemoveImageButton"),
  friendForm: document.getElementById("gyltFriendForm"),
  friendName: document.getElementById("gyltFriendName"),
  friendShare: document.getElementById("gyltFriendShare"),
  friendStreak: document.getElementById("gyltFriendStreak"),
  friendStatus: document.getElementById("gyltFriendStatus"),
  friendList: document.getElementById("gyltFriendList"),
  groupForm: document.getElementById("gyltGroupForm"),
  groupName: document.getElementById("gyltGroupName"),
  groupCreateButton: document.getElementById("gyltGroupCreateButton"),
  groupFriendOptions: document.getElementById("gyltGroupFriendOptions"),
  groupStatus: document.getElementById("gyltGroupStatus"),
  groupList: document.getElementById("gyltGroupList")
};

let gyltProfile = loadProfile();
let gyltFriends = loadFriends();
let isEditPanelOpen = false;

initProfilePage();

function initProfilePage() {
  bindProfileEvents();
  renderProfilePage();
}

function bindProfileEvents() {
  profileElements.editToggle?.addEventListener("click", () => {
    isEditPanelOpen = !isEditPanelOpen;
    renderEditPanel();
  });

  profileElements.editForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    gyltProfile = {
      avatar: normalizeAvatar(gyltProfile.avatar),
      avatarImage: normalizeAvatarImage(gyltProfile.avatarImage),
      name: normalizeName(profileElements.nameInput.value),
      bio: normalizeBio(profileElements.bioInput.value)
    };

    saveProfile();
    setProfileStatus("Profil gespeichert.");
    renderProfilePage();
  });

  profileElements.resetButton?.addEventListener("click", () => {
    gyltProfile = { ...DEFAULT_PROFILE };
    saveProfile();
    setProfileStatus("Profil zurückgesetzt.");
    renderProfilePage();
  });

  profileElements.removeImageButton?.addEventListener("click", () => {
    gyltProfile.avatarImage = "";
    if (profileElements.avatarFileInput) profileElements.avatarFileInput.value = "";
    saveProfile();
    setProfileStatus("Profilbild entfernt.");
    renderProfilePage();
  });

  profileElements.avatarFileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileStatus("Bitte nur Bilddateien auswählen.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setProfileStatus("Das Bild ist zu groß. Bitte nimm eines unter 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      gyltProfile.avatarImage = await readFileAsDataUrl(file);
      saveProfile();
      setProfileStatus("Profilbild geladen. Mit Speichern bestätigst du den Rest des Profils.");
      renderProfileHeader();
    } catch (error) {
      setProfileStatus("Das Bild konnte nicht geladen werden.");
    }
  });

  profileElements.friendForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = profileElements.friendName.value.trim();
    if (!name) {
      setFriendStatus("Bitte erst einen Namen eintragen.");
      profileElements.friendName.focus();
      return;
    }

    const weeklyPct = clampNumber(profileElements.friendShare.value, 0, 100, 0);
    const streak = clampNumber(profileElements.friendStreak.value, 0, 365, 0);

    gyltFriends.unshift({
      id: `friend-${Date.now()}`,
      name,
      weeklyPct,
      streak
    });

    saveFriends();
    profileElements.friendForm.reset();
    setFriendStatus(`${name} wurde hinzugefügt.`);
    renderProfilePage();
  });

  profileElements.friendList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-remove-id]");
    if (!target) return;

    const removeId = target.dataset.removeId;
    const friend = gyltFriends.find((entry) => entry.id === removeId);
    gyltFriends = gyltFriends.filter((entry) => entry.id !== removeId);
    saveFriends();
    setFriendStatus(friend ? `${friend.name} wurde entfernt.` : "Freund entfernt.");
    renderProfilePage();
  });

  profileElements.groupForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const groupName = String(profileElements.groupName?.value || "").trim();
    if (!groupName) {
      setGroupStatus("Gib deiner Crew erst einen Namen.");
      profileElements.groupName?.focus();
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
    profileElements.groupForm.reset();
    setGroupStatus(`${groupName} wurde erstellt.`);
    renderProfilePage();
  });

  profileElements.groupList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-remove-group-id]");
    if (!target) return;

    const removeId = target.dataset.removeGroupId;
    const groups = loadGroups();
    const group = groups.find((entry) => entry.id === removeId);
    saveGroups(groups.filter((entry) => entry.id !== removeId));
    setGroupStatus(group ? `${group.name} wurde entfernt.` : "Crew entfernt.");
    renderProfilePage();
  });
}

function renderProfilePage() {
  const allDays = loadDashboardState().days || {};
  const history = buildHistory(allDays);
  const progress = buildProgressState(allDays, history, gyltFriends);
  renderProfileHeader();
  renderTopStats(history, progress);
  renderEditPanel();
  renderProfileForm();
  renderFriends();
  renderGroupFriendOptions(gyltFriends);
  renderGroups(loadGroups(), gyltFriends, history, progress);
}

function renderProfileHeader() {
  if (profileElements.avatarLarge) {
    profileElements.avatarLarge.textContent = gyltProfile.avatarImage ? "" : gyltProfile.avatar;
    profileElements.avatarLarge.style.backgroundImage = gyltProfile.avatarImage ? `url("${gyltProfile.avatarImage}")` : "";
    profileElements.avatarLarge.classList.toggle("hasImage", Boolean(gyltProfile.avatarImage));
  }
  if (profileElements.displayName) profileElements.displayName.textContent = gyltProfile.name;
  if (profileElements.bioPreview) profileElements.bioPreview.textContent = gyltProfile.bio;
}

function renderTopStats(history, progress) {
  if (profileElements.topBestStreak) {
    profileElements.topBestStreak.textContent = String(history.bestStreak);
  }
  if (profileElements.levelValue) {
    profileElements.levelValue.textContent = String(progress.level);
  }
  if (profileElements.xpValue) {
    profileElements.xpValue.textContent = String(progress.totalXp);
  }
}

function renderEditPanel() {
  if (profileElements.editPanel) {
    profileElements.editPanel.hidden = !isEditPanelOpen;
  }

  if (profileElements.editToggle) {
    profileElements.editToggle.textContent = isEditPanelOpen ? "Bearbeiten schließen" : "Profil bearbeiten";
    profileElements.editToggle.setAttribute("aria-expanded", String(isEditPanelOpen));
  }
}

function renderProfileForm() {
  if (profileElements.avatarFileInput) profileElements.avatarFileInput.value = "";
  if (profileElements.nameInput) profileElements.nameInput.value = gyltProfile.name;
  if (profileElements.bioInput) profileElements.bioInput.value = gyltProfile.bio;
}

function renderFriends() {
  if (!profileElements.friendList) return;

  profileElements.friendList.innerHTML = "";

  if (!gyltFriends.length) {
    profileElements.friendList.innerHTML = `
      <div class="gyltEmptyState">
        Noch keine Freunde gespeichert. Füge hier Accounts hinzu, mit denen du Fortschritte vergleichen willst.
      </div>
    `;
    return;
  }

  gyltFriends.forEach((friend) => {
    const row = document.createElement("article");
    row.className = "gyltFriendCard";
    row.innerHTML = `
      <div class="gyltFriendCardTop">
        <div>
          <div class="small">Freund</div>
          <strong>${escapeHtml(friend.name)}</strong>
        </div>
        <button class="gyltDeleteButton" type="button" data-remove-id="${friend.id}">Entfernen</button>
      </div>
      <div class="gyltFriendMetrics">
        <span>${friend.weeklyPct}% Woche</span>
        <span>${friend.streak} Tage Streak</span>
      </div>
    `;
    profileElements.friendList.appendChild(row);
  });
}

function renderGroupFriendOptions(friends) {
  if (!profileElements.groupFriendOptions || !profileElements.groupCreateButton) return;

  profileElements.groupFriendOptions.innerHTML = "";
  if (!friends.length) {
    profileElements.groupFriendOptions.innerHTML = `
      <div class="gyltEmptyState">Füge zuerst Freunde hinzu, dann kannst du daraus kleine Crews bauen.</div>
    `;
    profileElements.groupCreateButton.disabled = true;
    return;
  }

  profileElements.groupCreateButton.disabled = false;

  friends.forEach((friend) => {
    const option = document.createElement("label");
    option.className = "gyltGroupOption";
    option.innerHTML = `
      <input type="checkbox" value="${escapeHtml(friend.id)}" />
      <span>${escapeHtml(friend.name)}</span>
    `;
    profileElements.groupFriendOptions.appendChild(option);
  });
}

function renderGroups(groups, friends, history, progress) {
  if (!profileElements.groupList) return;

  profileElements.groupList.innerHTML = "";

  if (!groups.length) {
    profileElements.groupList.innerHTML = `
      <div class="gyltEmptyState">Noch keine Crew erstellt. Lege eine kleine Gruppe an, um Fortschritte direkt mit Freunden zu vergleichen.</div>
    `;
    return;
  }

  const compareEntries = buildProfileCompareEntries(friends, history, progress);
  const compareMap = new Map(compareEntries.map((entry) => [entry.id, entry]));

  groups.forEach((group) => {
    const members = [
      compareMap.get("me"),
      ...group.memberIds.map((memberId) => compareMap.get(memberId))
    ].filter(Boolean);

    const uniqueMembers = Array.from(new Map(members.map((member) => [member.id, member])).values())
      .sort((a, b) => b.score - a.score || b.weeklyPct - a.weeklyPct || b.level - a.level);

    const card = document.createElement("article");
    card.className = "gyltGroupCard";
    card.innerHTML = `
      <div class="gyltGroupCardTop">
        <div>
          <div class="small">Crew</div>
          <strong>${escapeHtml(group.name)}</strong>
          <p>${uniqueMembers.length} Mitglieder · Wer oben bleibt, hält den Druck hoch.</p>
        </div>
        <button class="gyltDeleteButton" type="button" data-remove-group-id="${escapeHtml(group.id)}">Entfernen</button>
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
    profileElements.groupList.appendChild(card);
  });
}

function buildProfileCompareEntries(friends, history, progress) {
  const me = {
    id: "me",
    name: "Du",
    weeklyPct: history.weeklyRate,
    level: progress.level,
    score: history.weeklyRate + (history.bestStreak * 4) + (progress.level * 2)
  };

  const friendEntries = friends.map((friend) => {
    const weeklyPct = clampNumber(friend.weeklyPct, 0, 100, 0);
    const streak = clampNumber(friend.streak, 0, 999, 0);
    const level = calculateFriendLevel(weeklyPct, streak);

    return {
      id: friend.id,
      name: friend.name,
      weeklyPct,
      level,
      score: weeklyPct + (streak * 4) + (level * 2)
    };
  });

  return [me, ...friendEntries];
}

function calculateFriendLevel(weeklyPct, streak) {
  const estimatedXp = (weeklyPct * 5) + (streak * 20);
  return Math.max(1, Math.floor(estimatedXp / GYLT_LEVEL_XP_STEP) + 1);
}

function renderHistory(history) {
  profileElements.pastWeek.textContent = `${history.weeklyRate}%`;
  profileElements.pastWeekText.textContent =
    history.totalTrackedDays > 0
      ? `${history.completedTasks} von ${history.totalTasks} Aufgaben in den letzten 7 Tagen erledigt.`
      : "Noch keine Daten aus deinem Tagebuch.";

  profileElements.bestStreak.textContent = `${history.bestStreak} ${history.bestStreak === 1 ? "Tag" : "Tage"}`;
  profileElements.bestStreakText.textContent =
    history.bestStreak > 0
      ? "Deine längste komplett abgeschlossene Serie bisher."
      : "Sobald du komplette Tage sammelst, erscheint hier deine beste Serie.";

  profileElements.bestMonth.textContent = history.bestMonth.label;
  profileElements.bestMonthText.textContent =
    history.bestMonth.label !== "-"
      ? `${history.bestMonth.rate}% durchschnittliche Monatsquote.`
      : "Sobald genug Tage vorhanden sind, erscheint hier dein stärkster Monat.";

  renderHistoryBars(history.lastWeeks);
}

function renderHistoryBars(weeks) {
  if (!profileElements.historyBars) return;

  profileElements.historyBars.innerHTML = "";

  if (!weeks.length) {
    profileElements.historyBars.innerHTML = `
      <div class="gyltEmptyState">Noch keine vergangenen Wochen zum Anzeigen.</div>
    `;
    return;
  }

  weeks.forEach((week) => {
    const row = document.createElement("div");
    row.className = "gyltBarRow";
    row.innerHTML = `
      <span>${escapeHtml(week.label)}</span>
      <div class="gyltBarTrack"><span class="gyltBarFill" style="width:${week.rate}%"></span></div>
      <strong>${week.rate}%</strong>
    `;
    profileElements.historyBars.appendChild(row);
  });
}

function buildHistory(allDays) {
  const sortedKeys = Object.keys(allDays).sort();
  const normalizedDays = sortedKeys.map((key) => ({
    key,
    state: normalizeDayState(allDays[key])
  }));

  const recentDays = normalizedDays.slice(-7);
  const completedTasks = recentDays.reduce((sum, entry) => sum + getCompletedTaskCount(entry.state), 0);
  const totalTasks = recentDays.reduce((sum, entry) => sum + entry.state.tasks.length, 0);
  const weeklyRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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

  const monthMap = new Map();
  normalizedDays.forEach((entry) => {
    const monthLabel = entry.key.slice(0, 7);
    if (!monthMap.has(monthLabel)) {
      monthMap.set(monthLabel, { completed: 0, total: 0 });
    }
    const bucket = monthMap.get(monthLabel);
    bucket.completed += getCompletedTaskCount(entry.state);
    bucket.total += entry.state.tasks.length;
  });

  let bestMonth = { label: "-", rate: 0 };
  monthMap.forEach((bucket, label) => {
    const rate = bucket.total === 0 ? 0 : Math.round((bucket.completed / bucket.total) * 100);
    if (rate >= bestMonth.rate) {
      bestMonth = { label: formatMonthLabel(label), rate };
    }
  });

  const lastWeeks = buildWeeklyBars(normalizedDays);

  return {
    totalTrackedDays: normalizedDays.length,
    completedTasks,
    totalTasks,
    weeklyRate,
    bestStreak,
    bestMonth,
    lastWeeks
  };
}

function buildWeeklyBars(normalizedDays) {
  if (!normalizedDays.length) return [];

  const weeks = [];
  const today = new Date();

  for (let index = 3; index >= 0; index -= 1) {
    const weekStart = getMondayOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (index * 7)));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const bucket = normalizedDays.filter((entry) => {
      const date = parseDateKey(entry.key);
      return date >= weekStart && date <= weekEnd;
    });

    const completed = bucket.reduce((sum, entry) => sum + getCompletedTaskCount(entry.state), 0);
    const total = bucket.reduce((sum, entry) => sum + entry.state.tasks.length, 0);
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    weeks.push({
      label: `W${getWeekNumber(weekStart)}`,
      rate
    });
  }

  return weeks;
}

function buildProgressState(allDays, history, friends) {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const weekEntries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = formatDateKey(date);
    return {
      key: dateKey,
      state: normalizeDayState(allDays[dateKey])
    };
  });

  const weekCompleted = weekEntries.reduce((sum, entry) => sum + getCompletedTaskCount(entry.state), 0);
  const weekTotal = weekEntries.reduce((sum, entry) => sum + entry.state.tasks.length, 0);
  const weeklyRate = weekTotal === 0 ? 0 : Math.round((weekCompleted / weekTotal) * 100);
  const currentStreak = buildCurrentStreak(allDays);
  const allEntries = Object.keys(allDays).sort().map((key) => ({
    key,
    state: normalizeDayState(allDays[key])
  }));
  const lifetimeCompleted = allEntries.reduce((sum, entry) => sum + getCompletedTaskCount(entry.state), 0);
  const perfectDays = allEntries.filter((entry) => isPerfectDay(entry.state)).length;
  const beatenFriends = friends.filter((friend) => weeklyRate + (currentStreak * 4) > (clampNumber(friend.weeklyPct, 0, 100, 0) + (clampNumber(friend.streak, 0, 999, 0) * 4))).length;

  const challengeXp =
    (weeklyRate >= 70 ? 120 : 0) +
    (currentStreak >= 3 ? 90 : 0) +
    (weekCompleted >= 12 ? 110 : 0) +
    (friends.length > 0 && beatenFriends >= 1 ? 150 : 0);

  const totalXp = (lifetimeCompleted * 35) + (perfectDays * 20) + (history.bestStreak * 12) + challengeXp;
  const level = Math.max(1, Math.floor(totalXp / GYLT_LEVEL_XP_STEP) + 1);

  return {
    totalXp,
    level
  };
}

function buildCurrentStreak(allDays) {
  const todayKey = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);
  const todayState = normalizeDayState(allDays[todayKey]);
  const yesterdayState = normalizeDayState(allDays[yesterdayKey]);

  let streak = 0;
  let currentDate = isPerfectDay(todayState) ? parseDateKey(todayKey) : parseDateKey(yesterdayKey);

  while (true) {
    const currentKey = formatDateKey(currentDate);
    const currentState = normalizeDayState(allDays[currentKey]);
    if (!isPerfectDay(currentState)) break;
    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return isPerfectDay(todayState) || isPerfectDay(yesterdayState) ? streak : 0;
}

function isPerfectDay(dayState) {
  return dayState.tasks.length > 0 && getCompletedTaskCount(dayState) === dayState.tasks.length;
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

function loadProfile() {
  try {
    const raw = localStorage.getItem(GYLT_PROFILE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      avatar: normalizeAvatar(parsed?.avatar),
      avatarImage: normalizeAvatarImage(parsed?.avatarImage),
      name: normalizeName(parsed?.name),
      bio: normalizeBio(parsed?.bio)
    };
  } catch (error) {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile() {
  localStorage.setItem(GYLT_PROFILE_STORAGE_KEY, JSON.stringify(gyltProfile));
}

function loadFriends() {
  try {
    const raw = localStorage.getItem(GYLT_FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveFriends() {
  localStorage.setItem(GYLT_FRIENDS_STORAGE_KEY, JSON.stringify(gyltFriends));
}

function getSelectedGroupFriendIds() {
  if (!profileElements.groupFriendOptions) return [];
  return Array.from(profileElements.groupFriendOptions.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value)
    .filter(Boolean);
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

function loadDashboardState() {
  try {
    const raw = localStorage.getItem(GYLT_DASHBOARD_STORAGE_KEY);
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { days: {} };
  } catch (error) {
    return { days: {} };
  }
}

function setProfileStatus(message) {
  if (profileElements.editStatus) profileElements.editStatus.textContent = message;
}

function setFriendStatus(message) {
  if (profileElements.friendStatus) profileElements.friendStatus.textContent = message;
}

function setGroupStatus(message) {
  if (profileElements.groupStatus) profileElements.groupStatus.textContent = message;
}

function normalizeAvatar(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : DEFAULT_PROFILE.avatar;
}

function normalizeAvatarImage(value) {
  return typeof value === "string" ? value : "";
}

function normalizeName(value) {
  const trimmed = String(value || "").trim();
  return trimmed || DEFAULT_PROFILE.name;
}

function normalizeBio(value) {
  const trimmed = String(value || "").trim();
  return trimmed || DEFAULT_PROFILE.bio;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
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

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" })
    .format(new Date(year, month - 1, 1));
}

function getWeekNumber(date) {
  const temp = new Date(date.getTime());
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  return 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
