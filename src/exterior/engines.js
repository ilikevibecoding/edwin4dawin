// Stern: three main ion engines, four secondaries and four vernier thrusters — heat-discoloured
// shrouds with collars and ribs, nozzle interiors with exhaust vanes and a centre spike, radial-
// gradient exhaust discs recessed in the throats with a faint bloom disc at each mouth, soot streaks
// on the stern plating, and the engine-block machinery (frame grid, side blocks, pipe bundles,
// conduits, radiators, pylons) in the same tone family as the hull plates. Static parts are batched
// per material (a handful of draw calls for the whole stern).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { insideOut, rng } from "../kit.js";
import { ENGINES, HULL, dorsalH, ventralH, halfWidth } from "./dims.js";
import { Batcher, gradientColor, grey } from "./batch.js";
import { radiatorGeometry } from "./details.js";
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
  const w = halfWidth(sternZ) - HULL.trenchInset;
  const topY = dorsalH(sternZ);
  const botY = -ventralH(sternZ);
  const all = [...ENGINES.main.map((e) => ({ ...e, kind: 0 })), ...ENGINES.secondary.map((e) => ({ ...e, kind: 1 })), ...VERNIERS.map((e) => ({ ...e, kind: 2 }))];
  let greebles = 0;
  // plate-family tones (linear vertex colours; the plates sit around grey 0.66 × the hull map)
  const plateTone = grey(0.62, 1.01);
  const midTone = grey(0.5, 1.01);
  const darkTone = grey(0.36, 1.02);
  // distance along a ray from (x, y) in direction (dx, dy) until it leaves the stern face rectangle
  const faceLimit = (x, y, dx, dy) => {
    const lim = (v, lo, hi, d) => (d > 1e-6 ? (hi - v) / d : d < -1e-6 ? (lo - v) / d : Infinity);
    return Math.min(lim(x, -(w - 6), w - 6, dx), lim(y, botY + 3, topY - 3, dy));
  };
  for (const e of all) {
    const main = e.kind === 0;
    const len = main ? ENGINES.z1 - ENGINES.z0 : e.kind === 1 ? (ENGINES.z1 - ENGINES.z0) * 0.7 : 24;
    const z0 = ENGINES.z0 - 6;
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
        const py = e.y + Math.sin(a) * e.r * 1.16;
        if (py > topY - 4 || py < botY + 4) continue; // would stick out above / below the stern face
        const pl = new THREE.BoxGeometry(e.r * 0.28, e.r * 0.12, 22);
        pl.rotateZ(a);
        pl.translate(e.x + Math.cos(a) * e.r * 1.16, e.y + Math.sin(a) * e.r * 1.16, sternZ + 11);
        batch.add("hullDark", pl, midTone, 0.1);
      }
    }
    // nozzle interior: inside-out cone, dark, with a bright throat
    const nozzle = new THREE.CylinderGeometry(e.r * 0.92, e.r * 0.55, len * 0.9, main ? 40 : 24, 1, true);
    nozzle.rotateX(-Math.PI / 2);
    const nz = insideOut(nozzle);
    nz.translate(e.x, e.y, zMouth - len * 0.45);
    batch.add("hullDark", nz, new THREE.Color(0.16, 0.16, 0.18), 0.05);
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
    // exhaust glow: a radial-gradient disc recessed 2 m inside the mouth (bright desaturated core →
    // blue → transparent rim, so the dark bell shows through the edge and the disc has falloff), fixed
    // in the nozzle plane so it can neither clip the hull nor go edge-on like a billboard; and a faint
    // 1.4× additive bloom disc just outside the mouth on the mains / secondaries. Both are drawn after
    // the opaque bell with depthWrite off, which removes the dark crescent the wall used to cut.
    const disc = new THREE.CircleGeometry(e.r * 0.86, main ? 40 : 24);
    disc.translate(e.x, e.y, zMouth - 2);
    glowBatch.add("ext_engineGlow", disc, 0xffffff);
    if (e.kind < 2) {
      const bloom = new THREE.CircleGeometry(e.r * 1.4, main ? 40 : 24);
      bloom.translate(e.x, e.y, zMouth + 0.8);
      glowBatch.add("ext_engineBloom", bloom, 0xffffff);
    }
    // soot streaks radiating from the nozzle over the stern plating, clipped to the stern face so
    // none pokes out past the hull silhouette
    const nStreak = main ? 9 : 4;
    for (let k = 0; k < nStreak; k++) {
      const a = rand() * Math.PI * 2;
      const l0 = e.r * 1.25;
      const l1 = Math.min(l0 + e.r * (0.4 + rand() * 0.9), faceLimit(e.x, e.y, Math.cos(a), Math.sin(a)));
      if (l1 - l0 < 4) continue;
      const sw = e.r * (0.08 + rand() * 0.1);
      const sg = new THREE.BoxGeometry(l1 - l0, sw, 0.25);
      sg.translate((l0 + l1) / 2, 0, 0);
      sg.rotateZ(a);
      sg.translate(e.x, e.y, sternZ + 0.2);
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
  for (const y of [-57, -30, 30, 48]) for (const [a, b] of freeSpans(y, -(w - 8), w - 8, true)) batch.box("hullDark", (a + b) / 2, y, sternZ + 1.2, b - a, 2.2, 2.4, frameTone, 0.05);
  for (const x of [-390, -330, -250, -120, -60, 60, 120, 250, 330, 390]) for (const [a, b] of freeSpans(x, botY + 4, topY - 4, false)) batch.box("hullDark", x, (a + b) / 2, sternZ + 1.2, 2.2, b - a, 2.4, frameTone, 0.05);
  // lit machinery band along the ventral edge, side blocks at the outer corners
  batch.box("cityDense", 0, botY + 8.5, sternZ + 4, w * 0.84, 7, 8, darkTone, 0.012);
  for (const s of [-1, 1]) {
    batch.box("cityDense", s * 400, 20, sternZ + 6, 50, 40, 12, midTone, 0.012);
    batch.box("hullDark", s * 400, 44, sternZ + 4, 30, 8, 8, plateTone, 0.05);
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
      rg.translate(x, y, sternZ + 0.3);
      batch.add("hullDark", rg, midTone, 0.1);
    }
  }
  // horizontal conduits along the stern face, under the main engines
  for (const y of [-53, -55]) batch.cyl("hullDark", 0, y, sternZ + 3.5, 1.1, 1.1, 320, "x", grey(0.54, 1.0), 10);
  // thrust-frame blocks below the inner secondaries, pods along the dorsal / ventral edges, spines
  // between the engine groups and panel plates inside the frame cells
  for (const s of [-1, 1]) {
    batch.box("hullDark", s * 89, -26, sternZ + 4, 44, 20, 8, plateTone, 0.05);
    batch.box("cityDense", s * 89, -26, sternZ + 8.5, 30, 6, 1.2, darkTone, 0.012);
    batch.box("hullDark", s * 243, 2, sternZ + 4, 6, 76, 6, midTone, 0.05);
    for (let k = 0; k < 4; k++) {
      batch.box("hullDark", s * (250 + k * 44), topY - 11, sternZ + 4, 10 + (k % 2) * 4, 7, 6, k % 2 ? plateTone : darkTone, 0.05);
      batch.box("hullDark", s * (60 + k * 50), botY + 12.5, sternZ + 4, 12, 6, 6, k % 2 ? darkTone : plateTone, 0.05);
    }
    // feed lines from the pipe bundle across to the side main
    for (const yy of [-8, 4, 16]) batch.cyl("hullDark", s * 146, yy, sternZ + 5, 0.8, 0.8, 26, "x", grey(0.56, 1.0), 8);
  }
  // panel plates inside the frame cells: mostly plate grey with a few dark and a few light ones
  const occupied = (x, y) => all.some((e) => Math.hypot(x - e.x, y - e.y) < e.r * 1.25 + 4);
  for (let k = 0; k < 150; k++) {
    const x = (rand() - 0.5) * 2 * (w - 30);
    const y = botY + 8 + rand() * (topY - botY - 16);
    if (occupied(x, y)) continue;
    const bw = 4 + rand() * 9;
    const bh = 2.5 + rand() * 6;
    const t = rand();
    batch.box("hullDark", x, y, sternZ + 0.9, bw, bh, 1.8, t < 0.14 ? grey(0.2, 1.04) : t < 0.5 ? midTone : t < 0.85 ? plateTone : grey(0.72, 1.0), 0.05);
    greebles++;
  }
  greebles += 50;
  batch.build(group, { name: "engines" });
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
