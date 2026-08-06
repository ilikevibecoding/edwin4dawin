// Procedural audio — every sound is synthesized (noise + oscillators).
// Distant events are delayed by speed-of-sound for cinematic realism.
const SPEED_OF_SOUND = 340;

export class GameAudio {
  constructor(ctx) {
    this.gameCtx = ctx;
    this.enabled = true;
    this.started = false;
    this.ac = null;
    this.footAlt = false;
  }

  // must be called from a user gesture
  start() {
    if (this.started || !this.enabled) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }
    this.started = true;
    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = 0.55;
    this.comp = ac.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.ratio.value = 6;
    this.master.connect(this.comp).connect(ac.destination);

    // shared noise buffer
    const len = ac.sampleRate * 2;
    this.noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this._wind();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.55 : 0;
  }

  _now() { return this.ac.currentTime; }

  _distParams(pos) {
    const cam = this.gameCtx.camera;
    if (!pos || !cam) return { delay: 0, gain: 1, lp: 20000 };
    const d = cam.position.distanceTo(pos);
    return {
      delay: d / SPEED_OF_SOUND,
      gain: 1 / (1 + d / 260),
      lp: Math.max(300, 12000 - d * 3.2),
    };
  }

  _noise(t0, dur, { gain = 0.5, lpStart = 4000, lpEnd = 400, hp = 0, attack = 0.01, curve = 2 } = {}) {
    const ac = this.ac;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lpStart, t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(40, lpEnd), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.setTargetAtTime(0, t0 + attack, dur / curve);
    let node = src.connect(lp);
    if (hp > 0) {
      const hpf = ac.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = hp;
      node = node.connect(hpf);
    }
    node.connect(g).connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.1);
  }

  _thump(t0, { f0 = 90, f1 = 32, dur = 0.8, gain = 0.8 } = {}) {
    const ac = this.ac;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.setTargetAtTime(0, t0 + 0.02, dur / 3);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }

  launch(pos, plume = 'compact') {
    if (!this.started) return;
    const { delay, gain, lp } = this._distParams(pos);
    const t0 = this._now() + delay;
    const big = plume === 'huge' ? 1.6 : plume === 'tall' ? 1.25 : 1.0;
    this._noise(t0, 2.6 * big, { gain: 0.75 * gain * big, lpStart: Math.min(lp, 3200), lpEnd: 120, attack: 0.03 });
    this._noise(t0, 1.0, { gain: 0.4 * gain, lpStart: Math.min(lp, 7000), lpEnd: 800, hp: 500, attack: 0.005 });
    this._thump(t0, { f0: 70, f1: 28, dur: 1.3 * big, gain: 0.7 * gain });
  }

  explosion(pos, kind = 'ground') {
    if (!this.started) return;
    const { delay, gain, lp } = this._distParams(pos);
    const t0 = this._now() + delay;
    const big = kind === 'ground' ? 1.3 : 1.0;
    this._noise(t0, 2.2 * big, { gain: 0.9 * gain * big, lpStart: Math.min(lp, 2400), lpEnd: 60, attack: 0.004 });
    this._thump(t0, { f0: 110, f1: 24, dur: 1.6 * big, gain: 0.95 * gain });
    // crackle tail
    for (let i = 0; i < 5; i++) {
      const tt = t0 + 0.25 + Math.random() * 0.9;
      this._noise(tt, 0.14, { gain: 0.16 * gain, lpStart: 4000, lpEnd: 900, hp: 700, attack: 0.004 });
    }
  }

  radarPing() {
    if (!this.started) return;
    const ac = this.ac, t0 = this._now();
    const o = ac.createOscillator();
    o.type = 'sine'; o.frequency.value = 1180;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + 0.4);
  }

  uiBeep(freq = 880) {
    if (!this.started) return;
    const ac = this.ac, t0 = this._now();
    const o = ac.createOscillator();
    o.type = 'square'; o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + 0.1);
  }

  uiDeny() { this.uiBeep(220); }

  klaxon() {
    if (!this.started) return;
    const ac = this.ac, t0 = this._now();
    for (let i = 0; i < 3; i++) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(430, t0 + i * 0.5);
      o.frequency.linearRampToValueAtTime(560, t0 + i * 0.5 + 0.24);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t0 + i * 0.5);
      g.gain.linearRampToValueAtTime(0.12, t0 + i * 0.5 + 0.03);
      g.gain.setTargetAtTime(0, t0 + i * 0.5 + 0.3, 0.05);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      o.connect(lp).connect(g).connect(this.master);
      o.start(t0 + i * 0.5); o.stop(t0 + i * 0.5 + 0.5);
    }
  }

  stinger(good) {
    if (!this.started) return;
    const ac = this.ac, t0 = this._now();
    const notes = good ? [523, 659, 784] : [392, 330, 262];
    notes.forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t0 + i * 0.09);
      g.gain.linearRampToValueAtTime(0.09, t0 + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.5);
      o.connect(g).connect(this.master);
      o.start(t0 + i * 0.09); o.stop(t0 + i * 0.09 + 0.6);
    });
  }

  footstep() {
    if (!this.started) return;
    const t0 = this._now();
    this.footAlt = !this.footAlt;
    this._noise(t0, 0.09, {
      gain: 0.06 + Math.random() * 0.02,
      lpStart: this.footAlt ? 480 : 420, lpEnd: 160, attack: 0.004,
    });
  }

  _wind() {
    const ac = this.ac;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 300;
    bp.Q.value = 0.6;
    this.windGain = ac.createGain();
    this.windGain.gain.value = 0.05;
    src.connect(bp).connect(this.windGain).connect(this.master);
    src.start();
    // slow LFO on the filter
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoG = ac.createGain();
    lfoG.gain.value = 140;
    lfo.connect(lfoG).connect(bp.frequency);
    lfo.start();

    // generator hum (gain driven by proximity in update())
    const hum = ac.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 56;
    const hum2 = ac.createOscillator();
    hum2.type = 'sine';
    hum2.frequency.value = 112.3;
    const humLp = ac.createBiquadFilter();
    humLp.type = 'lowpass'; humLp.frequency.value = 260;
    this.humGain = ac.createGain();
    this.humGain.gain.value = 0;
    hum.connect(humLp); hum2.connect(humLp);
    humLp.connect(this.humGain).connect(this.master);
    hum.start(); hum2.start();
  }

  setWind(level) {
    if (this.windGain) this.windGain.gain.value = 0.02 + level * 0.02;
  }

  // called each frame with player position; nearest genset drives hum loudness
  updateProximity(playerPos, gensetPositions) {
    if (!this.started || !this.humGain || !gensetPositions) return;
    let d2 = Infinity;
    for (const p of gensetPositions) {
      const dd = (playerPos.x - p.x) ** 2 + (playerPos.z - p.z) ** 2;
      if (dd < d2) d2 = dd;
    }
    const d = Math.sqrt(d2);
    const target = d < 26 ? 0.09 * (1 - d / 26) : 0;
    // smooth
    const cur = this.humGain.gain.value;
    this.humGain.gain.value = cur + (target - cur) * 0.08;
  }
}
