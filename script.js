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

const LEVELS = [
  { rows: 3, columns: 8, speed: 0.8, fireRate: 0.004, scoreValue: 100, type: "normal", hardRows: 0, intermediateRows: 0 },
  { rows: 4, columns: 9, speed: 0.95, fireRate: 0.0055, scoreValue: 125, type: "normal", hardRows: 1, intermediateRows: 0 },
  { rows: 5, columns: 10, speed: 1.05, fireRate: 0.007, scoreValue: 150, type: "normal", hardRows: 1, intermediateRows: 1 },
  { rows: 5, columns: 11, speed: 1.15, fireRate: 0.0085, scoreValue: 175, type: "normal", hardRows: 2, intermediateRows: 1 },
  { rows: 6, columns: 12, speed: 1.25, fireRate: 0.01, scoreValue: 200, type: "normal", hardRows: 2, intermediateRows: 2 },
  { rows: 6, columns: 12, speed: 1.35, fireRate: 0.012, scoreValue: 225, type: "normal", hardRows: 3, intermediateRows: 2 },
  { rows: 7, columns: 13, speed: 1.45, fireRate: 0.014, scoreValue: 250, type: "normal", hardRows: 3, intermediateRows: 3 },
  { rows: 0, columns: 0, speed: 0.8, fireRate: 0.008, scoreValue: 500, type: "boss", bossHealth: 100 },
  { rows: 7, columns: 14, speed: 1.55, fireRate: 0.016, scoreValue: 275, type: "normal", hardRows: 4, intermediateRows: 3 },
  { rows: 0, columns: 0, speed: 0.9, fireRate: 0.01, scoreValue: 750, type: "boss", bossHealth: 120 },
  { rows: 8, columns: 15, speed: 1.65, fireRate: 0.018, scoreValue: 300, type: "normal", hardRows: 4, intermediateRows: 4 },
  { rows: 0, columns: 0, speed: 1, fireRate: 0.012, scoreValue: 1000, type: "boss", bossHealth: 150 }
];

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
  persistentPowerups: [],
  powerupExpires: 0,
  shipLevel: 1,
  rapidFire: false,
  doubleShot: false,
  spreadShot: false,
  shieldActive: false,
  shieldCharges: 0,
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

function updateScoreboardDisplay() {
  const entries = getScoreboard();
  scoreboardList.innerHTML = "";
  if (entries.length === 0) {
    scoreboardList.innerHTML = `<li class="scoreboard-item">No scores yet</li>`;
    return;
  }
  entries.slice(0, MAX_SCOREBOARD).forEach((entry, index) => {
    const li = document.createElement("li");
    li.className = "scoreboard-item";
    li.innerHTML = `<span class="score-index">${index + 1}</span><span class="score-value">${entry.score}</span>`;
    scoreboardList.appendChild(li);
  });
}

function addScoreboardEntry(score) {
  const entries = getScoreboard();
  entries.push({ score, time: Date.now() });
  entries.sort((a, b) => b.score - a.score);
  saveScoreboard(entries.slice(0, MAX_SCOREBOARD));
  updateScoreboardDisplay();
}

function storeScore(score) {
  const currentHigh = getHighScore();
  if (score > currentHigh) {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  }
  addScoreboardEntry(score);
}

function formatOverlayText(message) {
  return message.replace(/\n/g, "<br>");
}

function updateHUD() {
  scoreEl.textContent = gameState.score;
  levelEl.textContent = gameState.level;
  livesEl.textContent = gameState.lives;
  highScoreEl.textContent = getHighScore();
  powerupEl.textContent = gameState.activePowerup ? gameState.activePowerup.label : "None";
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
  const victoryHTML = `
    <div style="text-align: center; animation: pulse 0.6s ease-in-out infinite; font-size: 2.8rem; font-weight: 900; letter-spacing: 0.2em;">
      ★ MISSION COMPLETE ★
    </div>
    <div style="font-size: 2.8rem; margin: 20px 0; color: #ffff00; text-shadow: 0 0 30px rgba(255, 255, 0, 0.8), 0 0 60px rgba(255, 0, 0, 0.4); font-weight: 900; letter-spacing: 0.1em;">VICTORY</div>
    <div style="font-size: 1.3rem; margin: 16px 0; color: #ffff00; text-shadow: 0 0 15px rgba(255, 255, 0, 0.6);">The threat has been eliminated!</div>
    <div style="font-size: 1.6rem; margin: 20px 0; color: #ffff00; text-shadow: 0 0 20px rgba(255, 255, 0, 0.7); font-weight: bold;">Final Score: ${score}</div>
    <div style="font-size: 1rem; color: #ffff00; margin-top: 16px; text-shadow: 0 0 10px rgba(255, 255, 0, 0.5);">★ Added to hall of fame ★</div>
  `;
  overlayText.innerHTML = victoryHTML;
  startButton.textContent = "PLAY AGAIN";
  startButton.style.display = "inline-flex";
  overlay.style.display = "flex";
  
  if (!document.getElementById('victory-style')) {
    const style = document.createElement('style');
    style.id = 'victory-style';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); color: #ffff00; text-shadow: 0 0 30px rgba(255, 255, 0, 0.8), 0 0 60px rgba(255, 0, 0, 0.4); }
        50% { opacity: 0.6; transform: scale(1.08); color: #ff0000; text-shadow: 0 0 40px rgba(255, 0, 0, 0.8), 0 0 80px rgba(255, 0, 0, 0.5); }
      }
    `;
    document.head.appendChild(style);
  }
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

function createInvaders(levelIndex) {
  const levelConfig = LEVELS[levelIndex];
  if (levelConfig.type === "boss") {
    return [];
  }
  const invaders = [];
  const hardRowStart = Math.max(0, levelConfig.rows - levelConfig.hardRows);
  const intermediateRowStart = Math.max(0, hardRowStart - levelConfig.intermediateRows);
  
  for (let row = 0; row < levelConfig.rows; row++) {
    for (let col = 0; col < levelConfig.columns; col++) {
      let type = "normal";
      if (row >= hardRowStart) {
        type = "hard";
      } else if (row >= intermediateRowStart) {
        type = "intermediate";
      }
      invaders.push({
        x: LEFT_PADDING + col * (INVADER_WIDTH + INVADER_PADDING),
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

function createBoss(levelIndex) {
  const levelConfig = LEVELS[levelIndex];
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
  const levelIndex = Math.min(gameState.level - 1, LEVELS.length - 1);
  const levelConfig = LEVELS[levelIndex];
  gameState.invaders = createInvaders(levelIndex);
  gameState.boss = levelConfig.type === "boss" ? createBoss(levelIndex) : null;
  gameState.bullets = [];
  gameState.enemyBullets = [];
  gameState.explosions = [];
  gameState.attackDirection = 1;
  gameState.shootingCooldown = 0;
  gameState.pauseTimer = 0;
  if (gameState.persistentPowerups.length > 0) {
    gameState.persistentPowerups.forEach(pu => activatePersistentPowerup(pu));
  }
  updateHUD();
}

function startGame() {
  gameState.score = 0;
  gameState.level = 1;
  gameState.lives = 3;
  gameState.running = true;
  gameState.gameOver = false;
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

function activatePersistentPowerup(powerup) {
  gameState.persistentPowerups.push({ ...powerup, permanent: true });
  gameState.activePowerup = { ...powerup, permanent: true, duration: Infinity, stacked: true };
  gameState.powerupExpires = Infinity;
  if (powerup.type === "slow") {
    gameState.slowTime = true;
  }
  if (powerup.type === "rapid") {
    gameState.rapidFire = true;
  }
  if (powerup.type === "double") {
    gameState.doubleShot = true;
  }
  if (powerup.type === "spread") {
    gameState.spreadShot = true;
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
  if (gameState.level > LEVELS.length) {
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
  const message = "GAME OVER";
  const container = document.createElement("div");
  container.id = "mgs-game-over";
  container.style.cssText = `
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.9), rgba(20, 0, 0, 0.95));
    z-index: 9999;
    font-family: Arial, sans-serif;
  `;
  
  const textContainer = document.createElement("div");
  textContainer.style.cssText = `
    font-size: 120px;
    font-weight: 900;
    letter-spacing: 8px;
    text-align: center;
    margin-bottom: 40px;
    min-height: 150px;
    display: flex;
    align-items: center;
  `;
  
  const scoreContainer = document.createElement("div");
  scoreContainer.style.cssText = `
    font-size: 32px;
    color: #ffff00;
    letter-spacing: 2px;
    text-shadow: 0 0 20px rgba(255, 255, 0, 0.6);
  `;
  scoreContainer.textContent = `FINAL SCORE: ${score}`;
  
  const playAgainBtn = document.createElement("button");
  playAgainBtn.style.cssText = `
    margin-top: 40px;
    padding: 16px 40px;
    font-size: 20px;
    font-weight: bold;
    border: 2px solid #ff0000;
    background: rgba(0, 0, 0, 0.8);
    color: #ff0000;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s;
  `;
  playAgainBtn.textContent = "TRY AGAIN";
  playAgainBtn.onmouseover = () => {
    playAgainBtn.style.background = "#ff0000";
    playAgainBtn.style.color = "#000000";
  };
  playAgainBtn.onmouseout = () => {
    playAgainBtn.style.background = "rgba(0, 0, 0, 0.8)";
    playAgainBtn.style.color = "#ff0000";
  };
  playAgainBtn.onclick = () => {
    container.remove();
    startGame();
  };
  
  container.appendChild(textContainer);
  container.appendChild(scoreContainer);
  container.appendChild(playAgainBtn);
  document.body.appendChild(container);
  
  let charIndex = 0;
  const chars = message.split("");
  const dropInterval = setInterval(() => {
    if (charIndex < chars.length) {
      const char = document.createElement("span");
      char.textContent = chars[charIndex];
      char.style.cssText = `
        display: inline-block;
        color: #ff0000;
        text-shadow: 0 0 30px rgba(255, 0, 0, 0.8), 0 0 60px rgba(255, 0, 0, 0.4);
        animation: mgsLetterDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin: 0 2px;
      `;
      textContainer.appendChild(char);
      charIndex++;
    } else {
      clearInterval(dropInterval);
    }
  }, 80);
  
  if (!document.getElementById("mgs-animation-style")) {
    const style = document.createElement("style");
    style.id = "mgs-animation-style";
    style.textContent = `
      @keyframes mgsLetterDrop {
        0% {
          opacity: 0;
          transform: translateY(-100px) scale(1.2);
          filter: blur(8px);
        }
        50% {
          opacity: 1;
          transform: translateY(10px) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function endGame() {
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
  if (gameState.doubleShot) {
    bullets.push({ x: gameState.ship.x + 8, y: gameState.ship.y, width: 6, height: 14, speed: BULLET_SPEED });
    bullets.push({ x: gameState.ship.x + gameState.ship.width - 14, y: gameState.ship.y, width: 6, height: 14, speed: BULLET_SPEED });
  } else if (gameState.spreadShot) {
    bullets.push({ x: gameState.ship.x + gameState.ship.width / 2 - 3, y: gameState.ship.y, width: 6, height: 14, speed: BULLET_SPEED });
    bullets.push({ x: gameState.ship.x + 3, y: gameState.ship.y, width: 6, height: 14, speed: BULLET_SPEED });
    bullets.push({ x: gameState.ship.x + gameState.ship.width - 9, y: gameState.ship.y, width: 6, height: 14, speed: BULLET_SPEED });
  } else {
    bullets.push({ x: gameState.ship.x + gameState.ship.width / 2 - 3, y: gameState.ship.y, width: 6, height: 14, speed: BULLET_SPEED });
  }
  bullets.forEach(bullet => gameState.bullets.push(bullet));
  gameState.shootingCooldown = gameState.rapidFire ? 6 : 14;
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

  if (gameState.activePowerup && gameState.activePowerup.type === "slow" && item.type !== "slow") {
    gameState.slowTime = false;
  }

  gameState.activePowerup = item;
  gameState.powerupExpires = gameState.frames + item.duration;

  if (item.type === "shield") {
    gameState.shieldActive = true;
    gameState.shieldExpires = gameState.powerupExpires;
  }

  if (item.type === "slow") {
    gameState.slowTime = true;
    gameState.slowExpires = gameState.powerupExpires;
  }
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
    if (gameState.activePowerup.type === "slow") {
      gameState.slowTime = false;
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
  const levelIndex = Math.min(gameState.level - 1, LEVELS.length - 1);
  const levelConfig = LEVELS[levelIndex];
  
  if (levelConfig.type === "boss") {
    return;
  }
  
  const invaders = gameState.invaders.filter(invader => invader.alive);
  if (invaders.length === 0) {
    nextLevel();
    return;
  }
  let leftMost = GAME_WIDTH;
  let rightMost = 0;
  invaders.forEach(invader => {
    leftMost = Math.min(leftMost, invader.x);
    rightMost = Math.max(rightMost, invader.x + invader.width);
  });
  const speed = (levelConfig.speed + levelIndex * ROW_SPEED_INCREASE) * (gameState.slowTime ? 0.55 : 1);
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

  const levelIndex = Math.min(gameState.level - 1, LEVELS.length - 1);
  const levelConfig = LEVELS[levelIndex];
  
  if (!gameState.boss || levelConfig.type !== "boss") {
    return;
  }
  
  gameState.boss.fireCounter += 1;
  
  const gridCycleLength = 260;
  const gridShowDuration = 70;
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
  
  const moveSpeed = (gameState.slowTime ? 2.2 : 3.5);
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
          const levelIndex = Math.min(gameState.level - 1, LEVELS.length - 1);
          let baseScore = LEVELS[levelIndex].scoreValue;
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
    const speedMultiplier = gameState.slowTime ? 0.55 : 1;
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
    const opacity = Math.max(0, 1 - gameState.boss.gridTimer / 15);
    
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
    startGame();
    return;
  }

  if (!gameState.running) {
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
  updateScoreboardDisplay();
  updateHUD();
  tryLoadSprites();
  requestAnimationFrame(loop);
  showStartupScreen();
}

initializeGame();

startButton.addEventListener("click", function handleStartButtonClick() {
  if (!gameState.running && !gameState.awaitingChoice && gameState.gameOver === false && overlay.style.display === "flex") {
    const choices = getRandomPowerupChoices(2);
    startButton.removeEventListener("click", handleStartButtonClick);
    showChoiceOverlay("CHOOSE YOUR INITIAL LOADOUT", choices, choice => {
      startGame();
      activatePersistentPowerup(choice);
    });
  }
});
