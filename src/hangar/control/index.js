// d4-control — Hangar flight-control tower (Deck 4, y -60..-55), stacked above the lift lobby. Its forward
// wall (z = 170) carries the window band x ±10, y -58.6..-56 that the hangar leaves open in its aft wall:
// this room builds the frame, mullions (every 2.5 m), sills and glass from z ≥ 170 - WALL_T inward. The
// gantry hatch (x -8.6..-7.4, up to -58) pokes into the band's bottom, so the two western panes sit on a
// transom at the hatch head (which carries the lit GANTRY sign) with dark spandrels underneath. Interior:
// five traffic consoles on a shallow arc facing the window (four different bezelled screen layouts), real
// operator seats, a hangar-plan hologram table with a recessed lens, two railed supervisor daises, the
// status board on the aft wall with stencilled legend text, under-window equipment cabinets, lockers.
// Material budget (16): impFloor impPanel paintedMetal metal emitWhite emitBlue emitRedImp emitAmber glass
// holo screenMatte0-3 impText impTextLit — so consoles/seats use impFloor for their gloss and the ceiling
// fixtures use emitWhite. The screens are the room's matte clones of screenImp0-3 (props.matteScreens):
// glossy tiles on the aft wall mirrored the ceiling pools as white blobs from most standing positions.
import * as THREE from "three";
import { doorOpening, WALL_T, FRAME_W } from "../../systems/doors/helper.js";
import { impWall, impCeiling, impFloorSlab, impRib, impRail, MAT, col } from "../../systems/corridor/imperial.js";
import { impConsole, impSeat, impLocker, statusBoard, deckPlacard, firePoint, wallTerminal, matteScreens } from "../../systems/corridor/props.js";
import { textMaterials, stencilText } from "../../systems/corridor/text.js";

const FLOOR = -60;
const CEIL = -55;
const B = { min: [-12, FLOOR, 170], max: [12, CEIL, 181] };
const T = WALL_T;
const H = CEIL - 0.12 - FLOOR; // wall height to the ceiling face
const Z_IN = B.min[2] + T; // 170.16 inner face of the forward wall
const Z_OUT = B.min[2] - T; // 169.84 outermost z this room may build to (shared wall, hangar side)
// window band left open by the hangar (src/hangar/hangar/layout.js WINDOW)
const WIN = { x0: -10, x1: 10, y0: -58.6, y1: -56.0 };
const MULLIONS = [-7.5, -5, -2.5, 0, 2.5, 5, 7.5];
const MW = 0.14; // mullion width
const BORDER = 0.22; // frame border around the hole
const F0 = Z_OUT + 0.02; // frame front (hangar side)
const F1 = Z_IN + 0.2; // frame back (room side, 0.2 proud of the panels)
const HOLO = 0x4fd8ff;
const GLOSS = MAT.floor; // dark reflective plate doubles as the consoles' gloss (keeps blackGloss out of the budget)

const DOORS = [
  { id: "d4-control-stairs", pos: [7, FLOOR, 181], dir: [0, 0, 1], kind: "standard", to: "d4-stairs" },
  { id: "d4-control-gantry", pos: [-8, FLOOR, 170], dir: [0, 0, -1], kind: "hatch", to: "d4-hangar" },
];
const HATCH = DOORS[1];
// hatch frame extents on this face (doors system adds FRAME_W around the 1.2 × 2.0 hole)
const HX0 = HATCH.pos[0] - 0.6 - FRAME_W; // -8.82
const HX1 = HATCH.pos[0] + 0.6 + FRAME_W; // -7.18
const HTOP = FLOOR + 2.0 + FRAME_W; // -57.78
const TRANSOM = [HTOP - 0.02, HTOP + 0.16]; // sits on the hatch head
const RAISED = TRANSOM[1]; // glass in the two western panes starts here

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default {
  id: "d4-control",
  name: "Hangar Flight Control",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [0, FLOOR, 178], yaw: 0 },
  apertures: [],
  materials: (base) => ({ ...textMaterials(), ...matteScreens(base) }),
  views: {
    "d4-control-window": { pos: [0, FLOOR, 176], yaw: 0, pitch: -6 },
    "d4-control-consoles": { pos: [8.2, FLOOR, 175.2], yaw: 66, pitch: -5 }, // beside the east dais, along the arc
    "d4-control-holo": { pos: [-1.3, FLOOR, 176.4], yaw: 44, pitch: -16 }, // 1.9 m off the table, looking down onto the plan
    "d4-control-board": { pos: [2, FLOOR, 175.5], yaw: 132, pitch: 12 }, // board centre is 3.15 m up, 7 m away
    "d4-control-hatch": { pos: [-6.6, FLOOR, 174.8], yaw: 17, pitch: 0 }, // in the hatch approach, in front of the west dais rail
  },
  build(ctx) {
    const { kit, seed } = ctx;
    const { min, max } = B;
    const black = col("impBlack");
    const dark = col("impDark");
    const mid = col("impMid");
    const holes = DOORS.map((d) => doorOpening(d));
    holes.push({ min: [WIN.x0, WIN.y0, Z_OUT], max: [WIN.x1, WIN.y1, Z_IN] });
    const aftZ = max[2] - T;

    // ---- floor: dark deck plate with visible plate seams (no lane paint in a control room); a darker
    // approach mat in front of the gantry hatch with a stencilled marking
    impFloorSlab(kit, { x0: min[0], x1: max[0], z0: min[2], z1: max[2], y: FLOOR, tint: "impDark" });
    for (let x = -9.6; x < 12; x += 2.4) kit.boxMM(MAT.dark, [x - 0.012, FLOOR, min[2] + T], [x + 0.012, FLOOR + 0.002, aftZ], { color: black });
    for (let z = 172.4; z < 181; z += 2.4) kit.boxMM(MAT.dark, [min[0] + T, FLOOR, z - 0.012], [max[0] - T, FLOOR + 0.002, z + 0.012], { color: black });
    kit.boxMM(MAT.floor, [HX0 - 0.25, FLOOR, Z_IN], [HX1 + 0.25, FLOOR + 0.004, Z_IN + 1.2], { color: black, texel: 0.5 });
    kit.boxMM(MAT.dark, [HX0 - 0.25, FLOOR, Z_IN + 1.18], [HX1 + 0.25, FLOOR + 0.006, Z_IN + 1.22], { color: col("impGrey") });
    stencilText(kit, { text: "GANTRY", pos: [HATCH.pos[0], FLOOR + 0.006, Z_IN + 0.75], normal: [0, 1, 0], up: [0, 0, -1], size: 0.22, color: "white" });

    // ---- walls (door holes + the window band; the aft strip runs continuous under the raised status board)
    // and the ceiling with two light channels across the room plus a short rectangular channel over the
    // holo table; greebles keep clear of everything mounted on the walls: board, placards, terminals, lockers
    const wallOpts = { y0: FLOOR, h: H, holes, tint: "impWhite", tint2: "impGrey", greebles: 0.05 };
    impWall(kit, { ...wallOpts, plane: "z", at: min[2], inward: 1, a0: min[0], a1: max[0], seed: seed + 1, tag: "control-fwd" });
    impWall(kit, { ...wallOpts, plane: "z", at: max[2], inward: -1, a0: min[0], a1: max[0], seed: seed + 2, tag: "control-aft", clear: [[-10.1, 0.2], [3.8, 4.6], [8.9, 10.3]] });
    impWall(kit, { ...wallOpts, plane: "x", at: min[0], inward: 1, a0: min[2], a1: max[2], seed: seed + 3, tag: "control-west", clear: [[175.8, 177.9]] });
    impWall(kit, { ...wallOpts, plane: "x", at: max[0], inward: -1, a0: min[2], a1: max[2], seed: seed + 4, tag: "control-east", clear: [[176.0, 178.9]] });
    const ceilY = CEIL - 0.12;
    impCeiling(kit, {
      x0: min[0],
      x1: max[0],
      z0: min[2],
      z1: max[2],
      y: ceilY,
      seed: seed + 5,
      channels: [
        { axis: "x", at: 173.4, width: 0.6, c0: -11.2, c1: 11.2, fixtureAt: [-7.5, -2.5, 2.5, 7.5], fixtureLen: 2.6, fixtureMat: MAT.strip },
        { axis: "x", at: 177.4, width: 0.6, c0: -11.2, c1: 11.2, fixtureAt: [-7.5, -2.5, 2.5, 7.5], fixtureLen: 2.6, fixtureMat: MAT.strip },
        { axis: "z", at: -2.6, width: 0.5, c0: 174.0, c1: 175.8, fixtureAt: [174.9], fixtureLen: 1.4, fixtureMat: MAT.blue, stripW: 0.1 },
      ],
    });
    for (const [z, i] of [
      [175.4, 0],
      [179.4, 1],
    ]) impRib(kit, { axis: "z", at: z, c0: min[0] + T, c1: max[0] - T, y0: FLOOR, h: H, depth: 0.28, proud: 0.2, index: i });

    // ---- window band: border, mullions, transom over the hatch head, spandrels, sills, glass
    {
      const { x0, x1, y0, y1 } = WIN;
      const bx0 = x0 - BORDER;
      const bx1 = x1 + BORDER;
      const frame = (a, b, opts = {}) => kit.boxMM(MAT.dark, a, b, { color: dark, texel: 1, ...opts });
      frame([bx0, y1, F0], [bx1, y1 + BORDER, F1 - 0.04]); // head
      frame([bx0, y0 - BORDER, F0], [x0, y1 + BORDER, F1 - 0.04]); // west jamb
      frame([x1, y0 - BORDER, F0], [bx1, y1 + BORDER, F1 - 0.04]); // east jamb
      const lowSillX0 = MULLIONS[1] - MW / 2; // low sill from the x = -5 mullion eastward
      frame([lowSillX0, y0 - BORDER, F0], [bx1, y0, F1 - 0.04]);
      kit.boxMM(MAT.dark, [lowSillX0, y0 - 0.06, Z_IN], [bx1, y0, Z_IN + 0.34], { color: black, texel: 1 }); // ledge
      kit.boxMM(MAT.steel, [lowSillX0 + 0.1, y0 - 0.005, Z_IN + 0.3], [bx1 - 0.1, y0, Z_IN + 0.33], { color: col("impGrey") });
      // western panes: transom on the hatch head, spandrels beside the hatch frame, ledge on the transom
      kit.boxMM(MAT.dark, [bx0, TRANSOM[0], F0], [lowSillX0, TRANSOM[1], F1], { color: black, texel: 1 });
      kit.boxMM(MAT.dark, [bx0, TRANSOM[1], Z_IN], [lowSillX0, TRANSOM[1] + 0.06, Z_IN + 0.3], { color: black, texel: 1 });
      for (const [sa, sb] of [
        [x0, HX0],
        [HX1, lowSillX0],
      ]) {
        kit.boxMM(MAT.dark, [sa, y0, F0], [sb, TRANSOM[0] + 0.01, Z_IN], { color: dark, texel: 1 });
        kit.boxMM(MAT.panel, [sa + 0.05, y0 + 0.06, Z_IN], [sb - 0.05, TRANSOM[0] - 0.05, Z_IN + 0.012], { color: mid, uv: "keep" });
        for (let k = 0; k < 4; k++) kit.boxMM(MAT.dark, [sa + 0.12, y0 + 0.16 + k * 0.12, Z_IN + 0.012], [sb - 0.12, y0 + 0.18 + k * 0.12, Z_IN + 0.02], { color: black });
      }
      // mullions (the x = -7.5 one only above the transom) with a light steel face strip (highlight)
      for (const mx of MULLIONS) {
        const ya = mx < lowSillX0 ? RAISED : y0;
        kit.boxMM(MAT.dark, [mx - MW / 2, ya, F0 + 0.02], [mx + MW / 2, y1, F1], { color: dark, texel: 1 });
        kit.boxMM(MAT.panel, [mx - 0.025, ya + 0.1, F1], [mx + 0.025, y1 - 0.1, F1 + 0.012], { color: col("impGrey"), uv: "keep" }); // matte: a bare-metal strip bloomed into a white streak
        kit.boxMM(MAT.blue, [mx - 0.012, y1 - 0.09, F1], [mx + 0.012, y1 - 0.07, F1 + 0.014]);
      }
      // glass panes, 2 cm, at the bounds face; 1 cm into the frame members so there are no slivers; a
      // faint additive sheen just inside them so the glazing reads (the shared glass is near-invisible)
      const edges = [x0, ...MULLIONS, x1];
      for (let i = 0; i < edges.length - 1; i++) {
        const gx0 = i === 0 ? x0 : edges[i] + MW / 2;
        const gx1 = i === edges.length - 2 ? x1 : edges[i + 1] - MW / 2;
        const ya = gx1 <= lowSillX0 + 1e-3 ? RAISED : y0;
        kit.boxMM("glass", [gx0 - 0.01, ya - 0.01, 169.95], [gx1 + 0.01, y1 + 0.01, 169.97]);
        kit.add("holo", new THREE.PlaneGeometry(gx1 - gx0 - 0.02, y1 - ya - 0.02), { pos: [(gx0 + gx1) / 2, (ya + y1) / 2, 170.0], color: 0x0a1a26 });
      }
      // no collider of its own: the wall slab under the sill (impWall) already keeps the player off the
      // glass, and a band-wide box here would block the hatch passage
    }

    // ---- gantry hatch surround: dark posts with amber lamps beside the doors system's frame, the transom
    // above it carries the lit GANTRY sign
    {
      for (const [xa, xb] of [
        [HX0 - 0.22, HX0 - 0.02],
        [HX1 + 0.02, HX1 + 0.22],
      ]) {
        kit.boxMM(MAT.dark, [xa, FLOOR, Z_IN], [xb, TRANSOM[0], Z_IN + 0.14], { color: dark, texel: 1 });
        kit.boxMM(MAT.dark, [xa + 0.04, FLOOR + 0.3, Z_IN + 0.14], [xb - 0.04, TRANSOM[0] - 0.3, Z_IN + 0.15], { color: black });
        kit.boxMM(MAT.amber, [xa + 0.06, FLOOR + 1.5, Z_IN + 0.15], [xb - 0.06, FLOOR + 1.7, Z_IN + 0.158]);
        kit.collider([xa, FLOOR, Z_IN], [xb, FLOOR + 2.2, Z_IN + 0.14], "hatch-post");
      }
      stencilText(kit, { text: "GANTRY", pos: [HATCH.pos[0], (TRANSOM[0] + TRANSOM[1]) / 2 + 0.005, F1 + 0.003], normal: [0, 0, 1], size: 0.14, color: "amber", lit: true, spacing: 1.15 });
      kit.boxMM(MAT.amber, [HX0, TRANSOM[0] + 0.004, F1 - 0.03], [HX1, TRANSOM[0] + 0.016, F1 + 0.004]);
    }

    // ---- under-window equipment cabinets (0.8 m), broken around the hatch surround
    for (const [xa, xb, s] of [
      [-9.8, HX0 - 0.34, 0],
      [HX1 + 0.34, 9.8, 1],
    ]) {
      kit.boxMM(MAT.dark, [xa, FLOOR, Z_IN], [xb, FLOOR + 0.8, Z_IN + 0.45], { color: black, texel: 1 });
      kit.boxMM(MAT.dark, [xa - 0.02, FLOOR + 0.78, Z_IN], [xb + 0.02, FLOOR + 0.82, Z_IN + 0.47], { color: dark, texel: 1 });
      const n = Math.max(1, Math.round((xb - xa) / 0.82));
      const dw = (xb - xa) / n;
      for (let i = 0; i < n; i++) {
        const cx = xa + dw * (i + 0.5);
        kit.boxMM(MAT.panel, [cx - dw / 2 + 0.03, FLOOR + 0.1, Z_IN + 0.45], [cx + dw / 2 - 0.03, FLOOR + 0.72, Z_IN + 0.465], { color: mid, uv: "keep" });
        kit.boxMM(MAT.steel, [cx + dw / 2 - 0.12, FLOOR + 0.36, Z_IN + 0.465], [cx + dw / 2 - 0.09, FLOOR + 0.52, Z_IN + 0.49], { color: col("impGrey") });
        kit.boxMM((i + s) % 3 === 0 ? MAT.amber : MAT.blue, [cx - dw / 2 + 0.08, FLOOR + 0.64, Z_IN + 0.465], [cx - dw / 2 + 0.14, FLOOR + 0.66, Z_IN + 0.472]);
      }
      kit.collider([xa, FLOOR, Z_IN], [xb, FLOOR + 0.82, Z_IN + 0.47], "cabinet");
    }

    // ---- traffic consoles: five on a shallow arc (R 14 m) facing the window, a different layout and
    // screen rotation each, operator seats behind; the arc stops short of the hatch approach (x > -4.3)
    {
      const R = 14;
      const STEP = 0.15;
      const ZC = 172.3 + R;
      const layouts = [0, 1, 2, 3, 1];
      const rot = ["screenMatte0", "screenMatte1", "screenMatte2", "screenMatte3"];
      for (let k = -2; k <= 2; k++) {
        const b = k * STEP;
        const pos = [R * Math.sin(b), FLOOR, ZC - R * Math.cos(b)];
        const yaw = -b;
        const screens = rot.map((_, i) => rot[(i + k + 2) % 4]);
        const P = impConsole(kit, { pos, yaw, w: 2.2, d: 0.95, layout: layouts[k + 2], screens, gloss: GLOSS, seed: seed + 30 + k, tag: "traffic-console" });
        impSeat(kit, { pos: P.p(0, 0, 0.92), yaw, gloss: GLOSS, tag: "seat" });
      }
    }

    // ---- holo table: black drum with a rim light, control wedge and a recessed projection lens; a
    // hangar-plan hologram above it (bay outline, aperture, rack rows, fighters, a traffic vector)
    {
      const hx = -2.6;
      const hz = 174.9;
      const top = FLOOR + 0.96;
      kit.cyl(MAT.dark, hx, FLOOR + 0.06, hz, 0.74, 0.12, "y", { color: dark, segments: 24, texel: 1 });
      kit.cyl(MAT.dark, hx, FLOOR + 0.5, hz, 0.62, 0.8, "y", { color: black, segments: 24, texel: 1 });
      kit.cyl(MAT.blue, hx, top - 0.054, hz, 0.67, 0.012, "y", { segments: 32 }); // rim light under the lip
      kit.cyl(MAT.dark, hx, top - 0.028, hz, 0.66, 0.04, "y", { color: dark, segments: 24, texel: 1 });
      kit.cyl(GLOSS, hx, top - 0.004, hz, 0.66, 0.008, "y", { color: black, segments: 32 });
      // recessed lens: open bezel ring (side wall + top annulus), dim glass disc 8 mm below its lip
      kit.add(MAT.dark, new THREE.CylinderGeometry(0.17, 0.17, 0.012, 32, 1, true), { pos: [hx, top + 0.006, hz], color: black });
      kit.add(MAT.dark, new THREE.RingGeometry(0.1, 0.17, 32).rotateX(-Math.PI / 2), { pos: [hx, top + 0.012, hz], color: black });
      kit.cyl("holo", hx, top + 0.002, hz, 0.1, 0.004, "y", { color: 0x2a7f9c, segments: 24 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        kit.boxMM(MAT.dark, [hx + 0.6 * Math.cos(a) - 0.05, FLOOR + 0.1, hz + 0.6 * Math.sin(a) - 0.05], [hx + 0.6 * Math.cos(a) + 0.05, FLOOR + 0.9, hz + 0.6 * Math.sin(a) + 0.05], { color: dark });
      }
      // control wedge on the aft side of the drum: sloped keypad panel with indicators
      kit.boxMM(MAT.dark, [hx - 0.3, top - 0.2, hz + 0.56], [hx + 0.3, top - 0.03, hz + 0.78], { color: dark, texel: 1 });
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) kit.boxMM(MAT.dark, [hx - 0.24 + c * 0.085, top - 0.17 + r * 0.07, hz + 0.78], [hx - 0.19 + c * 0.085, top - 0.13 + r * 0.07, hz + 0.795], { color: (r + c) % 4 === 0 ? mid : black });
      for (const [dx, m] of [
        [-0.24, MAT.blue],
        [-0.18, MAT.red],
        [0.2, MAT.amber],
      ]) kit.boxMM(m, [hx + dx, top - 0.05, hz + 0.78], [hx + dx + 0.04, top - 0.035, hz + 0.79]);
      kit.collider([hx - 0.75, FLOOR, hz - 0.8], [hx + 0.75, FLOOR + 1.0, hz + 0.8], "holo-table");
      // hologram: faint cone from the lens up to a translucent deck plane, then the hangar plan at 1:200
      // on it (ship +z = table +z). The holo material is additive at 0.35, so lines are 2-2.5 cm thick and
      // near-white to read from standing distance; the plane is dark so it only lifts the field slightly
      const py = top + 0.2;
      kit.add("holo", new THREE.CylinderGeometry(0.42, 0.1, py - top - 0.01, 24, 1, true), { pos: [hx, (top + py) / 2, hz], color: 0x0a2a38 });
      const seg = (a, b, r = 0.02, color = HOLO) => {
        const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const len = d.length();
        if (len < 1e-4) return;
        const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, d.normalize());
        kit.add("holo", new THREE.BoxGeometry(r, len + r, r), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, color });
      };
      const rect = (cx, cz, w, d, y, color, r = 0.02) => {
        seg([cx - w, y, cz - d], [cx + w, y, cz - d], r, color);
        seg([cx + w, y, cz - d], [cx + w, y, cz + d], r, color);
        seg([cx + w, y, cz + d], [cx - w, y, cz + d], r, color);
        seg([cx - w, y, cz + d], [cx - w, y, cz - d], r, color);
      };
      const S = 1 / 200;
      const pz = (shipZ) => hz + (shipZ - 65) * S; // hangar centre → table centre
      kit.add("holo", new THREE.PlaneGeometry(88 * S, 226 * S).rotateX(-Math.PI / 2), { pos: [hx, py - 0.006, pz(65)], color: 0x0b2632 }); // deck field
      rect(hx, pz(65), 40 * S, 105 * S, py, 0xdff6ff, 0.022); // hangar outline
      rect(hx, pz(32), 36 * S, 62 * S, py + 0.004, 0xffffff, 0.02); // deck aperture
      // the hangar volume: dim corner posts and a top outline 24 m (at scale) above the deck, so the plan
      // reads as a box of space over the table rather than a flat frame
      const hy = py + 24 * S;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) seg([hx + sx * 40 * S, py, pz(65) + sz * 105 * S], [hx + sx * 40 * S, hy, pz(65) + sz * 105 * S], 0.008, 0x3a9cc4);
      rect(hx, pz(65), 40 * S, 105 * S, hy, 0x3a9cc4, 0.008);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) seg([hx + s * 34 * S, py, pz(104 + i * 12)], [hx + s * 34 * S, py, pz(110 + i * 12)], 0.026, 0x7fd0f0); // rack rows
      rect(hx, pz(170) + 0.03, 12 * S, 0.02, py + 0.004, 0xff6a5a, 0.018); // this tower
      seg([hx, py, pz(-40)], [hx, py, pz(170)], 0.01, 0x3a9cc4); // centreline
      // fighters: two parked (blue), one lifting toward the aperture (amber) with its traffic vector
      const marker = (x, y, z, color) => {
        seg([x - 0.045, y, z], [x + 0.045, y, z], 0.022, color);
        seg([x, y, z - 0.03], [x, y, z + 0.05], 0.022, color);
        seg([x, y - 0.012, z], [x, y + 0.012, z], 0.03, color);
      };
      marker(hx - 0.1, py + 0.02, pz(118), 0xbff0ff);
      marker(hx + 0.12, py + 0.02, pz(134), 0xbff0ff);
      const fly = [hx + 0.05, py + 0.28, pz(60)];
      marker(fly[0], fly[1], fly[2], 0xffc060);
      for (let t = 0; t < 1; t += 0.2) seg([fly[0], py + 0.03 + t * 0.24, fly[2]], [fly[0], py + 0.03 + (t + 0.1) * 0.24, fly[2]], 0.01, 0xb08a40); // dashed drop line
      const exit = [hx + 0.05, py + 0.28, pz(-45)];
      seg(fly, exit, 0.016, 0xffc060);
      seg(exit, [exit[0] - 0.05, exit[1], exit[2] + 0.08], 0.016, 0xffc060);
      seg(exit, [exit[0] + 0.05, exit[1], exit[2] + 0.08], 0.016, 0xffc060);
      seg([hx - 40 * S, py + 0.28, pz(-45)], [hx + 40 * S, py + 0.28, pz(-45)], 0.01, 0x8a6a40); // launch line
    }

    // ---- supervisor stations: two raised daises (0.3 m) with steel nosings, a guard rail on the drop
    // (front and sides), a half-step on the aft side, a wide console and a seat each
    for (const [sx, i] of [
      [-5.6, 0],
      [5.6, 1],
    ]) {
      const d0 = [sx - 1.7, FLOOR, 175.6];
      const d1 = [sx + 1.7, FLOOR + 0.3, 178.3];
      kit.boxMM(MAT.floor, d0, d1, { color: mid, texel: 0.5 });
      kit.boxMM(MAT.dark, [d0[0] - 0.02, FLOOR, d0[2] - 0.02], [d1[0] + 0.02, FLOOR + 0.26, d1[2] + 0.02], { color: black, texel: 1 });
      for (const [a, b] of [
        [[d0[0], d0[2]], [d1[0], d0[2] + 0.03]],
        [[d0[0], d1[2] - 0.03], [d1[0], d1[2]]],
        [[d0[0], d0[2]], [d0[0] + 0.03, d1[2]]],
        [[d1[0] - 0.03, d0[2]], [d1[0], d1[2]]],
      ]) kit.boxMM(MAT.steel, [a[0], FLOOR + 0.3, a[1]], [b[0], FLOOR + 0.304, b[1]], { color: col("impGrey") });
      kit.boxMM(MAT.strip, [d0[0] + 0.1, FLOOR + 0.12, d0[2] - 0.005], [d1[0] - 0.1, FLOOR + 0.15, d0[2] + 0.005]);
      kit.collider(d0, [d1[0], FLOOR + 0.3, d1[2]], "dais");
      const ry = FLOOR + 0.3;
      impRail(kit, { a: [d0[0] + 0.06, d0[2] + 0.06], b: [d1[0] - 0.06, d0[2] + 0.06], y0: ry, wall: false, postEvery: 1.1, tag: "dais-rail" });
      impRail(kit, { a: [d0[0] + 0.06, d0[2] + 0.06], b: [d0[0] + 0.06, d1[2] - 0.06], y0: ry, wall: false, postEvery: 1.3, tag: "dais-rail" });
      impRail(kit, { a: [d1[0] - 0.06, d0[2] + 0.06], b: [d1[0] - 0.06, d1[2] - 0.06], y0: ry, wall: false, postEvery: 1.3, tag: "dais-rail" });
      for (const [xa, xb] of [
        [d0[0] + 0.06, sx - 0.65],
        [sx + 0.65, d1[0] - 0.06],
      ]) impRail(kit, { a: [xa, d1[2] - 0.06], b: [xb, d1[2] - 0.06], y0: ry, wall: false, postEvery: 1.2, tag: "dais-rail" });
      // half-step into the aft aisle
      kit.boxMM(MAT.floor, [sx - 0.6, FLOOR, d1[2]], [sx + 0.6, FLOOR + 0.15, d1[2] + 0.36], { color: mid, texel: 0.5 });
      kit.boxMM(MAT.steel, [sx - 0.6, FLOOR + 0.15, d1[2] + 0.33], [sx + 0.6, FLOOR + 0.154, d1[2] + 0.36], { color: col("impGrey") });
      kit.collider([sx - 0.6, FLOOR, d1[2]], [sx + 0.6, FLOOR + 0.15, d1[2] + 0.36], "dais-step");
      impConsole(kit, { pos: [sx, ry, 176.55], yaw: 0, w: 2.6, d: 0.9, layout: i ? 2 : 3, screens: i ? ["screenMatte2", "screenMatte0", "screenMatte1", "screenMatte3"] : ["screenMatte1", "screenMatte3", "screenMatte0", "screenMatte2"], gloss: GLOSS, seed: seed + 40 + i, tag: "supervisor-console" });
      impSeat(kit, { pos: [sx, ry, 177.5], yaw: 0, gloss: GLOSS });
      // reading lamp arm over the desk
      kit.cyl(MAT.steel, sx + 1.05, ry + 1.3, 176.75, 0.015, 1.0, "y", { color: col("impGrey"), segments: 8 });
      kit.boxMM(MAT.dark, [sx + 0.75, ry + 1.78, 176.55], [sx + 1.08, ry + 1.84, 176.95], { color: black });
      kit.boxMM(MAT.strip, [sx + 0.78, ry + 1.775, 176.6], [sx + 1.05, ry + 1.78, 176.9]);
    }

    // ---- aft wall: status board on the upper wall, wholly above the 2.1 m light strip (bottom edge 2.35 m,
    // the strip runs continuous underneath it), room placards at reading height, wall terminal, fire point
    // (no chevron plate: the hatch approach is the room's single hazard marking)
    statusBoard(kit, { pos: [-4, FLOOR + 3.15, aftZ], normal: [0, 0, -1], w: 4.4, h: 1.6, screens: ["screenMatte0", "screenMatte2", "screenMatte1", "screenMatte3"], gloss: GLOSS, seed: seed + 50 });
    deckPlacard(kit, { pos: [-0.6, FLOOR + 1.7, aftZ], normal: [0, 0, -1], w: 1.3, h: 0.34, title: "FLIGHT CONTROL", sub: "HANGAR 4 - TOWER", accent: "impRed" });
    deckPlacard(kit, { pos: [9.6, FLOOR + 1.7, aftZ], normal: [0, 0, -1], w: 1.1, h: 0.34, title: "STAIRWELL 4-S", sub: "LIFT LOBBY - DECK 4", arrow: "↓", accent: "impBlue" });
    wallTerminal(kit, { pos: [-9.6, FLOOR + 1.4, aftZ], normal: [0, 0, -1], screen: "screenMatte2", accent: "impBlue", gloss: GLOSS, seed: seed + 53 });
    firePoint(kit, { pos: [4.2, FLOOR, aftZ], yaw: Math.PI, hazard: false });

    // ---- side walls: comms cabinets (west) and equipment lockers + a wall terminal (east), between the ribs
    const west = min[0] + T;
    const east = max[0] - T;
    for (const [z, i] of [
      [176.2, 0],
      [176.85, 1],
      [177.5, 2],
    ]) impLocker(kit, { pos: [west + 0.25, FLOOR, z], yaw: Math.PI / 2, h: 1.85, status: i === 1 ? MAT.red : MAT.blue, label: `COMMS ${i + 1}`, seed: seed + 60 + i, tag: "comms-cabinet" });
    for (const [z, i] of [
      [176.4, 0],
      [177.05, 1],
    ]) impLocker(kit, { pos: [east - 0.25, FLOOR, z], yaw: -Math.PI / 2, h: 1.85, seed: seed + 70 + i, status: i ? MAT.amber : MAT.blue, label: i ? "ORD 02" : "EVA 01" });
    wallTerminal(kit, { pos: [east, FLOOR + 1.4, 178.4], normal: [-1, 0, 0], screen: "screenMatte0", accent: "impAmber", gloss: GLOSS, seed: seed + 72 });

    // ---- lights (11 descriptors): pools under the two ceiling channels (hung 1.5 m below the 4.9 m ceiling
    // so the panels around them do not blow out), cool console glow, holo glow, a wash beside the status
    // board. Intensities are for the harness's dark-hall environment (no ambient fill): a 3.4 m pool at 22
    // lands ~1.9 on the floor (enough for the plate seams to read), the corridor's 2.6 m pools at 14 land ~2.
    for (const [x, pr] of [
      [-6, 0.6],
      [0, 0.7],
      [6, 0.6],
    ]) ctx.lights.push({ type: "point", pos: [x, CEIL - 1.5, 173.4], color: 0xdfe8ff, intensity: 22, distance: 14, priority: pr });
    // the west pool of the aft channel sits at x -3 (not mirrored at -5.6) so that from the board view its
    // mirror image falls beside the board on plain panel rather than across the tiles (the matte screens
    // turn what is left into a soft sheen instead of a white blob)
    for (const x of [-3.0, 5.6]) ctx.lights.push({ type: "point", pos: [x, CEIL - 1.5, 177.4], color: 0xdfe8ff, intensity: 22, distance: 14, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 1.5, 178.6], color: 0xdfe8ff, intensity: 19, distance: 13, priority: 0.6 });
    // console glow sits high over the seats so the operator-side displays never see it mirrored
    for (const x of [-4.4, 0, 4.4]) ctx.lights.push({ type: "point", pos: [x, FLOOR + 2.6, 174.0], color: 0x6f8fff, intensity: 8, distance: 6, priority: 0.35 });
    ctx.lights.push({ type: "point", pos: [-2.6, FLOOR + 1.7, 174.9], color: HOLO, intensity: 5, distance: 5, priority: 0.45 });
    // aft-wall wash in the west corner, low and well past the board's edge
    ctx.lights.push({ type: "point", pos: [-10.6, FLOOR + 2.4, 179.6], color: 0xbfd0ff, intensity: 5, distance: 6, priority: 0.3 });
    return {};
  },
};
