// interceptors.js — pooled interceptor missiles with boost / guide / terminal
// phases, lead-pursuit steering (simplified fictional model) and kill logic.
import * as THREE from 'three';
import { Pool, clamp, pad2 } from './util.js';
import { GRAVITY, predictIntercept, steerVelocity } from './physics.js';

export function createInterceptors(ctx) {
  const { scene, textures } = ctx;
  const active = [];
  let counter = 0;

  function buildMesh() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.4, metalness: 0.2 })
    );
    group.add(body);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.35, metalness: 0.5 })
    );
    group.add(nose);
    const finGeo = new THREE.BoxGeometry(0.06, 1, 1);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.4 });
    const fins = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(finGeo, finMat);
      fins.push(f);
      group.add(f);
    }
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.hardFlare(), color: 0xffc27a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
    }));
    group.add(flame);
    group.visible = false;
    scene.add(group);
    return { group, body, nose, fins, flame };
  }

  const pool = new Pool(() => ({
    mesh: buildMesh(),
    id: '', battery: null, def: null, track: null, threat: null,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    age: 0, phase: 'boost', alive: false,
    trail: null, emitAcc: 0, minDist: 1e9, weaveSeed: 0,
    lastPredict: new THREE.Vector3(), predictT: 0,
  }), 14);

  const _v = new THREE.Vector3();
  const _desired = new THREE.Vector3();
  const _look = new THREE.Vector3();

  function shapeMesh(m, def) {
    const L = def.length, R = def.girth;
    m.body.scale.set(R, R, L * 0.8);
    m.body.position.z = -L * 0.1;
    m.nose.scale.set(R, R, L * 0.2);
    m.nose.position.z = L * 0.4;
    m.fins.forEach((f, i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      f.scale.set(1, R * 3.4, L * 0.14);
      f.position.set(Math.cos(a) * R * 1.4, Math.sin(a) * R * 1.4, -L * 0.42);
      f.rotation.z = a;
    });
    m.flame.position.z = -L * 0.55;
  }

  function resolveDetonation(it, dist) {
    const threat = it.threat;
    const def = it.def;
    const env = it.battery.def.envelope;
    const alt = it.pos.y;
    const range = Math.hypot(it.pos.x, it.pos.z);

    // fictional kill probability: envelope quality x geometry
    let envFactor = 1.0;
    let reason = null;
    if (alt < env.minAlt || alt > env.maxAlt || range > env.maxRange) {
      envFactor = 0.35;
      reason = 'OUTSIDE ENGAGEMENT ENVELOPE';
    } else if (alt < env.sweetLow || alt > env.sweetHigh) {
      envFactor = 0.72;
      reason = 'MARGINAL GEOMETRY';
    }
    _v.copy(threat.vel).normalize();
    const closing = _v.dot(it.vel.clone().normalize());
    const geomFactor = closing < -0.25 ? 1.0 : 0.8; // head-on best
    if (geomFactor < 1 && !reason) reason = 'CROSSING ENGAGEMENT';
    const proxFactor = clamp(1.25 - dist / (def.killRadius * 1.6), 0.4, 1);

    const pk = 0.94 * envFactor * geomFactor * proxFactor;
    const roll = ctx.rng.next();
    const hit = roll < pk;

    if (hit) {
      const point = it.pos.clone().lerp(threat.pos, 0.5);
      ctx.threats.destroy(threat, point);
      ctx.events.emit('intercept-success', {
        interceptor: it, threat, point,
        decoy: threat.isDecoy,
      });
    } else {
      ctx.effects.explosionAir(it.pos, 0.55);
      ctx.events.emit('intercept-miss', {
        interceptor: it, threat,
        reason: reason ?? 'PROXIMITY FUZE — DEBRIS MISSED',
      });
    }
    destroy(it, false);
  }

  function destroy(it, withFx = true) {
    if (!it.alive) return;
    it.alive = false;
    if (withFx) ctx.effects.explosionAir(it.pos, 0.4);
    it.mesh.group.visible = false;
    if (it.trail) { ctx.effects.releaseTrail(it.trail); it.trail = null; }
    const i = active.indexOf(it);
    if (i >= 0) active.splice(i, 1);
    pool.release(it);
  }

  const api = {
    active,
    launch(battery, track, muzzlePos, muzzleDir) {
      const it = pool.acquire();
      if (!it) return null;
      counter++;
      const def = battery.def.interceptor;
      it.id = 'IN-' + pad2(counter);
      it.battery = battery;
      it.def = def;
      it.track = track;
      it.threat = track.threat;
      it.pos.copy(muzzlePos);
      it.vel.copy(muzzleDir).multiplyScalar(32); // eject velocity
      it.age = 0;
      it.phase = 'boost';
      it.alive = true;
      it.minDist = 1e9;
      it.emitAcc = 0;
      it.weaveSeed = ctx.rng.next() * 10;
      it.threat.engagedBy++;

      shapeMesh(it.mesh, def);
      it.mesh.group.visible = true;
      it.mesh.group.position.copy(it.pos);
      it.mesh.flame.material.color.setHex(def.flame);

      it.trail = ctx.effects.acquireTrail({
        color: 0xf2ede2,
        life: 9,
        opacity: 0.8,
      });
      // launch effects at the muzzle
      ctx.effects.launchBlast(muzzlePos, muzzleDir, battery.id === 'sentinel' ? 1.9 : battery.id === 'thaad' ? 1.25 : 1.0);
      active.push(it);
      return it;
    },
    clear() { for (const it of [...active]) destroy(it, false); },
    update(dt) {
      for (const it of [...active]) {
        it.age += dt;
        const def = it.def;
        const threat = it.threat;
        const targetAlive = threat && threat.alive;

        // ---- guidance target
        let desiredDir = null;
        if (targetAlive) {
          const sol = predictIntercept(it.pos, threat.pos, threat.vel, Math.max(def.avgSpeed, it.vel.length()));
          if (sol) {
            it.lastPredict.copy(sol.point);
            it.predictT = sol.t;
            _desired.subVectors(sol.point, it.pos).normalize();
            desiredDir = _desired;
          } else {
            _desired.subVectors(threat.pos, it.pos).normalize();
            desiredDir = _desired;
          }
        }

        const distToTarget = targetAlive ? it.pos.distanceTo(threat.pos) : 1e9;

        // ---- phases
        if (it.phase === 'boost') {
          const thrustDir = _v.copy(it.vel).normalize();
          it.vel.addScaledVector(thrustDir, def.accel * dt);
          // limited steering while boosting (pitch-over)
          if (desiredDir && it.age > 0.55) {
            steerVelocity(it.vel, desiredDir, def.turnRate * 0.55, dt);
          }
          it.vel.y -= GRAVITY * 0.4 * dt;
          if (it.age >= def.boostTime) it.phase = 'guide';
        } else {
          // sustainer: hold speed, bleed a little in turns
          const speed = it.vel.length();
          if (speed < def.maxSpeed) {
            it.vel.multiplyScalar(1 + clamp((def.accel * 0.35 * dt) / speed, 0, 0.05));
          }
          it.vel.y -= GRAVITY * 0.25 * dt;
          if (desiredDir) {
            const terminal = distToTarget < 700;
            it.phase = terminal ? 'terminal' : 'guide';
            let rate = def.turnRate * (terminal ? 1.9 : 1.0);
            // visible mid-course corrections without jitter
            if (!terminal) {
              const w = Math.sin(it.age * 1.7 + it.weaveSeed) * 0.06;
              _desired.applyAxisAngle(_v.set(0, 1, 0), w * 0.5);
            }
            steerVelocity(it.vel, _desired, rate, dt);
          }
        }
        const speed = it.vel.length();
        if (speed > def.maxSpeed) it.vel.multiplyScalar(def.maxSpeed / speed);

        it.pos.addScaledVector(it.vel, dt);
        it.mesh.group.position.copy(it.pos);
        _look.copy(it.pos).add(it.vel);
        it.mesh.group.lookAt(_look);

        // flame + trail
        const boosting = it.phase === 'boost';
        it.mesh.flame.material.opacity = boosting ? 0.95 : 0.35;
        const dCam = it.pos.distanceTo(ctx.camera.position);
        it.mesh.flame.scale.setScalar((boosting ? 7 : 2.6) * clamp(0.7 + dCam * 0.004, 0.8, 8));
        it.emitAcc += dt;
        if (it.emitAcc > 0.03 && it.trail) {
          it.emitAcc = 0;
          const airK = clamp(it.pos.y / 6500, 0, 1);
          const w = def.trailWidth * (boosting ? 2.6 : 1.4) * (0.6 + airK * 1.1);
          it.trail.emit(it.pos, w, boosting ? 1.0 : 0.55 + airK * 0.3);
        }

        // ---- endgame
        if (targetAlive) {
          if (distToTarget < def.killRadius) {
            resolveDetonation(it, distToTarget);
            continue;
          }
          if (distToTarget < it.minDist) {
            it.minDist = distToTarget;
          } else if (it.minDist < 260 && distToTarget > it.minDist + 14) {
            // passed closest approach — proximity detonation attempt
            if (it.minDist < def.killRadius * 2.2) {
              resolveDetonation(it, it.minDist);
            } else {
              ctx.effects.explosionAir(it.pos, 0.5);
              ctx.events.emit('intercept-miss', {
                interceptor: it, threat,
                reason: 'CLOSEST APPROACH ' + Math.round(it.minDist) + ' m — NO FUZE',
              });
              destroy(it, false);
            }
            continue;
          }
        } else if (it.age > 1.2) {
          // target already gone: safe self-destruct
          ctx.effects.explosionAir(it.pos, 0.45);
          ctx.events.emit('interceptor-expended', { interceptor: it });
          destroy(it, false);
          continue;
        }
        if (it.age > 80 || it.pos.y < -5) {
          ctx.events.emit('intercept-miss', { interceptor: it, threat, reason: 'INTERCEPTOR EXPENDED' });
          destroy(it);
        }
      }
    },
  };
  return api;
}
