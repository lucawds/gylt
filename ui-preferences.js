(function () {
  const STORAGE_KEY_THEME = "theme";
  const STORAGE_KEY_ACCENT = "accent_color_v1";
  const STORAGE_KEY_LIGHT_STYLE = "light_style_v1";
  const STORAGE_KEY_DARK_PALETTE = "dark_palette_v1";
  const DEFAULT_ACCENT = "#78a0ff";
  const DEFAULT_LIGHT_STYLE = "beige";
  const DEFAULT_DARK_PALETTE = "classic";

  const DARK_PALETTES = {
    classic: {
      bgA: "#090909",
      bgB: "#000000",
      panel: "#0c0c0c",
      text: "#f0f3f7",
      accent: "#78a0ff"
    },
    royal_green: {
      bgA: "#07140d",
      bgB: "#020905",
      panel: "#0f2218",
      text: "#e8f5ec",
      accent: "#2f9e44"
    },
    wine_red: {
      bgA: "#140707",
      bgB: "#050203",
      panel: "#1f0d11",
      text: "#f0ecec",
      accent: "#6b0f22"
    },
    navy_blue: {
      bgA: "#071022",
      bgB: "#020711",
      panel: "#0f1b33",
      text: "#e7eefc",
      accent: "#1f4e79"
    }
  };

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function normalizeHex(value, fallback = DEFAULT_ACCENT) {
    const raw = String(value ?? "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }
    return fallback;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex);
    const intVal = Number.parseInt(normalized.slice(1), 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    };
  }

  function rgbaFromHex(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function setTheme(isLight) {
    localStorage.setItem(STORAGE_KEY_THEME, isLight ? "light" : "dark");
    document.body?.classList.toggle("light", !!isLight);
  }

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY_THEME) === "light" ? "light" : "dark";
  }

  function applyStoredTheme() {
    setTheme(getStoredTheme() === "light");
  }

  function normalizeDarkPalette(name) {
    return Object.prototype.hasOwnProperty.call(DARK_PALETTES, name) ? name : DEFAULT_DARK_PALETTE;
  }

  function setDarkPalette(name, persist = true) {
    const id = normalizeDarkPalette(name);
    const palette = DARK_PALETTES[id];
    const root = document.documentElement;

    root.style.setProperty("--bgA", palette.bgA);
    root.style.setProperty("--bgB", palette.bgB);
    root.style.setProperty("--text", palette.text);
    root.style.setProperty("--panel", rgbaFromHex(palette.panel, 0.9));
    root.style.setProperty("--inputBg", palette.panel);

    setAccent(palette.accent, persist);

    if (persist) {
      localStorage.setItem(STORAGE_KEY_DARK_PALETTE, id);
    }
    return id;
  }

  function getDarkPalette() {
    return normalizeDarkPalette(localStorage.getItem(STORAGE_KEY_DARK_PALETTE) || DEFAULT_DARK_PALETTE);
  }

  function applyStoredDarkPalette() {
    return setDarkPalette(getDarkPalette(), false);
  }

  function normalizeLightStyle(style) {
    return style === "silver" ? "silver" : "beige";
  }

  function setLightStyle(style, persist = true) {
    const chosen = normalizeLightStyle(style);
    const root = document.documentElement;

    if (chosen === "silver") {
      root.style.setProperty("--l-bgA", "#edf1f6");
      root.style.setProperty("--l-bgB", "#dfe5ec");
      root.style.setProperty("--l-body-text", "#2f3540");
      root.style.setProperty("--l-glowA", "rgba(223,230,239,0.95)");
      root.style.setProperty("--l-glowB", "rgba(204,214,226,0.95)");
      root.style.setProperty("--l-text", "#596271");
      root.style.setProperty("--l-panel", "rgba(242,246,251,0.9)");
      root.style.setProperty("--l-panelBorder", "rgba(112,122,136,0.26)");
      root.style.setProperty("--l-inputBg", "#f7f9fc");
    } else {
      root.style.setProperty("--l-bgA", "#ffffff");
      root.style.setProperty("--l-bgB", "#f3f5f8");
      root.style.setProperty("--l-body-text", "#1f232a");
      root.style.setProperty("--l-glowA", "rgba(236,240,246,0.95)");
      root.style.setProperty("--l-glowB", "rgba(220,227,238,0.95)");
      root.style.setProperty("--l-text", "#5f6875");
      root.style.setProperty("--l-panel", "rgba(255,255,255,0.9)");
      root.style.setProperty("--l-panelBorder", "rgba(112,122,136,0.24)");
      root.style.setProperty("--l-inputBg", "#f8fafc");
    }

    if (persist) {
      localStorage.setItem(STORAGE_KEY_LIGHT_STYLE, chosen);
    }
    return chosen;
  }

  function getLightStyle() {
    return normalizeLightStyle(localStorage.getItem(STORAGE_KEY_LIGHT_STYLE) || DEFAULT_LIGHT_STYLE);
  }

  function applyStoredLightStyle() {
    return setLightStyle(getLightStyle(), false);
  }

  function setAccent(hex, persist = true) {
    const color = normalizeHex(hex);
    const { r, g, b } = hexToRgb(color);

    const strongR = clamp(r + 10, 0, 255);
    const strongG = clamp(g + 10, 0, 255);
    const strongB = clamp(b + 10, 0, 255);

    const softR = clamp(r + 45, 0, 255);
    const softG = clamp(g + 45, 0, 255);
    const softB = clamp(b + 45, 0, 255);

    const deepR = clamp(r - 48, 0, 255);
    const deepG = clamp(g - 48, 0, 255);
    const deepB = clamp(b - 48, 0, 255);

    const root = document.documentElement;
    root.style.setProperty("--accent-rgb", `${r},${g},${b}`);
    root.style.setProperty("--accent-strong-rgb", `${strongR},${strongG},${strongB}`);
    root.style.setProperty("--accent-soft-rgb", `${softR},${softG},${softB}`);
    root.style.setProperty("--accent-deep-rgb", `${deepR},${deepG},${deepB}`);
    root.style.setProperty("--accent", `rgba(${r},${g},${b},0.85)`);
    root.style.setProperty("--glow", `rgba(${r},${g},${b},0.55)`);
    root.style.setProperty("--panelBorder", `rgba(${r},${g},${b},0.24)`);

    if (persist) {
      localStorage.setItem(STORAGE_KEY_ACCENT, color);
    }

    return color;
  }

  function getAccent() {
    return normalizeHex(localStorage.getItem(STORAGE_KEY_ACCENT), DEFAULT_ACCENT);
  }

  function applyStoredAccent() {
    return setAccent(getAccent(), false);
  }

  function applyAll() {
    applyStoredTheme();
    applyStoredLightStyle();
    applyStoredDarkPalette();
    applyStoredAccent();
  }

  window.UI_PREFS = {
    STORAGE_KEY_THEME,
    STORAGE_KEY_ACCENT,
    STORAGE_KEY_LIGHT_STYLE,
    STORAGE_KEY_DARK_PALETTE,
    DEFAULT_ACCENT,
    DEFAULT_LIGHT_STYLE,
    DEFAULT_DARK_PALETTE,
    DARK_PALETTES,
    normalizeHex,
    setTheme,
    getStoredTheme,
    applyStoredTheme,
    setDarkPalette,
    getDarkPalette,
    applyStoredDarkPalette,
    setLightStyle,
    getLightStyle,
    applyStoredLightStyle,
    setAccent,
    getAccent,
    applyStoredAccent,
    applyAll
  };

  applyAll();
})();
