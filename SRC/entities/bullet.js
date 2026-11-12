// ============================================
// ENTITIES/BULLET — пули игрока и врагов
// ============================================

import { G } from '../state.js';
import { SPR } from '../sprites.js';
import { part } from '../effects.js';

// Пуля игрока
export function fireBullet(x, y, angle, speed, dmg, pierce, isDrone) {
  G.bul.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 2,
    dmg,
    p: pierce || 0,
    l: isDrone ? 1.1 : 1.2,
    hit: [],
    a: angle,
    dr: isDrone || false
  });
}

// Пуля врага (орб)
export function eShoot(e, ang, spd, dmg, sprKey) {
  if (G.ebul.length > 200) return;
  G.ebul.push({
    x: e.x + Math.cos(ang) * (e.r + 2),
    y: e.y + Math.sin(ang) * (e.r + 2),
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    r: 2.5,
    dmg,
    l: 4,
    spr: sprKey || SPR.orbM
  });
}

// Обновление пуль игрока
export function updateBullets(dt) {
  for (let i = G.bul.length - 1; i >= 0; i--) {
    const bl = G.bul[i];
    bl.l -= dt;
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;

    const AR = G.AR; // AR должен быть доступен
    let dead = bl.l <= 0 || bl.x < AR.x || bl.x > AR.x + AR.w || bl.y < AR.y || bl.y > AR.y + AR.h;

    if (!dead) {
      for (let j = 0; j < G.enemies.length; j++) {
        const e = G.enemies[j];
        if (e.dead || bl.hit.indexOf(e.id) >= 0) continue;
        const dx = e.x - bl.x, dy = e.y - bl.y;
        if (dx * dx + dy * dy < (e.r + bl.r) * (e.r + bl.r)) {
          bl.hit.push(e.id);
          damageEnemy(e, bl.dmg, false, bl.x, bl.y);
          if (bl.p > 0) {
            bl.p--;
          } else {
            dead = true;
          }
          break;
        }
      }
    }

    if (dead) {
      if (bl.l > 0) {
        part(bl.x, bl.y, bl.dr ? '#9dff3c' : '#22e6ff', 3, 45, 0.18, 1);
      }
      G.bul.splice(i, 1);
    }
  }
}

// Обновление пуль врагов
export function updateEnemyBullets(dt) {
  for (let i = G.ebul.length - 1; i >= 0; i--) {
    const eb = G.ebul[i];
    eb.l -= dt;
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;

    const AR = G.AR;
    if (eb.l <= 0 || eb.x < AR.x - 16 || eb.x > AR.x + AR.w + 16 || eb.y < AR.y - 16 || eb.y > AR.y + AR.h + 16) {
      G.ebul.splice(i, 1);
      continue;
    }

    const dx = eb.x - P.x, dy = eb.y - P.y;
    if (dx * dx + dy * dy < (eb.r + P.r * 0.9) * (eb.r + P.r * 0.9)) {
      hurtPlayer(eb.dmg);
      part(eb.x, eb.y, '#ff2fb0', 7, 70, 0.3, 1);
      G.ebul.splice(i, 1);
    }
  }
}

// Импортируем то что нужно (будет доступно после создания модулей)
import { damageEnemy, hurtPlayer } from '../combat.js';
import { P } from '../state.js';
