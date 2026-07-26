// Pickup prop models — owner: Fable 4c (character/weapon polish pass).
// Contract (unchanged): buildPickupModel(type) -> THREE.Group, floor pivot
// (base at y=0 — game.js rests the group on desks/floors), ≤0.4 m tall.
// Types: 'medkit' | 'ammo' | 'armor' | 'keycard'
//
// All geometry/materials/textures are built once in module caches and shared
// across instances (ammo drops can spawn many cans per mission). No random
// values — every pickup of a type is identical, the game adds the idle pulse.

import * as THREE from 'three';

// ---------------------------------------------------------------- caches
const geoCache = new Map();
function G(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 10) => G(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));

const matCache = new Map();
function mat(color, rough = 0.8, metal = 0, opts = {}) {
  const key = `${color}|${rough}|${metal}|${opts.emissive || 0}|${opts.emissiveIntensity || 0}`;
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (opts.emissive) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    matCache.set(key, m);
  }
  return matCache.get(key);
}

// Stenciled ammo-can label (canvas patch, built once).
let AMMO_LABEL_MAT = null;
function ammoLabelMat() {
  if (AMMO_LABEL_MAT) return AMMO_LABEL_MAT;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9bd9b';                       // worn canvas tan
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(90,84,62,0.25)';           // grime edge
  ctx.fillRect(0, 0, 256, 8); ctx.fillRect(0, 120, 256, 8);
  ctx.fillStyle = '#2e2a20';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('5.56 / 9MM', 128, 46);
  ctx.font = 'bold 26px monospace';
  ctx.fillText('MIXED', 128, 78);
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#5a3c28';
  ctx.fillText('— VEKTRA —', 128, 108);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  AMMO_LABEL_MAT = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
  return AMMO_LABEL_MAT;
}

function P(parent, geometry, material, x, y, z, o = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rz) mesh.rotation.z = o.rz;
  // pickups are 10-30 cm floor props — sub-texel in the sun shadow map, and
  // all indoors anyway; casting cost 105 shadow-pass draw calls map-wide
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------- builders

// White first-aid hard case: lid seam, red cross (top + front), carry handle,
// two latches, rubber feet. Case 0.34 × 0.24 footprint, 0.20 high.
function buildMedkit(g) {
  const shell = mat(0xe6e9eb, 0.55);
  const shellTop = mat(0xdadee1, 0.55);
  const red = mat(0xc23b30, 0.6);
  const dark = mat(0x2b2e30, 0.7);
  const latch = mat(0x9aa2a8, 0.35, 0.8);
  P(g, box(0.34, 0.115, 0.24), shell, 0, 0.0675, 0);                 // body (on feet)
  P(g, box(0.34, 0.07, 0.24), shellTop, 0, 0.166, 0);                // lid
  P(g, box(0.345, 0.012, 0.245), dark, 0, 0.125, 0);                 // seam gasket
  // red cross on the lid + front face
  P(g, box(0.13, 0.004, 0.042), red, 0, 0.2035, 0);
  P(g, box(0.042, 0.004, 0.13), red, 0, 0.2035, 0);
  P(g, box(0.09, 0.03, 0.004), red, 0, 0.075, 0.1205);
  P(g, box(0.03, 0.09, 0.004), red, 0, 0.075, 0.1205);
  // handle (folded flat toward the front) + hinges
  P(g, box(0.12, 0.016, 0.02), dark, 0, 0.209, -0.075);
  P(g, box(0.016, 0.016, 0.028), dark, -0.052, 0.205, -0.098);
  P(g, box(0.016, 0.016, 0.028), dark, 0.052, 0.205, -0.098);
  // latches on the front edge
  P(g, box(0.032, 0.05, 0.012), latch, -0.1, 0.125, 0.122);
  P(g, box(0.032, 0.05, 0.012), latch, 0.1, 0.125, 0.122);
  // rubber feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P(g, box(0.04, 0.02, 0.04), dark, sx * 0.135, 0.01, sz * 0.085);
  }
}

// Olive steel ammo can: lid with hinge spine, fold-down handle, side latch,
// stenciled canvas label. 0.30 × 0.16 footprint, 0.20 high.
function buildAmmo(g) {
  const olive = mat(0x4d5442, 0.55, 0.35);
  const oliveDark = mat(0x3e4436, 0.6, 0.3);
  const steel = mat(0x6e7469, 0.4, 0.7);
  P(g, box(0.3, 0.15, 0.16), olive, 0, 0.075, 0);                    // body
  P(g, box(0.31, 0.05, 0.17), oliveDark, 0, 0.175, 0);               // lid
  P(g, box(0.31, 0.022, 0.03), oliveDark, 0, 0.16, -0.088);          // hinge spine
  P(g, cyl(0.008, 0.008, 0.29, 8), steel, 0, 0.168, -0.098, { rz: Math.PI / 2 }); // hinge pin
  // fold-down carry handle lying on the lid
  P(g, box(0.11, 0.012, 0.02), steel, 0, 0.207, 0.01);
  P(g, box(0.012, 0.012, 0.05), steel, -0.05, 0.207, -0.015);
  P(g, box(0.012, 0.012, 0.05), steel, 0.05, 0.207, -0.015);
  // front latch
  P(g, box(0.05, 0.07, 0.014), steel, 0, 0.15, 0.086);
  P(g, box(0.06, 0.02, 0.02), oliveDark, 0, 0.19, 0.084);
  // stenciled canvas label on the front face + smaller copy on the lid
  // (players mostly see pickups top-down)
  P(g, box(0.2, 0.1, 0.006), ammoLabelMat(), 0, 0.08, 0.082);
  P(g, box(0.13, 0.006, 0.07), ammoLabelMat(), 0.078, 0.2, 0.035);
  // stamped rib lines on the ends
  P(g, box(0.006, 0.12, 0.13), oliveDark, -0.152, 0.08, 0);
  P(g, box(0.006, 0.12, 0.13), oliveDark, 0.152, 0.08, 0);
}

// Plate-carrier bundle: folded vest (soft slabs + plate showing on top),
// MOLLE rows, two cinch straps with buckles, shoulder straps folded flat.
// Reads from the top-down gameplay angle. 0.36 × 0.30 footprint, 0.19 h.
function buildArmor(g) {
  const cordura = mat(0x3d4550, 0.95);
  const corduraDark = mat(0x2d343b, 0.95);
  const strap = mat(0x585f66, 0.85);          // lighter: straps read against the vest
  const buckle = mat(0x15171a, 0.45, 0.35);
  const plate = mat(0x525a63, 0.65);
  P(g, box(0.36, 0.075, 0.3), cordura, 0, 0.0375, 0);                // back panel (laid flat)
  P(g, box(0.3, 0.07, 0.24), corduraDark, 0, 0.11, -0.01);           // front panel folded on top
  P(g, box(0.19, 0.03, 0.15), plate, 0, 0.162, -0.02);               // ballistic plate showing
  P(g, box(0.15, 0.012, 0.11), corduraDark, 0, 0.178, -0.02);        // plate pocket flap
  // MOLLE webbing rows on the exposed front faces
  for (const y of [0.055, 0.09]) P(g, box(0.302, 0.014, 0.242), strap, 0, y, -0.01);
  P(g, box(0.34, 0.05, 0.07), corduraDark, 0, 0.095, 0.12, { rx: -0.2 }); // cummerbund roll
  // shoulder straps folded flat across the top
  P(g, box(0.075, 0.035, 0.27), cordura, -0.14, 0.09, 0, { rz: 0.05 });
  P(g, box(0.075, 0.035, 0.27), cordura, 0.14, 0.09, 0, { rz: -0.05 });
  P(g, box(0.05, 0.018, 0.2), strap, -0.14, 0.112, 0.01);
  P(g, box(0.05, 0.018, 0.2), strap, 0.14, 0.112, 0.01);
  // two cinch straps over the bundle with buckles on top
  for (const sx of [-0.065, 0.065]) {
    P(g, box(0.034, 0.19, 0.308), strap, sx, 0.0955, 0);             // wrap (reads on all faces)
    P(g, box(0.034, 0.155, 0.31), strap, sx, 0.078, 0);              // second pass fills the gap
    P(g, box(0.048, 0.024, 0.055), buckle, sx, 0.19, 0.03);          // top buckle
  }
  // admin patch on the plate flap
  P(g, box(0.07, 0.006, 0.032), mat(0x76b7c4, 0.85), 0, 0.184, -0.02);
}

// Site keycard: card + short coiled lanyard + clip tag; a faint emissive edge
// keeps it readable on a desk. Card 0.09 × 0.055.
function buildKeycard(g) {
  const cardM = mat(0xe8e6dd, 0.5);
  const stripeM = mat(0x2f6f9f, 0.5);
  const glowM = mat(0x2aa0b8, 0.5, 0, { emissive: 0x2aa0b8, emissiveIntensity: 0.9 });
  const strapM = mat(0x21518a, 0.85);
  const clipM = mat(0x9aa2a8, 0.35, 0.8);
  // card (lying flat, slight cant)
  const card = new THREE.Group();
  card.position.set(0.01, 0.012, 0);
  card.rotation.y = 0.35;
  g.add(card);
  P(card, box(0.092, 0.008, 0.057), glowM, 0, 0, 0);                 // emissive edge core
  P(card, box(0.088, 0.01, 0.053), cardM, 0, 0.0012, 0);             // card face over the glow
  P(card, box(0.088, 0.0035, 0.014), stripeM, 0, 0.0062, -0.016);    // printed stripe
  P(card, box(0.02, 0.0035, 0.014), mat(0xc7a54a, 0.35, 0.6), -0.028, 0.0062, 0.012); // chip
  P(card, cyl(0.005, 0.005, 0.009, 8), clipM, 0.038, 0.001, -0.02);  // punched grommet
  // short lanyard: flat strap laid in a loose S-curve behind the card
  const seg = (x, z, ry, len) => P(g, box(len, 0.006, 0.016), strapM, x, 0.004, z, { ry });
  seg(-0.045, -0.035, 0.5, 0.07);
  seg(-0.085, -0.01, 1.25, 0.075);
  seg(-0.1, 0.038, 2.0, 0.07);
  seg(-0.055, 0.06, 2.85, 0.06);
  P(g, box(0.02, 0.01, 0.024), clipM, -0.005, 0.006, 0.055);         // metal clip to the card
  // holder tag on the lanyard end
  P(g, box(0.034, 0.008, 0.05), mat(0x33363b, 0.8), -0.115, 0.005, 0.065, { ry: 0.4 });
}

const BUILDERS = { medkit: buildMedkit, ammo: buildAmmo, armor: buildArmor, keycard: buildKeycard };

export function buildPickupModel(type) {
  const g = new THREE.Group();
  g.name = `pickup_${type}`;
  (BUILDERS[type] || buildAmmo)(g);
  return g;
}
