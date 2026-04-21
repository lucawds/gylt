const SC_STORAGE_HIGH = "survival_craft_high_nights_v1";
const SC_WIDTH = 960;
const SC_HEIGHT = 560;
const SC_DAY_SECONDS = 45;
const SC_NIGHT_SECONDS = 35;

const scCanvas = document.getElementById("scCanvas");
const scCtx = scCanvas?.getContext("2d");

const scStartBtn = document.getElementById("scStartBtn");
const scPauseBtn = document.getElementById("scPauseBtn");
const scRestartBtn = document.getElementById("scRestartBtn");

const scHpEl = document.getElementById("scHp");
const scWoodEl = document.getElementById("scWood");
const scStoneEl = document.getElementById("scStone");
const scNightEl = document.getElementById("scNight");
const scHighEl = document.getElementById("scHigh");
const scStateEl = document.getElementById("scState");
const scCycleEl = document.getElementById("scCycle");

const keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

const playerFacing = {
  x: 1,
  y: 0
};

const player = {
  x: SC_WIDTH / 2,
  y: SC_HEIGHT / 2,
  radius: 13,
  speed: 230,
  hp: 100,
  attackCooldown: 0
};

let state = "ready";
let cycle = "day";
let cycleTime = SC_DAY_SECONDS;
let nightCount = 0;
let highNights = loadHighNights();
let wood = 0;
let stone = 0;
let lastTime = 0;
let gatherCooldown = 0;
let buildCooldown = 0;
let hitFlash = 0;
let message = "";
let messageTimer = 0;
let resources = [];
let barricades = [];
let enemies = [];
let swingTime = 0;
const sprites = {
  wood: null,
  rock: null,
  barricade: null
};

function loadHighNights() {
  const raw = localStorage.getItem(SC_STORAGE_HIGH);
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

function saveHighNights(value) {
  highNights = Math.max(0, Math.floor(Number(value) || 0));
  localStorage.setItem(SC_STORAGE_HIGH, String(highNights));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function setMessage(text, seconds = 2.2) {
  message = text;
  messageTimer = seconds;
}

function makeSvgSprite(svg) {
  const img = new Image();
  const encoded = window.btoa(unescape(encodeURIComponent(svg)));
  img.src = `data:image/svg+xml;base64,${encoded}`;
  return img;
}

function initSprites() {
  sprites.wood = makeSvgSprite(
    "<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'>"
    + "<rect x='6' y='11' rx='6' ry='6' width='36' height='10' fill='#8d5524' stroke='#5d3717' stroke-width='2'/>"
    + "<rect x='4' y='24' rx='6' ry='6' width='32' height='10' fill='#a56a33' stroke='#6c431c' stroke-width='2'/>"
    + "<circle cx='10' cy='16' r='3' fill='#c68b59'/><circle cx='8.5' cy='29' r='3' fill='#cf9a6e'/>"
    + "<path d='M17 15h18M14 28h16' stroke='rgba(255,255,255,.25)' stroke-width='2'/>"
    + "</svg>"
  );

  sprites.rock = makeSvgSprite(
    "<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'>"
    + "<path d='M8 30l6-11 9-4 10 3 7 10-4 10H14z' fill='#9aa3ad' stroke='#6d7780' stroke-width='2'/>"
    + "<path d='M18 26l5-4 6 1 3 5-3 5h-8z' fill='#b2bac3'/>"
    + "<path d='M13 33h20' stroke='rgba(255,255,255,.24)' stroke-width='2'/>"
    + "</svg>"
  );

  sprites.barricade = makeSvgSprite(
    "<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'>"
    + "<rect x='7' y='16' width='42' height='26' rx='6' fill='#8b5e3c' stroke='#5e3f29' stroke-width='2'/>"
    + "<path d='M15 16v26M24 16v26M33 16v26M42 16v26' stroke='#70472e' stroke-width='2'/>"
    + "<path d='M10 24h36M10 34h36' stroke='rgba(255,255,255,.22)' stroke-width='2'/>"
    + "</svg>"
  );
}

function updateHud() {
  if (scHpEl) scHpEl.textContent = String(Math.max(0, Math.round(player.hp)));
  if (scWoodEl) scWoodEl.textContent = String(wood);
  if (scStoneEl) scStoneEl.textContent = String(stone);
  if (scNightEl) scNightEl.textContent = String(nightCount);
  if (scHighEl) scHighEl.textContent = String(highNights);

  if (scStateEl) {
    if (state === "ready") scStateEl.textContent = "Bereit";
    else if (state === "running") scStateEl.textContent = cycle === "day" ? "Tag" : "Nacht";
    else if (state === "paused") scStateEl.textContent = "Pausiert";
    else scStateEl.textContent = "Game Over";
  }

  if (scCycleEl) {
    const sec = Math.max(0, Math.ceil(cycleTime));
    scCycleEl.textContent = `${cycle === "day" ? "Tag" : "Nacht"} ${sec}s`;
  }
}

function randomResource(type) {
  const margin = 35;
  return {
    type,
    x: rand(margin, SC_WIDTH - margin),
    y: rand(margin + 18, SC_HEIGHT - margin),
    radius: type === "tree" ? 14 : 12,
    hp: type === "tree" ? 4 : 5
  };
}

function spawnInitialResources() {
  resources = [];
  for (let i = 0; i < 16; i += 1) resources.push(randomResource("tree"));
  for (let i = 0; i < 12; i += 1) resources.push(randomResource("rock"));
}

function canPlaceBarricade(x, y) {
  const probe = { x, y, radius: 16 };
  if (distance(probe, player) < 34) return false;
  for (const b of barricades) {
    if (distance(probe, b) < 34) return false;
  }
  return true;
}

function buildBarricade() {
  if (buildCooldown > 0) return;
  if (wood < 8 || stone < 4) {
    setMessage("Nicht genug Ressourcen fuer Barrikade.");
    return;
  }

  const buildOffset = 56;
  const front = {
    x: clamp(player.x + playerFacing.x * buildOffset, 20, SC_WIDTH - 20),
    y: clamp(player.y + playerFacing.y * buildOffset, 20, SC_HEIGHT - 20)
  };

  if (!canPlaceBarricade(front.x, front.y)) {
    setMessage("Hier kann keine Barrikade gebaut werden.");
    return;
  }

  wood -= 8;
  stone -= 4;
  barricades.push({
    x: clamp(front.x, 20, SC_WIDTH - 20),
    y: clamp(front.y, 20, SC_HEIGHT - 20),
    radius: 16,
    hp: 45
  });
  buildCooldown = 0.35;
  setMessage("Barrikade gebaut.");
  updateHud();
}

function startNight() {
  cycle = "night";
  cycleTime = SC_NIGHT_SECONDS;
  nightCount += 1;
  const enemyCount = 4 + nightCount * 2;
  for (let i = 0; i < enemyCount; i += 1) {
    const edge = Math.floor(rand(0, 4));
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = rand(10, SC_WIDTH - 10);
      y = -12;
    } else if (edge === 1) {
      x = SC_WIDTH + 12;
      y = rand(10, SC_HEIGHT - 10);
    } else if (edge === 2) {
      x = rand(10, SC_WIDTH - 10);
      y = SC_HEIGHT + 12;
    } else {
      x = -12;
      y = rand(10, SC_HEIGHT - 10);
    }
    enemies.push({
      x,
      y,
      radius: 11,
      hp: 2 + Math.floor(nightCount / 3),
      speed: 56 + rand(0, 14) + nightCount * 1.4,
      damageCooldown: 0
    });
  }
  setMessage(`Nacht ${nightCount} hat begonnen.`);
}

function endNight() {
  cycle = "day";
  cycleTime = SC_DAY_SECONDS;
  enemies = [];
  resources.push(randomResource("tree"));
  resources.push(randomResource("rock"));
  resources.push(randomResource(Math.random() > 0.5 ? "tree" : "rock"));
  setMessage("Tagphase. Sammle und baue.");
}

function startGame() {
  player.x = SC_WIDTH / 2;
  player.y = SC_HEIGHT / 2;
  player.hp = 100;
  player.attackCooldown = 0;
  playerFacing.x = 1;
  playerFacing.y = 0;
  wood = 0;
  stone = 0;
  cycle = "day";
  cycleTime = SC_DAY_SECONDS;
  nightCount = 0;
  gatherCooldown = 0;
  buildCooldown = 0;
  hitFlash = 0;
  enemies = [];
  barricades = [];
  swingTime = 0;
  spawnInitialResources();
  state = "running";
  setMessage("Sammle Holz und Stein, baue vor der Nacht.");
  updateHud();
}

function gameOver() {
  state = "gameover";
  if (nightCount > highNights) saveHighNights(nightCount);
  setMessage("Game Over. Starte neu.");
  updateHud();
}

function togglePause() {
  if (state === "running") state = "paused";
  else if (state === "paused") state = "running";
  updateHud();
}

function gatherNearest() {
  if (state !== "running" || gatherCooldown > 0) return;
  let best = null;
  let bestDist = Infinity;
  for (const resource of resources) {
    const d = distance(player, resource);
    if (d < bestDist) {
      bestDist = d;
      best = resource;
    }
  }
  if (!best || bestDist > 44) {
    setMessage("Keine Ressource in Reichweite.");
    gatherCooldown = 0.2;
    return;
  }

  best.hp -= 1;
  gatherCooldown = 0.3;
  if (best.type === "tree") wood += 2;
  else stone += 2;

  if (best.hp <= 0) {
    const idx = resources.indexOf(best);
    if (idx >= 0) resources.splice(idx, 1);
  }

  if (resources.length < 14) {
    resources.push(randomResource(Math.random() > 0.58 ? "tree" : "rock"));
  }
  updateHud();
}

function playerAttack() {
  if (state !== "running") return;
  if (player.attackCooldown > 0) return;
  player.attackCooldown = 0.5;
  swingTime = 0.15;

  const hitRange = 52;
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (distance(player, enemy) > hitRange) continue;
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      enemies.splice(i, 1);
    }
  }
}

function updateCycle(dt) {
  cycleTime -= dt;
  if (cycleTime > 0) return;
  if (cycle === "day") startNight();
  else endNight();
  updateHud();
}

function updatePlayer(dt) {
  const moveX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const moveY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;
  const step = player.speed * dt;
  if (moveX !== 0 || moveY !== 0) {
    playerFacing.x = moveX / len;
    playerFacing.y = moveY / len;
  }
  player.x += (moveX / len) * step;
  player.y += (moveY / len) * step;
  player.x = clamp(player.x, player.radius, SC_WIDTH - player.radius);
  player.y = clamp(player.y, player.radius, SC_HEIGHT - player.radius);
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.damageCooldown = Math.max(0, enemy.damageCooldown - dt);

    let target = player;
    let targetDist = distance(enemy, player);
    let targetIsBarricade = false;

    for (const barricade of barricades) {
      const d = distance(enemy, barricade);
      if (d < targetDist) {
        target = barricade;
        targetDist = d;
        targetIsBarricade = true;
      }
    }

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / len) * enemy.speed * dt;
    enemy.y += (dy / len) * enemy.speed * dt;

    const collDist = enemy.radius + (targetIsBarricade ? target.radius : player.radius);
    if (targetDist <= collDist + 2 && enemy.damageCooldown <= 0) {
      enemy.damageCooldown = 0.65;
      if (targetIsBarricade) {
        target.hp -= 6 + Math.floor(nightCount / 2);
      } else {
        player.hp -= 8 + Math.floor(nightCount * 0.4);
        hitFlash = 0.16;
        if (player.hp <= 0) {
          player.hp = 0;
          gameOver();
          return;
        }
      }
    }
  }

  barricades = barricades.filter((b) => b.hp > 0);
}

function updateTimers(dt) {
  gatherCooldown = Math.max(0, gatherCooldown - dt);
  buildCooldown = Math.max(0, buildCooldown - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  swingTime = Math.max(0, swingTime - dt);
  hitFlash = Math.max(0, hitFlash - dt);
  messageTimer = Math.max(0, messageTimer - dt);
}

function drawBackground() {
  if (!scCtx) return;
  scCtx.clearRect(0, 0, SC_WIDTH, SC_HEIGHT);

  const isNight = cycle === "night";
  const top = isNight ? "rgba(17,24,39,0.96)" : "rgba(34,84,62,0.92)";
  const bottom = isNight ? "rgba(3,7,14,0.98)" : "rgba(6,33,22,0.98)";
  const grad = scCtx.createLinearGradient(0, 0, 0, SC_HEIGHT);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  scCtx.fillStyle = grad;
  scCtx.fillRect(0, 0, SC_WIDTH, SC_HEIGHT);
}

function drawResources() {
  if (!scCtx) return;
  for (const resource of resources) {
    const sprite = resource.type === "tree" ? sprites.wood : sprites.rock;
    if (sprite?.complete) {
      const size = resource.type === "tree" ? 36 : 34;
      scCtx.drawImage(sprite, resource.x - size / 2, resource.y - size / 2, size, size);
    } else {
      scCtx.beginPath();
      scCtx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2);
      scCtx.fillStyle = resource.type === "tree" ? "rgba(64,192,87,0.95)" : "rgba(173,181,189,0.94)";
      scCtx.fill();
    }

    scCtx.fillStyle = "rgba(0,0,0,0.45)";
    scCtx.font = "600 11px Inter, sans-serif";
    scCtx.textAlign = "center";
    scCtx.textBaseline = "middle";
    scCtx.fillText(String(resource.hp), resource.x, resource.y - 20);
  }
}

function drawBarricades() {
  if (!scCtx) return;
  for (const b of barricades) {
    if (sprites.barricade?.complete) {
      scCtx.drawImage(sprites.barricade, b.x - 20, b.y - 20, 40, 40);
    } else {
      scCtx.beginPath();
      scCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      scCtx.fillStyle = "rgba(181,131,90,0.95)";
      scCtx.fill();
      scCtx.strokeStyle = "rgba(255,255,255,0.24)";
      scCtx.stroke();
    }
  }
}

function drawEnemies() {
  if (!scCtx) return;
  for (const enemy of enemies) {
    scCtx.beginPath();
    scCtx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    scCtx.fillStyle = "rgba(239,68,68,0.95)";
    scCtx.fill();
  }
}

function drawPlayer() {
  if (!scCtx) return;
  scCtx.beginPath();
  scCtx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  scCtx.fillStyle = hitFlash > 0 ? "rgba(255,160,160,1)" : "rgba(255,255,255,0.98)";
  scCtx.fill();

  scCtx.beginPath();
  scCtx.moveTo(player.x, player.y);
  scCtx.lineTo(player.x + playerFacing.x * 20, player.y + playerFacing.y * 20);
  scCtx.strokeStyle = "rgba(250,204,21,0.9)";
  scCtx.lineWidth = 2;
  scCtx.stroke();
  scCtx.lineWidth = 1;

  if (swingTime > 0) {
    scCtx.beginPath();
    scCtx.arc(player.x, player.y, 42, 0, Math.PI * 2);
    scCtx.strokeStyle = "rgba(250,204,21,0.72)";
    scCtx.lineWidth = 3;
    scCtx.stroke();
    scCtx.lineWidth = 1;
  }
}

function drawOverlay() {
  if (!scCtx) return;

  if (state === "ready" || state === "paused" || state === "gameover") {
    scCtx.fillStyle = "rgba(0,0,0,0.42)";
    scCtx.fillRect(0, 0, SC_WIDTH, SC_HEIGHT);
    scCtx.textAlign = "center";
    scCtx.textBaseline = "middle";
    scCtx.fillStyle = "rgba(255,255,255,0.97)";
    scCtx.font = "700 42px Inter, sans-serif";

    if (state === "ready") scCtx.fillText("Survival Craft Lite", SC_WIDTH / 2, SC_HEIGHT / 2 - 12);
    else if (state === "paused") scCtx.fillText("Pausiert", SC_WIDTH / 2, SC_HEIGHT / 2 - 12);
    else scCtx.fillText("Game Over", SC_WIDTH / 2, SC_HEIGHT / 2 - 12);

    scCtx.font = "500 18px Inter, sans-serif";
    if (state === "ready") scCtx.fillText("Start klicken oder Space drücken", SC_WIDTH / 2, SC_HEIGHT / 2 + 28);
    else if (state === "paused") scCtx.fillText("Nochmal Pause oder Space zum Fortsetzen", SC_WIDTH / 2, SC_HEIGHT / 2 + 28);
    else scCtx.fillText("Space oder Neu fuer neuen Run", SC_WIDTH / 2, SC_HEIGHT / 2 + 28);
  }

  if (messageTimer > 0 && message) {
    scCtx.fillStyle = "rgba(0,0,0,0.6)";
    scCtx.fillRect(14, SC_HEIGHT - 46, 420, 30);
    scCtx.fillStyle = "rgba(255,255,255,0.95)";
    scCtx.textAlign = "left";
    scCtx.textBaseline = "middle";
    scCtx.font = "500 14px Inter, sans-serif";
    scCtx.fillText(message, 24, SC_HEIGHT - 31);
  }
}

function render() {
  drawBackground();
  drawResources();
  drawBarricades();
  drawEnemies();
  drawPlayer();
  drawOverlay();
}

function update(dt) {
  updateTimers(dt);
  if (state !== "running") return;

  updateCycle(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateHud();
}

function frame(now) {
  const rawDt = (now - lastTime) / 1000;
  const dt = clamp(rawDt || 0, 0, 0.033);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function initCanvas() {
  if (!scCanvas || !scCtx) return;
  const dpr = window.devicePixelRatio || 1;
  scCanvas.width = Math.floor(SC_WIDTH * dpr);
  scCanvas.height = Math.floor(SC_HEIGHT * dpr);
  scCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scCtx.imageSmoothingEnabled = true;
}

function handleSpace() {
  if (state === "ready" || state === "gameover") {
    startGame();
    return;
  }

  if (state === "paused") {
    state = "running";
    updateHud();
    return;
  }

  if (state === "running") {
    playerAttack();
  }
}

function initInput() {
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "ArrowUp" || key === "w") keys.up = true;
    if (e.key === "ArrowDown" || key === "s") keys.down = true;
    if (e.key === "ArrowLeft" || key === "a") keys.left = true;
    if (e.key === "ArrowRight" || key === "d") keys.right = true;

    if (e.code === "Space") {
      e.preventDefault();
      handleSpace();
    }

    if (key === "e") gatherNearest();
    if (key === "b") buildBarricade();
    if (key === "p") togglePause();
    if (key === "r") startGame();
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (e.key === "ArrowUp" || key === "w") keys.up = false;
    if (e.key === "ArrowDown" || key === "s") keys.down = false;
    if (e.key === "ArrowLeft" || key === "a") keys.left = false;
    if (e.key === "ArrowRight" || key === "d") keys.right = false;
  });
}

function initButtons() {
  scStartBtn?.addEventListener("click", () => {
    if (state === "ready" || state === "gameover") startGame();
  });

  scPauseBtn?.addEventListener("click", () => {
    togglePause();
  });

  scRestartBtn?.addEventListener("click", () => {
    startGame();
  });
}

function initGame() {
  initCanvas();
  initSprites();
  initInput();
  initButtons();
  spawnInitialResources();
  updateHud();
  render();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

initGame();
