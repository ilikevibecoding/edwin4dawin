/**
 * Incoming threats.
 *
 * Fictional ballistic targets on curved arcs, plus harmless decoys for the
 * night raid. Trajectories are produced by forward-integrating the same physics
 * the sim uses and then translating the spawn point so the arc terminates near
 * the site - which means the predicted impact point shown to the player is
 * honest, and the arc reacts to drag exactly as the live update does.
 *
 * Nothing here models any real weapon. Speeds, altitudes, arcs and the "decoy"
 * behaviour are invented for readability and pacing.
 */

import * as THREE from 'three';
import { Pool } from './util/pool.js';
import {
  box, cyl, cone, sphere, chamferBox, panelBolts, SHARED,
} from './util/kit.js';
import {
  matThreatBody, matSteelDark, matHeat, matSteel, matEmissive, matHazardRed,
} from './util/materials.js';
import { glowSprite, paintedMetal } from './util/textures.js';
import {
  stepBallistic, orientAlong, timeToGround, predictBallistic, heatingFactor, G,
} from './physics.js';
import { THREAT, WORLD, SCENARIOS } from './config.js';
import { airDensity, clamp, clamp01, DEG, lerp, remap } from './util/mathx.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

export const THREAT_PHASE = {
  MIDCOURSE: 'MIDCOURSE',
  REENTRY: 'REENTRY',
  TERMINAL: 'TERMINAL',
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Fictional ballistic body: ogive nose, cylindrical section, aft skirt with a
 * nozzle, and four small stabilising fins. Modelled nose-up along +Y so the
 * physics can orient it by velocity directly.
 */
function buildThreatBody() {
  const g = new THREE.Group();
  const L = THREAT.bodyLength;
  const R = THREAT.bodyRadius;

  // Ogive nose from a lathe profile
  const nosePts = [];
  const noseLen = L * 0.3;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    // Tangent-ogive-ish curve, purely for silhouette.
    const r = R * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t, 1.7)));
    nosePts.push(new THREE.Vector2(Math.max(0.02, r), t * noseLen));
  }
  const noseGeo = new THREE.LatheGeometry(nosePts, 18);
  const nose = new THREE.Mesh(noseGeo, matHeat());
  nose.position.y = L * 0.5 - noseLen;
  nose.castShadow = true;
  g.add(nose);

  const body = cyl(R, L * 0.62, matThreatBody(), 0, L * 0.5 - noseLen - L * 0.31, 0, 18);
  g.add(body);
  // Section joints
  for (const ty of [0.16, -0.05, -0.26]) {
    const ring = cyl(R * 1.03, 0.07, matSteelDark(), 0, L * ty, 0, 18);
    g.add(ring);
  }
  // Aft skirt and nozzle
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.06, R * 0.94, L * 0.09, 18),
    matHeat(),
  );
  skirt.position.y = -L * 0.455;
  g.add(skirt);
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.34, R * 0.62, L * 0.08, 14, 1, true),
    matHeat(),
  );
  nozzle.position.y = -L * 0.52;
  g.add(nozzle);

  // Four clipped-delta fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(L * 0.11, -L * 0.02);
  finShape.lineTo(L * 0.1, L * 0.1);
  finShape.lineTo(0, L * 0.14);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: false });
  finGeo.translate(0, 0, -0.025);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, matSteelDark());
    fin.rotation.y = (i / 4) * Math.PI * 2;
    fin.position.set(
      Math.cos((i / 4) * Math.PI * 2) * R * 0.95, -L * 0.44,
      Math.sin((i / 4) * Math.PI * 2) * R * 0.95,
    );
    fin.rotation.y = -(i / 4) * Math.PI * 2 + Math.PI / 2;
    fin.castShadow = true;
    g.add(fin);
  }
  // Conduit raceway detail
  const race = box(R * 0.24, L * 0.5, R * 0.16, matSteelDark(), R * 0.98, -L * 0.1, 0);
  g.add(race);

  g.scale.setScalar(1);
  return g;
}

/** Decoy body: a light, unstable object that tumbles and burns. */
function buildDecoyBody() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), matSteelDark());
  g.add(core);
  // Crumpled panels
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = box(1.5, 0.06, 0.9, matSteel(), Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8);
    p.rotation.set(Math.random() * 0.8, a, Math.random() * 0.8);
    g.add(p);
  }
  const flare = new THREE.Mesh(SHARED.sphere, matEmissive('#ffd070', 4));
  flare.scale.setScalar(0.35);
  g.add(flare);
  g.userData.flare = flare;
  return g;
}

// ---------------------------------------------------------------------------
// Threat entity
// ---------------------------------------------------------------------------

let trackCounter = 0;

class Threat {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.impactPoint = new THREE.Vector3();
    this.spawnPos = new THREE.Vector3();

    this.group = new THREE.Group();
    this.group.visible = false;
    this.body = buildThreatBody();
    this.decoyBody = buildDecoyBody();
    this.decoyBody.visible = false;
    this.group.add(this.body);
    this.group.add(this.decoyBody);

    // Distance-compensated glow so a 9 m body stays visible at 40 km. Scene
    // fog is disabled here and replaced with altitude-aware haze, otherwise
    // distance fog erases the marker long before the target is close.
    const glowMat = new THREE.SpriteMaterial({
      map: glowSprite(128, 2.4), color: 0xffd9a0, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
      fog: false,
    });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.renderOrder = 14;
    this.glowMat = glowMat;
    this.group.add(this.glow);

    scene.add(this.group);

    this.alive = false;
    this.trail = null;
    this.id = null;
  }

  spawn({ pos, vel, impactPoint, isDecoy, speedTag, seed }) {
    this.pos.copy(pos);
    this.spawnPos.copy(pos);
    this.vel.copy(vel);
    this.impactPoint.copy(impactPoint);
    this.isDecoy = !!isDecoy;
    this.alive = true;
    this.age = 0;
    this.phase = THREAT_PHASE.MIDCOURSE;
    this.heat = 0;
    this.spin = (Math.random() - 0.5) * 0.6;
    this.tumble = new THREE.Vector3(
      (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4,
    );
    this.id = 'T' + String(++trackCounter).padStart(2, '0');
    this.detected = false;
    this.detectTimer = 0;
    this.engagedBy = null;
    this.resolved = false;
    this.resolution = null;
    this.classified = false;
    this.group.visible = true;
    this.body.visible = !this.isDecoy;
    this.decoyBody.visible = this.isDecoy;
    this.group.position.copy(this.pos);
    this.glowMat.color.set(this.isDecoy ? 0xffc060 : 0xffd9a0);
    return this;
  }

  despawn() {
    this.alive = false;
    this.group.visible = false;
    if (this.trail) {
      this.effects.retireTrail(this.trail);
      this.trail = null;
    }
  }

  get altitude() { return this.pos.y; }
  get speed() { return this.vel.length(); }

  /** Slant range from a world point. */
  rangeFrom(p) { return this.pos.distanceTo(p); }

  /** Simplified time-to-impact estimate for the HUD. */
  get timeToImpact() {
    const t = timeToGround(this.pos, this.vel);
    return t > 0 ? t : 0;
  }

  /** Fictional predicted impact point, refreshed from live state. */
  predictedImpact(out = new THREE.Vector3()) {
    const t = this.timeToImpact;
    return predictBallistic(this.pos, this.vel, t, out);
  }

  update(dt, camera) {
    this.age += dt;
    const drag = this.isDecoy ? THREAT.dragCoeff * 12 : THREAT.dragCoeff;
    stepBallistic(this.pos, this.vel, dt, drag);
    this.group.position.copy(this.pos);

    // Phase transitions are visual/gameplay staging, not a real flight profile.
    if (this.pos.y < THREAT.terminalAltitude) this.phase = THREAT_PHASE.TERMINAL;
    else if (this.pos.y < THREAT.glowAltitude) this.phase = THREAT_PHASE.REENTRY;
    else this.phase = THREAT_PHASE.MIDCOURSE;

    this.heat = heatingFactor(this.speed, this.pos.y);

    if (this.isDecoy) {
      // Decoys tumble: no attitude control, so they read as junk.
      this.body.visible = false;
      this.decoyBody.rotation.x += this.tumble.x * dt;
      this.decoyBody.rotation.y += this.tumble.y * dt;
      this.decoyBody.rotation.z += this.tumble.z * dt;
      this.effects.decoyFlare(this.pos, this.vel, dt);
    } else {
      orientAlong(this.group, this.vel);
      this.body.rotation.y += this.spin * dt;
      if (this.heat > 0.03) this.effects.reentryGlow(this.pos, this.vel, dt, this.heat);
    }

    // Trail: acquired lazily so a threat above the visible band costs nothing.
    if (!this.trail) {
      this.trail = this.effects.acquireTrail({
        width: this.isDecoy ? 2.2 : 4.6,
        life: this.isDecoy ? 7 : 16,
        colour: 0xdfe4ea,
        hot: this.isDecoy ? 0xffc060 : 0xff7a35,
        opacity: this.isDecoy ? 0.5 : 0.62,
        expand: 1.1,
        minPixels: 1.5,
        hotSpan: this.isDecoy ? 0.06 : 0.02,
      });
    }
    this.effects.followTrail(this.trail, this.pos, this.isDecoy ? 30 : 60);

    // Keep the marker glow at a readable on-screen size, dimmed by the amount
    // of atmosphere between it and the observer rather than by raw distance.
    const dist = camera.position.distanceTo(this.pos);
    const px = THREAT.minPixelScale * dist / 700;
    const s = Math.max(THREAT.bodyLength * 0.9, px * (this.isDecoy ? 5 : 9));
    this.glow.scale.setScalar(s);
    const haze = this.effects.hazeAt(this.pos);
    this.glowMat.opacity = clamp01(0.3 + this.heat * 0.8)
      * (this.isDecoy ? 0.85 : 1) * (1 - haze * 0.8);
    // Fade the detailed body out when it is too small to matter.
    const showBody = dist < 6000;
    this.body.visible = showBody && !this.isDecoy;
    this.decoyBody.visible = showBody && this.isDecoy;

    return this.pos.y <= WORLD.groundY;
  }
}

// ---------------------------------------------------------------------------
// Trajectory construction
// ---------------------------------------------------------------------------

/**
 * Build a descending arc that terminates at `impactPoint`.
 *
 * Integrates a candidate arc forward from a notional origin using the live
 * physics (drag included), then slides the spawn point so the arc lands on the
 * requested impact point. The result is a genuinely ballistic, drag-affected
 * path whose endpoint is known - so the sim and the HUD agree.
 */
export function buildThreatArc({ impactPoint, altitude, range, speed, bearing, isDecoy }) {
  // Descent angle that produces roughly the requested downrange distance.
  const gamma = Math.atan2(altitude, Math.max(1000, range));
  // Horizontal unit vector pointing from the threat toward the site.
  const toBase = new THREE.Vector3(-Math.sin(bearing), 0, Math.cos(bearing));
  const vel = new THREE.Vector3()
    .copy(toBase).multiplyScalar(Math.cos(gamma))
    .add(new THREE.Vector3(0, -Math.sin(gamma), 0))
    .multiplyScalar(speed);

  const drag = isDecoy ? THREAT.dragCoeff * 12 : THREAT.dragCoeff;
  const p = new THREE.Vector3(0, altitude, 0);
  const v = vel.clone();
  let t = 0;
  const dt = 0.05;
  while (p.y > 0 && t < 400) {
    stepBallistic(p, v, dt, drag);
    t += dt;
  }
  // p now holds the landing offset relative to the notional spawn.
  const spawn = new THREE.Vector3(
    impactPoint.x - p.x, altitude, impactPoint.z - p.z,
  );
  return { spawn, vel, flightTime: t, impactSpeed: v.length() };
}

/** Build the spawn schedule for a scenario. */
export function planScenario(scenarioId, rng) {
  const scen = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const spec = scen.threats[0];
  const count = Array.isArray(spec.count) ? rng.int(spec.count[0], spec.count[1]) : spec.count;
  const decoys = Array.isArray(spec.decoy) ? rng.int(spec.decoy[0], spec.decoy[1]) : spec.decoy;

  const total = count + decoys;
  const flags = [];
  for (let i = 0; i < count; i++) flags.push(false);
  for (let i = 0; i < decoys; i++) flags.push(true);
  // Keep the first arrival a real threat so the opening beat always matters.
  rng.shuffle(flags);
  const firstReal = flags.indexOf(false);
  if (firstReal > 0) { flags[firstReal] = flags[0]; flags[0] = false; }

  // Spread bearings so arcs are visually separated.
  const [b0, b1] = scen.bearing;
  const slots = [];
  for (let i = 0; i < total; i++) {
    const frac = total === 1 ? 0.5 : i / (total - 1);
    const centre = lerp(b0, b1, frac);
    slots.push(centre + rng.gauss(0, Math.min(14, Math.abs(b1 - b0) / (total * 2.2))));
  }
  rng.shuffle(slots);

  const [w0, w1] = scen.spawnWindow;
  const plan = [];
  for (let i = 0; i < total; i++) {
    const at = total === 1 ? w0 : w0 + (w1 - w0) * (i / (total - 1)) + rng.float(-0.6, 0.9);
    const impact = new THREE.Vector3(rng.gauss(0, 46), 0, rng.gauss(-20, 52));
    plan.push({
      at: Math.max(0.4, at),
      isDecoy: flags[i],
      bearing: slots[i] * DEG,
      altitude: rng.float(scen.altitude[0], scen.altitude[1]),
      range: rng.float(scen.range[0], scen.range[1]),
      speed: rng.float(scen.speed[0], scen.speed[1]),
      impactPoint: impact,
    });
  }
  plan.sort((a, b) => a.at - b.at);
  return { scenario: scen, plan, count, decoys };
}

// ---------------------------------------------------------------------------
// Threat manager
// ---------------------------------------------------------------------------

export class ThreatSystem {
  constructor(scene, effects, camera) {
    this.scene = scene;
    this.effects = effects;
    this.camera = camera;
    this.pool = new Pool(
      () => new Threat(scene, effects),
      (t) => t.despawn(),
      2, 10,
    );
    this.active = [];
    this.pending = [];
    this.resolvedThisFrame = [];
  }

  reset() {
    for (const t of [...this.active]) t.despawn();
    this.pool.releaseAll();
    this.active.length = 0;
    this.pending.length = 0;
    trackCounter = 0;
  }

  /** Load a scenario plan; threats spawn on their scheduled times. */
  load(plan) {
    this.pending = plan.map((p) => ({ ...p }));
  }

  get pendingCount() { return this.pending.length; }
  get activeCount() { return this.active.length; }

  spawnFrom(spec) {
    const arc = buildThreatArc(spec);
    const t = this.pool.acquire();
    if (!t) return null;
    t.spawn({
      pos: arc.spawn, vel: arc.vel, impactPoint: spec.impactPoint,
      isDecoy: spec.isDecoy,
    });
    t.flightTime = arc.flightTime;
    this.active.push(t);
    return t;
  }

  /**
   * @param {number} dt
   * @param {number} clock scenario time
   * @returns {{spawned: Threat[], impacted: Threat[]}}
   */
  update(dt, clock) {
    const spawned = [];
    while (this.pending.length && this.pending[0].at <= clock) {
      const spec = this.pending.shift();
      const t = this.spawnFrom(spec);
      if (t) spawned.push(t);
    }

    const impacted = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      const hitGround = t.update(dt, this.camera);
      if (hitGround) {
        impacted.push(t);
        this.active.splice(i, 1);
      }
    }
    return { spawned, impacted };
  }

  /** Remove a threat that was destroyed in flight. */
  destroy(threat) {
    const i = this.active.indexOf(threat);
    if (i >= 0) this.active.splice(i, 1);
    threat.despawn();
    this.pool.release(threat);
  }

  retire(threat) {
    const i = this.active.indexOf(threat);
    if (i >= 0) this.active.splice(i, 1);
    threat.despawn();
    this.pool.release(threat);
  }

  byId(id) { return this.active.find((t) => t.id === id) ?? null; }
}
