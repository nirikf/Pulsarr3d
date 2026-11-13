// ============================================
// EFFECTS — частицы, кольца, всплывающие цифры
// ============================================

import { TAU, rand } from './constants.js';
import { G } from './state.js';

// Добавление частиц
export function part(x, y, col, n, spd, life, size) {
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 420) break;
    const a = rand(0, TAU);
    const s = rand(spd * 0.3, spd);
    G.parts.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      l: rand(life * 0.5, life),
      m: life,
      c: col,
      s: size || 1,
      dr: rand(2, 5)
    });
  }
}

// Добавление кольца
export function ring(x, y, r0, r1, col, life) {
  if (G.rings.length > 10) return;
  G.rings.push({ x, y, r: r0, r1, l: life, m: life, c: col });
}

// Всплывающая цифра/текст
export function float(x, y, txt, col, sc) {
  if (G.floats.length > 26) return;
  G.floats.push({
    x, y,
    t: String(txt),
    c: col,
    s: sc || 1,
    l: 0.7,
    m: 0.7
  });
}

// Тряска экрана
export function shake(v) {
  G.shake = Math.min(9, G.shake + v);
}

// Вспышка экрана
export function flash(v, c) {
  G.flash = Math.max(G.flash, v);
  G.flashCol = c || '#fff';
}

// Обновление эффектов
export function updateEffects(dt) {
  let i;

  // Кольца пульсации
  for (i = G.beats.length - 1; i >= 0; i--) {
    const b = G.beats[i];
    b.r += 70 * dt;
    b.a -= dt * 0.5;
    if (b.a <= 0) G.beats.splice(i, 1);
  }

  // Кольца
  for (i = G.rings.length - 1; i >= 0; i--) {
    const r = G.rings[i];
    r.l -= dt;
    r.r += (r.r1 - r.r) * Math.min(1, 9 * dt);
    if (r.l <= 0) G.rings.splice(i, 1);
  }

  // Частицы
  for (i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.l -= dt;
    const kk = Math.exp(-p.dr * dt);
    p.vx *= kk;
    p.vy *= kk;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.l <= 0) G.parts.splice(i, 1);
  }

  // Всплывающие цифры
  for (i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i];
    f.l -= dt;
    f.y -= 16 * dt;
    if (f.l <= 0) G.floats.splice(i, 1);
  }

  // Призраки рывка
  for (i = G.ghost.length - 1; i >= 0; i--) {
    G.ghost[i].l -= dt;
    if (G.ghost[i].l <= 0) G.ghost.splice(i, 1);
  }
}
