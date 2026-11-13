// ============================================
// ENTITIES/DROPS — осколки, аптечки, магнит
// ============================================

import { hyp, rand, TAU } from '../constants.js';
import { G, P, S } from '../state.js';
import { part, ring } from '../effects.js';
import { A } from '../audio.js';

// Создание осколка
export function spawnShard(x, y) {
  if (G.drops.length >= 170) return;
  const a = rand(0, TAU);
  const s = rand(20, 60);
  G.drops.push({
    x, y,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s,
    type: 'shard',
    l: 14,
    sp: rand(0, TAU)
  });
}

// Создание аптечки
export function spawnMedkit(x, y) {
  if (G.drops.length >= 170) return;
  G.drops.push({
    x, y,
    vx: rand(-20, 20),
    vy: rand(-20, 20),
    type: 'hp',
    l: 14,
    sp: 0
  });
}

// Обновление дропов
export function updateDrops(dt) {
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const dr = G.drops[i];
    dr.l -= dt;
    dr.sp += dt * 4;

    const dx = P.x - dr.x, dy = P.y - dr.y;
    const dist = hyp(dx, dy) || 1;
    const mg = dr.type === 'hp' ? S.magnet * 0.7 : S.magnet;

    if (dist < mg) {
      const pull = 420 * (1 - dist / mg) + 70;
      dr.vx += dx / dist * pull * dt;
      dr.vy += dy / dist * pull * dt;
    }

    const kd = Math.exp(-2.4 * dt);
    dr.vx *= kd;
    dr.vy *= kd;
    dr.x += dr.vx * dt;
    dr.y += dr.vy * dt;

    if (dist < P.r + 4) {
      if (dr.type === 'shard') {
        G.shards++;
        addScore(6 * G.mult);
        A.pick(G.combo);
        part(dr.x, dr.y, '#ff2fb0', 4, 55, 0.25, 1);
        popChip('.chip.g');
      } else {
        healPlayer(35);
        A.heal();
        part(dr.x, dr.y, '#35f0a0', 9, 70, 0.35, 1);
        ring(dr.x, dr.y, 2, 16, '#35f0a0', 0.3);
      }
      G.drops.splice(i, 1);
      continue;
    }

    if (dr.l <= 0) {
      G.drops.splice(i, 1);
    }
  }
}

// Импортируем функции которые будут в других модулях
import { addScore, healPlayer, popChip } from '../combat.js';
