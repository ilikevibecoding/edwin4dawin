// Deck 2 spine corridor, port arm (x −62..−8). Greybox uses the local shell with ribs; switches to
// D's corridorSegment (src/systems/corridor/corridor.js) when it lands.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-cor-w",
  name: "Deck 2 Corridor — Port",
  deck: 2,
  x: [-62, -8],
  z: [372.5, 377.5],
  ceil: 44.4,
  spawn: { pos: [-11, Y, 375], yaw: 90 },
  views: {
    "d2-cor-w-lobby-end": { pos: [-10.5, Y, 375], yaw: 90, pitch: 0 },
    "d2-cor-w-mid": { pos: [-36, Y, 374.2], yaw: 82, pitch: -1 },
    "d2-cor-w-medbay-door": { pos: [-47, Y, 376.6], yaw: 12, pitch: 2 },
  },
  shell: {
    panelW: 2.0,
    ribs: 4,
    floor: { color: IMP.impMid, strip: { axis: "x", width: 1.0 } },
    ceiling: { channels: 0 },
    lights: { count: 6, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    // single centre light channel along the arm
    const { kit } = ctx;
    const z = 375;
    for (let x = -61; x < -9; x += 4) {
      kit.boxMM("paintedMetal", [x, room.ceilY - 0.14, z - 0.35], [x + 3.2, room.ceilY - 0.02, z + 0.35], { color: IMP.impBlack });
      kit.boxMM("emitWhite", [x + 0.2, room.ceilY - 0.13, z - 0.12], [x + 3.0, room.ceilY - 0.11, z + 0.12]);
    }
    return {};
  },
});
