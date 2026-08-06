// Pooled interceptor missiles with boost / midcourse / terminal phases,
// lead-pursuit steering against ballistic targets, per-battery flight
// characteristics and outcome resolution (hit / miss / out-of-envelope).
// Deliberately simplified, fictional guidance — tuned for readable arcs.
import * as THREE from 'three';
import { WORLD } from './constants.js';
import { predictInterceptPoint, steerTowards, airDensity } from './physics.js';
import { flareSprite, stencilTexture } from './textures.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _rel = new THREE.Vector3();
const _Z = new THREE.Vector3(0, 0, 1);
const G_VEC = new THREE.Vector3(0, -WORLD.gravity, 0);

// Aim-point low-pass rate (1/s). The iterative intercept solve can hop
// between nearby solutions frame-to-frame; smoothing at ~5 Hz turns that
// into visible, unhurried control corrections instead of nervous jitter.
const AIM_LP = 5.0;
const AIM_LP_TERMINAL = 9.0;

// Per-airframe launch profile (fictional): cold-launch ignition delay,
// initial vertical rise, and low-speed thrust-vector turn authority so the
// bird can actually tip over onto the intercept line while slow.
// floorMargin: the launch-time intercept prediction runs a touch optimistic on
// steep, short flyouts (cold-launch + rise eat into average speed), so the
// floor check gets a safety pad to keep real intercepts above the stated floor.
const PROFILE = {
  rampart: { ignition: 0.03, riseTime: 0, tvc: 0.55, tvcSpeed: 460, floorMargin: 0 },
  zenith: { ignition: 0.12, riseTime: 0.85, tvc: 0.45, tvcSpeed: 540, floorMargin: 120 },
  sentinel: { ignition: 0.30, riseTime: 0.60, tvc: 0.50, tvcSpeed: 660, floorMargin: 300 },
};

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
    this.doomKind = '';
    this.minDist = Infinity;
    this.batteryId = '';
    this.id = 0;
    // guidance smoothing / theater state (reused, no per-step allocs)
    this.aimSm = new THREE.Vector3();
    this.aimInit = false;
    this.turnSm = 0;          // low-passed applied turn accel (drives roll)
    this.roll = 0;            // visual roll angle around velocity axis
    this.passTimer = 0;       // counts up after passing closest approach
    this.loseTimer = 0;       // counts up once the target is gone
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

  /** any missile low enough to cast a visible moving shadow near the base */
  get anyLow() {
    for (const m of this.pool) if (m.active && m.pos.y < 500) return true;
    return false;
  }

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
    m.aimInit = false;
    m.turnSm = 0;
    m.roll = 0;
    m.passTimer = 0;
    m.loseTimer = 0;
    m.pos.copy(muzzlePos);
    m.vel.copy(muzzleDir).multiplyScalar(34); // tube eject velocity
    m.root.position.copy(m.pos);
    m.root.visible = true;
    for (const [k, v] of Object.entries(m.variants)) v.visible = (k === def.id);
    m.flare.material.opacity = 0;
    m.trail = this.effects.acquireTrail({
      width: def.trail.width, life: def.trail.life, color: 0xe8e6e2, opacity: 0.7,
    });
    // node spacing scales with the airframe's reach so long pursuits keep a
    // readable arc within the fixed trail node budget
    m.trail.minDist = { rampart: 7, zenith: 16, sentinel: 26 }[def.id] ?? 7;

    // outcome roll at launch (fictional, transparent to player via reasons)
    m.doomed = false;
    m.doomReason = '';
    m.doomKind = '';
    const threat = track?.threat;
    let solPoint = null;
    if (!threat || !threat.active) {
      m.doomed = true;
      m.doomKind = 'lost';
      m.doomReason = 'TRACK LOST AT LAUNCH';
    } else {
      const sol = predictInterceptPoint(muzzlePos, threat.pos, threat.vel, def.maxSpeed * 0.72);
      if (!sol) {
        m.doomed = true;
        m.doomKind = 'late';
        m.doomReason = 'NO INTERCEPT SOLUTION — TOO LATE';
      } else {
        const p = sol.point;
        solPoint = _v2.copy(p); // keep for offset shaping below
        const rangeFromBattery = Math.hypot(p.x - muzzlePos.x, p.z - muzzlePos.z);
        const env = def.envelope;
        if (p.y < env.minAlt + PROFILE[def.id].floorMargin) { m.doomed = true; m.doomKind = 'floor'; m.doomReason = `PREDICTED INTERCEPT BELOW ${def.name} FLOOR`; }
        else if (p.y > env.maxAlt) { m.doomed = true; m.doomKind = 'ceiling'; m.doomReason = `PREDICTED INTERCEPT ABOVE ${def.name} CEILING`; }
        else if (rangeFromBattery > env.maxRange) { m.doomed = true; m.doomKind = 'range'; m.doomReason = 'TARGET OUTSIDE ENGAGEMENT RANGE'; }
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
            m.doomKind = 'pk';
            m.doomReason = 'KILL VEHICLE DISPERSION — NEAR MISS';
          }
        }
      }
    }
    // Doomed missiles aim at a consistent offset point → cinematic near miss
    // that passes close (30-70 m). Offset direction is shaped by the failure
    // mode so the theater reads correctly (falls short / passes under, etc).
    if (m.doomed) {
      // realized pass ≈ mag + a little terminal guidance lag on late shots,
      // so sample slightly under the advertised 30-70 m near-miss band
      const mag = this.rng.range(30, 56);
      _v.set(this.rng.gauss(0, 1), this.rng.gauss(0, 0.5), this.rng.gauss(0, 1));
      if (_v.lengthSq() < 1e-6) _v.set(1, 0, 0.4);
      _v.normalize();
      if (m.doomKind === 'ceiling') _v.y = -(Math.abs(_v.y) + 1.2);            // strains, passes under
      else if (m.doomKind === 'floor') _v.y = Math.abs(_v.y) + 1.2;            // fuze window never opens — sails over
      else if (m.doomKind === 'range' && solPoint) {
        // runs out of energy — falls short toward the battery
        _aim.subVectors(muzzlePos, solPoint).setY(0).normalize();
        _v.addScaledVector(_aim, 1.6).y -= 0.5;
      }
      _v.normalize();
      // Keep the offset perpendicular to the estimated closing velocity: a
      // component along the closing axis only shifts the meeting time, and can
      // collapse the realized pass distance well inside the kill radius
      // (ugly "how did THAT not hit" misses at 12-15 m).
      if (solPoint && threat && threat.active) {
        _rel.subVectors(solPoint, muzzlePos).normalize().multiplyScalar(def.maxSpeed * 0.72).sub(threat.vel);
        if (_rel.lengthSq() > 1) {
          _rel.normalize();
          _v.addScaledVector(_rel, -_v.dot(_rel));
          if (_v.lengthSq() < 0.04) _v.set(-_rel.z, 0, _rel.x); // shaping was axial — fall back to a lateral pass
          if (_v.lengthSq() < 1e-6) _v.set(1, 0, 0);
          _v.normalize();
        }
      }
      m.doomOffset.copy(_v).multiplyScalar(mag);
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
      const prof = PROFILE[def.id];
      const lit = m.age >= prof.ignition;                       // motor burning?
      const boosting = lit && m.age < prof.ignition + def.boostTime;
      const threat = m.track?.threat;
      const targetAlive = threat && threat.active;
      const dist = targetAlive ? m.pos.distanceTo(threat.pos) : Infinity;
      const terminal = dist < 1100;

      // --- guidance: lead pursuit toward a low-passed intercept point
      let hasAim = false;
      if (targetAlive) {
        const sol = predictInterceptPoint(m.pos, threat.pos, threat.vel, Math.max(m.vel.length(), def.maxSpeed * 0.6));
        if (sol) _aim.copy(sol.point).add(m.doomOffset);
        else _aim.copy(threat.pos).add(m.doomOffset); // too late for a lead solution — chase
        if (!m.aimInit) { m.aimSm.copy(_aim); m.aimInit = true; }
        else m.aimSm.lerp(_aim, 1 - Math.exp(-dt * (terminal ? AIM_LP_TERMINAL : AIM_LP)));
        hasAim = true;
      }
      if (hasAim) {
        _desired.subVectors(m.aimSm, m.pos).normalize();
      } else {
        _desired.copy(m.vel).normalize(); // fly straight, will self-destruct
      }

      // vertical rise off the rail for the first moments (cinematic + safe)
      if (m.age < prof.riseTime) _desired.lerp(_v.set(0, 1, 0), 0.55).normalize();

      let turn = 0;
      if (lit) {
        const speed0 = m.vel.length();
        let gLimit = def.turnG * 9.81 * (boosting ? 0.55 : 1) * (terminal ? 1.35 : 1);
        // low-speed thrust vectoring: generous authority right off the rail
        // (leap → arc over), fading out as the airframe gains speed
        if (boosting) gLimit += def.boostAccel * prof.tvc * Math.max(0, 1 - speed0 / prof.tvcSpeed);
        turn = steerTowards(m.vel, _desired, gLimit, dt);
      }
      m.turnSm += (turn - m.turnSm) * Math.min(1, dt * 5);

      // --- propulsion & drag
      if (boosting) {
        const speed = m.vel.length();
        if (speed < def.maxSpeed) {
          _v.copy(m.vel).normalize().multiplyScalar(def.boostAccel * dt);
          m.vel.add(_v);
        }
      } else {
        // gravity + mild drag when coasting (full gravity before ignition)
        m.vel.addScaledVector(G_VEC, dt * (lit ? 0.55 : 1)); // partial lift compensation (fictional)
        const rho = airDensity(m.pos.y);
        m.vel.multiplyScalar(Math.max(0, 1 - rho * 0.028 * dt));
      }
      m.pos.addScaledVector(m.vel, dt);
      m.root.position.copy(m.pos);
      if (m.vel.lengthSq() > 1) {
        _v.copy(m.vel).normalize();
        m.root.quaternion.setFromUnitVectors(_Z, _v);
        // subtle corkscrew roll proportional to commanded turn (visual only)
        m.roll += (0.5 + 2.6 * Math.min(1, m.turnSm / 130)) * dt;
        m.root.rotateZ(m.roll);
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
        // closest approach across the step (relative segment) — keeps the
        // proximity fuze honest at 120 Hz closing speeds
        _rel.subVectors(threat.pos, m.pos);              // rel after integration
        _v.subVectors(m.vel, threat.vel);                // relative velocity
        const relSpeed = _v.length();
        let closest = _rel.length();
        if (relSpeed > 1) {
          _v2.copy(_rel).addScaledVector(_v, dt);        // rel before integration
          const segLen2 = relSpeed * relSpeed * dt * dt;
          const s = Math.min(1, Math.max(0, _v2.dot(_v) * dt / segLen2));
          closest = Math.min(closest, _v2.addScaledVector(_v, -s * dt).length());
        }
        if (closest < m.minDist) m.minDist = closest;

        if (!m.doomed && closest <= def.killRadius) {
          // KILL
          _v.copy(m.pos).lerp(threat.pos, 0.5);
          const isDecoy = threat.isDecoy;
          this.effects.airBurst(_v, 0.9 + def.plumeScale * 0.55);
          threat.despawn('intercepted');
          this._finish(m);
          this.events.emit('intercept-hit', {
            missile: m, threat, pos: _v.clone(), decoy: isDecoy,
            reason: isDecoy ? 'TARGET WAS A DECOY — NO WARHEAD' : 'PROXIMITY KILL CONFIRMED',
          });
          continue;
        }
        // passed closest approach → let it visibly whiff by, then detonate
        if ((terminal || m.doomed) && m.minDist < 900 && dist > m.minDist + 14) {
          m.passTimer += dt;
          if (m.passTimer > 0.34) {
            this.effects.airBurst(m.pos, 0.55, 0xffc9a0);
            this._finish(m);
            const closeNote = m.minDist < 2000 ? ` (CLOSEST ${Math.round(m.minDist)} m)` : '';
            this.events.emit('intercept-miss', {
              missile: m, threat,
              reason: m.doomReason ? m.doomReason + closeNote : `PROXIMITY MISS — CLOSEST ${Math.round(m.minDist)} m`,
            });
            continue;
          }
        } else {
          m.passTimer = 0;
        }
      }
      // target gone (impacted / killed / burned out) → brief coast, then a
      // clean range-safety destruct with a reason that matches the fate
      if (!targetAlive && m.age > 0.8) {
        m.loseTimer += dt;
        if (m.loseTimer > 0.9) {
          this.effects.airBurst(m.pos, 0.45, 0xffd9b0);
          this._finish(m);
          let reason;
          if (m.doomKind === 'lost') reason = m.doomReason;
          else if (threat && threat.fate === 'intercepted') reason = 'TARGET ALREADY DESTROYED — FLIGHT TERMINATED';
          else if (threat && threat.fate === 'impact') reason = 'TARGET IMPACTED — RANGE SAFETY DESTRUCT';
          else if (threat && threat.fate === 'burnout') reason = 'TARGET BURNED OUT (DECOY) — FLIGHT TERMINATED';
          else reason = m.doomReason || 'TARGET NO LONGER TRACKED — RANGE SAFETY DESTRUCT';
          this.events.emit('intercept-miss', { missile: m, threat: null, reason });
          continue;
        }
      }
      // ground / timeout safety
      if (m.pos.y <= 2 || m.age > 85) {
        if (m.pos.y <= 2) this.effects.groundImpact(m.pos, 0.5);
        else this.effects.airBurst(m.pos, 0.4);
        this._finish(m);
        this.events.emit('intercept-miss', {
          missile: m, threat: targetAlive ? threat : null,
          reason: m.doomReason || (m.pos.y <= 2 ? 'GROUND CONTACT — ROUND LOST' : 'RANGE SAFETY DESTRUCT'),
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
