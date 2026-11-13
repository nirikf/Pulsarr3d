// ============================================
// AUDIO — звуковая система (chiptune)
// ============================================

import { store } from './state.js';

export const A = {
  ctx: null,
  master: null,
  on: store.get('sound', true),
  last: {},
  nb: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) { return; }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.42 : 0;
    this.master.connect(this.ctx.destination);
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.nb = n;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  setOn(v) {
    this.on = v;
    store.set('sound', v);
    if (this.master) {
      this.master.gain.setTargetAtTime(v ? 0.42 : 0, this.ctx.currentTime, 0.02);
    }
  },

  gate(k, ms) {
    const t = performance.now();
    if (this.last[k] && t - this.last[k] < ms) return false;
    this.last[k] = t;
    return true;
  },

  tone(f, dur, type, vol, slide, delay) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, vol, freq, type, delay) {
    if (!this.ctx || !this.on || !this.nb) return null;
    const t = this.ctx.currentTime + (delay || 0);
    const s = this.ctx.createBufferSource();
    s.buffer = this.nb;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
    return f;
  },

  // Звуки игры
  shoot() {
    if (!this.gate('sh', 55)) return;
    this.tone(900, 0.05, 'square', 0.05, 0.4);
  },

  hit() {
    if (!this.gate('ht', 35)) return;
    this.noise(0.04, 0.06, 2200);
  },

  kill() {
    if (!this.gate('kl', 45)) return;
    this.tone(320, 0.13, 'square', 0.07, 0.25);
    this.noise(0.12, 0.07, 900);
  },

  boom() {
    this.tone(110, 0.35, 'square', 0.16, 0.25);
    this.noise(0.32, 0.14, 400, 'lowpass');
  },

  pick(n) {
    this.tone(660 * Math.pow(1.05, Math.min(n, 14)), 0.07, 'square', 0.06, 1.5);
  },

  heal() {
    this.tone(520, 0.1, 'triangle', 0.1, 1.4);
    this.tone(780, 0.12, 'triangle', 0.08, 1.4, 0.06);
  },

  dash() {
    const f = this.noise(0.2, 0.1, 700);
    if (f && this.ctx) f.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.19);
  },

  hurt() {
    this.tone(220, 0.24, 'square', 0.14, 0.3);
    this.noise(0.2, 0.1, 300, 'lowpass');
  },

  wave() {
    [392, 523, 659].forEach((f, i) => {
      this.tone(f, 0.16, 'square', 0.08, 1, i * 0.08);
    });
  },

  bossIn() {
    [0, 0.24, 0.48].forEach((d) => {
      this.tone(160, 0.22, 'sawtooth', 0.12, 1.7, d);
      this.tone(240, 0.2, 'square', 0.08, 1.6, d + 0.11);
    });
  },

  up() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone(f, 0.14, 'square', 0.08, 1, i * 0.05);
    });
  },

  over() {
    [392, 311, 262, 196].forEach((f, i) => {
      this.tone(f, 0.4, 'square', 0.11, 0.7, i * 0.15);
    });
  },

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      this.tone(f, 0.28, 'square', 0.1, 1, i * 0.1);
    });
  },

  beat(i, heat) {
    if (!this.ctx || !this.on) return;
    const bass = [0, 0, 7, 0, 5, 0, 7, 3][i % 8];
    this.tone(55 * Math.pow(2, bass / 12), 0.14, 'square', 0.11, 1);
    if (i % 2 === 1) this.noise(0.03, 0.02 + heat * 0.02, 8000, 'highpass');
    if (i % 4 === 2) this.noise(0.09, 0.05, 1600);
    if (heat > 0.12 && i % 2 === 0) {
      const sc = [0, 3, 5, 7, 10, 12];
      this.tone(220 * Math.pow(2, sc[(i / 2) % 6] / 12), 0.1, 'triangle', 0.03 + heat * 0.04, 1);
    }
  }
};
