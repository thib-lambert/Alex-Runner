import {
  GRAVITY, JUMP_FORCE, JUMP_BOOST_PER_FRAME, MAX_JUMP_HOLD, DUCK_JUMP_FORCE,
  JUMP_COOLDOWN, COLLISION_ENABLED, GROUND_Y, THEMES, W
} from './config.js';
import { state, dino, canvas } from './state.js';
import { draw, animateSnow } from './graphics.js';
import { submitScore, hideLeaderboard, completeChallenge, awardScoreCoins } from './firebase.js';

function getStageTheme() {
  return THEMES[state.themeIndex];
}

function syncVisibleObstacleThemes(themeName) {
  for (const ob of state.obstacles) {
    if (ob.isDoor) continue;
    ob.theme = themeName;
    if (ob.bird) ob.spawnTheme = themeName;
  }
}

// Simulate speed progression to calculate the real world-distance for a given score
export function scoreToDistance(scoreValue) {
  if (scoreValue <= 0) return 0;
  let distance = 0;
  let currentSpeed = 6;
  const framesNeeded = Math.ceil(scoreValue / 0.1);
  for (let f = 0; f < framesNeeded; f++) {
    const currentScore = f * 0.1;
    const targetSpeed = 6 + (Math.min(Math.floor(currentScore), 800) / 800) * 8;
    currentSpeed += (targetSpeed - currentSpeed) * 0.05;
    distance += currentSpeed;
  }
  return distance;
}

// === SOUND MANAGEMENT ===
function stopAllSounds() {
  ['jump-sound', 'mariachi-sound-0', 'mariachi-sound-1', 'mariachi-sound-2', 'deception-sound'].forEach(id => {
    const s = document.getElementById(id);
    if (s) { s.pause(); s.currentTime = 0; }
  });
}

function playGameOverSound() {
  stopAllSounds();
  const s = document.getElementById('deception-sound');
  if (s) { s.currentTime = 0; s.play().catch(() => {}); }
}

// === OBSTACLE SPAWNING ===
function spawnObstacle() {
  if (state.obstacles.length > 0) {
    const last = state.obstacles[state.obstacles.length - 1];
    if (W - last.x < 120) { state.nextObstacleIn = 20; return; }
  }

  const birdChance = Math.min(0.7, 0.2 + (state.score / 500) * 0.5);
  const r = Math.random();
  const obstacleTheme = state.currentTheme;
  let ob;

  if (r < 0.3) {
    ob = { x: W, type: 'small', w: 18, h: 34, bird: false, theme: obstacleTheme };
  } else if (r < 0.55) {
    ob = { x: W, type: 'large', w: 28, h: 46, bird: false, theme: obstacleTheme };
  } else if (r < 1 - birdChance) {
    ob = { x: W, type: 'double', w: 28, h: 42, bird: false, theme: obstacleTheme };
  } else {
    const heights = [50, 70, 90];
    const h = heights[Math.floor(Math.random() * heights.length)];
    ob = { x: W, y: GROUND_Y - h, type: 'bird', w: 26, h: 36, bird: true, spawnTheme: obstacleTheme, theme: obstacleTheme };
    if (state.gameState === 'running') {
      if (obstacleTheme === 'mariachi') {
        stopAllSounds();
        const idx = Math.floor(Math.random() * 3);
        const mariachiSound = document.getElementById('mariachi-sound-' + idx);
        if (mariachiSound) { mariachiSound.currentTime = 0; mariachiSound.play().catch(() => {}); }
      } else {
        stopAllSounds();
        const pinguSound = document.getElementById('jump-sound');
        if (pinguSound) { pinguSound.currentTime = 0; pinguSound.play().catch(() => {}); }
      }
    }
  }
  state.obstacles.push(ob);

  if (state.score < 600) {
    state.nextObstacleIn = 40 + Math.random() * 60;
  } else {
    state.nextObstacleIn = 25 + Math.random() * 45;
  }
}

// === COLLISION DETECTION ===
function checkCollision(ob) {
  if (ob.isDoor) return false;
  let dx, dy, dw, dh;
  if (dino.ducking && !dino.jumping) {
    dw = 40; dh = 20;
    dx = dino.x + 2;
    dy = GROUND_Y - dh + 2;
    dw -= 4; dh -= 4;
  } else {
    dx = dino.x + 6;
    dy = dino.y - dino.h + 6;
    dw = dino.w - 12;
    dh = dino.h - 6;
  }

  let ox, oy, ow, oh;
  if (ob.bird) {
    ox = ob.x + 2; oy = ob.y + 2; ow = ob.w - 4; oh = ob.h - 4;
  } else {
    ox = ob.x + 2; oy = GROUND_Y - ob.h + 2; ow = ob.w - 4; oh = ob.h - 4;
  }

  return dx < ox + ow && dx + dw > ox && dy < oy + oh && dy + dh > oy;
}

// === RESET ===
export function reset() {
  dino.y = GROUND_Y;
  dino.vy = 0;
  dino.jumping = false;
  dino.ducking = false;
  dino.runCycle = 0;
  dino.squash = 1;
  dino.squashVel = 0;
  dino.lean = 0;
  dino.landTimer = 0;
  dino.wasJumping = false;
  dino.jumpHoldFrames = 0;
  dino.armSwing = 0;

  state.obstacles = [];
  state.nextObstacleIn = 60;
  state.score = 0;
  state.speed = 6;
  state.frame = 0;
  state.beatRecord = false;
  state.recordLinePassed = false;

  if (state.playerBestScore > 0) {
    state.recordLineX = scoreToDistance(state.playerBestScore);
  } else {
    state.recordLineX = -1000;
  }

  state.themeIndex = 0;
  state.currentTheme = THEMES[0];
  state.nextThemeChange = 150;
  state.doorSpawned = false;
  state.themeFlash = 0;
  state.mariachiActive = false;
  state.mariachiReturnTheme = THEMES[0];
  state.mariachiEndScore = 0;
  state.mariachiDoorSpawned = false;
  state.mariachiDoorScore = 75 + Math.floor(Math.random() * 11);
}

// === UPDATE ===
function update() {
  if (state.gameState !== 'running') return;

  state.frame++;
  state.groundOffset += state.speed;

  if (state.score < 600) {
    state.speed = 6 + Math.pow(state.score * 0.01, 1.2);
  } else {
    state.speed = 6 + Math.pow(6, 1.2) + (state.score - 600) * 0.008;
  }
  if (state.speed > 18) state.speed = 18;

  if (dino.jumping && state.jumpHeld && dino.jumpHoldFrames < MAX_JUMP_HOLD) {
    dino.vy += JUMP_BOOST_PER_FRAME;
    dino.jumpHoldFrames++;
  }

  if (dino.jumping) {
    dino.vy += GRAVITY;
    dino.y += dino.vy;
    dino.wasJumping = true;
    if (dino.y >= GROUND_Y) {
      dino.y = GROUND_Y;
      const impactForce = Math.min(dino.vy * 0.04, 0.25);
      dino.squash = 1 - impactForce;
      dino.squashVel = -impactForce * 0.5;
      dino.vy = 0;
      dino.jumping = false;
      dino.landTimer = 0;
    }
  }

  state.clouds.forEach(c => {
    c.x -= state.speed * 0.2;
    if (c.x < -50) { c.x = W + Math.random() * 100; c.y = 20 + Math.random() * 50; }
  });

  state.nextObstacleIn -= 1;
  if (state.nextObstacleIn <= 0) spawnObstacle();

  if (!state.mariachiActive && !state.mariachiDoorSpawned && state.themeIndex < THEMES.length - 1) {
    const stageStart = state.nextThemeChange - 150;
    if (Math.floor(state.score) >= stageStart + state.mariachiDoorScore) {
      const last = state.obstacles[state.obstacles.length - 1];
      const gapOK = !last || (W - last.x >= 180);
      if (gapOK) {
        state.obstacles.push({ x: W + 40, type: 'door', w: 70, h: GROUND_Y, bird: false, isDoor: true, isMariachi: true });
        state.mariachiDoorSpawned = true;
        state.nextObstacleIn = Math.max(state.nextObstacleIn, 90);
      }
    }
  }

  if (state.mariachiActive && state.score >= state.mariachiEndScore) {
    state.mariachiActive = false;
    state.currentTheme = getStageTheme();
    state.mariachiReturnTheme = state.currentTheme;
    syncVisibleObstacleThemes(state.currentTheme);
    state.themeFlash = 0.5;
  }

  if (!state.doorSpawned && !state.mariachiActive && state.themeIndex < THEMES.length - 1 && Math.floor(state.score) >= state.nextThemeChange) {
    const last = state.obstacles[state.obstacles.length - 1];
    const gapOK = !last || (W - last.x >= 180);
    if (gapOK) {
      state.obstacles.push({ x: W + 40, type: 'door', w: 70, h: GROUND_Y, bird: false, isDoor: true, isMariachi: false });
      state.doorSpawned = true;
      state.nextObstacleIn = Math.max(state.nextObstacleIn, 90);
    }
  }

  state.obstacles.forEach(ob => { ob.x -= state.speed; });
  state.obstacles = state.obstacles.filter(ob => ob.x > -80);

  for (const ob of state.obstacles) {
    if (ob.isDoor && !ob.triggered && ob.x + ob.w / 2 < dino.x) {
      ob.triggered = true;
      if (ob.isMariachi) {
        state.mariachiReturnTheme = getStageTheme();
        state.mariachiActive = true;
        state.mariachiEndScore = Math.min(state.score + 75 + Math.random() * 10, state.nextThemeChange - 5);
        state.currentTheme = 'mariachi';
        syncVisibleObstacleThemes(state.currentTheme);
        state.themeFlash = 0.7;
      } else {
        state.themeIndex = Math.min(state.themeIndex + 1, THEMES.length - 1);
        state.currentTheme = getStageTheme();
        syncVisibleObstacleThemes(state.currentTheme);
        if (state.themeIndex < THEMES.length - 1) {
          state.nextThemeChange += 150;
          state.doorSpawned = false;
          state.mariachiDoorSpawned = false;
          state.mariachiDoorScore = 75 + Math.floor(Math.random() * 11);
        }
        state.themeFlash = 0.7;
      }
    }
  }

  for (const ob of state.obstacles) {
    if (checkCollision(ob)) {
      if (!ob.hit) {
        ob.hit = true;
        const shake = 5;
        canvas.style.transform = `translate(${(Math.random() - 0.5) * shake * 2}px, ${(Math.random() - 0.5) * shake * 2}px)`;
        setTimeout(() => { canvas.style.transform = 'translate(0, 0)'; }, 80);
      }
      if (COLLISION_ENABLED) {
        state.gameState = 'over';
        if (state.score > state.highScore) state.highScore = state.score;
        if (state.score > state.playerBestScore) state.playerBestScore = Math.floor(state.score);
        playGameOverSound();

        const challengeRun = Boolean(state.activeChallenge);
        const earnedCoins = challengeRun
          ? completeChallenge(state.score)
          : awardScoreCoins(state.score);

        if (state.currentPseudo) submitScore(state.currentPseudo, state.score);

        const messageEl = document.getElementById('message');
        messageEl.innerHTML = '<h2>' + (challengeRun ? 'DUEL TERMINE' : 'GAME OVER') + '</h2><p>Score: ' + String(Math.floor(state.score)).padStart(5, '0') +
          (state.highScore > 0 ? ' | Record: ' + String(Math.floor(state.highScore)).padStart(5, '0') : '') +
          '</p><p style="margin-top:8px">+' + earnedCoins + ' A-coins | ' + (challengeRun ? 'Participation incluse, bonus de victoire éventuel.' : 'Choisis une action pour continuer.') + '</p>' +
          '<div class="game-over-actions"><button id="restart-game" type="button">REJOUER</button><button id="return-home" type="button">ACCUEIL</button></div>';
        messageEl.style.display = 'block';

        return;
      }
    }
  }

  state.score += 0.1;
  document.getElementById('score').textContent = String(Math.floor(state.score)).padStart(5, '0');

  const bestScoreEl = document.getElementById('best-score');
  if (state.playerBestScore > 0) {
    bestScoreEl.textContent = 'BEST: ' + String(Math.floor(state.playerBestScore)).padStart(5, '0');
    if (state.groundOffset > state.recordLineX && !state.recordLinePassed) {
      state.recordLinePassed = true;
      state.beatRecord = true;
    }
  } else {
    bestScoreEl.textContent = 'BEST: -----';
  }
}

// === JUMP ===
export function jump() {
  const now = performance.now();
  if (now - state.lastJumpTime < JUMP_COOLDOWN) return;
  if (!dino.jumping) {
    state.lastJumpTime = now;
    dino.jumping = true;
    dino.jumpHoldFrames = 0;
    dino.vy = dino.ducking ? DUCK_JUMP_FORCE : JUMP_FORCE;
    dino.squash = 1.2;
    dino.squashVel = 0.1;
  }
}

// === START GAME ===
export function startGame() {
  if (state.leaderboardTimeoutId !== null) {
    clearTimeout(state.leaderboardTimeoutId);
    state.leaderboardTimeoutId = null;
  }
  reset();
  state.gameState = 'running';
  document.getElementById('message').style.display = 'none';
  hideLeaderboard();
}

// === GAME LOOP ===
const _STEP = 1000 / 60;
let _lastTime = 0;
let _accumulator = 0;

export function loop(timestamp) {
  if (_lastTime === 0) _lastTime = timestamp;
  const dt = Math.min(timestamp - _lastTime, 50);
  _lastTime = timestamp;
  _accumulator += dt;
  while (_accumulator >= _STEP) {
    update();
    animateSnow();
    _accumulator -= _STEP;
  }
  draw();
  requestAnimationFrame(loop);
}
