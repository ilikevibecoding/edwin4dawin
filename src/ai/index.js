import * as THREE from 'three';
import { rand, randRange, randPick, randSpread } from '../core/rand.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _ray = new THREE.Raycaster();

let ENEMY_ID = 1;

class Enemy {
  constructor(sys, pos) {
    this.sys = sys;
    this.game = sys.game;
    this.id = ENEMY_ID++;
    this.position = pos.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = rand() * Math.PI * 2;
    this.health = 100;
    this.alive = true;
    this.state = 'patrol';
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.fireT = randRange(0.4, 1.4);
    this.burstLeft = 0;
    this.deathT = 0;
    this.speed = randRange(3.0, 4.2);
    this.accuracy = randRange(0.045, 0.09);

    // baseline visuals (upgraded by AI module later): capsule + head
    const mat = new THREE.MeshStandardMaterial({ color: 0x4c4a41, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x8a7862, roughness: 0.85 });
    this.group = new THREE.Group();
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 10), mat);
    this.body.position.y = 0.85;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), headMat);
    this.head.position.y = 1.62;
    this.gun = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.6), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.5, metalness: 0.7 }));
    this.gun.position.set(0.22, 1.3, -0.3);
    this.group.add(this.body, this.head, this.gun);
    this.group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.group.position.copy(pos);
    this.game.scene.add(this.group);

    // hit proxies
    this.body.userData.enemy = this;
    this.body.userData.part = 'body';
    this.head.userData.enemy = this;
    this.head.userData.part = 'head';
  }

  damage(amount, headshot, point, dir) {
    if (!this.alive) return;
    this.health -= amount;
    this.game.events.emit('enemy:damage', { enemy: this, amount, headshot });
    if (this.state === 'patrol') this.state = 'engage';
    if (this.health <= 0) this.die(headshot, 'gun');
  }

  die(headshot, cause) {
    if (!this.alive) return;
    this.alive = false;
    this.deathT = 6;
    this.game.events.emit('enemy:death', { enemy: this, position: this.position.clone(), headshot, cause });
  }

  eyePos(out = new THREE.Vector3()) {
    return out.set(this.position.x, this.position.y + 1.58, this.position.z);
  }

  update(dt) {
    const { player, world, vfx, events } = this.game;
    if (!this.alive) {
      this.deathT -= dt;
      // fall over
      this.group.rotation.x = THREE.MathUtils.damp(this.group.rotation.x, -Math.PI / 2 * 0.94, 6, dt);
      this.group.position.y = THREE.MathUtils.damp(this.group.position.y, 0.12, 6, dt);
      if (this.deathT < 1.5) this.group.traverse((m) => { if (m.material) { m.material.transparent = true; m.material.opacity = Math.max(0, this.deathT / 1.5); } });
      return this.deathT <= 0 ? 'remove' : null;
    }

    const toPlayer = _v.copy(player.position).sub(this.position);
    const dist = toPlayer.length();
    const canSee = player.alive && dist < 65 &&
      world.colliders.clearLine(this.eyePos(_v2), player.eyePos());

    if (canSee && dist < 55) this.state = 'engage';
    else if (this.state === 'engage' && (!canSee || !player.alive)) {
      if (rand() < dt * 0.3) this.state = 'patrol';
    }

    let moveTarget = null;
    if (this.state === 'patrol') {
      this.repathT -= dt;
      if (!this.path || this.pathIdx >= this.path.length || this.repathT <= 0) {
        const goal = world.navgrid.randomPoint(this.position.x, this.position.z, 40);
        this.path = world.navgrid.findPath(this.position, goal);
        this.pathIdx = 0;
        this.repathT = randRange(6, 12);
      }
    } else if (this.state === 'engage') {
      // keep 10-28m distance; strafe occasionally
      this.repathT -= dt;
      if ((!this.path || this.pathIdx >= this.path.length) && this.repathT <= 0) {
        const desired = dist > 30 ? 16 : dist < 9 ? 22 : 0;
        if (desired) {
          const dir = toPlayer.clone().normalize().multiplyScalar(dist > 30 ? 1 : -1);
          const goal = world.navgrid.nearestWalkable(
            this.position.x + dir.x * 10 + randSpread(6),
            this.position.z + dir.z * 10 + randSpread(6)
          );
          this.path = world.navgrid.findPath(this.position, goal);
          this.pathIdx = 0;
        }
        this.repathT = randRange(1.5, 3.5);
      }
      // face player
      this.yaw = Math.atan2(-toPlayer.x, -toPlayer.z) + Math.PI;

      // fire bursts
      if (canSee && player.alive) {
        this.fireT -= dt;
        if (this.burstLeft > 0) {
          this.fireT -= dt; // fire faster inside burst
          if (this.fireT <= 0) {
            this.burstLeft--;
            this.fireT = 0.09;
            this.fireAt(player);
          }
        } else if (this.fireT <= 0) {
          this.burstLeft = Math.round(randRange(3, 6));
          this.fireT = 0.05;
        }
        if (this.burstLeft === 0 && this.fireT <= 0) this.fireT = randRange(0.7, 1.6);
      }
    }

    // follow path
    if (this.path && this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const d = _v2.set(wp.x - this.position.x, 0, wp.z - this.position.z);
      const dl = d.length();
      if (dl < 0.5) this.pathIdx++;
      else {
        d.multiplyScalar(1 / dl);
        this.position.addScaledVector(d, this.speed * dt);
        if (this.state !== 'engage') this.yaw = Math.atan2(-d.x, -d.z) + Math.PI;
      }
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    return null;
  }

  fireAt(player) {
    const { vfx, world, events } = this.game;
    const from = this.eyePos(new THREE.Vector3()).addScaledVector(_v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.0);
    const target = player.eyePos();
    target.x += randSpread(this.accuracy * 30);
    target.y += randSpread(this.accuracy * 20);
    target.z += randSpread(this.accuracy * 30);
    const dir = target.sub(from).normalize();

    const gunPos = new THREE.Vector3(0.22, 1.35, -0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).add(this.position);
    vfx.muzzleFlash(gunPos, dir, { scale: 0.8 });
    events.emit('enemy:fire', { position: gunPos.clone() });

    // does it hit player? compare vs world occlusion
    const worldHit = world.colliders.raycast(from, dir, 120);
    const toPlayerDist = from.distanceTo(player.eyePos());
    const playerHit = this._rayHitsPlayer(from, dir, player);
    if (playerHit && (!worldHit || toPlayerDist < worldHit.distance)) {
      player.damage(randRange(6, 13), this.position);
      vfx.tracer(gunPos, player.eyePos().add(new THREE.Vector3(randSpread(0.2), randSpread(0.2), randSpread(0.2))), { speed: 260 });
    } else {
      const end = worldHit ? worldHit.point : from.clone().addScaledVector(dir, 120);
      vfx.tracer(gunPos, end, { speed: 260 });
      if (worldHit) vfx.impact(worldHit.point, worldHit.normal, worldHit.surface);
    }
  }

  _rayHitsPlayer(from, dir, player) {
    // cheap capsule test: closest distance from ray to player's vertical segment
    const p0 = player.position.clone(); p0.y += 0.3;
    const p1 = player.position.clone(); p1.y += player.height - 0.15;
    const seg = p1.clone().sub(p0);
    const t = THREE.MathUtils.clamp(_v.copy(player.position).addScaledVector(seg, 0.5).sub(from).dot(dir), 0, 200);
    const closest = from.clone().addScaledVector(dir, t);
    const segT = THREE.MathUtils.clamp(closest.clone().sub(p0).dot(seg) / seg.lengthSq(), 0, 1);
    const onSeg = p0.clone().addScaledVector(seg, segT);
    return closest.distanceTo(onSeg) < 0.42;
  }

  dispose() {
    this.game.scene.remove(this.group);
  }
}

/**
 * AI system. Contract:
 *   ai.raycast(origin, dir, far) -> { enemy, point, distance, headshot } | null
 *   ai.enemies — live enemies
 *   ai.enabled — harness can disable
 */
export class AISystem {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.enabled = true;
    this.maxAlive = 7;
    this.spawnT = 2;

    game.events.on('explosion', ({ position, radius, damage }) => {
      if (!damage) return;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.position.distanceTo(position);
        if (d < radius) {
          const falloff = 1 - d / radius;
          e.damage(damage * falloff * (0.5 + falloff * 0.5), false, null, null);
          if (!e.alive) {
            // let gamestate know the cause for airstrike kills
          }
        }
      }
    });
  }

  async load() {}

  raycast(origin, dir, far = 300) {
    _ray.set(origin, dir);
    _ray.far = far;
    const meshes = [];
    for (const e of this.enemies) if (e.alive) meshes.push(e.body, e.head);
    if (!meshes.length) return null;
    const hits = _ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const h = hits[0];
    return {
      enemy: h.object.userData.enemy,
      point: h.point,
      distance: h.distance,
      headshot: h.object.userData.part === 'head',
      normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null,
    };
  }

  update(dt) {
    if (!this.enabled || dt === 0) return;
    const aliveCount = this.enemies.filter((e) => e.alive).length;
    this.spawnT -= dt;
    if (aliveCount < this.maxAlive && this.spawnT <= 0 && this.game.player.alive) {
      this.spawnT = randRange(1.5, 3.5);
      const spawns = this.game.world.enemySpawns;
      if (spawns.length) {
        // spawn out of player sight if possible
        let pos = randPick(spawns);
        for (let i = 0; i < 6; i++) {
          const cand = randPick(spawns);
          if (cand.distanceTo(this.game.player.position) > 25) { pos = cand; break; }
        }
        this.enemies.push(new Enemy(this, pos));
      }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const res = this.enemies[i].update(dt);
      if (res === 'remove') {
        this.enemies[i].dispose();
        this.enemies.splice(i, 1);
      }
    }
  }
}
