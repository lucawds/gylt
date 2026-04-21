const STORAGE_KEY_THEME = "theme";

const themeToggle = document.getElementById("themeToggle");
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
const backdrop = document.getElementById("backdrop");

function setThemeButtonLabel() {
  if (!themeToggle) return;
  const isLight = document.body.classList.contains("light");
  themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
}

function applyThemeFromStorage() {
  const isLight = localStorage.getItem(STORAGE_KEY_THEME) === "light";
  document.body.classList.toggle("light", isLight);
  setThemeButtonLabel();
}

function closeSettingsMenu() {
  settingsMenu?.classList.add("hidden");
  backdrop?.classList.add("hidden");
}

function initSettingsMenu() {
  if (!settingsBtn || !settingsMenu || !backdrop) return;

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("hidden");
    backdrop.classList.toggle("hidden", settingsMenu.classList.contains("hidden"));
  });

  settingsMenu.addEventListener("click", (e) => e.stopPropagation());
  backdrop.addEventListener("click", closeSettingsMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettingsMenu();
  });
}

function initThemeToggle() {
  if (!themeToggle) return;

  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light");
    if (window.UI_PREFS?.setTheme) {
      window.UI_PREFS.setTheme(!isLight);
    } else {
      document.body.classList.toggle("light", !isLight);
      localStorage.setItem(STORAGE_KEY_THEME, !isLight ? "light" : "dark");
    }
    setThemeButtonLabel();
    closeSettingsMenu();
  });
}

applyThemeFromStorage();
initSettingsMenu();
initThemeToggle();
