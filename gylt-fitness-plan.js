const fitnessCurrentPlanElements = {
  title: document.getElementById("gyltFitnessCurrentTitle"),
  text: document.getElementById("gyltFitnessCurrentText"),
  status: document.getElementById("gyltFitnessCurrentStatus"),
  empty: document.getElementById("gyltFitnessCurrentEmpty"),
  content: document.getElementById("gyltFitnessCurrentContent"),
  stats: document.getElementById("gyltFitnessCurrentStats"),
  week: document.getElementById("gyltFitnessCurrentWeek"),
  editLink: document.getElementById("gyltFitnessCurrentEditLink"),
  editButton: document.getElementById("gyltFitnessCurrentEditButton"),
  weekButton: document.getElementById("gyltFitnessCurrentWeekButton"),
  switchLink: document.getElementById("gyltFitnessCurrentSwitchLink")
};

initCurrentFitnessPlanPage();

function initCurrentFitnessPlanPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedPlanId = params.get("plan") || "";
  const store = window.GYLT_FITNESS.loadStore();
  const plan = requestedPlanId
    ? window.GYLT_FITNESS.getPlanById(requestedPlanId)
    : window.GYLT_FITNESS.getActivePlan(store);

  if (!plan) {
    renderCurrentPlanEmpty();
    return;
  }

  window.GYLT_FITNESS.setActivePlanId(plan.id);
  renderCurrentPlan(plan);
}

function renderCurrentPlan(plan) {
  const stats = window.GYLT_FITNESS.getPlanStats(plan);

  fitnessCurrentPlanElements.empty?.classList.add("hidden");
  fitnessCurrentPlanElements.content?.classList.remove("hidden");

  if (fitnessCurrentPlanElements.title) {
    fitnessCurrentPlanElements.title.textContent = plan.name;
  }
  if (fitnessCurrentPlanElements.text) {
    fitnessCurrentPlanElements.text.textContent = stats.scheduledDayCount
      ? `${stats.scheduledDayCount} Trainingstage sind aktuell in deiner Woche verteilt.`
      : "Deine Woche ist noch leer. Im Bearbeiten-Modus kannst du Muskelgruppen und Übungen zuordnen.";
  }
  if (fitnessCurrentPlanElements.status) {
    fitnessCurrentPlanElements.status.textContent = window.GYLT_FITNESS.formatUpdatedAt(plan.updatedAt);
  }

  const editHref = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(plan.id)}`;
  if (fitnessCurrentPlanElements.editLink) {
    fitnessCurrentPlanElements.editLink.href = editHref;
  }
  if (fitnessCurrentPlanElements.editButton) {
    fitnessCurrentPlanElements.editButton.href = editHref;
  }
  if (fitnessCurrentPlanElements.weekButton) {
    fitnessCurrentPlanElements.weekButton.href = `gylt-fitness-week.html?plan=${encodeURIComponent(plan.id)}`;
  }
  if (fitnessCurrentPlanElements.switchLink) {
    fitnessCurrentPlanElements.switchLink.href = "gylt-fitness.html";
  }

  renderCurrentPlanStats(stats);
  renderCurrentPlanWeek(plan);
}

function renderCurrentPlanStats(stats) {
  if (!fitnessCurrentPlanElements.stats) return;

  fitnessCurrentPlanElements.stats.innerHTML = `
    <article class="gyltFitnessMiniStat">
      <div class="small">Muskelgruppen</div>
      <strong>${stats.groupCount}</strong>
    </article>
    <article class="gyltFitnessMiniStat">
      <div class="small">Übungen</div>
      <strong>${stats.exerciseCount}</strong>
    </article>
    <article class="gyltFitnessMiniStat">
      <div class="small">Nächster Fokus</div>
      <strong>${escapeHtml(stats.nextFocus)}</strong>
    </article>
  `;
}

function renderCurrentPlanWeek(plan) {
  if (!fitnessCurrentPlanElements.week) return;

  fitnessCurrentPlanElements.week.innerHTML = window.GYLT_FITNESS.DAY_ORDER.map((day) => {
    const entries = window.GYLT_FITNESS.getDayEntries(plan, day.id);
    const dayName = window.GYLT_FITNESS.getDayName(plan, day.id);

    return `
      <article class="gyltFitnessDayColumn">
        <div class="gyltFitnessDayHead">
          <strong>${day.shortLabel}</strong>
          <span>${escapeHtml(dayName)}</span>
        </div>
        <div class="gyltFitnessDayBody">
          ${entries.length
            ? entries.map((entry) => createStaticSlotCard(entry)).join("")
            : `<div class="gyltFitnessDayEmpty">frei</div>`}
        </div>
      </article>
    `;
  }).join("");
}

function renderCurrentPlanEmpty() {
  fitnessCurrentPlanElements.content?.classList.add("hidden");
  fitnessCurrentPlanElements.empty?.classList.remove("hidden");

  if (fitnessCurrentPlanElements.title) {
    fitnessCurrentPlanElements.title.textContent = "Noch kein Trainingsplan";
  }
  if (fitnessCurrentPlanElements.text) {
    fitnessCurrentPlanElements.text.textContent = "Sobald du einen Plan anlegst, siehst du hier nur noch deine kompakte Wochenansicht.";
  }
  if (fitnessCurrentPlanElements.status) {
    fitnessCurrentPlanElements.status.textContent = "Lege zuerst einen Trainingsplan an.";
  }
  if (fitnessCurrentPlanElements.stats) {
    fitnessCurrentPlanElements.stats.innerHTML = "";
  }
  if (fitnessCurrentPlanElements.week) {
    fitnessCurrentPlanElements.week.innerHTML = "";
  }
}

function createStaticSlotCard(entry) {
  return `
    <div class="gyltFitnessSlotCard isStatic">
      <span class="gyltFitnessSlotCopy">
        <strong>${escapeHtml(entry.title)}</strong>
      </span>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
