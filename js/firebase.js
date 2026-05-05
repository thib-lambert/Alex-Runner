import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";
import { state } from './state.js';

const firebaseConfig = {
  apiKey: "AIzaSyCmHwGxGv27v4AKx342qBlKAqTpCY8LtSI",
  authDomain: "alex-runner-f4195.firebaseapp.com",
  databaseURL: "https://alex-runner-f4195-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "alex-runner-f4195",
  storageBucket: "alex-runner-f4195.firebasestorage.app",
  messagingSenderId: "581146376680",
  appId: "1:581146376680:web:0801c50a3da90451ab0c5d"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export async function submitScore(playerName, finalScore) {
  try {
    const scoresRef = ref(db, 'scores');
    await push(scoresRef, {
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
  try {
    const scoresRef = ref(db, 'scores');
    onValue(scoresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        leaderboardList.innerHTML = '<p style="text-align:center;color:var(--muted)">Aucun score pour l\'instant</p>';
        return;
      }

      const scoresArray = Object.values(data).map(s => ({
        ...s,
        score: typeof s.score === 'number' ? s.score : parseInt(s.score)
      }));

      const bestByPlayer = {};
      scoresArray.forEach(item => {
        const key = item.player.toLowerCase().trim();
        if (!bestByPlayer[key] || item.score > bestByPlayer[key].score) {
          bestByPlayer[key] = item;
        }
      });

      const top10 = Object.values(bestByPlayer).sort((a, b) => b.score - a.score).slice(0, 10);

      let html = '';
      top10.forEach((item, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '•';
        const topClass = rank <= 3 ? `top-${rank}` : '';
        html += `
          <div class="leaderboard-item ${topClass}">
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-name">${item.player}</span>
            <span class="leaderboard-score">${item.score.toLocaleString()}</span>
          </div>
        `;
      });

      if (currentScore > 0 && state.currentPseudo) {
        html += `
          <div style="margin-top:16px;padding-top:12px;border-top:2px solid var(--muted);text-align:center;font-size:11px;color:var(--muted)">
            <p style="margin:0 0 6px 0;font-weight:bold;color:var(--accent)">📍 Votre dernier run</p>
            <div class="leaderboard-item" style="background:rgba(76, 231, 107, 0.1);border-left-color:#4CE76B;margin:0">
              <span class="leaderboard-rank">•</span>
              <span class="leaderboard-name">${state.currentPseudo}</span>
              <span class="leaderboard-score">${Math.floor(currentScore).toLocaleString()}</span>
            </div>
          </div>
        `;
      }

      leaderboardList.innerHTML = html;
    });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardList.innerHTML = '<p style="text-align:center;color:red">Erreur chargement</p>';
  }
}

export function showLeaderboard(currentScore = 0) {
  document.getElementById('leaderboard-screen').classList.add('active');
  loadLeaderboard(currentScore);
}

export function hideLeaderboard() {
  document.getElementById('leaderboard-screen').classList.remove('active');
}

export async function fetchPlayerBestScore(playerName) {
  try {
    const scoresRef = ref(db, 'scores');
    onValue(scoresRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { state.playerBestScore = 0; return; }

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
