// Stern: three main ion engines and four secondaries — housings, nozzle interiors, blue-white glow
// discs, additive exhaust halos, heat-discoloured shrouds and the surrounding machinery block.
// Static parts are batched per material (a handful of draw calls for the whole stern).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { insideOut } from "../kit.js";
import { ENGINES, HULL, dorsalH, ventralH, halfWidth } from "./dims.js";
import { makeStarSprite } from "../textures.js";
import { Batcher } from "./batch.js";

export function buildEngines(materials) {
  const group = new THREE.Group();
  group.name = "engines";
  const glowTex = makeStarSprite(128);
  const glows = [];
  const batch = new Batcher(materials);
  const all = [...ENGINES.main.map((e) => ({ ...e, main: true })), ...ENGINES.secondary.map((e) => ({ ...e, main: false }))];
  for (const e of all) {
    const len = e.main ? ENGINES.z1 - ENGINES.z0 : (ENGINES.z1 - ENGINES.z0) * 0.7;
    const z0 = ENGINES.z0 - 6;
    // shroud (open cylinder), rim ring (heat-blackened), bracing ribs
    const shroud = new THREE.CylinderGeometry(e.r * 1.02, e.r * 0.94, len, 40, 1, true);
    shroud.rotateX(Math.PI / 2);
    shroud.translate(e.x, e.y, z0 + len / 2);
    batch.add("hullDark", shroud, PALETTE.hullDark, 0.05);
    const rim = new THREE.TorusGeometry(e.r * 1.02, e.r * 0.06, 8, 40);
    rim.translate(e.x, e.y, z0 + len);
    batch.add("hullDark", rim, PALETTE.hullBlack, 0.1);
    const nRibs = e.main ? 12 : 8;
    for (let k = 0; k < nRibs; k++) {
      const a = (k / nRibs) * Math.PI * 2;
      const rib = new THREE.BoxGeometry(e.r * 0.08, e.r * 0.1, len * 0.9);
      rib.rotateZ(a + Math.PI / 2);
      rib.translate(e.x + Math.cos(a) * e.r * 1.04, e.y + Math.sin(a) * e.r * 1.04, z0 + len / 2);
      batch.add("hullDark", rib, PALETTE.hullGrey, 0.1);
    }
    // nozzle interior: inside-out cone, dark, with a bright throat
    const nozzle = new THREE.CylinderGeometry(e.r * 0.92, e.r * 0.55, len * 0.9, 40, 1, true);
    nozzle.rotateX(-Math.PI / 2);
    const nz = insideOut(nozzle);
    nz.translate(e.x, e.y, z0 + len - len * 0.45);
    batch.add("hullDark", nz, PALETTE.hullBlack, 0.05);
    // glow disc deep in the throat + a wider soft disc near the mouth
    const disc = new THREE.CircleGeometry(e.r * 0.6, 40);
    disc.translate(e.x, e.y, z0 + len * 0.15);
    batch.add("engineGlow", disc, 0xffffff);
    const outer = new THREE.CircleGeometry(e.r * 0.9, 40);
    outer.translate(e.x, e.y, z0 + len * 0.7);
    batch.add("engineGlowOuter", outer, 0xffffff);
    // exhaust halo sprite just outside the nozzle
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6fb4ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.position.set(e.x, e.y, z0 + len + e.r * 0.4);
    sp.scale.setScalar(e.r * 3.2);
    group.add(sp);
    glows.push({ sprite: sp, base: e.r * 3.2 });
  }
  // machinery blocks around the engines on the stern face
  const z = HULL.sternZ;
  const w = halfWidth(z);
  for (const [x, y, zz, sx, sy, sz] of [
    [0, dorsalH(z) * 0.55, z + 8, w * 1.05, 16, 16],
    [0, -ventralH(z) * 0.6, z + 10, w * 0.9, 14, 20],
    [-w * 0.55, 20, z + 6, 60, 30, 12],
    [w * 0.55, 20, z + 6, 60, 30, 12],
  ]) {
    batch.box("cityDense", x, y, zz, sx, sy, sz, PALETTE.hullDark, 0.025);
  }
  batch.build(group, { name: "engines" });
  // blue point light behind the stern so the hull's rear catches the exhaust glow
  const light = new THREE.PointLight(0x6fb4ff, 2.5, 700, 1.0);
  light.position.set(0, 10, ENGINES.z1 + 80);
  group.add(light);
  return {
    group,
    light,
    update(t) {
      for (const g of glows) {
        const k = 1 + Math.sin(t * 7 + g.base) * 0.04 + Math.sin(t * 13.1 + g.base * 0.3) * 0.03;
        g.sprite.scale.setScalar(g.base * k);
      }
    },
  };
}
