// Minecraft-style farm animals: horses, cattle, pigs, chickens with pen-bound wandering.
import * as THREE from 'three';
import { buildBoxModel, PX } from '../npc/model.js';
import { standHeight } from '../npc/pathfinding.js';
import { RNG } from '../rng.js';
import { AABB } from '../player.js';
import { BLOCKS, B } from '../blocks.js';

const BLOCKS_SOLID = (world, x, y, z) => BLOCKS[world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))].solid;

// 64x32 texture. Left half: four noisy solid 16x16 regions - coat (0,0), dark (16,0), accent (0,16), light (16,16).
// Right half (x >= 32): the species' head atlas with one region per head face (classic box layout, every face
// drawn as seen from outside) so eyes, lashes and nostrils can be painted at exact pixel positions.
const TEX_W = 64, TEX_H = 32;
const HEAD_X = 32, HEAD_Y = 0;

function shade(hex, f) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}
function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Regions for a w(x) x h(y) x d(z) head box: top/bottom row above, right|front|left|back row below.
// Side faces: on the animal's left (+x) face the muzzle end is the region's left column, on the right (-x) face
// it is the right column (applyUV maps every face as viewed from outside the box).
function headRegions(w, h, d, x0 = HEAD_X, y0 = HEAD_Y) {
  return {
    top: [x0 + d, y0, w, d], bottom: [x0 + d + w, y0, w, d],
    right: [x0, y0 + d, d, h], front: [x0 + d, y0 + d, w, h], left: [x0 + d + w, y0 + d, d, h], back: [x0 + 2 * d + w, y0 + d, w, h],
  };
}
const HEAD_UV = { horse: headRegions(6, 5, 9), cow: headRegions(8, 8, 6), pig: headRegions(8, 8, 8), chicken: headRegions(4, 6, 3) };

// Paints the head faces: every face starts as a crop of the noisy coat (so it matches the body and costs no RNG
// draws), then species-specific eyes are placed at real-animal proportions.
function paintHead(ctx, canvas, type, coat, dark) {
  const uv = HEAD_UV[type];
  if (!uv) return;
  ['top', 'bottom', 'right', 'front', 'left', 'back'].forEach((f, i) => {
    const r = uv[f];
    ctx.drawImage(canvas, (i * 3) % 8, (i * 5) % 8, r[2], r[3], r[0], r[1], r[2], r[3]);
  });
  const px = (r, x, y, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(r[0] + x, r[1] + y, w, h); };
  switch (type) {
    case 'horse': {
      // side faces (9x5, muzzle toward the region's outer column): 3x2 dark eye high on the rear half of the skull,
      // a glossy highlight on the front-top pixel and a thin lash line above. On black / seal-brown coats a
      // near-black eye would vanish, so the eye gets a soft dark grey, a bright glint and a lash line LIGHTER
      // than the coat. Two small nostrils sit together on the bottom row of the muzzle.
      const darkCoat = luminance(coat) < 0.18;
      const EYE = darkCoat ? '#2c2622' : '#14100c', HI = darkCoat ? '#d8d0c8' : '#8a7a70';
      const LASH = darkCoat ? shade(coat, 1.8) : shade(coat, 0.5), NOSTRIL = shade(coat, 0.8);
      px(uv.left, 4, 1, EYE, 3, 2); px(uv.left, 4, 1, HI); px(uv.left, 4, 0, LASH, 3, 1);
      px(uv.right, 2, 1, EYE, 3, 2); px(uv.right, 4, 1, HI); px(uv.right, 2, 0, LASH, 3, 1);
      px(uv.front, 2, 4, NOSTRIL, 2, 1);
      break;
    }
    case 'cow': {
      // 2x2 eyes in the upper front corners (above the snout part) with a white highlight, wrapping two pixels
      // onto each side face so cows are not eyeless from the side.
      const EYE = '#1a1410', HI = '#e8e8e8';
      px(uv.front, 0, 2, EYE, 2, 2); px(uv.front, 1, 2, HI);
      px(uv.front, 6, 2, EYE, 2, 2); px(uv.front, 6, 2, HI);
      px(uv.left, 0, 2, EYE, 2, 2); px(uv.right, 4, 2, EYE, 2, 2);
      break;
    }
    case 'pig': {
      // two well separated 2x2 eyes high on the face (the snout part covers rows 3.5-6.5), highlight on the inner top pixel
      const EYE = '#1c1418', HI = '#e6d6d6';
      px(uv.front, 1, 1, EYE, 2, 2); px(uv.front, 2, 1, HI);
      px(uv.front, 5, 1, EYE, 2, 2); px(uv.front, 5, 1, HI);
      break;
    }
    case 'chicken': {
      // one small dark eye on each side of the head (3x6 faces), just behind the beak, none on the front
      const EYE = '#14100c';
      px(uv.left, 1, 1, EYE); px(uv.right, 1, 1, EYE);
      break;
    }
    default: break;
  }
}

function animalTexture(type, coat, dark, accent, light, rng, patches = 0) {
  const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const fillNoisy = (x0, y0, col) => {
    ctx.fillStyle = col; ctx.fillRect(x0, y0, 16, 16);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(0,0,0,${0.06 + rng.next() * 0.08})`; ctx.fillRect(x0 + rng.int(0, 15), y0 + rng.int(0, 15), 1, 1); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,255,255,${0.05 + rng.next() * 0.08})`; ctx.fillRect(x0 + rng.int(0, 15), y0 + rng.int(0, 15), 1, 1); }
  };
  fillNoisy(0, 0, coat); fillNoisy(16, 0, dark); fillNoisy(0, 16, accent); fillNoisy(16, 16, light);
  paintHead(ctx, c, type, coat, dark); // before the patches: heads stay solid-coloured so the eyes read clearly
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
    { name: 'head', w: 6, h: 5, d: 9, x: 0, y: 35, z: 14, uv: HEAD_UV.horse },
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
    { name: 'head', w: 8, h: 8, d: 6, x: 0, y: 20, z: 11, uv: HEAD_UV.cow },
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
    { name: 'head', w: 8, h: 8, d: 8, x: 0, y: 10, z: 10, uv: HEAD_UV.pig },
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
    { name: 'head', w: 4, h: 6, d: 3, x: 0, y: 13, z: 3, pivot: [0, -2, 0], uv: HEAD_UV.chicken },
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
    if (sp.type === 'horse') { const [c, d] = rng.pick(HORSE_COATS); tex = animalTexture('horse', c, d, '#5a3a22', '#f0f0f0', rng, rng.chance(0.3) ? 3 : 0); }
    else if (sp.type === 'cow') tex = animalTexture('cow', rng.chance(0.7) ? '#4a3626' : '#8a5a32', '#2b1a0e', '#e8b0a0', '#e8e0d0', rng, 5);
    else if (sp.type === 'pig') tex = animalTexture('pig', '#f0a0a0', '#d08080', '#e07070', '#f0b0b0', rng, 0);
    else tex = animalTexture('chicken', '#f0f0f0', '#e0e0e0', '#d02020', '#e0a020', rng, 0);
    const model = buildBoxModel(spec.parts(), tex);
    model.root.scale.setScalar(spec.scale);
    const st = this.world.gen ? null : null;
    void st;
    const a = {
      type: sp.type, spec, model, root: model.root, rng,
      pos: new THREE.Vector3(sp.x, 0, sp.z), prevPos: new THREE.Vector3(), yaw: sp.yaw ?? rng.range(0, Math.PI * 2), targetYaw: 0,
      tie: !!sp.tie, pen: sp.pen || null, state: 'idle', timer: rng.range(2, 10), target: null, walkTime: 0, grazeT: 0, graze: false,
      soundTimer: rng.range(spec.soundGap[0], spec.soundGap[1]), lightTimer: 0, name: sp.type === 'horse' ? 'Horse' : sp.type === 'cow' ? 'Cow' : sp.type === 'pig' ? 'Pig' : 'Chicken',
      panic: false, panicUntil: 0, air: null, stunned: 0, swimming: false, airSpin: 0,
    };
    a.targetYaw = a.yaw;
    this.list.push(a);
    this.group.add(a.root);
    this.placeOnGround(a, true);
    a.prevPos.copy(a.pos);
  }

  placeOnGround(a, initial = false) {
    // search outward from ground level so stalls/pens are preferred over roofs and awnings above them
    const w = this.world, x = Math.floor(a.pos.x), z = Math.floor(a.pos.z);
    for (let d = 0; d <= 16; d++) {
      for (const y of d === 0 ? [57] : [57 + d, 57 - d]) {
        if (y < 1 || y > 100) continue;
        const h = standHeight(w, x, y, z);
        if (h !== null) { a.pos.y = h; return true; }
      }
    }
    if (initial) a.pos.y = 58;
    return false;
  }

  // ---------------------------------------------------------------- disaster reactions (public API)
  alert(info) {
    this.alertInfo = info;
    const r2 = (info.radius || 80) ** 2;
    for (const a of this.list) {
      const dx = a.pos.x - info.x, dz = a.pos.z - info.z;
      if (dx * dx + dz * dz > r2) continue;
      a.panic = true; a.panicUntil = performance.now() + 120000;
      a.tie = a.tie && info.kind !== 'tornado'; // tornado rips tethers loose
      a.timer = a.rng.range(0, 0.5);
      if (a.soundTimer > 4) a.soundTimer = a.rng.range(0.5, 4);
    }
  }
  clearAlert() { this.alertInfo = null; for (const a of this.list) { a.panic = false; a.air = null; a.stunned = 0; } }
  applyImpulse(a, vx, vy, vz) {
    if (!a.air) a.air = { vx: 0, vy: 0, vz: 0, spin: a.rng.range(-5, 5) };
    a.air.vx += vx; a.air.vy += vy; a.air.vz += vz;
    const sp = Math.hypot(a.air.vx, a.air.vy, a.air.vz);
    if (sp > 26) { const k = 26 / sp; a.air.vx *= k; a.air.vy *= k; a.air.vz *= k; }
    a.state = 'idle'; a.tie = false;
  }
  eachNear(x, z, r, fn) { const r2 = r * r; for (const a of this.list) { const dx = a.pos.x - x, dz = a.pos.z - z; if (dx * dx + dz * dz <= r2) fn(a, Math.sqrt(dx * dx + dz * dz)); } }

  updateAirborne(a, dt) {
    const air = a.air;
    air.vy -= 22 * dt;
    const w = this.world;
    const solidAt = (x, y, z) => BLOCKS_SOLID(w, x, y, z);
    const nx = a.pos.x + air.vx * dt, ny = a.pos.y + air.vy * dt, nz = a.pos.z + air.vz * dt;
    if (!solidAt(nx, a.pos.y + 0.5, a.pos.z)) a.pos.x = nx; else air.vx *= -0.3;
    if (!solidAt(a.pos.x, a.pos.y + 0.5, nz)) a.pos.z = nz; else air.vz *= -0.3;
    if (air.vy < 0 && (solidAt(a.pos.x, ny, a.pos.z) || ny < 1)) {
      const h = standHeight(w, Math.floor(a.pos.x), Math.floor(a.pos.y + 0.01), Math.floor(a.pos.z));
      a.pos.y = h !== null ? h : Math.ceil(ny);
      a.air = null; a.airSpin = 0; a.stunned = 2 + a.rng.range(0, 2);
      if (a.spec.sound) this.audio[a.spec.sound](a.pos);
      return;
    }
    a.pos.y = ny;
    a.airSpin = (a.airSpin || 0) + air.spin * dt;
    air.vx *= 1 - 0.4 * dt; air.vz *= 1 - 0.4 * dt;
  }

  tick(player, sky) {
    const pp = player.pos;
    for (const a of this.list) {
      a.prevPos.copy(a.pos);
      const dx = a.pos.x - pp.x, dz = a.pos.z - pp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 90 * 90 && !a.air) continue;
      const dt = 0.05;
      if (a.air) { this.updateAirborne(a, dt); continue; }
      if (a.stunned > 0) { a.stunned -= dt; continue; }
      if (a.panic && performance.now() > a.panicUntil) a.panic = false;
      // float in water
      const feet = this.world.getBlock(Math.floor(a.pos.x), Math.floor(a.pos.y + 0.2), Math.floor(a.pos.z));
      a.swimming = feet === B.WATER;
      if (a.swimming) {
        let top = Math.floor(a.pos.y + 0.2);
        while (this.world.getBlock(Math.floor(a.pos.x), top + 1, Math.floor(a.pos.z)) === B.WATER && top < a.pos.y + 6) top++;
        a.pos.y += (top + 0.9 - a.spec.height * 0.55 - a.pos.y) * Math.min(1, dt * 4);
        if (this.alertInfo && this.alertInfo.flowFn) { const f = this.alertInfo.flowFn(a.pos.x, a.pos.z); if (f && !BLOCKS_SOLID(this.world, a.pos.x + f[0] * dt, a.pos.y + 0.5, a.pos.z + f[1] * dt)) { a.pos.x += f[0] * dt; a.pos.z += f[1] * dt; } }
      }
      a.soundTimer -= dt * (a.panic ? 3 : 1);
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
          if (a.panic) {
            // bolt in a random direction (away from the threat when known), staying inside the pen if any
            const info = this.alertInfo;
            let ang = a.rng.range(0, Math.PI * 2);
            if (info) { const ax = a.pos.x - info.x, az = a.pos.z - info.z; const base = Math.atan2(ax, az); ang = base + a.rng.range(-0.9, 0.9); }
            const dist = a.rng.range(4, 10);
            let tx = a.pos.x + Math.sin(ang) * dist, tz = a.pos.z + Math.cos(ang) * dist;
            if (a.pen) { tx = Math.min(a.pen.x1 + 0.4, Math.max(a.pen.x0 + 0.6, tx)); tz = Math.min(a.pen.z1 + 0.4, Math.max(a.pen.z0 + 0.6, tz)); }
            a.target = { x: tx, z: tz }; a.state = 'walk'; a.graze = false;
          } else if (a.rng.chance(0.35) && a.pen) {
            const tx = a.rng.range(a.pen.x0 + 0.6, a.pen.x1 + 0.4), tz = a.rng.range(a.pen.z0 + 0.6, a.pen.z1 + 0.4);
            a.target = { x: tx, z: tz }; a.state = 'walk'; a.graze = false;
          } else { a.timer = a.rng.range(3, 12); a.graze = a.rng.chance(0.5); }
        }
      } else if (a.state === 'walk') {
        const tdx = a.target.x - a.pos.x, tdz = a.target.z - a.pos.z;
        const dist = Math.hypot(tdx, tdz);
        const step = a.spec.speed * (a.panic ? 2.2 : 1) * dt;
        if (dist < 0.3) { a.state = 'idle'; a.timer = a.rng.range(3, 12); continue; }
        const nx = a.pos.x + (tdx / dist) * step, nz = a.pos.z + (tdz / dist) * step;
        const cell = standHeight(this.world, Math.floor(nx), Math.floor(a.pos.y + 0.01), Math.floor(nz));
        let h = cell;
        if (h === null) { const up = standHeight(this.world, Math.floor(nx), Math.floor(a.pos.y + 0.01) + 1, Math.floor(nz)); const down = standHeight(this.world, Math.floor(nx), Math.floor(a.pos.y + 0.01) - 1, Math.floor(nz)); h = up !== null && up - a.pos.y <= 1.05 ? up : down; }
        if (h === null || Math.abs(h - a.pos.y) > 1.05 || (a.pen && (nx < a.pen.x0 + 0.5 || nx > a.pen.x1 + 0.5 || nz < a.pen.z0 + 0.5 || nz > a.pen.z1 + 0.5))) { a.state = 'idle'; a.timer = a.panic ? a.rng.range(0.1, 0.6) : a.rng.range(1, 4); continue; }
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
      if (a.air) { a.root.rotation.x = (a.airSpin || 0) * 0.8; a.root.rotation.z = (a.airSpin || 0) * 0.5; }
      else if (a.stunned > 0) { a.root.rotation.z += (1.3 - a.root.rotation.z) * Math.min(1, dt * 5); a.root.rotation.x *= 0.9; }
      else { a.root.rotation.x *= 0.85; a.root.rotation.z *= 0.85; }
      if (d2 > 60 * 60) continue;
      const P = a.model.parts;
      if (a.state === 'walk' || a.air) {
        const s = Math.sin(a.walkTime * 4 + (a.air ? performance.now() * 0.01 : 0)) * (a.panic || a.air ? 0.9 : 0.6);
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
