// Deck 3 lift lobby (engineering). Turbolift T3 on the aft wall; the cabin volume x −2..2,
// y 12..15.6, z 565..569 is D's, and the lift hole plus 1.5 m either side stays clear for D's door
// and call panel. The engineering corridor leaves through a blast door at x 6.5 on the same wall.
// Layout: four pillars under a recessed light coffer with housed fixtures, amber floor lanes lift →
// corridor door, a large deck directory flanked by two different screens on the forward wall under a
// heavy duct and the shell's service band, a maintenance work station on the port wall (parts
// cabinet, perpendicular console with stool, workbench with tool board and wall cabinet, labelled
// crate stack, amber floor border), bench + screen and directory on the starboard wall, coolant tanks
// in the forward corners, fire point, comms pedestal + tilted screen aft, engineering pipe mains
// along the port/starboard walls and hand-built service runs on the aft wall outside the lift zone.
// Door surrounds come from the shell's doorDressing; the lift hole stays bare.
// Lighting: warm shadow key in a yoked flood can in the aft-port corner, pointed forward past the
// port-aft pillar at 56° off vertical (the pillar throws a band across the hub deck to the forward
// wall, the work station's crate stack forward along the port wall), coffer fills under it, the
// breathing lift-approach downlight, the two directory boards refreshing row by row and an amber hazard
// beacon turning above the corridor blast door (light on a small circle + rotating drum) — one animated
// mesh plus the drum.
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";
import { WALL_T } from "../../deck2/_shared/shell.js";
import { pillar, wallScreen, duct, console as consoleProp, floorLine } from "../../deck2/_shared/props.js";
import { coffer, lightChannel, floorLane, hubRing, directoryBoard, bench, firePoint, junctionBox, wallVent, wallConduits, kickStrips, commsPedestal, serviceRun, workbench, toolBoard, wallCabinet, dressedCrate, dressedCabinet, statusPanel, engTank, yokedFlood, approachLamp } from "../../deck2/lobby/props.js";
import { Emitters, boardChase, breath, beacon } from "../../deck2/lobby/motion.js";

const Y = 12;
const CEIL = 17;
const BAND = 3.25; // service band height: above screens/boards (≤ 3.15), below the forward duct (3.875)

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
    "d3-lobby-cor-door": { pos: [8.6, Y, 557.0], yaw: 165, pitch: -1 },
    // forward: up 6° with the hub ring in the foreground, 0.8 m port of the lane so both aft pillars
    // clear the frame (at x 3.0 the starboard one stood < 1 m off and filled the right fifth; at x −2.0
    // the port one still cut a slab off the left edge) — the port-aft pillar's shadow band enters
    // from the left edge and runs up the deck to the forward wall
    "d3-lobby-forward": { pos: [-0.8, Y, 562.2], yaw: -5, pitch: 6 },
    "d3-lobby-west": { pos: [-3.0, Y, 557.2], yaw: 82, pitch: -3 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    stripMat: "emitAmber",
    // impGrey deck (was impMid, before that impDark): the worn-plate map is itself dark (lum 0.42),
    // and with the rig's environment capture the deck reflects the real room, not the studio map
    floor: { color: IMP.impGrey },
    ceiling: { channels: 0 },
    lights: false,
    doorDressing: { accent: "emitAmber" },
    serviceBand: { y: BAND, faces: ["n"] },
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
    const crateOpts = { bumperMat: "paintedMetal" }; // saves the rubber draw call in this 15-key room
    const E = new Emitters(ctx.materials); // every animated emitter in the room, one mesh
    const motion = []; // update(t) closures
    const boards = [];

    // ---- crossing: pillars + coffer + perimeter channels -------------------------------------------
    const PX = 5.2;
    const PZ = [552.6, 559.4];
    for (const sx of [-1, 1]) for (const z of PZ) pillar(kit, PALETTE, [sx * PX, Y, z], 0.8, H, { emitTo: E }); // strips at 85 %: no hot centre line
    // narrower coffer emitters than Deck 2 (0.10 m): under this lower ceiling the nearest strip sat
    // at the clipping limit from the forward view
    coffer(kit, PALETTE, [-PX - 0.4, PZ[0] - 0.4], [PX + 0.4, PZ[1] + 0.4], CEIL, { drop: 0.7, beam: 0.5, strips: 4, axis: "x", emitW: 0.1 });
    // the key: a yoked flood can on the flat ceiling in the aft-port corner (outboard of the port
    // channel, forward of the aft channel, inboard of the wall mains), pointed forward at the deck
    // just inboard of the port-aft pillar's foot — the pillar 8° off its axis, 5.6 m along for 4.5 m
    // of drop, 56° off vertical (a straight-down high-bay at the coffer centre had the pillars 45°
    // off its axis and nothing cast readably)
    const keyTarget = [-4.8, Y, 558.0];
    const keyAt = yokedFlood(kit, PALETTE, E, [-8.6, 0, 563.6], CEIL, keyTarget, { stem: 0.5 });
    lightChannel(kit, PALETTE, [x0 + 0.3, 0, 562.6], [x1 - 0.3, 0, 562.6], CEIL);
    for (const sx of [-1, 1]) lightChannel(kit, PALETTE, [sx * 7.8, 0, z0 + 1.2], [sx * 7.8, 0, 561.4], CEIL);

    // ---- floor: amber lanes lift → forward wall and lift → corridor door (stopping 0.8 m short of the
    //      door so the shell's threshold strip stays whole), hub ring
    hubRing(kit, PALETTE, [0, Y, 556], 2.4, accent);
    floorLane(kit, PALETTE, [0, 0, z0], [0, 0, z1], Y, { accent });
    floorLane(kit, PALETTE, [0.65, 0, 561.6], [6.5, 0, 561.6], Y, { accent });
    floorLane(kit, PALETTE, [6.5, 0, 562.21], [6.5, 0, z1 - 0.8], Y, { accent });

    // ---- ceiling services: duct along the forward wall over the shell band, heavy engineering mains
    //      (r 0.2 + 0.11) along the port/starboard walls elbowing into the wall at both ends, service
    //      runs on the aft wall port of the lift zone and between the blast door and the zone, kick strips
    const py = H - 0.9;
    duct(kit, PALETTE, [x0 + 0.1, Y + py, z0 + 0.6], [x1 - 0.1, Y + py, z0 + 0.6], 0.7, 0.45);
    const mains = { runs: [{ r: 0.2, n: 0.6, y: 3.65 }, { r: 0.11, n: 0.5, y: 4.1 }], ends: "wall" };
    wallConduits(kit, PALETTE, F.w, WALL_T + 0.9, F.w.L - WALL_T - 0.9, 3.65, mains);
    wallConduits(kit, PALETTE, F.e, WALL_T + 0.9, F.e.L - WALL_T - 0.9, 3.65, mains);
    const fs = F.s; // u = 10 − x
    serviceRun(kit, PALETTE, fs, fs.u(-2.9, z1), fs.L - WALL_T - 0.45, BAND);
    serviceRun(kit, PALETTE, fs, fs.u(4.15, z1), fs.u(2.9, z1), BAND);
    kickStrips(kit, shell, ["n", "s", "w", "e"], accent);

    // ---- forward wall: big directory board, tactical + list screens under the band, junctions whose
    //      conduits rise into the tray, coolant tanks in the corners
    const yawN = 0;
    boards.push(directoryBoard(kit, PALETTE, [0, Y + 2.35, z0], yawN, { w: 2.4, h: 1.4, rows: 7, accent, seed: 31, anim: E }));
    for (const sx of [-1, 1]) {
      wallScreen(kit, [sx * 3.8, Y + 2.6, z0 + 0.08], yawN, 1.6, 0.9, sx < 0 ? "screenImp1" : "screenImp2", { accent });
      junctionBox(kit, PALETTE, [sx * 6.3, Y + 1.4, z0], yawN, { w: 0.6, h: 0.8, seed: 32 + sx, accent, conduitUp: BAND - 1.8 });
      engTank(kit, PALETTE, [sx * 8.3, Y, 550.7], sx < 0 ? 0.5 : -0.5, { r: 0.8, h: 3.0, color: IMP.impMid, bands: 3, emit: accent, seed: 50 + sx });
    }

    // ---- port wall: maintenance work station --------------------------------------------------------
    const yawW = Math.PI / 2;
    dressedCabinet(kit, PALETTE, [x0 + 0.26, Y, 552.6], yawW, { w: 1.2, h: 1.8, d: 0.5, color: IMP.impGrey, emit: accent, seed: 36 });
    wallScreen(kit, [x0 + 0.08, Y + 2.7, 552.6], yawW, 1.4, 0.8, "screenImp3", { accent });
    consoleProp(kit, PALETTE, [x0 + 1.4, Y, 553.3], 0, { w: 1.6, d: 0.8, h: 1.15, screens: 1, screenMat: "screenImp3", seed: 46, stool: true });
    workbench(kit, PALETTE, [x0, Y, 555.0], yawW, { len: 2.4, depth: 0.8, accent, seed: 47 });
    toolBoard(kit, PALETTE, [x0, Y + 1.85, 554.7], yawW, { w: 1.6, h: 0.8, seed: 48, accent });
    wallCabinet(kit, PALETTE, [x0, Y + 1.75, 556.0], yawW, { w: 0.7, h: 0.7, d: 0.3, color: IMP.impGrey, accent, seed: 49 });
    dressedCrate(kit, PALETTE, [x0 + 0.36, Y, 557.4], yawW, { w: 1.2, h: 1.2, d: 0.7, seed: 37, ...crateOpts });
    dressedCrate(kit, PALETTE, [x0 + 0.36, Y, 558.7], yawW, { w: 1.2, h: 1.2, d: 0.7, seed: 38, ...crateOpts });
    dressedCrate(kit, PALETTE, [x0 + 0.31, Y + 1.2, 557.5], yawW, { w: 1.0, h: 0.8, d: 0.6, seed: 39, ...crateOpts });
    // amber work-area border on the deck around the station
    floorLine(kit, [x0 + 2.7, Y, 552.0], [x0 + 2.7, Y, 556.7], 0.08, accent);
    floorLine(kit, [x0, Y, 552.0], [x0 + 2.7, Y, 552.0], 0.08, accent);
    floorLine(kit, [x0, Y, 556.7], [x0 + 2.7, Y, 556.7], 0.08, accent);
    junctionBox(kit, PALETTE, [x0, Y + 1.35, 561.0], yawW, { w: 0.4, h: 0.55, seed: 45, accent, conduitUp: H - 0.05 - 1.625 });
    firePoint(kit, PALETTE, [x0, Y, 562.6], yawW);

    // ---- starboard wall: cabinet, bench + schematic screen, junction with conduits, directory board --
    const yawE = -Math.PI / 2;
    dressedCabinet(kit, PALETTE, [x1 - 0.26, Y, 552.9], yawE, { w: 1.2, h: 1.8, d: 0.5, color: IMP.impGrey, emit: accent, seed: 40 });
    bench(kit, PALETTE, [x1, Y, 555.0], yawE, { len: 2.2, accent, items: { seed: 53, screenMat: "screenImp2" } });
    wallScreen(kit, [x1 - 0.08, Y + 2.85, 555.0], yawE, 1.6, 0.9, "screenImp2", { accent });
    wallCabinet(kit, PALETTE, [x1, Y + 1.55, 558.6], yawE, { w: 0.9, h: 0.9, d: 0.3, color: IMP.impGrey, accent, seed: 41 });
    statusPanel(kit, PALETTE, [x1, Y + 2.55, 558.6], yawE, { accent });
    boards.push(directoryBoard(kit, PALETTE, [x1, Y + 2.2, 561.8], yawE, { w: 1.4, h: 1.2, rows: 5, accent, seed: 42, anim: E }));

    // ---- aft wall (port of the lift): comms pedestal + tilted gauge screen, cabinet, vent over the band
    const yawS = Math.PI;
    commsPedestal(kit, PALETTE, [-4.4, Y, z1 - 0.3], yawS, { screenMat: "screenImp3", accent, seed: 43 });
    wallScreen(kit, [-4.4, Y + 2.6, z1 - 0.08], yawS, 1.6, 0.9, "screenImp3", { tilt: 0.2, accent });
    dressedCabinet(kit, PALETTE, [-7.4, Y, z1 - 0.26], yawS, { w: 1.2, h: 1.8, d: 0.5, color: IMP.impMid, emit: accent, seed: 44 });
    wallVent(kit, PALETTE, [-7.4, Y + 4.3, z1], yawS, { w: 1.0, h: 0.45 });
    // lift indicator: the corridor door-header marker (plate, amber cell, white bar at 85 % in the
    // emitter mesh) 0.8 m above the T3 hole — the void itself stays undressed for D's door, and the
    // plate sits above any door frame and under the cornice conduits
    kit.box("paintedMetal", 0, Y + 3.7, z1 - 0.012, 0.7, 0.24, 0.02, { color: IMP.impDark });
    kit.box(accent, -0.2, Y + 3.7, z1 - 0.026, 0.16, 0.08, 0.008);
    E.box("emitWhite", 0.12, Y + 3.7, z1 - 0.026, 0.3, 0.05, 0.008, { level: 0.85 });

    // ---- lights (13): warm shadow key in the aft-port can, pointed forward past the port-aft pillar
    //      (cone 0.85 / penumbra 0.4 → full to 29°; the pillar 8° off axis, the crate stack 37°, the
    //      lift and forward cameras 18° — the far starboard pillar at 15 m gets too little to band).
    //      The pillar's band runs forward-inboard across the hub deck to the forward wall (lift and
    //      forward views), the crates' shadows forward along the port wall toward the workbench (west
    //      view). Coffer fills 1.7 m under the ceiling at 26 cd (at 40 they filled the band to a 40 %
    //      contrast; the key puts ~5 W/m² on the deck at the pillar's foot against ~2.5 of fill);
    //      breathing lift-approach downlight; door glow, forward wall, work station, one low deck fill,
    //      an aft-port wall pool, a starboard-channel fill; the beacon's orbiting light.
    const warm = 0xffd8b0;
    ctx.lights.push({ type: "spot", pos: keyAt, target: keyTarget, color: warm, intensity: 500, distance: 20, angle: 0.85, penumbra: 0.4, priority: 1, shadow: true });
    for (const sx of [-1, 1]) for (const z of [554.4, 557.6]) ctx.lights.push({ type: "point", pos: [sx * 2.8, CEIL - 1.7, z], color: warm, intensity: 26, distance: 11, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [6.5, Y + 3.6, 563.2], color: 0xffc890, intensity: 36, distance: 8, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [0, Y + 3.4, 551.8], color: warm, intensity: 26, distance: 8, priority: 0.4 }); // 2.5 m off the forward wall: closer it drew a specular disc on the panel
    ctx.lights.push({ type: "point", pos: [x0 + 1.6, Y + 2.9, 555.0], color: 0xffc890, intensity: 18, distance: 6, priority: 0.4 });
    // low deck fill inside the amber work-area border, low enough to miss the screens' mirror
    // direction; 12 cd (was 24: it is the light that would fill the crates' shadows on that deck)
    ctx.lights.push({ type: "point", pos: [x0 + 2.0, Y + 1.6, 554.8], color: 0xffd8b0, intensity: 12, distance: 8, priority: 0.4 });
    // aft-port wall pool under the channel for the comms pedestal / cabinet / fire-point corner: the
    // key hangs over them pointing away (this replaces the low fill under the port channel over the
    // open deck, which the key now carries)
    ctx.lights.push({ type: "point", pos: [-6.0, CEIL - 1.6, 562.9], color: 0xffd8b0, intensity: 24, distance: 8, priority: 0.4 });
    // starboard channel fill over the deck between the bench and the corridor door: outside the key's
    // cone and 6 m from the nearest coffer fill, that deck sat at 10 % grey in the corridor-door view
    ctx.lights.push({ type: "point", pos: [7.8, CEIL - 1.5, 559.6], color: warm, intensity: 40, distance: 9, priority: 0.5 });

    // ---- motion: lift-approach downlight over the lane 1.5 m before the lift wall (its light 1.65 m
    //      off the wall: at 1.25 m / 30 cd the panel above the lift hole went near-white), breathing
    //      on a 4 s cycle (emitter + light together); the boards refresh row by row, phased apart;
    //      amber hazard beacon on a bracket above the corridor blast door's lintel indicator, turning
    //      at 38 rpm
    const lamp = approachLamp(kit, PALETTE, E, [0, 0, 563.3], CEIL, { accent });
    const lampDesc = { type: "point", pos: [0, CEIL - 1.5, 563.2], color: warm, intensity: 20, distance: 9, priority: 0.5 };
    ctx.lights.push(lampDesc);
    motion.push((t) => {
      const b = breath(t, 4);
      for (let i = 0; i < lamp.length; i++) E.level(lamp[i], 0.55 + 0.6 * b);
      lampDesc.intensity = 8 + 12 * b;
    });
    boards.forEach((rows, i) => motion.push(boardChase(E, rows, { phase: 0.6 + 1.1 * i })));
    motion.push(beacon(ctx, kit, PALETTE, [6.5, Y + 4.7, z1 - 0.35], { mat: "emitAmber", color: 0xffa028, facing: Math.PI, mount: "wall", back: 0.35, distance: 8 }).update);
    E.build(ctx.group, `${room.id}-emitters`);
    return {
      update(dt, t) {
        for (let i = 0; i < motion.length; i++) motion[i](t);
        E.flush();
      },
    };
  },
});
