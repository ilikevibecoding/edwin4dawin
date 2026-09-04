// Door assembly geometry for the doors system (COORDINATION.md §9.1).
//
// Every door is described in a local (u, v, n) frame: n = unit normal from room A toward room B
// (= room A's door `dir`), v = up, u = v × n across the opening. The opening centre at floor level
// is the origin. Room A's inner wall face is at n = -WALL_T, room B's at n = +WALL_T; the leaves live
// in the middle of that gap. Everything here is axis-aligned so boxes are placed with min/max corners.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit } from "../../kit.js";
import { WALL_T, FRAME_W } from "./helper.js";

// Per-kind construction: lining = tunnel lining thickness (jambs + soffit), leafT = leaf thickness,
// proud = how far the reveal frame stands off the wall face, bar = lintel status-light size.
export const KIND_SPEC = {
  standard: { lining: 0.06, leafT: 0.08, proud: 0.06, split: "side", bar: [0.7, 0.05], hazard: false },
  hatch: { lining: 0.05, leafT: 0.06, proud: 0.05, split: "side", bar: [0.4, 0.04], hazard: false },
  blast: { lining: 0.1, leafT: 0.16, proud: 0.1, split: "vertical", bar: [1.4, 0.07], hazard: true },
  bay: { lining: 0.14, leafT: 0.16, proud: 0.14, split: "vertical", bar: [3.0, 0.12], hazard: true },
};
// Bay doors carry their own w/h; their leaves share one geometry built at this size and scaled per
// instance (all planned bays are within ±25 % of this aspect, so relief and stripes stay in proportion).
export const BAY_REF = { w: 13.5, h: 10 };

export const SEAM = 0.004; // half gap at the meeting line of the two leaves
export const RECESS = 0.02; // depth of the pocket slots cut into the lining
export const OPEN_CLEAR = 0.85; // open fraction above which leaf colliders are parked out of the path

export function doorColours(PALETTE) {
  const P = (k, fb) => (PALETTE && PALETTE[k] ? PALETTE[k] : new THREE.Color(fb));
  return {
    frame: P("impMid", "#5a5e66"),
    lip: P("impDark", "#33363c"),
    corner: P("gunmetal", "#4a4e55"),
    black: P("impBlack", "#111214"),
    lining: P("impMid", "#5a5e66"),
    steel: P("steel", "#9ea3aa"),
    core: P("impDark", "#33363c"),
    plate: new THREE.Color("#666b74"),
    kick: new THREE.Color("#454952"),
    yellow: new THREE.Color("#e8b923"),
    stripeBlack: new THREE.Color("#0c0d10"),
    white: new THREE.Color("#ffffff"),
  };
}

/**
 * Closed-position extents of ONE leaf in leaf-local coordinates (x across, y up, z = thickness).
 * side: the left leaf (x <= 0); the right leaf is this geometry rotated 180° about the vertical axis.
 * vertical: the bottom leaf; the top leaf is this geometry rotated 180° about the normal through (0, h/2).
 */
export function leafLayout(kind, split, w, h) {
  const s = KIND_SPEC[kind];
  const hw = w / 2;
  const LJ = s.lining;
  const XW = hw - LJ + 0.01; // 1 cm into the jamb lining / pocket recess so no slit is ever visible
  if (split === "side") {
    return { x0: -XW, x1: -SEAM, y0: 0.005, y1: h - LJ + 0.02, z0: -s.leafT / 2, z1: s.leafT / 2, travel: XW - SEAM };
  }
  const y1 = h / 2 - SEAM;
  return {
    x0: -XW,
    x1: XW,
    y0: -0.015,
    y1,
    z0: -s.leafT / 2,
    z1: s.leafT / 2,
    travelDown: y1 - 0.01, // bottom leaf parks with its top edge 1 cm above the floor, inside the sill slot
    travelUp: h - LJ + 0.01 - (h / 2 + SEAM), // top leaf's bottom edge ends inside the soffit slot
  };
}

// Wall length needed beside the hole (beyond hw) for a side-sliding leaf to disappear into the wall.
export function sidePocketNeeded(kind, w) {
  const s = KIND_SPEC[kind];
  return w / 2 - 2 * s.lining + 0.02 + 0.05;
}

// ---------------------------------------------------------------------------
// Leaf geometry (one merged BufferGeometry per kind+split; instanced per leaf)
// ---------------------------------------------------------------------------
function clipPoly(poly, fn) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = fn(a);
    const fb = fn(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function flatGeo(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
  const n = arr.length / 3;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = arr[i * 3];
    uv[i * 2 + 1] = arr[i * 3 + 1];
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

// 45° stripes filling the rectangle [x0,x1]×[y0,y1] on the plane z (normal +z, or -z when flip).
// Returns two flat geometries (yellow stripes, black stripes) as clipped parallelograms.
export function hazardBand(x0, x1, y0, y1, z, pitch, flip) {
  const yellow = [];
  const black = [];
  const rect = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  const k0 = Math.floor((x0 - y1) / pitch) - 1;
  const k1 = Math.ceil((x1 - y0) / pitch) + 1;
  for (let k = k0; k <= k1; k++) {
    const a = k * pitch;
    const b = a + pitch;
    let poly = clipPoly(rect, (p) => p[0] - p[1] - a);
    poly = clipPoly(poly, (p) => b - (p[0] - p[1]));
    if (poly.length < 3) continue;
    const out = ((k % 2) + 2) % 2 === 0 ? yellow : black;
    for (let i = 1; i + 1 < poly.length; i++) {
      const tri = flip ? [poly[0], poly[i + 1], poly[i]] : [poly[0], poly[i], poly[i + 1]];
      for (const [x, y] of tri) out.push(x, y, z);
    }
  }
  return { yellow: yellow.length ? flatGeo(yellow) : null, black: black.length ? flatGeo(black) : null };
}

/**
 * Detailed leaf geometry in leaf-local space (see leafLayout). Vertex colours carry plates / edge bars /
 * hazard stripes; the instanced material adds the worn-metal maps.
 */
export function leafGeometry(kind, split, w, h, C) {
  const s = KIND_SPEC[kind];
  const L = leafLayout(kind, split, w, h);
  const LT = s.leafT;
  const pt = kind === "hatch" ? 0.01 : kind === "standard" ? 0.012 : 0.03; // plate relief
  const k = new Kit({});
  const box = (x0, x1, y0, y1, z0, z1, color) => {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    k.box("leaf", (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, { color, texel: 1 });
  };
  const coreZ = LT / 2 - pt;
  box(L.x0, L.x1, L.y0, L.y1, -coreZ, coreZ, C.core);
  const faces = [
    [-LT / 2, -coreZ],
    [coreZ, LT / 2],
  ];
  if (split === "side") {
    const W = L.x1 - L.x0;
    const H = L.y1 - L.y0;
    const EB = Math.min(0.075, W * 0.08); // meeting-edge bar
    box(L.x1 - EB, L.x1, L.y0, L.y1, -LT / 2, LT / 2, C.lip);
    box(L.x0, L.x0 + 0.03, L.y0, L.y1, -LT / 2, LT / 2, C.lip); // outer edge (into the pocket)
    const px0 = L.x0 + 0.05;
    const px1 = L.x1 - EB - 0.025;
    const rows =
      H > 2.2
        ? [
            [L.y0 + 0.03, L.y0 + 0.45],
            [L.y0 + 0.48, L.y1 - 0.66],
            [L.y1 - 0.63, L.y1 - 0.03],
          ]
        : [
            [L.y0 + 0.03, L.y0 + 0.32],
            [L.y0 + 0.35, L.y1 - 0.03],
          ];
    for (const [zA, zB] of faces) {
      rows.forEach(([ya, yb], ri) => {
        if (ri === 1 && H > 2.2) {
          const xm = (px0 + px1) / 2;
          box(px0, xm - 0.012, ya, yb, zA, zB, C.plate);
          box(xm + 0.012, px1, ya, yb, zA, zB, C.plate);
          // thin raised grip bar across the groove at hand height
          box(xm - 0.05, xm + 0.05, ya + 0.5, ya + 0.53, zA, zB + (zB > 0 ? 0.004 : -0.004), C.corner);
        } else box(px0, px1, ya, yb, zA, zB, ri === 0 ? C.kick : C.plate);
      });
    }
  } else {
    const MB = kind === "bay" ? 0.06 : 0.04; // meeting-edge bar
    box(L.x0, L.x1, L.y1 - MB, L.y1, -LT / 2, LT / 2, C.lip);
    const HB = s.hazard ? (kind === "bay" ? 0.5 : 0.24) : 0.1; // band height along the meeting edge
    const bandY1 = L.y1 - MB - 0.015;
    const bandY0 = bandY1 - HB;
    const px0 = L.x0 + 0.06;
    const px1 = L.x1 - 0.06;
    const py0 = L.y0 + 0.04;
    const py1 = bandY0 - 0.03;
    const cols = Math.max(2, Math.round((px1 - px0) / (kind === "bay" ? 2.4 : 1.3)));
    const rowsN = py1 - py0 > 1.2 ? 2 : 1;
    const gap = kind === "bay" ? 0.06 : 0.035;
    const cw = (px1 - px0 - gap * (cols - 1)) / cols;
    const rh = (py1 - py0 - gap * (rowsN - 1)) / rowsN;
    for (const [zA, zB] of faces) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rowsN; r++) {
          const xa = px0 + c * (cw + gap);
          const ya = py0 + r * (rh + gap);
          box(xa, xa + cw, ya, ya + rh, zA, zB, C.plate);
        }
      }
      box(px0, px1, bandY0, bandY1, zA, zB, s.hazard ? C.stripeBlack : C.lip);
    }
    if (s.hazard) {
      const pitch = kind === "bay" ? 0.36 : 0.17;
      for (const sgn of [-1, 1]) {
        const { yellow, black } = hazardBand(px0 + 0.02, px1 - 0.02, bandY0 + 0.02, bandY1 - 0.02, sgn * (LT / 2 + 0.002), pitch, sgn < 0);
        if (yellow) k.add("leaf", yellow, { color: C.yellow, uv: "keep" });
        if (black) k.add("leaf", black, { color: C.stripeBlack, uv: "keep" });
      }
    }
    // stiffener ribs in the column gaps, proud of the plates
    for (let c = 1; c < cols; c++) {
      const xg = px0 + c * (cw + gap) - gap / 2;
      box(xg - 0.012, xg + 0.012, py0, py1, -(LT / 2 + 0.008), LT / 2 + 0.008, C.corner);
    }
    // locking lugs straddling the meeting edge; asymmetric spacing so the top leaf's mirrored set interlocks
    const nl = kind === "bay" ? 5 : 3;
    const lw = kind === "bay" ? 0.5 : 0.24;
    for (let i = 0; i < nl; i++) {
      const xc = L.x0 + ((i + 0.3) / nl) * (L.x1 - L.x0);
      box(xc - lw / 2, xc + lw / 2, L.y1 - MB - HB * 0.55, L.y1 - 0.005, -(LT / 2 + 0.012), LT / 2 + 0.012, C.steel);
    }
  }
  const g = mergeGeometries(k.groups.get("leaf"), false);
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------------------
// Static assembly through the module kit (merged per material)
// ---------------------------------------------------------------------------
/**
 * @param {Kit} kit module kit
 * @param {object} C colours from doorColours()
 * @param {object} d { pos:[x,y,z], U:Vector3, N:Vector3, w, h, kind, spec, split, paired,
 *                     faces:[{ s:-1|1, top:number }] }   top = frame top (v), already clamped to the room
 * @returns {{ lights: {pos:number[], size:number[], role:string, face:number}[] }}
 */
export function buildStatic(kit, C, d) {
  const { w, h, kind, spec, split, paired } = d;
  const hw = w / 2;
  const LJ = spec.lining;
  const LT = spec.leafT;
  const PR = spec.proud;
  const T = WALL_T;
  const F = FRAME_W;
  const P = (uu, vv, nn) => [d.pos[0] + d.U.x * uu + d.N.x * nn, d.pos[1] + vv, d.pos[2] + d.U.z * uu + d.N.z * nn];
  const mm = (u0, u1, v0, v1, n0, n1) => {
    const a = P(u0, v0, n0);
    const b = P(u1, v1, n1);
    return [
      [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
      [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
    ];
  };
  const bx = (mat, u0, u1, v0, v1, n0, n1, opts = {}) => {
    const [min, max] = mm(u0, u1, v0, v1, n0, n1);
    if (max[0] - min[0] < 1e-4 || max[1] - min[1] < 1e-4 || max[2] - min[2] < 1e-4) return;
    kit.boxMM(mat, min, max, opts);
  };
  const coll = (u0, u1, v0, v1, n0, n1, tag) => {
    const [min, max] = mm(u0, u1, v0, v1, n0, n1);
    kit.collider(min, max, tag);
  };
  const lights = [];

  // ---- tunnel lining between the two inner faces (unpaired: the declaring wall, capped behind)
  const nA = -T + 0.01;
  const nB = paired ? T - 0.01 : T - 0.03;
  const zc = d.leafN; // leaf plane centre along n (0 when paired; pulled toward room A when capped)
  const slot = LT / 2 + (split === "vertical" ? 0.02 : 0.01); // half width of the pocket slots (vertical leaves carry lugs)
  const s0 = zc - slot;
  const s1 = zc + slot;
  const liningOpts = { color: C.lining, texel: 1.2 };
  const slotOpts = { color: C.black, texel: 1 };
  for (const sgn of [-1, 1]) {
    const uIn = sgn * (hw - LJ);
    const uOut = sgn * (hw + 0.01);
    if (split === "side") {
      // jamb split around the leaf plane, 2 cm recess between the halves = the pocket slot
      bx("metal", uIn, uOut, -0.03, h - LJ + 0.01, nA, s0, liningOpts);
      bx("metal", uIn, uOut, -0.03, h - LJ + 0.01, s1, nB, liningOpts);
      bx("paintedMetal", sgn * (hw - LJ + RECESS), uOut, -0.03, h - LJ + 0.01, s0, s1, slotOpts);
    } else {
      bx("metal", uIn, uOut, -0.03, h - LJ + 0.01, nA, nB, liningOpts);
      // guide rails on both faces of the leaf plane (the leaf edge runs inside them)
      for (const q of [-1, 1]) {
        const r0 = zc + q * (slot + 0.005);
        const r1 = zc + q * (slot + 0.04);
        bx("metal", sgn * (hw - LJ - 0.035), uIn + sgn * 0.005, 0.03, h - LJ - 0.02, r0, r1, { color: C.lip, texel: 1 });
      }
    }
  }
  // soffit
  if (split === "vertical") {
    bx("metal", -(hw + 0.01), hw + 0.01, h - LJ, h + 0.01, nA, s0, liningOpts);
    bx("metal", -(hw + 0.01), hw + 0.01, h - LJ, h + 0.01, s1, nB, liningOpts);
    bx("paintedMetal", -(hw + 0.01), hw + 0.01, h - LJ + RECESS, h + 0.01, s0, s1, slotOpts);
  } else bx("metal", -(hw + 0.01), hw + 0.01, h - LJ, h + 0.01, nA, nB, liningOpts);

  // ---- threshold plate (sill), spanning the frames' footprint; hazard chevrons on blast / bay
  const nT0 = -(T + PR);
  const nT1 = paired ? T + PR : nB;
  const sillMat = spec.hazard ? "doorHazard" : "metal";
  const sillOpts = spec.hazard ? { color: C.white, texel: kind === "bay" ? 0.5 : 1 } : { color: C.lip, texel: 1 };
  if (split === "vertical") {
    bx(sillMat, -(hw + F), hw + F, -0.04, 0.025, nT0, s0, sillOpts);
    bx(sillMat, -(hw + F), hw + F, -0.04, 0.025, s1, nT1, sillOpts);
    bx("paintedMetal", -(hw + F), hw + F, -0.04, 0.005, s0, s1, slotOpts);
    // steel edge strips either side of the slot so the sill reads as a machined track
    for (const q of [-1, 1]) bx("metal", -(hw - LJ), hw - LJ, 0.025, 0.04, zc + q * slot, zc + q * (slot + 0.03), { color: C.steel, texel: 2 });
  } else {
    bx(sillMat, -(hw + F), hw + F, -0.04, 0.025, nT0, nT1, sillOpts);
    // shallow floor track under the leaf plane
    bx("metal", -(hw - LJ), hw - LJ, 0.025, 0.04, s0 - 0.02, s1 + 0.02, { color: C.black, texel: 2 });
  }

  // ---- unpaired: sealed slab behind the leaves (future expansion / neighbour not built)
  if (!paired) {
    bx("paintedMetal", -(hw - LJ + 0.005), hw - LJ + 0.005, -0.02, h - LJ + 0.005, s1 + 0.02, nB, { color: C.black, texel: 1 });
    const capN = s1 + 0.02; // cap slab front face (the slab is ≥ 3 cm thick behind it)
    // X-brace (1 cm proud of the slab, 2 cm embedded) + red seal bar 1 cm in front of the brace, both
    // sized with the opening; everything stays behind the leaf slot so the closed leaves never touch it
    const len = Math.min(w, h) * 0.8;
    const braceT = Math.max(0.09, h * 0.025);
    const axis = Math.abs(d.N.x) > 0.5 ? "x" : "z";
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const c = P(0, h * 0.5, capN + 0.005);
      const rot = axis === "z" ? [0, 0, a] : [a, 0, 0];
      const g = axis === "z" ? new THREE.BoxGeometry(len, braceT, 0.03) : new THREE.BoxGeometry(0.03, braceT, len);
      kit.add("paintedMetal", g, { pos: c, rot, color: C.lip, texel: 1 });
    }
    const sw = Math.max(0.3, w * 0.08);
    const sh = Math.max(0.02, h * 0.006);
    bx("emitRedImp", -sw, sw, h * 0.5 - sh, h * 0.5 + sh, capN - 0.02, capN - 0.01, {});
  }

  // ---- reveal frames on each room face
  for (const f of d.faces) {
    const s = f.s;
    const top = f.top;
    const embedN = s * (T - 0.02);
    const midN = s * (T + PR * 0.55);
    const faceN = s * (T + PR);
    const frameOpts = { color: C.frame, texel: 1 };
    const lipOpts = { color: C.lip, texel: 1 };
    for (const sgn of [-1, 1]) {
      // outer plate: from the lining's inner face out to FRAME_W beyond the hole
      bx("paintedMetal", sgn * (hw - LJ), sgn * (hw + F), 0.025, h - LJ, embedN, midN, frameOpts);
      // raised lip hugging the opening
      bx("paintedMetal", sgn * (hw - LJ), sgn * (hw - LJ + 0.08), 0.025, h - LJ + 0.08, midN - s * 0.005, faceN, lipOpts);
      // recessed black seam down the outer plate
      bx("paintedMetal", sgn * (hw + F - 0.051), sgn * (hw + F - 0.039), 0.08, h - LJ - 0.04, midN - s * 0.002, midN + s * 0.004, { color: C.black, texel: 1 });
      // bolt heads
      for (const fr of [0.12, 0.5, 0.88]) {
        const v = 0.025 + (h - LJ - 0.05) * fr;
        bx("metal", sgn * (hw + F - 0.135), sgn * (hw + F - 0.105), v - 0.015, v + 0.015, midN, midN + s * 0.012, { color: C.steel, texel: 3 });
      }
    }
    // lintel plate + lip
    bx("paintedMetal", -(hw + F), hw + F, h - LJ, top, embedN, midN, frameOpts);
    bx("paintedMetal", -(hw - LJ + 0.08), hw - LJ + 0.08, h - LJ, h - LJ + 0.08, midN - s * 0.005, faceN, lipOpts);
    // heavy corner blocks
    for (const sgn of [-1, 1]) {
      bx("paintedMetal", sgn * (hw + F - 0.2), sgn * (hw + F - 0.01), top - 0.2, top - 0.01, midN - s * 0.005, faceN + s * 0.01, { color: C.corner, texel: 1 });
    }
    // lintel status-light housing + bar
    const bw = spec.bar[0];
    const bh = spec.bar[1];
    const hv0 = h - LJ + 0.09;
    const hv1 = top - 0.02;
    if (hv1 - hv0 > bh + 0.02) {
      bx("paintedMetal", -(bw / 2 + 0.08), bw / 2 + 0.08, hv0, hv1, midN, faceN + s * 0.03, { color: C.black, texel: 1 });
      lights.push({ pos: P(0, (hv0 + hv1) / 2, faceN + s * 0.04), size: [bw, bh, 0.02], role: "bar", face: s });
    } else {
      lights.push({ pos: P(0, (hv0 + hv1) / 2, faceN + s * 0.01), size: [bw, Math.max(0.03, hv1 - hv0 - 0.01), 0.02], role: "bar", face: s });
    }
    // door control panel on the +u jamb: matte black box, status LED, three keys
    const pu0 = hw + 0.04;
    const pu1 = hw + F - 0.03;
    const pc = (pu0 + pu1) / 2;
    bx("darkGloss", pu0, pu1, 1.02, 1.34, midN, midN + s * 0.03, {});
    lights.push({ pos: P(pc, 1.28, midN + s * 0.036), size: [0.07, 0.035, 0.012], role: "led", face: s });
    for (const du of [-0.04, 0, 0.04]) bx("emitBlue", pc + du - 0.012, pc + du + 0.012, 1.11, 1.135, midN + s * 0.03, midN + s * 0.038, {});
    bx("metal", pc - 0.05, pc + 0.05, 1.05, 1.08, midN + s * 0.03, midN + s * 0.034, { color: C.steel, texel: 3 });
  }

  // ---- static colliders: jambs + lintel (the leaves are dynamic, returned by the system)
  const cn0 = -(T + PR);
  const cn1 = paired ? T + PR : T;
  for (const sgn of [-1, 1]) coll(sgn * (hw - LJ), sgn * (hw + F), 0, h + F, cn0, cn1, "door-jamb");
  coll(-(hw + F), hw + F, h - LJ, h + F, cn0, cn1, "door-lintel");

  return { lights };
}
