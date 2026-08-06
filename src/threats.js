// Ballistic threat objects + scenario controller. Arcs, timings and spawn
// geometry are fictional and randomized per run within cinematic bounds.
import * as THREE from 'three';
import { THREAT_GRAVITY, solveBallisticVelocity, groundHeight, airDensity } from './physics.js';
import { glowTexture } from './texgen.js';

let _glowTex = null;

export const SCENARIOS = {
  single: {
    id: 'single', name: 'SINGLE TRACK',
    count: [1, 1], decoys: [0, 0], window: 0, flightTime: [52, 66],
    forcedTime: null,
  },
  saturation: {
    id: 'saturation', name: 'SATURATION',
    count: [3, 5], decoys: [0, 0], window: 24, flightTime: [46, 72],
    forcedTime: null,
  },
  nightraid: {
    id: 'nightraid', name: 'NIGHT RAID',
    count: [4, 5], decoys: [2, 3], window: 34, flightTime: [48, 76],
    forcedTime: 'night',
  },
};

const RV_BODY = 0x1c1d20;

class Threat {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    // reentry vehicle: cone + skirt
    this.noseMat = new THREE.MeshStandardMaterial({
      color: RV_BODY, roughness: 0.55, metalness: 0.4,
      emissive: new THREE.Color(0xff7830), emissiveIntensity: 0,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.0, 12), this.noseMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.75;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 1.3, 12), this.noseMat);
    skirt.rotation.x = Math.PI / 2;
    skirt.position.z = -0.9;
    this.group.add(cone, skirt);
    // reentry glow sprite so the threat reads at long range
    if (!_glowTex) _glowTex = glowTexture();
    this.glowMat = new THREE.SpriteMaterial({
      map: _glowTex, color: 0xffa050, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.glow = new THREE.Sprite(this.glowMat);
    this.glow.scale.setScalar(10);
    this.group.add(this.glow);
    this.group.visible = false;
    scene.add(this.group);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.alive = false;
    this.id = '';
    this.isDecoy = false;
    this.trail = null;
    this.age = 0;
    this.tumblePhase = 0;
  }

  spawn(id, pos, vel, isDecoy, rng) {
    this.id = id;
    this.pos.copy(pos);
    this.vel.copy(vel);
    this.isDecoy = isDecoy;
    this.alive = true;
    this.age = 0;
    this.result = null;
    this.tumblePhase = rng.range(0, 6);
    this.tumbleRate = rng.range(1.5, 3.2);
    this.wobblePhase = rng.range(0, 6);
    this.burnoutAlt = rng.range(550, 950);
    this.group.visible = true;
    this.group.scale.setScalar(isDecoy ? 0.75 : 1);
    this.noseMat.emissiveIntensity = 0;
    this.group.position.copy(pos);
  }

  kill(result) {
    this.alive = false;
    this.result = result;
    this.group.visible = false;
  }

  update(dt, effects, camera) {
    if (!this.alive) return null;
    this.age += dt;
    // ballistic integration + light drag low down
    this.vel.y -= THREAT_GRAVITY * dt;
    const rho = airDensity(this.pos.y);
    const drag = this.isDecoy ? 0.012 : 0.0035;
    this.vel.multiplyScalar(1 - drag * rho * dt * this.vel.length() * 0.01);
    this.pos.addScaledVector(this.vel, dt);

    // terminal wobble (visual only)
    const wob = rho * 0.9;
    this.pos.x += Math.sin(this.age * 7 + this.wobblePhase) * wob * dt;
    this.pos.z += Math.cos(this.age * 6.1 + this.wobblePhase) * wob * dt;

    this.group.position.copy(this.pos);
    // orient with velocity; decoys tumble
    if (this.isDecoy) {
      this.group.rotation.set(
        this.tumblePhase + this.age * this.tumbleRate,
        this.age * this.tumbleRate * 0.7,
        this.age * this.tumbleRate * 0.53,
      );
    } else {
      const look = this.pos.clone().add(this.vel);
      this.group.lookAt(look);
    }

    // reentry heating glow: strong when fast & in atmosphere
    const speed = this.vel.length();
    const heat = THREE.MathUtils.clamp((speed / 160) * rho * 2.4, 0, 3.2);
    this.noseMat.emissiveIntensity = heat;
    this.glowMat.opacity = Math.min(0.9, 0.18 + heat * 0.3);
    const flicker = 1 + Math.sin(this.age * 23 + this.wobblePhase) * 0.15;
    // enforce a minimum apparent size so distant threats read as a hot point
    const dist = camera ? camera.position.distanceTo(this.pos) : 1000;
    const minApparent = dist * 0.0042;
    this.glow.scale.setScalar(Math.max(6 + heat * 6, minApparent) * flicker * (this.isDecoy ? 0.6 : 1));

    // trail
    if (effects && this.trail) {
      effects.feedThreatTrail(this.trail, this.pos, this.vel, heat, this.isDecoy);
    }

    // decoy burnout
    if (this.isDecoy && this.pos.y < this.burnoutAlt) {
      return { type: 'burnout' };
    }
    // ground impact
    const gy = groundHeight(this.pos.x, this.pos.z);
    if (this.pos.y <= gy + 0.5) {
      return { type: 'impact' };
    }
    return null;
  }
}

export class Threats {
  constructor(ctx) {
    this.ctx = ctx;
    this.pool = [];
    for (let i = 0; i < 12; i++) this.pool.push(new Threat(ctx.scene));
    this.list = [];        // active
    this.spawnQueue = [];  // { at, isDecoy }
    this.scenario = null;
    this.elapsed = 0;
    this.counter = 0;
    this.stats = null;
  }

  get aliveCount() { return this.list.filter(t => t.alive).length; }
  get pendingCount() { return this.spawnQueue.length; }

  startScenario(id) {
    const sc = SCENARIOS[id];
    if (!sc) return false;
    this.clear();
    const rng = this.ctx.rng;
    this.scenario = sc;
    this.elapsed = 0;
    this.counter = 0;
    this.stats = {
      scenario: sc.name, launched: 0, intercepted: 0, missed: 0,
      impactsBase: 0, impactsOutside: 0, decoysEngaged: 0, decoysTotal: 0,
      roundsFired: 0, startTime: performance.now(),
    };
    const count = rng.int(sc.count[0], sc.count[1]);
    const decoys = rng.int(sc.decoys[0], sc.decoys[1]);
    this.stats.decoysTotal = decoys;
    const total = count + decoys;
    // spread launches over the window
    const times = [0];
    for (let i = 1; i < total; i++) times.push(rng.range(3, Math.max(6, sc.window)));
    times.sort((a, b) => a - b);
    // shuffle decoy flags into the sequence (never the very first)
    const flags = new Array(total).fill(false);
    let placed = 0;
    while (placed < decoys) {
      const idx = rng.int(1, total - 1);
      if (!flags[idx]) { flags[idx] = true; placed++; }
    }
    this.spawnQueue = times.map((at, i) => ({ at, isDecoy: flags[i] }));
    return true;
  }

  clear() {
    for (const t of this.list) {
      if (t.trail) { this.ctx.effects.releaseTrail(t.trail); t.trail = null; }
      t.kill('cleared');
    }
    this.list.length = 0;
    this.spawnQueue.length = 0;
    this.scenario = null;
  }

  _spawnOne(isDecoy) {
    const rng = this.ctx.rng;
    const t = this.pool.find(p => !p.alive && !this.list.includes(p)) || this.pool.find(p => !p.alive);
    if (!t) return;
    this.counter++;
    const id = `T-${String(this.counter).padStart(2, '0')}`;

    // arc geometry: spawn high & far on a random azimuth sector, aimed at/near base
    const az = rng.range(0, Math.PI * 2);
    const dist = rng.range(5200, 6800);
    const alt = rng.range(3600, 5200);
    const spawn = new THREE.Vector3(Math.sin(az) * dist, alt, Math.cos(az) * dist);

    // aim point: mostly on base, sometimes near-miss outside the fence
    let aim;
    if (rng.chance(isDecoy ? 0.3 : 0.78)) {
      const targets = [
        new THREE.Vector3(0, 0, 20), new THREE.Vector3(-58, 0, -40),
        new THREE.Vector3(52, 0, 42), new THREE.Vector3(-52, 0, 58),
        new THREE.Vector3(-18, 0, 8), new THREE.Vector3(36, 0, -12),
      ];
      aim = rng.pick(targets).clone();
      aim.x += rng.gauss(0, 22); aim.z += rng.gauss(0, 22);
    } else {
      const missAz = rng.range(0, Math.PI * 2);
      const missR = rng.range(190, 420);
      aim = new THREE.Vector3(Math.sin(missAz) * missR, 0, Math.cos(missAz) * missR);
    }

    const ft = rng.range(this.scenario.flightTime[0], this.scenario.flightTime[1]);
    const vel = solveBallisticVelocity(spawn, aim, ft, THREAT_GRAVITY, new THREE.Vector3());
    t.spawn(id, spawn, vel, isDecoy, rng);
    t.trail = this.ctx.effects.acquireTrail('threat');
    this.list.push(t);
    this.stats.launched++;
    this.ctx.bus.emit('threat:spawn', t);
  }

  update(dt) {
    if (!this.scenario) return;
    this.elapsed += dt;
    // spawns
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.elapsed) {
      const s = this.spawnQueue.shift();
      this._spawnOne(s.isDecoy);
    }
    // threats
    for (const t of this.list) {
      if (!t.alive) continue;
      const evt = t.update(dt, this.ctx.effects, this.ctx.camera);
      if (!evt) continue;
      if (evt.type === 'impact') {
        const onBase = Math.hypot(t.pos.x, t.pos.z) < 150;
        if (t.isDecoy) {
          // decoys that reach the ground fizzle harmlessly
          this.ctx.effects.decoyBurnup(t.pos);
          t.kill('burnout');
          this.ctx.bus.emit('threat:burnout', t);
        } else {
          this.ctx.effects.groundImpact(t.pos.clone().setY(groundHeight(t.pos.x, t.pos.z)));
          t.kill('impact');
          if (onBase) this.stats.impactsBase++; else this.stats.impactsOutside++;
          this.ctx.bus.emit('threat:impact', { threat: t, onBase });
        }
        if (t.trail) { this.ctx.effects.releaseTrail(t.trail); t.trail = null; }
      } else if (evt.type === 'burnout') {
        this.ctx.effects.decoyBurnup(t.pos);
        t.kill('burnout');
        if (t.trail) { this.ctx.effects.releaseTrail(t.trail); t.trail = null; }
        this.ctx.bus.emit('threat:burnout', t);
      }
    }
    // prune dead from active list (keep for radar fade handled there)
    this.list = this.list.filter(t => t.alive);
  }

  // called by interceptors on successful kill
  destroy(threat, interceptor) {
    if (!threat.alive) return;
    if (threat.isDecoy) this.stats.decoysEngaged++;
    else this.stats.intercepted++;
    threat.kill('intercepted');
    if (threat.trail) { this.ctx.effects.releaseTrail(threat.trail); threat.trail = null; }
    this.list = this.list.filter(t => t !== threat);
    this.ctx.bus.emit('threat:destroyed', { threat, interceptor });
  }

  isComplete(interceptorsInFlight) {
    return this.scenario && this.spawnQueue.length === 0 && this.aliveCount === 0 && interceptorsInFlight === 0;
  }
}
