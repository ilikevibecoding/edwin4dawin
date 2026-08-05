// Fully procedural WebAudio: launches, distance-delayed explosions, radar
// pings, klaxon, footsteps, UI blips and an ambient wind bed. No samples.
import * as THREE from 'three';

const SPEED_OF_SOUND = 340;

export class GameAudio {
  constructor({ events }) {
    this.events = events;
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.listenerPos = new THREE.Vector3();
    this._noiseBuf = null;
    this._windGain = null;
    this._alarm = null;
    this._pending = [];

    // resume on first gesture (autoplay policy)
    const boot = () => { this._ensure(); window.removeEventListener('pointerdown', boot); window.removeEventListener('keydown', boot); };
    window.addEventListener('pointerdown', boot);
    window.addEventListener('keydown', boot);

    events.on('battery-fired', ({ battery }) => {
      this.launch(battery.group.position, battery.def.plumeScale);
    });
    events.on('boom', ({ pos, scale }) => this.boom(pos, scale));
    events.on('track-new', () => this.ping(880, 0.07, 0.25));
    events.on('track-classified', ({ track }) => {
      this.ping(track.classification === 'HOSTILE' ? 620 : 980, 0.09, 0.22);
    });
    events.on('intercept-hit', ({ decoy }) => {
      this.chime(decoy ? [392, 330] : [523, 659, 784]);
    });
    events.on('intercept-miss', () => this.chime([330, 262]));
    events.on('footstep', ({ sprint }) => this.footstep(sprint));
    events.on('threat-impact', () => {});
  }

  _ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return true; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      // shared noise buffer
      const len = this.ctx.sampleRate * 2;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // pinkish noise
        const white = Math.random() * 2 - 1;
        last = (last + 0.04 * white) / 1.04;
        d[i] = last * 4.2;
      }
      this._startWind();
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  update(dt, camPos) {
    this.listenerPos.copy(camPos);
  }

  _distGain(pos, ref = 150) {
    if (!pos) return 1;
    const d = this.listenerPos.distanceTo(pos);
    return THREE.MathUtils.clamp(ref / (ref + d), 0.03, 1);
  }
  _delayFor(pos) {
    if (!pos) return 0;
    return this.listenerPos.distanceTo(pos) / SPEED_OF_SOUND;
  }

  _noise({ dur = 1, filterType = 'lowpass', f0 = 800, f1 = null, gain = 0.5, when = 0, q = 0.8, attack = 0.01 }) {
    if (!this._ensure()) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(f0, t0);
    if (f1 !== null) filt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
  }

  _tone({ freq = 440, dur = 0.1, type = 'sine', gain = 0.2, when = 0, slide = null }) {
    if (!this._ensure()) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------- events --
  launch(pos, scale = 1) {
    const g = this._distGain(pos, 220) * Math.min(1.6, scale);
    const delay = this._delayFor(pos) * 0.4; // launches feel near-instant
    this._noise({ dur: 2.6 * scale, filterType: 'lowpass', f0: 900, f1: 120, gain: 0.65 * g, when: delay, attack: 0.03 });
    this._noise({ dur: 1.1, filterType: 'bandpass', f0: 2400, f1: 500, gain: 0.3 * g, when: delay, q: 0.5 });
    this._tone({ freq: 46, dur: 2.2 * scale, type: 'sine', gain: 0.5 * g, when: delay, slide: 30 });
  }

  boom(pos, scale = 1) {
    const g = this._distGain(pos, 320) * Math.min(1.8, 0.6 + scale * 0.5);
    const delay = this._delayFor(pos);
    this._noise({ dur: 1.8 + scale * 0.7, filterType: 'lowpass', f0: 420, f1: 60, gain: 0.8 * g, when: delay, attack: 0.005 });
    this._tone({ freq: 34, dur: 1.6 + scale * 0.5, type: 'sine', gain: 0.55 * g, when: delay, slide: 24 });
    if (scale > 1) {
      this._noise({ dur: 3.4, filterType: 'lowpass', f0: 200, f1: 40, gain: 0.35 * g, when: delay + 0.25, attack: 0.1 });
    }
  }

  ping(freq = 880, dur = 0.07, gain = 0.2) {
    this._tone({ freq, dur, type: 'square', gain: gain * 0.4 });
    this._tone({ freq: freq * 1.5, dur: dur * 0.6, type: 'sine', gain: gain * 0.5 });
  }

  chime(freqs) {
    freqs.forEach((f, i) => this._tone({ freq: f, dur: 0.14, type: 'triangle', gain: 0.22, when: i * 0.09 }));
  }

  click() { this._tone({ freq: 1400, dur: 0.03, type: 'square', gain: 0.12 }); }
  deny() { this._tone({ freq: 180, dur: 0.16, type: 'square', gain: 0.16, slide: 120 }); }

  footstep(sprint) {
    this._noise({ dur: 0.07, filterType: 'lowpass', f0: sprint ? 500 : 380, gain: sprint ? 0.16 : 0.1, attack: 0.004 });
  }

  alarmStart() {
    if (!this._ensure() || this._alarm) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const g = this.ctx.createGain();
    g.gain.value = 0.055;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 1.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 210;
    osc.frequency.value = 520;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(g).connect(this.master);
    osc.start(); lfo.start();
    this._alarm = { osc, lfo, g };
    // auto-stop after 6 s — it's a warning, not a headache
    setTimeout(() => this.alarmStop(), 6000);
  }
  alarmStop() {
    if (!this._alarm) return;
    const { osc, lfo, g } = this._alarm;
    g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
    setTimeout(() => { try { osc.stop(); lfo.stop(); } catch {} }, 600);
    this._alarm = null;
  }

  _startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 240;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filt).connect(g).connect(this.master);
    src.start();
    this._windGain = g;
    // slow wind swells
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = this.ctx.createGain();
    lg.gain.value = 0.025;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
  }
}
