// d1-comms — communications + sensors: equipment rack rows with status LEDs, operator stations facing the
// signal wall, sensor-array control pedestals.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal } from "../shared/imperial.js";
import { consoleUnit, seat } from "../shared/props.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-comms";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Communications & Sensors",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-25.5, FLOOR, 499], yaw: 90 },
  apertures: [],
  views: {
    "d1-comms-racks": { pos: [-26, FLOOR, 499], yaw: 90, pitch: -3 },
    "d1-comms-ops": { pos: [-41, FLOOR, 492.5], yaw: -150, pitch: -4 },
    "d1-comms-signal-wall": { pos: [-30, FLOOR, 505.5], yaw: 60, pitch: 2 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const cx = (B.min[0] + B.max[0]) / 2;
    const cz = (B.min[2] + B.max[2]) / 2;
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 67, panelW: 2.4, strip: "emitBlue", ceiling: { axis: "x", inset: 0.25, channels: [{ at: cz - 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: cz + 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // rack rows along the north and south walls: tall cabinets with LED columns and amber/blue status
    const rack = (x, z, facing) => {
      kit.boxMM("paintedMetal", [x, FLOOR, z], [x + 1.2, FLOOR + 2.6, z + 0.9], { color: IMP.dark, texel: 1 });
      const zf = facing > 0 ? z + 0.9 : z; // face toward the room
      const f0 = facing > 0 ? zf : zf - 0.02;
      const f1 = facing > 0 ? zf + 0.02 : zf;
      kit.boxMM("darkGloss", [x + 0.08, FLOOR + 0.2, f0], [x + 1.12, FLOOR + 2.4, f1]);
      for (let k = 0; k < 6; k++) {
        const m = ["emitBlue", "emitAmber", "emitBlue", "emitGreen", "emitBlue", "emitRedImp"][k];
        kit.boxMM(m, [x + 0.15, FLOOR + 0.4 + k * 0.34, facing > 0 ? f1 : f0 - 0.01], [x + 0.95, FLOOR + 0.44 + k * 0.34, facing > 0 ? f1 + 0.01 : f0]);
      }
      kit.collider([x, FLOOR, z], [x + 1.2, FLOOR + 2.6, z + 0.9], "rack");
    };
    for (let x = B.min[0] + 1.0; x < B.max[0] - 2.4; x += 1.5) {
      rack(x, B.min[2] + 0.35, +1);
      rack(x, B.max[2] - 1.25, -1);
    }
    // operator stations in two arcs facing the signal wall (west)
    for (const dz of [-4.5, -1.5, 1.5, 4.5]) {
      consoleUnit(kit, B.min[0] + 6.5, FLOOR, cz + dz, { w: 2.2, facing: 1, screen: "screenImp" + ((Math.round(dz) + 8) % 4), seed: Math.round(dz) });
      seat(kit, B.min[0] + 7.6, FLOOR, cz + dz, 1);
    }
    // signal wall: one large display + two side columns
    const xw = B.min[0] + 0.3;
    kit.boxMM("darkGloss", [xw, FLOOR + 0.6, cz - 5], [xw + 0.12, FLOOR + 3.4, cz + 5]);
    kit.boxMM("screenImp2", [xw + 0.12, FLOOR + 0.7, cz - 4.9], [xw + 0.13, FLOOR + 3.3, cz + 4.9], { uv: "keep" });
    kit.collider([xw, FLOOR, cz - 5], [xw + 0.14, FLOOR + 3.4, cz + 5], "signal-wall");
    // sensor pedestals with rotating dish elements (animated in the detail pass)
    for (const x of [cx + 2, cx + 6]) {
      kit.add("paintedMetal", new THREE.CylinderGeometry(0.5, 0.6, 1.1, 10), { pos: [x, FLOOR + 0.55, cz], color: IMP.black, texel: 1 });
      kit.add("metal", new THREE.SphereGeometry(0.35, 14, 10), { pos: [x, FLOOR + 1.4, cz], color: IMP.steel, uv: "scale", uvScale: [2, 1] });
      kit.collider([x - 0.6, FLOOR, cz - 0.6], [x + 0.6, FLOOR + 1.8, cz + 0.6], "pedestal");
    }
    ctx.lights.push({ type: "point", pos: [B.min[0] + 3, FLOOR + 3.2, cz], color: LIGHT.blue, intensity: 12, distance: 12, priority: 0.8 });
    for (const [x, z] of [[cx - 4, cz - 4], [cx + 5, cz - 4], [cx - 4, cz + 4], [cx + 5, cz + 4]]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 15, distance: 13, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [cx, FLOOR + 1.0, B.min[2] + 1.6], color: LIGHT.amber, intensity: 2.5, distance: 7, priority: 0.3 });
    return {};
  },
};
export default manifest;
