import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { checkerTexture, plankTexture, noiseTexture } from './util.js';

// House: 12x12m interior, 2x2 rooms of 6x6m, walls 3m, open doorways.
//   kitchen  (-x,-z) | living   (+x,-z)
//   bedroom  (-x,+z) | bathroom (+x,+z)
export const H = 3.0;         // wall height
export const HALF = 6.0;      // interior half-size
const EXT = 0.24;             // exterior wall thickness
const INT = 0.16;             // interior wall thickness
const DOOR_W = 1.5;
const DOOR_H = 2.25;

function aabb(cx, cy, cz, sx, sy, sz) {
  return {
    min: new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
    max: new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
  };
}

export function buildHouse(scene) {
  const group = new THREE.Group();
  const colliders = [];
  const mats = makeMaterials();

  // ---------- floors ----------
  const floors = [
    { room: 'kitchen', x: -3, z: -3, mat: mats.kitchenFloor },
    { room: 'living', x: 3, z: -3, mat: mats.livingFloor },
    { room: 'bedroom', x: -3, z: 3, mat: mats.bedroomFloor },
    { room: 'bathroom', x: 3, z: 3, mat: mats.bathroomFloor },
  ];
  for (const f of floors) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), f.mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(f.x, 0, f.z);
    m.receiveShadow = true;
    group.add(m);
  }

  // ---------- walls ----------
  // Wall run helper: axis 'x' means the wall runs along X at fixed z.
  function wallRun(axis, fixed, from, to, mat, thick, y0 = 0, y1 = H) {
    const len = to - from;
    if (len <= 0.01) return;
    const mid = (from + to) / 2;
    const h = y1 - y0;
    let mesh, box;
    if (axis === 'x') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), mat);
      mesh.position.set(mid, y0 + h / 2, fixed);
      box = aabb(mid, y0 + h / 2, fixed, len, h, thick);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(thick, h, len), mat);
      mesh.position.set(fixed, y0 + h / 2, mid);
      box = aabb(fixed, y0 + h / 2, mid, thick, h, len);
    }
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(box);
    return mesh;
  }

  const B = HALF + EXT / 2;
  // exterior perimeter
  wallRun('x', -B, -HALF - EXT, HALF + EXT, mats.wallNorth, EXT); // north (z-)
  wallRun('x', B, -HALF - EXT, HALF + EXT, mats.wallSouth, EXT);  // south (z+)
  wallRun('z', -B, -HALF, HALF, mats.wallWest, EXT);              // west  (x-)
  wallRun('z', B, -HALF, HALF, mats.wallEast, EXT);               // east  (x+)

  // interior walls with centered doorways (opening at coordinate ±3)
  const dw = DOOR_W / 2;
  // wall x=0 (kitchen|living), z in [-6,0], door at z=-3
  wallRun('z', 0, -HALF, -3 - dw, mats.wallInner, INT);
  wallRun('z', 0, -3 + dw, 0, mats.wallInner, INT);
  wallRun('z', 0, -3 - dw, -3 + dw, mats.wallInner, INT, DOOR_H, H); // lintel
  // wall x=0 (bedroom|bathroom), z in [0,6], door at z=3
  wallRun('z', 0, 0, 3 - dw, mats.wallInner, INT);
  wallRun('z', 0, 3 + dw, HALF, mats.wallInner, INT);
  wallRun('z', 0, 3 - dw, 3 + dw, mats.wallInner, INT, DOOR_H, H);
  // wall z=0 (kitchen|bedroom), x in [-6,0], door at x=-3
  wallRun('x', 0, -HALF, -3 - dw, mats.wallInner, INT);
  wallRun('x', 0, -3 + dw, 0, mats.wallInner, INT);
  wallRun('x', 0, -3 - dw, -3 + dw, mats.wallInner, INT, DOOR_H, H);
  // wall z=0 (living|bathroom), x in [0,6], door at x=3
  wallRun('x', 0, 0, 3 - dw, mats.wallInner, INT);
  wallRun('x', 0, 3 + dw, HALF, mats.wallInner, INT);
  wallRun('x', 0, 3 - dw, 3 + dw, mats.wallInner, INT, DOOR_H, H);

  // door trim so openings read clearly
  const trimMat = mats.trim;
  for (const d of [
    { x: 0, z: -3, run: 'z' }, { x: 0, z: 3, run: 'z' },
    { x: -3, z: 0, run: 'x' }, { x: 3, z: 0, run: 'x' },
  ]) {
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(
        d.run === 'x' ? 0.09 : INT + 0.06, DOOR_H, d.run === 'x' ? INT + 0.06 : 0.09), trimMat);
      post.position.set(
        d.run === 'x' ? d.x + s * dw : d.x,
        DOOR_H / 2,
        d.run === 'x' ? d.z : d.z + s * dw);
      group.add(post);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(
      d.run === 'x' ? DOOR_W + 0.18 : INT + 0.06, 0.09, d.run === 'x' ? INT + 0.06 : DOOR_W + 0.18), trimMat);
    head.position.set(d.x, DOOR_H + 0.045, d.z);
    group.add(head);
  }

  // ---------- ceiling ----------
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(2 * HALF + 2 * EXT, 0.12, 2 * HALF + 2 * EXT), mats.ceiling);
  ceil.position.set(0, H + 0.06, 0);
  group.add(ceil);

  // ---------- windows (emissive stickers on exterior walls) ----------
  const winDefs = [
    { x: -3.4, z: -HALF + 0.01, ry: 0 }, { x: 3.4, z: -HALF + 0.01, ry: 0 },        // north wall
    { x: -2.6, z: HALF - 0.01, ry: Math.PI }, { x: 3.4, z: HALF - 0.01, ry: Math.PI }, // south wall
    { x: -HALF + 0.01, z: -3.4, ry: Math.PI / 2 }, { x: -HALF + 0.01, z: 2.6, ry: Math.PI / 2 }, // west
    { x: HALF - 0.01, z: -2.6, ry: -Math.PI / 2 }, { x: HALF - 0.01, z: 3.4, ry: -Math.PI / 2 }, // east
  ];
  for (const w of winDefs) {
    const win = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 0.06), mats.trim);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.98), mats.sky);
    glass.position.z = 0.035;
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.98, 0.02), mats.trim);
    barV.position.z = 0.04;
    const barH = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.05, 0.02), mats.trim);
    barH.position.z = 0.04;
    win.add(frame, glass, barV, barH);
    win.position.set(w.x, 1.75, w.z);
    win.rotation.y = w.ry;
    group.add(win);
  }

  // ---------- lighting ----------
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a2622, 0.75));
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
  sun.position.set(4, 9, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 20;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  const roomLights = [
    { x: -3, z: -3, c: 0xfff1d8 }, { x: 3, z: -3, c: 0xffe9c8 },
    { x: -3, z: 3, c: 0xf3e6ff }, { x: 3, z: 3, c: 0xdff4f2 },
  ];
  for (const rl of roomLights) {
    const p = new THREE.PointLight(rl.c, 9, 0, 2);
    p.position.set(rl.x, 2.55, rl.z);
    scene.add(p);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e2, emissiveIntensity: 2.2 }));
    panel.position.set(rl.x, H - 0.04, rl.z);
    group.add(panel);
  }

  // ---------- furniture ----------
  const bin = buildFurniture(group, colliders, mats);

  scene.add(group);

  return {
    group,
    colliders,
    bin,
    roomAt(x, z) {
      if (z < 0) return x < 0 ? 'kitchen' : 'living';
      return x < 0 ? 'bedroom' : 'bathroom';
    },
  };
}

// ============================================================ materials
function makeMaterials() {
  const kitchenTile = checkerTexture('#e9e4d3', '#b8beac', 6);
  kitchenTile.repeat.set(3, 3);
  const bathTile = checkerTexture('#f0f3f2', '#9fc6c4', 10);
  bathTile.repeat.set(3, 3);
  const wood = plankTexture('#9a7150', '#6f4f36', 7);
  wood.repeat.set(2, 2);
  const carpet = noiseTexture('#7c86a8', 22);
  carpet.repeat.set(4, 4);

  return {
    kitchenFloor: new THREE.MeshStandardMaterial({ map: kitchenTile, roughness: 0.85 }),
    livingFloor: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }),
    bedroomFloor: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1.0 }),
    bathroomFloor: new THREE.MeshStandardMaterial({ map: bathTile, roughness: 0.5 }),
    wallNorth: new THREE.MeshStandardMaterial({ color: 0xd8cfbe, roughness: 0.95 }),
    wallSouth: new THREE.MeshStandardMaterial({ color: 0xcfc4b9, roughness: 0.95 }),
    wallWest: new THREE.MeshStandardMaterial({ color: 0xd3ccc0, roughness: 0.95 }),
    wallEast: new THREE.MeshStandardMaterial({ color: 0xd6ccc4, roughness: 0.95 }),
    wallInner: new THREE.MeshStandardMaterial({ color: 0xded4c4, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: 0.8 }),
    sky: new THREE.MeshStandardMaterial({
      color: 0xbfe3f2, emissive: 0xa8d8ee, emissiveIntensity: 1.6, roughness: 0.2,
    }),
  };
}

// ============================================================ furniture
function buildFurniture(group, colliders, mats) {
  const M = {
    counter: new THREE.MeshStandardMaterial({ color: 0x8a9b8e, roughness: 0.8 }),
    counterTop: new THREE.MeshStandardMaterial({ color: 0xe5e0d2, roughness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.35, metalness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.45 }),
    couch: new THREE.MeshStandardMaterial({ color: 0xb0653f, roughness: 0.95 }),
    couchDark: new THREE.MeshStandardMaterial({ color: 0x99522f, roughness: 0.95 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.8 }),
    mattress: new THREE.MeshStandardMaterial({ color: 0xefeadf, roughness: 0.95 }),
    duvet: new THREE.MeshStandardMaterial({ color: 0x7f89b8, roughness: 0.95 }),
    pillow: new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 0.95 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f6f5, roughness: 0.3 }),
    porcelain: new THREE.MeshStandardMaterial({ color: 0xeef1f0, roughness: 0.25 }),
    rugA: new THREE.MeshStandardMaterial({ color: 0x8f5f4e, roughness: 1 }),
    rugB: new THREE.MeshStandardMaterial({ color: 0x5e6d84, roughness: 1 }),
    binMat: new THREE.MeshStandardMaterial({ color: 0x4f6b5e, roughness: 0.7 }),
    binBand: new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.7 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xcfe6ea, roughness: 0.08, metalness: 0.9 }),
  };

  function solid(geoOrMesh, x, y, z, opts = {}) {
    const mesh = geoOrMesh.isObject3D ? geoOrMesh : new THREE.Mesh(geoOrMesh, opts.mat || M.dark);
    mesh.position.set(x, y, z);
    if (opts.ry) mesh.rotation.y = opts.ry;
    mesh.castShadow = opts.noShadow ? false : true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (opts.collide !== false) {
      const s = opts.size; // required when colliding
      colliders.push(aabb(x, y, z, s[0], s[1], s[2]));
    }
    return mesh;
  }
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  const cyl = (r, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);

  // ------------------- KITCHEN (-x,-z) -------------------
  // counter along west wall
  solid(box(0.62, 0.9, 3.4, M.counter), -5.65, 0.45, -3.4, { size: [0.62, 0.9, 3.4], mat: M.counter });
  solid(box(0.7, 0.05, 3.5, M.counterTop), -5.65, 0.925, -3.4, { size: [0.7, 0.05, 3.5], mat: M.counterTop });
  // sink basin on counter
  solid(box(0.45, 0.12, 0.6, M.steel), -5.62, 0.99, -4.2, { size: [0.45, 0.12, 0.6], mat: M.steel });
  // stove block along north wall
  solid(box(0.85, 0.92, 0.68, M.steel), -3.1, 0.46, -5.62, { size: [0.85, 0.92, 0.68], mat: M.steel });
  const stoveTop = box(0.85, 0.03, 0.68, M.black);
  stoveTop.position.set(-3.1, 0.935, -5.62);
  group.add(stoveTop);
  for (const [bx, bz] of [[-3.32, -5.44], [-2.88, -5.44], [-3.32, -5.8], [-2.88, -5.8]]) {
    const burner = cyl(0.09, 0.02, M.dark);
    burner.position.set(bx, 0.96, bz);
    group.add(burner);
  }
  // fridge in NW corner
  solid(box(0.75, 1.9, 0.72, M.steel), -5.5, 0.95, -5.55, { size: [0.75, 1.9, 0.72], mat: M.steel });
  // small table
  solid(box(0.9, 0.06, 0.9, M.woodDark), -1.6, 0.72, -1.7, { size: [0.9, 0.78, 0.9], mat: M.woodDark });
  const legG = cyl(0.04, 0.7, M.woodDark);
  legG.position.set(-1.6, 0.35, -1.7);
  group.add(legG);

  // TRASH BIN — the goal container (open top)
  const binPos = new THREE.Vector3(-0.85, 0, -5.3);
  const bg = new THREE.Group();
  const bw = 0.56, bh = 0.52, bt = 0.05; // width, height, wall thickness
  const bottom = box(bw, bt, bw, M.binMat);
  bottom.position.y = bt / 2;
  bg.add(bottom);
  for (const [dx, dz, sx, sz] of [
    [0, -(bw - bt) / 2, bw, bt], [0, (bw - bt) / 2, bw, bt],
    [-(bw - bt) / 2, 0, bt, bw - 2 * bt], [(bw - bt) / 2, 0, bt, bw - 2 * bt],
  ]) {
    const wallM = box(sx, bh, sz, M.binMat);
    wallM.position.set(dx, bh / 2, dz);
    wallM.castShadow = true;
    bg.add(wallM);
  }
  const band = box(bw + 0.03, 0.06, bw + 0.03, M.binBand);
  band.position.y = bh - 0.03;
  bg.add(band);
  bg.position.copy(binPos);
  group.add(bg);
  // bin colliders: floor + four walls
  colliders.push(aabb(binPos.x, bt / 2, binPos.z, bw, bt, bw));
  colliders.push(aabb(binPos.x, bh / 2, binPos.z - (bw - bt) / 2, bw + 0.03, bh, bt));
  colliders.push(aabb(binPos.x, bh / 2, binPos.z + (bw - bt) / 2, bw + 0.03, bh, bt));
  colliders.push(aabb(binPos.x - (bw - bt) / 2, bh / 2, binPos.z, bt, bh, bw + 0.03));
  colliders.push(aabb(binPos.x + (bw - bt) / 2, bh / 2, binPos.z, bt, bh, bw + 0.03));
  const bin = {
    pos: binPos,
    inner: aabb(binPos.x, (bh + bt) / 2 + 0.02, binPos.z, bw - 2 * bt - 0.02, bh, bw - 2 * bt - 0.02),
  };

  // ------------------- LIVING ROOM (+x,-z) -------------------
  // rug (visual only)
  const rug = box(2.6, 0.02, 1.9, M.rugA);
  rug.position.set(3.1, 0.011, -2.6);
  rug.receiveShadow = true;
  group.add(rug);
  // couch against north wall, facing +z
  solid(box(2.2, 0.42, 0.85, M.couch), 3.1, 0.21, -5.35, { size: [2.2, 0.42, 0.85], mat: M.couch });      // seat
  solid(box(2.2, 0.62, 0.22, M.couchDark), 3.1, 0.73, -5.68, { size: [2.2, 0.62, 0.22], mat: M.couchDark }); // back
  solid(box(0.24, 0.62, 0.85, M.couchDark), 1.9, 0.52, -5.35, { size: [0.24, 0.62, 0.85], mat: M.couchDark });
  solid(box(0.24, 0.62, 0.85, M.couchDark), 4.3, 0.52, -5.35, { size: [0.24, 0.62, 0.85], mat: M.couchDark });
  // coffee table
  solid(box(1.15, 0.34, 0.6, M.woodDark), 3.1, 0.17, -3.0, { size: [1.15, 0.34, 0.6], mat: M.woodDark });
  // TV stand + screen on interior wall side (z=0), facing couch
  solid(box(1.5, 0.4, 0.42, M.woodDark), 3.1, 0.2, -0.45, { size: [1.5, 0.4, 0.42], mat: M.woodDark });
  const tv = box(1.3, 0.72, 0.06, M.black);
  tv.position.set(3.1, 0.86, -0.38);
  tv.castShadow = true;
  group.add(tv);
  const tvGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x223c55, emissive: 0x2c5d8a, emissiveIntensity: 0.9 }));
  tvGlow.position.set(3.1, 0.86, -0.345);
  tvGlow.rotation.y = Math.PI;
  group.add(tvGlow);
  colliders.push(aabb(3.1, 0.86, -0.38, 1.3, 0.72, 0.06));
  // bookshelf east wall
  solid(box(0.35, 1.5, 1.1, M.woodDark), 5.7, 0.75, -3.6, { size: [0.35, 1.5, 1.1], mat: M.woodDark });

  // ------------------- BEDROOM (-x,+z) -------------------
  const rug2 = box(1.7, 0.02, 2.3, M.rugB);
  rug2.position.set(-1.7, 0.011, 3.4);
  rug2.receiveShadow = true;
  group.add(rug2);
  // bed against west wall
  solid(box(1.5, 0.3, 2.1, M.woodDark), -5.1, 0.15, 3.6, { size: [1.5, 0.3, 2.1], mat: M.woodDark });     // frame
  solid(box(1.42, 0.22, 2.0, M.mattress), -5.1, 0.41, 3.6, { size: [1.42, 0.22, 2.0], mat: M.mattress }); // mattress
  const duvet = box(1.44, 0.1, 1.3, M.duvet);
  duvet.position.set(-5.1, 0.56, 3.95);
  duvet.castShadow = true;
  group.add(duvet);
  const pil = rbox(0.55, 0.14, 0.35, 0.05, M.pillow);
  pil.position.set(-5.1, 0.58, 2.75);
  pil.castShadow = true;
  group.add(pil);
  // headboard
  solid(box(1.5, 0.7, 0.1, M.woodDark), -5.1, 0.65, 2.5, { size: [1.5, 0.7, 0.1], mat: M.woodDark });
  // nightstand
  solid(box(0.45, 0.5, 0.45, M.woodDark), -5.55, 0.25, 5.1, { size: [0.45, 0.5, 0.45], mat: M.woodDark });
  // wardrobe south wall
  solid(box(1.4, 1.95, 0.55, M.counter), -2.2, 0.975, 5.6, { size: [1.4, 1.95, 0.55], mat: M.counter });

  // ------------------- BATHROOM (+x,+z) -------------------
  // tub along east wall
  solid(box(1.7, 0.55, 0.8, M.porcelain), 5.0, 0.275, 4.8, { size: [1.7, 0.55, 0.8], mat: M.porcelain });
  const tubIn = box(1.5, 0.1, 0.6, new THREE.MeshStandardMaterial({ color: 0xbdd3d6, roughness: 0.3 }));
  tubIn.position.set(5.0, 0.56, 4.8);
  group.add(tubIn);
  // sink pedestal + basin on south wall
  solid(cyl(0.12, 0.75, M.porcelain), 3.2, 0.375, 5.55, { size: [0.24, 0.75, 0.24], mat: M.porcelain });
  solid(box(0.55, 0.12, 0.45, M.porcelain), 3.2, 0.81, 5.5, { size: [0.55, 0.12, 0.45], mat: M.porcelain });
  const mirror = box(0.5, 0.65, 0.03, M.mirror);
  mirror.position.set(3.2, 1.7, 5.85);
  group.add(mirror);
  // toilet
  solid(cyl(0.21, 0.4, M.porcelain), 4.6, 0.2, 5.5, { size: [0.42, 0.4, 0.42], mat: M.porcelain });
  solid(box(0.42, 0.55, 0.2, M.porcelain), 4.6, 0.62, 5.78, { size: [0.42, 0.55, 0.2], mat: M.porcelain });
  const seat = cyl(0.24, 0.05, M.white);
  seat.position.set(4.6, 0.42, 5.5);
  seat.castShadow = true;
  group.add(seat);
  // bath mat
  const mat3 = box(0.9, 0.02, 0.6, new THREE.MeshStandardMaterial({ color: 0x9fc0bb, roughness: 1 }));
  mat3.position.set(4.2, 0.011, 3.4);
  group.add(mat3);

  return bin;
}
