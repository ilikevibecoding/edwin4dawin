// Synthesized audio: every sound is generated at runtime (original, no
// samples). Weapon shots, surface footsteps, doors, glass, UI, ambience beds
// and a synth menu theme. Distance attenuation + stereo pan from the camera.
import { bus } from '../core/events.js';
import { settings } from '../core/settings.js';

export class AudioSys {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.buffers = new Map();
    this.ambient = {};
    this.musicNodes = null;
    this._pendingResume = false;
    this._wire();
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return false; }
    const c = this.ctx;
    this.master = c.createGain();
    this.sfx = c.createGain();
    this.musicBus = c.createGain();
    this.ambBus = c.createGain();
    this.sfx.connect(this.master);
    this.musicBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.master.connect(c.destination);
    // gentle master compressor to avoid clipping with many shots
    this.comp = c.createDynamicsCompressor();
    this.master.disconnect();
    this.master.connect(this.comp);
    this.comp.connect(c.destination);
    this.applyVolumes();
    this._startAmbience();
    return true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.get('masterVolume');
    this.sfx.gain.value = settings.get('sfxVolume');
    this.musicBus.gain.value = settings.get('musicVolume');
    this.ambBus.gain.value = settings.get('sfxVolume') * 0.8;
  }

  // ---------------------------------------------------------------- buffers
  _buf(name) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    const b = this._generate(name);
    this.buffers.set(name, b);
    return b;
  }

  _make(dur, fn) {
    const sr = this.ctx.sampleRate;
    const n = Math.max(8, Math.floor(dur * sr));
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    fn(d, sr, n);
    return buf;
  }

  _generate(name) {
    const rnd = () => Math.random() * 2 - 1;
    const env = (i, n, a, p) => {
      const t = i / n;
      return t < a ? t / a : Math.pow(1 - (t - a) / (1 - a), p);
    };
    switch (true) {
      case name.startsWith('shot_'): {
        const kind = name.slice(5);
        const P = {
          pistol: { dur: 0.28, body: 150, noise: 1.0, lp: 3400, boom: 0.25 },
          smg: { dur: 0.22, body: 170, noise: 0.9, lp: 3800, boom: 0.2 },
          rifle: { dur: 0.34, body: 120, noise: 1.1, lp: 3000, boom: 0.45 },
          shotgun: { dur: 0.45, body: 95, noise: 1.3, lp: 2200, boom: 0.75 },
          sniper: { dur: 0.6, body: 80, noise: 1.2, lp: 2600, boom: 0.95 },
          enemy: { dur: 0.3, body: 130, noise: 0.9, lp: 2400, boom: 0.4 },
        }[kind] || { dur: 0.3, body: 140, noise: 1, lp: 3200, boom: 0.3 };
        return this._make(P.dur, (d, sr, n) => {
          let lp = 0;
          const alpha = Math.min(1, (P.lp * 2 * Math.PI) / sr);
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const e = env(i, n, 0.004, 3.2);
            const crack = i < sr * 0.012 ? rnd() * 1.4 : 0;
            const body = Math.sin(2 * Math.PI * P.body * t * (1 - t * 0.7)) * P.boom * Math.pow(1 - i / n, 1.6);
            const noise = rnd() * P.noise * e;
            lp += alpha * (noise - lp);
            d[i] = (crack + lp * 1.3 + body) * 0.75;
          }
        });
      }
      case name === 'dryfire':
        return this._make(0.07, (d, sr, n) => {
          for (let i = 0; i < n; i++) d[i] = (i < n * 0.3 ? rnd() : rnd() * 0.2) * env(i, n, 0.02, 4) * 0.35;
        });
      case name === 'reload_out':
      case name === 'reload_in':
      case name === 'bolt':
      case name === 'pump':
        return this._make(0.12, (d, sr, n) => {
          const f = name === 'reload_out' ? 900 : name === 'reload_in' ? 700 : 500;
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            d[i] = (Math.sin(2 * Math.PI * f * t) * 0.4 + rnd() * 0.5) * env(i, n, 0.01, 6) * 0.4;
          }
        });
      case name.startsWith('foot_'): {
        const kind = name.slice(5);
        const P = {
          carpet: { f: 220, noise: 0.9, dur: 0.09, tone: 0.06 },
          tile: { f: 900, noise: 0.7, dur: 0.08, tone: 0.28 },
          concrete: { f: 500, noise: 0.9, dur: 0.09, tone: 0.16 },
          wood: { f: 240, noise: 0.6, dur: 0.1, tone: 0.5 },
          snow: { f: 320, noise: 1.2, dur: 0.14, tone: 0.02 },
          metal: { f: 700, noise: 0.6, dur: 0.1, tone: 0.5 },
        }[kind] || { f: 400, noise: 0.8, dur: 0.09, tone: 0.1 };
        return this._make(P.dur, (d, sr, n) => {
          let lp = 0;
          const alpha = Math.min(1, (P.f * 2 * Math.PI) / sr);
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            lp += alpha * (rnd() * P.noise - lp);
            const crunch = kind === 'snow' && Math.random() < 0.1 ? rnd() * 0.7 : 0;
            d[i] = (lp + Math.sin(2 * Math.PI * P.f * 0.6 * t) * P.tone + crunch) * env(i, n, 0.06, 3) * 0.5;
          }
        });
      }
      case name === 'land':
        return this._make(0.16, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            lp += 0.08 * (rnd() - lp);
            d[i] = lp * env(i, n, 0.01, 3) * 1.6;
          }
        });
      case name === 'door_open':
      case name === 'door_close':
        return this._make(0.3, (d, sr, n) => {
          const open = name === 'door_open';
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const sq = Math.sin(2 * Math.PI * (open ? 280 + t * 160 : 380 - t * 200) * t) * 0.12;
            const th = i > n * 0.7 ? rnd() * env(i - n * 0.7, n * 0.3, 0.05, 4) * 0.5 : 0;
            d[i] = (sq * env(i, n, 0.1, 2) + th) * 0.5;
          }
        });
      case name === 'door_locked':
        return this._make(0.16, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            d[i] = (Math.sin(2 * Math.PI * 480 * t) * 0.5 + rnd() * 0.2) * env(i, n, 0.01, 8) * (i % 3000 < 1500 ? 0.5 : 0.2);
          }
        });
      case name === 'shutter':
        return this._make(1.6, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            lp += 0.05 * (rnd() - lp);
            const rattle = Math.sin(2 * Math.PI * 13 * t) > 0.7 ? rnd() * 0.4 : 0;
            d[i] = (lp * 1.4 + rattle) * env(i, n, 0.08, 1.4) * 0.5;
          }
        });
      case name === 'glass_break':
        return this._make(0.7, (d, sr, n) => {
          const freqs = [2400, 3200, 4100, 5300, 1800];
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            let v = rnd() * env(i, n, 0.003, 5) * 0.8;
            for (const f of freqs) v += Math.sin(2 * Math.PI * f * t + Math.sin(t * 40) * 3) * env(i, n, 0.004, 7) * 0.1;
            if (Math.random() < 0.02) v += rnd() * env(i, n, 0.01, 3) * 0.6;
            d[i] = v * 0.55;
          }
        });
      case name === 'glass_hit':
        return this._make(0.12, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            d[i] = (Math.sin(2 * Math.PI * 3400 * t) * 0.3 + rnd() * 0.5) * env(i, n, 0.003, 7) * 0.45;
          }
        });
      case name.startsWith('impact_'): {
        const kind = name.slice(7);
        const P = { concrete: 1600, drywall: 900, wood: 500, metal: 2600, carpet: 500, tile: 1800, snow: 400, flesh: 300 }[kind] || 1200;
        return this._make(0.09, (d, sr, n) => {
          let lp = 0;
          const alpha = Math.min(1, (P * 2 * Math.PI) / sr);
          for (let i = 0; i < n; i++) {
            lp += alpha * (rnd() - lp);
            const ring = kind === 'metal' ? Math.sin(2 * Math.PI * 2100 * (i / sr)) * 0.35 : 0;
            d[i] = (lp * 1.2 + ring) * env(i, n, 0.004, 5) * 0.5;
          }
        });
      }
      case name === 'shell':
        return this._make(0.09, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            d[i] = (Math.sin(2 * Math.PI * 4200 * t) * 0.4 + Math.sin(2 * Math.PI * 6300 * t) * 0.25) * env(i, n, 0.002, 8) * 0.22;
          }
        });
      case name === 'throw':
        return this._make(0.12, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) { lp += 0.3 * (rnd() - lp); d[i] = lp * env(i, n, 0.3, 2) * 0.25; }
        });
      case name === 'bounce':
        return this._make(0.08, (d, sr, n) => {
          for (let i = 0; i < n; i++) d[i] = (Math.sin(2 * Math.PI * 800 * (i / sr)) * 0.4 + rnd() * 0.3) * env(i, n, 0.004, 6) * 0.4;
        });
      case name === 'flashbang':
        return this._make(1.6, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const bang = i < sr * 0.05 ? rnd() * 1.6 : 0;
            const ring = Math.sin(2 * Math.PI * 3800 * t) * Math.pow(1 - i / n, 2.5) * 0.4;
            d[i] = (bang + ring) * 0.8;
          }
        });
      case name === 'smoke_pop':
        return this._make(0.5, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            lp += 0.1 * (rnd() - lp);
            const pop = i < sr * 0.02 ? rnd() : 0;
            d[i] = (pop * 0.8 + lp * env(i, n, 0.1, 1.2)) * 0.5;
          }
        });
      case name === 'ui_move':
        return this._make(0.05, (d, sr, n) => {
          for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * 660 * (i / sr)) * env(i, n, 0.1, 3) * 0.22;
        });
      case name === 'ui_select':
        return this._make(0.12, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            d[i] = (Math.sin(2 * Math.PI * 520 * t) + Math.sin(2 * Math.PI * 780 * t) * 0.6) * env(i, n, 0.02, 3) * 0.2;
          }
        });
      case name === 'ui_back':
        return this._make(0.1, (d, sr, n) => {
          for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * (430 - 160 * (i / n)) * (i / sr)) * env(i, n, 0.02, 3) * 0.2;
        });
      case name === 'objective':
        return this._make(0.5, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const f = t < 0.16 ? 620 : t < 0.32 ? 830 : 990;
            d[i] = Math.sin(2 * Math.PI * f * t) * env(i % (sr * 0.16), sr * 0.16, 0.1, 2) * 0.25;
          }
        });
      case name === 'hurt':
        return this._make(0.2, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            lp += 0.12 * (rnd() - lp);
            d[i] = (lp + Math.sin(2 * Math.PI * 140 * (i / sr)) * 0.5) * env(i, n, 0.01, 3) * 0.7;
          }
        });
      case name === 'hit_confirm':
        return this._make(0.06, (d, sr, n) => {
          for (let i = 0; i < n; i++) d[i] = (Math.sin(2 * Math.PI * 1200 * (i / sr)) * 0.7 + rnd() * 0.2) * env(i, n, 0.02, 5) * 0.28;
        });
      case name === 'alert':
        return this._make(0.35, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const f = 900 + Math.sin(t * 60) * 120;
            d[i] = Math.sin(2 * Math.PI * f * t) * env(i, n, 0.05, 2) * 0.22 * (Math.sin(t * 110) > 0 ? 1 : 0.3);
          }
        });
      case name === 'grunt':
        return this._make(0.3, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            lp += 0.06 * (rnd() - lp);
            d[i] = (lp * 1.5 + Math.sin(2 * Math.PI * (120 - t * 60) * t) * 0.6) * env(i, n, 0.03, 2.4) * 0.6;
          }
        });
      case name === 'keycard':
        return this._make(0.2, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            d[i] = (Math.sin(2 * Math.PI * 980 * t) * (t < 0.08 ? 1 : 0) + Math.sin(2 * Math.PI * 1240 * t) * (t >= 0.1 ? 1 : 0)) * env(i, n, 0.02, 3) * 0.25;
          }
        });
      case name === 'victory':
        return this._make(1.6, (d, sr, n) => {
          const notes = [392, 494, 587, 784];
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const idx = Math.min(notes.length - 1, Math.floor(t / 0.28));
            const f = notes[idx];
            d[i] = (Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15) * env(i, n, 0.02, 1.6) * 0.35;
          }
        });
      case name === 'defeat':
        return this._make(1.8, (d, sr, n) => {
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const f = 220 - t * 60;
            d[i] = (Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 0.5 * t) * 0.4) * env(i, n, 0.05, 1.2) * 0.35;
          }
        });
      case name === 'amb_hvac':
        return this._make(3.0, (d, sr, n) => {
          let lp = 0, lp2 = 0;
          for (let i = 0; i < n; i++) {
            lp += 0.012 * (rnd() - lp);
            lp2 += 0.002 * (rnd() - lp2);
            d[i] = (lp * 0.7 + lp2 * 1.4 + Math.sin(2 * Math.PI * 60 * (i / sr)) * 0.04) * 0.4;
          }
          // loop-blend the seam
          for (let i = 0; i < 400; i++) { const w = i / 400; d[i] = d[i] * w + d[n - 400 + i] * (1 - w); }
        });
      case name === 'amb_wind':
        return this._make(4.0, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.17 * t) * Math.sin(2 * Math.PI * 0.31 * t + 1);
            lp += 0.02 * (rnd() * mod - lp);
            d[i] = lp * 1.5 * 0.5;
          }
          for (let i = 0; i < 800; i++) { const w = i / 800; d[i] = d[i] * w + d[n - 800 + i] * (1 - w); }
        });
      case name === 'amb_server':
        return this._make(2.0, (d, sr, n) => {
          let lp = 0;
          for (let i = 0; i < n; i++) {
            lp += 0.09 * (rnd() - lp);
            d[i] = (lp + Math.sin(2 * Math.PI * 118 * (i / sr)) * 0.08 + Math.sin(2 * Math.PI * 237 * (i / sr)) * 0.05) * 0.35;
          }
          for (let i = 0; i < 400; i++) { const w = i / 400; d[i] = d[i] * w + d[n - 400 + i] * (1 - w); }
        });
      case name === 'music_menu':
        return this._make(9.6, (d, sr, n) => {
          // slow synth pad: Dm add9 arpeggio, icy and calm (original composition)
          const chord = [146.83, 174.61, 220.0, 293.66, 329.63];
          for (let i = 0; i < n; i++) {
            const t = i / sr;
            let v = 0;
            for (let k = 0; k < chord.length; k++) {
              const f = chord[k];
              const amp = 0.1 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.08 * t + k * 1.3));
              v += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * 0.05 * t + k) * 0.8) * amp;
              v += Math.sin(2 * Math.PI * f * 1.005 * t) * amp * 0.5;
            }
            const step = Math.floor(t / 0.6) % 8;
            const arpF = chord[[0, 2, 3, 4, 3, 2, 1, 2][step]] * 2;
            const at = (t % 0.6);
            v += Math.sin(2 * Math.PI * arpF * t) * Math.exp(-at * 5) * 0.06;
            d[i] = v * 0.5;
          }
          for (let i = 0; i < 4000; i++) { const w = i / 4000; d[i] = d[i] * w + d[n - 4000 + i] * (1 - w); }
        });
      default:
        return this._make(0.08, (d, sr, n) => { for (let i = 0; i < n; i++) d[i] = rnd() * env(i, n, 0.02, 4) * 0.2; });
    }
  }

  // ---------------------------------------------------------------- playback
  play(name, opts = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const buf = this._buf(name);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    if (opts.rate) src.playbackRate.value = opts.rate;
    let node = src;
    const gain = this.ctx.createGain();
    let vol = opts.vol ?? 1;
    if (opts.pos && this.game.player) {
      const p = this.game.player.eyePos();
      const dx = opts.pos.x - p.x, dy = (opts.pos.y ?? p.y) - p.y, dz = opts.pos.z - p.z;
      const dist = Math.hypot(dx, dy, dz);
      const ref = opts.refDist ?? 5;
      const maxD = opts.maxDist ?? 46;
      if (dist > maxD) return;
      vol *= Math.min(1, ref / Math.max(0.5, dist));
      // stereo pan relative to facing
      const yaw = this.game.player.yaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const side = (dx * rx + dz * rz) / Math.max(0.6, dist);
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = Math.max(-0.85, Math.min(0.85, side));
      node.connect(pan);
      node = pan;
      // simple occlusion: things behind walls sound muffled
      if (opts.occluded) {
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 700;
        node.connect(f); node = f;
        vol *= 0.6;
      }
    }
    gain.gain.value = vol;
    node.connect(gain);
    gain.connect(this.sfx);
    src.start();
  }

  // ---------------------------------------------------------------- ambience
  _startAmbience() {
    const mk = (name) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this._buf(name);
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      src.connect(g);
      g.connect(this.ambBus);
      src.start();
      return g;
    };
    this.ambient.hvac = mk('amb_hvac');
    this.ambient.wind = mk('amb_wind');
    this.ambient.server = mk('amb_server');
  }

  updateAmbience(roomStyle, dt) {
    if (!this.ctx) return;
    const t = { hvac: 0.16, wind: 0.02, server: 0 };
    if (!roomStyle || roomStyle === 'exterior') { t.wind = 0.5; t.hvac = 0; }
    else if (roomStyle === 'server') { t.server = 0.5; t.hvac = 0.08; }
    else if (roomStyle === 'garage' || roomStyle === 'service') { t.wind = 0.14; t.hvac = 0.1; }
    for (const k of Object.keys(this.ambient)) {
      const g = this.ambient[k].gain;
      g.value += (t[k] - g.value) * Math.min(1, dt * 2);
    }
  }

  // ---------------------------------------------------------------- music
  setMusic(kind) {
    if (!this.ctx) { this._wantMusic = kind; return; }
    if (this._musicKind === kind) return;
    this._musicKind = kind;
    if (this.musicNodes) {
      const { src, g } = this.musicNodes;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
      setTimeout(() => { try { src.stop(); } catch (e) {} }, 900);
      this.musicNodes = null;
    }
    if (kind === 'menu') {
      const src = this.ctx.createBufferSource();
      src.buffer = this._buf('music_menu');
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      src.connect(g);
      g.connect(this.musicBus);
      src.start();
      g.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 1.2);
      this.musicNodes = { src, g };
    }
  }

  // ---------------------------------------------------------------- wiring
  _wire() {
    bus.on('weapon-fired', (e) => {
      const fam = { pistol: 'pistol', smg: 'smg', rifle: 'rifle', shotgun: 'shotgun', sniper: 'sniper' }[e.family] || 'rifle';
      this.play('shot_' + fam, { vol: 0.9 });
    });
    bus.on('weapon-dryfire', () => this.play('dryfire'));
    bus.on('weapon-reload-start', () => { this.play('reload_out'); });
    bus.on('weapon-reload-done', () => this.play('reload_in'));
    bus.on('weapon-reload-shell', () => this.play('reload_in', { vol: 0.7 }));
    bus.on('weapon-switch', () => this.play('reload_in', { vol: 0.5, rate: 1.4 }));
    bus.on('weapon-melee', () => this.play('throw', { vol: 0.8, rate: 1.6 }));
    bus.on('footstep', (e) => {
      const map = { carpet: 'carpet', tile: 'tile', concrete: 'concrete', wood: 'wood', snow: 'snow', metal: 'metal' };
      const vol = e.who === 'player' ? (e.gait === 'walk' || e.gait === 'crouch' ? 0.25 : 0.5) : 0.5;
      this.play('foot_' + (map[e.material] || 'concrete'), { vol, pos: e.who === 'player' ? null : e.pos, rate: 0.92 + Math.random() * 0.16 });
    });
    bus.on('player-land', () => this.play('land', { vol: 0.7 }));
    bus.on('door-opening', (d) => this.play(d.style?.shutter ? 'shutter' : 'door_open', { pos: d.center() }));
    bus.on('door-closed', (d) => this.play('door_close', { pos: d.center(), vol: 0.7 }));
    bus.on('door-locked', (d) => this.play('door_locked', { pos: d.center() }));
    bus.on('door-unlocked', () => this.play('keycard'));
    bus.on('glass-break', (e) => this.play('glass_break', { pos: e.pos, vol: 1 }));
    bus.on('impact', (e) => this.play('impact_' + (e.material === 'flesh' ? 'flesh' : e.material), { pos: e.point, vol: 0.5, maxDist: 24 }));
    bus.on('shell-drop', (e) => this.play('shell', { pos: e.pos, vol: 0.5, maxDist: 8 }));
    bus.on('throwable-thrown', () => this.play('throw'));
    bus.on('throwable-bounce', (e) => this.play('bounce', { pos: e.pos, vol: 0.6 }));
    bus.on('player-damaged', () => this.play('hurt', { vol: 0.8 }));
    bus.on('enemy-damaged', (e) => { this.play('hit_confirm', { vol: 0.5 }); });
    bus.on('enemy-died', (e) => this.play('grunt', { pos: e.pos, vol: 0.9 }));
    bus.on('enemy-alerted', (e) => this.play('alert', { pos: e.pos, vol: 0.55, maxDist: 30 }));
    bus.on('objective-updated', () => this.play('objective', { vol: 0.7 }));
    bus.on('hostage-secured', () => this.play('keycard', { vol: 0.9 }));
    bus.on('ui-move', () => this.play('ui_move'));
    bus.on('ui-select', () => this.play('ui_select'));
    bus.on('ui-back', () => this.play('ui_back'));
    bus.on('mission-victory', () => { this.play('victory'); this.setMusic(null); });
    bus.on('mission-defeat', () => { this.play('defeat'); this.setMusic(null); });
    bus.on('settings-changed', () => this.applyVolumes());
  }
}
