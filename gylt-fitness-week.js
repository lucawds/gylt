const fitnessWeekElements = {
  backLink: document.getElementById("gyltFitnessWeekBackLink"),
  title: document.getElementById("gyltFitnessWeekTitle"),
  text: document.getElementById("gyltFitnessWeekText"),
  status: document.getElementById("gyltFitnessWeekStatus"),
  editLink: document.getElementById("gyltFitnessWeekEditLink"),
  hint: document.getElementById("gyltFitnessWeekHint"),
  unassigned: document.getElementById("gyltFitnessWeekUnassigned"),
  board: document.getElementById("gyltFitnessWeekBoard")
};

let activePlanId = "";
let pickedSlotId = "";

initFitnessWeekPage();

function initFitnessWeekPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedPlanId = params.get("plan") || "";
  const store = window.GYLT_FITNESS.loadStore();
  const plan = requestedPlanId
    ? window.GYLT_FITNESS.getPlanById(requestedPlanId)
    : window.GYLT_FITNESS.getActivePlan(store);

  bindFitnessWeekEvents();

  if (!plan) {
    renderMissingWeekPlan();
    return;
  }

  activePlanId = plan.id;
  window.GYLT_FITNESS.setActivePlanId(plan.id);
  renderWeekPlan(plan);
}

function bindFitnessWeekEvents() {
  fitnessWeekElements.unassigned?.addEventListener("click", (event) => {
    const slotCard = event.target.closest("[data-slot-id]");
    if (slotCard) {
      pickedSlotId = pickedSlotId === slotCard.dataset.slotId ? "" : (slotCard.dataset.slotId || "");
      renderCurrentPlan();
      return;
    }

    if (!pickedSlotId) return;
    moveSlotToDay(pickedSlotId, "");
  });

  fitnessWeekElements.board?.addEventListener("click", (event) => {
    if (event.target.closest("input")) return;

    const slotCard = event.target.closest("[data-slot-id]");
    if (slotCard) {
      pickedSlotId = pickedSlotId === slotCard.dataset.slotId ? "" : (slotCard.dataset.slotId || "");
      renderCurrentPlan();
      return;
    }

    const dayColumn = event.target.closest("[data-day-id]");
    if (!dayColumn || !pickedSlotId) return;
    moveSlotToDay(pickedSlotId, dayColumn.dataset.dayId || "");
  });

  fitnessWeekElements.board?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-day-name-input]");
    if (!input) return;
    updateDayName(input.dataset.dayNameInput || "", input.value);
  });

  [fitnessWeekElements.unassigned, fitnessWeekElements.board].forEach((container) => {
    container?.addEventListener("dragstart", (event) => {
      const slotCard = event.target.closest("[data-slot-id]");
      if (!slotCard) return;
      const slotId = slotCard.dataset.slotId || "";
      if (!slotId) return;
      pickedSlotId = slotId;
      slotCard.classList.add("isPicked");
      event.dataTransfer?.setData("text/plain", slotId);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });

    container?.addEventListener("dragend", (event) => {
      event.target.closest("[data-slot-id]")?.classList.remove("isPicked");
    });

    container?.addEventListener("dragover", (event) => {
      if (container === fitnessWeekElements.board && !event.target.closest("[data-day-id]")) return;
      event.preventDefault();
    });

    container?.addEventListener("drop", (event) => {
      event.preventDefault();
      const slotId = event.dataTransfer?.getData("text/plain") || pickedSlotId;
      if (!slotId) return;
      const dayColumn = event.target.closest("[data-day-id]");
      moveSlotToDay(slotId, dayColumn?.dataset.dayId || "");
    });
  });
}

function renderCurrentPlan() {
  const plan = window.GYLT_FITNESS.getPlanById(activePlanId);
  if (!plan) return;
  renderWeekPlan(plan);
}

function renderWeekPlan(plan) {
  const stats = window.GYLT_FITNESS.getPlanStats(plan);

  if (fitnessWeekElements.title) fitnessWeekElements.title.textContent = "Wochenplan";
  if (fitnessWeekElements.text) fitnessWeekElements.text.textContent = plan.name;
  if (fitnessWeekElements.status) {
    fitnessWeekElements.status.textContent = `${stats.exerciseCount} Übungen · ${stats.scheduledDayCount} Tage belegt`;
  }
  if (fitnessWeekElements.backLink) {
    fitnessWeekElements.backLink.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(plan.id)}`;
  }
  if (fitnessWeekElements.editLink) {
    fitnessWeekElements.editLink.href = `gylt-fitness-plan-detail.html?plan=${encodeURIComponent(plan.id)}`;
  }
  if (fitnessWeekElements.hint) {
    fitnessWeekElements.hint.textContent = pickedSlotId
      ? "Übung markiert. Tippe jetzt auf einen Tag."
      : "Tippe eine Übung an und danach einen Tag, oder zieh sie direkt auf den Tag.";
  }

  renderUnassigned(plan);
  renderWeekBoard(plan);
}

function renderUnassigned(plan) {
  if (!fitnessWeekElements.unassigned) return;

  const entries = window.GYLT_FITNESS.getGroupEntries(plan);
  const unassignedEntries = entries.filter((entry) => !window.GYLT_FITNESS.getAssignedDay(plan, entry.slotId));

  if (!entries.length) {
    fitnessWeekElements.unassigned.innerHTML = `<div class="gyltEmptyState">Wähle zuerst Übungen in deinem Workout aus.</div>`;
    return;
  }

  if (!unassignedEntries.length) {
    fitnessWeekElements.unassigned.innerHTML = `<div class="gyltPoolHint">Alle Übungen sind eingeplant.</div>`;
    return;
  }

  fitnessWeekElements.unassigned.innerHTML = unassignedEntries.map((entry) => createSlotCard(entry)).join("");
}

function renderWeekBoard(plan) {
  if (!fitnessWeekElements.board) return;

  fitnessWeekElements.board.innerHTML = window.GYLT_FITNESS.DAY_ORDER.map((day) => {
    const entries = window.GYLT_FITNESS.getDayEntries(plan, day.id);
    const dayName = String(plan.dayNames?.[day.id] || "");

    return `
      <article class="gyltFitnessDayColumn" data-day-id="${day.id}">
        <div class="gyltFitnessDayHead">
          <strong>${day.shortLabel}</strong>
          <span>${day.label}</span>
        </div>
        <input
          class="gyltFitnessDayNameInput"
          type="text"
          value="${escapeHtml(dayName)}"
          maxlength="28"
          placeholder="Tag benennen"
          aria-label="${day.label} benennen"
          data-day-name-input="${day.id}"
        />
        <div class="gyltFitnessDayBody">
          ${entries.length ? entries.map((entry) => createSlotCard(entry)).join("") : `<div class="gyltFitnessDayEmpty">Hierhin ziehen</div>`}
        </div>
      </article>
    `;
  }).join("");
}

function createSlotCard(entry) {
  const isPicked = pickedSlotId === entry.slotId;

  return `
    <button
      class="gyltFitnessSlotCard${isPicked ? " isPicked" : ""}"
      type="button"
      data-slot-id="${escapeHtml(entry.slotId)}"
      draggable="true"
      aria-pressed="${isPicked ? "true" : "false"}"
    >
      <span class="gyltFitnessSlotCopy">
        <strong>${escapeHtml(entry.title)}</strong>
      </span>
    </button>
  `;
}

function moveSlotToDay(slotId, dayId) {
  const plan = window.GYLT_FITNESS.getPlanById(activePlanId);
  if (!plan || !slotId) return;

  const nextWeek = window.GYLT_FITNESS.assignSlotToDay(plan, slotId, dayId);
  const savedPlan = window.GYLT_FITNESS.updatePlanWeek(plan.id, nextWeek);
  pickedSlotId = "";
  if (!savedPlan) return;
  renderWeekPlan(savedPlan);
}

function updateDayName(dayId, value) {
  const plan = window.GYLT_FITNESS.getPlanById(activePlanId);
  if (!plan || !dayId) return;

  const savedPlan = window.GYLT_FITNESS.updatePlanDayNames(plan.id, {
    ...(plan.dayNames || {}),
    [dayId]: String(value || "").trim()
  });
  if (!savedPlan) return;
  renderWeekPlan(savedPlan);
}

function renderMissingWeekPlan() {
  if (fitnessWeekElements.title) fitnessWeekElements.title.textContent = "Kein Workout";
  if (fitnessWeekElements.text) fitnessWeekElements.text.textContent = "Erstelle zuerst ein Workout.";
  if (fitnessWeekElements.status) fitnessWeekElements.status.textContent = "Noch kein Wochenplan verfügbar.";
  if (fitnessWeekElements.unassigned) fitnessWeekElements.unassigned.innerHTML = "";
  if (fitnessWeekElements.board) fitnessWeekElements.board.innerHTML = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
