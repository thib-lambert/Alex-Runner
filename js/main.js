import { DATE_REQUIRED, VALID_DATE, INSTALL_PROMPT_STORAGE_KEY, IOS_SAFARI_RE, IOS_BROWSER_EXCLUDE_RE } from './config.js';
import { state, setupCanvas, initHeads, initClouds, initSnowflakes, alexHead, neutralHead, setCurrentHead } from './state.js';
import { fetchPlayerBestScore, showLeaderboard, hideLeaderboard } from './firebase.js';
import { loop } from './game.js';
import { setupInputHandlers } from './input.js';

// === DOM REFERENCES ===
const birthScreen   = document.getElementById('birth-screen');
const birthInput    = document.getElementById('birth-input');
const pseudoScreen  = document.getElementById('pseudo-screen');
const pseudoInput   = document.getElementById('pseudo-input');
const installPromptEl     = document.getElementById('install-prompt');
const installPromptTextEl = document.getElementById('install-text');
const installDismissEl    = document.getElementById('install-dismiss');
const installConfirmEl    = document.getElementById('install-confirm');
const installHomeEl       = document.getElementById('install-home');
const messageEl = document.getElementById('message');

// === CANVAS SETUP ===
const canvasEl = document.getElementById('game');
setupCanvas(canvasEl);
initHeads();
initClouds();
initSnowflakes();
setupInputHandlers();

// === INSTALL PROMPT LOGIC ===
let deferredInstallPrompt = null;
let installPromptMode = 'web';
let installAutoPromptShown = false;

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosSafari() {
  return IOS_SAFARI_RE.test(navigator.userAgent) &&
    /safari/i.test(navigator.userAgent) &&
    !IOS_BROWSER_EXCLUDE_RE.test(navigator.userAgent);
}

function hasHandledInstallPrompt() {
  return Boolean(localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY));
}

function markInstallPromptHandled(promptState) {
  localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, promptState);
}

function canOfferInstallPrompt() {
  return location.protocol !== 'file:' && !hasHandledInstallPrompt() && !isStandaloneMode();
}

function isOnboardingActive() {
  return getComputedStyle(birthScreen).display !== 'none' || pseudoScreen.classList.contains('active');
}

function canShowInstallPrompt(options = {}) {
  const { force = false } = options;
  if (location.protocol === 'file:' || isStandaloneMode()) return false;
  if (!force && isOnboardingActive()) return false;
  return force ? true : canOfferInstallPrompt();
}

function shouldShowInstallHomeButton() {
  if (location.protocol === 'file:' || isStandaloneMode()) return false;
  if (isOnboardingActive()) return false;
  return isIosSafari() || Boolean(deferredInstallPrompt);
}

function refreshInstallHomeButton() {
  installHomeEl.classList.toggle('hidden', !shouldShowInstallHomeButton());
}

function maybeShowInstallPrompt() {
  if (installAutoPromptShown || isOnboardingActive() || !canOfferInstallPrompt()) return;
  if (deferredInstallPrompt) {
    installAutoPromptShown = true;
    window.setTimeout(() => {
      if (deferredInstallPrompt && canOfferInstallPrompt() && !isOnboardingActive()) {
        showInstallPrompt('web');
      }
    }, 600);
    return;
  }
  if (isIosSafari()) {
    installAutoPromptShown = true;
    window.setTimeout(() => {
      if (canOfferInstallPrompt() && !isOnboardingActive()) {
        showInstallPrompt('ios');
      }
    }, 1200);
  }
}

function showInstallPrompt(mode, options = {}) {
  if (!canShowInstallPrompt(options) || installPromptEl.classList.contains('active')) return;
  installPromptMode = mode;
  installPromptEl.classList.toggle('ios', mode === 'ios');
  installConfirmEl.textContent = mode === 'ios' ? 'Compris' : 'Installer';
  installPromptTextEl.textContent = mode === 'ios'
    ? "Sur iPhone/iPad, touche Partager puis 'Sur l'ecran d'accueil' pour installer le jeu."
    : 'Ajoute Alex Runner sur ton appareil pour jouer en plein ecran et hors ligne.';
  installPromptEl.classList.add('active');
  installPromptEl.setAttribute('aria-hidden', 'false');
}

function hideInstallPrompt(options = {}) {
  const { remember = false, promptState = 'dismissed' } = options;
  installPromptEl.classList.remove('active', 'ios');
  installPromptEl.setAttribute('aria-hidden', 'true');
  if (remember) markInstallPromptHandled(promptState);
}

async function confirmInstallPrompt() {
  if (installPromptMode === 'ios' || !deferredInstallPrompt) {
    hideInstallPrompt({ remember: true, promptState: installPromptMode === 'ios' ? 'ios' : 'unavailable' });
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  hideInstallPrompt();
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  hideInstallPrompt({ remember: true, promptState: choice.outcome === 'accepted' ? 'accepted' : 'dismissed' });
  refreshInstallHomeButton();
}

function handleHomeInstallClick() {
  if (isIosSafari()) { showInstallPrompt('ios', { force: true }); return; }
  if (!deferredInstallPrompt) return;
  installPromptMode = 'web';
  confirmInstallPrompt().catch(error => { console.error('Manual install failed:', error); });
}

function revealHomeScreen() {
  messageEl.style.display = 'block';
  refreshInstallHomeButton();
  maybeShowInstallPrompt();
}

// === UPDATE NOTIFICATION ===
function showUpdateNotification() {
  const updateEl = document.createElement('div');
  updateEl.id = 'update-notification';
  updateEl.style.cssText = `
    position: fixed;
    bottom: max(env(safe-area-inset-bottom), 16px);
    left: 50%;
    transform: translateX(-50%);
    width: min(360px, calc(100vw - 16px));
    background: rgba(255, 255, 255, 0.96);
    border: 2px solid #4A90E2;
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 18px 38px rgba(26, 58, 92, 0.2);
    backdrop-filter: blur(10px);
    z-index: 130;
    font-family: 'Courier New', monospace;
  `;
  updateEl.innerHTML = `
    <h3 style="margin: 0 0 8px 0; color: #4A90E2; font-size: 16px; letter-spacing: 1px;">✨ MISE À JOUR DISPONIBLE</h3>
    <p style="margin: 0 0 12px 0; color: #1A3A5C; font-size: 14px; line-height: 1.4;">Une nouvelle version d'Alex Runner est prête à être installée.</p>
    <div style="display: flex; gap: 10px; margin: 0;">
      <button id="update-later" style="flex: 1; padding: 11px 14px; border: none; border-radius: 10px; background: rgba(139, 168, 196, 0.18); color: #1A3A5C; cursor: pointer; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 1px;">PLUS TARD</button>
      <button id="update-now" style="flex: 1; padding: 11px 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, #4A90E2, #7FB8F0); color: #fff; cursor: pointer; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 1px; box-shadow: 0 6px 18px rgba(74, 144, 226, 0.25);">METTRE À JOUR</button>
    </div>
  `;
  document.body.appendChild(updateEl);
  document.getElementById('update-later').addEventListener('click', () => updateEl.remove());
  document.getElementById('update-now').addEventListener('click', () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    updateEl.remove();
  });
}

// === ONBOARDING ===
birthInput.addEventListener('input', () => {
  let v = birthInput.value.replace(/[^0-9]/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
  else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  birthInput.value = v;
  if (v.length === 10) {
    setCurrentHead(v === VALID_DATE ? alexHead : neutralHead);
    showPseudoScreen();
  }
});

birthInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && birthInput.value.length === 10) {
    setCurrentHead(birthInput.value === VALID_DATE ? alexHead : neutralHead);
    showPseudoScreen();
  }
});

pseudoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && pseudoInput.value.trim().length > 0) {
    state.currentPseudo = pseudoInput.value.trim();
    localStorage.setItem('alexRunnerPseudo', state.currentPseudo);
    pseudoScreen.classList.remove('active');
    revealHomeScreen();
    fetchPlayerBestScore(state.currentPseudo);
    canvasEl.focus();
  }
});

function showPseudoScreen() {
  birthScreen.style.display = 'none';
  pseudoScreen.classList.add('active');
  if (state.currentPseudo) pseudoInput.value = state.currentPseudo;
  pseudoInput.focus();
}

if (!DATE_REQUIRED) {
  birthScreen.style.display = 'none';
  if (!state.currentPseudo) {
    showPseudoScreen();
  } else {
    revealHomeScreen();
    fetchPlayerBestScore(state.currentPseudo);
  }
} else {
  birthInput.focus();
}

// === INSTALL PROMPT EVENTS ===
installDismissEl.addEventListener('click', () => {
  hideInstallPrompt({ remember: true, promptState: 'dismissed' });
  refreshInstallHomeButton();
});

installConfirmEl.addEventListener('click', () => {
  confirmInstallPrompt().catch(error => {
    console.error('Install prompt failed:', error);
    hideInstallPrompt({ remember: true, promptState: 'failed' });
    refreshInstallHomeButton();
  });
});

installHomeEl.addEventListener('click', handleHomeInstallClick);

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallHomeButton();
  maybeShowInstallPrompt();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallPrompt();
  markInstallPromptHandled('accepted');
  refreshInstallHomeButton();
});

// === LEADERBOARD BUTTONS ===
document.getElementById('leaderboard-close').addEventListener('click', hideLeaderboard);
const leaderboardOpenBtn = document.getElementById('leaderboard-open');
if (leaderboardOpenBtn) {
  leaderboardOpenBtn.addEventListener('click', e => { e.stopPropagation(); showLeaderboard(); });
}

// === SERVICE WORKER ===
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });

    setInterval(() => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.update().then(() => {
            if (reg.waiting) showUpdateNotification();
          });
        }
      });
    }, 60 * 60 * 1000);

    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) showUpdateNotification();
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

window.addEventListener('load', () => {
  refreshInstallHomeButton();
  maybeShowInstallPrompt();
});

// === START LOOP ===
requestAnimationFrame(loop);
