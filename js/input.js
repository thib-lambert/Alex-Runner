import { state, dino, canvas } from './state.js';
import { jump, startGame } from './game.js';

export function setupInputHandlers() {
  // === KEYBOARD ===
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      state.jumpHeld = true;
      if (state.gameState === 'idle' || state.gameState === 'over') startGame();
      else if (state.gameState === 'running') jump();
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (state.gameState === 'running') {
        dino.ducking = true;
        if (dino.jumping && dino.vy < 0) dino.vy = 0;
      }
    }
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') state.jumpHeld = false;
    if (e.code === 'ArrowDown') dino.ducking = false;
  });

  // === CANVAS TOUCH ===
  let touchStartY = 0;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartY = e.touches[0].clientY;
    state.jumpHeld = true;
    if (state.gameState === 'idle' || state.gameState === 'over') startGame();
    else if (state.gameState === 'running') jump();
  });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (state.gameState === 'running') {
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30) {
        dino.ducking = true;
        if (dino.jumping && dino.vy < 0) dino.vy = 0;
      }
    }
  });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    state.jumpHeld = false;
    if (state.gameState === 'running') dino.ducking = false;
  });

  // === MOBILE BUTTONS ===
  const jumpBtn = document.getElementById('jump-btn');
  const duckBtn = document.getElementById('duck-btn');

  jumpBtn.addEventListener('click', () => {
    if (state.gameState === 'idle' || state.gameState === 'over') startGame();
    else if (state.gameState === 'running') jump();
  });

  jumpBtn.addEventListener('touchstart', e => {
    if (state.jumpBtnActive) return;
    e.preventDefault();
    state.jumpBtnActive = true;
    state.jumpHeld = true;
    if (state.gameState === 'idle' || state.gameState === 'over') startGame();
    else if (state.gameState === 'running') jump();
  });

  jumpBtn.addEventListener('touchend', e => {
    e.preventDefault();
    state.jumpBtnActive = false;
    state.jumpHeld = false;
  });

  jumpBtn.addEventListener('mousedown', () => { state.jumpHeld = true; });
  jumpBtn.addEventListener('mouseup', () => { state.jumpHeld = false; });

  duckBtn.addEventListener('touchstart', e => {
    if (state.duckBtnActive) return;
    e.preventDefault();
    state.duckBtnActive = true;
    if (state.gameState === 'running') {
      dino.ducking = true;
      if (dino.jumping && dino.vy < 0) dino.vy = 0;
    }
  });

  duckBtn.addEventListener('touchend', e => {
    e.preventDefault();
    state.duckBtnActive = false;
    dino.ducking = false;
  });

  duckBtn.addEventListener('mousedown', () => {
    if (state.gameState === 'running') {
      dino.ducking = true;
      if (dino.jumping && dino.vy < 0) dino.vy = 0;
    }
  });

  duckBtn.addEventListener('mouseup', () => { dino.ducking = false; });
}
