// The fictional air-defence site: terrain, distant ranges, command shelter,
// radar installation, roads, perimeter and support clutter. All geometry is
// procedural and shares the material library.
//
// Every unit designation, board, placard and painted marking below is invented
// for the demo. Nothing here mirrors a real installation or a real procedure.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Noise2D } from './core/rng.js';
import { mats } from './core/materials.js';
import * as T from './core/textures.js';
import * as K from './core/kit.js';
import { mergeStatic, markDynamic } from './core/merge.js';

export const BASE_FLAT_RADIUS = 170;
export const PAD_POSITIONS = {
  patriot: new THREE.Vector3(-52, 0, -30),
  thaad: new THREE.Vector3(4, 0, -70),
  sentinel: new THREE.Vector3(58, 0, -38),
};
export const SHELTER_ORIGIN = new THREE.Vector3(-20, 0, 22);
export const RADAR_ORIGIN = new THREE.Vector3(32, 0, -6);
export const PLAYER_SPAWN = new THREE.Vector3(-6, 0, 34);

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Signage atlases
//
// Every board on the site is one cell of a single canvas, and every painted
// ground marking is one cell of a second canvas. Meshes select a cell by
// remapping their UVs, so all site signage collapses to two draw calls once the
// static merge runs. Text, unit names and designations are all fictional.
// ---------------------------------------------------------------------------

const SIGN_COLS = 4;
const SIGN_ROWS = 8;
const SIGN_FACES = [
  ['RESTRICTED', 'AREA', 'red'],
  ['AUTHORISED', 'PERSONNEL ONLY', 'red'],
  ['NO', 'SMOKING', 'red'],
  ['RF HAZARD', 'DO NOT APPROACH', 'yellow'],
  ['HIGH', 'VOLTAGE', 'yellow'],
  ['DANGER', 'OVERHEAD CABLES', 'yellow'],
  ['HEARING', 'PROTECTION', 'blue'],
  ['EYE', 'PROTECTION', 'blue'],
  ['FIRE', 'POINT', 'red'],
  ['MUSTER', 'POINT', 'green'],
  ['FIRST AID', 'STATION', 'green'],
  ['KEEP CLEAR', 'OF DOORWAY', 'white'],
  ['C2 SHELTER', 'F D C  3', 'plate'],
  ['SITE 4', 'AEGIS LINE', 'plate'],
  ['TASK GROUP', 'VERMILION', 'plate'],
  ['RADAR', 'T G - 9', 'plate'],
  ['GEN SET', 'No 2', 'plate'],
  ['FUEL POINT', 'NO NAKED FLAME', 'red'],
  ['STORES', 'SECTION 2', 'plate'],
  ['CABLE DUCT', 'DO NOT DIG', 'yellow'],
  ['DRAINAGE', 'SUMP', 'white'],
  ['GATE 1', 'REPORT TO GUARD', 'white'],
  ['SPEED LIMIT', '1 5', 'white'],
  ['EMERGENCY', 'STOP', 'red'],
  ['COOLANT', 'SKID 1', 'plate'],
  ['BLAST HAZARD', 'KEEP BACK 30 M', 'yellow'],
  ['NO', 'ENTRY', 'red'],
  ['EARTH', 'BONDING POINT', 'yellow'],
  ['ANTENNA', 'FARM 1', 'plate'],
  ['WASTE', 'SEGREGATE', 'white'],
  ['CAUTION', 'MOVING MACHINERY', 'yellow'],
  ['CONTROLLED AREA', 'PASS REQUIRED', 'red'],
];

const SIGN_STYLES = {
  red: { bg: '#ddd8cc', ink: '#a8271c', border: '#a8271c' },
  yellow: { bg: '#d2a821', ink: '#191712', border: '#191712' },
  blue: { bg: '#22508a', ink: '#e6ecf2', border: '#e6ecf2' },
  green: { bg: '#2c7048', ink: '#e6ecdf', border: '#e6ecdf' },
  white: { bg: '#d6d2c6', ink: '#23241f', border: '#23241f' },
  plate: { bg: '#3d4536', ink: '#cdd3bf', border: '#79805f' },
};

let _signTex = null;
let _signMat = null;

function signTexture() {
  if (_signTex) return _signTex;
  const CW = 256;
  const CH = 128;
  const c = document.createElement('canvas');
  c.width = SIGN_COLS * CW;
  c.height = SIGN_ROWS * CH;
  const ctx = c.getContext('2d');
  for (let i = 0; i < SIGN_COLS * SIGN_ROWS; i++) {
    const face = SIGN_FACES[i % SIGN_FACES.length];
    const st = SIGN_STYLES[face[2]] || SIGN_STYLES.white;
    const ox = (i % SIGN_COLS) * CW;
    const oy = Math.floor(i / SIGN_COLS) * CH;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = st.bg;
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = st.border;
    ctx.lineWidth = 5;
    ctx.strokeRect(7, 7, CW - 14, CH - 14);
    ctx.fillStyle = st.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fit = (text, size, y) => {
      let s = size;
      ctx.font = `bold ${s}px "Arial Narrow", Impact, sans-serif`;
      while (ctx.measureText(text).width > CW - 34 && s > 10) {
        s -= 2;
        ctx.font = `bold ${s}px "Arial Narrow", Impact, sans-serif`;
      }
      ctx.fillText(text, CW / 2, y);
    };
    if (face[1]) {
      fit(face[0], 34, CH * 0.38);
      fit(face[1], 26, CH * 0.66);
    } else {
      fit(face[0], 40, CH * 0.5);
    }
    if (face[2] === 'plate') {
      ctx.fillStyle = 'rgba(200,205,190,0.55)';
      for (const [bx, by] of [[15, 15], [CW - 15, 15], [15, CH - 15], [CW - 15, CH - 15]]) {
        ctx.beginPath();
        ctx.arc(bx, by, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // weathering: dust wash, streaks and chipped paint over the whole sheet
  const rnd = (() => {
    let a = 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  for (let i = 0; i < 900; i++) {
    const x = rnd() * c.width;
    const y = rnd() * c.height;
    ctx.fillStyle = `rgba(${60 + rnd() * 60},${54 + rnd() * 50},${40 + rnd() * 40},${0.04 + rnd() * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + rnd() * 7, 1 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 160; i++) {
    const x = rnd() * c.width;
    const y = rnd() * c.height;
    const len = 8 + rnd() * 46;
    const grd = ctx.createLinearGradient(x, y, x, y + len);
    grd.addColorStop(0, 'rgba(46,38,26,0.22)');
    grd.addColorStop(1, 'rgba(46,38,26,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, 1 + rnd() * 3, len);
  }
  _signTex = new THREE.CanvasTexture(c);
  _signTex.colorSpace = THREE.SRGBColorSpace;
  _signTex.anisotropy = 4;
  _signTex.needsUpdate = true;
  return _signTex;
}

function signMaterial() {
  if (!_signMat) {
    _signMat = new THREE.MeshStandardMaterial({
      map: signTexture(), roughness: 0.86, metalness: 0.05, side: THREE.DoubleSide,
    });
    _signMat.name = 'sign-atlas';
  }
  return _signMat;
}

/** Plane showing one cell of the sign atlas (`i` wraps). */
function sign(i, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const idx = ((i % (SIGN_COLS * SIGN_ROWS)) + SIGN_COLS * SIGN_ROWS) % (SIGN_COLS * SIGN_ROWS);
  const col = idx % SIGN_COLS;
  const row = Math.floor(idx / SIGN_COLS);
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(
      k,
      (col + uv.getX(k)) / SIGN_COLS,
      (SIGN_ROWS - 1 - row + uv.getY(k)) / SIGN_ROWS,
    );
  }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(g, signMaterial());
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

const MARK_COLS = 2;
const MARK_ROWS = 8;
const MARK_FACES = [
  'SECTOR 1', 'NO SMOKING', 'CAUTION - BLAST HAZARD', 'KEEP CLEAR',
  'CABLE DUCT', 'STAND 1', 'STAND 2', 'STAND 3',
  'DO NOT PARK', 'FIRE LANE', 'MUSTER', 'SLOW',
  '@hatch', '@arrow', 'AEGIS LINE', 'RADAR ACCESS',
];

let _markTex = null;
let _markMat = null;

function markTexture() {
  if (_markTex) return _markTex;
  const CW = 512;
  const CH = 128;
  const c = document.createElement('canvas');
  c.width = MARK_COLS * CW;
  c.height = MARK_ROWS * CH;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const paint = 'rgba(214,205,172,0.74)';
  for (let i = 0; i < MARK_COLS * MARK_ROWS; i++) {
    const text = MARK_FACES[i % MARK_FACES.length];
    const ox = (i % MARK_COLS) * CW;
    const oy = Math.floor(i / MARK_COLS) * CH;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.beginPath();
    ctx.rect(0, 0, CW, CH);
    ctx.clip();
    if (text === '@hatch') {
      ctx.strokeStyle = paint;
      ctx.lineWidth = 14;
      for (let x = -CH; x < CW + CH; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, CH);
        ctx.lineTo(x + CH, 0);
        ctx.stroke();
      }
    } else if (text === '@arrow') {
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.moveTo(40, CH * 0.38);
      ctx.lineTo(CW * 0.62, CH * 0.38);
      ctx.lineTo(CW * 0.62, CH * 0.16);
      ctx.lineTo(CW - 40, CH * 0.5);
      ctx.lineTo(CW * 0.62, CH * 0.84);
      ctx.lineTo(CW * 0.62, CH * 0.62);
      ctx.lineTo(40, CH * 0.62);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = paint;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let s = 86;
      ctx.font = `bold ${s}px "Arial Narrow", Impact, sans-serif`;
      while (ctx.measureText(text).width > CW - 40 && s > 20) {
        s -= 3;
        ctx.font = `bold ${s}px "Arial Narrow", Impact, sans-serif`;
      }
      ctx.fillText(text, CW / 2, CH * 0.52);
    }
    ctx.restore();
  }
  // scuff the paint so nothing reads as clean vector art
  let a = 0x1234567;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.12 + rnd() * 0.6})`;
    ctx.beginPath();
    ctx.arc(rnd() * c.width, rnd() * c.height, 1 + rnd() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  _markTex = new THREE.CanvasTexture(c);
  _markTex.colorSpace = THREE.SRGBColorSpace;
  // paint viewed at a grazing angle shimmers badly without proper anisotropy
  _markTex.anisotropy = 16;
  _markTex.needsUpdate = true;
  return _markTex;
}

function markMaterial() {
  if (!_markMat) {
    _markMat = new THREE.MeshStandardMaterial({
      map: markTexture(), transparent: true, roughness: 0.95, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -3,
    });
    _markMat.name = 'ground-marks';
  }
  return _markMat;
}

/** Flat painted marking lying on the hard standing. */
function groundMark(i, w, h, x, z, rot = 0, y = 0.07) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const idx = ((i % (MARK_COLS * MARK_ROWS)) + MARK_COLS * MARK_ROWS) % (MARK_COLS * MARK_ROWS);
  const col = idx % MARK_COLS;
  const row = Math.floor(idx / MARK_COLS);
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(
      k,
      (col + uv.getX(k)) / MARK_COLS,
      (MARK_ROWS - 1 - row + uv.getY(k)) / MARK_ROWS,
    );
  }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(g, markMaterial());
  m.rotation.set(-Math.PI / 2, 0, rot);
  m.position.set(x, y, z);
  return m;
}

// ---------------------------------------------------------------------------
// Weathering / surface decal materials
// ---------------------------------------------------------------------------

const _texCache = new Map();

function cachedTexture(key, build, srgb = true) {
  let t = _texCache.get(key);
  if (t) return t;
  const c = build();
  t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  _texCache.set(key, t);
  return t;
}

function rnd32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _grimeMat = null;
/** Vertical rust / dirt run-off, applied as thin planes just proud of walls. */
function grimeMaterial() {
  if (_grimeMat) return _grimeMat;
  const tex = cachedTexture('grime', () => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    const rnd = rnd32(4711);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * S;
      const w = 1 + rnd() * 9;
      const top = rnd() * S * 0.35;
      const len = S * (0.3 + rnd() * 0.7);
      const g = ctx.createLinearGradient(x, top, x, top + len);
      const br = 46 + rnd() * 60;
      g.addColorStop(0, `rgba(${br},${br * 0.72},${br * 0.45},${0.12 + rnd() * 0.34})`);
      g.addColorStop(0.6, `rgba(${br * 0.8},${br * 0.6},${br * 0.4},${0.06 + rnd() * 0.16})`);
      g.addColorStop(1, 'rgba(40,32,22,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, top, w, len);
    }
    for (let i = 0; i < 40; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 4 + rnd() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${110 + rnd() * 60},${58 + rnd() * 30},${24 + rnd() * 18},${0.14 + rnd() * 0.2})`);
      g.addColorStop(1, 'rgba(110,58,24,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  });
  _grimeMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 1.0, metalness: 0.0, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide,
  });
  _grimeMat.name = 'grime';
  return _grimeMat;
}

let _trackMat = null;
/** Tyre tracks and worn foot paths dragged across concrete and gravel. */
function trackMaterial() {
  if (_trackMat) return _trackMat;
  const tex = cachedTexture('tracks', () => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    const rnd = rnd32(9091);
    // two wheel ruts running the length of the cell
    for (const cx of [S * 0.3, S * 0.7]) {
      for (let y = 0; y < S; y += 5) {
        const w = 22 + Math.sin(y * 0.05) * 3;
        ctx.fillStyle = `rgba(${44 + rnd() * 26},${39 + rnd() * 22},${31 + rnd() * 18},${0.16 + rnd() * 0.24})`;
        ctx.fillRect(cx - w / 2 + (rnd() - 0.5) * 3, y, w, 5);
      }
      // tread bars
      for (let y = 0; y < S; y += 9) {
        ctx.fillStyle = `rgba(28,25,20,${0.1 + rnd() * 0.2})`;
        ctx.fillRect(cx - 11, y, 22, 3.4);
      }
    }
    // soften the ends so instances tile into each other
    const fade = ctx.createLinearGradient(0, 0, 0, S);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.12, 'rgba(0,0,0,0)');
    fade.addColorStop(0.88, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  });
  _trackMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 1.0, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, color: 0x8f8879,
  });
  _trackMat.name = 'tyre-tracks';
  return _trackMat;
}

let _scourMat = null;
/** Wind-scoured pale patches of hardpan out in the desert. */
function scourMaterial() {
  if (_scourMat) return _scourMat;
  const tex = cachedTexture('scour', () => {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    const noise = new Noise2D(6161);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - S / 2) / (S / 2);
        const dy = (y - S / 2) / (S / 2);
        const r = Math.hypot(dx, dy);
        const n = noise.fbm(dx * 2.4 + 4, dy * 2.4 + 4, 4) * 0.5 + 0.5;
        const a = Math.max(0, 1 - r / (0.55 + n * 0.5)) ** 1.5 * (0.4 + n * 0.6);
        const i = (y * S + x) * 4;
        const v = 150 + n * 45;
        d[i] = v;
        d[i + 1] = v * 0.95;
        d[i + 2] = v * 0.84;
        // kept faint: at full strength these read as spilled paint from the air
        d[i + 3] = a * 78;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });
  _scourMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 1.0, depthWrite: false, color: 0xa4977a,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  _scourMat.name = 'scour';
  return _scourMat;
}

/** Backing sheet seen between the radiator elements of the phased-array face. */
function arrayBackingTexture() {
  return cachedTexture('arrayback', () => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#14181d';
    ctx.fillRect(0, 0, S, S);
    const rnd = rnd32(0x5ada9);
    // shallow wells behind each radiator so the gaps have depth
    const N = 22;
    const step = S / N;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = 26 + rnd() * 10;
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
        ctx.fillRect(x * step + 1.2, y * step + 1.2, step - 2.4, step - 2.4);
      }
    }
    // waveguide seams every sixth column / row
    ctx.strokeStyle = 'rgba(96,104,110,0.5)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= N; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, S);
      ctx.moveTo(0, i * step);
      ctx.lineTo(S, i * step);
      ctx.stroke();
    }
    // dust settled in the lower half of the aperture
    const grd = ctx.createLinearGradient(0, S * 0.45, 0, S);
    grd.addColorStop(0, 'rgba(120,106,78,0)');
    grd.addColorStop(1, 'rgba(120,106,78,0.22)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, S * 0.45, S, S * 0.55);
    return c;
  });
}

let _rackMat = null;
/** Two columns of 19-inch rack gear faces, sampled per rack by UV window. */
function rackPanelMaterial() {
  if (_rackMat) return _rackMat;
  const tex = cachedTexture('rackface', () => {
    const CW = 256;
    const CH = 1024;
    const c = document.createElement('canvas');
    c.width = CW * 2;
    c.height = CH;
    const ctx = c.getContext('2d');
    const rnd = rnd32(2027);
    for (let col = 0; col < 2; col++) {
      const ox = col * CW;
      ctx.fillStyle = '#101214';
      ctx.fillRect(ox, 0, CW, CH);
      let y = 8;
      while (y < CH - 10) {
        const kind = rnd();
        const h = kind < 0.18 ? 22 : kind < 0.55 ? 46 : kind < 0.8 ? 70 : 100;
        const shade = 26 + rnd() * 34;
        ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 4})`;
        ctx.fillRect(ox + 6, y, CW - 12, h - 4);
        ctx.strokeStyle = 'rgba(150,155,158,0.28)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + 6.5, y + 0.5, CW - 13, h - 5);
        // rack ears
        ctx.fillStyle = 'rgba(190,194,196,0.45)';
        for (const ex of [ox + 11, ox + CW - 15]) {
          ctx.beginPath();
          ctx.arc(ex, y + 8, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ex, y + h - 12, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        if (kind < 0.18) {
          // blank filler panel
        } else if (kind < 0.55) {
          // status LEDs and a small display
          for (let i = 0; i < 7; i++) {
            const on = rnd();
            ctx.fillStyle = on < 0.45 ? '#3dff8a' : on < 0.7 ? '#ffb62c' : '#2b3230';
            ctx.fillRect(ox + 24 + i * 13, y + h * 0.42, 7, 7);
          }
          ctx.fillStyle = '#0d2a1e';
          ctx.fillRect(ox + CW - 96, y + h * 0.28, 76, h * 0.42);
          ctx.fillStyle = '#57e7a4';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(['ONLINE', 'STBY', 'SYNC', 'LINK', 'RDY'][(rnd() * 5) | 0], ox + CW - 90, y + h * 0.58);
        } else if (kind < 0.8) {
          // ventilated panel with a handle
          for (let i = 0; i < 12; i++) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(ox + 24 + i * 16, y + 14, 9, h - 32);
          }
          ctx.fillStyle = 'rgba(170,175,178,0.5)';
          ctx.fillRect(ox + CW - 54, y + h * 0.4, 34, 6);
        } else {
          // patch panel: rows of ports
          for (let r = 0; r < 2; r++) {
            for (let i = 0; i < 12; i++) {
              ctx.fillStyle = r + i === 0 ? '#1b1d1f' : `rgba(${18 + rnd() * 20},${20 + rnd() * 20},${22 + rnd() * 22},1)`;
              ctx.fillRect(ox + 20 + i * 18, y + 22 + r * 34, 13, 22);
              ctx.strokeStyle = 'rgba(140,145,148,0.3)';
              ctx.strokeRect(ox + 20.5 + i * 18, y + 22.5 + r * 34, 13, 22);
            }
          }
        }
        y += h;
      }
      // dust and scuffs
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(${120 + rnd() * 60},${118 + rnd() * 55},${104 + rnd() * 50},${0.02 + rnd() * 0.08})`;
        ctx.fillRect(ox + rnd() * CW, rnd() * CH, 1 + rnd() * 12, 1 + rnd() * 3);
      }
    }
    return c;
  });
  _rackMat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.55, metalness: 0.35, emissive: 0x141a18, emissiveIntensity: 0.7,
  });
  _rackMat.name = 'rack-face';
  return _rackMat;
}

/** Rack front panel plane using one of the two texture columns. */
function rackFace(w, h, col = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(k, (col + uv.getX(k)) * 0.5, uv.getY(k));
  }
  uv.needsUpdate = true;
  return new THREE.Mesh(g, rackPanelMaterial());
}

let _boardMat = null;
/** Wall boards inside the shelter: status grid, sector map, notice board. */
function wallBoardMaterial() {
  if (_boardMat) return _boardMat;
  const tex = cachedTexture('wallboards', () => {
    const CW = 512;
    const CH = 256;
    const c = document.createElement('canvas');
    c.width = CW * 2;
    c.height = CH * 2;
    const ctx = c.getContext('2d');
    const rnd = rnd32(3313);

    // cell 0 - status board
    ctx.fillStyle = '#20241f';
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = '#5c6455';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, CW - 16, CH - 16);
    ctx.fillStyle = '#cfd6c4';
    ctx.font = 'bold 26px "Arial Narrow", Impact, sans-serif';
    ctx.fillText('SITE STATUS BOARD', 22, 44);
    ctx.font = '18px "Arial Narrow", sans-serif';
    const rows = [
      ['PALISADE PAC-T', 'READY'], ['HALBERD LRE', 'READY'], ['SENTINEL CIWS', 'READY'],
      ['RADAR TG-9', 'RADIATE'], ['GEN SET 1', 'ONLINE'], ['GEN SET 2', 'STBY'],
      ['LINK 4 UPLINK', 'GREEN'],
    ];
    rows.forEach((r, i) => {
      const y = 76 + i * 24;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
      ctx.fillRect(20, y - 16, CW - 40, 22);
      ctx.fillStyle = '#b9c2ad';
      ctx.fillText(r[0], 28, y);
      ctx.fillStyle = r[1] === 'STBY' ? '#e0a83a' : '#68d99a';
      ctx.fillText(r[1], CW - 130, y);
    });

    // cell 1 - fictional sector map
    ctx.save();
    ctx.translate(CW, 0);
    ctx.fillStyle = '#cec8b2';
    ctx.fillRect(0, 0, CW, CH);
    const noise = new Noise2D(88);
    ctx.strokeStyle = 'rgba(120,104,74,0.55)';
    ctx.lineWidth = 1.1;
    for (let lv = 0; lv < 12; lv++) {
      ctx.beginPath();
      for (let x = 0; x <= CW; x += 6) {
        const y = CH * 0.5
          + noise.fbm(x * 0.006, lv * 0.9, 3) * 90
          + (lv - 5.5) * 17;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(70,90,120,0.4)';
    ctx.lineWidth = 0.8;
    for (let x = 0; x <= CW; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CH);
      ctx.stroke();
    }
    for (let y = 0; y <= CH; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CW, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#a83c2c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(CW * 0.42, CH * 0.55, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CW * 0.42, CH * 0.55, 104, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a83c2c';
    ctx.font = 'bold 17px "Arial Narrow", sans-serif';
    ctx.fillText('SITE 4', CW * 0.42 - 22, CH * 0.55 - 62);
    ctx.fillStyle = '#31404f';
    ctx.font = 'bold 20px "Arial Narrow", sans-serif';
    ctx.fillText('RANGE SECTOR CHART - FICTIONAL', 16, CH - 14);
    ctx.restore();

    // cell 2 - notice board with pinned paper
    ctx.save();
    ctx.translate(0, CH);
    ctx.fillStyle = '#4a4636';
    ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 7; i++) {
      const w = 90 + rnd() * 70;
      const h = 60 + rnd() * 60;
      const x = 18 + rnd() * (CW - w - 36);
      const y = 14 + rnd() * (CH - h - 28);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((rnd() - 0.5) * 0.16);
      ctx.fillStyle = ['#ded8c6', '#d8dcc4', '#e6d9b4'][(rnd() * 3) | 0];
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = 'rgba(60,60,58,0.6)';
      for (let l = 0; l < 6; l++) ctx.fillRect(-w / 2 + 8, -h / 2 + 10 + l * 8, w - 16 - rnd() * 30, 2.4);
      ctx.fillStyle = '#b03a2a';
      ctx.beginPath();
      ctx.arc(0, -h / 2 + 6, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // cell 3 - dry-wipe board with a hand-drawn schematic
    ctx.save();
    ctx.translate(CW, CH);
    ctx.fillStyle = '#e8ece6';
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = '#2c4f8a';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 120, 70);
    ctx.strokeRect(230, 30, 110, 60);
    ctx.strokeRect(220, 150, 150, 70);
    ctx.beginPath();
    ctx.moveTo(160, 75);
    ctx.lineTo(230, 60);
    ctx.moveTo(285, 90);
    ctx.lineTo(285, 150);
    ctx.moveTo(100, 110);
    ctx.lineTo(220, 185);
    ctx.stroke();
    ctx.strokeStyle = '#a8342a';
    ctx.beginPath();
    ctx.moveTo(390, 60);
    ctx.lineTo(470, 60);
    ctx.lineTo(470, 200);
    ctx.stroke();
    ctx.fillStyle = '#20242a';
    ctx.font = 'bold 19px "Arial Narrow", sans-serif';
    ctx.fillText('FDC', 62, 82);
    ctx.fillText('RDR', 258, 66);
    ctx.fillText('BTY 1-3', 254, 192);
    ctx.font = '15px "Arial Narrow", sans-serif';
    ctx.fillText('DRILL 04 - 0600', 384, 234);
    ctx.restore();

    return c;
  });
  _boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.04 });
  _boardMat.name = 'wall-boards';
  return _boardMat;
}

/** Wall board plane; `cell` 0..3 of the 2x2 board atlas. */
function wallBoard(cell, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const col = cell % 2;
  const row = Math.floor(cell / 2);
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(k, (col + uv.getX(k)) * 0.5, (1 - row + uv.getY(k)) * 0.5);
  }
  uv.needsUpdate = true;
  return new THREE.Mesh(g, wallBoardMaterial());
}

let _floorMat = null;
/** Anti-static tile floor for the shelter interior. */
function shelterFloorMaterial() {
  if (_floorMat) return _floorMat;
  const tex = cachedTexture('shelterfloor', () => {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rnd = rnd32(717);
    ctx.fillStyle = '#31352f';
    ctx.fillRect(0, 0, S, S);
    const cell = S / 4;
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        const v = 62 + rnd() * 32;
        ctx.fillStyle = `rgb(${v},${v + 5},${v})`;
        ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
        for (let i = 0; i < 260; i++) {
          const s = 40 + rnd() * 90;
          ctx.fillStyle = `rgba(${s},${s + 4},${s - 2},${0.1 + rnd() * 0.3})`;
          ctx.fillRect(gx * cell + rnd() * cell, gy * cell + rnd() * cell, 1 + rnd() * 3, 1 + rnd() * 3);
        }
      }
    }
    // Tile joints. Thin lines mip away to nothing at eye height, so each joint
    // is a wide dark groove flanked by a lighter arris.
    for (let i = 0; i <= 4; i++) {
      const p = i * cell;
      ctx.strokeStyle = 'rgba(150,154,146,0.5)';
      ctx.lineWidth = 3;
      for (const o of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(p + o, 0);
        ctx.lineTo(p + o, S);
        ctx.moveTo(0, p + o);
        ctx.lineTo(S, p + o);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(11,13,11,0.95)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, S);
      ctx.moveTo(0, p);
      ctx.lineTo(S, p);
      ctx.stroke();
    }
    // scuffed traffic lane
    for (let i = 0; i < 220; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.strokeStyle = `rgba(${30 + rnd() * 40},${30 + rnd() * 40},${28 + rnd() * 36},${0.05 + rnd() * 0.2})`;
      ctx.lineWidth = 0.6 + rnd() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 24);
      ctx.stroke();
    }
    return c;
  });
  const t2 = tex.clone();
  t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
  t2.repeat.set(4, 2.4);
  t2.needsUpdate = true;
  _floorMat = new THREE.MeshStandardMaterial({
    map: t2, normalMap: T.concreteNormal(), normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.62, metalness: 0.08,
  });
  _floorMat.name = 'shelter-floor';
  return _floorMat;
}

let _liningMat = null;
/** Painted internal wall lining, distinct from the corrugated exterior. */
function liningMaterial() {
  if (_liningMat) return _liningMat;
  _liningMat = new THREE.MeshStandardMaterial({
    map: T.militaryPanel({ key: 'shelterLining', base: '#6f7266', dark: '#55584e', light: '#828577', seed: 63 }),
    normalMap: T.panelNormal('liningNrm', 21),
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.9, metalness: 0.06,
  });
  _liningMat.name = 'shelter-lining';
  return _liningMat;
}

let _ceilMat = null;
/** Ceiling deck: pale enough to bounce the fittings, dark enough not to blow out. */
function shelterCeilingMaterial() {
  if (_ceilMat) return _ceilMat;
  _ceilMat = new THREE.MeshStandardMaterial({
    map: T.militaryPanel({ key: 'shelterCeil', base: '#7c7e76', dark: '#63655e', light: '#8d8f86', seed: 44 }),
    roughness: 0.95, metalness: 0.04,
  });
  _ceilMat.name = 'shelter-ceiling';
  return _ceilMat;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function prepGeo(src) {
  const g = src.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  }
  if (g.index === null) {
    const count = g.attributes.position.count;
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

/**
 * Flatten small InstancedMeshes into ordinary meshes so the static merge can
 * fold them in with everything else sharing their material. Kit parts use
 * instancing for authoring convenience (ladder rungs, bolt rings, lattice
 * braces); at counts this low a merged mesh is strictly cheaper than a draw
 * call each. Large scatters (rocks, scrub, array elements) are left instanced.
 */
function bakeInstanced(root, maxCount = 96) {
  const found = [];
  root.traverse((o) => {
    if (o.isInstancedMesh && o.count <= maxCount && o.parent) found.push(o);
  });
  for (const inst of found) {
    const geos = [];
    const m = new THREE.Matrix4();
    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, m);
      geos.push(prepGeo(inst.geometry).applyMatrix4(m));
    }
    let merged = null;
    try {
      merged = geos.length ? mergeGeometries(geos, false) : null;
    } catch (e) {
      merged = null;
    }
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, inst.material);
    mesh.castShadow = inst.castShadow;
    mesh.receiveShadow = inst.receiveShadow;
    mesh.position.copy(inst.position);
    mesh.quaternion.copy(inst.quaternion);
    mesh.scale.copy(inst.scale);
    inst.parent.add(mesh);
    inst.parent.remove(inst);
    inst.dispose?.();
  }
  return root;
}

/** Bundle of parallel cables running between two points. */
function loom(from, to, count = 4, { sag = 0.3, radius = 0.045, spread = 0.1, material = null } = {}) {
  const g = new THREE.Group();
  const dir = to.clone().sub(from);
  dir.y = 0;
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  for (let i = 0; i < count; i++) {
    const o = (i - (count - 1) / 2) * spread;
    g.add(K.cable(
      from.clone().addScaledVector(side, o),
      to.clone().addScaledVector(side, o),
      { sag: sag + i * 0.015, radius, material, segments: 12 },
    ));
  }
  return g;
}

/** Rectangular trunking run along a polyline (roof ducts, cable trunking). */
function trunking(points, w, h, material) {
  const g = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    const len = d.length();
    const seg = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), material);
    seg.position.copy(mid);
    seg.lookAt(b);
    seg.castShadow = true;
    seg.receiveShadow = true;
    g.add(seg);
    if (i > 0) {
      const knee = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, h * 1.06, w * 1.06), material);
      knee.position.copy(a);
      g.add(knee);
    }
  }
  return g;
}

/** Open cable tray: two side rails plus rungs, filled with cable bundles. */
function cableTray(length, width = 0.4, { cables = 3, material = null, cableMat = null } = {}) {
  const M = mats();
  const mat = material || M.galvanised;
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    g.add(K.box(length, 0.08, 0.03, mat, 0, 0, s * width / 2));
  }
  const rungs = Math.max(2, Math.round(length / 0.45));
  for (let i = 0; i < rungs; i++) {
    g.add(K.box(0.03, 0.012, width, mat, (i / (rungs - 1) - 0.5) * length, -0.03, 0));
  }
  for (let i = 0; i < cables; i++) {
    const zz = (i - (cables - 1) / 2) * (width * 0.62 / Math.max(1, cables - 1)) * 2;
    const c = K.cyl(0.035 + (i % 2) * 0.012, 0.035 + (i % 2) * 0.012, length, 6,
      cableMat || M.rubber, 0, 0.02, zz);
    c.rotation.z = Math.PI / 2;
    g.add(c);
  }
  return g;
}

/** Coffee mug - the smallest unit of "somebody works here". */
function mug(material) {
  const M = mats();
  const g = new THREE.Group();
  const body = K.cyl(0.042, 0.037, 0.095, 10, material || M.panelWhite, 0, 0.047, 0);
  g.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 4, 8, Math.PI * 1.4), material || M.panelWhite);
  handle.rotation.y = Math.PI / 2;
  handle.position.set(0.045, 0.05, 0);
  g.add(handle);
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.036, 10), M.rubber);
  brew.rotation.x = -Math.PI / 2;
  brew.position.y = 0.082;
  g.add(brew);
  return g;
}

/** Ring binder / folder standing on a shelf. */
function binder(h, material) {
  const g = new THREE.Group();
  const b = K.box(0.055, h, 0.24, material, 0, h / 2, 0);
  g.add(b);
  return g;
}

export class Base {
  constructor(scene, rng, collision) {
    this.scene = scene;
    this.rng = rng;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'base';
    scene.add(this.group);

    this.noise = new Noise2D(rng.seed ^ 0x5eed);
    this.detailNoise = new Noise2D((rng.seed ^ 0xbeef) >>> 0);

    this.floodlights = [];
    this.beacons = [];
    this.rotators = [];
    this.nightMaterials = [];
    this.lampLights = [];
    this.screens = [];
    this.searchlights = [];
    this.consoleAnchor = new THREE.Object3D();
    this.time = 0;

    // sandbags from every revetment on the site share one instanced mesh
    this._bagMatrices = [];
    // one shared lamp-glass material lets every static lamp lens light up at
    // night without breaking out of the static merge
    this.lampGlassMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a8d86, roughness: 0.3, metalness: 0.3,
      emissive: 0xfff0cc, emissiveIntensity: 0,
    });
    this.lampGlassMaterial.name = 'site-lamp-glass';
    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfe6dd, emissive: 0xbfe0d8, emissiveIntensity: 2.2, roughness: 0.4,
    });
  }

  // -------------------------------------------------------------------------
  // Terrain
  // -------------------------------------------------------------------------

  terrainHeight(x, z) {
    const d = Math.hypot(x, z);
    const n = this.noise;
    // gentle desert swells
    let h = n.fbm(x * 0.0022, z * 0.0022, 4) * 7.5;
    h += n.fbm(x * 0.011, z * 0.011, 3) * 1.1;
    h += this.detailNoise.fbm(x * 0.06, z * 0.06, 2) * 0.16;

    // erosion: shallow braided wash channels incised into the near desert.
    // Ridged noise concentrates along connected lines, so subtracting it cuts
    // gullies rather than pitting the surface. Faded out before the ranges so
    // the mountains keep their own silhouette.
    const wash = smoothstep(150, 480, d) * (1 - smoothstep(1800, 4200, d));
    if (wash > 0.001) {
      const ch = n.ridged(x * 0.0017 + 11, z * 0.0017 - 7, 2);
      h -= Math.pow(ch, 3.4) * 6.2 * wash;
    }

    // low foothills ring the site before the ranges proper begin
    const mid = smoothstep(600, 2800, d);
    if (mid > 0.001) {
      h += (n.fbm(x * 0.00042, z * 0.00042, 3) * 0.5 + 0.5) * 110 * mid;
    }

    // distant ranges: ridged noise whose amplitude ramps in with distance.
    // Two scales - a broad massif and a finer spur pattern riding on it.
    const far = smoothstep(2600, 12000, d);
    if (far > 0.001) {
      const massif = n.ridged(x * 0.00007, z * 0.00007, 4);
      const spurs = n.ridged(x * 0.00028 + 40, z * 0.00028 - 20, 4);
      const range = Math.pow(massif, 1.55) * 2250 + Math.pow(spurs, 2.2) * 460 * massif;
      h += range * far;
    }

    // the operating area is a graded, level pad
    const flat = 1 - smoothstep(BASE_FLAT_RADIUS - 45, BASE_FLAT_RADIUS + 90, d);
    h *= 1 - flat;
    return h;
  }

  /**
   * Radial terrain patch. Both terrain meshes use the same topology so the
   * seam between them shares vertices exactly - no z-fighting, no gaps - and
   * the radial layout gives dense triangles near the player with cheap
   * triangles out at the ranges.
   */
  _radialTerrain(rInner, rOuter, rings, thetaSegs, exponent) {
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const r = exponent === 'exp'
        ? rInner * Math.pow(rOuter / rInner, t)
        : rInner + (rOuter - rInner) * Math.pow(t, exponent);
      for (let j = 0; j <= thetaSegs; j++) {
        const a = (j / thetaSegs) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const y = this.terrainHeight(x, z);
        positions.push(x, y, z);
        uvs.push(x / 14, z / 14);
        const c = this._terrainColor(y, x, z);
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < thetaSegs; j++) {
        const a = i * (thetaSegs + 1) + j;
        const b = a + thetaSegs + 1;
        // wound so the surface normal points up (+Y)
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  buildTerrain() {
    const SEAM = 1400;
    // --- near field: dense radial grid over the site and its surroundings --
    const nearGeo = this._radialTerrain(0.6, SEAM, 150, 256, 1.7);
    const groundMat = new THREE.MeshStandardMaterial({
      map: T.sand(0),
      normalMap: T.sandNormal(),
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughness: 1.0,
      metalness: 0.0,
      vertexColors: true,
    });
    // UVs are x/14, so repeat 0.5 tiled the sand map every 28 m and its
    // mottling read as pale blobs the size of buildings. Tighten it right up.
    groundMat.map = groundMat.map.clone();
    groundMat.map.wrapS = groundMat.map.wrapT = THREE.RepeatWrapping;
    groundMat.map.repeat.set(3.5, 3.5);
    groundMat.normalMap = groundMat.normalMap.clone();
    groundMat.normalMap.wrapS = groundMat.normalMap.wrapT = THREE.RepeatWrapping;
    groundMat.normalMap.repeat.set(7, 7);
    this.groundMaterial = groundMat;
    const near = new THREE.Mesh(nearGeo, groundMat);
    near.receiveShadow = true;
    near.name = 'terrain-near';
    this.group.add(near);

    // --- far field: exponential rings out to the ranges (cheap LOD) --------
    const farGeo = this._radialTerrain(SEAM, 46000, 110, 256, 'exp');
    // the ranges keep the coarser tiling: their silhouette carries them and a
    // fine repeat this far out only aliases
    const farTex = groundMat.map.clone();
    farTex.repeat.set(0.5, 0.5);
    farTex.needsUpdate = true;
    const farMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1.0, metalness: 0.0,
      map: farTex, color: 0xffffff,
    });
    this.farMaterial = farMat;
    const far = new THREE.Mesh(farGeo, farMat);
    far.name = 'terrain-far';
    far.receiveShadow = false;
    this.group.add(far);

    this._scatterGroundDetail();
  }

  /**
   * Vertex tint applied on top of the sand map. Kept close to 1.0 near the
   * site so the albedo map carries the colour, drifting to cooler rock and
   * then snow on the high ridges. Wash channels read a shade paler, as though
   * the fines have been sorted out of them.
   */
  _terrainColor(y, x, z) {
    const n = this.detailNoise.fbm(x * 0.004, z * 0.004, 3) * 0.5 + 0.5;
    const rock = smoothstep(120, 620, y);
    const sandC = new THREE.Color(0.92 + n * 0.16, 0.88 + n * 0.14, 0.78 + n * 0.14);
    const rockC = new THREE.Color(0.6 + n * 0.16, 0.56 + n * 0.14, 0.55 + n * 0.14);
    const snowC = new THREE.Color(1.05, 1.06, 1.12);
    const c = sandC.lerp(rockC, rock);
    const d = Math.hypot(x, z);
    // Silt paling in the wash beds. Held well back from the pad edge and kept
    // weak: at full strength the ridged lobes read as pale blobs from the air
    // rather than as channel bottoms.
    const wash = smoothstep(300, 780, d) * (1 - smoothstep(1200, 3000, d));
    if (wash > 0.02) {
      const ch = Math.pow(this.noise.ridged(x * 0.0017 + 11, z * 0.0017 - 7, 2), 3.4);
      c.lerp(new THREE.Color(1.02, 0.99, 0.91), Math.min(0.2, ch * wash * 0.5));
    }
    const snow = smoothstep(880, 1180, y) * smoothstep(0.42, 0.66, n);
    return c.lerp(snowC, snow);
  }

  /** Instanced rocks, outcrops, pebbles, scrub and scour outside the pad. */
  _scatterGroundDetail() {
    const rng = this.rng;
    const M = mats();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();

    const jitter = (geo, amp, squash) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const s = 1 - amp + ((i * 37) % 11) / 11 * amp * 2;
        p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * squash, p.getZ(i) * s);
      }
      geo.computeVertexNormals();
      return geo;
    };

    const rockMat = new THREE.MeshStandardMaterial({
      map: T.sand(1), normalMap: T.sandNormal(), color: 0x7d7263, roughness: 0.98, metalness: 0,
    });
    rockMat.name = 'desert-rock';
    this.rockMaterial = rockMat;

    // Everything inside the gravel skirt would be buried by it, so all of the
    // loose scatter starts outside its edge. The skirt is centred on the apron,
    // not the origin, so the test has to be made about that centre.
    const outsideSkirt = (x, z) => Math.hypot(x + 6, z + 6) > 134;

    // --- scattered boulders ------------------------------------------------
    // Split into a near population just beyond the wire and a far one, because
    // a single distance curve left the ground the player actually looks at bare.
    const rockGeo = jitter(new THREE.IcosahedronGeometry(1, 1), 0.28, 0.7);
    const ROCKS = 1050;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, ROCKS);
    let k = 0;
    for (let i = 0; i < ROCKS; i++) {
      const a = rng.float() * Math.PI * 2;
      const isNear = rng.float() < 0.55;
      const r = isNear
        ? 136 + Math.pow(rng.float(), 0.85) * 300
        : 430 + Math.pow(rng.float(), 0.7) * 980;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!outsideSkirt(x, z)) continue;
      const y = this.terrainHeight(x, z);
      const s = (isNear ? 0.22 : 0.25) + Math.pow(rng.float(), 2) * (isNear ? 1.7 : 2.6);
      e.set(rng.float() * 3, rng.float() * 6, rng.float() * 3);
      q.setFromEuler(e);
      m.compose(v.set(x, y + s * 0.25, z), q, new THREE.Vector3(s, s * (0.6 + rng.float() * 0.5), s));
      rocks.setMatrixAt(k++, m);
    }
    rocks.count = k;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.group.add(rocks);

    // --- slabby outcrops along the wash channels ---------------------------
    // Sample the same ridged field the erosion term uses, so outcrops line up
    // with the channel banks instead of floating at random.
    const slabGeo = jitter(new THREE.IcosahedronGeometry(1, 0), 0.34, 0.34);
    const OUTCROPS = 520;
    const outcrops = new THREE.InstancedMesh(slabGeo, rockMat, OUTCROPS);
    k = 0;
    for (let i = 0; i < OUTCROPS * 5 && k < OUTCROPS; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = 150 + Math.pow(rng.float(), 0.9) * 900;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!outsideSkirt(x, z)) continue;
      const ch = this.noise.ridged(x * 0.0017 + 11, z * 0.0017 - 7, 2);
      if (ch < 0.52 && rng.float() > 0.14) continue;
      const y = this.terrainHeight(x, z);
      const s = 0.9 + Math.pow(rng.float(), 1.6) * 4.4;
      e.set((rng.float() - 0.5) * 0.5, rng.float() * 6, (rng.float() - 0.5) * 0.5);
      q.setFromEuler(e);
      m.compose(
        v.set(x, y - s * 0.12, z), q,
        new THREE.Vector3(s * (1 + rng.float() * 0.9), s * (0.28 + rng.float() * 0.3), s),
      );
      outcrops.setMatrixAt(k++, m);
    }
    outcrops.count = k;
    outcrops.castShadow = true;
    outcrops.receiveShadow = true;
    this.group.add(outcrops);

    // --- near-field gravel: the ground just outside the wire ---------------
    const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);
    const PEBBLES = 1500;
    const pebbles = new THREE.InstancedMesh(pebbleGeo, rockMat, PEBBLES);
    k = 0;
    for (let i = 0; i < PEBBLES; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = 134 + Math.pow(rng.float(), 1.1) * 240;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!outsideSkirt(x, z)) continue;
      const y = this.terrainHeight(x, z);
      const s = 0.1 + Math.pow(rng.float(), 2.2) * 0.55;
      e.set(rng.float() * 3, rng.float() * 6, rng.float() * 3);
      q.setFromEuler(e);
      m.compose(v.set(x, y + s * 0.2, z), q, new THREE.Vector3(s * 1.4, s * 0.7, s * 1.2));
      pebbles.setMatrixAt(k++, m);
    }
    pebbles.count = k;
    pebbles.receiveShadow = true;
    this.group.add(pebbles);

    // --- desert scrub: two crossed alpha quads, instanced ------------------
    const bushGeo = new THREE.BufferGeometry();
    {
      const verts = [];
      const uv = [];
      const idx = [];
      const addQuad = (rot) => {
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const base = verts.length / 3;
        const pts = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
        for (const [px, py] of pts) {
          verts.push(px * c, py, px * s);
        }
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };
      addQuad(0);
      addQuad(Math.PI / 2);
      bushGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      bushGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      bushGeo.setIndex(idx);
      bushGeo.computeVertexNormals();
    }
    const bushTex = this._bushTexture();
    const bushMat = new THREE.MeshStandardMaterial({
      map: bushTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide,
      roughness: 0.95, metalness: 0, color: 0x8d8a63,
    });
    // Scrub clumps rather than an even sprinkle: a low-frequency mask decides
    // where anything grows at all, then plants cluster inside those pockets.
    const BUSHES = 4800;
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, BUSHES);
    k = 0;
    for (let i = 0; i < BUSHES * 3 && k < BUSHES; i++) {
      const a = rng.float() * Math.PI * 2;
      // half of the scrub sits in the first couple of hundred metres, which is
      // the band the player sees over the wire from the apron
      const r = rng.float() < 0.5
        ? 136 + Math.pow(rng.float(), 0.9) * 260
        : 200 + Math.pow(rng.float(), 0.62) * 1050;
      let x = Math.cos(a) * r;
      let z = Math.sin(a) * r;
      const mask = this.detailNoise.fbm(x * 0.0075, z * 0.0075, 3) * 0.5 + 0.5;
      if (mask < 0.43) continue;
      // clump: nudge toward a shared local centre
      x += (rng.float() - 0.5) * 7;
      z += (rng.float() - 0.5) * 7;
      if (!outsideSkirt(x, z)) continue;
      const y = this.terrainHeight(x, z);
      if (y > 120) continue;
      const s = (0.45 + rng.float() * 1.5) * (0.7 + mask * 0.7);
      e.set(0, rng.float() * 6, 0);
      q.setFromEuler(e);
      m.compose(v.set(x, y, z), q, new THREE.Vector3(s, s * (0.7 + rng.float() * 0.7), s));
      bushes.setMatrixAt(k++, m);
    }
    bushes.count = k;
    bushes.castShadow = false;
    this.group.add(bushes);

    // --- wind-scoured hardpan patches --------------------------------------
    const scourGeo = new THREE.PlaneGeometry(1, 1);
    scourGeo.rotateX(-Math.PI / 2);
    const SCOUR = 260;
    const scour = new THREE.InstancedMesh(scourGeo, scourMaterial(), SCOUR);
    k = 0;
    for (let i = 0; i < SCOUR; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = 140 + Math.pow(rng.float(), 0.75) * 560;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!outsideSkirt(x, z)) continue;
      const y = this.terrainHeight(x, z);
      const s = 4 + rng.float() * 11;
      e.set(0, rng.float() * 6, 0);
      q.setFromEuler(e);
      m.compose(v.set(x, y + 0.06, z), q, new THREE.Vector3(s, 1, s * (0.5 + rng.float() * 0.7)));
      scour.setMatrixAt(k++, m);
    }
    scour.count = k;
    this.group.add(scour);
  }

  _bushTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    const rng = this.rng;
    for (let i = 0; i < 130; i++) {
      const a = -Math.PI / 2 + (rng.float() - 0.5) * 2.2;
      const len = 30 + rng.float() * 62;
      ctx.strokeStyle = `rgba(${96 + rng.float() * 60},${92 + rng.float() * 54},${44 + rng.float() * 40},${0.5 + rng.float() * 0.5})`;
      ctx.lineWidth = 0.8 + rng.float() * 2.2;
      ctx.beginPath();
      ctx.moveTo(64 + (rng.float() - 0.5) * 26, 128);
      ctx.quadraticCurveTo(
        64 + Math.cos(a) * len * 0.5 + (rng.float() - 0.5) * 30,
        128 + Math.sin(a) * len * 0.6,
        64 + Math.cos(a) * len,
        128 + Math.sin(a) * len,
      );
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // -------------------------------------------------------------------------
  // Hard standing, roads and markings
  // -------------------------------------------------------------------------

  /** Queue a run of sandbags; all revetments share one instanced mesh. */
  _sandbagRun(x0, z0, x1, z1, rows = 3, taper = true) {
    const rng = this.rng;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let r = 0; r < rows; r++) {
      const inset = taper ? r * 0.34 : 0;
      const n = Math.max(1, Math.round((len - inset * 2) / 0.6));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = x0 + dx * t + (rng.float() - 0.5) * 0.06;
        const z = z0 + dz * t + (rng.float() - 0.5) * 0.06;
        e.set((rng.float() - 0.5) * 0.16, ang + Math.PI / 2 + (rng.float() - 0.5) * 0.18, (rng.float() - 0.5) * 0.13);
        q.setFromEuler(e);
        const m = new THREE.Matrix4();
        m.compose(
          new THREE.Vector3(x, 0.18 + r * 0.33, z),
          q,
          new THREE.Vector3(0.95 + rng.float() * 0.16, 0.95 + rng.float() * 0.12, 0.95 + rng.float() * 0.16),
        );
        this._bagMatrices.push(m);
      }
    }
  }

  _emitSandbags() {
    if (!this._bagMatrices.length) return;
    const M = mats();
    const geo = new THREE.SphereGeometry(0.3, 8, 6);
    geo.scale(1.35, 0.62, 0.9);
    const inst = new THREE.InstancedMesh(geo, M.sandbag, this._bagMatrices.length);
    for (let i = 0; i < this._bagMatrices.length; i++) inst.setMatrixAt(i, this._bagMatrices[i]);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.name = 'sandbags';
    this.group.add(inst);
  }

  /** Kerb run between two points, both sides of a carriageway. */
  _kerbs(g, a, b, halfWidth) {
    const M = mats();
    const dir = b.clone().sub(a);
    const len = dir.length();
    const ang = -Math.atan2(dir.x, dir.z);
    for (const s of [-1, 1]) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, len), M.concreteDark);
      k.position.copy(a).add(b).multiplyScalar(0.5);
      k.position.y = 0.11;
      k.rotation.y = ang;
      k.translateX(s * halfWidth);
      k.receiveShadow = true;
      k.castShadow = true;
      g.add(k);
    }
  }

  buildGroundworks() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'groundworks';

    // Main apron. Its UVs are 0..1 over 126 x 108 m, so the shared concrete
    // material tiled once every ~40 m; at night the floodlights rake that
    // stretched normal map and the apron breaks into a field of soft blobs.
    // Re-map to world units and tile the texture at its natural scale.
    const worldUv = (geo, metres) => {
      const p = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / metres, p.getY(i) / metres);
      uv.needsUpdate = true;
      return geo;
    };
    const rescaled = (src, name, mapRepeat = 1, nrmRepeat = 1) => {
      const m = src.clone();
      if (src.map) {
        m.map = src.map.clone();
        m.map.repeat.set(mapRepeat, mapRepeat);
        m.map.needsUpdate = true;
      }
      if (src.normalMap) {
        m.normalMap = src.normalMap.clone();
        m.normalMap.repeat.set(nrmRepeat, nrmRepeat);
        m.normalMap.needsUpdate = true;
      }
      m.name = name;
      return m;
    };
    const apronMat = rescaled(M.concrete, 'apron-concrete', 1, 2);
    const apron = new THREE.Mesh(worldUv(new THREE.PlaneGeometry(126, 108), 9), apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(-6, 0.02, -6);
    apron.receiveShadow = true;
    g.add(apron);

    // Gravel skirt around the apron.
    //
    // Two things were wrong with the obvious RingGeometry version. Its UVs span
    // the whole 264 m annulus, which smeared the gravel map into 30 m blobs;
    // and lying 5 mm over the terrain it z-fought badly, because depth
    // precision out at 200 m is coarser than that and the pale desert punched
    // through the dark gravel in big irregular patches.
    //
    // So: a ring with a rectangular hole cut for the apron (no overlap, so it
    // can be lifted clear), draped on the terrain, with world-scale UVs.
    {
      const RO = 132;
      const NA = 128;
      const NR = 10;
      const pos = [];
      const uvs = [];
      const idx = [];
      for (let j = 0; j <= NA; j++) {
        const a = (j / NA) * Math.PI * 2;
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        // where this ray leaves the apron rectangle: the skirt starts there
        const rIn = Math.min(63 / Math.max(Math.abs(cx), 1e-6), 54 / Math.max(Math.abs(cz), 1e-6));
        for (let i = 0; i <= NR; i++) {
          const r = rIn + (RO - rIn) * Math.pow(i / NR, 1.3);
          const wx = cx * r - 6;
          const wz = cz * r - 6;
          pos.push(cx * r, this.terrainHeight(wx, wz) + 0.07, cz * r);
          uvs.push(wx / 7, wz / 7);
        }
      }
      for (let j = 0; j < NA; j++) {
        for (let i = 0; i < NR; i++) {
          const a0 = j * (NR + 1) + i;
          const b0 = a0 + NR + 1;
          idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
        }
      }
      const skirtGeo = new THREE.BufferGeometry();
      skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      skirtGeo.setIndex(idx);
      skirtGeo.computeVertexNormals();
      const skirtMat = M.gravel.clone();
      skirtMat.map = M.gravel.map.clone();
      skirtMat.map.repeat.set(1, 1);
      skirtMat.map.needsUpdate = true;
      skirtMat.normalMap = M.gravel.normalMap.clone();
      skirtMat.normalMap.repeat.set(2, 2);
      skirtMat.normalMap.needsUpdate = true;
      skirtMat.name = 'gravel-skirt';
      const skirt = new THREE.Mesh(skirtGeo, skirtMat);
      skirt.position.set(-6, 0, -6);
      skirt.receiveShadow = true;
      g.add(skirt);
    }

    // apron edge kerb + shallow drainage channel down two sides
    for (const [ax, az, bx, bz] of [
      [-69, 48, 57, 48], [-69, -60, 57, -60], [-69, -60, -69, 48], [57, -60, 57, 48],
    ]) {
      const dir = new THREE.Vector3(bx - ax, 0, bz - az);
      const len = dir.length();
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, len), M.concreteDark);
      kerb.position.set((ax + bx) / 2, 0.12, (az + bz) / 2);
      kerb.rotation.y = -Math.atan2(dir.x, dir.z);
      kerb.receiveShadow = true;
      g.add(kerb);
    }
    // drainage channel with grated covers along the south edge
    {
      const chan = new THREE.Mesh(new THREE.BoxGeometry(120, 0.16, 0.7), M.concreteDark);
      chan.position.set(-6, 0.03, 46.4);
      g.add(chan);
      for (let i = 0; i < 22; i++) {
        const x = -62 + i * 5.4;
        const cover = K.box(2.3, 0.07, 0.62, M.darkMetal, x, 0.12, 46.4);
        g.add(cover);
        for (let b = 0; b < 7; b++) {
          g.add(K.box(2.2, 0.05, 0.045, M.galvanised, x, 0.16, 46.4 - 0.24 + b * 0.08));
        }
      }
      // sump boxes at the ends
      for (const sx of [-62, 46]) {
        g.add(K.box(1.3, 0.2, 1.3, M.concreteDark, sx, 0.1, 46.4));
        g.add(K.box(1.0, 0.06, 1.0, M.darkMetal, sx, 0.22, 46.4));
        const plate = sign(20, 0.5, 0.25);
        plate.rotation.x = -Math.PI / 2;
        plate.position.set(sx, 0.24, 48.0);
        g.add(plate);
      }
    }

    // battery pads
    for (const [name, p] of Object.entries(PAD_POSITIONS)) {
      const size = name === 'sentinel' ? 34 : name === 'thaad' ? 30 : 28;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.concrete);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(p.x, 0.03, p.z);
      pad.receiveShadow = true;
      g.add(pad);

      const marks = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.94, size * 0.94), M.padMarkings);
      marks.rotation.x = -Math.PI / 2;
      marks.position.set(p.x, 0.045, p.z);
      g.add(marks);

      // pad kerb
      for (const [dx, dz, w, d] of [[0, -size / 2, size, 0.6], [0, size / 2, size, 0.6], [-size / 2, 0, 0.6, size], [size / 2, 0, 0.6, size]]) {
        const kerb = K.box(w, 0.22, d, M.concreteDark, p.x + dx, 0.11, p.z + dz);
        kerb.receiveShadow = true;
        g.add(kerb);
      }
      // corner tie-down blocks and an earthing point
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.add(K.box(0.5, 0.16, 0.5, M.steel, p.x + dx * (size / 2 - 1.6), 0.09, p.z + dz * (size / 2 - 1.6)));
      }
      g.add(K.cyl(0.09, 0.09, 0.5, 8, M.brass, p.x + size / 2 - 2.4, 0.25, p.z + size / 2 - 0.9));
      g.add(sign(27, 0.44, 0.22).translateX(p.x + size / 2 - 2.4).translateY(0.62).translateZ(p.z + size / 2 - 0.72));
    }

    // service roads: apron -> each pad
    const roadPaths = [
      [new THREE.Vector3(-6, 0, 44), new THREE.Vector3(-6, 0, -6)],
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(PAD_POSITIONS.patriot.x, 0, PAD_POSITIONS.patriot.z)],
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(PAD_POSITIONS.thaad.x, 0, PAD_POSITIONS.thaad.z)],
      [new THREE.Vector3(-6, 0, -6), new THREE.Vector3(PAD_POSITIONS.sentinel.x, 0, PAD_POSITIONS.sentinel.z)],
      [new THREE.Vector3(-6, 0, 30), new THREE.Vector3(RADAR_ORIGIN.x, 0, RADAR_ORIGIN.z)],
      [new THREE.Vector3(-6, 0, 26), new THREE.Vector3(SHELTER_ORIGIN.x + 1.4, 0, SHELTER_ORIGIN.z + 6.4)],
    ];
    const dashGeo = new THREE.PlaneGeometry(0.28, 2.4);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0xd8d0ae, roughness: 0.9, transparent: true, opacity: 0.55,
      polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false,
    });
    dashMat.name = 'road-dash';
    const trackGeo = new THREE.PlaneGeometry(3.4, 9);
    trackGeo.rotateX(-Math.PI / 2);
    // Sand-dusted asphalt. Raw M.asphalt against the pale apron reads as black
    // ink from the air, which flattens the whole site.
    const roadMat = rescaled(M.asphalt, 'service-road', 1, 2);
    roadMat.color.set(0x7e7b72);
    roadMat.normalScale = new THREE.Vector2(0.6, 0.6);
    const trackMats = [];
    for (const [a, b] of roadPaths) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      const road = new THREE.Mesh(worldUv(new THREE.PlaneGeometry(7, len), 6), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = -Math.atan2(dir.x, dir.z);
      road.position.copy(a).add(b).multiplyScalar(0.5);
      road.position.y = 0.04;
      road.receiveShadow = true;
      g.add(road);
      this._kerbs(g, a, b, 3.7);
      // centre dashes
      const dashes = Math.floor(len / 6);
      const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.atan2(dir.x, dir.z), 'XYZ'));
      for (let i = 0; i < dashes; i++) {
        const t = (i + 0.5) / dashes;
        const p = a.clone().lerp(b, t);
        const d = new THREE.Mesh(dashGeo, dashMat);
        d.position.set(p.x, 0.055, p.z);
        d.quaternion.copy(qq);
        g.add(d);
      }
      // tyre tracks tracing the wheel paths
      const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(dir.x, dir.z), 0, 'XYZ'));
      const nTrack = Math.max(2, Math.floor(len / 8.6));
      for (let i = 0; i < nTrack; i++) {
        const t = (i + 0.5) / nTrack;
        const p = a.clone().lerp(b, t);
        const mm = new THREE.Matrix4();
        mm.compose(new THREE.Vector3(p.x, 0.052, p.z), tq, new THREE.Vector3(1, 1, 1));
        trackMats.push(mm);
      }
    }
    // extra tracks fanning across the apron and up to the shelter
    for (let i = 0; i < 46; i++) {
      const x = -6 + rng.range(-56, 52);
      const z = -6 + rng.range(-46, 48);
      const a = rng.float() < 0.5 ? rng.range(-0.4, 0.4) : rng.range(1.2, 1.9);
      const mm = new THREE.Matrix4();
      mm.compose(
        new THREE.Vector3(x, 0.05, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)),
        new THREE.Vector3(1, 1, 0.7 + rng.float() * 1.3),
      );
      trackMats.push(mm);
    }
    const tracks = new THREE.InstancedMesh(trackGeo, trackMaterial(), trackMats.length);
    for (let i = 0; i < trackMats.length; i++) tracks.setMatrixAt(i, trackMats[i]);
    tracks.name = 'tyre-tracks';
    g.add(tracks);

    // patched concrete repairs
    const patchMat = new THREE.MeshStandardMaterial({
      map: M.asphalt.map, color: 0x8a867c, roughness: 0.99, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    patchMat.name = 'concrete-patch';
    for (let i = 0; i < 34; i++) {
      const w = rng.range(1.6, 6.5);
      const d = rng.range(1.4, 5.2);
      const x = -6 + rng.range(-58, 54);
      const z = -6 + rng.range(-50, 50);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), patchMat);
      p.rotation.set(-Math.PI / 2, 0, rng.range(0, Math.PI));
      p.position.set(x, 0.031, z);
      g.add(p);
    }

    // buried cable duct crossings: ramps over the road plus route markers
    const ductRuns = [
      [-6, 12, 1], [-6, -22, 1], [18, -6, 0], [-30, -18, 0], [26, -26, 0],
    ];
    for (const [x, z, along] of ductRuns) {
      const w = along ? 9 : 1.1;
      const d = along ? 1.1 : 9;
      const ramp = K.box(w, 0.14, d, M.hazard, x, 0.09, z);
      g.add(ramp);
      g.add(groundMark(4, 3.0, 0.76, x + (along ? 0 : 2.4), z + (along ? 2.4 : 0), along ? 0 : Math.PI / 2, 0.062));
      for (const s of [-1, 1]) {
        const post = K.cyl(0.05, 0.05, 0.8, 6, M.hazard, x + (along ? s * 5.6 : 0), 0.4, z + (along ? 0 : s * 5.6));
        g.add(post);
      }
    }

    // painted labels, bays and hatching
    g.add(groundMark(0, 5.6, 1.4, -46, 6, 0));
    g.add(groundMark(1, 5.6, 1.4, 18, 20, Math.PI / 2));
    g.add(groundMark(2, 8.4, 1.5, -6, -46, 0));
    g.add(groundMark(15, 6.0, 1.3, 12, 4, -Math.PI / 2));
    g.add(groundMark(9, 4.8, 1.2, -6, 42, 0));
    g.add(groundMark(13, 3.6, 1.0, -6, 18, 0));
    g.add(groundMark(13, 3.6, 1.0, 6, -6, -Math.PI / 2));
    // vehicle parking bays along the south apron, either side of the entry road
    for (const bx of [-47, -37.5, -29, 12, 20]) {
      for (const s of [-1, 1]) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 9.4), dashMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(bx + s * 4.2, 0.056, 33);
        g.add(line);
      }
      g.add(groundMark(5 + (Math.abs(bx | 0) % 3), 2.4, 0.72, bx, 27.6, 0, 0.058));
    }
    // hatched keep-clear box outside the shelter door
    for (let i = 0; i < 3; i++) {
      g.add(groundMark(12, 5.0, 1.3, -17.0, 31.4 - i * 1.4, -0.18, 0.058));
    }

    this.group.add(g);
  }

  // -------------------------------------------------------------------------
  // Command shelter
  // -------------------------------------------------------------------------

  buildShelter() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'shelter';
    g.position.copy(SHELTER_ORIGIN);
    g.rotation.y = -0.18;

    const W = 17;          // external width
    const D = 10;          // external depth
    const H = 3.9;         // internal height
    const wallT = 0.3;
    const FL = 0.14;       // finished floor level above the apron
    const doorW = 1.9;
    const doorH = 2.45;
    const doorX = 2.6;
    const frontZ = D / 2;
    const eaves = FL + H;
    const wallMat = M.corrugated;

    // ---------------- foundation ----------------
    const slab = K.box(W + 2.4, FL, D + 2.4, M.concreteDark, 0, FL / 2, 0);
    slab.receiveShadow = true;
    g.add(slab);
    // entry apron in front of the doorway
    const stoop = K.box(5.2, FL * 0.7, 3.6, M.concrete, doorX, FL * 0.35, frontZ + 3.0);
    stoop.receiveShadow = true;
    g.add(stoop);

    // ---------------- shell ----------------
    const addWall = (w, h, d, x, y, z) => {
      const m = K.box(w, h, d, wallMat, x, y, z);
      g.add(m);
      return m;
    };
    addWall(W, H, wallT, 0, FL + H / 2, -D / 2);
    addWall(wallT, H, D, -W / 2, FL + H / 2, 0);
    addWall(wallT, H, D, W / 2, FL + H / 2, 0);
    // front wall either side of the doorway, then the lintel
    const leftEdge = doorX - doorW / 2;
    const rightEdge = doorX + doorW / 2;
    addWall(leftEdge + W / 2, H, wallT, (-W / 2 + leftEdge) / 2, FL + H / 2, frontZ);
    addWall(W / 2 - rightEdge, H, wallT, (rightEdge + W / 2) / 2, FL + H / 2, frontZ);
    addWall(doorW, H - doorH, wallT, doorX, FL + doorH + (H - doorH) / 2, frontZ);

    // corner posts, girt bands and base flashing give the box a structure
    for (const [cx, cz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
      g.add(K.box(0.34, H + 0.1, 0.34, M.galvanised, cx, FL + H / 2, cz));
    }
    for (const y of [FL + 1.3, FL + 2.7]) {
      g.add(K.box(W + 0.1, 0.14, 0.1, M.galvanised, 0, y, -D / 2 - 0.16));
      for (const s of [-1, 1]) g.add(K.box(0.1, 0.14, D + 0.1, M.galvanised, s * (W / 2 + 0.16), y, 0));
      g.add(K.box(W / 2 + leftEdge, 0.14, 0.1, M.galvanised, (-W / 2 + leftEdge) / 2, y, frontZ + 0.16));
      g.add(K.box(W / 2 - rightEdge, 0.14, 0.1, M.galvanised, (rightEdge + W / 2) / 2, y, frontZ + 0.16));
    }
    // Base flashing. This has to be a skirt around the outside of the walls: a
    // solid slab across the footprint buries the interior deck and everything
    // standing on it up to knee height.
    {
      const fy = FL + 0.15;
      g.add(K.box(W + 0.1, 0.3, 0.22, M.galvanised, 0, fy, -D / 2 - 0.16));
      for (const s of [-1, 1]) g.add(K.box(0.22, 0.3, D + 0.1, M.galvanised, s * (W / 2 + 0.16), fy, 0));
      g.add(K.box(W / 2 + leftEdge, 0.3, 0.22, M.galvanised, (-W / 2 + leftEdge) / 2, fy, frontZ + 0.16));
      g.add(K.box(W / 2 - rightEdge, 0.3, 0.22, M.galvanised, (rightEdge + W / 2) / 2, fy, frontZ + 0.16));
    }

    // weathering: run-off streaks below the roof line and around fixings
    for (const [x, z, w, ry] of [
      [-4.2, -D / 2 - 0.19, 6.0, 0], [4.6, -D / 2 - 0.19, 4.4, 0],
      [-W / 2 - 0.19, -1.4, 5.6, Math.PI / 2], [W / 2 + 0.19, 1.2, 6.4, -Math.PI / 2],
      [-3.4, frontZ + 0.19, 5.2, Math.PI],
    ]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.7), grimeMaterial());
      s.position.set(x, FL + H - 1.45, z);
      s.rotation.y = ry;
      g.add(s);
    }

    // ---------------- doorway ----------------
    const frame = new THREE.Group();
    frame.position.set(doorX, FL, frontZ);
    for (const s of [-1, 1]) {
      frame.add(K.box(0.14, doorH + 0.1, 0.46, M.darkMetal, s * (doorW / 2 + 0.07), (doorH + 0.1) / 2, 0));
    }
    frame.add(K.box(doorW + 0.28, 0.14, 0.46, M.darkMetal, 0, doorH + 0.12, 0));
    frame.add(K.box(doorW + 0.28, 0.06, 0.5, M.hazard, 0, 0.03, 0));
    const door = K.box(doorW - 0.08, doorH - 0.1, 0.08, M.panelOlive, 0, (doorH - 0.1) / 2 + 0.05, 0);
    door.position.x = -doorW * 0.5;
    door.rotation.y = -1.98;
    door.geometry.translate(doorW * 0.5 - 0.04, 0, 0);
    frame.add(door);
    // door furniture on the open leaf
    const leafDress = new THREE.Group();
    leafDress.position.copy(door.position);
    leafDress.rotation.copy(door.rotation);
    leafDress.add(K.box(0.06, 0.5, 0.05, M.steel, doorW - 0.24, 1.05, 0.07));
    leafDress.add(sign(26, 0.5, 0.25).translateX(doorW * 0.5 - 0.04).translateY(1.75).translateZ(0.05));
    frame.add(leafDress);
    // door retainer hook and a rubber wedge
    frame.add(K.cyl(0.03, 0.03, 0.3, 6, M.steel, -doorW * 0.5 - 1.6, 0.15, 0.3));
    g.add(frame);

    // entry step, boot grate and handrails
    const step = new THREE.Group();
    step.position.set(doorX, 0, frontZ + 0.62);
    step.add(K.box(2.3, 0.08, 1.0, M.darkMetal, 0, 0.045, 0));
    step.add(K.box(2.3, 0.07, 0.28, M.galvanised, 0, 0.11, -0.34));
    for (let i = 0; i < 9; i++) {
      step.add(K.box(2.2, 0.04, 0.05, M.galvanised, 0, 0.1, -0.42 + i * 0.11));
    }
    for (const s of [-1, 1]) {
      const rail = K.handrail(1.5, 0.95);
      rail.rotation.y = Math.PI / 2;
      rail.position.set(s * 1.2, 0.08, 0.15);
      step.add(rail);
    }
    g.add(step);
    // worn footfall stain on the stoop
    {
      const wear = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), grimeMaterial());
      wear.rotation.x = -Math.PI / 2;
      wear.position.set(doorX, FL * 0.72, frontZ + 1.9);
      g.add(wear);
    }

    // signage cluster beside the door
    g.add(sign(12, 1.5, 0.42).translateX(doorX).translateY(FL + doorH + 0.62).translateZ(frontZ + 0.2));
    g.add(sign(13, 1.9, 0.55).translateX(-4.4).translateY(FL + 2.9).translateZ(frontZ + 0.2));
    g.add(sign(14, 1.2, 0.34).translateX(-4.4).translateY(FL + 2.35).translateZ(frontZ + 0.2));
    const board = new THREE.Group();
    board.position.set(rightEdge + 0.9, FL, frontZ + 0.2);
    board.add(sign(1, 0.78, 0.42).translateY(2.05));
    board.add(sign(0, 0.78, 0.42).translateY(1.58));
    board.add(sign(2, 0.78, 0.42).translateY(1.11));
    g.add(board);
    const doorMark = sign(11, 1.1, 0.3);
    doorMark.rotation.x = -Math.PI / 2;
    doorMark.position.set(doorX, FL * 0.78, frontZ + 2.5);
    g.add(doorMark);

    // ---------------- roof ----------------
    const roof = K.box(W + 1.0, 0.3, D + 1.0, M.panelOlive, 0, eaves + 0.15, 0);
    roof.receiveShadow = true;
    g.add(roof);
    // standing seams
    for (let i = 0; i < 15; i++) {
      const x = (i / 14 - 0.5) * (W + 0.6);
      g.add(K.box(0.1, 0.08, D + 0.9, M.galvanised, x, eaves + 0.34, 0));
    }
    // parapet
    for (const [x, z, w, d] of [
      [0, -(D / 2 + 0.4), W + 1.0, 0.2], [0, D / 2 + 0.4, W + 1.0, 0.2],
      [-(W / 2 + 0.4), 0, 0.2, D + 1.0], [W / 2 + 0.4, 0, 0.2, D + 1.0],
    ]) {
      g.add(K.box(w, 0.44, d, M.galvanised, x, eaves + 0.5, z));
    }
    // roof walkway
    const walk = bakeInstanced(K.grating(11.5, 1.1));
    walk.position.set(-1.2, eaves + 0.34, 1.9);
    g.add(walk);
    // main environmental unit + fan (rotating)
    const hvac = K.box(2.4, 1.1, 1.7, M.panelGrey, -4.4, eaves + 0.85, -1.6);
    g.add(hvac);
    for (let i = 0; i < 8; i++) {
      g.add(K.box(0.05, 0.9, 1.6, M.blackMetal, -5.5 + i * 0.09, eaves + 0.85, -1.6));
    }
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.56, 16), M.blackMetal);
    fan.rotation.x = -Math.PI / 2;
    fan.position.set(-4.4, eaves + 1.41, -1.6);
    g.add(fan);
    g.add(K.box(1.3, 0.06, 1.3, M.galvanised, -4.4, eaves + 1.46, -1.6));
    const blades = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = K.box(0.9, 0.02, 0.16, M.steel, 0, 0, 0);
      b.rotation.y = (i / 5) * Math.PI * 2;
      b.rotation.z = 0.3;
      blades.add(b);
    }
    blades.position.set(-4.4, eaves + 1.43, -1.6);
    g.add(markDynamic(blades));
    this.rotators.push({ obj: blades, axis: 'y', speed: 6.5 });
    // second condenser + filter box
    g.add(K.box(1.5, 0.85, 1.2, M.panelGrey, -7.0, eaves + 0.72, -1.3));
    g.add(K.box(1.1, 0.5, 0.9, M.galvanised, -7.0, eaves + 1.4, -1.3));
    // supply / return trunking across the roof and down into the ceiling
    g.add(trunking([
      new THREE.Vector3(-3.2, eaves + 0.85, -1.6),
      new THREE.Vector3(0.6, eaves + 0.85, -1.6),
      new THREE.Vector3(0.6, eaves + 0.85, 1.0),
    ], 0.62, 0.5, M.galvanised));
    g.add(K.box(0.9, 0.28, 0.9, M.darkMetal, 0.6, eaves + 0.32, 1.0));
    // mushroom vents and a flue
    for (const [vx, vz] of [[3.6, -2.6], [5.6, -2.6], [7.4, 1.2]]) {
      g.add(K.cyl(0.16, 0.18, 0.5, 10, M.galvanised, vx, eaves + 0.55, vz));
      const cap = K.cyl(0.34, 0.16, 0.18, 10, M.galvanised, vx, eaves + 0.86, vz);
      g.add(cap);
    }
    g.add(K.cyl(0.1, 0.12, 1.5, 8, M.heatSteel, 6.4, eaves + 1.05, -3.0));
    g.add(K.cyl(0.17, 0.17, 0.08, 8, M.blackMetal, 6.4, eaves + 1.82, -3.0));
    // roof hatch with the lid propped open
    g.add(K.box(1.0, 0.14, 1.0, M.darkMetal, -6.4, eaves + 0.36, 2.6));
    const lid = K.box(1.05, 0.07, 1.05, M.panelGrey, -6.4, eaves + 0.86, 2.1);
    lid.rotation.x = -1.1;
    g.add(lid);
    // roof-edge cable tray carrying the mast feeders to the wall penetration
    const rtray = cableTray(7.6, 0.34, { cables: 4 });
    rtray.position.set(3.4, eaves + 0.62, -3.9);
    g.add(rtray);
    g.add(trunking([
      new THREE.Vector3(-0.4, eaves + 0.6, -3.9),
      new THREE.Vector3(-0.4, eaves + 0.6, -4.6),
    ], 0.3, 0.24, M.galvanised));

    // caged ladder up the end wall to the roof
    const ladder = bakeInstanced(K.ladder(eaves + 0.4));
    ladder.position.set(W / 2 + 0.22, 0, -3.2);
    ladder.rotation.y = Math.PI / 2;
    g.add(ladder);
    for (let i = 0; i < 5; i++) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.022, 4, 12, Math.PI), M.galvanised);
      hoop.rotation.y = -Math.PI / 2;
      hoop.position.set(W / 2 + 0.5, 1.5 + i * 0.62, -3.2);
      g.add(hoop);
    }

    // mast on the roof
    const mast = bakeInstanced(K.antennaMast(11, { dish: true, rng }));
    mast.position.set(W / 2 - 1.4, eaves + 0.3, -D / 2 + 1.3);
    g.add(mast);
    markDynamic(mast.userData.beacon, mast.userData.dish);
    this.beacons.push(mast.userData.beacon);
    if (mast.userData.dish) this.rotators.push({ obj: mast.userData.dish, axis: 'y', speed: 0.22 });
    // lightning finial and its down conductor
    g.add(K.cyl(0.01, 0.02, 1.6, 4, M.steel, -W / 2 + 0.6, eaves + 1.3, -D / 2 + 0.6));
    g.add(K.cable(
      new THREE.Vector3(-W / 2 + 0.6, eaves + 0.5, -D / 2 + 0.6),
      new THREE.Vector3(-W / 2 - 0.25, 0.1, -D / 2 + 0.6),
      { sag: 0.06, radius: 0.02, material: M.brass, segments: 8 },
    ));

    // ---------------- exterior services ----------------
    // conduit runs and junction boxes on the west wall
    for (let i = 0; i < 3; i++) {
      const y = FL + 0.9 + i * 0.62;
      g.add(K.conduit([
        new THREE.Vector3(-W / 2 - 0.18, y, D / 2 - 0.3),
        new THREE.Vector3(-W / 2 - 0.18, y, -D / 2 + 0.4),
        new THREE.Vector3(-W / 2 + 1.2, y, -D / 2 - 0.18),
      ], 0.045));
      for (let c = 0; c < 5; c++) {
        g.add(K.box(0.1, 0.06, 0.06, M.steel, -W / 2 - 0.18, y + 0.07, 4.2 - c * 2.1));
      }
    }
    for (let i = 0; i < 4; i++) {
      g.add(K.box(0.34, 0.42, 0.2, M.panelGrey, -W / 2 - 0.2, FL + 1.5, 3.0 - i * 1.9).rotateY(Math.PI / 2));
    }
    // main distribution board and isolator beside the door
    const dbox = new THREE.Group();
    dbox.position.set(rightEdge + 3.4, FL, frontZ + 0.2);
    dbox.add(K.box(1.1, 1.3, 0.34, M.panelGrey, 0, 1.5, 0));
    dbox.add(K.box(1.0, 0.06, 0.06, M.darkMetal, 0, 2.2, 0.19));
    dbox.add(K.box(0.3, 0.36, 0.22, M.blackMetal, 0.75, 1.5, 0));
    dbox.add(K.cyl(0.035, 0.035, 0.16, 6, M.ledRed, 0.75, 1.5, 0.16).rotateX(Math.PI / 2));
    dbox.add(sign(4, 0.62, 0.32).translateY(2.34));
    g.add(dbox);
    // gland plate + cable entries on the back wall
    const gland = new THREE.Group();
    gland.position.set(2.0, FL + 1.5, -D / 2 - 0.16);
    gland.add(K.box(1.5, 0.9, 0.1, M.panelGrey, 0, 0, 0));
    for (let i = 0; i < 6; i++) {
      gland.add(K.cyl(0.06, 0.07, 0.18, 8, M.brass, -0.58 + i * 0.23, -0.15, -0.1).rotateX(Math.PI / 2));
    }
    gland.add(sign(19, 0.7, 0.3).translateY(0.62).rotateY(Math.PI));
    gland.rotation.y = Math.PI;
    g.add(gland);
    // cable trestle carrying the feeders away from the shelter
    for (let i = 0; i < 4; i++) {
      const z = -D / 2 - 1.6 - i * 2.6;
      g.add(K.box(0.12, 1.1, 0.12, M.galvanised, 1.4, 0.55, z));
      g.add(K.box(0.12, 1.1, 0.12, M.galvanised, 2.6, 0.55, z));
      g.add(K.box(1.5, 0.1, 0.1, M.galvanised, 2.0, 1.12, z));
    }
    g.add(loom(
      new THREE.Vector3(2.0, FL + 1.34, -D / 2 - 0.3),
      new THREE.Vector3(2.0, 1.16, -D / 2 - 9.4),
      4, { sag: 0.14, radius: 0.05, spread: 0.13 },
    ));

    // environmental control unit standing on the ground with flexible ducts
    const ecu = new THREE.Group();
    ecu.position.set(-6.4, 0, -D / 2 - 1.5);
    ecu.add(K.box(2.4, 0.22, 1.6, M.concreteDark, 0, 0.11, 0));
    ecu.add(K.box(2.0, 1.25, 1.25, M.panelGrey, 0, 0.85, 0));
    for (let i = 0; i < 10; i++) ecu.add(K.box(1.9, 0.05, 0.05, M.blackMetal, 0, 0.42 + i * 0.09, -0.64));
    ecu.add(K.box(0.5, 0.4, 0.06, M.blackMetal, 0.66, 1.0, 0.64));
    ecu.add(K.cyl(0.03, 0.03, 0.06, 8, M.ledGreen, 0.52, 1.12, 0.69).rotateX(Math.PI / 2));
    ecu.add(sign(30, 0.6, 0.3).translateY(1.62).translateZ(0.2));
    const ductA = K.conduit([
      new THREE.Vector3(-0.5, 1.5, 0.2),
      new THREE.Vector3(-0.5, 2.3, 0.9),
      new THREE.Vector3(-0.5, 2.5, 1.42),
    ], 0.22, M.galvanised);
    ecu.add(ductA);
    const ductB = K.conduit([
      new THREE.Vector3(0.5, 1.5, 0.2),
      new THREE.Vector3(0.5, 1.9, 0.9),
      new THREE.Vector3(0.5, 2.0, 1.42),
    ], 0.19, M.galvanised);
    ecu.add(ductB);
    g.add(ecu);
    this.collision.addBox(
      new THREE.Vector3(SHELTER_ORIGIN.x - 5.2, 0.8, SHELTER_ORIGIN.z - 7.3),
      new THREE.Vector3(2.6, 1.6, 2.0), 'ecu',
    );

    // exterior lamp over the door
    const lamp = new THREE.Group();
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.26, 12, 1, true), M.darkMetal);
    shade.rotation.x = Math.PI;
    lamp.add(shade);
    lamp.add(K.box(0.1, 0.1, 0.34, M.darkMetal, 0, 0.06, -0.2));
    const bulb = K.sphere(0.1, M.lampGlassOff, 0, -0.1, 0, 10);
    lamp.add(bulb);
    lamp.position.set(doorX, FL + 2.85, frontZ + 0.45);
    g.add(lamp);
    markDynamic(bulb);
    this.lampLights.push({ bulbMesh: bulb, group: lamp, kind: 'door' });
    // wall packs on the long walls, lit from the shared lamp material
    for (const [lx, lz, ly] of [[-5.6, frontZ + 0.2, FL + 2.9], [-W / 2 - 0.2, -2.0, FL + 2.9], [W / 2 + 0.2, 2.0, FL + 2.9]]) {
      const wp = new THREE.Group();
      wp.position.set(lx, ly, lz);
      wp.add(K.box(0.4, 0.2, 0.24, M.darkMetal, 0, 0, 0));
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14), this.lampGlassMaterial);
      lens.position.set(0, -0.09, 0);
      lens.rotation.x = -Math.PI / 2;
      wp.add(lens);
      if (Math.abs(lx) > 8) wp.rotation.y = Math.sign(lx) * Math.PI / 2;
      g.add(wp);
    }

    // fire point, gas rack and stores against the west end
    const firePoint = new THREE.Group();
    firePoint.position.set(-W / 2 - 0.9, 0, 2.6);
    firePoint.add(K.box(1.2, 0.12, 0.7, M.concreteDark, 0, 0.06, 0));
    for (const s of [-1, 1]) {
      firePoint.add(K.cyl(0.13, 0.15, 0.62, 12, M.ledRed, s * 0.3, 0.43, 0));
      firePoint.add(K.cyl(0.05, 0.05, 0.12, 8, M.blackMetal, s * 0.3, 0.8, 0));
    }
    firePoint.add(K.cyl(0.05, 0.05, 1.8, 6, M.galvanised, 0, 0.9, -0.3));
    firePoint.add(sign(8, 0.66, 0.34).translateY(1.68).translateZ(-0.26).rotateY(-Math.PI / 2));
    g.add(firePoint);
    const gasRack = new THREE.Group();
    gasRack.position.set(-W / 2 - 1.0, 0, -2.2);
    gasRack.add(K.box(1.5, 0.1, 0.8, M.darkMetal, 0, 0.05, 0));
    for (let i = 0; i < 3; i++) {
      gasRack.add(K.cyl(0.16, 0.16, 1.25, 12, i === 1 ? M.panelWhite : M.olivePlain, -0.45 + i * 0.45, 0.72, 0));
      gasRack.add(K.cyl(0.06, 0.06, 0.16, 8, M.brass, -0.45 + i * 0.45, 1.42, 0));
    }
    gasRack.add(K.box(1.5, 0.06, 0.06, M.galvanised, 0, 1.0, 0.34));
    g.add(gasRack);

    // revetment: sandbags along the exposed sides, gabions on the weather side
    this._shelterRevetment(g);

    // ---------------- interior ----------------
    const inner = new THREE.Group();
    inner.name = 'shelter-interior';
    g.add(inner);

    const iw = W - 2 * wallT;
    const idp = D - 2 * wallT;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(iw, idp), shelterFloorMaterial());
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FL + 0.01;
    floor.receiveShadow = true;
    inner.add(floor);

    // Floor dressing. Tile joints alone flatten out at standing eye height, so
    // the deck gets paint, trunking and a cable-void hatch to give it scale.
    const FD = FL + 0.02;
    inner.add(groundMark(3, 2.4, 0.6, 2.6, 3.55, 0, FD));
    inner.add(groundMark(13, 1.6, 0.42, -6.2, 3.3, Math.PI, FD));
    // barrier matting inside the doorway, worn tread plate at its lip
    inner.add(K.box(2.0, 0.025, 1.15, M.rubber, 2.6, FD + 0.012, 4.05));
    inner.add(K.box(2.1, 0.02, 0.14, M.steel, 2.6, FD + 0.01, 4.66));
    // hazard-hatched keep-clear strip in front of the rack row
    inner.add(K.box(5.6, 0.014, 0.5, M.hazard, -5.3, FD, -3.35));
    // lift-out cable-void cover: a steel plate in a galvanised frame
    inner.add(K.box(1.28, 0.03, 0.98, M.steel, -2.9, FD, 2.3));
    for (const [hx, hz, hw, hd] of [[-2.9, 1.78, 1.4, 0.07], [-2.9, 2.82, 1.4, 0.07],
      [-3.57, 2.3, 0.07, 1.11], [-2.23, 2.3, 0.07, 1.11]]) {
      inner.add(K.box(hw, 0.035, hd, M.galvanised, hx, FD, hz));
    }
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 4, 10), M.blackMetal);
      ring.position.set(-2.9 + s * 0.42, FD + 0.02, 2.3);
      inner.add(ring);
    }
    // surface trunking carrying the console loom across to the rack row
    inner.add(trunking([
      new THREE.Vector3(-1.5, FD + 0.045, -2.05),
      new THREE.Vector3(-4.9, FD + 0.045, -2.05),
      new THREE.Vector3(-4.9, FD + 0.045, -3.1),
    ], 0.3, 0.09, M.galvanised));

    // painted lining over the corrugations, plus a skirting and dado rail
    const lining = liningMaterial();
    inner.add(K.box(iw, H - 0.1, 0.06, lining, 0, FL + (H - 0.1) / 2, -idp / 2 + 0.03));
    for (const s of [-1, 1]) {
      inner.add(K.box(0.06, H - 0.1, idp, lining, s * (iw / 2 - 0.03), FL + (H - 0.1) / 2, 0));
    }
    inner.add(K.box(iw / 2 + leftEdge - 0.3, H - 0.1, 0.06, lining,
      (-iw / 2 + leftEdge - 0.3) / 2, FL + (H - 0.1) / 2, idp / 2 - 0.03));
    inner.add(K.box(iw / 2 - rightEdge - 0.3, H - 0.1, 0.06, lining,
      (rightEdge + 0.3 + iw / 2) / 2, FL + (H - 0.1) / 2, idp / 2 - 0.03));
    for (const [w, x, z, ry] of [
      [iw, 0, -idp / 2 + 0.08, 0], [idp, -iw / 2 + 0.08, 0, Math.PI / 2],
      [idp, iw / 2 - 0.08, 0, Math.PI / 2],
    ]) {
      inner.add(K.box(w, 0.16, 0.05, M.darkMetal, x, FL + 0.08, z).rotateY(ry));
      inner.add(K.box(w, 0.06, 0.04, M.galvanised, x, FL + 1.1, z).rotateY(ry));
    }

    // ceiling, light fixtures and services
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(iw, idp), shelterCeilingMaterial());
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = FL + H - 0.02;
    inner.add(ceil);
    for (let i = 0; i < 6; i++) {
      inner.add(K.box(0.14, 0.16, idp, M.galvanised, (i / 5 - 0.5) * (iw - 1.2), FL + H - 0.1, 0));
    }
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 5.0;
      inner.add(K.box(2.7, 0.12, 0.42, M.darkMetal, x, FL + H - 0.2, 0));
      const tube = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.3), this.tubeMaterial);
      tube.position.set(x, FL + H - 0.27, 0);
      inner.add(tube);
      // warm fittings deliberately fight the cold sky ambient that otherwise
      // floods the interior blue through the doorway
      const pt = new THREE.PointLight(0xffe6bc, 36, 18, 2);
      pt.position.set(x, FL + H - 0.95, 0);
      inner.add(pt);
      this.lampLights.push({ light: pt, tube, kind: 'interior' });
    }
    // ceiling diffusers fed from the roof unit
    for (const [dx, dz] of [[-3.4, -1.4], [3.4, -1.4], [0, 2.2]]) {
      inner.add(K.box(0.6, 0.1, 0.6, M.galvanised, dx, FL + H - 0.14, dz));
      for (let i = 0; i < 4; i++) {
        inner.add(K.box(0.54, 0.03, 0.06, M.darkMetal, dx, FL + H - 0.2, dz - 0.2 + i * 0.13));
      }
    }
    inner.add(trunking([
      new THREE.Vector3(-4.6, FL + H - 0.42, -1.4),
      new THREE.Vector3(3.8, FL + H - 0.42, -1.4),
    ], 0.5, 0.36, M.galvanised));
    // cable trays hugging both long walls with bundles inside
    for (const s of [-1, 1]) {
      const tray = cableTray(iw - 0.6, 0.42, { cables: 4 });
      tray.position.set(0, FL + H - 0.62, s * (idp / 2 - 0.55));
      inner.add(tray);
    }
    const crossTray = cableTray(idp - 1.2, 0.36, { cables: 3 });
    crossTray.rotation.y = Math.PI / 2;
    crossTray.position.set(-2.4, FL + H - 0.66, 0);
    inner.add(crossTray);

    // ---- radar console table (the primary control station) ----
    const console3d = new THREE.Group();
    console3d.position.set(0, FL, -1.1);
    inner.add(console3d);

    // The pedestal is a straight-sided painted cabinet: a light drum reads as a
    // bare barrel, so it stays dark and the ribs sit flush against its skin.
    const pedSkin = new THREE.MeshStandardMaterial({ color: 0x3c4247, roughness: 0.66, metalness: 0.34 });
    console3d.add(K.cyl(1.45, 1.45, 0.8, 24, pedSkin, 0, 0.53, 0));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rib = K.box(0.1, 0.74, 0.05, M.darkMetal, Math.cos(a) * 1.46, 0.53, Math.sin(a) * 1.46);
      rib.rotation.y = -a;
      console3d.add(rib);
    }
    // louvred cooling intake on the operator side
    for (let i = 0; i < 5; i++) {
      console3d.add(K.box(0.9, 0.035, 0.05, M.blackMetal, 0, 0.34 + i * 0.1, 1.44));
    }
    // plinth, top rim and the cable boot dropping into the floor void
    console3d.add(K.cyl(1.58, 1.66, 0.24, 24, M.darkMetal, 0, 0.12, 0));
    console3d.add(K.cyl(1.5, 1.5, 0.14, 24, M.darkMetal, 0, 0.93, 0));
    console3d.add(K.box(0.5, 0.34, 0.3, M.blackMetal, 0, 0.2, -1.45));
    console3d.add(bakeInstanced(K.boltRing(1.5, 24, M.steel)).translateY(0.06).rotateX(-Math.PI / 2));
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32), M.darkMetal);
    tableTop.position.y = 1.02;
    console3d.add(tableTop);
    const scopeMat = new THREE.MeshBasicMaterial({ color: 0x0a1d16, toneMapped: false });
    const scope = new THREE.Mesh(new THREE.CircleGeometry(1.36, 48), scopeMat);
    scope.rotation.x = -Math.PI / 2;
    scope.position.y = 1.075;
    console3d.add(scope);
    this.scopeMaterial = scopeMat;
    this.scopeMesh = scope;
    const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.07, 8, 44), M.blackMetal);
    bezelRing.rotation.x = Math.PI / 2;
    bezelRing.position.y = 1.07;
    console3d.add(bezelRing);
    // operator furniture on the table rim
    for (let i = 0; i < 3; i++) {
      const a = -0.9 + i * 0.9;
      const trackball = K.cyl(0.09, 0.1, 0.05, 12, M.blackMetal, Math.sin(a) * 1.15, 1.1, Math.cos(a) * 1.15);
      console3d.add(trackball);
      console3d.add(K.sphere(0.055, M.rubber, Math.sin(a) * 1.15, 1.14, Math.cos(a) * 1.15, 8));
    }
    console3d.add(mug(M.panelWhite).translateX(-1.05).translateY(1.08).translateZ(0.86));
    console3d.add(K.box(0.3, 0.012, 0.22, M.panelWhite, 1.02, 1.08, 0.72).rotateY(0.4));

    // twin upright monitors behind the table
    const monitorRig = new THREE.Group();
    monitorRig.position.set(0, FL, -3.4);
    inner.add(monitorRig);
    monitorRig.add(K.box(4.8, 0.16, 1.0, M.panelGrey, 0, 1.0, 0));
    monitorRig.add(K.box(4.8, 0.9, 0.1, M.darkMetal, 0, 0.5, -0.42));
    for (const s of [-1, 1]) {
      const stand = K.cyl(0.06, 0.09, 0.7, 8, M.darkMetal, s * 1.35, 1.4, 0);
      monitorRig.add(stand);
      monitorRig.add(K.box(0.42, 0.04, 0.3, M.darkMetal, s * 1.35, 1.08, 0));
      const body = K.box(1.9, 1.15, 0.12, M.blackMetal, s * 1.35, 2.17, 0);
      monitorRig.add(body);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x0c2018, toneMapped: false });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 0.98), screenMat);
      screen.position.set(s * 1.35, 2.17, 0.07);
      monitorRig.add(screen);
      this.screens.push({ mesh: screen, material: screenMat, side: s });
      // headset hooked over the monitor corner
      const hs = new THREE.Group();
      hs.position.set(s * 2.2, 2.55, 0.02);
      hs.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 4, 10, Math.PI), M.rubber));
      hs.add(K.box(0.06, 0.09, 0.05, M.blackMetal, -0.12, -0.02, 0));
      hs.add(K.box(0.06, 0.09, 0.05, M.blackMetal, 0.12, -0.02, 0));
      monitorRig.add(hs);
    }
    // keyboard shelf, clutter
    monitorRig.add(K.box(4.4, 0.08, 0.72, M.darkMetal, 0, 1.14, 0.62));
    for (const s of [-1, 1]) {
      const kb = K.box(0.9, 0.05, 0.32, M.blackMetal, s * 1.2, 1.2, 0.64);
      kb.rotation.x = -0.09;
      monitorRig.add(kb);
    }
    monitorRig.add(mug(M.olivePlain).translateX(0.15).translateY(1.18).translateZ(0.5));
    monitorRig.add(K.box(0.26, 0.05, 0.34, M.panelWhite, -0.45, 1.2, 0.44).rotateY(-0.2));
    monitorRig.add(K.cyl(0.035, 0.035, 0.22, 8, M.ledBlue, 2.1, 1.28, 0.5));

    // chairs on castors
    for (const [cx, cz, ry] of [[-1.45, -1.9, 0.3], [1.5, -1.85, -0.25], [4.9, 1.9, 2.2]]) {
      const chair = new THREE.Group();
      chair.position.set(cx, FL, cz);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        chair.add(K.box(0.3, 0.045, 0.06, M.darkMetal, Math.cos(a) * 0.15, 0.09, Math.sin(a) * 0.15).rotateY(-a));
        chair.add(K.cyl(0.035, 0.035, 0.05, 6, M.blackMetal, Math.cos(a) * 0.29, 0.05, Math.sin(a) * 0.29).rotateX(Math.PI / 2));
      }
      chair.add(K.cyl(0.05, 0.06, 0.34, 8, M.steel, 0, 0.28, 0));
      chair.add(K.cyl(0.09, 0.09, 0.1, 10, M.darkMetal, 0, 0.46, 0));
      chair.add(K.box(0.52, 0.1, 0.5, M.rubber, 0, 0.53, 0));
      const back = K.box(0.5, 0.62, 0.09, M.rubber, 0, 0.9, -0.23);
      back.rotation.x = -0.16;
      chair.add(back);
      for (const s of [-1, 1]) {
        chair.add(K.box(0.06, 0.2, 0.3, M.blackMetal, s * 0.28, 0.68, -0.02));
        chair.add(K.box(0.08, 0.05, 0.34, M.rubber, s * 0.28, 0.8, 0.0));
      }
      chair.rotation.y = ry;
      inner.add(chair);
    }

    // the physical arm / launch panel on a side desk
    const panelDesk = new THREE.Group();
    panelDesk.position.set(4.6, FL, 0.4);
    panelDesk.rotation.y = -0.9;
    inner.add(panelDesk);
    panelDesk.add(K.box(2.3, 0.94, 0.85, M.panelGrey, 0, 0.47, 0));
    panelDesk.add(K.box(2.4, 0.06, 0.95, M.darkMetal, 0, 0.96, 0));
    const slope = K.box(2.2, 0.07, 0.78, M.panelGrey, 0, 0.99, 0.05);
    slope.rotation.x = -0.32;
    panelDesk.add(slope);
    const bigButtonBase = K.cyl(0.15, 0.17, 0.06, 16, M.blackMetal, 0.6, 1.06, 0.1);
    bigButtonBase.rotation.x = -0.32;
    panelDesk.add(bigButtonBase);
    const bigButton = K.cyl(0.12, 0.12, 0.07, 16, M.ledRed, 0.6, 1.1, 0.11);
    bigButton.rotation.x = -0.32;
    panelDesk.add(bigButton);
    this.launchButton = bigButton;
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 16), M.hazard);
    guard.rotation.x = Math.PI / 2 - 0.32;
    guard.position.set(0.6, 1.09, 0.1);
    panelDesk.add(guard);
    const armPlate = sign(23, 0.4, 0.2);
    armPlate.rotation.x = -Math.PI / 2 - 0.32;
    armPlate.position.set(0.6, 1.08, 0.42);
    panelDesk.add(armPlate);
    for (let i = 0; i < 6; i++) {
      const sw = K.box(0.05, 0.12, 0.05, M.steel, -0.85 + i * 0.16, 1.06, 0.16);
      sw.rotation.x = -0.32 + (i % 2 ? 0.4 : -0.4);
      panelDesk.add(sw);
      const led = K.cyl(0.018, 0.018, 0.014, 8, i % 2 ? M.ledGreen : M.ledAmber, -0.85 + i * 0.16, 1.06, 0.28);
      led.rotation.x = Math.PI / 2 - 0.32;
      panelDesk.add(led);
    }
    for (let i = 0; i < 3; i++) {
      const dial = K.cyl(0.07, 0.07, 0.03, 12, M.darkMetal, -0.2 + i * 0.2, 1.06, 0.02);
      dial.rotation.x = -0.32;
      panelDesk.add(dial);
    }
    // key switch, log book and a mug on the corner of the desk
    panelDesk.add(K.cyl(0.05, 0.05, 0.03, 10, M.brass, -0.95, 1.06, -0.05).rotateX(-0.32));
    panelDesk.add(K.box(0.32, 0.05, 0.24, M.olivePlain, 0.98, 1.01, -0.2).rotateY(0.25));
    panelDesk.add(mug(M.panelWhite).translateX(-1.02).translateY(0.99).translateZ(-0.24));

    // ---- equipment racks along the back wall ----
    for (let r = 0; r < 5; r++) {
      const rack = new THREE.Group();
      rack.position.set(-7.7 + r * 1.16, FL, -idp / 2 + 0.52);
      rack.add(K.box(1.1, 2.05, 0.82, M.blackMetal, 0, 1.03, 0));
      rack.add(K.box(1.16, 0.08, 0.88, M.darkMetal, 0, 2.07, 0));
      rack.add(K.box(1.16, 0.1, 0.88, M.darkMetal, 0, 0.05, 0));
      const face = rackFace(0.98, 1.86, r % 2);
      face.position.set(0, 1.03, 0.42);
      rack.add(face);
      // a few real LEDs so the racks read at a glance
      for (let u = 0; u < 5; u++) {
        rack.add(K.box(0.035, 0.03, 0.02, u % 3 === 0 ? M.ledGreen : u % 3 === 1 ? M.ledAmber : M.ledOff,
          -0.36, 0.4 + u * 0.36, 0.435));
      }
      // patch jumpers looping out of the front on one rack
      if (r === 2) {
        for (let j = 0; j < 6; j++) {
          rack.add(K.cable(
            new THREE.Vector3(-0.32 + j * 0.12, 1.62, 0.44),
            new THREE.Vector3(-0.28 + j * 0.1, 1.24, 0.44),
            { sag: 0.16, radius: 0.012, segments: 8, material: j % 2 ? M.ledBlue : M.rubber },
          ));
        }
      }
      inner.add(rack);
    }
    // overhead tray dropping feeders into the racks
    for (let r = 0; r < 5; r++) {
      inner.add(K.cable(
        new THREE.Vector3(-7.7 + r * 1.16, FL + H - 0.7, -idp / 2 + 0.9),
        new THREE.Vector3(-7.7 + r * 1.16, FL + 2.1, -idp / 2 + 0.62),
        { sag: 0.05, radius: 0.03, segments: 8 },
      ));
    }

    // ---- work bench, stores and brew point ----
    const bench = new THREE.Group();
    bench.position.set(6.3, FL, -idp / 2 + 0.6);
    bench.add(K.box(3.6, 0.9, 0.85, M.panelGrey, 0, 0.45, 0));
    bench.add(K.box(3.7, 0.07, 0.95, M.darkMetal, 0, 0.93, 0));
    bench.add(K.box(3.6, 0.05, 0.3, M.galvanised, 0, 1.62, -0.28));
    bench.add(K.box(3.6, 0.05, 0.3, M.galvanised, 0, 2.02, -0.28));
    for (const s of [-1, 1]) bench.add(K.box(0.05, 1.2, 0.3, M.galvanised, s * 1.78, 1.6, -0.28));
    for (let i = 0; i < 9; i++) {
      bench.add(binder(0.3, i % 3 === 0 ? M.olivePlain : i % 3 === 1 ? M.panelWhite : M.sandPlain)
        .translateX(-1.6 + i * 0.07).translateY(1.65).translateZ(-0.28));
    }
    for (let i = 0; i < 6; i++) {
      bench.add(binder(0.28, i % 2 ? M.olivePlain : M.panelGrey)
        .translateX(0.6 + i * 0.07).translateY(2.05).translateZ(-0.28));
    }
    // laptop, tool tray and a soldering-station-sized box on the bench
    const lapBase = K.box(0.36, 0.02, 0.26, M.darkMetal, -1.2, 0.98, 0.05);
    bench.add(lapBase);
    const lapLid = K.box(0.36, 0.24, 0.02, M.darkMetal, -1.2, 1.1, -0.08);
    lapLid.rotation.x = 0.22;
    bench.add(lapLid);
    bench.add(K.box(0.5, 0.24, 0.34, M.panelGrey, 0.4, 1.09, -0.05));
    bench.add(K.box(0.44, 0.06, 0.3, M.blackMetal, 1.3, 1.0, 0.02));
    bench.add(mug(M.sandPlain).translateX(-0.5).translateY(0.97).translateZ(0.2));
    inner.add(bench);

    const brew = new THREE.Group();
    brew.position.set(-6.6, FL, idp / 2 - 0.6);
    brew.add(K.box(2.2, 0.86, 0.7, M.panelGrey, 0, 0.43, 0));
    brew.add(K.box(2.3, 0.06, 0.78, M.darkMetal, 0, 0.89, 0));
    brew.add(K.cyl(0.11, 0.13, 0.28, 12, M.steel, -0.7, 1.06, 0));
    brew.add(K.box(0.2, 0.03, 0.2, M.blackMetal, -0.7, 0.93, 0));
    brew.add(K.box(0.28, 0.22, 0.2, M.panelWhite, -0.2, 1.03, -0.06));
    for (let i = 0; i < 4; i++) {
      brew.add(mug(i % 2 ? M.panelWhite : M.sandPlain).translateX(0.24 + (i % 2) * 0.14).translateY(0.92).translateZ(-0.1 + Math.floor(i / 2) * 0.2));
    }
    brew.add(K.cyl(0.12, 0.12, 0.3, 10, M.darkGlass, 0.86, 1.07, 0.02));
    brew.add(K.box(0.34, 0.5, 0.34, M.olivePlain, 1.4, 1.14, 0));
    inner.add(brew);
    // waste bin and a folded step stool
    inner.add(K.cyl(0.2, 0.24, 0.5, 12, M.galvanised, -8.0, FL + 0.25, 2.6));
    inner.add(K.box(0.42, 0.06, 0.34, M.darkMetal, 7.9, FL + 0.42, 2.0));
    inner.add(K.box(0.06, 0.42, 0.34, M.darkMetal, 7.72, FL + 0.21, 2.0));
    inner.add(K.box(0.06, 0.42, 0.34, M.darkMetal, 8.08, FL + 0.21, 2.0));

    // ---- wall furniture ----
    // status board and dry-wipe board on the east wall
    const east = new THREE.Group();
    east.position.set(iw / 2 - 0.08, FL, 0);
    east.rotation.y = -Math.PI / 2;
    east.add(K.box(2.1, 1.2, 0.05, M.darkMetal, -2.0, 2.0, 0.0));
    east.add(wallBoard(0, 2.0, 1.1).translateX(-2.0).translateY(2.0).translateZ(0.035));
    east.add(K.box(2.0, 1.15, 0.05, M.galvanised, 0.6, 2.0, 0.0));
    east.add(wallBoard(3, 1.9, 1.05).translateX(0.6).translateY(2.0).translateZ(0.035));
    east.add(K.box(1.9, 0.06, 0.1, M.galvanised, 0.6, 1.4, 0.05));
    inner.add(east);
    // sector map and notice board on the front wall, left of the door
    const front = new THREE.Group();
    front.position.set(-2.6, FL, idp / 2 - 0.08);
    front.rotation.y = Math.PI;
    front.add(K.box(2.3, 1.3, 0.05, M.darkMetal, -1.6, 1.95, 0));
    front.add(wallBoard(1, 2.2, 1.2).translateX(-1.6).translateY(1.95).translateZ(0.035));
    front.add(K.box(1.6, 1.1, 0.05, M.darkMetal, 1.2, 1.95, 0));
    front.add(wallBoard(2, 1.5, 1.0).translateX(1.2).translateY(1.95).translateZ(0.035));
    inner.add(front);
    // clocks, extinguisher, first aid and a field telephone on the west wall
    const west = new THREE.Group();
    west.position.set(-iw / 2 + 0.08, FL, 0);
    west.rotation.y = Math.PI / 2;
    for (let i = 0; i < 2; i++) {
      const clock = new THREE.Group();
      clock.position.set(-2.2 + i * 0.7, 2.7, 0);
      clock.add(K.cyl(0.15, 0.15, 0.05, 16, M.blackMetal, 0, 0, 0).rotateX(Math.PI / 2));
      clock.add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), M.panelWhite).translateZ(0.03));
      clock.add(K.box(0.015, 0.09, 0.008, M.blackMetal, 0, 0.04, 0.04));
      clock.add(K.box(0.07, 0.014, 0.008, M.blackMetal, 0.03, 0, 0.04).rotateZ(i ? 0.6 : -0.9));
      west.add(clock);
    }
    west.add(K.box(0.36, 0.6, 0.24, M.ledRed, -0.5, 1.2, 0));
    west.add(K.box(0.4, 0.12, 0.3, M.darkMetal, -0.5, 0.86, 0));
    west.add(sign(8, 0.4, 0.2).translateX(-0.5).translateY(1.62).translateZ(0.13));
    west.add(K.box(0.4, 0.34, 0.16, M.panelWhite, 0.5, 1.5, 0));
    west.add(sign(10, 0.34, 0.18).translateX(0.5).translateY(1.82).translateZ(0.09));
    // field telephone with a coiled handset lead
    west.add(K.box(0.3, 0.4, 0.22, M.olivePlain, 1.7, 1.4, 0));
    west.add(K.box(0.09, 0.24, 0.09, M.blackMetal, 1.7, 1.72, 0.06));
    const handsetLead = K.cableCoil(0.09, 5, M.rubber);
    handsetLead.rotation.x = Math.PI / 2;
    handsetLead.position.set(1.7, 1.15, 0.1);
    west.add(handsetLead);
    // breaker board
    west.add(K.box(0.7, 0.9, 0.18, M.panelGrey, 2.9, 1.7, 0));
    for (let i = 0; i < 8; i++) {
      west.add(K.box(0.05, 0.09, 0.04, i % 3 ? M.steel : M.ledRed, 2.62 + (i % 4) * 0.13, 1.95 - Math.floor(i / 4) * 0.22, 0.1));
    }
    west.add(sign(4, 0.44, 0.22).translateX(2.9).translateY(2.28).translateZ(0.1));
    // coat hooks with a jacket and a helmet
    west.add(K.box(0.9, 0.08, 0.05, M.darkMetal, -3.4, 2.05, 0));
    for (let i = 0; i < 4; i++) west.add(K.cyl(0.015, 0.015, 0.1, 5, M.steel, -3.75 + i * 0.24, 1.98, 0.05).rotateX(Math.PI / 2));
    const jacket = K.box(0.44, 0.85, 0.16, M.olivePlain, -3.6, 1.5, 0.1);
    west.add(jacket);
    west.add(K.sphere(0.15, M.olivePlain, -3.05, 1.9, 0.1, 10));
    inner.add(west);

    // large wall-mounted situation display above the racks
    const wallScreenMat = new THREE.MeshBasicMaterial({ color: 0x0c2018, toneMapped: false });
    const wallScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.4), wallScreenMat);
    wallScreen.position.set(-2.4, FL + 2.5, -idp / 2 + 0.12);
    inner.add(K.box(2.7, 1.6, 0.1, M.blackMetal, -2.4, FL + 2.5, -idp / 2 + 0.06));
    inner.add(wallScreen);
    this.screens.push({ mesh: wallScreen, material: wallScreenMat, side: 0 });

    // floor dressing: cable protectors, a mat, stored cases and a pallet
    for (const [px, pz, ry] of [[2.4, 1.6, 0.1], [-3.4, 2.4, 1.4]]) {
      const prot = K.box(2.6, 0.07, 0.42, M.hazard, px, FL + 0.035, pz);
      prot.rotation.y = ry;
      inner.add(prot);
    }
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), M.rubber);
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(doorX - 0.4, FL + 0.02, idp / 2 - 1.1);
    inner.add(mat);
    // Routed floor cables. Random criss-crossing runs read as scribble on the
    // deck, so every tail goes somewhere and passes under a ramp on the way.
    const floorRun = (pts, radius = 0.026) => {
      for (let i = 0; i < pts.length - 1; i++) {
        inner.add(K.cable(
          new THREE.Vector3(pts[i][0], FL + 0.03, pts[i][1]),
          new THREE.Vector3(pts[i + 1][0], FL + 0.03, pts[i + 1][1]),
          { sag: 0.015, radius, segments: 8 },
        ));
      }
    };
    // rack tails gathered into the head of the surface trunking
    for (let r = 0; r < 4; r++) {
      floorRun([[-7.4 + r * 1.16, -idp / 2 + 0.98], [-4.9, -3.2]], 0.024);
    }
    // trunking outfall into the console cable boot
    for (let i = 0; i < 3; i++) floorRun([[-1.45, -2.02 + (i - 1) * 0.08], [-0.5, -2.4 + (i - 1) * 0.1]], 0.022);
    // side-desk and brew-point spurs, each running the length of a floor ramp
    floorRun([[4.3, 0.95], [3.69, 1.47], [1.11, 1.73], [0.55, 0.3]]);
    floorRun([[-6.4, 4.0], [-3.62, 3.68], [-3.18, 1.12], [-1.8, 0.1]]);
    inner.add(bakeInstanced(K.equipmentCase(0.9, 0.5, 0.6)).translateX(-7.6).translateY(FL).translateZ(3.1));
    inner.add(bakeInstanced(K.equipmentCase(0.7, 0.4, 0.5, M.panelGrey)).translateX(-6.7).translateY(FL + 0.5).translateZ(3.1));
    inner.add(bakeInstanced(K.equipmentCase(0.7, 0.4, 0.5, M.olivePlain)).translateX(-6.7).translateY(FL).translateZ(3.1));
    inner.add(K.cableCoil(0.42, 3).translateX(-8.0).translateY(FL).translateZ(-1.4));
    // pallet of bottled water by the door
    const pallet = new THREE.Group();
    pallet.position.set(6.6, FL, 3.2);
    for (let i = 0; i < 4; i++) pallet.add(K.box(1.1, 0.06, 0.1, M.sandPlain, 0, 0.11, -0.35 + i * 0.23));
    for (const s of [-1, 0, 1]) pallet.add(K.box(0.1, 0.08, 0.9, M.sandPlain, s * 0.45, 0.04, 0));
    pallet.add(K.box(1.0, 0.34, 0.8, M.darkGlass, 0, 0.31, 0));
    pallet.add(K.box(1.0, 0.34, 0.8, M.darkGlass, 0, 0.66, 0));
    inner.add(pallet);

    this.shelter = g;
    this.shelterInterior = inner;
    this.consoleAnchor.position.copy(SHELTER_ORIGIN);
    this.consoleAnchor.position.y = FL;
    this.group.add(g);

    // ------------- collision -------------
    // walls are individual boxes so the doorway stays walkable
    g.updateWorldMatrix(true, true);
    const c = this.collision;
    const wp = SHELTER_ORIGIN;
    const yaw = g.rotation.y;
    const local = (x, z) => new THREE.Vector3(
      wp.x + x * Math.cos(yaw) + z * Math.sin(yaw),
      0,
      wp.z - x * Math.sin(yaw) + z * Math.cos(yaw),
    );
    const cosA = Math.abs(Math.cos(yaw));
    const sinA = Math.abs(Math.sin(yaw));
    const addLocalBox = (cx, cz, w, d, h, y) => {
      const p = local(cx, cz);
      p.y = y;
      // AABB of the rotated slab (yaw is small, so a padded AABB is fine)
      c.addBox(p, new THREE.Vector3(w * cosA + d * sinA, h, w * sinA + d * cosA), 'shelter');
    };
    // shell: back, both sides, and the two front panels either side of the door
    addLocalBox(0, -D / 2, W, wallT + 0.2, H, FL + H / 2);
    addLocalBox(-W / 2, 0, wallT + 0.2, D, H, FL + H / 2);
    addLocalBox(W / 2, 0, wallT + 0.2, D, H, FL + H / 2);
    {
      const lw = leftEdge + W / 2 - 0.1;          // -8.5 .. 1.55
      addLocalBox((-W / 2 + leftEdge - 0.1) / 2, D / 2, lw, wallT + 0.2, H, FL + H / 2);
      const rw = W / 2 - rightEdge - 0.1;         // 3.65 .. 8.5
      addLocalBox((rightEdge + 0.1 + W / 2) / 2, D / 2, rw, wallT + 0.2, H, FL + H / 2);
    }
    // interior furniture
    const cp = local(0, -1.1);
    c.addCylinder(new THREE.Vector3(cp.x, FL + 0.55, cp.z), 1.6, 1.15, 'console');
    addLocalBox(0, -3.4, 4.9, 1.4, 2.6, FL + 1.3);
    addLocalBox(4.6, 0.4, 2.4, 1.5, 1.05, FL + 0.53);
    addLocalBox(-5.4, -idp / 2 + 0.52, 6.6, 0.95, 2.1, FL + 1.05);
    addLocalBox(6.3, -idp / 2 + 0.6, 3.7, 1.0, 1.0, FL + 0.5);
    addLocalBox(-6.6, idp / 2 - 0.6, 2.3, 0.8, 0.95, FL + 0.48);
    addLocalBox(6.6, idp / 2 - 1.3, 1.2, 1.0, 0.75, FL + 0.38);
  }

  /** Sandbag and gabion revetment hugging the shelter, door approach clear. */
  _shelterRevetment(g) {
    const M = mats();
    const yaw = g.rotation.y;
    const o = SHELTER_ORIGIN;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const wx = (x, z) => [o.x + x * cos + z * sin, o.z - x * sin + z * cos];
    const W = 17;
    const D = 10;
    // back wall and both ends
    const runs = [
      [-W / 2 - 1.0, -D / 2 - 1.2, W / 2 + 1.0, -D / 2 - 1.2],
      [-W / 2 - 1.2, -D / 2 - 1.0, -W / 2 - 1.2, D / 2 + 0.6],
      [W / 2 + 1.2, -D / 2 - 1.0, W / 2 + 1.2, D / 2 + 0.6],
      // short return in front, stopping well clear of the doorway
      [-W / 2 - 1.1, D / 2 + 1.2, -1.2, D / 2 + 1.2],
    ];
    for (const [ax, az, bx, bz] of runs) {
      const a = wx(ax, az);
      const b = wx(bx, bz);
      this._sandbagRun(a[0], a[1], b[0], b[1], 3);
    }
    // gabion stack on the weather side plus a couple of jersey barriers
    const gw = K.gabionWall(9, 1.6);
    const gp = wx(-2.0, -D / 2 - 3.0);
    gw.position.set(gp[0], 0, gp[1]);
    gw.rotation.y = yaw;
    this.group.add(gw);
    this.collision.addObjectAABB(gw, 'gabion');
    for (let i = 0; i < 3; i++) {
      const b = K.jerseyBarrier(3);
      // the row starts well east of the door so the walk-in lane stays wide
      const p = wx(7.4 + i * 3.1, D / 2 + 2.6);
      b.position.set(p[0], 0, p[1]);
      b.rotation.y = yaw + Math.PI / 2;
      this.group.add(b);
      this.collision.addBox(new THREE.Vector3(p[0], 0.5, p[1]), new THREE.Vector3(3.2, 1.0, 0.9), 'barrier');
    }
  }

  // -------------------------------------------------------------------------
  // Radar installation
  // -------------------------------------------------------------------------

  buildRadarStation() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'radar-station';
    g.position.copy(RADAR_ORIGIN);
    g.rotation.y = 0.35;

    // levelling pad, kerb and hard standing
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(24, 19), M.concrete);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.04;
    pad.receiveShadow = true;
    g.add(pad);
    for (const [x, z, w, d] of [[0, -9.5, 24, 0.4], [0, 9.5, 24, 0.4], [-12, 0, 0.4, 19], [12, 0, 0.4, 19]]) {
      g.add(K.box(w, 0.22, d, M.concreteDark, x, 0.11, z));
    }
    g.add(groundMark(3, 3.8, 0.98, 0, 6.6, 0, 0.06));
    g.add(groundMark(12, 4.4, 1.1, -7.5, 5.4, 0, 0.06));

    // ---------------- trailer ----------------
    const trailer = new THREE.Group();
    trailer.position.y = 0.62;
    g.add(trailer);
    trailer.add(K.box(4.0, 0.42, 9.2, M.darkMetal, 0, 0, 0));
    for (const s of [-1, 1]) {
      trailer.add(K.box(0.26, 0.5, 9.0, M.galvanised, s * 1.8, 0.1, 0));
      // chequer-plate deck edging
      trailer.add(K.box(0.1, 0.08, 9.0, M.steel, s * 1.94, 0.32, 0));
    }
    for (let i = 0; i < 9; i++) {
      trailer.add(K.box(4.0, 0.1, 0.12, M.galvanised, 0, -0.24, -4.2 + i * 1.05));
    }
    const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.4, 16);
    const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.42, 8);
    for (const [x, z] of [[-2.0, 2.6], [2.0, 2.6], [-2.0, 1.5], [2.0, 1.5], [-2.0, -2.4], [2.0, -2.4]]) {
      const w = new THREE.Mesh(wheelGeo, M.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -0.04, z);
      w.castShadow = true;
      trailer.add(w);
      const hub = new THREE.Mesh(hubGeo, M.steel);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x * 1.03, -0.04, z);
      trailer.add(hub);
      // mudguard
      trailer.add(K.box(0.5, 0.06, 1.3, M.darkMetal, x, 0.56, z));
    }
    // levelling jacks: screw column, hand crank, foot plate on dunnage
    for (const [x, z] of [[-2.3, 4.1], [2.3, 4.1], [-2.3, -4.1], [2.3, -4.1]]) {
      const jack = new THREE.Group();
      jack.position.set(x, 0, z);
      jack.add(K.box(0.28, 0.55, 0.28, M.panelSand, 0, -0.1, 0));
      jack.add(K.cyl(0.075, 0.075, 0.75, 8, M.hydraulic, 0, -0.5, 0));
      jack.add(K.cyl(0.11, 0.11, 0.1, 10, M.steel, 0, -0.86, 0));
      jack.add(K.box(0.55, 0.1, 0.55, M.darkMetal, 0, -0.94, 0));
      jack.add(K.box(0.8, 0.14, 0.8, M.sandPlain, 0, -1.05, 0));
      const crank = K.cyl(0.02, 0.02, 0.38, 6, M.steel, 0.19, -0.1, 0);
      crank.rotation.z = Math.PI / 2;
      jack.add(crank);
      jack.add(K.cyl(0.03, 0.03, 0.12, 6, M.blackMetal, 0.38, -0.1, 0));
      trailer.add(jack);
    }
    // drawbar and support leg
    trailer.add(K.box(0.4, 0.28, 2.6, M.darkMetal, 0, -0.1, 5.7));
    trailer.add(K.cyl(0.24, 0.28, 0.2, 12, M.steel, 0, -0.1, 6.9));
    trailer.add(K.cyl(0.09, 0.09, 0.8, 8, M.galvanised, 0, -0.55, 6.4));
    trailer.add(K.box(0.4, 0.08, 0.4, M.darkMetal, 0, -0.94, 6.4));

    // equipment housings on the deck, with a walkway and rails
    const shelter = K.box(3.7, 1.6, 3.2, M.corrugated, 0, 1.01, -2.6);
    trailer.add(shelter);
    trailer.add(K.box(3.9, 0.12, 3.4, M.panelOlive, 0, 1.85, -2.6));
    trailer.add(K.box(0.9, 1.35, 0.08, M.panelGrey, 1.2, 0.9, -1.0));
    trailer.add(sign(15, 0.7, 0.34).translateX(-0.7).translateY(1.5).translateZ(-0.98));
    trailer.add(sign(24, 0.56, 0.28).translateX(-1.5).translateY(1.05).translateZ(-0.98));
    // RF hazard placards on the chassis skirts, readable from the apron
    for (const s of [-1, 1]) {
      const pl = sign(3, 0.76, 0.34);
      pl.position.set(s * 1.96, 0.08, -1.4);
      pl.rotation.y = s * Math.PI / 2;
      trailer.add(pl);
    }
    for (let i = 0; i < 7; i++) {
      trailer.add(K.box(0.06, 1.1, 0.06, M.galvanised, -1.75 + i * 0.09, 0.95, -4.21));
    }
    const deckWalk = bakeInstanced(K.grating(3.6, 1.0));
    deckWalk.position.set(0, 0.28, 2.3);
    trailer.add(deckWalk);
    for (const s of [-1, 1]) {
      const rail = K.handrail(3.4, 0.95);
      rail.position.set(0, 0.3, s * 0.5 + 2.3);
      trailer.add(rail);
    }
    const trailerLadder = bakeInstanced(K.ladder(1.9));
    trailerLadder.position.set(1.9, -0.6, 3.3);
    trailerLadder.rotation.y = Math.PI / 2;
    trailer.add(trailerLadder);

    // cooling units on the deck with turning fans
    for (const s of [-1, 1]) {
      const cooler = new THREE.Group();
      cooler.position.set(s * 1.15, 0.85, 3.0);
      cooler.add(K.box(1.4, 1.0, 1.1, M.panelGrey, 0, 0, 0));
      for (let i = 0; i < 8; i++) cooler.add(K.box(1.3, 0.05, 0.05, M.blackMetal, 0, -0.36 + i * 0.1, 0.56));
      cooler.add(K.cyl(0.32, 0.32, 0.06, 14, M.blackMetal, 0, 0.52, 0));
      cooler.add(K.box(0.9, 0.04, 0.9, M.galvanised, 0, 0.58, 0));
      const fan = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const b = K.box(0.5, 0.015, 0.13, M.steel, 0, 0, 0);
        b.rotation.y = (i / 6) * Math.PI * 2;
        b.rotation.z = 0.32;
        fan.add(b);
      }
      fan.position.set(s * 1.15, 1.4, 3.0);
      trailer.add(markDynamic(fan));
      this.rotators.push({ obj: fan, axis: 'y', speed: s * 7.4 });
      trailer.add(cooler);
    }
    // coolant pipes running from the coolers into the pedestal
    for (const s of [-1, 1]) {
      trailer.add(K.conduit([
        new THREE.Vector3(s * 1.15, 0.45, 2.5),
        new THREE.Vector3(s * 0.8, 0.5, 1.6),
        new THREE.Vector3(s * 0.55, 0.6, 0.9),
      ], 0.06, M.hydraulic));
    }

    // ---------------- rotating pedestal + planar array ----------------
    const pedestal = new THREE.Group();
    pedestal.position.set(0, 1.05, 0.4);
    trailer.add(pedestal);
    // Matte housings: mapped panel materials smear badly across a cone's
    // cylindrical UVs and read as polished chrome, so these use flat paint with
    // geometric ribs for relief instead.
    pedestal.add(K.cyl(1.05, 1.3, 0.7, 20, M.olivePlain, 0, 0.35, 0));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rib = K.box(0.09, 0.62, 0.07, M.galvanised, Math.cos(a) * 1.16, 0.35, Math.sin(a) * 1.16);
      rib.rotation.y = -a;
      pedestal.add(rib);
    }
    pedestal.add(bakeInstanced(K.boltRing(1.15, 20, M.steel)).translateY(0.03).rotateX(-Math.PI / 2));
    const slewRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.05, 6, 26), M.steel);
    slewRing.rotation.x = Math.PI / 2;
    slewRing.position.y = 0.66;
    pedestal.add(slewRing);

    const turret = new THREE.Group();
    turret.position.y = 0.72;
    pedestal.add(turret);
    turret.add(K.cyl(0.85, 1.0, 0.55, 18, M.olivePlain, 0, 0.27, 0));
    turret.add(K.box(1.7, 0.4, 0.5, M.olivePlain, 0, 0.35, -0.85));
    // slip-ring collar, inspection hatch and drive motor blister
    turret.add(K.cyl(1.02, 1.02, 0.09, 18, M.galvanised, 0, 0.03, 0));
    turret.add(K.box(0.52, 0.4, 0.05, M.panelGrey, 0, 0.3, 0.94));
    turret.add(K.box(0.34, 0.34, 0.34, M.darkMetal, 0.72, 0.2, 0.62));
    turret.add(K.cableCoil(0.42, 3, M.rubber).translateY(0.56).translateZ(-0.85));

    const arrayGroup = new THREE.Group();
    arrayGroup.position.y = 0.52;
    arrayGroup.rotation.x = -0.42; // tilted back for search
    turret.add(arrayGroup);

    const faceW = 4.4;
    const faceH = 3.4;
    arrayGroup.add(K.box(faceW, faceH, 0.4, M.panelSand, 0, faceH / 2, 0));
    // chamfered surround
    for (const [w, h, x, y] of [[faceW + 0.16, 0.16, 0, 0.03], [faceW + 0.16, 0.16, 0, faceH - 0.03]]) {
      arrayGroup.add(K.box(w, h, 0.46, M.galvanised, x, y + faceH * 0, 0.02));
    }
    for (const s of [-1, 1]) {
      arrayGroup.add(K.box(0.16, faceH + 0.16, 0.46, M.galvanised, s * (faceW / 2 + 0.05), faceH / 2, 0.02));
    }
    // Radiating face. The dark backing plate sits behind an instanced lattice of
    // radiator elements so the aperture reads as hardware rather than a black
    // rectangle; the emissive pulse then shows through the gaps between elements.
    const faceGlassMat = new THREE.MeshStandardMaterial({
      map: arrayBackingTexture(),
      color: 0x8a9099, roughness: 0.55, metalness: 0.45,
      emissive: 0x0a2030, emissiveIntensity: 0.4,
    });
    const faceGlass = new THREE.Mesh(new THREE.PlaneGeometry(faceW - 0.34, faceH - 0.34), faceGlassMat);
    faceGlass.position.set(0, faceH / 2, 0.205);
    arrayGroup.add(faceGlass);
    this.radarFaceMaterial = faceGlassMat;

    const elemGeo = new THREE.BoxGeometry(0.156, 0.156, 0.075);
    const cols = 22;
    const rows = 17;
    const elemMat = new THREE.MeshStandardMaterial({
      color: 0x5b6167, roughness: 0.52, metalness: 0.55,
    });
    const elems = new THREE.InstancedMesh(elemGeo, elemMat, cols * rows);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        m4.setPosition(
          (cIdx / (cols - 1) - 0.5) * (faceW - 0.5),
          faceH / 2 + (r / (rows - 1) - 0.5) * (faceH - 0.5),
          0.245,
        );
        elems.setMatrixAt(k++, m4);
      }
    }
    elems.castShadow = false;
    arrayGroup.add(elems);
    // sub-array seams break the lattice into replaceable quadrants
    for (let i = 1; i < 3; i++) {
      arrayGroup.add(K.box(0.07, faceH - 0.42, 0.1, M.galvanised, (i / 3 - 0.5) * (faceW - 0.42), faceH / 2, 0.24));
    }
    for (let i = 1; i < 3; i++) {
      arrayGroup.add(K.box(faceW - 0.42, 0.07, 0.1, M.galvanised, 0, faceH / 2 + (i / 3 - 0.5) * (faceH - 0.42), 0.24));
    }
    // hazard strip sits on the bottom surround, clear of the radiating aperture
    arrayGroup.add(K.box(faceW - 0.3, 0.13, 0.05, M.hazard, 0, 0.03, 0.26));
    // boresight camera pod
    arrayGroup.add(K.box(0.34, 0.26, 0.42, M.blackMetal, faceW / 2 - 0.5, faceH - 0.34, 0.4));
    arrayGroup.add(K.cyl(0.09, 0.09, 0.14, 10, M.darkGlass, faceW / 2 - 0.5, faceH - 0.34, 0.63).rotateX(Math.PI / 2));
    // stiffener ribs, lifting eyes and a rear maintenance platform
    for (let i = 0; i < 5; i++) {
      arrayGroup.add(K.box(0.1, faceH - 0.2, 0.3, M.galvanised, (i / 4 - 0.5) * (faceW - 0.6), faceH / 2, -0.32));
    }
    arrayGroup.add(K.box(faceW + 0.2, 0.18, 0.55, M.galvanised, 0, faceH + 0.12, -0.1));
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 5, 10), M.steel);
      eye.position.set(s * 1.4, faceH + 0.3, -0.1);
      arrayGroup.add(eye);
    }
    // hydraulic tilt rams
    for (const s of [-1, 1]) {
      const ram = K.hydraulicRam(1.6);
      ram.position.set(s * 1.55, 0.05, -1.0);
      ram.rotation.x = 0.62;
      arrayGroup.add(ram);
    }
    // IFF whips + warning strobes on the array frame
    for (const s of [-1, 1]) {
      arrayGroup.add(K.cyl(0.012, 0.02, 1.5, 5, M.steel, s * (faceW / 2 - 0.1), faceH + 0.9, 0));
      const strobe = K.warningBeacon(0xff3a2a);
      strobe.position.set(s * (faceW / 2 - 0.02), faceH + 0.2, 0);
      arrayGroup.add(markDynamic(strobe));
      this.beacons.push(strobe.userData.rotor);
    }
    // waveguide loom from the turret down into the pedestal
    turret.add(loom(
      new THREE.Vector3(0, 0.2, -0.95),
      new THREE.Vector3(0, -0.5, -1.25),
      3, { sag: 0.12, radius: 0.055, spread: 0.14 },
    ));
    markDynamic(turret);
    this.radarTurret = turret;
    this.radarArray = arrayGroup;
    this.rotators.push({ obj: turret, axis: 'y', speed: 0.62 });

    // ---------------- secondary rotating dish ----------------
    const dishMast = new THREE.Group();
    dishMast.position.set(-7.0, 0, -3.6);
    g.add(dishMast);
    dishMast.add(K.box(2.0, 0.34, 2.0, M.concreteDark, 0, 0.17, 0));
    for (const [bx, bz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      dishMast.add(K.cyl(0.05, 0.05, 0.24, 6, M.steel, bx, 0.42, bz));
    }
    dishMast.add(K.cyl(0.17, 0.24, 5.4, 12, M.galvanised, 0, 3.0, 0));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      dishMast.add(K.cable(
        new THREE.Vector3(0, 4.6, 0),
        new THREE.Vector3(Math.cos(a) * 2.6, 0.1, Math.sin(a) * 2.6),
        { sag: 0.16, radius: 0.014, material: M.steel, segments: 8 },
      ));
    }
    const mastLadder = bakeInstanced(K.ladder(4.4));
    mastLadder.position.set(0.24, 0.34, 0);
    mastLadder.rotation.y = Math.PI / 2;
    dishMast.add(mastLadder);
    dishMast.add(bakeInstanced(K.grating(1.5, 1.5)).translateY(4.8));
    const platRail = K.handrail(1.4, 0.9);
    platRail.position.set(0, 4.82, -0.72);
    dishMast.add(platRail);
    // feeder cables running down the mast into a ground box
    dishMast.add(loom(
      new THREE.Vector3(0.3, 5.4, 0.1),
      new THREE.Vector3(0.32, 0.5, 1.5),
      3, { sag: 0.1, radius: 0.03, spread: 0.08 },
    ));
    dishMast.add(K.box(0.7, 0.6, 0.4, M.panelGrey, 0.35, 0.3, 1.7));

    const dishHead = new THREE.Group();
    dishHead.position.y = 5.7;
    dishMast.add(dishHead);
    dishHead.add(K.cyl(0.32, 0.38, 0.55, 12, M.panelGrey, 0, -0.3, 0));
    dishHead.add(K.box(0.9, 0.3, 0.5, M.panelSand, 0, 0.02, -0.42));
    const BOWL_R = 1.5;
    const BOWL_TH = Math.PI * 0.36;
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(BOWL_R, 26, 14, 0, Math.PI * 2, 0, BOWL_TH),
      new THREE.MeshStandardMaterial({ color: 0xc6c3b7, roughness: 0.62, metalness: 0.18, side: THREE.DoubleSide }),
    );
    bowl.rotation.x = -Math.PI / 2 + 0.28;
    bowl.castShadow = true;
    dishHead.add(bowl);
    // Backing structure. Without it the reverse of the dish - which is what you
    // see from most of the apron - is a blank white disc.
    const dishBack = new THREE.Group();
    dishBack.rotation.x = bowl.rotation.x;
    dishHead.add(dishBack);
    {
      const R = BOWL_R + 0.05;
      const onCap = (th, phi) => new THREE.Vector3(
        R * Math.sin(th) * Math.cos(phi), R * Math.cos(th), R * Math.sin(th) * Math.sin(phi),
      );
      const segGeo = [];
      for (let s = 0; s < 8; s++) {
        const phi = (s / 8) * Math.PI * 2;
        for (let seg = 0; seg < 3; seg++) {
          const th0 = 0.21 + (BOWL_TH - 0.28) * (seg / 3);
          const th1 = 0.21 + (BOWL_TH - 0.28) * ((seg + 1) / 3);
          const p0 = onCap(th0, phi);
          const p1 = onCap(th1, phi);
          const dir = p1.clone().sub(p0);
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, dir.length()), M.galvanised);
          rib.position.copy(p0).add(p1).multiplyScalar(0.5);
          rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
          segGeo.push(rib);
        }
      }
      for (const r of segGeo) dishBack.add(r);
      // hub casting at the apex and a stiffening ring around the rim
      dishBack.add(K.cyl(0.34, 0.26, 0.26, 12, M.panelGrey, 0, BOWL_R - 0.02, 0));
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(BOWL_R * Math.sin(BOWL_TH), 0.045, 5, 30), M.galvanised,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = BOWL_R * Math.cos(BOWL_TH);
      dishBack.add(rim);
    }
    // feed struts converge on the horn in front of the bowl
    const feedTip = new THREE.Vector3(0, 0.42, 1.02);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const rim = new THREE.Vector3(Math.cos(a) * 1.42, Math.sin(a) * 1.42 * 0.35 + 0.42, Math.sin(a) * 1.42 * 0.94 * 0.36 + 0.32);
      const mid = rim.clone().add(feedTip).multiplyScalar(0.5);
      const dir = feedTip.clone().sub(rim);
      const strut = K.cyl(0.02, 0.02, dir.length(), 5, M.steel, 0, 0, 0);
      strut.position.copy(mid);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      dishHead.add(strut);
    }
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 10), M.brass);
    horn.position.copy(feedTip);
    horn.rotation.x = -Math.PI / 2 - 0.3;
    dishHead.add(horn);
    dishHead.add(K.box(0.4, 0.34, 0.34, M.blackMetal, 0, 0.3, -1.0));
    this.rotators.push({ obj: dishHead, axis: 'y', speed: -0.9 });
    markDynamic(dishHead);
    this.radarDish = dishHead;

    // ---------------- support plant ----------------
    const gen = bakeInstanced(K.generator(rng, { scale: 1.15 }));
    gen.position.set(7.4, 0, -2.8);
    gen.rotation.y = -0.5;
    g.add(gen);
    g.add(K.box(5.4, 0.18, 3.6, M.concreteDark, 7.2, 0.09, -2.6));
    g.add(sign(16, 0.8, 0.4).translateX(7.2).translateY(0.9).translateZ(-0.6));
    g.add(loom(new THREE.Vector3(5.6, 0.7, -2.2), new THREE.Vector3(2.0, 0.6, -1.2), 3, { sag: 0.4, radius: 0.05 }));
    g.add(K.cableCoil(0.6, 4).translateX(4.6).translateZ(1.6));
    // coolant skid with pump, header tank and pipework
    const skid = new THREE.Group();
    skid.position.set(4.6, 0, -5.6);
    skid.add(K.box(2.6, 0.16, 1.6, M.darkMetal, 0, 0.08, 0));
    skid.add(K.cyl(0.5, 0.5, 1.5, 14, M.panelWhite, -0.7, 0.92, 0));
    skid.add(K.cyl(0.52, 0.52, 0.08, 14, M.steel, -0.7, 1.7, 0));
    skid.add(K.box(0.9, 0.6, 0.9, M.panelGrey, 0.7, 0.46, 0));
    skid.add(K.cyl(0.2, 0.2, 0.5, 10, M.hydraulic, 0.7, 0.95, 0));
    skid.add(K.conduit([
      new THREE.Vector3(-0.7, 1.6, 0.2),
      new THREE.Vector3(0.2, 1.8, 0.4),
      new THREE.Vector3(0.9, 1.2, 0.4),
    ], 0.07, M.hydraulic));
    skid.add(sign(24, 0.7, 0.34).translateY(1.9).translateZ(0.3));
    g.add(skid);
    this.collision.addBox(
      new THREE.Vector3(RADAR_ORIGIN.x + 3.0, 0.8, RADAR_ORIGIN.z - 6.6),
      new THREE.Vector3(3.0, 1.6, 2.4), 'skid',
    );
    // power distribution cabinet + earth mat pit
    g.add(K.box(1.2, 1.6, 0.7, M.panelGrey, 9.4, 0.8, 1.6));
    g.add(sign(4, 0.7, 0.34).translateX(9.4).translateY(1.9).translateZ(1.6));
    g.add(K.box(0.8, 0.1, 0.8, M.darkMetal, 9.4, 0.05, 2.6));
    g.add(loom(new THREE.Vector3(9.0, 1.2, 1.2), new THREE.Vector3(2.2, 0.7, 0.6), 4, { sag: 0.5, radius: 0.04 }));

    // walkway of duckboards from the road up to the trailer steps
    for (let i = 0; i < 5; i++) {
      g.add(K.box(1.6, 0.06, 0.9, M.sandPlain, 4.6 - i * 0.0, 0.06, 6.4 - i * 1.0));
    }

    // barriers, chain posts and signage around the radiating sector
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const b = K.jerseyBarrier(3);
      b.position.set(Math.cos(a) * 11.5, 0, Math.sin(a) * 8.8);
      b.rotation.y = -a + Math.PI / 2;
      g.add(b);
      this.collision.addObjectAABB(b, 'barrier');
      if (i % 2 === 0) {
        const s = sign(i % 4 === 0 ? 3 : 31, 0.7, 0.36);
        s.position.set(Math.cos(a) * 11.5, 1.35, Math.sin(a) * 8.8);
        s.rotation.y = -a + Math.PI / 2;
        g.add(s);
        g.add(K.cyl(0.03, 0.03, 0.5, 6, M.galvanised, Math.cos(a) * 11.5, 1.0, Math.sin(a) * 8.8));
      }
    }
    // main site board at the access road
    const board = new THREE.Group();
    board.position.set(0, 0, 9.0);
    for (const s of [-1, 1]) board.add(K.cyl(0.06, 0.06, 2.2, 6, M.galvanised, s * 0.75, 1.1, 0));
    board.add(K.box(1.9, 1.15, 0.08, M.panelWhite, 0, 1.85, 0));
    board.add(sign(3, 1.75, 0.5).translateY(2.1).translateZ(0.05));
    board.add(sign(0, 1.75, 0.42).translateY(1.6).translateZ(0.05));
    g.add(board);

    this.radarStation = g;
    this.group.add(g);

    g.updateWorldMatrix(true, true);
    this.collision.addBox(new THREE.Vector3(RADAR_ORIGIN.x, 1.4, RADAR_ORIGIN.z), new THREE.Vector3(5.2, 2.8, 9.6), 'radar');
    this.collision.addObjectAABB(gen, 'generator');
    this.collision.addBox(new THREE.Vector3(RADAR_ORIGIN.x - 7.8, 2.7, RADAR_ORIGIN.z - 1.0), new THREE.Vector3(2.4, 5.4, 2.4), 'mast');
  }

  // -------------------------------------------------------------------------
  // Perimeter, lighting and clutter
  // -------------------------------------------------------------------------

  buildPerimeter() {
    const M = mats();
    const g = new THREE.Group();
    g.name = 'perimeter';
    const x0 = -130;
    const x1 = 126;
    const z0 = -122;
    const z1 = 96;

    const runs = [
      { a: new THREE.Vector3(x0, 0, z0), b: new THREE.Vector3(x1, 0, z0) },
      { a: new THREE.Vector3(x1, 0, z0), b: new THREE.Vector3(x1, 0, z1) },
      { a: new THREE.Vector3(x1, 0, z1), b: new THREE.Vector3(x0, 0, z1) },
      { a: new THREE.Vector3(x0, 0, z1), b: new THREE.Vector3(x0, 0, z0) },
    ];
    for (const { a, b } of runs) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      // leave a vehicle gate in the middle of the south run
      const segments = (a.z === z1 && b.z === z1) ? [[0, 0.42], [0.58, 1]] : [[0, 1]];
      for (const [t0, t1] of segments) {
        const p0 = a.clone().lerp(b, t0);
        const p1 = a.clone().lerp(b, t1);
        const segLen = p0.distanceTo(p1);
        const f = K.fenceRun(segLen, { height: 2.7 });
        f.position.copy(p0).add(p1).multiplyScalar(0.5);
        f.position.y = this.terrainHeight(f.position.x, f.position.z);
        f.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2;
        g.add(f);
        this.collision.addBox(
          new THREE.Vector3(f.position.x, 1.35, f.position.z),
          new THREE.Vector3(
            Math.abs(Math.cos(f.rotation.y)) * segLen + 0.4,
            2.7,
            Math.abs(Math.sin(f.rotation.y)) * segLen + 0.4,
          ),
          'fence',
        );
        // warning boards wired to the fabric at intervals
        const nSigns = Math.max(1, Math.floor(segLen / 34));
        for (let i = 0; i < nSigns; i++) {
          const t = (i + 0.5) / nSigns;
          const p = p0.clone().lerp(p1, t);
          const s = sign(i % 3 === 0 ? 0 : i % 3 === 1 ? 31 : 25, 0.8, 0.42);
          s.position.set(p.x, this.terrainHeight(p.x, p.z) + 1.7, p.z);
          s.rotation.y = f.rotation.y + Math.PI / 2;
          g.add(s);
        }
      }
    }
    // perimeter lighting on simple poles, lit from the shared lamp material
    const lit = [];
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      lit.push([x0 + (x1 - x0) * t, z0 + 2], [x0 + (x1 - x0) * t, z1 - 2]);
    }
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      lit.push([x0 + 2, z0 + (z1 - z0) * t], [x1 - 2, z0 + (z1 - z0) * t]);
    }
    for (const [px, pz] of lit) {
      const y = this.terrainHeight(px, pz);
      const pole = new THREE.Group();
      pole.position.set(px, y, pz);
      pole.add(K.cyl(0.09, 0.13, 5.4, 8, M.galvanised, 0, 2.7, 0));
      pole.add(K.box(0.5, 0.16, 0.5, M.concreteDark, 0, 0.08, 0));
      const inward = new THREE.Vector2(-px, -pz).normalize();
      const arm = K.cyl(0.05, 0.05, 1.1, 6, M.galvanised, inward.x * 0.5, 5.35, inward.y * 0.5);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -Math.atan2(inward.y, inward.x);
      pole.add(arm);
      const head = K.box(0.5, 0.16, 0.34, M.darkMetal, inward.x * 1.0, 5.24, inward.y * 1.0);
      pole.add(head);
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28), this.lampGlassMaterial);
      lens.rotation.x = -Math.PI / 2;
      lens.position.set(inward.x * 1.0, 5.15, inward.y * 1.0);
      pole.add(lens);
      g.add(pole);
    }

    // ---------------- gate complex ----------------
    const gate = new THREE.Group();
    gate.position.set(-6, 0, z1);
    const hut = K.box(3.2, 2.8, 3.2, M.corrugated, -7.6, 1.4, 1.8);
    gate.add(hut);
    gate.add(K.box(3.8, 0.22, 3.8, M.panelOlive, -7.6, 2.9, 1.8));
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), M.darkGlass);
    win.position.set(-7.6, 1.8, 3.42);
    gate.add(win);
    gate.add(K.box(2.2, 0.12, 0.7, M.darkMetal, -7.6, 1.2, 3.5));
    gate.add(sign(21, 1.4, 0.44).translateX(-7.6).translateY(2.6).translateZ(3.42));
    gate.add(sign(22, 0.9, 0.44).translateX(-7.6).translateY(0.9).translateZ(3.42));
    // canopy over the checkpoint
    gate.add(K.box(9.0, 0.16, 5.0, M.panelOlive, -3.4, 4.2, 1.4));
    for (const [cx, cz] of [[-7.4, -0.8], [0.6, -0.8], [-7.4, 3.6], [0.6, 3.6]]) {
      gate.add(K.cyl(0.1, 0.12, 4.2, 8, M.galvanised, cx, 2.1, cz));
    }
    for (const [lx, lz] of [[-5.4, 1.4], [-1.4, 1.4]]) {
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), this.lampGlassMaterial);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(lx, 4.08, lz);
      gate.add(lens);
      gate.add(K.box(0.6, 0.1, 0.6, M.darkMetal, lx, 4.14, lz));
    }
    // boom barrier
    const boomPivot = new THREE.Group();
    boomPivot.position.set(-4.6, 1.15, 0);
    const boom = K.box(9.0, 0.16, 0.16, M.hazard, 4.5, 0, 0);
    boomPivot.add(boom);
    for (let i = 0; i < 5; i++) {
      boomPivot.add(K.cyl(0.012, 0.012, 0.7, 4, M.steel, 0.9 + i * 1.8, -0.35, 0));
    }
    boomPivot.rotation.z = 0.02;
    gate.add(markDynamic(boomPivot));
    gate.add(K.cyl(0.16, 0.2, 1.2, 10, M.panelGrey, -4.6, 0.6, 0));
    gate.add(K.box(0.5, 0.5, 0.4, M.darkMetal, -4.6, 1.4, 0));
    this.gateBoom = boomPivot;
    // sliding pedestrian gate leaf beside the boom
    const leaf = new THREE.Group();
    leaf.position.set(5.5, 0, 0);
    const fabric = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.4), M.chainLink);
    fabric.position.y = 1.3;
    leaf.add(fabric);
    for (let i = 0; i <= 4; i++) leaf.add(K.cyl(0.05, 0.05, 2.5, 6, M.galvanised, (i / 4 - 0.5) * 5.4, 1.25, 0));
    leaf.add(K.box(5.5, 0.09, 0.09, M.galvanised, 0, 2.5, 0));
    leaf.add(K.box(5.5, 0.09, 0.09, M.galvanised, 0, 0.12, 0));
    gate.add(leaf);
    this.collision.addBox(new THREE.Vector3(-6 + 5.5, 1.3, z1), new THREE.Vector3(5.5, 2.6, 0.4), 'gate');
    // chicane blocks staggering the approach
    for (let i = 0; i < 4; i++) {
      const b = K.jerseyBarrier(3.2);
      const s = i % 2 ? 1 : -1;
      b.position.set(-6 + s * 3.4, 0, z1 + 8 + i * 4.5);
      b.rotation.y = Math.PI / 2;
      gate.add(b);
      this.collision.addBox(new THREE.Vector3(-6 + s * 3.4, 0.5, z1 + 8 + i * 4.5), new THREE.Vector3(3.3, 1.0, 0.8), 'barrier');
    }
    gate.add(groundMark(11, 3.4, 0.95, -6, 12, 0, 0.06));
    gate.add(groundMark(14, 5.2, 1.2, -6, 20, 0, 0.06));
    g.add(gate);
    this.collision.addObjectAABB(hut, 'gatehouse');

    // watch towers at two corners
    for (const [cx, cz] of [[x0 + 6, z0 + 6], [x1 - 6, z1 - 6]]) {
      const tower = new THREE.Group();
      tower.position.set(cx, this.terrainHeight(cx, cz), cz);
      for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
        tower.add(K.cyl(0.09, 0.11, 6.4, 7, M.galvanised, dx, 3.2, dz));
      }
      for (let r = 1; r <= 4; r++) {
        const y = r * 1.4;
        tower.add(K.box(2.4, 0.06, 0.06, M.galvanised, 0, y, -1.1));
        tower.add(K.box(2.4, 0.06, 0.06, M.galvanised, 0, y, 1.1));
        tower.add(K.box(0.06, 0.06, 2.4, M.galvanised, -1.1, y, 0));
        tower.add(K.box(0.06, 0.06, 2.4, M.galvanised, 1.1, y, 0));
      }
      tower.add(K.box(3.0, 0.16, 3.0, M.darkMetal, 0, 6.5, 0));
      tower.add(K.box(3.0, 1.5, 0.1, M.corrugated, 0, 7.3, -1.45));
      tower.add(K.box(0.1, 1.5, 3.0, M.corrugated, -1.45, 7.3, 0));
      tower.add(K.box(3.4, 0.14, 3.4, M.panelOlive, 0, 8.7, 0));
      for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
        tower.add(K.cyl(0.05, 0.05, 2.1, 6, M.galvanised, dx, 7.6, dz));
      }
      tower.add(bakeInstanced(K.ladder(6.4)).translateZ(1.35));
      const searchlight = this._buildSearchlight();
      searchlight.position.set(0.9, 6.9, 0.9);
      tower.add(markDynamic(searchlight));
      this.searchlights.push(searchlight);
      g.add(tower);
      this.collision.addBox(new THREE.Vector3(cx, 3.2, cz), new THREE.Vector3(2.6, 6.4, 2.6), 'tower');
    }

    this.group.add(g);
  }

  _buildSearchlight() {
    const M = mats();
    const g = new THREE.Group();
    g.add(K.cyl(0.14, 0.18, 0.5, 10, M.darkMetal, 0, 0.25, 0));
    const yoke = new THREE.Group();
    yoke.position.y = 0.55;
    g.add(yoke);
    const head = new THREE.Group();
    yoke.add(head);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.6, 16), M.panelGrey);
    drum.rotation.x = Math.PI / 2;
    drum.castShadow = true;
    head.add(drum);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.36, 18), M.lampGlassOff);
    lens.position.z = 0.31;
    head.add(lens);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xdfeaff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 130, 20, 1, true), beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.z = 65;
    beam.visible = false;
    head.add(beam);
    const spot = new THREE.SpotLight(0xdfeaff, 0, 220, 0.09, 0.45, 1.2);
    spot.position.set(0, 0, 0.3);
    spot.target.position.set(0, 0, 40);
    head.add(spot);
    head.add(spot.target);
    g.userData = { yoke, head, beam, beamMat, lens, spot };
    return g;
  }

  buildFloodlights() {
    const positions = [
      [-64, 12], [26, 24], [-30, -58], [40, -62], [-72, -12], [70, -6], [4, -96], [-100, -80],
    ];
    for (const [x, z] of positions) {
      const mast = K.floodlightMast(8.2);
      mast.position.set(x, this.terrainHeight(x, z), z);
      mast.rotation.y = Math.atan2(-x, -z) + Math.PI;
      // share one lamp-glass material so the merged lenses can still light up
      for (const lamp of mast.userData.lamps) lamp.material = this.lampGlassMaterial;
      markDynamic(mast.userData.head);
      this.group.add(mast);
      // one shared spot per mast, aimed inwards and downwards
      const spot = new THREE.SpotLight(0xffe8c4, 0, 90, 0.62, 0.55, 1.4);
      spot.position.set(x, 8.4, z);
      const tx = x * 0.35;
      const tz = z * 0.35;
      spot.target.position.set(tx, 0, tz);
      this.group.add(spot);
      this.group.add(spot.target);
      this.floodlights.push({ mast, spot, lamps: mast.userData.lamps });
      this.collision.addCylinder(new THREE.Vector3(x, 4, z), 0.6, 8, 'mast');
    }
  }

  /** Shipping container - the most useful single prop on any working site. */
  _container(len = 6.1, tint = null) {
    const M = mats();
    const g = new THREE.Group();
    const h = 2.6;
    const w = 2.44;
    const body = K.box(w, h, len, tint || M.corrugated, 0, h / 2 + 0.12, 0);
    g.add(body);
    for (const s of [-1, 1]) {
      g.add(K.box(0.12, h + 0.16, 0.14, M.rusted, s * (w / 2), h / 2 + 0.12, len / 2 - 0.07));
      g.add(K.box(0.12, h + 0.16, 0.14, M.rusted, s * (w / 2), h / 2 + 0.12, -len / 2 + 0.07));
      // corner castings
      for (const e of [-1, 1]) {
        for (const y of [0.18, h + 0.06]) {
          g.add(K.box(0.22, 0.18, 0.22, M.darkMetal, s * (w / 2 - 0.05), y, e * (len / 2 - 0.1)));
        }
      }
    }
    g.add(K.box(w + 0.06, 0.16, len + 0.06, M.rusted, 0, h + 0.14, 0));
    g.add(K.box(w + 0.1, 0.18, len + 0.1, M.darkMetal, 0, 0.14, 0));
    // doors on one end
    for (const s of [-1, 1]) {
      g.add(K.box(w / 2 - 0.06, h - 0.16, 0.07, M.panelGrey, s * w / 4, h / 2 + 0.12, len / 2 + 0.02));
      g.add(K.cyl(0.035, 0.035, h - 0.4, 6, M.steel, s * 0.32, h / 2 + 0.12, len / 2 + 0.07));
      g.add(K.box(0.12, 0.1, 0.1, M.steel, s * 0.32, h / 2 + 0.12, len / 2 + 0.12));
    }
    g.userData.footprint = { w, d: len, h: h + 0.3 };
    return g;
  }

  buildProps() {
    const M = mats();
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'props';

    // --- vehicle park: trucks lined up on the painted bays --------------
    // Kept clear of the shelter door approach so the console stays reachable
    // and the building keeps a clean silhouette from the spawn point.
    const vehicles = [
      { kind: 'truck', x: -47, z: 33, ry: 0.02 },
      { kind: 'truck', x: -37.5, z: 33, ry: 0.02 },
      { kind: 'utility', x: -29, z: 33, ry: 0.02 },
      { kind: 'truck', x: 12, z: 33, ry: 0.04 },
      { kind: 'utility', x: 20, z: 33, ry: -0.02 },
      { kind: 'utility', x: 26, z: 36, ry: -1.1 },
      { kind: 'truck', x: 46, z: 12, ry: 1.6 },
    ];
    for (const v of vehicles) {
      const mesh = v.kind === 'truck' ? K.supportTruck(rng, { tarp: rng.bool(0.7) }) : K.utilityTruck(rng);
      bakeInstanced(mesh);
      mesh.position.set(v.x, 0, v.z);
      mesh.rotation.y = v.ry;
      g.add(mesh);
      const fp = mesh.userData.footprint;
      const cosA = Math.abs(Math.cos(v.ry));
      const sinA = Math.abs(Math.sin(v.ry));
      this.collision.addBox(
        new THREE.Vector3(v.x, fp.h / 2, v.z),
        new THREE.Vector3(fp.w * cosA + fp.d * sinA, fp.h, fp.w * sinA + fp.d * cosA),
        'vehicle',
      );
    }

    // --- power farm: gensets on a bunded slab with distribution ---------
    const powerSlab = K.box(20, 0.2, 9, M.concreteDark, -40, 0.1, 9);
    g.add(powerSlab);
    for (const [x, z, ry] of [[-45, 8, 0.06], [-36, 8, 0.06]]) {
      const gen = bakeInstanced(K.generator(rng));
      gen.position.set(x, 0.2, z);
      gen.rotation.y = ry;
      g.add(gen);
      this.collision.addObjectAABB(gen, 'generator');
      g.add(K.cableCoil(0.55, 3).translateX(x + 2.6).translateY(0.2).translateZ(z + 1.6));
    }
    g.add(K.box(1.4, 1.9, 0.8, M.panelGrey, -30.6, 1.15, 8.4));
    g.add(sign(4, 0.8, 0.4).translateX(-30.6).translateY(2.3).translateZ(8.82));
    g.add(sign(16, 1.0, 0.5).translateX(-40).translateY(1.4).translateZ(13.2));
    for (let i = 0; i < 3; i++) g.add(K.cyl(0.05, 0.05, 1.5, 6, M.galvanised, -46 + i * 6, 0.95, 13.2));
    // feeders on trestles from the power farm toward the apron
    for (let i = 0; i < 7; i++) {
      const z = 6.4 - i * 2.8;
      g.add(K.box(0.12, 1.3, 0.12, M.galvanised, -29.4, 0.65, z));
      g.add(K.box(0.12, 1.3, 0.12, M.galvanised, -28.2, 0.65, z));
      g.add(K.box(1.5, 0.1, 0.1, M.galvanised, -28.8, 1.32, z));
    }
    g.add(loom(new THREE.Vector3(-28.8, 1.36, 7.0), new THREE.Vector3(-28.8, 1.36, -11.4), 4, { sag: 0.16, radius: 0.045, spread: 0.13 }));

    // --- stores yard: containers, pallets, crates, working tent ---------
    const yard = new THREE.Group();
    yard.position.set(-64, 0, 24);
    yard.rotation.y = 0.12;
    for (let i = 0; i < 3; i++) {
      const c = this._container(6.1, i === 1 ? M.panelSand : null);
      c.position.set(0, i === 2 ? 2.9 : 0, -7.2 + i * 3.4);
      if (i === 2) c.position.z = -7.2;
      yard.add(c);
      yard.add(sign(18, 1.1, 0.4).translateX(1.28).translateY(1.9 + (i === 2 ? 2.9 : 0)).translateZ(-7.2 + (i === 2 ? 0 : i * 3.4)).rotateY(Math.PI / 2));
    }
    // pallet racking and stacked crates
    for (let i = 0; i < 4; i++) {
      const cs = K.crateStack(rng);
      cs.position.set(4.5 + (i % 2) * 2.2, 0, -6.5 + Math.floor(i / 2) * 2.4);
      cs.rotation.y = rng.range(-0.3, 0.3);
      yard.add(cs);
      this.collision.addObjectAABB(cs, 'clutter');
    }
    for (let i = 0; i < 6; i++) {
      const pal = new THREE.Group();
      pal.position.set(3.4 + (i % 3) * 1.5, 0, 0.5 + Math.floor(i / 3) * 1.4);
      for (let b = 0; b < 4; b++) pal.add(K.box(1.15, 0.07, 0.11, M.sandPlain, 0, 0.12, -0.4 + b * 0.26));
      for (const s of [-1, 0, 1]) pal.add(K.box(0.11, 0.09, 1.0, M.sandPlain, s * 0.47, 0.05, 0));
      if (i % 2) pal.add(K.box(1.0, 0.7, 0.9, M.canvasTarp, 0, 0.5, 0));
      yard.add(pal);
    }
    // work tent: frame plus a tarp roof
    const tent = new THREE.Group();
    tent.position.set(-3.5, 0, 3.5);
    for (const [tx, tz] of [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5], [0, -2.5], [0, 2.5]]) {
      tent.add(K.cyl(0.06, 0.07, 2.6, 6, M.galvanised, tx, 1.3, tz));
    }
    for (const s of [-1, 1]) tent.add(K.box(6.2, 0.08, 0.08, M.galvanised, 0, 2.6, s * 2.5));
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 5.2, 12, 1, true, 0, Math.PI), M.canvasTarp);
    canopy.rotation.set(Math.PI / 2, 0, 0);
    canopy.position.set(0, 2.0, 0);
    tent.add(canopy);
    tent.add(K.box(2.4, 0.9, 0.8, M.panelGrey, -1.4, 0.45, -1.4));
    tent.add(bakeInstanced(K.equipmentCase(0.9, 0.5, 0.65, M.olivePlain)).translateX(1.2).translateZ(-1.0));
    tent.add(bakeInstanced(K.equipmentCase(0.7, 0.45, 0.5, M.panelGrey)).translateX(2.0).translateZ(0.2));
    yard.add(tent);
    g.add(yard);
    this.collision.addBox(new THREE.Vector3(-64, 1.4, 18.5), new THREE.Vector3(3.4, 2.8, 13), 'container');
    this.collision.addBox(new THREE.Vector3(-64.5, 1.3, 27.5), new THREE.Vector3(7, 2.6, 6), 'tent');

    // --- fuel point ------------------------------------------------------
    const fuel = new THREE.Group();
    fuel.position.set(-54, 0, 22);
    const bund = K.box(18, 0.34, 10, M.concreteDark, 0, 0.17, 0);
    fuel.add(bund);
    for (const [bx, bz, bw, bd] of [[0, -5, 18, 0.5], [0, 5, 18, 0.5], [-9, 0, 0.5, 10], [9, 0, 0.5, 10]]) {
      fuel.add(K.box(bw, 0.7, bd, M.concreteDark, bx, 0.35, bz));
    }
    const bladder = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 12), M.canvasTarp);
    bladder.scale.set(1.5, 0.42, 1.0);
    bladder.position.set(-4, 1.2, 0);
    bladder.castShadow = true;
    fuel.add(bladder);
    const tank = K.cyl(1.5, 1.5, 4.4, 18, M.panelWhite, 4, 2.2, 0);
    tank.rotation.z = Math.PI / 2;
    fuel.add(tank);
    for (const s of [-1, 1]) fuel.add(K.box(0.5, 2.0, 1.6, M.galvanised, 4 + s * 1.6, 1.0, 0));
    fuel.add(K.box(0.7, 1.1, 0.6, M.panelGrey, 7.2, 0.9, 1.6));
    fuel.add(K.cable(new THREE.Vector3(7.2, 1.3, 1.6), new THREE.Vector3(6.2, 0.6, 2.6), { sag: 0.5, radius: 0.035 }));
    for (let i = 0; i < 5; i++) {
      const drum = K.cyl(0.3, 0.3, 0.88, 12, M.rusted, -8 + (i % 3) * 0.72, 0.78, 3.2 + Math.floor(i / 3) * 0.72);
      fuel.add(drum);
    }
    fuel.add(sign(17, 1.5, 0.6).translateX(0).translateY(1.5).translateZ(5.4));
    fuel.add(sign(2, 0.9, 0.45).translateX(3).translateY(1.5).translateZ(5.4));
    for (const s of [-1, 1]) fuel.add(K.cyl(0.05, 0.05, 1.7, 6, M.galvanised, s * 0.7, 0.85, 5.4));
    g.add(fuel);
    this.collision.addBox(new THREE.Vector3(-58, 0.8, 22), new THREE.Vector3(7.2, 1.6, 4.8), 'bladder');
    this.collision.addBox(new THREE.Vector3(-50, 1.6, 22), new THREE.Vector3(4.8, 3.2, 3.2), 'tank');

    // --- antenna farm ----------------------------------------------------
    for (const [x, z, h] of [[-88, 30, 12], [-80, 34, 9], [60, 30, 14]]) {
      const mast = bakeInstanced(K.antennaMast(h, { dish: h > 11, rng }));
      mast.position.set(x, this.terrainHeight(x, z), z);
      g.add(mast);
      markDynamic(mast.userData.beacon, mast.userData.dish);
      this.beacons.push(mast.userData.beacon);
      if (mast.userData.dish) this.rotators.push({ obj: mast.userData.dish, axis: 'y', speed: 0.15 });
      this.collision.addCylinder(new THREE.Vector3(x, 3, z), 0.7, 6, 'mast');
      // ground radials and an equipment cabinet at the foot of each mast
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const radial = K.box(5, 0.02, 0.02, M.steel, x + Math.cos(a) * 2.5, 0.05, z + Math.sin(a) * 2.5);
        radial.rotation.y = -a;
        g.add(radial);
      }
      g.add(K.box(1.1, 1.4, 0.8, M.panelGrey, x + 1.9, 0.7, z + 1.2));
      g.add(sign(28, 0.8, 0.4).translateX(x + 1.9).translateY(1.7).translateZ(z + 1.62));
    }

    // --- barrier lines along the roads -----------------------------------
    const barrierRuns = [
      { x: -20, z: -6, n: 8, ry: 0, step: 3.1, dir: [0, 1] },
      { x: 12, z: 4, n: 6, ry: Math.PI / 2, step: 3.1, dir: [1, 0] },
      { x: -6, z: -34, n: 7, ry: Math.PI / 2, step: 3.1, dir: [1, 0] },
      { x: 24, z: -20, n: 6, ry: 0, step: 3.1, dir: [0, 1] },
    ];
    for (const run of barrierRuns) {
      for (let i = 0; i < run.n; i++) {
        const b = K.jerseyBarrier(3);
        const x = run.x + run.dir[0] * (i - run.n / 2) * run.step;
        const z = run.z + run.dir[1] * (i - run.n / 2) * run.step;
        b.position.set(x, 0, z);
        b.rotation.y = run.ry;
        g.add(b);
        this.collision.addBox(new THREE.Vector3(x, 0.5, z), new THREE.Vector3(run.dir[1] ? 3.1 : 0.7, 1.0, run.dir[1] ? 0.7 : 3.1), 'barrier');
        if (i % 3 === 0) {
          const s = sign(11, 0.6, 0.3);
          s.position.set(x, 1.25, z + (run.dir[1] ? 0.4 : 0));
          s.rotation.y = run.ry;
          g.add(s);
        }
      }
    }
    // gabion revetments
    for (const [x, z, ry, len] of [[-74, 4, 0, 10], [50, 22, Math.PI / 2, 8], [66, -14, 0, 8]]) {
      const w = K.gabionWall(len, 1.5);
      w.position.set(x, 0, z);
      w.rotation.y = ry;
      g.add(w);
      this.collision.addObjectAABB(w, 'gabion');
    }

    // --- forward equipment laydown near the apron edge -------------------
    // Grouped into small working clusters rather than sprinkled at random.
    const clusters = [
      [16, -30], [-24, -40], [34, 22], [-14, -16], [40, -14],
    ];
    for (const [cx, cz] of clusters) {
      const slab = K.box(6.5, 0.12, 5.0, M.concreteDark, cx, 0.06, cz);
      g.add(slab);
      const n = 3 + rng.int(0, 2);
      for (let i = 0; i < n; i++) {
        const x = cx + rng.range(-2.4, 2.4);
        const z = cz + rng.range(-1.8, 1.8);
        let prop;
        const roll = rng.float();
        if (roll < 0.34) prop = K.crateStack(rng);
        else if (roll < 0.62) prop = bakeInstanced(K.equipmentCase(0.9, 0.5, 0.65, rng.bool() ? M.olivePlain : M.panelGrey));
        else if (roll < 0.8) prop = K.cableCoil(0.5 + rng.float() * 0.3, 3);
        else {
          prop = new THREE.Group();
          prop.add(K.cyl(0.3, 0.3, 0.85, 12, M.rusted, 0, 0.43, 0));
          for (let rr = 0; rr < 3; rr++) {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.02, 5, 12), M.darkMetal);
            rib.rotation.x = Math.PI / 2;
            rib.position.y = 0.15 + rr * 0.28;
            prop.add(rib);
          }
        }
        prop.position.set(x, 0.12, z);
        prop.rotation.y = rng.range(0, Math.PI * 2);
        g.add(prop);
        if (roll < 0.62) this.collision.addObjectAABB(prop, 'clutter');
      }
      g.add(sign(29 - (Math.abs(cx) % 3), 0.6, 0.3).translateX(cx).translateY(0.9).translateZ(cz + 2.7));
      g.add(K.cyl(0.04, 0.04, 0.8, 6, M.galvanised, cx, 0.4, cz + 2.7));
    }

    // --- windsock: a readable motion cue against the sky -----------------
    const sock = new THREE.Group();
    sock.position.set(24, 0, 16);
    sock.add(K.cyl(0.09, 0.12, 6.0, 10, M.galvanised, 0, 3.0, 0));
    sock.add(K.box(0.7, 0.16, 0.7, M.concreteDark, 0, 0.08, 0));
    const sockMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.16, 1.9, 12, 3, true),
      new THREE.MeshStandardMaterial({ color: 0xe1622a, roughness: 0.9, side: THREE.DoubleSide }),
    );
    sockMesh.rotation.z = Math.PI / 2;
    sockMesh.position.set(1.0, 5.9, 0);
    sock.add(sockMesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 14), M.steel);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0.06, 5.9, 0);
    sock.add(ring);
    this.windsock = markDynamic(sockMesh);
    g.add(sock);
    this.collision.addCylinder(new THREE.Vector3(24, 3, 16), 0.4, 6, 'mast');

    // --- camouflage netting canopy over the parking area -----------------
    const net = new THREE.Mesh(new THREE.PlaneGeometry(18, 12, 8, 6), M.camoNet);
    {
      const p = net.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, Math.cos((x / 18) * Math.PI) * 0.9 + Math.cos((y / 12) * Math.PI) * 0.6 + rng.range(-0.15, 0.15));
      }
      net.geometry.computeVertexNormals();
    }
    net.rotation.x = -Math.PI / 2;
    net.position.set(-30, 4.6, 26);
    g.add(net);
    for (const [dx, dz] of [[-8.6, -5.6], [8.6, -5.6], [-8.6, 5.6], [8.6, 5.6], [0, -5.6], [0, 5.6]]) {
      const pole = K.cyl(0.06, 0.07, 4.6, 7, M.galvanised, -30 + dx, 2.3, 26 + dz);
      g.add(pole);
      g.add(K.cable(
        new THREE.Vector3(-30 + dx, 4.5, 26 + dz),
        new THREE.Vector3(-30 + dx * 1.3, 0.1, 26 + dz * 1.3),
        { sag: 0.1, radius: 0.012, material: M.steel, segments: 6 },
      ));
    }

    this.group.add(g);
  }

  build() {
    this.buildTerrain();
    this.buildGroundworks();
    this.buildShelter();
    this.buildRadarStation();
    this.buildPerimeter();
    this.buildFloodlights();
    this.buildProps();
    this._emitSandbags();
    // fold small instanced kit parts back into ordinary meshes, then collapse
    // the whole static site into a handful of draw calls
    bakeInstanced(this.group, 96);
    this.mergeStats = mergeStatic(this.group, { tag: 'site' });
    return this;
  }

  // -------------------------------------------------------------------------
  // Runtime
  // -------------------------------------------------------------------------

  /** Turn base lighting on/off for night conditions. */
  setNight(isNight, intensityScale = 1) {
    const M = mats();
    for (const f of this.floodlights) {
      f.spot.intensity = isNight ? 620 * intensityScale : 0;
    }
    // every static lamp lens on the site shares this material
    this.lampGlassMaterial.emissiveIntensity = isNight ? 5.5 * intensityScale : 0;
    this.lampGlassMaterial.color.set(isNight ? 0xfff2d0 : 0x8a8d86);
    for (const l of this.lampLights) {
      if (l.light) l.light.intensity = isNight ? 44 : 36;
      if (l.bulbMesh) l.bulbMesh.material = isNight ? M.lampGlassOn : M.lampGlassOff;
    }
    this.tubeMaterial.emissiveIntensity = isNight ? 3.0 : 2.2;
    this.nightMode = isNight;
    for (const s of this.searchlights) {
      s.userData.beam.visible = isNight;
      s.userData.spot.intensity = isNight ? 900 : 0;
      s.userData.lens.material = isNight ? M.lampGlassOn : M.lampGlassOff;
    }
  }

  /** Searchlights sweep only during the night raid scenario. */
  setSearchlightsActive(active) {
    this.searchActive = active;
    for (const s of this.searchlights) {
      s.userData.beamMat.opacity = active ? 0.06 : 0.0;
      s.userData.beam.visible = active;
    }
  }

  update(dt, elapsed) {
    this.time += dt;
    for (const r of this.rotators) {
      r.obj.rotation[r.axis] += r.speed * dt;
    }
    // radar array performs a sector sweep rather than a constant spin
    if (this.radarTurret) {
      this.radarTurret.rotation.y = Math.sin(this.time * 0.34) * 1.5 - 0.4;
    }
    // beacon flashes
    const flash = (Math.sin(this.time * 3.1) * 0.5 + 0.5) ** 3;
    for (const b of this.beacons) {
      if (!b) continue;
      if (b.material) {
        if (b.material.emissiveIntensity !== undefined) b.material.emissiveIntensity = 0.6 + flash * 7;
        else if (b.material.opacity !== undefined) b.material.opacity = 0.2 + flash * 0.8;
      }
      if (b.rotation) b.rotation.y += dt * 5.2;
    }
    // windsock drifts
    if (this.windsock) {
      this.windsock.rotation.x = Math.sin(this.time * 0.9) * 0.14;
      this.windsock.rotation.y = Math.PI / 2 + Math.sin(this.time * 0.5) * 0.2;
    }
    // searchlight sweep
    if (this.searchActive) {
      for (let i = 0; i < this.searchlights.length; i++) {
        const s = this.searchlights[i];
        const t = this.time * 0.32 + i * 2.1;
        s.userData.yoke.rotation.y = Math.sin(t) * 1.5;
        s.userData.head.rotation.x = -0.55 + Math.sin(t * 1.7) * 0.3;
      }
    }
    // radar face emissive pulse conveys "radiating"
    if (this.radarFaceMaterial) {
      this.radarFaceMaterial.emissiveIntensity = 0.25 + (Math.sin(this.time * 5) * 0.5 + 0.5) * 0.35;
    }
    if (this.gateBoom) this.gateBoom.rotation.z = 0.02 + Math.sin(this.time * 0.2) * 0.01;
  }
}
