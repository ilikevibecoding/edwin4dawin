// Break-room / kitchenette prop library — owner: fable3-b.
// Factories follow the props/index.js contract; everything static-merges.
// Landmark: the Frostbyte vending machine (emissive front, original brand).

import * as THREE from 'three';
import { registerProp } from './index.js';
import { getMaterial } from '../materials.js';
import { emissiveCanvasMat } from './signage.js';

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
function cyl(g, mat, rTop, rBot, h, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), typeof mat === 'string' ? getMaterial(mat) : mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function col(g, x0, y0, z0, x1, y1, z1, surface = 'wood', extra = {}) {
  g.userData.colliders.push({ x0, y0, z0, x1, y1, z1, surface, ...extra });
}
// module-level material cache so repeated placements static-merge into one mesh
const sharedMats = new Map();
function shared(name, make) {
  if (!sharedMats.has(name)) { const m = make(); m.name = name; sharedMats.set(name, m); }
  return sharedMats.get(name);
}

// ---------------------------------------------------------------------------
// BRK-001 lower kitchen cabinet run (param length; doors + kick + top)
// Pivot: floor center of run, +Z = door face.
registerProp('cabinet_lower', (opts) => {
  const L = opts.len || 1.8;
  const g = P('BRK-001');
  const D = 0.62, H = 0.9;
  box(g, 'plastic_dark', L - 0.06, 0.1, D - 0.1, 0, 0.05, -0.05);          // kick
  box(g, 'laminate', L, H - 0.14, D - 0.04, 0, 0.1 + (H - 0.14) / 2, -0.02); // carcass
  const doors = Math.max(1, Math.round(L / 0.45));
  const dw = (L - 0.04) / doors;
  for (let i = 0; i < doors; i++) {
    const dx = -L / 2 + 0.02 + dw * (i + 0.5);
    box(g, 'wood', dw - 0.02, H - 0.2, 0.018, dx, 0.14 + (H - 0.2) / 2, D / 2 - 0.03);
    box(g, 'metal_brushed', 0.02, 0.11, 0.02, dx + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), H - 0.22, D / 2 - 0.015);
  }
  box(g, 'laminate', L + 0.02, 0.04, D, 0, H - 0.02, 0);                    // countertop
  col(g, -L / 2, 0, -D / 2, L / 2, H, D / 2, 'wood');
  return g;
});

// BRK-002 upper cabinet run (wall-hung)
registerProp('cabinet_upper', (opts) => {
  const L = opts.len || 0.8;
  const g = P('BRK-002');
  const D = 0.34, H = 0.7, Y = 1.5; // underside at 1.5
  box(g, 'laminate', L, H, D, 0, Y + H / 2, 0);
  const doors = Math.max(1, Math.round(L / 0.4));
  const dw = (L - 0.03) / doors;
  for (let i = 0; i < doors; i++) {
    const dx = -L / 2 + 0.015 + dw * (i + 0.5);
    box(g, 'wood', dw - 0.018, H - 0.05, 0.016, dx, Y + H / 2, D / 2 + 0.002);
    box(g, 'metal_brushed', 0.018, 0.09, 0.018, dx + (i % 2 ? -1 : 1) * (dw / 2 - 0.045), Y + 0.09, D / 2 + 0.014);
  }
  col(g, -L / 2, Y, -D / 2, L / 2, Y + H, D / 2, 'wood', { blocksSight: false });
  return g;
});

// BRK-003 sink counter section (basin + faucet), same footprint as lower run
registerProp('counter_sink', (opts) => {
  const L = opts.len || 1.2;
  const g = P('BRK-003');
  const D = 0.62, H = 0.9;
  box(g, 'plastic_dark', L - 0.06, 0.1, D - 0.1, 0, 0.05, -0.05);
  box(g, 'laminate', L, H - 0.14, D - 0.04, 0, 0.1 + (H - 0.14) / 2, -0.02);
  box(g, 'wood', L / 2 - 0.03, H - 0.2, 0.018, -L / 4, 0.14 + (H - 0.2) / 2, D / 2 - 0.03);
  box(g, 'wood', L / 2 - 0.03, H - 0.2, 0.018, L / 4, 0.14 + (H - 0.2) / 2, D / 2 - 0.03);
  box(g, 'laminate', L + 0.02, 0.04, D, 0, H - 0.02, 0);
  // basin: brushed rim + dark recess
  box(g, 'metal_brushed', 0.52, 0.02, 0.4, 0, H + 0.002, -0.02);
  box(g, 'metal_dark', 0.44, 0.02, 0.33, 0, H - 0.004, -0.02);
  // faucet: column + spout
  cyl(g, 'steel', 0.018, 0.022, 0.24, 0, H + 0.12, -0.24, 8);
  const spout = cyl(g, 'steel', 0.014, 0.014, 0.24, 0, H + 0.24, -0.13, 8);
  spout.rotation.x = Math.PI / 2;
  box(g, 'steel', 0.1, 0.02, 0.03, -0.09, H + 0.05, -0.24);
  col(g, -L / 2, 0, -D / 2, L / 2, H, D / 2, 'wood');
  return g;
});

// BRK-004 refrigerator (2.0 m, two-door, handle detail)
registerProp('fridge', () => {
  const g = P('BRK-004');
  const W = 0.85, D = 0.72, H = 2.0;
  box(g, 'plastic_light', W, H - 0.06, D, 0, 0.03 + (H - 0.06) / 2, 0);
  box(g, 'plastic_dark', W - 0.1, 0.06, D - 0.1, 0, 0.03, 0);
  // door split: freezer top / fridge bottom + gasket seam
  box(g, 'plastic_dark', W - 0.02, 0.015, 0.012, 0, H * 0.68, D / 2 + 0.001);
  box(g, 'metal_brushed', 0.035, 0.55, 0.035, W / 2 - 0.1, H * 0.36, D / 2 + 0.035); // long handle
  box(g, 'metal_brushed', 0.035, 0.3, 0.035, W / 2 - 0.1, H * 0.815, D / 2 + 0.035); // freezer handle
  // magnet papers on the door
  box(g, 'paper', 0.16, 0.2, 0.004, -0.16, 1.15, D / 2 + 0.004);
  box(g, 'paper', 0.12, 0.1, 0.004, 0.1, 0.9, D / 2 + 0.004);
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// BRK-005 microwave (counter-top)
registerProp('microwave', () => {
  const g = P('BRK-005');
  const W = 0.5, D = 0.36, H = 0.3;
  box(g, 'plastic_dark', W, H, D, 0, H / 2, 0);
  box(g, 'metal_dark', W - 0.16, H - 0.06, 0.01, -0.06, H / 2, D / 2 + 0.002); // window
  box(g, 'plastic_light', 0.1, H - 0.06, 0.012, W / 2 - 0.07, H / 2, D / 2 + 0.002); // keypad
  box(g, 'plastic_light', 0.02, 0.14, 0.02, W / 2 - 0.155, H / 2, D / 2 + 0.012);   // handle bar
  return g;
});

// BRK-006 coffee machine + carafe
registerProp('coffee_machine', () => {
  const g = P('BRK-006');
  box(g, 'plastic_dark', 0.26, 0.36, 0.3, 0, 0.18, -0.03);
  box(g, 'plastic_dark', 0.26, 0.08, 0.3, 0, 0.36, 0.02); // head
  box(g, 'metal_brushed', 0.24, 0.02, 0.26, 0, 0.015, 0.02); // warm plate
  const carafe = cyl(g, 'metal_dark', 0.075, 0.09, 0.18, 0, 0.115, 0.045, 12);
  carafe.material = shared('carafe_gloss', () => new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.25, metalness: 0.1 }));
  box(g, 'plastic_dark', 0.02, 0.1, 0.03, 0.09, 0.14, 0.045); // handle
  return g;
});

// BRK-007 kettle
registerProp('kettle', () => {
  const g = P('BRK-007');
  cyl(g, 'metal_brushed', 0.075, 0.09, 0.17, 0, 0.105, 0, 12);
  cyl(g, 'plastic_dark', 0.095, 0.095, 0.02, 0, 0.01, 0, 12);
  box(g, 'plastic_dark', 0.02, 0.1, 0.04, -0.1, 0.13, 0);
  cyl(g, 'metal_brushed', 0.015, 0.02, 0.05, 0.085, 0.16, 0, 8).rotation.z = -0.7;
  return g;
});

// BRK-008 VENDING MACHINE — Frostbyte (1.9 m, emissive product front)
registerProp('vending_machine', () => {
  const g = P('BRK-008');
  const W = 0.95, D = 0.78, H = 1.9;
  const front = emissiveCanvasMat('vending_frostbyte', 256, 512, (ctx, W2, H2) => {
    ctx.fillStyle = '#0c1826'; ctx.fillRect(0, 0, W2, H2);
    // brand header
    const grad = ctx.createLinearGradient(0, 0, 0, 96);
    grad.addColorStop(0, '#123048'); grad.addColorStop(1, '#0c1826');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W2, 96);
    ctx.font = '800 40px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7fd2ff';
    ctx.fillText('FROSTBYTE', W2 / 2, 40);
    ctx.font = '600 15px Arial, sans-serif'; ctx.fillStyle = '#3e7ea6';
    ctx.fillText('\u2744 COLD SNACKS \u2744', W2 / 2, 74);
    // product window: 4 cols × 5 rows of shapes on lit shelves
    const px = 20, py = 108, pw = W2 - 76, ph = 300;
    ctx.fillStyle = '#101c14'; ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);
    ctx.fillStyle = '#1a2a38'; ctx.fillRect(px, py, pw, ph);
    const cols = ['#c2563a', '#3a8ac2', '#c2a53a', '#5ac27a', '#a05ac2', '#c27a5a'];
    let ci = 0;
    for (let r = 0; r < 5; r++) {
      ctx.fillStyle = '#3a4a58';
      ctx.fillRect(px, py + 54 + r * 58, pw, 3); // shelf
      for (let c = 0; c < 4; c++) {
        const ix = px + 8 + c * (pw / 4), iy = py + 10 + r * 58;
        ctx.fillStyle = cols[ci++ % cols.length];
        if (r < 2) { // bottles
          ctx.fillRect(ix + 8, iy + 8, 14, 36);
          ctx.fillRect(ix + 11, iy + 2, 8, 8);
        } else { // snack packs, slight lean
          ctx.save(); ctx.translate(ix + 16, iy + 26); ctx.rotate(-0.12);
          ctx.fillRect(-13, -20, 26, 42);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-13, -8, 26, 8);
          ctx.restore();
        }
      }
    }
    // coin/keypad column
    ctx.fillStyle = '#182838'; ctx.fillRect(W2 - 48, py, 40, ph);
    ctx.fillStyle = '#7fd2ff';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctx.fillRect(W2 - 42 + j * 12, py + 16 + i * 16, 8, 8);
    ctx.fillStyle = '#0a141e'; ctx.fillRect(W2 - 44, py + 90, 32, 60);
    ctx.fillStyle = '#ffb454'; ctx.fillRect(W2 - 40, py + 96, 24, 4); // amber pay light
    // delivery flap
    ctx.fillStyle = '#182430'; ctx.fillRect(20, 428, W2 - 40, 60);
    ctx.fillStyle = '#101a24'; ctx.fillRect(30, 438, W2 - 60, 40);
    ctx.font = '600 13px Arial, sans-serif'; ctx.fillStyle = '#3e7ea6';
    ctx.fillText('PUSH', W2 / 2, 458);
  }, 0.55);
  box(g, 'metal_painted', W, H, D, 0, H / 2, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, H - 0.14), front);
  face.position.set(0, H / 2 + 0.02, D / 2 + 0.004);
  g.add(face);
  box(g, 'plastic_dark', W, 0.09, D, 0, 0.045, 0.001); // base
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// BRK-009 water cooler — GlacierPure bottle
registerProp('water_cooler', () => {
  const g = P('BRK-009');
  box(g, 'plastic_light', 0.34, 0.96, 0.34, 0, 0.48, 0);
  box(g, 'plastic_dark', 0.3, 0.1, 0.08, 0, 0.78, 0.15); // tap recess
  box(g, 'ice', 0.035, 0.05, 0.035, -0.06, 0.815, 0.185);
  box(g, 'plastic_dark', 0.035, 0.05, 0.035, 0.06, 0.815, 0.185);
  const bottleMat = shared('cooler_bottle', () => new THREE.MeshStandardMaterial({
    color: 0xb8dcf0, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.65,
  }));
  cyl(g, bottleMat, 0.135, 0.135, 0.42, 0, 1.19, 0, 12);
  cyl(g, bottleMat, 0.05, 0.11, 0.08, 0, 1.44, 0, 12);
  // water line
  cyl(g, 'ice', 0.128, 0.128, 0.3, 0, 1.13, 0, 12);
  col(g, -0.17, 0, -0.17, 0.17, 1.48, 0.17, 'plastic');
  return g;
});

// BRK-010 round break table
registerProp('break_table', () => {
  const g = P('BRK-010');
  cyl(g, 'laminate', 0.55, 0.55, 0.035, 0, 0.735, 0, 20);
  cyl(g, 'metal_painted', 0.03, 0.03, 0.68, 0, 0.37, 0, 10);
  cyl(g, 'metal_painted', 0.26, 0.3, 0.035, 0, 0.02, 0, 16);
  col(g, -0.55, 0.6, -0.55, 0.55, 0.76, 0.55, 'wood', { blocksSight: false });
  return g;
});

// BRK-011 cafe chair (stackable steel + plastic shell)
registerProp('cafe_chair', () => {
  const g = P('BRK-011');
  box(g, 'plastic_dark', 0.42, 0.03, 0.42, 0, 0.45, 0);
  const back = box(g, 'plastic_dark', 0.42, 0.4, 0.025, 0, 0.66, -0.2);
  back.rotation.x = -0.12;
  for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    box(g, 'metal_painted', 0.025, 0.45, 0.025, sx, 0.225, sz);
  }
  col(g, -0.21, 0, -0.24, 0.21, 0.9, 0.21, 'metal', { blocksSight: false });
  return g;
});

// BRK-012 chair stack (5 cafe chairs, storage)
registerProp('chair_stack', () => {
  const g = P('BRK-012');
  for (let i = 0; i < 5; i++) {
    const y = 0.45 + i * 0.09;
    box(g, 'plastic_dark', 0.42, 0.03, 0.42, 0, y, i * 0.02);
    const back = box(g, 'plastic_dark', 0.42, 0.38, 0.025, 0, y + 0.2, -0.2 + i * 0.02);
    back.rotation.x = -0.12;
  }
  for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    box(g, 'metal_painted', 0.025, 0.45, 0.025, sx, 0.225, sz);
  }
  col(g, -0.22, 0, -0.25, 0.22, 1.15, 0.25, 'metal');
  return g;
});

// BRK-013 mug/cup/plate stacks (tiny clutter)
registerProp('mug_set', (opts, rng) => {
  const g = P('BRK-013');
  const n = opts.n ?? 3;
  for (let i = 0; i < n; i++) {
    const x = (rng.random() - 0.5) * 0.3, z = (rng.random() - 0.5) * 0.2;
    if (rng.chance(0.5)) {
      cyl(g, i % 2 ? 'plastic_light' : 'fabric_blue', 0.04, 0.035, 0.09, x, 0.045, z, 10);
    } else {
      for (let p = 0; p < 4; p++) cyl(g, 'plastic_light', 0.085, 0.075, 0.012, x, 0.008 + p * 0.014, z, 12);
    }
  }
  return g;
});

// BRK-014 snack packs & food containers (tiny clutter)
registerProp('snack_set', (opts, rng) => {
  const g = P('BRK-014');
  const n = opts.n ?? 4;
  const mats = ['fabric_blue', 'plastic_light', 'cardboard', 'plastic_dark'];
  for (let i = 0; i < n; i++) {
    const x = (rng.random() - 0.5) * 0.4, z = (rng.random() - 0.5) * 0.25;
    if (rng.chance(0.6)) box(g, mats[i % 4], 0.09, 0.035, 0.14, x, 0.018, z, rng.range(0, 3));
    else box(g, 'plastic_light', 0.13, 0.06, 0.13, x, 0.03, z, rng.range(0, 3));
  }
  return g;
});

// BRK-015 paper-towel + soap dispenser pair (wall)
registerProp('dispenser_pair', () => {
  const g = P('BRK-015');
  box(g, 'plastic_light', 0.28, 0.36, 0.11, -0.25, 0, 0.055); // towel
  box(g, 'plastic_dark', 0.24, 0.05, 0.02, -0.25, -0.16, 0.09); // slot
  box(g, 'plastic_light', 0.11, 0.17, 0.1, 0.2, -0.05, 0.05);  // soap
  box(g, 'plastic_dark', 0.03, 0.04, 0.04, 0.2, -0.15, 0.09);  // nozzle
  return g;
});

// BRK-016 trash + recycle bin pair
registerProp('bin_pair', () => {
  const g = P('BRK-016');
  box(g, 'plastic_dark', 0.38, 0.62, 0.38, -0.24, 0.31, 0);
  box(g, 'plastic_dark', 0.4, 0.05, 0.4, -0.24, 0.645, 0);
  const blue = shared('bin_recycle_blue', () => new THREE.MeshStandardMaterial({ color: 0x2f5a7a, roughness: 0.7 }));
  box(g, blue, 0.38, 0.62, 0.38, 0.24, 0.31, 0);
  box(g, blue, 0.4, 0.05, 0.4, 0.24, 0.645, 0);
  box(g, 'paper', 0.1, 0.12, 0.005, 0.24, 0.38, 0.192); // recycle label
  col(g, -0.44, 0, -0.2, 0.44, 0.67, 0.2, 'plastic', { blocksSight: false });
  return g;
});

export const BREAKROOM_PROP_IDS = [
  'cabinet_lower', 'cabinet_upper', 'counter_sink', 'fridge', 'microwave',
  'coffee_machine', 'kettle', 'vending_machine', 'water_cooler', 'break_table',
  'cafe_chair', 'chair_stack', 'mug_set', 'snack_set', 'dispenser_pair', 'bin_pair',
];
