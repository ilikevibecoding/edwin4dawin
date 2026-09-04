// Restricted Command Intelligence (deck 1): a dark, low-ceilinged secure room off the bridge corridor.
// A planet hologram floats over a black holo table in the middle, the commander's high-backed chair
// sits behind it facing the door, a briefing wall of three screens glows behind the chair, one long
// wall is a row of locked data vaults with red status lamps, and restricted-area stencils mark the
// door and the vault line. One cold ceiling light plus a dim red accent; red readouts throughout.
// Deck-local metres, floor y = 0. Bounds x -16..-2.4, z -13..-4, height 3.6; secure door on the xmax wall at z -9.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { roomShell, equipmentRack, wallScreen, hologram, pipeRun, wallSegment, IMP_STYLES_TECH, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid, X_AXIS } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect, makeCanvas, toTexture } from "../../textures.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BLACK = { color: PALETTE.impBlack, texel: 2 };
const DARK = { color: PALETTE.impDark, texel: 1.5 };
const CEIL = 3.1; // dropped ceiling under the 3.6 m bounds
const TABLE = { x: -9.4, z: -8.5 };

export function buildIntel(kit, ctx) {
  const B = ctx.bounds;
  const [min, max] = B;
  const mats = ensureMaterials(ctx);
  roomShell(kit, ctx, {
    floor: { texel: 0.33 },
    ceiling: false,
    walls: {
      styles: IMP_STYLES_TECH,
      paints: [
        [PALETTE.impDark, 0.44],
        [PALETTE.impMid, 0.36],
        [PALETTE.impGrey, 0.2],
      ],
      rows: [0, 0.5, 1.6, 2.6, max[1] - min[1]],
      panelW: 1.1,
      theme: { accent: "emitRedSoft", accent2: "emitRed", screenMats: ["impScreen3", "impScreen4", "impScreen3"] },
    },
  });
  buildCeiling(kit, ctx, B);
  buildVaultWall(kit, ctx, B, mats);
  buildBriefingWall(kit, ctx, B, mats);
  buildLockerWall(kit, ctx, B, mats);
  buildDoorWall(kit, ctx, B, mats);
  holoTable(kit, ctx, mats, TABLE.x, TABLE.z);
  commandChair(kit, TABLE.x - 2.7, TABLE.z, -Math.PI / 2);
  buildFloorDetail(kit, ctx, B);
  // the single cold light over the table and a dim red accent along the vault wall
  ctx.light(pointLight(0xc8dcff, 7, 10, [TABLE.x, CEIL - 0.3, TABLE.z]));
  ctx.light(pointLight(0xff3a2a, 2.2, 6, [-9.2, 2.2, -12.0]));
  ctx.anim((dt, t) => {
    mats.pulse.emissiveIntensity = 1.1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.4));
    mats.lamp.emissiveIntensity = 1.8 + 0.8 * (0.5 + 0.5 * Math.sin(t * 2.2));
  });
  ctx.audioZone({ kind: "intel", center: [TABLE.x, 1.5, TABLE.z], radius: 7.5 });
}

function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.int_pulse) {
    m.int_pulse = m.impScreen3.clone();
    m.int_pulse.name = "int_pulse";
    m.int_lamp = m.emitRed.clone();
    m.int_lamp.name = "int_lamp";
    m.int_holoRed = m.holo.clone();
    m.int_holoRed.color = new THREE.Color("#ff5a48");
    m.int_holoRed.opacity = 0.7;
    m.int_faint = m.holo.clone();
    m.int_faint.opacity = 0.12;
    // untextured additive blue for the planet's wire graticule (reads at distance where the grid
    // texture averages out to nothing)
    m.int_holoBright = m.holo.clone();
    m.int_holoBright.map = null;
    m.int_holoBright.color = new THREE.Color("#7cc0ff");
    m.int_holoBright.opacity = 0.7;
    // restricted-area stencils: own 512x256 sheet (2x2 cells), laid over panels like `decal`
    m.int_stencil = new THREE.MeshStandardMaterial({
      map: makeStencilSheet(),
      transparent: true,
      depthWrite: false,
      roughness: 0.7,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      envMapIntensity: 0.3,
    });
    m.int_stencil.name = "int_stencil";
  }
  return { pulse: m.int_pulse, lamp: m.int_lamp, holoRed: m.int_holoRed, faint: m.int_faint, bright: m.int_holoBright };
}

/** uv rect of stencil cell i (2 columns x 2 rows; cells are 2:1). */
function stencilRect(i) {
  const c = i % 2;
  const r = Math.floor(i / 2);
  return [c / 2, 1 - (r + 1) / 2, (c + 1) / 2, 1 - r / 2];
}

/** Red stencil sheet: 0 RESTRICTED, 1 COMMAND INTELLIGENCE, 2 SECURE AREA (hatched), 3 DATA VAULT. */
function makeStencilSheet() {
  const W = 512;
  const Hh = 256;
  const c = makeCanvas(W, Hh);
  const g = c.getContext("2d");
  const rand = rng(4471);
  const RED = "#ff3a2a";
  const cw = W / 2;
  const ch = Hh / 2;
  const text = (s, x, y, px, color = RED, weight = "bold") => {
    g.fillStyle = color;
    g.font = `${weight} ${px}px "Courier New", monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(s, x, y);
  };
  const cell = (i, draw) => {
    const x0 = (i % 2) * cw;
    const y0 = Math.floor(i / 2) * ch;
    g.save();
    g.translate(x0, y0);
    g.beginPath();
    g.rect(0, 0, cw, ch);
    g.clip();
    draw();
    g.restore();
  };
  cell(0, () => {
    g.strokeStyle = RED;
    g.lineWidth = 5;
    g.strokeRect(10, 10, cw - 20, ch - 20);
    text("RESTRICTED", cw / 2, ch * 0.4, 42);
    text("AUTHORISED PERSONNEL ONLY", cw / 2, ch * 0.74, 15);
  });
  cell(1, () => {
    text("COMMAND", cw / 2, ch * 0.3, 36);
    text("INTELLIGENCE", cw / 2, ch * 0.58, 30);
    text("CLEARANCE LEVEL 4", cw / 2, ch * 0.84, 14);
  });
  cell(2, () => {
    g.fillStyle = RED;
    for (const y of [4, ch - 26]) {
      for (let x = -20; x < cw; x += 34) {
        g.beginPath();
        g.moveTo(x, y + 22);
        g.lineTo(x + 14, y);
        g.lineTo(x + 30, y);
        g.lineTo(x + 16, y + 22);
        g.closePath();
        g.fill();
      }
    }
    text("SECURE AREA", cw / 2, ch * 0.5, 40);
  });
  cell(3, () => {
    text("DATA VAULT", cw / 2, ch * 0.36, 34);
    text("LOCKED  //  NO COPY", cw / 2, ch * 0.7, 16);
  });
  // wear: eroded paint speckles
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(0,0,0,${0.35 + rand() * 0.65})`;
    g.fillRect(rand() * W, rand() * Hh, 1 + rand() * 3, 1 + rand() * 2);
  }
  g.globalCompositeOperation = "source-over";
  return toTexture(c, { wrap: false });
}

// ---------------------------------------------------------------------------
// Ceiling (3.1 m, dropped): dark panel grid without the shared strip lights, two black ribs, one
// recessed cold fixture over the table (the room's only real light), a black cornice with a red
// hairline where the dropped ceiling meets the walls
// ---------------------------------------------------------------------------
function buildCeiling(kit, ctx, B) {
  const [min, max] = B;
  const w = max[0] - min[0];
  const d = max[2] - min[2];
  const f = ceilingFrame(kit, min[0], min[2], CEIL);
  panelGrid(f, w, d, {
    rowH: 1.3,
    panelW: 1.3,
    kick: false,
    topPipes: false,
    seed: ctx.seed * 17 + 5,
    collide: false,
    styles: { panel: 0.86, greeble: 0.08, vent: 0.06 },
    paints: [
      [PALETTE.impDark, 0.55],
      [PALETTE.impMid, 0.3],
      [PALETTE.impBlack, 0.15],
    ],
    ...IMP_THEME,
    decals: false,
  });
  for (const x of [-12.6, -6.2]) kit.boxMM("paintedMetal", [x - 0.2, CEIL - 0.22, min[2]], [x + 0.2, CEIL, max[2]], BLACK);
  // recessed fixture: black housing, cold diffuser, thin red standby lamp at each end
  const { x, z } = TABLE;
  kit.boxMM("paintedMetal", [x - 0.6, CEIL - 0.16, z - 0.6], [x + 0.6, CEIL, z + 0.6], BLACK);
  kit.boxMM("emitCoolSoft", [x - 0.42, CEIL - 0.17, z - 0.42], [x + 0.42, CEIL - 0.15, z + 0.42], { uv: "keep" });
  for (const s of [-1, 1]) kit.box("emitRedSoft", x + s * 0.53, CEIL - 0.165, z, 0.04, 0.01, 0.6, { uv: "keep" });
  for (const side of ["xmin", "xmax", "zmin", "zmax"]) {
    const seg = wallSegment(B, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, min[1]);
    frame.box("paintedMetal", length / 2, CEIL - 0.12, 0.1, length, 0.24, 0.2, BLACK);
    frame.box("emitRedSoft", length / 2, CEIL - 0.25, 0.06, length - 0.4, 0.015, 0.04, { uv: "keep" });
  }
}

// ---------------------------------------------------------------------------
// zmin wall (z -13): six locked data vaults (racks behind heavy frames with keypads and red status
// lamps), a red restricted line on the floor in front of them, stencils between the vaults
// ---------------------------------------------------------------------------
function buildVaultWall(kit, ctx, B, mats) {
  const [min] = B;
  const side = "zmin";
  const u = (x) => x - min[0];
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  const xs = [-14.6, -13.0, -11.4, -9.8, -8.2, -6.6];
  xs.forEach((x, i) => {
    equipmentRack(kit, ctx, { side, u: u(x), w: 1.2, h: 2.3, d: 0.55, seed: ctx.seed + 20 + i, bounds: B, lit: "emitRed" });
    // heavy vault frame around the rack, keypad plate, status lamp housing above
    frame.box("paintedMetal", u(x) - 0.68, 1.2, 0.3, 0.16, 2.4, 0.6, BLACK);
    frame.box("paintedMetal", u(x) + 0.68, 1.2, 0.3, 0.16, 2.4, 0.6, BLACK);
    frame.box("paintedMetal", u(x), 2.5, 0.3, 1.52, 0.2, 0.6, BLACK);
    frame.box("paintedMetal", u(x), 2.75, 0.12, 0.6, 0.22, 0.24, DARK);
    frame.box(i === 3 ? "emitAmber" : "int_lamp", u(x), 2.75, 0.245, 0.4, 0.08, 0.01);
    frame.box("impPanel1", u(x) + 0.45, 1.55, 0.585, 0.22, 0.32, 0.02, { color: PALETTE.impGrey, uv: "keep" });
    frame.box("leds", u(x) + 0.45, 1.66, 0.6, 0.16, 0.03, 0.006, { uv: "keep" });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) frame.box(r === 0 && c === 1 ? "emitRed" : "rubber", u(x) + 0.39 + c * 0.06, 1.44 + r * 0.05, 0.6, 0.04, 0.03, 0.006, { color: PALETTE.rubber });
    frame.add("decal", new THREE.PlaneGeometry(0.34, 0.34), u(x) - 0.42, 2.15, 0.585, { uv: "keep", uvRect: decalRect([9, 6, 10, 9, 6, 10][i]) });
  });
  // stencils on the wall between the last vault and the corner
  frame.add("int_stencil", new THREE.PlaneGeometry(1.1, 0.55), u(-4.6), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(3) });
  frame.add("int_stencil", new THREE.PlaneGeometry(0.9, 0.45), u(-4.6), 1.3, 0.001, { uv: "keep", uvRect: stencilRect(0) });
  // conduit bundle feeding the vaults along the top
  pipeRun(kit, [[-15.4, CEIL - 0.42, min[2] + 0.75], [-5.6, CEIL - 0.42, min[2] + 0.75]], 0.06, PALETTE.impMid);
  pipeRun(kit, [[-15.4, CEIL - 0.56, min[2] + 0.75], [-5.6, CEIL - 0.56, min[2] + 0.75]], 0.04, PALETTE.impDark);
  // red restricted line on the floor along the vault row
  kit.boxMM("paintedMetal", [-15.4, 0, min[2] + 1.05], [-5.8, 0.008, min[2] + 1.17], BLACK);
  kit.boxMM("emitRedSoft", [-15.3, 0.008, min[2] + 1.09], [-5.9, 0.014, min[2] + 1.13], { uv: "keep" });
  void mats;
}

// ---------------------------------------------------------------------------
// xmin wall (x -16): briefing wall, three screens in a continuous black band with a readout strip
// and a low equipment plinth
// ---------------------------------------------------------------------------
function buildBriefingWall(kit, ctx, B, mats) {
  const [min] = B;
  const side = "xmin";
  const u = (z) => B[1][2] - z;
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  frame.box("paintedMetal", u(-8.5), 1.85, 0.03, 8.2, 1.9, 0.06, BLACK);
  // two briefing screens flank a dark standby situation board (the planet hologram is seen against
  // it from the door), the third screen is a wide strip above the board
  for (const [z, scr] of [[-11.4, 3], [-5.6, 4]]) wallScreen(kit, ctx, { side, u: u(z), v: 1.75, w: 2.2, h: 1.25, screen: scr, bounds: B });
  wallScreen(kit, ctx, { side, u: u(-8.5), v: 2.64, w: 2.4, h: 0.42, screen: 3, bounds: B });
  frame.box("paintedMetal", u(-8.5), 1.62, 0.06, 2.7, 1.5, 0.12, BLACK);
  frame.box("darkGloss", u(-8.5), 1.62, 0.125, 2.5, 1.32, 0.01);
  frame.box("emitRedSoft", u(-8.5), 2.22, 0.132, 2.3, 0.012, 0.005, { uv: "keep" });
  frame.box("emitRedSoft", u(-8.5), 1.02, 0.132, 2.3, 0.012, 0.005, { uv: "keep" });
  for (let i = 0; i < 3; i++) frame.box(i === 1 ? "int_lamp" : "emitRed", u(-8.5) - 1.0 + i * 0.16, 1.12, 0.132, 0.08, 0.03, 0.005);
  frame.add("int_stencil", new THREE.PlaneGeometry(0.9, 0.45), u(-8.5) + 0.7, 1.16, 0.133, { uv: "keep", uvRect: stencilRect(1) });
  // readout strip and the low plinth along the whole wall
  frame.box("paintedMetal", u(-8.5), 0.68, 0.05, 8.2, 0.2, 0.1, DARK);
  frame.box("leds", u(-8.5), 0.68, 0.105, 7.4, 0.05, 0.01, { uv: "keep" });
  for (let i = 0; i < 6; i++) frame.box(i % 3 === 2 ? "int_lamp" : "emitRed", u(-8.5) - 3.4 + i * 1.36, 0.68, 0.105, 0.3, 0.06, 0.01);
  frame.box("paintedMetal", u(-8.5), 0.28, 0.25, 7.4, 0.56, 0.5, DARK);
  frame.box("emitRedSoft", u(-8.5), 0.1, 0.505, 6.8, 0.02, 0.01, { uv: "keep" });
  frame.collider(u(-8.5) - 3.7, u(-8.5) + 3.7, 0, 0.56, 0, 0.52, "plinth");
  // pulsing readout in the corner and a stencil high on the wall
  frame.box("darkGloss", u(-4.2), 2.5, 0.03, 0.6, 0.4, 0.02);
  frame.add("int_pulse", new THREE.PlaneGeometry(0.52, 0.32), u(-4.2), 2.5, 0.042, { uv: "keep" });
  frame.add("int_stencil", new THREE.PlaneGeometry(1.0, 0.5), u(-12.6), 2.6, 0.001, { uv: "keep", uvRect: stencilRect(0) });
  void mats;
}

// ---------------------------------------------------------------------------
// zmax wall (z -4): evidence lockers, a wall screen, a large restricted stencil, a small sealed hatch
// ---------------------------------------------------------------------------
function buildLockerWall(kit, ctx, B, mats) {
  const [min, max] = B;
  const side = "zmax";
  const u = (x) => max[0] - x;
  equipmentRack(kit, ctx, { side, u: u(-14.4), w: 1.3, h: 2.5, d: 0.5, seed: ctx.seed + 40, bounds: B, lit: "emitRed" });
  equipmentRack(kit, ctx, { side, u: u(-13.0), w: 1.3, h: 2.5, d: 0.5, seed: ctx.seed + 41, bounds: B, lit: "emitAmber" });
  wallScreen(kit, ctx, { side, u: u(-10.3), v: 1.75, w: 1.6, h: 0.9, screen: 3, bounds: B });
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  frame.add("int_stencil", new THREE.PlaneGeometry(1.5, 0.75), u(-7.8), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(2) });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u(-7.8), 1.15, 0.001, { uv: "keep", uvRect: decalRect(9) });
  // sealed hatch with a red lock lamp
  frame.box("paintedMetal", u(-5.6), 1.3, 0.04, 1.2, 1.6, 0.08, BLACK);
  frame.box("impPanel", u(-5.6), 1.3, 0.085, 1.05, 1.45, 0.01, { color: PALETTE.impMid, uv: "keep" });
  frame.box("metal", u(-5.6), 1.3, 0.09, 0.05, 1.3, 0.01, { color: PALETTE.impBlack });
  frame.box("int_lamp", u(-5.6) + 0.3, 1.95, 0.095, 0.16, 0.05, 0.01);
  frame.box("leds", u(-5.6) - 0.2, 0.7, 0.095, 0.5, 0.04, 0.01, { uv: "keep" });
  void mats;
}

// ---------------------------------------------------------------------------
// xmax wall (x -2.4): the secure door wall, a guard terminal, restricted stencils either side
// ---------------------------------------------------------------------------
function buildDoorWall(kit, ctx, B, mats) {
  const [min] = B;
  const u = (z) => z - min[2]; // xmax wall runs from zmin to zmax
  const seg = wallSegment(B, "xmax");
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  frame.box("paintedMetal", u(-9), 3.05, 0.05, 2.6, 0.26, 0.1, BLACK);
  frame.box("emitRed", u(-9), 3.05, 0.105, 2.2, 0.08, 0.01);
  frame.add("int_stencil", new THREE.PlaneGeometry(1.2, 0.6), u(-11.3), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(0) });
  frame.add("int_stencil", new THREE.PlaneGeometry(1.2, 0.6), u(-6.7), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(1) });
  // guard terminal beside the door (outside the 2.5 m door clearance), red screen
  slabConsole(kit, { x: -3.2, y: 0, z: -5.6, yaw: Math.PI / 2, w: 0.9, d: 0.5, h: 1.15, screens: ["impScreen3"], pulse: "int_pulse", lampMat: "emitRed", seed: ctx.seed + 61 });
  void mats;
}

// ---------------------------------------------------------------------------
// Holo table: black octagon with a red-lit rim, the planet hologram above it with a red targeting
// ring and orbit markers, a faint projector cone
// ---------------------------------------------------------------------------
function holoTable(kit, ctx, mats, x, z) {
  const top = 0.92;
  kit.cyl("paintedMetal", x, 0.05, z, 1.0, 0.1, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("paintedMetal", x, 0.48, z, 0.84, 0.76, "y", { color: PALETTE.impDark, segments: 8 });
  kit.cyl("darkGloss", x, top - 0.03, z, 0.98, 0.06, "y", { segments: 8 });
  const flat = (geo, yy, mat, opts = {}) => {
    geo.rotateX(-Math.PI / 2);
    kit.add(mat, geo, { pos: [x, yy, z], ...opts });
  };
  flat(new THREE.RingGeometry(0.78, 0.86, 40), top + 0.004, "emitRedSoft", { uv: "keep" });
  flat(new THREE.RingGeometry(0.9, 0.94, 40), top + 0.004, "metal", { color: PALETTE.impMid });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kit.box(i % 2 ? "int_lamp" : "emitRed", x + Math.cos(a) * 0.86, 0.55, z + Math.sin(a) * 0.86, 0.08, 0.14, 0.08, {});
  }
  kit.box("leds", x + 0.86, 0.3, z, 0.01, 0.04, 0.8, { uv: "keep" });
  kit.collider([x - 1.0, 0, z - 1.0], [x + 1.0, top + 0.3, z + 1.0], "holotable");
  // planet with its ring (helper, grid-textured), spinning slowly; a bright wire graticule follows
  // it so the globe reads from the door; red targeting reticle and orbit markers on a second group
  const hy = top + 0.85;
  const scale = 0.6;
  const R = 0.8 * scale;
  const planet = hologram(kit, ctx, { x, y: hy, z, kind: "planet", scale });
  mergeGroupMeshes(planet);
  const grat = [];
  const torus = (r, tube, rx, ry = 0) => {
    const tg = new THREE.TorusGeometry(r, tube, 5, 64);
    tg.rotateX(rx);
    if (ry) tg.rotateY(ry);
    return tg;
  };
  grat.push(torus(R * 1.005, 0.007, Math.PI / 2)); // equator
  for (const lat of [-0.7, 0.7]) {
    const rr = R * Math.cos(lat);
    const tg = torus(rr, 0.005, Math.PI / 2);
    tg.translate(0, R * Math.sin(lat), 0);
    grat.push(tg);
  }
  grat.push(torus(R * 1.005, 0.005, 0), torus(R * 1.005, 0.005, 0, Math.PI / 2)); // meridians
  grat.push(torus(1.5 * scale, 0.006, Math.PI / 2 - 0.3)); // outer edge of the ring
  const pole = new THREE.CylinderGeometry(0.006, 0.006, R * 2.6, 6);
  grat.push(pole);
  const gm = new THREE.Mesh(mergeGeometries(grat.map((q) => (q.index ? q.toNonIndexed() : q)), false), mats.bright);
  planet.add(gm);
  const g = new THREE.Group();
  g.position.set(x, hy, z);
  const reticle = [];
  reticle.push(torus(R + 0.1, 0.009, Math.PI / 2));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const tick = new THREE.BoxGeometry(0.18, 0.014, 0.014);
    tick.rotateY(a);
    tick.translate(Math.cos(a) * (R + 0.24), 0, Math.sin(a) * (R + 0.24));
    reticle.push(tick);
  }
  const arc = new THREE.TorusGeometry(R + 0.3, 0.008, 5, 40, Math.PI * 0.6);
  arc.rotateX(Math.PI / 2);
  reticle.push(arc);
  const rm = new THREE.Mesh(mergeGeometries(reticle.map((q) => (q.index ? q.toNonIndexed() : q)), false), mats.holoRed);
  g.add(rm);
  // orbit markers: two small satellites on tilted orbits
  const orb = [];
  for (const [r, tilt] of [[R + 0.18, 0.35], [R + 0.26, -0.5]]) {
    const ring = torus(r, 0.004, Math.PI / 2 + tilt);
    orb.push(ring);
    const sat = new THREE.OctahedronGeometry(0.035);
    sat.translate(r * Math.cos(tilt), r * Math.sin(tilt) * 0.5, 0);
    orb.push(sat);
  }
  const om = new THREE.Mesh(mergeGeometries(orb.map((q) => (q.index ? q.toNonIndexed() : q)), false), mats.bright);
  g.add(om);
  // data column: a stack of red readout bars beside the globe (on its +Z side: left of it as seen
  // from the door)
  const bars = [];
  const rand = rng(ctx.seed + 90);
  for (let i = 0; i < 9; i++) {
    const wbar = 0.12 + rand() * 0.3;
    const b = new THREE.BoxGeometry(0.01, 0.022, wbar);
    b.translate(0, -0.3 + i * 0.075, R + 0.62 + wbar / 2);
    bars.push(b);
  }
  const bm = new THREE.Mesh(mergeGeometries(bars, false), mats.holoRed);
  g.add(bm);
  ctx.mesh(g);
  // projector cone from the table up to the globe
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, 0.3, hy - R - top, 32, 1, true), mats.faint);
  cone.position.set(x, (top + hy - R) / 2, z);
  ctx.mesh(cone);
  for (const o of [planet, g, cone]) {
    o.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
  }
  ctx.anim((dt, t) => {
    g.rotation.y = -t * 0.4;
    g.position.y = hy + Math.sin(t * 0.8) * 0.03;
    rm.rotation.z = Math.sin(t * 0.5) * 0.12;
    bm.rotation.y = t * 0.4; // cancels the group's spin: the readouts stay put beside the globe
  });
}

/** High-backed command chair on a pedestal: black rubber and fabric, red status lamp on the headrest. */
function commandChair(kit, x, z, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  kit.cyl("paintedMetal", x, 0.04, z, 0.55, 0.08, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("metal", x, 0.3, z, 0.12, 0.44, "y", { color: PALETTE.impMid });
  add("rubber", new THREE.BoxGeometry(0.7, 0.14, 0.7), 0, 0.55, 0, { color: PALETTE.rubber });
  add("fabric", new THREE.BoxGeometry(0.58, 0.06, 0.58), 0, 0.65, 0, { color: PALETTE.impBlack, uv: "world", texel: 2 });
  // tall backrest leaning aft (+Z is the back), with a wing either side
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -0.16));
  const bp = P(0, 1.25, 0.34);
  kit.add("rubber", new THREE.BoxGeometry(0.72, 1.3, 0.14), { pos: bp.toArray(), quat: bq, color: PALETTE.rubber });
  const fp = P(0, 1.22, 0.265);
  kit.add("fabric", new THREE.BoxGeometry(0.56, 1.1, 0.03), { pos: fp.toArray(), quat: bq, color: PALETTE.impBlack, uv: "world", texel: 2 });
  for (const s of [-1, 1]) {
    const wp = P(s * 0.4, 1.3, 0.3);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.08, 1.2, 0.3), { pos: wp.toArray(), quat: bq, color: PALETTE.impDark, texel: 2 });
    add("paintedMetal", new THREE.BoxGeometry(0.08, 0.06, 0.55), s * 0.4, 0.86, 0.02, DARK);
    add("rubber", new THREE.BoxGeometry(0.1, 0.05, 0.4), s * 0.4, 0.9, 0.0, { color: PALETTE.rubber });
    add("emitRed", new THREE.BoxGeometry(0.02, 0.02, 0.2), s * 0.455, 0.9, 0.0);
  }
  const lp = P(0, 1.86, 0.36);
  kit.add("int_lamp", new THREE.BoxGeometry(0.2, 0.03, 0.02), { pos: lp.toArray(), quat: bq });
  kit.collider([x - 0.5, 0, z - 0.5], [x + 0.5, 1.9, z + 0.5], "chair");
}

/** Compact standing console (same construction as the bridge lecterns): operator at local +Z. */
function slabConsole(kit, { x, y, z, yaw, w = 0.8, d = 0.5, h = 1.15, screens = ["impScreen0"], tilt = 0.5, lampMat = "emitAmber", pulse = null, seed = 1 }) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const qs = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const bodyH = h - 0.26;
  const slabD = d + 0.12;
  add("paintedMetal", new THREE.BoxGeometry(w, 0.08, d), 0, 0.04, 0, BLACK);
  add("paintedMetal", new THREE.BoxGeometry(w - 0.08, bodyH - 0.08, d - 0.1), 0, 0.08 + (bodyH - 0.08) / 2, -0.02, DARK);
  add("impPanel", new THREE.BoxGeometry(w - 0.2, bodyH - 0.34, 0.012), 0, 0.14 + (bodyH - 0.34) / 2, d / 2 - 0.07 + 0.006, { color: PALETTE.impMid, uv: "keep" });
  add(lampMat, new THREE.BoxGeometry(w - 0.3, 0.02, 0.01), 0, 0.11, d / 2 - 0.06);
  const pS = P(0, bodyH + 0.1, 0.02);
  kit.add("paintedMetal", new THREE.BoxGeometry(w, 0.06, slabD), { pos: pS.toArray(), quat: qs, color: PALETTE.impBlack, texel: 2 });
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qs);
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qs);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const n = screens.length;
  const cell = (w - 0.16) / n;
  const sw = cell - 0.06;
  const sh = slabD * 0.5;
  for (let i = 0; i < n; i++) {
    const off = -w / 2 + 0.08 + (i + 0.5) * cell;
    const c = pS.clone().addScaledVector(right, off).addScaledVector(fwd, -slabD * 0.14).addScaledVector(up, 0.033);
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.04, 0.012, sh + 0.04), { pos: c.toArray(), quat: qs });
    const g = new THREE.PlaneGeometry(sw, sh);
    g.rotateX(-Math.PI / 2);
    const c2 = c.clone().addScaledVector(up, 0.008);
    kit.add(screens[i], g, { pos: c2.toArray(), quat: qs, uv: "keep" });
  }
  const nb = Math.floor((w - 0.2) / 0.1);
  for (let i = 0; i < nb; i++) {
    const off = -w / 2 + 0.15 + i * 0.1;
    const lit = rand() < 0.45;
    const mat = lit ? (rand() < 0.6 ? "emitRed" : "emitAmber") : "rubber";
    const c = pS.clone().addScaledVector(right, off).addScaledVector(fwd, slabD * 0.36).addScaledVector(up, 0.045);
    kit.add(mat, new THREE.BoxGeometry(0.06, 0.03, 0.05), { pos: c.toArray(), quat: qs, color: PALETTE.rubber });
  }
  if (pulse) {
    const c = pS.clone().addScaledVector(fwd, -slabD * 0.46).addScaledVector(up, 0.036);
    kit.add(pulse, new THREE.BoxGeometry(w - 0.2, 0.012, 0.035), { pos: c.toArray(), quat: qs, uv: "keep" });
  }
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + slabD * s) / 2;
  const ez = (w * s + slabD * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "console");
}

/** Collapse a group's meshes into one draw call (the hologram helper spawns several meshes). */
function mergeGroupMeshes(group) {
  const geos = [];
  let mat = null;
  for (const c of [...group.children]) {
    if (!c.isMesh) continue;
    c.updateMatrix();
    const g = c.geometry.clone().applyMatrix4(c.matrix);
    const ng = g.index ? g.toNonIndexed() : g;
    for (const key of Object.keys(ng.attributes)) if (!["position", "normal", "uv"].includes(key)) ng.deleteAttribute(key);
    if (!ng.attributes.normal) ng.computeVertexNormals();
    geos.push(ng);
    mat = c.material;
    group.remove(c);
  }
  if (geos.length) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
  }
}

// ---------------------------------------------------------------------------
// Floor: red guide strip from the door to the table, cable covers, stencil inside the door
// ---------------------------------------------------------------------------
function buildFloorDetail(kit, ctx, B) {
  const [, max] = B;
  kit.boxMM("paintedMetal", [TABLE.x + 1.1, 0, -9.06], [max[0] - 0.4, 0.008, -8.94], BLACK);
  kit.boxMM("emitRedSoft", [TABLE.x + 1.2, 0.008, -9.02], [max[0] - 0.5, 0.013, -8.98], { uv: "keep" });
  for (const z of [-11.0, -6.0]) {
    kit.boxMM("paintedMetal", [B[0][0] + 0.5, 0, z - 0.1], [TABLE.x - 1.0, 0.05, z + 0.1], BLACK);
    kit.collider([B[0][0] + 0.5, 0, z - 0.1], [TABLE.x - 1.0, 0.05, z + 0.1], "trunk");
  }
  // floor stencil inside the door, readable when walking in (text runs across the walking direction)
  const dg = new THREE.PlaneGeometry(1.3, 0.65);
  dg.rotateX(-Math.PI / 2);
  dg.rotateY(Math.PI / 2);
  kit.add("int_stencil", dg, { pos: [max[0] - 1.6, 0.004, -10.0], uv: "keep", uvRect: stencilRect(0) });
  void ctx;
}
