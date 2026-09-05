// Deck 3 engineering control: a two-level control room whose aft wall is a wide window onto the
// reactor chamber. Three arcs of consoles face the window, a command console with a holo schematic
// sits at the centre, a mezzanine runs along the west and forward walls under a wall of status
// screens, and power-distribution cabinets feed cable trays and heavy conduit trunks that converge on
// a header above the window. Amber + orange, thick pipes, big machinery (§11).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../../../kit.js";
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP, col } from "../../deck2/_shared/palette.js";
import { rail } from "../../deck2/_shared/shell.js";
import { placer, console as consoleProp, indicatorField, wallScreen, pipe, duct, pillar, stairs, holoTable, floorLine, cabinet, hazardStrip } from "../../deck2/_shared/props.js";
import { arcLine, arcPos, powerCabinet, openPowerCabinet, cableTray, toolRack, junctionBox, ventGrille, yawBox, conduitBundle, ceilingFixture, topScreens, labelCrate, palletStack, wallLamp } from "./engprops.js";
import { animKey, faceKey, MODE, buildAnimatedEmitters, anim } from "./anim.js";

const Y = 12;
const CEIL = 22;
const X0 = -30 + 0.3;
const X1 = 4 - 0.3;
const Z0 = 572 + 0.3;
const Z1 = 612.5 - 0.3;
const MEZZ = Y + 4; // mezzanine deck top
const D2R = Math.PI / 180;
const DECK = 0x7a7e86; // walkable deck tint (see shell.floor)

// Window onto the reactor, shared plane z 612.5 with d3-reactor (which cuts the same hole).
export const REACTOR_WINDOW = { a0: -26, a1: -2, y0: Y + 1.2, y1: Y + 5.5 };

// Console arcs are centred on x −12 at the aft wall plane (window x −26..−2). The east ends of the two
// outer arcs are left open so a 2.8 m aisle (x −0.4..2.4) runs from the command post to the reactor
// door at x 1 (hole x −0.2..2.2).
const CX = -12;
const CZ = 612.5;
const ARCS = [
  { r: 8, phis: [-49.4, -25, 25, 49.4] },
  { r: 12, phis: [-65.3, -49.1, -32.9, -16.7, 16.7, 32.9, 49.1] },
  { r: 16, phis: [-49.1, -36.9, -24.7, -12.5, 12.5, 24.7, 36.9] },
];

export default defineRoom({
  id: "d3-engctl",
  name: "Engineering Control",
  deck: 3,
  x: [-30, 4],
  z: [572, 612.5],
  ceil: CEIL,
  openings: [{ face: "s", ...REACTOR_WINDOW, glass: true, id: "engctl-reactor-window" }],
  spawn: { pos: [2, Y, 590], yaw: 90 },
  views: {
    "d3-engctl-door": { pos: [-3.3, Y, 591.8], yaw: 108, pitch: 4 },
    "d3-engctl-window": { pos: [-12, Y, 599.2], yaw: 180, pitch: 6 },
    "d3-engctl-status": { pos: [-9, Y, 596], yaw: 62, pitch: 10 },
    "d3-engctl-mezz": { pos: [-27.4, MEZZ, 577.2], yaw: -138, pitch: -9 },
    "d3-engctl-aft-door": { pos: [1, Y, 602.5], yaw: 172, pitch: 6 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    stripMat: "emitAmber",
    // 0x7a7e86 (policy C, and the self-lit rig): the deck map is charcoal (0.13 albedo, 9 % metal), so
    // the tint sets the diffuse term — impMid reflected ~1 % and read 10 % grey under the fixtures even
    // after the fills were doubled; two steps lighter it sits at 20–30 % in the pools
    floor: { mat: "impFloor", color: DECK },
    ceiling: { channels: 5, axis: "x", color: IMP.impDark, stripMat: "emitAmber" },
    lights: false,
    doorDressing: { accent: "emitAmber" },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const P = (k) => col(PALETTE, k);
    const black = P("impBlack");
    const dark = P("impDark");
    const mid = P("impMid");
    const steel = P("steel");
    let seed = 100;
    // Animated emitters (one extra mesh, see anim.js): two header gauge needles swing (SWING), one red
    // gauge blinks (BLINK), the alert lamp over the window slow-blinks (BLINK); the kit's static emitWhite
    // and emitOrange pieces are folded into the same mesh so the room stays at 16 calls with the holo.
    // Screen content flicker is a per-room clone of the three screen materials (no extra calls), jittered
    // on staggered phases in update().
    const WHITE = new THREE.Color("#dfe9ff");
    const screenMats = ["screenImp0", "screenImp1", "screenImp3"].map((k) => (ctx.materials[k] = ctx.materials[k].clone()));
    // housed fixture faces: steady, diffuser gradient (centre 0.92 → 86 %, edges 30 %), tinted per lamp
    const FACE = faceKey(0.92);

    // ---- console arcs facing the window --------------------------------------------------------
    // (a console = shared prop + two small angled desk screens + a dressed service back)
    const station = (pos, yaw, w, screens, mat, topMats) => {
      consoleProp(kit, PALETTE, pos, yaw, { w, screens, seed: seed++, screenMat: mat });
      topScreens(kit, pos, yaw, w, topMats);
      consoleBack(kit, PALETTE, pos, yaw, w, seed++);
    };
    const SCREENS = ["screenImp1", "screenImp3", "screenImp0"];
    ARCS.forEach((arc, ai) => {
      for (const [ci, deg] of arc.phis.entries()) {
        const phi = deg * D2R;
        const [x, z] = arcPos(CX, CZ, arc.r, phi);
        station([x, Y, z], Math.PI - phi, 3, 3, SCREENS[(ai + ci) % 3], ci % 2 ? ["screenImp0", "screenImp3"] : ["screenImp3", "screenImp1"]);
      }
      // orange marking arcs on the screen side of each row, broken at the central aisle; each end
      // runs 8° past its last console (the east ends stop short of the door aisle)
      const rr = arc.r - 0.75;
      const gap = Math.asin(2.1 / rr);
      arcLine(kit, CX, Y, CZ, rr, (arc.phis[0] - 8) * D2R, -gap);
      arcLine(kit, CX, Y, CZ, rr, gap, (arc.phis[arc.phis.length - 1] + 8) * D2R);
    });
    // central aisle edges + landing bars
    floorLine(kit, [CX - 2.1, Y, 596.5], [CX - 2.1, Y, 610.4], 0.12, "emitOrange");
    floorLine(kit, [CX + 2.1, Y, 596.5], [CX + 2.1, Y, 610.4], 0.12, "emitOrange");

    // ---- command console + holo table ----------------------------------------------------------
    const holo = holoTable(ctx, [CX, Y, 592], { r: 1.2, h: 0.95, holoH: 1.4 });
    holo.cone.visible = false; // the projection is the schematic itself, not a cone
    station([CX, Y, 589.5], Math.PI, 3, 3, "screenImp1", ["screenImp0", "screenImp3"]);
    station([CX - 4.1, Y, 590.7], Math.PI + 0.45, 2.4, 2, "screenImp3", ["screenImp0"]);
    station([CX + 4.1, Y, 590.7], Math.PI - 0.45, 2.4, 2, "screenImp0", ["screenImp3"]);
    arcLine(kit, CX, Y, 592, 2.6, -Math.PI * 0.62, Math.PI * 0.62, { mat: "emitOrange", w: 0.1 });
    // reactor schematic hologram: the column as a core rod with stacked containment rings, four
    // coolant spines, strut ring, top collar and callout tags (one merged `holo` mesh, rotated in update)
    const geos = [];
    const push = (g, pos, rot = [0, 0, 0]) => {
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
      geos.push(g.index ? g.toNonIndexed() : g);
    };
    push(new THREE.CylinderGeometry(0.14, 0.14, 1.5, 16, 1, true), [0, 0.78, 0]);
    for (let i = 0; i < 7; i++) {
      const y = 0.12 + i * 0.22;
      push(new THREE.TorusGeometry(i % 2 ? 0.34 : 0.4, 0.018, 6, 32), [0, y, 0], [Math.PI / 2, 0, 0]);
      push(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16, 1, true), [0, y + 0.11, 0]);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      push(new THREE.BoxGeometry(0.035, 1.5, 0.035), [Math.cos(a) * 0.48, 0.78, Math.sin(a) * 0.48]);
      push(new THREE.BoxGeometry(0.02, 0.02, 0.9), [Math.cos(a) * 0.5, 0.95, Math.sin(a) * 0.5], [0, -a + Math.PI / 2, 0]);
    }
    push(new THREE.TorusGeometry(0.46, 0.03, 8, 32), [0, 1.56, 0], [Math.PI / 2, 0, 0]);
    push(new THREE.TorusGeometry(0.72, 0.008, 4, 40), [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    push(new THREE.TorusGeometry(0.62, 0.006, 4, 40), [0, 0.02, 0], [Math.PI / 2, 0, 0]);
    for (const [a, y] of [[0.4, 0.5], [2.4, 1.1], [4.2, 0.85]]) {
      push(new THREE.BoxGeometry(0.28, 0.12, 0.004), [Math.cos(a) * 0.86, y, Math.sin(a) * 0.86], [0, -a + Math.PI / 2, 0]);
      push(new THREE.BoxGeometry(0.3, 0.004, 0.004), [Math.cos(a) * 0.62, y, Math.sin(a) * 0.62], [0, -a, 0]);
    }
    // the table's own grid ring joins the schematic mesh (one holo call instead of two); the schematic
    // uses the table's per-instance holo material so its opacity can pulse without touching other tables
    push(new THREE.TorusGeometry(1.2 * 0.55, 0.02, 6, 48), [0, 0.36, 0], [Math.PI / 2, 0, 0]);
    ctx.group.remove(holo.cone, holo.grid);
    const holoMat = holo.material;
    // front faces only: the shared holo material is double-sided and additive, so through the open core
    // rod and ring cylinders every pixel summed front + back (and both coincide at a cylinder's
    // silhouette) — the ring edges stacked to 94 % even at opacity 0.27; front-sided the same stack
    // peaks ~80 % and the rod still reads as a rod (its near half covers the silhouette)
    holoMat.side = THREE.FrontSide;
    const schematic = new THREE.Mesh(mergeGeometries(geos, false), holoMat);
    schematic.position.set(CX, Y + 0.95 + 0.14, 592);
    ctx.group.add(schematic);

    // ---- continuous sill console under the window (x −26.6..−3.4, four 5.8 m sections) ----------------
    for (const x of [-23.7, -17.9, -12.1, -6.3]) sillConsole(kit, PALETTE, [x, Y, 611.72], Math.PI, { w: 5.8, seed: seed++ });
    // reactor door (hole x −0.2..2.2): status panel on the strip of wall between window and door
    {
      const F = placer(kit, [-1.6, 0, Z1], Math.PI);
      F.box("paintedMetal", 0, Y + 1.5, 0.05, 0.6, 0.9, 0.06, { color: black });
      indicatorField(F, 0, Y + 1.6, 0.09, 0.5, 0.5, seed++);
      F.box("emitAmber", 0, Y + 1.15, 0.085, 0.36, 0.06, 0.01);
    }
    // window mullions + header manifold the ceiling trunks feed into
    for (const x of [-20, -14, -8]) kit.box("paintedMetal", x, (REACTOR_WINDOW.y0 + REACTOR_WINDOW.y1) / 2, Z1 - 0.1, 0.16, REACTOR_WINDOW.y1 - REACTOR_WINDOW.y0 - 0.06, 0.16, { color: dark });
    // header runs past the door to the east wall so the strip left of the door is dressed too
    kit.boxMM("paintedMetal", [-27, Y + 6.2, Z1 - 0.95], [3.5, Y + 9.4, Z1 - 0.05], { color: dark, texel: 4 });
    kit.boxMM("impPanel", [-26.9, Y + 6.188, Z1 - 0.93], [3.4, Y + 6.2, Z1 - 0.07], { color: dark, uv: "keep" }); // clean soffit plate
    kit.boxMM("paintedMetal", [-27.1, Y + 6.2, Z1 - 1.0], [3.6, Y + 6.5, Z1 - 0.05], { color: black });
    kit.boxMM("paintedMetal", [-27.1, Y + 9.1, Z1 - 1.0], [3.6, Y + 9.4, Z1 - 0.05], { color: black });
    kit.boxMM("emitAmber", [-26.5, Y + 6.55, Z1 - 0.96], [3.0, Y + 6.62, Z1 - 0.9]);
    kit.boxMM("emitAmber", [-26.5, Y + 8.98, Z1 - 0.96], [3.0, Y + 9.05, Z1 - 0.9]);
    // 13 lit gauges (amber dial faces with a needle, every fourth red) alternating with vent slats,
    // each bay faced with a clean painted plate (the worn-metal map speckles at this size). Live dials:
    // gauge 4's red face blinks (0.6 Hz), gauges 5 and 7 carry white emissive needles that swing about
    // their hubs on different phases (the mesh rotates in the vertex shader)
    const SWING = { 5: 0.0, 7: 0.37 };
    for (let i = 0; i < 13; i++) {
      const x = -25.5 + i * 2.15;
      kit.boxMM("impPanel", [x - 0.78, Y + 6.7, Z1 - 0.962], [x + 0.62, Y + 8.9, Z1 - 0.95], { color: dark, uv: "keep" });
      kit.cyl("paintedMetal", x, Y + 7.8, Z1 - 0.97, 0.36, 0.06, "z", { segments: 20, color: black });
      if (i === 4) kit.cyl(animKey(MODE.BLINK, { phase: 0.2, base: 1.5, rate: 1 / 1.6, aux: [0.5, 0, 0] }), x, Y + 7.8, Z1 - 1.005, 0.28, 0.02, "z", { segments: 20, color: IMP.impRed });
      else kit.cyl(i % 4 === 0 ? "emitRedImp" : "emitAmber", x, Y + 7.8, Z1 - 1.005, 0.28, 0.02, "z", { segments: 20 });
      const na = -0.9 + ((i * 7) % 5) * 0.45;
      if (i in SWING) {
        const swing = animKey(MODE.SWING, { phase: SWING[i], base: 1.3, rate: 0.3, aux: [x, Y + 7.8, Z1 - 1.02] });
        kit.box(swing, x + Math.sin(na) * 0.11, Y + 7.8 + Math.cos(na) * 0.11, Z1 - 1.02, 0.03, 0.24, 0.01, { color: WHITE, rot: [0, 0, -na] });
      } else kit.box("paintedMetal", x + Math.sin(na) * 0.11, Y + 7.8 + Math.cos(na) * 0.11, Z1 - 1.02, 0.03, 0.24, 0.01, { color: black, rot: [0, 0, -na] });
      kit.cyl("paintedMetal", x, Y + 7.8, Z1 - 1.02, 0.04, 0.02, "z", { segments: 8, color: black });
      if (i < 12) {
        kit.box("paintedMetal", x + 1.07, Y + 7.8, Z1 - 0.98, 0.5, 1.6, 0.06, { color: black });
        for (let j = 0; j < 8; j++) kit.box("paintedMetal", x + 1.07, Y + 7.1 + j * 0.2, Z1 - 1.02, 0.4, 0.04, 0.02, { color: mid });
      }
    }
    // amber alert lamp over the window centre (on the centre mullion, between the window head and the
    // header): black housing with a hood, amber lens slow-blinking at 2.4 s; its point light blinks with it
    const ALERT = { rate: 1 / 2.4, phase: 0.58, duty: 0.45 };
    {
      const F = placer(kit, [-14, Y + 5.85, Z1 - 0.1], Math.PI);
      F.box("paintedMetal", 0, 0, 0.16, 0.62, 0.36, 0.32, { color: black, texel: 2.5 });
      F.box("paintedMetal", 0, 0.2, 0.22, 0.7, 0.04, 0.46, { color: dark });
      F.box("paintedMetal", 0, -0.15, 0.06, 0.3, 0.06, 0.12, { color: dark });
      F.box(animKey(MODE.BLINK, { phase: ALERT.phase, base: 1.5, rate: ALERT.rate, aux: [ALERT.duty, 0, 0] }), 0, 0.02, 0.325, 0.44, 0.2, 0.02, { color: IMP.impAmber });
      for (const s of [-1, 1]) F.box("paintedMetal", s * 0.28, 0.02, 0.33, 0.04, 0.26, 0.04, { color: black });
    }
    // strip between the reactor door and the east wall (x 2.2..3.7): vent + junction box under the header
    ventGrille(kit, PALETTE, [2.95, Y + 4.9, Z1], Math.PI, { w: 1.0, h: 0.8 });
    junctionBox(kit, PALETTE, [2.95, Y + 3.7, Z1], Math.PI, { seed: seed++, w: 0.5, h: 0.5 });
    // hooded door-approach lamp over the reactor door (between the lintel indicator and the header):
    // the aft-door view's floor in front of the door, and the door face itself
    wallLamp(kit, PALETTE, [1, Y + 4.9, Z1], Math.PI, { w: 1.1, tilt: 0.9, face: 0.7 });

    // ---- mezzanine along the west and forward walls ---------------------------------------------
    const MW = -26.7; // west deck inner edge
    const MZ = 575.3; // forward deck inner edge
    const WEST_END = 605;
    const FWD_END = -14;
    kit.boxMM("impFloor", [X0, MEZZ - 0.3, Z0], [MW, MEZZ, WEST_END], { color: DECK, texel: 0.5 });
    kit.boxMM("impFloor", [MW, MEZZ - 0.3, Z0], [FWD_END, MEZZ, MZ], { color: DECK, texel: 0.5 });
    // edge trims, toe plates, support beams and pillars
    kit.boxMM("paintedMetal", [MW - 0.3, MEZZ - 0.7, MZ], [MW, MEZZ - 0.3, WEST_END], { color: black, texel: 1 });
    kit.boxMM("paintedMetal", [X0, MEZZ - 0.7, MZ - 0.3], [FWD_END, MEZZ - 0.3, MZ], { color: black, texel: 1 });
    kit.boxMM("paintedMetal", [X0, MEZZ - 0.7, WEST_END - 0.3], [MW, MEZZ - 0.3, WEST_END], { color: black, texel: 1 });
    kit.boxMM("paintedMetal", [MW - 0.02, MEZZ, MZ], [MW + 0.06, MEZZ + 0.12, WEST_END], { color: black });
    kit.boxMM("paintedMetal", [X0, MEZZ, MZ - 0.02], [FWD_END, MEZZ + 0.12, MZ + 0.06], { color: black });
    kit.boxMM("emitAmber", [MW - 0.01, MEZZ - 0.45, MZ + 0.3], [MW + 0.0, MEZZ - 0.4, WEST_END - 0.3]);
    kit.boxMM("emitAmber", [X0 + 0.3, MEZZ - 0.45, MZ - 0.01], [FWD_END - 0.3, MEZZ - 0.4, MZ]);
    for (const z of [578.5, 584.5, 590.5, 596.5, 601.5, WEST_END - 0.25]) pillar(kit, PALETTE, [MW - 0.25, Y, z], 0.5, MEZZ - 0.7 - Y, { strip: true });
    for (const x of [MW - 0.25, -22.5, -18.5, FWD_END - 0.25]) pillar(kit, PALETTE, [x, Y, MZ - 0.25], 0.5, MEZZ - 0.7 - Y, { strip: x !== MW - 0.25 });
    // rails on the inner edges (gaps where the two stairs land)
    rail(kit, PALETTE, [MW - 0.05, MEZZ, MZ], [MW - 0.05, MEZZ, WEST_END], MEZZ);
    rail(kit, PALETTE, [MW, MEZZ, MZ - 0.05], [FWD_END, MEZZ, MZ - 0.05], MEZZ);
    rail(kit, PALETTE, [-27.65, MEZZ, WEST_END - 0.05], [MW, MEZZ, WEST_END - 0.05], MEZZ);
    rail(kit, PALETTE, [FWD_END - 0.05, MEZZ, 574.35], [FWD_END - 0.05, MEZZ, MZ], MEZZ);
    // stairs: west wall (climbing forward) and forward wall (climbing west)
    stairs(kit, PALETTE, [-28.6, Y, WEST_END + 6], Math.PI, { rise: MEZZ - Y, run: 6, w: 1.8 });
    stairs(kit, PALETTE, [-8, Y, 573.4], -Math.PI / 2, { rise: MEZZ - Y, run: 6, w: 1.8 });
    hazardStrip(kit, [-29.6, WEST_END + 6.05], [-27.6, WEST_END + 6.55], Y + 0.005);
    hazardStrip(kit, [-7.95, 572.45], [-7.45, 574.35], Y + 0.005);
    // mezzanine kit: consoles facing the window, cabinets and a rack on the forward deck
    for (const [i, z] of [581, 587, 593, 599].entries()) station([-28.25, MEZZ, z], Math.PI, 2.4, 2, SCREENS[i % 3], [i % 2 ? "screenImp3" : "screenImp0"]);
    for (const x of [-27.6, -26.0, -24.4, -21.2]) cabinet(kit, PALETTE, [x, MEZZ, Z0 + 0.28], 0, { seed: seed++, emit: x === -21.2 ? "emitAmber" : "emitBlue" });
    toolRack(kit, PALETTE, [-18.4, MEZZ, Z0 + 0.06], 0, { w: 1.6, seed: seed++ });
    for (const x of [-25.0, -19.6]) junctionBox(kit, PALETTE, [x, MEZZ + 2.4, Z0], 0, { seed: seed++ });

    // ---- west wall: status screens above the mezzanine, cabinets and crates below ------------------
    const SX = X0 + 0.1;
    let si = 0;
    for (const z of [578, 587, 596]) {
      for (const yc of [MEZZ + 2.2, MEZZ + 4.35]) wallScreen(kit, [SX + 0.14, yc, z], Math.PI / 2, 1.6, 1.8, SCREENS[si++ % 3], { tilt: 0.2, accent: "emitAmber" });
    }
    for (const z of [582.5, 591.5]) {
      const F = placer(kit, [X0 + 0.04, 0, z], Math.PI / 2);
      indicatorField(F, 0, MEZZ + 2.2, 0, 2.6, 1.0, seed++, { density: 0.5 });
      indicatorField(F, 0, MEZZ + 4.35, 0, 2.6, 1.0, seed++, { density: 0.5 });
      F.box("paintedMetal", 0, MEZZ + 3.28, 0.03, 2.8, 0.1, 0.06, { color: black });
      F.box("emitAmber", 0, MEZZ + 3.28, 0.07, 2.4, 0.04, 0.01);
    }
    kit.boxMM("emitAmber", [X0 + 0.02, MEZZ + 5.3, 576.5], [X0 + 0.04, MEZZ + 5.36, 598.5]);
    for (const z of [579.5, 587.5, 595.5]) cabinet(kit, PALETTE, [X0 + 0.28, Y, z], Math.PI / 2, { seed: seed++ });
    for (const z of [583.5, 599.5]) labelCrate(kit, PALETTE, [X0 + 0.75, Y, z], 0.1, { seed: seed++ });
    labelCrate(kit, PALETTE, [X0 + 0.7, Y, 600.9], -0.08, { seed: seed++, w: 1.0, h: 0.8, d: 1.0 });
    toolRack(kit, PALETTE, [X0 + 0.06, Y, 591.6], Math.PI / 2, { w: 1.6, seed: seed++ });
    for (const z of [581.5, 597.6]) ventGrille(kit, PALETTE, [X0, Y + 3.3, z], Math.PI / 2, { w: 1.4, h: 0.5 });
    // service run under the mezzanine deck (fills the bare band between the cabinets and the deck)
    for (const [py, r, c] of [[Y + 2.45, 0.12, steel], [Y + 2.8, 0.09, black]]) pipe(kit, PALETTE, [X0 + 0.3, py, 576.2], [X0 + 0.3, py, 603.6], r, { bracket: 0, color: c, segments: 10 });
    for (const z of [577.5, 585.5, 593.5, 602.5]) kit.boxMM("paintedMetal", [X0, Y + 2.25, z - 0.1], [X0 + 0.32, Y + 3.0, z + 0.1], { color: dark });
    for (const z of [589.5, 598.6]) junctionBox(kit, PALETTE, [X0, Y + 2.9, z], Math.PI / 2, { seed: seed++, w: 0.45, h: 0.45 });

    // ---- power distribution: east wall and forward wall cabinets, cables into ceiling trays -------
    const trayY = CEIL - 0.85;
    const eastZ = [575.3, 577.3, 579.3, 581.3, 583.3, 585.3, 594.5, 596.5, 598.5, 600.5, 602.5, 604.5, 606.5, 608.5];
    // cabinet rows feed a collector duct on their tops; a few thick conduit risers (r 0.18) take the
    // load up to the ceiling trays instead of a pair of thin pipes per cabinet
    for (const z of eastZ) {
      if (z === 606.5) openPowerCabinet(kit, PALETTE, [X1 - 0.42, Y, z], -Math.PI / 2, { seed: seed++ });
      else powerCabinet(kit, PALETTE, [X1 - 0.42, Y, z], -Math.PI / 2, { seed: seed++ });
    }
    conduitBundle(kit, PALETTE, [X1 - 0.42, Y + 2.4, 574.5], [X1 - 0.42, Y + 2.4, 586.1], trayY + 0.02, [577.3, 581.3, 585.3]);
    conduitBundle(kit, PALETTE, [X1 - 0.42, Y + 2.4, 593.7], [X1 - 0.42, Y + 2.4, 609.3], trayY + 0.02, [595.5, 600.5, 604.5, 608.5]);
    cableTray(kit, PALETTE, [X1 - 0.42, trayY, 573.2], [X1 - 0.42, trayY, 611.4], { w: 0.7 });
    const fwdX = [-5.6, -3.6, -1.6, 0.4, 2.4];
    for (const x of fwdX) powerCabinet(kit, PALETTE, [x, Y, Z0 + 0.42], 0, { seed: seed++ });
    conduitBundle(kit, PALETTE, [-6.4, Y + 2.4, Z0 + 0.42], [3.2, Y + 2.4, Z0 + 0.42], trayY + 0.02, [-2.6, 2.4]);
    cableTray(kit, PALETTE, [-7, trayY, Z0 + 0.42], [X1 - 0.85, trayY, Z0 + 0.42], { w: 0.7 });
    for (const z of [576.3, 580.3, 584.3, 597.5, 601.5, 605.5]) junctionBox(kit, PALETTE, [X1, Y + 3.2, z], -Math.PI / 2, { seed: seed++ });
    for (const z of [578.3, 582.3, 599.5, 607.5]) ventGrille(kit, PALETTE, [X1, Y + 4.6, z], -Math.PI / 2, { w: 1.6, h: 0.6 });
    for (const x of [-4.6, 1.4]) junctionBox(kit, PALETTE, [x, Y + 3.2, Z0], 0, { seed: seed++ });
    labelCrate(kit, PALETTE, [X1 - 0.7, Y, 573.85], 0.05, { seed: seed++ });
    // distribution panel on the bare east-wall strip aft of the cabinets (z 609.3..612.2): tall dark
    // panel with an indicator field, vent, and a conduit drop from the tray
    {
      const F = placer(kit, [X1, 0, 610.8], -Math.PI / 2);
      F.box("paintedMetal", 0, Y + 3.0, 0.08, 2.2, 5.2, 0.16, { color: dark, texel: 4 });
      F.box("impPanel", 0, Y + 3.0, 0.17, 2.0, 5.0, 0.02, { color: black, uv: "keep" });
      indicatorField(F, 0, Y + 4.6, 0.19, 1.6, 0.6, seed++);
      F.box("emitAmber", 0, Y + 4.1, 0.19, 1.6, 0.05, 0.01);
      for (let j = 0; j < 10; j++) F.box("paintedMetal", 0, Y + 1.2 + j * 0.18, 0.19, 1.6, 0.05, 0.02, { color: mid });
      F.box("paintedMetal", 0, Y + 3.4, 0.19, 1.6, 0.5, 0.02, { color: mid });
      for (let j = 0; j < 4; j++) F.box(j % 2 ? "emitGreen" : "emitRedImp", -0.6 + j * 0.4, Y + 3.4, 0.205, 0.1, 0.05, 0.01);
      F.collider([-1.1, Y, 0], [1.1, Y + 5.6, 0.26], "panel");
    }
    kit.cyl("metal", X1 - 0.3, (Y + 5.6 + trayY) / 2, 610.8, 0.14, trayY - Y - 5.6, "y", { color: dark, segments: 12, texel: 0.5 });
    kit.cyl("paintedMetal", X1 - 0.3, Y + 5.75, 610.8, 0.2, 0.3, "y", { color: black, segments: 12 });
    // door-side indicator panel by the corridor door (east wall, forward of the hole)
    {
      const F = placer(kit, [X1, 0, 586.6], -Math.PI / 2);
      F.box("paintedMetal", 0, Y + 1.5, 0.05, 0.7, 0.9, 0.06, { color: black });
      indicatorField(F, 0, Y + 1.6, 0.09, 0.6, 0.5, seed++);
      F.box("emitRedImp", 0, Y + 1.15, 0.085, 0.4, 0.06, 0.01);
    }

    // ---- systems bay: two back-to-back cabinet islands on the open forward floor, fed from trays ------
    const islandX = [-11, -9.2, -7.4, -5.6];
    for (const zc of [581.5, 586.0]) {
      for (const x of islandX) {
        for (const s of [-1, 1]) {
          if (zc === 586.0 && s > 0 && x === -7.4) openPowerCabinet(kit, PALETTE, [x, Y, zc + s * 0.42], 0, { seed: seed++ });
          else powerCabinet(kit, PALETTE, [x, Y, zc + s * 0.42], s > 0 ? 0 : Math.PI, { seed: seed++ });
        }
      }
      cableTray(kit, PALETTE, [islandX[0] - 1.2, trayY, zc], [islandX[3] + 1.2, trayY, zc], { w: 0.7 });
      conduitBundle(kit, PALETTE, [islandX[0] - 0.8, Y + 2.4, zc], [islandX[3] + 0.8, Y + 2.4, zc], trayY + 0.02, [-10.1, -8.3, -6.5], { r: 0.2, ductW: 1.7, ductH: 0.36 });
      floorLine(kit, [islandX[0] - 1.3, Y, zc - 1.3], [islandX[3] + 1.3, Y, zc - 1.3], 0.1, "emitAmber");
      floorLine(kit, [islandX[0] - 1.3, Y, zc + 1.3], [islandX[3] + 1.3, Y, zc + 1.3], 0.1, "emitAmber");
    }
    // walk lane: corridor door -> command post, with a branch aft along the open east side of the arcs
    // to the reactor door (hole x −0.2..2.2; lines stop 1.6 m short of the aft wall)
    floorLine(kit, [2.8, Y, 588.6], [-4.6, Y, 588.6], 0.12, "emitOrange");
    floorLine(kit, [2.8, Y, 591.4], [-4.6, Y, 591.4], 0.12, "emitOrange");
    floorLine(kit, [-0.4, Y, 591.5], [-0.4, Y, 610.9], 0.12, "emitOrange");
    floorLine(kit, [2.4, Y, 591.5], [2.4, Y, 610.9], 0.12, "emitOrange");
    // spares bay in front of the west mezzanine: hazard outline, crates
    hazardStrip(kit, [-23.5, 580.0], [-17.5, 580.4], Y + 0.005);
    hazardStrip(kit, [-23.5, 584.6], [-17.5, 585.0], Y + 0.005);
    // strapped pallet load (two crate sizes, one stacked, top labels) — read from the mezzanine above
    palletStack(kit, PALETTE, [-20.5, Y, 582.5], 0.06, { seed: seed++ });
    seed += 6;

    // ---- ceiling: heavy trunks converging on the header, ducts, trays ------------------------------
    const trunkY = CEIL - 1.6;
    const trunks = [
      [[-26, trunkY, Z0 - 0.1], [-18.5, trunkY, Z1 - 0.9]],
      [[CX, trunkY, Z0 - 0.1], [CX, trunkY, Z1 - 0.9]],
      [[2, trunkY, Z0 - 0.1], [-6, trunkY, Z1 - 0.9]],
    ];
    for (const [a, b] of trunks) {
      pipe(kit, PALETTE, a, b, 0.3, { bracket: 6, color: dark, mat: "paintedMetal" });
      const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
      yawBox(kit, "paintedMetal", [a[0] + (b[0] - a[0]) * 0.02, trunkY, a[2] + (b[2] - a[2]) * 0.02], [0.9, 0.9, 0.5], yaw, { color: black });
      yawBox(kit, "paintedMetal", [a[0] + (b[0] - a[0]) * 0.985, trunkY, a[2] + (b[2] - a[2]) * 0.985], [0.9, 0.9, 0.5], yaw, { color: black });
      yawBox(kit, "emitAmber", [a[0] + (b[0] - a[0]) * 0.5, trunkY - 0.31, a[2] + (b[2] - a[2]) * 0.5], [0.08, 0.02, 12], yaw);
    }
    duct(kit, PALETTE, [-26.5, CEIL - 0.7, 580], [2.6, CEIL - 0.7, 580], 0.8, 0.45, { color: mid });
    duct(kit, PALETTE, [-26.5, CEIL - 0.7, 596], [2.6, CEIL - 0.7, 596], 0.8, 0.45, { color: mid });
    duct(kit, PALETTE, [-26.5, CEIL - 0.7, 580], [-26.5, CEIL - 0.7, 596], 0.8, 0.45, { color: mid });

    // ---- lights (shell fills off, 13 = 2 spots + 11 points): every pool hangs in a framed fixture,
    // and every point sits INSIDE its housing, 0.2 m over the face plane — a point hung under a face
    // lights the bezel and louvres at 100–350 lx and they clip white (critic pass 3: the hanging panels
    // were the brightest thing in the room); inside, nothing of the fixture faces it and the deck is
    // lit exactly the same (points cast no shadow). The framed fixtures hang on 2.4 m stems so the
    // point is 2.6 m under the ceiling (a 34 lx halo on the channels, not a 140 lx white disc). The
    // room is lit by these alone: against the ~2 % deck a pool needs ~7 lx for 20 % grey, so the
    // fixtures run 230 cd (4.4 lx on the floor 7.2 m down) and the pendants 140 cd (7.6 lx at 4.3 m).
    // The pool gives the room 9 of its 11 points (the two farthest from the camera are off) and its
    // spots; the corridor's and the reactor's nearest lights take the 3 neighbour slots. ------------
    const L = (pos, color, intensity, distance, priority = 0.5) => {
      const d = { type: "point", pos, color, intensity, distance, priority };
      ctx.lights.push(d);
      return d;
    };
    const FIXTURES = [
      [-10, 605.5, 0xffb060, 190, 22, 1.0, "emitAmber"],
      [-23.5, 601, 0xffb060, 190, 22, 1.0, "emitAmber"],
      [-6.5, 601, 0xffb060, 190, 22, 1.0, "emitAmber"],
      [-20, 577.5, 0xffc890, 190, 22, 0.8, "emitAmber"],
      [-3.5, 584, 0xffd0a0, 190, 22, 1.0, "emitAmber"],
      [1, 606, 0xffc890, 170, 22, 2.0, "emitAmber"], // (priority 2: the reactor's door camera sees this floor through the hole, past the corridor's lights)
    ];
    for (const [x, z, color, intensity, distance, priority] of FIXTURES) {
      ceilingFixture(kit, PALETTE, [x, CEIL - 0.02, z], { w: 2.4, d: 0.7, stem: 2.4, mat: FACE, faceColor: IMP.impAmber });
      L([x, CEIL - 2.58, z], color, intensity + 40, distance, priority);
    }
    // low pendants for the open deck (policy C): housed fixtures on 5.5 m rods, faces 4.1 m over the
    // floor, so their pools land where the status and mezz cameras look — the strip north of the
    // western arcs (status bottom-left), the command post east of the holo (status bottom-right, cool
    // tint; turned along z to clear the x −12 trunk) and the open floor under the mezz camera. Each is
    // a bezelled housing (black plate round an inset diffuser face at 0.92, no louvres) with its point
    // inside; 140 cd → 7.6 lx on the deck, the door view's floor +1 stop (policy B).
    for (const [x, z, color, yaw] of [[-17, 595, 0xfff0dc, 0], [-10.6, 590, 0xd8e2ff, Math.PI / 2], [-20, 587, 0xfff0dc, 0]]) {
      ceilingFixture(kit, PALETTE, [x, CEIL - 0.02, z], { w: 2.0, d: 0.7, stem: 5.5, mat: FACE, faceColor: new THREE.Color(color), yaw, rod: true, louvres: false });
      if (x === -10.6) {
        // SHADOW KEY: the command-post pendant, 0.5 m under its face, aimed at the holo table's near
        // side so the table, the three command consoles and the operators' stools cast across the
        // aisle toward the door and status cameras (57° half-cone, 42 m reach; 220 cd → 16 lx on the
        // deck at the table, the room's dominant pool)
        ctx.lights.push({ type: "spot", pos: [x, CEIL - 6.4, z], target: [-11.4, Y, 591.3], color, intensity: 220, distance: 42, angle: 1.0, penumbra: 0.5, priority: 1.0, shadow: true });
      } else L([x, CEIL - 5.68, z], color, 140, 18, 1.2); // inside the housing, 4.3 m over the deck: 7.6 lx
    }
    // window flood: a hooded head high on the window wall over the dial row (the one fixture the window
    // camera has in frame, policy C), a spot aimed 45° down at the console row — a spot, because a point
    // 2 m off this light-grey wall would clip the panel behind its hood; 250 cd → 8–15 lx on the
    // console tops, and the dial row under the hood catches its edge
    wallLamp(kit, PALETTE, [-12, Y + 5.9, Z1], Math.PI, { w: 1.6, tilt: 0.85, face: 0.8, mat: FACE, faceColor: WHITE });
    ctx.lights.push({ type: "spot", pos: [-12, Y + 5.55, Z1 - 0.62], target: [-12, Y, Z1 - 6.2], color: 0xfff0dc, intensity: 250, distance: 24, angle: 0.75, penumbra: 0.5, priority: 1.0 });
    // door-approach pool under the hooded lamp over the reactor door (1.3 m under its head, 3.0 m off
    // the wall: the panel strip round the door takes ~5 lx and stays under 60 % grey, and the door
    // hole's light-grey jamb faces — which the reactor's door camera sees edge-on through the hole —
    // take 4 lx instead of the 8 lx that clipped them to a white sliver at 2.2 m; the mat at the sill
    // still gets ~4.5 lx and the pool centre sits 3 m in front of the door)
    L([1, Y + 3.6, Z1 - 3.0], 0xfff0dc, 110, 14, 2.0); // (priority 2, policy E: the destination through the reactor's door)
    // cyan point over the holo table, breathing with the schematic's opacity
    const HOLO_I = 22;
    const holoLight = L([CX, Y + 2.3, 592], 0x4fd8ff, HOLO_I, 9, 1.0);
    // amber alert lamp's own light, blinking with it: 0.65 m under the lens and 0.7 m off the wall, so
    // the header soffit 0.35 m over the lens (which a light at the lens clipped to flat amber) gets
    // ~10 lx and the window head a soft amber wash
    const ALERT_I = 14;
    const alertLight = L([-14, Y + 5.2, Z1 - 0.7], 0xffa028, ALERT_I, 10, 0.8);

    // static emitters folded into the animated mesh, re-capped (policy A): white faces 0.95, the
    // ceiling channel strips / floor lines / accents 0.9 amber, the indicator LEDs 0.95 green
    const emitters = buildAnimatedEmitters(ctx, { adopt: [["emitWhite", 0.95], ["emitOrange", 1.0], ["emitAmber", 0.9], ["emitGreen", 0.95]] });

    return {
      update(dt, t) {
        emitters.uniforms.uTime.value = t;
        schematic.rotation.y = t * 0.35;
        schematic.position.y = Y + 0.95 + 0.14 + Math.sin(t * 0.8) * 0.03;
        const breathe = 0.5 + 0.5 * Math.sin(t * 2.0);
        holoMat.opacity = 0.27 * (0.8 + 0.2 * breathe); // (0.35 stacked the ring layers to 95 %; 0.27 tops out ~85 %)
        holoLight.intensity = HOLO_I * (0.65 + 0.35 * breathe);
        alertLight.intensity = ALERT_I * anim.blink(t, ALERT.rate, ALERT.phase, ALERT.duty);
        // screen content flicker: the three screen layouts jitter 0.97–1.13 (× 0.95 base: the white
        // glyphs of the screen maps at 1.1 clipped in the door view) on staggered phases, with a rare
        // short refresh dip
        for (let i = 0; i < screenMats.length; i++) {
          const dip = Math.max(0, Math.sin(t * 1.3 + i * 2.5) - 0.97) * 3;
          screenMats[i].emissiveIntensity = 0.95 * (0.99 + 0.03 * Math.sin(t * 13.7 + i * 2.1) * Math.sin(t * 4.3 + i) + 0.03 * Math.sin(t * 0.9 + i * 1.7) - dip);
        }
      },
    };
  },
});

// Long, low sill console under the window: black body, tilted screen strip, three dense indicator
// panels along the desk. Operator side = local +Z.
function sillConsole(kit, PALETTE, pos, yaw, { w = 6, seed = 1 } = {}) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const d = 0.9;
  const deskH = 0.78;
  const h = 1.12;
  P.box("paintedMetal", 0, deskH / 2, 0, w, deskH, d, { color: black, texel: 1 });
  P.box("paintedMetal", 0, 0.06, 0, w - 0.1, 0.12, d - 0.1, { color: dark });
  const slopeH = h - deskH;
  const tilt = -0.5;
  const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.add("paintedMetal", new THREE.BoxGeometry(w, slopeH + 0.08, 0.42), 0, deskH + slopeH / 2, -d / 2 + 0.26, { quat: tq, color: black, texel: 1 });
  const nz = 0.2 * Math.cos(tilt);
  const ny = -0.2 * Math.sin(tilt);
  const n = 4;
  const sw = (w - 0.3) / n - 0.1;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.15 + (i + 0.5) * ((w - 0.3) / n);
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.05, slopeH * 0.7 + 0.05, 0.02), { pos: P.world(x, deskH + slopeH * 0.5 + ny, -d / 2 + 0.26 + nz), quat: tq });
    kit.add(["screenImp1", "screenImp3", "screenImp0", "screenImp3"][i % 4], new THREE.BoxGeometry(sw, slopeH * 0.7, 0.02), { pos: P.world(x, deskH + slopeH * 0.5 + ny * 1.08, -d / 2 + 0.26 + nz * 1.08), quat: tq, uv: "keep" });
  }
  P.box("paintedMetal", 0, deskH + 0.005, 0.12, w - 0.1, 0.01, 0.6, { color: dark });
  for (let i = 0; i < 3; i++) indicatorField(P, -w / 3 + (i * w) / 3, deskH + 0.14, 0.05, w / 3 - 0.2, 0.22, seed + i);
  for (let i = 0; i < 14; i++) P.box(i % 3 === 0 ? "emitRedImp" : i % 3 === 1 ? "emitBlue" : "emitAmber", -w / 2 + 0.6 + i * ((w - 1.2) / 13), deskH + 0.03, 0.34, 0.06, 0.02, 0.06);
  P.box("emitBlue", 0, deskH - 0.03, d / 2 + 0.006, w - 0.3, 0.012, 0.01);
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "console");
  return P;
}

// Service back for a shared console (its rear is a plain slab): grey access panel with slats, a
// cable gland and a status lamp on the face away from the operator (local −Z).
function consoleBack(kit, PALETTE, pos, yaw, w, seed) {
  const P = placer(kit, pos, yaw);
  const rand = rng(seed);
  const z = -0.45 - 0.012;
  P.box("impPanel", 0, 0.5, z, w - 0.3, 0.6, 0.02, { color: col(PALETTE, "impGrey"), uv: "keep" });
  P.box("paintedMetal", 0, 0.5, z - 0.012, w - 0.3, 0.6, 0.004, { color: col(PALETTE, "impBlack") });
  for (let j = 0; j < 4; j++) P.box("paintedMetal", -w / 4, 0.3 + j * 0.1, z - 0.016, w / 2 - 0.4, 0.03, 0.01, { color: col(PALETTE, "impDark") });
  P.box("paintedMetal", w / 4, 0.5, z - 0.02, 0.5, 0.3, 0.02, { color: col(PALETTE, "impDark") });
  P.box(rand() < 0.6 ? "emitGreen" : "emitAmber", w / 4, 0.7, z - 0.03, 0.1, 0.03, 0.01);
  P.cyl("metal", -w / 2 + 0.35, 0.16, z - 0.06, 0.05, 0.1, "z", { color: col(PALETTE, "steel"), segments: 8 });
  // lit rim along the top-back edge of the screen bank, so the flat top reads as a live console from
  // the service side too (the bank's rear face leans back to about y 1.02, z −0.41)
  P.box("paintedMetal", 0, 1.03, -0.4, w - 0.4, 0.06, 0.08, { color: col(PALETTE, "impBlack") });
  P.box("emitAmber", 0, 1.035, -0.445, w - 0.6, 0.03, 0.01);
}
