// Restricted Command Intelligence (deck 1): a dark, low-ceilinged secure room off the bridge corridor.
// A planet hologram floats over a black holo table in the middle, the commander's high-backed chair
// sits behind it facing the door, a briefing wall of three screens glows behind the chair, one long
// wall is a row of locked data vaults (solid doors, a core-slot door, double lockers, framed racks)
// with red status lamps, and restricted-area stencils mark the door and the vault line. The ceiling
// carries two soft red light troughs and one louvred cold fixture over the table; the door has a
// red/black threshold band. Red readouts throughout, dimmer than the other rooms.
// Deck-local metres, floor y = 0. Bounds x -16..-2.4, z -13..-4, height 3.6; secure door on the xmax wall at z -9.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { roomShell, equipmentRack, wallScreen, pipeRun, wallSegment, IMP_STYLES_TECH, IMP_THEME } from "../imperial.js";
import { pitStation } from "./bridge.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid, X_AXIS } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect, makeCanvas, toTexture } from "../../textures.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BLACK = { color: PALETTE.impBlack, texel: 2 };
const DARK = { color: PALETTE.impDark, texel: 1.5 };
const REDPAINT = { color: new THREE.Color("#8e2a20"), texel: 2 }; // matte red paint (threshold band, seal stripes)
const CEIL = 3.1; // dropped ceiling under the 3.6 m bounds
const RIBS = [-12.6, -6.2]; // black cross ribs on the ceiling
const TROUGH_Z = [-11.3, -5.7]; // two soft red light troughs along the room's long axis
const TABLE = { x: -10.6, z: -8.5 }; // the table's 1 m collider stays clear of the sector spawn at x -9
const CHAIR = { x: -13.1, z: -7.0, yaw: -1.03 }; // faces the table centre (and, beyond it, the door)

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
  buildVaultWall(kit, ctx, B);
  buildBriefingWall(kit, ctx, B);
  buildLockerWall(kit, ctx, B);
  buildDoorWall(kit, ctx, B);
  holoTable(kit, ctx, mats, TABLE.x, TABLE.z);
  // the commander's chair sits off the door-table axis (locker side) turned toward the table, so from
  // the door it is silhouetted against the lit briefing screen instead of hiding behind the hologram
  commandChair(kit, CHAIR.x, CHAIR.z, CHAIR.yaw);
  buildCentre(kit, ctx);
  buildFloorDetail(kit, ctx, B);
  buildProps(kit, ctx);
  // 4 of 6 lights: the cold fixture over the table (wide and soft: the table top must not clip), one
  // soft red source inside each ceiling trough, a faint cool fill over the command chair so it reads
  // against the briefing wall
  ctx.light(pointLight(0xc8dcff, 3.0, 12, [TABLE.x, CEIL - 0.25, TABLE.z]));
  for (const z of TROUGH_Z) ctx.light(pointLight(0xff3a2a, 3.0, 8, [-9.6, CEIL - 0.2, z]));
  ctx.light(pointLight(0xc8dcff, 2.0, 6, [CHAIR.x - 0.6, 2.5, CHAIR.z]));
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
    // soft red wash for the trough walls and the cornice hairline (well below the emitter strips)
    m.int_glow = m.emitRedSoft.clone();
    m.int_glow.name = "int_glow";
    m.int_glow.emissiveIntensity = 0.45;
    // the trough diffusers themselves: softer than the shared emitRedSoft so the two channels read as
    // glowing recesses rather than red bars
    m.int_trough = m.emitRedSoft.clone();
    m.int_trough.name = "int_trough";
    m.int_trough.emissiveIntensity = 0.95;
    m.int_holoRed = m.holo.clone();
    m.int_holoRed.color = new THREE.Color("#ff5a48");
    m.int_holoRed.opacity = 0.75;
    m.int_faint = m.holo.clone();
    m.int_faint.opacity = 0.12;
    // the globe: additive world map (continents, coasts, graticule painted on a canvas); front faces
    // only so the far hemisphere does not print through the near one
    m.int_globe = new THREE.MeshBasicMaterial({
      map: makeGlobeMap(ctx.seed + 404),
      color: new THREE.Color("#9fd0ff"),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    m.int_globe.name = "int_globe";
    // the single flat equatorial ring: the shared holo grid, dimmer than the globe
    m.int_ring = m.holo.clone();
    m.int_ring.color = new THREE.Color("#5aa0ff");
    m.int_ring.opacity = 0.32;
    // untextured additive blue for small wire elements
    m.int_holoBright = m.holo.clone();
    m.int_holoBright.map = null;
    m.int_holoBright.color = new THREE.Color("#8cc8ff");
    m.int_holoBright.opacity = 0.9;
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
  return { pulse: m.int_pulse, lamp: m.int_lamp, holoRed: m.int_holoRed, faint: m.int_faint, bright: m.int_holoBright, globe: m.int_globe, ring: m.int_ring };
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
// Ceiling (3.1 m, dropped): dark panel grid without the shared strip lights, two black cross ribs,
// two soft red troughs running the length of the room (hanging lips, a segmented diffuser strip
// inside, red wash on the inner faces), one louvred cold fixture over the table, and a black cornice
// with a dim red hairline where the dropped ceiling meets the walls
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
  for (const x of RIBS) kit.boxMM("paintedMetal", [x - 0.2, CEIL - 0.14, min[2]], [x + 0.2, CEIL, max[2]], BLACK);
  for (const z of TROUGH_Z) redTrough(kit, B, z);
  // the cold fixture: a slot housing over the table, dim diffuser recessed behind six black louvres,
  // a thin red standby lamp at each end
  const { x, z } = TABLE;
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [x - 0.6, CEIL - 0.14, z + s * 0.3 - 0.025], [x + 0.6, CEIL, z + s * 0.3 + 0.025], BLACK);
    kit.boxMM("paintedMetal", [x + s * 0.6 - 0.025, CEIL - 0.14, z - 0.3], [x + s * 0.6 + 0.025, CEIL, z + 0.3], BLACK);
    kit.box("emitRedSoft", x + s * 0.635, CEIL - 0.12, z, 0.02, 0.01, 0.5, { uv: "keep" });
  }
  // faint diffuser: the fixture must read as a lit slot, not clip to a white blob over the table
  kit.boxMM("emitWhiteFaint", [x - 0.5, CEIL - 0.1, z - 0.2], [x + 0.5, CEIL - 0.09, z + 0.2], { uv: "keep" });
  for (let i = 0; i < 6; i++) kit.box("paintedMetal", x - 0.4 + i * 0.16, CEIL - 0.085, z, 0.02, 0.11, 0.55, BLACK);
  for (const side of ["xmin", "xmax", "zmin", "zmax"]) {
    const seg = wallSegment(B, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, min[1]);
    frame.box("paintedMetal", length / 2, CEIL - 0.12, 0.1, length, 0.24, 0.2, BLACK);
    frame.box("int_glow", length / 2, CEIL - 0.25, 0.06, length - 0.4, 0.015, 0.04, { uv: "keep" });
  }
}

/** One red ceiling trough at z: two hanging black lips, a red wash on their inner faces, and a
 *  three-segment soft strip at the top of the channel (broken where the cross ribs pass). */
function redTrough(kit, B, z) {
  const [min, max] = B;
  const x0 = min[0] + 0.5;
  const x1 = max[0] - 0.5;
  const hw = 0.22;
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [x0, CEIL - 0.3, z + s * hw - 0.03], [x1, CEIL, z + s * hw + 0.03], BLACK);
    const zi = z + s * (hw - 0.03);
    kit.boxMM("int_glow", [x0 + 0.05, CEIL - 0.27, zi - 0.003], [x1 - 0.05, CEIL - 0.06, zi + 0.003], { uv: "keep" });
  }
  for (const x of [x0, x1]) kit.boxMM("paintedMetal", [x - 0.03, CEIL - 0.3, z - hw], [x + 0.03, CEIL, z + hw], BLACK);
  const segs = [
    [x0 + 0.1, RIBS[0] - 0.3],
    [RIBS[0] + 0.3, RIBS[1] - 0.3],
    [RIBS[1] + 0.3, x1 - 0.1],
  ];
  for (const [a, b] of segs) kit.boxMM("int_trough", [a, CEIL - 0.05, z - 0.13], [b, CEIL - 0.03, z + 0.13], { uv: "keep" });
}

// ---------------------------------------------------------------------------
// zmin wall (z -13): six locked data vaults in heavy black frames — solid vault doors, a door with a
// lit core slot, a pair of narrow lockers, and two framed racks — a black rubber mat in front of them,
// stencils between the last vault and the corner
// ---------------------------------------------------------------------------
function buildVaultWall(kit, ctx, B) {
  const [min] = B;
  const side = "zmin";
  const u = (x) => x - min[0];
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  const bays = [
    { x: -14.7, kind: "door", h: 2.4, lamp: "int_lamp", decal: 9 },
    { x: -13.1, kind: "rack", h: 2.3, lamp: "int_lamp", decal: 6 },
    { x: -11.5, kind: "lockers", h: 2.2, lamp: "emitRed", decal: 10 },
    { x: -9.9, kind: "cores", h: 2.4, lamp: "emitAmber", decal: 9 },
    { x: -8.3, kind: "rack", h: 2.3, lamp: "int_lamp", decal: 6 },
    { x: -6.7, kind: "door", h: 2.4, lamp: "int_lamp", decal: 10 },
  ];
  bays.forEach((b, i) => {
    if (b.kind === "rack") equipmentRack(kit, ctx, { side, u: u(b.x), w: 1.2, h: b.h, d: 0.55, seed: ctx.seed + 20 + i, bounds: B, lit: "emitRed" });
    vaultBay(frame, u(b.x), { w: 1.3, h: b.h, kind: b.kind, lamp: b.lamp, decal: b.decal, seed: ctx.seed + 30 + i });
  });
  // stencils on the wall between the last vault and the corner
  frame.add("int_stencil", new THREE.PlaneGeometry(1.1, 0.55), u(-4.7), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(3) });
  frame.add("int_stencil", new THREE.PlaneGeometry(0.9, 0.45), u(-4.7), 1.3, 0.001, { uv: "keep", uvRect: stencilRect(0) });
  // conduit bundle feeding the vaults along the top
  pipeRun(kit, [[-15.5, CEIL - 0.42, min[2] + 0.75], [-5.7, CEIL - 0.42, min[2] + 0.75]], 0.06, PALETTE.impMid);
  pipeRun(kit, [[-15.5, CEIL - 0.56, min[2] + 0.75], [-5.7, CEIL - 0.56, min[2] + 0.75]], 0.04, PALETTE.impDark);
  // black rubber mat along the vault row (no lit line: the floor stays dark)
  kit.boxMM("paintedMetal", [-15.5, 0, min[2] + 0.66], [-5.9, 0.012, min[2] + 1.5], BLACK);
}

/** One vault bay on a wall frame: heavy jambs and lintel with a lamp housing, plus a door variant.
 *  kind "door": solid plate with seam, recessed pull, keypad, vents, seal decal.
 *  kind "cores": the same door with a lit core slot at chest height.
 *  kind "lockers": two narrow doors with handles, lamps and louvres.
 *  kind "rack": frame only (an equipmentRack sits inside). */
function vaultBay(frame, u, { w, h, kind, lamp, decal, seed }) {
  const rand = rng(seed);
  frame.box("paintedMetal", u - w / 2 - 0.08, h / 2, 0.3, 0.16, h, 0.6, BLACK);
  frame.box("paintedMetal", u + w / 2 + 0.08, h / 2, 0.3, 0.16, h, 0.6, BLACK);
  frame.box("paintedMetal", u, h + 0.1, 0.3, w + 0.32, 0.2, 0.6, BLACK);
  frame.box("paintedMetal", u, h + 0.35, 0.12, 0.6, 0.22, 0.24, DARK);
  frame.box(lamp, u, h + 0.35, 0.245, 0.4, 0.08, 0.01);
  frame.collider(u - w / 2 - 0.16, u + w / 2 + 0.16, 0, h + 0.2, 0, 0.6, "vault");
  if (kind === "rack") return;
  frame.box("paintedMetal", u, h / 2, 0.2, w, h, 0.4, DARK);
  if (kind === "lockers") {
    for (const s of [-1, 1]) {
      const cx = u + s * (w / 4);
      frame.box("impPanel", cx, h / 2, 0.406, w / 2 - 0.08, h - 0.16, 0.012, { color: PALETTE.impMid, uv: "keep" });
      frame.box("metal", cx - s * 0.14, 1.15, 0.42, 0.03, 0.28, 0.02, { color: PALETTE.impBlack });
      frame.box(s < 0 ? "emitRed" : "int_lamp", cx, h - 0.32, 0.415, 0.16, 0.04, 0.01);
      frame.box("leds", cx, 0.5, 0.415, 0.3, 0.03, 0.01, { uv: "keep" });
      for (let i = 0; i < 3; i++) frame.box("metal", cx, 0.22 + i * 0.07, 0.415, w / 2 - 0.3, 0.02, 0.01, { color: PALETTE.impBlack });
      frame.add("decal", new THREE.PlaneGeometry(0.22, 0.22), cx, h - 0.6, 0.413, { uv: "keep", uvRect: decalRect(s < 0 ? decal : 6) });
    }
    return;
  }
  // solid door: grey plate, vertical seam, recessed pull, keypad, bottom vents, seal decal
  frame.box("impPanel1", u, h / 2 + 0.06, 0.406, w - 0.16, h - 0.32, 0.012, { color: PALETTE.impGrey, uv: "keep" });
  frame.box("metal", u + 0.16, h / 2 + 0.06, 0.415, 0.03, h - 0.44, 0.01, { color: PALETTE.impBlack });
  frame.box("paintedMetal", u - 0.22, 1.1, 0.412, 0.14, 0.34, 0.012, BLACK);
  frame.box("metal", u - 0.22, 1.1, 0.42, 0.04, 0.26, 0.01, { color: PALETTE.impMid });
  frame.box("impPanel", u + 0.42, 1.5, 0.415, 0.22, 0.32, 0.02, { color: PALETTE.impMid, uv: "keep" });
  frame.box("leds", u + 0.42, 1.61, 0.43, 0.16, 0.03, 0.006, { uv: "keep" });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const lit = r === 0 && c === 1;
      frame.box(lit ? lamp : "rubber", u + 0.36 + c * 0.06, 1.39 + r * 0.05, 0.43, 0.04, 0.03, 0.006, { color: PALETTE.rubber });
    }
  }
  for (let i = 0; i < 4; i++) frame.box("metal", u, 0.22 + i * 0.07, 0.413, w - 0.5, 0.02, 0.01, { color: PALETTE.impBlack });
  const [du, dv] = kind === "cores" ? [u + 0.42, 2.05] : [u - 0.3, h - 0.5];
  frame.add("decal", new THREE.PlaneGeometry(0.34, 0.34), du, dv, 0.413, { uv: "keep", uvRect: decalRect(decal) });
  frame.box("emitRedSoft", u, 0.62, 0.413, w - 0.6, 0.012, 0.005, { uv: "keep" });
  if (kind === "cores") {
    // lit core slot: black surround with four data cores glowing behind thin mullions
    frame.box("paintedMetal", u - 0.15, 1.85, 0.42, 0.7, 0.34, 0.03, BLACK);
    for (let i = 0; i < 4; i++) frame.box(i === 1 ? "emitAmber" : "int_lamp", u - 0.39 + i * 0.16, 1.85, 0.437, 0.07, 0.24, 0.006);
    for (let i = 0; i < 5; i++) frame.box("metal", u - 0.47 + i * 0.16, 1.85, 0.44, 0.02, 0.3, 0.006, { color: PALETTE.impBlack });
  } else if (rand() < 0.6) {
    // wide red seal stripe across the seam near the top of a couple of the solid doors
    frame.box("paintedMetal", u, 2.15, 0.42, w - 0.4, 0.05, 0.006, REDPAINT);
  }
}

// ---------------------------------------------------------------------------
// xmin wall (x -16): briefing wall, three screens in a continuous black band with a readout strip
// and a low equipment plinth
// ---------------------------------------------------------------------------
function buildBriefingWall(kit, ctx, B) {
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
  frame.box("int_glow", u(-8.5), 0.1, 0.505, 6.8, 0.02, 0.01, { uv: "keep" });
  frame.collider(u(-8.5) - 3.7, u(-8.5) + 3.7, 0, 0.56, 0, 0.52, "plinth");
  // pulsing readout in the corner and a stencil high on the wall
  frame.box("darkGloss", u(-4.2), 2.5, 0.03, 0.6, 0.4, 0.02);
  frame.add("int_pulse", new THREE.PlaneGeometry(0.52, 0.32), u(-4.2), 2.5, 0.042, { uv: "keep" });
  frame.add("int_stencil", new THREE.PlaneGeometry(1.0, 0.5), u(-12.6), 2.6, 0.001, { uv: "keep", uvRect: stencilRect(0) });
}

// ---------------------------------------------------------------------------
// zmax wall (z -4): an evidence locker with drawers, an open rack, a wall screen, the large SECURE
// AREA stencil (placed so the whole word is inside the door-view frame), a sealed hatch, a comm panel
// ---------------------------------------------------------------------------
function buildLockerWall(kit, ctx, B) {
  const [min, max] = B;
  const side = "zmax";
  const u = (x) => max[0] - x;
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  evidenceLocker(frame, u(-15.2), ctx.seed + 44);
  equipmentRack(kit, ctx, { side, u: u(-13.8), w: 1.3, h: 2.5, d: 0.5, seed: ctx.seed + 41, bounds: B, lit: "emitAmber" });
  wallScreen(kit, ctx, { side, u: u(-12.2), v: 1.75, w: 1.6, h: 0.9, screen: 3, bounds: B });
  frame.add("int_stencil", new THREE.PlaneGeometry(1.5, 0.75), u(-9.9), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(2) });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u(-9.9), 1.15, 0.001, { uv: "keep", uvRect: decalRect(9) });
  // sealed hatch with a red lock lamp
  frame.box("paintedMetal", u(-7.6), 1.3, 0.04, 1.2, 1.6, 0.08, BLACK);
  frame.box("impPanel", u(-7.6), 1.3, 0.085, 1.05, 1.45, 0.01, { color: PALETTE.impMid, uv: "keep" });
  frame.box("metal", u(-7.6), 1.3, 0.09, 0.05, 1.3, 0.01, { color: PALETTE.impBlack });
  frame.box("int_lamp", u(-7.6) + 0.3, 1.95, 0.095, 0.16, 0.05, 0.01);
  frame.box("leds", u(-7.6) - 0.2, 0.7, 0.095, 0.5, 0.04, 0.01, { uv: "keep" });
  // comm panel near the door corner: speaker grille, key switch, red call lamp
  frame.box("paintedMetal", u(-5.3), 1.55, 0.05, 0.5, 0.7, 0.1, DARK);
  frame.box("impPanel", u(-5.3), 1.55, 0.105, 0.42, 0.62, 0.01, { color: PALETTE.impMid, uv: "keep" });
  for (let i = 0; i < 6; i++) frame.box("metal", u(-5.3), 1.72 - i * 0.04, 0.113, 0.3, 0.015, 0.006, { color: PALETTE.impBlack });
  frame.box("int_lamp", u(-5.3) - 0.12, 1.36, 0.113, 0.08, 0.04, 0.006);
  frame.box("metal", u(-5.3) + 0.1, 1.36, 0.125, 0.06, 0.06, 0.03, { color: PALETTE.impBlack });
  frame.box("leds", u(-5.3), 1.29, 0.113, 0.3, 0.03, 0.006, { uv: "keep" });
}

/** Evidence locker on a wall frame: closed cabinet with four drawer rows, handles, lamps, a keypad. */
function evidenceLocker(frame, u, seed) {
  const rand = rng(seed);
  const w = 1.3;
  const h = 2.5;
  const d = 0.5;
  frame.box("paintedMetal", u, h / 2, d / 2, w, h, d, DARK);
  frame.box("impPanel", u, h - 0.2, d + 0.006, w - 0.1, 0.3, 0.012, { color: PALETTE.impMid, uv: "keep" });
  frame.box("int_lamp", u - 0.4, h - 0.2, d + 0.02, 0.16, 0.04, 0.01);
  frame.box("leds", u + 0.25, h - 0.2, d + 0.02, 0.5, 0.03, 0.01, { uv: "keep" });
  const rows = 4;
  const y0 = 0.16;
  const rowH = (h - 0.5 - y0) / rows;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * rowH + rowH / 2;
    frame.box("impPanel1", u, y, d + 0.006, w - 0.1, rowH - 0.05, 0.012, { color: r % 2 ? PALETTE.impGrey : PALETTE.impLight, uv: "keep" });
    frame.box("metal", u, y + rowH / 2 - 0.1, d + 0.02, w - 0.5, 0.03, 0.02, { color: PALETTE.impBlack });
    const lamp = rand() < 0.7 ? "emitRed" : rand() < 0.5 ? "emitAmber" : "rubber";
    frame.box(lamp, u - w / 2 + 0.2, y - rowH / 2 + 0.12, d + 0.02, 0.1, 0.03, 0.01, { color: PALETTE.rubber });
    frame.box("leds", u + w / 2 - 0.35, y - rowH / 2 + 0.12, d + 0.02, 0.3, 0.02, 0.01, { uv: "keep" });
  }
  frame.box("impPanel", u + 0.45, h - 0.62, d + 0.012, 0.22, 0.3, 0.012, { color: PALETTE.impMid, uv: "keep" });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) frame.box(r === 0 && c === 1 ? "emitRed" : "rubber", u + 0.39 + c * 0.06, h - 0.72 + r * 0.05, d + 0.024, 0.04, 0.03, 0.006, { color: PALETTE.rubber });
  frame.add("decal", new THREE.PlaneGeometry(0.28, 0.28), u - 0.35, h - 0.62, d + 0.014, { uv: "keep", uvRect: decalRect(10) });
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, d, "locker");
}

// ---------------------------------------------------------------------------
// xmax wall (x -2.4): the secure door wall, a guard terminal, restricted stencils either side
// ---------------------------------------------------------------------------
function buildDoorWall(kit, ctx, B) {
  const [min] = B;
  const u = (z) => z - min[2]; // xmax wall runs from zmin to zmax
  const seg = wallSegment(B, "xmax");
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  frame.box("paintedMetal", u(-9), 3.05, 0.05, 2.6, 0.26, 0.1, BLACK);
  frame.box("emitRedSoft", u(-9), 3.05, 0.105, 2.2, 0.08, 0.01, { uv: "keep" });
  frame.add("int_stencil", new THREE.PlaneGeometry(1.2, 0.6), u(-11.3), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(0) });
  frame.add("int_stencil", new THREE.PlaneGeometry(1.2, 0.6), u(-6.7), 1.9, 0.001, { uv: "keep", uvRect: stencilRect(1) });
  // guard terminal beside the door (outside the 2.5 m door clearance), red screen
  slabConsole(kit, { x: -3.2, y: 0, z: -5.6, yaw: Math.PI / 2, w: 0.9, d: 0.5, h: 1.15, screens: ["impScreen3"], pulse: "int_pulse", lampMat: "emitRed", seed: ctx.seed + 61 });
}

// ---------------------------------------------------------------------------
// Holo table: black octagon with a red-lit rim, the planet hologram above it (x1.5) with a red
// targeting ring and orbit markers, a faint projector cone
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
  // the globe: a lat/long world map painted on a canvas (dim oceans, brighter continents with lit
  // coasts, a faint 15° graticule) wrapped on a sphere in an additive blue material, spinning slowly
  // on a slightly tilted axis; one flat equatorial ring is the only orbit. Red targeting brackets and
  // a data column sit on a second group that stays put beside it.
  const hy = top + 1.0;
  const R = 0.72;
  const planet = new THREE.Group();
  planet.position.set(x, hy, z);
  const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), mats.globe);
  planet.add(globeMesh);
  const ringGeo = new THREE.RingGeometry(R * 1.35, R * 1.75, 64);
  ringGeo.rotateX(-Math.PI / 2);
  planet.add(new THREE.Mesh(ringGeo, mats.ring));
  planet.rotation.z = 0.2;
  ctx.mesh(planet);
  const g = new THREE.Group();
  g.position.set(x, hy, z);
  const reticle = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const tick = new THREE.BoxGeometry(0.22, 0.016, 0.016);
    tick.rotateY(a);
    tick.translate(Math.cos(a) * (R + 0.34), 0, Math.sin(a) * (R + 0.34));
    reticle.push(tick);
    const bracket = new THREE.BoxGeometry(0.016, 0.16, 0.016);
    bracket.translate(Math.cos(a) * (R + 0.44), 0, Math.sin(a) * (R + 0.44));
    reticle.push(bracket);
  }
  const rm = new THREE.Mesh(mergeGeometries(reticle.map((q) => (q.index ? q.toNonIndexed() : q)), false), mats.holoRed);
  g.add(rm);
  // data column: a stack of red readout bars beside the globe (on its +Z side: left of it as seen
  // from the door)
  const bars = [];
  const rand = rng(ctx.seed + 90);
  for (let i = 0; i < 11; i++) {
    const wbar = 0.14 + rand() * 0.34;
    const b = new THREE.BoxGeometry(0.012, 0.026, wbar);
    b.translate(0, -0.42 + i * 0.085, R + 0.55 + wbar / 2);
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
    globeMesh.rotation.y = t * 0.22;
    planet.position.y = hy + Math.sin(t * 0.8) * 0.03;
    g.rotation.y = -t * 0.4;
    g.position.y = hy + Math.sin(t * 0.8) * 0.03;
    rm.rotation.z = Math.sin(t * 0.5) * 0.12;
    bm.rotation.y = t * 0.4; // cancels the group's spin: the readouts stay put beside the globe
  });
}

/**
 * Equirectangular world map for the globe hologram: dim ocean, brighter continents built from
 * clustered blobs with a lit coastline, polar caps, a faint 15° graticule with a stronger equator.
 * Additive material: black is invisible, so the ocean is a dim body and the land the bright read.
 */
function makeGlobeMap(seed) {
  const w = 512;
  const h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const rand = rng(seed);
  g.fillStyle = "#0b2450";
  g.fillRect(0, 0, w, h);
  // continents: a handful of clusters, each a cloud of overlapping ellipses drifting from its seed;
  // drawn twice — a slightly larger pale pass (the lit coastline) under the land body
  const land = [
    [70, 95, 46, 34, 9, 1.6],
    [120, 170, 30, 40, 7, 1.4],
    [262, 88, 70, 32, 10, 1.5],
    [300, 150, 34, 38, 8, 1.3],
    [400, 105, 42, 30, 8, 1.6],
    [440, 190, 24, 14, 5, 1.4],
    [190, 60, 22, 14, 4, 1.4],
  ];
  const ellipses = [];
  for (const [cx, cy, rx, ry, n, spread] of land) {
    for (let i = 0; i < n; i++) {
      ellipses.push([cx + (rand() - 0.5) * spread * rx, cy + (rand() - 0.5) * spread * ry, rx * (0.35 + rand() * 0.6), ry * (0.35 + rand() * 0.6), rand() * Math.PI]);
    }
  }
  const pass = (grow) => {
    for (const [ex, ey, sx, sy, a] of ellipses) {
      g.beginPath();
      g.ellipse(ex, ey, sx * grow, sy * grow, a, 0, Math.PI * 2);
      g.fill();
    }
  };
  g.fillStyle = "rgba(120,190,255,0.85)";
  pass(1.12);
  g.fillStyle = "#2f7fe0";
  pass(0.98);
  // polar caps
  g.fillStyle = "#6fb0f0";
  g.fillRect(0, 0, w, 14);
  g.fillRect(0, h - 12, w, 12);
  // graticule: every 15°, equator stronger
  g.strokeStyle = "rgba(140,200,255,0.28)";
  g.lineWidth = 1;
  for (let i = 1; i < 24; i++) {
    const xx = (i / 24) * w;
    g.beginPath();
    g.moveTo(xx, 0);
    g.lineTo(xx, h);
    g.stroke();
  }
  for (let i = 1; i < 12; i++) {
    const yy = (i / 12) * h;
    g.beginPath();
    g.moveTo(0, yy);
    g.lineTo(w, yy);
    g.stroke();
  }
  g.strokeStyle = "rgba(160,215,255,0.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  return toTexture(c, { anisotropy: 4 });
}

// ---------------------------------------------------------------------------
// The room's middle: an analysis station on the vault side of the table (its operator faces the
// globe) and three secure data pillars standing around the table — two flanking the door-table axis
// in the foreground, one behind the table on the vault side. All clear of the spawn (x -9, z -8.5),
// the walking line from the door, the chair and the props.
// ---------------------------------------------------------------------------
function buildCentre(kit, ctx) {
  pitStation(kit, ctx, { x: TABLE.x, z: TABLE.z - 2.55, yaw: Math.PI, variant: 2, screens: [3, 4], seed: ctx.seed + 811, lampMat: "emitRed", pulse: "int_pulse", trunk: false });
  dataPillar(kit, -8.6, -10.7, 0.35, ctx.seed + 821);
  dataPillar(kit, -8.6, -6.3, Math.PI - 0.35, ctx.seed + 822);
  dataPillar(kit, -12.9, -10.4, 0.7, ctx.seed + 823);
}

/**
 * Secure data pillar: a 1.75 m black column on a plinth with a recessed front slot carrying a
 * stack of red core indicators, a small amber readout, a keypad and a stencil; red status lamp in
 * the cap, hazard band at the base. `yaw` turns the slot face (local +Z) toward the walking line.
 */
function dataPillar(kit, x, z, yaw, seed) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const h = 1.75;
  const w = 0.56;
  add("paintedMetal", new THREE.BoxGeometry(w + 0.16, 0.08, w + 0.16), 0, 0.04, 0, BLACK);
  add("hazard", new THREE.BoxGeometry(w + 0.1, 0.05, w + 0.1), 0, 0.105, 0, { texel: 3 });
  add("paintedMetal", new THREE.BoxGeometry(w, h - 0.2, w), 0, 0.13 + (h - 0.2) / 2, 0, DARK);
  add("paintedMetal", new THREE.BoxGeometry(w + 0.08, 0.08, w + 0.08), 0, h - 0.03, 0, BLACK);
  add("int_lamp", new THREE.BoxGeometry(w - 0.2, 0.02, 0.02), 0, h + 0.02, w / 2 - 0.06);
  // recessed slot on the face: a black well with a stack of lit core indicators
  add("paintedMetal", new THREE.BoxGeometry(0.3, 0.9, 0.06), 0, 1.1, w / 2 - 0.02, BLACK);
  for (let i = 0; i < 7; i++) {
    const lit = rand() < 0.8;
    add(lit ? (i === 3 ? "emitAmber" : "emitRedSoft") : "rubber", new THREE.BoxGeometry(0.2, 0.05, 0.01), 0, 0.74 + i * 0.12, w / 2 + 0.015, { color: PALETTE.rubber });
  }
  // amber readout and keypad under the slot, stencil above, vent slats on the sides
  add("darkGloss", new THREE.BoxGeometry(0.34, 0.12, 0.01), 0, 0.52, w / 2 + 0.006);
  add("impScreen4", new THREE.PlaneGeometry(0.3, 0.09), 0, 0.52, w / 2 + 0.012, { uv: "keep" });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) add(rand() < 0.3 ? "emitRedDim" : "rubber", new THREE.BoxGeometry(0.07, 0.05, 0.012), -0.09 + c * 0.09, 0.32 + r * 0.08, w / 2 + 0.006, { color: PALETTE.rubber });
  add("decal", new THREE.PlaneGeometry(0.22, 0.22), 0, h - 0.24, w / 2 + 0.007, { uv: "keep", uvRect: decalRect([1, 5, 9, 12][seed % 4]) });
  for (const s of [-1, 1]) {
    const qs = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, (s * Math.PI) / 2));
    for (let i = 0; i < 5; i++) {
      const p = P(s * (w / 2 + 0.008), 1.2 + i * 0.07, 0);
      kit.add("paintedMetal", new THREE.BoxGeometry(0.34, 0.02, 0.016), { pos: [p.x, p.y, p.z], quat: qs, color: PALETTE.impBlack, texel: 2 });
    }
    const p2 = P(s * (w / 2 + 0.004), 0.7, 0);
    kit.add("leds", new THREE.BoxGeometry(0.3, 0.03, 0.008), { pos: [p2.x, p2.y, p2.z], quat: qs, uv: "keep" });
  }
  const r = (w + 0.16) / 2 + 0.02;
  kit.collider([x - r, 0, z - r], [x + r, h + 0.05, z + r], "pillar");
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
  const glow = new THREE.RingGeometry(0.4, 0.5, 8);
  glow.rotateX(-Math.PI / 2);
  kit.add("emitRedSoft", glow, { pos: [x, 0.082, z], uv: "keep" });
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

// ---------------------------------------------------------------------------
// Floor: red/black threshold band just inside the door (across the walking direction — no runners
// leading into the room), cable covers along the briefing wall, stencil inside the door
// ---------------------------------------------------------------------------
function buildFloorDetail(kit, ctx, B) {
  const [, max] = B;
  const x1 = max[0] - 0.22;
  const x0 = x1 - 0.34;
  kit.boxMM("paintedMetal", [x0, 0, -10.35], [x1, 0.008, -7.65], BLACK);
  for (let i = 0; i < 9; i++) {
    const z0 = -10.3 + i * 0.3;
    kit.boxMM("paintedMetal", [x0 + 0.04, 0.008, z0], [x1 - 0.04, 0.012, z0 + 0.15], REDPAINT);
  }
  kit.boxMM("int_glow", [x0 - 0.03, 0.006, -10.3], [x0, 0.012, -7.7], { uv: "keep" });
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

// ---------------------------------------------------------------------------
// Props: an evidence-case stack and a data-core trolley by the locker wall (left of the door view),
// a sealed transfer crate on a pallet in front of the vaults (right). All off the door-table axis
// and clear of the spawn.
// ---------------------------------------------------------------------------
function buildProps(kit, ctx) {
  hardCase(kit, -6.65, 0, -4.95, 0.12, 0.85, 0.32, 0.55, ctx.seed + 71);
  hardCase(kit, -6.6, 0.32, -4.97, -0.06, 0.72, 0.28, 0.48, ctx.seed + 72);
  kit.collider([-7.1, 0, -5.3], [-6.15, 0.62, -4.62], "cases");
  coreTrolley(kit, -7.7, -5.15, 0.1);
  sealedCrate(kit, -8.3, -11.95, -0.08, ctx.seed + 75);
}

/** Black hard case with edge bands, two latches, a red seal stripe over the lid seam and a decal. */
function hardCase(kit, x, y, z, yaw, w, h, d, seed) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  add("paintedMetal", new THREE.BoxGeometry(w, h, d), 0, h / 2, 0, DARK);
  add("paintedMetal", new THREE.BoxGeometry(w + 0.02, 0.04, d + 0.02), 0, h * 0.62, 0, BLACK);
  for (const s of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.06, h + 0.01, d + 0.02), s * (w / 2 - 0.1), h / 2, 0, BLACK);
  for (const s of [-1, 1]) add("metal", new THREE.BoxGeometry(0.08, 0.1, 0.02), s * (w / 2 - 0.22), h * 0.62, d / 2 + 0.01, { color: PALETTE.impMid });
  add("metal", new THREE.BoxGeometry(0.24, 0.03, 0.03), 0, h + 0.015, 0, { color: PALETTE.impBlack });
  add("paintedMetal", new THREE.BoxGeometry(0.16, h * 0.9, 0.006), -w / 2 + 0.34, h / 2, d / 2 + 0.003, REDPAINT);
  add("decal", new THREE.PlaneGeometry(0.2, 0.2), w / 2 - 0.34, h / 2, d / 2 + 0.005, { uv: "keep", uvRect: decalRect(rand() < 0.5 ? 9 : 10) });
  add(rand() < 0.5 ? "int_lamp" : "emitRed", new THREE.BoxGeometry(0.04, 0.02, 0.005), w / 2 - 0.12, h - 0.06, d / 2 + 0.003);
}

/** Wheeled cage trolley carrying four glowing data cores, a handle bar and a small status plate. */
function coreTrolley(kit, x, z, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const w = 0.7;
  const d = 0.5;
  add("paintedMetal", new THREE.BoxGeometry(w, 0.05, d), 0, 0.18, 0, BLACK);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wg = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10);
      wg.rotateZ(Math.PI / 2);
      add("rubber", wg, sx * (w / 2 - 0.08), 0.06, sz * (d / 2 - 0.06), { color: PALETTE.rubber });
      add("paintedMetal", new THREE.BoxGeometry(0.04, 0.9, 0.04), sx * (w / 2 - 0.02), 0.65, sz * (d / 2 - 0.02), DARK);
    }
  }
  add("paintedMetal", new THREE.BoxGeometry(w, 0.04, d), 0, 1.1, 0, DARK);
  add("paintedMetal", new THREE.BoxGeometry(w, 0.04, 0.04), 0, 0.64, d / 2 - 0.02, DARK);
  add("paintedMetal", new THREE.BoxGeometry(w, 0.04, 0.04), 0, 0.64, -d / 2 + 0.02, DARK);
  for (let i = 0; i < 4; i++) {
    const lx = -w / 2 + 0.11 + i * 0.16;
    add("paintedMetal", new THREE.CylinderGeometry(0.055, 0.055, 0.7, 10), lx, 0.55, 0, BLACK);
    add(i === 2 ? "emitAmber" : "emitRedSoft", new THREE.BoxGeometry(0.03, 0.5, 0.115), lx, 0.55, 0, { uv: "keep" });
    add("metal", new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), lx, 0.92, 0, { color: PALETTE.impMid });
  }
  const bar = new THREE.CylinderGeometry(0.02, 0.02, w, 8);
  bar.rotateZ(Math.PI / 2);
  add("metal", bar, 0, 1.25, -d / 2 - 0.05, { color: PALETTE.impMid });
  for (const s of [-1, 1]) add("metal", new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), s * (w / 2 - 0.02), 1.18, -d / 2 - 0.04, { color: PALETTE.impMid });
  add("paintedMetal", new THREE.BoxGeometry(0.3, 0.12, 0.02), 0, 1.02, d / 2 + 0.01, DARK);
  add("leds", new THREE.BoxGeometry(0.22, 0.03, 0.006), 0, 1.02, d / 2 + 0.023, { uv: "keep" });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + (d + 0.2) * s) / 2 + 0.03;
  const ez = (w * s + (d + 0.2) * c) / 2 + 0.03;
  kit.collider([x - ex, 0, z - ez], [x + ex, 1.3, z + ez], "trolley");
}

/** Sealed transfer crate on a pallet: dark body, black edge frame, matte red band, seal lamp, decal. */
function sealedCrate(kit, x, z, yaw, seed) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const w = 0.95;
  const d = 0.65;
  const h = 0.72;
  add("paintedMetal", new THREE.BoxGeometry(w + 0.1, 0.08, d + 0.1), 0, 0.04, 0, BLACK);
  for (let i = 0; i < 3; i++) add("paintedMetal", new THREE.BoxGeometry(0.06, 0.03, d + 0.12), -w / 2 + 0.05 + i * (w / 2 - 0.05), 0.095, 0, DARK);
  add("paintedMetal", new THREE.BoxGeometry(w, h, d), 0, 0.11 + h / 2, 0, DARK);
  for (const sx of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.06, h + 0.02, d + 0.02), sx * (w / 2 - 0.03), 0.11 + h / 2, 0, BLACK);
  add("paintedMetal", new THREE.BoxGeometry(w + 0.02, 0.05, d + 0.02), 0, 0.11 + h - 0.025, 0, BLACK);
  add("paintedMetal", new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), 0, 0.11 + h * 0.55, 0, REDPAINT);
  add("impPanel", new THREE.BoxGeometry(0.3, 0.22, 0.012), 0.1, 0.11 + h * 0.3, d / 2 + 0.006, { color: PALETTE.impMid, uv: "keep" });
  add("leds", new THREE.BoxGeometry(0.2, 0.03, 0.006), 0.1, 0.11 + h * 0.3 + 0.05, d / 2 + 0.016, { uv: "keep" });
  add(rand() < 0.5 ? "int_lamp" : "emitRed", new THREE.BoxGeometry(0.06, 0.03, 0.006), 0.1, 0.11 + h * 0.3 - 0.05, d / 2 + 0.016);
  add("decal", new THREE.PlaneGeometry(0.24, 0.24), -0.28, 0.11 + h * 0.3, d / 2 + 0.005, { uv: "keep", uvRect: decalRect(9) });
  for (const s of [-1, 1]) add("metal", new THREE.BoxGeometry(0.16, 0.04, 0.05), s * (w / 2 - 0.2), 0.11 + h + 0.02, 0, { color: PALETTE.impMid });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = ((w + 0.1) * c + (d + 0.1) * s) / 2 + 0.02;
  const ez = ((w + 0.1) * s + (d + 0.1) * c) / 2 + 0.02;
  kit.collider([x - ex, 0, z - ez], [x + ex, h + 0.15, z + ez], "crate");
}
