// Incoming ballistic threats and decoys: procedural re-entry bodies, ballistic
// arcs with a simplified drag model, visual boost/coast/re-entry/terminal phases
// and pooled trails. All figures are fictional and tuned for readability.

import * as THREE from 'three';
import { THREAT, WORLD, SCENARIO_BY_ID } from './config.js';
import { materials, std, applyAtmosphere } from './util/materials.js';
import { chamferBox, mergeParts, transform, latheProfile, cylinder } from './util/geom.js';
import { integrateBody, ballisticLaunchVelocity, alignToVelocity, trailPersistence, machNumber } from './physics.js';
import { GlowSprite } from './util/billboard.js';
import { flareSprite, softSprite, stencilDecal } from './util/textures.js';
import { bus, state } from './state.js';

export const PHASE = {
  MIDCOURSE: 'MIDCOURSE',
  REENTRY: 'REENTRY',
  TERMINAL: 'TERMINAL',
  DESTROYED: 'DESTROYED',
};

let nextId = 1;

function buildReentryBody() {
  const mats = materials();
  const parts = [];
  // Blunted cone nose (fictional profile)
  parts.push({
    geometry: latheProfile(
      [
        [0.001, 1.55],
        [0.1, 1.5],
        [0.24, 1.28],
        [0.38, 0.95],
        [0.48, 0.55],
        [0.52, 0.0],
      ],
      20
    ),
  });
  parts.push({ geometry: cylinder(0.52, 0.5, 1.4, 20), matrix: transform({ pos: [0, -0.7, 0] }) });
  parts.push({ geometry: cylinder(0.5, 0.34, 0.5, 20), matrix: transform({ pos: [0, -1.65, 0] }) });
  // aft skirt ring
  parts.push({ geometry: new THREE.TorusGeometry(0.5, 0.035, 5, 20), matrix: transform({ pos: [0, -1.38, 0], rot: [Math.PI / 2, 0, 0] }) });
  // small stabiliser strakes
  const fin = chamferBox(0.055, 0.62, 0.34, 0.012);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push({
      geometry: fin,
      matrix: transform({ pos: [Math.cos(a) * 0.55, -1.35, Math.sin(a) * 0.55], rot: [0, -a, 0] }),
    });
  }
  const geo = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  const mesh = new THREE.Mesh(geo, mats.threatSkin);
  mesh.castShadow = false;
  return mesh;
}

function buildDecoyBody() {
  const mats = materials();
  const parts = [];
  parts.push({ geometry: new THREE.IcosahedronGeometry(0.42, 1) });
  parts.push({ geometry: cylinder(0.12, 0.12, 0.9, 8), matrix: transform({ pos: [0, -0.55, 0] }) });
  const vane = chamferBox(0.5, 0.5, 0.02, 0.01);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push({ geometry: vane, matrix: transform({ pos: [Math.cos(a) * 0.35, -0.9, Math.sin(a) * 0.35], rot: [0.5, -a, 0] }) });
  }
  const geo = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  const m = new THREE.Mesh(geo, mats.galv);
  return m;
}

/** Hot plasma sheath that wraps the nose during re-entry. */
function buildPlasmaSheath() {
  const geo = new THREE.SphereGeometry(1, 20, 14);
  geo.scale(1.0, 1.5, 1.0);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uIntensity: { value: 0 },
      uColorA: { value: new THREE.Color(0.75, 0.86, 1.0) },
      uColorB: { value: new THREE.Color(1.0, 0.55, 0.24) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP;
      void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vN; varying vec3 vP;
      uniform float uIntensity; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uTime;
      void main(){
        float rim = pow(1.0 - abs(vN.z), 2.0);
        float front = smoothstep(-0.2, 1.3, vP.y);
        float flick = 0.85 + 0.15 * sin(uTime * 40.0 + vP.y * 6.0);
        vec3 c = mix(uColorB, uColorA, front);
        float a = (rim * 0.7 + front * 0.55) * uIntensity * flick;
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
  return new THREE.Mesh(geo, mat);
}

export class Threat {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.bodyRV = buildReentryBody();
    this.bodyDecoy = buildDecoyBody();
    this.group.add(this.bodyRV);
    this.group.add(this.bodyDecoy);

    this.sheath = buildPlasmaSheath();
    this.sheath.position.y = 0.1;
    this.group.add(this.sheath);

    this.glow = new GlowSprite(flareSprite(256), 0xffb070, 0.0032, 1.2);
    scene.add(this.glow.mesh);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mass = 1;
    this.cdA = THREAT.cdA;
    this.alive = false;
    this.id = 0;
    this.trail = null;
    this.hotTrail = null;
  }

  spawn(cfg) {
    this.id = nextId++;
    this.label = `${cfg.kind === 'DECOY' ? 'X' : 'T'}${String(this.id).padStart(2, '0')}`;
    this.kind = cfg.kind;
    this.pos.copy(cfg.pos);
    this.vel.copy(cfg.vel);
    this.impactPoint = cfg.impactPoint.clone();
    this.spawnTime = cfg.time;
    this.alive = true;
    this.phase = PHASE.MIDCOURSE;
    this.destroyed = false;
    this.assigned = false;
    this.weavePhase = cfg.weavePhase || 0;
    this.weaveAmp = cfg.weaveAmp || 0;
    this.cdA = cfg.kind === 'DECOY' ? THREAT.decoyCdA : THREAT.cdA;
    this.rcs = cfg.kind === 'DECOY' ? THREAT.rcs.DECOY : THREAT.rcs.RV;
    this.scaleBoost = 1;
    this.age = 0;
    this.lastCmd = null;

    const isDecoy = cfg.kind === 'DECOY';
    this.bodyRV.visible = !isDecoy;
    this.bodyDecoy.visible = isDecoy;
    this.sheath.visible = !isDecoy;
    this.group.visible = true;
    this.glow.mesh.visible = true;
    this.glow.setColor(isDecoy ? 0x9fd8ff : 0xffb070);
    this.glow.angular = isDecoy ? 0.0018 : 0.0032;
    this.glow.opacity = 0.9;

    const persist = trailPersistence(this.pos.y);
    this.trail = this.effects.acquireTrail({
      grow: 0.85,
      fade: 0.028 + (1 - persist) * 0.05,
      minStep: 26,
    });
    this.hotTrail = this.effects.acquireHotTrail({ grow: 0.4, fade: 1.5, minStep: 12, emissive: 1 });
    bus.emit('threat:spawn', this);
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

  get altitude() {
    return this.pos.y;
  }

  get speed() {
    return this.vel.length();
  }

  update(dt, camera, time) {
    if (!this.alive) return;
    this.age += dt;

    // Terminal-phase weave: a slow, readable S-turn, never twitchy.
    let extra = null;
    if (this.phase === PHASE.TERMINAL && this.weaveAmp > 0) {
      const w = Math.sin(time * THREAT.weaveRate * Math.PI * 2 + this.weavePhase) * this.weaveAmp;
      const side = new THREE.Vector3(-this.vel.z, 0, this.vel.x).normalize();
      extra = side.multiplyScalar(w * 34);
    }
    integrateBody(this, dt, extra);

    // ---- phase transitions ------------------------------------------
    const prev = this.phase;
    if (this.pos.y < THREAT.terminalAlt) this.phase = PHASE.TERMINAL;
    else if (this.pos.y < THREAT.reentryAlt) this.phase = PHASE.REENTRY;
    else this.phase = PHASE.MIDCOURSE;
    if (prev !== this.phase) bus.emit('threat:phase', this);

    // ---- presentation -----------------------------------------------
    this.group.position.copy(this.pos);
    alignToVelocity(this.group, this.vel, dt, 6);
    const dist = this.pos.distanceTo(camera.position);
    // Readability boost: distant bodies are drawn larger than life.
    this.scaleBoost = THREE.MathUtils.clamp(dist / 900, 1, 9);
    this.group.scale.setScalar(this.scaleBoost * (this.kind === 'DECOY' ? 0.8 : 1));

    this.glow.mesh.position.copy(this.pos);
    const mach = machNumber(this.speed, this.pos.y);
    const heat = THREE.MathUtils.clamp((mach - 2.2) / 3.4, 0, 1) * THREE.MathUtils.clamp(1 - this.pos.y / 12000, 0.05, 1);
    this.glow.update(camera, 1 + heat * 0.9);
    this.glow.opacity = this.kind === 'DECOY' ? 0.55 : 0.55 + heat * 0.75;

    if (this.sheath.visible) {
      this.sheath.material.uniforms.uIntensity.value = heat * 1.5;
      this.sheath.material.uniforms.uTime.value = time;
      this.sheath.scale.setScalar(1 + heat * 0.5);
    }

    // ---- trails ------------------------------------------------------
    const persist = trailPersistence(this.pos.y);
    const tangent = this.vel.clone().normalize();
    const widthScale = Math.max(1, dist * 0.00075);
    if (this.trail) {
      const col = this.kind === 'DECOY' ? new THREE.Color(0.62, 0.68, 0.74) : new THREE.Color(0.72, 0.7, 0.68);
      this.trail.push(this.pos, tangent, this.effects.time, 1.6 * widthScale * (0.6 + persist), 0.5 * (0.25 + persist * 0.9), col);
    }
    if (this.hotTrail && heat > 0.05) {
      this.hotTrail.push(
        this.pos,
        tangent,
        this.effects.time,
        1.1 * widthScale * (0.6 + heat),
        heat * 0.85,
        new THREE.Color(1.0, 0.55 + heat * 0.3, 0.25)
      );
    }
    if (heat > 0.25 && this.kind !== 'DECOY') this.effects.ablation(this.pos, this.vel, heat);
  }
}

export class ThreatManager {
  constructor(scene, effects, poolSize = 12) {
    this.scene = scene;
    this.effects = effects;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) this.pool.push(new Threat(scene, effects));
    this.active = [];
    this.waves = [];
    this.time = 0;
    this.scenario = null;
    this.rng = null;
    this.spawnPlan = [];
  }

  startScenario(scenarioId, rng, time = 0) {
    const scn = SCENARIO_BY_ID[scenarioId];
    this.scenario = scn;
    this.rng = rng;
    this.time = time;
    this.spawnPlan.length = 0;
    for (const t of this.active) t.release();
    this.active.length = 0;

    // Build the spawn plan up front: deterministic per seed, varied per run.
    let idx = 0;
    for (const wave of scn.waves) {
      const total = wave.count + (wave.decoys || 0);
      for (let i = 0; i < total; i++) {
        const isDecoy = i >= wave.count;
        const at = wave.at + rng.range(-0.6, 1.6) + i * rng.range(0.9, 2.4);
        const azBase = rng.range(scn.spread[0], scn.spread[1]);
        this.spawnPlan.push({
          at: Math.max(0.5, at),
          kind: isDecoy ? 'DECOY' : 'RV',
          azimuth: azBase,
          alt: rng.range(scn.baseAlt[0], scn.baseAlt[1]),
          range: rng.range(scn.baseRange[0], scn.baseRange[1]),
          speed: rng.range(scn.speed[0], scn.speed[1]),
          aim: new THREE.Vector2(rng.gauss(0, 55), rng.gauss(0, 55)),
          weavePhase: rng.range(0, Math.PI * 2),
          weaveAmp: isDecoy ? 0 : rng.range(0.25, 1) * THREAT.weaveAmplitude,
          index: idx++,
        });
      }
    }
    this.spawnPlan.sort((a, b) => a.at - b.at);
    this.spawned = 0;
    state.stats.spawned = 0;
    return this.spawnPlan.length;
  }

  /** Threats approach from roughly -Z, fanned by the scenario spread. */
  spawnFromPlan(plan) {
    const t = this.pool.find((p) => !p.alive);
    if (!t) return null;
    const bearing = -Math.PI / 2 + plan.azimuth;
    const from = new THREE.Vector3(
      Math.cos(bearing) * plan.range,
      plan.alt,
      Math.sin(bearing) * plan.range
    );
    const to = new THREE.Vector3(plan.aim.x, WORLD.padY, plan.aim.y);
    const vel = ballisticLaunchVelocity(from, to, plan.speed, false);
    t.spawn({
      kind: plan.kind,
      pos: from,
      vel,
      impactPoint: to,
      time: this.time,
      weavePhase: plan.weavePhase,
      weaveAmp: plan.weaveAmp,
    });
    this.active.push(t);
    state.stats.spawned++;
    return t;
  }

  destroyThreat(threat, reason, camera) {
    if (!threat.alive) return;
    threat.destroyed = true;
    const size = threat.kind === 'DECOY' ? 12 : 26;
    this.effects.intercept(threat.pos.clone(), size, camera, {
      hot: new THREE.Color(1.0, 0.97, 0.86),
      mid: new THREE.Color(1.0, 0.5, 0.14),
      cool: new THREE.Color(0.1, 0.09, 0.09),
    });
    bus.emit('threat:destroyed', { threat, reason });
    threat.release();
    const i = this.active.indexOf(threat);
    if (i >= 0) this.active.splice(i, 1);
  }

  update(dt, camera) {
    this.time += dt;
    while (this.spawned < this.spawnPlan.length && this.spawnPlan[this.spawned].at <= this.time) {
      this.spawnFromPlan(this.spawnPlan[this.spawned]);
      this.spawned++;
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.update(dt, camera, this.time);
      const ground = this.effects.groundAt(t.pos.x, t.pos.z);
      if (t.pos.y <= ground + 1) {
        if (t.kind === 'DECOY') {
          this.effects.groundImpact(t.pos.clone(), 10, camera);
          bus.emit('threat:decoyDown', t);
        } else {
          this.effects.groundImpact(t.pos.clone(), THREAT.impactCrater, camera);
          bus.emit('threat:impact', t);
        }
        t.release();
        this.active.splice(i, 1);
      }
    }
    state.stats.active = this.active.filter((t) => t.kind !== 'DECOY').length;
  }

  remaining() {
    return this.spawnPlan.length - this.spawned;
  }

  clear() {
    for (const t of this.active) t.release();
    this.active.length = 0;
    this.spawnPlan.length = 0;
    this.spawned = 0;
  }
}
