// ============================================
// RENDER — отрисовка всей игры
// ============================================

import { TAU, hyp, randi, clamp } from './constants.js';
import { G, P, S, AR, W, H, sticks, isTouch, mx, my, mouseT } from './state.js';
import { SPR, floorPattern } from './sprites.js';
import { drawSpr, pxText, pxTextW, pxCircle, pxDisc } from './render/draw.js';

// Звёзды фона
export let stars = [];
export let floorPat = null;

// Инициализация фона
export function initBackground(ctx) {
  floorPat = ctx.createPattern(floorPattern, 'repeat');
  stars = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: randi(0, W - 1),
      y: randi(0, H - 1),
      c: pick(['#4f2a94', '#22e6ff', '#6b6a8a', '#a86bff']),
      p: rand(0, TAU)
    });
  }
}

// Главная функция отрисовки
export function render(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, 0, W, H);

  let i, e;

  // Звёзды
  for (i = 0; i < stars.length; i++) {
    const st = stars[i];
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(G.t * 1.2 + st.p));
    ctx.globalAlpha = tw * 0.8;
    ctx.fillStyle = st.c;
    ctx.fillRect(st.x, st.y, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Тряска экрана
  const sx = G.shake ? randi(-Math.round(G.shake), Math.round(G.shake)) : 0;
  const sy = G.shake ? randi(-Math.round(G.shake), Math.round(G.shake)) : 0;
  ctx.save();
  ctx.translate(sx, sy);

  // Пол
  ctx.save();
  ctx.beginPath();
  ctx.rect(AR.x, AR.y, AR.w, AR.h);
  ctx.clip();
  const ox = -Math.round(P.x * 0.06) % 16;
  const oy = -Math.round(P.y * 0.06) % 16;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.fillStyle = floorPat;
  ctx.fillRect(-ox, -oy, W + 16, H + 16);
  ctx.restore();

  // Кольца пульсации
  for (i = 0; i < G.beats.length; i++) {
    const bt = G.beats[i];
    pxCircle(ctx, AR.x + AR.w / 2, AR.y + AR.h / 2, bt.r, '#4f2a94', Math.max(0, bt.a) * 0.7);
  }
  ctx.restore();

  // Граница арены
  const hurtG = P.hurtT > 0;
  ctx.fillStyle = hurtG ? '#ff4d4d' : '#4a2a8f';
  ctx.fillRect(AR.x - 1, AR.y - 1, AR.w + 2, 1);
  ctx.fillRect(AR.x - 1, AR.y + AR.h, AR.w + 2, 1);
  ctx.fillRect(AR.x - 1, AR.y - 1, 1, AR.h + 2);
  ctx.fillRect(AR.x + AR.w, AR.y - 1, 1, AR.h + 2);
  ctx.fillStyle = hurtG ? '#ff4d4d' : '#22e6ff';
  [[AR.x - 2, AR.y - 2], [AR.x + AR.w - 2, AR.y - 2], [AR.x - 2, AR.y + AR.h - 2], [AR.x + AR.w - 2, AR.y + AR.h - 2]].forEach(function(c) {
    ctx.fillRect(c[0], c[1], 4, 4);
  });
  for (i = AR.x + 6; i < AR.x + AR.w - 4; i += 8) {
    ctx.fillStyle = '#241452';
    ctx.fillRect(i, AR.y + 1, 3, 1);
    ctx.fillRect(i, AR.y + AR.h - 2, 3, 1);
  }

  // Кольца эффектов
  for (i = 0; i < G.rings.length; i++) {
    const rg = G.rings[i];
    pxCircle(ctx, rg.x, rg.y, rg.r, rg.c, clamp(rg.l / rg.m, 0, 1));
  }

  // Дропы
  for (i = 0; i < G.drops.length; i++) {
    const dp = G.drops[i];
    if (dp.l < 3 && Math.floor(dp.l * 8) % 2 === 0) continue;
    const bob = Math.round(Math.sin(G.t * 4 + dp.sp) * 1);
    const s = dp.type === 'shard' ? SPR.shard : SPR.med;
    ctx.drawImage(s.n, Math.round(dp.x - s.w / 2), Math.round(dp.y - s.h / 2) + bob);
  }

  // Враги
  for (i = 0; i < G.enemies.length; i++) {
    e = G.enemies[i];
    if (e.tel > 0) {
      const pulse = (Math.floor(G.t * 16) % 2 === 0);
      pxCircle(ctx, e.x, e.y, e.r + 4 + Math.round(Math.sin(G.t * 12) * 1), pulse ? '#ffffff' : e.col, 0.85);
      if (e.st === 'charge' || e.atk === 'charge') {
        const lx = Math.cos(e.lock), ly = Math.sin(e.lock);
        for (let q = 6; q < 70; q += 4) {
          ctx.fillStyle = pulse ? '#ffffff' : '#ff4d4d';
          ctx.fillRect(Math.round(e.x + lx * q), Math.round(e.y + ly * q), 2, 2);
        }
      }
    }
    const ang = e.boss ? e.t * 0.35 : ((e.type === 'shooter' || e.type === 'tank') ? Math.atan2(P.y - e.y, P.x - e.x) : Math.atan2(e.vy, e.vx));
    drawSpr(ctx, e.spr, e.x, e.y, ang, e.fl > 0 && Math.floor(G.t * 30) % 2 === 0, 1);
    if (e.type === 'tank' && !e.boss) {
      const f = clamp(e.hp / e.max, 0, 1);
      const bw = 18;
      ctx.fillStyle = '#0a0518';
      ctx.fillRect(Math.round(e.x - bw / 2) - 1, Math.round(e.y - e.r - 6), bw + 2, 4);
      ctx.fillStyle = '#241452';
      ctx.fillRect(Math.round(e.x - bw / 2), Math.round(e.y - e.r - 5), bw, 2);
      ctx.fillStyle = f > 0.5 ? '#9dff3c' : (f > 0.25 ? '#ffb020' : '#ff4d4d');
      ctx.fillRect(Math.round(e.x - bw / 2), Math.round(e.y - e.r - 5), Math.round(bw * f), 2);
    }
  }

  // Пули врагов
  for (i = 0; i < G.ebul.length; i++) {
    const eb = G.ebul[i];
    ctx.drawImage(eb.spr.n, Math.round(eb.x - 2), Math.round(eb.y - 2));
  }

  // Игрок
  if (G.state !== 'title') {
    // Призраки рывка
    for (i = 0; i < G.ghost.length; i++) {
      const gh = G.ghost[i];
      drawSpr(ctx, SPR.ship, gh.x, gh.y, gh.a, false, clamp(gh.l / gh.m, 0, 1) * 0.35);
    }

    // Дроны
    for (i = 0; i < S.drones; i++) {
      const a2 = G.t * 1.8 + i * TAU / S.drones;
      const dx2 = P.x + Math.cos(a2) * 16;
      const dy2 = P.y + Math.sin(a2) * 16;
      drawSpr(ctx, SPR.drone, dx2, dy2, a2 * 2, false, 1);
    }

    // Корабль
    const blink = P.inv > 0 && Math.floor(G.t * 20) % 2 === 0;
    if (!blink) {
      const spd = hyp(P.vx, P.vy);
      if (spd > 18) {
        const bx = P.x - Math.cos(P.aim) * 8;
        const by = P.y - Math.sin(P.aim) * 8;
        ctx.fillStyle = Math.floor(G.t * 24) % 2 === 0 ? '#22e6ff' : '#b8fbff';
        ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 2, 2);
        ctx.fillStyle = '#4d8cff';
        ctx.fillRect(Math.round(bx - Math.cos(P.aim) * 3), Math.round(by - Math.sin(P.aim) * 3), 1, 1);
      }
      drawSpr(ctx, SPR.ship, P.x, P.y, P.aim, P.hurtT > 0 && Math.floor(G.t * 30) % 2 === 0, 1);
    }

    // Индикатор рывка
    const pr = P.dashCd <= 0 ? 1 : 1 - P.dashCd / S.dashCd;
    pxCircle(ctx, P.x, P.y, 9, P.dashCd <= 0 ? '#22e6ff' : '#4a2a8f', 0.5 + 0.3 * pr);

    // Прицел
    if (!isTouch && G.t - mouseT < 4) {
      ctx.fillStyle = P.focus ? '#9dff3c' : '#22e6ff';
      ctx.fillRect(Math.round(mx) - 3, Math.round(my), 7, 1);
      ctx.fillRect(Math.round(mx), Math.round(my) - 3, 1, 7);
    }

    // Линия прицела
    ctx.globalAlpha = 0.5;
    for (let q2 = 10; q2 < 26; q2 += 4) {
      ctx.fillStyle = '#9dff3c';
      ctx.fillRect(Math.round(P.x + Math.cos(P.aim) * q2), Math.round(P.y + Math.sin(P.aim) * q2), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Пули игрока
  for (i = 0; i < G.bul.length; i++) {
    const bl = G.bul[i];
    ctx.save();
    ctx.translate(Math.round(bl.x), Math.round(bl.y));
    ctx.rotate(bl.a);
    if (bl.dr) {
      ctx.fillStyle = '#9dff3c';
      ctx.fillRect(-2, -1, 4, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -1, 1, 2);
    } else {
      ctx.drawImage(SPR.bolt.n, -2, -2);
    }
    ctx.restore();
  }

  // Частицы
  for (i = 0; i < G.parts.length; i++) {
    const pp = G.parts[i];
    const al = clamp(pp.l / pp.m, 0, 1);
    ctx.globalAlpha = al > 0.35 ? 1 : 0.55;
    ctx.fillStyle = pp.c;
    const sz = pp.s + (al > 0.7 ? 1 : 0);
    ctx.fillRect(Math.round(pp.x), Math.round(pp.y), sz, sz);
  }
  ctx.globalAlpha = 1;

  // Всплывающие цифры
  for (i = 0; i < G.floats.length; i++) {
    const fl = G.floats[i];
    if (fl.l < 0.2 && Math.floor(fl.l * 30) % 2 === 0) continue;
    const w = pxTextW(fl.t, fl.s);
    pxText(ctx, fl.t, fl.x - w / 2 + 1, fl.y + 1, '#0a0518', fl.s);
    pxText(ctx, fl.t, fl.x - w / 2, fl.y, fl.c, fl.s);
  }

  // Тач-стики
  if (isTouch && G.state === 'play') {
    ['move', 'aim'].forEach(function(k) {
      const s = sticks[k];
      if (s.id === null) return;
      const col = k === 'move' ? '#22e6ff' : '#ff2fb0';
      pxCircle(ctx, s.ox, s.oy, 22, col, 0.45);
      pxCircle(ctx, s.ox, s.oy, 21, '#0a0518', 0.3);
      pxDisc(ctx, s.ox + s.dx * 22, s.oy + s.dy * 22, 7, col, 0.75);
      pxDisc(ctx, s.ox + s.dx * 22, s.oy + s.dy * 22, 3, '#ffffff', 0.9);
    });
  }

  ctx.restore();

  // Вспышка
  if (G.flash > 0) {
    ctx.globalAlpha = Math.min(0.55, G.flash);
    ctx.fillStyle = G.flashCol;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Опасность (низкий HP)
  if (G.state === 'play' && P.hp / P.max < 0.3) {
    const pl = 0.4 + 0.6 * Math.abs(Math.sin(G.t * 4));
    ctx.globalAlpha = pl;
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(AR.x, AR.y, AR.w, 1);
    ctx.fillRect(AR.x, AR.y + AR.h - 1, AR.w, 1);
    ctx.fillRect(AR.x, AR.y, 1, AR.h);
    ctx.fillRect(AR.x + AR.w - 1, AR.y, 1, AR.h);
    ctx.globalAlpha = 1;
  }
}

// Импортируем нужные функции
import { rand, pick } from './constants.js';
