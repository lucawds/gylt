const themeToggle = document.getElementById("themeToggle");
const accentColorInput = document.getElementById("accentColorInput");
const accentValue = document.getElementById("accentValue");
const accentResetBtn = document.getElementById("accentResetBtn");
const layoutEditToggle = document.getElementById("layoutEditToggle");
const settingsState = document.getElementById("settingsState");
const presetButtons = Array.from(document.querySelectorAll(".settingsPresetBtn"));
const STORAGE_KEY_HOME_LAYOUT_EDIT_MODE = "home_layout_edit_mode_v1";

const PRESETS = {
  dark_classic: {
    label: "Wie jetzt",
    theme: "dark",
    darkPalette: "classic"
  },
  royal_green: {
    label: "Royal Green",
    theme: "dark",
    darkPalette: "royal_green"
  },
  wine_red: {
    label: "Wine Red",
    theme: "dark",
    darkPalette: "wine_red"
  },
  navy_blue: {
    label: "Navy Blue",
    theme: "dark",
    darkPalette: "navy_blue"
  },
  light_beige: {
    label: "Light Weiss",
    theme: "light",
    lightStyle: "beige"
  },
  light_silver: {
    label: "Light Silber/Grau",
    theme: "light",
    lightStyle: "silver"
  }
};

function setState(text) {
  if (settingsState) settingsState.textContent = text;
}

function syncThemeLabel() {
  if (!themeToggle) return;
  const isLight = document.body.classList.contains("light");
  themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
}

function isLayoutEditEnabled() {
  return localStorage.getItem(STORAGE_KEY_HOME_LAYOUT_EDIT_MODE) === "1";
}

function setLayoutEditEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY_HOME_LAYOUT_EDIT_MODE, enabled ? "1" : "0");
}

function syncLayoutEditToggle() {
  if (!layoutEditToggle) return;
  const enabled = isLayoutEditEnabled();
  layoutEditToggle.textContent = enabled ? "Layout bearbeiten: Ein" : "Layout bearbeiten: Aus";
  layoutEditToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
}

function syncAccentUi() {
  const accent = window.UI_PREFS?.getAccent?.() ?? "#78a0ff";
  if (accentColorInput) accentColorInput.value = accent;
  if (accentValue) accentValue.textContent = accent;
}

function applyAccent(value) {
  if (!window.UI_PREFS?.setAccent) return;
  const accent = window.UI_PREFS.setAccent(value, true);
  if (accentValue) accentValue.textContent = accent;
}

function applyPreset(presetId) {
  const preset = PRESETS[presetId];
  if (!preset) return;

  if (preset.darkPalette && window.UI_PREFS?.setDarkPalette) {
    window.UI_PREFS.setDarkPalette(preset.darkPalette, true);
  }

  if (preset.lightStyle && window.UI_PREFS?.setLightStyle) {
    window.UI_PREFS.setLightStyle(preset.lightStyle, true);
  }

  if (preset.theme && window.UI_PREFS?.setTheme) {
    window.UI_PREFS.setTheme(preset.theme === "light");
  }
  syncThemeLabel();
  syncAccentUi();
  setState(`Preset aktiv: ${preset.label}`);
}

syncThemeLabel();
syncAccentUi();
syncLayoutEditToggle();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = !document.body.classList.contains("light");
    window.UI_PREFS?.setTheme?.(isLight);
    syncThemeLabel();
    setState("Gespeichert");
  });
}

layoutEditToggle?.addEventListener("click", () => {
  setLayoutEditEnabled(!isLayoutEditEnabled());
  syncLayoutEditToggle();
  setState("Gespeichert");
});

accentColorInput?.addEventListener("input", () => {
  setState("Speichert...");
  applyAccent(accentColorInput.value);
  syncAccentUi();
  setState("Gespeichert");
});

accentResetBtn?.addEventListener("click", () => {
  const fallback = window.UI_PREFS?.DEFAULT_ACCENT ?? "#78a0ff";
  applyAccent(fallback);
  if (window.UI_PREFS?.setDarkPalette) {
    const currentDarkPreset = window.UI_PREFS.getDarkPalette?.() ?? "classic";
    window.UI_PREFS.setDarkPalette(currentDarkPreset, true);
  }
  syncAccentUi();
  setState("Gespeichert");
});

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const presetId = btn.dataset.preset;
    applyPreset(presetId);
  });
});
