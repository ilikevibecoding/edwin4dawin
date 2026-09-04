// Deck D (engineering deck) shared vocabulary: machinery pieces every room on the deck composes from.
// Pipes with clamps and flanges, valve wheels, gauges, junction boxes, warning lamps, hazard borders,
// grated cable trenches with real depth, solid stairs (steps + walkable colliders + stringers +
// handrails), raised catwalk decks, vertical tanks, screen banks, breaker boards, cable tubes, pulsing
// ring arrays (one InstancedMesh, per-instance colour animated allocation-free) and sub-kits for
// animated assemblies (a fan, a crane trolley…) that must move as one object.
import * as THREE from "three";
import { Kit, rng, setVertexColor } from "../kit.js";
import { PALETTE, setDomain } from "../materials.js";
import { impDecalRect, IMP_DECAL } from "../textures_imperial.js";
import { impWall, impCeiling, roomWalls, openingsFor, impRailing } from "./imperial_kit.js";
import { makeDeckDDecals, deckDDecalRect, makeCoolantGlow, DECK_D_DECAL } from "../textures_deck_d.js";
import { makeDiffuser } from "../textures.js";

export { DECK_D_DECAL };
export const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();

// ---------------------------------------------------------------------------
// Materials owned by this workstream (keys prefixed roomsd_), created once and shared by every cell
// ---------------------------------------------------------------------------
let deckDMaterials = null;
export function ensureDeckDMaterials(kit) {
  if (!deckDMaterials) {
    // wear decals are faint by design (opacity 0.28): a smudge the eye reads as a stain in passing, never
    // a spatter pattern that competes with the equipment
    const decal = new THREE.MeshStandardMaterial({ map: makeDeckDDecals(512, 71), transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.4 });
    setDomain(decal, "interior");
    // unlit colour carrier for animated emitters: instanceColor / vertex colour × intensity, blooms above white
    const pulse = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glow = new THREE.MeshBasicMaterial({ map: makeCoolantGlow(256), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    // white-hot reactor core: unlit, above the bloom threshold
    const core = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c0).multiplyScalar(2.4) });
    // low emitters for practicals (handrail LEDs, pillar slots, tracer lines): ~20% of the kit's
    // emitBlue / emitAmber so they read as fixtures beside the room's key light, never as neon
    // dim emitters are purely emissive (black diffuse): a lens or slit reads at exactly its own level
    // whatever lamp sits next to it, instead of picking up the bulb it hoods and going white-hot
    const emit = (color, intensity, extra = {}) => setDomain(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.45, metalness: 0, ...extra }), "interior");
    const diffuser = makeDiffuser(256, 13);
    const slot = emit("#dfe6f4", 0.42, { emissiveMap: diffuser });
    // the deck's one fixture colour temperature: amber-white slots for engineering / maintenance ceilings
    const slotWarm = emit("#f6e6cc", 0.42, { emissiveMap: diffuser });
    const amberLow = emit(PALETTE.impAmber, 0.5);
    const warmLow = emit(0xfff0c0, 0.5);
    const blueLow = emit(PALETTE.impBlue, 0.45);
    const greenLow = emit(PALETTE.impGreen, 0.5);
    // hyperdrive core: unlit blue, colour animated (pulse) by the room's updater
    const coreBlue = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd0ff).multiplyScalar(1.6) });
    // deck stencils: the Imperial decal atlas in dark paint (a grey cog on grey tile, never a white blaze)
    const stencil = kit.materials.decalImp.clone();
    stencil.color = new THREE.Color(0x3e4249);
    stencil.opacity = 0.92;
    setDomain(stencil, "interior");
    deckDMaterials = { roomsd_decal: decal, roomsd_pulse: pulse, roomsd_glow: glow, roomsd_core: core, roomsd_slot: slot, roomsd_slotWarm: slotWarm, roomsd_amberLow: amberLow, roomsd_warmLow: warmLow, roomsd_blueLow: blueLow, roomsd_greenLow: greenLow, roomsd_coreBlue: coreBlue, roomsd_stencil: stencil };
  }
  for (const [k, m] of Object.entries(deckDMaterials)) if (!kit.materials[k]) kit.materials[k] = m;
  return deckDMaterials;
}

/** Flat decal quad from the deck-D atlas. facing: "up" | "+z" | "-z" | "+x" | "-x" (quad normal); opts.quat overrides. */
export function decalD(kit, index, pos, facing, size, opts = {}) {
  const g = new THREE.PlaneGeometry(size, opts.h || size);
  if (opts.spin) g.rotateZ(opts.spin);
  const rot = facing === "up" ? [-Math.PI / 2, 0, 0] : facing === "-z" ? [0, Math.PI, 0] : facing === "+x" ? [0, Math.PI / 2, 0] : facing === "-x" ? [0, -Math.PI / 2, 0] : [0, 0, 0];
  return kit.add("roomsd_decal", g, { pos, rot, quat: opts.quat || null, uv: "keep", uvRect: deckDDecalRect(index) });
}

/** Imperial decal quad facing a cardinal direction (for props, not walls); opts.quat overrides; opts.mat = "roomsd_stencil" for dark deck paint. */
export function decalImp(kit, index, pos, facing, size, opts = {}) {
  const g = new THREE.PlaneGeometry(size, opts.h || size);
  if (opts.spin) g.rotateZ(opts.spin);
  const rot = facing === "up" ? [-Math.PI / 2, 0, 0] : facing === "-z" ? [0, Math.PI, 0] : facing === "+x" ? [0, Math.PI / 2, 0] : facing === "-x" ? [0, -Math.PI / 2, 0] : [0, 0, 0];
  return kit.add(opts.mat || "decalImp", g, { pos, rot, quat: opts.quat || null, uv: "keep", uvRect: impDecalRect(index) });
}

// ---------------------------------------------------------------------------
// Pipes
// ---------------------------------------------------------------------------
const v3 = (p) => (p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2]));

/**
 * Straight pipe between two points. opts: mat, color, segments, clampStep (m, 0 = none), clampColor,
 * flanges (bool: wider short cylinders at both ends), texel.
 */
export function pipe(kit, a, b, r, opts = {}) {
  const { mat = "impMetal", color = PALETTE.impGreyDark, segments = 10, clampStep = 0, clampColor = PALETTE.impBlack, flanges = false } = opts;
  const pa = v3(a);
  const pb = v3(b);
  _dir.subVectors(pb, pa);
  const len = _dir.length();
  if (len < 1e-4) return;
  _dir.normalize();
  _mid.addVectors(pa, pb).multiplyScalar(0.5);
  _q.setFromUnitVectors(UP, _dir);
  kit.add(mat, new THREE.CylinderGeometry(r, r, len, segments, 1, false), { pos: [_mid.x, _mid.y, _mid.z], quat: _q, color, uv: "scale", uvScale: [2 * Math.PI * r, len] });
  if (flanges) {
    for (const t of [0.06, len - 0.06]) {
      const p = pa.clone().addScaledVector(_dir, t);
      kit.add(mat, new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.12, segments, 1, false), { pos: [p.x, p.y, p.z], quat: _q, color: PALETTE.impCharcoal, uv: "scale", uvScale: [2 * Math.PI * r, 0.12] });
    }
  }
  if (clampStep > 0) {
    const n = Math.floor((len - 0.4) / clampStep);
    for (let i = 0; i <= n; i++) {
      const t = 0.2 + (n > 0 ? ((len - 0.4) * i) / n : (len - 0.4) / 2);
      const p = pa.clone().addScaledVector(_dir, t);
      kit.add("impTrim", new THREE.BoxGeometry(r * 2 + 0.08, 0.1, r * 2 + 0.08), { pos: [p.x, p.y, p.z], quat: _q, color: clampColor, texel: 2 });
    }
  }
}

/** Polyline pipe with spherical elbows at the interior vertices. */
export function pipePath(kit, points, r, opts = {}) {
  const pts = points.map(v3);
  for (let i = 0; i < pts.length - 1; i++) pipe(kit, pts[i], pts[i + 1], r, opts);
  const { mat = "impMetal", color = PALETTE.impGreyDark } = opts;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    kit.add(mat, new THREE.SphereGeometry(r * 1.08, 10, 8), { pos: [p.x, p.y, p.z], color, uv: "scale", uvScale: [1, 1] });
  }
}

/** Hand valve: wheel (torus + spokes + hub) on a stem, axis along `axis` ('x'|'y'|'z'); pos = wheel centre. */
export function valveWheel(kit, pos, axis, r, opts = {}) {
  const { color = PALETTE.impRed, stem = 0.2 } = opts;
  const rot = axis === "x" ? [0, Math.PI / 2, 0] : axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  const [x, y, z] = pos;
  kit.add("impMetalRough", new THREE.TorusGeometry(r, r * 0.13, 8, 20), { pos, rot, color, uv: "scale", uvScale: [4, 1] });
  const ax = axis === "x" ? [1, 0, 0] : axis === "y" ? [0, 1, 0] : [0, 0, 1];
  const perp = axis === "y" ? [1, 0, 0] : [0, 1, 0];
  const spokeDir = new THREE.Vector3(...perp);
  const axisV = new THREE.Vector3(...ax);
  for (let k = 0; k < 3; k++) {
    const d = spokeDir.clone().applyAxisAngle(axisV, (k * Math.PI) / 3);
    _q.setFromUnitVectors(UP, d);
    kit.add("impMetalRough", new THREE.BoxGeometry(r * 0.12, r * 2, r * 0.12), { pos, quat: _q, color });
  }
  kit.cyl("impMetal", x, y, z, r * 0.22, r * 0.3, axis, { color: PALETTE.impGreyDark, segments: 10 });
  // stem back to the pipe
  const back = [x - ax[0] * stem * 0.5, y - ax[1] * stem * 0.5, z - ax[2] * stem * 0.5];
  kit.cyl("impMetal", back[0], back[1], back[2], r * 0.14, stem, axis, { color: PALETTE.impGreyDark, segments: 8 });
  kit.cyl("impTrim", back[0] - ax[0] * stem * 0.4, back[1] - ax[1] * stem * 0.4, back[2] - ax[2] * stem * 0.4, r * 0.45, 0.16, axis, { color: PALETTE.impBlack, segments: 10 });
}

/** Dial gauge: black housing, pale face, bezel ring, needle. facing: '+x'|'-x'|'+z'|'-z'|'up'. pos = face centre. */
export function gauge(kit, pos, facing, r = 0.12, opts = {}) {
  const { seed = 1, warn = false } = opts;
  const rand = rng(seed);
  const n = facing === "+x" ? [1, 0, 0] : facing === "-x" ? [-1, 0, 0] : facing === "+z" ? [0, 0, 1] : facing === "-z" ? [0, 0, -1] : [0, 1, 0];
  const axis = n[0] ? "x" : n[1] ? "y" : "z";
  const [x, y, z] = pos;
  const back = (d) => [x - n[0] * d, y - n[1] * d, z - n[2] * d];
  const fwd = (d) => [x + n[0] * d, y + n[1] * d, z + n[2] * d];
  const b = back(0.05);
  kit.cyl("impTrim", b[0], b[1], b[2], r * 1.15, 0.1, axis, { color: PALETTE.impBlack, segments: 16 });
  const f = fwd(0.002);
  kit.cyl("impPanel", f[0], f[1], f[2], r * 0.95, 0.004, axis, { color: PALETTE.impWhite, segments: 16, uv: "world", texel: 3 });
  const bz = fwd(0.005);
  const rot = axis === "x" ? [0, Math.PI / 2, 0] : axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  kit.add("impMetal", new THREE.TorusGeometry(r, r * 0.09, 6, 18), { pos: bz, rot, color: PALETTE.impGrey, uv: "scale", uvScale: [3, 1] });
  // needle: thin box in the face plane, pivoting about the face centre
  const ang = -0.6 + rand() * (warn ? 0.4 : 2.4);
  const nv = new THREE.Vector3(...n);
  const qz = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, nv);
  const nq = new THREE.Quaternion().setFromAxisAngle(nv, ang);
  const upLocal = UP.clone().applyQuaternion(qz);
  const off = upLocal.applyQuaternion(nq).multiplyScalar(r * 0.3);
  const np = fwd(0.008);
  const bq = nq.clone().multiply(qz);
  kit.add("impTrim", new THREE.BoxGeometry(r * 0.08, r * 0.9, 0.004), { pos: [np[0] + off.x, np[1] + off.y, np[2] + off.z], quat: bq, color: warn ? PALETTE.impRed : PALETTE.impBlack });
  // red zone tick
  kit.add("emitRedImp", new THREE.BoxGeometry(r * 0.12, r * 0.12, 0.003), { pos: fwd(0.008), quat: qz });
}

/** Wall-mounted junction box on a frame: housing, cover seam, LEDs, screen, conduit drops. */
export function junctionBox(frame, u, v, w, h, opts = {}) {
  const { seed = 1, accentKey = "emitAmber", drops = 2, screen = true } = opts;
  const rand = rng(seed);
  frame.box("impTrim", u, v, 0.09, w, h, 0.18, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u, v, 0.185, w - 0.08, h - 0.08, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
  frame.box("impTrim", u, v, 0.192, w - 0.16, 0.02, 0.004, { color: PALETTE.impBlack });
  const n = 2 + Math.floor(rand() * 4);
  for (let k = 0; k < n; k++) frame.box([accentKey, "emitRedImp", "emitWhite", accentKey, "emitGreen"][Math.floor(rand() * 5)], u - w / 2 + 0.1 + ((w - 0.2) * k) / Math.max(1, n - 1), v + h / 2 - 0.1, 0.194, 0.04, 0.04, 0.008);
  if (screen && w > 0.4) frame.screen(rand() < 0.5 ? "scrAmber0" : "scrAmber1", u, v - 0.02, 0.194, Math.min(0.5, w - 0.16), Math.min(0.28, h * 0.4));
  for (let k = 0; k < drops; k++) {
    const r = 0.02 + rand() * 0.02;
    const du = u - w / 2 + 0.12 + (k / Math.max(1, drops - 1)) * (w - 0.24);
    frame.cylV("impMetal", du, v - h / 2 - 0.35, 0.06, r, 0.7, { color: [PALETTE.impGreyDark, PALETTE.impCharcoal][k % 2], segments: 8 });
    frame.box("impTrim", du, v - h / 2 - 0.6, 0.06, r * 2 + 0.05, 0.06, r * 2 + 0.03, { color: PALETTE.impBlack });
  }
  frame.decal(IMP_DECAL.power, u + w / 2 + 0.18, v + h / 2 - 0.15, 0.001, 0.2);
}

/** Caged warning lamp: black cage bars + emissive dome. pos = dome centre; key = emissive material. */
export function warningLamp(kit, pos, key = "emitRedImp", opts = {}) {
  const [x, y, z] = pos;
  const r = opts.r || 0.09;
  const m = kit.add(key, new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), { pos: [x, y - r * 0.15, z] });
  kit.cyl("impTrim", x, y - r * 0.15 - 0.03, z, r * 1.2, 0.06, "y", { color: PALETTE.impBlack, segments: 12 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("impMetal", x + Math.cos(a) * r * 0.9, y + r * 0.35, z + Math.sin(a) * r * 0.9, 0.012, r * 1.3, 0.012, { color: PALETTE.impGreyDark });
  }
  kit.add("impMetal", new THREE.TorusGeometry(r * 0.95, 0.008, 6, 14), { pos: [x, y + r * 0.85, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.impGreyDark, uv: "scale", uvScale: [4, 1] });
  return m;
}

/**
 * Yellow/black hazard border (four strips) around a floor rectangle, built as GEOMETRY bars
 * (hazardBars): every stripe edge is a mesh edge the anti-aliasing pass smooths, where the chevron
 * texture stair-stepped and shimmered at grazing angles. mat "chevronR" = red/black. (texel is kept
 * for the old signature and ignored.)
 */
export function hazardBorder(kit, x0, z0, x1, z1, y = 0, w = 0.28, mat = "chevronY", texel = 1.2) {
  void texel;
  const color = mat === "chevronR" ? PALETTE.impRed : PALETTE.yellow;
  const bar = Math.max(0.24, Math.min(0.4, w * 1.15));
  hazardBars(kit, x0, z0 + w / 2, x1, z0 + w / 2, { w, bar, color, y });
  hazardBars(kit, x0, z1 - w / 2, x1, z1 - w / 2, { w, bar, color, y });
  hazardBars(kit, x0 + w / 2, z0 + w, x0 + w / 2, z1 - w, { w, bar, color, y });
  hazardBars(kit, x1 - w / 2, z0 + w, x1 - w / 2, z1 - w, { w, bar, color, y });
}

/**
 * Recessed hex bolt: a dark hexagonal socket sunk into a face with the hex head sitting below the
 * face plane. pos = point on the face; facing = outward normal ('+x'|'-x'|'+z'|'-z'|'up'|'down'); r = socket radius.
 */
export function hexBolt(kit, pos, facing, r = 0.07) {
  const n = facing === "+x" ? [1, 0, 0] : facing === "-x" ? [-1, 0, 0] : facing === "+z" ? [0, 0, 1] : facing === "-z" ? [0, 0, -1] : facing === "down" ? [0, -1, 0] : [0, 1, 0];
  const axis = n[0] ? "x" : n[1] ? "y" : "z";
  const [x, y, z] = pos;
  const at = (d) => [x + n[0] * d, y + n[1] * d, z + n[2] * d];
  // socket ring proud of the face by 1 cm (the recess reads from the dark rim), head sunk 3 cm
  const s = at(-0.02);
  kit.cyl("impTrim", s[0], s[1], s[2], r * 1.25, 0.06, axis, { color: PALETTE.impBlack, segments: 6 });
  const hd = at(-0.035);
  kit.cyl("impMetal", hd[0], hd[1], hd[2], r * 0.72, 0.03, axis, { color: PALETTE.impGreyDark, segments: 6 });
}

/**
 * Open cable tray along an axis-aligned polyline at floor / wall level: U-channel (base + two lips)
 * with 2–4 cables lying in it, a clamp bar every ~2 m. points: [[x,y,z], ...] (consecutive points
 * differ in one axis). opts: w (tray width), seed, cables.
 */
export function cableTray(kit, points, opts = {}) {
  const { w = 0.42, seed = 1, cables = 3, depth = 0.1 } = opts;
  const rand = rng(seed);
  const cols = [PALETTE.impBlack, PALETTE.impGreyDark, PALETTE.impBlueDeep, PALETTE.impCharcoal, PALETTE.impRed];
  const pts = points.map(v3);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
    const lo = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const hi = alongX ? Math.max(a.x, b.x) : Math.max(a.z, b.z);
    const c = alongX ? a.z : a.x;
    const y = a.y;
    const L = hi - lo;
    const box = (mat, o0, o1, y0, y1, col) => (alongX ? kit.boxMM(mat, [lo, y0, c + o0], [hi, y1, c + o1], { color: col, texel: 1 }) : kit.boxMM(mat, [c + o0, y0, lo], [c + o1, y1, hi], { color: col, texel: 1 }));
    box("impTrim", -w / 2, w / 2, y, y + 0.02, PALETTE.impCharcoal);
    box("impTrim", -w / 2, -w / 2 + 0.03, y, y + depth, PALETTE.impBlack);
    box("impTrim", w / 2 - 0.03, w / 2, y, y + depth, PALETTE.impBlack);
    for (let k = 0; k < cables; k++) {
      const r = 0.025 + rand() * 0.03;
      const o = -w / 2 + 0.08 + ((w - 0.16) * (k + 0.5)) / cables;
      const col = cols[Math.floor(rand() * cols.length)];
      if (alongX) pipe(kit, [lo + 0.02, y + 0.02 + r, c + o], [hi - 0.02, y + 0.02 + r, c + o], r, { color: col, segments: 8 });
      else pipe(kit, [c + o, y + 0.02 + r, lo + 0.02], [c + o, y + 0.02 + r, hi - 0.02], r, { color: col, segments: 8 });
    }
    for (let t = 1.0; t < L - 0.5; t += 2.2) {
      if (alongX) kit.box("impMetal", lo + t, y + depth - 0.01, c, 0.06, 0.02, w + 0.02, { color: PALETTE.impGreyDark });
      else kit.box("impMetal", c, y + depth - 0.01, lo + t, w + 0.02, 0.02, 0.06, { color: PALETTE.impGreyDark });
    }
  }
}

/**
 * Hooded work lamp aimed at a target: a dark shroud (open box) on a short stem hanging from `mount`,
 * with the emissive lens recessed inside so the source is never seen bare. The caller declares the
 * light itself (a spot from `pos` toward `target`, or a point at `pos`).
 */
export function shroudLamp(kit, mount, pos, target, opts = {}) {
  const { key = "emitWhiteDim", size = 0.5, reflector = PALETTE.impCharcoal } = opts;
  const m = v3(mount);
  const p = v3(pos);
  const t = v3(target);
  // stem from the mount to the lamp body
  pipe(kit, m, p, 0.03, { color: PALETTE.impGreyDark, segments: 8 });
  kit.box("impTrim", m.x, m.y - 0.05, m.z, 0.3, 0.1, 0.3, { color: PALETTE.impBlack, texel: 1 });
  // shroud: a box whose local -Z points at the target (open face), lens 8 cm inside. The hood is deep
  // (its own size), matte powder-black (rubber: roughness 0.86, no metalness, so the bulb outside its
  // mouth raises no specular sheen on the inner walls) and the reflector dark, so the mouth reads as a
  // dim lens in a dark box from any angle a player can reach.
  const dir = t.clone().sub(p).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
  const place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(p);
  const add = (mat, lx, ly, lz, sx, sy, sz, col) => {
    const c = place(lx, ly, lz);
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [c.x, c.y, c.z], quat: q, color: col, texel: 1 });
  };
  const d = size; // hood depth
  add("rubber", 0, 0, d / 2, size + 0.12, size + 0.12, 0.06, PALETTE.impBlack); // back
  add("rubber", -(size + 0.06) / 2, 0, 0, 0.06, size + 0.12, d, PALETTE.impBlack);
  add("rubber", (size + 0.06) / 2, 0, 0, 0.06, size + 0.12, d, PALETTE.impBlack);
  add("rubber", 0, (size + 0.06) / 2, 0, size + 0.12, 0.06, d, PALETTE.impBlack);
  add("rubber", 0, -(size + 0.06) / 2, 0, size + 0.12, 0.06, d, PALETTE.impBlack);
  add("impMetalRough", 0, 0, d / 2 - 0.04, size, size, 0.01, reflector); // reflector (matte, dark)
  const lens = place(0, 0, d / 2 - 0.06);
  kit.add(key, new THREE.BoxGeometry(size * 0.7, size * 0.7, 0.02), { pos: [lens.x, lens.y, lens.z], quat: q, uv: "keep" });
  // louvre fins across the mouth
  for (let k = -1; k <= 1; k++) add("impTrim", 0, (k * size) / 3, -d / 2 + 0.05, size, 0.02, 0.08, PALETTE.impBlack);
  // mouth centre (where a point light belongs: inside the rim, so the hood's outside faces away from it)
  const mouth = place(0, 0, -d / 2 + 0.1);
  return [mouth.x, mouth.y, mouth.z];
}

/**
 * Painted dashed deck line (geometry, no texture: no stair-stepped stripe edges at grazing angles).
 * From (x0,z0) to (x1,z1), axis-aligned. opts: w (line width), dash, gap, color, y.
 */
export function dashedLine(kit, x0, z0, x1, z1, opts = {}) {
  const { w = 0.12, dash = 0.7, gap = 0.5, color = PALETTE.yellow, y = 0 } = opts;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const lo = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const hi = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0;
  for (let a = lo; a < hi - 0.05; a += dash + gap) {
    const b = Math.min(hi, a + dash);
    if (alongX) kit.boxMM("impPanel1", [a, y + 0.002, c - w / 2], [b, y + 0.01, c + w / 2], { color, uv: "world", texel: 1 });
    else kit.boxMM("impPanel1", [c - w / 2, y + 0.002, a], [c + w / 2, y + 0.01, b], { color, uv: "world", texel: 1 });
  }
}

/**
 * Hazard stripe as geometry: alternating yellow / black bars across a strip from (x0,z0) to (x1,z1)
 * (axis-aligned, `w` wide). Reads as the chevron texture from a distance, but every edge is a mesh
 * edge the anti-aliasing pass smooths, so it never shimmers or stair-steps close up.
 */
export function hazardBars(kit, x0, z0, x1, z1, opts = {}) {
  const { w = 0.28, bar = 0.32, color = PALETTE.yellow, dark = PALETTE.impBlack, y = 0 } = opts;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const lo = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const hi = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0;
  let k = 0;
  for (let a = lo; a < hi - 0.02; a += bar, k++) {
    const b = Math.min(hi, a + bar);
    const col = k % 2 ? dark : color;
    if (alongX) kit.boxMM("impPanel1", [a, y + 0.002, c - w / 2], [b, y + 0.01, c + w / 2], { color: col, uv: "world", texel: 1 });
    else kit.boxMM("impPanel1", [c - w / 2, y + 0.002, a], [c + w / 2, y + 0.01, b], { color: col, uv: "world", texel: 1 });
  }
}

/**
 * Engineering-style equipment cabinet run against a wall: black shells with grey enamel fronts, drawer
 * fronts / vent grilles / amber readouts per bay, a dim amber strip along the top edge of every bay and
 * a status LED. facing: '+z' (back to the N wall), '-z', '+x', '-x'. Adds one collider for the run.
 */
export function cabinetRow(kit, x0, x1, zBack, facing, opts = {}) {
  const { h = 2.4, depth = 0.7, bay = 1.25, seed = 1, accentKey = "emitAmber", strip = "emitAmberDim", front = PALETTE.impGreyDark, screens = ["scrAmber0", "scrAmber1", "scrAmber2", "scrAmber3"] } = opts;
  const rand = rng(seed);
  const n = [0, 0, 0];
  if (facing === "+z") n[2] = 1;
  else if (facing === "-z") n[2] = -1;
  else if (facing === "+x") n[0] = 1;
  else n[0] = -1;
  const along = n[0] ? [0, 0, 1] : [1, 0, 0];
  // run centre line (back face at zBack, along the run's axis from x0 to x1)
  const L = Math.abs(x1 - x0);
  const mid = (x0 + x1) / 2;
  const cx = n[0] ? zBack + n[0] * (depth / 2) : mid;
  const cz = n[2] ? zBack + n[2] * (depth / 2) : mid;
  kit.box("impTrim", cx, h / 2, cz, n[0] ? depth : L, h, n[2] ? depth : L, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", cx, 0.06, cz, (n[0] ? depth : L) + 0.06, 0.12, (n[2] ? depth : L) + 0.06, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impMetal", cx, h - 0.04, cz, (n[0] ? depth : L) + 0.04, 0.08, (n[2] ? depth : L) + 0.04, { color: PALETTE.impCharcoal, texel: 1 });
  const fx = cx + n[0] * (depth / 2 + 0.006);
  const fz = cz + n[2] * (depth / 2 + 0.006);
  const nB = Math.max(1, Math.round(L / bay));
  const bw = L / nB;
  const rot = n[0] > 0 ? [0, Math.PI / 2, 0] : n[0] < 0 ? [0, -Math.PI / 2, 0] : n[2] < 0 ? [0, Math.PI, 0] : [0, 0, 0];
  for (let i = 0; i < nB; i++) {
    const o = Math.min(x0, x1) - mid + (i + 0.5) * bw;
    const bx = fx + along[0] * o;
    const bz = fz + along[2] * o;
    const at = (dn, dy, off = 0) => [bx + n[0] * dn + along[0] * off, dy, bz + n[2] * dn + along[2] * off];
    const sz = (thick, wide) => (n[0] ? [thick, wide] : [wide, thick]);
    const face = (mat, dn, y, thick, wide, hgt, col, off = 0) => {
      const [sx, szz] = sz(thick, wide);
      const p = at(dn, y, off);
      kit.box(mat, p[0], p[1], p[2], sx, hgt, szz, col !== undefined ? { color: col, texel: 1.5 } : { uv: "keep" });
    };
    face("impPanel1", 0.0, h / 2, 0.012, bw - 0.1, h - 0.3, front); // enamel front (responds to the room's light, unlike bare metal)
    // top: amber strip in a shallow black channel + status LED
    face("impTrim", 0.012, h - 0.32, 0.03, bw - 0.3, 0.1, PALETTE.impBlack);
    face(strip, 0.03, h - 0.32, 0.012, bw - 0.5, 0.03);
    face(rand() < 0.8 ? accentKey : "emitRedImp", 0.03, h - 0.5, 0.012, 0.05, 0.05, undefined, -bw / 2 + 0.2);
    const kind = rand();
    if (kind < 0.4) {
      // readout + a row of gloss switches
      const g = new THREE.PlaneGeometry(Math.min(0.7, bw - 0.4), 0.3);
      const p = at(0.03, h * 0.62);
      kit.add(screens[Math.floor(rand() * screens.length)], g, { pos: p, rot, uv: "keep" });
      for (let k = -1; k <= 1; k++) face("impGloss", 0.03, h * 0.62 - 0.32, 0.012, 0.14, 0.06, undefined, k * 0.2);
      face("impMetal", 0.03, 0.9, 0.012, bw - 0.4, 0.04, PALETTE.impGrey);
    } else if (kind < 0.7) {
      // drawer fronts with handles
      for (let k = 0; k < 4; k++) {
        face("impGloss", 0.03, 0.5 + k * 0.42, 0.012, bw - 0.4, 0.3);
        face("impMetal", 0.05, 0.5 + k * 0.42, 0.03, 0.3, 0.03, PALETTE.impGrey);
      }
    } else {
      // louvre grilles top and bottom, a gauge-like dial box between
      for (let k = 0; k < 6; k++) face("impMetal", 0.03, 0.5 + k * 0.07, 0.02, bw - 0.4, 0.015, PALETTE.impGreyDark);
      for (let k = 0; k < 6; k++) face("impMetal", 0.03, h - 1.0 + k * 0.07, 0.02, bw - 0.4, 0.015, PALETTE.impGreyDark);
      face("impTrim", 0.03, h * 0.55, 0.06, 0.5, 0.36, PALETTE.impBlack);
      face("impGloss", 0.065, h * 0.55, 0.01, 0.42, 0.28);
    }
    decalImp(kit, [IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3, IMP_DECAL.power][Math.floor(rand() * 4)], at(0.04, 0.3), facing, 0.22);
    // bay seam
    if (i > 0) face("impTrim", 0.02, h / 2, 0.02, 0.04, h - 0.2, PALETTE.impBlack);
  }
  kit.collider([cx - (n[0] ? depth : L) / 2 - 0.05, 0, cz - (n[2] ? depth : L) / 2 - 0.05], [cx + (n[0] ? depth : L) / 2 + 0.05, h, cz + (n[2] ? depth : L) / 2 + 0.05], "cabinets");
}

/**
 * Wall pipe manifold: two headers along a wall (low and high) joined by risers with valve wheels and
 * gauges, end blocks, and clamped drops from the high header up into the ceiling mains. Runs along x
 * at zWall (the wall face), room side toward `side` (-1 = toward -z, +1 = toward +z).
 */
export function wallManifold(kit, x0, x1, zWall, side, opts = {}) {
  const { yLo = 1.3, yHi = 3.6, yTop = null, risers = 5, seed = 1, rLo = 0.16, rHi = 0.12 } = opts;
  const rand = rng(seed);
  const z = zWall + side * 0.55;
  pipe(kit, [x0 - 0.3, yLo, z], [x1 + 0.3, yLo, z], rLo, { color: PALETTE.impGreyDark, flanges: true, clampStep: 1.8 });
  pipe(kit, [x0 - 0.3, yHi, z], [x1 + 0.3, yHi, z], rHi, { color: PALETTE.impGrey, flanges: true, clampStep: 2.2 });
  for (let k = 0; k < risers; k++) {
    const x = x0 + ((x1 - x0) * k) / Math.max(1, risers - 1);
    pipe(kit, [x, yLo, z], [x, yHi, z], 0.07, { color: [PALETTE.impGrey, PALETTE.impGreyDark][k % 2] });
    valveWheel(kit, [x, (yLo + yHi) / 2, z + side * 0.36], "z", 0.17, { color: k % 3 === 2 ? PALETTE.impAmber : PALETTE.impRed, stem: 0.22 });
    if (k % 2 === 0) gauge(kit, [x + 0.32, yHi - 0.55, z + side * 0.14], side < 0 ? "-z" : "+z", 0.09, { seed: seed + k, warn: rand() < 0.25 });
    kit.box("impTrim", x, yLo, z, 0.3, 0.42, 0.42, { color: PALETTE.impBlack });
  }
  for (const x of [x0 - 0.3, x1 + 0.3]) {
    kit.box("impTrim", x, (yLo + yHi) / 2, zWall + side * 0.3, 0.7, yHi - yLo + 0.9, 0.6, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", x, yHi + 0.5, zWall + side * 0.3, 0.8, 0.1, 0.7, { color: PALETTE.impCharcoal, texel: 1 });
    if (yTop) pipe(kit, [x, yHi + 0.55, zWall + side * 0.3], [x, yTop, zWall + side * 0.3], 0.11, { color: PALETTE.impGreyDark, clampStep: 2.0 });
  }
  // drip tray along the base
  kit.boxMM("impMetal", [x0 - 0.5, 0.0, Math.min(zWall, z + side * 0.5)], [x1 + 0.5, 0.1, Math.max(zWall, z + side * 0.5)], { color: PALETTE.impCharcoal, texel: 1 });
  kit.collider([x0 - 0.7, 0, Math.min(zWall, z + side * 0.6)], [x1 + 0.7, yHi + 0.6, Math.max(zWall, z + side * 0.6)], "manifold");
}

/** Grate quad (cut-out texture) over [x0,z0]-[x1,z1] at height y, with real rail bars proud of it along `axis`. */
export function grateQuad(kit, x0, z0, x1, z1, y, opts = {}) {
  const { axis = "z", bars = true, tint = 0xffffff } = opts;
  const w = x1 - x0;
  const d = z1 - z0;
  // the texture's rails run along the geometry's v (height) direction
  const g = axis === "x" ? new THREE.PlaneGeometry(d, w) : new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  if (axis === "x") g.rotateY(Math.PI / 2);
  const su = axis === "x" ? d / 1.24 : w / 1.24;
  const sv = axis === "x" ? w / 0.9 : d / 0.9;
  kit.add("grate", g, { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], uv: "scale", uvScale: [su, sv], color: tint });
  if (bars) {
    if (axis === "z") for (let x = x0 + 0.155; x < x1 - 0.1; x += 0.31) kit.box("impMetal", x, y + 0.012, (z0 + z1) / 2, 0.03, 0.03, d, { color: PALETTE.impGreyDark, texel: 2 });
    else for (let z = z0 + 0.155; z < z1 - 0.1; z += 0.31) kit.box("impMetal", (x0 + x1) / 2, y + 0.012, z, w, 0.03, 0.03, { color: PALETTE.impGreyDark, texel: 2 });
  }
}

/**
 * Floor deck with rectangular cutouts (for trenches). Emits impDeck slabs (y-0.14..y) covering the
 * rect minus the cutouts, splitting into z-strips then x-spans. cutouts: [{x0,z0,x1,z1}].
 */
export function deckFloor(kit, x0, z0, x1, z1, cutouts = [], opts = {}) {
  const { color = PALETTE.impGrey, texel = 0.5, y = 0, thick = 0.14 } = opts;
  const zs = [z0, z1];
  for (const c of cutouts) {
    if (c.z0 > z0 && c.z0 < z1) zs.push(c.z0);
    if (c.z1 > z0 && c.z1 < z1) zs.push(c.z1);
  }
  zs.sort((a, b) => a - b);
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i];
    const zb = zs[i + 1];
    if (zb - za < 1e-4) continue;
    const zm = (za + zb) / 2;
    // cutouts spanning this strip
    const cuts = cutouts.filter((c) => c.z0 <= zm && c.z1 >= zm && c.x1 > x0 && c.x0 < x1).sort((a, b) => a.x0 - b.x0);
    let xa = x0;
    for (const c of cuts) {
      if (c.x0 > xa) kit.boxMM("impDeck", [xa, y - thick, za], [c.x0, y, zb], { color, texel });
      xa = Math.max(xa, c.x1);
    }
    if (x1 > xa) kit.boxMM("impDeck", [xa, y - thick, za], [x1, y, zb], { color, texel });
  }
}

/**
 * Cable trench under a floor cutout: dark pit (bottom + lined walls), cables / pipes inside, grate on top
 * with rail bars. The room's default floor keeps it walkable. axis = long axis.
 */
export function grateTrench(kit, x0, z0, x1, z1, opts = {}) {
  const { depth = 0.5, axis = x1 - x0 > z1 - z0 ? "x" : "z", seed = 1, cables = 3, accentKey = null, y = 0 } = opts;
  const rand = rng(seed);
  const yb = y - depth;
  kit.boxMM("impTrim", [x0, yb - 0.04, z0], [x1, yb, z1], { color: PALETTE.impBlack, texel: 0.5 });
  const t = 0.04;
  kit.boxMM("impTrim", [x0 - t, yb, z0 - t], [x0, y - 0.005, z1 + t], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impTrim", [x1, yb, z0 - t], [x1 + t, y - 0.005, z1 + t], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impTrim", [x0, yb, z0 - t], [x1, y - 0.005, z0], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impTrim", [x0, yb, z1], [x1, y - 0.005, z1 + t], { color: PALETTE.impCharcoal, texel: 1 });
  // curb lip flush with the deck
  kit.boxMM("impMetal", [x0 - 0.08, y - 0.02, z0 - 0.08], [x1 + 0.08, y + 0.012, z0], { color: PALETTE.impGreyDark, texel: 2 });
  kit.boxMM("impMetal", [x0 - 0.08, y - 0.02, z1], [x1 + 0.08, y + 0.012, z1 + 0.08], { color: PALETTE.impGreyDark, texel: 2 });
  kit.boxMM("impMetal", [x0 - 0.08, y - 0.02, z0], [x0, y + 0.012, z1], { color: PALETTE.impGreyDark, texel: 2 });
  kit.boxMM("impMetal", [x1, y - 0.02, z0], [x1 + 0.08, y + 0.012, z1], { color: PALETTE.impGreyDark, texel: 2 });
  const w = axis === "x" ? z1 - z0 : x1 - x0;
  const cols = [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey, PALETTE.impBlueDeep, PALETTE.impAmber];
  for (let k = 0; k < cables; k++) {
    const r = 0.03 + rand() * 0.05;
    const off = -w / 2 + 0.12 + ((w - 0.24) * (k + 0.5)) / cables;
    const yy = yb + 0.08 + rand() * (depth * 0.4);
    const col = cols[Math.floor(rand() * cols.length)];
    if (axis === "x") pipe(kit, [x0 + 0.02, yy, (z0 + z1) / 2 + off], [x1 - 0.02, yy, (z0 + z1) / 2 + off], r, { color: col, clampStep: 1.6 + rand(), segments: 8 });
    else pipe(kit, [(x0 + x1) / 2 + off, yy, z0 + 0.02], [(x0 + x1) / 2 + off, yy, z1 - 0.02], r, { color: col, clampStep: 1.6 + rand(), segments: 8 });
  }
  if (accentKey) {
    // a lit service strip along one trench wall
    if (axis === "x") kit.boxMM(accentKey, [x0 + 0.1, yb + 0.05, z0 + 0.005], [x1 - 0.1, yb + 0.08, z0 + 0.015]);
    else kit.boxMM(accentKey, [x0 + 0.005, yb + 0.05, z0 + 0.1], [x0 + 0.015, yb + 0.08, z1 - 0.1]);
  }
  grateQuad(kit, x0, z0, x1, z1, y - 0.01, { axis });
}

// ---------------------------------------------------------------------------
// Stairs and catwalks
// ---------------------------------------------------------------------------
/**
 * Solid stair run: treads + risers, closed stringers, handrails, kit.stairs floors, walkable step
 * colliders (block the run from the side / below, let the player climb). axis 'x'|'z'; the run goes
 * from `from` (height y0) to `to` (height y1). Rails: opts.rails = [side, ...] where side is '-'|'+'
 * (the cross-axis side); opts.railKey lights the top rail.
 */
export function solidStairs(kit, x0, z0, x1, z1, axis, from, to, y0, y1, opts = {}) {
  const { rails = ["-", "+"], railKey = null, color = PALETTE.impGreyDark, tag = "stair" } = opts;
  const rise = y1 - y0;
  const n = Math.max(1, Math.round(Math.abs(rise) / 0.18));
  kit.stairs(x0, z0, x1, z1, axis, from, to, y0, y1, n);
  const width = axis === "x" ? z1 - z0 : x1 - x0;
  const run = Math.abs(to - from);
  const dir = Math.sign(to - from);
  const treadD = run / n;
  for (let i = 0; i < n; i++) {
    const a = from + dir * treadD * i;
    const b = from + dir * treadD * (i + 1);
    const yt = y0 + (rise * (i + 1)) / n;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (axis === "x") {
      kit.boxMM("impMetal", [lo, yt - 0.05, z0], [hi, yt, z1], { color, texel: 1.5 });
      kit.boxMM("impTrim", [dir > 0 ? lo : hi - 0.03, yt - 0.18 - 0.001, z0 + 0.02], [dir > 0 ? lo + 0.03 : hi, yt - 0.05, z1 - 0.02], { color: PALETTE.impBlack });
      kit.collider([lo, y0 - 0.5, z0], [hi, yt, z1], tag);
      // nosing strip
      kit.boxMM("impTrim", [dir > 0 ? hi - 0.04 : lo, yt, z0 + 0.01], [dir > 0 ? hi : lo + 0.04, yt + 0.006, z1 - 0.01], { color: PALETTE.impBlack });
    } else {
      kit.boxMM("impMetal", [x0, yt - 0.05, lo], [x1, yt, hi], { color, texel: 1.5 });
      kit.boxMM("impTrim", [x0 + 0.02, yt - 0.18 - 0.001, dir > 0 ? lo : hi - 0.03], [x1 - 0.02, yt - 0.05, dir > 0 ? lo + 0.03 : hi], { color: PALETTE.impBlack });
      kit.collider([x0, y0 - 0.5, lo], [x1, yt, hi], tag);
      kit.boxMM("impTrim", [x0 + 0.01, yt, dir > 0 ? hi - 0.04 : lo], [x1 - 0.01, yt + 0.006, dir > 0 ? hi : lo + 0.04], { color: PALETTE.impBlack });
    }
    kit.colliders[kit.colliders.length - 1].walkable = true;
  }
  // closed stringers: a sloped slab on each side (thin box rotated about the cross axis)
  const slope = Math.atan2(rise, run);
  const L = Math.hypot(rise, run);
  const mid = (from + to) / 2;
  const ym = (y0 + y1) / 2 - 0.35;
  for (const s of [-1, 1]) {
    const c = axis === "x" ? (z0 + z1) / 2 + s * (width / 2 + 0.02) : (x0 + x1) / 2 + s * (width / 2 + 0.02);
    const pos = axis === "x" ? [mid, ym, c] : [c, ym, mid];
    const rot = axis === "x" ? [0, 0, dir * slope] : [-dir * slope, 0, 0];
    const g = axis === "x" ? new THREE.BoxGeometry(L, 0.55, 0.05) : new THREE.BoxGeometry(0.05, 0.55, L);
    kit.add("impTrim", g, { pos, rot, color: PALETTE.impBlack, texel: 1 });
  }
  // handrails: sloped tube + posts every 3 steps, thin colliders alongside
  for (const side of rails) {
    const s = side === "-" ? -1 : 1;
    const c = axis === "x" ? (z0 + z1) / 2 + s * (width / 2 - 0.06) : (x0 + x1) / 2 + s * (width / 2 - 0.06);
    const h = 1.0;
    const pA = axis === "x" ? [from, y0 + h, c] : [c, y0 + h, from];
    const pB = axis === "x" ? [to, y1 + h, c] : [c, y1 + h, to];
    pipe(kit, pA, pB, 0.03, { color: PALETTE.impGreyDark, segments: 8 });
    const pA2 = axis === "x" ? [from, y0 + h * 0.55, c] : [c, y0 + h * 0.55, from];
    const pB2 = axis === "x" ? [to, y1 + h * 0.55, c] : [c, y1 + h * 0.55, to];
    pipe(kit, pA2, pB2, 0.02, { color: PALETTE.impGreyDark, segments: 8 });
    const nPosts = Math.max(2, Math.round(n / 3) + 1);
    for (let k = 0; k < nPosts; k++) {
      const t = k / (nPosts - 1);
      const p = from + (to - from) * t;
      const yy = y0 + rise * t;
      if (axis === "x") kit.box("impTrim", p, yy + h / 2, c, 0.05, h, 0.05, { color: PALETTE.impBlack });
      else kit.box("impTrim", c, yy + h / 2, p, 0.05, h, 0.05, { color: PALETTE.impBlack });
    }
    if (railKey) pipe(kit, pA, pB, 0.012, { mat: railKey });
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    if (axis === "x") kit.collider([lo, Math.min(y0, y1), c - 0.05], [hi, Math.max(y0, y1) + h + 0.1, c + 0.05], "rail");
    else kit.collider([c - 0.05, Math.min(y0, y1), lo], [c + 0.05, Math.max(y0, y1) + h + 0.1, hi], "rail");
  }
}

/**
 * Raised catwalk / platform deck: slab (grate or deck plate), black edge trim, kit.floor, optional
 * support columns (with colliders) and railings per side with gaps. opts.rails: { N: [gaps], S: … }
 * where a gap is [a, b] along the side's axis; sides absent = no railing.
 */
export function catwalk(kit, x0, z0, x1, z1, y, opts = {}) {
  const { grate = true, columns = [], colW = 0.28, rails = {}, railKey = null, thick = 0.1, trimColor = PALETTE.impBlack, floor = true, tag = "catwalk", noTrim = [] } = opts;
  if (floor) kit.floor(x0, z0, x1, z1, y, tag);
  const gx0 = noTrim.includes("W") ? x0 : x0 + 0.06;
  const gx1 = noTrim.includes("E") ? x1 : x1 - 0.06;
  const gz0 = noTrim.includes("N") ? z0 : z0 + 0.06;
  const gz1 = noTrim.includes("S") ? z1 : z1 - 0.06;
  if (grate) {
    kit.boxMM("impTrim", [x0, y - thick, z0], [x1, y - 0.03, z1], { color: PALETTE.impCharcoal, texel: 0.5 });
    grateQuad(kit, gx0, gz0, gx1, gz1, y - 0.004, { axis: x1 - x0 > z1 - z0 ? "z" : "x" });
  } else {
    kit.boxMM("impDeck", [x0, y - thick, z0], [x1, y, z1], { color: PALETTE.impGrey, texel: 0.5 });
  }
  // edge trim (proud lip) on the sides that are not continued by another deck
  const lip = 0.06;
  if (!noTrim.includes("N")) kit.boxMM("impTrim", [x0 - 0.02, y - thick - 0.02, z0 - 0.02], [x1 + 0.02, y + 0.02, z0 + lip], { color: trimColor, texel: 1 });
  if (!noTrim.includes("S")) kit.boxMM("impTrim", [x0 - 0.02, y - thick - 0.02, z1 - lip], [x1 + 0.02, y + 0.02, z1 + 0.02], { color: trimColor, texel: 1 });
  if (!noTrim.includes("W")) kit.boxMM("impTrim", [x0 - 0.02, y - thick - 0.02, z0 + lip], [x0 + lip, y + 0.02, z1 - lip], { color: trimColor, texel: 1 });
  if (!noTrim.includes("E")) kit.boxMM("impTrim", [x1 - lip, y - thick - 0.02, z0 + lip], [x1 + 0.02, y + 0.02, z1 - lip], { color: trimColor, texel: 1 });
  // under-deck stringers
  for (let x = x0 + 1.0; x < x1 - 0.5; x += 2.0) kit.boxMM("impTrim", [x - 0.04, y - thick - 0.16, z0 + 0.05], [x + 0.04, y - thick, z1 - 0.05], { color: PALETTE.impBlack });
  for (const [cx, cz] of columns) {
    kit.box("impTrim", cx, (y - thick) / 2, cz, colW, y - thick, colW, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", cx, 0.15, cz, colW + 0.16, 0.3, colW + 0.16, { color: PALETTE.impCharcoal, texel: 1 });
    kit.box("impMetal", cx, y - thick - 0.2, cz, colW + 0.12, 0.3, colW + 0.12, { color: PALETTE.impCharcoal, texel: 1 });
    kit.collider([cx - colW / 2 - 0.08, 0, cz - colW / 2 - 0.08], [cx + colW / 2 + 0.08, y, cz + colW / 2 + 0.08], "column");
  }
  const railSide = (from, to, gaps) => {
    // split the segment by gaps (in the segment's own parametric coordinate along its axis)
    const alongX = from[1] === to[1];
    const a0 = alongX ? from[0] : from[1];
    const a1 = alongX ? to[0] : to[1];
    const lo = Math.min(a0, a1);
    const hi = Math.max(a0, a1);
    let spans = [[lo, hi]];
    for (const [g0, g1] of gaps || []) {
      const next = [];
      for (const [a, b] of spans) {
        if (g1 <= a || g0 >= b) next.push([a, b]);
        else {
          if (g0 > a) next.push([a, g0]);
          if (g1 < b) next.push([g1, b]);
        }
      }
      spans = next;
    }
    for (const [a, b] of spans) {
      if (b - a < 0.3) continue;
      const pa = alongX ? [a, from[1]] : [from[0], a];
      const pb = alongX ? [b, from[1]] : [from[0], b];
      impRailing(kit, pa, pb, y, { light: railKey, postStep: 1.5 });
    }
  };
  const inset = 0.1;
  if (rails.N) railSide([x0 + inset, z0 + inset], [x1 - inset, z0 + inset], rails.N);
  if (rails.S) railSide([x0 + inset, z1 - inset], [x1 - inset, z1 - inset], rails.S);
  if (rails.W) railSide([x0 + inset, z0 + inset], [x0 + inset, z1 - inset], rails.W);
  if (rails.E) railSide([x1 - inset, z0 + inset], [x1 - inset, z1 - inset], rails.E);
}

/** Low dais (one step): deck slab, black lip, kit.floor; the player steps up automatically. */
export function dais(kit, x0, z0, x1, z1, h = 0.3, opts = {}) {
  const { hazard = false } = opts;
  kit.boxMM("impDeck", [x0, 0, z0], [x1, h, z1], { color: PALETTE.impGreyDark, texel: 0.5 });
  kit.boxMM("impTrim", [x0 - 0.02, 0, z0 - 0.02], [x1 + 0.02, 0.08, z1 + 0.02], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impTrim", [x0 - 0.02, h - 0.04, z0 - 0.02], [x1 + 0.02, h + 0.01, z1 + 0.02], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impDeck", [x0 + 0.06, h + 0.011, z0 + 0.06], [x1 - 0.06, h + 0.02, z1 - 0.06], { color: PALETTE.impGrey, texel: 0.5 });
  kit.floor(x0, z0, x1, z1, h + 0.02, "dais");
  if (hazard) hazardBorder(kit, x0 - 0.35, z0 - 0.35, x1 + 0.35, z1 + 0.35, 0, 0.3);
}

// ---------------------------------------------------------------------------
// Machinery
// ---------------------------------------------------------------------------
/**
 * Vertical tank: shell, domed top, base skirt, bands, a level gauge (glass tube with a lit fill),
 * a status LED box, an inlet valve, an inspection hatch. Returns the top y. Adds a collider.
 */
export function tank(kit, x, z, r, h, opts = {}) {
  const { color = PALETTE.impGrey, accentKey = "emitGreen", seed = 1, level = 0.6, bands = 3, facing = "+z", segments = 24, label = IMP_DECAL.glyphs1 } = opts;
  const rand = rng(seed);
  const n = facing === "+x" ? [1, 0, 0] : facing === "-x" ? [-1, 0, 0] : facing === "-z" ? [0, 0, -1] : [0, 0, 1];
  kit.cyl("impMetal", x, 0.15, z, r * 1.06, 0.3, "y", { color: PALETTE.impCharcoal, segments });
  kit.cyl("impPanel1", x, 0.3 + (h - 0.6) / 2, z, r, h - 0.6, "y", { color, segments, uv: "world", texel: 0.8 });
  kit.add("impMetal", new THREE.SphereGeometry(r, segments, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, h - 0.3, z], color: PALETTE.impGreyDark, uv: "scale", uvScale: [4, 1] });
  kit.cyl("impTrim", x, h - 0.3 + r * 0.98, z, r * 0.18, 0.12, "y", { color: PALETTE.impBlack, segments: 12 });
  for (let b = 0; b < bands; b++) {
    const yy = 0.6 + ((h - 1.4) * (b + 0.5)) / bands;
    kit.cyl("impTrim", x, yy, z, r + 0.03, 0.12, "y", { color: PALETTE.impBlack, segments });
  }
  // level gauge on the facing side: black channel, glass tube, lit fill to `level`
  const gx = x + n[0] * (r + 0.09);
  const gz = z + n[2] * (r + 0.09);
  const gh = h - 1.6;
  const gy = 0.8 + gh / 2;
  kit.box("impTrim", gx, gy, gz, n[0] ? 0.1 : 0.22, gh + 0.2, n[2] ? 0.1 : 0.22, { color: PALETTE.impBlack });
  kit.box("impGloss", gx + n[0] * 0.03, gy, gz + n[2] * 0.03, n[0] ? 0.06 : 0.1, gh, n[2] ? 0.06 : 0.1);
  kit.box(accentKey, gx + n[0] * 0.035, 0.8 + (gh * level) / 2, gz + n[2] * 0.035, n[0] ? 0.05 : 0.06, gh * level, n[2] ? 0.05 : 0.06);
  for (let k = 0; k <= 4; k++) kit.box("impMetal", gx + n[0] * 0.06, 0.8 + (gh * k) / 4, gz + n[2] * 0.06, n[0] ? 0.02 : 0.16, 0.015, n[2] ? 0.02 : 0.16, { color: PALETTE.impGrey });
  // status box with LEDs beside the gauge
  const side = n[0] ? [0, 0, 1] : [1, 0, 0];
  const bx = gx + side[0] * 0.35;
  const bz = gz + side[2] * 0.35;
  kit.box("impTrim", bx, 1.35, bz, n[0] ? 0.08 : 0.26, 0.34, n[2] ? 0.08 : 0.26, { color: PALETTE.impBlack });
  kit.box(accentKey, bx + n[0] * 0.045, 1.45, bz + n[2] * 0.045, n[0] ? 0.01 : 0.05, 0.05, n[2] ? 0.01 : 0.05);
  kit.box(rand() < 0.3 ? "emitRedImp" : "emitWhite", bx + n[0] * 0.045, 1.33, bz + n[2] * 0.045, n[0] ? 0.01 : 0.05, 0.05, n[2] ? 0.01 : 0.05);
  kit.box("impGloss", bx + n[0] * 0.045, 1.24, bz + n[2] * 0.045, n[0] ? 0.01 : 0.16, 0.05, n[2] ? 0.01 : 0.16);
  // inlet pipe + valve at the base, facing side
  const vx = x + n[0] * (r + 0.35);
  const vz = z + n[2] * (r + 0.35);
  pipe(kit, [x + n[0] * (r - 0.05), 0.55, z + n[2] * (r - 0.05)], [vx + n[0] * 0.3, 0.55, vz + n[2] * 0.3], 0.07, { color: PALETTE.impGreyDark, flanges: true });
  valveWheel(kit, [vx, 0.55 + 0.25, vz], "y", 0.16, { color: PALETTE.impRed, stem: 0.18 });
  // inspection hatch + stencil
  const hx = x - n[0] * (r - 0.01);
  const hz = z - n[2] * (r - 0.01);
  kit.cyl("impTrim", hx, 1.5, hz, 0.28, 0.06, n[0] ? "x" : "z", { color: PALETTE.impBlack, segments: 16 });
  decalImp(kit, label, [x + n[0] * (r + 0.02), h * 0.62, z + n[2] * (r + 0.02)], facing, Math.min(0.4, r * 0.4));
  kit.collider([x - r - 0.15, 0, z - r - 0.15], [x + r + 0.15, h, z + r + 0.15], "tank");
  return h - 0.3 + r;
}

/**
 * Bank of framed screens on a wall frame: cols × rows grid starting at (u0, v0) (bottom-left of the
 * grid), each screen sw × sh with `gap`. keys cycle through the list. Adds a backing plate.
 */
export function screenBank(frame, u0, v0, cols, rows, sw, sh, gap, keys, opts = {}) {
  const { seed = 1, back = true, bezel = 0.05, n = 0.06 } = opts;
  const rand = rng(seed);
  const W = cols * sw + (cols + 1) * gap;
  const H = rows * sh + (rows + 1) * gap;
  if (back) frame.box("impTrim", u0 + W / 2, v0 + H / 2, n / 2, W, H, n, { color: PALETTE.impBlack, texel: 1 });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cu = u0 + gap + sw / 2 + c * (sw + gap);
      const cv = v0 + gap + sh / 2 + r * (sh + gap);
      frame.box("impGloss", cu, cv, n + 0.012, sw + bezel, sh + bezel, 0.024);
      const key = keys[Math.floor(rand() * keys.length)];
      frame.screen(key, cu, cv, n + 0.026, sw, sh);
    }
  }
  return { W, H };
}

/**
 * Power distribution / breaker board on a wall frame: cabinet, rows of lever switches (some thrown),
 * indicator lamps per lever, meter dials, a bus-bar cover and a stencil. u = centre, v0 = bottom.
 */
export function breakerBoard(frame, u, v0, w, h, opts = {}) {
  const { seed = 5, accentKey = "emitAmber", rows = 3 } = opts;
  const rand = rng(seed);
  const vc = v0 + h / 2;
  frame.box("impTrim", u, vc, 0.15, w, h, 0.3, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u, vc, 0.305, w - 0.1, h - 0.1, 0.01, { color: PALETTE.impCharcoal, texel: 1.5 });
  // top: meter dials
  const nM = Math.max(2, Math.floor((w - 0.4) / 0.55));
  for (let k = 0; k < nM; k++) {
    const mu = u - w / 2 + 0.3 + ((w - 0.6) * k) / Math.max(1, nM - 1);
    const p = frame.pos(mu, v0 + h - 0.32, 0.33);
    const facing = frame.N.x > 0.5 ? "+x" : frame.N.x < -0.5 ? "-x" : frame.N.z > 0.5 ? "+z" : "-z";
    gauge(frame.kit, [p.x, p.y, p.z], facing, 0.11, { seed: seed + k, warn: rand() < 0.25 });
  }
  // lever rows
  const rowH = (h - 0.9) / rows;
  const nL = Math.max(3, Math.floor((w - 0.3) / 0.22));
  for (let r = 0; r < rows; r++) {
    const rv = v0 + 0.25 + rowH * r + rowH / 2;
    frame.box("impTrim", u, rv, 0.31, w - 0.2, rowH - 0.08, 0.02, { color: PALETTE.impBlack });
    frame.box("impMetal", u, rv - rowH / 2 + 0.06, 0.32, w - 0.3, 0.02, 0.01, { color: PALETTE.impGrey });
    for (let k = 0; k < nL; k++) {
      const lu = u - w / 2 + 0.15 + ((w - 0.3) * (k + 0.5)) / nL;
      const on = rand() < 0.78;
      // lever: black handle on a boss, tilted up (on) or down (off)
      frame.box("impMetal", lu, rv, 0.335, 0.1, 0.1, 0.03, { color: PALETTE.impGreyDark });
      frame.box("impTrim", lu, rv + (on ? 0.08 : -0.08), 0.37, 0.05, 0.16, 0.05, { color: PALETTE.impBlack, tilt: on ? -0.45 : 0.45 });
      frame.box(on ? accentKey : "emitRedImp", lu, rv + rowH / 2 - 0.12, 0.325, 0.05, 0.035, 0.01);
      if (rand() < 0.3) frame.box("impGloss", lu, rv - rowH / 2 + 0.14, 0.325, 0.08, 0.04, 0.01);
    }
  }
  // bus-bar cover with hazard decal, kick vent
  frame.box("impTrim", u, v0 + 0.12, 0.31, w - 0.2, 0.16, 0.02, { color: PALETTE.impCharcoal });
  for (let k = 0; k < 6; k++) frame.box("impMetal", u, v0 + 0.06 + k * 0.025, 0.325, w - 0.4, 0.008, 0.01, { color: PALETTE.impGreyDark });
  frame.decal(IMP_DECAL.hazard, u - w / 2 + 0.35, v0 + h - 0.12, 0.31, 0.2);
  frame.decal(IMP_DECAL.power, u + w / 2 - 0.35, v0 + h - 0.12, 0.31, 0.2);
  frame.collider(u - w / 2, u + w / 2, v0, v0 + h, 0, 0.4, "breakers");
}

/** Sagging cable between points (CatmullRom tube), cheap segment counts. */
export function cable(kit, points, r = 0.025, opts = {}) {
  const { mat = "impMetal", color = PALETTE.impBlack, segs = 12, radial = 6 } = opts;
  const curve = new THREE.CatmullRomCurve3(points.map(v3));
  const g = new THREE.TubeGeometry(curve, segs, r, radial, false);
  return kit.add(mat, g, { color, uv: "scale", uvScale: [1, 4] });
}

/** Equipment rack / cabinet: black shell, front face with instrument rows, vents and a stencil. facing '+x'|'-x'|'+z'|'-z'. */
export function equipmentRack(kit, x, z, w, h, d, facing, opts = {}) {
  const { seed = 1, accentKey = "emitAmber", screens = true } = opts;
  const rand = rng(seed);
  const n = facing === "+x" ? [1, 0, 0] : facing === "-x" ? [-1, 0, 0] : facing === "-z" ? [0, 0, -1] : [0, 0, 1];
  const along = n[0] ? [0, 0, 1] : [1, 0, 0];
  kit.box("impTrim", x, h / 2, z, n[0] ? d : w, h, n[0] ? w : d, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, 0.08, z, (n[0] ? d : w) + 0.06, 0.16, (n[0] ? w : d) + 0.06, { color: PALETTE.impCharcoal, texel: 1 });
  const fx = x + n[0] * (d / 2 + 0.006);
  const fz = z + n[2] * (d / 2 + 0.006);
  kit.box("impMetal", fx, h / 2, fz, n[0] ? 0.012 : w - 0.12, h - 0.3, n[2] ? 0.012 : w - 0.12, { color: PALETTE.impCharcoal, texel: 1.5 });
  const rowsN = Math.max(3, Math.floor((h - 0.5) / 0.4));
  for (let r = 0; r < rowsN; r++) {
    const yy = 0.35 + ((h - 0.7) * (r + 0.5)) / rowsN;
    const kind = rand();
    const ffx = fx + n[0] * 0.02;
    const ffz = fz + n[2] * 0.02;
    if (kind < 0.35) {
      // LED row
      const cnt = 4 + Math.floor(rand() * 6);
      for (let k = 0; k < cnt; k++) {
        const o = -w / 2 + 0.2 + ((w - 0.4) * k) / Math.max(1, cnt - 1);
        kit.box([accentKey, "emitWhite", "emitRedImp", accentKey, "emitGreen"][Math.floor(rand() * 5)], ffx + along[0] * o, yy, ffz + along[2] * o, n[0] ? 0.01 : 0.04, 0.04, n[2] ? 0.01 : 0.04);
      }
    } else if (kind < 0.6 && screens) {
      const g = new THREE.PlaneGeometry(Math.min(0.6, w - 0.3), 0.22);
      const rot = n[0] > 0 ? [0, Math.PI / 2, 0] : n[0] < 0 ? [0, -Math.PI / 2, 0] : n[2] < 0 ? [0, Math.PI, 0] : [0, 0, 0];
      kit.add(["scrAmber0", "scrAmber1", "scrBlue0", "scrGreen1"][Math.floor(rand() * 4)], g, { pos: [ffx, yy, ffz], rot, uv: "keep" });
    } else if (kind < 0.8) {
      // vent slots
      for (let k = 0; k < 5; k++) kit.box("impMetal", ffx, yy - 0.1 + k * 0.05, ffz, n[0] ? 0.02 : w - 0.3, 0.012, n[2] ? 0.02 : w - 0.3, { color: PALETTE.impGreyDark });
    } else {
      // handles / drawer fronts
      kit.box("impGloss", ffx, yy, ffz, n[0] ? 0.02 : w - 0.3, 0.2, n[2] ? 0.02 : w - 0.3);
      kit.box("impMetal", ffx + n[0] * 0.03, yy, ffz + n[2] * 0.03, n[0] ? 0.03 : 0.25, 0.03, n[2] ? 0.03 : 0.25, { color: PALETTE.impGrey });
    }
  }
  decalImp(kit, [IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][Math.floor(rand() * 3)], [fx + n[0] * 0.03, h - 0.2, fz + n[2] * 0.03], facing, 0.22);
  kit.collider([x - (n[0] ? d : w) / 2, 0, z - (n[0] ? w : d) / 2], [x + (n[0] ? d : w) / 2, h, z + (n[0] ? w : d) / 2], "rack");
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------
/**
 * Pulsing emissive rings: one InstancedMesh (torus) whose per-instance colours are animated in a
 * travelling wave. rings: [{ pos:[x,y,z], axis:'x'|'y'|'z', R, tube, phase }]. Colours are base ×
 * intensity × pulse. Allocation-free update (shared Color scratch).
 */
export function pulseRings(kit, rings, opts = {}) {
  ensureDeckDMaterials(kit);
  const { color = PALETTE.impBlue, intensity = 2.6, speed = 2.2, floor = 0.25, segments = [10, 48] } = opts;
  const R0 = rings[0].R;
  const t0 = rings[0].tube;
  const geo = new THREE.TorusGeometry(R0, t0, segments[0], segments[1]);
  const im = new THREE.InstancedMesh(geo, kit.materials.roomsd_pulse, rings.length);
  im.name = "roomsd_pulseRings";
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const base = new THREE.Color(color);
  const tmp = new THREE.Color();
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const k = r.R / R0;
    const kt = (r.tube || t0) / t0;
    // torus lies in the XY plane (axis = z); rotate to the requested axis
    if (r.axis === "x") q.setFromAxisAngle(UP, Math.PI / 2);
    else if (r.axis === "y") q.setFromAxisAngle(X_AXIS, Math.PI / 2);
    else q.identity();
    // uniform scale on R; tube scales with it (fine for near-equal rings)
    s.set(k, k, kt);
    p.set(r.pos[0], r.pos[1], r.pos[2]);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);
    im.setColorAt(i, tmp.copy(base).multiplyScalar(intensity));
  }
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  im.frustumCulled = false;
  kit.attach(im);
  const phases = rings.map((r) => r.phase || 0);
  kit.onUpdate((dt, t) => {
    for (let i = 0; i < phases.length; i++) {
      const w = 0.5 + 0.5 * Math.sin(t * speed - phases[i]);
      const k = floor + (1 - floor) * w * w;
      tmp.copy(base).multiplyScalar(intensity * k);
      im.setColorAt(i, tmp);
    }
    im.instanceColor.needsUpdate = true;
  });
  return im;
}

/**
 * Build an animated assembly with a private Kit: fn(sub) adds primitives in the assembly's local
 * frame; the merged meshes are parented to a Group placed at `pos`, attached to the room. Returns the
 * group (animate its transform in kit.onUpdate). Sub-kit colliders / floors are copied to the room
 * kit at the group's initial position when `colliders` is true.
 */
export function assembly(kit, pos, fn, opts = {}) {
  const sub = new Kit(kit.materials);
  fn(sub);
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1], pos[2]);
  if (opts.rot) group.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  sub.build(group, { castShadow: opts.castShadow !== false, receiveShadow: true });
  if (opts.colliders) for (const c of sub.colliders) kit.collider([c.min.x + pos[0], c.min.y + pos[1], c.min.z + pos[2]], [c.max.x + pos[0], c.max.y + pos[1], c.max.z + pos[2]], c.tag);
  kit.attach(group);
  return group;
}

/**
 * Field of blinking lamps as ONE InstancedMesh (roomsd_pulse, per-instance colour toggled between the
 * lit colour and near-black). specs: [{ pos:[x,y,z], size:[sx,sy,sz]?, color, period, duty, phase }].
 * Allocation-free update; use this instead of blinkers() when there are more than a handful.
 */
export function blinkerField(kit, specs, opts = {}) {
  ensureDeckDMaterials(kit);
  const { intensity = 2.6, size = [0.14, 0.14, 0.14] } = opts;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const im = new THREE.InstancedMesh(geo, kit.materials.roomsd_pulse, specs.length);
  im.name = "roomsd_blinkers";
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const tmp = new THREE.Color();
  const lit = specs.map((sp) => new THREE.Color(sp.color || 0xff3b2e).multiplyScalar(intensity));
  const dark = new THREE.Color(0x0a0a0c);
  for (let i = 0; i < specs.length; i++) {
    const sp = specs[i];
    const sz = sp.size || size;
    if (sp.rot) q.setFromEuler(new THREE.Euler(sp.rot[0], sp.rot[1], sp.rot[2]));
    else q.identity();
    m.compose(p.set(sp.pos[0], sp.pos[1], sp.pos[2]), q, s.set(sz[0], sz[1], sz[2]));
    im.setMatrixAt(i, m);
    im.setColorAt(i, lit[i]);
  }
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  im.frustumCulled = false;
  kit.attach(im);
  const periods = specs.map((sp) => sp.period || 1.2);
  const duties = specs.map((sp) => sp.duty || 0.5);
  const phases = specs.map((sp) => sp.phase || 0);
  kit.onUpdate((dt, t) => {
    for (let i = 0; i < periods.length; i++) {
      const f = ((t + phases[i]) / periods[i]) % 1;
      im.setColorAt(i, f < duties[i] ? lit[i] : tmp.copy(dark));
    }
    im.instanceColor.needsUpdate = true;
  });
  return im;
}

/**
 * Geometry for kit.instance() under a kit material: those materials tint via vertex colours, and an
 * InstancedMesh geometry without a `color` attribute samples the WebGL default (black), so give it
 * white vertex colours and let the per-instance colour do the tinting.
 */
export function instGeo(geo) {
  setVertexColor(geo, 0xffffff);
  return geo;
}

/** Recessed ceiling fixture (dark housing + emissive plate) at ceiling height h, to sit over a coloured point light. */
export function ceilingLamp(kit, x, z, h, key, size = 0.5) {
  kit.box("impTrim", x, h - 0.09, z, size + 0.1, 0.18, size + 0.1, { color: PALETTE.impBlack, texel: 1 });
  kit.box(key, x, h - 0.19, z, size, 0.02, size);
}

/** Pendant work lamp: rod from the ceiling (h) down to a conical shade with an emissive underside; the point light goes at (x, y, z). */
export function pendantLamp(kit, x, y, z, h, key) {
  const top = y + 0.45;
  kit.cyl("impMetal", x, (h + top) / 2, z, 0.02, h - top, "y", { color: PALETTE.impGreyDark, segments: 8 });
  kit.cyl("impTrim", x, y + 0.33, z, 0.42, 0.24, "y", { r2: 0.14, color: PALETTE.impBlack, segments: 20 });
  kit.cyl(key, x, y + 0.2, z, 0.36, 0.02, "y", { segments: 20 });
}

/** Flat annulus (r0..r1) at height y. faceDown flips it (undersides seen from below). World UVs. */
export function ringDeck(kit, mat, r0, r1, y, opts = {}) {
  const { segments = 64, color = 0xffffff, texel = 0.5, faceDown = false, thetaStart = 0, thetaLength = Math.PI * 2 } = opts;
  const g = new THREE.RingGeometry(r0, r1, segments, 1, thetaStart, thetaLength);
  g.rotateX(faceDown ? Math.PI / 2 : -Math.PI / 2);
  return kit.add(mat, g, { pos: [0, y, 0], color, uv: "world", texel });
}

/**
 * Circular railing at radius r (centre 0,0) on a deck at height y: posts at every chord joint, two
 * rails as chord tubes, optional lit strip in the top rail, a thin collider per chord. gaps: list of
 * [theta0, theta1] (radians, atan2(z, x) convention) to leave open.
 */
export function ringRail(kit, r, y, opts = {}) {
  const { segments = 48, gaps = [], h = 1.05, light = null, color = PALETTE.impGreyDark, postColor = PALETTE.impBlack, kick = null } = opts;
  const norm = (a) => {
    let t = a;
    while (t <= -Math.PI) t += Math.PI * 2;
    while (t > Math.PI) t -= Math.PI * 2;
    return t;
  };
  const inGap = (a) => gaps.some(([g0, g1]) => {
    const t = norm(a);
    const a0 = norm(g0);
    const a1 = norm(g1);
    return a0 <= a1 ? t > a0 && t < a1 : t > a0 || t < a1;
  });
  const step = (Math.PI * 2) / segments;
  const q = new THREE.Quaternion();
  for (let i = 0; i < segments; i++) {
    const a0 = i * step;
    const a1 = (i + 1) * step;
    const mid = (a0 + a1) / 2;
    const open = inGap(mid);
    // post at a0 unless both adjacent chords are open
    const prevOpen = inGap(mid - step);
    if (!(open && prevOpen)) {
      q.setFromAxisAngle(UP, -a0);
      kit.add("impTrim", new THREE.BoxGeometry(0.06, h, 0.06), { pos: [Math.cos(a0) * r, y + h / 2, Math.sin(a0) * r], quat: q, color: postColor });
      kit.add("impTrim", new THREE.BoxGeometry(0.16, 0.06, 0.16), { pos: [Math.cos(a0) * r, y + 0.03, Math.sin(a0) * r], quat: q, color: postColor });
    }
    if (open) continue;
    const ax = Math.cos(a0) * r;
    const az = Math.sin(a0) * r;
    const bx = Math.cos(a1) * r;
    const bz = Math.sin(a1) * r;
    pipe(kit, [ax, y + h, az], [bx, y + h, bz], 0.03, { color, segments: 8 });
    pipe(kit, [ax, y + h * 0.55, az], [bx, y + h * 0.55, bz], 0.02, { color, segments: 8 });
    if (light) {
      const L = Math.hypot(bx - ax, bz - az) - 0.12;
      const yaw = Math.atan2(bx - ax, bz - az);
      kit.add(light, new THREE.BoxGeometry(0.03, 0.03, L), { pos: [(ax + bx) / 2, y + h - 0.06, (az + bz) / 2], rot: [0, yaw, 0] });
    }
    if (kick) {
      const L = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      kit.add(kick, new THREE.BoxGeometry(0.02, 0.12, L), { pos: [(ax + bx) / 2, y + 0.08, (az + bz) / 2], rot: [0, yaw, 0], texel: 2 });
    }
    kit.collider([Math.min(ax, bx) - 0.06, y, Math.min(az, bz) - 0.06], [Math.max(ax, bx) + 0.06, y + h, Math.max(az, bz) + 0.06], "rail");
  }
}

/** Blinking set of emissive boxes: toggles `visible` on attached meshes at staggered periods. */
export function blinkers(kit, specs, opts = {}) {
  // specs: [{ pos, size:[sx,sy,sz], key, period, duty, phase }]
  const meshes = [];
  for (const sp of specs) {
    const mat = kit.materials[sp.key];
    const m = new THREE.Mesh(new THREE.BoxGeometry(sp.size[0], sp.size[1], sp.size[2]), mat);
    m.position.set(sp.pos[0], sp.pos[1], sp.pos[2]);
    if (sp.rot) m.rotation.set(sp.rot[0], sp.rot[1], sp.rot[2]);
    kit.attach(m);
    meshes.push({ m, period: sp.period || 1.2, duty: sp.duty || 0.5, phase: sp.phase || 0 });
  }
  kit.onUpdate((dt, t) => {
    for (let i = 0; i < meshes.length; i++) {
      const b = meshes[i];
      const f = ((t + b.phase) / b.period) % 1;
      b.m.visible = f < b.duty;
    }
  });
  return meshes;
}

// ---------------------------------------------------------------------------
// Shell without the default floor (rooms with trenches build their own deck)
// ---------------------------------------------------------------------------
export function shellNoFloor(kit, room, doors, opts = {}) {
  const [w, h, d] = room.size;
  const walls = roomWalls(kit, room);
  const seed = opts.seed || room.id.length * 131;
  const accentKey = opts.accentKey || "emitBlue";
  for (const side of ["N", "E", "S", "W"]) {
    const { frame, length } = walls[side];
    impWall(frame, length, opts.wallH || h, { openings: openingsFor(room, doors, side), seed: seed + side.charCodeAt(0), accentKey, tag: room.id + side, ...(opts.wall || {}), ...(opts.walls && opts.walls[side] ? opts.walls[side] : {}) });
  }
  if (opts.ceiling !== false) impCeiling(kit, -w / 2, -d / 2, w / 2, d / 2, h, { troughs: Math.max(1, Math.round(Math.min(w, d) / 6)), seed: seed + 3, accentKey, ...(opts.ceiling || {}) });
  return walls;
}

/** Wall frame u coordinate for a room-local x (N/S walls) or z (E/W walls). */
export function wallU(room, side, coord) {
  const [w, , d] = room.size;
  if (side === "N") return coord + w / 2;
  if (side === "S") return w / 2 - coord;
  if (side === "W") return d / 2 - coord;
  return coord + d / 2;
}

/** Overhead truss across the room (along x at z, or along z at x): chords + diagonal web + gussets. */
export function truss(kit, axis, at, from, to, y, opts = {}) {
  const { depth = 0.6, color = PALETTE.impBlack, step = 1.2 } = opts;
  const L = to - from;
  const mid = (from + to) / 2;
  const chord = (yy) => (axis === "x" ? kit.box("impTrim", mid, yy, at, L, 0.1, 0.24, { color, texel: 1 }) : kit.box("impTrim", at, yy, mid, 0.24, 0.1, L, { color, texel: 1 }));
  chord(y);
  chord(y - depth);
  const n = Math.max(1, Math.round(L / step));
  for (let i = 0; i <= n; i++) {
    const p = from + (L * i) / n;
    if (axis === "x") kit.box("impMetal", p, y - depth / 2, at, 0.06, depth - 0.1, 0.06, { color: PALETTE.impGreyDark });
    else kit.box("impMetal", at, y - depth / 2, p, 0.06, depth - 0.1, 0.06, { color: PALETTE.impGreyDark });
    if (i < n) {
      const pm = from + (L * (i + 0.5)) / n;
      const dl = Math.hypot(L / n, depth - 0.1);
      const ang = Math.atan2(depth - 0.1, L / n) * (i % 2 ? 1 : -1);
      if (axis === "x") kit.add("impMetal", new THREE.BoxGeometry(dl, 0.05, 0.05), { pos: [pm, y - depth / 2, at], rot: [0, 0, ang], color: PALETTE.impGreyDark });
      else kit.add("impMetal", new THREE.BoxGeometry(0.05, 0.05, dl), { pos: [at, y - depth / 2, pm], rot: [-ang, 0, 0], color: PALETTE.impGreyDark });
    }
  }
}
