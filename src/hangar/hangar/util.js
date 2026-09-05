// Small shared helpers for the hangar builders: oriented cylinders, atlas labels, rails, ladders.
import * as THREE from "three";
import { LABELS, cellRect } from "./materials.js";
import { RAIL_H, RAIL_MID, RAIL_KICK, HG, EM } from "./layout.js";
import { sharedTorus, Batcher, PX, NX, PY, NY, PZ, NZ, ALL } from "./batch.js";

// Every atlas decal (labels, wear streaks, baked-shadow gradients, contact blobs: ~800 quads a build)
// goes into one Batcher per kit and reaches the kit as one geometry per material + colour when the
// module's build() calls flushDecals(); 800 PlaneGeometry + kit.add round trips cost ~8 ms.
const _decals = new WeakMap();
function decals(kit) {
  let b = _decals.get(kit);
  if (!b) {
    b = new Batcher(kit);
    _decals.set(kit, b);
  }
  return b;
}
/**
 * Add the batched decals to the kit. The decal materials are transparent without depth writes, so
 * their draw order is buffer order: the black wear / shadow shapes go last, over the stencils they
 * darken (the order the builders drew them in).
 */
export function flushDecals(kit) {
  const b = _decals.get(kit);
  if (!b) return;
  b.flush((a, c) => (a.color === HG.shadow ? 1 : 0) - (c.color === HG.shadow ? 1 : 0));
  _decals.delete(kit);
}

/**
 * Housed lamp: a dark housing box with the emissive face set 1 cm proud of its open side and inset
 * 3 cm from its edges, so the emitter reads as a fixture with a body, never a bare glowing block.
 * `normal` is the open side ([0,-1,0] = downlight, [1,0,0] = shining toward +x ...); size = [w, h, d]
 * measured across, along the normal (housing depth) and the third axis.
 */
export function housedLamp(B, emitMat, center, normal, [w, depth, d], { housing = HG.gunmetal, lampColor = 0xffffff, inset = 0.03 } = {}) {
  const [nx, ny, nz] = normal;
  const ax = nx !== 0 ? 0 : ny !== 0 ? 1 : 2; // axis of the normal
  const size = [0, 0, 0];
  size[ax] = depth;
  const others = [0, 1, 2].filter((i) => i !== ax);
  size[others[0]] = w;
  size[others[1]] = d;
  const sign = nx + ny + nz;
  const c = [...center];
  // housing sits behind the face; the face is a thin slab flush-plus-1 cm with the open side
  c[ax] = center[ax] - sign * depth * 0.5;
  B.box("paintedMetal", housing, c[0], c[1], c[2], size[0], size[1], size[2]);
  const fs = [...size];
  fs[ax] = 0.03;
  fs[others[0]] = Math.max(0.04, w - 2 * inset);
  fs[others[1]] = Math.max(0.04, d - 2 * inset);
  const fc = [...center];
  fc[ax] = center[ax] - sign * 0.005;
  B.box(emitMat, lampColor, fc[0], fc[1], fc[2], fs[0], fs[1], fs[2]);
}

/**
 * Segmented lit channel: the housed form of every long lit strip (tier fascias, waist strips, gallery
 * edges, crane rails, shaft lining). A dark channel body open toward `normal` with a black interior, the
 * lens on the vertex-level emitter (`level`, an EM colour) recessed inside it, split into `seg`-metre
 * segments by mid-grey cross ribs, and a mid-grey end cap proud of the body at both ends - so from any
 * distance it reads as a fixture with a body, joints and ends, never as one bare bar. `from`/`to` are
 * world points on the centre line of the open face (axis-aligned run); w = width across the face, depth
 * = body depth behind it; `off` = fraction of segments dead (dark lens, housing kept), picked
 * deterministically from `seed`. `body` / `cap` swap the housing's material + colour (the roof channels
 * and the crane sit where no light reaches, so their housings are on the vertex emitter at a faint
 * level and read as grey bodies against the dark ceiling instead of vanishing into it); `trough: false`
 * skips the trough (lens, joints and caps only: for strips that already sit in a channel cut into their
 * host, like the panel waist strips); `dim` scales the lens level (per-bay dimming).
 */
export function litChannel(B, P, from, to, normal, { w = 0.4, depth = 0.25, lensW = null, level = EM.channel, seg = 4, gap = 0.25, cap = 0.3, off = 0, seed = 1, body = null, capStyle = null, trough = true, dim = 1 } = {}) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const L = Math.hypot(d[0], d[1], d[2]);
  if (L < 0.5) return;
  const ax = [0, 1, 2].reduce((b, i) => (Math.abs(d[i]) > Math.abs(d[b]) ? i : b), 0);
  const nx = normal[0] !== 0 ? 0 : normal[1] !== 0 ? 1 : 2;
  const tx = [0, 1, 2].find((i) => i !== ax && i !== nx);
  const sign = normal[nx] > 0 ? 1 : -1;
  const dir = d[ax] > 0 ? 1 : -1;
  const lw = lensW ?? Math.max(0.06, w * 0.55);
  const bodyMat = body ? body.mat : "paintedMetal", bodyColor = body ? body.color : P.impDark;
  const capMat = capStyle ? capStyle.mat : "paintedMetal", capColor = capStyle ? capStyle.color : P.impMid;
  const lens = dim === 1 ? level : level.clone().multiplyScalar(dim);
  // face bits: the open face (toward the normal) and the face buried against the host behind it
  const openBit = nx === 0 ? (sign > 0 ? PX : NX) : nx === 1 ? (sign > 0 ? PY : NY) : sign > 0 ? PZ : NZ;
  const backBit = nx === 0 ? (sign > 0 ? NX : PX) : nx === 1 ? (sign > 0 ? NY : PY) : sign > 0 ? NZ : PZ;
  const front = { faces: openBit }, noBack = { faces: ALL & ~backBit };
  // box helper in channel coordinates: centre along the run (metres from `from`), offset behind the
  // face (metres, positive = into the body), size along / across / deep
  const box = (mat, color, along, back, sAlong, sAcross, sDeep, opts) => {
    const c = [...from];
    c[ax] = from[ax] + dir * along;
    c[nx] = from[nx] - sign * back;
    const s = [0, 0, 0];
    s[ax] = sAlong;
    s[tx] = sAcross;
    s[nx] = sDeep;
    B.box(mat, color, c[0], c[1], c[2], s[0], s[1], s[2], opts);
  };
  const backT = depth * 0.3;
  if (trough) {
    // trough: two cheeks along the run and a black interior plate (the plate is the back: nothing
    // behind it is ever seen, so only its open face is emitted; the cheeks lose their buried face)
    for (const s of [-1, 1]) {
      const c = [...from];
      c[ax] = from[ax] + dir * (L / 2);
      c[nx] = from[nx] - sign * (depth / 2);
      c[tx] = from[tx] + s * (w / 2 - 0.03);
      const sz = [0, 0, 0];
      sz[ax] = L;
      sz[tx] = 0.06;
      sz[nx] = depth;
      B.box(bodyMat, bodyColor, c[0], c[1], c[2], sz[0], sz[1], sz[2], noBack);
    }
    box("paintedMetal", P.impBlack, L / 2, depth - backT - 0.005, L - 2 * cap, w - 0.12, 0.01, front);
  }
  for (const e of [cap / 2, L - cap / 2]) box(capMat, capColor, e, depth / 2 - 0.01, cap, w + 0.06, depth + 0.04, noBack);
  const Li = L - 2 * cap;
  const n = Math.max(1, Math.round(Li / seg));
  const slot = Li / n;
  for (let i = 0; i < n; i++) {
    const c = cap + slot * (i + 0.5);
    const dead = off > 0 && ((i * 7 + seed * 13) % 17) / 17 < off;
    // the lens is a 1 cm plate inside the trough: its open face is the only one that shows
    box("hgEmit", dead ? EM.off : lens, c, depth * 0.45, Math.max(0.1, slot - gap), lw, 0.01, front);
    if (i > 0) box(capMat, capColor, cap + slot * i, depth / 2 - 0.005, gap * 0.8, w - 0.04, depth + 0.01, noBack);
  }
}

/**
 * Black/yellow hazard marking as alternating painted blocks (no texture): the box [min, max] is split
 * along `axis` ("x" | "z" | "y") into `block`-long yellow and black pieces, starting with yellow.
 * Emits only the faces given (default all), like Batch.box.
 */
export function hazardBlocks(B, min, max, axis = "x", { block = 0.3, faces, texel } = {}) {
  const ai = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const L = max[ai] - min[ai];
  const n = Math.max(1, Math.round(L / block));
  const step = L / n;
  const opts = faces !== undefined || texel !== undefined ? { faces, texel } : undefined;
  for (let i = 0; i < n; i++) {
    const a = [...min], b = [...max];
    a[ai] = min[ai] + i * step;
    b[ai] = min[ai] + (i + 1) * step;
    if (i % 2 === 0) B.boxMM("painted", HG.yellow, a, b, opts);
    else B.boxMM("paintedMetal", HG.black, a, b, opts);
  }
}

/** Red beacon: dark housing, pulsing red lens on the open side, a steel guard bar across the lens. */
export function redBeacon(B, center, normal, w = 0.34) {
  const depth = 0.22;
  housedLamp(B, "hgPulse", center, normal, [w, depth, w * 0.75], { housing: HG.gunmetal, inset: 0.05 });
  const [nx, ny, nz] = normal;
  const ax = nx !== 0 ? 0 : ny !== 0 ? 1 : 2;
  const sign = nx + ny + nz;
  const gc = [...center];
  gc[ax] = center[ax] + sign * 0.03;
  const gs = [0.05, 0.05, 0.05];
  const across = ax === 0 ? 2 : 0; // guard bar runs across the lens
  gs[across] = w + 0.04;
  B.box("metal", HG.steel, gc[0], gc[1], gc[2], gs[0], gs[1], gs[2]);
}

// half-torus cage hoop orientations: bulging toward +/-x (x-plane walls) or +/-z (z-plane walls)
const HOOP_Q = {
  x: { 1: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2)), "-1": new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2)) },
  z: { 1: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), "-1": new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) },
};

const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();

/** Quaternion rotating +Y onto the direction from a to b. */
export function quatAlong(a, b) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  return new THREE.Quaternion().setFromUnitVectors(_up, _d);
}

/** Cylinder between two world points (kit.add, so it merges per material). */
export function tube(kit, mat, a, b, r, opts = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(opts.r2 ?? r, r, len, opts.segments || 12, 1, !!opts.open);
  const { r2, segments, open, ...rest } = opts;
  return kit.add(mat, g, {
    pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    quat: quatAlong(a, b),
    uv: "scale",
    uvScale: [2 * Math.PI * r, len],
    ...rest,
  });
}

/** base orientation of a decal quad facing `normal` (flat ones keep their top toward -Z) */
function decalQuat(normal) {
  if (normal[1] > 0.5) return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize());
}

/**
 * Text label quad from the atlas. `normal` is the facing direction ([0,1,0] lays it flat, with the
 * text top toward -Z; `spin` rotates it about the normal). width in metres; height from the aspect
 * unless `height` is given (stretched alpha shapes: streaks, gradients).
 */
export function label(kit, mat, name, center, normal, width, { color = 0xffffff, spin = 0, height = null } = {}) {
  const L = LABELS[name];
  if (!L) throw new Error("hangar atlas: no label " + name);
  const h = height ?? width / L.aspect;
  const q = decalQuat(normal);
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  decals(kit).quad(mat, color, center, q, width, h, L.rect);
}

const _ex = new THREE.Vector3(), _ey = new THREE.Vector3(), _dir = new THREE.Vector3();
/**
 * Baked-shadow gradient (atlas GRAD: opaque at its u = 0 edge, gone at u = 1) on a surface facing
 * `normal`: `len` metres of falloff along `dir` (world direction from the occluder out into the light,
 * in the surface plane), `span` metres across it. Black by default; `tone` is the vertex colour (a dark
 * grey for a lighter shadow).
 */
export function shadowGrad(kit, center, normal, dir, len, span, { tone = HG.shadow, mat = "hgDecal", alpha = 1 } = {}) {
  const q = decalQuat(normal);
  _ex.set(1, 0, 0).applyQuaternion(q);
  _ey.set(0, 1, 0).applyQuaternion(q);
  _dir.set(dir[0], dir[1], dir[2]).normalize();
  // spin about the normal so the quad's local +x (the fade direction) points along dir
  const spin = Math.atan2(_dir.dot(_ey), _dir.dot(_ex));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  // the padded interior only: with the cell's transparent margin mapped, every strip ends 3 % short;
  // `alpha` < 1 starts the strip part-way down the falloff (a lighter occlusion flank)
  decals(kit).quad(mat, tone, center, q, len, span, cellRect("GRAD", falloffStart(alpha), 0, 1, 1));
}
/** cell fraction where the shared FALLOFF has dropped to `alpha` (bisection on the smoothstep) */
function falloffStart(alpha) {
  if (alpha >= 1) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const t = (lo + hi) / 2;
    if (1 - t * t * (3 - 2 * t) > alpha) lo = t;
    else hi = t;
  }
  return (lo + hi) / 2;
}

const FLAT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
/**
 * Occlusion pool on the deck (a +y surface) under a `w` x `d` footprint centred on `center`: the
 * footprint plus a 10 cm contact margin is near-black (the opaque centre of the SQSHADOW cell), then
 * the pool falls to nothing over `ramp` metres on every side (GRAD strips along the four sides,
 * SQSHADOW corners for the product of the two ramps). Composed from cells so the falloff length is
 * the same 0.3 .. 0.9 m under a drum and under a bowser instead of scaling with the footprint.
 */
export function occlusionPool(kit, center, w, d, ramp, { tone = HG.shadow, mat = "hgDecal" } = {}) {
  const [x, y, z] = center;
  const cw = w + 0.2, cd = d + 0.2;
  const b = decals(kit);
  b.quad(mat, tone, center, FLAT_Q, cw, cd, cellRect("SQSHADOW", 0.3, 0.3, 0.7, 0.7));
  for (const s of [-1, 1]) {
    shadowGrad(kit, [x + s * (cw + ramp) / 2, y, z], [0, 1, 0], [s, 0, 0], ramp, cd, { tone, mat });
    shadowGrad(kit, [x, y, z + s * (cd + ramp) / 2], [0, 1, 0], [0, 0, s], ramp, cw, { tone, mat });
  }
  // corners: the flat quad's local +x is world +x and its local +y is world -z, so the cell corner is
  // picked per quadrant (the tile is symmetric: either end of a ramp is its fade)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const fu = sx > 0 ? [0.85, 1] : [0, 0.15];
    const fv = sz > 0 ? [0, 0.15] : [0.85, 1];
    b.quad(mat, tone, [x + sx * (cw + ramp) / 2, y, z + sz * (cd + ramp) / 2], FLAT_Q, ramp, ramp, cellRect("SQSHADOW", fu[0], fv[0], fu[1], fv[1]));
  }
}

/**
 * Worn-paint streak (atlas STREAK: strongest at its u = 0 end, 20 % at the far end, a bell across) from
 * point `from` running along `dir` for `len` metres, `width` metres wide, on the deck (normal +y) or a
 * wall. Tyre tracks along the lanes, drag marks at the doors, skids on the pads.
 */
export function wearStreak(kit, from, normal, dir, len, width, { tone = HG.shadow } = {}) {
  const L = LABELS.STREAK;
  const q = decalQuat(normal);
  _ex.set(1, 0, 0).applyQuaternion(q);
  _ey.set(0, 1, 0).applyQuaternion(q);
  _dir.set(dir[0], dir[1], dir[2]).normalize();
  const spin = Math.atan2(_dir.dot(_ey), _dir.dot(_ex));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spin));
  const center = [from[0] + _dir.x * len / 2, from[1] + _dir.y * len / 2, from[2] + _dir.z * len / 2];
  decals(kit).quad("hgDecal", tone, center, q, len, width, L.rect);
}

/**
 * Safety rail from [x,z] to [x,z] at floor y0: dark posts every <= 2.5 m, a round light-grey handrail
 * (3 cm radius) at 1.02 m, a dark mid rail at 0.55 m and a 0.15 m kick plate, plus a 1.02 m tall blocking
 * collider along it. `lit` adds a light strip under the handrail - on the vertex-level emitter at the
 * housed strip level, in one piece per post bay so it reads as a jointed fixture under the rail and never
 * as one bare bar the length of the run (`bare` keeps the old full-brightness one-piece strip) - and
 * (unless `caps` is false) a lit cap lens on every post, so the rail still reads at night and from 70 m;
 * `soft` puts the caps on the vertex emitter too (a rail 1.5 m from the eye must not smear); `level` is
 * the vertex-emitter level of the strips and soft caps (EM.strip unless a run needs less: the aperture
 * rails face the spawn 66 m out and are mirrored by the lane).
 */
export function railRun(B, kit, from, to, y0, { tag = "rail", collide = true, kick = true, foot = true, lit = false, caps = true, soft = false, bare = false, level = EM.strip, postEvery = 2.5, postW = 0.07, colors = {} } = {}) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.2) return;
  const ux = dx / L, uz = dz / L;
  const alongX = Math.abs(ux) > Math.abs(uz);
  const post = colors.post || HG.gunmetal;
  const rail = colors.rail || HG.steel;
  const n = Math.max(1, Math.ceil(L / postEvery));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = from[0] + dx * t, z = from[1] + dz * t;
    B.box("paintedMetal", post, x, y0 + RAIL_H / 2 - 0.02, z, postW, RAIL_H - 0.04, postW);
    // foot plate (skipped on rails nobody gets near, e.g. the catwalk ring 36 m up)
    if (foot) B.box("paintedMetal", post, x, y0 + 0.015, z, Math.max(0.22, postW * 2), 0.03, Math.max(0.22, postW * 2));
    if (lit && caps) B.box(soft ? "hgEmit" : "emitWhite", soft ? level : 0xffffff, x, y0 + RAIL_H + 0.015, z, Math.max(0.05, postW * 0.7), 0.03, Math.max(0.05, postW * 0.7));
  }
  const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2;
  const sx = alongX ? L : 0.05, sz = alongX ? 0.05 : L;
  // round handrail (a tube, not a box beam), painted light grey: bare metal 1 m from a point light drew
  // a specular streak the length of the rail
  B.tube("paintedMetal", rail, [from[0] - ux * 0.045, y0 + RAIL_H - 0.03, from[1] - uz * 0.045], [to[0] + ux * 0.045, y0 + RAIL_H - 0.03, to[1] + uz * 0.045], 0.03, 10);
  if (lit && bare) B.box("emitWhite", 0xffffff, cx, y0 + RAIL_H - 0.068, cz, alongX ? L - 0.1 : 0.03, 0.01, alongX ? 0.03 : L - 0.1);
  else if (lit) {
    // one 1 cm strip per post bay, stopping 6 cm short of each post (its top is against the handrail)
    const bay = L / n, gap = postW / 2 + 0.06;
    for (let i = 0; i < n; i++) {
      const a = i * bay + gap, b = (i + 1) * bay - gap;
      if (b - a < 0.15) continue;
      const m = (a + b) / 2, len = b - a;
      B.box("hgEmit", level, from[0] + ux * m, y0 + RAIL_H - 0.068, from[1] + uz * m, alongX ? len : 0.03, 0.01, alongX ? 0.03 : len, { faces: ALL & ~PY });
    }
  }
  B.box("paintedMetal", post, cx, y0 + RAIL_MID, cz, sx, 0.05, sz);
  if (kick) B.box("paintedMetal", colors.kick || post, cx, y0 + 0.02 + RAIL_KICK / 2, cz, alongX ? L : 0.03, RAIL_KICK, alongX ? 0.03 : L);
  if (collide) {
    const hw = 0.06;
    kit.collider(
      [Math.min(from[0], to[0]) - hw, y0, Math.min(from[1], to[1]) - hw],
      [Math.max(from[0], to[0]) + hw, y0 + RAIL_H, Math.max(from[1], to[1]) + hw],
      tag,
    );
  }
}

/**
 * Vertical ladder against a wall from y0 to y1. plane "x": wall at x = `wall`, ladder at z = `along`;
 * plane "z": wall at z = `wall`, ladder at x = `along`. `n` = wall normal sign along the plane axis.
 * Cage hoops (every 3 m from 2.4 m up) optional.
 */
export function ladder(B, kit, wall, along, y0, y1, n, { cage = true, collide = true, plane = "x" } = {}) {
  const h = y1 - y0;
  const stileOff = 0.2; // ladder stands 0.2 m off the wall
  const lw = wall + n * stileOff;
  const P = plane === "x" ? (w, a) => [w, a] : (w, a) => [a, w];
  const box = (mat, color, w, y, a, sw, sy, sa, opts) => {
    const [x, z] = P(w, a);
    const [sx, sz] = P(sw, sa);
    B.box(mat, color, x, y, z, sx, sy, sz, opts);
  };
  for (const s of [-0.25, 0.25]) box("metal", HG.gunmetal, lw, (y0 + y1) / 2, along + s, 0.05, h, 0.05);
  // rungs: their ends are buried in the stiles (four faces each; 700 rungs a build)
  const rungFaces = { faces: plane === "x" ? ALL & ~PZ & ~NZ : ALL & ~PX & ~NX };
  const rungs = Math.floor(h / 0.3);
  for (let i = 1; i <= rungs; i++) box("metal", HG.steel, lw, y0 + i * 0.3, along, 0.03, 0.03, 0.5, rungFaces);
  // wall brackets every 2 m
  for (let y = y0 + 1; y < y1; y += 2) for (const s of [-0.25, 0.25]) box("metal", HG.gunmetal, wall + (n * stileOff) / 2, y, along + s, stileOff, 0.05, 0.05);
  if (cage && h > 3.5) {
    const hoop = sharedTorus(0.45, 0.025, 3, 8, Math.PI);
    const q = HOOP_Q[plane][n > 0 ? 1 : -1];
    for (let y = y0 + 2.4; y < y1 - 0.5; y += 3.0) {
      const [x, z] = P(lw + n * 0.15, along);
      B.geo("metal", HG.gunmetal, hoop, [x, y, z], q);
    }
    for (const s of [-0.42, 0.42]) box("metal", HG.gunmetal, lw + n * 0.35, (y0 + 2.4 + y1) / 2, along + s, 0.04, y1 - y0 - 2.4, 0.04);
  }
  if (collide) {
    const [a0, b0] = P(Math.min(wall, lw + n * 0.6), along - 0.5);
    const [a1, b1] = P(Math.max(wall, lw + n * 0.6), along + 0.5);
    kit.collider([Math.min(a0, a1), y0, Math.min(b0, b1)], [Math.max(a0, a1), y1, Math.max(b0, b1)], "ladder");
  }
}
