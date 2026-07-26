// Maintenance / facilities / industrial prop library — owner: fable3-b.
// Covers janitorial, electrical, plumbing, storage logistics, dock & garage
// hardware, the archive rolling racks and the server-room rack kit.

import * as THREE from 'three';
import { registerProp } from './index.js';
import { getMaterial } from '../materials.js';
import { emissiveCanvasMat, atlasRegion, atlasPlane, paperAtlasMaterial } from './signage.js';

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
function cyl(g, mat, rT, rB, h, x, y, z, seg = 10, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), typeof mat === 'string' ? getMaterial(mat) : mat);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  if (rz) m.rotation.z = rz;
  g.add(m);
  return m;
}
function col(g, x0, y0, z0, x1, y1, z1, surface = 'metal', extra = {}) {
  g.userData.colliders.push({ x0, y0, z0, x1, y1, z1, surface, ...extra });
}

const custom = new Map();
function cmat(key, opts) {
  if (!custom.has(key)) {
    const m = new THREE.MeshStandardMaterial(opts);
    m.name = key;
    custom.set(key, m);
  }
  return custom.get(key);
}
const YELLOW = () => cmat('safety_yellow_prop', { color: 0xd8b93a, roughness: 0.6 });
const ORANGE = () => cmat('safety_orange_prop', { color: 0xc25a2e, roughness: 0.65 });
const RED = () => cmat('extinguisher_red', { color: 0x9e2f28, roughness: 0.45, metalness: 0.2 });
const GREEN_BTN = () => cmat('btn_green', { color: 0x2f7a42, roughness: 0.4, emissive: 0x123a1c, emissiveIntensity: 0.6 });
const RED_BTN = () => cmat('btn_red', { color: 0x9e2f28, roughness: 0.4, emissive: 0x3a0f0c, emissiveIntensity: 0.6 });

// ===========================================================================
// -- electrical -------------------------------------------------------------

// MNT-001 electrical panel (wall; door + breaker rows)
registerProp('electrical_panel', (opts) => {
  const g = P('MNT-001');
  const W = 0.6, H = 0.9;
  box(g, 'metal_painted', W, H, 0.12, 0, 0, 0.06);
  box(g, 'metal_painted', W - 0.06, H - 0.06, 0.02, opts.open ? W * 0.72 : 0, 0, opts.open ? 0.1 : 0.13, opts.open ? 1.2 : 0);
  // breaker rows visible on the face
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 2; c++) {
      box(g, 'plastic_dark', 0.09, 0.035, 0.02, -0.06 + c * 0.12, H / 2 - 0.16 - r * 0.1, 0.125);
    }
  }
  box(g, YELLOW(), 0.16, 0.1, 0.005, 0, -H / 2 + 0.1, 0.126); // warning sticker
  return g;
});

// MNT-002 small breaker box
registerProp('breaker_box', () => {
  const g = P('MNT-002');
  box(g, 'metal_painted', 0.32, 0.44, 0.1, 0, 0, 0.05);
  box(g, 'metal_dark', 0.26, 0.05, 0.02, 0, 0.14, 0.1);
  box(g, 'plastic_dark', 0.05, 0.08, 0.02, 0, -0.05, 0.1); // main switch
  return g;
});

// MNT-003 transformer cabinet with hazard label
registerProp('transformer_cabinet', () => {
  const g = P('MNT-003');
  const W = 0.9, H = 1.5, D = 0.8;
  box(g, 'metal_painted', W, H, D, 0, H / 2, 0);
  for (let i = 0; i < 5; i++) box(g, 'metal_dark', W - 0.1, 0.03, 0.02, 0, 0.3 + i * 0.22, D / 2 + 0.005); // vents
  const rect = atlasRegion('hz:highvolt', 120, 100, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#d8b93a'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#22262a'; ctx.lineWidth = 4; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    // lightning bolt
    ctx.fillStyle = '#22262a';
    ctx.beginPath();
    ctx.moveTo(x + 62, y + 14); ctx.lineTo(x + 44, y + 46); ctx.lineTo(x + 58, y + 46);
    ctx.lineTo(x + 48, y + 74); ctx.lineTo(x + 78, y + 38); ctx.lineTo(x + 62, y + 38);
    ctx.lineTo(x + 72, y + 14); ctx.closePath(); ctx.fill();
    ctx.font = '800 13px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DANGER 600V', x + w / 2, y + 88);
  });
  const label = new THREE.Mesh(atlasPlane(0.3, 0.25, rect), paperAtlasMaterial());
  label.position.set(0, H * 0.62, D / 2 + 0.006);
  g.add(label);
  cyl(g, 'metal_dark', 0.05, 0.05, 0.25, -0.25, H + 0.12, 0, 8);
  cyl(g, 'metal_dark', 0.05, 0.05, 0.25, 0.25, H + 0.12, 0, 8); // bushings
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// MNT-004 wall pipe run (param len, n pipes, valves) — runs along local X
registerProp('pipe_run', (opts, rng) => {
  const g = P('MNT-004');
  const L = opts.len || 3, n = opts.n || 2;
  for (let i = 0; i < n; i++) {
    const r = i === 0 ? 0.05 : 0.032;
    const y = -i * 0.16, z = 0.02 + i * 0.02;
    cyl(g, i === 0 ? 'metal_painted' : 'metal_brushed', r, r, L, 0, y, z, 10, 0, Math.PI / 2);
    // brackets
    const k = Math.max(2, Math.round(L / 1.4));
    for (let b = 0; b <= k; b++) box(g, 'metal_dark', 0.03, 0.1, 0.06, -L / 2 + (L / k) * b, y, z - 0.03);
    if (opts.valves !== false && L > 1.4) {
      const vx = -L / 2 + L * (0.3 + 0.4 * (rng ? rng.random() : 0.5));
      cyl(g, RED(), 0.07, 0.07, 0.02, vx, y + r + 0.09, z, 10);
      cyl(g, 'metal_brushed', 0.014, 0.014, 0.1, vx, y + r + 0.045, z, 6);
    }
  }
  return g;
});

// MNT-005 vertical pipe drop (stair corners)
registerProp('pipe_vertical', (opts) => {
  const g = P('MNT-005');
  const H = opts.h || 2.8;
  cyl(g, 'metal_painted', 0.05, 0.05, H, 0, H / 2, 0, 10);
  cyl(g, 'metal_brushed', 0.03, 0.03, H, 0.12, H / 2, 0.02, 8);
  for (let b = 0; b < 3; b++) box(g, 'metal_dark', 0.3, 0.05, 0.04, 0.05, 0.3 + b * (H / 3), -0.04);
  cyl(g, RED(), 0.06, 0.06, 0.02, 0, 1.1, 0.07, 10, Math.PI / 2);
  return g;
});

// MNT-006 portable HVAC / air-handler unit
registerProp('hvac_unit', () => {
  const g = P('MNT-006');
  const W = 1.5, H = 1.35, D = 0.85;
  box(g, 'metal_painted', W, H - 0.12, D, 0, 0.12 + (H - 0.12) / 2, 0);
  box(g, 'metal_dark', W - 0.15, 0.12, D - 0.15, 0, 0.06, 0);
  // fan grille + duct collar
  cyl(g, 'metal_dark', 0.28, 0.28, 0.05, -0.35, 0.8, D / 2 + 0.01, 16, Math.PI / 2);
  cyl(g, 'metal_brushed', 0.02, 0.02, 0.56, -0.35, 0.8, D / 2 + 0.03, 6, 0, Math.PI / 2);
  cyl(g, 'metal_brushed', 0.02, 0.02, 0.56, -0.35, 0.8, D / 2 + 0.03, 6, Math.PI / 2, 0);
  cyl(g, 'aluminum', 0.2, 0.2, 0.3, 0.4, H + 0.14, 0, 12);
  box(g, 'plastic_dark', 0.3, 0.24, 0.03, 0.42, 0.7, D / 2 + 0.01); // control face
  box(g, GREEN_BTN(), 0.04, 0.04, 0.02, 0.35, 0.66, D / 2 + 0.03);
  box(g, RED_BTN(), 0.04, 0.04, 0.02, 0.49, 0.66, D / 2 + 0.03);
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// MNT-007 fire extinguisher (+ wall bracket when opts.bracket)
registerProp('fire_extinguisher', (opts) => {
  const g = P('MNT-007');
  cyl(g, RED(), 0.085, 0.085, 0.5, 0, 0.25, 0, 12);
  cyl(g, RED(), 0.05, 0.085, 0.06, 0, 0.53, 0, 12);
  cyl(g, 'metal_brushed', 0.015, 0.015, 0.08, 0, 0.6, 0, 8);
  box(g, 'metal_dark', 0.03, 0.02, 0.12, 0, 0.62, 0.03);
  box(g, 'paper', 0.09, 0.14, 0.004, 0, 0.3, 0.086);
  if (opts.bracket) box(g, 'metal_dark', 0.06, 0.1, 0.04, 0, 0.35, -0.1);
  return g;
});

// MNT-008 glass-front fire cabinet (recessed look, wall)
registerProp('fire_cabinet', () => {
  const g = P('MNT-008');
  const W = 0.45, H = 0.75, D = 0.2;
  box(g, RED(), W, H, D, 0, 0, -D / 2 + 0.02);
  box(g, 'metal_dark', W - 0.05, H - 0.05, 0.02, 0, 0, 0.02 - 0.005);
  // extinguisher inside
  cyl(g, RED(), 0.07, 0.07, 0.42, 0, -0.08, -0.05, 10);
  cyl(g, 'metal_brushed', 0.012, 0.012, 0.07, 0, 0.18, -0.05, 6);
  // glass pane + FIRE lettering
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.09, H - 0.09),
    cmat('fire_cab_glass', { color: 0xcfe6f0, roughness: 0.08, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  glass.position.set(0, 0, 0.035);
  g.add(glass);
  const rect = atlasRegion('fire_cab_text', 60, 160, (ctx, x, y, w, h) => {
    ctx.fillStyle = 'rgba(158,47,40,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.font = '800 34px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8f1f8';
    for (let i = 0; i < 4; i++) ctx.fillText('FIRE'[i], x + w / 2, y + 26 + i * 36);
  });
  const strip = new THREE.Mesh(atlasPlane(0.09, 0.56, rect), paperAtlasMaterial());
  strip.position.set(-W / 2 + 0.085, 0, 0.038);
  g.add(strip);
  col(g, -W / 2, -H / 2, -D / 2, W / 2, H / 2, D / 2, 'metal', { blocksSight: false });
  return g;
});

// MNT-009 smoke detector (tiny, ceiling)
registerProp('smoke_detector', () => {
  const g = P('MNT-009');
  cyl(g, 'plastic_light', 0.07, 0.055, 0.035, 0, -0.018, 0, 12);
  cyl(g, 'plastic_dark', 0.02, 0.02, 0.01, 0, -0.04, 0, 8);
  return g;
});

// ===========================================================================
// -- janitorial ---------------------------------------------------------

// MNT-010 janitor cart
registerProp('janitor_cart', () => {
  const g = P('MNT-010');
  box(g, YELLOW(), 0.9, 0.08, 0.5, 0, 0.24, 0);
  box(g, YELLOW(), 0.9, 0.08, 0.5, 0, 0.72, 0);
  for (const [sx, sz] of [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]]) {
    box(g, 'metal_dark', 0.03, 0.75, 0.03, sx, 0.42, sz);
    cyl(g, 'rubber', 0.05, 0.05, 0.03, sx, 0.05, sz, 10, Math.PI / 2);
  }
  box(g, 'metal_dark', 0.03, 0.35, 0.4, 0.47, 0.95, 0);   // push handle
  // gray bag on one end
  box(g, 'fabric_gray', 0.36, 0.5, 0.44, -0.6, 0.55, 0);
  // bottles + bucket on top
  for (let i = 0; i < 3; i++) box(g, i === 1 ? ORANGE() : 'plastic_light', 0.07, 0.18, 0.07, -0.25 + i * 0.16, 0.85, -0.12);
  box(g, 'plastic_dark', 0.24, 0.16, 0.24, 0.2, 0.84, 0.08);
  col(g, -0.8, 0, -0.27, 0.5, 1.05, 0.27, 'plastic');
  return g;
});

// MNT-011 mop + rolling bucket
registerProp('mop_bucket', () => {
  const g = P('MNT-011');
  box(g, YELLOW(), 0.36, 0.3, 0.3, 0, 0.2, 0);
  box(g, YELLOW(), 0.3, 0.18, 0.06, 0, 0.42, -0.1); // wringer
  for (const [sx, sz] of [[-0.14, -0.11], [0.14, -0.11], [-0.14, 0.11], [0.14, 0.11]]) {
    cyl(g, 'rubber', 0.03, 0.03, 0.025, sx, 0.035, sz, 8, Math.PI / 2);
  }
  cyl(g, 'wood', 0.014, 0.014, 1.3, 0.1, 0.75, 0.05, 8, 0, -0.18);
  box(g, 'fabric_gray', 0.12, 0.14, 0.12, 0.21, 0.16, 0.06); // mop head in bucket
  col(g, -0.18, 0, -0.15, 0.18, 0.45, 0.15, 'plastic', { blocksSight: false });
  return g;
});

// MNT-012 broom (leaning: head planted on the floor, shaft tips toward local
// -X — place ~0.25 m from a wall with -X facing it so the tip makes contact)
registerProp('broom', () => {
  const g = P('MNT-012');
  const a = 0.2, L = 1.25;
  // shaft bottom at (sin(a)·L/2, 0.05) so it seats into the head block
  cyl(g, 'wood', 0.013, 0.013, L, 0, Math.cos(a) * (L / 2) + 0.05, 0, 8, 0, a);
  box(g, ORANGE(), 0.25, 0.1, 0.06, Math.sin(a) * (L / 2), 0.05, 0);
  return g;
});

// MNT-013 cleaning bottle set (tiny)
registerProp('bottle_set', (opts, rng) => {
  const g = P('MNT-013');
  const mats = [ORANGE(), 'plastic_light', 'plastic_dark', YELLOW()];
  const n = opts.n ?? 4;
  for (let i = 0; i < n; i++) {
    const x = (rng.random() - 0.5) * 0.4, z = (rng.random() - 0.5) * 0.16;
    box(g, mats[i % 4], 0.07, 0.2, 0.05, x, 0.1, z, rng.range(0, 3));
    cyl(g, 'plastic_dark', 0.012, 0.012, 0.05, x, 0.22, z, 6);
  }
  return g;
});

// MNT-014 wet-floor A-frame sign — "CAUTION — ICE MELT"
registerProp('wet_floor_sign', () => {
  const g = P('MNT-014');
  const rect = atlasRegion('wetfloor', 100, 130, (ctx, x, y, w, h) => {
    ctx.fillStyle = '#d8b93a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#22262a';
    ctx.font = '800 20px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CAUTION', x + w / 2, y + 20);
    // slipping figure
    ctx.strokeStyle = '#22262a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const fx = x + w / 2, fy = y + 52;
    ctx.beginPath(); ctx.arc(fx + 8, fy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx + 4, fy + 7); ctx.lineTo(fx - 6, fy + 24);
    ctx.moveTo(fx - 6, fy + 24); ctx.lineTo(fx + 14, fy + 32);
    ctx.moveTo(fx - 6, fy + 24); ctx.lineTo(fx - 22, fy + 28);
    ctx.stroke();
    ctx.font = '800 15px Arial, sans-serif';
    ctx.fillText('ICE MELT', x + w / 2, y + 100);
    ctx.fillText('IN USE', x + w / 2, y + 118);
  });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(atlasPlane(0.32, 0.42, rect), paperAtlasMaterial());
    leaf.position.set(0, 0.33, s * 0.1);
    leaf.rotation.x = s * -0.42;
    if (s < 0) leaf.rotation.y = Math.PI;
    g.add(leaf);
    const back = box(g, YELLOW(), 0.34, 0.44, 0.012, 0, 0.33, s * 0.104);
    back.rotation.x = s * 0.42;
  }
  col(g, -0.17, 0, -0.2, 0.17, 0.62, 0.2, 'plastic', { blocksSight: false });
  return g;
});

// ===========================================================================
// -- storage & logistics ------------------------------------------------

// MNT-015 utility shelving (param: bays, filled)
registerProp('utility_shelf', (opts, rng) => {
  const g = P('MNT-015');
  const bays = opts.bays || 2, W = bays * 0.9, D = 0.45, H = opts.h || 1.85;
  const shelves = 4;
  for (let i = 0; i <= bays; i++) {
    const x = -W / 2 + i * 0.9;
    box(g, 'metal_painted', 0.04, H, 0.04, x, H / 2, -D / 2 + 0.02);
    box(g, 'metal_painted', 0.04, H, 0.04, x, H / 2, D / 2 - 0.02);
  }
  for (let s = 0; s < shelves; s++) {
    const y = 0.12 + s * ((H - 0.2) / (shelves - 1));
    box(g, 'metal_painted', W, 0.03, D, 0, y, 0);
    if (opts.filled !== false) {
      // deterministic fill: boxes / bottles / tool bits
      const items = 1 + Math.floor(rng.random() * 3);
      for (let it = 0; it < items; it++) {
        const x = -W / 2 + 0.2 + rng.random() * (W - 0.4);
        const kind = rng.random();
        if (kind < 0.5) box(g, 'cardboard', 0.22 + rng.random() * 0.16, 0.16 + rng.random() * 0.14, 0.3, x, y + 0.11, 0, rng.range(-0.1, 0.1));
        else if (kind < 0.75) box(g, rng.chance(0.5) ? ORANGE() : 'plastic_light', 0.08, 0.18, 0.08, x, y + 0.105, 0.05);
        else box(g, 'metal_dark', 0.24, 0.08, 0.16, x, y + 0.055, -0.04);
      }
    }
  }
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// MNT-016 cardboard box (sizes s/m/l, or stack)
registerProp('box_cardboard', (opts, rng) => {
  const g = P('MNT-016');
  const size = opts.size || 'm';
  const dims = { s: [0.3, 0.22, 0.3], m: [0.45, 0.34, 0.42], l: [0.6, 0.45, 0.5] }[size];
  const make = (y, s, ry) => {
    box(g, 'cardboard', dims[0] * s, dims[1] * s, dims[2] * s, 0, y + dims[1] * s / 2, 0, ry);
    box(g, 'paper', 0.02, dims[1] * s * 0.9, dims[2] * s + 0.006, 0, y + dims[1] * s / 2, 0, ry); // tape line
  };
  if (opts.stack) {
    make(0, 1, 0);
    make(dims[1], 0.92, rng ? rng.range(-0.25, 0.25) : 0.2);
    if (opts.stack > 2) make(dims[1] * 1.92, 0.8, rng ? rng.range(-0.3, 0.3) : -0.25);
    col(g, -dims[0] / 2, 0, -dims[2] / 2, dims[0] / 2, dims[1] * (opts.stack > 2 ? 2.7 : 1.9), dims[2] / 2, 'cardboard', { blocksSight: false });
  } else {
    make(0, 1, 0);
    if (dims[1] >= 0.3) col(g, -dims[0] / 2, 0, -dims[2] / 2, dims[0] / 2, dims[1], dims[2] / 2, 'cardboard', { blocksSight: false });
  }
  return g;
});

// MNT-017 wooden shipping crate
registerProp('crate_wood', (opts) => {
  const g = P('MNT-017');
  const W = opts.w || 0.8, H = opts.h || 0.7, D = opts.d || 0.7;
  box(g, 'wood_dark', W, H, D, 0, H / 2, 0);
  for (const s of [-1, 1]) {
    box(g, 'wood', W + 0.02, 0.07, 0.03, 0, 0.05, s * (D / 2));
    box(g, 'wood', W + 0.02, 0.07, 0.03, 0, H - 0.05, s * (D / 2));
    box(g, 'wood', 0.03, 0.07, D + 0.02, s * (W / 2), 0.05, 0);
    box(g, 'wood', 0.03, 0.07, D + 0.02, s * (W / 2), H - 0.05, 0);
    box(g, 'wood', 0.07, H, 0.03, s * (W / 2 - 0.06), H / 2, D / 2 + 0.005);
  }
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'wood');
  return g;
});

// MNT-018 pallet (+ boxes / shrink-wrap variants)
registerProp('pallet', (opts, rng) => {
  const g = P('MNT-018');
  for (let i = 0; i < 5; i++) box(g, 'wood', 0.1, 0.02, 1.2, -0.55 + i * 0.275, 0.135, 0);
  for (let i = 0; i < 3; i++) {
    box(g, 'wood_dark', 1.2, 0.09, 0.1, 0, 0.075, -0.5 + i * 0.5);
    box(g, 'wood', 1.2, 0.02, 0.12, 0, 0.02, -0.5 + i * 0.5);
  }
  const variant = opts.variant || 'empty';
  if (variant === 'boxes') {
    box(g, 'cardboard', 0.5, 0.4, 0.5, -0.28, 0.35, -0.26);
    box(g, 'cardboard', 0.44, 0.34, 0.46, 0.27, 0.32, -0.24, 0.1);
    box(g, 'cardboard', 0.5, 0.36, 0.44, -0.24, 0.33, 0.3, -0.06);
    box(g, 'cardboard', 0.42, 0.3, 0.4, 0.24, 0.7 - 0.15 + 0.15, 0.26, rng ? rng.range(-0.2, 0.2) : 0.15);
    col(g, -0.6, 0, -0.6, 0.6, 0.9, 0.6, 'cardboard');
  } else if (variant === 'wrapped') {
    const wrap = cmat('shrink_wrap', { color: 0xcfd8dc, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.55 });
    box(g, 'cardboard', 1.0, 0.9, 1.0, 0, 0.6, 0);
    box(g, wrap, 1.06, 0.98, 1.06, 0, 0.62, 0);
    col(g, -0.6, 0, -0.6, 0.6, 1.12, 0.6, 'cardboard');
  } else {
    col(g, -0.6, 0, -0.6, 0.6, 0.15, 0.6, 'wood', { blocksSight: false });
  }
  return g;
});

// MNT-019 hand truck (two-wheel dolly)
registerProp('hand_truck', () => {
  const g = P('MNT-019');
  box(g, 'metal_dark', 0.04, 1.15, 0.04, -0.18, 0.62, 0, 0);
  box(g, 'metal_dark', 0.04, 1.15, 0.04, 0.18, 0.62, 0, 0);
  for (let i = 0; i < 3; i++) box(g, 'metal_dark', 0.4, 0.03, 0.03, 0, 0.35 + i * 0.32, -0.02);
  box(g, 'metal_painted', 0.44, 0.03, 0.34, 0, 0.06, 0.17); // toe plate
  for (const s of [-1, 1]) cyl(g, 'rubber', 0.1, 0.1, 0.05, s * 0.22, 0.1, -0.05, 12, 0, Math.PI / 2);
  box(g, 'rubber', 0.4, 0.03, 0.03, 0, 1.2, 0.02);
  col(g, -0.24, 0, -0.16, 0.24, 1.2, 0.2, 'metal', { blocksSight: false });
  return g;
});

// MNT-020 A-frame step ladder (open, self-standing). Legs meet under the top
// cap and both pairs plant on the floor; steps track the front-leg slope so
// nothing floats (audit 1 fix — the old build splayed legs away from rungs).
registerProp('ladder_aframe', (opts) => {
  const g = P('MNT-020');
  const H = opts.h || 1.9;
  const spread = 0.36 + H * 0.14;                    // front↔back footprint on the floor
  const lean = Math.atan((spread / 2 - 0.03) / H);   // leg tilt off vertical
  const legLen = H / Math.cos(lean) + 0.02;
  // z of a leg's centerline at height y (s=+1 front/step side, s=-1 rear)
  const zAt = (y, s) => s * (spread / 2 - (spread / 2 - 0.03) * (y / H));
  for (const s of [-1, 1]) {
    for (const side of [-1, 1]) {
      const leg = box(g, s > 0 ? YELLOW() : 'metal_painted', 0.05, legLen, 0.035,
        side * 0.22, H / 2, (zAt(0, s) + zAt(H, s)) / 2);
      leg.rotation.x = -s * lean; // top converges toward the cap
    }
  }
  // steps on the front pair (seated on the leg line)
  const steps = Math.max(3, Math.round(H / 0.42));
  for (let r = 0; r < steps; r++) {
    const y = 0.22 + r * ((H - 0.48) / (steps - 1));
    box(g, 'metal_brushed', 0.42, 0.03, 0.1, 0, y, zAt(y, 1));
  }
  // rear cross braces
  box(g, 'metal_painted', 0.42, 0.05, 0.03, 0, H * 0.36, zAt(H * 0.36, -1));
  box(g, 'metal_painted', 0.42, 0.05, 0.03, 0, H * 0.72, zAt(H * 0.72, -1));
  // side spreader bars + top cap tying the halves together
  for (const side of [-1, 1]) {
    box(g, 'metal_dark', 0.02, 0.03, zAt(H * 0.55, 1) - zAt(H * 0.55, -1), side * 0.2, H * 0.55, 0);
  }
  box(g, YELLOW(), 0.5, 0.045, 0.17, 0, H - 0.02, 0);
  col(g, -0.26, 0, -spread / 2 - 0.03, 0.26, H, spread / 2 + 0.03, 'metal', { blocksSight: false });
  return g;
});

// MNT-021 tool case
registerProp('tool_case', () => {
  const g = P('MNT-021');
  box(g, ORANGE(), 0.5, 0.2, 0.24, 0, 0.1, 0);
  box(g, 'plastic_dark', 0.5, 0.03, 0.24, 0, 0.215, 0);
  box(g, 'plastic_dark', 0.14, 0.035, 0.04, 0, 0.23, 0.0);
  for (const s of [-1, 1]) box(g, 'metal_brushed', 0.05, 0.04, 0.015, s * 0.16, 0.19, 0.122);
  return g;
});

// MNT-022 workbench with pegboard
registerProp('workbench', (opts) => {
  const g = P('MNT-022');
  const W = opts.w || 1.8, D = 0.7, H = 0.92;
  box(g, 'wood', W, 0.05, D, 0, H, 0);
  for (const [sx, sz] of [[-W / 2 + 0.08, -D / 2 + 0.08], [W / 2 - 0.08, -D / 2 + 0.08], [-W / 2 + 0.08, D / 2 - 0.08], [W / 2 - 0.08, D / 2 - 0.08]]) {
    box(g, 'metal_dark', 0.06, H, 0.06, sx, H / 2, sz);
  }
  box(g, 'metal_painted', W - 0.1, 0.35, D - 0.1, 0, 0.32, 0); // lower shelf clutter volume
  // pegboard rises behind
  const pbH = 0.9;
  box(g, 'laminate', W, pbH, 0.03, 0, H + pbH / 2 + 0.02, -D / 2 + 0.015);
  // tools on the pegboard (silhouettes)
  box(g, 'metal_dark', 0.05, 0.3, 0.02, -W * 0.3, H + 0.5, -D / 2 + 0.045);
  box(g, 'wood_dark', 0.04, 0.22, 0.02, -W * 0.14, H + 0.46, -D / 2 + 0.045);
  cyl(g, 'metal_brushed', 0.07, 0.07, 0.02, W * 0.05, H + 0.52, -D / 2 + 0.045, 10, Math.PI / 2);
  box(g, ORANGE(), 0.12, 0.16, 0.03, W * 0.24, H + 0.48, -D / 2 + 0.045);
  box(g, 'metal_dark', 0.18, 0.04, 0.02, W * 0.36, H + 0.55, -D / 2 + 0.045);
  // vice on the bench
  box(g, 'metal_dark', 0.12, 0.12, 0.1, W * 0.32, H + 0.08, 0.12);
  cyl(g, 'metal_brushed', 0.012, 0.012, 0.16, W * 0.32, H + 0.06, 0.2, 6, 0, Math.PI / 2);
  col(g, -W / 2, 0, -D / 2, W / 2, H + 0.04, D / 2, 'wood');
  return g;
});

// MNT-023 water-heater tank
registerProp('water_heater', () => {
  const g = P('MNT-023');
  cyl(g, 'metal_painted', 0.42, 0.42, 1.7, 0, 0.9, 0, 16);
  cyl(g, 'metal_dark', 0.44, 0.44, 0.06, 0, 0.06, 0, 16);
  cyl(g, 'metal_dark', 0.3, 0.42, 0.1, 0, 1.8, 0, 16);
  cyl(g, 'metal_brushed', 0.03, 0.03, 0.5, 0.1, 2.05, 0, 8);
  cyl(g, 'metal_brushed', 0.03, 0.03, 0.6, 0, 1.2, 0.46, 8, Math.PI / 2);
  box(g, 'plastic_dark', 0.2, 0.24, 0.1, 0, 0.55, 0.42); // control box
  cyl(g, RED(), 0.05, 0.05, 0.02, 0, 1.2, 0.72, 8, Math.PI / 2);
  col(g, -0.44, 0, -0.44, 0.44, 1.85, 0.44, 'metal');
  return g;
});

// MNT-024 pump + manifold assembly
registerProp('pump_manifold', () => {
  const g = P('MNT-024');
  box(g, 'concrete_dark', 1.1, 0.15, 0.6, 0, 0.075, 0); // housekeeping pad
  cyl(g, 'metal_painted', 0.18, 0.18, 0.4, -0.25, 0.35, 0, 12, 0, Math.PI / 2); // pump body
  cyl(g, 'metal_dark', 0.12, 0.12, 0.2, -0.55, 0.35, 0, 10, 0, Math.PI / 2);   // motor
  cyl(g, 'metal_brushed', 0.05, 0.05, 0.7, 0.15, 0.5, 0, 8);                    // riser
  cyl(g, 'metal_brushed', 0.05, 0.05, 0.9, 0.15, 0.85, 0.0, 8, 0, Math.PI / 2); // header
  for (let i = 0; i < 3; i++) {
    cyl(g, RED(), 0.06, 0.06, 0.02, -0.15 + i * 0.3, 0.98, 0, 10);
    cyl(g, 'metal_brushed', 0.012, 0.012, 0.09, -0.15 + i * 0.3, 0.94, 0, 6);
  }
  cyl(g, 'metal_dark', 0.06, 0.06, 0.06, 0.42, 0.85, 0, 8, 0, Math.PI / 2); // gauge
  col(g, -0.55, 0, -0.3, 0.55, 0.95, 0.3, 'metal', { blocksSight: false });
  return g;
});

// MNT-025 storage locker bank (param n)
registerProp('locker_bank', (opts) => {
  const g = P('MNT-025');
  const n = opts.n || 4, W = n * 0.38, H = 1.8, D = 0.45;
  box(g, 'metal_painted', W, H, D, 0, H / 2, 0);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.19 + i * 0.38;
    box(g, 'metal_dark', 0.32, H - 0.14, 0.015, x, H / 2, D / 2 + 0.004);
    box(g, 'metal_brushed', 0.02, 0.08, 0.02, x + 0.12, H * 0.55, D / 2 + 0.015);
    for (let v = 0; v < 2; v++) box(g, 'metal_painted', 0.2, 0.02, 0.02, x, H - 0.3 - v * 0.06, D / 2 + 0.012);
  }
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// ===========================================================================
// -- garage & dock -------------------------------------------------------

// MNT-026 traffic cone
registerProp('traffic_cone', () => {
  const g = P('MNT-026');
  box(g, ORANGE(), 0.3, 0.03, 0.3, 0, 0.015, 0);
  cyl(g, ORANGE(), 0.03, 0.14, 0.52, 0, 0.29, 0, 10);
  cyl(g, 'plastic_light', 0.085, 0.1, 0.09, 0, 0.28, 0, 10);
  col(g, -0.15, 0, -0.15, 0.15, 0.55, 0.15, 'plastic', { blocksSight: false });
  return g;
});

// MNT-027 parking bumper (wheel stop)
registerProp('parking_bumper', () => {
  const g = P('MNT-027');
  box(g, 'concrete', 1.6, 0.13, 0.3, 0, 0.065, 0);
  box(g, YELLOW(), 0.24, 0.135, 0.31, -0.55, 0.066, 0);
  box(g, YELLOW(), 0.24, 0.135, 0.31, 0.55, 0.066, 0);
  col(g, -0.8, 0, -0.15, 0.8, 0.13, 0.15, 'concrete', { blocksSight: false, noStand: false });
  return g;
});

// MNT-028 tire stack
registerProp('tire_stack', (opts) => {
  const g = P('MNT-028');
  const n = opts.n || 4;
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 8, 16), getMaterial('rubber'));
    t.position.set((i % 2) * 0.03, 0.115 + i * 0.21, ((i + 1) % 2) * 0.02);
    t.rotation.x = Math.PI / 2;
    g.add(t);
    cyl(g, 'metal_dark', 0.15, 0.15, 0.02, (i % 2) * 0.03, 0.115 + i * 0.21, ((i + 1) % 2) * 0.02, 12);
  }
  col(g, -0.4, 0, -0.4, 0.4, n * 0.21 + 0.04, 0.4, 'rubber', { blocksSight: false });
  return g;
});

// MNT-029 dock bumper (wall-mounted rubber block)
registerProp('dock_bumper', () => {
  const g = P('MNT-029');
  box(g, 'rubber', 0.5, 0.35, 0.12, 0, 0, 0.06);
  box(g, 'metal_dark', 0.56, 0.4, 0.02, 0, 0, -0.005);
  return g;
});

// MNT-030 dock leveler plate (floor, at the shutter)
registerProp('dock_leveler', () => {
  const g = P('MNT-030');
  const plate = box(g, 'metal_dark', 2.2, 0.03, 1.7, 0, 0.015, 0);
  plate.material = cmat('leveler_plate', { color: 0x4e565c, roughness: 0.5, metalness: 0.7 });
  box(g, YELLOW(), 2.2, 0.032, 0.12, 0, 0.016, -0.8);
  box(g, YELLOW(), 2.2, 0.032, 0.12, 0, 0.016, 0.8);
  box(g, 'metal_dark', 2.2, 0.05, 0.1, 0, 0.025, 0.88);
  return g;
});

// MNT-031 roller-shutter control box (wall; green/red buttons)
registerProp('shutter_control', () => {
  const g = P('MNT-031');
  box(g, 'metal_painted', 0.22, 0.3, 0.1, 0, 0, 0.05);
  box(g, GREEN_BTN(), 0.055, 0.055, 0.02, -0.05, 0.06, 0.105);
  box(g, RED_BTN(), 0.055, 0.055, 0.02, 0.05, 0.06, 0.105);
  box(g, 'plastic_dark', 0.12, 0.05, 0.02, 0, -0.08, 0.105);
  cyl(g, 'metal_dark', 0.015, 0.015, 0.3, 0, 0.3, 0.02, 6); // conduit up
  return g;
});

// MNT-032 oil drum
registerProp('oil_drum', (opts) => {
  const g = P('MNT-032');
  const mat = opts.color === 'blue' ? cmat('drum_blue', { color: 0x3a5a74, roughness: 0.5, metalness: 0.3 })
    : cmat('drum_gray', { color: 0x5c6166, roughness: 0.5, metalness: 0.3 });
  cyl(g, mat, 0.29, 0.29, 0.88, 0, 0.44, 0, 14);
  for (const y of [0.25, 0.62]) cyl(g, mat, 0.305, 0.305, 0.03, 0, y, 0, 14);
  cyl(g, 'metal_dark', 0.26, 0.26, 0.02, 0, 0.89, 0, 14);
  col(g, -0.3, 0, -0.3, 0.3, 0.9, 0.3, 'metal');
  return g;
});

// ===========================================================================
// -- archive & server ------------------------------------------------------

// MNT-033 archive rolling rack (landmark): 2.2 m double-sided shelf,
// end handwheel, filled with records boxes. Runs along local X.
registerProp('rolling_rack', (opts, rng) => {
  const g = P('MNT-033');
  const L = opts.len || 2.2, H = 2.2, D = 0.75;
  // rail base + carriage
  box(g, 'metal_dark', L + 0.3, 0.06, D + 0.1, 0, 0.03, 0);
  box(g, 'metal_painted', L, 0.1, D, 0, 0.11, 0);
  // uprights + end panels
  box(g, 'metal_painted', 0.05, H - 0.16, D, -L / 2 + 0.025, 0.16 + (H - 0.16) / 2, 0);
  box(g, 'metal_painted', 0.05, H - 0.16, D, L / 2 - 0.025, 0.16 + (H - 0.16) / 2, 0);
  box(g, 'metal_painted', L, H - 0.16, 0.04, 0, 0.16 + (H - 0.16) / 2, 0); // center spine
  // shelves + boxes both sides
  for (let s = 0; s < 5; s++) {
    const y = 0.16 + s * 0.45;
    box(g, 'metal_painted', L - 0.1, 0.03, D, 0, y, 0);
    for (const side of [-1, 1]) {
      let x = -L / 2 + 0.12;
      while (x < L / 2 - 0.2) {
        if (!rng || rng.random() > 0.18) {
          const bw = 0.3;
          box(g, 'cardboard', bw, 0.26, 0.3, x + bw / 2, y + 0.145, side * (D / 4 + 0.02), rng ? rng.range(-0.04, 0.04) : 0);
          // label strip
          box(g, 'paper', bw - 0.08, 0.07, 0.004, x + bw / 2, y + 0.16, side * (D / 4 + 0.175));
        }
        x += 0.32;
      }
    }
  }
  // end handwheel
  const wheelZ = 0;
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 16), getMaterial('metal_brushed'));
  t.position.set(-L / 2 - 0.05, 1.05, wheelZ);
  t.rotation.y = Math.PI / 2;
  g.add(t);
  for (let sp = 0; sp < 3; sp++) {
    const spoke = box(g, 'metal_brushed', 0.015, 0.26, 0.015, -L / 2 - 0.05, 1.05, wheelZ);
    spoke.rotation.x = sp * Math.PI / 3;
  }
  cyl(g, 'metal_dark', 0.03, 0.03, 0.1, -L / 2 - 0.02, 1.05, wheelZ, 8, 0, Math.PI / 2);
  col(g, -L / 2 - 0.1, 0, -D / 2, L / 2, H, D / 2, 'metal');
  return g;
});

// MNT-034 records box (tiny, labeled)
registerProp('records_box', (opts) => {
  const g = P('MNT-034');
  box(g, 'cardboard', 0.32, 0.27, 0.4, 0, 0.135, 0);
  box(g, 'cardboard', 0.34, 0.05, 0.42, 0, 0.275, 0);
  box(g, 'paper', 0.2, 0.1, 0.004, 0, 0.15, 0.202);
  if (opts.lidOff) {
    box(g, 'paper', 0.26, 0.05, 0.34, 0.02, 0.31, -0.02, 0.12); // papers poking out
  }
  return g;
});

// MNT-035 server rack (emissive LED front) — the 'electronics-looking' prop
// is registered here so the server room has no cross-agent dependency.
registerProp('server_rack', (opts) => {
  const g = P('MNT-035');
  const W = 0.6, H = 2.0, D = 1.0;
  const variant = (opts.variant ?? 0) % 3;
  const front = emissiveCanvasMat(`rack_front_${variant}`, 128, 384, (ctx, W2, H2) => {
    ctx.fillStyle = '#14181c'; ctx.fillRect(0, 0, W2, H2);
    let seed = 977 + variant * 131;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let y = 10;
    while (y < H2 - 24) {
      const uh = rnd() < 0.3 ? 34 : 17; // 2U / 1U
      ctx.fillStyle = rnd() < 0.15 ? '#0c0e10' : '#1e242a';
      ctx.fillRect(8, y, W2 - 16, uh - 3);
      // vent slots
      ctx.fillStyle = '#14181c';
      for (let vx = 14; vx < W2 - 40; vx += 7) ctx.fillRect(vx, y + 4, 4, uh - 11);
      // LEDs
      const lit = rnd() > 0.2;
      if (lit) {
        ctx.fillStyle = rnd() < 0.82 ? '#7fd2ff' : (rnd() < 0.6 ? '#7dd87d' : '#ffb454');
        ctx.fillRect(W2 - 26, y + 5, 4, 4);
        if (rnd() < 0.6) { ctx.fillStyle = '#7dd87d'; ctx.fillRect(W2 - 18, y + 5, 4, 4); }
      }
      y += uh;
    }
  }, 0.7);
  box(g, 'metal_dark', W, H, D, 0, H / 2, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, H - 0.1), front);
  face.position.set(0, H / 2, D / 2 + 0.004);
  g.add(face);
  box(g, 'plastic_dark', W, 0.06, D, 0, 0.03, 0.001);
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// MNT-036 CRAC unit (computer-room air conditioner)
registerProp('crac_unit', () => {
  const g = P('MNT-036');
  const W = 1.4, H = 1.95, D = 0.8;
  box(g, 'plastic_light', W, H, D, 0, H / 2, 0);
  box(g, 'metal_dark', W - 0.2, 0.5, 0.02, 0, 0.45, D / 2 + 0.005); // lower grille
  box(g, 'plastic_dark', 0.4, 0.24, 0.02, -0.35, 1.55, D / 2 + 0.005); // display
  box(g, 'ice', 0.3, 0.05, 0.01, -0.35, 1.6, D / 2 + 0.016);
  col(g, -W / 2, 0, -D / 2, W / 2, H, D / 2, 'metal');
  return g;
});

// MNT-037 overhead cable tray (param len; ceiling-mounted, no collider)
registerProp('cable_tray', (opts) => {
  const g = P('MNT-037');
  const L = opts.len || 4;
  box(g, 'metal_painted', L, 0.04, 0.3, 0, 0, 0);
  box(g, 'metal_painted', L, 0.09, 0.03, 0, 0.045, -0.15);
  box(g, 'metal_painted', L, 0.09, 0.03, 0, 0.045, 0.15);
  // cable bundles
  box(g, 'rubber', L - 0.1, 0.05, 0.1, 0, 0.045, -0.06);
  box(g, 'fabric_blue', L - 0.3, 0.04, 0.07, 0.05, 0.04, 0.05);
  const k = Math.max(1, Math.round(L / 1.5));
  for (let i = 0; i <= k; i++) box(g, 'metal_dark', 0.03, 0.35, 0.03, -L / 2 + (L / k) * i, 0.2, 0);
  return g;
});

// MNT-038 UPS unit (floor cabinet)
registerProp('ups_unit', () => {
  const g = P('MNT-038');
  box(g, 'metal_dark', 0.5, 1.1, 0.7, 0, 0.55, 0);
  box(g, 'plastic_dark', 0.4, 0.16, 0.02, 0, 0.9, 0.355);
  box(g, 'ice', 0.1, 0.03, 0.01, -0.1, 0.92, 0.366);
  for (let i = 0; i < 4; i++) box(g, 'metal_painted', 0.4, 0.02, 0.02, 0, 0.18 + i * 0.16, 0.355);
  col(g, -0.25, 0, -0.35, 0.25, 1.1, 0.35, 'metal', { blocksSight: false });
  return g;
});

// MNT-039 KVM crash cart
registerProp('kvm_cart', () => {
  const g = P('MNT-039');
  box(g, 'metal_painted', 0.6, 0.04, 0.5, 0, 0.85, 0);
  box(g, 'metal_painted', 0.6, 0.04, 0.5, 0, 0.35, 0);
  for (const [sx, sz] of [[-0.27, -0.22], [0.27, -0.22], [-0.27, 0.22], [0.27, 0.22]]) {
    box(g, 'metal_dark', 0.03, 0.85, 0.03, sx, 0.45, sz);
    cyl(g, 'rubber', 0.04, 0.04, 0.03, sx, 0.04, sz, 8, Math.PI / 2);
  }
  // monitor + keyboard
  box(g, 'plastic_dark', 0.45, 0.3, 0.04, 0, 1.08, -0.1);
  box(g, 'metal_dark', 0.42, 0.27, 0.005, 0, 1.08, -0.077);
  box(g, 'plastic_dark', 0.1, 0.18, 0.06, 0, 0.92, -0.14);
  box(g, 'plastic_light', 0.4, 0.02, 0.15, 0, 0.885, 0.08, -0.04);
  col(g, -0.3, 0, -0.25, 0.3, 1.2, 0.25, 'metal', { blocksSight: false });
  return g;
});

// ===========================================================================
// -- office-facility odds & ends -------------------------------------------

// MNT-040 small potted plant (utility variant — sibling owns the big planters)
registerProp('plant_util', (opts, rng) => {
  const g = P('MNT-040');
  cyl(g, 'plastic_dark', 0.14, 0.11, 0.3, 0, 0.15, 0, 10);
  cyl(g, 'concrete_dark', 0.12, 0.12, 0.03, 0, 0.3, 0, 10);
  const leaf = cmat('plant_leaf', { color: 0x3f5a3a, roughness: 0.9 });
  const n = 6 + (rng ? Math.floor(rng.random() * 3) : 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rng ? rng.random() * 0.5 : 0);
    const l = box(g, leaf, 0.05, 0.55 + (rng ? rng.random() * 0.25 : 0), 0.012, Math.cos(a) * 0.07, 0.55, Math.sin(a) * 0.07);
    l.rotation.z = Math.cos(a) * 0.35;
    l.rotation.x = -Math.sin(a) * 0.35;
    l.rotation.y = -a;
  }
  col(g, -0.14, 0, -0.14, 0.14, 0.5, 0.14, 'plastic', { blocksSight: false });
  return g;
});

// MNT-041 key cabinet (wall)
registerProp('key_cabinet', () => {
  const g = P('MNT-041');
  box(g, 'metal_painted', 0.4, 0.5, 0.08, 0, 0, 0.04);
  box(g, 'metal_dark', 0.34, 0.44, 0.015, 0, 0, 0.085);
  box(g, 'metal_brushed', 0.03, 0.05, 0.02, 0.13, 0, 0.09);
  box(g, YELLOW(), 0.12, 0.05, 0.005, 0, 0.2, 0.093);
  return g;
});

// MNT-042 clipboard row (wall)
registerProp('clipboard_row', (opts, rng) => {
  const g = P('MNT-042');
  const n = opts.n || 4;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.32;
    const tilt = rng ? rng.range(-0.05, 0.05) : 0;
    const b = box(g, 'wood_dark', 0.24, 0.33, 0.012, x, 0, 0.01, tilt);
    b.rotation.z = tilt;
    box(g, 'paper', 0.2, 0.27, 0.005, x, -0.01, 0.02, tilt);
    box(g, 'metal_brushed', 0.06, 0.03, 0.02, x, 0.15, 0.02, tilt);
  }
  return g;
});

// MNT-043 boot tray + coat hooks (entry kit)
registerProp('boot_tray', (opts, rng) => {
  const g = P('MNT-043');
  box(g, 'rubber', 0.8, 0.03, 0.4, 0, 0.015, 0);
  // pairs of boots
  const n = opts.n ?? 2;
  for (let i = 0; i < n; i++) {
    const x = -0.25 + i * 0.36 + (rng ? rng.range(-0.03, 0.03) : 0);
    for (const s of [-1, 1]) {
      box(g, 'rubber', 0.09, 0.1, 0.24, x + s * 0.06, 0.08, 0.02, rng ? rng.range(-0.15, 0.15) : 0);
      box(g, 'fabric_gray', 0.08, 0.12, 0.09, x + s * 0.06, 0.17, -0.05);
    }
  }
  return g;
});

registerProp('coat_hooks', (opts) => {
  const g = P('MNT-044');
  const n = opts.n || 4, W = n * 0.18;
  box(g, 'wood', W, 0.08, 0.02, 0, 0, 0.01);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.09 + i * 0.18;
    box(g, 'metal_brushed', 0.02, 0.07, 0.05, x, -0.02, 0.035);
    if (i === 1) { // one hi-vis vest left behind
      box(g, YELLOW(), 0.3, 0.42, 0.04, x, -0.28, 0.05);
      box(g, 'metal_brushed', 0.26, 0.05, 0.045, x, -0.2, 0.052);
    }
  }
  return g;
});

// MNT-045 lectern (training room)
registerProp('lectern', () => {
  const g = P('MNT-045');
  box(g, 'wood_dark', 0.55, 1.1, 0.45, 0, 0.55, 0);
  const top = box(g, 'wood', 0.6, 0.04, 0.5, 0, 1.13, -0.02);
  top.rotation.x = -0.2;
  box(g, 'paper', 0.3, 0.005, 0.21, 0, 1.16, -0.04).rotation.x = -0.2;
  col(g, -0.3, 0, -0.25, 0.3, 1.2, 0.25, 'wood');
  return g;
});

// MNT-046 training table (rect, two-seat)
registerProp('training_table', () => {
  const g = P('MNT-046');
  box(g, 'laminate', 1.8, 0.04, 0.6, 0, 0.73, 0);
  box(g, 'metal_painted', 0.05, 0.71, 0.5, -0.82, 0.355, 0);
  box(g, 'metal_painted', 0.05, 0.71, 0.5, 0.82, 0.355, 0);
  box(g, 'metal_painted', 1.6, 0.06, 0.04, 0, 0.62, -0.24);
  col(g, -0.9, 0, -0.3, 0.9, 0.75, 0.3, 'wood', { blocksSight: false });
  return g;
});

// MNT-047 work counter (copy room; deep laminate counter on cabinets)
registerProp('work_counter', (opts) => {
  const g = P('MNT-047');
  const L = opts.len || 2.4, D = 0.65, H = 0.92;
  box(g, 'plastic_dark', L - 0.08, 0.09, D - 0.1, 0, 0.045, -0.04);
  box(g, 'laminate', L, H - 0.13, D - 0.05, 0, 0.09 + (H - 0.13) / 2, -0.02);
  box(g, 'laminate', L + 0.03, 0.045, D, 0, H - 0.022, 0);
  const doors = Math.max(2, Math.round(L / 0.5));
  const dw = (L - 0.05) / doors;
  for (let i = 0; i < doors; i++) {
    box(g, 'plastic_light', dw - 0.02, H - 0.24, 0.015, -L / 2 + 0.025 + dw * (i + 0.5), 0.13 + (H - 0.24) / 2, D / 2 - 0.035);
  }
  col(g, -L / 2, 0, -D / 2, L / 2, H, D / 2, 'wood');
  return g;
});

// MNT-048 mail sorter (pigeonhole wall shelf)
registerProp('mail_sorter', (opts, rng) => {
  const g = P('MNT-048');
  const W = opts.w || 1.6, H = 1.0, D = 0.32;
  box(g, 'laminate', W, H, D, 0, 0, -0.0);
  const cols = Math.round(W / 0.2), rows = 4;
  for (let c = 1; c < cols; c++) box(g, 'wood', 0.012, H - 0.06, D - 0.03, -W / 2 + (W / cols) * c, 0, 0.02);
  for (let r = 1; r < rows; r++) box(g, 'wood', W - 0.05, 0.012, D - 0.03, 0, -H / 2 + (H / rows) * r, 0.02);
  // stuffed envelopes
  for (let i = 0; i < 10; i++) {
    if (rng && rng.random() < 0.4) continue;
    const c = i % cols, r = (i * 7 + 3) % rows;
    box(g, 'paper', W / cols - 0.05, 0.14, 0.02,
      -W / 2 + (W / cols) * (c + 0.5), -H / 2 + (H / rows) * (r + 0.4), D / 2 - 0.06, rng ? rng.range(-0.08, 0.08) : 0);
  }
  return g;
});

// MNT-049 cutting/sorting table (copy room center)
registerProp('cutting_table', () => {
  const g = P('MNT-049');
  box(g, 'plastic_light', 1.5, 0.05, 0.8, 0, 0.9, 0);
  box(g, 'metal_painted', 0.05, 0.88, 0.7, -0.68, 0.44, 0);
  box(g, 'metal_painted', 0.05, 0.88, 0.7, 0.68, 0.44, 0);
  box(g, 'metal_painted', 1.3, 0.04, 0.05, 0, 0.3, 0);
  // paper stacks + guillotine
  box(g, 'paper', 0.32, 0.06, 0.45, -0.4, 0.955, 0.1);
  box(g, 'paper', 0.3, 0.03, 0.42, 0.1, 0.94, -0.15, 0.15);
  box(g, 'wood_dark', 0.4, 0.03, 0.4, 0.45, 0.94, 0.12);
  box(g, 'metal_brushed', 0.04, 0.05, 0.42, 0.63, 0.96, 0.12);
  col(g, -0.75, 0, -0.4, 0.75, 0.95, 0.4, 'wood', { blocksSight: false });
  return g;
});

// MNT-050 paper box stack (copy stock)
registerProp('paper_box_stack', (opts, rng) => {
  const g = P('MNT-050');
  const n = opts.n || 3;
  for (let i = 0; i < n; i++) {
    box(g, 'cardboard', 0.44, 0.25, 0.3, (rng ? rng.range(-0.02, 0.02) : 0), 0.125 + i * 0.25, (rng ? rng.range(-0.02, 0.02) : 0), rng ? rng.range(-0.1, 0.1) : i * 0.06);
    box(g, 'paper', 0.2, 0.08, 0.004, 0.01, 0.11 + i * 0.25, 0.155);
  }
  col(g, -0.24, 0, -0.17, 0.24, n * 0.25, 0.17, 'cardboard', { blocksSight: false });
  return g;
});

// MNT-051 hall bench
registerProp('hall_bench', () => {
  const g = P('MNT-051');
  box(g, 'wood', 1.5, 0.05, 0.42, 0, 0.44, 0);
  box(g, 'metal_dark', 0.05, 0.42, 0.38, -0.65, 0.21, 0);
  box(g, 'metal_dark', 0.05, 0.42, 0.38, 0.65, 0.21, 0);
  col(g, -0.75, 0, -0.21, 0.75, 0.47, 0.21, 'wood', { blocksSight: false });
  return g;
});

// MNT-052 wall water fountain
registerProp('water_fountain', () => {
  const g = P('MNT-052');
  box(g, 'metal_brushed', 0.4, 0.18, 0.35, 0, 0.85, 0.175);
  box(g, 'metal_painted', 0.36, 0.5, 0.3, 0, 0.55, 0.15);
  box(g, 'metal_dark', 0.3, 0.02, 0.25, 0, 0.945, 0.17);
  cyl(g, 'metal_brushed', 0.015, 0.015, 0.06, -0.08, 0.96, 0.12, 6, 0.5);
  col(g, -0.2, 0.2, 0, 0.2, 0.95, 0.36, 'metal', { blocksSight: false });
  return g;
});

// MNT-053 air compressor (garage)
registerProp('compressor', () => {
  const g = P('MNT-053');
  cyl(g, RED(), 0.22, 0.22, 0.75, 0, 0.35, 0, 12, 0, Math.PI / 2);
  box(g, 'metal_dark', 0.3, 0.25, 0.25, 0, 0.72, 0);
  cyl(g, 'metal_dark', 0.05, 0.05, 0.05, 0.18, 0.68, 0.1, 8, Math.PI / 2);
  for (const s of [-1, 1]) cyl(g, 'rubber', 0.07, 0.07, 0.04, s * 0.3, 0.08, 0.15, 10, 0, Math.PI / 2);
  box(g, 'metal_painted', 0.06, 0.5, 0.03, -0.34, 0.45, -0.05, 0.5);
  col(g, -0.4, 0, -0.25, 0.4, 0.85, 0.25, 'metal', { blocksSight: false });
  return g;
});

// MNT-054 tool cabinet (rolling chest, garage)
registerProp('tool_cabinet', () => {
  const g = P('MNT-054');
  box(g, RED(), 0.75, 0.95, 0.5, 0, 0.55, 0);
  for (let i = 0; i < 4; i++) {
    box(g, 'metal_dark', 0.65, 0.02, 0.02, 0, 0.28 + i * 0.19, 0.255);
  }
  box(g, 'metal_brushed', 0.77, 0.03, 0.52, 0, 1.04, 0);
  for (const [sx, sz] of [[-0.32, -0.2], [0.32, -0.2], [-0.32, 0.2], [0.32, 0.2]]) {
    cyl(g, 'rubber', 0.05, 0.05, 0.04, sx, 0.05, sz, 8, Math.PI / 2);
  }
  col(g, -0.38, 0, -0.25, 0.38, 1.05, 0.25, 'metal');
  return g;
});

export const MAINTENANCE_PROP_IDS = [
  'electrical_panel', 'breaker_box', 'transformer_cabinet', 'pipe_run', 'pipe_vertical',
  'hvac_unit', 'fire_extinguisher', 'fire_cabinet', 'smoke_detector', 'janitor_cart',
  'mop_bucket', 'broom', 'bottle_set', 'wet_floor_sign', 'utility_shelf',
  'box_cardboard', 'crate_wood', 'pallet', 'hand_truck', 'ladder_aframe',
  'tool_case', 'workbench', 'water_heater', 'pump_manifold', 'locker_bank',
  'traffic_cone', 'parking_bumper', 'tire_stack', 'dock_bumper', 'dock_leveler',
  'shutter_control', 'oil_drum', 'rolling_rack', 'records_box', 'server_rack',
  'crac_unit', 'cable_tray', 'ups_unit', 'kvm_cart', 'plant_util',
  'key_cabinet', 'clipboard_row', 'boot_tray', 'coat_hooks', 'lectern',
  'training_table', 'work_counter', 'mail_sorter', 'cutting_table', 'paper_box_stack',
  'hall_bench', 'water_fountain', 'compressor', 'tool_cabinet',
];
