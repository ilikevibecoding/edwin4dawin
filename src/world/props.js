import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  concreteMaterial, metalMaterial, woodMaterial, sandbagMaterial,
  corrugatedMaterial, flatMaterial, charredMaterial,
  awningMaterial, contactShadowMaterial, cardboardMaterial,
} from './materials.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Prop library. Every builder returns a Group; caller positions it and
// registers collision boxes. Props aim for silhouette-first realism:
// good proportions + PBR materials + grime beats poly count.
// ===========================================================================

const rng = makeRNG(31415);

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Soft dark ellipse decal that glues a prop to the ground. w/d = footprint in
// meters (the blob renders slightly larger); parented to the prop group so it
// follows placement rotation.
export function contactShadow(w, d, opacity = 0.42, x = 0, z = 0) {
  const base = contactShadowMaterial();
  let mat = base;
  if (Math.abs(opacity - base.opacity) > 0.001) {
    mat = base.clone(); // clone shares the canvas texture
    mat.opacity = opacity;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.35, d * 1.35), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.06, z);
  m.renderOrder = 6;
  m.userData.isContactShadow = true;
  return m;
}

// --- Jersey barrier (concrete highway divider) ------------------------------
export function jerseyBarrier() {
  const g = new THREE.Group();
  const mat = concreteMaterial(31, 0.82);
  const shape = new THREE.Shape();
  shape.moveTo(-0.35, 0); shape.lineTo(0.35, 0);
  shape.lineTo(0.24, 0.28); shape.lineTo(0.12, 0.82);
  shape.lineTo(-0.12, 0.82); shape.lineTo(-0.24, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.0, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  geo.translate(0, 0, -1.0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.add(contactShadow(0.8, 2.1, 0.38));
  g.userData.collider = { w: 0.7, h: 0.85, d: 2.05 };
  return g;
}

// --- Sandbag emplacement ------------------------------------------------------
// All bags baked into a single merged mesh (one draw call per wall).
export function sandbagWall(rows = 3, cols = 4) {
  const g = new THREE.Group();
  const mat = sandbagMaterial();
  const bagGeo = new THREE.SphereGeometry(0.5, 10, 8);
  bagGeo.scale(0.62, 0.28, 0.4);
  const r = makeRNG(rows * 100 + cols);
  const parts = [];
  for (let y = 0; y < rows; y++) {
    const n = cols - (y % 2 === 1 ? 0 : 0);
    for (let x = 0; x < n; x++) {
      const jx = r.range(-0.03, 0.03);
      const jz = r.range(-0.05, 0.05);
      const ry = r.range(-0.25, 0.25);
      const rz = r.range(-0.08, 0.08);
      const geo = bagGeo.clone();
      geo.rotateZ(rz);
      geo.rotateY(ry);
      geo.translate((x - (n - 1) / 2) * 0.58 + (y % 2) * 0.28 + jx, 0.14 + y * 0.24, jz);
      parts.push(geo);
    }
  }
  const m = new THREE.Mesh(mergeGeometries(parts), mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.add(contactShadow(cols * 0.58 + 0.3, 0.75, 0.4));
  g.userData.collider = { w: cols * 0.58 + 0.3, h: rows * 0.24 + 0.18, d: 0.55 };
  return g;
}

// --- Oil barrel -----------------------------------------------------------------
export function barrel(color = 0x5a6b46) {
  const g = new THREE.Group();
  const mat = metalMaterial(color, 61 + color % 97);
  const b = cyl(0.3, 0.3, 0.9, mat, 0, 0.45, 0, 16);
  g.add(b);
  for (const y of [0.18, 0.45, 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.012, 6, 20), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    g.add(ring);
  }
  g.add(contactShadow(0.68, 0.68, 0.4));
  g.userData.collider = { w: 0.62, h: 0.92, d: 0.62 };
  return g;
}

// --- Ammo / supply crate ---------------------------------------------------------
export function crate(size = 0.75) {
  const g = new THREE.Group();
  const mat = woodMaterial();
  const c = box(size, size * 0.72, size, mat, 0, size * 0.36, 0);
  g.add(c);
  const edge = flatMaterial(0x4a3a26, 0.9);
  const t = 0.035;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(box(t * 2, size * 0.74, t * 2, edge, x * (size / 2 - t), size * 0.36, z * (size / 2 - t)));
  }
  g.add(contactShadow(size, size, 0.4));
  g.userData.collider = { w: size + 0.02, h: size * 0.74, d: size + 0.02 };
  return g;
}

// --- Stacked market crates (shopfront clutter) ----------------------------------
export function stackedCrates(seed = 7) {
  const g = new THREE.Group();
  const r = makeRNG(seed * 137);
  const n = r.int(2, 3);
  let y = 0;
  const s0 = r.range(0.62, 0.8);
  for (let i = 0; i < n; i++) {
    const s = s0 * (1 - i * 0.12);
    const c = crate(s);
    c.position.set(i === 0 ? 0 : r.range(-0.08, 0.08), y, i === 0 ? 0 : r.range(-0.08, 0.08));
    c.rotation.y = r.range(-0.3, 0.3);
    // only the bottom crate keeps its blob shadow
    if (i > 0) c.children.forEach((ch) => { if (ch.userData.isContactShadow) ch.visible = false; });
    g.add(c);
    y += s * 0.72;
  }
  const side = crate(s0 * 0.7);
  side.position.set(r.range(0.55, 0.75) * (r.chance(0.5) ? 1 : -1), 0, r.range(-0.2, 0.2));
  side.rotation.y = r.range(0, 1.2);
  g.add(side);
  g.userData.collider = { w: s0 + 0.9, h: y + 0.1, d: s0 + 0.5 };
  return g;
}

// ===========================================================================
// VEHICLES — panel-built cars with real wheel-well cavities, inset reflective
// glass, chrome trim and a per-hue paint atlas (albedo + roughness canvases)
// that bakes door seams, handles, fuel cap, sun fade and a rocker dirt
// gradient. Three silhouettes (sedan / wagon / pickup) share one builder.
// Each car stays under ~60 primitives merged into ~10 draw calls.
// ===========================================================================

const vehCache = new Map();
function vCached(key, build) {
  if (!vehCache.has(key)) vehCache.set(key, build());
  return vehCache.get(key);
}

function vehCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function vehTex(canvas, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// --- shared vehicle materials (scene.environment supplies reflections) ------
// Tinted glass with a baked diagonal sky streak: env reflections alone are too
// weak under the soft PMREM sky, and glass must read as glass from every angle.
const vGlassMat = () => vCached('vglass', () => {
  const [c, ctx] = vehCanvas(128, 64);
  let g = ctx.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, '#11161c'); g.addColorStop(0.55, '#1c242e'); g.addColorStop(1, '#2c3a47');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 64);
  const streak = (x0, w, a) => {
    ctx.save();
    ctx.translate(x0, 32); ctx.rotate(-0.42);
    const sg = ctx.createLinearGradient(-w, 0, w, 0);
    sg.addColorStop(0, 'rgba(190,210,225,0)');
    sg.addColorStop(0.5, `rgba(196,216,230,${a})`);
    sg.addColorStop(1, 'rgba(190,210,225,0)');
    ctx.fillStyle = sg; ctx.fillRect(-w, -70, w * 2, 140);
    ctx.restore();
  };
  streak(42, 13, 0.34);
  streak(74, 6, 0.22);
  return new THREE.MeshStandardMaterial({
    map: vehTex(c), roughness: 0.09, metalness: 0.0, envMapIntensity: 2.2,
  });
});
const vTireMat = () => vCached('vtire', () => new THREE.MeshStandardMaterial({
  color: 0x161514, roughness: 0.94, envMapIntensity: 0.18,
}));
const vDarkMat = () => vCached('vdark', () => new THREE.MeshStandardMaterial({
  color: 0x0d0c0b, roughness: 0.92, envMapIntensity: 0.12,
}));
const vChromeMat = () => vCached('vchrome', () => new THREE.MeshStandardMaterial({
  color: 0xd9dde0, roughness: 0.26, metalness: 1.0, envMapIntensity: 1.5,
}));
const vBurnMetalMat = () => vCached('vburnmetal', () => new THREE.MeshStandardMaterial({
  color: 0x27221f, roughness: 0.68, metalness: 0.4, envMapIntensity: 0.5,
}));
const vHeadLensMat = () => vCached('vheadlens', () => new THREE.MeshStandardMaterial({
  color: 0xc4cccd, roughness: 0.1, metalness: 0.0, envMapIntensity: 2.4,
}));
const vTailLensMat = () => vCached('vtaillens', () => new THREE.MeshStandardMaterial({
  color: 0x7c241b, roughness: 0.14, metalness: 0.0, envMapIntensity: 1.7,
}));
const vRimBurnedMat = () => vCached('vrimburn', () => new THREE.MeshStandardMaterial({
  color: 0x282422, roughness: 0.8, metalness: 0.35, envMapIntensity: 0.4,
}));

// Steel wheel + hubcap face baked on the rim disc caps.
function vRimMat() {
  return vCached('vrim', () => {
    const [c, ctx] = vehCanvas(64, 64);
    ctx.fillStyle = '#33363a'; ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#aab0b5'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(32, 32, 25, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#9aa0a5'; ctx.lineWidth = 9;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(a) * 7, 32 + Math.sin(a) * 7);
      ctx.lineTo(32 + Math.cos(a) * 23, 32 + Math.sin(a) * 23);
      ctx.stroke();
    }
    ctx.fillStyle = '#c6cacd';
    ctx.beginPath(); ctx.arc(32, 32, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3d40';
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + 0.4;
      ctx.beginPath(); ctx.arc(32 + Math.cos(a) * 10, 32 + Math.sin(a) * 10, 1.9, 0, 7); ctx.fill();
    }
    return new THREE.MeshStandardMaterial({
      map: vehTex(c), roughness: 0.35, metalness: 0.7, envMapIntensity: 1.25,
    });
  });
}

function vPlateMat() {
  return vCached('vplate', () => {
    const [c, ctx] = vehCanvas(96, 48);
    const rr = makeRNG(4242);
    ctx.fillStyle = '#c9c2ad'; ctx.fillRect(0, 0, 96, 48);
    ctx.strokeStyle = '#3a372f'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 92, 44);
    ctx.fillStyle = '#2e2b25';
    let x = 10;
    for (let i = 0; i < 6; i++) { ctx.fillRect(x, 13 + rr() * 6, 7, 19); x += 12 + rr() * 2; }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(140,128,105,${0.1 + rr() * 0.25})`;
      ctx.fillRect(rr() * 96, rr() * 48, 2 + rr() * 4, 1 + rr() * 3);
    }
    return new THREE.MeshStandardMaterial({
      map: vehTex(c), roughness: 0.55, metalness: 0.1, envMapIntensity: 0.8,
    });
  });
}

// --- body-style dimension sheets (front of car = +z) -------------------------
const CAR_STYLES = {
  sedan: {
    key: 'sedan', L: 4.42, W: 1.76,
    sideY0: 0.30, sideY1: 0.86,
    skirtY: [0.30, 0.615], slabY: [0.62, 0.86],
    wheelZ: [1.38, -1.34], archHW: 0.48,
    tireR: 0.32, tireW: 0.24, axleY: 0.31, wheelX: 0.73,
    hood: { z0: 0.67, z1: 2.06, y0: 0.872, tilt: 0.02, w: 1.64 },
    cowl: { z0: 0.52, z1: 0.662, w: 1.60, y0: 0.862 },
    trunk: { z0: -2.12, z1: -1.48, y0: 0.862, w: 1.64 },
    ws: { zB: 0.58, zT: 0.20, yB: 0.875, yT: 1.335, wB: 0.72, wT: 0.70 },
    rw: { zB: -1.50, zT: -1.12, yB: 0.875, yT: 1.335, wB: 0.70, wT: 0.66 },
    roof: { z0: -1.12, z1: 0.20, w: 1.44, y: 1.33 },
    glassX: 0.715, glassYB: 0.87, glassYT: 1.34,
    aPillarX: 0.71, cPillarX: 0.70,
    bPillarZ: [-0.02],
    sideGlass: { zFB: 0.54, zFT: 0.22, zRT: -1.10, zRB: -1.44 },
    doorCuts: [0.88, -0.02, -0.88], handles: [0.10, -0.74], fuelZ: -1.62,
    mirrorZ: 0.50, antennaZ: 1.92, rails: false, bed: null,
  },
  wagon: {
    key: 'wagon', L: 4.42, W: 1.76,
    sideY0: 0.30, sideY1: 0.86,
    skirtY: [0.30, 0.615], slabY: [0.62, 0.86],
    wheelZ: [1.38, -1.34], archHW: 0.48,
    tireR: 0.32, tireW: 0.24, axleY: 0.31, wheelX: 0.73,
    hood: { z0: 0.67, z1: 2.06, y0: 0.872, tilt: 0.02, w: 1.64 },
    cowl: { z0: 0.52, z1: 0.662, w: 1.60, y0: 0.862 },
    trunk: { z0: -2.12, z1: -1.86, y0: 0.862, w: 1.64 },
    ws: { zB: 0.58, zT: 0.20, yB: 0.875, yT: 1.325, wB: 0.72, wT: 0.70 },
    rw: { zB: -1.98, zT: -1.70, yB: 0.875, yT: 1.315, wB: 0.70, wT: 0.64 },
    roof: { z0: -1.70, z1: 0.20, w: 1.44, y: 1.315 },
    glassX: 0.715, glassYB: 0.87, glassYT: 1.325,
    aPillarX: 0.71, cPillarX: 0.70,
    bPillarZ: [-0.02, -0.88],
    sideGlass: { zFB: 0.54, zFT: 0.22, zRT: -1.68, zRB: -1.92 },
    doorCuts: [0.88, -0.02, -0.88], handles: [0.10, -0.74], fuelZ: -1.70,
    mirrorZ: 0.50, antennaZ: 1.92, rails: true, bed: null,
  },
  pickup: {
    key: 'pickup', L: 4.62, W: 1.82,
    sideY0: 0.34, sideY1: 0.92,
    skirtY: [0.34, 0.675], slabY: [0.68, 0.92],
    wheelZ: [1.50, -1.42], archHW: 0.52,
    tireR: 0.35, tireW: 0.26, axleY: 0.34, wheelX: 0.75,
    hood: { z0: 0.90, z1: 2.20, y0: 0.932, tilt: 0.02, w: 1.70 },
    cowl: { z0: 0.76, z1: 0.892, w: 1.66, y0: 0.922 },
    trunk: null,
    ws: { zB: 0.82, zT: 0.46, yB: 0.935, yT: 1.42, wB: 0.75, wT: 0.72 },
    rw: null,
    roof: { z0: -0.46, z1: 0.46, w: 1.52, y: 1.415 },
    glassX: 0.745, glassYB: 0.93, glassYT: 1.425,
    aPillarX: 0.74, cPillarX: null,
    bPillarZ: [-0.50],
    sideGlass: { zFB: 0.78, zFT: 0.48, zRT: -0.48, zRB: -0.48 },
    doorCuts: [0.94, -0.10], handles: [0.02], fuelZ: -0.98,
    mirrorZ: 0.74, antennaZ: 2.02, rails: false,
    bed: { z0: -2.20, z1: -0.64, railW: 0.16, railTop: 1.03 },
    cabWall: { z: -0.56, y0: 0.93, y1: 1.40, w: 1.56 },
    cabRW: { w: 0.55, y0: 1.02, y1: 1.30, z: -0.52 },
  },
};

function styleFor(hue) {
  if (hue === 0xa09b90) return CAR_STYLES.pickup;
  if (hue === 0x8e968f) return CAR_STYLES.wagon;
  return CAR_STYLES.sedan;
}

// --- paint atlas UV plumbing -------------------------------------------------
// Atlas layout: SIDE elevation in the top half (v .5-1), sun-faded TOP paint
// bottom-left, PLAIN paint bottom-right, near-black DARK swatch for faces
// that look into wheel arches / under the car.
const V_PLAIN = (y) => 0.245 + Math.max(0, Math.min(1, (y - 0.15) / 1.35)) * 0.23;

function vRects(S) {
  const sv = (y) => 0.5 + 0.5 * Math.max(0, Math.min(1, (y - S.sideY0) / (S.sideY1 - S.sideY0)));
  return {
    side: (z0, z1, y0, y1) => [(S.L / 2 - z1) / S.L, sv(y0), (S.L / 2 - z0) / S.L, sv(y1)],
    top: [0.015, 0.25, 0.485, 0.47],
    plain: (y0, y1) => [0.53, V_PLAIN(y0), 0.97, V_PLAIN(y1)],
    dark: [0.958, 0.03, 0.992, 0.085],
  };
}

// Remap one box face (0..5 = px,nx,py,ny,pz,nz) into an atlas sub-rect.
function mapFace(geo, face, rect, flipU = false) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < 4; i++) {
    const idx = face * 4 + i;
    let u = uv.getX(idx);
    const v = uv.getY(idx);
    if (flipU) u = 1 - u;
    uv.setXY(idx, rect[0] + u * (rect[2] - rect[0]), rect[1] + v * (rect[3] - rect[1]));
  }
}

// Box with atlas-mapped faces. spec values: 'side' | 'top' | 'plain' | 'dark'.
function vBox(S, w, h, d, x, y, z, spec = {}, rotX = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const R = vRects(S);
  const y0 = y - h / 2, y1 = y + h / 2, z0 = z - d / 2, z1 = z + d / 2;
  const rectFor = (kind) =>
    kind === 'side' ? R.side(z0, z1, y0, y1)
      : kind === 'top' ? R.top
        : kind === 'dark' ? R.dark
          : R.plain(y0, y1);
  ['px', 'nx', 'py', 'ny', 'pz', 'nz'].forEach((f, i) => {
    const kind = spec[f] ?? 'plain';
    mapFace(geo, i, rectFor(kind), f === 'nx' && kind === 'side');
  });
  if (rotX) geo.rotateX(rotX);
  geo.translate(x, y, z);
  return geo;
}

// Raked pillar between two (z, y) points at a fixed x.
function vPillar(S, w, d, x, z0, y0, z1, y1) {
  const len = Math.hypot(z1 - z0, y1 - y0) + 0.06;
  const geo = new THREE.BoxGeometry(w, len, d);
  const rect = vRects(S).plain(Math.min(y0, y1), Math.max(y0, y1));
  for (let f = 0; f < 6; f++) mapFace(geo, f, rect);
  geo.rotateX(Math.atan2(z1 - z0, y1 - y0));
  geo.translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
  return geo;
}

// Single quad (two triangles), corners given CCW from outside, a = bottom-left.
function quadGeo(a, b, c, d) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]);
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

// --- per-hue paint atlas: albedo + roughness canvases ------------------------
function carPaintAtlasMaterial(hue, S) {
  return vCached(`vpaint_${hue}_${S.key}`, () => {
    const W = 1024, H = 512, SIDE_H = 256;
    const col = new THREE.Color(hue);
    const rr = makeRNG((hue & 0xffffff) + 137);
    const [ac, a] = vehCanvas(W, H);
    const [rc, ro] = vehCanvas(W, H);
    const css = (c, al = 1) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${al})`;
    const X = (z) => (S.L / 2 - z) / S.L * W;
    const Y = (y) => (S.sideY1 - y) / (S.sideY1 - S.sideY0) * SIDE_H;

    // base fill guards region bleed at low mips
    a.fillStyle = css(col); a.fillRect(0, 0, W, H);
    ro.fillStyle = 'rgb(95,95,95)'; ro.fillRect(0, 0, W, H);

    // ---- SIDE elevation (rows 0..256) -------------------------------------
    const cTop = col.clone().lerp(new THREE.Color(0xd8d2c2), 0.13);
    const cLow = col.clone().multiplyScalar(0.88);
    let g = a.createLinearGradient(0, 0, 0, SIDE_H);
    g.addColorStop(0, css(cTop)); g.addColorStop(0.42, css(col)); g.addColorStop(1, css(cLow));
    a.fillStyle = g; a.fillRect(0, 0, W, SIDE_H);
    // soft vertical tone washes so long panels never read flat
    for (let i = 0; i < 30; i++) {
      a.fillStyle = `rgba(${rr() < 0.5 ? '30,26,22' : '235,228,214'},${0.02 + rr() * 0.045})`;
      a.fillRect(rr() * W, 0, 3 + rr() * 14, SIDE_H);
    }
    // belt crease: highlight over shadow
    a.fillStyle = 'rgba(255,250,240,0.13)';
    a.fillRect(0, Y(S.sideY1 - 0.065) - 2, W, 2);
    a.fillStyle = 'rgba(15,13,11,0.18)';
    a.fillRect(0, Y(S.sideY1 - 0.065), W, 2.5);
    // wheel-arch lip shadow on the fender band (openings are real geometry)
    const axRow = Y(S.axleY < S.sideY0 ? S.sideY0 : S.axleY);
    const openRow = Y(S.slabY[0]);
    a.save(); a.beginPath(); a.rect(0, 0, W, openRow + 2); a.clip();
    for (const wz of S.wheelZ) {
      const rx = (S.archHW + 0.02) / S.L * W;
      const ry = axRow - openRow + 44;
      a.strokeStyle = 'rgba(15,13,11,0.42)'; a.lineWidth = 11;
      a.beginPath(); a.ellipse(X(wz), axRow, rx, ry, 0, 0, 7); a.stroke();
      a.strokeStyle = 'rgba(15,13,11,0.18)'; a.lineWidth = 24;
      a.beginPath(); a.ellipse(X(wz), axRow, rx * 1.05, ry * 1.06, 0, 0, 7); a.stroke();
    }
    a.restore();
    // panel cut lines (doors + fender/quarter seams) with edge highlight
    const cutBot = Y(S.sideY0 + 0.045);
    for (const dz of S.doorCuts) {
      const x = X(dz);
      a.strokeStyle = 'rgba(18,15,12,0.55)'; a.lineWidth = 2.6;
      a.beginPath(); a.moveTo(x, 2); a.lineTo(x, cutBot); a.stroke();
      a.strokeStyle = 'rgba(255,252,244,0.10)'; a.lineWidth = 1.4;
      a.beginPath(); a.moveTo(x + 2.2, 4); a.lineTo(x + 2.2, cutBot); a.stroke();
      ro.strokeStyle = 'rgb(150,150,150)'; ro.lineWidth = 2.6;
      ro.beginPath(); ro.moveTo(x, 2); ro.lineTo(x, cutBot); ro.stroke();
    }
    // handle recesses (chrome handle geometry sits right on top of these)
    for (const hz of S.handles) {
      const x = X(hz), y = Y(S.sideY1 - 0.075);
      a.fillStyle = 'rgba(18,15,12,0.42)'; a.fillRect(x - 16, y - 2, 32, 10);
      a.fillStyle = 'rgba(12,10,8,0.5)'; a.fillRect(x - 13, y, 26, 5);
      ro.fillStyle = 'rgb(140,140,140)'; ro.fillRect(x - 16, y - 2, 32, 10);
    }
    // fuel filler door
    {
      const x = X(S.fuelZ), y = Y(S.sideY1 - 0.14);
      a.strokeStyle = 'rgba(18,15,12,0.45)'; a.lineWidth = 1.8;
      a.beginPath(); a.arc(x, y, 10, 0, 7); a.stroke();
      a.fillStyle = 'rgba(18,15,12,0.5)'; a.fillRect(x + 5, y - 1.5, 4, 3);
    }
    // rocker dirt gradient + dust speckle (lower panels dustier)
    g = a.createLinearGradient(0, Y(S.sideY0 + 0.24), 0, SIDE_H);
    g.addColorStop(0, 'rgba(186,168,138,0)');
    g.addColorStop(1, 'rgba(186,168,138,0.5)');
    a.fillStyle = g; a.fillRect(0, 0, W, SIDE_H);
    let gr = ro.createLinearGradient(0, Y(S.sideY0 + 0.24), 0, SIDE_H);
    gr.addColorStop(0, 'rgba(205,205,205,0)');
    gr.addColorStop(1, 'rgba(205,205,205,0.85)');
    ro.fillStyle = gr; ro.fillRect(0, 0, W, SIDE_H);
    for (let i = 0; i < 130; i++) {
      const x = rr() * W, y = SIDE_H - Math.pow(rr(), 1.7) * 130;
      a.fillStyle = `rgba(196,180,150,${0.05 + rr() * 0.14})`;
      a.fillRect(x, y, 2 + rr() * 5, 1 + rr() * 3);
    }
    // grime streaks bleeding down from handles and arches
    for (const sxz of [...S.handles, S.wheelZ[0] - S.archHW - 0.1, S.wheelZ[1] + S.archHW + 0.1]) {
      const x = X(sxz) + rr() * 8 - 4;
      a.fillStyle = `rgba(60,52,42,${0.10 + rr() * 0.08})`;
      a.fillRect(x, Y(S.sideY1 - 0.1), 2 + rr() * 2.5, 40 + rr() * 120);
    }
    // stone chips: dark pits + rare pale primer scuffs
    for (let i = 0; i < 20; i++) {
      const x = rr() * W, y = SIDE_H - Math.pow(rr(), 1.5) * 240;
      a.fillStyle = rr() < 0.62 ? 'rgba(52,48,42,0.7)' : 'rgba(205,198,184,0.5)';
      a.fillRect(x, y, 1.6 + rr() * 2.6, 1.2 + rr() * 2);
      ro.fillStyle = 'rgb(140,140,140)';
      ro.fillRect(x, y, 2 + rr() * 2.6, 1.5 + rr() * 2);
    }

    // ---- TOP region (sun-faded horizontal paint), cols 0..512 --------------
    const topY0 = (1 - 0.47) * H, topY1 = (1 - 0.25) * H;
    const cFade = col.clone().lerp(new THREE.Color(0xded8c6), 0.17);
    a.fillStyle = css(cFade); a.fillRect(0, topY0, W * 0.5, topY1 - topY0);
    ro.fillStyle = 'rgb(100,100,100)'; ro.fillRect(0, topY0, W * 0.5, topY1 - topY0);
    for (let i = 0; i < 14; i++) { // dust blotches
      const x = rr() * W * 0.5, y = topY0 + rr() * (topY1 - topY0);
      a.fillStyle = `rgba(202,188,158,${0.05 + rr() * 0.1})`;
      a.beginPath(); a.ellipse(x, y, 14 + rr() * 40, 6 + rr() * 16, rr() * 3, 0, 7); a.fill();
      ro.fillStyle = `rgba(165,165,165,${0.3 + rr() * 0.3})`;
      ro.beginPath(); ro.ellipse(x, y, 14 + rr() * 40, 6 + rr() * 16, rr() * 3, 0, 7); ro.fill();
    }
    // gutter seams hugging panel edges
    a.strokeStyle = 'rgba(20,17,14,0.4)'; a.lineWidth = 3;
    a.strokeRect(5, topY0 + 3, W * 0.5 - 10, topY1 - topY0 - 6);
    ro.strokeStyle = 'rgb(145,145,145)'; ro.lineWidth = 3;
    ro.strokeRect(5, topY0 + 3, W * 0.5 - 10, topY1 - topY0 - 6);

    // ---- PLAIN region (fascias, pillars), cols 532..1004 --------------------
    const plY0 = topY0, plY1 = topY1;
    a.fillStyle = css(col.clone().multiplyScalar(0.97));
    a.fillRect(W * 0.51, plY0, W * 0.48, plY1 - plY0);
    ro.fillStyle = 'rgb(100,100,100)';
    ro.fillRect(W * 0.51, plY0, W * 0.48, plY1 - plY0);
    g = a.createLinearGradient(0, plY0 + (plY1 - plY0) * 0.55, 0, plY1);
    g.addColorStop(0, 'rgba(186,168,138,0)'); g.addColorStop(1, 'rgba(186,168,138,0.42)');
    a.fillStyle = g; a.fillRect(W * 0.51, plY0, W * 0.48, plY1 - plY0);
    gr = ro.createLinearGradient(0, plY0 + (plY1 - plY0) * 0.55, 0, plY1);
    gr.addColorStop(0, 'rgba(200,200,200,0)'); gr.addColorStop(1, 'rgba(200,200,200,0.7)');
    ro.fillStyle = gr; ro.fillRect(W * 0.51, plY0, W * 0.48, plY1 - plY0);

    // ---- DARK swatch --------------------------------------------------------
    a.fillStyle = 'rgb(13,12,11)';
    a.fillRect(W * 0.952, (1 - 0.09) * H - 4, W * 0.046, 0.062 * H + 8);
    ro.fillStyle = 'rgb(238,238,238)';
    ro.fillRect(W * 0.952, (1 - 0.09) * H - 4, W * 0.046, 0.062 * H + 8);

    return new THREE.MeshStandardMaterial({
      map: vehTex(ac, true),
      roughnessMap: vehTex(rc, false),
      roughness: 1.0, metalness: 0.22, envMapIntensity: 1.25,
    });
  });
}

// --- Wrecked / abandoned car -------------------------------------------------
// Same exported signature as always: map.js calls wreckedCar(burned, hue).
// Style (sedan / wagon / pickup) derives from the hue; per-instance stance,
// steering and flat tires come from the module RNG so clones still differ.
export function wreckedCar(burned = true, hue = 0x6b7a8c) {
  const g = new THREE.Group();
  const S = styleFor(hue);
  const jLean = rng.range(-1, 1), jPitch = rng.range(-1, 1);
  const jSteer = rng.range(-1, 1), jFlat = rng(), jSpare = rng();

  const bodyMat = burned ? charredMaterial() : carPaintAtlasMaterial(hue, S);
  const trimMat = burned ? vBurnMetalMat() : vChromeMat();
  const [skY0, skY1] = S.skirtY;
  const [slY0, slY1] = S.slabY;
  const [zf, zr] = S.wheelZ;
  const paint = [], dark = [], glass = [], tires = [], rims = [], chrome = [], heads = [], tails = [], plates = [];

  // --- fender band (full-length slab) + rocker skirts between the arches ----
  paint.push(vBox(S, S.W, slY1 - slY0, S.L, 0, (slY0 + slY1) / 2, 0,
    { px: 'side', nx: 'side', py: 'top', ny: 'dark', pz: 'plain', nz: 'plain' }));
  const skirts = [
    [zf + S.archHW, S.L / 2, 'plain', 'dark'],
    [zr + S.archHW, zf - S.archHW, 'dark', 'dark'],
    [-S.L / 2, zr - S.archHW, 'dark', 'plain'],
  ];
  for (const [z0, z1, pzKind, nzKind] of skirts) {
    paint.push(vBox(S, S.W - 0.02, skY1 - skY0, z1 - z0, 0, (skY0 + skY1) / 2, (z0 + z1) / 2,
      { px: 'side', nx: 'side', py: 'dark', ny: 'dark', pz: pzKind, nz: nzKind }));
  }
  // sealed dark underbody so daylight never leaks below the cabin
  dark.push(new THREE.BoxGeometry(S.W - 0.5, 0.05, S.L - 1.3).translate(0, skY0 - 0.02, 0));

  // --- hood / cowl / trunk lid as separate floating panels (real shut gaps) --
  const hd = S.hood;
  paint.push(vBox(S, hd.w, 0.035, hd.z1 - hd.z0, 0, hd.y0 + 0.0175, (hd.z0 + hd.z1) / 2,
    { py: 'top' }, burned ? -0.085 : hd.tilt));
  paint.push(vBox(S, S.cowl.w, 0.03, S.cowl.z1 - S.cowl.z0, 0, S.cowl.y0 + 0.015, (S.cowl.z0 + S.cowl.z1) / 2));
  if (S.trunk) {
    paint.push(vBox(S, S.trunk.w, 0.035, S.trunk.z1 - S.trunk.z0, 0, S.trunk.y0 + 0.0175,
      (S.trunk.z0 + S.trunk.z1) / 2, { py: 'top' }, burned ? 0.06 : 0));
  }

  // --- pickup bed ------------------------------------------------------------
  if (S.bed) {
    const bd = S.bed;
    const railH = bd.railTop - slY1;
    for (const sx of [-1, 1]) {
      paint.push(vBox(S, bd.railW, railH, bd.z1 - bd.z0, sx * (S.W / 2 - bd.railW / 2),
        (slY1 + bd.railTop) / 2, (bd.z0 + bd.z1) / 2,
        sx > 0 ? { px: 'plain', nx: 'dark', py: 'top' } : { px: 'dark', nx: 'plain', py: 'top' }));
    }
    dark.push(new THREE.BoxGeometry(S.W - 0.42, 0.05, bd.z1 - bd.z0 - 0.05)
      .translate(0, slY1 - 0.19, (bd.z0 + bd.z1) / 2));
    paint.push(vBox(S, S.W - 0.34, bd.railTop - 0.68, 0.06, 0, (0.68 + bd.railTop) / 2, bd.z0 - 0.02,
      { pz: 'dark', py: 'top' }));
    const cw = S.cabWall;
    paint.push(vBox(S, cw.w, cw.y1 - cw.y0, 0.07, 0, (cw.y0 + cw.y1) / 2, cw.z, { py: 'top' }));
  }

  // --- greenhouse: raked pillars + roof (paint), B-pillars (dark), core ------
  const ws = S.ws;
  paint.push(vPillar(S, 0.06, 0.11, S.aPillarX, ws.zB, ws.yB + 0.01, ws.zT, ws.yT));
  paint.push(vPillar(S, 0.06, 0.11, -S.aPillarX, ws.zB, ws.yB + 0.01, ws.zT, ws.yT));
  if (S.rw && S.cPillarX) {
    paint.push(vPillar(S, 0.075, 0.17, S.cPillarX, S.rw.zB, S.rw.yB + 0.01, S.rw.zT, S.rw.yT));
    paint.push(vPillar(S, 0.075, 0.17, -S.cPillarX, S.rw.zB, S.rw.yB + 0.01, S.rw.zT, S.rw.yT));
  }
  paint.push(vBox(S, S.roof.w, 0.05, S.roof.z1 - S.roof.z0, 0, S.roof.y + 0.025,
    (S.roof.z0 + S.roof.z1) / 2, { py: 'top' }));
  for (const bz of S.bPillarZ) {
    for (const sx of [-1, 1]) {
      dark.push(new THREE.BoxGeometry(0.055, S.glassYT - S.glassYB, 0.085)
        .translate(sx * (S.glassX + 0.014), (S.glassYB + S.glassYT) / 2, bz));
    }
  }
  // dark cabin core: blocks see-through, backs the tinted glass
  const coreZ0 = S.bed ? S.cabWall.z + 0.05 : S.rw.zB + 0.02;
  const coreZ1 = ws.zB - 0.02;
  dark.push(new THREE.BoxGeometry(S.W - 0.44, S.glassYT - S.glassYB - 0.02, coreZ1 - coreZ0)
    .translate(0, (S.glassYB + S.glassYT) / 2 - 0.02, (coreZ0 + coreZ1) / 2));

  // --- glass: separate inset panes, raked windshield (removed when burned) ---
  if (!burned) {
    glass.push(quadGeo(
      [-ws.wB, ws.yB, ws.zB], [ws.wB, ws.yB, ws.zB], [ws.wT, ws.yT, ws.zT], [-ws.wT, ws.yT, ws.zT]));
    if (S.rw) {
      const rw = S.rw;
      glass.push(quadGeo(
        [rw.wB, rw.yB, rw.zB], [-rw.wB, rw.yB, rw.zB], [-rw.wT, rw.yT, rw.zT], [rw.wT, rw.yT, rw.zT]));
    }
    const sg = S.sideGlass, gx = S.glassX, gb = S.glassYB, gt = S.glassYT;
    glass.push(quadGeo([gx, gb, sg.zFB], [gx, gb, sg.zRB], [gx, gt, sg.zRT], [gx, gt, sg.zFT]));
    glass.push(quadGeo([-gx, gb, sg.zFB], [-gx, gt, sg.zFT], [-gx, gt, sg.zRT], [-gx, gb, sg.zRB]));
    if (S.cabRW) {
      const cr = S.cabRW;
      glass.push(quadGeo(
        [cr.w, cr.y0, cr.z], [-cr.w, cr.y0, cr.z], [-cr.w, cr.y1, cr.z], [cr.w, cr.y1, cr.z]));
    }
  }

  // --- wheel wells (dark cavities) + tires and rims tucked inside ------------
  const flatCh = burned ? 0.55 : 0.15;
  [[-1, zf, true], [1, zf, true], [-1, zr, false], [1, zr, false]].forEach(([sx, wz, front], i) => {
    dark.push(new THREE.BoxGeometry(0.5, 0.5, S.archHW * 2 - 0.02)
      .translate(sx * (S.W / 2 - 0.33), skY0 + 0.24, wz));
    const flat = ((jFlat * 7.13 + i * 0.618) % 1) < flatCh;
    const wy = S.axleY - (flat ? S.tireR * 0.22 : 0);
    const steer = front && !burned && Math.abs(jSteer) > 0.55 ? 0.16 * Math.sign(jSteer) : 0;
    const tg = new THREE.CylinderGeometry(S.tireR, S.tireR, S.tireW, 16).rotateZ(Math.PI / 2);
    if (flat) tg.scale(1, 0.78, 1);
    tg.rotateY(steer);
    tg.translate(sx * S.wheelX, wy, wz);
    tires.push(tg);
    rims.push(new THREE.CylinderGeometry(S.tireR * 0.52, S.tireR * 0.52, 0.016, 12)
      .rotateZ(Math.PI / 2).translate(sx * (S.tireW / 2 + 0.006), 0, 0)
      .rotateY(steer).translate(sx * S.wheelX, wy, wz));
    if (!burned) {
      chrome.push(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 8)
        .rotateZ(Math.PI / 2).translate(sx * (S.tireW / 2 + 0.016), 0, 0)
        .rotateY(steer).translate(sx * S.wheelX, wy, wz));
    }
  });

  // --- chrome / trim: bumpers, grille, lights, mirrors, handles --------------
  const bumperY = (skY0 + skY1) / 2 - 0.015;
  const lightY = (slY0 + slY1) / 2 + 0.03;
  for (const sz of [1, -1]) {
    chrome.push(new THREE.BoxGeometry(S.W + 0.06, 0.13, 0.13).translate(0, bumperY, sz * (S.L / 2 + 0.04)));
  }
  dark.push(new THREE.BoxGeometry(0.95, 0.13, 0.05).translate(0, lightY, S.L / 2 + 0.005));
  chrome.push(new THREE.BoxGeometry(1.0, 0.028, 0.03).translate(0, lightY, S.L / 2 + 0.02));
  for (const sx of [-1, 1]) {
    dark.push(new THREE.BoxGeometry(0.34, 0.16, 0.06).translate(sx * 0.60, lightY, S.L / 2 + 0.005));
    dark.push(new THREE.BoxGeometry(0.36, 0.14, 0.05).translate(sx * 0.62, lightY + 0.005, -(S.L / 2 + 0.002)));
    if (!burned) {
      heads.push(new THREE.BoxGeometry(0.29, 0.12, 0.05).translate(sx * 0.60, lightY, S.L / 2 - 0.002));
      tails.push(new THREE.BoxGeometry(0.31, 0.10, 0.05).translate(sx * 0.62, lightY + 0.005, -(S.L / 2 - 0.006)));
    }
    // side mirrors: stalk + head
    chrome.push(new THREE.BoxGeometry(0.05, 0.022, 0.09).translate(sx * (S.W / 2 + 0.045), S.glassYB + 0.13, S.mirrorZ));
    chrome.push(new THREE.BoxGeometry(0.055, 0.10, 0.16).translate(sx * (S.W / 2 + 0.10), S.glassYB + 0.15, S.mirrorZ));
    for (const hz of S.handles) {
      chrome.push(new THREE.BoxGeometry(0.02, 0.026, 0.13).translate(sx * (S.W / 2 + 0.008), S.sideY1 - 0.075, hz));
    }
  }
  if (jSpare < 0.75) {
    chrome.push(new THREE.CylinderGeometry(0.006, 0.009, 0.42, 5)
      .translate(S.W / 2 - 0.14, slY1 + 0.21, S.antennaZ));
  }
  if (S.rails) {
    for (const sx of [-1, 1]) {
      chrome.push(new THREE.BoxGeometry(0.035, 0.03, S.roof.z1 - S.roof.z0 - 0.3)
        .translate(sx * (S.roof.w / 2 - 0.16), S.roof.y + 0.062, (S.roof.z0 + S.roof.z1) / 2));
    }
  }
  // wipers resting on the windshield
  const wRake = Math.atan2(ws.zT - ws.zB, ws.yT - ws.yB);
  for (const wx of [-0.28, 0.16]) {
    dark.push(new THREE.BoxGeometry(0.34, 0.035, 0.014).rotateX(wRake)
      .rotateY(-0.1).translate(wx, ws.yB + 0.045, ws.zB - 0.02));
  }
  if (!burned) {
    plates.push(new THREE.PlaneGeometry(0.30, 0.125).rotateY(Math.PI)
      .translate(0.03, bumperY + 0.005, -(S.L / 2 + 0.107)));
  }

  // --- sagged, slightly listing stance (wheels stay on the ground) -----------
  const lean = (burned ? 0.028 : 0.011) * jLean;
  const pitch = (burned ? 0.013 : 0.006) * jPitch;
  const tilt = new THREE.Matrix4().makeRotationZ(lean)
    .multiply(new THREE.Matrix4().makeRotationX(pitch));
  tilt.setPosition(0, burned ? -0.02 : -0.008, 0);

  const addMerged = (geos, mat, tilted, castsShadow = true) => {
    if (!geos.length) return;
    const geo = mergeGeometries(geos, false);
    if (tilted) geo.applyMatrix4(tilt);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = castsShadow;
    m.receiveShadow = true;
    g.add(m);
  };
  addMerged(paint, bodyMat, true);
  addMerged(dark, vDarkMat(), true);
  addMerged(glass, vGlassMat(), true, false);
  addMerged(chrome, trimMat, true);
  addMerged(heads, vHeadLensMat(), true, false);
  addMerged(tails, vTailLensMat(), true, false);
  addMerged(plates, vPlateMat(), true, false);
  addMerged(tires, vTireMat(), false);
  addMerged(rims, burned ? vRimBurnedMat() : vRimMat(), false);

  g.add(contactShadow(S.W + 0.2, S.L - 0.02, 0.5));
  g.userData.collider = { w: S.W + 0.24, h: 1.35, d: S.L + 0.12 };
  return g;
}

// --- Power / telephone pole ----------------------------------------------------------
export function powerPole() {
  const g = new THREE.Group();
  const mat = woodMaterial(83);
  const pole = cyl(0.09, 0.13, 7.5, mat, 0, 3.75, 0, 8);
  g.add(pole);
  const cross = box(1.9, 0.09, 0.09, mat, 0, 6.9, 0);
  g.add(cross);
  const cross2 = box(1.5, 0.08, 0.08, mat, 0, 6.3, 0);
  g.add(cross2);
  const insMat = flatMaterial(0x3b4a42, 0.5);
  for (const x of [-0.85, -0.3, 0.3, 0.85]) g.add(cyl(0.035, 0.045, 0.12, insMat, x, 7.0, 0, 6));
  g.add(contactShadow(0.5, 0.5, 0.35));
  g.userData.collider = { w: 0.3, h: 7.5, d: 0.3 };
  return g;
}

// --- Snapped power pole, leaning into the street ------------------------------------
// Hinged at the ground, tipping toward local +z; rotate the group to aim the
// fall direction. userData.topLocal gives the tip for wire attachment.
export function leaningPowerPole(lean = 0.46) {
  const g = new THREE.Group();
  const mat = woodMaterial(83);
  const wood = [];
  // Pole shaft, pivoted at the base
  wood.push(new THREE.CylinderGeometry(0.09, 0.13, 7.5, 8).translate(0, 3.75, 0).rotateX(lean));
  // Splintered stump it tore away from
  wood.push(new THREE.CylinderGeometry(0.115, 0.14, 0.55, 8).rotateZ(0.14).translate(0.06, 0.24, -0.18));
  wood.push(new THREE.BoxGeometry(0.09, 0.62, 0.07).rotateX(lean * 0.5).translate(-0.05, 0.3, 0.1));
  // Cross arms: main one askew, second swinging loose
  wood.push(new THREE.BoxGeometry(1.9, 0.09, 0.09).rotateZ(-0.22).translate(0, 6.9, 0).rotateX(lean));
  wood.push(new THREE.BoxGeometry(1.5, 0.08, 0.08).rotateZ(1.18).translate(0.62, 5.9, 0).rotateX(lean));
  const woodMesh = new THREE.Mesh(mergeGeometries(wood), mat);
  woodMesh.castShadow = true; woodMesh.receiveShadow = true;
  g.add(woodMesh);
  // Insulators still riding the askew arm
  const insMat = flatMaterial(0x3b4a42, 0.5);
  const ins = [];
  for (const x of [-0.85, -0.3, 0.3]) {
    ins.push(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 6)
      .translate(x * 0.98, 6.96 - 0.218 * x, 0).rotateX(lean));
  }
  const insMesh = new THREE.Mesh(mergeGeometries(ins), insMat);
  insMesh.castShadow = true;
  g.add(insMesh);
  g.add(contactShadow(0.6, 1.5, 0.35, 0, 0.6));
  g.userData.collider = { w: 0.35, h: 2.2, d: 0.35 };
  g.userData.topLocal = new THREE.Vector3(0, Math.cos(lean) * 7.4, Math.sin(lean) * 7.4);
  return g;
}

// --- Cluster of dumped cardboard boxes (market trash) --------------------------------
// Merged into a single mesh; small enough to walk over, so no collider.
export function cardboardCluster(seed = 5, n = 3) {
  const g = new THREE.Group();
  const r = makeRNG(seed * 811 + 7);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = r.range(0.36, 0.6);
    const crushed = i === 0 && r.chance(0.4);
    const hh = s * (crushed ? r.range(0.22, 0.38) : r.range(0.7, 1.05));
    const bx = r.range(-0.6, 0.6), bz = r.range(-0.6, 0.6);
    const rot = r.range(0, Math.PI);
    parts.push(new THREE.BoxGeometry(s, hh, s * r.range(0.8, 1.2)).rotateY(rot).translate(bx, hh / 2, bz));
    if (!crushed) {
      // Open flaps folded outward from the top edges
      for (const sxx of [-1, 1]) {
        if (r.chance(0.25)) continue;
        parts.push(new THREE.BoxGeometry(s * 0.46, 0.016, s * 0.86)
          .translate(s * 0.23 * sxx, 0, 0)
          .rotateZ(sxx * -r.range(0.5, 1.15))
          .translate(sxx * s * 0.27, hh - 0.02, 0)
          .rotateY(rot)
          .translate(bx, 0, bz));
      }
    }
  }
  const m = new THREE.Mesh(mergeGeometries(parts), cardboardMaterial());
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.add(contactShadow(1.6, 1.6, 0.3));
  return g;
}

// --- String of small flags / cloth scraps between facades ------------------------
export function flagLine(from, to, seed = 3, sag = 0.9) {
  const g = new THREE.Group();
  const r = makeRNG(seed * 313);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 16, 0.008, 4),
    new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 0.8 })
  );
  line.castShadow = true;
  g.add(line);
  const cols = [0x8c3b2e, 0x3e6b63, 0xb8ab90, 0x7a6232, 0x5a6c8a];
  const n = 9 + r.int(0, 4);
  const flagGeo = new THREE.PlaneGeometry(0.3, 0.42);
  flagGeo.translate(0, -0.24, 0); // hang below the wire
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const mat = new THREE.MeshStandardMaterial({
      color: cols[(i + seed) % cols.length], roughness: 0.95,
      side: THREE.DoubleSide, envMapIntensity: 0.4,
    });
    const f = new THREE.Mesh(flagGeo, mat);
    f.position.copy(p);
    const dir = curve.getTangent(t);
    f.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2 + r.range(-0.25, 0.25);
    f.rotation.x = r.range(-0.12, 0.12);
    f.castShadow = true;
    g.add(f);
  }
  return g;
}

// Sagging wire between two points (catenary-ish curve)
export function wire(from, to, sag = 0.9) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geo = new THREE.TubeGeometry(curve, 14, 0.012, 4);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7 }));
  m.castShadow = true;
  return m;
}

// --- Tire stack -----------------------------------------------------------------------
export function tireStack(n = 3) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.95 });
  const geo = new THREE.TorusGeometry(0.34, 0.13, 8, 18);
  geo.rotateX(Math.PI / 2);
  const r = makeRNG(n * 77);
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(geo, mat);
    t.position.set(r.range(-0.05, 0.05), 0.13 + i * 0.25, r.range(-0.05, 0.05));
    t.rotation.y = r.range(0, Math.PI);
    t.castShadow = true; t.receiveShadow = true;
    g.add(t);
  }
  g.add(contactShadow(0.95, 0.95, 0.42));
  g.userData.collider = { w: 0.9, h: n * 0.25 + 0.15, d: 0.9 };
  return g;
}

// --- Rubble pile ------------------------------------------------------------------------
// Chunks merged per material (grey concrete / warm brickish) + merged rebar:
// 4 draw calls per pile instead of one mesh per chunk.
export function rubblePile(radius = 1.6, seed = 1) {
  const g = new THREE.Group();
  const mat = concreteMaterial(31, 0.76);
  const brickish = concreteMaterial(35, 0.62);
  const r = makeRNG(seed * 991);
  const n = Math.floor(radius * 9);
  const grey = [], warm = [];
  for (let i = 0; i < n; i++) {
    const s = r.range(0.14, 0.55) * radius * 0.5;
    const geo = new THREE.BoxGeometry(s, s * r.range(0.4, 0.8), s * r.range(0.6, 1.3));
    const isGrey = r.chance(0.7);
    const ang = r() * Math.PI * 2;
    const dist = Math.pow(r(), 0.6) * radius;
    const rx = r.range(-0.5, 0.5), ry = r() * Math.PI, rz = r.range(-0.5, 0.5);
    geo.rotateZ(rz); geo.rotateY(ry); geo.rotateX(rx);
    geo.translate(Math.cos(ang) * dist, s * 0.3 * (1 - dist / radius) + 0.05, Math.sin(ang) * dist);
    (isGrey ? grey : warm).push(geo);
  }
  for (const [geos, m2] of [[grey, mat], [warm, brickish]]) {
    if (!geos.length) continue;
    const m = new THREE.Mesh(mergeGeometries(geos), m2);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  // Rebar sticking out
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.8, metalness: 0.6 });
  const bars = [];
  for (let i = 0; i < Math.floor(radius * 2); i++) {
    const len = r.range(0.6, 1.3);
    const bx = r.range(-radius * 0.5, radius * 0.5);
    const bz = r.range(-radius * 0.5, radius * 0.5);
    const rx = r.range(-0.9, 0.9), rz = r.range(-0.9, 0.9);
    bars.push(new THREE.CylinderGeometry(0.015, 0.015, len, 5).rotateZ(rz).rotateX(rx).translate(bx, 0.3, bz));
  }
  if (bars.length) {
    const bm = new THREE.Mesh(mergeGeometries(bars), rebarMat);
    bm.castShadow = true;
    g.add(bm);
  }
  g.add(contactShadow(radius * 1.7, radius * 1.7, 0.34));
  g.userData.collider = { w: radius * 1.4, h: radius * 0.4, d: radius * 1.4 };
  return g;
}

// --- Corrugated metal fence panel ----------------------------------------------------------
export function metalFence(length = 3, height = 2.2) {
  const g = new THREE.Group();
  const mat = corrugatedMaterial();
  const panel = box(length, height, 0.05, mat, 0, height / 2, 0);
  g.add(panel);
  const postMat = metalMaterial(0x333a40, 641);
  g.add(cyl(0.04, 0.04, height + 0.15, postMat, -length / 2, (height + 0.15) / 2, 0, 8));
  g.add(cyl(0.04, 0.04, height + 0.15, postMat, length / 2, (height + 0.15) / 2, 0, 8));
  g.add(contactShadow(length, 0.5, 0.3));
  g.userData.collider = { w: length, h: height, d: 0.2 };
  return g;
}

// --- Street light ---------------------------------------------------------------------------
export function streetLight() {
  const g = new THREE.Group();
  const mat = metalMaterial(0x3d4348, 733);
  g.add(cyl(0.06, 0.1, 6.4, mat, 0, 3.2, 0, 10));
  const arm = box(1.6, 0.07, 0.07, mat, 0.75, 6.3, 0);
  g.add(arm);
  const head = box(0.55, 0.1, 0.22, mat, 1.45, 6.26, 0);
  g.add(head);
  g.add(contactShadow(0.45, 0.45, 0.35));
  g.userData.collider = { w: 0.25, h: 6.4, d: 0.25 };
  return g;
}

// --- Market awning ----------------------------------------------------------------------------
// Pivot at the wall attachment edge; cloth extends toward local +z, sloping
// down. Rotate the group so +z points away from the wall face.
export function awning(width = 2.6, color = 0x8c3b2e) {
  const g = new THREE.Group();
  const clothMat = awningMaterial(color);
  const depth = 1.35;
  const geo = new THREE.PlaneGeometry(width, depth, 10, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // Scalloped sag between rib lines + slight belly toward the outer edge
    const sag = Math.abs(Math.sin((x / width + 0.5) * Math.PI * 4)) * 0.045 + (0.5 - y / depth) * 0.02;
    pos.setZ(i, -sag * (0.5 - y / depth + 0.5));
  }
  geo.translate(0, -depth / 2, 0); // pivot at back (wall) edge
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, clothMat);
  cloth.rotation.x = -Math.PI / 2 + 0.42;
  cloth.castShadow = true; cloth.receiveShadow = true;
  g.add(cloth);
  // Support struts from outer corners back to the wall
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.6, metalness: 0.7 });
  for (const sx of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 6), strutMat);
    strut.position.set(sx * (width / 2 - 0.06), 0.28, 0.55);
    strut.rotation.x = 0.75;
    strut.castShadow = true;
    g.add(strut);
  }
  return g;
}

// --- AC unit (for walls/roofs) -------------------------------------------------------------------
export function acUnit() {
  const g = new THREE.Group();
  const mat = metalMaterial(0x9aa2a6, 811);
  const b = box(0.85, 0.55, 0.4, mat, 0, 0, 0);
  g.add(b);
  const grill = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), flatMaterial(0x2b2f31, 0.6, 0.4));
  grill.position.set(0, 0, 0.201);
  g.add(grill);
  return g;
}

// --- Water tank (rooftop) ---------------------------------------------------------------------------
export function waterTank() {
  const g = new THREE.Group();
  const mat = metalMaterial(0xb8b0a0, 911);
  g.add(cyl(0.7, 0.7, 1.3, mat, 0, 0.85, 0, 14));
  const legMat = flatMaterial(0x4d4a44, 0.8, 0.5);
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    g.add(cyl(0.035, 0.035, 0.5, legMat, x, 0.25, z, 6));
  }
  return g;
}
