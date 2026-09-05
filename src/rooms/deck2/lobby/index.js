// Deck 2 lift lobby: the hub where the spine corridor arms, the forward corridor and turbolift T2
// meet. The lift cabin volume (x −2..2, y 40..43.6, z 385..389) lies behind the aft wall and is D's;
// the lift hole (x −1.2..1.2) plus 1.5 m either side stays clear for D's lift door and call panel.
// Layout: four pillars frame the crossing under a recessed light coffer with housed fixtures; floor
// lanes run from the lift to each blast door; directory boards, screens, benches, cabinets, a fire
// point and a comms station dress the walls; the shell's service band (cable tray + pipes at 3.7 m)
// runs on the three door walls and is continued by hand on the aft wall outside the lift zone;
// perimeter conduits under the cornice continue the corridor ceiling runs. Door surrounds (keypad,
// sign, lintel indicator, threshold strip) come from the shell's doorDressing; the lift stays bare.
// Lighting: two shadow keys in yoked flood cans, both outboard of the pillar rows so the pillars stand
// inside their cones and throw across the deck — the hub key in the aft-port corner pointed forward
// between the two aft pillars at 50° off vertical (both throw long bands across the hub deck: the port
// one forward to the north wall, the starboard one to the east wall), and a pendant comms key in the
// starboard-aft corner pointed port along the aft wall at 40° (kiosk, console, stool and the wall
// screens throw sideways onto the deck and the panels) — the rig casts from whichever is nearer the
// camera; the coffer fills sit well under them, the lift-approach downlight breathes with its light,
// and the four directory boards refresh row by row (one animated mesh carries every moving emitter).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { WALL_T } from "../_shared/shell.js";
import { pillar, wallScreen, console as consoleProp } from "../_shared/props.js";
import { coffer, lightChannel, floorLane, hubRing, doorSign, directoryBoard, bench, firePoint, junctionBox, wallVent, wallConduits, cornerBlock, kickStrips, serviceRun, commsPedestal, dressedCabinet, yokedFlood, approachLamp } from "./props.js";
import { Emitters, boardChase, breath } from "./motion.js";

const Y = 40;
const CEIL = 46;
const BAND = 3.7; // service band height (tray bottom), above every screen/board, below vents + signs

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
    // west + comms framed so the bare T2 lift hole (D's door, undressed by contract) stays out of shot.
    // Camera poses also decide which key casts (see the lights block): west sits 0.8 m nearer the hub
    // key's side than it did, comms 1.6 m nearer the comms key's
    "d2-lobby-west": { pos: [3.2, Y, 375.0], yaw: 98, pitch: -1 },
    // north: up 5° with the hub ring in the foreground, 0.5 m port of the lane so both aft pillars
    // clear the frame (at x 2.6 the starboard one stood < 1 m off and filled the right fifth; at x −1.6
    // the port one still cut a slab off the left edge) — the port-aft pillar's shadow band enters
    // from the left edge and runs up the deck to the north wall
    "d2-lobby-north": { pos: [-0.5, Y, 381.8], yaw: -3, pitch: 5 },
    // comms: from 3.6 m starboard of the hub lane, up 6° so the pendant comms key hangs in frame
    // top-left (the corner had black ceiling with no fixture in frame) and the kiosk stays whole at
    // the right edge
    "d2-lobby-comms": { pos: [3.6, Y, 380.8], yaw: -146, pitch: 6 },
  },
  shell: {
    panelW: 2.0,
    // impGrey deck: the worn-plate map is itself dark (lum 0.42), and with the rig's environment
    // capture the deck reflects the real (dark) room instead of the studio map that used to carry it
    floor: { color: IMP.impGrey },
    ceiling: { channels: 0 },
    lights: false,
    doorDressing: { accent: "emitBlue" },
    serviceBand: { y: BAND, faces: ["n", "w", "e"] },
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
    const E = new Emitters(ctx.materials); // every animated emitter in the room, one mesh
    const motion = []; // update(t) closures
    const boards = [];

    // ---- crossing: pillars + coffer + perimeter channels -------------------------------------------
    const PX = 4.6;
    const PZ = [372.6, 379.4];
    for (const sx of [-1, 1]) for (const z of PZ) pillar(kit, PALETTE, [sx * PX, Y, z], 0.8, H, { emitTo: E }); // strips at 85 %: no hot centre line
    coffer(kit, PALETTE, [-PX - 0.4, PZ[0] - 0.4], [PX + 0.4, PZ[1] + 0.4], CEIL, { drop: 0.7, beam: 0.5, strips: 4, axis: "x" });
    // the hub key: a yoked flood can on the flat ceiling in the aft-port corner (inboard of the port
    // channel, forward of the aft-wall conduits), pointed forward at the deck just port of the aft
    // lane — the bisector of the two aft pillars as seen from the can, each 23° off the axis: 6.4 m
    // along for 5.5 m of drop, 50° off vertical
    const keyTarget = [-1.27, Y, 379.41];
    const keyAt = yokedFlood(kit, PALETTE, E, [-5.9, 0, 383.9], CEIL, keyTarget, { stem: 0.5 });
    // the comms key: a pendant can (1 m stem) between the starboard channel and the wall, pointed port
    // along the aft wall at the deck in front of the comms station — 4.2 m along for 5 m of drop, 40°
    // off vertical; hung low so the cluster's shadows run long on the deck and the light-grey panels
    // above the console sit 30° off its axis
    const commsTarget = [2.8, Y, 382.8];
    const commsAt = yokedFlood(kit, PALETTE, E, [6.95, 0, 383.5], CEIL, commsTarget, { stem: 1.0 });
    // perimeter channels: the aft one stops short of the side channels, which run on into the aft
    // corners (the comms view's top-left was black ceiling with no fixture in frame)
    lightChannel(kit, PALETTE, [-5.7, 0, 382.5], [5.7, 0, 382.5], CEIL);
    for (const sx of [-1, 1]) lightChannel(kit, PALETTE, [sx * 6.5, 0, z0 + 0.3], [sx * 6.5, 0, z1 - 0.3], CEIL);

    // ---- floor: lanes lift → north door and door → door (1 m, matching the corridor strips), hub
    //      ring; lanes stop 0.8 m short of the doors so the shell's threshold strips stay whole
    hubRing(kit, PALETTE, [0, Y, 376], 2.2, accent);
    floorLane(kit, PALETTE, [0, 0, z0 + 0.8], [0, 0, z1], Y, { accent });
    floorLane(kit, PALETTE, [x0 + 0.8, 0, 375], [-0.65, 0, 375], Y, { accent });
    floorLane(kit, PALETTE, [0.65, 0, 375], [x1 - 0.8, 0, 375], Y, { accent });
    doorSign(kit, PALETTE, [0, Y + 4.95, z0], 0, { accent });
    doorSign(kit, PALETTE, [x0, Y + 4.95, 375], Math.PI / 2, { accent });
    doorSign(kit, PALETTE, [x1, Y + 4.95, 375], -Math.PI / 2, { accent });

    // ---- upper band: aft-wall service runs outside the lift zone (shell band covers n/w/e), perimeter
    //      conduits under the cornice, corner blocks, kick strips
    const fs = F.s; // u = 8 − x
    serviceRun(kit, PALETTE, fs, WALL_T + 0.45, fs.u(3.0, z1), BAND);
    serviceRun(kit, PALETTE, fs, fs.u(-3.0, z1), fs.L - WALL_T - 0.45, BAND);
    const py = H - 0.5;
    for (const fk of ["n", "s", "w", "e"]) wallConduits(kit, PALETTE, F[fk], WALL_T + 0.45, F[fk].L - WALL_T - 0.45, py);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cornerBlock(kit, PALETTE, [sx * (x1 - 0.35), Y + py, sz > 0 ? z1 - 0.35 : z0 + 0.35], 0.8);
    kickStrips(kit, shell, ["n", "s", "w", "e"], "emitWhite");

    // ---- north wall: schematic screen + junction (port bay), directory board (starboard bay), vents --
    // (bays sit at x ±6.2 so they stay visible past the pillars from the lift approach; junction
    // conduits rise into the service band's tray)
    const yawN = 0;
    wallScreen(kit, [-6.2, Y + 2.85, z0 + 0.08], yawN, 1.8, 1.0, "screenImp0", { accent });
    junctionBox(kit, PALETTE, [-6.2, Y + 1.3, z0], yawN, { w: 0.6, h: 0.7, seed: 11, accent, conduitUp: BAND - 1.65 });
    boards.push(directoryBoard(kit, PALETTE, [6.2, Y + 2.3, z0], yawN, { w: 1.6, h: 1.3, rows: 6, accent, seed: 12, anim: E }));
    for (const x of [-6.2, 6.2]) wallVent(kit, PALETTE, [x, Y + 4.8, z0], yawN, { w: 1.2, h: 0.5 });

    // ---- port / starboard walls: board near the door, bench + screen (tactical port, list starboard),
    //      cabinet or junction, vents above the band
    for (const s of [-1, 1]) {
      const x = s < 0 ? x0 : x1;
      const yaw = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      junctionBox(kit, PALETTE, [x, Y + 1.35, 371.2], yaw, { w: 0.5, h: 0.7, seed: 13 + s, accent, conduitUp: BAND - 1.7 });
      wallVent(kit, PALETTE, [x, Y + 4.8, 371.4], yaw, { w: 0.9, h: 0.45 });
      boards.push(directoryBoard(kit, PALETTE, [x, Y + 2.2, 379.0], yaw, { w: 1.4, h: 1.2, rows: 5, accent, seed: 15 + s, anim: E }));
      bench(kit, PALETTE, [x, Y, 381.4], yaw, { len: 2.2, accent, items: { seed: 26 + s, screenMat: "screenImp2" } });
      wallScreen(kit, [x - s * 0.08, Y + 2.85, 381.4], yaw, 1.6, 0.9, s < 0 ? "screenImp1" : "screenImp2", { accent });
      wallVent(kit, PALETTE, [x, Y + 4.8, 381.4], yaw, { w: 1.2, h: 0.5 });
    }
    dressedCabinet(kit, PALETTE, [x0 + 0.26, Y, 383.85], Math.PI / 2, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: 17 });
    junctionBox(kit, PALETTE, [x1, Y + 1.4, 383.7], -Math.PI / 2, { w: 0.6, h: 0.8, seed: 18, accent, conduitUp: BAND - 1.8 });

    // ---- aft wall: fire point + cabinet (port); comms station (starboard): console with stool, wall
    //      readout board right above it, tilted list screen, pedestal terminal partner, cabinet
    const yawS = Math.PI;
    firePoint(kit, PALETTE, [-5.6, Y, z1], yawS);
    dressedCabinet(kit, PALETTE, [-3.8, Y, z1 - 0.25], yawS, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: 19 });
    consoleProp(kit, PALETTE, [4.6, Y, z1 - 0.45], yawS, { w: 1.6, d: 0.8, h: 1.15, screens: 1, screenMat: "screenImp1", seed: 20, stool: true });
    boards.push(directoryBoard(kit, PALETTE, [4.6, Y + 1.8, z1], yawS, { w: 1.4, h: 0.7, rows: 3, accent, seed: 23, anim: E }));
    wallScreen(kit, [4.6, Y + 2.75, z1 - 0.08], yawS, 1.6, 0.9, "screenImp0", { tilt: 0.2, accent });
    commsPedestal(kit, PALETTE, [3.1, Y, z1 - 0.35], yawS, { screenMat: "screenImp2", accent, seed: 24 });
    dressedCabinet(kit, PALETTE, [6.6, Y, z1 - 0.25], yawS, { w: 1.2, h: 1.8, d: 0.5, emit: accent, seed: 21 });
    for (const x of [-5.0, 5.6]) wallVent(kit, PALETTE, [x, Y + 4.8, z1], yawS, { w: 1.2, h: 0.5 });
    // lift indicator (as Deck 3): the corridor door-header marker — plate, accent cell, white bar at
    // 85 % in the emitter mesh — 0.7 m above the T2 hole, above any door frame and under the cornice
    // conduits; the void itself stays undressed for D's door, but the lift view no longer looks at a
    // black rectangle with nothing lit about it
    kit.box("paintedMetal", 0, Y + 3.7, z1 - 0.012, 0.7, 0.24, 0.02, { color: IMP.impDark });
    kit.box(accent, -0.2, Y + 3.7, z1 - 0.026, 0.16, 0.08, 0.008);
    E.box("emitWhite", 0.12, Y + 3.7, z1 - 0.026, 0.3, 0.05, 0.008, { level: 0.85 });

    // ---- lights (12): two shadow keys in yoked cans, each outboard of the pillar row it rakes. A key
    //      on the centreline (the coffer centre, straight down or tilted) had the pillars 38–40° off
    //      its axis at its cone edge, so they cast onto deck the key did not light and nothing read.
    //      Hub key, aft-port corner, pointed forward between the aft pillars (23° off axis each, cone
    //      0.85 / penumbra 0.4 → full to 29°): the port pillar's band runs forward along the port side
    //      of the hub to the north wall (lift, west and north views), the starboard one's to the east
    //      wall (lift view); the forward-port pillar is side-lit and puts a stripe on the north wall.
    //      Comms key, starboard-aft pendant, pointed port along the aft wall: kiosk, console, stool and
    //      the screens over the console throw port-ward — toward the comms camera's side of each prop
    //      — onto the deck and the panels (comms view). The rig casts from the shadow-flagged spot with
    //      the lowest distance / (0.5 + priority) from the camera: the hub key at priority 1 wins the
    //      lift (9.4 vs 13.7), west (9.1 vs 10.4) and north poses, the comms key at 0.5 the comms pose
    //      (6.3 vs 7.4). Levels: the hub key puts ~7 W/m² on the deck at the port pillar's foot and
    //      ~3 at 10 m against ~2 from the coffer fills (24 cd each: at 36 they filled the bands to a
    //      30 % contrast); the comms key ~6 on the deck at the console against < 1 of fill.
    const cool = 0xd6e2ff;
    ctx.lights.push({ type: "spot", pos: keyAt, target: keyTarget, color: cool, intensity: 500, distance: 22, angle: 0.85, penumbra: 0.4, priority: 1, shadow: true });
    ctx.lights.push({ type: "spot", pos: commsAt, target: commsTarget, color: cool, intensity: 240, distance: 16, angle: 0.6, penumbra: 0.45, priority: 0.5, shadow: true });
    for (const sx of [-1, 1]) for (const z of [374.3, 377.7]) ctx.lights.push({ type: "point", pos: [sx * 2.5, CEIL - 1.9, z], color: cool, intensity: 24, distance: 11, priority: 0.6 });
    // aft-port corner under the perimeter channel: the wall pool for the fire point / cabinet corner
    // (the hub key hangs over them pointing away). It lights the wall, not the deck — pushed to where
    // the deck read 20 % the light-grey panels behind them were at 55 % and clipping
    ctx.lights.push({ type: "point", pos: [-5.4, CEIL - 1.6, 382.5], color: cool, intensity: 30, distance: 9, priority: 0.4 });
    // starboard bench fill under the channel: the bench sits almost under the comms key, outside its
    // cone; 24 cd here is under a sixth of the key on the deck at the console, so its shadows keep
    ctx.lights.push({ type: "point", pos: [6.3, CEIL - 1.6, 381.2], color: cool, intensity: 24, distance: 9, priority: 0.4 });
    for (const sx of [-1, 1]) ctx.lights.push({ type: "point", pos: [sx * 6.4, Y + 3.8, 375], color: 0xa9c0ff, intensity: 17, distance: 7, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [0, Y + 3.8, 371.3], color: 0xa9c0ff, intensity: 17, distance: 7, priority: 0.4 });

    // ---- motion: lift-approach downlight over the lane 3 m before the lift wall, just inboard of the
    //      aft perimeter channel (its light 3 m off the wall: at 1.25 m / 30 cd the light-grey panel
    //      above the lift hole clipped white, at 1.65 m / 20 cd it still carried a 68 % hot patch; at
    //      3 m the panel gets a quarter of that and reads as a wash), breathing on a 4 s cycle (emitter
    //      + light together); the four directory boards refresh row by row, phased so no two are on
    //      the same row
    const lamp = approachLamp(kit, PALETTE, E, [0, 0, 381.85], CEIL, { accent });
    const lampDesc = { type: "point", pos: [0, CEIL - 1.6, 381.85], color: cool, intensity: 20, distance: 9, priority: 0.5 };
    ctx.lights.push(lampDesc);
    motion.push((t) => {
      const b = breath(t, 4);
      for (let i = 0; i < lamp.length; i++) E.level(lamp[i], 0.55 + 0.6 * b);
      lampDesc.intensity = 8 + 12 * b;
    });
    boards.forEach((rows, i) => motion.push(boardChase(E, rows, { phase: 0.35 + 0.83 * i })));
    E.build(ctx.group, `${room.id}-emitters`);
    return {
      update(dt, t) {
        for (let i = 0; i < motion.length; i++) motion[i](t);
        E.flush();
      },
    };
  },
});
