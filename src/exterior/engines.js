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
  const all = [...ENGINES.main.map((e) => ({ ...e, kind: 0 })), ...ENGINES.secondary.map((e) => ({ ...e, kind: 1 })), ...VERNIERS.map((e) => ({ ...e, kind: 2 }))];
  let greebles = 0;
  for (const e of all) {
    const main = e.kind === 0;
    const len = main ? ENGINES.z1 - ENGINES.z0 : e.kind === 1 ? (ENGINES.z1 - ENGINES.z0) * 0.7 : 24;
    const z0 = ENGINES.z0 - 6;
    const zMouth = z0 + len;
    // heat gradient: hull grey at the front of the shroud → dark, slightly bluish metal at the rim
    const heat = (x, y, z, c) => {
      const k = 0.62 - 0.42 * smoothstep(z0 + len * 0.35, zMouth, z);
      const blue = 1 + 0.18 * smoothstep(z0 + len * 0.5, zMouth, z);
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
    // exhaust halo sprite just outside the nozzle (kept modest so the far view does not blow out)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fbcff, transparent: true, opacity: main ? 0.62 : 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.position.set(e.x, e.y, zMouth + e.r * 0.35);
    sp.scale.setScalar(e.r * 2.5);
    group.add(sp);
    glows.push({ sprite: sp, base: e.r * 2.5 });
    // soot streaks radiating from the nozzle over the stern plating
    const nStreak = main ? 9 : 4;
    for (let k = 0; k < nStreak; k++) {
      const a = rand() * Math.PI * 2;
      const l0 = e.r * 1.25;
      const l1 = l0 + e.r * (0.4 + rand() * 0.9);
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
  const w = halfWidth(sternZ) - HULL.trenchInset;
  const topY = dorsalH(sternZ);
  const botY = -ventralH(sternZ);
  batch.box("cityDense", 0, topY - 5, sternZ + 7, w * 0.92, 7, 14, PALETTE.hullDark, 0.025);
  batch.box("cityDense", 0, botY + 5, sternZ + 7, w * 0.84, 7, 14, PALETTE.hullDark, 0.025);
  for (const s of [-1, 1]) {
    batch.box("cityDense", s * 400, 20, sternZ + 6, 50, 40, 12, PALETTE.hullDark, 0.025);
    batch.box("hullDark", s * 400, 44, sternZ + 4, 30, 8, 8, PALETTE.hullDark, 0.05);
    // vertical pipe bundles between the centre and side engines
    for (const dx of [-4, 0, 4]) batch.cyl("hullDark", s * (126 + dx), 6, sternZ + 5, 1.4, 1.4, 88, "y", PALETTE.hullGrey.clone().multiplyScalar(0.7), 10);
    for (const yy of [-30, 12, 44]) batch.box("hullDark", s * 126, yy, sternZ + 5, 11, 2.2, 5, PALETTE.hullDark);
    // radiator panels lying on the stern face, fins aft
    for (const [x, y] of [
      [s * 335, -24],
      [s * 300, 46],
    ]) {
      const rg = radiatorGeometry();
      rg.rotateX(Math.PI / 2);
      rg.translate(x, y, sternZ + 0.3);
      batch.add("hullDark", rg, PALETTE.hullGrey.clone().multiplyScalar(0.55), 0.1);
    }
  }
  // horizontal conduits along the stern face
  for (const [y, len] of [
    [-45, 320],
    [-43, 320],
  ]) {
    batch.cyl("hullDark", 0, y, sternZ + 3.5, 1.1, 1.1, len, "x", PALETTE.hullGrey.clone().multiplyScalar(0.62), 10);
  }
  greebles += 30;
  batch.build(group, { name: "engines" });

  // blue point light behind the stern so the hull's rear catches the exhaust glow
  const light = new THREE.PointLight(0x6fb4ff, 2.5, 700, 1.0);
  light.position.set(0, 10, ENGINES.z1 + 80);
  group.add(light);
  return {
    group,
    light,
    lod0: null,
    stats: { greebles },
    update(t) {
      for (const g of glows) {
        const k = 1 + Math.sin(t * 7 + g.base) * 0.04 + Math.sin(t * 13.1 + g.base * 0.3) * 0.03;
        g.sprite.scale.setScalar(g.base * k);
      }
    },
  };
}
