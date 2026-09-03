import { state } from './state.js';
import { CHALLENGE_PARTICIPATION_REWARD, CHALLENGE_WIN_REWARD, MAX_RUN_COINS, RUN_COIN_SCORE } from './config.js';

const LOCAL_SCORES_KEY = 'alexRunnerScores';
const FRIENDS_KEY = 'alexRunnerFriends';
const FRIEND_DETAILS_KEY = 'alexRunnerFriendDetails';
const REMOVED_FRIENDS_KEY = 'alexRunnerRemovedFriends';
const FRIEND_REQUESTS_KEY = 'alexRunnerFriendRequests';
const CHALLENGES_KEY = 'alexRunnerChallenges';
const FRIENDSHIPS_PATH = 'friendships';
const PROFILES_PATH = 'profiles';
const PSEUDO_INDEX_PATH = 'pseudoIndex';

const firebaseConfig = {
  apiKey: "AIzaSyCmHwGxGv27v4AKx342qBlKAqTpCY8LtSI",
  authDomain: "alex-runner-f4195.firebaseapp.com",
  databaseURL: "https://alex-runner-f4195-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "alex-runner-f4195",
  storageBucket: "alex-runner-f4195.firebasestorage.app",
  messagingSenderId: "581146376680",
  appId: "1:581146376680:web:0801c50a3da90451ab0c5d"
};

let remoteApi = null;
let authApi = null;
let db = null;
let auth = null;
let friendshipListenerStarted = false;
let challengeListenerStarted = false;
let leaderboardScores = [];
let leaderboardCurrentScore = 0;
let leaderboardVisibleCount = 10;
const remoteReady = Promise.all([
  import('https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js'),
  import('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js')
]).then(async ([firebaseApp, firebaseDatabase, firebaseAuth]) => {
  const app = firebaseApp.initializeApp(firebaseConfig);
  db = firebaseDatabase.getDatabase(app);
  remoteApi = firebaseDatabase;
  authApi = firebaseAuth;
  auth = firebaseAuth.getAuth(app);
  await new Promise(resolve => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(auth, user => {
      if (user) setAuthenticatedUser(user);
      unsubscribe();
      resolve();
    }, () => resolve());
  });
}).catch(() => {
  remoteApi = null;
  authApi = null;
  auth = null;
});

function setAuthenticatedUser(user) {
  state.firebaseUid = user.uid;
  state.firebaseAuthReady = true;
  localStorage.setItem('alexRunnerFirebaseUid', state.firebaseUid);
}

export async function signInWithEmailPassword(email, password, createAccount = false) {
  await remoteReady;
  if (!authApi || !auth) return false;
  const credential = createAccount
    ? await authApi.createUserWithEmailAndPassword(auth, email, password)
    : await authApi.signInWithEmailAndPassword(auth, email, password);
  setAuthenticatedUser(credential.user);
  return true;
}

function normalisePseudo(pseudo) {
  return pseudo.trim().replace(/\s+/g, ' ').toLowerCase();
}

function currentIdentityKey() {
  return state.firebaseUid || state.currentPseudo;
}

export async function initialiseIdentity() {
  await remoteReady;
  if (!auth?.currentUser) {
    state.firebaseUid = '';
    state.firebaseAuthReady = false;
    localStorage.removeItem('alexRunnerFirebaseUid');
    localStorage.removeItem('alexRunnerSession');
    return false;
  }
  if (!remoteApi || !db || !state.firebaseUid) return false;
  try {
    const profileRef = remoteApi.ref(db, `${PROFILES_PATH}/${state.firebaseUid}`);
    const profileSnapshot = await remoteApi.get(profileRef);
    if (profileSnapshot.exists()) {
      const profile = profileSnapshot.val();
      if (profile.pseudo) {
        state.currentPseudo = profile.pseudo;
        localStorage.setItem('alexRunnerPseudo', state.currentPseudo);
      }
      if (typeof profile.aCoins === 'number') {
        state.aCoins = profile.aCoins;
        localStorage.setItem('alexRunnerACoins', String(state.aCoins));
      }
      if (Array.isArray(profile.ownedSkins) && profile.ownedSkins.length) {
        state.ownedSkins = profile.ownedSkins;
        localStorage.setItem('alexRunnerOwnedSkins', JSON.stringify(state.ownedSkins));
      }
      if (profile.activeSkin) {
        state.activeSkin = profile.activeSkin;
        localStorage.setItem('alexRunnerActiveSkin', state.activeSkin);
      }
    } else {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error loading Firebase profile:', error);
    return false;
  }
}

export async function saveProfile(pseudo) {
  await remoteReady;
  if (!remoteApi || !db || !state.firebaseUid) return false;
  const cleanPseudo = pseudo.trim().replace(/\s+/g, ' ');
  const pseudoKey = normalisePseudo(cleanPseudo);
  if (!cleanPseudo || !pseudoKey) return false;
  const pseudoRef = remoteApi.ref(db, `${PSEUDO_INDEX_PATH}/${encodeURIComponent(pseudoKey)}`);
  const claim = await remoteApi.runTransaction(pseudoRef, currentUid => currentUid || state.firebaseUid);
  if (!claim.committed || claim.snapshot.val() !== state.firebaseUid) return false;
  await remoteApi.update(remoteApi.ref(db, `${PROFILES_PATH}/${state.firebaseUid}`), {
    pseudo: cleanPseudo,
    pseudoNormalized: pseudoKey,
    aCoins: state.aCoins,
    ownedSkins: state.ownedSkins,
    activeSkin: state.activeSkin,
    updatedAt: Date.now()
  });
  return true;
}

export async function syncProfileData() {
  await remoteReady;
  if (!remoteApi || !db || !state.firebaseUid) return false;
  try {
    await remoteApi.update(remoteApi.ref(db, `${PROFILES_PATH}/${state.firebaseUid}`), {
      aCoins: state.aCoins,
      ownedSkins: state.ownedSkins,
      activeSkin: state.activeSkin,
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error syncing Firebase profile:', error);
    return false;
  }
}

async function findProfileByPseudo(pseudo) {
  await remoteReady;
  if (!remoteApi || !db) return null;
  const normalisedPseudo = normalisePseudo(pseudo);
  const indexSnapshot = await remoteApi.get(remoteApi.ref(db, `${PSEUDO_INDEX_PATH}/${encodeURIComponent(normalisedPseudo)}`));
  const indexedUid = indexSnapshot.val();
  if (indexedUid) {
    const profileSnapshot = await remoteApi.get(remoteApi.ref(db, `${PROFILES_PATH}/${indexedUid}`));
    if (profileSnapshot.exists()) return { uid: indexedUid, ...profileSnapshot.val() };
  }
  const profilesQuery = remoteApi.query(
    remoteApi.ref(db, PROFILES_PATH),
    remoteApi.orderByChild('pseudoNormalized'),
    remoteApi.equalTo(normalisedPseudo)
  );
  const profilesSnapshot = await remoteApi.get(profilesQuery);
  if (!profilesSnapshot.exists()) return null;
  const profiles = profilesSnapshot.val();
  const [uid, profile] = Object.entries(profiles)[0];
  return { uid, ...profile };
}

function readLocal(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readFriendDetails() {
  return readLocal(FRIEND_DETAILS_KEY);
}

function friendPairKey(first, second) {
  return [first.trim().toLowerCase(), second.trim().toLowerCase()]
    .sort()
    .map(encodeURIComponent)
    .join('__');
}

async function syncFriendship(friend) {
  await remoteReady;
  if (!remoteApi || !db || !state.firebaseUid || !state.currentPseudo) throw new Error('Firebase non disponible ou identite incomplete');
  const friendProfile = await findProfileByPseudo(friend);
  if (!friendProfile) throw new Error('Profil ami introuvable');
  if (friendProfile.uid === state.firebaseUid) throw new Error("Impossible de s'ajouter soi-meme");
  const pairKey = friendPairKey(state.firebaseUid, friendProfile.uid);
  await remoteApi.set(remoteApi.ref(db, `${FRIENDSHIPS_PATH}/${pairKey}`), {
    users: [state.firebaseUid, friendProfile.uid],
    names: { [state.firebaseUid]: state.currentPseudo, [friendProfile.uid]: friendProfile.pseudo || friend },
    requesterUid: state.firebaseUid,
    status: 'pending',
    updatedAt: Date.now()
  });
  return true;
}

async function listenForFriendships() {
  if (friendshipListenerStarted) return;
  await remoteReady;
  if (!remoteApi || !db || !state.firebaseUid) return;
  friendshipListenerStarted = true;
  remoteApi.onValue(remoteApi.ref(db, FRIENDSHIPS_PATH), snapshot => {
    const friendships = snapshot.val() || {};
    const localFriends = readLocal(FRIENDS_KEY);
    const removedFriends = new Set(readLocal(REMOVED_FRIENDS_KEY).map(name => name.toLowerCase()));
    const requests = [];
    const knownNames = new Map(localFriends
      .filter(friend => !removedFriends.has(friend.toLowerCase()))
      .map(friend => [friend.toLowerCase(), friend]));
    const friendDetails = [];
    Object.entries(friendships).forEach(([pairKey, friendship]) => {
      if (!Array.isArray(friendship.users)) return;
      const otherUid = friendship.users.find(uid => uid !== state.firebaseUid);
      const isParticipant = friendship.users.includes(state.firebaseUid);
      const otherName = friendship.names?.[otherUid];
      if (!isParticipant || !otherUid || !otherName) return;
      if (friendship.status === 'accepted') {
        if (!removedFriends.has(otherName.toLowerCase())) {
          knownNames.set(otherName.toLowerCase(), otherName);
          friendDetails.push({ name: otherName, uid: otherUid, pairKey });
        }
      } else if (friendship.status === 'pending') {
        knownNames.delete(otherName.toLowerCase());
        requests.push({
          pairKey,
          name: otherName,
          direction: friendship.requesterUid === state.firebaseUid ? 'sent' : 'received'
        });
      } else {
        knownNames.delete(otherName.toLowerCase());
      }
    });
    writeLocal(FRIENDS_KEY, [...knownNames.values()].sort((a, b) => a.localeCompare(b)));
    writeLocal(FRIEND_DETAILS_KEY, friendDetails);
    writeLocal(FRIEND_REQUESTS_KEY, requests);
    updateSocialNotification();
    if (document.getElementById('friends-screen').classList.contains('active')) renderFriends();
  });
}

async function listenForChallenges() {
  if (challengeListenerStarted) return;
  await remoteReady;
  if (!remoteApi || !db || !state.firebaseUid) return;
  challengeListenerStarted = true;
  remoteApi.onValue(remoteApi.ref(db, 'challenges'), snapshot => {
    const remoteChallenges = snapshot.val() || {};
    const localChallenges = readLocal(CHALLENGES_KEY);
    Object.values(remoteChallenges).forEach(challenge => {
      const participants = Array.isArray(challenge.users) ? challenge.users : [challenge.challengerUid, challenge.opponentUid].filter(Boolean);
      if (!challenge.id || !challenge.challengerUid || !challenge.opponentUid || !participants.includes(state.firebaseUid)) return;
      const existing = localChallenges.find(item => item.id === challenge.id);
      if (existing) {
        existing.scores = challenge.scores || existing.scores;
        existing.playedBy = challenge.playedBy || existing.playedBy;
        existing.status = challenge.status || existing.status;
      } else {
        const otherUid = participants.find(uid => uid !== state.firebaseUid);
        localChallenges.unshift({ ...challenge, friend: challenge.names?.[otherUid] || 'Ami', status: challenge.status || 'À jouer' });
      }
      const localChallenge = localChallenges.find(item => item.id === challenge.id);
      const scores = Object.entries(localChallenge.scores || {}).filter(([, score]) => score > 0);
      if (scores.length >= 2) {
        const winner = scores.sort(([, firstScore], [, secondScore]) => secondScore - firstScore)[0][0];
        const winnerName = challenge.names?.[winner] || winner;
        localChallenge.status = `Victoire : ${winnerName}`;
        if (winner === state.firebaseUid && localChallenge.rewarded !== true) {
          storeCoins(25);
          localChallenge.rewarded = true;
        }
      }
    });
    writeLocal(CHALLENGES_KEY, localChallenges.slice(0, 20));
    updateSocialNotification(localChallenges);
    if (document.getElementById('friends-screen').classList.contains('active')) {
      renderFriends();
      renderChallenges();
    }
  });
}

function updateSocialNotification(challenges = readLocal(CHALLENGES_KEY)) {
  const friendRequests = readLocal(FRIEND_REQUESTS_KEY).filter(request => request.direction === 'received').length;
  const challengeRequests = challenges.filter(challenge => challenge.status === 'À jouer' && !isChallengeComplete(challenge) && challenge.challengerUid && challenge.challengerUid !== state.firebaseUid).length;
  window.dispatchEvent(new CustomEvent('alex-runner-social-notification', {
    detail: { count: friendRequests + challengeRequests, friendRequests, challengeRequests }
  }));
}

function isChallengeComplete(challenge) {
  if (challenge.status?.startsWith('Victoire :')) return true;
  const playedCount = Object.values(challenge.playedBy || {}).filter(Boolean).length;
  if (playedCount >= 2) return true;
  return Object.values(challenge.scores || {}).filter(score => score > 0).length >= 2;
}

export async function startSocialListeners() {
  await Promise.all([listenForFriendships(), listenForChallenges()]);
  updateSocialNotification();
}

function rememberScore(playerName, finalScore) {
  const scores = readLocal(LOCAL_SCORES_KEY);
  scores.push({ player: playerName, score: Math.floor(finalScore), date: new Date().toISOString(), timestamp: Date.now() });
  writeLocal(LOCAL_SCORES_KEY, scores.slice(-100));
}

function normaliseScores(scores) {
  return scores
    .map(item => ({ ...item, score: Number(item.score) || 0 }))
    .filter(item => item.player && item.score >= 0)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function isFriend(playerName) {
  return readLocal(FRIENDS_KEY).some(friend => friend.toLowerCase() === playerName.toLowerCase());
}

function updateFriendSuggestions(scores = []) {
  const suggestions = document.getElementById('friend-suggestions');
  if (!suggestions) return;
  const names = new Set(readLocal(FRIENDS_KEY));
  normaliseScores(scores).forEach(item => names.add(item.player));
  if (state.currentPseudo) names.delete(state.currentPseudo);
  suggestions.innerHTML = [...names]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 50)
    .map(name => `<option value="${escapeHtml(name)}"></option>`)
    .join('');
}

function friendIcon(added) {
  const actionPath = added ? '<path d="m16 6 2 2 4-4"/>' : '<path d="M19 8v6M16 11h6"/>';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a3 3 0 0 1 0 6M19 21v-2a4 4 0 0 0-3-3.87"/>${actionPath}</svg>`;
}

function renderLeaderboardPage() {
  const leaderboardList = document.getElementById('leaderboard-list');
  const byPlayer = {};
  normaliseScores(leaderboardScores).forEach(item => {
    const key = item.player.toLowerCase().trim();
    if (!byPlayer[key]) byPlayer[key] = { player: item.player, scores: [] };
    byPlayer[key].scores.push(item.score);
  });

  const allPlayers = Object.values(byPlayer).map(player => ({
    ...player,
    scores: player.scores.sort((a, b) => b - a).slice(0, 3)
  })).sort((a, b) => b.scores[0] - a.scores[0]);
  const players = allPlayers.slice(0, leaderboardVisibleCount);
  if (!allPlayers.length) {
    leaderboardList.innerHTML = '<p class="empty-state">Aucun score pour l\'instant</p>';
    return;
  }
  leaderboardList.innerHTML = players.map((item, index) => `
    <div class="leaderboard-item ${index < 3 ? `top-${index + 1}` : ''}">
      <span class="leaderboard-rank">${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</span>
      <span class="leaderboard-name">${escapeHtml(item.player)}</span>
      <span class="leaderboard-runs">${item.scores.map((score, scoreIndex) => `<b title="Meilleur run ${scoreIndex + 1}">${score.toLocaleString()}</b>`).join('<small>·</small>')}</span>
      ${item.player.toLowerCase() === state.currentPseudo.toLowerCase() ? '' : `<button class="leaderboard-add ${isFriend(item.player) ? 'is-added' : ''}" type="button" data-friend="${escapeHtml(item.player)}" aria-label="${isFriend(item.player) ? 'Ami ajouté' : 'Ajouter comme ami'}" title="${isFriend(item.player) ? 'Ami ajouté' : 'Ajouter comme ami'}">${friendIcon(isFriend(item.player))}</button>`}
    </div>
  `).join('') + (leaderboardVisibleCount < allPlayers.length ? '<p class="leaderboard-more">Fais défiler pour voir plus</p>' : '') + (leaderboardCurrentScore > 0 ? `<p class="last-run">Dernier run : <strong>${Math.floor(leaderboardCurrentScore).toLocaleString()}</strong></p>` : '');
  leaderboardList.querySelectorAll('.leaderboard-add:not(.is-added)').forEach(button => button.addEventListener('click', () => {
    if (addFriend(button.dataset.friend)) {
      button.innerHTML = friendIcon(true);
      button.setAttribute('aria-label', 'Ami ajouté');
      button.title = 'Ami ajouté';
      button.classList.add('is-added');
    }
  }));
}

function renderLeaderboard(scores, currentScore = 0) {
  leaderboardScores = scores;
  leaderboardCurrentScore = currentScore;
  leaderboardVisibleCount = 10;
  updateFriendSuggestions(scores);
  renderLeaderboardPage();
}

function loadMoreLeaderboardPlayers() {
  const leaderboardList = document.getElementById('leaderboard-list');
  if (leaderboardList.scrollTop + leaderboardList.clientHeight < leaderboardList.scrollHeight - 36) return;
  leaderboardVisibleCount += 10;
  renderLeaderboardPage();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function renderFriends() {
  const list = document.getElementById('friends-list');
  const challenges = readLocal(CHALLENGES_KEY);
  const busyFriends = new Set(challenges
    .filter(challenge => !isChallengeComplete(challenge))
    .map(challenge => {
      const otherUid = challenge.users?.find(uid => uid !== state.firebaseUid);
      return (challenge.names?.[otherUid] || challenge.friend || '').toLowerCase();
    })
    .filter(Boolean));
  const friends = readLocal(FRIENDS_KEY).filter(friend => !busyFriends.has(friend.toLowerCase()));
  const requests = readLocal(FRIEND_REQUESTS_KEY);
  updateFriendSuggestions();
  list.innerHTML = friends.length
    ? friends.map(friend => `<li><span>${escapeHtml(friend)}</span><span><button class="challenge-btn" data-friend="${escapeHtml(friend)}">DÉFIER</button><button class="friend-remove-btn" data-friend="${escapeHtml(friend)}" type="button">SUPPRIMER</button></span></li>`).join('')
    : '<li class="empty-state">Ajoute ton premier ami avec son pseudo.</li>';
  list.querySelectorAll('.challenge-btn').forEach(button => button.addEventListener('click', () => createChallenge(button.dataset.friend)));
  list.querySelectorAll('.friend-remove-btn').forEach(button => button.addEventListener('click', () => {
    if (window.confirm(`Supprimer ${button.dataset.friend} de tes amis ?`)) removeFriend(button.dataset.friend);
  }));
  const requestsList = document.getElementById('friend-requests-list');
  requestsList.innerHTML = requests.length
    ? requests.map(request => `<li><span>${escapeHtml(request.name)}<small>${request.direction === 'received' ? 'Demande reçue' : 'Demande envoyée'}</small></span>${request.direction === 'received' ? `<span><button class="friend-request-action" data-action="accept" data-request-id="${escapeHtml(request.pairKey)}">ACCEPTER</button><button class="friend-request-action" data-action="decline" data-request-id="${escapeHtml(request.pairKey)}">REFUSER</button></span>` : ''}</li>`).join('')
    : '<li class="empty-state">Aucune demande en cours.</li>';
  requestsList.querySelectorAll('.friend-request-action').forEach(button => button.addEventListener('click', () => updateFriendRequest(button.dataset.requestId, button.dataset.action)));
}

async function updateFriendRequest(pairKey, action) {
  if (!pairKey) return;
  const requests = readLocal(FRIEND_REQUESTS_KEY).filter(request => request.pairKey !== pairKey);
  writeLocal(FRIEND_REQUESTS_KEY, requests);
  renderFriends();
  await remoteReady;
  if (!remoteApi || !db) return;
  const friendshipRef = remoteApi.ref(db, `${FRIENDSHIPS_PATH}/${pairKey}`);
  if (action === 'accept') {
    await remoteApi.update(friendshipRef, { status: 'accepted', updatedAt: Date.now() });
  } else {
    await remoteApi.update(friendshipRef, { status: 'declined', updatedAt: Date.now() });
  }
}

async function syncChallenge(challenge) {
  await remoteReady;
  if (!remoteApi || !db) return;
  const challengeRef = remoteApi.ref(db, `challenges/${challenge.id}`);
  const snapshot = await remoteApi.get(challengeRef);
  if (!snapshot.exists()) await remoteApi.set(challengeRef, challenge);
}

async function syncChallengeResult(challenge, identityKey) {
  await remoteReady;
  if (!remoteApi || !db || !identityKey) return;
  await remoteApi.update(remoteApi.ref(db, `challenges/${challenge.id}`), {
    [`scores/${identityKey}`]: challenge.scores[identityKey],
    [`playedBy/${identityKey}`]: true
  });
}

function launchChallenge(challenge) {
  const identityKey = currentIdentityKey();
  if (challenge.playedBy?.[identityKey] === true || (challenge.scores?.[identityKey] || 0) > 0) {
    renderChallenges();
    return;
  }
  state.activeChallenge = challenge;
  state.challengeRunUsed = false;
  hideFriends();
  window.dispatchEvent(new Event('alex-runner-challenge-start'));
}

async function createChallenge(friend) {
  const friendProfile = await findProfileByPseudo(friend);
  const challenges = readLocal(CHALLENGES_KEY);
  const friendUid = friendProfile?.uid || `pseudo:${normalisePseudo(friend)}`;
  const challenge = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    friend: friendProfile?.pseudo || friend,
    challenger: state.currentPseudo,
    challengerUid: state.firebaseUid,
    opponentUid: friendUid,
    users: [state.firebaseUid, friendUid],
    names: { [state.firebaseUid]: state.currentPseudo, [friendUid]: friendProfile?.pseudo || friend },
    scores: { [currentIdentityKey()]: 0 },
    score: 0,
    status: 'À jouer',
    timestamp: Date.now()
  };
  challenges.unshift(challenge);
  writeLocal(CHALLENGES_KEY, challenges.slice(0, 20));
  syncChallenge(challenge).catch(error => console.error('Error syncing challenge:', error));
  launchChallenge(challenge);
}

function renderChallenges() {
  const list = document.getElementById('challenges-list');
  const requestsList = document.getElementById('challenge-requests-list');
  const challenges = readLocal(CHALLENGES_KEY);
  const identityKey = currentIdentityKey();
  const incomingRequests = challenges.filter(challenge => challenge.status === 'À jouer' && !isChallengeComplete(challenge) && challenge.challengerUid !== state.firebaseUid && !challenge.playedBy?.[identityKey]);
  const activeChallenges = challenges.filter(challenge => !incomingRequests.includes(challenge) && !isChallengeComplete(challenge));
  requestsList.innerHTML = incomingRequests.length
    ? incomingRequests.map(challenge => `<li><span><strong>${escapeHtml(challenge.names?.[challenge.challengerUid] || challenge.friend)}</strong><small>Demande de défi</small></span><button class="challenge-btn" data-challenge-id="${escapeHtml(challenge.id)}">JOUER</button></li>`).join('')
    : '<li class="empty-state">Aucune demande de défi.</li>';
  list.innerHTML = activeChallenges.length
    ? activeChallenges.map(challenge => `<li><span><strong>${escapeHtml(challenge.friend)}</strong><small>${escapeHtml(challenge.status)}</small></span><button class="challenge-btn" data-challenge-id="${escapeHtml(challenge.id)}" ${challenge.playedBy?.[identityKey] ? 'disabled' : ''}>${challenge.playedBy?.[identityKey] ? 'RUN EFFECTUE' : challenge.status === 'À jouer' ? 'JOUER' : challenge.score ? challenge.score.toLocaleString() : 'VOIR'}</button></li>`).join('')
    : '<li class="empty-state">Aucun défi en cours.</li>';
  [...list.querySelectorAll('[data-challenge-id]'), ...requestsList.querySelectorAll('[data-challenge-id]')].forEach(button => button.addEventListener('click', () => {
    const challenge = challenges.find(item => item.id === button.dataset.challengeId);
    if (challenge) launchChallenge(challenge);
  }));
}

function storeCoins(amount) {
  state.aCoins += amount;
  localStorage.setItem('alexRunnerACoins', String(state.aCoins));
  syncProfileData().catch(error => console.error('Error syncing coins:', error));
}

export function awardScoreCoins(score) {
  const positiveScore = Math.max(0, score);
  const amount = positiveScore > 0
    ? Math.min(MAX_RUN_COINS, Math.max(1, Math.floor(positiveScore / RUN_COIN_SCORE)))
    : 0;
  if (amount > 0) storeCoins(amount);
  return amount;
}

export function completeChallenge(finalScore) {
  const activeChallenge = state.activeChallenge;
  if (!activeChallenge || state.challengeRunUsed) return 0;
  state.challengeRunUsed = true;
  let reward = CHALLENGE_PARTICIPATION_REWARD;
  storeCoins(CHALLENGE_PARTICIPATION_REWARD);
  const challenges = readLocal(CHALLENGES_KEY);
  const challenge = challenges.find(item => item.id === activeChallenge.id) || activeChallenge;
  const identityKey = currentIdentityKey();
  challenge.scores = { ...(challenge.scores || {}), [identityKey]: Math.floor(finalScore) };
  challenge.playedBy = { ...(challenge.playedBy || {}), [identityKey]: true };
  challenge.score = Math.floor(finalScore);
  const participants = Object.entries(challenge.scores).filter(([, score]) => score > 0);
  if (participants.length >= 2) {
    const winner = participants.sort(([, firstScore], [, secondScore]) => secondScore - firstScore)[0][0];
    challenge.status = `Victoire : ${winner}`;
    if (winner === currentIdentityKey() && challenge.rewarded !== true) {
      storeCoins(CHALLENGE_WIN_REWARD);
      reward += CHALLENGE_WIN_REWARD;
      challenge.rewarded = true;
    }
  }
  if (participants.length < 2) challenge.status = 'Run effectue - en attente de l\'ami';
  writeLocal(CHALLENGES_KEY, challenges.map(item => item.id === challenge.id ? challenge : item));
  syncChallengeResult(challenge, identityKey).catch(error => console.error('Error syncing challenge result:', error));
  state.activeChallenge = null;
  return reward;
}

export function addFriend(friendName) {
  const friend = friendName.trim().replace(/\s+/g, ' ');
  if (!friend || friend.toLowerCase() === state.currentPseudo.toLowerCase()) return false;
  const friends = readLocal(FRIENDS_KEY);
  const requests = readLocal(FRIEND_REQUESTS_KEY);
  if (friends.some(item => item.toLowerCase() === friend.toLowerCase()) || requests.some(item => item.name.toLowerCase() === friend.toLowerCase())) return false;
  writeLocal(REMOVED_FRIENDS_KEY, readLocal(REMOVED_FRIENDS_KEY).filter(item => normalisePseudo(item) !== normalisePseudo(friend)));
  requests.push({ name: friend, direction: 'sent' });
  writeLocal(FRIEND_REQUESTS_KEY, requests);
  syncFriendship(friend).catch(error => console.error('Error syncing friendship:', error));
  renderFriends();
  return true;
}

export async function removeFriend(friendName) {
  const normalisedName = normalisePseudo(friendName);
  const friends = readLocal(FRIENDS_KEY).filter(friend => normalisePseudo(friend) !== normalisedName);
  const requests = readLocal(FRIEND_REQUESTS_KEY).filter(request => normalisePseudo(request.name) !== normalisedName);
  const removedFriends = readLocal(REMOVED_FRIENDS_KEY);
  if (!removedFriends.some(friend => normalisePseudo(friend) === normalisedName)) removedFriends.push(friendName);
  writeLocal(FRIENDS_KEY, friends);
  writeLocal(FRIEND_REQUESTS_KEY, requests);
  writeLocal(REMOVED_FRIENDS_KEY, removedFriends);
  const details = readFriendDetails().find(friend => normalisePseudo(friend.name) === normalisedName);
  writeLocal(FRIEND_DETAILS_KEY, readFriendDetails().filter(friend => normalisePseudo(friend.name) !== normalisedName));
  renderFriends();
  await remoteReady;
  if (!remoteApi || !db || !details?.pairKey) return;
  await remoteApi.update(remoteApi.ref(db, `${FRIENDSHIPS_PATH}/${details.pairKey}`), {
    status: 'declined',
    updatedAt: Date.now()
  });
}

export function showFriends() {
  document.getElementById('friends-screen').classList.add('active');
  renderFriends();
  renderChallenges();
  listenForFriendships();
  listenForChallenges();
}

export function hideFriends() {
  document.getElementById('friends-screen').classList.remove('active');
}

export async function submitScore(playerName, finalScore) {
  rememberScore(playerName, finalScore);
  await remoteReady;
  if (!remoteApi || !db) return;
  try {
    const scoresRef = remoteApi.ref(db, 'scores');
    await remoteApi.push(scoresRef, {
      uid: state.firebaseUid || null,
      player: playerName,
      score: Math.floor(finalScore),
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error submitting score:', error);
  }
}

export async function loadLeaderboard(currentScore = 0) {
  const leaderboardList = document.getElementById('leaderboard-list');
  renderLeaderboard(readLocal(LOCAL_SCORES_KEY), currentScore);
  await remoteReady;
  if (!remoteApi || !db) return;
  try {
    const scoresRef = remoteApi.ref(db, 'scores');
    remoteApi.onValue(scoresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
          renderLeaderboard(readLocal(LOCAL_SCORES_KEY), currentScore);
        return;
      }

      renderLeaderboard([...readLocal(LOCAL_SCORES_KEY), ...Object.values(data)], currentScore);
    });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardList.innerHTML = '<p style="text-align:center;color:red">Erreur chargement</p>';
  }
}

export function showLeaderboard(currentScore = 0) {
  const leaderboardList = document.getElementById('leaderboard-list');
  document.getElementById('leaderboard-screen').classList.add('active');
  if (!leaderboardList.dataset.lazyLoading) {
    leaderboardList.addEventListener('scroll', loadMoreLeaderboardPlayers);
    leaderboardList.dataset.lazyLoading = 'true';
  }
  loadLeaderboard(currentScore);
}

export function hideLeaderboard() {
  document.getElementById('leaderboard-screen').classList.remove('active');
}

export async function fetchPlayerBestScore(playerName) {
  const localScores = normaliseScores(readLocal(LOCAL_SCORES_KEY)).filter(item => item.player.toLowerCase().trim() === playerName.toLowerCase().trim());
  state.playerBestScore = localScores.length ? Math.max(...localScores.map(item => item.score)) : 0;
  await remoteReady;
  if (!remoteApi || !db) return;
  try {
    const scoresRef = remoteApi.ref(db, 'scores');
    remoteApi.onValue(scoresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const scoresArray = Object.values(data).map(s => ({
        ...s,
        score: typeof s.score === 'number' ? s.score : parseInt(s.score)
      }));

      const playerLower = playerName.toLowerCase().trim();
      const playerScores = scoresArray.filter(item => item.player.toLowerCase().trim() === playerLower);
      state.playerBestScore = playerScores.length > 0 ? Math.max(...playerScores.map(s => s.score)) : 0;
    });
  } catch (error) {
    console.error('Error fetching player best score:', error);
    state.playerBestScore = 0;
  }
}
