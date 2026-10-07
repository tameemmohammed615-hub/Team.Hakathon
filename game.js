const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hud = document.getElementById('hud');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const coinValue = document.getElementById('coinValue');
const comboValue = document.getElementById('comboValue');
const levelBadge = document.getElementById('levelBadge');
const powerUpBadge = document.getElementById('powerUpBadge');
const menuScreen = document.getElementById('menuScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const panelScreen = document.getElementById('panelScreen');
const panelTitle = document.getElementById('panelTitle');
const panelContent = document.getElementById('panelContent');
const missionTicker = document.getElementById('missionTicker');
const toastContainer = document.getElementById('toastContainer');
const gameOverSummary = document.getElementById('gameOverSummary');

const STORAGE_KEYS = {
  save: 'flappyNexusSave_v1',
  leaderboard: 'flappyNexusLeaderboard_v1',
  stats: 'flappyNexusStats_v1',
};

const DEBUG_MODE = true;
const COLLISION_FORGIVENESS = 8;
const SAFE_GAP_MARGIN = 10;
const MIN_GAP = 180;
const MAX_GAP = 260;

const MODES = [
  { id: 'easy', name: 'Easy' },
  { id: 'classic', name: 'Classic' },
  { id: 'timeattack', name: 'Time Attack' },
  { id: 'hardcore', name: 'Hardcore' },
  { id: 'zen', name: 'Zen' },
  { id: 'chaos', name: 'Chaos' },
  { id: 'bossrush', name: 'Boss Rush' },
  { id: 'infinite', name: 'Infinite' },
];

const CHARACTERS = [
  'Cyber Bird',
  'Phoenix',
  'Dragon',
  'Robot Bird',
  'Neon Eagle',
  'Space Falcon',
];

const TRAILS = ['Fire', 'Lightning', 'Galaxy', 'Plasma', 'Rainbow', 'Digital'];
const WINGS = ['Mechanical', 'Energy', 'Crystal', 'Holographic'];
const POWERUP_META = {
  shield: { label: 'Shield', color: '#7af7be' },
  slow: { label: 'Slow Motion', color: '#6ff7ff' },
  magnet: { label: 'Magnet', color: '#5ea8ff' },
  double: { label: 'Double Score', color: '#ffd06a' },
  ghost: { label: 'Ghost Mode', color: '#bb88ff' },
  timewarp: { label: 'Time Warp', color: '#ff8ae2' },
  boost: { label: 'Energy Boost', color: '#ff9d5c' },
};

const THEMES = [
  { name: 'Dawn', skyTop: '#7ad5ff', skyBottom: '#f3c8b9', glow: '#ffe9af' },
  { name: 'Day', skyTop: '#7cc8ff', skyBottom: '#dfeeff', glow: '#d4f2ff' },
  { name: 'Sunset', skyTop: '#ff9d6c', skyBottom: '#4a2b7d', glow: '#ffd99e' },
  { name: 'Night', skyTop: '#09162d', skyBottom: '#1b2c54', glow: '#7ef3ff' },
  { name: 'Cyber City', skyTop: '#0d1b36', skyBottom: '#1f3262', glow: '#6ef6ff' },
  { name: 'Space', skyTop: '#100818', skyBottom: '#1d2a5f', glow: '#d598ff' },
  { name: 'Galaxy', skyTop: '#1b0f2d', skyBottom: '#32175d', glow: '#ff7ad9' },
  { name: 'Black Hole', skyTop: '#070a12', skyBottom: '#1c0d1b', glow: '#ff5fd2' },
];

const WEATHER_EVENTS = ['Rain', 'Thunderstorm', 'Wind', 'Snow', 'Meteor Shower', 'Solar Flare', 'Fog'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class SaveManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    const fallback = {
      highScore: 0,
      coins: 0,
      bestCombo: 1,
      achievements: {},
      unlockedChars: ['Cyber Bird'],
      unlockedTrails: ['Fire'],
      unlockedWings: ['Mechanical'],
      selectedCharacter: 'Cyber Bird',
      selectedTrail: 'Fire',
      selectedWing: 'Mechanical',
      settings: { music: 0.7, sfx: 0.8, mute: false, reducedMotion: false, highContrast: false },
      stats: {
        totalGames: 0,
        totalDistance: 0,
        totalCoins: 0,
        totalNearMisses: 0,
        totalPowerUps: 0,
        bestCombo: 1,
        longestSurvival: 0,
        bossesSurvived: 0,
        favoriteCharacter: 'Cyber Bird',
      },
      leaderboard: [],
      missions: [],
      modeProgress: {},
      lastPlayedMode: 'classic',
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.save);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return { ...fallback, ...parsed, settings: { ...fallback.settings, ...(parsed.settings || {}) } };
    } catch (error) {
      console.warn('LocalStorage unavailable or invalid; falling back to defaults.', error);
      return fallback;
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEYS.save, JSON.stringify(this.data));
      return true;
    } catch (error) {
      console.warn('Unable to save game state.', error);
      return false;
    }
  }

  addLeaderboardEntry(score, coins, combo) {
    const list = this.data.leaderboard || [];
    list.push({
      name: 'Pilot',
      score,
      coins,
      combo,
      date: new Date().toLocaleDateString(),
    });
    this.data.leaderboard = list.sort((a, b) => b.score - a.score).slice(0, 8);
    this.save();
  }

  unlockAchievement(id) {
    if (!this.data.achievements[id]) {
      this.data.achievements[id] = true;
      this.save();
      return true;
    }
    return false;
  }

  unlockItem(type, item) {
    const key = type === 'char' ? 'unlockedChars' : type === 'trail' ? 'unlockedTrails' : 'unlockedWings';
    const list = this.data[key] || [];
    if (!list.includes(item)) {
      list.push(item);
      this.data[key] = list;
      this.save();
      return true;
    }
    return false;
  }
}

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.musicTimer = 0;
    this.initialized = false;
    this.settings = { music: 0.7, sfx: 0.8, mute: false };
  }

  setup() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.18;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.06;
      this.musicGain.connect(this.masterGain);
      this.initialized = true;
    } catch (error) {
      console.warn('Web Audio unavailable.', error);
    }
  }

  applySettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (this.masterGain) {
      const volume = this.settings.mute ? 0 : this.settings.sfx;
      this.masterGain.gain.value = 0.18 * volume;
      if (this.musicGain) {
        this.musicGain.gain.value = this.settings.mute ? 0 : this.settings.music * 0.08;
      }
    }
  }

  playTone(freq = 440, duration = 0.08, type = 'sine', volume = 0.04, slide = 0) {
    if (!this.ctx || this.settings.mute) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playSfx(name) {
    this.setup();
    const sounds = {
      flap: () => this.playTone(440, 0.08, 'triangle', 0.06, 130),
      coin: () => this.playTone(980, 0.08, 'sine', 0.07, 350),
      power: () => this.playTone(620, 0.16, 'square', 0.06, 220),
      near: () => this.playTone(330, 0.12, 'sawtooth', 0.08, -110),
      combo: () => this.playTone(720, 0.14, 'triangle', 0.08, 180),
      hit: () => this.playTone(180, 0.18, 'sawtooth', 0.11, -70),
      ach: () => this.playTone(680, 0.12, 'triangle', 0.09, 260),
      button: () => this.playTone(760, 0.05, 'square', 0.04, 80),
      boss: () => this.playTone(220, 0.25, 'sawtooth', 0.1, -50),
    };
    if (sounds[name]) sounds[name]();
  }

  startMusic() {
    if (!this.ctx || this.settings.mute) return;
    const notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440, 392.0];
    this.musicTimer += 1;
    const index = this.musicTimer % notes.length;
    const note = notes[index];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    gain.gain.value = 0.02;
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.22);
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  addBurst(x, y, color, count = 18, speed = 160) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x,
        y,
        vx: randomBetween(-1, 1) * speed,
        vy: randomBetween(-1, 1) * speed,
        life: randomBetween(0.35, 0.9),
        maxLife: randomBetween(0.35, 0.9),
        color,
        radius: randomBetween(1.5, 4.5),
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 97 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      if (p.color.startsWith('#')) {
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 150;
    this.y = 290;
    this.width = 30;
    this.height = 22;
    this.radius = 18;
    this.vy = 0;
    this.rotation = 0;
    this.flapPower = 350;
    this.gravity = 900;
    this.maxFallSpeed = 500;
    this.shield = 0;
    this.ghostTimer = 0;
    this.boostTimer = 0;
    this.slowTime = 0;
    this.timeWarpCooldown = 0;
    this.hitboxPadding = 3;
  }

  getHitbox() {
    const hitWidth = this.width * 0.6;
    const hitHeight = this.height * 0.6;
    return {
      x: this.x - hitWidth / 2 + this.hitboxPadding,
      y: this.y - hitHeight / 2 + this.hitboxPadding,
      width: hitWidth - this.hitboxPadding * 2,
      height: hitHeight - this.hitboxPadding * 2,
    };
  }

  update(dt, world) {
    const drag = world.state === 'playing' ? 1 : 0;
    this.vy += this.gravity * dt * (world.gravityDir || 1);
    this.vy = clamp(this.vy, -650, this.maxFallSpeed);

    if (this.boostTimer > 0) {
      this.flapPower = 430;
      this.boostTimer -= dt;
    } else {
      this.flapPower = 350;
    }

    if (this.ghostTimer > 0) this.ghostTimer -= dt;
    if (this.timeWarpCooldown > 0) this.timeWarpCooldown -= dt;

    this.y += this.vy * dt * drag;
    this.rotation = clamp(this.vy / 650, -1.2, 1.45);

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = 0;
    }

    if (this.y + this.radius > world.height) {
      this.y = world.height - this.radius;
      this.vy = 0;
      world.gameOver();
    }
  }

  flap() {
    this.vy = -this.flapPower;
  }

  draw(ctx, trailColor = '#7ef3ff') {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = 'rgba(123,255,230,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dfeeff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d1a30';
    ctx.beginPath();
    ctx.arc(7, -2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8ad5';
    ctx.beginPath();
    ctx.moveTo(this.radius + 4, 0);
    ctx.lineTo(this.radius + 16, 5);
    ctx.lineTo(this.radius + 16, -5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = trailColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(-30, 9);
    ctx.moveTo(-18, -4);
    ctx.lineTo(-30, -9);
    ctx.stroke();

    if (this.shield > 0) {
      ctx.strokeStyle = 'rgba(122,247,190,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class DifficultyManager {
  constructor() {
    this.baseSpeed = 220;
    this.targetSpeed = 220;
    this.adaptiveGapBonus = 0;
    this.adaptiveSpeedBonus = 0;
    this.level = 1;
  }

  getLevel(score) {
    if (score < 10) return 1;
    if (score < 25) return 2;
    if (score < 50) return 3;
    if (score < 100) return 4;
    return 5;
  }

  getSettings(score, mode, playerStats) {
    const level = this.getLevel(score);
    this.level = level;

    let speed = this.baseSpeed + score * 1.5;
    let gap = 220;
    let spawnRate = 1.5;

    if (mode === 'easy') {
      speed *= 0.82;
      gap += 34;
      spawnRate *= 1.2;
    }
    if (mode === 'zen') {
      speed *= 0.7;
      gap += 40;
      spawnRate *= 1.25;
    }
    if (mode === 'hardcore') {
      speed *= 1.18;
      gap -= 12;
    }
    if (mode === 'timeattack') {
      speed *= 1.08;
      gap -= 6;
    }
    if (mode === 'chaos') {
      speed *= 1.2;
      gap -= 10;
    }
    if (mode === 'bossrush') {
      speed *= 1.4;
      gap -= 14;
    }
    if (mode === 'infinite') {
      speed *= 1.6;
      gap -= 20;
    }

    if (playerStats && playerStats.collisionFrequency > 0.9) {
      gap += 26;
      speed *= 0.96;
    } else if (playerStats && playerStats.successRate > 0.8) {
      speed *= 1.06;
      gap -= 8;
    }

    gap = clamp(gap, MIN_GAP, MAX_GAP);

    return {
      speed: speed + this.adaptiveSpeedBonus,
      gap: gap + this.adaptiveGapBonus,
      spawnRate,
      level,
    };
  }
}

class Obstacle {
  constructor(x, gapTop, gapHeight, type = 'gate') {
    this.x = x;
    this.width = 76;
    this.gapHeight = gapHeight;
    this.gapTop = gapTop;
    this.gapBottom = gapTop + gapHeight;
    this.type = type;
    this.passed = false;
    this.hit = false;
    this.moving = false;
    this.offset = 0;
    this.direction = 1;
    this.phase = Math.random() * Math.PI * 2;
    this.color = '#70d0ff';
    this.baseCenter = gapTop + gapHeight / 2;
    this.amplitude = 0;
    this.frequency = 1;
    this.maxOffset = 0;
    this.baseGapTop = gapTop;
  }

  update(dt, settings) {
    this.x -= settings.speed * dt;
    if (this.moving) {
      this.phase += dt * this.frequency;
      this.offset = Math.sin(this.phase) * this.maxOffset;
      this.gapTop = this.baseGapTop + this.offset;
      this.gapBottom = this.gapTop + this.gapHeight;
      this.baseCenter = this.gapTop + this.gapHeight / 2;
    }
  }

  draw(ctx, settings) {
    const bodyX = this.x;
    const gapTop = this.gapTop;
    const gapBottom = this.gapBottom;

    ctx.fillStyle = 'rgba(17, 28, 53, 0.9)';
    ctx.fillRect(bodyX, 0, this.width, gapTop);
    ctx.fillRect(bodyX, gapBottom, this.width, settings.height - gapBottom);

    ctx.fillStyle = this.color;
    ctx.fillRect(bodyX + 4, 4, this.width - 8, Math.max(8, gapTop - 8));
    ctx.fillRect(bodyX + 4, gapBottom + 8, this.width - 8, Math.max(8, settings.height - (gapBottom + 8)));

    if (this.type === 'laser') {
      ctx.strokeStyle = 'rgba(255, 80, 90, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bodyX + this.width * 0.5, 0);
      ctx.lineTo(bodyX + this.width * 0.5, settings.height);
      ctx.stroke();
    }

    if (this.type === 'portal') {
      ctx.strokeStyle = 'rgba(255, 130, 230, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bodyX + this.width * 0.5, gapTop + this.gapHeight * 0.5, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (DEBUG_MODE) {
      ctx.strokeStyle = '#7ef3ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + COLLISION_FORGIVENESS, gapTop + SAFE_GAP_MARGIN, this.width - COLLISION_FORGIVENESS * 2, this.gapHeight - SAFE_GAP_MARGIN * 2);
    }
  }
}

class Coin {
  constructor(x, y, radius = 10) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.collected = false;
    this.spin = Math.random() * Math.PI * 2;
  }

  update(dt, speed) {
    this.x -= speed * dt;
    this.spin += dt * 10;
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.spin) * 0.18;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff2b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 16;
    this.collected = false;
    this.spin = Math.random() * Math.PI * 2;
  }

  update(dt, speed) {
    this.x -= speed * dt;
    this.spin += dt * 5;
  }

  draw(ctx) {
    const meta = POWERUP_META[this.type] || POWERUP_META.shield;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10192a';
    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.label[0], 0, 1);
    ctx.restore();
  }
}

class WeatherSystem {
  constructor() {
    this.current = 'Day';
    this.themeIndex = 1;
    this.event = 'Clear';
    this.fade = 0;
  }

  update(dt, score) {
    const themeIndex = Math.min(THEMES.length - 1, Math.floor(score / 15) % THEMES.length);
    this.themeIndex = themeIndex;
    this.current = THEMES[this.themeIndex].name;
    this.fade += dt * 0.5;
  }

  getTheme() {
    return THEMES[this.themeIndex] || THEMES[1];
  }

  drawBackground(ctx, width, height) {
    const theme = this.getTheme();
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 24; i += 1) {
      const x = (i * 72 + (this.fade * 12)) % (width + 80);
      const y = (i * 35) % 180;
      ctx.beginPath();
      ctx.arc(x, y + 18, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(width * (0.2 + i * 0.2), height * (0.26 + (i % 2) * 0.08), 32 + i * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class AchievementManager {
  constructor(saveManager) {
    this.save = saveManager;
    this.list = [
      { id: 'firstFlight', title: 'First Flight', condition: (stats) => stats.score >= 10 },
      { id: 'skyMaster', title: 'Sky Master', condition: (stats) => stats.score >= 50 },
      { id: 'untouchable', title: 'Untouchable', condition: (stats) => stats.score >= 100 && stats.shieldUsed === 0 },
      { id: 'coinHunter', title: 'Coin Hunter', condition: (stats) => stats.coins >= 100 },
      { id: 'nearMissKing', title: 'Near Miss King', condition: (stats) => stats.nearMisses >= 20 },
      { id: 'survivor', title: 'Survivor', condition: (stats) => stats.bossSurvived >= 1 },
      { id: 'speedDemon', title: 'Speed Demon', condition: (stats) => stats.maxDifficulty >= 5 },
    ];
  }

  check(stats) {
    const unlocked = [];
    for (const item of this.list) {
      if (!this.save.data.achievements[item.id] && item.condition(stats)) {
        this.save.unlockAchievement(item.id);
        unlocked.push(item.title);
      }
    }
    return unlocked;
  }
}

class MissionManager {
  constructor(saveManager) {
    this.save = saveManager;
    this.missions = [
      { id: 'score30', label: 'Score 30 points', target: 30, type: 'score' },
      { id: 'coins50', label: 'Collect 50 coins', target: 50, type: 'coins' },
      { id: 'near5', label: 'Perform 5 near misses', target: 5, type: 'nearMisses' },
      { id: 'weather2', label: 'Survive 2 weather events', target: 2, type: 'weather' },
      { id: 'power3', label: 'Use 3 power-ups', target: 3, type: 'power' },
    ];
  }

  getCurrentMissions() {
    return this.missions;
  }

  calcProgress(runStats) {
    return {
      score: Math.min(runStats.score, 30),
      coins: Math.min(runStats.coinsCollected, 50),
      nearMisses: Math.min(runStats.nearMisses, 5),
      weather: Math.min(runStats.weatherEvents, 2),
      power: Math.min(runStats.powerUpsUsed, 3),
    };
  }
}

class Game {
  constructor() {
    this.canvas = canvas;
    this.ctx = ctx;
    this.save = new SaveManager();
    this.audio = new AudioManager();
    this.audio.applySettings(this.save.data.settings);
    this.particles = new ParticleSystem();
    this.weather = new WeatherSystem();
    this.achievementManager = new AchievementManager(this.save);
    this.missionManager = new MissionManager(this.save);
    this.difficulty = new DifficultyManager();
    this.input = { flapQueued: false };
    this.mode = 'easy';
    this.state = 'ready';
    this.readyPrompt = 'TAP / SPACE TO FLY';
    this.width = 0;
    this.height = 0;
    this.lastTime = 0;
    this.bgOffset = 0;
    this.nearMisses = 0;
    this.totalPowerUps = 0;
    this.gameTime = 0;
    this.obstacles = [];
    this.coins = [];
    this.powerUps = [];
    this.effects = [];
    this.spawnCooldown = 0.8;
    this.coinCooldown = 0.7;
    this.BOSS_MILESTONES = [50, 100, 200];

    this.runStats = {
      score: 0,
      coinsCollected: 0,
      nearMisses: 0,
      powerUpsUsed: 0,
      weatherEvents: 0,
      shieldUsed: 0,
      bossSurvived: 0,
      maxDifficulty: 1,
      totalFlaps: 0,
    };

    this.player = new Player();
    this.score = 0;
    this.coinsTotal = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.activePowerUp = null;
    this.activePowerTimes = {};
    this.gravityDir = 1;
    this.freezeTimer = 0;
    this.flashTimer = 0;
    this.bossActive = false;
    this.bossTimer = 0;

    this.attachEvents();
    this.resize();
    this.resetRun();
    this.showReadyState();
    this.updateHUD();
    this.renderPanels();
    this.renderMissionTicker();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    window.__game = this;
  }

  showReadyState() {
    this.state = 'ready';
    this.readyPrompt = 'TAP / SPACE TO FLY';
    menuScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    panelScreen.classList.add('hidden');
    hud.classList.remove('hidden');
  }

  attachEvents() {
    const handleFlap = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      if (this.state === 'ready') {
        this.state = 'playing';
        this.player.flap();
        this.audio.playSfx('flap');
        this.readyPrompt = 'FLYING';
        this.updateHUD();
        return;
      }
      if (this.state === 'menu') {
        this.startGame(this.mode || 'classic');
        return;
      }
      if (this.state === 'gameover') {
        return;
      }
      if (this.state === 'paused') {
        return;
      }
      this.input.flapQueued = true;
      if (this.state === 'playing') {
        this.player.flap();
        this.audio.playSfx('flap');
      }
    };

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        handleFlap(event);
      }
      if (event.key.toLowerCase() === 'p') {
        this.togglePause();
      }
      if (event.key.toLowerCase() === 'r' && this.state === 'gameover') {
        this.restartGame();
      }
    });

    this.canvas.addEventListener('pointerdown', handleFlap);
    window.addEventListener('resize', () => this.resize());

    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });

    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      this.handleAction(target.dataset.action);
    });
  }

  handleAction(action) {
    const actions = {
      play: () => this.startGame(this.mode || 'classic'),
      'play-again': () => this.restartGame(),
      resume: () => this.togglePause(),
      restart: () => this.restartGame(),
      menu: () => this.showMenu(),
      modes: () => this.openPanel('Game Modes', this.renderModesPanel()),
      customize: () => this.openPanel('Customize', this.renderCustomizePanel()),
      achievements: () => this.openPanel('Achievements', this.renderAchievementsPanel()),
      stats: () => this.openPanel('Statistics', this.renderStatsPanel()),
      settings: () => this.openPanel('Settings', this.renderSettingsPanel()),
      howto: () => this.openPanel('How to Play', this.renderHowToPlayPanel()),
      'close-panel': () => this.closePanel(),
    };

    if (action && action.startsWith('mode-')) {
      const selectedMode = action.replace('mode-', '');
      this.mode = selectedMode;
      this.toast(`${selectedMode.toUpperCase()} READY`);
      this.openPanel('Game Modes', this.renderModesPanel());
      return;
    }

    if (actions[action]) actions[action]();
  }

  renderPanels() {
    this.renderModesPanel();
    this.renderCustomizePanel();
    this.renderAchievementsPanel();
    this.renderStatsPanel();
    this.renderSettingsPanel();
    this.renderHowToPlayPanel();
  }

  openPanel(title, content) {
    panelTitle.textContent = title;
    panelContent.innerHTML = content;
    panelScreen.classList.remove('hidden');
    menuScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
  }

  closePanel() {
    panelScreen.classList.add('hidden');
    if (this.state === 'menu') {
      menuScreen.classList.remove('hidden');
    } else if (this.state === 'paused') {
      pauseScreen.classList.remove('hidden');
    }
  }

  showMenu() {
    this.state = 'menu';
    menuScreen.classList.remove('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.add('hidden');
    this.closePanel();
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.width = width;
    this.height = height;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  startGame(mode = 'classic') {
    this.mode = mode;
    this.state = 'playing';
    menuScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    panelScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    this.resetRun();
    this.audio.playSfx('button');
    this.renderMissionTicker();
  }

  restartGame() {
    this.startGame(this.mode || 'classic');
  }

  resetRun() {
    this.state = 'ready';
    this.score = 0;
    this.coinsTotal = 0;
    this.nearMisses = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.gameTime = 0;
    this.spawnCooldown = 1.2;
    this.coinCooldown = 0.9;
    this.obstacles = [];
    this.coins = [];
    this.powerUps = [];
    this.effects = [];
    this.bossActive = false;
    this.bossTimer = 0;
    this.player.reset();
    this.particles.particles = [];
    this.totalPowerUps = 0;
    this.runStats = {
      score: 0,
      coinsCollected: 0,
      nearMisses: 0,
      powerUpsUsed: 0,
      weatherEvents: 0,
      shieldUsed: 0,
      bossSurvived: 0,
      maxDifficulty: 1,
      totalFlaps: 0,
    };
    this.activePowerUp = null;
    this.gravityDir = 1;
    this.flashTimer = 0;
    this.freezeTimer = 0;
    this.ensureInitialScene();
    this.updateHUD();
  }

  ensureInitialScene() {
    if (this.obstacles.length > 0) return;

    const settings = this.getCurrentSettings();
    const gap = clamp(settings.gap, MIN_GAP, MAX_GAP);
    const minTop = 90;
    const maxTop = this.height - gap - 90;
    const gapTop = clamp(this.height * 0.42, minTop, maxTop);
    const obstacle = new Obstacle(this.width * 0.75 + 80, gapTop, gap, 'gate');
    obstacle.color = '#7ec5ff';
    this.obstacles.push(obstacle);

    const coinCenterX = obstacle.x + obstacle.width * 0.6;
    const coinCenterY = gapTop + gap / 2;
    this.coins.push(...this.buildCoinPattern(coinCenterX, coinCenterY, coinCenterY));

    if (Math.random() < 0.45) {
      this.powerUps.push(new PowerUp(obstacle.x + obstacle.width + 90, randomBetween(130, this.height - 130), ['shield', 'slow', 'boost'][Math.floor(Math.random() * 3)]));
    }
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      pauseScreen.classList.remove('hidden');
      this.audio.playSfx('button');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      pauseScreen.classList.add('hidden');
      this.audio.playSfx('button');
    }
  }

  addFloatingText(text, x, y, color = '#7ef3ff', size = 18) {
    this.effects.push({
      text,
      x,
      y,
      life: 1.2,
      color,
      size,
    });
  }

  spawnObstaclePattern() {
    const settings = this.getCurrentSettings();
    const gap = clamp(settings.gap, MIN_GAP, MAX_GAP);
    const minTop = 80;
    const maxTop = this.height - gap - 80;
    let gapTop = randomBetween(minTop, maxTop);

    let previous = this.obstacles[this.obstacles.length - 1] || null;
    if (previous) {
      const previousCenter = previous.gapTop + previous.gapHeight / 2;
      const nextCandidate = randomBetween(minTop, maxTop);
      const nextCenter = nextCandidate + gap / 2;
      if (Math.abs(nextCenter - previousCenter) > 180) {
        gapTop = previousCenter - gap / 2 + randomBetween(-40, 40);
      }
    }

    gapTop = clamp(gapTop, minTop, maxTop);

    const typeRoll = Math.random();
    let type = 'gate';
    if (this.score > 25 && typeRoll > 0.7) type = 'laser';
    if (this.score > 45 && typeRoll > 0.82) type = 'portal';
    if (this.score > 60 && typeRoll > 0.9) type = 'drone';

    let obstacle = new Obstacle(this.width + 50, gapTop, gap, type);
    obstacle.color = type === 'laser' ? '#ff6e6e' : type === 'portal' ? '#ff9be4' : '#7ec5ff';
    obstacle.moving = this.score > 10 && Math.random() > 0.4;
    if (obstacle.moving) {
      obstacle.maxOffset = randomBetween(26, 80);
      obstacle.frequency = randomBetween(0.7, 1.5);
      obstacle.baseGapTop = gapTop;
    }

    if (!this.isObstaclePlayable(obstacle, previous)) {
      obstacle = new Obstacle(this.width + 50, clamp(randomBetween(110, this.height - gap - 110), minTop, maxTop), gap, type);
      obstacle.color = type === 'laser' ? '#ff6e6e' : type === 'portal' ? '#ff9be4' : '#7ec5ff';
      obstacle.moving = false;
    }

    this.obstacles.push(obstacle);

    const coinPatternRoll = Math.random();
    if (coinPatternRoll > 0.18) {
      const coinGroup = this.buildCoinPattern(obstacle.x + obstacle.width / 2, obstacle.gapTop + gap / 2, obstacle.gapTop + gap * 0.5);
      this.coins.push(...coinGroup);
    }

    if (Math.random() < 0.18) {
      const powerName = ['shield', 'slow', 'magnet', 'double', 'ghost', 'timewarp', 'boost'][Math.floor(Math.random() * 7)];
      this.powerUps.push(new PowerUp(this.width + 100, randomBetween(120, this.height - 120), powerName));
    }
  }

  buildCoinPattern(centerX, centerY, openingY) {
    const patterns = [
      () => {
        const arr = [];
        for (let i = 0; i < 5; i += 1) arr.push(new Coin(centerX + i * 24, centerY + Math.sin(i * 0.8) * 25, 8));
        return arr;
      },
      () => {
        const arr = [];
        for (let i = 0; i < 7; i += 1) arr.push(new Coin(centerX + i * 18, centerY + (i % 2 === 0 ? -18 : 18) + Math.sin(i * 1.4) * 15, 8));
        return arr;
      },
      () => {
        const arr = [];
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 / 8) * i;
          arr.push(new Coin(centerX + Math.cos(angle) * 28, centerY + Math.sin(angle) * 28, 8));
        }
        return arr;
      },
    ];
    return patterns[Math.floor(Math.random() * patterns.length)]();
  }

  getCurrentSettings() {
    const stats = {
      collisionFrequency: this.runStats.totalFlaps > 0 ? this.nearMisses / Math.max(1, this.runStats.totalFlaps) : 0,
      successRate: this.score > 0 ? (this.score / Math.max(1, this.gameTime * 10)) : 0,
    };
    return this.difficulty.getSettings(this.score, this.mode, stats);
  }

  isObstaclePlayable(obstacle, previousObstacle = null) {
    const gap = obstacle.gapHeight;
    const safeMin = Math.max(150, this.height * 0.28);
    if (gap < safeMin || gap > MAX_GAP + 20) return false;
    if (obstacle.gapTop < 60 || obstacle.gapBottom > this.height - 60) return false;
    if (previousObstacle) {
      const prevCenter = previousObstacle.gapTop + previousObstacle.gapHeight / 2;
      const nextCenter = obstacle.gapTop + obstacle.gapHeight / 2;
      if (Math.abs(nextCenter - prevCenter) > 200) return false;
    }
    return true;
  }

  update(dt) {
    this.gameTime += dt;
    this.bgOffset += dt * 55;
    this.weather.update(dt, this.score);
    this.particles.update(dt);

    if (this.state === 'ready') {
      this.ensureInitialScene();
      this.player.update(dt * 0.6, this);
      this.updateHUD();
      return;
    }

    if (this.state !== 'playing') return;

    const settings = this.getCurrentSettings();
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnObstaclePattern();
      const easyBonus = this.mode === 'easy' ? 0.35 : 0;
      this.spawnCooldown = clamp(1.65 - settings.level * 0.1 - easyBonus, 0.8, 1.65);
    }

    if (this.input.flapQueued) {
      this.player.flap();
      this.input.flapQueued = false;
      this.audio.playSfx('flap');
    }

    this.player.update(dt, this);

    for (let i = this.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = this.obstacles[i];
      obstacle.update(dt, { speed: settings.speed, height: this.height });
      if (obstacle.x + obstacle.width < -10) {
        this.obstacles.splice(i, 1);
      }
      if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
        obstacle.passed = true;
        this.score += 1;
        this.runStats.score = this.score;
        this.combo = Math.min(this.combo + 1, 9);
        this.comboTimer = 1.2;
        this.audio.playSfx('combo');
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      const coin = this.coins[i];
      coin.update(dt, settings.speed);
      if (distance(coin, this.player) < coin.radius + this.player.radius) {
        this.coins.splice(i, 1);
        this.coinsTotal += 1;
        this.runStats.coinsCollected += 1;
        this.addFloatingText('+1', coin.x, coin.y, '#ffd166', 16);
        this.particles.addBurst(coin.x, coin.y, '#ffd166', 12, 160);
        this.audio.playSfx('coin');
      } else if (coin.x < -20) {
        this.coins.splice(i, 1);
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i -= 1) {
      const power = this.powerUps[i];
      power.update(dt, settings.speed);
      if (distance(power, this.player) < power.radius + this.player.radius) {
        this.powerUps.splice(i, 1);
        this.activatePowerUp(power.type);
      } else if (power.x < -20) {
        this.powerUps.splice(i, 1);
      }
    }

    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      this.effects[i].life -= dt;
      this.effects[i].y -= 26 * dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }

    this.checkCollisions();
    this.handleNearMisses();
    this.updatePowerTimers(dt);
    this.updateHUD();

    if (this.score > this.save.data.highScore) {
      this.save.data.highScore = this.score;
      this.save.save();
    }

    if (this.score > 0 && this.score % 10 === 0) {
      const activeTheme = this.weather.getTheme();
      if (this.score % 50 === 0) {
        this.addFloatingText('BOSS ALERT', this.width * 0.5, 90, '#ff7ad9', 20);
        this.bossActive = true;
      }
      if (this.score % 15 === 0) {
        this.addFloatingText('SECTOR SHIFT', this.width * 0.5, 120, activeTheme.glow, 18);
      }
    }

    if (this.mode === 'timeattack' && this.gameTime >= 60) {
      this.gameOver();
    }

    if (this.score >= 50 && !this.bossActive) {
      this.bossActive = true;
      this.addFloatingText('DRONE GUARDIAN', this.width * 0.5, 100, '#ff7ad9', 22);
    }
  }

  updatePowerTimers(dt) {
    if (this.activePowerUp === 'shield') {
      this.player.shield = 1;
    }

    if (this.mode === 'easy') {
      this.player.gravity = 820;
      this.player.flapPower = 370;
    } else if (this.mode === 'hardcore' || this.mode === 'infinite') {
      this.player.gravity = 980;
      this.player.flapPower = 360;
    } else {
      this.player.gravity = 900;
      this.player.flapPower = 350;
    }

    if (this.activePowerUp === 'boost') {
      this.player.boostTimer = Math.max(this.player.boostTimer, 4);
      this.activePowerUp = 'boost';
    }

    if (this.activePowerUp === 'slow') {
      this.freezeTimer = clamp(this.freezeTimer + dt, 0, 6);
      this.activePowerUp = 'slow';
    }

    if (this.activePowerUp === 'ghost') {
      this.player.ghostTimer = 5;
      this.activePowerUp = 'ghost';
    }

    if (this.activePowerUp === 'double') {
      this.player.doubleTimer = 5;
      this.activePowerUp = 'double';
    }

    if (this.activePowerUp === 'timewarp') {
      if (this.player.timeWarpCooldown <= 0) {
        this.player.y = clamp(this.player.y - 60, 40, this.height - 40);
        this.player.vy *= 0.4;
        this.player.timeWarpCooldown = 8;
      }
      this.activePowerUp = null;
    }

    if (this.player.shield > 0 && this.activePowerUp === 'shield') {
      this.player.shield = clamp(this.player.shield - dt / 7, 0, 1);
      if (this.player.shield <= 0) this.activePowerUp = null;
    }

    if (this.player.ghostTimer > 0) {
      powerUpBadge.textContent = 'GHOST MODE';
      powerUpBadge.classList.remove('hidden');
    }
  }

  activatePowerUp(type) {
    if (type === 'shield') {
      this.player.shield = 1;
      this.activePowerUp = 'shield';
      this.runStats.powerUpsUsed += 1;
      this.audio.playSfx('power');
      this.addFloatingText('SHIELD', this.player.x + 30, this.player.y - 24, '#7af7be', 18);
    }
    if (type === 'slow') {
      this.activePowerUp = 'slow';
      this.runStats.powerUpsUsed += 1;
      this.freezeTimer = 5;
      this.audio.playSfx('power');
      this.addFloatingText('SLOW MO', this.player.x + 30, this.player.y - 24, '#6ff7ff', 18);
    }
    if (type === 'magnet') {
      this.activePowerUp = 'magnet';
      this.runStats.powerUpsUsed += 1;
      this.audio.playSfx('power');
      this.addFloatingText('MAGNET', this.player.x + 30, this.player.y - 24, '#5ea8ff', 18);
    }
    if (type === 'double') {
      this.activePowerUp = 'double';
      this.runStats.powerUpsUsed += 1;
      this.audio.playSfx('power');
      this.addFloatingText('DOUBLE', this.player.x + 30, this.player.y - 24, '#ffd06a', 18);
    }
    if (type === 'ghost') {
      this.activePowerUp = 'ghost';
      this.player.ghostTimer = 5;
      this.runStats.powerUpsUsed += 1;
      this.audio.playSfx('power');
      this.addFloatingText('GHOST', this.player.x + 30, this.player.y - 24, '#bb88ff', 18);
    }
    if (type === 'timewarp') {
      this.activePowerUp = 'timewarp';
      this.runStats.powerUpsUsed += 1;
      this.audio.playSfx('power');
      this.addFloatingText('TIME WARP', this.player.x + 30, this.player.y - 24, '#ff8ae2', 18);
    }
    if (type === 'boost') {
      this.activePowerUp = 'boost';
      this.player.boostTimer = 5;
      this.runStats.powerUpsUsed += 1;
      this.audio.playSfx('power');
      this.addFloatingText('BOOST', this.player.x + 30, this.player.y - 24, '#ff9d5c', 18);
    }
    this.save.data.coins += 1;
    this.save.save();
    this.updatePowerBadge();
  }

  updatePowerBadge() {
    const label = this.activePowerUp ? POWERUP_META[this.activePowerUp]?.label || this.activePowerUp.toUpperCase() : '';
    if (label) {
      powerUpBadge.textContent = label;
      powerUpBadge.classList.remove('hidden');
    } else {
      powerUpBadge.classList.add('hidden');
    }
  }

  handleNearMisses() {
    for (const obstacle of this.obstacles) {
      if (obstacle.passed || obstacle.hit) continue;
      const playerLeft = this.player.x - this.player.radius;
      const playerRight = this.player.x + this.player.radius;
      const gapBoundary = obstacle.x + obstacle.width;
      if (playerRight > gapBoundary && playerLeft < gapBoundary + 22) {
        const obstacleCenterY = obstacle.y + obstacle.height * 0.5;
        const distanceToGap = Math.abs(this.player.y - obstacleCenterY);
        if (distanceToGap < 44) {
          this.nearMisses += 1;
          this.runStats.nearMisses += 1;
          this.score += 5;
          this.addFloatingText('NEAR MISS +50', this.player.x, this.player.y - 30, '#7ef3ff', 18);
          this.particles.addBurst(this.player.x, this.player.y, '#7ef3ff', 20, 180);
          this.audio.playSfx('near');
          obstacle.passed = true;
        }
      }
    }
  }

  checkCollisions() {
    const playerHitbox = this.player.getHitbox();
    const intervalPadding = COLLISION_FORGIVENESS;

    for (const obstacle of this.obstacles) {
      const safeLeft = obstacle.x + intervalPadding;
      const safeRight = obstacle.x + obstacle.width - intervalPadding;
      const topWall = {
        x: safeLeft,
        y: 0,
        width: Math.max(0, safeRight - safeLeft),
        height: obstacle.gapTop + SAFE_GAP_MARGIN,
      };
      const bottomWall = {
        x: safeLeft,
        y: obstacle.gapBottom - SAFE_GAP_MARGIN,
        width: Math.max(0, safeRight - safeLeft),
        height: this.height - (obstacle.gapBottom - SAFE_GAP_MARGIN),
      };

      const topHit = this.rectsOverlap(playerHitbox, topWall);
      const bottomHit = this.rectsOverlap(playerHitbox, bottomWall);
      if (!topHit && !bottomHit) continue;

      if (this.player.ghostTimer > 0 || this.activePowerUp === 'ghost') {
        this.addFloatingText('GHOST', this.player.x, this.player.y - 20, '#c99cff', 16);
        obstacle.hit = true;
        continue;
      }

      if (this.player.shield > 0) {
        this.player.shield = 0;
        this.activePowerUp = null;
        this.particles.addBurst(this.player.x, this.player.y, '#7af7be', 28, 180);
        this.addFloatingText('BLOCKED!', this.player.x, this.player.y - 30, '#7af7be', 18);
        obstacle.hit = true;
        this.audio.playSfx('power');
        return;
      }

      this.gameOver();
      return;
    }
  }

  rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  gameOver() {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.audio.playSfx('hit');
    this.particles.addBurst(this.player.x, this.player.y, '#ff6969', 36, 200);
    this.save.data.highScore = Math.max(this.save.data.highScore || 0, this.score);
    this.save.data.coins = (this.save.data.coins || 0) + this.coinsTotal;
    this.save.data.bestCombo = Math.max(this.save.data.bestCombo || 1, this.combo);
    this.save.data.stats = {
      ...this.save.data.stats,
      totalGames: (this.save.data.stats.totalGames || 0) + 1,
      totalDistance: (this.save.data.stats.totalDistance || 0) + this.score,
      totalCoins: (this.save.data.stats.totalCoins || 0) + this.coinsTotal,
      totalNearMisses: (this.save.data.stats.totalNearMisses || 0) + this.nearMisses,
      totalPowerUps: (this.save.data.stats.totalPowerUps || 0) + this.runStats.powerUpsUsed,
      bestCombo: Math.max(this.save.data.stats.bestCombo || 1, this.combo),
      longestSurvival: Math.max(this.save.data.stats.longestSurvival || 0, Math.floor(this.gameTime)),
      bossesSurvived: this.save.data.stats.bossesSurvived || 0,
      favoriteCharacter: this.save.data.selectedCharacter || 'Cyber Bird',
    };
    this.save.addLeaderboardEntry(this.score, this.coinsTotal, this.combo);

    const achievements = this.achievementManager.check({
      score: this.score,
      coins: this.coinsTotal,
      nearMisses: this.nearMisses,
      shieldUsed: this.player.shield,
      bossSurvived: this.bossActive ? 1 : 0,
      maxDifficulty: this.difficulty.level,
    });
    if (achievements.length > 0) {
      this.toast(achievements[0]);
      this.audio.playSfx('ach');
    }

    const summary = [
      { label: 'Score', value: this.score },
      { label: 'Best Score', value: this.save.data.highScore },
      { label: 'Coins', value: this.coinsTotal },
      { label: 'Best Combo', value: Math.max(this.save.data.bestCombo, this.combo) },
      { label: 'Near Misses', value: this.nearMisses },
      { label: 'Power-ups', value: this.runStats.powerUpsUsed },
    ];

    gameOverSummary.innerHTML = summary.map((item) => `
      <div class="summary-item">
        <span class="label">${item.label}</span>
        <span class="value">${item.value}</span>
      </div>
    `).join('');

    this.save.save();
    gameOverScreen.classList.remove('hidden');
    hud.classList.add('hidden');
  }

  toast(message) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    toastContainer.appendChild(node);
    setTimeout(() => node.remove(), 1400);
  }

  updateHUD() {
    scoreValue.textContent = String(this.score);
    bestValue.textContent = String(this.save.data.highScore || 0);
    coinValue.textContent = String(this.coinsTotal);
    comboValue.textContent = `x${Math.max(1, this.combo)}`;
    levelBadge.textContent = `LEVEL ${this.difficulty.getLevel(this.score)}`;
    if (this.activePowerUp) {
      updatePowerBadge(this.activePowerUp);
    } else {
      powerUpBadge.classList.add('hidden');
    }
  }

  renderMissionTicker() {
    const missions = this.missionManager.getCurrentMissions();
    const mission = missions[Math.floor((this.score / 15) % missions.length)];
    missionTicker.textContent = mission ? mission.label : 'Mission Ready';
    missionTicker.classList.remove('hidden');
  }

  renderModesPanel() {
    return `
      <div class="grid-3">
        ${MODES.map((mode) => `
          <div class="card">
            <h4>${mode.name}</h4>
            <p>Play this mode and unlock deeper challenge.</p>
            <div class="button-row" style="margin-top:12px;">
              <button data-action="mode-${mode.id}" data-mode="${mode.id}">${mode.name}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderCustomizePanel() {
    return `
      <div class="grid-3">
        <div class="card">
          <h4>Characters</h4>
          <ul>${CHARACTERS.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div class="card">
          <h4>Trails</h4>
          <ul>${TRAILS.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div class="card">
          <h4>Wings</h4>
          <ul>${WINGS.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
    `;
  }

  renderAchievementsPanel() {
    return `
      <div class="grid-3">
        <div class="card">
          <h4>Unlocked</h4>
          <ul>${Object.keys(this.save.data.achievements || {}).map((key) => `<li>${key}</li>`).join('') || '<li>None yet</li>'}</ul>
        </div>
      </div>
    `;
  }

  renderStatsPanel() {
    const stats = this.save.data.stats || {};
    return `
      <div class="grid-3">
        <div class="card"><h4>Total Games</h4><p>${stats.totalGames || 0}</p></div>
        <div class="card"><h4>Total Distance</h4><p>${stats.totalDistance || 0}</p></div>
        <div class="card"><h4>Highest Score</h4><p>${this.save.data.highScore || 0}</p></div>
        <div class="card"><h4>Total Coins</h4><p>${stats.totalCoins || 0}</p></div>
        <div class="card"><h4>Near Misses</h4><p>${stats.totalNearMisses || 0}</p></div>
        <div class="card"><h4>Best Combo</h4><p>${stats.bestCombo || 1}</p></div>
      </div>
    `;
  }

  renderSettingsPanel() {
    return `
      <div class="grid-3">
        <div class="card">
          <h4>Audio</h4>
          <p>Music: ${this.save.data.settings.music ?? 0.7}</p>
          <p>SFX: ${this.save.data.settings.sfx ?? 0.8}</p>
        </div>
        <div class="card">
          <h4>Accessibility</h4>
          <p>High contrast: ${this.save.data.settings.highContrast ? 'On' : 'Off'}</p>
          <p>Reduced motion: ${this.save.data.settings.reducedMotion ? 'On' : 'Off'}</p>
        </div>
      </div>
    `;
  }

  renderHowToPlayPanel() {
    return `
      <div class="card">
        <h4>Controls</h4>
        <ul>
          <li>Press Space or click/touch to flap.</li>
          <li>Press P to pause and resume.</li>
          <li>Use a shield or ghost mode to survive risky gaps.</li>
          <li>Collect coins for score and combo boosts.</li>
        </ul>
      </div>
    `;
  }

  loop(timestamp) {
    const dt = Math.min(0.03, (timestamp - this.lastTime) / 1000 || 0.016);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  }

  draw() {
    const theme = this.weather.getTheme();
    const sky = this.ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 30; i += 1) {
      const x = ((i * 120 + this.bgOffset) % (this.width + 150)) - 60;
      const y = 30 + (i % 5) * 30 + (i % 2) * 25;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 18 + (i % 3) * 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (const obstacle of this.obstacles) {
      if (obstacle && typeof obstacle.draw === 'function') {
        obstacle.draw(this.ctx, { height: this.height });
      }
    }

    for (const coin of this.coins) {
      if (coin && typeof coin.draw === 'function') {
        coin.draw(this.ctx);
      }
    }

    for (const power of this.powerUps) {
      if (power && typeof power.draw === 'function') {
        power.draw(this.ctx);
      }
    }

    if (this.state === 'ready') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(6, 12, 24, 0.22)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#eaf6ff';
      this.ctx.font = '700 28px Segoe UI';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('READY', this.width * 0.5, this.height * 0.18);
      this.ctx.font = '600 18px Segoe UI';
      this.ctx.fillStyle = '#9fe7ff';
      this.ctx.fillText('TAP / SPACE TO FLY', this.width * 0.5, this.height * 0.22);
      this.ctx.restore();
    }

    this.player.draw(this.ctx, '#7ef3ff');
    this.particles.draw(this.ctx);

    if (DEBUG_MODE) {
      const hitbox = this.player.getHitbox();
      this.ctx.strokeStyle = '#ff7ad9';
      this.ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      for (const obstacle of this.obstacles) {
        const left = obstacle.x + COLLISION_FORGIVENESS;
        const right = obstacle.x + obstacle.width - COLLISION_FORGIVENESS;
        this.ctx.strokeStyle = '#7ef3ff';
        this.ctx.strokeRect(left, 0, Math.max(0, right - left), obstacle.gapTop + SAFE_GAP_MARGIN);
        this.ctx.strokeRect(left, obstacle.gapBottom - SAFE_GAP_MARGIN, Math.max(0, right - left), this.height - (obstacle.gapBottom - SAFE_GAP_MARGIN));
      }
    }

    for (const effect of this.effects) {
      this.ctx.fillStyle = effect.color;
      this.ctx.font = `700 ${effect.size}px Segoe UI`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(effect.text, effect.x, effect.y);
    }

    this.ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this.ctx.fillRect(0, this.height - 18, this.width, 18);

    if (this.state === 'paused') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}

const game = new Game();

function updatePowerBadge(power) {
  const key = power || 'shield';
  const meta = POWERUP_META[key] || POWERUP_META.shield;
  powerUpBadge.textContent = meta.label;
  powerUpBadge.classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', () => {
  const theme = game.weather.getTheme();
  document.body.style.background = `radial-gradient(circle at top, ${theme.skyTop}, #040816 60%)`;
  game.renderMissionTicker();
});

window.game = game;
