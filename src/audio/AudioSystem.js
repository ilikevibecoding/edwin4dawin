import * as THREE from 'three';
import { SOUNDS, impactNameFor } from './sounds/index.js';
import { SURFACES } from './sounds/movement.js';
import { createSpatialChain } from './spatial.js';
import { getNoiseBuffer, getImpulseResponse, getSoftClipCurve, clamp, rnd } from './synth.js';
import { analyzeBuffer } from './analyze.js';

/**
 * Web Audio sound design for Seaside Strike — everything is synthesized, nothing is loaded.
 *
 * Graph:
 *   weapons/world/ambience/voice buses → pause gate → duck → muffle (low-pass) → master → compressor → soft-clip limiter → out
 *   ui bus → master (never ducked, muffled or paused)
 *   shared outdoor reverb: builders send into `lib.send` → low-pass → ConvolverNode(procedural IR) → pause gate
 *
 * Interface (see docs/ARCHITECTURE.md):
 *   async load(); update(dt)
 *   play(name, { position?, volume?, pitch?, delay?, bus?, ...soundOpts }) → voice | null
 *   setMasterVolume(v); setBusVolume(bus, v); getBusVolume(bus)
 *   renderPreview(name, seconds, opts) → Promise<{ peak, rms, durationMs, bands, ... }>   (OfflineAudioContext, works headless)
 *   list() → sound names; stats() → { ctxState, voices, ... }
 *
 * Respects game.settings.muted (checked every frame: mute = master 0 and no synthesis at all).
 * The AudioContext is created/resumed on the first user gesture and on game:state → 'playing'.
 */

const MAX_VOICES = 48;
const HARD_MAX_VOICES = MAX_VOICES + 8;
const BUSES = ['weapons', 'world', 'ambience', 'ui', 'voice'];
const BUS_DEFAULTS = { weapons: 1, world: 1, ambience: 0.55, ui: 0.8, voice: 1 };
const MUFFLE_OPEN = 20000;
const LOW_HEALTH = 35;
const LOW_HEALTH_RECOVER = 42;

export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.muted = !!game.settings.muted;
    this.enabled = !this.muted;

    this.ctx = null;
    this.graph = null;
    this.lib = null;
    this._ctxFailed = false;
    this._resuming = false;

    this.masterVolume = 1;
    this.busVolume = { ...BUS_DEFAULTS };
    this.voices = [];
    this._lastPlay = new Map();
    this._warned = new Set();

    // Listener scratch (no per-frame allocations).
    this._listenerPos = new THREE.Vector3();
    this._lastListener = new Float64Array(9);
    this._listenerDirty = true;
    this._scratch = new THREE.Vector3();
    this._scratch2 = new THREE.Vector3();

    // Sub-systems driven from update().
    this._amb = { enabled: false, wind: null, gull: rnd(4, 9), gunfire: rnd(12, 25), cicada: rnd(3, 8), cicadaVoice: null };
    this._hb = { active: false, next: 0, bpm: 60 };
    this._jet = null;
    this._obj = { owner: null, lastTick: 0 };
    this._muffle = { health: MUFFLE_OPEN, death: MUFFLE_OPEN };
    this._casingEventsSeen = false;
    this._gateLevel = 1;

    this._bindEvents();
    this._bindGestures();
  }

  async load() {
    // Nothing to fetch: every sound is procedural. The context itself is created lazily on a user gesture.
  }

  // ─────────────────────────────────────────────────────────────── public API

  list() {
    return Object.keys(SOUNDS);
  }

  stats() {
    return {
      ctxState: this.ctx ? this.ctx.state : 'none',
      sampleRate: this.ctx ? this.ctx.sampleRate : 0,
      voices: this.voices.length,
      muted: this.muted,
      masterVolume: this.masterVolume,
      busVolume: { ...this.busVolume },
      ambience: !!this._amb.wind,
      heartbeat: this._hb.active,
      jets: !!this._jet,
    };
  }

  setMasterVolume(v) {
    this.masterVolume = clamp(+v || 0, 0, 1);
    this._applyVolumes();
  }

  setBusVolume(bus, v) {
    if (!BUSES.includes(bus)) return;
    this.busVolume[bus] = clamp(+v || 0, 0, 1);
    this._applyVolumes();
  }

  getBusVolume(bus) {
    return this.busVolume[bus] ?? 0;
  }

  /**
   * Play a named sound. Returns the voice (or null when muted / no context / rate-limited).
   * opts: position (Vector3-like → spatialized), volume, pitch, delay (s), bus, plus sound-specific fields.
   */
  play(name, opts = null) {
    const entry = SOUNDS[name];
    if (!entry) {
      this._warnOnce(`unknown:${name}`, `[audio] unknown sound "${name}"`);
      return null;
    }
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== 'running') return null;
    const now = ctx.currentTime;
    if (entry.minInterval) {
      const last = this._lastPlay.get(name);
      if (last != null && now - last < entry.minInterval) return null;
      this._lastPlay.set(name, now);
    }
    if (this.voices.length >= MAX_VOICES) this._stealVoice(now);
    const voice = this._spawn(ctx, this.graph, this.lib, this._listenerPos, entry, name, opts, now + 0.005 + (opts?.delay > 0 ? +opts.delay : 0));
    if (voice) this.voices.push(voice);
    return voice;
  }

  /** Fade out and release a voice returned by play(). */
  stop(voice, fade = 0.05) {
    if (!voice || voice.disposed || !this.ctx) return;
    this._fadeVoice(voice, this.ctx.currentTime, fade);
  }

  /**
   * Render a sound into an OfflineAudioContext through the full master chain and return level statistics.
   * opts: count/interval (repeat a sound, e.g. a 10-round burst), position ([x,y,z] or Vector3), volume, pitch,
   *       plus any builder options. Works headless and while muted.
   */
  async renderPreview(name, seconds = 1, opts = {}) {
    const entry = SOUNDS[name];
    if (!entry) return { name, error: `unknown sound "${name}"` };
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!OAC) return { name, error: 'OfflineAudioContext unavailable' };
    try {
      const sr = 48000;
      const secs = clamp(+seconds || 1, 0.05, 30);
      const ctx = new OAC(2, Math.ceil(sr * secs), sr);
      const graph = this._buildGraph(ctx);
      const listener = new THREE.Vector3(0, 0, 0);
      const lib = { noise: (k) => getNoiseBuffer(ctx, k), send: graph.reverbIn };
      const count = Math.max(1, (opts.count | 0) || 1);
      const interval = opts.interval ?? 0.1;
      const o = { ...opts, offline: true };
      delete o.count;
      delete o.interval;
      for (let i = 0; i < count; i++) this._spawn(ctx, graph, lib, listener, entry, name, o, 0.02 + i * interval);
      const buf = await ctx.startRendering();
      return { name, seconds: secs, count, ...analyzeBuffer(buf) };
    } catch (err) {
      return { name, error: String(err?.message || err) };
    }
  }

  /** Render every registered sound (except loops longer than the window) and return a table of stats. */
  async renderAll(seconds = 1.5, names = null) {
    const out = [];
    for (const name of names || this.list()) {
      const secs = SOUNDS[name].persistent ? Math.max(seconds, 4) : seconds;
      out.push(await this.renderPreview(name, secs));
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────────── per-frame

  update(dt) {
    const settings = this.game.settings;
    const muted = !!settings.muted;
    if (muted !== this.muted) {
      this.muted = muted;
      this.enabled = !muted;
      if (this.ctx) {
        this._applyVolumes();
        if (muted) this._killAllVoices();
      }
    }
    if (!this.ctx) {
      if (!muted && (this.game.state === 'playing' || settings.shotMode)) this._ensureContext();
      if (!this.ctx) return;
    }
    const ctx = this.ctx;
    if (ctx.state !== 'running') {
      if (this.game.state === 'playing' && !muted) this._resume();
      return;
    }
    const now = ctx.currentTime;
    this._updateListener(now);
    this._sweepVoices(now);
    if (dt > 0) {
      if (this.game.isPlaying) {
        this._updateAmbience(dt, now);
        this._updateHeartbeat(now);
      }
      this._updateJets(dt, now);
    }
  }

  _updateListener(now) {
    const cam = this.game.camera;
    if (!cam) return;
    const e = cam.matrixWorld.elements;
    const px = e[12], py = e[13], pz = e[14];
    let fx = -e[8], fy = -e[9], fz = -e[10];
    let ux = e[4], uy = e[5], uz = e[6];
    const fl = Math.hypot(fx, fy, fz) || 1;
    const ul = Math.hypot(ux, uy, uz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    ux /= ul; uy /= ul; uz /= ul;
    if (!Number.isFinite(px + py + pz + fx + fy + fz + ux + uy + uz)) return;
    this._listenerPos.set(px, py, pz);
    const L = this._lastListener;
    if (!this._listenerDirty) {
      const d =
        Math.abs(L[0] - px) + Math.abs(L[1] - py) + Math.abs(L[2] - pz) +
        Math.abs(L[3] - fx) + Math.abs(L[4] - fy) + Math.abs(L[5] - fz) +
        Math.abs(L[6] - ux) + Math.abs(L[7] - uy) + Math.abs(L[8] - uz);
      if (d < 1e-4) return;
    }
    this._listenerDirty = false;
    L[0] = px; L[1] = py; L[2] = pz; L[3] = fx; L[4] = fy; L[5] = fz; L[6] = ux; L[7] = uy; L[8] = uz;
    const ls = this.ctx.listener;
    if (ls.positionX) {
      const tc = 0.015;
      ls.positionX.setTargetAtTime(px, now, tc);
      ls.positionY.setTargetAtTime(py, now, tc);
      ls.positionZ.setTargetAtTime(pz, now, tc);
      ls.forwardX.setTargetAtTime(fx, now, tc);
      ls.forwardY.setTargetAtTime(fy, now, tc);
      ls.forwardZ.setTargetAtTime(fz, now, tc);
      ls.upX.setTargetAtTime(ux, now, tc);
      ls.upY.setTargetAtTime(uy, now, tc);
      ls.upZ.setTargetAtTime(uz, now, tc);
    } else {
      ls.setPosition(px, py, pz);
      ls.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  _sweepVoices(now) {
    const vs = this.voices;
    for (let i = vs.length - 1; i >= 0; i--) {
      const v = vs[i];
      if (now >= v.end) {
        this._disposeVoice(v);
        const last = vs.length - 1;
        vs[i] = vs[last];
        vs.pop();
      }
    }
  }

  _updateAmbience(dt, now) {
    const A = this._amb;
    if (!A.enabled) return;
    if (!A.wind || A.wind.disposed) A.wind = this.play('amb_wind', { persistent: true });
    const L = this._listenerPos;
    const s = this._scratch;
    A.gull -= dt;
    if (A.gull <= 0) {
      A.gull = rnd(8, 20);
      const az = rnd(0, Math.PI * 2);
      const d = rnd(40, 90);
      s.set(L.x + Math.cos(az) * d, L.y + rnd(15, 35), L.z + Math.sin(az) * d);
      this.play('gull', { position: s, pitch: rnd(0.9, 1.1) });
    }
    A.gunfire -= dt;
    if (A.gunfire <= 0) {
      A.gunfire = rnd(15, 40);
      const az = rnd(0, Math.PI * 2);
      const d = rnd(150, 350);
      s.set(L.x + Math.cos(az) * d, L.y + rnd(0, 10), L.z + Math.sin(az) * d);
      this.play(Math.random() < 0.7 ? 'distant_gunfire' : 'distant_rumble', { position: s });
    }
    A.cicada -= dt;
    if (A.cicada <= 0) {
      const dur = rnd(6, 14);
      A.cicada = dur + rnd(4, 12);
      const az = rnd(0, Math.PI * 2);
      const d = rnd(25, 45);
      s.set(L.x + Math.cos(az) * d, L.y + rnd(2, 6), L.z + Math.sin(az) * d);
      A.cicadaVoice = this.play('cicada', { position: s, duration: dur });
    }
  }

  _updateHeartbeat(now) {
    const hb = this._hb;
    if (!hb.active) return;
    if (hb.next < now) hb.next = now + 0.05;
    while (hb.next < now + 0.3) {
      this.play('heartbeat', { delay: hb.next - now });
      hb.next += 60 / hb.bpm;
    }
  }

  _updateJets(dt, now) {
    const J = this._jet;
    if (!J) return;
    if (!J.voice || J.voice.disposed) {
      this._jet = null;
      return;
    }
    J.t += dt;
    let px, py, pz, vx, vy, vz;
    let live = false;
    const jets = this.game.killstreaks?.jets;
    const j = Array.isArray(jets) && jets.length ? jets[0] : null;
    if (j && j.position && Number.isFinite(j.position.x)) {
      px = j.position.x; py = j.position.y; pz = j.position.z;
      if (j.velocity && Number.isFinite(j.velocity.x)) {
        vx = j.velocity.x; vy = j.velocity.y; vz = j.velocity.z;
      } else if (J.hasPrev && dt > 0) {
        vx = (px - J.ppx) / dt; vy = (py - J.ppy) / dt; vz = (pz - J.ppz) / dt;
      } else {
        vx = vy = vz = 0;
      }
      J.ppx = px; J.ppy = py; J.ppz = pz;
      J.hasPrev = true;
      J.sawLive = true;
      live = true;
    } else if (J.sawLive) {
      this._endJets(now);
      return;
    } else {
      // Scripted pass-by along the strike direction.
      const s = J.speed * J.t;
      px = J.sx + J.dx * s; py = J.sy; pz = J.sz + J.dz * s;
      vx = J.dx * J.speed; vy = 0; vz = J.dz * J.speed;
    }
    const L = this._listenerPos;
    const rx = px - L.x, ry = py - L.y, rz = pz - L.z;
    const dist = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    const vr = (vx * rx + vy * ry + vz * rz) / dist; // + receding
    const doppler = 343 / (343 + clamp(vr, -320, 320));
    const data = J.voice.data;
    if (data?.setRate) data.setRate(doppler, now);
    if (data?.setIntensity) data.setIntensity(clamp(1.05 - dist / 500, 0.3, 1.05), now);
    if (J.voice.sp) J.voice.sp.move(px, py, pz, now);
    if (J.prevVr < 0 && vr >= 0 && !J.boom && dist < 500) {
      J.boom = true;
      this.play('jet_boom', { position: this._scratch.set(px, py, pz) });
    }
    J.prevVr = vr;
    if (!live && J.t >= J.duration) this._endJets(now);
  }

  // ─────────────────────────────────────────────────────────────── graph & context

  _ensureContext() {
    if (this.ctx || this._ctxFailed) return this.ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) {
      this._ctxFailed = true;
      return null;
    }
    try {
      let ctx;
      try {
        ctx = new AC({ latencyHint: 'interactive', sampleRate: 48000 });
      } catch {
        ctx = new AC();
      }
      this.ctx = ctx;
      this.graph = this._buildGraph(ctx);
      this.lib = { noise: (k) => getNoiseBuffer(ctx, k), send: this.graph.reverbIn };
      this._listenerDirty = true;
      this._applyVolumes();
      this._applyMuffle(true);
      this.graph.gate.gain.value = this.game.state === 'playing' || this.game.state === 'dead' || this.game.state === 'ended' ? 1 : 0;
    } catch (err) {
      this._ctxFailed = true;
      this.ctx = null;
      this.graph = null;
      this._warnOnce('ctx', `[audio] AudioContext unavailable: ${err?.message || err}`);
    }
    return this.ctx;
  }

  _buildGraph(ctx) {
    const g = { ctx, buses: {} };
    g.master = ctx.createGain();
    g.master.gain.value = this.muted && ctx === this.ctx ? 0 : this.masterVolume;
    g.comp = ctx.createDynamicsCompressor();
    g.comp.threshold.value = -6;
    g.comp.knee.value = 8;
    g.comp.ratio.value = 4;
    g.comp.attack.value = 0.002;
    g.comp.release.value = 0.14;
    g.limiter = ctx.createWaveShaper();
    g.limiter.curve = getSoftClipCurve();
    g.limiter.oversample = '2x';
    g.master.connect(g.comp);
    g.comp.connect(g.limiter);
    g.limiter.connect(ctx.destination);

    g.muffle = ctx.createBiquadFilter();
    g.muffle.type = 'lowpass';
    g.muffle.frequency.value = MUFFLE_OPEN;
    g.muffle.Q.value = 0.3;
    g.muffle.connect(g.master);
    g.duck = ctx.createGain();
    g.duck.connect(g.muffle);
    g.gate = ctx.createGain();
    g.gate.connect(g.duck);

    for (const name of BUSES) {
      const b = ctx.createGain();
      b.gain.value = this.busVolume[name];
      b.connect(name === 'ui' ? g.master : g.gate);
      g.buses[name] = b;
    }

    // Shared outdoor reverb (plaza slap + 2.5 s dark tail).
    g.reverbIn = ctx.createGain();
    g.reverbLP = ctx.createBiquadFilter();
    g.reverbLP.type = 'lowpass';
    g.reverbLP.frequency.value = 3200;
    g.reverbLP.Q.value = 0.5;
    g.conv = ctx.createConvolver();
    g.conv.buffer = getImpulseResponse(ctx);
    g.reverbOut = ctx.createGain();
    g.reverbOut.gain.value = 1;
    g.reverbIn.connect(g.reverbLP);
    g.reverbLP.connect(g.conv);
    g.conv.connect(g.reverbOut);
    g.reverbOut.connect(g.gate);
    return g;
  }

  _resume() {
    const c = this.ctx;
    if (!c || c.state === 'running' || c.state === 'closed' || this._resuming) return;
    this._resuming = true;
    let p;
    try {
      p = c.resume();
    } catch {
      this._resuming = false;
      return;
    }
    if (p && p.then) {
      p.then(
        () => {
          this._resuming = false;
        },
        () => {
          this._resuming = false;
        },
      );
    } else this._resuming = false;
  }

  _applyVolumes() {
    const g = this.graph;
    if (!g) return;
    const now = this.ctx.currentTime;
    g.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.02);
    for (const name of BUSES) g.buses[name].gain.setTargetAtTime(this.busVolume[name], now, 0.03);
  }

  _setGate(level) {
    this._gateLevel = level;
    const g = this.graph;
    if (!g) return;
    g.gate.gain.setTargetAtTime(level, this.ctx.currentTime, level ? 0.15 : 0.06);
  }

  /** Master dip (explosions): drop quickly to `level`, recover over `seconds`. */
  _duck(level, seconds) {
    const g = this.graph;
    if (!g) return;
    const now = this.ctx.currentTime;
    const p = g.duck.gain;
    p.cancelScheduledValues(now);
    p.setValueAtTime(Math.min(p.value, 1), now);
    p.linearRampToValueAtTime(level, now + 0.02);
    p.setTargetAtTime(1, now + seconds * 0.3, seconds * 0.35);
  }

  _applyMuffle(immediate = false) {
    const g = this.graph;
    if (!g) return;
    const target = Math.min(this._muffle.health, this._muffle.death);
    const p = g.muffle.frequency;
    const now = this.ctx.currentTime;
    p.cancelScheduledValues(now);
    if (immediate) p.setValueAtTime(target, now);
    else p.setTargetAtTime(target, now, 0.25);
  }

  /** Temporary muffle (blast): slam the cutoff down then relax back to the sustained target. */
  _muffleBurst(cutoff, seconds) {
    const g = this.graph;
    if (!g) return;
    const target = Math.min(this._muffle.health, this._muffle.death);
    const p = g.muffle.frequency;
    const now = this.ctx.currentTime;
    p.cancelScheduledValues(now);
    p.setValueAtTime(Math.max(200, p.value), now);
    p.exponentialRampToValueAtTime(Math.min(target, cutoff), now + 0.03);
    p.setTargetAtTime(target, now + seconds * 0.3, seconds * 0.4);
  }

  // ─────────────────────────────────────────────────────────────── voices

  _spawn(ctx, graph, lib, listenerPos, entry, name, opts, t) {
    const busName = (opts && opts.bus) || entry.bus || 'world';
    const bus = graph.buses[busName] || graph.buses.world;
    const volume = (opts && opts.volume != null ? +opts.volume : 1) * (entry.gain ?? 1);
    const g = ctx.createGain();
    g.gain.value = Number.isFinite(volume) ? volume : 1;
    let sp = null;
    let pos = opts && opts.position;
    if (pos && entry.spatial !== false) {
      if (Array.isArray(pos)) pos = { x: pos[0], y: pos[1], z: pos[2] };
      if (Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)) {
        sp = createSpatialChain(ctx, bus, pos, listenerPos, { ...(entry.spatial || {}), ...(opts.spatial || {}) });
        g.connect(sp.input);
      } else g.connect(bus);
    } else g.connect(bus);

    let h = null;
    try {
      const o = Object.assign({}, opts, { t, pitch: opts && opts.pitch > 0 ? +opts.pitch : 1, lib, dist: sp ? sp.dist : 0, attn: sp ? sp.attn : 1, extraDelay: sp ? sp.extraDelay : 0 });
      delete o.position;
      h = entry.build(ctx, g, o);
    } catch (err) {
      this._warnOnce(`build:${name}`, `[audio] "${name}" failed to build: ${err?.message || err}`);
      try {
        g.disconnect();
      } catch {
        /* ignore */
      }
      if (sp) sp.dispose();
      return null;
    }
    const persistent = !!(entry.persistent || (opts && opts.persistent));
    const end = h && Number.isFinite(h.end) ? h.end + (sp ? sp.extraDelay : 0) + 0.05 : persistent ? Infinity : t + 2;
    return { name, gain: g, sp, start: t, end: persistent ? Infinity : end, stop: h ? h.stop : null, persistent, data: h, disposed: false };
  }

  _disposeVoice(v) {
    if (v.disposed) return;
    v.disposed = true;
    try {
      v.gain.disconnect();
    } catch {
      /* already gone */
    }
    if (v.sp) v.sp.dispose();
  }

  _fadeVoice(v, now, fade = 0.02) {
    if (v.disposed) return;
    const p = v.gain.gain;
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now);
    p.linearRampToValueAtTime(0, now + fade);
    if (v.stop) v.stop(now + fade + 0.02);
    v.end = now + fade + 0.05;
    v.persistent = false;
  }

  _stealVoice(now) {
    const vs = this.voices;
    let oldest = null;
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      if (v.persistent || v.end <= now + 0.06) continue; // already ending
      if (!oldest || v.start < oldest.start) oldest = v;
    }
    if (oldest) this._fadeVoice(oldest, now, 0.015);
    if (vs.length >= HARD_MAX_VOICES) {
      // Pathological burst (dozens of plays in one frame): hard-drop the oldest voices so the pool stays bounded.
      let drop = vs.length - MAX_VOICES;
      while (drop > 0) {
        let idx = -1;
        for (let i = 0; i < vs.length; i++) {
          const v = vs[i];
          if (v.persistent) continue;
          if (idx < 0 || v.start < vs[idx].start) idx = i;
        }
        if (idx < 0) break;
        this._disposeVoice(vs[idx]);
        vs[idx] = vs[vs.length - 1];
        vs.pop();
        drop--;
      }
    }
  }

  _killAllVoices() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const v of this.voices) this._fadeVoice(v, now, 0.03);
    this._amb.wind = null;
    this._amb.cicadaVoice = null;
    this._jet = null;
    this._hb.active = false;
  }

  // ─────────────────────────────────────────────────────────────── events

  _bindEvents() {
    const on = (name, fn) =>
      this.events.on(name, (e) => {
        try {
          fn(e || {});
        } catch (err) {
          this._warnOnce(`event:${name}`, `[audio] handler for "${name}" failed: ${err?.message || err}`);
        }
      });

    // Weapons
    on('weapon:fire', () => this.play('rifle_shot', { ads: !!this.game.weapons?.current?.isAiming }));
    on('weapon:reload:start', (e) => this.play('rifle_reload', { duration: e.duration }));
    on('weapon:empty', () => this.play('dry_fire'));
    on('weapon:aim', (e) => this.play(e.aiming ? 'aim_in' : 'aim_out'));
    on('weapon:casing', (e) => {
      // Until the VFX team emits real 'casing:bounce' events, fake the landing ~0.6 s after ejection.
      if (this._casingEventsSeen) return;
      const p = this.game.player?.position;
      if (!p) return;
      this._scratch.set(p.x + rnd(0.3, 0.9), p.y + 0.05, p.z + rnd(-0.4, 0.4));
      this.play('casing_bounce', { position: this._scratch, delay: rnd(0.5, 0.8), volume: 0.8 });
      void e;
    });
    on('casing:bounce', (e) => {
      this._casingEventsSeen = true;
      if (e.position) this.play('casing_bounce', { position: e.position });
    });
    on('bullet:hit', (e) => {
      if (e.point) this.play(impactNameFor(e.surface), { position: e.point });
    });
    on('bullet:whizz', (e) => {
      if (e.point) this.play('bullet_whizz', { position: e.point, direction: e.direction });
    });
    on('enemy:fire', (e) => {
      if (e.origin) this.play('rifle_shot_distant', { position: e.origin });
    });

    // Movement
    on('footstep', (e) => {
      const surface = SURFACES.includes(e.surface) ? e.surface : 'stone';
      this.play(`step_${surface}`, { sprint: !!e.sprint, crouch: !!e.crouch });
    });
    on('player:jump', () => this.play('jump'));
    on('player:land', (e) => {
      let surface = 'stone';
      try {
        surface = this.game.player?.groundSurface?.() || 'stone';
      } catch {
        /* physics not ready */
      }
      this.play('land', { impact: e.impact, surface });
    });

    // Combat
    on('explosion', (e) => this._onExplosion(e));
    on('ui:hitmarker', (e) => this.play(e.kill ? 'hitmarker_kill' : e.headshot ? 'hitmarker_head' : 'hitmarker'));
    on('enemy:killed', (e) => {
      if (e.position) this.play('enemy_down', { position: e.position });
    });
    on('player:damaged', (e) => this.play('player_hit', { amount: e.amount }));
    on('player:health', (e) => this._onHealth(e));
    on('player:died', () => this._onDied());
    on('player:respawn', () => this._onRespawn());

    // Killstreaks
    on('killstreak:ready', () => this.play('ks_ready'));
    on('killstreak:targeting', (e) => this.play(e.active ? 'ks_target_on' : 'ks_target_off'));
    on('killstreak:called', () => this.play('ks_callin'));
    on('killstreak:jets', (e) => this._startJets(e));
    on('killstreak:bomb', (e) => {
      if (e.position) this.play('bomb_whistle', { position: e.position, duration: e.duration || e.fallTime });
    });
    on('killstreak:impact', (e) => {
      if (e.position) this.play('impact_echo', { position: e.position });
    });

    // Match flow / UI
    on('score', (e) => this.play('score_pop', { points: e.points }));
    on('objective:progress', (e) => this._onObjective(e));
    on('wave', () => this.play('wave_sting'));
    on('match:end', (e) => this.play('match_end', { win: e.winner !== 'red' }));
    on('game:state', (e) => this._onState(e));
  }

  _bindGestures() {
    if (typeof window === 'undefined') return;
    const h = () => this._onGesture();
    window.addEventListener('pointerdown', h, { passive: true });
    window.addEventListener('click', h, { passive: true });
    window.addEventListener('keydown', h, { passive: true });
    window.addEventListener('touchstart', h, { passive: true });
    document.addEventListener('pointerlockchange', h);
  }

  _onGesture() {
    if (this.game.settings.muted) return;
    this._ensureContext();
    this._resume();
  }

  _onState({ state }) {
    if (state === 'playing') {
      if (!this.muted) {
        this._ensureContext();
        this._resume();
      }
      this._setGate(1);
      this._amb.enabled = true;
    } else if (state === 'paused' || state === 'menu') {
      this._setGate(0);
      if (state === 'menu') {
        this._amb.enabled = false;
        this._hb.active = false;
        this._muffle.health = MUFFLE_OPEN;
        this._muffle.death = MUFFLE_OPEN;
        this._applyMuffle();
      }
    } else {
      this._setGate(1); // 'dead' / 'ended' keep the world audible (death muffle applies on top)
    }
  }

  _onExplosion(e) {
    const pos = e.position;
    if (!pos) return;
    const d = this._listenerPos.distanceTo(pos);
    this.play('explosion', { position: pos, radius: e.radius, kind: e.kind });
    if (d < 12) {
      this.play('tinnitus');
      this._duck(0.3, 1.5);
      this._muffleBurst(1200, 1.5);
    } else if (d < 30) {
      this._duck(0.6, 0.7);
    }
  }

  _onHealth({ health, max }) {
    const hb = this._hb;
    const alive = this.game.player ? this.game.player.alive !== false : true;
    const h = Number.isFinite(health) ? health : max || 100;
    if (alive && h < LOW_HEALTH) {
      hb.bpm = 60 + (LOW_HEALTH - h) * 0.9;
      if (!hb.active) {
        hb.active = true;
        hb.next = 0;
        this._muffle.health = 1400;
        this._applyMuffle();
      }
    } else if (hb.active && (h >= LOW_HEALTH_RECOVER || !alive)) {
      hb.active = false;
      this._muffle.health = MUFFLE_OPEN;
      this._applyMuffle();
    }
  }

  _onDied() {
    this._hb.active = false;
    this._muffle.health = MUFFLE_OPEN;
    this._muffle.death = 700;
    this._applyMuffle();
    this.play('death');
  }

  _onRespawn() {
    this._hb.active = false;
    this._muffle.health = MUFFLE_OPEN;
    this._muffle.death = MUFFLE_OPEN;
    this._applyMuffle();
    if (this.game.state !== 'loading') this.play('respawn');
  }

  _onObjective({ progress, owner, contested, playerIn }) {
    const O = this._obj;
    if (owner !== O.owner) {
      this.play(owner === 'blue' ? 'objective_captured' : 'objective_lost');
      O.owner = owner;
    }
    if (playerIn && !contested) {
      if (Math.abs(progress - O.lastTick) >= 0.1) {
        O.lastTick = progress;
        this.play('objective_tick', { progress });
      }
    } else O.lastTick = progress;
  }

  _startJets(e) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.muted) return;
    if (this._jet) this._endJets(ctx.currentTime);
    const L = this._listenerPos;
    const pos = e.position && Number.isFinite(e.position.x) ? e.position : this._scratch2.set(L.x, L.y + 80, L.z - 300);
    let dx = e.direction && Number.isFinite(e.direction.x) ? e.direction.x : 1;
    let dz = e.direction && Number.isFinite(e.direction.z) ? e.direction.z : 0.3;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl;
    dz /= dl;
    const speed = 230;
    const dToListener = Math.hypot(pos.x - L.x, pos.z - L.z);
    // A target-like position (near the player) means the jet should start well behind it.
    const behind = dToListener < 120 ? 330 : 0;
    const sx = pos.x - dx * behind;
    const sz = pos.z - dz * behind;
    const sy = Math.max(pos.y, L.y + 55);
    const voice = this.play('jet_flyover', { position: this._scratch.set(sx, sy, sz), persistent: true });
    if (!voice) return;
    this._jet = { voice, t: 0, duration: 6.5, speed, dx, dz, sx, sy, sz, prevVr: -1, boom: false, hasPrev: false, sawLive: false, ppx: 0, ppy: 0, ppz: 0 };
  }

  _endJets(now) {
    const J = this._jet;
    if (!J) return;
    if (J.voice && !J.voice.disposed) this._fadeVoice(J.voice, now, 1.2);
    this._jet = null;
  }

  _warnOnce(key, msg) {
    if (this._warned.has(key)) return;
    this._warned.add(key);
    console.warn(msg);
  }
}
