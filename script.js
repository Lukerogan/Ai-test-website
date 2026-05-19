const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const livesEl = document.getElementById("lives");
const highScoreEl = document.getElementById("highScore");
const powerupEl = document.getElementById("powerupName");
const scoreboardList = document.getElementById("scoreboardList");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const API_ROOT = window.location.protocol.startsWith("http") ? window.location.origin : "";

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const SHIP_WIDTH = 60;
const SHIP_HEIGHT = 34;
const SHIP_SPEED = 7;
const BULLET_SPEED = 9;
const ENEMY_BULLET_SPEED = 4.5;
const INVADER_WIDTH = 40;
const INVADER_HEIGHT = 28;
const INVADER_PADDING = 18;
const TOP_PADDING = 70;
const LEFT_PADDING = 70;
const ROW_SPEED_INCREASE = 0.035;
const SCOREBOARD_KEY = "spaceInvadersScoreboard";
const HIGH_SCORE_KEY = "spaceInvadersHighScore";
const MAX_SCOREBOARD = 5;
const POWERUP_TYPES = [
  { type: "rapid", label: "Rapid Fire", duration: 900, color: "#33d6ff" },
  { type: "double", label: "Double Shot", duration: 900, color: "#7cff8f" },
  { type: "spread", label: "Spread Shot", duration: 900, color: "#ffd966" },
  { type: "slow", label: "Slow Time", duration: 600, color: "#b28bff" },
  { type: "shield", label: "Shield", duration: 900, color: "#88f0ff" },
  { type: "bonus", label: "Score Boost", duration: 0, color: "#ff8f8f" }
];

const SPRITES = {
  ship: { src: "img/player-ship.png", image: new Image(), loaded: false },
  invader: { src: "img/basic-enemy.png", image: new Image(), loaded: false },
  invaderHard: { src: "img/hard-enemy.png", image: new Image(), loaded: false },
  invaderIntermediate: { src: "img/intermidiate-enemy.png", image: new Image(), loaded: false },
  boss: { src: "img/Boss-enemy.png", image: new Image(), loaded: false },
  bullet: { src: "img/player-projectile.png", image: new Image(), loaded: false },
  enemyBullet: { src: "img/enemy-projectile.png", image: new Image(), loaded: false },
  powerup: { src: "", image: new Image(), loaded: false },
  explosion: { src: "", image: new Image(), loaded: false }
};

const NORMAL_LEVELS = [
  { rows: 3, columns: 8, speed: 0.8, fireRate: 0.004, scoreValue: 100, hardRows: 0, intermediateRows: 0 },
  { rows: 4, columns: 9, speed: 0.95, fireRate: 0.0055, scoreValue: 125, hardRows: 1, intermediateRows: 0 },
  { rows: 5, columns: 10, speed: 1.05, fireRate: 0.007, scoreValue: 150, hardRows: 1, intermediateRows: 1 },
  { rows: 5, columns: 11, speed: 1.15, fireRate: 0.0085, scoreValue: 175, hardRows: 2, intermediateRows: 1 },
  { rows: 6, columns: 12, speed: 1.25, fireRate: 0.01, scoreValue: 200, hardRows: 2, intermediateRows: 2 },
  { rows: 6, columns: 12, speed: 1.35, fireRate: 0.012, scoreValue: 225, hardRows: 3, intermediateRows: 2 },
  { rows: 7, columns: 13, speed: 1.45, fireRate: 0.014, scoreValue: 250, hardRows: 3, intermediateRows: 3 },
  { rows: 7, columns: 14, speed: 1.55, fireRate: 0.016, scoreValue: 275, hardRows: 4, intermediateRows: 3 },
  { rows: 8, columns: 15, speed: 1.65, fireRate: 0.018, scoreValue: 300, hardRows: 4, intermediateRows: 4 }
];
const BOSS_LEVELS = [
  { bossHealth: 120, speed: 0.9, fireRate: 0.01, scoreValue: 750, name: "Omega Drone", type: "boss" },
  { bossHealth: 150, speed: 1, fireRate: 0.012, scoreValue: 1000, name: "Juggernaut", type: "boss" },
  { bossHealth: 190, speed: 1.15, fireRate: 0.014, scoreValue: 1300, name: "Dreadnought", type: "boss" }
];
const TOTAL_LEVELS = NORMAL_LEVELS.length + BOSS_LEVELS.length;

function getLevelConfig(level) {
  const bossTrigger = level % 4 === 0;
  if (bossTrigger) {
    const bossIndex = Math.floor(level / 4) - 1;
    return { ...BOSS_LEVELS[bossIndex], type: "boss", level };
  }
  const normalIndex = level - 1 - Math.floor(level / 4);
  return { ...NORMAL_LEVELS[normalIndex], type: "normal", level };
}

let keys = { ArrowLeft: false, ArrowRight: false, Space: false };
let gameState = {
  score: 0,
  level: 1,
  lives: 3,
  invaders: [],
  bullets: [],
  enemyBullets: [],
  powerups: [],
  explosions: [],
  ship: null,
  boss: null,
  attackDirection: 1,
  frames: 0,
  running: false,
  gameOver: false,
  shootingCooldown: 0,
  pauseTimer: 0,
  activePowerup: null,
  completedLevel: 0,
  persistentPowerups: [],
  powerupExpires: 0,
  shipLevel: 1,
  rapidFireLevel: 0,
  doubleShotLevel: 0,
  spreadShotLevel: 0,
  slowTimeLevel: 0,
  rapidFire: false,
  doubleShot: false,
  spreadShot: false,
  shieldCharges: 0,
  shieldActive: false,
  shieldExpires: 0,
  slowTime: false,
  slowExpires: 0,
  awaitingChoice: false,
  gridPattern: null,
  gridPhase: 0
};

function loadSprite(key, src) {
  const sprite = SPRITES[key];
  if (!sprite || !src) return;
  sprite.src = src;
  sprite.loaded = false;
  sprite.image = new Image();
  sprite.image.src = src;
  sprite.image.onload = () => {
    sprite.loaded = true;
  };
  sprite.image.onerror = () => {
    sprite.loaded = false;
    console.warn(`Sprite failed to load: ${src}`);
  };
}

function drawSprite(key, x, y, width, height, fallbackFn) {
  const sprite = SPRITES[key];
  if (sprite && sprite.loaded) {
    ctx.drawImage(sprite.image, x, y, width, height);
    return;
  }
  fallbackFn();
}

function tryLoadSprites() {
  Object.entries(SPRITES).forEach(([key, sprite]) => {
    if (sprite.src && !sprite.loaded) {
      loadSprite(key, sprite.src);
    }
  });
}

// To swap sprites later, provide image paths here or load them before starting.
// Example:
// loadSprite("ship", "img/playerShip.png");
// loadSprite("invader", "img/enemyInvader.png");
// loadSprite("bullet", "img/playerBullet.png");
// loadSprite("enemyBullet", "img/enemyBullet.png");
// loadSprite("powerup", "img/powerup.png");
// loadSprite("explosion", "img/explosion.png");

function getHighScore() {
  return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
}

function getScoreboard() {
  try {
    const raw = localStorage.getItem(SCOREBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScoreboard(entries) {
  localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(entries));
}

function updateScoreboardDisplay(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  scoreboardList.innerHTML = "";
  if (list.length === 0) {
    scoreboardList.innerHTML = `<li class="scoreboard-item">No leaderboard entries yet</li>`;
    return;
  }
  list.slice(0, MAX_SCOREBOARD).forEach((entry, index) => {
    const perfect = entry.level === TOTAL_LEVELS && entry.lives === 3;
    const li = document.createElement("li");
    li.className = "scoreboard-item";
    li.innerHTML = `
      <span class="score-index">${index + 1}</span>
      <div class="score-entry">
        <div class="score-name">${entry.name ? entry.name : "Anonymous"}</div>
        <div class="score-meta">Level ${entry.level} · Lives ${entry.lives}${perfect ? " · PERFECT SCORE" : ""}</div>
      </div>
      <span class="score-value">${entry.score}</span>
    `;
    scoreboardList.appendChild(li);
  });
}

async function loadLeaderboard() {
  try {
    const response = await fetch(`${API_ROOT}/api/leaderboard?limit=${MAX_SCOREBOARD}`);
    if (!response.ok) {
      throw new Error("Cannot load leaderboard");
    }
    const data = await response.json();
    updateScoreboardDisplay(data.entries || data);
  } catch (error) {
    updateScoreboardDisplay(getScoreboard());
  }
}

function showSubmitOverlay(score, title, subtitle) {
  const completedLevel = gameState.completedLevel || gameState.level;
  const perfectText = completedLevel === TOTAL_LEVELS && gameState.lives === 3 ? "PERFECT SCORE" : `Level ${completedLevel} · Lives ${gameState.lives}`;
  overlayText.innerHTML = `
    <div class="overlay-title">${title}</div>
    <div class="overlay-subtitle">${subtitle}</div>
    <div class="overlay-score">FINAL SCORE: ${score}</div>
    <div class="overlay-meta">${perfectText}</div>
  `;

  const optionArea = document.getElementById("optionButtons");
  optionArea.innerHTML = "";
  optionArea.style.display = "flex";
  optionArea.style.flexDirection = "column";
  optionArea.style.alignItems = "center";
  optionArea.style.width = "100%";
  optionArea.style.gap = "14px";

  const overlayForm = document.createElement("div");
  overlayForm.className = "overlay-form";

  const nameInput = document.createElement("input");
  nameInput.className = "overlay-input";
  nameInput.type = "text";
  nameInput.maxLength = 20;
  nameInput.placeholder = "ENTER YOUR NAME";

  const status = document.createElement("div");
  status.className = "overlay-status";
  status.textContent = "Enter your name to submit your score.";

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn";
  submitBtn.textContent = "SUBMIT SCORE";
  submitBtn.addEventListener("click", () => submitScoreFromOverlay(score, nameInput, status, submitBtn));

  nameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      submitScoreFromOverlay(score, nameInput, status, submitBtn);
    }
  });

  const playAgainBtn = document.createElement("button");
  playAgainBtn.className = "btn";
  playAgainBtn.textContent = "PLAY AGAIN";
  playAgainBtn.addEventListener("click", () => {
    optionArea.innerHTML = "";
    hideOverlay();
    gameState.gameOver = false;
    gameState.hasStarted = false;
    gameState.running = false;
    gameState.awaitingChoice = false;
    gameState.gridPattern = null;
    showStartupScreen();
  });

  overlayForm.appendChild(nameInput);
  overlayForm.appendChild(submitBtn);
  optionArea.appendChild(overlayForm);
  optionArea.appendChild(status);
  optionArea.appendChild(playAgainBtn);

  overlay.style.display = "flex";
  startButton.style.display = "none";
}

async function submitScoreFromOverlay(score, nameInput, statusElement, submitButton) {
  const name = nameInput.value.trim().slice(0, 20);
  if (!name) {
    statusElement.textContent = "Please enter a name before submitting.";
    return;
  }

  submitButton.disabled = true;
  statusElement.textContent = "Submitting score...";
  const completedLevel = gameState.completedLevel || gameState.level;
  const finalLives = gameState.lives;

  try {
    const response = await fetch(`${API_ROOT}/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score: Math.max(0, Math.floor(score || 0)), level: completedLevel, lives: finalLives })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to submit score");
    }

    const result = await response.json();
    statusElement.textContent = `Score submitted for ${result.name}!`;
    addScoreboardEntry(score, finalLives, completedLevel, name);
    nameInput.value = "";
    await loadLeaderboard();
  } catch (error) {
    addScoreboardEntry(score, finalLives, completedLevel, name);
    statusElement.textContent = `Saved locally because leaderboard server is unavailable.`;
    updateScoreboardDisplay(getScoreboard());
  } finally {
    submitButton.disabled = false;
  }
}

function addScoreboardEntry(score, lives = 0, level = 1, name = "Anonymous") {
  const entries = getScoreboard();
  entries.push({
    name: name || "Anonymous",
    score: Math.max(0, Math.floor(score || 0)),
    level,
    lives,
    time: Date.now()
  });
  entries.sort((a, b) => b.score - a.score || a.time - b.time);
  saveScoreboard(entries.slice(0, MAX_SCOREBOARD));
  updateScoreboardDisplay(entries);
}

function storeScore(score) {
  const currentHigh = getHighScore();
  if (score > currentHigh) {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  }
}

function formatOverlayText(message) {
  return message.replace(/\n/g, "<br>");
}

function getPowerupSummary() {
  const parts = [];
  if (gameState.rapidFireLevel > 0) {
    parts.push(`Rapid Fire x${gameState.rapidFireLevel}`);
  }
  if (gameState.doubleShotLevel > 0) {
    parts.push(`Double Shot x${gameState.doubleShotLevel}`);
  }
  if (gameState.spreadShotLevel > 0) {
    parts.push(`Spread Shot x${gameState.spreadShotLevel}`);
  }
  if (gameState.slowTimeLevel > 0) {
    parts.push(`Slow Time x${gameState.slowTimeLevel}`);
  }
  if (gameState.shieldCharges > 0) {
    parts.push(`Shield x${gameState.shieldCharges}`);
  }
  if (parts.length === 0) {
    return gameState.activePowerup ? gameState.activePowerup.label : "None";
  }
  return parts.join(" · ");
}

function updateHUD() {
  scoreEl.textContent = gameState.score;
  levelEl.textContent = gameState.level;
  livesEl.textContent = gameState.lives;
  highScoreEl.textContent = getHighScore();
  powerupEl.textContent = getPowerupSummary();
}

function getSlowTimeMultiplier() {
  if (!gameState.slowTime) {
    return 1;
  }
  const level = Math.max(1, gameState.slowTimeLevel || 1);
  return Math.max(0.18, 0.45 - (level - 1) * 0.1);
}

function showOverlay(message, buttonText = "START GAME") {
  overlayText.innerHTML = formatOverlayText(message);
  overlayText.style.fontSize = "2rem";
  startButton.textContent = buttonText;
  const optionArea = document.getElementById("optionButtons");
  if (optionArea) {
    optionArea.style.display = "none";
    optionArea.innerHTML = "";
  }
  startButton.style.display = "inline-flex";
  overlay.style.display = "flex";
}

function showVictoryOverlay(score) {
  showSubmitOverlay(score, "MISSION COMPLETE", "Victory! Submit your score to the leaderboard.");
}

function hideOverlay() {
  overlay.style.display = "none";
}

function resetShip() {
  gameState.ship = {
    x: GAME_WIDTH / 2 - SHIP_WIDTH / 2,
    y: GAME_HEIGHT - SHIP_HEIGHT - 24,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT
  };
}

function createInvaders(levelConfig) {
  if (levelConfig.type === "boss") {
    return [];
  }
  const invaders = [];
  const hardRowStart = Math.max(0, levelConfig.rows - levelConfig.hardRows);
  const intermediateRowStart = Math.max(0, hardRowStart - levelConfig.intermediateRows);

  let spacing = INVADER_PADDING;
  const gridWidth = levelConfig.columns * INVADER_WIDTH + (levelConfig.columns - 1) * spacing;
  const availableWidth = GAME_WIDTH - LEFT_PADDING * 2;
  if (gridWidth > availableWidth) {
    spacing = Math.max(8, (availableWidth - levelConfig.columns * INVADER_WIDTH) / (levelConfig.columns - 1));
  }
  const totalWidth = levelConfig.columns * INVADER_WIDTH + (levelConfig.columns - 1) * spacing;
  const startX = Math.max(LEFT_PADDING, (GAME_WIDTH - totalWidth) / 2);

  for (let row = 0; row < levelConfig.rows; row++) {
    for (let col = 0; col < levelConfig.columns; col++) {
      let type = "normal";
      if (row >= hardRowStart) {
        type = "hard";
      } else if (row >= intermediateRowStart) {
        type = "intermediate";
      }
      invaders.push({
        x: startX + col * (INVADER_WIDTH + spacing),
        y: TOP_PADDING + row * (INVADER_HEIGHT + 10),
        width: INVADER_WIDTH,
        height: INVADER_HEIGHT,
        alive: true,
        row,
        type,
        health: type === "hard" ? 3 : type === "intermediate" ? 2 : 1,
        maxHealth: type === "hard" ? 3 : type === "intermediate" ? 2 : 1
      });
    }
  }
  return invaders;
}

function createBoss(levelConfig) {
  const bossWidth = 80;
  const bossHeight = 80;
  return {
    x: GAME_WIDTH / 2 - bossWidth / 2,
    y: 100,
    width: bossWidth,
    height: bossHeight,
    health: levelConfig.bossHealth,
    maxHealth: levelConfig.bossHealth,
    alive: true,
    fireCounter: 0,
    moveDirection: 1,
    attackPhase: 0,
    gridActive: false,
    gridTimer: 0
  };
}

function startLevel() {
  const levelConfig = getLevelConfig(gameState.level);
  gameState.invaders = createInvaders(levelConfig);
  gameState.boss = levelConfig.type === "boss" ? createBoss(levelConfig) : null;
  gameState.bullets = [];
  gameState.enemyBullets = [];
  gameState.explosions = [];
  gameState.attackDirection = 1;
  gameState.shootingCooldown = 0;
  gameState.pauseTimer = 0;
  updateHUD();
}

function startGame() {
  const existingGameOver = document.getElementById('mgs-game-over');
  if (existingGameOver) {
    existingGameOver.remove();
  }

  gameState.score = 0;
  gameState.level = 1;
  gameState.lives = 3;
  gameState.completedLevel = 0;
  gameState.running = true;
  gameState.gameOver = false;
  gameState.hasStarted = true;
  gameState.bullets = [];
  gameState.enemyBullets = [];
  gameState.powerups = [];
  gameState.explosions = [];
  gameState.frames = 0;
  gameState.attackDirection = 1;
  gameState.shootingCooldown = 0;
  gameState.pauseTimer = 0;
  gameState.persistentPowerups = [];
  gameState.activePowerup = null;
  gameState.powerupExpires = 0;
  gameState.shipLevel = 1;
  gameState.rapidFireLevel = 0;
  gameState.doubleShotLevel = 0;
  gameState.spreadShotLevel = 0;
  gameState.slowTimeLevel = 0;
  gameState.rapidFire = false;
  gameState.doubleShot = false;
  gameState.spreadShot = false;
  gameState.shieldActive = false;
  gameState.shieldCharges = 0;
  gameState.shieldExpires = 0;
  gameState.slowTime = false;
  gameState.slowExpires = 0;
  gameState.awaitingChoice = false;
  resetShip();
  startLevel();
  hideOverlay();
}

function hideOverlay() {
  overlay.style.display = "none";
  const optionArea = document.getElementById("optionButtons");
  if (optionArea) {
    optionArea.style.display = "none";
    optionArea.innerHTML = "";
  }
  startButton.style.display = "inline-flex";
}

function getRandomPowerupChoices(count = 2) {
  const pool = POWERUP_TYPES.filter(p => p.type !== "bonus");
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}

function activatePersistentPowerup(powerup, isReapply = false) {
  if (!isReapply) {
    gameState.persistentPowerups.push({ ...powerup, permanent: true });
  }
  gameState.activePowerup = { ...powerup, permanent: true, duration: Infinity, stacked: true };
  gameState.powerupExpires = Infinity;
  if (powerup.type === "slow") {
    gameState.slowTime = true;
    gameState.slowTimeLevel = (gameState.slowTimeLevel || 0) + 1;
  }
  if (powerup.type === "rapid") {
    gameState.rapidFireLevel = (gameState.rapidFireLevel || 0) + 1;
  }
  if (powerup.type === "double") {
    gameState.doubleShotLevel = (gameState.doubleShotLevel || 0) + 1;
  }
  if (powerup.type === "spread") {
    gameState.spreadShotLevel = (gameState.spreadShotLevel || 0) + 1;
  }
  if (powerup.type === "shield") {
    gameState.shieldCharges = (gameState.shieldCharges || 0) + 1;
    gameState.shieldActive = true;
    gameState.shieldExpires = Infinity;
  }
}

function showChoiceOverlay(message, options, callback) {
  overlayText.innerHTML = formatOverlayText(message);
  overlayText.style.fontSize = "1.8rem";
  overlayText.style.marginBottom = "32px";
  startButton.style.display = "none";
  const buttonArea = document.getElementById("optionButtons");
  buttonArea.innerHTML = "";
  buttonArea.style.display = "flex";
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      gameState.awaitingChoice = false;
      hideOverlay();
      callback(option);
    });
    buttonArea.appendChild(btn);
  });
  overlay.style.display = "flex";
  gameState.awaitingChoice = true;
}

function nextLevel() {
  gameState.level += 1;
  gameState.gridPattern = null;
  if (gameState.level > TOTAL_LEVELS) {
    gameState.completedLevel = TOTAL_LEVELS;
    storeScore(gameState.score);
    showVictoryOverlay(gameState.score);
    gameState.running = false;
    gameState.gameOver = true;
    return;
  }
  gameState.running = false;
  gameState.boss = null;
  const choices = getRandomPowerupChoices(2);
  showChoiceOverlay(`Ready for Level ${gameState.level}!\nChoose your upgrade`, choices, choice => {
    gameState.shipLevel += 1;
    activatePersistentPowerup(choice);
    startLevel();
    gameState.running = true;
  });
}

function showMGSGameOver(score) {
  showSubmitOverlay(score, "GAME OVER", "You lost this run. Submit your score and try again.");
}

function endGame() {
  gameState.completedLevel = gameState.level;
  storeScore(gameState.score);
  gameState.running = false;
  gameState.gameOver = true;
  overlay.style.display = "none";
  showMGSGameOver(gameState.score);
}


function loseLife() {
  gameState.lives -= 1;
  createExplosion(gameState.ship.x + gameState.ship.width / 2, gameState.ship.y + gameState.ship.height / 2, "#ff7a7a", 36);
  gameState.pauseTimer = 60;
  gameState.bullets = [];
  gameState.enemyBullets = [];
  gameState.gridPattern = null;
  if (gameState.boss) {
    gameState.boss.gridActive = false;
  }

  if (gameState.lives <= 0) {
    endGame();
  }
}

function fireBullet() {
  if (gameState.shootingCooldown > 0) {
    return;
  }
  const bullets = [];
  const rapidLevel = gameState.rapidFireLevel || 0;
  const doubleLevel = gameState.doubleShotLevel || 0;
  const spreadLevel = gameState.spreadShotLevel || 0;
  const hasRapid = rapidLevel > 0 || gameState.rapidFire;
  const hasDouble = doubleLevel > 0 || gameState.doubleShot;
  const hasSpread = spreadLevel > 0 || gameState.spreadShot;
  const effectiveSpread = Math.max(spreadLevel, hasSpread ? 1 : 0);
  const effectiveDouble = Math.max(doubleLevel, hasDouble ? 1 : 0);

  const offsets = new Set();
  const addOffset = offset => offsets.add(offset);

  if (hasSpread) {
    const count = 3 + (effectiveSpread - 1) * 2;
    const spreadOffset = 12;
    for (let i = 0; i < count; i++) {
      addOffset((i - Math.floor(count / 2)) * spreadOffset);
    }
  } else {
    addOffset(0);
  }

  if (hasDouble) {
    const bulletPairs = Math.max(1, 2 ** (effectiveDouble - 1));
    const spacing = 12 + effectiveDouble * 4;
    for (let i = 0; i < bulletPairs; i++) {
      addOffset(-(i + 1) * spacing);
      addOffset((i + 1) * spacing);
    }
  }

  offsets.forEach(offset => {
    bullets.push({
      x: gameState.ship.x + gameState.ship.width / 2 - 3 + offset,
      y: gameState.ship.y,
      width: 6,
      height: 14,
      speed: BULLET_SPEED
    });
  });

  bullets.forEach(bullet => gameState.bullets.push(bullet));
  const effectiveRapid = rapidLevel > 0 ? rapidLevel : (gameState.rapidFire ? 1 : 0);
  gameState.shootingCooldown = Math.max(4, 14 - effectiveRapid * 2);
}

function fireEnemyBullet(invader) {
  gameState.enemyBullets.push({
    x: invader.x + invader.width / 2 - 4,
    y: invader.y + invader.height,
    width: 8,
    height: 16,
    speed: ENEMY_BULLET_SPEED
  });
}

function createExplosion(x, y, color = "#ffcc66", count = 22) {
  for (let i = 0; i < count; i++) {
    gameState.explosions.push({
      x: x + (Math.random() * 18 - 9),
      y: y + (Math.random() * 18 - 9),
      vx: Math.random() * 3 - 1.5,
      vy: Math.random() * 3 - 1.5,
      life: 18 + Math.random() * 12,
      color,
      size: 2 + Math.random() * 3,
      alpha: 1
    });
  }
}

function spawnPowerup(x, y) {
  if (Math.random() > 0.045) {
    return;
  }
  const powerup = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  gameState.powerups.push({
    x: x + INVADER_WIDTH / 2 - 11,
    y: y + INVADER_HEIGHT,
    width: 22,
    height: 22,
    type: powerup.type,
    label: powerup.label,
    duration: powerup.duration,
    color: powerup.color,
    speed: 2.2
  });
}

function applyPowerup(item) {
  if (item.type === "bonus") {
    gameState.score += 200;
    createExplosion(item.x, item.y, "#8cf7ff", 16);
    return;
  }

  if (item.type === "slow") {
    gameState.slowTime = true;
    gameState.slowExpires = gameState.frames + item.duration;
    gameState.powerupExpires = gameState.frames + item.duration;
  }

  if (item.type === "rapid") {
    gameState.rapidFire = true;
    gameState.powerupExpires = gameState.frames + item.duration;
  }

  if (item.type === "double") {
    gameState.doubleShot = true;
    gameState.powerupExpires = gameState.frames + item.duration;
  }

  if (item.type === "spread") {
    gameState.spreadShot = true;
    gameState.powerupExpires = gameState.frames + item.duration;
  }

  if (item.type === "shield") {
    gameState.shieldCharges = (gameState.shieldCharges || 0) + 1;
    gameState.shieldActive = true;
    gameState.shieldExpires = gameState.frames + item.duration;
    gameState.powerupExpires = gameState.frames + item.duration;
  }

  gameState.activePowerup = item;
}

function updatePowerups() {
  for (let i = gameState.powerups.length - 1; i >= 0; i--) {
    const powerup = gameState.powerups[i];
    powerup.y += powerup.speed;
    if (powerup.y > GAME_HEIGHT) {
      gameState.powerups.splice(i, 1);
      continue;
    }
    if (powerup.x < gameState.ship.x + gameState.ship.width &&
        powerup.x + powerup.width > gameState.ship.x &&
        powerup.y < gameState.ship.y + gameState.ship.height &&
        powerup.y + powerup.height > gameState.ship.y) {
      applyPowerup(powerup);
      gameState.powerups.splice(i, 1);
      createExplosion(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, "#7cffc1", 12);
    }
  }
}

function updatePowerupState() {
  if (gameState.activePowerup && !gameState.activePowerup.permanent && gameState.frames >= gameState.powerupExpires) {
    if (gameState.activePowerup.type === "shield") {
      gameState.shieldActive = false;
    }
    if (gameState.activePowerup.type === "slow" && gameState.slowTimeLevel === 0) {
      gameState.slowTime = false;
    }
    if (gameState.activePowerup.type === "rapid" && gameState.rapidFireLevel === 0) {
      gameState.rapidFire = false;
    }
    if (gameState.activePowerup.type === "double" && gameState.doubleShotLevel === 0) {
      gameState.doubleShot = false;
    }
    if (gameState.activePowerup.type === "spread" && gameState.spreadShotLevel === 0) {
      gameState.spreadShot = false;
    }
    gameState.activePowerup = null;
  }
  if (gameState.shieldActive && gameState.frames >= gameState.shieldExpires) {
    gameState.shieldActive = false;
    if (gameState.activePowerup && gameState.activePowerup.type === "shield") {
      gameState.activePowerup = null;
    }
  }
  if (gameState.slowTime && gameState.frames >= gameState.slowExpires) {
    gameState.slowTime = false;
    if (gameState.activePowerup && gameState.activePowerup.type === "slow") {
      gameState.activePowerup = null;
    }
  }
}

function updateInvaders() {
  const levelConfig = getLevelConfig(gameState.level);
  if (levelConfig.type === "boss") {
    return;
  }

  const invaders = gameState.invaders.filter(invader => invader.alive);
  if (invaders.length === 0) {
    if (!gameState.boss) {
      nextLevel();
    }
    return;
  }

  let leftMost = GAME_WIDTH;
  let rightMost = 0;
  invaders.forEach(invader => {
    leftMost = Math.min(leftMost, invader.x);
    rightMost = Math.max(rightMost, invader.x + invader.width);
  });

  const normalLevelIndex = gameState.level - 1 - Math.floor(gameState.level / 4);
  const baseSpeed = levelConfig.speed + normalLevelIndex * ROW_SPEED_INCREASE;
  const maxNormalSpeed = NORMAL_LEVELS[6].speed + 6 * ROW_SPEED_INCREASE;
  const speed = Math.min(baseSpeed, maxNormalSpeed) * getSlowTimeMultiplier();
  const shouldDrop = (rightMost >= GAME_WIDTH - 16 && gameState.attackDirection > 0) || (leftMost <= 16 && gameState.attackDirection < 0);
  if (shouldDrop) {
    gameState.attackDirection *= -1;
    invaders.forEach(invader => (invader.y += INVADER_HEIGHT));
  }
  invaders.forEach(invader => {
    invader.x += speed * gameState.attackDirection;
    if (invader.y + invader.height >= gameState.ship.y) {
      endGame();
    }
  });

  if (Math.random() < levelConfig.fireRate) {
    const shooters = invaders.reduce((map, invader) => {
      const key = `${Math.round(invader.x)}`;
      if (!map[key] || map[key].row < invader.row) map[key] = invader;
      return map;
    }, {});
    const shooterArray = Object.values(shooters);
    if (shooterArray.length > 0) {
      const invader = shooterArray[Math.floor(Math.random() * shooterArray.length)];
      fireEnemyBullet(invader);
    }
  }
}

function updateBoss() {
  if (gameState.pauseTimer > 0) {
    return;
  }

  const levelConfig = getLevelConfig(gameState.level);
  
  if (!gameState.boss || levelConfig.type !== "boss") {
    return;
  }
  
  gameState.boss.fireCounter += 1;
  
  const gridCycleLength = 260;
  const gridShowDuration = 60; // roughly one second at 60 FPS
  const gridFireStart = gridShowDuration;
  const gridFireEnd = gridShowDuration + 50;
  
  const cyclePos = gameState.boss.fireCounter % gridCycleLength;
  
  if (cyclePos < gridShowDuration) {
    gameState.boss.gridActive = true;
    gameState.boss.gridTimer = cyclePos;
    
    if (!gameState.gridPattern) {
      const gridCols = 6;
      const gridRows = 4;
      const cellWidth = (GAME_WIDTH - 100) / gridCols;
      const cellHeight = 200 / gridRows;
      const pattern = [];
      
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (Math.random() < 0.55) {
            pattern.push({ row: r, col: c });
          }
        }
      }
      gameState.gridPattern = { cols: gridCols, rows: gridRows, cellWidth, cellHeight, cells: pattern };
    }
  } else if (cyclePos >= gridFireStart && cyclePos < gridFireEnd && gameState.gridPattern) {
    gameState.boss.gridActive = false;
    const pattern = gameState.gridPattern;
    
    pattern.cells.forEach(cell => {
      const x = 50 + cell.col * pattern.cellWidth + pattern.cellWidth / 2;
      const y = 250 + cell.row * pattern.cellHeight + pattern.cellHeight / 2;
      gameState.enemyBullets.push({
        x: x - 4,
        y: y,
        width: 8,
        height: 16,
        speed: ENEMY_BULLET_SPEED + 1
      });
    });
    gameState.gridPattern = null;
  } else {
    gameState.boss.gridActive = false;
  }
  
  const moveSpeed = 3.5 * getSlowTimeMultiplier();
  const leftBound = 60;
  const rightBound = GAME_WIDTH - gameState.boss.width - 60;
  
  if (!gameState.boss.moveDirection) {
    gameState.boss.moveDirection = 1;
  }
  
  gameState.boss.x += moveSpeed * gameState.boss.moveDirection;
  
  if (gameState.boss.x <= leftBound) {
    gameState.boss.moveDirection = 1;
  } else if (gameState.boss.x >= rightBound) {
    gameState.boss.moveDirection = -1;
  }
}


function detectCollisions() {
  for (let bulletIndex = gameState.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = gameState.bullets[bulletIndex];
    
    if (gameState.boss) {
      if (bullet.x < gameState.boss.x + gameState.boss.width &&
          bullet.x + bullet.width > gameState.boss.x &&
          bullet.y < gameState.boss.y + gameState.boss.height &&
          bullet.y + bullet.height > gameState.boss.y) {
        gameState.boss.health -= 1;
        gameState.bullets.splice(bulletIndex, 1);
        gameState.score += 25;
        createExplosion(bullet.x, bullet.y, "#66ffea", 12);
        
        if (gameState.boss.health <= 0) {
          gameState.boss.alive = false;
          createExplosion(gameState.boss.x + gameState.boss.width / 2, gameState.boss.y + gameState.boss.height / 2, "#ffff66", 50);
          gameState.score += 500;
          nextLevel();
        }
        break;
      }
      continue;
    }
    
    for (const invader of gameState.invaders) {
      if (!invader.alive) continue;
      if (bullet.x < invader.x + invader.width &&
          bullet.x + bullet.width > invader.x &&
          bullet.y < invader.y + invader.height &&
          bullet.y + bullet.height > invader.y) {
        invader.health -= 1;
        gameState.bullets.splice(bulletIndex, 1);
        
        if (invader.health <= 0) {
          invader.alive = false;
          const levelConfig = getLevelConfig(gameState.level);
          let baseScore = levelConfig.scoreValue;
          if (invader.type === "hard") {
            baseScore *= 2;
          } else if (invader.type === "intermediate") {
            baseScore = Math.floor(baseScore * 1.5);
          }
          gameState.score += baseScore;
          createExplosion(invader.x + invader.width / 2, invader.y + invader.height / 2, "#66ffea", 20);
        } else {
          createExplosion(invader.x + invader.width / 2, invader.y + invader.height / 2, "#ffaa66", 8);
        }
        break;
      }
    }
  }

  for (let bulletIndex = gameState.enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = gameState.enemyBullets[bulletIndex];
    if (bullet.x < gameState.ship.x + gameState.ship.width &&
        bullet.x + bullet.width > gameState.ship.x &&
        bullet.y < gameState.ship.y + gameState.ship.height &&
        bullet.y + bullet.height > gameState.ship.y) {
      gameState.enemyBullets.splice(bulletIndex, 1);
      if (gameState.shieldActive) {
        gameState.shieldActive = false;
        if (gameState.activePowerup && gameState.activePowerup.type === "shield") {
          gameState.activePowerup = null;
        }
        createExplosion(gameState.ship.x + gameState.ship.width / 2, gameState.ship.y + gameState.ship.height / 2, "#7cffc1", 24);
      } else {
        loseLife();
      }
      break;
    }
  }
}

function updateBullets() {
  for (let index = gameState.bullets.length - 1; index >= 0; index--) {
    const bullet = gameState.bullets[index];
    bullet.y -= bullet.speed;
    if (bullet.y + bullet.height < 0) {
      gameState.bullets.splice(index, 1);
    }
  }

  for (let index = gameState.enemyBullets.length - 1; index >= 0; index--) {
    const bullet = gameState.enemyBullets[index];
    const speedMultiplier = getSlowTimeMultiplier();
    bullet.y += bullet.speed * speedMultiplier;
    if (bullet.y > GAME_HEIGHT) {
      gameState.enemyBullets.splice(index, 1);
    }
  }
}

function updateExplosions() {
  for (let i = gameState.explosions.length - 1; i >= 0; i--) {
    const particle = gameState.explosions[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
    particle.alpha = particle.life / 30;
    if (particle.life <= 0) {
      gameState.explosions.splice(i, 1);
    }
  }
}

function updateShip() {
  const speed = SHIP_SPEED + (gameState.shipLevel - 1) * 0.35;
  if (keys.ArrowLeft) {
    gameState.ship.x -= speed;
  }
  if (keys.ArrowRight) {
    gameState.ship.x += speed;
  }
  gameState.ship.x = Math.max(12, Math.min(GAME_WIDTH - SHIP_WIDTH - 12, gameState.ship.x));
  if (keys.Space) {
    fireBullet();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawShip() {
  drawSprite("ship", gameState.ship.x, gameState.ship.y, gameState.ship.width, gameState.ship.height, () => {
    ctx.fillStyle = "#7afcff";
    ctx.fillRect(gameState.ship.x, gameState.ship.y, gameState.ship.width, gameState.ship.height);
  });
  if (gameState.shieldActive) {
    ctx.strokeStyle = "rgba(128, 255, 224, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gameState.ship.x + SHIP_WIDTH / 2, gameState.ship.y + SHIP_HEIGHT / 2, SHIP_WIDTH * 1.1, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawInvaders() {
  gameState.invaders.forEach(invader => {
    if (!invader.alive) return;
    let spriteKey = "invader";
    let color = "#74d8ff";
    if (invader.type === "hard") {
      spriteKey = "invaderHard";
      color = "#ff6f61";
    } else if (invader.type === "intermediate") {
      spriteKey = "invaderIntermediate";
      color = "#ffa500";
    }
    drawSprite(spriteKey, invader.x, invader.y, invader.width, invader.height, () => {
      ctx.fillStyle = color;
      ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
      ctx.fillStyle = "#001f3f";
      ctx.fillRect(invader.x + 8, invader.y + 8, invader.width - 16, 4);
    });
    
    if ((invader.type === "hard" || invader.type === "intermediate") && invader.maxHealth > 1) {
      const barWidth = invader.width - 4;
      const barHeight = 2;
      const barX = invader.x + 2;
      const barY = invader.y - 5;
      const healthPercent = invader.health / invader.maxHealth;
      
      ctx.fillStyle = "rgba(255, 100, 100, 0.5)";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = healthPercent > 0.66 ? "#00ff00" : healthPercent > 0.33 ? "#ffff00" : "#ff6f61";
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
  });
}

function drawBoss() {
  if (!gameState.boss || !gameState.boss.alive) return;
  
  drawSprite("boss", gameState.boss.x, gameState.boss.y, gameState.boss.width, gameState.boss.height, () => {
    ctx.fillStyle = "#ff6f61";
    ctx.fillRect(gameState.boss.x, gameState.boss.y, gameState.boss.width, gameState.boss.height);
    ctx.fillStyle = "#ffaa77";
    ctx.fillRect(gameState.boss.x + 10, gameState.boss.y + 10, gameState.boss.width - 20, gameState.boss.height - 20);
  });
  
  const barWidth = gameState.boss.width;
  const barHeight = 6;
  const barX = gameState.boss.x;
  const barY = gameState.boss.y - 14;
  
  ctx.fillStyle = "rgba(255, 63, 63, 0.4)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  const healthPercent = gameState.boss.health / gameState.boss.maxHealth;
  const healthColor = healthPercent > 0.5 ? "#66ff66" : healthPercent > 0.2 ? "#ffff66" : "#ff6f61";
  ctx.fillStyle = healthColor;
  ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  
  if (gameState.boss.gridActive && gameState.gridPattern) {
    const pattern = gameState.gridPattern;
    const opacity = 0.35;
    
    for (let r = 0; r < pattern.rows; r++) {
      for (let c = 0; c < pattern.cols; c++) {
        const x = 50 + c * pattern.cellWidth;
        const y = 250 + r * pattern.cellHeight;
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, pattern.cellWidth, pattern.cellHeight);
      }
    }
    
    pattern.cells.forEach(cell => {
      const x = 50 + cell.col * pattern.cellWidth + pattern.cellWidth / 2;
      const y = 250 + cell.row * pattern.cellHeight + pattern.cellHeight / 2;
      
      ctx.fillStyle = `rgba(255, 100, 100, ${opacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = `rgba(255, 200, 200, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }
}

function drawBullets() {
  gameState.bullets.forEach(bullet => {
    drawSprite("bullet", bullet.x, bullet.y, bullet.width, bullet.height, () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
  });
  gameState.enemyBullets.forEach(bullet => {
    drawSprite("enemyBullet", bullet.x, bullet.y, bullet.width, bullet.height, () => {
      ctx.save();
      ctx.translate(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
      ctx.rotate(Math.PI);
      ctx.fillStyle = "#ff6f61";
      ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
      ctx.restore();
    });
  });
}

function drawPowerups() {
  gameState.powerups.forEach(powerup => {
    drawSprite("powerup", powerup.x, powerup.y, powerup.width, powerup.height, () => {
      ctx.fillStyle = powerup.color || "#84ffe3";
      ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
      ctx.fillStyle = "#050b18";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const symbol = powerup.type === "rapid" ? "R" : powerup.type === "double" ? "D" : powerup.type === "spread" ? "S" : powerup.type === "slow" ? "T" : powerup.type === "shield" ? "H" : "+";
      ctx.fillText(symbol, powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
    });
  });
}

function drawExplosions() {
  gameState.explosions.forEach(particle => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.alpha);
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  });
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < GAME_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < GAME_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }
}

function loop() {
  if (gameState.running) {
    clearCanvas();
    drawGrid();

    if (gameState.pauseTimer > 0) {
      drawShip();
      drawInvaders();
      drawBoss();
      drawBullets();
      drawPowerups();
      drawExplosions();
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, GAME_HEIGHT / 2 - 42, GAME_WIDTH, 84);
      ctx.fillStyle = "#ffb3b3";
      ctx.font = "bold 32px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`LIFE LOST`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8);
      ctx.font = "16px Arial, sans-serif";
      ctx.fillText(`Resuming in ${Math.ceil(gameState.pauseTimer / 15)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 26);
      gameState.pauseTimer -= 1;
      if (gameState.pauseTimer === 0 && gameState.lives > 0) {
        resetShip();
        gameState.bullets = [];
        gameState.enemyBullets = [];
        gameState.powerups = [];
      }
    } else {
      updateShip();
      updateInvaders();
      updateBoss();
      updateBullets();
      updatePowerups();
      detectCollisions();
      updatePowerupState();
      updateExplosions();
      drawShip();
      drawInvaders();
      drawBoss();
      drawBullets();
      drawPowerups();
      drawExplosions();
      if (gameState.shootingCooldown > 0) {
        gameState.shootingCooldown -= 1;
      }
    }
    updateHUD();
  }
  gameState.frames += 1;
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", event => {
  if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Space") {
    keys[event.code] = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => {
  if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Space") {
    keys[event.code] = false;
    event.preventDefault();
  }
});

startButton.addEventListener("click", () => {
  if (gameState.awaitingChoice) {
    return;
  }
  if (gameState.gameOver) {
    gameState.gameOver = false;
    gameState.hasStarted = false;
    gameState.running = false;
    gameState.awaitingChoice = false;
    gameState.gridPattern = null;
    showStartupScreen();
    return;
  }

  if (!gameState.running) {
    if (!gameState.hasStarted && overlay.style.display === "flex") {
      const choices = getRandomPowerupChoices(2);
      showChoiceOverlay("CHOOSE YOUR INITIAL LOADOUT", choices, choice => {
        startGame();
        activatePersistentPowerup(choice);
        updateHUD();
      });
      return;
    }

    hideOverlay();
    gameState.running = true;
    const aliveInvaders = gameState.invaders.some(invader => invader.alive);
    if (!aliveInvaders) {
      startLevel();
    }
  }
});

function showStartupScreen() {
  const startupHTML = `
    <div style="text-align: center; margin-bottom: 40px; animation: slideDown 0.8s ease-out;">
      <div style="font-size: 3.2rem; font-weight: 900; letter-spacing: 0.15em; color: #ff0000; text-shadow: 0 0 40px rgba(255, 0, 0, 0.8), 0 0 80px rgba(255, 0, 0, 0.4); margin-bottom: 16px;">SPACE INVADERS</div>
      <div style="font-size: 1.2rem; color: #ffff00; text-shadow: 0 0 15px rgba(255, 255, 0, 0.6); letter-spacing: 0.1em;">CLASSIFIED OPERATION</div>
    </div>
    <div style="text-align: center; font-size: 1.1rem; color: #ffff00; line-height: 1.8; text-shadow: 0 0 10px rgba(255, 255, 0, 0.4); animation: fadeIn 1.2s ease-in; max-width: 600px;">
      An extraterrestrial threat has invaded Earth's atmosphere.<br><br>
      Deploy your vessel and eliminate all hostile forces.<br><br>
      Good luck, soldier.
    </div>
  `;
  overlayText.innerHTML = startupHTML;
  startButton.textContent = "BEGIN OPERATION";
  startButton.style.display = "inline-flex";
  const optionArea = document.getElementById("optionButtons");
  if (optionArea) {
    optionArea.style.display = "none";
    optionArea.innerHTML = "";
  }
  overlay.style.display = "flex";
  
  if (!document.getElementById("startup-style")) {
    const style = document.createElement("style");
    style.id = "startup-style";
    style.textContent = `
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

function initializeGame() {
  resetShip();
  loadLeaderboard();
  updateHUD();
  tryLoadSprites();
  requestAnimationFrame(loop);
  showStartupScreen();
}

initializeGame();

