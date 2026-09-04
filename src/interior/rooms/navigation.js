// Deck 2 — Navigation & Flight Control, secondary station (sector d2_nav).
//
// Two pilot stations with yokes and throttle quadrants face a curved navigation display arc on the
// forward wall; overhead instrument pods hang above them. Aft of the pilots a plotting table under a
// hex-grid floor inlay projects the star-chart hologram, and the astrogation computer bank lines the
// starboard wall. Amber practicals over the crew, blue from the displays.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, impChair, wallScreen, equipmentRack, crate, pipeRun, hologram, wallSegment, IMP_STYLES_TECH, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { labelAtlas, signPlate, signAt, holoMaterial, holoCone, ventGrille, cableTray, datapad, mug, floorScuffs } from "./tactical.js";

export function buildNavigation(kit, ctx) {
  const [min, max] = ctx.bounds; // [2.4, 0, -24] .. [18, 3.6, -12]
  const H = max[1];
  const cx = (min[0] + max[0]) / 2; // 10.2
  const rand = rng(ctx.seed + 3);
  const labels = labelAtlas(ctx, "nav_labels", [
    "NAVIGATION  &  FLIGHT CONTROL",
    { text: "ASTROGATION", accent: "#ffb347", color: "#ffe6c4" },
    "COURSE PLOT  ·  HYPERLANE 7  ·  LOCKED",
    { text: "FLIGHT CONTROL  ·  SECONDARY STATION", accent: "#ffb347", color: "#ffe6c4" },
    "HDG 000 · 000   ·   SUBLIGHT 0.62c   ·   ETA 04:12",
    { text: "AUTHORISED FLIGHT CREW ONLY", accent: "#ff4136", color: "#ffd9d4" },
  ]);
  const hm = holoMaterial(ctx, "cmd_holo");
  const swatch = (s) => [s[0], s[1], s[0], s[1]];

  roomShell(kit, ctx, {
    ceiling: false,
    walls: { styles: IMP_STYLES_TECH, panelW: 1.25 },
  });
  {
    // ceiling: panel grid with two off-centre white strips (the pilot row sits under its amber pods)
    const f = ceilingFrame(kit, min[0], min[2], H);
    panelGrid(f, max[0] - min[0], max[2] - min[2], { rowH: 1.4, panelW: 1.4, kick: false, topPipes: false, seed: ctx.seed * 17 + 5, collide: false, styles: { panel: 0.8, greeble: 0.1, vent: 0.1 }, paints: [[PALETTE.impLight, 0.55], [PALETTE.impGrey, 0.35], [PALETTE.impMid, 0.1]], ...IMP_THEME, decals: false });
    for (const x of [cx - 4.8, cx + 4.8]) {
      kit.boxMM("paintedMetal", [x - 0.22, H - 0.1, min[2] + 1.0], [x + 0.22, H, max[2] - 1.0], { color: PALETTE.impDark, texel: 2 });
      kit.boxMM("emitWhiteSoft", [x - 0.08, H - 0.12, min[2] + 1.2], [x + 0.08, H - 0.09, max[2] - 1.2], { uv: "keep" });
    }
    // amber wash strip over the flight director
    kit.boxMM("paintedMetal", [cx - 1.6, H - 0.1, -17.1], [cx + 1.6, H, -16.7], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("emitAmber", [cx - 1.4, H - 0.12, -17.0], [cx + 1.4, H - 0.09, -16.8]);
  }

  // --- pilot row facing the forward arc, flight director's station behind them
  const pz = min[2] + 3.6; // console line
  for (const [i, x] of [cx - 1.55, cx + 1.55].entries()) pilotStation(kit, ctx, x, pz, ctx.seed + i * 7);
  impConsole(kit, ctx, { x: cx, z: pz + 3.3, yaw: 0, w: 2.6, d: 0.85, h: 1.0, screens: [2, 0, 2], chair: true, seed: ctx.seed + 41, lampMat: "emitAmber" });
  signAt(kit, labels, 3, { x: cx, y: 0.55, z: pz + 3.3 - 0.43, yaw: Math.PI, h: 0.08 });
  // floor marking: dark lane from the door to the director's station with amber edge studs
  for (let k = 0; k < 7; k++) {
    const x = min[0] + 1.2 + k * 0.95;
    for (const s of [-1, 1]) kit.box("emitAmber", x, 0.006, -18 + s * 1.1, 0.12, 0.012, 0.05);
  }
  // shared centre pedestal between the two seats with the nav computer keyboard
  kit.box("paintedMetal", cx, 0.4, pz + 0.9, 0.5, 0.8, 0.9, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", cx, 0.83, pz + 0.9, 0.56, 0.06, 0.96, { color: PALETTE.impBlack, texel: 2 });
  kit.add("impScreen2", new THREE.PlaneGeometry(0.4, 0.5).rotateX(-Math.PI / 2), { pos: [cx, 0.865, pz + 0.75], uv: "keep" });
  for (let k = 0; k < 6; k++) kit.box(k % 3 === 0 ? "emitAmber" : k % 3 === 1 ? "emitBlue" : "rubber", cx - 0.15 + (k % 3) * 0.15, 0.87, pz + 1.15 + Math.floor(k / 3) * 0.1, 0.08, 0.02, 0.06, { color: PALETTE.rubber });
  kit.collider([cx - 0.28, 0, pz + 0.42], [cx + 0.28, 0.86, pz + 1.38], "pedestal");
  // floor conduits from the stations to the display plinth
  for (const x of [cx - 1.55, cx + 1.55]) pipeRun(kit, [[x, 0.045, pz - 0.5], [x, 0.045, min[2] + 1.1]], 0.045, PALETTE.impBlack, "rubber");

  // --- curved navigation display (arc on the zmin wall) + heading readout over it
  displayArc(kit, ctx, cx, min[2], labels);

  // --- overhead instrument pods above the pilots
  for (const x of [cx - 1.55, cx + 1.55]) instrumentPod(kit, x, pz + 0.6, H);
  // cable trays feeding the pods along the ceiling from the starboard wall
  cableTray(kit, [max[0] - 0.4, H - 0.1, pz + 0.6], [cx - 1.55, H - 0.1, pz + 0.6], { w: 0.24, count: 3 });

  // --- plotting table with the star-chart hologram, on a hex-grid inlay
  const tx = cx + 4.2;
  const tz = max[2] - 4.0;
  hexInlay(kit, tx, tz, 2.9, 0.55);
  plottingTable(kit, ctx, tx, tz, labels, hm, swatch);

  // --- astrogation computer bank along the starboard wall (xmax)
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmin (u=0) to zmax
    for (const [u, seed, lit] of [[1.0, 1, "emitBlue"], [2.4, 2, "emitAmber"], [3.8, 3, "emitBlue"], [length - 1.0, 4, "emitBlue"]]) {
      equipmentRack(kit, ctx, { side: "xmax", u, w: 1.3, h: 2.5, seed: ctx.seed + seed, lit });
    }
    signPlate(frame, labels, 1, { u: 2.4, v: 2.95, h: 0.28 });
    // astrogation terminal in the middle of the bank: tall console with a vertical display,
    // facing the wall so its operator sits in the room
    impConsole(kit, ctx, { x: max[0] - 0.5, z: tz + 0.6, yaw: -Math.PI / 2, w: 2.0, d: 0.85, screens: [2, 2], tall: true, chair: true, seed: ctx.seed + 31 });
    wallScreen(kit, ctx, { side: "xmax", u: tz - min[2] - 2.0, v: 2.1, w: 1.2, h: 0.7, screen: 2 });
    wallScreen(kit, ctx, { side: "xmax", u: tz - min[2] + 3.2, v: 2.1, w: 1.2, h: 0.7, screen: 4 });
    ventGrille(frame, length / 2, 3.25, 1.2, 0.36);
    // conduit bundle down from the ceiling into the terminal's riser
    for (const du of [-0.5, -0.3, 0.3]) frame.cylV("metal", tz + 0.6 - min[2] + du, 2.7, 0.07, 0.03, H - 1.8, { color: du < 0 ? PALETTE.impMid : PALETTE.steel, segments: 8 });
  }

  // --- aft wall (zmax): course boards, lockers, a crew bench with a low table
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from xmax (u=0) to xmin
    const uAt = (x) => max[0] - x;
    // wide course-plot board
    const bu = uAt(cx - 1.2);
    frame.box("paintedMetal", bu, 1.95, 0.05, 4.6, 1.5, 0.1, { color: PALETTE.impDark, texel: 1.5 });
    signPlate(frame, labels, 2, { u: bu, v: 2.5, h: 0.24, n: 0.1 });
    for (let i = 0; i < 3; i++) {
      const u = bu - 1.45 + i * 1.45;
      frame.box("darkGloss", u, 1.7, 0.11, 1.34, 0.78, 0.012);
      frame.add("impScreen" + [2, 2, 4][i], new THREE.PlaneGeometry(1.3, 0.74), u, 1.7, 0.118, { uv: "keep" });
    }
    frame.box("leds", bu, 1.24, 0.11, 3.8, 0.04, 0.008, { uv: "keep" });
    // lockers toward the starboard corner
    for (let i = 0; i < 3; i++) {
      const u = uAt(max[0] - 1.0 - i * 0.7);
      frame.box("impPanel1", u, 1.0, 0.24, 0.66, 2.0, 0.48, { color: i === 1 ? PALETTE.impGrey : PALETTE.impLight, uv: "keep" });
      frame.box("paintedMetal", u, 1.0, 0.485, 0.02, 1.9, 0.01, { color: PALETTE.impBlack, texel: 2 });
      frame.box("metal", u + 0.22, 1.05, 0.49, 0.03, 0.14, 0.02, { color: PALETTE.steel });
      frame.box(i === 1 ? "emitRed" : "emitBlue", u - 0.2, 1.85, 0.49, 0.05, 0.02, 0.006);
      frame.add("decal", new THREE.PlaneGeometry(0.22, 0.22), u, 1.55, 0.492, { uv: "keep", uvRect: decalRect(8 + i) });
    }
    frame.collider(uAt(max[0] - 0.62), uAt(max[0] - 2.75), 0, 2.0, 0, 0.5, "lockers");
    // crew bench + low table near the port corner (human scale, off the door approach)
    const bx = min[0] + 2.6;
    kit.box("paintedMetal", bx, 0.2, max[2] - 0.5, 2.0, 0.4, 0.5, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("emitWhiteSoft", bx, 0.1, max[2] - 0.245, 1.8, 0.015, 0.01, { uv: "keep" });
    for (const s of [-1, 1]) kit.box("impPanel1", bx + s * 1.1, 0.36, max[2] - 0.45, 0.08, 0.72, 0.6, { color: PALETTE.impLight, uv: "keep" });
    kit.box("fabric", bx, 0.45, max[2] - 0.5, 2.1, 0.1, 0.52, { color: PALETTE.impBlack, uv: "world", texel: 2 });
    kit.box("fabric", bx, 0.78, max[2] - 0.2, 2.1, 0.56, 0.1, { color: PALETTE.impBlack, uv: "world", texel: 2 });
    kit.box("paintedMetal", bx, 1.08, max[2] - 0.17, 2.14, 0.04, 0.16, { color: PALETTE.impMid, texel: 2 });
    kit.collider([bx - 1.15, 0, max[2] - 0.8], [bx + 1.15, 1.1, max[2]], "bench");
    kit.box("paintedMetal", bx, 0.3, max[2] - 1.55, 0.9, 0.6, 0.6, { color: PALETTE.impMid, texel: 1.5 });
    kit.box("darkGloss", bx, 0.615, max[2] - 1.55, 0.96, 0.03, 0.66);
    datapad(kit, bx - 0.2, 0.63, max[2] - 1.5, 0.4, 2);
    mug(kit, bx + 0.25, 0.63, max[2] - 1.65, PALETTE.impGrey);
    mug(kit, bx + 0.12, 0.63, max[2] - 1.42, PALETTE.impLight);
    kit.collider([bx - 0.48, 0, max[2] - 1.88], [bx + 0.48, 0.64, max[2] - 1.22], "table");
    wallScreen(kit, ctx, { side: "zmax", u: uAt(bx), v: 2.0, w: 1.4, h: 0.8, screen: 0 });
    ventGrille(frame, length - 1.2, 3.2, 1.0, 0.4);
  }

  // --- door wall (xmin): room sign, hazard threshold, comm panel, scuffs, a crate pair in the corner
  {
    const seg = wallSegment(ctx.bounds, "xmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    const door = ctx.doors[0];
    const uDoor = door ? max[2] - door.pos[1] : length / 2;
    signPlate(frame, labels, 0, { u: uDoor, v: 3.2, h: 0.26 });
    signPlate(frame, labels, 5, { u: uDoor + 2.6, v: 2.1, h: 0.16 });
    wallScreen(kit, ctx, { side: "xmin", u: uDoor - 2.9, v: 1.9, w: 1.3, h: 0.75, screen: 2 });
    frame.box("paintedMetal", uDoor + 1.75, 1.35, 0.05, 0.34, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
    frame.box("impScreen4", uDoor + 1.75, 1.45, 0.101, 0.26, 0.16, 0.006, { uv: "keep" });
    frame.box("emitBlue", uDoor + 1.7, 1.2, 0.101, 0.05, 0.03, 0.006);
    frame.box("emitAmber", uDoor + 1.82, 1.2, 0.101, 0.05, 0.03, 0.006);
    floorScuffs(kit, min[0] + 1.3, door ? door.pos[1] : -18, { n: 6, len: 1.0, yaw: Math.PI / 2, seed: 17 });
    crate(kit, ctx, { x: min[0] + 0.8, z: min[2] + 1.0, sx: 1.1, sy: 0.9, sz: 1.1, yaw: 0.15, seed: 21 });
    crate(kit, ctx, { x: min[0] + 0.7, z: min[2] + 2.3, sx: 0.8, sy: 0.55, sz: 0.8, yaw: -0.3, seed: 22 });
    // wall-base conduit from the corner crates along the forward wall to the arc's end cap
    pipeRun(kit, [[min[0] + 1.6, 0.28, min[2] + 0.14], [cx - 4.3, 0.28, min[2] + 0.14], [cx - 4.3, 0.28, min[2] + 0.7]], 0.05, PALETTE.impMid);
    pipeRun(kit, [[min[0] + 1.6, 0.4, min[2] + 0.14], [cx - 4.3, 0.4, min[2] + 0.14]], 0.03, PALETTE.steel);
  }

  // --- lights (6): amber over the crew, blue over the chart, white at the entry and the aft wall
  ctx.light(pointLight(0xffb347, 4.0, 7.5, [cx - 1.55, H - 0.9, pz + 0.8]));
  ctx.light(pointLight(0xffb347, 4.0, 7.5, [cx + 1.55, H - 0.9, pz + 0.8]));
  ctx.light(pointLight(0x4a9dff, 5.5, 7.5, [tx, 2.8, tz]));
  ctx.light(pointLight(0xdfe8ff, 3.0, 6.5, [min[0] + 2.2, H - 0.6, -18]));
  ctx.light(pointLight(0xffb347, 2.8, 6.5, [max[0] - 1.6, H - 0.8, min[2] + 2.5]));
  ctx.light(pointLight(0xdfe8ff, 3.0, 6.5, [cx - 1.0, H - 0.6, max[2] - 1.6]));
  if (ctx.audioZone) ctx.audioZone({ id: "nav_hum", pos: [cx, 1.2, pz], radius: 7, loop: "hum_low" });
  void rand;
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
/** Pilot station: console with three nav screens, a yoke on a column, throttle quadrant, seat. */
function pilotStation(kit, ctx, x, z, seed) {
  impConsole(kit, ctx, { x, z, yaw: 0, w: 2.2, d: 0.9, h: 0.95, screens: [2, 2, 2], seed, lampMat: "emitAmber" });
  // yoke column rising from the console's operator edge
  const yz = z + 0.62;
  kit.box("paintedMetal", x, 0.55, yz, 0.16, 1.1, 0.16, { color: PALETTE.impBlack, texel: 2 });
  const tiltY = 0.55;
  const shaft = new THREE.CylinderGeometry(0.022, 0.022, 0.32, 10);
  shaft.rotateX(tiltY);
  kit.add("metal", shaft, { pos: [x, 1.1 + Math.cos(tiltY) * 0.16, yz + Math.sin(tiltY) * 0.16], color: PALETTE.steel, uv: "scale", uvScale: [0.15, 0.3] });
  const gy = 1.1 + Math.cos(tiltY) * 0.32;
  const gz = yz + Math.sin(tiltY) * 0.32;
  const grip = new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10);
  grip.rotateZ(Math.PI / 2);
  kit.add("rubber", grip, { pos: [x, gy, gz], color: PALETTE.impBlack, uv: "scale", uvScale: [0.15, 0.4] });
  for (const s of [-1, 1]) {
    kit.box("rubber", x + s * 0.21, gy, gz - 0.05, 0.05, 0.05, 0.14, { color: PALETTE.impBlack });
    kit.box(s < 0 ? "emitRed" : "emitAmber", x + s * 0.21, gy + 0.03, gz - 0.1, 0.02, 0.012, 0.02);
  }
  kit.collider([x - 0.1, 0, yz - 0.1], [x + 0.1, 1.1, yz + 0.1], "yoke");
  // throttle quadrant on the right-hand side
  const qx = x + 0.78;
  const qz = z + 0.72;
  kit.box("paintedMetal", qx, 0.4, qz, 0.3, 0.8, 0.36, { color: PALETTE.impDark, texel: 2 });
  kit.box("paintedMetal", qx, 0.82, qz, 0.34, 0.05, 0.4, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitAmber", qx - 0.12, 0.85, qz, 0.02, 0.01, 0.3);
  for (let k = 0; k < 3; k++) {
    const lx = qx - 0.05 + k * 0.06;
    const tilt = -0.35 + k * 0.25;
    const lever = new THREE.CylinderGeometry(0.01, 0.012, 0.26, 8);
    lever.rotateX(tilt);
    kit.add("metal", lever, { pos: [lx, 0.85 + Math.cos(tilt) * 0.13, qz + Math.sin(tilt) * 0.13], color: PALETTE.steel, uv: "scale", uvScale: [0.1, 0.3] });
    kit.add("rubber", new THREE.SphereGeometry(0.025, 10, 8), { pos: [lx, 0.85 + Math.cos(tilt) * 0.27, qz + Math.sin(tilt) * 0.27], color: k === 1 ? PALETTE.impRed : PALETTE.impBlack });
  }
  kit.collider([qx - 0.16, 0, qz - 0.19], [qx + 0.16, 0.85, qz + 0.19], "throttle");
  // seat with armrests and a headrest
  impChair(kit, ctx, { x, z: z + 1.25, yaw: 0 });
  kit.box("rubber", x, 1.28, z + 1.5, 0.3, 0.16, 0.08, { color: PALETTE.rubber });
  // rail on the floor the seat slides on
  kit.box("metal", x, 0.02, z + 1.2, 0.7, 0.04, 0.9, { color: PALETTE.impMid, texel: 2 });
}

/** Curved segmented navigation display standing on a plinth just off the forward wall. */
function displayArc(kit, ctx, cx, zWall, labels) {
  const [min, max] = ctx.bounds;
  const R = 7.2;
  const czArc = zWall + 0.2 + R; // arc centre (behind the pilots)
  const cols = 9;
  const span = 1.12; // radians of the whole arc (chord per column ≈ 0.895 m)
  const colW = 0.86;
  const gap = 0.03;
  const rows = [
    [1.06, 0.62, 2],
    [1.74, 0.62, 2],
    [2.4, 0.32, 4],
  ];
  const zAt = (a) => czArc - Math.cos(a) * R;
  const xAt = (a) => cx + Math.sin(a) * R;
  for (let c = 0; c < cols; c++) {
    const a = -span / 2 + (c + 0.5) * (span / cols);
    const x = xAt(a);
    const z = zAt(a);
    const yaw = -a; // segment faces +z (toward the pilots) rotated by the arc angle
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const at = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z)).toArray();
    // plinth + column backing (full height 2.75), header beam
    kit.add("paintedMetal", new THREE.BoxGeometry(colW + gap, 0.7, 0.55), { pos: at(0, 0.35, -0.12), quat: q, color: PALETTE.impBlack, texel: 1.5 });
    kit.add("paintedMetal", new THREE.BoxGeometry(colW + gap, 2.05, 0.3), { pos: at(0, 0.7 + 1.025, -0.1), quat: q, color: PALETTE.impDark, texel: 1.5 });
    kit.add("paintedMetal", new THREE.BoxGeometry(colW + gap, 0.22, 0.42), { pos: at(0, 2.75 + 0.11, -0.05), quat: q, color: PALETTE.impBlack, texel: 1.5 });
    kit.add("emitAmber", new THREE.BoxGeometry(colW - 0.1, 0.02, 0.01), { pos: at(0, 0.66, 0.16), quat: q });
    kit.add("emitBlue", new THREE.BoxGeometry(colW - 0.1, 0.025, 0.01), { pos: at(0, 2.8, 0.165), quat: q });
    // screens
    for (const [row, [vy, vh, idx]] of rows.entries()) {
      const sIdx = row === 2 ? (c % 3 === 1 ? 4 : 2) : c === 4 && row === 0 ? 0 : idx;
      kit.add("darkGloss", new THREE.BoxGeometry(colW - 0.06, vh + 0.03, 0.012), { pos: at(0, vy + vh / 2, 0.056), quat: q });
      kit.add("impScreen" + sIdx, new THREE.PlaneGeometry(colW - 0.1, vh), { pos: at(0, vy + vh / 2, 0.063), quat: q, uv: "keep" });
    }
    // mullion lamp between columns
    kit.add("paintedMetal", new THREE.BoxGeometry(0.05, 2.0, 0.06), { pos: at(colW / 2 + gap / 2, 1.72, 0.06), quat: q, color: PALETTE.impMid, texel: 2 });
    kit.add(c % 2 ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.02, 0.05, 0.02), { pos: at(colW / 2 + gap / 2, 0.85 + (c % 3) * 0.6, 0.095), quat: q });
    // collider (axis-aligned box around the rotated column)
    const ex = ((colW + gap) * Math.abs(Math.cos(yaw)) + 0.55 * Math.abs(Math.sin(yaw))) / 2;
    const ez = ((colW + gap) * Math.abs(Math.sin(yaw)) + 0.55 * Math.abs(Math.cos(yaw))) / 2;
    const cc = new THREE.Vector3(...at(0, 0, -0.12));
    kit.collider([cc.x - ex, 0, cc.z - ez], [cc.x + ex, 3.0, cc.z + ez], "arc");
  }
  // end caps back to the wall so the arc reads as built in, and the heading readout above
  for (const s of [-1, 1]) {
    const a = s * (span / 2);
    const x = xAt(a) + s * 0.3;
    const z0 = zAt(a) - 0.4;
    kit.boxMM("paintedMetal", [Math.min(x - 0.15, x + 0.15), 0, Math.min(z0, zWall)], [Math.max(x - 0.15, x + 0.15), 2.97, Math.max(z0, zWall)], { color: PALETTE.impDark, texel: 1.5 });
    kit.collider([x - 0.2, 0, Math.min(z0, zWall) - 0.05], [x + 0.2, 3.0, Math.max(z0, zWall)], "arccap");
  }
  const seg = wallSegment(ctx.bounds, "zmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  signPlate(frame, labels, 4, { u: cx - min[0], v: 3.25, h: 0.24 });
  signPlate(frame, labels, 3, { u: cx - min[0] - 5.4, v: 2.4, h: 0.2 });
  // flanking wall equipment: racks in the far corners, a big chart screen on each side
  wallScreen(kit, ctx, { side: "zmin", u: cx - min[0] - 5.4, v: 1.7, w: 1.6, h: 0.9, screen: 2 });
  wallScreen(kit, ctx, { side: "zmin", u: cx - min[0] + 5.4, v: 1.7, w: 1.6, h: 0.9, screen: 0 });
  ventGrille(frame, cx - min[0] + 5.4, 2.7, 1.2, 0.4);
  void max;
}

/** Overhead instrument pod: a dark housing on two struts with three down-tilted screens. */
function instrumentPod(kit, x, z, H) {
  const y = H - 0.95; // pod centre
  kit.box("paintedMetal", x, y, z, 1.3, 0.34, 0.6, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", x, y + 0.19, z, 1.1, 0.06, 0.45, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) kit.cyl("metal", x + s * 0.45, (y + 0.17 + H) / 2, z, 0.035, H - (y + 0.17), "y", { color: PALETTE.impMid, segments: 10 });
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.75);
  for (let i = 0; i < 3; i++) {
    const sx = x - 0.4 + i * 0.4;
    const p = new THREE.Vector3(sx, y - 0.14, z + 0.22);
    kit.add("darkGloss", new THREE.BoxGeometry(0.36, 0.24, 0.012), { pos: p.toArray(), quat: tilt });
    kit.add("impScreen" + (i === 1 ? 4 : 2), new THREE.PlaneGeometry(0.32, 0.2), { pos: p.clone().add(new THREE.Vector3(0, 0, 0.007).applyQuaternion(tilt)).toArray(), quat: tilt, uv: "keep" });
  }
  kit.box("emitAmber", x, y - 0.175, z - 0.1, 1.0, 0.012, 0.03);
  for (let k = 0; k < 5; k++) kit.box(k % 2 ? "emitRed" : "emitBlue", x - 0.5 + k * 0.25, y - 0.05, z - 0.305, 0.05, 0.02, 0.01);
}

/** Hexagonal floor inlay: dark hex plate with a glowing hex-cell grid, centred at (cx, cz). */
function hexInlay(kit, cx, cz, R, cell) {
  const plate = new THREE.CylinderGeometry(R + 0.25, R + 0.25, 0.008, 6);
  plate.rotateY(Math.PI / 6);
  kit.add("paintedMetal", plate, { pos: [cx, 0.004, cz], color: PALETTE.impDark, texel: 1.5 });
  kit.add("emitBlue", new THREE.CylinderGeometry(R + 0.22, R + 0.22, 0.004, 6, 1, true).rotateY(Math.PI / 6), { pos: [cx, 0.011, cz] });
  // pointy-top hex grid
  const w = Math.sqrt(3) * cell;
  const h = 2 * cell;
  const rows = Math.ceil(R / (h * 0.75)) + 1;
  const colsN = Math.ceil(R / w) + 1;
  for (let r = -rows; r <= rows; r++) {
    for (let c = -colsN; c <= colsN; c++) {
      const hx = cx + (c + (r & 1 ? 0.5 : 0)) * w;
      const hz = cz + r * h * 0.75;
      if (Math.hypot(hx - cx, hz - cz) > R - cell * 0.9) continue;
      for (let k = 0; k < 6; k++) {
        const a0 = (Math.PI / 3) * k + Math.PI / 6;
        const a1 = a0 + Math.PI / 3;
        const x0 = hx + Math.cos(a0) * cell * 0.94;
        const z0 = hz + Math.sin(a0) * cell * 0.94;
        const x1 = hx + Math.cos(a1) * cell * 0.94;
        const z1 = hz + Math.sin(a1) * cell * 0.94;
        const len = Math.hypot(x1 - x0, z1 - z0);
        kit.add("emitBlue", new THREE.BoxGeometry(len, 0.003, 0.014), { pos: [(x0 + x1) / 2, 0.0105, (z0 + z1) / 2], rot: [0, -Math.atan2(z1 - z0, x1 - x0), 0] });
      }
    }
  }
}

/** Plotting table with an amber rim, control panels, a scope disc and the star-chart hologram. */
function plottingTable(kit, ctx, x, z, labels, hm, swatch) {
  const W = 2.6;
  const D = 1.6;
  const Hh = 0.9;
  kit.box("paintedMetal", x, 0.06, z, W - 0.3, 0.12, D - 0.3, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, 0.12 + (Hh - 0.2) / 2, z, W - 0.12, Hh - 0.2, D - 0.12, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("darkGloss", x, Hh - 0.04, z, W, 0.08, D);
  kit.box("emitAmber", x, Hh - 0.005, z, W - 0.5, 0.012, 0.02);
  for (const s of [-1, 1]) {
    kit.box("emitAmber", x, Hh - 0.03, z + s * (D / 2 - 0.004), W - 0.2, 0.02, 0.01);
    kit.box("emitAmber", x + s * (W / 2 - 0.004), Hh - 0.03, z, 0.01, 0.02, D - 0.2);
    // side control panels on the long edges
    kit.box("paintedMetal", x + s * 0.7, Hh - 0.005, z + s * 0.45, 0.6, 0.02, 0.4, { color: PALETTE.impBlack, texel: 2 });
    kit.add("impScreen2", new THREE.PlaneGeometry(0.42, 0.26).rotateX(-Math.PI / 2).rotateY(s < 0 ? Math.PI : 0), { pos: [x + s * 0.7, Hh + 0.006, z + s * 0.45], uv: "keep" });
    for (let k = 0; k < 4; k++) kit.box(k % 2 ? "emitBlue" : "rubber", x + s * (0.45 + k * 0.1), Hh + 0.01, z + s * 0.62, 0.06, 0.02, 0.05, { color: PALETTE.rubber });
    // grey inset panels on the long faces
    kit.box("impPanel", x, 0.5, z + s * (D / 2 - 0.05), W - 0.5, 0.56, 0.02, { color: PALETTE.impGrey, uv: "keep" });
  }
  // scope disc in the centre and the projection cone up to the planet
  kit.cyl("paintedMetal", x, Hh + 0.004, z, 0.62, 0.008, "y", { color: PALETTE.impBlack, segments: 40 });
  kit.add("emitBlue", new THREE.TorusGeometry(0.6, 0.014, 6, 48).rotateX(Math.PI / 2), { pos: [x, Hh + 0.012, z] });
  kit.add(hm.key, new THREE.CircleGeometry(0.58, 40).rotateX(-Math.PI / 2), { pos: [x, Hh + 0.014, z], uv: "keep" });
  kit.add(hm.key, holoCone(x, Hh + 0.02, z, 0.12, 1.55, 0.62), { uv: "keep", uvRect: swatch(hm.dim) });
  hologram(kit, ctx, { x, y: 1.7, z, kind: "planet", scale: 0.7 });
  // a dim core inside the wireframe planet so the grid sphere reads from across the room,
  // a bright equatorial orbit ring and a few plotted waypoints (the course markers)
  kit.add(hm.key, new THREE.SphereGeometry(0.3, 20, 14), { pos: [x, 1.7, z], uv: "keep", uvRect: swatch(hm.dim) });
  kit.add(hm.key, new THREE.TorusGeometry(0.9, 0.012, 6, 64).rotateX(Math.PI / 2 - 0.3), { pos: [x, 1.7, z], uv: "keep", uvRect: swatch(hm.bright) });
  const wp = rng(ctx.seed + 5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + wp() * 0.4;
    const r = 0.95 + wp() * 0.35;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r * Math.cos(0.3);
    const py = 1.7 + Math.sin(a) * r * Math.sin(0.3);
    kit.add(hm.key, new THREE.OctahedronGeometry(0.035), { pos: [px, py, pz], uv: "keep", uvRect: swatch(i === 2 ? hm.amber : hm.bright) });
    if (i === 2) kit.add(hm.key, new THREE.CylinderGeometry(0.004, 0.004, py - (Hh + 0.02), 4), { pos: [px, (py + Hh + 0.02) / 2, pz], uv: "keep", uvRect: swatch(hm.amber) });
  }
  // clutter: datapads, a mug, a stylus tray
  datapad(kit, x - 0.95, Hh + 0.003, z - 0.5, 0.25, 2);
  datapad(kit, x + 0.9, Hh + 0.003, z - 0.45, -0.4, 0);
  mug(kit, x - 1.05, Hh + 0.003, z + 0.5, PALETTE.impGrey);
  kit.box("rubber", x + 1.0, Hh + 0.012, z + 0.55, 0.22, 0.02, 0.08, { color: PALETTE.impBlack });
  signAt(kit, labels, 1, { x, y: 0.55, z: z + D / 2 + 0.005, yaw: 0, h: 0.09 });
  signAt(kit, labels, 1, { x, y: 0.55, z: z - D / 2 - 0.005, yaw: Math.PI, h: 0.09 });
  kit.collider([x - W / 2, 0, z - D / 2], [x + W / 2, Hh, z + D / 2], "plottable");
}
