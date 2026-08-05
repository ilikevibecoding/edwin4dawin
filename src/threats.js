// threats.js — incoming ballistic threats and scenario logic. Arcs, speeds and behavior are
// fictional and tuned for readable, cinematic gameplay (roughly 45–90 s per scenario).
import * as THREE from 'three';
import { rngGame, rngFx, clamp, lerp, remap } from './utils.js';
import { integrateBallistic, airDensity } from './physics.js';
import { softCircleTexture } from './utils.js';

const _v1 = new THREE.Vector3(); const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export const SCENARIOS = {
  single: {
    key: 'single', name: 'SINGLE TRACK',
    desc: 'One high-visibility ballistic target.',
    count: [1, 1], interval: [0, 0], decoyChance: 0, forceNight: false,
    spawnDelay: [4, 6],
  },
  saturation: {
    key: 'saturation', name: 'SATURATION',
    desc: '3–5 targets on separate arcs in a short window.',
    count: [3, 5], interval: [3.5, 8], decoyChance: 0, forceNight: false,
    spawnDelay: [3, 5],
  },
  nightRaid: {
    key: 'nightRaid', name: 'NIGHT RAID',
    desc: 'Multiple targets with harmless decoys under darkness.',
    count: [4, 6], interval: [3, 7], decoyChance: 0.35, forceNight: true,
    spawnDelay: [4, 6],
  },
};

let threatSerial = 0;

class Threat {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.alive = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.dragK = 6e-6;
    this.phase = 'coast'; // coast | terminal | dead
    this.decoy = false;
    this.id = '';
    this.spinPhase = 0;

    // visuals: conical RV + additive glow sprite
    this.group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 3.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.55, metalness: 0.5, emissive: 0xff5a18, emissiveIntensity: 0 })
    );
    body.geometry.rotateX(Math.PI / 2); // point +z
    this.body = body;
    this.group.add(body);
    const glowTex = softCircleTexture(64, 0, [255, 190, 130]);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    this.glow.scale.set(10, 10, 1);
    this.group.add(this.glow);
    this.group.visible = false;
    scene.add(this.group);
    this.trail = null;
  }

  activate({ id, pos, vel, decoy, aimName }) {
    this.alive = true;
    this.id = id;
    this.pos.copy(pos);
    this.vel.copy(vel);
    this.decoy = decoy;
    this.aimName = aimName;
    this.dragK = decoy ? 3.2e-4 : 6e-6;
    this.phase = 'coast';
    this.group.visible = true;
    this.spawnTime = -1;
    this.trail = this.effects.createTrail({ color: 0xffffff, fadeTime: 14, spacing: 22 });
    this.body.material.emissiveIntensity = 0;
  }

  deactivate() {
    this.alive = false;
    this.group.visible = false;
    if (this.trail) { this.effects.releaseTrail(this.trail); this.trail = null; }
  }

  update(dt, now) {
    if (!this.alive) return null;
    integrateBallistic(this, dt);
    this.group.position.copy(this.pos);

    // orient along velocity + slow roll
    if (this.vel.lengthSq() > 1) {
      _v1.copy(this.vel).normalize();
      _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _v1);
      this.group.quaternion.copy(_q);
      this.spinPhase += dt * 2.4;
      this.group.rotateZ(this.spinPhase * 0.02);
    }

    const rho = airDensity(this.pos.y);
    const speed = this.vel.length();
    // reentry heating visual: strongest low + fast
    const heat = clamp(rho * speed / 420, 0, 1.25) * (this.decoy ? 0.5 : 1);
    this.body.material.emissiveIntensity = heat * 2.2;
    this.glow.material.opacity = clamp(heat - 0.06, 0, 1) * 0.85;
    this.glow.scale.setScalar(6 + heat * 14);

    // trail: air-density-driven width/alpha (thin bright contrail high, smoky low)
    const width = lerp(2.2, 8.5, clamp(rho * 1.6, 0, 1)) * (this.decoy ? 0.6 : 1);
    const alpha = (0.16 + 0.5 * clamp(rho * 2.2, 0, 1)) * (this.decoy ? 0.55 : 1);
    this.effects.pushTrail(this.trail, this.pos, width, alpha);
    if (heat > 0.25 && !this.decoy) this.effects.plasmaWake(this.pos, this.vel, heat);

    // phase transitions
    if (this.phase === 'coast' && this.pos.y < 2000) this.phase = 'terminal';

    // decoys burn up before reaching the ground
    if (this.decoy && (this.pos.y < 750 || speed < 120)) {
      this.effects.airBurst(this.pos, { size: 0.5, kind: 'decoyBurn' });
      this.deactivate();
      return { type: 'decoyBurnup', threat: this };
    }
    if (this.pos.y <= 3) {
      _v2.set(this.pos.x, 0, this.pos.z);
      this.effects.groundImpact(_v2, { size: 1.7 });
      this.deactivate();
      return { type: 'impact', threat: this, pos: _v2.clone() };
    }
    return null;
  }

  // called when an interceptor kills this threat
  destroyed(atPos) {
    this.effects.destroyedThreatDebris(this.pos, this.vel);
    this.deactivate();
  }
}

export class ThreatManager {
  constructor(scene, effects, base) {
    this.scene = scene;
    this.effects = effects;
    this.base = base;
    this.pool = [];
    for (let i = 0; i < 9; i++) this.pool.push(new Threat(scene, effects));
    this.active = [];
    this.queue = [];        // pending spawns {at, decoy}
    this.scenario = null;
    this.elapsed = 0;
    this.spawnedCount = 0;
    this.onEvent = null;    // cb({type, threat, pos})
  }

  startScenario(key) {
    this.reset();
    const sc = SCENARIOS[key];
    this.scenario = sc;
    this.elapsed = 0;
    this.spawnedCount = 0;
    const n = rngGame.int(sc.count[0], sc.count[1]);
    let t = rngGame.range(sc.spawnDelay[0], sc.spawnDelay[1]);
    // pick a primary attack sector, threats fan around it
    const sector = rngGame.range(0, Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const decoy = rngGame.next() < sc.decoyChance && i > 0;
      this.queue.push({ at: t, decoy, azimuth: sector + rngGame.range(-0.9, 0.9) });
      t += rngGame.range(sc.interval[0], sc.interval[1]);
    }
    this.totalThreats = n;
    return n;
  }

  reset() {
    for (const th of this.active) th.deactivate();
    this.active.length = 0;
    this.queue.length = 0;
    this.scenario = null;
  }

  _spawn(item) {
    const th = this.pool.find((t) => !t.alive);
    if (!th) return;
    threatSerial += 1;
    const az = item.azimuth;
    const dist = rngGame.range(5800, 8200);
    const alt = rngGame.range(4600, 6400);
    const spawnPos = _v1.set(Math.cos(az) * dist, alt, Math.sin(az) * dist);

    // aim point: mostly base structures, some near-misses
    const aims = this.base.aimPoints;
    const aim = aims[rngGame.int(0, aims.length - 1)];
    const aimPos = _v2.set(
      aim.pos.x + rngGame.gauss() * aim.r,
      0,
      aim.pos.z + rngGame.gauss() * aim.r
    );

    // ballistic solution ignoring drag: v0 = (T - P)/tof + 0.5*g*tof
    const tof = rngGame.range(30, 46); // seconds of flight => scenario pace
    const vel = new THREE.Vector3().subVectors(aimPos, spawnPos).divideScalar(tof);
    vel.y += 0.5 * 9.81 * tof;

    th.activate({
      id: `V${threatSerial}`,
      pos: spawnPos, vel,
      decoy: item.decoy,
      aimName: aim.name,
    });
    this.active.push(th);
    this.spawnedCount += 1;
    if (this.onEvent) this.onEvent({ type: 'spawn', threat: th });
  }

  get aliveCount() { return this.active.filter((t) => t.alive).length; }
  get pendingCount() { return this.queue.length; }

  update(dt, now) {
    if (!this.scenario) return;
    this.elapsed += dt;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.elapsed >= this.queue[i].at) {
        this._spawn(this.queue[i]);
        this.queue.splice(i, 1);
      }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const th = this.active[i];
      const ev = th.update(dt, now);
      if (ev && this.onEvent) this.onEvent(ev);
      if (!th.alive) this.active.splice(i, 1);
    }
  }
}
