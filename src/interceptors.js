/**
 * Interceptors.
 *
 * Each round runs a staged visual flight profile - tip-off, boost, sustain,
 * midcourse coast, terminal - and steers with a limited-authority lead-pursuit
 * law toward a deliberately coarse predicted intercept point.
 *
 * The prediction is a gameplay abstraction, not a fire-control solution: it
 * assumes a drag-free target and a single average closing speed, then adds a
 * per-battery error term. Misses therefore happen for legible reasons (target
 * outside the battery's fictional envelope, hard crossing geometry, or fuel
 * exhaustion) rather than from a hidden probability roll.
 */

import * as THREE from 'three';
import { Pool } from './util/pool.js';
import {
  box, cyl, cone, chamferBox, SHARED,
} from './util/kit.js';
import {
  matMissileBody, matSteelDark, matHeat, matSteel, matEmissive, matHazardRed,
  matWhitePaint,
} from './util/materials.js';
import { glowSprite } from './util/textures.js';
import { makeFlame } from './effects.js';
import {
  stepBallistic, orientAlong, steerLeadPursuit, estimateInterceptPoint,
  interceptorFlightStep, closestApproach, G,
} from './physics.js';
import { WORLD } from './config.js';
import { airDensity, clamp, clamp01, lerp, DEG } from './util/mathx.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

export const PHASE = {
  TIPOFF: 'TIP-OFF',
  BOOST: 'BOOST',
  SUSTAIN: 'SUSTAIN',
  MIDCOURSE: 'MIDCOURSE',
  TERMINAL: 'TERMINAL',
  SPENT: 'COASTING',
};

export const OUTCOME = {
  KILL: 'KILL',
  MISS_FUEL: 'MISS_FUEL',
  MISS_PASS: 'MISS_PASS',
  MISS_GROUND: 'MISS_GROUND',
  ABORT: 'ABORT',
};

// ---------------------------------------------------------------------------
// Geometry - a slim two-stage interceptor, sized per battery
// ---------------------------------------------------------------------------

function buildInterceptorBody(scale = 1, hue = 0x7ef7bd) {
  const g = new THREE.Group();
  const L = 6.2 * scale;
  const R = 0.3 * scale;

  // Sharp conical nose with a seeker window
  const nosePts = [];
  const noseLen = L * 0.24;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    nosePts.push(new THREE.Vector2(Math.max(0.012, R * Math.pow(t, 0.72)), t * noseLen));
  }
  const nose = new THREE.Mesh(new THREE.LatheGeometry(nosePts, 16), matWhitePaint());
  nose.position.y = L * 0.5 - noseLen;
  g.add(nose);
  const seeker = new THREE.Mesh(SHARED.sphere, matEmissive(hue, 1.4));
  seeker.scale.setScalar(R * 0.42);
  seeker.position.y = L * 0.5 - noseLen * 0.12;
  g.add(seeker);

  // Forebody, midbody and aft section
  const fore = cyl(R, L * 0.3, matMissileBody(), 0, L * 0.5 - noseLen - L * 0.15, 0, 16);
  g.add(fore);
  const mid = cyl(R * 1.02, L * 0.3, matMissileBody(), 0, L * 0.5 - noseLen - L * 0.45, 0, 16);
  g.add(mid);
  const aft = cyl(R * 1.0, L * 0.2, matHeat(), 0, -L * 0.4, 0, 16);
  g.add(aft);
  // Section bands
  for (const ty of [0.2, 0.0, -0.22]) {
    g.add(cyl(R * 1.06, 0.05 * scale, matSteelDark(), 0, L * ty, 0, 16));
  }
  // Nozzle
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.42, R * 0.8, L * 0.09, 14, 1, true), matHeat(),
  );
  nozzle.position.y = -L * 0.51;
  g.add(nozzle);

  // Four forward control fins and four tail fins
  const finGeo = (span, chord, thick) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(chord, chord * 0.22);
    s.lineTo(chord * 0.86, chord + span * 0.12);
    s.lineTo(0, chord * 0.92);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
    geo.translate(0, 0, -thick / 2);
    return geo;
  };
  const ctrlGeo = finGeo(L * 0.1, L * 0.09, 0.035 * scale);
  const tailGeo = finGeo(L * 0.14, L * 0.13, 0.04 * scale);
  const fins = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const ctrl = new THREE.Mesh(ctrlGeo, matSteel());
    ctrl.position.set(Math.cos(a) * R * 0.95, L * 0.12, Math.sin(a) * R * 0.95);
    ctrl.rotation.y = -a + Math.PI / 2;
    g.add(ctrl);
    fins.push({ mesh: ctrl, axis: a, kind: 'ctrl' });

    const tail = new THREE.Mesh(tailGeo, matSteelDark());
    tail.position.set(Math.cos(a) * R * 0.98, -L * 0.42, Math.sin(a) * R * 0.98);
    tail.rotation.y = -a + Math.PI / 2;
    g.add(tail);
    fins.push({ mesh: tail, axis: a, kind: 'tail' });
  }
  // Cable raceway and a hazard band
  g.add(box(R * 0.22, L * 0.4, R * 0.14, matSteelDark(), R * 1.02, -L * 0.1, 0));
  g.add(cyl(R * 1.05, L * 0.03, matHazardRed(), 0, L * 0.28, 0, 16));

  g.userData.fins = fins;
  g.userData.length = L;
  return g;
}

// ---------------------------------------------------------------------------
// Interceptor entity
// ---------------------------------------------------------------------------

class Interceptor {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.accelCmd = new THREE.Vector3();
    this.aimPoint = new THREE.Vector3();

    this.group = new THREE.Group();
    this.group.visible = false;
    this.bodies = {};
    scene.add(this.group);

    // Distance-compensated exhaust glow. Scene fog is off for the same reason
    // as the threat markers: a burning motor at 20 km is a bright point, not a
    // fog-coloured smudge.
    const glowMat = new THREE.SpriteMaterial({
      map: glowSprite(128, 2.1), color: 0xfff0c8, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1,
      fog: false,
    });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.renderOrder = 15;
    this.glowMat = glowMat;
    this.group.add(this.glow);

    this.trail = null;
    this.alive = false;
  }

  /** Bodies are built lazily per battery scale and cached. */
  _bodyFor(def) {
    if (!this.bodies[def.id]) {
      const scale = def.id === 'vanguard' ? 0.85 : def.id === 'highlance' ? 1.25 : 1.7;
      const b = buildInterceptorBody(scale, def.hue);
      b.visible = false;
      this.group.add(b);
      const flame = makeFlame(0.34 * scale, 5.5 * scale, {
        hot: 0xfff8e8, mid: def.id === 'sentinel' ? 0xffb060 : 0xff8a2e,
      });
      flame.position.y = -b.userData.length * 0.52;
      flame.rotation.x = 0;
      b.add(flame);
      b.userData.flame = flame;
      this.bodies[def.id] = b;
    }
    return this.bodies[def.id];
  }

  launch({ def, position, direction, target, rng, batteryId }) {
    this.def = def;
    this.flight = def.flight;
    this.batteryId = batteryId;
    this.pos.copy(position);
    this.vel.copy(direction).multiplyScalar(38);
    this.accelCmd.set(0, 0, 0);
    this.target = target;
    this.targetId = target?.id ?? null;
    this.launchDir = direction.clone();
    this.padPos = position.clone();

    // Every field that survives a pool round-trip has to be cleared here, or a
    // recycled round inherits the previous engagement's termination state.
    this.age = 0;
    this.phase = PHASE.TIPOFF;
    this.alive = true;
    this.outcome = null;
    this.detonated = false;
    this.closing = 0;
    this.prevRange = Infinity;
    this.minRange = Infinity;
    this.passedTarget = false;
    this.orphanAt = undefined;
    this.sustainCut = false;
    this.solutionTime = 0;
    this.fuelLeft = def.flight.fuelTime;
    this.staged = def.flight.stageSeparation <= 0;
    this.guidanceBias = 1 + rng.gauss(0, 0.035);
    // Aim-point error, in metres, scaled by the battery's fictional accuracy.
    const n = def.guidanceNoise;
    this.aimError = new THREE.Vector3(
      rng.gauss(0, n * 40), rng.gauss(0, n * 40), rng.gauss(0, n * 40),
    );
    this.errorDecay = 0.42 + rng.float(0, 0.2);
    // Residual bias, tuned in tools/guidance-sim.mjs to land the batteries at
    // roughly 70% / 90% / 100% single-shot success against a clean solution.
    this.terminalBias = new THREE.Vector3(
      rng.gauss(0, n * 72), rng.gauss(0, n * 72), rng.gauss(0, n * 72),
    );

    for (const id in this.bodies) this.bodies[id].visible = false;
    this.body = this._bodyFor(def);
    this.body.visible = true;
    this.flame = this.body.userData.flame;
    this.flame.visible = true;
    this.flame.material.uniforms.uThrottle.value = 1;
    this.group.visible = true;
    this.group.position.copy(this.pos);
    orientAlong(this.group, this.vel);

    this.trail = this.effects.acquireTrail({
      width: def.trail.width,
      life: def.trail.life,
      colour: def.trail.colour,
      hot: 0xff9a3c,
      opacity: 0.8,
      expand: 1.7,
      minPixels: 1.6,
      hotSpan: 0.045,
    });
    this.glowMat.color.set(0xfff0c8);
    return this;
  }

  despawn() {
    this.alive = false;
    this.group.visible = false;
    if (this.body) this.body.visible = false;
    if (this.trail) { this.effects.retireTrail(this.trail); this.trail = null; }
  }

  get speed() { return this.vel.length(); }

  update(dt, camera) {
    const f = this.def.flight;

    // Stage separation: shed the booster mid-flight for visual variety.
    if (!this.staged && this.age >= f.stageSeparation) {
      this.staged = true;
      this.effects.puff(this.pos, _v1.copy(this.vel).normalize().multiplyScalar(-1), {
        size: 9, colour: 0xd6d0c4, count: 16, speed: 55,
      });
      this.effects.breakup(this.pos, _v1.copy(this.vel).multiplyScalar(0.55), {
        count: 4, size: 0.7, smoky: true, spread: 22,
      });
    }

    // Guidance and integration live in physics.js so the offline tuning
    // harness runs bit-identical flight code.
    const live = this.target && this.target.alive ? this.target : null;
    const res = interceptorFlightStep(this, dt, live);
    this.phase = res.phase;
    this.solutionTime = res.solutionTime;
    const latCmd = res.latCmd;
    const boosting = res.boosting;
    const thrust = res.thrust;
    const targetRange = res.range;
    const rho = airDensity(this.pos.y);

    this.group.position.copy(this.pos);
    orientAlong(this.group, this.vel);

    // Control fins deflect with the command: visible corrections, no jitter.
    const finAngle = clamp(latCmd / (f.terminalG * G) * 0.42, -0.42, 0.42);
    const cmdDir = this.accelCmd.lengthSq() > 1e-6
      ? _v3.copy(this.accelCmd).normalize() : _v3.set(0, 0, 0);
    for (const fin of this.body.userData.fins) {
      if (fin.kind !== 'ctrl') continue;
      // Project the command onto each fin's actuation axis.
      const ax = Math.cos(fin.axis), az = Math.sin(fin.axis);
      const proj = cmdDir.x * ax + cmdDir.z * az;
      fin.mesh.rotation.z = finAngle * proj * 2.2;
    }

    // --- effects -----------------------------------------------------------
    const burning = thrust > 0;
    if (this.flame) {
      const throttle = burning ? (boosting ? 1 : 0.42) : 0;
      const u = this.flame.material.uniforms;
      u.uThrottle.value = lerp(u.uThrottle.value, throttle, 1 - Math.exp(-dt * 9));
      u.uTime.value += dt;
      this.flame.visible = u.uThrottle.value > 0.02;
      // The plume expands in thin air.
      const bs = this.flame.userData.baseScale;
      const expand = lerp(1.9, 1.0, clamp01(rho * 1.5));
      this.flame.scale.set(bs.x * expand, bs.y * (0.7 + u.uThrottle.value * 0.6), bs.z * expand);
    }
    if (burning) {
      this.effects.exhaust(this.pos, this.vel, dt, {
        scale: this.def.plume.size * 0.5,
        rate: boosting ? 56 : 26,
        hotRate: boosting ? 30 : 12,
        colour: 0xc8c2b6,
        hotColour: this.def.plume.colour,
      });
      this.effects.padWash(this.padPos, this.pos, dt, this.def);
    }
    this.effects.followTrail(this.trail, this.pos, burning ? 26 : 48);

    const dist = camera.position.distanceTo(this.pos);
    const px = 2.6 * dist / 700;
    const s = Math.max(4, px * (burning ? 10 : 4));
    this.glow.scale.setScalar(s);
    const haze = this.effects.hazeAt(this.pos);
    this.glowMat.opacity = (burning ? 1 : 0.3) * (1 - haze * 0.75);

    // --- termination -------------------------------------------------------
    if (this.pos.y <= WORLD.groundY) {
      this.outcome = OUTCOME.MISS_GROUND;
      return true;
    }
    if (this.age > f.fuelTime + 26) {
      this.outcome = OUTCOME.MISS_FUEL;
      return true;
    }
    if (this.passedTarget && targetRange > this.def.fuseRadius * 40) {
      // Flew past without a fuse: no second chance at these closing rates.
      this.outcome = OUTCOME.MISS_PASS;
      return true;
    }
    if (!this.target || !this.target.alive) {
      // Target already resolved: fly on for a moment, then self-terminate.
      if (this.orphanAt === undefined) this.orphanAt = this.age;
      if (this.age - this.orphanAt > 2.4) {
        this.outcome = OUTCOME.ABORT;
        return true;
      }
    } else {
      this.orphanAt = undefined;
    }
    return false;
  }

  /**
   * Fuse check against the assigned target, using closest approach over the
   * step so a 3 km/s closing rate cannot tunnel through the warhead radius.
   */
  fuseCheck(dt) {
    if (!this.target || !this.target.alive) return null;
    const ca = closestApproach(this.pos, this.vel, this.target.pos, this.target.vel, dt);
    this.minRange = Math.min(this.minRange, ca.dist);
    const range = this.pos.distanceTo(this.target.pos);
    const opening = range > this.prevRange;
    this.prevRange = range;

    if (ca.dist <= this.def.fuseRadius) {
      return { hit: true, dist: ca.dist, t: ca.t };
    }
    // Passed the target without a fuse: this is a clean miss.
    if (opening && range < this.def.fuseRadius * 26 && this.minRange < this.def.fuseRadius * 20) {
      return { hit: false, dist: this.minRange, passed: true };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export class InterceptorSystem {
  constructor(scene, effects, camera) {
    this.scene = scene;
    this.effects = effects;
    this.camera = camera;
    this.pool = new Pool(
      () => new Interceptor(scene, effects),
      (m) => m.despawn(),
      2, 10,
    );
    this.active = [];
  }

  get activeCount() { return this.active.length; }

  reset() {
    for (const m of [...this.active]) m.despawn();
    this.pool.releaseAll();
    this.active.length = 0;
  }

  /**
   * Build every battery's round on every pooled slot up front. Interceptor
   * bodies and their flame shaders are created lazily per battery, and doing
   * that at launch time costs a visible hitch.
   */
  prewarm(defs) {
    for (const item of [...this.pool.free, ...this.pool.live]) {
      for (const def of defs) item._bodyFor(def);
    }
  }

  launch(opts) {
    const m = this.pool.acquire();
    if (!m) return null;
    m.launch(opts);
    this.active.push(m);
    return m;
  }

  /**
   * @returns {{kills: Array, misses: Array}} events for the game loop
   */
  update(dt, camera) {
    const kills = [];
    const misses = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      const fuse = m.fuseCheck(dt);
      if (fuse && fuse.hit) {
        // Detonate at the closest-approach point along the step.
        _v1.copy(m.pos).addScaledVector(m.vel, fuse.t);
        m.outcome = OUTCOME.KILL;
        kills.push({ interceptor: m, threat: m.target, point: _v1.clone(), dist: fuse.dist });
        this.active.splice(i, 1);
        m.despawn();
        this.pool.release(m);
        continue;
      }
      if (fuse && fuse.passed) {
        m.passedTarget = true;
      }
      const done = m.update(dt, camera);
      if (done) {
        misses.push({ interceptor: m, threat: m.target, outcome: m.outcome, minRange: m.minRange });
        this.active.splice(i, 1);
        m.despawn();
        this.pool.release(m);
      }
    }
    return { kills, misses };
  }

  /** Rounds currently guiding on a given track. */
  countOnTarget(threatId) {
    let n = 0;
    for (const m of this.active) if (m.targetId === threatId) n++;
    return n;
  }
}
