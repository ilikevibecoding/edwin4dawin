/**
 * Starship library — every hull in the film.
 *
 * Conventions (see docs/modeling.md)
 *   forward = -Z, up = +Y, model scale (a corvette is 64 studs long)
 *   `userData.length` is the hull length; `userData.anchor` says where y = 0
 *   sits ('keel' = bottom of the hull, 'center' = fuselage centreline).
 *
 * Every factory is pure and deterministic: all scatter uses `rng(seed)`.
 * Static geometry is merged with `bake()`; animated parts (engine glows,
 * S-foils, ramps, turrets) are built outside the baked subtree, tagged
 * `userData.noBake` and hung off `userData` for the scene layer to drive.
 */
import * as THREE from 'three';
import {
  brick, tile, slope, prism, cyl, cone, sphere, dish, bar,
  studGrid, at, rot, bake as bakeRaw, mat, glow, rng,
  C, PLATE,
} from '../lego/bricks.js';
import { svgTexture, svg } from '../lego/svgtex.js';

/* ================================================================== */
/* geometry helpers                                                    */
/* ================================================================== */

const PB = 0.03; // prism() default bevel

/**
 * `prism()` in world-space semantics: points are true XZ (so a nose sits at
 * -Z) and the slab spans y .. y+h.  The raw kit primitive mirrors Z and
 * floats the extrusion by (h - 2*bevel); both are corrected here.
 * @param {Array<[number,number]>} pts polygon in world XZ
 * @param {number} h thickness (Y)
 * @param {number} y base height
 * @param {object} [o] {color, bevel, material, x, z, ...mat opts}
 */
function hull(pts, h, y = 0, o = {}) {
  const { material, x = 0, z = 0, ...po } = o;
  const bev = po.bevel ?? PB;
  const m = prism(pts.map((p) => [p[0], -p[1]]), h, po);
  if (material) m.material = material;
  m.position.set(x, y - (h - 2 * bev), z);
  return m;
}

/** Half-width profile lookup; prof is [[z, halfWidth], ...] sorted by z. */
function widthAt(prof, z) {
  if (z <= prof[0][0]) return prof[0][1];
  const last = prof[prof.length - 1];
  if (z >= last[0]) return last[1];
  for (let i = 1; i < prof.length; i++) {
    const [za, wa] = prof[i - 1];
    const [zb, wb] = prof[i];
    if (z <= zb) return wa + ((wb - wa) * (z - za)) / (zb - za);
  }
  return last[1];
}

/** Slice a half-width profile to [z0,z1] and inset it by `dw`. */
function section(prof, z0, z1, dw = 0, minW = 0.35) {
  const zs = [z0];
  for (const [z] of prof) if (z > z0 + 1e-4 && z < z1 - 1e-4) zs.push(z);
  zs.push(z1);
  return zs.map((z) => [z, Math.max(minW, widthAt(prof, z) - dw)]);
}

/** Closed symmetric XZ polygon from a half-width profile. */
function poly(prof) {
  const right = prof.map(([z, w]) => [w, z]);
  const left = prof.slice().reverse().map(([z, w]) => [-w, z]);
  return right.concat(left);
}

/** Extrude a half-width profile as a hull slab spanning y .. y+h. */
function slab(prof, h, y, o) {
  return hull(poly(prof), h, y, o);
}

/** Axis-aligned rectangle in XZ, centred on (cx, cz). */
function rect(w, d, cx = 0, cz = 0) {
  return [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
}

/** Textured rectangular block (prism UVs are in stud units, unlike brick()). */
function slabBox(w, d, h, y, cx, cz, o) {
  return hull(rect(w, d, cx, cz), h, y, o);
}

/** Point in XZ polygon. */
function inPoly(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Point at least `d` inside the polygon (cheap 5-tap test). */
function inset(pts, x, z, d) {
  return inPoly(pts, x, z) && inPoly(pts, x + d, z) && inPoly(pts, x - d, z) &&
    inPoly(pts, x, z + d) && inPoly(pts, x, z - d);
}

/** Point inside the polygon or within `d` of it (5-tap test). */
function nearPoly(pts, x, z, d) {
  return inPoly(pts, x, z) || inPoly(pts, x + d, z) || inPoly(pts, x - d, z) ||
    inPoly(pts, x, z + d) || inPoly(pts, x, z - d);
}

/** One material instance per colour, matching what brick()/tile() produce. */
function M(color, o) {
  return mat(color, { color, ...o });
}

const canonMats = new Map();

/**
 * The kit derives a brick's material with `mat(color, o)`, and `o` also carries
 * geometry-only keys (`seg`, `rTop`, `studs`), so bricks that look identical can
 * end up on different material instances.  `bake()` merges one mesh per material
 * instance, so fold look-alikes onto a single shared instance first.  Driveable
 * glows are skipped: they own a cloned material that gets animated per engine.
 */
function canonMaterials(root) {
  root.traverse((o) => {
    const m = o.isMesh ? o.material : null;
    if (!m || Array.isArray(m)) return;
    if (o.userData.noBake || o.userData.engine || o.userData.glowBase) return;
    const k = [
      m.type, m.color && m.color.getHex(), m.map ? m.map.uuid : 0,
      m.roughness, m.metalness, m.transparent, m.opacity, m.alphaTest,
      m.emissive && m.emissive.getHex(), m.emissiveIntensity,
      m.side, m.flatShading, m.depthWrite, m.blending, m.toneMapped,
      m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits,
    ].join('|');
    if (!canonMats.has(k)) canonMats.set(k, m);
    o.material = canonMats.get(k);
  });
  return root;
}

/** `bake()`, with look-alike materials collapsed first to cut draw calls. */
function bake(root) {
  return bakeRaw(canonMaterials(root));
}

/**
 * A merged field of studs on integer cell centres of [x0,x1] x [z0,z1].
 * `test(x, z)` decides which cells get one.
 */
function studField(x0, x1, z0, z1, y, test, o = {}) {
  const w = Math.max(1, Math.round(x1 - x0));
  const d = Math.max(1, Math.round(z1 - z0));
  if (w * d > 40000) return null;
  const g = studGrid(w, d, 0, (i, j) => (test ? !test(x0 + 0.5 + i, z0 + 0.5 + j) : false));
  if (!g) return null;
  const m = new THREE.Mesh(g, o.material || M(o.color ?? C.lightGray));
  m.position.set(x0 + 0.5 + (w - 1) / 2, y, z0 + 0.5 + (d - 1) / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Stud the deck described by an XZ polygon. */
function deckStuds(pts, y, o = {}) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  const d = o.inset ?? 0.65;
  const keep = o.keep;
  const step = o.step ?? 1;
  return studField(
    Math.floor(x0) - 1, Math.ceil(x1) + 1, Math.floor(z0) - 1, Math.ceil(z1) + 1, y,
    (x, z) => inset(pts, x, z, d) &&
      (step === 1 || (Math.abs(Math.round(x - 0.5)) % step === 0 && Math.abs(Math.round(z - 0.5)) % step === 0)) &&
      (!keep || keep(x, z)),
    o
  );
}

/** Deterministic scatter of small mechanical detail bricks. */
function greebles(parent, o = {}) {
  const {
    x0, x1, z0, z1, y, seed = 1, count = 60, test, down = false, span,
    colors = [C.bluishGray, C.darkGray, C.lightGray],
    hMin = 0.3, hMax = 1.4, maxW = 3, studChance = 0.3, grid = 0.5,
  } = o;
  const R = rng(seed);
  const q = (v) => Math.round(v / grid) * grid;
  for (let i = 0; i < count; i++) {
    const w = 1 + Math.floor(R() * maxW);
    const d = 1 + Math.floor(R() * maxW);
    const u = R();
    const z = q(z0 + R() * (z1 - z0));
    // `span(z, u)` places x relative to the hull at that z (tapering bands)
    const x = span ? q(span(z, u)) : q(x0 + u * (x1 - x0));
    const h = Math.max(0.2, Math.round((hMin + R() * (hMax - hMin)) / 0.2) * 0.2);
    const col = colors[Math.floor(R() * colors.length) % colors.length];
    const kind = R();
    const studded = R() < studChance;
    if (test && !test(x, z, Math.max(w, d) / 2)) continue;
    let m;
    if (kind < 0.6) m = brick(w, d, h, { color: col, studs: studded });
    else if (kind < 0.8) m = tile(w, d, h, { color: col });
    else if (kind < 0.92) m = cyl(0.3 + Math.round(R() * 3) * 0.15, h, { color: col, seg: 8 });
    else m = tile(w, d, 0.2, { color: col });
    parent.add(at(m, x, down ? y - h : y, z));
  }
}

/* ================================================================== */
/* printed detail (SVG textures)                                       */
/* ================================================================== */

const texCache = new Map();
function svgTex(key, body, o = {}) {
  const k = `${key}|${o.repeat ? o.repeat.join('x') : '1'}`;
  if (texCache.has(k)) return texCache.get(k);
  const t = svgTexture(body(), { w: o.w || 256, h: o.h || o.w || 256, key: k });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  texCache.set(k, t);
  return t;
}

const texMatCache = new Map();
/** Textured standard material (the kit's `mat()` cannot take a map). */
function mapMat(key, color, texture, o = {}) {
  if (texMatCache.has(key)) return texMatCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    map: texture || null,
    roughness: o.rough ?? 0.46,
    metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000,
    emissiveMap: o.emissiveMap || null,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    side: o.side || THREE.FrontSide,
  });
  texMatCache.set(key, m);
  return m;
}

const decalMats = new Map();
/** Printed decal quad in the XY plane facing +Z (alpha cut-out, sorts free). */
function decal(w, h, texture, key, o = {}) {
  let m = decalMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      map: texture, transparent: false, alphaTest: 0.4,
      roughness: 0.45, metalness: 0, color: o.color ?? 0xffffff,
      side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    decalMats.set(key, m);
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

/** Lit-window material: the SVG doubles as its own emissive mask. */
function litMat(key, tex, color = 0xffe0a8, intensity = 1.35) {
  return mapMat(key, 0xffffff, tex, {
    rough: 0.3, emissive: color, emissiveMap: tex, emissiveIntensity: intensity,
  });
}

/* --- SVG bodies ---------------------------------------------------- */

const SVG_PANEL = () => svg([0, 0, 256, 256], `
  <rect width="256" height="256" fill="#ffffff"/>
  <g fill="#ebeef0">
    <rect x="7" y="7" width="102" height="50" rx="3"/>
    <rect x="125" y="7" width="124" height="30" rx="3"/>
    <rect x="7" y="74" width="58" height="78" rx="3"/>
    <rect x="81" y="74" width="168" height="44" rx="3"/>
    <rect x="125" y="134" width="124" height="46" rx="3"/>
    <rect x="7" y="168" width="102" height="80" rx="3"/>
    <rect x="125" y="196" width="124" height="52" rx="3"/>
  </g>
  <g stroke="#c6cacd" stroke-width="2.2" fill="none">
    <path d="M0 66H256M0 188H256M118 0V256M0 0.7H256M0 255.3H256M0.7 0V256M255.3 0V256"/>
  </g>
  <g fill="#d5d9dc">
    <rect x="16" y="18" width="26" height="7"/><rect x="16" y="32" width="14" height="7"/>
    <rect x="137" y="14" width="42" height="6"/><rect x="193" y="14" width="18" height="6"/>
    <rect x="92" y="86" width="34" height="7"/><rect x="137" y="146" width="52" height="7"/>
    <rect x="20" y="182" width="18" height="7"/><rect x="22" y="210" width="58" height="8"/>
    <rect x="140" y="222" width="34" height="8"/>
  </g>`);

const SVG_GREEBLE = () => svg([0, 0, 256, 256], `
  <rect width="256" height="256" fill="#ffffff"/>
  <g fill="#e2e5e7">
    <rect x="4" y="4" width="70" height="70"/><rect x="82" y="4" width="46" height="34"/>
    <rect x="136" y="4" width="116" height="52"/><rect x="4" y="82" width="34" height="52"/>
    <rect x="46" y="82" width="82" height="24"/><rect x="136" y="64" width="52" height="70"/>
    <rect x="196" y="64" width="56" height="34"/><rect x="4" y="142" width="120" height="46"/>
    <rect x="132" y="142" width="52" height="52"/><rect x="192" y="106" width="60" height="88"/>
    <rect x="4" y="196" width="60" height="56"/><rect x="72" y="196" width="112" height="24"/>
    <rect x="192" y="202" width="60" height="50"/>
  </g>
  <g fill="#c0c5c9">
    <rect x="12" y="12" width="54" height="8"/><rect x="12" y="26" width="30" height="6"/>
    <rect x="12" y="40" width="44" height="6"/><rect x="144" y="12" width="98" height="9"/>
    <rect x="144" y="28" width="40" height="7"/><rect x="196" y="28" width="46" height="7"/>
    <rect x="144" y="74" width="34" height="7"/><rect x="144" y="88" width="34" height="7"/>
    <rect x="144" y="102" width="20" height="7"/><rect x="12" y="152" width="102" height="9"/>
    <rect x="12" y="168" width="66" height="7"/><rect x="200" y="116" width="44" height="8"/>
    <rect x="200" y="132" width="44" height="8"/><rect x="200" y="148" width="26" height="8"/>
    <rect x="80" y="204" width="96" height="8"/><rect x="12" y="206" width="42" height="8"/>
    <rect x="12" y="224" width="30" height="18"/><rect x="200" y="212" width="42" height="9"/>
    <rect x="86" y="46" width="34" height="24"/>
  </g>
  <g stroke="#a4aaaf" stroke-width="2" fill="none">
    <path d="M0 78H256M0 138H256M0 192H256M78 0V78M130 78V256M188 0V256M0 1H256M0 255H256M1 0V256M255 0V256"/>
  </g>`);

const SVG_WINDOWS = () => svg([0, 0, 256, 64], `
  <rect width="256" height="64" fill="#0d141b"/>
  <g fill="#ffe6a8">${
  Array.from({ length: 16 }, (_, i) => `<rect x="${6 + i * 15.6}" y="20" width="9" height="24" rx="1.5"/>`).join('')
}</g>
  <g fill="#1d2833"><rect y="0" width="256" height="7"/><rect y="57" width="256" height="7"/></g>`);

const SVG_BRIDGEWIN = () => svg([0, 0, 256, 64], `
  <rect width="256" height="64" fill="#101820"/>
  <g fill="#c8ecff">${
  Array.from({ length: 10 }, (_, i) => `<rect x="${10 + i * 24}" y="13" width="16" height="36" rx="2"/>`).join('')
}</g>`);

const SVG_XWING_MARK = () => svg([0, 0, 256, 128], `
  <g fill="#c91a09">
    <path d="M6 6 H150 L112 46 H6 Z"/>
    <rect x="6" y="60" width="176" height="16"/>
    <path d="M196 6 h54 l-30 40 h-54 z"/>
    <rect x="6" y="92" width="60" height="14"/>
    <rect x="86" y="92" width="24" height="14"/>
  </g>
  <g fill="#1b2a34">
    <rect x="130" y="92" width="118" height="10"/>
    <rect x="196" y="60" width="54" height="10"/>
  </g>`);

const SVG_REBEL = () => svg([0, 0, 128, 128], `
  <g fill="#c91a09">
    <path d="M64 6 C38 30 31 60 38 88 L53 80 C48 56 55 32 64 20 Z"/>
    <path d="M64 6 C90 30 97 60 90 88 L75 80 C80 56 73 32 64 20 Z"/>
    <path d="M64 58 l7.5 21 h22 l-18 14 6.5 22 -18-13.5 -18 13.5 6.5-22 -18-14 h22 z"/>
  </g>`);

const SVG_IMPERIAL = () => svg([0, 0, 128, 128], `
  <g fill="#c8c9c7"><circle cx="64" cy="64" r="30"/>${
  Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x = 64 + Math.cos(a) * 45;
    const y = 64 + Math.sin(a) * 45;
    return `<rect x="${(x - 7).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="14" height="14" transform="rotate(${i * 45} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('')
}</g>
  <g fill="#1b2a34"><circle cx="64" cy="64" r="17"/>${
  Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return `<rect x="${(64 + Math.cos(a) * 22 - 3).toFixed(1)}" y="${(64 + Math.sin(a) * 22 - 3).toFixed(1)}" width="6" height="6"/>`;
  }).join('')
}</g>`);

const SVG_TREAD = () => svg([0, 0, 128, 64], `
  <rect width="128" height="64" fill="#2b3036"/>
  <g fill="#474e55">${
  Array.from({ length: 8 }, (_, i) => `<rect x="${i * 16 + 2}" y="3" width="11" height="58" rx="2"/>`).join('')
}</g>
  <g fill="#1e2328">${
  Array.from({ length: 8 }, (_, i) => `<rect x="${i * 16 + 5}" y="26" width="5" height="12"/>`).join('')
}</g>`);

const SVG_SCREEN = () => svg([0, 0, 256, 128], `
  <rect width="256" height="128" fill="#08131a"/>
  <g fill="#7ef2c0">
    <rect x="10" y="10" width="86" height="6"/><rect x="10" y="22" width="52" height="6"/>
    <rect x="10" y="34" width="70" height="6"/><rect x="10" y="46" width="34" height="6"/>
    <rect x="10" y="100" width="110" height="8"/>
  </g>
  <g stroke="#ffb03a" stroke-width="3" fill="none">
    <circle cx="186" cy="52" r="34"/><path d="M186 10V94M144 52H228"/>
  </g>
  <g fill="#ff5a3c"><rect x="10" y="66" width="24" height="24"/><rect x="44" y="66" width="24" height="24"/></g>
  <g fill="#4ad0ff"><rect x="140" y="102" width="106" height="8"/><rect x="140" y="114" width="60" height="6"/></g>`);

const SVG_HAZARD = () => svg([0, 0, 128, 32], `
  <rect width="128" height="32" fill="#1b2a34"/>
  <g fill="#f2cd37">${
  Array.from({ length: 10 }, (_, i) => `<path d="M${i * 16 - 10} 32 L${i * 16 + 4} 0 h12 L${i * 16 + 2} 32 z"/>`).join('')
}</g>`);

/* ================================================================== */
/* engines                                                             */
/* ================================================================== */

const additiveCache = new Map();
function additive(color, opacity = 0.4) {
  const k = color + '|' + opacity;
  if (!additiveCache.has(k)) {
    additiveCache.set(k, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    }));
  }
  return additiveCache.get(k);
}

/** Tag a glow mesh as a driveable engine (own material instance). */
function asEngine(core, plume) {
  core.material = core.material.clone();
  core.material.transparent = true;
  core.castShadow = core.receiveShadow = false;
  core.userData.noBake = true;
  core.userData.engine = true;
  core.userData.glowBase = { color: core.material.color.clone(), opacity: core.material.opacity };
  if (plume) {
    plume.material = plume.material.clone();
    plume.castShadow = plume.receiveShadow = false;
    plume.userData.noBake = true;
    plume.userData.glowBase = { color: plume.material.color.clone(), opacity: plume.material.opacity };
    core.userData.plume = plume;
  }
  return core;
}

/** Apply a throttle (0 = dark, 1 = cruise, >1 = burn) to one engine glow. */
function driveEngine(core, v) {
  const k = core.userData.dead ? 0 : Math.max(0, v);
  const b = core.userData.glowBase;
  const m = core.material;
  if (b && m) {
    m.opacity = Math.min(1, (b.opacity ?? 1) * (0.12 + 0.88 * Math.min(k, 1)));
    m.color.copy(b.color).multiplyScalar(0.4 + 0.6 * Math.min(k, 1.4));
  }
  core.visible = k > 0.004;
  const p = core.userData.plume;
  if (p) {
    const rad = 0.5 + 0.5 * Math.min(k, 1.25);
    p.scale.set(rad, Math.max(0.0001, k * k * (0.5 + 0.5 * Math.min(k, 1))), rad);
    p.visible = k > 0.03;
    const pb = p.userData.glowBase;
    if (pb) p.material.opacity = Math.min(1, pb.opacity * Math.min(k * 1.15, 1.3));
  }
}

/**
 * Utility: scale the emissive/opacity of every glow in `userData.engines`.
 * @param {THREE.Object3D} ship any ship group from this module
 * @param {number} v 0 = dark, 1 = cruise, >1 = burn
 */
export function setEngineGlow(ship, v = 1) {
  const eng = ship && ship.userData && ship.userData.engines;
  if (!eng) return ship;
  for (const e of eng) driveEngine(e, v);
  ship.userData.throttle = v;
  return ship;
}

/**
 * One engine bell.  `shell` holds the static housing (bake it), `live` holds
 * the glowing core plus its additive plume (keep out of the bake).
 * Thrust exits toward +Z.
 */
function engineBell(o = {}) {
  const r = o.r ?? 1.2;
  const depth = o.depth ?? r * 0.8;
  const col = o.color ?? 0xb8ecff;
  const seg = o.seg ?? (r > 6 ? 26 : r > 2 ? 18 : 12);
  const shell = new THREE.Group();
  const live = new THREE.Group();
  if (o.housing !== false) {
    shell.add(at(rot(cyl(r, depth, { color: o.shell ?? C.darkGray, seg }), Math.PI / 2, 0, 0), 0, 0, -depth));
    shell.add(at(rot(cyl(r * 1.07, depth * 0.3, { color: C.bluishGray, seg }), Math.PI / 2, 0, 0), 0, 0, -depth * 1.02));
  }
  shell.add(at(rot(cone(r * 0.93, r * 0.6, depth * 0.86, { color: C.black, seg }), Math.PI / 2, 0, 0), 0, 0, -depth * 0.9));
  const core = at(rot(cyl(r * 0.8, r * 0.2, { color: col, glow: true, seg }), Math.PI / 2, 0, 0), 0, 0, -0.12);
  const plume = at(rot(cone(r * 0.82, r * 0.15, o.plume ?? r * 3.4, { color: col, glow: true, seg: Math.max(8, seg - 6) }), Math.PI / 2, 0, 0), 0, 0, 0);
  plume.material = additive(o.plumeColor ?? col, o.plumeOpacity ?? 0.4);
  asEngine(core, plume);
  live.add(core);
  live.add(plume);
  return {
    shell, live, core, plume,
    place(x, y, z) { shell.position.set(x, y, z); live.position.set(x, y, z); return this; },
  };
}

/** Flat glowing exhaust slab (Falcon / sandcrawler style). */
function engineSlab(w, h, o = {}) {
  const col = o.color ?? 0xcbf2ff;
  const live = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), glow(col, 1));
  const plume = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.8, 1), additive(col, 0.32));
  plume.geometry.translate(0, 0, 0.5);
  asEngine(core, plume);
  live.add(core);
  live.add(plume);
  return {
    live, core, plume,
    place(x, y, z) { live.position.set(x, y, z); return this; },
  };
}

/** Standard engine userData wiring. */
function wireEngines(g, engines, throttle = 1) {
  g.userData.engines = engines;
  g.userData.throttle = throttle;
  g.userData.setThrottle = (v) => {
    g.userData.throttle = v;
    for (const e of engines) driveEngine(e, v);
  };
  g.userData.killEngine = (i, dead = true) => {
    const e = engines[((i % engines.length) + engines.length) % engines.length];
    if (!e) return;
    e.userData.dead = dead;
    driveEngine(e, g.userData.throttle);
  };
  g.userData.setThrottle(throttle);
  return g;
}

/**
 * Radar dish sitting apex-down on a mast: `y` is the mast top.
 * (`dish()` hangs below its origin: y in [-2.381h, -0.592h].)
 */
function radar(r, h, x, y, z, o = {}) {
  const d = dish(r, h, o);
  d.position.set(x, y + 2.381 * h, z);
  return d;
}

/** Shift every direct child of a finished ship in Y (used to land min.y on 0). */
function lift(g, dy) {
  for (const c of g.children) c.position.y += dy;
  return g;
}

/** Named local-space anchor that survives baking (added to the root group). */
function anchor(g, name, x, y, z) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  g.add(o);
  if (!g.userData.anchors) g.userData.anchors = {};
  g.userData.anchors[name] = o;
  return o;
}

/* ================================================================== */
/* corvette — rebel blockade runner                                    */
/* ================================================================== */

/**
 * CR90-style corvette: hammerhead nose, wide stepped rear body, raised
 * bridge, bank of eleven engine bells.
 *
 * userData: length 64, engines[11] (bottom row first, left→right),
 *   setThrottle(v), killEngine(i, dead=true), anchors {bridge, podBay, dock}
 */
export function corvette(opt = {}) {
  const seed = opt.seed ?? 11;
  const g = new THREE.Group();
  g.name = 'corvette';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();
  LIVE.name = 'engineGlows';

  const hullTex = svgTex('panel', SVG_PANEL, { repeat: [1 / 7, 1 / 7] });
  const hullMat = mapMat('corvHull', 0xf4f5f3, hullTex, { rough: 0.5 });
  const greyMat = mapMat('corvGrey', 0x94978f, hullTex, { rough: 0.5 });
  const winMat = litMat('corvWin', svgTex('win', SVG_WINDOWS, { repeat: [1, 1] }));
  const bwMat = litMat('corvBridgeWin', svgTex('bwin', SVG_BRIDGEWIN, { repeat: [1, 1] }), 0x9fd8ff, 1.5);

  // master half-width profile, nose (-Z) to tail (+Z)
  const P = [
    [-32, 0.7], [-30.6, 2.6], [-28.4, 5.2], [-25.4, 5.1], [-24.0, 2.05],
    [-18, 2.3], [-10, 2.9], [-4.5, 3.6], [-2.4, 4.9], [2, 5.8],
    [8, 6.9], [16, 7.5], [24, 7.6], [28, 7.25], [30, 6.5],
  ];
  const L = (z0, z1, dw) => section(P, z0, z1, dw);

  const l0 = L(-24, 29.6, 1.9);
  const l1 = L(-30.4, 30, 0.75);
  const l2 = L(-32, 30, 0);
  const l3 = L(-30.4, 30, 0.8);
  const l4 = L(-13, 30, 1.5);
  const l5 = L(-3, 30, 2.4);
  const l6 = L(4, 29.4, 3.35);
  const l7 = L(6.5, 28.5, 4.2);

  S.add(slab(l0, 1.2, 0.0, { material: greyMat }));   // keel
  S.add(slab(l1, 1.2, 1.2, { material: hullMat }));
  S.add(slab(l2, 1.2, 2.4, { material: hullMat }));
  S.add(slab(l3, 1.0, 3.6, { material: hullMat }));
  S.add(slab(l4, 1.2, 4.6, { material: hullMat }));
  S.add(slab(l5, 1.2, 5.8, { material: hullMat }));
  S.add(slab(l6, 1.2, 7.0, { material: hullMat }));
  S.add(slab(l7, PLATE, 8.2, { material: hullMat }));

  // studded decks (the LEGO tell)
  for (const [pf, y, keep] of [
    [l3, 4.6, (x, z) => z < -12 || Math.abs(x) > 1.2],
    [l4, 5.8, (x, z) => z < -1],
    [l6, 8.2, (x, z) => Math.abs(x) > 3.6 || z > 18],
    [l7, 8.6, (x, z) => z > 18.5],
  ]) {
    const s = deckStuds(poly(pf), y, { color: C.white, keep });
    if (s) S.add(s);
  }

  // hammerhead face plate + forward sensors
  S.add(hull([[-3.4, -29.8], [3.4, -29.8], [4.6, -28.4], [4.6, -25.8], [-4.6, -25.8], [-4.6, -28.4]], PLATE, 3.6, { color: C.darkGray }));
  S.add(at(tile(2, 1, 0.5, { color: C.black }), 0, 3.0, -31.2));
  S.add(at(cyl(0.35, 0.9, { color: C.veryLightGray, seg: 10 }), 0, 4.0, -27.2));
  S.add(at(rot(cyl(0.26, 1.4, { color: C.darkGray, seg: 8 }), Math.PI / 2, 0, 0), 0, 3.1, -33.0));
  for (const s of [1, -1]) {
    S.add(at(tile(1, 4, 0.6, { color: C.darkGray }), s * 4.0, 3.6, -27.2));
    S.add(at(cyl(0.3, 0.55, { color: C.black, seg: 8 }), s * 2.6, 4.05, -29.4));
    S.add(at(tile(2, 1, 0.4, { color: C.red }), s * 3.4, 3.6, -25.2));
    S.add(at(rot(bar(2.6, 0.09, { color: C.silver }), 0, 0, (s * Math.PI) / 2.1), s * 5.0, 3.3, -27.0));
  }

  // side window strips
  for (const s of [1, -1]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.62), winMat);
    a.rotation.y = (s * Math.PI) / 2;
    a.position.set(s * (widthAt(P, 6) - 0.05), 3.05, 6);
    S.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.5), winMat);
    b.rotation.y = (s * Math.PI) / 2;
    b.position.set(s * (widthAt(P, -14) + 0.02), 3.0, -14);
    S.add(b);
  }

  // ---- bridge ----
  const bp = [[7.5, 3.1], [11, 3.35], [16, 3.1], [18.2, 2.2]];
  const B = new THREE.Group();
  B.add(slab(bp, 1.2, 0, { material: hullMat }));
  B.add(slab(section(bp, 8.1, 17.8, 0.45), 1.2, 1.2, { material: hullMat }));
  B.add(slab(section(bp, 8.7, 17.2, 0.95), PLATE, 2.4, { color: C.veryLightGray }));
  const bs = deckStuds(poly(section(bp, 8.7, 17.2, 0.95)), 2.8, { color: C.veryLightGray, inset: 0.55 });
  if (bs) B.add(bs);
  const bwin = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 0.95), bwMat);
  bwin.position.set(0, 1.7, 7.42);
  bwin.rotation.y = Math.PI;
  B.add(bwin);
  for (const s of [1, -1]) {
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.9), bwMat);
    w2.rotation.y = (s * Math.PI) / 2;
    w2.position.set(s * 3.07, 1.7, 11.0);
    B.add(w2);
  }
  B.add(at(cyl(0.55, 0.5, { color: C.darkGray, seg: 12 }), 0, 2.8, 14.8));
  B.add(at(bar(2.4, 0.08, { color: C.silver }), 0, 3.3, 14.8));
  B.add(at(cyl(0.22, 1.0, { color: C.darkGray, seg: 8 }), 2.0, 2.8, 16.0));
  B.add(radar(1.5, 0.6, 2.0, 3.8, 16.0, { color: C.veryLightGray }));
  B.add(at(cyl(0.22, 0.7, { color: C.darkGray, seg: 8 }), -2.1, 2.8, 15.2));
  B.add(radar(1.1, 0.5, -2.1, 3.5, 15.2, { color: C.veryLightGray }));
  B.position.y = 8.6;
  S.add(B);

  // dorsal + ventral detail
  greebles(S, {
    x0: -6.2, x1: 6.2, z0: 10, z1: 28, y: 8.6, seed: seed + 3, count: 46,
    colors: [C.bluishGray, C.darkGray, C.veryLightGray], hMax: 1.0,
    test: (x, z, r) => inset(poly(l7), x, z, 0.8 + r) && (Math.abs(x) > 3.9 || z > 18.2),
  });
  greebles(S, {
    x0: -6.4, x1: 6.4, z0: -2, z1: 28, y: 0.0, seed: seed + 9, count: 64, down: true,
    colors: [C.darkGray, C.bluishGray, C.black], hMax: 1.0, studChance: 0,
    test: (x, z, r) => inset(poly(l0), x, z, 0.6 + r),
  });
  for (const s of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const z = 2 + i * 4.6;
      S.add(at(tile(1, 2, 1.1, { color: C.bluishGray }), s * (widthAt(P, z) - 0.4), 4.9, z));
    }
    for (let i = 0; i < 4; i++) {
      const z = -22 + i * 4.2;
      S.add(at(tile(1, 1, 0.8, { color: C.bluishGray }), s * (widthAt(P, z) - 0.3), 3.55, z));
    }
    S.add(hull([[0, 12], [3.0, 15.5], [3.0, 21], [0, 24]], 1.0, 3.4, { color: C.veryLightGray, x: s * 6.9 }));
  }

  // dorsal + ventral turret
  for (const [ty, tz, flip] of [[4.6, -16, 1], [1.2, -16, -1]]) {
    const t = new THREE.Group();
    t.add(cyl(0.85, 0.4, { color: C.bluishGray, seg: 12 }));
    t.add(at(cyl(0.6, 0.55, { color: C.veryLightGray, seg: 12 }), 0, 0.4, 0));
    for (const s of [1, -1]) t.add(at(rot(bar(2.0, 0.1, { color: C.darkGray }), Math.PI / 2, 0, 0), s * 0.28, 0.72, -1.0));
    t.scale.y = flip;
    t.position.set(0, ty, tz);
    S.add(t);
  }

  // ---- engine bank: eleven bells, rows of 4 / 4 / 3 ----
  const engines = [];
  S.add(slab(L(28.2, 30.2, 0.4), 8.2, 0.0, { color: C.darkGray }));
  S.add(at(tile(12, 1, 7.6, { color: C.bluishGray }), 0, 0.3, 29.3));
  const rows = [
    { y: 1.85, xs: [-4.9, -1.65, 1.65, 4.9], r: 1.42 },
    { y: 4.45, xs: [-4.9, -1.65, 1.65, 4.9], r: 1.42 },
    { y: 7.0, xs: [-3.3, 0, 3.3], r: 1.32 },
  ];
  for (const row of rows) {
    for (const x of row.xs) {
      const b = engineBell({ r: row.r, depth: 1.1, color: 0xb8ecff, plume: 3.6, plumeOpacity: 0.22, seg: 14 })
        .place(x, row.y, 32.0);
      S.add(b.shell);
      LIVE.add(b.live);
      engines.push(b.core);
    }
  }

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'bridge', 0, 11.6, 12);
  anchor(g, 'podBay', 5.4, 2.4, -6);
  anchor(g, 'dock', 0, 8.6, -18);
  anchor(g, 'tail', 0, 4.4, 31);

  lift(g, 1.0); // ventral greebles hang below the hull; keep the keel on y = 0
  g.userData.length = 64;
  g.userData.width = 15.2;
  g.userData.height = 13.7;
  g.userData.anchor = 'keel';
  return wireEngines(g, engines, 1);
}

/* ================================================================== */
/* star destroyer                                                      */
/* ================================================================== */

/** Small dorsal turbolaser bank used all over the imperial hulls. */
function turbolaserStub(o = {}) {
  const s = o.scale ?? 1;
  const t = new THREE.Group();
  t.add(cyl(1.1 * s, 0.5 * s, { color: C.bluishGray, seg: 10 }));
  t.add(at(cyl(0.75 * s, 0.7 * s, { color: C.lightGray, seg: 10 }), 0, 0.5 * s, 0));
  t.add(at(tile(1, 1, 0.4 * s, { color: C.darkGray }), 0, 1.2 * s, -0.3 * s));
  for (const sx of [1, -1]) {
    t.add(at(rot(bar(2.6 * s, 0.13 * s, { color: C.darkGray }), Math.PI / 2.35, 0, 0), sx * 0.3 * s, 1.1 * s, -1.2 * s));
  }
  return t;
}

/**
 * Imperial-I Star Destroyer: a 300-long grey arrowhead of stepped wedge
 * plates, a terraced command superstructure with two sensor globes and a
 * shield tower, deeply greebled underside and three huge stern engines.
 *
 * userData: length 300, engines[7] (three big first, then four outboard),
 *   setThrottle(v), killEngine(i), anchors {bridge, hangar, nose, dome*}
 */
export function starDestroyer(opt = {}) {
  const seed = opt.seed ?? 23;
  const g = new THREE.Group();
  g.name = 'starDestroyer';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();
  const R = rng(seed);

  const gt = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 26, 1 / 26] });
  const gt2 = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 9, 1 / 9] });
  const hullMat = mapMat('sdHull', 0x9b9e9c, gt, { rough: 0.55 });
  const deckMat = mapMat('sdDeck', 0xa8aba8, gt, { rough: 0.55 });
  const lowMat = mapMat('sdLow', 0x74776f, gt2, { rough: 0.6 });
  const towerMat = mapMat('sdTower', 0xa8aba8, gt2, { rough: 0.5 });
  // a band of the hull that follows the taper: fractions a..b of the half-width
  const band = (s, z0, z1, a, b, n = 10) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const z = z0 + ((z1 - z0) * i) / n; pts.push([s * a * widthAt(P, z), z]); }
    for (let i = n; i >= 0; i--) { const z = z0 + ((z1 - z0) * i) / n; pts.push([s * b * widthAt(P, z), z]); }
    return pts;
  };
  const winMat = litMat('sdWin', svgTex('bwin', SVG_BRIDGEWIN, { repeat: [1, 1] }), 0xbcd8ff, 1.35);
  const hangarMat = litMat('sdHangar', svgTex('win2', SVG_WINDOWS, { repeat: [6, 1] }), 0xffcf8a, 1.2);

  // straight-tapered arrowhead, slightly clipped stern corners
  const P = [[-150, 1.6], [-140, 4.0], [130, 71.5], [143, 74.6], [150, 73.2]];
  const A = section(P, -150, 150, 0);
  const Bl = section(P, -141, 150, 2.8);
  const Cl = section(P, -128, 150, 7.0);
  const spine = [[-128, 1.8], [-90, 4.2], [-30, 8.2], [30, 11.6], [68, 13.4]];
  const T1 = section(P, -26, 150, 21);
  const T2 = section(P, 26, 150, 31);
  const T3 = section(P, 62, 150, 40);
  const V1 = section(P, -132, 147, 9);
  const V2 = section(P, -104, 142, 21);

  const yV2 = 1.0, yV1 = 2.4, yA = 4.0, yB = 8.0, yC = 11.6, yD = 15.0;
  const ySp = 17.4, yT1 = 18.6, yT2 = 21.4, yT3 = 24.0;

  // ---- ventral: recessed under the hull rim, deeply greebled ----
  S.add(slab(V1, yA - yV1, yV1, { material: lowMat }));
  S.add(slab(V2, yV1 - yV2, yV2, { color: C.darkGray }));
  const v1p = poly(V1);
  const v2p = poly(V2);
  greebles(S, {   // deep pods hanging in the ring between the two ventral plates
    x0: -70, x1: 70, z0: -110, z1: 145, y: yV1, seed: seed + 1, count: 240, down: true,
    colors: [C.darkGray, C.bluishGray, C.black], hMin: 0.4, hMax: 2.2, maxW: 5, studChance: 0,
    test: (x, z, r) => inset(v1p, x, z, r + 1.5) && !inset(v2p, x, z, r), grid: 1,
  });
  greebles(S, {
    x0: -56, x1: 56, z0: -96, z1: 140, y: yV2, seed: seed + 3, count: 200, down: true,
    colors: [C.darkGray, C.bluishGray, C.black], hMin: 0.3, hMax: 0.95, maxW: 5, studChance: 0,
    test: (x, z, r) => inset(v2p, x, z, r + 1.5), grid: 1,
  });
  // ventral trenches + hangar mouth
  for (const s of [1, -1]) {
    S.add(at(tile(5, 90, 0.5, { color: C.black }), s * 26, yV2 - 0.05, 60));
    S.add(at(tile(3, 60, 0.4, { color: C.black }), s * 12, yV2 - 0.05, 24));
    S.add(at(tile(2, 40, 0.4, { color: C.darkGray }), s * 40, yV2 - 0.05, 96));
    S.add(at(tile(4, 12, 0.9, { color: C.bluishGray }), s * 33, yV2 - 0.4, 118));
  }
  S.add(at(tile(26, 16, 0.5, { color: C.black }), 0, yV2 - 0.1, 118));
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.4), hangarMat);
  hm.rotation.x = Math.PI / 2;
  hm.position.set(0, yV2 - 0.12, 118);
  S.add(hm);

  // ---- main hull: stacked wedge plates ----
  S.add(slab(A, yB - yA, yA, { material: hullMat }));
  S.add(slab(Bl, yC - yB, yB, { material: hullMat }));
  S.add(slab(Cl, yD - yC, yC, { material: deckMat }));
  S.add(slab(spine, ySp - yD, yD, { material: deckMat }));
  S.add(slab(T1, yT1 - yD, yD, { material: deckMat }));
  S.add(slab(T2, yT2 - yT1, yT1, { material: deckMat }));
  S.add(slab(T3, yT3 - yT2, yT2, { material: towerMat }));

  // hull edge chamfer strips, so the arrowhead rim catches light
  for (const s of [1, -1]) {
    for (let i = 0; i < 22; i++) {
      const z = -128 + i * 12.4;
      const w = widthAt(P, z);
      S.add(at(tile(1, 8, 2.2, { color: C.bluishGray }), s * (w - 0.7), yA + 0.4, z));
      if (i % 2 === 0) S.add(at(tile(2, 4, 1.2, { color: C.veryLightGray }), s * (w - 3.6), yB + 0.6, z));
      if (i % 3 === 0) S.add(at(tile(2, 3, 0.8, { color: C.darkGray }), s * (w - 3.0), yC - 0.6, z));
    }
  }

  // ---- dorsal deck: trenches, stepped panels, studded plates ----
  const deck = poly(Cl);
  const spineP = poly(spine);
  for (const s of [1, -1]) {
    // continuous trench flanking the spine, following the hull taper
    S.add(hull(band(s, -112, 62, 0.44, 0.61), 0.34, yD - 0.06, { color: C.black }));
    S.add(hull(band(s, -112, 62, 0.415, 0.45), 0.9, yD - 0.06, { color: C.lightGray }));
    S.add(hull(band(s, -112, 62, 0.605, 0.64), 0.9, yD - 0.06, { color: C.lightGray }));
    // outboard panel line and a shallow secondary trench
    S.add(hull(band(s, -100, 130, 0.78, 0.83), 0.3, yD - 0.02, { color: C.bluishGray }));
    S.add(hull(band(s, 20, 138, 0.24, 0.31), 0.3, yD - 0.02, { color: C.darkGray }));
    for (let i = 0; i < 14; i++) {
      const z = -104 + i * 12;
      const w = widthAt(P, z);
      S.add(at(tile(4, 1, 0.75, { color: C.bluishGray }), s * w * 0.525, yD - 0.02, z));
    }
    // conduit runs and machinery down on the trench floor
    for (const f of [0.474, 0.578]) {
      S.add(hull(band(s, -108, 58, f - 0.009, f + 0.009), 0.34, yD + 0.28, { color: C.bluishGray }));
    }
    greebles(S, {
      z0: -106, z1: 56, y: yD + 0.28,
      span: (z, u) => s * widthAt(P, z) * (0.468 + u * 0.114),
      seed: seed + (s > 0 ? 21 : 23), count: 120,
      colors: [C.darkGray, C.bluishGray, C.black, C.lightGray],
      hMin: 0.2, hMax: 0.85, maxW: 3, studChance: 0.25, grid: 1,
    });
  }
  // raised studded deck plates
  const plateCols = [C.lightGray, C.veryLightGray, C.bluishGray];
  let studs = 0;
  for (let i = 0; i < 90 && studs < 1500; i++) {
    const w = 3 + Math.floor(R() * 5);
    const d = 4 + Math.floor(R() * 7);
    const z = -126 + R() * 268;
    const x = (R() * 2 - 1) * widthAt(P, z);
    if (!inset(deck, x, z, Math.max(w, d) / 2 + 2.5)) continue;
    if (nearPoly(spineP, x, z, 3)) continue;
    if (Math.abs(x) < widthAt(P, z) * 0.52 + 5 && Math.abs(x) > widthAt(P, z) * 0.52 - 5) continue;
    S.add(at(brick(w, d, R() < 0.4 ? 0.7 : PLATE, { color: plateCols[i % 3] }), Math.round(x), yD, Math.round(z)));
    studs += w * d;
  }
  // spine detail
  const sp = deckStuds(spineP, ySp, { color: C.veryLightGray, inset: 2.2, keep: (x, z) => z > -110 });
  if (sp) S.add(sp);
  greebles(S, {
    x0: -20, x1: 20, z0: -110, z1: 60, y: ySp, seed: seed + 5, count: 80,
    colors: [C.bluishGray, C.lightGray, C.veryLightGray], hMax: 1.0, maxW: 4,
    test: (x, z, r) => inset(spineP, x, z, r + 1.6), grid: 1,
  });
  greebles(S, {
    x0: -66, x1: 66, z0: -110, z1: 145, y: yD, seed: seed + 7, count: 260,
    colors: [C.bluishGray, C.lightGray, C.darkGray, C.veryLightGray], hMax: 1.2, maxW: 4,
    test: (x, z, r) => inset(deck, x, z, r + 3) && !nearPoly(spineP, x, z, 2.5), grid: 1,
  });
  // terrace-edge greebles
  const t1p = poly(T1), t2p = poly(T2), t3p = poly(T3);
  greebles(S, {
    x0: -40, x1: 40, z0: 0, z1: 146, y: yT1, seed: seed + 11, count: 110,
    colors: [C.bluishGray, C.lightGray, C.veryLightGray], hMax: 1.1, maxW: 3,
    test: (x, z, r) => inset(t1p, x, z, r + 2) && !nearPoly(t2p, x, z, 2), grid: 1,
  });
  greebles(S, {
    x0: -34, x1: 34, z0: 30, z1: 146, y: yT2, seed: seed + 13, count: 80,
    colors: [C.bluishGray, C.lightGray, C.veryLightGray], hMax: 1.0, maxW: 3,
    test: (x, z, r) => inset(t2p, x, z, r + 2) && !nearPoly(t3p, x, z, 2), grid: 1,
  });
  greebles(S, {
    x0: -30, x1: 30, z0: 62, z1: 148, y: yT3, seed: seed + 15, count: 60,
    colors: [C.bluishGray, C.lightGray, C.veryLightGray], hMax: 1.0, maxW: 3,
    test: (x, z, r) => inset(t3p, x, z, r + 2) && (z > 146 || Math.abs(x) > 26), grid: 1,
  });

  // dorsal turbolaser banks along the deck edges
  for (const s of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const z = -70 + i * 30;
      const w = widthAt(P, z) - 9;
      S.add(at(turbolaserStub({ scale: 1.5 }), s * w, yD, z));
    }
    S.add(at(turbolaserStub({ scale: 1.2 }), s * 16, ySp, -104));
  }

  // ---- command superstructure ----
  const tower = new THREE.Group();
  const box = (w, d, h, y, z, m) => slabBox(w, d, h, y, 0, z, { material: m });
  const y1 = yT3, y2 = yT3 + 5.0, y3 = yT3 + 9.4, y4 = yT3 + 13.8;
  const yBr = yT3 + 18.8, yBrT = yT3 + 21.6, yTop = yT3 + 23.6;
  const tiers = [
    [52, 86, y1, y2, 103], [42, 70, y2, y3, 108], [30, 48, y3, y4, 115],
    [21, 34, y4, yBr, 119], [26, 28, yBr, yBrT, 120], [18, 18, yBrT, yTop, 120],
  ];
  for (const [w, d, ya, yb, cz] of tiers) {
    tower.add(box(w, d, yb - ya, ya, cz, ya > yBr ? towerMat : hullMat));
    // vertical ribs down each tier wall, plus a capping rail
    const n = Math.max(3, Math.round(w / 5));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 1.6 + (i * (w - 3.2)) / (n - 1);
      for (const s of [1, -1]) {
        tower.add(at(tile(1, 1, yb - ya - 0.3, { color: C.bluishGray }), x, ya, cz + s * (d / 2 - 0.3)));
      }
    }
    const m = Math.max(3, Math.round(d / 6));
    for (let i = 0; i < m; i++) {
      const z = cz - d / 2 + 2 + (i * (d - 4)) / (m - 1);
      for (const s of [1, -1]) {
        tower.add(at(tile(1, 1, yb - ya - 0.3, { color: C.bluishGray }), s * (w / 2 - 0.3), ya, z));
      }
    }
    tower.add(slabBox(w + 0.5, d + 0.5, 0.35, yb - 0.35, 0, cz, { color: C.bluishGray }));
    // a couple of studded service plates per tier
    for (const [px, pz, pw, pd] of [[-w / 4, cz - d / 4, 4, 6], [w / 4, cz + d / 4, 3, 5]]) {
      if (pw + 2 > w || pd + 2 > d) continue;
      tower.add(at(brick(pw, pd, PLATE, { color: C.veryLightGray }), Math.round(px), yb, Math.round(pz)));
    }
  }
  // bridge glass, wrapping the command deck
  const bwin = new THREE.Mesh(new THREE.PlaneGeometry(23, 2.0), winMat);
  bwin.position.set(0, yBr + 0.7, 105.9);
  bwin.rotation.y = Math.PI;
  tower.add(bwin);
  for (const s of [1, -1]) {
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(25, 2.0), winMat);
    w2.rotation.y = (s * Math.PI) / 2;
    w2.position.set(s * 13.1, yBr + 0.7, 120);
    tower.add(w2);
    const w3 = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.5), winMat);
    w3.rotation.y = (s * Math.PI) / 2;
    w3.position.set(s * 10.6, y4 + 2.6, 119);
    tower.add(w3);
    const w5 = new THREE.Mesh(new THREE.PlaneGeometry(44, 1.5), winMat);
    w5.rotation.y = (s * Math.PI) / 2;
    w5.position.set(s * 15.1, y3 + 2.4, 115);
    tower.add(w5);
  }
  const w4 = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.5), winMat);
  w4.position.set(0, y4 + 2.6, 101.9);
  w4.rotation.y = Math.PI;
  tower.add(w4);
  // sensor globes on short side pylons
  for (const s of [1, -1]) {
    tower.add(at(cyl(1.5, 1.8, { color: C.darkGray, seg: 12 }), s * 10.4, yTop, 120));
    tower.add(at(sphere(3.5, { color: C.veryLightGray, seg: 16 }), s * 10.4, yTop + 1.8, 120));
    tower.add(at(cyl(3.55, 0.5, { color: C.bluishGray, seg: 16 }), s * 10.4, yTop + 5.05, 120));
    tower.add(at(rot(cyl(3.55, 0.5, { color: C.bluishGray, seg: 16 }), Math.PI / 2, 0, 0), s * 10.4, yTop + 5.3, 120));
  }
  // shield / tractor mast between the globes
  tower.add(box(6, 6, 5.0, yTop, 120, towerMat));
  tower.add(box(4, 4, 4.0, yTop + 5.0, 120, hullMat));
  tower.add(at(cyl(1.1, 2.6, { color: C.veryLightGray, seg: 12 }), 0, yTop + 9.0, 120));
  tower.add(at(bar(5.0, 0.16, { color: C.silver }), 0, yTop + 11.6, 120));
  tower.add(radar(2.4, 0.9, 0, yBrT, 112, { color: C.veryLightGray }));
  greebles(tower, {
    x0: -25, x1: 25, z0: 60, z1: 146, y: y2, seed: seed + 17, count: 190,
    colors: [C.bluishGray, C.lightGray, C.darkGray, C.veryLightGray], hMax: 1.6, maxW: 4,
    test: (x, z, r) => Math.abs(x) < 25 - r && z > 60 + r && z < 146 - r &&
      !(Math.abs(x) < 21 + r && z > 73 - r && z < 143 + r), grid: 1,
  });
  greebles(tower, {
    x0: -21, x1: 21, z0: 73, z1: 143, y: y3, seed: seed + 19, count: 150,
    colors: [C.bluishGray, C.lightGray, C.veryLightGray, C.darkGray], hMax: 1.4, maxW: 3,
    test: (x, z, r) => Math.abs(x) < 20.5 - r && z > 73 + r && z < 143 - r &&
      !(Math.abs(x) < 15 + r && z > 91 - r && z < 139 + r), grid: 1,
  });
  greebles(tower, {
    x0: -15, x1: 15, z0: 91, z1: 139, y: y4, seed: seed + 23, count: 110,
    colors: [C.bluishGray, C.lightGray, C.veryLightGray, C.darkGray], hMax: 1.0, maxW: 2,
    test: (x, z, r) => Math.abs(x) < 14.5 - r && z > 91 + r && z < 139 - r &&
      !(Math.abs(x) < 10.5 + r && z > 102 - r && z < 136 + r), grid: 1,
  });
  greebles(tower, {
    x0: -12, x1: 12, z0: 107, z1: 133, y: yTop, seed: seed + 27, count: 34,
    colors: [C.bluishGray, C.veryLightGray, C.darkGray], hMax: 0.8, maxW: 2,
    test: (x, z, r) => Math.abs(x) < 9 - r && z > 108 + r && z < 132 - r &&
      !(Math.abs(x) < 4 + r && Math.abs(z - 120) < 4 + r) &&
      !(Math.abs(Math.abs(x) - 10.4) < 4 + r && Math.abs(z - 120) < 4.5 + r), grid: 1,
  });
  for (const s of [1, -1]) {
    tower.add(at(turbolaserStub({ scale: 1.4 }), s * 20, y2, 70));
    tower.add(at(turbolaserStub({ scale: 1.4 }), s * 20, y2, 140));
    tower.add(at(turbolaserStub({ scale: 1.1 }), s * 11, y4, 96));
  }
  S.add(tower);

  // ---- stern face + engines ----
  S.add(slab(section(P, 146.4, 150, 1.0), yT3, 0, { color: C.darkGray }));
  S.add(at(tile(150, 2, yT3 - 1.2, { color: 0x5f625d }), 0, 0.6, 148.4));
  const engines = [];
  const bells = [
    [0, 11.6, 9.8], [-22.0, 11.6, 9.8], [22.0, 11.6, 9.8],
    [-38.5, 8.4, 3.9], [38.5, 8.4, 3.9], [-48.5, 8.4, 3.9], [48.5, 8.4, 3.9],
  ];
  for (const [x, y, r] of bells) {
    const b = engineBell({
      r, depth: r * 0.42, color: 0xc9f0ff, plume: r * 1.9, plumeOpacity: 0.14,
      seg: r > 8 ? 26 : 14, shell: C.bluishGray,
    }).place(x, y, 150.6);
    S.add(b.shell);
    LIVE.add(b.live);
    engines.push(b.core);
  }
  greebles(S, {
    x0: -70, x1: 70, z0: 146, z1: 149, y: yT3, seed: seed + 29, count: 44,
    colors: [C.bluishGray, C.darkGray], hMax: 1.4, maxW: 3, studChance: 0, grid: 1,
    test: (x) => Math.abs(x) > 68 || Math.abs(x) < 66,
  });

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'bridge', 0, yBr + 0.7, 105);
  anchor(g, 'nose', 0, yB, -148);
  anchor(g, 'hangar', 0, yV2 - 0.2, 118);
  anchor(g, 'domeL', -10.4, yTop + 5.3, 120);
  anchor(g, 'domeR', 10.4, yTop + 5.3, 120);
  anchor(g, 'tail', 0, 12, 151);

  g.userData.length = 300;
  g.userData.width = 149;
  g.userData.height = yTop + 12;
  g.userData.anchor = 'keel';
  return wireEngines(g, engines, 1);
}

/* ================================================================== */
/* escape pod                                                          */
/* ================================================================== */

/**
 * Class-6 escape pod: cone nose, lit viewport band, retro thruster ring.
 * userData: length 9, engines[6], anchor='keel'
 */
export function escapePod(opt = {}) {
  const seed = opt.seed ?? 3;
  const g = new THREE.Group();
  g.name = 'escapePod';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();
  const R = 2.5;
  const cy = R + 0.3;

  const bandMat = litMat('podBand', svgTex('win3', SVG_WINDOWS, { repeat: [3, 1] }));

  // nose -> body -> tail, z from -4.5 to +4.5
  S.add(at(rot(cone(1.05, 0.3, 0.9, { color: C.veryLightGray, seg: 16 }), -Math.PI / 2, 0, 0), 0, cy, -3.6));
  S.add(at(rot(cone(R, 1.05, 2.2, { color: C.white, seg: 18 }), -Math.PI / 2, 0, 0), 0, cy, -1.4));
  S.add(at(rot(cyl(R, 1.2, { color: C.darkGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, -1.5));
  const band = at(rot(cyl(R * 1.012, 1.1, { color: 0xffffff, seg: 20 }), Math.PI / 2, 0, 0), 0, cy, -1.45);
  band.material = bandMat;
  S.add(band);
  S.add(at(rot(cyl(R, 3.2, { color: C.white, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, -0.35));
  S.add(at(rot(cyl(R * 0.99, PLATE, { color: C.bluishGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, 2.85));
  S.add(at(rot(cyl(R * 0.86, 1.1, { color: C.veryLightGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, 3.25));
  S.add(at(rot(cyl(R * 0.68, 0.4, { color: C.darkGray, seg: 16 }), Math.PI / 2, 0, 0), 0, cy, 4.1));
  for (const z of [-0.3, 0.95, 2.2]) {
    S.add(at(rot(cyl(R * 1.02, 0.22, { color: C.bluishGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, z));
  }
  // dorsal fairing + hatch (studs read as LEGO)
  S.add(at(tile(3, 4, 0.34, { color: C.veryLightGray }), 0, cy + R - 0.46, 0.4));
  S.add(at(brick(2, 3, PLATE, { color: C.white }), 0, cy + R - 0.14, 0.4));
  S.add(at(cyl(0.62, 0.24, { color: C.bluishGray, seg: 12, studs: true }), 0, cy + R - 0.1, -0.9));
  S.add(at(cyl(0.2, 0.45, { color: C.darkGray, seg: 8 }), 0, cy + R + 0.24, 2.2));
  // ventral skid rails: puts the keel on y = 0
  for (const s of [1, -1]) {
    S.add(at(tile(1, 7, 0.5, { color: C.darkGray }), s * 1.1, 0.0, 0.2));
    S.add(at(rot(tile(1, 5, 0.34, { color: C.bluishGray }), 0, 0, (s * Math.PI) / 2.4), s * (R - 0.42), cy - 1.28, 0.4));
    S.add(at(tile(1, 3, 0.2, { color: C.red }), s * 1.2, cy + R - 0.12, 1.4));
  }
  greebles(S, {
    x0: -1.3, x1: 1.3, z0: 2.6, z1: 3.7, y: cy + R * 0.6, seed, count: 10,
    colors: [C.bluishGray, C.darkGray], hMax: 0.5, maxW: 2,
  });

  const engines = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const b = engineBell({ r: 0.5, depth: 0.4, color: 0xffe9c8, plume: 0.9, plumeOpacity: 0.18, seg: 10, shell: C.bluishGray })
      .place(Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6, 4.5);
    S.add(b.shell);
    LIVE.add(b.live);
    engines.push(b.core);
  }

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'hatch', 0, cy + R + 0.3, 0.4);

  g.userData.length = 9;
  g.userData.width = R * 2;
  g.userData.height = cy + R;
  g.userData.anchor = 'keel';
  return wireEngines(g, engines, 0.85);
}

/* ================================================================== */
/* X-wing                                                             */
/* ================================================================== */

/**
 * T-65 X-wing.  Four S-foils on independent pivots, four wing-tip cannons,
 * astromech socket, transparent canopy, red squadron decals.
 *
 * userData: length 26, setSFoils(t) 0 = closed / 1 = open, sFoils (0..1),
 *   cannonTips[4] (Object3D at each muzzle, use getWorldPosition),
 *   engines[4], wings[4], setThrottle(v), anchors {pilot, droid, nose}
 */
export function xwing(opt = {}) {
  const seed = opt.seed ?? 5;
  const g = new THREE.Group();
  g.name = 'xwing';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();

  const markTex = svgTex('xmark', SVG_XWING_MARK, { repeat: [1, 1] });
  const rebelTex = svgTex('rebel', SVG_REBEL, { repeat: [1, 1] });
  const screenTex = svgTex('screen', SVG_SCREEN, { repeat: [1, 1] });
  const panelTex = svgTex('panelx', SVG_PANEL, { repeat: [1 / 4, 1 / 4] });
  const bodyMat = mapMat('xwBody', 0xe9eae6, panelTex, { rough: 0.45 });
  const greyMat = mapMat('xwGrey', 0x8f9290, panelTex, { rough: 0.5 });
  const glass = mat(0xdcf0ff, { color: 0xdcf0ff, transparent: true, opacity: 0.36, rough: 0.08 });

  // ---- fuselage ----
  const F = [
    [-13, 0.34], [-11.6, 0.72], [-8.5, 0.98], [-5, 1.18], [-2.6, 1.5],
    [1.6, 1.62], [5, 1.72], [9.4, 1.78], [12, 1.6], [12.8, 1.2],
  ];
  S.add(slab(section(F, -13, 12.8, 0.2), 0.7, -1.0, { material: greyMat }));
  S.add(slab(F, 0.85, -0.3, { material: bodyMat }));
  S.add(slab(section(F, -12.6, 12.6, 0.26), 0.6, 0.55, { material: bodyMat }));
  S.add(slab(section(F, -9, 11.4, 0.62), 0.5, 1.15, { material: bodyMat }));
  // nose taper cap + sensor tip
  S.add(at(rot(cone(0.42, 0.12, 0.9, { color: C.darkGray, seg: 10 }), -Math.PI / 2, 0, 0), 0, 0.1, -13.0));
  S.add(at(tile(1, 4, 0.34, { color: C.darkGray }), 0, 0.55, -10.6));
  for (const s of [1, -1]) {
    // four nose vents
    for (const [zz, ln] of [[-9.6, 2], [-6.6, 2]]) {
      S.add(at(tile(1, ln, 0.42, { color: C.black }), s * 0.72, -0.34, zz));
      S.add(at(tile(1, ln, 0.3, { color: C.darkGray }), s * 0.62, 0.62, zz));
    }
    S.add(at(tile(1, 7, 0.34, { color: C.red }), s * 0.62, 0.66, -5.6));
    S.add(at(tile(1, 2, 0.36, { color: C.bluishGray }), s * 1.15, -0.28, 3.4));
    // flank panel lines and vents
    for (const [zz, dd] of [[-11.0, 3], [-4.2, 4], [1.0, 3], [8.6, 4]]) {
      S.add(at(tile(1, dd, 0.34, { color: 0x6f736e }), s * (widthAt(F, zz) - 0.42), -0.1, zz));
    }
    S.add(at(tile(1, 2, 0.5, { color: C.black }), s * (widthAt(F, 9.6) - 0.4), 0.7, 9.6));
    S.add(at(brick(1, 3, PLATE, { color: C.veryLightGray }), s * 0.62, 1.65, -8.6));
    // nose stripe decals
    const d = decal(3.6, 0.95, markTex, 'xmark');
    d.rotation.y = (s * Math.PI) / 2;
    d.position.set(s * (widthAt(F, -7.0) + 0.03), 0.15, -7.0);
    S.add(d);
  }
  // rebel insignia behind the cockpit
  const ins = decal(2.1, 2.1, rebelTex, 'rebel');
  ins.rotation.x = -Math.PI / 2;
  ins.position.set(0, 1.67, 5.4);
  S.add(ins);

  // ---- cockpit ----
  S.add(slab([[-3.0, 1.42], [-1.4, 1.55], [1.4, 1.55], [2.4, 1.3]], 0.6, 1.65, { color: C.bluishGray }));
  const scr = decal(1.9, 1.0, screenTex, 'screen');
  scr.rotation.x = -0.95;
  scr.position.set(0, 2.1, -2.1);
  S.add(scr);
  S.add(at(tile(1, 1, 0.5, { color: C.darkGray }), 0, 2.25, -0.4));   // seat back
  S.add(at(tile(2, 1, 0.22, { color: C.black }), 0, 2.25, -1.2));
  // canopy: frame + glass
  const canopy = new THREE.Group();
  canopy.add(hull([[-1.5, -3.1], [1.5, -3.1], [1.6, 1.1], [-1.6, 1.1]], 0.16, 2.25, { color: C.bluishGray }));
  canopy.add(hull([[-1.28, -2.9], [1.28, -2.9], [1.36, 0.9], [-1.36, 0.9]], 1.0, 2.3, { material: glass }));
  const nosePane = at(rot(slope(1.2, 2.7, 1.0, 0.15, { color: 0xdcf0ff }), 0, -Math.PI / 2, 0), 0, 2.3, -3.6);
  nosePane.material = glass;
  canopy.add(nosePane);
  canopy.add(at(tile(3, 1, 0.24, { color: C.bluishGray }), 0, 3.28, 0.6));
  canopy.add(at(tile(1, 5, 0.2, { color: C.bluishGray }), 0, 3.3, -1.4));
  S.add(canopy);

  // ---- astromech socket ----
  S.add(at(cyl(1.05, 0.4, { color: C.darkGray, seg: 14 }), 0, 1.6, 3.0));
  S.add(at(cyl(0.92, 0.5, { color: C.black, seg: 14 }), 0, 1.9, 3.0));
  const dome = at(sphere(0.85, { color: C.veryLightGray, seg: 14 }), 0, 1.55, 3.0);
  S.add(dome);
  S.add(at(cyl(0.86, 0.22, { color: C.bluishGray, seg: 14 }), 0, 2.28, 3.0));
  S.add(at(rot(cyl(0.2, 0.5, { color: C.black, seg: 8 }), Math.PI / 2, 0, 0), -0.22, 2.7, 2.2));
  S.add(at(tile(1, 1, 0.2, { color: C.azure }), 0.36, 2.72, 2.4));

  // ---- rear engine deck + fins ----
  S.add(slab([[9.0, 1.9], [12.4, 1.7], [13.0, 1.0]], 2.0, -0.9, { material: greyMat }));
  S.add(at(tile(3, 2, 0.5, { color: C.darkGray }), 0, 1.75, 11.0));
  S.add(hull([[-0.35, 6.0], [0.35, 6.0], [0.35, 12.6], [-0.35, 12.6]], 1.5, 1.75, { color: C.veryLightGray }));
  greebles(S, {
    x0: -1.4, x1: 1.4, z0: 6.6, z1: 12.2, y: 1.75, seed, count: 16,
    colors: [C.bluishGray, C.darkGray, C.veryLightGray], hMax: 0.55, maxW: 2, grid: 0.5,
    test: (x) => Math.abs(x) > 0.55,
  });

  // ---- four S-foils ----
  const wings = [];
  const cannonTips = [];
  const engines = [];
  for (const s of [1, -1]) {
    for (const up of [1, -1]) {
      const W = new THREE.Group();  // static wing parts, pivot-local
      const px = s * 1.45, py = up * 0.42, pz = 6.4;
      const plate = [[s * -0.7, -2.5], [s * 10.9, -3.3], [s * 11.1, 1.0], [s * -0.7, 1.7]];
      W.add(hull(plate, 0.46, -0.23, { material: bodyMat }));
      // red squadron flashes: two chordwise bands, top and bottom
      for (const band of [
        [[s * 9.2, -3.16], [s * 10.4, -3.25], [s * 10.4, 1.05], [s * 9.2, 1.12]],
        [[s * 5.2, -2.89], [s * 6.1, -2.95], [s * 6.1, 1.31], [s * 5.2, 1.36]],
      ]) {
        W.add(hull(band, 0.2, 0.23, { color: C.red }));
        W.add(hull(band, 0.2, -0.43, { color: C.red }));
      }
      W.add(at(tile(1, 3, 0.22, { color: C.bluishGray }), s * 6.4, 0.23, 0.0));
      W.add(at(tile(1, 3, 0.22, { color: C.bluishGray }), s * 4.0, -0.45, 0.2));
      const wd = decal(1.8, 0.7, markTex, 'xmark');
      wd.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
      wd.position.set(s * 7.8, 0.25, -1.4);
      W.add(wd);
      // engine nacelle
      W.add(at(rot(cyl(0.98, 5.8, { color: C.veryLightGray, seg: 14 }), Math.PI / 2, 0, 0), s * 1.85, 0, -1.9));
      W.add(at(rot(cyl(1.04, 0.5, { color: C.bluishGray, seg: 14 }), Math.PI / 2, 0, 0), s * 1.85, 0, -2.0));
      W.add(at(rot(cyl(1.04, 0.4, { color: C.bluishGray, seg: 14 }), Math.PI / 2, 0, 0), s * 1.85, 0, 1.6));
      W.add(at(rot(cone(0.9, 0.5, 1.0, { color: C.darkGray, seg: 14 }), -Math.PI / 2, 0, 0), s * 1.85, 0, -1.9));
      W.add(at(tile(1, 4, 0.3, { color: C.darkGray }), s * 1.85, 0.94, -0.4));
      W.add(at(tile(1, 4, 0.3, { color: C.red }), s * 1.85, -1.24, -0.4));
      // wing-tip cannon
      W.add(at(rot(cyl(0.34, 2.2, { color: C.bluishGray, seg: 10 }), Math.PI / 2, 0, 0), s * 10.4, 0, -2.0));
      W.add(at(rot(cyl(0.19, 11.6, { color: C.lightGray, seg: 8 }), Math.PI / 2, 0, 0), s * 10.4, 0, -12.4));
      W.add(at(rot(cyl(0.26, 0.7, { color: C.darkGray, seg: 8 }), Math.PI / 2, 0, 0), s * 10.4, 0, -12.7));
      W.add(at(rot(cyl(0.24, 1.6, { color: C.darkGray, seg: 8 }), Math.PI / 2, 0, 0), s * 10.4, 0, 0.6));
      W.add(at(rot(cyl(0.22, 0.9, { color: C.bluishGray, seg: 8 }), Math.PI / 2, 0, 0), s * 10.4, 0, -6.4));

      const pivot = new THREE.Group();
      pivot.name = `sfoil_${s > 0 ? 'R' : 'L'}${up > 0 ? 'T' : 'B'}`;
      pivot.position.set(px, py, pz);
      const b = engineBell({ r: 0.86, depth: 0.5, color: 0xd6f2ff, plume: 2.0, plumeOpacity: 0.2, seg: 12 })
        .place(s * 1.85, 0, 4.2);
      W.add(b.shell);                     // static: folds into the wing bake
      pivot.add(bake(W));
      pivot.add(b.live);
      engines.push(b.core);
      const tip = new THREE.Object3D();
      tip.position.set(s * 10.4, 0, -12.8);
      pivot.add(tip);
      cannonTips.push(tip);
      pivot.userData.sign = s;
      pivot.userData.up = up;
      wings.push(pivot);
      g.add(pivot);
    }
  }

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'pilot', 0, 2.4, -1.4);
  anchor(g, 'droid', 0, 2.3, 3.0);
  anchor(g, 'nose', 0, 0, -13.2);

  g.userData.length = 26;
  g.userData.width = 21.6;
  g.userData.height = 7.9;   // S-foils open; ~5.2 closed
  g.userData.anchor = 'center';
  g.userData.wings = wings;
  g.userData.cannonTips = cannonTips;
  g.userData.sFoils = 0;
  g.userData.setSFoils = (t) => {
    const k = Math.max(0, Math.min(1, t));
    g.userData.sFoils = k;
    const a = 0.30 * k;
    for (const w of wings) w.rotation.z = w.userData.sign * w.userData.up * a;
  };
  g.userData.setSFoils(opt.sfoils ?? 1);
  return wireEngines(g, engines, 1);
}

/* ================================================================== */
/* TIE fighter                                                         */
/* ================================================================== */

/**
 * Bar lying in the YZ plane, running from (y0,z0) to (y1,z1).
 * `w` is its width across the plane, `thick` its X extent (centred on `x`).
 */
function yzBar(x, y0, z0, y1, z1, w, thick, o) {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dy, dz);
  const t = tile(w, 1, thick, o);
  t.scale.z = len;
  return at(rot(t, Math.atan2(-dy, dz), 0, Math.PI / 2),
    x + thick / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

/** Studded plate whose studs face outward along X (s = +1 or -1). */
function studPlateX(w, d, s, x, y, z, o = {}) {
  return at(rot(brick(w, d, PLATE, o), 0, 0, (-s * Math.PI) / 2), x, y, z);
}

/** Cylinder/cone lying along X, spanning x0..x1 (rBase at x0, rTop at x1). */
function xCyl(rBase, rTop, x0, x1, y, z, o = {}) {
  const s = x1 >= x0 ? 1 : -1;
  return at(rot(cone(rBase, rTop, Math.abs(x1 - x0), o), 0, 0, (-s * Math.PI) / 2), x0, y, z);
}

/** Cylinder/cone lying along Z, spanning z0..z1 (rBase at z0, rTop at z1). */
function zCyl(rBase, rTop, z0, z1, x, y, o = {}) {
  const s = z1 >= z0 ? 1 : -1;
  return at(rot(cone(rBase, rTop, Math.abs(z1 - z0), o), (s * Math.PI) / 2, 0, 0), x, y, z0);
}

/**
 * Bar lying flat in the XZ plane from (x0,z0) to (x1,z1), `h` tall in Y.
 * Wrap a group of these in `rot(g, -Math.PI/2)` to stand them up facing -Z.
 */
function xzBar(x0, z0, x1, z1, w, h, o) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const t = tile(w, 1, h, o);
  t.scale.z = Math.hypot(dx, dz);
  return at(rot(t, 0, Math.atan2(dx, dz), 0), (x0 + x1) / 2, 0, (z0 + z1) / 2);
}

/** Regular hexagon of radius r in XZ, flat-topped when `flat` (default pointy). */
function hexPts(r, phase = Math.PI / 6) {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + phase;
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
}

/** Flat panel standing in the YZ plane: pts are [height, depth]. */
function flatPanel(pts, thick, o = {}) {
  const holder = new THREE.Group();
  const m = prism(pts.map(([a, b]) => [a, -b]), thick, o);
  if (o.material) m.material = o.material;
  m.position.y = -(thick - 2 * PB) - thick / 2;
  holder.add(m);
  holder.rotation.z = Math.PI / 2;
  const g = new THREE.Group();
  g.add(holder);
  return g;
}

/**
 * TIE/ln fighter: ball cockpit with a hexagonal window frame, two hexagonal
 * wing panels on struts, twin chin cannons, twin red drive glow.
 *
 * userData: width 20, cannonTips[2], engines[2], anchors {pilot}
 */
export function tiefighter(opt = {}) {
  const seed = opt.seed ?? 17;
  const g = new THREE.Group();
  g.name = 'tiefighter';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();

  const gt = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 7, 1 / 7] });
  const cellMat = mapMat('tieCell', 0x4a5058, gt, { rough: 0.62 });
  const frameMat = M(0xa8adaa, { rough: 0.5 });
  const ballMat = mapMat('tieBall', 0x9ba1a2, gt, { rough: 0.5 });
  const glassMat = mat(C.transClear, { color: C.transClear, transparent: true, opacity: 0.35, rough: 0.1 });

  // ---- ball cockpit ----
  const BR = 2.45;
  const ball = at(sphere(BR, { color: 0x9ba1a2, seg: 20 }), 0, -BR, 0);
  ball.material = ballMat;
  S.add(ball);
  S.add(at(rot(cyl(BR * 0.99, 0.5, { color: C.darkGray, seg: 20 }), Math.PI / 2, 0, 0), 0, 0, -0.25));
  // hexagonal window frame on the nose: built flat in XZ, then stood upright
  const face = new THREE.Group();
  const hexOuter = hexPts(2.0);
  face.add(hull(hexPts(1.78), 0.16, 0.16, { material: glassMat }));
  for (let i = 0; i < 6; i++) {
    const [ax, az] = hexOuter[i];
    const [bx, bz] = hexOuter[(i + 1) % 6];
    face.add(xzBar(ax, az, bx, bz, 0.62, 0.36, { color: C.black }));
  }
  // mullions: one upright, two across
  for (const zz of [-0.78, 0.78]) {
    const b = tile(1, 0.34, 0.3, { color: C.black });
    b.scale.x = 2.6;
    face.add(at(b, 0, 0, zz));
  }
  const up = tile(0.34, 1, 0.3, { color: C.black });
  up.scale.z = 3.1;
  face.add(at(up, 0, 0, 0));
  face.rotation.x = -Math.PI / 2;
  face.position.set(0, 0, -BR + 0.02);
  S.add(face);
  greebles(S, {
    x0: -1.4, x1: 1.4, z0: 1.4, z1: 2.1, y: 1.3, seed, count: 8,
    colors: [C.darkGray, C.bluishGray], hMax: 0.5, maxW: 2, grid: 0.5,
  });
  S.add(at(rot(cyl(1.5, 0.5, { color: C.darkGray, seg: 14 }), Math.PI / 2, 0, 0), 0, 0, BR - 0.3));
  S.add(at(rot(cyl(1.15, 0.5, { color: C.black, seg: 14 }), Math.PI / 2, 0, 0), 0, 0, BR + 0.1));
  S.add(at(brick(2, 2, PLATE, { color: C.lightGray }), 0, 1.98, 0.1));
  S.add(at(rot(brick(2, 2, PLATE, { color: C.lightGray }), Math.PI, 0, 0), 0, -1.98, 0.1));

  // ---- chin cannons ----
  const cannonTips = [];
  for (const s of [1, -1]) {
    S.add(at(brick(1, 2, 0.5, { color: C.darkGray }), s * 1.05, -2.05, -1.5));
    S.add(at(rot(cyl(0.36, 1.3, { color: C.darkGray, seg: 10 }), Math.PI / 2, 0, 0), s * 1.05, -1.9, -2.9));
    S.add(at(rot(cyl(0.2, 2.9, { color: C.silver, seg: 8 }), Math.PI / 2, 0, 0), s * 1.05, -1.9, -5.1));
    S.add(at(rot(cyl(0.29, 0.45, { color: C.black, seg: 8 }), Math.PI / 2, 0, 0), s * 1.05, -1.9, -5.1));
    const tip = new THREE.Object3D();
    tip.position.set(s * 1.05, -1.9, -5.2);
    g.add(tip);
    cannonTips.push(tip);
  }

  // ---- wings ----
  // Classic TIE/ln hexagon seen side-on: flat top and bottom edges, a point
  // fore and aft.  Panel plane is at x = +-HW, height along Y, depth along Z.
  const HW = 9.6;
  const PH = 5.55; // half height
  const PD = 3.55; // half depth at the fore/aft points
  const PT = 2.3;  // half depth of the top/bottom edges
  const hex = [
    [PH, -PT], [PH, PT], [0, PD], [-PH, PT], [-PH, -PT], [0, -PD],
  ];
  const PANEL_T = 0.5; // cell panel thickness
  const FRAME_T = 1.0; // frame / spoke thickness (stands proud of the cells)
  for (const s of [1, -1]) {
    // strut: tapered pylon from the ball out to the panel hub
    S.add(xCyl(1.12, 0.72, s * 1.9, s * (HW - 1.1), 0, 0, { color: C.lightGray, seg: 12 }));
    S.add(xCyl(1.3, 1.3, s * 2.1, s * 2.9, 0, 0, { color: C.darkGray, seg: 14 }));
    S.add(xCyl(1.15, 1.15, s * (HW - 1.4), s * (HW - 0.5), 0, 0, { color: 0xa8adaa, seg: 16 }));

    // dark solar-cell panel
    const panel = flatPanel(hex, PANEL_T, { material: cellMat });
    panel.position.x = s * HW;
    S.add(panel);

    // raised frame around the rim
    for (let i = 0; i < 6; i++) {
      const [ay, az] = hex[i];
      const [by, bz] = hex[(i + 1) % 6];
      S.add(yzBar(s * HW, ay, az, by, bz, 0.78, FRAME_T, { material: frameMat }));
    }
    // radial spokes from the hub out to each corner
    for (const [vy, vz] of hex) {
      const l = Math.hypot(vy, vz);
      S.add(yzBar(s * HW, (vy / l) * 1.0, (vz / l) * 1.0, vy * 0.93, vz * 0.93, 0.5, FRAME_T * 0.8, { material: frameMat }));
    }
    // hub caps either side, plus outboard sensor stub
    for (const t of [1, -1]) {
      S.add(xCyl(1.3, 1.15, s * HW + t * 0.25, s * HW + t * 0.72, 0, 0, { color: 0xa8adaa, seg: 16 }));
      S.add(xCyl(0.62, 0.5, s * HW + t * 0.72, s * HW + t * 1.02, 0, 0, { color: C.darkGray, seg: 12 }));
      // studded plates on the frame so the panels still read as LEGO
      for (const py of [PH - 0.95, -PH + 0.95]) {
        S.add(studPlateX(2, 2, t, s * HW + t * (FRAME_T / 2), py, 0, { color: 0xa8adaa }));
      }
      for (const pz of [PD - 2.0, -PD + 2.0]) {
        S.add(studPlateX(1, 3, t, s * HW + t * (FRAME_T / 2), 0, pz, { color: 0xa8adaa }));
      }
    }
  }

  // ---- twin drives ----
  const engines = [];
  for (const s of [1, -1]) {
    const b = engineBell({ r: 0.6, depth: 0.5, color: 0xff6a2e, plume: 1.5, plumeOpacity: 0.2, seg: 12, shell: C.darkGray })
      .place(s * 0.92, 0, BR + 0.35);
    S.add(b.shell);
    LIVE.add(b.live);
    engines.push(b.core);
  }

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'pilot', 0, 0, -0.6);

  g.userData.length = 9.4;
  g.userData.width = 21.4;
  g.userData.height = 11.9;
  g.userData.anchor = 'center';
  g.userData.cannonTips = cannonTips;
  return wireEngines(g, engines, 1);
}

/* ================================================================== */
/* Millennium Falcon                                                   */
/* ================================================================== */

/**
 * Light freighter: round saucer, forward mandible fork, starboard cockpit
 * tube, dorsal + ventral quad turrets, wide rear engine glow strip.
 *
 * userData: length 34, engines[5], turrets[2] (aimable groups),
 *   setThrottle(v), anchors {cockpit, rampTop, turretTop}
 */
export function falcon(opt = {}) {
  const seed = opt.seed ?? 29;
  const g = new THREE.Group();
  g.name = 'falcon';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();
  const R = rng(seed);

  const gt = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 10, 1 / 10] });
  const hullMat = mapMat('flHull', 0xb9bcb8, gt, { rough: 0.5 });
  const lowMat = mapMat('flLow', 0x8d918c, gt, { rough: 0.55 });
  const glassMat = mat(C.transClear, { color: C.transClear, transparent: true, opacity: 0.4, rough: 0.1 });

  const CR = 12.6;      // saucer radius
  const CZ = 3.6;       // saucer centre
  const yb = 0.5;       // keel

  // ---- saucer ----
  const disc = (r, h, y, m, seg = 40) => {
    const c = at(cyl(r, h, { color: C.lightGray, seg }), 0, y, CZ);
    if (m) c.material = m;
    return c;
  };
  S.add(disc(11.4, 1.0, yb, lowMat));
  S.add(disc(CR, 1.5, yb + 1.0, hullMat));
  S.add(disc(11.6, 0.9, yb + 2.5, hullMat));
  S.add(disc(8.6, 1.0, yb + 3.4, hullMat));
  S.add(disc(4.6, 0.7, yb + 4.4, hullMat));
  S.add(disc(9.8, 0.9, yb - 0.9, lowMat, 32));
  S.add(disc(5.4, 0.8, yb - 1.7, lowMat, 24));
  // rim band
  S.add(disc(CR + 0.12, 0.5, yb + 1.5, null, 40));

  // ---- mandible fork ----
  // Roots reach back inside the saucer so the prongs grow out of the hull;
  // the notch between them is the classic rectangular slot.
  const NOTCH = 2.6;
  for (const s of [1, -1]) {
    const arm = [
      [s * NOTCH, -17.6], [s * NOTCH, -9.4], [s * 3.7, -3.4],
      [s * 7.0, -3.4], [s * 7.6, -11.2], [s * 6.9, -17.2],
    ];
    S.add(hull(arm, 2.8, yb + 0.6, { material: hullMat }));
    S.add(hull(arm.map(([x, z]) => [x * 0.93, z]), 0.4, yb + 3.4, { color: C.veryLightGray }));
    // blunt tip cap + forward sensor lances
    S.add(hull([[s * NOTCH, -17.6], [s * 6.9, -17.2], [s * 6.7, -18.4], [s * 3.0, -18.6]], 1.9, yb + 1.0,
      { color: C.bluishGray }));
    S.add(at(rot(cyl(0.24, 1.9, { color: C.silver, seg: 8 }), -Math.PI / 2, 0, 0), s * 5.4, yb + 2.4, -18.4));
    S.add(at(tile(2, 4, 0.5, { color: C.bluishGray }), s * 5.0, yb + 3.8, -13.6));
    S.add(at(brick(2, 3, PLATE, { color: C.veryLightGray }), s * 4.3, yb + 3.8, -8.0));
    greebles(S, {
      x0: s > 0 ? NOTCH + 0.3 : -7.2, x1: s > 0 ? 7.2 : -NOTCH - 0.3, z0: -17.0, z1: -5.0, y: yb + 3.4,
      seed: seed + (s > 0 ? 1 : 2), count: 34,
      colors: [C.bluishGray, C.darkGray, C.veryLightGray], hMax: 0.8, maxW: 2, grid: 0.5,
      test: (x, z, r) => Math.abs(x) > NOTCH + 0.4 + r || z > -9.0,
    });
  }
  // fork throat: recessed cargo mouth set back between the prongs
  S.add(hull([[-NOTCH, -9.4], [NOTCH, -9.4], [NOTCH, -4.0], [-NOTCH, -4.0]], 1.9, yb + 0.9, { color: C.bluishGray }));
  S.add(at(rot(cyl(1.15, 0.7, { color: C.darkGray, seg: 14 }), -Math.PI / 2, 0, 0), 0, yb + 1.9, -9.4));
  S.add(at(tile(5, 1, 1.4, { color: C.darkGray }), 0, yb + 1.0, -9.9));

  // ---- starboard cockpit tube (built along -Z, then swung outboard) ----
  const tube = new THREE.Group();
  const tubeLen = 6.6;
  const zc = (r, h, z, col) => at(rot(cyl(r, h, { color: col, seg: 14 }), -Math.PI / 2, 0, 0), 0, 0, z);
  tube.add(zc(1.15, tubeLen, 0.6, C.veryLightGray));
  tube.add(zc(1.34, 0.7, -0.4, C.bluishGray));
  tube.add(zc(1.34, 0.7, -3.4, C.bluishGray));
  tube.add(zc(1.5, 0.5, -tubeLen + 2.0, C.lightGray));
  tube.add(zc(1.42, 1.5, -tubeLen + 1.5, C.black));
  tube.add(zc(1.5, 0.5, -tubeLen, C.lightGray));
  tube.add(at(rot(cone(1.5, 1.05, 0.9, { color: C.veryLightGray, seg: 14 }), Math.PI / 2, 0, 0), 0, 0, -tubeLen - 0.4));
  const cw = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.5, 16, 1, true, Math.PI * 0.1, Math.PI * 1.4), glassMat);
  cw.rotation.set(Math.PI / 2, 0, 0);
  tube.add(at(cw, 0, 0, -tubeLen + 1.5));
  // window mullions: short bars along the pod axis, spaced around the band
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const b = tile(0.3, 1, 0.26, { color: C.lightGray });
    b.scale.z = 1.6;
    tube.add(at(rot(b, 0, 0, -a), Math.sin(a) * 1.46, Math.cos(a) * 1.46, -tubeLen + 0.78));
  }
  tube.add(at(tile(1, 2, 0.3, { color: C.bluishGray }), 0, 1.4, -tubeLen + 1.1));
  tube.rotation.y = -0.44;
  tube.position.set(6.4, yb + 2.3, -2.4);
  S.add(tube);
  S.add(xCyl(2.1, 1.6, 4.2, 7.2, yb + 2.3, -1.6, { color: C.lightGray, seg: 14 }));

  // ---- top plating: greebles, panels, dish ----
  const topY = yb + 4.4;
  const rad = (x, z) => Math.hypot(x, z - CZ);
  const inDisc = (x, z, r, R2) => rad(x, z) < R2 - r;
  const gCol = [C.bluishGray, C.lightGray, C.veryLightGray, C.darkGray, 0x9ea19c];
  // ring 1: crown deck, between the boarding-ring hub and the 8.6 step
  greebles(S, {
    x0: -9, x1: 9, z0: -6, z1: 13, y: topY, seed: seed + 3, count: 210,
    colors: gCol, hMin: 0.2, hMax: 1.3, maxW: 3, studChance: 0.34,
    test: (x, z) => rad(x, z) > 5.3 && rad(x, z) < 8.1, grid: 0.5,
  });
  // ring 2: mid deck
  greebles(S, {
    x0: -12, x1: 12, z0: -9, z1: 16, y: yb + 3.4, seed: seed + 5, count: 240,
    colors: gCol, hMin: 0.2, hMax: 1.0, maxW: 3, studChance: 0.34,
    test: (x, z) => rad(x, z) > 9.1 && rad(x, z) < 11.2, grid: 0.5,
  });
  // ring 3: outer rim shelf
  greebles(S, {
    x0: -13, x1: 13, z0: -10, z1: 17, y: yb + 2.5, seed: seed + 7, count: 150,
    colors: [C.bluishGray, C.darkGray, C.lightGray], hMin: 0.2, hMax: 0.5, maxW: 2, studChance: 0.2,
    test: (x, z) => rad(x, z) > 11.9 && rad(x, z) < 12.3, grid: 0.5,
  });
  // hub deck around the dorsal turret
  greebles(S, {
    x0: -4.5, x1: 4.5, z0: -1, z1: 8, y: topY + 0.7, seed: seed + 9, count: 50,
    colors: gCol, hMin: 0.2, hMax: 0.7, maxW: 2, studChance: 0.4,
    test: (x, z) => rad(x, z) > 2.5 && rad(x, z) < 4.1, grid: 0.5,
  });
  // radial panel lines on the mid deck
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    S.add(at(rot(tile(0.5, 6, 0.34, { color: 0x6f736e }), 0, -a, 0),
      Math.sin(a) * 9.9, yb + 3.4, CZ + Math.cos(a) * 9.9));
    if (i % 2 === 0) {
      S.add(at(rot(tile(1, 3, 0.3, { color: C.darkGray }), 0, -a, 0),
        Math.sin(a) * 12.05, yb + 2.5, CZ + Math.cos(a) * 12.05));
    }
  }
  // studded deck bands + the two big dorsal boxes
  S.add(at(brick(4, 6, PLATE, { color: C.veryLightGray }), 5.0, topY, 8.6));
  S.add(at(brick(3, 3, PLATE, { color: C.lightGray }), -6.6, yb + 3.4, -1.0));
  S.add(at(brick(4, 3, PLATE, { color: C.lightGray }), 6.9, yb + 3.4, 12.0));
  S.add(slabBox(5.2, 3.4, 1.1, topY, -4.6, 1.2, { color: C.veryLightGray }));
  S.add(at(brick(4, 2, PLATE, { color: C.bluishGray }), -4.6, topY + 1.1, 1.2));
  S.add(slabBox(3.6, 4.6, 0.9, topY, 6.2, 3.0, { color: 0x9ea19c }));
  // sensor rectifier dish
  S.add(at(cyl(1.5, 0.5, { color: C.darkGray, seg: 14 }), -5.8, topY, 9.4));
  S.add(radar(2.6, 0.9, -5.8, topY + 0.5, 9.4, { color: C.veryLightGray }));
  S.add(at(bar(1.5, 0.09, { color: C.silver }), -5.8, topY + 0.5, 9.4));

  // ---- quad turrets ----
  const turrets = [];
  for (const up of [1, -1]) {
    const T = new THREE.Group();
    T.add(at(cyl(2.0, 0.6, { color: C.bluishGray, seg: 16 }), 0, 0, 0));
    const yoke = new THREE.Group();
    yoke.add(at(cyl(1.5, 0.9, { color: C.lightGray, seg: 14 }), 0, 0.6, 0));
    yoke.add(at(sphere(1.15, { color: C.darkGray, seg: 14 }), 0, 0.7, 0));
    const gunP = new THREE.Group();
    gunP.position.set(0, 1.5, 0);
    for (const sx of [1, -1]) {
      for (const sy of [0.34, -0.34]) {
        gunP.add(at(rot(cyl(0.13, 5.0, { color: C.veryLightGray, seg: 8 }), Math.PI / 2, 0, 0), sx * 0.42, sy, -3.2));
      }
      gunP.add(at(rot(cyl(0.36, 1.2, { color: C.darkGray, seg: 8 }), Math.PI / 2, 0, 0), sx * 0.42, 0, -0.9));
    }
    yoke.add(gunP);
    T.add(yoke);
    T.userData.yoke = yoke;
    T.userData.guns = gunP;
    T.userData.noBake = true;
    T.scale.y = up;
    T.position.set(0, up > 0 ? topY + 0.7 : yb - 1.7, CZ);
    T.name = up > 0 ? 'turretTop' : 'turretBottom';
    g.add(T);
    turrets.push(T);
  }

  // ---- rear engine strip ----
  const engines = [];
  S.add(hull([[-8.6, 14.2], [8.6, 14.2], [8.0, 16.6], [-8.0, 16.6]], 2.6, yb + 1.2, { color: C.darkGray }));
  for (let i = 0; i < 5; i++) {
    const w = 2.7;
    const x = (i - 2) * 3.1;
    const b = engineSlab(w, 1.7, { color: 0xd8f4ff }).place(x, yb + 2.4, 16.5);
    LIVE.add(b.live);
    engines.push(b.core);
    S.add(at(tile(1, 1, 2.2, { color: C.bluishGray }), x + 1.55, yb + 1.4, 16.2));
  }
  S.add(at(tile(18, 1, 0.6, { color: C.bluishGray }), 0, yb + 3.7, 15.8));
  S.add(at(tile(18, 1, 0.6, { color: C.bluishGray }), 0, yb + 1.0, 15.8));

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'cockpit', 10.4, yb + 2.1, -8.4);
  anchor(g, 'rampTop', -3.4, yb, -6.0);
  anchor(g, 'turretTop', 0, topY + 2.2, CZ);

  g.userData.length = 35;   // mandible tips -18.6 .. engine cowl +16.6
  g.userData.width = 25.2;
  g.userData.height = 12.8;
  g.userData.anchor = 'keel';
  g.userData.turrets = turrets;
  g.userData.aimTurrets = (target) => {
    const v = new THREE.Vector3();
    for (const T of turrets) {
      T.updateWorldMatrix(true, false);
      const l = T.worldToLocal(v.copy(target));
      T.userData.yoke.rotation.y = Math.atan2(-l.x, -l.z);
      T.userData.guns.rotation.x = Math.max(-0.2, Math.min(1.3,
        Math.atan2(l.y - 1.5, Math.hypot(l.x, l.z))));
    }
  };
  return wireEngines(g, engines, 1);
}

/* ================================================================== */
/* sandcrawler                                                         */
/* ================================================================== */

/**
 * Corellian mining crawler: trapezoidal rust-brown fortress on two huge
 * treads, front loading ramp, lit portholes.
 *
 * userData: length 46, ramp, setRamp(0..1), treadScroll(t), engines[2],
 *   anchors {rampFoot, roof, cabin}
 */
export function sandcrawler(opt = {}) {
  const seed = opt.seed ?? 41;
  const g = new THREE.Group();
  g.name = 'sandcrawler';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();

  const gt = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 12, 1 / 12] });
  const bodyMat = mapMat('scBody', 0x8a5433, gt, { rough: 0.72 });
  const darkMat = mapMat('scDark', 0x5e3a24, gt, { rough: 0.75 });
  const winTex = svgTex('scwin', SVG_WINDOWS, { repeat: [2, 1] });
  const winMat = litMat('scWin', winTex, 0xffc46a, 1.5);

  // ---- treads ----
  const treadTex = svgTex('tread', SVG_TREAD, { repeat: [1, 1] }).clone();
  treadTex.wrapS = treadTex.wrapT = THREE.RepeatWrapping;
  treadTex.repeat.set(9, 1);
  treadTex.needsUpdate = true;
  const treadMat = new THREE.MeshStandardMaterial({ color: 0xcdd1cd, map: treadTex, roughness: 0.7 });
  const TH = 4.6;
  for (const s of [1, -1]) {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(4.4, TH, 42), treadMat);
    belt.position.set(s * 10.4, TH / 2, 0);
    belt.castShadow = belt.receiveShadow = true;
    S.add(belt);
    // rounded ends
    for (const z of [-21, 21]) {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(TH / 2, TH / 2, 4.4, 18), treadMat);
      e.rotation.z = Math.PI / 2;
      e.position.set(s * 10.4, TH / 2, z);
      S.add(e);
    }
    // sprockets and road wheels on the outer face
    for (const z of [-21, 21]) {
      S.add(xCyl(1.5, 1.5, s * 12.62, s * 13.2, TH / 2, z, { color: C.darkGray, seg: 14 }));
      S.add(xCyl(0.5, 0.5, s * 13.2, s * 13.5, TH / 2, z, { color: C.bluishGray, seg: 10 }));
    }
    for (let i = 0; i < 6; i++) {
      S.add(xCyl(1.1, 1.1, s * 12.62, s * 13.05, TH / 2, -17 + i * 6.8, { color: C.darkGray, seg: 12 }));
    }
    S.add(at(tile(1, 40, 1.4, { color: C.darkGray }), s * 8.0, 1.6, 0));
    S.add(at(tile(2, 44, 1.0, { color: 0x6d4224 }), s * 11.6, TH + 0.2, 0));
  }

  // ---- stepped trapezoid body ----
  // The bow rakes back; the ramp is a slanted door recessed into that rake, so
  // the tiers it crosses get a rectangular notch cut out of their front edge.
  const N = 8;
  const yBase = TH + 0.2;
  const H = 19.4;
  const BOW = 12.5;
  const TILT = Math.atan2(BOW, H);
  const openW = 14.6;
  const RL = 13.0;
  const hingeY = yBase + 0.3;
  const hingeZ = -21.7;
  const jamb = openW / 2 + 0.9;
  const doorTop = hingeY + RL * Math.cos(TILT);
  const doorZ = (y) => hingeZ + (y - hingeY) * Math.tan(TILT);
  const tierOf = (y) => Math.max(0, Math.min(N - 1, Math.floor((y - yBase) / (H / N) + 1e-6)));
  const hwAt = (y) => 12.6 - (tierOf(y) / (N - 1)) * 2.2;
  const zfAt = (y) => -21.5 + (tierOf(y) / (N - 1)) * BOW;
  for (let i = 0; i < N; i++) {
    const y = yBase + (i * H) / N;
    const h = H / N + 0.02;
    const t = i / (N - 1);
    const hw = 12.6 - t * 2.2;
    const zf = -21.5 + t * BOW;
    const zr = 21.5 - t * 0.8;
    const zn = doorZ(y) + 1.4;
    const notched = y < doorTop && zn > zf + 0.2;
    const pts = notched
      ? [[-hw, zf], [-jamb, zf], [-jamb, zn], [jamb, zn], [jamb, zf], [hw, zf], [hw, zr], [-hw, zr]]
      : rect(hw * 2, zr - zf, 0, (zf + zr) / 2);
    S.add(hull(pts, h, y, { material: i % 2 ? bodyMat : darkMat }));
    // rivet strip along the step lip
    if (notched) {
      for (const s of [1, -1]) {
        const w = Math.max(1, Math.round(hw - jamb));
        S.add(at(tile(w, 1, 0.4, { color: 0x6d4224 }), s * (jamb + (hw - jamb) / 2), y + h, zf + 0.6));
      }
    } else {
      S.add(at(tile(Math.round(hw * 2) - 2, 1, 0.4, { color: 0x6d4224 }), 0, y + h, zf + 0.6));
    }
    for (const s of [1, -1]) {
      S.add(at(tile(1, Math.max(2, Math.round(zr - zf) - 3), 0.5, { color: 0x6d4224 }), s * (hw - 0.4), y + h - 0.9, (zf + zr) / 2 + 1));
    }
  }
  const topY = yBase + H;
  // roof clutter
  greebles(S, {
    x0: -9, x1: 9, z0: -8, z1: 19, y: topY, seed, count: 60,
    colors: [0x6d4224, C.darkTan, C.darkGray, C.brown], hMax: 1.6, maxW: 4, grid: 0.5,
  });
  S.add(at(brick(6, 8, 1.2, { color: 0x6d4224 }), -4, topY, 12));
  S.add(at(tile(4, 4, 2.2, { color: C.darkGray }), 5, topY, 14));
  S.add(at(rot(cyl(1.6, 3.0, { color: 0x8a5433, seg: 14 }), 0, 0, 0), 5.4, topY, 4));
  S.add(at(cyl(0.2, 4.0, { color: C.darkGray, seg: 8 }), -8, topY, 17));
  S.add(radar(2.2, 0.8, -8, topY + 4.0, 17, { color: C.darkTan }));
  S.add(at(tile(20, 2, 0.5, { color: 0x6d4224 }), 0, topY, -6.2));

  // ---- bow: slanted doorway recess, jambs, portholes ----
  // Everything in `bay` is laid out in the door plane: local -Z runs up the
  // slope, local +Y goes deeper into the hull.
  const bay = new THREE.Group();
  bay.rotation.x = Math.PI / 2 + TILT;
  bay.position.set(0, hingeY, hingeZ);
  bay.add(hull(rect(openW, RL + 0.6, 0, -RL / 2 - 0.3), 0.5, 1.1, { color: 0x2a1c12 }));
  bay.add(hull(rect(openW - 1.6, RL - 1.6, 0, -RL / 2 - 0.3), 0.4, 0.7, { color: C.black }));
  for (const s of [1, -1]) {
    bay.add(hull(rect(1.8, RL + 1.4, s * (openW / 2 + 0.9), -RL / 2 - 0.3), 1.9, -0.5, { material: darkMat }));
    bay.add(at(tile(1, Math.max(2, Math.round(RL)), 0.5, { color: 0x6d4224 }), s * (openW / 2 + 0.9), -0.5, -RL / 2 - 0.3));
  }
  bay.add(hull(rect(openW + 3.6, 1.8, 0, -RL - 0.9), 1.9, -0.5, { material: darkMat }));
  bay.add(at(tile(Math.round(openW) + 3, 1, 0.5, { color: 0x6d4224 }), 0, -0.5, -RL - 0.9));
  S.add(bay);

  // portholes, set flush on whichever tier face they land on
  for (const [yy, ww] of [[13.6, 9], [16.4, 5]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(ww, 1.1), winMat);
    p.position.set(0, yBase + yy, zfAt(yBase + yy) - 0.06);
    p.rotation.y = Math.PI;
    S.add(p);
  }
  for (const s of [1, -1]) {
    for (const [yy, zz, ww] of [[6.6, 8, 7], [11.5, -2, 5], [16.4, 10, 4]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(ww, 0.9), winMat);
      p.rotation.y = (s * Math.PI) / 2;
      p.position.set(s * (hwAt(yBase + yy) + 0.06), yBase + yy, zz);
      S.add(p);
    }
  }

  // ---- ramp (hinged along the bottom of the bow) ----
  const ramp = new THREE.Group();
  ramp.name = 'ramp';
  ramp.add(hull(rect(openW - 0.5, RL, 0, -RL / 2), 0.55, -0.55, { material: bodyMat }));
  ramp.add(at(brick(Math.round(openW) - 2, Math.round(RL) - 2, PLATE, { color: 0x8a5433 }), 0, 0, -RL / 2));
  for (const s of [1, -1]) {
    ramp.add(at(tile(1, Math.round(RL), 0.7, { color: 0x6d4224 }), s * (openW / 2 - 1.0), 0, -RL / 2));
  }
  for (let i = 0; i < 5; i++) {
    ramp.add(at(tile(Math.round(openW) - 4, 1, 0.35, { color: C.darkGray }), 0, 0.4, -1.6 - i * 2.4));
  }
  // hinge knuckles
  for (const s of [1, -1]) {
    ramp.add(at(rot(cyl(0.55, 1.6, { color: C.darkGray, seg: 10 }), 0, 0, Math.PI / 2), s * (openW / 2 - 0.4), -0.28, -0.3));
  }
  ramp.userData.noBake = true;
  ramp.position.set(0, hingeY, hingeZ);
  g.add(ramp);
  const RAMP_SHUT = Math.PI / 2 + TILT;          // flush against the raked bow
  // Fully open: the far corner of the ramp's *underside* rests on y = 0, so the
  // deck's own thickness has to come out of the swing.
  const RT = 0.55;
  const RAMP_DOWN = -(Math.asin(hingeY / Math.hypot(RL, RT)) - Math.atan2(RT, RL));

  // ---- exhaust stacks ----
  const engines = [];
  for (const s of [1, -1]) {
    S.add(at(rot(cyl(1.0, 2.4, { color: C.darkGray, seg: 12 }), 0, 0, 0), s * 6.0, topY, 18.4));
    const b = engineBell({ r: 0.85, depth: 0.5, color: 0xff9a3c, plume: 2.2, plumeOpacity: 0.22, seg: 12, shell: C.darkGray })
      .place(s * 6.0, topY + 3.4, 18.4);
    b.shell.rotation.x = -Math.PI / 2;
    b.live.rotation.x = -Math.PI / 2;
    S.add(b.shell);
    LIVE.add(b.live);
    engines.push(b.core);
  }

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'rampFoot', 0, 0, -32);
  anchor(g, 'roof', 0, topY, 6);
  anchor(g, 'cabin', 0, yBase + 13.6, -16);

  g.userData.length = 46;
  g.userData.width = 25.6;
  g.userData.height = topY + 6;
  g.userData.anchor = 'keel';
  g.userData.ramp = ramp;
  g.userData.rampOpen = 0;
  g.userData.setRamp = (t) => {
    const k = Math.max(0, Math.min(1, t));
    g.userData.rampOpen = k;
    ramp.rotation.x = RAMP_SHUT + k * (RAMP_DOWN - RAMP_SHUT);
  };
  g.userData.treadScroll = (t) => { treadTex.offset.x = -t; };
  g.userData.setRamp(opt.ramp ?? 0);
  return wireEngines(g, engines, 0.5);
}

/* ================================================================== */
/* turbolaser tower                                                    */
/* ================================================================== */

/**
 * Stubby twin-barrel surface turret for the battle station.
 * userData: aim(vec3 worldTarget), fire() -> world muzzle position,
 *   yoke, guns, muzzles[2], height
 */
export function turbolaserTower(opt = {}) {
  const seed = opt.seed ?? 61;
  const g = new THREE.Group();
  g.name = 'turbolaserTower';
  const S = new THREE.Group();

  const gt = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 5, 1 / 5] });
  const baseMat = mapMat('tlBase', 0x8f9290, gt, { rough: 0.55 });
  const hazTex = svgTex('haz', SVG_HAZARD, { repeat: [4, 1], w: 256, h: 64 });

  // ---- base ----
  S.add(hull(rect(9, 9), 1.0, 0, { material: baseMat }));
  S.add(at(cyl(4.0, 1.0, { color: C.bluishGray, seg: 16 }), 0, 1.0, 0));
  S.add(at(cyl(3.2, 0.5, { color: C.darkGray, seg: 16 }), 0, 2.0, 0));
  for (const s of [1, -1]) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.7), decal(1, 1, hazTex, 'haz').material);
    h.rotation.y = (s * Math.PI) / 2;
    h.position.set(s * 4.53, 0.4, 0);
    S.add(h);
    const h2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.7), decal(1, 1, hazTex, 'haz').material);
    h2.rotation.y = s > 0 ? 0 : Math.PI;
    h2.position.set(0, 0.4, s * 4.53);
    S.add(h2);
  }
  greebles(S, {
    x0: -4, x1: 4, z0: -4, z1: 4, y: 1.0, seed, count: 18,
    colors: [C.bluishGray, C.darkGray, C.veryLightGray], hMax: 0.6, maxW: 2, grid: 0.5,
    test: (x, z, r) => Math.hypot(x, z) > 3.2 + r && Math.hypot(x, z) < 4.2 - r,
  });

  // ---- rotating yoke ----
  const yoke = new THREE.Group();
  yoke.name = 'yoke';
  const YS = new THREE.Group();          // static yoke shell, baked below
  YS.add(at(cyl(2.6, 1.4, { color: C.lightGray, seg: 16 }), 0, 0, 0));
  YS.add(slabBox(5.2, 4.4, 1.7, 1.4, 0, 0.9, { material: baseMat }));
  YS.add(at(brick(4, 3, PLATE, { color: C.veryLightGray }), 0, 3.1, 1.2));
  YS.add(at(tile(5, 1, 0.4, { color: C.darkGray }), 0, 3.1, 2.7));
  for (const s of [1, -1]) {
    // trunnion cheeks the barrels pivot between
    YS.add(slabBox(1.3, 3.2, 2.6, 1.4, s * 1.95, -0.5, { material: baseMat }));
    YS.add(xCyl(0.55, 0.45, s * 2.6, s * 3.0, 2.9, -0.6, { color: C.darkGray, seg: 12 }));
    YS.add(at(tile(1, 2, 0.3, { color: C.darkGray }), s * 1.95, 4.0, -0.6));
  }
  greebles(YS, {
    x0: -2.2, x1: 2.2, z0: -0.4, z1: 2.9, y: 3.1, seed: seed + 4, count: 16,
    colors: [C.bluishGray, C.darkGray, C.veryLightGray], hMax: 0.5, maxW: 2, grid: 0.5,
  });
  YS.add(at(cyl(0.5, 1.4, { color: C.darkGray, seg: 10 }), 0, 3.5, 2.4));
  YS.add(radar(1.2, 0.5, 0, 4.9, 2.4, { color: C.veryLightGray }));

  // ---- elevating barrels ----
  const guns = new THREE.Group();
  guns.name = 'guns';
  guns.position.set(0, 2.9, -0.6);
  const GS = new THREE.Group();          // static barrel assembly, baked below
  // mantlet / recoil housing
  GS.add(slabBox(4.6, 3.0, 2.2, -1.1, 0, -0.3, { material: baseMat }));
  GS.add(at(tile(3, 1, 0.4, { color: C.darkGray }), 0, 1.1, -0.4));
  const muzzles = [];
  for (const s of [1, -1]) {
    GS.add(zCyl(0.44, 0.4, -1.0, -8.4, s * 1.1, 0, { color: C.veryLightGray, seg: 12 }));
    GS.add(zCyl(0.62, 0.62, -0.4, -2.2, s * 1.1, 0, { color: C.darkGray, seg: 12 }));
    GS.add(zCyl(0.56, 0.5, -6.6, -8.0, s * 1.1, 0, { color: C.darkGray, seg: 12 }));
    GS.add(zCyl(0.52, 0.52, -8.0, -8.5, s * 1.1, 0, { color: C.black, seg: 12 }));
    GS.add(zCyl(0.34, 0.34, 0.4, 1.9, s * 1.1, 0, { color: C.bluishGray, seg: 10 }));
    // cooling sleeve rings
    for (let i = 0; i < 4; i++) {
      GS.add(zCyl(0.54, 0.54, -3.0 - i * 1.0, -3.3 - i * 1.0, s * 1.1, 0, { color: C.bluishGray, seg: 12 }));
    }
    const mz = new THREE.Object3D();
    mz.position.set(s * 1.1, 0, -8.6);
    guns.add(mz);
    muzzles.push(mz);
    const fl = at(rot(cone(0.95, 0.1, 2.2, { color: 0x9ff0ff, glow: true, seg: 10 }), -Math.PI / 2, 0, 0), s * 1.1, 0, -8.6);
    fl.material = additive(0xa8f2ff, 0.7);
    fl.visible = false;
    fl.userData.noBake = true;
    guns.add(fl);
    mz.userData.flash = fl;
  }
  guns.add(bake(GS));
  yoke.add(bake(YS));
  yoke.add(guns);
  yoke.position.set(0, 2.5, 0);
  g.add(bake(S));
  g.add(yoke);

  const tmp = new THREE.Vector3();
  const wp = new THREE.Vector3();
  g.userData.length = 15;   // base 9 deep; the barrels reach 8.6 past the pivot
  g.userData.height = 10.4;
  g.userData.width = 9;
  g.userData.anchor = 'keel';
  g.userData.yoke = yoke;
  g.userData.guns = guns;
  g.userData.muzzles = muzzles;
  g.userData.aim = (target) => {
    g.updateWorldMatrix(true, false);
    const l = g.worldToLocal(tmp.copy(target));
    yoke.rotation.y = Math.atan2(-(l.x - yoke.position.x), -(l.z - yoke.position.z));
    guns.updateWorldMatrix(true, false);
    guns.getWorldPosition(wp);
    const dy = target.y - wp.y;
    const dh = Math.hypot(target.x - wp.x, target.z - wp.z);
    guns.rotation.x = Math.max(-0.25, Math.min(1.35, Math.atan2(dy, dh)));
    return g;
  };
  g.userData.fire = (on = true) => {
    for (const m of muzzles) m.userData.flash.visible = !!on;
    return muzzles[0].getWorldPosition(new THREE.Vector3());
  };
  g.userData.aim(new THREE.Vector3(0, 30, -60));
  return g;
}

/* ================================================================== */
/* imperial hangar shuttle                                             */
/* ================================================================== */

/**
 * Small imperial troop transport with folding wings.
 * userData: length 15, setWings(t) 0 = folded up (flight) / 1 = down (landed),
 *   wings[2], engines[3], anchors {ramp, cockpit}
 */
export function hangarShuttle(opt = {}) {
  const seed = opt.seed ?? 71;
  const g = new THREE.Group();
  g.name = 'hangarShuttle';
  const S = new THREE.Group();
  const LIVE = new THREE.Group();

  const gt = svgTex('greeble', SVG_GREEBLE, { repeat: [1 / 6, 1 / 6] });
  const hullMat = mapMat('hsHull', 0xb0b3b0, gt, { rough: 0.5 });
  const winMat = litMat('hsWin', svgTex('bwin', SVG_BRIDGEWIN, { repeat: [1, 1] }), 0x9fd8ff, 1.4);

  const F = [[-7.5, 0.5], [-6, 1.4], [-3, 2.0], [2, 2.3], [6, 2.2], [7.2, 1.6]];
  S.add(slab(section(F, -7.5, 7.2, 0.3), 0.9, 0.0, { color: C.bluishGray }));
  S.add(slab(F, 1.5, 0.9, { material: hullMat }));
  S.add(slab(section(F, -6.6, 6.8, 0.5), 1.1, 2.4, { material: hullMat }));
  S.add(slab(section(F, -4.4, 6.4, 1.1), 0.5, 3.5, { color: C.veryLightGray }));
  const st = deckStuds(poly(section(F, -4.4, 6.4, 1.1)), 4.0, { color: C.veryLightGray, inset: 0.55 });
  if (st) S.add(st);
  // cockpit
  S.add(at(rot(slope(2.2, 3.0, 1.4, 0.2, { color: C.lightGray }), 0, Math.PI / 2, 0), 0, 2.4, -5.4));
  const cw = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), winMat);
  cw.position.set(0, 3.0, -6.55);
  cw.rotation.set(0.35, Math.PI, 0);
  S.add(cw);
  for (const s of [1, -1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), winMat);
    sw.rotation.y = (s * Math.PI) / 2;
    sw.position.set(s * 1.62, 2.9, -4.4);
    S.add(sw);
    S.add(at(tile(1, 4, 0.5, { color: C.darkGray }), s * 2.05, 1.4, 1.0));
  }
  // dorsal fin: stepped taper with a swept leading edge (Lambda silhouette)
  const finTiers = [[-1.2, 5.8, 0.9, 4.0, 2.6], [0.1, 5.6, 0.74, 6.6, 2.2],
    [1.5, 5.3, 0.6, 8.8, 1.8], [2.6, 5.0, 0.5, 10.6, 1.0]];
  for (const [z0, z1, th, y, h] of finTiers) {
    S.add(hull(rect(th, z1 - z0, 0, (z0 + z1) / 2), h, y, { material: hullMat }));
    S.add(at(tile(1, Math.max(1, Math.round(z1 - z0) - 2), 0.34, { color: C.bluishGray }), 0, y + h, (z0 + z1) / 2));
  }
  const impTex = svgTex('imp', SVG_IMPERIAL, { repeat: [1, 1], w: 128, h: 128 });
  for (const s of [1, -1]) {
    S.add(at(rot(decal(2.2, 2.2, impTex, 'impDark', { color: 0x39434e }), 0, (s * Math.PI) / 2, 0),
      s * 0.47, 5.4, 2.6));
  }
  S.add(at(tile(1, 2, 0.4, { color: C.darkGray }), 0, 11.6, 3.6));
  S.add(at(bar(1.4, 0.08, { color: C.silver }), 0, 12.0, 3.6));
  greebles(S, {
    x0: -1.6, x1: 1.6, z0: 2.6, z1: 6.0, y: 4.0, seed, count: 16,
    colors: [C.bluishGray, C.darkGray], hMax: 0.6, maxW: 2, grid: 0.5,
    test: (x) => Math.abs(x) > 0.6,
  });

  // folding wings: built about their own hinge so rotation.z is the fold angle
  const wings = [];
  const HX = 1.5, HY = 1.6, HZ = 1.6;
  for (const s of [1, -1]) {
    const W = new THREE.Group();
    const w0 = s * 0.2, w1 = s * 6.6;
    W.add(hull([[w0, -2.0], [w1, 0.6], [w1, 3.2], [w0, 2.6]], 0.52, -0.26, { material: hullMat }));
    W.add(hull([[s * 4.4, 1.0], [w1 - s * 0.2, 1.3], [w1 - s * 0.2, 3.0], [s * 4.4, 2.5]], 0.26, 0.26,
      { color: C.darkGray }));
    W.add(at(tile(1, 3, 0.3, { color: C.bluishGray }), s * 2.6, 0.26, 0.4));
    // wingtip cannon
    W.add(zCyl(0.42, 0.42, 0.8, 3.2, w1, 0, { color: C.bluishGray, seg: 10 }));
    W.add(zCyl(0.2, 0.2, -3.2, 0.9, w1, 0, { color: C.silver, seg: 8 }));
    const pivot = new THREE.Group();
    pivot.position.set(s * HX, HY, HZ);
    pivot.add(bake(W));
    pivot.userData.sign = s;
    pivot.userData.noBake = true;
    g.add(pivot);
    wings.push(pivot);
    // hinge fairing on the hull
    S.add(xCyl(0.85, 0.7, s * (HX - 0.6), s * (HX + 0.9), HY, HZ, { color: C.darkGray, seg: 12 }));
  }

  // engines
  const engines = [];
  for (const [x, y, r] of [[0, 1.9, 0.9], [-1.5, 1.7, 0.6], [1.5, 1.7, 0.6]]) {
    const b = engineBell({ r, depth: 0.5, color: 0xbfe8ff, plume: r * 3.0, plumeOpacity: 0.3, seg: 12 })
      .place(x, y, 7.3);
    S.add(b.shell);
    LIVE.add(b.live);
    engines.push(b.core);
  }

  g.add(bake(S));
  g.add(LIVE);
  anchor(g, 'ramp', 0, 0, -8.0);
  anchor(g, 'cockpit', 0, 3.0, -5.6);

  g.userData.length = 15;
  g.userData.width = 15.9;
  g.userData.height = 15.3;
  g.userData.anchor = 'keel';
  g.userData.wings = wings;
  g.userData.wingsOpen = 1;
  g.userData.setWings = (t) => {
    const k = Math.max(0, Math.min(1, t));
    g.userData.wingsOpen = k;
    for (const w of wings) w.rotation.z = w.userData.sign * (1.15 - 1.62 * k);
  };
  g.userData.setWings(opt.wings ?? 1);
  return wireEngines(g, engines, 1);
}

/* ================================================================== */
/* laser bolt                                                          */
/* ================================================================== */

const capsuleCache = new Map();
function capsuleGeo(r, len, seg) {
  const k = `${r}|${len}|${seg}`;
  if (!capsuleCache.has(k)) {
    const g = new THREE.CapsuleGeometry(r, Math.max(0.02, len - r * 2), 1, seg);
    g.rotateX(Math.PI / 2);
    capsuleCache.set(k, g);
  }
  return capsuleCache.get(k);
}

const boltCoreMats = new Map();
function boltCoreMat(color) {
  if (!boltCoreMats.has(color)) {
    const c = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.6);
    boltCoreMats.set(color, new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  }
  return boltCoreMats.get(color);
}

/**
 * A single laser bolt: bright core inside a soft additive sheath, long axis
 * on Z and centred on the origin so `bolt.lookAt(target)` aims it.
 * Two meshes, ~130 tris, all materials/geometry shared between instances.
 */
export function proximityBolt(opt = {}) {
  const color = opt.color ?? 0xff3b1f;
  const len = opt.len ?? 3.4;
  const radius = opt.radius ?? 0.14;
  const seg = opt.seg ?? 12;   // drop to 6-8 for far-field swarms
  const g = new THREE.Group();
  g.name = 'bolt';
  const core = new THREE.Mesh(capsuleGeo(radius, len, seg), boltCoreMat(color));
  const sheath = new THREE.Mesh(capsuleGeo(radius * 2.7, len * 1.1, seg), additive(color, 0.4));
  core.castShadow = sheath.castShadow = false;
  g.add(core);
  g.add(sheath);
  g.userData.length = len;
  g.userData.anchor = 'center';
  g.userData.radius = radius;
  g.userData.color = color;
  g.userData.core = core;
  g.userData.sheath = sheath;
  g.userData.noBake = true;
  return g;
}

/* ================================================================== */
/* contact sheet                                                       */
/* ================================================================== */

/** Every hull in the library, keyed by name. */
const SHIPS = {
  starDestroyer, corvette, falcon, sandcrawler, xwing, tiefighter,
  hangarShuttle, escapePod, turbolaserTower, proximityBolt,
};

/**
 * Contact sheet: one of every ship, all noses pointing -Z, each spaced by its
 * own footprint.  Ships are stacked into columns (the Star Destroyer gets one
 * to itself) so the sheet stays roughly square instead of one enormous row.
 * @param {object} [o] {skip: string[], gap: number, cols: string[][]}
 */
export function fleet(o = {}) {
  const skip = new Set(o.skip || []);
  const gap = o.gap ?? 0.3;
  const cols = o.cols || [
    ['starDestroyer'],
    ['corvette', 'sandcrawler', 'falcon', 'xwing'],
    ['tiefighter', 'hangarShuttle', 'turbolaserTower', 'escapePod', 'proximityBolt'],
  ];
  const g = new THREE.Group();
  g.name = 'fleet';
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const built = [];

  const laid = [];
  let totalW = 0;
  for (const col of cols) {
    const items = [];
    let colW = 0;
    let colD = 0;
    for (const name of col) {
      if (skip.has(name) || !SHIPS[name]) continue;
      const ship = name === 'proximityBolt'
        ? SHIPS[name]({ color: 0xff3b1f, len: 9, radius: 0.55 })
        : SHIPS[name]();
      ship.name = name;
      box.setFromObject(ship);
      box.getSize(size);
      box.getCenter(centre);
      items.push({ ship, d: size.z, cx: centre.x, cz: centre.z });
      colW = Math.max(colW, size.x);
      colD += size.z * (1 + gap);
    }
    if (!items.length) continue;
    laid.push({ items, colW, colD });
    totalW += colW * (1 + gap);
  }

  let x = -totalW / 2;
  for (const col of laid) {
    const pad = col.colW * gap;
    x += pad / 2;
    const cx = x + col.colW / 2;
    let z = -col.colD / 2;
    for (const it of col.items) {
      const zpad = it.d * gap;
      z += zpad / 2;
      it.ship.position.x = cx - it.cx;
      it.ship.position.z = z + it.d / 2 - it.cz;
      g.add(it.ship);
      built.push(it.ship);
      z += it.d + zpad / 2;
    }
    x += col.colW + pad / 2;
  }
  g.userData.ships = built;
  g.userData.width = totalW;
  g.userData.length = Math.max(...laid.map((c) => c.colD));
  g.userData.anchor = 'keel';
  return g;
}