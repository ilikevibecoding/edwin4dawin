// Stern: three main ion engines, four secondaries and four vernier thrusters — heat-discoloured
// shrouds with collars and ribs, nozzle interiors with exhaust vanes and a centre spike, radial-
// gradient exhaust discs recessed in the throats with a faint view-angle-faded bloom disc at each
// mouth, the stern face itself armoured with instanced plates (hull tone, heat-browned near the mains,
// edge bands along the bevels), soot streaks, heat-sink fin banks, a greeble gallery band and the
// engine-block machinery (frame grid, side blocks, pipe bundles, conduits, radiators, pylons) in the
// same tone family as the hull plates. Static parts are batched per material.
import * as THREE from "three";
import { insideOut, rng } from "../kit.js";
import { ENGINES, HULL, dorsalH, ventralH, halfWidth } from "./dims.js";
import { Batcher, gradientColor, grey, instancedMesh, boxItem } from "./batch.js";
import { radiatorGeometry } from "./details.js";
import { trenchWallX } from "./hull.js";
import { ensureExtMaterials } from "./exttex.js";

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// extra small vernier thrusters (kept out of dims.js: nothing else depends on them)
const VERNIERS = [
  { x: -330, y: 30, r: 7 },
  { x: 330, y: 30, r: 7 },
  { x: -150, y: -34, r: 5.5 },
  { x: 150, y: -34, r: 5.5 },
];

export function buildEngines(materials) {
  const group = new THREE.Group();
  group.name = "engines";
  const rand = rng(31337);
  ensureExtMaterials(materials);
  const batch = new Batcher(materials);
  const glowBatch = new Batcher(materials);
  const sternZ = HULL.sternZ;
  const topY = dorsalH(sternZ);
  const botY = -ventralH(sternZ);
  const all = [...ENGINES.main.map((e) => ({ ...e, kind: 0 })), ...ENGINES.secondary.map((e) => ({ ...e, kind: 1 })), ...VERNIERS.map((e) => ({ ...e, kind: 2 }))];
  let greebles = 0;
  // plate-family tones (linear vertex colours; the plates sit around grey 0.66 × the hull map)
  const plateTone = grey(0.62, 1.01);
  const midTone = grey(0.5, 1.01);
  const darkTone = grey(0.36, 1.02);
  // the stern face is plated (below): plate fronts sit this far aft of the section cap (the plates are
  // 1.2 m boxes sunk into the cap, so the seams are shallow lines rather than trenches between slabs)
  const PLATE_TOP = 0.6;

  // --- stern cross-section (the same hexagon hull.js caps the wedge with: flat plateaus, 45°-ish
  // bevels down to the trench lips, vertical trench walls). Everything mounted on the face is clipped
  // to it, so no beam / block / streak pokes out past the bevels at the outer corners.
  const T = HULL.trenchHalf;
  const wFull = halfWidth(sternZ);
  const tx = trenchWallX(sternZ);
  const xdP = HULL.plateauDorsal * wFull;
  const xvP = HULL.plateauVentral * wFull;
  const secTop = (x) => {
    const ax = Math.abs(x);
    if (ax <= xdP) return topY;
    if (ax >= tx) return T;
    return topY - ((topY - T) * (ax - xdP)) / (tx - xdP);
  };
  const secBot = (x) => {
    const ax = Math.abs(x);
    if (ax <= xvP) return botY;
    if (ax >= tx) return -T;
    return botY + ((-botY - T) * (ax - xvP)) / (tx - xvP);
  };
  const secHalfW = (y) => {
    if (Math.abs(y) <= T) return tx;
    if (y > 0) return y >= topY ? 0 : xdP + ((tx - xdP) * (topY - y)) / (topY - T);
    return y <= botY ? 0 : xvP + ((tx - xvP) * (y - botY)) / (-botY - T);
  };
  const inside = (x, y, m) => Math.abs(x) <= secHalfW(y) - m && y <= secTop(x) - m && y >= secBot(x) + m;
  // clip the rectangle [x0,x1]×[y0,y1] into the section with margin m: the section is convex, so
  // clipping x by the half-width at the y edges (or y by the top / bottom at the outer x) is enough.
  // Both orders are tried and the larger result kept (wide beams want the first, tall ones the second).
  const fitXY = (x0, x1, y0, y1, m) => {
    const hw = Math.min(secHalfW(y0), secHalfW(y1)) - m;
    const nx0 = Math.max(x0, -hw);
    const nx1 = Math.min(x1, hw);
    if (nx1 - nx0 < 1) return null;
    const xo = Math.max(Math.abs(nx0), Math.abs(nx1));
    const ny0 = Math.max(y0, secBot(xo) + m);
    const ny1 = Math.min(y1, secTop(xo) - m);
    if (ny1 - ny0 < 1) return null;
    return [nx0, nx1, ny0, ny1];
  };
  const fitYX = (x0, x1, y0, y1, m) => {
    const xo = Math.max(Math.abs(x0), Math.abs(x1));
    const ny0 = Math.max(y0, secBot(xo) + m);
    const ny1 = Math.min(y1, secTop(xo) - m);
    if (ny1 - ny0 < 1) return null;
    const hw = Math.min(secHalfW(ny0), secHalfW(ny1)) - m;
    const nx0 = Math.max(x0, -hw);
    const nx1 = Math.min(x1, hw);
    if (nx1 - nx0 < 1) return null;
    return [nx0, nx1, ny0, ny1];
  };
  const fit = (x0, x1, y0, y1, m = 3) => {
    const a = fitXY(x0, x1, y0, y1, m);
    const b = fitYX(x0, x1, y0, y1, m);
    if (!a || !b) return a || b;
    return (a[1] - a[0]) * (a[3] - a[2]) >= (b[1] - b[0]) * (b[3] - b[2]) ? a : b;
  };
  /** Box on the stern face clipped to the section; dropped when less than `min` m survives either way. */
  const faceBox = (mat, x, y, zc, bw, bh, bd, tone, uv, min = 3) => {
    const f = fit(x - bw / 2, x + bw / 2, y - bh / 2, y + bh / 2);
    if (!f || f[1] - f[0] < min || f[3] - f[2] < min) return false;
    batch.box(mat, (f[0] + f[1]) / 2, (f[2] + f[3]) / 2, zc, f[1] - f[0], f[3] - f[2], bd, tone, uv);
    return true;
  };
  // distance along a ray from (x, y) in direction (dx, dy) until it leaves the section (3 m margin)
  const faceLimit = (x, y, dx, dy) => {
    if (!inside(x, y, 3)) return 0;
    let a = 0;
    let b = 1200;
    for (let i = 0; i < 40; i++) {
      const mid = (a + b) / 2;
      if (inside(x + dx * mid, y + dy * mid, 3)) a = mid;
      else b = mid;
    }
    return a;
  };
  for (const e of all) {
    const main = e.kind === 0;
    // verniers: a short shroud standing proud of the face (it used to start at the engine block's z0
    // and end inside the hull, leaving only its collar ring floating on the face)
    const len = main ? ENGINES.z1 - ENGINES.z0 : e.kind === 1 ? (ENGINES.z1 - ENGINES.z0) * 0.7 : 18;
    const z0 = e.kind === 2 ? sternZ - 4 : ENGINES.z0 - 6;
    const zMouth = z0 + len;
    // heat gradient: hull grey at the front of the shroud → dark, slightly bluish metal at the rim
    const heat = (x, y, z, c) => {
      const k = 0.66 - 0.36 * smoothstep(z0 + len * 0.4, zMouth, z);
      const blue = 1 + 0.16 * smoothstep(z0 + len * 0.55, zMouth, z);
      c.setRGB(k * (2 - blue) * 0.98, k * 0.96, k * blue);
    };
    // shroud (open cylinder), rim ring (heat-blackened), collars, bracing ribs
    const shroud = new THREE.CylinderGeometry(e.r * 1.02, e.r * 0.94, len, main ? 40 : 24, 1, true);
    shroud.rotateX(Math.PI / 2);
    shroud.translate(e.x, e.y, z0 + len / 2);
    shroud.computeVertexNormals();
    gradientColor(shroud, heat);
    batch.add("hullDark", shroud, null, 0.05);
    const rim = new THREE.TorusGeometry(e.r * 1.02, e.r * 0.06, 8, main ? 40 : 24);
    rim.translate(e.x, e.y, zMouth);
    batch.add("hullDark", rim, new THREE.Color(0.1, 0.1, 0.12), 0.1);
    for (const zc of main ? [sternZ + 8, sternZ + 22] : [sternZ + 6]) {
      const collar = new THREE.TorusGeometry(e.r * 1.04, e.r * 0.045, 6, main ? 40 : 24);
      collar.translate(e.x, e.y, zc);
      batch.add("hullDark", collar, midTone, 0.1);
    }
    const nRibs = main ? 12 : e.kind === 1 ? 8 : 6;
    for (let k = 0; k < nRibs; k++) {
      const a = (k / nRibs) * Math.PI * 2;
      const rib = new THREE.BoxGeometry(e.r * 0.08, e.r * 0.1, len * 0.9);
      rib.rotateZ(a + Math.PI / 2);
      rib.translate(e.x + Math.cos(a) * e.r * 1.04, e.y + Math.sin(a) * e.r * 1.04, z0 + len / 2);
      rib.computeVertexNormals();
      gradientColor(rib, heat);
      batch.add("hullDark", rib, null, 0.1);
    }
    // pylons tying the shroud to the stern face (main + secondary)
    if (e.kind < 2) {
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
        const px = e.x + Math.cos(a) * e.r * 1.16;
        const py = e.y + Math.sin(a) * e.r * 1.16;
        if (!inside(px, py, e.r * 0.16)) continue; // would stick out past the stern face outline
        const pl = new THREE.BoxGeometry(e.r * 0.28, e.r * 0.12, 22);
        pl.rotateZ(a);
        pl.translate(px, py, sternZ + 11);
        batch.add("hullDark", pl, midTone, 0.1);
      }
    }
    // nozzle interior: inside-out cone, dark, with a bright throat
    const nozzle = new THREE.CylinderGeometry(e.r * 0.92, e.r * 0.55, len * 0.9, main ? 40 : 24, 1, true);
    nozzle.rotateX(-Math.PI / 2);
    const nz = insideOut(nozzle);
    nz.translate(e.x, e.y, zMouth - len * 0.45);
    // shadowed just inside the mouth, lit toward the throat by the exhaust
    gradientColor(nz, (x, y, z, c) => {
      const k = 0.05 + 0.14 * smoothstep(zMouth, zMouth - len * 0.45, z);
      c.setRGB(k, k, k * 1.12);
    });
    batch.add("hullDark", nz, null, 0.05);
    // inner shadow ring: a dark lip just inside the rim, so the recess reads as depth before the glow
    const lip = new THREE.RingGeometry(e.r * 0.86, e.r * 0.95, main ? 40 : 24);
    lip.translate(e.x, e.y, zMouth - 0.5);
    batch.add("hullDark", lip, new THREE.Color(0.04, 0.04, 0.05), 0.05);
    // exhaust vanes: radial fins between the throat and the mouth, and a centre spike
    const nVanes = main ? 8 : e.kind === 1 ? 6 : 5;
    for (let k = 0; k < nVanes; k++) {
      const a = (k / nVanes) * Math.PI * 2 + 0.1;
      const r0 = e.r * 0.4;
      const r1 = e.r * 0.86;
      const vane = new THREE.BoxGeometry(r1 - r0, e.r * 0.06, len * 0.36);
      vane.translate((r0 + r1) / 2, 0, 0);
      vane.rotateZ(a);
      vane.translate(e.x, e.y, z0 + len * 0.52);
      batch.add("hullDark", vane, new THREE.Color(0.07, 0.07, 0.08), 0.1);
    }
    const spike = new THREE.CylinderGeometry(e.r * 0.03, e.r * 0.2, len * 0.5, 12);
    spike.rotateX(Math.PI / 2);
    spike.translate(e.x, e.y, z0 + len * 0.45);
    batch.add("hullDark", spike, new THREE.Color(0.12, 0.12, 0.14), 0.1);
    // exhaust glow: a radial-gradient disc 0.3 r down the throat (bright desaturated core → blue →
    // transparent rim; the nozzle wall clips it, so from an oblique view it sits visibly inside the
    // bell instead of hugging the rim), fixed in the nozzle plane so it can neither clip the hull nor
    // go edge-on like a billboard; and a faint additive bloom disc at 1.05 r just outside the mouth
    // on the mains / secondaries, faded by the view angle (ext_engineBloom) so the dorsal quarter does
    // not see a blue outline around the stern. Both draw after the opaque bell with depthWrite off.
    const disc = new THREE.CircleGeometry(e.r * 0.78, main ? 40 : 24);
    disc.translate(e.x, e.y, zMouth - e.r * 0.3);
    glowBatch.add("ext_engineGlow", disc, 0xffffff);
    if (e.kind < 2) {
      const bloom = new THREE.CircleGeometry(e.r * 1.05, main ? 40 : 24);
      bloom.translate(e.x, e.y, zMouth + 0.6);
      glowBatch.add("ext_engineBloom", bloom, 0xffffff);
    }
    // soot streaks radiating from the nozzle over the stern plating (on top of the plates), clipped
    // to the stern face so none pokes out past the hull silhouette
    const nStreak = main ? 9 : 4;
    for (let k = 0; k < nStreak; k++) {
      const a = rand() * Math.PI * 2;
      const l0 = e.r * 1.25;
      const l1 = Math.min(l0 + e.r * (0.4 + rand() * 0.9), faceLimit(e.x, e.y, Math.cos(a), Math.sin(a)));
      if (l1 - l0 < 4) continue;
      const sw = e.r * (0.08 + rand() * 0.1);
      const sg = new THREE.BoxGeometry(l1 - l0, sw, 0.2);
      sg.translate((l0 + l1) / 2, 0, 0);
      sg.rotateZ(a);
      sg.translate(e.x, e.y, sternZ + PLATE_TOP + 0.08);
      batch.add("hullDark", sg, new THREE.Color(0.2, 0.19, 0.19), 0.05);
    }
    greebles += nRibs + nVanes + nStreak + 4;
  }

  // --- engine-block machinery on the stern face, in the plates' tone family (mid greys around the
  // plate grey with a few dark accents) so the stern reads as the aft end of the same hull
  // frame grid: horizontal / vertical beams that stop short of every engine shroud, so the face reads
  // as a braced structure the engines are mounted in rather than a plane with floating boxes
  const darkGrey = midTone;
  const frameTone = grey(0.56, 1.01);
  const clearR = (e) => e.r * 1.12 + 3;
  const freeSpans = (fixed, lo, hi, horizontal) => {
    let ivs = [[lo, hi]];
    for (const e of all) {
      const d = horizontal ? Math.abs(fixed - e.y) : Math.abs(fixed - e.x);
      const R = clearR(e);
      if (d >= R) continue;
      const half = Math.sqrt(R * R - d * d);
      const c = horizontal ? e.x : e.y;
      const next = [];
      for (const [a, b] of ivs) {
        if (b <= c - half || a >= c + half) next.push([a, b]);
        else {
          if (c - half > a) next.push([a, c - half]);
          if (c + half < b) next.push([c + half, b]);
        }
      }
      ivs = next;
    }
    return ivs.filter(([a, b]) => b - a > 6);
  };
  // horizontal beams run out to the bevel at their own height; vertical beams span the section's
  // height at their own x (so the outer ones are short, following the hexagon)
  for (const y of [-57, -30, 30, 48]) {
    const hw = Math.min(secHalfW(y - 1.1), secHalfW(y + 1.1)) - 6;
    for (const [a, b] of freeSpans(y, -hw, hw, true)) batch.box("hullDark", (a + b) / 2, y, sternZ + 1.2, b - a, 2.2, 2.4, frameTone, 0.05);
  }
  for (const x of [-390, -330, -250, -120, -60, 60, 120, 250, 330, 390]) {
    const xo = Math.abs(x) + 1.1;
    for (const [a, b] of freeSpans(x, secBot(xo) + 4, secTop(xo) - 4, false)) batch.box("hullDark", x, (a + b) / 2, sternZ + 1.2, 2.2, b - a, 2.4, frameTone, 0.05);
  }
  // lit machinery band along the ventral edge, side blocks at the outer corners (sized to the section
  // height at their outer edge, with a smaller lit block stepping up the bevel inboard of them)
  faceBox("cityDense", 0, botY + 8.5, sternZ + 4, xvP * 1.26, 7, 8, darkTone, 0.012);
  for (const s of [-1, 1]) {
    faceBox("cityDense", s * 400, 0, sternZ + 6, 40, 34, 12, midTone, 0.012);
    faceBox("hullDark", s * 400, 0, sternZ + 12.5, 24, 8, 1.2, darkTone, 0.05);
    faceBox("cityDense", s * 362, 24, sternZ + 5, 26, 14, 10, midTone, 0.012);
    faceBox("hullDark", s * 372, -34, sternZ + 4, 30, 8, 8, plateTone, 0.05);
    // vertical pipe bundles between the centre and side engines
    for (const dx of [-4, 0, 4]) batch.cyl("hullDark", s * (126 + dx), 6, sternZ + 5, 1.4, 1.4, 88, "y", grey(0.58, 1.0), 10);
    for (const yy of [-30, 12, 44]) batch.box("hullDark", s * 126, yy, sternZ + 5, 11, 2.2, 5, darkTone);
    // radiator panels lying on the stern face, fins aft
    for (const [x, y] of [
      [s * 356, -24],
      [s * 300, 46],
    ]) {
      const rg = radiatorGeometry();
      rg.rotateX(Math.PI / 2);
      rg.translate(x, y, sternZ + PLATE_TOP);
      batch.add("hullDark", rg, midTone, 0.1);
    }
  }
  // horizontal conduits along the stern face, under the main engines
  for (const y of [-53, -55]) batch.cyl("hullDark", 0, y, sternZ + 3.5, 1.1, 1.1, 320, "x", grey(0.54, 1.0), 10);
  // thrust-frame blocks below the inner secondaries, pods along the dorsal / ventral edges (the dorsal
  // ones step down the bevel with the section top), spines between the engine groups
  const occupied = (x, y, pad = 4) => all.some((e) => Math.hypot(x - e.x, y - e.y) < e.r * 1.25 + pad);
  for (const s of [-1, 1]) {
    faceBox("hullDark", s * 89, -26, sternZ + 4, 44, 20, 8, plateTone, 0.05);
    faceBox("cityDense", s * 89, -26, sternZ + 8.5, 30, 6, 1.2, darkTone, 0.012);
    faceBox("hullDark", s * 243, 2, sternZ + 4, 6, 76, 6, midTone, 0.05);
    for (let k = 0; k < 5; k++) {
      const px = s * (162 + k * 44);
      const pw = 10 + (k % 2) * 4;
      const py = secTop(Math.abs(px) + pw / 2) - 11;
      if (!occupied(px, py, 6)) faceBox("hullDark", px, py, sternZ + 4, pw, 7, 6, k % 2 ? plateTone : darkTone, 0.05);
      if (k < 4) faceBox("hullDark", s * (60 + k * 50), botY + 12.5, sternZ + 4, 12, 6, 6, k % 2 ? darkTone : plateTone, 0.05);
    }
    // feed lines from the pipe bundle across to the side main
    for (const yy of [-8, 4, 16]) batch.cyl("hullDark", s * 146, yy, sternZ + 5, 0.8, 0.8, 26, "x", grey(0.56, 1.0), 8);
  }
  // raised access panels on the plating: a few dark and a few light ones, only where the whole panel
  // fits inside the section
  for (let k = 0; k < 70; k++) {
    const x = (rand() - 0.5) * 2 * (tx - 20);
    const y = botY + 8 + rand() * (topY - botY - 16);
    if (occupied(x, y)) continue;
    const bw = 4 + rand() * 7;
    const bh = 2.5 + rand() * 4;
    if (!inside(x - bw / 2, y - bh / 2, 3) || !inside(x + bw / 2, y - bh / 2, 3) || !inside(x - bw / 2, y + bh / 2, 3) || !inside(x + bw / 2, y + bh / 2, 3)) continue;
    const t = rand();
    batch.box("hullDark", x, y, sternZ + PLATE_TOP + 0.4, bw, bh, 0.8, t < 0.2 ? grey(0.22, 1.04) : t < 0.6 ? midTone : grey(0.72, 1.0), 0.05);
    greebles++;
  }
  // --- heat-sink fin banks: stacks of three radiators between the centre and side mains (fins aft),
  // and a pair flanking each outer secondary
  for (const s of [-1, 1]) {
    for (const [x, y] of [
      [s * 90, -8],
      [s * 90, 3],
      [s * 90, 14],
      [s * 338, -40],
      [s * 338, 8],
    ]) {
      if (!inside(x - 7, y - 4.5, 2) || !inside(x + 7, y + 4.5, 2) || occupied(x, y, 2)) continue;
      const rg = radiatorGeometry();
      rg.rotateX(Math.PI / 2);
      rg.translate(x, y, sternZ + PLATE_TOP);
      batch.add("hullDark", rg, midTone, 0.1);
      greebles++;
    }
    // greeble gallery band along the dorsal edge between the bells: a dark recessed strip with lit
    // slots and a row of small housings / valve blocks over it
    const gx0 = 118;
    const gx1 = Math.min(268, secHalfW(61.5) - 3);
    batch.box("cityDense", (s * (gx0 + gx1)) / 2, 60, sternZ + PLATE_TOP + 0.4, gx1 - gx0, 3.2, 0.8, darkTone, 0.012);
    for (let x = gx0 + 3; x < gx1 - 3; x += 5 + rand() * 6) {
      const w = 2 + rand() * 3;
      const h = 1.2 + rand() * 1.6;
      batch.box("hullDark", s * (x + w / 2), 60 + (rand() - 0.5) * 0.8, sternZ + PLATE_TOP + 1.2 + h / 2, w, h, 2.4 + rand() * 1.6, rand() < 0.3 ? darkTone : plateTone, 0.05);
      greebles++;
    }
    batch.cyl("hullDark", (s * (gx0 + gx1)) / 2, 57.6, sternZ + PLATE_TOP + 0.9, 0.7, 0.7, gx1 - gx0, "x", grey(0.5, 1.0), 8);
  }
  greebles += 50;
  batch.build(group, { name: "engines" });

  // --- armour plates over the stern face: a staggered grid of 9–12 × 7 m plates in the hull plates'
  // tone family (per-plate jitter, a few primered ones, heat-browned around the mains), clipped to the
  // hexagonal section and kept clear of the bells, on the shared plate texture — so the face is the
  // aft end of the same plated hull rather than a flat panel with machinery on it
  const sternPlates = [];
  const bellClear = (x0, x1, y0, y1) =>
    all.every((e) => {
      const dx = Math.max(x0 - e.x, 0, e.x - x1);
      const dy = Math.max(y0 - e.y, 0, e.y - y1);
      return Math.hypot(dx, dy) > e.r * 1.08 + 1.2;
    });
  const heatAt = (x, y) => {
    let h = 0;
    for (const e of all) if (e.kind === 0) h = Math.max(h, 1 - smoothstep(e.r * 1.15, e.r * 1.75, Math.hypot(x - e.x, y - e.y)));
    return h;
  };
  const pushPlate = (x0, x1, y0, y1) => {
    const f = fit(x0, x1, y0, y1, 1.0);
    if (!f || f[1] - f[0] < 2.5 || f[3] - f[2] < 2.5) return;
    if (!bellClear(f[0], f[1], f[2], f[3])) {
      // split across the longer axis and keep the halves that clear the bell
      if (f[1] - f[0] < 5 && f[3] - f[2] < 5) return;
      if (f[1] - f[0] >= f[3] - f[2]) {
        const xm = (f[0] + f[1]) / 2;
        pushPlate(f[0], xm - 0.2, f[2], f[3]);
        pushPlate(xm + 0.2, f[1], f[2], f[3]);
      } else {
        const ym = (f[2] + f[3]) / 2;
        pushPlate(f[0], f[1], f[2], ym - 0.2);
        pushPlate(f[0], f[1], ym + 0.2, f[3]);
      }
      return;
    }
    const xc = (f[0] + f[1]) / 2;
    const yc = (f[2] + f[3]) / 2;
    const h = heatAt(xc, yc) * (0.5 + 0.5 * rand());
    sternPlates.push(boxItem(xc, yc, sternZ + PLATE_TOP - 0.6, f[1] - f[0], f[3] - f[2], 1.2, plateTint(h)));
  };
  // ±3 % per-plate jitter, a few primered plates, heat-browned toward the mains
  const plateTint = (h = 0) => {
    let k = 0.64 * (1 + (rand() - 0.5) * 0.06);
    const rr = rand();
    if (rr < 0.02) k *= 1.06;
    else if (rr < 0.06) k *= 0.84;
    return [k * (1 - 0.3 * h), k * (1 - 0.36 * h), k * 1.02 * (1 - 0.44 * h)];
  };
  const rowH = 7.4;
  let rowI = 0;
  for (let y0 = botY + 1.2; y0 < topY - 3; y0 += rowH, rowI++) {
    const y1 = Math.min(y0 + rowH - 0.4, topY - 1.2);
    const colW = 9 + (rowI % 3) * 1.5;
    const hw = Math.max(secHalfW(y0), secHalfW(y1)) + colW;
    for (let x0 = -hw + (rowI % 2) * colW * 0.5; x0 < hw; x0 += colW) pushPlate(x0, x0 + colW - 0.4, y0, y1);
  }
  // --- edge bands: along the four bevels the axis-aligned field is clipped into a staircase, so a
  // two-row band of plates laid parallel to each bevel is layered over that edge (0.25 m proud, an edge
  // reinforcement) and the stern outline reads as a clean hexagon again
  const BAND_ROW = 7.2;
  const BAND_SEAM = 0.4;
  const bandZ = sternZ + PLATE_TOP + 0.25 - 0.6;
  for (const sx of [-1, 1]) {
    for (const sy of [1, -1]) {
      const P0 = sy > 0 ? { x: sx * xdP, y: topY } : { x: sx * xvP, y: botY };
      const P1 = { x: sx * tx, y: sy * T };
      const L = Math.hypot(P1.x - P0.x, P1.y - P0.y);
      const d = { x: (P1.x - P0.x) / L, y: (P1.y - P0.y) / L };
      let n = { x: -d.y, y: d.x };
      if (n.x * -P0.x + n.y * -P0.y < 0) n = { x: -n.x, y: -n.y }; // inward
      const ang = Math.atan2(d.y, d.x);
      const at = (t, o) => [P0.x + d.x * t + n.x * o, P0.y + d.y * t + n.y * o];
      const bells = all.map((e) => ({ t: (e.x - P0.x) * d.x + (e.y - P0.y) * d.y, o: (e.x - P0.x) * n.x + (e.y - P0.y) * n.y, r: e.r * 1.08 + 1.2 }));
      // the t-interval along the bevel where both long edges of a row stay inside the section
      const tRange = (o0, o1) => {
        let ta = -Infinity;
        let tb = Infinity;
        for (const o of [o0, o1]) {
          let lo = null;
          let hi = null;
          for (let t = -30; t <= L + 30; t += 0.5) {
            const q = at(t, o);
            if (!inside(q[0], q[1], 0.8)) continue;
            if (lo === null) lo = t;
            hi = t;
          }
          if (lo === null) return null;
          ta = Math.max(ta, lo);
          tb = Math.min(tb, hi);
        }
        return tb - ta > 2.5 ? [ta, tb] : null;
      };
      const pushBand = (t0, t1, o0, o1) => {
        if (t1 - t0 < 2.5) return;
        for (const b of bells) {
          const dt = Math.max(t0 - b.t, 0, b.t - t1);
          const dO = Math.max(o0 - b.o, 0, b.o - o1);
          if (Math.hypot(dt, dO) >= b.r) continue;
          if (t1 - t0 < 5) return;
          const tm = (t0 + t1) / 2;
          pushBand(t0, tm - BAND_SEAM / 2, o0, o1);
          pushBand(tm + BAND_SEAM / 2, t1, o0, o1);
          return;
        }
        const c = at((t0 + t1) / 2, (o0 + o1) / 2);
        sternPlates.push(boxItem(c[0], c[1], bandZ, t1 - t0, o1 - o0, 1.2, plateTint(), 0, 0, ang));
      };
      for (let j = 0; j < 2; j++) {
        const o0 = 0.8 + j * BAND_ROW;
        const o1 = o0 + BAND_ROW - BAND_SEAM;
        const r = tRange(o0, o1);
        if (!r) continue;
        let t = r[0];
        if (j === 1) {
          const first = 5 + rand() * 4; // stagger the inner row's seams against the outer row's
          pushBand(t, t + first, o0, o1);
          t += first + BAND_SEAM;
        }
        while (t < r[1] - 2.5) {
          const len = Math.min(r[1] - t, 9 + rand() * 4);
          pushBand(t, t + len, o0, o1);
          t += len + BAND_SEAM;
        }
      }
    }
  }
  const plateGeo = new THREE.BoxGeometry(1, 1, 1);
  group.add(instancedMesh(plateGeo, materials.ext_hullPlate, sternPlates, { castShadow: true, name: "sternPlates" }));
  // glow discs: drawn after the opaque bells (transparent queue + render order), no depth writes
  const glowMeshes = glowBatch.build(group, { name: "engineGlows", castShadow: false, receiveShadow: false });
  for (const m of glowMeshes) m.renderOrder = m.material === materials.ext_engineBloom ? 6 : 5;

  // blue point light behind the stern so the hull's rear catches the exhaust glow
  const light = new THREE.PointLight(0x6fb4ff, 2.5, 700, 1.0);
  light.position.set(0, 10, ENGINES.z1 + 80);
  group.add(light);
  return {
    group,
    light,
    lod0: null,
    stats: { greebles },
    /** Subtle exhaust flicker on the bloom discs (the throat discs stay steady). */
    update(t) {
      materials.ext_engineBloom.opacity = 0.25 * (1 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.1) * 0.05);
    },
  };
}
