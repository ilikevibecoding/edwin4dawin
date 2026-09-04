// Audio placeholders: a small procedural WebAudio layer (no audio files). Room ambience (hum + filtered air),
// door / lift / fighter events synthesised on the fly, positional gain by distance. Everything routes through
// `event(name, data)` so a future sound pass can swap in real assets without touching the callers.
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.listener = null; // Vector3 to measure distance from
    this.ambience = null;
    this.room = null;
    this.handlers = new Map();
    this.log = [];
  }

  /** Must be called from a user gesture (pointer lock click). */
  start() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
    this.buildAmbience();
  }

  buildAmbience() {
    const c = this.ctx;
    // low reactor hum (two detuned oscillators) + filtered noise for air handling
    const hum = c.createGain();
    hum.gain.value = 0.0;
    for (const f of [48, 96.5]) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(hum);
      o.start();
    }
    const noise = c.createBufferSource();
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 400;
    const air = c.createGain();
    air.gain.value = 0.0;
    noise.connect(lp).connect(air);
    noise.start();
    hum.connect(this.master);
    air.connect(this.master);
    this.ambience = { hum, air, lp };
  }

  /** Per-room ambience profile: { hum: 0..1, air: 0..1, cutoff: Hz } */
  setRoom(profile) {
    this.room = profile;
    if (!this.ambience) return;
    const t = this.ctx.currentTime;
    this.ambience.hum.gain.setTargetAtTime(0.08 * (profile.hum ?? 0.5), t, 0.8);
    this.ambience.air.gain.setTargetAtTime(0.05 * (profile.air ?? 0.5), t, 0.8);
    this.ambience.lp.frequency.setTargetAtTime(profile.cutoff ?? 400, t, 0.8);
  }

  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
  }

  /** Fire an audio event. data: { position?: Vector3, ... } */
  event(name, data = {}) {
    this.log.push({ name, t: performance.now() });
    if (this.log.length > 200) this.log.shift();
    for (const fn of this.handlers.get(name) || []) fn(data);
    if (!this.enabled) return;
    const gain = this.distanceGain(data.position);
    if (gain <= 0.001) return;
    switch (name) {
      case "door_open":
      case "door_close":
        this.swoosh(gain * (data.kind === "blast" ? 0.9 : 0.5), data.kind === "blast" ? 0.9 : 0.45, name === "door_open" ? 1 : -1);
        break;
      case "lift_start":
        this.tone(110, 0.6, gain * 0.4);
        break;
      case "lift_arrive":
        this.tone(660, 0.25, gain * 0.35);
        setTimeout(() => this.tone(880, 0.3, gain * 0.3), 180);
        break;
      case "fighter_launch":
        this.scream(gain * 0.5);
        break;
      case "alert":
        this.tone(440, 0.5, 0.3);
        setTimeout(() => this.tone(330, 0.5, 0.3), 500);
        break;
      default:
        break;
    }
  }

  distanceGain(pos) {
    if (!pos || !this.listener) return 1;
    const d = pos.distanceTo(this.listener);
    return Math.max(0, 1 - d / 40);
  }

  swoosh(vol, dur, dir) {
    const c = this.ctx;
    const src = c.createBufferSource();
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    const t = c.currentTime;
    f.frequency.setValueAtTime(dir > 0 ? 300 : 1400, t);
    f.frequency.exponentialRampToValueAtTime(dir > 0 ? 1400 : 300, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  tone(freq, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  scream(vol) {
    // twin-ion-engine placeholder: descending noisy sweep
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = "sawtooth";
    const t = c.currentTime;
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 1.4);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.4);
  }
}
