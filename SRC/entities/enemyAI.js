// ============================================
// ENTITIES/ENEMYAI — поведение врагов и боссов
// ============================================

import { TAU, hyp, rand, pick, clamp } from '../constants.js';
import { G, P, AR } from '../state.js';
import { DIFF } from '../constants.js';
import { eShoot } from './bullet.js';
import { makeEnemy } from './enemy.js';
import { hurtPlayer, damageEnemy } from '../combat.js';
import { part, ring } from '../effects.js';
import { A } from '../audio.js';

// Обновление всех врагов
export function updateEnemies(dt) {
  let i, e;

  for (i = 0; i < G.enemies.length; i++) {
    e = G.enemies[i];
    if (e.dead) continue;

    e.t += dt;
    e.fl = Math.max(0, e.fl - dt);
    e.hitT = Math.max(0, e.hitT - dt);

    const dx = P.x - e.x;
    const dy = P.y - e.y;
    const d = hyp(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;

    if (e.boss) {
      bossAI(e, dt, ux, uy, d);
    } else if (e.type === 'shooter') {
      updateShooter(e, dt, d, ux, uy, dx, dy);
    } else if (e.type === 'tank') {
      updateTank(e, dt, d, ux, uy, dx, dy);
    } else {
      updateWalker(e, dt, ux, uy);
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = clamp(e.x, AR.x - 20, AR.x + AR.w + 20);
    e.y = clamp(e.y, AR.y - 20, AR.y + AR.h + 20);

    // Столкновение с игроком
    if (d < e.r + P.r && e.hitT <= 0) {
      hurtPlayer(e.dmg * (e.st === 'charge' ? 1.3 : 1));
      e.hitT = 0.6;
      e.vx -= ux * 70;
      e.vy -= uy * 70;
      P.vx += ux * 50;
      P.vy += uy * 50;
    }
  }

  // Расталкивание врагов
  for (i = 0; i < G.enemies.length; i++) {
    const a1 = G.enemies[i];
    if (a1.dead) continue;
    for (let j2 = i + 1; j2 < G.enemies.length; j2++) {
      const b1 = G.enemies[j2];
      if (b1.dead) continue;
      const ddx = b1.x - a1.x;
      const ddy = b1.y - a1.y;
      const rr = a1.r + b1.r;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < rr * rr && d2 > 0.01) {
        const dd = Math.sqrt(d2);
        const ff = (rr - dd) / dd * 0.4;
        if (!a1.boss) { a1.x -= ddx * ff; a1.y -= ddy * ff; }
        if (!b1.boss) { b1.x += ddx * ff; b1.y += ddy * ff; }
      }
    }
  }

  // Удаление мёртвых
  G.enemies = G.enemies.filter(function(en) { return !en.dead; });
}

// Стрелок (шутер)
function updateShooter(e, dt, d, ux, uy, dx, dy) {
  let tx = 0, ty = 0;
  if (d < 70) { tx = -ux; ty = -uy; }
  else if (d > 110) { tx = ux; ty = uy; }
  else { tx = -uy; ty = ux; }

  e.vx += (tx * e.sp - e.vx) * Math.min(1, 4 * dt);
  e.vy += (ty * e.sp - e.vy) * Math.min(1, 4 * dt);

  e.cd -= dt;
  e.tel = e.cd < 0.3 ? 1 : 0;

  if (e.cd <= 0) {
    e.cd = rand(1.5, 2.2) / DIFF[G.diff].sp;
    eShoot(e, Math.atan2(dy, dx), 95, 8 * DIFF[G.diff].dmg, SPR.orbA);
    part(e.x, e.y, '#ffb020', 3, 50, 0.2, 1);
    A.tone(300, 0.06, 'square', 0.04, 0.6);
  }
}

// Танк
function updateTank(e, dt, d, ux, uy, dx, dy) {
  if (e.st === 'walk') {
    e.vx += (ux * e.sp - e.vx) * Math.min(1, 3 * dt);
    e.vy += (uy * e.sp - e.vy) * Math.min(1, 3 * dt);
    e.cd -= dt;
    if (e.cd <= 0 && d < 130) {
      e.st = 'tel';
      e.cd = 0.75;
      e.lock = Math.atan2(dy, dx);
    }
  } else if (e.st === 'tel') {
    e.cd -= dt;
    e.tel = 1;
    e.vx *= 0.86;
    e.vy *= 0.86;
    if (e.cd <= 0) {
      e.st = 'charge';
      e.cd = 0.6;
      e.tel = 0;
      A.tone(120, 0.22, 'sawtooth', 0.09, 1.8);
    }
  } else {
    e.cd -= dt;
    e.vx = Math.cos(e.lock) * 130;
    e.vy = Math.sin(e.lock) * 130;
    part(e.x, e.y, '#ff4d4d', 1, 35, 0.25, 1);
    if (e.cd <= 0) {
      e.st = 'walk';
      e.cd = rand(2.4, 3.6);
    }
  }
}

// Обычный ходок (грант, мини, сплиттер)
function updateWalker(e, dt, ux, uy) {
  const wob = (e.type === 'splitter') ? Math.sin(e.t * 3) * 0.45 : 0;
  const ax = ux * Math.cos(wob) - uy * Math.sin(wob);
  const ay = ux * Math.sin(wob) + uy * Math.cos(wob);
  e.vx += (ax * e.sp - e.vx) * Math.min(1, 5 * dt);
  e.vy += (ay * e.sp - e.vy) * Math.min(1, 5 * dt);
}

// ИИ босса
function bossAI(e, dt, ux, uy, d) {
  const fr = e.hp / e.max;
  e.phase = fr > 0.66 ? 1 : (fr > 0.33 ? 2 : 3);

  document.getElementById('bossPhase').textContent = 'ФАЗА ' + e.phase;
  document.getElementById('bossFill').style.transform = 'scaleX(' + clamp(fr, 0, 1) + ')';

  const rate = 1 + (e.phase - 1) * 0.3;

  if (e.atk === 'idle') {
    const want = 80;
    const tx2 = d > want ? ux * 30 : -ux * 30;
    const ty2 = d > want ? uy * 30 : -uy * 30;
    e.vx += (tx2 - e.vx) * Math.min(1, 2 * dt);
    e.vy += (ty2 - e.vy) * Math.min(1, 2 * dt);
    e.atkT -= dt;
    e.tel = 0;

    if (e.atkT <= 0) {
      e.atk = pick(e.phase >= 2 ? ['radial', 'spiral', 'charge', 'summon'] : ['radial', 'spiral', 'summon']);
      e.sub = 0;
      e.tel = 0.45;
      e.atkT = e.atk === 'spiral' ? 2.2 : (e.atk === 'radial' ? 1.9 : (e.atk === 'charge' ? 1.5 : 1.1));

      if (e.atk === 'charge') {
        e.lock = Math.atan2(P.y - e.y, P.x - e.x);
        A.tone(90, 0.5, 'sawtooth', 0.1, 2.2);
      }

      if (e.atk === 'summon') {
        const n = 1 + e.phase;
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU);
          const m = makeEnemy(e.phase >= 3 ? 'shooter' : 'grunt', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20);
          m.vx = Math.cos(a) * 70;
          m.vy = Math.sin(a) * 70;
          G.enemies.push(m);
          ring(m.x, m.y, 2, 11, '#ff2fb0', 0.3);
        }
        A.tone(180, 0.3, 'sawtooth', 0.09, 2);
      }
    }
  } else {
    e.atkT -= dt;

    if (e.tel > 0) {
      e.tel -= dt;
      e.vx *= 0.9;
      e.vy *= 0.9;
    } else if (e.atk === 'radial') {
      e.sub -= dt;
      e.vx *= 0.94;
      e.vy *= 0.94;
      if (e.sub <= 0) {
        e.sub = 0.6 / rate;
        e.ang += 0.24;
        const nn = 8 + e.phase * 3;
        for (let k = 0; k < nn; k++) {
          eShoot(e, e.ang + k * TAU / nn, 72, 9 * DIFF[G.diff].dmg, SPR.orbM);
        }
        ring(e.x, e.y, e.r, e.r + 16, '#ff2fb0', 0.25);
        A.tone(240, 0.1, 'square', 0.06, 0.6);
      }
    } else if (e.atk === 'spiral') {
      e.sub -= dt;
      e.vx *= 0.96;
      e.vy *= 0.96;
      if (e.sub <= 0) {
        e.sub = 0.1 / rate;
        e.ang += 0.42;
        eShoot(e, e.ang, 88, 8 * DIFF[G.diff].dmg, SPR.orbA);
        eShoot(e, e.ang + Math.PI, 88, 8 * DIFF[G.diff].dmg, SPR.orbA);
        if (e.phase >= 3) {
          eShoot(e, e.ang + Math.PI / 2, 80, 8 * DIFF[G.diff].dmg, SPR.orbV);
        }
      }
    } else if (e.atk === 'charge') {
      e.vx = Math.cos(e.lock) * 170;
      e.vy = Math.sin(e.lock) * 170;
      part(e.x, e.y, '#ff4d4d', 2, 50, 0.3, 1);
      if (e.atkT < 0.7) {
        e.vx *= 0.9;
        e.vy *= 0.9;
      }
    } else {
      e.vx *= 0.94;
      e.vy *= 0.94;
    }

    if (e.atkT <= 0) {
      e.atk = 'idle';
      e.atkT = 1.2 - (e.phase - 1) * 0.2;
      e.tel = 0;
    }
  }
}

// Импортируем нужные модули
import { SPR } from '../sprites.js';
