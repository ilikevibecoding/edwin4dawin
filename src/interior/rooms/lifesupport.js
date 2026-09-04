// Deck 3 — Life Support Systems (d3_lifesupport): air, water and waste. Three water tanks along the
// south wall and two O2 reserve tanks along the north, filtration cabinets, pumps with turning
// flywheels, a header manifold with valve wheels and gauges along the far wall, a grated lit service
// trench down the middle, a control station by the door and a waste processor with hazard markings.
// Green / white light, humidity streaks low on the walls. Deck-local metres, floor y = 0.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { impWall, wallScreen, impConsole, impChair, crate, pipeRun, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { ensureCrewMaterials, SIGN, signRect, numeralRect, wallSign, floorGrime, scuffRun, wallGrime, cableTray, ventGrille, gauge, intercom, valveWheel, propFrame } from "./crewProps.js";

// light plate mix (the mid/dark mix read as murky racks under the neutral light)
const LS_PAINTS = [
  [PALETTE.impGrey, 0.4],
  [PALETTE.impLight, 0.3],
  [PALETTE.impMid, 0.3],
];
const LS_STYLES = { panel: 0.5, vent: 0.16, greeble: 0.12, strip: 0.05, screen: 0.02, conduit: 0.15 };

/**
 * Big storage tank on a base ring: bands, seams, a light mid band, a flattened dome, lit label plate,
 * stencilled tank number, level gauge, ladder.
 */
function tank(kit, ctx, { x, z, r, h, color, label, accent, facing, seed, ladder = true, number = 1, numeralColor = PALETTE.impWhite }) {
  const rand = rng(seed);
  const y0 = 0.3;
  kit.cyl("paintedMetal", x, 0.15, z, r + 0.18, 0.3, "y", { color: PALETTE.impBlack, segments: 32, texel: 2 });
  kit.cyl("paintedMetal", x, y0 + h / 2, z, r, h, "y", { color, segments: 40, texel: 0.6 });
  // wide light mid band (1 m) between the seams: the drums read as more than dark cylinders and it
  // carries the big black tank numeral toward the door
  const bandY = y0 + h * 0.5;
  kit.cyl("paintedMetal", x, bandY, z, r + 0.015, 1.0, "y", { color: PALETTE.impLight, segments: 40, texel: 0.6 });
  for (const k of [0.22, 0.78]) kit.add("paintedMetal", new THREE.TorusGeometry(r + 0.02, 0.05, 8, 48), { pos: [x, y0 + h * k, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.impDark, texel: 2 });
  for (const dy of [-0.5, 0.5]) kit.add("paintedMetal", new THREE.TorusGeometry(r + 0.02, 0.035, 8, 48), { pos: [x, bandY + dy, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.impBlack, texel: 2 });
  kit.add("paintedMetal", new THREE.TorusGeometry(r + 0.04, 0.07, 8, 48), { pos: [x, y0 + 0.08, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.impBlack, texel: 2 });
  // four plate seams on the diagonals so the door face and the trench face stay clear for the numerals
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("paintedMetal", x + Math.cos(a) * r, y0 + h / 2, z + Math.sin(a) * r, 0.05, h - 0.1, 0.09, { color: PALETTE.impDark, texel: 2, rot: [0, -a, 0] });
  }
  // big black tank numeral on the band, on the face toward the door (+x): the fixed view looks along
  // the trench, so a numeral on the trench face alone is seen edge-on
  {
    const nr = r + 0.035;
    const size = 0.86;
    const th = size / nr;
    const g = new THREE.CylinderGeometry(nr, nr, size, 14, 1, true, Math.PI / 2 - th / 2, th);
    kit.add("crew_numeral", g, { pos: [x, bandY, z], uv: "keep", uvRect: numeralRect(number), color: PALETTE.impBlack });
  }
  const dome = new THREE.SphereGeometry(r, 36, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.38, 1);
  kit.add("paintedMetal", dome, { pos: [x, y0 + h, z], color, uv: "world", texel: 0.6 });
  kit.cyl("paintedMetal", x, y0 + h + r * 0.38, z, 0.3, 0.2, "y", { color: PALETTE.impDark, segments: 16, texel: 2 });
  // pipe from the crown up to the ceiling header
  pipeRun(kit, [[x, y0 + h + r * 0.38 + 0.1, z], [x, 4.5 - 0.35, z]], 0.12, PALETTE.impMid);
  kit.add("metal", new THREE.TorusGeometry(0.16, 0.03, 8, 16), { pos: [x, y0 + h + r * 0.38 + 0.25, z], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel });
  // label plate + level gauge facing the trench
  const fz = z + facing * (r + 0.02);
  const F = propFrame(kit, x, fz, facing > 0 ? 0 : Math.PI);
  // the plate runs back into the drum so its outer edges meet the curved surface instead of floating
  F.box("paintedMetal", 0, 1.85, -0.16, 1.8, 0.9, 0.48, { color: PALETTE.impBlack, texel: 2 });
  F.add("crew_signLit", new THREE.PlaneGeometry(1.6, 0.4), 0, 2.05, 0.085, { uv: "keep", uvRect: signRect(label) });
  F.box("darkGloss", 0.35, 1.6, 0.082, 0.5, 0.1, 0.006);
  F.box("leds", -0.3, 1.6, 0.082, 0.5, 0.05, 0.006, { uv: "keep" });
  // small stencilled tank number above the plate on the trench face (the big one faces the door)
  {
    const nr = r + 0.012;
    const size = 0.42;
    const th = size / nr;
    const g = new THREE.CylinderGeometry(nr, nr, size, 12, 1, true, (facing > 0 ? 0 : Math.PI) - th / 2, th);
    kit.add("crew_numeral", g, { pos: [x, y0 + h * 0.78 + 0.32, z], uv: "keep", uvRect: numeralRect(number), color: numeralColor });
  }
  // vertical sight gauge: dark slot with the liquid/gas column part-filled
  const fill = 0.35 + rand() * 0.55;
  F.box("paintedMetal", 0, 1.0, 0.04, 0.22, 1.3, 0.08, { color: PALETTE.impDark, texel: 2 });
  F.box("rubber", 0, 1.0, 0.082, 0.1, 1.2, 0.006, { color: PALETTE.rubber });
  F.box(accent, 0, 0.4 + 1.2 * fill * 0.5, 0.084, 0.08, 1.2 * fill, 0.006);
  for (let k = 0; k < 6; k++) F.box("metal", 0.09, 0.45 + k * 0.22, 0.085, 0.03, 0.01, 0.006, { color: PALETTE.steel });
  F.add("decal", new THREE.PlaneGeometry(0.35, 0.35), -0.45, 0.75, 0.084, { uv: "keep", uvRect: decalRect(label === SIGN.O2 ? 4 : 9) });
  // ladder rungs up one side, a manway hatch low down
  if (ladder) {
    // on the far (-x) side, so the door face keeps its numeral
    const lx = x - r - 0.12;
    for (let k = 0; k < 11; k++) kit.cyl("metal", lx, 0.6 + k * 0.32, z, 0.014, 0.4, "z", { color: PALETTE.steel, segments: 6 });
    for (const dz of [-0.2, 0.2]) kit.box("metal", lx, y0 + h * 0.45, z + dz, 0.03, h * 0.9, 0.03, { color: PALETTE.steel });
    for (const yy of [1.0, 2.6]) kit.box("paintedMetal", lx + 0.06, yy, z, 0.12, 0.04, 0.5, { color: PALETTE.impDark, texel: 2 });
  }
  kit.cyl("paintedMetal", x, 0.9, z - facing * (r - 0.05), 0.3, 0.14, "z", { color: PALETTE.impDark, segments: 20, texel: 2 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    kit.cyl("metal", x + Math.cos(a) * 0.25, 0.9 + Math.sin(a) * 0.25, z - facing * (r + 0.03), 0.02, 0.04, "z", { color: PALETTE.steel, segments: 6 });
  }
  // drain valve at the base toward the trench
  pipeRun(kit, [[x + 0.5, 0.45, fz - facing * 0.3], [x + 0.5, 0.45, fz + facing * 0.55]], 0.07, PALETTE.impMid);
  valveWheel(kit, x + 0.5, 0.6, fz + facing * 0.3, 0.13, "y", PALETTE.impRed);
  kit.collider([x - r - 0.2, 0, z - r - 0.2], [x + r + 0.2, 4.4, z + r + 0.2], "tank");
  // damp ring on the deck around the base
  floorGrime(kit, x + (rand() - 0.5) * 0.4, fz + facing * 0.6, r * 1.6, 1.2, rand());
}

/** Pump: motor drum along x on a bed, a coupling and a flywheel turning about x (separate mesh). */
function pump(kit, ctx, x, z, seed, phase) {
  const rand = rng(seed);
  kit.box("paintedMetal", x, 0.12, z, 1.7, 0.24, 0.9, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, 0.42, z, 1.4, 0.36, 0.7, { color: PALETTE.impDark, texel: 2 });
  kit.cyl("paintedMetal", x + 0.15, 0.85, z, 0.32, 0.9, "x", { color: PALETTE.impGrey, segments: 20, texel: 1.5 });
  for (let k = 0; k < 7; k++) kit.add("paintedMetal", new THREE.TorusGeometry(0.34, 0.02, 6, 20), { pos: [x - 0.25 + k * 0.13, 0.85, z], rot: [0, Math.PI / 2, 0], color: PALETTE.impDark, texel: 2 });
  kit.box("paintedMetal", x + 0.15, 1.2, z, 0.5, 0.18, 0.36, { color: PALETTE.impMid, texel: 2 });
  kit.box("emitGreen", x + 0.15, 1.24, z + 0.185, 0.16, 0.04, 0.01);
  kit.box("leds", x + 0.15, 1.16, z + 0.185, 0.3, 0.03, 0.006, { uv: "keep" });
  // pump head on the other end with the inlet / outlet pipes
  kit.cyl("paintedMetal", x - 0.55, 0.85, z, 0.36, 0.3, "x", { color: PALETTE.impMid, segments: 20, texel: 1.5 });
  kit.cyl("paintedMetal", x - 0.75, 0.85, z, 0.4, 0.08, "x", { color: PALETTE.impBlack, segments: 20, texel: 2 });
  pipeRun(kit, [[x - 0.55, 1.15, z], [x - 0.55, 1.6, z], [x - 0.55, 1.6, z - 0.9], [x - 0.55, -0.1, z - 0.9]], 0.1, PALETTE.impMid);
  pipeRun(kit, [[x - 0.55, 0.6, z], [x - 0.55, 0.6, z + 0.6], [x - 0.55, -0.4, z + 0.6]], 0.1, PALETTE.impMid);
  valveWheel(kit, x - 0.55, 1.75, z - 0.45, 0.12, "y", PALETTE.impRed);
  // flywheel + coupling: rotates about x
  const mk = new Kit(ctx.materials);
  mk.add("paintedMetal", new THREE.TorusGeometry(0.42, 0.05, 10, 32), { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impDark, texel: 2 });
  for (let k = 0; k < 4; k++) mk.box("metal", 0, 0, 0, 0.05, 0.84, 0.06, { color: PALETTE.steel, rot: [(k / 4) * Math.PI, 0, 0] });
  mk.cyl("metal", 0, 0, 0, 0.1, 0.12, "x", { color: PALETTE.steel, segments: 12 });
  mk.box("emitAmber", 0, 0.36, 0, 0.04, 0.06, 0.04);
  const g = new THREE.Group();
  g.position.set(x + 0.7, 0.85, z);
  mk.build(g, { castShadow: false, receiveShadow: true });
  ctx.mesh(g);
  const speed = 1.6 + rand() * 1.2;
  ctx.anim((dt, t) => {
    g.rotation.x = t * speed + phase;
  });
  // guard cage around the wheel
  for (const s of [-1, 1]) kit.box("metal", x + 0.7, 0.85 + s * 0.5, z, 0.16, 0.03, 0.9, { color: PALETTE.impMid });
  for (const s of [-1, 1]) kit.box("metal", x + 0.7, 0.85, z + s * 0.45, 0.16, 1.0, 0.03, { color: PALETTE.impMid });
  kit.collider([x - 0.95, 0, z - 0.5], [x + 0.85, 1.3, z + 0.5], "pump");
  kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [x + 0.1, 0.42, z + 0.36], uv: "keep", uvRect: decalRect(5) });
}

/** Filtration cabinet: glass-fronted bay with three cartridge cylinders, lamp row, hopper duct on top. */
function filterUnit(kit, ctx, x, z, facing, seed) {
  const rand = rng(seed);
  const F = propFrame(kit, x, z, facing > 0 ? 0 : Math.PI);
  const w = 2.0;
  const d = 1.0;
  const h = 2.5;
  F.box("paintedMetal", 0, 0.06, 0, w + 0.1, 0.12, d + 0.1, { color: PALETTE.impBlack, texel: 2 });
  F.box("impPanel1", 0, h / 2, -0.1, w, h, d - 0.2, { color: PALETTE.impGrey, uv: "world", texel: 0.6 });
  // open bay with the cartridges behind a glass pane
  F.box("paintedMetal", 0, 1.35, d / 2 - 0.25, w - 0.3, 1.7, 0.02, { color: PALETTE.impBlack, texel: 2 });
  for (let i = 0; i < 3; i++) {
    const lx = -0.55 + i * 0.55;
    F.cyl("metal", lx, 1.35, d / 2 - 0.05, 0.17, 1.5, "y", { color: PALETTE.steel, segments: 16 });
    for (let k = 0; k < 5; k++) F.add("paintedMetal", new THREE.TorusGeometry(0.18, 0.015, 6, 16).rotateX(Math.PI / 2), lx, 0.75 + k * 0.3, d / 2 - 0.05, { color: PALETTE.impDark, texel: 2 });
    F.box(rand() < 0.8 ? "emitGreen" : "emitAmber", lx, 2.2, d / 2 - 0.05, 0.08, 0.05, 0.36);
  }
  F.add("crew_glass", new THREE.PlaneGeometry(w - 0.3, 1.7), 0, 1.35, d / 2 + 0.005, { uv: "keep" });
  for (const s of [-1, 1]) F.box("paintedMetal", s * (w / 2 - 0.1), 1.35, d / 2, 0.16, 1.8, 0.06, { color: PALETTE.impDark, texel: 2 });
  F.box("paintedMetal", 0, 2.3, d / 2, w, 0.16, 0.06, { color: PALETTE.impDark, texel: 2 });
  F.box("paintedMetal", 0, 0.42, d / 2, w, 0.16, 0.06, { color: PALETTE.impDark, texel: 2 });
  // control strip under the bay, vent slots low down
  F.box("darkGloss", -0.4, 0.3, d / 2 + 0.035, 0.7, 0.14, 0.01);
  F.add("impScreen3", new THREE.PlaneGeometry(0.6, 0.1), -0.4, 0.3, d / 2 + 0.042, { uv: "keep" });
  for (let k = 0; k < 5; k++) F.box(k < 4 ? "emitGreen" : "emitRed", 0.25 + k * 0.12, 0.3, d / 2 + 0.04, 0.06, 0.06, 0.01);
  for (let k = 0; k < 4; k++) F.box("paintedMetal", 0, 0.14 + k * 0.05, d / 2 + 0.03, w - 0.5, 0.015, 0.02, { color: PALETTE.impBlack, texel: 2 });
  // hopper duct on top into the ceiling
  F.box("paintedMetal", 0, h + 0.25, -0.1, 0.9, 0.5, 0.6, { color: PALETTE.impMid, texel: 1.5 });
  F.box("paintedMetal", 0, (h + 0.5 + 4.5) / 2, -0.1, 0.6, 4.5 - h - 0.5, 0.45, { color: PALETTE.impDark, texel: 1.5 });
  F.add("crew_signLit", new THREE.PlaneGeometry(0.8, 0.2), 0.45, h - 0.05, d / 2 + 0.035, { uv: "keep", uvRect: signRect(SIGN.O2) });
  F.collider(-w / 2 - 0.05, -d / 2 - 0.05, w / 2 + 0.05, d / 2 + 0.05, h, "filter");
}

/** Waste processor: hopper, compactor drum, hazard-striped loading door, red beacon and a bin cart. */
function wasteUnit(kit, ctx, x, z) {
  const F = propFrame(kit, x, z, Math.PI); // front faces -z (toward the trench)
  F.box("paintedMetal", 0, 0.08, 0, 3.6, 0.16, 2.4, { color: PALETTE.impBlack, texel: 2 });
  F.box("impPanel1", 0, 1.5, -0.2, 3.4, 2.7, 1.9, { color: PALETTE.impDark, uv: "world", texel: 0.6 });
  // drum on top with a hopper mouth and a stirrer motor
  F.cyl("paintedMetal", 0.6, 3.3, -0.2, 0.75, 1.4, "x", { color: PALETTE.impMid, segments: 24, texel: 1.5 });
  for (const dx of [-0.1, 1.3]) F.add("paintedMetal", new THREE.TorusGeometry(0.77, 0.05, 8, 32).rotateY(Math.PI / 2), dx, 3.3, -0.2, { color: PALETTE.impBlack, texel: 2 });
  F.box("paintedMetal", -1.1, 3.2, -0.2, 0.9, 0.9, 0.9, { color: PALETTE.impDark, texel: 1.5 });
  F.box("paintedMetal", -1.1, 3.66, -0.2, 0.95, 0.04, 0.95, { color: PALETTE.impBlack, texel: 2 });
  F.cyl("paintedMetal", -1.1, 3.9, -0.2, 0.28, 0.5, "y", { color: PALETTE.impBlack, segments: 16, texel: 2 });
  // loading door with hazard frame, handle wheel, small viewport
  F.box("hazard", 0.3, 1.3, 0.76, 1.5, 1.5, 0.02, { texel: 3 });
  F.box("paintedMetal", 0.3, 1.3, 0.78, 1.26, 1.26, 0.04, { color: PALETTE.impGrey, texel: 2 });
  valveWheel(kit, ...F.at(0.3, 1.3, 0.86).toArray(), 0.18, "z", PALETTE.impRed);
  F.cyl("paintedMetal", 0.3, 1.75, 0.8, 0.14, 0.02, "z", { color: PALETTE.impBlack, segments: 16, texel: 2 });
  F.add("emitRedSoft", new THREE.CircleGeometry(0.1, 16), 0.3, 1.75, 0.812, { uv: "keep" });
  // side panel: screen, lamps, biohazard / waste signs, red beacon on top
  F.box("darkGloss", -1.1, 1.7, 0.77, 0.7, 0.4, 0.01);
  F.add("impScreen1", new THREE.PlaneGeometry(0.62, 0.32), -1.1, 1.7, 0.777, { uv: "keep" });
  for (let k = 0; k < 4; k++) F.box(k === 2 ? "emitRed" : "emitAmber", -1.35 + k * 0.17, 1.35, 0.775, 0.08, 0.05, 0.01);
  F.add("crew_signLit", new THREE.PlaneGeometry(1.0, 0.25), -1.1, 2.35, 0.77, { uv: "keep", uvRect: signRect(SIGN.WASTE) });
  F.add("crew_sign", new THREE.PlaneGeometry(1.0, 0.25), -1.1, 0.75, 0.77, { uv: "keep", uvRect: signRect(SIGN.BIOHAZARD) });
  F.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 1.35, 0.6, 0.77, { uv: "keep", uvRect: decalRect(1) });
  F.cyl("paintedMetal", 1.3, 2.95, 0.6, 0.12, 0.1, "y", { color: PALETTE.impBlack, segments: 14, texel: 2 });
  F.cyl("crew_alert", 1.3, 3.1, 0.6, 0.09, 0.2, "y", { segments: 14 });
  // ducting from the drum to the wall and a plain black kick line on the deck in front (the
  // hazard-framed loading door is the unit's signature; the deck around it stays quiet)
  pipeRun(kit, [F.at(1.4, 3.3, -0.2).toArray(), F.at(1.4, 3.3, -1.4).toArray(), F.at(1.4, 4.15, -1.4).toArray()], 0.16, PALETTE.impMid);
  const p0 = F.at(-1.9, 0, 1.3);
  const p1 = F.at(1.9, 0, 1.55);
  kit.boxMM("paintedMetal", [Math.min(p0.x, p1.x), 0, Math.min(p0.z, p1.z)], [Math.max(p0.x, p1.x), 0.012, Math.max(p0.z, p1.z)], { color: PALETTE.impBlack, texel: 2 });
  F.collider(-1.8, -1.3, 1.8, 0.85, 3.9, "waste");
  // bin cart in front: box on castors with a lid ajar and refuse sacks
  const cp = F.at(1.0, 0, 1.9);
  const C = propFrame(kit, cp.x, cp.z, Math.PI + 0.25);
  C.box("paintedMetal", 0, 0.5, 0, 0.9, 0.7, 0.7, { color: PALETTE.impMid, texel: 2 });
  C.add("paintedMetal", new THREE.BoxGeometry(0.92, 0.04, 0.72).rotateX(0.35), 0, 0.98, -0.2, { color: PALETTE.impDark, texel: 2 });
  C.box("hazard", 0, 0.5, 0.36, 0.5, 0.12, 0.01, { texel: 3 });
  for (const [dx, dz] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) C.cyl("rubber", dx, 0.07, dz, 0.07, 0.05, "x", { color: PALETTE.rubber, segments: 10 });
  // refuse sacks as tilted boxes with tied necks (the sphere sacks read as balls from the door)
  for (let k = 0; k < 3; k++) {
    const sx = -0.24 + k * 0.24;
    const sy = 0.98 + (k % 2) * 0.05;
    const sz = -0.05 + (k % 2) * 0.12;
    C.add("rubber", new THREE.BoxGeometry(0.26, 0.24, 0.24).rotateZ((k - 1) * 0.3).rotateX(0.15 * (k % 2 ? 1 : -1)), sx, sy, sz, { color: PALETTE.rubber });
    C.add("rubber", new THREE.CylinderGeometry(0.03, 0.05, 0.08, 8).rotateZ((k - 1) * 0.3), sx - (k - 1) * 0.05, sy + 0.15, sz, { color: PALETTE.impDark });
  }
  C.collider(-0.5, -0.4, 0.5, 0.4, 0.95, "cart");
}

export function buildLifesupport(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x -30..-5.4, y 0..4.5, z -7..8
  const H = max[1];
  const rand = rng(ctx.seed * 3 + 5);

  // ------------------------------------------------------------------ shell (own floor: trench)
  const trench = { x0: -27.0, x1: -9.6, z0: -0.9, z1: 0.9, depth: 0.9 };
  const pad = 0.4;
  const floorMat = "floorGloss";
  const fc = 0x50545c; // close to the corridor deck; the room reads by its lit trench, not a pale floor
  kit.boxMM(floorMat, [min[0] - pad, -0.12, min[2] - pad], [max[0] + pad, 0, trench.z0], { color: fc, texel: 0.33 });
  kit.boxMM(floorMat, [min[0] - pad, -0.12, trench.z1], [max[0] + pad, 0, max[2] + pad], { color: fc, texel: 0.33 });
  kit.boxMM(floorMat, [min[0] - pad, -0.12, trench.z0], [trench.x0, 0, trench.z1], { color: fc, texel: 0.33 });
  kit.boxMM(floorMat, [trench.x1, -0.12, trench.z0], [max[0] + pad, 0, trench.z1], { color: fc, texel: 0.33 });
  for (const [x0, z0, x1, z1] of [
    [min[0], min[2], max[0], min[2] + 0.18],
    [min[0], max[2] - 0.18, max[0], max[2]],
    [min[0], min[2], min[0] + 0.18, max[2]],
    [max[0] - 0.18, min[2], max[0], max[2]],
  ]) kit.boxMM("paintedMetal", [x0, 0, z0], [x1, 0.015, z1], { color: PALETTE.impBlack, texel: 2 });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    // wall strips are neutral white; green is reserved for the trench edges and the gauges / indicator dots
    impWall(kit, ctx, side, { rows: [0, 0.5, 1.6, 2.6, 3.6, H], paints: LS_PAINTS, styles: LS_STYLES, theme: { accent: "emitWhiteDim", accent2: "emitGreen", screenMats: ["impScreen1", "impScreen3"], pipeCol: PALETTE.impMid } });
  }
  // mid-grey plate ceiling (the impDark slab was a black void over an already dark room) with black
  // beams, a big air duct along the room, neutral strip over the trench, white strips over the tanks
  kit.boxMM("impPanel1", [min[0] - 0.2, H, min[2] - 0.2], [max[0] + 0.2, H + 0.12, max[2] + 0.2], { color: PALETTE.impMid, uv: "world", texel: 0.5 });
  for (let x = min[0] + 2; x < max[0] - 1; x += 3) kit.box("paintedMetal", x, H - 0.1, (min[2] + max[2]) / 2, 0.24, 0.2, max[2] - min[2] - 0.3, { color: PALETTE.impBlack, texel: 2 });
  // strips are built like the shared imperial fixture (dark housing, a faint diffuser that reads as the
  // lit fixture body, a narrow dim core): the earlier raw 0.1 m emitStrip boxes were three blown white
  // bars with halos where the beams cut the spine
  const strip = (mat, x0, z0, x1, z1) => {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const xc = (x0 + x1) / 2;
    const zc = (z0 + z1) / 2;
    const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const dims = (w, len) => (alongX ? [len, w] : [w, len]);
    let [sx, sz] = dims(0.42, L + 0.2);
    kit.box("paintedMetal", xc, H - 0.06, zc, sx, 0.1, sz, { color: PALETTE.impDark, texel: 2 });
    [sx, sz] = dims(0.26, L);
    kit.box("emitWhiteFaint", xc, H - 0.095, zc, sx, 0.02, sz, { uv: "keep" });
    [sx, sz] = dims(0.05, L - 0.1);
    kit.box(mat, xc, H - 0.11, zc, sx, 0.02, sz, { uv: "keep" });
  };
  strip("emitWhiteDim", min[0] + 1, 0, max[0] - 1, 0);
  strip("emitWhiteDim", min[0] + 1, -4.6, -12, -4.6);
  strip("emitWhiteDim", min[0] + 1, 5.6, -12, 5.6);
  strip("emitWhiteDim", -9.5, -5.45, -6.5, -5.45);
  // main air duct: rectangular trunk along x with grille outlets and a fan housing
  const dz = 2.6;
  kit.boxMM("paintedMetal", [min[0] + 0.5, H - 0.9, dz - 0.55], [max[0] - 2.5, H - 0.12, dz + 0.55], { color: PALETTE.impMid, texel: 1.2 });
  for (let x = min[0] + 1.6; x < max[0] - 3; x += 2.4) {
    kit.box("paintedMetal", x, H - 0.92, dz, 0.9, 0.06, 0.7, { color: PALETTE.impBlack, texel: 2 });
    for (let k = 0; k < 6; k++) kit.box("metal", x, H - 0.96, dz - 0.27 + k * 0.11, 0.8, 0.02, 0.04, { color: PALETTE.impGrey });
    kit.box("paintedMetal", x + 1.2, H - 0.51, dz, 0.1, 0.86, 1.18, { color: PALETTE.impBlack, texel: 2 });
  }
  // fan housing at the far end of the duct (blades rotate)
  {
    const fx = min[0] + 0.8;
    kit.cyl("paintedMetal", fx, H - 0.5, dz, 0.75, 0.6, "x", { color: PALETTE.impDark, segments: 28, texel: 1.5 });
    kit.cyl("paintedMetal", fx + 0.32, H - 0.5, dz, 0.78, 0.06, "x", { color: PALETTE.impBlack, segments: 28, texel: 2 });
    const mk = new Kit(ctx.materials);
    for (let k = 0; k < 5; k++) mk.box("metal", 0, 0, 0, 0.03, 1.2, 0.22, { color: PALETTE.steel, rot: [(k / 5) * Math.PI * 2, 0, 0] });
    mk.cyl("metal", 0, 0, 0, 0.14, 0.14, "x", { color: PALETTE.gunmetal, segments: 12 });
    const g = new THREE.Group();
    g.position.set(fx + 0.36, H - 0.5, dz);
    mk.build(g, { castShadow: false, receiveShadow: true });
    ctx.mesh(g);
    ctx.anim((dt, t) => {
      g.rotation.x = t * 4.5;
    });
    for (let k = 0; k < 7; k++) kit.box("metal", fx + 0.5, H - 0.5 + (k - 3) * 0.2, dz, 0.02, 0.03, 1.45 - Math.abs(k - 3) * 0.2, { color: PALETTE.impMid });
  }

  // ------------------------------------------------------------------ lights (6)
  // neutral white throughout (the mint pair tinted every metal green): the green identity comes from
  // the trench edge channels, the gauges and the indicator dots only. Two white downlights sit over
  // the tank rows so the drums and the wall racks read. The spine whites hang 1.3 m below the ceiling
  // and the tank whites 1 m (between the drums, clear of their tops): at 0.6 m each light burnt a
  // blown white patch into the plate above it, and the three along the spine read from the door as
  // three clipped bars with halos.
  const neutral = 0xf2f4f8;
  const ly = H - 1.3;
  ctx.light(pointLight(neutral, 18, 16, [-23.5, ly, 0]));
  ctx.light(pointLight(neutral, 17, 16, [-15.5, ly, 0]));
  ctx.light(pointLight(0xeef2ff, 17, 13, [-8.5, ly, -1.5]));
  ctx.light(pointLight(0xffffff, 16, 12, [-19.8, H - 1.0, -4.2]));
  ctx.light(pointLight(0xfafcff, 15, 11, [-19.0, H - 1.0, 5.4]));
  ctx.light(pointLight(0xff4030, 5, 7, [-9.3, 3.6, 5.8]));

  // ------------------------------------------------------------------ trench with grating
  {
    const { x0, x1, z0, z1, depth } = trench;
    kit.boxMM("paintedMetal", [x0, -depth - 0.1, z0 - 0.2], [x1, -depth, z1 + 0.2], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("impPanel1", [x0, -depth, z0 - 0.2], [x1, 0, z0], { color: PALETTE.impDark, uv: "world", texel: 0.5 });
    kit.boxMM("impPanel1", [x0, -depth, z1], [x1, 0, z1 + 0.2], { color: PALETTE.impDark, uv: "world", texel: 0.5 });
    kit.boxMM("impPanel1", [x0 - 0.2, -depth, z0 - 0.2], [x0, 0, z1 + 0.2], { color: PALETTE.impDark, uv: "world", texel: 0.5 });
    kit.boxMM("impPanel1", [x1, -depth, z0 - 0.2], [x1 + 0.2, 0, z1 + 0.2], { color: PALETTE.impDark, uv: "world", texel: 0.5 });
    // lit edges, pipes and a cable bundle in the trench
    kit.boxMM("emitGreen", [x0 + 0.1, -depth + 0.02, z0 + 0.02], [x1 - 0.1, -depth + 0.05, z0 + 0.08]);
    kit.boxMM("emitGreen", [x0 + 0.1, -depth + 0.02, z1 - 0.08], [x1 - 0.1, -depth + 0.05, z1 - 0.02]);
    pipeRun(kit, [[x0 + 0.1, -0.5, -0.45], [x1 - 0.1, -0.5, -0.45]], 0.13, PALETTE.impMid);
    pipeRun(kit, [[x0 + 0.1, -0.55, 0.0], [x1 - 0.1, -0.55, 0.0]], 0.09, PALETTE.impRed);
    pipeRun(kit, [[x0 + 0.1, -0.6, 0.45], [x1 - 0.1, -0.6, 0.45]], 0.09, PALETTE.steel);
    for (let x = x0 + 0.8; x < x1 - 0.5; x += 2.1) {
      kit.box("paintedMetal", x, -depth + 0.4, 0, 0.12, 0.8, z1 - z0 - 0.04, { color: PALETTE.impBlack, texel: 2 });
      kit.box("metal", x, -0.62, 0.45, 0.16, 0.1, 0.26, { color: PALETTE.gunmetal });
    }
    for (let k = 0; k < 3; k++) kit.cyl("rubber", (x0 + x1) / 2, -depth + 0.12 + k * 0.03, -0.75 + k * 0.05, 0.02, x1 - x0 - 0.3, "x", { color: PALETTE.rubber, segments: 6 });
    // grating in sections with cross bearers and low kick rails either side
    for (let x = x0; x < x1 - 0.01; x += 2.9) {
      const xe = Math.min(x1, x + 2.9);
      kit.boxMM("grate", [x + 0.02, -0.03, z0], [xe - 0.02, 0.0, z1], { texel: 1.0 });
      kit.box("paintedMetal", xe, -0.06, 0, 0.06, 0.12, z1 - z0, { color: PALETTE.impBlack, texel: 2 });
    }
    kit.boxMM("paintedMetal", [x0 - 0.02, -0.08, z0 - 0.2], [x1 + 0.02, 0.0, z0 - 0.02], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("paintedMetal", [x0 - 0.02, -0.08, z1 + 0.02], [x1 + 0.02, 0.0, z1 + 0.2], { color: PALETTE.impBlack, texel: 2 });
    // plain black kick rails with a thin green lip toward the grating (the room's identity colour lives
    // on the trench edges); hazard only on the two end pads across the trench, never along the sides
    for (const s of [-1, 1]) {
      const zz = s < 0 ? z0 - 0.1 : z1 + 0.1;
      kit.boxMM("paintedMetal", [x0, 0, zz - 0.08], [x1, 0.06, zz + 0.08], { color: PALETTE.impBlack, texel: 2 });
      const lip = zz - s * 0.08; // inner face of the rail; the strip sits proud of it toward the grating
      const out = lip - s * 0.015;
      kit.boxMM("emitGreen", [x0 + 0.3, 0.025, Math.min(lip, out)], [x1 - 0.3, 0.045, Math.max(lip, out)]);
    }
    for (const [ha, hb] of [[x0 - 0.4, x0 - 0.06], [x1 + 0.06, x1 + 0.4]]) kit.boxMM("hazard", [ha, 0, z0 - 0.18], [hb, 0.012, z1 + 0.18], { texel: 4 });
  }

  // ------------------------------------------------------------------ tanks
  const water = new THREE.Color("#6a7684");
  const air = new THREE.Color("#868e9a");
  // tanks numbered 1-3 (water) and 4-5 (O2); the middle water tank is a newer light-grey unit
  for (const [i, x] of [-26.4, -22.0, -17.6].entries()) {
    const grey = i === 1;
    tank(kit, ctx, { x, z: -4.6, r: 1.3, h: 3.5, color: grey ? PALETTE.impGrey : water, label: SIGN.H2O, accent: "emitBlue", facing: 1, seed: ctx.seed + i, ladder: i === 1, number: i + 1, numeralColor: grey ? PALETTE.impBlack : PALETTE.impWhite });
  }
  for (const [i, x] of [-26.3, -21.4].entries()) tank(kit, ctx, { x, z: 5.6, r: 1.5, h: 3.4, color: air, label: SIGN.O2, accent: "emitGreen", facing: -1, seed: ctx.seed + 10 + i, ladder: i === 0, number: 4 + i });
  // ceiling header over the water tanks and the O2 tanks (the tank risers join these)
  pipeRun(kit, [[-27.5, H - 0.35, -4.6], [-16.5, H - 0.35, -4.6], [-16.5, H - 0.35, -2.0], [-9.0, H - 0.35, -2.0]], 0.14, PALETTE.impMid);
  pipeRun(kit, [[-27.5, H - 0.35, 5.6], [-13.0, H - 0.35, 5.6]], 0.14, PALETTE.impMid);

  // ------------------------------------------------------------------ filtration, pumps
  filterUnit(kit, ctx, -17.2, 6.4, -1, ctx.seed + 21);
  filterUnit(kit, ctx, -14.7, 6.4, -1, ctx.seed + 22);
  for (const [i, x] of [-24.2, -20.0, -15.8].entries()) pump(kit, ctx, x, -2.3, ctx.seed + 30 + i, i * 1.7);

  // ------------------------------------------------------------------ far wall manifold (xmin)
  {
    const seg = wallSegment(ctx.bounds, "xmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.z - z
    // header pipe along the wall with five valved branches down to a lower header
    frame.cylU("metal", 7.5, 2.5, 0.35, 0.16, 12.0, { color: PALETTE.impMid, segments: 16 });
    frame.cylU("metal", 7.5, 1.1, 0.35, 0.12, 12.0, { color: PALETTE.impMid, segments: 14 });
    for (let k = 0; k < 5; k++) {
      const u = 2.5 + k * 2.5;
      frame.cylN("paintedMetal", u, 2.5, 0.2, 0.2, 0.4, { color: PALETTE.impDark, segments: 16, texel: 2 });
      frame.cylN("paintedMetal", u, 1.1, 0.2, 0.17, 0.4, { color: PALETTE.impDark, segments: 16, texel: 2 });
      frame.box("metal", u, 1.8, 0.35, 0.16, 1.4, 0.16, { color: PALETTE.steel });
      const wx = min[0] + 0.55;
      const wz = max[2] - u;
      valveWheel(kit, wx, 1.8, wz, 0.17, "x", k % 2 ? PALETTE.impRed : PALETTE.impMid);
      // gauge on the wall fed by a stub from the branch
      frame.cylU("metal", u + 0.25, 2.05, 0.2, 0.025, 0.4, { color: PALETTE.steel, segments: 8 });
      frame.cylN("metal", u + 0.45, 2.05, 0.1, 0.025, 0.2, { color: PALETTE.steel, segments: 8 });
      gauge(frame, u + 0.45, 2.05, 0.0, 0.11, k % 2 ? "impScreen1" : "impScreen3");
      frame.box(k === 3 ? "emitRed" : "emitGreen", u - 0.4, 1.5, 0.3, 0.06, 0.06, 0.02);
      frame.add("decal", new THREE.PlaneGeometry(0.3, 0.3), u - 0.4, 2.05, 0.004, { uv: "keep", uvRect: decalRect(12) });
    }
    frame.box("paintedMetal", 9.5, 3.3, 0.1, 3.4, 0.9, 0.2, { color: PALETTE.impBlack, texel: 2 });
    frame.add("crew_signLit", new THREE.PlaneGeometry(2.8, 0.7), 9.5, 3.3, 0.21, { uv: "keep", uvRect: signRect(SIGN.LIFESUPPORT) });
    wallSign(kit, ctx, { side: "xmin", u: 12.6, v: 3.3, w: 1.2, cell: SIGN.H2O, lit: true });
    wallSign(kit, ctx, { side: "xmin", u: 3.0, v: 3.3, w: 1.2, cell: SIGN.O2, lit: true });
    kit.collider([min[0], 0, min[2]], [min[0] + 0.7, 3.0, max[2]], "manifold");
    // drips and rust below the manifold
    for (let k = 0; k < 5; k++) wallGrime(kit, ctx, "xmin", 2.5 + k * 2.5, 0.55, 0.5, 1.0);
  }

  // ------------------------------------------------------------------ waste processing (north-east)
  wasteUnit(kit, ctx, -9.6, 6.2);
  wallSign(kit, ctx, { side: "zmax", u: max[0] + 9.6, v: 3.9, w: 1.6, cell: SIGN.BIOHAZARD, lit: true });
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.x - x
    // plain black bands frame the waste bay (the hazard stripes live on the loading door only)
    frame.box("paintedMetal", 6.4, 1.8, 0.02, 0.25, 3.4, 0.03, { color: PALETTE.impBlack, texel: 2 });
    frame.box("paintedMetal", 1.4, 1.8, 0.02, 0.25, 3.4, 0.03, { color: PALETTE.impBlack, texel: 2 });
    ventGrille(frame, 9.0, 3.6, 1.2, 0.6);
    ventGrille(frame, 16.0, 3.6, 1.2, 0.6);
  }
  crate(kit, ctx, { x: -12.6, z: 7.2, sx: 1.0, sy: 0.8, sz: 1.0, yaw: 0.1, seed: ctx.seed + 51 });
  crate(kit, ctx, { x: -12.6, y: 0.8, z: 7.2, sx: 0.8, sy: 0.6, sz: 0.8, yaw: -0.2, seed: ctx.seed + 52 });

  // ------------------------------------------------------------------ control station by the door (xmax)
  impConsole(kit, ctx, { x: -8.0, z: -3.6, yaw: Math.PI / 2, w: 2.2, screens: [0, 2], chair: false, seed: ctx.seed + 61, lampMat: "emitGreen" });
  impChair(kit, ctx, { x: -6.9, z: -3.6, yaw: Math.PI / 2 });
  impConsole(kit, ctx, { x: -8.0, z: 3.3, yaw: Math.PI / 2, w: 1.6, screens: [1], chair: false, seed: ctx.seed + 62, lampMat: "emitGreen", tall: true });
  wallScreen(kit, ctx, { side: "xmax", u: 3.4, v: 2.0, w: 1.6, h: 0.9, screen: 0 });
  wallScreen(kit, ctx, { side: "xmax", u: 10.4, v: 2.0, w: 1.6, h: 0.9, screen: 3 });
  wallSign(kit, ctx, { side: "xmax", u: 7.0, v: 3.5, w: 2.0, cell: SIGN.LIFESUPPORT, lit: true });
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = z - min.z
    intercom(frame, 8.9, 1.5, 0.0);
    frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 5.1, 1.5, 0.004, { uv: "keep", uvRect: decalRect(6) });
    frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 12.5, 0.9, 0.004, { uv: "keep", uvRect: decalRect(7) });
  }
  cableTray(kit, ctx, "xmax", 0.6, 14.4, 3.9);
  cableTray(kit, ctx, "zmin", 0.6, 24.0, 4.05);

  // ------------------------------------------------------------------ humidity, wear, cables
  // humidity streaks low on the walls: dark translucent blots and drips every few metres
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    const seg = wallSegment(ctx.bounds, side);
    const len = Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
    for (let u = 0.9; u < len - 0.8; u += 1.9 + rand() * 1.4) {
      wallGrime(kit, ctx, side, u, 0.35, 1.2 + rand() * 1.4, 0.6 + rand() * 0.3);
      if (rand() < 0.45) wallGrime(kit, ctx, side, u + (rand() - 0.5) * 0.8, 1.1, 0.18 + rand() * 0.12, 1.2 + rand() * 0.8);
    }
  }
  // wet patches around the pumps and the waste unit, a scuffed path from the door along the trench
  for (const x of [-24.2, -20.0, -15.8]) floorGrime(kit, x + 0.3, -2.3 + 0.8, 1.6, 1.2, rand() * 3);
  floorGrime(kit, -9.0, 4.8, 2.4, 1.4, 0.2);
  scuffRun(kit, -6.5, 0, -26, 0, 10, ctx.seed + 7, 0.8);
  scuffRun(kit, -8, -1.2, -8, -4, 3, ctx.seed + 8, 0.6);
  // stencils on the deck: O2 roundel by the air tanks, hazard text by the waste unit
  kit.add("decal", (() => { const g = new THREE.PlaneGeometry(1.0, 1.0); g.rotateX(-Math.PI / 2); return g; })(), { pos: [-19.0, 0.006, 3.6], uv: "keep", uvRect: decalRect(4) });
  kit.add("decal", (() => { const g = new THREE.PlaneGeometry(1.2, 1.2); g.rotateX(-Math.PI / 2); return g; })(), { pos: [-9.6, 0.006, 3.4], uv: "keep", uvRect: decalRect(15) });

  // alert dome on the waste unit pulses; the two sight gauges are static
  const alert = ctx.materials.crew_alert;
  ctx.anim((dt, t) => {
    alert.emissiveIntensity = 1.2 + Math.max(0, Math.sin(t * 2.2)) * 1.8;
  });
  if (ctx.audioZone) ctx.audioZone({ kind: "machinery", pos: [-20, 1.5, 0], radius: 12 });
}
