// Orbital Beam: a Death Star style battle station appears far away in a corner of the sky and glides down toward
// its firing position while the villagers stop and stare ("what's that in the sky?"). It charges: thin green
// tributary beams ignite one after another from the dish rim and converge on a pulsating focus ball; the town
// panics. Then the main green beam shoots along the aim line - a long diagonal from the corner of the sky to
// the town - and the ground floods with destruction: a crater is eaten under the beam while a shock front races
// outward across the town, stripping roofs, throwing debris, scorching the ground and knocking everyone over.
// Afterwards the beam fades, the station goes dark and departs, smoke lingers and the glowing crater remains
// until the area is restored.
//
// Simulation (simulate) only uses this.rng, this.tick and the world; every visual (render) may be random.
import * as THREE from 'three';
import { Disaster } from './base.js';
import { BLOCKS, B, SHAPE } from '../blocks.js';
import { CLOUD_HEIGHT, TOWN_GROUND } from '../constants.js';
import { BattleStation, STATION_RADIUS } from './beam/stationStub.js';
import { BeamMesh, MAX_TRIBUTARIES } from './beam/beamMesh.js';
import { MotePool } from './beam/motes.js';
import { RingSet } from './beam/rings.js';
import { CraterPlan, WavePlan, CRATER_RIM_WIDTH } from './beam/crater.js';
import { PreviewGuide } from './beam/guide.js';

const ARRIVE_DIST = 330, ARRIVE_Y = 400;   // where the station is first seen: horizontal distance from the target, altitude
const FIRE_DIST = 170, FIRE_Y = 215;       // firing position (the station's underside stays well above the cloud layer)
const FADE_IN_S = 3;                       // station fades in over the first seconds of the approach
const DESCENT_MIN_S = 1.2, DESCENT_MAX_S = 2.5; // fire stroke duration (by intensity)
const FADE_TICKS = 30;            // beam fade-out after firing (1.5 s)
const LINGER_TICKS = 200;         // smoke lingers after the beam is gone (10 s)
const STOP_TICKS = 120;           // cancel: retract, power down, drift off (6 s)
// The crater is carved in bursts (every CARVE_EVERY ticks) rather than every tick: every carving tick touches all
// chunks under the current radius and each touched chunk costs a full relight + 3x3 remesh, so 5 Hz bursts cut
// the engine's relight/remesh work ~4x while still reading as continuous "eating". The edit budget is per tick,
// so a burst may leave work for the next one (the plan is resumable). The wave runs every tick and shares the
// budget: on burst ticks the crater leaves WAVE_RESERVE edits for it.
const CARVE_EVERY = 4;
const WAVE_RESERVE = 150;
const WAVE_SPEED = 18;            // average front speed (blocks/s); the front starts ~2x faster and eases out
const MAX_DEBRIS_PER_BURST = 24;  // crater debris (~6 blocks per tick on average)
const MAX_WAVE_DEBRIS_PER_TICK = 10;
const SMOKE_CAP = 2400;           // never push the shared particle pool above this
const SPARK_CAP = 1300;
const TRIB_START = 0.2;           // tributaries start igniting at this fraction of the charge...
const TRIB_GAP_S = 0.5;           // ...one after another
const TRIB_ZAP_S = 0.35;          // time for a tributary to shoot from the rim into the focus
const ALERT_AT = 0.7;             // fraction of the charge at which the villagers panic

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 2.5);

export class OrbitalBeam extends Disaster {
  static type = 'beam';
  static label = 'Orbital Beam';
  static description = 'A battle station appears in a corner of the sky, charges four green tributary beams into a pulsing focus, then fires a giant beam: crater plus a wave of destruction.';
  static schema = [
    { key: 'target', label: 'Target (x, z)', type: 'position', default: [0, 0] },
    { key: 'beamRadius', label: 'Beam radius', type: 'number', min: 1, max: 14, step: 0.5, default: 5, unit: 'blocks' },
    { key: 'approachTime', label: 'Approach time', type: 'number', min: 4, max: 40, step: 1, default: 14, unit: 's' },
    { key: 'chargeTime', label: 'Charge time', type: 'number', min: 2, max: 40, step: 1, default: 10, unit: 's' },
    { key: 'tributaries', label: 'Tributary beams', type: 'number', min: 1, max: MAX_TRIBUTARIES, step: 1, default: 4 },
    { key: 'stationBearing', label: 'Station bearing', type: 'angle', min: 0, max: 360, step: 5, default: 225, unit: '°' },
    { key: 'strength', label: 'Impact strength', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
    { key: 'destructionRadius', label: 'Destruction radius', type: 'number', min: 3, max: 60, step: 1, default: 28, unit: 'blocks' },
    { key: 'waveRadius', label: 'Wave radius', type: 'number', min: 10, max: 140, step: 2, default: 62, unit: 'blocks' },
    { key: 'duration', label: 'Beam duration', type: 'number', min: 3, max: 90, step: 1, default: 22, unit: 's' },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
  ];

  constructor(manager, params, seed) {
    super(manager, params, seed);
    const p = this.params;
    this.cx = Math.floor(p.target[0]) + 0.5;
    this.cz = Math.floor(p.target[1]) + 0.5;
    const gy = this.world.surfaceY(Math.floor(this.cx), Math.floor(this.cz));
    this.groundY = gy >= 0 ? gy : TOWN_GROUND;
    this.impactY = this.groundY + 1;
    this.impact = new THREE.Vector3(this.cx, this.impactY, this.cz);
    this.R = p.destructionRadius;
    this.D = Math.max(1, p.strength * this.R * 0.55);
    this.waveR = Math.max(p.waveRadius, this.R + CRATER_RIM_WIDTH + 4);
    this.nTrib = Math.max(1, Math.min(MAX_TRIBUTARIES, Math.round(p.tributaries)));
    // station geometry: compass bearing (0 = north/-z, 90 = east/+x) from the target to where the station appears
    const br = (p.stationBearing * Math.PI) / 180;
    this.bx = Math.sin(br); this.bz = -Math.cos(br);
    this.arrivePos = new THREE.Vector3(this.cx + this.bx * ARRIVE_DIST, ARRIVE_Y, this.cz + this.bz * ARRIVE_DIST);
    this.firePos = new THREE.Vector3(this.cx + this.bx * FIRE_DIST, FIRE_Y, this.cz + this.bz * FIRE_DIST);
    // timeline (ticks)
    this.TA = Math.round(p.approachTime * 20);
    this.T1 = this.TA + Math.round(p.chargeTime * 20);
    this.descentTicks = Math.round((DESCENT_MAX_S - (DESCENT_MAX_S - DESCENT_MIN_S) * p.intensity) * 20);
    this.T2 = this.T1 + this.descentTicks;
    this.T3 = this.T2 + this.durationTicks;
    this.T4 = this.T3 + FADE_TICKS + LINGER_TICKS;
    this.alertTick = this.TA + Math.round(ALERT_AT * (this.T1 - this.TA));
    this.carveTicks = Math.max(20, Math.round(0.5 * this.durationTicks));
    this.waveTicks = Math.max(40, Math.min(160, Math.round((this.waveR / WAVE_SPEED) * 20)));
    // simulation state
    this.crater = null; this.wave = null;
    this.centerFloor = this.impactY;
    this.prevCenterFloor = this.impactY;
    this.currentRadius = 0;
    this.debrisThisTick = 0; this.waveDebrisThisTick = 0;
    this.burstTick = this.T2;
    this.prevFront = 0; this.frontTick = this.T2; this.waveDoneTick = -1;
    this.bandLo = 0; this.bandHi = 0;
    this.lastRumbleTick = -1;
    this.stopTick = -1;
    this.stopHead = 0; this.stopIntensity = 0; this.stopPower = 0; this.stopSphere = 0; this.stopTrib = 0; this.stopCharge = 0;
    // visuals
    this.station = null; this.beam = null; this.motes = null; this.rings = null; this.guide = null;
    this.visTime = 0; this.pulsePhase = 0;
    this.lastHead = 0; this.lastIntensity = 0; this.lastPower = 0; this.lastSphere = 0; this.lastTrib = 0; this.lastCharge = 0;
    this.sparkBurst = false; this.waveWhoosh = false;
    this.smokeAcc = 0; this.sparkAcc = 0; this.moteAcc = 0; this.dustAcc = 0;
    this.humLoop = false; this.chargeLoop = false; this.roarLoop = false;
    this.tribZapped = new Uint8Array(MAX_TRIBUTARIES);
    this.stationPos = new THREE.Vector3().copy(this.arrivePos);
    this.aim = new THREE.Vector3(0, -1, 0);
    this.focus = new THREE.Vector3(this.cx, FIRE_Y, this.cz);
    this.beamEnd = new THREE.Vector3(this.cx, this.impactY, this.cz);
    this.rimPts = [];
    this.stationState = { power: 0, heat: 0, charge: 0, firing: 0, alpha: 0, time: 0 };
    this._v = new THREE.Vector3();
    this._pos = { x: this.cx, y: this.impactY, z: this.cz };
    this._warnCache = null;
    // hooks bound once (no per-tick closures)
    this._onRemove = (x, y, z, id, d, rNow) => this.spawnDebris(x, y, z, id, d, rNow);
    this._onWaveRemove = (x, y, z, id, d, power) => this.spawnWaveDebris(x, y, z, id, d, power);
    this._forceFn = (i, out) => this.blastForce(i, out);
    this._flingNpc = (npc, d) => this.fling(this.game.npcs, npc, d, this.params.beamRadius * 1.6, 16);
    this._flingAnimal = (a, d) => this.fling(this.game.animals, a, d, this.params.beamRadius * 1.6, 14);
    this._blastNpc = (npc, d) => this.fling(this.game.npcs, npc, d, this.R * 1.2, 22);
    this._blastAnimal = (a, d) => this.fling(this.game.animals, a, d, this.R * 1.2, 20);
    this._waveNpc = (npc, d) => this.waveHit(this.game.npcs, npc, d, 1);
    this._waveAnimal = (a, d) => this.waveHit(this.game.animals, a, d, 0.85);
  }

  get progress() { return Math.min(1, this.tick / Math.max(1, this.T4)); }
  get phase() {
    if (this.stopping) return 'cancel';
    const t = this.tick;
    return t < this.TA ? 'arrival' : t < this.T1 ? 'charge' : t < this.T2 ? 'fire' : t < this.T3 ? 'impact' : t < this.T4 ? 'aftermath' : 'done';
  }

  warnings() {
    if (!this._warnCache) {
      const plan = this.crater || new CraterPlan(this.m, this.cx, this.cz, this.R, this.D, this.groundY, this.seed);
      const n = plan.estimateRemoved();
      const wave = this.wave || new WavePlan(this.m, this.cx, this.cz, this.params.beamRadius * 1.5, this.R, this.waveR, this.groundY, this.seed, this.params.strength);
      const w = wave.estimate();
      this._warnCache = [
        `Vaporizes ~${n} blocks of terrain and buildings within ${this.R} blocks of (${Math.floor(this.cx)}, ${Math.floor(this.cz)}); crater ~${Math.round(this.D)} deep.`,
        `Shock wave out to ${Math.round(this.waveR)} blocks: strips roofs, fences and glass (~${w.thrown} blocks thrown) and scorches ~${w.scorched} blocks of ground.`,
        `Lethal blast for anyone within ${this.R} blocks of the impact point; the wave knocks everyone over out to ${Math.round(this.waveR)}.`,
      ];
    }
    return this._warnCache;
  }

  // ---------------------------------------------------------------- lifecycle
  begin() {
    this.crater = new CraterPlan(this.m, this.cx, this.cz, this.R, this.D, this.groundY, this.seed);
    this.crater.onRemove = this._onRemove;
    this.wave = new WavePlan(this.m, this.cx, this.cz, this.params.beamRadius * 1.5, this.R, this.waveR, this.groundY, this.seed, this.params.strength);
    this.wave.onRemove = this._onWaveRemove;
    this.createVisuals();
    // the villagers notice the thing in the sky (no panic yet); the watch point follows the station (see simulate)
    if (this.game.npcs) this.game.npcs.watch(this.stationAt(this.TA / 40, this._v), { duration: this.params.approachTime + this.params.chargeTime + 2, lines: 'sky' });
    this.m.effects.setEnvironment({ tint: [0.93, 0.97, 1.05] });
    this.m.say('Something huge is descending from the sky...');
  }

  beginPreview() {
    this.rings = new RingSet(this.game.scene);
    this.rings.setCenter(this.cx, this.cz);
    const f1 = this.approxFocus(this.firePos, new THREE.Vector3()), f0 = this.approxFocus(this.arrivePos, new THREE.Vector3());
    this.guide = new PreviewGuide(this.game.scene, [
      { a: this.impact, b: f1, brightness: 1, radius: 0.16 },
      { a: f1, b: f0, brightness: 0.35, radius: 0.12 },
    ]);
  }

  createVisuals() {
    const scene = this.game.scene;
    this.station = new BattleStation(scene, { radius: STATION_RADIUS });
    this.beam = new BeamMesh(scene, this.params.beamRadius);
    this.motes = new MotePool(scene, 1500);
    this.rings = new RingSet(scene);
    this.rings.setCenter(this.cx, this.cz);
  }

  stop() {
    if (this.stopping) return;
    this.stopping = true;
    this.stopTick = this.tick;
    this.stopHead = this.lastHead; this.stopIntensity = this.lastIntensity; this.stopPower = this.lastPower; this.stopSphere = this.lastSphere;
    this.stopTrib = this.lastTrib; this.stopCharge = this.lastCharge;
    this.m.debris.forceFn = null;
    this.m.effects.reset();
    if (this.game.npcs) this.game.npcs.clearWatch();
    this.stopLoops();
  }

  dispose() {
    for (const v of [this.station, this.beam, this.motes, this.rings, this.guide]) if (v) v.dispose();
    this.station = this.beam = this.motes = this.rings = this.guide = null;
    this.stopLoops();
    if (this.m.debris.forceFn === this._forceFn) this.m.debris.forceFn = null;
    this.m.effects.reset();
    if (this.game.npcs) this.game.npcs.clearWatch();
  }

  stopLoops() {
    const audio = this.game.audio;
    if (this.humLoop) { audio.loopStop('beamHum', 1.5); this.humLoop = false; }
    if (this.chargeLoop) { audio.loopStop('beamCharge', 0.8); this.chargeLoop = false; }
    if (this.roarLoop) { audio.loopStop('beamRoar', 1.2); this.roarLoop = false; }
  }

  // ---------------------------------------------------------------- geometry helpers (pure functions of time)
  // Station centre at `tSec` seconds after start: glides from the arrival point to the firing position with an
  // ease-out, then holds. (Departure / cancel offsets are added by render().)
  stationAt(tSec, out) {
    const tA = this.TA / 20;
    if (tSec < tA) out.lerpVectors(this.arrivePos, this.firePos, easeOut(tSec / tA));
    else out.copy(this.firePos);
    return out;
  }
  // Where the focus point would be for a station at `pos` (preview guide; the live value comes from the station)
  approxFocus(pos, out) {
    out.copy(this.impact).sub(pos).normalize().multiplyScalar(STATION_RADIUS * 1.19).add(pos);
    return out;
  }

  // ---------------------------------------------------------------- deterministic simulation (20 TPS)
  simulate() {
    const t = this.tick;
    if (this.stopping) { if (t - this.stopTick >= STOP_TICKS) this.done = true; return; }
    if (t < this.T1) {
      // the watchers' heads follow the descending station
      const npcs = this.game.npcs;
      if (npcs && npcs.watchInfo && (t & 3) === 0) { const p = this.stationAt(t / 20, this._v); npcs.watchInfo.x = p.x; npcs.watchInfo.y = p.y; npcs.watchInfo.z = p.z; }
    }
    if (t === this.TA) this.m.effects.setEnvironment({ tint: [0.88, 0.98, 0.98], skyLightMul: 0.94 });
    if (t === this.alertTick) this.onAlert();
    if (t === this.T1) this.onFire();
    if (t === this.T2) this.onImpact();
    if (t >= this.T2 && t < this.T3) this.fireTick(t);
    if (t === this.T3) this.onCease();
    if (t >= this.T4) this.done = true;
  }

  onAlert() {
    const alert = { kind: 'beam', x: this.cx, z: this.cz, radius: 160, awayRadius: this.waveR + 12 };
    if (this.game.npcs) this.game.npcs.alert(alert);
    if (this.game.animals) this.game.animals.alert(alert);
    this.m.say('The villagers are running for their lives!');
  }

  onFire() {
    const fx = this.m.effects;
    fx.flash(0.35, 0.5, [0.75, 1, 0.8]);
    fx.setEnvironment({ tint: [0.9, 1.02, 0.92], skyLightMul: 0.92 });
    this.game.audio.boom({ x: this.firePos.x, y: this.firePos.y, z: this.firePos.z }, 1.6);
    if (this.game.npcs) this.game.npcs.clearWatch();
  }

  onImpact() {
    const fx = this.m.effects, pl = this.game.player;
    const dx = pl.pos.x - this.cx, dz = pl.pos.z - this.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    fx.flash(1.2, 0.6, [0.85, 1, 0.9]);
    fx.shake(1.0 * Math.max(0, 1 - dist / 220));
    fx.setEnvironment({ tint: [1.03, 0.99, 0.94], skyLightMul: 1, fogNearMul: 0.85 });
    this.game.audio.boom(this._pos, 2.5);
    this.game.audio.rumble(this._pos, 1);
    const nx = dist > 0.01 ? dx / dist : 1, nz = dist > 0.01 ? dz / dist : 0;
    if (dist < this.R) { pl.damage(12); pl.impulse(nx * 24, 15, nz * 24); }
    if (this.game.npcs) this.game.npcs.eachNear(this.cx, this.cz, this.R * 1.2, this._blastNpc);
    if (this.game.animals) this.game.animals.eachNear(this.cx, this.cz, this.R * 1.2, this._blastAnimal);
    this.m.debris.forceFn = this._forceFn;
    this.prevFront = this.wave.front;
    this.m.say('Orbital beam impact!');
  }

  onCease() {
    this.m.effects.reset();
    if (this.m.debris.forceFn === this._forceFn) this.m.debris.forceFn = null;
  }

  fireTick(t) {
    const u = t - this.T2;
    const burst = u % CARVE_EVERY === 0;
    const waveActive = !this.wave.done;
    if (burst) {
      const f = clamp01(u / this.carveTicks);
      this.currentRadius = this.R * Math.pow(f, 0.7);
      this.debrisThisTick = 0;
      this.crater.step(f, waveActive ? WAVE_RESERVE : 0);
      this.burstTick = t;
      this.prevCenterFloor = this.centerFloor;
      this.centerFloor = this.crater.top[0] + 1;
    }
    if (waveActive) {
      // the shock front: fast at first, easing out toward the wave radius; the plan follows within the budget
      const tau = clamp01(u / this.waveTicks);
      const rTarget = this.waveR * (1 - (1 - tau) * (1 - tau));
      this.prevFront = this.wave.front;
      this.waveDebrisThisTick = 0;
      if (this.wave.step(rTarget, 0)) this.waveDoneTick = t;
      this.frontTick = t;
      this.waveBand(this.prevFront, this.wave.front);
    }
    // people and animals caught in the column are hurled out; the player burns and is thrown
    const pl = this.game.player;
    const dx = pl.pos.x - this.cx, dz = pl.pos.z - this.cz;
    const d2 = dx * dx + dz * dz;
    if (t % 10 === 0) {
      const br = this.params.beamRadius * 1.3;
      if (d2 < br * br && pl.pos.y < FIRE_Y) { pl.damage(2); pl.impulse((dx / Math.max(0.5, Math.sqrt(d2))) * 6, 9, (dz / Math.max(0.5, Math.sqrt(d2))) * 6); }
      if (this.game.npcs) this.game.npcs.eachNear(this.cx, this.cz, this.params.beamRadius * 1.6, this._flingNpc);
      if (this.game.animals) this.game.animals.eachNear(this.cx, this.cz, this.params.beamRadius * 1.6, this._flingAnimal);
    }
    const wr = this.R * 1.5;
    if (d2 < wr * wr && d2 > 0.25) { const d = Math.sqrt(d2), k = 14 * (1 - d / wr); pl.addForce((dx / d) * k, 0, (dz / d) * k); }
    if ((t & 1) === 0) { const d = Math.sqrt(d2); this.m.effects.shake(0.16 * Math.max(0, 1 - d / 150) * (0.6 + 0.4 * this.params.intensity)); }
    if (t % 45 === 0) this.game.audio.rumble(this._pos, 0.5);
  }

  // Everyone the front passed this tick (distance in (lo, hi]) is knocked over; the player is shoved and hurt.
  waveBand(lo, hi) {
    if (hi <= lo) return;
    this.bandLo = lo; this.bandHi = hi;
    if (this.game.npcs) this.game.npcs.eachNear(this.cx, this.cz, hi + 1.5, this._waveNpc);
    if (this.game.animals) this.game.animals.eachNear(this.cx, this.cz, hi + 1.5, this._waveAnimal);
    const pl = this.game.player;
    const dx = pl.pos.x - this.cx, dz = pl.pos.z - this.cz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > lo && d <= hi + 1.5 && d >= this.R * 0.8) {
      const k = 1 - clamp01((d - this.R) / (this.waveR - this.R));
      const nx = d > 0.01 ? dx / d : 1, nz = d > 0.01 ? dz / d : 0;
      pl.damage(Math.round(1 + 4 * k));
      pl.impulse(nx * (8 + 12 * k), 5 + 6 * k, nz * (8 + 12 * k));
      this.m.effects.shake(0.5 + 0.5 * k, 2);
    }
  }
  waveHit(mgr, e, d, scale) {
    if (d <= this.bandLo || d < this.R * 0.8) return;
    const k = 1 - clamp01((d - this.R) / (this.waveR - this.R));
    const dx = e.pos.x - this.cx, dz = e.pos.z - this.cz;
    const dd = Math.max(0.5, Math.sqrt(dx * dx + dz * dz));
    if (k > 0.45) mgr.sweep(e.pos.x, e.pos.z, 0.6, dx / dd, dz / dd, (8 + 12 * k) * scale); // near ring: tumble through the air
    else mgr.applyImpulse(e, (dx / dd) * (5 + 10 * k) * scale, (3 + 5 * k) * scale, (dz / dd) * (5 + 10 * k) * scale); // farther: shoved
  }

  fling(mgr, e, d, radius, speed) {
    const dx = e.pos.x - this.cx, dz = e.pos.z - this.cz;
    const dd = Math.max(0.5, Math.sqrt(dx * dx + dz * dz));
    const k = Math.max(0.25, 1 - d / radius);
    mgr.applyImpulse(e, (dx / dd) * speed * k, 8 + 10 * k, (dz / dd) * speed * k);
  }

  // Cosmetic debris for blocks removed near the current crater edge (rng use is deterministic, capped per tick).
  spawnDebris(x, y, z, id, d, rNow) {
    if (this.debrisThisTick >= MAX_DEBRIS_PER_BURST) return;
    const edge = rNow - d;
    if (edge > 3.5 && y <= this.groundY) return; // deep interior: vaporised silently
    // first contact throws almost everything it touches; later only the crater edge sheds blocks
    const p = (this.tick - this.T2 < 30 ? 0.95 : edge > 3.5 ? 0.12 : 0.42) * (0.5 + 0.5 * this.params.intensity);
    if (this.rng.next() >= p) return;
    this.debrisThisTick++;
    const dx = x + 0.5 - this.cx, dz = z + 0.5 - this.cz;
    const dd = Math.max(0.5, Math.sqrt(dx * dx + dz * dz));
    const sp = 9 + this.rng.next() * 13, up = 11 + this.rng.next() * 13;
    this.throwBlock(x, y, z, id, (dx / dd) * sp + (this.rng.next() - 0.5) * 4, up, (dz / dd) * sp + (this.rng.next() - 0.5) * 4, 0.45 + this.rng.next() * 0.35, 8 + this.rng.next() * 5);
  }

  // Debris for blocks stripped by the passing shock front: an outward / upward burst.
  spawnWaveDebris(x, y, z, id, d, power) {
    if (this.waveDebrisThisTick >= MAX_WAVE_DEBRIS_PER_TICK) return;
    if (this.rng.next() >= 0.55 + 0.45 * power) return;
    this.waveDebrisThisTick++;
    const dx = x + 0.5 - this.cx, dz = z + 0.5 - this.cz;
    const dd = Math.max(0.5, Math.sqrt(dx * dx + dz * dz));
    const sp = 8 + 16 * power + this.rng.next() * 5, up = 7 + 12 * power + this.rng.next() * 5;
    this.throwBlock(x, y, z, id, (dx / dd) * sp + (this.rng.next() - 0.5) * 5, up, (dz / dd) * sp + (this.rng.next() - 0.5) * 5, 0.4 + this.rng.next() * 0.4, 4.5 + this.rng.next() * 2.5);
  }

  throwBlock(x, y, z, id, vx, vy, vz, size, life) {
    const def = BLOCKS[id];
    const bid = def.shape === SHAPE.CUBE ? id : def.sound === 'wood' ? B.OAK_PLANKS : B.COBBLESTONE;
    const deb = this.m.debris;
    const i = deb.spawn(x + 0.5, y + 0.5, z + 0.5, vx, vy, vz, bid, size, life);
    // the cell was solid a moment ago and its chunk is not relit yet: start the chunk sky-lit (debris re-samples light periodically)
    if (i >= 0) deb.lightAttr.setXY(i, 0.95, 0);
  }

  // Outward blast wind acting on debris while the beam is firing (strongest just behind the shock front).
  blastForce(i, out) {
    const deb = this.m.debris;
    const dx = deb.px[i] - this.cx, dz = deb.pz[i] - this.cz;
    const d2 = dx * dx + dz * dz, r = this.waveR, r2 = r * r;
    if (d2 > r2 || d2 < 0.01) return;
    const d = Math.sqrt(d2), k = 1 - d2 / r2;
    out.x = (dx / d) * 24 * k; out.z = (dz / d) * 24 * k; out.y = 5 * k;
  }

  // ---------------------------------------------------------------- visuals (per frame)
  render(dt, alpha, camera) {
    const paused = this.m.state === 'paused';
    if (!paused) this.visTime += dt;
    const t = (this.tick + (paused ? 0 : alpha)) / 20;
    if (this.preview) { this.renderPreview(t); return; }
    if (!this.station) return;
    const p = this.params;
    const tA = this.TA / 20, t1 = this.T1 / 20, t2 = this.T2 / 20, t3 = this.T3 / 20, t4 = this.T4 / 20;
    const maxSphere = 5 + 3 * p.intensity;
    const st = this.stationState;
    let power = 0, heat = 0, charge = 0, firing = 0, stationAlpha = 1, dy = 0, drift = 0;
    let head = 0, tail = 0, intensity = 0, sphereR = 0, sphereAlpha = 0, tipHot = 0, tribAlpha = 0, tribK = 0;
    let moteRate = 0, sparkRate = 0, smokeRate = 0;
    let bottomY = this.impactY;
    const sPos = this.stationPos;
    if (this.stopping) {
      const u = (this.tick - this.stopTick + (paused ? 0 : alpha)) / 20;
      this.stationAt(Math.min(this.stopTick / 20, t), sPos);
      head = this.stopHead * (1 - smooth(u / 1.2));                    // the beam retracts toward the focus
      intensity = this.stopIntensity * (1 - smooth(u / 1.4));
      sphereR = this.stopSphere * (1 - smooth(u / 1.6)); sphereAlpha = 0.85;
      tribAlpha = this.stopTrib * (1 - smooth(u / 0.6)); tribK = 1;
      power = this.stopPower * (1 - smooth((u - 0.4) / 2)); charge = this.stopCharge * (1 - smooth(u / 1));
      tipHot = 0.6 * intensity;
      if (u > 2) { dy = (u - 2) * (u - 2) * 7; drift = (u - 2) * (u - 2) * 3; }
      stationAlpha = 1 - smooth((u - 3) / 2.8);
      smokeRate = this.tick >= this.T2 ? 18 * (1 - smooth(u / 4)) : 0;
      bottomY = this.centerFloor;
    } else if (t < tA) {
      // arrival: first seen far away and high, glides down toward the firing position
      const f = t / tA;
      this.stationAt(t, sPos);
      stationAlpha = smooth(t / FADE_IN_S);
      power = 0.15 + 0.85 * smooth(f);
      moteRate = f > 0.85 ? 40 * (f - 0.85) / 0.15 : 0;
    } else if (t < t1) {
      // charge: dish glows, tributaries ignite one after another, the focus ball grows and pulsates faster and faster
      const f = (t - tA) / (t1 - tA);
      sPos.copy(this.firePos); sPos.y += 0.5 * Math.sin(this.visTime * 0.7);
      power = 1; charge = smooth(f * 1.6);
      if (!paused) this.pulsePhase += dt * Math.PI * 2 * (3 + 4 * f * f);
      const pulse = Math.sin(this.pulsePhase);
      const grow = smooth((t - this.tribTime(0)) / Math.max(0.5, t1 - this.tribTime(0)));
      sphereR = maxSphere * (0.12 + 0.88 * grow) * (1 + (0.06 + 0.12 * f) * pulse); sphereAlpha = (0.55 + 0.45 * grow) * (0.8 + 0.2 * pulse);
      tribAlpha = 1; tribK = 1;
      moteRate = 40 + 360 * f * f;
    } else if (t < t2) {
      // fire: the main beam shoots from the focus along the aim line to the target in one fast stroke
      const f = (t - t1) / (t2 - t1);
      sPos.copy(this.firePos); sPos.y -= 0.8 * Math.sin(f * Math.PI);
      power = 1; charge = 1 - 0.5 * f; firing = 1; heat = 0.4 * f;
      if (!paused) this.pulsePhase += dt * Math.PI * 2 * 9;
      head = Math.pow(f, 0.9); intensity = 0.85 + 0.15 * f; tipHot = 1.2;
      sphereR = maxSphere * (1.1 + 0.1 * Math.sin(this.pulsePhase)); sphereAlpha = 1;
      tribAlpha = 1 - smooth(f * 1.3); tribK = 1;
      moteRate = 120 * (1 - f);
    } else if (t < t3) {
      // impact: the beam eats the crater while the shock wave races across the town
      sPos.copy(this.firePos); sPos.y += 0.3 * Math.sin(this.visTime * 1.3);
      power = 1; heat = 1; firing = 1; charge = 0.5;
      head = 1;
      // the beam end follows the centre floor, easing down over the burst interval
      bottomY = lerp(this.prevCenterFloor, this.centerFloor, clamp01((this.tick - this.burstTick + (paused ? 0 : alpha)) / CARVE_EVERY));
      intensity = 0.95 + 0.08 * Math.sin(this.visTime * 23) + 0.04 * Math.sin(this.visTime * 7.3);
      tipHot = 1.3;
      sphereR = maxSphere * (1 + 0.08 * Math.sin(this.visTime * 9)); sphereAlpha = 1;
      sparkRate = 70 * (0.6 + 0.4 * p.intensity); smokeRate = 42 * (0.5 + 0.5 * p.intensity);
    } else if (t < t4) {
      // aftermath: beam fades, station goes dark and departs, smoke lingers
      const u = t - t3;
      sPos.copy(this.firePos);
      head = 1; bottomY = this.centerFloor;
      intensity = 1 - smooth(u / 1.5); tipHot = intensity;
      sphereR = maxSphere * (1 - smooth(u / 2.2)); sphereAlpha = 1;
      power = 1 - smooth((u - 1) / 2.5); heat = power; firing = intensity; charge = 0.5 * power;
      if (u > 3) { dy = (u - 3) * (u - 3) * 5; drift = (u - 3) * (u - 3) * 2.5; }
      stationAlpha = 1 - smooth((u - 5.5) / 4.5);
      smokeRate = 34 * (1 - smooth((u - 1) / 9)); sparkRate = 40 * intensity;
    } else { stationAlpha = 0; }
    this.lastHead = head; this.lastIntensity = intensity; this.lastPower = power; this.lastSphere = sphereR; this.lastTrib = tribAlpha; this.lastCharge = charge;

    // station: position (+ departure offsets), aim at the impact point, state
    sPos.x += this.bx * drift; sPos.z += this.bz * drift; sPos.y += dy;
    this.aim.copy(this.impact).sub(sPos).normalize();
    st.power = power; st.heat = heat; st.charge = charge; st.firing = firing; st.alpha = stationAlpha; st.time = this.visTime;
    this.station.set(sPos.x, sPos.y, sPos.z, this.aim.x, this.aim.y, this.aim.z, st);
    this.station.focusWorld(this.focus);
    this.station.rimPoints(this.nTrib, this.rimPts);
    this.motes.focus.x = this.focus.x; this.motes.focus.y = this.focus.y; this.motes.focus.z = this.focus.z;

    // tributaries: each shoots from its rim point into the focus at its ignition time, then flickers
    for (let i = 0; i < MAX_TRIBUTARIES; i++) {
      if (i >= this.nTrib) { this.beam.setTributary(i, 0, 0, 0, 0, 0); continue; }
      const rp = this.rimPts[i];
      let ext = 0, bright = 0;
      if (tribAlpha > 0.002) {
        const since = this.stopping ? 1 : t - this.tribTime(i);
        if (since > 0) {
          ext = tribK * Math.min(1, since / TRIB_ZAP_S);
          bright = (0.8 + 0.2 * Math.sin(this.visTime * 21 + i * 2.1)) * Math.min(1, since / 0.15);
          if (!this.tribZapped[i] && !paused) { this.tribZapped[i] = 1; this.tribZapSound(rp); }
        }
      }
      this.beam.setTributary(i, rp.x, rp.y, rp.z, ext, bright);
    }
    this.beam.setTributaryStyle(tribAlpha, 0.9 + 0.1 * Math.sin(this.visTime * 13));
    // warm-up: draw the energy program (nearly invisible) during the first arrival frames so its compile does not
    // stall the first tributary ignition
    if (this.tick < 40 && sphereR <= 0 && !this.stopping) { sphereR = 0.05; sphereAlpha = 0.004; }
    this.beamEnd.set(this.cx, bottomY, this.cz);
    this.beam.setBeam(this.focus, this.beamEnd, head, tail, intensity, sphereR, sphereAlpha, tipHot, 1 + 0.035 * Math.sin(this.visTime * 17), this.visTime);
    this.renderRings(t, t1, t2, t3, alpha, paused);

    // camera distance drives spawn rates, audio gains and the ambient glow
    const cdx = camera.position.x - this.cx, cdz = camera.position.z - this.cz;
    const camDist = Math.sqrt(cdx * cdx + cdz * cdz);
    const prox = clamp01(1 - camDist / 260);

    if (!paused) {
      this.motes.setCamera(camera, this.game.renderer.domElement.height);
      if (moteRate > 0) { this.moteAcc += moteRate * dt; while (this.moteAcc >= 1) { this.moteAcc--; this.spawnMote(); } }
      if (t >= t2 && !this.sparkBurst && !this.stopping) { this.sparkBurst = true; for (let i = 0; i < 260; i++) this.spawnSpark(bottomY, 1.8); }
      if (sparkRate > 0 && camDist < 220 && this.motes.count < SPARK_CAP) { this.sparkAcc += sparkRate * dt; while (this.sparkAcc >= 1) { this.sparkAcc--; this.spawnSpark(bottomY, 1); } }
      if (smokeRate > 0 && camDist < 200) { this.smokeAcc += smokeRate * dt; let n = 0; while (this.smokeAcc >= 1 && n < 6) { this.smokeAcc--; n++; this.spawnSmoke(); } if (this.smokeAcc > 6) this.smokeAcc = 0; }
      if (this.wave && !this.wave.done && t >= t2 && !this.stopping) this.spawnWaveDust(dt, camera);
      this.motes.update(dt, this.impactY);
      // faint ambient glow from the beam on everything nearby (does not override the big impact flash)
      const fx = this.m.effects;
      if (intensity > 0.05 && (fx.flashTimer <= 0.03 || fx.flashPeak <= 0.2)) fx.flash(0.1 * intensity * prox, 0.25, [0.8, 1, 0.85]);
    }
    this.updateAudio(t, tA, t1, t2, t3, intensity, power, charge, camDist, prox, paused);
  }

  // ignition time (s) of tributary i
  tribTime(i) { return this.TA / 20 + TRIB_START * (this.T1 - this.TA) / 20 + i * TRIB_GAP_S; }

  // visual front radius (sub-tick interpolated)
  frontRadius(alpha, paused) {
    if (!this.wave) return 0;
    return lerp(this.prevFront, this.wave.front, this.frontTick === this.tick ? (paused ? 1 : alpha) : 1);
  }

  renderRings(t, t1, t2, t3, alpha, paused) {
    const rings = this.rings, R = this.R, br = this.params.beamRadius, y = this.impactY - 0.6;
    const u = t - t2;
    const active = u >= 0 && !this.stopping;
    // destruction wave: ring 0 = wall of dust at the front, ring 1 = glowing shock band at its foot, ring 2 = trailing
    // flat dust ring that stays as a dusty rim after the front has passed
    if (active && (this.waveDoneTick < 0 || t < this.waveDoneTick / 20 + 4.2)) {
      const front = this.frontRadius(alpha, paused);
      const k = clamp01(front / this.waveR);
      const since = this.waveDoneTick < 0 ? 0 : clamp01((t - this.waveDoneTick / 20) / 4);
      const fade = (1 - since) * (0.6 + 0.4 * (1 - k * k));
      if (fade > 0.01 && front > 1) {
        rings.setColor(0, 0.5, 0.4, 0.3, 1); rings.set(0, front, -(7 + 13 * Math.sqrt(k)), fade, y);
        rings.setColor(1, 0.8, 1, 0.75, 0); rings.set(1, front - 0.3, -(1.4 + 2 * k), 0.9 * Math.pow(1 - k, 1.5) * (1 - since), y);
        rings.setColor(2, 0.78, 0.68, 0.56, 0.9); rings.set(2, Math.max(1, front - 3 - 6 * k), 5 + 7 * k, 0.55 * (1 - since) * (0.4 + 0.6 * k), this.impactY + 0.3 + 1.2 * k);
      } else { rings.hide(0); rings.hide(1); rings.hide(2); }
    } else { rings.hide(0); rings.hide(1); rings.hide(2); }
    // impact flash disc
    if (active && u < 0.7) { const k = u / 0.7; rings.setColor(5, 0.85, 1, 0.85, 0); rings.set(5, 1 + (R * 1.6) * k, 6 + 8 * k, 0.9 * (1 - k) * (1 - k), this.impactY + 0.3); }
    else rings.hide(5);
    // cloud rings where the diagonal beam crosses the cloud layer (pushed outward while the stroke passes)
    const fy = this.focus.y;
    if (fy > CLOUD_HEIGHT + 6) {
      const fc = (fy - (CLOUD_HEIGHT + 4)) / (fy - this.impactY);           // fraction along focus -> impact
      const cxz = lerp(this.focus.x, this.cx, fc), czz = lerp(this.focus.z, this.cz, fc);
      const tc = t1 + Math.pow(fc, 1 / 0.9) * (t2 - t1);
      const uc = t - tc;
      for (let i = 0; i < 2; i++) {
        const uu = uc - i * 0.35, dur = 3.2 + i * 0.9;
        if (uu >= 0 && uu < dur && !this.stopping) { const k = smooth(uu / dur); rings.setRingCenter(3 + i, cxz, czz); rings.setColor(3 + i, 0.9, 1, 0.92, 0.4); rings.set(3 + i, br * 2 + (38 + i * 14) * k, 5 + 6 * k, 0.6 * (1 - k), CLOUD_HEIGHT + 1.5 + i * 1.2); }
        else rings.hide(3 + i);
      }
    } else { rings.hide(3); rings.hide(4); }
    // warm-up: the ring program's first use stalls on synchronous GL queries (link status, uniforms), so draw the
    // set once, fully invisible (black additive), during the first arrival frames instead of at the impact
    if (this.tick < 40 && !this.stopping) { rings.setColor(7, 0, 0, 0, 0); rings.set(7, 1, 1, 0.004, FIRE_Y + 40); } else rings.hide(7);
    rings.hide(6);
    rings.commit(this.visTime);
  }

  renderPreview(t) {
    const rings = this.rings, R = this.R, br = this.params.beamRadius, y = this.impactY + 0.06;
    const pulse = 0.8 + 0.2 * Math.sin(this.visTime * 3);
    // destruction radius: a glowing curtain plus a flat ring; beam radius: a cyan curtain; a scanning pulse travels
    // between them; the wave radius: a wide dusty ring
    rings.setColor(0, 1, 0.7, 0.25, 0.6); rings.set(0, R, -4, 0.9 * pulse, y);
    rings.setColor(1, 1, 0.75, 0.3, 0.3); rings.set(1, R - 0.6, 1.2, pulse, y);
    rings.setColor(2, 0.35, 0.9, 1, 0.45); rings.set(2, br, -2.4, 0.85, y);
    const k = (this.visTime * 0.45) % 1;
    rings.setColor(3, 1, 0.85, 0.5, 0); rings.set(3, br + (R - br) * k, -1.2, 0.8 * (1 - k), y);
    rings.setColor(6, 0.9, 0.62, 0.35, 0.5); rings.set(6, this.waveR - 1.5, 1.5, 0.45 + 0.15 * Math.sin(this.visTime * 2), y);
    const kw = (this.visTime * 0.25) % 1;
    rings.setColor(4, 0.9, 0.7, 0.45, 0); rings.set(4, R + (this.waveR - R) * kw, 2.5, 0.5 * (1 - kw), y);
    rings.commit(this.visTime);
    if (this.guide) this.guide.set(0.25 + 0.15 * Math.sin(this.visTime * 5));
  }

  spawnMote() {
    const i = Math.floor(Math.random() * this.nTrib);
    const rp = this.rimPts[i] || this.focus;
    const pale = Math.random() < 0.15;
    this.motes.spawnMote(rp.x + (Math.random() - 0.5) * 6, rp.y + (Math.random() - 0.5) * 6, rp.z + (Math.random() - 0.5) * 6, 20 + Math.random() * 14, 2.4 + Math.random() * 1.8,
      pale ? 0.8 : 0.15 + Math.random() * 0.3, 1, pale ? 0.8 : 0.2 + Math.random() * 0.25);
  }

  spawnSpark(bottom, boost) {
    const a = Math.random() * Math.PI * 2;
    const sp = (6 + Math.random() * 22) * boost, up = (7 + Math.random() * 20) * boost;
    const br = this.params.beamRadius * 0.6;
    const c = Math.random(); // white-green hot / pale green / orange embers
    const r = c < 0.5 ? 0.85 : c < 0.8 ? 0.55 : 1, g = c < 0.5 ? 1 : c < 0.8 ? 1 : 0.6, b = c < 0.5 ? 0.85 : c < 0.8 ? 0.55 : 0.2;
    this.motes.spawnSpark(this.cx + Math.cos(a) * br * Math.random(), bottom + 0.5 + Math.random() * 1.5, this.cz + Math.sin(a) * br * Math.random(),
      Math.cos(a) * sp, up, Math.sin(a) * sp, 0.28 + Math.random() * 0.35, 0.5 + Math.random() * 1.2, r, g, b);
  }

  // Tall dark smoke columns from the crater rim (and thinner wisps from the floor), using the shared pool.
  spawnSmoke() {
    const particles = this.game.particles;
    if (particles.count >= SMOKE_CAP) return;
    const a = Math.random() * Math.PI * 2;
    const rim = Math.random() < 0.75;
    const r = rim ? Math.max(1.5, this.currentRadius) + (Math.random() - 0.5) * 3 : Math.random() * Math.max(1, this.currentRadius * 0.7);
    const x = this.cx + Math.cos(a) * r, z = this.cz + Math.sin(a) * r;
    const sy = this.world.surfaceY(Math.floor(x), Math.floor(z));
    const before = particles.count;
    particles.smoke(x, (sy >= 0 ? sy : this.groundY) + 1.2, z, true);
    if (particles.count === before) return;
    // stretch the fresh puff into a column: faster rise, longer life, darker and bigger
    const i = particles.count - 1;
    const life = rim ? 5 + Math.random() * 3 : 3 + Math.random() * 2;
    particles.vel[i * 3 + 1] = rim ? 2.5 + Math.random() * 3 : 1.5 + Math.random() * 1.5;
    particles.vel[i * 3] += (Math.random() - 0.5) * 0.6; particles.vel[i * 3 + 2] += (Math.random() - 0.5) * 0.6;
    particles.life[i] = particles.maxLife[i] = life;
    particles.size[i] = rim ? 1.1 + Math.random() * 0.6 : 0.9;
    const g = 0.12 + Math.random() * 0.18;
    particles.color[i * 3] = g * 1.1; particles.color[i * 3 + 1] = g; particles.color[i * 3 + 2] = g * 0.95;
  }

  // Dust kicked up along the shock front (only the part of the ring near the camera).
  spawnWaveDust(dt, camera) {
    const particles = this.game.particles;
    if (particles.count >= SMOKE_CAP) return;
    const front = this.wave.front;
    if (front < 2) return;
    const cdx = camera.position.x - this.cx, cdz = camera.position.z - this.cz;
    const camD = Math.sqrt(cdx * cdx + cdz * cdz);
    if (Math.abs(camD - front) > 90) return;
    this.dustAcc += 36 * dt;
    let n = 0;
    // angular window of the ring closest to the camera
    const ca = Math.atan2(cdz, cdx), span = Math.min(Math.PI, 70 / Math.max(6, front));
    while (this.dustAcc >= 1 && n < 5) {
      this.dustAcc--; n++;
      const a = ca + (Math.random() - 0.5) * 2 * span;
      const r = front - 1 + Math.random() * 3;
      const x = this.cx + Math.cos(a) * r, z = this.cz + Math.sin(a) * r;
      const sy = this.world.surfaceY(Math.floor(x), Math.floor(z));
      const before = particles.count;
      particles.dust(x, (sy >= 0 ? sy : this.groundY) + 1, z);
      if (particles.count === before) return;
      const i = particles.count - 1;
      particles.vel[i * 3] = Math.cos(a) * (4 + Math.random() * 4); particles.vel[i * 3 + 1] = 2.5 + Math.random() * 3; particles.vel[i * 3 + 2] = Math.sin(a) * (4 + Math.random() * 4);
      particles.life[i] = particles.maxLife[i] = 2.5 + Math.random() * 2;
      particles.size[i] = 1.1 + Math.random() * 0.8;
      particles.color[i * 3] = 0.62; particles.color[i * 3 + 1] = 0.54; particles.color[i * 3 + 2] = 0.44;
    }
    if (this.dustAcc > 5) this.dustAcc = 0;
  }

  tribZapSound(pos) {
    const audio = this.game.audio;
    if (!audio.ctx) return;
    audio.tone('sawtooth', 1900, 240, 0.45, 0.28, pos, 900, 0.01);
    audio.noise(0.35, 'highpass', 2600, 1, 0.22, pos, 900, 0.005);
  }

  updateAudio(t, tA, t1, t2, t3, intensity, power, charge, camDist, prox, paused) {
    const audio = this.game.audio;
    if (!audio.ctx) return;
    // pan from listener yaw (right vector = (cos yaw, -sin yaw)); the station sounds come from its bearing
    const L = audio.listener;
    const sdx = this.stationPos.x - L.x, sdz = this.stationPos.z - L.z;
    const sd = Math.sqrt(sdx * sdx + sdz * sdz) || 1;
    const sPan = Math.max(-1, Math.min(1, (sdx * Math.cos(L.yaw) + sdz * -Math.sin(L.yaw)) / sd)) * 0.6;
    const dx = this.cx - L.x, dz = this.cz - L.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const pan = Math.max(-1, Math.min(1, (dx * Math.cos(L.yaw) + dz * -Math.sin(L.yaw)) / d)) * 0.6;
    const far = Math.pow(clamp01(1 - camDist / 420), 1.2);
    // deep slow sub-bass hum while the station is present (rises during the approach, fades with its power)
    const humming = !this.stopping ? power > 0.02 && t < t3 + 3 : power > 0.02;
    if (humming) {
      if (!this.humLoop) { audio.loopStart('beamHum', { kind: 'osc', type: 'sine', freq: 30, cutoff: 180, q: 0.8, gain: 0 }); this.humLoop = true; }
      const f = clamp01(t / tA);
      audio.loopSet('beamHum', { freq: 30 + 18 * f + 6 * Math.sin(this.visTime * 0.6), cutoff: 120 + 160 * f, gain: paused ? 0 : (0.06 + 0.2 * f) * power * far, pan: sPan }, 0.5);
    } else if (this.humLoop) { audio.loopStop('beamHum', 1.5); this.humLoop = false; }
    // rising whine while charging
    const charging = !this.stopping && t >= tA && t < t1;
    if (charging) {
      if (!this.chargeLoop) { audio.loopStart('beamCharge', { kind: 'osc', type: 'sawtooth', freq: 60, cutoff: 300, q: 1.4, gain: 0 }); this.chargeLoop = true; }
      const f = (t - tA) / (t1 - tA);
      audio.loopSet('beamCharge', { freq: 55 + 300 * f * f, cutoff: 240 + 2600 * f, gain: paused ? 0 : (0.04 + 0.24 * f) * Math.pow(0.35 + 0.65 * far, 1.5) * charge, pan: sPan });
      if (!paused && f > 0.7 && this.tick % 45 === 0 && this.tick !== this.lastRumbleTick) { this.lastRumbleTick = this.tick; audio.rumble(this._pos, 0.35); }
    } else if (this.chargeLoop) { audio.loopStop('beamCharge', 0.6); this.chargeLoop = false; }
    // the beam's roar
    const roaring = intensity > 0.02 && !this.stopping;
    if (roaring) {
      if (!this.roarLoop) { audio.loopStart('beamRoar', { kind: 'noise', filter: 'lowpass', cutoff: 500, q: 0.9, gain: 0 }); this.roarLoop = true; }
      const gain = paused ? 0 : 0.7 * intensity * Math.pow(clamp01(1 - camDist / 320), 1.2) * (0.6 + 0.4 * this.params.intensity);
      audio.loopSet('beamRoar', { gain, cutoff: 420 + 1100 * intensity + 200 * Math.sin(this.visTime * 4), rate: 0.85 + 0.3 * intensity, pan });
    } else if (this.roarLoop) { audio.loopStop('beamRoar', 1.2); this.roarLoop = false; }
    // the shock front passing the listener
    if (!this.waveWhoosh && this.wave && t >= t2 && !this.stopping && this.wave.front >= camDist - 1 && camDist > this.R * 0.5) {
      this.waveWhoosh = true;
      audio.noise(0.7, 'lowpass', 700, 0.6, 0.8, null);
      audio.noise(0.4, 'bandpass', 1800, 0.8, 0.3, null);
    }
  }
}
