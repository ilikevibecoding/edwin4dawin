// d1-nav star-chart table: octagonal instrument plinth (facet panels, sloped control surfaces with button
// rows and screens, indicator rings) and the hologram above it (THREE.Points star field, LineSegments grid
// disc + plotted hyperspace route), both rotating slowly in update().
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { placerRad, IND } from "./props.js";
import { HoloLines, HoloStars, HOLO } from "./holo.js";

const OCT = Math.PI / 8; // octagon rotated so flats face the axes

function octo(kit, mat, cx, cy, cz, r, h, opts = {}) {
  return kit.add(mat, new THREE.CylinderGeometry(r, opts.r2 !== undefined ? opts.r2 : r, h, 8), { pos: [cx, cy, cz], rot: [0, OCT, 0], ...opts, r2: undefined });
}

/** Builds the table. atlasMat = material KEY of the room's screen atlas. Returns { top } (world y of the top surface). */
export function buildChartTable(kit, atlasMat, cells, cx, floorY, cz, { seed = 3 } = {}) {
  const rand = rng(seed);
  const R = 2.3; // plinth radius (to the octagon vertices)
  const apothem = R * Math.cos(Math.PI / 8);
  const facetW = 2 * R * Math.sin(Math.PI / 8);

  // floor ring inlay: black octagon plate, painted light-grey ring (lit by the room), black centre
  octo(kit, "paintedMetal", cx, floorY + 0.006, cz, 2.85, 0.012, { color: IMP.black, texel: 1 });
  octo(kit, "paintedMetal", cx, floorY + 0.015, cz, 2.66, 0.006, { color: IMP.white, texel: 2 });
  octo(kit, "paintedMetal", cx, floorY + 0.016, cz, 2.57, 0.008, { color: IMP.black, texel: 1 });

  // plinth: base, glow band, body
  octo(kit, "paintedMetal", cx, floorY + 0.07, cz, R + 0.06, 0.14, { color: IMP.black, texel: 1 });
  octo(kit, "emitBlue", cx, floorY + 0.18, cz, R - 0.06, 0.08);
  octo(kit, "paintedMetal", cx, floorY + 0.47, cz, R, 0.5, { color: IMP.black, texel: 1 });
  // rim block (carries the sloped control surfaces) and the top plates, which tuck over the slabs' inner ends
  octo(kit, "paintedMetal", cx, floorY + 0.79, cz, R + 0.08, 0.14, { color: IMP.dark, texel: 1 });
  octo(kit, "metal", cx, floorY + 0.965, cz, 2.05, 0.03, { color: IMP.mid, texel: 2 });
  octo(kit, "emitBlue", cx, floorY + 0.9825, cz, 1.9, 0.015);
  octo(kit, "darkGloss", cx, floorY + 0.991, cz, 1.8, 0.022);
  const top = floorY + 1.002;
  // concentric indicator rings on the top (emit ring + covering disc, stacked from the outside in)
  octo(kit, "emitBlue", cx, top + 0.003, cz, 1.55, 0.006);
  octo(kit, "darkGloss", cx, top + 0.004, cz, 1.51, 0.008);
  octo(kit, "emitAmber", cx, top + 0.009, cz, 0.85, 0.006);
  octo(kit, "darkGloss", cx, top + 0.01, cz, 0.81, 0.008);
  // tick marks on the top between the rings
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    kit.add(k % 4 === 0 ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.02, 0.006, 0.12), { pos: [cx + Math.sin(a) * 1.2, top + 0.011, cz + Math.cos(a) * 1.2], rot: [0, a, 0] });
  }
  // central projector: collar, dome, lens ring
  kit.cyl("metal", cx, top + 0.04, cz, 0.42, 0.08, "y", { color: IMP.mid, segments: 24, texel: 1 });
  kit.cyl("emitBlue", cx, top + 0.085, cz, 0.36, 0.012, "y", { segments: 24 });
  kit.add("darkGloss", new THREE.SphereGeometry(0.33, 24, 14), { pos: [cx, top + 0.05, cz] });
  kit.cyl("metal", cx, top + 0.36, cz, 0.09, 0.05, "y", { color: IMP.mid, segments: 16 });
  kit.cyl("emitBlue", cx, top + 0.39, cz, 0.06, 0.012, "y", { segments: 16 });

  // facets: recessed panel + LEDs + vents on the body; sloped control surface on the rim
  for (let k = 0; k < 8; k++) {
    const a = k * (Math.PI / 4);
    const dir = [Math.sin(a), Math.cos(a)];
    const p = placerRad(kit, cx + dir[0] * apothem, floorY, cz + dir[1] * apothem, a);
    // body panel (proud 2 cm) with seam groove and indicator trio
    p.box("paintedMetal", 0, 0.45, 0.01, facetW - 0.24, 0.42, 0.02, { color: IMP.dark, texel: 1 });
    p.box("paintedMetal", 0, 0.45, 0.021, facetW - 0.3, 0.02, 0.004, { color: IMP.black });
    if (k % 2 === 0) {
      for (let i = 0; i < 3; i++) p.box(IND[(i + k) % IND.length], -0.2 + i * 0.08, 0.6, 0.024, 0.035, 0.02, 0.006);
      for (let j = 0; j < 4; j++) p.box("metal", 0.25, 0.3 + j * 0.05, 0.026, 0.3, 0.01, 0.012, { color: IMP.mid });
    } else {
      p.decal(0, 0.34, 0.026, 0.18, k % 4 === 1 ? 9 : 6);
      for (let i = 0; i < 6; i++) p.box(IND[(i * 2 + k) % IND.length], -0.25 + i * 0.1, 0.62, 0.024, 0.04, 0.02, 0.006);
    }
    // sloped control surface set into the rim block (slopes down toward the operator outside); the rim
    // block's outer face is at local z ≈ +0.074, the slab spans z -0.25..+0.07 and tucks under the top plate
    const tilt = 0.32;
    const sy0 = 0.9;
    const sz0 = -0.09;
    p.box("darkGloss", 0, sy0, sz0, facetW - 0.16, 0.035, 0.34, { tilt });
    {
      const [, ty, tz] = p.onSlope(0, 0.005, 0.165, tilt);
      p.box("metal", 0, sy0 + ty, sz0 + tz, facetW - 0.16, 0.02, 0.025, { color: IMP.mid, texel: 2, tilt });
    }
    const cols = 6;
    for (let i = 0; i < cols; i++) {
      const ox = -facetW / 2 + 0.3 + i * 0.085;
      const [lx, ly, lz] = p.onSlope(ox, 0.026, 0.09, tilt);
      const v = rand();
      const mat = v < 0.5 ? "paintedMetal" : v < 0.72 ? "emitBlue" : v < 0.9 ? "emitAmber" : "emitRedImp";
      p.box(mat, lx, sy0 + ly, sz0 + lz, 0.055, 0.014, 0.045, { color: IMP.black, texel: 4, tilt });
    }
    if (k % 2 === 0) {
      const [sx, sy, sz] = p.onSlope(0.32, 0.024, -0.03, tilt);
      p.screenH(atlasMat, sx, sy0 + sy, sz0 + sz, 0.5, 0.2, cells.desk[(k / 2) % 2], tilt);
    } else {
      for (let i = 0; i < 3; i++) {
        const [kx, ky, kz] = p.onSlope(0.2 + i * 0.12, 0.05, -0.04, tilt);
        p.box("metal", kx, sy0 + ky, sz0 + kz, 0.03, 0.06, 0.03, { color: IMP.steel, texel: 4, tilt });
        const [gx, gy, gz] = p.onSlope(0.2 + i * 0.12, 0.022, -0.04, tilt);
        p.box("metal", gx, sy0 + gy, sz0 + gz, 0.02, 0.012, 0.2, { color: IMP.black, texel: 4, tilt });
      }
    }
    // indicator run along the rim block's outer face
    for (let i = 0; i < 7; i++) p.box(IND[(i + k * 3) % IND.length], -0.3 + i * 0.1, 0.8, 0.08, 0.04, 0.02, 0.006);
    p.box("emitBlue", 0, 0.75, 0.078, facetW - 0.4, 0.01, 0.006);
  }
  kit.collider([cx - R - 0.1, floorY, cz - R - 0.1], [cx + R + 0.1, floorY + 1.05, cz + R + 0.1], "chart-table");
  return { top };
}

/**
 * Hologram above the table: seven star systems (tight clusters around a bright primary, each with a label
 * tag), a sparse background field (~1000 points in all), a cyan grid horizon disc with rings and bearing
 * ticks, and the plotted jump: one orange three-leg line through four of the systems with waypoint diamonds,
 * drop lines and a pulsing destination — the same solution the wall display shows.
 */
export function buildChartHolo(cx, top, cz, { seed = 7, spin = 0.05 } = {}) {
  const rand = rng(seed);
  const hc = [cx, top + 1.35, cz]; // hologram centre
  const R = 1.45;
  const stars = new HoloStars(hc, { spin });
  const lines = new HoloLines(hc, { spin });
  const discY = top + 0.42;
  const disc = [cx, discY, cz];

  // star systems: primaries on a loose spiral so the jump legs read as separate hops
  const systems = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4 + (rand() - 0.5) * 0.5;
    const r = 0.45 + (i % 2) * 0.55 + rand() * 0.3;
    const y = hc[1] - 0.35 + (i / 6) * 0.7 + (rand() - 0.5) * 0.2;
    systems.push({ c: [hc[0] + Math.sin(a) * r, y, hc[2] + Math.cos(a) * r], a, warm: i % 3 === 0 });
  }
  for (const s of systems) {
    // primary + tight cluster (flattened ellipsoid) around it
    stars.add(s.c, s.warm ? [1.6, 1.0, 0.45] : [0.9, 1.2, 1.6], 0.05, rand() * 6.283);
    for (let k = 0; k < 85; k++) {
      const rr = 0.32 * Math.pow(rand(), 1.4);
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      const p = [s.c[0] + rr * Math.sin(ph) * Math.cos(th), s.c[1] + rr * Math.cos(ph) * 0.45, s.c[2] + rr * Math.sin(ph) * Math.sin(th)];
      const kk = 0.35 + rand() * 0.8;
      const col = s.warm && rand() < 0.35 ? [1.3 * kk, 0.8 * kk, 0.3 * kk] : [0.5 * kk, 0.85 * kk, 1.15 * kk];
      stars.add(p, col, 0.008 + rand() * rand() * 0.024, rand() * 6.283);
    }
    // label tag leaning outward from the chart axis
    const ux = Math.sin(s.a);
    const uz = Math.cos(s.a);
    lines.tag(s.c, [ux, uz], { color: HOLO.cyan, colorDim: HOLO.cyanDim, anim: 1, rise: 0.14, lead: 0.14, len: 0.2 });
  }
  // sparse background field through the volume
  for (let i = 0; i < 380; i++) {
    const r = R * Math.pow(rand(), 0.5);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(2 * rand() - 1);
    const p = [hc[0] + r * Math.sin(ph) * Math.cos(th), hc[1] + r * Math.cos(ph) * 0.5, hc[2] + r * Math.sin(ph) * Math.sin(th)];
    const kk = 0.25 + rand() * 0.5;
    stars.add(p, [0.45 * kk, 0.75 * kk, 1.0 * kk], 0.006 + rand() * 0.012, rand() * 6.283);
  }

  // grid horizon: fine grid clipped to the disc, rings, spokes, bright rim with bearing ticks
  lines.grid(cx - 1.75, cx + 1.75, cz - 1.75, cz + 1.75, discY, { step: 0.25, major: 0.75, minorColor: HOLO.cyanFaint, majorColor: HOLO.cyanDim, radius: 1.72 });
  for (const r of [0.45, 0.9, 1.35]) lines.circle(disc, r, HOLO.cyanDim, { n: 64 });
  lines.circle(disc, 1.75, HOLO.cyan, { n: 96 });
  lines.circle(disc, 1.62, HOLO.cyanDim, { n: 64, dashed: 2, anim: 1 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    lines.seg([cx + Math.sin(a) * 0.3, discY, cz + Math.cos(a) * 0.3], [cx + Math.sin(a) * 1.75, discY, cz + Math.cos(a) * 1.75], k % 3 === 0 ? HOLO.cyanDim : HOLO.cyanFaint);
  }
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const r0 = k % 6 === 0 ? 1.62 : 1.7;
    lines.seg([cx + Math.sin(a) * r0, discY, cz + Math.cos(a) * r0], [cx + Math.sin(a) * 1.78, discY, cz + Math.cos(a) * 1.78], k % 6 === 0 ? HOLO.cyan : HOLO.cyanDim, 1);
  }
  // galactic-plane horizon ring at the chart's mid height + the vertical axis
  lines.circle(hc, R * 1.02, HOLO.cyanDim, { n: 96, anim: 1 });
  lines.circle(hc, R * 1.02 + 0.06, HOLO.cyanFaint, { n: 96, anim: 1, dashed: 3 });
  lines.seg([cx, discY, cz], [cx, hc[1] + 0.85, cz], HOLO.cyanFaint);

  // the jump: origin → two intermediate systems → destination (orange, travelling pulse)
  const route = [systems[0].c, systems[2].c, systems[4].c, systems[6].c];
  lines.poly(route, HOLO.amber, 2, { phased: true });
  route.forEach((w, i) => {
    const last = i === route.length - 1;
    lines.diamond(w, last ? 0.09 : 0.06, last ? HOLO.red : HOLO.amber, { anim: 1, vertical: true });
    lines.dashed(w, [w[0], discY, w[2]], HOLO.amberDim, { dash: 0.05, gap: 0.05, anim: 1 });
    lines.diamond([w[0], discY + 0.002, w[2]], 0.08, HOLO.amberDim, { anim: 1 });
    if (last) {
      lines.circle(w, 0.18, HOLO.red, { n: 24, anim: 1 });
      lines.circle(w, 0.27, HOLO.redDim, { n: 24, anim: 1, dashed: 2 });
    }
  });
  // own position: blinking white cross at the origin system
  const o = route[0];
  lines.seg([o[0] - 0.14, o[1], o[2]], [o[0] + 0.14, o[1], o[2]], HOLO.white, 5);
  lines.seg([o[0], o[1] - 0.14, o[2]], [o[0], o[1] + 0.14, o[2]], HOLO.white, 5, 0.25);
  lines.seg([o[0], o[1], o[2] - 0.14], [o[0], o[1], o[2] + 0.14], HOLO.white, 5, 0.5);
  lines.circle(o, 0.12, HOLO.white, { n: 20, anim: 1 });
  return { stars: stars.build("nav-stars"), lines: lines.build("nav-chart-lines") };
}

/**
 * Navigator's chart desk on the dais (replaces the plain station): plinth and body, a 2 × 1 m display set
 * into the top and tilted 12° toward the room, a 0.1 m raised rim around it carrying six indicator clusters,
 * control keys on the near rail, cable duct to the deck. p = placer at the dais floor centre; the room is
 * on local +z (the navigators sit on stools on the room side, facing the desk and the wall screens beyond).
 */
export function buildChartDesk(kit, p, atlasMat, screenRect, { w = 2.6, d = 1.4, seed = 0 } = {}) {
  const rand = rng(seed + 5);
  const tilt = 0.21; // positive tilt: the room-side (+z) edge is lower, the slab rises toward the wall
  p.box("paintedMetal", 0, 0.06, 0, w - 0.5, 0.12, d - 0.5, { color: IMP.black, texel: 1 });
  p.box("paintedMetal", 0, 0.44, 0, w - 0.2, 0.64, d - 0.2, { color: IMP.dark, texel: 1 });
  for (const s of [-1, 1]) p.box("paintedMetal", s * (w / 2 - 0.05), 0.52, 0, 0.1, 1.02, d - 0.1, { color: IMP.dark, texel: 1 }); // side cheeks
  p.box("paintedMetal", 0, 0.73, 0, w - 0.12, 0.06, d - 0.12, { color: IMP.dark, texel: 1 }); // deck under the slope
  // room-side face: light-grey panel plate (like the station housings) with a steel trim rail and a footrest
  // bar, so the desk reads as an instrument from the floor instead of a black slab
  p.box("impPanel", 0, 0.42, d / 2 - 0.092, w - 0.7, 0.5, 0.016, { color: IMP.grey, texel: 0.8 });
  p.box("metal", 0, 0.7, d / 2 - 0.08, w - 0.4, 0.03, 0.04, { color: IMP.mid, texel: 2 });
  p.cyl("metal", 0, 0.2, d / 2 + 0.1, 0.018, w - 0.9, "x", { color: IMP.steel, segments: 8 });
  for (const s of [-1, 1]) p.box("metal", s * (w / 2 - 0.5), 0.2, d / 2, 0.03, 0.03, 0.2, { color: IMP.mid, texel: 2 });
  // tilted display slab (dark gloss) with the inset display and a lighter frame
  const sy0 = 0.9;
  p.box("darkGloss", 0, sy0, 0, w - 0.2, 0.05, d - 0.2, { tilt });
  const [sx, sy, sz] = p.onSlope(0, 0.026, 0, tilt);
  p.screenH(atlasMat, sx, sy0 + sy, sz, 2.0, 1.0, screenRect, tilt);
  // raised rim: four bars following the slope, 0.1 m proud of the slab
  for (const s of [-1, 1]) {
    const [bx, by, bz] = p.onSlope(0, 0.075, s * (d / 2 - 0.16), tilt);
    p.box("paintedMetal", bx, sy0 + by, bz, w - 0.2, 0.1, 0.12, { color: IMP.dark, texel: 1, tilt });
    const [cx2, cy2, cz2] = p.onSlope(s * (w / 2 - 0.16), 0.075, 0, tilt);
    p.box("paintedMetal", cx2, sy0 + cy2, cz2, 0.12, 0.1, d - 0.2, { color: IMP.dark, texel: 1, tilt });
    const [tx, ty, tz] = p.onSlope(0, 0.127, s * (d / 2 - 0.16), tilt);
    p.box("metal", tx, sy0 + ty, tz, w - 0.18, 0.006, 0.13, { color: IMP.mid, texel: 2, tilt });
    // three indicator clusters per long rim: LED trio + rocker + small key
    for (let k = 0; k < 3; k++) {
      const ox = -0.8 + k * 0.8;
      for (let i = 0; i < 3; i++) {
        const [lx, ly, lz] = p.onSlope(ox - 0.08 + i * 0.08, 0.132, s * (d / 2 - 0.16) - 0.02, tilt);
        p.box(IND[(i + k + (s > 0 ? 1 : 3)) % IND.length], lx, sy0 + ly, lz, 0.045, 0.006, 0.025, { tilt });
      }
      const [kx, ky, kz] = p.onSlope(ox + 0.22, 0.145, s * (d / 2 - 0.16) + 0.01, tilt);
      p.box(rand() < 0.5 ? "emitAmber" : "paintedMetal", kx, sy0 + ky, kz, 0.06, 0.03, 0.04, { color: IMP.black, texel: 4, tilt });
      const [rx, ry, rz] = p.onSlope(ox - 0.26, 0.145, s * (d / 2 - 0.16) + 0.01, tilt);
      p.box("metal", rx, sy0 + ry, rz, 0.05, 0.03, 0.03, { color: IMP.steel, texel: 4, tilt });
    }
  }
  // key rows on the near (room-side) rim face and the wall-side rail: blue seam line, cable duct
  const [ex, ey, ez] = p.onSlope(0, 0.04, d / 2 - 0.099, tilt);
  p.box("emitBlue", ex, sy0 + ey, ez, w - 0.6, 0.012, 0.006, { tilt });
  p.box("paintedMetal", 0, 0.05, -(d / 2 - 0.06), w - 0.9, 0.1, 0.1, { color: IMP.black, texel: 1 });
  for (const ox of [-0.5, 0.5]) p.cyl("metalRough", ox, 0.45, -(d / 2 - 0.02), 0.016, 0.7, "y", { color: IMP.mid, segments: 8 });
  for (const s of [-1, 1]) p.decal(s * (w / 2 - 0.55), 0.45, d / 2 - 0.082, 0.2, s > 0 ? 9 : 6);
  for (let i = 0; i < 5; i++) p.box(IND[(i + seed) % IND.length], -w / 2 + 0.55 + i * 0.06, 0.6, d / 2 - 0.081, 0.03, 0.03, 0.006);
  p.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, 1.2, -d / 2 - 0.02, d / 2 + 0.12, "chart-desk");
}
