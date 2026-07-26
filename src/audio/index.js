import * as THREE from 'three';
import { randRange } from '../core/rand.js';
import { SynthKit } from './synth.js';
import { Ambience } from './ambience.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const MASTER = 0.9;
const MUFFLE_OPEN = 19500;   // Hz — transparent
const MUFFLE_FLOOR = 420;    // Hz — full "hit muffle"
// note: WebAudio compressors add makeup gain, lifting quiet material —
// the ambience bus sits low so the bed stays well under combat sfx
const BUS_LEVEL = { sfx: 0.85, heavy: 0.95, amb: 0.35, ui: 0.75 };
// play() routes by name; everything else defaults to the sfx bus.
const NAME_BUS = {
  hitmarker: 'ui', headshot: 'ui', streak_ready: 'ui', message: 'ui',
  radio_call: 'ui', heartbeat: 'ui', jet: 'heavy', explosion: 'heavy',
};

/**
 * Procedural audio engine (no audio files). API:
 *   audio.play(name, { volume, rate })            — 2D UI/player sounds
 *   audio.at(position, name, { volume, rate })    — 3D positional (distance-filtered)
 *   audio.setAmbience(on)
 *   audio.update(dt)                              — listener sync + schedulers
 *   audio.muted                                   — harness sets true (graph still runs, gain 0)
 *
 * Mix: buses (sfx / heavy / amb / ui) -> damage-muffle lowpass ->
 *      DynamicsCompressor -> master(mute) gain -> destination.
 * The 'heavy' bus (explosions, jets) has its own glue compressor so chained
 * airstrike bombs stack without clipping; rapid explosions also self-attenuate.
 *
 * Sounds: shot_rifle, shot_pistol, shot_distant, explosion, reload, switch,
 * throw, footstep, slide, jump, land, hitmarker, headshot, streak_ready,
 * hurt, death_hit, heartbeat, message, radio_call, jet, whistle, click,
 * empty, artillery, pop_far, siren, gust
 */
export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.kit = null;
    this.buses = null;
    this._muted = false;
    this._pendingAmbience = true;
    this._boomHeat = 0;        // recent-explosion pressure, attenuates stacks
    this._dead = false;
    this._hbT = 0;             // heartbeat timer while dead
    this._reloadVoice = null;
    this._fwd = new THREE.Vector3();
    this.ambience = new Ambience(this);
    this._wire(game.events);
  }

  get muted() { return this._muted; }
  set muted(v) {
    this._muted = !!v;
    if (this.masterOut) this.masterOut.gain.value = this._muted ? 0 : MASTER;
  }

  _wire(ev) {
    ev.on('game:start', () => this._init());

    // -- weapons ------------------------------------------------------------
    ev.on('weapon:fire', ({ weapon }) =>
      this.play(weapon?.type === 'pistol' ? 'shot_pistol' : 'shot_rifle',
        { volume: 0.8, rate: randRange(0.96, 1.04) }));
    ev.on('weapon:reload', ({ weapon }) => {
      this._reloadVoice?.stop();
      this._reloadVoice = this._spawn('reload', 'sfx', { volume: 0.62, dur: weapon?.reloadTime ?? 2.1 });
    });
    ev.on('weapon:switch', () => {
      this._reloadVoice?.stop();
      this.play('switch', { volume: 0.55, rate: randRange(0.97, 1.03) });
    });
    ev.on('weapon:grenade', () => this.play('throw', { volume: 0.5 }));

    // -- combat ---------------------------------------------------------------
    ev.on('explosion', ({ position }) => {
      const vol = 0.95 / (1 + this._boomHeat * 0.55);
      this._boomHeat = Math.min(5, this._boomHeat + 1);
      if (position) this.at(position, 'explosion', { volume: vol });
      else this.play('explosion', { volume: vol });
      this._duckBus('amb', 0.3, 0.5, 0.9);   // let the boom own the frame
      this._duckBus('sfx', 0.55, 0.12, 0.45);
    });
    ev.on('enemy:fire', ({ position }) => {
      if (position) this.at(position, 'shot_distant', { volume: 0.55, rate: randRange(0.94, 1.06) });
    });

    // -- player ---------------------------------------------------------------
    ev.on('player:footstep', ({ surface, sprint }) => {
      if (surface === 'slide') this.play('slide', { volume: 0.5 });
      else if (surface === 'jump') this.play('jump', { volume: 0.34 });
      else this.play('footstep', { volume: sprint ? 0.34 : 0.2, rate: randRange(0.92, 1.08) * (sprint ? 1.05 : 1) });
    });
    ev.on('player:land', ({ velocity }) => this.play('land', { volume: 0.65, velocity }));
    ev.on('player:damage', ({ amount = 10 }) => {
      this.play('hurt', { volume: clamp(0.4 + amount * 0.012, 0.4, 0.85), rate: randRange(0.94, 1.06) });
      this._muffle(clamp(0.35 + amount * 0.012, 0.35, 0.85), 0.06, 0.2);
    });
    ev.on('player:death', () => {
      this._dead = true;
      this._hbT = 0.5;
      this._reloadVoice?.stop();
      this.play('death_hit', { volume: 0.9 });
      this._muffle(1, -1); // hold until respawn
    });
    ev.on('player:respawn', () => {
      this._dead = false;
      this._muffleRelease();
    });

    // -- UI / streaks -----------------------------------------------------------
    ev.on('ui:hitmarker', ({ headshot, kill }) => {
      if (headshot || kill) this.play('headshot', { volume: 0.5, headshot });
      else this.play('hitmarker', { volume: 0.42 });
    });
    ev.on('killstreak:ready', () => this.play('streak_ready', { volume: 0.5 }));
    ev.on('ui:message', () => this.play('message', { volume: 0.4 }));
    ev.on('airstrike:called', () => this.play('radio_call', { volume: 0.55 }));
    ev.on('airstrike:incoming', () => this.play('jet', { volume: 0.9 }));
  }

  _init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    ctx.resume?.()?.catch?.(() => {});
    this.ctx = ctx;
    this.kit = new SynthKit(ctx);

    // master chain: muffle -> compressor -> master(mute) -> destination
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = MUFFLE_OPEN;
    this.muffle.Q.value = 0.4;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;

    this.masterOut = ctx.createGain();
    this.masterOut.gain.value = this._muted ? 0 : MASTER;

    this.muffle.connect(comp);
    comp.connect(this.masterOut);
    this.masterOut.connect(ctx.destination);

    const mkBus = (level, dest) => {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(dest);
      return g;
    };
    // heavy bus gets its own fast glue compressor before the muffle
    const heavyComp = ctx.createDynamicsCompressor();
    heavyComp.threshold.value = -14;
    heavyComp.knee.value = 10;
    heavyComp.ratio.value = 8;
    heavyComp.attack.value = 0.003;
    heavyComp.release.value = 0.28;
    heavyComp.connect(this.muffle);

    this.buses = {
      sfx: mkBus(BUS_LEVEL.sfx, this.muffle),
      amb: mkBus(BUS_LEVEL.amb, this.muffle),
      ui: mkBus(BUS_LEVEL.ui, this.muffle),
      heavy: mkBus(BUS_LEVEL.heavy, heavyComp),
    };

    if (this._pendingAmbience) this.ambience.start();
  }

  _spawn(name, bus, opts = {}) {
    if (!this.ctx) return null;
    return this.kit.spawn(name, this.buses[bus] ?? this.buses.sfx, opts);
  }

  /** 2D sound (UI / own weapon / body). Runs even when muted (gain 0). */
  play(name, opts = {}) {
    return this._spawn(name, NAME_BUS[name] ?? 'sfx', opts);
  }

  /** 3D positional sound with distance-based lowpass + echo hints. */
  at(position, name, opts = {}) {
    if (!this.ctx || !position) return null;
    return this._at3d(position, name, opts, {
      ref: 7, roll: 0.95, hrtf: true, bus: NAME_BUS[name] ?? 'sfx',
    });
  }

  /** Shared positional spawner (ambience uses gentler rolloff, equalpower). */
  _at3d(position, name, opts, { ref, roll, hrtf, bus }) {
    const ctx = this.ctx;
    if (!ctx) return null;
    const cam = this.game.camera;
    const d = cam
      ? Math.hypot(cam.position.x - position.x, cam.position.y - position.y, cam.position.z - position.z)
      : 30;
    const pan = ctx.createPanner();
    pan.panningModel = hrtf ? 'HRTF' : 'equalpower';
    pan.distanceModel = 'inverse';
    pan.refDistance = ref;
    pan.rolloffFactor = roll;
    pan.maxDistance = 600;
    if (pan.positionX) {
      pan.positionX.value = position.x;
      pan.positionY.value = position.y;
      pan.positionZ.value = position.z;
    } else {
      pan.setPosition(position.x, position.y, position.z);
    }
    // air absorption: far sounds lose their highs (virtualDist lets ambience
    // fake "beyond the map" sources)
    const vd = opts.virtualDist ?? d;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.4;
    lp.frequency.value = clamp(20000 * Math.exp(-vd / 55), 400, 20000);
    pan.connect(lp);
    lp.connect(this.buses[bus] ?? this.buses.sfx);
    return this.kit.spawn(name, pan, { ...opts, dist: vd });
  }

  setAmbience(on) {
    this._pendingAmbience = on;
    if (!this.ctx) return;
    if (on) this.ambience.start();
    else this.ambience.stop();
  }

  /** Momentary dip of a bus (sidechain feel for explosions). */
  _duckBus(bus, dip, hold, tau) {
    if (!this.ctx) return;
    const g = this.buses[bus].gain;
    const base = BUS_LEVEL[bus];
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(base * dip, now, 0.02);
    g.setTargetAtTime(base, now + hold, tau);
  }

  /** COD hit-muffle: slam the master lowpass down, recover after `hold`.
   *  hold < 0 keeps it down (death) until _muffleRelease(). */
  _muffle(strength, hold = 0.06, tau = 0.2) {
    if (!this.ctx) return;
    const f = this.muffle.frequency;
    const now = this.ctx.currentTime;
    const target = MUFFLE_OPEN * Math.pow(MUFFLE_FLOOR / MUFFLE_OPEN, clamp(strength, 0, 1));
    f.cancelScheduledValues(now);
    f.setTargetAtTime(Math.min(f.value, target), now, 0.01);
    if (hold >= 0) f.setTargetAtTime(MUFFLE_OPEN, now + hold, tau);
  }

  _muffleRelease(tau = 0.3) {
    if (!this.ctx) return;
    const f = this.muffle.frequency;
    const now = this.ctx.currentTime;
    f.cancelScheduledValues(now);
    f.setTargetAtTime(MUFFLE_OPEN, now, tau);
  }

  update(dt) {
    if (!this.ctx) return;
    this._boomHeat = Math.max(0, this._boomHeat - dt * 1.1);

    // slow heartbeat while dead
    if (this._dead && dt > 0) {
      this._hbT -= dt;
      if (this._hbT <= 0) {
        this._hbT = 1.15;
        this.play('heartbeat', { volume: 0.6 });
      }
    }

    this.ambience.update(dt);

    // sync listener to camera
    const cam = this.game.camera;
    const l = this.ctx.listener;
    const p = cam.position;
    const f = cam.getWorldDirection(this._fwd);
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else if (l.setPosition) {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }
}
