// d4-control — Hangar flight-control tower (Deck 4, y -60..-55), stacked above the lift lobby. Its forward
// wall (z = 170) carries the window band x ±10, y -58.6..-56 that the hangar leaves open in its aft wall:
// this room builds the frame, mullions (every 2.5 m), sills and glass from z ≥ 170 - WALL_T inward. The
// gantry hatch (x -8.6..-7.4, up to -58) pokes into the band's bottom, so the two western panes sit on a
// transom at the hatch head with dark spandrels underneath. Interior: five traffic consoles on a shallow arc
// facing the window, seats, a holo table (wireframe fighter over a hangar plan), two raised supervisor
// stations behind, status board on the aft wall, under-window equipment cabinets, comms lockers.
import * as THREE from "three";
import { doorOpening, WALL_T, FRAME_W } from "../../systems/doors/helper.js";
import { impWall, impCeiling, impFloorSlab, impRib, MAT, col } from "../../systems/corridor/imperial.js";
import { Placer, impConsole, impSeat, impLocker, statusBoard, deckPlacard, firePoint } from "../../systems/corridor/props.js";

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

const DOORS = [
  { id: "d4-control-stairs", pos: [7, FLOOR, 181], dir: [0, 0, 1], kind: "standard", to: "d4-stairs" },
  { id: "d4-control-gantry", pos: [-8, FLOOR, 170], dir: [0, 0, -1], kind: "hatch", to: "d4-hangar" },
];
const HATCH = DOORS[1];
// hatch frame extents on this face (doors system adds FRAME_W around the 1.2 × 2.0 hole)
const HX0 = HATCH.pos[0] - 0.6 - FRAME_W; // -8.82
const HX1 = HATCH.pos[0] + 0.6 + FRAME_W; // -7.18
const HTOP = FLOOR + 2.0 + FRAME_W; // -57.78
const TRANSOM = [HTOP - 0.02, HTOP + 0.14]; // sits on the hatch head
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
  views: {
    "d4-control-window": { pos: [0, FLOOR, 176], yaw: 0, pitch: -6 },
    "d4-control-consoles": { pos: [6.5, FLOOR, 176.2], yaw: 66, pitch: -5 },
    "d4-control-holo": { pos: [-0.3, FLOOR, 177.3], yaw: 44, pitch: -10 },
    "d4-control-board": { pos: [2, FLOOR, 175.5], yaw: 132, pitch: 8 },
    "d4-control-hatch": { pos: [-4, FLOOR, 175], yaw: 40, pitch: 2 },
  },
  build(ctx) {
    const { kit, seed } = ctx;
    const { min, max } = B;
    const black = col("impBlack");
    const dark = col("impDark");
    const mid = col("impMid");
    const holes = DOORS.map((d) => doorOpening(d));
    holes.push({ min: [WIN.x0, WIN.y0, Z_OUT], max: [WIN.x1, WIN.y1, Z_IN] });

    // ---- floor: dark deck, lighter central walkway from the aft aisle to the console arc
    impFloorSlab(kit, { x0: min[0], x1: max[0], z0: min[2], z1: max[2], y: FLOOR, tint: "impDark" });
    kit.boxMM(MAT.floor, [-1.3, FLOOR, 173.9], [1.3, FLOOR + 0.006, max[2] - T], { color: mid, texel: 0.5 });
    for (const x of [-1.3, 1.3]) kit.boxMM(MAT.panel, [x - 0.03, FLOOR, 173.9], [x + 0.03, FLOOR + 0.008, max[2] - T], { color: col("impWhite"), uv: "keep" });
    kit.boxMM("hazard", [HX0 - 0.2, FLOOR, Z_IN], [HX1 + 0.2, FLOOR + 0.006, Z_IN + 0.45], { texel: 2.5 });

    // ---- walls (door holes + the window band) and ceiling with two light channels across the room
    const wallOpts = { y0: FLOOR, h: H, holes, tint: "impWhite", tint2: "impGrey", greebles: 0.06 };
    impWall(kit, { ...wallOpts, plane: "z", at: min[2], inward: 1, a0: min[0], a1: max[0], seed: seed + 1, tag: "control-fwd" });
    impWall(kit, { ...wallOpts, plane: "z", at: max[2], inward: -1, a0: min[0], a1: max[0], seed: seed + 2, tag: "control-aft" });
    impWall(kit, { ...wallOpts, plane: "x", at: min[0], inward: 1, a0: min[2], a1: max[2], seed: seed + 3, tag: "control-west" });
    impWall(kit, { ...wallOpts, plane: "x", at: max[0], inward: -1, a0: min[2], a1: max[2], seed: seed + 4, tag: "control-east" });
    const ceilY = CEIL - 0.12;
    impCeiling(kit, {
      x0: min[0],
      x1: max[0],
      z0: min[2],
      z1: max[2],
      y: ceilY,
      seed: seed + 5,
      channels: [
        { axis: "x", at: 173.4, width: 0.6, c0: -11.2, c1: 11.2, fixtureAt: [-7.5, -2.5, 2.5, 7.5], fixtureLen: 2.6 },
        { axis: "x", at: 177.4, width: 0.6, c0: -11.2, c1: 11.2, fixtureAt: [-7.5, -2.5, 2.5, 7.5], fixtureLen: 2.6 },
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
      // mullions (the x = -7.5 one only above the transom) with a steel face strip
      for (const mx of MULLIONS) {
        const ya = mx < lowSillX0 ? RAISED : y0;
        kit.boxMM(MAT.dark, [mx - MW / 2, ya, F0 + 0.02], [mx + MW / 2, y1, F1], { color: dark, texel: 1 });
        kit.boxMM(MAT.steel, [mx - 0.02, ya + 0.1, F1], [mx + 0.02, y1 - 0.1, F1 + 0.012], { color: col("impGrey") });
      }
      // glass panes, 2 cm, at the bounds face; 1 cm into the frame members so there are no slivers
      const edges = [x0, ...MULLIONS, x1];
      for (let i = 0; i < edges.length - 1; i++) {
        const gx0 = i === 0 ? x0 : edges[i] + MW / 2;
        const gx1 = i === edges.length - 2 ? x1 : edges[i + 1] - MW / 2;
        const ya = gx1 <= lowSillX0 + 1e-3 ? RAISED : y0;
        kit.boxMM("glass", [gx0 - 0.01, ya - 0.01, 169.95], [gx1 + 0.01, y1 + 0.01, 169.97]);
      }
      // no collider of its own: the wall slab under the sill (impWall) already keeps the player off the
      // glass, and a band-wide box here would block the hatch passage
    }

    // ---- under-window equipment cabinets (0.8 m), broken around the hatch
    for (const [xa, xb, s] of [
      [-9.8, HX0 - 0.3, 0],
      [HX1 + 0.3, 9.8, 1],
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

    // ---- traffic consoles: five on a shallow arc (R 14 m) facing the window, operator chairs behind
    {
      const R = 14;
      const STEP = 0.17;
      const ZC = 172.3 + R;
      const screenSets = [
        ["screenImp0", "screenImp1", "screenImp2"],
        ["screenImp2", "screenImp0", "screenImp1"],
        ["screenImp1", "screenImp2", "screenImp0"],
        ["screenImp0", "screenImp2", "screenImp1"],
        ["screenImp0", "screenImp1", "screenImp2"],
      ];
      for (let k = -2; k <= 2; k++) {
        const b = k * STEP;
        const pos = [R * Math.sin(b), FLOOR, ZC - R * Math.cos(b)];
        const yaw = -b;
        const P = impConsole(kit, { pos, yaw, w: 2.2, d: 0.95, screens: screenSets[k + 2], seed: seed + 30 + k, tag: "traffic-console" });
        impSeat(kit, { pos: P.p(0, 0, 0.92), yaw, tag: "seat" });
      }
    }

    // ---- holo table: black drum, gloss top, blue rim, projection lens; wireframe hangar plan + fighter above
    {
      const hx = -2.6;
      const hz = 174.9;
      kit.cyl(MAT.dark, hx, FLOOR + 0.06, hz, 0.74, 0.12, "y", { color: dark, segments: 24, texel: 1 });
      kit.cyl(MAT.dark, hx, FLOOR + 0.5, hz, 0.62, 0.8, "y", { color: black, segments: 24, texel: 1 });
      kit.cyl(MAT.blue, hx, FLOOR + 0.905, hz, 0.69, 0.03, "y", { segments: 24 });
      kit.cyl("blackGloss", hx, FLOOR + 0.94, hz, 0.66, 0.04, "y", { color: black, segments: 24 });
      kit.cyl("holo", hx, FLOOR + 0.965, hz, 0.5, 0.01, "y", { color: 0x1c7a9c, segments: 24 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        kit.boxMM(MAT.dark, [hx + 0.6 * Math.cos(a) - 0.05, FLOOR + 0.1, hz + 0.6 * Math.sin(a) - 0.05], [hx + 0.6 * Math.cos(a) + 0.05, FLOOR + 0.9, hz + 0.6 * Math.sin(a) + 0.05], { color: dark });
      }
      kit.collider([hx - 0.75, FLOOR, hz - 0.75], [hx + 0.75, FLOOR + 1.0, hz + 0.75], "holo-table");
      // faint projection cone + wireframe content (additive "holo" material, vertex-tinted)
      kit.add("holo", new THREE.CylinderGeometry(0.62, 0.5, 0.5, 24, 1, true), { pos: [hx, FLOOR + 1.22, hz], color: 0x0d3e52 });
      const seg = (a, b, r = 0.012, color = HOLO) => {
        const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const len = d.length();
        if (len < 1e-4) return;
        const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, d.normalize());
        kit.add("holo", new THREE.BoxGeometry(r, len, r), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, color });
      };
      const ring = (c, r, n, plane, color = HOLO) => {
        const pts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const u = r * Math.cos(a);
          const v = r * Math.sin(a);
          pts.push(plane === "xz" ? [c[0] + u, c[1], c[2] + v] : plane === "yz" ? [c[0], c[1] + u, c[2] + v] : [c[0] + u, c[1] + v, c[2]]);
        }
        for (let i = 0; i < n; i++) seg(pts[i], pts[(i + 1) % n], 0.01, color);
        return pts;
      };
      // hangar plan: outline, centreline, six bay squares, the tower marker on the aft edge
      const py = FLOOR + 1.06;
      const pw = 0.62;
      const pd = 0.4;
      const rect = (cx, cz, w, d, y, color) => {
        seg([cx - w, y, cz - d], [cx + w, y, cz - d], 0.008, color);
        seg([cx + w, y, cz - d], [cx + w, y, cz + d], 0.008, color);
        seg([cx + w, y, cz + d], [cx - w, y, cz + d], 0.008, color);
        seg([cx - w, y, cz + d], [cx - w, y, cz - d], 0.008, color);
      };
      rect(hx, hz, pw, pd, py, HOLO);
      seg([hx, py, hz - pd], [hx, py, hz + pd], 0.006, 0x2a9cc4);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) rect(hx + sx * 0.38, hz - 0.24 + i * 0.24, 0.09, 0.07, py, i === 1 ? 0xffa028 : HOLO);
      rect(hx, hz + pd + 0.05, 0.12, 0.03, py, 0xff2a1a);
      // fighter: twin-ring cockpit, pylons, hexagonal wing panels with spokes
      const fc = [hx, FLOOR + 1.58, hz];
      ring(fc, 0.17, 14, "xz");
      ring(fc, 0.17, 14, "xy");
      for (const s of [-1, 1]) {
        seg([fc[0] + s * 0.17, fc[1], fc[2]], [fc[0] + s * 0.46, fc[1], fc[2]], 0.014);
        const hex = ring([fc[0] + s * 0.46, fc[1], fc[2]], 0.36, 6, "yz");
        for (let i = 0; i < 6; i += 2) seg([fc[0] + s * 0.46, fc[1], fc[2]], hex[i], 0.008, 0x2a9cc4);
        seg([fc[0] + s * 0.46, fc[1] + 0.36, fc[2]], [fc[0] + s * 0.46, fc[1] - 0.36, fc[2]], 0.008, 0x2a9cc4);
      }
      // ceiling emitter ring above the table
      kit.cyl(MAT.dark, hx, ceilY - 0.1, hz, 0.9, 0.2, "y", { color: dark, segments: 24, texel: 1 });
      kit.cyl(MAT.blue, hx, ceilY - 0.21, hz, 0.7, 0.02, "y", { segments: 24 });
    }

    // ---- supervisor stations: two raised daises (0.3 m) with a wide console and chair each
    for (const [sx, i] of [
      [-5.6, 0],
      [5.6, 1],
    ]) {
      const d0 = [sx - 1.7, FLOOR, 175.6];
      const d1 = [sx + 1.7, FLOOR + 0.3, 178.3];
      kit.boxMM(MAT.floor, d0, d1, { color: mid, texel: 0.5 });
      kit.boxMM(MAT.dark, [d0[0] - 0.02, FLOOR, d0[2] - 0.02], [d1[0] + 0.02, FLOOR + 0.26, d1[2] + 0.02], { color: black, texel: 1 });
      kit.boxMM("hazard", [d0[0], FLOOR + 0.3, d0[2]], [d1[0], FLOOR + 0.306, d0[2] + 0.06], { texel: 4 });
      kit.boxMM(MAT.strip, [d0[0] + 0.1, FLOOR + 0.12, d0[2] - 0.005], [d1[0] - 0.1, FLOOR + 0.15, d0[2] + 0.005]);
      kit.collider(d0, [d1[0], FLOOR + 0.3, d1[2]], "dais");
      impConsole(kit, { pos: [sx, FLOOR + 0.3, 176.55], yaw: 0, w: 2.6, d: 0.9, screens: i ? ["screenImp2", "screenImp0", "screenImp1"] : ["screenImp1", "screenImp2", "screenImp0"], seed: seed + 40 + i, tag: "supervisor-console" });
      impSeat(kit, { pos: [sx, FLOOR + 0.3, 177.5], yaw: 0 });
      // reading lamp arm over the desk
      kit.cyl(MAT.steel, sx + 1.05, FLOOR + 0.3 + 1.3, 176.75, 0.015, 1.0, "y", { color: col("impGrey"), segments: 8 });
      kit.boxMM(MAT.dark, [sx + 0.75, FLOOR + 0.3 + 1.78, 176.55], [sx + 1.08, FLOOR + 0.3 + 1.84, 176.95], { color: black });
      kit.boxMM(MAT.strip, [sx + 0.78, FLOOR + 0.3 + 1.775, 176.6], [sx + 1.05, FLOOR + 0.3 + 1.78, 176.9]);
    }

    // ---- aft wall: status board (above the strip band), traffic legend placard, wall terminal, fire point
    const aftZ = max[2] - T;
    statusBoard(kit, { pos: [-4, -56.86, aftZ], normal: [0, 0, -1], w: 4.4, h: 1.8, screens: ["screenImp0", "screenImp2", "screenImp1", "screenImp0"], legend: 7, seed: seed + 50 });
    deckPlacard(kit, { pos: [-1.0, FLOOR + 1.55, aftZ], normal: [0, 0, -1], w: 1.0, h: 0.5, lines: 4, accent: "impRed", seed: seed + 51 });
    deckPlacard(kit, { pos: [-7.2, FLOOR + 1.55, aftZ], normal: [0, 0, -1], w: 0.9, h: 0.5, lines: 3, accent: "impBlue", seed: seed + 52 });
    impConsole(kit, { pos: [-9.6, FLOOR, aftZ - 0.42], yaw: Math.PI, w: 1.4, d: 0.7, screens: ["screenImp2", "screenImp1", "screenImp2"], seed: seed + 53, tag: "terminal" });
    firePoint(kit, { pos: [4.2, FLOOR, aftZ], yaw: Math.PI });

    // ---- side walls: comms cabinets (west) and equipment lockers + a wall terminal (east), between the ribs
    const west = min[0] + T;
    const east = max[0] - T;
    for (const [z, i] of [
      [176.2, 0],
      [176.85, 1],
      [177.5, 2],
    ]) impLocker(kit, { pos: [west + 0.25, FLOOR, z], yaw: Math.PI / 2, h: 2.1, status: i === 1 ? MAT.red : MAT.blue, seed: seed + 60 + i, tag: "comms-cabinet" });
    for (const [z, i] of [
      [176.4, 0],
      [177.05, 1],
    ]) impLocker(kit, { pos: [east - 0.25, FLOOR, z], yaw: -Math.PI / 2, seed: seed + 70 + i, status: i ? MAT.amber : MAT.blue });
    impConsole(kit, { pos: [east - 0.36, FLOOR, 178.3], yaw: -Math.PI / 2, w: 1.2, d: 0.7, screens: ["screenImp2", "screenImp0", "screenImp2"], seed: seed + 72, tag: "terminal" });

    // ---- lights (11 descriptors): pools under the two ceiling channels (hung 1.5 m below the 4.9 m ceiling
    // so the panels around them do not blow out), cool console glow, holo glow, a wash on the status board
    for (const [x, pr] of [
      [-6, 0.6],
      [0, 0.7],
      [6, 0.6],
    ]) ctx.lights.push({ type: "point", pos: [x, CEIL - 1.5, 173.4], color: 0xdfe8ff, intensity: 8, distance: 12, priority: pr });
    for (const x of [-5.6, 5.6]) ctx.lights.push({ type: "point", pos: [x, CEIL - 1.5, 177.4], color: 0xdfe8ff, intensity: 8, distance: 12, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 1.5, 178.6], color: 0xdfe8ff, intensity: 7, distance: 11, priority: 0.6 });
    for (const x of [-4.4, 0, 4.4]) ctx.lights.push({ type: "point", pos: [x, FLOOR + 1.3, 173.3], color: 0x6f8fff, intensity: 3, distance: 5, priority: 0.35 });
    ctx.lights.push({ type: "point", pos: [-2.6, FLOOR + 1.7, 174.9], color: HOLO, intensity: 4, distance: 5, priority: 0.45 });
    ctx.lights.push({ type: "point", pos: [-4, FLOOR + 3.4, 180.0], color: 0xbfd0ff, intensity: 3, distance: 5, priority: 0.3 });
    return {};
  },
};
