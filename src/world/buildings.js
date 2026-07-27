import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterialLib, scaleBoxUVs, addWallGradient } from './textures.js';
import { makeRNG, clamp } from '../core/math.js';
import { buildACUnit, buildShopSign, buildRubblePile, shadow } from './props.js';

let STREAK_MAT = null;
/** Shared translucent vertical-streak material (weathering under sills). */
function getStreakMat() {
  if (STREAK_MAT) return STREAK_MAT;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 4 + Math.random() * 56;
    const w = 2 + Math.random() * 6;
    const grd = ctx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, `rgba(30, 25, 20, ${0.28 + Math.random() * 0.2})`);
    grd.addColorStop(1, 'rgba(30, 25, 20, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - w / 2, 0, w, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  STREAK_MAT = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.72 });
  return STREAK_MAT;
}

let SKIRT_MAT = null;
/** Grounding grime band around building bases. */
function getSkirtMat() {
  if (SKIRT_MAT) return SKIRT_MAT;
  const c = document.createElement('canvas');
  c.width = 8; c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 64, 0, 0);
  grd.addColorStop(0, 'rgba(20, 16, 12, 0.5)');
  grd.addColorStop(1, 'rgba(20, 16, 12, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 8, 64);
  const t = new THREE.CanvasTexture(c);
  SKIRT_MAT = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  return SKIRT_MAT;
}

let TOPSTAIN_MAT = null;
/** Water-stain band bleeding down from the roofline, with drip teeth. */
function getTopStainMat() {
  if (TOPSTAIN_MAT) return TOPSTAIN_MAT;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, 'rgba(52, 42, 30, 0.42)');
  grd.addColorStop(1, 'rgba(52, 42, 30, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256, w2 = 2 + Math.random() * 5, h2 = 12 + Math.random() * 36;
    const g2 = ctx.createLinearGradient(0, 6, 0, 6 + h2);
    g2.addColorStop(0, `rgba(52, 42, 30, ${0.2 + Math.random() * 0.3})`);
    g2.addColorStop(1, 'rgba(52, 42, 30, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x, 6, w2, h2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  TOPSTAIN_MAT = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  return TOPSTAIN_MAT;
}

let REVEALAO_MAT = null;
/** Inner-shadow frame decal — bakes contact occlusion into every window
 *  reveal (dark jambs/lintel, strongest at the top where the sun never
 *  reaches). Merged per building via the GeoBucket. */
function getRevealAOMat() {
  if (REVEALAO_MAT) return REVEALAO_MAT;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const edge = (x0, y0, x1, y1, a) => {
    const grd = ctx.createLinearGradient(x0, y0, x1, y1);
    grd.addColorStop(0, `rgba(10, 8, 6, ${a})`);
    grd.addColorStop(0.55, `rgba(10, 8, 6, ${a * 0.35})`);
    grd.addColorStop(1, 'rgba(10, 8, 6, 0)');
    ctx.fillStyle = grd;
  };
  edge(0, 0, 0, 22, 0.78); ctx.fillRect(0, 0, 64, 22);        // lintel shadow (top)
  edge(0, 64, 0, 46, 0.4); ctx.fillRect(0, 46, 64, 18);       // sill bounce (bottom)
  edge(0, 0, 16, 0, 0.6); ctx.fillRect(0, 0, 16, 64);         // jambs
  edge(64, 0, 48, 0, 0.6); ctx.fillRect(48, 0, 16, 64);
  const t = new THREE.CanvasTexture(c);
  REVEALAO_MAT = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  return REVEALAO_MAT;
}

let CORNERAO_MAT = null;
/** Horizontal gradient strip: darkens the last ~0.5m of a facade into its
 *  corner. Dark edge at u=0 (left). */
function getCornerAOMat() {
  if (CORNERAO_MAT) return CORNERAO_MAT;
  const c = document.createElement('canvas');
  c.width = 48; c.height = 8;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 48, 0);
  grd.addColorStop(0, 'rgba(14, 11, 8, 0.46)');
  grd.addColorStop(0.4, 'rgba(14, 11, 8, 0.16)');
  grd.addColorStop(1, 'rgba(14, 11, 8, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 48, 8);
  const t = new THREE.CanvasTexture(c);
  CORNERAO_MAT = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  return CORNERAO_MAT;
}

let REBAR_MAT = null;
/** Rust-dark rebar rods for unfinished-column roof stubs. */
function getRebarMat() {
  if (!REBAR_MAT) REBAR_MAT = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.65, metalness: 0.5 });
  return REBAR_MAT;
}

let SHUTTER_TRIM_MAT = null;
/** Dark dusty metal for roll-shutter drums, rails and bottom bars. */
function getShutterTrimMat() {
  if (!SHUTTER_TRIM_MAT) SHUTTER_TRIM_MAT = new THREE.MeshStandardMaterial({ color: 0x413c34, roughness: 0.62, metalness: 0.55 });
  return SHUTTER_TRIM_MAT;
}

let AWNING_MATS = null;
/** Shared sun-bleached awning cloth palette (desaturated, double-sided). */
function getAwningMats() {
  if (AWNING_MATS) return AWNING_MATS;
  AWNING_MATS = [0x7e4038, 0x49594f, 0x77633e, 0x5f584a].map((col) =>
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, side: THREE.DoubleSide }));
  return AWNING_MATS;
}

let TARP_MATS = null;
/** Faded tarps draped over parapets (tinted clones of the fabric set). */
function getTarpMats() {
  if (TARP_MATS) return TARP_MATS;
  const lib = getMaterialLib();
  TARP_MATS = [0xb0a284, 0x76806c, 0x99795e].map((col) => {
    const m = lib.tarp.clone();
    m.color = new THREE.Color(col);
    m.side = THREE.DoubleSide;
    return m;
  });
  return TARP_MATS;
}

let DISH_SHARED = null;
/** Shared canvas-textured satellite-dish assets. */
function getDishShared() {
  if (DISH_SHARED) return DISH_SHARED;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c6bfae';
  ctx.fillRect(0, 0, 64, 64);
  const sh = ctx.createRadialGradient(32, 32, 6, 32, 32, 34);
  sh.addColorStop(0, 'rgba(255, 250, 238, 0.35)');
  sh.addColorStop(0.7, 'rgba(120, 108, 90, 0.12)');
  sh.addColorStop(1, 'rgba(70, 60, 48, 0.5)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(96, 74, 52, ${0.06 + Math.random() * 0.16})`;
    ctx.fillRect(Math.random() * 64, Math.random() * 44, 1 + Math.random() * 2.5, 6 + Math.random() * 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dishGeo = new THREE.SphereGeometry(0.34, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  dishGeo.scale(1, 0.36, 1);
  DISH_SHARED = {
    dishGeo,
    dishMat: new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, metalness: 0.18, side: THREE.DoubleSide }),
    armMat: new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 0.55, metalness: 0.65 }),
  };
  return DISH_SHARED;
}

let TANK_DARK = null;
/** Black rooftop poly water tank plastic (the region's other tank family). */
function getTankDarkMat() {
  if (!TANK_DARK) TANK_DARK = new THREE.MeshStandardMaterial({ color: 0x33302a, roughness: 0.78, metalness: 0.06 });
  return TANK_DARK;
}

/** Weathered tarp draped over a parapet: top folds inward over the cap,
 *  skirt billows down the facade. Returns geometry for GeoBucket merging. */
function buildRoofTarpGeo(r) {
  const w0 = 1.3 + r() * 1.0;
  const geo = new THREE.PlaneGeometry(w0, 1.5, 7, 6);
  const pa = geo.attributes.position;
  const ph = r() * 9;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i);
    let z = 0;
    if (y > 0.35) z = -(y - 0.35) * 1.15;                      // fold over the cap
    z += Math.sin(x * 4.2 + ph) * 0.06 * clamp(0.35 - y, 0, 1.1);   // billow
    z += Math.sin(y * 5.1 + ph * 1.7) * 0.03;
    pa.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

let GRAFFITI_MATS = null;
/** Spray-tag decals: flowing arabic-style strokes with overspray + drips. */
function getGraffitiMats() {
  if (GRAFFITI_MATS) return GRAFFITI_MATS;
  GRAFFITI_MATS = [];
  const sprays = ['30, 26, 24', '108, 34, 26', '26, 42, 60', '224, 214, 196'];
  for (let p = 0; p < 4; p++) {
    const r = makeRNG(p * 977 + 41);
    const c = document.createElement('canvas');
    c.width = 192; c.height = 96;
    const ctx = c.getContext('2d');
    const col = sprays[p % sprays.length];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const tag = (alpha, width) => {
      ctx.strokeStyle = `rgba(${col}, ${alpha})`;
      ctx.lineWidth = width;
      let x = 176 - r() * 14;
      const baseY = 46 + r.spread(8);
      ctx.beginPath();
      ctx.moveTo(x, baseY + r.spread(6));
      while (x > 22) {
        const nx = x - (14 + r() * 22);
        ctx.bezierCurveTo(
          x - 6, baseY + r.spread(22), nx + 8, baseY + r.spread(24), nx, baseY + r.spread(9));
        if (r.chance(0.3)) { // loop
          ctx.bezierCurveTo(nx - 12, baseY - 20 - r() * 8, nx - 16, baseY + 12, nx - 8, baseY + r.spread(6));
        }
        x = nx;
      }
      ctx.stroke();
    };
    tag(0.13, 15);            // overspray halo
    tag(0.62 + r() * 0.14, 5.5); // main strokes
    // dots + underline slash
    ctx.fillStyle = `rgba(${col}, 0.6)`;
    for (let i = 0; i < 3; i++) ctx.fillRect(40 + r() * 110, 22 + r() * 12, 4, 4);
    ctx.strokeStyle = `rgba(${col}, 0.5)`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(34 + r() * 20, 72 + r.spread(5));
    ctx.lineTo(150 + r() * 24, 68 + r.spread(5));
    ctx.stroke();
    // paint drips
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = `rgba(${col}, ${0.2 + r() * 0.25})`;
      ctx.fillRect(30 + r() * 130, 46 + r() * 18, 1.5, 8 + r() * 22);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    GRAFFITI_MATS.push(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.95 }));
  }
  return GRAFFITI_MATS;
}

let POSTER_MATS = null;
/** Procedural street posters: faded palettes, arabic-style text blocks,
 *  a product shape, torn corner + grime. */
function getPosterMats() {
  if (POSTER_MATS) return POSTER_MATS;
  POSTER_MATS = [];
  const palettes = [
    ['#8a3026', '#e8dcc4', '#c8a24a'], ['#26506a', '#e0d6c0', '#a03428'],
    ['#7a6228', '#ece0c8', '#31404f'], ['#3c5a50', '#e4d8be', '#8a3428'],
    ['#5a3a6a', '#e8e0cc', '#b8862e'],
  ];
  for (let p = 0; p < palettes.length; p++) {
    const [accent, paper, accent2] = palettes[p];
    const r = makeRNG(p * 553 + 19);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 192;
    const ctx = c.getContext('2d');
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 128, 192);
    // header band
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 128, 34 + r() * 18);
    // arabic-style text: rows of connected strokes with dots
    ctx.fillStyle = r.chance(0.5) ? '#2a2420' : accent;
    for (let row = 0; row < 4; row++) {
      const y = 66 + row * 22;
      let x = 118;
      while (x > 12) {
        const w2 = 6 + r() * 18;
        ctx.fillRect(x - w2, y, w2, 3.5);
        if (r.chance(0.5)) ctx.fillRect(x - w2 * 0.6, y - 5, 2.5, 2.5); // dot above
        if (r.chance(0.35)) ctx.fillRect(x - w2 * 0.3, y + 3, 3, 5);   // descender
        x -= w2 + 4 + r() * 6;
      }
    }
    // product shape: tea glass / bottle / disc
    ctx.fillStyle = accent2;
    if (r.chance(0.5)) {
      ctx.beginPath(); ctx.arc(38, 42, 16, 0, 7); ctx.fill();
    } else {
      ctx.fillRect(26, 22, 18, 34);
      ctx.fillRect(30, 14, 10, 9);
    }
    // fade + grime + torn corner
    ctx.fillStyle = 'rgba(226, 214, 190, 0.28)';
    ctx.fillRect(0, 0, 128, 192);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(60, 48, 36, ${r() * 0.16})`;
      ctx.fillRect(r() * 128, r() * 192, r() * 22, r() * 4);
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    const corner = r.int(0, 3);
    const cxp = corner % 2 ? 128 : 0, cyp = corner < 2 ? 0 : 192;
    ctx.moveTo(cxp, cyp);
    ctx.lineTo(cxp + (corner % 2 ? -1 : 1) * (14 + r() * 22), cyp);
    ctx.lineTo(cxp, cyp + (corner < 2 ? 1 : -1) * (16 + r() * 26));
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    POSTER_MATS.push(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.92 }));
  }
  return POSTER_MATS;
}

let CURTAIN_MAT = null, GLOW_MAT = null, HOT_GLASS = null, CLEAR_GLASS = null;
/** Warm curtain fabric hung just behind clear panes (~25% of windows). */
function getCurtainMat() {
  if (!CURTAIN_MAT) CURTAIN_MAT = new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 0.95 });
  return CURTAIN_MAT;
}
/** Warm interior glow pane — dusk practical behind clear glass. */
function getGlowMat() {
  if (!GLOW_MAT) GLOW_MAT = new THREE.MeshStandardMaterial({ color: 0x241a10, emissive: 0xffb36a, emissiveIntensity: 1.45 });
  return GLOW_MAT;
}
/** Occasional upper-floor pane that pings a hot sky reflection. */
function getHotGlass() {
  if (!HOT_GLASS) HOT_GLASS = new THREE.MeshStandardMaterial({ color: 0x5c6c78, roughness: 0.07, metalness: 0.9, envMapIntensity: 4.0 });
  return HOT_GLASS;
}
/** See-through glazing used in front of curtains / glow panes. */
function getClearGlass() {
  if (!CLEAR_GLASS) {
    CLEAR_GLASS = new THREE.MeshStandardMaterial({
      color: 0x8a97a0, roughness: 0.06, metalness: 0.9, envMapIntensity: 3.2,
      transparent: true, opacity: 0.4, depthWrite: false,
    });
  }
  return CLEAR_GLASS;
}

/** Tiles-per-meter for each textured wall material (world-space UVs). */
let UV_K = null;
function uvScaleFor(mat) {
  if (!UV_K) {
    const lib = getMaterialLib();
    UV_K = new Map([
      [lib.plasterSand, [0.3, 0.3]],
      [lib.plasterWhite, [0.3, 0.3]],
      [lib.plasterOchre, [0.3, 0.3]],
      [lib.plasterRose, [0.3, 0.3]],
      [lib.brick, [0.55, 0.72]],
      [lib.concreteDark, [0.5, 0.5]],
      [lib.wood, [0.9, 0.9]],
      [lib.corrugated, [0.42, 0.42]],
      [lib.concrete, [0.35, 0.35]],
    ]);
  }
  return UV_K.get(mat) ?? null;
}

/** Cached tinted clones of wall materials (ground-floor bands, parapets). */
const WALL_VARIANTS = new Map();
function tintedWallVariant(wallMat, tintHex, gradient = true) {
  const key = wallMat.uuid + ':' + tintHex + ':' + gradient;
  if (WALL_VARIANTS.has(key)) return WALL_VARIANTS.get(key);
  const k = uvScaleFor(wallMat); // also ensures UV_K exists
  const m = wallMat.clone();
  m.color = new THREE.Color(tintHex);
  if (gradient) addWallGradient(m);
  if (k) UV_K.set(m, k);
  WALL_VARIANTS.set(key, m);
  return m;
}

/**
 * Building factory. Facades are assembled from real geometry — punched
 * window openings with recessed glass, frames, sills, cornices, parapets,
 * balconies — then merged per-material for performance. Invisible collision
 * proxy boxes are attached (userData.collider) for the physics set.
 */

const STORY_H = 3.1;
const GROUND_H = 3.7;

function collProxy(group, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz));
  m.position.set(x, y, z);
  m.visible = false;
  m.userData.collider = true;
  group.add(m);
}

class GeoBucket {
  constructor(uvOffset = [0, 0]) {
    this.map = new Map();
    this.uvOffset = uvOffset;
  }
  add(mat, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
    const g = geo.clone();
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
  }
  box(mat, x, y, z, sx, sy, sz, ry = 0) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const k = uvScaleFor(mat);
    if (k) {
      scaleBoxUVs(geo, sx, sy, sz, k[0], k[1]);
      // Per-building random UV offset breaks visible tiling repetition
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) + this.uvOffset[0], uv.getY(i) + this.uvOffset[1]);
      }
    }
    this.add(mat, geo, x, y, z, ry);
  }
  build(group) {
    for (const [mat, geos] of this.map) {
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.transparent;
      mesh.receiveShadow = !mat.transparent;
      if (mat.transparent) mesh.renderOrder = 2;
      group.add(mesh);
    }
  }
}

const WALL_STYLES = ['plasterSand', 'plasterWhite', 'plasterOchre', 'plasterRose', 'brick'];

/**
 * A city building. Front facade faces +Z in local space.
 * opts: { w, d, stories, styleIdx, seed, storefront, signText }
 */
export function buildBuilding(opts = {}) {
  const lib = getMaterialLib();
  const r = makeRNG((opts.seed ?? 1) * 7717 + 11);
  const w = opts.w ?? 12;
  const d = opts.d ?? 10;
  const stories = opts.stories ?? 2;
  const style = WALL_STYLES[(opts.styleIdx ?? r.int(0, WALL_STYLES.length - 1)) % WALL_STYLES.length];
  const wallMat = lib[style];
  const trimMat = lib.concreteDark;
  // Differently-tinted ground-floor band + dust-darkened parapet course
  const bandMat = tintedWallVariant(wallMat, r.pick([0xcdbfa6, 0xc2b096, 0xbfb2a2]), true);
  const parapetMat = tintedWallVariant(wallMat, 0xcccccc, false);
  const H = GROUND_H + (stories - 1) * STORY_H;

  const group = new THREE.Group();
  const uvOff = [r() * 7, r() * 7];
  const B = new GeoBucket(uvOff);
  const wallT = 0.4;
  let glowLeft = opts.glowWindows ?? 0; // dusk-practical window budget (front facade)
  // Ground-floor openings on the street facade ({x, w} in facade space) —
  // collected so posters/graffiti can cluster around doorways and shutters
  // instead of marching down the wall in a regular column
  const frontFeatures = [];

  /* Facade builder for one side. Writes untransformed geometry into `sub`;
     the placement wrapper rotates/translates it into position. */
  const facade = (faceW, hasStorefront, isFront) => {
    const sub = new GeoBucket(uvOff);
    const winW = 1.15, winH = 1.5;
    const bays = Math.max(1, Math.round(faceW / 2.35));
    const bayW = faceW / bays;

    for (let s = 0; s < stories; s++) {
      const y0 = s === 0 ? 0 : GROUND_H + (s - 1) * STORY_H;
      const h = s === 0 ? GROUND_H : STORY_H;
      const sillY = y0 + (s === 0 ? 1.15 : 0.95);
      const lintelY = sillY + winH;
      const wm = s === 0 ? bandMat : wallMat; // tinted ground-floor band

      if (s === 0 && hasStorefront) {
        // Storefront: big central opening w/ roll shutter, flanking wall
        const openW = Math.min(faceW - 2.4, 5.2);
        const sideW = (faceW - openW) / 2;
        if (isFront) frontFeatures.push({ x: 0, w: openW });
        sub.box(wm, -faceW / 2 + sideW / 2, h / 2, 0, sideW, h, wallT);
        sub.box(wm, faceW / 2 - sideW / 2, h / 2, 0, sideW, h, wallT);
        sub.box(wm, 0, h - 0.45, 0, openW, 0.9, wallT); // header
        const openH = h - 0.9;
        // Roll drum housing under the header
        sub.box(getShutterTrimMat(), 0, openH - 0.09, -0.04, openW, 0.2, 0.28);
        if (r.chance(0.4)) {
          // Half-rolled shutter: dark shop interior gapes below the slats
          sub.box(lib.darkInterior, 0, openH / 2, -0.32, openW, openH, 0.03);
          const shH = openH * 0.5;
          sub.box(lib.corrugated, 0, openH - 0.2 - shH / 2, -0.12, openW - 0.08, shH, 0.05);
          sub.box(getShutterTrimMat(), 0, openH - 0.2 - shH - 0.035, -0.12, openW - 0.04, 0.08, 0.08);
        } else {
          sub.box(lib.corrugated, 0, (openH - 0.16) / 2, -0.1, openW, openH - 0.16, 0.06);
        }
        continue;
      }

      // Regular floor with punched windows
      for (let b = 0; b < bays; b++) {
        const bx = -faceW / 2 + bayW * (b + 0.5);

        // Ground-floor lock-up shops: roll-up metal shutter doors (some
        // half-open onto dark interiors) instead of a flat wall bay
        if (s === 0 && isFront && !hasStorefront && bays > 1 && r.chance(0.32)) {
          const openW = Math.min(bayW - 0.5, 2.1);
          const doorH = 2.5;
          frontFeatures.push({ x: bx, w: openW });
          const pw = bayW - openW;
          sub.box(wm, bx - bayW / 2 + pw / 4, y0 + h / 2, 0, pw / 2, h, wallT);
          sub.box(wm, bx + bayW / 2 - pw / 4, y0 + h / 2, 0, pw / 2, h, wallT);
          sub.box(wm, bx, doorH + (h - doorH) / 2, 0, openW, h - doorH, wallT); // header
          sub.box(trimMat, bx, doorH + 0.03, 0.1, openW + 0.18, 0.1, 0.28);     // lintel band
          sub.box(getShutterTrimMat(), bx, doorH - 0.1, -0.03, openW, 0.18, 0.26); // roll drum
          if (r.chance(0.4)) {
            // Half-open: slats stop mid-door, dark interior below
            sub.box(lib.darkInterior, bx, doorH / 2, -0.3, openW, doorH, 0.03);
            const shH = doorH * 0.48;
            sub.box(lib.corrugated, bx, doorH - 0.2 - shH / 2, -0.12, openW - 0.06, shH, 0.05);
            sub.box(getShutterTrimMat(), bx, doorH - 0.2 - shH - 0.035, -0.12, openW - 0.02, 0.07, 0.07);
          } else {
            sub.box(lib.corrugated, bx, (doorH - 0.18) / 2, -0.12, openW - 0.06, doorH - 0.18, 0.05);
          }
          // Reveal shadow + grime bleeding down from the drum
          sub.add(getRevealAOMat(), new THREE.PlaneGeometry(openW, doorH), bx, doorH / 2, -0.06);
          sub.add(getStreakMat(), new THREE.PlaneGeometry(openW * 0.8, 0.7 + r() * 0.5),
            bx + r.spread(0.1), doorH + 0.45, wallT / 2 + 0.012);
          // Cloth awning over some shopfronts
          if (r.chance(0.45)) {
            const awnW = openW + 0.5 + r() * 0.3;
            const awn = new THREE.PlaneGeometry(awnW, 1.05, 7, 1);
            const pa = awn.attributes.position;
            for (let i = 0; i < pa.count; i++) {
              pa.setZ(i, Math.sin((pa.getX(i) + 10) * 4.2) * 0.03);
            }
            awn.computeVertexNormals();
            awn.rotateX(-Math.PI / 2 + 0.52);
            sub.add(getAwningMats()[r.int(0, 3)], awn, bx, doorH + 0.28, wallT / 2 + 0.42);
          }
          continue;
        }

        const hasWin = !(s === 0 && b === 0 && r.chance(0.5)); // sometimes a door instead
        const pierW = bayW - winW;
        // Piers (walls between windows)
        sub.box(wm, bx - bayW / 2 + pierW / 4, y0 + h / 2, 0, pierW / 2, h, wallT);
        sub.box(wm, bx + bayW / 2 - pierW / 4, y0 + h / 2, 0, pierW / 2, h, wallT);

        if (hasWin || s > 0) {
          // Below sill + above lintel
          sub.box(wm, bx, y0 + (sillY - y0) / 2, 0, winW, sillY - y0, wallT);
          sub.box(wm, bx, lintelY + (y0 + h - lintelY) / 2, 0, winW, y0 + h - lintelY, wallT);
          // Window states: glass 55% / closed shutters 15% / plywood 20% /
          // gaping hole 10%
          const state = r();
          // Fake-parallax interior: dark backing plane ~0.3m behind the
          // frame (oversized so grazing angles never see through)
          sub.box(lib.darkInterior, bx, sillY + winH / 2, state < 0.7 || state >= 0.9 ? -0.5 : -0.22,
            winW + 0.5, winH + 0.4, 0.02);
          if (state < 0.55) {
            // Per-window life: curtains, glow panes, hot sky-ping glass
            // (glow budget spends at a high take-rate so map-curated
            // glowWindows counts actually land on the facade)
            const deco = r();
            if (isFront && glowLeft > 0 && s > 0 && deco < 0.6) {
              glowLeft--;
              sub.box(getGlowMat(), bx, sillY + winH / 2, -0.24, winW - 0.2, winH - 0.2, 0.015);
              sub.box(getClearGlass(), bx, sillY + winH / 2, -0.18, winW - 0.14, winH - 0.14, 0.02);
            } else if (deco < 0.45) {
              sub.box(getCurtainMat(), bx, sillY + winH / 2, -0.26, winW - 0.18, winH - 0.18, 0.015);
              sub.box(getClearGlass(), bx, sillY + winH / 2, -0.18, winW - 0.14, winH - 0.14, 0.02);
            } else {
              const glassMat = s > 0 && r.chance(0.18)
                ? getHotGlass()
                : [lib.glassWindow, lib.glassWindow2, lib.glassWindow3][r.int(0, 2)];
              sub.box(glassMat, bx, sillY + winH / 2, -0.18, winW - 0.14, winH - 0.14, 0.02);
            }
            // Cross mullion
            sub.box(lib.wood, bx, sillY + winH / 2, -0.155, winW - 0.1, 0.05, 0.04);
            sub.box(lib.wood, bx, sillY + winH / 2, -0.155, 0.05, winH - 0.1, 0.04);
            // Open shutters folded back against the facade (~15% of windows)
            if (r.chance(0.24)) {
              sub.box(lib.woodDark, bx - winW / 2 - 0.33, sillY + winH / 2, wallT / 2 + 0.04, winW / 2 - 0.05, winH - 0.1, 0.05, 0.22);
              sub.box(lib.woodDark, bx + winW / 2 + 0.33, sillY + winH / 2, wallT / 2 + 0.04, winW / 2 - 0.05, winH - 0.1, 0.05, -0.22);
            }
            // Small cloth awning over some ground-floor street windows
            if (s === 0 && isFront && r.chance(0.28)) {
              const awn = new THREE.PlaneGeometry(winW + 0.55, 0.8, 6, 1);
              awn.rotateX(-Math.PI / 2 + 0.55);
              sub.add(getAwningMats()[r.int(0, 3)], awn, bx, lintelY + 0.18, wallT / 2 + 0.3);
            }
          } else if (state < 0.7) {
            // Closed wooden shutters
            sub.box(lib.woodDark, bx - winW / 4 + 0.02, sillY + winH / 2, -0.14, winW / 2 - 0.05, winH - 0.1, 0.04);
            sub.box(lib.woodDark, bx + winW / 4 - 0.02, sillY + winH / 2, -0.14, winW / 2 - 0.05, winH - 0.1, 0.04);
          } else if (state < 0.9) {
            // Boarded up: full plywood sheet + a skewed batten nailed over it
            sub.box(lib.wood, bx, sillY + winH / 2, -0.13, winW + 0.04, winH + 0.04, 0.035);
            sub.add(lib.woodDark, new THREE.BoxGeometry(winW + 0.26, 0.16, 0.03),
              bx, sillY + winH / 2 + r.spread(0.22), -0.1, 0, 0, 0.45 + r.spread(0.3));
          } // else: blown-out hole — the deep dark backing carries it
          // Reveal-occlusion frame hugging jambs + lintel
          sub.add(getRevealAOMat(), new THREE.PlaneGeometry(winW + 0.02, winH + 0.02),
            bx, sillY + winH / 2, -0.08);
          // Frame: protruding sill ledge + proud lintel + reveal-lining jambs
          sub.box(trimMat, bx, sillY - 0.045, 0.16, winW + 0.22, 0.09, 0.2);  // sill ledge sticks out
          sub.box(trimMat, bx, lintelY + 0.04, 0.15, winW + 0.14, 0.08, 0.14);
          sub.box(trimMat, bx - winW / 2 - 0.035, sillY + winH / 2, 0.02, 0.07, winH + 0.1, 0.34);
          sub.box(trimMat, bx + winW / 2 + 0.035, sillY + winH / 2, 0.02, 0.07, winH + 0.1, 0.34);
          // Weather streak bleeding down from EVERY sill (0.5-1m)
          {
            const dh = 0.5 + r() * 0.5;
            sub.add(getStreakMat(), new THREE.PlaneGeometry(winW * (0.5 + r() * 0.4), dh),
              bx + r.spread(0.18), sillY - 0.1 - dh / 2, wallT / 2 + 0.012);
          }
        } else {
          // Door bay on ground floor
          const doorW = 1.0, doorH = 2.2;
          if (isFront) frontFeatures.push({ x: bx, w: doorW });
          sub.box(wm, bx, doorH + (h - doorH) / 2, 0, winW, h - doorH, wallT);
          sub.box(wm, bx - winW / 2 + (winW - doorW) / 4, doorH / 2, 0, (winW - doorW) / 2, doorH, wallT);
          sub.box(wm, bx + winW / 2 - (winW - doorW) / 4, doorH / 2, 0, (winW - doorW) / 2, doorH, wallT);
          sub.box(lib.wood, bx, doorH / 2, -0.14, doorW, doorH, 0.06);
          sub.box(trimMat, bx, doorH + 0.05, 0.14, doorW + 0.2, 0.1, 0.16);
        }
      }
      // Floor cornice line
      if (s < stories - 1) {
        sub.box(trimMat, 0, y0 + h - 0.02, 0.07, faceW, 0.16, wallT * 0.5);
      }
    }
    return sub;
  };

  // Four facades: +Z front, -Z back, +X right, -X left
  const halfW = w / 2, halfD = d / 2;
  const facadePlace = (faceW, yaw, cx, cz, storefront, isFront = false) => {
    const sub = facade(faceW, storefront, isFront);
    for (const [mat, geos] of sub.map) {
      for (const g of geos) {
        g.rotateY(yaw);
        g.translate(cx, 0, cz);
        if (!B.map.has(mat)) B.map.set(mat, []);
        B.map.get(mat).push(g);
      }
    }
  };

  facadePlace(w, 0, 0, halfD - wallT / 2, !!opts.storefront, true);
  facadePlace(w, Math.PI, 0, -(halfD - wallT / 2), false);
  facadePlace(d, Math.PI / 2, halfW - wallT / 2, 0, false);
  facadePlace(d, -Math.PI / 2, -(halfW - wallT / 2), 0, false);

  // Corner columns to seal edges
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    B.box(wallMat, sx * (halfW - wallT / 2), H / 2, sz * (halfD - wallT / 2), wallT, H, wallT);
  }

  // Roof slab with a 0.3m overhang lip (casts a shadow line down the
  // facade) + parapet — segmented with varied heights and battle damage
  B.box(lib.concrete, 0, H + 0.09, 0, w + 0.6, 0.18, d + 0.6);
  const parapetSide = (len, yaw, cx, cz) => {
    let x = -len / 2;
    while (x < len / 2 - 0.1) {
      // Short choppy segments with a WIDE height spread (near-gaps, low
      // courses, tall pier stubs to 1.45m) + caps skipped on ~30% of tall
      // runs — the roofline breaks into a jagged skyline, not two rails
      const seg = Math.min(0.9 + r() * 2.5, len / 2 - x);
      const roll = r();
      const pp = roll < 0.2 ? 0.08 + r() * 0.16
        : roll < 0.72 ? 0.28 + r() * 0.5
          : 0.85 + r() * 0.6;
      const mid = x + seg / 2;
      const off = new THREE.Vector3(mid, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      B.box(parapetMat, cx + off.x, H + 0.18 + pp / 2, cz + off.z, yaw === 0 || Math.abs(yaw) === Math.PI ? seg : 0.22, pp, yaw === 0 || Math.abs(yaw) === Math.PI ? 0.22 : seg);
      if (pp > 0.3 && r.chance(0.68)) {
        B.box(trimMat, cx + off.x, H + 0.18 + pp + 0.03, cz + off.z, (yaw === 0 || Math.abs(yaw) === Math.PI ? seg : 0.28) + 0.04, 0.07, (yaw === 0 || Math.abs(yaw) === Math.PI ? 0.28 : seg) + 0.04);
      }
      x += seg;
    }
  };
  parapetSide(w, 0, 0, halfD - 0.11);
  parapetSide(w, 0, 0, -(halfD - 0.11));
  parapetSide(d, Math.PI / 2, halfW - 0.11, 0);
  parapetSide(d, Math.PI / 2, -(halfW - 0.11), 0);
  // Tall corner piers (stair-tower stubs) crowning 1-2 roof corners
  {
    const pcorners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const nP = r.int(1, 2);
    const st = r.int(0, 3);
    for (let i = 0; i < nP; i++) {
      const [sx, sz] = pcorners[(st + i * 2) % 4];
      const ph = 0.8 + r() * 0.65;
      B.box(parapetMat, sx * (halfW - 0.21), H + 0.18 + ph / 2, sz * (halfD - 0.21), 0.42, ph, 0.42);
      B.box(trimMat, sx * (halfW - 0.21), H + 0.18 + ph + 0.035, sz * (halfD - 0.21), 0.52, 0.07, 0.52);
    }
  }

  // Grounding grime skirt around the base. (Planes sit just OUTSIDE the
  // outer wall surface at halfD/halfW — the old wallT/2 offset buried them
  // inside the wall thickness where the depth test discarded them.)
  const skirtH = 0.55;
  for (const [sx, sy, px, pz] of [
    [w + 0.02, skirtH, 0, halfD + 0.012],
    [w + 0.02, skirtH, 0, -(halfD + 0.012)],
    [d + 0.02, skirtH, halfW + 0.012, 0],
    [d + 0.02, skirtH, -(halfW + 0.012), 0],
  ]) {
    const geo = new THREE.PlaneGeometry(sx, sy);
    B.add(getSkirtMat(), geo, px, skirtH / 2, pz, Math.abs(px) > Math.abs(pz) ? (px > 0 ? Math.PI / 2 : -Math.PI / 2) : (pz > 0 ? 0 : Math.PI));
  }

  // Water-stain band bleeding down from under the roof overhang
  const stainH = 0.85;
  for (const [sx, px, pz] of [
    [w + 0.02, 0, halfD + 0.014],
    [w + 0.02, 0, -(halfD + 0.014)],
    [d + 0.02, halfW + 0.014, 0],
    [d + 0.02, -(halfW + 0.014), 0],
  ]) {
    const geo = new THREE.PlaneGeometry(sx, stainH);
    B.add(getTopStainMat(), geo, px, H - stainH / 2 - 0.04, pz, Math.abs(px) > Math.abs(pz) ? (px > 0 ? Math.PI / 2 : -Math.PI / 2) : (pz > 0 ? 0 : Math.PI));
  }

  // Corner AO: gradient strips darkening the last ~0.5m of every facade
  // into its corner — the missing baked occlusion the flat lighting exposed
  {
    const aoW = 0.55;
    const zf = 0.016;
    // [yaw, zFlip, px, pz] — dark canvas edge (u=0) lands on the corner
    for (const [yaw, flip, px, pz] of [
      [0, true, halfW - aoW / 2, halfD + zf], [0, false, -(halfW - aoW / 2), halfD + zf],
      [Math.PI, false, halfW - aoW / 2, -(halfD + zf)], [Math.PI, true, -(halfW - aoW / 2), -(halfD + zf)],
      [Math.PI / 2, false, halfW + zf, halfD - aoW / 2], [Math.PI / 2, true, halfW + zf, -(halfD - aoW / 2)],
      [-Math.PI / 2, true, -(halfW + zf), halfD - aoW / 2], [-Math.PI / 2, false, -(halfW + zf), -(halfD - aoW / 2)],
    ]) {
      const geo = new THREE.PlaneGeometry(aoW, H - 0.02);
      if (flip) geo.rotateZ(Math.PI);
      geo.rotateY(yaw);
      B.add(getCornerAOMat(), geo, px, H / 2, pz);
    }
  }

  // Rebar stubs sprouting from unfinished column stubs at roof corners —
  // the iconic MEA "next storey someday" detail (merged into the bucket)
  {
    const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const nC = r.int(2, 3);
    const start = r.int(0, 3);
    for (let i = 0; i < nC; i++) {
      const [sx, sz] = corners[(start + i) % 4];
      const cxp = sx * (halfW - 0.26), czp = sz * (halfD - 0.26);
      const stubH = r.chance(0.55) ? 0.35 + r() * 0.3 : 0;
      if (stubH) B.box(lib.concrete, cxp, H + 0.18 + stubH / 2, czp, 0.32, stubH, 0.32);
      const nRod = r.int(3, 5);
      for (let k = 0; k < nRod; k++) {
        const len = 0.4 + r() * 0.45;
        const rod = new THREE.CylinderGeometry(0.013, 0.013, len, 5);
        B.add(getRebarMat(), rod,
          cxp + r.spread(0.11), H + 0.18 + stubH + len / 2 - 0.06, czp + r.spread(0.11),
          0, r.spread(0.12), r.spread(0.12));
      }
    }
  }

  // Roofline clutter, ALL merged into the per-building GeoBucket (round 7:
  // the old Group-based tank/antenna/dish spent ~14 draws per roof and
  // still hid below the parapet) — water tanks on leg stands, clustered
  // satellite dishes perched on the street parapet, lattice antenna masts,
  // roof condensers and a stair bulkhead, sized/placed so silhouettes
  // actually crest the roofline from street level.
  {
    const roofY = H + 0.18;
    const steel = getDishShared().armMat;
    const addTank = (tx, tz, ts, dark) => {
      const mat = dark ? getTankDarkMat() : lib.metalWhite;
      const legH = 0.48;
      for (const [lx, lz] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) {
        B.add(steel, new THREE.CylinderGeometry(0.034, 0.034, legH, 5),
          tx + lx * ts, roofY + legH / 2, tz + lz * ts);
      }
      const bodyH = 1.02 * ts, rad = 0.58 * ts;
      B.add(mat, new THREE.CylinderGeometry(rad, rad, bodyH, 12), tx, roofY + legH + bodyH / 2, tz);
      B.add(mat, new THREE.SphereGeometry(rad, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        tx, roofY + legH + bodyH, tz);
    };
    const addDish = (dx, dy, dz, yaw) => {
      const s = getDishShared();
      B.add(steel, new THREE.CylinderGeometry(0.024, 0.03, 0.52, 6), dx, dy + 0.26, dz);
      B.add(s.dishMat, s.dishGeo, dx, dy + 0.54, dz, yaw, Math.PI / 2 - 0.55);
      const feed = new THREE.CylinderGeometry(0.011, 0.011, 0.34, 5);
      feed.rotateX(-0.9);
      B.add(steel, feed, dx + Math.sin(yaw) * 0.14, dy + 0.57, dz + Math.cos(yaw) * 0.14, yaw);
    };
    const addMast = (mx, mz, mh) => {
      B.add(steel, new THREE.CylinderGeometry(0.02, 0.036, mh, 6), mx, roofY + mh / 2, mz);
      for (let k = 0; k < 3; k++) {
        const aw = 0.74 - k * 0.17;
        B.add(steel, new THREE.CylinderGeometry(0.01, 0.01, aw, 4),
          mx, roofY + mh - 0.26 - k * 0.34, mz, r.spread(0.5), 0, Math.PI / 2);
      }
    };
    // Stair bulkhead — the biggest silhouette breaker (55% of roofs)
    if (r.chance(0.55)) {
      const bw = 1.8 + r() * 0.8, bd = 1.6 + r() * 0.6, bh = 1.85 + r() * 0.5;
      const bx = r.spread(w * 0.2), bz = r.spread(d * 0.15);
      B.box(bandMat, bx, roofY + bh / 2, bz, bw, bh, bd);
      B.box(trimMat, bx, roofY + bh + 0.05, bz, bw + 0.22, 0.1, bd + 0.22);
      const ds = r.chance(0.5) ? 1 : -1; // dark doorway punched in one flank
      B.add(lib.darkInterior, new THREE.BoxGeometry(0.05, 1.6, 0.78),
        bx + ds * (bw / 2 + 0.01), roofY + 0.8, bz);
    }
    // Water tanks — one big (mixed white steel / black poly), maybe a runt
    if (r.chance(0.85)) {
      addTank(r.spread(w * 0.24), r.spread(d * 0.2), 0.9 + r() * 0.35, r.chance(0.45));
    }
    if (r.chance(0.35)) {
      addTank(r.spread(w * 0.3), r.spread(d * 0.26), 0.62 + r() * 0.2, r.chance(0.6));
    }
    // Satellite dishes crowd the STREET parapet so they crest the roofline
    const nDish = 1 + (r.chance(0.6) ? 1 : 0) + (r.chance(0.3) ? 1 : 0);
    for (let i = 0; i < nDish; i++) {
      const zs = r.chance(0.75) ? 1 : -1;
      addDish(r.spread(w * 0.38), roofY + 0.25 + r() * 0.4, zs * (halfD - 0.24), r.spread(0.9));
    }
    // Antenna masts — tall thin verticals against the sky
    if (r.chance(0.8)) addMast(r.spread(w * 0.32), r.spread(d * 0.3), 2.2 + r() * 2.2);
    if (r.chance(0.35)) addMast(r.spread(w * 0.34), r.spread(d * 0.32), 1.5 + r() * 1.2);
    // Roof condenser on a plinth near the front parapet
    if (r.chance(0.55)) {
      const ax = r.spread(w * 0.3), az = (r.chance(0.6) ? 1 : -1) * (halfD - 0.85);
      const ayaw = r.spread(3);
      B.box(lib.concrete, ax, roofY + 0.06, az, 0.7, 0.12, 0.5);
      B.add(lib.metalWhite, new THREE.BoxGeometry(0.85, 0.55, 0.42), ax, roofY + 0.4, az, ayaw);
      B.add(steel, new THREE.BoxGeometry(0.72, 0.4, 0.03),
        ax + Math.sin(ayaw) * 0.21, roofY + 0.42, az + Math.cos(ayaw) * 0.21, ayaw);
    }
    // Tarp draped over a parapet (merged like everything else)
    if (r.chance(0.5)) {
      const tGeo = buildRoofTarpGeo(r);
      const tMat = getTarpMats()[r.int(0, 2)];
      if (r.chance(0.6)) {
        const zs = r.chance(0.6) ? 1 : -1;
        B.add(tMat, tGeo, r.spread(w * 0.3), H + 0.42, zs * (halfD - 0.11), zs > 0 ? 0 : Math.PI);
      } else {
        const xs = r.chance(0.5) ? 1 : -1;
        B.add(tMat, tGeo, xs * (halfW - 0.11), H + 0.42, r.spread(d * 0.3), xs > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
  }

  B.build(group);

  // Balconies on upper floors (front)
  const balcSpots = [];
  if (stories > 1 && r.chance(0.75)) {
    const nBalc = r.int(1, 2);
    for (let i = 0; i < nBalc; i++) {
      const s = r.int(1, stories - 1);
      const y0 = GROUND_H + (s - 1) * STORY_H;
      const bx = r.spread(w * 0.28);
      balcSpots.push({ s, x: bx });
      const balc = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.95), lib.concreteDark);
      slab.position.set(0, 0, 0.45);
      balc.add(slab);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.6, metalness: 0.7 });
      for (let p = 0; p <= 6; p++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 6), railMat);
        post.position.set(-0.9 + p * 0.3, 0.48, 0.88);
        balc.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.05), railMat);
      rail.position.set(0, 0.9, 0.88);
      balc.add(rail);
      for (const side of [-1, 1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), railMat);
        sp.position.set(side * 0.92, 0.9, 0.44);
        balc.add(sp);
      }
      balc.position.set(bx, y0 + 0.9, halfD - wallT / 2 + 0.05);
      shadow(balc);
      group.add(balc);
    }
  }

  // Drain pipe
  if (r.chance(0.8)) {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 0.7, metalness: 0.4 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H - 0.2, 8), pipeMat);
    pipe.position.set(r.chance(0.5) ? halfW - 0.4 : -(halfW - 0.4), H / 2, halfD + 0.08);
    pipe.castShadow = true;
    group.add(pipe);
  }

  // AC units — roughly one per 2-3 window bays on upper floors, each with
  // a drip streak staining the wall below
  {
    const bays = Math.max(1, Math.round(w / 2.35));
    const bayW = w / bays;
    for (let s = 1; s < stories; s++) {
      const y0 = GROUND_H + (s - 1) * STORY_H;
      for (let b = 0; b < bays; b++) {
        if (!r.chance(0.4)) continue;
        const ax = -w / 2 + bayW * (b + 0.5) + r.spread(0.12);
        if (balcSpots.some((p) => p.s === s && Math.abs(p.x - ax) < 1.4)) continue;
        const acY = y0 + 0.62; // tucked just under the window sill
        const ac = buildACUnit();
        ac.position.set(ax, acY, halfD + 0.18);
        ac.rotation.z = r.spread(0.04);
        group.add(ac);
        const dripH = 0.9 + r() * 0.9;
        const drip = new THREE.Mesh(
          new THREE.PlaneGeometry(0.42 + r() * 0.2, dripH), getStreakMat());
        drip.position.set(ax + r.spread(0.08), acY - 0.28 - dripH / 2, halfD + 0.014);
        drip.renderOrder = 2;
        drip.castShadow = false;
        group.add(drip);
      }
    }
  }

  // Shop sign above storefront
  if (opts.storefront && opts.signText) {
    const sign = buildShopSign(opts.signText, Math.min(5.4, w * 0.5), 0.85,
      ['#7a2c20', '#274a42', '#6a5220', '#31404f'][r.int(0, 3)]);
    sign.position.set(0, GROUND_H - 0.55, halfD + 0.12);
    group.add(sign);
    // Awning
    if (r.chance(0.7)) {
      const awn = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.6, w * 0.52), 1.35, 8, 1), getAwningMats()[r.int(0, 3)]);
      const pa = awn.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i);
        pa.setZ(i, Math.sin((x + 10) * 4) * 0.03);
      }
      awn.geometry.computeVertexNormals();
      awn.rotation.x = -Math.PI / 2 + 0.5;
      awn.position.set(0, GROUND_H - 1.05, halfD + 0.62);
      awn.castShadow = true;
      group.add(awn);
    }
  }

  // Street posters — pasted at eye level (y ~1.2-2.0), clustered against
  // the walls flanking doorways/shutters, spacing irregular, some pasted
  // half over each other and peeling (the mats bake torn corners). No more
  // regular one-per-pier column marching down the frontage.
  {
    const pms = getPosterMats();
    const bays = Math.max(1, Math.round(w / 2.35));
    const bayW = w / bays;
    // Fall back to a random pier if the frontage exposed no opening
    const anchors = frontFeatures.length
      ? frontFeatures
      : (bays > 1 ? [{ x: -w / 2 + bayW * r.int(1, bays - 1), w: 0.7 }] : []);
    const nClust = anchors.length ? 1 + ((w >= 12 && r.chance(0.6)) ? 1 : 0) : 0;
    for (let ci = 0; ci < nClust; ci++) {
      const f = anchors[r.int(0, anchors.length - 1)];
      const side = r.chance(0.5) ? -1 : 1;
      let px = f.x + side * (f.w / 2 + 0.45 + r() * 0.4);
      const n = 1 + (r.chance(0.55) ? 1 : 0) + (r.chance(0.25) ? 1 : 0);
      for (let i = 0; i < n; i++) {
        if (Math.abs(px) > w / 2 - 0.65) break;
        if (opts.storefront && Math.abs(px) < Math.min(w - 2.4, 5.2) / 2 + 0.38) {
          px += side * 0.55;
          continue;
        }
        const pw = 0.55 + r() * 0.15, ph = 0.78 + r() * 0.18;
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pms[r.int(0, pms.length - 1)]);
        poster.position.set(px + r.spread(0.06), 1.6 + r.spread(0.24), halfD + 0.012 + ci * 0.001 + i * 0.0022);
        poster.rotation.z = r.spread(0.07);
        poster.renderOrder = 2;
        poster.receiveShadow = true;
        group.add(poster);
        // next one either pastes half over this one (peeling stack) or
        // skips an irregular gap along the wall
        px += side * (r.chance(0.4) ? pw * (0.4 + r() * 0.25) : pw + 0.2 + r() * 0.6);
      }
    }
  }

  // Spray-tag graffiti low on the ground-floor walls (~60% of frontages),
  // biased beside the same doorway/shutter anchors people actually tag
  if (r.chance(0.6)) {
    const gms = getGraffitiMats();
    const bays = Math.max(1, Math.round(w / 2.35));
    const bayW = w / bays;
    const f = frontFeatures.length ? frontFeatures[r.int(0, frontFeatures.length - 1)] : null;
    const gx = f
      ? f.x + (r.chance(0.5) ? -1 : 1) * (f.w / 2 + 0.95 + r() * 0.8)
      : (bays > 1 ? -w / 2 + bayW * r.int(1, bays - 1) : 0) + r.spread(0.3);
    const blocked = opts.storefront && Math.abs(gx) < Math.min(w - 2.4, 5.2) / 2 + 0.7;
    if (!blocked && Math.abs(gx) < w / 2 - 0.9) {
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.45 + r() * 0.5, 0.75 + r() * 0.25), gms[r.int(0, gms.length - 1)]);
      tag.position.set(gx, 1.0 + r() * 0.45, halfD + 0.0135);
      tag.rotation.z = r.spread(0.04);
      tag.renderOrder = 2;
      tag.receiveShadow = true;
      group.add(tag);
    }
  }

  // Collision proxy: full footprint
  collProxy(group, 0, H / 2, 0, w, H, d);
  group.userData.height = H;
  group.userData.footprint = [w, d];
  return group;
}

/** Ruined building: broken walls with jagged tops, interior rubble. */
export function buildRuinedBuilding(opts = {}) {
  const lib = getMaterialLib();
  const r = makeRNG((opts.seed ?? 2) * 3313 + 5);
  const w = opts.w ?? 12, d = opts.d ?? 10;
  const group = new THREE.Group();
  const B = new GeoBucket();
  const wallMat = lib[WALL_STYLES[(opts.styleIdx ?? 0) % WALL_STYLES.length]];
  const wallT = 0.42;
  const maxH = opts.h ?? 6.5;

  // Jagged walls made from vertical strips
  const wall = (len, yaw, cx, cz, gapChance = 0.22) => {
    const strips = Math.floor(len / 0.85);
    const sw = len / strips;
    let hPrev = maxH * (0.4 + r() * 0.6);
    for (let i = 0; i < strips; i++) {
      if (r.chance(gapChance) && i > 1 && i < strips - 2) { hPrev = maxH * (0.15 + r() * 0.3); continue; }
      let h = hPrev + r.spread(1.1);
      h = Math.max(1.1, Math.min(maxH, h));
      hPrev = h;
      const x = -len / 2 + sw * (i + 0.5);
      const geo = new THREE.BoxGeometry(sw + 0.02, h, wallT);
      scaleBoxUVs(geo, sw + 0.02, h, wallT, 0.3, 0.3);
      geo.rotateY(yaw);
      const off = new THREE.Vector3(x, h / 2, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      geo.translate(cx + off.x, off.y, cz + off.z);
      if (!B.map.has(wallMat)) B.map.set(wallMat, []);
      B.map.get(wallMat).push(geo);
    }
  };

  wall(w, 0, 0, d / 2 - wallT / 2, 0.3);
  wall(w, 0, 0, -(d / 2 - wallT / 2), 0.18);
  wall(d, Math.PI / 2, w / 2 - wallT / 2, 0, 0.24);
  wall(d, Math.PI / 2, -(w / 2 - wallT / 2), 0, 0.35);
  B.build(group);

  // Collapsed floor slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.18, d * 0.5), lib.concrete);
  slab.position.set(w * 0.1, 1.5, -d * 0.12);
  slab.rotation.z = 0.38;
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);

  // Rubble inside and spilling out front
  const rub1 = buildRubblePile(Math.min(w, d) * 0.32, 1.3, (opts.seed ?? 2) * 3 + 1);
  rub1.position.set(0, 0, 0);
  group.add(rub1);
  const rub2 = buildRubblePile(2.2, 0.8, (opts.seed ?? 2) * 5 + 2);
  rub2.position.set(w * 0.2, 0, d / 2 + 1.2);
  group.add(rub2);

  // Colliders: perimeter walls + interior rubble mound
  collProxy(group, 0, 2, d / 2 - wallT / 2, w, 4, wallT);
  collProxy(group, 0, 2, -(d / 2 - wallT / 2), w, 4, wallT);
  collProxy(group, w / 2 - wallT / 2, 2, 0, wallT, 4, d);
  collProxy(group, -(w / 2 - wallT / 2), 2, 0, wallT, 4, d);
  collProxy(group, 0, 0.5, 0, w * 0.5, 1, d * 0.5);
  group.userData.height = maxH;
  return group;
}

/** Compound wall segment with gate (map boundary flavor). */
export function buildCompoundWall(len = 10, h = 2.6, styleIdx = 0) {
  const lib = getMaterialLib();
  const group = new THREE.Group();
  const wallMat = lib[WALL_STYLES[styleIdx % WALL_STYLES.length]];
  const wallGeo = scaleBoxUVs(new THREE.BoxGeometry(len, h, 0.4), len, h, 0.4, 0.3, 0.3);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = h / 2;
  group.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.12, 0.55), lib.concreteDark);
  cap.position.y = h + 0.06;
  group.add(cap);
  shadow(group);
  collProxy(group, 0, h / 2, 0, len, h + 0.4, 0.5);
  return group;
}
