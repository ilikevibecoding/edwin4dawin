// Core office furniture prop library — owner: fable3a.
// Every factory returns a floor-pivot THREE.Group (front = +Z) with
// userData.assetId + userData.colliders (local AABBs). Shared materials only:
// getMaterial() names + the shared atlas/tint materials from electronics.js.

import * as THREE from 'three';
import { registerProp } from './index.js';
import {
  box, cyl, sph, torus, tube, C, print, screenCyl,
} from './electronics.js';

function G(assetId, colliders) {
  const g = new THREE.Group();
  g.userData.assetId = assetId;
  if (colliders) g.userData.colliders = colliders;
  return g;
}

// audit 2: lifted ~20% — the old tones crushed to black away from fixtures
const FOLIAGE = [0x527354, 0x668a58, 0x4a6a4c, 0x5f814e];

// ---------------------------------------------------------------------------
// Desks
// ---------------------------------------------------------------------------

registerProp('desk_reception', () => {
  // L-shaped reception desk, ~3.4 m main run, tall visitor counter at +Z,
  // 0.74 worktop behind, return wing on +X extending -Z.
  const g = G('FURN-001', [
    C(-1.78, 0, 0.07, 1.78, 1.10, 0.53, 'wood'),               // counter front
    C(-1.70, 0, -0.46, 1.70, 0.74, 0.07, 'wood'),              // worktop
    C(1.02, 0, -1.68, 1.70, 0.74, -0.46, 'wood'),              // return wing
  ]);
  box(g, 'wood_dark', 3.4, 1.02, 0.08, 0, 0.51, 0.38);
  box(g, 'aluminum', 3.42, 0.05, 0.012, 0, 0.9, 0.428);
  box(g, 'plastic_dark', 3.3, 0.1, 0.05, 0, 0.05, 0.36);
  box(g, 'wood', 3.56, 0.05, 0.46, 0, 1.075, 0.30);            // counter cap
  box(g, 'laminate', 3.3, 0.04, 0.7, 0, 0.72, -0.05);          // worktop
  box(g, 'wood_dark', 0.08, 1.02, 0.86, -1.66, 0.51, -0.03);   // side panels
  box(g, 'wood_dark', 0.08, 1.02, 1.28, 1.66, 0.51, -1.02);
  box(g, 'metal_painted', 0.05, 0.66, 0.6, -1.0, 0.36, -0.05); // worktop supports
  box(g, 'metal_painted', 0.05, 0.66, 0.6, 1.0, 0.36, -0.05);
  box(g, 'laminate', 0.62, 0.04, 1.22, 1.36, 0.72, -1.06);     // return top
  box(g, 'wood_dark', 0.66, 0.7, 0.06, 1.36, 0.36, -1.64);     // return end panel
  box(g, 'metal_painted', 0.05, 0.66, 1.1, 1.08, 0.34, -1.05);
  return g;
});

registerProp('desk_standard', (opts, rng) => {
  // 1.6 x 0.8 work desk, 0.75 top, modesty panel, cable grommet
  const w = opts.w || 1.6;
  const hw = w / 2;
  const g = G('FURN-002', [C(-hw, 0, -0.4, hw, 0.75, 0.4, 'wood')]);
  box(g, 'laminate', w, 0.04, 0.8, 0, 0.73, 0);
  box(g, 'metal_painted', 0.05, 0.71, 0.74, -(hw - 0.05), 0.355, 0);
  box(g, 'metal_painted', 0.05, 0.71, 0.74, hw - 0.05, 0.355, 0);
  box(g, 'metal_painted', w - 0.2, 0.34, 0.025, 0, 0.56, -0.34);
  cyl(g, 'plastic_dark', 0.035, 0.035, 0.014, (rng.chance(0.5) ? -1 : 1) * (hw - 0.32), 0.755, -0.3);
  return g;
});

registerProp('desk_exec', () => {
  // 1.9 m executive desk, dark wood, twin pedestals, leather inlay
  const g = G('FURN-003', [C(-0.96, 0, -0.48, 0.96, 0.75, 0.48, 'wood')]);
  box(g, 'wood_dark', 1.9, 0.05, 0.95, 0, 0.725, 0);
  box(g, 'wood_dark', 1.94, 0.025, 0.99, 0, 0.688, 0);         // chamfer lip
  box(g, 'leather_black', 0.95, 0.006, 0.55, 0, 0.753, -0.05);
  box(g, 'wood_dark', 0.5, 0.64, 0.86, -0.62, 0.34, 0);
  box(g, 'wood_dark', 0.5, 0.64, 0.86, 0.62, 0.34, 0);
  box(g, 'wood_dark', 0.74, 0.44, 0.04, 0, 0.46, -0.32);       // modesty
  for (const px of [-0.62, 0.62]) {
    for (const py of [0.2, 0.4, 0.56]) box(g, 'aluminum', 0.14, 0.02, 0.02, px, py, 0.44);
  }
  box(g, 'plastic_dark', 1.7, 0.05, 0.7, 0, 0.025, 0);         // plinth shadow
  return g;
});

// ---------------------------------------------------------------------------
// Task chair (shared builder used by the cubicle composite)
// ---------------------------------------------------------------------------

function buildTaskChair(parent, rng, opts = {}) {
  const exec = !!opts.exec;
  const seatMat = exec ? 'leather_black' : (opts.fabric === 'gray' ? 'fabric_gray' : 'fabric_blue');
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.32;
    const arm = box(g, 'plastic_dark', 0.05, 0.035, 0.3, Math.sin(a) * 0.155, 0.042, Math.cos(a) * 0.155, { ry: a });
    arm.rotation.x = -0.06;
    cyl(g, 'plastic_dark', 0.024, 0.024, 0.025, Math.sin(a) * 0.29, 0.02, Math.cos(a) * 0.29, { seg: 8 });
  }
  cyl(g, 'plastic_dark', 0.033, 0.04, 0.14, 0, 0.12, 0);
  cyl(g, 'steel', 0.022, 0.022, 0.26, 0, 0.3, 0, { seg: 8 });
  box(g, 'plastic_dark', 0.4, 0.03, 0.38, 0, 0.435, 0.01);
  box(g, seatMat, 0.47, 0.075, 0.45, 0, 0.475, 0.02);
  const post = box(g, 'plastic_dark', 0.05, 0.3, 0.035, 0, 0.6, -0.23);
  post.rotation.x = -0.12;
  const back = box(g, exec ? 'leather_black' : seatMat, exec ? 0.48 : 0.45, exec ? 0.66 : 0.52, 0.06, 0, exec ? 0.92 : 0.84, -0.265);
  back.rotation.x = -0.09;
  if (exec) {
    const hr = box(g, 'leather_black', 0.3, 0.14, 0.06, 0, 1.3, -0.3);
    hr.rotation.x = -0.12;
  }
  for (const s of [-1, 1]) {
    box(g, 'plastic_dark', 0.03, 0.2, 0.05, s * 0.255, 0.58, 0.02);
    box(g, 'plastic_dark', 0.09, 0.028, 0.25, s * 0.255, 0.69, 0.02);
  }
  parent.add(g);
  return g;
}

registerProp('chair_task', (opts, rng) => {
  const tipped = !!opts.tipped;
  const g = G('FURN-006', tipped
    ? [C(-0.5, 0, -0.45, 0.6, 0.5, 0.45, 'carpet', { blocksSight: false })]
    : [C(-0.3, 0, -0.32, 0.3, (opts.exec ? 1.35 : 1.1), 0.32, 'carpet', { blocksSight: false })]);
  const chair = buildTaskChair(g, rng, opts);
  if (tipped) {
    chair.rotation.z = 1.47;
    chair.rotation.y = 0.4;
    chair.position.set(0.12, 0.26, 0);
  }
  return g;
});

registerProp('chair_conf', (opts, rng) => {
  // sled-base conference chair, no arms
  const g = G('FURN-007', [C(-0.26, 0, -0.3, 0.26, 0.95, 0.3, 'carpet', { blocksSight: false })]);
  for (const s of [-1, 1]) {
    cyl(g, 'steel', 0.013, 0.013, 0.52, s * 0.21, 0.015, 0.0, { rx: Math.PI / 2, seg: 8 });
    const up = cyl(g, 'steel', 0.013, 0.013, 0.46, s * 0.21, 0.24, 0.14, { seg: 8 });
    up.rotation.x = 0.18;
    const bk = cyl(g, 'steel', 0.013, 0.013, 0.42, s * 0.2, 0.63, -0.2, { seg: 8 });
    bk.rotation.x = -0.14;
  }
  box(g, 'fabric_blue', 0.46, 0.05, 0.44, 0, 0.46, 0.02);
  const back = box(g, 'fabric_blue', 0.44, 0.42, 0.05, 0, 0.78, -0.21);
  back.rotation.x = -0.13;
  return g;
});

registerProp('armchair', () => {
  // boxy visitor armchair (waiting/lobby)
  const g = G('FURN-008', [C(-0.42, 0, -0.36, 0.42, 0.8, 0.36, 'carpet', { blocksSight: false })]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    cyl(g, 'wood', 0.02, 0.024, 0.09, sx * 0.32, 0.045, sz * 0.25, { seg: 8 });
  }
  box(g, 'fabric_gray', 0.72, 0.2, 0.66, 0, 0.19, 0.02);
  box(g, 'fabric_blue', 0.54, 0.13, 0.54, 0, 0.355, 0.04);
  box(g, 'fabric_gray', 0.15, 0.34, 0.66, -0.345, 0.42, 0.02);
  box(g, 'fabric_gray', 0.15, 0.34, 0.66, 0.345, 0.42, 0.02);
  const back = box(g, 'fabric_gray', 0.84, 0.44, 0.15, 0, 0.6, -0.27);
  back.rotation.x = -0.08;
  const cush = box(g, 'fabric_blue', 0.56, 0.32, 0.09, 0, 0.58, -0.19);
  cush.rotation.x = -0.08;
  return g;
});

registerProp('sofa_3seat', () => {
  const g = G('FURN-009', [C(-0.98, 0, -0.4, 0.98, 0.85, 0.4, 'carpet', { blocksSight: false })]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    cyl(g, 'wood', 0.02, 0.024, 0.09, sx * 0.88, 0.045, sz * 0.28, { seg: 8 });
  }
  box(g, 'fabric_gray', 1.95, 0.22, 0.72, 0, 0.2, 0);
  for (const px of [-0.585, 0, 0.585]) {
    box(g, 'fabric_blue', 0.55, 0.13, 0.58, px, 0.375, 0.03);
    const bc = box(g, 'fabric_blue', 0.55, 0.36, 0.1, px, 0.62, -0.24);
    bc.rotation.x = -0.1;
  }
  box(g, 'fabric_gray', 0.15, 0.36, 0.72, -0.9, 0.46, 0);
  box(g, 'fabric_gray', 0.15, 0.36, 0.72, 0.9, 0.46, 0);
  const back = box(g, 'fabric_gray', 1.95, 0.46, 0.14, 0, 0.62, -0.31);
  back.rotation.x = -0.06;
  return g;
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

registerProp('table_conference', () => {
  // 4.2 x ~1.4 boat-shape top (approximated with angled segments), twin
  // pedestal bases. Long axis = local X.
  const g = G('FURN-005', [C(-2.12, 0, -0.71, 2.12, 0.75, 0.71, 'wood')]);
  box(g, 'wood_dark', 1.7, 0.05, 1.38, 0, 0.725, 0);
  for (const s of [-1, 1]) {
    box(g, 'wood_dark', 0.85, 0.05, 1.3, s * 1.275, 0.725, 0);
    box(g, 'wood_dark', 0.4, 0.05, 1.14, s * 1.9, 0.725, 0);
  }
  box(g, 'wood_dark', 4.1, 0.022, 1.06, 0, 0.688, 0); // under-lip
  box(g, 'plastic_dark', 0.55, 0.008, 0.2, 0, 0.755, 0); // cable hatch
  for (const s of [-1, 1]) {
    box(g, 'wood_dark', 0.16, 0.6, 0.92, s * 1.25, 0.36, 0);
    box(g, 'aluminum', 0.5, 0.05, 1.0, s * 1.25, 0.035, 0);
  }
  box(g, 'wood_dark', 2.5, 0.12, 0.16, 0, 0.52, 0);
  return g;
});

registerProp('table_coffee', () => {
  const g = G('FURN-010', [C(-0.45, 0, -0.25, 0.45, 0.44, 0.25, 'wood', { blocksSight: false })]);
  box(g, 'wood', 0.9, 0.04, 0.5, 0, 0.42, 0);
  box(g, 'wood', 0.78, 0.02, 0.4, 0, 0.14, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, 'metal_dark', 0.03, 0.4, 0.03, sx * 0.41, 0.2, sz * 0.21);
  }
  return g;
});

registerProp('table_side', () => {
  const g = G('FURN-011', [C(-0.24, 0, -0.24, 0.24, 0.55, 0.24, 'wood', { blocksSight: false })]);
  cyl(g, 'wood', 0.24, 0.24, 0.03, 0, 0.535, 0, { seg: 14 });
  cyl(g, 'metal_dark', 0.018, 0.018, 0.5, 0, 0.27, 0, { seg: 8 });
  cyl(g, 'metal_dark', 0.16, 0.17, 0.02, 0, 0.01, 0, { seg: 12 });
  return g;
});

registerProp('console_table', (opts, rng) => {
  // slim hall table; opts.lamp adds a warm-shade table lamp (emissive shade,
  // no dynamic light)
  const g = G('FURN-022', [C(-0.6, 0, -0.175, 0.6, 0.8, 0.175, 'wood')]);
  box(g, 'wood_dark', 1.2, 0.035, 0.35, 0, 0.782, 0);
  box(g, 'wood_dark', 1.1, 0.08, 0.28, 0, 0.72, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, 'wood_dark', 0.035, 0.76, 0.035, sx * 0.55, 0.38, sz * 0.14);
  }
  if (opts.lamp !== false) {
    const lx = rng.chance(0.5) ? -0.38 : 0.38;
    cyl(g, 'aluminum', 0.055, 0.06, 0.02, lx, 0.81, 0);
    cyl(g, 'aluminum', 0.011, 0.011, 0.32, lx, 0.97, 0, { seg: 8 });
    screenCyl(g, 0.09, 0.125, 0.17, 'lamp', lx, 1.19, 0, { seg: 12 });
    cyl(g, 'plastic_dark', 0.012, 0.012, 0.02, lx, 1.285, 0, { seg: 6 });
  }
  return g;
});

// ---------------------------------------------------------------------------
// Cubicle workstation (composed): 1.35 m fabric panels in U/L + desk + chair
// ---------------------------------------------------------------------------

function cubiclePanel(g, w, x, z, ry) {
  const p = new THREE.Group();
  box(p, 'metal_painted', w, 0.06, 0.05, 0, 0.05, 0);
  box(p, 'fabric_gray', w, 1.0, 0.048, 0, 0.58, 0);
  box(p, 'fabric_blue', w, 0.24, 0.048, 0, 1.2, 0);
  box(p, 'aluminum', w, 0.028, 0.06, 0, 1.335, 0);
  box(p, 'aluminum', 0.04, 1.3, 0.055, -w / 2 + 0.02, 0.68, 0);
  box(p, 'aluminum', 0.04, 1.3, 0.055, w / 2 - 0.02, 0.68, 0);
  p.position.set(x, 0, z);
  p.rotation.y = ry;
  g.add(p);
}

registerProp('cubicle_workstation', (opts, rng) => {
  // 1.7 x 1.7 footprint, opening at +Z. opts.config 'U' (default) | 'L',
  // opts.mirror flips which side panel the L keeps.
  const config = opts.config || 'U';
  const mirror = !!opts.mirror;
  const colliders = [
    C(-0.87, 0, -0.87, 0.87, 1.36, -0.79, 'carpet'),   // back panel
    C(-0.79, 0, -0.81, 0.79, 0.75, -0.19, 'wood'),     // desk
  ];
  const g = G('FURN-004');
  cubiclePanel(g, 1.7, 0, -0.825, 0);
  const sides = config === 'U' ? [-1, 1] : [mirror ? 1 : -1];
  for (const s of sides) {
    cubiclePanel(g, 1.4, s * 0.825, -0.15, Math.PI / 2);
    colliders.push(C(s * 0.85 - 0.04, 0, -0.87, s * 0.85 + 0.04, 1.36, 0.56, 'carpet'));
  }
  // desk surface along the back
  box(g, 'laminate', 1.55, 0.032, 0.6, 0, 0.734, -0.5);
  box(g, 'metal_painted', 0.05, 0.7, 0.55, -0.72, 0.35, -0.5);
  box(g, 'metal_painted', 0.05, 0.7, 0.55, 0.72, 0.35, -0.5);
  cyl(g, 'plastic_dark', 0.035, 0.035, 0.012, rng.chance(0.5) ? -0.45 : 0.45, 0.756, -0.72);
  // under-desk tower on a random side
  const ts = rng.chance(0.5) ? -1 : 1;
  if (rng.chance(0.75)) {
    box(g, 'plastic_dark', 0.17, 0.4, 0.42, ts * 0.52, 0.2, -0.52);
    box(g, 'metal_dark', 0.172, 0.38, 0.015, ts * 0.52, 0.2, -0.3);
  }
  // chair, pushed out & swiveled a little (deterministic via rng)
  const cx = rng.range(-0.12, 0.12);
  const cz = 0.02 + rng.range(0, 0.3);
  const chair = buildTaskChair(g, rng, { fabric: rng.chance(0.4) ? 'gray' : 'blue' });
  chair.position.set(cx, 0, cz);
  chair.rotation.y = Math.PI + rng.range(-0.6, 0.6);
  colliders.push(C(cx - 0.28, 0, cz - 0.28, cx + 0.28, 0.9, cz + 0.28, 'carpet', { blocksSight: false }));
  g.userData.colliders = colliders;
  return g;
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

registerProp('cabinet_file', (opts, rng) => {
  // opts.drawers: 2 | 4; opts.open: drawer index left pulled open
  const drawers = opts.drawers || 4;
  const h = drawers === 2 ? 0.73 : 1.33;
  const open = opts.open;
  const cols = [C(-0.235, 0, -0.31, 0.235, h, 0.31, 'metal')];
  if (open !== undefined) cols.push(C(-0.21, 0, 0.31, 0.21, h, 0.62, 'metal', { blocksSight: false }));
  const g = G('FURN-012', cols);
  box(g, 'metal_painted', 0.47, h - 0.02, 0.62, 0, h / 2, 0);
  box(g, 'plastic_dark', 0.43, 0.04, 0.56, 0, 0.02, 0);
  const dh = (h - 0.1) / drawers;
  for (let i = 0; i < drawers; i++) {
    const dy = 0.07 + i * dh + dh / 2;
    if (i === open) {
      // pulled-open drawer with hanging files
      box(g, 'metal_painted', 0.41, dh - 0.035, 0.025, 0, dy, 0.62);
      box(g, 'metal_dark', 0.38, 0.02, 0.32, 0, dy - dh / 2 + 0.03, 0.46);
      box(g, 'metal_dark', 0.015, dh - 0.06, 0.32, -0.19, dy, 0.46);
      box(g, 'metal_dark', 0.015, dh - 0.06, 0.32, 0.19, dy, 0.46);
      const nf = rng.int(4, 7);
      for (let f = 0; f < nf; f++) {
        box(g, 'paper', 0.34, dh - 0.12, 0.014, 0, dy, 0.34 + f * 0.032, { tint: f % 3 ? undefined : 0xd9c48f });
      }
    } else {
      box(g, 'metal_painted', 0.41, dh - 0.035, 0.02, 0, dy, 0.32);
    }
    box(g, 'aluminum', 0.11, 0.018, 0.02, 0, dy + dh / 2 - 0.045, i === open ? 0.64 : 0.34);
    box(g, 'aluminum', 0.05, 0.03, 0.012, -0.14, dy + dh / 2 - 0.05, i === open ? 0.635 : 0.332); // label holder
  }
  return g;
});

registerProp('cabinet_low', () => {
  // low 2-door cabinet, 0.45 top — sized so the IT keycard pickup (bobbing
  // at y 0.5 ± 0.05) reads as resting on it
  const g = G('FURN-026', [C(-0.4, 0, -0.23, 0.4, 0.45, 0.23, 'metal')]);
  box(g, 'metal_painted', 0.8, 0.41, 0.45, 0, 0.225, 0);
  box(g, 'plastic_dark', 0.76, 0.03, 0.4, 0, 0.015, 0);
  box(g, 'metal_dark', 0.8, 0.02, 0.46, 0, 0.44, 0);
  box(g, 'metal_painted', 0.36, 0.34, 0.018, -0.195, 0.235, 0.23);
  box(g, 'metal_painted', 0.36, 0.34, 0.018, 0.195, 0.235, 0.23);
  box(g, 'aluminum', 0.018, 0.1, 0.016, -0.03, 0.25, 0.243);
  box(g, 'aluminum', 0.018, 0.1, 0.016, 0.03, 0.25, 0.243);
  return g;
});

registerProp('drawer_unit', (opts, rng) => {
  // mobile under-desk pedestal
  const g = G('FURN-013', [C(-0.21, 0, -0.28, 0.21, 0.6, 0.28, 'metal', { blocksSight: false })]);
  box(g, 'metal_painted', 0.42, 0.52, 0.55, 0, 0.31, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    cyl(g, 'plastic_dark', 0.022, 0.022, 0.05, sx * 0.15, 0.025, sz * 0.2, { seg: 8 });
  }
  for (let i = 0; i < 3; i++) {
    const dh = i === 2 ? 0.22 : 0.12;
    const dy = 0.115 + (i === 0 ? 0 : i === 1 ? 0.135 : 0.31);
    box(g, 'metal_painted', 0.38, dh, 0.02, 0, dy + dh / 2, 0.285);
    box(g, 'aluminum', 0.1, 0.014, 0.018, 0, dy + dh - 0.03, 0.3);
  }
  if (opts.cushion || (rng && rng.chance(0.3))) box(g, 'fabric_blue', 0.4, 0.06, 0.5, 0, 0.6, 0);
  return g;
});

registerProp('shelf_open', (opts, rng) => {
  // open metal shelving; opts.style 'office' | 'parts'
  const style = opts.style || 'office';
  const g = G('FURN-014', [C(-0.46, 0, -0.21, 0.46, 1.82, 0.21, 'metal')]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, 'metal_painted', 0.045, 1.82, 0.045, sx * 0.435, 0.91, sz * 0.185);
  }
  for (let s = 0; s < 5; s++) {
    const sy = 0.1 + s * 0.41;
    box(g, 'metal_painted', 0.9, 0.03, 0.4, 0, sy, 0);
    if (s === 4) continue;
    const fill = rng.random();
    if (style === 'parts') {
      if (fill < 0.45) {
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) {
          const bw = rng.range(0.18, 0.3);
          box(g, 'cardboard', bw, rng.range(0.14, 0.26), rng.range(0.2, 0.34),
            -0.3 + i * 0.3 + rng.range(-0.03, 0.03), sy + 0.09, rng.range(-0.04, 0.04), { ry: rng.range(-0.12, 0.12) });
        }
      } else if (fill < 0.8) {
        for (let i = 0; i < 3; i++) {
          box(g, null, 0.24, 0.13, 0.34, -0.28 + i * 0.28, sy + 0.08, 0, { tint: i % 2 ? 0x33507a : 0x3a4046 });
        }
      } else {
        torus(g, 'rubber', 0.11, 0.028, -0.2, sy + 0.05, 0, { rx: Math.PI / 2 });
        box(g, 'metal_dark', 0.3, 0.1, 0.22, 0.2, sy + 0.065, 0, { ry: 0.2 });
      }
    } else {
      if (fill < 0.5) {
        const n = rng.int(4, 7);
        for (let i = 0; i < n; i++) {
          box(g, null, 0.055, 0.29, 0.27, -0.32 + i * 0.09, sy + 0.16, 0,
            { tint: [0x3e5a78, 0x7a5438, 0x4a5d4a, 0x777d85][rng.int(0, 3)], rz: i === n - 1 ? -0.12 : 0 });
        }
      } else if (fill < 0.8) {
        box(g, 'paper', 0.24, rng.range(0.06, 0.16), 0.32, -0.2, sy + 0.07, 0, { ry: rng.range(-0.08, 0.08) });
        box(g, 'cardboard', 0.26, 0.18, 0.3, 0.22, sy + 0.105, 0);
      } else {
        box(g, 'paper', 0.22, 0.09, 0.3, rng.range(-0.2, 0.2), sy + 0.06, 0, { ry: rng.range(-0.2, 0.2) });
      }
    }
  }
  return g;
});

registerProp('bookcase', (opts, rng) => {
  // closed-back wood bookcase filled with binders/manuals
  const g = G('FURN-015', [C(-0.45, 0, -0.16, 0.45, 1.82, 0.16, 'wood')]);
  box(g, 'wood', 0.04, 1.82, 0.32, -0.43, 0.91, 0);
  box(g, 'wood', 0.04, 1.82, 0.32, 0.43, 0.91, 0);
  box(g, 'wood', 0.9, 0.04, 0.32, 0, 1.8, 0);
  box(g, 'wood', 0.86, 0.05, 0.3, 0, 0.045, 0);
  box(g, 'wood', 0.9, 1.82, 0.025, 0, 0.91, -0.148);
  for (let s = 0; s < 3; s++) {
    const sy = 0.49 + s * 0.43;
    box(g, 'wood', 0.86, 0.03, 0.3, 0, sy, 0);
  }
  for (let s = 0; s < 4; s++) {
    const base = s === 0 ? 0.07 : 0.505 + (s - 1) * 0.43;
    const kind = rng.random();
    if (kind < 0.55) {
      print(g, 0.8, 0.34, 'spines', 0, base + 0.19, 0.05);
    } else if (kind < 0.85) {
      const n = rng.int(4, 8);
      for (let i = 0; i < n; i++) {
        box(g, null, 0.055, 0.3, 0.24, -0.34 + i * 0.09, base + 0.165, 0,
          { tint: [0x3e5a78, 0x7a5438, 0x4a5d4a, 0x8a7a4a][rng.int(0, 3)], rz: i === n - 1 && rng.chance(0.5) ? -0.14 : 0 });
      }
      if (rng.chance(0.5)) box(g, 'paper', 0.2, 0.1, 0.24, 0.26, base + 0.065, 0, { ry: 0.1 });
    } else {
      box(g, 'paper', 0.24, rng.range(0.08, 0.18), 0.26, -0.2, base + 0.08, 0);
      sph(g, null, 0.07, 0.24, base + 0.1, 0, { tint: FOLIAGE[1], sy: 0.9 });
      cyl(g, null, 0.045, 0.05, 0.07, 0.24, base + 0.035, 0, { tint: 0x565048, seg: 8 });
    }
  }
  return g;
});

// ---------------------------------------------------------------------------
// Boards & misc
// ---------------------------------------------------------------------------

registerProp('whiteboard_stand', (opts, rng) => {
  const variant = opts.variant || (rng.chance(0.5) ? 'wbA' : 'wbB');
  const g = G('FURN-016', [C(-0.78, 0, -0.3, 0.78, 1.95, 0.3, 'metal')]);
  box(g, 'plastic_light', 1.56, 1.06, 0.03, 0, 1.45, -0.01);
  print(g, 1.5, 1.0, variant, 0, 1.45, 0.008);
  box(g, 'aluminum', 1.58, 0.035, 0.045, 0, 1.99, 0);
  box(g, 'aluminum', 1.58, 0.035, 0.045, 0, 0.91, 0);
  box(g, 'aluminum', 0.7, 0.018, 0.07, -0.2, 0.9, 0.05); // marker tray
  cyl(g, null, 0.009, 0.009, 0.11, -0.3, 0.925, 0.05, { rz: Math.PI / 2, tint: 0x2d4a63, seg: 6 });
  cyl(g, null, 0.009, 0.009, 0.11, -0.05, 0.925, 0.06, { rz: Math.PI / 2 + 0.3, tint: 0x3a5a44, seg: 6 });
  for (const s of [-1, 1]) {
    box(g, 'aluminum', 0.05, 1.96, 0.05, s * 0.76, 0.98, 0);
    box(g, 'aluminum', 0.05, 0.04, 0.62, s * 0.76, 0.02, 0);
  }
  return g;
});

// NOTE: id 'whiteboard_wall' is taken by signage.js (fable3b, center-pivot);
// this one is floor-pivot with the print-atlas scribble variants.
registerProp('whiteboard_wall_office', (opts, rng) => {
  const variant = opts.variant || (rng.chance(0.5) ? 'wbB' : 'wbA');
  const g = G('FURN-017');
  box(g, 'plastic_light', 1.86, 1.16, 0.03, 0, 1.55, 0.025);
  print(g, 1.8, 1.1, variant, 0, 1.55, 0.043);
  box(g, 'aluminum', 1.88, 0.03, 0.04, 0, 2.14, 0.028);
  box(g, 'aluminum', 1.88, 0.03, 0.04, 0, 0.96, 0.028);
  box(g, 'aluminum', 0.6, 0.016, 0.06, 0.3, 0.95, 0.06);
  cyl(g, null, 0.009, 0.009, 0.11, 0.24, 0.97, 0.062, { rz: Math.PI / 2, tint: 0xb8452f, seg: 6 });
  return g;
});

registerProp('coat_stand', (opts, rng) => {
  const g = G('FURN-018', [C(-0.26, 0, -0.26, 0.26, 1.72, 0.26, 'metal', { blocksSight: false })]);
  cyl(g, 'plastic_dark', 0.17, 0.19, 0.03, 0, 0.015, 0, { seg: 12 });
  cyl(g, 'aluminum', 0.018, 0.018, 1.7, 0, 0.86, 0, { seg: 8 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const hook = cyl(g, 'aluminum', 0.008, 0.008, 0.14, Math.sin(a) * 0.07, 1.62, Math.cos(a) * 0.07, { seg: 6 });
    hook.rotation.set(Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2);
    sph(g, 'aluminum', 0.014, Math.sin(a) * 0.13, 1.66, Math.cos(a) * 0.13, { seg: 6 });
  }
  sph(g, 'aluminum', 0.022, 0, 1.71, 0, { seg: 8 });
  // hanging coat + scarf (kept light-toned: charcoal reads as an enemy)
  const coat = box(g, null, 0.34, 0.62, 0.14, 0.09, 1.28, 0.06, { tint: 0x7d7361 });
  coat.rotation.z = -0.06;
  box(g, null, 0.3, 0.2, 0.15, 0.09, 0.93, 0.06, { tint: 0x736a58 });
  if (rng.chance(0.6)) {
    const sc = box(g, null, 0.08, 0.5, 0.05, -0.11, 1.34, -0.05, { tint: 0x3e5a78 });
    sc.rotation.z = 0.1;
  }
  return g;
});

registerProp('credenza', () => {
  const g = G('FURN-019', [C(-0.82, 0, -0.26, 0.82, 0.75, 0.26, 'wood')]);
  box(g, 'wood', 1.64, 0.03, 0.52, 0, 0.735, 0);
  box(g, 'wood_dark', 1.6, 0.62, 0.48, 0, 0.41, 0);
  box(g, 'wood', 0.76, 0.54, 0.02, -0.4, 0.41, 0.245);
  box(g, 'wood', 0.76, 0.54, 0.02, 0.4, 0.41, 0.245);
  box(g, 'aluminum', 0.016, 0.14, 0.014, -0.05, 0.41, 0.258);
  box(g, 'aluminum', 0.016, 0.14, 0.014, 0.05, 0.41, 0.258);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, 'metal_dark', 0.03, 0.1, 0.03, sx * 0.74, 0.05, sz * 0.2);
  }
  return g;
});

registerProp('bench', () => {
  // slat bench (vestibule / exec corridor)
  const g = G('FURN-021', [C(-0.7, 0, -0.23, 0.7, 0.45, 0.23, 'wood', { blocksSight: false })]);
  for (let i = 0; i < 3; i++) {
    box(g, 'wood', 1.4, 0.035, 0.12, 0, 0.435, -0.15 + i * 0.15);
  }
  for (const s of [-1, 1]) {
    box(g, 'metal_dark', 0.05, 0.4, 0.04, s * 0.6, 0.21, -0.16);
    box(g, 'metal_dark', 0.05, 0.4, 0.04, s * 0.6, 0.21, 0.16);
    box(g, 'metal_dark', 0.05, 0.04, 0.42, s * 0.6, 0.02, 0);
  }
  return g;
});

registerProp('stanchion_pair', () => {
  // two queue posts 1.6 m apart along X with a sagging rope
  const g = G('FURN-023', [C(-0.92, 0, -0.09, 0.92, 0.95, 0.09, 'metal', { blocksSight: false })]);
  for (const s of [-1, 1]) {
    cyl(g, 'steel', 0.15, 0.16, 0.025, s * 0.8, 0.012, 0, { seg: 12 });
    cyl(g, 'aluminum', 0.016, 0.016, 0.9, s * 0.8, 0.47, 0, { seg: 8 });
    sph(g, 'aluminum', 0.03, s * 0.8, 0.93, 0, { seg: 8 });
  }
  tube(g, null, [[-0.78, 0.88, 0], [0, 0.7, 0.015], [0.78, 0.88, 0]], 0.016, 0, 0, 0, { seg: 12, tint: 0x2e3d52 });
  return g;
});

registerProp('mat_runner', (opts) => {
  // thin walk-off mat; no collider
  const g = G('FURN-024');
  box(g, 'entry_mat', opts.w || 2.4, 0.014, opts.d || 1.6, 0, 0.007, 0);
  return g;
});

// ---------------------------------------------------------------------------
// Plants
// ---------------------------------------------------------------------------

registerProp('plant_floor', (opts, rng) => {
  const g = G('FURN-020', [C(-0.22, 0, -0.22, 0.22, 1.05, 0.22, 'wood', { blocksSight: false })]);
  cyl(g, null, 0.19, 0.15, 0.4, 0, 0.2, 0, { tint: 0x565048, seg: 12 });
  cyl(g, null, 0.165, 0.165, 0.03, 0, 0.39, 0, { tint: 0x2e2620, seg: 12 });
  cyl(g, 'wood_dark', 0.018, 0.024, 0.6, rng.range(-0.03, 0.03), 0.66, rng.range(-0.03, 0.03), { seg: 6 });
  const h = 1.05 + rng.range(0, 0.45);
  const blobs = rng.int(4, 6);
  for (let i = 0; i < blobs; i++) {
    const t = i / (blobs - 1);
    const by = 0.85 + t * (h - 0.85);
    const r = 0.3 - t * 0.16 + rng.range(-0.03, 0.03);
    if (rng.chance(0.5)) {
      sph(g, null, r, rng.range(-0.1, 0.1), by, rng.range(-0.1, 0.1),
        { tint: FOLIAGE[rng.int(0, 3)], sy: rng.range(0.55, 0.75) });
    } else {
      cyl(g, null, 0.02, r, 0.3, rng.range(-0.08, 0.08), by, rng.range(-0.08, 0.08),
        { tint: FOLIAGE[rng.int(0, 3)], seg: 8 });
    }
  }
  return g;
});

registerProp('plant_desk', (opts, rng) => {
  const g = G('FURN-025');
  cyl(g, null, 0.055, 0.045, 0.09, 0, 0.045, 0, { tint: rng.chance(0.5) ? 0x565048 : 0x7a5438, seg: 10 });
  cyl(g, null, 0.048, 0.048, 0.012, 0, 0.085, 0, { tint: 0x2e2620, seg: 10 });
  sph(g, null, 0.075, 0.01, 0.16, 0, { tint: FOLIAGE[rng.int(0, 3)], sy: 0.85 });
  if (rng.chance(0.6)) sph(g, null, 0.05, -0.04, 0.21, 0.02, { tint: FOLIAGE[rng.int(0, 3)] });
  return g;
});
