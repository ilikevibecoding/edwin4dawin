// Player entity with Minecraft-style physics (20 ticks/s), AABB collision, step-up, swimming.
import * as THREE from 'three';
import { BLOCKS, B, SHAPE } from './blocks.js';
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_EYE, SNEAK_EYE, CHUNK_HEIGHT } from './constants.js';

const STEP_HEIGHT = 0.6;
const EPS = 1e-4;

export class AABB {
  constructor(x0, y0, z0, x1, y1, z1) { this.x0 = x0; this.y0 = y0; this.z0 = z0; this.x1 = x1; this.y1 = y1; this.z1 = z1; }
  copy(b) { this.x0 = b.x0; this.y0 = b.y0; this.z0 = b.z0; this.x1 = b.x1; this.y1 = b.y1; this.z1 = b.z1; return this; }
  clone() { return new AABB(this.x0, this.y0, this.z0, this.x1, this.y1, this.z1); }
  offset(x, y, z) { this.x0 += x; this.x1 += x; this.y0 += y; this.y1 += y; this.z0 += z; this.z1 += z; return this; }
  intersects(b) { return this.x0 < b.x1 && this.x1 > b.x0 && this.y0 < b.y1 && this.y1 > b.y0 && this.z0 < b.z1 && this.z1 > b.z0; }
}

// Collect collision boxes of blocks overlapping the region
export function collectBoxes(world, region, out = []) {
  out.length = 0;
  const x0 = Math.floor(region.x0), x1 = Math.floor(region.x1);
  const y0 = Math.max(0, Math.floor(region.y0)), y1 = Math.min(CHUNK_HEIGHT - 1, Math.floor(region.y1));
  const z0 = Math.floor(region.z0), z1 = Math.floor(region.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
    const id = world.getBlock(x, y, z);
    if (id === 0) continue;
    const def = BLOCKS[id];
    if (!def.solid) continue;
    for (const b of def.boxes) out.push(new AABB(x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]));
  }
  return out;
}

// Overlap tests use a small tolerance so floating point drift (e.g. y = 57.99999) never turns a
// floor we stand on into a wall.
const T = 1e-5;
function clipY(box, boxes, dy) {
  for (const b of boxes) {
    if (box.x1 <= b.x0 + T || box.x0 >= b.x1 - T || box.z1 <= b.z0 + T || box.z0 >= b.z1 - T) continue;
    if (dy > 0 && box.y1 <= b.y0 + T) { const d = b.y0 - box.y1; if (d < dy) dy = d; }
    else if (dy < 0 && box.y0 >= b.y1 - T) { const d = b.y1 - box.y0; if (d > dy) dy = d; }
  }
  return dy;
}
function clipX(box, boxes, dx) {
  for (const b of boxes) {
    if (box.y1 <= b.y0 + T || box.y0 >= b.y1 - T || box.z1 <= b.z0 + T || box.z0 >= b.z1 - T) continue;
    if (dx > 0 && box.x1 <= b.x0 + T) { const d = b.x0 - box.x1; if (d < dx) dx = d; }
    else if (dx < 0 && box.x0 >= b.x1 - T) { const d = b.x1 - box.x0; if (d > dx) dx = d; }
  }
  return dx;
}
function clipZ(box, boxes, dz) {
  for (const b of boxes) {
    if (box.y1 <= b.y0 + T || box.y0 >= b.y1 - T || box.x1 <= b.x0 + T || box.x0 >= b.x1 - T) continue;
    if (dz > 0 && box.z1 <= b.z0 + T) { const d = b.z0 - box.z1; if (d < dz) dz = d; }
    else if (dz < 0 && box.z0 >= b.z1 - T) { const d = b.z1 - box.z0; if (d > dz) dz = d; }
  }
  return dz;
}
// snap values that are within rounding error of a 1/16 grid position
function snap(v) { const s = Math.round(v * 16) / 16; return Math.abs(v - s) < 1e-6 ? s : v; }

// Moves an AABB through the world with collision. Returns {dx,dy,dz, onGround, hitX, hitZ}
export function moveBox(world, box, dx, dy, dz, stepHeight = 0, canStep = false, scratch = []) {
  const ox = dx, oy = dy, oz = dz;
  const region = box.clone();
  region.x0 = Math.min(region.x0, region.x0 + dx) - 1; region.x1 = Math.max(region.x1, region.x1 + dx) + 1;
  region.y0 = Math.min(region.y0, region.y0 + dy) - 1; region.y1 = Math.max(region.y1, region.y1 + dy) + stepHeight + 1;
  region.z0 = Math.min(region.z0, region.z0 + dz) - 1; region.z1 = Math.max(region.z1, region.z1 + dz) + 1;
  const boxes = collectBoxes(world, region, scratch);
  const start = box.clone();

  dy = clipY(box, boxes, dy); box.offset(0, dy, 0);
  dx = clipX(box, boxes, dx); box.offset(dx, 0, 0);
  dz = clipZ(box, boxes, dz); box.offset(0, 0, dz);

  const blockedH = (Math.abs(dx - ox) > EPS || Math.abs(dz - oz) > EPS);
  if (canStep && blockedH && stepHeight > 0) {
    // try stepping: from start, move up by step, then horizontally, then down
    const b2 = start.clone();
    let sy = clipY(b2, boxes, stepHeight); b2.offset(0, sy, 0);
    let sx = clipX(b2, boxes, ox); b2.offset(sx, 0, 0);
    let sz = clipZ(b2, boxes, oz); b2.offset(0, 0, sz);
    let down = clipY(b2, boxes, -sy); b2.offset(0, down, 0);
    const d1 = dx * dx + dz * dz, d2 = sx * sx + sz * sz;
    if (d2 > d1 + EPS) {
      box.copy(b2);
      dx = sx; dz = sz; dy = sy + down;
    }
  }
  // remove floating point drift after the sweep
  const h = box.y1 - box.y0, w = box.x1 - box.x0, l = box.z1 - box.z0;
  box.y0 = snap(box.y0); box.y1 = box.y0 + h;
  box.x0 = snap(box.x0); box.x1 = box.x0 + w;
  box.z0 = snap(box.z0); box.z1 = box.z0 + l;
  return { dx, dy, dz, hitY: dy !== oy, hitX: Math.abs(dx - ox) > EPS, hitZ: Math.abs(dz - oz) > EPS, oy };
}

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(0, 70, 0);
    this.prevPos = this.pos.clone();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.sprinting = false;
    this.sneaking = false;
    this.inWater = false;
    this.eyeUnderwater = false;
    this.health = 20;
    this.food = 20;
    this.exhaustion = 0;
    this.foodTimer = 0;
    this.fallDistance = 0;
    this.walkDist = 0;
    this.prevWalkDist = 0;
    this.bob = 0;
    this.prevBob = 0;
    this.eyeHeight = PLAYER_EYE;
    this.prevEyeHeight = PLAYER_EYE;
    this.stepDist = 0;
    this.nextStep = 1;
    this.hurtTime = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.scratch = [];
    this.events = []; // {type, ...} consumed by game each tick
    this.autoJump = true;
    this.jumpCooldown = 0;
    this.lastGroundBlock = B.GRASS;
    this.force = new THREE.Vector3(); // external acceleration (blocks/s^2) applied at the next tick
    this.lastImpact = 0;
    this.swept = 0; // seconds of being tossed by a wave: buoyant and helpless
    // creative flight (double-tap jump toggles it, like Minecraft)
    this.flying = false;
    this.jumpWasDown = false;
    this.lastJumpTap = -100;
    this.tickCount = 0;
  }

  // External forces from disasters (wind, water flow, blast). Accumulated and applied once per tick.
  addForce(fx, fy, fz) { this.force.x += fx; this.force.y += fy; this.force.z += fz; }
  // Instant velocity change in blocks/s
  impulse(vx, vy, vz) { this.vel.x += vx / 20; this.vel.y += vy / 20; this.vel.z += vz / 20; }

  get box() {
    const hw = PLAYER_WIDTH / 2;
    const h = this.sneaking ? 1.5 : PLAYER_HEIGHT;
    return new AABB(this.pos.x - hw, this.pos.y, this.pos.z - hw, this.pos.x + hw, this.pos.y + h, this.pos.z + hw);
  }

  eyePos(alpha, out) {
    out.lerpVectors(this.prevPos, this.pos, alpha);
    out.y += this.prevEyeHeight + (this.eyeHeight - this.prevEyeHeight) * alpha;
    return out;
  }

  forwardDir(out) {
    out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    return out;
  }

  teleport(x, y, z) {
    this.pos.set(x, y, z);
    this.prevPos.copy(this.pos);
    this.vel.set(0, 0, 0);
    this.fallDistance = 0;
  }

  blockAt(x, y, z) { return this.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); }

  isInWater() {
    const b = this.box;
    const x0 = Math.floor(b.x0), x1 = Math.floor(b.x1), z0 = Math.floor(b.z0), z1 = Math.floor(b.z1);
    const y0 = Math.floor(b.y0), y1 = Math.floor(b.y0 + 0.9);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
      if (this.world.getBlock(x, y, z) === B.WATER) return true;
    }
    return false;
  }

  // ctrl: {forward, strafe, jump, sneak, sprint}
  tick(ctrl) {
    this.prevPos.copy(this.pos);
    this.prevWalkDist = this.walkDist;
    this.prevBob = this.bob;
    this.prevEyeHeight = this.eyeHeight;
    if (this.hurtTime > 0) this.hurtTime--;
    if (this.jumpCooldown > 0) this.jumpCooldown--;
    if (this.swept > 0) this.swept -= 0.05;

    if (this.dead) {
      this.deathTimer++;
      this.vel.set(0, 0, 0);
      return;
    }

    this.tickCount++;
    // double-tap jump within 7 ticks toggles flight; while flying, jump/sneak mean rise/descend
    const jumpDown = !!ctrl.jump;
    if (jumpDown && !this.jumpWasDown) {
      if (this.tickCount - this.lastJumpTap <= 6 && !this.inWater && (!this.onGround || this.flying)) {
        this.flying = !this.flying; this.vel.y = 0; this.fallDistance = 0; this.lastJumpTap = -100;
        this.events.push({ type: 'fly', flying: this.flying });
      } else this.lastJumpTap = this.tickCount;
    }
    this.jumpWasDown = jumpDown;

    let forward = ctrl.forward, strafe = ctrl.strafe;
    this.sneaking = !this.flying && !!ctrl.sneak;
    const wantSprint = ctrl.sprint && forward > 0 && this.food > 6 && !this.sneaking;
    if (wantSprint && !this.sprinting) this.sprinting = true;
    if (!wantSprint || forward <= 0) this.sprinting = false;
    if (this.sneaking) { forward *= 0.3; strafe *= 0.3; }
    this.inWater = this.isInWater();
    const eyeBlock = this.blockAt(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z);
    this.eyeUnderwater = eyeBlock === B.WATER;

    // acceleration
    let len = Math.sqrt(forward * forward + strafe * strafe);
    if (len > 1) { forward /= len; strafe /= len; len = 1; }
    let accel;
    if (this.flying) accel = this.sprinting ? 0.1 : 0.05;   // Minecraft fly speed: ~11 blocks/s, ~22 sprinting
    else if (this.inWater) accel = 0.02;
    else if (this.onGround) accel = this.sprinting ? 0.13 : 0.1;
    else accel = this.sprinting ? 0.026 : 0.02;
    if (len > 0.0001) {
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      // forward is -z at yaw 0
      const fx = -sin, fz = -cos;
      const rx = cos, rz = -sin;
      this.vel.x += (fx * forward + rx * strafe) * accel;
      this.vel.z += (fz * forward + rz * strafe) * accel;
    }

    // jumping / swimming / flying
    if (this.flying) {
      if (ctrl.jump) this.vel.y += 0.15;
      if (ctrl.sneak) this.vel.y -= 0.15;
    } else if (this.autoJumpPending) {
      this.autoJumpPending = false;
      if (this.onGround) this.jump(); // full-strength hop onto the ledge (like Minecraft's auto-jump)
    } else if (ctrl.jump) {
      if (this.inWater) this.vel.y += 0.04;
      else if (this.onGround && this.jumpCooldown === 0) this.jump();
    }
    // external forces (blocks/s^2 -> blocks/tick over one 0.05 s tick)
    if (this.force.x || this.force.y || this.force.z) {
      const fk = this.flying ? 0.001 : 0.0025; // a flying observer is buffeted, not swallowed
      this.vel.x += this.force.x * fk; this.vel.y += this.force.y * fk; this.vel.z += this.force.z * fk;
      const sp = Math.hypot(this.vel.x, this.vel.y, this.vel.z);
      if (sp > 1.6) { const k = 1.6 / sp; this.vel.x *= k; this.vel.y *= k; this.vel.z *= k; } // cap at 32 blocks/s
      this.force.set(0, 0, 0);
    }

    // sneaking edge protection
    let dx = this.vel.x, dz = this.vel.z;
    if (this.sneaking && this.onGround) {
      const test = (mx, mz) => {
        const b = this.box.offset(mx, -0.6, mz);
        const region = b.clone(); region.y0 -= 0.1;
        return collectBoxes(this.world, region, this.scratch).some((bb) => bb.intersects(b));
      };
      if (!test(dx, 0)) dx = 0;
      if (!test(0, dz)) dz = 0;
      if (!test(dx, dz)) { dx = 0; dz = 0; }
    }

    // movement with collision
    const box = this.box;
    const wasOnGround = this.onGround;
    const res = moveBox(this.world, box, dx, this.vel.y, dz, this.flying ? 0 : STEP_HEIGHT, (wasOnGround || this.inWater) && !this.flying, this.scratch);
    const hw = PLAYER_WIDTH / 2;
    this.pos.set(box.x0 + hw, box.y0, box.z0 + hw);
    this.onGround = res.hitY && res.oy < 0;
    if (res.hitX) this.vel.x = 0;
    if (res.hitZ) this.vel.z = 0;
    if (res.hitY) {
      if (res.oy < 0 && !this.inWater) this.land();
      if (res.oy < 0 && this.flying) { this.flying = false; this.events.push({ type: 'fly', flying: false }); } // landing ends flight
      this.vel.y = 0;
    }
    if (this.sprinting && (res.hitX || res.hitZ) && len > 0) { /* keep sprinting into walls like MC */ }

    // auto-jump over 1-block ledges
    if (this.autoJump && this.onGround && !this.sneaking && !this.flying && (res.hitX || res.hitZ) && len > 0.3 && this.jumpCooldown === 0 && !this.inWater) {
      const probe = this.box.offset(dx * 4 + Math.sign(dx) * 0.05, 1.0 + 0.01, dz * 4 + Math.sign(dz) * 0.05);
      const region = probe.clone(); region.y0 -= 0.05;
      const blocked = collectBoxes(this.world, region, this.scratch).some((bb) => bb.intersects(probe));
      if (!blocked) { this.autoJumpPending = true; this.jumpCooldown = 10; }
    }

    // gravity & drag
    if (this.flying) {
      this.vel.y *= 0.6;
      this.vel.x *= 0.91; this.vel.z *= 0.91;
      this.fallDistance = 0;
    } else if (this.inWater) {
      this.vel.x *= 0.8; this.vel.y *= 0.8; this.vel.z *= 0.8;
      this.vel.y -= 0.02;
      if (this.swept > 0) { this.vel.y += 0.055; if (this.eyeUnderwater) this.vel.y += 0.03; } // tossed by the wave: bob back up to the surface
      this.fallDistance = 0;
    } else {
      this.vel.y -= 0.08;
      this.vel.y *= 0.98;
      const friction = this.onGround ? 0.546 : 0.91;
      this.vel.x *= friction; this.vel.z *= friction;
      if (!this.onGround && this.vel.y < 0) this.fallDistance += -res.dy;
    }
    if (Math.abs(this.vel.x) < 0.003) this.vel.x = 0;
    if (Math.abs(this.vel.z) < 0.003) this.vel.z = 0;

    // walking distance (bobbing + footsteps)
    const hdx = this.pos.x - this.prevPos.x, hdz = this.pos.z - this.prevPos.z;
    const hd = Math.sqrt(hdx * hdx + hdz * hdz);
    this.walkDist += hd * 0.6;
    let bobTarget = Math.min(Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z), 0.1);
    if (!this.onGround) bobTarget = 0;
    this.bob += (bobTarget - this.bob) * 0.4;
    if (this.onGround) {
      this.stepDist += hd * 0.6;
      if (this.stepDist > this.nextStep) {
        this.nextStep = Math.floor(this.stepDist) + 1;
        const gb = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.2), Math.floor(this.pos.z));
        if (gb !== B.AIR) this.lastGroundBlock = gb;
        this.events.push({ type: 'step', block: this.lastGroundBlock, inWater: this.inWater });
      }
    }

    // eye height
    const targetEye = this.sneaking ? SNEAK_EYE : PLAYER_EYE;
    this.eyeHeight += (targetEye - this.eyeHeight) * 0.5;

    // hunger / regen
    this.exhaustion += hd * (this.sprinting ? 0.1 : 0.01);
    if (this.exhaustion > 4) { this.exhaustion -= 4; if (this.food > 0) this.food--; }
    if (this.food >= 18 && this.health < 20) {
      this.foodTimer++;
      if (this.foodTimer >= 80) { this.foodTimer = 0; this.health = Math.min(20, this.health + 1); this.exhaustion += 3; }
    } else if (this.food <= 0) {
      this.foodTimer++;
      if (this.foodTimer >= 80) { this.foodTimer = 0; if (this.health > 1) this.damage(1); }
    } else this.foodTimer = 0;

    // standing on magma burns (1 damage every half second) unless sneaking, like Minecraft
    if (this.onGround && !this.sneaking && this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.01), Math.floor(this.pos.z)) === B.MAGMA) {
      this.magmaTimer = (this.magmaTimer || 0) + 1;
      if (this.magmaTimer >= 10) { this.magmaTimer = 0; this.damage(1); this.events.push({ type: 'burn' }); }
    } else this.magmaTimer = 0;

    // void safety
    if (this.pos.y < -10) { this.damage(4); this.pos.y = 80; this.vel.set(0, 0, 0); }
  }

  jump() {
    this.vel.y = 0.42;
    if (this.sprinting) {
      this.vel.x += -Math.sin(this.yaw) * 0.2;
      this.vel.z += -Math.cos(this.yaw) * 0.2;
    }
    this.exhaustion += this.sprinting ? 0.2 : 0.05;
    this.events.push({ type: 'jump' });
  }

  land() {
    if (this.fallDistance > 3) {
      const dmg = Math.floor(this.fallDistance - 3);
      if (dmg > 0) { this.damage(dmg); this.events.push({ type: 'fallhurt', damage: dmg }); }
    } else if (this.fallDistance > 0.5) {
      this.events.push({ type: 'land', block: this.lastGroundBlock });
    }
    this.fallDistance = 0;
  }

  damage(amount) {
    if (this.dead) return;
    this.health -= amount;
    this.hurtTime = 10;
    this.events.push({ type: 'hurt' });
    if (this.health <= 0) { this.health = 0; this.dead = true; this.deathTimer = 0; this.events.push({ type: 'death' }); }
  }

  respawn(x, y, z) {
    this.dead = false;
    this.health = 20;
    this.food = 20;
    this.exhaustion = 0;
    this.teleport(x, y, z);
  }

  // View bobbing transforms for the camera (Minecraft formula). Returns {tx, ty, roll, pitch}
  viewBob(alpha, out) {
    const f = this.walkDist - this.prevWalkDist;
    const f1 = -(this.prevWalkDist + f * alpha);
    const f2 = this.prevBob + (this.bob - this.prevBob) * alpha;
    out.tx = Math.sin(f1 * Math.PI) * f2 * 0.5;
    out.ty = -Math.abs(Math.cos(f1 * Math.PI) * f2);
    out.roll = Math.sin(f1 * Math.PI) * f2 * 3 * (Math.PI / 180);
    out.pitch = Math.abs(Math.cos(f1 * Math.PI - 0.2) * f2) * 5 * (Math.PI / 180);
    return out;
  }
}
