// Deck 3 hyperdrive room: a 28 m high hall around the horizontal hyperdrive motivator — a long
// cylinder on cradles with coil banks either side, service gantries, and heavy power trunks.
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";
import { rail } from "../../deck2/_shared/shell.js";

const Y = 12;

export default defineRoom({
  id: "d3-hyperdrive",
  name: "Hyperdrive Room",
  deck: 3,
  x: [-30, 30],
  z: [690, 752],
  ceil: 40,
  spawn: { pos: [0, Y, 693], yaw: 180 },
  views: {
    "d3-hyperdrive-door": { pos: [0, Y, 693], yaw: 180, pitch: 8 },
    "d3-hyperdrive-side": { pos: [-27.5, Y, 720], yaw: -90, pitch: 10 },
    "d3-hyperdrive-aft": { pos: [12, Y, 748.5], yaw: 22, pitch: 12 },
  },
  shell: {
    panelW: 3.0,
    rows: [0, 0.4, 2.05, 2.27, 5, 9, 14, 20, 27.45, 28],
    wallColor: IMP.impMid,
    wallAlt: IMP.impDark,
    stripMat: "emitAmber",
    floor: { color: IMP.impDark },
    ceiling: { channels: 6, axis: "z", color: IMP.impBlack, panelW: 4 },
    lights: { count: 6, color: 0xffc890, intensity: 70, distance: 26, y: Y + 12 },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    // motivator: 9 m diameter cylinder along z on two cradles, raised so its axis sits at y 20
    const cz0 = 698;
    const cz1 = 746;
    const axisY = Y + 8;
    const R = 4.5;
    kit.cyl("paintedMetal", 0, axisY, (cz0 + cz1) / 2, R, cz1 - cz0, "z", { color: IMP.impDark, segments: 40, texel: 0.4 });
    for (let z = cz0 + 4; z < cz1 - 2; z += 6) {
      kit.cyl("paintedMetal", 0, axisY, z, R + 0.35, 0.8, "z", { color: IMP.impMid, segments: 40 });
      kit.cyl("emitBlue", 0, axisY, z + 1.2, R + 0.05, 0.25, "z", { segments: 40 });
    }
    for (const z of [cz0 + 8, (cz0 + cz1) / 2, cz1 - 8]) {
      kit.boxMM("paintedMetal", [-6, Y, z - 1.5], [6, axisY - R + 0.6, z + 1.5], { color: IMP.impBlack, texel: 0.5 });
      kit.collider([-6, Y, z - 1.5], [6, Y + 3, z + 1.5], "cradle");
    }
    kit.collider([-R, Y, cz0], [R, Y + 3, cz1], "motivator");
    // coil banks along both walls
    for (const s of [-1, 1]) {
      for (let z = 696; z < 748; z += 8) {
        kit.boxMM("paintedMetal", [s * 22 - 3, Y, z], [s * 22 + 3, Y + 9, z + 5], { color: IMP.impDark, texel: 0.5 });
        kit.boxMM("emitAmber", [s * 22 - 2.6, Y + 1, s > 0 ? z - 0.02 : z + 5], [s * 22 + 2.6, Y + 8, s > 0 ? z : z + 5.02]);
        kit.collider([s * 22 - 3, Y, z], [s * 22 + 3, Y + 9, z + 5], "coil");
      }
    }
    // walkway rails either side of the motivator
    rail(kit, PALETTE, [-8, Y, 694], [-8, Y, 750], Y);
    rail(kit, PALETTE, [8, Y, 694], [8, Y, 750], Y);
    ctx.lights.push({ type: "point", pos: [0, axisY + 7, 722], color: 0x6a9bff, intensity: 120, distance: 40, priority: 0.7 });
    return {};
  },
});
