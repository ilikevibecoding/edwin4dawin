// Pooled interceptor missiles with boost / midcourse / terminal phases,
// lead-pursuit steering against ballistic targets, per-battery flight
// characteristics and outcome resolution (hit / miss / out-of-envelope).
// Deliberately simplified, fictional guidance — tuned for readable arcs.
import * as THREE from 'three';
import { WORLD } from './constants.js';
import { predictInterceptPoint, steerTowards, airDensity } from './physics.js';
import { flareSprite, stencilTexture } from './textures.js';

const _v = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _aim = new THREE.Vector3();
const G_VEC = new THREE.Vector3(0, -WORLD.gravity, 0);

let NEXT_MISSILE = 1;

function buildVariant(defId) {
  const g = new THREE.Group();
  const liveryColor = { rampart: 0xb9c0af, zenith: 0xd8dcd8, sentinel: 0xe8e4dc }[defId];
  const len = { rampart: 5.2, zenith: 6.2, sentinel: 8.4 }[defId];
  const rad = { rampart: 0.26, zenith: 0.34, sentinel: 0.52 }[defId];
  const mat = new THREE.MeshStandardMaterial({ color: liveryColor, roughness: 0.42, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.94, len * 0.72, 12), mat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(rad, len * 0.28, 12), mat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = len * 0.5;
  g.add(nose);
  // fins
  const finMat = new THREE.MeshStandardMaterial({ color: 0x3c423a, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, rad * 2.6, len * 0.16), finMat);
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * rad, Math.sin(a) * rad, -len * 0.33);
    fin.rotation.z = a;
    g.add(fin);
  }
  if (defId === 'sentinel') {
    // test-article roll pattern band
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(rad * 1.01, rad * 1.01, len * 0.14, 12),
      new THREE.MeshStandardMaterial({ map: stencilTexture('◼◻◼◻◼◻◼◻', { w: 256, h: 32, size: 26, color: '#1d1f24', bg: '#e8e4dc' }), roughness: 0.5 }),
    );
    band.rotation.x = Math.PI / 2;
    band.position.z = -len * 0.1;
    g.add(band);
  }
  g.visible = false;
  return g;
}

class Missile {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);
    this.variants = {
      rampart: buildVariant('rampart'),
      zenith: buildVariant('zenith'),
      sentinel: buildVariant('sentinel'),
    };
    for (const v of Object.values(this.variants)) this.root.add(v);
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareSprite(), color: 0xffd9a2, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.flare.position.z = -3;
    this.root.add(this.flare);

    this.active = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.def = null;
    this.track = null;
    this.age = 0;
    this.trail = null;
    this.doomOffset = new THREE.Vector3();
    this.doomed = false;
    this.doomReason = '';
    this.minDist = Infinity;
    this.batteryId = '';
    this.id = 0;
  }
}

export class Interceptors {
  constructor({ scene, events, rng, effects, threats }) {
    this.scene = scene;
    this.events = events;
    this.rng = rng.fork(17);
    this.effects = effects;
    this.threats = threats;
    this.pool = [];
    for (let i = 0; i < 12; i++) this.pool.push(new Missile(scene));
  }

  get active() { return this.pool.filter(m => m.active); }

  /**
   * Fire from a battery muzzle against a radar track.
   * Kill probability is a fictional gameplay abstraction: geometry inside the
   * battery's envelope → high; outside → guaranteed miss with a clear reason.
   */
  launch(battery, track, muzzlePos, muzzleDir) {
    const m = this.pool.find(m => !m.active);
    if (!m) return null;
    const def = battery.def;
    m.id = NEXT_MISSILE++;
    m.active = true;
    m.def = def;
    m.batteryId = battery.id;
    m.track = track;
    m.age = 0;
    m.minDist = Infinity;
    m.pos.copy(muzzlePos);
    m.vel.copy(muzzleDir).multiplyScalar(34); // tube eject velocity
    m.root.position.copy(m.pos);
    m.root.visible = true;
    for (const [k, v] of Object.entries(m.variants)) v.visible = (k === def.id);
    m.flare.material.opacity = 0;
    m.trail = this.effects.acquireTrail({
      width: def.trail.width, life: def.trail.life, color: 0xe8e6e2, opacity: 0.7,
    });
    m.trail.minDist = 6;

    // outcome roll at launch (fictional, transparent to player via reasons)
    m.doomed = false;
    m.doomReason = '';
    const threat = track?.threat;
    if (!threat || !threat.active) {
      m.doomed = true;
      m.doomReason = 'TRACK LOST AT LAUNCH';
    } else {
      const sol = predictInterceptPoint(muzzlePos, threat.pos, threat.vel, def.maxSpeed * 0.72);
      if (!sol) {
        m.doomed = true;
        m.doomReason = 'NO INTERCEPT SOLUTION — TOO LATE';
      } else {
        const p = sol.point;
        const rangeFromBattery = Math.hypot(p.x - muzzlePos.x, p.z - muzzlePos.z);
        const env = def.envelope;
        if (p.y < env.minAlt) { m.doomed = true; m.doomReason = `PREDICTED INTERCEPT BELOW ${def.name} FLOOR`; }
        else if (p.y > env.maxAlt) { m.doomed = true; m.doomReason = `PREDICTED INTERCEPT ABOVE ${def.name} CEILING`; }
        else if (rangeFromBattery > env.maxRange) { m.doomed = true; m.doomReason = 'TARGET OUTSIDE ENGAGEMENT RANGE'; }
        else {
          // difficulty rises near envelope edges
          const edge = Math.max(
            (p.y - env.minAlt < 500) ? 0.5 : 0,
            (env.maxAlt - p.y < 800) ? 0.35 : 0,
            (env.maxRange - rangeFromBattery < 900) ? 0.35 : 0,
          );
          const pk = 0.94 - edge * 0.5;
          if (this.rng.next() > pk) {
            m.doomed = true;
            m.doomReason = 'KILL VEHICLE DISPERSION — NEAR MISS';
          }
        }
      }
    }
    // doomed missiles aim at a consistent offset point → cinematic near miss
    if (m.doomed) {
      _v.set(this.rng.gauss(0, 1), this.rng.gauss(0, 0.6), this.rng.gauss(0, 1)).normalize();
      m.doomOffset.copy(_v).multiplyScalar(this.rng.range(38, 90));
    } else {
      m.doomOffset.set(0, 0, 0);
    }

    this.events.emit('interceptor-launched', { missile: m, battery, track });
    return m;
  }

  update(dt) {
    for (const m of this.pool) {
      if (!m.active) continue;
      m.age += dt;
      const def = m.def;
      const boosting = m.age < def.boostTime;
      const threat = m.track?.threat;
      const targetAlive = threat && threat.active;

      // --- guidance: lead pursuit toward predicted intercept point
      let hasAim = false;
      if (targetAlive) {
        const sol = predictInterceptPoint(m.pos, threat.pos, threat.vel, Math.max(m.vel.length(), def.maxSpeed * 0.6));
        if (sol) {
          _aim.copy(sol.point).add(m.doomOffset);
          hasAim = true;
        } else {
          _aim.copy(threat.pos).add(m.doomOffset);
          hasAim = true;
        }
      }
      if (hasAim) {
        _desired.subVectors(_aim, m.pos).normalize();
      } else {
        _desired.copy(m.vel).normalize(); // fly straight, will self-destruct
      }

      const dist = targetAlive ? m.pos.distanceTo(threat.pos) : Infinity;
      const terminal = dist < 1100;
      // vertical rise off the rail for the first moments (cinematic + safe)
      if (m.age < 0.85 && def.id !== 'rampart') _desired.lerp(_v.set(0, 1, 0), 0.55).normalize();
      const gLimit = def.turnG * 9.81 * (boosting ? 0.55 : 1) * (terminal ? 1.35 : 1);
      steerTowards(m.vel, _desired, gLimit, dt);

      // --- propulsion & drag
      if (boosting) {
        const speed = m.vel.length();
        if (speed < def.maxSpeed) {
          _v.copy(m.vel).normalize().multiplyScalar(def.boostAccel * dt);
          m.vel.add(_v);
        }
      } else {
        // gravity + mild drag when coasting
        m.vel.addScaledVector(G_VEC, dt * 0.55); // partial lift compensation (fictional)
        const rho = airDensity(m.pos.y);
        m.vel.multiplyScalar(Math.max(0, 1 - rho * 0.028 * dt));
      }
      m.pos.addScaledVector(m.vel, dt);
      m.root.position.copy(m.pos);
      if (m.vel.lengthSq() > 1) {
        _v.copy(m.vel).normalize();
        m.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _v);
      }

      // --- exhaust visuals
      if (boosting) {
        m.flare.material.opacity = 0.9;
        m.flare.scale.setScalar(7 + def.plumeScale * 5 + Math.sin(m.age * 40) * 1.2);
        this.effects.exhaust(m.pos, m.vel, def.plumeScale, dt);
      } else {
        m.flare.material.opacity = Math.max(0, m.flare.material.opacity - dt * 2);
      }
      if (m.trail) m.trail.push(m.pos);

      // --- outcome checks
      if (targetAlive) {
        if (dist < m.minDist) m.minDist = dist;
        const killR = m.doomed ? -1 : def.killRadius;
        const relSpeed = _v.subVectors(m.vel, threat.vel).length();
        if (dist <= killR + relSpeed * dt) {
          // KILL
          _v.copy(m.pos).lerp(threat.pos, 0.5);
          const isDecoy = threat.isDecoy;
          this.effects.airBurst(_v, 0.9 + def.plumeScale * 0.55);
          threat.despawn();
          this._finish(m);
          this.events.emit('intercept-hit', {
            missile: m, threat, pos: _v.clone(), decoy: isDecoy,
            reason: isDecoy ? 'TARGET WAS A DECOY — NO WARHEAD' : 'PROXIMITY KILL CONFIRMED',
          });
          continue;
        }
        // passed closest approach → detonate as a miss
        if (dist > m.minDist + 26 && m.minDist < 900 && (terminal || m.doomed)) {
          this.effects.airBurst(m.pos, 0.5, 0xffc9a0);
          this._finish(m);
          this.events.emit('intercept-miss', {
            missile: m, threat,
            reason: m.doomReason || `PROXIMITY MISS — CLOSEST ${Math.round(m.minDist)} m`,
          });
          continue;
        }
      }
      // target gone (impacted / already killed) → self-destruct
      if (!targetAlive && m.age > 1.5) {
        this.effects.airBurst(m.pos, 0.45, 0xffd9b0);
        this._finish(m);
        this.events.emit('intercept-miss', {
          missile: m, threat: null,
          reason: m.doomReason || 'TARGET NO LONGER TRACKED — RANGE SAFETY DESTRUCT',
        });
        continue;
      }
      // ground / timeout safety
      if (m.pos.y <= 2 || m.age > 85) {
        if (m.pos.y <= 2) this.effects.groundImpact(m.pos, 0.5);
        else this.effects.airBurst(m.pos, 0.4);
        this._finish(m);
        this.events.emit('intercept-miss', {
          missile: m, threat: targetAlive ? threat : null,
          reason: m.doomReason || 'RANGE SAFETY DESTRUCT',
        });
      }
    }
  }

  _finish(m) {
    m.active = false;
    m.root.visible = false;
    if (m.trail) { m.trail.release(); m.trail = null; }
  }

  stopAll() {
    for (const m of this.pool) if (m.active) this._finish(m);
  }
}
