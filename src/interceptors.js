import * as THREE from 'three';
import { settings } from './settings.js';
import { Rng } from './util/rng.js';
import { Pool } from './util/pool.js';
import * as G from './util/geo.js';
import * as M from './materials.js';
import * as T from './util/textures.js';
import { clamp, saturate, lerp, predictIntercept, closestApproach } from './util/mathx.js';
import {
  GRAVITY,
  integrateBody,
  steeringAccel,
  proNavAccel,
  limitCommand,
  orientToVelocity,
  airDensity,
  dragAccel,
  SEA_LEVEL_DENSITY
} from './physics.js';
import { groundHeight } from './base.js';

/**
 * Interceptor missiles.
 *
 * Flight is a four-phase visual model - eject (cold launch only), boost,
 * sustain, coast - flown with acceleration-limited lead pursuit toward a
 * deliberately simplified predicted intercept point.
 */

export const PHASES = {
  EJECT: 'EJECT',
  BOOST: 'BOOST',
  SUSTAIN: 'SUSTAIN',
  COAST: 'COAST',
  TERMINAL: 'TERMINAL'
};

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _pip = new THREE.Vector3();
const _cmd = new THREE.Vector3();
const _targetAccel = new THREE.Vector3();
const _guide = new THREE.Vector3();
const _loft = new THREE.Vector3();
const _col = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

class Interceptor {
  constructor(index) {
    this.index = index;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.launchDir = new THREE.Vector3(0, 1, 0);
    this.aimBias = new THREE.Vector3();
    this.commandState = { command: new THREE.Vector3(), responseRate: 6 };
    this.trailAcc = { value: 0 };
    this.alive = false;
    this.age = 0;
    this.phase = PHASES.BOOST;
    this.target = null;
    this.battery = null;
    this.spec = null;
    this.minRange = Infinity;
    this.prevRange = Infinity;
    this.opening = 0;
    this.passed = false;
    this.mesh = null;
    this.nozzleGlow = null;
    this.id = '';
    this.serial = 0;
    this.lateral = new THREE.Vector3();
    this.pip = new THREE.Vector3();
    this.motorTime = 0;
  }
}

let serialCounter = 1;

export class InterceptorManager {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.rng = new Rng(settings.seed ^ 0x1cef);
    this.group = new THREE.Group();
    this.group.name = 'interceptors';
    scene.add(this.group);

    this.models = {};
    this.pool = new Pool((i) => new Interceptor(i), 14);
    this.active = [];
    this.listeners = { result: [], launch: [] };
    this.time = 0;
  }

  on(event, fn) {
    this.listeners[event]?.push(fn);
  }

  _emit(event, payload) {
    for (const fn of this.listeners[event] || []) fn(payload);
  }

  /** Build one missile model per battery type, sized from its spec. */
  _model(spec) {
    if (this.models[spec.id]) return this.models[spec.id];
    const s = spec.interceptor;
    const L = s.length;
    const R = s.radius;
    const parts = [];

    // Nose (ogive) + seeker window.
    const nose = G.ogive(R, L * 0.22, 18, 0.58);
    parts.push(G.xform(nose, [0, L * 0.5 - L * 0.22, 0]));
    // Body.
    parts.push(G.xform(new THREE.CylinderGeometry(R, R, L * 0.62, 20), [0, L * 0.5 - L * 0.22 - L * 0.31, 0]));
    // Aft section + nozzle.
    parts.push(G.xform(new THREE.CylinderGeometry(R, R * 0.86, L * 0.16, 20), [0, -L * 0.42, 0]));
    parts.push(G.xform(G.nozzle(R * 0.42, R * 0.78, L * 0.09, 16), [0, -L * 0.52, 0]));
    // Body bands.
    for (let i = 0; i < 3; i++) {
      parts.push(
        G.xform(new THREE.TorusGeometry(R * 1.02, R * 0.05, 6, 20), [0, L * (0.24 - i * 0.2), 0], [Math.PI / 2, 0, 0])
      );
    }
    // Mid-body strakes and aft control fins.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const strake = new THREE.BoxGeometry(R * 0.14, L * 0.3, R * 1.5);
      parts.push(G.xform(strake, [Math.cos(a) * R * 1.0, L * 0.02, Math.sin(a) * R * 1.0], [0, -a, 0]));
      const fin = new THREE.BoxGeometry(R * 0.12, L * 0.13, R * 2.6);
      parts.push(G.xform(fin, [Math.cos(a) * R * 1.4, -L * 0.42, Math.sin(a) * R * 1.4], [0, -a, 0]));
    }

    const geo = G.merge(parts);
    const mat = new THREE.MeshStandardMaterial({
      map: T.metalPanel({ base: '#cfd2ce', seam: '#8d8f89', panels: 3, key: `msl-${spec.id}` }),
      roughness: 0.42,
      metalness: 0.65,
      emissive: new THREE.Color(spec.accent),
      emissiveIntensity: 0.0
    });
    this.models[spec.id] = { geo, mat };
    return this.models[spec.id];
  }

  _acquireMesh(shot) {
    const model = this._model(shot.spec);
    const mesh = new THREE.Mesh(model.geo, model.mat);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    // Scaled up so the missile stays readable at engagement distances.
    mesh.scale.setScalar(2.2);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: T.glowSprite(128, 1.9),
        color: 0xffc070,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    glow.position.y = -shot.spec.interceptor.length * 0.58;
    glow.scale.setScalar(shot.spec.interceptor.length * 3);
    mesh.add(glow);
    this.group.add(mesh);
    shot.mesh = mesh;
    shot.nozzleGlow = glow;
  }

  _releaseMesh(shot) {
    if (!shot.mesh) return;
    this.group.remove(shot.mesh);
    shot.nozzleGlow.material.dispose();
    shot.mesh = null;
    shot.nozzleGlow = null;
  }

  /* -------------------------------------------------- launching */

  launch(battery, target, tubeIndex) {
    const shot = this.pool.acquire();
    if (!shot) return null;
    const spec = battery.spec;
    const s = spec.interceptor;

    const { pos, dir } = battery.getTubeTransform(tubeIndex);
    shot.alive = true;
    shot.age = 0;
    shot.motorTime = 0;
    shot.spec = spec;
    shot.battery = battery;
    shot.target = target;
    shot.serial = serialCounter++;
    shot.id = `${spec.codeLetter}${String(shot.serial).padStart(2, '0')}`;
    shot.pos.copy(pos);
    shot.launchDir.copy(dir);
    shot.minRange = Infinity;
    shot.prevRange = Infinity;
    shot.opening = 0;
    shot.passed = false;
    shot.trailAcc.value = 0;
    shot.commandState.command.set(0, 0, 0);
    shot.commandState.responseRate = s.responseRate;

    if (spec.coldLaunch) {
      shot.phase = PHASES.EJECT;
      shot.vel.copy(dir).multiplyScalar(spec.ejectSpeed);
    } else {
      shot.phase = PHASES.BOOST;
      shot.vel.copy(dir).multiplyScalar(28);
    }

    // A small, deterministic aiming bias so not every shot is a bullseye.
    // Larger when the engagement is opened near the edge of the envelope.
    const range = target ? shot.pos.distanceTo(target.pos) : 0;
    const stretch = saturate(range / spec.envelope.maxRange);
    const errScale = lerp(4, 26, stretch * stretch) * (target?.spiralAmp ? 1.25 : 1);
    shot.aimBias
      .set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1))
      .normalize()
      .multiplyScalar(errScale * this.rng.float());

    shot.quat.setFromUnitVectors(UP, dir);
    this._acquireMesh(shot);
    shot.mesh.position.copy(shot.pos);
    shot.mesh.quaternion.copy(shot.quat);

    this.active.push(shot);
    this._playLaunchEffect(shot, battery, pos, dir);
    this._emit('launch', { shot, battery, target });
    return shot;
  }

  _playLaunchEffect(shot, battery, pos, dir) {
    const e = this.effects;
    if (!e) return;
    const s = battery.spec.interceptor;
    const groundY = groundHeight(battery.anchor.pos.x, battery.anchor.pos.z);

    if (battery.spec.coldLaunch) {
      // Cold launch: a pale gas cloud pushes the round out of the canister,
      // then the motor lights a beat later well clear of the launcher.
      for (let i = 0; i < 70; i++) {
        _v1.copy(pos).addScaledVector(dir, -this.rng.float() * 6);
        _v2.set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1))
          .normalize()
          .multiplyScalar(6 + this.rng.float() * 20);
        e.smoke.spawn(_v1, _v2, {
          life: 3.0 + this.rng.float() * 2.5,
          sizeStart: 2.4,
          sizeEnd: 16 + this.rng.float() * 14,
          alpha: 0.6,
          color: _col.setRGB(0.94, 0.94, 0.95),
          drag: 1.4,
          buoyancy: 1.0,
          seed: this.rng.float()
        });
      }
      e.flash(pos, { power: 400, size: 12, life: 0.3, color: 0xdfe8ff });
      e.addShake(0.18);
    } else {
      e.launchPlume(pos, dir, {
        scale: s.plumeScale,
        groundY,
        color: _col.setRGB(0.87, 0.85, 0.82)
      });
      e.addShake(0.42 * s.plumeScale);
    }

    // Blow the canister cover clear.
    e.spawnDebris(pos, 5, 22, dir);
  }

  /** Second-stage ignition for the cold-launched round. */
  _ignite(shot) {
    shot.phase = PHASES.BOOST;
    shot.motorTime = 0;
    const e = this.effects;
    if (!e) return;
    _v1.copy(shot.vel).normalize();
    e.launchPlume(shot.pos, _v1, {
      scale: shot.spec.interceptor.plumeScale * 0.75,
      groundY: shot.pos.y - 2,
      color: _col.setRGB(0.9, 0.88, 0.85)
    });
    e.flash(shot.pos, { power: 3200, size: 40, life: 0.5, color: 0xffb060 });
    e.addShake(0.5);
  }

  /* -------------------------------------------------- update */

  update(dt, ctx) {
    this.time += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const shot = this.active[i];
      if (!shot.alive) {
        this._releaseMesh(shot);
        this.pool.release(shot);
        this.active.splice(i, 1);
        continue;
      }
      this._updateShot(shot, dt, ctx);
    }
  }

  _updateShot(shot, dt, ctx) {
    const s = shot.spec.interceptor;
    shot.age += dt;
    shot.motorTime += dt;

    let thrustAccel = 0;
    if (shot.phase === PHASES.EJECT) {
      if (shot.age >= shot.spec.ignitionDelay) this._ignite(shot);
    } else if (shot.phase === PHASES.BOOST) {
      thrustAccel = s.boostAccel;
      if (shot.motorTime >= s.boostTime) {
        shot.phase = PHASES.SUSTAIN;
        shot.motorTime = 0;
      }
    } else if (shot.phase === PHASES.SUSTAIN) {
      thrustAccel = s.sustainAccel;
      if (shot.motorTime >= s.sustainTime) {
        shot.phase = PHASES.COAST;
        shot.motorTime = 0;
      }
    }

    // Speed limiter: the motor stops adding energy at the design speed.
    const speed = shot.vel.length();
    if (speed > s.maxSpeed) thrustAccel *= saturate(1 - (speed - s.maxSpeed) / 200);

    _cmd.set(0, 0, 0);
    const target = shot.target && shot.target.alive ? shot.target : null;
    let timeToGo = Infinity;

    if (shot.phase !== PHASES.EJECT) {
      let gain = 1;
      if (target) {
        // Simplified lead pursuit. Two things matter for this to converge: the
        // target is extrapolated under gravity and drag (not just velocity),
        // and the speed handed to the solver is the round's design speed, not
        // whatever it happens to be doing mid-boost. Using the instantaneous
        // speed over-estimates the flight time and parks the aim point
        // kilometres beyond where the target will actually be.
        const designSpeed = Math.max(speed, s.maxSpeed * 0.82);
        _targetAccel.set(0, -GRAVITY, 0);
        const tSpeed = target.vel.length();
        if (tSpeed > 1 && target.bc) {
          const dA = dragAccel(tSpeed, target.pos.y, target.bc);
          _targetAccel.addScaledVector(target.vel, -dA / tSpeed);
        }
        predictIntercept(shot.pos, target.pos, target.vel, designSpeed, _targetAccel, 3, _pip);
        _pip.add(shot.aimBias);
        // Never chase a point underground.
        if (_pip.y < 60) _pip.y = 60;
        shot.pip.copy(_pip);
        timeToGo = shot.pos.distanceTo(_pip) / designSpeed;

        // Proportional navigation on the true target, biased toward the offset
        // aim point so each round still has its own small dispersion.
        _v2.copy(target.pos).add(shot.aimBias);
        proNavAccel(shot.pos, shot.vel, _v2, target.vel, s.navGain ?? 4.2, _guide);
        // Cancel the gravity sag so the round holds its lead instead of
        // slumping below it over a long flight.
        _guide.y += GRAVITY;

        // Endgame: the autopilot tightens up over the last seconds so a
        // well-timed shot inside the envelope converges hard.
        if (timeToGo < 4) {
          gain = lerp(1, 2.2, saturate((4 - timeToGo) / 3.4));
          shot.commandState.responseRate = s.responseRate * gain;
        } else {
          shot.commandState.responseRate = s.responseRate;
        }

        // Loft: for the first part of the boost the round holds its launch
        // attitude and arcs up rather than driving flat at the target. This is
        // what gives the long, dramatic contrail.
        const loftFrac = saturate(1 - shot.age / (s.boostTime * 0.45));
        if (loftFrac > 0) {
          steeringAccel(shot.vel, shot.launchDir, s.maxG, shot.pos.y, dt, null, _loft);
          _guide.lerp(_loft, loftFrac * 0.7);
        }
      } else {
        _guide.set(0, GRAVITY * 0.5, 0);
      }

      // Safety floor: a round climbing away from the pad never commands a
      // descent, so a bad geometry cannot fly it into the ground on launch.
      if (shot.pos.y < 500 && shot.vel.y < 40 && _guide.y < 0) _guide.y = 0;

      limitCommand(_guide, shot.vel, s.maxG * gain, shot.pos.y, dt, shot.commandState, _v3);
      shot.lateral.copy(_v3);
      _cmd.add(_v3);
    }

    if (thrustAccel > 0) {
      _v2.copy(shot.vel);
      if (_v2.lengthSq() < 1e-6) _v2.copy(shot.launchDir);
      _v2.normalize();
      _cmd.addScaledVector(_v2, thrustAccel);
    }

    integrateBody(shot, dt, _cmd);

    orientToVelocity(shot.quat, shot.vel, shot.lateral, dt, 9);
    shot.mesh.position.copy(shot.pos);
    shot.mesh.quaternion.copy(shot.quat);

    // Motor visuals.
    const burning = thrustAccel > 4;
    const glowPower = burning ? (shot.phase === PHASES.BOOST ? 1 : 0.45) : 0;
    shot.nozzleGlow.material.opacity = glowPower;
    shot.nozzleGlow.scale.setScalar(s.length * (2.0 + glowPower * 2.6));
    shot.mesh.material.emissiveIntensity = 0.0;

    if (this.effects && shot.phase !== PHASES.EJECT) {
      this.effects.emitTrail(shot.pos, shot.vel, dt, {
        rate: burning ? 150 : 60,
        widthStart: s.trailWidth,
        widthEnd: s.trailWidth * 8,
        alpha: burning ? 0.66 : 0.34,
        hot: glowPower,
        accumulator: shot.trailAcc
      });
    } else if (this.effects) {
      // Cold-launch coast: just a wisp of ejection gas.
      this.effects.emitTrail(shot.pos, shot.vel, dt, {
        rate: 40,
        widthStart: s.trailWidth * 0.7,
        widthEnd: s.trailWidth * 3,
        alpha: 0.28,
        hot: 0,
        accumulator: shot.trailAcc
      });
    }

    // ---- engagement resolution ----
    if (target) {
      _v1.copy(target.pos).sub(shot.pos);
      const range = _v1.length();
      if (range < shot.minRange) shot.minRange = range;

      // Sub-step closest approach so a 2 km/s closure never tunnels through.
      const ca = closestApproach(shot.pos, shot.vel, target.pos, target.vel, dt);
      const lethal = s.warhead;
      if (ca.dist <= lethal) {
        _v2.copy(shot.pos).addScaledVector(shot.vel, ca.t);
        this._detonate(shot, _v2, target, true);
        return;
      }
      if (range > shot.prevRange) {
        shot.opening += dt;
        if (shot.prevRange < lethal * 14 && !shot.passed) {
          // Close pass: the proximity fuze fires, but out of position.
          shot.passed = true;
          this._detonate(shot, shot.pos, target, false);
          return;
        }
        if (shot.opening > 1.6) {
          // Range has been opening for a while - the engagement has failed.
          this._detonate(shot, shot.pos, target, false, 'NO INTERCEPT');
          return;
        }
      } else {
        shot.opening = 0;
      }
      shot.prevRange = range;
    } else if (shot.target && !shot.target.alive) {
      // Target already gone: self-destruct for a clean visual.
      this._detonate(shot, shot.pos, null, false, 'TARGET DESTROYED');
      return;
    }

    // Bounds: fuel exhausted, out of the world, or back on the deck.
    const gy = groundHeight(shot.pos.x, shot.pos.z);
    if (shot.pos.y <= gy + 1) {
      this._detonate(shot, shot.pos, target, false, 'GROUNDED');
      return;
    }
    if (shot.age > 75 || shot.pos.y > 90000 || shot.pos.length() > 160000) {
      this._detonate(shot, shot.pos, target, false, 'SELF DESTRUCT');
    }
  }

  _detonate(shot, at, target, hit, note = null) {
    shot.alive = false;
    const s = shot.spec.interceptor;
    const e = this.effects;
    if (e) {
      e.explode(at, {
        radius: hit ? s.warhead * 1.5 : s.warhead * 0.8,
        intensity: hit ? 1.5 : 0.8,
        debrisCount: hit ? 26 : 12,
        velocity: shot.vel,
        kind: hit ? 'intercept' : 'miss'
      });
    }
    let outcome;
    if (hit && target) {
      outcome = target.isDecoy ? 'decoy' : 'hit';
    } else {
      outcome = 'miss';
    }
    this._emit('result', {
      shot,
      target,
      outcome,
      missDistance: shot.minRange,
      note,
      position: at.clone()
    });
  }

  reset() {
    for (const shot of this.active) {
      shot.alive = false;
      this._releaseMesh(shot);
      this.pool.release(shot);
    }
    this.active.length = 0;
  }

  get inFlight() {
    return this.active.length;
  }
}
