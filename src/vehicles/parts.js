import * as THREE from 'three';
import { bend, bolt, profile, rbox, transform, tube as geoTube } from '../lib/geo.js';
import { clamp, mulberry32, smoothstep } from '../textures/core.js';
import { LIN, grime, hash3, mix3 } from './kit.js';
import { DECALS, GROUND_DECAL, SIDEWALL_WRAPS } from './materials.js';

// ---------------------------------------------------------------------------
// The part library, lower half: primitives, running gear, chassis and lamps.
// Every builder takes a `VehicleKit` and works in vehicle space (+Z nose, +Y
// up, ground at 0). Bodies and bolt-on gear live in bodies.js and gear.js.
// ---------------------------------------------------------------------------

/** Detail level, set once by createFleet: `lite` drops the parts a low tier never resolves. */
export const DETAIL = { lite: false };

// --- primitives ------------------------------------------------------------

/** Chamfered box at one segment a side: 108 triangles, a crisp edge highlight. */
export const gbox = (w, h, d, r = 0.008) =>
  DETAIL.lite && r < 0.03 ? new THREE.BoxGeometry(...sized(w, h, d)) : rbox(...sized(w, h, d), Math.min(r, 0.45 * Math.min(Math.abs(w), Math.abs(h), Math.abs(d))), 1);
/** Plain box for things under 30 mm, where a chamfer is a texel. */
export const pbox = (w, h, d) => new THREE.BoxGeometry(...sized(w, h, d));
/** A box given a zero or negative size is a bug that renders as a folded sheet: shout, then clamp. */
function sized(w, h, d) {
  if (!(w > 0 && h > 0 && d > 0)) {
    DETAIL.badBoxes = (DETAIL.badBoxes || 0) + 1;
    if (DETAIL.badBoxes <= 8) console.warn(`[fleet] box with a non-positive size ${w.toFixed?.(3)} ${h.toFixed?.(3)} ${d.toFixed?.(3)}`, new Error().stack?.split('\n')[3]?.trim());
  }
  return [Math.max(0.004, w), Math.max(0.004, h), Math.max(0.004, d)];
}
export const cyl = (rt, rb, h, seg = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, DETAIL.lite ? Math.max(6, Math.round(seg * 0.6)) : seg, 1, open);
/** Cylinder with its axis along Z (a lamp, a drum on its side). */
export const cylZ = (rt, rb, h, seg = 16, open = false) => transform(cyl(rt, rb, h, seg, open), { rot: [Math.PI / 2, 0, 0] });
/** Cylinder with its axis along X (an axle, a roller). */
export const cylX = (rt, rb, h, seg = 16, open = false) => transform(cyl(rt, rb, h, seg, open), { rot: [0, 0, Math.PI / 2] });
export { bend, bolt, profile, transform };
/** Pipe through points; the low tier gets a hexagonal section. */
export const tube = (points, radius = 0.03, radial = 10, tension = 0.4) => geoTube(points, radius, DETAIL.lite ? Math.min(radial, 6) : radial, tension);

/** The same open sheet facing the other way: normals negated, winding reversed. */
export function insideOut(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const nrm = g.attributes.normal;
  for (let i = 0; i < nrm.array.length; i++) nrm.array[i] = -nrm.array[i];
  for (const attr of Object.values(g.attributes)) {
    const a = attr.array;
    const n = attr.itemSize;
    for (let i = 0; i + 2 < attr.count; i += 3) {
      for (let c = 0; c < n; c++) {
        const p = (i + 1) * n + c;
        const q = (i + 2) * n + c;
        const t = a[p];
        a[p] = a[q];
        a[q] = t;
      }
    }
  }
  return g;
}

/** Revolve a [radius, axial] profile about the X axis. */
export function lathe(points, segments = 32) {
  const g = new THREE.LatheGeometry(
    points.map((p) => new THREE.Vector2(p[0], p[1])),
    segments,
  );
  return transform(g, { rot: [0, 0, -Math.PI / 2] });
}

/**
 * A stamped side panel: absolute [z, y] outline in vehicle space extruded
 * across X, so wheel openings and sill steps are part of the outline.
 */
export function sidePanel(pts, thick = 0.05, bevel = 0.012, curveSegments = 3) {
  const g = profile(
    pts.map(([z, y]) => [-z, y]),
    thick,
    { bevel, curveSegments },
  );
  g.rotateY(Math.PI / 2);
  return g;
}

/** Arc of [z, y] points cut *into* a sill line for a wheel opening. */
export function archCut(cz, r, sillY, steps = 12) {
  const out = [];
  // the opening is a circle about (cz, r*0.98) clipped by the sill
  const cy = r * 0.98;
  const dy = sillY - cy;
  const half = Math.sqrt(Math.max(0, r * r - dy * dy));
  const aStart = Math.atan2(dy, half);
  const aEnd = Math.PI - aStart;
  for (let i = 0; i <= steps; i++) {
    const a = aStart + (aEnd - aStart) * (i / steps);
    out.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Flat pane with uvs 0..1, optional bow along its width, facing +Z. */
export function paneGeo(w, h, bow = 0, sw = 6) {
  const g = new THREE.PlaneGeometry(w, h, bow ? sw : 1, 1);
  if (bow) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w * 0.5);
      p.setZ(i, -bow * u * u + bow * 0.5);
    }
    g.computeVertexNormals();
  }
  return g;
}

/** A livery decal: a quad whose uvs are remapped onto one cell of the atlas. */
export function decal(k, name, { w, h, pos, rot = [0, 0, 0], tint = 0xffffff, bow = 0 }) {
  const rect = DECALS[name];
  if (!rect) return;
  const g = paneGeo(w, h, bow);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, rect[0] + (rect[2] - rect[0]) * uv.getX(i), rect[1] + (rect[3] - rect[1]) * uv.getY(i));
  }
  k.add('decal', g, { pos, rot, tint });
}

/** Deterministic jitter 0..1 for index i. */
export const jit = (i, s = 1) => hash3(i * 0.731, s * 1.37, i * s * 0.113);

// --- wheels ----------------------------------------------------------------

const RUBBER = LIN(0x262b34);
const TREAD_DUST = LIN(0x4a4438);
const SIDE_DUST = LIN(0x5a5348);

/** Star polygon for a row of tread lugs, as [x, y] about the origin. */
/**
 * A ring of tread lugs about the X axis: `n` blocks from radius rIn (buried in
 * the carcass) out to rOut, each `width` across the tyre. Built as open
 * prisms — no inner face, and no cap over the hub, which is what an extruded
 * star would give and what used to hide every rim behind a black disc.
 */
function lugRing(rOut, rIn, n, phase, fill = 0.54, width = 0.1) {
  const step = (Math.PI * 2) / n;
  const hx = width * 0.5;
  const pos = [];
  const nrm = [];
  const quad = (a, b, c, d, normal) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) nrm.push(...normal);
  };
  for (let i = 0; i < n; i++) {
    const j = (hash3(i, n, phase) - 0.5) * step * 0.08;
    const a0 = i * step + phase + j;
    const a1 = a0 + step * fill;
    const flare = step * 0.04;
    const P = (a, r, x) => [x, Math.cos(a) * r, Math.sin(a) * r];
    const o0 = [P(a0, rOut, -hx), P(a0, rOut, hx)];
    const o1 = [P(a1, rOut, -hx), P(a1, rOut, hx)];
    const i0 = [P(a0 - flare, rIn, -hx), P(a0 - flare, rIn, hx)];
    const i1 = [P(a1 + flare, rIn, -hx), P(a1 + flare, rIn, hx)];
    const am = (a0 + a1) * 0.5;
    const radial = [0, Math.cos(am), Math.sin(am)];
    quad(o0[0], o1[0], o1[1], o0[1], radial);
    quad(o1[0], i1[0], i1[1], o1[1], [0, -Math.sin(a1), Math.cos(a1)]);
    quad(i0[0], o0[0], o0[1], i0[1], [0, Math.sin(a0), -Math.cos(a0)]);
    quad(i0[1], o0[1], o1[1], i1[1], [1, 0, 0]);
    quad(o0[0], i0[0], i1[0], o1[0], [-1, 0, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  return g;
}

/**
 * One wheel prototype in wheel space: axle along X, outboard +X, hub at the
 * origin. Returns pieces to be placed with `addWheel`.
 *
 *   style: 'alloy' | 'steel' | 'truck' | 'moto' | 'quad'
 */
export function wheelProto({ r = 0.42, w = 0.28, rimR = 0.215, style = 'alloy', lugs = 22, seed = 1, tint = 0x8a8f94, dust = 0.5 } = {}) {
  const pieces = [];
  const hw = w * 0.5;
  const moto = style === 'moto';
  // a trail tyre's knobs are shallower than a mud-terrain's blocks
  const lugH = 0.038 * (r / 0.42) * (moto ? 0.6 : 1);
  const crown = r - lugH;
  const rnd = mulberry32(seed);
  const dustK = 0.4 + dust * 0.8;

  const carcassShade = (x, y, z) => {
    const rr = Math.hypot(y, z);
    // dust on the bead and up the sidewall, the shoulder rubbed back to black
    const bead = 1 - smoothstep(rimR + 0.01, rimR + 0.08, rr);
    const side = smoothstep(rimR + 0.03, crown - 0.03, rr) * (1 - smoothstep(crown - 0.05, crown, rr));
    const h = hash3(x, y, z, seed);
    const d = clamp((bead * 0.55 + side * 0.22 * (0.5 + h)) * dustK, 0, 0.6);
    return mix3(RUBBER, SIDE_DUST, d);
  };
  const carcass = lathe(
    [
      [rimR + 0.002, -hw * 0.5],
      [rimR + 0.025, -hw * 0.72],
      [r * 0.66, -hw * 0.97],
      [r * 0.8, -hw],
      [crown - 0.012, -hw * 0.9],
      [crown + 0.002, -hw * 0.66],
      [crown + 0.002, hw * 0.66],
      [crown - 0.012, hw * 0.9],
      [r * 0.8, hw],
      [r * 0.66, hw * 0.97],
      [rimR + 0.025, hw * 0.72],
      [rimR + 0.002, hw * 0.5],
    ],
    // a motorcycle's wheels are all rim: 28 segments on a 34 cm tyre read
    // as a polygon at fleet distance
    moto ? 40 : 36,
  );
  // Sidewall uvs for the shared relief map: u round the wheel — the lathe's
  // own segment fraction, so the seam stays where the geometry's is — v from
  // the bead to the shoulder by radius, the same on both faces.
  {
    const p = carcass.attributes.position;
    const uv = carcass.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const rr = Math.hypot(p.getY(i), p.getZ(i));
      uv.setXY(i, uv.getX(i) * SIDEWALL_WRAPS, clamp((rr - rimR) / (r * 0.8 - rimR)));
    }
  }
  pieces.push({ key: 'tyre', shade: carcassShade, geo: carcass });

  // Tread: three rows of lugs, the shoulders staggered against the centre so
  // the outline is notched from every angle. Each row is one extruded star.
  const treadShade = (x, y, z) => {
    const rr = Math.hypot(y, z);
    const t = clamp((rr - crown) / lugH);
    const h = hash3(Math.round(y * 40), Math.round(z * 40), 0, seed);
    const d = Math.min(0.6, (1 - smoothstep(-0.1, 0.5, t)) * 0.55 * dustK + 0.05);
    const wear = 0.85 + h * 0.3;
    return mix3(RUBBER, TREAD_DUST, d).map((c) => c * wear);
  };
  // A motorcycle's tyre is a narrow crown, so it gets two rows staggered by half
  // a pitch rather than three: one row read as a single notched polygon from
  // fleet distance (critics A and C, rounds 3 and 4).
  const rows = DETAIL.lite && !moto
    ? [[0, w * 0.9, 0]]
    : moto
      ? [
          [-w * 0.2, w * 0.36, 0],
          [w * 0.2, w * 0.36, Math.PI / lugs],
        ]
      : [
          [0, w * 0.34, 0],
          [-(w * 0.17 + w * 0.15), w * 0.3, Math.PI / lugs],
          [w * 0.17 + w * 0.15, w * 0.3, Math.PI / lugs],
        ];
  for (const [ox, rw, phase] of rows) {
    const g = lugRing(moto || ox === 0 ? r : r - 0.004, crown - 0.008, lugs, phase + rnd() * 0.2, ox === 0 || moto ? 0.5 : 0.56, rw);
    g.translate(ox, 0, 0);
    pieces.push({ key: 'tread', geo: g, shade: treadShade });
  }
  // side biters on the outboard shoulder
  if (style !== 'moto' && !DETAIL.lite) {
    const biter = pbox(0.03, 0.05, 0.075);
    for (let i = 0; i < lugs / 2; i++) {
      const a = ((i + 0.3) / (lugs / 2)) * Math.PI * 2;
      if (rnd() < 0.15) continue;
      pieces.push({
        key: 'tread',
        geo: transform(biter.clone(), { pos: [hw * 0.92, Math.cos(a) * (r * 0.84), Math.sin(a) * (r * 0.84)], rot: [a, 0, -0.35] }),
        shade: treadShade,
      });
    }
  }

  // --- rim -------------------------------------------------------------------
  const face = hw * 0.32;
  const rimShade = grime(tint, { dust: 0x6a6150, up: 0.15, down: 0.12, jitter: 0.12, seed });
  const dark = grime(0x2a2d31, { up: 0.1, down: 0.1, jitter: 0.1, seed });
  if (moto) {
    // Wire wheel: a channel rim, a hub with two flanges, 32 crossed spokes and
    // a brake disc on its carrier. The spokes are 9 mm — real ones are 4 — so
    // they still resolve as a ring of lines at fleet distance rather than
    // vanishing and leaving the disc behind them to read as the wheel.
    pieces.push({ key: 'alu', tint, geo: lathe([[rimR - 0.016, -hw * 0.62], [rimR + 0.004, -hw * 0.66], [rimR + 0.008, hw * 0.66], [rimR - 0.016, hw * 0.62], [rimR - 0.016, -hw * 0.62]], 40) });
    // the hub is a sand casting, satin, not the polished mirror the rim is: at
    // full environment a 14 cm alloy flange face-on to the camera returned one
    // tan value and read as a disc filling the wheel
    const hubShade = grime(0x85888c, { dust: 0x6a6150, up: 0.2, down: 0.15, jitter: 0.1, seed });
    pieces.push({ key: 'steel', shade: hubShade, geo: cylX(0.05, 0.05, hw * 1.2, 16) });
    for (const s of [-1, 1]) pieces.push({ key: 'steel', shade: hubShade, geo: cylX(0.072, 0.072, 0.012, 16).translate(s * hw * 0.5, 0, 0) });
    const spoke = cyl(0.0045, 0.0045, 1, 4);
    for (let i = 0; i < 16; i++) {
      for (const s of [-1, 1]) {
        const a = (i / 16) * Math.PI * 2 + (s > 0 ? 0.2 : 0);
        const from = new THREE.Vector3(s * hw * 0.5, Math.cos(a + 0.55) * 0.062, Math.sin(a + 0.55) * 0.062);
        const to = new THREE.Vector3(s * hw * 0.6, Math.cos(a) * (rimR - 0.014), Math.sin(a) * (rimR - 0.014));
        const d = to.clone().sub(from);
        const g = spoke.clone();
        g.scale(1, d.length(), 1);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        transform(g, { pos: from.clone().lerp(to, 0.5).toArray(), quat: q });
        pieces.push({ key: 'chrome', tint: 0xb9bec2, geo: g });
      }
    }
    // brake disc outboard of the hub on the -X side: a stainless ring (dull,
    // scored — steel's satin, not alu's polish) on a dark carrier
    const dx = -(hw * 0.6 + 0.014);
    pieces.push({ key: 'steel', tint: 0x9a9c9e, geo: lathe([[0.066, -0.0025], [0.115, -0.0025], [0.115, 0.0025], [0.066, 0.0025], [0.066, -0.0025]], 32).translate(dx, 0, 0) });
    pieces.push({ key: 'trim', tint: 0x2a2d31, geo: cylX(0.07, 0.07, 0.01, 16).translate(dx + 0.002, 0, 0) });
    return { pieces, r, w, rimR, style, discX: dx };
  }

  if (style === 'alloy' || style === 'quad') {
    // barrel and a dark cavity behind the spokes
    pieces.push({
      key: 'trim',
      shade: dark,
      geo: lathe([[rimR + 0.004, -hw * 0.48], [rimR + 0.014, -hw * 0.44], [rimR - 0.018, -hw * 0.34], [rimR - 0.018, hw * 0.3], [rimR + 0.014, hw * 0.44], [rimR + 0.004, hw * 0.48]], 32),
    });
    pieces.push({ key: 'gap', tint: 0x101214, geo: cylX(rimR - 0.02, rimR - 0.02, 0.01, 28).translate(face - 0.02, 0, 0) });
    const spokes = style === 'quad' ? 5 : 6;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + 0.3;
      const len = rimR - 0.04;
      // wide flat spokes: thin ones vanish into the dark cavity at any distance
      const g = gbox(0.05, rimR * 0.36, len, 0.006);
      g.translate(0, 0, len * 0.5 + 0.03);
      pieces.push({ key: 'alu', shade: rimShade, geo: transform(g, { pos: [face, 0, 0], rot: [a, 0, 0] }) });
    }
    pieces.push({ key: 'alu', shade: rimShade, geo: cylX(0.085, 0.09, 0.05, 18).translate(face + 0.005, 0, 0) });
    pieces.push({ key: 'trim', shade: dark, geo: cylX(0.04, 0.04, 0.012, 12).translate(face + 0.032, 0, 0) });
  } else if (style === 'steel' || style === 'truck') {
    const big = style === 'truck';
    // painted dish, dished in toward the hub; the eight windows are dark discs
    pieces.push({
      key: 'paint',
      shade: rimShade,
      geo: lathe([[rimR + 0.004, -hw * 0.46], [rimR + 0.012, -hw * 0.4], [rimR - 0.01, -hw * 0.2], [rimR - 0.012, face - 0.03], [rimR * 0.6, face + 0.005], [rimR * 0.36, face + 0.012], [0.0, face + 0.012]], 32),
    });
    const holes = big ? 10 : 8;
    for (let i = 0; i < holes; i++) {
      const a = (i / holes) * Math.PI * 2;
      const rr = rimR * (big ? 0.78 : 0.74);
      pieces.push({
        key: 'gap',
        tint: 0x0e1012,
        geo: transform(big ? cylX(0.024, 0.024, 0.01, 10) : gbox(0.01, 0.055, 0.04, 0.004), { pos: [face + 0.008, Math.cos(a) * rr, Math.sin(a) * rr], rot: [a, 0, 0] }),
      });
    }
    pieces.push({ key: 'gap', tint: 0x0e1012, geo: cylX(big ? 0.09 : 0.05, big ? 0.09 : 0.05, 0.012, 16).translate(face + 0.012, 0, 0) });
    if (big) {
      pieces.push({ key: 'paint', shade: rimShade, geo: cylX(0.12, 0.125, 0.03, 20).translate(face + 0.012, 0, 0) });
    } else {
      pieces.push({ key: 'chrome', tint: 0xaeb3b6, geo: cylX(0.055, 0.062, 0.03, 16).translate(face + 0.022, 0, 0) });
    }
  }
  // wheel nuts
  const nuts = style === 'truck' ? 10 : style === 'quad' ? 4 : 6;
  const nr = style === 'truck' ? 0.135 : 0.062;
  for (let i = 0; i < nuts; i++) {
    const a = (i / nuts) * Math.PI * 2 + 0.4;
    pieces.push({
      key: 'chrome',
      tint: i % 3 === 0 ? 0x8f8a7c : 0xb5b9bc,
      geo: transform(bolt(style === 'truck' ? 0.016 : 0.011, 0.012), { pos: [face + (style === 'truck' ? 0.03 : 0.036), Math.cos(a) * nr, Math.sin(a) * nr], rot: [0, 0, -Math.PI / 2] }),
    });
  }
  // brake behind the spokes
  pieces.push({ key: 'steel', shade: grime(0x6a625a, { up: 0.3, down: 0.3 }), geo: cylX(rimR * 0.8, rimR * 0.8, 0.022, 24).translate(-hw * 0.05, 0, 0) });
  pieces.push({ key: 'rust', tint: 0x6a4a34, geo: gbox(0.05, 0.11, 0.14, 0.012).translate(-hw * 0.05, rimR * 0.55, rimR * 0.35) });
  return { pieces, r, w, rimR, style };
}

/**
 * Place a wheel. `side` +1 is the right-hand side (+X); the proto is mirrored
 * for the left so the dish faces out. `spin` randomises the lug phase, and the
 * bottom of the tread is squashed onto the ground.
 */
export function addWheel(k, proto, { x, z, y = null, side = 1, steer = 0, spin = 0, camber = 0, squash = 0.02, sink = 0.015, travel = 0.12, contact = null, blob = true }) {
  // A loaded tyre squashes: the carcass below the flat is folded up to it and
  // the hub comes down by the same amount, so the flat is *on* the ground
  // rather than hovering a squash above it — and a centimetre and a half into
  // it, the way the hero's tyres bed into loose dirt.
  const hubY = y ?? proto.r - squash - sink;
  const id = contact ?? (k.contact ? k.contact({ x, z, r: proto.r, travel }) : undefined);
  if (blob) contactBlob(k, { x, z, r: proto.r, w: proto.w, contact: id });
  for (const piece of proto.pieces) {
    const g = piece.geo.clone();
    transform(g, { rot: [spin, 0, 0] });
    if (squash > 0 && (piece.key === 'tyre' || piece.key === 'tread')) {
      const p = g.attributes.position;
      const floor = -(proto.r - squash);
      for (let i = 0; i < p.count; i++) {
        const py = p.getY(i);
        if (py < floor) {
          p.setY(i, floor + (py - floor) * 0.08);
          p.setX(i, p.getX(i) * (1 + (floor - py) * 1.6));
        }
      }
    }
    k.add(piece.key, g, {
      pos: [x, hubY, z],
      rot: [0, steer, side * camber],
      scale: side < 0 ? [-1, 1, 1] : undefined,
      tint: piece.tint,
      shade: piece.shade,
      contact: id,
      // the tyre and rim carry their own baked dust; full road film cakes them
      // into one dark disc
      wear: piece.key === 'tyre' || piece.key === 'tread' ? 0.2 : 0.35,
    });
  }
  return id;
}

/** Standard axle set. `rear.dual` puts two wheels a side on the rear. */
export function addWheels(k, proto, { front, rear, track, steer = 0, seed = 1, dual = false, camber = 0.015 }) {
  const rnd = mulberry32(seed * 7 + 3);
  for (const side of [-1, 1]) {
    addWheel(k, proto, { x: side * track, z: front, side, steer, spin: rnd() * 6.28, camber });
    if (dual) {
      // twin rears share one hub, so one contact
      const id = addWheel(k, proto, { x: side * (track + proto.w * 0.55), z: rear, side, spin: rnd() * 6.28 });
      addWheel(k, proto, { x: side * (track - proto.w * 0.55), z: rear, side: -side, spin: rnd() * 6.28, contact: id });
    } else {
      addWheel(k, proto, { x: side * track, z: rear, side, spin: rnd() * 6.28, camber });
    }
  }
}

// --- chassis ---------------------------------------------------------------

/**
 * Ladder frame with live axles, springs, shocks, driveline, tank and exhaust.
 * The underside is seen from every low camera, and a body floating over four
 * wheels with nothing between them is the fastest "toy" read there is.
 */
export function chassis(k, { front, rear, track, r, railHW = 0.42, railY, nose, tail, leaf = true, coilFront = true, tankSide = -1, exhaust = true, heavy = false }) {
  const railH = heavy ? 0.16 : 0.1;
  const railW = heavy ? 0.07 : 0.05;
  const y = railY ?? r + 0.16;
  const dirty = grime(0x565a5e, { up: 0.7, down: 0.4, jitter: 0.1 });
  const cast = grime(0x666a6e, { up: 0.75, down: 0.45, jitter: 0.12 });
  const len = nose - tail - 0.5;
  const mid = (nose + tail) * 0.5;
  k.addMirrored('steel', gbox(railW, railH, len, 0.008), { pos: [railHW, y, mid], shade: dirty });
  for (const z of [nose - 0.45, front + 0.55, mid, rear - 0.5, tail + 0.35]) {
    k.add('steel', gbox(railHW * 2 - 0.02, railH * 0.7, 0.06, 0.006), { pos: [0, y, z], shade: dirty });
  }
  // axles
  for (const [z, isFront] of [[front, true], [rear, false]]) {
    const ay = r;
    k.add('steel', cylX(0.045 * (heavy ? 1.4 : 1), 0.045 * (heavy ? 1.4 : 1), track * 2 - 0.12, 12), { pos: [0, ay, z], shade: cast });
    const px = isFront ? 0.14 : -0.12;
    k.add('steel', new THREE.SphereGeometry(0.15 * (heavy ? 1.3 : 1), 14, 10), { pos: [px, ay, z], scale: [1, 1, 0.85], shade: cast });
    k.add('steel', cylZ(0.1, 0.115, 0.09, 14), { pos: [px, ay, z + (isFront ? 0.14 : -0.14)], shade: cast });
    // knuckles / hubs
    k.addMirrored('steel', gbox(0.09, 0.18, 0.13, 0.02), { pos: [track - 0.12, ay, z], shade: cast });
    if (DETAIL.lite) continue;
    // springs
    if (leaf && !(isFront && coilFront)) {
      // torus arcs start at +X, so spin them in-plane to hang the arc under the axle
      k.addMirrored('steel', bend(1.4, 0.014, 0.9, 10), { pos: [railHW + 0.02, ay + 1.4 + 0.04, z], rot: [0, Math.PI / 2, -Math.PI / 2 - 0.45], shade: dirty });
      k.addMirrored('steel', bend(1.35, 0.012, 0.7, 8), { pos: [railHW + 0.02, ay + 1.35 + 0.02, z], rot: [0, Math.PI / 2, -Math.PI / 2 - 0.35], shade: dirty });
      k.addMirrored('steel', gbox(0.09, 0.05, 0.16, 0.01), { pos: [railHW + 0.02, ay + 0.06, z], shade: dirty });
      for (const dz of [-0.55, 0.55]) k.addMirrored('steel', gbox(0.05, 0.12, 0.05, 0.01), { pos: [railHW + 0.02, y - railH * 0.5 - 0.05, z + dz], shade: dirty });
    } else {
      k.addMirrored('steel', coil(0.075, y - ay - 0.02, 5.5, 0.016), { pos: [track - 0.38, ay + 0.02, z], shade: grime(0x8a4a24, { dust: 0xb0a482, up: 0.5, down: 0.3 }) });
    }
    // shocks
    k.addMirrored('steel', cyl(0.03, 0.03, y - ay - 0.06, 10), { pos: [track - 0.3, (ay + y) * 0.5, z + 0.14], rot: [0.12, 0, 0.14], shade: grime(0x3c4145, { up: 0.6 }) });
    k.addMirrored('chrome', cyl(0.014, 0.014, (y - ay) * 0.5, 8), { pos: [track - 0.3, (ay + y) * 0.5 + 0.1, z + 0.15], rot: [0.12, 0, 0.14], tint: 0xc9cdd0 });
    // control arms
    k.addMirrored('steel', gbox(0.05, 0.06, 0.6, 0.014), { pos: [track - 0.36, ay - 0.05, z + (isFront ? -0.35 : 0.35)], rot: [isFront ? 0.08 : -0.08, 0, 0], shade: dirty });
    k.addMirrored('steel', gbox(0.02, 0.14, 0.03, 0.005), { pos: [track - 0.36, ay - 0.05, z + (isFront ? -0.35 : 0.35)], rot: [isFront ? 0.08 : -0.08, 0, 0], shade: dirty });
  }
  // driveline and transfer case
  k.add('steel', gbox(0.26, 0.24, 0.34, 0.05), { pos: [0.02, y - 0.1, mid + 0.2], shade: cast });
  if (!DETAIL.lite) for (const [z, isFront] of [[front, true], [rear, false]]) {
    const px = isFront ? 0.14 : -0.12;
    const from = [0.04, y - 0.12, mid + 0.2 + (isFront ? 0.2 : -0.2)];
    const to = [px, r + 0.02, z + (isFront ? -0.16 : 0.16)];
    k.add('steel', tube([from, [(from[0] + to[0]) * 0.5, (from[1] + to[1]) * 0.5, (from[2] + to[2]) * 0.5], to], 0.03, 10), { shade: cast });
  }
  // fuel tank behind the rear axle on one side, skid plate under it
  k.add('steel', gbox(railHW * 1.1, 0.26, 0.7, 0.05), { pos: [tankSide * railHW * 0.55, y - 0.14, rear + 0.9], shade: grime(0x70746f, { up: 0.6 }) });
  k.add('steel', gbox(railHW * 1.15, 0.02, 0.76, 0.005), { pos: [tankSide * railHW * 0.55, y - 0.28, rear + 0.9], shade: dirty });
  if (exhaust) {
    const ex = -tankSide;
    k.add('rust', tube([[0.2, y - 0.2, front - 0.6], [ex * 0.3, y - 0.24, mid], [ex * (railHW + 0.1), y - 0.2, rear + 0.6], [ex * (railHW + 0.15), y - 0.15, tail - 0.1]], 0.026, 8), { tint: 0x6b5a4c });
    k.add('rust', cylZ(0.09, 0.09, 0.5, 14), { pos: [ex * (railHW + 0.1), y - 0.2, rear + 0.7], tint: 0x7a6650 });
  }
  // dark belly pan so the underside does not read as open air
  k.add('gap', pbox(railHW * 2 + 0.3, 0.02, len - 0.3), { pos: [0, y + railH * 0.5 + 0.02, mid], tint: 0x0d0e10 });
}

/** Helical coil. */
export function coil(radius, height, turns, wire) {
  const pts = [];
  const steps = Math.max(24, Math.round(turns * 12));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  return tube(pts, wire, 6, 0.5);
}

// --- lamps -----------------------------------------------------------------

/**
 * Round lamp facing +Z (or -Z for `dir: -1`). A bezel, a stamped reflector
 * bowl, the bulb, and a clear lens over the top.
 */
export function roundLamp(k, { pos, r = 0.09, dir = 1, kind = 'head', on = false, bezel = 'trim', bezelTint = 0x3c4045, depth = 0.07, cracked = false, missing = false }) {
  const [x, y, z] = pos;
  const rot = [dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0];
  const zz = (d) => z + dir * d;
  if (missing) {
    // the unit is gone: an empty bucket with the wiring tail
    k.add('gap', cyl(r + 0.01, r + 0.01, depth, 20, true), { pos: [x, y, zz(-depth * 0.5)], rot, tint: 0x0a0b0c });
    k.add('gap', cyl(r + 0.01, r + 0.01, 0.006, 20), { pos: [x, y, zz(-depth + 0.003)], rot, tint: 0x0a0b0c });
    k.add('rubber', tube([[x + r * 0.3, y - r * 0.2, zz(-depth * 0.6)], [x + r * 0.5, y - r * 0.9, zz(-0.02)], [x + r * 0.4, y - r * 1.4, zz(0.01)]], 0.005, 5), { tint: 0x2a2b2d });
    return;
  }
  k.add(bezel, cyl(r + 0.014, r + 0.01, depth, 20, true), { pos: [x, y, zz(-depth * 0.5 + 0.004)], rot, tint: bezelTint });
  k.add(bezel, new THREE.TorusGeometry(r + 0.01, 0.006, 6, 20), { pos: [x, y, zz(0.002)], rot, tint: bezelTint });
  if (kind === 'head' || kind === 'spot') {
    k.add('reflector', cyl(r * 0.97, r * 0.38, depth * 0.8, 18, true), { pos: [x, y, zz(-depth * 0.5)], rot, tint: 0xffffff });
    // a lit lamp fills its whole lens; an unlit one shows the bulb deep in the reflector
    if (on) k.add('headOn', cyl(r * 0.9, r * 0.9, 0.008, 18), { pos: [x, y, zz(-0.014)], rot, tint: 0xffffff });
    else k.add('headOff', cyl(r * 0.3, r * 0.3, 0.012, 12), { pos: [x, y, zz(-depth * 0.72)], rot, tint: 0xffffff });
    if (cracked) {
      // a shattered lens: the crack web as a sorted pane over the reflector
      const disc = new THREE.CircleGeometry(r, 20);
      k.pane('glassCracked', disc, { pos: [x, y, zz(0.001)], rot: [0, dir > 0 ? 0 : Math.PI, 0] });
    } else {
      k.add('lensClear', cyl(r, r, 0.005, 20), { pos: [x, y, zz(-0.006)], rot, tint: 0xffffff });
    }
  } else {
    const key = kind === 'tail' ? (on ? 'tailOn' : 'tailOff') : kind === 'amber' ? (on ? 'amberOn' : 'amber') : on ? 'lampBlueOn' : 'lampBlue';
    k.add(key, cyl(r, r, 0.012, 16), { pos: [x, y, zz(-0.006)], rot, tint: 0xffffff });
  }
}

/** Rectangular lamp unit: a dark housing with a coloured lens set into it. */
export function rectLamp(k, { pos, w = 0.14, h = 0.09, dir = 1, kind = 'tail', on = false, housing = 'trim', housingTint = 0x383c41, segments = null }) {
  const [x, y, z] = pos;
  k.add(housing, gbox(w + 0.02, h + 0.02, 0.06, 0.006), { pos: [x, y, z - dir * 0.02], tint: housingTint });
  const cells = segments || (kind === 'tail' ? ['tail', 'amber', 'tail'] : [kind]);
  const cw = (w - 0.006 * (cells.length - 1)) / cells.length;
  for (const [i, c] of cells.entries()) {
    const cx = x - w * 0.5 + cw * 0.5 + i * (cw + 0.006);
    const key = c === 'tail' ? (on ? 'tailOn' : 'tailOff') : c === 'amber' ? (on ? 'amberOn' : 'amber') : c === 'head' ? (on ? 'headOn' : 'headOff') : on ? 'lampBlueOn' : 'lampBlue';
    k.add(key, pbox(cw, h - 0.01, 0.012), { pos: [cx, y, z + dir * 0.012], tint: 0xffffff });
  }
}

/** A ground quad reading one cell of the decal atlas: `w` across (x), `len` along (z), facing up, v = 0 at -z. */
function groundQuad(cell, w, len) {
  const g = new THREE.PlaneGeometry(w, len);
  // +90 about X puts the plane's v = 0 edge at -z (the material is unlit and double-sided, so the facing is moot)
  g.rotateX(Math.PI / 2);
  const uv = g.attributes.uv;
  const [u0, v0, u1, v1] = GROUND_DECAL[cell];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
  return g;
}

/**
 * Light pool on the ground ahead of a lit vehicle's headlamps: a cone from the
 * bumper, 7 m long, soft-edged, only ever built for lamps that are on (the
 * material's `uPoolOn` gates it by hour on top of that).
 */
export function lampPool(k, { z, dir = 1, w = 3.4, len = 7.0, y = 0.02, on = true, tint = 0xffd9a0 }) {
  if (!on) return;
  const g = groundQuad('cone', w, len);
  if (dir < 0) g.rotateY(Math.PI);
  k.add('pool', g, { pos: [0, y, z + dir * len * 0.5], tint });
}

/** Contact occlusion under a tyre: a dark soft patch tied to the wheel's contact so it drops with it. */
export function contactBlob(k, { x, z, r, w, contact, y = 0.006 }) {
  k.add('pool', groundQuad('blob', w * 2.4, r * 1.7), { pos: [x, y, z], tint: 0x000000, contact });
}
