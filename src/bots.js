import * as THREE from 'three';
import { WEAPONS, RARITY_MULT, BOT_NAMES, PLAYER, WEAPON_TYPES, MATERIALS } from './config.js';
import { createCharacter, animateCharacter, createWeaponModel, randomOutfit, flashCharacter } from './characters.js';
import { botLootDrop } from './loot.js';
import { angleLerp, clamp, wrapAngle } from './utils.js';

const BOT_STEP = 1 / 60;

class Bot {
  constructor(game, name, x, z) {
    const rng = game.rng;
    this.game = game;
    this.name = name;
    this.pos = new THREE.Vector3(x, game.world.heightAt(x, z), z);
    this.vel = new THREE.Vector3();
    this.radius = PLAYER.radius;
    this.height = PLAYER.height;
    this.step = PLAYER.step;
    this.onGround = false;
    this.groundSolid = null;
    this.yaw = rng.range(0, Math.PI * 2);
    this.hp = 100;
    this.shield = rng.chance(0.55) ? rng.pick([25, 50, 50, 75, 100]) : 0;
    const wType = rng.weighted([['pistol', 18], ['smg', 22], ['ar', 34], ['shotgun', 20], ['sniper', 6]]);
    const rarities = WEAPONS[wType].rarities;
    const rarity = rng.weighted(rarities.map((r, i) => [r, [45, 30, 16, 7, 2][i] || 1]));
    this.weapon = { type: wType, rarity };
    this.alive = true;
    this.kills = 0;
    this.state = 'wander';
    this.target = new THREE.Vector2(x, z);
    this.targetTimer = rng.range(0, 3);
    this.combatTarget = null;
    this.lastKnown = new THREE.Vector3();
    this.lastSeenTime = -100;
    this.lastNoiseTime = -100;
    this.perceptionTimer = rng.range(0, 0.3);
    this.fireTimer = rng.range(0.5, 1.5);
    this.burst = 0;
    this.strafeDir = 1;
    this.strafeTimer = 0;
    this.stuckTimer = 0;
    this.avoidTimer = 0;
    this.avoidAngle = 0;
    this.stormTick = 0;
    this.buildCooldown = rng.range(0, 3);
    this.aimSkill = rng.range(0.75, 1.4);
    this.aggro = rng.chance(0.4);
    this.lastShotTime = -100;
    this.armPitch = 0;

    this.char = createCharacter(randomOutfit(rng), 'bot');
    for (const m of this.char.meshes) {
      m.userData.bot = this;
      game.world.addRaycastTarget(m);
    }
    this.weaponModel = createWeaponModel(wType, rarity);
    this.weaponModel.rotation.set(-Math.PI / 2, 0, 0);
    this.char.hand.add(this.weaponModel);
    this.char.group.position.copy(this.pos);
    this.char.group.rotation.y = this.yaw + Math.PI;
    game.scene.add(this.char.group);
    this.char.group.updateMatrixWorld(true);
  }
}

export class BotManager {
  constructor(game) {
    this.game = game;
    this.bots = [];
    this.aliveCount = 0;
    this._v = new THREE.Vector3();
    this._o = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._r = new THREE.Vector3();
    this._u = new THREE.Vector3();
  }

  spawnAll(spawns, count) {
    const rng = this.game.rng;
    const names = BOT_NAMES.slice();
    const pool = spawns.slice();
    for (let n = 0; n < count && pool.length; n++) {
      const idx = Math.floor(rng.next() * pool.length);
      const s = pool.splice(idx, 1)[0];
      const nameIdx = Math.floor(rng.next() * names.length);
      const name = names.length ? names.splice(nameIdx, 1)[0] : `Player${n + 2}`;
      this.bots.push(new Bot(this.game, name, s.x, s.z));
    }
    this.aliveCount = this.bots.length;
  }

  hasLOS(b, targetPos) {
    const world = this.game.world;
    const ax = b.pos.x;
    const ay = b.pos.y + 1.6;
    const az = b.pos.z;
    const bx = targetPos.x;
    const by = targetPos.y + 1.2;
    const bz = targetPos.z;
    for (const t of [0.25, 0.5, 0.75]) {
      const y = ay + (by - ay) * t;
      if (world.heightAt(ax + (bx - ax) * t, az + (bz - az) * t) > y) return false;
    }
    return world.segmentSolid(ax, ay, az, bx, by, bz) === null;
  }

  onNoise(pos, radius, source = null) {
    const now = this.game.time;
    const rng = this.game.rng;
    for (const b of this.bots) {
      if (!b.alive || b === source || b.combatTarget) continue;
      const d = b.pos.distanceTo(pos);
      if (d > radius || now - b.lastNoiseTime < 4) continue;
      b.lastNoiseTime = now;
      if (rng.chance(0.55)) {
        b.lastKnown.copy(pos);
        b.lastSeenTime = now;
      }
    }
  }

  onStructurePlaced() {}

  update(dt) {
    const game = this.game;
    if (game.player.phase !== 'ground' && game.state === 'drop') {
      // bots roam while the player is still in the air, but never fight the player
    }
    for (const b of this.bots) {
      if (b.alive) this.updateBot(b, dt);
    }
  }

  updateBot(b, dt) {
    const game = this.game;
    const world = game.world;
    const player = game.player;
    const storm = game.storm;
    const rng = game.rng;
    const now = game.time;

    if (b.combatTarget && !b.combatTarget.alive) b.combatTarget = null;
    if (b.combatTarget === player && player.phase !== 'ground') b.combatTarget = null;

    // ---- perception ----
    b.perceptionTimer -= dt;
    if (b.perceptionTimer <= 0) {
      b.perceptionTimer = 0.22 + rng.next() * 0.12;
      let target = null;
      if (player.alive && player.phase === 'ground') {
        const d = b.pos.distanceTo(player.pos);
        if (d < 80) {
          const toP = Math.atan2(-(player.pos.x - b.pos.x), -(player.pos.z - b.pos.z));
          const facing = Math.abs(wrapAngle(toP - b.yaw)) < 1.8 || d < 14 || now - b.lastSeenTime < 3 || b.combatTarget === player;
          if (facing && this.hasLOS(b, player.pos)) target = player;
        }
      }
      if (!target) {
        let best = null;
        let bestD = b.combatTarget && b.combatTarget !== player ? 60 : 42;
        for (const o of this.bots) {
          if (o === b || !o.alive) continue;
          const d = b.pos.distanceTo(o.pos);
          if (d < bestD && this.hasLOS(b, o.pos)) {
            best = o;
            bestD = d;
          }
        }
        if (best && (b.aggro || b.combatTarget === best || rng.chance(0.35))) {
          target = best;
          b.aggro = true;
        }
      }
      if (target) {
        b.combatTarget = target;
        b.lastKnown.copy(target.pos);
        b.lastSeenTime = now;
      } else if (b.combatTarget && now - b.lastSeenTime > 1.2) {
        b.combatTarget = null;
      }
    }

    // ---- state ----
    const outside = storm.isOutside(b.pos.x, b.pos.z);
    const nearEdge = storm.distanceOutside(b.pos.x, b.pos.z) > -14;
    if (b.combatTarget) b.state = 'combat';
    else if (outside || (nearEdge && storm.shrinking)) b.state = 'zone';
    else if (now - b.lastSeenTime < 6) b.state = 'search';
    else b.state = 'wander';

    // ---- movement ----
    let moveX = 0;
    let moveZ = 0;
    let speed = PLAYER.walk * 0.85;
    b.targetTimer -= dt;
    if (b.state === 'combat') {
      const tp = b.combatTarget.pos;
      const dx = tp.x - b.pos.x;
      const dz = tp.z - b.pos.z;
      const d = Math.hypot(dx, dz) || 0.001;
      b.yaw = Math.atan2(-dx, -dz);
      b.armPitch = Math.atan2(tp.y + 1.1 - (b.pos.y + 1.5), d);
      b.strafeTimer -= dt;
      if (b.strafeTimer <= 0) {
        b.strafeTimer = rng.range(0.7, 1.8);
        b.strafeDir = rng.chance(0.3) ? 0 : rng.chance(0.5) ? -1 : 1;
      }
      const nx = dx / d;
      const nz = dz / d;
      let adv = 0;
      if (d > 30) adv = 1;
      else if (d < 7) adv = -0.8;
      moveX = -nz * b.strafeDir + nx * adv;
      moveZ = nx * b.strafeDir + nz * adv;
      speed = PLAYER.walk * 0.95;
    } else {
      const target = b.target;
      if (b.state === 'zone') {
        if (b.targetTimer <= 0 || outside) {
          const useNext = storm.shrinking;
          const c = useNext ? storm.nextCenter : storm.center;
          const r = (useNext ? storm.nextRadius : storm.radius) * 0.55;
          const ang = rng.range(0, Math.PI * 2);
          const rr = rng.range(0, r);
          target.set(c.x + Math.cos(ang) * rr, c.y + Math.sin(ang) * rr);
          b.targetTimer = 5;
        }
        speed = PLAYER.sprint * 0.9;
      } else if (b.state === 'search') {
        target.set(b.lastKnown.x, b.lastKnown.z);
        speed = PLAYER.walk;
      } else {
        const dist = Math.hypot(target.x - b.pos.x, target.y - b.pos.z);
        if (b.targetTimer <= 0 || dist < 1.5) {
          b.targetTimer = rng.range(5, 14);
          if (rng.chance(0.25)) {
            target.set(b.pos.x, b.pos.z);
          } else {
            const ang = rng.range(0, Math.PI * 2);
            const rr = rng.range(10, 45);
            let tx = b.pos.x + Math.cos(ang) * rr;
            let tz = b.pos.z + Math.sin(ang) * rr;
            if (storm.isOutside(tx, tz)) {
              tx = storm.center.x + (b.pos.x - storm.center.x) * 0.6;
              tz = storm.center.y + (b.pos.z - storm.center.y) * 0.6;
            }
            target.set(clamp(tx, -380, 380), clamp(tz, -380, 380));
          }
        }
        speed = PLAYER.walk * 0.8;
      }
      const dx = target.x - b.pos.x;
      const dz = target.y - b.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.8) {
        moveX = dx / d;
        moveZ = dz / d;
        b.yaw = angleLerp(b.yaw, Math.atan2(-dx, -dz), 1 - Math.pow(0.002, dt));
      }
      b.armPitch = 0;
    }

    const ml = Math.hypot(moveX, moveZ);
    if (ml > 0) {
      moveX /= ml;
      moveZ /= ml;
    }
    if (b.avoidTimer > 0) {
      b.avoidTimer -= dt;
      const c = Math.cos(b.avoidAngle);
      const s = Math.sin(b.avoidAngle);
      const rx = moveX * c - moveZ * s;
      const rz = moveX * s + moveZ * c;
      moveX = rx;
      moveZ = rz;
    }
    b.vel.x = moveX * speed;
    b.vel.z = moveZ * speed;
    const x0 = b.pos.x;
    const z0 = b.pos.z;
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(BOT_STEP, remaining);
      remaining -= h;
      b.vel.y -= PLAYER.gravity * h;
      if (b.vel.y < -60) b.vel.y = -60;
      world.resolveEntity(b, h);
    }
    if (ml > 0) {
      const moved = Math.hypot(b.pos.x - x0, b.pos.z - z0);
      if (moved < speed * dt * 0.3) b.stuckTimer += dt;
      else b.stuckTimer = Math.max(0, b.stuckTimer - dt * 2);
      if (b.stuckTimer > 0.45) {
        b.stuckTimer = 0;
        b.avoidTimer = rng.range(0.7, 1.5);
        b.avoidAngle = (rng.chance(0.5) ? 1 : -1) * rng.range(1.2, 2.4);
        if (b.onGround && rng.chance(0.5)) b.vel.y = PLAYER.jump;
        if (b.state === 'wander') b.targetTimer = 0;
      }
    }

    // ---- storm ----
    if (outside) {
      b.stormTick += dt;
      if (b.stormTick >= 1) {
        b.stormTick -= 1;
        b.hp -= storm.dps;
        if (b.hp <= 0) {
          this.killBot(b, null, 'storm');
          return;
        }
      }
    } else {
      b.stormTick = 0;
    }

    // ---- shooting ----
    b.buildCooldown -= dt;
    if (b.state === 'combat' && b.combatTarget && game.state === 'play') {
      b.fireTimer -= dt;
      if (b.fireTimer <= 0) this.botShoot(b);
    }

    // ---- visuals ----
    b.char.group.position.copy(b.pos);
    b.char.group.rotation.y = b.yaw + Math.PI;
    animateCharacter(b.char, dt, Math.hypot(b.vel.x, b.vel.z), true);
    const armX = -Math.PI / 2 - b.armPitch * 0.85 + 0.1;
    b.char.parts.rightArmPivot.rotation.x = armX;
    b.char.parts.leftArmPivot.rotation.x = armX + 0.25;
    b.char.parts.leftArmPivot.rotation.z = -0.5;
  }

  botShoot(b) {
    const game = this.game;
    const rng = game.rng;
    const def = WEAPONS[b.weapon.type];
    const t = b.combatTarget;
    if (!t || !t.alive) return;
    const player = game.player;
    const origin = this._o.set(b.pos.x, b.pos.y + 1.5, b.pos.z);
    const dir = this._d.set(t.pos.x - origin.x, t.pos.y + 1.1 - origin.y, t.pos.z - origin.z);
    const dist = dir.length();
    dir.normalize();
    const right = this._r.set(-dir.z, 0, dir.x).normalize();
    const up = this._u.crossVectors(right, dir).normalize();
    let sigma = (0.016 + dist * 0.0011) * b.aimSkill;
    if (t === player && player.speedXZ > 4) sigma *= 1.35;
    if (t === player && player.ads > 0.5) sigma *= 1.1;
    const ox = (rng.next() + rng.next() - 1) * sigma * 1.8;
    const oy = (rng.next() + rng.next() - 1) * sigma * 1.8;
    dir.addScaledVector(right, ox).addScaledVector(up, oy).normalize();
    const baseDir = dir.clone();
    const muzzle = origin.clone().addScaledVector(right, 0.3).addScaledVector(dir, 0.6);
    const dToPlayer = b.pos.distanceTo(player.pos);
    const showFx = dToPlayer < 140;
    for (let n = 0; n < def.pellets; n++) {
      const d2 = baseDir.clone();
      if (def.pellets > 1) {
        const a = rng.range(0, Math.PI * 2);
        const r = Math.sqrt(rng.next()) * def.spread;
        d2.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      }
      const hit = game.world.raycast(origin, d2, def.range, (o) => o.userData.bot !== b);
      const end = hit ? hit.point : origin.clone().addScaledVector(d2, def.range);
      if (showFx) game.effects.tracer(muzzle, end, 0xffb27a);
      if (!hit) continue;
      let falloff = 1;
      if (hit.distance > def.falloff[0]) {
        falloff = clamp(1 - ((hit.distance - def.falloff[0]) / (def.falloff[1] - def.falloff[0])) * 0.6, 0.4, 1);
      }
      const dmg = Math.max(1, Math.round(def.damage * RARITY_MULT[b.weapon.rarity] * falloff * 0.8));
      if (hit.kind === 'player') {
        player.takeDamage(dmg, b, 'bullet');
        game.effects.burst(hit.point, 0xff6060, 4, 2, 6, 0.3);
      } else if (hit.kind === 'bot') {
        const victim = hit.bot;
        this.damageBot(victim, dmg, b, hit.point, hit.part === 'head');
        if (showFx) game.effects.burst(hit.point, 0xffffff, 3, 2, 6, 0.3);
      } else if (hit.kind === 'solid') {
        const s = hit.solid;
        if (s.hp !== Infinity) game.damageSolid(s, dmg, b, hit.point);
        if (showFx) game.effects.burst(hit.point, s.material ? MATERIALS[s.material].color : 0xcccccc, 3, 2, 8, 0.3);
      } else if (showFx) {
        game.effects.burst(hit.point, 0x6b5a3a, 3, 2, 8, 0.3);
      }
    }
    if (showFx) game.effects.muzzleFlash(muzzle);
    const vol = clamp(1.1 - dToPlayer / 110, 0, 1);
    if (vol > 0.02) game.audio.play(`shot_${b.weapon.type}`, vol * 0.7);
    b.lastShotTime = game.time;

    const interval = 60 / def.rpm;
    b.burst--;
    if (b.burst <= 0) {
      b.burst = def.auto ? rng.int(3, 7) : rng.int(1, 3);
      b.fireTimer = rng.range(0.7, 1.7);
    } else {
      b.fireTimer = interval * (def.auto ? rng.range(1.0, 1.5) : rng.range(1.3, 2.2));
    }
    this.onNoise(b.pos, 70, b);
  }

  damageBot(bot, dmg, source, point, head) {
    if (!bot.alive) return { killed: false, shieldHit: false };
    const game = this.game;
    let remaining = dmg;
    let shieldHit = false;
    if (bot.shield > 0) {
      const s = Math.min(bot.shield, remaining);
      bot.shield -= s;
      remaining -= s;
      shieldHit = s >= dmg * 0.5;
    }
    bot.hp -= remaining;
    flashCharacter(bot.char);
    if (source) {
      bot.lastKnown.copy(source.pos);
      bot.lastSeenTime = game.time;
      bot.aggro = true;
      if (!bot.combatTarget) {
        bot.combatTarget = source;
        bot.perceptionTimer = 0.15;
      }
      if (bot.buildCooldown <= 0 && bot.onGround && game.rng.chance(0.45) && bot.hp > 0) {
        bot.buildCooldown = 4;
        game.building.botPlaceWall(bot, source.pos.x, source.pos.z, game.rng.pick(['wood', 'wood', 'brick']));
      }
    }
    if (bot.hp <= 0) {
      this.killBot(bot, source, 'bullet');
      return { killed: true, shieldHit };
    }
    return { killed: false, shieldHit };
  }

  killBot(bot, source, kind) {
    if (!bot.alive) return;
    const game = this.game;
    bot.alive = false;
    bot.combatTarget = null;
    this.aliveCount--;
    game.scene.remove(bot.char.group);
    for (const m of bot.char.meshes) game.world.removeRaycastTarget(m);
    game.loot.spawnItems(botLootDrop(game.rng, bot), bot.pos.x, bot.pos.y, bot.pos.z, game.rng);
    game.effects.burst(this._v.set(bot.pos.x, bot.pos.y + 1, bot.pos.z), 0xffffff, 24, 4, 6, 0.7);
    for (const o of this.bots) if (o.combatTarget === bot) o.combatTarget = null;

    const player = game.player;
    if (source === player) {
      player.kills++;
      game.audio.play('elim');
      game.hud.killFeed(`You eliminated ${bot.name}`, 'you');
      game.hud.announce(`ELIMINATED ${bot.name.toUpperCase()}`, `${this.aliveCount} players remaining`, 1.8);
    } else if (source) {
      source.kills++;
      game.hud.killFeed(`${source.name} eliminated ${bot.name}`);
    } else if (kind === 'storm') {
      game.hud.killFeed(`${bot.name} was consumed by the storm`);
    } else {
      game.hud.killFeed(`${bot.name} was eliminated`);
    }
    game.checkVictory();
  }

  /** Bots that fired very recently (for minimap gunfire markers). */
  recentShooters(now, within = 1.5) {
    return this.bots.filter((b) => b.alive && now - b.lastShotTime < within);
  }
}
