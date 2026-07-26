import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib } from '../world/textures.js';
import { buildEnemyRifle } from '../weapons/models.js';
import { makeRNG, clamp, damp } from '../core/math.js';

const NAMES = ['ASWAD', 'JACKAL', 'VIPER', 'KHAT', 'RAMI', 'ZOLTAN', 'HYENA', 'SCARAB', 'FALAK', 'DERVISH', 'MIRAGE', 'SIROCCO'];
const rng = makeRNG(5150);

/* ------------------------------ soldier model ------------------------------ */

function buildSoldier(variant = 0) {
  const lib = getMaterialLib();
  const skinTone = [0x8a6248, 0x6f4c36, 0x9c7354][variant % 3];
  const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.85 });
  const cloth = [
    lib.camo,
    new THREE.MeshStandardMaterial({ color: 0x6b6357, roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: 0x767a5e, roughness: 0.95 }),
  ][variant % 3];
  const pants = new THREE.MeshStandardMaterial({ color: [0x6e6852, 0x565046, 0x60604c][variant % 3], roughness: 0.95 });
  const gear = new THREE.MeshStandardMaterial({ color: 0x40453a, roughness: 0.9 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x2e261c, roughness: 0.9 });

  const root = new THREE.Group();

  // -- torso assembly
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.02;
  root.add(torsoPivot);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.56, 0.27, 2, 0.07), cloth);
  torso.position.y = 0.28;
  torsoPivot.add(torso);
  // Shoulder bulk
  for (const s of [-1, 1]) {
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.12, 0.24, 2, 0.04), cloth);
    pad.position.set(s * 0.235, 0.5, 0);
    torsoPivot.add(pad);
  }
  // Chest rig / vest with plate
  const vest = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.38, 0.34, 2, 0.06), gear);
  vest.position.y = 0.3;
  torsoPivot.add(vest);
  for (let i = 0; i < 3; i++) {
    const pouch = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.14, 0.06, 1, 0.02), gear);
    pouch.position.set(-0.13 + i * 0.13, 0.24, 0.195);
    torsoPivot.add(pouch);
  }
  // Belt + canteen
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.3), gear);
  belt.position.y = 0.0;
  torsoPivot.add(belt);
  const canteen = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.14, 0.08, 1, 0.03), gear);
  canteen.position.set(-0.2, -0.06, -0.1);
  torsoPivot.add(canteen);

  // -- head (slightly oversized reads better at game distances)
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.62;
  torsoPivot.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skin);
  head.position.y = 0.11;
  head.scale.set(0.9, 1.08, 0.96);
  headPivot.add(head);
  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), skin);
  neck.position.y = 0.0;
  headPivot.add(neck);
  if (variant % 3 === 0) {
    // Combat helmet with rim + strap
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), gear);
    helm.position.y = 0.13;
    helm.scale.set(1, 0.92, 1.05);
    headPivot.add(helm);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.014, 6, 16), gear);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.135;
    headPivot.add(rim);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), gear);
    strap.position.set(0.115, 0.05, 0.02);
    headPivot.add(strap);
  } else if (variant % 3 === 1) {
    // Keffiyeh wrap + face scarf
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0xb9ac92, roughness: 1 });
    const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), wrapMat);
    wrap.position.y = 0.12;
    headPivot.add(wrap);
    const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.34), wrapMat);
    scarf.position.set(0, 0.1, 0.03);
    headPivot.add(scarf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.03), wrapMat);
    tail.position.set(0.05, -0.04, -0.13);
    tail.rotation.x = 0.25;
    headPivot.add(tail);
  } else {
    // Field cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.138, 0.08, 12), cloth);
    cap.position.y = 0.19;
    headPivot.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.1), cloth);
    brim.position.set(0, 0.16, 0.16);
    headPivot.add(brim);
  }

  // -- arms (posed holding rifle, thicker so they read from the front)
  const mkArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 0.48, 0.02);
    torsoPivot.add(shoulder);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 4, 8), cloth);
    upper.position.y = -0.14;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.19, 4, 8), cloth);
    fore.position.y = -0.13;
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    hand.position.y = -0.26;
    elbow.add(hand);
    return { shoulder, elbow };
  };
  const armR = mkArm(1);
  const armL = mkArm(-1);

  // -- legs
  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 1.0, 0);
    root.add(hip);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), pants);
    thigh.position.y = -0.2;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), pants);
    shin.position.y = -0.2;
    knee.add(shin);
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.09, 0.24, 1, 0.02), boot);
    foot.position.set(0, -0.42, 0.05);
    knee.add(foot);
    return { hip, knee };
  };
  const legR = mkLeg(1);
  const legL = mkLeg(-1);

  // -- rifle in aim pose (slightly oversized so it reads at distance)
  const rifle = buildEnemyRifle();
  rifle.scale.setScalar(1.18);
  rifle.position.set(0.09, 0.42, 0.34);
  rifle.rotation.y = -0.08;
  torsoPivot.add(rifle);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.52);
  rifle.add(muzzle);

  // Pose arms onto the rifle
  armR.shoulder.rotation.x = -1.05; armR.shoulder.rotation.z = -0.35;
  armR.elbow.rotation.x = -0.72;
  armL.shoulder.rotation.x = -1.25; armL.shoulder.rotation.z = 0.6;
  armL.elbow.rotation.x = -0.9;

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });

  return { root, torsoPivot, headPivot, armR, armL, legR, legL, rifle, muzzle };
}

/* --------------------------------- enemy ---------------------------------- */

const STATE = { ADVANCE: 0, COMBAT: 1, RELOCATE: 2, DEAD: 3 };

class Enemy {
  constructor(mgr, pos, variant) {
    this.mgr = mgr;
    this.model = buildSoldier(variant);
    this.root = this.model.root;
    this.root.position.copy(pos);
    const scale = 0.97 + rng() * 0.08;
    this.root.scale.setScalar(scale);
    mgr.scene.add(this.root);

    this.name = rng.pick(NAMES) + '-' + rng.int(10, 99);
    this.health = 100;
    this.alive = true;
    this.state = STATE.ADVANCE;
    this.pos = this.root.position;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.speed = 0;
    this.walkPhase = rng() * 10;
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.burstLeft = 0;
    this.shotT = 0;
    this.aimT = 1 + rng() * 1.5;
    this.duckT = 0;
    this.crouch = 0;      // 0 stand, 1 crouch
    this.crouchTarget = 0;
    this.flinchT = 0;
    this.deathT = 0;
    this.corpseVel = new THREE.Vector3();
    this.fallDir = new THREE.Vector3(1, 0, 0);
    this.relocateTarget = null;
    this.exposed = 1;
  }

  /* --------- damage --------- */
  damage(amount, point, dir, headshot) {
    if (!this.alive) return false;
    this.health -= amount;
    this.flinchT = 0.18;
    this.killCause = headshot ? 'HEADSHOT' : (this.mgr.playerWeaponLabel ? this.mgr.playerWeaponLabel() : 'M4A1');
    if (this.health <= 0) {
      this.die(dir, amount > 60);
      return true;
    }
    // Getting shot pulls them into combat
    if (this.state === STATE.ADVANCE && rng.chance(0.6)) this.enterCombat();
    return false;
  }

  die(dir, fling = false) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.deathT = 0;
    const d = dir ? dir.clone().setY(0).normalize() : new THREE.Vector3(rng.spread(1), 0, rng.spread(1)).normalize();
    this.fallDir = d;
    this.corpseVel.copy(d).multiplyScalar(fling ? 5.5 + rng() * 3 : 1.1);
    if (fling) this.corpseVel.y = 4.5 + rng() * 2.5;
    // Relax limbs randomly
    const M = this.model;
    M.armR.shoulder.rotation.set(-0.4 + rng.spread(0.5), 0, -0.5 + rng.spread(0.4));
    M.armL.shoulder.rotation.set(-0.3 + rng.spread(0.5), 0, 0.5 + rng.spread(0.4));
    M.armR.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.armL.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.legR.hip.rotation.x = rng.spread(0.5);
    M.legL.hip.rotation.x = rng.spread(0.5);
    M.legR.knee.rotation.x = rng() * 0.6;
    M.legL.knee.rotation.x = rng() * 0.6;
    // Drop rifle slightly
    M.rifle.rotation.z = rng.spread(0.8);
    this.mgr.onEnemyKilled(this);
  }

  enterCombat() {
    this.state = STATE.COMBAT;
    this.aimT = 0.35 + rng() * 0.7;
    this.burstLeft = 0;
    this.crouchTarget = rng.chance(0.5) ? 1 : 0;
  }

  /* --------- think --------- */
  update(dt, playerPos, t) {
    const M = this.model;
    if (this.state === STATE.DEAD) {
      this.deathT += dt;
      // Ballistic corpse
      if (this.deathT < 2.2) {
        this.corpseVel.y -= 14 * dt;
        this.pos.addScaledVector(this.corpseVel, dt);
        if (this.pos.y <= 0) { this.pos.y = 0; this.corpseVel.set(0, 0, 0); }
        // Fall rotation: pivot to lying
        const k = clamp(this.deathT / 0.5, 0, 1);
        const ease = 1 - (1 - k) * (1 - k);
        const axis = new THREE.Vector3(-this.fallDir.z, 0, this.fallDir.x);
        this.root.quaternion.setFromAxisAngle(axis, ease * Math.PI * 0.5 * 0.96);
        this.root.rotateY(this.yaw);
        this.root.position.y = Math.max(this.pos.y, 0) + ease * 0.12;
      }
      if (this.deathT > 22) {
        this.root.position.y -= dt * 0.25; // sink away
        if (this.deathT > 25) this.mgr.removeEnemy(this);
      }
      return;
    }

    const toPlayer = playerPos.clone().sub(this.pos);
    const distP = toPlayer.length();
    const dirP = toPlayer.clone().normalize();
    this.repathT -= dt;
    this.flinchT = Math.max(0, this.flinchT - dt);

    const eye = this.pos.clone().add(new THREE.Vector3(0, 1.55 - this.crouch * 0.5, 0));
    const playerEye = playerPos.clone().add(new THREE.Vector3(0, 1.5, 0));
    const hasLOS = this.mgr.colliders.hasLOS(eye, playerEye);

    switch (this.state) {
      case STATE.ADVANCE: {
        // Path toward a cover point near the player
        if (!this.path || this.repathT <= 0) {
          const cover = this.mgr.pickCover(this.pos, playerPos);
          const goal = cover ?? playerPos;
          this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, goal.x, goal.z) ?? [[goal.x, goal.z]];
          this.pathIdx = 0;
          this.repathT = 3 + rng() * 2;
        }
        this._followPath(dt, 4.4);
        if (hasLOS && distP < 34 && rng.chance(0.03)) this.enterCombat();
        if (this.path && this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 12 && hasLOS) this.enterCombat();
        break;
      }
      case STATE.COMBAT: {
        this.speed = damp(this.speed, 0, 8, dt);
        this.targetYaw = Math.atan2(dirP.x, dirP.z);
        // Peek / duck cycle when in cover
        this.duckT -= dt;
        if (this.duckT <= 0) {
          this.crouchTarget = this.crouchTarget > 0.5 ? 0 : (rng.chance(0.55) ? 1 : 0);
          this.duckT = 0.9 + rng() * 1.6;
        }
        const standing = this.crouch < 0.4;
        if (hasLOS && standing) {
          this.aimT -= dt;
          if (this.burstLeft > 0) {
            this.shotT -= dt;
            if (this.shotT <= 0) {
              this.shotT = 0.105 + rng() * 0.03;
              this.burstLeft--;
              this._fireAt(playerEye, distP);
            }
          } else if (this.aimT <= 0) {
            this.burstLeft = rng.int(3, 6);
            this.aimT = 0.7 + rng() * 1.3;
          }
        }
        // Occasionally relocate to better cover
        if (rng.chance(0.0025) || (!hasLOS && rng.chance(0.01))) {
          this.state = STATE.RELOCATE;
          const cover = this.mgr.pickCover(this.pos, playerPos, true);
          if (cover) {
            this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, cover.x, cover.z) ?? null;
            this.pathIdx = 0;
          }
          if (!this.path) this.state = STATE.COMBAT;
        }
        break;
      }
      case STATE.RELOCATE: {
        this.crouchTarget = 0;
        this._followPath(dt, 4.6);
        if (!this.path || this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 9 && hasLOS) this.enterCombat();
        break;
      }
    }

    // Separation from other enemies
    for (const other of this.mgr.enemies) {
      if (other === this || !other.alive) continue;
      const d = this.pos.distanceTo(other.pos);
      if (d < 1.2 && d > 1e-4) {
        const push = this.pos.clone().sub(other.pos).setY(0).normalize().multiplyScalar((1.2 - d) * 2 * dt);
        this.pos.add(push);
      }
    }

    // Capsule collision + yaw smoothing
    this.mgr.colliders.resolveCapsule(this.pos, 0.38, 1.7, this.vel);
    this.pos.y = Math.max(0, this.pos.y);
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 8);
    this.root.rotation.set(0, this.yaw, 0);

    // Crouch blend
    this.crouch = damp(this.crouch, this.crouchTarget, 6, dt);

    /* --------- animate --------- */
    const moving = this.speed > 0.4;
    this.walkPhase += dt * (5.2 + this.speed * 1.6);
    const swing = moving ? Math.sin(this.walkPhase) : 0;
    const swing2 = moving ? Math.sin(this.walkPhase + Math.PI) : 0;
    const amp = clamp(this.speed / 4.4, 0, 1) * 0.62;
    M.legR.hip.rotation.x = swing * amp + this.crouch * -0.7;
    M.legL.hip.rotation.x = swing2 * amp + this.crouch * -0.85;
    M.legR.knee.rotation.x = Math.max(0, -swing) * amp * 1.4 + this.crouch * 1.15;
    M.legL.knee.rotation.x = Math.max(0, -swing2) * amp * 1.4 + this.crouch * 1.3;
    this.root.position.y = this.pos.y - this.crouch * 0.42 + (moving ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * amp : 0);

    // Torso: aim pitch toward player + flinch + bob
    const pitchTo = clamp(Math.atan2(playerEye.y - eye.y, Math.max(1, distP)), -0.5, 0.4);
    M.torsoPivot.rotation.x = damp(M.torsoPivot.rotation.x, -pitchTo * 0.6 + (this.flinchT > 0 ? 0.22 : 0), 10, dt);
    M.torsoPivot.rotation.z = moving ? Math.sin(this.walkPhase) * 0.05 * amp : 0;
    M.torsoPivot.rotation.y = this.flinchT > 0 ? rng.spread(0.12) : 0;
    M.headPivot.rotation.x = -pitchTo * 0.4;
  }

  _followPath(dt, speed) {
    if (!this.path || this.pathIdx >= this.path.length) { this.speed = damp(this.speed, 0, 8, dt); return; }
    const [tx, tz] = this.path[this.pathIdx];
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) { this.pathIdx++; return; }
    this.speed = damp(this.speed, speed, 5, dt);
    this.targetYaw = Math.atan2(dx / d, dz / d);
    this.pos.x += (dx / d) * this.speed * dt;
    this.pos.z += (dz / d) * this.speed * dt;
  }

  _fireAt(playerEye, dist) {
    const M = this.model;
    this.lastShotTime = performance.now() * 0.001;
    const muzzlePos = new THREE.Vector3();
    M.muzzle.getWorldPosition(muzzlePos);
    // Aim error
    const err = 0.35 + dist * 0.028;
    const target = playerEye.clone().add(new THREE.Vector3(rng.spread(err), rng.spread(err * 0.7), rng.spread(err)));
    this.mgr.fx.muzzle(muzzlePos, target.clone().sub(muzzlePos).normalize());
    this.mgr.tracers.fire(muzzlePos, target, 300, 0xffb46a);
    this.mgr.audio.gunshot({ vol: 0.85, dist, caliber: 1.15 });
    // Chance to hit the player
    const movePenalty = this.mgr.getPlayerSpeed() * 0.10;
    const p = clamp(0.24 - dist * 0.004 - movePenalty, 0.05, 0.24);
    if (rng() < p) {
      this.mgr.onPlayerHit(rng.int(6, 13), this.pos);
    } else if (rng.chance(0.4)) {
      // near miss crack: impact somewhere behind player
      const missDir = target.clone().sub(muzzlePos).normalize();
      const hit = this.mgr.colliders.raycast(muzzlePos, missDir, 120);
      if (hit) {
        this.mgr.fx.impactWall(hit.point, hit.normal);
        this.mgr.decals.bulletHole(hit.point, hit.normal);
      }
    }
  }

  /** Ray-sphere hit test. Returns { t, point, headshot } or null. */
  raycast(origin, dir, maxDist) {
    if (!this.alive) return null;
    const spheres = [
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.58 - this.crouch * 0.45, 0)), r: 0.16, head: true },
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.15 - this.crouch * 0.35, 0)), r: 0.31, head: false },
      { c: this.pos.clone().add(new THREE.Vector3(0, 0.55 - this.crouch * 0.15, 0)), r: 0.3, head: false },
    ];
    let best = null;
    for (const s of spheres) {
      const oc = origin.clone().sub(s.c);
      const b = oc.dot(dir);
      const c = oc.lengthSq() - s.r * s.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t < 0.1 || t > maxDist) continue;
      if (!best || t < best.t) {
        best = { t, point: origin.clone().addScaledVector(dir, t), headshot: s.head };
      }
    }
    return best;
  }
}

/* -------------------------------- manager --------------------------------- */

export class EnemyManager {
  constructor({ scene, colliders, nav, fx, decals, tracers, audio, coverPoints, spawnPoints }) {
    this.scene = scene;
    this.colliders = colliders;
    this.nav = nav;
    this.fx = fx;
    this.decals = decals;
    this.tracers = tracers;
    this.audio = audio;
    this.coverPoints = coverPoints;
    this.spawnPoints = spawnPoints;
    this.enemies = [];
    this.wave = 0;
    this.pendingSpawns = 0;
    this.spawnT = 0;
    this.waveBreakT = 2.5;
    this.maxAlive = 6;
    this.onKill = null;        // (enemy, headshot?) => void
    this.onPlayerHit = null;   // set by game
    this.onWave = null;
    this.getPlayerSpeed = () => 0;
    this.playerPos = new THREE.Vector3();
    this.frozen = false;
  }

  get aliveCount() { return this.enemies.filter((e) => e.alive).length; }

  pickCover(fromPos, playerPos, exclude = false) {
    let best = null, bestScore = -Infinity;
    for (const c of this.coverPoints) {
      const dP = c.distanceTo(playerPos);
      if (dP < 7 || dP > 38) continue;
      const dMe = c.distanceTo(fromPos);
      if (exclude && dMe < 4) continue;
      let taken = false;
      for (const e of this.enemies) {
        if (e.alive && e.pos.distanceTo(c) < 2.2) { taken = true; break; }
      }
      if (taken) continue;
      const score = -dMe * 0.6 - Math.abs(dP - 17) + rng() * 4;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  startWave(n) {
    this.wave = n;
    this.pendingSpawns = Math.min(4 + n * 2, 14);
    this.spawnT = 1.2;
    if (this.onWave) this.onWave(n, this.pendingSpawns);
  }

  spawnOne(posOverride = null, variant = null) {
    const spawn = posOverride ?? this._pickSpawn();
    const e = new Enemy(this, spawn.clone(), variant ?? rng.int(0, 2));
    e.targetYaw = e.yaw = Math.atan2(this.playerPos.x - spawn.x, this.playerPos.z - spawn.z);
    this.enemies.push(e);
    return e;
  }

  _pickSpawn() {
    // Prefer spawns 25m+ from player and out of sight
    const candidates = [...this.spawnPoints].sort(() => rng() - 0.5);
    for (const s of candidates) {
      if (s.distanceTo(this.playerPos) > 24) return s;
    }
    return candidates[0];
  }

  onEnemyKilled(enemy) {
    if (this.onKill) this.onKill(enemy);
  }

  removeEnemy(enemy) {
    this.scene.remove(enemy.root);
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) this.enemies.splice(i, 1);
  }

  damageInRadius(pos, radius, maxDmg, fling = true, cause = 'FRAG') {
    let kills = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(pos);
      if (d < radius) {
        const dmg = maxDmg * (1 - (d / radius) * 0.7);
        const dir = e.pos.clone().sub(pos).normalize();
        const wasAlive = e.alive;
        e.health -= dmg;
        e.killCause = cause;
        if (e.health <= 0 && wasAlive) {
          e.die(dir, fling);
          kills++;
        } else {
          e.flinchT = 0.35;
        }
      }
    }
    return kills;
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of this.enemies) {
      const hit = e.raycast(origin, dir, maxDist);
      if (hit && (!best || hit.t < best.t)) {
        best = { ...hit, enemy: e };
      }
    }
    return best;
  }

  update(dt, playerPos, t) {
    this.playerPos.copy(playerPos);
    if (!this.frozen) {
      // Wave orchestration
      if (this.pendingSpawns > 0) {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.aliveCount < this.maxAlive) {
          this.spawnT = 0.7 + rng() * 0.9;
          this.pendingSpawns--;
          this.spawnOne();
        }
      } else if (this.aliveCount === 0 && this.wave > 0) {
        this.waveBreakT -= dt;
        if (this.waveBreakT <= 0) {
          this.waveBreakT = 6;
          this.startWave(this.wave + 1);
        }
      }
    }
    for (const e of this.enemies) e.update(dt, playerPos, t);
  }
}
