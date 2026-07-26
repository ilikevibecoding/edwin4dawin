// ============================================================================
// NORTHSTAR RESCUE — prop library: office furniture & electronics (Fable 3)
// ----------------------------------------------------------------------------
// Contract: every builder returns a THREE.Group with its origin at the FLOOR
// CENTER of the footprint (y = 0 at floor) facing -Z where orientation
// matters. Solid props set group.userData.collision = [{min,max}] LOCAL-space
// AABBs; placement code converts them to world space. Geometries, materials
// and canvas textures are created lazily (first build call) and cached, so
// importing this module never touches the DOM (node import-check safe).
//
// This file also hosts the shared prop-craft helper kit used by
// props_facility.js and props_clutter.js (material wrapper with graybox
// fallbacks, canvas-texture factory, brand art, mesh/geometry caches).
// All text/branding is original: "Northstar Logistics Group" (NLG).
// ============================================================================
import * as THREE from 'three';
import { registerAsset } from './registry.js';
import { getMaterial } from './materials.js';
import { makeCanvasTexture } from './textures.js';
import { boxGeo, bevelBoxGeo } from './geo.js';

// ============================================================ shared helpers

// Deterministic tiny RNG (mulberry32) so procedural detail is stable.
export function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- materials
// mat() defers to the shared library (materials.js) for every standard key.
// A few prop-only tints (safety paints, soil, mirror, van body) are not part
// of the shared set, so they are built locally; if materials.js gains one of
// these keys later, delete its LOCAL_MAT entry to inherit the shared version.
const LOCAL_MAT = {
  paint_red:    { color: 0xb02a22, roughness: 0.42, metalness: 0.35 },
  paint_yellow: { color: 0xd9a323, roughness: 0.5 },
  paint_orange: { color: 0xd96b1f, roughness: 0.55 },
  paint_navy:   { color: 0x1a3a5c, roughness: 0.5 },
  soil:         { color: 0x2e241c, roughness: 1.0 },
  mirror:       { color: 0xcfd8dd, roughness: 0.04, metalness: 1.0 },
  van_white:    { color: 0xe6e9ea, roughness: 0.32, metalness: 0.18 },
};

const _matCache = new Map();

export function mat(key) {
  if (_matCache.has(key)) return _matCache.get(key);
  const fb = LOCAL_MAT[key];
  const m = fb
    ? new THREE.MeshStandardMaterial({
        color: fb.color,
        roughness: fb.roughness ?? 0.7,
        metalness: fb.metalness ?? 0.02,
      })
    : getMaterial(key);
  _matCache.set(key, m);
  return m;
}

// ------------------------------------------------------------ canvas texture
const _texCache = new Map();

// Cached wrapper over the shared makeCanvasTexture (textures.js). Non-repeat
// art (labels, screens, posters) clamps so plane edges never bleed.
export function canvasTex(id, w, h, draw, opts = {}) {
  if (_texCache.has(id)) return _texCache.get(id);
  const t = makeCanvasTexture(w, h, draw, {
    anisotropy: 4,
    repeat: Array.isArray(opts.repeat) ? opts.repeat : undefined,
  });
  if (!opts.repeat) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  _texCache.set(id, t);
  return t;
}

// Material carrying a canvas texture (optionally emissive = lit screen/sign).
export function texMat(id, w, h, draw, opts = {}) {
  const key = 'tm_' + id;
  if (_matCache.has(key)) return _matCache.get(key);
  const t = canvasTex(id, w, h, draw, opts);
  const m = new THREE.MeshStandardMaterial({
    map: t,
    roughness: opts.roughness ?? 0.6,
    metalness: opts.metalness ?? 0.0,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(0xffffff);
    m.emissiveMap = t;
    m.emissiveIntensity = opts.emissiveIntensity ?? 1.0;
  }
  _matCache.set(key, m);
  return m;
}

// Single-line label plate texture.
export function textTex(id, text, o = {}) {
  const w = o.w ?? 256, h = o.h ?? 64;
  return canvasTex('txt_' + id, w, h, (g) => {
    g.fillStyle = o.bg ?? '#14365c';
    g.fillRect(0, 0, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); }
    g.fillStyle = o.fg ?? '#e8f0f8';
    g.font = o.font ?? `bold ${Math.floor(h * 0.42)}px Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

// NLG brand mark: 8-point star in a circle (navy + ice cyan).
export function drawStar(g, cx, cy, rad, opts = {}) {
  const navy = opts.navy ?? '#14365c', cyan = opts.cyan ?? '#8fd8ff';
  g.save();
  g.strokeStyle = opts.ring ?? cyan; g.lineWidth = Math.max(1.5, rad * 0.1);
  g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke();
  g.fillStyle = opts.star ?? cyan;
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rad * 0.78 : rad * 0.3;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.closePath(); g.fill();
  if (opts.dot !== false) { g.fillStyle = navy; g.beginPath(); g.arc(cx, cy, rad * 0.12, 0, 7); g.fill(); }
  g.restore();
}

// -------------------------------------------------------- geometry + meshes
const _geoCache = new Map();

export function G(key, make) {
  if (!_geoCache.has(key)) _geoCache.set(key, make());
  return _geoCache.get(key);
}
export function gBox(w, h, d, bevel = 0) {
  const k = `b|${w}|${h}|${d}|${bevel}`;
  return G(k, () => {
    if (bevel <= 0) return boxGeo(w, h, d);
    // bevelBoxGeo outsets its x/y cross-section by ~0.99*bevel per side
    // (ExtrudeGeometry bevelSize); pre-shrink so the solid matches nominal
    // and decals placed a few mm proud of the nominal faces stay visible.
    const b = Math.min(bevel, w / 4, h / 4);
    return bevelBoxGeo(w - 1.98 * b, h - 1.98 * b, d, b);
  });
}
export function gCyl(rt, rb, h, seg = 14, open = false) {
  const k = `c|${rt}|${rb}|${h}|${seg}|${open}`;
  return G(k, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
}
export function gSphere(r, w = 10, h = 8) {
  return G(`s|${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
}
export function gTorus(r, tube, radial = 8, tubular = 16, arc = Math.PI * 2) {
  return G(`t|${r}|${tube}|${radial}|${tubular}|${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, tube, radial, tubular, arc));
}
export function gPlane(w, h) {
  return G(`p|${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
}
export function gLathe(key, pts, seg = 16) {
  return G('l|' + key, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg));
}

// Mesh helper: position + shadows in one call.
export function M(geo, material, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  if (o.sx || o.sy || o.sz) m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  return m;
}

// Flat decal/label plane facing -Z (front convention) unless o.face given.
export function label(w, h, material, x, y, z, o = {}) {
  const m = new THREE.Mesh(gPlane(w, h), material);
  m.position.set(x, y, z);
  const face = o.face ?? '-z';
  if (face === '-z') m.rotation.y = Math.PI;
  else if (face === '+x') m.rotation.y = Math.PI / 2;
  else if (face === '-x') m.rotation.y = -Math.PI / 2;
  else if (face === '+y') { m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; } // texture-up = +Z (reads right from -Z)
  if (o.rx) m.rotation.x += o.rx;
  if (o.ry) m.rotation.y += o.ry;
  if (o.rz) m.rotation.z += o.rz;
  m.castShadow = false;
  m.receiveShadow = o.receive ?? true;
  return m;
}

// LOCAL-space collision AABB: col(cx, cz, w, d, h, y0)
export function col(cx, cz, w, d, h, y0 = 0) {
  return {
    min: { x: cx - w / 2, y: y0, z: cz - d / 2 },
    max: { x: cx + w / 2, y: y0 + h, z: cz + d / 2 },
  };
}
export function setCol(group, ...boxes) { group.userData.collision = boxes; }

// ------------------------------------------------------------- registration
export function makeDef(PROPS, fileUrl) {
  return function def(id, name, meta, build) {
    const wrapped = (opts = {}) => {
      const g = build(opts);
      g.name = id;
      return g;
    };
    PROPS[id] = { build: wrapped, ...meta };
    registerAsset({
      id, name,
      category: 'prop',
      agent: 'fable3',
      files: fileUrl,
      status: 'built',
      ...meta,
      build: () => wrapped(meta.gallery || {}),
    });
  };
}

// ============================================================== office props
export const PROPS = {};
const def = makeDef(PROPS, import.meta.url);

// ------------------------------------------------------------------- desks
def('desk_standard', 'Standard office desk', {
  footprint: [1.6, 0.8], height: 0.74, rooms: 'open plan, IT, security',
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = opts.w ?? 1.6, d = 0.8, h = 0.74;
  g.add(M(gBox(w, 0.034, d, 0.008), mat('wood_desk'), 0, h - 0.017, 0));
  // slab side panels
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.03, h - 0.05, d - 0.1, 0.006), mat('laminate_gray'), s * (w / 2 - 0.05), (h - 0.05) / 2, 0));
  }
  // modesty panel on the back (+Z) side
  g.add(M(gBox(w - 0.16, 0.42, 0.022), mat('laminate_gray'), 0, 0.74 - 0.03 - 0.21, d / 2 - 0.09));
  // cable grommet
  g.add(M(gCyl(0.03, 0.03, 0.006, 12), mat('plastic_black'), w * 0.3, h + 0.002, d * 0.28));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('desk_reception', 'Reception counter (curved)', {
  footprint: [2.7, 1.0], height: 1.13, rooms: 'reception lobby', gallery: {},
}, () => {
  const g = new THREE.Group();
  const a0 = -Math.PI / 3, a1 = Math.PI / 3, zc = 1.02;
  // curved slab: annulus sector extruded to a height, laid flat (Y up).
  // The sector is drawn in the -Y half of shape space so that after
  // rotateX(+90) it bulges toward -Z (the visitor side) around (0, zc).
  const annulus = (rOut, rIn, hgt, matKey, texM) => {
    const s2 = new THREE.Shape();
    s2.absarc(0, 0, rOut, -Math.PI / 2 + a0, -Math.PI / 2 + a1, false);
    s2.absarc(0, 0, rIn, -Math.PI / 2 + a1, -Math.PI / 2 + a0, true);
    const geo = new THREE.ExtrudeGeometry(s2, { depth: hgt, bevelEnabled: false, curveSegments: 24 });
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, texM || mat(matKey));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  // curved fascia (visitor side, opens toward -Z); the z-flip already turns
  // the downward extrusion upright, so the group-local y stays 0
  const fascia = annulus(1.5, 1.41, 1.1, 'laminate_white');
  fascia.position.set(0, 0, zc); fascia.rotation.z = Math.PI; g.add(fascia);
  // navy accent band
  const band = annulus(1.505, 1.408, 0.26, null, mat('paint_navy'));
  band.position.set(0, 0.78, zc); band.rotation.z = Math.PI; g.add(band);
  // transaction ledge (top tier)
  const ledge = annulus(1.6, 1.36, 0.035, 'wood_desk');
  ledge.position.set(0, 1.13, zc); ledge.rotation.z = Math.PI; g.add(ledge);
  // inner worktop (staff side)
  const work = annulus(1.41, 0.78, 0.03, 'laminate_gray');
  work.position.set(0, 0.74, zc); work.rotation.z = Math.PI; g.add(work);
  // under-top support cabinets
  g.add(M(gBox(0.9, 0.7, 0.5), mat('laminate_white'), 0, 0.36, zc - 1.08));
  g.add(M(gBox(0.5, 0.7, 0.45, 0.008), mat('laminate_white'), -0.85, 0.36, zc - 0.82, { ry: 0.5 }));
  g.add(M(gBox(0.5, 0.7, 0.45, 0.008), mat('laminate_white'), 0.85, 0.36, zc - 0.82, { ry: -0.5 }));
  // brand badge on the fascia front
  const badge = texMat('reception_badge', 256, 256, (gg, w, h) => {
    gg.clearRect(0, 0, w, h);
    gg.fillStyle = '#14365c'; gg.beginPath(); gg.arc(128, 128, 118, 0, 7); gg.fill();
    drawStar(gg, 128, 104, 62);
    gg.fillStyle = '#e8f0f8'; gg.textAlign = 'center';
    gg.font = 'bold 26px Arial, sans-serif';
    gg.fillText('NORTHSTAR', 128, 190);
    gg.font = '17px Arial, sans-serif'; gg.fillStyle = '#8fd8ff';
    gg.fillText('LOGISTICS GROUP', 128, 214);
  }, { roughness: 0.45 });
  const bm = label(0.5, 0.5, badge, 0, 0.62, zc - 1.505);
  bm.material.transparent = true;
  g.add(bm);
  // end return panels
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.09, 1.1, 0.42), mat('laminate_white'), s * 1.32, 0.55, zc - 0.63, { ry: s * -1.05 }));
  }
  setCol(g, col(0, -0.28, 2.7, 0.55, 1.13), col(-1.1, 0.03, 0.72, 0.6, 1.13), col(1.1, 0.03, 0.72, 0.6, 1.13));
  return g;
});

def('desk_exec', 'Executive desk', {
  footprint: [2.2, 1.0], height: 0.75, rooms: 'executive office',
}, () => {
  const g = new THREE.Group();
  const w = 2.2, d = 1.0, h = 0.75;
  g.add(M(gBox(w, 0.045, d, 0.012), mat('wood_dark'), 0, h - 0.022, 0));
  // leather writing inlay
  g.add(M(gBox(1.0, 0.004, 0.6, 0.002), mat('leather_black'), 0, h + 0.002, -0.05));
  // drawer pedestals
  for (const s of [-1, 1]) {
    const px = s * (w / 2 - 0.26);
    g.add(M(gBox(0.5, h - 0.06, d - 0.12, 0.01), mat('wood_dark'), px, (h - 0.06) / 2, 0));
    for (let i = 0; i < 3; i++) {
      const fy = 0.14 + i * 0.205;
      g.add(M(gBox(0.44, 0.17, 0.014, 0.004), mat('wood_dark'), px, fy, -d / 2 + 0.052));
      g.add(M(gBox(0.14, 0.018, 0.02), mat('brass'), px, fy + 0.05, -d / 2 + 0.038));
    }
  }
  // modesty panel
  g.add(M(gBox(1.15, 0.5, 0.03), mat('wood_dark'), 0, 0.42, d / 2 - 0.1));
  // plinth feet
  for (const s of [-1, 1]) g.add(M(gBox(0.46, 0.03, d - 0.2), mat('metal_dark'), s * (w / 2 - 0.26), 0.015, 0));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('cubicle_panel', 'Cubicle partition panel', {
  footprint: [1.2, 0.08], height: 1.5, rooms: 'open plan floor',
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = opts.w ?? 1.2, h = 1.5, t = 0.055;
  // fabric core
  g.add(M(gBox(w - 0.06, h - 0.16, t, 0.006), mat(opts.fabric ?? 'fabric_gray'), 0, 0.08 + (h - 0.16) / 2, 0));
  // frame: posts + top cap
  for (const s of [-1, 1]) g.add(M(gBox(0.06, h - 0.04, t + 0.014, 0.006), mat('metal_dark'), s * (w / 2 - 0.03), (h - 0.04) / 2 + 0.02, 0));
  g.add(M(gBox(w, 0.045, t + 0.02, 0.008), mat('plastic_gray'), 0, h - 0.022, 0));
  g.add(M(gBox(w, 0.09, t + 0.01), mat('plastic_gray'), 0, 0.075, 0));
  // feet
  for (const s of [-1, 1]) g.add(M(gBox(0.05, 0.03, 0.24), mat('metal_dark'), s * (w / 2 - 0.04), 0.015, 0));
  setCol(g, col(0, 0, w, 0.24, h));
  return g;
});

// ------------------------------------------------------------------- chairs
function casterWheel(x, z, r = 0.03) {
  const grp = new THREE.Group();
  const wheel = M(gCyl(r, r, 0.024, 10), mat('plastic_black'), 0, r, 0.008, { rz: Math.PI / 2 });
  const fork = M(gBox(0.02, r * 1.1, 0.036), mat('plastic_black'), 0, r * 1.35, 0);
  grp.add(wheel, fork);
  grp.position.set(x, 0, z);
  grp.rotation.y = Math.atan2(x, z) + 0.5;
  return grp;
}

def('chair_task', 'Task chair', {
  footprint: [0.62, 0.62], height: 0.98, rooms: 'desks everywhere',
}, (opts = {}) => {
  const g = new THREE.Group();
  const fab = mat(opts.color === 'blue' ? 'fabric_blue' : opts.color === 'black' ? 'leather_black' : 'fabric_gray');
  // 5-star base with casters
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const arm = M(gBox(0.055, 0.032, 0.27, 0.008), mat('plastic_black'), Math.sin(a) * 0.155, 0.062, Math.cos(a) * 0.155, { ry: a });
    g.add(arm);
    g.add(casterWheel(Math.sin(a) * 0.275, Math.cos(a) * 0.275));
  }
  g.add(M(gCyl(0.045, 0.055, 0.045, 12), mat('plastic_black'), 0, 0.075, 0));
  g.add(M(gCyl(0.021, 0.021, 0.3, 10), mat('chrome'), 0, 0.24, 0));
  g.add(M(gBox(0.17, 0.045, 0.19, 0.01), mat('plastic_black'), 0, 0.405, 0.01));
  // seat (front toward -Z)
  g.add(M(gBox(0.475, 0.075, 0.46, 0.028), fab, 0, 0.45, 0));
  // back post + cushion, raked back
  g.add(M(gBox(0.05, 0.3, 0.022), mat('plastic_black'), 0, 0.55, 0.235, { rx: -0.12 }));
  const back = M(gBox(0.45, 0.55, 0.06, 0.03), fab, 0, 0.76, 0.26, { rx: -0.12 });
  g.add(back);
  // armrests
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.028, 0.17, 0.05), mat('plastic_black'), s * 0.255, 0.545, 0.05));
    g.add(M(gBox(0.06, 0.026, 0.24, 0.008), mat('plastic_black'), s * 0.255, 0.64, 0.02));
  }
  setCol(g, col(0, 0, 0.56, 0.56, 0.98));
  return g;
});

def('chair_conf', 'Conference chair', {
  footprint: [0.56, 0.58], height: 0.88, rooms: 'conference room',
}, () => {
  const g = new THREE.Group();
  // cantilever chrome frame (two side loops)
  for (const s of [-1, 1]) {
    const x = s * 0.24;
    g.add(M(gCyl(0.013, 0.013, 0.5, 8), mat('chrome'), x, 0.013, 0.03, { rx: Math.PI / 2 }));
    g.add(M(gCyl(0.013, 0.013, 0.43, 8), mat('chrome'), x, 0.235, -0.21, { rx: 0.08 }));
    g.add(M(gCyl(0.013, 0.013, 0.42, 8), mat('chrome'), x, 0.6, 0.235, { rx: -0.18 }));
  }
  g.add(M(gCyl(0.013, 0.013, 0.48, 8), mat('chrome'), 0, 0.455, -0.245, { rz: Math.PI / 2 }));
  // seat + back
  g.add(M(gBox(0.5, 0.06, 0.47, 0.025), mat('fabric_blue'), 0, 0.475, 0));
  g.add(M(gBox(0.5, 0.46, 0.055, 0.025), mat('fabric_blue'), 0, 0.72, 0.245, { rx: -0.15 }));
  setCol(g, col(0, 0, 0.52, 0.55, 0.88));
  return g;
});

def('chair_waiting', 'Waiting-area chair', {
  footprint: [0.54, 0.54], height: 0.8, rooms: 'lobby, waiting area, break room',
}, (opts = {}) => {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gCyl(0.014, 0.016, 0.44, 8), mat('metal_dark'), sx * 0.22, 0.22, sz * 0.2 + 0.02, { rx: sz * 0.07, rz: -sx * 0.07 }));
  }
  const shellMat = mat(opts.color === 'navy' ? 'paint_navy' : 'plastic_beige');
  g.add(M(gBox(0.48, 0.045, 0.45, 0.02), shellMat, 0, 0.455, 0));
  g.add(M(gBox(0.48, 0.38, 0.04, 0.018), shellMat, 0, 0.63, 0.215, { rx: -0.16 }));
  setCol(g, col(0, 0, 0.5, 0.5, 0.8));
  return g;
});

def('sofa_2seat', 'Two-seat sofa', {
  footprint: [1.5, 0.82], height: 0.78, rooms: 'lobby, exec, waiting',
}, (opts = {}) => {
  const g = new THREE.Group();
  const skin = mat(opts.fabric === 'blue' ? 'fabric_blue' : 'leather_black');
  g.add(M(gBox(1.5, 0.22, 0.8, 0.03), skin, 0, 0.21, 0));
  // seat cushions
  for (const s of [-1, 1]) g.add(M(gBox(0.62, 0.13, 0.62, 0.045), skin, s * 0.335, 0.385, -0.04));
  // back
  g.add(M(gBox(1.5, 0.42, 0.2, 0.04), skin, 0, 0.55, 0.3));
  for (const s of [-1, 1]) g.add(M(gBox(0.62, 0.3, 0.12, 0.05), skin, s * 0.335, 0.56, 0.22, { rx: -0.1 }));
  // armrests
  for (const s of [-1, 1]) g.add(M(gBox(0.13, 0.32, 0.72, 0.045), skin, s * 0.685, 0.42, 0));
  // feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gCyl(0.02, 0.024, 0.1, 8), mat('metal_brushed'), sx * 0.66, 0.05, sz * 0.32));
  }
  setCol(g, col(0, 0, 1.5, 0.82, 0.78));
  return g;
});

def('table_side', 'Side table', {
  footprint: [0.5, 0.5], height: 0.5, rooms: 'lobby, exec office',
}, () => {
  const g = new THREE.Group();
  g.add(M(gCyl(0.26, 0.26, 0.03, 24), mat('wood_dark'), 0, 0.485, 0));
  g.add(M(gCyl(0.02, 0.02, 0.44, 10), mat('metal_dark'), 0, 0.25, 0));
  g.add(M(gCyl(0.17, 0.19, 0.025, 20), mat('metal_dark'), 0, 0.013, 0));
  setCol(g, col(0, 0, 0.52, 0.52, 0.5));
  return g;
});

def('table_conference', 'Conference table (boat)', {
  footprint: [4.2, 1.5], height: 0.74, rooms: 'conference room',
}, () => {
  const g = new THREE.Group();
  const L = 2.1, wEnd = 0.44, wMid = 0.72;
  const shape = new THREE.Shape();
  shape.moveTo(-L, -wEnd);
  shape.quadraticCurveTo(0, -wMid - 0.1, L, -wEnd);
  shape.lineTo(L, wEnd);
  shape.quadraticCurveTo(0, wMid + 0.1, -L, wEnd);
  shape.closePath();
  const topGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.038, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 16 });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, mat('wood_desk'));
  top.position.y = 0.7; top.castShadow = true; top.receiveShadow = true;
  g.add(top);
  // twin pedestal bases
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.16, 0.66, 0.8, 0.02), mat('metal_dark'), s * 1.15, 0.35, 0));
    g.add(M(gBox(0.5, 0.04, 0.9, 0.012), mat('metal_dark'), s * 1.15, 0.02, 0));
  }
  // center cable hatch
  g.add(M(gBox(0.5, 0.012, 0.16, 0.004), mat('plastic_black'), 0, 0.746, 0));
  setCol(g, col(0, 0, 4.2, 1.5, 0.74));
  return g;
});

// ------------------------------------------------------------------ storage
def('filing_cabinet_4d', 'Filing cabinet (4 drawer)', {
  footprint: [0.47, 0.62], height: 1.32, rooms: 'offices, records',
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 0.47, d = 0.62, h = 1.32;
  g.add(M(gBox(w, h - 0.02, d, 0.008), mat('metal_blue'), 0, (h - 0.02) / 2 + 0.02, 0.02));
  g.add(M(gBox(w - 0.06, 0.02, d - 0.06), mat('metal_dark'), 0, 0.012, 0.02));
  const openIdx = opts.drawerOpen === true ? 1 : (typeof opts.drawerOpen === 'number' ? opts.drawerOpen : -1);
  for (let i = 0; i < 4; i++) {
    const fy = 0.16 + i * 0.3;
    const openAmt = i === openIdx ? 0.34 : 0;
    const front = new THREE.Group();
    front.position.z = -d / 2 - openAmt + 0.01;
    front.add(M(gBox(w - 0.045, 0.265, 0.02, 0.005), mat('metal_blue'), 0, fy, 0));
    front.add(M(gBox(0.13, 0.02, 0.026), mat('metal_brushed'), 0, fy + 0.075, -0.016));
    // label holder
    const lt = textTex('file_lbl' + i, ['A – F', 'G – L', 'M – R', 'S – Z'][i], { w: 96, h: 40, bg: '#e9e6da', fg: '#2c3540', border: '#9aa1a7' });
    front.add(label(0.09, 0.038, new THREE.MeshStandardMaterial({ map: lt, roughness: 0.7 }), 0, fy + 0.02, -0.012));
    if (openAmt > 0) {
      // drawer body + hanging files
      front.add(M(gBox(w - 0.07, 0.22, 0.36), mat('metal_dark'), 0, fy - 0.02, 0.19));
      const r = rng(77);
      for (let f = 0; f < 6; f++) {
        front.add(M(gBox(w - 0.12, 0.16, 0.012), mat('paper'), 0, fy + 0.06, 0.055 + f * 0.05, { rx: (r() - 0.5) * 0.06 }));
      }
    }
    g.add(front);
  }
  setCol(g, col(0, 0.02, w, d, h));
  return g;
});

def('drawer_unit', 'Under-desk drawer unit', {
  footprint: [0.42, 0.58], height: 0.6, rooms: 'under desks',
}, () => {
  const g = new THREE.Group();
  const w = 0.42, d = 0.58, h = 0.6;
  g.add(M(gBox(w, h - 0.06, d, 0.008), mat('metal_beige'), 0, (h - 0.06) / 2 + 0.06, 0));
  for (let i = 0; i < 3; i++) {
    const fy = 0.155 + i * 0.165;
    g.add(M(gBox(w - 0.04, 0.14, 0.016, 0.004), mat('metal_beige'), 0, fy, -d / 2 - 0.002));
    g.add(M(gBox(0.11, 0.016, 0.02), mat('plastic_black'), 0, fy + 0.042, -d / 2 - 0.014));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(casterWheel(sx * 0.15, sz * 0.22, 0.026));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('shelf_unit', 'Metal shelf unit', {
  footprint: [0.9, 0.4], height: 1.8, rooms: 'copy room, storage',
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 0.9, d = 0.4, h = 1.8;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gBox(0.035, h, 0.035), mat('metal_beige'), sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02)));
  }
  for (let i = 0; i < 5; i++) {
    g.add(M(gBox(w, 0.03, d, 0.006), mat('metal_beige'), 0, 0.09 + i * (h - 0.14) / 4, 0));
  }
  if (opts.filled ?? false) {
    const r = rng(31);
    for (let i = 0; i < 5; i++) {
      const sy = 0.105 + i * (h - 0.14) / 4;
      let x = -w / 2 + 0.1;
      while (x < w / 2 - 0.12) {
        const bw = 0.12 + r() * 0.16, bh = 0.14 + r() * 0.16;
        if (r() > 0.3) g.add(M(gBox(bw, bh, 0.25 + r() * 0.08), mat('cardboard'), x + bw / 2, sy + bh / 2, (r() - 0.5) * 0.05));
        x += bw + 0.035;
      }
    }
  }
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('rack_archive', 'Rolling archive rack', {
  footprint: [1.0, 0.7], height: 2.2, rooms: 'records archive', gallery: { filled: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 1.0, d = 0.66, h = 2.2;
  // uprights + center spine
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gBox(0.045, h - 0.1, 0.045), mat('metal_dark'), sx * (w / 2 - 0.025), (h - 0.1) / 2 + 0.1, sz * (d / 2 - 0.025)));
  }
  g.add(M(gBox(w, h - 0.35, 0.025), mat('metal_dark'), 0, (h - 0.35) / 2 + 0.12, 0));
  // shelves both sides
  for (let i = 0; i < 5; i++) {
    g.add(M(gBox(w, 0.028, d, 0.005), mat('metal_dark'), 0, 0.14 + i * (h - 0.32) / 4, 0));
  }
  // base + casters
  g.add(M(gBox(w, 0.06, d), mat('metal_dark'), 0, 0.1, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(casterWheel(sx * 0.4, sz * 0.24, 0.035));
  // end handle
  g.add(M(gBox(0.03, 0.5, 0.03), mat('metal_brushed'), w / 2 + 0.03, 1.15, -0.2));
  g.add(M(gBox(0.03, 0.5, 0.03), mat('metal_brushed'), w / 2 + 0.03, 1.15, 0.2));
  g.add(M(gBox(0.03, 0.03, 0.43), mat('metal_brushed'), w / 2 + 0.03, 1.42, 0));
  if (opts.filled ?? true) {
    const r = rng(19);
    for (let i = 0; i < 4; i++) {
      const sy = 0.155 + i * (h - 0.32) / 4;
      for (const sz of [-1, 1]) {
        let x = -w / 2 + 0.08;
        while (x < w / 2 - 0.16) {
          const bw = 0.15 + r() * 0.1;
          if (r() > 0.25) {
            const bx = M(gBox(bw, 0.26, 0.3, 0.004), mat('cardboard'), x + bw / 2, sy + 0.13, sz * 0.165);
            g.add(bx);
          }
          x += bw + 0.02;
        }
      }
    }
  }
  setCol(g, col(0, 0, w + 0.1, d, h));
  return g;
});

def('bookcase', 'Bookcase', {
  footprint: [0.9, 0.32], height: 1.9, rooms: 'exec office, offices', gallery: { filled: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 0.9, d = 0.32, h = 1.9;
  g.add(M(gBox(w, h, 0.018), mat('wood_dark'), 0, h / 2, d / 2 - 0.009)); // back
  for (const s of [-1, 1]) g.add(M(gBox(0.022, h, d), mat('wood_dark'), s * (w / 2 - 0.011), h / 2, 0));
  g.add(M(gBox(w, 0.03, d), mat('wood_dark'), 0, h - 0.015, 0));
  g.add(M(gBox(w, 0.06, d), mat('wood_dark'), 0, 0.03, 0));
  for (let i = 0; i < 4; i++) g.add(M(gBox(w - 0.044, 0.022, d - 0.02), mat('wood_dark'), 0, 0.42 + i * 0.44, 0));
  if (opts.filled ?? true) {
    const palette = [0x5c3a2e, 0x2e4a5c, 0x6b6f2e, 0x4a2e5c, 0x8a8f94, 0x3e5c46, 0x74282e, 0xc7c0ae];
    const r = rng(41);
    for (let row = 0; row < 4; row++) {
      const sy = 0.09 + (row > 0 ? 0.35 + (row - 1) * 0.44 : 0);
      let x = -w / 2 + 0.05;
      const rowEnd = w / 2 - 0.06 - (row === 2 ? 0.3 : 0);
      while (x < rowEnd) {
        const bw = 0.022 + r() * 0.02, bh = 0.2 + r() * 0.1;
        const m = new THREE.MeshStandardMaterial({ color: palette[Math.floor(r() * palette.length)], roughness: 0.75 });
        g.add(M(gBox(bw, bh, 0.2), m, x + bw / 2, sy + bh / 2 + 0.012, 0.02, { rz: r() > 0.92 ? 0.16 : 0 }));
        x += bw + 0.004;
      }
      if (row === 2) { // bookend + small stack
        g.add(M(gBox(0.14, 0.05, 0.2), mat('paper'), w / 2 - 0.18, sy + 0.04, 0.02));
        g.add(M(gBox(0.12, 0.04, 0.18), mat('paper'), w / 2 - 0.18, sy + 0.085, 0.02, { ry: 0.2 }));
      }
    }
  }
  setCol(g, col(0, 0, w, d, h));
  return g;
});

// -------------------------------------------------------------- electronics
function screenUITex(kind) {
  return canvasTex('ui_' + kind, 1024, 640, (g, w, h) => {
    const r = rng(kind === 'dispatch' ? 5 : kind === 'sheet' ? 9 : 13);
    g.fillStyle = '#0b1420'; g.fillRect(0, 0, w, h);
    // window chrome
    g.fillStyle = '#122238'; g.fillRect(0, 0, w, 46);
    g.fillStyle = '#8fd8ff'; g.font = 'bold 22px Arial, sans-serif'; g.textAlign = 'left';
    g.fillText(kind === 'dispatch' ? 'NLG DISPATCH CONSOLE v4.2' : kind === 'sheet' ? 'NLG FINANCE — Q4 LEDGER' : 'NLG MAIL — INBOX (47)', 18, 31);
    drawStar(g, w - 36, 23, 15, { ring: '#8fd8ff' });
    if (kind === 'dispatch') {
      // sidebar
      g.fillStyle = '#0e1a2c'; g.fillRect(0, 46, 200, h - 46);
      for (let i = 0; i < 7; i++) {
        g.fillStyle = i === 1 ? '#1c3450' : '#132540';
        g.fillRect(12, 66 + i * 52, 176, 38);
        g.fillStyle = '#7d97ab'; g.fillRect(24, 80 + i * 52, 90 + (i * 37) % 60, 9);
      }
      // route table
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? '#0e1a2a' : '#101e30';
        g.fillRect(212, 66 + i * 42, 500, 34);
        g.fillStyle = '#9db4c8';
        g.fillRect(226, 78 + i * 42, 60, 9);
        g.fillRect(300, 78 + i * 42, 120 + (i * 53) % 80, 9);
        const st = i % 3;
        g.fillStyle = st === 0 ? '#3dd97a' : st === 1 ? '#e8b93d' : '#e0554a';
        g.beginPath(); g.arc(690, 83 + i * 42, 7, 0, 7); g.fill();
      }
      // map panel
      g.fillStyle = '#0d1826'; g.fillRect(724, 66, 284, 380);
      g.strokeStyle = '#1e3350'; g.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        g.beginPath();
        g.moveTo(724 + r() * 284, 66 + r() * 380);
        g.lineTo(724 + r() * 284, 66 + r() * 380);
        g.stroke();
      }
      g.strokeStyle = '#3dd97a'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(760, 400); g.quadraticCurveTo(860, 300, 940, 150); g.stroke();
      drawStar(g, 940, 150, 14, { ring: '#e0554a', star: '#e0554a' });
      // status bar
      g.fillStyle = '#122238'; g.fillRect(212, 460, 796, 150);
      g.fillStyle = '#7d97ab'; g.font = '16px Arial, sans-serif';
      g.fillText('STORM ADVISORY: ROUTE 7 CLOSED — DISPATCH HOLD IN EFFECT', 232, 492);
      g.fillStyle = '#28405c';
      for (let i = 0; i < 3; i++) g.fillRect(232 + i * 260, 516, 236, 70);
    } else if (kind === 'sheet') {
      // ledger grid (dark theme so the emissive screen doesn't blow out)
      g.fillStyle = '#0e1826'; g.fillRect(0, 46, w, h - 46);
      g.fillStyle = '#16283c'; g.fillRect(0, 46, w, 30);
      g.fillStyle = '#122134'; g.fillRect(0, 46, 56, h - 46);
      g.strokeStyle = '#1b2e44'; g.lineWidth = 1;
      for (let x = 56; x < w; x += 88) { g.beginPath(); g.moveTo(x, 46); g.lineTo(x, h); g.stroke(); }
      for (let y = 76; y < h; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#8ea6ba'; g.font = '13px Arial, sans-serif';
      for (let row = 0; row < 20; row++) for (let c = 0; c < 8; c++) {
        if (r() > 0.4) g.fillText((r() * 90000).toFixed(0), 70 + c * 88, 94 + row * 26);
      }
      g.fillStyle = 'rgba(61,120,216,0.3)'; g.fillRect(56 + 88 * 2, 76 + 26 * 4, 88, 26);
      g.fillStyle = 'rgba(224,85,74,0.6)'; g.fillRect(56 + 88 * 5, 76 + 26 * 9, 88, 26);
    } else {
      g.fillStyle = '#101d2e'; g.fillRect(0, 46, 300, h - 46);
      for (let i = 0; i < 11; i++) {
        g.fillStyle = i === 2 ? '#1d3550' : (i % 2 ? '#12233a' : '#101f34');
        g.fillRect(0, 46 + i * 54, 300, 52);
        g.fillStyle = '#9db4c8'; g.fillRect(16, 62 + i * 54, 150 + (i * 61) % 110, 9);
        g.fillStyle = '#5c7c96'; g.fillRect(16, 80 + i * 54, 200, 7);
      }
      g.fillStyle = '#0e1a2a'; g.fillRect(300, 46, w - 300, h - 46);
      g.fillStyle = '#c9d6e2'; g.font = 'bold 20px Arial, sans-serif';
      g.fillText('RE: Dock 2 shutter — manual override', 330, 96);
      g.fillStyle = '#7d97ab';
      for (let i = 0; i < 12; i++) g.fillRect(330, 130 + i * 26, 380 + (i * 97) % 260, 8);
    }
    // scanline sheen
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.05)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

function screenMat(kind) {
  const key = 'screen_' + kind;
  if (_matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    map: screenUITex(kind), roughness: 0.25, metalness: 0,
    emissive: 0xffffff, emissiveMap: screenUITex(kind), emissiveIntensity: 0.85,
  });
  _matCache.set(key, m);
  return m;
}

function buildMonitorPanel(on, sizeW, ui) {
  const grp = new THREE.Group();
  const w = sizeW, h = w * 0.578; // 16:9 + bezel
  grp.add(M(gBox(w, h, 0.028, 0.006), mat('plastic_black'), 0, 0, 0.014));
  const scr = label(w - 0.016, h - 0.016, on ? screenMat(ui) : mat('screen_off'), 0, 0, -0.0015);
  grp.add(scr);
  grp.add(M(gBox(w * 0.55, h * 0.72, 0.03), mat('plastic_black'), 0, -h * 0.05, 0.042)); // rear bulge
  if (on) grp.add(M(gBox(0.012, 0.004, 0.004), mat('led_green'), w / 2 - 0.03, -h / 2 + 0.008, -0.001));
  return grp;
}

def('monitor', 'Desktop monitor 27"', {
  footprint: [0.62, 0.22], height: 0.52, rooms: 'every desk', gallery: { on: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = opts.size === 24 ? 0.545 : 0.615;
  const panel = buildMonitorPanel(opts.on ?? false, w, opts.ui ?? 'dispatch');
  panel.position.set(0, 0.34, -0.02);
  panel.rotation.x = -0.04;
  g.add(panel);
  g.add(M(gBox(0.05, 0.3, 0.04, 0.008), mat('plastic_black'), 0, 0.16, 0.05, { rx: 0.12 }));
  g.add(M(gBox(0.24, 0.014, 0.19, 0.006), mat('plastic_black'), 0, 0.007, 0.03));
  return g;
});

def('monitor_dual', 'Dual monitor rig', {
  footprint: [1.05, 0.25], height: 0.55, rooms: 'IT, dispatch, security', gallery: { on: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const uis = ['dispatch', 'sheet'];
  for (const s of [-1, 1]) {
    const panel = buildMonitorPanel(opts.on ?? false, 0.545, opts.ui ?? uis[(s + 1) / 2]);
    panel.position.set(s * 0.272, 0.37, -0.015 - 0.035 * 0);
    panel.rotation.y = s * 0.16;
    g.add(panel);
    const arm = M(gBox(0.26, 0.03, 0.03), mat('metal_dark'), s * 0.13, 0.5, 0.075, { ry: s * 0.16 });
    g.add(arm);
  }
  g.add(M(gCyl(0.02, 0.02, 0.48, 10), mat('metal_dark'), 0, 0.25, 0.08));
  g.add(M(gBox(0.3, 0.016, 0.22, 0.006), mat('metal_dark'), 0, 0.008, 0.06));
  return g;
});

def('pc_tower', 'Workstation tower', {
  footprint: [0.19, 0.44], height: 0.42, rooms: 'under desks',
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 0.19, d = 0.44, h = 0.42;
  g.add(M(gBox(w, h, d, 0.008), mat('plastic_black'), 0, h / 2, 0));
  // front face detail
  const front = texMat('pc_front', 128, 256, (gg, cw, ch) => {
    gg.fillStyle = '#212327'; gg.fillRect(0, 0, cw, ch);
    gg.fillStyle = '#17181b';
    for (let i = 0; i < 10; i++) gg.fillRect(14, 96 + i * 13, 100, 5);
    gg.fillStyle = '#101114'; gg.fillRect(14, 20, 100, 16); // drive bay
    gg.fillStyle = '#101114'; gg.fillRect(14, 44, 100, 10);
    gg.fillStyle = '#2c2e33'; gg.fillRect(48, 62, 32, 18);
  }, { roughness: 0.5 });
  g.add(label(w - 0.015, h - 0.02, front, 0, h / 2, -d / 2 - 0.002));
  g.add(M(gCyl(0.008, 0.008, 0.006, 10), mat(opts.on ?? true ? 'led_green' : 'plastic_gray'), 0.045, h - 0.05, -d / 2 - 0.003, { rx: Math.PI / 2 }));
  // side vent groove
  g.add(M(gBox(0.004, h * 0.5, d * 0.6), mat('metal_dark'), w / 2, h * 0.5, 0));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

function keyboardTex() {
  return canvasTex('kbd', 512, 170, (g, w, h) => {
    g.fillStyle = '#1d1f23'; g.fillRect(0, 0, w, h);
    const key = (x, y, kw, kh) => {
      g.fillStyle = '#43464d'; g.fillRect(x, y, kw, kh);
      g.fillStyle = '#5a5e66'; g.fillRect(x + 1, y + 1, kw - 2, kh - 4);
      g.fillStyle = '#8b909a'; g.fillRect(x + 4, y + 4, Math.min(8, kw - 8), 3); // legend hint
    };
    for (let row = 0; row < 5; row++) {
      let x = 8 + (row === 4 ? 0 : row * 4);
      const y = 10 + row * 30, kh = 24;
      if (row === 4) { key(8, y, 60, kh); key(72, y, 24, kh); key(100, y, 190, kh); key(294, y, 24, kh); key(322, y, 60, kh); }
      else for (let i = 0; i < 14; i++) { const kw = i === 13 ? 34 : 24; key(x, y, kw, kh); x += kw + 4; }
    }
    // nav + numpad blocks
    for (let r2 = 0; r2 < 5; r2++) for (let c = 0; c < 3; c++) key(396 + c * 28, 10 + r2 * 30, 24, 24);
    for (let r2 = 0; r2 < 2; r2++) for (let c = 0; c < 3; c++) key(396 + c * 28, 10 + r2 * 30, 24, 24);
  });
}

def('keyboard', 'Keyboard', {
  footprint: [0.44, 0.15], height: 0.03, rooms: 'every desk',
}, () => {
  const g = new THREE.Group();
  const tilted = new THREE.Group();
  tilted.rotation.x = 0.045;
  tilted.position.y = 0.004;
  tilted.add(M(gBox(0.44, 0.022, 0.15, 0.006), mat('plastic_black'), 0, 0.011, 0));
  tilted.add(label(0.42, 0.132, new THREE.MeshStandardMaterial({ map: keyboardTex(), roughness: 0.55 }), 0, 0.0225, 0, { face: '+y' }));
  g.add(tilted);
  return g;
});

def('mouse_pad_set', 'Mouse + pad', {
  footprint: [0.27, 0.23], height: 0.04, rooms: 'every desk',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.26, 0.004, 0.22, 0.002), mat('rubber'), 0, 0.002, 0));
  const mouse = new THREE.Group();
  const shell = M(gSphere(0.032, 12, 10), mat('plastic_black'), 0, 0.016, 0, { sx: 1.0, sy: 0.72, sz: 1.75 });
  mouse.add(shell);
  mouse.add(M(gBox(0.002, 0.012, 0.02), mat('plastic_gray'), 0, 0.032, -0.028));
  mouse.position.set(0.05, 0.004, 0.02);
  mouse.rotation.y = -0.35;
  g.add(mouse);
  return g;
});

def('laptop', 'Laptop', {
  footprint: [0.32, 0.24], height: 0.24, rooms: 'conference, desks', gallery: { open: true, on: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const open = opts.open ?? true;
  g.add(M(gBox(0.32, 0.016, 0.22, 0.005), mat('metal_brushed'), 0, 0.008, 0));
  const kb = label(0.28, 0.12, new THREE.MeshStandardMaterial({ map: keyboardTex(), roughness: 0.55 }), 0, 0.0165, 0.025, { face: '+y' });
  g.add(kb);
  g.add(M(gBox(0.09, 0.002, 0.05), mat('plastic_gray'), 0, 0.017, -0.078)); // trackpad
  // lid hinged at the back (+Z) edge; closed lies flat over the base,
  // open rotates the far edge up and slightly past vertical (~106°).
  const lid = new THREE.Group();
  lid.position.set(0, 0.018, 0.106);
  lid.rotation.x = open ? 1.85 : 0;
  lid.add(M(gBox(0.32, 0.012, 0.215, 0.004), mat('metal_brushed'), 0, 0, -0.104));
  if (open) {
    const scr = label(0.295, 0.185, (opts.on ?? true) ? screenMat('mail') : mat('screen_off'), 0, -0.0075, -0.104, { face: '+y' });
    scr.rotation.x = Math.PI / 2; // inner face (looks at the keyboard when closed)
    lid.add(scr);
  }
  g.add(lid);
  return g;
});

def('phone_desk', 'Desk phone', {
  footprint: [0.22, 0.19], height: 0.09, rooms: 'every desk',
}, () => {
  const g = new THREE.Group();
  const body = M(gBox(0.2, 0.045, 0.17, 0.008), mat('plastic_black'), 0.015, 0.028, 0, { rx: 0.18 });
  g.add(body);
  const faceTex = texMat('phone_face', 128, 128, (gg) => {
    gg.fillStyle = '#26282c'; gg.fillRect(0, 0, 128, 128);
    gg.fillStyle = '#9fd0b0'; gg.fillRect(18, 12, 92, 30);
    gg.fillStyle = '#1c3428'; gg.font = '12px monospace'; gg.fillText('LINE 1  10:42', 24, 31);
    for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 3; c++) {
      gg.fillStyle = '#43464d'; gg.fillRect(24 + c * 30, 52 + r2 * 18, 24, 12);
    }
  }, { roughness: 0.5, emissive: true, emissiveIntensity: 0.28 });
  const face = label(0.115, 0.115, faceTex, 0.035, 0.055, -0.0, { face: '+y' });
  face.rotation.x = -Math.PI / 2 + 0.18; face.position.y = 0.054; face.position.z = 0.005;
  g.add(face);
  // handset on the left
  const hs = new THREE.Group();
  hs.add(M(gBox(0.045, 0.02, 0.05, 0.008), mat('plastic_black'), 0, 0.01, -0.055));
  hs.add(M(gBox(0.045, 0.02, 0.05, 0.008), mat('plastic_black'), 0, 0.01, 0.055));
  hs.add(M(gBox(0.032, 0.014, 0.13), mat('plastic_black'), 0, 0.014, 0));
  hs.position.set(-0.072, 0.045, 0); hs.rotation.x = 0.18;
  g.add(hs);
  // curly cord
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.09, 0.03, 0.08),
    new THREE.Vector3(-0.11, 0.015, 0.1),
    new THREE.Vector3(-0.1, 0.008, 0.06),
    new THREE.Vector3(-0.115, 0.006, 0.02),
  ]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.004, 5), mat('rubber'));
  cord.castShadow = true;
  g.add(cord);
  return g;
});

def('headset_stand', 'Headset on stand', {
  footprint: [0.14, 0.14], height: 0.3, rooms: 'dispatch desks',
}, () => {
  const g = new THREE.Group();
  g.add(M(gCyl(0.055, 0.06, 0.012, 14), mat('plastic_black'), 0, 0.006, 0));
  g.add(M(gCyl(0.009, 0.009, 0.24, 8), mat('metal_brushed'), 0, 0.13, 0));
  const hook = M(gTorus(0.045, 0.008, 6, 12, Math.PI), mat('metal_brushed'), 0, 0.25, 0);
  g.add(hook);
  // headset draped on top
  const band = M(gTorus(0.065, 0.009, 6, 14, Math.PI), mat('plastic_black'), 0, 0.245, 0);
  g.add(band);
  for (const s of [-1, 1]) {
    g.add(M(gCyl(0.032, 0.032, 0.022, 12), mat('plastic_black'), s * 0.066, 0.24, 0, { rz: Math.PI / 2 }));
    g.add(M(gCyl(0.024, 0.024, 0.008, 10), mat('fabric_gray'), s * 0.078, 0.24, 0, { rz: Math.PI / 2 }));
  }
  g.add(M(gCyl(0.004, 0.004, 0.07, 5), mat('plastic_black'), -0.075, 0.2, -0.03, { rx: 0.5, rz: 0.2 }));
  return g;
});

def('dock_station', 'Laptop dock', {
  footprint: [0.28, 0.1], height: 0.05, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.27, 0.035, 0.09, 0.008), mat('plastic_black'), 0, 0.018, 0, { rx: 0.1 }));
  g.add(M(gBox(0.2, 0.012, 0.02), mat('metal_dark'), 0, 0.042, -0.005, { rx: 0.1 }));
  g.add(M(gCyl(0.004, 0.004, 0.004, 8), mat('led_green'), 0.1, 0.037, -0.035, { rx: Math.PI / 2 + 0.1 }));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.13, 0.02, 0.03),
    new THREE.Vector3(0.19, 0.005, 0.06),
    new THREE.Vector3(0.24, 0.004, 0.02),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.0045, 5), mat('rubber')));
  return g;
});

def('printer_desk', 'Desktop printer', {
  footprint: [0.44, 0.38], height: 0.26, rooms: 'offices, copy room',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.42, 0.2, 0.36, 0.014), mat('plastic_gray'), 0, 0.11, 0));
  g.add(M(gBox(0.3, 0.02, 0.2), mat('plastic_black'), 0, 0.22, 0.02, { rx: -0.12 })); // top output slope
  g.add(M(gBox(0.26, 0.012, 0.13), mat('paper'), 0, 0.225, -0.01, { rx: -0.12 }));
  g.add(M(gBox(0.3, 0.05, 0.03, 0.008), mat('plastic_black'), 0, 0.05, -0.19)); // paper tray lip
  g.add(M(gBox(0.09, 0.028, 0.015), mat('plastic_black'), 0.13, 0.185, -0.181, { rx: 0.3 }));
  g.add(M(gCyl(0.005, 0.005, 0.005, 8), mat('led_green'), 0.115, 0.2, -0.181, { rx: Math.PI / 2 - 0.3 }));
  setCol(g, col(0, 0, 0.44, 0.38, 0.26));
  return g;
});

def('copier_large', 'Office copier', {
  footprint: [1.2, 0.7], height: 1.15, rooms: 'copy & mail room',
}, () => {
  const g = new THREE.Group();
  // base cabinet + body
  g.add(M(gBox(1.05, 0.16, 0.62), mat('plastic_black'), 0, 0.1, 0));
  g.add(M(gBox(1.1, 0.62, 0.66, 0.02), mat('plastic_beige'), 0, 0.49, 0));
  // twin paper drawers
  for (let i = 0; i < 2; i++) {
    const fy = 0.32 + i * 0.2;
    g.add(M(gBox(0.62, 0.16, 0.02, 0.006), mat('plastic_gray'), -0.15, fy, -0.34));
    g.add(M(gBox(0.34, 0.03, 0.02), mat('plastic_black'), -0.15, fy + 0.045, -0.35));
  }
  // top scanner deck + lid
  g.add(M(gBox(1.1, 0.14, 0.66, 0.02), mat('plastic_beige'), 0, 0.87, 0));
  g.add(M(gBox(0.62, 0.05, 0.5, 0.014), mat('plastic_gray'), -0.18, 0.965, 0));
  // document feeder hump
  g.add(M(gBox(0.62, 0.07, 0.24, 0.02), mat('plastic_gray'), -0.18, 1.02, 0.1));
  // control panel
  const cp = texMat('copier_panel', 256, 128, (gg) => {
    gg.fillStyle = '#2c2e33'; gg.fillRect(0, 0, 256, 128);
    gg.fillStyle = '#9fd0ff'; gg.fillRect(16, 16, 120, 62);
    gg.fillStyle = '#14365c'; gg.font = 'bold 15px Arial'; gg.fillText('READY', 30, 44);
    gg.font = '11px Arial'; gg.fillText('TRAY 1 · A4 · 100%', 30, 62);
    for (let i = 0; i < 6; i++) { gg.fillStyle = '#4a4d55'; gg.fillRect(152 + (i % 3) * 32, 20 + Math.floor(i / 3) * 28, 24, 18); }
    gg.fillStyle = '#3dd97a'; gg.beginPath(); gg.arc(230, 100, 9, 0, 7); gg.fill();
  }, { roughness: 0.4, emissive: true, emissiveIntensity: 0.35 });
  const panel = label(0.4, 0.2, cp, 0.32, 0.99, -0.26, { face: '+y' });
  panel.rotation.x = -Math.PI / 2 + 0.5;
  panel.position.y = 0.97;
  g.add(panel);
  // side output tray
  g.add(M(gBox(0.3, 0.015, 0.4, 0.005), mat('plastic_gray'), 0.62, 0.72, 0, { rz: 0.12 }));
  g.add(M(gBox(0.24, 0.01, 0.3), mat('paper'), 0.63, 0.735, 0, { rz: 0.12 }));
  setCol(g, col(0, 0, 1.2, 0.7, 1.15));
  return g;
});

def('projector_ceiling', 'Ceiling projector', {
  footprint: [0.4, 0.32], height: 2.6, mount: 'ceiling', rooms: 'conference',
}, (opts = {}) => {
  const g = new THREE.Group();
  const ceilY = opts.ceilY ?? 2.6;
  g.add(M(gCyl(0.05, 0.05, 0.015, 12), mat('plastic_white'), 0, ceilY - 0.008, 0));
  g.add(M(gCyl(0.014, 0.014, 0.24, 8), mat('plastic_white'), 0, ceilY - 0.13, 0));
  const body = M(gBox(0.36, 0.11, 0.28, 0.025), mat('plastic_white'), 0, ceilY - 0.31, 0);
  g.add(body);
  g.add(M(gCyl(0.035, 0.042, 0.02, 14), mat('screen_off'), -0.09, ceilY - 0.31, -0.145, { rx: Math.PI / 2 }));
  g.add(M(gBox(0.1, 0.02, 0.004), mat('plastic_gray'), 0.08, ceilY - 0.27, -0.141));
  return g;
});

def('screen_projection', 'Projection screen', {
  footprint: [2.0, 0.12], height: 2.35, mount: 'wall', rooms: 'conference',
}, () => {
  const g = new THREE.Group();
  const topY = 2.3;
  g.add(M(gCyl(0.045, 0.045, 2.0, 12), mat('plastic_white'), 0, topY, -0.05, { rz: Math.PI / 2 }));
  for (const s of [-1, 1]) g.add(M(gBox(0.03, 0.1, 0.08), mat('plastic_gray'), s * 1.0, topY, -0.03));
  const surf = texMat('proj_surface', 64, 64, (gg) => {
    gg.fillStyle = '#f4f5f2'; gg.fillRect(0, 0, 64, 64);
    const gr = gg.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(190,200,210,0.25)'); gr.addColorStop(0.25, 'rgba(255,255,255,0)');
    gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
  }, { roughness: 0.85 });
  g.add(label(1.86, 1.12, surf, 0, topY - 0.62, -0.052));
  g.add(M(gBox(1.9, 0.035, 0.02), mat('plastic_gray'), 0, topY - 1.2, -0.052));
  return g;
});

function whiteboardTex() {
  return canvasTex('whiteboard', 1024, 683, (g, w, h) => {
    g.fillStyle = '#f6f7f5'; g.fillRect(0, 0, w, h);
    // faint smears of erased marker
    const r = rng(23);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(120,130,140,0.05)';
      g.beginPath(); g.ellipse(r() * w, r() * h, 60 + r() * 90, 20 + r() * 30, r(), 0, 7); g.fill();
    }
    const wob = (x, y) => [x + (r() - 0.5) * 6, y + (r() - 0.5) * 6];
    // title
    g.strokeStyle = '#2b4a6d'; g.lineWidth = 5; g.font = 'bold 44px Comic Sans MS, cursive';
    g.fillStyle = '#2b4a6d';
    g.fillText('WEEK 51 — DISPATCH BOARD', 40, 70);
    g.strokeStyle = '#2b4a6d'; g.beginPath(); g.moveTo(38, 88); g.lineTo(640, 92); g.stroke();
    // columns
    g.font = 'bold 30px Comic Sans MS, cursive';
    g.fillText('TRUCKS', 60, 150); g.fillText('ROUTES', 380, 150); g.fillText('STATUS', 700, 150);
    g.font = '26px Comic Sans MS, cursive';
    const rows = [
      ['T-204', 'NORTH LOOP', 'OK'],
      ['T-117', 'AIRPORT RUN', 'OK'],
      ['T-093', 'ROUTE 7', 'HOLD'],
      ['T-158', 'DEPOT SHUTTLE', 'LATE'],
    ];
    rows.forEach((row, i) => {
      const y = 200 + i * 46;
      g.fillStyle = '#333a41'; g.fillText(row[0], 64, y); g.fillText(row[1], 384, y);
      g.fillStyle = row[2] === 'OK' ? '#2e7d4f' : '#c0392b'; g.fillText(row[2], 704, y);
    });
    // red circle annotation
    g.strokeStyle = '#c0392b'; g.lineWidth = 5;
    g.beginPath(); g.ellipse(760, 290, 90, 34, 0.05, 0, 7); g.stroke();
    g.font = '24px Comic Sans MS, cursive'; g.fillStyle = '#c0392b';
    g.fillText('DOCK 2 FROZEN →', 620, 420);
    g.fillText('call maintenance!!', 640, 452);
    // little chart bottom-left
    g.strokeStyle = '#333a41'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(60, 620); g.lineTo(60, 480); g.moveTo(60, 620); g.lineTo(330, 620); g.stroke();
    g.strokeStyle = '#2e7d4f'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(60, 600);
    [90, 130, 180, 225, 280, 330].forEach((x, i) => g.lineTo(...wob(x, 600 - i * 22)));
    g.stroke();
    g.fillStyle = '#333a41'; g.font = '20px Comic Sans MS, cursive';
    g.fillText('on-time %', 150, 655);
    // arrow to routes
    g.strokeStyle = '#2b4a6d'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(430, 380); g.quadraticCurveTo(480, 430, 540, 400); g.stroke();
    g.beginPath(); g.moveTo(540, 400); g.lineTo(524, 392); g.moveTo(540, 400); g.lineTo(530, 414); g.stroke();
  });
}

def('whiteboard', 'Whiteboard', {
  footprint: [1.8, 0.1], height: 2.1, mount: 'wall', rooms: 'conference, offices',
}, () => {
  const g = new THREE.Group();
  const cy = 1.5;
  g.add(M(gBox(1.84, 1.24, 0.03, 0.008), mat('metal_brushed'), 0, cy, -0.025));
  g.add(label(1.76, 1.16, new THREE.MeshStandardMaterial({ map: whiteboardTex(), roughness: 0.25 }), 0, cy, -0.042));
  // marker tray + markers
  g.add(M(gBox(0.6, 0.02, 0.05), mat('metal_brushed'), 0, cy - 0.64, -0.05));
  const cols = [0xc0392b, 0x2b4a6d, 0x2c3540];
  cols.forEach((c, i) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
    g.add(M(gCyl(0.009, 0.009, 0.12, 8), m, -0.18 + i * 0.14, cy - 0.62, -0.055, { rz: Math.PI / 2, ry: 0.2 * i }));
  });
  return g;
});

def('corkboard', 'Cork board', {
  footprint: [1.2, 0.08], height: 1.95, mount: 'wall', rooms: 'break room, corridors',
}, () => {
  const g = new THREE.Group();
  const cy = 1.45;
  const cork = texMat('cork', 256, 192, (gg, w, h) => {
    gg.fillStyle = '#b58a58'; gg.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 2600; i++) {
      gg.fillStyle = r() > 0.5 ? 'rgba(90,60,30,0.18)' : 'rgba(230,200,150,0.14)';
      gg.fillRect(r() * w, r() * h, 1.6, 1.6);
    }
  }, { roughness: 0.9 });
  g.add(M(gBox(1.2, 0.9, 0.035, 0.008), mat('wood_desk'), 0, cy, -0.02));
  g.add(label(1.12, 0.82, cork, 0, cy, -0.039));
  // pinned notices
  const r = rng(8);
  const noteTex = (i) => texMat('note' + i, 96, 128, (gg) => {
    gg.fillStyle = ['#ffffff', '#fdf3c1', '#dff0fa', '#ffffff', '#fce9e6'][i % 5];
    gg.fillRect(0, 0, 96, 128);
    gg.fillStyle = '#3c4652'; gg.font = 'bold 10px Arial';
    gg.fillText(['HOLIDAY ROTA', 'FOR SALE', 'SAFETY DRILL', 'PARKING NOTICE', 'POTLUCK FRI'][i % 5], 8, 16);
    gg.fillStyle = '#7c848c';
    for (let l = 0; l < 8; l++) gg.fillRect(8, 26 + l * 11, 60 + ((i * 31 + l * 17) % 22), 4);
  }, { roughness: 0.85 });
  for (let i = 0; i < 6; i++) {
    const x = -0.42 + (i % 3) * 0.4 + (r() - 0.5) * 0.08;
    const y = cy + 0.22 - Math.floor(i / 3) * 0.38 + (r() - 0.5) * 0.06;
    const note = label(0.14, 0.18, noteTex(i), x, y, -0.045, { rz: (r() - 0.5) * 0.22 });
    note.castShadow = false;
    g.add(note);
    const pin = new THREE.MeshStandardMaterial({ color: [0xc0392b, 0x2b6da0, 0xd9a323][i % 3], roughness: 0.4 });
    g.add(M(gSphere(0.008, 8, 6), pin, x, y + 0.08, -0.05));
  }
  return g;
});

def('clock_wall', 'Wall clock', {
  footprint: [0.32, 0.06], height: 2.35, mount: 'wall', rooms: 'everywhere',
}, () => {
  const g = new THREE.Group();
  const cy = 2.15;
  g.add(M(gCyl(0.16, 0.165, 0.045, 24), mat('plastic_black'), 0, cy, -0.024, { rx: Math.PI / 2 }));
  const face = texMat('clockface', 256, 256, (gg) => {
    gg.fillStyle = '#f4f5f2'; gg.beginPath(); gg.arc(128, 128, 124, 0, 7); gg.fill();
    gg.fillStyle = '#2c3540';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = i % 3 === 0 ? 100 : 108;
      gg.save(); gg.translate(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); gg.rotate(a);
      gg.fillRect(-3, -(120 - r1) / 1, 6, i % 3 === 0 ? 20 : 12);
      gg.restore();
    }
    const hand = (a, len, wdt, color) => {
      gg.strokeStyle = color; gg.lineWidth = wdt; gg.lineCap = 'round';
      gg.beginPath(); gg.moveTo(128, 128);
      gg.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); gg.stroke();
    };
    hand(((7 + 42 / 60) / 12) * Math.PI * 2, 62, 9, '#2c3540');   // 07:42 — dawn assault
    hand((42 / 60) * Math.PI * 2, 92, 6, '#2c3540');
    hand((13 / 60) * Math.PI * 2, 98, 2.5, '#c0392b');
    gg.fillStyle = '#2c3540'; gg.beginPath(); gg.arc(128, 128, 7, 0, 7); gg.fill();
  }, { roughness: 0.4 });
  const f = label(0.29, 0.29, face, 0, cy, -0.048);
  f.material.transparent = true;
  g.add(f);
  return g;
});

def('tv_security', 'Security wall monitor', {
  footprint: [0.95, 0.12], height: 2.1, mount: 'wall', rooms: 'security office', gallery: { on: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const cy = 1.7;
  g.add(M(gBox(0.1, 0.3, 0.05), mat('metal_dark'), 0, cy, -0.028));
  g.add(M(gBox(0.94, 0.56, 0.05, 0.008), mat('plastic_black'), 0, cy, -0.065));
  const feeds = canvasTex('sec_feeds', 1024, 576, (g2, w, h) => {
    const r = rng(64);
    const names = ['CAM 01 — DOCK', 'CAM 02 — LOBBY', 'CAM 03 — SRV CORR', 'CAM 04 — GARAGE'];
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * (w / 2), y = Math.floor(i / 2) * (h / 2);
      const grad = g2.createLinearGradient(x, y, x, y + h / 2);
      grad.addColorStop(0, '#2c3e46'); grad.addColorStop(1, '#141c22');
      g2.fillStyle = grad; g2.fillRect(x, y, w / 2, h / 2);
      // abstract room shapes
      g2.fillStyle = 'rgba(160,190,200,0.16)';
      for (let b = 0; b < 7; b++) g2.fillRect(x + 30 + r() * 380, y + 90 + r() * 150, 30 + r() * 120, 20 + r() * 90);
      g2.strokeStyle = 'rgba(200,230,240,0.28)'; g2.lineWidth = 2;
      g2.strokeRect(x + 20, y + 60, w / 2 - 40, h / 2 - 80);
      // noise
      g2.fillStyle = 'rgba(255,255,255,0.05)';
      for (let n = 0; n < 250; n++) g2.fillRect(x + r() * (w / 2), y + r() * (h / 2), 2, 2);
      g2.fillStyle = '#c9e3d2'; g2.font = 'bold 20px monospace';
      g2.fillText(names[i], x + 22, y + 34);
      g2.fillStyle = '#e0554a'; g2.beginPath(); g2.arc(x + w / 2 - 34, y + 26, 7, 0, 7); g2.fill();
      g2.fillStyle = '#9db4c8'; g2.font = '16px monospace';
      g2.fillText('07:42:1' + i, x + w / 2 - 130, y + h / 2 - 18);
    }
    g2.strokeStyle = '#000'; g2.lineWidth = 6;
    g2.strokeRect(0, 0, w, h); g2.beginPath(); g2.moveTo(w / 2, 0); g2.lineTo(w / 2, h); g2.moveTo(0, h / 2); g2.lineTo(w, h / 2); g2.stroke();
  });
  const scrMat = (opts.on ?? true)
    ? new THREE.MeshStandardMaterial({ map: feeds, roughness: 0.3, emissive: 0xffffff, emissiveMap: feeds, emissiveIntensity: 0.8 })
    : mat('screen_off');
  g.add(label(0.9, 0.52, scrMat, 0, cy, -0.092));
  return g;
});

def('server_rack', 'Server rack', {
  footprint: [0.6, 1.0], height: 2.0, rooms: 'server room', gallery: { ledsOn: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 0.6, d = 1.0, h = 2.0;
  const on = opts.ledsOn ?? true;
  g.add(M(gBox(w, h - 0.06, d, 0.01), mat('server_dark'), 0, (h - 0.06) / 2 + 0.05, 0));
  g.add(M(gBox(w - 0.08, 0.05, d - 0.08), mat('metal_dark'), 0, 0.028, 0));
  // perforated front door with rack units glowing through
  const doorTex = canvasTex('rack_door_' + (on ? 'on' : 'off'), 256, 768, (gg, cw, ch) => {
    gg.fillStyle = '#191b1f'; gg.fillRect(0, 0, cw, ch);
    const r = rng(4);
    // unit rows behind perforation
    for (let u = 0; u < 17; u++) {
      const y = 20 + u * 43;
      gg.fillStyle = u % 4 === 3 ? '#0e0f11' : '#232529';
      gg.fillRect(14, y, cw - 28, 36);
      if (on && u % 4 !== 3) {
        for (let l = 0; l < 6; l++) {
          const lit = r();
          gg.fillStyle = lit > 0.72 ? '#3dff7a' : lit > 0.6 ? '#ffb03a' : lit > 0.55 ? '#ff4433' : '#15181c';
          gg.fillRect(26 + l * 13, y + 8, 6, 6);
        }
        gg.fillStyle = '#3a6a8a'; gg.fillRect(120, y + 8, 60 + r() * 40, 5);
        gg.fillStyle = '#2a2d33'; gg.fillRect(120, y + 20, 90, 8);
      }
    }
    // perforation dots overlay
    gg.fillStyle = 'rgba(8,9,11,0.75)';
    for (let py = 6; py < ch; py += 8) for (let px = 6 + (py % 16 ? 4 : 0); px < cw; px += 8) {
      gg.fillRect(px, py, 5, 5);
    }
    gg.strokeStyle = '#3a3d43'; gg.lineWidth = 8; gg.strokeRect(2, 2, cw - 4, ch - 4);
  });
  const doorMat = new THREE.MeshStandardMaterial({
    map: doorTex, roughness: 0.5, metalness: 0.4,
    emissive: on ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
    emissiveMap: on ? doorTex : null, emissiveIntensity: 0.55,
  });
  g.add(label(w - 0.06, h - 0.18, doorMat, 0, h / 2 + 0.02, -d / 2 - 0.002));
  g.add(M(gBox(0.016, 0.14, 0.016), mat('metal_brushed'), w / 2 - 0.06, h / 2, -d / 2 - 0.012));
  // brand tag + top vents
  g.add(label(0.16, 0.05, texMat('rack_tag', 128, 40, (gg) => {
    gg.fillStyle = '#14365c'; gg.fillRect(0, 0, 128, 40);
    drawStar(gg, 22, 20, 13);
    gg.fillStyle = '#e8f0f8'; gg.font = 'bold 15px Arial'; gg.fillText('NLG SRV', 44, 26);
  }), 0, h - 0.1, -d / 2 - 0.004));
  g.add(M(gBox(w - 0.1, 0.02, d - 0.2), mat('metal_dark'), 0, h - 0.02, 0));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('ups_unit', 'UPS battery unit', {
  footprint: [0.26, 0.5], height: 0.36, rooms: 'server room, IT',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.24, 0.34, 0.48, 0.012), mat('plastic_black'), 0, 0.18, 0));
  const face = texMat('ups_face', 128, 192, (gg) => {
    gg.fillStyle = '#1c1e22'; gg.fillRect(0, 0, 128, 192);
    gg.fillStyle = '#26e07a'; gg.fillRect(30, 24, 68, 28);
    gg.fillStyle = '#0c2a14'; gg.font = 'bold 16px monospace'; gg.fillText('100%', 44, 44);
    for (let i = 0; i < 3; i++) { gg.fillStyle = '#3a3d43'; gg.beginPath(); gg.arc(40 + i * 24, 80, 7, 0, 7); gg.fill(); }
    gg.fillStyle = '#2a2d33';
    for (let i = 0; i < 8; i++) gg.fillRect(20, 104 + i * 10, 88, 4);
  }, { emissive: true, emissiveIntensity: 0.4, roughness: 0.5 });
  g.add(label(0.2, 0.3, face, 0, 0.18, -0.242));
  setCol(g, col(0, 0, 0.26, 0.5, 0.36));
  return g;
});

def('cable_tray', 'Cable tray segment (1 m)', {
  footprint: [1.0, 0.24], height: 2.62, mount: 'ceiling', rooms: 'server room, service corridor',
}, (opts = {}) => {
  const g = new THREE.Group();
  const y = opts.y ?? 2.5;
  for (const s of [-1, 1]) g.add(M(gBox(1.0, 0.07, 0.02), mat('metal_brushed'), 0, y, s * 0.1));
  for (let i = 0; i < 5; i++) g.add(M(gBox(0.04, 0.014, 0.2), mat('metal_brushed'), -0.44 + i * 0.22, y - 0.026, 0));
  // cables riding in the tray
  const colors = [0x2c2e33, 0x44607a, 0xb0672a, 0x2c2e33];
  colors.forEach((c, i) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
    g.add(M(gCyl(0.012, 0.012, 1.0, 6), m, -0.055 + i * 0.037, y - 0.005 + (i % 2) * 0.02, 0, { rz: Math.PI / 2 }));
  });
  // drop rods
  for (const s of [-1, 1]) g.add(M(gCyl(0.006, 0.006, 0.12, 6), mat('metal_brushed'), s * 0.4, y + 0.093, 0));
  return g;
});

def('cable_bundle', 'Floor cable bundle', {
  footprint: [1.1, 0.5], height: 0.05, rooms: 'under desks, server room',
}, (opts = {}) => {
  const g = new THREE.Group();
  const r = rng(opts.seed ?? 15);
  const mk = (pts, rad, color) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, rad, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  g.add(mk([[-0.55, 0.014, 0.05], [-0.25, 0.014, -0.12], [0.1, 0.014, 0.1], [0.35, 0.014, -0.05], [0.55, 0.014, 0.08]], 0.014, 0x232527));
  g.add(mk([[-0.52, 0.008, 0.1], [-0.2, 0.008, 0.02], [0.15, 0.008, 0.16], [0.5, 0.008, 0.12]], 0.008, 0x44607a));
  g.add(mk([[-0.5, 0.008, -0.02], [-0.1, 0.008, -0.18], [0.3, 0.008, -0.12], [0.52, 0.008, 0.02]], 0.008, 0x6b6f2e));
  // gaffer tape patches
  for (let i = 0; i < 2; i++) {
    g.add(M(gBox(0.12, 0.006, 0.16), mat('rubber'), -0.25 + i * 0.55, 0.004, -0.02 + i * 0.08, { ry: r() * 0.5 }));
  }
  return g;
});
