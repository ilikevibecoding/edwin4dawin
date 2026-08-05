/**
 * Procedural audio.
 *
 * Everything is synthesised at runtime with WebAudio - no sample files. Events
 * carry a world position so the mix can apply distance attenuation and, for the
 * big events, a propagation delay: a high-altitude intercept flashes silently
 * and the boom arrives seconds later, which is a big part of the atmosphere.
 */

import { clamp, clamp01, lerp } from './util/mathx.js';
import { speedOfSound } from './physics.js';

const SOUND_SPEED = 340;

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.listenerPos = { x: 0, y: 1.7, z: 0 };
    this._noiseBuffer = null;
    this._alarm = null;
    this._wind = null;
    this._hum = null;
  }

  /** Must be called from a user gesture. */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    // Gentle limiter so overlapping booms never clip hard.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 8;
    this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.004;
    this.limiter.release.value = 0.25;
    this.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    this.sfx = ctx.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.ui = ctx.createGain(); this.ui.gain.value = 0.55; this.ui.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.5; this.amb.connect(this.master);

    // Large-scale reverb built from a synthesised decaying-noise impulse.
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._makeImpulse(2.6, 0.5);
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.28;
    this.verb.connect(this.verbGain);
    this.verbGain.connect(this.master);

    this._noiseBuffer = this._makeNoise(3.0);
    this._startAmbience();
    this.ready = true;
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.85 : 0;
  }

  setListener(pos) {
    this.listenerPos.x = pos.x; this.listenerPos.y = pos.y; this.listenerPos.z = pos.z;
  }

  _makeNoise(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // Slightly brown-tinted noise reads warmer than pure white.
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = w * 0.75 + last * 3.2;
    }
    return buf;
  }

  _makeImpulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * decay;
      }
    }
    return buf;
  }

  _noiseSource(when, duration, playbackRate = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    src.playbackRate.value = playbackRate;
    src.start(when);
    src.stop(when + duration + 0.05);
    return src;
  }

  /** Distance model: returns {gain, delay} or null if inaudible. */
  _spatial(pos, { rolloff = 900, maxGain = 1, delay = true } = {}) {
    if (!pos) return { gain: maxGain, delay: 0 };
    const dx = pos.x - this.listenerPos.x;
    const dy = pos.y - this.listenerPos.y;
    const dz = pos.z - this.listenerPos.z;
    const d = Math.hypot(dx, dy, dz);
    const gain = maxGain / (1 + Math.pow(d / rolloff, 1.7));
    if (gain < 0.0015) return null;
    return { gain, delay: delay ? d / SOUND_SPEED : 0, dist: d };
  }

  // ------------------------------------------------------------ ambience

  _startAmbience() {
    const ctx = this.ctx;
    // Wind: band-passed noise with a slowly wandering filter.
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    const gain = ctx.createGain(); gain.gain.value = 0.1;
    src.connect(bp); bp.connect(lp); lp.connect(gain); gain.connect(this.amb);
    src.start();
    // Slow LFO on the band centre so the wind breathes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
    lfo.start();
    this._wind = { gain, bp };

    // Equipment hum: two slightly detuned low oscillators plus mains buzz.
    const hum = ctx.createGain(); hum.gain.value = 0.0;
    for (const f of [58, 116.5, 231]) {
      const o = ctx.createOscillator();
      o.type = f > 200 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = f > 200 ? 0.012 : 0.05;
      o.connect(og); og.connect(hum);
      o.start();
    }
    hum.connect(this.amb);
    this._hum = hum;
  }

  /** Ambience responds to condition and whether the player is indoors. */
  setAmbience({ windLevel = 1, indoor = 0 }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._wind.gain.gain.setTargetAtTime(lerp(0.11, 0.03, indoor) * windLevel, t, 0.4);
    this._wind.bp.frequency.setTargetAtTime(lerp(430, 240, indoor), t, 0.6);
    this._hum.gain.setTargetAtTime(lerp(0.02, 0.5, indoor), t, 0.5);
  }

  // -------------------------------------------------------------- events

  /** Launch: crack, then a long roaring tail that swells as the round climbs. */
  launch(pos, { scale = 1 } = {}) {
    if (!this.ready || !this.enabled) return;
    const sp = this._spatial(pos, { rolloff: 1600, maxGain: 1.0 });
    if (!sp) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + sp.delay;
    const dur = 4.2 * scale;

    // Ignition crack
    const crack = this._noiseSource(t0, 0.6, 1.0);
    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass'; cf.frequency.value = 900; cf.Q.value = 0.6;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0, t0);
    cg.gain.linearRampToValueAtTime(sp.gain * 0.9, t0 + 0.012);
    cg.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.55);
    crack.connect(cf); cf.connect(cg); cg.connect(this.sfx); cg.connect(this.verb);

    // Roar body
    const roar = this._noiseSource(t0, dur, 0.7);
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.setValueAtTime(260, t0);
    rf.frequency.linearRampToValueAtTime(1500, t0 + 0.5);
    rf.frequency.exponentialRampToValueAtTime(180, t0 + dur);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.linearRampToValueAtTime(sp.gain * 0.85 * scale, t0 + 0.25);
    rg.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    roar.connect(rf); rf.connect(rg); rg.connect(this.sfx); rg.connect(this.verb);

    // Sub-bass thump
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(78, t0);
    sub.frequency.exponentialRampToValueAtTime(28, t0 + 1.4);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t0);
    sg.gain.linearRampToValueAtTime(sp.gain * 0.75 * scale, t0 + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.8);
    sub.connect(sg); sg.connect(this.sfx);
    sub.start(t0); sub.stop(t0 + 2.0);
  }

  /** Explosion: sharp transient, body, and a rumbling tail. */
  explosion(pos, { scale = 1, altitude = 0 } = {}) {
    if (!this.ready || !this.enabled) return;
    const sp = this._spatial(pos, { rolloff: 2600, maxGain: 1.0 });
    if (!sp) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + sp.delay;
    // Thin air muffles the transient and stretches the tail.
    const thin = clamp01(altitude / 20000);
    const dur = (2.2 + thin * 2.4) * scale;

    const n = this._noiseSource(t0, dur, 0.55);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lerp(2600, 700, thin), t0);
    lp.frequency.exponentialRampToValueAtTime(90, t0 + dur);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t0);
    ng.gain.linearRampToValueAtTime(sp.gain * scale, t0 + 0.008 + thin * 0.05);
    ng.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    n.connect(lp); lp.connect(ng); ng.connect(this.sfx); ng.connect(this.verb);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(lerp(120, 64, thin), t0);
    sub.frequency.exponentialRampToValueAtTime(22, t0 + dur * 0.8);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t0);
    sg.gain.linearRampToValueAtTime(sp.gain * 1.1 * scale, t0 + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    sub.connect(sg); sg.connect(this.sfx);
    sub.start(t0); sub.stop(t0 + dur + 0.1);
  }

  /** Overhead pass: a rising then falling filtered rush. */
  flyby(pos, { speed = 800 } = {}) {
    if (!this.ready || !this.enabled) return;
    const sp = this._spatial(pos, { rolloff: 700, maxGain: 0.8 });
    if (!sp) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + sp.delay;
    const n = this._noiseSource(t0, 1.6, 1.4);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, t0);
    bp.frequency.exponentialRampToValueAtTime(420, t0 + 1.4);
    bp.Q.value = 1.2;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(sp.gain, t0 + 0.18);
    gn.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.5);
    n.connect(bp); bp.connect(gn); gn.connect(this.sfx);
  }

  footstep({ sprinting = false, onConcrete = false } = {}) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const n = this._noiseSource(t0, 0.16, onConcrete ? 1.6 : 1.0);
    const f = ctx.createBiquadFilter();
    f.type = onConcrete ? 'highpass' : 'bandpass';
    f.frequency.value = onConcrete ? 900 : 380;
    f.Q.value = 1.1;
    const gn = ctx.createGain();
    const peak = (sprinting ? 0.15 : 0.09) * (onConcrete ? 1.15 : 1);
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(peak, t0 + 0.006);
    gn.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.13);
    n.connect(f); f.connect(gn); gn.connect(this.sfx);
  }

  /** Short UI blip. `kind` picks the pitch and shape. */
  blip(kind = 'select') {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const spec = {
      select: { f: 880, f2: 880, d: 0.07, g: 0.16, type: 'square' },
      confirm: { f: 660, f2: 1320, d: 0.14, g: 0.2, type: 'square' },
      deny: { f: 220, f2: 150, d: 0.18, g: 0.2, type: 'sawtooth' },
      assign: { f: 520, f2: 780, d: 0.12, g: 0.18, type: 'triangle' },
      ping: { f: 1500, f2: 1500, d: 0.1, g: 0.1, type: 'sine' },
      alert: { f: 400, f2: 900, d: 0.22, g: 0.24, type: 'square' },
    }[kind] ?? { f: 700, f2: 700, d: 0.08, g: 0.14, type: 'square' };

    const o = ctx.createOscillator();
    o.type = spec.type;
    o.frequency.setValueAtTime(spec.f, t0);
    o.frequency.linearRampToValueAtTime(spec.f2, t0 + spec.d);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(spec.g, t0 + 0.008);
    gn.gain.exponentialRampToValueAtTime(0.0005, t0 + spec.d);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 3200;
    o.connect(f); f.connect(gn); gn.connect(this.ui);
    o.start(t0); o.stop(t0 + spec.d + 0.02);
  }

  /** Radar acquisition sweep tick. */
  radarPing() { this.blip('ping'); }

  /** Klaxon while threats are inbound. */
  setAlarm(on) {
    if (!this.ready) return;
    const ctx = this.ctx;
    if (on && !this._alarm) {
      const gain = ctx.createGain(); gain.gain.value = 0;
      const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 392;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 262;
      const g1 = ctx.createGain(); g1.gain.value = 0.5;
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
      // Alternate the two tones with a square LFO on their gains.
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 0.66;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
      const lfoInv = ctx.createGain(); lfoInv.gain.value = -0.5;
      lfo.connect(lfoG); lfoG.connect(g1.gain);
      lfo.connect(lfoInv); lfoInv.connect(g2.gain);
      o1.connect(g1); o2.connect(g2);
      g1.connect(lp); g2.connect(lp);
      lp.connect(gain); gain.connect(this.amb);
      o1.start(); o2.start(); lfo.start();
      gain.gain.setTargetAtTime(0.075, ctx.currentTime, 0.3);
      this._alarm = { gain, nodes: [o1, o2, lfo] };
    } else if (!on && this._alarm) {
      const a = this._alarm;
      a.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      const stopAt = ctx.currentTime + 1.5;
      for (const n of a.nodes) { try { n.stop(stopAt); } catch (e) { /* already stopped */ } }
      this._alarm = null;
    }
  }

  /** Announce results with a distinct tonal signature. */
  result(kind) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const seq = {
      INTERCEPTED: [[523, 0], [784, 0.09], [1046, 0.18]],
      MISSED: [[392, 0], [311, 0.12]],
      DECOY: [[440, 0], [440, 0.12]],
      IMPACT: [[196, 0], [147, 0.14], [110, 0.3]],
    }[kind] ?? [[440, 0]];
    for (const [f, dt] of seq) {
      const o = ctx.createOscillator();
      o.type = kind === 'IMPACT' ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0, t0 + dt);
      gn.gain.linearRampToValueAtTime(0.19, t0 + dt + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0005, t0 + dt + 0.34);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      o.connect(lp); lp.connect(gn); gn.connect(this.ui);
      o.start(t0 + dt); o.stop(t0 + dt + 0.4);
    }
  }
}

export const audio = new Audio();
