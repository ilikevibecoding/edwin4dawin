// ---------------------------------------------------------------------------
// AudioEngine.  (owner: fable4)
//
// 100% procedural audio: every sound is synthesised at runtime with the Web
// Audio API (see sfx.js / vox.js / ambience.js / music.js). No files, no
// samples, nothing that can 404 and nothing anyone holds a copyright on.
//
// Graph:
//   voice gain -> [PannerNode] -> bus (sfx|voice|music|ambience|ui)
//     buses -> compressor/limiter -> master gain -> destination
//     buses (sfx/voice/ambience) -> per-bus send -> reverb input
//       reverb input -> convolver A/B (procedural IR per room type,
//       crossfaded on zone change) -> wet gain -> compressor
//
// Autoplay policy: the AudioContext is only constructed inside resume(),
// which the game calls from user gestures. Until then - and whenever no
// audio device exists - every method is a safe no-op.
//
// Almost everything is driven by subscribing to the event bus rather than
// by direct calls; playDoor()/play()/setListener() remain for the contract.
// ---------------------------------------------------------------------------

import { bus, EVT } from '../core/events.js';
import { settings } from '../core/settings.js';
import { SURFACE_PROPS } from '../physics/world.js';
import { roomAt, floorForY, HOSTAGE_POINTS } from '../map/layout.js';
import { WEAPON_DEFS } from '../weapons/defs.js';
import { Kit, impulseResponse } from './synth.js';
import { SOUNDS } from './sfx.js';
import './vox.js';       // registers all vocal recipes
import { AmbienceManager } from './ambience.js';
import { MusicBed } from './music.js';
import { SOUND_ALIASES, registerAudioAssets } from './manifest.js';

const MIN = 0.0001;
const MAX_VOICES = 28;    // one-shot cap (priority-based stealing)
const MAX_AMBIENT = 12;   // looping ambience cap (managed by culling)
const SERVICE_MS = 120;   // scheduling / culling / reaping cadence

const BUS_NAMES = ['sfx', 'voice', 'music', 'ambience', 'ui'];

/** Reverb programmes: procedurally generated IRs per architectural type. */
const REVERBS = {
  outdoor:  { seconds: 0.35, decay: 3.6, brightStart: 0.5,  brightEnd: 0.1,  predelayMs: 42, earlyMs: 34, wet: 0.1 },
  office:   { seconds: 0.4,  decay: 3.0, brightStart: 0.45, brightEnd: 0.08, predelayMs: 5,  earlyMs: 9,  wet: 0.22 },
  restroom: { seconds: 0.8,  decay: 2.0, brightStart: 0.85, brightEnd: 0.45, predelayMs: 3,  earlyMs: 7,  flutterMs: 9,  wet: 0.34 },
  concrete: { seconds: 1.7,  decay: 2.2, brightStart: 0.6,  brightEnd: 0.18, predelayMs: 10, earlyMs: 14, wet: 0.32 },
  server:   { seconds: 0.5,  decay: 2.4, brightStart: 0.7,  brightEnd: 0.3,  predelayMs: 2,  earlyMs: 6,  flutterMs: 12, wet: 0.26 },
  atrium:   { seconds: 2.6,  decay: 2.0, brightStart: 0.65, brightEnd: 0.25, predelayMs: 24, earlyMs: 20, wet: 0.3 },
};

/** layout.js zone key (or special room id) -> reverb programme. */
const ZONE_TO_REVERB = {
  exterior: 'outdoor',
  office: 'office',
  executive: 'office',
  service: 'concrete',
  server: 'server',
  // rooms that override their zone:
  lobby: 'atrium',
  stairwell: 'atrium',
  weststair: 'concrete',
  restrooms: 'restroom',
  garage: 'concrete',
  loading: 'concrete',
};

const SURFACE_TO_STEP = {
  carpet: 'footstep_carpet', fabric: 'footstep_carpet', paper: 'footstep_carpet',
  tile: 'footstep_tile', glass: 'footstep_tile',
  vinyl: 'footstep_vinyl', plastic: 'footstep_vinyl',
  concrete: 'footstep_concrete', drywall: 'footstep_concrete',
  snow: 'footstep_snow',
  metal: 'footstep_metal', electronic: 'footstep_metal',
  wood: 'footstep_wood',
};

const toArray = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return p;
  if (typeof p.x === 'number') return [p.x, p.y ?? 0, p.z ?? 0];
  return null;
};

export class AudioEngine {
  constructor() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    this._AC = typeof AC === 'function' ? AC : null;
    this.ctx = null;
    this.ready = false;

    this.buses = {};
    this._busBase = { sfx: 1, voice: 1, music: 1, ambience: 1, ui: 1 };
    this._stateScale = { music: 1, ambience: 1 };

    this.voices = [];        // one-shot pool
    this.ambientVoices = []; // loop pool

    this.listenerPos = [0, 1.7, 0];
    this.listenerFwd = [0, 0, -1];
    this.listenerUp = [0, 1, 0];
    this._manualListenerUntil = 0;
    this._gameRef = null;

    this._zone = null;
    this._activeConv = 0;

    this._heat = 0;              // combat intensity feeding the music bed
    this._gameState = 'boot';
    this._playing = false;

    this._lastSurface = 'concrete';
    this._followers = 0;
    this._hostages = new Map();  // id -> { pos, state, next }
    this._doorRecent = new Map();
    this._glassRecent = new Map();
    this._shutterMotors = new Map();
    this._smokeHisses = [];
    this._missionEndAt = -99;
    this._unknownWarned = new Set();
    this._service = null;

    registerAudioAssets();
    this._seedHostages();
    this._wire();
  }

  // ================================================================ lifecycle

  /** Create/resume the context. Safe to call repeatedly and from gestures. */
  resume() {
    if (!this._AC) return;
    if (!this.ctx) {
      try {
        this.ctx = new this._AC({ latencyHint: 'interactive' });
      } catch {
        this._AC = null; // no audio device / denied - stay silent forever
        return;
      }
      try {
        this._buildGraph();
        this.ready = true;
      } catch {
        this.ready = false;
        return;
      }
    }
    if (this.ctx.state !== 'running') {
      try { this.ctx.resume()?.catch?.(() => {}); } catch { /* no-op */ }
    }
    this._startService();
  }

  suspend() {
    if (!this.ctx) return;
    try { this.ctx.suspend()?.catch?.(() => {}); } catch { /* no-op */ }
  }

  /** Kill every playing one-shot, loop and the music bed (graph survives). */
  stopAll() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    for (const v of [...this.voices, ...this.ambientVoices]) this._kill(v, now, 0.05);
    this.voices.length = 0;
    this.ambientVoices.length = 0;
    this.ambience?.stopAll();
    for (const h of this._shutterMotors.values()) h.stop?.(0.05);
    this._shutterMotors.clear();
    this._smokeHisses.length = 0;
    this.music?.stop(0.3);
  }

  // ================================================================== contract

  /**
   * Play a synthesised sound by id.
   * @param {string} name  runtime id (e.g. 'impact_metal') or manifest id
   *                       (e.g. 'SFX-IMPACT-METAL')
   * @param {object} opts  {position: Vector3|[x,y,z], volume, pitch, delay,
   *                        loop/duration, ...recipe-specific}
   * @returns {{stop(fade:number):void}|null}
   */
  play(name, opts = {}) {
    if (!this.ready) return null;
    const rec = this._resolve(name);
    if (!rec) return null;
    if (opts.loop && !opts.duration) opts = { ...opts, duration: 1800 };
    return this._trigger(rec, opts, this.voices, MAX_VOICES);
  }

  /**
   * Door feedback. `result` is what Door.use()/update() reported:
   * 'opening' | 'closing' | 'locked' | 'unlocked' | 'damaged'
   * (also handles 'open'/'closed' settle states and the garage shutter).
   */
  playDoor(result, door) {
    if (!this.ready || !result) return;
    const spec = door?.spec || door || {};
    const id = door?.id || spec.id || 'door';
    const key = `${id}:${result}`;
    const now = this.ctx.currentTime;
    if (now - (this._doorRecent.get(key) ?? -9) < 0.15) return; // playDoor + DOOR_STATE dedupe
    this._doorRecent.set(key, now);

    const pos = [spec.x ?? 0, (spec.y ?? 0) + 1.1, spec.z ?? 0];
    const shutter = !!(spec.type === 'shutter' || door?.shutter || spec.shutter);
    if (shutter) return this._playShutter(result, id, pos);

    const kind = spec.security ? 'metal' : spec.fire ? 'fire' : spec.glass ? 'glass' : 'wood';
    const table = {
      opening: `door_${kind}_open`,
      closing: `door_${kind}_close`,
      locked: 'door_locked',
      unlocked: 'door_unlocked',
      damaged: 'door_damaged',
      closed: 'door_handle',   // settle: latch click only
    };
    const name = table[result];
    if (name) this.play(name, { position: pos });
  }

  /** Called by the game (or by our own frame hook) to move the ears. */
  setListener(position, forwardVec, upVec) {
    const p = toArray(position);
    if (p) this.listenerPos = p;
    const f = toArray(forwardVec);
    if (f) this.listenerFwd = f;
    const u = toArray(upVec);
    if (u) this.listenerUp = u;
    this._manualListenerUntil = (this.ctx?.currentTime ?? 0) + 1.5;
    this._applyListener();
  }

  /** Switch the reverb programme (accepts zone keys, room ids or IR names). */
  setRoomZone(zoneKey) {
    if (!this.ready) return;
    const ir = REVERBS[zoneKey] ? zoneKey : (ZONE_TO_REVERB[zoneKey] || 'office');
    if (ir === this._zone) return;
    this._zone = ir;
    const p = REVERBS[ir];
    const idx = 1 - this._activeConv;
    this._convs[idx].buffer = this._irCache[ir] || (this._irCache[ir] = impulseResponse(this.ctx, p));
    const t = this.ctx.currentTime;
    this._convGains[idx].gain.setTargetAtTime(1, t, 0.18);
    this._convGains[this._activeConv].gain.setTargetAtTime(MIN, t, 0.18);
    this._reverbWet.gain.setTargetAtTime(p.wet, t, 0.25);
    this._activeConv = idx;
  }

  // ================================================================ the graph

  _buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);

    // Limiter so stacked gunfire can never clip the output.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 18;
    this.limiter.ratio.value = 14;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.22;
    this.limiter.connect(this.master);

    for (const name of BUS_NAMES) {
      const g = ctx.createGain();
      g.connect(this.limiter);
      this.buses[name] = g;
    }

    // Reverb: shared input, two convolvers crossfaded on zone change.
    this._reverbIn = ctx.createGain();
    this._reverbWet = ctx.createGain();
    this._reverbWet.gain.value = 0.22;
    this._reverbWet.connect(this.limiter);
    this._convs = [ctx.createConvolver(), ctx.createConvolver()];
    this._convGains = [ctx.createGain(), ctx.createGain()];
    for (let i = 0; i < 2; i++) {
      this._convs[i].normalize = true;
      this._convGains[i].gain.value = i === 0 ? 1 : MIN;
      this._reverbIn.connect(this._convGains[i]);
      this._convGains[i].connect(this._convs[i]);
      this._convs[i].connect(this._reverbWet);
    }
    this._irCache = {};
    this._convs[0].buffer = this._irCache.office = impulseResponse(ctx, REVERBS.office);
    this._zone = 'office';

    // Per-bus reverb sends (music and UI stay bone dry).
    const sends = { sfx: 0.3, voice: 0.24, ambience: 0.1 };
    for (const [name, level] of Object.entries(sends)) {
      const s = ctx.createGain();
      s.gain.value = level;
      this.buses[name].connect(s);
      s.connect(this._reverbIn);
    }

    this.music = new MusicBed(ctx, this.buses.music);
    this.ambience = new AmbienceManager({
      playAmbient: (name, pos, opts) => this._playAmbient(name, pos, opts),
    });
    this.ambience.setEnabled(true);

    this._applyVolumes();
    this._applyListener();
  }

  _applyVolumes() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const master = Math.pow(Math.max(0, Math.min(1, settings.get('masterVolume') ?? 0.8)), 1.5);
    this.master.gain.setTargetAtTime(master, t, 0.05);
    const fx = settings.get('effectsVolume') ?? 1;
    const targets = {
      sfx: fx,
      ui: fx,
      ambience: fx * 0.9 * this._stateScale.ambience,
      music: (settings.get('musicVolume') ?? 0.5) * this._stateScale.music,
      voice: settings.get('voiceVolume') ?? 1,
    };
    for (const [name, v] of Object.entries(targets)) {
      this._busBase[name] = Math.max(MIN, v);
      this.buses[name].gain.setTargetAtTime(Math.max(MIN, v), t, 0.05);
    }
  }

  /** Briefly attenuate SFX + ambience under voice lines / announcements. */
  _duck(dur = 1, depth = 0.45) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (const name of ['sfx', 'ambience']) {
      const g = this.buses[name].gain;
      const base = this._busBase[name];
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, MIN), t);
      g.linearRampToValueAtTime(Math.max(base * depth, MIN), t + 0.07);
      g.setValueAtTime(Math.max(base * depth, MIN), t + Math.max(0.1, dur));
      g.linearRampToValueAtTime(Math.max(base, MIN), t + Math.max(0.1, dur) + 0.4);
    }
  }

  // ================================================================== voices

  _resolve(name) {
    if (!name) return null;
    if (SOUNDS.has(name)) return SOUNDS.get(name);
    const alias = SOUND_ALIASES[name];
    if (alias && SOUNDS.has(alias)) return SOUNDS.get(alias);
    // Family fallbacks: a future weapon or surface still makes A sound.
    const m = /^weapon_\w+_(fire_suppressed|fire|tail|reload_start|reload_end|mag_out|mag_in|cycle|draw|inspect)$/.exec(name);
    if (m && SOUNDS.has(`weapon_kd4_${m[1]}`)) return SOUNDS.get(`weapon_kd4_${m[1]}`);
    if (name.startsWith('footstep_')) return SOUNDS.get('footstep_concrete');
    if (name.startsWith('impact_')) return SOUNDS.get('impact_concrete');
    if (name.startsWith('shell_')) return SOUNDS.get('shell_rifle');
    if (name.startsWith('voice_enemy_')) return SOUNDS.get('voice_enemy_investigate');
    if (name.startsWith('voice_hostage_')) return SOUNDS.get('voice_hostage_scared');
    if (!this._unknownWarned.has(name)) {
      this._unknownWarned.add(name);
      console.debug(`[audio] no recipe for "${name}"`);
    }
    return null;
  }

  _dist(pos) {
    if (!pos) return 0;
    return Math.hypot(
      pos[0] - this.listenerPos[0],
      pos[1] - this.listenerPos[1],
      pos[2] - this.listenerPos[2]
    );
  }

  _trigger(rec, opts, pool, cap) {
    const ctx = this.ctx;
    if (ctx.state === 'closed') return null;
    const pos = toArray(opts.position);
    const dist = this._dist(pos);
    if (pos && dist > rec.max) return null;           // inaudible: don't spend a voice
    if (pool.length >= cap && !this._steal(pool, rec.priority)) return null;

    const now = ctx.currentTime;
    const t0 = now + Math.max(0, opts.delay || 0) + 0.012;

    const g = ctx.createGain();
    g.gain.value = Math.max(MIN, opts.volume ?? 1);
    let tail = g;
    let panner = null;
    if (pos) {
      panner = ctx.createPanner();
      panner.panningModel = rec.hrtf && pool.length < 18 ? 'HRTF' : 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = rec.ref;
      panner.maxDistance = Math.min(rec.max, 10000);
      panner.rolloffFactor = rec.rolloff;
      if (panner.positionX) {
        panner.positionX.value = pos[0];
        panner.positionY.value = pos[1];
        panner.positionZ.value = pos[2];
      } else {
        panner.setPosition(pos[0], pos[1], pos[2]);
      }
      g.connect(panner);
      panner.connect(this.buses[rec.bus] || this.buses.sfx);
    } else {
      g.connect(this.buses[rec.bus] || this.buses.sfx);
    }

    const noJitter = rec.bus === 'ui' || rec.bus === 'music';
    const pitch = opts.pitch ?? (noJitter ? 1 : 1 + (Math.random() * 2 - 1) * 0.055);
    const kit = new Kit(ctx, g, t0, { pitch });
    try {
      rec.build(kit, { ...opts, distance: dist });
    } catch {
      try { g.disconnect(); panner?.disconnect(); } catch { /* detached */ }
      return null;
    }

    if (rec.duck) this._duck(Math.min(1.6, kit.end - t0 + 0.2), 0.5);

    const voice = { kit, g, panner, prio: rec.priority, end: kit.end + 0.12, start: t0 };
    pool.push(voice);
    return {
      stop: (fade = 0.15) => {
        const t = ctx.currentTime;
        try {
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(Math.max(g.gain.value, MIN), t);
          g.gain.exponentialRampToValueAtTime(MIN, t + fade);
        } catch { /* context closed */ }
        kit.stopAll(t + fade + 0.02);
        voice.end = Math.min(voice.end, t + fade + 0.1);
      },
    };
  }

  _playAmbient(name, pos, opts = {}) {
    if (!this.ready) return null;
    const rec = this._resolve(name);
    if (!rec) return null;
    return this._trigger(rec, { ...opts, position: pos }, this.ambientVoices, MAX_AMBIENT);
  }

  /** Steal the weakest voice at or below the incoming priority. */
  _steal(pool, incomingPrio) {
    let victim = null;
    for (const v of pool) {
      if (v.prio > incomingPrio) continue;
      if (!victim || v.prio < victim.prio || (v.prio === victim.prio && v.start < victim.start)) victim = v;
    }
    if (!victim) return false;
    this._kill(victim, this.ctx.currentTime, 0.015);
    pool.splice(pool.indexOf(victim), 1);
    return true;
  }

  _kill(v, now, fade = 0.02) {
    try {
      v.g.gain.cancelScheduledValues(now);
      v.g.gain.setValueAtTime(Math.max(v.g.gain.value, MIN), now);
      v.g.gain.exponentialRampToValueAtTime(MIN, now + fade);
    } catch { /* context closed */ }
    v.kit.stopAll(now + fade + 0.01);
    setTimeout(() => {
      try { v.g.disconnect(); v.panner?.disconnect(); } catch { /* detached */ }
    }, (fade + 0.05) * 1000);
  }

  _reap(now) {
    for (const pool of [this.voices, this.ambientVoices]) {
      for (let i = pool.length - 1; i >= 0; i--) {
        const v = pool[i];
        if (now > v.end) {
          try { v.g.disconnect(); v.panner?.disconnect(); } catch { /* detached */ }
          pool.splice(i, 1);
        }
      }
    }
  }

  // ============================================================== event wiring

  _weaponAudio(key) {
    return WEAPON_DEFS[key]?.audio || null;
  }

  _wire() {
    const on = (type, fn) => bus.on(type, (p) => {
      if (!this.ready) return;
      try { fn(p || {}); } catch { /* a bad payload must never break audio */ }
    });

    // ------------------------------------------------------------- weapons
    on(EVT.WEAPON_FIRE, (p) => {
      if (p.melee) {
        this.play(p.mode === 'heavy' ? 'weapon_talon_stab' : 'weapon_talon_slash');
        return;
      }
      this.play(p.audioId, { position: p.position });
      if (p.position) this._noteListenerPos(p.position, p.direction);
      // manual actions cycle right after the shot
      if (p.family === 'shotgun') this.play('weapon_cs12_cycle', { delay: 0.24 });
      else if (p.family === 'sniper') this.play('weapon_hl700_cycle', { delay: 0.3 });
      this._bumpHeat(p.suppressed ? 0.35 : 1);
    });
    on(EVT.WEAPON_DRY, (p) => this.play(p.audioId || 'weapon_dry'));
    on(EVT.WEAPON_RELOAD_START, (p) => {
      const a = this._weaponAudio(p.weapon);
      this.play(a?.reloadStart || 'weapon_kd4_reload_start');
      if (!a?.reloadStart?.includes('cs12')) { // shotgun shells arrive as WEAPON_SHELL inserts
        const dur = p.duration || 2;
        this.play(a?.magOut || 'weapon_kd4_mag_out', { delay: Math.min(0.3, dur * 0.2) });
        this.play(a?.magIn || 'weapon_kd4_mag_in', { delay: Math.max(0.5, dur * 0.55) });
      }
    });
    on(EVT.WEAPON_RELOAD_END, (p) => {
      if (p.cancelled) return;
      this.play(p.audioId || 'weapon_kd4_reload_end');
    });
    on(EVT.WEAPON_SWITCH, (p) => this.play(p.audioId || 'weapon_kd4_draw'));
    on(EVT.WEAPON_SHELL, (p) => {
      if (p.event === 'insert') return void this.play(p.audioId || 'weapon_cs12_mag_in');
      if (p.event !== 'bounce') return; // eject is silent; the bounce sells it
      this.play(p.audioId || `shell_${p.family === 'shotgun' ? 'shotgun' : p.family === 'pistol' || p.family === 'smg' ? 'pistol' : 'rifle'}`,
        { position: p.position, surface: this._lastSurface });
    });
    on('weapon:mode', (p) => this.play(p.audioId || 'weapon_mode_switch'));
    on('weapon:inspect', (p) => this.play(p.audioId || 'weapon_kd4_inspect'));

    // ------------------------------------------------------------- gadgets
    on('gadget:throw', (p) => this.play(p.audioId || 'gadget_throw', { position: p.position }));
    on('gadget:bounce', (p) => this.play(p.audioId || 'gadget_bounce', { position: p.position }));
    on('gadget:flash', (p) => {
      this.play(p.audioId || 'gadget_flash_detonate', { position: p.position });
      const d = this._dist(toArray(p.position));
      const radius = p.radius || 9;
      if (d < radius * 1.5) {
        const near = Math.max(0, 1 - d / (radius * 1.5));
        this.play('gadget_flash_ring', { duration: 0.8 + near * 2.2, volume: 0.4 + near * 0.6 });
        this._duck(0.6 + near * 2.0, 0.2);
      }
      this._bumpHeat(1);
    });
    on('gadget:smoke', (p) => {
      this.play(p.audioId || 'gadget_smoke_pop', { position: p.position });
      const hiss = this._playAmbient(p.hissId || 'gadget_smoke_hiss', toArray(p.position), { duration: Math.min(15, p.duration ?? 13) });
      if (hiss) this._smokeHisses.push(hiss);
    });

    // -------------------------------------------------------------- player
    on(EVT.PLAYER_FOOTSTEP, (p) => {
      const surface = String(p.surface || 'concrete');
      this._lastSurface = surface;
      if (p.position) this._noteListenerPos(p.position);
      const name = SURFACE_TO_STEP[surface] || 'footstep_concrete';
      this.play(name, {
        soft: !!p.crouched,
        speed: p.speed,
        volume: p.crouched ? 0.5 : 1,
      });
      // a hostage in tow shuffles along half a beat later
      if (this._followers > 0 && !p.crouched) {
        this.play(name, { soft: true, volume: 0.32, delay: 0.16 + Math.random() * 0.08 });
      }
    });
    on(EVT.PLAYER_LAND, (p) => this.play('player_land', { impact: p.impact }));
    on(EVT.PLAYER_DAMAGE, (p) => {
      this.play('player_hit', { amount: p.amount });
      if ((p.amount || 0) > 10) this.play('voice_player_hurt', { delay: 0.05 });
    });
    on(EVT.PLAYER_DEATH, () => this.play('player_death'));

    // --------------------------------------------------------------- world
    on(EVT.IMPACT, (p) => {
      const surface = String(p.surface || 'concrete');
      this.play(p.audioId || SURFACE_PROPS[surface]?.sound || 'impact_concrete', { position: p.point });
      const ric = SURFACE_PROPS[surface]?.ricochet || 0;
      if (!p.character && ric > 0 && Math.random() < ric * 0.85) {
        this.play('ricochet', { position: p.point, delay: 0.012 });
      }
      if (surface === 'electronic' && Math.random() < 0.6) {
        this.play('spark', { position: p.point, delay: 0.05 });
      }
    });
    on(EVT.GLASS_BREAK, (p) => {
      const id = p.id || p.pane?.id || 'pane';
      const now = this.ctx.currentTime;
      if (now - (this._glassRecent.get(id) ?? -9) < 0.3) return; // combat + fx both emit
      this._glassRecent.set(id, now);
      this.play('glass_shatter', { position: p.position });
      this.play('glass_fragments', { position: p.position, delay: 0.55 });
    });
    on(EVT.DOOR_STATE, (p) => {
      const door = p.door || { id: p.id, spec: p.door?.spec };
      if (p.shutter) return this._playShutterEvent(p);
      if (p.settled) {
        if (p.state === 'closed') this.playDoor('closed', door);
        return;
      }
      this.playDoor(p.state, door);
    });
    on(EVT.INTERACT, (p) => {
      this.play(p.audioId || 'interact_confirm', p.position ? { position: p.position } : {});
    });
    on('world:noise', (p) => {
      if ((p.loudness ?? 0) > 0.6) this._bumpHeat(0.4);
    });

    // ------------------------------------------------------------------ AI
    on(EVT.ENEMY_FIRE, (p) => {
      const a = this._weaponAudio(p.weapon);
      const id = p.suppressed && a?.fireSuppressed ? a.fireSuppressed : (p.audioId || a?.fire || 'weapon_kd4_fire');
      this.play(id, { position: p.position });
      this._bumpHeat(1);
    });
    on(EVT.ENEMY_VOICE, (p) => this.play(p.audioId || `voice_enemy_${p.line || 'investigate'}`, { position: p.position }));
    on(EVT.ENEMY_DEATH, (p) => this.play(p.audioId || 'enemy_death', { position: p.position }));
    on(EVT.ENEMY_ALERT, () => this._bumpHeat(0.7));

    // ------------------------------------------------------------- hostages
    on(EVT.HOSTAGE_STATE, (p) => {
      const rec = this._hostages.get(p.id) || { next: 0 };
      rec.state = p.state;
      if (p.position) rec.pos = toArray(p.position);
      this._hostages.set(p.id, rec);
      this._followers = Array.from(this._hostages.values()).filter((h) => h.state === 'following').length;
      const pos = rec.pos;
      switch (p.state) {
        case 'securing': this.play('clothing_rustle', { position: pos }); this.play('voice_hostage_scared', { position: pos, volume: 0.7 }); break;
        case 'secured': this.play('voice_hostage_relieved', { position: pos }); this.play('sting_hostage_secured', { delay: 0.3 }); break;
        case 'following': this.play('voice_hostage_follow', { position: pos }); break;
        case 'waiting': this.play('voice_hostage_wait', { position: pos }); break;
        case 'extracted': this.play('voice_hostage_relieved', { position: pos, volume: 0.8 }); this.play('sting_hostage_secured', { delay: 0.2, volume: 0.8 }); break;
        case 'dead': this.play('voice_hostage_death', { position: pos }); break;
        default: break;
      }
    });

    // ---------------------------------------------------- mission / UI shell
    on(EVT.MISSION_START, () => {
      this._seedHostages();
      this._heat = 0;
      this.play('sting_mission_start');
      this.music?.start();
    });
    on(EVT.MISSION_RESET, () => {
      this.stopAll();
      this._seedHostages();
      this._followers = 0;
      this._heat = 0;
    });
    on(EVT.MISSION_END, (p) => {
      this._missionEndAt = this.ctx.currentTime;
      this.music?.stop(1.2);
      this.play(p.outcome === 'victory' || p.victory ? 'sting_victory' : 'sting_defeat', { delay: 0.25 });
    });
    on(EVT.OBJECTIVE_UPDATE, (p) => {
      // _finish() sweeps remaining objectives to done; don't chime over the end sting
      if (this.ctx.currentTime - this._missionEndAt < 1.5) return;
      if (p.state === 'done') this.play('sting_objective_complete');
      else if (p.state === 'failed') this.play('sting_objective_failed');
    });
    on(EVT.ANNOUNCE, (p) => {
      const tone = p.tone === 'danger' ? 'announce_danger' : p.tone === 'alert' ? 'announce_alert' : 'announce_good';
      this.play(tone);
      this._duck(1.1, 0.55);
    });
    on(EVT.GAME_STATE, (p) => this._onGameState(p.state));
    on(EVT.SETTINGS_CHANGED, (p) => {
      this._applyVolumes();
      if (['masterVolume', 'effectsVolume', 'musicVolume', 'voiceVolume'].includes(p.key)) {
        this.play('ui_slider', { value: p.value });
      }
    });

    // UI events double as autoplay unlock gestures.
    bus.on(EVT.UI_NAV, (p) => {
      this.resume();
      if (!this.ready) return;
      const kind = p?.kind || p?.action || 'move';
      if (kind === 'slider') this.play('ui_slider', { value: p?.value });
      else if (kind === 'back') this.play('ui_back');
      else this.play('ui_move');
    });
    bus.on(EVT.UI_CONFIRM, (p) => {
      this.resume();
      if (!this.ready) return;
      const kind = p?.kind || p?.action || 'select';
      this.play(kind === 'deny' ? 'ui_deny' : kind === 'back' ? 'ui_back' : 'ui_select');
    });
  }

  _onGameState(state) {
    this._gameState = state;
    this._playing = state === 'playing';
    if (this._playing) this.resume();
    // Menus keep a faint ambience behind the scrim; pause dips the score.
    // The bus itself must stay open in end states so the victory/defeat
    // stingers (also on the music bus) still sound - the bed stops itself.
    this._stateScale.music = state === 'paused' ? 0.35 : 1;
    this._stateScale.ambience = this._playing ? 1 : state === 'paused' ? 0.5 : 0.35;
    if (this.ready) this._applyVolumes();
    if (!this._playing && (state === 'victory' || state === 'defeat' || state === 'menu' || state === 'title')) {
      this.music?.stop(1.2);
    }
  }

  _playShutterEvent(p) {
    const id = p.id || 'shutter';
    const pos = [23.5, 2, 12.5]; // garage shutter; spec carries no coords
    if (p.settled) {
      this._shutterMotors.get(id)?.stop?.(0.1);
      this._shutterMotors.delete(id);
      this.play('door_shutter_stop', { position: pos });
      return;
    }
    if (p.state === 'opening' || p.state === 'closing') this._playShutter(p.state, id, pos);
  }

  _playShutter(result, id, pos) {
    if (result === 'opening' || result === 'closing') {
      this._shutterMotors.get(id)?.stop?.(0.1);
      const h = this._playAmbient('door_shutter_motor', pos, { duration: 10 });
      if (h) this._shutterMotors.set(id, h);
    } else if (result === 'locked') {
      this.play('door_locked', { position: pos });
    }
  }

  // ================================================================= service

  _startService() {
    if (this._service || typeof setInterval !== 'function') return;
    this._service = setInterval(() => this._tick(), SERVICE_MS);
  }

  _tick() {
    if (!this.ready || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this._reap(now);
    this._autoListener(now);
    this._trackRoom();
    this.ambience?.update(now, this.listenerPos);
    this._hostageWhimpers(now);

    // combat heat cools; the score follows it
    this._heat *= Math.exp(-(SERVICE_MS / 1000) / 7);
    if (this.music) {
      this.music.setTarget(this._playing ? Math.max(0.14, Math.min(1, this._heat)) : 0);
      this.music.update(now);
    }

    // prune stale dedupe entries
    if (this._doorRecent.size > 64) this._doorRecent.clear();
    if (this._glassRecent.size > 64) this._glassRecent.clear();
  }

  _bumpHeat(v) {
    this._heat = Math.min(1.4, this._heat + v * 0.5);
  }

  _noteListenerPos(position, direction = null) {
    // Event-payload fallback: keeps the ears near the player even if nothing
    // ever calls setListener() and no camera handle is discoverable.
    if (this.ctx && this.ctx.currentTime < this._manualListenerUntil) return;
    const p = toArray(position);
    if (p) this.listenerPos = [p[0], p[1] + 1.55, p[2]];
    const d = toArray(direction);
    if (d) this.listenerFwd = d;
    this._applyListener();
  }

  _autoListener(now) {
    if (now < this._manualListenerUntil) return;
    if (!this._gameRef) {
      const g = globalThis.__NORTHSTAR_QA__?.game || globalThis.__NORTHSTAR__?.game
        || globalThis.__northstarGame || globalThis.game;
      if (g?.camera?.matrixWorld?.elements) this._gameRef = g;
    }
    const cam = this._gameRef?.camera;
    if (!cam?.matrixWorld?.elements) return;
    const e = cam.matrixWorld.elements;
    this.listenerPos = [e[12], e[13], e[14]];
    const fl = Math.hypot(e[8], e[9], e[10]) || 1;
    this.listenerFwd = [-e[8] / fl, -e[9] / fl, -e[10] / fl];
    const ul = Math.hypot(e[4], e[5], e[6]) || 1;
    this.listenerUp = [e[4] / ul, e[5] / ul, e[6] / ul];
    this._applyListener();
  }

  _applyListener() {
    if (!this.ready) return;
    const L = this.ctx.listener;
    const t = this.ctx.currentTime;
    const [px, py, pz] = this.listenerPos;
    const [fx, fy, fz] = this.listenerFwd;
    const [ux, uy, uz] = this.listenerUp;
    try {
      if (L.positionX) {
        const tc = 0.045;
        L.positionX.setTargetAtTime(px, t, tc);
        L.positionY.setTargetAtTime(py, t, tc);
        L.positionZ.setTargetAtTime(pz, t, tc);
        L.forwardX.setTargetAtTime(fx, t, tc);
        L.forwardY.setTargetAtTime(fy, t, tc);
        L.forwardZ.setTargetAtTime(fz, t, tc);
        L.upX.setTargetAtTime(ux, t, tc);
        L.upY.setTargetAtTime(uy, t, tc);
        L.upZ.setTargetAtTime(uz, t, tc);
      } else {
        L.setPosition(px, py, pz);
        L.setOrientation(fx, fy, fz, ux, uy, uz);
      }
    } catch { /* some headless builds expose a stub listener */ }
  }

  _trackRoom() {
    const [x, y, z] = this.listenerPos;
    const floor = floorForY(y);
    const room = roomAt(x, z, floor) || roomAt(x, z, floor === 'upper' ? 'ground' : 'upper');
    if (!room) return this.setRoomZone('outdoor');
    this.setRoomZone(ZONE_TO_REVERB[room.id] ? room.id : room.zone);
  }

  // -------------------------------------------------- bound-hostage presence

  _seedHostages() {
    for (const h of HOSTAGE_POINTS) {
      this._hostages.set(h.id, {
        pos: [h.pos[0], h.pos[1] + 1.1, h.pos[2]],
        state: 'bound',
        next: 0,
      });
    }
  }

  /** Fear breathing / sobs from bound hostages the player is close to. */
  _hostageWhimpers(now) {
    if (!this._playing) return;
    for (const h of this._hostages.values()) {
      if (h.state !== 'bound' && h.state !== 'securing') continue;
      if (!h.pos || this._dist(h.pos) > 13) continue;
      if (now < h.next) continue;
      h.next = now + 4 + Math.random() * 5;
      this.play(Math.random() < 0.55 ? 'voice_hostage_sob' : 'voice_hostage_breathing', {
        position: h.pos,
        volume: 0.8,
      });
    }
  }
}
