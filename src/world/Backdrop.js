import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, polygon, cylinder, cone, sphere, arcPoints, extrudeProfile, setVertexColor, prepareForMerge } from './geo.js';
import { CHURCH, BELL_TOWER, STREETS } from './layout.js';
import { makeRng } from './util.js';

/**
 * Everything beyond the playable town: earth under the whole town block, a quay/cliff edge dropping to
 * the sea, ~80 simple distant houses with terracotta roofs (one vertex-colored draw call), cypress
 * silhouettes, hazy headland hills, plus the church + bell tower that close the NE street vista.
 */
export function buildBackdrop(ctx) {
  const { mats, batch, rng } = ctx;

  // Earth under everything (hidden below paving where paved; shows as dirt behind buildings).
  const R = 135;
  const land = mats.pbr('dirt_floor', { tile: 6, color: new THREE.Color(0.72, 0.74, 0.55), noShadow: true }, 'land');
  batch.add(land, polygon(arcPoints(0, 0, R, 0, Math.PI * 2, 96).slice(0, -1), [], -0.03), [1, 1, 1]);
  // Quay wall down to the sea, and the sea itself.
  batch.add(mats.pbr('sandstone_blocks_05', { tile: 4, noShadow: true }, 'quay'), cylinder(R, R, 4.5, 96, { y: -2.25, open: true }), [0.9, 0.88, 0.82]);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), mats.sea);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -4.2;
  sea.name = 'Sea';
  sea.receiveShadow = false;
  ctx.root.add(sea);

  // Distant town: houses in a ring beyond the playable streets (kept out of the street corridors).
  const inCorridor = (x, z) => STREETS.some((s) => (s.axis === 'z' ? x > s.x0 - 3 && x < s.x1 + 3 && z > s.z0 - 40 && z < s.z1 + 40 : z > s.z0 - 3 && z < s.z1 + 3 && x > s.x0 - 40 && x < s.x1 + 40));
  const plasters = [
    [0.86, 0.78, 0.62],
    [0.92, 0.88, 0.8],
    [0.85, 0.68, 0.58],
    [0.9, 0.82, 0.55],
    [0.95, 0.93, 0.88],
    [0.78, 0.7, 0.6],
  ];
  const roofCol = [0.55, 0.28, 0.16];
  let placed = 0;
  for (let i = 0; i < 400 && placed < 90; i++) {
    const ang = rng.range(0, Math.PI * 2);
    const rad = rng.range(58, 122);
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (inCorridor(x, z)) continue;
    if (Math.abs(x) < 50 && z < 52 && z > -66) continue; // inside the town block
    const w = rng.range(7, 14);
    const d = rng.range(6, 11);
    const h = rng.range(6, 12);
    const rot = rng.range(-0.3, 0.3) + Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
    distantHouse(batch, mats, x, z, w, d, h, rot, rng.pick(plasters), roofCol, rng);
    placed++;
  }
  // Cypress trees among the distant houses.
  for (let i = 0; i < 40; i++) {
    const ang = rng.range(0, Math.PI * 2);
    const rad = rng.range(60, 120);
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (inCorridor(x, z)) continue;
    const h = rng.range(6, 10);
    batch.add(mats.distant, cone(1.1, h, 7, { x, y: h / 2, z }), [0.16, 0.24, 0.14]);
  }

  // Headland hills: clusters of flattened ellipsoids far away (a main mass plus offset shoulders so the
  // ridge line is not a row of identical domes); fog turns them into hazy silhouettes. One merged mesh.
  const hills = [
    [-260, -30, -520, 340, 95, 220],
    [120, -40, -560, 300, 80, 200],
    [-540, -20, -140, 280, 70, 180],
    [-420, -25, 300, 260, 60, 170],
    [420, -50, -420, 320, 70, 200],
  ];
  const hillParts = [];
  const hrng = makeRng(9001); // local stream: keeps the house/cypress placement above stable
  for (const [x, y, z, sx, sy, sz] of hills) {
    hillParts.push(sphere(1, { x, y, z, sx, sy, sz, seg: 24 }));
    // Shoulders: lower, narrower lobes pushed to either side along the ridge.
    const n = 2 + hrng.int(0, 1);
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const k = hrng.range(0.45, 0.75);
      const dx = side * sx * hrng.range(0.55, 0.9);
      const dz = sz * hrng.range(-0.35, 0.35);
      hillParts.push(sphere(1, { x: x + dx, y: y - sy * 0.1, z: z + dz, sx: sx * k, sy: sy * hrng.range(0.55, 0.85), sz: sz * k, seg: 20 }));
    }
    // A distinct peak on the main mass, offset from centre.
    hillParts.push(sphere(1, { x: x + sx * hrng.range(-0.3, 0.3), y: y + sy * 0.15, z: z + sz * hrng.range(-0.2, 0.2), sx: sx * 0.4, sy: sy * 1.05, sz: sz * 0.4, seg: 20 }));
  }
  const hillGeo = mergeGeometries(hillParts.map(prepareForMerge));
  const hillMesh = new THREE.Mesh(hillGeo, mats.hill);
  hillMesh.name = 'Hills';
  hillMesh.castShadow = false;
  hillMesh.receiveShadow = false;
  hillMesh.frustumCulled = false;
  ctx.root.add(hillMesh);

  buildChurch(ctx);
}

function distantHouse(batch, mats, x, z, w, d, h, rot, plaster, roofCol, rng) {
  const M = new THREE.Matrix4().makeRotationY(rot).premultiply(new THREE.Matrix4().makeTranslation(x, 0, z));
  const body = box(w, h, d, { y: h / 2 });
  // Slight vertical gradient (darker base) + window pattern via darker vertex color is too coarse; keep tint.
  setVertexColor(body, (bx, by) => plaster.map((c) => c * (0.78 + 0.22 * Math.min(1, by / 3))));
  body.applyMatrix4(M);
  batch.add(mats.distant, body, null);
  const pitch = 0.42;
  const o = 0.5;
  const rise = (d / 2 + o) * pitch;
  for (const s of [-1, 1]) {
    const g = box(w + 2 * o, 0.12, (d / 2 + o) / Math.cos(Math.atan(pitch)), { y: h + rise / 2, z: (s * (d / 2 + o)) / 2, rotX: -s * Math.atan(pitch) });
    g.applyMatrix4(M);
    batch.add(mats.distant, g, roofCol.map((c) => c * rng.range(0.85, 1.1)));
  }
  const gable = extrudeProfile([[-d / 2, h - 0.01], [d / 2, h - 0.01], [0, h + rise - 0.05]], w, { rotY: Math.PI / 2 });
  gable.applyMatrix4(M);
  batch.add(mats.distant, gable, plaster);
  if (rng.chance(0.4)) {
    const c = box(0.6, 1.2, 0.6, { x: rng.range(-w / 3, w / 3), y: h + rise * 0.7, z: 0 });
    c.applyMatrix4(M);
    batch.add(mats.distant, c, plaster);
  }
}

/** Church nave + bell tower at the end of the NE street. */
function buildChurch(ctx) {
  const { mats, batch, addBoxCollider } = ctx;
  const C = CHURCH;
  const T = BELL_TOWER;
  // painted_plaster_wall: mottled lime render (plastered_wall_02 carries panel seams that read as stripes).
  const wall = mats.wall('painted_plaster_wall');
  const tint = [1.14, 1.08, 0.95];
  const M = new THREE.Matrix4().makeTranslation(C.x, 0, C.z);
  const add = (mat, geo, color) => {
    geo.applyMatrix4(M);
    batch.add(mat, geo, color);
  };
  // Nave body (stops 0.45 m short of the facade) + a separate 0.45 m front wall with the portal and rose
  // window cut through it, so the recessed door and glass sit in real openings.
  const wallT = 0.45;
  const body = box(C.w, C.height, C.d - wallT, { y: C.height / 2, z: -wallT / 2 });
  setVertexColor(body, (x, y) => tint.map((c) => c * (0.72 + 0.28 * Math.min(1, y / 2.5))));
  add(wall, body, null);
  {
    // Door hole: rectangle + semicircular head, 20 cm larger than the stone reveal that lines it. The hole
    // must stay strictly inside the outer contour (earcut drops holes that touch the boundary), so it
    // starts 2 cm above the ground; the threshold stone hides that sliver.
    const pw0 = 3.2;
    const ph0 = 5.2;
    const r0 = pw0 / 2 + 0.2;
    const ys = ph0 - pw0 / 2;
    const door = [[-r0, 0.02], [r0, 0.02], [r0, ys]];
    for (let i = 1; i < 18; i++) {
      const a = (i / 18) * Math.PI;
      door.push([Math.cos(a) * r0, ys + Math.sin(a) * r0]);
    }
    door.push([-r0, ys]);
    const rose = [];
    for (let i = 0; i < 32; i++) rose.push([Math.cos((i / 32) * Math.PI * 2) * 1.12, ph0 + 2.9 + Math.sin((i / 32) * Math.PI * 2) * 1.12]);
    const front = extrudeProfile([[-C.w / 2, 0], [C.w / 2, 0], [C.w / 2, C.height], [-C.w / 2, C.height]], wallT, { z: C.d / 2 - wallT / 2, holes: [door, rose] });
    setVertexColor(front, (x, y) => tint.map((c) => c * (0.72 + 0.28 * Math.min(1, y / 2.5))));
    add(wall, front, null);
  }
  // Stone base band (sides/back, plus two front segments that stop clear of the portal jambs), four
  // pilasters framing the corners and the central bay, cornice.
  add(mats.sandstone, box(C.w + 0.2, 1.4, C.d - 0.4, { y: 0.7, z: -0.3 }), [1, 1, 1]);
  {
    const segW = C.w / 2 + 0.1 - 2.75;
    for (const s of [-1, 1]) add(mats.sandstone, box(segW, 1.4, 0.6, { x: s * (C.w / 2 + 0.1 - segW / 2), y: 0.7, z: C.d / 2 - 0.2 }), [1, 1, 1]);
  }
  for (const px of [-C.w / 2 + 0.35, -4.6, 4.6, C.w / 2 - 0.35]) add(mats.trimStone, box(0.7, C.height, 0.3, { x: px, y: C.height / 2, z: C.d / 2 + 0.05 }), [1.02, 1.0, 0.96]);
  add(mats.trimStone, box(C.w + 0.6, 0.4, C.d + 0.6, { y: C.height - 0.2 }), [1.02, 1.0, 0.96]);
  // Portal: a real recess (dark reveal walls + soffit), stepped stone arch orders, a two-leaf timber door
  // with a fanlight, three steps; rose window above with a stone ring, tracery spokes and dark glass.
  const pw = 3.2;
  const ph = 5.2;
  const r = pw / 2;
  const zf = C.d / 2; // facade plane
  const reveal = wallT; // door sits at the back of the wall opening
  // Reveal walls and arched soffit (stone, in shadow) and the recessed back plane carrying the door.
  const revealTint = [0.78, 0.76, 0.72];
  add(mats.sandstone, box(0.2, ph - r, reveal, { x: -r - 0.1, y: (ph - r) / 2, z: zf - reveal / 2 + 0.01 }), revealTint);
  add(mats.sandstone, box(0.2, ph - r, reveal, { x: r + 0.1, y: (ph - r) / 2, z: zf - reveal / 2 + 0.01 }), revealTint);
  const soffit = [];
  for (let i = 0; i <= 18; i++) soffit.push([Math.cos((i / 18) * Math.PI) * (r + 0.2), ph - r + Math.sin((i / 18) * Math.PI) * (r + 0.2)]);
  for (let i = 18; i >= 0; i--) soffit.push([Math.cos((i / 18) * Math.PI) * r, ph - r + Math.sin((i / 18) * Math.PI) * r]);
  add(mats.sandstone, extrudeProfile(soffit, reveal, { z: zf - reveal / 2 + 0.01 }), revealTint);
  // Threshold stone level with the top step, then the door leaves (dark varnished timber, vertical boards,
  // rails and iron studs) and the fanlight glass above.
  const sill = 0.48;
  add(mats.trimStone, box(pw + 0.4, sill, reveal + 0.02, { y: sill / 2, z: zf - reveal / 2 }), [0.98, 0.96, 0.92]);
  const doorH = ph - r - sill;
  const dy = sill + doorH / 2;
  add(mats.woodBrown, box(pw, doorH, 0.12, { y: dy, z: zf - reveal + 0.06 }), [0.34, 0.24, 0.15]);
  for (let x = -r + 0.4; x < r; x += 0.4) add(mats.woodBrown, box(0.03, doorH - 0.1, 0.02, { x, y: dy, z: zf - reveal + 0.13 }), [0.22, 0.15, 0.09]);
  add(mats.woodBrown, box(0.06, doorH, 0.03, { y: dy, z: zf - reveal + 0.135 }), [0.22, 0.15, 0.09]);
  for (const yy of [sill + 0.6, dy, sill + doorH - 0.5]) add(mats.woodBrown, box(pw - 0.1, 0.16, 0.03, { y: yy, z: zf - reveal + 0.135 }), [0.26, 0.18, 0.11]);
  for (const s of [-1, 1]) add(mats.iron, sphere(0.06, { x: s * 0.28, y: sill + 1.0, z: zf - reveal + 0.16, seg: 8 }), [1, 1, 1]);
  const spring = ph - r; // springing line of the arch = top of the door leaves
  const fan = [[-r + 0.02, spring]];
  for (let i = 0; i <= 14; i++) fan.push([Math.cos((i / 14) * Math.PI) * (r - 0.02), spring + Math.sin((i / 14) * Math.PI) * (r - 0.02)]);
  add(mats.glass, extrudeProfile(fan, 0.03, { z: zf - reveal + 0.1 }), null);
  add(mats.interior, extrudeProfile(fan, 0.02, { z: zf - reveal + 0.05 }), null);
  for (let i = 1; i < 5; i++) {
    const a = (i / 5) * Math.PI;
    add(mats.iron, cylinder(0.02, 0.02, r - 0.04, 5, { x: (Math.cos(a) * (r - 0.04)) / 2, y: spring + (Math.sin(a) * (r - 0.04)) / 2, z: zf - reveal + 0.12, rotZ: a - Math.PI / 2, open: true }), [1, 1, 1]);
  }
  // Two stone arch orders + jambs framing the recess, and a keystone.
  const arch = (r0, r1, depth, zc) => {
    const p = [];
    for (let i = 0; i <= 18; i++) p.push([Math.cos((i / 18) * Math.PI) * r1, ph - r + Math.sin((i / 18) * Math.PI) * r1]);
    for (let i = 18; i >= 0; i--) p.push([Math.cos((i / 18) * Math.PI) * r0, ph - r + Math.sin((i / 18) * Math.PI) * r0]);
    return extrudeProfile(p, depth, { z: zc });
  };
  add(mats.trimStone, arch(r + 0.16, r + 0.5, 0.35, zf + 0.1), [1.02, 1.0, 0.96]);
  add(mats.trimStone, arch(r + 0.5, r + 0.8, 0.2, zf + 0.02), [0.96, 0.94, 0.9]);
  add(mats.trimStone, box(0.5, ph - r, 0.35, { x: -r - 0.41, y: (ph - r) / 2, z: zf + 0.1 }), [1.02, 1.0, 0.96]);
  add(mats.trimStone, box(0.5, ph - r, 0.35, { x: r + 0.41, y: (ph - r) / 2, z: zf + 0.1 }), [1.02, 1.0, 0.96]);
  add(mats.trimStone, box(0.3, ph - r, 0.2, { x: -r - 0.81, y: (ph - r) / 2, z: zf + 0.02 }), [0.96, 0.94, 0.9]);
  add(mats.trimStone, box(0.3, ph - r, 0.2, { x: r + 0.81, y: (ph - r) / 2, z: zf + 0.02 }), [0.96, 0.94, 0.9]);
  add(mats.trimStone, box(0.42, 0.7, 0.42, { y: ph + 0.5, z: zf + 0.14 }), [1.04, 1.02, 0.98]);
  // Steps up to the door.
  for (let i = 0; i < 3; i++) add(mats.trimStone, box(pw + 2.2 - i * 0.5, 0.16, 1.5 - i * 0.45, { y: 0.08 + i * 0.16, z: zf + 0.75 - i * 0.225 }), [0.98, 0.96, 0.92]);
  addBoxCollider(C.x, 0.24, C.z + zf + 0.6, (pw + 2.2) / 2, 0.24, 0.75, 'stone');
  // Rose window: recessed dark glass disc, stone ring with a chamfer, eight tracery spokes and a hub.
  const ry = ph + 2.9;
  add(mats.glass, cylinder(1.05, 1.05, 0.05, 24, { y: ry, z: zf - 0.25, rotX: Math.PI / 2 }), null);
  add(mats.interior, cylinder(1.05, 1.05, 0.04, 24, { y: ry, z: zf - 0.3, rotX: Math.PI / 2 }), null);
  add(mats.sandstone, cylinder(1.1, 1.1, 0.3, 24, { y: ry, z: zf - 0.15, rotX: Math.PI / 2, open: true }), revealTint);
  add(mats.trimStone, cylinder(1.45, 1.35, 0.32, 24, { y: ry, z: zf + 0.1, rotX: Math.PI / 2, open: true }), [1.02, 1.0, 0.96]);
  const ringFace = new THREE.RingGeometry(1.1, 1.45, 24);
  ringFace.translate(0, ry, zf + 0.26);
  add(mats.trimStone, ringFace, [1.04, 1.02, 0.98]);
  for (let i = 0; i < 8; i++) add(mats.trimStone, box(0.08, 2.05, 0.1, { y: ry, z: zf - 0.2, rotZ: (i * Math.PI) / 8 }), [0.98, 0.96, 0.92]);
  add(mats.trimStone, cylinder(0.22, 0.22, 0.12, 12, { y: ry, z: zf - 0.2, rotX: Math.PI / 2 }), [0.98, 0.96, 0.92]);
  // Roof (gable along X)
  const pitch = 26 * (Math.PI / 180);
  const o = 0.6;
  const half = C.d / 2 + o;
  const rise = half * Math.tan(pitch);
  for (const s of [-1, 1]) add(mats.roofTiles, box(C.w + 2 * o, 0.12, half / Math.cos(pitch), { y: C.height + rise / 2 + 0.05, z: (s * half) / 2, rotX: -s * pitch }), [1, 1, 1]);
  add(mats.roofTiles, box(C.w + 2 * o + 0.1, 0.14, 0.34, { y: C.height + rise + 0.1 }), [0.9, 0.9, 0.9]);
  // Gable ends: triangle in the (z, y) plane extruded along the nave (rotateY(π/2) maps profile x → world z).
  const gableEnd = extrudeProfile([[-C.d / 2, C.height - 0.01], [C.d / 2, C.height - 0.01], [0, C.height + (C.d / 2) * Math.tan(pitch) + 0.25]], C.w, { rotY: Math.PI / 2 });
  setVertexColor(gableEnd, tint);
  add(wall, gableEnd, null);
  addBoxCollider(C.x, C.height / 2, C.z, C.w / 2, C.height / 2, C.d / 2, 'plaster');

  // Bell tower
  const Mt = new THREE.Matrix4().makeTranslation(T.x, 0, T.z);
  const addT = (mat, geo, color) => {
    geo.applyMatrix4(Mt);
    batch.add(mat, geo, color);
  };
  const s = T.size;
  const shaft = box(s, T.height, s, { y: T.height / 2 });
  setVertexColor(shaft, (x, y) => [1.0, 0.97, 0.9].map((c) => c * (0.75 + 0.25 * Math.min(1, y / 3))));
  addT(mats.sandstone, shaft, null);
  for (const yy of [T.height * 0.35, T.height * 0.62, T.height - 5.2, T.height - 0.3]) addT(mats.trimStone, box(s + 0.5, 0.35, s + 0.5, { y: yy }), [1.02, 1.0, 0.96]);
  // Belfry openings (arched, dark) on all four faces with stone surrounds and a bell inside.
  const by = T.height - 3.6;
  for (const ry of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
    for (const off of [-1.05, 1.05]) {
      const g = box(1.3, 2.9, 0.3, { x: off, y: by, z: s / 2 - 0.1 });
      g.rotateY(ry);
      addT(mats.iron, g, [0.08, 0.08, 0.09]);
      const cap = cylinder(0.65, 0.65, 0.3, 16, { x: off, y: by + 1.45, z: s / 2 - 0.1, rotX: Math.PI / 2 });
      cap.rotateY(ry);
      addT(mats.iron, cap, [0.08, 0.08, 0.09]);
      const surround = box(1.7, 3.4, 0.14, { x: off, y: by + 0.1, z: s / 2 + 0.02 });
      surround.rotateY(ry);
      addT(mats.trimStone, surround, [1.02, 1.0, 0.96]);
      const inner = box(1.3, 3.0, 0.16, { x: off, y: by + 0.1, z: s / 2 + 0.03 });
      inner.rotateY(ry);
      addT(mats.iron, inner, [0.08, 0.08, 0.09]);
    }
  }
  addT(mats.bronze, cylinder(0.45, 0.62, 0.9, 14, { y: by + 0.4 }), null);
  addT(mats.bronze, sphere(0.2, { y: by - 0.15, seg: 8 }), null);
  // Clock face on the street-facing side, pyramid roof, cross.
  addT(mats.trimStone, cylinder(1.15, 1.15, 0.2, 24, { y: T.height * 0.5, z: s / 2 + 0.05, rotX: Math.PI / 2 }), [1.05, 1.02, 0.98]);
  addT(mats.iron, cylinder(0.95, 0.95, 0.1, 24, { y: T.height * 0.5, z: s / 2 + 0.16, rotX: Math.PI / 2 }), [0.95, 0.93, 0.85]);
  addT(mats.iron, box(0.08, 0.75, 0.04, { y: T.height * 0.5 + 0.3, z: s / 2 + 0.23 }), [0.05, 0.05, 0.05]);
  addT(mats.iron, box(0.55, 0.08, 0.04, { x: 0.22, y: T.height * 0.5, z: s / 2 + 0.23 }), [0.05, 0.05, 0.05]);
  addT(mats.roofTiles, cone(s * 0.78, 4.2, 4, { y: T.height + 2.1, rotY: Math.PI / 4 }), [1, 1, 1]);
  addT(mats.iron, box(0.1, 1.6, 0.1, { y: T.height + 4.9 }), [0.1, 0.1, 0.1]);
  addT(mats.iron, box(0.9, 0.1, 0.1, { y: T.height + 5.2 }), [0.1, 0.1, 0.1]);
  addBoxCollider(T.x, T.height / 2, T.z, s / 2, T.height / 2, s / 2, 'stone');
}
