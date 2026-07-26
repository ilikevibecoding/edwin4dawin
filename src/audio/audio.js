import { makeRNG } from '../core/utils.js';

const rng = makeRNG(112233);

// ===========================================================================
// Fully procedural WebAudio SFX. No audio files: every sound is synthesized
// (noise bursts, filtered sweeps, sub-bass sines) through a master bus with
// gentle compression.
// ===========================================================================

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createDynamicsCompressor();
    this.master.threshold.value = -14;
    this.master.knee.value = 22;
    this.master.ratio.value = 8;
    this.master.attack.value = 0.002;
    this.master.release.value = 0.18;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.72;
    this.master.connect(gain);
    gain.connect(this.ctx.destination);
    this.enabled = true;
    this.startAmbience();
  }

  // ---- primitive builders --------------------------------------------------
  noiseBuffer(seconds = 1, color = 'white') {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = rng() * 2 - 1;
      if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }

  env(node, t0, attack, peak, decay, sustainLevel = 0) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + attack);
    node.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), t0 + attack + decay);
  }

  burst({ dur = 0.3, color = 'white', filterType = 'lowpass', freq0 = 3000, freq1 = 400, peak = 0.5, attack = 0.002, pan = 0, delay = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.05, color);
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(freq0, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(freq1, 30), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, attack, peak, dur);
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    src.connect(filt); filt.connect(g); g.connect(p); p.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.1);
  }

  tone({ type = 'sine', f0 = 440, f1 = 440, dur = 0.2, peak = 0.3, attack = 0.003, delay = 0, pan = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, attack, peak, dur);
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    osc.connect(g); g.connect(p); p.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
  }

  // ---- game sounds -----------------------------------------------------------
  play(name, dist = 0) {
    if (!this.enabled) return;
    const att = 1 / (1 + dist * 0.055);          // distance attenuation
    const muffle = Math.max(0.25, 1 - dist * 0.012); // distance lowpass factor
    switch (name) {
      case 'shot': {
        this.burst({ dur: 0.06, freq0: 7000, freq1: 1400, peak: 0.5, attack: 0.001 });
        this.burst({ dur: 0.16, color: 'brown', freq0: 900, freq1: 160, peak: 0.75, attack: 0.001 });
        this.tone({ type: 'sine', f0: 110, f1: 42, dur: 0.11, peak: 0.5 });
        this.burst({ dur: 0.35, color: 'brown', freq0: 500, freq1: 90, peak: 0.16, attack: 0.01, delay: 0.02 }); // tail
        break;
      }
      case 'enemyShot': {
        const pan = rng.range(-0.6, 0.6);
        this.burst({ dur: 0.05, freq0: 4500 * muffle, freq1: 900, peak: 0.3 * att, pan });
        this.burst({ dur: 0.2, color: 'brown', freq0: 800 * muffle, freq1: 120, peak: 0.5 * att, pan });
        this.burst({ dur: 0.5, color: 'brown', freq0: 380 * muffle, freq1: 70, peak: 0.14 * att, delay: 0.03, pan });
        break;
      }
      case 'reload': {
        this.burst({ dur: 0.04, freq0: 3000, freq1: 1500, peak: 0.22, delay: 0.15 });
        this.burst({ dur: 0.05, freq0: 2200, freq1: 1000, peak: 0.26, delay: 0.85 });
        this.burst({ dur: 0.05, freq0: 3400, freq1: 1600, peak: 0.3, delay: 1.55 });
        break;
      }
      case 'hitmarker':
        this.tone({ type: 'square', f0: 2600, f1: 2200, dur: 0.035, peak: 0.08 });
        break;
      case 'playerHit':
        this.burst({ dur: 0.14, color: 'brown', freq0: 500, freq1: 120, peak: 0.5 });
        this.tone({ type: 'sine', f0: 180, f1: 70, dur: 0.12, peak: 0.3 });
        break;
      case 'whizz':
        this.burst({ dur: 0.14, filterType: 'bandpass', freq0: 4200, freq1: 900, peak: 0.13, pan: rng.range(-0.8, 0.8) });
        break;
      case 'explosion': {
        this.burst({ dur: 1.6, color: 'brown', freq0: 700 * muffle, freq1: 45, peak: 1.1 * att, attack: 0.004 });
        this.tone({ type: 'sine', f0: 70, f1: 26, dur: 1.1, peak: 0.9 * att });
        this.burst({ dur: 2.8, color: 'brown', freq0: 260 * muffle, freq1: 40, peak: 0.3 * att, attack: 0.15, delay: 0.25 }); // rumble tail
        this.burst({ dur: 0.3, freq0: 6000 * muffle, freq1: 800, peak: 0.28 * att, attack: 0.001 }); // debris crackle
        break;
      }
      case 'airstrikeCall':
        this.tone({ type: 'square', f0: 1180, f1: 1180, dur: 0.09, peak: 0.11 });
        this.tone({ type: 'square', f0: 1560, f1: 1560, dur: 0.11, peak: 0.11, delay: 0.16 });
        break;
      case 'jetFlyby': {
        // Long swept roar, panned across
        const t0 = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer(4.2, 'brown');
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'bandpass'; filt.Q.value = 0.8;
        filt.frequency.setValueAtTime(220, t0);
        filt.frequency.exponentialRampToValueAtTime(900, t0 + 1.9);
        filt.frequency.exponentialRampToValueAtTime(160, t0 + 4.0);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.62, t0 + 1.8);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 4.1);
        const p = this.ctx.createStereoPanner();
        p.pan.setValueAtTime(-0.9, t0);
        p.pan.linearRampToValueAtTime(0.9, t0 + 3.6);
        src.connect(filt); filt.connect(g); g.connect(p); p.connect(this.master);
        src.start(t0); src.stop(t0 + 4.3);
        break;
      }
      case 'bombWhistle':
        this.tone({ type: 'sine', f0: 1900, f1: 480, dur: 1.05, peak: 0.12 * att, attack: 0.15 });
        break;
      case 'footstep':
        this.burst({ dur: 0.07, color: 'brown', freq0: 480, freq1: 130, peak: 0.11, attack: 0.002 });
        break;
      case 'enemyDeath':
        this.burst({ dur: 0.22, color: 'brown', freq0: 300 * muffle, freq1: 70, peak: 0.2 * att });
        break;
      case 'streakReady':
        this.tone({ type: 'sine', f0: 880, f1: 880, dur: 0.1, peak: 0.12 });
        this.tone({ type: 'sine', f0: 1320, f1: 1320, dur: 0.16, peak: 0.12, delay: 0.12 });
        break;
    }
  }

  startAmbience() {
    // Wind: looping filtered noise with slow LFO
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(6, 'brown');
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 300;
    filt.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.value = 0.055;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 0.028;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(); lfo.start();

    // Distant war rumbles on a timer
    const rumble = () => {
      if (!this.enabled) return;
      this.burst({ dur: 2.2, color: 'brown', freq0: 140, freq1: 35, peak: 0.09, attack: 0.3, pan: rng.range(-0.7, 0.7) });
      setTimeout(rumble, rng.range(9000, 24000));
    };
    setTimeout(rumble, 6000);
  }
}
