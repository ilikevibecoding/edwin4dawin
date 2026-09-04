// d1-nav — secondary navigation: central holo star-chart table, chart wall of blue displays, plotting stations.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal } from "../shared/imperial.js";
import { consoleUnit, seat } from "../shared/props.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-nav";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Navigation",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-25.5, FLOOR, 477], yaw: 90 },
  apertures: [],
  views: {
    "d1-nav-table": { pos: [-26, FLOOR, 477], yaw: 90, pitch: -5 },
    "d1-nav-chart": { pos: [-34, FLOOR, 481], yaw: 0, pitch: 3 },
    "d1-nav-corner": { pos: [-42.5, FLOOR, 470], yaw: -140, pitch: -4 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const cx = (B.min[0] + B.max[0]) / 2;
    const cz = (B.min[2] + B.max[2]) / 2;
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 61, panelW: 2.4, strip: "emitBlue", ceiling: { axis: "z", inset: 0.25, channels: [{ at: cx - 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: cx + 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // central star-chart table: octagonal plinth, blue rim, holo volume above
    kit.add("paintedMetal", new THREE.CylinderGeometry(2.2, 2.4, 0.95, 8), { pos: [cx, FLOOR + 0.475, cz], color: IMP.black, texel: 1 });
    kit.add("emitBlue", new THREE.CylinderGeometry(2.25, 2.25, 0.05, 8), { pos: [cx, FLOOR + 0.9, cz] });
    kit.add("darkGloss", new THREE.CylinderGeometry(2.1, 2.1, 0.04, 8), { pos: [cx, FLOOR + 0.97, cz] });
    kit.add("holo", new THREE.SphereGeometry(1.4, 24, 16), { pos: [cx, FLOOR + 2.4, cz] });
    kit.add("holo", new THREE.CylinderGeometry(0.02, 1.2, 1.5, 16, 1, true), { pos: [cx, FLOOR + 1.75, cz] });
    kit.collider([cx - 2.4, FLOOR, cz - 2.4], [cx + 2.4, FLOOR + 1.0, cz + 2.4], "chart-table");

    // chart wall (north): a band of tall blue displays with a dark frame
    const zn = B.min[2] + 0.3;
    for (let x = B.min[0] + 1.2; x < B.max[0] - 2.6; x += 2.6) {
      kit.boxMM("darkGloss", [x, FLOOR + 0.9, zn], [x + 2.3, FLOOR + 3.3, zn + 0.1]);
      kit.boxMM("screenImp" + (Math.abs(Math.round(x)) % 4), [x + 0.1, FLOOR + 1.0, zn + 0.1], [x + 2.2, FLOOR + 3.2, zn + 0.11], { uv: "keep" });
      kit.collider([x, FLOOR, zn], [x + 2.3, FLOOR + 3.3, zn + 0.12], "chart-wall");
    }
    // plotting stations: two rows facing the chart wall
    for (const z of [cz + 4.5, cz + 7.5]) {
      for (let x = B.min[0] + 3; x < B.max[0] - 3; x += 4.2) {
        consoleUnit(kit, x, FLOOR, z, { w: 2.4, facing: 0, screen: "screenImp" + (Math.abs(Math.round(x + z)) % 4), seed: Math.round(x) });
        seat(kit, x, FLOOR, z + 1.05, 0);
      }
    }
    ctx.lights.push({ type: "point", pos: [cx, FLOOR + 3.0, cz], color: LIGHT.blue, intensity: 12, distance: 12, priority: 0.9 });
    for (const [x, z] of [[cx - 6, cz - 5], [cx + 6, cz - 5], [cx - 6, cz + 6], [cx + 6, cz + 6]]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 15, distance: 13, priority: 0.4 });
    let t = 0;
    return {
      update(dt) {
        t += dt;
      },
    };
  },
};
export default manifest;
