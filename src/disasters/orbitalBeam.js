// Orbital Beam: an original orbital superweapon event. A slim ring station appears high above the target and
// charges (energy motes stream into a growing focus sphere, rising hum, cold sky), then a giant energy beam
// descends to the ground and eats a crater into terrain and buildings (deterministic, budgeted, journaled),
// throwing debris, sparks and smoke; afterwards the beam fades, the station powers down and drifts away and
// the glowing crater (scorched stone, magma pool, ash rim, charred wood) remains until the area is restored.
//
// Simulation (simulate) only uses this.rng, this.tick and the world; every visual (render) may be random.
import { Disaster } from './base.js';
import { BLOCKS, B, SHAPE } from '../blocks.js';
import { CLOUD_HEIGHT, TOWN_GROUND } from '../constants.js';
import { StationMesh, STATION_RING_RADIUS, STATION_FOCUS_DROP } from './beam/station.js';
import { BeamMesh } from './beam/beamMesh.js';
import { MotePool } from './beam/motes.js';
import { RingSet } from './beam/rings.js';
import { CraterPlan } from './beam/crater.js';
import { PreviewGuide } from './beam/guide.js';

const STATION_Y = 200;            // platform altitude (world y); the focus point hangs ~16 blocks under it
const DESCENT_MIN_S = 3, DESCENT_MAX_S = 5;
const FADE_TICKS = 30;            // beam fade-out after firing (1.5 s)
const LINGER_TICKS = 200;         // smoke lingers after the beam is gone (10 s)
const STOP_TICKS = 120;           // cancel: retract, power down, drift off (6 s)
// The crater is carved in bursts (every CARVE_EVERY ticks) rather than every tick: every carving tick touches all
// chunks under the current radius and each touched chunk costs a full relight + 3x3 remesh, so 5 Hz bursts cut
// the engine's relight/remesh work ~4x while still reading as continuous "eating". The edit budget is per tick,
// so a burst may leave work for the next one (the plan is resumable).
const CARVE_EVERY = 4;
const MAX_DEBRIS_PER_BURST = 24;  // ~6 blocks per tick on average
const SMOKE_CAP = 2400;           // never push the shared particle pool above this
const SPARK_CAP = 1300;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

export class OrbitalBeam extends Disaster {
  static type = 'beam';
  static label = 'Orbital Beam';
  static description = 'An orbital platform charges in the sky, then a giant energy beam descends and carves a crater.';
  static schema = [
    { key: 'target', label: 'Target (x, z)', type: 'position', default: [0, 0] },
    { key: 'beamRadius', label: 'Beam radius', type: 'number', min: 1, max: 14, step: 0.5, default: 5, unit: 'blocks' },
    { key: 'chargeTime', label: 'Charge time', type: 'number', min: 2, max: 40, step: 1, default: 10, unit: 's' },
    { key: 'strength', label: 'Impact strength', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
    { key: 'destructionRadius', label: 'Destruction radius', type: 'number', min: 3, max: 45, step: 1, default: 18, unit: 'blocks' },
    { key: 'duration', label: 'Beam duration', type: 'number', min: 3, max: 90, step: 1, default: 18, unit: 's' },
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
    this.stationY = STATION_Y;
    this.focusY = STATION_Y - STATION_FOCUS_DROP;
    this.focus = { x: this.cx, y: this.focusY, z: this.cz };
    this.R = p.destructionRadius;
    this.D = Math.max(1, p.strength * this.R * 0.55);
    // timeline (ticks)
    this.T1 = Math.round(p.chargeTime * 20);
    this.descentTicks = Math.round((DESCENT_MAX_S - (DESCENT_MAX_S - DESCENT_MIN_S) * p.intensity) * 20);
    this.T2 = this.T1 + this.descentTicks;
    this.T3 = this.T2 + this.durationTicks;
    this.T4 = this.T3 + FADE_TICKS + LINGER_TICKS;
    this.carveTicks = Math.max(20, Math.round(0.6 * this.durationTicks));
    // simulation state
    this.crater = null;
    this.centerFloor = this.impactY;
    this.prevCenterFloor = this.impactY;
    this.currentRadius = 0;
    this.debrisThisTick = 0;
    this.burstTick = this.T2;
    this.stopTick = -1;
    this.stopBottom = this.focusY; this.stopIntensity = 0; this.stopPower = 0; this.stopSphere = 0;
    // visuals
    this.station = null; this.beam = null; this.motes = null; this.rings = null; this.guide = null;
    this.visTime = 0;
    this.lastBottom = this.focusY; this.lastIntensity = 0; this.lastPower = 0; this.lastSphere = 0;
    this.sparkBurst = false;
    this.smokeAcc = 0; this.sparkAcc = 0; this.moteAcc = 0;
    this.chargeLoop = false; this.roarLoop = false;
    this._pos = { x: this.cx, y: this.impactY, z: this.cz };
    this._warnCache = null;
    // hooks bound once (no per-tick closures)
    this._onRemove = (x, y, z, id, d, rNow) => this.spawnDebris(x, y, z, id, d, rNow);
    this._forceFn = (i, out) => this.blastForce(i, out);
    this._flingNpc = (npc, d) => this.fling(this.game.npcs, npc, d, this.params.beamRadius * 1.6, 16);
    this._flingAnimal = (a, d) => this.fling(this.game.animals, a, d, this.params.beamRadius * 1.6, 14);
    this._blastNpc = (npc, d) => this.fling(this.game.npcs, npc, d, this.R * 1.4, 22);
    this._blastAnimal = (a, d) => this.fling(this.game.animals, a, d, this.R * 1.4, 20);
  }

  get progress() { return Math.min(1, this.tick / Math.max(1, this.T4)); }
  get phase() {
    if (this.stopping) return 'cancel';
    const t = this.tick;
    return t < this.T1 ? 'charge' : t < this.T2 ? 'descent' : t < this.T3 ? 'impact' : t < this.T4 ? 'aftermath' : 'done';
  }

  warnings() {
    if (!this._warnCache) {
      const plan = this.crater || new CraterPlan(this.m, this.cx, this.cz, this.R, this.D, this.groundY, this.seed);
      const n = plan.estimateRemoved();
      this._warnCache = [
        `Vaporizes ~${n} blocks of terrain and buildings within ${this.R} blocks of (${Math.floor(this.cx)}, ${Math.floor(this.cz)}); crater ~${Math.round(this.D)} deep.`,
        `Lethal blast for anyone within ${this.R} blocks of the impact point; knockback out to ${this.R * 2}.`,
      ];
    }
    return this._warnCache;
  }

  // ---------------------------------------------------------------- lifecycle
  begin() {
    this.crater = new CraterPlan(this.m, this.cx, this.cz, this.R, this.D, this.groundY, this.seed);
    this.crater.onRemove = this._onRemove;
    this.createVisuals();
    const alert = { kind: 'beam', x: this.cx, z: this.cz, radius: 150, awayRadius: this.R + 18 };
    if (this.game.npcs) this.game.npcs.alert(alert);
    if (this.game.animals) this.game.animals.alert(alert);
    this.m.effects.setEnvironment({ tint: [0.9, 0.95, 1.1] });
  }

  beginPreview() {
    this.rings = new RingSet(this.game.scene);
    this.rings.setCenter(this.cx, this.cz);
    this.guide = new PreviewGuide(this.game.scene, this.cx, this.impactY, this.cz, this.focusY);
  }

  createVisuals() {
    const scene = this.game.scene;
    this.station = new StationMesh(scene);
    this.beam = new BeamMesh(scene, this.params.beamRadius);
    this.motes = new MotePool(scene, 1500);
    this.motes.focus.x = this.cx; this.motes.focus.y = this.focusY; this.motes.focus.z = this.cz;
    this.rings = new RingSet(scene);
    this.rings.setCenter(this.cx, this.cz);
  }

  stop() {
    if (this.stopping) return;
    this.stopping = true;
    this.stopTick = this.tick;
    this.stopBottom = this.lastBottom; this.stopIntensity = this.lastIntensity; this.stopPower = this.lastPower; this.stopSphere = this.lastSphere;
    this.m.debris.forceFn = null;
    this.m.effects.reset();
    this.stopLoops();
  }

  dispose() {
    for (const v of [this.station, this.beam, this.motes, this.rings, this.guide]) if (v) v.dispose();
    this.station = this.beam = this.motes = this.rings = this.guide = null;
    this.stopLoops();
    if (this.m.debris.forceFn === this._forceFn) this.m.debris.forceFn = null;
    this.m.effects.reset();
  }

  stopLoops() {
    const audio = this.game.audio;
    if (this.chargeLoop) { audio.loopStop('beamCharge', 0.8); this.chargeLoop = false; }
    if (this.roarLoop) { audio.loopStop('beamRoar', 1.2); this.roarLoop = false; }
  }

  // ---------------------------------------------------------------- deterministic simulation (20 TPS)
  simulate() {
    const t = this.tick;
    if (this.stopping) { if (t - this.stopTick >= STOP_TICKS) this.done = true; return; }
    if (t === this.T1) this.m.effects.setEnvironment({ tint: [0.84, 0.92, 1.16], skyLightMul: 0.93 });
    if (t === this.T2) this.onImpact();
    if (t >= this.T2 && t < this.T3) this.fireTick(t);
    if (t === this.T3) this.onCease();
    if (t >= this.T4) this.done = true;
  }

  onImpact() {
    const fx = this.m.effects, pl = this.game.player;
    const dx = pl.pos.x - this.cx, dz = pl.pos.z - this.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    fx.flash(1.2, 0.5, [1, 0.95, 0.85]);
    fx.shake(0.9 * Math.max(0, 1 - dist / 200));
    fx.setEnvironment({ tint: [1.08, 0.98, 0.88], skyLightMul: 1, fogNearMul: 0.9 });
    this.game.audio.boom(this._pos, 2.5);
    this.game.audio.rumble(this._pos, 1);
    const nx = dist > 0.01 ? dx / dist : 1, nz = dist > 0.01 ? dz / dist : 0;
    if (dist < this.R) { pl.damage(12); pl.impulse(nx * 24, 15, nz * 24); }
    else if (dist < this.R * 2) { pl.damage(2); pl.impulse(nx * 11, 7, nz * 11); }
    if (this.game.npcs) this.game.npcs.eachNear(this.cx, this.cz, this.R * 1.4, this._blastNpc);
    if (this.game.animals) this.game.animals.eachNear(this.cx, this.cz, this.R * 1.4, this._blastAnimal);
    this.m.debris.forceFn = this._forceFn;
    this.m.say('Orbital beam impact!');
  }

  onCease() {
    this.m.effects.reset();
    if (this.m.debris.forceFn === this._forceFn) this.m.debris.forceFn = null;
  }

  fireTick(t) {
    const u = t - this.T2;
    if (u % CARVE_EVERY === 0) {
      const f = clamp01(u / this.carveTicks);
      this.currentRadius = this.R * Math.pow(f, 0.7);
      this.debrisThisTick = 0;
      this.crater.step(f);
      this.burstTick = t;
      this.prevCenterFloor = this.centerFloor;
      this.centerFloor = this.crater.top[0] + 1;
    }
    // people and animals caught in the column are hurled out; the player burns and is thrown
    const pl = this.game.player;
    const dx = pl.pos.x - this.cx, dz = pl.pos.z - this.cz;
    const d2 = dx * dx + dz * dz;
    if (t % 10 === 0) {
      const br = this.params.beamRadius * 1.3;
      if (d2 < br * br && pl.pos.y < this.focusY) { pl.damage(2); pl.impulse((dx / Math.max(0.5, Math.sqrt(d2))) * 6, 9, (dz / Math.max(0.5, Math.sqrt(d2))) * 6); }
      if (this.game.npcs) this.game.npcs.eachNear(this.cx, this.cz, this.params.beamRadius * 1.6, this._flingNpc);
      if (this.game.animals) this.game.animals.eachNear(this.cx, this.cz, this.params.beamRadius * 1.6, this._flingAnimal);
    }
    const wr = this.R * 1.5;
    if (d2 < wr * wr && d2 > 0.25) { const d = Math.sqrt(d2), k = 14 * (1 - d / wr); pl.addForce((dx / d) * k, 0, (dz / d) * k); }
    if ((t & 1) === 0) { const d = Math.sqrt(d2); this.m.effects.shake(0.16 * Math.max(0, 1 - d / 150) * (0.6 + 0.4 * this.params.intensity)); }
    if (t % 45 === 0) this.game.audio.rumble(this._pos, 0.5);
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
    const def = BLOCKS[id];
    const bid = def.shape === SHAPE.CUBE ? id : def.sound === 'wood' ? B.OAK_PLANKS : B.COBBLESTONE;
    const deb = this.m.debris;
    const i = deb.spawn(x + 0.5, y + 0.5, z + 0.5, (dx / dd) * sp + (this.rng.next() - 0.5) * 4, up, (dz / dd) * sp + (this.rng.next() - 0.5) * 4, bid, 0.45 + this.rng.next() * 0.35, 8 + this.rng.next() * 5);
    // the cell was solid a moment ago and its chunk is not relit yet: start the chunk sky-lit (debris re-samples light periodically)
    if (i >= 0) deb.lightAttr.setXY(i, 0.95, 0);
  }

  // Outward blast wind acting on debris while the beam is firing.
  blastForce(i, out) {
    const deb = this.m.debris;
    const dx = deb.px[i] - this.cx, dz = deb.pz[i] - this.cz;
    const d2 = dx * dx + dz * dz, r = this.R * 2, r2 = r * r;
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
    const t1 = this.T1 / 20, t2 = this.T2 / 20, t3 = this.T3 / 20, t4 = this.T4 / 20;
    const maxSphere = 3 + 2.6 * p.intensity;
    const pulse = Math.sin(this.visTime * 9);
    let power = 0, heat = 0, dy = 0, stationAlpha = 1, bottom = this.focusY, intensity = 0, sphereR = 0, sphereAlpha = 0, tipHot = 0;
    let moteRate = 0, sparkRate = 0, smokeRate = 0;
    if (this.stopping) {
      const u = (this.tick - this.stopTick + (paused ? 0 : alpha)) / 20;
      bottom = lerp(this.stopBottom, this.focusY, smooth(u / 1.2));
      intensity = this.stopIntensity * (1 - smooth(u / 1.4));
      sphereR = this.stopSphere * (1 - smooth(u / 1.6)); sphereAlpha = 0.85;
      power = this.stopPower * (1 - smooth((u - 0.4) / 2));
      tipHot = 0.6 * intensity;
      if (u > 2) dy = (u - 2) * (u - 2) * 7;
      stationAlpha = 1 - smooth((u - 3) / 2.8);
      smokeRate = this.tick >= this.T2 ? 30 * (1 - smooth(u / 4)) : 0;
    } else if (t < t1) {
      const f = t / t1;
      power = 0.2 + 0.8 * f; heat = 0;
      sphereR = maxSphere * smooth(f) * (1 + 0.07 * pulse * f); sphereAlpha = 0.9 * smooth(f * 3);
      bottom = this.focusY; intensity = 0;
      moteRate = 30 + 320 * f * f;
    } else if (t < t2) {
      const f = (t - t1) / (t2 - t1);
      power = 1; heat = 0.5 * f;
      bottom = this.focusY - (this.focusY - this.impactY) * Math.pow(f, 1.7);
      intensity = 0.7 + 0.3 * f; tipHot = 1.1;
      sphereR = maxSphere * (1 + 0.1 * pulse); sphereAlpha = 1;
      moteRate = 120 * (1 - f); sparkRate = 0;
    } else if (t < t3) {
      power = 1; heat = 1;
      // the tip follows the centre floor, easing down over the burst interval
      bottom = lerp(this.prevCenterFloor, this.centerFloor, clamp01((this.tick - this.burstTick + (paused ? 0 : alpha)) / CARVE_EVERY));
      intensity = 0.95 + 0.08 * Math.sin(this.visTime * 23) + 0.04 * Math.sin(this.visTime * 7.3);
      tipHot = 1.3;
      sphereR = maxSphere * (1 + 0.08 * pulse); sphereAlpha = 1;
      sparkRate = 70 * (0.6 + 0.4 * p.intensity); smokeRate = 70 * (0.5 + 0.5 * p.intensity);
    } else if (t < t4) {
      const u = t - t3;
      bottom = this.centerFloor;
      intensity = 1 - smooth(u / 1.5); tipHot = intensity;
      sphereR = maxSphere * (1 - smooth(u / 2.2)); sphereAlpha = 1;
      power = 1 - smooth((u - 1) / 2.5); heat = power;
      if (u > 3) dy = (u - 3) * (u - 3) * 5;
      stationAlpha = 1 - smooth((u - 5.5) / 4.5);
      smokeRate = 60 * (1 - smooth((u - 1) / 9)); sparkRate = 40 * intensity;
    } else { stationAlpha = 0; }
    this.lastBottom = bottom; this.lastIntensity = intensity; this.lastPower = power; this.lastSphere = sphereR;

    this.station.set(this.cx, this.stationY + dy, this.cz, power, heat, this.visTime, stationAlpha, this.visTime * 0.04);
    this.beam.set(this.focus, bottom, this.focusY, intensity, sphereR, sphereAlpha, tipHot, 1 + 0.035 * Math.sin(this.visTime * 17), this.visTime);
    this.renderRings(t, t1, t2);

    // camera distance drives spawn rates, audio gains and the ambient glow
    const cdx = camera.position.x - this.cx, cdz = camera.position.z - this.cz;
    const camDist = Math.sqrt(cdx * cdx + cdz * cdz);
    const prox = clamp01(1 - camDist / 260);

    if (!paused) {
      this.motes.setCamera(camera, this.game.renderer.domElement.height);
      if (moteRate > 0) { this.moteAcc += moteRate * dt; while (this.moteAcc >= 1) { this.moteAcc--; this.spawnMote(); } }
      if (t >= t2 && !this.sparkBurst && !this.stopping) { this.sparkBurst = true; for (let i = 0; i < 260; i++) this.spawnSpark(bottom, 1.8); }
      if (sparkRate > 0 && camDist < 220 && this.motes.count < SPARK_CAP) { this.sparkAcc += sparkRate * dt; while (this.sparkAcc >= 1) { this.sparkAcc--; this.spawnSpark(bottom, 1); } }
      if (smokeRate > 0 && camDist < 200) { this.smokeAcc += smokeRate * dt; let n = 0; while (this.smokeAcc >= 1 && n < 6) { this.smokeAcc--; n++; this.spawnSmoke(); } if (this.smokeAcc > 6) this.smokeAcc = 0; }
      this.motes.update(dt, this.impactY);
      // faint ambient glow from the beam on everything nearby (does not override the big impact flash)
      const fx = this.m.effects;
      if (intensity > 0.05 && (fx.flashTimer <= 0.03 || fx.flashPeak <= 0.2)) fx.flash(0.1 * intensity * prox, 0.25);
    }
    this.updateAudio(t, t1, t2, t3, intensity, power, camDist, prox, paused);
  }

  renderRings(t, t1, t2) {
    const rings = this.rings, R = this.R, br = this.params.beamRadius;
    // ground shockwave: ring 0 = expanding wall of dust, ring 1 = glowing band at its foot, ring 2 = slower flat dust ring;
    // rings 3-4 = cloud rings pushed outward when the tip crosses the cloud layer
    let u = t - t2;
    if (u >= 0 && u < 3 && !this.stopping) {
      const k = 1 - (1 - u / 3) * (1 - u / 3), r = 1.5 + (R * 3.2 - 1.5) * k, fade = Math.pow(1 - k, 1.2);
      rings.setColor(0, 0.6, 0.52, 0.43, 1); rings.set(0, r, -(3.5 + 8 * k), 0.92 * fade, this.impactY - 0.6);
      rings.setColor(1, 1, 0.75, 0.4, 0); rings.set(1, r - 0.4, -(1.2 + 2.5 * k), 1.0 * (1 - k) * (1 - k), this.impactY - 0.6);
    } else { rings.hide(0); rings.hide(1); }
    if (u >= 0.2 && u < 4.5 && !this.stopping) { const k = smooth((u - 0.2) / 4.3); rings.setColor(2, 0.8, 0.7, 0.58, 0.9); rings.set(2, 2 + (R * 2.1 - 2) * k, 4 + 5 * k, 0.5 * (1 - k), this.impactY + 0.4 + 1.5 * k); }
    else rings.hide(2);
    // time at which the descending tip crosses the cloud layer
    const fc = Math.pow(clamp01((this.focusY - (CLOUD_HEIGHT + 4)) / (this.focusY - this.impactY)), 1 / 1.7);
    const tc = t1 + fc * (t2 - t1);
    u = t - tc;
    for (let i = 0; i < 2; i++) {
      const uu = u - i * 0.35, dur = 3.2 + i * 0.9;
      if (uu >= 0 && uu < dur && !this.stopping) { const k = smooth(uu / dur); rings.setColor(3 + i, 0.92, 0.96, 1, 0.4); rings.set(3 + i, br * 2 + (38 + i * 14) * k, 5 + 6 * k, 0.6 * (1 - k), CLOUD_HEIGHT + 1.5 + i * 1.2); }
      else rings.hide(3 + i);
    }
    // warm-up: the ring program's first use stalls on synchronous GL queries (link status, uniforms), so draw the
    // set once, fully invisible (black additive), during the first charge frames instead of at the cloud crossing
    if (this.tick < 40 && t < t1) { rings.setColor(5, 0, 0, 0, 0); rings.set(5, 1, 1, 0.004, this.stationY + 40); } else rings.hide(5);
    rings.commit();
  }

  renderPreview(t) {
    const rings = this.rings, R = this.R, br = this.params.beamRadius, y = this.impactY + 0.06;
    const pulse = 0.8 + 0.2 * Math.sin(this.visTime * 3);
    // destruction radius: a glowing curtain plus a flat ring; beam radius: a cyan curtain; a scanning pulse travels between them
    rings.setColor(0, 1, 0.7, 0.25, 0.6); rings.set(0, R, -4, 0.9 * pulse, y);
    rings.setColor(1, 1, 0.75, 0.3, 0.3); rings.set(1, R - 0.6, 1.2, pulse, y);
    rings.setColor(2, 0.35, 0.9, 1, 0.45); rings.set(2, br, -2.4, 0.85, y);
    const k = (this.visTime * 0.45) % 1;
    rings.setColor(3, 1, 0.85, 0.5, 0); rings.set(3, br + (R - br) * k, -1.2, 0.8 * (1 - k), y);
    rings.commit();
    if (this.guide) this.guide.set(0.25 + 0.15 * Math.sin(this.visTime * 5));
  }

  spawnMote() {
    const a = Math.random() * Math.PI * 2;
    const r = STATION_RING_RADIUS + (Math.random() - 0.5) * 2;
    const amber = Math.random() < 0.18;
    this.motes.spawnMote(this.cx + Math.cos(a) * r, this.stationY + (Math.random() - 0.5) * 2.4, this.cz + Math.sin(a) * r, 24 + Math.random() * 12, 1.5 + Math.random() * 1.5,
      amber ? 1 : 0.5 + Math.random() * 0.2, amber ? 0.7 : 0.9, amber ? 0.3 : 1);
  }

  spawnSpark(bottom, boost) {
    const a = Math.random() * Math.PI * 2;
    const sp = (6 + Math.random() * 22) * boost, up = (7 + Math.random() * 20) * boost;
    const br = this.params.beamRadius * 0.6;
    const c = Math.random(); // yellow / white-hot / orange embers
    const g = c < 0.5 ? 0.9 : c < 0.8 ? 1 : 0.6, b = c < 0.5 ? 0.45 : c < 0.8 ? 0.9 : 0.2;
    this.motes.spawnSpark(this.cx + Math.cos(a) * br * Math.random(), bottom + 0.5 + Math.random() * 1.5, this.cz + Math.sin(a) * br * Math.random(),
      Math.cos(a) * sp, up, Math.sin(a) * sp, 0.28 + Math.random() * 0.35, 0.5 + Math.random() * 1.2, 1, g, b);
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

  updateAudio(t, t1, t2, t3, intensity, power, camDist, prox, paused) {
    const audio = this.game.audio;
    if (!audio.ctx) return;
    // pan from listener yaw (right vector = (cos yaw, -sin yaw))
    const L = audio.listener;
    const dx = this.cx - L.x, dz = this.cz - L.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const pan = Math.max(-1, Math.min(1, (dx * Math.cos(L.yaw) + dz * -Math.sin(L.yaw)) / d)) * 0.6;
    const charging = !this.stopping && t < t1;
    if (charging) {
      if (!this.chargeLoop) { audio.loopStart('beamCharge', { kind: 'osc', type: 'sawtooth', freq: 60, cutoff: 300, q: 1.4, gain: 0 }); this.chargeLoop = true; }
      const f = t / t1;
      audio.loopSet('beamCharge', { freq: 55 + 270 * f * f, cutoff: 240 + 2400 * f, gain: paused ? 0 : (0.05 + 0.24 * f) * Math.pow(0.35 + 0.65 * prox, 1.5), pan });
    } else if (this.chargeLoop) { audio.loopStop('beamCharge', 0.6); this.chargeLoop = false; }
    const roaring = intensity > 0.02;
    if (roaring) {
      if (!this.roarLoop) { audio.loopStart('beamRoar', { kind: 'noise', filter: 'lowpass', cutoff: 500, q: 0.9, gain: 0 }); this.roarLoop = true; }
      const gain = paused ? 0 : 0.7 * intensity * Math.pow(clamp01(1 - camDist / 320), 1.2) * (0.6 + 0.4 * this.params.intensity);
      audio.loopSet('beamRoar', { gain, cutoff: 420 + 1100 * intensity + 200 * Math.sin(this.visTime * 4), rate: 0.85 + 0.3 * intensity, pan });
    } else if (this.roarLoop) { audio.loopStop('beamRoar', 1.2); this.roarLoop = false; }
  }
}
