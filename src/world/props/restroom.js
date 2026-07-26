// Restroom prop library — owner: fable3-b.
// Clinical tile-and-steel fixtures per visual bible ("dripping-tap stillness").
// The mirror is faked: low-roughness brushed-metal plane in an aluminum frame.

import * as THREE from 'three';
import { registerProp } from './index.js';
import { getMaterial } from '../materials.js';

function P(assetId) {
  const g = new THREE.Group();
  g.userData.assetId = assetId;
  g.userData.colliders = [];
  return g;
}
function box(g, mat, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof mat === 'string' ? getMaterial(mat) : mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  g.add(m);
  return m;
}
function cyl(g, mat, rT, rB, h, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), typeof mat === 'string' ? getMaterial(mat) : mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function col(g, x0, y0, z0, x1, y1, z1, surface = 'tile', extra = {}) {
  g.userData.colliders.push({ x0, y0, z0, x1, y1, z1, surface, ...extra });
}

const mirrorMat = () => {
  const m = getMaterial('metal_brushed').clone();
  m.roughness = 0.08;
  m.metalness = 0.95;
  m.name = 'mirror_fake';
  return m;
};
let MIRROR = null;
const porcelain = () => {
  let m = porcelain._m;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: 0xe4e8e8, roughness: 0.22, metalness: 0 });
    m.name = 'porcelain';
    porcelain._m = m;
  }
  return m;
};

// ---------------------------------------------------------------------------
// RR-001 sink counter: 2 basins + wall mirror + faucets. +Z faces the user.
registerProp('sink_counter', (opts) => {
  const g = P('RR-001');
  const L = opts.len || 2.0, D = 0.56, H = 0.86;
  // counter slab + apron + support legs
  box(g, 'tile_dark', L, 0.05, D, 0, H, -0.0);
  box(g, 'tile_dark', L, 0.12, 0.03, 0, H - 0.08, D / 2 - 0.015);
  box(g, 'metal_painted', 0.04, H - 0.03, 0.04, -L / 2 + 0.1, (H - 0.03) / 2, D / 2 - 0.08);
  box(g, 'metal_painted', 0.04, H - 0.03, 0.04, L / 2 - 0.1, (H - 0.03) / 2, D / 2 - 0.08);
  for (const bx of [-L / 4, L / 4]) {
    // basin: porcelain ring + dark bowl recess
    cyl(g, porcelain(), 0.2, 0.22, 0.05, bx, H + 0.01, 0.02, 14);
    cyl(g, 'metal_dark', 0.16, 0.16, 0.02, bx, H + 0.022, 0.02, 14);
    // faucet
    cyl(g, 'steel', 0.016, 0.02, 0.16, bx, H + 0.1, -0.2, 8);
    const sp = cyl(g, 'steel', 0.012, 0.012, 0.17, bx, H + 0.17, -0.12, 8);
    sp.rotation.x = Math.PI / 2;
    box(g, 'steel', 0.08, 0.016, 0.025, bx - 0.07, H + 0.05, -0.2);
    // trap under counter
    cyl(g, 'metal_brushed', 0.025, 0.025, 0.3, bx, H - 0.22, -0.05, 8);
  }
  // wall mirror: frame + low-roughness metal plane (fake reflection)
  if (!MIRROR) MIRROR = mirrorMat();
  box(g, 'aluminum', L - 0.3, 0.85, 0.02, 0, H + 0.75, -D / 2 - 0.005);
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.38, 0.77), MIRROR);
  mir.position.set(0, H + 0.75, -D / 2 + 0.007);
  g.add(mir);
  col(g, -L / 2, 0, -D / 2, L / 2, H + 0.06, D / 2, 'tile');
  return g;
});

// RR-002 toilet (tank + bowl + seat). +Z faces out from the wall.
registerProp('toilet', () => {
  const g = P('RR-002');
  box(g, porcelain(), 0.4, 0.42, 0.16, 0, 0.6, -0.2);   // tank
  box(g, porcelain(), 0.36, 0.04, 0.14, 0, 0.83, -0.2); // tank lid
  box(g, 'metal_brushed', 0.06, 0.02, 0.04, -0.12, 0.845, -0.2); // flush
  box(g, porcelain(), 0.3, 0.3, 0.4, 0, 0.15, 0.05);    // pedestal
  cyl(g, porcelain(), 0.19, 0.16, 0.14, 0, 0.36, 0.09, 14); // bowl
  cyl(g, 'plastic_light', 0.2, 0.2, 0.025, 0, 0.435, 0.09, 14); // seat
  col(g, -0.2, 0, -0.28, 0.2, 0.86, 0.29, 'tile', { blocksSight: false });
  return g;
});

// RR-003 urinal (+ optional privacy divider via opts.divider)
registerProp('urinal', (opts) => {
  const g = P('RR-003');
  box(g, porcelain(), 0.34, 0.6, 0.09, 0, 0.75, 0.045);
  box(g, porcelain(), 0.3, 0.34, 0.18, 0, 0.56, 0.11);
  box(g, 'metal_dark', 0.2, 0.06, 0.1, 0, 0.52, 0.12);   // drain shadow
  cyl(g, 'metal_brushed', 0.018, 0.018, 0.1, 0, 1.1, 0.05, 8); // flush valve
  box(g, 'metal_brushed', 0.05, 0.05, 0.05, 0, 1.02, 0.05);
  if (opts.divider) {
    box(g, 'tile_dark', 0.03, 0.85, 0.42, -0.34, 1.0, 0.21);
    col(g, -0.37, 0.55, 0, -0.31, 1.45, 0.42, 'tile', { blocksSight: false });
  }
  col(g, -0.17, 0.3, 0, 0.17, 1.15, 0.24, 'tile', { blocksSight: false });
  return g;
});

// RR-004 stall system: n stalls of partitions + doors, 1.9 m tall, raised 0.2.
// Pivot: back wall center of the run; stalls open toward +Z.
registerProp('stall_run', (opts) => {
  const g = P('RR-004');
  const n = opts.n || 2, W = 0.95, D = 1.45;
  const runW = n * W;
  const y0 = 0.2, y1 = 1.9; // floor gap per spec
  const mat = getMaterial('metal_painted');
  for (let i = 0; i <= n; i++) {
    const x = -runW / 2 + i * W;
    box(g, mat, 0.025, y1 - y0, D, x, (y0 + y1) / 2, D / 2);
    box(g, 'metal_brushed', 0.03, 0.03, 0.03, x, y0 + 0.02, D - 0.08); // foot
    col(g, x - 0.02, 0, D * 0.05, x + 0.02, y1, D, 'metal', { blocksSight: true });
  }
  for (let i = 0; i < n; i++) {
    const cx = -runW / 2 + (i + 0.5) * W;
    const open = opts.open === i;
    if (open) {
      // one door ajar for storytelling
      box(g, mat, W - 0.14, y1 - y0, 0.022, cx - 0.12, (y0 + y1) / 2, D + 0.28, -0.9);
      col(g, cx - 0.42, 0, D - 0.02, cx + 0.1, y1, D + 0.5, 'metal');
    } else {
      box(g, mat, W - 0.14, y1 - y0, 0.022, cx, (y0 + y1) / 2, D);
      box(g, 'metal_brushed', 0.05, 0.04, 0.03, cx + W / 2 - 0.12, 1.05, D + 0.02);
      col(g, cx - W / 2 + 0.06, 0, D - 0.03, cx + W / 2 - 0.06, y1, D + 0.03, 'metal');
    }
    // toilet inside each stall
    box(g, porcelain(), 0.36, 0.4, 0.14, cx, 0.58, 0.08);
    cyl(g, porcelain(), 0.18, 0.15, 0.13, cx, 0.36, 0.42, 12);
    cyl(g, 'plastic_light', 0.19, 0.19, 0.022, cx, 0.43, 0.42, 12);
    box(g, 'plastic_light', 0.12, 0.12, 0.1, cx - W / 2 + 0.1, 0.85, 0.5); // tp holder
  }
  return g;
});

// RR-005 hand dryer (wall)
registerProp('hand_dryer', () => {
  const g = P('RR-005');
  box(g, 'metal_brushed', 0.26, 0.32, 0.16, 0, 0, 0.08);
  box(g, 'plastic_dark', 0.18, 0.05, 0.06, 0, -0.14, 0.1);
  return g;
});

// RR-006 restroom dispenser set (soap + towel, wall)
registerProp('rr_dispensers', () => {
  const g = P('RR-006');
  box(g, 'plastic_light', 0.26, 0.34, 0.1, -0.2, 0.02, 0.05);
  box(g, 'plastic_dark', 0.22, 0.04, 0.02, -0.2, -0.13, 0.09);
  box(g, 'plastic_light', 0.1, 0.16, 0.09, 0.16, -0.04, 0.045);
  return g;
});

// RR-007 small pedal bin
registerProp('bin_small', () => {
  const g = P('RR-007');
  cyl(g, 'metal_brushed', 0.13, 0.145, 0.36, 0, 0.18, 0, 12);
  cyl(g, 'plastic_dark', 0.13, 0.13, 0.02, 0, 0.37, 0, 12);
  box(g, 'metal_brushed', 0.08, 0.02, 0.05, 0, 0.02, 0.15);
  col(g, -0.15, 0, -0.15, 0.15, 0.38, 0.15, 'metal', { blocksSight: false });
  return g;
});

// RR-008 floor drain plate (flush tile drain)
registerProp('floor_drain', () => {
  const g = P('RR-008');
  const grate = box(g, 'metal_dark', 0.22, 0.008, 0.22, 0, 0.005, 0);
  grate.receiveShadow = true;
  for (let i = 0; i < 3; i++) box(g, 'metal_brushed', 0.2, 0.004, 0.02, 0, 0.01, -0.06 + i * 0.06);
  return g;
});

// RR-009 janitor mop sink (floor-level basin + tap)
registerProp('mop_sink', () => {
  const g = P('RR-009');
  box(g, 'concrete_dark', 0.6, 0.3, 0.6, 0, 0.15, 0);
  box(g, 'concrete', 0.5, 0.06, 0.5, 0, 0.29, 0);
  box(g, 'metal_dark', 0.44, 0.03, 0.44, 0, 0.285, 0);
  cyl(g, 'steel', 0.018, 0.018, 0.5, -0.2, 0.55, -0.26, 8);
  const sp = cyl(g, 'steel', 0.014, 0.014, 0.2, -0.2, 0.78, -0.17, 8);
  sp.rotation.x = Math.PI / 2;
  box(g, 'steel', 0.09, 0.02, 0.03, -0.27, 0.7, -0.26);
  col(g, -0.3, 0, -0.3, 0.3, 0.31, 0.3, 'concrete', { blocksSight: false });
  return g;
});

export const RESTROOM_PROP_IDS = [
  'sink_counter', 'toilet', 'urinal', 'stall_run', 'hand_dryer',
  'rr_dispensers', 'bin_small', 'floor_drain', 'mop_sink',
];
