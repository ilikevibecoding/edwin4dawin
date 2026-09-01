import * as THREE from 'three';
import { MAP_SIZE, HALF, CELL, PROPS } from './config.js';
import { RNG, fbm, smoothstep, lerp, clamp, makeBox, unionBounds } from './utils.js';
import { createStructure } from './structures.js';
import { getTextures } from './textures.js';

export const WATER_Y = 1.0;
const LOT = 24; // 6 cells
const TOWN_R = 80;
const TOWN_NAMES = [
  'Pine Hollow', 'Dusty Flats', 'Copper Ridge', 'Willow Creek', 'Iron Yard',
  'Sunny Shores', 'Foggy Bend', 'Old Mill', 'Grand Junction', 'Cinder Hill',
];

export class Terrain {
  constructor(towns) {
    this.towns = towns;
  }

  baseHeight(x, z) {
    let h = 7.5;
    h += 4.0 * Math.sin(x * 0.0115 + 0.7) * Math.cos(z * 0.0095 - 0.4);
    h += 2.6 * Math.sin((x * 0.6 + z) * 0.016 + 2.1);
    h += 5.0 * (fbm(x * 0.017 + 50, z * 0.017 + 50, 3) - 0.5);
    h += 1.4 * (fbm(x * 0.07 + 9, z * 0.07 + 3, 2) - 0.5);
    const cheb = Math.max(Math.abs(x), Math.abs(z));
    const r = Math.sqrt(x * x + z * z) * 0.55 + cheb * 0.45;
    h -= 24 * smoothstep(HALF - 130, HALF - 10, r);
    return h;
  }

  heightAt(x, z) {
    let h = this.baseHeight(x, z);
    const towns = this.towns;
    for (let n = 0; n < towns.length; n++) {
      const t = towns[n];
      const dx = x - t.x;
      const dz = z - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < t.r * t.r) {
        const d = Math.sqrt(d2);
        h = lerp(h, t.h, smoothstep(t.r, t.r * 0.6, d));
      }
    }
    return h;
  }
}

function placeTowns(rng) {
  const towns = [];
  const base = new Terrain([]);
  let attempts = 0;
  const names = TOWN_NAMES.slice();
  while (towns.length < 7 && attempts++ < 800) {
    const x = Math.round(rng.range(-215, 215) / CELL) * CELL;
    const z = Math.round(rng.range(-215, 215) / CELL) * CELL;
    if (towns.some((t) => Math.hypot(t.x - x, t.z - z) < 165)) continue;
    const b = base.baseHeight(x, z);
    const level = Math.max(1, Math.round(b / CELL));
    const idx = Math.floor(rng.next() * names.length);
    const name = names.splice(idx, 1)[0];
    towns.push({ x, z, r: TOWN_R, level, h: level * CELL - 0.3, name, industrial: towns.length === 2 });
  }
  return towns;
}

function isRoad(t, x, z) {
  const rx = ((x - t.x + 12) % LOT + LOT * 10) % LOT;
  const rz = ((z - t.z + 12) % LOT + LOT * 10) % LOT;
  const inX = rx < 2.3 || rx > LOT - 2.3;
  const inZ = rz < 2.3 || rz > LOT - 2.3;
  return Math.abs(x - t.x) < 62 && Math.abs(z - t.z) < 62 && (inX || inZ);
}

function terrainColor(terrain, x, z, h, out) {
  if (h < WATER_Y + 1.6) {
    out.setRGB(0.86, 0.79, 0.55); // sand
    return;
  }
  let town = null;
  for (const t of terrain.towns) {
    if (Math.hypot(x - t.x, z - t.z) < t.r * 0.72) town = t;
  }
  if (town && isRoad(town, x, z)) {
    out.setRGB(0.24, 0.24, 0.26);
    return;
  }
  const n = fbm(x * 0.05 + 3, z * 0.05 + 7, 2);
  if (town) {
    out.setRGB(0.42 + n * 0.1, 0.5 + n * 0.08, 0.25);
    return;
  }
  const hi = clamp((h - 6) / 12, 0, 1);
  const r = lerp(0.24, 0.5, hi) + n * 0.12;
  const g = lerp(0.55, 0.52, hi) + n * 0.12;
  const b = lerp(0.18, 0.22, hi) + n * 0.05;
  out.setRGB(r, g, b);
}

function buildTerrainMesh(terrain) {
  const segs = MAP_SIZE / CELL;
  const n = segs + 1;
  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const c = new THREE.Color();
  let p = 0;
  let u = 0;
  for (let jz = 0; jz < n; jz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = -HALF + ix * CELL;
      const z = -HALF + jz * CELL;
      const h = terrain.heightAt(x, z);
      positions[p] = x;
      positions[p + 1] = h;
      positions[p + 2] = z;
      terrainColor(terrain, x, z, h, c);
      colors[p] = c.r;
      colors[p + 1] = c.g;
      colors[p + 2] = c.b;
      p += 3;
      uvs[u] = (x + HALF) / 8;
      uvs[u + 1] = (z + HALF) / 8;
      u += 2;
    }
  }
  const indices = new Uint32Array(segs * segs * 6);
  let q = 0;
  for (let jz = 0; jz < segs; jz++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = jz * n + ix;
      const b = a + 1;
      const cIdx = a + n;
      const d = cIdx + 1;
      indices[q++] = a;
      indices[q++] = cIdx;
      indices[q++] = b;
      indices[q++] = b;
      indices[q++] = cIdx;
      indices[q++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: getTextures().grass, vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

function buildWater() {
  const geo = new THREE.PlaneGeometry(MAP_SIZE + 1200, MAP_SIZE + 1200);
  const mat = new THREE.MeshLambertMaterial({ color: 0x2a78b8, transparent: true, opacity: 0.86 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = WATER_Y;
  mesh.name = 'water';
  return mesh;
}

// ---------- Buildings ----------

function buildHouse(rng, i0, j0, w, d, floors, k0, material, out, opts = {}) {
  const cells = [];
  for (let i = i0; i < i0 + w; i++) for (let j = j0; j < j0 + d; j++) cells.push([i, j]);

  let ramp = null;
  if (floors > 1 && !opts.hollow) {
    const options = [];
    for (const [i, j] of cells) {
      for (let dir = 0; dir < 4; dir++) {
        const ni = i + (dir === 0 ? 1 : dir === 2 ? -1 : 0);
        const nj = j + (dir === 1 ? 1 : dir === 3 ? -1 : 0);
        if (ni >= i0 && ni < i0 + w && nj >= j0 && nj < j0 + d) options.push({ i, j, dir });
      }
    }
    ramp = rng.pick(options);
  }

  const perimeter = [];
  for (let j = j0; j < j0 + d; j++) {
    perimeter.push({ i: i0, j, orient: 0 });
    perimeter.push({ i: i0 + w, j, orient: 0 });
  }
  for (let i = i0; i < i0 + w; i++) {
    perimeter.push({ i, j: j0, orient: 1 });
    perimeter.push({ i, j: j0 + d, orient: 1 });
  }
  const doors = new Set();
  const doorCount = opts.hollow ? 3 : 1 + (rng.chance(0.55) ? 1 : 0);
  while (doors.size < doorCount) doors.add(rng.int(0, perimeter.length - 1));

  for (let f = 0; f < floors; f++) {
    const k = k0 + f;
    if (f === 0 || !opts.hollow) {
      for (const [i, j] of cells) {
        if (f > 0 && ramp && i === ramp.i && j === ramp.j) continue;
        out.push(createStructure('floor', i, k, j, 0, material));
      }
    }
    if (ramp && f < floors - 1) out.push(createStructure('ramp', ramp.i, k, ramp.j, ramp.dir, material));
    perimeter.forEach((pw, idx) => {
      let variant = 'solid';
      if (f === 0 && doors.has(idx)) variant = 'door';
      else if (opts.hollow) variant = f > 0 && rng.chance(0.35) ? 'window' : 'solid';
      else if (rng.chance(f === 0 ? 0.4 : 0.6)) variant = 'window';
      out.push(createStructure('wall', pw.i, k, pw.j, pw.orient, material, variant));
    });
  }
  for (const [i, j] of cells) out.push(createStructure('floor', i, k0 + floors, j, 0, material));

  return {
    minX: i0 * CELL, minZ: j0 * CELL, maxX: (i0 + w) * CELL, maxZ: (j0 + d) * CELL,
    i0, j0, w, d, k0, floors, cells, ramp, material, hollow: !!opts.hollow,
  };
}

// ---------- Props ----------

const propGeo = {
  trunk: new THREE.CylinderGeometry(0.22, 0.42, 3.4, 7),
  cone: new THREE.ConeGeometry(1.6, 3.2, 8),
  blob: new THREE.IcosahedronGeometry(1.7, 1),
  rock: new THREE.DodecahedronGeometry(1, 0),
  carBody: new THREE.BoxGeometry(2.0, 0.8, 4.4),
  carCabin: new THREE.BoxGeometry(1.8, 0.7, 2.1),
  wheel: new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10),
  chest: new THREE.BoxGeometry(1.2, 0.6, 0.8),
  chestLid: new THREE.BoxGeometry(1.24, 0.3, 0.84),
  ammoBox: new THREE.BoxGeometry(0.8, 0.55, 0.6),
};
const propMat = {
  trunk: new THREE.MeshLambertMaterial({ color: 0x6b4a2b }),
  pine: [0x1f6b3a, 0x24804a, 0x2f8f4e].map((c) => new THREE.MeshLambertMaterial({ color: c })),
  leafy: [0x4f9a3a, 0x63a844, 0x8ab84a].map((c) => new THREE.MeshLambertMaterial({ color: c })),
  rock: [0x7a7f86, 0x8a8f96, 0x6a6e74].map((c) => new THREE.MeshLambertMaterial({ color: c })),
  car: [0xd94a3d, 0x3a7bd5, 0xf0c23b, 0xf2f2f2, 0x333a44, 0x4fae62].map((c) => new THREE.MeshLambertMaterial({ color: c })),
  glass: new THREE.MeshLambertMaterial({ color: 0x9fd3ff }),
  wheel: new THREE.MeshLambertMaterial({ color: 0x222222 }),
  chest: new THREE.MeshLambertMaterial({ color: 0xc9902a }),
  chestTrim: new THREE.MeshLambertMaterial({ color: 0xffd76a, emissive: 0x5a3d00 }),
  ammo: new THREE.MeshLambertMaterial({ color: 0x3f8f3f }),
  ammoTrim: new THREE.MeshLambertMaterial({ color: 0xb9e66b }),
};

function createTree(rng, x, y, z) {
  const group = new THREE.Group();
  const scale = rng.range(0.85, 1.45);
  const trunk = new THREE.Mesh(propGeo.trunk, propMat.trunk);
  trunk.position.y = 1.7 * scale;
  trunk.scale.setScalar(scale);
  trunk.castShadow = true;
  group.add(trunk);
  const pine = rng.chance(0.55);
  if (pine) {
    const mat = rng.pick(propMat.pine);
    for (let l = 0; l < 3; l++) {
      const cone = new THREE.Mesh(propGeo.cone, mat);
      const s = (1.15 - l * 0.28) * scale;
      cone.scale.set(s, s * 0.9, s);
      cone.position.y = (3.2 + l * 1.6) * scale;
      cone.castShadow = true;
      group.add(cone);
    }
  } else {
    const blob = new THREE.Mesh(propGeo.blob, rng.pick(propMat.leafy));
    blob.position.y = 4.4 * scale;
    blob.scale.set(scale * 1.1, scale * 0.95, scale * 1.1);
    blob.castShadow = true;
    group.add(blob);
  }
  group.position.set(x, y - 0.2, z);
  group.rotation.y = rng.range(0, Math.PI * 2);
  const r = 0.45 * scale;
  const box = makeBox(x - r, y - 0.2, z - r, x + r, y + 3.4 * scale, z + r);
  return {
    kind: 'prop', prop: 'tree', material: PROPS.tree.material, hp: PROPS.tree.hp, maxHp: PROPS.tree.hp,
    yieldPerHit: PROPS.tree.yieldPerHit,
    boxes: [box], ramp: null, bounds: box, mesh: group, hitMeshes: [trunk], blocksShots: true,
    centerX: x, centerZ: z,
  };
}

function createRock(rng, x, y, z) {
  const mesh = new THREE.Mesh(propGeo.rock, rng.pick(propMat.rock));
  const sx = rng.range(1.0, 2.2);
  const sy = rng.range(0.7, 1.5);
  const sz = rng.range(1.0, 2.2);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.set(rng.range(0, 0.4), rng.range(0, Math.PI * 2), rng.range(0, 0.4));
  mesh.position.set(x, y + sy * 0.35, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const rx = sx * 0.8;
  const rz = sz * 0.8;
  const box = makeBox(x - rx, y - 0.5, z - rz, x + rx, y + sy * 1.1, z + rz);
  return {
    kind: 'prop', prop: 'rock', material: PROPS.rock.material, hp: PROPS.rock.hp, maxHp: PROPS.rock.hp,
    yieldPerHit: PROPS.rock.yieldPerHit,
    boxes: [box], ramp: null, bounds: box, mesh, hitMeshes: [mesh], blocksShots: true,
    centerX: x, centerZ: z,
  };
}

function createCar(rng, x, y, z, alongZ) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(propGeo.carBody, rng.pick(propMat.car));
  body.position.y = 0.75;
  const cabin = new THREE.Mesh(propGeo.carCabin, propMat.glass);
  cabin.position.set(0, 1.45, -0.2);
  body.castShadow = true;
  cabin.castShadow = true;
  group.add(body, cabin);
  for (const [wx, wz] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const wheel = new THREE.Mesh(propGeo.wheel, propMat.wheel);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
  }
  group.position.set(x, y, z);
  if (!alongZ) group.rotation.y = Math.PI / 2;
  const hx = alongZ ? 1.0 : 2.2;
  const hz = alongZ ? 2.2 : 1.0;
  const box = makeBox(x - hx, y, z - hz, x + hx, y + 1.55, z + hz);
  return {
    kind: 'prop', prop: 'car', material: PROPS.car.material, hp: PROPS.car.hp, maxHp: PROPS.car.hp,
    yieldPerHit: PROPS.car.yieldPerHit,
    boxes: [box], ramp: null, bounds: box, mesh: group, hitMeshes: [body, cabin], blocksShots: true,
    centerX: x, centerZ: z,
  };
}

export function createChest(x, y, z, yaw) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(propGeo.chest, propMat.chest);
  base.position.y = 0.3;
  const lid = new THREE.Mesh(propGeo.chestLid, propMat.chestTrim);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.6, -0.4);
  lid.position.set(0, 0.15, 0.4);
  lidPivot.add(lid);
  base.castShadow = true;
  lid.castShadow = true;
  group.add(base, lidPivot);
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  const r = 0.75;
  const box = makeBox(x - r, y, z - r, x + r, y + 0.9, z + r);
  return {
    kind: 'chest', hp: Infinity, maxHp: Infinity, boxes: [box], ramp: null, bounds: box,
    mesh: group, hitMeshes: [base, lid], blocksShots: true, lidPivot, opened: false,
    centerX: x, centerZ: z, interactY: y + 0.5,
  };
}

export function createAmmoBox(x, y, z, yaw) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(propGeo.ammoBox, propMat.ammo);
  base.position.y = 0.275;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.62), propMat.ammoTrim);
  stripe.position.y = 0.42;
  base.castShadow = true;
  group.add(base, stripe);
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  const r = 0.5;
  const box = makeBox(x - r, y, z - r, x + r, y + 0.55, z + r);
  return {
    kind: 'ammobox', hp: Infinity, maxHp: Infinity, boxes: [box], ramp: null, bounds: box,
    mesh: group, hitMeshes: [base], blocksShots: true, opened: false,
    centerX: x, centerZ: z, interactY: y + 0.3,
  };
}

// ---------- Generation ----------

export function generateWorld(seed) {
  const rng = new RNG(seed);
  const towns = placeTowns(rng);
  const terrain = new Terrain(towns);
  const structures = [];
  const houses = [];
  const props = [];
  const containers = [];
  const floorLoot = [];

  // towns: houses on a lot grid
  for (const t of towns) {
    const lotBase = LOT / CELL;
    for (let li = -2; li <= 2; li++) {
      for (let lj = -2; lj <= 2; lj++) {
        const lotI = t.x / CELL + li * lotBase - 3;
        const lotJ = t.z / CELL + lj * lotBase - 3;
        const center = li === 0 && lj === 0;
        if (t.industrial && center) {
          const h = buildHouse(rng, lotI + 1, lotJ + 1, 4, 3, 2, t.level, 'metal', structures, { hollow: true });
          houses.push(h);
          continue;
        }
        if (!rng.chance(center ? 0.3 : 0.62)) continue;
        const w = rng.int(2, 3);
        const d = rng.int(2, 3);
        const floors = rng.chance(0.62) ? 2 : 1;
        const material = t.industrial ? rng.pick(['metal', 'brick', 'brick']) : rng.pick(['wood', 'wood', 'brick']);
        const oi = rng.int(1, 5 - w);
        const oj = rng.int(1, 5 - d);
        houses.push(buildHouse(rng, lotI + oi, lotJ + oj, w, d, floors, t.level, material, structures));
      }
    }
  }

  const inHouse = (x, z, pad = 1) =>
    houses.some((h) => x > h.minX - pad && x < h.maxX + pad && z > h.minZ - pad && z < h.maxZ + pad);
  const inTown = (x, z, scale = 1) => towns.some((t) => Math.hypot(x - t.x, z - t.z) < t.r * scale);
  const onLand = (x, z) => terrain.heightAt(x, z) > WATER_Y + 1.4;

  // trees
  let placed = 0;
  for (let a = 0; a < 6000 && placed < 520; a++) {
    const x = rng.range(-335, 335);
    const z = rng.range(-335, 335);
    if (!onLand(x, z) || inTown(x, z, 0.95)) continue;
    const density = fbm(x * 0.012 + 200, z * 0.012 + 40, 2);
    if (rng.next() > density * 1.6 - 0.25) continue;
    props.push(createTree(rng, x, terrain.heightAt(x, z), z));
    placed++;
  }
  // rocks
  placed = 0;
  for (let a = 0; a < 3000 && placed < 150; a++) {
    const x = rng.range(-345, 345);
    const z = rng.range(-345, 345);
    if (terrain.heightAt(x, z) < WATER_Y + 0.3 || inTown(x, z, 0.95)) continue;
    props.push(createRock(rng, x, terrain.heightAt(x, z), z));
    placed++;
  }
  // cars along town roads
  for (const t of towns) {
    const n = rng.int(4, 7);
    for (let c = 0; c < n; c++) {
      const alongZ = rng.chance(0.5);
      const line = rng.int(-2, 3) * LOT - 12;
      const along = rng.range(-56, 56);
      const x = alongZ ? t.x + line : t.x + along;
      const z = alongZ ? t.z + along : t.z + line;
      if (inHouse(x, z, 2.5)) continue;
      props.push(createCar(rng, x, terrain.heightAt(x, z), z, alongZ));
    }
  }

  // chests & ammo boxes & floor loot inside houses
  for (const h of houses) {
    const usableCells = h.cells.filter(([i, j]) => !(h.ramp && i === h.ramp.i && j === h.ramp.j));
    const chestCount = h.hollow ? 3 : rng.chance(0.75) ? 1 : 2;
    for (let c = 0; c < chestCount; c++) {
      const [i, j] = rng.pick(usableCells);
      const floor = h.hollow ? 0 : rng.int(0, h.floors - 1);
      const y = (h.k0 + floor) * CELL + 0.2;
      const x = i * CELL + 2 + rng.pick([-1.1, 1.1]);
      const z = j * CELL + 2 + rng.pick([-1.1, 1.1]);
      containers.push({ type: 'chest', x, y, z, yaw: rng.pick([0, Math.PI / 2]) });
    }
    if (rng.chance(0.3)) {
      const [i, j] = rng.pick(h.cells);
      containers.push({ type: 'chest', x: i * CELL + 2, y: (h.k0 + h.floors) * CELL + 0.2, z: j * CELL + 2, yaw: 0 });
    }
    if (rng.chance(0.6)) {
      const [i, j] = rng.pick(usableCells);
      containers.push({ type: 'ammo', x: i * CELL + 2 + rng.range(-1.2, 1.2), y: h.k0 * CELL + 0.2, z: j * CELL + 2 + rng.range(-1.2, 1.2), yaw: rng.range(0, 3) });
    }
    const lootCount = rng.int(1, 2);
    for (let c = 0; c < lootCount; c++) {
      const [i, j] = rng.pick(usableCells);
      const floor = h.hollow ? 0 : rng.int(0, h.floors - 1);
      floorLoot.push({ x: i * CELL + 2 + rng.range(-1, 1), y: (h.k0 + floor) * CELL + 0.2, z: j * CELL + 2 + rng.range(-1, 1) });
    }
  }
  // wild chests & loot
  placed = 0;
  for (let a = 0; a < 2000 && placed < 22; a++) {
    const x = rng.range(-300, 300);
    const z = rng.range(-300, 300);
    if (!onLand(x, z) || inTown(x, z, 1.05)) continue;
    containers.push({ type: 'chest', x, y: terrain.heightAt(x, z), z, yaw: rng.range(0, 3) });
    placed++;
  }
  placed = 0;
  for (let a = 0; a < 2000 && placed < 55; a++) {
    const x = rng.range(-300, 300);
    const z = rng.range(-300, 300);
    if (!onLand(x, z) || inHouse(x, z, 1)) continue;
    floorLoot.push({ x, y: terrain.heightAt(x, z), z });
    placed++;
  }

  // bot spawns
  const botSpawns = [];
  for (let a = 0; a < 5000 && botSpawns.length < 60; a++) {
    let x;
    let z;
    if (rng.chance(0.45)) {
      const t = rng.pick(towns);
      x = t.x + rng.range(-75, 75);
      z = t.z + rng.range(-75, 75);
    } else {
      x = rng.range(-290, 290);
      z = rng.range(-290, 290);
    }
    if (!onLand(x, z) || inHouse(x, z, 2)) continue;
    if (props.some((p) => Math.hypot(p.centerX - x, p.centerZ - z) < 3)) continue;
    botSpawns.push({ x, z });
  }

  const terrainMesh = buildTerrainMesh(terrain);
  const waterMesh = buildWater();
  const mapImage = renderMapImage(terrain, houses, props, towns);

  return { seed, rng, terrain, towns, houses, structures, props, containers, floorLoot, botSpawns, terrainMesh, waterMesh, mapImage };
}

/** Offscreen top-down image of the island used by the minimap and the full map. */
function renderMapImage(terrain, houses, props, towns) {
  const size = 400;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const col = new THREE.Color();
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = -HALF + (px + 0.5) * (MAP_SIZE / size);
      const z = -HALF + (py + 0.5) * (MAP_SIZE / size);
      const h = terrain.heightAt(x, z);
      if (h < WATER_Y) {
        const deep = clamp((WATER_Y - h) / 10, 0, 1);
        col.setRGB(lerp(0.25, 0.1, deep), lerp(0.55, 0.3, deep), lerp(0.85, 0.6, deep));
      } else {
        terrainColor(terrain, x, z, h, col);
        const shade = 0.85 + clamp((h - 4) / 20, 0, 0.3);
        col.multiplyScalar(shade);
      }
      const o = (py * size + px) * 4;
      img.data[o] = col.r * 255;
      img.data[o + 1] = col.g * 255;
      img.data[o + 2] = col.b * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const s = size / MAP_SIZE;
  ctx.fillStyle = 'rgba(30,90,30,0.55)';
  for (const p of props) {
    if (p.prop !== 'tree') continue;
    ctx.fillRect((p.centerX + HALF) * s - 1, (p.centerZ + HALF) * s - 1, 2, 2);
  }
  for (const h of houses) {
    ctx.fillStyle = h.material === 'metal' ? '#5d7f96' : h.material === 'brick' ? '#8a8a8a' : '#8f6a3f';
    ctx.fillRect((h.minX + HALF) * s, (h.minZ + HALF) * s, (h.maxX - h.minX) * s, (h.maxZ - h.minZ) * s);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect((h.minX + HALF) * s, (h.minZ + HALF) * s, (h.maxX - h.minX) * s, (h.maxZ - h.minZ) * s);
  }
  return c;
}

/** Draws town names on any map canvas given world->canvas mapping functions. */
export function drawTownLabels(ctx, towns, toX, toY, fontSize = 11, offsetY = -40) {
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = Math.max(2, fontSize * 0.28);
  ctx.lineJoin = 'round';
  for (const t of towns) {
    const x = toX(t.x);
    const y = toY(t.z) + offsetY;
    if (x < -60 || y < -20 || x > ctx.canvas.width + 60 || y > ctx.canvas.height + 20) continue;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(t.name.toUpperCase(), x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(t.name.toUpperCase(), x, y);
  }
  ctx.restore();
}
