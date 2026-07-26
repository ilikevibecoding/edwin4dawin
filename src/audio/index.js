import * as THREE from 'three';
import { rand, randRange } from '../core/rand.js';

/**
 * Procedural audio engine (no audio files). API:
 *   audio.play(name, { volume, rate })            — 2D UI/player sounds
 *   audio.at(position, name, { volume, rate })    — 3D positional
 *   audio.setAmbience(on)
 * Sound names: shot_rifle, shot_pistol, shot_distant, reload, explosion,
 * footstep, hitmarker, headshot, jet, whistle, click, empty
 */
export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.muted = false;
    this._pendingAmbience = true;

    game.events.on('game:start', () => this._init());
    game.events.on('weapon:fire', ({ weapon }) => this.play(weapon.type === 'rifle' ? 'shot_rifle' : 'shot_pistol', { volume: 0.5 }));
    game.events.on('weapon:reload', () => this.play('reload', { volume: 0.5 }));
    game.events.on('explosion', ({ position }) => this.at(position, 'explosion', { volume: 1 }));
    game.events.on('player:footstep', ({ sprint }) => this.play('footstep', { volume: sprint ? 0.26 : 0.16, rate: randRange(0.9, 1.1) }));
    game.events.on('ui:hitmarker', ({ headshot, kill }) => this.play(headshot || kill ? 'headshot' : 'hitmarker', { volume: 0.34 }));
    game.events.on('enemy:fire', ({ position }) => this.at(position, 'shot_distant', { volume: 0.55 }));
    game.events.on('airstrike:incoming', () => this.play('jet', { volume: 0.9 }));
  }

  _init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this._noise = this._makeNoise();
    if (this._pendingAmbience) this.setAmbience(true);
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _env(g, t0, a, peak, d, sustain = 0) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + a + d);
  }

  _spawn(name, dest, { volume = 1, rate = 1 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = volume;
    out.connect(dest);

    const noiseSrc = (dur, filterType, freq, q, peak, decay) => {
      const src = ctx.createBufferSource();
      src.buffer = this._noise;
      src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter();
      f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      this._env(g, t, 0.002, peak, decay);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t); src.stop(t + dur);
    };
    const osc = (type, f0, f1, dur, peak, decay) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0 * rate, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1 * rate, 1), t + dur);
      const g = ctx.createGain();
      this._env(g, t, 0.003, peak, decay);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    };

    switch (name) {
      case 'shot_rifle':
        noiseSrc(0.3, 'lowpass', 900, 0.8, 1.0, 0.09);
        noiseSrc(0.12, 'highpass', 2500, 0.5, 0.5, 0.03);
        osc('triangle', 160, 45, 0.16, 0.8, 0.1);
        break;
      case 'shot_pistol':
        noiseSrc(0.2, 'lowpass', 1400, 0.8, 0.9, 0.05);
        osc('triangle', 210, 60, 0.1, 0.7, 0.06);
        break;
      case 'shot_distant':
        noiseSrc(0.4, 'lowpass', 500, 0.6, 0.9, 0.14);
        osc('sine', 110, 40, 0.25, 0.5, 0.16);
        break;
      case 'explosion':
        noiseSrc(1.6, 'lowpass', 260, 0.4, 1.4, 0.5);
        noiseSrc(0.5, 'bandpass', 900, 0.7, 0.7, 0.2);
        osc('sine', 90, 22, 1.1, 1.3, 0.7);
        break;
      case 'reload':
        noiseSrc(0.05, 'bandpass', 2400, 4, 0.4, 0.02);
        setTimeout(() => { if (this.ctx) this._spawn('click', dest, { volume: volume * 0.8 }); }, 380);
        break;
      case 'click':
        noiseSrc(0.04, 'bandpass', 3200, 5, 0.5, 0.015);
        break;
      case 'empty':
        noiseSrc(0.05, 'bandpass', 1800, 5, 0.4, 0.02);
        break;
      case 'footstep':
        noiseSrc(0.09, 'lowpass', 320 + rand() * 140, 0.7, 0.55, 0.045);
        break;
      case 'hitmarker':
        osc('square', 2600, 2200, 0.045, 0.22, 0.03);
        break;
      case 'headshot':
        osc('square', 3100, 2400, 0.05, 0.28, 0.03);
        osc('square', 2100, 1700, 0.06, 0.2, 0.04);
        break;
      case 'jet':
        noiseSrc(2.6, 'bandpass', 700, 1.2, 0.9, 1.6);
        osc('sawtooth', 140, 400, 2.4, 0.25, 1.8);
        break;
      case 'whistle':
        osc('sine', 2200, 600, 1.5, 0.4, 1.2);
        break;
    }
  }

  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    this._spawn(name, this.master, opts);
  }

  at(position, name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 6;
    p.maxDistance = 300;
    p.rolloffFactor = 1.1;
    p.positionX.value = position.x;
    p.positionY.value = position.y;
    p.positionZ.value = position.z;
    p.connect(this.master);
    this._spawn(name, p, opts);
  }

  setAmbience(on) {
    this._pendingAmbience = on;
    if (!this.ctx || !on || this._amb) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    this._amb = src;
  }

  update(dt) {
    if (!this.ctx) return;
    const cam = this.game.camera;
    const l = this.ctx.listener;
    const pos = cam.position;
    const fwd = cam.getWorldDirection(new THREE.Vector3());
    if (l.positionX) {
      l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
      l.forwardX.value = fwd.x; l.forwardY.value = fwd.y; l.forwardZ.value = fwd.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    }
  }
}
