// ============================================
// SPRITES — генерация пиксельной графики
// ============================================

import { PAL, ICON } from './constants.js';

// Создание canvas-элемента
export function mkC(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Тонирование спрайта (для эффекта урона)
export function tint(src, col) {
  const c = mkC(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = col;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Генерация спрайта из строк
export function spr(rows, map) {
  let w = 0;
  for (let i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
  const c = mkC(w, rows.length);
  const g = c.getContext('2d');
  const m = map || PAL;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const col = m[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return { n: c, f: tint(c, '#ffffff'), w, h: rows.length };
}

// Генерация спрайта босса (процедурная)
function bossSprite() {
  const s = 33;
  const c = mkC(s, s);
  const g = c.getContext('2d');
  const cx = 16, cy = 16;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x - cx, dy = y - cy;
      const hex = Math.max(Math.abs(dx) * 0.88 + Math.abs(dy) * 0.5, Math.abs(dy));
      const d = Math.sqrt(dx * dx + dy * dy);
      let col = null;
      if (hex < 15.5) col = '#0a0518';
      if (hex < 14.5) col = '#ff4d4d';
      if (hex < 12) col = '#8f2020';
      if (hex < 10) col = '#150a2e';
      if (hex < 8.5) col = '#4f2a94';
      if (d < 6.2) col = '#ff2fb0';
      if (d < 4) col = '#ffb020';
      if (d < 2) col = '#ffffff';
      if ((Math.abs(dx) < 1.6 || Math.abs(dy) < 1.6) && hex > 12.5 && hex < 17) col = '#ff4d4d';
      if ((Math.abs(dx - dy) < 1.4 || Math.abs(dx + dy) < 1.4) && hex > 11 && hex < 15) col = '#8f2020';
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return { n: c, f: tint(c, '#ffffff'), w: s, h: s };
}

// Генерация спрайта орба
function orbSprite(col, lit) {
  const rows = ['.ooo.', 'oXXXo', 'oXWXo', 'oXXXo', '.ooo.'];
  return spr(rows, { o: '#0a0518', X: col, W: lit || '#ffffff' });
}

// Генерация плитки пола
function floorTile() {
  const t = mkC(16, 16);
  const g = t.getContext('2d');
  g.fillStyle = '#150a2e';
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#1b0f38';
  for (let y = 0; y < 16; y += 2) {
    for (let x = ((y / 2) % 2) * 2; x < 16; x += 4) {
      g.fillRect(x, y, 1, 1);
    }
  }
  g.fillStyle = '#241452';
  g.fillRect(0, 0, 16, 1);
  g.fillRect(0, 0, 1, 16);
  g.fillStyle = '#2e1a63';
  g.fillRect(7, 7, 2, 2);
  g.fillStyle = '#0f0726';
  g.fillRect(15, 0, 1, 16);
  g.fillRect(0, 15, 16, 1);
  return t;
}

// Иконка модуля
export function iconCanvas(k, col, scale) {
  const rows = ICON[k] || ICON.cal;
  const c = mkC(9, 9);
  const g = c.getContext('2d');
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      g.fillStyle = (ch === 'o') ? '#0a0518' : (ch === 'w' ? '#ffffff' : col);
      g.fillRect(x, y, 1, 1);
    }
  }
  const out = mkC(9, 9);
  out.getContext('2d').drawImage(c, 0, 0);
  out.style.width = (9 * (scale || 4)) + 'px';
  out.style.height = (9 * (scale || 4)) + 'px';
  return out;
}

// ============================================
// СПРАЙТЫ (экспортируются)
// ============================================

export const SPR = {};

// Игрок
SPR.ship = spr([
  '.....oo......',
  '....occo.....',
  '...ocCwco....',
  '..ocCwWwco...',
  '.ogcCwWwCco..',
  'oggcCwWWwCcoo',
  '.ogcCwWwCco..',
  '..ocCwWwco...',
  '...ocCwco....',
  '....occo.....',
  '.....oo......'
]);

// Враги
SPR.grunt = spr([
  '....oo.....',
  '...ommo....',
  '..omMMmo...',
  '.omMwwMmo..',
  'omMwWWwMmo.',
  'omMwWWwMmoo',
  'omMwWWwMmo.',
  '.omMwwMmo..',
  '..omMMmo...',
  '...ommo....',
  '....oo.....'
]);

SPR.mini = spr([
  '..oo...',
  '.ovvo..',
  'ovVWvo.',
  'ovwVvoo',
  'ovVVvo.',
  '.ovvo..',
  '..oo...'
]);

SPR.shooter = spr([
  '...ooooo.....',
  '..oaaaaao....',
  '.oaAAAAAao...',
  'oaAAaaaAAao..',
  'oaAawwwAaAao.',
  'oaAawWWwaAaoo',
  'oaAawWWwaAaoo',
  'oaAawwwAaAao.',
  'oaAAaaaAAao..',
  '.oaAAAAAao...',
  '..oaaaaao....',
  '...ooooo.....'
]);

SPR.splitter = spr([
  '..ooooooooo..',
  '.ovvvvvvvvvo.',
  'ovVVVVVVVVVvo',
  'ovVvvvvvvvVvo',
  'ovVvVVVVVvVvo',
  'ovVvVwwwVvVvo',
  'ovVvVwWwVvVvo',
  'ovVvVwwwVvVvo',
  'ovVvVVVVVvVvo',
  'ovVvvvvvvvVvo',
  'ovVVVVVVVVVvo',
  '.ovvvvvvvvvo.',
  '..ooooooooo..'
]);

SPR.tank = spr([
  '......ooooooo........',
  '....oorrrrrrroo......',
  '..oorRRRRRRRRRroo....',
  '.orRRRRRRRRRRRRRro...',
  'orRRRrrrrrrrrrRRRro..',
  'orRRrRRRRRRRRRrRRRro.',
  'orRrRRRwwwwwRRRrRRro.',
  'orRrRRwwWWWwwRRrRRroo',
  'orRrRRwWWWWWwRRrRRrro',
  'orRrRRwwWWWwwRRrRRroo',
  'orRrRRRwwwwwRRRrRRro.',
  'orRRrRRRRRRRRRrRRRro.',
  'orRRRrrrrrrrrrRRRro..',
  '.orRRRRRRRRRRRRRro...',
  '..oorRRRRRRRRRroo....',
  '....oorrrrrrroo......',
  '......ooooooo........'
]);

// Дропы
SPR.shard = spr([
  '...o...',
  '..omo..',
  '.omMmo.',
  'omwWMmo',
  '.omMmo.',
  '..omo..',
  '...o...'
]);

SPR.med = spr([
  '..ooooo..',
  '..ogggo..',
  '..ogGgo..',
  'ooggGggoo',
  'ogGGWGGgo',
  'ooggGggoo',
  '..ogGgo..',
  '..ogggo..',
  '..ooooo..'
]);

SPR.drone = spr([
  '..oo...',
  '.oggo..',
  'ogGwgo.',
  'ogwWGgo',
  'ogGwgo.',
  '.oggo..',
  '..oo...'
]);

SPR.bolt = spr([
  '.ccC',
  'cCWW',
  'cCWW',
  '.ccC'
]);

// Босс и орбы
SPR.boss = bossSprite();
SPR.orbM = orbSprite('#ff2fb0', '#ffd6f2');
SPR.orbA = orbSprite('#ffb020', '#fff0cf');
SPR.orbR = orbSprite('#ff4d4d', '#ffd9d9');
SPR.orbV = orbSprite('#a86bff', '#e8dcff');

// Плитка пола
export const floorPattern = floorTile();
