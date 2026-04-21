const fitnessMuscleElements = {
  backLink: document.getElementById("gyltFitnessMuscleBackLink"),
  cancelLink: document.getElementById("gyltFitnessMuscleCancelLink"),
  eyebrow: document.getElementById("gyltFitnessMuscleEyebrow"),
  title: document.getElementById("gyltFitnessMuscleTitle"),
  text: document.getElementById("gyltFitnessMuscleText"),
  meta: document.getElementById("gyltFitnessMuscleMeta"),
  groupSelect: document.getElementById("gyltFitnessExerciseGroupSelect"),
  createButton: document.getElementById("gyltFitnessExerciseCreateButton"),
  exerciseList: document.getElementById("gyltFitnessExerciseList"),
  saveButton: document.getElementById("gyltFitnessSaveButton")
};

let selectedExerciseIds = [];
let activeGroup = null;
let activePlan = null;

initFitnessMusclePage();

function initFitnessMusclePage() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group") || "";
  const planId = params.get("plan") || window.GYLT_FITNESS.getActivePlan(window.GYLT_FITNESS.loadStore())?.id || "";

  activeGroup = window.GYLT_FITNESS.getGroupById(groupId);
  activePlan = window.GYLT_FITNESS.getPlanById(planId);

  if (!activeGroup || !activePlan) {
    renderInvalidState();
    return;
  }

  if (fitnessMuscleElements.backLink) {
    fitnessMuscleElements.backLink.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(activePlan.id)}`;
  }
  if (fitnessMuscleElements.cancelLink) {
    fitnessMuscleElements.cancelLink.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(activePlan.id)}`;
  }

  selectedExerciseIds = [...(activePlan.groups[activeGroup.id]?.exercises || [])];

  bindFitnessMuscleEvents();
  renderFitnessMusclePage();
}

function bindFitnessMuscleEvents() {
  fitnessMuscleElements.groupSelect?.addEventListener("change", () => {
    const groupId = fitnessMuscleElements.groupSelect.value;
    if (!groupId || groupId === activeGroup?.id || !activePlan) return;
    window.location.href = `gylt-fitness-muscle.html?plan=${encodeURIComponent(activePlan.id)}&group=${encodeURIComponent(groupId)}`;
  });

  fitnessMuscleElements.createButton?.addEventListener("click", () => {
    if (!activePlan) return;
    window.location.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(activePlan.id)}`;
  });

  fitnessMuscleElements.exerciseList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-exercise-id]");
    if (!target || !activeGroup) return;

    const exerciseId = target.dataset.exerciseId;
    if (!exerciseId) return;

    if (selectedExerciseIds.includes(exerciseId)) {
      selectedExerciseIds = selectedExerciseIds.filter((entry) => entry !== exerciseId);
    } else {
      selectedExerciseIds = [...selectedExerciseIds, exerciseId];
    }

    renderExerciseOptions();
    updateMeta();
  });

  fitnessMuscleElements.saveButton?.addEventListener("click", () => {
    if (!activeGroup || !activePlan) return;

    const nextGroups = { ...activePlan.groups };

    if (selectedExerciseIds.length) {
      nextGroups[activeGroup.id] = {
        label: activeGroup.label,
        exercises: selectedExerciseIds
      };
    } else {
      delete nextGroups[activeGroup.id];
    }

    const savedPlan = window.GYLT_FITNESS.savePlan({
      ...activePlan,
      groups: nextGroups
    });

    window.location.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(savedPlan.id)}&saved=${encodeURIComponent(activeGroup.id)}`;
  });
}

function renderFitnessMusclePage() {
  if (!activeGroup || !activePlan) return;

  if (fitnessMuscleElements.eyebrow) fitnessMuscleElements.eyebrow.textContent = activeGroup.label;
  if (fitnessMuscleElements.title) fitnessMuscleElements.title.textContent = "Übungen hinzufügen";
  if (fitnessMuscleElements.text) fitnessMuscleElements.text.textContent = "";

  renderGroupSelect();
  renderExerciseOptions();
  updateMeta();
}

function renderGroupSelect() {
  if (!fitnessMuscleElements.groupSelect || !activeGroup) return;

  fitnessMuscleElements.groupSelect.innerHTML = window.GYLT_FITNESS.MUSCLE_GROUPS
    .map((group) => `<option value="${escapeHtml(group.id)}"${group.id === activeGroup.id ? " selected" : ""}>${escapeHtml(group.label)}</option>`)
    .join("");
}

function renderExerciseOptions() {
  if (!fitnessMuscleElements.exerciseList || !activeGroup) return;

  fitnessMuscleElements.exerciseList.innerHTML = "";

  activeGroup.exercises.forEach((exercise) => {
    const isSelected = selectedExerciseIds.includes(exercise.id);
    const button = document.createElement("button");
    button.className = `gyltFitnessExerciseOption${isSelected ? " isSelected" : ""}`;
    button.type = "button";
    button.dataset.exerciseId = exercise.id;
    button.setAttribute("aria-pressed", String(isSelected));
    button.innerHTML = `
      <span class="gyltFitnessExerciseThumb" aria-hidden="true"></span>
      <span class="gyltFitnessExerciseCopy">
        <strong>${escapeHtml(exercise.title)}</strong>
      </span>
      <span class="gyltFitnessExercisePlus" aria-hidden="true">${isSelected ? "✓" : "+"}</span>
    `;
    fitnessMuscleElements.exerciseList.appendChild(button);
  });
}

function updateMeta() {
  if (fitnessMuscleElements.meta) {
    fitnessMuscleElements.meta.textContent = `${selectedExerciseIds.length} ${selectedExerciseIds.length === 1 ? "Übung" : "Übungen"} für ${activePlan?.name || "diesen Plan"} ausgewählt.`;
  }

  if (fitnessMuscleElements.saveButton) {
    fitnessMuscleElements.saveButton.textContent = selectedExerciseIds.length
      ? "Zurück zum Plan"
      : "Gruppe aus Plan entfernen";
  }
}

function renderInvalidState() {
  if (fitnessMuscleElements.eyebrow) fitnessMuscleElements.eyebrow.textContent = "Muskelgruppe";
  if (fitnessMuscleElements.title) fitnessMuscleElements.title.textContent = "Plan oder Gruppe nicht gefunden";
  if (fitnessMuscleElements.text) fitnessMuscleElements.text.textContent = "Öffne zuerst einen gültigen Trainingsplan und wähle dann eine Muskelgruppe aus.";
  if (fitnessMuscleElements.meta) fitnessMuscleElements.meta.textContent = "Zurück zur Planübersicht.";
  if (fitnessMuscleElements.exerciseList) {
    fitnessMuscleElements.exerciseList.innerHTML = `
      <div class="gyltEmptyState">
        Ohne gültigen Trainingsplan können hier keine Übungen gespeichert werden. Geh zurück und wähle einen Plan aus.
      </div>
    `;
  }
  if (fitnessMuscleElements.saveButton) {
    fitnessMuscleElements.saveButton.disabled = true;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
