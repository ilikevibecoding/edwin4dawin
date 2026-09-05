// Communications & Sensor Control (deck 1): a long signals room off the bridge corridor. A wall of
// stacked signal screens (mixed live / dim / dark) faces the door, a rotating holographic sensor sweep
// sits in the middle, two operators work at real desks facing the screen wall, cable trunks run along
// the ceiling into a patch-panel wall of racks (one open with its cabling hanging out, one under
// maintenance), and antenna feed pipes come down the opposite wall. Blue/green accents; a dim,
// segmented ceiling with a closed backing slab. Deck-local metres, floor y = 0. Bounds x 2.4..16,
// z -13..-4, height 3.6; door on the xmin wall at z -9.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, impChair, equipmentRack, wallScreen, pipeRun, wallSegment, IMP_STYLES_TECH, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid, X_AXIS } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BLACK = { color: PALETTE.impBlack, texel: 2 };
const DARK = { color: PALETTE.impDark, texel: 1.5 };
const HOLO_X = 10.6; // sensor pedestal centre (its 0.95 m collider stays clear of the spawn at x 9)

export function buildComms(kit, ctx) {
  const B = ctx.bounds;
  const [min, max] = B;
  const H = max[1] - min[1];
  const mats = ensureMaterials(ctx);
  roomShell(kit, ctx, {
    floor: { texel: 0.33 },
    ceiling: false,
    walls: {
      styles: IMP_STYLES_TECH,
      paints: [
        [PALETTE.impGrey, 0.42],
        [PALETTE.impLight, 0.18],
        [PALETTE.impMid, 0.28],
        [PALETTE.impDark, 0.12],
      ],
      rows: [0, 0.5, 1.6, 2.7, H],
      panelW: 1.1,
      cove: true,
    },
  });
  buildCeiling(kit, ctx, B, H);
  buildScreenWall(kit, ctx, B);
  buildPatchWall(kit, ctx, B, H);
  buildFeedWall(kit, ctx, B, H);
  buildDoorWall(kit, ctx, B);
  buildStations(kit, ctx);
  sensorHolo(kit, ctx, mats, HOLO_X, -8.5);
  buildProps(kit, ctx);
  buildFloorDetail(kit, ctx, B);
  ctx.light(pointLight(0x4a9dff, 4, 6, [HOLO_X, 2.4, -8.5]));
  ctx.light(pointLight(0xffb347, 2.2, 5, [9.5, 2.6, -12.2]));
  ctx.anim((dt, t) => {
    mats.pulse.emissiveIntensity = 1.2 + 0.35 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 9.1);
    mats.green.emissiveIntensity = 1.6 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3));
  });
  ctx.audioZone({ kind: "comms", center: [9.2, 1.6, -8.5], radius: 8 });
}

function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.cms_pulse) {
    m.cms_pulse = m.impScreen2.clone();
    m.cms_pulse.name = "cms_pulse";
    m.cms_green = m.emitGreen.clone();
    m.cms_green.name = "cms_green";
    // dimmed screen variants for the signal wall (a wall of identical bright tiles reads as wallpaper)
    m.cms_dim1 = m.impScreen1.clone();
    m.cms_dim1.emissiveIntensity = 0.6;
    m.cms_dim2 = m.impScreen2.clone();
    m.cms_dim2.emissiveIntensity = 0.55;
    m.cms_dim0 = m.impScreen0.clone();
    m.cms_dim0.emissiveIntensity = 0.5;
    m.cms_sweep = m.holo.clone();
    m.cms_sweep.opacity = 0.8;
    m.cms_sweep.color = new THREE.Color("#8ec5ff");
    m.cms_faint = m.holo.clone();
    m.cms_faint.opacity = 0.16;
    // untextured additive blue for the plot's wire structure (rings, spindle, contacts): stays
    // legible from the door where the flat grid disc is seen edge-on
    m.cms_bright = m.holo.clone();
    m.cms_bright.map = null;
    m.cms_bright.color = new THREE.Color("#7fb8ff");
    m.cms_bright.opacity = 0.85;
  }
  return { pulse: m.cms_pulse, green: m.cms_green, sweep: m.cms_sweep, faint: m.cms_faint, bright: m.cms_bright };
}

// ---------------------------------------------------------------------------
// Ceiling: dark panel grid under a continuous black backing slab (no hairline seams to leak light
// through), two recessed channels with short dim strip segments, three dim cool lights
// ---------------------------------------------------------------------------
function buildCeiling(kit, ctx, B, H) {
  const [min, max] = B;
  const w = max[0] - min[0];
  const d = max[2] - min[2];
  const f = ceilingFrame(kit, min[0], min[2], H);
  panelGrid(f, w, d, {
    rowH: 1.5,
    panelW: 1.5,
    kick: false,
    topPipes: false,
    seed: ctx.seed * 17 + 3,
    collide: false,
    styles: { panel: 0.78, greeble: 0.1, vent: 0.12 },
    paints: [
      [PALETTE.impMid, 0.5],
      [PALETTE.impDark, 0.36],
      [PALETTE.impGrey, 0.14],
    ],
    ...IMP_THEME,
    accent: "emitWhiteDim",
    decals: false,
  });
  kit.boxMM("paintedMetal", [min[0] - 0.3, H + 0.16, min[2] - 0.3], [max[0] + 0.3, H + 0.3, max[2] + 0.3], BLACK);
  // two channels along x, each with three short dim segments
  for (const z of [min[2] + d * 0.25, min[2] + d * 0.75]) {
    kit.box("paintedMetal", min[0] + w / 2, H - 0.06, z, w - 1.0, 0.1, 0.42, DARK);
    kit.box("paintedMetal", min[0] + w / 2, H - 0.1, z, w - 1.2, 0.03, 0.2, BLACK);
    for (let i = 0; i < 3; i++) {
      const x = min[0] + 0.5 + ((i + 0.5) / 3) * (w - 1.0);
      kit.box("emitWhiteDim", x, H - 0.105, z, (w - 1.0) / 3 - 0.9, 0.025, 0.12, { uv: "keep" });
    }
  }
  // spine fixture down the room's centre line (z -8.5, under the three cool lights): a dark housing
  // with a faint wide diffuser and a narrow bright core, broken where the feeder pipes cross it so
  // the strip never runs into the beams
  const zs = -8.5;
  const pipes = [7.0, 9.9, 12.5];
  const runs = [];
  let x0 = min[0] + 0.6;
  for (const px of pipes) {
    runs.push([x0, px - 0.3]);
    x0 = px + 0.3;
  }
  runs.push([x0, max[0] - 0.6]);
  for (const [a, b] of runs) {
    const xc = (a + b) / 2;
    const len = b - a;
    kit.box("paintedMetal", xc, H - 0.05, zs, len, 0.08, 0.3, DARK);
    kit.box("paintedMetal", xc, H - 0.09, zs, len - 0.06, 0.02, 0.18, BLACK);
    kit.box("emitWhiteFaint", xc, H - 0.1, zs, len - 0.12, 0.012, 0.14, { uv: "keep" });
    kit.box("emitWhiteDim", xc, H - 0.108, zs, len - 0.16, 0.01, 0.035, { uv: "keep" });
  }
  // the lights hang a metre under the panels: right under them they blew the glossy ceiling plates
  // out to a white streak along the spine
  for (const x of [5.6, 9.2, 12.8]) ctx.light(pointLight(0xdfe9ff, 4.5, 8, [x, H - 1.15, zs]));
}

// ---------------------------------------------------------------------------
// xmax wall (x 16): the signal wall, 3 rows x 6 stacked screens in one black bezel frame with mixed
// content and brightness (some tiles dark on standby), a status band above and a readout strip below
// ---------------------------------------------------------------------------
function buildScreenWall(kit, ctx, B) {
  const seg = wallSegment(B, "xmax");
  const { frame, length } = wallFrame(kit, seg.from, seg.to, B[0][1]);
  const cols = 6;
  const rows = 3;
  const cw = 1.18;
  const ch = 0.66;
  const gap = 0.08;
  const W = cols * cw + (cols + 1) * gap;
  const Hh = rows * ch + (rows + 1) * gap;
  const uc = length / 2;
  const vc = 1.72;
  frame.box("paintedMetal", uc, vc, 0.1, W + 0.3, Hh + 0.3, 0.2, BLACK);
  frame.box("impPanel", uc, vc, 0.202, W + 0.1, Hh + 0.1, 0.01, { color: PALETTE.impDark, uv: "keep" });
  const rand = rng(ctx.seed + 21);
  // per tile: material name, or null for a dark standby tile
  const tiles = [
    ["impScreen0", "cms_dim1", "impScreen2", null, "impScreen1", "cms_dim2"],
    ["cms_dim0", "impScreen2", "cms_pulse", "impScreen0", null, "impScreen1"],
    ["impScreen2", null, "cms_dim1", "impScreen4", "impScreen0", "cms_dim2"],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = uc - W / 2 + gap + cw / 2 + c * (cw + gap);
      const v = vc - Hh / 2 + gap + ch / 2 + r * (ch + gap);
      const mat = tiles[r][c];
      frame.box("darkGloss", u, v, 0.21, cw, ch, 0.01);
      if (mat) {
        frame.add(mat, new THREE.PlaneGeometry(cw - 0.06, ch - 0.06), u, v, 0.216, { uv: "keep" });
        frame.box(rand() < 0.75 ? "emitBlue" : "cms_green", u - cw / 2 + 0.1, v - ch / 2 + 0.04, 0.216, 0.05, 0.02, 0.01);
      } else {
        frame.box("emitRed", u - cw / 2 + 0.1, v - ch / 2 + 0.04, 0.216, 0.03, 0.015, 0.01); // standby lamp
        frame.add("decal", new THREE.PlaneGeometry(0.16, 0.16), u + cw / 2 - 0.2, v + ch / 2 - 0.18, 0.217, { uv: "keep", uvRect: decalRect(9) });
      }
    }
  }
  // status band above (green/blue lamps and a stencil), readout strip below
  frame.box("paintedMetal", uc, vc + Hh / 2 + 0.45, 0.06, W + 0.3, 0.36, 0.12, DARK);
  for (let i = 0; i < 14; i++) frame.box(i % 4 === 3 ? "emitAmber" : "emitBlue", uc - W / 2 + 0.5 + i * 0.5, vc + Hh / 2 + 0.45, 0.125, 0.22, 0.06, 0.01);
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uc - W / 2 - 0.55, vc + Hh / 2 + 0.2, 0.001, { uv: "keep", uvRect: decalRect(6) });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uc + W / 2 + 0.55, vc + Hh / 2 + 0.2, 0.001, { uv: "keep", uvRect: decalRect(9) });
  frame.box("paintedMetal", uc, vc - Hh / 2 - 0.33, 0.08, W + 0.3, 0.3, 0.16, BLACK);
  frame.box("leds", uc, vc - Hh / 2 - 0.33, 0.165, W - 0.4, 0.06, 0.01, { uv: "keep" });
  frame.collider(uc - W / 2 - 0.2, uc + W / 2 + 0.2, 0, vc + Hh / 2 + 0.7, 0, 0.25, "screenwall");
  // low equipment plinth under the wall with a blue kick strip
  frame.box("paintedMetal", uc, 0.3, 0.24, W - 0.6, 0.6, 0.48, DARK);
  frame.box("emitBlue", uc, 0.12, 0.485, W - 1.2, 0.02, 0.01);
  frame.collider(uc - W / 2 + 0.3, uc + W / 2 - 0.3, 0, 0.6, 0, 0.5, "plinth");
}

// ---------------------------------------------------------------------------
// zmin wall (z -13): patch-panel wall, a run of racks fed by a ceiling cable trunk with drops. Racks
// vary in width, height and lamp colour; one stands open with its cabling hanging out, one has a
// front panel removed for maintenance (tag, exposed boards, the panel leaning beside it).
// ---------------------------------------------------------------------------
function buildPatchWall(kit, ctx, B, H) {
  const [min, max] = B;
  const side = "zmin";
  const u = (x) => x - min[0];
  const racks = [
    { x: 6.0, w: 1.2, h: 2.4, lit: "emitBlue", kind: "closed" },
    { x: 7.3, w: 1.2, h: 2.2, lit: "emitAmber", kind: "closed" },
    { x: 8.6, w: 1.2, h: 2.5, lit: "emitBlue", kind: "open" },
    { x: 9.9, w: 1.2, h: 2.4, lit: "emitBlue", kind: "closed" },
    { x: 11.2, w: 1.2, h: 2.3, lit: "emitAmber", kind: "closed" },
    { x: 12.5, w: 1.2, h: 2.4, lit: "emitAmber", kind: "service" },
    { x: 13.8, w: 1.2, h: 2.5, lit: "emitBlue", kind: "closed" },
  ];
  racks.forEach((r, i) => {
    if (r.kind === "closed") equipmentRack(kit, ctx, { side, u: u(r.x), w: r.w, h: r.h, seed: ctx.seed + 30 + i, bounds: B, lit: r.lit });
    else if (r.kind === "open") openRack(kit, ctx, B, u(r.x), r.w, r.h, ctx.seed + 30 + i);
    else serviceRack(kit, ctx, B, u(r.x), r.w, r.h, ctx.seed + 30 + i);
  });
  // main trunk along the wall at ceiling level and a second thinner one
  const zt = min[2] + 0.55;
  kit.boxMM("paintedMetal", [5.2, H - 0.32, zt - 0.2], [max[0] - 0.4, H - 0.02, zt + 0.2], BLACK);
  kit.boxMM("paintedMetal", [5.2, H - 0.2, zt + 0.32], [max[0] - 0.4, H - 0.02, zt + 0.5], DARK);
  // drops from the trunk into every rack top, with a connector block
  for (const r of racks) {
    kit.boxMM("paintedMetal", [r.x - 0.14, r.h, zt - 0.14], [r.x + 0.14, H - 0.3, zt + 0.14], DARK);
    kit.box("paintedMetal", r.x, r.h + 0.15, zt, 0.44, 0.3, 0.44, BLACK);
    kit.box("emitBlue", r.x, r.h + 0.15, zt + 0.225, 0.2, 0.03, 0.01, {});
  }
  // feeder pipes from the room's centre line to the trunk
  for (const [x, r, col] of [[7.0, 0.06, PALETTE.impMid], [9.9, 0.045, PALETTE.impGrey], [12.5, 0.06, PALETTE.impMid]]) {
    pipeRun(kit, [[x, H - 0.12, -6.5], [x, H - 0.12, zt + 0.7], [x, H - 0.3, zt + 0.7]], r, col);
  }
  // patch label plates and a bank of small indicator lights between racks
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  for (const r of racks) frame.box("impPanel", u(r.x), r.h + 0.35, 0.02, 0.8, 0.22, 0.02, { color: PALETTE.impLight, uv: "keep" });
  frame.add("decal", new THREE.PlaneGeometry(0.6, 0.6), u(4.6), 2.2, 0.001, { uv: "keep", uvRect: decalRect(2) });
  frame.box("leds", u(4.6), 1.5, 0.02, 0.9, 0.05, 0.02, { uv: "keep" });
  frame.box("leds", u(4.6), 1.3, 0.02, 0.9, 0.05, 0.02, { uv: "keep" });
  frame.box("darkGloss", u(4.6), 0.95, 0.02, 0.9, 0.5, 0.02);
  frame.add("impScreen1", new THREE.PlaneGeometry(0.8, 0.42), u(4.6), 0.95, 0.032, { uv: "keep" });
}

/** Rack with no front panel: frame, module shelves, and a loom of patch cables hanging out of it. */
function openRack(kit, ctx, B, u, w, h, seed) {
  const seg = wallSegment(B, "zmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, B[0][1]);
  const d = 0.6;
  const rand = rng(seed);
  // carcass: back, sides, top, bottom (the front stays open)
  frame.box("paintedMetal", u, h / 2, 0.05, w, h, 0.1, DARK);
  for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (w / 2 - 0.03), h / 2, d / 2, 0.06, h, d, BLACK);
  frame.box("paintedMetal", u, h - 0.04, d / 2, w, 0.08, d, BLACK);
  frame.box("hazard", u, 0.03, d / 2, w, 0.06, d, { texel: 3 });
  // module shelves with lit slots, and the patch plate rows they plug into
  let y = 0.25;
  const plugs = [];
  while (y < h - 0.35) {
    const sh = 0.16 + rand() * 0.2;
    frame.box("metal", u, y + sh / 2, d * 0.55, w - 0.2, sh - 0.04, d * 0.5, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.impMid, texel: 2 });
    const nl = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < nl; i++) frame.box(rand() < 0.2 ? "emitRed" : rand() < 0.3 ? "cms_green" : "emitBlue", u - w / 2 + 0.2 + i * 0.09, y + sh / 2, d * 0.8 + 0.01, 0.03, 0.02, 0.01);
    if (rand() < 0.6) plugs.push([u + w * 0.15 + rand() * 0.2, y + sh / 2]);
    y += sh;
  }
  // cable loom: drops from the top connector, loops out of the rack and plugs back into the modules
  const looms = [
    [u - 0.25, 0.9, 0.16, 0.2],
    [u + 0.05, 1.4, 0.2, 0.26],
    [u + 0.3, 0.6, 0.14, 0.18],
  ];
  for (const [lx, ly, r, sag] of looms) {
    const t = new THREE.TorusGeometry(r, 0.012, 6, 16, Math.PI);
    t.rotateY(Math.PI / 2);
    t.rotateZ(Math.PI / 2);
    frame.add("metal", t, lx, ly, d + sag, { color: PALETTE.impBlack, uv: "scale", uvScale: [0.1, 1] });
  }
  for (const [px, py] of plugs) {
    frame.cylN("metal", px, py, d * 0.8 + 0.06, 0.02, 0.1, { color: PALETTE.impBlack, segments: 8 });
    frame.cylV("metal", px, py + 0.25, d * 0.8 + 0.1, 0.012, 0.5, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.impDark, segments: 8 });
  }
  for (let i = 0; i < 4; i++) frame.cylV("metal", u - w / 2 + 0.22 + i * 0.2, h / 2, d + 0.05 + i * 0.03, 0.012, h - 0.5, { color: i % 2 ? PALETTE.impBlack : PALETTE.impDark, segments: 8 });
  frame.box("cms_green", u + 0.32, h - 0.25, d + 0.02, 0.06, 0.02, 0.02);
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, d + 0.3, "rack");
}

/** Rack under maintenance: lower front panel removed (exposed boards, tag, amber lamp), panel leaning beside it. */
function serviceRack(kit, ctx, B, u, w, h, seed) {
  const seg = wallSegment(B, "zmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, B[0][1]);
  const d = 0.6;
  const rand = rng(seed);
  frame.box("paintedMetal", u, h / 2, d / 2, w, h, d, DARK);
  // upper half keeps its panel and slots
  frame.box("impPanel", u, h * 0.75, d + 0.006, w - 0.1, h * 0.5 - 0.1, 0.012, { color: PALETTE.impMid, uv: "keep" });
  let y = h * 0.52;
  while (y < h - 0.3) {
    const sh = 0.12 + rand() * 0.2;
    frame.box("metal", u, y + sh / 2, d + 0.02, w - 0.24, sh - 0.03, 0.03, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.impMid, texel: 2 });
    for (let i = 0; i < 3; i++) frame.box(rand() < 0.3 ? "emitAmber" : "emitBlue", u - w / 2 + 0.2 + i * 0.09, y + sh / 2, d + 0.038, 0.03, 0.02, 0.008);
    y += sh;
  }
  // lower half: open cavity with boards, a hanging tag and an amber service lamp
  frame.box("paintedMetal", u, h * 0.26, d - 0.15, w - 0.16, h * 0.44, 0.3, BLACK);
  for (let i = 0; i < 4; i++) {
    const bx = u - w / 2 + 0.22 + i * 0.22;
    frame.box("metal", bx, h * 0.26, d - 0.1, 0.02, h * 0.36, 0.34, { color: PALETTE.impDark, texel: 2 });
    for (let j = 0; j < 3; j++) frame.box(rand() < 0.5 ? "emitBlue" : "cms_green", bx + 0.012, h * 0.12 + j * 0.14 + rand() * 0.06, d - 0.02 + rand() * 0.06, 0.006, 0.012, 0.012);
  }
  frame.box("paintedMetal", u, h * 0.5, d + 0.02, w - 0.2, 0.06, 0.04, BLACK);
  frame.box("emitAmber", u - w * 0.3, h * 0.5, d + 0.045, 0.16, 0.03, 0.01);
  frame.box("hazard", u + w * 0.2, h * 0.5 - 0.16, d + 0.03, 0.22, 0.26, 0.01, { texel: 3 });
  frame.add("decal", new THREE.PlaneGeometry(0.16, 0.16), u + w * 0.2, h * 0.5 - 0.16, d + 0.037, { uv: "keep", uvRect: decalRect(1) });
  frame.box("hazard", u, 0.03, d / 2, w, 0.06, d, { texel: 3 });
  // the removed panel leaning against the rack's side
  frame.box("impPanel", u + w / 2 + 0.28, h * 0.22, d + 0.36, w - 0.1, h * 0.44, 0.03, { color: PALETTE.impMid, uv: "keep", tilt: 0.28 });
  frame.collider(u - w / 2, u + w / 2 + 0.7, 0, h, 0, d + 0.5, "rack");
}

// ---------------------------------------------------------------------------
// zmax wall (z -4): antenna feed pipes running along the wall and down into a junction cabinet,
// two wall screens, a signal-strength board
// ---------------------------------------------------------------------------
function buildFeedWall(kit, ctx, B, H) {
  const [min, max] = B;
  const side = "zmax";
  const u = (x) => max[0] - x;
  const zw = max[2] - 0.32;
  // three feed pipes with clamps, stepping down into the junction cabinet at x 13
  const runs = [
    [H - 0.5, 0.075, PALETTE.impMid],
    [H - 0.82, 0.055, PALETTE.impGrey],
    [H - 1.1, 0.045, PALETTE.impDark],
  ];
  runs.forEach(([y, r, col], i) => {
    pipeRun(kit, [[5.6, y, zw - i * 0.14], [13.0 - i * 0.28, y, zw - i * 0.14], [13.0 - i * 0.28, 2.0, zw - i * 0.14]], r, col);
    for (let x = 6.4; x < 12.5; x += 1.6) kit.box("metal", x, y, zw - i * 0.14, 0.14, r * 2 + 0.06, r * 2 + 0.06, { color: PALETTE.impBlack });
  });
  // junction cabinet
  kit.boxMM("paintedMetal", [12.2, 0, max[2] - 0.62], [13.9, 2.0, max[2] - 0.02], DARK);
  kit.boxMM("impPanel", [12.3, 0.15, max[2] - 0.63], [13.8, 1.85, max[2] - 0.62], { color: PALETTE.impMid, uv: "keep" });
  for (let i = 0; i < 5; i++) kit.box(i === 2 ? "emitAmber" : "emitBlue", 12.5 + i * 0.3, 1.5, max[2] - 0.64, 0.14, 0.05, 0.01, {});
  kit.box("leds", 13.05, 1.2, max[2] - 0.64, 1.2, 0.05, 0.01, { uv: "keep" });
  kit.box("hazard", 13.05, 0.04, max[2] - 0.32, 1.7, 0.08, 0.6, { texel: 3 });
  kit.collider([12.2, 0, max[2] - 0.62], [13.9, 2.0, max[2]], "junction");
  // wall screens + a signal-strength board
  wallScreen(kit, ctx, { side, u: u(7.0), v: 1.7, w: 1.6, h: 0.9, screen: 2, bounds: B });
  wallScreen(kit, ctx, { side, u: u(9.3), v: 1.7, w: 1.6, h: 0.9, screen: 0, bounds: B });
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  const bu = u(11.0);
  frame.box("paintedMetal", bu, 1.6, 0.05, 1.1, 1.5, 0.1, BLACK);
  frame.box("impPanel1", bu, 1.6, 0.105, 1.0, 1.4, 0.01, { color: PALETTE.impDark, uv: "keep" });
  for (let i = 0; i < 8; i++) {
    const lit = i < 5;
    frame.box(lit ? (i === 4 ? "emitRed" : "emitAmber") : "rubber", bu - 0.3, 1.0 + i * 0.15, 0.115, 0.3, 0.09, 0.01, { color: PALETTE.rubber });
    frame.box(i < 6 ? "emitBlue" : "rubber", bu + 0.2, 1.0 + i * 0.15, 0.115, 0.3, 0.09, 0.01, { color: PALETTE.rubber });
  }
  frame.add("decal", new THREE.PlaneGeometry(0.36, 0.36), bu, 2.2, 0.115, { uv: "keep", uvRect: decalRect(12) });
  frame.add("decal", new THREE.PlaneGeometry(0.7, 0.7), u(5.6), 2.4, 0.001, { uv: "keep", uvRect: decalRect(14) });
}

// ---------------------------------------------------------------------------
// xmin wall (x 2.4): door wall, a rack and a locker either side of the door, sign over the door
// ---------------------------------------------------------------------------
function buildDoorWall(kit, ctx, B) {
  const [min, max] = B;
  const u = (z) => max[2] - z;
  equipmentRack(kit, ctx, { side: "xmin", u: u(-11.9), w: 1.2, h: 2.4, seed: ctx.seed + 50, bounds: B, lit: "emitBlue" });
  equipmentRack(kit, ctx, { side: "xmin", u: u(-5.4), w: 1.0, h: 2.6, d: 0.5, seed: ctx.seed + 51, bounds: B, lit: "emitAmber" });
  const seg = wallSegment(B, "xmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  frame.box("paintedMetal", u(-9), 3.25, 0.05, 2.4, 0.3, 0.1, BLACK);
  frame.box("emitWhiteDim", u(-9), 3.25, 0.105, 2.0, 0.1, 0.01);
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u(-6.6), 2.0, 0.001, { uv: "keep", uvRect: decalRect(0) });
}

// ---------------------------------------------------------------------------
// Operator stations: two real desks facing the signal wall (worktop on pedestals with a foot-well, a
// canted three-screen bank at the back, keyboard panel, props), plus a standing duty console
// ---------------------------------------------------------------------------
function buildStations(kit, ctx) {
  const yaw = -Math.PI / 2; // desk faces +X (the screen wall); operator sits at -X
  operatorDesk(kit, ctx, { x: 13.5, z: -6.7, yaw, screens: ["impScreen0", "cms_pulse", "impScreen2"], seed: ctx.seed + 60, lampMat: "emitBlue" });
  operatorDesk(kit, ctx, { x: 13.5, z: -10.3, yaw, screens: ["impScreen2", "impScreen1", "impScreen0"], seed: ctx.seed + 61, lampMat: "emitAmber" });
  // duty station by the zmax wall: a third desk turned to face that wall (screen bank at +Z), so its
  // operator chair sits on the room side where the view from the door sees it beside the desk
  operatorDesk(kit, ctx, { x: 6.2, z: -5.85, yaw: Math.PI, screens: ["impScreen1", "impScreen0", "cms_pulse"], seed: ctx.seed + 70, lampMat: "emitBlue" });
}

/**
 * Operator desk: black worktop (2.6 x 0.9) on two pedestals with drawer fronts and a foot-well between
 * them, a canted screen bank on the far edge facing the operator, keyboard panel and button rows on
 * the worktop, headset / datapad / mug, kick lamp and an operator chair. Local frame: operator at +Z.
 */
function operatorDesk(kit, ctx, { x, z, yaw, screens, seed, lampMat }) {
  const w = 2.6;
  const d = 0.9;
  const h = 0.76;
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
  const add = (mat, geo, lx, ly, lz, extra = {}, qq = q) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: qq, ...extra });
  };
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const rand = rng(seed);
  // pedestals with drawer fronts, a modesty panel at the back, the foot-well between
  for (const s of [-1, 1]) {
    add("paintedMetal", new THREE.BoxGeometry(0.6, h - 0.06, d - 0.1), s * (w / 2 - 0.3), (h - 0.06) / 2, -0.05, DARK);
    for (let i = 0; i < 3; i++) {
      add("impPanel", new THREE.BoxGeometry(0.5, 0.18, 0.012), s * (w / 2 - 0.3), 0.15 + i * 0.22, d / 2 - 0.1 + 0.006, { color: PALETTE.impMid, uv: "keep" });
      add("metal", new THREE.BoxGeometry(0.16, 0.02, 0.02), s * (w / 2 - 0.3), 0.15 + i * 0.22, d / 2 - 0.1 + 0.02, { color: PALETTE.impBlack });
    }
  }
  add("paintedMetal", new THREE.BoxGeometry(w - 1.2, h - 0.2, 0.04), 0, (h - 0.2) / 2 + 0.06, -d / 2 + 0.07, BLACK);
  add(lampMat, new THREE.BoxGeometry(w - 1.5, 0.02, 0.01), 0, 0.14, -d / 2 + 0.095);
  // worktop with a rubber operator edge and a keyboard panel
  add("paintedMetal", new THREE.BoxGeometry(w, 0.06, d), 0, h - 0.03, 0, BLACK);
  add("rubber", new THREE.BoxGeometry(w, 0.03, 0.05), 0, h - 0.015, d / 2 - 0.025, { color: PALETTE.rubber });
  add("paintedMetal", new THREE.BoxGeometry(0.9, 0.02, 0.28), -0.1, h + 0.01, 0.12, { color: PALETTE.impDark, texel: 2 });
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) add(rand() < 0.2 ? (rand() < 0.5 ? "emitBlue" : "emitAmber") : "rubber", new THREE.BoxGeometry(0.06, 0.015, 0.05), -0.5 + i * 0.09 + (r % 2) * 0.03, h + 0.028, 0.03 + r * 0.075, { color: PALETTE.rubber });
  add("leds", new THREE.BoxGeometry(0.6, 0.012, 0.04), -0.1, h + 0.026, -0.08, { uv: "keep" });
  // canted screen bank on a rail along the far edge, leaning back, facing the operator
  const bt = 0.16;
  const bH = 0.62;
  const qb = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -bt));
  const bUp = new THREE.Vector3(0, 1, 0).applyQuaternion(qb);
  const bN = new THREE.Vector3(0, 0, 1).applyQuaternion(qb);
  const foot = P(0, h - 0.02, -d / 2 + 0.1);
  const atB = (off, v, lift) => foot.clone().addScaledVector(right, off).addScaledVector(bUp, v).addScaledVector(bN, lift);
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.2, 0.1, 0.16), { pos: atB(0, 0.05, 0).toArray(), quat: qb, color: PALETTE.impBlack, texel: 2 });
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.3, bH, 0.08), { pos: atB(0, 0.1 + bH / 2, 0).toArray(), quat: qb, color: PALETTE.impDark, texel: 1.5 });
  const n = screens.length;
  const cell = (w - 0.4) / n;
  const sw = cell - 0.08;
  const sh = bH - 0.16;
  for (let i = 0; i < n; i++) {
    const off = -w / 2 + 0.2 + (i + 0.5) * cell;
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.05, sh + 0.05, 0.012), { pos: atB(off, 0.1 + bH / 2, 0.046).toArray(), quat: qb });
    kit.add(screens[i], new THREE.PlaneGeometry(sw, sh), { pos: atB(off, 0.1 + bH / 2, 0.054).toArray(), quat: qb, uv: "keep" });
  }
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.26, 0.05, 0.12), { pos: atB(0, 0.1 + bH + 0.02, 0).toArray(), quat: qb, color: PALETTE.impBlack, texel: 2 });
  kit.add(lampMat, new THREE.BoxGeometry(0.14, 0.02, 0.02), { pos: atB(w / 2 - 0.4, 0.1 + bH + 0.05, 0).toArray(), quat: qb });
  // rear of the bank: vent slats + label (the desks are seen from behind from the door)
  for (let i = 0; i < 4; i++) kit.add("paintedMetal", new THREE.BoxGeometry(w * 0.4, 0.02, 0.02), { pos: atB(-w * 0.18, 0.1 + bH * 0.55 + i * 0.06, -0.05).toArray(), quat: qb, color: PALETTE.impBlack, texel: 2 });
  kit.add("impPanel1", new THREE.BoxGeometry(0.5, 0.26, 0.01), { pos: atB(w * 0.25, 0.1 + bH * 0.5, -0.045).toArray(), quat: qb, color: PALETTE.impMid, uv: "keep" });
  kit.add("decal", new THREE.PlaneGeometry(0.2, 0.2), { pos: atB(w * 0.25, 0.1 + bH * 0.5, -0.052).toArray(), quat: qb.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI)), uv: "keep", uvRect: decalRect(seed % 16) });
  // props: headset on the worktop, datapad, mug
  const hq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -0.42));
  const hp = P(0.75, h, 0.2);
  const band = new THREE.TorusGeometry(0.09, 0.012, 6, 14, Math.PI);
  band.rotateX(-Math.PI / 2);
  kit.add("metal", band, { pos: [hp.x, hp.y + 0.012, hp.z], quat: hq, color: PALETTE.impBlack });
  for (const s of [-1, 1]) {
    const cp = P(0.75 + s * 0.09, h, 0.2);
    kit.add("rubber", new THREE.BoxGeometry(0.035, 0.03, 0.06), { pos: [cp.x, cp.y + 0.015, cp.z], quat: hq, color: PALETTE.rubber });
  }
  const dp = P(-1.0, h + 0.012, 0.22);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.3, 0.015, 0.2), { pos: dp.toArray(), quat: q, color: PALETTE.impBlack, texel: 3 });
  const pad = new THREE.PlaneGeometry(0.26, 0.16);
  pad.rotateX(-Math.PI / 2);
  kit.add("impScreen4", pad, { pos: dp.clone().add(new THREE.Vector3(0, 0.009, 0)).toArray(), quat: q, uv: "keep" });
  const mp = P(1.05, h + 0.05, -0.2);
  kit.cyl("metal", mp.x, mp.y, mp.z, 0.045, 0.1, "y", { color: PALETTE.impBlack, segments: 12 });
  impChair(kit, ctx, { x: P(0, 0, d / 2 + 0.45).x, z: P(0, 0, d / 2 + 0.45).z, yaw });
  const c = Math.abs(Math.cos(yaw));
  const sn = Math.abs(Math.sin(yaw));
  const cc = P(0, 0, -0.05);
  const dz = d + 0.1;
  const ex = (w * c + dz * sn) / 2;
  const ez = (w * sn + dz * c) / 2;
  kit.collider([cc.x - ex, 0, cc.z - ez], [cc.x + ex, h + bH + 0.2, cc.z + ez], "desk");
}

// ---------------------------------------------------------------------------
// Sensor sweep: octagonal pedestal with a holographic plot (disc, range rings, contacts with pins,
// a faint drum) and a rotating sweep (flat wedge + vertical scan blade)
// ---------------------------------------------------------------------------
function sensorHolo(kit, ctx, mats, x, z) {
  const top = 0.98;
  kit.cyl("paintedMetal", x, 0.05, z, 0.95, 0.1, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("paintedMetal", x, 0.5, z, 0.78, 0.8, "y", { color: PALETTE.impDark, segments: 8 });
  kit.cyl("darkGloss", x, top - 0.04, z, 0.92, 0.08, "y", { segments: 8 });
  const flat = (geo, yy, mat, opts = {}) => {
    geo.rotateX(-Math.PI / 2);
    kit.add(mat, geo, { pos: [x, yy, z], ...opts });
  };
  flat(new THREE.RingGeometry(0.72, 0.78, 40), top + 0.004, "emitBlue");
  flat(new THREE.RingGeometry(0.84, 0.87, 40), top + 0.004, "metal", { color: PALETTE.impMid });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kit.box(i % 2 ? "emitAmber" : "emitBlue", x + Math.cos(a) * 0.8, 0.62, z + Math.sin(a) * 0.8, 0.08, 0.16, 0.08, {});
  }
  kit.box("leds", x, 0.3, z + 0.79, 0.9, 0.04, 0.01, { uv: "keep" });
  kit.collider([x - 0.95, 0, z - 0.95], [x + 0.95, top + 0.3, z + 0.95], "sensortable");

  const holo = ctx.materials.holo;
  const g = new THREE.Group();
  g.position.set(x, top + 0.02, z);
  // grid disc (textured holo) under everything
  const disc = new THREE.CircleGeometry(0.72, 48);
  disc.rotateX(-Math.PI / 2);
  const dm = new THREE.Mesh(disc, holo);
  g.add(dm);
  // wire structure in the bright material: range rings and a coverage dome of altitude rings (tori
  // read as lines from any angle), a centre spindle, cross-hairs, contacts on pins
  const wire = [];
  const ring = (r, y, tube = 0.008) => {
    const t = new THREE.TorusGeometry(r, tube, 5, 56);
    t.rotateX(Math.PI / 2);
    t.translate(0, y, 0);
    wire.push(t);
  };
  for (const r of [0.24, 0.48, 0.71]) ring(r, 0.004);
  for (const [r, y] of [[0.68, 0.16], [0.6, 0.32], [0.46, 0.48], [0.26, 0.6]]) ring(r, y, 0.006);
  for (const a of [0, Math.PI / 2]) {
    const bar = new THREE.BoxGeometry(1.44, 0.006, 0.012);
    bar.rotateY(a);
    bar.translate(0, 0.004, 0);
    wire.push(bar);
  }
  const spindle = new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8);
  spindle.translate(0, 0.33, 0);
  wire.push(spindle);
  const cap = new THREE.OctahedronGeometry(0.05);
  cap.translate(0, 0.68, 0);
  wire.push(cap);
  const rand = rng(ctx.seed + 80);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.14 + rand() * 0.54;
    const cy = 0.08 + rand() * 0.36;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const c = new THREE.OctahedronGeometry(0.045);
    c.translate(cx, cy, cz);
    wire.push(c);
    const pin = new THREE.BoxGeometry(0.012, cy, 0.012);
    pin.translate(cx, cy / 2, cz);
    wire.push(pin);
  }
  for (const s of wire) if (!s.attributes.normal) s.computeVertexNormals();
  const sm = new THREE.Mesh(mergeGeometries(wire.map((s) => (s.index ? s.toNonIndexed() : s)), false), mats.bright);
  g.add(sm);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.6, 40, 1, true), mats.faint);
  drum.position.y = 0.3;
  g.add(drum);
  // sweep: flat wedge on the disc + a vertical blade from the axis to the rim
  const sweep = new THREE.Group();
  const wedge = new THREE.Mesh(new THREE.CircleGeometry(0.72, 14, 0, Math.PI / 6), mats.sweep);
  wedge.rotation.x = -Math.PI / 2;
  wedge.position.y = 0.006;
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.6), mats.sweep);
  blade.position.set(0.36, 0.3, 0);
  sweep.add(wedge, blade);
  g.add(sweep);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    sweep.rotation.y = -t * 1.2;
    sm.rotation.y = t * 0.12;
    g.position.y = top + 0.02 + Math.sin(t * 0.7) * 0.015;
  });
}

// ---------------------------------------------------------------------------
// Props: a working cluster in the foreground inside the door (equipment cases, a cable reel, an open
// tool case, a spare rack module on a trolley) so the floor between the door and the sensor pedestal
// reads as a used room
// ---------------------------------------------------------------------------
function buildProps(kit, ctx) {
  const rand = rng(ctx.seed + 95);
  // two stacked equipment cases against the patch-wall racks' end
  for (let i = 0; i < 2; i++) {
    const cx = 5.4 + rand() * 0.15;
    const cz = -11.75;
    const cy = i * 0.62;
    kit.box("impPanel1", cx, cy + 0.31, cz, 0.9, 0.62, 0.7, { color: i ? PALETTE.impMid : PALETTE.impDark, uv: "keep" });
    kit.box("paintedMetal", cx, cy + 0.6, cz, 0.94, 0.05, 0.74, BLACK);
    kit.box("paintedMetal", cx, cy + 0.03, cz, 0.94, 0.06, 0.74, BLACK);
    kit.box(i ? "emitAmber" : "emitBlue", cx + 0.46, cy + 0.4, cz, 0.01, 0.03, 0.12, {});
    kit.add("decal", new THREE.PlaneGeometry(0.22, 0.22), { pos: [cx + 0.461, cy + 0.25, cz + 0.15], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: decalRect(i ? 12 : 9) });
  }
  kit.collider([4.9, 0, -12.15], [6.0, 1.3, -11.35], "cases");
  // cable reel on its side with a hub and a loose tail of cable
  const rx = 6.6;
  const rz = -11.2;
  kit.cyl("paintedMetal", rx, 0.3, rz, 0.3, 0.22, "z", { color: PALETTE.impDark, segments: 16 });
  for (const s of [-1, 1]) kit.cyl("paintedMetal", rx, 0.3, rz + s * 0.13, 0.34, 0.03, "z", { color: PALETTE.impBlack, segments: 16 });
  kit.cyl("metal", rx, 0.3, rz, 0.06, 0.32, "z", { color: PALETTE.impMid, segments: 10 });
  pipeRun(kit, [[rx - 0.32, 0.12, rz], [rx - 0.9, 0.02, rz + 0.3], [rx - 1.2, 0.02, rz - 0.2]], 0.014, PALETTE.impBlack);
  kit.collider([rx - 0.35, 0, rz - 0.2], [rx + 0.35, 0.65, rz + 0.2], "reel");
  // open tool case on the floor with a lit tester inside
  const tx = 6.4;
  const tz = -12.05;
  kit.box("paintedMetal", tx, 0.09, tz, 0.5, 0.18, 0.34, DARK);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.02, 0.34), { pos: [tx, 0.29, tz - 0.3], rot: [-1.2, 0, 0], color: PALETTE.impDark, texel: 2 });
  kit.box("rubber", tx, 0.18, tz, 0.44, 0.01, 0.28, { color: PALETTE.rubber });
  for (let i = 0; i < 4; i++) kit.box("metal", tx - 0.15 + i * 0.1, 0.2, tz + 0.02, 0.03, 0.03, 0.2, { color: i % 2 ? PALETTE.impMid : PALETTE.impBlack });
  kit.box("cms_green", tx + 0.18, 0.2, tz - 0.05, 0.03, 0.01, 0.05, {});
  kit.collider([tx - 0.25, 0, tz - 0.2], [tx + 0.25, 0.3, tz + 0.17], "toolcase");
  // spare rack module on a low trolley beside the duty desk
  const mx = 7.9;
  const mz = -5.0;
  kit.box("paintedMetal", mx, 0.08, mz, 0.9, 0.06, 0.6, BLACK);
  for (const [dx, dz] of [[-0.38, -0.22], [0.38, -0.22], [-0.38, 0.22], [0.38, 0.22]]) kit.cyl("rubber", mx + dx, 0.03, mz + dz, 0.04, 0.03, "x", { color: PALETTE.rubber, segments: 10 });
  kit.box("paintedMetal", mx, 0.36, mz, 0.84, 0.5, 0.5, DARK);
  kit.box("metal", mx, 0.36, mz + 0.26, 0.7, 0.36, 0.02, { color: PALETTE.impBlack, texel: 2 });
  for (let i = 0; i < 3; i++) kit.box(i === 1 ? "emitAmber" : "emitBlue", mx - 0.2 + i * 0.12, 0.3, mz + 0.275, 0.03, 0.02, 0.01, {});
  kit.box("hazard", mx, 0.62, mz, 0.86, 0.03, 0.52, { texel: 3 });
  kit.collider([mx - 0.46, 0, mz - 0.32], [mx + 0.46, 0.65, mz + 0.32], "trolley");
}

// ---------------------------------------------------------------------------
// Floor: cable covers from the desks to the screen wall, hatch plate, door threshold
// ---------------------------------------------------------------------------
function buildFloorDetail(kit, ctx, B) {
  const [min, max] = B;
  for (const z of [-6.7, -10.3]) {
    kit.boxMM("paintedMetal", [14.1, 0, z - 0.12], [max[0] - 0.2, 0.05, z + 0.12], BLACK);
    kit.collider([14.1, 0, z - 0.12], [max[0] - 0.2, 0.05, z + 0.12], "trunk");
  }
  kit.boxMM("paintedMetal", [HOLO_X - 0.12, 0, -12.6], [HOLO_X + 0.12, 0.05, -9.5], BLACK);
  kit.collider([HOLO_X - 0.12, 0, -12.6], [HOLO_X + 0.12, 0.05, -9.5], "trunk");
  // hatch plate
  kit.box("paintedMetal", 8.4, 0.005, -11.4, 1.2, 0.01, 1.2, BLACK);
  kit.box("metal", 8.4, 0.01, -11.4, 1.0, 0.012, 1.0, { color: PALETTE.impMid, texel: 2 });
  // threshold: hazard-free dark plate and a stencil inside the door
  kit.boxMM("paintedMetal", [min[0], 0, -10.3], [min[0] + 0.3, 0.012, -7.7], BLACK);
  const dg = new THREE.PlaneGeometry(0.6, 0.6);
  dg.rotateX(-Math.PI / 2);
  kit.add("decal", dg, { pos: [min[0] + 1.6, 0.004, -9], uv: "keep", uvRect: decalRect(9) });
}
