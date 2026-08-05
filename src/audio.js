// Fully procedural audio. Everything is synthesised with WebAudio nodes and
// generated noise buffers — no sample files. Explosions arrive late at the speed
// of sound, which is the single most convincing cue in the whole scene.

import * as THREE from 'three';
import { WORLD } from './config.js';
import { state, bus } from './state.js';

function makeNoiseBuffer(ctx, seconds, kind = 'white') {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function makeImpulse(ctx, seconds = 2.4, decay = 3.2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Sparse early reflections over an exponential tail reads as open desert.
      const sparkle = i % Math.floor(ctx.sampleRate * 0.037) < 40 ? 2.2 : 1;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * sparkle * 0.5;
    }
  }
  return buf;
}

export class AudioEngine {
  constructor() {
    this.ready = false;
    this.enabled = true;
    this.ctx = null;
    this.listenerPos = new THREE.Vector3();
    this.pending = [];
    this.loops = {};
    this.subtitleQueue = [];
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = state.masterVolume;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;
    this.master.connect(this.comp);
    this.comp.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.6, 3.0);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.32;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);

    this.dry = ctx.createGain();
    this.dry.gain.value = 1;
    this.dry.connect(this.master);

    this.noise = {
      white: makeNoiseBuffer(ctx, 2, 'white'),
      pink: makeNoiseBuffer(ctx, 3, 'pink'),
      brown: makeNoiseBuffer(ctx, 3, 'brown'),
    };

    this.ready = true;
    this._startAmbient();
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    state.masterVolume = v;
    if (this.master) this.master.gain.value = v;
  }

  get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /* ------------------------------------------------------------- routing */

  _bus(gain = 1, wet = 0.25) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.dry);
    const w = this.ctx.createGain();
    w.gain.value = wet;
    g.connect(w);
    w.connect(this.reverb);
    return g;
  }

  /** Distance attenuation + air absorption + travel delay. */
  _spatial(pos, { refDist = 60, rolloff = 1.0, maxLp = 18000 } = {}) {
    const d = this.listenerPos.distanceTo(pos);
    const gain = 1 / (1 + Math.pow(d / refDist, rolloff));
    const lp = Math.max(220, maxLp * Math.exp(-d / 2600));
    const delay = d / WORLD.speedOfSound;
    return { d, gain, lp, delay };
  }

  _noiseSrc(kind = 'white', rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[kind];
    s.loop = true;
    s.playbackRate.value = rate;
    return s;
  }

  /* -------------------------------------------------------------- events */

  launch(pos, batteryCfg) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const sp = this._spatial(pos, { refDist: 90, rolloff: 1.05 });
    const t0 = this.t + sp.delay;
    const scale = batteryCfg ? batteryCfg.plumeScale : 1;
    const out = this._bus(1.05 * sp.gain, 0.4);

    // Ignition crack
    const crack = this._noiseSrc('white', 1);
    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 1400;
    cf.Q.value = 0.7;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0, t0);
    cg.gain.linearRampToValueAtTime(1.0, t0 + 0.012);
    cg.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.45);
    crack.connect(cf);
    cf.connect(cg);
    cg.connect(out);
    crack.start(t0);
    crack.stop(t0 + 0.5);

    // Sustained roar: brown noise through a sweeping lowpass
    const roar = this._noiseSrc('brown', 1);
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.setValueAtTime(Math.min(sp.lp, 900 * scale), t0);
    rf.frequency.linearRampToValueAtTime(Math.min(sp.lp, 260), t0 + 3.4 * scale);
    rf.Q.value = 0.8;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.linearRampToValueAtTime(1.5 * scale, t0 + 0.16);
    rg.gain.setTargetAtTime(0.0001, t0 + 1.4 * scale, 1.1 * scale);
    roar.connect(rf);
    rf.connect(rg);
    rg.connect(out);
    roar.start(t0);
    roar.stop(t0 + 7 * scale);

    // Sub thump
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(72 / scale, t0);
    sub.frequency.exponentialRampToValueAtTime(28, t0 + 1.2);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.linearRampToValueAtTime(1.1 * scale, t0 + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    sub.connect(sg);
    sg.connect(out);
    sub.start(t0);
    sub.stop(t0 + 1.8);

    this._say(`LAUNCH — ${batteryCfg ? batteryCfg.short : ''}`, 'launch');
  }

  explosion(pos, size = 1, kind = 'air') {
    if (!this.ready) return;
    const ctx = this.ctx;
    const sp = this._spatial(pos, { refDist: 260, rolloff: 1.25 });
    const t0 = this.t + sp.delay;
    const out = this._bus(1.2 * sp.gain, 0.55);

    const burst = this._noiseSrc('white', 1);
    const bf = ctx.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.setValueAtTime(Math.min(sp.lp, 5200), t0);
    bf.frequency.exponentialRampToValueAtTime(Math.max(180, Math.min(sp.lp, 420)), t0 + 1.4);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t0);
    bg.gain.linearRampToValueAtTime(1.4, t0 + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8 + size * 0.02);
    burst.connect(bf);
    bf.connect(bg);
    bg.connect(out);
    burst.start(t0);
    burst.stop(t0 + 2.4);

    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(120, t0);
    boom.frequency.exponentialRampToValueAtTime(24, t0 + 0.9);
    const bog = ctx.createGain();
    bog.gain.setValueAtTime(0.0001, t0);
    bog.gain.linearRampToValueAtTime(1.6, t0 + 0.03);
    bog.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
    boom.connect(bog);
    bog.connect(out);
    boom.start(t0);
    boom.stop(t0 + 1.6);

    if (kind === 'ground') {
      const rumble = this._noiseSrc('brown', 0.7);
      const rf = ctx.createBiquadFilter();
      rf.type = 'lowpass';
      rf.frequency.value = 120;
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(0.0001, t0);
      rg.gain.linearRampToValueAtTime(0.9, t0 + 0.2);
      rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
      rumble.connect(rf);
      rf.connect(rg);
      rg.connect(out);
      rumble.start(t0);
      rumble.stop(t0 + 4);
    }
  }

  sonicBoom(pos) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const sp = this._spatial(pos, { refDist: 400, rolloff: 1.2 });
    const t0 = this.t + sp.delay;
    const out = this._bus(0.9 * sp.gain, 0.3);
    for (const off of [0, 0.055]) {
      const n = this._noiseSrc('white', 1);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 320;
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0 + off);
      g.gain.linearRampToValueAtTime(1.1, t0 + off + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.28);
      n.connect(f);
      f.connect(g);
      g.connect(out);
      n.start(t0 + off);
      n.stop(t0 + off + 0.3);
    }
  }

  alarm(count = 3) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const out = this._bus(0.32, 0.18);
    for (let i = 0; i < count; i++) {
      const t0 = this.t + i * 0.46;
      for (const [freq, det] of [[740, 0], [988, 0.02]]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0 + det);
        g.gain.linearRampToValueAtTime(0.5, t0 + det + 0.012);
        g.gain.setValueAtTime(0.5, t0 + det + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + det + 0.3);
        o.connect(g);
        g.connect(out);
        o.start(t0 + det);
        o.stop(t0 + det + 0.32);
      }
    }
    this._say('WARNING — INBOUND BALLISTIC TRACK', 'alarm');
  }

  ping() {
    if (!this.ready) return;
    const ctx = this.ctx;
    const out = this._bus(0.14, 0.4);
    const t0 = this.t;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1720, t0);
    o.frequency.exponentialRampToValueAtTime(940, t0 + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.6, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + 0.32);
  }

  ui(kind = 'click') {
    if (!this.ready) return;
    const ctx = this.ctx;
    const out = this._bus(0.2, 0.1);
    const t0 = this.t;
    const freq = kind === 'deny' ? 180 : kind === 'confirm' ? 620 : 380;
    const o = ctx.createOscillator();
    o.type = kind === 'deny' ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(freq, t0);
    if (kind === 'confirm') o.frequency.exponentialRampToValueAtTime(freq * 1.7, t0 + 0.09);
    if (kind === 'deny') o.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + 0.15);
  }

  footstep(sprinting) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const out = this._bus(sprinting ? 0.3 : 0.2, 0.12);
    const t0 = this.t;
    const n = this._noiseSrc('white', 0.8 + Math.random() * 0.4);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 220 + Math.random() * 160;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.8, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(t0 + 0.16);
  }

  servo(on) {
    if (!this.ready) return;
    if (on && !this.loops.servo) {
      const ctx = this.ctx;
      const out = this._bus(0.1, 0.15);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 210;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.5, this.t, 0.08);
      o.connect(f);
      f.connect(g);
      g.connect(out);
      o.start();
      this.loops.servo = { o, g };
    } else if (!on && this.loops.servo) {
      const l = this.loops.servo;
      l.g.gain.setTargetAtTime(0.0001, this.t, 0.12);
      l.o.stop(this.t + 0.6);
      this.loops.servo = null;
    }
  }

  /** Continuous rocket burn heard while any interceptor is thrusting. */
  thrust(active, distance = 500, doppler = 1) {
    if (!this.ready) return;
    if (active && !this.loops.thrust) {
      const ctx = this.ctx;
      const out = this._bus(0.7, 0.4);
      const n = this._noiseSrc('brown', 1);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      n.connect(f);
      f.connect(g);
      g.connect(out);
      n.start();
      this.loops.thrust = { n, f, g };
    }
    if (this.loops.thrust) {
      const l = this.loops.thrust;
      const gain = active ? 1 / (1 + Math.pow(distance / 900, 1.1)) : 0.0001;
      l.g.gain.setTargetAtTime(Math.max(0.0001, gain * 1.4), this.t, 0.16);
      l.f.frequency.setTargetAtTime(Math.max(180, 900 * doppler * Math.exp(-distance / 5000)), this.t, 0.2);
      l.n.playbackRate.setTargetAtTime(Math.max(0.4, doppler), this.t, 0.2);
    }
  }

  _startAmbient() {
    const ctx = this.ctx;
    // wind
    const out = this._bus(0.24, 0.35);
    const n = this._noiseSrc('pink', 0.6);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.32;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start();
    lfo.start();
    this.loops.wind = { n, f, g };

    // distant generator hum
    const hout = this._bus(0.12, 0.2);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 58;
    const hf = ctx.createBiquadFilter();
    hf.type = 'lowpass';
    hf.frequency.value = 180;
    const hg = ctx.createGain();
    hg.gain.value = 0.5;
    o.connect(hf);
    hf.connect(hg);
    hg.connect(hout);
    o.start();
    this.loops.hum = { o, hg };
  }

  setWindLevel(level) {
    if (this.loops.wind) this.loops.wind.g.gain.setTargetAtTime(0.35 + level * 0.5, this.t, 0.6);
  }

  _say(text, kind) {
    if (!state.subtitles) return;
    bus.emit('audioCue', { text, kind });
  }

  update(dt, listenerPos) {
    this.listenerPos.copy(listenerPos);
  }
}
