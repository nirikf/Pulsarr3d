// ============================================
// ENTITIES/ENEMY — создание врагов
// ============================================

import { rand, randi, pick, hyp, TAU } from '../constants.js';
import { G, P, AR, nextEid } from '../state.js';
import { DIFF, UPS } from '../constants.js';
import { SPR } from '../sprites.js';
import { ring } from '../effects.js';

// Выбор случайной точки на краю арены
export function edge() {
  const m = 14;
  const s = randi(0, 3);
  if (s === 0) return { x: rand(AR.x, AR.x + AR.w), y: AR.y - m };
  if (s === 1) return { x: AR.x + AR.w + m, y: rand(AR.y, AR.y + AR.h) };
  if (s === 2) return { x: rand(AR.x, AR.x + AR.w), y: AR.y + AR.h + m };
  return { x: AR.x - m, y: rand(AR.y, AR.y + AR.h) };
}

// Создание врага
export function makeEnemy(type, x, y) {
  const D = DIFF[G.diff];
  const sc = 1 + 0.1 * (G.wave - 1);
  const e = {
    id: nextEid(),
    type,
    x, y,
    vx: 0, vy: 0,
    fl: 0,
    dead: false,
    t: rand(0, 9),
    hitT: 0,
    tel: 0,
    sub: 0,
    ang: rand(0, TAU),
    st: 'walk',
    cd: rand(1, 3),
    lock: 0
  };

  if (type === 'grunt') {
    e.r = 5; e.hp = 20 * sc * D.hp; e.sp = 40 * D.sp; e.dmg = 8 * D.dmg;
    e.pts = 10; e.sh = 1; e.spr = SPR.grunt; e.col = '#ff2fb0';
  } else if (type === 'mini') {
    e.r = 3.5; e.hp = 9 * sc * D.hp; e.sp = 62 * D.sp; e.dmg = 5 * D.dmg;
    e.pts = 5; e.sh = Math.random() < 0.4 ? 1 : 0; e.spr = SPR.mini; e.col = '#a86bff';
  } else if (type === 'shooter') {
    e.r = 6; e.hp = 26 * sc * D.hp; e.sp = 26 * D.sp; e.dmg = 7 * D.dmg;
    e.pts = 18; e.sh = 2; e.spr = SPR.shooter; e.col = '#ffb020';
    e.cd = rand(0.7, 1.8);
  } else if (type === 'splitter') {
    e.r = 6.5; e.hp = 34 * sc * D.hp; e.sp = 30 * D.sp; e.dmg = 10 * D.dmg;
    e.pts = 22; e.sh = 2; e.spr = SPR.splitter; e.col = '#a86bff';
  } else if (type === 'tank') {
    e.r = 9; e.hp = 85 * sc * D.hp; e.sp = 20 * D.sp; e.dmg = 16 * D.dmg;
    e.pts = 45; e.sh = 4; e.spr = SPR.tank; e.col = '#ff4d4d';
    e.cd = rand(2, 3.6);
  } else if (type === 'boss') {
    const bi = G.wave >= 10 ? 2 : 1;
    e.r = 15; e.hp = (bi === 1 ? 380 : 640) * D.hp; e.sp = 22 * D.sp; e.dmg = 20 * D.dmg;
    e.pts = 600; e.sh = 20; e.spr = SPR.boss; e.col = '#ff4d4d';
    e.boss = true; e.atk = 'idle'; e.atkT = 1.6; e.phase = 1;
  }

  e.max = e.hp;
  return e;
}

// Спавн врага на краю арены
export function spawn(type) {
  const p = edge();
  const e = makeEnemy(type, p.x, p.y);
  G.enemies.push(e);
  ring(p.x, p.y, 2, 12, e.col, 0.35);
  return e;
}
