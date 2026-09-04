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

  // floor ring inlay: black octagon plate, blue ring, black centre (stacked thin octagons)
  octo(kit, "paintedMetal", cx, floorY + 0.006, cz, 2.85, 0.012, { color: IMP.black, texel: 1 });
  octo(kit, "emitBlue", cx, floorY + 0.015, cz, 2.66, 0.006);
  octo(kit, "paintedMetal", cx, floorY + 0.016, cz, 2.55, 0.008, { color: IMP.black, texel: 1 });

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
  kit.cyl("emitWhite", cx, top + 0.085, cz, 0.36, 0.012, "y", { segments: 24 });
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

/** Hologram above the table: star cloud, grid disc, plotted route with waypoints and drop lines. */
export function buildChartHolo(cx, top, cz, { seed = 7, spin = 0.05 } = {}) {
  const rand = rng(seed);
  const hc = [cx, top + 1.45, cz]; // hologram centre
  const R = 1.5;
  const stars = new HoloStars(hc, { spin });
  for (let i = 0; i < 3600; i++) {
    // flattened sphere with a denser core and a thin outer halo
    const u = rand();
    const halo = u > 0.93;
    const r = halo ? R * (1.02 + rand() * 0.16) : R * Math.pow(rand(), 0.55);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(2 * rand() - 1);
    const flat = halo ? 0.25 : 0.55 + 0.25 * rand();
    const p = [hc[0] + r * Math.sin(ph) * Math.cos(th), hc[1] + r * Math.cos(ph) * flat, hc[2] + r * Math.sin(ph) * Math.sin(th)];
    const v = rand();
    const k = 0.35 + rand() * 0.9;
    let col;
    if (v < 0.05) col = [1.35 * k, 0.82 * k, 0.3 * k];
    else if (v < 0.16) col = [0.35 * k, 0.5 * k, 1.4 * k];
    else col = [0.5 * k, 0.86 * k, 1.1 * k];
    const size = 0.008 + rand() * rand() * 0.028 + (v > 0.985 ? 0.03 : 0);
    stars.add(p, col, size, rand() * 6.283);
  }
  const lines = new HoloLines(hc, { spin });
  const discY = top + 0.42;
  const disc = [cx, discY, cz];
  // grid disc: rings, spokes, fine square grid clipped to the disc
  lines.grid(cx - 1.75, cx + 1.75, cz - 1.75, cz + 1.75, discY, { step: 0.25, major: 0.75, minorColor: HOLO.cyanFaint, majorColor: HOLO.cyanDim, radius: 1.72 });
  for (const r of [0.45, 0.9, 1.35]) lines.circle(disc, r, HOLO.cyanDim, { n: 64 });
  lines.circle(disc, 1.75, HOLO.cyan, { n: 96 });
  lines.circle(disc, 1.62, HOLO.cyanDim, { n: 64, dashed: 2, anim: 1 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    lines.seg([cx + Math.sin(a) * 0.3, discY, cz + Math.cos(a) * 0.3], [cx + Math.sin(a) * 1.75, discY, cz + Math.cos(a) * 1.75], k % 3 === 0 ? HOLO.cyanDim : HOLO.cyanFaint);
  }
  // bearing ticks on the outer ring (rotate with the chart)
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const r0 = k % 6 === 0 ? 1.62 : 1.7;
    lines.seg([cx + Math.sin(a) * r0, discY, cz + Math.cos(a) * r0], [cx + Math.sin(a) * 1.78, discY, cz + Math.cos(a) * 1.78], k % 6 === 0 ? HOLO.cyan : HOLO.cyanDim, 1);
  }
  // vertical axis and equator ring of the star volume
  lines.seg([cx, discY, cz], [cx, hc[1] + R * 0.6 + 0.2, cz], HOLO.cyanFaint);
  lines.circle(hc, R * 1.02, HOLO.cyanFaint, { n: 96, anim: 1 });
  lines.circle([hc[0], hc[1] + 0.32, hc[2]], R * 0.86, HOLO.cyanFaint, { n: 64, anim: 1, dashed: 3 });
  lines.circle([hc[0], hc[1] - 0.32, hc[2]], R * 0.86, HOLO.cyanFaint, { n: 64, anim: 1, dashed: 3 });
  // route: waypoints through the volume, drop lines to the disc, diamonds, destination marker
  const wps = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -2.2 + (i / (n - 1)) * 4.1 + (rand() - 0.5) * 0.3;
    const r = 0.35 + (i / (n - 1)) * 1.0 + (rand() - 0.5) * 0.25;
    const y = hc[1] + (rand() - 0.5) * 0.9 * (0.4 + 0.6 * (r / R));
    wps.push([hc[0] + Math.sin(a) * r, y, hc[2] + Math.cos(a) * r]);
  }
  lines.poly(wps, HOLO.white, 2, { phased: true });
  wps.forEach((w, i) => {
    const last = i === n - 1;
    lines.diamond(w, last ? 0.07 : 0.045, last ? HOLO.amber : HOLO.blue, { anim: 1, vertical: true });
    lines.dashed(w, [w[0], discY, w[2]], HOLO.blueDim, { dash: 0.05, gap: 0.05, anim: 1 });
    lines.diamond([w[0], discY + 0.002, w[2]], 0.06, last ? HOLO.amberDim : HOLO.blueDim, { anim: 1 });
    if (last) {
      lines.circle(w, 0.16, HOLO.amber, { n: 24, anim: 1 });
      lines.circle(w, 0.24, HOLO.amberDim, { n: 24, anim: 1, dashed: 2 });
    }
  });
  // origin marker (own position) — blinking cross at the first waypoint
  const o = wps[0];
  lines.seg([o[0] - 0.12, o[1], o[2]], [o[0] + 0.12, o[1], o[2]], HOLO.white, 5);
  lines.seg([o[0], o[1] - 0.12, o[2]], [o[0], o[1] + 0.12, o[2]], HOLO.white, 5, 0.25);
  lines.seg([o[0], o[1], o[2] - 0.12], [o[0], o[1], o[2] + 0.12], HOLO.white, 5, 0.5);
  // sector labels: small brackets with leader lines near three bright stars
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.6 + rand() * 0.7;
    const y = hc[1] + (rand() - 0.5) * 0.7;
    const s = [hc[0] + Math.sin(a) * r, y, hc[2] + Math.cos(a) * r];
    const l = [s[0] + Math.sin(a) * 0.22, y + 0.14, s[2] + Math.cos(a) * 0.22];
    lines.seg(s, l, HOLO.cyanDim, 1);
    const ux = Math.cos(a) * 0.18;
    const uz = -Math.sin(a) * 0.18;
    lines.seg(l, [l[0] + ux, l[1], l[2] + uz], HOLO.cyan, 1);
    lines.seg([l[0], l[1] + 0.03, l[2]], [l[0] + ux * 0.6, l[1] + 0.03, l[2] + uz * 0.6], HOLO.cyanDim, 1);
    lines.seg([l[0], l[1] + 0.06, l[2]], [l[0] + ux * 0.8, l[1] + 0.06, l[2] + uz * 0.8], HOLO.cyanDim, 1);
  }
  return { stars: stars.build("nav-stars"), lines: lines.build("nav-chart-lines") };
}
