// Closed Imperial room shell for Decks 2/3: floor slab, ceiling with light channels, four panelled
// walls with black recessed seams, kick plates, a waist-height light strip, cornice, optional ribs.
// Door holes come straight from the manifest's doors[] (COORDINATION.md §7/§9.1); the doors system
// fills them. Extra openings (windows, the lift door, pass-throughs) are listed in `openings`.
// Everything is kit-bashed into ctx.kit; walls sit inside the bounds (0.30 m thick).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP, col } from "./palette.js";
import { doorRect } from "./doors.js";

export const WALL_T = 0.3;
export const SLAB_T = 0.5;
const SEAM = 0.03;
const PANEL_T = 0.05;

// A vertical wall face of an AABB room, described from inside: origin = left end at floor level,
// U = along the wall (left→right as seen from inside), N = inward normal. V is +Y.
class Face {
  constructor(key, origin, U, N, L) {
    this.key = key;
    this.o = origin;
    this.U = U;
    this.N = N;
    this.L = L;
  }
  world(u, v, n) {
    return [this.o[0] + this.U[0] * u + this.N[0] * n, this.o[1] + v, this.o[2] + this.U[2] * u + this.N[2] * n];
  }
  size(su, sv, sn) {
    return [Math.abs(this.U[0]) * su + Math.abs(this.N[0]) * sn, sv, Math.abs(this.U[2]) * su + Math.abs(this.N[2]) * sn];
  }
  // u coordinate of a world point lying on this face
  u(x, z) {
    return (x - this.o[0]) * this.U[0] + (z - this.o[2]) * this.U[2];
  }
}

export function faces(bounds, floorY) {
  const [x0, , z0] = bounds.min;
  const [x1, , z1] = bounds.max;
  return {
    n: new Face("n", [x0, floorY, z0], [1, 0, 0], [0, 0, 1], x1 - x0),
    s: new Face("s", [x1, floorY, z1], [-1, 0, 0], [0, 0, -1], x1 - x0),
    w: new Face("w", [x0, floorY, z1], [0, 0, -1], [1, 0, 0], z1 - z0),
    e: new Face("e", [x1, floorY, z0], [0, 0, 1], [-1, 0, 0], z1 - z0),
  };
}

function faceOf(bounds, pos) {
  const e = 1e-3;
  if (Math.abs(pos[0] - bounds.min[0]) < e) return "w";
  if (Math.abs(pos[0] - bounds.max[0]) < e) return "e";
  if (Math.abs(pos[2] - bounds.min[2]) < e) return "n";
  if (Math.abs(pos[2] - bounds.max[2]) < e) return "s";
  return null;
}

// Free intervals of [0, len] after removing [a, b] ranges.
function subtract(len, ranges) {
  let spans = [[0, len]];
  for (const [a, b] of ranges) {
    const next = [];
    for (const [s0, s1] of spans) {
      if (b <= s0 || a >= s1) next.push([s0, s1]);
      else {
        if (a > s0) next.push([s0, a]);
        if (b < s1) next.push([b, s1]);
      }
    }
    spans = next;
  }
  return spans.filter(([a, b]) => b - a > 0.02);
}

/**
 * Build the shell.
 * @param ctx  build context (kit, PALETTE, lights, seed)
 * @param spec {
 *   bounds, floorY, ceilY,
 *   doors: manifest.doors,
 *   openings: [{ face, a0, a1, y0, y1, kind: "window"|"lift"|"pass", glass, reveal }],  a = x on n/s, z on e/w
 *   panelW, rows, ribs (spacing m, 0 = none), stripY (light strip height), strip (bool),
 *   floor: { mat, color, strip: { axis, width } } | false,
 *   ceiling: { channels: spacing m | 0, axis: "x"|"z", mat, color } | false,
 *   wallColor, kickColor, corniceColor, seamColor,
 *   lights: false | { count, color, intensity, distance, y, priority },
 *   collide: true, skipFaces: [] (faces another module builds, e.g. an open side)
 * }
 * Returns { faces, openings } for the room to place things against.
 */
export function buildShell(ctx, spec) {
  const { kit, PALETTE, seed = 1 } = ctx;
  const rand = rng((spec.seed ?? seed) * 7919 + 17);
  const { bounds, floorY, ceilY, doors = [], openings = [] } = spec;
  const H = ceilY - floorY;
  const panelW = spec.panelW ?? 1.6;
  const stripY = spec.stripY ?? 2.05;
  const hasStrip = spec.strip !== false && H > 2.8;
  const ribs = spec.ribs ?? 0;
  const P = (k) => col(PALETTE, k);
  const wallColor = spec.wallColor ?? P("impWhite");
  const wallAlt = spec.wallAlt ?? P("impGrey");
  const kickColor = spec.kickColor ?? P("impDark");
  const corniceColor = spec.corniceColor ?? P("impMid");
  const seamColor = spec.seamColor ?? P("impBlack");
  const panelMat = spec.panelMat ?? "impPanel";
  const F = faces(bounds, floorY);
  const skip = new Set(spec.skipFaces || []);

  // ---- collect openings per face in wall-local (u, v) ------------------------------------------
  const perFace = { n: [], s: [], e: [], w: [] };
  for (const d of doors) {
    const fk = faceOf(bounds, d.pos);
    if (!fk) throw new Error(`[shell] door ${d.id} is not on a bounds face`);
    const f = F[fk];
    const { w, h } = doorRect(d);
    const u = f.u(d.pos[0], d.pos[2]);
    perFace[fk].push({ u0: u - w / 2, u1: u + w / 2, v0: 0, v1: Math.min(h, H - 0.25), kind: "door", id: d.id, isDoor: true });
  }
  for (const o of openings) {
    const f = F[o.face];
    const [ua, ub] = o.face === "n" || o.face === "s" ? [f.u(o.a0, 0), f.u(o.a1, 0)] : [f.u(0, o.a0), f.u(0, o.a1)];
    perFace[o.face].push({
      u0: Math.min(ua, ub),
      u1: Math.max(ua, ub),
      v0: o.y0 - floorY,
      v1: o.y1 - floorY,
      kind: o.kind || "window",
      isDoor: o.kind === "lift" || o.kind === "pass" || o.y0 - floorY < 0.05,
      glass: o.glass,
      reveal: o.reveal !== false,
      id: o.id,
    });
  }

  // ---- rows ------------------------------------------------------------------------------------
  let rows = spec.rows;
  if (!rows) {
    rows = [0, 0.4];
    if (hasStrip) rows.push(stripY, stripY + 0.22);
    const top = H - 0.55;
    let v = rows[rows.length - 1];
    const upper = top - v;
    const nUp = Math.max(1, Math.round(upper / 2.2));
    for (let i = 1; i < nUp; i++) rows.push(v + (upper * i) / nUp);
    rows.push(top, H);
  }
  const stripRow = hasStrip ? rows.indexOf(stripY) : -1;

  // ---- walls -----------------------------------------------------------------------------------
  for (const fk of ["n", "s", "e", "w"]) {
    if (skip.has(fk)) continue;
    const f = F[fk];
    const L = f.L;
    const ops = perFace[fk];
    const box = (mat, u, v, n, su, sv, sn, opts = {}) => kit.add(mat, new THREE.BoxGeometry(...f.size(su, sv, sn)), { pos: f.world(u, v, n), ...opts });

    // backing slab (dark, shows through the seams), cut around openings
    {
      const cuts = [0, L];
      for (const o of ops) cuts.push(Math.max(0, o.u0), Math.min(L, o.u1));
      cuts.sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        const u0 = cuts[i];
        const u1 = cuts[i + 1];
        if (u1 - u0 < 0.01) continue;
        const um = (u0 + u1) / 2;
        const cover = ops.filter((o) => um > o.u0 && um < o.u1);
        const free = subtract(H, cover.map((o) => [o.v0, o.v1]));
        for (const [v0, v1] of free) {
          box("paintedMetal", um, (v0 + v1) / 2, (WALL_T - PANEL_T) / 2, u1 - u0, v1 - v0, WALL_T - PANEL_T, { color: seamColor, texel: 0.5 });
        }
      }
    }

    // panel grid
    const nCols = Math.max(1, Math.round(L / panelW));
    let uCuts = [];
    for (let i = 0; i <= nCols; i++) uCuts.push((i / nCols) * L);
    const edgesU = [];
    for (const o of ops) edgesU.push(o.u0, o.u1);
    uCuts = uCuts.filter((c) => !edgesU.some((e) => Math.abs(e - c) < 0.35) && !ops.some((o) => c > o.u0 + 0.01 && c < o.u1 - 0.01));
    uCuts.push(...edgesU.filter((e) => e > 0.001 && e < L - 0.001));
    uCuts.sort((a, b) => a - b);
    uCuts = uCuts.filter((c, i) => i === 0 || c - uCuts[i - 1] > 0.05);

    for (let ci = 0; ci < uCuts.length - 1; ci++) {
      const u0 = uCuts[ci];
      const u1 = uCuts[ci + 1];
      const cw = u1 - u0;
      const cu = (u0 + u1) / 2;
      const colOps = ops.filter((o) => o.u1 > u0 + 1e-3 && o.u0 < u1 - 1e-3);
      let vCuts = rows.filter((c) => !colOps.some((o) => (Math.abs(c - o.v0) < 0.2 && o.v0 > 0.01) || Math.abs(c - o.v1) < 0.2 || (c > o.v0 + 0.01 && c < o.v1 - 0.01)));
      for (const o of colOps) {
        if (o.v0 > 0.001) vCuts.push(o.v0);
        if (o.v1 < H - 0.001) vCuts.push(o.v1);
      }
      vCuts.sort((a, b) => a - b);
      vCuts = vCuts.filter((c, i) => i === 0 || c - vCuts[i - 1] > 0.05);
      for (let ri = 0; ri < vCuts.length - 1; ri++) {
        const v0 = vCuts[ri];
        const v1 = vCuts[ri + 1];
        const ch = v1 - v0;
        const cv = (v0 + v1) / 2;
        if (colOps.some((o) => cu > o.u0 - 1e-3 && cu < o.u1 + 1e-3 && cv > o.v0 - 1e-3 && cv < o.v1 + 1e-3)) continue;
        const n = WALL_T - PANEL_T / 2;
        if (v0 < 0.01) {
          // kick plate: dark, slightly proud, with a scuff line
          box("paintedMetal", cu, cv, n + 0.01, cw - SEAM, ch - SEAM, PANEL_T + 0.02, { color: kickColor, texel: 1 });
        } else if (hasStrip && Math.abs(v0 - stripY) < 0.02) {
          // light strip band: recessed housing + emitter
          box("paintedMetal", cu, cv, n - 0.02, cw - SEAM, ch - SEAM, PANEL_T - 0.04, { color: P("impBlack") });
          box(spec.stripMat || "emitWhite", cu, cv, n + 0.005, cw - SEAM - 0.08, 0.07, 0.02);
        } else if (v1 > H - 0.01) {
          // cornice band
          box("paintedMetal", cu, cv, n - 0.01, cw - SEAM, ch - SEAM, PANEL_T - 0.02, { color: corniceColor, texel: 1 });
        } else {
          const c = rand() < (spec.altChance ?? 0.14) ? wallAlt : wallColor;
          const g = box(panelMat, cu, cv, n, cw - SEAM, ch - SEAM, PANEL_T, { color: c, uv: "keep" });
          if (rand() < 0.5) flipUVs(g);
        }
      }
    }

    // reveals + glass for non-door openings (door tunnels are the doors system's)
    for (const o of ops) {
      if (o.isDoor && o.kind !== "lift") continue;
      if (o.kind === "lift") continue;
      if (o.reveal !== false) {
        const t = 0.05;
        const w = o.u1 - o.u0;
        const h = o.v1 - o.v0;
        box("paintedMetal", (o.u0 + o.u1) / 2, o.v0 + t / 2, WALL_T / 2, w, t, WALL_T, { color: P("impDark") });
        box("paintedMetal", (o.u0 + o.u1) / 2, o.v1 - t / 2, WALL_T / 2, w, t, WALL_T, { color: P("impDark") });
        box("paintedMetal", o.u0 + t / 2, (o.v0 + o.v1) / 2, WALL_T / 2, t, h, WALL_T, { color: P("impDark") });
        box("paintedMetal", o.u1 - t / 2, (o.v0 + o.v1) / 2, WALL_T / 2, t, h, WALL_T, { color: P("impDark") });
      }
      if (o.glass) box("glass", (o.u0 + o.u1) / 2, (o.v0 + o.v1) / 2, WALL_T / 2, o.u1 - o.u0 - 0.1, o.v1 - o.v0 - 0.1, 0.02, { uv: "keep" });
    }

    // ribs: vertical structural members clear of openings
    if (ribs > 0) {
      for (let u = ribs / 2; u < L - 0.3; u += ribs) {
        if (ops.some((o) => u > o.u0 - 0.5 && u < o.u1 + 0.5)) continue;
        box("paintedMetal", u, H / 2, WALL_T + 0.1, 0.36, H, 0.2, { color: P("impDark"), texel: 1 });
        box("paintedMetal", u, H / 2, WALL_T + 0.22, 0.24, H - 0.8, 0.04, { color: P("impMid"), texel: 1 });
      }
    }

    // colliders: wall spans not covered by a floor-level opening
    if (spec.collide !== false) {
      const spans = subtract(L, ops.filter((o) => o.isDoor).map((o) => [o.u0, o.u1]));
      for (const [a, b] of spans) {
        const c0 = f.world(a, 0, 0);
        const c1 = f.world(b, H, WALL_T + (ribs > 0 ? 0.2 : 0));
        kit.collider([Math.min(c0[0], c1[0]), floorY, Math.min(c0[2], c1[2])], [Math.max(c0[0], c1[0]), ceilY, Math.max(c0[2], c1[2])], `wall-${fk}`);
      }
    }
  }

  // ---- floor -----------------------------------------------------------------------------------
  const [x0, , z0] = bounds.min;
  const [x1, , z1] = bounds.max;
  if (spec.floor !== false) {
    const fl = spec.floor || {};
    kit.boxMM(fl.mat || "impFloor", [x0, floorY - SLAB_T, z0], [x1, floorY, z1], { color: fl.color ?? P("impMid"), texel: 0.5 });
    if (fl.strip) {
      const w = fl.strip.width ?? 0.9;
      const c = fl.strip.color ?? P("impBlack");
      if (fl.strip.axis === "x") kit.boxMM(fl.strip.mat || "blackGloss", [x0 + WALL_T, floorY, (z0 + z1) / 2 - w / 2], [x1 - WALL_T, floorY + 0.012, (z0 + z1) / 2 + w / 2], { color: c });
      else kit.boxMM(fl.strip.mat || "blackGloss", [(x0 + x1) / 2 - w / 2, floorY, z0 + WALL_T], [(x0 + x1) / 2 + w / 2, floorY + 0.012, z1 - WALL_T], { color: c });
    }
  }

  // ---- ceiling ---------------------------------------------------------------------------------
  if (spec.ceiling !== false) {
    const ce = spec.ceiling || {};
    const cColor = ce.color ?? P("impDark");
    kit.boxMM("paintedMetal", [x0, ceilY, z0], [x1, ceilY + SLAB_T, z1], { color: P("impBlack"), texel: 0.5 });
    const axis = ce.axis || (x1 - x0 >= z1 - z0 ? "x" : "z");
    const spacing = ce.channels ?? 4;
    const chanW = ce.channelWidth ?? 0.5;
    const ix0 = x0 + WALL_T;
    const ix1 = x1 - WALL_T;
    const iz0 = z0 + WALL_T;
    const iz1 = z1 - WALL_T;
    // channel positions across the short axis
    const across0 = axis === "x" ? iz0 : ix0;
    const across1 = axis === "x" ? iz1 : ix1;
    const span = across1 - across0;
    const chans = [];
    if (spacing > 0) {
      const n = Math.max(1, Math.round(span / spacing));
      for (let i = 0; i < n; i++) chans.push(across0 + ((i + 0.5) / n) * span);
    }
    // ceiling panels in the bands between channels
    const bands = subtract(span, chans.map((c) => [c - across0 - chanW / 2, c - across0 + chanW / 2]));
    const pw = ce.panelW ?? 2.0;
    for (const [b0, b1] of bands) {
      const a0 = across0 + b0;
      const a1 = across0 + b1;
      const along0 = axis === "x" ? ix0 : iz0;
      const along1 = axis === "x" ? ix1 : iz1;
      const nA = Math.max(1, Math.round((along1 - along0) / pw));
      const nB = Math.max(1, Math.round((a1 - a0) / pw));
      for (let i = 0; i < nA; i++) {
        for (let j = 0; j < nB; j++) {
          const p0 = along0 + ((along1 - along0) * i) / nA + SEAM / 2;
          const p1 = along0 + ((along1 - along0) * (i + 1)) / nA - SEAM / 2;
          const q0 = a0 + ((a1 - a0) * j) / nB + SEAM / 2;
          const q1 = a0 + ((a1 - a0) * (j + 1)) / nB - SEAM / 2;
          const [bx0, bz0, bx1, bz1] = axis === "x" ? [p0, q0, p1, q1] : [q0, p0, q1, p1];
          const g = kit.boxMM(ce.mat || panelMat, [bx0, ceilY - 0.06, bz0], [bx1, ceilY, bz1], { color: rand() < 0.1 ? P("impMid") : cColor, uv: "keep" });
          if (rand() < 0.5) flipUVs(g);
        }
      }
    }
    // light channels: recessed housing with an emitter strip (segmented every 2 m)
    for (const c of chans) {
      const r = (lo, hi, y0, y1, mat, opts) => (axis === "x" ? kit.boxMM(mat, [ix0, y0, lo], [ix1, y1, hi], opts) : kit.boxMM(mat, [lo, y0, iz0], [hi, y1, iz1], opts));
      r(c - chanW / 2, c + chanW / 2, ceilY - 0.12, ceilY - 0.02, "paintedMetal", { color: P("impBlack") });
      r(c - chanW / 2 - 0.05, c - chanW / 2, ceilY - 0.1, ceilY, "paintedMetal", { color: P("impMid") });
      r(c + chanW / 2, c + chanW / 2 + 0.05, ceilY - 0.1, ceilY, "paintedMetal", { color: P("impMid") });
      const sw = ce.stripWidth ?? 0.18;
      const len = axis === "x" ? ix1 - ix0 : iz1 - iz0;
      const seg = ce.segment ?? 2.0;
      const nSeg = Math.max(1, Math.round(len / seg));
      for (let i = 0; i < nSeg; i++) {
        const s0 = (axis === "x" ? ix0 : iz0) + (len * i) / nSeg + 0.12;
        const s1 = (axis === "x" ? ix0 : iz0) + (len * (i + 1)) / nSeg - 0.12;
        if (axis === "x") kit.boxMM(ce.stripMat || "emitWhite", [s0, ceilY - 0.11, c - sw / 2], [s1, ceilY - 0.09, c + sw / 2]);
        else kit.boxMM(ce.stripMat || "emitWhite", [c - sw / 2, ceilY - 0.11, s0], [c + sw / 2, ceilY - 0.09, s1]);
      }
    }
  }

  // ---- fill lights (descriptors) ---------------------------------------------------------------
  if (spec.lights !== false) {
    const li = spec.lights || {};
    const w = x1 - x0 - 2 * WALL_T;
    const d = z1 - z0 - 2 * WALL_T;
    const target = li.count ?? Math.min(6, Math.max(1, Math.round((w * d) / 60)));
    const nx = Math.min(target, Math.max(1, Math.round(Math.sqrt(target * (w / Math.max(d, 1))))));
    const nz = Math.max(1, Math.floor(target / nx));
    const y = li.y ?? ceilY - 0.5;
    const dist = li.distance ?? Math.max(w / nx, d / nz) * 1.6 + 2;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        ctx.lights.push({
          type: "point",
          pos: [x0 + WALL_T + (w * (i + 0.5)) / nx, y, z0 + WALL_T + (d * (j + 0.5)) / nz],
          color: li.color ?? 0xd6e2ff,
          intensity: li.intensity ?? Math.min(60, 6 + dist * 2.2),
          distance: dist,
          priority: li.priority ?? 0.5,
        });
      }
    }
  }

  return { faces: F, openings: perFace, H };
}

function flipUVs(geo) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), uv.getY(i));
}

// Convenience: a straight rail (top tube + posts) between two world points at floor level.
export function rail(kit, PALETTE, a, b, floorY, { h = 1.02, post = 1.6, color } = {}) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const axis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[2] + b[2]) / 2;
  const c = color ?? col(PALETTE, "impDark");
  kit.cyl("metal", cx, floorY + h, cz, 0.03, len, axis, { color: col(PALETTE, "steel"), segments: 10 });
  kit.cyl("metal", cx, floorY + h * 0.55, cz, 0.018, len, axis, { color: c, segments: 8 });
  const n = Math.max(2, Math.round(len / post) + 1);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const px = a[0] + dx * t;
    const pz = a[2] + dz * t;
    kit.box("paintedMetal", px, floorY + h / 2, pz, 0.06, h, 0.06, { color: c });
  }
  const min = [Math.min(a[0], b[0]) - 0.05, floorY, Math.min(a[2], b[2]) - 0.05];
  const max = [Math.max(a[0], b[0]) + 0.05, floorY + h, Math.max(a[2], b[2]) + 0.05];
  kit.collider(min, max, "rail");
}
