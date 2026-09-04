// Medbay-local props (§11 medbay accent: white panels, cool blue, green vitals). Everything is
// kit-bashed through the shared `placer`; colliders come out as world AABBs. Material keys are
// limited to the set the room already pays for (see index.js) so nothing here adds a draw call.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP, col } from "../_shared/palette.js";
import { placer, indicatorField } from "../_shared/props.js";

const STEEL = IMP.steel;
const DARK = IMP.impDark;
const BLACK = IMP.impBlack;
const WHITE = IMP.medWhite;

// Thin cylinder between two world points (lamp arms, hangers, IV poles).
export function rod(kit, a, b, r = 0.015, mat = "metal", color = STEEL, segments = 8) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  kit.add(mat, new THREE.CylinderGeometry(r, r, len, segments), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], color });
}

// Abstract vitals display: dark plate, a row of green bars (trace), two guide lines, status dots.
export function vitalsBoard(kit, pos, yaw, w = 0.9, h = 0.45, seed = 1) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, -0.03, w + 0.08, h + 0.08, 0.05, { color: BLACK });
  P.box("darkGloss", 0, 0, 0.002, w, h, 0.012);
  const n = Math.max(4, Math.floor((w - 0.16) / 0.055));
  const base = -h / 2 + 0.08;
  let v = 0.3;
  for (let i = 0; i < n; i++) {
    v = Math.min(0.92, Math.max(0.08, v + (rand() - 0.5) * 0.45));
    const bh = 0.03 + v * (h - 0.2);
    P.box("emitGreen", -w / 2 + 0.1 + i * 0.055, base + bh / 2, 0.012, 0.028, bh, 0.006);
  }
  P.box("emitGreen", -0.04, h / 2 - 0.05, 0.012, w - 0.24, 0.006, 0.006);
  P.box("emitGreen", -0.04, h / 2 - 0.09, 0.012, w * 0.55, 0.004, 0.006);
  for (let i = 0; i < 3; i++) P.box(["emitGreen", "emitBlue", "emitAmber"][i], w / 2 - 0.05, h / 2 - 0.05 - i * 0.05, 0.012, 0.02, 0.02, 0.006);
}

// Wall vent: dark frame with light slats.
export function vent(kit, pos, yaw, w = 0.6, h = 0.35) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, -0.03, w, h, 0.06, { color: BLACK });
  const n = Math.max(3, Math.floor(h / 0.06));
  for (let i = 0; i < n; i++) P.box("paintedMetal", 0, -h / 2 + (i + 0.5) * (h / n), 0.0, w - 0.06, 0.022, 0.02, { color: IMP.impGrey });
}

// Junction box with conduit stub and a status LED.
export function junctionBox(kit, pos, yaw, seed = 3) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0, -0.08, 0.32, 0.4, 0.16, { color: DARK, texel: 1 });
  P.box("paintedMetal", 0, 0, 0.005, 0.26, 0.34, 0.01, { color: IMP.impMid });
  P.box(rand() < 0.6 ? "emitBlue" : "emitAmber", 0.08, 0.12, 0.012, 0.04, 0.02, 0.006);
  P.cyl("metal", 0, 0.36, -0.08, 0.025, 0.35, "y", { color: STEEL, segments: 8 });
}

// Medical bed: pedestal, platform 2.0 × 0.9 with its top at 0.70, white mattress, headboard with a
// small monitor + indicator field, side rails, footboard chart, swing-arm lamp. Head at local −X.
export function medBed(kit, PALETTE, pos, yaw, { seed = 1, occupied = false, screenMat = "screenImp1" } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.29, 0, 1.15, 0.58, 0.5, { color: DARK, texel: 1 });
  P.box("paintedMetal", 0, 0.03, 0, 1.4, 0.06, 0.7, { color: BLACK });
  P.box("paintedMetal", 0, 0.64, 0, 2.0, 0.12, 0.9, { color: WHITE, texel: 1 });
  for (const s of [-1, 1]) P.box("emitBlue", 0.05, 0.605, s * 0.452, 1.7, 0.012, 0.008);
  P.box("fabric", 0, 0.755, 0, 1.9, 0.11, 0.84, { color: WHITE, texel: 2 });
  P.box("fabric", -0.7, 0.845, 0, 0.42, 0.08, 0.58, { color: 0xffffff, texel: 2 });
  if (occupied) P.box("fabric", 0.3, 0.86, 0, 1.25, 0.12, 0.86, { color: 0x7fa8d8, texel: 2 });
  else if (rand() < 0.7) P.box("fabric", 0.55, 0.83, 0, 0.6, 0.05, 0.7, { color: 0x7fa8d8, texel: 2 });
  // headboard (from floor to 1.4) with monitor + indicators facing the foot end
  P.box("paintedMetal", -1.04, 0.75, 0, 0.08, 1.3, 0.9, { color: DARK, texel: 1 });
  P.box("paintedMetal", -1.005, 1.1, 0, 0.02, 0.5, 0.82, { color: WHITE });
  P.box("darkGloss", -0.99, 1.2, 0.18, 0.02, 0.26, 0.4);
  P.box(screenMat, -0.979, 1.2, 0.18, 0.01, 0.22, 0.34, { uv: "keep" });
  P.box("emitGreen", -0.979, 1.04, 0.18, 0.008, 0.016, 0.3);
  const Q = placer(kit, P.world(-0.985, 1.16, -0.22), yaw + Math.PI / 2);
  indicatorField(Q, 0, 0, 0, 0.32, 0.14, seed + 5, { weights: [0.2, 0.4, 0.15, 0.25] });
  // side rails
  for (const s of [-1, 1]) {
    P.cyl("metal", 0.05, 0.98, s * 0.47, 0.015, 1.3, "x", { color: STEEL, segments: 8 });
    for (const x of [-0.55, 0.65]) P.cyl("metal", x, 0.84, s * 0.47, 0.012, 0.28, "y", { color: STEEL, segments: 6 });
  }
  // footboard + chart plate
  P.box("paintedMetal", 1.0, 0.85, 0, 0.05, 0.3, 0.8, { color: DARK });
  P.box("darkGloss", 1.03, 0.86, -0.15, 0.012, 0.2, 0.3);
  P.box("emitBlue", 1.037, 0.93, -0.15, 0.006, 0.01, 0.2);
  // swing-arm lamp from the headboard corner
  const post0 = P.world(-1.04, 1.38, -0.4);
  const post1 = P.world(-1.04, 2.15, -0.4);
  const elbow = P.world(-0.2, 2.15, -0.12);
  const head = P.world(-0.2, 1.9, -0.12);
  rod(kit, post0, post1, 0.02);
  rod(kit, post1, elbow, 0.014);
  rod(kit, elbow, head, 0.012);
  P.cyl("paintedMetal", -0.2, 1.86, -0.12, 0.09, 0.07, "y", { color: DARK, segments: 14 });
  P.cyl("emitWhite", -0.2, 1.822, -0.12, 0.07, 0.01, "y", { segments: 14 });
  P.collider([-1.08, 0, -0.5], [1.06, 1.0, 0.5], "bed");
  return P;
}

// Low bay divider between two floor points (wall end `a`, open end `b`): dark base, white panel,
// end posts, steel cap. Height h.
export function bayDivider(kit, a, b, h = 1.2) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz); // local +Z along the divider
  const P = placer(kit, a, yaw);
  P.box("paintedMetal", 0, 0.04, len / 2, 0.12, 0.08, len, { color: BLACK });
  P.box("impPanel", 0, h / 2 + 0.02, len / 2, 0.06, h - 0.1, len - 0.1, { color: WHITE, uv: "keep" });
  P.box("paintedMetal", 0, h / 2, 0.05, 0.1, h, 0.1, { color: DARK });
  P.box("paintedMetal", 0, h / 2, len - 0.05, 0.1, h, 0.1, { color: DARK });
  P.cyl("metal", 0, h + 0.02, len / 2, 0.03, len, "z", { color: STEEL, segments: 10 });
  P.collider([-0.07, 0, 0], [0.07, h, len], "divider");
}

// Bacta-style treatment tank: glass cylinder r 0.8 × 2.6 on a dark plinth, teal inner column, frame
// ribs, bands, cap with pipes rising to `pipeTopY` (world y), a valve wheel facing −X.
export function bactaTank(kit, pos, { pipeTopY, facing = -1, seed = 2 } = {}) {
  const [x, y, z] = pos;
  kit.cyl("paintedMetal", x, y + 0.15, z, 1.05, 0.3, "y", { color: BLACK, segments: 32, texel: 1 });
  kit.cyl("metal", x, y + 0.31, z, 1.0, 0.02, "y", { color: STEEL, segments: 32 });
  kit.cyl("emitTeal", x, y + 0.325, z, 0.83, 0.03, "y", { segments: 32 });
  kit.cyl("glass", x, y + 1.6, z, 0.8, 2.6, "y", { segments: 32 });
  kit.cyl("emitTeal", x, y + 1.55, z, 0.42, 2.2, "y", { segments: 24 });
  kit.cyl("paintedMetal", x, y + 0.42, z, 0.5, 0.16, "y", { color: DARK, segments: 24 });
  kit.cyl("paintedMetal", x, y + 2.72, z, 0.5, 0.16, "y", { color: DARK, segments: 24 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    kit.box("paintedMetal", x + Math.cos(a) * 0.8, y + 1.6, z + Math.sin(a) * 0.8, 0.08, 2.6, 0.08, { color: DARK, rot: [0, -a, 0] });
  }
  for (const by of [1.2, 2.05]) kit.cyl("paintedMetal", x, y + by, z, 0.84, 0.07, "y", { color: DARK, segments: 32 });
  kit.cyl("paintedMetal", x, y + 3.05, z, 0.95, 0.3, "y", { color: DARK, segments: 32, texel: 1 });
  kit.cyl("metal", x, y + 2.92, z, 0.98, 0.05, "y", { color: STEEL, segments: 32 });
  // status plate on the cap + valve wheel on the plinth, both on the `facing` side (±X)
  const fx = x + facing * 0.96;
  kit.box("darkGloss", fx, y + 3.05, z, 0.03, 0.18, 0.32);
  kit.box("emitTeal", fx + facing * 0.012, y + 3.05, z - 0.06, 0.01, 0.1, 0.1);
  kit.box("emitBlue", fx + facing * 0.012, y + 3.05, z + 0.08, 0.01, 0.03, 0.08);
  kit.cyl("metal", x + facing * 1.07, y + 0.6, z, 0.14, 0.04, "x", { color: IMP.impRed, segments: 16 });
  kit.cyl("metal", x + facing * 1.09, y + 0.6, z, 0.03, 0.04, "x", { color: STEEL, segments: 8 });
  // pipes up from the cap
  const top = pipeTopY ?? y + 4.5;
  for (const s of [-0.35, 0.35]) {
    kit.cyl("metal", x + s, (y + 3.2 + top) / 2, z, 0.06, top - y - 3.2, "y", { color: STEEL, segments: 12 });
    kit.cyl("paintedMetal", x + s, y + 3.28, z, 0.1, 0.06, "y", { color: DARK, segments: 12 });
  }
  kit.collider([x - 1.05, y, z - 1.05], [x + 1.05, y + 3.2, z + 1.05], "tank");
}

// Open shelving unit filled with rows of small colour-varied boxes and vials. Front faces local +Z.
export function shelfUnit(kit, pos, yaw, { w = 1.8, h = 2.0, d = 0.45, shelves = 4, seed = 4, colors } = {}) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const pal = colors || [WHITE, IMP.medBlue, IMP.impGrey, 0xd8d0b0, 0x4a6fa5, 0xb0b8c0, 0x3fa8a0, 0xd9a441, 0xffffff];
  P.box("paintedMetal", 0, h / 2, -d / 2 + 0.015, w, h, 0.03, { color: DARK, texel: 1 });
  for (const s of [-1, 1]) P.box("paintedMetal", s * (w / 2 - 0.02), h / 2, 0, 0.04, h, d, { color: DARK });
  P.box("paintedMetal", 0, 0.04, 0, w, 0.08, d, { color: BLACK });
  P.box("paintedMetal", 0, h - 0.02, 0, w, 0.04, d, { color: DARK });
  const step = (h - 0.12) / shelves;
  for (let i = 0; i < shelves; i++) {
    const y = 0.08 + i * step;
    if (i > 0) P.box("paintedMetal", 0, y, 0, w - 0.08, 0.03, d - 0.02, { color: IMP.impGrey });
    P.box("emitWhite", 0, y + step - 0.045, -d / 2 + 0.05, w - 0.4, 0.01, 0.02);
    let x = -w / 2 + 0.08;
    while (x < w / 2 - 0.15) {
      const bw = 0.1 + rand() * 0.18;
      if (x + bw > w / 2 - 0.06) break;
      if (rand() < 0.15) {
        x += bw * 0.6;
        continue;
      }
      const bh = 0.08 + rand() * Math.min(0.28, step - 0.12);
      const bd = 0.12 + rand() * (d - 0.2);
      const c = pal[Math.floor(rand() * pal.length)];
      if (rand() < 0.2) P.cyl("paintedMetal", x + bw / 2, y + 0.015 + bh / 2, -d / 2 + 0.06 + bd / 2, Math.min(bw, bd) / 2, bh, "y", { color: c, segments: 10 });
      else {
        P.box("paintedMetal", x + bw / 2, y + 0.015 + bh / 2, -d / 2 + 0.06 + bd / 2, bw, bh, bd, { color: c, texel: 2 });
        if (rand() < 0.5) P.box("paintedMetal", x + bw / 2, y + 0.015 + bh * 0.6, -d / 2 + 0.06 + bd + 0.004, bw * 0.6, bh * 0.25, 0.006, { color: rand() < 0.5 ? IMP.impBlue : IMP.impRed });
      }
      x += bw + 0.02 + rand() * 0.04;
    }
  }
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "shelf");
}

// Curved reception counter: `segments` boxes on an arc of radius r about `centre` from angle a0 to a1
// (radians in the XZ plane, x = cos, z = sin). Fronts face outward; a lower worktop sits inside.
export function arcCounter(kit, centre, r, a0, a1, segments, { h = 1.1, d = 0.5, color = WHITE } = {}) {
  const step = (a1 - a0) / segments;
  const chord = 2 * r * Math.sin(step / 2) + 0.03;
  for (let i = 0; i < segments; i++) {
    const a = a0 + (i + 0.5) * step;
    const cx = centre[0] + Math.cos(a) * r;
    const cz = centre[2] + Math.sin(a) * r;
    const yaw = Math.atan2(Math.cos(a), Math.sin(a)); // local +Z = outward
    const P = placer(kit, [cx, centre[1], cz], yaw);
    P.box("paintedMetal", 0, h / 2, 0, chord, h, d, { color, texel: 1 });
    P.box("paintedMetal", 0, 0.05, 0, chord + 0.01, 0.1, d + 0.02, { color: BLACK });
    P.box("darkGloss", 0, h + 0.015, 0, chord + 0.04, 0.03, d + 0.08);
    P.box("emitBlue", 0, h - 0.06, d / 2 + 0.006, chord - 0.1, 0.012, 0.01);
    P.box("paintedMetal", 0, h / 2 + 0.05, d / 2 + 0.003, chord - 0.12, h - 0.4, 0.006, { color: IMP.impGrey });
    P.box("paintedMetal", 0, 0.73, -d / 2 - 0.25, chord + 0.02, 0.04, 0.5, { color: DARK, texel: 1 });
    P.collider([-chord / 2, 0, -d / 2 - 0.5], [chord / 2, h, d / 2], "counter");
  }
}

// Straight counter along local X with an upper dispensing ledge and a lit kick. Front = +Z.
export function counter(kit, pos, yaw, len, { h = 1.1, d = 0.6, ledge = true, color = WHITE } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, h / 2, 0, len, h, d, { color, texel: 1 });
  P.box("paintedMetal", 0, 0.05, 0, len + 0.01, 0.1, d + 0.02, { color: BLACK });
  P.box("darkGloss", 0, h + 0.015, 0, len + 0.04, 0.03, d + 0.06);
  P.box("emitBlue", 0, h - 0.06, d / 2 + 0.006, len - 0.2, 0.012, 0.01);
  for (let x = -len / 2 + 0.6; x < len / 2 - 0.3; x += 1.2) P.box("paintedMetal", x, h / 2 + 0.05, d / 2 + 0.003, 0.9, h - 0.4, 0.006, { color: IMP.impGrey });
  if (ledge) P.box("paintedMetal", 0, 0.76, -d / 2 - 0.22, len, 0.04, 0.44, { color: DARK, texel: 1 });
  P.collider([-len / 2, 0, -d / 2 - (ledge ? 0.44 : 0)], [len / 2, h, d / 2], "counter");
}

// Glass partition between floor points a and b (axis aligned): dark posts, 0.45 m sill, header at h,
// glass panes; `gaps` are [u0, u1] distances along the line left open (door gaps).
export function glassWall(kit, a, b, { h = 3.0, gaps = [], postEvery = 2.4, header = true } = {}) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const P = placer(kit, a, yaw);
  const edges = [0, len];
  for (const [g0, g1] of gaps) edges.push(g0, g1);
  for (let u = postEvery; u < len - 0.3; u += postEvery) {
    if (!gaps.some(([g0, g1]) => u > g0 - 0.3 && u < g1 + 0.3)) edges.push(u);
  }
  edges.sort((p, q) => p - q);
  for (const u of edges) P.box("paintedMetal", 0, h / 2, u, 0.14, h, 0.14, { color: DARK, texel: 1 });
  if (header) {
    P.box("paintedMetal", 0, h - 0.12, len / 2, 0.16, 0.24, len, { color: DARK, texel: 1 });
    P.box("emitWhite", 0.083, h - 0.12, len / 2, 0.006, 0.05, len - 0.4);
    P.box("emitWhite", -0.083, h - 0.12, len / 2, 0.006, 0.05, len - 0.4);
  }
  // spans between edges that are not gaps
  for (let i = 0; i < edges.length - 1; i++) {
    const u0 = edges[i];
    const u1 = edges[i + 1];
    if (u1 - u0 < 0.05) continue;
    const um = (u0 + u1) / 2;
    if (gaps.some(([g0, g1]) => um > g0 && um < g1)) continue;
    const span = u1 - u0 - 0.14;
    P.box("paintedMetal", 0, 0.225, um, 0.12, 0.45, span, { color: DARK, texel: 1 });
    P.box("paintedMetal", 0, 0.47, um, 0.14, 0.04, span, { color: IMP.impMid });
    P.box("glass", 0, (0.49 + h - 0.24) / 2, um, 0.02, h - 0.24 - 0.49, span, { uv: "keep" });
    P.box("emitBlue", 0.062, 1.02, um, 0.006, 0.01, span - 0.1);
    P.collider([-0.08, 0, u0], [0.08, h, u1], "glass-wall");
  }
}

// Operating table: pedestal, articulated top at 0.85, pad, arm boards, lit base ring.
export function operatingTable(kit, pos, yaw) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.05, 0, 0.9, 0.1, 0.7, { color: BLACK });
  P.box("emitBlue", 0, 0.11, 0, 0.8, 0.012, 0.6);
  P.box("paintedMetal", 0, 0.42, 0, 0.5, 0.64, 0.4, { color: DARK, texel: 1 });
  P.box("paintedMetal", 0, 0.78, 0, 2.1, 0.06, 0.66, { color: DARK });
  P.box("paintedMetal", 0, 0.83, 0, 2.05, 0.04, 0.62, { color: WHITE });
  P.box("fabric", 0, 0.87, 0, 1.95, 0.05, 0.56, { color: 0x2d3a4a, texel: 2 });
  for (const s of [-1, 1]) P.box("paintedMetal", -0.35, 0.82, s * 0.55, 0.7, 0.03, 0.22, { color: DARK });
  P.box("fabric", -0.35, 0.845, -0.55, 0.65, 0.02, 0.18, { color: 0x2d3a4a, texel: 2 });
  P.box("fabric", -0.35, 0.845, 0.55, 0.65, 0.02, 0.18, { color: 0x2d3a4a, texel: 2 });
  P.cyl("metal", 1.0, 0.95, 0, 0.012, 0.6, "z", { color: STEEL, segments: 8 });
  P.collider([-1.05, 0, -0.66], [1.05, 0.9, 0.66], "op-table");
}

// Surgical light array hung from `topY`: stem, hub, dark ring with an emissive annulus, 4 satellites.
export function surgeryLight(kit, pos, topY) {
  const [x, , z] = pos;
  const hubY = pos[1];
  kit.cyl("paintedMetal", x, (hubY + 0.1 + topY) / 2, z, 0.05, topY - hubY - 0.1, "y", { color: BLACK, segments: 10 });
  kit.cyl("paintedMetal", x, hubY, z, 0.26, 0.22, "y", { color: DARK, segments: 20 });
  kit.cyl("paintedMetal", x, hubY - 0.16, z, 1.0, 0.12, "y", { color: BLACK, segments: 40, texel: 1 });
  kit.cyl("emitWhite", x, hubY - 0.23, z, 0.86, 0.02, "y", { segments: 40 });
  kit.cyl("paintedMetal", x, hubY - 0.245, z, 0.48, 0.03, "y", { color: BLACK, segments: 32 });
  kit.cyl("metal", x, hubY - 0.16, z, 1.02, 0.04, "y", { color: STEEL, segments: 40 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const hx = x + Math.cos(a) * 1.45;
    const hz = z + Math.sin(a) * 1.45;
    rod(kit, [x, hubY + 0.05, z], [hx, hubY - 0.05, hz], 0.02);
    kit.cyl("paintedMetal", hx, hubY - 0.12, hz, 0.17, 0.09, "y", { color: DARK, segments: 16 });
    kit.cyl("emitWhite", hx, hubY - 0.17, hz, 0.14, 0.012, "y", { segments: 16 });
  }
}

// Diagnostic scanner: a patient bed sliding through a gantry ring (two posts, beam, dark torus with
// a blue inner ring). Bed length along local X, ring near the −X end.
export function scanner(kit, pos, yaw, seed = 7) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0.2, 0.05, 0, 1.2, 0.1, 0.7, { color: BLACK });
  P.box("paintedMetal", 0.2, 0.42, 0, 0.6, 0.64, 0.5, { color: DARK, texel: 1 });
  P.box("paintedMetal", 0.2, 0.78, 0, 2.4, 0.06, 0.66, { color: WHITE, texel: 1 });
  P.box("fabric", 0.2, 0.835, 0, 2.3, 0.05, 0.56, { color: 0x2d3a4a, texel: 2 });
  for (const s of [-1, 1]) P.box("emitBlue", 0.2, 0.75, s * 0.335, 2.2, 0.012, 0.01);
  for (const s of [-1, 1]) {
    P.box("paintedMetal", -0.9, 1.25, s * 0.95, 0.5, 2.5, 0.3, { color: DARK, texel: 1 });
    P.box("paintedMetal", -0.9, 0.05, s * 0.95, 0.6, 0.1, 0.4, { color: BLACK });
    P.box("emitBlue", -0.9, 1.4, s * 0.79, 0.06, 1.6, 0.012);
  }
  P.box("paintedMetal", -0.9, 2.55, 0, 0.5, 0.3, 2.2, { color: DARK, texel: 1 });
  P.box("paintedMetal", -0.9, 2.32, 0, 0.3, 0.2, 0.3, { color: BLACK });
  P.add("paintedMetal", new THREE.TorusGeometry(0.85, 0.14, 12, 40), -0.9, 1.3, 0, { rot: [0, yaw + Math.PI / 2, 0], color: BLACK, texel: 1 });
  P.add("emitBlue", new THREE.TorusGeometry(0.78, 0.035, 8, 40), -0.74, 1.3, 0, { rot: [0, yaw + Math.PI / 2, 0] });
  P.add("metal", new THREE.TorusGeometry(0.99, 0.02, 8, 40), -0.9, 1.3, 0, { rot: [0, yaw + Math.PI / 2, 0], color: STEEL });
  const Q = placer(kit, P.world(-0.9, 1.7, 1.11), yaw);
  indicatorField(Q, 0, 0, 0, 0.4, 0.2, seed, { weights: [0.2, 0.4, 0.15, 0.25] });
  P.box("emitWhite", -0.9, 2.72, 0, 0.3, 0.02, 1.8);
  P.collider([-1.2, 0, -1.1], [1.45, 2.7, 1.1], "scanner");
}

// Wheeled gurney: white platform at 0.8 with a thin pad, folding rails, castors.
export function gurney(kit, pos, yaw) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.78, 0, 1.95, 0.06, 0.62, { color: WHITE, texel: 1 });
  P.box("fabric", 0, 0.835, 0, 1.85, 0.05, 0.56, { color: 0x7fa8d8, texel: 2 });
  P.box("fabric", -0.7, 0.87, 0, 0.35, 0.05, 0.4, { color: 0xffffff, texel: 2 });
  P.box("paintedMetal", 0, 0.42, 0, 0.5, 0.7, 0.4, { color: DARK, texel: 1 });
  P.box("paintedMetal", 0, 0.12, 0, 1.4, 0.06, 0.55, { color: DARK });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.cyl("metal", sx * 0.65, 0.06, sz * 0.24, 0.06, 0.04, "z", { color: BLACK, segments: 12 });
  for (const s of [-1, 1]) {
    P.cyl("metal", 0, 1.0, s * 0.32, 0.014, 1.3, "x", { color: STEEL, segments: 8 });
    for (const x of [-0.55, 0.55]) P.cyl("metal", x, 0.9, s * 0.32, 0.012, 0.2, "y", { color: STEEL, segments: 6 });
  }
  P.collider([-1.0, 0, -0.35], [1.0, 1.0, 0.35], "gurney");
}

// Equipment cart: drawer stack with a tilted display and castors.
export function equipmentCart(kit, pos, yaw, { seed = 6, screenMat = "screenImp0" } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.5, 0, 0.56, 0.9, 0.5, { color: WHITE, texel: 1 });
  P.box("paintedMetal", 0, 0.07, 0, 0.5, 0.06, 0.44, { color: BLACK });
  for (let i = 0; i < 3; i++) {
    P.box("paintedMetal", 0, 0.25 + i * 0.22, 0.253, 0.48, 0.18, 0.006, { color: IMP.impGrey });
    P.box("metal", 0, 0.25 + i * 0.22, 0.262, 0.2, 0.02, 0.012, { color: STEEL });
  }
  P.box("darkGloss", 0, 0.965, 0, 0.5, 0.03, 0.44);
  const Q = placer(kit, P.world(0, 1.2, -0.1), yaw);
  Q.box("paintedMetal", 0, 0, -0.03, 0.42, 0.3, 0.04, { color: BLACK });
  Q.box(screenMat, 0, 0, 0.0, 0.36, 0.24, 0.01, { uv: "keep" });
  Q.box("emitGreen", 0, -0.14, 0.0, 0.3, 0.012, 0.01);
  P.cyl("metal", 0, 1.03, -0.1, 0.02, 0.1, "y", { color: STEEL, segments: 8 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.cyl("metal", sx * 0.22, 0.04, sz * 0.18, 0.04, 0.03, "x", { color: BLACK, segments: 10 });
  indicatorField(P, 0, 0.8, 0.253, 0.4, 0.1, seed, { weights: [0.2, 0.4, 0.15, 0.25] });
  P.collider([-0.28, 0, -0.25], [0.28, 1.0, 0.25], "cart");
}

// IV stand: pole on a five-star base with two hanging bags.
export function ivStand(kit, pos) {
  const [x, y, z] = pos;
  kit.cyl("metal", x, y + 0.02, z, 0.22, 0.03, "y", { color: DARK, segments: 12 });
  kit.cyl("metal", x, y + 0.95, z, 0.015, 1.85, "y", { color: STEEL, segments: 8 });
  rod(kit, [x - 0.2, y + 1.85, z], [x + 0.2, y + 1.85, z], 0.01);
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", x + s * 0.18, y + 1.62, z, 0.12, 0.28, 0.05, { color: s < 0 ? 0xffffff : 0x9fc4e8 });
    kit.box("paintedMetal", x + s * 0.18, y + 1.8, z, 0.02, 0.1, 0.01, { color: STEEL });
  }
  kit.collider([x - 0.22, y, z - 0.22], [x + 0.22, y + 1.85, z + 0.22], "iv");
}

// Wall scrub basin with mirror plate and a sensor tap.
export function scrubBasin(kit, pos, yaw) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.45, 0.22, 0.7, 0.9, 0.44, { color: WHITE, texel: 1 });
  P.box("paintedMetal", 0, 0.05, 0.22, 0.6, 0.1, 0.4, { color: BLACK });
  P.box("darkGloss", 0, 0.905, 0.22, 0.5, 0.02, 0.32);
  P.cyl("metal", 0, 1.0, 0.06, 0.015, 0.2, "y", { color: STEEL, segments: 8 });
  P.cyl("metal", 0, 1.1, 0.14, 0.012, 0.18, "z", { color: STEEL, segments: 8 });
  P.box("darkGloss", 0, 1.55, 0.02, 0.6, 0.5, 0.02);
  P.box("emitWhite", 0, 1.83, 0.02, 0.5, 0.02, 0.02);
  P.box("paintedMetal", 0.5, 1.3, 0.04, 0.14, 0.3, 0.08, { color: DARK });
  P.box("emitBlue", 0.5, 1.4, 0.085, 0.06, 0.02, 0.006);
  P.collider([-0.35, 0, 0], [0.35, 0.95, 0.44], "basin");
}

// Waiting bench: slab seat on two pedestals, along local X.
export function bench(kit, pos, yaw, len = 2.0, color = IMP.impMid) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.45, 0, len, 0.06, 0.45, { color, texel: 1 });
  P.box("fabric", 0, 0.5, 0, len - 0.1, 0.05, 0.4, { color: DARK, texel: 2 });
  for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) P.box("paintedMetal", x, 0.21, 0, 0.12, 0.42, 0.36, { color: BLACK });
  P.box("emitBlue", 0, 0.415, 0.226, len - 0.3, 0.01, 0.006);
  P.collider([-len / 2, 0, -0.23], [len / 2, 0.55, 0.23], "bench");
}

// Curtain panel hanging from a track: `from` world point at track height, extending `len` along
// the track direction (unit vector) and dropping `drop`. Slight folds via three offset strips.
export function curtain(kit, from, dir, len, drop, color = 0x9fc4e8) {
  const n = Math.max(2, Math.round(len / 0.35));
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * len;
    const t1 = ((i + 1) / n) * len;
    const cx = from[0] + dir[0] * ((t0 + t1) / 2);
    const cz = from[2] + dir[2] * ((t0 + t1) / 2);
    const off = (i % 2 ? 0.02 : -0.02);
    const sx = Math.abs(dir[0]) > 0.5 ? t1 - t0 : 0.03;
    const sz = Math.abs(dir[2]) > 0.5 ? t1 - t0 : 0.03;
    kit.box("fabric", cx + (Math.abs(dir[2]) > 0.5 ? off : 0), from[1] - drop / 2 - 0.03, cz + (Math.abs(dir[0]) > 0.5 ? off : 0), sx, drop, sz, { color, texel: 1.5 });
  }
  // gather band + runner clips along the top edge
  const mx = from[0] + dir[0] * (len / 2);
  const mz = from[2] + dir[2] * (len / 2);
  kit.box("paintedMetal", mx, from[1] - 0.06, mz, Math.abs(dir[0]) > 0.5 ? len : 0.06, 0.08, Math.abs(dir[2]) > 0.5 ? len : 0.06, { color: DARK });
}
