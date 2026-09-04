// d1-intel — restricted intelligence room: heavy blast door, security vestibule with a second inner gate,
// very dark, red-only instruments, data columns and a central analysis table.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, partition, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-intel";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Intelligence (Restricted)",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [25.2, FLOOR, 497], yaw: -90 },
  apertures: [],
  views: {
    "d1-intel-vestibule": { pos: [24.8, FLOOR, 497], yaw: -90, pitch: -2 },
    "d1-intel-room": { pos: [28.6, FLOOR, 493.2], yaw: -130, pitch: -5 },
    "d1-intel-columns": { pos: [37, FLOOR, 502.5], yaw: 35, pitch: 2 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const cz = (B.min[2] + B.max[2]) / 2;
    const tone = { light: IMP.mid, mid: IMP.dark };
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 73, panelW: 2.0, strip: "emitRedImp", stripY: 1.9, tone, ceiling: { axis: "x", inset: 0.25, channels: [{ at: cz, w: 0.4, emit: "emitRedImp", emitW: 0.1 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // vestibule: inner partition 3 m in from the blast door with an offset 1.2 m gate (no straight sightline)
    const px = B.min[0] + 3.3;
    partition(kit, { axis: "z", at: px, from: B.min[2] + 0.3, to: B.max[2] - 0.3, floorY: FLOOR, ceilY, openings: [{ a0: cz + 1.0, a1: cz + 2.4, h: 2.2 }], seed: 77, strip: "emitRedImp", tone });
    // scanner posts either side of the gate
    for (const z of [cz + 0.7, cz + 2.7]) {
      kit.boxMM("paintedMetal", [px - 0.35, FLOOR, z - 0.12], [px - 0.1, FLOOR + 2.1, z + 0.12], { color: IMP.black, texel: 1 });
      kit.boxMM("emitRedImp", [px - 0.36, FLOOR + 0.4, z - 0.02], [px - 0.35, FLOOR + 2.0, z + 0.02]);
    }
    // data columns along the north and south walls: dark pillars with red text columns
    for (let x = px + 1.5; x < B.max[0] - 1.5; x += 2.2) {
      for (const [z0, z1] of [[B.min[2] + 0.3, B.min[2] + 1.0], [B.max[2] - 1.0, B.max[2] - 0.3]]) {
        kit.boxMM("paintedMetal", [x, FLOOR, z0], [x + 1.0, FLOOR + 3.0, z1], { color: IMP.black, texel: 1 });
        const zf = z0 === B.min[2] + 0.3 ? z1 : z0 - 0.01;
        kit.boxMM("screenImp1", [x + 0.1, FLOOR + 0.5, zf], [x + 0.9, FLOOR + 2.8, zf + 0.01], { uv: "keep" });
        kit.collider([x, FLOOR, z0], [x + 1.0, FLOOR + 3.0, z1], "column");
      }
    }
    // central analysis table with a low red holo and four standing pads
    const cx = (px + B.max[0]) / 2;
    kit.boxMM("paintedMetal", [cx - 1.6, FLOOR, cz - 0.9], [cx + 1.6, FLOOR + 0.9, cz + 0.9], { color: IMP.black, texel: 1 });
    kit.boxMM("emitRedImp", [cx - 1.62, FLOOR + 0.84, cz - 0.92], [cx + 1.62, FLOOR + 0.87, cz + 0.92]);
    kit.boxMM("darkGloss", [cx - 1.5, FLOOR + 0.9, cz - 0.8], [cx + 1.5, FLOOR + 0.94, cz + 0.8]);
    kit.add("holo", new THREE.PlaneGeometry(2.6, 1.3), { pos: [cx, FLOOR + 1.2, cz], rot: [-Math.PI / 2, 0, 0] });
    kit.collider([cx - 1.6, FLOOR, cz - 0.9], [cx + 1.6, FLOOR + 1.0, cz + 0.9], "table");
    // locked archive cabinets on the east wall
    for (let z = cz - 4; z <= cz + 4; z += 2) {
      kit.boxMM("paintedMetal", [B.max[0] - 1.1, FLOOR, z - 0.7], [B.max[0] - 0.3, FLOOR + 2.2, z + 0.7], { color: IMP.dark, texel: 1 });
      kit.boxMM("emitRedImp", [B.max[0] - 1.11, FLOOR + 1.5, z - 0.05], [B.max[0] - 1.1, FLOOR + 1.55, z + 0.05]);
      kit.collider([B.max[0] - 1.1, FLOOR, z - 0.7], [B.max[0] - 0.3, FLOOR + 2.2, z + 0.7], "cabinet");
    }
    ctx.lights.push({ type: "point", pos: [cx, FLOOR + 2.2, cz], color: LIGHT.red, intensity: 7, distance: 10, priority: 0.9 });
    ctx.lights.push({ type: "point", pos: [px - 1.5, FLOOR + 2.6, cz + 1.7], color: LIGHT.red, intensity: 3, distance: 7, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [B.min[0] + 1.6, FLOOR + 2.6, cz], color: LIGHT.red, intensity: 2.5, distance: 6, priority: 0.5 });
    return {};
  },
};
export default manifest;
