// Minecraft-style farm animals: horses, cattle, pigs, chickens with pen-bound wandering.
import * as THREE from 'three';
import { buildBoxModel, PX } from '../npc/model.js';
import { standHeight } from '../npc/pathfinding.js';
import { RNG } from '../rng.js';
import { AABB } from '../player.js';

// 32x32 texture with 4 regions: coat (0,0), dark (16,0), accent (0,16), light (16,16)
function animalTexture(coat, dark, accent, light, rng, patches = 0) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  const fillNoisy = (x0, y0, col) => {
    ctx.fillStyle = col; ctx.fillRect(x0, y0, 16, 16);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(0,0,0,${0.06 + rng.next() * 0.08})`; ctx.fillRect(x0 + rng.int(0, 15), y0 + rng.int(0, 15), 1, 1); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,255,255,${0.05 + rng.next() * 0.08})`; ctx.fillRect(x0 + rng.int(0, 15), y0 + rng.int(0, 15), 1, 1); }
  };
  fillNoisy(0, 0, coat); fillNoisy(16, 0, dark); fillNoisy(0, 16, accent); fillNoisy(16, 16, light);
  for (let i = 0; i < patches; i++) { ctx.fillStyle = light; const x = rng.int(0, 12), y = rng.int(0, 12); ctx.fillRect(x, y, rng.int(2, 5), rng.int(2, 4)); }
  return c;
}
const REG = (x, y) => { const r = [x, y, 16, 16]; return { top: r, bottom: r, right: r, front: r, left: r, back: r }; };
const COAT = REG(0, 0), DARK = REG(16, 0), ACCENT = REG(0, 16), LIGHT = REG(16, 16);

const HORSE_COATS = [['#5a3a22', '#2b1a0e'], ['#8a5a32', '#3a2414'], ['#1e1a18', '#0a0a0a'], ['#d8d0c4', '#7a7068'], ['#6b6b6b', '#2e2e2e'], ['#a0703c', '#5a3a1a'], ['#3a2a1e', '#1a120a']];

function horseParts() {
  return [
    { name: 'body', w: 10, h: 10, d: 22, x: 0, y: 21, z: 0, uv: COAT },
    { name: 'neck', w: 4, h: 13, d: 7, x: 0, y: 26, z: 8, rot: [-0.55, 0, 0], pivot: [0, 5, 0], uv: COAT },
    { name: 'head', w: 6, h: 5, d: 9, x: 0, y: 35, z: 14, uv: COAT },
    { name: 'mane', w: 2, h: 11, d: 5, x: 0, y: 30, z: 6, rot: [-0.5, 0, 0], uv: DARK },
    { name: 'tail', w: 3, h: 14, d: 3, x: 0, y: 22, z: -12, rot: [0.35, 0, 0], pivot: [0, -6, 0], uv: DARK },
    { name: 'legFL', w: 4, h: 16, d: 4, x: 3, y: 16, z: 8, pivot: [0, -8, 0], uv: COAT },
    { name: 'legFR', w: 4, h: 16, d: 4, x: -3, y: 16, z: 8, pivot: [0, -8, 0], uv: COAT },
    { name: 'legBL', w: 4, h: 16, d: 4, x: 3, y: 16, z: -8, pivot: [0, -8, 0], uv: COAT },
    { name: 'legBR', w: 4, h: 16, d: 4, x: -3, y: 16, z: -8, pivot: [0, -8, 0], uv: COAT },
    { name: 'saddle', w: 8, h: 2, d: 8, x: 0, y: 27, z: -1, uv: ACCENT },
  ];
}
function cowParts() {
  return [
    { name: 'body', w: 12, h: 10, d: 18, x: 0, y: 17, z: 0, uv: COAT },
    { name: 'head', w: 8, h: 8, d: 6, x: 0, y: 20, z: 11, uv: COAT },
    { name: 'snout', w: 6, h: 3, d: 1, x: 0, y: 18, z: 14.5, uv: LIGHT },
    { name: 'hornL', w: 1, h: 3, d: 1, x: 4, y: 25, z: 10, uv: LIGHT },
    { name: 'hornR', w: 1, h: 3, d: 1, x: -4, y: 25, z: 10, uv: LIGHT },
    { name: 'udder', w: 4, h: 2, d: 6, x: 0, y: 11, z: -3, uv: ACCENT },
    { name: 'legFL', w: 4, h: 12, d: 4, x: 4, y: 12, z: 6, pivot: [0, -6, 0], uv: DARK },
    { name: 'legFR', w: 4, h: 12, d: 4, x: -4, y: 12, z: 6, pivot: [0, -6, 0], uv: DARK },
    { name: 'legBL', w: 4, h: 12, d: 4, x: 4, y: 12, z: -6, pivot: [0, -6, 0], uv: DARK },
    { name: 'legBR', w: 4, h: 12, d: 4, x: -4, y: 12, z: -6, pivot: [0, -6, 0], uv: DARK },
  ];
}
function pigParts() {
  return [
    { name: 'body', w: 10, h: 8, d: 16, x: 0, y: 10, z: 0, uv: COAT },
    { name: 'head', w: 8, h: 8, d: 8, x: 0, y: 10, z: 10, uv: COAT },
    { name: 'snout', w: 4, h: 3, d: 1, x: 0, y: 9, z: 14.5, uv: ACCENT },
    { name: 'legFL', w: 4, h: 6, d: 4, x: 3, y: 6, z: 5, pivot: [0, -3, 0], uv: COAT },
    { name: 'legFR', w: 4, h: 6, d: 4, x: -3, y: 6, z: 5, pivot: [0, -3, 0], uv: COAT },
    { name: 'legBL', w: 4, h: 6, d: 4, x: 3, y: 6, z: -5, pivot: [0, -3, 0], uv: COAT },
    { name: 'legBR', w: 4, h: 6, d: 4, x: -3, y: 6, z: -5, pivot: [0, -3, 0], uv: COAT },
  ];
}
function chickenParts() {
  return [
    { name: 'body', w: 6, h: 6, d: 8, x: 0, y: 8, z: 0, uv: COAT },
    { name: 'head', w: 4, h: 6, d: 3, x: 0, y: 13, z: 3, pivot: [0, -2, 0], uv: COAT },
    { name: 'beak', w: 4, h: 2, d: 2, x: 0, y: 14, z: 5.5, uv: LIGHT },
    { name: 'wattle', w: 2, h: 2, d: 2, x: 0, y: 12, z: 5.5, uv: ACCENT },
    { name: 'wingL', w: 1, h: 4, d: 6, x: 3.5, y: 9, z: 0, uv: DARK },
    { name: 'wingR', w: 1, h: 4, d: 6, x: -3.5, y: 9, z: 0, uv: DARK },
    { name: 'legL', w: 1, h: 5, d: 3, x: 1.5, y: 2.5, z: 0, uv: LIGHT },
    { name: 'legR', w: 1, h: 5, d: 3, x: -1.5, y: 2.5, z: 0, uv: LIGHT },
  ];
}

const SPECS = {
  horse: { parts: horseParts, scale: 0.72, speed: 1.6, height: 1.6, width: 0.7, sound: 'horseNeigh', soundGap: [40, 110] },
  cow: { parts: cowParts, scale: 1.0, speed: 0.9, height: 1.4, width: 0.9, sound: 'cowMoo', soundGap: [30, 90] },
  pig: { parts: pigParts, scale: 1.0, speed: 1.0, height: 0.9, width: 0.8, sound: 'pigOink', soundGap: [20, 60] },
  chicken: { parts: chickenParts, scale: 0.8, speed: 1.1, height: 0.7, width: 0.4, sound: 'chickenCluck', soundGap: [8, 30] },
};

export class AnimalManager {
  constructor(scene, world, town, audio) {
    this.world = world;
    this.audio = audio;
    this.list = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rng = new RNG(777);
    for (const sp of town.animalSpawns) this.spawn(sp);
  }

  spawn(sp) {
    const spec = SPECS[sp.type];
    const rng = new RNG(this.rng.int(1, 1e9));
    let tex;
    if (sp.type === 'horse') { const [c, d] = rng.pick(HORSE_COATS); tex = animalTexture(c, d, '#5a3a22', '#f0f0f0', rng, rng.chance(0.3) ? 3 : 0); }
    else if (sp.type === 'cow') tex = animalTexture(rng.chance(0.7) ? '#4a3626' : '#8a5a32', '#2b1a0e', '#e8b0a0', '#e8e0d0', rng, 5);
    else if (sp.type === 'pig') tex = animalTexture('#f0a0a0', '#d08080', '#e07070', '#f0b0b0', rng, 0);
    else tex = animalTexture('#f0f0f0', '#e0e0e0', '#d02020', '#e0a020', rng, 0);
    const model = buildBoxModel(spec.parts(), tex);
    model.root.scale.setScalar(spec.scale);
    const st = this.world.gen ? null : null;
    void st;
    const a = {
      type: sp.type, spec, model, root: model.root, rng,
      pos: new THREE.Vector3(sp.x, 0, sp.z), prevPos: new THREE.Vector3(), yaw: sp.yaw ?? rng.range(0, Math.PI * 2), targetYaw: 0,
      tie: !!sp.tie, pen: sp.pen || null, state: 'idle', timer: rng.range(2, 10), target: null, walkTime: 0, grazeT: 0, graze: false,
      soundTimer: rng.range(spec.soundGap[0], spec.soundGap[1]), lightTimer: 0, name: sp.type === 'horse' ? 'Horse' : sp.type === 'cow' ? 'Cow' : sp.type === 'pig' ? 'Pig' : 'Chicken',
    };
    a.targetYaw = a.yaw;
    this.list.push(a);
    this.group.add(a.root);
    this.placeOnGround(a, true);
    a.prevPos.copy(a.pos);
  }

  placeOnGround(a, initial = false) {
    const w = this.world;
    for (let y = 70; y >= 40; y--) {
      const h = standHeight(w, Math.floor(a.pos.x), y, Math.floor(a.pos.z));
      if (h !== null) { a.pos.y = h; return true; }
    }
    if (initial) a.pos.y = 58;
    return false;
  }

  tick(player, sky) {
    const pp = player.pos;
    for (const a of this.list) {
      a.prevPos.copy(a.pos);
      const dx = a.pos.x - pp.x, dz = a.pos.z - pp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 90 * 90) continue;
      const dt = 0.05;
      a.soundTimer -= dt;
      if (a.soundTimer <= 0) { a.soundTimer = a.rng.range(a.spec.soundGap[0], a.spec.soundGap[1]); if (d2 < 40 * 40) this.audio[a.spec.sound](a.pos); }
      // gravity when the ground under the animal is removed
      if (d2 < 48 * 48 && this.world.isLoaded(Math.floor(a.pos.x), Math.floor(a.pos.z))) {
        const fx = Math.floor(a.pos.x), fz = Math.floor(a.pos.z), fy = Math.floor(a.pos.y + 0.01);
        const below = this.world.getBlockDef(fx, fy - 1, fz), here = this.world.getBlockDef(fx, fy, fz);
        if (!below.solid && !here.solid) {
          for (let y = fy - 1; y >= fy - 12 && y > 0; y--) { const h = standHeight(this.world, fx, y, fz); if (h !== null) { a.pos.y = Math.max(h, a.pos.y - 0.6); break; } }
        }
      }
      if (a.tie) {
        a.timer -= dt;
        if (a.timer <= 0) { a.timer = a.rng.range(4, 12); a.graze = !a.graze; if (a.rng.chance(0.3)) a.targetYaw = a.yaw + a.rng.range(-0.4, 0.4); }
        continue;
      }
      if (a.state === 'idle') {
        a.timer -= dt;
        if (a.timer <= 0) {
          if (a.rng.chance(0.35) && a.pen) {
            const tx = a.rng.range(a.pen.x0 + 0.6, a.pen.x1 + 0.4), tz = a.rng.range(a.pen.z0 + 0.6, a.pen.z1 + 0.4);
            a.target = { x: tx, z: tz }; a.state = 'walk'; a.graze = false;
          } else { a.timer = a.rng.range(3, 12); a.graze = a.rng.chance(0.5); }
        }
      } else if (a.state === 'walk') {
        const tdx = a.target.x - a.pos.x, tdz = a.target.z - a.pos.z;
        const dist = Math.hypot(tdx, tdz);
        const step = a.spec.speed * dt;
        if (dist < 0.3) { a.state = 'idle'; a.timer = a.rng.range(3, 12); continue; }
        const nx = a.pos.x + (tdx / dist) * step, nz = a.pos.z + (tdz / dist) * step;
        const cell = standHeight(this.world, Math.floor(nx), Math.floor(a.pos.y + 0.01), Math.floor(nz));
        let h = cell;
        if (h === null) { const up = standHeight(this.world, Math.floor(nx), Math.floor(a.pos.y + 0.01) + 1, Math.floor(nz)); const down = standHeight(this.world, Math.floor(nx), Math.floor(a.pos.y + 0.01) - 1, Math.floor(nz)); h = up !== null && up - a.pos.y <= 1.05 ? up : down; }
        if (h === null || Math.abs(h - a.pos.y) > 1.05 || (a.pen && (nx < a.pen.x0 + 0.5 || nx > a.pen.x1 + 0.5 || nz < a.pen.z0 + 0.5 || nz > a.pen.z1 + 0.5))) { a.state = 'idle'; a.timer = a.rng.range(1, 4); continue; }
        a.pos.x = nx; a.pos.z = nz; a.pos.y += (h - a.pos.y) * 0.5;
        a.targetYaw = Math.atan2(tdx, tdz);
        a.walkTime += step;
      }
    }
  }

  render(alpha, dt, camera) {
    const cp = camera.position;
    const now = performance.now() * 0.001;
    for (const a of this.list) {
      const px = a.prevPos.x + (a.pos.x - a.prevPos.x) * alpha, py = a.prevPos.y + (a.pos.y - a.prevPos.y) * alpha, pz = a.prevPos.z + (a.pos.z - a.prevPos.z) * alpha;
      const dx = px - cp.x, dz = pz - cp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 100 * 100) { a.root.visible = false; continue; }
      a.root.visible = true;
      a.root.position.set(px, py, pz);
      let dy = a.targetYaw - a.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      a.yaw += dy * Math.min(1, dt * 6);
      a.root.rotation.y = a.yaw;
      if (d2 > 60 * 60) continue;
      const P = a.model.parts;
      if (a.state === 'walk') {
        const s = Math.sin(a.walkTime * 4) * 0.6;
        if (P.legFL) { P.legFL.rotation.x = s; P.legBR.rotation.x = s; P.legFR.rotation.x = -s; P.legBL.rotation.x = -s; }
        if (P.legL) { P.legL.rotation.x = s; P.legR.rotation.x = -s; }
      } else {
        for (const k of ['legFL', 'legFR', 'legBL', 'legBR', 'legL', 'legR']) if (P[k]) P[k].rotation.x *= 0.8;
      }
      // grazing / pecking head motion
      const grazeTarget = a.graze ? 1 : 0;
      a.grazeT += (grazeTarget - a.grazeT) * Math.min(1, dt * 2);
      if (a.type === 'horse') { P.neck.rotation.x = -0.55 + a.grazeT * 0.9 + Math.sin(now * 1.3 + a.pos.x) * 0.03; P.head.position.y = (35 - a.grazeT * 14) * PX; P.head.position.z = (14 + a.grazeT * 2) * PX; P.tail.rotation.z = Math.sin(now * 2.2 + a.pos.z) * 0.25; }
      else if (a.type === 'cow') { P.head.rotation.x = a.grazeT * 0.8; P.head.position.y = (20 - a.grazeT * 6) * PX; }
      else if (a.type === 'pig') { P.head.rotation.x = a.grazeT * 0.5; }
      else if (a.type === 'chicken') { P.head.rotation.x = a.graze ? Math.max(0, Math.sin(now * 8 + a.pos.x * 3)) * 0.9 : 0; P.wingL.rotation.z = P.wingR.rotation.z = 0; }
      if (++a.lightTimer >= 8) { a.lightTimer = 0; const l = this.world.sampleLight(a.pos.x, a.pos.y + 0.8, a.pos.z); a.model.material.uniforms.uLight.value.set(l[0], l[1]); }
    }
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const a of this.list) {
      const hw = a.spec.width / 2;
      const b = new AABB(a.pos.x - hw, a.pos.y, a.pos.z - hw, a.pos.x + hw, a.pos.y + a.spec.height, a.pos.z + hw);
      const t = rayAABB(origin, dir, b);
      if (t !== null && t < maxDist && (!best || t < best.dist)) best = { animal: a, name: a.name, dist: t };
    }
    return best;
  }

  collectBoxes(out, x, z) {
    for (const a of this.list) if (Math.abs(a.pos.x - x) < 3 && Math.abs(a.pos.z - z) < 3) { const hw = a.spec.width / 2; out.push(new AABB(a.pos.x - hw, a.pos.y, a.pos.z - hw, a.pos.x + hw, a.pos.y + a.spec.height, a.pos.z + hw)); }
  }
}

function rayAABB(o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  const axes = [[o.x, d.x, b.x0, b.x1], [o.y, d.y, b.y0, b.y1], [o.z, d.z, b.z0, b.z1]];
  for (const [oo, dd, lo, hi] of axes) {
    if (Math.abs(dd) < 1e-9) { if (oo < lo || oo > hi) return null; continue; }
    let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return Math.max(tmin, 0);
}
