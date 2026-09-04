// Corridor detail kit for Deck 1 (Agent B). Everything here is layered ON TOP of the shell that shared/imperial.js
// roomShell() + corridorDressing() build (floor, ceiling, panelled walls, centre strip): structural ribs carrying
// conduits, cable trays, handrails on both walls, floor grating strips, a per-bay kit (vent grille under the strip,
// fire-suppression / comm panel, kick plate with linear scuffs, 1.0 / 1.4 m overlay plates), one centre feature per
// bay (junction box / vent / intercom / signage / cable drop / gauges) with a locker, service hatch or equipment
// alcove every third bay, backlit signage panels, yellow-black hazard chevrons, recessed status housings and end
// treatments. Functions take (kit, frame, world numbers, opts) so the same code can be layered on D's
// corridorSegment() when it lands (§9.3) — nothing here rebuilds walls, floor or ceiling.
//
// Emitters: every light this kit adds is a narrow lens set back inside a dark housing (a 1–2 cm strip or a bezelled
// LED), never a bare bar. Long thin boxes / pipes are split into ≤ SEG m pieces: a single 100 m triangle straddling
// the camera plane leaks through walls under software GL (depth interpolation precision).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { doorHole, doorFace } from "../shared/doors.js";
import { WALL_T } from "../shared/imperial.js";
import { labelRect, arrowRect, chevronRect, boardRect, BOARD_ASPECT, LABEL_ASPECT } from "./signage.js";

export const CABLE = {
  black: IMP.black,
  grey: IMP.hullDark,
  red: new THREE.Color("#6a231c"),
  amber: new THREE.Color("#7a5a1e"),
};
export const SEG = 6;
export const RED_CAB = new THREE.Color("#8e1d15"); // fire equipment cabinets (clean painted red, never rust)
const KICK = new THREE.Color("#0d0e11");
const SCUFF_LIGHT = new THREE.Color("#4a4e57");
const SCUFF_DARK = new THREE.Color("#07080a");

/** Split [s0,s1] into ≤ seg m pieces. */
export function segs(s0, s1, seg = SEG) {
  const n = Math.max(1, Math.ceil((s1 - s0) / seg));
  const out = [];
  for (let i = 0; i < n; i++) out.push([s0 + ((s1 - s0) * i) / n, s0 + ((s1 - s0) * (i + 1)) / n]);
  return out;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

/**
 * Wall frame for one bounds face (inner face plane). `a` runs along the wall (x for n/s faces, z for w/e faces),
 * `d` is the distance proud of the inner face (negative = into the wall). `leftSign` is the direction along `a`
 * that a viewer facing the wall calls "left".
 */
export function wallFrame(bounds, face, wallT = WALL_T) {
  const [mn, mx] = [bounds.min, bounds.max];
  let plane;
  let n;
  let axis;
  let yaw;
  if (face === "n") [plane, n, axis, yaw] = [mn[2] + wallT, 1, "x", 0];
  else if (face === "s") [plane, n, axis, yaw] = [mx[2] - wallT, -1, "x", Math.PI];
  else if (face === "w") [plane, n, axis, yaw] = [mn[0] + wallT, 1, "z", Math.PI / 2];
  else [plane, n, axis, yaw] = [mx[0] - wallT, -1, "z", -Math.PI / 2];
  const a0 = axis === "x" ? mn[0] + wallT : mn[2] + wallT;
  const a1 = axis === "x" ? mx[0] - wallT : mx[2] - wallT;
  const leftSign = face === "n" || face === "e" ? -1 : 1;
  const pt = (a, y, d) => (axis === "x" ? [a, y, plane + n * d] : [plane + n * d, y, a]);
  const mm = (aa0, aa1, y0, y1, d0, d1) => {
    const t0 = plane + n * d0;
    const t1 = plane + n * d1;
    const tmin = Math.min(t0, t1);
    const tmax = Math.max(t0, t1);
    const lo = Math.min(aa0, aa1);
    const hi = Math.max(aa0, aa1);
    return axis === "x" ? [[lo, y0, tmin], [hi, y1, tmax]] : [[tmin, y0, lo], [tmax, y1, hi]];
  };
  const wf = {
    face,
    plane,
    n,
    axis,
    yaw,
    a0,
    a1,
    leftSign,
    pt,
    // box spanning a∈[aa0,aa1] × y∈[y0,y1] × d∈[d0,d1]
    box(kit, mat, aa0, aa1, y0, y1, d0, d1, opts = {}) {
      if (Math.abs(aa1 - aa0) < 1e-4 || y1 - y0 < 1e-4 || Math.abs(d1 - d0) < 1e-4) return;
      const [lo, hi] = mm(aa0, aa1, y0, y1, d0, d1);
      kit.boxMM(mat, lo, hi, opts);
    },
    collider(kit, aa0, aa1, y0, y1, d0, d1, tag = "fixture") {
      const [lo, hi] = mm(aa0, aa1, y0, y1, d0, d1);
      kit.collider(lo, hi, tag);
    },
    // textured quad w×h centred at (a, y), proud d, facing into the room. vertical: the atlas cell's long axis runs up
    quad(kit, mat, a, y, d, w, h, rect, { vertical = false } = {}) {
      let g;
      if (vertical) {
        g = new THREE.PlaneGeometry(h, w);
        g.rotateZ(Math.PI / 2);
      } else g = new THREE.PlaneGeometry(w, h);
      kit.add(mat, g, { pos: pt(a, y, d), rot: [0, yaw, 0], uv: "keep", uvRect: rect });
    },
    // cylinder running along the wall from aa0 to aa1 at height y, its axis d proud of the face
    pipe(kit, mat, aa0, aa1, y, d, r, opts = {}) {
      const len = Math.abs(aa1 - aa0);
      if (len < 1e-3) return;
      const c = pt((aa0 + aa1) / 2, y, d);
      kit.cyl(mat, c[0], c[1], c[2], r, len, axis, { segments: 10, texel: 1, ...opts });
    },
    // cylinder sticking out of the wall (axis = wall normal) at (a, y), from d0 to d1
    stub(kit, mat, a, y, d0, d1, r, opts = {}) {
      const c = pt(a, y, (d0 + d1) / 2);
      kit.cyl(mat, c[0], c[1], c[2], r, Math.abs(d1 - d0), axis === "x" ? "z" : "x", { segments: 10, texel: 1, ...opts });
    },
    // torus lying in the wall plane (axis = wall normal) centred at (a, y), proud d
    ring(kit, mat, a, y, d, R, r, opts = {}) {
      const g = new THREE.TorusGeometry(R, r, 6, 18);
      kit.add(mat, g, { pos: pt(a, y, d), rot: [0, yaw, 0], texel: 2, ...opts });
    },
  };
  return wf;
}

/** Straight corridor: along axis, side/end walls, interior extents and the side-wall doors as along-coordinates. */
export function corridorFrame(manifest, floorY, ceilY, wallT = WALL_T) {
  const b = manifest.bounds;
  const alongZ = b.max[2] - b.min[2] > b.max[0] - b.min[0];
  const sides = alongZ ? ["w", "e"] : ["n", "s"];
  const ends = alongZ ? ["n", "s"] : ["w", "e"];
  const walls = {};
  for (const f of [...sides, ...ends]) walls[f] = wallFrame(b, f, wallT);
  const a0 = alongZ ? b.min[2] + wallT : b.min[0] + wallT;
  const a1 = alongZ ? b.max[2] - wallT : b.max[0] - wallT;
  const c0 = alongZ ? b.min[0] + wallT : b.min[2] + wallT;
  const c1 = alongZ ? b.max[0] - wallT : b.max[2] - wallT;
  const doorInfo = (d) => ({ ...doorHole(d), face: doorFace(d), id: d.id, kind: d.kind, a: alongZ ? d.pos[2] : d.pos[0], c: alongZ ? d.pos[0] : d.pos[2] });
  const all = (manifest.doors || []).map(doorInfo);
  return {
    bounds: b,
    alongZ,
    axis: alongZ ? "z" : "x",
    sides,
    ends,
    walls,
    a0,
    a1,
    c0,
    c1,
    mid: (c0 + c1) / 2,
    W: c1 - c0,
    floorY,
    ceilY,
    H: ceilY - floorY,
    sideDoors: all.filter((d) => sides.includes(d.face)),
    endDoors: all.filter((d) => ends.includes(d.face)),
    pt: (a, y, c) => (alongZ ? [c, y, a] : [a, y, c]),
    // box spanning along [aa0,aa1] × y × across [cc0,cc1]
    box(kit, mat, aa0, aa1, y0, y1, cc0, cc1, opts = {}) {
      if (alongZ) kit.boxMM(mat, [Math.min(cc0, cc1), y0, Math.min(aa0, aa1)], [Math.max(cc0, cc1), y1, Math.max(aa0, aa1)], opts);
      else kit.boxMM(mat, [Math.min(aa0, aa1), y0, Math.min(cc0, cc1)], [Math.max(aa0, aa1), y1, Math.max(cc0, cc1)], opts);
    },
  };
}

/** Cut [a0,a1] by blocks [{a, w}] padded by `pad`; returns [[s0,s1], …] of at least minLen. */
export function spans(a0, a1, blocks, pad = 0.3, minLen = 0.3) {
  let out = [[a0, a1]];
  for (const b of blocks) {
    const lo = b.a - b.w / 2 - pad;
    const hi = b.a + b.w / 2 + pad;
    const next = [];
    for (const [s0, s1] of out) {
      if (hi <= s0 || lo >= s1) {
        next.push([s0, s1]);
        continue;
      }
      if (lo > s0) next.push([s0, lo]);
      if (hi < s1) next.push([hi, s1]);
    }
    out = next;
  }
  return out.filter(([s0, s1]) => s1 - s0 >= minLen);
}

/** Cut an existing span list by more blocks with their own padding. */
export function cutSpans(spanList, blocks, pad, minLen = 0.3) {
  return spanList.flatMap(([s0, s1]) => spans(s0, s1, blocks, pad, minLen));
}

// Flat textured quad on the floor: `long` runs along longAxis and carries the atlas cell's u axis.
export function floorQuad(kit, mat, center, long, short, rect, longAxis = "x") {
  const g = new THREE.PlaneGeometry(long, short);
  g.rotateX(-Math.PI / 2);
  if (longAxis === "z") g.rotateY(Math.PI / 2);
  kit.add(mat, g, { pos: center, uv: "keep", uvRect: rect });
}

/**
 * Brushed-steel floor inlay between [x,z] points p0 → p1 (axis-aligned): two 8 cm rough-steel strips either side of
 * a 2 cm groove whose lens sits flush 1 mm below the strip tops — a physical plate with a thin lit inset, not a
 * glowing line. (A lens sunk deeper than that is hidden by the near lip at grazing angles and the remaining sliver
 * aliases into a dotted line.) Rides 1.5 mm over a 12 mm centre strip where it crosses one.
 */
export function floorInlay(kit, floorY, p0, p1, emit = "emitWhite", { strip = 0.08, groove = 0.02, lit = true } = {}) {
  const alongX = Math.abs(p1[0] - p0[0]) > Math.abs(p1[1] - p0[1]);
  const y0 = floorY + 0.005;
  const yTop = floorY + 0.018;
  const yGroove = lit ? floorY + 0.011 : yTop - 0.003; // unlit: the groove is just a dark seam between the strips
  const yLens = yTop - 0.001;
  const hg = groove / 2;
  const steel = { color: IMP.steel, texel: 2 };
  if (alongX) {
    const [x0, x1] = [Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0])];
    const zc = p0[1];
    kit.boxMM("metalRough", [x0, y0, zc - hg - strip], [x1, yTop, zc - hg], steel);
    kit.boxMM("metalRough", [x0, y0, zc + hg], [x1, yTop, zc + hg + strip], steel);
    kit.boxMM("paintedMetal", [x0, y0, zc - hg], [x1, yGroove, zc + hg], { color: IMP.black, texel: 2 });
    if (lit) for (const [s0, s1] of segs(x0 + strip, x1 - strip)) kit.boxMM(emit, [s0, yGroove, zc - hg], [s1, yLens, zc + hg]);
  } else {
    const [z0, z1] = [Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1])];
    const xc = p0[0];
    kit.boxMM("metalRough", [xc - hg - strip, y0, z0], [xc - hg, yTop, z1], steel);
    kit.boxMM("metalRough", [xc + hg, y0, z0], [xc + hg + strip, yTop, z1], steel);
    kit.boxMM("paintedMetal", [xc - hg, y0, z0], [xc + hg, yGroove, z1], { color: IMP.black, texel: 2 });
    if (lit) for (const [s0, s1] of segs(z0 + strip, z1 - strip)) kit.boxMM(emit, [xc - hg, yGroove, s0], [xc + hg, yLens, s1]);
  }
}

/** Steel corner plate capping the ends of floor inlays. */
export function inlayCorner(kit, floorY, x, z, s = 0.1) {
  kit.boxMM("metalRough", [x - s, floorY + 0.005, z - s], [x + s, floorY + 0.02, z + s], { color: IMP.steel, texel: 2 });
  kit.boxMM("metal", [x - 0.02, floorY + 0.02, z - 0.02], [x + 0.02, floorY + 0.026, z + 0.02], { color: IMP.mid, texel: 2 });
}

/**
 * Raised walkway of deck plates over x∈[x0,x1] × z∈[z0,z1]: 1.6 cm plates (tone `color`) separated by black seams
 * every `plate` m along z and one seam down the middle, so the field between two inlays reads as bolted plating
 * rather than an empty patch. Corner bolts on every plate.
 */
export function floorPlates(kit, floorY, x0, x1, z0, z1, { plate = 1.0, seam = 0.016, color = IMP.dark, split = true } = {}) {
  const yTop = floorY + 0.016;
  kit.boxMM("paintedMetal", [x0, floorY + 0.003, z0], [x1, floorY + 0.008, z1], { color: IMP.black, texel: 1 });
  const n = Math.max(1, Math.round((z1 - z0) / plate));
  const cols = split ? [[x0, (x0 + x1) / 2 - seam / 2], [(x0 + x1) / 2 + seam / 2, x1]] : [[x0, x1]];
  for (let i = 0; i < n; i++) {
    const za = z0 + ((z1 - z0) * i) / n + (i ? seam / 2 : 0);
    const zb = z0 + ((z1 - z0) * (i + 1)) / n - (i < n - 1 ? seam / 2 : 0);
    for (const [xa, xb] of cols) {
      kit.boxMM("metalRough", [xa, floorY + 0.008, za], [xb, yTop, zb], { color, texel: 1 });
      for (const bx of [xa + 0.07, xb - 0.07]) for (const bz of [za + 0.07, zb - 0.07]) kit.boxMM("metal", [bx - 0.015, yTop, bz - 0.015], [bx + 0.015, yTop + 0.004, bz + 0.015], { color: IMP.steel, texel: 2 });
    }
  }
}

/**
 * Recessed linear ceiling fixture between [x,z] points p0 → p1 (axis-aligned): two dark lips and end caps hanging
 * `h` below the ceiling around an opening whose lens (≈ 45 % of the fixture width) sits 4.5 cm up inside it.
 */
export function ceilingFixture(kit, ceilY, p0, p1, { w = 0.2, h = 0.09, lensW = 0.09, emit = "emitWhite", color = IMP.dark } = {}) {
  const alongX = Math.abs(p1[0] - p0[0]) > Math.abs(p1[1] - p0[1]);
  const lip = 0.05;
  const dk = { color, texel: 1 };
  const bx = (x0, z0, x1, z1, y0, mat, opts) => kit.boxMM(mat, [Math.min(x0, x1), y0, Math.min(z0, z1)], [Math.max(x0, x1), ceilY, Math.max(z0, z1)], opts);
  if (alongX) {
    const [x0, x1] = [Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0])];
    const zc = p0[1];
    bx(x0, zc - w / 2, x1, zc - w / 2 + lip, ceilY - h, "paintedMetal", dk);
    bx(x0, zc + w / 2 - lip, x1, zc + w / 2, ceilY - h, "paintedMetal", dk);
    bx(x0, zc - w / 2, x0 + 0.06, zc + w / 2, ceilY - h, "paintedMetal", dk);
    bx(x1 - 0.06, zc - w / 2, x1, zc + w / 2, ceilY - h, "paintedMetal", dk);
    bx(x0 + 0.06, zc - w / 2 + lip, x1 - 0.06, zc + w / 2 - lip, ceilY - 0.03, "paintedMetal", { color: IMP.black, texel: 1 });
    kit.boxMM(emit, [x0 + 0.1, ceilY - 0.045, zc - lensW / 2], [x1 - 0.1, ceilY - 0.03, zc + lensW / 2]);
  } else {
    const [z0, z1] = [Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1])];
    const xc = p0[0];
    bx(xc - w / 2, z0, xc - w / 2 + lip, z1, ceilY - h, "paintedMetal", dk);
    bx(xc + w / 2 - lip, z0, xc + w / 2, z1, ceilY - h, "paintedMetal", dk);
    bx(xc - w / 2, z0, xc + w / 2, z0 + 0.06, ceilY - h, "paintedMetal", dk);
    bx(xc - w / 2, z1 - 0.06, xc + w / 2, z1, ceilY - h, "paintedMetal", dk);
    bx(xc - w / 2 + lip, z0 + 0.06, xc + w / 2 - lip, z1 - 0.06, ceilY - 0.03, "paintedMetal", { color: IMP.black, texel: 1 });
    kit.boxMM(emit, [xc - lensW / 2, ceilY - 0.045, z0 + 0.1], [xc + lensW / 2, ceilY - 0.03, z1 - 0.1]);
  }
}

/** Square recessed downlight: four wall blocks around an opening, black back, lens set 4 cm up inside. */
export function downlight(kit, ceilY, x, z, { s = 0.32, t = 0.045, h = 0.1, lens = 0.15, emit = "emitWhite", color = IMP.dark } = {}) {
  const dk = { color, texel: 1 };
  kit.boxMM("metalRough", [x - s / 2, ceilY - h, z - s / 2], [x + s / 2, ceilY, z - s / 2 + t], dk);
  kit.boxMM("metalRough", [x - s / 2, ceilY - h, z + s / 2 - t], [x + s / 2, ceilY, z + s / 2], dk);
  kit.boxMM("metalRough", [x - s / 2, ceilY - h, z - s / 2 + t], [x - s / 2 + t, ceilY, z + s / 2 - t], dk);
  kit.boxMM("metalRough", [x + s / 2 - t, ceilY - h, z - s / 2 + t], [x + s / 2, ceilY, z + s / 2 - t], dk);
  kit.boxMM("paintedMetal", [x - s / 2 + t, ceilY - 0.04, z - s / 2 + t], [x + s / 2 - t, ceilY, z + s / 2 - t], { color: IMP.black, texel: 1 });
  kit.box(emit, x, ceilY - 0.048, z, lens, 0.016, lens);
}

// ---------------------------------------------------------------------------
// Small lit parts (all recessed / bezelled)
// ---------------------------------------------------------------------------

/** Bezelled LED: black bezel plate proud of `d`, a small lens 1.5 mm proud of the bezel face. */
export function led(kit, wf, a, y, d, mat, { s = 0.02 } = {}) {
  const b = s / 2 + 0.009;
  wf.box(kit, "paintedMetal", a - b, a + b, y - b, y + b, d, d + 0.012, { color: IMP.black, texel: 2 });
  wf.box(kit, mat, a - s / 2, a + s / 2, y - s / 2, y + s / 2, d + 0.012, d + 0.0135);
}

/**
 * Recessed linear lens on a wall: a dark channel (two lips + back) with a narrow emitter set back inside it.
 * Spans a∈[a0,a1] centred on y; `lip` = lip height, `lens` = emitter height (defaults 1.2 cm), `d` = lip face depth.
 */
export function lensStrip(kit, wf, a0, a1, y, { d = 0.05, lip = 0.03, gap = 0.05, lens = 0.012, recess = 0.012, emit = "emitWhite", color = IMP.dark } = {}) {
  const hg = gap / 2;
  wf.box(kit, "metalRough", a0, a1, y + hg, y + hg + lip, d - 0.04, d, { color, texel: 2 });
  wf.box(kit, "metalRough", a0, a1, y - hg - lip, y - hg, d - 0.04, d, { color, texel: 2 });
  wf.box(kit, "paintedMetal", a0, a1, y - hg, y + hg, d - 0.04, d - recess - 0.004, { color: IMP.black, texel: 2 });
  wf.box(kit, "metalRough", a0, a0 + 0.02, y - hg, y + hg, d - 0.04, d, { color, texel: 2 });
  wf.box(kit, "metalRough", a1 - 0.02, a1, y - hg, y + hg, d - 0.04, d, { color, texel: 2 });
  wf.box(kit, emit, a0 + 0.04, a1 - 0.04, y - lens / 2, y + lens / 2, d - recess - 0.004, d - recess);
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/** Structural ribs at along-positions: two-tone flanges with bolted face plates, kick blocks, a ceiling cross member
 *  with a recessed light line between two lips. heavy = junction ribs (with a recessed blue marker lens). */
export function ribs(kit, cf, positions, { heavy = false, color = IMP.dark, plate = IMP.mid, lamp = true, emit = "emitWhite" } = {}) {
  const { floorY, ceilY } = cf;
  const w = heavy ? 0.46 : 0.3;
  const d = heavy ? 0.28 : 0.2;
  for (const a of positions) {
    for (const face of cf.sides) {
      const wf = cf.walls[face];
      wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, floorY, ceilY, 0, d, { color, texel: 1 });
      wf.box(kit, "metalRough", a - w / 2 + 0.05, a + w / 2 - 0.05, floorY + 0.36, ceilY - d - 0.02, d - 0.01, d + 0.015, { color: plate, texel: 1 });
      const bolts = heavy ? [0.55, 1.25, 1.95, 2.65] : [0.55, 1.6, 2.65];
      for (const y of bolts) {
        for (const s of [-1, 1]) {
          const ba = a + s * (w / 2 - 0.09);
          wf.box(kit, "metal", ba - 0.025, ba + 0.025, floorY + y - 0.025, floorY + y + 0.025, d + 0.01, d + 0.035, { color: IMP.steel, texel: 2 });
        }
      }
      wf.box(kit, "paintedMetal", a - w / 2 - 0.02, a + w / 2 + 0.02, floorY, floorY + 0.14, -0.01, d + 0.03, { color: IMP.black, texel: 1 });
      if (heavy) {
        // vertical accent groove (two lips) with a recessed blue marker lens 1 cm behind the lip faces
        const g0 = floorY + 0.5;
        const g1 = ceilY - d - 0.1;
        wf.box(kit, "paintedMetal", a - 0.045, a - 0.015, g0, g1, d + 0.015, d + 0.032, { color: IMP.black, texel: 2 });
        wf.box(kit, "paintedMetal", a + 0.015, a + 0.045, g0, g1, d + 0.015, d + 0.032, { color: IMP.black, texel: 2 });
        wf.box(kit, "paintedMetal", a - 0.015, a + 0.015, g0, g1, d + 0.015, d + 0.018, { color: IMP.black, texel: 2 });
        wf.box(kit, "emitBlue", a - 0.009, a + 0.009, floorY + 2.3, floorY + 2.5, d + 0.018, d + 0.022);
      }
      wf.collider(kit, a - w / 2, a + w / 2, floorY, ceilY, 0, d, "rib");
    }
    cf.box(kit, "paintedMetal", a - w / 2, a + w / 2, ceilY - d, ceilY, cf.c0, cf.c1, { color, texel: 1 });
    if (lamp) {
      // light line on the underside: two lips 12 mm below the member with a 1.6 cm lens set 1 cm up between them
      const yb = ceilY - d;
      const cc0 = cf.c0 + d + 0.05;
      const cc1 = cf.c1 - d - 0.05;
      cf.box(kit, "paintedMetal", a - 0.05, a - 0.02, yb - 0.012, yb + 0.03, cc0, cc1, { color: IMP.black, texel: 1 });
      cf.box(kit, "paintedMetal", a + 0.02, a + 0.05, yb - 0.012, yb + 0.03, cc0, cc1, { color: IMP.black, texel: 1 });
      cf.box(kit, "paintedMetal", a - 0.02, a + 0.02, yb + 0.006, yb + 0.03, cc0, cc1, { color: IMP.black, texel: 1 });
      cf.box(kit, emit, a - 0.008, a + 0.008, yb - 0.002, yb + 0.006, cc0 + 0.07, cc1 - 0.07);
    }
  }
}

/** Conduit run along a wall: pipes over the given spans with elbow blocks turning into the wall at each end and
 *  saddle clamps at `clampsAt`. */
export function conduitRun(kit, wf, runSpans, { y, r = 0.04, d = 0.1, color = IMP.hullDark, mat = "metal", clampsAt = [], segments = 10 } = {}) {
  for (const [s0, s1] of runSpans) {
    if (s1 - s0 < 0.5) continue;
    for (const [p0, p1] of segs(s0 + 0.08, s1 - 0.08)) wf.pipe(kit, mat, p0, p1, y, d, r, { color, segments });
    for (const e of [s0, s1 - 0.14]) wf.box(kit, "metalRough", e, e + 0.14, y - r - 0.03, y + r + 0.03, -0.01, d + r + 0.015, { color: IMP.mid, texel: 2 });
    for (const a of clampsAt) {
      if (a < s0 + 0.3 || a > s1 - 0.3) continue;
      wf.box(kit, "metalRough", a - 0.045, a + 0.045, y - r - 0.02, y + r + 0.02, 0, d + r + 0.01, { color: IMP.mid, texel: 2 });
      wf.box(kit, "metal", a - 0.02, a + 0.02, y + r + 0.02, y + r + 0.035, d - 0.02, d + 0.02, { color: IMP.steel, texel: 2 });
    }
  }
}

/** Open cable tray hung under the ceiling along a wall, with cables lying in it and wall brackets every 2 m. */
export function cableTray(kit, wf, traySpans, ceilY, { w = 0.24, h = 0.09, drop = 0.16 } = {}) {
  const yb = ceilY - drop;
  const cols = [CABLE.black, CABLE.grey, CABLE.red, CABLE.black];
  for (const [s0, s1] of traySpans) {
    if (s1 - s0 < 0.6) continue;
    for (const [p0, p1] of segs(s0, s1)) {
      wf.box(kit, "paintedMetal", p0, p1, yb, yb + 0.012, 0.005, w, { color: IMP.dark, texel: 1 });
      wf.box(kit, "paintedMetal", p0, p1, yb, yb + h, w - 0.012, w, { color: IMP.dark, texel: 1 });
      for (let i = 0; i < 4; i++) {
        const dd = 0.035 + i * 0.05;
        const rr = i % 2 ? 0.011 : 0.016;
        wf.box(kit, "paintedMetal", p0 + 0.02, p1 - 0.02, yb + 0.012, yb + 0.012 + 2 * rr, dd - rr, dd + rr, { color: cols[i], texel: 2 });
      }
    }
    for (let a = s0 + 0.6; a < s1 - 0.3; a += 2.0) {
      wf.box(kit, "metalRough", a - 0.02, a + 0.02, yb - 0.035, yb, -0.01, w, { color: IMP.mid, texel: 2 });
      wf.box(kit, "metalRough", a - 0.035, a + 0.035, yb - 0.09, yb, -0.01, 0.025, { color: IMP.mid, texel: 2 });
    }
  }
}

/** Steel handrail at 1.02 m over the given spans, bracketed off the wall, with black grip bands. */
export function handrail(kit, wf, railSpans, floorY, { y = 1.02, d = 0.1, r = 0.022, grips = true, collide = true } = {}) {
  for (const [s0, s1] of railSpans) {
    const L = s1 - s0;
    if (L < 0.6) continue;
    const ry = floorY + y;
    for (const [p0, p1] of segs(s0, s1)) wf.pipe(kit, "metal", p0, p1, ry, d, r, { color: IMP.steel, segments: 10, texel: 2 });
    wf.pipe(kit, "metalRough", s0 - 0.005, s0 + 0.05, ry, d, r + 0.007, { color: IMP.mid, segments: 8 });
    wf.pipe(kit, "metalRough", s1 - 0.05, s1 + 0.005, ry, d, r + 0.007, { color: IMP.mid, segments: 8 });
    const n = Math.max(2, Math.round(L / 1.6) + 1);
    for (let i = 0; i < n; i++) {
      const a = s0 + 0.16 + ((L - 0.32) * i) / (n - 1);
      wf.box(kit, "metal", a - 0.02, a + 0.02, ry - 0.018, ry + 0.018, 0, d, { color: IMP.mid, texel: 2 });
      wf.box(kit, "paintedMetal", a - 0.035, a + 0.035, ry - 0.075, ry + 0.045, -0.005, 0.03, { color: IMP.dark, texel: 2 });
    }
    if (grips) for (let a = s0 + 0.9; a < s1 - 0.8; a += 5.3) wf.pipe(kit, "paintedMetal", a, a + 0.42, ry, d, r + 0.005, { color: IMP.black, segments: 10, texel: 2 });
    if (collide) wf.collider(kit, s0, s1, floorY + 0.8, floorY + 1.1, 0, d + r, "rail");
  }
}

/** Floor grating strip along a wall: cut-out grate texture over a black trough, proud kerb rails, end plates. */
export function gratingStrips(kit, wf, stripSpans, floorY, { w = 0.62 } = {}) {
  for (const [s0, s1] of stripSpans) {
    const L = s1 - s0;
    if (L < 1) continue;
    for (const [p0, p1] of segs(s0, s1)) {
      const pl = p1 - p0;
      wf.box(kit, "paintedMetal", p0, p1, floorY + 0.001, floorY + 0.006, 0.02, w - 0.02, { color: IMP.black, texel: 1 });
      const g = new THREE.PlaneGeometry(w, pl);
      g.rotateX(-Math.PI / 2);
      if (wf.axis === "x") g.rotateY(Math.PI / 2);
      kit.add("grate", g, { pos: wf.pt((p0 + p1) / 2, floorY + 0.012, w / 2), uv: "scale", uvScale: [w / 1.24, pl / 0.9] });
      for (const dd of [0.015, 0.31, w - 0.015]) wf.box(kit, "metal", p0, p1, floorY, floorY + 0.03, dd - 0.015, dd + 0.015, { color: IMP.mid, texel: 2 });
    }
    wf.box(kit, "metal", s0 - 0.02, s0 + 0.03, floorY, floorY + 0.03, 0, w, { color: IMP.mid, texel: 2 });
    wf.box(kit, "metal", s1 - 0.03, s1 + 0.02, floorY, floorY + 0.03, 0, w, { color: IMP.mid, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Bay kit (every bay, both walls)
// ---------------------------------------------------------------------------

/** Kick plate at floor level over [s0,s1] with a steel top lip and linear boot scuffs (functional wear, never rust). */
export function kickPlate(kit, wf, s0, s1, floorY, rand = Math.random) {
  wf.box(kit, "metalRough", s0, s1, floorY + 0.02, floorY + 0.19, 0, 0.015, { color: KICK, texel: 1 });
  wf.box(kit, "metal", s0, s1, floorY + 0.19, floorY + 0.2, -0.005, 0.017, { color: IMP.mid, texel: 2 });
  const L = s1 - s0;
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const len = Math.min(L - 0.2, 0.15 + rand() * 0.6);
    const c = s0 + 0.1 + len / 2 + rand() * Math.max(0, L - 0.2 - len);
    const y = floorY + 0.05 + rand() * 0.11;
    const h = 0.004 + rand() * 0.005;
    wf.box(kit, "paintedMetal", c - len / 2, c + len / 2, y, y + h, 0.015, 0.0165, { color: rand() < 0.6 ? SCUFF_LIGHT : SCUFF_DARK, texel: 2 });
  }
}

/** Raised panel plate overlaid on the shell's uniform 2 m grid (alternate 1.0 / 1.4 m widths per bay): a black
 *  seam border 2 mm proud with the plate set 5 mm above it, so it reads as a fitted panel rather than a flat patch. */
export function overlayPlate(kit, wf, a0, a1, y0, y1, color) {
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  wf.box(kit, "paintedMetal", lo, hi, y0, y1, 0.0, 0.002, { color: IMP.black, texel: 1 });
  wf.box(kit, "impPanel", lo + 0.025, hi - 0.025, y0 + 0.025, y1 - 0.025, 0.002, 0.007, { color, texel: 0.8 });
}

/** Small fire-suppression cabinet (0.3 × 0.4 m) with a white band, stencil, handle and a red status LED. */
export function firePanel(kit, wf, a, floorY, { y0 = 1.32, w = 0.3, h = 0.4, d0 = 0.007 } = {}) {
  const yb = floorY + y0;
  const yt = yb + h;
  const df = d0 + 0.11;
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, yb, yt, d0 - 0.005, df, { color: RED_CAB, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, yt - 0.1, yt - 0.07, df, df + 0.003, { color: IMP.white, texel: 2 });
  wf.box(kit, "metal", a - w / 2 + 0.02, a - w / 2 + 0.032, yb + 0.03, yt - 0.03, df, df + 0.008, { color: IMP.steel, texel: 2 });
  wf.box(kit, "metal", a + w / 2 - 0.06, a + w / 2 - 0.03, yb + h / 2 - 0.04, yb + h / 2 + 0.04, df, df + 0.03, { color: IMP.steel, texel: 2 });
  wf.quad(kit, "signPaint", a, yb + 0.12, df + 0.001, 0.26, 0.26 / LABEL_ASPECT, labelRect("FIRE SUPPRESSION"));
  led(kit, wf, a - 0.08, yt - 0.04, df, "emitRedImp", { s: 0.016 });
}

/** Small comm panel (0.3 × 0.4 m): speaker slots, backlit COMMS readout, two bezelled LEDs and a call button. */
export function commPanel(kit, wf, a, floorY, { y0 = 1.32, w = 0.3, h = 0.4, d0 = 0.007 } = {}) {
  const yb = floorY + y0;
  const yt = yb + h;
  const df = d0 + 0.07;
  wf.box(kit, "metalRough", a - w / 2, a + w / 2, yb, yt, d0 - 0.005, df, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2 + 0.02, a + w / 2 - 0.02, yb + 0.02, yt - 0.02, df - 0.004, df + 0.005, { color: IMP.mid, texel: 1 });
  for (let k = 0; k < 5; k++) wf.box(kit, "paintedMetal", a - 0.08, a + 0.08, yt - 0.11 - k * 0.026, yt - 0.102 - k * 0.026, df + 0.005, df + 0.009, { color: IMP.black, texel: 2 });
  wf.box(kit, "paintedMetal", a - 0.11, a + 0.11, yb + 0.07, yb + 0.115, df + 0.005, df + 0.008, { color: IMP.black, texel: 2 });
  wf.quad(kit, "sign", a - 0.03, yb + 0.092, df + 0.009, 0.15, 0.15 / LABEL_ASPECT, labelRect("COMMS"));
  wf.box(kit, "metal", a + 0.07, a + 0.1, yb + 0.077, yb + 0.107, df + 0.005, df + 0.02, { color: IMP.black, texel: 2 });
  led(kit, wf, a - 0.09, yt - 0.06, df, "emitBlue", { s: 0.016 });
  led(kit, wf, a + 0.09, yt - 0.06, df, "emitAmber", { s: 0.016 });
  wf.box(kit, "paintedMetal", a - w / 2 - 0.01, a + w / 2 + 0.01, yt, yt + 0.015, d0 - 0.01, df + 0.015, { color: IMP.black, texel: 1 });
}

/** Gauge cluster: plate with three bezelled dials (dark faces, amber index lens), two risers and a valve wheel. */
export function gauges(kit, wf, a, floorY, { y = 1.55 } = {}) {
  const yc = floorY + y;
  wf.box(kit, "metalRough", a - 0.28, a + 0.28, yc - 0.16, yc + 0.16, -0.01, 0.05, { color: IMP.mid, texel: 1 });
  for (const k of [-1, 0, 1]) {
    const ca = a + k * 0.17;
    wf.stub(kit, "metalRough", ca, yc + 0.04, 0.05, 0.085, 0.062, { color: IMP.dark });
    wf.stub(kit, "paintedMetal", ca, yc + 0.04, 0.085, 0.087, 0.046, { color: IMP.black });
    wf.box(kit, "emitAmber", ca - 0.004, ca + 0.004, yc + 0.055, yc + 0.08, 0.087, 0.0885);
  }
  wf.quad(kit, "signPaint", a, yc - 0.105, 0.051, 0.4, 0.4 / LABEL_ASPECT, labelRect("PRESSURE · NOMINAL"));
  for (const s of [-1, 1]) wf.box(kit, "paintedMetal", a + s * 0.15 - 0.02, a + s * 0.15 + 0.02, yc - 0.6, yc - 0.16, 0.02, 0.06, { color: IMP.hullDark, texel: 2 });
  wf.ring(kit, "metal", a + 0.15, yc - 0.4, 0.09, 0.05, 0.008, { color: IMP.steel });
  wf.stub(kit, "metal", a + 0.15, yc - 0.4, 0.04, 0.09, 0.012, { color: IMP.steel });
}

// ---------------------------------------------------------------------------
// Wall features (one per bay centre)
// ---------------------------------------------------------------------------

export function junctionBox(kit, wf, a, floorY, { rand = Math.random, dropTo = null, hw = 0.26, y0 = 1.25, h = 0.6, leds = ["emitGreen", "emitGreen", "emitAmber", "emitBlue", "emitRedImp"] } = {}) {
  const yb = floorY + y0;
  const yt = yb + h;
  const yc = (yb + yt) / 2;
  const d = 0.13;
  wf.box(kit, "metalRough", a - hw, a + hw, yb, yt, -0.01, d, { color: IMP.mid, texel: 1 });
  wf.box(kit, "paintedMetal", a - hw + 0.03, a + hw - 0.03, yb + 0.03, yt - 0.15, d - 0.005, d + 0.012, { color: IMP.dark, texel: 1 });
  // hinge line (viewer's left) with three knuckles, latch with a slot on the right
  const la = a + wf.leftSign * (hw - 0.045);
  wf.box(kit, "metal", la - 0.008, la + 0.008, yb + 0.06, yt - 0.18, d + 0.012, d + 0.024, { color: IMP.steel, texel: 2 });
  for (const ky of [yb + 0.1, yc - 0.06, yt - 0.23]) wf.box(kit, "metal", la - 0.014, la + 0.014, ky - 0.025, ky + 0.025, d + 0.012, d + 0.03, { color: IMP.steel, texel: 2 });
  const ra = a - wf.leftSign * (hw - 0.09);
  wf.box(kit, "metal", ra - 0.03, ra + 0.03, yc - 0.08, yc - 0.04, d + 0.012, d + 0.03, { color: IMP.steel, texel: 2 });
  wf.box(kit, "paintedMetal", ra - 0.004, ra + 0.004, yc - 0.075, yc - 0.045, d + 0.03, d + 0.032, { color: IMP.black, texel: 2 });
  const n = 4;
  const off = Math.floor(rand() * leds.length);
  for (let i = 0; i < n; i++) led(kit, wf, a - 0.12 + i * 0.08, yt - 0.075, d, leds[(off + i) % leds.length], { s: 0.02 });
  wf.quad(kit, "signPaint", a, yb + 0.11, d + 0.014, 0.26, 0.26 / LABEL_ASPECT, labelRect("MAINTENANCE"));
  if (dropTo !== null) {
    const top = Math.max(yt, dropTo);
    wf.box(kit, "paintedMetal", a - 0.022, a + 0.022, yt - 0.01, top, 0.03, 0.075, { color: IMP.black, texel: 2 });
    wf.box(kit, "metalRough", a - 0.05, a + 0.05, yt + 0.25, yt + 0.29, 0.01, 0.09, { color: IMP.mid, texel: 2 });
  }
  wf.collider(kit, a - hw, a + hw, yb, yt, 0, d, "utility");
}

export function vent(kit, wf, a, floorY, { y = 0.5, w = 0.9, h = 0.34 } = {}) {
  const yb = floorY + y;
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, yb, yb + h, -0.01, 0.03, { color: IMP.black, texel: 1 });
  const f = 0.04;
  for (const [aa0, aa1, y0, y1] of [
    [a - w / 2, a + w / 2, yb, yb + f],
    [a - w / 2, a + w / 2, yb + h - f, yb + h],
    [a - w / 2, a - w / 2 + f, yb, yb + h],
    [a + w / 2 - f, a + w / 2, yb, yb + h],
  ])
    wf.box(kit, "metalRough", aa0, aa1, y0, y1, 0.03, 0.05, { color: IMP.mid, texel: 1 });
  const slats = Math.max(4, Math.round((h - 2 * f) / 0.055));
  const pitch = (h - 2 * f) / slats;
  for (let i = 0; i < slats; i++) {
    const sy = yb + f + pitch * (i + 0.5);
    wf.box(kit, "metalRough", a - w / 2 + f, a + w / 2 - f, sy - 0.008, sy + 0.008, 0.02, 0.045, { color: IMP.mid, texel: 1 });
  }
}

export function intercom(kit, wf, a, floorY, { y = 1.5 } = {}) {
  const yc = floorY + y;
  const hw = 0.15;
  const hh = 0.19;
  const d = 0.07;
  wf.box(kit, "metalRough", a - hw, a + hw, yc - hh, yc + hh, -0.01, d, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - hw + 0.02, a + hw - 0.02, yc - hh + 0.02, yc + hh - 0.02, d - 0.004, d + 0.006, { color: IMP.mid, texel: 1 });
  for (let k = 0; k < 6; k++) wf.box(kit, "paintedMetal", a - 0.09, a + 0.09, yc + 0.11 - k * 0.026, yc + 0.118 - k * 0.026, d + 0.006, d + 0.01, { color: IMP.black, texel: 2 });
  wf.box(kit, "paintedMetal", a - 0.05, a + 0.01, yc - 0.12, yc - 0.08, d + 0.006, d + 0.018, { color: IMP.black, texel: 2 });
  led(kit, wf, a + 0.07, yc - 0.1, d + 0.006, "emitBlue", { s: 0.018 });
  led(kit, wf, a + 0.105, yc - 0.035, d + 0.006, "emitRedImp", { s: 0.01 });
  wf.box(kit, "paintedMetal", a - hw - 0.01, a + hw + 0.01, yc + hh, yc + hh + 0.02, -0.01, d + 0.03, { color: IMP.black, texel: 1 });
}

export function cableDrop(kit, wf, a, floorY, { fromY, toY, rand = Math.random, led: ledMat = null } = {}) {
  const cols = [CABLE.black, CABLE.grey, CABLE.red];
  const widths = [0.03, 0.022, 0.026];
  const offs = [-0.06, 0.0, 0.055];
  for (let i = 0; i < 3; i++) {
    const w = widths[i];
    wf.box(kit, "paintedMetal", a + offs[i] - w / 2, a + offs[i] + w / 2, toY + 0.1, fromY - 0.05, 0.03, 0.03 + w, { color: cols[i], texel: 2 });
  }
  const nClamps = 3;
  for (let k = 0; k < nClamps; k++) {
    const y = toY + 0.35 + ((fromY - toY - 0.6) * k) / (nClamps - 1);
    wf.box(kit, "metalRough", a - 0.1, a + 0.1, y - 0.025, y + 0.025, -0.005, 0.075, { color: IMP.mid, texel: 2 });
  }
  wf.box(kit, "metalRough", a - 0.11, a + 0.11, toY, toY + 0.12, -0.01, 0.11, { color: IMP.dark, texel: 1 });
  led(kit, wf, a + 0.07, toY + 0.06, 0.11, ledMat || (rand() < 0.5 ? "emitGreen" : "emitAmber"), { s: 0.016 });
  wf.box(kit, "metalRough", a - 0.12, a + 0.12, fromY - 0.06, fromY + 0.05, -0.01, 0.1, { color: IMP.mid, texel: 1 });
}

/** Full-height maintenance access hatch (rail-free walls). */
export function accessHatch(kit, wf, a, floorY, { w = 0.9, y0 = 0.36, y1 = 1.96, rand = Math.random, led: ledMat = null } = {}) {
  const yb = floorY + y0;
  const yt = floorY + y1;
  const f = 0.06;
  wf.box(kit, "metalRough", a - w / 2 + f, a + w / 2 - f, yb + f, yt - f, -0.01, 0.025, { color: IMP.hullDark, texel: 1 });
  for (const [aa0, aa1, yy0, yy1] of [
    [a - w / 2, a + w / 2, yb, yb + f],
    [a - w / 2, a + w / 2, yt - f, yt],
    [a - w / 2, a - w / 2 + f, yb, yt],
    [a + w / 2 - f, a + w / 2, yb, yt],
  ])
    wf.box(kit, "paintedMetal", aa0, aa1, yy0, yy1, -0.01, 0.05, { color: IMP.dark, texel: 1 });
  for (const [ba, by] of [
    [a - w / 2 + 0.03, yb + 0.03],
    [a + w / 2 - 0.03, yb + 0.03],
    [a - w / 2 + 0.03, yt - 0.03],
    [a + w / 2 - 0.03, yt - 0.03],
  ])
    wf.box(kit, "metal", ba - 0.018, ba + 0.018, by - 0.018, by + 0.018, 0.05, 0.068, { color: IMP.steel, texel: 2 });
  wf.box(kit, "paintedMetal", a - 0.1, a + 0.1, floorY + 1.08, floorY + 1.14, 0.0, 0.026, { color: IMP.black, texel: 2 });
  wf.box(kit, "paintedMetal", a - 0.004, a + 0.004, yb + f, yt - f, 0.025, 0.028, { color: IMP.black, texel: 2 });
  led(kit, wf, a + w / 2 - 0.14, yt - 0.13, 0.025, ledMat || (rand() < 0.7 ? "emitGreen" : "emitAmber"), { s: 0.018 });
  wf.quad(kit, "signPaint", a, yt - 0.14, 0.027, 0.4, 0.4 / LABEL_ASPECT, labelRect("MAINTENANCE"));
}

/** Service hatch above the handrail: framed plate, hinge line with knuckles, grab handle, stencil, corner bolts, LED. */
export function serviceHatch(kit, wf, a, floorY, { w = 0.9, y0 = 1.22, y1 = 1.96, led: ledMat = "emitAmber" } = {}) {
  const yb = floorY + y0;
  const yt = floorY + y1;
  const f = 0.05;
  for (const [aa0, aa1, yy0, yy1] of [
    [a - w / 2, a + w / 2, yb, yb + f],
    [a - w / 2, a + w / 2, yt - f, yt],
    [a - w / 2, a - w / 2 + f, yb, yt],
    [a + w / 2 - f, a + w / 2, yb, yt],
  ])
    wf.box(kit, "paintedMetal", aa0, aa1, yy0, yy1, -0.01, 0.045, { color: IMP.dark, texel: 1 });
  wf.box(kit, "metalRough", a - w / 2 + f, a + w / 2 - f, yb + f, yt - f, -0.01, 0.03, { color: IMP.hullDark, texel: 1 });
  const la = a + wf.leftSign * (w / 2 - f - 0.03);
  wf.box(kit, "metal", la - 0.008, la + 0.008, yb + f + 0.03, yt - f - 0.03, 0.03, 0.048, { color: IMP.steel, texel: 2 });
  for (const ky of [yb + f + 0.08, (yb + yt) / 2, yt - f - 0.08]) wf.box(kit, "metal", la - 0.014, la + 0.014, ky - 0.03, ky + 0.03, 0.03, 0.056, { color: IMP.steel, texel: 2 });
  const ha = a - wf.leftSign * (w / 2 - f - 0.12);
  const hy = (yb + yt) / 2;
  wf.pipe(kit, "metal", ha - 0.1, ha + 0.1, hy, 0.075, 0.013, { color: IMP.steel, segments: 8 });
  for (const s of [-1, 1]) wf.stub(kit, "metal", ha + s * 0.08, hy, 0.03, 0.075, 0.011, { color: IMP.steel, segments: 8 });
  for (const [ba, by] of [
    [a - w / 2 + 0.025, yb + 0.025],
    [a + w / 2 - 0.025, yb + 0.025],
    [a - w / 2 + 0.025, yt - 0.025],
    [a + w / 2 - 0.025, yt - 0.025],
  ])
    wf.box(kit, "metal", ba - 0.014, ba + 0.014, by - 0.014, by + 0.014, 0.045, 0.06, { color: IMP.steel, texel: 2 });
  wf.quad(kit, "signPaint", a, yt - f - 0.08, 0.031, 0.45, 0.45 / LABEL_ASPECT, labelRect("SERVICE ACCESS"));
  led(kit, wf, a + wf.leftSign * 0.1, yb + f + 0.09, 0.03, ledMat, { s: 0.016 });
}

/** Full-height equipment locker (0.9 × 1.95 × 0.36 m): two louvred doors, handles, header label, status LED. */
export function locker(kit, wf, a, floorY, { w = 0.9, h = 1.95, depth = 0.36, label = "EQUIPMENT LOCKER", led: ledMat = "emitAmber" } = {}) {
  const yb = floorY + 0.05;
  const yt = floorY + h;
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, floorY, yb, -0.01, depth - 0.03, { color: IMP.black, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, yb, yt, -0.01, depth - 0.02, { color: IMP.dark, texel: 1 });
  for (const s of [-1, 1]) {
    const d0 = a + s * 0.012;
    const d1 = a + s * (w / 2 - 0.02);
    wf.box(kit, "metalRough", d0, d1, yb + 0.03, yt - 0.03, depth - 0.02, depth, { color: IMP.mid, texel: 1 });
    const dc = a + s * (w / 4);
    for (let k = 0; k < 4; k++) wf.box(kit, "paintedMetal", dc - 0.13, dc + 0.13, yt - 0.3 + k * 0.045, yt - 0.288 + k * 0.045, depth, depth + 0.004, { color: IMP.black, texel: 2 });
    for (let k = 0; k < 3; k++) wf.box(kit, "paintedMetal", dc - 0.13, dc + 0.13, yb + 0.12 + k * 0.045, yb + 0.132 + k * 0.045, depth, depth + 0.004, { color: IMP.black, texel: 2 });
    wf.box(kit, "metal", a + s * 0.05 - 0.012, a + s * 0.05 + 0.012, floorY + 1.0, floorY + 1.22, depth + 0.012, depth + 0.036, { color: IMP.steel, texel: 2 });
    wf.box(kit, "metal", a + s * 0.05 - 0.02, a + s * 0.05 + 0.02, floorY + 1.0, floorY + 1.22, depth, depth + 0.012, { color: IMP.mid, texel: 2 });
  }
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, yt, yt + 0.06, -0.01, depth - 0.01, { color: IMP.black, texel: 1 });
  wf.quad(kit, "signPaint", a - wf.leftSign * 0.03, yt + 0.03, depth - 0.009, 0.5, 0.5 / LABEL_ASPECT, labelRect(label));
  led(kit, wf, a + wf.leftSign * (w / 2 - 0.07), yt + 0.03, depth - 0.01, ledMat, { s: 0.018 });
  wf.collider(kit, a - w / 2, a + w / 2, floorY, yt + 0.06, 0, depth + 0.04, "locker");
}

/** Equipment alcove (1.2 × 1.9 m): proud frame around a dark back plate, shelf, extinguisher, hose reel, label, LED. */
export function alcove(kit, wf, a, floorY, { w = 1.2, h = 1.9, depth = 0.16 } = {}) {
  const yb = floorY + 0.05;
  const yt = floorY + h;
  const f = 0.12;
  wf.box(kit, "paintedMetal", a - w / 2 + f, a + w / 2 - f, yb, yt - f, -0.005, 0.003, { color: IMP.black, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2, a - w / 2 + f, floorY, yt, -0.01, depth, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a + w / 2 - f, a + w / 2, floorY, yt, -0.01, depth, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2, a + w / 2, yt - f, yt, -0.01, depth, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2 - 0.02, a + w / 2 + 0.02, floorY, yb + 0.06, -0.01, depth + 0.02, { color: IMP.black, texel: 1 });
  wf.box(kit, "metalRough", a - w / 2 + f, a + w / 2 - f, floorY + 1.05, floorY + 1.08, 0.003, depth - 0.03, { color: IMP.mid, texel: 1 });
  wf.box(kit, "metalRough", a - w / 2 + f, a + w / 2 - f, floorY + 1.08, floorY + 1.11, depth - 0.05, depth - 0.03, { color: IMP.mid, texel: 1 });
  // extinguisher on the sill, hose reel above the shelf, wall bracket for the reel
  const ea = a - wf.leftSign * 0.28;
  const ec = wf.pt(ea, floorY + 0.06 + 0.26, 0.085);
  kit.cyl("paintedMetal", ec[0], ec[1], ec[2], 0.07, 0.52, "y", { color: RED_CAB, segments: 12 });
  const hc = wf.pt(ea, floorY + 0.06 + 0.52 + 0.05, 0.085);
  kit.cyl("paintedMetal", hc[0], hc[1], hc[2], 0.032, 0.1, "y", { color: IMP.black, segments: 10 });
  wf.box(kit, "metal", ea - 0.1, ea + 0.1, floorY + 0.5, floorY + 0.54, 0.015, 0.16, { color: IMP.steel, texel: 2 });
  wf.box(kit, "paintedMetal", ea - 0.05, ea + 0.05, floorY + 0.3, floorY + 0.7, 0.003, 0.02, { color: IMP.dark, texel: 2 });
  const ra = a + wf.leftSign * 0.22;
  wf.ring(kit, "paintedMetal", ra, floorY + 1.5, 0.06, 0.17, 0.045, { color: RED_CAB });
  wf.stub(kit, "paintedMetal", ra, floorY + 1.5, 0.003, 0.12, 0.05, { color: IMP.black });
  wf.box(kit, "metalRough", ra - 0.06, ra + 0.06, floorY + 1.66, floorY + 1.72, 0.003, 0.06, { color: IMP.mid, texel: 2 });
  wf.quad(kit, "signPaint", a, yt - f / 2, depth + 0.001, 0.7, 0.7 / LABEL_ASPECT, labelRect("EMERGENCY EQUIPMENT"));
  led(kit, wf, a + w / 2 - 0.06, yt - f / 2, depth, "emitRedImp", { s: 0.016 });
  wf.collider(kit, a - w / 2, a + w / 2, floorY, yt, 0, depth + 0.02, "alcove");
}

// ---------------------------------------------------------------------------
// Furniture (lobby)
// ---------------------------------------------------------------------------

/** Wall bench over [a0,a1]: 8 cm hull-grey seat slab with a dark inset pad and a steel nosing, a 12 cm apron, two
 *  solid pedestals on a black plinth, optional backrest rail on the wall. Reads as furniture from across the room. */
export function bench(kit, wf, a0, a1, floorY, { depth = 0.55, seatY = 0.44, backrest = true } = {}) {
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const ys = floorY + seatY;
  wf.box(kit, "metalRough", lo, hi, ys - 0.08, ys, 0.02, depth, { color: IMP.hullDark, texel: 1 });
  wf.box(kit, "paintedMetal", lo + 0.06, hi - 0.06, ys - 0.004, ys + 0.02, 0.08, depth - 0.08, { color: IMP.dark, texel: 1 });
  wf.box(kit, "metal", lo, hi, ys - 0.03, ys + 0.005, depth - 0.005, depth + 0.02, { color: IMP.steel, texel: 2 });
  wf.box(kit, "paintedMetal", lo, hi, ys - 0.2, ys - 0.08, depth - 0.06, depth, { color: IMP.dark, texel: 1 });
  for (const ba of [lo + 0.22, hi - 0.22]) {
    wf.box(kit, "paintedMetal", ba - 0.07, ba + 0.07, floorY + 0.08, ys - 0.08, 0.04, depth - 0.1, { color: IMP.dark, texel: 1 });
    wf.box(kit, "metal", ba - 0.07, ba + 0.07, floorY + 0.08, floorY + 0.12, 0.04, depth - 0.1, { color: IMP.steel, texel: 2 });
  }
  wf.box(kit, "paintedMetal", lo + 0.08, hi - 0.08, floorY, floorY + 0.08, 0, depth - 0.14, { color: IMP.black, texel: 1 });
  if (backrest) {
    wf.box(kit, "metalRough", lo + 0.05, hi - 0.05, ys + 0.28, ys + 0.5, -0.01, 0.05, { color: IMP.hullDark, texel: 1 });
    wf.box(kit, "paintedMetal", lo + 0.1, hi - 0.1, ys + 0.31, ys + 0.47, 0.05, 0.062, { color: IMP.dark, texel: 1 });
  }
  wf.collider(kit, lo, hi, floorY, ys + 0.05, 0, depth + 0.02, "bench");
}

/** Wall beacon (fire point / alarm): dark base plate, cage ring on three posts and a coloured dome — the visible
 *  source for a coloured accent light so the wash on the wall has an origin. */
export function beacon(kit, wf, a, y, { emit = "emitRedImp", color = RED_CAB } = {}) {
  wf.box(kit, "metalRough", a - 0.09, a + 0.09, y - 0.09, y + 0.09, -0.01, 0.03, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - 0.07, a + 0.07, y - 0.07, y + 0.07, 0.03, 0.04, { color, texel: 1 });
  // drum with the lens disc set 1.5 cm inside a rolled rim
  wf.stub(kit, "paintedMetal", a, y, 0.04, 0.1, 0.055, { color: IMP.black, segments: 14 });
  wf.stub(kit, emit, a, y, 0.1, 0.106, 0.038, { segments: 14 });
  wf.ring(kit, "paintedMetal", a, y, 0.115, 0.046, 0.012, { color: IMP.black });
  // cage: three posts and an outer ring
  for (const k of [0, 1, 2]) {
    const th = (k / 3) * Math.PI * 2 + Math.PI / 2;
    const pa = a + Math.cos(th) * 0.062;
    const py = y + Math.sin(th) * 0.062;
    wf.box(kit, "metal", pa - 0.005, pa + 0.005, py - 0.005, py + 0.005, 0.04, 0.15, { color: IMP.steel, texel: 2 });
  }
  wf.ring(kit, "metal", a, y, 0.15, 0.062, 0.005, { color: IMP.steel });
}

/** Stack of `n` equipment crates (w × depth × h each) against the wall, centred at `a`. */
export function crates(kit, wf, a, floorY, { w = 1.2, depth = 0.8, h = 0.6, n = 2, label = "EMERGENCY SUPPLIES" } = {}) {
  for (let k = 0; k < n; k++) {
    const y0 = floorY + k * h;
    const y1 = y0 + h;
    const ca = a + (k % 2 ? -0.03 : 0.03);
    wf.box(kit, "paintedMetal", ca - w / 2 + 0.02, ca + w / 2 - 0.02, y0 + 0.02, y1 - 0.02, 0.03, depth - 0.02, { color: IMP.hullDark, texel: 1 });
    wf.box(kit, "paintedMetal", ca - w / 2, ca + w / 2, y1 - 0.05, y1, 0.01, depth, { color: IMP.dark, texel: 1 });
    wf.box(kit, "paintedMetal", ca - w / 2, ca + w / 2, y0, y0 + 0.05, 0.01, depth, { color: IMP.dark, texel: 1 });
    for (const s of [-1, 1]) wf.box(kit, "paintedMetal", ca + s * (w / 2 - 0.025) - 0.025, ca + s * (w / 2 - 0.025) + 0.025, y0, y1, depth - 0.05, depth, { color: IMP.dark, texel: 1 });
    wf.box(kit, "paintedMetal", ca - 0.16, ca + 0.16, y0 + h / 2 - 0.035, y0 + h / 2 + 0.035, depth - 0.03, depth + 0.001, { color: IMP.black, texel: 2 });
    for (const s of [-1, 1]) wf.box(kit, "metal", ca + s * 0.42 - 0.03, ca + s * 0.42 + 0.03, y0 + h / 2 - 0.04, y0 + h / 2 + 0.04, depth - 0.02, depth + 0.02, { color: IMP.steel, texel: 2 });
    wf.quad(kit, "signPaint", ca + wf.leftSign * 0.25, y1 - 0.14, depth + 0.001, 0.42, 0.42 / LABEL_ASPECT, labelRect(label));
  }
  wf.collider(kit, a - w / 2 - 0.03, a + w / 2 + 0.03, floorY, floorY + n * h, 0, depth + 0.02, "crates");
}

/** Fire-suppression station: red cabinet with white band, stencil, hinge line, handle and LED, a bracketed
 *  extinguisher beside it and a FIRE POINT sign above. */
export function fireStation(kit, wf, a, floorY) {
  const yb = floorY + 0.3;
  const yt = floorY + 1.3;
  const df = 0.25;
  const ea = a + wf.leftSign * -0.5; // extinguisher on the viewer's right
  wf.box(kit, "paintedMetal", a - 0.32, a + 0.32, floorY, floorY + 0.05, 0, 0.3, { color: IMP.black, texel: 1 });
  wf.box(kit, "paintedMetal", a - 0.3, a + 0.3, yb, yt, -0.01, df, { color: RED_CAB, texel: 1 });
  wf.box(kit, "metalRough", a - 0.27, a + 0.27, yb + 0.03, yt - 0.03, df, df + 0.012, { color: RED_CAB, texel: 1 });
  wf.box(kit, "paintedMetal", a - 0.3, a + 0.3, yt - 0.16, yt - 0.11, df + 0.012, df + 0.015, { color: IMP.white, texel: 2 });
  wf.quad(kit, "signPaint", a, floorY + 0.55, df + 0.013, 0.5, 0.5 / LABEL_ASPECT, labelRect("FIRE SUPPRESSION"));
  const la = a + wf.leftSign * 0.255;
  wf.box(kit, "metal", la - 0.008, la + 0.008, yb + 0.06, yt - 0.06, df + 0.012, df + 0.024, { color: IMP.steel, texel: 2 });
  const ha = a - wf.leftSign * 0.2;
  wf.box(kit, "metal", ha - 0.015, ha + 0.015, floorY + 0.7, floorY + 0.9, df + 0.012, df + 0.045, { color: IMP.steel, texel: 2 });
  led(kit, wf, a + wf.leftSign * 0.18, yt - 0.07, df + 0.012, "emitRedImp", { s: 0.018 });
  const ec = wf.pt(ea, floorY + 0.12 + 0.26, 0.14);
  kit.cyl("paintedMetal", ec[0], ec[1], ec[2], 0.08, 0.52, "y", { color: RED_CAB, segments: 12 });
  const hc = wf.pt(ea, floorY + 0.12 + 0.52 + 0.06, 0.14);
  kit.cyl("paintedMetal", hc[0], hc[1], hc[2], 0.035, 0.12, "y", { color: IMP.black, segments: 10 });
  wf.box(kit, "metal", ea - 0.1, ea + 0.1, floorY + 0.5, floorY + 0.54, 0.02, 0.24, { color: IMP.steel, texel: 2 });
  wf.box(kit, "paintedMetal", ea - 0.06, ea + 0.06, floorY + 0.3, floorY + 0.72, -0.005, 0.03, { color: IMP.dark, texel: 2 });
  signPanel(kit, wf, a - wf.leftSign * 0.25, 0, [{ label: "FIRE POINT" }], { top: floorY + 1.62, labelH: 0.09, rowH: 0.15, pad: 0.07 });
  wf.collider(kit, Math.min(a - 0.32, ea - 0.12), Math.max(a + 0.32, ea + 0.12), floorY, yt, 0, 0.3, "fire-station");
}

// ---------------------------------------------------------------------------
// Signage / markings / status
// ---------------------------------------------------------------------------

/** Standard top edge of wall signage: just under the 2.05 m wall light strip so no panel ever covers it. */
export const SIGN_TOP = 2.0;
export const LABEL_H = 0.12;

/**
 * Backlit sign panel on a wall at along-coordinate `a`. `y` is the panel centre; pass `top` (world y) instead to
 * hang the panel from a common top edge regardless of its row count (`SIGN_TOP` above the floor).
 * rows: [{ label, arrow?: "left"|"right"|"up"|"down", arrowAt?: "left"|"right" }].
 * Arrows point in the viewer's frame; the panel is a dark plate with the glyph quads set 4 mm proud.
 */
export function signPanel(kit, wf, a, y, rows, { d = 0.03, labelH = LABEL_H, pad = 0.09, rowH = 0.18, top = null } = {}) {
  const labelW = labelH * LABEL_ASPECT;
  const arrowS = labelH * 1.15;
  const hasArrow = rows.some((r) => r.arrow);
  const content = labelW + (hasArrow ? 0.06 + arrowS : 0);
  const w = content + 2 * pad;
  const totalH = rows.length * rowH + 0.06;
  const y0 = top !== null ? top - totalH : y - totalH / 2;
  wf.box(kit, "metalRough", a - w / 2, a + w / 2, y0, y0 + totalH, -0.01, d, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2 + 0.015, a + w / 2 - 0.015, y0 + 0.015, y0 + totalH - 0.015, d - 0.002, d + 0.002, { color: IMP.black, texel: 1 });
  const leftEdge = a + wf.leftSign * (content / 2);
  const fromLeft = (off) => leftEdge - wf.leftSign * off;
  // one arrow column for the whole panel (chosen by the first arrow row) so labels stay aligned
  const first = rows.find((r) => r.arrow);
  const arrowsLeft = !first || (first.arrowAt || (first.arrow === "right" ? "right" : "left")) === "left";
  const labelA = !hasArrow ? a : arrowsLeft ? fromLeft(arrowS + 0.06 + labelW / 2) : fromLeft(labelW / 2);
  const arrowA = arrowsLeft ? fromLeft(arrowS / 2) : fromLeft(labelW + 0.06 + arrowS / 2);
  rows.forEach((r, i) => {
    const cy = y0 + totalH - 0.03 - rowH * (i + 0.5);
    if (r.arrow) wf.quad(kit, "sign", arrowA, cy, d + 0.004, arrowS, arrowS, arrowRect(r.arrow));
    wf.quad(kit, "sign", labelA, cy, d + 0.004, labelW, labelH, labelRect(r.label));
  });
  return { w, h: totalH };
}

/** Which arrow (viewer's frame) points from a sign at along-coordinate `aSign` toward `aTarget` on the same wall. */
export function arrowToward(wf, aSign, aTarget) {
  return (aTarget - aSign) * wf.leftSign > 0 ? "left" : "right";
}

/** Backlit board from atlas B (deck plan / lift status / plates) in a dark bezel; `w` sets the size. */
export function boardPanel(kit, wf, a, yc, name, w, { d = 0.03, bezel = 0.03 } = {}) {
  const h = w / BOARD_ASPECT[name];
  wf.box(kit, "metalRough", a - w / 2 - bezel, a + w / 2 + bezel, yc - h / 2 - bezel, yc + h / 2 + bezel, -0.01, d, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - w / 2 - 0.006, a + w / 2 + 0.006, yc - h / 2 - 0.006, yc + h / 2 + 0.006, d - 0.002, d + 0.002, { color: IMP.black, texel: 1 });
  wf.quad(kit, "board", a, yc, d + 0.004, w, h, boardRect(name));
  return { w, h };
}

/** Vertical yellow/black chevron band on a wall (matte). */
export function chevronBand(kit, wf, a, yc, { w = 0.28, h = 2.05, d = 0.006 } = {}) {
  wf.box(kit, "paintedMetal", a - w / 2 - 0.02, a + w / 2 + 0.02, yc - h / 2 - 0.02, yc + h / 2 + 0.02, -0.005, d - 0.002, { color: IMP.black, texel: 1 });
  wf.quad(kit, "signPaint", a, yc, d, w, h, chevronRect(), { vertical: true });
}

/** Chevron threshold strip on the floor in front of a side-wall door (long side = door width). */
export function chevronThreshold(kit, cf, door, floorY, { depth = null, y = 0.014 } = {}) {
  const long = door.w;
  const short = depth || long / LABEL_ASPECT;
  const wf = cf.walls[door.face];
  const c = wf.plane + wf.n * (0.02 + short / 2);
  floorQuad(kit, "signPaint", cf.pt(door.a, floorY + y, c), long, short, chevronRect(), cf.axis);
}

/**
 * Status light housing (red = locked / sealed): a dark frame (top / bottom lips + end caps) around an open recess
 * with a 1.2 cm lens set 4.5 cm behind the lip faces, hood on top. Never a bare bar.
 */
export function statusHousing(kit, wf, a, yc, { emit = "emitRedImp", w = 0.5, h = 0.16, d = 0.1 } = {}) {
  const hw = w / 2;
  const hh = h / 2;
  const dk = { color: IMP.dark, texel: 1 };
  wf.box(kit, "metalRough", a - hw, a + hw, yc - hh, yc + hh, -0.01, 0.03, dk);
  wf.box(kit, "metalRough", a - hw, a + hw, yc + hh - 0.035, yc + hh, 0.03, d, dk);
  wf.box(kit, "metalRough", a - hw, a + hw, yc - hh, yc - hh + 0.035, 0.03, d, dk);
  wf.box(kit, "metalRough", a - hw, a - hw + 0.05, yc - hh, yc + hh, 0.03, d, dk);
  wf.box(kit, "metalRough", a + hw - 0.05, a + hw, yc - hh, yc + hh, 0.03, d, dk);
  wf.box(kit, "paintedMetal", a - hw + 0.05, a + hw - 0.05, yc - hh + 0.035, yc + hh - 0.035, 0.03, 0.045, { color: IMP.black, texel: 1 });
  wf.box(kit, emit, a - hw + 0.09, a + hw - 0.09, yc - 0.006, yc + 0.006, 0.045, 0.055);
  wf.box(kit, "paintedMetal", a - hw - 0.015, a + hw + 0.015, yc + hh, yc + hh + 0.022, -0.01, d + 0.02, { color: IMP.black, texel: 1 });
}

/** Locked future-expansion door on an end wall: red housing on the lintel, chevron bands both sides, threshold
 *  chevrons, a SEALED / NO ACCESS panel and a maintenance cluster on the adjacent side walls. */
export function sealedEnd(kit, cf, door, { signFace, clusterFace, rand = Math.random } = {}) {
  const { floorY, ceilY } = cf;
  const ew = cf.walls[door.face];
  const dirIn = door.face === "w" || door.face === "n" ? 1 : -1; // along-direction from the end wall into the corridor
  const endA = dirIn > 0 ? cf.a0 : cf.a1;
  const da = door.c; // the door's position along the END wall is the corridor's across coordinate
  statusHousing(kit, ew, da, floorY + door.h + 0.1, { w: 0.9, h: 0.16 });
  // chevron bands in the 0.5 m of wall each side of the hole
  for (const s of [-1, 1]) {
    const band = da + s * (door.w / 2 + 0.05 + 0.2);
    if (band - 0.16 < ew.a0 || band + 0.16 > ew.a1) continue;
    chevronBand(kit, ew, band, floorY + 1.4, { w: 0.26, h: 1.9 });
  }
  // threshold chevrons just inside the door (long side across the hole)
  const short = door.w / LABEL_ASPECT;
  floorQuad(kit, "signPaint", cf.pt(endA + dirIn * (0.06 + short / 2), floorY + 0.014, da), door.w, short, chevronRect(), cf.alongZ ? "x" : "z");
  const sw = cf.walls[signFace];
  signPanel(kit, sw, endA + dirIn * 1.15, 0, [{ label: "SEALED" }, { label: "NO ACCESS" }], { top: floorY + SIGN_TOP });
  const cw = cf.walls[clusterFace];
  const ca = endA + dirIn * 1.35;
  junctionBox(kit, cw, ca, floorY, { rand, dropTo: ceilY - 0.02, hw: 0.24, y0: 1.3, h: 0.55 });
  vent(kit, cw, ca, floorY, { y: 0.5, w: 0.7, h: 0.3 });
  // gauge plate + valve stub beside the box
  const ga = ca + dirIn * 0.5;
  cw.box(kit, "metalRough", ga - 0.09, ga + 0.09, floorY + 1.45, floorY + 1.75, -0.01, 0.06, { color: IMP.mid, texel: 2 });
  cw.stub(kit, "metalRough", ga, floorY + 1.64, 0.06, 0.085, 0.055, { color: IMP.dark });
  cw.stub(kit, "paintedMetal", ga, floorY + 1.64, 0.085, 0.087, 0.04, { color: IMP.black });
  cw.box(kit, "emitAmber", ga - 0.004, ga + 0.004, floorY + 1.655, floorY + 1.68, 0.087, 0.0885);
  led(kit, cw, ga, floorY + 1.5, 0.06, "emitAmber", { s: 0.016 });
  cw.stub(kit, "metal", ga, floorY + 2.05, 0.0, 0.12, 0.03, { color: IMP.steel });
  cw.box(kit, "paintedMetal", ga - 0.02, ga + 0.02, floorY + 1.75, floorY + 2.05, 0.03, 0.07, { color: IMP.black, texel: 2 });
}

/** Sealed maintenance bulkhead on a door-less end wall: heavy frame, bolted hatch leaf with a locking wheel and dog
 *  latches, a 0.3 m status readout at 1.4 m, a 0.8 m MAINTENANCE / SEALED plate with red border, recessed status
 *  housing, chevron bands, threshold chevrons and a pipe manifold. Needs the `board` material. */
export function sealedBulkhead(kit, cf, face, { rand = Math.random } = {}) {
  const { floorY, ceilY } = cf;
  const wf = cf.walls[face];
  const a = (wf.a0 + wf.a1) / 2;
  const fw = 2.0;
  const fh = 2.62;
  const f = 0.16;
  for (const [aa0, aa1, y0, y1] of [
    [a - fw / 2, a - fw / 2 + f, floorY, floorY + fh],
    [a + fw / 2 - f, a + fw / 2, floorY, floorY + fh],
    [a - fw / 2, a + fw / 2, floorY + fh - f, floorY + fh],
  ])
    wf.box(kit, "paintedMetal", aa0, aa1, y0, y1, -0.01, 0.12, { color: IMP.dark, texel: 1 });
  wf.box(kit, "paintedMetal", a - fw / 2 - 0.03, a + fw / 2 + 0.03, floorY, floorY + 0.14, -0.01, 0.15, { color: IMP.black, texel: 1 });
  // hatch leaf with centre seam and bolt rows
  const hw = 0.62;
  wf.box(kit, "metalRough", a - hw, a + hw, floorY + 0.16, floorY + fh - f - 0.04, -0.01, 0.045, { color: IMP.hullDark, texel: 1 });
  wf.box(kit, "paintedMetal", a - 0.006, a + 0.006, floorY + 0.2, floorY + fh - f - 0.08, 0.045, 0.048, { color: IMP.black, texel: 2 });
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) wf.box(kit, "metal", a + s * (hw - 0.07) - 0.02, a + s * (hw - 0.07) + 0.02, floorY + 0.3 + k * 0.4 - 0.02, floorY + 0.3 + k * 0.4 + 0.02, 0.045, 0.065, { color: IMP.steel, texel: 2 });
  // locking wheel (rim, four spokes, hub on a shaft) at hand height, dog latches either side
  const wy = floorY + 1.0;
  wf.stub(kit, "metalRough", a, wy, 0.045, 0.06, 0.09, { color: IMP.dark }); // boss plate
  wf.stub(kit, "metalRough", a, wy, 0.06, 0.12, 0.024, { color: IMP.mid }); // shaft
  wf.stub(kit, "metalRough", a, wy, 0.11, 0.15, 0.06, { color: IMP.hullLight }); // hub
  wf.ring(kit, "metalRough", a, wy, 0.13, 0.24, 0.024, { color: IMP.hullLight }); // rim (rough steel reads without an env map)
  wf.box(kit, "metalRough", a - 0.23, a + 0.23, wy - 0.013, wy + 0.013, 0.118, 0.142, { color: IMP.hullLight, texel: 2 });
  wf.box(kit, "metalRough", a - 0.013, a + 0.013, wy - 0.23, wy + 0.23, 0.118, 0.142, { color: IMP.hullLight, texel: 2 });
  for (const s of [-1, 1]) {
    wf.box(kit, "metalRough", a + s * 0.47 - 0.06, a + s * 0.47 + 0.06, wy - 0.045, wy + 0.045, 0.045, 0.08, { color: IMP.hullLight, texel: 2 });
    wf.box(kit, "paintedMetal", a + s * 0.47 - 0.02, a + s * 0.47 + 0.02, wy - 0.03, wy + 0.16, 0.08, 0.1, { color: IMP.black, texel: 2 });
  }
  // status readout (0.3 m at 1.4 m) and the 0.8 m sealed plate above it
  wf.box(kit, "metalRough", a - 0.18, a + 0.18, floorY + 1.4 - 0.055, floorY + 1.4 + 0.055, 0.045, 0.07, { color: IMP.dark, texel: 1 });
  wf.quad(kit, "board", a, floorY + 1.4, 0.071, 0.3, 0.3 / BOARD_ASPECT.readout, boardRect("readout"));
  boardPanel(kit, wf, a, floorY + 1.95, "sealedPlate", 0.8, { d: 0.062, bezel: 0.025 });
  statusHousing(kit, wf, a, floorY + fh + 0.22, { w: 0.7 });
  for (const s of [-1, 1]) chevronBand(kit, wf, a + s * (fw / 2 + 0.24), floorY + 1.4, { w: 0.26, h: 2.0 });
  // threshold chevrons on the floor in front of the frame (along = corridor axis, across = end-wall axis)
  const short = fw / LABEL_ASPECT;
  floorQuad(kit, "signPaint", cf.pt(wf.plane + wf.n * (0.14 + short / 2), floorY + 0.014, a), fw, short, chevronRect(), cf.alongZ ? "x" : "z");
  // manifold above the frame with three risers into the ceiling
  wf.box(kit, "metalRough", a - 0.5, a + 0.5, floorY + fh + 0.02, floorY + fh + 0.14, -0.01, 0.16, { color: IMP.mid, texel: 1 });
  const riserY0 = floorY + fh + 0.14;
  for (const s of [-0.3, 0, 0.3]) {
    const c = wf.pt(a + s, (riserY0 + ceilY) / 2, 0.09);
    kit.cyl("metal", c[0], c[1], c[2], 0.03, ceilY - riserY0 + 0.02, "y", { color: IMP.hullDark, segments: 10 });
  }
  wf.collider(kit, a - fw / 2, a + fw / 2, floorY, floorY + fh, 0, 0.14, "bulkhead");
  void rand;
}

// ---------------------------------------------------------------------------
// Orchestrator for a straight corridor
// ---------------------------------------------------------------------------

export const FEATURE_KINDS = ["junction", "vent", "intercom", "signage", "cableDrop", "gauges"];
export const MAJOR_KINDS = ["locker", "alcove", "hatch"];
const PLATE_TONES = [IMP.grey, IMP.hullLight];

/**
 * Bay-based dressing: ribs every `ribEvery` m (skipping doors and `noRibs` intervals); conduits / tray per face;
 * handrails on `railFaces` and grating strips broken at doors, ribs, lockers and alcoves; per 4 m bay on every side
 * wall (a fixed grid, so stretches where doors removed ribs stay as dense as the rest): a kick plate with scuffs,
 * a 0.6 × 0.3 vent grille under the strip, a fire-suppression or comm panel, 1.4 / 1.0 m overlay plates (mirrored
 * every other bay and per wall), and a centre feature cycling six minor kinds with a locker / alcove / service
 * hatch every `majorEvery` bays — each wall on its own phase so facing walls never match. Returns rib positions.
 * opts: { seed, ribEvery, ribPhase, pipeFaces, trayFace, railFaces, gratingFaces, gratingW, noRibs: [[a0,a1]],
 *         extraBlocks: [{a,w}], reserved: [{face, a0, a1}], sectionLabel: (a) => text|null, features, bayKit,
 *         majorEvery }
 */
export function dressCorridor(kit, cf, opts = {}) {
  const {
    seed = 1,
    ribEvery = 4,
    ribPhase = 1.7,
    pipeFaces = [],
    trayFace = null,
    railFace = null,
    railFaces = railFace ? [railFace] : cf.sides,
    gratingFaces = cf.sides,
    gratingW = 0.62,
    noRibs = [],
    extraBlocks = [], // [{a, w}] extra obstacles (e.g. heavy junction ribs) that cut runs on every side wall
    reserved = [],
    sectionLabel = null,
    features = true,
    bayKit = true,
    majorEvery = 3,
  } = opts;
  const { floorY, ceilY } = cf;
  const rand = rng(seed);
  const doorsOn = (face) => cf.sideDoors.filter((d) => d.face === face);

  // ribs
  const ribPos = [];
  for (let a = cf.a0 + ribPhase; a < cf.a1 - 0.6; a += ribEvery) {
    if (cf.sideDoors.some((d) => Math.abs(d.a - a) < d.w / 2 + 0.55)) continue;
    if (noRibs.some(([s0, s1]) => a > s0 && a < s1)) continue;
    ribPos.push(+a.toFixed(3));
  }
  ribs(kit, cf, ribPos);

  // bays between ribs (and the corridor ends) → conduit clamp positions
  const edges = [cf.a0, ...ribPos, cf.a1];
  const bays = [];
  for (let i = 0; i < edges.length - 1; i++) if (edges[i + 1] - edges[i] > 2.4) bays.push([edges[i], edges[i + 1]]);
  const clampPos = bays.flatMap(([b0, b1]) => (b1 - b0 > 3 ? [b0 + 1.0, b1 - 1.0] : [(b0 + b1) / 2]));

  // feature plan on the fixed 4 m grid: kind per (face, bay) with the majors as run blocks
  const order = [...FEATURE_KINDS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const centres = [];
  for (let a = cf.a0 + ribPhase + ribEvery / 2; a < cf.a1 - 1.0; a += ribEvery) centres.push(+a.toFixed(3));
  const plan = {};
  const majorBlocks = {};
  cf.sides.forEach((face, fi) => {
    plan[face] = [];
    majorBlocks[face] = [];
    let minor = 0; // minors cycle on their own counter so all six kinds appear between the majors
    centres.forEach((bc, i) => {
      const major = (i + fi) % majorEvery === 0;
      const kind = major ? MAJOR_KINDS[(Math.floor(i / majorEvery) + fi) % MAJOR_KINDS.length] : order[(minor++ + fi * 3) % order.length];
      // door zone = jamb + a 1.4 m door sign + gap on either side (doorSigns() runs after this)
      const free =
        features &&
        !doorsOn(face).some((d) => Math.abs(d.a - bc) < d.w / 2 + 1.9) &&
        !reserved.some((r) => r.face === face && bc > r.a0 && bc < r.a1) &&
        !extraBlocks.some((b) => Math.abs(b.a - bc) < b.w / 2 + 0.8);
      if (!free) {
        plan[face].push(null);
        return;
      }
      plan[face].push(kind);
      if (kind === "locker") majorBlocks[face].push({ a: bc, w: 0.9 });
      if (kind === "alcove") majorBlocks[face].push({ a: bc, w: 1.2 });
    });
  });

  // long runs per face
  const ribBlocks = ribPos.map((a) => ({ a, w: 0.3 }));
  for (const face of cf.sides) {
    const wf = cf.walls[face];
    const doorBlocks = [...doorsOn(face).map((d) => ({ a: d.a, w: d.w })), ...extraBlocks];
    const tallBlocks = [...doorsOn(face).filter((d) => d.h > ceilY - floorY - 0.25).map((d) => ({ a: d.a, w: d.w })), ...extraBlocks];
    if (pipeFaces.includes(face)) {
      const runs = spans(cf.a0 + 0.3, cf.a1 - 0.3, doorBlocks, 0.4);
      conduitRun(kit, wf, runs, { y: floorY + 2.46, r: 0.04, d: 0.1, color: IMP.hullDark, clampsAt: clampPos });
      conduitRun(kit, wf, runs, { y: floorY + 2.6, r: 0.026, d: 0.085, color: IMP.mid, clampsAt: clampPos.map((a) => a + 0.35) });
    }
    if (trayFace === face) cableTray(kit, wf, spans(cf.a0 + 0.3, cf.a1 - 0.3, tallBlocks, 0.4), ceilY);
    // rail: 0.4 m clear of doors, but run up to 6 cm from a rib flank and 15 cm from a locker / alcove so it reads as
    // one rail passing behind the ribs rather than short stubs
    if (railFaces.includes(face)) handrail(kit, wf, cutSpans(cutSpans(spans(cf.a0 + 0.35, cf.a1 - 0.35, doorBlocks, 0.4), ribBlocks, 0.06), majorBlocks[face], 0.15), floorY);
    if (gratingFaces.includes(face)) gratingStrips(kit, wf, spans(cf.a0 + 0.04, cf.a1 - 0.04, [...doorBlocks, ...majorBlocks[face]], 0.3), floorY, { w: gratingW });
    if (bayKit) for (const [s0, s1] of spans(cf.a0 + 0.3, cf.a1 - 0.3, [...doorBlocks, ...ribBlocks, ...majorBlocks[face]], 0.18, 0.5)) kickPlate(kit, wf, s0, s1, floorY, rand);
  }

  // per-bay features + kit
  cf.sides.forEach((face, fi) => {
    const wf = cf.walls[face];
    const isRail = railFaces.includes(face);
    const dropTo = pipeFaces.includes(face) ? floorY + 2.46 - 0.04 : trayFace === face ? ceilY - 0.16 : ceilY - 0.02;
    centres.forEach((bc, i) => {
      const kind = plan[face][i];
      if (!kind) return;
      placeFeature(kit, wf, bc, floorY, ceilY, kind, { rand, dropTo, isRail, sectionLabel });
      if (!bayKit) return;
      // mirrored slot layout: grille + 1.4 m lower plate one side, comm/fire panel on a 1.0 m upper plate the other
      const m = (fi ? -1 : 1) * (i % 2 ? -1 : 1);
      const tone = PLATE_TONES[(i + fi) % 2];
      overlayPlate(kit, wf, bc - m * 1.9, bc - m * 0.5, floorY + 0.34, floorY + 1.16, tone);
      overlayPlate(kit, wf, bc + m * 0.7, bc + m * 1.7, floorY + 1.25, floorY + 1.95, PLATE_TONES[(i + fi + 1) % 2]);
      vent(kit, wf, bc - m * 1.15, floorY, { y: 1.7, w: 0.6, h: 0.3 });
      if ((i + fi) % 2) firePanel(kit, wf, bc + m * 1.2, floorY);
      else commPanel(kit, wf, bc + m * 1.2, floorY);
    });
  });
  return ribPos;
}

export function placeFeature(kit, wf, a, floorY, ceilY, kind, { rand, dropTo, isRail, sectionLabel } = {}) {
  switch (kind) {
    case "junction":
      junctionBox(kit, wf, a, floorY, { rand, dropTo, hw: 0.22 + rand() * 0.08 });
      break;
    case "vent":
      if (rand() < 0.5 && !isRail) vent(kit, wf, a, floorY, { y: 0.48, w: 0.8, h: 0.34 });
      else vent(kit, wf, a, floorY, { y: 2.38, w: 0.8, h: 0.3 });
      break;
    case "intercom":
      intercom(kit, wf, a, floorY);
      break;
    case "signage": {
      const text = sectionLabel ? sectionLabel(a) : null;
      if (text) signPanel(kit, wf, a, 0, [{ label: text }], { top: floorY + SIGN_TOP });
      else vent(kit, wf, a, floorY, { y: 2.38, w: 0.8, h: 0.3 });
      break;
    }
    case "cableDrop":
      cableDrop(kit, wf, a, floorY, { fromY: dropTo, toY: isRail ? floorY + 1.25 : floorY + 0.14, rand });
      break;
    case "gauges":
      gauges(kit, wf, a, floorY);
      break;
    case "hatch":
      if (isRail) serviceHatch(kit, wf, a, floorY);
      else accessHatch(kit, wf, a, floorY, { rand });
      break;
    case "locker":
      locker(kit, wf, a, floorY, { led: rand() < 0.5 ? "emitAmber" : "emitGreen" });
      break;
    case "alcove":
      alcove(kit, wf, a, floorY);
      break;
    default:
      break;
  }
}

/**
 * Room-name signs beside side-wall doors: one panel per entry, on the side of the door given by `side` (±1 along).
 * The first label gets an arrow toward the door; `extra: [{ label, to? }]` appends direction rows for other
 * destinations along the same wall (`to` = along-coordinate; omit for a plain row).
 */
export function doorSigns(kit, cf, entries) {
  const byId = new Map(cf.sideDoors.map((d) => [d.id, d]));
  for (const e of entries) {
    const d = byId.get(e.id);
    if (!d) continue;
    const wf = cf.walls[d.face];
    const labelW = LABEL_H * LABEL_ASPECT;
    const w = labelW + 0.06 + LABEL_H * 1.15 + 0.18;
    const a = d.a + e.side * (d.w / 2 + 0.05 + 0.12 + w / 2 + (e.offset || 0));
    const rows = (e.labels || [e.label]).map((label, i) => ({ label, arrow: i === 0 ? arrowToward(wf, a, d.a) : null }));
    for (const x of e.extra || []) rows.push({ label: x.label, arrow: x.to === undefined ? null : arrowToward(wf, a, x.to) });
    signPanel(kit, wf, a, 0, rows, { top: cf.floorY + (e.top ?? SIGN_TOP) });
  }
}
