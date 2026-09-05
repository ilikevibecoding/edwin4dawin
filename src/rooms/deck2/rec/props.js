// Recreation-lounge-local props: bar stools, dispenser bar pieces, holo-game tables, lounge sofas,
// exercise rack, mats, media wall. Kit-bashed; colliders are world AABBs. Shared props stay untouched.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../_shared/palette.js";
import { placer } from "../_shared/props.js";

const BLACK = IMP.impBlack;
const DARK = IMP.impDark;
const MID = IMP.impMid;
const GREY = IMP.impGrey;
const STEEL = IMP.steel;
// orientation of an overlay quad lying flat, facing up (+Y)
const UP = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

// Fixed pedestal stool: disc base, column, padded seat. `variant` 0 plain, 1 with a foot ring,
// 2 with a low back hoop on two posts (facing local -Z after `yaw`). `cushion` recolours the pad.
export function stool(kit, x, y, z, { h = 0.72, r = 0.2, cushion = DARK, variant = 0, yaw = 0 } = {}) {
  kit.cyl("metal", x, y + 0.02, z, 0.24, 0.04, "y", { color: BLACK, segments: 14 });
  kit.cyl("metal", x, y + h / 2, z, 0.035, h - 0.1, "y", { color: STEEL, segments: 8 });
  kit.cyl("paintedMetal", x, y + h - 0.09, z, r * 0.6, 0.04, "y", { color: BLACK, segments: 10 });
  kit.cyl("fabric", x, y + h - 0.035, z, r, 0.07, "y", { color: cushion, segments: 16, texel: 2 });
  if (variant === 1) {
    kit.add("metal", new THREE.TorusGeometry(0.19, 0.012, 6, 20), { pos: [x, y + h * 0.36, z], rot: [Math.PI / 2, 0, 0], color: STEEL });
  } else if (variant === 2) {
    // two posts and a steel arch (upper half of a torus in the local XY plane) with a fabric pad
    const P = placer(kit, [x, y, z], yaw);
    for (const sx of [-1, 1]) P.cyl("metal", sx * 0.17, h + 0.04, 0.15, 0.012, 0.12, "y", { color: STEEL, segments: 8 });
    kit.add("metal", new THREE.TorusGeometry(0.17, 0.014, 6, 14, Math.PI), { pos: P.world(0, h + 0.1, 0.15), rot: [0, yaw, 0], color: STEEL });
    P.box("fabric", 0, h + 0.2, 0.15, 0.28, 0.1, 0.05, { color: cushion, texel: 2 });
  }
  kit.collider([x - r, y, z - r], [x + r, y + (variant === 2 ? h + 0.28 : h), z + r], "stool");
}

// Round holo-game table: heavy pedestal, black gloss top with a glowing grid of blue squares and a
// rim light; four stools around it, jittered off the circle, two with back hoops. Returns the blue
// grid cells as overlay quad specs (`{ pos, w, h, quat, row }`, row 0..5 along +Z) so the room can
// roll a brightness pattern across them with one multiply-blended mesh.
export function gameTable(kit, x, y, z, seed, { r = 0.75, h = 0.78 } = {}) {
  const rand = rng(seed);
  kit.cyl("paintedMetal", x, y + 0.04, z, r * 0.7, 0.08, "y", { color: BLACK, segments: 20 });
  kit.cyl("paintedMetal", x, y + h / 2, z, 0.16, h - 0.1, "y", { color: DARK, segments: 12, texel: 2.5 });
  kit.cyl("paintedMetal", x, y + h - 0.05, z, r, 0.1, "y", { color: DARK, segments: 28, texel: 2.5 });
  kit.cyl("darkGloss", x, y + h + 0.006, z, r - 0.06, 0.012, "y", { segments: 28 });
  kit.cyl("emitBlue", x, y + h - 0.02, z, r + 0.004, 0.02, "y", { segments: 28, open: true });
  // grid of lit squares inside a 0.9 m square board
  const n = 6;
  const cell = 0.14;
  const half = (n * cell) / 2;
  const cells = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = rand();
      if (v < 0.3) continue;
      const m = v < 0.85 ? "emitBlue" : v < 0.95 ? "emitAmber" : "emitRedImp";
      const cx = x - half + (i + 0.5) * cell;
      const cz = z - half + (j + 0.5) * cell;
      kit.box(m, cx, y + h + 0.016, cz, cell - 0.04, 0.008, cell - 0.04);
      // the quad sits 1 mm over the cell and 1 cm larger: seen at a 15 deg grazing angle the parallax
      // is under 4 mm, so the whole cell stays covered and the spill lands on the dark gloss
      if (m === "emitBlue") cells.push({ pos: [cx, y + h + 0.021, cz], w: cell - 0.03, h: cell - 0.03, quat: UP, row: j });
    }
  }
  // side control pads
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const px = x + Math.sin(a) * (r - 0.2);
    const pz = z + Math.cos(a) * (r - 0.2);
    kit.box("darkGloss", px, y + h + 0.014, pz, 0.14, 0.006, 0.14);
    kit.box(rand() < 0.5 ? "emitAmber" : "emitRedImp", px, y + h + 0.02, pz, 0.04, 0.006, 0.04);
  }
  kit.collider([x - r, y, z - r], [x + r, y + h, z + r], "game-table");
  const sr = r + 0.55;
  const cushions = [MID, DARK, 0x4a3038, MID];
  [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((a, i) => {
    const aa = a + (rand() - 0.5) * 0.35;
    const rr = sr + (rand() - 0.5) * 0.2;
    // the hoop faces the table: local -Z toward the centre means yaw = aa + PI
    stool(kit, x + Math.sin(aa) * rr, y, z + Math.cos(aa) * rr, { h: 0.5, r: 0.21, cushion: cushions[(i + seed) % 4], variant: i % 2 === 0 ? 2 : 0, yaw: aa + Math.PI + (rand() - 0.5) * 0.6 });
  });
  return { cells };
}

// Wall sconce facing local +Z: dark back plate, black housing with mid-grey side fins and a warm
// diffuser. Returns the overlay quad spec for the diffuser so its glow can follow the light it houses.
export function sconce(kit, pos, yaw, { w = 0.34, h = 0.5 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.03, w + 0.1, h + 0.1, 0.06, { color: DARK, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.11, w, h, 0.1, { color: BLACK, texel: 2.5 });
  for (const sx of [-1, 1]) P.box("paintedMetal", sx * (w / 2 + 0.02), 0, 0.12, 0.03, h + 0.04, 0.14, { color: MID });
  P.box("emitWarmSoft", 0, 0, 0.155, w - 0.1, h - 0.14, 0.012, { uv: "keep" });
  P.box("emitAmber", 0, -h / 2 + 0.05, 0.162, 0.05, 0.015, 0.006);
  return { pos: P.world(0, 0, 0.167), yaw, w: w - 0.12, h: h - 0.16 };
}

// Lounge sofa along local X, backrest on the local -Z side: black plinth with a toe recess, an
// upholstered base and back shell in dark blue-grey fabric, segmented seat and back cushions a shade
// lighter with pale piping along their front/top edges, painted arm panels with black pads, an amber
// strip under the seat. `color` is the arm/frame paint, `cushion` the upholstery tint.
export function benchSeat(kit, pos, yaw, len, { back = true, color = MID, cushion = 0x3a3d45, piping = 0x9aa0aa } = {}) {
  const P = placer(kit, pos, yaw);
  const n = Math.max(1, Math.round(len / 0.75));
  const segW = (len - 0.12) / n;
  // the base band sits a step darker than the pads so the seams between cushions read at range; every
  // pad carries a smaller crown on top (two-step profile = stuffed cushion, not a slab) and a pale
  // piping strip along its front edge
  const base = 0x2c2f36;
  P.box("paintedMetal", 0, 0.05, 0, len - 0.1, 0.1, 0.56, { color: BLACK });
  P.box("fabric", 0, 0.2, 0, len, 0.2, 0.62, { color: base, texel: 2 });
  for (let i = 0; i < n; i++) {
    const lx = -len / 2 + 0.06 + (i + 0.5) * segW;
    P.box("fabric", lx, 0.36, 0.03, segW - 0.03, 0.12, 0.56, { color: cushion, texel: 2 });
    P.box("fabric", lx, 0.44, 0.02, segW - 0.1, 0.05, 0.48, { color: cushion, texel: 2 });
    P.box("fabric", lx, 0.425, 0.305, segW - 0.05, 0.02, 0.03, { color: piping, texel: 2 });
  }
  if (back) {
    const lean = 0.14;
    const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, 0, 0)));
    kit.add("fabric", new THREE.BoxGeometry(len, 0.56, 0.06), { pos: P.world(0, 0.6, -0.33), quat: tq, color: base, texel: 2 });
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + 0.06 + (i + 0.5) * segW;
      kit.add("fabric", new THREE.BoxGeometry(segW - 0.03, 0.44, 0.08), { pos: P.world(lx, 0.64, -0.28), quat: tq, color: cushion, texel: 2 });
      kit.add("fabric", new THREE.BoxGeometry(segW - 0.1, 0.34, 0.05), { pos: P.world(lx, 0.64, -0.225), quat: tq, color: cushion, texel: 2 });
      kit.add("fabric", new THREE.BoxGeometry(segW - 0.05, 0.022, 0.03), { pos: P.world(lx, 0.865, -0.225), quat: tq, color: piping, texel: 2 });
    }
  }
  for (const sx of [-1, 1]) {
    P.box("paintedMetal", sx * (len / 2 + 0.03), back ? 0.36 : 0.26, -0.02, 0.06, back ? 0.72 : 0.52, 0.66, { color, texel: 2.5 });
    P.box("paintedMetal", sx * (len / 2 + 0.03), back ? 0.73 : 0.53, -0.02, 0.08, 0.03, 0.62, { color: BLACK });
  }
  P.box("emitAmber", 0, 0.12, 0.312, len - 0.3, 0.012, 0.006);
  P.collider([-len / 2 - 0.06, 0, -0.36], [len / 2 + 0.06, back ? 0.9 : 0.55, 0.31], "sofa");
}

// Uplight housing sitting on a canopy top: black box, mid-grey end caps, warm diffuser facing the
// ceiling (the room's fill for the bar back sits just above it).
export function uplight(kit, x, y, z, w = 0.6) {
  kit.box("paintedMetal", x, y + 0.07, z, w, 0.14, 0.26, { color: BLACK, texel: 2.5 });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + (sx * (w + 0.02)) / 2, y + 0.08, z, 0.03, 0.18, 0.3, { color: MID });
  kit.box("emitWarmSoft", x, y + 0.145, z, w - 0.1, 0.012, 0.18, { uv: "keep" });
}

// Wall vent grille facing local +Z: dark frame, black recess, mid-grey horizontal slats.
export function ventGrille(kit, pos, yaw, w = 0.9, h = 0.45) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.03, w, h, 0.06, { color: DARK, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.061, w - 0.1, h - 0.1, 0.004, { color: BLACK });
  const n = Math.max(3, Math.round((h - 0.1) / 0.06));
  for (let i = 0; i < n; i++) P.box("paintedMetal", 0, -h / 2 + 0.05 + (i + 0.5) * ((h - 0.1) / n), 0.066, w - 0.14, 0.018, 0.006, { color: MID });
  for (const sx of [-1, 1]) P.box("metal", (sx * (w - 0.06)) / 2, 0, 0.062, 0.025, 0.025, 0.008, { color: STEEL });
}

// Small wall junction box with a matte conduit rising from its top (to the shell's service tray).
export function junctionBox(kit, pos, yaw, { w = 0.3, h = 0.4, conduitUp = 0 } = {}) {
  const P = placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0, 0.07, w, h, 0.14, { color: MID, texel: 2.5 });
  P.box("paintedMetal", 0, 0, 0.145, w - 0.06, h - 0.06, 0.01, { color: DARK });
  P.box("emitAmber", w / 2 - 0.08, h / 2 - 0.08, 0.152, 0.05, 0.02, 0.008);
  if (conduitUp > 0) P.cyl("paintedMetal", 0, h / 2 + conduitUp / 2, 0.06, 0.03, conduitUp, "y", { color: DARK, segments: 8, texel: 2.5 });
}

// Low lounge table (0.45 m) with a lit inset.
export function lowTable(kit, x, y, z, w, d) {
  kit.box("paintedMetal", x, y + 0.42, z, w, 0.06, d, { color: GREY, texel: 2.5 });
  kit.box("paintedMetal", x, y + 0.2, z, w - 0.5, 0.4, d - 0.4, { color: DARK, texel: 2.5 });
  kit.box("paintedMetal", x, y + 0.03, z, w - 0.3, 0.06, d - 0.2, { color: BLACK });
  kit.box("darkGloss", x, y + 0.455, z, w - 0.3, 0.01, d - 0.3);
  kit.box("emitBlue", x, y + 0.462, z, w - 0.9, 0.006, 0.03);
  kit.collider([x - w / 2, y, z - d / 2], [x + w / 2, y + 0.46, z + d / 2], "table");
}

// Rows of small coloured canisters/bottles on a shelf segment centred at (x, y, z), spread along X.
// `count` bottles fill the segment from the left (fewer = a part-used shelf); `fallen` lays one down.
export function bottleRow(kit, x, y, z, len, seed, count = 8, { slots = count, fallen = false } = {}) {
  const rand = rng(seed);
  const colours = [0xd94b3a, 0x3a7bff, 0xffa028, 0x38d67a, 0xc9ccd1, 0x9b5de5, 0x2ec4b6, 0xff6f91];
  for (let i = 0; i < count; i++) {
    const bx = x - len / 2 + (i + 0.5) * (len / slots) + (rand() - 0.5) * 0.04;
    const r = 0.035 + rand() * 0.02;
    const h = 0.16 + rand() * 0.12;
    const c = colours[Math.floor(rand() * colours.length)];
    kit.cyl("metal", bx, y + h / 2, z, r, h, "y", { color: c, segments: 8 });
    kit.cyl("metal", bx, y + h + 0.02, z, r * 0.5, 0.04, "y", { color: STEEL, segments: 6 });
  }
  if (fallen) {
    const bx = x + len / 2 - 0.16;
    kit.cyl("metal", bx, y + 0.04, z + 0.02, 0.04, 0.22, "x", { color: colours[Math.floor(rand() * colours.length)], segments: 8 });
    kit.cyl("metal", bx + 0.13, y + 0.04, z + 0.02, 0.02, 0.04, "x", { color: STEEL, segments: 6 });
  }
}

// Dispenser nozzle cluster on a back counter: vertical riser, spout, drip tray, indicator.
export function dispenser(kit, x, y, z, seed) {
  const rand = rng(seed);
  kit.box("paintedMetal", x, y + 0.02, z, 0.36, 0.04, 0.28, { color: BLACK });
  kit.box("darkGloss", x, y + 0.045, z + 0.03, 0.3, 0.01, 0.2);
  kit.cyl("metal", x, y + 0.3, z - 0.1, 0.045, 0.56, "y", { color: STEEL, segments: 10 });
  kit.cyl("metal", x, y + 0.5, z + 0.02, 0.028, 0.24, "z", { color: STEEL, segments: 8 });
  kit.cyl("metal", x, y + 0.44, z + 0.12, 0.02, 0.1, "y", { color: DARK, segments: 8 });
  kit.box("darkGloss", x, y + 0.34, z - 0.06, 0.16, 0.12, 0.03);
  kit.box(rand() < 0.5 ? "emitAmber" : "emitBlue", x, y + 0.36, z - 0.04, 0.08, 0.03, 0.01);
  kit.box("emitGreen", x - 0.05, y + 0.31, z - 0.04, 0.02, 0.02, 0.01);
  kit.box("emitRedImp", x + 0.05, y + 0.31, z - 0.04, 0.02, 0.02, 0.01);
}

// Bar-top tap cluster: black base plate, three steel risers with spouts and black handles, drip tray.
export function tapCluster(kit, x, y, z) {
  kit.box("paintedMetal", x, y + 0.02, z, 0.42, 0.04, 0.16, { color: BLACK });
  for (let i = 0; i < 3; i++) {
    const tx = x - 0.14 + i * 0.14;
    kit.cyl("metal", tx, y + 0.19, z, 0.018, 0.3, "y", { color: STEEL, segments: 8 });
    kit.cyl("metal", tx, y + 0.32, z + 0.06, 0.014, 0.12, "z", { color: STEEL, segments: 8 });
    kit.box("paintedMetal", tx, y + 0.4, z - 0.01, 0.03, 0.1, 0.03, { color: i === 1 ? IMP.impRed : BLACK });
    kit.box(i === 1 ? "emitAmber" : "emitBlue", tx, y + 0.12, z + 0.02, 0.012, 0.03, 0.006);
  }
  kit.box("darkGloss", x, y + 0.01, z + 0.22, 0.4, 0.02, 0.14);
  for (let i = 0; i < 5; i++) kit.box("paintedMetal", x - 0.16 + i * 0.08, y + 0.022, z + 0.22, 0.01, 0.004, 0.12, { color: MID });
}

// Steel cup (Imperial mess tumbler) with a dark rim.
export function cup(kit, x, y, z, r = 0.035, h = 0.09) {
  kit.cyl("metal", x, y + h / 2, z, r, h, "y", { color: STEEL, segments: 10 });
  kit.cyl("metal", x, y + h + 0.004, z, r * 0.85, 0.008, "y", { color: BLACK, segments: 10 });
}

// Serving tray with cups (2-4) at a slight yaw.
export function tray(kit, x, y, z, yaw, seed) {
  const rand = rng(seed);
  const P = placer(kit, [x, y, z], yaw);
  P.box("paintedMetal", 0, 0.008, 0, 0.44, 0.016, 0.3, { color: MID });
  P.box("paintedMetal", 0, 0.02, 0, 0.4, 0.008, 0.26, { color: DARK });
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const p = P.world(-0.14 + i * 0.1 + (rand() - 0.5) * 0.02, 0.024, (rand() - 0.5) * 0.12);
    cup(kit, p[0], p[1], p[2], 0.03, 0.07 + rand() * 0.03);
  }
}

// Bar order terminal: small angled screen on a stub, keys beside it.
export function barTerminal(kit, x, y, z, yaw, mat = "screenImp2") {
  const P = placer(kit, [x, y, z], yaw);
  const tilt = -0.5;
  const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
  P.box("paintedMetal", 0, 0.03, 0, 0.3, 0.06, 0.16, { color: BLACK });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.36, 0.26, 0.03), { pos: P.world(0, 0.2, -0.02), quat: tq, color: BLACK });
  kit.add("darkGloss", new THREE.BoxGeometry(0.32, 0.22, 0.01), { pos: P.world(0, 0.2 - Math.sin(tilt) * 0.02, -0.02 + Math.cos(tilt) * 0.02), quat: tq });
  kit.add(mat, new THREE.BoxGeometry(0.28, 0.18, 0.01), { pos: P.world(0, 0.2 - Math.sin(tilt) * 0.026, -0.02 + Math.cos(tilt) * 0.026), quat: tq, uv: "keep" });
  for (let i = 0; i < 4; i++) P.box(i % 2 ? "emitAmber" : "emitBlue", -0.09 + i * 0.06, 0.065, 0.06, 0.04, 0.01, 0.03);
}

// Exercise rack: two uprights, three cross bars, a weight plate stack and hand grips.
export function exerciseRack(kit, x, y, z, yaw, { w = 1.6, h = 2.2, d = 0.8 } = {}) {
  const P = placer(kit, [x, y, z], yaw);
  const box = P.box;
  for (const sx of [-1, 1]) {
    box("paintedMetal", (sx * w) / 2, h / 2, 0, 0.1, h, 0.1, { color: DARK, texel: 2.5 });
    box("paintedMetal", (sx * w) / 2, 0.03, 0, 0.3, 0.06, d, { color: BLACK });
    box("paintedMetal", (sx * w) / 2, h - 0.03, 0, 0.1, 0.06, d, { color: DARK });
  }
  for (const ly of [1.0, 1.55, h - 0.06]) P.cyl("metal", 0, ly, 0, 0.025, w - 0.1, "x", { color: STEEL, segments: 10 });
  // plate stack on one side, grips on the other
  for (let i = 0; i < 5; i++) P.cyl("metal", -w / 2 + 0.25, 0.14 + i * 0.05, d / 2 - 0.15, 0.16 - i * 0.012, 0.04, "y", { color: BLACK, segments: 16 });
  for (const lz of [-0.25, 0.25]) box("fabric", w / 2 - 0.3, 1.25, lz, 0.32, 0.05, 0.05, { color: BLACK, texel: 2 });
  box("emitAmber", 0, h - 0.12, d / 2 - 0.02, 0.2, 0.02, 0.01);
  P.collider([-w / 2 - 0.15, 0, -d / 2], [w / 2 + 0.15, h, d / 2], "rack");
}

// Floor exercise mat (thin fabric box, slightly rounded look via a darker border).
export function mat(kit, x, y, z, w, d, color = MID) {
  kit.box("fabric", x, y + 0.025, z, w, 0.05, d, { color, texel: 2 });
  kit.box("fabric", x, y + 0.052, z, w - 0.16, 0.004, d - 0.16, { color: DARK, texel: 2 });
}

// Media wall: black backing plate, 2x2 screens (one of each Imperial layout), amber accent strip
// above; faces `yaw` like props.
export function mediaWall(kit, pos, yaw, screens, { w = 5.8, h = 3.7, mats = ["screenImp0", "screenImp1", "screenImp2", "screenImp3"] } = {}) {
  const P = placer(kit, pos, yaw);
  const box = P.box;
  box("paintedMetal", 0, h / 2, 0.05, w, h, 0.1, { color: BLACK, texel: 2.5 });
  box("paintedMetal", 0, h - 0.06, 0.12, w, 0.12, 0.04, { color: DARK });
  box("paintedMetal", 0, 0.06, 0.12, w, 0.12, 0.04, { color: DARK });
  box("emitAmber", 0, h + 0.08, 0.06, w - 0.4, 0.04, 0.012);
  const sw = 2.6;
  const sh = 1.5;
  let k = 0;
  for (const ly of [h - 0.35 - sh / 2, h - 0.35 - sh - 0.15 - sh / 2]) {
    for (const lx of [-sw / 2 - 0.1, sw / 2 + 0.1]) {
      screens(P.world(lx, ly, 0.18), yaw, sw, sh, mats[k % mats.length]);
      k++;
    }
  }
  // small readout row under the screens
  for (let i = 0; i < 12; i++) box(i % 3 === 0 ? "emitAmber" : "emitBlue", -w / 2 + 0.5 + i * ((w - 1.0) / 11), 0.3, 0.11, 0.18, 0.03, 0.01);
}

// Wall score/notice board: dark plate, header, rows of amber/blue bars (a leaderboard / roster).
export function scoreBoard(kit, pos, yaw, w, h, seed, { accent = "emitAmber", secondary = "emitBlue", rows = 5 } = {}) {
  const P = placer(kit, pos, yaw);
  const box = P.box;
  const rand = rng(seed);
  box("paintedMetal", 0, 0, 0.03, w + 0.16, h + 0.16, 0.06, { color: DARK, texel: 2.5 });
  box("paintedMetal", 0, 0, 0.065, w, h, 0.01, { color: BLACK });
  box("darkGloss", 0, 0, 0.072, w - 0.06, h - 0.06, 0.004);
  box(accent, 0, h / 2 - 0.09, 0.078, w - 0.16, 0.025, 0.004);
  box(accent, -w / 2 + 0.32, h / 2 - 0.16, 0.078, 0.48, 0.05, 0.004);
  for (let k = 0; k < 3; k++) box(secondary, w / 2 - 0.2 - k * 0.2, h / 2 - 0.16, 0.078, 0.12, 0.05, 0.004);
  const top = h / 2 - 0.3;
  const bottom = -h / 2 + 0.12;
  const pitch = (top - bottom) / rows;
  for (let i = 0; i < rows; i++) {
    const y = top - (i + 0.5) * pitch;
    const label = 0.35 + rand() * 0.25;
    box(rand() < 0.75 ? secondary : accent, -w / 2 + 0.12 + label / 2, y, 0.078, label, 0.03, 0.004);
    let x = -w / 2 + 0.2 + label;
    const nb = 2 + Math.floor(rand() * 4);
    for (let j = 0; j < nb && x < w / 2 - 0.3; j++) {
      const bw = 0.15 + rand() * 0.45;
      if (x + bw > w / 2 - 0.15) break;
      const r = rand();
      box(r < 0.55 ? secondary : r < 0.9 ? accent : "emitRedImp", x + bw / 2, y, 0.078, bw, pitch * 0.42, 0.004);
      x += bw + 0.08;
    }
  }
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("metal", (sx * (w + 0.1)) / 2, (sy * (h + 0.1)) / 2, 0.062, 0.03, 0.03, 0.01, { color: STEEL });
}

// 1.2 m equipment crate without rubber bumpers (keeps the room's material count down): recessed side
// panels, steel corner angles, handle and a lit status tab. Local +Z is the front.
export function gearCrate(kit, pos, yaw, { w = 1.2, h = 1.2, d = 1.2, color = MID, tab = "emitBlue" } = {}) {
  const P = placer(kit, pos, yaw);
  const box = P.box;
  box("paintedMetal", 0, h / 2, 0, w, h, d, { color, texel: 2.5 });
  box("paintedMetal", 0, h / 2, d / 2 + 0.001, w - 0.3, h - 0.3, 0.03, { color: DARK, texel: 2.5 });
  box("paintedMetal", 0, h / 2, -d / 2 - 0.001, w - 0.3, h - 0.3, 0.03, { color: DARK, texel: 2.5 });
  box("paintedMetal", w / 2 + 0.001, h / 2, 0, 0.03, h - 0.3, d - 0.3, { color: DARK, texel: 2.5 });
  box("paintedMetal", -w / 2 - 0.001, h / 2, 0, 0.03, h - 0.3, d - 0.3, { color: DARK, texel: 2.5 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box("metal", (sx * (w - 0.08)) / 2, h / 2, (sz * (d - 0.08)) / 2, 0.09, h + 0.02, 0.09, { color: STEEL });
  box("metal", 0, h - 0.15, d / 2 + 0.03, 0.4, 0.05, 0.05, { color: STEEL });
  box(tab, w / 2 - 0.2, h - 0.12, d / 2 + 0.017, 0.12, 0.03, 0.006);
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "crate");
}

// Central four-sided info column (kiosk): black base, dark square shaft with chamfer posts and amber
// corner strips, one screen per face (all four layouts), blue ring under the cap.
// `screens(pos, yaw, w, h, mat)` draws a screen.
export function infoColumn(kit, x, y, z, screens, { side = 1.2, h = 2.7 } = {}) {
  kit.box("paintedMetal", x, y + 0.06, z, side + 0.4, 0.12, side + 0.4, { color: BLACK, texel: 2.5 });
  kit.box("paintedMetal", x, y + 0.12 + (h - 0.32) / 2, z, side, h - 0.32, side, { color: DARK, texel: 2.5 });
  kit.box("paintedMetal", x, y + h - 0.1, z, side + 0.12, 0.2, side + 0.12, { color: BLACK, texel: 2.5 });
  kit.box("paintedMetal", x, y + h - 0.21, z, side + 0.02, 0.02, side + 0.02, { color: MID });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    kit.box("paintedMetal", x + (sx * side) / 2, y + h / 2 - 0.1, z + (sz * side) / 2, 0.12, h - 0.32, 0.12, { color: BLACK });
    kit.box("emitAmber", x + sx * (side / 2 + 0.061), y + h / 2 - 0.1, z + (sz * side) / 2, 0.004, h - 0.9, 0.03);
    kit.box("emitAmber", x + (sx * side) / 2, y + h / 2 - 0.1, z + sz * (side / 2 + 0.061), 0.03, h - 0.9, 0.004);
  }
  const ring = side / 2 + 0.006;
  kit.boxMM("emitBlue", [x - ring, y + h - 0.3, z - ring], [x + ring, y + h - 0.26, z - ring + 0.012]);
  kit.boxMM("emitBlue", [x - ring, y + h - 0.3, z + ring - 0.012], [x + ring, y + h - 0.26, z + ring]);
  kit.boxMM("emitBlue", [x - ring, y + h - 0.3, z - ring], [x - ring + 0.012, y + h - 0.26, z + ring]);
  kit.boxMM("emitBlue", [x + ring - 0.012, y + h - 0.3, z - ring], [x + ring, y + h - 0.26, z + ring]);
  const sy = y + 1.65;
  const off = side / 2 + 0.08 - 0.01;
  screens([x + off, sy, z], Math.PI / 2, 0.9, 0.6, "screenImp0");
  screens([x - off, sy, z], -Math.PI / 2, 0.9, 0.6, "screenImp1");
  screens([x, sy, z + off], 0, 0.9, 0.6, "screenImp2");
  screens([x, sy, z - off], Math.PI, 0.9, 0.6, "screenImp3");
  // lit readout strip under each screen
  for (const [dx, dz, w, d] of [[off, 0, 0.012, 0.7], [-off, 0, 0.012, 0.7], [0, off, 0.7, 0.012], [0, -off, 0.7, 0.012]]) {
    kit.box("emitAmber", x + dx, y + 1.2, z + dz, w, 0.025, d);
  }
  kit.collider([x - side / 2 - 0.2, y, z - side / 2 - 0.2], [x + side / 2 + 0.2, y + h, z + side / 2 + 0.2], "column");
}

// Tall standing table (1.1 m) with a lit ring under the top.
export function standTable(kit, x, y, z) {
  kit.cyl("paintedMetal", x, y + 0.025, z, 0.32, 0.05, "y", { color: BLACK, segments: 16 });
  kit.cyl("metal", x, y + 0.55, z, 0.045, 1.0, "y", { color: STEEL, segments: 10 });
  kit.cyl("paintedMetal", x, y + 1.08, z, 0.38, 0.05, "y", { color: GREY, segments: 20, texel: 2.5 });
  kit.cyl("darkGloss", x, y + 1.11, z, 0.3, 0.012, "y", { segments: 20 });
  kit.cyl("emitBlue", x, y + 1.06, z, 0.34, 0.015, "y", { segments: 20, open: true });
  kit.collider([x - 0.38, y, z - 0.38], [x + 0.38, y + 1.11, z + 0.38], "table");
}

// Floor-standing light obelisk: black shaft with an amber strip on each face, mid-grey cap.
export function lightObelisk(kit, x, y, z, { h = 2.2, s = 0.42 } = {}) {
  kit.box("paintedMetal", x, y + 0.04, z, s + 0.2, 0.08, s + 0.2, { color: BLACK });
  kit.box("paintedMetal", x, y + 0.08 + (h - 0.16) / 2, z, s, h - 0.16, s, { color: BLACK, texel: 2.5 });
  kit.box("paintedMetal", x, y + h - 0.04, z, s + 0.06, 0.08, s + 0.06, { color: MID });
  for (const [dx, dz, w, d] of [[s / 2 + 0.004, 0, 0.008, 0.06], [-s / 2 - 0.004, 0, 0.008, 0.06], [0, s / 2 + 0.004, 0.06, 0.008], [0, -s / 2 - 0.004, 0.06, 0.008]]) {
    kit.box("emitAmber", x + dx, y + h / 2 + 0.1, z + dz, w, h - 0.8, d);
  }
  kit.collider([x - s / 2 - 0.1, y, z - s / 2 - 0.1], [x + s / 2 + 0.1, y + h, z + s / 2 + 0.1], "obelisk");
}

// Recessed ceiling light channel running along X between x0..x1 at z, hung from ceilY: black
// housing, mid-grey lips, segmented diffuser strip (one centre-bright diffuser per 2 m segment).
export function lightChannel(kit, x0, x1, z, ceilY, { w = 0.5, mat = "emitWarmSoft", segment = 2.0, drop = 0.14 } = {}) {
  const len = x1 - x0;
  kit.boxMM("paintedMetal", [x0, ceilY - drop, z - w / 2], [x1, ceilY - 0.02, z + w / 2], { color: BLACK, texel: 2.5 });
  kit.boxMM("paintedMetal", [x0, ceilY - drop - 0.02, z - w / 2 - 0.05], [x1, ceilY - 0.02, z - w / 2], { color: MID, texel: 2.5 });
  kit.boxMM("paintedMetal", [x0, ceilY - drop - 0.02, z + w / 2], [x1, ceilY - 0.02, z + w / 2 + 0.05], { color: MID, texel: 2.5 });
  const nSeg = Math.max(1, Math.round(len / segment));
  for (let i = 0; i < nSeg; i++) {
    const s0 = x0 + (len * i) / nSeg + 0.12;
    const s1 = x0 + (len * (i + 1)) / nSeg - 0.12;
    kit.boxMM(mat, [s0, ceilY - drop - 0.015, z - 0.08], [s1, ceilY - drop + 0.005, z + 0.08], { uv: "keep" });
  }
}

// Floor zone rectangle drawn with painted lines (non-emissive) or an emissive material.
export function zoneRect(kit, x0, z0, x1, z1, y, mat = "paintedMetal", color = IMP.impWhite, w = 0.08) {
  const o = mat === "paintedMetal" ? { color } : {};
  kit.boxMM(mat, [x0, y, z0], [x1, y + 0.006, z0 + w], o);
  kit.boxMM(mat, [x0, y, z1 - w], [x1, y + 0.006, z1], o);
  kit.boxMM(mat, [x0, y, z0 + w], [x0 + w, y + 0.006, z1 - w], o);
  kit.boxMM(mat, [x1 - w, y, z0 + w], [x1, y + 0.006, z1 - w], o);
}
