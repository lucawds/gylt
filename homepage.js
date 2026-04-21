const STORAGE_KEY_TASKS = "tasks_v2";
const STORAGE_KEY_HOME_CART = "home_cart_items_v1";
const STORAGE_KEY_HOME_LAYOUT_ORDER = "home_layout_order_v1";
const STORAGE_KEY_HOME_LAYOUT_EDIT_MODE = "home_layout_edit_mode_v1";

const dayOrder = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"];

const homeDate = document.getElementById("homeDate");
const weekSummary = document.getElementById("weekSummary");
const weekPercent = document.getElementById("weekPercent");
const weekOpen = document.getElementById("weekOpen");
const weekProgressBar = document.getElementById("weekProgressBar");
const homeLayoutCards = document.getElementById("homeLayoutCards");
const homeNewsFeed = document.getElementById("homeNewsFeed");
const homeEcoNewsFeed = document.getElementById("homeEcoNewsFeed");
const homeNewsRail = document.querySelector(".homeNewsRail");

const homeWeatherState = document.getElementById("homeWeatherState");
const homeWeatherLocation = document.getElementById("homeWeatherLocation");
const homeWeatherTemp = document.getElementById("homeWeatherTemp");
const homeWeatherDesc = document.getElementById("homeWeatherDesc");
const homeWeatherFeels = document.getElementById("homeWeatherFeels");
const homeWeatherWind = document.getElementById("homeWeatherWind");
const homeWeatherRange = document.getElementById("homeWeatherRange");
const homeClockHour = document.getElementById("homeClockHour");
const homeClockMinute = document.getElementById("homeClockMinute");
const homeClockSecond = document.getElementById("homeClockSecond");
const homeStreamDeepLinks = Array.from(document.querySelectorAll(".homeStreamDeepLink"));

const homeCartForm = document.getElementById("homeCartForm");
const homeCartInput = document.getElementById("homeCartInput");
const homeCartList = document.getElementById("homeCartList");
const homeCartCount = document.getElementById("homeCartCount");
const homeCartClearBought = document.getElementById("homeCartClearBought");
const homeCartMessage = document.getElementById("homeCartMessage");
const homeCartLauncher = document.getElementById("homeCartLauncher");
const homeCartLauncherCount = document.getElementById("homeCartLauncherCount");
const homeCartDock = document.getElementById("homeCartDock");

let weatherCoords = null;
let homeCartItems = [];
let liveFeedsLoaded = false;
let draggedLayoutId = null;

function loadAllTasks() {
  const raw = localStorage.getItem(STORAGE_KEY_TASKS);
  const empty = {};
  for (const d of dayOrder) empty[d] = [];
  if (!raw) return empty;

  try {
    const data = JSON.parse(raw);
    for (const d of dayOrder) data[d] ??= [];
    return data;
  } catch {
    return empty;
  }
}

function currentThemeName() {
  return document.body.classList.contains("light") ? "light" : "dark";
}

function updateDateLine() {
  if (!homeDate) return;
  homeDate.textContent = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function updateTodoSummary() {
  const all = loadAllTasks();

  let total = 0;
  let done = 0;

  for (const day of dayOrder) {
    const list = all[day] ?? [];
    total += list.length;
    done += list.filter((t) => t.checked).length;
  }

  const open = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (weekSummary) weekSummary.textContent = `${done}/${total} erledigt`;
  if (weekPercent) weekPercent.textContent = `${pct}% abgeschlossen`;
  if (weekOpen) weekOpen.textContent = `${open} offen`;
  if (weekProgressBar) weekProgressBar.style.width = `${pct}%`;
}

function getLayoutCards() {
  if (!homeLayoutCards) return [];
  return Array.from(homeLayoutCards.querySelectorAll(".homeLayoutCard[data-layout-id]"));
}

function getLayoutIds(cards = getLayoutCards()) {
  return cards
    .map((card) => card.dataset.layoutId)
    .filter((id) => typeof id === "string" && id.length > 0);
}

function normalizeLayoutOrder(order, availableIds) {
  const normalized = [];
  const source = Array.isArray(order) ? order : [];

  for (const id of source) {
    if (typeof id !== "string") continue;
    if (!availableIds.includes(id)) continue;
    if (normalized.includes(id)) continue;
    normalized.push(id);
  }

  for (const id of availableIds) {
    if (!normalized.includes(id)) normalized.push(id);
  }

  return normalized;
}

function loadLayoutOrder() {
  const availableIds = getLayoutIds();
  if (availableIds.length === 0) return [];

  const raw = localStorage.getItem(STORAGE_KEY_HOME_LAYOUT_ORDER);
  if (!raw) return availableIds;

  try {
    const parsed = JSON.parse(raw);
    return normalizeLayoutOrder(parsed?.main, availableIds);
  } catch {
    return availableIds;
  }
}

function saveLayoutOrder(order) {
  const availableIds = getLayoutIds();
  const normalized = normalizeLayoutOrder(order, availableIds);
  localStorage.setItem(STORAGE_KEY_HOME_LAYOUT_ORDER, JSON.stringify({ main: normalized }));
  return normalized;
}

function getCurrentLayoutOrder() {
  return getLayoutIds();
}

function applyLayoutOrder(order = null) {
  if (!homeLayoutCards) return [];

  const cards = getLayoutCards();
  const cardMap = new Map(cards.map((card) => [card.dataset.layoutId, card]));
  const availableIds = Array.from(cardMap.keys());
  const targetOrder = normalizeLayoutOrder(order ?? availableIds, availableIds);

  for (const id of targetOrder) {
    const card = cardMap.get(id);
    if (card) homeLayoutCards.appendChild(card);
  }

  return targetOrder;
}

function isLayoutEditEnabled() {
  return localStorage.getItem(STORAGE_KEY_HOME_LAYOUT_EDIT_MODE) === "1";
}

function clearLayoutDragState() {
  for (const card of getLayoutCards()) {
    card.classList.remove("dragOver", "isDragging");
  }
  draggedLayoutId = null;
}

function setLayoutEditUi(enabled) {
  for (const card of getLayoutCards()) {
    card.draggable = Boolean(enabled);
  }
  document.body.classList.toggle("layoutEditMode", Boolean(enabled));
  if (!enabled) clearLayoutDragState();
}

function initLayoutEditor() {
  if (!homeLayoutCards) return;

  const initialOrder = loadLayoutOrder();
  const appliedOrder = applyLayoutOrder(initialOrder);
  saveLayoutOrder(appliedOrder);

  setLayoutEditUi(isLayoutEditEnabled());

  homeLayoutCards.addEventListener("dragstart", (e) => {
    if (!isLayoutEditEnabled()) {
      e.preventDefault();
      return;
    }

    const card = e.target.closest(".homeLayoutCard");
    if (!card?.dataset.layoutId || !card.draggable) {
      e.preventDefault();
      return;
    }

    draggedLayoutId = card.dataset.layoutId;
    card.classList.add("isDragging");

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", draggedLayoutId);
    }
  });

  homeLayoutCards.addEventListener("dragover", (e) => {
    if (!isLayoutEditEnabled() || !draggedLayoutId) return;

    const targetCard = e.target.closest(".homeLayoutCard");
    if (!targetCard?.dataset.layoutId || targetCard.dataset.layoutId === draggedLayoutId) return;

    e.preventDefault();

    for (const card of getLayoutCards()) {
      card.classList.toggle("dragOver", card === targetCard);
    }

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  });

  homeLayoutCards.addEventListener("drop", (e) => {
    if (!isLayoutEditEnabled() || !draggedLayoutId) return;

    const targetCard = e.target.closest(".homeLayoutCard");
    const targetId = targetCard?.dataset.layoutId;
    if (!targetId || targetId === draggedLayoutId) {
      clearLayoutDragState();
      return;
    }

    e.preventDefault();

    const order = getCurrentLayoutOrder();
    const fromIndex = order.indexOf(draggedLayoutId);
    const toIndex = order.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) {
      clearLayoutDragState();
      return;
    }

    const [moved] = order.splice(fromIndex, 1);
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    order.splice(insertIndex, 0, moved);

    const savedOrder = saveLayoutOrder(order);
    applyLayoutOrder(savedOrder);
    clearLayoutDragState();
  });

  homeLayoutCards.addEventListener("dragend", () => {
    clearLayoutDragState();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY_HOME_LAYOUT_ORDER) {
      const synced = loadLayoutOrder();
      applyLayoutOrder(synced);
      return;
    }

    if (e.key === STORAGE_KEY_HOME_LAYOUT_EDIT_MODE) {
      setLayoutEditUi(isLayoutEditEnabled());
    }
  });
}

function sanitizeCartText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function normalizeCartUrl(text) {
  const value = sanitizeCartText(text);
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z]+:\/\//i.test(value)) return "";

  return `https://${value}`;
}

function normalizeCartText(text) {
  return normalizeCartUrl(text).toLocaleLowerCase("de-DE");
}

function prettyCartLabel(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `${parsed.hostname}${path}`.slice(0, 96);
  } catch {
    return url.slice(0, 96);
  }
}

function isDuplicateCartText(text) {
  const normalizedText = normalizeCartText(text);
  if (!normalizedText) return false;

  return homeCartItems.some((item) => normalizeCartText(item.url || item.text) === normalizedText);
}

function sortHomeCartItems(items) {
  return [...items].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

function setHomeCartMessage(text, type = "") {
  if (!homeCartMessage) return;

  homeCartMessage.textContent = text || "";
  homeCartMessage.classList.remove("isWarn", "isSuccess");
  if (type === "warn") homeCartMessage.classList.add("isWarn");
  if (type === "success") homeCartMessage.classList.add("isSuccess");
}

function clearHomeCartMessage() {
  setHomeCartMessage("");
}

function normalizeHomeCart(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item.id === "string")
    .map((item) => ({
      id: item.id,
      url: normalizeCartUrl(item.url || item.text),
      createdAt: Number(item.createdAt) || Date.now()
    }))
    .filter((item) => item.url.length > 0)
    .slice(-120);
}

function loadHomeCart() {
  const raw = localStorage.getItem(STORAGE_KEY_HOME_CART);
  if (!raw) return [];

  try {
    return normalizeHomeCart(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveHomeCart(items) {
  const normalized = normalizeHomeCart(items);
  localStorage.setItem(STORAGE_KEY_HOME_CART, JSON.stringify(normalized));
  return normalized;
}

function updateHomeCartCount() {
  const total = homeCartItems.length;

  if (homeCartCount) {
    homeCartCount.textContent = `${total} Links`;
  }

  if (homeCartLauncherCount) {
    homeCartLauncherCount.textContent = String(total);
  }
}

function closeHomeCartDock() {
  if (!homeCartDock) return;
  homeCartDock.classList.add("hidden");
}

function toggleHomeCartDock() {
  if (!homeCartDock) return;
  homeCartDock.classList.toggle("hidden");
  if (!homeCartDock.classList.contains("hidden")) {
    homeCartInput?.focus();
  }
}

function openHomeCartLink(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function removeHomeCartItem(id) {
  homeCartItems = saveHomeCart(homeCartItems.filter((item) => item.id !== id));
  renderHomeCart();
}

function clearAllHomeCartItems() {
  homeCartItems = saveHomeCart([]);
  renderHomeCart();
}

function renderHomeCart() {
  if (!homeCartList) return;

  homeCartList.innerHTML = "";

  if (homeCartItems.length === 0) {
    const empty = document.createElement("li");
    empty.className = "homeShopEmpty small";
    empty.textContent = "Noch keine Links gespeichert.";
    homeCartList.appendChild(empty);
    updateHomeCartCount();
    return;
  }

  const sortedItems = sortHomeCartItems(homeCartItems);
  for (const item of sortedItems) {
    const row = document.createElement("li");
    row.className = "homeShopItem homeShopItemLink";

    const link = document.createElement("a");
    link.className = "homeShopLink";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.id = item.id;
    link.textContent = prettyCartLabel(item.url);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "homeShopDelete";
    remove.dataset.id = item.id;
    remove.textContent = "x";
    remove.setAttribute("aria-label", `${item.url} entfernen`);

    row.appendChild(link);
    row.appendChild(remove);
    homeCartList.appendChild(row);
  }

  updateHomeCartCount();
}

function addHomeCartItem(text) {
  const normalizedUrl = normalizeCartUrl(text);
  if (!normalizedUrl) {
    setHomeCartMessage("Bitte gueltigen Link eingeben.", "warn");
    return false;
  }

  if (isDuplicateCartText(normalizedUrl)) {
    setHomeCartMessage("Link existiert bereits.", "warn");
    return false;
  }

  homeCartItems = saveHomeCart([
    ...homeCartItems,
    {
      id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: normalizedUrl,
      createdAt: Date.now()
    }
  ]);

  clearHomeCartMessage();
  renderHomeCart();
  return true;
}

function initHomeCart() {
  if (!homeCartList || !homeCartForm || !homeCartInput) return;

  homeCartItems = loadHomeCart();
  clearHomeCartMessage();
  renderHomeCart();

  homeCartForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const added = addHomeCartItem(homeCartInput.value);
    if (added) homeCartInput.value = "";
    homeCartInput.focus();
  });

  homeCartList.addEventListener("click", (e) => {
    const remove = e.target.closest(".homeShopDelete");
    if (remove?.dataset.id) {
      removeHomeCartItem(remove.dataset.id);
      return;
    }

    const link = e.target.closest(".homeShopLink");
    if (link?.href) {
      e.preventDefault();
      openHomeCartLink(link.href);
    }
  });

  homeCartClearBought?.addEventListener("click", () => {
    clearAllHomeCartItems();
  });

  homeCartLauncher?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleHomeCartDock();
  });

  homeCartDock?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    closeHomeCartDock();
  });
}
function renderEmbedWidget(containerEl, scriptSrc, config) {
  if (!containerEl) return;
  containerEl.innerHTML = "<div class='tradingview-widget-container__widget'></div>";

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = scriptSrc;
  script.async = true;
  script.text = JSON.stringify(config);
  containerEl.appendChild(script);

  setTimeout(() => {
    const hasWidgetContent = !!containerEl.querySelector("iframe, .tv-feed-widget, .tv-timeline-widget");
    if (!hasWidgetContent) {
      containerEl.innerHTML = "<div class='homeNewsFallback small'>Feed konnte nicht geladen werden. Bitte Werbeblocker/Tracking-Schutz pruefen.</div>";
    }
  }, 3500);
}

function renderLiveFeeds() {
  renderEmbedWidget(
    homeNewsFeed,
    "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js",
    {
      feedMode: "all_symbols",
      isTransparent: true,
      displayMode: "adaptive",
      width: "100%",
      height: "100%",
      colorTheme: currentThemeName(),
      locale: "de"
    }
  );

  renderEmbedWidget(
    homeEcoNewsFeed,
    "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js",
    {
      feedMode: "symbol",
      symbol: "TVC:DAX",
      isTransparent: true,
      displayMode: "adaptive",
      width: "100%",
      height: "100%",
      colorTheme: currentThemeName(),
      locale: "de"
    }
  );
}

function renderNewsPlaceholders() {
  const skeleton = "<div class='homeNewsSkeleton' aria-hidden='true'><span></span><span></span><span></span><span></span></div>";
  if (homeNewsFeed) homeNewsFeed.innerHTML = skeleton;
  if (homeEcoNewsFeed) homeEcoNewsFeed.innerHTML = skeleton;
}

function loadLiveFeedsOnce() {
  if (liveFeedsLoaded) return;
  liveFeedsLoaded = true;
  renderLiveFeeds();
}

function initDeferredLiveFeeds() {
  if (!homeNewsRail) {
    loadLiveFeedsOnce();
    return;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadLiveFeedsOnce();
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: "300px 0px",
        threshold: 0.01
      }
    );

    observer.observe(homeNewsRail);
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      loadLiveFeedsOnce();
    }, { timeout: 1500 });
    return;
  }

  setTimeout(() => {
    loadLiveFeedsOnce();
  }, 1200);
}

function openAppLinkWithFallback(appUrl, webUrl) {
  const safeAppUrl = String(appUrl || "").trim();
  const safeWebUrl = String(webUrl || "").trim();
  if (!safeAppUrl || !safeWebUrl) return;

  const fallbackDelayMs = 2500;
  const probeFrameRemoveDelayMs = 1800;
  const cleanupDelayMs = 5000;
  let hidden = false;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") hidden = true;
  };

  const onPageHide = () => {
    hidden = true;
  };

  document.addEventListener("visibilitychange", onVisibilityChange, true);
  window.addEventListener("pagehide", onPageHide, true);

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange, true);
    window.removeEventListener("pagehide", onPageHide, true);
  };

  const openWebFallbackInNewTab = () => {
    const popup = window.open(safeWebUrl, "_blank", "noopener,noreferrer");
    if (popup) popup.opener = null;
  };

  const timer = setTimeout(() => {
    cleanup();
    if (!hidden) {
      openWebFallbackInNewTab();
    }
  }, fallbackDelayMs);

  const probeFrame = document.createElement("iframe");
  probeFrame.style.display = "none";
  probeFrame.src = safeAppUrl;
  document.body.appendChild(probeFrame);

  setTimeout(() => {
    probeFrame.remove();
  }, probeFrameRemoveDelayMs);

  setTimeout(() => {
    clearTimeout(timer);
    cleanup();
  }, cleanupDelayMs);
}

function initStreamDeepLinks() {
  if (!homeStreamDeepLinks.length) return;

  for (const link of homeStreamDeepLinks) {
    link.addEventListener("click", (e) => {
      const appUrl = link.dataset.appUrl;
      const webUrl = link.dataset.webUrl || link.href;
      if (!appUrl || !webUrl) return;

      e.preventDefault();
      openAppLinkWithFallback(appUrl, webUrl);
    });
  }
}

function setWeatherState(text) {
  if (homeWeatherState) homeWeatherState.textContent = text;
}

function updateAnalogClock() {
  if (!homeClockHour || !homeClockMinute || !homeClockSecond) return;

  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const hourDeg = hours * 30;
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;

  homeClockHour.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
  homeClockMinute.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
  homeClockSecond.style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;
}

function weatherLabel(code) {
  const map = {
    0: "Klar",
    1: "Ueberwiegend klar",
    2: "Teilweise bewoelkt",
    3: "Bedeckt",
    45: "Nebel",
    48: "Reifnebel",
    51: "Leichter Niesel",
    53: "Niesel",
    55: "Starker Niesel",
    61: "Leichter Regen",
    63: "Regen",
    65: "Starker Regen",
    71: "Leichter Schnee",
    73: "Schnee",
    75: "Starker Schnee",
    80: "Leichte Schauer",
    81: "Schauer",
    82: "Starke Schauer",
    95: "Gewitter",
    96: "Gewitter mit Hagel",
    99: "Starkes Gewitter"
  };

  return map[code] || "Unbekannt";
}

function updateWeatherUi(data, locationName) {
  const current = data?.current;
  const daily = data?.daily;

  if (!current || !daily) {
    setWeatherState("Fehler");
    return;
  }

  if (homeWeatherLocation) homeWeatherLocation.textContent = locationName;
  if (homeWeatherTemp) homeWeatherTemp.textContent = `${Math.round(current.temperature_2m)} C`;
  if (homeWeatherDesc) homeWeatherDesc.textContent = weatherLabel(current.weather_code);
  if (homeWeatherFeels) homeWeatherFeels.textContent = `Gefuehlt: ${Math.round(current.apparent_temperature)} C`;
  if (homeWeatherWind) homeWeatherWind.textContent = `Wind: ${Math.round(current.wind_speed_10m)} km/h`;

  const max = daily.temperature_2m_max?.[0];
  const min = daily.temperature_2m_min?.[0];
  if (homeWeatherRange && Number.isFinite(max) && Number.isFinite(min)) {
    homeWeatherRange.textContent = `Heute: ${Math.round(min)} C / ${Math.round(max)} C`;
  }

  setWeatherState("Live");
}

async function fetchWeather(lat, lon, locationName) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Wetter konnte nicht geladen werden (${response.status}).`);
  }

  const data = await response.json();
  updateWeatherUi(data, locationName);
}

async function refreshWeather() {
  const fallback = { lat: 52.52, lon: 13.41, name: "Berlin (Fallback)" };

  try {
    if (weatherCoords) {
      await fetchWeather(weatherCoords.lat, weatherCoords.lon, weatherCoords.name);
      return;
    }

    if (!navigator.geolocation) {
      await fetchWeather(fallback.lat, fallback.lon, fallback.name);
      return;
    }

    setWeatherState("Standort...");

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 300000
      });
    });

    weatherCoords = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      name: "Dein Standort"
    };

    await fetchWeather(weatherCoords.lat, weatherCoords.lon, weatherCoords.name);
  } catch {
    weatherCoords = { lat: fallback.lat, lon: fallback.lon, name: fallback.name };
    try {
      await fetchWeather(fallback.lat, fallback.lon, fallback.name);
    } catch {
      setWeatherState("Offline");
      if (homeWeatherLocation) homeWeatherLocation.textContent = "Wetter nicht verfuegbar";
      if (homeWeatherTemp) homeWeatherTemp.textContent = "-- C";
      if (homeWeatherDesc) homeWeatherDesc.textContent = "-";
      if (homeWeatherFeels) homeWeatherFeels.textContent = "Gefuehlt: -";
      if (homeWeatherWind) homeWeatherWind.textContent = "Wind: -";
      if (homeWeatherRange) homeWeatherRange.textContent = "Heute: -";
    }
  }
}

initLayoutEditor();
updateDateLine();
updateTodoSummary();
renderNewsPlaceholders();
initDeferredLiveFeeds();
initStreamDeepLinks();
refreshWeather();
updateAnalogClock();
initHomeCart();

setInterval(() => {
  updateDateLine();
  updateTodoSummary();
}, 60_000);

setInterval(() => {
  refreshWeather();
}, 10 * 60_000);

setInterval(() => {
  updateAnalogClock();
}, 1000);

