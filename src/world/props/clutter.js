// Small clutter prop library — owner: fable3a. Everything here is meant to be
// placed with tiny:true (distance-culled clutter bucket), except crate_stack
// (which is cover-sized and gets a collider). Deterministic via the passed rng.

import * as THREE from 'three';
import { registerProp } from './index.js';
import {
  box, cyl, sph, torus, tube, C, print, getBottleMat,
} from './electronics.js';

function G(assetId, colliders) {
  const g = new THREE.Group();
  g.userData.assetId = assetId;
  if (colliders) g.userData.colliders = colliders;
  return g;
}

const BINDER_COLORS = [0x3e5a78, 0x7a5438, 0x4a5d4a, 0x777d85, 0x8a7a4a];
const NOTE_COLORS = [0xe8d264, 0x9fd7f0, 0xe8a0a0, 0xa9dca0];

registerProp('paper_sheet', (opts, rng) => {
  const g = G('CLUT-001');
  print(g, 0.21, 0.297, 'paper', 0, 0.002, 0, { rx: -Math.PI / 2, ry: 0 });
  g.children[0].rotation.z = rng.range(0, Math.PI * 2);
  if (rng.chance(0.4)) {
    const p2 = print(g, 0.21, 0.297, 'paper', 0.06, 0.004, 0.04, { rx: -Math.PI / 2 });
    p2.rotation.z = rng.range(0, Math.PI * 2);
  }
  return g;
});

registerProp('paper_stack', (opts, rng) => {
  const g = G('CLUT-002');
  const h = rng.range(0.02, 0.08);
  box(g, 'paper', 0.22, h, 0.31, 0, h / 2 + 0.002, 0, { ry: rng.range(-0.15, 0.15) });
  print(g, 0.2, 0.28, 'paper', 0, h + 0.005, 0, { rx: -Math.PI / 2 });
  if (rng.chance(0.5)) box(g, 'paper', 0.21, 0.02, 0.3, 0.03, h + 0.014, 0.02, { ry: rng.range(-0.4, 0.4) });
  return g;
});

registerProp('folder_stack', (opts, rng) => {
  const g = G('CLUT-003');
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    box(g, null, 0.24, 0.012, 0.32, rng.range(-0.02, 0.02), 0.008 + i * 0.013, rng.range(-0.02, 0.02),
      { ry: rng.range(-0.25, 0.25), tint: rng.chance(0.7) ? 0xd9c48f : BINDER_COLORS[rng.int(0, 4)] });
  }
  return g;
});

registerProp('binder_row', (opts, rng) => {
  const g = G('CLUT-004');
  const n = opts.n || rng.int(3, 5);
  for (let i = 0; i < n; i++) {
    const lean = i === n - 1 && rng.chance(0.5);
    box(g, null, 0.055, 0.3, 0.27, -((n - 1) * 0.045) + i * 0.09, 0.152, 0,
      { tint: BINDER_COLORS[rng.int(0, 4)], rz: lean ? -0.16 : 0 });
  }
  return g;
});

registerProp('notebook_pen', (opts, rng) => {
  const g = G('CLUT-005');
  box(g, null, 0.15, 0.014, 0.21, 0, 0.009, 0, { ry: rng.range(-0.4, 0.4), tint: 0x2e3d52 });
  box(g, 'paper', 0.14, 0.004, 0.2, 0.004, 0.018, 0.004, { ry: rng.range(-0.4, 0.4) });
  cyl(g, null, 0.005, 0.005, 0.135, 0.09, 0.008, 0.04, { rz: Math.PI / 2, ry: rng.range(0, 3), tint: 0x22262a, seg: 6 });
  return g;
});

registerProp('pen_cup', (opts, rng) => {
  const g = G('CLUT-006');
  cyl(g, 'plastic_dark', 0.042, 0.038, 0.105, 0, 0.052, 0, { seg: 10 });
  cyl(g, 'plastic_dark', 0.035, 0.035, 0.006, 0, 0.104, 0, { seg: 10 });
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    const p = cyl(g, null, 0.0045, 0.0045, 0.15, rng.range(-0.02, 0.02), 0.13, rng.range(-0.02, 0.02),
      { tint: [0x22262a, 0x2d4a63, 0xb8452f, 0x3a5a44][rng.int(0, 3)], seg: 5 });
    p.rotation.set(rng.range(-0.18, 0.18), 0, rng.range(-0.18, 0.18));
  }
  return g;
});

registerProp('stapler', (opts, rng) => {
  const g = G('CLUT-007');
  box(g, 'metal_dark', 0.15, 0.018, 0.038, 0, 0.011, 0);
  const top = box(g, null, 0.15, 0.022, 0.034, -0.004, 0.032, 0, { tint: rng.chance(0.5) ? 0x22262a : 0x2d4a63 });
  top.rotation.z = 0.06;
  return g;
});

registerProp('tape_dispenser', () => {
  const g = G('CLUT-008');
  box(g, null, 0.13, 0.05, 0.042, 0, 0.027, 0, { tint: 0x30353b });
  torus(g, null, 0.032, 0.011, 0.012, 0.055, 0, { tint: 0x8a8f94, tseg: 5, seg: 10 });
  return g;
});

registerProp('mug', (opts, rng) => {
  const g = G('CLUT-009');
  const color = opts.color || (rng.chance(0.5) ? 0x8a4a3e : 0x3e5a78);
  cyl(g, null, 0.042, 0.04, 0.098, 0, 0.049, 0, { tint: color, seg: 12 });
  cyl(g, null, 0.036, 0.036, 0.006, 0, 0.097, 0, { tint: 0x2a1c14, seg: 12 });
  const ry = rng.range(0, Math.PI * 2);
  torus(g, null, 0.028, 0.008, Math.sin(ry) * 0.048, 0.05, Math.cos(ry) * 0.048, { tint: color, ry });
  return g;
});

registerProp('coffee_cup', (opts, rng) => {
  const g = G('CLUT-010');
  cyl(g, 'plastic_light', 0.041, 0.031, 0.115, 0, 0.058, 0, { seg: 10 });
  cyl(g, 'cardboard', 0.0425, 0.0405, 0.045, 0, 0.062, 0, { seg: 10 });
  cyl(g, 'plastic_dark', 0.043, 0.041, 0.014, 0, 0.122, 0, { seg: 10 });
  cyl(g, 'plastic_dark', 0.012, 0.016, 0.006, 0, 0.132, 0, { seg: 8 });
  if (rng.chance(0.3)) g.children.forEach((m) => { m.rotation.x = 1.45; m.position.y = 0.042; m.position.z += 0.04; }); // knocked over
  return g;
});

registerProp('water_bottle', (opts, rng) => {
  const g = G('CLUT-011');
  const m = cyl(g, getBottleMat(), 0.031, 0.033, 0.19, 0, 0.098, 0, { seg: 10 });
  m.castShadow = false;
  cyl(g, getBottleMat(), 0.015, 0.028, 0.025, 0, 0.205, 0, { seg: 10 });
  cyl(g, null, 0.016, 0.016, 0.02, 0, 0.226, 0, { tint: rng.chance(0.5) ? 0x3e7ea6 : 0xd6d8d2, seg: 8 });
  cyl(g, null, 0.032, 0.034, 0.055, 0, 0.09, 0, { tint: 0x7fa8c4, seg: 10 });
  return g;
});

registerProp('photo_frame', (opts, rng) => {
  const g = G('CLUT-012');
  const fr = new THREE.Group();
  box(fr, 'wood_dark', 0.15, 0.19, 0.01, 0, 0.095, 0);
  print(fr, 0.126, 0.166, 'photo', 0, 0.095, 0.0065);
  fr.rotation.x = -0.16;
  fr.rotation.y = rng.range(-0.3, 0.3);
  g.add(fr);
  return g;
});

registerProp('sticky_cluster', (opts, rng) => {
  // colored notes for vertical surfaces (panels, monitors). Pivot = cluster
  // center; place with explicit y and rot facing out of the surface (+Z).
  const g = G('CLUT-013');
  const n = opts.n || rng.int(4, 8);
  for (let i = 0; i < n; i++) {
    const note = box(g, null, 0.055, 0.055, 0.003,
      rng.range(-0.16, 0.16), rng.range(-0.12, 0.12), 0,
      { tint: NOTE_COLORS[rng.int(0, 3)] });
    note.rotation.z = rng.range(-0.2, 0.2);
  }
  return g;
});

registerProp('desk_organizer', (opts, rng) => {
  const g = G('CLUT-014');
  box(g, 'plastic_dark', 0.25, 0.008, 0.32, 0, 0.006, 0);
  for (const s of [-1, 1]) {
    box(g, 'plastic_dark', 0.008, 0.05, 0.32, s * 0.121, 0.03, 0);
    box(g, 'plastic_dark', 0.25, 0.05, 0.008, 0, 0.03, s * 0.156);
  }
  box(g, 'plastic_dark', 0.25, 0.04, 0.008, 0, 0.025, 0);
  box(g, 'paper', 0.21, rng.range(0.015, 0.04), 0.28, 0, 0.03, 0.005, { ry: rng.range(-0.06, 0.06) });
  return g;
});

registerProp('id_badge', (opts, rng) => {
  const g = G('CLUT-015');
  const badge = print(g, 0.06, 0.09, 'badge', 0, 0.004, 0, { rx: -Math.PI / 2 });
  badge.rotation.z = rng.range(0, Math.PI * 2);
  tube(g, null, [[0.02, 0.006, 0.05], [0.1, 0.008, 0.02], [0.14, 0.006, 0.09], [0.05, 0.008, 0.13]],
    0.004, 0, 0, 0, { seg: 10, tint: 0x3e7ea6 });
  return g;
});

registerProp('backpack', (opts, rng) => {
  const g = G('CLUT-016', [C(-0.18, 0, -0.14, 0.18, 0.42, 0.14, 'carpet', { blocksSight: false })]);
  const b = new THREE.Group();
  const color = rng.chance(0.5) ? 0x37424e : 0x4a4438;
  sph(b, null, 1, 0, 0.24, 0, { sx: 0.17, sy: 0.24, sz: 0.11, tint: color, seg: 10 });
  sph(b, null, 1, 0, 0.14, 0.07, { sx: 0.13, sy: 0.12, sz: 0.07, tint: color, seg: 8 });
  box(b, null, 0.05, 0.3, 0.02, -0.06, 0.26, -0.1, { tint: 0x22262a });
  box(b, null, 0.05, 0.3, 0.02, 0.06, 0.26, -0.1, { tint: 0x22262a });
  b.rotation.x = 0.28; // slumped against whatever is behind it
  g.add(b);
  return g;
});

registerProp('briefcase', (opts, rng) => {
  const g = G('CLUT-017', [C(-0.22, 0, -0.08, 0.22, 0.34, 0.08, 'wood', { blocksSight: false })]);
  box(g, 'leather_black', 0.42, 0.3, 0.11, 0, 0.15, 0, { ry: rng.range(-0.1, 0.1) });
  torus(g, 'leather_black', 0.05, 0.011, 0, 0.31, 0, { arc: Math.PI });
  box(g, 'aluminum', 0.03, 0.015, 0.008, -0.1, 0.26, 0.058);
  box(g, 'aluminum', 0.03, 0.015, 0.008, 0.1, 0.26, 0.058);
  return g;
});

registerProp('umbrella', (opts, rng) => {
  const g = G('CLUT-018');
  const u = new THREE.Group();
  cyl(u, null, 0.028, 0.012, 0.72, 0, 0.42, 0, { tint: rng.chance(0.6) ? 0x22262a : 0x2e3d52, seg: 8 });
  cyl(u, 'aluminum', 0.005, 0.005, 0.1, 0, 0.06, 0, { seg: 6 });
  torus(u, null, 0.035, 0.007, 0.035, 0.82, 0, { arc: Math.PI, tint: 0x4a3626 });
  u.rotation.z = 0.16; // leaning into a corner
  u.position.x = -0.04;
  g.add(u);
  return g;
});

registerProp('wall_calendar', (opts, rng) => {
  const g = G('CLUT-019');
  const y = opts.y ?? 1.55;
  box(g, 'paper', 0.31, 0.43, 0.008, 0, y, 0.006);
  print(g, 0.3, 0.42, 'calendar', 0, y, 0.012);
  return g;
});

registerProp('magazine_stack', (opts, rng) => {
  const g = G('CLUT-020');
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    box(g, 'paper', 0.21, 0.008, 0.28, rng.range(-0.02, 0.02), 0.006 + i * 0.0095, rng.range(-0.02, 0.02),
      { ry: rng.range(-0.35, 0.35) });
  }
  const cover = print(g, 0.2, 0.27, rng.chance(0.5) ? 'magA' : 'magB', 0, n * 0.0095 + 0.004, 0, { rx: -Math.PI / 2 });
  cover.rotation.z = rng.range(-0.3, 0.3);
  return g;
});

registerProp('tray_decanter', (opts, rng) => {
  const g = G('CLUT-021');
  cyl(g, 'aluminum', 0.14, 0.14, 0.01, 0, 0.006, 0, { seg: 14 });
  const bm = getBottleMat();
  const body = cyl(g, bm, 0.042, 0.05, 0.13, -0.05, 0.077, 0, { seg: 10 });
  body.castShadow = false;
  cyl(g, bm, 0.013, 0.02, 0.06, -0.05, 0.17, 0, { seg: 8 });
  sph(g, bm, 0.02, -0.05, 0.21, 0, { seg: 8 });
  cyl(g, null, 0.036, 0.042, 0.07, -0.05, 0.048, 0, { tint: 0x9a6a2e, seg: 10 }); // amber fill
  for (const s of [0.05, 0.1]) {
    const gl = cyl(g, bm, 0.023, 0.02, 0.055, s, 0.038, s - 0.06, { seg: 8 });
    gl.castShadow = false;
  }
  return g;
});

function crate(g, w, h, d, x, y, z, ry, label) {
  const s = new THREE.Group();
  box(s, 'cardboard', w, h, d, 0, h / 2, 0);
  box(s, 'cardboard', w + 0.004, 0.05, 0.06, 0, h - 0.03, 0); // tape band
  if (label) print(s, 0.13, 0.17, 'paper', w * 0.12, h * 0.55, d / 2 + 0.003);
  s.position.set(x, y, z);
  s.rotation.y = ry;
  g.add(s);
}

registerProp('crate_stack', (opts, rng) => {
  // RMA / shipping crates — cover-sized, keeps a collider (place NOT tiny)
  const g = G('CLUT-022', [C(-0.45, 0, -0.35, 0.45, 0.78, 0.35, 'wood')]);
  crate(g, 0.56, 0.4, 0.5, -0.1, 0, 0, rng.range(-0.08, 0.08), true);
  crate(g, 0.5, 0.34, 0.44, -0.08, 0.4, 0.02, rng.range(-0.25, 0.1), true);
  crate(g, 0.34, 0.3, 0.36, 0.32, 0, 0.05, rng.range(-0.4, 0.4), false);
  return g;
});
