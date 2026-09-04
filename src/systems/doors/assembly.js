// Door assembly geometry for the doors system (COORDINATION.md §9.1).
//
// Every door is described in a local (u, v, n) frame: n = unit normal from room A toward room B
// (= room A's door `dir`), v = up, u = v × n across the opening. The opening centre at floor level
// is the origin. Room A's inner wall face is at n = -wallT(A), room B's at n = +wallT(B) (each room's
// declared thickness, default WALL_T); the leaves live on the shared plane n = 0 inside that gap.
// Everything here is axis-aligned so boxes are placed with min/max corners.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit } from "../../kit.js";
import { WALL_T, FRAME_W } from "./helper.js";
import { DECALS } from "./materials.js";

// Per-kind construction: lining = tunnel lining thickness (jambs + soffit), leafT = leaf thickness,
// proud = how far the reveal frame stands off the wall face, bar = lintel status-bar height.
export const KIND_SPEC = {
  standard: { lining: 0.06, leafT: 0.08, proud: 0.06, split: "side", bar: 0.05, hazard: false },
  hatch: { lining: 0.05, leafT: 0.06, proud: 0.05, split: "side", bar: 0.04, hazard: false },
  blast: { lining: 0.1, leafT: 0.16, proud: 0.1, split: "vertical", bar: 0.08, hazard: true },
  bay: { lining: 0.14, leafT: 0.16, proud: 0.14, split: "vertical", bar: 0.12, hazard: true },
};
// Bay doors carry their own w/h; their leaves share one geometry built at this size and scaled per
// instance (all planned bays are within ±25 % of this aspect, so relief and stripes stay in proportion).
export const BAY_REF = { w: 13.5, h: 10 };

export const SEAM = 0.004; // half gap at the meeting line of the two leaves
export const RECESS = 0.02; // depth of the pocket slots cut into the lining
export const OPEN_CLEAR = 0.85; // open fraction above which leaf colliders are parked out of the path
export const VIS_EDGE = 0.1; // leaf edge left showing in the reveal when open (side leaves, top leaves)
export const VIS_SILL = 0.035; // bottom leaf edge left above the sill when open
export const OUTER_BAND = 0.2; // second surround band beyond FRAME_W (clamped to the wall available)

export function doorColours(PALETTE) {
  const P = (k, fb) => (PALETTE && PALETTE[k] ? PALETTE[k] : new THREE.Color(fb));
  return {
    frame: P("impMid", "#5a5e66"),
    lip: P("impDark", "#33363c"),
    corner: P("gunmetal", "#4a4e55"),
    black: P("impBlack", "#111214"),
    lining: P("impMid", "#5a5e66"),
    steel: P("steel", "#9ea3aa"),
    red: P("impRed", "#ff2a1a"),
    core: new THREE.Color("#52565e"), // leaf body showing between the plates (panel lines)
    plate: new THREE.Color("#a2a6ad"), // light-grey face inset
    plateMid: new THREE.Color("#7c8088"), // armour plates on blast / bay leaves
    kick: new THREE.Color("#62666e"),
    yellow: new THREE.Color("#e8b923"),
    stripeBlack: new THREE.Color("#0c0d10"),
    white: new THREE.Color("#ffffff"),
  };
}

// Half width (along n) of the pocket slot the leaves run in. Vertical leaves carry lugs / ribs.
export function slotHalf(kind, split) {
  const s = KIND_SPEC[kind];
  return s.leafT / 2 + (split === "vertical" ? (s.hazard ? 0.05 : 0.02) : 0.01);
}

/**
 * Closed-position extents of ONE leaf in leaf-local coordinates (x across, y up, z = thickness).
 * side: the left leaf (x <= 0); the right leaf is this geometry rotated 180° about the vertical axis.
 * vertical: the bottom leaf; the top leaf is this geometry rotated 180° about the normal through (0, h/2).
 * travel* = visible travel (the leaf edge stays in the reveal), park* = collider travel when clear.
 */
export function leafLayout(kind, split, w, h) {
  const s = KIND_SPEC[kind];
  const hw = w / 2;
  const LJ = s.lining;
  const XW = hw - LJ + 0.01; // 1 cm into the jamb lining / pocket recess so no slit is ever visible
  if (split === "side") {
    const travel = XW - SEAM - VIS_EDGE;
    return { x0: -XW, x1: -SEAM, y0: 0.005, y1: h - LJ + 0.02, z0: -s.leafT / 2, z1: s.leafT / 2, travel, park: travel };
  }
  const y1 = h / 2 - SEAM;
  const up = h - LJ + 0.01 - VIS_EDGE - (h / 2 + SEAM); // top leaf's bottom edge ends VIS_EDGE below the soffit
  return {
    x0: -XW,
    x1: XW,
    y0: -0.015,
    y1,
    z0: -s.leafT / 2,
    z1: s.leafT / 2,
    travelDown: y1 - VIS_SILL, // bottom leaf parks with VIS_SILL of its edge above the sill
    parkDown: y1 + 0.03, // ... but its collider drops fully below the floor
    travelUp: up,
    parkUp: up,
  };
}

// Wall length needed beside the hole (beyond hw) for a side-sliding leaf to retract into the wall.
export function sidePocketNeeded(kind, w) {
  const s = KIND_SPEC[kind];
  const XW = w / 2 - s.lining + 0.01;
  return 2 * XW - SEAM - VIS_EDGE - w / 2 + 0.05;
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

// Meeting-edge bar width (steel strip along the edge the two leaves meet at). Standard / hatch keep it
// narrow so the light seam beside it is still inside the VIS_EDGE that shows when the leaf is parked.
function meetBar(kind, split, w) {
  if (KIND_SPEC[kind].hazard) return kind === "bay" ? 0.06 : 0.04;
  return split === "side" ? Math.min(0.04, (w / 2) * 0.05) : 0.03;
}

/**
 * Light seam on the meeting edge (standard / hatch): a thin status-coloured strip in a recessed channel,
 * in leaf-local coordinates (centre + size). Hazard kinds carry the chevron band instead → null.
 */
export function leafSeam(kind, split, w, h) {
  const s = KIND_SPEC[kind];
  if (s.hazard) return null;
  const L = leafLayout(kind, split, w, h);
  const LT = s.leafT;
  const MB = meetBar(kind, split, w);
  if (split === "side") return { c: [L.x1 - MB - 0.02, (L.y0 + L.y1) / 2, 0], size: [0.012, L.y1 - L.y0 - 0.1, LT + 0.006] };
  return { c: [0, L.y1 - MB - 0.024, 0], size: [L.x1 - L.x0 - 0.24, 0.012, LT + 0.006] };
}

/**
 * Detailed leaf geometry in leaf-local space (see leafLayout). Vertex colours carry the light-grey
 * face insets, edge bars and hazard stripes; the instanced material adds the worn-metal maps.
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
  const MB = meetBar(kind, split, w);
  if (split === "side") {
    const H = L.y1 - L.y0;
    // steel meeting-edge bar, a touch proud of both faces (this is what stays visible when open)
    box(L.x1 - MB, L.x1, L.y0, L.y1, -LT / 2 - 0.004, LT / 2 + 0.004, C.steel);
    box(L.x0, L.x0 + 0.03, L.y0, L.y1, -LT / 2, LT / 2, C.lip); // outer edge (into the pocket)
    const px0 = L.x0 + 0.05;
    const px1 = L.x1 - MB - 0.04;
    const rows =
      H > 2.2
        ? [
            [L.y0 + 0.03, L.y0 + 0.42, C.kick],
            [L.y0 + 0.46, L.y1 - 0.5, C.plate],
            [L.y1 - 0.46, L.y1 - 0.03, C.plateMid],
          ]
        : [
            [L.y0 + 0.03, L.y0 + 0.3, C.kick],
            [L.y0 + 0.34, L.y1 - 0.03, C.plate],
          ];
    for (const [zA, zB] of faces) {
      for (const [ya, yb, col] of rows) box(px0, px1, ya, yb, zA, zB, col);
      // recessed seam channel between the plates and the bar (the light seam instance sits in it)
      box(L.x1 - MB - 0.032, L.x1 - MB - 0.006, L.y0 + 0.04, L.y1 - 0.04, zA, zB, C.black);
    }
  } else {
    const W = L.x1 - L.x0;
    box(L.x0, L.x1, L.y1 - MB, L.y1, -LT / 2 - 0.004, LT / 2 + 0.004, C.steel); // meeting-edge bar
    const px0 = L.x0 + 0.06;
    const px1 = L.x1 - 0.06;
    if (s.hazard) {
      // the door's one hazard element: black band with yellow chevrons along the meeting edge
      const HB = kind === "bay" ? 0.5 : 0.24;
      const bandY1 = L.y1 - MB - 0.015;
      const bandY0 = bandY1 - HB;
      for (const [zA, zB] of faces) box(px0, px1, bandY0, bandY1, zA, zB, C.stripeBlack);
      const pitch = kind === "bay" ? 0.36 : 0.17;
      for (const sgn of [-1, 1]) {
        const { yellow, black } = hazardBand(px0 + 0.02, px1 - 0.02, bandY0 + 0.02, bandY1 - 0.02, sgn * (LT / 2 + 0.002), pitch, sgn < 0);
        if (yellow) k.add("leaf", yellow, { color: C.yellow, uv: "keep" });
        if (black) k.add("leaf", black, { color: C.stripeBlack, uv: "keep" });
      }
      // armour plates below the band
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
            box(xa, xa + cw, ya, ya + rh, zA, zB, C.plateMid);
          }
        }
      }
      // stiffener ribs in the column gaps, proud of the plates
      for (let c = 1; c < cols; c++) {
        const xg = px0 + c * (cw + gap) - gap / 2;
        box(xg - 0.012, xg + 0.012, py0, py1, -(LT / 2 + 0.008), LT / 2 + 0.008, C.corner);
      }
      // interlocking lugs straddling the meeting edge: 4 cm of relief over a black shadow gap;
      // asymmetric spacing so the mirrored top leaf's set interlocks
      const nl = kind === "bay" ? 5 : 3;
      const lw = kind === "bay" ? 0.5 : 0.24;
      const ly0 = L.y1 - MB - HB * 0.55;
      for (let i = 0; i < nl; i++) {
        const xc = L.x0 + ((i + 0.3) / nl) * (L.x1 - L.x0);
        box(xc - lw / 2 - 0.02, xc + lw / 2 + 0.02, ly0 - 0.02, L.y1, -(LT / 2 + 0.012), LT / 2 + 0.012, C.black);
        box(xc - lw / 2, xc + lw / 2, ly0, L.y1 - 0.005, -(LT / 2 + 0.04), LT / 2 + 0.04, C.steel);
        // bevel line across the lug face
        box(xc - lw / 2 + 0.02, xc + lw / 2 - 0.02, ly0 + (L.y1 - ly0) * 0.5 - 0.004, ly0 + (L.y1 - ly0) * 0.5 + 0.004, -(LT / 2 + 0.041), LT / 2 + 0.041, C.corner);
      }
    } else {
      // standard / hatch: latch channel under the meeting bar (the light seam instance runs in it),
      // light-grey face insets in two columns
      const chY1 = L.y1 - MB - 0.008;
      const chY0 = chY1 - 0.034;
      const py0 = L.y0 + 0.04;
      const py1 = chY0 - 0.035;
      const cols = W > 1.6 ? 2 : 1;
      const gap = 0.03;
      const cw = (px1 - px0 - gap * (cols - 1)) / cols;
      const rowsN = py1 - py0 > 1.0 ? 2 : 1;
      const rh = (py1 - py0 - gap * (rowsN - 1)) / rowsN;
      for (const [zA, zB] of faces) {
        box(L.x0 + 0.1, L.x1 - 0.1, chY0, chY1, zA, zB, C.black);
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rowsN; r++) {
            const xa = px0 + c * (cw + gap);
            const ya = py0 + r * (rh + gap);
            box(xa, xa + cw, ya, ya + rh, zA, zB, r === 0 && rowsN > 1 ? C.kick : C.plate);
          }
        }
      }
    }
  }
  const g = mergeGeometries(k.groups.get("leaf"), false);
  g.computeBoundingSphere();
  return g;
}

// Plane geometry with UVs pointing at one decal-atlas cell (w × h metres, facing +z).
function decalPlane(name, w, h) {
  const r = DECALS[name];
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + (r.u1 - r.u0) * uv.getX(i), r.v0 + (r.v1 - r.v0) * uv.getY(i));
  return g;
}

// ---------------------------------------------------------------------------
// Static assembly through the module kit (merged per material)
// ---------------------------------------------------------------------------
/**
 * @param {Kit} kit module kit
 * @param {object} C colours from doorColours()
 * @param {object} d { pos:[x,y,z], U:Vector3, N:Vector3, w, h, kind, spec, split, paired, leafN,
 *                     wallT:[tA, tB], faces:[{ s:-1|1, top, ceil, avail:[neg,plus], sealed, bay, stairs }] }
 *                   wallT = wall thickness of room A (n < 0) and room B (n > 0), default WALL_T each,
 *                   top = frame top (v) already clamped to the room, avail = wall beside the hole (m),
 *                   sealed = `to: null` door (red bar + SEALED plate), bay = leads into a bay (hazard
 *                   apron), stairs = leads to the stairs (pictogram plate)
 * @returns {{ lights: {pos:number[], size:number[], role:string, face:number}[] }}
 */
export function buildStatic(kit, C, d) {
  const { w, h, kind, spec, split, paired } = d;
  const hw = w / 2;
  const LJ = spec.lining;
  const PR = spec.proud;
  const TA = d.wallT && d.wallT[0] > 0 ? d.wallT[0] : WALL_T; // room A's wall (n < 0)
  const TB = d.wallT && d.wallT[1] > 0 ? d.wallT[1] : TA; // room B's wall (n > 0)
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
  // decal plane facing the room on face s (x → s·U so the text reads left to right from inside)
  const decal = (name, pw, ph, uu, vv, nn, s) => {
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(d.U.clone().multiplyScalar(s), new THREE.Vector3(0, 1, 0), d.N.clone().multiplyScalar(s)));
    kit.add("doorDecal", decalPlane(name, pw, ph), { pos: P(uu, vv, nn), quat: q, uv: "keep" });
  };
  const lights = [];
  const blackOpts = { color: C.black, texel: 1 };
  const steelOpts = { color: C.steel, texel: 3 };
  const lipOpts = { color: C.lip, texel: 1 };
  const frameOpts = { color: C.frame, texel: 1 };
  const outerBand = (f) => Math.max(0, Math.min(OUTER_BAND, Math.min(f.avail[0], f.avail[1]) - F - 0.02));
  const OBmax = Math.max(0, ...d.faces.map(outerBand));

  // ---- tunnel lining between the two inner faces (unpaired: the declaring wall, capped behind)
  const nA = -TA + 0.01;
  const nB = paired ? TB - 0.01 : TA - 0.03;
  const zc = d.leafN; // leaf plane centre along n (0 when paired; pulled toward room A when capped)
  const slot = slotHalf(kind, split);
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
        const r1 = Math.max(nA, Math.min(nB, zc + q * (slot + 0.04)));
        if (Math.abs(r1 - r0) < 0.006 || (q < 0 && r1 > r0) || (q > 0 && r1 < r0)) continue;
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

  // ---- sill: raised dark plate spanning the whole visible frame on both faces, lighter nosing
  // along each edge (steel; yellow line on blast / bay — the leaf band is their hazard element)
  const nT0 = -(TA + PR);
  const nT1 = paired ? TB + PR : nB;
  const sillU = hw + F + OBmax;
  bx("metal", -sillU, sillU, -0.04, 0.012, nT0, nT1, lipOpts);
  const noseMat = spec.hazard ? "paintedMetal" : "metal";
  const noseOpts = spec.hazard ? { color: C.yellow, texel: 2 } : steelOpts;
  bx(noseMat, -sillU, sillU, 0.012, 0.018, nT0, nT0 + 0.025, noseOpts);
  if (paired) bx(noseMat, -sillU, sillU, 0.012, 0.018, nT1 - 0.025, nT1, noseOpts);
  if (split === "vertical") {
    bx("paintedMetal", -(hw - LJ), hw - LJ, -0.04, 0.004, s0, s1, slotOpts);
    // steel edge strips either side of the slot so the sill reads as a machined track
    for (const q of [-1, 1]) bx("metal", -(hw - LJ), hw - LJ, 0.012, 0.02, zc + q * slot, zc + q * (slot + 0.03), steelOpts);
  } else {
    // shallow floor track under the leaf plane
    bx("metal", -(hw - LJ), hw - LJ, 0.012, 0.02, s0 - 0.02, s1 + 0.02, { color: C.black, texel: 2 });
  }

  // ---- unpaired: sealed slab behind the leaves (future expansion / neighbour not built)
  if (!paired) {
    const capN = s1 + 0.01; // cap slab front face
    bx("paintedMetal", -(hw - LJ + 0.005), hw - LJ + 0.005, -0.02, h - LJ + 0.005, capN, nB, { color: C.black, texel: 1 });
    // X-brace (1 cm proud of the slab) + red seal bar, sized with the opening
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

  // ---- per room face: reveal frame, outer band, header track + housed status bar, panel, variants
  for (const f of d.faces) {
    const s = f.s;
    const T = s < 0 ? TA : TB; // this room's wall thickness: its inner face is at |n| = T
    const top = f.top;
    const OB = outerBand(f);
    const embedN = T - 0.02;
    const midN = T + PR * 0.55;
    const faceN = T + PR;
    const nn = (a) => s * a; // n coordinate on this face (mm() sorts min/max)
    for (const sgn of [-1, 1]) {
      // inner reveal plate: from the lining's inner face out to FRAME_W beyond the hole
      bx("paintedMetal", sgn * (hw - LJ), sgn * (hw + F), 0.025, h - LJ, nn(embedN), nn(midN), frameOpts);
      // raised lip hugging the opening
      bx("paintedMetal", sgn * (hw - LJ), sgn * (hw - LJ + 0.08), 0.025, h - LJ + 0.08, nn(midN - 0.005), nn(faceN), lipOpts);
      // lit reveal strip on the lip, right at the opening edge (the reveal is never a black slit)
      bx("emitWhite", sgn * (hw - LJ + 0.006), sgn * (hw - LJ + 0.02), 0.2, h - LJ - 0.2, nn(faceN - 0.012), nn(faceN + 0.002), { uv: "keep" });
      // recessed black seam down the plate
      bx("paintedMetal", sgn * (hw + F - 0.051), sgn * (hw + F - 0.039), 0.08, h - LJ - 0.04, nn(midN - 0.002), nn(midN + 0.004), blackOpts);
      // bolt heads
      for (const fr of [0.12, 0.5, 0.88]) {
        const v = 0.025 + (h - LJ - 0.05) * fr;
        bx("metal", sgn * (hw + F - 0.135), sgn * (hw + F - 0.105), v - 0.015, v + 0.015, nn(midN), nn(midN + 0.012), steelOpts);
      }
    }
    // lintel plate
    bx("paintedMetal", -(hw + F), hw + F, h - LJ, top, nn(embedN), nn(midN), frameOpts);
    // heavy corner blocks
    for (const sgn of [-1, 1]) {
      bx("paintedMetal", sgn * (hw + F - 0.2), sgn * (hw + F - 0.01), top - 0.2, top - 0.01, nn(midN - 0.005), nn(faceN + 0.01), { color: C.corner, texel: 1 });
    }
    // second, stepped-back surround band (≥ 0.4 m of visible frame in total) with a panel groove
    if (OB >= 0.05) {
      const topO = Math.min(top + OB, f.ceil - 0.02);
      const oN1 = T + PR * 0.5;
      for (const sgn of [-1, 1]) {
        bx("paintedMetal", sgn * (hw + F), sgn * (hw + F + OB), 0, topO, nn(embedN), nn(oN1), lipOpts);
        bx("paintedMetal", sgn * (hw + F + OB - 0.045), sgn * (hw + F + OB - 0.033), 0.1, topO - 0.08, nn(oN1 - 0.004), nn(oN1 + 0.002), blackOpts);
      }
      if (topO > top + 0.01) bx("paintedMetal", -(hw + F + OB), hw + F + OB, top, topO, nn(embedN), nn(oN1), lipOpts);
      if (topO > top + 0.07) bx("paintedMetal", -(hw + F + OB - 0.08), hw + F + OB - 0.08, topO - 0.045, topO - 0.033, nn(oN1 - 0.004), nn(oN1 + 0.002), blackOpts);
    }
    // header: black housing right above the soffit (it is the lintel lip) with the leaf track
    // (channel + steel rail) along its bottom and the full-width status bar behind a steel bezel above
    const hv0 = h - LJ;
    const hv1 = Math.min(top - 0.02, h - LJ + 0.2);
    const bw = Math.max(0.4, w - 0.5);
    if (hv1 - hv0 >= 0.085) {
      const HW = Math.max(hw - LJ + 0.08, hw + F - 0.22); // clear of the corner blocks
      bx("paintedMetal", -HW, HW, hv0, hv1, nn(midN - 0.005), nn(faceN + 0.03), blackOpts);
      bx("metal", -(hw - LJ + 0.03), hw - LJ + 0.03, hv0 + 0.006, hv0 + 0.036, nn(faceN + 0.03), nn(faceN + 0.038), { color: C.corner, texel: 2 });
      bx("metal", -(hw - LJ), hw - LJ, hv0 + 0.014, hv0 + 0.028, nn(faceN + 0.038), nn(faceN + 0.046), steelOpts);
      const avail = hv1 - (hv0 + 0.044);
      const bh = Math.min(spec.bar, Math.max(0.025, avail - 0.03));
      const lv = hv0 + 0.044 + avail / 2;
      // bezel: four steel rails around a recess; the bar sits 3 mm below the bezel face
      const iu = bw / 2 + 0.006;
      const iv0 = lv - bh / 2 - 0.006;
      const iv1 = lv + bh / 2 + 0.006;
      const ou = iu + 0.014;
      bx("metal", -ou, ou, iv1, iv1 + 0.012, nn(faceN + 0.03), nn(faceN + 0.04), steelOpts);
      bx("metal", -ou, ou, iv0 - 0.012, iv0, nn(faceN + 0.03), nn(faceN + 0.04), steelOpts);
      bx("metal", -ou, -iu, iv0, iv1, nn(faceN + 0.03), nn(faceN + 0.04), steelOpts);
      bx("metal", iu, ou, iv0, iv1, nn(faceN + 0.03), nn(faceN + 0.04), steelOpts);
      lights.push({ pos: P(0, lv, nn(faceN + 0.034)), size: [bw, bh, 0.006], role: "bar", face: s });
    } else {
      // very low ceiling: plain lintel lip carrying the bar
      bx("paintedMetal", -(hw - LJ + 0.08), hw - LJ + 0.08, hv0, Math.max(hv1, hv0 + 0.05), nn(midN - 0.005), nn(faceN), lipOpts);
      lights.push({ pos: P(0, hv0 + 0.03, nn(faceN + 0.01)), size: [bw, 0.025, 0.02], role: "bar", face: s });
    }
    // door control panel on the +u jamb (matte black, housed status LED, three keys) and a second
    // housed LED on the -u jamb so the state reads from either side of the frame
    const pu0 = hw + 0.04;
    const pu1 = hw + F - 0.03;
    const pc = (pu0 + pu1) / 2;
    bx("darkGloss", pu0, pu1, 1.02, 1.34, nn(midN), nn(midN + 0.03), {});
    for (const du of [-0.04, 0, 0.04]) bx("emitBlue", pc + du - 0.012, pc + du + 0.012, 1.11, 1.135, nn(midN + 0.03), nn(midN + 0.038), {});
    bx("metal", pc - 0.05, pc + 0.05, 1.05, 1.08, nn(midN + 0.03), nn(midN + 0.034), steelOpts);
    for (const side of [1, -1]) {
      const cu = side * pc;
      if (side < 0) bx("paintedMetal", -pu1, -pu0, 1.22, 1.34, nn(midN), nn(midN + 0.03), blackOpts);
      // LED bezel (steel frame) + recessed LED
      const lw = 0.08;
      const lh = 0.035;
      bx("metal", cu - lw / 2 - 0.014, cu + lw / 2 + 0.014, 1.28 - lh / 2 - 0.012, 1.28 - lh / 2 - 0.002, nn(midN + 0.03), nn(midN + 0.04), steelOpts);
      bx("metal", cu - lw / 2 - 0.014, cu + lw / 2 + 0.014, 1.28 + lh / 2 + 0.002, 1.28 + lh / 2 + 0.012, nn(midN + 0.03), nn(midN + 0.04), steelOpts);
      bx("metal", cu - lw / 2 - 0.014, cu - lw / 2 - 0.002, 1.28 - lh / 2 - 0.002, 1.28 + lh / 2 + 0.002, nn(midN + 0.03), nn(midN + 0.04), steelOpts);
      bx("metal", cu + lw / 2 + 0.002, cu + lw / 2 + 0.014, 1.28 - lh / 2 - 0.002, 1.28 + lh / 2 + 0.002, nn(midN + 0.03), nn(midN + 0.04), steelOpts);
      lights.push({ pos: P(cu, 1.28, nn(midN + 0.034)), size: [lw, lh, 0.006], role: "led", face: s });
    }
    // stairs: pictogram plate on the -u jamb reveal
    if (f.stairs) {
      bx("paintedMetal", -(hw - LJ + 0.225), -(hw - LJ + 0.085), 1.51, 1.69, nn(midN), nn(midN + 0.008), blackOpts);
      decal("stairs", 0.12, 0.12, -(hw - LJ + 0.155), 1.6, nn(midN + 0.0095), s);
    }
    // leads into a bay: wide black/yellow threshold apron on this side (the door's hazard element)
    if (f.bay) {
      bx("doorHazard", -(hw + F + OB), hw + F + OB, -0.04, 0.014, nn(T + PR * 0.3), nn(T + PR + 0.55), { color: C.white, texel: 0.5 });
      bx("metal", -(hw + F + OB), hw + F + OB, 0.014, 0.02, nn(T + PR + 0.53), nn(T + PR + 0.55), steelOpts);
    }
    // sealed (`to: null`): red cross-bar bolted across the frame with a lit SEALED plate + red line
    if (f.sealed) {
      const BH = Math.min(0.4, 0.24 + Math.max(0, w - 2.4) * 0.06);
      const bv0 = 1.18 - BH / 2;
      const bv1 = 1.18 + BH / 2;
      const bu = hw + F + OB - 0.02;
      bx("paintedMetal", -bu, bu, bv0, bv1, nn(faceN + 0.03), nn(faceN + 0.11), { color: C.red, texel: 1 });
      for (const sgn of [-1, 1]) bx("paintedMetal", sgn * (bu - 0.1), sgn * bu, bv0 - 0.04, bv1 + 0.04, nn(embedN), nn(faceN + 0.12), blackOpts);
      bx("emitRedImp", -(hw + F * 0.6), hw + F * 0.6, bv0 + 0.012, bv0 + 0.026, nn(faceN + 0.11), nn(faceN + 0.116), {});
      const ph = BH - 0.06;
      decal("sealed", ph * DECALS.sealed.aspect, ph, 0, 1.18 + 0.01, nn(faceN + 0.111), s);
      coll(-bu, bu, bv0 - 0.04, bv1 + 0.04, nn(T), nn(faceN + 0.12), "door-sealed-bar");
    }
  }

  // ---- static colliders: jambs + lintel (the leaves are dynamic, returned by the system)
  const cn0 = -(TA + PR);
  const cn1 = paired ? TB + PR : TA;
  for (const sgn of [-1, 1]) coll(sgn * (hw - LJ), sgn * (hw + F + OBmax), 0, h + F, cn0, cn1, "door-jamb");
  coll(-(hw + F + OBmax), hw + F + OBmax, h - LJ, h + F, cn0, cn1, "door-lintel");

  return { lights };
}
