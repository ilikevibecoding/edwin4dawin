// Procedural WebAudio: ambient drones, weather beds and UI sounds.
// Everything is synthesized — no audio files.

import { SETTINGS } from './util.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.amb = null; // { gain, stops:[] }
    this.weather = null;
    this.heartbeatTimer = null;
    this.enabled = !SETTINGS.mute;
  }

  unlock() {
    if (!this.enabled || this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -22;
    this.comp.ratio.value = 6;
    this.master.connect(this.comp);
    this.comp.connect(this.ctx.destination);

    this.ambBus = this.ctx.createGain(); this.ambBus.gain.value = 0.9; this.ambBus.connect(this.master);
    this.wxBus = this.ctx.createGain(); this.wxBus.gain.value = 0.8; this.wxBus.connect(this.master);
    this.uiBus = this.ctx.createGain(); this.uiBus.gain.value = 1.0; this.uiBus.connect(this.master);
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  _noiseBuffer(seconds = 2) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * seconds, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _osc(type, freq, dest) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.connect(dest); o.start();
    return o;
  }

  // ---------- Ambience ----------
  setAmbience(mood) {
    if (!this.ctx) { this._pendingAmb = mood; return; }
    if (this.ambMood === mood) return;
    this.ambMood = mood;
    const t = this.now();
    if (this.amb) {
      const old = this.amb;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setTargetAtTime(0, t, 1.2);
      setTimeout(() => old.stops.forEach((s) => { try { s(); } catch (e) {} }), 4000);
      this.amb = null;
    }
    if (mood === 'silence' || !mood) return;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.ambBus);
    const stops = [];
    const addOsc = (type, freq, vol, detune = 0, lfoRate = 0) => {
      const g = this.ctx.createGain(); g.gain.value = vol; g.connect(gain);
      const o = this._osc(type, freq, g); o.detune.value = detune;
      if (lfoRate > 0) {
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = lfoRate;
        const lg = this.ctx.createGain(); lg.gain.value = vol * 0.5;
        lfo.connect(lg); lg.connect(g.gain); lfo.start();
        stops.push(() => { lfo.stop(); });
      }
      stops.push(() => { o.stop(); });
    };

    const chords = {
      tense:   [[55, 'sawtooth', 0.05, 0.07], [58.3, 'sawtooth', 0.04, 0.06], [110, 'sine', 0.10], [27.5, 'sine', 0.16]],
      somber:  [[110, 'triangle', 0.09], [130.8, 'triangle', 0.07], [164.8, 'triangle', 0.06], [55, 'sine', 0.12]],
      serene:  [[261.6, 'sine', 0.05], [329.6, 'sine', 0.045], [392, 'sine', 0.04], [493.9, 'sine', 0.028], [130.8, 'sine', 0.06]],
      menace:  [[36.7, 'sine', 0.2], [73.4, 'sawtooth', 0.035], [1244, 'sine', 0.006, 0, 0.11]],
      warm:    [[146.8, 'triangle', 0.07], [220, 'triangle', 0.05], [293.7, 'sine', 0.04], [73.4, 'sine', 0.1]],
      march:   [[82.4, 'sawtooth', 0.05], [123.5, 'sawtooth', 0.04], [164.8, 'triangle', 0.05], [41.2, 'sine', 0.16]],
    };
    const set = chords[mood] || chords.somber;
    for (const [f, type, v, lfo] of set) {
      // lowpass the saws so they stay soft
      if (type === 'sawtooth') {
        const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 320; flt.Q.value = 0.4;
        const g = this.ctx.createGain(); g.gain.value = v;
        flt.connect(g); g.connect(gain);
        const o = this._osc(type, f, flt);
        o.detune.value = (Math.random() * 10 - 5);
        stops.push(() => o.stop());
      } else {
        addOsc(type, f, v, Math.random() * 8 - 4, lfo || 0);
      }
    }
    // slow breathing of the whole pad
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.04;
    const lg = this.ctx.createGain(); lg.gain.value = 0.16;
    lfo.connect(lg); lg.connect(gain.gain); lfo.start();
    stops.push(() => lfo.stop());

    gain.gain.setTargetAtTime(mood === 'menace' ? 0.5 : 0.62, t, 2.2);
    this.amb = { gain, stops };
  }

  // ---------- Weather ----------
  setWeather(kind) {
    if (!this.ctx) { this._pendingWx = kind; return; }
    if (this.wxKind === kind) return;
    this.wxKind = kind;
    const t = this.now();
    if (this.weather) {
      const old = this.weather;
      old.gain.gain.setTargetAtTime(0, t, 1.0);
      setTimeout(() => old.stops.forEach((s) => { try { s(); } catch (e) {} }), 3500);
      this.weather = null;
    }
    if (!kind || kind === 'none' || kind === 'dust' || kind === 'petals') return;

    const gain = this.ctx.createGain(); gain.gain.value = 0; gain.connect(this.wxBus);
    const stops = [];
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(3); src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    if (kind === 'rain' || kind === 'rainHeavy') { flt.type = 'lowpass'; flt.frequency.value = kind === 'rainHeavy' ? 1400 : 900; }
    else { flt.type = 'bandpass'; flt.frequency.value = 260; flt.Q.value = 0.6; } // snow wind
    src.connect(flt); flt.connect(gain); src.start();
    stops.push(() => src.stop());
    if (kind === 'snow') {
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lg = this.ctx.createGain(); lg.gain.value = 90;
      lfo.connect(lg); lg.connect(flt.frequency); lfo.start();
      stops.push(() => lfo.stop());
    }
    gain.gain.setTargetAtTime(kind === 'rainHeavy' ? 0.30 : kind === 'rain' ? 0.20 : 0.13, t, 1.6);
    this.weather = { gain, stops };
  }

  flushPending() {
    if (this._pendingAmb) { const m = this._pendingAmb; this._pendingAmb = null; this.setAmbience(m); }
    if (this._pendingWx) { const w = this._pendingWx; this._pendingWx = null; this.setWeather(w); }
  }

  // ---------- One shots ----------
  _env(dest, vol, a, d) {
    const g = this.ctx.createGain();
    const t = this.now();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(dest);
    return g;
  }

  blip() { // typewriter
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.016, 0.002, 0.03);
    const o = this._osc('square', 1750 + Math.random() * 220, g);
    setTimeout(() => o.stop(), 80);
  }

  tick() { // advance click
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.05, 0.001, 0.05);
    const o = this._osc('triangle', 880, g);
    setTimeout(() => o.stop(), 100);
  }

  uiMove() {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.04, 0.002, 0.06);
    const o = this._osc('sine', 1320, g);
    setTimeout(() => o.stop(), 120);
  }

  whoosh(rev = false) {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.10, rev ? 0.30 : 0.02, rev ? 0.05 : 0.4);
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuffer(1); src.loop = true;
    const flt = this.ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.Q.value = 1.2;
    const t = this.now();
    flt.frequency.setValueAtTime(rev ? 300 : 2400, t);
    flt.frequency.exponentialRampToValueAtTime(rev ? 2400 : 300, t + 0.45);
    src.connect(flt); flt.connect(g); src.start();
    setTimeout(() => src.stop(), 600);
  }

  timerTick(urgent = false) {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, urgent ? 0.07 : 0.045, 0.001, 0.06);
    const o = this._osc('sine', urgent ? 1180 : 940, g);
    setTimeout(() => o.stop(), 110);
  }

  chime(success = true) {
    if (!this.ctx) return;
    const notes = success ? [659.3, 987.8] : [220, 174.6];
    notes.forEach((f, i) => {
      setTimeout(() => {
        const g = this._env(this.uiBus, 0.09, 0.005, 0.7);
        const o = this._osc('sine', f, g);
        setTimeout(() => o.stop(), 900);
      }, i * 90);
    });
  }

  thud() {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.32, 0.004, 0.28);
    const o = this._osc('sine', 62, g);
    const t = this.now();
    o.frequency.setValueAtTime(88, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    setTimeout(() => o.stop(), 400);
    const ng = this._env(this.uiBus, 0.07, 0.001, 0.12);
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuffer(0.4);
    const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 500;
    src.connect(flt); flt.connect(ng); src.start();
    setTimeout(() => src.stop(), 300);
  }

  heartbeat(on) {
    if (!this.ctx) { return; }
    if (on && !this.heartbeatTimer) {
      const beat = () => {
        [0, 190].forEach((d, i) => setTimeout(() => {
          if (!this.ctx) return;
          const g = this._env(this.uiBus, i === 0 ? 0.22 : 0.14, 0.004, 0.16);
          const o = this._osc('sine', i === 0 ? 58 : 50, g);
          setTimeout(() => o.stop(), 260);
        }, d));
      };
      beat();
      this.heartbeatTimer = setInterval(beat, 900);
    } else if (!on && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  evidencePing() {
    if (!this.ctx) return;
    [1046.5, 1568].forEach((f, i) => setTimeout(() => {
      const g = this._env(this.uiBus, 0.055, 0.004, 0.5);
      const o = this._osc('sine', f, g);
      setTimeout(() => o.stop(), 650);
    }, i * 70));
  }

  toastPing(down = false) {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.05, 0.006, 0.4);
    const o = this._osc('triangle', down ? 392 : 784, g);
    setTimeout(() => o.stop(), 500);
  }

  glitchNoise(ms = 300) {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.10, 0.005, ms / 1000);
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuffer(1); src.loop = true;
    const flt = this.ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 1200;
    src.connect(flt); flt.connect(g); src.start();
    setTimeout(() => src.stop(), ms + 120);
  }

  shatter() {
    if (!this.ctx) return;
    this.glitchNoise(700);
    [2093, 2637, 3136, 1568].forEach((f, i) => setTimeout(() => {
      const g = this._env(this.uiBus, 0.07, 0.002, 0.6);
      const o = this._osc('sine', f * (0.98 + Math.random() * 0.04), g);
      setTimeout(() => o.stop(), 700);
    }, i * 60));
    this.thud();
  }

  crackHit(step = 0) {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.16, 0.001, 0.14);
    const o = this._osc('square', 180 + step * 26, g);
    setTimeout(() => o.stop(), 220);
    this.glitchNoise(120);
  }

  bootBlip(i = 0) {
    if (!this.ctx) return;
    const g = this._env(this.uiBus, 0.05, 0.002, 0.09);
    const o = this._osc('sine', 620 + (i % 4) * 160, g);
    setTimeout(() => o.stop(), 160);
  }

  cardBell() {
    if (!this.ctx) return;
    [329.6, 493.9, 415.3].forEach((f, i) => setTimeout(() => {
      const g = this._env(this.uiBus, 0.075, 0.01, 1.8);
      const o = this._osc('sine', f, g);
      const o2 = this._osc('sine', f * 2.01, this._env(this.uiBus, 0.02, 0.01, 1.2));
      setTimeout(() => { o.stop(); o2.stop(); }, 2100);
    }, i * 340));
  }
}

export const audio = new AudioEngine();
