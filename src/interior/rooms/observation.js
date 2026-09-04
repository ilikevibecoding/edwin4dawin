// Deck 2 — Observation Gallery (sector d2_observation, seesExterior).
//
// The forward side of the gallery is a run of eleven floor-to-header windows looking out over the
// hull: thick mullions, a lit instrument sill, clear panes and a header beam; solid wall only at the
// corners. Inside: a rail along the glass, benches, low warm floor lights and star-chart plaques on
// the side walls under a dim ceiling so the exterior carries the room.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impWall, wallScreen, railing, pipeRun, wallSegment, IMP_STYLES, IMP_PAINTS_DARK, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid } from "../builders.js";
import { rng } from "../../kit.js";
import { labelAtlas, signPlate, signAt, ventGrille, cableTray, datapad, mug, floorScuffs } from "./tactical.js";
import { sheetAtlas } from "./briefing.js";

export function buildObservation(kit, ctx) {
  const [min, max] = ctx.bounds; // [-16, 0, -42] .. [16, 4, -35]
  const H = max[1];
  const zw = min[2]; // window plane (the neck's front face)
  const rand = rng(ctx.seed + 9);
  const labels = labelAtlas(ctx, "obs_labels", [
    "OBSERVATION GALLERY",
    { text: "FORWARD  ·  BEARING 000  ·  HULL AXIS", accent: "#4a9dff" },
    { text: "HOLD RAIL  ·  DECK EDGE", accent: "#ff4136", color: "#ffd9d4" },
    { text: "SECTOR CHART  ·  OUTER RIM", accent: "#ffb347", color: "#ffe6c4" },
    { text: "ISD VIGILANCE  ·  FORWARD OBSERVATION  ·  DECK 02", accent: "#4a9dff" },
    { text: "TRANSPARISTEEL  ·  DO NOT LEAN", accent: "#ffb347", color: "#ffe6c4" },
    ...Array.from({ length: 11 }, (_, i) => ({ text: `PANE  ${String(i + 1).padStart(2, "0")}`, accent: "#ffb347", color: "#ffe6c4" })),
  ]);
  const PANE0 = 6; // first pane label row
  ctx.materials.obs_warm ||= new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color("#ffe9c8"), emissiveIntensity: 1.6, roughness: 0.5, metalness: 0 });
  const sheets = sheetAtlas(ctx, "briefing_sheets");

  // shell without the window side; dark, quiet finish on the remaining walls
  roomShell(kit, ctx, {
    ceiling: false,
    skip: ["zmin"],
    walls: { paints: IMP_PAINTS_DARK, styles: { ...IMP_STYLES, conduit: 0.02, greeble: 0.05 }, panelW: 1.3 },
  });

  // --- window wall
  const run0 = -13.75;
  const run1 = 13.75;
  const panes = 11;
  const paneW = (run1 - run0) / panes; // 2.5
  const sillH = 0.9;
  const glassTop = 3.4;
  const depth = 0.5; // sill / mullion depth into the room
  // solid corners
  impWall(kit, ctx, "zmin", { from: [min[0], zw], to: [run0, zw], noDoors: true, paints: IMP_PAINTS_DARK, styles: { panel: 0.8, vent: 0.1, strip: 0.1 }, seed: 5 });
  impWall(kit, ctx, "zmin", { from: [run1, zw], to: [max[0], zw], noDoors: true, paints: IMP_PAINTS_DARK, styles: { panel: 0.8, vent: 0.1, strip: 0.1 }, seed: 6 });
  // sill body, ledge, kick and the continuous under-ledge wash light
  kit.boxMM("paintedMetal", [run0, 0, zw], [run1, sillH - 0.06, zw + depth - 0.08], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel1", [run0, 0.16, zw + depth - 0.075], [run1, sillH - 0.12, zw + depth - 0.06], { color: PALETTE.impMid, uv: "keep" });
  kit.boxMM("paintedMetal", [run0, 0, zw], [run1, 0.14, zw + depth - 0.04], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [run0 - 0.02, sillH - 0.06, zw], [run1 + 0.02, sillH, zw + depth], { color: PALETTE.impLight, texel: 1.5 });
  kit.boxMM("emitWhiteSoft", [run0 + 0.2, sillH - 0.075, zw + depth - 0.06], [run1 - 0.2, sillH - 0.06, zw + depth - 0.02], { uv: "keep" });
  kit.collider([run0, 0, zw - 0.2], [run1, sillH, zw + depth], "sill");
  // header beam with a blue reveal line and warm down-spots over each mullion
  kit.boxMM("paintedMetal", [run0 - 0.02, glassTop, zw], [run1 + 0.02, H, zw + depth], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("paintedMetal", [run0, glassTop, zw], [run1, glassTop + 0.08, zw + depth + 0.03], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitBlue", [run0 + 0.3, glassTop + 0.1, zw + depth - 0.005], [run1 - 0.3, glassTop + 0.13, zw + depth + 0.008]);
  signPlate(wallFrame(kit, [run0, zw + depth], [run1, zw + depth], 0).frame, labels, 1, { u: (run1 - run0) / 2, v: (glassTop + H) / 2 + 0.05, h: 0.2 });
  // panes: glass, instrument tray in the sill, pane number, a warm spot in the header
  for (let i = 0; i < panes; i++) {
    const x0 = run0 + i * paneW;
    const x1 = x0 + paneW;
    const xc = (x0 + x1) / 2;
    kit.add("bridgeGlass", new THREE.PlaneGeometry(paneW - 0.3, glassTop - sillH), { pos: [xc, (sillH + glassTop) / 2, zw + 0.12], uv: "keep" });
    // slim black glazing bead around the pane
    kit.boxMM("paintedMetal", [x0 + 0.13, sillH, zw + 0.08], [x1 - 0.13, sillH + 0.04, zw + 0.16], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("paintedMetal", [x0 + 0.13, glassTop - 0.04, zw + 0.08], [x1 - 0.13, glassTop, zw + 0.16], { color: PALETTE.impBlack, texel: 2 });
    // instrument tray: a readout tilted toward the room with a row of small lamps, set into the ledge
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5);
    const tz = zw + depth - 0.22;
    const tp = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(tilt).add(new THREE.Vector3(xc, sillH + 0.06, tz)).toArray();
    kit.add("paintedMetal", new THREE.BoxGeometry(0.9, 0.04, 0.3), { pos: [xc, sillH + 0.06, tz], quat: tilt, color: PALETTE.impBlack, texel: 2 });
    kit.add("impScreen" + ((i * 3 + 1) % 5), new THREE.PlaneGeometry(0.6, 0.2).rotateX(-Math.PI / 2), { pos: tp(0, 0.021, 0.02), quat: tilt, uv: "keep" });
    for (let k = 0; k < 4; k++) kit.add(k === i % 4 ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.06, 0.012, 0.03), { pos: tp(-0.3 + k * 0.2, 0.024, -0.11), quat: tilt });
    // header spot under the beam: dark can with a warm disc washing the sill
    kit.cyl("paintedMetal", xc, glassTop - 0.06, zw + depth - 0.18, 0.11, 0.12, "y", { color: PALETTE.impBlack, segments: 14 });
    kit.cyl("obs_warm", xc, glassTop - 0.125, zw + depth - 0.18, 0.08, 0.01, "y", { segments: 14, uv: "keep" });
  }
  // mullions (12): grey column with a black rebate, a small white marker light and pane numbers
  for (let i = 0; i <= panes; i++) {
    const x = run0 + i * paneW;
    kit.boxMM("paintedMetal", [x - 0.16, 0, zw], [x + 0.16, H, zw + depth + 0.06], { color: PALETTE.impGrey, texel: 1.5 });
    kit.boxMM("paintedMetal", [x - 0.07, sillH, zw + depth + 0.06], [x + 0.07, glassTop, zw + depth + 0.075], { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitWhiteSoft", x, 1.3, zw + depth + 0.077, 0.03, 0.12, 0.006, { uv: "keep" });
    kit.collider([x - 0.16, 0, zw], [x + 0.16, H, zw + depth + 0.06], "mullion");
    if (i < panes) {
      // pane number plate on the mullion's right cheek (reads walking along the rail)
      const w = 0.07 * labels.aspect(PANE0 + i);
      kit.add(labels.key, new THREE.PlaneGeometry(w, 0.07).rotateY(Math.PI / 2), { pos: [x + 0.161, 2.9, zw + depth / 2 + 0.15], uv: "keep", uvRect: labels.rect(PANE0 + i) });
    }
  }
  // "do not lean" plates on two mullions
  for (const i of [2, 8]) signAt(kit, labels, 5, { x: run0 + i * paneW, y: 1.05, z: zw + depth + 0.09, yaw: 0, h: 0.06, bezel: false });

  // --- rail 0.5 m behind the sill with warm floor lights along it and a dark runner
  const railZ = zw + depth + 0.5;
  railing(kit, run0 + 0.2, railZ, run1 - 0.2, railZ, 0, { h: 1.05 });
  kit.box("paintedMetal", 0, 0.004, railZ + 0.45, run1 - run0 - 0.4, 0.008, 0.9, { color: PALETTE.impBlack, texel: 1.5 });
  for (let i = 0; i <= panes; i++) {
    const x = run0 + i * paneW;
    kit.cyl("paintedMetal", x, 0.012, railZ + 0.6, 0.11, 0.024, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.cyl("obs_warm", x, 0.026, railZ + 0.6, 0.08, 0.006, "y", { segments: 16, uv: "keep" });
  }
  // "hold rail" plates hanging from the top bar at the rail ends
  for (const s of [-1, 1]) signAt(kit, labels, 2, { x: s * (run1 - 0.9), y: 0.96, z: railZ + 0.03, yaw: 0, h: 0.1 });

  // --- benches facing the windows, light bollards between them, a viewing pedestal at the centre
  const bz = -38.4;
  for (const x of [-9.5, -3.6, 3.6, 9.5]) bench(kit, x, bz, 2.4, rand);
  for (const x of [-12.8, -6.55, 0, 6.55, 12.8]) bollard(kit, x, bz + 0.2);
  pedestal(kit, ctx, labels, 0, -40.0);
  // macrobinocular stands at the rail
  for (const x of [-7.3, 7.3]) binoculars(kit, x, railZ + 0.55);
  // wall benches against the aft wall either side of the door, with backrests
  for (const x of [-6.4, 6.4]) {
    kit.boxMM("paintedMetal", [x - 1.5, 0, max[2] - 0.75], [x + 1.5, 0.42, max[2] - 0.2], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("fabric", [x - 1.45, 0.42, max[2] - 0.75], [x + 1.45, 0.5, max[2] - 0.22], { color: PALETTE.impBlack, uv: "world", texel: 2 });
    kit.boxMM("fabric", [x - 1.45, 0.5, max[2] - 0.3], [x + 1.45, 1.0, max[2] - 0.2], { color: PALETTE.impBlack, uv: "world", texel: 2 });
    kit.boxMM("paintedMetal", [x - 1.5, 1.0, max[2] - 0.32], [x + 1.5, 1.04, max[2] - 0.18], { color: PALETTE.impGrey, texel: 2 });
    kit.boxMM("obs_warm", [x - 1.3, 0.08, max[2] - 0.76], [x + 1.3, 0.1, max[2] - 0.75], { uv: "keep" });
    kit.collider([x - 1.5, 0, max[2] - 0.75], [x + 1.5, 1.05, max[2]], "wallbench");
  }

  // --- aft wall (zmax): door sign, chart screens, comm panel; side walls: plaques, vents, conduits
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from xmax (u=0) to xmin
    const uAt = (x) => max[0] - x;
    signPlate(frame, labels, 0, { u: uAt(0), v: 3.3, h: 0.26 });
    for (const [x, s] of [[-4.2, 0], [4.2, 2], [-11.5, 4], [11.5, 1]]) wallScreen(kit, ctx, { side: "zmax", u: uAt(x), v: 2.1, w: 1.5, h: 0.85, screen: s });
    signPlate(frame, labels, 3, { u: uAt(-4.2), v: 2.75, h: 0.14 });
    signPlate(frame, labels, 3, { u: uAt(4.2), v: 2.75, h: 0.14 });
    frame.box("paintedMetal", uAt(1.9), 1.4, 0.05, 0.34, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
    frame.box("impScreen4", uAt(1.9), 1.5, 0.101, 0.26, 0.16, 0.006, { uv: "keep" });
    frame.box("emitBlue", uAt(1.95), 1.25, 0.101, 0.05, 0.03, 0.006);
    frame.box("emitAmber", uAt(1.83), 1.25, 0.101, 0.05, 0.03, 0.006);
    ventGrille(frame, uAt(-14.5), 3.5, 1.2, 0.34);
    ventGrille(frame, uAt(14.5), 3.5, 1.2, 0.34);
    floorScuffs(kit, 0, max[2] - 1.2, { n: 7, len: 1.1, yaw: Math.PI / 2, seed: 91 });
  }
  for (const side of ["xmin", "xmax"]) {
    const seg = wallSegment(ctx.bounds, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // framed chart sheets + one screen per side wall
    for (const [u, idx] of [[1.6, 1], [2.55, 2]]) {
      frame.box("paintedMetal", u, 1.75, 0.03, 0.86, 1.06, 0.05, { color: PALETTE.impBlack, texel: 2 });
      frame.add(sheets.key, new THREE.PlaneGeometry(0.7, 0.875), u, 1.75, 0.058, { uv: "keep", uvRect: sheets.rect(idx) });
      frame.box("emitWhiteSoft", u, 2.34, 0.06, 0.6, 0.02, 0.02, { uv: "keep" });
    }
    wallScreen(kit, ctx, { side, u: length - 1.6, v: 1.8, w: 1.4, h: 0.8, screen: side === "xmin" ? 2 : 0 });
    signPlate(frame, labels, 3, { u: 2.1, v: 2.55, h: 0.12 });
    ventGrille(frame, length / 2, 3.5, 1.0, 0.3);
    frame.cylU("metal", length / 2, 0.3, 0.05, 0.03, length - 0.6, { color: PALETTE.impMid });
    frame.cylU("metal", length / 2, 0.42, 0.05, 0.02, length - 0.6, { color: PALETTE.steel });
  }

  // --- ceiling: dark grid, a recessed blue channel along the room, dim warm downlights over the benches
  {
    const f = ceilingFrame(kit, min[0], min[2], H);
    panelGrid(f, max[0] - min[0], max[2] - min[2], { rowH: 1.4, panelW: 1.6, kick: false, topPipes: false, seed: ctx.seed * 17 + 31, collide: false, styles: { panel: 0.9, greeble: 0.04, vent: 0.06 }, paints: [[PALETTE.impMid, 0.55], [PALETTE.impDark, 0.35], [PALETTE.impGrey, 0.1]], ...IMP_THEME, decals: false });
    kit.boxMM("paintedMetal", [min[0] + 0.8, H - 0.12, -38.6], [max[0] - 0.8, H, -38.2], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("emitBlue", [min[0] + 1.0, H - 0.13, -38.5], [max[0] - 1.0, H - 0.115, -38.3]);
    for (const x of [-9.5, -3.6, 3.6, 9.5]) {
      kit.cyl("paintedMetal", x, H - 0.1, bz + 0.7, 0.22, 0.14, "y", { color: PALETTE.impBlack, segments: 20 });
      kit.cyl("obs_warm", x, H - 0.175, bz + 0.7, 0.15, 0.01, "y", { segments: 20, uv: "keep" });
    }
    // white entry strip at the door and a cable tray feeding the header spots
    kit.boxMM("paintedMetal", [-1.4, H - 0.1, max[2] - 1.0], [1.4, H, max[2] - 0.6], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("emitWhiteSoft", [-1.2, H - 0.12, max[2] - 0.9], [1.2, H - 0.09, max[2] - 0.7], { uv: "keep" });
    cableTray(kit, [min[0] + 0.3, H - 0.14, zw + depth + 0.3], [max[0] - 0.3, H - 0.14, zw + depth + 0.3], { w: 0.26, count: 4 });
  }
  pipeRun(kit, [[min[0] + 0.3, H - 0.3, zw + depth + 0.3], [min[0] + 0.3, 0.42, zw + depth + 0.3]], 0.03, PALETTE.steel);

  // --- lights (5): dim warm over the benches, cool at the glass, white at the door
  ctx.light(pointLight(0xffd9a8, 2.6, 9.0, [-7.5, 3.2, bz + 0.5]));
  ctx.light(pointLight(0xffd9a8, 2.6, 9.0, [7.5, 3.2, bz + 0.5]));
  ctx.light(pointLight(0x9fb8e0, 2.2, 10.0, [0, 2.4, zw + 1.2]));
  ctx.light(pointLight(0xe8f0ff, 2.6, 6.0, [0, H - 0.5, max[2] - 1.2]));
  ctx.light(pointLight(0x9fb8e0, 1.6, 8.0, [0, 2.8, -38.4]));
  if (ctx.audioZone) ctx.audioZone({ id: "obs_quiet", pos: [0, 1.5, -38.5], radius: 12, loop: "hum_low" });
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
/** Backless gallery bench (long axis along x) with a warm light under the seat lip and something left on it. */
function bench(kit, x, z, len, rand) {
  kit.box("rubber", x, 0.2, z, len - 0.3, 0.4, 0.5, { color: PALETTE.rubber, texel: 1.5 });
  for (const s of [-1, 1]) kit.box("paintedMetal", x + s * (len / 2 - 0.1), 0.24, z, 0.08, 0.48, 0.62, { color: PALETTE.impMid, texel: 2 });
  kit.box("rubber", x, 0.47, z, len - 0.2, 0.1, 0.6, { color: PALETTE.rubber, texel: 2 });
  kit.box("obs_warm", x, 0.06, z - 0.255, len - 0.5, 0.015, 0.01, { uv: "keep" });
  kit.box("obs_warm", x, 0.06, z + 0.255, len - 0.5, 0.015, 0.01, { uv: "keep" });
  kit.collider([x - len / 2, 0, z - 0.32], [x + len / 2, 0.52, z + 0.32], "bench");
  const r = rand();
  if (r < 0.5) datapad(kit, x + (rand() - 0.5) * 1.4, 0.52, z + (rand() - 0.5) * 0.2, rand() * Math.PI, Math.floor(rand() * 5));
  else if (r < 0.8) mug(kit, x + (rand() - 0.5) * 1.6, 0.52, z, PALETTE.impLight);
}

/** Short light bollard: dark post with a warm cap, a marker at the base. */
function bollard(kit, x, z) {
  kit.box("paintedMetal", x, 0.3, z, 0.16, 0.6, 0.16, { color: PALETTE.impDark, texel: 2 });
  kit.box("paintedMetal", x, 0.63, z, 0.2, 0.06, 0.2, { color: PALETTE.impBlack, texel: 2 });
  kit.box("obs_warm", x, 0.595, z, 0.14, 0.01, 0.14, { uv: "keep" });
  kit.box("paintedMetal", x, 0.03, z, 0.24, 0.06, 0.24, { color: PALETTE.impBlack, texel: 2 });
  kit.collider([x - 0.12, 0, z - 0.12], [x + 0.12, 0.66, z + 0.12], "bollard");
}

/** Viewing pedestal: angled plaque with the ship's name over a lit column, facing the door. */
function pedestal(kit, ctx, labels, x, z) {
  kit.box("paintedMetal", x, 0.06, z, 0.7, 0.12, 0.7, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, 0.55, z, 0.4, 0.86, 0.4, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("emitWhiteSoft", x, 0.2, z + 0.201, 0.3, 0.02, 0.006, { uv: "keep" });
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.55);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.9, 0.06, 0.5), { pos: [x, 1.02, z + 0.05], quat: tilt, color: PALETTE.impBlack, texel: 2 });
  const w = 0.07 * labels.aspect(4);
  kit.add(labels.key, new THREE.PlaneGeometry(w, 0.07).rotateX(-Math.PI / 2), { pos: new THREE.Vector3(0, 0.032, 0.02).applyQuaternion(tilt).add(new THREE.Vector3(x, 1.02, z + 0.05)).toArray(), quat: tilt, uv: "keep", uvRect: labels.rect(4) });
  kit.add("impScreen2", new THREE.PlaneGeometry(0.7, 0.22).rotateX(-Math.PI / 2), { pos: new THREE.Vector3(0, 0.031, -0.12).applyQuaternion(tilt).add(new THREE.Vector3(x, 1.02, z + 0.05)).toArray(), quat: tilt, uv: "keep" });
  kit.collider([x - 0.45, 0, z - 0.35], [x + 0.45, 1.2, z + 0.35], "pedestal");
  void ctx;
}

/** Macrobinoculars on a tripod at the rail. */
function binoculars(kit, x, z) {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    const g = new THREE.CylinderGeometry(0.012, 0.016, 1.25, 8);
    g.translate(0, 0.625, 0);
    g.rotateX(0.22);
    g.rotateY(-a);
    kit.add("metal", g, { pos: [x, 0, z], color: PALETTE.impMid, uv: "scale", uvScale: [0.1, 1.2] });
  }
  kit.cyl("paintedMetal", x, 1.25, z, 0.05, 0.08, "y", { color: PALETTE.impBlack, segments: 12 });
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.25);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.3, 0.14, 0.34), { pos: [x, 1.36, z - 0.02], quat: tilt, color: PALETTE.impDark, texel: 3 });
  for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12);
    g.rotateX(Math.PI / 2);
    kit.add("darkGloss", g, { pos: new THREE.Vector3(s * 0.09, 0, -0.22).applyQuaternion(tilt).add(new THREE.Vector3(x, 1.36, z - 0.02)).toArray(), quat: tilt });
  }
  kit.box("emitBlue", x, 1.43, z + 0.15, 0.06, 0.012, 0.03);
  kit.collider([x - 0.3, 0, z - 0.3], [x + 0.3, 1.5, z + 0.3], "binoculars");
}
