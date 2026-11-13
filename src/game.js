// ============================================
// GAME — главный цикл и управление состояниями
// ============================================

import { STEP, clamp } from './constants.js';
import { G, P, AR, W, H, setCanvasSize, setArena } from './state.js';
import { A } from './audio.js';
import { recalc } from './player.js';
import { startWave, updateSpawns } from './waves.js';
import { updateEffects } from './effects.js';
import { updatePlayer } from './player.js';
import { updateBullets, updateEnemyBullets } from './entities/bullet.js';
import { updateDrops } from './entities/drops.js';
import { render, initBackground } from './render.js';
import { hud, syncBest, saveBest, statsHTML, banner, popChip } from './ui.js';
import { openUp } from './upgrades.js';
import { initInput } from './input.js';
import { initShopButtons } from './upgrades.js';
import { buildDiffButtons, buildKeys, initButtons, syncSound } from './ui.js';

// Canvas
let cv, ctx;

// Инициализация игры
export function initGame() {
  cv = document.getElementById('cv');
  ctx = cv.getContext('2d', { alpha: false });

  resize();
  P.x = AR.x + AR.w / 2;
  P.y = AR.y + AR.h / 2;
  recalc();
  P.hp = P.max;
  syncSound();
  syncBest();
  document.getElementById('cWave').textContent = '—';

  initBackground(ctx);
  initInput(cv);
  initButtons();
  initShopButtons();
  buildDiffButtons();
  buildKeys();

  requestAnimationFrame(frame);
}

// Изменение размера
export function resize() {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const scale = clamp(Math.round(Math.min(sw, sh) / 240), 2, 5);
  const w = Math.ceil(sw / scale);
  const h = Math.ceil(sh / scale);

  cv.width = w;
  cv.height = h;
  cv.style.width = (w * scale) + 'px';
  cv.style.height = (h * scale) + 'px';
  cv.SCALE = scale;

  ctx = cv.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  const topPx = document.getElementById('top').offsetHeight || 46;
  const botPx = document.getElementById('hud').offsetHeight || 90;
  const ti = Math.ceil(topPx / scale) + 3;
  const bi = Math.ceil(botPx / scale) + 3;

  setCanvasSize(w, h, scale);
  setArena(3, ti, w - 6, Math.max(60, h - ti - bi));

  initBackground(ctx);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function() { setTimeout(resize, 250); });

// Новый забег
export function newRun() {
  A.init();
  A.resume();
  G.runs++;
  store.set('runs', G.runs);

  G.enemies = [];
  G.bul = [];
  G.ebul = [];
  G.parts = [];
  G.drops = [];
  G.floats = [];
  G.rings = [];
  G.ghost = [];
  G.queue = [];
  G.score = 0;
  G.shards = 0;
  G.kills = 0;
  G.combo = 0;
  G.comboT = 0;
  G.mult = 1;
  G.wave = 0;
  G.boss = null;
  G.shake = 0;
  G.flash = 0;
  G.slow = 0;
  G.st = { shots: 0, hits: 0, time: 0 };

  P.lvl = {};
  P.x = AR.x + AR.w / 2;
  P.y = AR.y + AR.h / 2;
  P.vx = 0;
  P.vy = 0;
  P.inv = 1.2;
  P.dashCd = 0;
  P.dashT = 0;
  P.fireT = 0;
  P.noHit = 0;

  recalc();
  P.hp = P.max;

  document.getElementById('bossbar').classList.remove('on');
  setState('play');
  startWave(1);

  ring(P.x, P.y, 3, 40, '#22e6ff', 0.5);
  part(P.x, P.y, '#22e6ff', 16, 90, 0.5, 1);
  syncBest();
}

// Пауза
export function pause() {
  if (G.state !== 'play') return;
  setState('pause');
}

// Продолжить
export function resume() {
  if (G.state !== 'pause') return;
  setState('play');
  A.resume();
}

// В меню
export function toMenu() {
  setState('title');
  G.enemies = [];
  G.bul = [];
  G.ebul = [];
  G.drops = [];
  G.queue = [];
  G.boss = null;
  document.getElementById('bossbar').classList.remove('on');
  syncBest();
}

// Конец игры
export function gameOver() {
  setState('over');
  A.over();
  G.slow = 1;
  shake(8);
  flash(0.5, '#ff4d4d');
  part(P.x, P.y, '#ff4d4d', 46, 150, 0.9, 2);
  ring(P.x, P.y, 4, 60, '#ff4d4d', 0.8);

  const rec = saveBest();
  document.getElementById('overRec').innerHTML = rec ? '<span class="rec">НОВЫЙ РЕКОРД</span>' : '';
  document.getElementById('overSub').textContent = 'Волна ' + G.wave + ' · ' + DIFF[G.diff].n + ' · ' + G.kills + ' врагов уничтожено';
  document.getElementById('overStats').innerHTML = statsHTML();
}

// Победа
export function winRun() {
  setState('win');
  A.win();
  flash(0.35, '#9dff3c');

  const rec = saveBest();
  document.getElementById('winRec').innerHTML = rec ? '<span class="rec">НОВЫЙ РЕКОРД</span>' : '';
  document.getElementById('winStats').innerHTML = statsHTML();
}

// Главный цикл
let last = performance.now();
let acc = 0;

function onBeat() {
  if (G.state === 'pause') return;
  G.beat++;
  G.beats.push({ r: 3, a: 0.55 });
  const heat = G.state === 'play' ? clamp(G.enemies.length / 12 + (G.boss ? 0.5 : 0) + G.wave / 30, 0, 1) : 0.05;
  A.beat(G.beat, heat);
  if (G.state === 'play' && P.hp / P.max < 0.3 && G.beat % 2 === 0) {
    A.tone(70, 0.12, 'square', 0.12, 0.6);
  }
}

function frame(now) {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;

  G.beatT += raw;
  let guard = 0;
  while (G.beatT >= 0.4 && guard++ < 4) {
    G.beatT -= 0.4;
    onBeat();
  }

  let scale = 1;
  if (G.state === 'play') scale = G.slow > 0 ? 0.4 : 1;
  else if (G.state === 'title') scale = 0.6;
  else if (G.state === 'over' || G.state === 'win' || G.state === 'clear') scale = 0.5;
  else scale = 0.1;

  acc += raw * scale;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    update(STEP);
    acc -= STEP;
    steps++;
  }
  if (acc > STEP * 5) acc = 0;

  render(ctx);
  hud(raw);
  requestAnimationFrame(frame);
}

// Обновление игры
function update(dt) {
  G.t += dt;
  G.shake = Math.max(0, G.shake - dt * 22);
  G.flash = Math.max(0, G.flash - dt * 2.2);
  G.slow = Math.max(0, G.slow - dt);

  updateEffects(dt);

  if (G.state === 'clear') {
    G.clearT -= dt;
    if (G.clearT <= 0) {
      if (G.wave >= 10) winRun();
      else openUp();
    }
    return;
  }

  if (G.state !== 'play') return;

  G.st.time += dt;
  G.waveT += dt;

  if (G.comboT > 0) {
    G.comboT -= dt;
    if (G.comboT <= 0) {
      G.combo = 0;
      G.mult = 1;
    }
  }

  updateSpawns();
  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updateDrops(dt);

  if (G.active && !G.queue.length && !G.enemies.length) {
    waveClear();
  }
}

// Импортируем нужные модули
import { store } from './state.js';
import { DIFF } from './constants.js';
import { ring, part, shake, flash } from './effects.js';
import { setState } from './ui.js';
import { waveClear } from './waves.js';
import { updateEnemies } from './entities/enemyAI.js';
