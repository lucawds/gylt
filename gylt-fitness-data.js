(function () {
  const STORAGE_KEY = "gylt-fitness-plan-v1";
  const DAY_ORDER = [
    { id: "monday", label: "Montag", shortLabel: "Mo" },
    { id: "tuesday", label: "Dienstag", shortLabel: "Di" },
    { id: "wednesday", label: "Mittwoch", shortLabel: "Mi" },
    { id: "thursday", label: "Donnerstag", shortLabel: "Do" },
    { id: "friday", label: "Freitag", shortLabel: "Fr" },
    { id: "saturday", label: "Samstag", shortLabel: "Sa" },
    { id: "sunday", label: "Sonntag", shortLabel: "So" }
  ];

  const MUSCLE_GROUPS = [
    {
      id: "chest",
      label: "Brust",
      imagePath: "pictures/brust.png",
      description: "Drückbewegungen und kontrollierte Brustarbeit.",
      exercises: [
        { id: "bench-press", title: "Bankdrücken" },
        { id: "dumbbell-bench-press", title: "Bankdrücken (Kurzhanteln)" },
        { id: "smith-bench-press", title: "Bankdrücken (Multipresse)" },
        { id: "machine-bench-press", title: "Bankdrücken an der Maschine" },
        { id: "chest-press", title: "Brustpresse" },
        { id: "incline-bench", title: "Schrägbankdrücken" },
        { id: "incline-dumbbell-bench", title: "Schrägbankdrücken (Kurzhanteln)" },
        { id: "incline-smith-bench", title: "Schrägbankdrücken (Multipresse)" },
        { id: "incline-chest-press", title: "Schrägbankpresse" },
        { id: "decline-bench-press", title: "Negativbankdrücken" },
        { id: "decline-smith-bench", title: "Negativbankdrücken (Multipresse)" },
        { id: "dumbbell-flyes", title: "Kurzhantel-Flys" },
        { id: "pec-deck", title: "Butterfly" },
        { id: "cable-butterfly", title: "Butterfly am Kabelzug" },
        { id: "cable-flyes", title: "Kabel-Flys" },
        { id: "high-to-low-cable-flyes", title: "Kabel-Flys von oben nach unten" },
        { id: "low-cable-flyes", title: "Kabelziehen von unten" },
        { id: "dips", title: "Dips" },
        { id: "push-ups", title: "Liegestütze" },
        { id: "push-up-variations", title: "Unterschiedliche Liegestütz-Variationen" },
        { id: "weighted-push-ups", title: "Gewichtete Liegestütze" },
        { id: "squeeze-press", title: "Squeeze Press" },
        { id: "plate-press", title: "Plate Press" }
      ]
    },
    {
      id: "back",
      label: "Rücken",
      imagePath: "pictures/rücken.png",
      description: "Zugstärke, Breite und Spannung im Rücken.",
      exercises: [
        { id: "pull-ups", title: "Klimmzüge" },
        { id: "chin-ups", title: "Chin-Ups" },
        { id: "neutral-grip-pull-ups", title: "Neutral Grip Klimmzüge" },
        { id: "lat-pulldown", title: "Latzug" },
        { id: "wide-grip-lat-pulldown", title: "Latzug weit" },
        { id: "close-grip-lat-pulldown", title: "Latzug eng" },
        { id: "barbell-row", title: "Langhantelrudern" },
        { id: "dumbbell-row", title: "Kurzhantelrudern" },
        { id: "cable-row", title: "Kabelrudern" },
        { id: "t-bar-row", title: "T-Bar-Rudern" },
        { id: "seal-row", title: "Seal Rows" },
        { id: "machine-row", title: "Rudern an der Maschine" },
        { id: "straight-arm-pulldown", title: "Straight Arm Pulldown" },
        { id: "rack-pulls", title: "Rack Pulls" },
        { id: "deadlifts", title: "Kreuzheben" },
        { id: "good-mornings", title: "Good Mornings" },
        { id: "hyperextensions", title: "Hyperextensions" }
      ]
    },
    {
      id: "shoulders",
      label: "Schulter",
      imagePath: "pictures/schulter.png",
      description: "Stabilität, Kontrolle und Druck über Kopf.",
      exercises: [
        { id: "shoulder-press", title: "Schulterdrücken" },
        { id: "dumbbell-shoulder-press", title: "Schulterdrücken (Kurzhanteln)" },
        { id: "machine-shoulder-press", title: "Schulterpresse an der Maschine" },
        { id: "arnold-press", title: "Arnold Press" },
        { id: "lateral-raise", title: "Seitheben" },
        { id: "cable-lateral-raise", title: "Seitheben am Kabel" },
        { id: "front-raise", title: "Frontheben" },
        { id: "reverse-flyes", title: "Reverse Flys" },
        { id: "reverse-pec-deck", title: "Reverse Butterfly" },
        { id: "upright-rows", title: "Upright Rows" },
        { id: "face-pulls", title: "Face Pulls" },
        { id: "cable-y-raise", title: "Cable Y-Raise" },
        { id: "leaning-lateral-raise", title: "Leaning Lateral Raise" },
        { id: "landmine-press", title: "Landmine Press" },
        { id: "behind-the-back-shrug", title: "Shrugs hinter dem Rücken" }
      ]
    },
    {
      id: "legs",
      label: "Beine",
      imagePath: "pictures/beine.png",
      description: "Kraft, Kontrolle und saubere Unterkörperbasis.",
      exercises: [
        { id: "squats", title: "Kniebeugen" },
        { id: "front-squats", title: "Frontkniebeugen" },
        { id: "hack-squats", title: "Hack Squats" },
        { id: "bulgarian-split-squats", title: "Bulgarian Split Squats" },
        { id: "leg-press", title: "Beinpresse" },
        { id: "romanian-deadlifts", title: "Rumänisches Kreuzheben" },
        { id: "lunges", title: "Ausfallschritte" },
        { id: "walking-lunges", title: "Walking Lunges" },
        { id: "step-ups", title: "Step-Ups" },
        { id: "hip-thrusts", title: "Hip Thrusts" },
        { id: "glute-bridge", title: "Glute Bridge" },
        { id: "leg-extension", title: "Beinstrecker" },
        { id: "leg-curl", title: "Beinbeuger" },
        { id: "lying-leg-curl", title: "Liegender Beinbeuger" },
        { id: "standing-calf-raises", title: "Wadenheben stehend" },
        { id: "seated-calf-raises", title: "Wadenheben sitzend" },
        { id: "adductor-machine", title: "Adduktorenmaschine" },
        { id: "abductor-machine", title: "Abduktorenmaschine" }
      ]
    },
    {
      id: "biceps",
      label: "Bizeps",
      imagePath: "pictures/bizeps.png",
      description: "Curl-Varianten für Zugarm und Unterarmspannung.",
      exercises: [
        { id: "barbell-curls", title: "Langhantel-Curls" },
        { id: "dumbbell-curls", title: "Kurzhantel-Curls" },
        { id: "hammer-curls", title: "Hammercurls" },
        { id: "concentration-curls", title: "Konzentrationscurls" },
        { id: "cable-curls", title: "Kabel-Curls" },
        { id: "preacher-curls", title: "Preacher Curls" },
        { id: "incline-dumbbell-curls", title: "Incline Dumbbell Curls" },
        { id: "ez-bar-curls", title: "SZ-Curls" },
        { id: "reverse-curls", title: "Reverse Curls" },
        { id: "bayesian-curls", title: "Bayesian Curls" },
        { id: "spider-curls", title: "Spider Curls" },
        { id: "machine-biceps-curls", title: "Bizepsmaschine" },
        { id: "single-arm-cable-curls", title: "Einarmige Kabel-Curls" }
      ]
    },
    {
      id: "triceps",
      label: "Trizeps",
      imagePath: "pictures/trizeps.png",
      description: "Druckstärke und sauberes Strecken.",
      exercises: [
        { id: "triceps-pushdown", title: "Trizepsdrücken am Kabel" },
        { id: "overhead-extensions", title: "Overhead Extensions" },
        { id: "bench-dips", title: "Dips" },
        { id: "french-press", title: "French Press" },
        { id: "close-grip-bench", title: "Enges Bankdrücken" },
        { id: "kickbacks", title: "Kickbacks" },
        { id: "rope-pushdown", title: "Rope Pushdown" },
        { id: "reverse-grip-pushdown", title: "Reverse Grip Pushdown" },
        { id: "skull-crushers", title: "Skull Crushers" },
        { id: "single-arm-overhead-extension", title: "Einarmige Overhead Extension" },
        { id: "machine-dips", title: "Dips an der Maschine" },
        { id: "cable-kickbacks", title: "Kickbacks am Kabel" },
        { id: "jm-press", title: "JM Press" }
      ]
    },
    {
      id: "abs",
      label: "Bauch",
      imagePath: "pictures/bauch.png",
      description: "Spannung, Kontrolle und Kernstabilität.",
      exercises: [
        { id: "crunches", title: "Crunches" },
        { id: "hanging-leg-raises", title: "Hanging Leg Raises" },
        { id: "cable-crunches", title: "Cable Crunches" },
        { id: "plank", title: "Plank" },
        { id: "russian-twists", title: "Russian Twists" },
        { id: "dead-bug", title: "Dead Bug" },
        { id: "sit-ups", title: "Sit-Ups" },
        { id: "reverse-crunches", title: "Reverse Crunches" },
        { id: "ab-wheel", title: "Ab Wheel Rollout" },
        { id: "mountain-climbers", title: "Mountain Climbers" },
        { id: "side-plank", title: "Side Plank" },
        { id: "v-ups", title: "V-Ups" },
        { id: "toe-touches", title: "Toe Touches" },
        { id: "hollow-body-hold", title: "Hollow Body Hold" }
      ]
    },
    {
      id: "recovery",
      label: "Recovery",
      description: "Erholung bewusst einplanen statt nur hoffen.",
      exercises: [
        { id: "mobility-flow", title: "Mobility Flow" },
        { id: "stretching", title: "Stretching" },
        { id: "walk", title: "Spaziergang" },
        { id: "sauna", title: "Sauna" },
        { id: "breathwork", title: "Atemarbeit" },
        { id: "foam-rolling", title: "Faszienrolle" },
        { id: "light-cycling", title: "Leichtes Radfahren" },
        { id: "easy-rowing", title: "Lockeres Rudern" },
        { id: "yoga", title: "Yoga" },
        { id: "cold-shower", title: "Kalte Dusche" },
        { id: "sleep-focus", title: "Schlaf-Fokus" },
        { id: "massage-gun", title: "Massage Gun" },
        { id: "contrast-bath", title: "Wechselbad" }
      ]
    }
  ];

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyStore();
      return normalizeStore(JSON.parse(raw));
    } catch (error) {
      return createEmptyStore();
    }
  }

  function saveStore(store) {
    const normalizedStore = normalizeStore(store);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedStore));
    return normalizedStore;
  }

  function loadPlans() {
    return loadStore().plans;
  }

  function savePlans(plans, activePlanId = "") {
    return saveStore({ plans, activePlanId });
  }

  function createEmptyStore() {
    return {
      plans: [],
      activePlanId: ""
    };
  }

  function createEmptyWeek() {
    return Object.fromEntries(DAY_ORDER.map((day) => [day.id, []]));
  }

  function createEmptyDayNames() {
    return Object.fromEntries(DAY_ORDER.map((day) => [day.id, ""]));
  }

  function createPlan(name) {
    const store = loadStore();
    const plan = normalizePlan({
      id: createPlanId(),
      name: normalizePlanName(name),
      groups: {},
      week: createEmptyWeek(),
      dayNames: createEmptyDayNames(),
      updatedAt: new Date().toISOString()
    });
    store.plans.unshift(plan);
    store.activePlanId = plan.id;
    saveStore(store);
    return plan;
  }

  function getPlanById(planId) {
    if (!planId) return null;
    return loadStore().plans.find((plan) => plan.id === planId) || null;
  }

  function getActivePlan(store = loadStore()) {
    return store.plans.find((plan) => plan.id === store.activePlanId) || store.plans[0] || null;
  }

  function setActivePlanId(planId) {
    const store = loadStore();
    if (!store.plans.some((plan) => plan.id === planId)) return saveStore(store);
    store.activePlanId = planId;
    return saveStore(store);
  }

  function savePlan(plan) {
    const store = loadStore();
    const normalizedPlan = normalizePlan({
      ...plan,
      updatedAt: new Date().toISOString()
    });
    const index = store.plans.findIndex((entry) => entry.id === normalizedPlan.id);

    if (index >= 0) {
      store.plans[index] = normalizedPlan;
    } else {
      store.plans.unshift(normalizedPlan);
    }

    store.activePlanId = normalizedPlan.id;
    saveStore(store);
    return normalizedPlan;
  }

  function updatePlanGroups(planId, groups) {
    const plan = getPlanById(planId);
    if (!plan) return null;
    return savePlan({
      ...plan,
      groups
    });
  }

  function updatePlanName(planId, name) {
    const plan = getPlanById(planId);
    if (!plan) return null;
    return savePlan({
      ...plan,
      name: normalizePlanName(name)
    });
  }

  function updatePlanWeek(planId, week) {
    const plan = getPlanById(planId);
    if (!plan) return null;
    return savePlan({
      ...plan,
      week
    });
  }

  function updatePlanDayNames(planId, dayNames) {
    const plan = getPlanById(planId);
    if (!plan) return null;
    return savePlan({
      ...plan,
      dayNames
    });
  }

  function migrateLegacySinglePlan(raw) {
    if (!raw || typeof raw !== "object" || !raw.groups || typeof raw.groups !== "object") {
      return createEmptyStore();
    }

    const firstPlan = normalizePlan({
      id: createPlanId(),
      name: "Mein erster Plan",
      groups: raw.groups,
      week: createEmptyWeek(),
      dayNames: createEmptyDayNames(),
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : ""
    });

    return {
      plans: [firstPlan],
      activePlanId: firstPlan.id
    };
  }

  function normalizeStore(store) {
    if (!store || typeof store !== "object") return createEmptyStore();
    if (!Array.isArray(store.plans)) return migrateLegacySinglePlan(store);

    const plans = store.plans
      .filter((plan) => plan && typeof plan === "object")
      .map((plan) => normalizePlan(plan));

    const activePlanId = plans.some((plan) => plan.id === store.activePlanId)
      ? store.activePlanId
      : plans[0]?.id || "";

    return {
      plans,
      activePlanId
    };
  }

  function normalizePlan(plan) {
    const groups = normalizeGroups(plan?.groups);
    const validSlotIds = new Set(getGroupEntries({ groups }).map((entry) => entry.slotId));
    const week = normalizeWeek(plan?.week, validSlotIds);
    const dayNames = normalizeDayNames(plan?.dayNames);

    return {
      id: typeof plan?.id === "string" && plan.id.trim() ? plan.id : createPlanId(),
      name: normalizePlanName(plan?.name),
      groups,
      week,
      dayNames,
      updatedAt: typeof plan?.updatedAt === "string" ? plan.updatedAt : ""
    };
  }

  function normalizeGroups(groups) {
    const normalized = {};
    if (!groups || typeof groups !== "object") return normalized;

    MUSCLE_GROUPS.forEach((group) => {
      const rawGroup = groups[group.id];
      if (!rawGroup) return;

      const exercises = Array.isArray(rawGroup.exercises)
        ? Array.from(new Set(rawGroup.exercises.filter((exerciseId) => group.exercises.some((exercise) => exercise.id === exerciseId))))
        : [];

      if (!exercises.length) return;

      normalized[group.id] = {
        label: group.label,
        exercises
      };
    });

    return normalized;
  }

  function normalizeWeek(week, validSlotIds) {
    const normalized = createEmptyWeek();
    const usedSlots = new Set();

    DAY_ORDER.forEach((day) => {
      const dayEntries = Array.isArray(week && week[day.id]) ? week[day.id] : [];
      dayEntries.forEach((slotId) => {
        if (!validSlotIds.has(slotId) || usedSlots.has(slotId)) return;
        normalized[day.id].push(slotId);
        usedSlots.add(slotId);
      });
    });

    return normalized;
  }

  function normalizeDayNames(dayNames) {
    const normalized = createEmptyDayNames();
    if (!dayNames || typeof dayNames !== "object") return normalized;

    DAY_ORDER.forEach((day) => {
      const value = String(dayNames[day.id] || "").trim();
      normalized[day.id] = value.slice(0, 28);
    });

    return normalized;
  }

  function normalizePlanName(value) {
    const trimmed = String(value || "").trim();
    return trimmed || "Trainingsplan";
  }

  function createPlanId() {
    return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getGroupById(groupId) {
    return MUSCLE_GROUPS.find((group) => group.id === groupId) || null;
  }

  function getGroupImagePath(groupId) {
    return getGroupById(groupId)?.imagePath || "";
  }

  function getExerciseTitles(groupId, exerciseIds) {
    const group = getGroupById(groupId);
    if (!group) return [];
    return group.exercises
      .filter((exercise) => exerciseIds.includes(exercise.id))
      .map((exercise) => exercise.title);
  }

  function getSlotId(groupId, exerciseId) {
    return `${groupId}::${exerciseId}`;
  }

  function parseSlotId(slotId) {
    const [groupId, exerciseId] = String(slotId || "").split("::");
    return { groupId, exerciseId };
  }

  function getGroupEntries(plan) {
    const groups = normalizeGroups(plan?.groups);
    return MUSCLE_GROUPS.flatMap((group) => {
      const savedGroup = groups[group.id];
      if (!savedGroup) return [];

      return savedGroup.exercises.map((exerciseId) => {
        const exercise = group.exercises.find((entry) => entry.id === exerciseId);
        return exercise ? {
          slotId: getSlotId(group.id, exercise.id),
          groupId: group.id,
          groupLabel: group.label,
          exerciseId: exercise.id,
          title: exercise.title
        } : null;
      }).filter(Boolean);
    });
  }

  function getSelectedGroupEntries(plan) {
    const groups = normalizeGroups(plan?.groups);
    return MUSCLE_GROUPS
      .filter((group) => groups[group.id])
      .map((group) => ({
        ...group,
        selectedExercises: group.exercises.filter((exercise) => groups[group.id].exercises.includes(exercise.id))
      }));
  }

  function getAssignedDay(plan, slotId) {
    const week = normalizeWeek(plan?.week, new Set(getGroupEntries(plan).map((entry) => entry.slotId)));
    return DAY_ORDER.find((day) => week[day.id].includes(slotId))?.id || "";
  }

  function assignSlotToDay(plan, slotId, dayId) {
    const nextWeek = createEmptyWeek();
    DAY_ORDER.forEach((day) => {
      nextWeek[day.id] = normalizeWeek(plan?.week, new Set(getGroupEntries(plan).map((entry) => entry.slotId)))[day.id]
        .filter((entry) => entry !== slotId);
    });

    if (dayId && nextWeek[dayId]) {
      nextWeek[dayId].push(slotId);
    }

    return nextWeek;
  }

  function getDayEntries(plan, dayId) {
    const entryMap = new Map(getGroupEntries(plan).map((entry) => [entry.slotId, entry]));
    const week = normalizeWeek(plan?.week, new Set(entryMap.keys()));
    return Array.isArray(week[dayId]) ? week[dayId].map((slotId) => entryMap.get(slotId)).filter(Boolean) : [];
  }

  function getPlanStats(plan) {
    const selectedGroups = getSelectedGroupEntries(plan);
    const allEntries = getGroupEntries(plan);
    const scheduledDayCount = DAY_ORDER.reduce((count, day) => count + (getDayEntries(plan, day.id).length ? 1 : 0), 0);
    const nextScheduledDay = DAY_ORDER.find((day) => getDayEntries(plan, day.id).length);

    return {
      groupCount: selectedGroups.length,
      exerciseCount: allEntries.length,
      scheduledDayCount,
      nextFocus: nextScheduledDay ? nextScheduledDay.label : (selectedGroups[0]?.label || "Noch offen"),
      nextFocusText: nextScheduledDay
        ? `${getDayEntries(plan, nextScheduledDay.id).length} Übungen liegen aktuell auf ${nextScheduledDay.label}.`
        : selectedGroups[0]
          ? `${selectedGroups[0].selectedExercises.length} Übungen warten aktuell in ${selectedGroups[0].label}.`
          : "Sobald du eine Gruppe anlegst, erscheint hier dein nächster Schwerpunkt."
    };
  }

  function getStoreStats(store = loadStore()) {
    const plans = store.plans;
    const totalExercises = plans.reduce((sum, plan) => sum + getPlanStats(plan).exerciseCount, 0);
    const activePlan = getActivePlan(store);
    const activeStats = activePlan ? getPlanStats(activePlan) : null;

    return {
      planCount: plans.length,
      totalExercises,
      activePlan,
      activeStats
    };
  }

  function formatUpdatedAt(value) {
    if (!value) return "Noch nicht erstellt";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Noch nicht erstellt";
    return `Aktualisiert ${new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)}`;
  }

  function getDayMeta(dayId) {
    return DAY_ORDER.find((day) => day.id === dayId) || DAY_ORDER[0];
  }

  function getDayName(plan, dayId) {
    const customName = String(plan?.dayNames?.[dayId] || "").trim();
    return customName || getDayMeta(dayId).label;
  }

  function getGroupIcon(groupId) {
    const icons = {
      chest: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <path d="M25 24c2-5 12-5 14 0v8H25z" class="gyltMuscleHighlight"/>
        </svg>
      `,
      back: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <path d="M26 20h12l3 15c-2 3-16 3-18 0z" class="gyltMuscleHighlight"/>
        </svg>
      `,
      shoulders: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <circle cx="22" cy="24" r="5" class="gyltMuscleHighlight"/>
          <circle cx="42" cy="24" r="5" class="gyltMuscleHighlight"/>
        </svg>
      `,
      legs: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="24" y="34" width="7" height="22" rx="3.5" class="gyltMuscleHighlight"/>
          <rect x="33" y="34" width="7" height="22" rx="3.5" class="gyltMuscleHighlight"/>
        </svg>
      `,
      biceps: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <ellipse cx="21" cy="28" rx="5" ry="6" class="gyltMuscleHighlight"/>
          <ellipse cx="43" cy="28" rx="5" ry="6" class="gyltMuscleHighlight"/>
        </svg>
      `,
      triceps: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <path d="M16 24c3 1 5 4 5 8s-2 7-5 8" class="gyltMuscleStroke"/>
          <path d="M48 24c-3 1-5 4-5 8s2 7 5 8" class="gyltMuscleStroke"/>
        </svg>
      `,
      abs: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="27" y="22" width="10" height="16" rx="5" class="gyltMuscleHighlight"/>
        </svg>
      `,
      recovery: `
        <svg viewBox="0 0 64 64" class="gyltMuscleSvg" role="img" aria-hidden="true">
          <circle cx="32" cy="10" r="7" class="gyltMuscleBase"/>
          <rect x="24" y="18" width="16" height="16" rx="8" class="gyltMuscleBase"/>
          <rect x="18" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="40" y="19" width="6" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="26" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <rect x="33" y="34" width="5" height="18" rx="3" class="gyltMuscleBase"/>
          <path d="M32 18c7 0 12 5 12 12S39 42 32 46c-7-4-12-9-12-16s5-12 12-12z" class="gyltRecoveryHighlight"/>
        </svg>
      `
    };

    return icons[groupId] || icons.chest;
  }

  window.GYLT_FITNESS = {
    STORAGE_KEY,
    DAY_ORDER,
    MUSCLE_GROUPS,
    createEmptyWeek,
    loadStore,
    saveStore,
    loadPlans,
    savePlans,
    createPlan,
    getPlanById,
    getActivePlan,
    setActivePlanId,
    savePlan,
    updatePlanName,
    updatePlanGroups,
    updatePlanWeek,
    updatePlanDayNames,
    getGroupById,
    getGroupImagePath,
    getExerciseTitles,
    getSlotId,
    parseSlotId,
    getGroupEntries,
    getSelectedGroupEntries,
    getAssignedDay,
    assignSlotToDay,
    getDayEntries,
    getPlanStats,
    getStoreStats,
    formatUpdatedAt,
    getDayMeta,
    getDayName,
    getGroupIcon,
    migrateLegacySinglePlan
  };
}());
