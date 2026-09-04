// d1-tactical — tactical / holo planning room: large rectangular holo table with a projected fleet layout,
// standing positions on a raised tier, wall of tactical displays, briefing seating.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, railing, doorReveal } from "../shared/imperial.js";
import { consoleUnit, seat } from "../bridge/stations.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-tactical";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Tactical Planning",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [25.5, FLOOR, 477], yaw: -90 },
  apertures: [],
  views: {
    "d1-tactical-table": { pos: [26, FLOOR, 477], yaw: -90, pitch: -6 },
    "d1-tactical-screens": { pos: [31, FLOOR, 477], yaw: -90, pitch: 2 },
    "d1-tactical-overview": { pos: [42.5, FLOOR, 470], yaw: 140, pitch: -5 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const cx = (B.min[0] + B.max[0]) / 2;
    const cz = (B.min[2] + B.max[2]) / 2;
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 71, panelW: 2.4, strip: "emitBlue", ceiling: { axis: "z", inset: 0.25, channels: [{ at: cx - 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: cx + 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // holo table 5.0 × 3.0 with a projected fleet layout (translucent wedges + grid plane)
    const tw = 5.0;
    const td = 3.0;
    kit.boxMM("paintedMetal", [cx - tw / 2, FLOOR, cz - td / 2], [cx + tw / 2, FLOOR + 0.92, cz + td / 2], { color: IMP.black, texel: 1 });
    kit.boxMM("emitBlue", [cx - tw / 2 - 0.03, FLOOR + 0.86, cz - td / 2 - 0.03], [cx + tw / 2 + 0.03, FLOOR + 0.9, cz + td / 2 + 0.03]);
    kit.boxMM("darkGloss", [cx - tw / 2 + 0.1, FLOOR + 0.92, cz - td / 2 + 0.1], [cx + tw / 2 - 0.1, FLOOR + 0.96, cz + td / 2 - 0.1]);
    kit.add("holo", new THREE.PlaneGeometry(tw - 0.6, td - 0.6), { pos: [cx, FLOOR + 1.15, cz], rot: [-Math.PI / 2, 0, 0] });
    for (let i = 0; i < 7; i++) {
      const px = cx - 1.8 + (i % 4) * 1.1;
      const pz = cz - 0.6 + Math.floor(i / 4) * 1.2;
      kit.add("holo", new THREE.ConeGeometry(0.18, 0.7, 4), { pos: [px, FLOOR + 1.6, pz], rot: [Math.PI / 2, 0, 0] });
    }
    kit.collider([cx - tw / 2, FLOOR, cz - td / 2], [cx + tw / 2, FLOOR + 1.0, cz + td / 2], "holo-table");

    // raised tier along the east side with a rail, standing positions and a lectern console
    const tx0 = B.max[0] - 0.3 - 4.0;
    kit.boxMM("impFloor", [tx0, FLOOR, B.min[2] + 0.3], [B.max[0] - 0.3, FLOOR + 0.3, B.max[2] - 0.3], { color: IMP.dark, texel: 0.5 });
    kit.collider([tx0 - 0.05, FLOOR, B.min[2] + 0.3], [B.max[0] - 0.3, FLOOR + 0.3, B.max[2] - 0.3], "tier");
    railing(kit, [tx0, B.min[2] + 0.6], [tx0, cz - 1.6], FLOOR + 0.3);
    railing(kit, [tx0, cz + 1.6], [tx0, B.max[2] - 0.6], FLOOR + 0.3);
    consoleUnit(kit, tx0 + 2.0, FLOOR + 0.3, cz, { w: 1.4, facing: 1, screen: "screenImp1", seed: 3 });
    // tactical display wall on the east wall
    const xe = B.max[0] - 0.3;
    for (let z = B.min[2] + 1.5; z < B.max[2] - 3.5; z += 3.4) {
      kit.boxMM("darkGloss", [xe - 0.1, FLOOR + 1.3, z], [xe, FLOOR + 3.4, z + 3.0]);
      kit.boxMM("screenImp" + (Math.round(z) % 4), [xe - 0.11, FLOOR + 1.4, z + 0.1], [xe - 0.1, FLOOR + 3.3, z + 2.9], { uv: "keep" });
    }
    // briefing seating: three rows of seats facing the table from the west
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 6; k++) seat(kit, B.min[0] + 3.5 + r * 1.3, FLOOR, cz - 3.75 + k * 1.5, 3);
      kit.collider([B.min[0] + 3.2 + r * 1.3, FLOOR, cz - 4.1], [B.min[0] + 3.8 + r * 1.3, FLOOR + 1.1, cz + 4.1], "seats");
    }
    ctx.lights.push({ type: "point", pos: [cx, FLOOR + 2.6, cz], color: LIGHT.blue, intensity: 10, distance: 10, priority: 0.9 });
    for (const [x, z] of [[cx - 6, cz - 5], [cx + 6, cz - 5], [cx - 6, cz + 5], [cx + 6, cz + 5]]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 15, distance: 13, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [xe - 1.5, FLOOR + 2.4, cz], color: LIGHT.amber, intensity: 5, distance: 8, priority: 0.3 });
    return {};
  },
};
export default manifest;
