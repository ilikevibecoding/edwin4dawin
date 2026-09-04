// Deck 2 lift lobby: the hub where the spine corridor arms, the forward corridor and turbolift T2
// meet. The lift cabin volume (x −2..2, y 40..43.6, z 385..389) lies behind the aft wall and is D's;
// the lift hole (x −1.2..1.2) plus 1.5 m either side stays clear for D's lift door and call panel.
// Layout: four pillars frame the crossing under a recessed light coffer; gloss floor lanes run from
// the lift to each blast door; directory boards, screens, benches, cabinets, a fire point and a
// comms console dress the walls; perimeter conduits continue the corridor ceiling runs.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { WALL_T } from "../_shared/shell.js";
import { pillar, wallScreen, cabinet, console as consoleProp } from "../_shared/props.js";
import { coffer, lightChannel, floorLane, hubRing, doorSign, directoryBoard, bench, firePoint, junctionBox, wallVent, doorDressing, wallConduits, cornerBlock, kickStrips } from "./props.js";

const Y = 40;
const CEIL = 46;

export default defineRoom({
  id: "d2-lobby",
  name: "Deck 2 Lift Lobby",
  deck: 2,
  x: [-8, 8],
  z: [370, 385],
  ceil: CEIL,
  lift: { id: "T2", pos: [0, Y, 385], dir: [0, 0, -1] },
  openings: [{ face: "s", a0: -1.2, a1: 1.2, y0: Y, y1: Y + 3.0, kind: "lift", id: "T2-door" }],
  spawn: { pos: [0, Y, 377], yaw: 180 },
  views: {
    "d2-lobby-lift": { pos: [0.8, Y, 372.4], yaw: 176, pitch: -2 },
    "d2-lobby-west": { pos: [5.5, Y, 376.5], yaw: 100, pitch: -1 },
    "d2-lobby-north": { pos: [0.6, Y, 383.6], yaw: 3, pitch: 2 },
    "d2-lobby-comms": { pos: [0.5, Y, 379.5], yaw: -139, pitch: -2 },
  },
  shell: {
    panelW: 2.0,
    floor: { color: IMP.impMid },
    ceiling: { channels: 0 },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const F = shell.faces;
    const H = CEIL - Y;
    const accent = "emitBlue";
    const x0 = -8 + WALL_T; // interior faces
    const x1 = 8 - WALL_T;
    const z0 = 370 + WALL_T;
    const z1 = 385 - WALL_T;

    // ---- crossing: pillars + coffer + perimeter channels -------------------------------------------
    const PX = 4.6;
    const PZ = [372.6, 379.4];
    for (const sx of [-1, 1]) for (const z of PZ) pillar(kit, PALETTE, [sx * PX, Y, z], 0.8, H);
    coffer(kit, PALETTE, [-PX - 0.4, PZ[0] - 0.4], [PX + 0.4, PZ[1] + 0.4], CEIL, { drop: 0.7, beam: 0.5, strips: 4, axis: "x" });
    lightChannel(kit, PALETTE, [x0 + 0.3, 0, 382.5], [x1 - 0.3, 0, 382.5], CEIL);
    for (const sx of [-1, 1]) lightChannel(kit, PALETTE, [sx * 6.5, 0, z0 + 0.3], [sx * 6.5, 0, 381.4], CEIL);

    // ---- floor: lanes lift → north door and door → door (1 m, matching the corridor strips), hub ring,
    //      hazard strips + status panels at the three blast doors
    hubRing(kit, PALETTE, [0, Y, 376], 2.2, accent);
    floorLane(kit, PALETTE, [0, 0, z0], [0, 0, z1], Y, { accent });
    floorLane(kit, PALETTE, [x0, 0, 375], [-0.65, 0, 375], Y, { accent });
    floorLane(kit, PALETTE, [0.65, 0, 375], [x1, 0, 375], Y, { accent });
    doorDressing(kit, PALETTE, shell, Y, { accent, avoid: [0, 385] });
    doorSign(kit, PALETTE, [0, Y + 4.95, z0], 0, { accent });
    doorSign(kit, PALETTE, [x0, Y + 4.95, 375], Math.PI / 2, { accent });
    doorSign(kit, PALETTE, [x1, Y + 4.95, 375], -Math.PI / 2, { accent });

    // ---- perimeter conduits under the cornice (continuing the corridor ceiling runs), kick strips ----
    const py = H - 0.5;
    for (const fk of ["n", "s", "w", "e"]) wallConduits(kit, PALETTE, F[fk], WALL_T + 0.45, F[fk].L - WALL_T - 0.45, py);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cornerBlock(kit, PALETTE, [sx * (x1 - 0.35), Y + py, sz > 0 ? z1 - 0.35 : z0 + 0.35], 0.8);
    kickStrips(kit, shell, ["n", "s", "w", "e"], "emitWhite");

    // ---- north wall: screen + junction (port bay), directory board (starboard bay), vents ----------
    // (bays sit at x ±6.2 so they stay visible past the pillars from the lift approach)
    const yawN = 0;
    wallScreen(kit, [-6.2, Y + 2.9, z0 + 0.08], yawN, 1.8, 1.0, "screenImp0");
    junctionBox(kit, PALETTE, [-6.2, Y + 1.3, z0], yawN, { w: 0.6, h: 0.7, seed: 11, accent });
    directoryBoard(kit, PALETTE, [6.2, Y + 2.3, z0], yawN, { w: 1.6, h: 1.3, rows: 6, accent, seed: 12 });
    for (const x of [-6.2, 6.2]) wallVent(kit, PALETTE, [x, Y + 4.3, z0], yawN, { w: 1.2, h: 0.5 });

    // ---- port / starboard walls: board near the door, bench + screen, cabinet or vent, junction -----
    for (const s of [-1, 1]) {
      const x = s < 0 ? x0 : x1;
      const yaw = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      junctionBox(kit, PALETTE, [x, Y + 1.35, 371.2], yaw, { w: 0.5, h: 0.7, seed: 13 + s, accent, conduitUp: py - 1.7 });
      wallVent(kit, PALETTE, [x, Y + 3.3, 371.4], yaw, { w: 0.9, h: 0.45 });
      directoryBoard(kit, PALETTE, [x, Y + 2.2, 378.7], yaw, { w: 1.4, h: 1.2, rows: 5, accent, seed: 15 + s });
      bench(kit, PALETTE, [x, Y, 381.4], yaw, { len: 2.2, accent });
      wallScreen(kit, [x - s * 0.08, Y + 2.85, 381.4], yaw, 1.6, 0.9, "screenImp0");
      wallVent(kit, PALETTE, [x, Y + 4.3, 381.4], yaw, { w: 1.2, h: 0.5 });
      wallVent(kit, PALETTE, [x, Y + 4.3, 375.0], yaw, { w: 1.2, h: 0.5 });
    }
    cabinet(kit, PALETTE, [x0 + 0.26, Y, 383.85], Math.PI / 2, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: 17 });
    junctionBox(kit, PALETTE, [x1, Y + 1.4, 383.7], -Math.PI / 2, { w: 0.6, h: 0.8, seed: 18, accent, conduitUp: py - 1.8 });

    // ---- aft wall: fire point + cabinet (port), comms console + screen + cabinet (starboard) ---------
    const yawS = Math.PI;
    firePoint(kit, PALETTE, [-5.6, Y, z1], yawS);
    cabinet(kit, PALETTE, [-3.8, Y, z1 - 0.25], yawS, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: 19 });
    consoleProp(kit, PALETTE, [4.6, Y, z1 - 0.45], yawS, { w: 1.4, d: 0.8, h: 1.15, screens: 1, screenMat: "screenImp0", seed: 20 });
    wallScreen(kit, [4.6, Y + 2.6, z1 - 0.08], yawS, 1.6, 0.9, "screenImp0");
    cabinet(kit, PALETTE, [6.6, Y, z1 - 0.25], yawS, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: 21 });
    for (const x of [-5.0, 5.0]) wallVent(kit, PALETTE, [x, Y + 4.3, z1], yawS, { w: 1.2, h: 0.5 });

    // ---- lights: coffer fills, lift approach, door glows -----------------------------------------
    const cool = 0xd6e2ff;
    for (const sx of [-1, 1]) for (const z of [374.3, 377.7]) ctx.lights.push({ type: "point", pos: [sx * 2.5, CEIL - 0.7, z], color: cool, intensity: 22, distance: 11, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.8, 382.4], color: cool, intensity: 18, distance: 10, priority: 0.5 });
    for (const sx of [-1, 1]) ctx.lights.push({ type: "point", pos: [sx * 6.4, Y + 3.8, 375], color: 0xa9c0ff, intensity: 12, distance: 7, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [0, Y + 3.8, 371.3], color: 0xa9c0ff, intensity: 12, distance: 7, priority: 0.4 });
    return {};
  },
});
