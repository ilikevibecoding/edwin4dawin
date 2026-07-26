// Procedural WebAudio engine. Every sound is synthesized (100% original audio).
// Buses: master -> destination; effects/music/ui/ambience -> master.
// 3D-ish playback: distance gain + lowpass + stereo pan relative to listener.
import { settings } from './settings.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buses = {};
    this.noise = null;
    this.listener = { x: 0, y: 0, z: 0, fx: 0, fz: -1 }; // pos + forward
    this.musicHandle = null;
    this.ambienceHandles = new Map();
    this.started = false;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return false; }
    const mk = (dest) => { const g = this.ctx.createGain(); g.connect(dest); return g; };
    // soft limiter on the master bus so stacked gunfire can't clip
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 12;
    limiter.ratio.value = 14;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.18;
    limiter.connect(this.ctx.destination);
    this.buses.master = mk(limiter);
    this.buses.effects = mk(this.buses.master);
    this.buses.music = mk(this.buses.master);
    this.buses.ui = mk(this.buses.master);
    this.buses.ambience = mk(this.buses.master);
    this._applyVolumes();
    settings.onChange((k) => { if (k.startsWith('vol')) this._applyVolumes(); });
    // shared noise buffer (2s white)
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.started = true;
    return true;
  }

  _applyVolumes() {
    if (!this.ctx) return;
    this.buses.master.gain.value = settings.get('volMaster');
    this.buses.effects.gain.value = settings.get('volEffects');
    this.buses.music.gain.value = settings.get('volMusic');
    this.buses.ui.gain.value = settings.get('volUI');
    this.buses.ambience.gain.value = settings.get('volEffects') * 0.9;
  }

  setListener(x, y, z, fx, fz) { this.listener = { x, y, z, fx, fz }; }

  // Compute pan/gain/muffle for a world position.
  _spatial(pos) {
    if (!pos) return { gain: 1, pan: 0, lp: 20000 };
    const dx = pos.x - this.listener.x, dy = (pos.y || 0) - this.listener.y, dz = pos.z - this.listener.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const gain = 1 / (1 + dist * dist * 0.015);
    // pan: project onto listener right vector (fz, -fx)
    const rx = -this.listener.fz, rz = this.listener.fx;
    const len = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
    const pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / len * Math.min(1, dist / 2)));
    const lp = Math.max(500, 20000 / (1 + dist * 0.12));
    return { gain, pan, lp, dist };
  }

  _out(bus, pos, baseGain = 1) {
    const s = this._spatial(pos);
    const g = this.ctx.createGain();
    g.gain.value = baseGain * s.gain;
    let node = g;
    if (s.lp < 18000) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = s.lp;
      g.connect(f); node = f;
    }
    const p = this.ctx.createStereoPanner();
    p.pan.value = s.pan;
    node.connect(p);
    p.connect(this.buses[bus]);
    return g;
  }

  _noiseSrc(t0, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
    return src;
  }

  _env(g, t0, attack, peak, decay, sustainLevel = 0.0001) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), t0 + attack + decay);
  }

  // ---------------- Weapons ----------------
  // profile: { body:{f0,f1,gain,dur}, crack:{f,q,gain,dur}, tail:{gain,dur,f}, mech? }
  gunshot(profile, pos = null, volume = 1) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, volume);
    const P = profile || {};
    const body = P.body || { f0: 160, f1: 55, gain: 0.9, dur: 0.14 };
    const crack = P.crack || { f: 3200, q: 0.8, gain: 0.7, dur: 0.045 };
    const tail = P.tail || { gain: 0.35, dur: 0.7, f: 1200 };
    // body thump
    {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(body.f0, t0);
      o.frequency.exponentialRampToValueAtTime(body.f1, t0 + body.dur);
      const g = this.ctx.createGain();
      this._env(g, t0, 0.002, body.gain, body.dur);
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + body.dur + 0.05);
    }
    // crack (bandpassed noise burst)
    {
      const src = this._noiseSrc(t0, crack.dur);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = crack.f; f.Q.value = crack.q;
      const g = this.ctx.createGain();
      this._env(g, t0, 0.001, crack.gain, crack.dur);
      src.connect(f); f.connect(g); g.connect(out);
    }
    // indoor tail (filtered noise, exp decay)
    {
      const src = this._noiseSrc(t0, tail.dur);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(tail.f, t0);
      f.frequency.exponentialRampToValueAtTime(220, t0 + tail.dur);
      const g = this.ctx.createGain();
      this._env(g, t0, 0.012, tail.gain, tail.dur);
      src.connect(f); f.connect(g); g.connect(out);
    }
  }

  // Small mechanical sounds: clicks, slides, magazine handling.
  mech(kind, pos = null, volume = 1) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, volume * 0.8);
    const click = (t, f, dur, gain, type = 'square') => {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      const g = this.ctx.createGain();
      this._env(g, t, 0.001, gain, dur);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.03);
    };
    const scrape = (t, f, dur, gain) => {
      const src = this._noiseSrc(t, dur);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.2;
      const g = this.ctx.createGain();
      this._env(g, t, 0.004, gain, dur);
      src.connect(bp); bp.connect(g); g.connect(out);
    };
    switch (kind) {
      case 'dryfire': click(t0, 1900, 0.03, 0.5); break;
      case 'magout': scrape(t0, 900, 0.08, 0.5); click(t0 + 0.05, 700, 0.03, 0.4); break;
      case 'magin': scrape(t0, 1100, 0.06, 0.45); click(t0 + 0.05, 1500, 0.035, 0.7); break;
      case 'rack': scrape(t0, 1500, 0.07, 0.6); click(t0 + 0.07, 2100, 0.03, 0.8); break;
      case 'draw': scrape(t0, 700, 0.1, 0.4); click(t0 + 0.08, 1200, 0.02, 0.3); break;
      case 'holster': scrape(t0, 500, 0.1, 0.35); break;
      case 'pump': scrape(t0, 800, 0.09, 0.7); click(t0 + 0.09, 500, 0.04, 0.6); scrape(t0 + 0.13, 900, 0.07, 0.6); break;
      case 'bolt': scrape(t0, 1200, 0.1, 0.6); click(t0 + 0.12, 1700, 0.04, 0.7); break;
      case 'knife': scrape(t0, 2600, 0.08, 0.5); break;
      case 'pin': click(t0, 2400, 0.03, 0.5); click(t0 + 0.04, 1800, 0.02, 0.35); break;
      case 'casing': click(t0, 3400 + Math.random() * 800, 0.025, 0.16, 'triangle'); click(t0 + 0.05 + Math.random() * 0.04, 4200, 0.02, 0.1, 'triangle'); break;
      case 'pickup': click(t0, 900, 0.04, 0.4); click(t0 + 0.05, 1300, 0.05, 0.4); break;
    }
  }

  impact(surface, pos = null, volume = 1) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, volume * 0.85);
    const conf = {
      concrete: { f: 900, q: 0.6, dur: 0.09, gain: 0.6, thud: 140 },
      drywall: { f: 500, q: 0.5, dur: 0.11, gain: 0.55, thud: 110 },
      wood: { f: 700, q: 0.9, dur: 0.1, gain: 0.6, thud: 160 },
      metal: { f: 2300, q: 3.5, dur: 0.22, gain: 0.55, thud: 200 },
      glass: { f: 3400, q: 2.0, dur: 0.16, gain: 0.6, thud: 0 },
      carpet: { f: 350, q: 0.5, dur: 0.08, gain: 0.4, thud: 90 },
      tile: { f: 1600, q: 1.4, dur: 0.1, gain: 0.55, thud: 150 },
      snow: { f: 250, q: 0.4, dur: 0.09, gain: 0.35, thud: 70 },
      flesh: { f: 300, q: 0.6, dur: 0.09, gain: 0.6, thud: 90 },
    }[surface] || { f: 800, q: 0.7, dur: 0.1, gain: 0.5, thud: 120 };
    const src = this._noiseSrc(t0, conf.dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = conf.f; bp.Q.value = conf.q;
    const g = this.ctx.createGain();
    this._env(g, t0, 0.001, conf.gain, conf.dur);
    src.connect(bp); bp.connect(g); g.connect(out);
    if (conf.thud) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(conf.thud, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, conf.thud * 0.5), t0 + 0.07);
      const g2 = this.ctx.createGain();
      this._env(g2, t0, 0.001, conf.gain * 0.7, 0.07);
      o.connect(g2); g2.connect(out);
      o.start(t0); o.stop(t0 + 0.12);
    }
  }

  glassBreak(pos = null, volume = 1) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, volume);
    for (let i = 0; i < 7; i++) {
      const t = t0 + i * 0.02 + Math.random() * 0.05;
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 2400 + Math.random() * 3600;
      const g = this.ctx.createGain();
      this._env(g, t, 0.001, 0.24 * (1 - i * 0.1), 0.05 + Math.random() * 0.14);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.25);
    }
    const src = this._noiseSrc(t0, 0.25);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2600;
    const g = this.ctx.createGain();
    this._env(g, t0, 0.002, 0.5, 0.22);
    src.connect(hp); hp.connect(g); g.connect(out);
  }

  footstep(surface, pos = null, crouched = false, volume = 1) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, volume * (crouched ? 0.35 : 0.75));
    const conf = {
      carpet: { f: 260, dur: 0.07, gain: 0.3 },
      tile: { f: 1000, dur: 0.06, gain: 0.42 },
      concrete: { f: 640, dur: 0.065, gain: 0.42 },
      wood: { f: 480, dur: 0.07, gain: 0.4 },
      metal: { f: 1300, dur: 0.08, gain: 0.45 },
      snow: { f: 190, dur: 0.1, gain: 0.4 },
    }[surface] || { f: 500, dur: 0.07, gain: 0.35 };
    const src = this._noiseSrc(t0, conf.dur);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = conf.f * (0.9 + Math.random() * 0.25);
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    this._env(g, t0, 0.004, conf.gain, conf.dur);
    src.connect(bp); bp.connect(g); g.connect(out);
  }

  door(kind, pos = null) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, 0.8);
    const creak = (t, f0, f1, dur, gain) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f1, t + dur);
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.value = 800;
      const g = this.ctx.createGain();
      this._env(g, t, 0.02, gain, dur);
      o.connect(flt); flt.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    };
    const clack = (t, f, gain) => {
      const o = this.ctx.createOscillator();
      o.type = 'square'; o.frequency.value = f;
      const g = this.ctx.createGain();
      this._env(g, t, 0.001, gain, 0.05);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.09);
    };
    if (kind === 'open') { clack(t0, 900, 0.35); creak(t0 + 0.03, 90, 130, 0.4, 0.12); }
    else if (kind === 'close') { creak(t0, 120, 85, 0.3, 0.1); clack(t0 + 0.3, 600, 0.45); }
    else if (kind === 'locked') { clack(t0, 1300, 0.4); clack(t0 + 0.09, 1250, 0.3); }
    else if (kind === 'shutter') {
      const src = this._noiseSrc(t0, 1.6);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.7;
      const g = this.ctx.createGain();
      this._env(g, t0, 0.15, 0.5, 1.4, 0.001);
      src.connect(bp); bp.connect(g); g.connect(out);
      clack(t0 + 1.5, 250, 0.6);
    }
  }

  ui(kind) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const g0 = this.ctx.createGain();
    g0.connect(this.buses.ui);
    const tone = (t, f, dur, gain, type = 'sine') => {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = f;
      const g = this.ctx.createGain();
      this._env(g, t, 0.004, gain, dur);
      o.connect(g); g.connect(g0);
      o.start(t); o.stop(t + dur + 0.05);
    };
    switch (kind) {
      case 'hover': tone(t0, 1400, 0.03, 0.08); break;
      case 'click': tone(t0, 900, 0.04, 0.2); tone(t0 + 0.03, 1350, 0.05, 0.15); break;
      case 'back': tone(t0, 700, 0.05, 0.18); break;
      case 'confirm': tone(t0, 880, 0.06, 0.2); tone(t0 + 0.07, 1320, 0.09, 0.2); break;
      case 'alert': tone(t0, 620, 0.09, 0.25, 'triangle'); tone(t0 + 0.1, 520, 0.12, 0.22, 'triangle'); break;
      case 'objective': tone(t0, 1050, 0.07, 0.2); tone(t0 + 0.09, 1560, 0.12, 0.18); break;
      case 'radio': {
        // short radio chirp + garble for voice-equivalent feedback
        tone(t0, 1800, 0.03, 0.15, 'square');
        const src = this._noiseSrc(t0 + 0.04, 0.22);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2.5;
        const g = this.ctx.createGain();
        this._env(g, t0 + 0.04, 0.02, 0.1, 0.2);
        src.connect(bp); bp.connect(g); g.connect(g0);
        tone(t0 + 0.3, 1800, 0.025, 0.12, 'square');
        break;
      }
      case 'hit': tone(t0, 2000, 0.025, 0.14, 'triangle'); break;
      case 'kill': tone(t0, 1500, 0.04, 0.2, 'triangle'); tone(t0 + 0.04, 1000, 0.06, 0.16, 'triangle'); break;
      case 'damage': tone(t0, 180, 0.12, 0.3, 'sawtooth'); break;
      case 'victory': [523, 659, 784, 1046].forEach((f, i) => tone(t0 + i * 0.13, f, 0.25, 0.18)); break;
      case 'defeat': [392, 330, 262, 196].forEach((f, i) => tone(t0 + i * 0.16, f, 0.3, 0.18, 'triangle')); break;
    }
  }

  voice(kind, pos = null) {
    // Voice-equivalent: characteristic radio/vocal chirps; paired with subtitles by UI.
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, 0.7);
    const syll = (t, f, dur) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass'; flt.frequency.value = f * 2.4; flt.Q.value = 2;
      const g = this.ctx.createGain();
      this._env(g, t, 0.02, 0.12, dur);
      o.connect(flt); flt.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    };
    if (kind === 'hostileAlert') { syll(t0, 130, 0.12); syll(t0 + 0.14, 110, 0.16); }
    else if (kind === 'hostileCombat') { syll(t0, 140, 0.09); syll(t0 + 0.1, 150, 0.09); syll(t0 + 0.22, 120, 0.14); }
    else if (kind === 'hostageFear') { syll(t0, 260, 0.14); syll(t0 + 0.18, 300, 0.1); }
    else if (kind === 'hostageRelief') { syll(t0, 280, 0.12); syll(t0 + 0.16, 240, 0.16); }
  }

  // ---------------- Ambience ----------------
  startAmbience(name) {
    if (!this.ensure() || this.ambienceHandles.has(name)) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(this.buses.ambience);
    const nodes = [g];
    const t0 = this.ctx.currentTime;
    const noiseLayer = (freq, q, gain, type = 'bandpass') => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise; src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const lg = this.ctx.createGain(); lg.gain.value = gain;
      src.connect(f); f.connect(lg); lg.connect(g);
      src.start(t0 + Math.random() * 0.5);
      nodes.push(src);
      return { f, lg };
    };
    const toneLayer = (freq, gain, type = 'sine') => {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.value = freq;
      const lg = this.ctx.createGain(); lg.gain.value = gain;
      o.connect(lg); lg.connect(g);
      o.start(t0);
      nodes.push(o);
      return { o, lg };
    };
    let target = 0.5;
    switch (name) {
      case 'hvac': noiseLayer(160, 0.4, 0.5, 'lowpass'); noiseLayer(420, 1.2, 0.06); target = 0.32; break;
      case 'fluorescent': toneLayer(120, 0.05, 'sine'); toneLayer(240, 0.018, 'sine'); target = 0.4; break;
      case 'wind': {
        const l = noiseLayer(600, 0.8, 0.4);
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.13;
        const lfoG = this.ctx.createGain(); lfoG.gain.value = 260;
        lfo.connect(lfoG); lfoG.connect(l.f.frequency);
        lfo.start(t0);
        nodes.push(lfo);
        target = 0.4;
        break;
      }
      case 'server': toneLayer(180, 0.06, 'sawtooth'); noiseLayer(1600, 0.7, 0.1); noiseLayer(300, 0.6, 0.25, 'lowpass'); target = 0.4; break;
      case 'storm': noiseLayer(90, 0.4, 0.6, 'lowpass'); target = 0.28; break;
    }
    g.gain.linearRampToValueAtTime(target, t0 + 1.2);
    this.ambienceHandles.set(name, { g, nodes });
  }

  stopAmbience(name) {
    const h = this.ambienceHandles.get(name);
    if (!h || !this.ctx) return;
    const t = this.ctx.currentTime;
    h.g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => { for (const n of h.nodes) { try { n.stop?.(); n.disconnect?.(); } catch { /* closed */ } } }, 1000);
    this.ambienceHandles.delete(name);
  }
  stopAllAmbience() { for (const k of [...this.ambienceHandles.keys()]) this.stopAmbience(k); }

  // ---------------- Music (procedural, original) ----------------
  startMusic(kind = 'title') {
    if (!this.ensure() || this.musicHandle) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(this.buses.music);
    const handle = { g, stopped: false, timer: null, nodes: [] };
    this.musicHandle = handle;
    const chords = kind === 'title'
      ? [[110, 130.8, 164.8], [98, 123.5, 146.8], [87.3, 110, 130.8], [103.8, 130.8, 155.6]]
      : [[110, 138.6, 164.8], [98, 116.5, 146.8]];
    let ci = 0;
    const playChord = () => {
      if (handle.stopped) return;
      const t = this.ctx.currentTime;
      const chord = chords[ci % chords.length];
      ci++;
      for (const f of chord) {
        for (const det of [-2.5, 2.5]) {
          const o = this.ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = det;
          const flt = this.ctx.createBiquadFilter();
          flt.type = 'lowpass';
          flt.frequency.setValueAtTime(300, t);
          flt.frequency.linearRampToValueAtTime(650, t + 3);
          flt.frequency.linearRampToValueAtTime(280, t + 7.5);
          const og = this.ctx.createGain();
          og.gain.setValueAtTime(0.0001, t);
          og.gain.linearRampToValueAtTime(0.05, t + 2.6);
          og.gain.linearRampToValueAtTime(0.0001, t + 8);
          o.connect(flt); flt.connect(og); og.connect(g);
          o.start(t); o.stop(t + 8.2);
        }
      }
      // sparse high bell note
      if (Math.random() < 0.6) {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = chord[Math.floor(Math.random() * chord.length)] * 4;
        const og = this.ctx.createGain();
        const tt = t + 1 + Math.random() * 4;
        og.gain.setValueAtTime(0.0001, tt);
        og.gain.linearRampToValueAtTime(0.035, tt + 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, tt + 2.5);
        o.connect(og); og.connect(g);
        o.start(tt); o.stop(tt + 2.6);
      }
      handle.timer = setTimeout(playChord, 7600);
    };
    g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 2);
    playChord();
  }

  stopMusic() {
    const h = this.musicHandle;
    if (!h || !this.ctx) return;
    h.stopped = true;
    if (h.timer) clearTimeout(h.timer);
    h.g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
    setTimeout(() => { try { h.g.disconnect(); } catch { /* ok */ } }, 1500);
    this.musicHandle = null;
  }

  explosionish(kind, pos = null) {
    // flash device pop / smoke hiss
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime;
    const out = this._out('effects', pos, 1);
    if (kind === 'flash') {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(900, t0);
      o.frequency.exponentialRampToValueAtTime(120, t0 + 0.25);
      const g = this.ctx.createGain();
      this._env(g, t0, 0.001, 1.0, 0.25);
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + 0.3);
      const src = this._noiseSrc(t0, 0.5);
      const g2 = this.ctx.createGain();
      this._env(g2, t0, 0.001, 0.8, 0.4);
      src.connect(g2); g2.connect(out);
      // ringing
      const ring = this.ctx.createOscillator();
      ring.type = 'sine'; ring.frequency.value = 3800;
      const rg = this.ctx.createGain();
      this._env(rg, t0 + 0.1, 0.05, 0.06, 2.2);
      ring.connect(rg); rg.connect(this.buses.effects);
      ring.start(t0 + 0.1); ring.stop(t0 + 2.6);
    } else if (kind === 'smoke') {
      const src = this._noiseSrc(t0, 1.6);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t0);
      lp.frequency.exponentialRampToValueAtTime(500, t0 + 1.4);
      const g = this.ctx.createGain();
      this._env(g, t0, 0.02, 0.5, 1.3);
      src.connect(lp); lp.connect(g); g.connect(out);
      this.mech('pin', pos);
    } else if (kind === 'bounce') {
      this.mech('casing', pos, 2.2);
    }
  }
}

export const audio = new AudioEngine();
