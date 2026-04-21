const fitnessDetailElements = {
  backLink: document.getElementById("gyltFitnessDetailBackLink"),
  title: document.getElementById("gyltFitnessDetailTitle"),
  text: document.getElementById("gyltFitnessDetailText"),
  status: document.getElementById("gyltFitnessDetailStatus"),
  createPanel: document.getElementById("gyltFitnessDetailCreatePanel"),
  createForm: document.getElementById("gyltFitnessDetailCreateForm"),
  createInput: document.getElementById("gyltFitnessDetailCreateInput"),
  editPanel: document.getElementById("gyltFitnessDetailEditPanel"),
  nameInput: document.getElementById("gyltFitnessDetailNameInput"),
  weekLink: document.getElementById("gyltFitnessDetailWeekLink"),
  addExerciseLink: document.getElementById("gyltFitnessDetailAddExerciseLink"),
  openLink: document.getElementById("gyltFitnessDetailOpenLink"),
  selectedCount: document.getElementById("gyltFitnessDetailSelectedCount"),
  groupGrid: document.getElementById("gyltFitnessDetailGroupGrid"),
  exerciseSummary: document.getElementById("gyltFitnessDetailExerciseSummary")
};

let activePlanId = "";
let flashMessage = "";

initFitnessDetailPage();

function initFitnessDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedPlanId = params.get("plan") || "";
  const createMode = params.get("create") === "1";
  const savedGroupId = params.get("saved") || "";
  const store = window.GYLT_FITNESS.loadStore();
  const plan = requestedPlanId
    ? window.GYLT_FITNESS.getPlanById(requestedPlanId)
    : window.GYLT_FITNESS.getActivePlan(store);

  if (savedGroupId) {
    const savedGroup = window.GYLT_FITNESS.getGroupById(savedGroupId);
    flashMessage = savedGroup ? `${savedGroup.label} wurde aktualisiert.` : "Dein Workout wurde aktualisiert.";
  }

  bindFitnessDetailEvents();

  if (createMode || !plan) {
    renderCreateMode();
    return;
  }

  activePlanId = plan.id;
  window.GYLT_FITNESS.setActivePlanId(plan.id);
  renderEditMode(plan);
}

function bindFitnessDetailEvents() {
  fitnessDetailElements.createForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const planName = String(fitnessDetailElements.createInput?.value || "").trim();
    if (!planName) {
      if (fitnessDetailElements.status) {
        fitnessDetailElements.status.textContent = "Gib deinem Workout zuerst einen Namen.";
      }
      fitnessDetailElements.createInput?.focus();
      return;
    }

    const plan = window.GYLT_FITNESS.createPlan(planName);
    activePlanId = plan.id;
    window.location.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(plan.id)}`;
  });

  fitnessDetailElements.nameInput?.addEventListener("change", () => {
    const value = String(fitnessDetailElements.nameInput?.value || "").trim();
    if (!value || !activePlanId) return;
    const savedPlan = window.GYLT_FITNESS.updatePlanName(activePlanId, value);
    if (!savedPlan) return;
    flashMessage = "Name gespeichert.";
    renderEditMode(savedPlan);
  });
}

function renderCreateMode() {
  activePlanId = "";
  fitnessDetailElements.createPanel?.classList.remove("hidden");
  fitnessDetailElements.editPanel?.classList.add("hidden");

  if (fitnessDetailElements.title) {
    fitnessDetailElements.title.textContent = "Workout erstellen";
  }
  if (fitnessDetailElements.text) {
    fitnessDetailElements.text.textContent = "Gib deinem Workout einen Namen und füge danach Übungen hinzu.";
  }
  if (fitnessDetailElements.status) {
    fitnessDetailElements.status.textContent = "Starte mit einem klaren Namen.";
  }
  if (fitnessDetailElements.backLink) {
    fitnessDetailElements.backLink.href = "gylt-fitness.html";
  }
}

function renderEditMode(plan) {
  const stats = window.GYLT_FITNESS.getPlanStats(plan);
  const selectedGroups = window.GYLT_FITNESS.getSelectedGroupEntries(plan);

  fitnessDetailElements.createPanel?.classList.add("hidden");
  fitnessDetailElements.editPanel?.classList.remove("hidden");

  if (fitnessDetailElements.title) {
    fitnessDetailElements.title.textContent = "Workout bearbeiten";
  }
  if (fitnessDetailElements.text) {
    fitnessDetailElements.text.textContent = `${stats.exerciseCount} Übungen in ${selectedGroups.length} Bereichen.`;
  }
  if (fitnessDetailElements.status) {
    fitnessDetailElements.status.textContent = flashMessage || window.GYLT_FITNESS.formatUpdatedAt(plan.updatedAt);
  }
  if (fitnessDetailElements.nameInput) {
    fitnessDetailElements.nameInput.value = plan.name;
  }
  if (fitnessDetailElements.backLink) {
    fitnessDetailElements.backLink.href = `gylt-fitness-plan.html?plan=${encodeURIComponent(plan.id)}`;
  }
  if (fitnessDetailElements.weekLink) {
    fitnessDetailElements.weekLink.href = `gylt-fitness-week.html?plan=${encodeURIComponent(plan.id)}`;
  }
  if (fitnessDetailElements.addExerciseLink) {
    const firstGroupId = window.GYLT_FITNESS.MUSCLE_GROUPS[0]?.id || "chest";
    fitnessDetailElements.addExerciseLink.href = `gylt-fitness-muscle.html?plan=${encodeURIComponent(plan.id)}&group=${encodeURIComponent(firstGroupId)}`;
  }
  if (fitnessDetailElements.openLink) {
    fitnessDetailElements.openLink.href = `gylt-fitness-plan.html?plan=${encodeURIComponent(plan.id)}`;
  }
  if (fitnessDetailElements.selectedCount) {
    fitnessDetailElements.selectedCount.textContent = `${selectedGroups.length} aktiv`;
  }

  flashMessage = "";
  renderDetailGroupGrid(plan);
  renderExerciseSummary(plan);
}

function renderDetailGroupGrid(plan) {
  if (!fitnessDetailElements.groupGrid) return;

  const selectedGroups = new Set(Object.keys(plan.groups));

  fitnessDetailElements.groupGrid.innerHTML = window.GYLT_FITNESS.MUSCLE_GROUPS.map((group) => {
    const imagePath = window.GYLT_FITNESS.getGroupImagePath(group.id);
    const selectedExercises = plan.groups[group.id]?.exercises || [];

    return `
      <a class="gyltFitnessGroupCard${selectedGroups.has(group.id) ? " isSelected" : ""}${group.id === "recovery" ? " isRecovery" : ""}" href="gylt-fitness-muscle.html?plan=${encodeURIComponent(plan.id)}&group=${encodeURIComponent(group.id)}">
        <div class="gyltFitnessGroupCardTop">
          <strong>${escapeHtml(group.label)}</strong>
          <span class="gyltFitnessGroupBadge">${selectedExercises.length ? `${selectedExercises.length} aktiv` : "leer"}</span>
        </div>
        <div class="gyltFitnessGroupCardBody">
          <div class="gyltFitnessGroupVisual">
            ${imagePath
              ? `<img class="gyltFitnessGroupPhoto" src="${escapeHtml(imagePath)}" alt="${escapeHtml(group.label)}">`
              : `<div class="gyltFitnessGroupIcon">${window.GYLT_FITNESS.getGroupIcon(group.id)}</div>`}
          </div>
        </div>
      </a>
    `;
  }).join("");

  fitnessDetailElements.groupGrid.querySelectorAll(".gyltFitnessGroupPhoto").forEach((image) => {
    image.addEventListener("error", () => {
      const visual = image.closest(".gyltFitnessGroupVisual");
      const href = image.closest("a")?.getAttribute("href") || "";
      const groupId = new URL(href, window.location.href).searchParams.get("group") || "chest";
      if (!visual) return;
      image.remove();
      visual.innerHTML = `<div class="gyltFitnessGroupIcon">${window.GYLT_FITNESS.getGroupIcon(groupId)}</div>`;
    }, { once: true });
  });
}

function renderExerciseSummary(plan) {
  if (!fitnessDetailElements.exerciseSummary) return;

  const selectedGroups = window.GYLT_FITNESS.getSelectedGroupEntries(plan);
  if (!selectedGroups.length) {
    fitnessDetailElements.exerciseSummary.innerHTML = `<div class="gyltEmptyState">Noch keine Übungen ausgewählt.</div>`;
    return;
  }

  fitnessDetailElements.exerciseSummary.innerHTML = selectedGroups.map((group) => `
    <article class="gyltFitnessExerciseSummaryGroup">
      <div class="gyltFitnessExerciseSummaryHead">
        <strong>${escapeHtml(group.label)}</strong>
        <span>${group.selectedExercises.length}</span>
      </div>
      <div class="gyltFitnessChipRow">
        ${group.selectedExercises.map((exercise) => `<span class="gyltFitnessChip">${escapeHtml(exercise.title)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
