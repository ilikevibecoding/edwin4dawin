// Procedurally synthesised sound effects & ambience (Web Audio, no external assets).
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.noiseBuffer = null;
    this.ambience = null;
    this.lastBird = 0;
    this.lastCricket = 0;
    this.piano = { next: 0, step: 0, gain: null };
    this.trainGain = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(this.ctx.destination);
    // white noise buffer (2s)
    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbience();
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.5 : 0;
  }

  setListener(x, y, z, yaw) { this.listener.x = x; this.listener.y = y; this.listener.z = z; this.listener.yaw = yaw; }

  // Returns [gain, pan] for a world position (or [1,0] for non-positional)
  spatial(pos, maxDist = 24) {
    if (!pos) return [1, 0];
    const dx = pos.x - this.listener.x, dy = pos.y - this.listener.y, dz = pos.z - this.listener.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDist) return [0, 0];
    const g = Math.pow(1 - d / maxDist, 1.5);
    // right vector of listener: yaw 0 looks -z; right = (cos yaw, 0, -sin yaw)
    const rx = Math.cos(this.listener.yaw), rz = -Math.sin(this.listener.yaw);
    const pan = d > 0.01 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.7 : 0;
    return [g, pan];
  }

  out(gainValue, pan, t0) {
    const g = this.ctx.createGain();
    g.gain.value = gainValue;
    let node = g;
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(this.master);
    return g;
  }

  noise(duration, filterType, freq, q, gain, pos, maxDist = 24, attack = 0.002, pitchEnv = null) {
    if (!this.ctx || !this.enabled) return;
    const [sg, pan] = this.spatial(pos, maxDist);
    if (sg <= 0) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    if (pitchEnv) f.frequency.exponentialRampToValueAtTime(pitchEnv, t + duration);
    const env = this.out(0, pan, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * sg, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f); f.connect(env);
    src.start(t, Math.random() * 1.5);
    src.stop(t + duration + 0.05);
  }

  tone(type, f0, f1, duration, gain, pos, maxDist = 24, attack = 0.005, lp = 0) {
    if (!this.ctx || !this.enabled) return null;
    const [sg, pan] = this.spatial(pos, maxDist);
    if (sg <= 0) return null;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duration);
    const env = this.out(0, pan, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * sg, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    if (lp) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(env); }
    else o.connect(env);
    o.start(t); o.stop(t + duration + 0.05);
    return o;
  }

  // --- block sounds ---------------------------------------------------------
  step(material, pos = null, quiet = 1) {
    switch (material) {
      case 'grass': this.noise(0.09, 'lowpass', 900, 0.8, 0.35 * quiet, pos); break;
      case 'gravel': case 'sand': this.noise(0.11, 'lowpass', 1400, 0.6, 0.33 * quiet, pos); this.noise(0.05, 'highpass', 2500, 0.5, 0.08 * quiet, pos); break;
      case 'wood': this.noise(0.07, 'bandpass', 500, 1.5, 0.45 * quiet, pos); this.tone('sine', 180, 120, 0.06, 0.15 * quiet, pos); break;
      case 'stone': this.noise(0.06, 'bandpass', 2200, 1.2, 0.3 * quiet, pos); break;
      case 'metal': this.noise(0.06, 'bandpass', 3200, 3, 0.25 * quiet, pos); this.tone('sine', 900, 700, 0.08, 0.05 * quiet, pos); break;
      case 'glass': this.noise(0.05, 'highpass', 3000, 1, 0.2 * quiet, pos); break;
      case 'cloth': case 'snow': this.noise(0.09, 'lowpass', 600, 0.7, 0.2 * quiet, pos); break;
      default: this.noise(0.08, 'lowpass', 1200, 0.8, 0.3 * quiet, pos);
    }
  }
  swim(pos = null) { this.noise(0.25, 'lowpass', 700, 0.5, 0.25, pos); }

  hit(material, pos = null) { this.step(material, pos, 0.6); }

  breakBlock(material, pos = null) {
    switch (material) {
      case 'grass': this.noise(0.2, 'lowpass', 1100, 0.7, 0.7, pos); break;
      case 'gravel': case 'sand': this.noise(0.22, 'lowpass', 1500, 0.6, 0.7, pos); break;
      case 'wood': this.noise(0.18, 'bandpass', 600, 1.2, 0.8, pos); this.tone('triangle', 220, 90, 0.15, 0.3, pos); break;
      case 'stone': this.noise(0.2, 'bandpass', 1800, 0.9, 0.7, pos); this.tone('sine', 300, 120, 0.12, 0.2, pos); break;
      case 'glass': this.noise(0.25, 'highpass', 2600, 1, 0.7, pos); this.tone('sine', 3000, 1800, 0.15, 0.1, pos); break;
      case 'metal': this.noise(0.18, 'bandpass', 3000, 3, 0.5, pos); this.tone('sine', 1200, 600, 0.2, 0.15, pos); break;
      default: this.noise(0.2, 'lowpass', 1000, 0.8, 0.6, pos);
    }
  }

  placeBlock(material, pos = null) {
    this.noise(0.09, 'lowpass', material === 'stone' ? 1800 : 900, 0.8, 0.5, pos);
    this.tone('sine', material === 'wood' ? 200 : 160, 90, 0.09, 0.3, pos);
  }

  pop(pos = null) { this.tone('sine', 500, 1100, 0.09, 0.3, pos, 24, 0.003); }
  hurt() { this.tone('sawtooth', 220, 110, 0.22, 0.35, null, 24, 0.005, 900); this.noise(0.15, 'lowpass', 500, 0.5, 0.3, null); }
  click() { this.tone('square', 1000, 900, 0.03, 0.08, null); }
  splash(pos = null) { this.noise(0.35, 'lowpass', 1200, 0.5, 0.6, pos, 24, 0.01, 300); }

  // --- creatures --------------------------------------------------------------
  npcGrunt(pos, pitch = 1) {
    this.tone('sine', 190 * pitch, 130 * pitch, 0.25, 0.35, pos, 12, 0.02, 700);
    this.tone('sawtooth', 190 * pitch, 130 * pitch, 0.25, 0.06, pos, 12, 0.02, 600);
  }
  horseNeigh(pos) {
    if (!this.ctx || !this.enabled) return;
    const [sg, pan] = this.spatial(pos, 30);
    if (sg <= 0) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, t); o.frequency.linearRampToValueAtTime(1100, t + 0.15); o.frequency.exponentialRampToValueAtTime(380, t + 0.9);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 22; const lg = this.ctx.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const env = this.out(0, pan, t); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.25 * sg, t + 0.05); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    o.connect(f); f.connect(env); o.start(t); lfo.start(t); o.stop(t + 1); lfo.stop(t + 1);
  }
  cowMoo(pos) {
    this.tone('sawtooth', 150, 95, 0.9, 0.25, pos, 30, 0.08, 500);
    this.tone('sine', 150, 95, 0.9, 0.2, pos, 30, 0.08);
  }
  pigOink(pos) { this.tone('sawtooth', 260, 170, 0.18, 0.2, pos, 20, 0.01, 900); }
  chickenCluck(pos) { this.tone('square', 900, 700, 0.06, 0.08, pos, 16, 0.003, 2500); setTimeout(() => this.tone('square', 850, 650, 0.05, 0.06, pos, 16, 0.003, 2500), 90); }

  // --- train ------------------------------------------------------------------
  trainWhistle(pos) {
    if (!this.ctx || !this.enabled) return;
    const [sg, pan] = this.spatial(pos, 220);
    if (sg <= 0) return;
    const t = this.ctx.currentTime;
    for (const f0 of [311, 370, 466]) {
      const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f0;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = this.ctx.createGain(); lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
      const env = this.out(0, pan, t);
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.14 * sg, t + 0.25); env.gain.setValueAtTime(0.14 * sg, t + 1.3); env.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      o.connect(env); o.start(t); lfo.start(t); o.stop(t + 2); lfo.stop(t + 2);
    }
    this.noise(1.8, 'bandpass', 1600, 1.5, 0.05 * sg, null, 1, 0.3);
  }
  trainChuff(pos, speed) { this.noise(0.12, 'lowpass', 500 + speed * 40, 0.6, 0.35, pos, 120, 0.005); }

  // --- ambience ---------------------------------------------------------------
  startAmbience() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 0.4;
    const g = this.ctx.createGain(); g.gain.value = 0.06;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = this.ctx.createGain(); lg.gain.value = 0.035; lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
    this.ambience = { gain: g };
    this.pianoGain = this.ctx.createGain(); this.pianoGain.gain.value = 0; this.pianoGain.connect(this.master);
  }

  // Called every frame with day factor (0 night..1 day) and distance to the saloon
  update(dt, dayFactor, saloonDist, indoors) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    if (dayFactor > 0.6 && now - this.lastBird > 4 + Math.random() * 9) {
      this.lastBird = now;
      const n = 2 + Math.floor(Math.random() * 4), base = 2200 + Math.random() * 1500;
      for (let i = 0; i < n; i++) setTimeout(() => this.tone('sine', base * (1 + Math.random() * 0.2), base * (0.8 + Math.random() * 0.4), 0.09, 0.05, null, 1, 0.01), i * 140);
    }
    if (dayFactor < 0.3 && now - this.lastCricket > 1.5 + Math.random() * 2.5) {
      this.lastCricket = now;
      for (let i = 0; i < 6; i++) setTimeout(() => this.tone('sine', 4300, 4300, 0.03, 0.03, null, 1, 0.003), i * 95);
    }
    // honky-tonk piano near the saloon
    const target = saloonDist < 30 ? Math.pow(1 - saloonDist / 30, 1.3) * 0.5 : 0;
    this.pianoGain.gain.setTargetAtTime(target, now, 0.3);
    if (target > 0.01 && now >= this.piano.next) this.playPianoStep(now);
  }

  playPianoStep(now) {
    const bpm = 168, beat = 60 / bpm, stepDur = beat / 2; // eighth notes
    const st = this.piano.step;
    const bass = [36, 43, 41, 43, 36, 43, 41, 43, 38, 45, 43, 45, 38, 45, 43, 45]; // MIDI
    const chords = [[48, 52, 55], [50, 53, 57], [53, 57, 60], [55, 59, 62]];
    const melody = [67, 69, 70, 72, 74, 72, 70, 69, 67, 64, 62, 60, 62, 64, 67, 69, 72, 74, 76, 74, 72, 70, 69, 67, 69, 70, 72, 74, 72, 69, 67, 64];
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const pluck = (midi, gain, dur) => {
      for (const det of [-0.4, 0.4]) {
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(midi + det / 12);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g); g.connect(this.pianoGain); o.start(now); o.stop(now + dur + 0.02);
      }
    };
    if (st % 2 === 0) pluck(bass[(st / 2) % bass.length], 0.35, 0.35);
    else { const c = chords[Math.floor(st / 8) % chords.length]; for (const n of c) pluck(n, 0.12, 0.2); }
    if (Math.random() < 0.85) pluck(melody[st % melody.length], 0.28, 0.3);
    this.piano.step = (st + 1) % 64;
    this.piano.next = now + stepDur;
  }
}
