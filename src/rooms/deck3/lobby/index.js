// Deck 3 lift lobby (engineering). Turbolift T3 on the aft wall; the cabin volume x −2..2,
// y 12..15.6, z 565..569 is D's, and the lift hole plus 1.5 m either side stays clear for D's door
// and call panel. The engineering corridor leaves through a blast door at x 6.5 on the same wall.
// Layout: four pillars under a recessed light coffer, amber floor lanes lift → corridor door, a
// large deck directory on the forward wall, benches + screens port/starboard, crate staging, fire
// point, comms pedestal, a heavy duct along the forward wall and engineering pipe mains along the
// port/starboard walls (the corridor's heavy-pipe language carried into the hub).
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";
import { WALL_T } from "../../deck2/_shared/shell.js";
import { pillar, wallScreen, cabinet, crate, duct, tank } from "../../deck2/_shared/props.js";
import { coffer, lightChannel, floorLane, hubRing, directoryBoard, bench, firePoint, junctionBox, wallVent, doorDressing, wallConduits, kickStrips, commsPedestal } from "../../deck2/lobby/props.js";

const Y = 12;
const CEIL = 17;

export default defineRoom({
  id: "d3-lobby",
  name: "Deck 3 Lift Lobby",
  deck: 3,
  x: [-10, 10],
  z: [549, 565],
  ceil: CEIL,
  lift: { id: "T3", pos: [0, Y, 565], dir: [0, 0, -1] },
  openings: [{ face: "s", a0: -1.2, a1: 1.2, y0: Y, y1: Y + 3.0, kind: "lift", id: "T3-door" }],
  spawn: { pos: [0, Y, 556], yaw: 180 },
  views: {
    "d3-lobby-lift": { pos: [0.8, Y, 551.4], yaw: 176, pitch: -2 },
    "d3-lobby-cor-door": { pos: [7.4, Y, 555.2], yaw: 175, pitch: -1 },
    "d3-lobby-forward": { pos: [2, Y, 563], yaw: 10, pitch: 0 },
    "d3-lobby-west": { pos: [3, Y, 558], yaw: 81, pitch: -1 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    stripMat: "emitAmber",
    floor: { color: IMP.impDark },
    ceiling: { channels: 0 },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const F = shell.faces;
    const H = CEIL - Y;
    const accent = "emitAmber";
    const x0 = -10 + WALL_T;
    const x1 = 10 - WALL_T;
    const z0 = 549 + WALL_T;
    const z1 = 565 - WALL_T;

    // ---- crossing: pillars + coffer + perimeter channels -------------------------------------------
    const PX = 5.2;
    const PZ = [552.6, 559.4];
    for (const sx of [-1, 1]) for (const z of PZ) pillar(kit, PALETTE, [sx * PX, Y, z], 0.8, H);
    coffer(kit, PALETTE, [-PX - 0.4, PZ[0] - 0.4], [PX + 0.4, PZ[1] + 0.4], CEIL, { drop: 0.7, beam: 0.5, strips: 4, axis: "x" });
    lightChannel(kit, PALETTE, [x0 + 0.3, 0, 562.6], [x1 - 0.3, 0, 562.6], CEIL);
    for (const sx of [-1, 1]) lightChannel(kit, PALETTE, [sx * 7.8, 0, z0 + 1.2], [sx * 7.8, 0, 561.4], CEIL);

    // ---- floor: amber lanes lift → forward wall and lift → corridor door, hub ring, hazard, panel -----
    hubRing(kit, PALETTE, [0, Y, 556], 2.4, accent);
    floorLane(kit, PALETTE, [0, 0, z0], [0, 0, z1], Y, { accent });
    floorLane(kit, PALETTE, [0.65, 0, 561.6], [6.5, 0, 561.6], Y, { accent });
    floorLane(kit, PALETTE, [6.5, 0, 562.21], [6.5, 0, z1], Y, { accent });
    doorDressing(kit, PALETTE, shell, Y, { accent, avoid: [0, 565] });

    // ---- ceiling services: duct along the forward wall, heavy engineering mains (r 0.2 + 0.11) along
    //      the port/starboard walls elbowing back into the wall at both ends, a thin conduit pair on
    //      the aft wall port of the blast door, kick strips. Junction-box conduits rise to the ceiling.
    const py = H - 0.9;
    const upTo = (top) => H - 0.05 - top;
    duct(kit, PALETTE, [x0 + 0.1, Y + py, z0 + 0.6], [x1 - 0.1, Y + py, z0 + 0.6], 0.7, 0.45);
    const mains = { runs: [{ r: 0.2, n: 0.6, y: 3.65 }, { r: 0.11, n: 0.5, y: 4.1 }], ends: "wall" };
    wallConduits(kit, PALETTE, F.w, WALL_T + 0.9, F.w.L - WALL_T - 0.9, 3.65, mains);
    wallConduits(kit, PALETTE, F.e, WALL_T + 0.9, F.e.L - WALL_T - 0.9, 3.65, mains);
    wallConduits(kit, PALETTE, F.s, F.s.u(-2.8, 0), F.s.L - WALL_T - 1.2, py, { ends: "wall" }); // port of the lift's 1.5 m clear zone
    kickStrips(kit, shell, ["n", "s", "w", "e"], accent);

    // ---- forward wall: big directory board, screens, junctions with conduits, coolant tanks in the corners
    const yawN = 0;
    directoryBoard(kit, PALETTE, [0, Y + 2.35, z0], yawN, { w: 2.4, h: 1.4, rows: 7, accent, seed: 31 });
    for (const sx of [-1, 1]) {
      wallScreen(kit, [sx * 3.8, Y + 2.85, z0 + 0.08], yawN, 1.6, 0.9, "screenImp0");
      junctionBox(kit, PALETTE, [sx * 6.3, Y + 1.4, z0], yawN, { w: 0.6, h: 0.8, seed: 32 + sx, accent, conduitUp: upTo(1.8) });
      tank(kit, PALETTE, [sx * 8.3, Y, 550.7], 0, { r: 0.8, h: 3.0, color: IMP.impMid, bands: 3, emit: accent });
    }

    // ---- port wall: cabinet, bench + screen, crate staging, fire point -----------------------------
    const yawW = Math.PI / 2;
    cabinet(kit, PALETTE, [x0 + 0.26, Y, 552.9], yawW, { w: 1.2, h: 1.8, d: 0.5, color: IMP.impGrey, emit: accent, seed: 36 });
    bench(kit, PALETTE, [x0, Y, 555.0], yawW, { len: 2.2, accent });
    wallScreen(kit, [x0 + 0.08, Y + 2.85, 555.0], yawW, 1.6, 0.9, "screenImp0");
    crate(kit, PALETTE, [x0 + 0.36, Y, 558.4], yawW, { w: 1.2, h: 1.2, d: 0.7, seed: 37 });
    crate(kit, PALETTE, [x0 + 0.36, Y, 559.7], yawW, { w: 1.2, h: 1.2, d: 0.7, seed: 38 });
    crate(kit, PALETTE, [x0 + 0.31, Y + 1.2, 558.5], yawW, { w: 1.0, h: 0.8, d: 0.6, seed: 39 });
    firePoint(kit, PALETTE, [x0, Y, 562.6], yawW);
    junctionBox(kit, PALETTE, [x0, Y + 1.35, 561.0], yawW, { w: 0.4, h: 0.55, seed: 45, accent, conduitUp: upTo(1.625) });

    // ---- starboard wall: cabinet, bench + screen, junction with conduits, directory board by the door
    const yawE = -Math.PI / 2;
    cabinet(kit, PALETTE, [x1 - 0.26, Y, 552.9], yawE, { w: 1.2, h: 1.8, d: 0.5, color: IMP.impGrey, emit: accent, seed: 40 });
    bench(kit, PALETTE, [x1, Y, 555.0], yawE, { len: 2.2, accent });
    wallScreen(kit, [x1 - 0.08, Y + 2.85, 555.0], yawE, 1.6, 0.9, "screenImp0");
    junctionBox(kit, PALETTE, [x1, Y + 1.4, 558.6], yawE, { w: 0.5, h: 0.7, seed: 41, accent, conduitUp: upTo(1.75) });
    directoryBoard(kit, PALETTE, [x1, Y + 2.2, 561.8], yawE, { w: 1.4, h: 1.2, rows: 5, accent, seed: 42 });

    // ---- aft wall (port of the lift): comms pedestal + screen, cabinet, vents -----------------------
    const yawS = Math.PI;
    commsPedestal(kit, PALETTE, [-4.4, Y, z1 - 0.3], yawS, { screenMat: "screenImp0", accent, seed: 43 });
    wallScreen(kit, [-4.4, Y + 2.85, z1 - 0.08], yawS, 1.6, 0.9, "screenImp0");
    cabinet(kit, PALETTE, [-7.4, Y, z1 - 0.26], yawS, { w: 1.2, h: 1.8, d: 0.5, color: IMP.impMid, emit: accent, seed: 44 });
    wallVent(kit, PALETTE, [-7.4, Y + 3.5, z1], yawS, { w: 1.0, h: 0.45 });

    // ---- lights: warm coffer fills, lift approach, door glow, forward wall ------------------------
    const warm = 0xffd8b0;
    for (const sx of [-1, 1]) for (const z of [554.4, 557.6]) ctx.lights.push({ type: "point", pos: [sx * 2.8, CEIL - 0.7, z], color: warm, intensity: 26, distance: 11, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.8, 562.4], color: warm, intensity: 22, distance: 10, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [6.5, Y + 3.6, 563.2], color: 0xffc890, intensity: 12, distance: 7, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [0, Y + 3.8, 550.6], color: warm, intensity: 14, distance: 8, priority: 0.4 });
    return {};
  },
});
