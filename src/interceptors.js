// interceptors.js — interceptor flight: boost/coast/terminal phases, turn-rate-limited lead
// pursuit against a deliberately simplified predicted intercept point, proximity fuse,
// hit/miss resolution with human-readable reasons. All numbers fictional.
import * as THREE from 'three';
import { rngFx, clamp, lerp } from './utils.js';
import { solveInterceptPoint, closestApproach, airDensity } from './physics.js';
import { softCircleTexture, mulberry32 } from './utils.js';

const _v1 = new THREE.Vector3(); const _v2 = new THREE.Vector3(); const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(); const _q = new THREE.Quaternion();
const FWD = new THREE.Vector3(0, 0, 1);

let serial = 0;

class Interceptor {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.alive = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.pip = new THREE.Vector3();

    this.group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.5, metalness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 3.6, 10), mat);
    body.geometry.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 10),
      new THREE.MeshStandardMaterial({ color: 0x8c8c90, roughness: 0.35, metalness: 0.6 }));
    nose.geometry.rotateX(Math.PI / 2);
    nose.position.z = 2.25;
    this.group.add(body, nose);
    // roll-reference paint bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x33363e, roughness: 0.5, metalness: 0.45 });
    for (const z of [1.35, -0.35]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.262, 0.262, 0.18, 10), bandMat);
      band.geometry.rotateX(Math.PI / 2);
      band.position.z = z;
      this.group.add(band);
    }
    // fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x4a4e46, roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.7), finMat);
      const a = (i / 4) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, -1.5);
      fin.rotation.z = a;
      this.group.add(fin);
    }
    // motor glow sprite
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softCircleTexture(64, 0, [255, 205, 140]), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    this.glow.position.z = -2.1;
    this.glow.scale.set(4, 4, 1);
    this.group.add(this.glow);
    this.group.visible = false;
    scene.add(this.group);
    this.trail = null;
  }

  activate({ batteryKey, def, muzzle, track, launchTime }) {
    serial += 1;
    this.id = `I${serial}`;
    this.alive = true;
    this.batteryKey = batteryKey;
    this.def = def;
    this.track = track;
    this.threat = track.threat;
    this.pos.copy(muzzle.pos);
    this.vel.copy(muzzle.dir).multiplyScalar(34); // eject velocity
    this.launchDir = muzzle.dir.clone();
    this.t = 0;
    this.phase = 'boost';
    this.missDeclared = false;
    this.minDist = Infinity;
    this.recedingTime = 0;
    this.pipTimer = 0;
    this.noiseSeed = mulberry32((serial * 7919) ^ 0x2f9);
    this.wiggle = rngFx.range(0, Math.PI * 2);
    this.group.visible = true;
    this.group.position.copy(this.pos);
    // envelope feasibility drives a persistent bias (fictional): batteries fired
    // outside their sweet spot are much more likely to miss.
    this.envelopeError = 0;
    this.envelopeReason = null;
    const th = this.threat;
    if (th) {
      const rng2 = th.pos.distanceTo(this.pos);
      const alt = th.pos.y;
      const env = def.envelope;
      if (alt > env.maxAlt * 1.05) { this.envelopeError = clamp((alt - env.maxAlt) / env.maxAlt, 0, 1.4); this.envelopeReason = 'target above engagement ceiling'; }
      else if (alt < env.minAlt * 0.95) { this.envelopeError = clamp((env.minAlt - alt) / Math.max(env.minAlt, 1), 0, 1.4); this.envelopeReason = 'target below engagement floor'; }
      if (rng2 > env.maxRange) { this.envelopeError = Math.max(this.envelopeError, (rng2 - env.maxRange) / env.maxRange); this.envelopeReason = 'target beyond effective range'; }
    }
    this.trail = this.effects.createTrail({ color: 0xffffff, fadeTime: 12 + def.trail * 3, spacing: 5 });
    this.glowTrail = this.effects.createGlowTrail({ fadeTime: 1.0, spacing: 2.5 });
  }

  deactivate() {
    this.alive = false;
    this.group.visible = false;
    if (this.trail) { this.effects.releaseTrail(this.trail); this.trail = null; }
    if (this.glowTrail) { this.effects.releaseTrail(this.glowTrail); this.glowTrail = null; }
  }

  _noise() { return (this.noiseSeed() - 0.5) * 2; }

  update(dt, now) {
    if (!this.alive) return null;
    this.t += dt;
    const def = this.def;
    const th = this.threat;
    const thAlive = th && th.alive;

    // ---------- guidance
    this.pipTimer -= dt;
    if (this.pipTimer <= 0) {
      this.pipTimer = 0.22;
      if (thAlive) {
        // track-quality-scaled estimation error + envelope bias (fictional model)
        const q = this.track ? this.track.quality : 1;
        const err = (1 - q) * 150 + this.envelopeError * 220;
        _v1.copy(th.pos);
        _v1.x += this._noise() * err;
        _v1.y += this._noise() * err * 0.6;
        _v1.z += this._noise() * err;
        solveInterceptPoint(_v1, th.vel, th.dragK, this.pos, def.effSpeed, this.pip);
      }
    }

    const dist = thAlive ? this.pos.distanceTo(th.pos) : Infinity;
    if (this.phase === 'boost' && this.t > def.boostTime) this.phase = 'mid';
    if (this.phase === 'mid' && dist < 900) this.phase = 'terminal';

    // desired direction
    if (this.t < 0.35) {
      _v2.copy(this.launchDir); // clear the rail first
    } else if (thAlive) {
      _v2.subVectors(this.pip, this.pos).normalize();
      // during early boost, blend from launch attitude to guidance
      if (this.phase === 'boost') {
        const k = clamp((this.t - 0.35) / (def.boostTime * 0.8), 0, 1);
        _v2.lerpVectors(this.launchDir, _v2, k).normalize();
      }
      // terminal micro-corrections: visible but not jittery
      if (this.phase === 'terminal') {
        this.wiggle += dt * 9;
        _v3.set(Math.sin(this.wiggle), Math.cos(this.wiggle * 0.77), 0).multiplyScalar(0.012);
        _v2.add(_v3).normalize();
      }
    } else {
      _v2.copy(this.vel).normalize(); // ballistic after target gone
    }

    // turn-rate-limited steering
    const speed = this.vel.length();
    const turnRate = this.phase === 'boost' ? def.turnBoost : (this.phase === 'terminal' ? def.turnTerm : def.turnMid);
    _v3.copy(this.vel).normalize();
    const angle = _v3.angleTo(_v2);
    const maxTurn = turnRate * dt;
    if (angle > 1e-4) {
      const f = Math.min(1, maxTurn / angle);
      _v3.lerp(_v2, f).normalize();
    }

    // thrust / drag
    let accel = 0;
    if (this.t < def.boostTime) accel = def.boostAccel;
    else if (this.t < def.motorTime) accel = def.boostAccel * 0.35;
    let newSpeed = speed + accel * dt;
    if (accel === 0 || newSpeed > def.maxSpeed) newSpeed = Math.min(newSpeed, def.maxSpeed);
    if (this.t >= def.motorTime) {
      const rho = airDensity(this.pos.y);
      newSpeed = Math.max(newSpeed - (30 + 220 * rho) * dt * 0.25, 160);
      newSpeed -= 9.81 * dt * clamp(_v3.y, 0, 1) * 0.4; // gravity bleed climbing
    }
    this.vel.copy(_v3).multiplyScalar(newSpeed);

    // ---------- proximity fuse via segment closest approach
    let result = null;
    if (thAlive && !this.missDeclared) {
      const ca = closestApproach(this.pos, this.vel, th.pos, th.vel, dt);
      this.minDist = Math.min(this.minDist, ca.dist);
      if (ca.dist < def.fuse) {
        // HIT
        _v4.copy(this.pos).addScaledVector(this.vel, ca.t).lerp(_v1.copy(th.pos).addScaledVector(th.vel, ca.t), 0.5);
        const isDecoy = th.decoy;
        this.effects.airBurst(_v4, { size: this.batteryKey === 'sentinel' ? 1.8 : (this.batteryKey === 'thaad' ? 1.4 : 1.0), kind: 'intercept' });
        th.destroyed(_v4);
        result = {
          type: isDecoy ? 'decoy' : 'hit',
          interceptor: this, threat: th, pos: _v4.clone(),
          alt: _v4.y, missDist: ca.dist,
        };
        this.deactivate();
        return result;
      }
      // miss detection: we've passed the target and range opens fast
      if (this.minDist < 1200 && dist > this.minDist + 30 && this.t > def.boostTime * 0.7) {
        this.recedingTime += dt;
        if (this.recedingTime > 0.7) {
          this.missDeclared = true;
          result = {
            type: 'miss', interceptor: this, threat: th,
            missDist: this.minDist,
            reason: this.envelopeReason || (this.track && this.track.quality < 0.75 ? 'weak track data' : 'terminal guidance error'),
          };
        }
      } else this.recedingTime = 0;
    }

    // integrate
    this.pos.addScaledVector(this.vel, dt);
    this.group.position.copy(this.pos);
    if (this.vel.lengthSq() > 1) {
      _v3.copy(this.vel).normalize();
      _q.setFromUnitVectors(FWD, _v3);
      this.group.quaternion.copy(_q);
    }

    // ---------- visuals
    const burning = this.t < def.motorTime;
    const boostPhase = this.t < def.boostTime;
    const camDist = this.effects.camera.position.distanceTo(this.pos);
    this.glow.material.opacity = burning ? (boostPhase ? 1.0 : 0.6) : 0;
    this.glow.scale.setScalar(Math.max((boostPhase ? 5.5 : 2.6) * def.plume, camDist * (burning ? 0.004 : 0)));
    const rho = airDensity(this.pos.y);
    const width = (boostPhase ? 8.5 : 4.6) * def.trail * lerp(0.5, 1.0, clamp(rho * 1.8, 0, 1));
    const alpha = burning ? 0.7 : 0.24;
    this.effects.pushTrail(this.trail, this.pos, width, alpha);
    if (burning) {
      this.effects.pushTrail(this.glowTrail, this.pos, 4.2 * def.plume, boostPhase ? 1.0 : 0.6);
      this.effects.motorExhaust(this.pos, this.vel, boostPhase ? 1 : 0.5, def.plume);
    }

    // ---------- expiry
    if (this.pos.y <= 2 || this.t > 55 || (this.missDeclared && this.recedingTime > 2.6)) {
      // self-destruct airburst (safety destruct flavor)
      if (this.pos.y > 2) this.effects.airBurst(this.pos, { size: 0.55, kind: 'selfDestruct' });
      else this.effects.groundImpact(_v1.set(this.pos.x, 0, this.pos.z), { size: 0.6 });
      this.deactivate();
    }
    if (this.missDeclared) this.recedingTime += dt;
    return result;
  }
}

export class InterceptorManager {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.pool = [];
    for (let i = 0; i < 12; i++) this.pool.push(new Interceptor(scene, effects));
    this.active = [];
    this.onResult = null; // cb(result)
  }

  launch(batteryKey, def, muzzle, track, now) {
    const it = this.pool.find((i) => !i.alive);
    if (!it) return null;
    it.activate({ batteryKey, def, muzzle, track, launchTime: now });
    this.active.push(it);
    this.effects.launchPlume(muzzle.pos, muzzle.dir, { scale: def.plume });
    return it;
  }

  get flyingCount() { return this.active.length; }

  reset() {
    for (const i of this.active) i.deactivate();
    this.active.length = 0;
  }

  update(dt, now) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const it = this.active[i];
      const res = it.update(dt, now);
      if (res && this.onResult) this.onResult(res);
      if (!it.alive) this.active.splice(i, 1);
    }
  }
}
