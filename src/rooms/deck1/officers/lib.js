// Officers' quarters — small shared helpers: wall-mounted boxes by normal, decal plates, amber lamps,
// wainscot bands and a local (u,v) frame so one cabin function serves both sides of the corridor.
import { FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

// Cheap deterministic rng (mulberry32) so cabins vary by seed without touching kit.rng
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box mounted on a wall: p = [x, yCentre, z] point on the wall face, n = outward normal of the face
 * ("+x"|"-x"|"+z"|"-z", pointing into the room), w along the wall, h vertical, d0..d1 depth from the face.
 */
export function mount(kit, mat, p, n, w, h, d0, d1, opts = {}) {
  const [x, y, z] = p;
  let min;
  let max;
  if (n === "+x") {
    min = [x + d0, y - h / 2, z - w / 2];
    max = [x + d1, y + h / 2, z + w / 2];
  } else if (n === "-x") {
    min = [x - d1, y - h / 2, z - w / 2];
    max = [x - d0, y + h / 2, z + w / 2];
  } else if (n === "+z") {
    min = [x - w / 2, y - h / 2, z + d0];
    max = [x + w / 2, y + h / 2, z + d1];
  } else {
    min = [x - w / 2, y - h / 2, z - d1];
    max = [x + w / 2, y + h / 2, z - d0];
  }
  kit.boxMM(mat, min, max, opts);
  return [min, max];
}

// Decal plate (sheet cell 0..15) sitting 4 mm proud of the wall
export function plate(kit, p, n, w, h, cell, d0 = 0.004) {
  mount(kit, "decal", p, n, w, h, d0, d0 + 0.004, { uv: "keep", uvRect: decalRect(cell) });
}

// Amber wall lamp: black housing with an emissive lens on the front and a light slot on top
export function amberLamp(kit, p, n, { w = 0.14, h = 0.32, emit = "emitAmber" } = {}) {
  mount(kit, "paintedMetal", p, n, w, h, 0, 0.09, { color: IMP.black, texel: 1 });
  mount(kit, emit, p, n, w - 0.04, h - 0.1, 0.09, 0.1);
  mount(kit, emit, [p[0], p[1] + h / 2, p[2]], n, w - 0.04, 0.012, 0.02, 0.08);
}

// Dark lower-wall panelling with a chair rail; face runs along `axis` ("x"|"z") at the given fixed coordinate.
// n = normal of the face; gaps = [[a0,a1]] ranges along the run left open (doors, fixtures).
export function wainscot(kit, { axis, at, from, to, n, gaps = [], y0 = 0.3, y1 = 1.1, proud = 0.035, color = IMP.dark, rail = IMP.mid }) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const segs = [];
  let cur = lo;
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  for (const g of sorted) {
    if (g[0] > cur + 0.05) segs.push([cur, Math.min(g[0], hi)]);
    cur = Math.max(cur, g[1]);
  }
  if (cur < hi - 0.05) segs.push([cur, hi]);
  for (const [a0, a1] of segs) {
    const w = a1 - a0;
    const c = (a0 + a1) / 2;
    const p = axis === "z" ? [at, 0, c] : [c, 0, at];
    mount(kit, "paintedMetal", [p[0], FLOOR + (y0 + y1) / 2, p[2]], n, w, y1 - y0, 0.0, proud, { color, texel: 1 });
    mount(kit, "metal", [p[0], FLOOR + y1 + 0.02, p[2]], n, w, 0.04, 0.0, proud + 0.012, { color: rail, texel: 2 });
    // vertical seams every ~1.2 m
    const nSeam = Math.max(0, Math.round(w / 1.2) - 1);
    for (let i = 1; i <= nSeam; i++) {
      const a = a0 + (w * i) / (nSeam + 1);
      const q = axis === "z" ? [at, 0, a] : [a, 0, at];
      mount(kit, "paintedMetal", [q[0], FLOOR + (y0 + y1) / 2, q[2]], n, 0.03, y1 - y0 - 0.04, proud, proud + 0.004, { color: IMP.black, texel: 1 });
    }
  }
}

// Ceiling luminaire: black housing flush with the ceiling + emissive diffuser
export function luminaire(kit, x0, x1, z0, z1, ceilY, { emit = "emitWarmSoft", drop = 0.06 } = {}) {
  kit.boxMM("paintedMetal", [x0, ceilY - drop, z0], [x1, ceilY, z1], { color: IMP.black, texel: 1 });
  kit.boxMM(emit, [x0 + 0.06, ceilY - drop - 0.01, z0 + 0.06], [x1 - 0.06, ceilY - drop, z1 - 0.06]);
}

// Wall vent: dark frame with three horizontal slats
export function vent(kit, p, n, w = 0.6, h = 0.3) {
  mount(kit, "paintedMetal", p, n, w, h, 0, 0.03, { color: IMP.black, texel: 1 });
  for (let i = -1; i <= 1; i++) mount(kit, "metal", [p[0], p[1] + i * (h / 3.6), p[2]], n, w - 0.08, h / 8, 0.03, 0.045, { color: IMP.mid, texel: 2 });
}

// Junction box with a status LED
export function junctionBox(kit, p, n, emit = "emitRedImp") {
  mount(kit, "paintedMetal", p, n, 0.14, 0.2, 0, 0.06, { color: IMP.black, texel: 1 });
  mount(kit, emit, [p[0], p[1] + 0.06, p[2]], n, 0.03, 0.03, 0.06, 0.065);
  mount(kit, "metal", [p[0], p[1] - 0.04, p[2]], n, 0.1, 0.02, 0.06, 0.065, { color: IMP.mid, texel: 2 });
}

/**
 * Local cabin frame. u runs along z (0 at z0, or at z1 when flipped), v runs from the door wall into the
 * cabin. side -1: door wall at x1 (west cabins), +1: door wall at x0 (east cabins). y is relative to FLOOR.
 */
export function makeFrame(x0, x1, z0, z1, side, flip) {
  const doorX = side < 0 ? x1 : x0;
  const X = (v) => doorX + side * v;
  const Z = (u) => (flip ? z1 - u : z0 + u);
  const U = z1 - z0;
  const V = x1 - x0;
  const nrm = (ln) => ({ "+v": side < 0 ? "-x" : "+x", "-v": side < 0 ? "+x" : "-x", "+u": flip ? "-z" : "+z", "-u": flip ? "+z" : "-z" })[ln];
  // shared seat() facing codes: 0 → -z, 1 → -x, 2 → +z, 3 → +x
  const facing = (ln) => ({ "+v": side < 0 ? 1 : 3, "-v": side < 0 ? 3 : 1, "+u": flip ? 0 : 2, "-u": flip ? 2 : 0 })[ln];
  const P = (u, y, v) => [X(v), FLOOR + y, Z(u)];
  const mm = (u0, u1, y0, y1, v0, v1) => {
    const xa = X(v0);
    const xb = X(v1);
    const za = Z(u0);
    const zb = Z(u1);
    return [
      [Math.min(xa, xb), FLOOR + y0, Math.min(za, zb)],
      [Math.max(xa, xb), FLOOR + y1, Math.max(za, zb)],
    ];
  };
  return {
    X,
    Z,
    U,
    V,
    nrm,
    facing,
    P,
    side,
    flip,
    box(kit, mat, u0, u1, y0, y1, v0, v1, opts) {
      const [min, max] = mm(u0, u1, y0, y1, v0, v1);
      kit.boxMM(mat, min, max, opts);
    },
    col(kit, u0, u1, y0, y1, v0, v1, tag) {
      const [min, max] = mm(u0, u1, y0, y1, v0, v1);
      kit.collider(min, max, tag);
    },
    cyl(kit, mat, u, y, v, r, len, axis, opts) {
      const wa = axis === "u" ? "z" : axis === "v" ? "x" : "y";
      kit.cyl(mat, X(v), FLOOR + y, Z(u), r, len, wa, opts);
    },
    // wall-mounted helpers in local terms: (u, y, v) point on the wall + local normal
    mount(kit, mat, u, y, v, ln, w, h, d0, d1, opts) {
      return mount(kit, mat, P(u, y, v), nrm(ln), w, h, d0, d1, opts);
    },
    plate(kit, u, y, v, ln, w, h, cell) {
      plate(kit, P(u, y, v), nrm(ln), w, h, cell);
    },
  };
}
