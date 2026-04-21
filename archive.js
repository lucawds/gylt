const STORAGE_KEY_ARCHIVE = "tasks_archive_v1";
const STORAGE_KEY_THEME = "theme";

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

const themeToggle = document.getElementById("themeToggle");
const archiveList = document.getElementById("archiveList");
const archiveDetail = document.getElementById("archiveDetail");
const archiveDetailTitle = document.getElementById("archiveDetailTitle");
const archiveDetailMeta = document.getElementById("archiveDetailMeta");
const archiveDetailDays = document.getElementById("archiveDetailDays");
const archiveBackBtn = document.getElementById("archiveBackBtn");

function applyThemeFromStorage() {
  const t = localStorage.getItem(STORAGE_KEY_THEME);
  const isLight = t === "light";
  document.body.classList.toggle("light", isLight);
  if (themeToggle) themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
}
applyThemeFromStorage();

themeToggle?.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem(STORAGE_KEY_THEME, isLight ? "light" : "dark");
  themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
  if (archiveDetail && !archiveDetail.classList.contains("hidden")) {
    renderArchiveList();
  }
});

function computeStats(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.checked).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

function readCssColorVar(varName, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function accentRgba(alpha) {
  return `rgba(${readCssColorVar("--accent-strong-rgb", "130,170,255")},${alpha})`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

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

function backToArchiveList() {
  archiveDetail?.classList.add("hidden");
  if (archiveList) archiveList.style.display = "";
}

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

  const stamp = entry?.stamp ?? "-";
  const tasks = entry?.tasks ?? {};

  archiveDetail.classList.remove("hidden");
  if (archiveList) archiveList.style.display = "none";

  let total = 0;
  let done = 0;
  for (const d of dayOrder) {
    const st = computeStats(tasks[d] ?? []);
    total += st.total;
    done += st.done;
  }
  const open = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  archiveDetailTitle.textContent = `Week ${stamp}`;
  if (archiveDetailMeta) {
    archiveDetailMeta.textContent = `${done}/${total} done - ${pct}% completed - ${new Date(entry.archivedAt).toLocaleString("de-DE")}`;
  }

  updateArchiveChart(done, open);

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
        ${list.length ? list.map(t => (t.checked ? "[x] " : "[ ] ") + escapeHtml(t.text)).join("<br>") : "-"}
      </div>
    `;
    archiveDetailDays.appendChild(box);
  }
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
    const stamp = entry?.stamp ?? "-";
    const tasks = entry?.tasks ?? {};

    let total = 0;
    let done = 0;
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
        <div class="small">${done}/${total} - ${pct}%</div>
      </div>
      <div class="small" style="opacity:.8; margin-top:6px;">
        ${new Date(entry.archivedAt).toLocaleString("de-DE")}
      </div>
    `;
    item.addEventListener("click", () => showArchiveWeekDetail(entry));
    archiveList.appendChild(item);
  }
}

archiveBackBtn?.addEventListener("click", backToArchiveList);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") backToArchiveList();
});

backToArchiveList();
renderArchiveList();
