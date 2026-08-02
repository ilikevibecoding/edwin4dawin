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
  studGrid, at, rot, bake, mat, glow, rng,
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

/** One material instance per colour, matching what brick()/tile() produce. */
function M(color, o) {
  return mat(color, { color, ...o });
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
    x0, x1, z0, z1, y, seed = 1, count = 60, test, down = false,
    colors = [C.bluishGray, C.darkGray, C.lightGray],
    hMin = 0.3, hMax = 1.4, maxW = 3, studChance = 0.3, grid = 0.5,
  } = o;
  const R = rng(seed);
  const q = (v) => Math.round(v / grid) * grid;
  for (let i = 0; i < count; i++) {
    const w = 1 + Math.floor(R() * maxW);
    const d = 1 + Math.floor(R() * maxW);
    const x = q(x0 + R() * (x1 - x0));
    const z = q(z0 + R() * (z1 - z0));
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
  plume.material = additive(o.plumeColor ?? col, 0.4);
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
    [-32, 0.7], [-30.4, 2.3], [-28.2, 4.5], [-25.6, 4.4], [-24.2, 2.25],
    [-18, 2.45], [-10, 3.0], [-4, 3.9], [2, 5.4], [8, 6.8],
    [16, 7.5], [24, 7.6], [28, 7.25], [30, 6.5],
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
  S.add(hull([[-3.2, -29.6], [3.2, -29.6], [4.05, -28.2], [4.05, -26.0], [-4.05, -26.0], [-4.05, -28.2]], PLATE, 3.6, { color: C.darkGray }));
  S.add(at(tile(2, 1, 0.5, { color: C.black }), 0, 3.0, -31.0));
  S.add(at(cyl(0.35, 0.9, { color: C.veryLightGray, seg: 10 }), 0, 4.0, -27.2));
  S.add(at(rot(cyl(0.26, 1.4, { color: C.darkGray, seg: 8 }), Math.PI / 2, 0, 0), 0, 3.1, -33.0));
  for (const s of [1, -1]) {
    S.add(at(tile(1, 3, 0.6, { color: C.darkGray }), s * 3.35, 3.6, -27.2));
    S.add(at(cyl(0.3, 0.55, { color: C.black, seg: 8 }), s * 2.3, 4.05, -29.2));
    S.add(at(tile(1, 2, 0.4, { color: C.red }), s * 3.9, 3.6, -24.6));
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
      const b = engineBell({ r: row.r, depth: 1.1, color: 0xb8ecff, plume: 5.4, seg: 14 }).place(x, row.y, 32.0);
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

  g.userData.length = 64;
  g.userData.width = 15.2;
  g.userData.height = 12.7;
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
  S.add(at(rot(cone(1.05, 0.22, 1.0, { color: C.veryLightGray, seg: 16 }), -Math.PI / 2, 0, 0), 0, cy, -3.5));
  S.add(at(rot(cone(R, 1.05, 2.1, { color: C.white, seg: 18 }), -Math.PI / 2, 0, 0), 0, cy, -1.4));
  S.add(at(rot(cyl(R, 1.1, { color: C.darkGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, -1.45));
  const band = at(rot(cyl(R * 1.01, 1.0, { color: 0xffffff, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, -1.4);
  band.material = bandMat;
  S.add(band);
  S.add(at(rot(cyl(R, 3.1, { color: C.white, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, -0.4));
  S.add(at(rot(cyl(R * 0.99, PLATE, { color: C.bluishGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, 2.7));
  S.add(at(rot(cyl(R * 0.84, 1.2, { color: C.veryLightGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, 3.1));
  S.add(at(rot(cyl(R * 0.66, 0.5, { color: C.darkGray, seg: 16 }), Math.PI / 2, 0, 0), 0, cy, 4.0));
  for (const z of [-0.35, 0.9, 2.15]) {
    S.add(at(rot(cyl(R * 1.02, 0.22, { color: C.bluishGray, seg: 18 }), Math.PI / 2, 0, 0), 0, cy, z));
  }
  // dorsal hatch deck (studs read as LEGO)
  S.add(at(brick(3, 5, PLATE, { color: C.white }), 0, cy + R - 0.16, 0.6));
  S.add(at(cyl(1.1, 0.24, { color: C.bluishGray, seg: 14 }), 0, cy + R + 0.24, 0.4));
  S.add(at(cyl(0.26, 0.32, { color: C.darkGray, seg: 8 }), 0, cy + R + 0.48, 0.4));
  greebles(S, {
    x0: -1.4, x1: 1.4, z0: 2.4, z1: 3.6, y: cy + R * 0.62, seed, count: 10,
    colors: [C.bluishGray, C.darkGray], hMax: 0.5, maxW: 2,
  });
  for (const s of [1, -1]) {
    S.add(at(rot(tile(1, 4, 0.3, { color: C.bluishGray }), 0, 0, (s * Math.PI) / 2.6), s * R * 0.86, cy - 0.3, 0.8));
    S.add(at(tile(1, 2, 0.3, { color: C.red }), s * R * 0.62, cy + R * 0.72, -1.9));
  }

  const engines = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const b = engineBell({ r: 0.52, depth: 0.44, color: 0xffd9a0, plume: 1.8, seg: 10, shell: C.bluishGray })
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
  const g = new THREE.Group();
  g.name = 'bolt';
  const core = new THREE.Mesh(capsuleGeo(radius, len, 6), boltCoreMat(color));
  const sheath = new THREE.Mesh(capsuleGeo(radius * 2.7, len * 1.1, 6), additive(color, 0.4));
  core.castShadow = sheath.castShadow = false;
  g.add(core);
  g.add(sheath);
  g.userData.length = len;
  g.userData.radius = radius;
  g.userData.color = color;
  g.userData.core = core;
  g.userData.sheath = sheath;
  g.userData.noBake = true;
  return g;
}
