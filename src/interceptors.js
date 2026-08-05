// Pooled interceptor missiles: PREP -> BOOST -> GUIDE -> TERMINAL.
// Guidance is a deliberately simplified lead-pursuit model with acceleration
// limits — believable motion, not a fire-control simulation.
import * as THREE from 'three';
import { THREAT_GRAVITY, solveIntercept, steerVelocity, groundHeight } from './physics.js';
import { glowTexture } from './texgen.js';

let _glowTex2 = null;

const MISS_REASONS = [
  'PROXIMITY FUZE FAULT',
  'TERMINAL MANEUVER EXCEEDED LIMITS',
  'TRACK CORRELATION LOST',
];

const _v = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _aim = new THREE.Vector3();

function buildMissileMesh(type) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.5, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.6, metalness: 0.4 });
  const band = new THREE.MeshStandardMaterial({ color: 0x8c2420, roughness: 0.6 });
  if (type === 'patriot') {
    const r = 0.17, L = 4.0;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), body);
    tube.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r, 0.9, 10), body);
    nose.rotation.x = Math.PI / 2; nose.position.z = L / 2 + 0.45;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.005, r + 0.005, 0.18, 10), band);
    stripe.rotation.x = Math.PI / 2; stripe.position.z = 1.0;
    g.add(tube, nose, stripe);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.5), dark);
      fin.position.z = -L / 2 + 0.25;
      fin.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 4;
      fin.translateX(0.28);
      g.add(fin);
    }
  } else if (type === 'thaad') {
    const r = 0.2, L = 5.0;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.25, L, 10), body);
    tube.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r, 1.6, 10), dark);
    nose.rotation.x = Math.PI / 2; nose.position.z = L / 2 + 0.8;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.5, 0.5, 10), dark);
    skirt.rotation.x = Math.PI / 2; skirt.position.z = -L / 2 - 0.2;
    g.add(tube, nose, skirt);
  } else {
    // sentinel: two-stage
    const r = 0.32, L = 7.0;
    const booster = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, L * 0.45, 12), body);
    booster.rotation.x = Math.PI / 2; booster.position.z = -L * 0.27;
    booster.name = 'booster';
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, L * 0.4, 12), body);
    upper.rotation.x = Math.PI / 2; upper.position.z = L * 0.14;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.8, 1.7, 12), dark);
    nose.rotation.x = Math.PI / 2; nose.position.z = L * 0.34 + 0.85;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.01, r + 0.01, 0.3, 12), band);
    stripe.rotation.x = Math.PI / 2; stripe.position.z = -L * 0.06;
    g.add(booster, upper, nose, stripe);
  }
  // engine glow sprite
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

class Interceptor {
  constructor(ctx, type) {
    this.ctx = ctx;
    this.type = type;
    this.mesh = buildMissileMesh(type);
    this.mesh.visible = false;
    ctx.scene.add(this.mesh);
    this.glow = new THREE.PointLight(0xffc27a, 0, 60, 1.8);
    ctx.scene.add(this.glow);
    if (!_glowTex2) _glowTex2 = glowTexture();
    this.exhaustMat = new THREE.SpriteMaterial({
      map: _glowTex2, color: 0xffc887, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.exhaust = new THREE.Sprite(this.exhaustMat);
    this.exhaust.visible = false;
    ctx.scene.add(this.exhaust);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.active = false;
    this.state = 'IDLE';
  }

  fire(spec, target, pkSuccess) {
    this.active = true;
    this.state = 'PREP';
    this.prepTimer = spec.delay || 0.2;
    this.def = spec.def;
    this.battery = spec.battery;
    this.target = target;
    this.pkSuccess = pkSuccess;
    this.missReason = MISS_REASONS[this.ctx.rng.int(0, MISS_REASONS.length - 1)];
    this.missOffset = new THREE.Vector3(
      this.ctx.rng.gauss(0, 30), this.ctx.rng.gauss(0, 24), this.ctx.rng.gauss(0, 30),
    );
    if (this.missOffset.length() < 26) this.missOffset.setLength(30);
    this.pos.copy(spec.pos);
    this.launchDir = spec.dir.clone().normalize();
    this.vel.copy(this.launchDir).multiplyScalar(2);
    this.age = 0;
    this.boostEnd = this.def.boostTime;
    this.minDist = Infinity;
    this.missArmTimer = 0;
    this.staged = false;
    this.trailSmoke = this.ctx.effects.acquireTrail('interceptor');
    this.trailCore = this.ctx.effects.acquireTrail('core');
    this.mesh.visible = false; // appears at ignition
    this.steerLoad = 0;
    this.puffTimer = 0;
  }

  release() {
    this.active = false;
    this.state = 'IDLE';
    this.mesh.visible = false;
    this.glow.intensity = 0;
    this.exhaust.visible = false;
    if (this.trailSmoke) { this.ctx.effects.releaseTrail(this.trailSmoke); this.trailSmoke = null; }
    if (this.trailCore) { this.ctx.effects.releaseTrail(this.trailCore); this.trailCore = null; }
  }

  _explodeMiss() {
    this.ctx.effects.selfDestruct(this.pos);
    this.ctx.bus.emit('interceptor:miss', { interceptor: this, reason: this.missReason, target: this.target });
    this.release();
  }

  update(dt) {
    if (!this.active) return;
    this.age += dt;

    if (this.state === 'PREP') {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) {
        this.state = 'BOOST';
        this.mesh.visible = true;
        this.ctx.effects.launchPlume(this.pos.clone(), this.launchDir.clone(), this.def.plume);
        this.ctx.audio?.launch(this.pos, this.def.plume);
        this.ctx.bus.emit('interceptor:ignition', this);
      }
      return;
    }

    const target = this.target;
    const targetAlive = target && target.alive;

    if (this.state === 'BOOST') {
      // accelerate along launch dir with a slow arc toward the target side
      this.vel.addScaledVector(this.launchDir, this.def.boostAccel * dt);
      this.vel.y -= 2.2 * dt;
      if (targetAlive) {
        const sol = solveIntercept(this.pos, target.pos, target.vel, THREAT_GRAVITY, this.def.avgSpeed, 0);
        if (sol) {
          _desired.subVectors(sol.point, this.pos).normalize();
          steerVelocity(this.vel, _desired, this.def.maxTurnAccel * 0.35, dt);
        }
      }
      if (this.age >= this.boostEnd) {
        this.state = 'GUIDE';
        if (this.type === 'sentinel' && !this.staged) {
          this.staged = true;
          const booster = this.mesh.getObjectByName('booster');
          if (booster) booster.visible = false;
          this.ctx.effects.stageSeparation(this.pos.clone(), this.vel.clone());
        }
      }
    } else if (this.state === 'GUIDE' || this.state === 'TERMINAL') {
      if (!targetAlive) {
        // target gone (someone else got it / impacted): self destruct
        this._explodeMiss();
        return;
      }
      const dist = this.pos.distanceTo(target.pos);
      if (this.state === 'GUIDE' && dist < 520) this.state = 'TERMINAL';

      // speed management: slight decay toward cruise
      const speed = this.vel.length();
      const cruise = this.def.avgSpeed * (this.state === 'TERMINAL' ? 1.12 : 1.0);
      const newSpeed = speed + (cruise - speed) * Math.min(1, dt * 0.9);
      if (speed > 1) this.vel.multiplyScalar(newSpeed / speed);

      if (this.state === 'GUIDE') {
        const sol = solveIntercept(this.pos, target.pos, target.vel, THREAT_GRAVITY, Math.max(this.vel.length(), this.def.avgSpeed * 0.7), 0);
        _aim.copy(sol ? sol.point : target.pos);
        _desired.subVectors(_aim, this.pos).normalize();
        const before = _v.copy(this.vel).normalize().dot(_desired);
        steerVelocity(this.vel, _desired, this.def.maxTurnAccel, dt);
        this.steerLoad = (1 - before) * 60;
      } else {
        // TERMINAL: dead-on (or deliberately offset for a rolled miss)
        _aim.copy(target.pos).addScaledVector(target.vel, dt * 2);
        if (!this.pkSuccess) _aim.add(this.missOffset);
        _desired.subVectors(_aim, this.pos).normalize();
        const before = _v.copy(this.vel).normalize().dot(_desired);
        steerVelocity(this.vel, _desired, this.def.maxTurnAccel * 1.45, dt);
        this.steerLoad = (1 - before) * 120;
      }

      // kill check
      const newDist = this.pos.distanceTo(target.pos);
      if (newDist < this.minDist) this.minDist = newDist;
      const closing = newDist <= this.minDist + 0.01;
      if (newDist < this.def.killRadius && this.pkSuccess) {
        const mid = _v.copy(this.pos).add(target.pos).multiplyScalar(0.5);
        this.ctx.effects.interceptKill(mid.clone(), this.vel.clone(), target.vel.clone());
        this.ctx.audio?.explosion(mid, 'air');
        this.ctx.threats.destroy(target, this);
        this.ctx.bus.emit('interceptor:hit', { interceptor: this, threat: target });
        this.release();
        return;
      }
      // passed the target and opening range -> miss
      if (!closing && this.minDist < 420) {
        this.missArmTimer += dt;
        if (this.missArmTimer > 0.35) {
          this._explodeMiss();
          return;
        }
      }
    }

    // gravity + integrate
    this.vel.y -= 2.6 * dt;
    this.pos.addScaledVector(this.vel, dt);

    // orient
    this.mesh.position.copy(this.pos);
    _v.copy(this.pos).add(this.vel);
    this.mesh.lookAt(_v);

    // ground collision
    if (this.pos.y <= groundHeight(this.pos.x, this.pos.z) + 1) {
      this.ctx.effects.groundImpact(this.pos.clone().setY(groundHeight(this.pos.x, this.pos.z)), 0.6);
      this.missReason = 'IMPACTED TERRAIN';
      this.ctx.bus.emit('interceptor:miss', { interceptor: this, reason: this.missReason, target: this.target });
      this.release();
      return;
    }

    // FX: engine glow while boosting, trails always
    const thrusting = this.state === 'BOOST';
    this.glow.position.copy(this.pos).addScaledVector(this.vel, -0.02);
    this.glow.intensity = thrusting ? 260 : 0;
    this.exhaust.visible = thrusting;
    if (thrusting) {
      this.exhaust.position.copy(this.pos).addScaledVector(_v.copy(this.vel).normalize(), -(this.type === 'sentinel' ? 4 : 2.6));
      const flick = 1 + Math.sin(this.age * 41) * 0.22;
      this.exhaust.scale.setScalar((this.type === 'sentinel' ? 9 : 5.5) * flick);
      this.exhaustMat.opacity = 0.85;
    }
    if (this.trailSmoke) {
      this.ctx.effects.feedInterceptorTrail(this.trailSmoke, this.trailCore, this.pos, this.vel, thrusting, this.def);
    }
    // steering correction puffs (visible control corrections)
    this.puffTimer -= dt;
    if (this.state === 'TERMINAL' && this.steerLoad > 0.6 && this.puffTimer <= 0) {
      this.ctx.effects.correctionPuff(this.pos, this.vel);
      this.puffTimer = 0.18;
    }
  }
}

export class Interceptors {
  constructor(ctx) {
    this.ctx = ctx;
    this.pool = { patriot: [], thaad: [], sentinel: [] };
    for (const type of ['patriot', 'thaad', 'sentinel']) {
      for (let i = 0; i < 6; i++) this.pool[type].push(new Interceptor(ctx, type));
    }
  }

  get inFlight() {
    let n = 0;
    for (const type in this.pool) for (const m of this.pool[type]) if (m.active) n++;
    return n;
  }

  get list() {
    const out = [];
    for (const type in this.pool) for (const m of this.pool[type]) if (m.active) out.push(m);
    return out;
  }

  fireAt(battery, threat) {
    const spec = battery.launch();
    if (!spec) return null;
    const missile = this.pool[battery.id].find(m => !m.active);
    if (!missile) return null;
    const pkSuccess = this.ctx.rng.chance(battery.def.pk);
    missile.fire(spec, threat, pkSuccess);
    this.ctx.bus.emit('interceptor:launch', { interceptor: missile, battery, threat });
    return missile;
  }

  clearAll() {
    for (const type in this.pool) for (const m of this.pool[type]) if (m.active) m.release();
  }

  update(dt) {
    for (const type in this.pool) for (const m of this.pool[type]) m.update(dt);
  }
}
