// Procedural audio placeholders: a WebAudio bus with per-zone ambience (filtered noise + hums) and
// one-shot events (door hiss, lift rumble, TIE launch). No assets; everything is synthesised so the
// hooks are real and can be swapped for recorded sound later. Starts on the first user gesture.
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambience = null;
    this.zone = null;
    this.enabled = true;
    this.volume = 0.5;
    this.listeners = {};
  }

  // must be called from a user gesture (click / key)
  start() {
    if (this.ctx || !this.enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoiseBuffer();
      if (this.zone) this.setZone(this.zone, true);
    } catch (e) {
      this.ctx = null;
    }
  }

  makeNoiseBuffer() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < len; i++) {
      // brown-ish noise
      const w = Math.random() * 2 - 1;
      b0 = (b0 + 0.02 * w) / 1.02;
      d[i] = b0 * 3.5;
    }
    return buf;
  }

  // Ambience profiles per cluster / hero room
  static PROFILES = {
    exterior: { hum: 0, noise: 0.0 },
    bridge: { hum: 48, humGain: 0.05, noise: 0.03, filter: 900, beeps: true },
    tower: { hum: 55, humGain: 0.05, noise: 0.03, filter: 700 },
    crew: { hum: 60, humGain: 0.06, noise: 0.04, filter: 600 },
    eng: { hum: 38, humGain: 0.12, noise: 0.08, filter: 400, throb: true },
    hangar: { hum: 42, humGain: 0.07, noise: 0.1, filter: 1400, wind: true },
  };

  setZone(zone, force = false) {
    if (zone === this.zone && !force) return;
    this.zone = zone;
    if (!this.ctx) return;
    const p = AudioBus.PROFILES[zone] || AudioBus.PROFILES.tower;
    const now = this.ctx.currentTime;
    if (this.ambience) {
      const old = this.ambience;
      old.gain.gain.setTargetAtTime(0, now, 0.6);
      setTimeout(() => old.nodes.forEach((n) => n.stop && n.stop()), 2500);
    }
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    const nodes = [];
    if (p.hum) {
      for (const [f, g] of [
        [p.hum, p.humGain],
        [p.hum * 2.01, p.humGain * 0.4],
        [p.hum * 2.98, p.humGain * 0.15],
      ]) {
        const o = this.ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const og = this.ctx.createGain();
        og.gain.value = g;
        o.connect(og).connect(gain);
        o.start();
        nodes.push(o);
        if (p.throb) {
          const lfo = this.ctx.createOscillator();
          lfo.frequency.value = 0.4;
          const lg = this.ctx.createGain();
          lg.gain.value = g * 0.5;
          lfo.connect(lg).connect(og.gain);
          lfo.start();
          nodes.push(lfo);
        }
      }
    }
    if (p.noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = p.filter;
      const ng = this.ctx.createGain();
      ng.gain.value = p.noise;
      src.connect(f).connect(ng).connect(gain);
      src.start();
      nodes.push(src);
    }
    gain.gain.setTargetAtTime(1, now + 0.05, 0.8);
    this.ambience = { gain, nodes };
  }

  // One-shot events
  play(name, opts = {}) {
    for (const cb of this.listeners[name] || []) cb(opts);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.connect(this.master);
    const burst = (dur, filterHz, gainV, q = 1) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = filterHz;
      f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gainV, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(f).connect(g).connect(out);
      src.start(now);
      src.stop(now + dur + 0.05);
    };
    const tone = (freq, dur, gainV, type = "sine", slide = 1) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(freq * slide, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gainV, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g).connect(out);
      o.start(now);
      o.stop(now + dur + 0.05);
    };
    switch (name) {
      case "door_open":
        burst(0.5, 1800, 0.25, 0.8);
        tone(220, 0.12, 0.06, "square", 1.3);
        break;
      case "door_close":
        burst(0.45, 1200, 0.2, 0.8);
        tone(160, 0.2, 0.08, "triangle", 0.7);
        break;
      case "blast_door":
        burst(1.6, 300, 0.5, 0.6);
        tone(60, 1.4, 0.2, "sawtooth", 0.8);
        break;
      case "lift_start":
        tone(440, 0.25, 0.08, "sine", 1.5);
        break;
      case "lift_move":
        burst(4.0, 180, 0.35, 0.5);
        tone(70, 4.0, 0.12, "triangle", 1.2);
        break;
      case "lift_arrive":
        tone(660, 0.18, 0.08, "sine", 1.0);
        tone(880, 0.3, 0.06, "sine", 1.0);
        break;
      case "tie_launch":
        tone(900, 1.4, 0.12, "sawtooth", 0.35);
        burst(1.2, 2400, 0.15, 2);
        break;
      case "tie_flyby":
        tone(700, 1.0, 0.08, "sawtooth", 0.5);
        break;
      case "unlock":
        tone(520, 0.1, 0.08, "square", 1.0);
        tone(780, 0.16, 0.08, "square", 1.0);
        break;
      case "denied":
        tone(180, 0.3, 0.1, "square", 0.9);
        break;
      case "board":
        burst(0.8, 600, 0.2, 0.7);
        break;
      case "beep":
        tone(opts.freq || 1200, 0.08, 0.05, "sine", 1.0);
        break;
      default:
        break;
    }
  }

  on(name, cb) {
    (this.listeners[name] = this.listeners[name] || []).push(cb);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
}
