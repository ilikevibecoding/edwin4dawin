// Interceptor missiles: pooled bodies, boost/coast/terminal phases, simplified
// lead-pursuit guidance and kill assessment.
//
// All performance numbers are invented for gameplay. The "probability of kill"
// model is a readable gameplay abstraction, not a fire-control calculation.
import * as THREE from 'three';
import { Pool } from './core/pool.js';
import { mats } from './core/materials.js';
import * as T from './core/textures.js';
import {
  integrate, steerToward, predictInterceptPoint, orientToVelocity, densityRatio,
} from './physics.js';

export const INTERCEPTOR_SPECS = {
  palisade: {
    id: 'palisade',
    reach: 26000,
    label: 'PALISADE ROUND',
    length: 5.0,
    radius: 0.2,
    boostTime: 2.4,
    boostAccel: 640,
    sustainTime: 1.6,
    sustainAccel: 120,
    maxSpeed: 1750,
    maxLateral: 260,
    turnGain: 4.0,
    killRadius: 34,
    maxFlightTime: 42,
    ballisticCoeff: 8200,
    pitchOverDelay: 0.5,
    pitchOverRate: 1.5,
    trailColor: 0xf0ece4,
    trailWidth: 14,
    plumeScale: 1.0,
    idealAltitude: [600, 9000],
    bodyColor: 0xd8d6cf,
  },
  halberd: {
    id: 'halberd',
    reach: 72000,
    label: 'HALBERD ROUND',
    length: 6.6,
    radius: 0.26,
    boostTime: 4.2,
    boostAccel: 530,
    sustainTime: 2.4,
    sustainAccel: 90,
    maxSpeed: 2650,
    maxLateral: 165,
    turnGain: 3.2,
    killRadius: 42,
    maxFlightTime: 72,
    ballisticCoeff: 11500,
    pitchOverDelay: 1.1,
    pitchOverRate: 0.85,
    trailColor: 0xeaf0f6,
    trailWidth: 20,
    plumeScale: 1.35,
    idealAltitude: [4000, 30000],
    bodyColor: 0xb9c0c6,
  },
  sentinel: {
    id: 'sentinel',
    reach: 130000,
    label: 'SENTINEL ROUND',
    length: 9.8,
    radius: 0.42,
    boostTime: 6.4,
    boostAccel: 470,
    sustainTime: 4.5,
    sustainAccel: 80,
    maxSpeed: 3500,
    // SENTINEL leaves a near-vertical rail (72-87 deg) and has to swing ~30 deg
    // onto its intercept bearing. Turn rate is accel/speed, so the pitch-over
    // has to start early while the round is still slow or it can never catch up.
    maxLateral: 190,
    turnGain: 3.2,
    killRadius: 55,
    maxFlightTime: 110,
    ballisticCoeff: 15500,
    pitchOverDelay: 0.7,
    pitchOverRate: 1.3,
    trailColor: 0xf6f2ea,
    trailWidth: 30,
    plumeScale: 2.0,
    idealAltitude: [9000, 70000],
    bodyColor: 0xe6e4dd,
  },
};

// Range at which a round switches to terminal guidance and arms its fuze.
const TERMINAL_RANGE = 2600;

const _v = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _thrustDir = new THREE.Vector3();

/** Slim interceptor body: nose, sustainer section, control and tail fins. */
function buildInterceptorMesh(spec) {
  const M = mats();
  const g = new THREE.Group();
  const len = spec.length;
  const r = spec.radius;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: spec.bodyColor, roughness: 0.42, metalness: 0.55,
    map: T.militaryPanel({ key: `int_${spec.id}`, base: '#cfcdc6', dark: '#a5a39c', light: '#e6e4dd', seed: 71 }),
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len * 0.68, 16), bodyMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(r, len * 0.26, 16), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = len * 0.47;
  g.add(nose);
  // seeker window
  const seeker = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 12, 8), M.darkGlass);
  seeker.position.z = len * 0.6;
  g.add(seeker);

  // aft skirt + nozzle
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 0.92, len * 0.1, 16), M.heatSteel);
  skirt.rotation.x = Math.PI / 2;
  skirt.position.z = -len * 0.36;
  g.add(skirt);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.95, len * 0.09, 14, 1, true), M.heatSteel);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = -len * 0.44;
  g.add(nozzle);

  // fins: 4 forward control surfaces + 4 aft stabilisers
  const finGeo = new THREE.BoxGeometry(r * 1.5, 0.03, len * 0.1);
  const tailGeo = new THREE.BoxGeometry(r * 2.1, 0.035, len * 0.14);
  const controlFins = [];
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group();
    holder.rotation.z = (i / 4) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.position.set(r * 1.1, 0, len * 0.2);
    holder.add(fin);
    g.add(holder);
    controlFins.push(fin);

    const tailHolder = new THREE.Group();
    tailHolder.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(r * 1.5, 0, -len * 0.3);
    tailHolder.add(tail);
    g.add(tailHolder);
  }
  g.userData.controlFins = controlFins;

  // painted band + stencil
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.015, r * 1.015, len * 0.06, 16), M.panelSand);
  band.rotation.x = Math.PI / 2;
  band.position.z = len * 0.22;
  g.add(band);

  return g;
}

export class Interceptor {
  constructor(index) {
    this.index = index;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.aCmd = new THREE.Vector3();
    this.group = new THREE.Group();
    this.group.visible = false;
    this.meshes = {};
    for (const key of Object.keys(INTERCEPTOR_SPECS)) {
      const m = buildInterceptorMesh(INTERCEPTOR_SPECS[key]);
      m.visible = false;
      this.group.add(m);
      this.meshes[key] = m;
    }
    const glowMat = new THREE.SpriteMaterial({
      map: T.flare(),
      color: 0xffe0a0,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false,
      depthTest: false,
    });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.renderOrder = 21;
    this.group.add(this.glow);
    this.alive = false;
    this.trail = null;
  }

  reset() {
    this.alive = false;
    this.group.visible = false;
    this.trail = null;
    this.target = null;
  }
}

export class InterceptorManager {
  constructor(scene, rng, effects) {
    this.scene = scene;
    this.rng = rng;
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.name = 'interceptors';
    scene.add(this.group);
    this.pool = new Pool(10, (i) => {
      const it = new Interceptor(i);
      this.group.add(it.group);
      return it;
    }, (it) => it.reset());
    this.active = [];
    this.onResult = null;
    this.stats = { launched: 0, hits: 0, misses: 0, decoyHits: 0 };
  }

  reset() {
    for (const it of this.pool.active.slice()) {
      if (it.trail) this.effects.releaseTrail(it.trail);
      this.pool.release(it);
    }
    this.active.length = 0;
    this.stats = { launched: 0, hits: 0, misses: 0, decoyHits: 0 };
  }

  /**
   * Fire one round from a battery at a target track.
   * @returns {Interceptor|null}
   */
  launch(battery, target, groundY = 0) {
    const shot = battery.fire();
    if (!shot) return null;
    const spec = INTERCEPTOR_SPECS[battery.spec.interceptor];
    const it = this.pool.acquire();
    if (!it) return null;

    it.spec = spec;
    it.battery = battery;
    it.target = target;
    it.alive = true;
    it.age = 0;
    it.phase = 'BOOST';
    it.pos.copy(shot.position);
    it.vel.copy(shot.direction).multiplyScalar(34);
    it.aCmd.set(0, 0, 0);
    it.prevErr = undefined;
    it.prevDist = Infinity;
    it.minDist = Infinity;
    it.launchDir = shot.direction.clone();
    it.staged = false;
    it.result = null;
    it.group.visible = true;
    for (const key of Object.keys(it.meshes)) it.meshes[key].visible = key === spec.id;
    it.mesh = it.meshes[spec.id];
    it.glow.scale.set(0.02, 0.02, 1);

    it.trail = this.effects.acquireTrail({
      color: spec.trailColor,
      alpha: 0.85,
      persistence: 6,
      minSpacing: 26,
      baseWidth: spec.trailWidth,
    });
    it.trail?.push(it.pos.x, it.pos.y, it.pos.z);

    // launch signature at the tube mouth
    this.effects.emitLaunchBlast(shot.position, shot.direction, {
      scale: battery.spec.plumeScale,
      groundY,
    });
    this.effects.emitCoverBlow(shot.position, shot.direction);

    target.engagedBy = it;
    this.active.push(it);
    this.stats.launched++;
    this.lastLaunch = { battery, target, interceptor: it };
    return it;
  }

  update(dt, camera, groundHeightAt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const it = this.active[i];
      it.age += dt;
      const spec = it.spec;

      _acc.set(0, 0, 0);
      _thrustDir.copy(it.vel).normalize();

      // ---- phase logic -----------------------------------------------------
      let thrust = 0;
      if (it.age < spec.boostTime) {
        it.phase = 'BOOST';
        // thrust tapers as the grain burns through
        thrust = spec.boostAccel * (1.0 - 0.25 * (it.age / spec.boostTime));
      } else if (it.age < spec.boostTime + spec.sustainTime) {
        it.phase = 'SUSTAIN';
        thrust = spec.sustainAccel;
        if (!it.staged) {
          it.staged = true;
          // booster separation: a tumbling empty case falls away
          _v.copy(it.vel).multiplyScalar(-0.16);
          _v.x += this.rng.range(-14, 14);
          _v.z += this.rng.range(-14, 14);
          this.effects.debris.spawn(it.pos, _v, { size: 1.4, life: 8 });
        }
      } else {
        const tgt = it.target;
        it.phase = tgt && it.pos.distanceTo(tgt.pos) < TERMINAL_RANGE ? 'TERMINAL' : 'COAST';
      }

      // limit top speed by cutting thrust rather than clamping velocity
      const speed = it.vel.length();
      if (speed > spec.maxSpeed) thrust = 0;

      // ---- guidance --------------------------------------------------------
      const target = it.target;
      let tti = 0;
      if (target && target.alive) {
        if (it.age < spec.pitchOverDelay) {
          // fly the rail direction briefly, then begin the pitch-over
          _aim.copy(it.pos).addScaledVector(it.launchDir, 2000);
        } else {
          // aim above the meeting point by roughly the gravity drop over the
          // time of flight, so the round arrives there instead of short
          tti = predictInterceptPoint(_aim, it.pos, Math.max(speed, 300), target.pos, target.vel, 0.55,
            Math.max(2, spec.maxFlightTime - it.age));
          // never steer into the dirt while there is still time to climb
          const floor = groundHeightAt(_aim.x, _aim.z) + 250;
          if (_aim.y < floor) _aim.y = floor;
          const blend = Math.min(1, (it.age - spec.pitchOverDelay) * spec.pitchOverRate);
          if (blend < 1) {
            _v.copy(it.pos).addScaledVector(it.launchDir, 2000);
            _aim.lerp(_v, 1 - blend);
          }
        }
        const lateralLimit = spec.maxLateral * (0.35 + 0.65 * Math.min(1, densityRatio(it.pos.y) * 3 + 0.55));
        steerToward(it, _aim, dt, {
          maxLateral: it.phase === 'TERMINAL' ? lateralLimit * 1.35 : lateralLimit,
          gain: spec.turnGain,
          tau: it.phase === 'TERMINAL' ? 0.1 : 0.2,
        });
        _acc.add(it.aCmd);
      } else if (it.result === null && (!target || !target.alive)) {
        // target already gone: fly on and self-destruct shortly after
        it.selfDestruct = (it.selfDestruct ?? 1.5) - dt;
        if (it.selfDestruct <= 0) {
          this._finish(it, 'MISS', 'TARGET ALREADY DESTROYED - ROUND SELF-DESTRUCTED');
          continue;
        }
      }
      _acc.addScaledVector(_thrustDir, thrust);

      integrate(it.pos, it.vel, _acc, dt, spec.ballisticCoeff);
      it.group.position.copy(it.pos);

      // ---- presentation ----------------------------------------------------
      orientToVelocity(it.mesh, it.vel, 0, 1);
      // visible control-surface deflection proportional to the steering command
      const defl = Math.min(0.42, it.aCmd.length() / Math.max(spec.maxLateral, 1) * 0.5);
      const fins = it.mesh.userData.controlFins;
      if (fins) {
        for (let f = 0; f < fins.length; f++) {
          fins[f].rotation.y = (f % 2 === 0 ? defl : -defl) * (f < 2 ? 1 : -1);
        }
      }
      const boosting = thrust > 50;
      const glowSize = boosting ? 0.02 + spec.plumeScale * 0.014 : 0.008;
      it.glow.scale.set(glowSize, glowSize, 1);
      it.glow.material.color.setRGB(1, boosting ? 0.82 : 0.7, boosting ? 0.5 : 0.55);

      if (it.trail) {
        it.trail.push(it.pos.x, it.pos.y, it.pos.z);
      }
      if (boosting) {
        this.effects.emitExhaust(it.pos, _thrustDir, dt, {
          scale: 1.7 * spec.plumeScale,
          hot: true,
          rate: 130,
          spread: 0.13,
          speed: 55,
          sooty: 0.35,
        });
      } else if (it.phase === 'SUSTAIN') {
        this.effects.emitExhaust(it.pos, _thrustDir, dt, {
          scale: 0.9 * spec.plumeScale, hot: true, rate: 45, spread: 0.1, speed: 30, sooty: 0.5,
        });
      }

      // ---- kill assessment -------------------------------------------------
      if (target && target.alive) {
        const dist = it.pos.distanceTo(target.pos);
        if (dist > it.prevDist && it.prevDist < TERMINAL_RANGE) {
          // closest approach has just been passed - fuze here
          this._evaluate(it, target, it.prevDist);
          continue;
        }
        it.prevDist = dist;
        it.minDist = Math.min(it.minDist ?? Infinity, dist);
        // A round that has passed its target well outside the terminal window
        // can never turn back onto it; destroy it here rather than let it fly
        // a long ballistic arc out into the desert.
        if (it.age > spec.boostTime && dist > it.minDist + 2000) {
          this.effects.emitIntercept(it.pos, it.vel, { scale: 0.6, debrisCount: 10 });
          target.engagedBy = null;
          target.assignedTo = null;
          this._finish(it, 'MISS',
            `${target.trackId} MISSED - ROUND OVERSHOT AND LOST THE INTERCEPT`,
            { target });
          continue;
        }
      }

      const ground = groundHeightAt(it.pos.x, it.pos.z);
      if (it.pos.y <= ground + 1) {
        this.effects.emitGroundImpact(it.pos, { scale: 0.8 });
        this._finish(it, 'MISS', 'ROUND FELL SHORT - GROUND IMPACT');
        continue;
      }
      if (it.age > spec.maxFlightTime) {
        this.effects.emitIntercept(it.pos, it.vel, { scale: 0.5, debrisCount: 6 });
        this._finish(it, 'MISS', 'ROUND EXPENDED - MOTOR ENERGY DEPLETED');
        continue;
      }
      // a round that has run out of energy and is falling away from a target
      // still high above it destroys itself rather than littering the desert
      if (it.phase === 'COAST' && it.vel.y < -80 && target && target.alive
          && target.pos.y - it.pos.y > 3000 && it.pos.y < 12000) {
        this.effects.emitIntercept(it.pos, it.vel, { scale: 0.55, debrisCount: 8 });
        this._finish(it, 'MISS',
          `${target.trackId} MISSED - ROUND RAN OUT OF ENERGY BELOW THE TARGET`,
          { target });
        continue;
      }
      if (it.pos.y > 90000) {
        this._finish(it, 'MISS', 'ROUND LEFT ENGAGEMENT VOLUME');
      }
    }
  }

  _evaluate(it, target, missDistance) {
    const spec = it.spec;
    const alt = it.pos.y;
    const hitGeometry = missDistance <= spec.killRadius;
    const [lo, hi] = spec.idealAltitude;
    const inEnvelope = alt >= lo && alt <= hi;

    // fictional, readable probability model
    let pk = hitGeometry ? 0.94 : 0.0;
    if (hitGeometry && !inEnvelope) pk = 0.42;
    const roll = this.rng.float();

    if (target.isDecoy) {
      this.effects.emitIntercept(it.pos, it.vel, { scale: 0.9, debrisCount: 10 });
      this.stats.decoyHits++;
      target.result = 'DECOY';
      target.alive = false;
      this._finish(it, 'DECOY', `${target.trackId} WAS A DECOY - ROUND WASTED`, {
        missDistance, altitude: alt, target,
      });
      // the decoy body is destroyed too
      this.onDecoyDestroyed?.(target);
      return;
    }

    if (hitGeometry && roll < pk) {
      this.effects.emitIntercept(target.pos, target.vel, {
        scale: 1.15 + spec.plumeScale * 0.25,
        debrisCount: 26,
      });
      this.stats.hits++;
      this._finish(it, 'INTERCEPT',
        `${target.trackId} DESTROYED - MISS DISTANCE ${missDistance.toFixed(0)} m AT ${(alt / 1000).toFixed(1)} km`,
        { missDistance, altitude: alt, target });
      this.onKill?.(target, it);
      return;
    }

    // fuzed but failed
    this.effects.emitIntercept(it.pos, it.vel, { scale: 0.7, debrisCount: 12 });
    this.stats.misses++;
    let reason;
    if (!hitGeometry) {
      reason = `${target.trackId} MISSED - PASSED ${missDistance.toFixed(0)} m OUTSIDE LETHAL RADIUS`;
    } else if (!inEnvelope) {
      reason = `${target.trackId} MISSED - INTERCEPT AT ${(alt / 1000).toFixed(1)} km IS OUTSIDE THIS BATTERY'S OPTIMUM BAND`;
    } else {
      reason = `${target.trackId} MISSED - TERMINAL GUIDANCE BROKE LOCK`;
    }
    target.engagedBy = null;
    target.assignedTo = null;
    this._finish(it, 'MISS', reason, { missDistance, altitude: alt, target });
  }

  _finish(it, result, message, info = {}) {
    it.result = result;
    it.alive = false;
    if (it.trail) {
      this.effects.releaseTrail(it.trail);
      it.trail = null;
    }
    it.group.visible = false;
    const idx = this.active.indexOf(it);
    if (idx >= 0) this.active.splice(idx, 1);
    if (it.target && it.target.engagedBy === it) it.target.engagedBy = null;
    this.pool.release(it);
    this.onResult?.({ result, message, interceptor: it, ...info });
  }
}
