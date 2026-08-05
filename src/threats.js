// Fictional ballistic practice targets: lobbed gravity arcs solved for a
// chosen impact point + flight time, gentle terminal weave, plasma glow at
// low altitude, decoys that tumble and burn out harmlessly. Pooled.
import * as THREE from 'three';
import { THREATS, SCENARIOS } from './constants.js';
import { integrate, solveBallisticVelocity, airDensity, predictImpact } from './physics.js';
import { flareSprite } from './textures.js';

const _v = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

let NEXT_ID = 1;

class Threat {
  constructor(scene, effects) {
    this.effects = effects;
    this.active = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    // reentry vehicle: dark biconic shape
    const dark = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.55, metalness: 0.55 });
    const heat = new THREE.MeshStandardMaterial({ color: 0x33261e, roughness: 0.8, metalness: 0.2, emissive: 0xff5a22, emissiveIntensity: 0 });
    this.heatMat = heat;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 12), heat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 2.0;
    this.group.add(nose);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 2.2, 12), dark);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.4;
    this.group.add(body);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.5, 0.7, 12), dark);
    skirt.rotation.x = Math.PI / 2;
    skirt.position.z = -1.8;
    this.group.add(skirt);
    // scale up for readability at range
    this.group.scale.setScalar(2.6);

    // plasma glow sprite
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareSprite(), color: 0xffb27a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.glow.scale.setScalar(14);
    this.group.add(this.glow);

    // invisible pick-proxy for outdoor aiming (material hidden, raycastable)
    this.pick = new THREE.Mesh(
      new THREE.SphereGeometry(26, 6, 6),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.pick.userData.threat = this;
    this.group.add(this.pick);

    this.trail = null;
    this.id = 0;
    this.isDecoy = false;
    this.age = 0;
    this.weavePhase = 0;
    this.weaveFreq = 1;
    this.plannedImpact = new THREE.Vector3();
    this.tumble = new THREE.Vector3();
  }

  spawn({ from, vel, isDecoy, weavePhase, weaveFreq, impact }) {
    this.id = NEXT_ID++;
    this.active = true;
    this.isDecoy = isDecoy;
    this.pos.copy(from);
    this.vel.copy(vel);
    this.age = 0;
    this.weavePhase = weavePhase;
    this.weaveFreq = weaveFreq;
    this.plannedImpact.copy(impact);
    this.group.visible = true;
    this.group.position.copy(from);
    this.heatMat.emissiveIntensity = 0;
    this.glow.material.opacity = 0;
    this.trail = this.effects.acquireTrail({
      width: 2.7, life: 10, color: 0xcac6c0, opacity: 0.62,
    });
    this.trail.minDist = 14;
    this.tumble.set(Math.random() * 2, Math.random() * 3, Math.random() * 2);
  }

  /** remove from sky. reason: 'intercepted' | 'impact' | 'burnout' */
  despawn() {
    this.active = false;
    this.group.visible = false;
    if (this.trail) { this.trail.release(); this.trail = null; }
  }

  update(dt, events) {
    if (!this.active) return;
    this.age += dt;
    const alt = this.pos.y;
    const rho = airDensity(alt);
    const speed = this.vel.length();

    // gentle terminal weave (hostiles only) — fictional evasive wobble
    let extra = null;
    if (!this.isDecoy && alt < THREATS.terminalPhaseAlt && alt > 200) {
      _perp.crossVectors(this.vel, _up).normalize();
      const w = Math.sin(this.age * this.weaveFreq + this.weavePhase) * THREATS.terminalWeaveAccel * rho;
      extra = _perp.multiplyScalar(w);
    }
    integrate({ pos: this.pos, vel: this.vel }, dt, extra);
    this.group.position.copy(this.pos);

    // orient along velocity (decoys tumble)
    if (this.isDecoy) {
      this.group.rotation.x += this.tumble.x * dt;
      this.group.rotation.y += this.tumble.y * dt;
      this.group.rotation.z += this.tumble.z * dt;
    } else if (speed > 1) {
      _v.copy(this.vel).normalize();
      this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _v);
    }

    // plasma sheath: stronger with air density × speed
    const heat = Math.min(1, rho * speed / 240);
    this.heatMat.emissiveIntensity = heat * 3.4;
    this.glow.material.opacity = Math.min(0.92, heat * 1.15) * (this.isDecoy ? 0.5 : 1);
    this.glow.scale.setScalar(14 + heat * 30);

    if (this.trail) {
      this.trail.push(this.pos);
      // trail brightness follows air density
      this.trail.baseOpacity = 0.14 + 0.5 * Math.min(1, rho * 1.6) + heat * 0.25;
    }

    // decoys burn out harmlessly at low altitude
    if (this.isDecoy && alt < 1650) {
      this.effects.sparkle(this.pos, 1.6);
      this.effects.airBurst(this.pos, 0.35, 0xffd9a0);
      events.emit('threat-burnout', { threat: this });
      this.despawn();
      return;
    }
    // ground impact
    if (alt <= 2) {
      this.pos.y = 0;
      this.effects.groundImpact(this.pos, 1.25);
      events.emit('threat-impact', { threat: this, pos: this.pos.clone() });
      this.despawn();
    }
  }
}

export class Threats {
  constructor({ scene, events, rng, effects }) {
    this.scene = scene;
    this.events = events;
    this.rng = rng.fork(13);
    this.effects = effects;
    this.pool = [];
    for (let i = 0; i < 10; i++) this.pool.push(new Threat(scene, effects));
    this.plan = [];
    this.planTime = 0;
    this.running = false;
    this.spawnedCount = 0;
    this.expectedCount = 0;
  }

  get active() { return this.pool.filter(t => t.active); }

  /** build a randomized-but-deterministic spawn plan for a scenario */
  startScenario(scenarioId) {
    const sc = SCENARIOS[scenarioId];
    const rng = this.rng;
    const nThreats = Array.isArray(sc.threats) ? rng.int(sc.threats[0], sc.threats[1]) : sc.threats;
    const nDecoys = Array.isArray(sc.decoys) ? rng.int(sc.decoys[0], sc.decoys[1]) : sc.decoys;
    const total = nThreats + nDecoys;
    // spread arrival azimuths so arcs are readable
    const azBase = rng.range(0, Math.PI * 2);
    const azStep = (Math.PI * 1.25) / Math.max(1, total - 1);
    const specs = [];
    for (let i = 0; i < total; i++) {
      specs.push({
        t: (i === 0 ? 1.2 : rng.range(0.12, 1) * sc.spawnWindow),
        az: azBase + (i - (total - 1) / 2) * azStep + rng.gauss(0, 0.09),
        isDecoy: i >= nThreats,
      });
    }
    // shuffle decoy order deterministic
    for (let i = specs.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [specs[i].isDecoy, specs[j].isDecoy] = [specs[j].isDecoy, specs[i].isDecoy];
    }
    specs.sort((a, b) => a.t - b.t);
    this.plan = specs;
    this.planTime = 0;
    this.running = true;
    this.spawnedCount = 0;
    this.expectedCount = total;
    NEXT_ID = 1;
  }

  stop() {
    this.running = false;
    this.plan = [];
    for (const t of this.pool) if (t.active) t.despawn();
  }

  _spawnFromSpec(spec) {
    const rng = this.rng;
    const threat = this.pool.find(t => !t.active);
    if (!threat) return;
    const range = rng.range(THREATS.spawnRange[0], THREATS.spawnRange[1]);
    const alt = rng.range(THREATS.spawnAltitude[0], THREATS.spawnAltitude[1]);
    const T = rng.range(THREATS.flightTime[0], THREATS.flightTime[1]);
    // aim inside the base area (fictional practice impact zone)
    const aimA = rng.range(0, Math.PI * 2);
    const aimR = rng.range(20, 150);
    const impact = new THREE.Vector3(Math.cos(aimA) * aimR, 0, Math.sin(aimA) * aimR);
    const from = new THREE.Vector3(
      impact.x + Math.cos(spec.az) * range,
      alt,
      impact.z + Math.sin(spec.az) * range,
    );
    const vel = solveBallisticVelocity(from, impact, T);
    threat.spawn({
      from, vel,
      isDecoy: spec.isDecoy,
      weavePhase: rng.range(0, 6.28),
      weaveFreq: rng.range(0.55, 1.15),
      impact,
    });
    this.spawnedCount++;
    this.events.emit('threat-spawned', { threat });
  }

  /** true position/velocity a radar would smooth; used by guidance too */
  update(dt) {
    if (this.running && this.plan.length) {
      this.planTime += dt;
      while (this.plan.length && this.plan[0].t <= this.planTime) {
        this._spawnFromSpec(this.plan.shift());
      }
    }
    for (const t of this.pool) t.update(dt, this.events);
  }

  /** everything spawned + nothing left in plan + sky clear */
  allResolved() {
    return this.running && this.plan.length === 0 && this.pool.every(t => !t.active);
  }

  predictedImpactOf(threat, out) {
    return predictImpact(threat.pos, threat.vel, out);
  }
}
