// Stern: three main ion engines, four secondaries and four vernier thrusters — heat-discoloured
// shrouds with collars and ribs, nozzle interiors with exhaust vanes and a centre spike, blue-white
// glow discs, additive exhaust halos, soot streaks on the stern plating, and the engine-block
// machinery (ridges, side blocks, pipe bundles, conduits, radiators, pylons). Static parts are
// batched per material (a handful of draw calls for the whole stern).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { insideOut, rng } from "../kit.js";
import { ENGINES, HULL, dorsalH, ventralH, halfWidth } from "./dims.js";
import { makeStarSprite } from "../textures.js";
import { Batcher, gradientColor } from "./batch.js";
import { radiatorGeometry } from "./details.js";

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
  const glowTex = makeStarSprite(128);
  const glows = [];
  const batch = new Batcher(materials);
  const sternZ = HULL.sternZ;
  const w = halfWidth(sternZ) - HULL.trenchInset;
  const topY = dorsalH(sternZ);
  const botY = -ventralH(sternZ);
  const all = [...ENGINES.main.map((e) => ({ ...e, kind: 0 })), ...ENGINES.secondary.map((e) => ({ ...e, kind: 1 })), ...VERNIERS.map((e) => ({ ...e, kind: 2 }))];
  let greebles = 0;
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
      batch.add("hullDark", collar, PALETTE.hullDark, 0.1);
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
        batch.add("hullDark", pl, PALETTE.hullDark, 0.1);
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
    // glow disc deep in the throat + a wider soft disc near the mouth
    const disc = new THREE.CircleGeometry(e.r * 0.62, main ? 40 : 24);
    disc.translate(e.x, e.y, z0 + len * 0.2);
    batch.add("engineGlow", disc, 0xffffff);
    const outer = new THREE.CircleGeometry(e.r * 0.88, main ? 40 : 24);
    outer.translate(e.x, e.y, z0 + len * 0.74);
    batch.add("engineGlowOuter", outer, 0xffffff);
    // exhaust halo sprite seated inside the nozzle mouth (the shroud occludes it from the side, so it
    // cannot clip into the hull as a crescent or hang off the stern as a disc); its opacity is faded
    // with the view angle in update(). The verniers are too small to need one.
    if (e.kind < 2) {
      const opacity = main ? 0.55 : 0.45;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fbcff, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(e.x, e.y, zMouth - e.r * 0.3);
      sp.scale.setScalar(e.r * 1.4);
      group.add(sp);
      glows.push({ sprite: sp, base: e.r * 1.4, opacity });
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

  // --- engine-block machinery on the stern face
  // frame grid: horizontal / vertical beams that stop short of every engine shroud, so the face reads
  // as a braced structure the engines are mounted in rather than a plane with floating boxes
  const darkGrey = PALETTE.hullGrey.clone().multiplyScalar(0.55);
  const frameTone = PALETTE.hullGrey.clone().multiplyScalar(0.48);
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
  batch.box("cityDense", 0, botY + 8.5, sternZ + 4, w * 0.84, 7, 8, PALETTE.hullDark, 0.012);
  for (const s of [-1, 1]) {
    batch.box("cityDense", s * 400, 20, sternZ + 6, 50, 40, 12, PALETTE.hullDark, 0.012);
    batch.box("hullDark", s * 400, 44, sternZ + 4, 30, 8, 8, PALETTE.hullDark, 0.05);
    // vertical pipe bundles between the centre and side engines
    for (const dx of [-4, 0, 4]) batch.cyl("hullDark", s * (126 + dx), 6, sternZ + 5, 1.4, 1.4, 88, "y", PALETTE.hullGrey.clone().multiplyScalar(0.7), 10);
    for (const yy of [-30, 12, 44]) batch.box("hullDark", s * 126, yy, sternZ + 5, 11, 2.2, 5, PALETTE.hullDark);
    // radiator panels lying on the stern face, fins aft
    for (const [x, y] of [
      [s * 356, -24],
      [s * 300, 46],
    ]) {
      const rg = radiatorGeometry();
      rg.rotateX(Math.PI / 2);
      rg.translate(x, y, sternZ + 0.3);
      batch.add("hullDark", rg, PALETTE.hullGrey.clone().multiplyScalar(0.55), 0.1);
    }
  }
  // horizontal conduits along the stern face, under the main engines
  for (const y of [-53, -55]) batch.cyl("hullDark", 0, y, sternZ + 3.5, 1.1, 1.1, 320, "x", PALETTE.hullGrey.clone().multiplyScalar(0.62), 10);
  // thrust-frame blocks below the inner secondaries, pods along the dorsal / ventral edges, spines
  // between the engine groups and panel plates inside the frame cells
  for (const s of [-1, 1]) {
    batch.box("hullDark", s * 89, -26, sternZ + 4, 44, 20, 8, darkGrey, 0.05);
    batch.box("cityDense", s * 89, -26, sternZ + 8.5, 30, 6, 1.2, PALETTE.hullDark, 0.012);
    batch.box("hullDark", s * 243, 2, sternZ + 4, 6, 76, 6, PALETTE.hullDark, 0.05);
    for (let k = 0; k < 4; k++) {
      batch.box("hullDark", s * (250 + k * 44), topY - 11, sternZ + 4, 10 + (k % 2) * 4, 7, 6, k % 2 ? darkGrey : PALETTE.hullDark, 0.05);
      batch.box("hullDark", s * (60 + k * 50), botY + 12.5, sternZ + 4, 12, 6, 6, k % 2 ? PALETTE.hullDark : darkGrey, 0.05);
    }
    // feed lines from the pipe bundle across to the side main
    for (const yy of [-8, 4, 16]) batch.cyl("hullDark", s * 146, yy, sternZ + 5, 0.8, 0.8, 26, "x", PALETTE.hullGrey.clone().multiplyScalar(0.66), 8);
  }
  const occupied = (x, y) => all.some((e) => Math.hypot(x - e.x, y - e.y) < e.r * 1.25 + 4);
  for (let k = 0; k < 150; k++) {
    const x = (rand() - 0.5) * 2 * (w - 30);
    const y = botY + 8 + rand() * (topY - botY - 16);
    if (occupied(x, y)) continue;
    const bw = 4 + rand() * 9;
    const bh = 2.5 + rand() * 6;
    const t = rand();
    batch.box("hullDark", x, y, sternZ + 0.9, bw, bh, 1.8, t < 0.25 ? PALETTE.hullBlack : t < 0.6 ? darkGrey : PALETTE.hullDark.clone().multiplyScalar(0.85), 0.05);
    greebles++;
  }
  greebles += 50;
  batch.build(group, { name: "engines" });

  // blue point light behind the stern so the hull's rear catches the exhaust glow
  const light = new THREE.PointLight(0x6fb4ff, 2.5, 700, 1.0);
  light.position.set(0, 10, ENGINES.z1 + 80);
  group.add(light);
  const toCam = new THREE.Vector3();
  return {
    group,
    light,
    lod0: null,
    stats: { greebles },
    /** Flicker the halos and fade them out as the view goes edge-on to the exhaust axis (+z). */
    update(t, cameraPos = null) {
      for (const g of glows) {
        const k = 1 + Math.sin(t * 7 + g.base) * 0.04 + Math.sin(t * 13.1 + g.base * 0.3) * 0.03;
        g.sprite.scale.setScalar(g.base * k);
        if (cameraPos) {
          toCam.subVectors(cameraPos, g.sprite.position).normalize();
          g.sprite.material.opacity = g.opacity * smoothstep(0.12, 0.55, toCam.z);
        }
      }
    },
  };
}
