// ============================================
// STATE — глобальное состояние игры
// ============================================

import { DIFF } from './constants.js';

// localStorage обёртка
export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('ppix_' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('ppix_' + k, JSON.stringify(v)); } catch (e) {}
  }
};

// Состояние игры (G)
export const G = {
  state: 'title',
  t: 0,
  wave: 0,
  waveT: 0,
  score: 0,
  shards: 0,
  kills: 0,
  combo: 0,
  comboT: 0,
  mult: 1,
  diff: store.get('diff', 'normal'),
  enemies: [],
  bul: [],
  ebul: [],
  parts: [],
  drops: [],
  floats: [],
  rings: [],
  ghost: [],
  beats: [],
  queue: [],
  active: false,
  boss: null,
  shake: 0,
  flash: 0,
  flashCol: '#fff',
  slow: 0,
  clearT: 0,
  beat: 0,
  beatT: 0,
  best: store.get('best', { score: 0, wave: 0 }),
  runs: store.get('runs', 0),
  st: { shots: 0, hits: 0, time: 0 }
};

// Игрок (P)
export const P = {
  x: 0, y: 0,
  vx: 0, vy: 0,
  r: 5,
  hp: 100, max: 100,
  aim: 0,
  fireT: 0,
  dashT: 0, dashCd: 0,
  dx: 1, dy: 0,
  inv: 0, hurtT: 0,
  lvl: {},
  noHit: 0,
  focus: false,
  dT: []  // таймеры дронов
};

// Вычисляемые статы (S) — заполняются в recalc()
export const S = {};

// ID для врагов
export let eid = 0;
export function nextEid() { return ++eid; }

// Ввод
export const keys = {};
export let mx = 0, my = 0, mouseT = -99;

export function setMouse(x, y, t) {
  mx = x; my = y; mouseT = t;
}

// Тач-стики
export const sticks = {
  move: { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, m: 0 },
  aim:  { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, m: 0 }
};

// Размеры арены (заполняются в resize)
export const AR = { x: 0, y: 0, w: 0, h: 0 };
export let W = 240, H = 240, SCALE = 3;

export function setCanvasSize(w, h, scale) {
  W = w; H = h; SCALE = scale;
}

export function setArena(x, y, w, h) {
  AR.x = x; AR.y = y; AR.w = w; AR.h = h;
}

// Флаг тач-устройства
export const isTouch = (window.matchMedia && window.matchMedia('(hover:none)').matches) || ('ontouchstart' in window);
