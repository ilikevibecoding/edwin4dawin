// Interceptor missiles: procedural airframes per battery family, staged
// boost/sustain/divert flight, simplified proportional-navigation guidance and
// proximity fuzing. Every number is a fictional gameplay value.

import * as THREE from 'three';
import { BATTERY_BY_ID, WORLD } from './config.js';
import { materials, std } from './util/materials.js';
import { chamferBox, mergeParts, transform, latheProfile, cylinder, ribbedTube } from './util/geom.js';
import { integrateBody, proNav, alignToVelocity, leadSolution, closestApproach, trailPersistence, machNumber } from './physics.js';
import { GlowSprite } from './util/billboard.js';
import { flareSprite } from './util/textures.js';
import { bus, state } from './state.js';

export const FLIGHT = {
  BOOST: 'BOOST',
  SUSTAIN: 'SUSTAIN',
  MANEUVER: 'MANEUVER',
  TERMINAL: 'TERMINAL',
  SPENT: 'SPENT',
};

let nextId = 1;

/** Slim two-stage terminal interceptor. */
function buildPatriotRound() {
  const mats = materials();
  const parts = [];
  parts.push({
    geometry: latheProfile(
      [
        [0.001, 2.9],
        [0.05, 2.86],
        [0.12, 2.66],
        [0.2, 2.3],
        [0.25, 1.85],
        [0.27, 1.4],
      ],
      18
    ),
  });
  parts.push({ geometry: ribbedTube(3.0, 0.27, 4, 1.06, 18), matrix: transform({ pos: [0, -0.1, 0] }) });
  parts.push({ geometry: cylinder(0.27, 0.23, 0.36, 18), matrix: transform({ pos: [0, -1.78, 0] }) });
  // nozzle
  parts.push({
    geometry: latheProfile(
      [
        [0.05, 0],
        [0.16, -0.06],
        [0.21, -0.22],
        [0.16, -0.24],
        [0.05, -0.1],
      ],
      14
    ),
    matrix: transform({ pos: [0, -1.94, 0] }),
  });
  // mid-body control fins + tail fins
  const fin = chamferBox(0.035, 0.42, 0.3, 0.01);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push({ geometry: fin, matrix: transform({ pos: [Math.cos(a) * 0.3, 1.05, Math.sin(a) * 0.3], rot: [0, -a, 0] }) });
  }
  const tail = chamferBox(0.04, 0.62, 0.44, 0.01);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push({ geometry: tail, matrix: transform({ pos: [Math.cos(a) * 0.36, -1.4, Math.sin(a) * 0.36], rot: [0, -a, 0] }) });
  }
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  const m = new THREE.Mesh(g, mats.interceptorSkin);
  return m;
}

/** Tall high-altitude round with a separating kill stage. */
function buildThaadRound() {
  const mats = materials();
  const parts = [];
  parts.push({
    geometry: latheProfile(
      [
        [0.001, 3.9],
        [0.07, 3.8],
        [0.14, 3.5],
        [0.2, 3.05],
        [0.26, 2.5],
        [0.3, 1.9],
      ],
      18
    ),
  });
  parts.push({ geometry: ribbedTube(4.0, 0.3, 5, 1.05, 18), matrix: transform({ pos: [0, -0.1, 0] }) });
  parts.push({ geometry: cylinder(0.3, 0.24, 0.4, 18), matrix: transform({ pos: [0, -2.3, 0] }) });
  parts.push({
    geometry: latheProfile(
      [
        [0.06, 0],
        [0.2, -0.08],
        [0.26, -0.3],
        [0.2, -0.33],
        [0.06, -0.14],
      ],
      14
    ),
    matrix: transform({ pos: [0, -2.5, 0] }),
  });
  // divert thruster ports around the nose section
  const port = cylinder(0.035, 0.035, 0.06, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push({ geometry: port, matrix: transform({ pos: [Math.cos(a) * 0.2, 3.1, Math.sin(a) * 0.2], rot: [Math.PI / 2, 0, -a] }) });
  }
  const strake = chamferBox(0.03, 1.5, 0.14, 0.008);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push({ geometry: strake, matrix: transform({ pos: [Math.cos(a) * 0.34, 0.4, Math.sin(a) * 0.34], rot: [0, -a, 0] }) });
  }
  const tail = chamferBox(0.04, 0.5, 0.5, 0.01);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push({ geometry: tail, matrix: transform({ pos: [Math.cos(a) * 0.4, -1.95, Math.sin(a) * 0.4], rot: [0, -a, 0] }) });
  }
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return new THREE.Mesh(g, mats.interceptorSkin);
}

/** Fictional Sentinel test round: large first stage, wide skirt, long body. */
function buildSentinelRound() {
  const mats = materials();
  const parts = [];
  parts.push({
    geometry: latheProfile(
      [
        [0.001, 5.4],
        [0.1, 5.3],
        [0.22, 4.95],
        [0.32, 4.45],
        [0.4, 3.85],
        [0.46, 3.2],
      ],
      20
    ),
  });
  parts.push({ geometry: ribbedTube(3.4, 0.46, 4, 1.04, 20), matrix: transform({ pos: [0, 1.5, 0] }) });
  parts.push({ geometry: cylinder(0.46, 0.56, 0.5, 20), matrix: transform({ pos: [0, -0.45, 0] }) });
  parts.push({ geometry: ribbedTube(2.6, 0.56, 3, 1.04, 20), matrix: transform({ pos: [0, -2.0, 0] }) });
  parts.push({ geometry: cylinder(0.56, 0.44, 0.5, 20), matrix: transform({ pos: [0, -3.55, 0] }) });
  parts.push({
    geometry: latheProfile(
      [
        [0.1, 0],
        [0.34, -0.14],
        [0.46, -0.55],
        [0.34, -0.6],
        [0.1, -0.24],
      ],
      16
    ),
    matrix: transform({ pos: [0, -3.85, 0] }),
  });
  const strake = chamferBox(0.05, 2.4, 0.2, 0.01);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push({ geometry: strake, matrix: transform({ pos: [Math.cos(a) * 0.5, 1.5, Math.sin(a) * 0.5], rot: [0, -a, 0] }) });
  }
  const tail = chamferBox(0.06, 0.9, 0.8, 0.012);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push({ geometry: tail, matrix: transform({ pos: [Math.cos(a) * 0.7, -3.2, Math.sin(a) * 0.7], rot: [0, -a, 0] }) });
  }
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return new THREE.Mesh(g, mats.interceptorSkin);
}

const BUILDERS = {
  PATRIOT: buildPatriotRound,
  THAAD: buildThaadRound,
  SENTINEL: buildSentinelRound,
};

export class Interceptor {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.bodies = {};
    for (const [id, build] of Object.entries(BUILDERS)) {
      const m = build();
      m.visible = false;
      this.group.add(m);
      this.bodies[id] = m;
    }
    this.glow = new GlowSprite(flareSprite(256), 0xfff0c0, 0.0038, 1.6);
    scene.add(this.glow.mesh);

    // Bright exhaust cone welded to the tail.
    const coneGeo = new THREE.ConeGeometry(1, 1, 14, 1, true);
    coneGeo.translate(0, -0.5, 0);
    this.plumeMat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
        uTime: { value: 0 },
        uColorHot: { value: new THREE.Color(1.0, 0.95, 0.8) },
        uColorCool: { value: new THREE.Color(1.0, 0.42, 0.12) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vP;
        void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv; varying vec3 vP;
        uniform float uIntensity; uniform float uTime; uniform vec3 uColorHot; uniform vec3 uColorCool;
        void main(){
          float along = clamp(-vP.y, 0.0, 1.0);
          float shock = 0.75 + 0.25 * sin(along * 34.0 - uTime * 60.0);
          vec3 c = mix(uColorHot, uColorCool, pow(along, 0.7));
          float a = (1.0 - along) * uIntensity * shock;
          a *= smoothstep(0.0, 0.12, 1.0 - along);
          if (a < 0.004) discard;
          gl_FragColor = vec4(c, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    this.plume = new THREE.Mesh(coneGeo, this.plumeMat);
    this.group.add(this.plume);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mass = 1;
    this.cdA = 3e-5;
    this.alive = false;
    this.lastCmd = null;
    this.predicted = new THREE.Vector3();
  }

  launch(cfg) {
    this.id = nextId++;
    this.label = `I${String(this.id).padStart(2, '0')}`;
    this.cfg = BATTERY_BY_ID[cfg.batteryId];
    this.batteryId = cfg.batteryId;
    this.pos.copy(cfg.pos);
    this.vel.copy(cfg.dir).normalize().multiplyScalar(38);
    this.target = cfg.target;
    this.targetId = cfg.target ? cfg.target.id : null;
    this.trackId = cfg.trackId;
    this.alive = true;
    this.age = 0;
    this.flight = FLIGHT.BOOST;
    this.cdA = this.cfg.dragK;
    this.lastCmd = null;
    this.detonated = false;
    this.missDistance = Infinity;
    this.minRange = Infinity;
    this.reason = null;
    this.maxLife = 60;
    this.divertBudget = 1;
    // Fly the rail direction before guidance takes over, like a real launch.
    this.launchAxis = cfg.dir.clone().normalize();
    this.straightTime = 0.55 + this.cfg.boostTime * 0.22;

    for (const [id, m] of Object.entries(this.bodies)) m.visible = id === this.batteryId;
    this.group.visible = true;
    this.group.position.copy(this.pos);
    this.glow.mesh.visible = true;
    this.glow.setColor(this.cfg.color);

    const plumeLen = 9 * this.cfg.plumeScale;
    this.plume.scale.set(1.1 * this.cfg.plumeScale, plumeLen, 1.1 * this.cfg.plumeScale);
    this.plume.position.y = -1.8 * this.cfg.plumeScale;

    this.trail = this.effects.acquireTrail({
      grow: 1.35,
      fade: 0.026,
      minStep: 12,
    });
    this.hotTrail = this.effects.acquireHotTrail({ grow: 0.6, fade: 2.6, minStep: 6, emissive: 1 });
    bus.emit('interceptor:launch', this);
    return this;
  }

  release() {
    this.alive = false;
    this.group.visible = false;
    this.glow.mesh.visible = false;
    if (this.trail) {
      this.trail.detach();
      this.trail = null;
    }
    if (this.hotTrail) {
      this.hotTrail.detach();
      this.hotTrail = null;
    }
  }

  get thrustNow() {
    const c = this.cfg;
    if (this.age < c.boostTime) {
      // A short ramp keeps the launch from snapping to full thrust.
      return c.boostThrust * Math.min(1, 0.35 + this.age / 0.4);
    }
    if (this.age < c.boostTime + c.sustainTime) return c.sustainThrust;
    return 0;
  }

  update(dt, camera, time) {
    if (!this.alive) return;
    this.age += dt;
    const c = this.cfg;

    // ---- flight phase ------------------------------------------------
    const prev = this.flight;
    if (this.age < c.boostTime) this.flight = FLIGHT.BOOST;
    else if (this.age < c.boostTime + c.sustainTime) this.flight = FLIGHT.SUSTAIN;
    else this.flight = FLIGHT.MANEUVER;

    const tgtAlive = this.target && this.target.alive;
    let toGo = Infinity;
    if (tgtAlive) {
      toGo = this.pos.distanceTo(this.target.pos);
      // Endgame starts early enough that divert authority can still matter.
      if (toGo < 4200) this.flight = FLIGHT.TERMINAL;
    }
    if (prev !== this.flight) {
      if (this.flight === FLIGHT.SUSTAIN) {
        this.effects.puff(this.pos.clone(), 6 * c.plumeScale, 0xd8d2c8, 6);
      }
      bus.emit('interceptor:phase', this);
    }

    // ---- guidance ----------------------------------------------------
    const accel = new THREE.Vector3();
    const speed = this.vel.length();
    const fwd = speed > 1e-3 ? this.vel.clone().multiplyScalar(1 / speed) : new THREE.Vector3(0, 1, 0);

    let thrust = this.thrustNow;
    // Soft speed limit rather than a hard clamp so acceleration stays smooth.
    if (speed > c.maxSpeed * 0.94) thrust *= Math.max(0, 1 - (speed - c.maxSpeed * 0.94) / (c.maxSpeed * 0.12));
    accel.addScaledVector(fwd, thrust);

    if (tgtAlive) {
      // Predict with a characteristic flight speed, not the instantaneous one:
      // a round still on the rail would otherwise solve for a nonsense point.
      const speedRef = THREE.MathUtils.clamp(speed, c.maxSpeed * 0.62, c.maxSpeed);
      const tti = leadSolution(this.pos, speedRef, this.target.pos, this.target.vel, this.predicted, 0.35, 5);
      const predGround = this.effects.groundAt(this.predicted.x, this.predicted.z);
      if (this.predicted.y < predGround + 80) this.predicted.y = predGround + 80;
      this.timeToGo = tti;
      // Turn authority is limited by turn RATE, not just lateral g: a slow round
      // just off the rail physically cannot swing onto a new heading.
      // Divert thrusters give the kill stage far more authority than the
      // aerodynamic phases; this is a fictional but stable balance.
      const terminal = this.flight === FLIGHT.TERMINAL;
      const turnRate = terminal ? 1.6 : this.flight === FLIGHT.BOOST ? 0.5 : 0.8;
      const maxLat = Math.min(
        c.maxLateralG * 9.81 * (terminal ? 2.4 : 1),
        turnRate * Math.max(60, speed)
      );
      const cmd = new THREE.Vector3();
      if (this.age < this.straightTime) {
        // Hold the rail attitude; only damp any drift off the launch axis.
        const err = this.launchAxis.clone().sub(fwd);
        cmd.copy(err).multiplyScalar(maxLat * 0.5);
      } else {
        // Proportional navigation on the real target. The arc comes from the
        // launcher's loft angle, not from an artificial aim offset; a gravity
        // bias term keeps the round from sagging below the collision course.
        proNav(this, this.target.pos, this.target.vel, 4.0, maxLat * 0.94, dt, cmd);
        cmd.y += 9.81;
      }
      // Terrain guard: never let guidance fly the round into the deck.
      const ground = this.effects.groundAt(this.pos.x, this.pos.z);
      const agl = this.pos.y - ground;
      if (agl < 700 && this.vel.y < 40) {
        const pull = THREE.MathUtils.clamp(1 - agl / 700, 0, 1);
        cmd.y += pull * maxLat * 1.1;
      }
      accel.add(cmd);
      this.lastLateral = cmd.length();
    } else {
      this.lastLateral = 0;
      if (!this.detonated && this.age > 1.5) {
        // Target already gone: fly ballistic then scuttle.
        if (this.age > this.selfDestructAt || 0) {
          /* handled below */
        }
      }
    }

    const before = this.pos.clone();
    integrateBody(this, dt, accel);

    // ---- proximity fuze ---------------------------------------------
    if (tgtAlive) {
      const ca = closestApproach(before, this.vel, this.target.pos, this.target.vel, dt);
      const dist = Math.min(ca.dist, this.pos.distanceTo(this.target.pos));
      this.missDistance = Math.min(this.missDistance, dist);
      if (dist <= c.fuzeRadius) {
        this.detonate(dist, camera);
        return;
      }
      // Range opened back up after the closest point: the round has flown past.
      const range = this.pos.distanceTo(this.target.pos);
      this.minRange = Math.min(this.minRange === undefined ? Infinity : this.minRange, range);
      if (this.age > 4 && range > this.minRange + Math.max(200, c.fuzeRadius * 6)) {
        this.fail('MISS_PASSED', camera);
        return;
      }
    }

    // ---- lifetime ----------------------------------------------------
    if (this.pos.y < this.effects.groundAt(this.pos.x, this.pos.z) + 1) {
      this.fail('MISS_GROUND', camera);
      return;
    }
    if (this.age > this.maxLife || (!tgtAlive && this.age > c.boostTime + c.sustainTime + 4)) {
      this.fail(tgtAlive ? 'MISS_ENERGY' : 'NO_TARGET', camera);
      return;
    }

    // ---- presentation ------------------------------------------------
    this.group.position.copy(this.pos);
    alignToVelocity(this.group, this.vel, dt, this.flight === FLIGHT.BOOST ? 5 : 8, this.lastCmd, 0.006);
    const dist = this.pos.distanceTo(camera.position);
    const boost = THREE.MathUtils.clamp(dist / 1100, 1, 8);
    this.group.scale.setScalar(boost);

    const burning = thrust > 1;
    this.plumeMat.uniforms.uIntensity.value = burning ? (this.flight === FLIGHT.BOOST ? 1.0 : 0.42) : 0;
    this.plumeMat.uniforms.uTime.value = time;
    this.plume.visible = burning;

    this.glow.mesh.position.copy(this.pos);
    this.glow.update(camera, burning ? (this.flight === FLIGHT.BOOST ? 1.5 : 0.8) : 0.35);
    this.glow.opacity = burning ? 1 : 0.4;

    const persist = trailPersistence(this.pos.y);
    const tangent = fwd;
    const widthScale = Math.max(1, dist * 0.0007);
    if (this.trail) {
      this.trail.push(
        this.pos,
        tangent,
        this.effects.time,
        c.trailWidth * widthScale * (0.5 + persist * 0.9),
        (burning ? 0.62 : 0.2) * (0.2 + persist),
        new THREE.Color(0.88, 0.87, 0.85)
      );
    }
    if (this.hotTrail && burning) {
      this.hotTrail.push(this.pos, tangent, this.effects.time, c.trailWidth * 0.55 * widthScale, 0.9, new THREE.Color(1.0, 0.72, 0.35));
    }
    if (burning) {
      this.effects.exhaust(this.pos, this.vel, {
        scale: c.plumeScale * (this.flight === FLIGHT.BOOST ? 1 : 0.5),
        dt,
        rate: this.flight === FLIGHT.BOOST ? 1.4 : 0.7,
        boosting: true,
        backDir: fwd.clone().multiplyScalar(-1),
        smokeColor: 0xc8c4be,
      });
    }
    // Divert-thruster puffs make the control corrections visible.
    if (this.flight === FLIGHT.TERMINAL && this.lastLateral > 30 && Math.random() < dt * 26) {
      const side = new THREE.Vector3().crossVectors(fwd, this.lastCmd || fwd).normalize();
      this.effects.glowPuff(this.pos.clone().addScaledVector(side, 1.5 * boost), 3 * boost, 0.18, 0xfff0d0, 0.8);
    }
  }

  detonate(dist, camera) {
    this.detonated = true;
    const c = this.cfg;
    const lethal = c.fuzeRadius * 0.7;
    const hit = dist <= lethal || (dist <= c.fuzeRadius && Math.random() < 0.72);
    this.missDistance = dist;
    this.reason = hit ? 'HIT' : 'MISS_FUZE';
    this.effects.intercept(
      this.pos.clone(),
      (hit ? 30 : 18) * c.warheadYield,
      camera,
      { hot: new THREE.Color(1, 0.97, 0.88), mid: new THREE.Color(1, 0.55, 0.16), cool: new THREE.Color(0.1, 0.09, 0.09) }
    );
    bus.emit('interceptor:detonate', { interceptor: this, hit, dist });
    this.release();
  }

  fail(reason, camera) {
    this.reason = reason;
    this.detonated = true;
    this.effects.intercept(this.pos.clone(), 14, camera, {
      hot: new THREE.Color(1, 0.9, 0.75),
      mid: new THREE.Color(0.95, 0.45, 0.14),
      cool: new THREE.Color(0.1, 0.09, 0.09),
    });
    bus.emit('interceptor:detonate', { interceptor: this, hit: false, dist: this.missDistance, reason });
    this.release();
  }
}

export class InterceptorManager {
  constructor(scene, effects, poolSize = 8) {
    this.pool = [];
    for (let i = 0; i < poolSize; i++) this.pool.push(new Interceptor(scene, effects));
    this.active = [];
    this.effects = effects;
    this.time = 0;
  }

  launch(cfg) {
    const m = this.pool.find((p) => !p.alive);
    if (!m) return null;
    m.launch(cfg);
    this.active.push(m);
    state.stats.launched++;
    return m;
  }

  update(dt, camera) {
    this.time += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      m.update(dt, camera, this.time);
      if (!m.alive) this.active.splice(i, 1);
    }
    state.stats.inFlight = this.active.length;
  }

  clear() {
    for (const m of this.active) m.release();
    this.active.length = 0;
  }
}
