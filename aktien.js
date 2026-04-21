const STORAGE_KEY_THEME = "theme";
const STORAGE_KEY_TV_SYMBOL = "tv_symbol_v1";
const STORAGE_KEY_TV_QUICK_SYMBOLS = "tv_quick_symbols_v1";

const TV_DEFAULT_SYMBOL = "NASDAQ:AAPL";
const TV_DEFAULT_QUICK_SYMBOLS = [
  "NASDAQ:AAPL",
  "NASDAQ:MSFT",
  "NASDAQ:NVDA",
  "NASDAQ:TSLA",
  "XETR:SAP"
];

const themeToggle = document.getElementById("themeToggle");
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
const backdrop = document.getElementById("backdrop");

const tvSymbolInput = document.getElementById("tvSymbolInput");
const tvSymbolApply = document.getElementById("tvSymbolApply");
const tvCurrentSymbol = document.getElementById("tvCurrentSymbol");
const tvChartContainer = document.getElementById("tvChartContainer");
const stocksQuickSymbols = document.getElementById("stocksQuickSymbols");
const tvQuickAdd = document.getElementById("tvQuickAdd");
const tvQuickReset = document.getElementById("tvQuickReset");

const tvTickerTape = document.getElementById("tvTickerTape");
const tvMarketOverview = document.getElementById("tvMarketOverview");
const tvEconomicCalendar = document.getElementById("tvEconomicCalendar");

let tvWidgetScriptPromise = null;
let tvCurrentSelection = null;
let quickSymbols = [];

function normalizeTvSymbol(raw) {
  const symbol = String(raw ?? "").trim().toUpperCase();
  return symbol || TV_DEFAULT_SYMBOL;
}

function shortSymbolLabel(symbol) {
  const normalized = normalizeTvSymbol(symbol);
  const parts = normalized.split(":");
  return parts.length > 1 ? parts[1] : normalized;
}

function loadQuickSymbols() {
  const raw = localStorage.getItem(STORAGE_KEY_TV_QUICK_SYMBOLS);
  if (!raw) return [...TV_DEFAULT_QUICK_SYMBOLS];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...TV_DEFAULT_QUICK_SYMBOLS];

    const cleaned = parsed
      .map((v) => normalizeTvSymbol(v))
      .filter((v, idx, arr) => arr.indexOf(v) === idx);

    return cleaned;
  } catch {
    return [...TV_DEFAULT_QUICK_SYMBOLS];
  }
}

function saveQuickSymbols() {
  localStorage.setItem(STORAGE_KEY_TV_QUICK_SYMBOLS, JSON.stringify(quickSymbols));
}

function renderQuickSymbols() {
  if (!stocksQuickSymbols) return;

  stocksQuickSymbols.innerHTML = "";

  if (quickSymbols.length === 0) {
    const empty = document.createElement("div");
    empty.className = "small stocksQuickEmpty";
    empty.textContent = "Keine Schnellauswahl. Symbol eingeben und hinzufuegen.";
    stocksQuickSymbols.appendChild(empty);
    return;
  }

  for (const symbol of quickSymbols) {
    const item = document.createElement("div");
    item.className = "stocksQuickItem";

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = "stocksSymbolBtn";
    selectBtn.dataset.symbol = symbol;
    selectBtn.textContent = shortSymbolLabel(symbol);
    selectBtn.title = symbol;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "stocksSymbolRemove";
    removeBtn.dataset.symbol = symbol;
    removeBtn.setAttribute("aria-label", `${symbol} aus Schnellauswahl entfernen`);
    removeBtn.textContent = "x";

    item.appendChild(selectBtn);
    item.appendChild(removeBtn);
    stocksQuickSymbols.appendChild(item);
  }

  if (tvCurrentSelection) {
    setTvSymbolUi(tvCurrentSelection);
  }
}

function addQuickSymbol(rawSymbol) {
  const symbol = normalizeTvSymbol(rawSymbol);
  if (quickSymbols.includes(symbol)) return;
  quickSymbols.push(symbol);
  saveQuickSymbols();
  renderQuickSymbols();
}

function removeQuickSymbol(rawSymbol) {
  const symbol = normalizeTvSymbol(rawSymbol);
  quickSymbols = quickSymbols.filter((s) => s !== symbol);
  saveQuickSymbols();
  renderQuickSymbols();
}

function resetQuickSymbols() {
  quickSymbols = [...TV_DEFAULT_QUICK_SYMBOLS];
  saveQuickSymbols();
  renderQuickSymbols();
}

function currentThemeName() {
  return document.body.classList.contains("light") ? "light" : "dark";
}

function applyThemeFromStorage() {
  const isLight = localStorage.getItem(STORAGE_KEY_THEME) === "light";
  document.body.classList.toggle("light", isLight);
  if (themeToggle) themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
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

function loadTradingViewScript() {
  if (window.TradingView?.widget) return Promise.resolve();
  if (tvWidgetScriptPromise) return tvWidgetScriptPromise;

  tvWidgetScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TradingView chart script failed to load"));
    document.head.appendChild(script);
  });

  return tvWidgetScriptPromise;
}

function setTvSymbolUi(symbol) {
  if (tvCurrentSymbol) tvCurrentSymbol.textContent = symbol;
  if (tvSymbolInput) tvSymbolInput.value = symbol;

  document.querySelectorAll(".stocksSymbolBtn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.symbol === symbol);
  });
}

async function renderTradingViewChart(symbol) {
  if (!tvChartContainer) return;

  tvCurrentSelection = normalizeTvSymbol(symbol);
  setTvSymbolUi(tvCurrentSelection);
  localStorage.setItem(STORAGE_KEY_TV_SYMBOL, tvCurrentSelection);
  tvChartContainer.innerHTML = "";

  try {
    await loadTradingViewScript();
    if (!window.TradingView?.widget) return;

    new window.TradingView.widget({
      container_id: "tvChartContainer",
      autosize: true,
      symbol: tvCurrentSelection,
      interval: "D",
      timezone: "Europe/Berlin",
      theme: currentThemeName(),
      style: "1",
      locale: "de_DE",
      allow_symbol_change: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
      studies: [],
      save_image: false
    });
  } catch {
    tvChartContainer.textContent = "Chart konnte nicht geladen werden.";
  }
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
}

function renderTickerTape() {
  renderEmbedWidget(
    tvTickerTape,
    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    {
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
        { proName: "TVC:DAX", title: "DAX" },
        { proName: "NASDAQ:AAPL", title: "Apple" },
        { proName: "NASDAQ:NVDA", title: "NVIDIA" },
        { proName: "BINANCE:BTCUSDT", title: "Bitcoin" }
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: currentThemeName(),
      locale: "de"
    }
  );
}

function renderMarketOverview() {
  renderEmbedWidget(
    tvMarketOverview,
    "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
    {
      colorTheme: currentThemeName(),
      dateRange: "12M",
      showChart: true,
      locale: "de",
      width: "100%",
      height: "100%",
      isTransparent: true,
      showSymbolLogo: true,
      tabs: [
        {
          title: "Indizes",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
            { s: "TVC:DAX", d: "DAX" },
            { s: "TVC:UKX", d: "FTSE 100" }
          ]
        },
        {
          title: "Aktien",
          symbols: [
            { s: "NASDAQ:AAPL", d: "Apple" },
            { s: "NASDAQ:MSFT", d: "Microsoft" },
            { s: "NASDAQ:NVDA", d: "NVIDIA" },
            { s: "NASDAQ:AMZN", d: "Amazon" }
          ]
        },
        {
          title: "Forex",
          symbols: [
            { s: "FX:EURUSD", d: "EUR/USD" },
            { s: "FX:USDJPY", d: "USD/JPY" },
            { s: "FX:GBPUSD", d: "GBP/USD" },
            { s: "FX:USDCHF", d: "USD/CHF" }
          ]
        },
        {
          title: "Krypto",
          symbols: [
            { s: "BINANCE:BTCUSDT", d: "BTC/USDT" },
            { s: "BINANCE:ETHUSDT", d: "ETH/USDT" },
            { s: "BINANCE:SOLUSDT", d: "SOL/USDT" },
            { s: "BINANCE:XRPUSDT", d: "XRP/USDT" }
          ]
        }
      ]
    }
  );
}

function renderEconomicCalendar() {
  renderEmbedWidget(
    tvEconomicCalendar,
    "https://s3.tradingview.com/external-embedding/embed-widget-events.js",
    {
      colorTheme: currentThemeName(),
      isTransparent: true,
      width: "100%",
      height: "100%",
      locale: "de",
      importanceFilter: "-1,0,1"
    }
  );
}

function renderFinanceWidgets() {
  renderTickerTape();
  renderMarketOverview();
  renderEconomicCalendar();
}

function initInteractions() {
  tvSymbolApply?.addEventListener("click", () => {
    renderTradingViewChart(tvSymbolInput?.value);
  });

  tvSymbolInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      renderTradingViewChart(tvSymbolInput.value);
    }
  });

  tvQuickAdd?.addEventListener("click", () => {
    addQuickSymbol(tvSymbolInput?.value || tvCurrentSelection);
  });

  tvQuickReset?.addEventListener("click", () => {
    resetQuickSymbols();
  });

  stocksQuickSymbols?.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".stocksSymbolRemove");
    if (removeBtn?.dataset.symbol) {
      removeQuickSymbol(removeBtn.dataset.symbol);
      return;
    }

    const selectBtn = e.target.closest(".stocksSymbolBtn");
    if (selectBtn?.dataset.symbol) {
      renderTradingViewChart(selectBtn.dataset.symbol);
    }
  });
}

applyThemeFromStorage();
initSettingsMenu();
quickSymbols = loadQuickSymbols();
renderQuickSymbols();
initInteractions();

const startSymbol = normalizeTvSymbol(localStorage.getItem(STORAGE_KEY_TV_SYMBOL) || TV_DEFAULT_SYMBOL);
renderTradingViewChart(startSymbol);
renderFinanceWidgets();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem(STORAGE_KEY_THEME, isLight ? "light" : "dark");
    themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";

    renderTradingViewChart(tvCurrentSelection || startSymbol);
    renderFinanceWidgets();
    closeSettingsMenu();
  });
}
