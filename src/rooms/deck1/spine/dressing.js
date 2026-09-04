// Corridor detail kit for Deck 1 (Agent B). Everything here is layered ON TOP of the shell that shared/imperial.js
// roomShell() + corridorDressing() build (floor, ceiling, panelled walls, centre strip): structural ribs carrying
// conduits, cable trays, handrails, floor grating strips, per-bay wall features (junction box / vent / intercom /
// signage / cable drop / access hatch), backlit signage panels, yellow-black hazard chevrons, status housings and
// end treatments. Functions take (kit, frame, world numbers, opts) so the same code can be layered on D's
// corridorSegment() when it lands (§9.3) — nothing here rebuilds walls, floor or ceiling.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { doorHole, doorFace } from "../shared/doors.js";
import { WALL_T } from "../shared/imperial.js";
import { labelRect, arrowRect, chevronRect, LABEL_ASPECT } from "./signage.js";

export const CABLE = {
  black: IMP.black,
  grey: IMP.hullDark,
  red: new THREE.Color("#6a231c"),
  amber: new THREE.Color("#7a5a1e"),
};

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

// Flat textured quad on the floor: `long` runs along longAxis and carries the atlas cell's u axis.
export function floorQuad(kit, mat, center, long, short, rect, longAxis = "x") {
  const g = new THREE.PlaneGeometry(long, short);
  g.rotateX(-Math.PI / 2);
  if (longAxis === "z") g.rotateY(Math.PI / 2);
  kit.add(mat, g, { pos: center, uv: "keep", uvRect: rect });
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/** Structural ribs at along-positions: two-tone flanges with bolted face plates, kick blocks, a ceiling cross member
 *  with a recessed light line. heavy = junction ribs. */
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
        // vertical accent groove with a status marker
        wf.box(kit, "paintedMetal", a - 0.03, a + 0.03, floorY + 0.5, ceilY - d - 0.1, d + 0.015, d + 0.03, { color: IMP.black, texel: 2 });
        wf.box(kit, "emitBlue", a - 0.015, a + 0.015, floorY + 2.3, floorY + 2.5, d + 0.02, d + 0.034);
      }
      wf.collider(kit, a - w / 2, a + w / 2, floorY, ceilY, 0, d, "rib");
    }
    cf.box(kit, "paintedMetal", a - w / 2, a + w / 2, ceilY - d, ceilY, cf.c0, cf.c1, { color, texel: 1 });
    if (lamp) {
      // recessed light line on the underside (protrudes 4 mm so no face is coplanar with the member)
      cf.box(kit, "paintedMetal", a - 0.05, a + 0.05, ceilY - d - 0.006, ceilY - d + 0.03, cf.c0 + d + 0.05, cf.c1 - d - 0.05, { color: IMP.black, texel: 1 });
      cf.box(kit, emit, a - 0.018, a + 0.018, ceilY - d - 0.01, ceilY - d + 0.02, cf.c0 + d + 0.12, cf.c1 - d - 0.12);
    }
  }
}

/** Conduit run along a wall: pipes over the given spans with elbow blocks turning into the wall at each end and
 *  saddle clamps at `clampsAt`. */
export function conduitRun(kit, wf, runSpans, { y, r = 0.04, d = 0.1, color = IMP.hullDark, mat = "metal", clampsAt = [], segments = 10 } = {}) {
  for (const [s0, s1] of runSpans) {
    if (s1 - s0 < 0.5) continue;
    wf.pipe(kit, mat, s0 + 0.08, s1 - 0.08, y, d, r, { color, segments });
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
    wf.box(kit, "paintedMetal", s0, s1, yb, yb + 0.012, 0.005, w, { color: IMP.dark, texel: 1 });
    wf.box(kit, "paintedMetal", s0, s1, yb, yb + h, w - 0.012, w, { color: IMP.dark, texel: 1 });
    for (let i = 0; i < 4; i++) {
      const dd = 0.035 + i * 0.05;
      const rr = i % 2 ? 0.011 : 0.016;
      wf.box(kit, "paintedMetal", s0 + 0.04, s1 - 0.04, yb + 0.012, yb + 0.012 + 2 * rr, dd - rr, dd + rr, { color: cols[i], texel: 2 });
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
    wf.pipe(kit, "metal", s0, s1, ry, d, r, { color: IMP.steel, segments: 10, texel: 2 });
    wf.pipe(kit, "metalRough", s0 - 0.005, s0 + 0.05, ry, d, r + 0.007, { color: IMP.mid, segments: 10 });
    wf.pipe(kit, "metalRough", s1 - 0.05, s1 + 0.005, ry, d, r + 0.007, { color: IMP.mid, segments: 10 });
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
    wf.box(kit, "paintedMetal", s0, s1, floorY + 0.001, floorY + 0.006, 0.02, w - 0.02, { color: IMP.black, texel: 1 });
    const g = new THREE.PlaneGeometry(w, L);
    g.rotateX(-Math.PI / 2);
    if (wf.axis === "x") g.rotateY(Math.PI / 2);
    kit.add("grate", g, { pos: wf.pt((s0 + s1) / 2, floorY + 0.012, w / 2), uv: "scale", uvScale: [w / 1.24, L / 0.9] });
    for (const dd of [0.015, 0.31, w - 0.015]) wf.box(kit, "metal", s0, s1, floorY, floorY + 0.03, dd - 0.015, dd + 0.015, { color: IMP.mid, texel: 2 });
    wf.box(kit, "metal", s0 - 0.02, s0 + 0.03, floorY, floorY + 0.03, 0, w, { color: IMP.mid, texel: 2 });
    wf.box(kit, "metal", s1 - 0.03, s1 + 0.02, floorY, floorY + 0.03, 0, w, { color: IMP.mid, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Wall features (one per bay)
// ---------------------------------------------------------------------------

export function junctionBox(kit, wf, a, floorY, { rand = Math.random, dropTo = null, hw = 0.26, y0 = 1.25, h = 0.6, leds = ["emitGreen", "emitGreen", "emitAmber", "emitBlue", "emitRedImp"] } = {}) {
  const yb = floorY + y0;
  const yt = yb + h;
  const d = 0.13;
  wf.box(kit, "metalRough", a - hw, a + hw, yb, yt, -0.01, d, { color: IMP.mid, texel: 1 });
  wf.box(kit, "paintedMetal", a - hw + 0.03, a + hw - 0.03, yb + 0.03, yt - 0.15, d - 0.005, d + 0.012, { color: IMP.dark, texel: 1 });
  wf.box(kit, "metal", a - hw + 0.035, a - hw + 0.055, yb + 0.06, yt - 0.18, d + 0.012, d + 0.02, { color: IMP.steel, texel: 2 });
  wf.box(kit, "metal", a + hw - 0.1, a + hw - 0.06, yb + 0.26, yb + 0.3, d + 0.012, d + 0.026, { color: IMP.steel, texel: 2 });
  const n = 4;
  const off = Math.floor(rand() * leds.length);
  for (let i = 0; i < n; i++) {
    const la = a - 0.12 + i * 0.08;
    wf.box(kit, "paintedMetal", la - 0.02, la + 0.02, yt - 0.1, yt - 0.05, d - 0.005, d + 0.004, { color: IMP.black, texel: 2 });
    wf.box(kit, leds[(off + i) % leds.length], la - 0.012, la + 0.012, yt - 0.09, yt - 0.06, d + 0.004, d + 0.009);
  }
  // stencil on the door plate
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
  const slats = 6;
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
  wf.box(kit, "emitBlue", a + 0.05, a + 0.09, yc - 0.12, yc - 0.08, d + 0.006, d + 0.012);
  wf.box(kit, "emitRedImp", a + 0.1, a + 0.115, yc - 0.045, yc - 0.03, d + 0.006, d + 0.012);
  wf.box(kit, "paintedMetal", a - hw - 0.01, a + hw + 0.01, yc + hh, yc + hh + 0.02, -0.01, d + 0.03, { color: IMP.black, texel: 1 });
}

export function cableDrop(kit, wf, a, floorY, { fromY, toY, rand = Math.random, led = null } = {}) {
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
  wf.box(kit, led || (rand() < 0.5 ? "emitGreen" : "emitAmber"), a + 0.06, a + 0.08, toY + 0.05, toY + 0.07, 0.11, 0.115);
  wf.box(kit, "metalRough", a - 0.12, a + 0.12, fromY - 0.06, fromY + 0.05, -0.01, 0.1, { color: IMP.mid, texel: 1 });
}

export function accessHatch(kit, wf, a, floorY, { w = 0.9, y0 = 0.36, y1 = 1.96, rand = Math.random, led = null } = {}) {
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
  wf.box(kit, led || (rand() < 0.7 ? "emitGreen" : "emitAmber"), a + w / 2 - 0.16, a + w / 2 - 0.12, yt - 0.15, yt - 0.11, 0.025, 0.031);
  wf.quad(kit, "signPaint", a, yt - 0.14, 0.027, 0.4, 0.4 / LABEL_ASPECT, labelRect("MAINTENANCE"));
}

// Boot scuffs just above the kick: flat, slightly darker plates (functional wear, never rust)
export function scuffs(kit, wf, a, floorY, rand) {
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const w = 0.15 + rand() * 0.35;
    const sa = a - 1.2 + rand() * 2.4;
    wf.box(kit, "paintedMetal", sa - w / 2, sa + w / 2, floorY + 0.3, floorY + 0.33 + rand() * 0.05, -0.002, 0.004, { color: new THREE.Color("#22252b"), texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Signage / markings / status
// ---------------------------------------------------------------------------

/** Standard top edge of wall signage: just under the 2.05 m wall light strip so no panel ever covers it. */
export const SIGN_TOP = 2.0;

/**
 * Backlit sign panel on a wall at along-coordinate `a`. `y` is the panel centre; pass `top` (world y) instead to
 * hang the panel from a common top edge regardless of its row count (`SIGN_TOP` above the floor).
 * rows: [{ label, arrow?: "left"|"right"|"up"|"down", arrowAt?: "left"|"right" }].
 * Arrows point in the viewer's frame; the panel is a dark plate with the glyph quads set 4 mm proud.
 */
export function signPanel(kit, wf, a, y, rows, { d = 0.03, labelH = 0.14, pad = 0.09, rowH = 0.2, top = null } = {}) {
  const labelW = labelH * LABEL_ASPECT;
  const arrowS = labelH;
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

/** Status light housing (red = locked / sealed) on a wall. */
export function statusHousing(kit, wf, a, yc, { emit = "emitRedImp", w = 0.5, h = 0.14, d = 0.1 } = {}) {
  wf.box(kit, "metalRough", a - w / 2, a + w / 2, yc - h / 2, yc + h / 2, -0.01, d, { color: IMP.dark, texel: 1 });
  wf.box(kit, emit, a - w / 2 + 0.07, a + w / 2 - 0.07, yc - 0.03, yc + 0.03, d - 0.005, d + 0.012);
  wf.box(kit, "paintedMetal", a - w / 2 - 0.015, a + w / 2 + 0.015, yc + h / 2, yc + h / 2 + 0.022, -0.01, d + 0.035, { color: IMP.black, texel: 1 });
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
  cw.box(kit, "paintedMetal", ga - 0.06, ga + 0.06, floorY + 1.6, floorY + 1.71, 0.06, 0.064, { color: IMP.black, texel: 2 });
  cw.box(kit, "emitAmber", ga - 0.04, ga + 0.04, floorY + 1.5, floorY + 1.52, 0.06, 0.066);
  cw.stub(kit, "metal", ga, floorY + 2.05, 0.0, 0.12, 0.03, { color: IMP.steel });
  cw.box(kit, "paintedMetal", ga - 0.02, ga + 0.02, floorY + 1.75, floorY + 2.05, 0.03, 0.07, { color: IMP.black, texel: 2 });
}

/** Sealed maintenance bulkhead on a door-less end wall: heavy frame, bolted hatch plate, status housing,
 *  chevron bands, threshold chevrons and a pipe manifold. */
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
  // hatch plate with centre seam and bolt rows
  const hw = 0.62;
  wf.box(kit, "metalRough", a - hw, a + hw, floorY + 0.16, floorY + fh - f - 0.04, -0.01, 0.045, { color: IMP.hullDark, texel: 1 });
  wf.box(kit, "paintedMetal", a - 0.006, a + 0.006, floorY + 0.2, floorY + fh - f - 0.08, 0.045, 0.048, { color: IMP.black, texel: 2 });
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) wf.box(kit, "metal", a + s * (hw - 0.07) - 0.02, a + s * (hw - 0.07) + 0.02, floorY + 0.3 + k * 0.4 - 0.02, floorY + 0.3 + k * 0.4 + 0.02, 0.045, 0.065, { color: IMP.steel, texel: 2 });
  for (const s of [-1, 1]) wf.box(kit, "paintedMetal", a + s * 0.2 - 0.08, a + s * 0.2 + 0.08, floorY + 1.1, floorY + 1.18, 0.02, 0.046, { color: IMP.black, texel: 2 });
  wf.quad(kit, "signPaint", a, floorY + 2.2, 0.047, 0.62, 0.62 / LABEL_ASPECT, labelRect("MAINTENANCE"));
  wf.quad(kit, "signPaint", a, floorY + 2.05, 0.047, 0.62, 0.62 / LABEL_ASPECT, labelRect("SEALED"));
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
  wf.collider(kit, a - fw / 2, a + fw / 2, floorY, floorY + fh, 0, 0.12, "bulkhead");
  void rand;
}

// ---------------------------------------------------------------------------
// Orchestrator for a straight corridor
// ---------------------------------------------------------------------------

export const FEATURE_KINDS = ["junction", "vent", "intercom", "signage", "cableDrop", "hatch"];

/**
 * Bay-based dressing: ribs every `ribEvery` m (skipping doors and `noRibs` intervals), conduits / tray / handrail /
 * grating per face, one feature per bay per side wall (cycling the six kinds), scuffs. Returns rib positions.
 * opts: { seed, ribEvery, ribPhase, pipeFaces, trayFace, railFace, gratingFaces, gratingW, noRibs: [[a0,a1]],
 *         reserved: [{face, a0, a1}], sectionLabel: (a) => text|null, features: bool }
 */
export function dressCorridor(kit, cf, opts = {}) {
  const {
    seed = 1,
    ribEvery = 4,
    ribPhase = 1.7,
    pipeFaces = [],
    trayFace = null,
    railFace = null,
    gratingFaces = cf.sides,
    gratingW = 0.62,
    noRibs = [],
    extraBlocks = [], // [{a, w}] extra obstacles (e.g. heavy junction ribs) that cut runs on every side wall
    reserved = [],
    sectionLabel = null,
    features = true,
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

  // bays between ribs (and the corridor ends)
  const edges = [cf.a0, ...ribPos, cf.a1];
  const bays = [];
  for (let i = 0; i < edges.length - 1; i++) if (edges[i + 1] - edges[i] > 2.4) bays.push([edges[i], edges[i + 1]]);
  const clampPos = bays.flatMap(([b0, b1]) => (b1 - b0 > 3 ? [b0 + 1.0, b1 - 1.0] : [(b0 + b1) / 2]));

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
    if (railFace === face) handrail(kit, wf, spans(cf.a0 + 0.35, cf.a1 - 0.35, [...doorBlocks, ...ribBlocks], 0.4), floorY);
    if (gratingFaces.includes(face)) gratingStrips(kit, wf, spans(cf.a0 + 0.04, cf.a1 - 0.04, doorBlocks, 0.3), floorY, { w: gratingW });
  }

  // one feature per 4 m bay centre per wall (a fixed grid, so stretches where doors removed ribs stay as dense as
  // the rest), cycling the six kinds with a per-face offset so facing walls never show the same thing
  if (features) {
    const order = [...FEATURE_KINDS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const centres = [];
    for (let a = cf.a0 + ribPhase + ribEvery / 2; a < cf.a1 - 1.0; a += ribEvery) centres.push(+a.toFixed(3));
    cf.sides.forEach((face, fi) => {
      const wf = cf.walls[face];
      const isRail = railFace === face;
      const dropTo = pipeFaces.includes(face) ? floorY + 2.46 - 0.04 : trayFace === face ? ceilY - 0.16 : ceilY - 0.02;
      centres.forEach((bc, i) => {
        // door zone = jamb + a 1.4 m door sign + gap on either side (doorSigns() runs after this)
        if (doorsOn(face).some((d) => Math.abs(d.a - bc) < d.w / 2 + 1.9)) return;
        if (reserved.some((r) => r.face === face && bc > r.a0 && bc < r.a1)) return;
        if (extraBlocks.some((b) => Math.abs(b.a - bc) < b.w / 2 + 0.8)) return;
        let kind = order[(i + fi * 3) % order.length];
        if (isRail && kind === "hatch") kind = "vent";
        placeFeature(kit, wf, bc, floorY, ceilY, kind, { rand, dropTo, isRail, sectionLabel });
        if (rand() < 0.45) scuffs(kit, wf, bc, floorY, rand);
      });
    });
  }
  return ribPos;
}

export function placeFeature(kit, wf, a, floorY, ceilY, kind, { rand, dropTo, isRail, sectionLabel } = {}) {
  switch (kind) {
    case "junction":
      junctionBox(kit, wf, a, floorY, { rand, dropTo, hw: 0.22 + rand() * 0.08 });
      break;
    case "vent":
      if (rand() < 0.5 && !isRail) vent(kit, wf, a, floorY, { y: 0.48, w: 0.9, h: 0.34 });
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
    case "hatch":
      accessHatch(kit, wf, a, floorY, { rand });
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
    const labelW = 0.14 * LABEL_ASPECT;
    const w = labelW + 0.06 + 0.14 + 0.18;
    const a = d.a + e.side * (d.w / 2 + 0.05 + 0.12 + w / 2 + (e.offset || 0));
    const rows = (e.labels || [e.label]).map((label, i) => ({ label, arrow: i === 0 ? arrowToward(wf, a, d.a) : null }));
    for (const x of e.extra || []) rows.push({ label: x.label, arrow: x.to === undefined ? null : arrowToward(wf, a, x.to) });
    signPanel(kit, wf, a, 0, rows, { top: cf.floorY + (e.top ?? SIGN_TOP) });
  }
}
