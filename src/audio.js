// audio.js — fully procedural WebAudio: wind ambience, footsteps, UI beeps, radar pings,
// launch roars, distance-delayed booms, klaxon. No audio files, everything synthesized.
import { clamp, lerp } from './utils.js';
import { SPEED_OF_SOUND } from './physics.js';

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.enabled = false;
    this._alarmNodes = null;
    this._windNodes = null;
    this._windTarget = 0.16;
  }

  ensure() {
    if (this.ctx || !window.AudioContext) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this._noiseBuf = this._makeNoise(2.0);
      this._startWind();
      this.enabled = true;
    } catch (e) { this.ctx = null; }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  _makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = loop;
    return src;
  }

  // ---------------- ambient wind
  _startWind() {
    const src = this._noiseSource(true);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.value = 0.14;
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start();
    this._windNodes = { src, lp, g };
  }

  setWind(amount) { this._windTarget = 0.06 + amount * 0.16; }

  update(dt) {
    if (!this.ctx || !this._windNodes) return;
    const g = this._windNodes.g.gain;
    g.value = lerp(g.value, this._windTarget, dt * 1.4);
    this._windNodes.lp.frequency.value = 320 + Math.sin(this.ctx.currentTime * 0.37) * 120 + Math.sin(this.ctx.currentTime * 0.11) * 90;
  }

  // ---------------- one-shots
  _env(node, t0, a, peak, d, sustain = 0) {
    node.gain.setValueAtTime(0, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0008), t0 + a + d);
  }

  footstep(sprint) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = sprint ? 330 : 260 + Math.random() * 60;
    bp.Q.value = 1.1;
    const g = this.ctx.createGain();
    this._env(g, t, 0.004, sprint ? 0.24 : 0.15, 0.09);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 1.2, 0.14);
  }

  uiClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square'; o.frequency.value = 1250;
    const g = this.ctx.createGain();
    this._env(g, t, 0.002, 0.07, 0.05);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.08);
  }

  uiDeny() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square'; o.frequency.setValueAtTime(240, t);
    o.frequency.setValueAtTime(180, t + 0.09);
    const g = this.ctx.createGain();
    this._env(g, t, 0.004, 0.09, 0.2);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.24);
  }

  radarPing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(1180, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.16);
    const g = this.ctx.createGain();
    this._env(g, t, 0.005, 0.12, 0.3);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.34);
  }

  newTrackAlert() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = i ? 990 : 740;
      const g = this.ctx.createGain();
      this._env(g, t + i * 0.13, 0.004, 0.13, 0.12);
      o.connect(g); g.connect(this.master);
      o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.16);
    }
  }

  launch(dist, size = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + dist / SPEED_OF_SOUND * 0.25; // launches near player: mild delay
    const vol = clamp(1.6 * size / (1 + dist / 120), 0.02, 0.9);
    // roar: noise through lowpass sweeping down + distortion
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(240, t + 2.6);
    const ws = this.ctx.createWaveShaper();
    ws.curve = this._distCurve(14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 2.9 + size);
    src.connect(lp); lp.connect(ws); ws.connect(g); g.connect(this.master);
    src.start(t, 0, 3.2 + size);
    // ignition crack
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.5);
    const g2 = this.ctx.createGain();
    this._env(g2, t, 0.01, vol * 0.7, 0.7);
    o.connect(g2); g2.connect(this.master);
    o.start(t); o.stop(t + 0.9);
  }

  boom(dist, size = 1, kind = 'intercept') {
    if (!this.ctx) return;
    const delay = dist / SPEED_OF_SOUND;
    const t = this.ctx.currentTime + delay;
    const vol = clamp(2.2 * size / (1 + dist / 260), 0.015, 1.0);
    // sub thump
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(kind === 'impact' ? 52 : 68, t);
    o.frequency.exponentialRampToValueAtTime(26, t + 0.9);
    const g = this.ctx.createGain();
    this._env(g, t, 0.012, vol, 1.1);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 1.4);
    // crack + rumble tail
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(kind === 'intercept' ? 3200 : 1600, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 1.6 + size * 0.4);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(vol * 0.8, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0008, t + 1.8 + size * 0.5);
    src.connect(lp); lp.connect(g2); g2.connect(this.master);
    src.start(t, 0.2, 2.4 + size * 0.5);
  }

  alarm(on) {
    if (!this.ctx) return;
    if (on && !this._alarmNodes) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      const lfo = this.ctx.createOscillator();
      lfo.type = 'triangle'; lfo.frequency.value = 0.85;
      const lfoG = this.ctx.createGain(); lfoG.gain.value = 160;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      o.frequency.value = 640;
      const g = this.ctx.createGain(); g.gain.value = 0.045;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      o.connect(lp); lp.connect(g); g.connect(this.master);
      o.start(); lfo.start();
      this._alarmNodes = { o, lfo, g };
    } else if (!on && this._alarmNodes) {
      const { o, lfo, g } = this._alarmNodes;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      setTimeout(() => { try { o.stop(); lfo.stop(); } catch (e) {} }, 500);
      this._alarmNodes = null;
    }
  }

  _distCurve(amount) {
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    return curve;
  }
}
