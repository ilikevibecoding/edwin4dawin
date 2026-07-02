import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  checkerTexture, plankTexture, tileTexture, carpetTexture, rugTexture, paintingTexture,
} from './util.js';

// House: 12x12m interior, 2x2 rooms of 6x6m, walls 3m, open doorways.
//   kitchen  (-x,-z) | living   (+x,-z)
//   bedroom  (-x,+z) | bathroom (+x,+z)
// Exterior walls have real window openings with glass — the neighborhood
// outside (see world.js) is visible through them.
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
  // doorway thresholds
  for (const [x, z, run] of [[0, -3, 'z'], [0, 3, 'z'], [-3, 0, 'x'], [3, 0, 'x']]) {
    const th = new THREE.Mesh(new THREE.BoxGeometry(
      run === 'x' ? DOOR_W : INT + 0.04, 0.012, run === 'x' ? INT + 0.04 : DOOR_W), mats.threshold);
    th.position.set(x, 0.006, z);
    group.add(th);
  }

  // ---------- wall helpers ----------
  function baseboard(axis, fixed, from, to, thick, sides) {
    const len = to - from;
    if (len < 0.18) return;
    for (const s of sides) {
      const off = fixed + s * (thick / 2 + 0.014);
      let bb;
      if (axis === 'x') bb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.105, 0.028), mats.trim);
      else bb = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.105, len), mats.trim);
      bb.position.set(axis === 'x' ? (from + to) / 2 : off, 0.0525, axis === 'x' ? off : (from + to) / 2);
      group.add(bb);
    }
  }

  function wallBox(axis, fixed, from, to, mat, thick, y0, y1) {
    const len = to - from;
    if (len <= 0.01) return;
    const mid = (from + to) / 2;
    const h = y1 - y0;
    let m, b;
    if (axis === 'x') {
      m = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), mat);
      m.position.set(mid, y0 + h / 2, fixed);
      b = aabb(mid, y0 + h / 2, fixed, len, h, thick);
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(thick, h, len), mat);
      m.position.set(fixed, y0 + h / 2, mid);
      b = aabb(fixed, y0 + h / 2, mid, thick, h, len);
    }
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    colliders.push(b);
  }

  // Wall run with optional window openings: {c, w, sill, head}
  function wallWithOpenings(axis, fixed, from, to, mat, thick, openings, bbSides) {
    const ops = [...openings].sort((a, b) => a.c - b.c);
    let cursor = from;
    for (const op of ops) {
      const a = op.c - op.w / 2;
      const b = op.c + op.w / 2;
      if (a > cursor) {
        wallBox(axis, fixed, cursor, a, mat, thick, 0, H);
        baseboard(axis, fixed, cursor, a, thick, bbSides);
      }
      wallBox(axis, fixed, a, b, mat, thick, 0, op.sill);       // below sill
      baseboard(axis, fixed, a, b, thick, bbSides);
      wallBox(axis, fixed, a, b, mat, thick, op.head, H);       // above header
      cursor = b;
    }
    if (cursor < to) {
      wallBox(axis, fixed, cursor, to, mat, thick, 0, H);
      baseboard(axis, fixed, cursor, to, thick, bbSides);
    }
  }

  // ---------- windows ----------
  // rotY maps window-local +z to the room interior.
  function addWindow(axis, fixed, center, w, sill, head, opts = {}) {
    const inSign = opts.inSign; // world direction of the interior along the wall normal
    const wh = head - sill;
    const win = new THREE.Group();
    if (axis === 'x') {
      win.position.set(center, 0, fixed);
      win.rotation.y = inSign > 0 ? 0 : Math.PI;
    } else {
      win.position.set(fixed, 0, center);
      win.rotation.y = inSign > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    group.add(win);

    const cy = (sill + head) / 2;
    // frame: jambs + head + sill boards
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.075, wh + 0.15, EXT + 0.06), mats.trim);
      jamb.position.set(s * (w / 2 + 0.037), cy, 0);
      jamb.castShadow = true;
      win.add(jamb);
    }
    const headBoard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.075, EXT + 0.06), mats.trim);
    headBoard.position.set(0, head + 0.037, 0);
    win.add(headBoard);
    // sill shelf, protrudes into the room — a place to put stuff
    const sillBoard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.05, EXT + 0.30), mats.trim);
    sillBoard.position.set(0, sill - 0.025, 0.09);
    sillBoard.castShadow = true;
    sillBoard.receiveShadow = true;
    win.add(sillBoard);

    // glass + mullions
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, wh), mats.glass);
    glass.position.set(0, cy, 0);
    win.add(glass);
    const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.045, wh, 0.05), mats.trim);
    mullV.position.set(0, cy, 0);
    win.add(mullV);
    const mullH = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, 0.05), mats.trim);
    mullH.position.set(0, cy + wh * 0.12, 0);
    win.add(mullH);

    // curtains
    if (opts.curtain) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, w + 0.55, 8), mats.rod);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, head + 0.13, 0.19);
      win.add(rod);
      for (const s of [-1, 1]) {
        const panel = new THREE.Mesh(
          new RoundedBoxGeometry(w * 0.22, head - sill + 0.5, 0.06, 2, 0.03), opts.curtain);
        panel.position.set(s * (w / 2 + 0.1), head - (head - sill + 0.5) / 2 + 0.1, 0.17);
        panel.castShadow = true;
        win.add(panel);
      }
    }

    // colliders: glass pane + sill shelf (world space)
    if (axis === 'x') {
      colliders.push(aabb(center, cy, fixed, w, wh, 0.1));
      colliders.push(aabb(center, sill - 0.025, fixed + inSign * 0.09, w + 0.22, 0.05, EXT + 0.30));
    } else {
      colliders.push(aabb(fixed, cy, center, 0.1, wh, w));
      colliders.push(aabb(fixed + inSign * 0.09, sill - 0.025, center, EXT + 0.30, 0.05, w + 0.22));
    }
  }

  // ---------- exterior walls with openings ----------
  const B = HALF + EXT / 2;
  const winN = [
    { c: -3.4, w: 1.5, sill: 1.1, head: 2.3 },  // kitchen
    { c: 3.3, w: 2.4, sill: 0.75, head: 2.35 }, // living picture window
  ];
  const winS = [
    { c: -4.3, w: 1.4, sill: 1.1, head: 2.3 },  // bedroom (clear of the wardrobe)
    { c: 4.6, w: 1.1, sill: 1.5, head: 2.35 },  // bathroom (short)
  ];
  const winW = [
    { c: -4.2, w: 1.2, sill: 1.15, head: 2.25 }, // kitchen over sink
    { c: 4.3, w: 1.3, sill: 1.1, head: 2.3 },    // bedroom
  ];
  const winE = [
    { c: -2.2, w: 1.4, sill: 1.05, head: 2.3 },  // living
    { c: 3.4, w: 1.2, sill: 1.5, head: 2.35 },   // bathroom (short)
  ];
  wallWithOpenings('x', -B, -HALF - EXT, HALF + EXT, mats.wallA, EXT, winN, [1]);
  wallWithOpenings('x', B, -HALF - EXT, HALF + EXT, mats.wallB, EXT, winS, [-1]);
  wallWithOpenings('z', -B, -HALF, HALF, mats.wallA, EXT, winW, [1]);
  wallWithOpenings('z', B, -HALF, HALF, mats.wallB, EXT, winE, [-1]);

  for (const op of winN) addWindow('x', -B, op.c, op.w, op.sill, op.head, { inSign: 1, curtain: op.c < 0 ? mats.curtainA : mats.curtainB });
  for (const op of winS) addWindow('x', B, op.c, op.w, op.sill, op.head, { inSign: -1, curtain: op.c < 0 ? mats.curtainC : null });
  for (const op of winW) addWindow('z', -B, op.c, op.w, op.sill, op.head, { inSign: 1, curtain: op.c > 0 ? mats.curtainC : null });
  for (const op of winE) addWindow('z', B, op.c, op.w, op.sill, op.head, { inSign: -1, curtain: op.c < 0 ? mats.curtainB : null });

  // ---------- interior walls with doorways ----------
  const dw = DOOR_W / 2;
  function innerWall(axis, fixed, from, to, doorAt) {
    wallBox(axis, fixed, from, doorAt - dw, mats.wallInner, INT, 0, H);
    baseboard(axis, fixed, from, doorAt - dw, INT, [-1, 1]);
    wallBox(axis, fixed, doorAt + dw, to, mats.wallInner, INT, 0, H);
    baseboard(axis, fixed, doorAt + dw, to, INT, [-1, 1]);
    wallBox(axis, fixed, doorAt - dw, doorAt + dw, mats.wallInner, INT, DOOR_H, H); // lintel
  }
  innerWall('z', 0, -HALF, 0, -3);
  innerWall('z', 0, 0, HALF, 3);
  innerWall('x', 0, -HALF, 0, -3);
  innerWall('x', 0, 0, HALF, 3);

  // door trim
  for (const d of [
    { x: 0, z: -3, run: 'z' }, { x: 0, z: 3, run: 'z' },
    { x: -3, z: 0, run: 'x' }, { x: 3, z: 0, run: 'x' },
  ]) {
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(
        d.run === 'x' ? 0.09 : INT + 0.07, DOOR_H, d.run === 'x' ? INT + 0.07 : 0.09), mats.trim);
      post.position.set(
        d.run === 'x' ? d.x + s * dw : d.x,
        DOOR_H / 2,
        d.run === 'x' ? d.z : d.z + s * dw);
      group.add(post);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(
      d.run === 'x' ? DOOR_W + 0.18 : INT + 0.07, 0.09, d.run === 'x' ? INT + 0.07 : DOOR_W + 0.18), mats.trim);
    head.position.set(d.x, DOOR_H + 0.045, d.z);
    group.add(head);
  }

  // ---------- ceiling ----------
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(2 * HALF + 2 * EXT, 0.12, 2 * HALF + 2 * EXT), mats.ceiling);
  ceil.position.set(0, H + 0.06, 0);
  group.add(ceil);

  // ---------- lighting ----------
  scene.add(new THREE.HemisphereLight(0xbdd8f0, 0x8a7a66, 0.5));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.0);
  sun.position.set(6, 12, -9); // north-east sky: pours through the street-side windows
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const roomLights = [
    { x: -3, z: -3, c: 0xffe8c8, i: 5.5 }, { x: 3, z: -3, c: 0xffe2ba, i: 5.5 },
    { x: -3, z: 3, c: 0xf0e4ff, i: 5 }, { x: 3, z: 3, c: 0xdff4f2, i: 5 },
  ];
  for (const rl of roomLights) {
    const p = new THREE.PointLight(rl.c, rl.i, 9, 1.8);
    p.position.set(rl.x, 2.5, rl.z);
    scene.add(p);
    const fixture = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.09, 0.6, 2, 0.04), mats.fixture);
    fixture.position.set(rl.x, H - 0.06, rl.z);
    group.add(fixture);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.46), mats.lens);
    lens.position.set(rl.x, H - 0.105, rl.z);
    group.add(lens);
  }

  // ---------- furniture ----------
  const bins = buildFurniture(group, colliders, mats);

  scene.add(group);

  return {
    group,
    colliders,
    bins,
    bin: bins[0], // kept for older eval scenarios
    roomAt(x, z) {
      if (z < 0) return x < 0 ? 'kitchen' : 'living';
      return x < 0 ? 'bedroom' : 'bathroom';
    },
  };
}

// ============================================================ materials
function makeMaterials() {
  const kitchenTile = tileTexture('#e6ddc8', '#a8a394', 6);
  kitchenTile.repeat.set(3, 3);
  const bathTile = checkerTexture('#f0f3f2', '#9fc6c4', 10);
  bathTile.repeat.set(2.4, 2.4);
  const wood = plankTexture('#9a7150', '#5f4330', 7);
  wood.repeat.set(2, 2);
  const carpet = carpetTexture('#8a91ad');
  carpet.repeat.set(3, 3);

  return {
    kitchenFloor: new THREE.MeshStandardMaterial({ map: kitchenTile, roughness: 0.8 }),
    livingFloor: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 }),
    bedroomFloor: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1.0 }),
    bathroomFloor: new THREE.MeshStandardMaterial({ map: bathTile, roughness: 0.4 }),
    wallA: new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.95 }),
    wallB: new THREE.MeshStandardMaterial({ color: 0xd3c9bc, roughness: 0.95 }),
    wallInner: new THREE.MeshStandardMaterial({ color: 0xdfd6c5, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xebe5d9, roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.7 }),
    threshold: new THREE.MeshStandardMaterial({ color: 0x8a6a4c, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xcfe6f2, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4,
    }),
    curtainA: new THREE.MeshStandardMaterial({ color: 0xc9855c, roughness: 1 }),
    curtainB: new THREE.MeshStandardMaterial({ color: 0x8a9b84, roughness: 1 }),
    curtainC: new THREE.MeshStandardMaterial({ color: 0x9a8fb8, roughness: 1 }),
    rod: new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.5, metalness: 0.4 }),
    fixture: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.6 }),
    lens: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 2.4 }),
  };
}

// ============================================================ furniture
function buildFurniture(group, colliders, mats) {
  const M = {
    counter: new THREE.MeshStandardMaterial({ color: 0x7f957f, roughness: 0.75 }),
    counterTop: new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.3, metalness: 0.75 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x8e9499, roughness: 0.4, metalness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.35 }),
    couch: new THREE.MeshStandardMaterial({ color: 0xb0653f, roughness: 0.95 }),
    couchDark: new THREE.MeshStandardMaterial({ color: 0x99522f, roughness: 0.95 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.75 }),
    woodMid: new THREE.MeshStandardMaterial({ color: 0x8a6547, roughness: 0.7 }),
    mattress: new THREE.MeshStandardMaterial({ color: 0xefeadf, roughness: 0.95 }),
    duvet: new THREE.MeshStandardMaterial({ color: 0x7f89b8, roughness: 0.95 }),
    pillow: new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 0.95 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f6f5, roughness: 0.3 }),
    porcelain: new THREE.MeshStandardMaterial({ color: 0xeef1f0, roughness: 0.2 }),
    binMat: new THREE.MeshStandardMaterial({ color: 0x4f6b5e, roughness: 0.65 }),
    binBand: new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.7 }),
    basket: new THREE.MeshStandardMaterial({ color: 0x5f7fa8, roughness: 0.8 }),
    basketRim: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.8 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xd8eef2, roughness: 0.05, metalness: 0.92 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x3d3833, roughness: 0.5, metalness: 0.4 }),
    shade: new THREE.MeshStandardMaterial({ color: 0xf2e3c2, roughness: 0.9, emissive: 0xf5d9a0, emissiveIntensity: 0.55, side: THREE.DoubleSide }),
    pot: new THREE.MeshStandardMaterial({ color: 0xb06a4a, roughness: 0.85 }),
    plant: new THREE.MeshStandardMaterial({ color: 0x4f7c48, roughness: 0.9 }),
    plantDark: new THREE.MeshStandardMaterial({ color: 0x3d6339, roughness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x4a3c30, roughness: 0.6 }),
  };

  function solid(meshOrGeo, x, y, z, opts = {}) {
    const m = meshOrGeo.isObject3D ? meshOrGeo : new THREE.Mesh(meshOrGeo, opts.mat || M.dark);
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    if (opts.size) colliders.push(aabb(x, y, z, ...opts.size));
    return m;
  }
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  const cyl = (r, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);

  function openBin(x, z, size, height, wallT, mat, rimMat, name, opts = {}) {
    const bg = new THREE.Group();
    const bottom = box(size, wallT, size, mat);
    bottom.position.y = wallT / 2;
    bottom.receiveShadow = true;
    bg.add(bottom);
    for (const [dx, dz, sx, sz] of [
      [0, -(size - wallT) / 2, size, wallT], [0, (size - wallT) / 2, size, wallT],
      [-(size - wallT) / 2, 0, wallT, size - 2 * wallT], [(size - wallT) / 2, 0, wallT, size - 2 * wallT],
    ]) {
      const wallM = box(sx, height, sz, mat);
      wallM.position.set(dx, height / 2, dz);
      wallM.castShadow = true;
      bg.add(wallM);
      colliders.push(aabb(x + dx, height / 2, z + dz, sx, height, sz));
      // rim strip
      const rim = box(sx === size ? size + 0.04 : wallT + 0.03, 0.045,
        sz === size ? size + 0.04 : wallT + 0.03, rimMat);
      rim.position.set(dx, height - 0.02, dz);
      bg.add(rim);
    }
    colliders.push(aabb(x, wallT / 2, z, size, wallT, size));
    if (opts.slats) {
      for (let i = 0; i < 3; i++) {
        const band = box(size + 0.02, 0.02, size + 0.02, rimMat);
        band.position.y = 0.09 + i * 0.12;
        bg.add(band);
      }
    }
    bg.position.set(x, 0, z);
    group.add(bg);
    return {
      pos: new THREE.Vector3(x, 0, z),
      name,
      inner: aabb(x, (height + wallT) / 2 + 0.02, z, size - 2 * wallT - 0.02, height, size - 2 * wallT - 0.02),
    };
  }

  function painting(kind, w, h, x, y, z, ry) {
    const pg = new THREE.Group();
    const frame = box(w + 0.06, h + 0.06, 0.035, M.frame);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: paintingTexture(kind), roughness: 0.9 }));
    art.position.z = 0.022;
    pg.add(frame, art);
    pg.position.set(x, y, z);
    pg.rotation.y = ry;
    group.add(pg);
  }

  function plant(x, z, scale = 1) {
    const pg = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.11 * scale, 0.22 * scale, 12), M.pot);
    pot.position.y = 0.11 * scale;
    pot.castShadow = true;
    pg.add(pot);
    const soil = cyl(0.125 * scale, 0.02, M.dark, 12);
    soil.position.y = 0.215 * scale;
    pg.add(soil);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 8, 6), i % 2 ? M.plant : M.plantDark);
      leaf.scale.set(0.5, 1.7, 0.5);
      leaf.position.set(Math.cos(a) * 0.08 * scale, (0.42 + (i % 3) * 0.07) * scale, Math.sin(a) * 0.08 * scale);
      leaf.rotation.z = Math.cos(a) * 0.5;
      leaf.rotation.x = Math.sin(a) * 0.5;
      leaf.castShadow = true;
      pg.add(leaf);
    }
    pg.position.set(x, 0, z);
    group.add(pg);
    colliders.push(aabb(x, 0.11 * scale, z, 0.28 * scale, 0.22 * scale, 0.28 * scale));
  }

  // =================== KITCHEN (-x,-z) ===================
  // counter along west wall with sink under the window
  solid(box(0.62, 0.88, 3.4, M.counter), -5.65, 0.44, -3.4, { size: [0.62, 0.88, 3.4], mat: M.counter });
  solid(box(0.7, 0.05, 3.5, M.counterTop), -5.65, 0.905, -3.4, { size: [0.7, 0.05, 3.5], mat: M.counterTop });
  // cabinet door seams + handles
  for (const cz of [-4.5, -3.7, -2.9, -2.1]) {
    const seam = box(0.015, 0.72, 0.02, M.counterTop);
    seam.position.set(-5.33, 0.42, cz);
    group.add(seam);
    const handle = box(0.03, 0.14, 0.03, M.steelDark);
    handle.position.set(-5.32, 0.62, cz + 0.28);
    group.add(handle);
  }
  // backsplash
  const splash = box(0.04, 0.5, 3.4, M.counterTop);
  splash.position.set(-5.94, 1.18, -3.4);
  group.add(splash);
  // sink basin + faucet under the window
  solid(box(0.45, 0.11, 0.6, M.steel), -5.62, 0.965, -4.2, { size: [0.45, 0.11, 0.6], mat: M.steel });
  const basinIn = box(0.36, 0.05, 0.5, new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.7 }));
  basinIn.position.set(-5.62, 0.995, -4.2);
  group.add(basinIn);
  const faucet = new THREE.Group();
  const fpole = cyl(0.02, 0.24, M.steel, 10);
  fpole.position.y = 0.12;
  const farm = box(0.2, 0.035, 0.035, M.steel);
  farm.position.set(0.09, 0.24, 0);
  faucet.add(fpole, farm);
  faucet.position.set(-5.86, 1.02, -4.2);
  group.add(faucet);
  // upper cabinets
  solid(box(0.4, 0.6, 1.6, M.counter), -5.78, 1.75, -2.6, { size: [0.4, 0.6, 1.6], mat: M.counter });
  const ucSeam = box(0.02, 0.5, 0.015, M.counterTop);
  ucSeam.position.set(-5.57, 1.75, -2.6);
  group.add(ucSeam);
  // stove + hood
  solid(box(0.85, 0.9, 0.68, M.steel), -3.1, 0.45, -5.62, { size: [0.85, 0.9, 0.68], mat: M.steel });
  const stoveTop = box(0.85, 0.03, 0.68, M.black);
  stoveTop.position.set(-3.1, 0.915, -5.62);
  group.add(stoveTop);
  for (const [bx, bz] of [[-3.32, -5.44], [-2.88, -5.44], [-3.32, -5.8], [-2.88, -5.8]]) {
    const burner = cyl(0.09, 0.02, M.dark);
    burner.position.set(bx, 0.94, bz);
    group.add(burner);
  }
  const oven = box(0.62, 0.34, 0.03, M.black);
  oven.position.set(-3.1, 0.42, -5.26);
  group.add(oven);
  const ovenHandle = box(0.5, 0.03, 0.03, M.steelDark);
  ovenHandle.position.set(-3.1, 0.62, -5.25);
  group.add(ovenHandle);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 4), M.steelDark);
  hood.rotation.y = Math.PI / 4;
  hood.scale.set(0.85, 1, 0.68);
  hood.position.set(-3.1, 2.05, -5.62);
  group.add(hood);
  const hoodPipe = box(0.3, 0.65, 0.3, M.steelDark);
  hoodPipe.position.set(-3.1, 2.6, -5.62);
  group.add(hoodPipe);
  // fridge with doors + handles
  solid(box(0.75, 1.9, 0.72, M.steel), -5.5, 0.95, -5.55, { size: [0.75, 1.9, 0.72], mat: M.steel });
  const seamF = box(0.77, 0.015, 0.015, M.steelDark);
  seamF.position.set(-5.5, 1.25, -5.185);
  group.add(seamF);
  for (const hy of [0.85, 1.45]) {
    const h = box(0.035, hy > 1 ? 0.5 : 0.3, 0.035, M.steelDark);
    h.position.set(-5.2, hy, -5.17);
    group.add(h);
  }
  // small table + leg
  solid(box(0.9, 0.06, 0.9, M.woodDark), -1.5, 0.72, -4.55, { size: [0.9, 0.78, 0.9], mat: M.woodDark });
  const legG = cyl(0.045, 0.7, M.woodDark);
  legG.position.set(-1.5, 0.35, -4.55);
  group.add(legG);
  const legBase = cyl(0.16, 0.03, M.woodDark);
  legBase.position.set(-1.5, 0.015, -4.55);
  group.add(legBase);
  // rolling cart — extra placement surface
  solid(box(0.6, 0.05, 0.8, M.woodMid), -2.2, 0.795, -2.85, { size: [0.6, 0.05, 0.8], mat: M.woodMid });
  solid(box(0.56, 0.04, 0.76, M.woodMid), -2.2, 0.42, -2.85, { size: [0.56, 0.04, 0.76], mat: M.woodMid });
  for (const [px, pz] of [[-0.26, -0.36], [0.26, -0.36], [-0.26, 0.36], [0.26, 0.36]]) {
    const post = box(0.045, 0.78, 0.045, M.steelDark);
    post.position.set(-2.2 + px, 0.41, -2.85 + pz);
    post.castShadow = true;
    group.add(post);
    const wheelC = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), M.black);
    wheelC.position.set(-2.2 + px, 0.032, -2.85 + pz);
    group.add(wheelC);
  }
  colliders.push(aabb(-2.2, 0.4, -2.85, 0.6, 0.8, 0.8));
  painting(0, 0.7, 0.55, -1.5, 1.75, -5.9, 0);

  // TRASH BIN — primary goal container
  const bin = openBin(-0.85, -5.3, 0.56, 0.52, 0.05, M.binMat, M.binBand, 'BIN');

  // =================== LIVING ROOM (+x,-z) ===================
  const rugT = rugTexture('#a8654a', '#7c4a38');
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.0),
    new THREE.MeshStandardMaterial({ map: rugT, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(3.1, 0.012, -2.7);
  rug.receiveShadow = true;
  group.add(rug);
  // couch: base + legs + seat/back cushions + arms
  solid(box(2.2, 0.3, 0.9, M.couchDark), 3.1, 0.22, -5.32, { size: [2.2, 0.44, 0.9], mat: M.couchDark });
  for (const [lx, lz] of [[2.1, -5.0], [4.1, -5.0], [2.1, -5.62], [4.1, -5.62]]) {
    const leg = cyl(0.03, 0.09, M.woodDark, 8);
    leg.position.set(lx, 0.045, lz);
    group.add(leg);
  }
  for (const cx of [2.55, 3.65]) {
    const seatC = rbox(1.04, 0.18, 0.82, 0.06, M.couch);
    seatC.position.set(cx, 0.46, -5.3);
    seatC.castShadow = true;
    group.add(seatC);
    const backC = rbox(1.04, 0.5, 0.2, 0.07, M.couch);
    backC.position.set(cx, 0.85, -5.66);
    backC.rotation.x = -0.1;
    backC.castShadow = true;
    group.add(backC);
  }
  colliders.push(aabb(3.1, 0.85, -5.66, 2.2, 0.62, 0.24));
  for (const s of [-1, 1]) {
    const arm = rbox(0.24, 0.34, 0.9, 0.08, M.couchDark);
    arm.position.set(3.1 + s * 1.2, 0.62, -5.32);
    arm.castShadow = true;
    group.add(arm);
    colliders.push(aabb(3.1 + s * 1.2, 0.62, -5.32, 0.24, 0.34, 0.9));
  }
  // coffee table: top + legs
  solid(box(1.15, 0.05, 0.6, M.woodMid), 3.1, 0.345, -3.05, { size: [1.15, 0.05, 0.6], mat: M.woodMid });
  for (const [lx, lz] of [[2.62, -3.28], [3.58, -3.28], [2.62, -2.82], [3.58, -2.82]]) {
    const leg = box(0.05, 0.32, 0.05, M.woodDark);
    leg.position.set(lx, 0.16, lz);
    leg.castShadow = true;
    group.add(leg);
  }
  colliders.push(aabb(3.1, 0.16, -3.05, 1.0, 0.32, 0.5));
  // side table by the couch — extra placement surface
  solid(cyl(0.26, 0.045, M.woodMid), 4.75, 0.475, -4.55, { size: [0.5, 0.05, 0.5], mat: M.woodMid });
  const stPole = cyl(0.035, 0.45, M.woodDark);
  stPole.position.set(4.75, 0.225, -4.55);
  group.add(stPole);
  const stBase = cyl(0.15, 0.03, M.woodDark);
  stBase.position.set(4.75, 0.015, -4.55);
  group.add(stBase);
  colliders.push(aabb(4.75, 0.24, -4.55, 0.14, 0.48, 0.14));
  // TV stand + TV
  solid(box(1.5, 0.4, 0.42, M.woodDark), 3.1, 0.2, -0.45, { size: [1.5, 0.4, 0.42], mat: M.woodDark });
  const tv = box(1.3, 0.72, 0.06, M.black);
  tv.position.set(3.1, 0.86, -0.38);
  tv.castShadow = true;
  group.add(tv);
  const tvGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x1c3048, emissive: 0x2c5d8a, emissiveIntensity: 0.8 }));
  tvGlow.position.set(3.1, 0.86, -0.345);
  tvGlow.rotation.y = Math.PI;
  group.add(tvGlow);
  colliders.push(aabb(3.1, 0.86, -0.38, 1.3, 0.72, 0.06));
  // open bookshelf on the east wall — three usable shelf boards
  const shX = 5.72;
  for (const s of [-1, 1]) {
    solid(box(0.34, 1.45, 0.045, M.woodMid), shX, 0.725, -3.6 + s * 0.55, { size: [0.34, 1.45, 0.045], mat: M.woodMid });
  }
  solid(box(0.05, 1.45, 1.14, M.woodMid), shX + 0.15, 0.725, -3.6, { size: [0.05, 1.45, 1.14], mat: M.woodMid });
  for (const sy of [0.05, 0.48, 0.9, 1.42]) {
    solid(box(0.34, 0.04, 1.14, M.woodMid), shX, sy, -3.6, { size: [0.34, 0.04, 1.14], mat: M.woodMid });
  }
  // a few static books on the top shelf
  for (let i = 0; i < 5; i++) {
    const bmat = [M.couch, M.basket, M.plantDark, M.woodDark, M.pot][i];
    const b = box(0.05, 0.3 - (i % 2) * 0.05, 0.2, bmat);
    b.position.set(shX, 1.6, -3.95 + i * 0.09);
    b.rotation.x = (i % 3) * 0.04;
    b.castShadow = true;
    group.add(b);
  }
  // floor lamp
  const lampBase = cyl(0.16, 0.03, M.lamp);
  lampBase.position.set(1.7, 0.015, -5.3);
  group.add(lampBase);
  const lampPole = cyl(0.025, 1.5, M.lamp, 10);
  lampPole.position.set(1.7, 0.78, -5.3);
  lampPole.castShadow = true;
  group.add(lampPole);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.26, 14, 1, true), M.shade);
  lampShade.position.set(1.7, 1.62, -5.3);
  group.add(lampShade);
  colliders.push(aabb(1.7, 0.75, -5.3, 0.3, 1.5, 0.3));
  plant(5.55, -0.75, 1.35);
  painting(1, 0.62, 0.62, 5.95, 1.75, -0.72, -Math.PI / 2);
  painting(3, 0.55, 0.45, 1.4, 1.8, -5.92, 0);

  // =================== BEDROOM (-x,+z) ===================
  const rug2T = rugTexture('#5e6d84', '#48546a');
  const rug2 = new THREE.Mesh(new THREE.CircleGeometry(1.05, 26),
    new THREE.MeshStandardMaterial({ map: rug2T, roughness: 1 }));
  rug2.rotation.x = -Math.PI / 2;
  rug2.position.set(-2.2, 0.012, 3.3);
  rug2.receiveShadow = true;
  group.add(rug2);
  // bed
  solid(box(1.5, 0.28, 2.1, M.woodDark), -5.1, 0.16, 3.6, { size: [1.5, 0.32, 2.1], mat: M.woodDark });
  solid(box(1.42, 0.22, 2.0, M.mattress), -5.1, 0.41, 3.6, { size: [1.42, 0.22, 2.0], mat: M.mattress });
  const duvet = rbox(1.46, 0.12, 1.35, 0.045, M.duvet);
  duvet.position.set(-5.1, 0.55, 3.95);
  duvet.castShadow = true;
  group.add(duvet);
  const duvetFold = rbox(1.46, 0.06, 0.3, 0.025, M.duvet);
  duvetFold.position.set(-5.1, 0.61, 3.36);
  group.add(duvetFold);
  for (const pz of [2.72, 3.1]) {
    const pil = rbox(0.55, 0.14, 0.32, 0.05, M.pillow);
    pil.position.set(-5.1 + (pz > 3 ? 0.02 : -0.02), 0.585, pz);
    pil.rotation.y = pz > 3 ? 0.06 : -0.04;
    pil.castShadow = true;
    group.add(pil);
  }
  solid(box(1.5, 0.75, 0.1, M.woodDark), -5.1, 0.67, 2.5, { size: [1.5, 0.75, 0.1], mat: M.woodDark });
  // nightstand + tiny lamp
  solid(box(0.45, 0.5, 0.45, M.woodMid), -5.55, 0.25, 5.1, { size: [0.45, 0.5, 0.45], mat: M.woodMid });
  const nlBase = cyl(0.07, 0.02, M.lamp);
  nlBase.position.set(-5.55, 0.51, 5.1);
  group.add(nlBase);
  const nlPole = cyl(0.014, 0.16, M.lamp, 8);
  nlPole.position.set(-5.55, 0.6, 5.1);
  group.add(nlPole);
  const nlShade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.12, 12, 1, true), M.shade);
  nlShade.position.set(-5.55, 0.72, 5.1);
  group.add(nlShade);
  // wardrobe with door seams
  solid(box(1.4, 1.95, 0.55, M.counter), -2.2, 0.975, 5.6, { size: [1.4, 1.95, 0.55], mat: M.counter });
  const wSeam = box(0.015, 1.75, 0.02, M.counterTop);
  wSeam.position.set(-2.2, 0.98, 5.32);
  group.add(wSeam);
  for (const s of [-1, 1]) {
    const wh = box(0.03, 0.22, 0.03, M.steelDark);
    wh.position.set(-2.2 + s * 0.09, 1.05, 5.31);
    group.add(wh);
  }
  // desk against the interior wall (clear of the bathroom doorway at z=3)
  solid(box(1.1, 0.05, 0.55, M.woodMid), -0.65, 0.72, 1.2, { size: [1.1, 0.05, 0.55], mat: M.woodMid });
  for (const s of [-1, 1]) {
    solid(box(0.07, 0.7, 0.5, M.woodMid), -0.65 + s * 0.48, 0.35, 1.2, { size: [0.07, 0.7, 0.5], mat: M.woodMid });
  }
  const deskChair = new THREE.Group();
  const dcSeat = rbox(0.4, 0.06, 0.4, 0.02, M.couchDark);
  dcSeat.position.y = 0.45;
  const dcBack = rbox(0.4, 0.42, 0.06, 0.02, M.couchDark);
  dcBack.position.set(0, 0.68, 0.18);
  const dcPole = cyl(0.03, 0.42, M.lamp, 8);
  dcPole.position.y = 0.22;
  const dcBase = cyl(0.2, 0.03, M.lamp);
  dcBase.position.y = 0.015;
  deskChair.add(dcSeat, dcBack, dcPole, dcBase);
  deskChair.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  deskChair.position.set(-0.7, 0, 1.85);
  deskChair.rotation.y = Math.PI + 0.2;
  group.add(deskChair);
  colliders.push(aabb(-0.7, 0.3, 1.85, 0.42, 0.6, 0.42));

  // LAUNDRY BASKET — second goal container
  const basket = openBin(-0.95, 5.25, 0.52, 0.42, 0.045, M.basket, M.basketRim, 'BASKET', { slats: true });

  plant(-5.6, 0.65, 1.1);
  painting(2, 0.5, 0.66, -5.95, 1.75, 4.35, Math.PI / 2);
  painting(1, 0.55, 0.55, -0.72, 1.8, 5.92, Math.PI);

  // =================== BATHROOM (+x,+z) ===================
  // tub + faucet
  solid(box(1.7, 0.55, 0.8, M.porcelain), 5.0, 0.275, 4.8, { size: [1.7, 0.55, 0.8], mat: M.porcelain });
  const tubIn = box(1.5, 0.1, 0.6, new THREE.MeshStandardMaterial({ color: 0xbdd3d6, roughness: 0.25 }));
  tubIn.position.set(5.0, 0.56, 4.8);
  group.add(tubIn);
  const tubFaucet = box(0.06, 0.2, 0.06, M.steel);
  tubFaucet.position.set(5.72, 0.68, 4.8);
  group.add(tubFaucet);
  const tubSpout = box(0.14, 0.04, 0.04, M.steel);
  tubSpout.position.set(5.62, 0.75, 4.8);
  group.add(tubSpout);
  // pedestal sink + mirror
  solid(cyl(0.12, 0.75, M.porcelain), 3.2, 0.375, 5.55, { size: [0.24, 0.75, 0.24], mat: M.porcelain });
  solid(box(0.55, 0.12, 0.45, M.porcelain), 3.2, 0.81, 5.5, { size: [0.55, 0.12, 0.45], mat: M.porcelain });
  const sFaucet = box(0.04, 0.14, 0.04, M.steel);
  sFaucet.position.set(3.2, 0.93, 5.68);
  group.add(sFaucet);
  const mirrorF = box(0.56, 0.72, 0.03, M.woodMid);
  mirrorF.position.set(3.2, 1.72, 5.9);
  group.add(mirrorF);
  const mirror = box(0.48, 0.64, 0.035, M.mirror);
  mirror.position.set(3.2, 1.72, 5.895);
  group.add(mirror);
  // toilet with tank + button
  solid(cyl(0.21, 0.4, M.porcelain), 4.6, 0.2, 5.5, { size: [0.42, 0.4, 0.42], mat: M.porcelain });
  solid(box(0.42, 0.55, 0.2, M.porcelain), 4.6, 0.62, 5.78, { size: [0.42, 0.55, 0.2], mat: M.porcelain });
  const tankLid = box(0.46, 0.04, 0.24, M.white);
  tankLid.position.set(4.6, 0.91, 5.78);
  group.add(tankLid);
  const flushBtn = cyl(0.03, 0.015, M.steelDark, 10);
  flushBtn.position.set(4.6, 0.935, 5.78);
  group.add(flushBtn);
  const seat = cyl(0.24, 0.05, M.white);
  seat.position.set(4.6, 0.42, 5.5);
  seat.castShadow = true;
  group.add(seat);
  // low bench — extra placement surface, with folded static towels
  solid(box(0.9, 0.05, 0.4, M.woodMid), 5.5, 0.42, 2.55, { size: [0.9, 0.05, 0.4], mat: M.woodMid });
  for (const s of [-1, 1]) {
    solid(box(0.07, 0.4, 0.36, M.woodMid), 5.5 + s * 0.38, 0.2, 2.55, { size: [0.07, 0.4, 0.36], mat: M.woodMid });
  }
  const foldedTowel = rbox(0.3, 0.09, 0.24, 0.03, new THREE.MeshStandardMaterial({ color: 0xa8cfd0, roughness: 1 }));
  foldedTowel.position.set(5.65, 0.49, 2.55);
  foldedTowel.castShadow = true;
  group.add(foldedTowel);
  // towel ring by the sink
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 18), M.steelDark);
  ring.position.set(2.45, 1.25, 5.92);
  group.add(ring);
  const hungTowel = rbox(0.22, 0.4, 0.03, 0.012, new THREE.MeshStandardMaterial({ color: 0xe2d7b8, roughness: 1 }));
  hungTowel.position.set(2.45, 1.05, 5.88);
  group.add(hungTowel);
  // bath mat
  const mat3 = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6),
    new THREE.MeshStandardMaterial({ map: rugTexture('#9fc0bb', '#7fa09b'), roughness: 1 }));
  mat3.rotation.x = -Math.PI / 2;
  mat3.position.set(4.2, 0.012, 3.5);
  group.add(mat3);
  plant(0.6, 5.5, 0.95);
  painting(2, 0.45, 0.58, 0.7, 1.8, 0.11, 0);

  return [bin, basket];
}
