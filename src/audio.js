import { settings } from './settings.js';
import { clamp, saturate, lerp } from './util/mathx.js';

/**
 * Fully synthesised audio - no sample files anywhere.
 *
 * Everything is built from oscillators and shaped noise. Distant events are
 * delayed by range / speed-of-sound, which is the single cheapest trick for
 * making a big outdoor space feel big.
 */

const SPEED_OF_SOUND = 340;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.enabled = settings.audioEnabled;
    this.master = null;
    this.listenerPos = { x: 0, y: 1.7, z: 0 };
    this._noiseBuffer = null;
    this._ambientNodes = null;
    this._alarm = null;
    this._lastFootstep = 0;
  }

  /** Must be called from a user gesture on most browsers. */
  init() {
    if (this.ctx || !this.enabled) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = settings.masterVolume;

    // A gentle limiter keeps a saturation wave of explosions from clipping.
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.004;
    this.limiter.release.value = 0.22;

    this.master.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    this._noiseBuffer = this._makeNoise(4);
    this.ready = true;
    this._startAmbient();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    settings.masterVolume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = settings.masterVolume;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? settings.masterVolume : 0;
  }

  _makeNoise(seconds = 2) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * seconds, sr);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      // Mild brown-noise tilt: more natural than flat white for wind and blasts.
      last = (last + 0.02 * white) / 1.02;
      data[i] = white * 0.7 + last * 3.2;
    }
    return buf;
  }

  _noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = loop;
    return src;
  }

  _now() {
    return this.ctx.currentTime;
  }

  /** Delay in seconds for an event at `distance` metres. */
  _delayFor(distance) {
    return clamp(distance / SPEED_OF_SOUND, 0, 12);
  }

  /* -------------------------------------------------- ambient */

  _startAmbient() {
    if (!this.ready) return;
    const ctx = this.ctx;
    const src = this._noiseSource(true);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    lp.Q.value = 0.6;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;

    // Slow LFO on the filter so the wind breathes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();

    // Faint generator hum from the base power units.
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 52;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 190;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(this.master);
    hum.start();

    this._ambientNodes = { src, lp, gain, hum, humGain };
  }

  setWindLevel(level) {
    if (!this._ambientNodes) return;
    this._ambientNodes.gain.gain.setTargetAtTime(0.035 + level * 0.06, this._now(), 0.8);
  }

  /* -------------------------------------------------- one shots */

  footstep(sprinting = false) {
    if (!this.ready) return;
    const t = this._now();
    if (t - this._lastFootstep < 0.12) return;
    this._lastFootstep = t;
    const ctx = this.ctx;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 380 + Math.random() * 260;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    const level = sprinting ? 0.09 : 0.055;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 0.2);
  }

  /**
   * A launch: ignition crack, then a long roaring plume, delayed by distance.
   */
  launch(distance = 30, scale = 1) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = this._now() + this._delayFor(distance);
    const atten = 1 / (1 + distance / 90);

    // Ignition crack.
    const crack = this._noiseSource();
    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.setValueAtTime(1800, t0);
    cf.frequency.exponentialRampToValueAtTime(240, t0 + 0.5);
    cf.Q.value = 0.8;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0, t0);
    cg.gain.linearRampToValueAtTime(0.5 * atten * scale, t0 + 0.02);
    cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
    crack.connect(cf);
    cf.connect(cg);
    cg.connect(this.master);
    crack.start(t0);
    crack.stop(t0 + 1.2);

    // Sustained roar with a slow decay as the round climbs away.
    const roar = this._noiseSource(true);
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.setValueAtTime(900, t0);
    rf.frequency.exponentialRampToValueAtTime(150, t0 + 4.5);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0, t0);
    rg.gain.linearRampToValueAtTime(0.34 * atten * scale, t0 + 0.15);
    rg.gain.setValueAtTime(0.34 * atten * scale, t0 + 1.2);
    rg.gain.exponentialRampToValueAtTime(0.0008, t0 + 5.5);
    roar.connect(rf);
    rf.connect(rg);
    rg.connect(this.master);
    roar.start(t0);
    roar.stop(t0 + 6);

    // Sub-bass thump you feel more than hear.
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(58, t0);
    sub.frequency.exponentialRampToValueAtTime(26, t0 + 1.4);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t0);
    sg.gain.linearRampToValueAtTime(0.36 * atten * scale, t0 + 0.03);
    sg.gain.exponentialRampToValueAtTime(0.001, t0 + 1.8);
    sub.connect(sg);
    sg.connect(this.master);
    sub.start(t0);
    sub.stop(t0 + 2);
  }

  /** A detonation. Distant ones arrive late, dull and rolling. */
  explosion(distance = 500, size = 1) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = this._now() + this._delayFor(distance);
    const atten = 1 / (1 + distance / 420);
    const far = saturate(distance / 4000);

    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lerp(2600, 380, far), t0);
    lp.frequency.exponentialRampToValueAtTime(lerp(180, 70, far), t0 + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.7 * atten * size, t0 + lerp(0.004, 0.09, far));
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + lerp(1.4, 3.4, far));
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + 4);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(lerp(80, 42, far), t0);
    sub.frequency.exponentialRampToValueAtTime(lerp(30, 20, far), t0 + 1.1);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t0);
    sg.gain.linearRampToValueAtTime(0.55 * atten * size, t0 + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);
    sub.connect(sg);
    sg.connect(this.master);
    sub.start(t0);
    sub.stop(t0 + 2.6);
  }

  /** Sonic rumble of a threat tearing through the air overhead. */
  overflight(distance = 800) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = this._now() + this._delayFor(distance) * 0.4;
    const atten = 1 / (1 + distance / 900);
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(700, t0);
    bp.frequency.exponentialRampToValueAtTime(180, t0 + 1.5);
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.28 * atten, t0 + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + 2.5);
  }

  /** Short UI blip. `kind` selects the pitch and shape. */
  ui(kind = 'click') {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = this._now();
    const table = {
      click: { f: 880, f2: 880, dur: 0.05, gain: 0.09, type: 'square' },
      select: { f: 660, f2: 990, dur: 0.09, gain: 0.10, type: 'triangle' },
      confirm: { f: 520, f2: 1180, dur: 0.16, gain: 0.13, type: 'triangle' },
      deny: { f: 320, f2: 170, dur: 0.19, gain: 0.13, type: 'sawtooth' },
      ping: { f: 1500, f2: 1500, dur: 0.22, gain: 0.07, type: 'sine' },
      detect: { f: 1180, f2: 1560, dur: 0.13, gain: 0.11, type: 'sine' },
      success: { f: 620, f2: 1560, dur: 0.28, gain: 0.15, type: 'triangle' },
      fail: { f: 420, f2: 140, dur: 0.34, gain: 0.14, type: 'sawtooth' }
    };
    const p = table[kind] || table.click;
    const osc = ctx.createOscillator();
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.f, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, p.f2), t0 + p.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(p.gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + p.dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + p.dur + 0.05);
  }

  /** Servo whine while a launcher elevates. */
  servo(duration = 1.2) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = this._now();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.linearRampToValueAtTime(190, t0 + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(105, t0 + duration);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 3.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.12);
    g.gain.setValueAtTime(0.05, t0 + duration - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + duration);
    osc.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.1);
  }

  /** Site alarm klaxon; call `stopAlarm` to end it. */
  startAlarm() {
    if (!this.ready || this._alarm) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.055, this._now(), 0.2);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    osc.start();
    lfo.start();
    this._alarm = { osc, lfo, g };
  }

  stopAlarm() {
    if (!this._alarm) return;
    const { osc, lfo, g } = this._alarm;
    const t = this._now();
    g.gain.setTargetAtTime(0, t, 0.15);
    osc.stop(t + 1.2);
    lfo.stop(t + 1.2);
    this._alarm = null;
  }

  dispose() {
    this.stopAlarm();
    this.ctx?.close?.();
    this.ctx = null;
    this.ready = false;
  }
}

export const audio = new AudioEngine();
