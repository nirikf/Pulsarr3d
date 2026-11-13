import { rand, randi, pick, clamp, TAU } from './constants.js';
import { G, P, AR } from './state.js';
import { DIFF } from './constants.js';
import { ring, float } from './effects.js';
import { A } from './audio.js';
import { spawn, spawnAt, edge } from './entities/enemy.js';
import { addScore } from './combat.js';
import { banner, popChip } from './ui.js';

let groupCounter = 0;
let groupAnchor = {};

export function buildWave(n) {
  G.queue = []; const D = DIFF[G.diff]; let t = 0.5;
  if (n === 5 || n === 10) {
    G.queue.push({ type: 'boss', at: 0.8 });
    const adds = n === 5 ? 5 : 8;
    for (let i = 0; i < adds; i++) G.queue.push({ type: (i % 3 === 2 ? 'shooter' : 'grunt'), at: 2.2 + i * 0.6 });
    if (n === 10) {
      for (let i = 0; i < 3; i++) G.queue.push({ type: 'splitter', at: 6 + i * 1.6 });
      G.queue.push({ type: 'medic', at: 4 });
      pushShieldGroup(8);
    }
    return;
  }
  let budget = (5 + n * 2.2) * D.budget; const pool = [['grunt', 1]];
  if (n >= 2) pool.push(['shooter', 2]);
  if (n >= 3) { pool.push(['splitter', 2.5]); }
  if (n >= 4) { pool.push(['tank', 4]); pool.push(['sniper', 3]); }
  if (n >= 5) pool.push(['medic', 3.5]);

  let guard = 0, hasShield = false, hasSniper = false;
  while (budget > 0 && guard++ < 120) {
    if (n >= 3 && !hasShield && budget >= 7) { pushShieldGroup(t); hasShield = true; budget -= 7; t += 1.2; continue; }
    const av = pool.filter(p => p[1] <= budget + 0.5); if (!av.length) break;
    const gs = randi(1, Math.min(4, 2 + Math.floor(n / 4)));
    for (let i = 0; i < gs; i++) {
      const p = pick(av); budget -= p[1];
      if (p[0] === 'sniper') hasSniper = true;
      G.queue.push({ type: p[0], at: t + i * rand(0.16, 0.32) });
    }
    t += rand(0.9, 1.8) * clamp(1.25 - n * 0.03, 0.55, 1.25);
  }
  if (hasShield && n >= 4 && !hasSniper) G.queue.push({ type: 'sniper', at: t + 0.5 });
  G.queue.sort((a, b) => a.at - b.at);
}

function pushShieldGroup(at) {
  const size = randi(3, 4), gid = ++groupCounter;
  for (let i = 0; i < size; i++) G.queue.push({ type: 'shielder', at: at + i * 0.08, group: gid, slot: i });
}

export function startWave(n) {
  G.wave = n; G.waveT = 0; G.active = true; groupAnchor = {}; buildWave(n);
  const boss = (n === 5 || n === 10);
  banner(boss ? 'СТРАЖ' : 'ВОЛНА ' + n, boss ? 'УНИЧТОЖЬ ЯДРО' : 'ЗАЧИСТИ АРЕНУ');
  if (boss) A.bossIn(); else A.wave();
  document.getElementById('cWave').textContent = n; popChip('.chip.w');
}

export function waveClear() {
  G.active = false; G.boss = null; document.getElementById('bossbar').classList.remove('on');
  const bonus = 100 + G.wave * 35; addScore(bonus); G.shards += 3 + Math.floor(G.wave / 2);
  float(P.x, P.y - 12, '+' + bonus, '#9dff3c', 1); ring(P.x, P.y, 4, 40, '#9dff3c', 0.6); A.up();
  G.state = 'clear'; G.clearT = 0.75;
}

export function updateSpawns() {
  while (G.queue.length && G.queue[0].at <= G.waveT && G.enemies.length < 20) {
    const q = G.queue.shift();
    if (q.type === 'shielder' && q.group != null) {
      if (!groupAnchor[q.group]) groupAnchor[q.group] = edge();
      const a = groupAnchor[q.group], ang = q.slot * TAU / 4;
      const x = clamp(a.x + Math.cos(ang) * 11, AR.x + 10, AR.x + AR.w - 10);
      const y = clamp(a.y + Math.sin(ang) * 11, AR.y + 10, AR.y + AR.h - 10);
      spawnAt('shielder', x, y, { group: q.group, slot: q.slot });
    } else {
      const e = spawn(q.type);
      if (e.boss) {
        G.boss = e; document.getElementById('bossbar').classList.add('on');
        document.getElementById('bossName').textContent = 'СТРАЖ ' + (G.wave >= 10 ? 'II' : 'I');
      }
    }
  }
}
