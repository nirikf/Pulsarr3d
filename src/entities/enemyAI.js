import { TAU, hyp, rand, pick, clamp, angDiff } from '../constants.js';
import { G, P, AR } from '../state.js';
import { DIFF } from '../constants.js';
import { eShoot } from './bullet.js';
import { makeEnemy } from './enemy.js';
import { hurtPlayer, killEnemy } from '../combat.js';
import { part, ring, flash } from '../effects.js';
import { A } from '../audio.js';
import { SPR } from '../sprites.js';

const DODGE_TYPES = { shooter: 1, splitter: 1, sniper: 1, medic: 1 };

export function updateEnemies(dt) {
  planShieldGroups();

  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i]; if (e.dead) continue;
    e.t += dt; e.fl = Math.max(0, e.fl - dt); e.hitT = Math.max(0, e.hitT - dt); e.shieldFl = Math.max(0, e.shieldFl - dt);
    const dx = P.x - e.x, dy = P.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;

    if (e.boss) bossAI(e, dt, ux, uy, d);
    else if (e.type === 'shooter') updateShooter(e, dt, d, ux, uy, dx, dy);
    else if (e.type === 'tank') updateTank(e, dt, d, ux, uy, dx, dy);
    else if (e.type === 'shielder') updateShielder(e, dt, d, ux, uy, dx, dy);
    else if (e.type === 'sniper') updateSniper(e, dt, d, ux, uy);
    else if (e.type === 'medic') updateMedic(e, dt, d, ux, uy);
    else updateWalker(e, dt, ux, uy);

    if (DODGE_TYPES[e.type]) applyDodge(e, dt);

    e.x += e.vx * dt; e.y += e.vy * dt;
    e.x = clamp(e.x, AR.x + e.r, AR.x + AR.w - e.r);
    e.y = clamp(e.y, AR.y + e.r, AR.y + AR.h - e.r);

    if (d < e.r + P.r && e.hitT <= 0 && e.type !== 'medic') {
      hurtPlayer(e.dmg * (e.st === 'charge' ? 1.3 : 1)); e.hitT = 0.6;
      e.vx -= ux * 70; e.vy -= uy * 70; P.vx += ux * 50; P.vy += uy * 50;
    }
  }

  for (let i = 0; i < G.enemies.length; i++) {
    const a1 = G.enemies[i]; if (a1.dead) continue;
    for (let j = i + 1; j < G.enemies.length; j++) {
      const b1 = G.enemies[j]; if (b1.dead) continue;
      const ddx = b1.x - a1.x, ddy = b1.y - a1.y, rr = a1.r + b1.r, d2 = ddx * ddx + ddy * ddy;
      if (d2 < rr * rr && d2 > 0.01) {
        const dd = Math.sqrt(d2), ff = (rr - dd) / dd * 0.4;
        if (!a1.boss) { a1.x -= ddx * ff; a1.y -= ddy * ff; }
        if (!b1.boss) { b1.x += ddx * ff; b1.y += ddy * ff; }
      }
    }
  }
  G.enemies = G.enemies.filter(en => !en.dead);
}

function planShieldGroups() {
  const groups = new Map();
  const snipers = [];
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.type === 'sniper') snipers.push(e);
    if (e.type === 'shielder') {
      const k = e.group != null ? e.group : 'solo' + e.id;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
  }
  const claimed = new Set();
  for (const mem of groups.values()) {
    mem.sort((a, b) => a.slot - b.slot);
    const n = mem.length;
    let cx = 0, cy = 0;
    for (const m of mem) { cx += m.x; cy += m.y; }
    cx /= n; cy /= n;

    let guard = null;
    if (mem[0].guardId != null) guard = snipers.find(s => s.id === mem[0].guardId) || null;
    if (!guard) {
      let bd = 1e9;
      for (const s of snipers) {
        if (claimed.has(s.id)) continue;
        const d = hyp(s.x - cx, s.y - cy);
        if (d < bd) { bd = d; guard = s; }
      }
      if (bd > 300) guard = null;
    }
    if (guard) claimed.add(guard.id);

    const dP = hyp(P.x - cx, P.y - cy);
    const prev = mem[0].mode;
    let mode, ax = cx, ay = cy, ar = 0;
    if (guard) { mode = 'guard'; ax = guard.x; ay = guard.y; ar = 27; }
    else if (n === 1) { mode = 'solo'; }
    else {
      const close = prev === 'circle' ? dP < 96 : dP < 74;
      mode = close ? 'circle' : 'cluster';
      ar = 24;
    }

    const toP = Math.atan2(P.y - ay, P.x - ax);
    const base = mode === 'guard' ? G.t * 0.5 : G.t * 0.25;
    for (let i = 0; i < n; i++) {
      const m = mem[i];
      m.guardId = guard ? guard.id : null;
      m.mode = mode; m.ax = ax; m.ay = ay; m.ar = ar;
      if (mode === 'solo') {
        m.tx = P.x; m.ty = P.y; m.tface = toP;
      } else if (mode === 'cluster') {
        const off = (i - (n - 1) / 2) * 14;
        const px = -Math.sin(toP), py = Math.cos(toP);
        m.tx = ax + px * off + Math.cos(toP) * 16;
        m.ty = ay + py * off + Math.sin(toP) * 16;
        m.tface = toP;
      } else {
        const a = base + i * TAU / n;
        m.tx = ax + Math.cos(a) * ar;
        m.ty = ay + Math.sin(a) * ar;
        m.tface = a;
      }
    }
  }
}

function applyDodge(e, dt) {
  e.dodgeCd -= dt; e.dodgeT -= dt;
  if (e.dodgeT > 0) { e.vx = e.vx * 0.25 + e.dvx; e.vy = e.vy * 0.25 + e.dvy; return; }
  if (e.dodgeCd > 0) return;
  for (const bl of G.bul) {
    const rx = e.x - bl.x, ry = e.y - bl.y;
    const v2 = bl.vx * bl.vx + bl.vy * bl.vy; if (v2 < 1) continue;
    const t = (rx * bl.vx + ry * bl.vy) / v2;
    if (t < 0 || t > 0.55) continue;
    const cx = rx - bl.vx * t, cy = ry - bl.vy * t;
    if (cx * cx + cy * cy > (e.r + bl.r + 7) ** 2) continue;
    const vl = Math.sqrt(v2), px = -bl.vy / vl, py = bl.vx / vl;
    const side = (cx * px + cy * py) >= 0 ? 1 : -1;
    const sp = e.sp * 1.9 + 65;
    e.dvx = px * side * sp; e.dvy = py * side * sp;
    e.dodgeT = 0.22; e.dodgeCd = rand(0.5, 0.85);
    part(e.x, e.y, '#ffffff', 2, 40, 0.15, 1);
    return;
  }
}

function updateShooter(e, dt, d, ux, uy, dx, dy) {
  let tx, ty;
  if (d < 70) { tx = -ux; ty = -uy; } else if (d > 110) { tx = ux; ty = uy; } else { tx = -uy; ty = ux; }
  e.vx += (tx * e.sp - e.vx) * Math.min(1, 4 * dt); e.vy += (ty * e.sp - e.vy) * Math.min(1, 4 * dt);
  e.cd -= dt; e.tel = e.cd < 0.3 ? 1 : 0;
  if (e.cd <= 0) { e.cd = rand(1.5, 2.2) / DIFF[G.diff].sp; eShoot(e, Math.atan2(dy, dx), 95, 8 * DIFF[G.diff].dmg, SPR.orbA); part(e.x, e.y, '#ffb020', 3, 50, 0.2, 1); A.tone(300, 0.06, 'square', 0.04, 0.6); }
}

function updateTank(e, dt, d, ux, uy, dx, dy) {
  if (e.st === 'walk') {
    e.vx += (ux * e.sp - e.vx) * Math.min(1, 3 * dt); e.vy += (uy * e.sp - e.vy) * Math.min(1, 3 * dt); e.cd -= dt;
    if (e.cd <= 0 && d < 130) { e.st = 'tel'; e.cd = 0.75; e.lock = Math.atan2(dy, dx); }
  } else if (e.st === 'tel') {
    e.cd -= dt; e.tel = 1; e.vx *= 0.86; e.vy *= 0.86;
    if (e.cd <= 0) { e.st = 'charge'; e.cd = 0.6; e.tel = 0; A.tone(120, 0.22, 'sawtooth', 0.09, 1.8); }
  } else {
    e.cd -= dt; e.vx = Math.cos(e.lock) * 130; e.vy = Math.sin(e.lock) * 130; part(e.x, e.y, '#ff4d4d', 1, 35, 0.25, 1);
    if (e.cd <= 0) { e.st = 'walk'; e.cd = rand(2.4, 3.6); }
  }
}

function updateShielder(e, dt, d, ux, uy, dx, dy) {
  e.face += angDiff(e.face, e.tface) * Math.min(1, 1.6 * dt);
  const tx = e.tx - e.x, ty = e.ty - e.y, td = hyp(tx, ty) || 1;
  const sp = Math.min(e.sp * 1.9, td * 5);
  e.vx += ((tx / td) * sp - e.vx) * Math.min(1, 4 * dt);
  e.vy += ((ty / td) * sp - e.vy) * Math.min(1, 4 * dt);
  e.cd -= dt;
  const ap = Math.atan2(dy, dx);
  if (e.cd <= 0 && Math.abs(angDiff(e.face, ap)) < 0.9) { e.cd = rand(1.8, 2.4); eShoot(e, e.face, 95, 8 * DIFF[G.diff].dmg, SPR.orbM); A.tone(280, 0.06, 'square', 0.04, 0.6); }
}

function updateSniper(e, dt, d, ux, uy) {
  let tx, ty;
  if (e.tel > 0) { tx = 0; ty = 0; }
  else if (d < 170) { tx = -ux; ty = -uy; }
  else if (d > 230) { tx = ux; ty = uy; }
  else { tx = -uy; ty = ux; }
  e.vx += (tx * e.sp - e.vx) * Math.min(1, 3 * dt); e.vy += (ty * e.sp - e.vy) * Math.min(1, 3 * dt);
  e.cd -= dt;
  if (e.cd <= 0.6 && e.tel === 0) { e.tel = 1; e.lock = Math.atan2(P.y - e.y, P.x - e.x); A.tone(700, 0.3, 'sine', 0.04, 1.6); }
  if (e.cd <= 0) {
    e.cd = 3; e.tel = 0;
    eShoot(e, e.lock, 2600, 36 * DIFF[G.diff].dmg, SPR.orbR);
    part(e.x, e.y, '#ff4d4d', 6, 90, 0.25, 1); A.tone(150, 0.15, 'sawtooth', 0.1, 0.4);
  }
}

function updateMedic(e, dt, d, ux, uy) {
  e.beam = null;
  if (e.hp < e.max * 0.25) e.mode = 'boom';
  if (e.mode === 'boom') {
    e.vx += (ux * 130 - e.vx) * Math.min(1, 6 * dt); e.vy += (uy * 130 - e.vy) * Math.min(1, 6 * dt);
    part(e.x, e.y, '#9dff3c', 1, 40, 0.2, 1);
    if (d < 12) { hurtPlayer(50); ring(e.x, e.y, 4, 44, '#9dff3c', 0.5); part(e.x, e.y, '#9dff3c', 30, 130, 0.6, 2); flash(0.3, '#9dff3c'); A.boom(); killEnemy(e); }
    return;
  }
  let target = null, bd = 1e9;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.type === 'medic' || o.hp >= o.max) continue;
    const dd = hyp(o.x - e.x, o.y - e.y); if (dd < bd) { bd = dd; target = o; }
  }
  if (target && bd < 110) {
    e.beam = { x: target.x, y: target.y }; target.hp = Math.min(target.max, target.hp + 14 * dt);
    const tx = (target.x - e.x) / bd, ty = (target.y - e.y) / bd;
    e.vx += (tx * 20 - e.vx) * Math.min(1, 3 * dt); e.vy += (ty * 20 - e.vy) * Math.min(1, 3 * dt);
  } else {
    let tx, ty;
    if (d < 110) { tx = -ux; ty = -uy; } else { tx = -uy; ty = ux; }
    e.vx += (tx * e.sp - e.vx) * Math.min(1, 3 * dt); e.vy += (ty * e.sp - e.vy) * Math.min(1, 3 * dt);
  }
}

function updateWalker(e, dt, ux, uy) {
  const wob = (e.type === 'splitter') ? Math.sin(e.t * 3) * 0.45 : 0;
  const ax = ux * Math.cos(wob) - uy * Math.sin(wob), ay = ux * Math.sin(wob) + uy * Math.cos(wob);
  e.vx += (ax * e.sp - e.vx) * Math.min(1, 5 * dt); e.vy += (ay * e.sp - e.vy) * Math.min(1, 5 * dt);
}

function bossAI(e, dt, ux, uy, d) {
  const fr = e.hp / e.max; e.phase = fr > 0.66 ? 1 : (fr > 0.33 ? 2 : 3);
  document.getElementById('bossPhase').textContent = 'ФАЗА ' + e.phase;
  document.getElementById('bossFill').style.transform = 'scaleX(' + clamp(fr, 0, 1) + ')';
  const rate = 1 + (e.phase - 1) * 0.3;
  if (e.atk === 'idle') {
    const want = 80, tx2 = d > want ? ux * 30 : -ux * 30, ty2 = d > want ? uy * 30 : -uy * 30;
    e.vx += (tx2 - e.vx) * Math.min(1, 2 * dt); e.vy += (ty2 - e.vy) * Math.min(1, 2 * dt);
    e.atkT -= dt; e.tel = 0;
    if (e.atkT <= 0) {
      e.atk = pick(e.phase >= 2 ? ['radial', 'spiral', 'charge', 'summon'] : ['radial', 'spiral', 'summon']);
      e.sub = 0; e.tel = 0.45; e.atkT = e.atk === 'spiral' ? 2.2 : (e.atk === 'radial' ? 1.9 : (e.atk === 'charge' ? 1.5 : 1.1));
      if (e.atk === 'charge') { e.lock = Math.atan2(P.y - e.y, P.x - e.x); A.tone(90, 0.5, 'sawtooth', 0.1, 2.2); }
      if (e.atk === 'summon') {
        const n = 1 + e.phase;
        for (let i = 0; i < n; i++) { const a = rand(0, TAU), m = makeEnemy(e.phase >= 3 ? 'shooter' : 'grunt', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20); m.vx = Math.cos(a) * 70; m.vy = Math.sin(a) * 70; G.enemies.push(m); ring(m.x, m.y, 2, 11, '#ff2fb0', 0.3); }
        A.tone(180, 0.3, 'sawtooth', 0.09, 2);
      }
    }
  } else {
    e.atkT -= dt;
    if (e.tel > 0) { e.tel -= dt; e.vx *= 0.9; e.vy *= 0.9; }
    else if (e.atk === 'radial') {
      e.sub -= dt; e.vx *= 0.94; e.vy *= 0.94;
      if (e.sub <= 0) { e.sub = 0.6 / rate; e.ang += 0.24; const nn = 8 + e.phase * 3; for (let k = 0; k < nn; k++) eShoot(e, e.ang + k * TAU / nn, 72, 9 * DIFF[G.diff].dmg, SPR.orbM); ring(e.x, e.y, e.r, e.r + 16, '#ff2fb0', 0.25); A.tone(240, 0.1, 'square', 0.06, 0.6); }
    } else if (e.atk === 'spiral') {
      e.sub -= dt; e.vx *= 0.96; e.vy *= 0.96;
      if (e.sub <= 0) { e.sub = 0.1 / rate; e.ang += 0.42; eShoot(e, e.ang, 88, 8 * DIFF[G.diff].dmg, SPR.orbA); eShoot(e, e.ang + Math.PI, 88, 8 * DIFF[G.diff].dmg, SPR.orbA); if (e.phase >= 3) eShoot(e, e.ang + Math.PI / 2, 80, 8 * DIFF[G.diff].dmg, SPR.orbV); }
    } else if (e.atk === 'charge') {
      e.vx = Math.cos(e.lock) * 170; e.vy = Math.sin(e.lock) * 170; part(e.x, e.y, '#ff4d4d', 2, 50, 0.3, 1);
      if (e.atkT < 0.7) { e.vx *= 0.9; e.vy *= 0.9; }
    } else { e.vx *= 0.94; e.vy *= 0.94; }
    if (e.atkT <= 0) { e.atk = 'idle'; e.atkT = 1.2 - (e.phase - 1) * 0.2; e.tel = 0; }
  }
}
