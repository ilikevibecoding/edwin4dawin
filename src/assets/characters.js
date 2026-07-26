// ============================================================================
// NORTHSTAR RESCUE — character visuals & procedural animation (Fable 4).
//
// Segmented humanoids assembled from Three.js primitives with generously
// overlapping joints (capsule limbs + sphere joints, articulated via nested
// Groups — no SkinnedMesh). Hostiles: fictional "Kestrel Syndicate" (matte
// olive/graphite tactical wear, red armband accent, original kestrel patch).
// Hostages: office workers in a deliberately softer palette.
//
// Contract (see docs/ownership-ledger.md, wired by the lead):
//   installCharacters(game) -> game.characters = { buildEnemy, buildHostage }
//   buildEnemy(outfit, weaponId, id) / buildHostage(variant, id) return
//   { group, setMoving, setCrouch, setAim, setState, die, update }.
//   Group origin = feet at y=0, character faces -Z. The AI moves/rotates the
//   group; this module only animates limbs in place.
//
// NOTE: shared procedural-texture library (src/assets/textures.js, Fable 3,
// WP-07) does not exist yet — makeCanvasTexture below is a local stand-in
// with the same shape (size, draw) and can be swapped for the shared helper
// when it lands. No document access happens at module import time.
// ============================================================================
import * as THREE from 'three';
import { registerAsset } from './registry.js';
import { getMaterial } from './materials.js';
import { mergeGeos } from './geo.js';
import { bus } from '../core/events.js';

// ------------------------------------------------------------- proportions
// Total height 1.78 m. Pivots (absolute): hips 0.94, spine 1.04, shoulders
// 1.46, neck base 1.485, knees 0.485, ankles 0.065.
const BODY = {
  hipY: 0.94,
  spineUp: 0.10,           // pelvis -> spine pivot
  shoulderUp: 0.42,        // spine -> shoulder pivot (abs 1.46)
  shoulderX: 0.175,
  neckUp: 0.445,           // spine -> neck pivot (abs 1.485)
  upperArm: 0.32, foreArm: 0.28, hand: 0.12,
  hipX: 0.095, hipDrop: 0.015,
  thigh: 0.44, shin: 0.42,
  headR: 0.105,
};

const SKIN_TONES = ['#d9b394', '#c08a66', '#7d5540'];
const HAIR_BROWN = '#3a2d21', HAIR_GRAY = '#8d8781', BEARD = '#33281e';

// ------------------------------------------------------------------ caches
const _tex = new Map();
const _geo = new Map();
const _mat = new Map();

function hashStr(s) {
  let h = 2166136261 >>> 0;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// deterministic per-key rng so textures are stable across sessions
function seededRand(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Local stand-in for the planned shared textures.js helper (Fable 3 WP-07).
function makeCanvasTexture(size, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = opts.w || size;
  c.height = opts.h || size;
  const g = c.getContext('2d');
  if (!g) return null; // node import-check environment
  draw(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cachedTex(key, make) {
  if (!_tex.has(key)) _tex.set(key, make());
  return _tex.get(key);
}

// near-white grayscale weave/noise; tinted by material.color
function clothTexture(key, coarse) {
  return cachedTex('cloth_' + key, () => makeCanvasTexture(96, (g, W, H) => {
    const rand = seededRand(hashStr(key));
    g.fillStyle = '#ececec';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2400; i++) {
      const v = 216 + Math.floor(rand() * 56);
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.fillRect(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1);
    }
    g.globalAlpha = coarse ? 0.10 : 0.06;
    g.fillStyle = '#b8b8b8';
    const step = coarse ? 4 : 3;
    for (let y = 0; y < H; y += step) g.fillRect(0, y, W, 1);
    for (let x = 0; x < W; x += step * 2) g.fillRect(x, 0, 1, H);
    g.globalAlpha = 1;
    // faint large-scale mottling so flat panels don't look uniform
    for (let i = 0; i < 8; i++) {
      const x = rand() * W, y = rand() * H, r = 14 + rand() * 22;
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, 'rgba(190,190,190,0.10)');
      gr.addColorStop(1, 'rgba(190,190,190,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }));
}

function skinNoiseTexture() {
  return cachedTex('skin_noise', () => makeCanvasTexture(64, (g, W, H) => {
    const rand = seededRand(101);
    g.fillStyle = '#f2ede9';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      const v = 226 + Math.floor(rand() * 30);
      g.fillStyle = `rgba(${v},${Math.floor(v * 0.97)},${Math.floor(v * 0.94)},0.5)`;
      g.fillRect(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1);
    }
  }));
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
  return '#' + c.getHexString();
}

// Painted head map (equirect on the skull sphere; face is centered at u=0.75
// which is the -Z direction the character faces). Deliberately soft-detail:
// shallow sockets + brow shadow, no iris detail (avoids uncanny close-ups).
function faceTexture(style, toneIdx, hairColor) {
  const key = `face_${style}_${toneIdx}_${hairColor || 'none'}`;
  return cachedTex(key, () => makeCanvasTexture(256, (g, W, H) => {
    const rand = seededRand(hashStr(key));
    const skin = SKIN_TONES[toneIdx % SKIN_TONES.length];
    const FX = 192; // face center u=0.75
    const soft = (x, y, rx, ry, color, a) => {
      const gr = g.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry));
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      g.translate(-x, -y);
      g.globalAlpha = a;
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.globalAlpha = 1;
    };
    const paintSkinBase = () => {
      g.fillStyle = skin;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 1500; i++) {
        g.fillStyle = rand() > 0.5 ? 'rgba(255,235,220,0.05)' : 'rgba(70,40,25,0.05)';
        g.fillRect(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1);
      }
      // subtle warm cheeks / cool jaw
      soft(FX - 20, 74, 16, 10, 'rgba(190,90,70,0.5)', 0.10);
      soft(FX + 20, 74, 16, 10, 'rgba(190,90,70,0.5)', 0.10);
    };
    const paintFeatures = () => {
      const dark = shade(skin, 0.42);
      // brow shadow band
      soft(FX, 52, 34, 8, dark, 0.28);
      // shallow eye sockets
      for (const s of [-1, 1]) {
        soft(FX + s * 11, 59, 9, 5, dark, 0.55);
        soft(FX + s * 11, 60, 5, 3, '#241a14', 0.8);
        // brows
        g.fillStyle = 'rgba(40,28,20,0.7)';
        g.save();
        g.translate(FX + s * 11, 52);
        g.rotate(s * -0.12);
        g.fillRect(-6, -1.5, 12, 3);
        g.restore();
      }
      // nose
      soft(FX, 66, 3.5, 8, dark, 0.22);
      soft(FX - 3, 72, 2, 1.6, '#241a14', 0.35);
      soft(FX + 3, 72, 2, 1.6, '#241a14', 0.35);
      // mouth
      g.fillStyle = 'rgba(60,30,25,0.5)';
      g.fillRect(FX - 7, 80, 14, 2);
      soft(FX, 84, 7, 3, 'rgba(255,225,210,0.6)', 0.12);
    };
    if (style === 'bala') {
      // full knit balaclava with an eye slit
      g.fillStyle = '#272b30';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 3) {
        g.fillStyle = y % 6 ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.045)';
        g.fillRect(0, y, W, 1);
      }
      for (let i = 0; i < 900; i++) {
        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.fillRect(Math.floor(rand() * W), Math.floor(rand() * H), 1, 1);
      }
      // eye slit
      g.fillStyle = skin;
      const sx = FX - 22, sy = 51, sw = 44, sh = 15;
      g.beginPath();
      if (g.roundRect) g.roundRect(sx, sy, sw, sh, 7); else g.rect(sx, sy, sw, sh);
      g.fill();
      soft(FX, 58, 24, 8, shade(skin, 0.6), 0.3);
      for (const s of [-1, 1]) {
        soft(FX + s * 11, 58, 8, 4.4, shade(skin, 0.4), 0.6);
        soft(FX + s * 11, 59, 4.5, 2.6, '#20170f', 0.85);
      }
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.lineWidth = 2.5;
      g.beginPath();
      if (g.roundRect) g.roundRect(sx, sy, sw, sh, 7); else g.rect(sx, sy, sw, sh);
      g.stroke();
      return;
    }
    paintSkinBase();
    // nape/back hair band (top of head is always covered by headgear/hair geo)
    if (hairColor) {
      g.fillStyle = hairColor;
      for (let x = 0; x < W; x++) {
        const dxWrap = ((x - FX + 128) % 256 + 256) % 256 - 128;
        const inFace = Math.abs(dxWrap) < 46;
        if (inFace) continue;
        const yTop = 26 + Math.sin(x * 0.22) * 2;
        const yBot = 66 + Math.sin(x * 0.13 + 2) * 4;
        g.globalAlpha = 0.92;
        g.fillRect(x, yTop, 1, yBot - yTop);
      }
      g.globalAlpha = 1;
    }
    paintFeatures();
    if (style === 'beard') {
      const b = BEARD;
      g.globalAlpha = 0.88;
      g.fillStyle = b;
      g.beginPath();
      g.moveTo(FX - 26, 62);
      g.quadraticCurveTo(FX - 30, 92, FX - 12, 101);
      g.quadraticCurveTo(FX, 106, FX + 12, 101);
      g.quadraticCurveTo(FX + 30, 92, FX + 26, 62);
      g.lineTo(FX + 20, 66);
      g.quadraticCurveTo(FX + 12, 88, FX, 89);
      g.quadraticCurveTo(FX - 12, 88, FX - 20, 66);
      g.closePath();
      g.fill();
      // mustache + fill under mouth
      g.fillRect(FX - 9, 74, 18, 5);
      g.fillRect(FX - 6, 84, 12, 6);
      g.globalAlpha = 1;
      for (let i = 0; i < 260; i++) {
        const x = FX - 28 + rand() * 56, y = 62 + rand() * 42;
        g.fillStyle = rand() > 0.5 ? 'rgba(210,190,170,0.10)' : 'rgba(0,0,0,0.16)';
        g.fillRect(x, y, 1, 2);
      }
    }
  }, { w: 256, h: 128 }));
}

function kestrelPatchTexture() {
  return cachedTex('patch_kestrel', () => makeCanvasTexture(96, (g, W, H) => {
    g.fillStyle = '#22262b';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a5372e';
    g.lineWidth = 7;
    g.strokeRect(4, 4, W - 8, H - 8);
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 2;
    g.strokeRect(10, 10, W - 20, H - 20);
    // original kestrel silhouette: hovering falcon, swept wings + fanned tail
    g.fillStyle = '#d8d3c6';
    g.beginPath();
    g.moveTo(18, 52);                       // beak
    g.quadraticCurveTo(28, 42, 38, 44);     // head
    g.quadraticCurveTo(44, 26, 62, 16);     // leading edge wing
    g.quadraticCurveTo(74, 10, 84, 12);     // wingtip
    g.quadraticCurveTo(70, 26, 62, 40);     // trailing edge
    g.quadraticCurveTo(74, 48, 84, 66);     // toward tail tip
    g.quadraticCurveTo(72, 62, 62, 62);     // tail notch
    g.quadraticCurveTo(56, 74, 44, 78);     // tail fan
    g.quadraticCurveTo(42, 66, 34, 58);     // belly
    g.quadraticCurveTo(26, 56, 18, 52);
    g.closePath();
    g.fill();
    g.fillStyle = '#22262b';
    g.beginPath();
    g.arc(30, 47, 1.8, 0, Math.PI * 2);     // eye
    g.fill();
    g.fillStyle = 'rgba(216,211,198,0.85)';
    g.font = 'bold 11px monospace';
    g.textAlign = 'center';
    g.fillText('KSTL', W / 2, H - 14);
  }));
}

function badgeTexture() {
  return cachedTex('badge_nlg', () => makeCanvasTexture(64, (g, W, H) => {
    g.fillStyle = '#f2f3f4';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#14365c';
    g.fillRect(0, 0, W, 18);
    // NLG 8-point star dot
    g.fillStyle = '#8fd8ff';
    g.save();
    g.translate(12, 9);
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillRect(-1, -6, 2, 12); }
    g.restore();
    g.fillStyle = '#dfe3e6';
    g.fillRect(8, 26, 22, 26);            // photo block
    g.fillStyle = '#9aa5ad';
    g.beginPath();
    g.arc(19, 35, 5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(19, 50, 9, Math.PI, 0);
    g.fill();
    g.fillStyle = '#7c8791';
    g.fillRect(36, 28, 20, 3);
    g.fillRect(36, 36, 16, 3);
    g.fillRect(36, 44, 19, 3);
    g.fillStyle = '#b9c2c9';
    g.fillRect(8, 60, 48, 6);
  }, { w: 64, h: 88 }));
}

// ---------------------------------------------------------------- materials
// Prefer the shared library when Fable 3 has authored the key; the current
// graybox materials.js returns a flat default for unknown keys, which we
// detect and replace with a bespoke stand-in of the same name.
function libMat(key, fallbackOpts) {
  const m = getMaterial(key);
  const isGrayboxDefault = m && m.isMeshStandardMaterial && !m.map && m.color && m.color.getHex() === 0xbfc3c7;
  if (!isGrayboxDefault) return m;
  return stdMat('fb_' + key, fallbackOpts);
}

function stdMat(key, opts) {
  if (_mat.has(key)) return _mat.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0x888888,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.02,
    map: opts.map ?? null,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  _mat.set(key, m);
  return m;
}

function clothMat(key, color, opts = {}) {
  return stdMat(key, {
    color,
    roughness: opts.roughness ?? 0.93,
    metalness: 0.0,
    map: clothTexture(opts.coarse ? 'coarse' : 'fine', !!opts.coarse),
  });
}

function skinMat(toneIdx) {
  return stdMat('skin_' + toneIdx, {
    color: SKIN_TONES[toneIdx % SKIN_TONES.length],
    roughness: 0.62,
    map: skinNoiseTexture(),
  });
}

function headMat(style, toneIdx, hairColor) {
  const key = `head_${style}_${toneIdx}_${hairColor || 'x'}`;
  if (_mat.has(key)) return _mat.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: style === 'bala' ? 0.95 : 0.62,
    map: faceTexture(style, toneIdx, hairColor),
  });
  _mat.set(key, m);
  return m;
}

const M = {
  // hostiles
  mercJacket: () => clothMat('merc_jacket', 0x59513c, { coarse: true }),
  mercPants: () => clothMat('merc_pants', 0x585d61),
  vest: () => clothMat('vest_dark', 0x2b2f33),
  pouch: () => clothMat('pouch', 0x3a3f43),
  scoutHoodie: () => clothMat('scout_hoodie', 0x404a56, { coarse: true }),
  scoutPants: () => clothMat('scout_pants', 0x43464b),
  rig: () => clothMat('rig_dark', 0x26292d),
  heavySuit: () => clothMat('heavy_suit', 0x35393e, { coarse: true }),
  plate: () => stdMat('plate_armor', { color: 0x24282d, roughness: 0.55, metalness: 0.22, map: clothTexture('fine', false) }),
  accent: () => clothMat('accent_red', 0xa5372e),
  knit: () => clothMat('knit_dark', 0x262a2e),
  cap: () => clothMat('cap_gray', 0x3a4046),
  helmet: () => stdMat('helmet', { color: 0x2c3034, roughness: 0.5, metalness: 0.15 }),
  lens: () => stdMat('goggle_lens', { color: 0x11161c, roughness: 0.12, metalness: 0.35 }),
  shemagh: () => clothMat('shemagh', 0x4c5866),
  leather: () => libMat('leather_black', { color: 0x1c1e21, roughness: 0.78, metalness: 0.05 }),
  rubber: () => libMat('rubber', { color: 0x141618, roughness: 0.96, metalness: 0.0 }),
  gunMetal: () => libMat('metal_dark', { color: 0x24272c, roughness: 0.42, metalness: 0.72 }),
  gunPolymer: () => libMat('plastic_black', { color: 0x1e2124, roughness: 0.62, metalness: 0.05 }),
  patch: () => stdMat('patch_mat', { color: 0xffffff, roughness: 0.9, map: kestrelPatchTexture() }),
  // hostages
  shirtBlue: () => clothMat('shirt_blue', 0x9fbdd8),
  trousersDark: () => clothMat('trousers_dark', 0x3b3f49),
  shirtWhite: () => clothMat('shirt_white', 0xe4e4e0),
  waistcoat: () => clothMat('waistcoat', 0x676d75),
  tie: () => clothMat('tie_maroon', 0x77303a),
  shoes: () => stdMat('shoes_office', { color: 0x272320, roughness: 0.55, metalness: 0.05 }),
  lanyard: () => clothMat('lanyard', 0x223a5e),
  badge: () => stdMat('badge_mat', { color: 0xffffff, roughness: 0.7, map: badgeTexture() }),
  hairBrown: () => stdMat('hair_brown', { color: HAIR_BROWN, roughness: 0.85 }),
  hairGray: () => stdMat('hair_gray', { color: HAIR_GRAY, roughness: 0.85 }),
};

// ---------------------------------------------------------------- geometry
function G(key, make) {
  if (!_geo.has(key)) _geo.set(key, make());
  return _geo.get(key);
}

// capsule spanning from y=0 (top joint) to y=-len (bottom joint), with caps
// overshooting both joints by ~r — guarantees overlap in any pose.
function limbGeo(r, len, radial = 10) {
  return G(`limb_${r}_${len}_${radial}`, () => {
    const g = new THREE.CapsuleGeometry(r, len, 4, radial);
    g.translate(0, -len / 2, 0);
    return g;
  });
}

function sphGeo(r, w = 12, h = 9) {
  return G(`sph_${r}_${w}_${h}`, () => new THREE.SphereGeometry(r, w, h));
}

function boxGeoS(w, h, d) {
  return G(`box_${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
}

function mesh(geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? false;
  return m;
}

// collect boxes/spheres/cyls into one merged geometry (baked transforms)
class PartBag {
  constructor() { this.list = []; }
  box(w, h, d, x, y, z, rot) { this._add(new THREE.BoxGeometry(w, h, d), x, y, z, rot); }
  sphere(r, x, y, z, sc, seg = 10) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2));
    if (sc) g.scale(sc.x ?? 1, sc.y ?? 1, sc.z ?? 1);
    this._add(g, x, y, z);
  }
  cyl(r1, r2, h, x, y, z, rot, seg = 10) { this._add(new THREE.CylinderGeometry(r1, r2, h, seg), x, y, z, rot); }
  capsule(r, len, x, y, z, rot, seg = 10) { this._add(new THREE.CapsuleGeometry(r, len, 4, seg), x, y, z, rot); }
  _add(g, x, y, z, rot) {
    if (rot) { if (rot.x) g.rotateX(rot.x); if (rot.y) g.rotateY(rot.y); if (rot.z) g.rotateZ(rot.z); }
    g.translate(x, y, z);
    this.list.push(g);
  }
  merge(key) { return key ? G(key, () => mergeGeos(this.list)) : mergeGeos(this.list); }
}

// ---------------------------------------------------------------- weapons
// Origin at the pistol grip (right hand), muzzle toward -Z.
// bLen = distance grip -> butt plate (used to seat the stock at the shoulder).
const WEAPON_SPECS = {
  vesper:  { bLen: 0.15, foreZ: -0.15 },
  bdr15:   { bLen: 0.21, foreZ: -0.26 },
  havelock:{ bLen: 0.22, foreZ: -0.30 },
  meridian:{ bLen: 0.26, foreZ: -0.27 },
};

function weaponGeos(id) {
  return G('weapon_' + id, () => {
    const metal = new PartBag();
    const poly = new PartBag();
    if (id === 'bdr15') {          // tactical carbine
      metal.box(0.054, 0.078, 0.27, 0, 0.052, -0.045);
      metal.box(0.03, 0.024, 0.30, 0, 0.098, -0.10);                 // top rail
      metal.cyl(0.026, 0.026, 0.24, 0, 0.058, -0.30, { x: Math.PI / 2 }, 8); // handguard
      metal.cyl(0.012, 0.012, 0.12, 0, 0.058, -0.47, { x: Math.PI / 2 }, 8);
      metal.cyl(0.017, 0.017, 0.04, 0, 0.058, -0.535, { x: Math.PI / 2 }, 8); // flash hider
      metal.box(0.031, 0.16, 0.055, 0, -0.055, -0.075, { x: 0.32 }); // curved mag
      metal.box(0.012, 0.035, 0.012, 0, 0.115, -0.40);               // front post
      metal.box(0.022, 0.03, 0.03, 0, 0.115, 0.02);                  // rear sight
      poly.box(0.034, 0.095, 0.052, 0, -0.035, 0.012, { x: -0.28 }); // grip
      poly.box(0.028, 0.042, 0.13, 0, 0.045, 0.115);                 // buffer/stock arm
      poly.box(0.036, 0.10, 0.055, 0, 0.03, 0.19);                   // butt
    } else if (id === 'havelock') { // shotgun: long barrel + tube magazine
      metal.box(0.05, 0.082, 0.24, 0, 0.048, -0.03);
      metal.cyl(0.0135, 0.0135, 0.52, 0, 0.078, -0.40, { x: Math.PI / 2 }, 8);  // barrel
      metal.cyl(0.013, 0.013, 0.46, 0, 0.034, -0.375, { x: Math.PI / 2 }, 8);   // tube mag
      metal.box(0.012, 0.014, 0.014, 0, 0.098, -0.645);              // bead
      poly.cyl(0.027, 0.029, 0.13, 0, 0.036, -0.31, { x: Math.PI / 2 }, 8);     // pump
      poly.box(0.036, 0.06, 0.10, 0, -0.01, 0.075, { x: -0.18 });    // grip wrist
      poly.box(0.04, 0.095, 0.16, 0, 0.005, 0.165, { x: 0.10 });     // stock
    } else if (id === 'meridian') { // scoped precision rifle
      metal.box(0.054, 0.082, 0.30, 0, 0.05, -0.05);
      metal.cyl(0.013, 0.011, 0.55, 0, 0.062, -0.45, { x: Math.PI / 2 }, 8);    // barrel
      metal.box(0.032, 0.032, 0.05, 0, 0.062, -0.735);               // muzzle brake
      metal.cyl(0.026, 0.026, 0.20, 0, 0.142, -0.02, { x: Math.PI / 2 }, 10);   // scope tube
      metal.cyl(0.035, 0.035, 0.055, 0, 0.142, -0.135, { x: Math.PI / 2 }, 10); // objective
      metal.cyl(0.031, 0.031, 0.04, 0, 0.142, 0.09, { x: Math.PI / 2 }, 10);    // ocular
      metal.box(0.02, 0.05, 0.028, 0, 0.105, -0.07);
      metal.box(0.02, 0.05, 0.028, 0, 0.105, 0.035);
      metal.box(0.034, 0.085, 0.065, 0, -0.028, -0.11, { x: 0.15 }); // box mag
      poly.box(0.036, 0.10, 0.06, 0, -0.03, 0.015, { x: -0.25 });    // grip
      poly.box(0.042, 0.10, 0.25, 0, 0.012, 0.155);                  // stock
      poly.box(0.036, 0.035, 0.13, 0, 0.095, 0.17);                  // cheek riser
      poly.box(0.042, 0.048, 0.22, 0, 0.028, -0.245);                // forend
    } else {                        // vesper: compact SMG
      metal.box(0.05, 0.072, 0.28, 0, 0.045, -0.045);
      metal.cyl(0.016, 0.016, 0.13, 0, 0.052, -0.245, { x: Math.PI / 2 }, 8);   // shroud
      metal.box(0.028, 0.15, 0.045, 0, -0.05, -0.135, { x: 0.10 });  // mag
      metal.box(0.011, 0.03, 0.011, 0, 0.092, -0.28);
      metal.box(0.02, 0.024, 0.026, 0, 0.092, 0.04);
      metal.box(0.02, 0.024, 0.11, 0, 0.052, 0.135);                 // folded strut
      metal.box(0.026, 0.065, 0.022, 0, 0.045, 0.185);               // butt hook
      poly.box(0.032, 0.088, 0.05, 0, -0.032, 0.008, { x: -0.25 });  // grip
      poly.box(0.034, 0.03, 0.10, 0, -0.005, -0.19);                 // foregrip slab
    }
    return { metal: metal.merge(), poly: poly.merge() };
  });
}

function buildWeapon(id) {
  const spec = WEAPON_SPECS[id] || WEAPON_SPECS.vesper;
  const geos = weaponGeos(WEAPON_SPECS[id] ? id : 'vesper');
  const grp = new THREE.Group();
  grp.name = 'weapon_' + id;
  if (geos.metal) grp.add(mesh(geos.metal, M.gunMetal()));
  if (geos.poly) grp.add(mesh(geos.poly, M.gunPolymer()));
  return { group: grp, ...spec };
}

// ------------------------------------------------------------------ heads
// Head group pivot at neck base (abs ~1.485). Skull center local y 0.155.
// styles: bala | beard(beanie) | cap | helmet ; hostages: hairA / hairB
function buildHead(style, toneIdx, opts = {}) {
  const head = new THREE.Group();
  head.name = 'head_' + style;
  const HY = 0.155;
  const skullGeo = G('skull', () => {
    const g = new THREE.SphereGeometry(BODY.headR, 20, 15);
    g.scale(0.95, 1.06, 1.0);
    return g;
  });
  const hairColor = style === 'hairB' ? HAIR_GRAY : (style === 'cap' || style === 'hairA') ? HAIR_BROWN : (style === 'beard' ? BEARD : null);
  const faceStyle = style === 'bala' ? 'bala' : style === 'beard' ? 'beard' : 'clean';
  const skull = mesh(skullGeo, headMat(faceStyle, toneIdx, hairColor));
  skull.position.y = HY;
  head.add(skull);

  // jaw hint; fabric-covered for balaclava, beard-tinted for the beanie head
  const jawMat = style === 'bala' ? M.knit()
    : style === 'beard' ? stdMat('beard_jaw', { color: BEARD, roughness: 0.92 })
    : skinMat(toneIdx);
  const jaw = mesh(G('jaw', () => {
    const b = new PartBag();
    b.sphere(0.075, 0, HY - 0.052, -0.026, { x: 0.82, y: 0.66, z: 0.9 });
    return b.merge();
  }), jawMat);
  head.add(jaw);
  if (style !== 'bala' && style !== 'helmet') {
    const ears = mesh(G('ears', () => {
      const b = new PartBag();
      b.sphere(0.021, -0.093, HY + 0.005, 0.008, { x: 0.55, y: 1, z: 0.8 }, 8);
      b.sphere(0.021, 0.093, HY + 0.005, 0.008, { x: 0.55, y: 1, z: 0.8 }, 8);
      return b.merge();
    }), skinMat(toneIdx));
    head.add(ears);
  }

  // neck
  const neckMesh = mesh(G('neck', () => new THREE.CylinderGeometry(0.052, 0.058, 0.115, 10)), style === 'bala' ? M.knit() : skinMat(toneIdx));
  neckMesh.position.y = 0.035;
  head.add(neckMesh);

  if (style === 'beard') {
    const beanie = new PartBag();
    beanie.sphere(0.112, 0, HY + 0.038, 0.004, { x: 1.0, y: 0.82, z: 1.02 });
    beanie.cyl(0.107, 0.111, 0.045, 0, HY + 0.006, 0.004, null, 14);
    head.add(mesh(G('beanie', () => beanie.merge()), M.knit()));
  } else if (style === 'cap') {
    const cap = new PartBag();
    cap.sphere(0.109, 0, HY + 0.028, 0.006, { x: 0.99, y: 0.78, z: 1.02 });
    cap.cyl(0.108, 0.110, 0.03, 0, HY + 0.022, 0.006, null, 14);
    cap.box(0.105, 0.012, 0.085, 0, HY + 0.028, -0.135, { x: 0.14 }); // brim
    head.add(mesh(G('capgeo', () => cap.merge()), M.cap()));
  } else if (style === 'helmet') {
    const hel = new PartBag();
    hel.sphere(0.128, 0, HY + 0.028, 0.004, { x: 1.0, y: 0.86, z: 1.06 }, 16);
    hel.cyl(0.126, 0.130, 0.022, 0, HY - 0.018, 0.004, null, 16);    // rim
    head.add(mesh(G('helmetgeo', () => hel.merge()), M.helmet()));
    if (opts.redBand) {
      const band = mesh(G('helmband', () => new THREE.CylinderGeometry(0.1305, 0.1315, 0.032, 16)), M.accent());
      band.position.set(0, HY + 0.012, 0.004);
      head.add(band);
    }
    // goggles: strap + lens block
    const gog = new PartBag();
    gog.box(0.19, 0.03, 0.02, 0, HY + 0.012, 0.062);                 // rear strap
    gog.box(0.02, 0.03, 0.10, -0.098, HY + 0.016, -0.015);
    gog.box(0.02, 0.03, 0.10, 0.098, HY + 0.016, -0.015);
    head.add(mesh(G('gogstrap', () => gog.merge()), M.rig()));
    const lens = mesh(G('goglens', () => {
      const g = new THREE.BoxGeometry(0.125, 0.045, 0.035);
      return g;
    }), M.lens());
    lens.position.set(0, HY + 0.02, -0.085);
    head.add(lens);
  } else if (style === 'hairA') {
    const hair = new PartBag();
    hair.sphere(0.113, 0, HY + 0.012, 0.008, { x: 0.97, y: 0.94, z: 1.02 }, 16);
    hair.sphere(0.048, 0, HY + 0.02, 0.105, { x: 0.9, y: 0.85, z: 0.9 });    // low bun
    head.add(mesh(G('hairA', () => hair.merge()), M.hairBrown()));
  } else if (style === 'hairB') {
    // balding horseshoe
    const hs = mesh(G('hairB', () => {
      const g = new THREE.TorusGeometry(0.082, 0.031, 8, 16, Math.PI * 1.25);
      g.rotateZ(Math.PI * (0.5 - 0.125));
      g.rotateX(Math.PI / 2);
      g.rotateY(Math.PI);
      g.scale(1.03, 0.85, 1.05);
      return g;
    }), M.hairGray());
    hs.position.set(0, HY + 0.01, 0.004);
    head.add(hs);
    // reading glasses: thin frame strip
    const gl = new PartBag();
    gl.box(0.115, 0.006, 0.006, 0, HY + 0.012, -0.092);
    gl.box(0.036, 0.026, 0.004, -0.026, HY + 0.002, -0.094);
    gl.box(0.036, 0.026, 0.004, 0.026, HY + 0.002, -0.094);
    gl.box(0.004, 0.006, 0.09, -0.088, HY + 0.014, -0.048);
    gl.box(0.004, 0.006, 0.09, 0.088, HY + 0.014, -0.048);
    head.add(mesh(G('glasses', () => gl.merge()), M.lens(), { cast: false }));
  }
  if (opts.shemagh) {
    const sh = mesh(G('shemagh', () => {
      const g = new THREE.TorusGeometry(0.072, 0.034, 8, 14);
      g.rotateX(Math.PI / 2);
      g.scale(1.06, 0.72, 1.1);
      return g;
    }), M.shemagh());
    sh.position.set(0, 0.025, -0.005);
    head.add(sh);
  }
  return head;
}

// ---------------------------------------------------------------- figure
// cfg: { pantsMat, jacketMat, gloveMat, footMat, skinIdx, forearmSkin,
//        bulk, chestScale, shoulderX, gearBuilder(spine,pelvis,shoulders),
//        headStyle, headOpts, footKind }
function buildFigure(cfg) {
  const bulk = cfg.bulk ?? 1;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  const pelvis = new THREE.Group();
  pelvis.position.y = BODY.hipY;
  rig.add(pelvis);

  const pelvisBag = new PartBag();
  pelvisBag.sphere(0.15, 0, -0.02, 0, { x: 1.06 * bulk, y: 0.74, z: 0.78 * bulk }, 14);
  pelvisBag.sphere(0.085, -BODY.hipX, -0.035, 0, { x: bulk, y: 1, z: bulk });
  pelvisBag.sphere(0.085, BODY.hipX, -0.035, 0, { x: bulk, y: 1, z: bulk });
  const pelvisMesh = mesh(G(`pelvis_${cfg.geoKey}`, () => pelvisBag.merge()), cfg.pantsMat);
  pelvis.add(pelvisMesh);

  const spine = new THREE.Group();
  spine.position.y = BODY.spineUp;
  pelvis.add(spine);

  const cs = cfg.chestScale ?? 1;
  const shoulderX = (cfg.shoulderX ?? BODY.shoulderX) * (cfg.widthScale ?? 1);
  const torsoBag = new PartBag();
  // reaches deep into the pelvis so the waist never opens at full spine bend
  torsoBag.capsule(0.125 * ((cs + 1) / 2), 0.16, 0, 0.06, 0, null, 14);
  const torsoGeo = G(`abdomen_${cfg.geoKey}`, () => { const g = torsoBag.merge(); g.scale(1.2, 1, 0.84); return g; });
  spine.add(mesh(torsoGeo, cfg.jacketMat));
  const chestMesh = mesh(G(`chest_${cfg.geoKey}`, () => {
    const g = new THREE.CapsuleGeometry(0.14 * cs, 0.12, 4, 14);
    g.scale(1.35, 1, 0.82);
    g.translate(0, 0.26, 0);
    // merged joint fillers (no extra draw calls): a neck-base ring behind the
    // rotating neck column and shoulder-socket balls behind the deltoids, so
    // head pitch / arm swing can never open a gap against the torso.
    const ring = new THREE.CylinderGeometry(0.062, 0.068, 0.08, 12);
    ring.translate(0, 0.435, 0);
    const sockL = new THREE.SphereGeometry(0.052 * bulk, 10, 8);
    sockL.translate(-shoulderX, BODY.shoulderUp, 0);
    const sockR = new THREE.SphereGeometry(0.052 * bulk, 10, 8);
    sockR.translate(shoulderX, BODY.shoulderUp, 0);
    return mergeGeos([g, ring, sockL, sockR]);
  }), cfg.jacketMat);
  spine.add(chestMesh);

  // ---- head
  const neck = new THREE.Group();
  neck.position.y = BODY.neckUp;
  spine.add(neck);
  const headG = buildHead(cfg.headStyle, cfg.skinIdx, cfg.headOpts || {});
  neck.add(headG);

  // ---- arms
  // Anti-seam rule used for every limb below: the capsule's end caps sit
  // exactly ON the joint pivots, and the joint ball is centered on the pivot
  // with a radius LARGER than the limb radius — the rotating half-sphere cap
  // then stays inside the ball at any bend angle, so no gap can ever open.
  const armR = 0.052 * bulk, foreR = 0.046 * bulk;
  const sides = {};
  for (const s of [-1, 1]) {
    const key = s < 0 ? 'L' : 'R';
    const sh = new THREE.Group();
    sh.position.set(s * shoulderX, BODY.shoulderUp, 0);
    sh.rotation.order = 'ZXY';
    spine.add(sh);
    const upBag = new PartBag();
    upBag.sphere(0.066 * bulk, 0, -0.008, 0, { x: 1, y: 1.15, z: 1 });   // deltoid
    upBag.capsule(armR, BODY.upperArm, 0, -(BODY.upperArm) / 2, 0);      // caps on both pivots
    sh.add(mesh(G(`uparm_${cfg.geoKey}`, () => upBag.merge()), cfg.jacketMat));
    const elb = new THREE.Group();
    elb.position.y = -BODY.upperArm;
    sh.add(elb);
    const foreBag = new PartBag();
    if (!cfg.forearmSkin) foreBag.sphere(armR + 0.008, 0, 0, 0);         // elbow ball > upper-arm radius
    foreBag.capsule(foreR, BODY.foreArm, 0, -(BODY.foreArm) / 2, 0);     // caps on both pivots
    const foreKey = `forearm_${cfg.geoKey}_${cfg.forearmSkin ? 'skin' : 'slv'}`;
    elb.add(mesh(G(foreKey, () => foreBag.merge()), cfg.forearmSkin ? skinMat(cfg.skinIdx) : cfg.sleeveMat || cfg.jacketMat));
    if (cfg.forearmSkin) {
      // rolled sleeve: the elbow ball lives on the cuff so it reads as fabric
      const cuff = mesh(G(`cuff_${cfg.geoKey}`, () => {
        const b = new PartBag();
        b.sphere(armR + 0.008, 0, 0, 0);
        b.cyl(0.054, 0.052, 0.06, 0, -0.03, 0);
        return b.merge();
      }), cfg.jacketMat);
      elb.add(cuff);
    }
    const hand = new THREE.Group();
    hand.position.y = -BODY.foreArm;
    elb.add(hand);
    const handBag = new PartBag();
    handBag.sphere(foreR + 0.008, 0, -0.004, 0);                         // wrist ball > forearm radius
    handBag.box(0.052, 0.075, 0.062, 0, -0.055, -0.004);                 // palm
    handBag.box(0.05, 0.045, 0.05, 0, -0.098, -0.014, { x: 0.35 });      // curled fingers
    handBag.box(0.02, 0.038, 0.024, s * -0.03, -0.055, -0.024, { z: s * 0.4 }); // thumb
    hand.add(mesh(G(`hand_${key}_${cfg.geoKey}`, () => handBag.merge()), cfg.gloveMat));
    sides[key] = { sh, elb, hand };
  }

  // ---- legs
  const thighR = 0.072 * bulk, shinR = 0.056 * bulk;
  for (const s of [-1, 1]) {
    const key = s < 0 ? 'L' : 'R';
    const hip = new THREE.Group();
    hip.position.set(s * BODY.hipX, -BODY.hipDrop, 0);
    pelvis.add(hip);
    const thighBag = new PartBag();
    thighBag.sphere(0.086 * bulk, 0, -0.008, 0);                         // hip ball > thigh radius
    thighBag.capsule(thighR, BODY.thigh, 0, -BODY.thigh / 2, 0, null, 12); // caps on both pivots
    hip.add(mesh(G(`thigh_${cfg.geoKey}`, () => thighBag.merge()), cfg.pantsMat));
    const knee = new THREE.Group();
    knee.position.y = -BODY.thigh;
    hip.add(knee);
    const shinBag = new PartBag();
    shinBag.sphere(0.078 * bulk, 0, 0, 0);                               // knee ball > thigh radius
    shinBag.capsule(shinR, 0.38, 0, -0.19, 0, null, 12);                 // knee pivot -> deep into the shoe
    knee.add(mesh(G(`shin_${cfg.geoKey}`, () => shinBag.merge()), cfg.pantsMat));
    if (cfg.kneepads) {
      const pad = mesh(G('kneepad', () => {
        const g = new THREE.SphereGeometry(0.055, 10, 8);
        g.scale(1.05, 1.15, 0.7);
        return g;
      }), M.rig());
      pad.position.set(0, -0.012, -0.052);
      knee.add(pad);
    }
    const ankle = new THREE.Group();
    ankle.position.y = -BODY.shin;
    knee.add(ankle);
    let footGeoKey, footBag = new PartBag();
    if (cfg.footKind === 'office') {
      footBag.box(0.082, 0.052, 0.20, 0, -0.036, -0.055);
      footBag.sphere(0.042, 0, -0.042, -0.155, { x: 1, y: 0.85, z: 1.25 });
      footBag.box(0.075, 0.028, 0.06, 0, -0.05, 0.045);
      footBag.cyl(0.058, 0.064, 0.10, 0, 0.025, 0.008);                     // taller ankle collar
      footGeoKey = 'foot_office';
    } else {
      footBag.box(0.105, 0.068, 0.21, 0, -0.028, -0.065);
      footBag.sphere(0.054, 0, -0.028, -0.175, { x: 1, y: 0.98, z: 1.25 }); // toe
      footBag.box(0.105, 0.06, 0.08, 0, -0.032, 0.05);                      // heel
      footBag.cyl(0.072, 0.082, 0.16, 0, 0.06, 0.002);                      // tall cuff
      footBag.box(0.108, 0.022, 0.30, 0, -0.052, -0.05);                    // sole
      footGeoKey = 'foot_boot';
    }
    ankle.add(mesh(G(footGeoKey, () => footBag.merge()), cfg.footMat));
    sides[key].hip = hip;
    sides[key].knee = knee;
    sides[key].ankle = ankle;
  }

  // cargo thigh pockets (merc): children of hips so they track leg swing
  if (cfg.thighPockets) {
    for (const s of [-1, 1]) {
      const p = mesh(G('thigh_pocket', () => new THREE.BoxGeometry(0.035, 0.11, 0.09)), cfg.pantsMat);
      p.position.set(s * (0.072 * bulk + 0.012), -0.24, -0.005);
      sides[s < 0 ? 'L' : 'R'].hip.add(p);
    }
  }

  // ---- outfit-specific gear
  if (cfg.gearBuilder) cfg.gearBuilder({ spine, pelvis, sides, neck });

  return {
    root, rig, pelvis, spine, neck, chestMesh,
    L: sides.L, R: sides.R,
    shoulderX,
  };
}

// --------------------------------------------------------------- gear kits
function gearMerc({ spine, pelvis }) {
  const vest = new PartBag();
  vest.box(0.255, 0.26, 0.06, 0, 0.26, -0.10);              // front plate bag
  vest.box(0.265, 0.28, 0.06, 0, 0.26, 0.10);               // back
  vest.box(0.055, 0.17, 0.19, -0.19, 0.25, 0);              // side straps
  vest.box(0.055, 0.17, 0.19, 0.19, 0.25, 0);
  vest.box(0.055, 0.05, 0.26, -0.09, 0.43, 0, { x: 0.06 }); // shoulder straps
  vest.box(0.055, 0.05, 0.26, 0.09, 0.43, 0, { x: 0.06 });
  const vestMesh = mesh(G('gear_merc_vest', () => vest.merge()), M.vest());
  spine.add(vestMesh);
  const pouches = new PartBag();
  for (const px of [-0.085, 0, 0.085]) pouches.box(0.072, 0.10, 0.05, px, 0.155, -0.125, { x: 0.05 });
  pouches.box(0.12, 0.07, 0.045, -0.055, 0.33, -0.135);     // admin pouch
  pouches.box(0.075, 0.09, 0.055, 0.175, 0.02, 0.07);       // hip dump pouch
  const pouchMesh = mesh(G('gear_merc_pouch', () => pouches.merge()), M.pouch());
  spine.add(pouchMesh);
  const belt = mesh(G('gear_belt', () => {
    const b = new PartBag();
    b.box(0.34, 0.05, 0.03, 0, 0, -0.115);
    b.box(0.34, 0.05, 0.03, 0, 0, 0.115);
    b.box(0.03, 0.05, 0.23, -0.165, 0, 0);
    b.box(0.03, 0.05, 0.23, 0.165, 0, 0);
    return b.merge();
  }), M.leather());
  belt.position.y = 0.055;
  pelvis.add(belt);
}

function gearScout({ spine }) {
  // slim chest rig + hood bundle
  const rigBag = new PartBag();
  rigBag.box(0.075, 0.115, 0.045, -0.055, 0.22, -0.115, { x: 0.06 });
  rigBag.box(0.075, 0.115, 0.045, 0.055, 0.22, -0.115, { x: 0.06 });
  rigBag.box(0.05, 0.032, 0.25, -0.075, 0.415, -0.015, { x: 0.10 });
  rigBag.box(0.05, 0.032, 0.25, 0.075, 0.415, -0.015, { x: 0.10 });
  rigBag.box(0.24, 0.045, 0.03, 0, 0.135, -0.102);
  const rigMesh = mesh(G('gear_scout_rig', () => rigBag.merge()), M.rig());
  spine.add(rigMesh);
  const hood = mesh(G('gear_hood', () => {
    const g = new THREE.SphereGeometry(0.095, 12, 9);
    g.scale(1.25, 0.68, 0.85);
    return g;
  }), M.scoutHoodie());
  hood.position.set(0, 0.40, 0.105);
  spine.add(hood);
}

function gearHeavy({ spine, pelvis, sides }) {
  const plates = new PartBag();
  plates.box(0.335, 0.30, 0.07, 0, 0.27, -0.11);
  plates.box(0.34, 0.31, 0.07, 0, 0.27, 0.11);
  plates.box(0.30, 0.13, 0.06, 0, 0.075, -0.105);           // abdominal plate
  plates.box(0.075, 0.22, 0.22, -0.215, 0.26, 0);
  plates.box(0.075, 0.22, 0.22, 0.215, 0.26, 0);
  plates.cyl(0.098, 0.106, 0.07, 0, 0.465, 0.01, null, 12); // collar guard
  const plateMesh = mesh(G('gear_heavy_plates', () => plates.merge()), M.plate());
  spine.add(plateMesh);
  const pouches = new PartBag();
  for (const px of [-0.09, 0.005, 0.10]) pouches.box(0.075, 0.11, 0.05, px, 0.135, -0.14, { x: 0.05 });
  spine.add(mesh(G('gear_heavy_pouch', () => pouches.merge()), M.pouch()));
  const belt = mesh(G('gear_heavy_belt', () => {
    const b = new PartBag();
    b.box(0.37, 0.06, 0.035, 0, 0, -0.12);
    b.box(0.37, 0.06, 0.035, 0, 0, 0.12);
    b.box(0.035, 0.06, 0.25, -0.18, 0, 0);
    b.box(0.035, 0.06, 0.25, 0.18, 0, 0);
    b.box(0.09, 0.11, 0.06, -0.17, -0.06, 0.05);            // thigh pouch
    return b.merge();
  }), M.leather());
  belt.position.y = 0.05;
  pelvis.add(belt);
  // articulated shoulder plates (children of shoulder pivots)
  for (const key of ['L', 'R']) {
    const sp = mesh(G('gear_shoulder_plate', () => {
      const g = new THREE.SphereGeometry(0.078, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
      g.scale(1.02, 0.95, 1.12);
      return g;
    }), M.plate());
    sp.position.set(0, -0.012, 0);
    sides[key].sh.add(sp);
  }
}

function addArmband(sideGroup, r = 0.064) {
  const band = mesh(G(`armband_${r}`, () => new THREE.CylinderGeometry(r, r + 0.002, 0.055, 10)), M.accent());
  band.position.set(0, -0.145, 0);
  sideGroup.add(band);
  const knot = mesh(boxGeoS(0.022, 0.03, 0.022), M.accent());
  knot.position.set(-(r - 0.008), -0.145, 0);
  sideGroup.add(knot);
}

function addPatch(sideGroup, side) {
  const p = mesh(G('patchplane', () => new THREE.PlaneGeometry(0.055, 0.055)), M.patch(), { cast: false });
  p.position.set(side * 0.0595, -0.10, 0);
  p.rotation.y = side * Math.PI / 2;
  sideGroup.add(p);
}

// ================================================================== ANIM ==
const CH_DEFAULTS = {
  pelvisY: BODY.hipY, pelvisRX: 0, pelvisRZ: 0, rigRY: 0,
  spineRX: 0, spineRY: 0, spineRZ: 0,
  neckRX: 0, neckRY: 0, neckRZ: 0,
  shL_x: 0.08, shL_y: 0, shL_z: -0.07, elbL: 0.12, handL: 0.15,
  shR_x: 0.08, shR_y: 0, shR_z: 0.07, elbR: 0.12, handR: 0.15,
  hipL_x: 0, hipL_z: -0.04, kneeL: -0.06, ankL: 0,
  hipR_x: 0, hipR_z: 0.04, kneeR: -0.06, ankR: 0,
  gunPX: 0.10, gunPY: 0.10, gunPZ: -0.24, gunRX: -0.45, gunRY: 0.10,
};
const CH_KEYS = Object.keys(CH_DEFAULTS);

// Hostage arm IK poses (targets in spine space, mirrored X for L/R).
// captive: palms on the back of the skull, elbows flared out.
// cower: forearms stacked in front of the bowed face.
const ARM_IK_CAPTIVE = { tL: [-0.05, 0.535, 0.12], tR: [0.05, 0.55, 0.115], poleZ: -0.15, poleY: 0.05, poleOut: 1.0 };
const ARM_IK_COWER = { tL: [-0.075, 0.515, -0.20], tR: [0.075, 0.545, -0.185], poleZ: -0.15, poleY: -0.55, poleOut: 0.55 };

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3();
const _gripR = new THREE.Vector3(), _gripL = new THREE.Vector3();
const _m1 = new THREE.Matrix4();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _qGrip = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.35, 0, 0));

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t) {
  const c1 = 1.35, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// two-bone arm IK in spine space; keeps both hands glued to the weapon grips
// in every stance so the gun never floats or clips. Pole hint = elbow
// direction (defaults: out/down/back for a weapon carry).
function solveArm(fig, key, side, target, poleBack, poleY = -0.55, poleOut = 0.85) {
  const sh = fig[key].sh, elb = fig[key].elb;
  const L1 = BODY.upperArm, L2 = BODY.foreArm + 0.045;
  _v1.set(side * fig.shoulderX, BODY.shoulderUp, 0);
  _v2.copy(target).sub(_v1);                     // shoulder -> grip
  const d = clamp(_v2.length(), 0.10, L1 + L2 - 0.008);
  const cosE = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
  const bend = Math.PI - Math.acos(cosE);
  const cosS = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const S = Math.acos(cosS);
  const dir = _v2.normalize();
  _v3.set(side * poleOut, poleY, poleBack ?? 0.35);
  _v4.crossVectors(dir, _v3);                    // arm-plane normal (hinge axis)
  if (_v4.lengthSq() < 1e-5) _v4.set(side, 0, 0);
  _v4.normalize();
  _v5.copy(dir).applyAxisAngle(_v4, S).negate(); // local +Y (arm points -Y)
  _v6.crossVectors(_v4, _v5).normalize();        // local +Z
  _v3.crossVectors(_v5, _v6).normalize();        // re-orthogonalized +X
  _m1.makeBasis(_v3, _v5, _v6);
  sh.quaternion.setFromRotationMatrix(_m1);
  elb.rotation.set(-bend, 0, 0);
}

function alignHandToGun(fig, key, gunMount) {
  const hand = fig[key].hand;
  gunMount.getWorldQuaternion(_q1);
  hand.parent.getWorldQuaternion(_q2).invert();
  hand.quaternion.copy(_q2.multiply(_q1).multiply(_qGrip));
}

// Character controller implementing the shared visual API.
class CharacterVisual {
  constructor(fig, opts) {
    this.fig = fig;
    this.group = fig.root;
    this.kind = opts.kind;                  // 'enemy' | 'hostage'
    this.idHash = hashStr(opts.id);
    this.t = (this.idHash % 1000) / 157;    // desync idle motion between units
    this.phase = (this.idHash % 628) / 100;
    this.moving = false; this.running = false;
    this.moveBlend = 0; this.runBlend = 0;
    this.crouched = false; this.aiming = false;
    this.state = 'idle'; this.feared = false;
    this.dying = false; this.dead = false; this.deathT = 0;
    this.flinchT = 0; this.recoilT = 0;
    this.speedSm = 0;
    this._prevPos = null;
    this._ran = false;
    this._ikW = 0; this._ikPose = null;      // hostage arm-IK blend
    this.cur = { ...CH_DEFAULTS };
    this.tgt = { ...CH_DEFAULTS };
    this.gun = opts.gun || null;            // { group, bLen, foreZ }
    this.gunMount = opts.gunMount || null;
    // nodes captured for the death slerp
    const f = fig;
    this._nodes = [f.pelvis, f.spine, f.neck, f.L.sh, f.L.elb, f.L.hand, f.R.sh, f.R.elb, f.R.hand,
      f.L.hip, f.L.knee, f.L.ankle, f.R.hip, f.R.knee, f.R.ankle];
    if (this.gunMount) this._nodes.push(this.gunMount);
  }

  // ------------------------------------------------------------ public api
  setMoving(m, run) { this.moving = !!m; this.running = !!run; }
  setCrouch(c) { this.crouched = !!c; }
  setAim(a) { this.aiming = !!a; }
  setState(s, feared) { this.state = s; this.feared = !!feared; }

  die() {
    if (this.dying || this.dead) return;
    this.dying = true;
    this.deathT = 0;
    const f = this.idHash;
    this.deathVariant = f % 2;              // 0 = backward, 1 = forward crumple
    this._snapA = this._capture();
    // build target pose by applying end channels once, capture, then restore
    const end = this._deathPose();
    applyChannels(this.fig, end, this.gunMount);
    this._snapB = this._capture();
    this._restore(this._snapA);
  }

  update(dt) {
    dt = clamp(dt, 0, 0.1);
    if (this.dead) return;
    this.t += dt;

    // measured horizontal speed (AI moves the group externally)
    const gp = this.group.position;
    if (this._prevPos && dt > 0) {
      const spd = Math.hypot(gp.x - this._prevPos.x, gp.z - this._prevPos.z) / dt;
      const s = spd > 4.6 ? this.speedSm : spd;   // ignore teleports
      this.speedSm += (s - this.speedSm) * clamp01(dt * 10);
    }
    if (!this._prevPos) this._prevPos = { x: gp.x, z: gp.z };
    else { this._prevPos.x = gp.x; this._prevPos.z = gp.z; }

    if (this.dying) { this._updateDeath(dt); return; }

    this.flinchT = Math.max(0, this.flinchT - dt);
    this.recoilT = Math.max(0, this.recoilT - dt * 7);
    const k = this._ran ? 1 - Math.exp(-dt * 9) : 1;
    this._ran = true;
    this.moveBlend += ((this.moving ? 1 : 0) - this.moveBlend) * (this.moving ? k : 1 - Math.exp(-dt * 5));
    this.runBlend += ((this.running ? 1 : 0) - this.runBlend) * k;

    this._computeTarget(this.tgt);
    const cur = this.cur;
    for (const key of CH_KEYS) cur[key] += (this.tgt[key] - cur[key]) * k;
    applyChannels(this.fig, cur, this.gunMount);
    this._applyCycle(dt);
    this._applyIdleMotion();
    if (this.gunMount && this.gun) this._solveWeaponHands();
    else if (this.kind === 'hostage') this._solveHostageArms(k);
  }

  // -------------------------------------------------------------- internal
  _computeTarget(T) {
    Object.assign(T, CH_DEFAULTS);
    if (this.kind === 'enemy') this._enemyTarget(T);
    else this._hostageTarget(T);
  }

  _enemyTarget(T) {
    const aim = this.aiming, crouch = this.crouched;
    // stance
    T.hipL_z = -0.05; T.hipR_z = 0.05;
    T.spineRX = -0.03 - this.runBlend * 0.14 - this.moveBlend * 0.03;
    if (this.gun) {
      const b = this.gun.bLen;
      if (aim) {
        T.gunPX = 0.088; T.gunPY = 0.355; T.gunPZ = -(0.10 + b);
        T.gunRX = 0; T.gunRY = 0;
        T.neckRX = -0.10; T.neckRY = -0.06; T.neckRZ = 0.05;
        T.spineRY = -0.10;
      } else {
        T.gunPX = 0.105; T.gunPY = crouch ? 0.17 : 0.11; T.gunPZ = -(0.16 + b * 0.7);
        T.gunRX = crouch ? -0.32 : -0.48; T.gunRY = 0.12;
      }
    }
    if (crouch) {
      T.pelvisY = BODY.hipY - 0.43;
      T.hipL_x = 1.02; T.hipR_x = 1.14;
      T.kneeL = -1.92; T.kneeR = -2.02;
      T.ankL = 0.88; T.ankR = 0.86;
      T.hipL_z = -0.16; T.hipR_z = 0.16;
      T.spineRX += -0.10;
      T.pelvisRX = -0.06;
    }
    if (this.flinchT > 0) {
      const f = this.flinchT / 0.22;
      T.spineRX += -0.16 * f;
      T.spineRZ += 0.1 * f * ((this.idHash & 1) ? 1 : -1);
      T.neckRX += -0.2 * f;
    }
  }

  _hostageTarget(T) {
    const s = this.state;
    const worried = -0.07;
    T.spineRX = worried;
    T.neckRX = -0.10;
    T.shL_x = 0.16; T.shR_x = 0.16; T.elbL = 0.35; T.elbR = 0.35;
    T.shL_z = -0.10; T.shR_z = 0.10;
    if (this.moveBlend > 0.35) {
      // travelling: upright walk, arms handled by the cycle
      T.spineRX = -0.05 - this.runBlend * 0.1;
      T.neckRX = -0.04;
    } else if (s === 'captive') {
      // kneeling; hands-behind-head arms are IK-solved in _solveHostageArms,
      // these channels are only the blend base for transitions
      T.pelvisY = 0.52;
      T.pelvisRX = -0.04;
      T.hipL_x = 0.10; T.hipR_x = 0.14;
      T.hipL_z = -0.13; T.hipR_z = 0.13;
      T.kneeL = -1.62; T.kneeR = -1.66;
      T.ankL = 0.95; T.ankR = 0.95;
      T.spineRX = -0.12;
      T.neckRX = -0.16;
      T.shL_z = -0.45; T.shR_z = 0.45;
      T.shL_x = 0.3; T.shR_x = 0.3;
      T.elbL = 1.7; T.elbR = 1.7;
      T.handL = 0.45; T.handR = 0.45;
    } else if (s === 'extracted') {
      T.spineRX = 0.03;
      T.neckRX = 0.06;
      T.shL_x = 0.10; T.shR_x = 0.10; T.elbL = 0.2; T.elbR = 0.2;
    }
    if (this.feared && this.moveBlend < 0.6) {
      // cower: head down, arms shielding the face (IK refines hand placement)
      if (s !== 'captive') {
        T.pelvisY = BODY.hipY - 0.16;
        T.hipL_x = 0.5; T.hipR_x = 0.56; T.kneeL = -0.85; T.kneeR = -0.95;
        T.ankL = 0.35; T.ankR = 0.4;
      }
      T.spineRX = -0.34;
      T.neckRX = -0.42;
      T.shL_z = -0.35; T.shR_z = 0.35;
      T.shL_x = 1.5; T.shR_x = 1.6;
      T.elbL = 2.1; T.elbR = 2.0;
      T.handL = 0.4; T.handR = 0.4;
    }
  }

  _applyCycle(dt) {
    const m = this.moveBlend;
    const f = this.fig;
    if (m < 0.01) { this.phase += dt * 2 * m; return; }
    const spd = Math.max(0.35, this.speedSm);
    const stepLen = 0.52 + 0.115 * spd;
    this.phase += dt * (Math.PI * spd / stepLen);
    const ph = this.phase;
    const armed = !!this.gun;
    const amp = m * clamp(0.30 + 0.075 * spd, 0.3, 0.62);
    const kneeAmp = m * clamp(0.5 + 0.24 * spd, 0.5, 1.5);
    const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
    const lift = (x) => { const v = Math.sin(x); return v > 0 ? v * v : 0; };

    f.L.hip.rotation.x += amp * sL;
    f.R.hip.rotation.x += amp * sR;
    f.L.knee.rotation.x += -kneeAmp * lift(ph + Math.PI * 0.72) - 0.08 * m;
    f.R.knee.rotation.x += -kneeAmp * lift(ph + Math.PI * 1.72) - 0.08 * m;
    f.L.ankle.rotation.x += -amp * 0.45 * sL + kneeAmp * 0.32 * lift(ph + Math.PI * 0.72);
    f.R.ankle.rotation.x += -amp * 0.45 * sR + kneeAmp * 0.32 * lift(ph + Math.PI * 1.72);

    const bob = (0.022 + 0.02 * this.runBlend) * m;
    f.pelvis.position.y += -bob * 0.5 * (1 - Math.cos(2 * ph));
    f.pelvis.rotation.z += 0.03 * m * Math.sin(ph);
    f.spine.rotation.y += (armed ? 0.03 : 0.075) * m * Math.sin(ph);
    f.spine.rotation.x += -0.02 * m * (1 - Math.cos(2 * ph));
    f.neck.rotation.x += 0.03 * m * (1 - Math.cos(2 * ph));

    if (armed) {
      // two-handed carry: bob the mount, arms follow via IK
      if (this.gunMount) {
        this.gunMount.position.y += 0.012 * m * Math.sin(2 * ph + 0.6);
        this.gunMount.rotation.x += 0.03 * m * Math.sin(2 * ph);
        this.gunMount.rotation.z += 0.02 * m * Math.sin(ph);
      }
    } else {
      const armAmp = amp * (this.feared ? 0.25 : 0.8);
      f.L.sh.rotation.x += armAmp * sR;
      f.R.sh.rotation.x += armAmp * sL;
      f.L.elb.rotation.x += 0.3 * m + 0.25 * amp * lift(ph + Math.PI);
      f.R.elb.rotation.x += 0.3 * m + 0.25 * amp * lift(ph);
    }
  }

  _applyIdleMotion() {
    const f = this.fig;
    const idle = 1 - this.moveBlend;
    // breathing: chest scale + slight shoulder rise
    const rate = this.state === 'extracted' ? 1.5 : this.feared ? 4.2 : 2.0;
    const b = Math.sin(this.t * rate) * (0.5 + 0.5 * idle);
    f.chestMesh.scale.set(1 + 0.008 * b, 1 + 0.012 * b, 1 + 0.02 * b);
    f.spine.position.y = BODY.spineUp + 0.003 * b;
    if (this.feared) f.neck.rotation.x += 0.02 * Math.sin(this.t * 13); // tremble
    if (this.kind === 'enemy') {
      if (!this.aiming && idle > 0.5 && !this.crouched) {
        f.neck.rotation.y += 0.22 * idle * Math.sin(this.t * 0.42 + this.idHash % 7);
      }
      if (this.gunMount) {
        const sway = this.aiming ? 0.3 : 1;
        this.gunMount.rotation.x += (0.014 * Math.sin(this.t * 1.15) + 0.006 * Math.sin(this.t * 2.3)) * sway;
        this.gunMount.rotation.y += 0.010 * Math.sin(this.t * 0.83 + 1.7) * sway;
        if (this.recoilT > 0) {
          this.gunMount.rotation.x += 0.09 * this.recoilT;
          this.gunMount.position.z += 0.018 * this.recoilT;
        }
      }
    } else if (this.state === 'waiting' || this.state === 'following') {
      f.neck.rotation.y += 0.3 * idle * Math.sin(this.t * 0.6 + this.idHash % 5);
    }
  }

  _solveWeaponHands() {
    const f = this.fig, gm = this.gunMount;
    // grip targets in spine space (gunMount is a child of spine)
    _q1.setFromEuler(gm.rotation);
    _gripR.set(0, 0.005, 0.02).applyQuaternion(_q1).add(gm.position);
    // fore grip: on long barrels (or low-ready angles) the handguard point
    // can exceed arm reach — slide the left hand back along the rail to the
    // furthest reachable point instead of letting the IK clamp mid-air.
    _v1.set(0, 0, -1).applyQuaternion(_q1);                          // barrel fwd
    _gripL.set(0, -0.006, 0).applyQuaternion(_q1).add(gm.position);  // rail base
    _v2.set(-f.shoulderX, BODY.shoulderUp, 0).sub(_gripL);           // -> shoulder
    const maxR = BODY.upperArm + BODY.foreArm - 0.01;
    const along = _v2.dot(_v1);
    const disc = maxR * maxR - _v2.lengthSq() + along * along;
    let u = -this.gun.foreZ;
    u = disc >= 0 ? Math.min(u, along + Math.sqrt(disc)) : Math.min(u, Math.max(0.09, along));
    _gripL.addScaledVector(_v1, clamp(u, 0.09, -this.gun.foreZ));
    solveArm(f, 'R', 1, _gripR, 0.30);
    solveArm(f, 'L', -1, _gripL, 0.55);
    alignHandToGun(f, 'R', gm);
    alignHandToGun(f, 'L', gm);
  }

  // Precise hand placement for captive (hands behind head) and cower
  // (arms shielding the face); blends over the FK pose so entering/leaving
  // the state or starting to walk never pops.
  _solveHostageArms(k) {
    const stationary = this.moveBlend < 0.6;
    const pose = stationary
      ? (this.feared ? ARM_IK_COWER : this.state === 'captive' ? ARM_IK_CAPTIVE : null)
      : null;
    this._ikW += ((pose ? 1 : 0) - this._ikW) * k;
    if (pose) this._ikPose = pose;
    const p = this._ikPose;
    if (!p || this._ikW < 0.02) return;
    if (!this._ikTL) { this._ikTL = new THREE.Vector3().fromArray(p.tL); this._ikTR = new THREE.Vector3().fromArray(p.tR); }
    _gripL.fromArray(p.tL); this._ikTL.lerp(_gripL, k);
    _gripR.fromArray(p.tR); this._ikTR.lerp(_gripR, k);
    const f = this.fig, w = this._ikW;
    _q1.copy(f.L.sh.quaternion); _q2.copy(f.R.sh.quaternion);
    const eL = f.L.elb.rotation.x, eR = f.R.elb.rotation.x;
    solveArm(f, 'L', -1, this._ikTL, p.poleZ, p.poleY, p.poleOut);
    solveArm(f, 'R', 1, this._ikTR, p.poleZ, p.poleY, p.poleOut);
    if (w < 0.999) {
      f.L.sh.quaternion.slerp(_q1, 1 - w);
      f.R.sh.quaternion.slerp(_q2, 1 - w);
      f.L.elb.rotation.x = f.L.elb.rotation.x * w + eL * (1 - w);
      f.R.elb.rotation.x = f.R.elb.rotation.x * w + eR * (1 - w);
    }
  }

  _capture() {
    const snap = { q: [], pelvisPos: this.fig.pelvis.position.clone(), rigRY: this.fig.rig.rotation.y };
    if (this.gunMount) snap.gunPos = this.gunMount.position.clone();
    for (const n of this._nodes) snap.q.push(n.quaternion.clone());
    return snap;
  }

  _restore(s) {
    this._nodes.forEach((n, i) => n.quaternion.copy(s.q[i]));
    this.fig.pelvis.position.copy(s.pelvisPos);
    this.fig.rig.rotation.y = s.rigRY;
    if (this.gunMount && s.gunPos) this.gunMount.position.copy(s.gunPos);
  }

  _deathPose() {
    const T = { ...CH_DEFAULTS };
    const j = (this.idHash % 100) / 100 - 0.5; // deterministic jitter
    if (this.deathVariant === 0) {
      // backward fall, slight twist, one knee drawn up
      T.pelvisY = 0.145;
      T.pelvisRX = 1.52;
      T.pelvisRZ = 0.14 * j;
      T.rigRY = 0.55 + 0.5 * j;
      T.spineRX = -0.10; T.spineRZ = 0.12 + 0.1 * j;
      T.neckRX = -0.3; T.neckRY = 0.45; T.neckRZ = 0.1;
      T.shL_z = -1.15; T.shL_x = 0.25; T.elbL = 0.5; 
      T.shR_z = 0.55; T.shR_x = 0.4; T.elbR = 0.85;
      T.hipL_x = 0.28; T.hipL_z = -0.18; T.kneeL = -0.85; T.ankL = 0.4;
      T.hipR_x = -0.06; T.hipR_z = 0.12; T.kneeR = -0.25; T.ankR = 0.55;
      T.gunPX = 0.16; T.gunPY = 0.22; T.gunPZ = -0.16;
      T.gunRX = -0.4; T.gunRY = 0.8;
    } else {
      // forward crumple over the knees
      T.pelvisY = 0.34;
      T.pelvisRX = -0.92;
      T.pelvisRZ = 0.2 * j;
      T.rigRY = -0.4 + 0.6 * j;
      T.spineRX = -0.55; T.spineRZ = -0.1;
      T.neckRX = -0.35; T.neckRY = -0.5;
      T.shL_z = -0.5; T.shL_x = 2.3; T.elbL = 0.35;
      T.shR_z = 0.7; T.shR_x = 2.1; T.elbR = 0.5;
      T.hipL_x = 1.45; T.hipL_z = -0.12; T.kneeL = -2.25; T.ankL = 0.8;
      T.hipR_x = 1.3; T.hipR_z = 0.14; T.kneeR = -2.1; T.ankR = 0.75;
      T.gunPX = 0.12; T.gunPY = 0.1; T.gunPZ = -0.3;
      T.gunRX = -0.9; T.gunRY = 0.4;
    }
    return T;
  }

  // enemy.js forwards update() for ~0.42 s after death — finish within that.
  _updateDeath(dt) {
    this.deathT += dt / 0.38;
    const t = clamp01(this.deathT);
    const tTorso = easeOut(clamp01(t / 0.85));
    const tLimbs = easeOutBack(clamp01((t - 0.08) / 0.92));
    const a = this._snapA, b = this._snapB;
    this._nodes.forEach((n, i) => {
      const w = (i < 3) ? tTorso : tLimbs;   // pelvis/spine/neck lead
      n.quaternion.slerpQuaternions(a.q[i], b.q[i], w);
    });
    this.fig.pelvis.position.lerpVectors(a.pelvisPos, b.pelvisPos, tTorso);
    this.fig.rig.rotation.y = a.rigRY + (b.rigRY - a.rigRY) * tTorso;
    if (this.gunMount && a.gunPos && b.gunPos) this.gunMount.position.lerpVectors(a.gunPos, b.gunPos, tLimbs);
    if (t >= 1) { this.dead = true; this.dying = false; }
  }

  // instant crumple used when the AI kills a hostage (it rotates the whole
  // group itself and stops calling update, so we pose limbs in one shot)
  collapseInstant() {
    if (this.dead) return;
    this.dead = true;
    const T = { ...CH_DEFAULTS };
    T.pelvisY = 0.86;
    T.spineRX = -0.2; T.spineRZ = 0.15;
    T.neckRX = -0.25; T.neckRY = 0.6;
    T.shL_z = -0.9; T.shL_x = 0.6; T.elbL = 0.9;
    T.shR_z = 0.35; T.shR_x = 0.2; T.elbR = 0.3;
    T.hipL_x = 0.35; T.kneeL = -0.75; T.hipR_x = -0.05; T.kneeR = -0.3;
    T.hipL_z = -0.15; T.hipR_z = 0.1;
    applyChannels(this.fig, T, null);
  }
}

function applyChannels(f, c, gunMount) {
  f.pelvis.position.y = c.pelvisY;
  f.pelvis.rotation.set(c.pelvisRX, 0, c.pelvisRZ);
  f.rig.rotation.y = c.rigRY;
  f.spine.rotation.set(c.spineRX, c.spineRY, c.spineRZ);
  f.neck.rotation.set(c.neckRX, c.neckRY, c.neckRZ);
  f.L.sh.rotation.set(c.shL_x, c.shL_y, c.shL_z);
  f.R.sh.rotation.set(c.shR_x, c.shR_y, c.shR_z);
  f.L.elb.rotation.set(c.elbL, 0, 0);
  f.R.elb.rotation.set(c.elbR, 0, 0);
  f.L.hand.rotation.set(c.handL, 0, 0);
  f.R.hand.rotation.set(c.handR, 0, 0);
  f.L.hip.rotation.set(c.hipL_x, 0, c.hipL_z);
  f.R.hip.rotation.set(c.hipR_x, 0, c.hipR_z);
  f.L.knee.rotation.set(c.kneeL, 0, 0);
  f.R.knee.rotation.set(c.kneeR, 0, 0);
  f.L.ankle.rotation.set(c.ankL, 0, 0);
  f.R.ankle.rotation.set(c.ankR, 0, 0);
  if (gunMount) {
    gunMount.position.set(c.gunPX, c.gunPY, c.gunPZ);
    gunMount.rotation.set(c.gunRX, c.gunRY, 0);
  }
}

// ------------------------------------------------------- damage-feedback bus
// enemy.js/hostage.js emit these; we hook them once for flinch/recoil and the
// hostage instant-crumple (the hostage AI stops calling update on death).
const LIVE = { enemy: new Map(), hostage: new Map() };
let _busHooked = false;
function hookBus() {
  if (_busHooked) return;
  _busHooked = true;
  bus.on('enemy-damaged', (e) => { const v = LIVE.enemy.get(e.id); if (v && !v.dying && !v.dead) v.flinchT = 0.22; });
  bus.on('enemy-fired', (e) => { const v = LIVE.enemy.get(e.id); if (v) v.recoilT = 1; });
  bus.on('hostage-died', (e) => { LIVE.hostage.get(e.id)?.collapseInstant(); });
}

// ================================================================ BUILDERS =
const HEAD_STYLES = ['bala', 'beard', 'cap', 'helmet'];

function headForEnemy(outfit, id) {
  const h = hashStr(id);
  if (outfit === 'heavy') return { style: 'helmet', opts: { redBand: true } };
  if (outfit === 'scout') {
    return (h >> 3) % 2 === 0
      ? { style: 'beard', opts: {} }
      : { style: 'bala', opts: { shemagh: true } };
  }
  return { style: HEAD_STYLES[h % 3], opts: {} };
}

function pruneLive(map) {
  if (map.size < 64) return;
  for (const [k, v] of map) { if (!v.group.parent) map.delete(k); }
}

export function buildEnemy(outfit = 'merc', weaponId = 'vesper', id = 'enemy') {
  hookBus();
  pruneLive(LIVE.enemy);
  const h = hashStr(id + outfit);
  const skinIdx = h % SKIN_TONES.length;
  const head = headForEnemy(outfit, id);
  const cfgs = {
    merc: {
      geoKey: 'merc', bulk: 1.0, chestScale: 1.0,
      jacketMat: M.mercJacket(), pantsMat: M.mercPants(),
      gloveMat: M.leather(), footMat: M.leather(),
      gearBuilder: gearMerc, thighPockets: true,
    },
    scout: {
      geoKey: 'scout', bulk: 0.92, chestScale: 0.94,
      jacketMat: M.scoutHoodie(), pantsMat: M.scoutPants(),
      gloveMat: M.leather(), footMat: M.leather(),
      gearBuilder: gearScout, kneepads: true,
    },
    heavy: {
      geoKey: 'heavy', bulk: 1.14, chestScale: 1.12,
      jacketMat: M.heavySuit(), pantsMat: M.heavySuit(),
      gloveMat: M.leather(), footMat: M.leather(),
      gearBuilder: gearHeavy,
    },
  };
  const cfg = cfgs[outfit] || cfgs.merc;
  cfg.skinIdx = skinIdx;
  cfg.headStyle = head.style;
  cfg.headOpts = head.opts;
  const fig = buildFigure(cfg);
  fig.root.name = 'char_' + id;

  // team accent: red armband (heavy carries the red band on the helmet)
  if (outfit !== 'heavy') addArmband(fig.L.sh, outfit === 'scout' ? 0.058 : 0.064);
  addPatch(fig.R.sh, 1);

  const gun = buildWeapon(weaponId);
  const gunMount = new THREE.Group();
  gunMount.name = 'gunMount';
  gunMount.add(gun.group);
  fig.spine.add(gunMount);

  const vis = new CharacterVisual(fig, { kind: 'enemy', id, gun, gunMount });
  LIVE.enemy.set(id, vis);
  vis.update(0.001); // settle initial pose
  return apiOf(vis);
}

export function buildHostage(variant = 'analyst', id = 'hostage') {
  hookBus();
  pruneLive(LIVE.hostage);
  const isManager = variant === 'manager';
  const cfg = isManager ? {
    geoKey: 'manager', bulk: 1.02, chestScale: 1.04,
    jacketMat: M.waistcoat(), sleeveMat: M.shirtWhite(), pantsMat: M.trousersDark(),
    gloveMat: skinMat(1), footMat: M.shoes(), footKind: 'office',
    skinIdx: 1, headStyle: 'hairB',
  } : {
    geoKey: 'analyst', bulk: 0.88, chestScale: 0.92, widthScale: 0.93,
    jacketMat: M.shirtBlue(), pantsMat: M.trousersDark(),
    gloveMat: skinMat(0), footMat: M.shoes(), footKind: 'office',
    skinIdx: 0, headStyle: 'hairA', forearmSkin: true,
  };
  // sleeves: manager keeps white shirt arms under the waistcoat
  if (isManager) cfg.forearmSkin = false;
  const fig = buildFigure(cfg);
  fig.root.name = 'char_' + id;

  // upper-arm sleeves for the manager need shirt material: swap arm meshes'
  // material where the waistcoat should not cover (arms are shirt).
  if (isManager) {
    for (const key of ['L', 'R']) {
      const m = fig[key].sh.children.find((o) => o.isMesh);
      if (m) m.material = M.shirtWhite();
      const fm = fig[key].elb.children.find((o) => o.isMesh);
      if (fm) fm.material = M.shirtWhite();
    }
  }

  // collar
  const collar = mesh(G('collar', () => new THREE.CylinderGeometry(0.062, 0.070, 0.05, 12)), isManager ? M.shirtWhite() : M.shirtBlue());
  collar.position.set(0, 0.465, 0);
  fig.spine.add(collar);

  if (isManager) {
    const knot = mesh(boxGeoS(0.042, 0.045, 0.02), M.tie());
    knot.position.set(0, 0.40, -0.105);
    knot.rotation.x = 0.12;
    fig.spine.add(knot);
    const blade = mesh(boxGeoS(0.052, 0.24, 0.012), M.tie());
    blade.position.set(0, 0.265, -0.126);
    blade.rotation.x = 0.10;
    fig.spine.add(blade);
    const shirtV = mesh(boxGeoS(0.085, 0.13, 0.012), M.shirtWhite());
    shirtV.position.set(0, 0.375, -0.118);
    shirtV.rotation.x = 0.08;
    fig.spine.add(shirtV);
  } else {
    // lanyard + badge
    const straps = mesh(G('lanyard_straps', () => {
      const b = new PartBag();
      b.box(0.014, 0.155, 0.005, -0.032, 0.335, -0.118, { z: 0.16, x: 0.06 });
      b.box(0.014, 0.155, 0.005, 0.032, 0.335, -0.118, { z: -0.16, x: 0.06 });
      return b.merge();
    }), M.lanyard(), { cast: false });
    fig.spine.add(straps);
    const badge = mesh(G('badge', () => new THREE.PlaneGeometry(0.055, 0.075)), M.badge(), { cast: false });
    badge.position.set(0, 0.235, -0.121);
    badge.rotation.x = -0.1;
    badge.rotation.y = Math.PI; // plane faces +Z by default; flip to face -Z
    fig.spine.add(badge);
  }

  const vis = new CharacterVisual(fig, { kind: 'hostage', id });
  vis.state = 'captive';
  LIVE.hostage.set(id, vis);
  vis.update(0.001);
  return apiOf(vis);
}

function apiOf(vis) {
  return {
    group: vis.group,
    setMoving: (m, r) => vis.setMoving(m, r),
    setCrouch: (c) => vis.setCrouch(c),
    setAim: (a) => vis.setAim(a),
    setState: (s, f) => vis.setState(s, f),
    die: () => vis.die(),
    update: (dt) => vis.update(dt),
    _vis: vis, // debug/QA introspection only
  };
}

export function installCharacters(game) {
  game.characters = { buildEnemy, buildHostage };
}

// ================================================================ REGISTRY =
// Gallery pedestal camera looks from (+X,+Z); face the sample toward it.
const GALLERY_FACING = -Math.PI * 0.75;
function settled(api, steps = 8) {
  for (let i = 0; i < steps; i++) api.update(0.08);
  api.group.rotation.y = GALLERY_FACING;
  return api.group;
}

registerAsset({
  id: 'char_enemy_merc', name: 'Kestrel mercenary (softshell + plate carrier)',
  category: 'character', agent: 'fable4', dims: '1.78m tall',
  build: () => settled(buildEnemy('merc', 'bdr15', 'gallery_merc')),
});
registerAsset({
  id: 'char_enemy_scout', name: 'Kestrel scout (hoodie + chest rig)',
  category: 'character', agent: 'fable4', dims: '1.78m tall',
  build: () => settled(buildEnemy('scout', 'vesper', 'gallery_scout')),
});
registerAsset({
  id: 'char_enemy_heavy', name: 'Kestrel heavy (armor plates + helmet)',
  category: 'character', agent: 'fable4', dims: '1.78m tall',
  build: () => settled(buildEnemy('heavy', 'havelock', 'gallery_heavy')),
});
registerAsset({
  id: 'char_head_variants', name: 'Hostile head variants (balaclava / beanie / cap / helmet)',
  category: 'character', agent: 'fable4', dims: 'bust lineup',
  build: () => {
    const g = new THREE.Group();
    g.rotation.y = GALLERY_FACING;
    const tones = [0, 1, 2, 0];
    HEAD_STYLES.forEach((style, i) => {
      const stand = new THREE.Group();
      stand.position.set(-0.75 + i * 0.5, 1.18, 0);
      const post = mesh(G('bust_post', () => new THREE.CylinderGeometry(0.03, 0.05, 1.18, 8)), M.rig());
      post.position.y = -0.59;
      stand.add(post);
      const shoulders = mesh(G('bust_sh', () => {
        const geo = new THREE.CapsuleGeometry(0.075, 0.24, 4, 10);
        geo.rotateZ(Math.PI / 2);
        return geo;
      }), M.vest());
      shoulders.position.y = -0.06;
      stand.add(shoulders);
      stand.add(buildHead(style, tones[i], style === 'helmet' ? { redBand: true } : (style === 'bala' ? { shemagh: true } : {})));
      g.add(stand);
    });
    return g;
  },
});
registerAsset({
  id: 'char_hostage_analyst', name: 'Hostage — analyst (blue shirt + lanyard)',
  category: 'character', agent: 'fable4', dims: '1.78m tall',
  build: () => {
    const api = buildHostage('analyst', 'gallery_analyst');
    api.setState('waiting', false);
    return settled(api);
  },
});
registerAsset({
  id: 'char_hostage_manager', name: 'Hostage — manager (waistcoat + tie)',
  category: 'character', agent: 'fable4', dims: '1.78m tall',
  build: () => {
    const api = buildHostage('manager', 'gallery_manager');
    api.setState('waiting', false);
    return settled(api);
  },
});
