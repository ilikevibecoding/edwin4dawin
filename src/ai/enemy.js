// Hostile AI: perception (vision cone + hearing), patrol/guard routines,
// suspicion, investigation, combat with bursts/reloads/repositioning to
// cover, searching after losing the target, and stuck recovery.
import * as THREE from 'three';
import { bus } from '../core/events.js';

const ENEMY_WEAPONS = {
  vesper: { dmg: 8, burstMin: 3, burstMax: 6, rof: 9, range: 26, reload: 2.3, mag: 25, family: 'smg', pellets: 1 },
  bdr15: { dmg: 11, burstMin: 3, burstMax: 5, rof: 7.5, range: 34, reload: 2.6, mag: 30, family: 'rifle', pellets: 1 },
  havelock: { dmg: 7, burstMin: 1, burstMax: 1, rof: 1.05, range: 15, reload: 3.4, mag: 6, family: 'shotgun', pellets: 6 },
  meridian: { dmg: 38, burstMin: 1, burstMax: 1, rof: 0.5, range: 60, reload: 3.4, mag: 5, family: 'sniper', pellets: 1 },
};

const OUTFIT_HP = { merc: 100, scout: 85, heavy: 150 };
const OUTFIT_COLORS = { merc: 0x54493a, scout: 0x39434d, heavy: 0x33373c };

const WALK = 1.7, RUN = 3.6, TURN = 7.5;

let enemyCounter = 0;

export class Enemy {
  constructor(game, spec) {
    this.game = game;
    this.id = spec.id || 'enemy_' + (++enemyCounter);
    this.outfit = spec.outfit || 'merc';
    this.weaponId = spec.weapon || 'vesper';
    this.weapon = ENEMY_WEAPONS[this.weaponId];
    this.kind = spec.kind || 'patrol';
    this.route = spec.route || [];
    this.routeIdx = 0;
    const diff = game.difficulty;
    this.maxHealth = Math.round((OUTFIT_HP[this.outfit] || 100) * diff.enemyHp);
    this.health = this.maxHealth;
    this.alive = true;
    this.state = this.kind === 'patrol' ? 'patrol' : 'idle';
    this.pos = { ...spec.pos };
    this.yaw = spec.yaw ?? 0;
    this.sus = 0;
    this.susPos = null;
    this.lastSeen = null;
    this.lastSeenT = -999;
    this.visibleNow = false;
    this.aimDelay = 0;
    this.mag = this.weapon.mag;
    this.reloadT = 0;
    this.fireT = 0;
    this.burstLeft = 0;
    this.burstPause = 0;
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.waitT = 1 + game.rng.next() * 2;
    this.searchCount = 0;
    this.relocateT = 4 + game.rng.next() * 4;
    this.coverPos = null;
    this.flashT = 0;
    this.stuckT = 0;
    this.lastProgressPos = { ...this.pos };
    this.hpAtLastCover = this.health;
    this.crouched = false;
    this._buildVisual();
  }

  _buildVisual() {
    if (this.game.characters) {
      this.visual = this.game.characters.buildEnemy(this.outfit, this.weaponId, this.id);
    } else {
      const g = new THREE.Group();
      const color = OUTFIT_COLORS[this.outfit] || 0x554a3c;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.95, 4, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      body.position.y = 0.95;
      body.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc9a186, roughness: 0.8 }));
      head.position.y = 1.6;
      head.castShadow = true;
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.62), new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.55, metalness: 0.4 }));
      gun.position.set(0.16, 1.22, -0.3);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x8a2f28, roughness: 0.9 }));
      band.position.y = 1.32;
      g.add(body, head, gun, band);
      this.visual = { group: g, setMoving: () => {}, setCrouch: () => {}, setAim: () => {}, die: null, update: () => {} };
    }
    this.group = this.visual.group;
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.name = this.id;
  }

  eyePos() { return { x: this.pos.x, y: this.pos.y + (this.crouched ? 1.1 : 1.58), z: this.pos.z }; }
  muzzlePos() {
    const f = this.forward();
    return { x: this.pos.x + f.x * 0.42, y: this.pos.y + (this.crouched ? 1.0 : 1.32), z: this.pos.z + f.z * 0.42 };
  }
  forward() { return { x: -Math.sin(this.yaw), y: 0, z: -Math.cos(this.yaw) }; }

  hitTest(origin, dir, maxDist) {
    // head first
    const head = { x: this.pos.x, y: this.pos.y + 1.52, z: this.pos.z };
    const hs = raySphere(origin, dir, head, 0.17, maxDist);
    if (hs != null) return { dist: hs, part: 'head' };
    const body = rayCapsuleApprox(origin, dir, this.pos, this.alive ? 1.68 : 0.5, 0.34, maxDist);
    if (body != null) return { dist: body, part: 'body' };
    return null;
  }

  takeDamage(amount, info = {}) {
    if (!this.alive) return;
    const mult = info.part === 'head' ? 3.2 : 1;
    const dmg = Math.round(amount * mult);
    this.health -= dmg;
    bus.emit('enemy-damaged', { id: this.id, amount: dmg, part: info.part, pos: { ...this.pos }, remaining: this.health });
    if (info.point) this.game.fx?.bloodPuff(info.point, info.dir || { x: 0, y: 0, z: 1 });
    if (this.health <= 0) {
      this._die(info);
      return;
    }
    // getting shot instantly reveals the shooter's rough position
    this.sus = 1;
    const p = this.game.player;
    this.lastSeen = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    this.lastSeenT = this.game.loop.simTime;
    if (this.state !== 'combat') this._enterCombat(true);
    this.game.ai.broadcastAlert(this.pos, this, 16);
  }

  _die(info) {
    this.alive = false;
    this.state = 'dead';
    this.health = 0;
    this.deathT = 0;
    this.deathDir = info.dir ? Math.atan2(info.dir.x, info.dir.z) : this.yaw;
    bus.emit('enemy-died', { id: this.id, pos: { ...this.pos }, by: info.weapon });
    if (this.visual.die) this.visual.die();
    this.game.spawnPickup?.('ammo', { x: this.pos.x, y: this.pos.y, z: this.pos.z }, { weapon: this.weaponId });
  }

  // ------------------------------------------------------------- perception
  _perceive(dt) {
    const diff = this.game.difficulty;
    const player = this.game.player;
    if (!player.alive) { this.visibleNow = false; return; }
    const eye = this.eyePos();
    const pp = { x: player.pos.x, y: player.pos.y + (player.crouched ? 0.8 : 1.3), z: player.pos.z };
    const dx = pp.x - eye.x, dy = pp.y - eye.y, dz = pp.z - eye.z;
    const dist = Math.hypot(dx, dy, dz);
    let sees = false;
    const range = diff.visionRange * (this.flashT > 0 ? 0.15 : 1);
    if (dist < range) {
      // vision cone (~110 deg), wide peripheral awareness at close range
      const f = this.forward();
      const dot = (dx * f.x + dz * f.z) / Math.max(0.01, Math.hypot(dx, dz));
      if (dist < 2.4 || dot > 0.42 || (dist < 4 && dot > -0.35)) {
        sees = this.game.ai.hasLineOfSight(eye, pp);
      }
    }
    this.visibleNow = sees;
    if (sees) {
      const moveFactor = Math.hypot(player.vel.x, player.vel.z) > 3 ? 1.5 : 1;
      const crouchFactor = player.crouched ? 0.55 : 1;
      const distFactor = Math.max(0.25, 1 - dist / range);
      const rate = diff.susRate * moveFactor * crouchFactor * (0.4 + distFactor * 1.6);
      this.sus = Math.min(1, this.sus + rate * dt * (this.state === 'combat' || this.sus >= 1 ? 4 : 1));
      this.susPos = { ...player.pos };
      if (this.sus >= 1) {
        this.lastSeen = { x: player.pos.x, y: player.pos.y, z: player.pos.z };
        this.lastSeenT = this.game.loop.simTime;
        if (this.state !== 'combat') this._enterCombat(false);
      }
    } else {
      this.sus = Math.max(this.state === 'combat' ? 0.6 : 0, this.sus - dt * 0.12);
    }
  }

  hearNoise(pos, loudness, urgent = false) {
    if (!this.alive || this.state === 'combat') return;
    const d = Math.hypot(pos.x - this.pos.x, (pos.y ?? this.pos.y) - this.pos.y, pos.z - this.pos.z);
    if (d > loudness) return;
    const clarity = 1 - d / loudness;
    if (urgent) {
      // gunfire/glass/explosions: heard at all => investigate the source
      this.sus = 1;
      this.susPos = { ...pos };
      const now = this.game.loop.simTime;
      if (this.state !== 'investigate' || now - (this._lastUrgentT || -99) > 1.5) {
        this._lastUrgentT = now;
        this.state = 'investigate';
        this.searchCount = 0;
        this._pathTo(pos, clarity > 0.3);
        bus.emit('enemy-alerted', { id: this.id, pos: { ...this.pos }, kind: 'noise' });
      }
      return;
    }
    this.sus = Math.min(1, this.sus + 0.3 + clarity * 0.5);
    this.susPos = { ...pos };
    if (this.sus >= 1 && this.state !== 'investigate') {
      this.state = 'investigate';
      this.searchCount = 0;
      this._pathTo(pos, false);
      bus.emit('enemy-alerted', { id: this.id, pos: { ...this.pos }, kind: 'noise' });
    } else if (this.sus > 0.45 && (this.state === 'patrol' || this.state === 'idle' || this.state === 'pause')) {
      this.state = 'suspicious';
      this.waitT = 2.2;
    }
  }

  onFlash(intensity) {
    this.flashT = Math.max(this.flashT, 1.5 + intensity * 3);
  }

  _enterCombat(instant) {
    this.state = 'combat';
    this.aimDelay = instant ? 0.1 : this.game.difficulty.reaction;
    this.burstLeft = 0;
    this.burstPause = 0.1;
    this.path = null;
    bus.emit('enemy-alerted', { id: this.id, pos: { ...this.pos }, kind: 'contact' });
    this.game.ai.broadcastAlert(this.pos, this, 18);
  }

  alertTo(pos) {
    if (!this.alive || this.state === 'combat' || this.state === 'dead') return;
    this.sus = 1;
    this.susPos = { ...pos };
    this.state = 'investigate';
    this.searchCount = 0;
    this._pathTo(pos, true);
  }

  // ------------------------------------------------------------- movement
  _pathTo(target, run = false) {
    const path = this.game.ai.nav.findPath(this.pos, target);
    this.path = path;
    this.pathIdx = 0;
    this.running = run;
    this.repathT = 1.2;
    return !!path;
  }

  _moveAlong(dt) {
    if (!this.path || this.pathIdx >= this.path.length) return 'done';
    const speed = this.running ? RUN : WALK;
    const wp = this.path[this.pathIdx];
    const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.28) {
      this.pathIdx++;
      if (this.pathIdx >= this.path.length) return 'done';
      return 'moving';
    }
    const targetYaw = Math.atan2(-dx, -dz);
    this.yaw = turnToward(this.yaw, targetYaw, TURN * dt);
    const step = Math.min(d, speed * dt);
    // door handling: open doors we're about to cross
    const doors = this.game.world.nearbyDoors(this.pos, 1.6);
    for (const door of doors) {
      if (door.isClosed && !door.locked && !door.moving) door.toggle(this.pos);
    }
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    // vertical follow (stairs)
    this.pos.y += (wp.y - this.pos.y) * Math.min(1, dt * 10);
    return 'moving';
  }

  _checkStuck(dt, moving) {
    if (!moving) { this.stuckT = 0; return; }
    const d = Math.hypot(this.pos.x - this.lastProgressPos.x, this.pos.z - this.lastProgressPos.z);
    if (d > 0.25) {
      this.lastProgressPos = { ...this.pos };
      this.stuckT = 0;
    } else {
      this.stuckT += dt;
      if (this.stuckT > 1.6) {
        // repath first
        if (this.path && this.pathIdx < this.path.length) {
          const dest = this.path[this.path.length - 1];
          this._pathTo(dest, this.running);
        }
        this.stuckT = -1.2;
      }
      if (this.stuckT > 3.5) {
        // navigation recovery: snap to nearest walkable cell
        const c = this.game.ai.nav.cellNear(this.pos.x, this.pos.z, this.pos.y);
        if (c) { this.pos.x = c.x; this.pos.z = c.z; this.pos.y = c.y; }
        this.path = null;
        this.stuckT = 0;
      }
    }
  }

  // ------------------------------------------------------------- combat
  _updateCombat(dt) {
    const player = this.game.player;
    const diff = this.game.difficulty;
    if (!player.alive) { this.state = this.kind === 'patrol' ? 'patrol' : 'idle'; return; }
    const eye = this.eyePos();
    const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

    if (this.visibleNow) {
      this.lastSeen = { ...player.pos };
      this.lastSeenT = this.game.loop.simTime;
    } else if (this.game.loop.simTime - this.lastSeenT > 5.5) {
      this.state = 'search';
      this.searchCount = 0;
      if (this.lastSeen) this._pathTo(this.lastSeen, true);
      return;
    }

    // face the threat
    const aimAt = this.visibleNow ? player.pos : this.lastSeen || player.pos;
    const targetYaw = Math.atan2(-(aimAt.x - this.pos.x), -(aimAt.z - this.pos.z));
    this.yaw = turnToward(this.yaw, targetYaw, TURN * 1.4 * dt);

    // flash blindness suppresses firing and movement
    if (this.flashT > 0) return;

    // reload
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.mag = this.weapon.mag;
      return;
    }
    if (this.mag <= 0) {
      this.reloadT = this.weapon.reload;
      return;
    }

    // relocation to cover
    this.relocateT -= dt;
    const hurtBadly = this.hpAtLastCover - this.health > 35;
    if (this.coverPos) {
      const status = this._moveAlong(dt);
      this._checkStuck(dt, status === 'moving');
      if (status === 'done' || !this.path) {
        this.coverPos = null;
        this.crouched = dist > 7 && this.game.rng.chance(0.5);
        this.relocateT = 4 + this.game.rng.next() * 4;
        this.hpAtLastCover = this.health;
      }
      if (dist > 3.5) return; // don't shoot while running unless point blank
    } else if ((this.relocateT <= 0 || hurtBadly) && this.game.rng.chance(0.7)) {
      const cover = this._findCover();
      if (cover) {
        this.coverPos = cover;
        this._pathTo(cover, true);
        this.crouched = false;
      }
      this.relocateT = 4 + this.game.rng.next() * 4;
      this.hpAtLastCover = this.health;
    }

    if (!this.visibleNow) return;

    // aim delay on first contact
    if (this.aimDelay > 0) { this.aimDelay -= dt; return; }
    if (dist > this.weapon.range * 1.35) return;

    // burst fire
    this.fireT -= dt;
    if (this.burstLeft <= 0) {
      this.burstPause -= dt;
      if (this.burstPause <= 0) {
        this.burstLeft = this.game.rng.int(this.weapon.burstMin, this.weapon.burstMax);
        this.burstPause = 0.55 + this.game.rng.next() * 0.8;
      }
      return;
    }
    if (this.fireT <= 0) {
      this._fireShot(dist);
      this.fireT = 1 / this.weapon.rof;
      this.burstLeft--;
      this.mag--;
    }
  }

  _fireShot(dist) {
    const game = this.game;
    const diff = game.difficulty;
    const player = game.player;
    const muzzle = this.muzzlePos();
    bus.emit('enemy-fired', { id: this.id, pos: { ...muzzle }, family: this.weapon.family });
    game.audio?.play('shot_enemy', { pos: muzzle, vol: 0.85 });
    game.fx?.muzzleFlash(muzzle, this.forward());

    for (let p = 0; p < this.weapon.pellets; p++) {
      // hit model: probability by difficulty, range, movement, stance
      let acc = diff.accuracy;
      acc *= Math.max(0.25, 1 - dist / (this.weapon.range * 1.6));
      if (player.crouched) acc *= 0.82;
      const pSpeed = Math.hypot(player.vel.x, player.vel.z);
      if (pSpeed > 3.2) acc *= 0.62;
      else if (pSpeed > 1.2) acc *= 0.85;
      if (this.coverPos) acc *= 0.55;
      if (this.weapon.family === 'shotgun') acc *= dist < 7 ? 1.25 : 0.6;

      const rng = game.rng;
      const hit = rng.chance(Math.min(0.92, acc));
      const targetY = player.pos.y + (player.crouched ? 0.75 : 1.15);
      let target;
      if (hit) {
        target = { x: player.pos.x + rng.gauss() * 0.12, y: targetY + rng.gauss() * 0.2, z: player.pos.z + rng.gauss() * 0.12 };
      } else {
        target = {
          x: player.pos.x + rng.gauss() * 1.4,
          y: targetY + rng.gauss() * 0.9,
          z: player.pos.z + rng.gauss() * 1.4,
        };
      }
      const dir = normv({ x: target.x - muzzle.x, y: target.y - muzzle.y, z: target.z - muzzle.z });
      // trace: does the shot actually reach the player?
      const wall = game.world.collision.raycast(muzzle, dir, dist + 4, { mode: 'bullet' });
      const playerDist = Math.hypot(player.pos.x - muzzle.x, targetY - muzzle.y, player.pos.z - muzzle.z);
      if (game.fx && (this.weapon.family !== 'shotgun' || p === 0)) {
        const end = wall ? wall.point : { x: muzzle.x + dir.x * 40, y: muzzle.y + dir.y * 40, z: muzzle.z + dir.z * 40 };
        game.fx.tracer(muzzle, end);
      }
      if (hit && (!wall || wall.dist > playerDist - 0.35)) {
        player.damage(this.weapon.dmg * diff.enemyDamage, dirFrom(player.pos, this.pos), 'bullet');
      } else if (wall) {
        if (wall.box.tag === 'glass' && wall.box.ref) wall.box.ref.onShot(wall.point);
        else game.fx?.impact(wall.point, wall.normal, wall.box.material);
      }
    }
  }

  _findCover() {
    const game = this.game;
    const player = game.player;
    const nav = game.ai.nav;
    const rng = game.rng;
    let best = null, bestScore = -1;
    for (let i = 0; i < 10; i++) {
      const c = nav.randomNearby(this.pos, 3 + rng.next() * 6, rng);
      if (!c) continue;
      const eyeAt = { x: c.x, y: c.y + 1.45, z: c.z };
      const pp = { x: player.pos.x, y: player.pos.y + 1.2, z: player.pos.z };
      const hidden = !game.ai.hasLineOfSight(eyeAt, pp);
      const dPlayer = Math.hypot(c.x - player.pos.x, c.z - player.pos.z);
      if (dPlayer < 2.5) continue;
      const score = (hidden ? 2 : 0) + Math.min(1, dPlayer / 14) + rng.next() * 0.4;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  // ------------------------------------------------------------- main tick
  update(dt) {
    if (!this.alive) {
      this._updateDeath(dt);
      return;
    }
    if (this.game.ai.frozen) { this._syncVisual(dt, false); return; }
    this.flashT = Math.max(0, this.flashT - dt);
    this._perceive(dt);

    let moving = false;
    switch (this.state) {
      case 'patrol': {
        if (!this.path) {
          const wp = this.route[this.routeIdx % this.route.length];
          if (wp) this._pathTo(wp, false);
          else this.state = 'idle';
        }
        const st = this._moveAlong(dt);
        moving = st === 'moving';
        if (st === 'done') {
          this.routeIdx++;
          this.path = null;
          this.waitT = 1.2 + this.game.rng.next() * 2.4;
          this.state = 'pause';
        }
        break;
      }
      case 'pause':
      case 'idle': {
        this.waitT -= dt;
        // guards scan around
        if (this.waitT < 0) {
          if (this.kind === 'patrol' || this.route.length > 1) { this.state = 'patrol'; }
          else {
            this.yaw += (this.game.rng.next() - 0.5) * 1.6;
            this.waitT = 2 + this.game.rng.next() * 3;
          }
        }
        break;
      }
      case 'suspicious': {
        if (this.susPos) {
          const ty = Math.atan2(-(this.susPos.x - this.pos.x), -(this.susPos.z - this.pos.z));
          this.yaw = turnToward(this.yaw, ty, TURN * dt);
        }
        this.waitT -= dt;
        if (this.sus >= 1) {
          this.state = 'investigate';
          this.searchCount = 0;
          if (this.susPos) this._pathTo(this.susPos, false);
        } else if (this.waitT <= 0 || this.sus <= 0.05) {
          this.state = this.kind === 'patrol' ? 'patrol' : 'idle';
          this.path = null;
        }
        break;
      }
      case 'investigate':
      case 'search': {
        if (!this.path) {
          const target = this.state === 'investigate' ? this.susPos : this.lastSeen;
          if (!target || !this._pathTo(target, this.state === 'search')) {
            this.state = this.kind === 'patrol' ? 'patrol' : 'idle';
            break;
          }
        }
        const st = this._moveAlong(dt);
        moving = st === 'moving';
        if (st === 'done') {
          this.path = null;
          this.searchCount++;
          if (this.searchCount > (this.state === 'search' ? 3 : 2)) {
            this.sus = 0.4;
            this.state = this.kind === 'patrol' ? 'patrol' : 'idle';
            this.waitT = 1;
          } else {
            const next = this.game.ai.nav.randomNearby(this.pos, 4.5, this.game.rng);
            if (next) {
              if (this.state === 'investigate') this.susPos = next;
              else this.lastSeen = next;
              this._pathTo(next, false);
              this.waitT = 1.4;
            }
          }
        }
        break;
      }
      case 'combat': {
        this._updateCombat(dt);
        moving = !!this.coverPos;
        break;
      }
    }
    this._checkStuck(dt, moving);
    this._syncVisual(dt, moving);
  }

  _updateDeath(dt) {
    if (this.deathT >= 1) return;
    this.deathT = Math.min(1, this.deathT + dt * 2.4);
    const t = this.deathT;
    const e = 1 - Math.pow(1 - t, 2);
    if (!this.visual.die) {
      this.group.rotation.x = -e * Math.PI / 2 * 0.94;
      this.group.position.y = this.pos.y + 0.12 * e;
    } else {
      this.visual.update?.(dt);
    }
  }

  _separate(dt) {
    // soft-collision: keep enemies out of the player and each other
    const p = this.game.player;
    const push = (ox, oz, minD) => {
      let dx = this.pos.x - ox, dz = this.pos.z - oz;
      let d = Math.hypot(dx, dz);
      if (d > minD) return;
      if (d < 1e-4) {
        // exactly coincident: pick a stable direction so we still separate
        const a = (this.id.charCodeAt(this.id.length - 1) % 8) * (Math.PI / 4);
        dx = Math.cos(a); dz = Math.sin(a); d = 1;
      }
      const f = (minD - d) * Math.min(1, dt * 10);
      this.pos.x += (dx / d) * f;
      this.pos.z += (dz / d) * f;
    };
    if (p.alive && Math.abs(p.pos.y - this.pos.y) < 1.6) push(p.pos.x, p.pos.z, 0.62);
    for (const e of this.game.ai.enemies) {
      if (e === this || !e.alive) continue;
      if (Math.abs(e.pos.y - this.pos.y) < 1.6) push(e.pos.x, e.pos.z, 0.6);
    }
  }

  _syncVisual(dt, moving) {
    if (this.alive) this._separate(dt);
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.y = this.yaw;
    this.visual.setMoving?.(moving, this.running);
    this.visual.setCrouch?.(this.crouched);
    this.visual.setAim?.(this.state === 'combat');
    this.visual.update?.(dt);
  }

  stateInfo() {
    return {
      id: this.id, outfit: this.outfit, weapon: this.weaponId,
      state: this.state, hp: Math.max(0, this.health),
      pos: [r2(this.pos.x), r2(this.pos.y), r2(this.pos.z)],
      alert: r2(this.sus),
    };
  }
}

function turnToward(cur, target, maxStep) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + Math.max(-maxStep, Math.min(maxStep, d));
}

function normv(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }
function dirFrom(to, from) { return normv({ x: from.x - to.x, y: 0, z: from.z - to.z }); }
function r2(v) { return Math.round(v * 100) / 100; }

function raySphere(o, d, c, r, maxDist) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0 || t > maxDist) return null;
  return t;
}

function rayCapsuleApprox(o, d, base, h, r, maxDist) {
  // three stacked spheres approximation
  let best = null;
  for (const yOff of [0.35, 0.85, 1.35]) {
    if (yOff > h) continue;
    const t = raySphere(o, d, { x: base.x, y: base.y + yOff, z: base.z }, r, maxDist);
    if (t != null && (best == null || t < best)) best = t;
  }
  return best;
}
