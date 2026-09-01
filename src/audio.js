// Small WebAudio synthesizer: every sound in the game is generated procedurally.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._noiseBuf = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        return;
      }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _env(gainNode, t0, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  tone({ freq = 440, to = null, dur = 0.2, type = 'sine', gain = 0.3, delay = 0, attack = 0.005 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    this._env(g, t0, gain, attack, dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + attack + dur + 0.05);
  }

  noise({ dur = 0.15, gain = 0.3, filter = 1200, q = 0.7, type = 'lowpass', delay = 0, attack = 0.002 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filter;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this._env(g, t0, gain, attack, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random() * 1.2);
    src.stop(t0 + attack + dur + 0.05);
  }

  play(name, vol = 1) {
    if (!this.ctx || !this.enabled) return;
    const v = Math.max(0, Math.min(1.5, vol));
    switch (name) {
      case 'shot_pistol':
        this.noise({ dur: 0.08, gain: 0.5 * v, filter: 2200 });
        this.tone({ freq: 220, to: 60, dur: 0.08, type: 'square', gain: 0.25 * v });
        break;
      case 'shot_smg':
        this.noise({ dur: 0.06, gain: 0.4 * v, filter: 2800 });
        this.tone({ freq: 300, to: 90, dur: 0.05, type: 'square', gain: 0.18 * v });
        break;
      case 'shot_ar':
        this.noise({ dur: 0.1, gain: 0.55 * v, filter: 1800 });
        this.tone({ freq: 180, to: 50, dur: 0.1, type: 'sawtooth', gain: 0.3 * v });
        break;
      case 'shot_shotgun':
        this.noise({ dur: 0.22, gain: 0.8 * v, filter: 900 });
        this.tone({ freq: 120, to: 35, dur: 0.22, type: 'sawtooth', gain: 0.45 * v });
        break;
      case 'shot_sniper':
        this.noise({ dur: 0.3, gain: 0.7 * v, filter: 1400 });
        this.tone({ freq: 160, to: 30, dur: 0.35, type: 'sawtooth', gain: 0.4 * v });
        this.tone({ freq: 900, to: 200, dur: 0.15, type: 'sine', gain: 0.1 * v });
        break;
      case 'hit':
        this.tone({ freq: 1100, dur: 0.05, type: 'square', gain: 0.12 * v });
        break;
      case 'headshot':
        this.tone({ freq: 1500, to: 1900, dur: 0.07, type: 'square', gain: 0.14 * v });
        break;
      case 'hurt':
        this.noise({ dur: 0.12, gain: 0.3 * v, filter: 600 });
        this.tone({ freq: 200, to: 120, dur: 0.15, type: 'triangle', gain: 0.2 * v });
        break;
      case 'shield_hit':
        this.tone({ freq: 700, to: 400, dur: 0.12, type: 'triangle', gain: 0.2 * v });
        break;
      case 'swing':
        this.noise({ dur: 0.12, gain: 0.12 * v, filter: 700, type: 'bandpass', q: 1.5 });
        break;
      case 'harvest_wood':
        this.noise({ dur: 0.08, gain: 0.35 * v, filter: 800 });
        this.tone({ freq: 240, to: 160, dur: 0.08, type: 'triangle', gain: 0.2 * v });
        break;
      case 'harvest_brick':
        this.noise({ dur: 0.1, gain: 0.4 * v, filter: 500 });
        this.tone({ freq: 140, to: 90, dur: 0.1, type: 'triangle', gain: 0.2 * v });
        break;
      case 'harvest_metal':
        this.tone({ freq: 900, to: 500, dur: 0.15, type: 'square', gain: 0.15 * v });
        this.noise({ dur: 0.06, gain: 0.25 * v, filter: 3000, type: 'highpass' });
        break;
      case 'build':
        this.tone({ freq: 500, to: 800, dur: 0.07, type: 'square', gain: 0.12 * v });
        this.noise({ dur: 0.05, gain: 0.15 * v, filter: 1500 });
        break;
      case 'build_fail':
        this.tone({ freq: 220, to: 160, dur: 0.1, type: 'square', gain: 0.08 * v });
        break;
      case 'destroy':
        this.noise({ dur: 0.35, gain: 0.5 * v, filter: 500 });
        this.tone({ freq: 90, to: 40, dur: 0.3, type: 'triangle', gain: 0.3 * v });
        break;
      case 'pickup':
        this.tone({ freq: 660, dur: 0.06, type: 'sine', gain: 0.15 * v });
        this.tone({ freq: 990, dur: 0.1, type: 'sine', gain: 0.15 * v, delay: 0.06 });
        break;
      case 'chest':
        [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.18, type: 'sine', gain: 0.16 * v, delay: i * 0.07 }));
        break;
      case 'ammo':
        this.tone({ freq: 440, dur: 0.06, type: 'triangle', gain: 0.15 * v });
        this.tone({ freq: 550, dur: 0.08, type: 'triangle', gain: 0.15 * v, delay: 0.06 });
        break;
      case 'reload':
        this.noise({ dur: 0.05, gain: 0.2 * v, filter: 2500 });
        this.tone({ freq: 400, to: 300, dur: 0.06, type: 'square', gain: 0.06 * v, delay: 0.15 });
        break;
      case 'empty':
        this.tone({ freq: 300, dur: 0.04, type: 'square', gain: 0.08 * v });
        break;
      case 'heal':
        [440, 554, 659].forEach((f, i) => this.tone({ freq: f, dur: 0.15, type: 'sine', gain: 0.14 * v, delay: i * 0.08 }));
        break;
      case 'shield':
        [392, 523, 784].forEach((f, i) => this.tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.14 * v, delay: i * 0.08 }));
        break;
      case 'storm':
        this.tone({ freq: 90, to: 70, dur: 0.4, type: 'sawtooth', gain: 0.12 * v });
        this.noise({ dur: 0.3, gain: 0.12 * v, filter: 300 });
        break;
      case 'elim':
        this.tone({ freq: 880, dur: 0.08, type: 'square', gain: 0.15 * v });
        this.tone({ freq: 1320, dur: 0.16, type: 'square', gain: 0.15 * v, delay: 0.08 });
        break;
      case 'glider':
        this.noise({ dur: 0.6, gain: 0.3 * v, filter: 900, attack: 0.05 });
        break;
      case 'land':
        this.noise({ dur: 0.15, gain: 0.3 * v, filter: 400 });
        break;
      case 'jump':
        this.noise({ dur: 0.05, gain: 0.05 * v, filter: 600 });
        break;
      case 'switch':
        this.noise({ dur: 0.04, gain: 0.12 * v, filter: 2000 });
        break;
      case 'victory':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ freq: f, dur: 0.35, type: 'triangle', gain: 0.2 * v, delay: i * 0.13 }));
        break;
      case 'defeat':
        [400, 300, 200].forEach((f, i) => this.tone({ freq: f, to: f * 0.8, dur: 0.4, type: 'sawtooth', gain: 0.15 * v, delay: i * 0.25 }));
        break;
      case 'zone':
        this.tone({ freq: 330, dur: 0.25, type: 'sine', gain: 0.15 * v });
        this.tone({ freq: 440, dur: 0.35, type: 'sine', gain: 0.15 * v, delay: 0.2 });
        break;
      default:
        break;
    }
  }
}
