import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { CELLS } from '../fx/textures.js';
import { rand, groundHeight } from '../fx/util.js';
import { Jet, buildBombMesh } from './Jet.js';

const G = 9.81;
const SPEED = 140; // m/s
const ALTITUDE = 52; // m above the target ground
const DRAG = 0.45; // 1/s horizontal drag on the bombs (retarded fall → steep terminal dive, clears rooftops)
const SPAWN_DELAY = 0.8; // s after the call
const SPAWN_MARGIN = 45; // m before the first release point
const TRAIL_GAP = 55; // m jet B trails jet A
const LATERAL = 11; // m echelon offset
const BOMBS = 6;
const SPACING = 6.5; // m between impact points (≈32 m line)
const BLAST = { radius: 9, damage: 220 };

const _v = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Vector3();

/** Horizontal distance covered in `t` seconds from speed `v0` under exponential drag DRAG: v0/k · (1 − e^(−k t)). */
function horizontalReach(v0, t) {
  return (v0 / DRAG) * (1 - Math.exp(-DRAG * t));
}

/**
 * Precision air strike sequence: two jets sweep in along the strike direction, each dropping a stick of
 * three free-fall bombs timed to walk along a ~32 m line through the target. Impacts call
 * game.combat.explode (damage + 'explosion' → Effects) and emit 'killstreak:impact'.
 *
 *   t = 0        'killstreak:called'
 *   t ≈ 0.8 s    jets spawn ≈ 520 m out at 52 m → 'killstreak:jets' { position, direction }; `jets` array live
 *   t ≈ 1.1 s+   bombs release (inherit the jet's velocity; gravity + horizontal drag → steep terminal dive, ≈3.3 s fall)
 *                → 'killstreak:bomb' { position, duration, target }
 *   t ≈ 4.4 s    impacts: stick of 3 (≈0.1 s apart), 0.25 s beat, stick of 3 — jets roar over the target as they hit
 *   t ≈ 8 s      jets despawn far past the target; heavy dust hangs over the line for ~20 s
 */
export class AirStrike {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.jetPool = [new Jet(game), new Jet(game)];
    this.jets = []; // alive jets (position/velocity/direction) — read by the audio system for Doppler
    this.bombs = [];
    for (let i = 0; i < BOMBS; i++) {
      const mesh = buildBombMesh();
      mesh.visible = false;
      game.scene.add(mesh);
      game.render.setupObject(mesh);
      this.bombs.push({
        mesh, position: mesh.position, velocity: new THREE.Vector3(), prev: new THREE.Vector3(), target: new THREE.Vector3(),
        releaseAt: 0, jet: 0, pylon: 0, state: 'idle', // idle | racked | falling | done
      });
    }
    this.active = false;
    this.done = true;
    this.time = 0;
    this.target = new THREE.Vector3();
    this.dir = new THREE.Vector3(0, 0, -1);
    this.groundY = 0;
    this.spawned = false;
    this.impacts = 0;
    this.firstImpactTime = -1;
    this._trailAcc = [0, 0];
    this._worldFilter = groups(GROUP.ALL, GROUP.WORLD);
    this._impactAcc = 0;
  }

  /** Begin a strike on `target` (world, y ignored), jets flying along horizontal `direction`. */
  call(target, direction) {
    this.dir.set(direction.x, 0, direction.z);
    if (this.dir.lengthSq() < 1e-6) this.dir.set(0, 0, -1);
    this.dir.normalize();
    this.groundY = groundHeight(this.game, target.x, target.z, 0);
    this.target.set(target.x, this.groundY, target.z);
    this.time = 0;
    this.active = true;
    this.done = false;
    this.spawned = false;
    this.impacts = 0;
    this.firstImpactTime = -1;
    this._trailAcc[0] = this._trailAcc[1] = 0;

    const alt = this.groundY + ALTITUDE;
    const tf = Math.sqrt((2 * ALTITUDE) / G); // fall time from level release
    const reach = horizontalReach(SPEED, tf); // horizontal distance a bomb travels while falling
    // rack the bombs: jet A takes the even impact points, jet B the odd ones, in flight order
    for (let i = 0; i < BOMBS; i++) {
      const b = this.bombs[i];
      b.jet = i % 2;
      b.pylon = (i >> 1) % this.jetPool[0].pylons.length;
      b.target.copy(this.target).addScaledVector(this.dir, (i - (BOMBS - 1) / 2) * SPACING);
      b.target.y = groundHeight(this.game, b.target.x, b.target.z, this.groundY);
      b.state = 'racked';
      b.mesh.visible = false;
    }
    // spawn points: far enough back that the first release comes shortly after the jets appear
    const firstOffset = -((BOMBS - 1) / 2) * SPACING;
    const back = reach - firstOffset + SPAWN_MARGIN;
    this._spawnA = new THREE.Vector3().copy(this.target).addScaledVector(this.dir, -back);
    this._spawnA.y = alt;
    _v.set(-this.dir.z, 0, this.dir.x); // left
    this._spawnA.addScaledVector(_v, LATERAL * 0.5);
    this._spawnB = this._spawnA.clone().addScaledVector(this.dir, -TRAIL_GAP).addScaledVector(_v, -LATERAL);
    this._spawnB.y = alt + 4;
    // release times: the jet is `reach` metres short of the impact point, level, at ALTITUDE
    for (let i = 0; i < BOMBS; i++) {
      const b = this.bombs[i];
      const spawn = b.jet === 0 ? this._spawnA : this._spawnB;
      const along = (b.target.x - spawn.x) * this.dir.x + (b.target.z - spawn.z) * this.dir.z;
      const fall = Math.sqrt((2 * Math.max(5, alt + (b.jet === 1 ? 4 : 0) - b.target.y)) / G);
      b.releaseAt = SPAWN_DELAY + Math.max(0.05, (along - horizontalReach(SPEED, fall)) / SPEED);
    }
  }

  cancel() {
    for (const j of this.jetPool) j.despawn();
    for (const b of this.bombs) {
      b.state = 'idle';
      b.mesh.visible = false;
      if (b.mesh.parent !== this.game.scene) this.game.scene.attach(b.mesh);
    }
    this.jets.length = 0;
    this.active = false;
    this.done = true;
  }

  _spawnJets() {
    const [A, B] = this.jetPool;
    A.spawn(this._spawnA, this.dir, SPEED, 0.12);
    B.spawn(this._spawnB, this.dir, SPEED, -0.1);
    this.spawned = true;
    // hang the bombs on the pylons
    for (const b of this.bombs) {
      const jet = this.jetPool[b.jet];
      const anchor = jet.pylons[b.pylon];
      anchor.add(b.mesh);
      b.mesh.position.set(0, 0, 0);
      b.mesh.quaternion.identity();
      b.mesh.visible = true;
    }
    this.events.emit('killstreak:jets', { position: A.position.clone(), direction: this.dir.clone(), speed: SPEED, count: 2 });
  }

  _release(b) {
    const jet = this.jetPool[b.jet];
    this.game.scene.attach(b.mesh); // keep the world transform, leave the pylon
    b.state = 'falling';
    b.prev.copy(b.position);
    // level release; the horizontal speed is trimmed so the dragged fall lands exactly on its point
    const dy = Math.max(3, b.position.y - b.target.y);
    const tf = Math.sqrt((2 * dy) / G);
    const k = DRAG / (1 - Math.exp(-DRAG * tf)); // v0 = distance · k
    b.velocity.set((b.target.x - b.position.x) * k, 0, (b.target.z - b.position.z) * k);
    // sanity: never more than 15 % off the jet speed (release points are chosen so this is tiny)
    const sp = Math.hypot(b.velocity.x, b.velocity.z);
    const maxSp = SPEED * 1.15;
    if (sp > maxSp) b.velocity.multiplyScalar(maxSp / sp);
    b.velocity.y = jet.velocity.y;
    this.events.emit('killstreak:bomb', { position: b.position.clone(), duration: tf, target: b.target.clone() });
  }

  _impact(b, point) {
    b.state = 'done';
    b.mesh.visible = false;
    this.impacts++;
    if (this.firstImpactTime < 0) this.firstImpactTime = this.time;
    const position = point.clone();
    this.events.emit('killstreak:impact', { position, index: this.impacts - 1, total: BOMBS });
    this.game.combat.explode({ position, radius: BLAST.radius, damage: BLAST.damage, kind: 'bomb', source: 'player' });
    // heavy dust that hangs over the strike line long after the blast
    const ps = this.game.fx?.particles;
    if (ps) {
      const dens = this.game.fx.density ?? 1;
      const n = Math.round(5 * Math.max(0.5, dens));
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const r = rand(2, 7);
        ps.emit({
          x: point.x + Math.cos(a) * r, y: point.y + rand(1.5, 4), z: point.z + Math.sin(a) * r,
          vx: Math.cos(a) * rand(0.6, 1.4) + 0.4, vy: rand(0.25, 0.6), vz: Math.sin(a) * rand(0.6, 1.4),
          life: rand(12, 20), size0: rand(4, 6), size1: rand(12, 18), rot: rand(0, 6.28), rotVel: rand(-0.15, 0.15),
          r0: 0.5, g0: 0.45, b0: 0.38, r1: 0.42, g1: 0.4, b1: 0.37, alpha: rand(0.28, 0.42), fadeIn: 0.15, fadeOut: 0.5,
          atlas: CELLS.DUST, blend0: 1, lit0: 1, gravity: -0.02, drag: 0.35, turb: 0.4, sizeEase: 1.6, groundY: point.y, hover: 0.35,
        });
      }
    }
  }

  _contrails(dt) {
    const ps = this.game.fx?.particles;
    if (!ps) return;
    for (let j = 0; j < 2; j++) {
      const jet = this.jetPool[j];
      if (!jet.alive) continue;
      this._trailAcc[j] += SPEED * dt;
      const gap = 3;
      // sub-step along the path travelled this frame so the ribbon stays continuous at any frame rate
      while (this._trailAcc[j] >= gap) {
        this._trailAcc[j] -= gap;
        const back = this._trailAcc[j]; // metres behind the current position
        _v.set(-jet.direction.z, 0, jet.direction.x);
        for (let s = -1; s <= 1; s += 2) {
          // hot exhaust: merges into one thick grey ribbon behind the engines
          _p.copy(jet.position).addScaledVector(jet.direction, -8.5 - back).addScaledVector(_v, s * 0.6);
          _p.y -= 0.1;
          ps.emit({
            x: _p.x, y: _p.y, z: _p.z, vx: -jet.direction.x * 5 + rand(-0.6, 0.6), vy: rand(0.3, 1.0), vz: -jet.direction.z * 5 + rand(-0.6, 0.6),
            life: rand(2.6, 3.8), size0: 2.4, size1: rand(7, 9), rot: rand(0, 6.28), rotVel: rand(-0.5, 0.5),
            r0: 0.6, g0: 0.6, b0: 0.62, r1: 0.72, g1: 0.74, b1: 0.78, alpha: rand(0.16, 0.24), fadeIn: 0.04, fadeOut: 0.6,
            atlas: CELLS.SMOKE_A + (s > 0 ? 1 : 0), blend0: 1, lit0: 1, drag: 1.2, sizeEase: 1.8,
          });
          // wingtip vortex: thin bright white thread that dissipates fast
          _p.copy(jet.position).addScaledVector(jet.direction, -2.5 - back).addScaledVector(_v, s * 5.7);
          _p.y -= 0.15;
          ps.emit({
            x: _p.x, y: _p.y, z: _p.z, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), vz: rand(-0.2, 0.2),
            life: rand(0.7, 1.1), size0: 1.1, size1: 2.2, rot: rand(0, 6.28),
            r0: 0.95, g0: 0.96, b0: 1.0, alpha: 0.3, fadeIn: 0.02, fadeOut: 0.75, atlas: CELLS.DUST, blend0: 1, lit0: 1, sizeEase: 1.5,
          });
        }
      }
    }
  }

  update(dt) {
    if (!this.active) return;
    if (dt <= 0) return;
    this.time += dt;
    if (!this.spawned && this.time >= SPAWN_DELAY) this._spawnJets();

    // jets
    this.jets.length = 0;
    let anyJet = false;
    for (const jet of this.jetPool) {
      if (!jet.alive) continue;
      jet.update(dt);
      // despawn far past the target
      const past = (jet.position.x - this.target.x) * this.dir.x + (jet.position.z - this.target.z) * this.dir.z;
      if (past > 900) jet.despawn();
      else {
        this.jets.push(jet);
        anyJet = true;
      }
    }
    if (anyJet) this._contrails(dt);

    // bombs
    let pending = 0;
    for (const b of this.bombs) {
      if (b.state === 'racked') {
        pending++;
        if (this.spawned && this.time >= b.releaseAt) this._release(b);
        continue;
      }
      if (b.state !== 'falling') continue;
      pending++;
      b.prev.copy(b.position);
      b.velocity.y -= G * dt;
      const dk = Math.exp(-DRAG * dt);
      const s = (1 - dk) / DRAG; // exact horizontal step under exponential drag
      b.position.x += b.velocity.x * s;
      b.position.z += b.velocity.z * s;
      b.position.y += b.velocity.y * dt;
      b.velocity.x *= dk;
      b.velocity.z *= dk;
      // orient along the velocity
      _q.copy(b.position).add(b.velocity);
      b.mesh.lookAt(_q);
      // ground / building impact along the swept segment
      _v.copy(b.position).sub(b.prev);
      const dist = _v.length();
      if (dist > 1e-4) {
        _v.divideScalar(dist);
        const hit = this.game.physics?.raycast(b.prev, _v, dist + 0.3, { filter: this._worldFilter });
        if (hit) {
          this._impact(b, hit.point);
          continue;
        }
      }
      const gy = groundHeight(this.game, b.position.x, b.position.z, b.target.y);
      if (b.position.y <= gy + 0.05) {
        _p.set(b.position.x, gy, b.position.z);
        this._impact(b, _p);
      } else if (b.position.y < b.target.y - 40) {
        b.state = 'done';
        b.mesh.visible = false;
      }
    }

    if (pending === 0 && !anyJet) {
      this.active = false;
      this.done = true;
    } else if (pending === 0 && this.impacts >= 1 && this.time - this.firstImpactTime > 1.5) {
      // gameplay-wise the strike is over once the bombs are down; jets just fly off
      this.done = true;
    }
  }
}
