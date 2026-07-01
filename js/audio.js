// Tiny WebAudio synth cues: servo whirr, grip clacks, impact thuds, bin chime.
// Everything is generated, no audio assets.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.servoGain = null;
    this.servoOn = false;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return false;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(c.destination);

    // continuous servo loop (sawtooth through bandpass), gated by gain
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 84;
    const lfo = c.createOscillator();
    lfo.frequency.value = 13;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain).connect(osc.frequency);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 330;
    bp.Q.value = 2.2;
    this.servoGain = c.createGain();
    this.servoGain.gain.value = 0;
    osc.connect(bp).connect(this.servoGain).connect(this.master);
    osc.start();
    lfo.start();
    return true;
  }

  resume() {
    if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume();
  }

  servo(on) {
    if (!this.ctx || on === this.servoOn) return;
    this.servoOn = on;
    const t = this.ctx.currentTime;
    this.servoGain.gain.cancelScheduledValues(t);
    this.servoGain.gain.setTargetAtTime(on ? 0.05 : 0, t, on ? 0.03 : 0.08);
  }

  blip(freq, dur, type = 'square', vol = 0.16, slide = 0) {
    if (!this.ensure()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol, freq = 900) {
    if (!this.ensure()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  gripClose() { this.blip(190, 0.07, 'square', 0.12, -70); this.noiseBurst(0.05, 0.10, 2200); }
  gripOpen() { this.blip(150, 0.06, 'square', 0.09, 60); }
  grabOk() { this.blip(420, 0.09, 'triangle', 0.16, 160); }
  grabFail() { this.blip(130, 0.16, 'sawtooth', 0.12, -50); }
  drop() { this.blip(240, 0.05, 'triangle', 0.08, -90); }
  impact(strength) {
    this.noiseBurst(0.09, Math.min(0.25, 0.05 + strength * 0.035), 500);
  }
  binned() {
    this.blip(523, 0.10, 'triangle', 0.15);
    setTimeout(() => this.blip(784, 0.16, 'triangle', 0.15), 90);
  }
}
