import { THEMES, GROUND_Y, IOS_SAFARI_RE, W } from './config.js';

// === MUTABLE GAME STATE ===
export const state = {
  gameState: 'idle',
  score: 0,
  highScore: 0,
  playerBestScore: 0,
  beatRecord: false,
  recordLineX: -1000,
  recordLinePassed: false,
  speed: 6,
  frame: 0,
  groundOffset: 0,
  nextObstacleIn: 0,
  themeIndex: 0,
  currentTheme: THEMES[0],
  nextThemeChange: 150,
  doorSpawned: false,
  themeFlash: 0,
  mariachiActive: false,
  mariachiReturnTheme: THEMES[0],
  mariachiEndScore: 0,
  mariachiDoorSpawned: false,
  mariachiDoorScore: 0,
  leaderboardTimeoutId: null,
  jumpHeld: false,
  lastJumpTime: 0,
  jumpBtnActive: false,
  duckBtnActive: false,
  firebaseUid: localStorage.getItem('alexRunnerFirebaseUid') || '',
  firebaseAuthReady: false,
  sessionActive: localStorage.getItem('alexRunnerSession') === 'active',
  currentPseudo: localStorage.getItem('alexRunnerPseudo') || '',
  aCoins: Number(localStorage.getItem('alexRunnerACoins') || 0),
  ownedSkins: JSON.parse(localStorage.getItem('alexRunnerOwnedSkins') || '["classic"]'),
  activeSkin: localStorage.getItem('alexRunnerActiveSkin') || 'classic',
  activeChallenge: null,
  challengeRunUsed: false,
  isIOSDevice: IOS_SAFARI_RE.test(navigator.userAgent),
  obstacles: [],
  clouds: [],
  snowflakes: [],
};

// === DINO OBJECT ===
export const dino = {
  x: 60, y: GROUND_Y, w: 28, h: 72,
  vy: 0, jumping: false, ducking: false,
  legFrame: 0,
  runCycle: 0,
  squash: 1,
  squashVel: 0,
  lean: 0,
  landTimer: 0,
  wasJumping: false,
  jumpHoldFrames: 0,
  armSwing: 0,
  drawY: 0,
};

// === CANVAS — set from main.js after DOM ready ===
export let canvas = null;
export let ctx = null;

export function setupCanvas(canvasEl) {
  canvas = canvasEl;
  ctx = canvasEl.getContext('2d');
  // Polyfill roundRect for Safari < 15.4
  if (typeof ctx.roundRect !== 'function') {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
      const r = typeof radii === 'number' ? radii : (Array.isArray(radii) && radii.length ? radii[0] : 0);
      const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + rr, y);
      this.lineTo(x + w - rr, y);
      this.arcTo(x + w, y, x + w, y + rr, rr);
      this.lineTo(x + w, y + h - rr);
      this.arcTo(x + w, y + h, x + w - rr, y + h, rr);
      this.lineTo(x + rr, y + h);
      this.arcTo(x, y + h, x, y + h - rr, rr);
      this.lineTo(x, y + rr);
      this.arcTo(x, y, x + rr, y, rr);
      this.closePath();
    };
  }
}

// === CHARACTER HEADS — set from main.js ===
export let alexHead = null;
export let neutralHead = null;
export let currentHead = null;

export function setCurrentHead(head) {
  currentHead = head;
}

export function initHeads() {
  alexHead = new Image();
  alexHead.src = './assets/images/alex_detoure.png';

  const nc = document.createElement('canvas');
  nc.width = 72;
  nc.height = 72;
  neutralHead = nc;
  const c = nc.getContext('2d');
  const hcx = 36, hcy = 38;

  c.fillStyle = 'rgba(0, 0, 0, 0.08)';
  c.fillRect(hcx - 8, hcy + 20, 16, 6);
  c.fillStyle = '#F2C6A0';
  c.beginPath(); c.arc(hcx, hcy, 24, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(230, 140, 120, 0.35)';
  c.beginPath();
  c.arc(hcx - 9, hcy + 4, 4, 0, Math.PI * 2);
  c.arc(hcx + 9, hcy + 4, 4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5A3A22';
  c.beginPath();
  c.arc(hcx, hcy - 4, 23, Math.PI * 1.05, Math.PI * 1.95);
  c.lineTo(hcx + 21, hcy - 2);
  c.quadraticCurveTo(hcx, hcy - 26, hcx - 21, hcy - 2);
  c.closePath(); c.fill();
  c.fillStyle = '#4A2E1A';
  c.beginPath();
  c.moveTo(hcx - 4, hcy - 18);
  c.quadraticCurveTo(hcx + 2, hcy - 12, hcx + 8, hcy - 16);
  c.quadraticCurveTo(hcx + 2, hcy - 20, hcx - 4, hcy - 18);
  c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.arc(hcx - 8, hcy - 1, 3.2, 0, Math.PI * 2);
  c.arc(hcx + 8, hcy - 1, 3.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1A1A1A';
  c.beginPath();
  c.arc(hcx - 8, hcy - 1, 1.6, 0, Math.PI * 2);
  c.arc(hcx + 8, hcy - 1, 1.6, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#3A2414'; c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(hcx - 12, hcy - 7); c.lineTo(hcx - 4, hcy - 8);
  c.moveTo(hcx + 4, hcy - 8); c.lineTo(hcx + 12, hcy - 7);
  c.stroke();
  c.strokeStyle = '#C99E78'; c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(hcx, hcy + 2);
  c.quadraticCurveTo(hcx - 2, hcy + 8, hcx, hcy + 9);
  c.stroke();
  c.strokeStyle = '#8B4513'; c.lineWidth = 1.5; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(hcx - 5, hcy + 13);
  c.quadraticCurveTo(hcx, hcy + 14, hcx + 5, hcy + 13);
  c.stroke();
  c.lineCap = 'butt';

  currentHead = neutralHead;
}

export function initClouds() {
  state.clouds = [];
  for (let i = 0; i < 5; i++) {
    state.clouds.push({
      x: Math.random() * W,
      y: 15 + Math.random() * 60,
      scale: 0.7 + Math.random() * 0.7
    });
  }
}

export function initSnowflakes() {
  state.snowflakes = [];
  const count = state.isIOSDevice ? 20 : 40;
  for (let i = 0; i < count; i++) {
    state.snowflakes.push({
      x: Math.random() * W,
      y: Math.random() * GROUND_Y,
      r: 0.8 + Math.random() * 1.8,
      vy: 0.3 + Math.random() * 0.8,
      drift: Math.random() * Math.PI * 2
    });
  }
}
