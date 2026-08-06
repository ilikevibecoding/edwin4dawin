// Three fictionalised interceptor batteries. Each has a distinct silhouette,
// moving launcher hardware, status lighting, heat discolouration, decals, cables
// and its own launch signature. Gameplay state (prep / ready / reload / expended)
// lives here too.
//
// Every launcher is kit-bashed from primitives and then merged down to a handful
// of meshes: one per material per animated node. Repeated parts (canister covers)
// are instanced. Every stencil, hazard stripe, scorch and stain in this file is
// packed into a single shared canvas atlas so all markings on a vehicle cost one
// draw call.

import * as THREE from 'three';
import { BATTERIES, EMPLACEMENTS } from './config.js';
import { BATTERY_STATE, bus, state } from './state.js';
import { materials, std, lamp, applyAtmosphere } from './util/materials.js';
import {
  chamferBox,
  mergeParts,
  transform,
  cylinder,
  hydraulicRam,
  ladder,
  handrail,
  trussSegment,
  cableGeometry,
  pathTube,
  latheProfile,
  ribbedTube,
  boltRow,
  corrugatedPanel,
} from './util/geom.js';
import {
  stencilDecal,
  warningStripes,
  heatDiscolorMap,
  sootMap,
  scorchDecalTexture,
  paintedMetalMaps,
  treadTexture,
  makeCanvas,
  finishTexture,
} from './util/textures.js';
import { RNG } from './util/rng.js';

const DEG = Math.PI / 180;
const STENCIL_FONT = 'bold 62px "Arial Narrow", Impact, sans-serif';
const BIG_FONT = 'bold 118px "Arial Narrow", Impact, sans-serif';

/* ========================================================== marking atlas == */

/**
 * One transparent canvas holding every stencil, hazard stripe, gauge face,
 * tread pattern, scorch and soot stain used by the launchers. Quads index into
 * it with custom UVs, so all markings on a vehicle merge into a single mesh.
 */
let ATLAS = null;

function drawStencil(lines, opts) {
  return (ctx, w, h) => {
    const tex = stencilDecal(lines, { w: Math.round(w), h: Math.round(h), font: STENCIL_FONT, wear: 0.4, ...opts });
    ctx.drawImage(tex.image, 0, 0, w, h);
  };
}

function drawImageCell(getTexture) {
  return (ctx, w, h) => ctx.drawImage(getTexture().image, 0, 0, w, h);
}

/** Soot wash: sootMap luminance becomes opacity, fading downward and at the edges. */
function drawStain(ctx, w, h) {
  const S = 256;
  const tmp = makeCanvas(S, S);
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(sootMap(S).image, 0, 0, S, S);
  const img = tc.getImageData(0, 0, S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    const fade = Math.pow(1 - y / (S - 1), 0.75);
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const edge = Math.min(1, Math.min(x, S - 1 - x) / 34);
      d[i] = 26;
      d[i + 1] = 24;
      d[i + 2] = 22;
      d[i + 3] = Math.min(255, lum * 4.6) * fade * edge;
    }
  }
  tc.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0, w, h);
}

/** Heat-discoloured wash for surfaces the plume licks across. */
function drawHeatBand(ctx, w, h) {
  const S = 256;
  const tmp = makeCanvas(S, S);
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(heatDiscolorMap(S).image, 0, 0, S, S);
  const img = tc.getImageData(0, 0, S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const dx = (x / (S - 1) - 0.5) * 2;
      const dy = (y / (S - 1) - 0.5) * 2;
      const k = Math.max(0, 1 - Math.hypot(dx, dy));
      d[i + 3] = Math.pow(k, 0.8) * 235;
    }
  }
  tc.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0, w, h);
}

/** Raised diamond tread plate, drawn as a light/dark relief decal. */
function drawTread(ctx, w, h) {
  const n = 5;
  const cw = w / n;
  const ch = h / n;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(120,124,128,0.20)';
  ctx.fillRect(0, 0, w, h);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cx = (c + 0.5) * cw;
      const cy = (r + 0.5) * ch;
      const ang = (r + c) % 2 ? 0.6 : -0.6;
      for (const [off, col] of [[2.5, 'rgba(12,12,12,0.5)'], [0, 'rgba(226,230,234,0.55)']]) {
        ctx.save();
        ctx.translate(cx + off, cy + off);
        ctx.rotate(ang);
        ctx.fillStyle = col;
        ctx.fillRect(-cw * 0.30, -ch * 0.075, cw * 0.6, ch * 0.15);
        ctx.restore();
      }
    }
  }
}

/** Instrument faces for equipment lockers and power units. */
function drawDials(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    const cx = w * (0.2 + i * 0.3);
    const cy = h * 0.5;
    const r = Math.min(w * 0.12, h * 0.38);
    ctx.fillStyle = 'rgba(24,26,26,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(216,212,196,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,28,0.9)';
    ctx.lineWidth = Math.max(1, r * 0.07);
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * 0.75 + (k / 8) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
      ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
      ctx.stroke();
    }
    const na = Math.PI * 0.75 + (0.28 + i * 0.22) * Math.PI * 1.5;
    ctx.strokeStyle = i === 2 ? 'rgba(170,40,30,0.95)' : 'rgba(28,28,26,0.95)';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * r * 0.78, cy + Math.sin(na) * r * 0.78);
    ctx.stroke();
  }
}

const ATLAS_CELLS = [
  // tall cells first so the shelf packer stays tight
  { name: 'scorch', w: 256, h: 256, draw: drawImageCell(() => scorchDecalTexture(256, 9)) },
  { name: 'scorch2', w: 256, h: 256, draw: drawImageCell(() => scorchDecalTexture(256, 23)) },
  { name: 'stain', w: 256, h: 256, draw: drawStain },
  { name: 'tread', w: 256, h: 256, draw: drawTread },
  { name: 'heat', w: 256, h: 128, draw: drawHeatBand },
  { name: 'dials', w: 256, h: 128, draw: drawDials },
  { name: 'caution', w: 384, h: 128, draw: drawStencil(['CAUTION', 'BLAST HAZARD'], { color: '#e6cf68' }) },
  { name: 'cryo', w: 384, h: 128, draw: drawStencil(['CRYO SERVICE', 'KEEP CLEAR'], { color: '#bfe3ef' }) },

  { name: 'gpower', w: 384, h: 128, draw: drawStencil(['GROUND POWER', 'BUS A'], { color: '#e6cf68' }) },
  { name: 'p_name', w: 512, h: 180, draw: drawStencil(['HAWKEYE 1', 'LAUNCH STATION'], { color: '#e8e2d2' }) },
  { name: 't_name', w: 512, h: 180, draw: drawStencil(['LONGVIEW 2', 'HI-ALT LAUNCHER'], { color: '#efe6cf' }) },
  { name: 's_name', w: 512, h: 180, draw: drawStencil(['IRONWOOD 3', 'LONG-RANGE TEST'], { color: '#f0e6d0' }) },

  // Single-line versions, sized for the long flat flanks where a two-line
  // block would be illegible from more than a few metres.
  { name: 'p_big', w: 1024, h: 176, draw: drawStencil(['HAWKEYE 1'], { color: '#e8e2d2', font: BIG_FONT }) },
  { name: 't_big', w: 1024, h: 176, draw: drawStencil(['LONGVIEW 2'], { color: '#efe6cf', font: BIG_FONT }) },
  { name: 's_big', w: 1024, h: 176, draw: drawStencil(['IRONWOOD 3'], { color: '#f2e8d2', font: BIG_FONT }) },

  { name: 's_test', w: 512, h: 180, draw: drawStencil(['TEST ARTICLE', 'RANGE USE ONLY'], { color: '#e8a24c' }) },
  { name: 's_testlong', w: 768, h: 160, draw: drawStencil(['TEST ARTICLE — RANGE USE ONLY'], { color: '#e8a24c', font: 'bold 74px "Arial Narrow", Impact, sans-serif' }) },
  { name: 'p_unit', w: 256, h: 96, draw: drawStencil(['LS-04'], { color: '#ded7c4' }) },
  { name: 't_unit', w: 256, h: 96, draw: drawStencil(['VEH 07'], { color: '#ded7c4' }) },

  { name: 'p_pwr', w: 256, h: 96, draw: drawStencil(['POWER UNIT'], { color: '#ded7c4', font: 'bold 44px "Arial Narrow", Impact, sans-serif' }) },
  { name: 'p_rd1', w: 256, h: 96, draw: drawStencil(['RD-1'], { color: '#dfd7c2' }) },
  { name: 'p_rd2', w: 256, h: 96, draw: drawStencil(['RD-2'], { color: '#dfd7c2' }) },
  { name: 'p_rd3', w: 256, h: 96, draw: drawStencil(['RD-3'], { color: '#dfd7c2' }) },
  { name: 'p_rd4', w: 256, h: 96, draw: drawStencil(['RD-4'], { color: '#dfd7c2' }) },
  { name: 's_rd1', w: 384, h: 96, draw: drawStencil(['ROUND 1'], { color: '#e9dfc8' }) },
  { name: 's_rd2', w: 384, h: 96, draw: drawStencil(['ROUND 2'], { color: '#e9dfc8' }) },

  { name: 't_num14', w: 512, h: 96, draw: drawStencil(['1     2     3     4'], { color: '#e2dac6' }) },
  { name: 't_num58', w: 512, h: 96, draw: drawStencil(['5     6     7     8'], { color: '#e2dac6' }) },
  { name: 't_defl', w: 384, h: 96, draw: drawStencil(['BLAST DEFLECTOR'], { color: '#e6cf68', font: 'bold 44px "Arial Narrow", Impact, sans-serif' }) },
  { name: 'lift', w: 256, h: 64, draw: drawStencil(['LIFT POINT'], { color: '#ded7c4', font: 'bold 36px "Arial Narrow", Impact, sans-serif' }) },
  { name: 'nostep', w: 256, h: 64, draw: drawStencil(['NO STEP'], { color: '#ded7c4', font: 'bold 36px "Arial Narrow", Impact, sans-serif' }) },
  { name: 'gnd', w: 160, h: 64, draw: drawStencil(['GND'], { color: '#ded7c4', font: 'bold 36px "Arial Narrow", Impact, sans-serif' }) },
  { name: 'stripes', w: 512, h: 64, draw: drawImageCell(() => warningStripes(512, 64)) },
];

function atlas() {
  if (ATLAS) return ATLAS;
  const W = 2048;
  const H = 1536;
  const PAD = 10;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, W, H);
  const cells = {};
  let cx = 0;
  let cy = 0;
  let rowH = 0;
  for (const c of ATLAS_CELLS) {
    if (cx + c.w > W) {
      cx = 0;
      cy += rowH + PAD;
      rowH = 0;
    }
    ctx.save();
    ctx.translate(cx, cy);
    c.draw(ctx, c.w, c.h);
    ctx.restore();
    cells[c.name] = { u0: cx / W, u1: (cx + c.w) / W, v0: 1 - (cy + c.h) / H, v1: 1 - cy / H };
    cx += c.w + PAD;
    rowH = Math.max(rowH, c.h);
  }
  const texture = finishTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  const material = applyAtmosphere(
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.015,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      roughness: 0.86,
      metalness: 0.08,
    })
  );
  ATLAS = {
    cells,
    texture,
    material,
    /** Plane of w x h metres whose UVs address one atlas cell. */
    quad(name, w, h, ws = 1, hs = 1) {
      const c = cells[name];
      const g = new THREE.PlaneGeometry(w, h, ws, hs);
      if (c) {
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, c.u0 + uv.getX(i) * (c.u1 - c.u0), c.v0 + uv.getY(i) * (c.v1 - c.v0));
        }
        uv.needsUpdate = true;
      }
      return g;
    },
  };
  return ATLAS;
}

/* ============================================================ extra mats == */

let EXTRA = null;

/** Clone a cached texture so this file can tile it without touching the library. */
function tiled(tex, n, m = n) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(n, m);
  return t;
}

function tiledMaps(maps, n) {
  const out = {};
  for (const [k, v] of Object.entries(maps)) out[k] = tiled(v, n);
  return out;
}

function extras() {
  if (EXTRA) return EXTRA;
  EXTRA = {
    // Sprayed-on cryogenic line lagging: chalky, almost non-metallic.
    insulation: std({ color: 0xd8d5cb, roughness: 0.94, metalness: 0.02, envMapIntensity: 0.5 }),
    /**
     * Rocket-blasted plate. The shared heatMetal is a full temper-colour ramp,
     * which across a two-metre deflector reads as an oil slick; soot over dull
     * steel is what a blast pad actually looks like.
     */
    scorched: std({ ...tiledMaps(paintedMetalMaps(512, '#6b665e', { rust: 0.6, streaks: 26, scratches: 20 }), 0.7), color: 0xffffff, roughness: 0.88, metalness: 0.18, envMapIntensity: 0.45, normalScale: new THREE.Vector2(0.6, 0.6) }),
    /** Temper colours survive only right at a nozzle, so keep the band tight. */
    tempered: std({ map: tiled(heatDiscolorMap(256), 4), color: 0xa8a199, roughness: 0.62, metalness: 0.4, envMapIntensity: 0.7 }),
    /**
     * Clean structural paint. The shared darkMetal carries enough rust mottle
     * that a two-metre flat panel of it reads as poured concrete, which is
     * wrong for chassis rails and load frames.
     */
    chassis: std({ ...tiledMaps(paintedMetalMaps(512, '#5c6154', { rust: 0.22, streaks: 14 }), 0.5), color: 0xffffff, roughness: 0.64, metalness: 0.2, envMapIntensity: 0.85, normalScale: new THREE.Vector2(0.45, 0.45) }),
    // Rounds are painted a stop lighter than the vehicle that carries them so
    // the canisters separate from the erector instead of merging into it.
    canister: std({ ...tiledMaps(paintedMetalMaps(512, '#929a7a', { rust: 0.2, streaks: 10 }), 0.5), color: 0xffffff, roughness: 0.68, metalness: 0.12, envMapIntensity: 0.8, normalScale: new THREE.Vector2(0.5, 0.5) }),
    // LONGVIEW inverts HAWKEYE's scheme: sand-painted space frame around dark
    // olive tubes, so the two vehicles never read the same way at distance.
    tube: std({ ...tiledMaps(paintedMetalMaps(512, '#4a4f3b', { rust: 0.3, streaks: 16 }), 0.5), color: 0xffffff, roughness: 0.62, metalness: 0.2, envMapIntensity: 0.8, normalScale: new THREE.Vector2(0.5, 0.5) }),
    // SENTINEL is a range vehicle: graphite structure, bone-white rounds and
    // orange hazard furniture, so it never gets confused with the two
    // camouflaged tactical launchers. Keep the mottle low — a grey with heavy
    // rust splotch reads as poured concrete at trailer scale.
    slate: std({ ...tiledMaps(paintedMetalMaps(512, '#4f5763', { rust: 0.05, streaks: 8, scratches: 22 }), 0.5), color: 0xffffff, roughness: 0.55, metalness: 0.26, envMapIntensity: 1.0, normalScale: new THREE.Vector2(0.25, 0.25) }),
    // Flat range paint. A cylinder two metres across picks up a broad sky
    // reflection, and anything glossier than this reads as white plastic.
    bone: std({ ...tiledMaps(paintedMetalMaps(512, '#bdb7a6', { rust: 0.16, streaks: 10 }), 0.5), color: 0xffffff, roughness: 0.88, metalness: 0.04, envMapIntensity: 0.35, normalScale: new THREE.Vector2(0.6, 0.6) }),
    /**
     * Range-article banding. A flat orange coat on a 1.7 m cylinder collapses
     * into a single copper-looking specular sweep, so the band carries actual
     * chevrons and sits at paint roughness with almost no environment pickup.
     */
    hazard: std({ map: tiled(warningStripes(512, 128, '#c9661f', '#2b2723'), 4, 1), color: 0xffffff, roughness: 0.84, metalness: 0.03, envMapIntensity: 0.28 }),
    /**
     * Ram rod chrome. The shared `steel` is mirror-smooth, and on a 5 cm rod
     * that collapses the sun into a single blown-out facet running the whole
     * length — it reads as a light leak, not a polished cylinder.
     */
    rod: std({ color: 0xaab0b6, roughness: 0.46, metalness: 0.8, envMapIntensity: 0.6 }),
    // The shared rubber map is nearly black, which turns every wheel into a
    // silhouette hole; keep its tread relief but sit the albedo where lit
    // rubber actually lands.
    tyre: std({ normalMap: tiled(treadTexture(256).normalMap, 2), color: 0x3c3d3e, roughness: 0.93, metalness: 0.0, envMapIntensity: 0.45, normalScale: new THREE.Vector2(0.9, 0.9) }),
    /**
     * Hot-dip galvanising is a dull spangled grey. The shared `galv` is a
     * near-mirror brushed steel: on a lattice of 5 cm tubes every member
     * collapses into a blown-out white line and the structure stops reading as
     * structure. Same hue, a third of the specular.
     */
    galv: std({ ...tiledMaps(paintedMetalMaps(512, '#767d85', { rust: 0.1, streaks: 12, scratches: 22 }), 0.6), color: 0xffffff, roughness: 0.7, metalness: 0.3, envMapIntensity: 0.45, normalScale: new THREE.Vector2(0.35, 0.35) }),
  };
  for (const [k, m] of Object.entries(EXTRA)) m.name = k;
  return EXTRA;
}

let LIB = null;

/**
 * Material lookup for every kit in this file: the shared library with the
 * launcher-specific finishes layered over it. Overriding here rather than in
 * materials.js keeps the retune to the vehicles.
 */
function lib() {
  if (!LIB) LIB = { ...materials(), ...extras() };
  return LIB;
}

/* ================================================================= kit bag = */

const compose = (M, tr) => M.clone().multiply(transform(tr));

/**
 * Chamfered box whose bevel resolution follows its size. Sub-metre detail
 * boxes get a single-facet chamfer — 28 triangles instead of 60, and
 * indistinguishable at arm's length — which halves the cost of the greeble
 * layer that covers all three vehicles.
 */
function cbox(w, h, d, c = 0.03) {
  return chamferBox(w, h, d, c, Math.max(w, h, d) < 0.9 ? 0 : 1);
}

/** Cylinder spanning two points, for struts, braces and lattice members. */
function strutPart(a, b, r, seg = 5) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = new THREE.Vector3().subVectors(B, A);
  const len = Math.max(1e-4, d.length());
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.multiplyScalar(1 / len)),
    new THREE.Vector3(1, 1, 1)
  );
  return { geometry: cylinder(r, r, len, seg), matrix: m };
}

/**
 * Scattered surface greebles for a panel face, facing +Z. Same idea as the
 * shared `greebleField`, but routed through `cbox` so a wall of 5 cm boxes
 * costs 28 triangles apiece instead of 60.
 */
function greebles(w, h, rng, { count = 12, maxSize = 0.2, depth = 0.06 } = {}) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const sw = rng.range(0.05, maxSize);
    const sh = rng.range(0.04, maxSize * 0.7);
    const sd = rng.range(depth * 0.4, depth);
    parts.push({
      geometry: cbox(sw, sh, sd, Math.min(sw, sh) * 0.12),
      matrix: transform({ pos: [rng.range(-w / 2 + sw, w / 2 - sw), rng.range(-h / 2 + sh, h / 2 - sh), sd / 2] }),
    });
  }
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return g;
}

/** Turn a closed shell into an interior surface — visible and lit from inside. */
function insideOut(geo) {
  const g = geo.clone();
  g.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  n.needsUpdate = true;
  return g;
}

/**
 * Accumulates geometry into per-material buckets, then emits one merged mesh
 * per bucket. Keys are either names in the shared material library or a
 * material instance.
 */
class Kit {
  constructor(lib) {
    this.lib = lib;
    this.buckets = new Map();
    this.owned = new Set();
  }

  bucket(key) {
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = []));
    return b;
  }

  add(key, geometry, tr) {
    this.bucket(key).push({ geometry, matrix: tr === undefined ? undefined : tr.isMatrix4 ? tr : transform(tr) });
    this.owned.add(geometry);
    return this;
  }

  box(key, w, h, d, tr, c = 0.025) {
    return this.add(key, cbox(w, h, d, c), tr);
  }

  cyl(key, r, h, tr, seg = 10, r2) {
    return this.add(key, cylinder(r, r2 === undefined ? r : r2, h, seg), tr);
  }

  strut(key, a, b, r, seg = 5) {
    const p = strutPart(a, b, r, seg);
    this.owned.add(p.geometry);
    this.bucket(key).push(p);
    return this;
  }

  torus(key, r, tube, tr, radial = 5, tubular = 12, arc = Math.PI * 2) {
    return this.add(key, new THREE.TorusGeometry(r, tube, radial, tubular, arc), tr);
  }

  decal(name, w, h, tr) {
    const A = atlas();
    return this.add(A.material, A.quad(name, w, h), tr);
  }

  /**
   * Decal bent around a cylinder of radius r, wrapping in the quad's local Y.
   * A flat quad tall enough to be legible on a canister flank cuts a chord
   * through the skin and loses its top and bottom edges inside the geometry.
   */
  wrapDecal(name, w, h, r, tr) {
    const A = atlas();
    const g = A.quad(name, w, h, 1, Math.max(2, Math.min(10, Math.ceil(h / (r * 0.12)))));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = p.getY(i) / r;
      p.setY(i, r * Math.sin(a));
      p.setZ(i, r * Math.cos(a) - r);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return this.add(A.material, g, tr);
  }

  emit(parent, opts = {}) {
    const out = new Map();
    for (const [key, parts] of this.buckets) {
      if (!parts.length) continue;
      const material = typeof key === 'string' ? this.lib[key] : key;
      const mesh = new THREE.Mesh(mergeParts(parts), material);
      mesh.name = typeof key === 'string' ? key : material.name || 'kit';
      // Decal and glass planes must never cast: their shadows would print
      // rectangles onto the surfaces they are lying on.
      mesh.castShadow = opts.cast !== false && !material.transparent;
      mesh.receiveShadow = opts.receive !== false;
      parent.add(mesh);
      out.set(key, mesh);
    }
    for (const g of this.owned) g.dispose();
    this.buckets.clear();
    this.owned.clear();
    return out;
  }
}

/* =========================================================== sub-assemblies */

/** Bolt heads spaced along a seam, standing proud along `normal`. */
function addBoltLine(kit, key, from, to, count, normal = [0, 1, 0], r = 0.021, h = 0.016) {
  const a = new THREE.Vector3(from[0], from[1], from[2]);
  const b = new THREE.Vector3(to[0], to[1], to[2]);
  const geo = cylinder(r, r * 0.86, h, 5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(normal[0], normal[1], normal[2]).normalize()
  );
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    kit.bucket(key).push({ geometry: geo, matrix: new THREE.Matrix4().compose(p, q, one) });
  }
  kit.owned.add(geo);
}

/** Ring of bolt heads around a circular flange facing +Z at `pos`. */
function addBoltRing(kit, key, pos, radius, count, M, r = 0.022, h = 0.018) {
  const geo = cylinder(r, r * 0.86, h, 5);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const tr = { pos: [pos[0] + Math.cos(a) * radius, pos[1] + Math.sin(a) * radius, pos[2]], rot: [Math.PI / 2, 0, 0] };
    kit.bucket(key).push({ geometry: geo, matrix: M ? compose(M, tr) : transform(tr) });
  }
  kit.owned.add(geo);
}

/**
 * Bare tyre carcass: tread barrel plus shouldered sidewalls, axis along X.
 * The shared `wheel()` helper bakes in a hub and eight nuts that every caller
 * here immediately buries under its own rim face, so this drops them and
 * spends the saved triangles on the shoulder radius instead.
 */
function tyreGeo(r, width) {
  const hw = width / 2;
  const sw = r * 0.86;
  const rot = [0, 0, Math.PI / 2];
  const parts = [
    { geometry: cylinder(r, r, width * 0.78, 24, true), matrix: transform({ rot }) },
    { geometry: cylinder(sw, r, width * 0.11, 24, true), matrix: transform({ pos: [hw * 0.89, 0, 0], rot }) },
    { geometry: cylinder(r, sw, width * 0.11, 24, true), matrix: transform({ pos: [-hw * 0.89, 0, 0], rot }) },
  ];
  for (const s of [-1, 1]) {
    parts.push({ geometry: new THREE.CircleGeometry(sw, 18), matrix: transform({ pos: [s * hw, 0, 0], rot: [0, s * Math.PI * 0.5, 0] }) });
  }
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return g;
}

/**
 * Road wheel with a dished rim face. `rimKey` should be the vehicle's own body
 * paint: a bare galvanised dish is the brightest thing on the whole model in
 * sunlight and turns every wheel into a headlight.
 */
function addRoadWheel(kit, rimKey, { pos, r = 0.8, width = 0.5, side = 1, lugs = 8 }) {
  const [x, y, z] = pos;
  const rot = [0, 0, Math.PI / 2];
  kit.add(extras().tyre, tyreGeo(r, width), { pos });
  const f = x + side * width * 0.5;
  kit.cyl(rimKey, r * 0.54, 0.07, { pos: [f + side * 0.02, y, z], rot }, 20);
  kit.cyl(rimKey, r * 0.26, 0.12, { pos: [f + side * 0.05, y, z], rot }, 14);
  kit.cyl('darkMetal', r * 0.13, 0.06, { pos: [f + side * 0.1, y, z], rot }, 10);
  const bolt = cylinder(r * 0.042, r * 0.034, 0.045, 5);
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    kit.bucket('galv').push({
      geometry: bolt,
      matrix: transform({ pos: [f + side * 0.055, y + Math.sin(a) * r * 0.37, z + Math.cos(a) * r * 0.37], rot }),
    });
  }
  kit.owned.add(bolt);
}

/** Faceted mudguard arching over a wheel; the axle runs along X. */
function addFender(kit, key, { pos, r = 0.8, width = 0.6, arc = 2.4, segs = 7, thick = 0.05, flap = 0 }) {
  const step = arc / segs;
  const chord = 2 * r * Math.sin(step / 2) * 1.04;
  for (let i = 0; i < segs; i++) {
    const a = -arc / 2 + (i + 0.5) * step;
    kit.box(key, width, thick, chord, { pos: [pos[0], pos[1] + Math.cos(a) * r, pos[2] + Math.sin(a) * r], rot: [a, 0, 0] }, 0.012);
  }
  // side cheeks close the arch off
  const half = arc / 2;
  for (const s of [-1, 1]) {
    for (let i = 0; i < segs; i++) {
      const a = -half + (i + 0.5) * step;
      kit.box(key, 0.035, 0.16, chord, { pos: [pos[0] + s * width * 0.5, pos[1] + Math.cos(a) * (r - 0.06), pos[2] + Math.sin(a) * (r - 0.06)], rot: [a, 0, 0] }, 0.01);
    }
  }
  if (flap) {
    kit.box('rubber', width * 0.94, flap, 0.03, { pos: [pos[0], pos[1] + Math.cos(half) * r - flap / 2, pos[2] + Math.sin(half) * r] }, 0.01);
  }
}

/** Louvred vent panel facing +Z in the frame `M`. */
function addLouvres(kit, key, M, { pos = [0, 0, 0], w = 0.7, h = 0.5, count = 7, depth = 0.05 }) {
  const gap = h / count;
  kit.add(key, cbox(w + 0.07, h + 0.07, 0.03, 0.012), compose(M, { pos: [pos[0], pos[1], pos[2] - 0.012] }));
  for (let i = 0; i < count; i++) {
    const y = pos[1] - h / 2 + (i + 0.5) * gap;
    kit.add(key, cbox(w, gap * 0.72, depth, 0.008), compose(M, { pos: [pos[0], y, pos[2] + depth * 0.35], rot: [-0.5, 0, 0] }));
  }
}

/** Grab handle: two stand-offs and a bar, in the frame `M`. */
function addGrabHandle(kit, key, M, { pos = [0, 0, 0], len = 0.34, r = 0.017, stand = 0.075, vertical = false }) {
  const ax = vertical ? [0, 1, 0] : [1, 0, 0];
  for (const s of [-1, 1]) {
    const o = [pos[0] + ax[0] * s * len * 0.5, pos[1] + ax[1] * s * len * 0.5, pos[2] + stand * 0.5];
    kit.add(key, cylinder(r * 0.8, r * 0.8, stand, 6), compose(M, { pos: o, rot: [Math.PI / 2, 0, 0] }));
  }
  kit.add(key, cylinder(r, r, len, 6), compose(M, { pos: [pos[0], pos[1], pos[2] + stand], rot: vertical ? [0, 0, 0] : [0, 0, Math.PI / 2] }));
}

/** Welded lifting eye standing on a plate. */
function addLug(kit, key, { pos, rot = [0, 0, 0], s = 1 }) {
  const M = transform({ pos, rot });
  kit.add(key, cbox(0.06 * s, 0.2 * s, 0.15 * s, 0.012), compose(M, { pos: [0, 0.1 * s, 0] }));
  kit.add(key, new THREE.TorusGeometry(0.05 * s, 0.018 * s, 5, 10), compose(M, { pos: [0, 0.2 * s, 0], rot: [0, Math.PI / 2, 0] }));
  kit.add(key, cbox(0.16 * s, 0.03 * s, 0.2 * s, 0.01), compose(M, { pos: [0, 0.015 * s, 0] }));
}

/** Heavy D-shackle on a mounting plate, opening along -Z. */
function addShackle(kit, key, { pos, rot = [0, 0, 0], s = 1 }) {
  const M = transform({ pos, rot });
  kit.add(key, cbox(0.34 * s, 0.3 * s, 0.07 * s, 0.02), compose(M, { pos: [0, 0, 0.035 * s] }));
  kit.add(key, new THREE.TorusGeometry(0.13 * s, 0.032 * s, 5, 12, Math.PI * 1.45), compose(M, { pos: [0, 0, -0.09 * s], rot: [0, 0, -Math.PI * 0.78] }));
  kit.add(key, cylinder(0.028 * s, 0.028 * s, 0.3 * s, 6), compose(M, { pos: [0, -0.05 * s, -0.09 * s], rot: [0, 0, Math.PI / 2] }));
}

/** Screw-jack levelling leg with a foot plate and crank. */
function addJack(kit, keyBody, keyBright, { pos, len = 1.0, drop = 0.0 }) {
  const M = transform({ pos });
  kit.add(keyBody, cbox(0.2, len, 0.2, 0.02), compose(M, { pos: [0, len / 2 + drop, 0] }));
  kit.add(keyBright, ribbedTube(len * 0.55, 0.065, 8, 1.18, 8), compose(M, { pos: [0, len * 0.28 + drop, 0] }));
  kit.add(keyBright, cbox(0.5, 0.07, 0.5, 0.02), compose(M, { pos: [0, 0.035, 0] }));
  kit.add(keyBright, cbox(0.34, 0.05, 0.34, 0.015), compose(M, { pos: [0, 0.09, 0] }));
  // crank handle
  kit.add(keyBright, cylinder(0.02, 0.02, 0.3, 6), compose(M, { pos: [0.15, len + drop + 0.06, 0], rot: [0, 0, Math.PI / 2] }));
  kit.add(keyBright, cylinder(0.026, 0.026, 0.13, 6), compose(M, { pos: [0.3, len + drop + 0.13, 0] }));
  kit.add(keyBody, cbox(0.26, 0.1, 0.26, 0.02), compose(M, { pos: [0, len + drop, 0] }));
}

/** Deployable outrigger: beam out from the chassis, ram down to a pad. */
function addOutrigger(kit, keyBody, keyBright, { pos, out = 0.55, drop = 1.0, side = 1 }) {
  const M = transform({ pos });
  kit.add(keyBody, cbox(out, 0.26, 0.34, 0.02), compose(M, { pos: [(side * out) / 2, 0, 0] }));
  kit.add(keyBody, cbox(0.3, 0.34, 0.36, 0.02), compose(M, { pos: [side * out, -0.06, 0] }));
  // ram hangs downward from the beam end onto its pad
  const reach = drop - 0.16;
  kit.add(keyBright, hydraulicRam(reach * 0.62, reach * 0.38, 0.08), compose(M, { pos: [side * out, -0.1, 0], rot: [Math.PI, 0, 0] }));
  kit.add(keyBright, cbox(0.62, 0.09, 0.62, 0.02), compose(M, { pos: [side * out, -drop + 0.045, 0] }));
  kit.add(keyBody, cbox(0.4, 0.06, 0.4, 0.015), compose(M, { pos: [side * out, -drop + 0.11, 0] }));
  kit.strut(keyBody, [side * out * 0.95, -0.14, 0.14], [side * 0.05, 0.22, 0.14], 0.035);
  kit.strut(keyBody, [side * out * 0.95, -0.14, -0.14], [side * 0.05, 0.22, -0.14], 0.035);
}

/**
 * Four-chord lattice running along +Z from z=0. Verticals and cross ties at
 * every station, alternating diagonals on all four faces — it reads as a real
 * welded structure from a metre away and still costs under 2k triangles.
 */
function latticeBeam(length, w, h, bays, r = 0.05) {
  const parts = [];
  const corners = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  const chord = cylinder(r, r, length, 6);
  for (const [x, y] of corners) parts.push({ geometry: chord, matrix: transform({ pos: [x, y, length / 2], rot: [Math.PI / 2, 0, 0] }) });
  const bay = length / bays;
  const owned = [chord];
  const link = (a, b, rr) => {
    const p = strutPart(a, b, rr);
    owned.push(p.geometry);
    parts.push(p);
  };
  for (let i = 0; i <= bays; i++) {
    const z = i * bay;
    link([-w / 2, -h / 2, z], [-w / 2, h / 2, z], r * 0.66);
    link([w / 2, -h / 2, z], [w / 2, h / 2, z], r * 0.66);
    link([-w / 2, h / 2, z], [w / 2, h / 2, z], r * 0.66);
    link([-w / 2, -h / 2, z], [w / 2, -h / 2, z], r * 0.66);
  }
  for (let i = 0; i < bays; i++) {
    const z0 = i * bay;
    const z1 = z0 + bay;
    const up = i % 2 === 0;
    link([-w / 2, up ? -h / 2 : h / 2, z0], [-w / 2, up ? h / 2 : -h / 2, z1], r * 0.56);
    link([w / 2, up ? h / 2 : -h / 2, z0], [w / 2, up ? -h / 2 : h / 2, z1], r * 0.56);
    link([-w / 2, h / 2, z0], [w / 2, h / 2, z1], r * 0.5);
    link([w / 2, -h / 2, z0], [-w / 2, -h / 2, z1], r * 0.5);
  }
  const g = mergeParts(parts);
  owned.forEach((o) => o.dispose());
  return g;
}

/** Hand-wheel valve for service manifolds. */
function valveWheel(r = 0.12) {
  const parts = [];
  const rim = new THREE.TorusGeometry(r, r * 0.16, 5, 12);
  parts.push({ geometry: rim });
  const spoke = cylinder(r * 0.09, r * 0.09, r * 2, 5);
  for (let i = 0; i < 3; i++) parts.push({ geometry: spoke, matrix: transform({ rot: [0, 0, (i / 3) * Math.PI] }) });
  const hub = cylinder(r * 0.22, r * 0.22, r * 0.5, 8);
  parts.push({ geometry: hub, matrix: transform({ rot: [Math.PI / 2, 0, 0] }) });
  const g = mergeParts(parts);
  rim.dispose();
  spoke.dispose();
  hub.dispose();
  return g;
}

/**
 * Instanced frangible covers. Returns lightweight proxies exposing `visible`
 * so the gameplay code can blow individual lids clear without paying a draw
 * call per canister.
 */
function lidSet(parent, geometry, material, poses) {
  const inst = new THREE.InstancedMesh(geometry, material, poses.length);
  inst.castShadow = true;
  inst.receiveShadow = true;
  inst.frustumCulled = false;
  const shown = poses.map((p) => transform(p));
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < poses.length; i++) inst.setMatrixAt(i, shown[i]);
  inst.instanceMatrix.needsUpdate = true;
  parent.add(inst);
  return poses.map((p, i) => {
    const proxy = { _v: true, mesh: inst, index: i };
    Object.defineProperty(proxy, 'visible', {
      get() {
        return this._v;
      },
      set(v) {
        if (this._v === v) return;
        this._v = v;
        inst.setMatrixAt(i, v ? shown[i] : hidden);
        inst.instanceMatrix.needsUpdate = true;
      },
    });
    return proxy;
  });
}

/**
 * Twin erection rams built as a barrel mesh with a sliding rod child, so the
 * rod extends out of a fixed-length barrel instead of the whole cylinder
 * stretching. `solve` drives them from the exact trunnion geometry.
 */
function ramPair(parent, matlib, cfg) {
  const { base, attach, pivot, barrel, rodLen, r = 0.085, xs = [-1, 1], key = 'darkMetal' } = cfg;
  const bParts = [];
  const rParts = [];
  for (const s of xs) {
    const x = s * base[0];
    // barrel, gland, base clevis
    bParts.push({ geometry: cylinder(r, r, barrel, 10), matrix: transform({ pos: [x, barrel / 2, 0] }) });
    bParts.push({ geometry: cylinder(r * 1.24, r * 1.24, r * 0.7, 10), matrix: transform({ pos: [x, r * 0.5, 0] }) });
    bParts.push({ geometry: cylinder(r * 1.18, r * 1.18, r * 0.9, 10), matrix: transform({ pos: [x, barrel - r * 0.5, 0] }) });
    bParts.push({ geometry: cbox(r * 0.9, r * 1.6, r * 2.6, 0.01), matrix: transform({ pos: [x, -r * 0.5, 0] }) });
    bParts.push({ geometry: new THREE.TorusGeometry(r * 0.75, r * 0.3, 5, 10), matrix: transform({ pos: [x, -r * 0.9, 0], rot: [0, Math.PI / 2, 0] }) });
    // feed lines clipped to the barrel
    bParts.push({ geometry: cylinder(r * 0.2, r * 0.2, barrel * 0.8, 5), matrix: transform({ pos: [x + r * 1.15, barrel * 0.45, 0] }) });
    rParts.push({ geometry: cylinder(r * 0.56, r * 0.56, rodLen, 12), matrix: transform({ pos: [x, rodLen / 2, 0] }) });
    rParts.push({ geometry: new THREE.TorusGeometry(r * 0.7, r * 0.26, 5, 10), matrix: transform({ pos: [x, rodLen, 0], rot: [0, Math.PI / 2, 0] }) });
    rParts.push({ geometry: cylinder(r * 0.72, r * 0.72, r * 0.5, 10), matrix: transform({ pos: [x, rodLen - r * 0.9, 0] }) });
  }
  const barrels = new THREE.Mesh(mergeParts(bParts), matlib[key]);
  const rods = new THREE.Mesh(mergeParts(rParts), extras().rod);
  barrels.castShadow = true;
  rods.castShadow = true;
  barrels.position.set(0, base[1], base[2]);
  barrels.add(rods);
  parent.add(barrels);
  bParts.forEach((p) => p.geometry.dispose());
  rParts.forEach((p) => p.geometry.dispose());

  const P = new THREE.Vector3(pivot[0], pivot[1], pivot[2]);
  const A = new THREE.Vector3(attach[0], attach[1], attach[2]);
  const tmp = new THREE.Vector3();
  const solve = (e) => {
    tmp.set(0, A.y, A.z);
    const c = Math.cos(e);
    const s = Math.sin(e);
    // rotate the attachment point by -e about X, matching the elevation node
    const ay = A.y * c + A.z * s + P.y;
    const az = -A.y * s + A.z * c + P.z;
    const dy = ay - base[1];
    const dz = az - base[2];
    const len = Math.hypot(dy, dz);
    barrels.rotation.x = Math.atan2(dz, dy);
    barrels.scale.set(1, 1, 1);
    rods.position.y = THREE.MathUtils.clamp(len - rodLen, 0.04, barrel - 0.12);
  };
  solve(0);
  return { barrels, rods, solve };
}

/**
 * Status light head: green / amber / red plus a battery-coloured readout,
 * repeated at every site but merged so the whole set costs four draw calls
 * regardless of how many heads the vehicle carries.
 */
function statusLights(kit, housingKey, colorHex, sites) {
  const group = new THREE.Group();
  const lampParts = [[], [], []];
  const readParts = [];
  const dome = new THREE.SphereGeometry(0.052, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const readGeo = new THREE.PlaneGeometry(0.44, 0.1);
  for (const s of sites) {
    const M = transform(s);
    kit.add(housingKey, cbox(0.72, 0.48, 0.14, 0.02), compose(M, { pos: [0, 0, 0] }));
    kit.add(housingKey, cbox(0.76, 0.05, 0.22, 0.015), compose(M, { pos: [0, 0.27, 0.06] }));
    kit.add(housingKey, cbox(0.1, 0.14, 0.1, 0.01), compose(M, { pos: [0, -0.3, 0.02] }));
    for (let i = 0; i < 3; i++) {
      const x = -0.2 + i * 0.2;
      lampParts[i].push({ geometry: dome, matrix: compose(M, { pos: [x, 0.08, 0.072], rot: [Math.PI / 2, 0, 0] }) });
      kit.add(housingKey, new THREE.TorusGeometry(0.058, 0.014, 5, 10), compose(M, { pos: [x, 0.08, 0.075] }));
    }
    readParts.push({ geometry: readGeo, matrix: compose(M, { pos: [0, -0.13, 0.076] }) });
    kit.add(housingKey, cbox(0.5, 0.15, 0.03, 0.01), compose(M, { pos: [0, -0.13, 0.068] }));
  }
  const colors = [0x2fff7a, 0xffb028, 0xff3324];
  const lamps = lampParts.map((parts, i) => {
    const m = new THREE.Mesh(mergeParts(parts), lamp(colors[i], 0.25));
    m.castShadow = false;
    group.add(m);
    return m;
  });
  const readout = new THREE.Mesh(mergeParts(readParts), lamp(colorHex, 1.8));
  readout.castShadow = false;
  group.add(readout);
  dome.dispose();
  readGeo.dispose();
  group.userData.lamps = lamps;
  group.userData.readout = readout;
  return group;
}

/* ============================================================ PATRIOT-style */

/**
 * HAWKEYE 1 — trailer-mounted terminal launcher. Four rectangular canisters in
 * a braced erector frame over a two-axle trailer with a drawbar, levelling
 * jacks, a power unit and an electronics locker.
 */
function buildPatriotLauncher(rng) {
  const mats = lib();
  const ex = extras();
  const g = new THREE.Group();
  g.name = 'launcher.PATRIOT';
  const kit = new Kit(mats);
  const BODY = 'oliveMetal';
  const STRUCT = ex.chassis;

  const DECK = 1.16; // top of the trailer deck
  const ZF = -3.9;
  const ZR = 3.9;

  /* ---------------------------------------------------------- trailer frame */
  for (const x of [-1.12, 1.12]) {
    kit.box(BODY, 0.2, 0.5, ZR - ZF, { pos: [x, DECK - 0.33, (ZF + ZR) / 2] }, 0.03);
    kit.box('galv', 0.36, 0.06, ZR - ZF - 0.3, { pos: [x, DECK - 0.57, (ZF + ZR) / 2] }, 0.015);
    addBoltLine(kit, 'galv', [x, DECK - 0.6, ZF + 0.4], [x, DECK - 0.6, ZR - 0.4], 9, [0, -1, 0], 0.024, 0.02);
  }
  for (let i = 0; i <= 7; i++) {
    const z = ZF + 0.3 + (i / 7) * (ZR - ZF - 0.6);
    kit.box(BODY, 2.3, 0.16, 0.14, { pos: [0, DECK - 0.42, z] }, 0.02);
  }
  // deck plates either side of the turntable well
  kit.box(BODY, 3.0, 0.14, 1.7, { pos: [0, DECK - 0.07, ZF + 0.85] }, 0.03);
  kit.box(BODY, 3.0, 0.14, 1.5, { pos: [0, DECK - 0.07, ZR - 0.75] }, 0.03);
  for (const s of [-1, 1]) {
    kit.box(BODY, 0.62, 0.14, 4.6, { pos: [s * 1.19, DECK - 0.07, 0.55] }, 0.03);
    kit.box(BODY, 0.06, 0.13, 4.6, { pos: [s * 1.49, DECK + 0.05, 0.55] }, 0.012);
    // side skirts and stowage
    kit.box(BODY, 0.12, 0.6, 3.2, { pos: [s * 1.46, DECK - 0.52, 0.9] }, 0.02);
    kit.add(BODY, greebles(2.6, 0.42, rng, { count: 9, maxSize: 0.18, depth: 0.05 }), { pos: [s * 1.53, DECK - 0.52, 0.9], rot: [0, s * Math.PI * 0.5, 0] });
  }
  // tread plate on the walkways
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) {
      kit.decal('tread', 0.58, 0.62, { pos: [s * 1.19, DECK + 0.012, -1.6 + i * 0.66], rot: [-Math.PI / 2, 0, 0] });
    }
  }

  /* ------------------------------------------------------- drawbar and hitch */
  for (const s of [-1, 1]) {
    kit.strut(BODY, [s * 0.62, DECK - 0.35, ZF + 0.1], [s * 0.13, DECK - 0.35, ZF - 1.5], 0.085, 6);
  }
  kit.box(BODY, 0.26, 0.24, 1.1, { pos: [0, DECK - 0.35, ZF - 1.95] }, 0.03);
  kit.cyl('galv', 0.075, 0.34, { pos: [0, DECK - 0.35, ZF - 2.6], rot: [Math.PI / 2, 0, 0] }, 8);
  kit.torus('galv', 0.15, 0.045, { pos: [0, DECK - 0.35, ZF - 2.78], rot: [0, Math.PI / 2, 0] }, 5, 12);
  kit.box('galv', 0.3, 0.16, 0.1, { pos: [0, DECK - 0.35, ZF - 2.44] }, 0.02);
  // safety chains
  kit.add('rubber', cableGeometry(new THREE.Vector3(-0.22, DECK - 0.42, ZF - 1.7), new THREE.Vector3(-0.05, DECK - 0.42, ZF - 2.6), 0.22, 0.028, 10, 4));
  kit.add('rubber', cableGeometry(new THREE.Vector3(0.22, DECK - 0.42, ZF - 1.7), new THREE.Vector3(0.05, DECK - 0.42, ZF - 2.6), 0.22, 0.028, 10, 4));
  // jockey wheel
  kit.cyl('galv', 0.06, 0.72, { pos: [0.34, DECK - 0.72, ZF - 1.6] }, 8);
  kit.box('galv', 0.18, 0.16, 0.16, { pos: [0.34, DECK - 1.08, ZF - 1.6] }, 0.02);
  kit.add('rubber', tyreGeo(0.17, 0.1), { pos: [0.34, 0.17, ZF - 1.6] });

  /* ------------------------------------------------------- running gear */
  for (const z of [0.55, 1.95]) {
    kit.cyl('galv', 0.09, 3.0, { pos: [0, 0.62, z], rot: [0, 0, Math.PI / 2] }, 8);
    for (const s of [-1, 1]) {
      addRoadWheel(kit, BODY, { pos: [s * 1.42, 0.62, z], r: 0.62, width: 0.38, side: s, lugs: 6 });
      addFender(kit, BODY, { pos: [s * 1.42, 0.62, z], r: 0.79, width: 0.56, arc: 2.3, segs: 6, flap: z > 1 ? 0.34 : 0 });
      // leaf spring stack
      kit.box('galv', 0.12, 0.05, 1.0, { pos: [s * 1.18, 0.72, z], rot: [0.05, 0, 0] }, 0.01);
      kit.box('galv', 0.12, 0.05, 0.7, { pos: [s * 1.18, 0.79, z] }, 0.01);
    }
  }
  for (const [x, z] of [[-1.62, 3.35], [1.62, 3.35], [-1.62, -3.35], [1.62, -3.35]]) {
    addJack(kit, BODY, 'galv', { pos: [x, 0, z], len: 1.02 });
  }
  // wheel chocks
  for (const s of [-1, 1]) {
    for (const z of [-0.35, 2.95]) {
      kit.box('rubber', 0.4, 0.24, 0.34, { pos: [s * 1.42, 0.12, z], rot: [z > 0 ? 0.5 : -0.5, 0, 0] }, 0.04);
    }
  }

  /* --------------------------------------------------- power unit + locker */
  const genM = transform({ pos: [-0.76, DECK + 0.44, -3.0] });
  kit.add(BODY, cbox(1.16, 0.88, 1.7, 0.04), genM);
  kit.add(BODY, cbox(1.22, 0.07, 1.76, 0.02), compose(genM, { pos: [0, 0.47, 0] }));
  addLouvres(kit, BODY, compose(genM, { pos: [-0.6, 0, 0], rot: [0, -Math.PI / 2, 0] }), { w: 1.2, h: 0.56, count: 8, depth: 0.05 });
  addLouvres(kit, BODY, compose(genM, { pos: [0, 0, -0.87], rot: [0, Math.PI, 0] }), { w: 0.8, h: 0.5, count: 6, depth: 0.05 });
  addGrabHandle(kit, 'galv', compose(genM, { pos: [0, 0.2, 0.87] }), { len: 0.4 });
  kit.decal('dials', 0.5, 0.25, { pos: [-0.76, DECK + 0.62, -2.14], rot: [0, 0, 0] });
  kit.decal('p_pwr', 0.52, 0.2, { pos: [-0.76, DECK + 0.3, -2.145] });
  // exhaust stack, heat stained, with a soot wash on the deck below
  kit.add(ex.tempered, cylinder(0.075, 0.075, 1.05, 8), { pos: [-1.22, DECK + 1.0, -3.55] });
  kit.add(ex.tempered, cylinder(0.11, 0.11, 0.08, 8), { pos: [-1.22, DECK + 1.55, -3.55] });
  kit.add(ex.tempered, cbox(0.2, 0.03, 0.2, 0.01), { pos: [-1.22, DECK + 1.62, -3.55] });
  kit.add('galv', boltRow(4, 0.09, 0.02, 0.014, 'x'), { pos: [-1.22, DECK + 0.5, -3.44] });
  kit.decal('heat', 0.7, 0.5, { pos: [-1.22, DECK + 0.02, -3.55], rot: [-Math.PI / 2, 0, 0] });
  kit.decal('stain', 0.42, 0.5, { pos: [-1.09, DECK + 0.9, -3.55], rot: [0, -Math.PI / 2, 0] });

  const lockM = transform({ pos: [0.78, DECK + 0.49, -2.92] });
  kit.add(BODY, cbox(1.14, 0.98, 1.9, 0.04), lockM);
  kit.add(BODY, cbox(1.2, 0.06, 1.96, 0.02), compose(lockM, { pos: [0, 0.52, 0] }));
  kit.add(BODY, cbox(0.05, 0.8, 1.6, 0.015), compose(lockM, { pos: [0.59, -0.02, 0] }));
  addLouvres(kit, BODY, compose(lockM, { pos: [0.6, 0.22, 0], rot: [0, Math.PI / 2, 0] }), { w: 1.0, h: 0.34, count: 5, depth: 0.04 });
  kit.decal('dials', 0.68, 0.34, { pos: [1.39, DECK + 0.32, -2.92], rot: [0, Math.PI / 2, 0] });
  for (const z of [-0.66, 0.66]) {
    kit.add('galv', cbox(0.05, 0.1, 0.16, 0.01), compose(lockM, { pos: [0.6, -0.2, z] }));
  }
  addGrabHandle(kit, 'galv', compose(lockM, { pos: [0.62, -0.2, 0.2], rot: [0, Math.PI / 2, 0] }), { len: 0.3, vertical: true });
  kit.decal('nostep', 0.5, 0.12, { pos: [0.78, DECK + 1.02, -2.4], rot: [-Math.PI / 2, 0, 0] });

  /* ------------------------------------------------------- interconnect drum */
  const drumM = transform({ pos: [1.16, DECK + 0.5, -1.15] });
  for (const s of [-1, 1]) {
    kit.add('galv', cylinder(0.36, 0.36, 0.04, 14), compose(drumM, { pos: [s * 0.19, 0, 0], rot: [0, 0, Math.PI / 2] }));
  }
  kit.add('darkMetal', cylinder(0.24, 0.24, 0.36, 14), compose(drumM, { rot: [0, 0, Math.PI / 2] }));
  for (let i = 0; i < 5; i++) {
    kit.add('rubber', new THREE.TorusGeometry(0.28, 0.032, 4, 14), compose(drumM, { pos: [-0.14 + i * 0.07, 0, 0], rot: [0, Math.PI / 2, 0] }));
  }
  kit.add(BODY, cbox(0.06, 0.5, 0.12, 0.015), compose(drumM, { pos: [-0.24, -0.2, 0] }));
  kit.add(BODY, cbox(0.06, 0.5, 0.12, 0.015), compose(drumM, { pos: [0.24, -0.2, 0] }));
  kit.add('galv', cylinder(0.035, 0.035, 0.62, 6), compose(drumM, { rot: [0, 0, Math.PI / 2] }));
  // cable off the drum, along the deck, into a junction box at the pedestal
  kit.add('rubber', pathTube([
    new THREE.Vector3(1.16, DECK + 0.2, -0.98),
    new THREE.Vector3(1.15, DECK + 0.06, -0.5),
    new THREE.Vector3(0.95, DECK + 0.06, -0.05),
    new THREE.Vector3(0.62, DECK + 0.22, 0.12),
  ], 0.05, 6));
  kit.box('darkMetal', 0.3, 0.36, 0.24, { pos: [0.55, DECK + 0.36, 0.14] }, 0.02);
  kit.decal('gnd', 0.16, 0.07, { pos: [0.55, DECK + 0.3, 0.27] });

  /* --------------------------------------------------------------- markings */
  kit.decal('p_big', 2.7, 0.46, { pos: [-1.53, DECK - 0.46, 0.9], rot: [0, -Math.PI / 2, 0] });
  kit.decal('p_name', 1.7, 0.6, { pos: [1.53, DECK - 0.5, 0.9], rot: [0, Math.PI / 2, 0] });
  kit.decal('p_unit', 0.66, 0.25, { pos: [1.53, DECK - 0.5, 2.1], rot: [0, Math.PI / 2, 0] });
  kit.decal('stripes', 2.9, 0.24, { pos: [0, DECK - 0.34, ZR + 0.01] });
  kit.decal('caution', 0.8, 0.27, { pos: [1.53, DECK - 0.72, 1.9], rot: [0, Math.PI / 2, 0] });
  kit.decal('scorch', 1.7, 1.7, { pos: [0, DECK + 0.015, 0.4], rot: [-Math.PI / 2, 0, 0.3] });

  /* ------------------------------------------------------------- turntable */
  const turn = new THREE.Group();
  turn.position.set(0, DECK + 0.02, 0.5);
  g.add(turn);
  g.userData.azimuth = turn;
  const tkit = new Kit(mats);

  // bearing race sits on the deck; a rotating collar carries the pedestal
  kit.cyl('galv', 1.16, 0.1, { pos: [0, DECK + 0.05, 0.5] }, 22, 1.2);
  addBoltRing(kit, 'galv', [0, DECK + 0.12, 0.5], 1.08, 18, transform({ rot: [-Math.PI / 2, 0, 0] }), 0.026, 0.02);

  const TRUN_Y = 0.95;
  const TRUN_Z = -1.55;
  tkit.add(STRUCT, cylinder(1.1, 1.04, 0.22, 22), { pos: [0, 0.11, 0] });
  tkit.add(STRUCT, cylinder(0.86, 0.95, 0.3, 18), { pos: [0, 0.24, 0] });
  // rotating base frame carrying the pedestal and the ram trunnions
  tkit.box(STRUCT, 2.9, 0.28, 0.36, { pos: [0, 0.15, -1.35] }, 0.03);
  tkit.box(STRUCT, 2.9, 0.24, 0.32, { pos: [0, 0.15, 0.55] }, 0.03);
  for (const s of [-1, 1]) {
    tkit.box(STRUCT, 0.28, 0.28, 2.1, { pos: [s * 1.28, 0.15, -0.4] }, 0.03);
    tkit.strut(STRUCT, [s * 1.25, 0.15, -1.3], [s * 0.5, 0.3, 0.3], 0.05);
    tkit.box('galv', 0.4, 0.26, 0.26, { pos: [s * 1.15, 0.2, -1.35] }, 0.02);
    // A-frame pedestal legs rising to the trunnion bearings, set out wide
    // enough to meet the erector's own pins
    tkit.box(STRUCT, 0.2, TRUN_Y, 0.52, { pos: [s * 1.22, TRUN_Y / 2 + 0.22, TRUN_Z], rot: [0, 0, s * 0.05] }, 0.02);
    tkit.strut(STRUCT, [s * 1.3, 0.28, TRUN_Z + 0.42], [s * 1.2, TRUN_Y + 0.14, TRUN_Z + 0.02], 0.055);
    tkit.strut(STRUCT, [s * 1.32, 0.28, TRUN_Z - 0.42], [s * 1.2, TRUN_Y + 0.14, TRUN_Z + 0.02], 0.055);
    tkit.strut(STRUCT, [s * 1.28, 0.3, 0.4], [s * 1.22, TRUN_Y, TRUN_Z + 0.3], 0.05);
    tkit.cyl('galv', 0.18, 0.4, { pos: [s * 1.3, TRUN_Y + 0.22, TRUN_Z], rot: [0, 0, Math.PI / 2] }, 12);
    tkit.cyl('galv', 0.1, 0.5, { pos: [s * 1.3, TRUN_Y + 0.22, TRUN_Z], rot: [0, 0, Math.PI / 2] }, 10);
    addBoltRing(tkit, 'galv', [0, 0, 0], 0.13, 8, transform({ pos: [s * 1.52, TRUN_Y + 0.22, TRUN_Z], rot: [0, Math.PI / 2, 0] }), 0.019, 0.015);
    // hose runs from the pedestal down to the ram bases
    tkit.add('darkMetal', pathTube([
      new THREE.Vector3(s * 1.24, 0.6, TRUN_Z + 0.3),
      new THREE.Vector3(s * 1.2, 0.34, TRUN_Z + 0.3),
      new THREE.Vector3(s * 1.15, 0.24, TRUN_Z + 0.22),
    ], 0.035, 5));
  }
  tkit.box(STRUCT, 2.2, 0.18, 0.42, { pos: [0, TRUN_Y + 0.34, TRUN_Z] }, 0.02);
  tkit.box(STRUCT, 1.7, 0.3, 0.3, { pos: [0, 0.42, TRUN_Z + 0.62] }, 0.02);

  /* ---------------------------------------------------- erector and rounds */
  const pivot = new THREE.Group();
  pivot.position.set(0, TRUN_Y + 0.22, TRUN_Z);
  turn.add(pivot);
  g.userData.elevation = pivot;
  const pkit = new Kit(mats);

  // Four rounds in two columns of two, spaced so daylight shows between every
  // canister and the cage behind them stays readable — the single biggest
  // thing stopping the block from reading as one slab.
  const CAN_W = 0.92;
  const CAN_H = 0.84;
  const CAN_L = 5.5;
  const CAN_Z = 2.9;
  const CX = 0.64; // half the column spacing
  const CY = [0.42, 1.5]; // row centres
  const FY0 = -0.46; // bottom chord
  const FY1 = 0.96; // deck between the rows
  const FY2 = 2.06; // top chord
  const FX = 1.5;
  const Z0 = -0.35;
  // The cage stops short of the canister mouths so the frangible covers and
  // muzzle collars stand clear of the structure instead of hiding inside it.
  const Z1 = 5.5;
  const STATIONS = [-0.2, 1.15, 2.5, 3.9, 5.3];

  /* ------- erector cage: chords, transverse ring frames, face bracing -----
   * The cage is painted structural grey and the rounds a stop lighter, so the
   * frame reads as a lattice in front of the canisters instead of merging
   * with them into one green slab. */
  const CAGE = STRUCT;
  for (const x of [-FX, FX]) {
    pkit.box(CAGE, 0.2, 0.2, Z1 - Z0, { pos: [x, FY0, (Z0 + Z1) / 2] }, 0.025);
    pkit.box(CAGE, 0.2, 0.2, Z1 - Z0, { pos: [x, FY2, (Z0 + Z1) / 2] }, 0.025);
    pkit.box('galv', 0.26, 0.05, Z1 - Z0 - 0.3, { pos: [x, FY0 - 0.12, (Z0 + Z1) / 2] }, 0.012);
    addBoltLine(pkit, 'galv', [x, FY0 - 0.15, Z0 + 0.4], [x, FY0 - 0.15, Z1 - 0.4], 11, [0, -1, 0], 0.022, 0.017);
  }
  pkit.box(CAGE, 0.16, 0.16, Z1 - Z0, { pos: [0, FY0, (Z0 + Z1) / 2] }, 0.02);
  pkit.box(CAGE, 0.16, 0.16, Z1 - Z0, { pos: [0, FY2, (Z0 + Z1) / 2] }, 0.02);
  for (const z of STATIONS) {
    for (const x of [-FX, 0, FX]) pkit.box(CAGE, 0.15, FY2 - FY0, 0.15, { pos: [x, (FY0 + FY2) / 2, z] }, 0.02);
    for (const y of [FY0, FY1, FY2]) pkit.box(CAGE, FX * 2, 0.14, 0.14, { pos: [0, y, z] }, 0.02);
    for (const s of [-1, 1]) {
      // stools and cradle pads the rounds actually sit on
      pkit.box(CAGE, 0.18, CY[0] - CAN_H / 2 - FY0, 0.18, { pos: [s * CX, (FY0 + CY[0] - CAN_H / 2) / 2, z] }, 0.02);
      pkit.box('galv', 0.62, 0.08, 0.22, { pos: [s * CX, CY[0] - CAN_H / 2 - 0.04, z] }, 0.014);
      pkit.box('galv', 0.62, 0.08, 0.22, { pos: [s * CX, CY[1] - CAN_H / 2 - 0.04, z] }, 0.014);
    }
  }
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const z0 = STATIONS[i];
    const z1 = STATIONS[i + 1];
    const up = i % 2 === 0;
    for (const s of [-1, 1]) {
      pkit.strut(CAGE, [s * FX, up ? FY0 : FY2, z0], [s * FX, up ? FY2 : FY0, z1], 0.052, 6);
      pkit.strut('galv', [s * FX, FY1, z0], [s * FX, FY1, z1], 0.042, 5);
    }
    pkit.strut(CAGE, [-FX, FY2, z0], [FX, FY2, z1], 0.048, 6);
    pkit.strut(CAGE, [-FX, FY0, z0], [FX, FY0, z1], 0.048, 6);
  }
  // trunnion end frame, closing plate and lifting eyes
  pkit.box(CAGE, FX * 2 + 0.2, 0.9, 0.4, { pos: [0, FY0 + 0.32, Z0 - 0.05] }, 0.03);
  pkit.box(CAGE, FX * 2 + 0.2, 0.22, 0.34, { pos: [0, FY2, Z0 - 0.05] }, 0.03);
  for (const s of [-1, 1]) {
    pkit.cyl('galv', 0.14, 0.52, { pos: [s * 1.42, FY0 + 0.36, Z0 - 0.05], rot: [0, 0, Math.PI / 2] }, 12);
    addLug(pkit, 'galv', { pos: [s * FX, FY2 + 0.1, 1.15], s: 1.05 });
    addLug(pkit, 'galv', { pos: [s * FX, FY2 + 0.1, 3.9], s: 1.05 });
    addGrabHandle(pkit, 'galv', transform({ pos: [s * (FX + 0.11), FY1, 0.6], rot: [0, s * Math.PI * 0.5, 0] }), { len: 0.4, vertical: true });
  }
  pkit.decal('lift', 0.44, 0.11, { pos: [-FX - 0.11, FY2 + 0.02, 1.15], rot: [0, -Math.PI / 2, 0] });

  const canisters = [];
  const lidPoses = [];
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 === 0 ? -1 : 1;
    const cx = sx * CX;
    const cy = CY[Math.floor(i / 2)];
    const node = new THREE.Group();
    node.position.set(cx, cy, CAN_Z);
    pivot.add(node);
    const M = transform({ pos: [cx, cy, CAN_Z] });
    pkit.add(ex.canister, cbox(CAN_W, CAN_H, CAN_L, 0.05), M);
    // strapping bands, longitudinal weld beads and a corner extrusion
    for (let k = 0; k < 6; k++) {
      pkit.add('galv', cbox(CAN_W + 0.07, CAN_H + 0.07, 0.09, 0.02), compose(M, { pos: [0, 0, -2.2 + k * 0.9] }));
    }
    for (const ex2 of [-1, 1]) {
      for (const ey of [-1, 1]) {
        pkit.add('galv', cylinder(0.022, 0.022, CAN_L - 0.16, 5), compose(M, { pos: [ex2 * CAN_W * 0.5, ey * CAN_H * 0.5, 0], rot: [Math.PI / 2, 0, 0] }));
      }
    }
    // umbilical conduit down the inboard face into the cage
    pkit.add(STRUCT, cylinder(0.045, 0.045, CAN_L * 0.7, 6), compose(M, { pos: [-sx * (CAN_W * 0.5 + 0.05), -CAN_H * 0.3, -0.4], rot: [Math.PI / 2, 0, 0] }));
    pkit.add(STRUCT, cbox(0.14, 0.2, 0.24, 0.02), compose(M, { pos: [-sx * (CAN_W * 0.5 + 0.06), -CAN_H * 0.3, -2.3] }));
    addLug(pkit, 'galv', { pos: [cx - 0.26, cy + CAN_H * 0.5, CAN_Z - 1.6], s: 0.85 });
    addLug(pkit, 'galv', { pos: [cx + 0.26, cy + CAN_H * 0.5, CAN_Z + 1.6], s: 0.85 });
    // muzzle collar standing proud so each round has its own mouth
    pkit.add('galv', cbox(CAN_W + 0.1, CAN_H + 0.1, 0.16, 0.03), compose(M, { pos: [0, 0, CAN_L / 2 - 0.02] }));
    addBoltRing(pkit, 'galv', [0, 0, CAN_L / 2 + 0.06], 0.44, 12, M, 0.02, 0.015);
    // scorched interior, only seen once the cover has gone
    pkit.add(ex.scorched, insideOut(cbox(CAN_W - 0.12, CAN_H - 0.12, 1.7, 0.02)), compose(M, { pos: [0, 0, CAN_L / 2 - 0.9] }));
    for (const rx of [-0.28, 0, 0.28]) {
      pkit.add('galv', cbox(0.05, 0.05, 1.5, 0.008), compose(M, { pos: [rx, -CAN_H * 0.5 + 0.14, CAN_L / 2 - 0.85] }));
    }
    // blast-stained rear closure, recessed behind its own ring
    pkit.add(ex.scorched, cbox(CAN_W - 0.08, CAN_H - 0.08, 0.12, 0.03), compose(M, { pos: [0, 0, -CAN_L / 2 + 0.09] }));
    pkit.add(ex.scorched, cbox(CAN_W + 0.06, CAN_H + 0.06, 0.1, 0.02), compose(M, { pos: [0, 0, -CAN_L / 2 + 0.02] }));
    addBoltRing(pkit, 'galv', [0, 0, -CAN_L / 2 - 0.04], 0.42, 10, M, 0.02, 0.014);
    pkit.decal('stain', 0.9, 0.84, { pos: [cx, cy, CAN_Z - CAN_L / 2 - 0.08], rot: [0, Math.PI, 0] });
    // Outboard markings sit mid-bay so the cage posts do not chop them in half.
    const ox = cx + sx * (CAN_W * 0.5 + 0.05);
    const oy = sx * Math.PI * 0.5;
    pkit.decal(`p_rd${i + 1}`, 0.72, 0.27, { pos: [ox, cy + 0.2, 0.5], rot: [0, oy, 0] });
    pkit.decal('caution', 1.0, 0.33, { pos: [ox, cy + 0.14, 1.85], rot: [0, oy, 0] });
    pkit.decal('stripes', 1.15, 0.15, { pos: [ox, cy - 0.28, 4.65], rot: [0, oy, 0] });

    lidPoses.push({ pos: [cx, cy, CAN_Z + CAN_L / 2 + 0.11] });
    canisters.push({ node, lid: null, loaded: true, index: i });
  }

  // frangible cover: dished plate, raised lip, retaining bolts and a pull tab
  const lidParts = [];
  lidParts.push({ geometry: cbox(CAN_W - 0.02, CAN_H - 0.02, 0.07, 0.03) });
  lidParts.push({ geometry: cbox(CAN_W + 0.06, 0.08, 0.11, 0.02), matrix: transform({ pos: [0, CAN_H / 2 - 0.02, 0.02] }) });
  lidParts.push({ geometry: cbox(CAN_W + 0.06, 0.08, 0.11, 0.02), matrix: transform({ pos: [0, -CAN_H / 2 + 0.02, 0.02] }) });
  lidParts.push({ geometry: cbox(0.08, CAN_H + 0.04, 0.11, 0.02), matrix: transform({ pos: [CAN_W / 2 - 0.02, 0, 0.02] }) });
  lidParts.push({ geometry: cbox(0.08, CAN_H + 0.04, 0.11, 0.02), matrix: transform({ pos: [-CAN_W / 2 + 0.02, 0, 0.02] }) });
  lidParts.push({ geometry: cbox(0.12, 0.18, 0.06, 0.015), matrix: transform({ pos: [0, 0, 0.07] }) });
  lidParts.push({ geometry: new THREE.TorusGeometry(0.07, 0.016, 5, 10), matrix: transform({ pos: [0, 0.16, 0.08] }) });
  {
    const bolt = cylinder(0.024, 0.02, 0.034, 6);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      lidParts.push({ geometry: bolt, matrix: transform({ pos: [Math.cos(a) * (CAN_W / 2 - 0.02), Math.sin(a) * (CAN_H / 2 - 0.02), 0.05], rot: [Math.PI / 2, 0, 0] }) });
    }
    const lidGeo = mergeParts(lidParts);
    bolt.dispose();
    lidParts.forEach((p) => p.geometry.dispose());
    const proxies = lidSet(pivot, lidGeo, mats.sandMetal, lidPoses);
    canisters.forEach((c, i) => (c.lid = proxies[i]));
  }

  g.userData.canisters = canisters;
  g.userData.launchLocal = canisters.map((c) => new THREE.Vector3(c.node.position.x, c.node.position.y, CAN_Z + CAN_L / 2 + 0.22));

  /* ------------------------------------------------------------------ rams */
  const rams = ramPair(turn, mats, {
    base: [1.15, 0.14, -1.35],
    attach: [1.15, FY0, 2.5],
    pivot: [0, TRUN_Y + 0.22, TRUN_Z],
    barrel: 1.7,
    rodLen: 1.9,
    r: 0.095,
  });
  g.userData.rams = [rams.barrels];

  /* ------------------------------------------------- travel lock + lighting */
  const lockNode = new THREE.Group();
  lockNode.position.set(0, DECK + 0.1, 2.85);
  g.add(lockNode);
  const lkit = new Kit(mats);
  for (const s of [-1, 1]) {
    kit.box(BODY, 0.22, 0.34, 0.42, { pos: [s * 1.5, DECK + 0.12, 2.85] }, 0.02);
    kit.cyl('galv', 0.06, 0.4, { pos: [s * 1.5, DECK + 0.12, 2.85], rot: [0, 0, Math.PI / 2] }, 8);
    lkit.box('galv', 0.16, 0.6, 0.16, { pos: [s * 1.5, 0.3, 0] }, 0.02);
    lkit.box('galv', 0.4, 0.12, 0.24, { pos: [s * 1.5, 0.62, 0] }, 0.02);
    lkit.box('galv', 0.1, 0.16, 0.22, { pos: [s * 1.32, 0.74, 0] }, 0.015);
    lkit.box('galv', 0.1, 0.16, 0.22, { pos: [s * 1.68, 0.74, 0] }, 0.015);
    lkit.strut('galv', [s * 1.5, 0.55, 0.02], [s * 1.5, 0.12, 0.5], 0.035);
  }
  lkit.emit(lockNode);

  const panel = statusLights(kit, 'darkMetal', 0x5fd0ff, [
    { pos: [-1.55, DECK + 0.36, -1.3], rot: [0, -Math.PI / 2, 0] },
    { pos: [1.55, DECK + 0.36, 2.1], rot: [0, Math.PI / 2, 0] },
  ]);
  g.add(panel);
  g.userData.panel = panel;

  kit.emit(g);
  tkit.emit(turn);
  pkit.emit(pivot);

  g.userData.animate = (t, launcher) => {
    rams.solve(launcher.currentElevation);
    lockNode.rotation.x = -t * 1.5;
    lockNode.visible = t < 0.985;
  };

  g.userData.restElevation = 0;
  g.userData.fireElevation = 45 * DEG;
  g.userData.colliders = [
    { type: 'box', pos: [0, 0.62, 0.3], half: [1.55, 0.62, 4.0], walkable: true },
    { type: 'box', pos: [0, 1.75, -2.95], half: [1.45, 0.62, 1.1], walkable: false },
    { type: 'box', pos: [0, 1.78, -1.05], half: [1.5, 0.6, 0.85], walkable: false },
    { type: 'box', pos: [0, 3.1, 1.55], half: [1.62, 1.4, 3.0], walkable: false },
    { type: 'box', pos: [0, 0.8, -5.4], half: [0.35, 0.35, 1.5], walkable: false },
  ];
  return g;
}

/* ============================================================== THAAD-style */

/**
 * LONGVIEW 2 — 8x8 heavy truck with a long round-tube pod on a load-handling
 * frame. Tallest silhouette on the site when it stands up.
 */
function buildThaadLauncher(rng) {
  const mats = lib();
  const ex = extras();
  const g = new THREE.Group();
  g.name = 'launcher.THAAD';
  const kit = new Kit(mats);
  const BODY = 'sandMetal';
  const STRUCT = ex.chassis;

  const DECK = 1.7;
  const ZF = -7.0;
  const ZR = 5.7;
  const AXLES = [-5.0, -3.45, 2.35, 3.95];

  /* ----------------------------------------------------------- chassis */
  for (const x of [-0.95, 0.95]) {
    kit.box(STRUCT, 0.24, 0.62, ZR - ZF, { pos: [x, 1.24, (ZF + ZR) / 2] }, 0.03);
    kit.box('galv', 0.36, 0.06, ZR - ZF - 0.4, { pos: [x, 0.94, (ZF + ZR) / 2] }, 0.015);
  }
  for (let i = 0; i <= 9; i++) {
    const z = ZF + 0.4 + (i / 9) * (ZR - ZF - 0.8);
    kit.box(STRUCT, 1.7, 0.16, 0.16, { pos: [0, 1.05, z] }, 0.02);
  }
  kit.box(BODY, 2.9, 0.16, 8.9, { pos: [0, DECK - 0.08, 1.25] }, 0.03);
  kit.box(BODY, 2.9, 0.16, 1.6, { pos: [0, DECK - 0.08, -3.5] }, 0.03);
  for (const s of [-1, 1]) {
    kit.box(BODY, 0.1, 0.16, 8.9, { pos: [s * 1.5, DECK + 0.06, 1.25] }, 0.02);
    kit.box(BODY, 0.34, 0.66, 5.4, { pos: [s * 1.6, 1.15, 0.6] }, 0.03);
    kit.add(BODY, greebles(4.6, 0.5, rng, { count: 13, maxSize: 0.2, depth: 0.06 }), { pos: [s * 1.78, 1.15, 0.6], rot: [0, s * Math.PI * 0.5, 0] });
  }
  kit.box(STRUCT, 2.9, 0.34, 0.3, { pos: [0, 1.0, ZF - 0.2] }, 0.03);
  kit.box(STRUCT, 2.9, 0.34, 0.3, { pos: [0, 1.0, ZR + 0.15] }, 0.03);
  for (const s of [-1, 1]) {
    addShackle(kit, 'galv', { pos: [s * 0.8, 1.0, ZF - 0.4], rot: [0, 0, 0], s: 1.1 });
    addShackle(kit, 'galv', { pos: [s * 0.8, 1.0, ZR + 0.35], rot: [0, Math.PI, 0], s: 1.1 });
  }

  /* --------------------------------------------------------- running gear */
  for (const z of AXLES) {
    kit.cyl('galv', 0.11, 3.1, { pos: [0, 0.82, z], rot: [0, 0, Math.PI / 2] }, 8);
    kit.box(STRUCT, 1.0, 0.34, 0.34, { pos: [0, 0.82, z] }, 0.03);
    for (const s of [-1, 1]) {
      addRoadWheel(kit, BODY, { pos: [s * 1.62, 0.82, z], r: 0.82, width: 0.5, side: s, lugs: 8 });
      addFender(kit, BODY, { pos: [s * 1.62, 0.82, z], r: 1.0, width: 0.66, arc: 2.1, segs: 6, flap: 0.3 });
      kit.strut(STRUCT, [s * 0.9, 1.0, z], [s * 1.5, 0.82, z], 0.06);
    }
  }

  /* ------------------------------------------------------------------ cab */
  const CAB_Z = -4.95;
  kit.box(BODY, 2.62, 1.78, 2.5, { pos: [0, 2.56, CAB_Z] }, 0.06);
  kit.box(BODY, 2.66, 0.1, 2.56, { pos: [0, 3.48, CAB_Z] }, 0.03);
  kit.box(BODY, 2.6, 1.06, 0.86, { pos: [0, 2.2, -6.58] }, 0.05);
  kit.box(BODY, 2.64, 0.08, 0.9, { pos: [0, 2.75, -6.58] }, 0.02);
  // windscreen and side glass with frames
  for (const s of [-1, 1]) {
    kit.add('glass', cbox(1.2, 0.52, 0.05, 0.01), { pos: [s * 0.63, 3.08, -6.24], rot: [-0.18, 0, 0] });
    kit.box(BODY, 1.3, 0.07, 0.07, { pos: [s * 0.63, 3.36, -6.29] }, 0.015);
    kit.box(BODY, 1.3, 0.07, 0.07, { pos: [s * 0.63, 2.8, -6.19] }, 0.015);
    kit.box(BODY, 0.07, 0.6, 0.07, { pos: [s * 0.02, 3.08, -6.24], rot: [-0.18, 0, 0] }, 0.015);
    kit.add('glass', cbox(0.05, 0.5, 0.95, 0.01), { pos: [s * 1.32, 3.02, -5.2] });
    kit.box(BODY, 0.06, 0.07, 1.02, { pos: [s * 1.33, 3.29, -5.2] }, 0.015);
    kit.box(BODY, 0.06, 0.07, 1.02, { pos: [s * 1.33, 2.75, -5.2] }, 0.015);
    // door line, handle and steps
    kit.box(BODY, 0.04, 1.4, 0.05, { pos: [s * 1.33, 2.5, -5.78] }, 0.01);
    kit.box(BODY, 0.04, 1.4, 0.05, { pos: [s * 1.33, 2.5, -4.4] }, 0.01);
    addGrabHandle(kit, 'galv', transform({ pos: [s * 1.34, 2.62, -4.62], rot: [0, s * Math.PI * 0.5, 0] }), { len: 0.24, vertical: true });
    addGrabHandle(kit, 'galv', transform({ pos: [s * 1.34, 3.1, -5.8], rot: [0, s * Math.PI * 0.5, 0] }), { len: 0.5, vertical: true });
    kit.box('galv', 0.5, 0.06, 0.4, { pos: [s * 1.5, 1.5, -5.1] }, 0.015);
    kit.box('galv', 0.5, 0.06, 0.4, { pos: [s * 1.5, 1.06, -5.1] }, 0.015);
    kit.decal('tread', 0.46, 0.36, { pos: [s * 1.5, 1.53, -5.1], rot: [-Math.PI / 2, 0, 0] });
    // mirrors
    kit.strut('galv', [s * 1.32, 3.3, -6.1], [s * 1.78, 3.32, -6.32], 0.024);
    kit.strut('galv', [s * 1.32, 2.86, -6.1], [s * 1.78, 3.0, -6.3], 0.024);
    kit.box('darkMetal', 0.07, 0.62, 0.2, { pos: [s * 1.8, 3.12, -6.32], rot: [0, -s * 0.25, 0] }, 0.02);
    kit.box('darkMetal', 0.07, 0.22, 0.2, { pos: [s * 1.8, 2.72, -6.32], rot: [0, -s * 0.25, 0] }, 0.02);
    // head lamps
    kit.cyl('galv', 0.15, 0.1, { pos: [s * 0.95, 1.95, -7.0], rot: [Math.PI / 2, 0, 0] }, 10);
    kit.add('glass', new THREE.CircleGeometry(0.13, 10), { pos: [s * 0.95, 1.95, -7.06], rot: [0, Math.PI, 0] });
  }
  // roof hatch
  kit.box(BODY, 0.88, 0.1, 0.88, { pos: [0, 3.56, -4.6] }, 0.03);
  kit.box(BODY, 0.94, 0.05, 0.14, { pos: [0, 3.55, -5.06] }, 0.015);
  kit.cyl('galv', 0.03, 0.3, { pos: [0.3, 3.63, -4.24], rot: [0, 0, Math.PI / 2] }, 6);
  kit.decal('nostep', 0.6, 0.15, { pos: [0, 3.62, -4.6], rot: [-Math.PI / 2, 0, 0] });
  // grille
  kit.box('darkMetal', 1.9, 0.74, 0.06, { pos: [0, 2.2, -7.0] }, 0.02);
  for (let i = 0; i < 11; i++) {
    kit.box('galv', 0.08, 0.66, 0.07, { pos: [-0.82 + i * 0.164, 2.2, -7.04] }, 0.012);
  }
  kit.box(BODY, 2.0, 0.12, 0.1, { pos: [0, 2.62, -7.02] }, 0.02);
  // brush guard
  for (const s of [-1, 1]) {
    kit.strut('galv', [s * 1.05, 1.35, -7.35], [s * 1.05, 2.85, -7.35], 0.045, 6);
    kit.strut('galv', [s * 1.05, 2.85, -7.35], [s * 0.95, 2.9, -6.95], 0.04, 6);
    kit.strut('galv', [s * 1.05, 1.35, -7.35], [s * 0.95, 1.15, -6.7], 0.04, 6);
  }
  for (const y of [1.5, 2.05, 2.6]) {
    kit.strut('galv', [-1.05, y, -7.35], [1.05, y, -7.35], 0.038, 6);
  }
  kit.decal('t_unit', 0.5, 0.19, { pos: [-0.6, 2.62, -7.09] });

  /* --------------------------------------------- stowage, spare, walkway */
  for (const z of [-1.2, 0.9]) {
    const M = transform({ pos: [1.62, 1.3, z] });
    kit.add(BODY, cbox(0.46, 0.72, 1.8, 0.03), M);
    kit.add(BODY, cbox(0.05, 0.62, 1.7, 0.015), compose(M, { pos: [0.24, 0, 0] }));
    kit.add(BODY, corrugatedPanel(1.6, 0.5, 7, 0.02), compose(M, { pos: [0.27, 0, 0], rot: [0, Math.PI / 2, 0] }));
    for (const zz of [-0.55, 0.55]) {
      kit.add('galv', cbox(0.06, 0.1, 0.2, 0.01), compose(M, { pos: [0.26, 0.2, zz] }));
      kit.add('galv', cbox(0.08, 0.14, 0.1, 0.01), compose(M, { pos: [0.27, -0.15, zz] }));
    }
    kit.decal('nostep', 0.42, 0.11, { pos: [1.62, 1.68, z], rot: [-Math.PI / 2, 0, 0] });
  }
  // Spare carried upright against the back of the cab. Slung on the side rail
  // it lines up with the road wheels and just reads as a fifth tyre.
  {
    const SX = 0.86;
    const SZ = -3.42;
    const SY = 2.56;
    kit.add(ex.tyre, tyreGeo(0.82, 0.5), { pos: [SX, SY, SZ], rot: [0, Math.PI / 2, 0] });
    const disc = [Math.PI / 2, 0, 0];
    kit.cyl(BODY, 0.45, 0.08, { pos: [SX, SY, SZ + 0.27], rot: disc }, 14);
    kit.cyl('darkMetal', 0.11, 0.14, { pos: [SX, SY, SZ + 0.33], rot: disc }, 8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      kit.cyl('galv', 0.032, 0.05, { pos: [SX + Math.cos(a) * 0.3, SY + Math.sin(a) * 0.3, SZ + 0.31], rot: disc }, 5);
    }
    for (const s of [-1, 1]) {
      kit.box('galv', 0.12, 1.9, 0.1, { pos: [SX + s * 0.86, SY - 0.1, SZ - 0.1] }, 0.02);
      kit.strut('galv', [SX + s * 0.82, SY + 0.7, SZ - 0.05], [SX + s * 0.2, SY + 0.34, SZ + 0.3], 0.03, 5);
    }
    kit.box('galv', 1.9, 0.12, 0.12, { pos: [SX, DECK + 0.02, SZ - 0.1] }, 0.02);
    kit.box('galv', 1.9, 0.1, 0.1, { pos: [SX, SY + 0.8, SZ - 0.1] }, 0.02);
  }

  // left-hand walkway with kick plate and rail
  kit.box('galv', 0.66, 0.07, 6.6, { pos: [-1.66, DECK + 0.06, 1.0] }, 0.015);
  kit.box('galv', 0.06, 0.14, 6.6, { pos: [-1.97, DECK + 0.13, 1.0] }, 0.015);
  for (let i = 0; i < 10; i++) {
    kit.decal('tread', 0.6, 0.64, { pos: [-1.66, DECK + 0.105, -2.1 + i * 0.66], rot: [-Math.PI / 2, 0, 0] });
  }
  kit.add('galv', handrail([new THREE.Vector3(-1.95, 0, -2.2), new THREE.Vector3(-1.95, 0, 0.6), new THREE.Vector3(-1.95, 0, 4.2)], 1.0), { pos: [0, DECK + 0.1, 0] });
  // fold-down ladder off the back of the walkway
  kit.add('galv', ladder(1.85, 0.44), { pos: [-1.9, DECK + 0.05, 4.35], rot: [0.32, Math.PI / 2, 0] });
  kit.box('galv', 0.1, 0.14, 0.24, { pos: [-1.9, DECK + 0.06, 4.25] }, 0.015);
  kit.box('galv', 0.1, 0.14, 0.24, { pos: [-2.28, DECK + 0.06, 4.25] }, 0.015);

  /* ------------------------------------------------------------ outriggers */
  for (const [z, o] of [[-1.7, 0.62], [4.7, 0.62]]) {
    for (const s of [-1, 1]) addOutrigger(kit, STRUCT, 'galv', { pos: [s * 1.5, 1.05, z], out: o, drop: 1.02, side: s });
  }

  /* -------------------------------------------------------------- markings */
  kit.decal('t_big', 3.1, 0.53, { pos: [1.79, 1.3, 0.6], rot: [0, Math.PI / 2, 0] });
  kit.decal('t_name', 1.7, 0.6, { pos: [-1.79, 1.28, -1.4], rot: [0, -Math.PI / 2, 0] });
  kit.decal('stripes', 2.6, 0.24, { pos: [0, 1.02, ZR + 0.32], rot: [0, Math.PI, 0] });
  kit.decal('stripes', 2.4, 0.22, { pos: [0, 1.02, ZF - 0.36] });
  kit.decal('caution', 0.8, 0.27, { pos: [-1.79, 1.4, 2.4], rot: [0, -Math.PI / 2, 0] });
  kit.decal('gnd', 0.2, 0.08, { pos: [1.79, 0.9, -1.9], rot: [0, Math.PI / 2, 0] });

  /* ----------------------------------------------------------- turntable */
  const turn = new THREE.Group();
  turn.position.set(0, DECK, 1.4);
  g.add(turn);
  g.userData.azimuth = turn;
  const tkit = new Kit(mats);

  kit.cyl('galv', 1.5, 0.1, { pos: [0, DECK + 0.05, 1.4] }, 24, 1.54);
  addBoltRing(kit, 'galv', [0, DECK + 0.12, 1.4], 1.42, 22, transform({ rot: [-Math.PI / 2, 0, 0] }), 0.026, 0.02);

  tkit.add(STRUCT, cylinder(1.42, 1.36, 0.24, 24), { pos: [0, 0.12, 0] });
  // load-handling frame: deck beams plus twin trunnion towers
  const TRUN_Y = 1.45;
  const TRUN_Z = -2.7;
  tkit.box(STRUCT, 2.5, 0.3, 0.4, { pos: [0, 0.22, -3.45] }, 0.03);
  for (const s of [-1, 1]) {
    tkit.box(STRUCT, 0.3, 0.4, 7.4, { pos: [s * 1.2, 0.4, -0.5] }, 0.03);
    tkit.box(STRUCT, 0.4, TRUN_Y, 0.7, { pos: [s * 1.45, TRUN_Y / 2 + 0.2, TRUN_Z] }, 0.03);
    tkit.strut(STRUCT, [s * 1.45, 0.3, TRUN_Z + 0.4], [s * 1.4, TRUN_Y + 0.1, TRUN_Z + 0.05], 0.06);
    tkit.strut(STRUCT, [s * 1.1, 0.3, TRUN_Z - 0.5], [s * 1.42, TRUN_Y + 0.1, TRUN_Z], 0.06);
    tkit.cyl('galv', 0.2, 0.34, { pos: [s * 1.28, TRUN_Y + 0.2, TRUN_Z], rot: [0, 0, Math.PI / 2] }, 12);
    tkit.cyl('galv', 0.11, 0.5, { pos: [s * 1.28, TRUN_Y + 0.2, TRUN_Z], rot: [0, 0, Math.PI / 2] }, 10);
    addBoltRing(tkit, 'galv', [0, 0, 0], 0.15, 8, transform({ pos: [s * 1.63, TRUN_Y + 0.2, TRUN_Z], rot: [0, Math.PI / 2, 0] }), 0.02, 0.016);
    // rear cradle saddles the pod rests on when stowed
    tkit.box(STRUCT, 0.34, 0.52, 0.5, { pos: [s * 1.28, 0.5, 2.6] }, 0.03);
    tkit.box('galv', 0.5, 0.12, 0.62, { pos: [s * 1.28, 0.78, 2.6] }, 0.02);
    tkit.strut(STRUCT, [s * 1.28, 0.6, 2.35], [s * 1.2, 0.3, 1.3], 0.05);
    tkit.strut(STRUCT, [s * 1.28, 0.6, 2.85], [s * 1.2, 0.3, 3.8], 0.05);
  }
  tkit.box(STRUCT, 2.4, 0.3, 0.4, { pos: [0, 0.4, TRUN_Z + 0.9] }, 0.03);
  tkit.box(STRUCT, 2.4, 0.24, 0.34, { pos: [0, 0.42, 1.8] }, 0.03);
  for (let i = 0; i < 4; i++) {
    const z0 = -2.0 + i * 1.2;
    tkit.strut(STRUCT, [-1.2, 0.32, z0], [1.2, 0.32, z0 + 1.2], 0.045);
    tkit.strut(STRUCT, [1.2, 0.32, z0], [-1.2, 0.32, z0 + 1.2], 0.045);
  }
  // hose bundle up the trunnion tower
  for (const s of [-1, 1]) {
    tkit.add('darkMetal', pathTube([
      new THREE.Vector3(s * 1.1, 0.62, -3.3),
      new THREE.Vector3(s * 1.36, 0.9, -3.1),
      new THREE.Vector3(s * 1.4, TRUN_Y + 0.1, -2.9),
    ], 0.045, 5));
  }

  /* ------------------------------------------------------------------- pod */
  const pivot = new THREE.Group();
  pivot.position.set(0, TRUN_Y + 0.2, TRUN_Z);
  turn.add(pivot);
  g.userData.elevation = pivot;
  const pkit = new Kit(mats);

  // Eight round tubes carried openly in a welded space frame rather than
  // buried in a slab-sided box. The cage is what makes this vehicle
  // unmistakable next to HAWKEYE's rectangular canister block.
  const TUBE_R = 0.32;
  const TX = [-1.02, -0.34, 0.34, 1.02];
  const TY = [-0.38, 0.38];
  const FX = 1.46;
  const FY = 0.82;
  const PZ0 = 0.35;
  const PZ1 = 9.75;
  const POD_L = PZ1 - PZ0;
  const POD_Z = (PZ0 + PZ1) / 2;
  const STA = [0.5, 2.35, 4.2, 6.05, 7.9, 9.6];

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      pkit.box(BODY, 0.17, 0.17, POD_L + 0.7, { pos: [sx * FX, sy * FY, POD_Z - 0.2] }, 0.02);
      addBoltLine(pkit, 'galv', [sx * FX, sy * (FY + 0.09), PZ0 + 0.3], [sx * FX, sy * (FY + 0.09), PZ1 - 0.3], 13, [0, sy, 0], 0.02, 0.016);
    }
  }
  for (const z of STA) {
    for (const sx of [-1, 1]) pkit.box(BODY, 0.15, FY * 2, 0.17, { pos: [sx * FX, 0, z] }, 0.02);
    for (const sy of [-1, 1]) pkit.box(BODY, FX * 2, 0.15, 0.17, { pos: [0, sy * FY, z] }, 0.02);
    // spine plate threading between the two rows of tubes
    pkit.box('galv', FX * 2 - 0.2, 0.06, 0.15, { pos: [0, 0, z] }, 0.012);
  }
  for (let i = 0; i < STA.length - 1; i++) {
    const z0 = STA[i];
    const z1 = STA[i + 1];
    const up = i % 2 === 0;
    for (const sx of [-1, 1]) pkit.strut(BODY, [sx * FX, up ? -FY : FY, z0], [sx * FX, up ? FY : -FY, z1], 0.052, 6);
    for (const sy of [-1, 1]) pkit.strut(BODY, [-FX, sy * FY, z0], [FX, sy * FY, z1], 0.052, 6);
  }
  for (const z of [2.35, 6.05]) {
    for (const sx of [-1, 1]) addLug(pkit, 'galv', { pos: [sx * FX, FY + 0.09, z], s: 1.15 });
  }
  // trunnion end frame and the sooted exhaust plenum the tubes vent into
  pkit.box(STRUCT, FX * 2 + 0.3, FY * 2 + 0.3, 0.34, { pos: [0, 0, -0.05] }, 0.03);
  pkit.add(ex.scorched, cbox(FX * 2 + 0.1, FY * 2 + 0.1, 0.42, 0.05), { pos: [0, 0, 0.28] });
  for (const s of [-1, 1]) {
    pkit.cyl('galv', 0.14, 0.44, { pos: [s * 1.34, 0, -0.05], rot: [0, 0, Math.PI / 2] }, 12);
    pkit.strut(STRUCT, [s * 1.4, FY, 0.1], [s * FX, FY, 1.4], 0.05);
    pkit.strut(STRUCT, [s * 1.4, -FY, 0.1], [s * FX, -FY, 1.4], 0.05);
  }
  pkit.decal('stain', 2.9, 1.8, { pos: [0, 0, -0.24], rot: [0, Math.PI, 0] });
  // muzzle end frame with the tube numbering strips
  for (const sy of [-1, 1]) {
    pkit.box(BODY, FX * 2 + 0.18, 0.3, 0.14, { pos: [0, sy * (FY + 0.24), PZ1 - 0.1] }, 0.02);
    pkit.decal(sy < 0 ? 't_num14' : 't_num58', 2.5, 0.26, { pos: [0, sy * (FY + 0.24), PZ1 - 0.02] });
  }
  // cable and gas duct running the length of the cage into the plenum
  pkit.box(STRUCT, 0.2, 0.24, POD_L - 0.9, { pos: [-FX - 0.16, -FY + 0.3, POD_Z] }, 0.02);
  for (const z of STA) pkit.box('galv', 0.3, 0.06, 0.12, { pos: [-FX - 0.14, -FY + 0.44, z] }, 0.012);
  pkit.decal('caution', 1.05, 0.35, { pos: [-FX - 0.27, -FY + 0.3, 3.2], rot: [0, -Math.PI / 2, 0] });
  pkit.decal('stripes', 2.2, 0.19, { pos: [-FX - 0.27, -FY + 0.3, 7.0], rot: [0, -Math.PI / 2, 0] });
  pkit.decal('lift', 0.44, 0.11, { pos: [FX, FY + 0.1, 3.1], rot: [-Math.PI / 2, 0, 0] });

  const canisters = [];
  const lidPoses = [];
  for (let i = 0; i < 8; i++) {
    const cx = TX[i % 4];
    const cy = TY[Math.floor(i / 4)];
    const node = new THREE.Group();
    node.position.set(cx, cy, POD_Z);
    pivot.add(node);
    const M = transform({ pos: [cx, cy, POD_Z] });
    pkit.add(ex.tube, cylinder(TUBE_R, TUBE_R, POD_L, 14, true), compose(M, { rot: [Math.PI / 2, 0, 0] }));
    // reinforcing bands, and a saddle collar wherever a ring frame passes
    for (const z of [-3.6, -1.2, 1.2, 3.6]) {
      pkit.add('galv', new THREE.TorusGeometry(TUBE_R + 0.028, 0.03, 4, 14), compose(M, { pos: [0, 0, z] }));
    }
    for (const z of STA) {
      pkit.add('galv', new THREE.TorusGeometry(TUBE_R + 0.045, 0.045, 4, 14), compose(M, { pos: [0, 0, z - POD_Z] }));
    }
    // mouth: flange, scorched bore, internal rails
    pkit.add('galv', new THREE.TorusGeometry(TUBE_R + 0.05, 0.05, 5, 14), compose(M, { pos: [0, 0, POD_L / 2 - 0.03] }));
    pkit.add(ex.scorched, insideOut(cylinder(TUBE_R - 0.015, TUBE_R - 0.015, 1.7, 14, true)), compose(M, { pos: [0, 0, POD_L / 2 - 0.88], rot: [Math.PI / 2, 0, 0] }));
    pkit.add(ex.scorched, new THREE.CircleGeometry(TUBE_R - 0.015, 14), compose(M, { pos: [0, 0, POD_L / 2 - 1.73] }));
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * Math.PI * 2;
      pkit.add('galv', cbox(0.07, 0.05, 1.5, 0.01), compose(M, { pos: [Math.cos(a) * (TUBE_R - 0.055), Math.sin(a) * (TUBE_R - 0.055), POD_L / 2 - 0.85], rot: [0, 0, a + Math.PI / 2] }));
    }
    // exhaust port through the rear plenum face
    pkit.add(ex.scorched, insideOut(cylinder(TUBE_R - 0.03, TUBE_R - 0.03, 0.4, 12, true)), compose(M, { pos: [0, 0, -POD_L / 2 - 0.1], rot: [Math.PI / 2, 0, 0] }));
    lidPoses.push({ pos: [cx, cy, POD_Z + POD_L / 2 + 0.05] });
    canisters.push({ node, lid: null, loaded: true, index: i });
  }

  {
    // dished frangible cap: lathe profile tipped from +Y to +Z, plus a
    // retaining ring and eight bolt heads
    const cap = latheProfile([[0.001, 0.13], [TUBE_R * 0.6, 0.1], [TUBE_R * 0.95, 0.03], [TUBE_R + 0.03, 0.0], [TUBE_R + 0.03, -0.07], [TUBE_R - 0.05, -0.07]], 14);
    cap.rotateX(Math.PI / 2);
    const lidParts = [{ geometry: cap }, { geometry: new THREE.TorusGeometry(TUBE_R + 0.03, 0.03, 5, 14) }];
    const bolt = cylinder(0.021, 0.018, 0.03, 6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      lidParts.push({ geometry: bolt, matrix: transform({ pos: [Math.cos(a) * (TUBE_R + 0.03), Math.sin(a) * (TUBE_R + 0.03), 0.02], rot: [Math.PI / 2, 0, 0] }) });
    }
    const shaped = mergeParts(lidParts);
    bolt.dispose();
    lidParts.forEach((p) => p.geometry.dispose());
    const proxies = lidSet(pivot, shaped, mats.sandMetal, lidPoses);
    canisters.forEach((c, i) => (c.lid = proxies[i]));
  }

  g.userData.canisters = canisters;
  g.userData.launchLocal = canisters.map((c) => new THREE.Vector3(c.node.position.x, c.node.position.y, POD_Z + POD_L / 2 + 0.2));

  /* ------------------------------------------------------------------ rams */
  const rams = ramPair(turn, mats, {
    base: [1.0, 0.28, -3.4],
    attach: [1.0, -FY - 0.09, 2.35],
    pivot: [0, TRUN_Y + 0.2, TRUN_Z],
    barrel: 1.85,
    rodLen: 2.4,
    r: 0.12,
  });
  g.userData.rams = [rams.barrels];

  /* -------------------------------------------------- rear blast deflector */
  const deflNode = new THREE.Group();
  deflNode.position.set(0, 1.15, ZR + 0.3);
  g.add(deflNode);
  const dkit = new Kit(mats);
  dkit.add(ex.scorched, cbox(3.2, 0.12, 2.5, 0.04), { pos: [0, 0, 1.25] });
  for (const s of [-1, 1]) {
    dkit.add(ex.scorched, cbox(0.14, 0.3, 2.4, 0.02), { pos: [s * 1.45, 0.2, 1.25] });
    dkit.strut(ex.scorched, [s * 1.3, 0.06, 0.2], [s * 1.3, 0.36, 2.1], 0.04);
  }
  for (let i = 0; i < 5; i++) {
    dkit.add(ex.scorched, cbox(3.0, 0.15, 0.11, 0.02), { pos: [0, 0.12, 0.35 + i * 0.55] });
  }
  dkit.decal('scorch2', 2.9, 2.3, { pos: [0, 0.085, 1.25], rot: [-Math.PI / 2, 0, 0] });
  dkit.decal('t_defl', 1.0, 0.25, { pos: [0, 0.09, 0.26], rot: [-Math.PI / 2, 0, 0] });
  dkit.emit(deflNode);
  for (const s of [-1, 1]) {
    kit.cyl('galv', 0.09, 0.4, { pos: [s * 1.2, 1.15, ZR + 0.3], rot: [0, 0, Math.PI / 2] }, 8);
  }

  /* --------------------------------------------------- cable run + lighting */
  kit.add('rubber', pathTube([
    new THREE.Vector3(-0.6, 3.0, -3.72),
    new THREE.Vector3(-0.9, 2.3, -3.2),
    new THREE.Vector3(-1.1, DECK + 0.2, -2.4),
    new THREE.Vector3(-1.2, DECK + 0.12, -0.4),
  ], 0.06, 6));
  kit.add('rubber', pathTube([
    new THREE.Vector3(-0.72, 3.0, -3.72),
    new THREE.Vector3(-1.0, 2.3, -3.15),
    new THREE.Vector3(-1.2, DECK + 0.2, -2.4),
    new THREE.Vector3(-1.3, DECK + 0.12, -0.4),
  ], 0.045, 5));
  kit.box('darkMetal', 0.36, 0.42, 0.3, { pos: [-1.25, DECK + 0.34, -0.1] }, 0.02);
  // umbilical bundle off the trunnion tower into the pod's side duct
  pkit.add('rubber', pathTube([
    new THREE.Vector3(-1.5, -0.62, 0.2),
    new THREE.Vector3(-1.62, -0.6, 0.9),
    new THREE.Vector3(-1.62, -0.52, 1.6),
  ], 0.055, 6));
  pkit.box(STRUCT, 0.28, 0.34, 0.3, { pos: [-1.62, -0.46, 1.85] }, 0.02);

  const panel = statusLights(kit, 'darkMetal', 0xffc46b, [
    { pos: [-1.82, 1.45, -1.0], rot: [0, -Math.PI / 2, 0] },
    { pos: [1.82, 1.45, 3.2], rot: [0, Math.PI / 2, 0] },
  ]);
  g.add(panel);
  g.userData.panel = panel;

  kit.emit(g);
  tkit.emit(turn);
  pkit.emit(pivot);

  g.userData.animate = (t, launcher) => {
    rams.solve(launcher.currentElevation);
    // Stowed the deflector lies along the chassis; deployed it drops to a
    // ramp so the pad behind the truck is shielded.
    deflNode.rotation.x = -0.12 + t * 0.58;
  };

  g.userData.restElevation = 0;
  g.userData.fireElevation = 52 * DEG;
  g.userData.colliders = [
    { type: 'box', pos: [0, 0.85, 0.6], half: [1.7, 0.85, 5.2], walkable: true },
    { type: 'box', pos: [0, 2.55, -5.4], half: [1.4, 1.2, 1.8], walkable: false },
    { type: 'box', pos: [0, 2.5, -1.3], half: [1.7, 0.8, 0.95], walkable: false },
    { type: 'box', pos: [0, 3.35, 3.5], half: [1.66, 1.15, 5.0], walkable: false },
    { type: 'box', pos: [0, 1.4, 7.2], half: [1.66, 0.6, 1.4], walkable: false },
  ];
  return g;
}

/* ================================================ SENTINEL (fully invented) */

/**
 * IRONWOOD 3 — heavy multi-axle semi-trailer carrying twin oversized rounds on
 * a lattice erector, with a service gantry, cryogenic servicing lines,
 * umbilical masts and ground power cabinets standing beside it on the pad.
 */
function buildSentinelLauncher(rng) {
  const mats = lib();
  const ex = extras();
  const g = new THREE.Group();
  g.name = 'launcher.SENTINEL';
  const kit = new Kit(mats);
  const BODY = ex.slate;

  const DECK = 1.55;
  const ZF = -7.4;
  const ZR = 7.3;

  /* --------------------------------------------------- open-truss trailer */
  // No side plating: the chords, posts and diagonals are the whole beam, so
  // daylight shows through the trailer and it never reads as a concrete kerb.
  for (const s of [-1, 1]) {
    const x = s * 1.72;
    kit.box(BODY, 0.36, 0.2, ZR - ZF, { pos: [x, DECK - 0.12, (ZF + ZR) / 2] }, 0.03);
    kit.box(BODY, 0.36, 0.22, ZR - ZF, { pos: [x, DECK - 1.02, (ZF + ZR) / 2] }, 0.03);
    for (let i = 0; i <= 12; i++) {
      const z = ZF + 0.4 + (i / 12) * (ZR - ZF - 0.8);
      kit.box(BODY, 0.22, 0.72, 0.18, { pos: [x, DECK - 0.57, z] }, 0.02);
      if (i < 12) {
        const z1 = ZF + 0.4 + ((i + 1) / 12) * (ZR - ZF - 0.8);
        kit.strut('galv', [x, DECK - 0.92, i % 2 ? z1 : z], [x, DECK - 0.22, i % 2 ? z : z1], 0.055, 6);
      }
    }
    addBoltLine(kit, 'galv', [x + s * 0.18, DECK - 0.12, ZF + 0.5], [x + s * 0.18, DECK - 0.12, ZR - 0.5], 14, [s, 0, 0], 0.026, 0.02);
    // plated equipment lockers double as the only flat flanks for markings
    for (const [bz, bl] of [[-5.6, 2.2], [-0.4, 2.6]]) {
      const M = transform({ pos: [x + s * 0.2, DECK - 0.62, bz], rot: [0, s * Math.PI * 0.5, 0] });
      kit.add(BODY, cbox(bl, 0.66, 0.24, 0.03), M);
      kit.add('galv', cbox(bl - 0.1, 0.05, 0.06, 0.012), compose(M, { pos: [0, 0.28, 0.13] }));
      kit.add('galv', cbox(0.05, 0.54, 0.06, 0.012), compose(M, { pos: [0, 0, 0.13] }));
      for (const hz of [-1, 1]) {
        kit.add('galv', cbox(0.1, 0.14, 0.09, 0.012), compose(M, { pos: [hz * bl * 0.3, -0.18, 0.15] }));
      }
      addGrabHandle(kit, 'galv', compose(M, { pos: [bl * 0.36, 0.05, 0.14] }), { len: 0.28, vertical: true });
    }
  }
  for (let i = 0; i <= 12; i++) {
    const z = ZF + 0.4 + (i / 12) * (ZR - ZF - 0.8);
    kit.box(BODY, 3.3, 0.16, 0.18, { pos: [0, DECK - 0.98, z] }, 0.02);
  }
  kit.box(BODY, 3.7, 0.18, ZR - ZF, { pos: [0, DECK - 0.09, (ZF + ZR) / 2] }, 0.04);
  for (const s of [-1, 1]) {
    kit.box(BODY, 0.1, 0.2, ZR - ZF - 0.2, { pos: [s * 1.88, DECK + 0.1, (ZF + ZR) / 2] }, 0.02);
  }
  for (let i = 0; i < 9; i++) {
    for (const s of [-1, 1]) kit.decal('tread', 0.62, 0.66, { pos: [s * 1.5, DECK + 0.015, -3.0 + i * 0.7], rot: [-Math.PI / 2, 0, 0] });
  }

  // gooseneck and kingpin
  kit.box(BODY, 3.1, 0.9, 2.1, { pos: [0, DECK + 0.4, ZF + 1.0] }, 0.05);
  kit.box(BODY, 2.6, 0.4, 1.9, { pos: [0, DECK - 0.6, ZF + 1.0] }, 0.04);
  kit.cyl('galv', 0.14, 0.34, { pos: [0, DECK - 0.94, ZF + 1.1] }, 10);
  kit.box('galv', 1.4, 0.09, 1.4, { pos: [0, DECK - 0.83, ZF + 1.1] }, 0.02);
  kit.add(BODY, greebles(1.8, 0.6, rng, { count: 12, maxSize: 0.22, depth: 0.07 }), { pos: [0, DECK + 0.42, ZF - 0.06], rot: [0, Math.PI, 0] });
  for (const s of [-1, 1]) {
    // landing legs
    kit.box(BODY, 0.26, 1.0, 0.26, { pos: [s * 1.3, DECK - 1.05, ZF + 2.4] }, 0.02);
    kit.add('galv', ribbedTube(0.6, 0.075, 6, 1.16, 8), { pos: [s * 1.3, DECK - 1.75, ZF + 2.4] });
    kit.box('galv', 0.5, 0.09, 0.5, { pos: [s * 1.3, 0.05, ZF + 2.4] }, 0.02);
    kit.cyl('galv', 0.022, 0.34, { pos: [s * 1.5, DECK - 0.8, ZF + 2.4], rot: [0, 0, Math.PI / 2] }, 6);
    kit.cyl('galv', 0.03, 0.14, { pos: [s * 1.66, DECK - 0.86, ZF + 2.4] }, 6);
  }

  /* --------------------------------------------------------- running gear */
  const SINGLES = [-2.9, -1.4];
  const DUALS = [3.6, 5.1, 6.6];
  for (const z of SINGLES) {
    kit.cyl('galv', 0.12, 3.7, { pos: [0, 0.78, z], rot: [0, 0, Math.PI / 2] }, 8);
    for (const s of [-1, 1]) {
      addRoadWheel(kit, BODY, { pos: [s * 1.78, 0.78, z], r: 0.78, width: 0.44, side: s, lugs: 8 });
      addFender(kit, BODY, { pos: [s * 1.78, 0.78, z], r: 0.98, width: 0.56, arc: 2.0, segs: 5, flap: 0.3 });
    }
  }
  for (const z of DUALS) {
    kit.cyl('galv', 0.13, 3.9, { pos: [0, 0.78, z], rot: [0, 0, Math.PI / 2] }, 8);
    for (const s of [-1, 1]) {
      kit.add(ex.tyre, tyreGeo(0.78, 0.4), { pos: [s * 1.55, 0.78, z] });
      addRoadWheel(kit, BODY, { pos: [s * 1.95, 0.78, z], r: 0.78, width: 0.4, side: s, lugs: 8 });
      kit.box('galv', 0.14, 0.06, 1.5, { pos: [s * 1.3, 1.02, 5.1] }, 0.015);
    }
  }
  for (const s of [-1, 1]) {
    addFender(kit, BODY, { pos: [s * 1.75, 0.78, 4.35], r: 1.0, width: 1.05, arc: 1.5, segs: 5 });
    addFender(kit, BODY, { pos: [s * 1.75, 0.78, 6.6], r: 1.0, width: 1.05, arc: 1.9, segs: 5, flap: 0.36 });
  }

  /* ------------------------------------------------------- stabiliser set */
  for (const z of [-3.9, 1.8, 6.9]) {
    for (const s of [-1, 1]) addOutrigger(kit, BODY, 'galv', { pos: [s * 1.82, DECK - 0.78, z], out: 0.85, drop: 0.8, side: s });
  }

  /* --------------------------------------------- ground power cabinets */
  // Olive kit standing on the pad beside the graphite trailer, so the support
  // equipment reads as separate hardware rather than part of the vehicle.
  for (const [cx, cz, label] of [[-6.1, 0.9, 'gpower'], [-6.1, 2.7, null], [6.3, -1.6, null]]) {
    const sx = Math.sign(cx);
    const face = -sx * Math.PI * 0.5;
    const M = transform({ pos: [cx, 0.95, cz], rot: [0, face, 0] });
    kit.add('oliveMetal', cbox(1.0, 1.4, 0.66, 0.04), M);
    // overhanging weather roof and a skid base clear of the concrete
    kit.add('oliveMetal', cbox(1.14, 0.08, 0.8, 0.02), compose(M, { pos: [0, 0.74, 0] }));
    kit.add('oliveMetal', cbox(1.14, 0.06, 0.8, 0.02), compose(M, { pos: [0, 0.82, -0.05], rot: [0.09, 0, 0] }));
    kit.add('galv', cbox(1.16, 0.09, 0.86, 0.02), compose(M, { pos: [0, -0.75, 0] }));
    for (const bx of [-1, 1]) kit.add('galv', cbox(0.14, 0.16, 0.86, 0.02), compose(M, { pos: [bx * 0.44, -0.86, 0] }));
    addLouvres(kit, 'oliveMetal', compose(M, { pos: [0, 0.24, 0.34] }), { w: 0.74, h: 0.46, count: 6, depth: 0.04 });
    // the instrument face and labels live on the door, which faces the trailer
    kit.decal('dials', 0.6, 0.3, { pos: [cx - sx * 0.34, 0.72, cz], rot: [0, face, 0] });
    addGrabHandle(kit, 'galv', compose(M, { pos: [0.34, -0.36, 0.35] }), { len: 0.26, vertical: true });
    // gland plate, isolator handle and a warning beacon on the roof
    kit.add('galv', cbox(0.34, 0.24, 0.08, 0.015), compose(M, { pos: [-0.3, -0.5, 0.35] }));
    kit.add('galv', cylinder(0.024, 0.024, 0.22, 6), compose(M, { pos: [0.42, 0.44, 0.36], rot: [0, 0, 0.5] }));
    kit.add('darkMetal', cylinder(0.07, 0.07, 0.1, 8), compose(M, { pos: [0.34, 0.9, 0] }));
    kit.add('galv', cbox(1.02, 0.16, 0.68, 0.02), compose(M, { pos: [0, -0.62, 0] }));
    kit.decal('stripes', 0.98, 0.14, { pos: [cx - sx * 0.34, 0.33, cz], rot: [0, face, 0] });
    kit.decal(label || 'caution', 0.86, 0.29, { pos: [cx - sx * 0.34, 1.2, cz], rot: [0, face, 0] });
    // feeder cable snaking across the pad into the trailer
    kit.add('rubber', pathTube([
      new THREE.Vector3(cx - sx * 0.36, 0.28, cz),
      new THREE.Vector3(cx - sx * 1.3, 0.09, cz + 0.5),
      new THREE.Vector3(sx * 2.6, 0.09, cz + 1.0),
      new THREE.Vector3(sx * 1.9, DECK - 0.7, cz + 1.2),
    ], 0.06, 6));
  }

  /* ------------------------------------------------------- service gantry */
  // Sits alongside the forward end of the rounds and stays with the trailer;
  // once the erector lifts, the rounds swing up clear of it.
  const GZ = [4.5, 6.3];
  for (const z of GZ) kit.add('galv', trussSegment(1.0, 5.0, 0.062), { pos: [-2.8, DECK + 0.02, z] });
  for (const y of [2.3, 4.3]) {
    kit.box('galv', 1.5, 0.08, 2.6, { pos: [-2.4, DECK + y, 5.4] }, 0.02);
    for (let i = 0; i < 4; i++) kit.decal('tread', 0.66, 0.62, { pos: [-2.4, DECK + y + 0.05, 4.4 + i * 0.66], rot: [-Math.PI / 2, 0, 0] });
    kit.add('galv', handrail([
      new THREE.Vector3(-3.1, 0, 4.15),
      new THREE.Vector3(-3.1, 0, 6.7),
      new THREE.Vector3(-1.72, 0, 6.7),
    ], 1.02), { pos: [0, DECK + y + 0.04, 0] });
    kit.box('galv', 1.5, 0.12, 0.06, { pos: [-2.4, DECK + y + 0.1, 4.14] }, 0.015);
  }
  kit.add('galv', ladder(2.3, 0.46), { pos: [-3.1, DECK + 0.1, 5.4], rot: [0, Math.PI / 2, 0] });
  kit.add('galv', ladder(2.1, 0.46), { pos: [-3.1, DECK + 2.35, 5.4], rot: [0, Math.PI / 2, 0] });
  kit.strut('galv', [-2.35, DECK + 5.0, GZ[0]], [-2.35, DECK + 5.0, GZ[1]], 0.055);
  kit.strut('galv', [-3.25, DECK + 5.0, GZ[0]], [-3.25, DECK + 5.0, GZ[1]], 0.055);
  kit.strut('galv', [-2.8, DECK + 5.0, GZ[0]], [-1.9, DECK + 4.5, 5.4], 0.05);
  kit.decal('nostep', 0.5, 0.13, { pos: [-2.4, DECK + 4.36, 6.3], rot: [-Math.PI / 2, 0, 0] });

  /* ------------------------------------- cryo / gas service and umbilicals */
  const manM = transform({ pos: [2.05, DECK + 0.62, 2.6], rot: [0, -Math.PI / 2, 0] });
  kit.add(BODY, cbox(1.5, 1.05, 0.5, 0.03), manM);
  kit.add('galv', cylinder(0.13, 0.13, 1.3, 12), compose(manM, { pos: [0, 0.18, 0.34], rot: [0, 0, Math.PI / 2] }));
  for (let i = 0; i < 3; i++) {
    const x = -0.45 + i * 0.45;
    kit.add('galv', cylinder(0.06, 0.06, 0.28, 8), compose(manM, { pos: [x, 0.4, 0.34] }));
    kit.add('galv', valveWheel(0.13), compose(manM, { pos: [x, 0.56, 0.34], rot: [Math.PI / 2, 0, 0] }));
    kit.add('galv', cylinder(0.05, 0.05, 0.4, 8), compose(manM, { pos: [x, -0.35, 0.34] }));
  }
  kit.decal('cryo', 0.78, 0.26, { pos: [1.78, DECK + 0.36, 2.6], rot: [0, -Math.PI / 2, 0] });
  // insulated lines running up to the canisters
  const lineA = pathTube([
    new THREE.Vector3(1.9, DECK + 0.5, 2.05),
    new THREE.Vector3(1.55, DECK + 0.9, 1.5),
    new THREE.Vector3(1.4, DECK + 1.5, 1.0),
    new THREE.Vector3(1.35, DECK + 1.85, 0.4),
  ], 0.1, 8);
  kit.add(ex.insulation, lineA);
  const lineB = pathTube([
    new THREE.Vector3(2.05, DECK + 0.3, 2.05),
    new THREE.Vector3(1.75, DECK + 0.6, 1.3),
    new THREE.Vector3(1.6, DECK + 1.2, 0.7),
    new THREE.Vector3(1.5, DECK + 1.6, 0.1),
  ], 0.075, 8);
  kit.add(ex.insulation, lineB);
  for (let i = 0; i < 5; i++) {
    kit.add('galv', new THREE.TorusGeometry(0.115, 0.022, 4, 10), { pos: [1.42 + i * 0.02, DECK + 0.75 + i * 0.3, 1.7 - i * 0.35], rot: [1.0, 0, 0] });
  }

  /* ------------------------------------------------------------ turntable */
  const turn = new THREE.Group();
  turn.position.set(0, DECK + 0.07, 1.0);
  g.add(turn);
  g.userData.azimuth = turn;
  const tkit = new Kit(mats);

  kit.cyl('galv', 1.78, 0.12, { pos: [0, DECK + 0.06, 1.0] }, 26, 1.82);
  addBoltRing(kit, 'galv', [0, DECK + 0.13, 1.0], 1.7, 26, transform({ rot: [-Math.PI / 2, 0, 0] }), 0.028, 0.022);

  tkit.cyl(BODY, 1.7, 0.28, { pos: [0, 0.14, 0] }, 26, 1.62);
  tkit.cyl(BODY, 1.2, 0.34, { pos: [0, 0.3, 0] }, 20, 1.35);
  const TRUN_Y = 1.13;
  const TRUN_Z = -3.4;
  tkit.box(BODY, 3.0, 0.34, 0.46, { pos: [0, 0.28, -4.05] }, 0.03);
  for (const s of [-1, 1]) {
    tkit.box(BODY, 0.34, 0.42, 5.0, { pos: [s * 1.3, 0.32, -1.7] }, 0.03);
    tkit.box(BODY, 0.36, TRUN_Y + 0.2, 0.8, { pos: [s * 1.4, (TRUN_Y + 0.2) / 2 + 0.22, TRUN_Z] }, 0.03);
    tkit.strut(BODY, [s * 1.45, 0.36, TRUN_Z + 0.55], [s * 1.4, TRUN_Y + 0.2, TRUN_Z + 0.05], 0.07);
    tkit.strut(BODY, [s * 1.0, 0.36, TRUN_Z - 0.55], [s * 1.38, TRUN_Y + 0.2, TRUN_Z], 0.07);
    tkit.strut(BODY, [s * 1.45, 0.36, TRUN_Z + 1.6], [s * 1.42, TRUN_Y, TRUN_Z + 0.3], 0.06);
    tkit.cyl('steel', 0.24, 0.4, { pos: [s * 1.2, TRUN_Y + 0.22, TRUN_Z], rot: [0, 0, Math.PI / 2] }, 14);
    tkit.cyl('steel', 0.12, 0.6, { pos: [s * 1.2, TRUN_Y + 0.22, TRUN_Z], rot: [0, 0, Math.PI / 2] }, 10);
    addBoltRing(tkit, 'steel', [0, 0, 0], 0.18, 10, transform({ pos: [s * 1.61, TRUN_Y + 0.22, TRUN_Z], rot: [0, Math.PI / 2, 0] }), 0.022, 0.018);
    // saddle the cradle drops onto when stowed
    tkit.box(BODY, 0.4, 0.5, 0.6, { pos: [s * 1.35, 0.6, 2.6] }, 0.03);
    tkit.box('steel', 0.6, 0.12, 0.7, { pos: [s * 1.35, 0.9, 2.6], rot: [0, 0, s * 0.2] }, 0.02);
  }
  tkit.box(BODY, 2.9, 0.34, 0.5, { pos: [0, 0.42, TRUN_Z + 1.1] }, 0.03);
  tkit.box(BODY, 2.9, 0.28, 0.4, { pos: [0, 0.44, 1.6] }, 0.03);
  for (let i = 0; i < 4; i++) {
    const z0 = TRUN_Z + 1.3 + i * 1.2;
    tkit.strut(BODY, [-1.35, 0.34, z0], [1.35, 0.34, z0 + 1.2], 0.05);
    tkit.strut(BODY, [1.35, 0.34, z0], [-1.35, 0.34, z0 + 1.2], 0.05);
  }

  /* ------------------------------------------------- lattice erector + rounds */
  const pivot = new THREE.Group();
  pivot.position.set(0, TRUN_Y + 0.22, TRUN_Z);
  turn.add(pivot);
  g.userData.elevation = pivot;
  const pkit = new Kit(mats);

  const CRADLE_L = 10.4;
  pkit.add('galv', latticeBeam(CRADLE_L, 3.1, 1.45, 9, 0.062), { pos: [0, -1.0, -0.9] });
  pkit.add('galv', cbox(3.2, 0.5, 0.7, 0.03), { pos: [0, -0.62, -0.75] });
  for (const s of [-1, 1]) {
    pkit.cyl('galv', 0.16, 0.7, { pos: [s * 1.5, -0.4, -0.72], rot: [0, 0, Math.PI / 2] }, 10);
    pkit.strut('galv', [s * 1.45, -0.3, -0.5], [s * 1.0, 0.15, 0.7], 0.06);
    // Outboard erector truss: the rounds sit inside a triangulated beam that
    // is taller than they are, so the structure reads from a side profile
    // instead of hiding under them.
    const TY0 = -0.28;
    const TY1 = 1.62;
    const TZ = [0.6, 2.4, 4.2, 6.0, 7.8, 9.3];
    pkit.strut('galv', [s * 1.88, TY1, TZ[0]], [s * 1.88, TY1, TZ[TZ.length - 1]], 0.075, 6);
    for (let i = 0; i < TZ.length; i++) {
      pkit.strut('galv', [s * 1.88, TY0, TZ[i]], [s * 1.88, TY1, TZ[i]], 0.055, 5);
      if (i < TZ.length - 1) {
        const up = i % 2 === 0;
        pkit.strut('galv', [s * 1.88, up ? TY0 : TY1, TZ[i]], [s * 1.88, up ? TY1 : TY0, TZ[i + 1]], 0.05, 5);
      }
      // ties back to the round's saddle line
      pkit.strut('galv', [s * 1.88, TY1, TZ[i]], [s * 1.15, 1.34, TZ[i]], 0.038, 5);
    }
    pkit.decal('lift', 0.5, 0.13, { pos: [s * 1.96, TY1 + 0.1, 4.2], rot: [0, s * Math.PI * 0.5, 0] });
  }

  const CAN_R = 0.85;
  const CAN_L = 8.4;
  const CAN_Z = CAN_L / 2 + 0.55;
  const canisters = [];
  const lidPoses = [];
  for (let i = 0; i < 2; i++) {
    const cx = i === 0 ? -0.98 : 0.98;
    const cy = 0.62;
    const node = new THREE.Group();
    node.position.set(cx, cy, CAN_Z);
    pivot.add(node);
    const M = transform({ pos: [cx, cy, CAN_Z] });
    pkit.add(ex.bone, cylinder(CAN_R, CAN_R, CAN_L, 20), compose(M, { rot: [Math.PI / 2, 0, 0] }));
    // Skin stiffeners are painted with the round; every other fitting on the
    // canister is bare weathered steel, so the hardware reads as hardware
    // instead of dissolving into the bone paint at arm's length.
    for (let k = 0; k < 7; k++) {
      const rz = -3.4 + k * 1.15;
      // A rolled band, not a torus: a round-section hoop catches one bright
      // facet along its whole length and reads as wire laid over the skin.
      pkit.add(ex.bone, cylinder(CAN_R + 0.04, CAN_R + 0.04, 0.15, 20), compose(M, { pos: [0, 0, rz], rot: [Math.PI / 2, 0, 0] }));
      addBoltRing(pkit, ex.scorched, [0, 0, rz], CAN_R + 0.1, 10, M, 0.022, 0.016);
    }
    // range-marking bands: a test article is banded, not camouflaged. Only
    // the forward band is painted; the tail end is soot country.
    for (const z of [-2.9, 3.75]) {
      pkit.add(ex.hazard, cylinder(CAN_R + 0.015, CAN_R + 0.015, 0.5, 20), compose(M, { pos: [0, 0, z], rot: [Math.PI / 2, 0, 0] }));
    }
    // lagged servicing collar and a valve block near the tail
    pkit.add(ex.insulation, cylinder(CAN_R + 0.11, CAN_R + 0.11, 1.05, 20), compose(M, { pos: [0, 0, -1.7], rot: [Math.PI / 2, 0, 0] }));
    for (const z of [-2.2, -1.2]) {
      pkit.add(ex.scorched, new THREE.TorusGeometry(CAN_R + 0.12, 0.035, 4, 18), compose(M, { pos: [0, 0, z] }));
    }
    pkit.add(ex.scorched, cbox(0.4, 0.34, 0.5, 0.02), compose(M, { pos: [cx < 0 ? -CAN_R - 0.12 : CAN_R + 0.12, 0.16, -2.2] }));
    pkit.add('galv', valveWheel(0.12), compose(M, { pos: [cx < 0 ? -CAN_R - 0.34 : CAN_R + 0.34, 0.3, -2.2], rot: [0, Math.PI / 2, 0] }));
    // mouth flange and scorched bore behind the frangible nose cover
    pkit.add('galv', new THREE.TorusGeometry(CAN_R + 0.04, 0.055, 5, 20), compose(M, { pos: [0, 0, CAN_L / 2 - 0.03] }));
    pkit.add(ex.scorched, insideOut(cylinder(CAN_R - 0.03, CAN_R - 0.03, 1.4, 20, true)), compose(M, { pos: [0, 0, CAN_L / 2 - 0.75], rot: [Math.PI / 2, 0, 0] }));
    pkit.add(ex.scorched, new THREE.CircleGeometry(CAN_R - 0.03, 20), compose(M, { pos: [0, 0, CAN_L / 2 - 1.45] }));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      pkit.add('galv', cbox(0.1, 0.07, 1.3, 0.012), compose(M, { pos: [Math.cos(a) * (CAN_R - 0.11), Math.sin(a) * (CAN_R - 0.11), CAN_L / 2 - 0.72], rot: [0, 0, a + Math.PI / 2] }));
    }
    addBoltRing(pkit, 'galv', [0, 0, CAN_L / 2 + 0.01], CAN_R + 0.11, 14, M, 0.022, 0.016);
    // scorched rear closure
    pkit.add(ex.scorched, cylinder(CAN_R - 0.02, CAN_R - 0.02, 0.24, 20), compose(M, { pos: [0, 0, -CAN_L / 2 + 0.1], rot: [Math.PI / 2, 0, 0] }));
    pkit.add(ex.scorched, new THREE.TorusGeometry(CAN_R + 0.03, 0.07, 5, 20), compose(M, { pos: [0, 0, -CAN_L / 2 + 0.06] }));
    pkit.decal('stain', 1.5, 1.5, { pos: [cx, cy, CAN_Z - CAN_L / 2 - 0.03], rot: [0, Math.PI, 0] });
    // Saddle bands tying the round into the lattice. These close all the way
    // round: a part-circle band leaves an open hook silhouette that reads as
    // broken geometry rather than a clamp.
    for (const z of [-2.9, 0.2, 3.2]) {
      pkit.add(ex.scorched, new THREE.TorusGeometry(CAN_R + 0.09, 0.075, 5, 18), compose(M, { pos: [0, 0, z] }));
      for (const bs of [-1, 1]) {
        pkit.add(ex.scorched, cbox(0.1, 0.22, 0.19, 0.02), compose(M, { pos: [bs * (CAN_R + 0.14), -0.02, z] }));
      }
      pkit.strut('galv', [cx + (cx < 0 ? -0.85 : 0.85), cy - 0.35, CAN_Z + z], [cx + (cx < 0 ? -1.35 : 1.35), -0.3, CAN_Z + z], 0.05);
      pkit.strut('galv', [cx, cy - CAN_R - 0.02, CAN_Z + z], [cx * 0.55, -0.3, CAN_Z + z], 0.05);
    }
    const sx = cx < 0 ? -1 : 1;
    // Stencils ride the skin. `phi` is the clock angle up from the flank
    // centreline, so a marking placed high still sits tangent to the round
    // rather than cutting a chord through it.
    const SR = CAN_R + 0.03;
    const stencil = (name, w, h, z, phi) =>
      pkit.wrapDecal(name, w, h, SR, compose(compose(M, { rot: [0, 0, sx * phi] }), { pos: [sx * SR, 0, z], rot: [0, sx * Math.PI * 0.5, 0] }));
    stencil('s_testlong', 2.7, 0.56, 1.75, 0.06);
    stencil(`s_rd${i + 1}`, 1.0, 0.26, -0.6, 0.44);
    stencil('stripes', 1.3, 0.15, -0.6, -0.46);
    lidPoses.push({ pos: [cx, cy, CAN_Z + CAN_L / 2 + 0.02] });
    canisters.push({ node, lid: null, loaded: true, index: i });
  }

  {
    const cap = latheProfile([[0.001, 0.34], [0.26, 0.29], [0.5, 0.18], [0.68, 0.05], [0.72, 0.0], [0.72, -0.08], [0.66, -0.08]], 20);
    cap.rotateX(Math.PI / 2);
    const lidParts = [
      { geometry: cap },
      { geometry: new THREE.TorusGeometry(0.72, 0.045, 5, 18) },
      { geometry: new THREE.TorusGeometry(0.42, 0.03, 4, 16), matrix: transform({ pos: [0, 0, 0.15] }) },
    ];
    // radial stiffeners so the cover is obviously a pressed cap, not a disc
    const rib = cbox(0.05, 0.7, 0.055, 0.012);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      lidParts.push({ geometry: rib, matrix: transform({ pos: [0, 0, 0.08], rot: [0, 0, a] }) });
    }
    const bolt = cylinder(0.024, 0.02, 0.032, 6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      lidParts.push({ geometry: bolt, matrix: transform({ pos: [Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.02], rot: [Math.PI / 2, 0, 0] }) });
    }
    const lidGeo = mergeParts(lidParts);
    bolt.dispose();
    rib.dispose();
    lidParts.forEach((p) => p.geometry.dispose());
    const proxies = lidSet(pivot, lidGeo, ex.bone, lidPoses);
    canisters.forEach((c, i) => (c.lid = proxies[i]));
  }

  g.userData.canisters = canisters;
  g.userData.launchLocal = canisters.map((c) => new THREE.Vector3(c.node.position.x, c.node.position.y, CAN_Z + CAN_L / 2 + 0.6));

  /* ------------------------------------------------------------------ rams */
  const rams = ramPair(turn, mats, {
    base: [1.15, 0.05, -4.0],
    attach: [1.15, -0.7, 2.9],
    pivot: [0, TRUN_Y + 0.22, TRUN_Z],
    barrel: 2.8,
    rodLen: 1.9,
    r: 0.135,
  });
  g.userData.rams = [rams.barrels];

  /* --------------------------------------------------- umbilical masts */
  const umbNode = new THREE.Group();
  umbNode.position.set(0, DECK + 3.2, -1.4);
  g.add(umbNode);
  const ukit = new Kit(mats);
  for (const s of [-1, 1]) {
    // mast stays with the trailer, standing clear of the erector truss
    kit.box('galv', 0.22, 3.3, 0.22, { pos: [s * 2.26, DECK + 1.65, -1.4] }, 0.02);
    kit.strut('galv', [s * 2.26, DECK + 3.0, -1.4], [s * 1.95, DECK + 0.3, -2.5], 0.045);
    kit.strut('galv', [s * 2.26, DECK + 1.6, -1.4], [s * 1.95, DECK + 0.3, -0.4], 0.045);
    kit.box('darkMetal', 0.34, 0.5, 0.3, { pos: [s * 2.26, DECK + 3.05, -1.4] }, 0.02);
    // swing arm and umbilical drop carried on the moving node
    ukit.strut('galv', [s * 2.24, 0, 0], [s * 1.3, 0.16, 0.9], 0.05);
    ukit.box('galv', 0.36, 0.3, 0.4, { pos: [s * 1.22, 0.18, 1.0] }, 0.02);
    ukit.add('rubber', cableGeometry(new THREE.Vector3(s * 2.2, -0.05, 0.08), new THREE.Vector3(s * 1.24, 0.1, 0.9), 0.28, 0.045, 12, 5));
    ukit.add('rubber', cableGeometry(new THREE.Vector3(s * 2.16, -0.12, 0.16), new THREE.Vector3(s * 1.2, 0.02, 0.95), 0.34, 0.032, 12, 5));
  }
  ukit.emit(umbNode);

  /* -------------------------------------------------- scorched deflector */
  const deflNode = new THREE.Group();
  deflNode.position.set(0, DECK - 0.2, ZR + 0.1);
  g.add(deflNode);
  const dkit = new Kit(mats);
  dkit.add(ex.scorched, cbox(4.6, 0.16, 3.2, 0.05), { pos: [0, 0, 1.6] });
  for (const s of [-1, 1]) {
    dkit.add(ex.scorched, cbox(0.16, 0.42, 3.1, 0.03), { pos: [s * 2.15, 0.27, 1.6] });
    dkit.strut(ex.scorched, [s * 1.9, 0.1, 0.2], [s * 1.9, 0.5, 2.9], 0.05);
  }
  for (let i = 0; i < 5; i++) {
    dkit.add(ex.scorched, cbox(4.4, 0.18, 0.12, 0.02), { pos: [0, 0.15, 0.4 + i * 0.65] });
  }
  dkit.decal('scorch', 2.6, 2.6, { pos: [-0.9, 0.11, 1.5], rot: [-Math.PI / 2, 0, 0.4] });
  dkit.decal('scorch2', 2.6, 2.6, { pos: [0.9, 0.11, 1.7], rot: [-Math.PI / 2, 0, -0.2] });
  dkit.decal('caution', 1.1, 0.37, { pos: [0, 0.12, 0.3], rot: [-Math.PI / 2, 0, 0] });
  dkit.emit(deflNode);
  for (const s of [-1, 1]) {
    kit.cyl('galv', 0.11, 0.5, { pos: [s * 1.9, DECK - 0.2, ZR + 0.1], rot: [0, 0, Math.PI / 2] }, 8);
  }

  /* -------------------------------------------------------------- markings */
  for (const s of [-1, 1]) {
    const dx = s * 2.06;
    const dy = s * Math.PI * 0.5;
    kit.decal('s_big', 2.4, 0.41, { pos: [dx, DECK - 0.55, -0.4], rot: [0, dy, 0] });
    kit.decal('s_test', 1.6, 0.56, { pos: [dx, DECK - 0.62, -5.6], rot: [0, dy, 0] });
  }
  kit.decal('stripes', 3.4, 0.26, { pos: [0, DECK - 1.02, ZF - 0.02] });
  kit.decal('stripes', 3.4, 0.26, { pos: [0, DECK - 1.02, ZR + 0.02], rot: [0, Math.PI, 0] });
  kit.decal('scorch2', 2.8, 2.8, { pos: [0, DECK + 0.02, 5.2], rot: [-Math.PI / 2, 0, 0.5] });

  const panel = statusLights(kit, 'darkMetal', 0xff7de3, [
    { pos: [-1.95, DECK + 0.55, -1.0], rot: [0, -Math.PI / 2, 0] },
    { pos: [1.95, DECK + 0.55, 4.2], rot: [0, Math.PI / 2, 0] },
  ]);
  g.add(panel);
  g.userData.panel = panel;

  kit.emit(g);
  tkit.emit(turn);
  pkit.emit(pivot);

  g.userData.animate = (t, launcher) => {
    rams.solve(launcher.currentElevation);
    // umbilicals swing clear the moment the erector starts to lift
    const swing = Math.min(1, t * 3.2);
    umbNode.rotation.x = -swing * 1.25;
  };

  g.userData.restElevation = 0;
  g.userData.fireElevation = 60 * DEG;
  g.userData.colliders = [
    { type: 'box', pos: [0, 0.78, 0], half: [1.95, 0.78, 7.4], walkable: true },
    { type: 'box', pos: [0, 2.0, -6.4], half: [1.6, 0.7, 1.1], walkable: false },
    { type: 'box', pos: [0, 3.3, 2.2], half: [1.9, 1.2, 5.0], walkable: false },
    { type: 'box', pos: [-2.8, 3.0, 5.4], half: [0.6, 3.0, 1.4], walkable: false },
    { type: 'box', pos: [-6.1, 0.85, 0.9], half: [0.4, 0.85, 0.58], walkable: false },
    { type: 'box', pos: [-6.1, 0.85, 2.7], half: [0.4, 0.85, 0.58], walkable: false },
    { type: 'box', pos: [6.3, 0.85, -1.6], half: [0.4, 0.85, 0.58], walkable: false },
  ];
  return g;
}

const LAUNCHER_BUILDERS = {
  PATRIOT: buildPatriotLauncher,
  THAAD: buildThaadLauncher,
  SENTINEL: buildSentinelLauncher,
};

/* -------------------------------------------------------------- Battery ---- */

class Launcher {
  constructor(cfg, emplacement, rng, scene) {
    this.cfg = cfg;
    this.group = LAUNCHER_BUILDERS[cfg.id](rng);
    this.group.position.set(emplacement.pos[0], emplacement.pos[1] + 0.06, emplacement.pos[2]);
    this.group.rotation.y = emplacement.yaw;
    scene.add(this.group);
    this.azimuth = this.group.userData.azimuth;
    this.elevationNode = this.group.userData.elevation;
    this.canisters = this.group.userData.canisters;
    this.launchLocal = this.group.userData.launchLocal;
    this.restElevation = this.group.userData.restElevation;
    this.fireElevation = this.group.userData.fireElevation;
    this.targetElevation = this.restElevation;
    this.targetAzimuth = 0;
    this.currentElevation = this.restElevation;
    this.currentAzimuth = 0;
    this.nextTube = 0;
    this.servoNoise = 0;
  }

  /** World-space muzzle pose of the next loaded tube. */
  launchPose(out = { pos: new THREE.Vector3(), dir: new THREE.Vector3() }) {
    const tube = this.canisters[this.nextTube % this.canisters.length];
    const local = this.launchLocal[tube.index].clone();
    this.elevationNode.updateWorldMatrix(true, false);
    out.pos.copy(local).applyMatrix4(this.elevationNode.matrixWorld);
    out.dir.set(0, 0, 1).transformDirection(this.elevationNode.matrixWorld);
    return out;
  }

  /**
   * Slew the erector so the rail points at the cued intercept point, plus a
   * loft bias so the round arcs over rather than flying a flat trajectory.
   */
  aimAt(worldPoint) {
    const local = this.group.worldToLocal(worldPoint.clone());
    this.targetAzimuth = Math.atan2(local.x, local.z);
    const flat = Math.hypot(local.x, local.z);
    const direct = Math.atan2(local.y, Math.max(1, flat));
    const c = this.cfg;
    const loft = c.loft !== undefined ? c.loft : 0.28;
    const min = c.minElev !== undefined ? c.minElev : 0.4;
    const max = c.maxElev !== undefined ? c.maxElev : 1.4;
    this.targetElevation = THREE.MathUtils.clamp(direct + loft, min, max);
    this.fireElevation = this.targetElevation;
  }

  stand(down) {
    this.targetElevation = down ? this.restElevation : this.fireElevation;
    if (down) this.targetAzimuth = 0;
  }

  update(dt) {
    const eRate = 0.46;
    const aRate = 0.62;
    const de = this.targetElevation - this.currentElevation;
    const da = THREE.MathUtils.euclideanModulo(this.targetAzimuth - this.currentAzimuth + Math.PI, Math.PI * 2) - Math.PI;
    const eStep = Math.sign(de) * Math.min(Math.abs(de), eRate * dt);
    const aStep = Math.sign(da) * Math.min(Math.abs(da), aRate * dt);
    this.currentElevation += eStep;
    this.currentAzimuth += aStep;
    this.moving = Math.abs(eStep) > 1e-5 || Math.abs(aStep) > 1e-5;
    this.elevationNode.rotation.x = -this.currentElevation;
    this.azimuth.rotation.y = this.currentAzimuth;
    // hydraulic rams extend with elevation
    const t = THREE.MathUtils.clamp((this.currentElevation - this.restElevation) / 1.3, 0, 1);
    for (const ram of this.group.userData.rams || []) {
      ram.rotation.x = -0.15 - t * 0.55;
      ram.scale.y = 1 + t * 0.5;
    }
    // Per-vehicle rigging: solves the rams exactly against the trunnion and
    // drives travel locks, blast deflectors and umbilicals.
    const anim = this.group.userData.animate;
    if (anim) anim(t, this);
    return this.moving;
  }

  atFiringPosition() {
    return Math.abs(this.currentElevation - this.targetElevation) < 0.01 && Math.abs(this.currentAzimuth - this.targetAzimuth) < 0.02;
  }

  setLamps(stateId) {
    const panel = this.group.userData.panel;
    if (!panel) return;
    const [green, amber, red] = panel.userData.lamps;
    const set = (l, on) => {
      l.material.emissiveIntensity = on ? 4.5 : 0.25;
    };
    set(green, stateId === BATTERY_STATE.READY);
    set(amber, stateId === BATTERY_STATE.PREP || stateId === BATTERY_STATE.RELOAD);
    set(red, stateId === BATTERY_STATE.EXPENDED || stateId === BATTERY_STATE.OFFLINE);
  }

  consumeTube() {
    const tube = this.canisters[this.nextTube % this.canisters.length];
    tube.loaded = false;
    if (tube.lid) tube.lid.visible = false;
    this.nextTube++;
    return tube;
  }

  reloadAll() {
    for (const c of this.canisters) {
      c.loaded = true;
      if (c.lid) c.lid.visible = true;
    }
    this.nextTube = 0;
  }
}

export class Battery {
  constructor(cfg, scene, rng) {
    this.cfg = cfg;
    this.launchers = (EMPLACEMENTS[cfg.id] || []).map((e, i) => new Launcher(cfg, e, rng.fork(`${cfg.id}:${i}`), scene));
    this.ammo = cfg.ammo;
    this.state = BATTERY_STATE.READY;
    this.timer = 0;
    this.assignedTrack = null;
    this.pendingAuthorize = false;
    this.activeLauncher = 0;
    this.salvoLeft = 0;
    this.launchCooldown = 0;
  }

  get id() {
    return this.cfg.id;
  }

  get position() {
    return this.launchers[0].group.position;
  }

  assign(track, predictedPoint) {
    if (this.state === BATTERY_STATE.EXPENDED) return false;
    this.assignedTrack = track;
    if (this.state === BATTERY_STATE.READY || this.state === BATTERY_STATE.PREP) {
      this.state = BATTERY_STATE.PREP;
      this.timer = this.cfg.prepTime;
    }
    for (const l of this.launchers) l.aimAt(predictedPoint);
    return true;
  }

  clearAssignment() {
    this.assignedTrack = null;
    this.pendingAuthorize = false;
    for (const l of this.launchers) l.stand(true);
    if (this.state === BATTERY_STATE.PREP) this.state = BATTERY_STATE.READY;
  }

  authorize() {
    if (!this.assignedTrack) return { ok: false, why: 'NO_ASSIGNMENT' };
    if (this.ammo <= 0) return { ok: false, why: 'NO_ROUNDS' };
    if (this.state === BATTERY_STATE.RELOAD) return { ok: false, why: 'RELOADING' };
    this.pendingAuthorize = true;
    return { ok: true, why: this.readyToFire() ? 'FIRING' : 'QUEUED' };
  }

  readyToFire() {
    return this.state === BATTERY_STATE.PREP && this.timer <= 0 && this.launchers.every((l) => l.atFiringPosition());
  }

  update(dt, onFire) {
    if (this.timer > 0) this.timer = Math.max(0, this.timer - dt);
    if (this.launchCooldown > 0) this.launchCooldown = Math.max(0, this.launchCooldown - dt);
    let moving = false;
    for (const l of this.launchers) moving = l.update(dt) || moving;
    this.moving = moving;

    if (this.state === BATTERY_STATE.RELOAD && this.timer <= 0) {
      this.state = this.ammo > 0 ? BATTERY_STATE.READY : BATTERY_STATE.EXPENDED;
      for (const l of this.launchers) if (l.nextTube >= l.canisters.length) l.reloadAll();
      if (this.assignedTrack) {
        this.state = BATTERY_STATE.PREP;
        this.timer = this.cfg.prepTime * 0.5;
      }
      bus.emit('battery:state', this);
    }

    if (this.pendingAuthorize && this.readyToFire() && this.launchCooldown <= 0) {
      const l = this.launchers[this.activeLauncher % this.launchers.length];
      const pose = l.launchPose();
      const tube = l.consumeTube();
      this.activeLauncher++;
      this.ammo--;
      this.pendingAuthorize = false;
      this.launchCooldown = this.cfg.launchInterval;
      this.state = BATTERY_STATE.RELOAD;
      this.timer = this.cfg.reloadTime;
      onFire(this, pose, l, tube);
      bus.emit('battery:state', this);
    }

    for (const l of this.launchers) l.setLamps(this.state);
    const st = state.batteries[this.id];
    if (st) {
      st.ammo = this.ammo;
      st.state = this.state;
      st.timer = this.timer;
      st.assignedTrackId = this.assignedTrack ? this.assignedTrack.id : null;
    }
  }

  reset() {
    this.ammo = this.cfg.ammo;
    this.state = BATTERY_STATE.READY;
    this.timer = 0;
    this.assignedTrack = null;
    this.pendingAuthorize = false;
    this.launchCooldown = 0;
    this.activeLauncher = 0;
    for (const l of this.launchers) {
      l.reloadAll();
      l.stand(true);
      l.currentElevation = l.restElevation;
      l.currentAzimuth = 0;
    }
  }

  registerColliders(world) {
    for (const l of this.launchers) world.addFromObject(l.group);
  }
}

export class BatteryManager {
  constructor(scene, effects, interceptors, seed = 1) {
    this.scene = scene;
    this.effects = effects;
    this.interceptors = interceptors;
    const rng = new RNG(`batteries:${seed}`);
    this.list = BATTERIES.map((cfg) => new Battery(cfg, scene, rng));
    this.byId = Object.fromEntries(this.list.map((b) => [b.id, b]));
    this.camera = null;
    this.onLaunch = null;
  }

  get(id) {
    return this.byId[id];
  }

  registerColliders(world) {
    for (const b of this.list) b.registerColliders(world);
  }

  update(dt) {
    for (const b of this.list) {
      b.update(dt, (battery, pose, launcher, tube) => {
        const target = battery.assignedTrack ? battery.assignedTrack.threat : null;
        const inter = this.interceptors.launch({
          batteryId: battery.id,
          pos: pose.pos.clone(),
          dir: pose.dir.clone(),
          target,
          trackId: battery.assignedTrack ? battery.assignedTrack.id : null,
        });
        this.effects.launchBlast(pose.pos.clone(), pose.dir.clone(), battery.cfg, this.camera);
        // Canister lid blows clear.
        if (tube && tube.lid) {
          this.effects.puff(pose.pos.clone(), 3 * battery.cfg.plumeScale, 0xd8d0c4, 5);
        }
        if (this.onLaunch) this.onLaunch(battery, inter, pose);
      });
    }
  }

  reset() {
    for (const b of this.list) b.reset();
  }
}
