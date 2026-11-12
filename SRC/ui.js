// ============================================
// UI — DOM-интерфейс, экраны, баннеры
// ============================================

import { G, P } from './state.js';
import { DIFF } from './constants.js';
import { fmt } from './constants.js';
import { store } from './state.js';
import { A } from './audio.js';
import { recalc } from './player.js';
import { newRun, pause, resume, toMenu } from './game.js';
import { isTouch } from './state.js';

// Маппинг экранов
const SCR = {
  title: '#sTitle',
  up: '#sUp',
  pause: '#sPause',
  over: '#sOver',
  win: '#sWin'
};

// Переключение состояния экранов
export function setState(s) {
  G.state = s;
  for (const k in SCR) {
    document.querySelector(SCR[k]).classList.remove('on');
  }
  if (SCR[s]) {
    document.querySelector(SCR[s]).classList.add('on');
  }
}

// Баннер (ВОЛНА 1, СТРАЖ и т.д.)
export function banner(a, b) {
  const el = document.getElementById('banner');
  el.querySelector('b').textContent = a;
  el.querySelector('s').textContent = b;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

// Анимация чипса
export function popChip(sel) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}

// Синхронизация рекордов
export function syncBest() {
  document.getElementById('tBest').textContent = fmt(G.best.score);
  document.getElementById('tWave').textContent = G.best.wave;
  document.getElementById('tRuns').textContent = G.runs;
}

// Сохранение рекорда
export function saveBest() {
  const rec = G.score > G.best.score;
  if (rec) {
    G.best = { score: G.score, wave: G.wave };
    store.set('best', G.best);
  } else if (G.wave > G.best.wave) {
    G.best.wave = G.wave;
    store.set('best', G.best);
  }
  syncBest();
  return rec;
}

// Статистика для экрана конца игры
export function statsHTML() {
  const acc = G.st.shots ? Math.round(G.st.hits / G.st.shots * 100) : 0;
  const m = Math.floor(G.st.time / 60);
  const s = Math.floor(G.st.time % 60);
  let mods = 0;
  for (const k in P.lvl) mods += P.lvl[k];
  const arr = [
    ['ВОЛНА', G.wave, ''],
    ['СЧЁТ', fmt(G.score), 'g'],
    ['УБИЙСТВ', G.kills, 'm'],
    ['ТОЧНОСТЬ', acc + '%', 'a'],
    ['МОДУЛЕЙ', mods, ''],
    ['ВРЕМЯ', m + ':' + (s < 10 ? '0' : '') + s, 'g']
  ];
  return arr.map(function(x) {
    return '<div class="stat ' + x[2] + '"><s>' + x[0] + '</s><b>' + x[1] + '</b></div>';
  }).join('');
}

// Переключение звука
export function toggleSound() {
  A.init();
  A.setOn(!A.on);
  A.resume();
  syncSound();
  if (A.on) A.tone(660, 0.1, 'square', 0.08, 1.3);
}

// Синхронизация кнопки звука
export function syncSound() {
  const b = document.getElementById('bSound');
  b.classList.toggle('off', !A.on);
  b.textContent = A.on ? '♪' : 'x';
  b.title = A.on ? 'Звук включён' : 'Звук выключен';
}

// Синхронизация сложности
export function syncDiff() {
  const ps = document.querySelectorAll('[data-diff]');
  for (let i = 0; i < ps.length; i++) {
    ps[i].classList.toggle('on', ps[i].getAttribute('data-diff') === G.diff);
  }
}

// Построение кнопок сложности
export function buildDiffButtons() {
  const el = document.getElementById('diffPills');
  Object.keys(DIFF).forEach(function(k) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.type = 'button';
    b.setAttribute('data-diff', k);
    b.innerHTML = DIFF[k].n + '<small>' + DIFF[k].d + '</small>';
    b.addEventListener('click', function() {
      G.diff = k;
      store.set('diff', k);
      recalc();
      syncDiff();
      A.init();
      A.tone(440, 0.07, 'square', 0.06, 1.3);
    });
    el.appendChild(b);
  });
  syncDiff();
}

// Построение подсказок по управлению
export function buildKeys() {
  const K = isTouch
    ? [['ЛЕВО', 'движение'], ['ПРАВО', 'прицел'], ['КНОПКА', 'рывок'], ['ОГОНЬ', 'автоматически']]
    : [['W A S D', 'движение'], ['МЫШЬ', 'прицел'], ['ПРОБЕЛ', 'рывок'], ['ЛКМ', 'точный ход'], ['P / R', 'пауза / заново']];
  ['#keys1', '#keys2'].forEach(function(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = '';
    K.forEach(function(k) {
      const d = document.createElement('div');
      d.className = 'key';
      d.innerHTML = '<kbd>' + k[0] + '</kbd><span>' + k[1] + '</span>';
      el.appendChild(d);
    });
  });
}

// HUD обновление
let hudT = 0;
let lScore = -1;
let lShards = -1;

export function hud(dt) {
  hudT += dt;
  const hf = Math.min(Math.max(P.hp / P.max, 0), 1);
  document.getElementById('hpFill').style.transform = 'scaleX(' + hf + ')';
  document.getElementById('hpBar').classList.toggle('low', hf < 0.34);
  document.getElementById('stage').classList.toggle('low', G.state === 'play' && hf < 0.3);

  const dp = P.dashCd <= 0 ? 1 : 1 - P.dashCd / S.dashCd;
  document.getElementById('dashFill').style.transform = 'scaleX(' + dp + ')';
  const db = document.getElementById('dashBtn');
  db.style.setProperty('--p', dp.toFixed(2));
  db.classList.toggle('cool', P.dashCd > 0);

  document.getElementById('comboFill').style.transform = 'scaleX(' + Math.min(Math.max(G.comboT / 2.4, 0), 1) + ')';
  document.getElementById('comboBox').classList.toggle('hot', G.combo >= 8);

  if (hudT > 0.1) {
    hudT = 0;
    document.getElementById('hpTxt').textContent = Math.ceil(P.hp);
    document.getElementById('comboTxt').textContent = 'x' + G.mult.toFixed(1);
    if (G.score !== lScore) {
      lScore = G.score;
      document.getElementById('cScore').textContent = fmt(G.score);
    }
    if (G.shards !== lShards) {
      lShards = G.shards;
      document.getElementById('cShards').textContent = G.shards;
    }
  }
}

// Привязка всех кнопок
export function initButtons() {
  document.getElementById('bStart').addEventListener('click', newRun);
  document.getElementById('bSound').addEventListener('click', toggleSound);
  document.getElementById('bPause').addEventListener('click', function() {
    if (G.state === 'play') pause();
    else if (G.state === 'pause') resume();
  });
  document.getElementById('bRestart').addEventListener('click', newRun);
  document.getElementById('bResume').addEventListener('click', resume);
  document.getElementById('bRestart2').addEventListener('click', newRun);
  document.getElementById('bMenu2').addEventListener('click', toMenu);
  document.getElementById('bAgain').addEventListener('click', newRun);
  document.getElementById('bMenu').addEventListener('click', toMenu);
  document.getElementById('bAgain2').addEventListener('click', newRun);
  document.getElementById('bMenu3').addEventListener('click', toMenu);
}

// Импортируем нужные модули
import { S } from './state.js';
