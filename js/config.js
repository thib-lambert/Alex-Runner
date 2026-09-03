// === GAME CONSTANTS ===
export const W = 800, H = 250;
export const GROUND_Y = 220;
export const GRAVITY = 0.6;
export const JUMP_FORCE = -7;
export const JUMP_BOOST_PER_FRAME = -0.5;
export const MAX_JUMP_HOLD = 10;
export const DUCK_JUMP_FORCE = -4;
export const JUMP_COOLDOWN = 50;
export const COLLISION_ENABLED = true;
export const INSTALL_PROMPT_STORAGE_KEY = 'alexRunnerInstallPromptState';
export const IOS_SAFARI_RE = /iphone|ipad|ipod/i;
export const IOS_BROWSER_EXCLUDE_RE = /crios|fxios|edgios/i;
export const RUN_COIN_SCORE = 100;
export const MAX_RUN_COINS = 25;
export const CHALLENGE_PARTICIPATION_REWARD = 5;
export const CHALLENGE_WIN_REWARD = 25;

export const THEMES = ['larochelle', 'vendee', 'auvergne', 'lyon', 'alps'];
export const COOL_THEMES = ['larochelle', 'vendee', 'alps'];
export const WARM_THEMES = ['auvergne', 'lyon', 'mariachi'];
export const SKINS = [
	{ id: 'classic', name: 'Classique', price: 0, unlockScore: 0, jacket: '#1E5AA8', light: '#4A8BD8', dark: '#12407A' },
	{ id: 'sunset', name: 'Sunset', price: 100, unlockScore: 100, jacket: '#D65A31', light: '#F29B63', dark: '#9E321E' },
	{ id: 'mint', name: 'Mint', price: 200, unlockScore: 300, jacket: '#168C83', light: '#65C6B5', dark: '#0A5C58' },
	{ id: 'penguin', name: 'Pingouin', price: 150, unlockScore: 250, jacket: '#263746', light: '#5E7180', dark: '#14232E' },
	{ id: 'desert-bandit', name: 'Bandit du désert', price: 300, unlockScore: 750, jacket: '#B86F35', light: '#E0AA62', dark: '#70401F' },
	{ id: 'superman', name: 'Superman', price: 500, unlockScore: 1200, jacket: '#C62828', light: '#2D6BC7', dark: '#7B1111' },
	{ id: 'swiss', name: 'Suisse', price: 750, unlockScore: 1600, jacket: '#E9EEF2', light: '#FFFFFF', dark: '#B4232E' },
	{ id: 'alex-head', name: 'Tête d\'Alex', price: 1000, unlockScore: 2000, head: 'alex', jacket: '#1E5AA8', light: '#4A8BD8', dark: '#12407A' }
];

// Character colors
export const COL_SKIN = '#E8C39E';
export const COL_JACKET = '#1E5AA8';
export const COL_JACKET_LIGHT = '#4A8BD8';
export const COL_JACKET_DARK = '#12407A';
export const COL_COLLAR = '#F2F6FA';
export const COL_SHORT = '#D63031';
export const COL_SHOES = '#2D3436';
