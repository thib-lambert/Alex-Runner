import { INSTALL_PROMPT_STORAGE_KEY, IOS_SAFARI_RE, IOS_BROWSER_EXCLUDE_RE, SKINS } from './config.js';
import { state, setupCanvas, initHeads, initClouds, initSnowflakes, alexHead, neutralHead, setCurrentHead } from './state.js';
import { fetchPlayerBestScore, showLeaderboard, hideLeaderboard, addFriend, showFriends, hideFriends, initialiseIdentity, saveProfile, syncProfileData, signInWithEmailPassword, startSocialListeners } from './firebase.js';
import { loop, startGame } from './game.js';
import { setupInputHandlers } from './input.js';

// === DOM REFERENCES ===
const authScreen    = document.getElementById('auth-screen');
const pseudoScreen  = document.getElementById('pseudo-screen');
const pseudoInput   = document.getElementById('pseudo-input');
const pseudoConfirmBtn = document.getElementById('pseudo-confirm');
const authErrorEl = document.getElementById('auth-error');
const pseudoErrorEl = document.getElementById('pseudo-error');
const installPromptEl     = document.getElementById('install-prompt');
const installPromptTextEl = document.getElementById('install-text');
const installDismissEl    = document.getElementById('install-dismiss');
const installConfirmEl    = document.getElementById('install-confirm');
const installHomeEl       = document.getElementById('install-home');
const messageEl = document.getElementById('message');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const emailSignInBtn = document.getElementById('email-sign-in');
const emailCreateBtn = document.getElementById('email-create');

// === CANVAS SETUP ===
const canvasEl = document.getElementById('game');
setupCanvas(canvasEl);
initHeads();
initClouds();
initSnowflakes();
setupInputHandlers();

function refreshHeadForActiveSkin() {
  const activeSkin = SKINS.find(skin => skin.id === state.activeSkin);
  setCurrentHead(activeSkin?.head === 'alex' ? alexHead : neutralHead);
}

refreshHeadForActiveSkin();

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
  return authScreen.classList.contains('active') || pseudoScreen.classList.contains('active');
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

function showAuthScreen() {
  pseudoScreen.classList.remove('active');
  authScreen.classList.add('active');
  emailInput.focus();
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

async function confirmPseudo() {
  if (!pseudoInput.value.trim()) return;
  state.currentPseudo = pseudoInput.value.trim();
  pseudoErrorEl.textContent = '';
  pseudoConfirmBtn.disabled = true;
  const saved = await saveProfile(state.currentPseudo);
  if (!saved) {
    pseudoErrorEl.textContent = 'Ce pseudo est deja pris ou indisponible.';
    pseudoConfirmBtn.disabled = false;
    return;
  }
  localStorage.setItem('alexRunnerPseudo', state.currentPseudo);
  pseudoScreen.classList.remove('active');
  finishOnboarding();
}

async function handleEmailAuth(createAccount) {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || password.length < 6) {
    passwordInput.setCustomValidity('Utilise au moins 6 caracteres pour le mot de passe.');
    passwordInput.reportValidity();
    return;
  }
  passwordInput.setCustomValidity('');
  authErrorEl.textContent = '';
  emailSignInBtn.disabled = true;
  emailCreateBtn.disabled = true;
  const activeButton = createAccount ? emailCreateBtn : emailSignInBtn;
  activeButton.textContent = 'CONNEXION...';
  try {
    const authenticated = await signInWithEmailPassword(email, password, createAccount);
    if (!authenticated) throw new Error('Firebase Authentication indisponible');
    state.sessionActive = true;
    localStorage.setItem('alexRunnerSession', 'active');
    const hasProfile = await initialiseIdentity();
    if (hasProfile) {
      finishOnboarding();
    } else {
      state.currentPseudo = '';
      localStorage.removeItem('alexRunnerPseudo');
      showPseudoScreen();
    }
    activeButton.textContent = createAccount ? 'COMPTE CREE' : 'CONNECTE';
  } catch (error) {
    console.error('Email authentication failed:', error);
    emailSignInBtn.disabled = false;
    emailCreateBtn.disabled = false;
    activeButton.textContent = createAccount ? 'CREER UN COMPTE' : 'SE CONNECTER';
    authErrorEl.textContent = 'Adresse ou mot de passe incorrect, ou service indisponible.';
  }
}

emailSignInBtn.addEventListener('click', () => handleEmailAuth(false));
emailCreateBtn.addEventListener('click', () => handleEmailAuth(true));

pseudoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && pseudoInput.value.trim().length > 0) confirmPseudo().catch(error => console.error('Profile creation failed:', error));
});

pseudoConfirmBtn.addEventListener('click', () => confirmPseudo().catch(error => console.error('Profile creation failed:', error)));

function showPseudoScreen() {
  authScreen.classList.remove('active');
  pseudoScreen.classList.add('active');
  pseudoInput.focus();
}

function finishOnboarding() {
  refreshHeadForActiveSkin();
  authScreen.classList.remove('active');
  pseudoScreen.classList.remove('active');
  revealHomeScreen();
  fetchPlayerBestScore(state.currentPseudo);
  startSocialListeners().catch(error => console.error('Social listeners failed:', error));
  canvasEl.focus();
}

window.addEventListener('alex-runner-social-notification', event => {
  const badge = document.getElementById('friends-notification');
  if (!badge) return;
  const count = event.detail?.count || 0;
  badge.classList.toggle('visible', count > 0);
  badge.textContent = count > 9 ? '9+' : count ? String(count) : '';
});

async function bootstrapSession() {
  if (!state.sessionActive || !state.firebaseUid) {
    showAuthScreen();
    return;
  }

  const hasProfile = await initialiseIdentity();
  if (hasProfile && state.currentPseudo) {
    finishOnboarding();
  } else if (state.firebaseUid) {
    showPseudoScreen();
  } else {
    state.sessionActive = false;
    localStorage.removeItem('alexRunnerSession');
    showAuthScreen();
  }
}

bootstrapSession().catch(error => {
  console.error('Session restoration failed:', error);
  showAuthScreen();
});

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
document.getElementById('friends-close').addEventListener('click', hideFriends);
document.getElementById('friends-open').addEventListener('click', e => { e.stopPropagation(); showFriends(); });
document.getElementById('friend-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('friend-input');
  if (addFriend(input.value)) input.value = '';
});

function renderShop() {
  const list = document.getElementById('shop-list');
  document.getElementById('coin-balance').textContent = `${state.aCoins} A-COINS`;
  list.innerHTML = SKINS.map(skin => {
    const owned = state.ownedSkins.includes(skin.id);
    const equipped = state.activeSkin === skin.id;
    const scoreLocked = state.playerBestScore < skin.unlockScore;
    const coinLocked = state.aCoins < skin.price;
    const locked = !owned && (scoreLocked || coinLocked);
    const ownershipLabel = equipped ? 'Équipé' : owned ? 'Possédé' : locked
      ? `Score requis : ${skin.unlockScore} | ${skin.price} A-coins`
      : `${skin.price} A-coins | Score : ${skin.unlockScore}`;
    const actionLabel = equipped ? '✓' : owned ? 'ÉQUIPER' : locked ? 'VERROUILLÉ' : 'ACHETER';
    return `<li><span><strong>${skin.name}</strong><small>${ownershipLabel}</small></span><button class="shop-action ${equipped ? 'is-equipped' : ''}" type="button" data-skin="${skin.id}" ${equipped || locked ? 'disabled' : ''}>${actionLabel}</button></li>`;
  }).join('');
  list.querySelectorAll('.shop-action:not(:disabled)').forEach(button => button.addEventListener('click', () => {
    const skin = SKINS.find(item => item.id === button.dataset.skin);
    if (!skin) return;
    if (!state.ownedSkins.includes(skin.id)) {
      if (state.aCoins < skin.price) return;
      state.aCoins -= skin.price;
      state.ownedSkins.push(skin.id);
      localStorage.setItem('alexRunnerACoins', String(state.aCoins));
      localStorage.setItem('alexRunnerOwnedSkins', JSON.stringify(state.ownedSkins));
      syncProfileData().catch(error => console.error('Error syncing skin purchase:', error));
    }
    state.activeSkin = skin.id;
    localStorage.setItem('alexRunnerActiveSkin', skin.id);
    refreshHeadForActiveSkin();
    syncProfileData().catch(error => console.error('Error syncing equipped skin:', error));
    renderShop();
  }));
}

document.getElementById('shop-open').addEventListener('click', event => {
  event.stopPropagation();
  document.getElementById('shop-screen').classList.add('active');
  renderShop();
});
document.getElementById('shop-close').addEventListener('click', () => document.getElementById('shop-screen').classList.remove('active'));
window.addEventListener('alex-runner-challenge-start', () => startGame());
window.addEventListener('alex-runner-return-menu', () => {
  state.gameState = 'idle';
  document.getElementById('friends-screen').classList.remove('active');
  document.getElementById('shop-screen').classList.remove('active');
  hideLeaderboard();
  messageEl.innerHTML = `
    <h2>ALEX RUNNER</h2>
    <p>Appuie sur Espace ou touche l'ecran pour jouer</p>
    <div class="message-actions">
      <button id="leaderboard-open" class="message-action-btn" type="button">CLASSEMENT</button>
      <button id="friends-open" class="message-action-btn secondary" type="button">AMIS<span id="friends-notification" class="notification-dot" aria-label="Nouvelles notifications"></span></button>
      <button id="shop-open" class="message-action-btn secondary" type="button">BOUTIQUE</button>
      <button id="install-home" class="message-action-btn secondary hidden" type="button">INSTALLER</button>
    </div>`;
  messageEl.style.display = 'block';
  document.getElementById('leaderboard-open').addEventListener('click', event => { event.stopPropagation(); showLeaderboard(); });
  document.getElementById('friends-open').addEventListener('click', event => { event.stopPropagation(); showFriends(); });
  document.getElementById('shop-open').addEventListener('click', event => {
    event.stopPropagation();
    document.getElementById('shop-screen').classList.add('active');
    renderShop();
  });
  refreshInstallHomeButton();
});

messageEl.addEventListener('click', event => {
  if (event.target.id === 'restart-game') startGame();
  if (event.target.id === 'return-home') window.dispatchEvent(new Event('alex-runner-return-menu'));
});

function refreshConnectionStatus() {
  const status = document.getElementById('connection-status');
  const online = navigator.onLine;
  status.classList.toggle('offline', !online);
  status.textContent = online ? '' : 'HORS LIGNE';
  status.title = online ? 'En ligne' : 'Hors ligne';
  status.setAttribute('aria-label', online ? 'En ligne' : 'Hors ligne');
}

window.addEventListener('online', refreshConnectionStatus);
window.addEventListener('offline', refreshConnectionStatus);
refreshConnectionStatus();

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
