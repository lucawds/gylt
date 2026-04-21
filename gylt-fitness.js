const fitnessOverviewElements = {
  headerAction: document.getElementById("gyltFitnessPlanHeaderAction"),
  planOverview: document.getElementById("gyltFitnessPlanOverview"),
  exerciseOverviewLink: document.getElementById("gyltFitnessExerciseOverviewLink")
};

initFitnessOverview();

function initFitnessOverview() {
  const store = window.GYLT_FITNESS.loadStore();
  updateExerciseOverviewLink(store);
  renderFitnessOverview(store.plans);
}

function updateExerciseOverviewLink(store) {
  if (!fitnessOverviewElements.exerciseOverviewLink) return;
  const activePlan = window.GYLT_FITNESS.getActivePlan(store);
  fitnessOverviewElements.exerciseOverviewLink.href = activePlan
    ? `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(activePlan.id)}`
    : "gylt-fitness-plan-detail.html?create=1";
}

function renderFitnessOverview(plans) {
  if (!fitnessOverviewElements.planOverview) return;

  fitnessOverviewElements.planOverview.innerHTML = "";
  if (fitnessOverviewElements.headerAction) {
    fitnessOverviewElements.headerAction.classList.toggle("hidden", false);
  }

  if (!plans.length) {
    fitnessOverviewElements.planOverview.innerHTML = `
      <div class="gyltFitnessEmptyWorkout">
        <div class="gyltFitnessEmptyArt" aria-hidden="true"></div>
        <p>Du hast noch keine Workouts erstellt</p>
      </div>
    `;
    return;
  }

  plans.forEach((plan) => {
    const stats = window.GYLT_FITNESS.getPlanStats(plan);
    const card = document.createElement("article");
    card.className = "gyltFitnessWorkoutCard";
    card.innerHTML = `
      <div class="gyltFitnessWorkoutThumb" aria-hidden="true"></div>
      <div class="gyltFitnessWorkoutCopy">
        <strong>${escapeHtml(plan.name)}</strong>
        <span>${stats.exerciseCount} Übungen · ${stats.scheduledDayCount} Tage</span>
      </div>
      <div class="gyltFitnessWorkoutActions">
        <a href="gylt-fitness-plan.html?plan=${encodeURIComponent(plan.id)}">Öffnen</a>
        <a href="gylt-fitness-plan-detail.html?plan=${encodeURIComponent(plan.id)}">Bearbeiten</a>
      </div>
    `;
    fitnessOverviewElements.planOverview.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
