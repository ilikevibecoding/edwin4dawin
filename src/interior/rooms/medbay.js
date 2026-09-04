// Deck 3 — Medical Bay (d3_medbay). White / light-grey clinical panels with blue-green accents:
// a four-bed ward with overhead scanner arms (one sweeping), two bacta tanks with a suspended
// patient and rising bubbles, a surgical station under a ring light with an articulated droid arm,
// diagnostic screen wall, medicine cabinets, wash station and privacy screens. Cold white light.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallScreen, impConsole, pipeRun, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { ensureCrewMaterials, SIGN, wallSign, floorSign, floorGrime, scuffRun, wallGrime, cableTray, cableDroop, ventGrille, gauge, intercom, stool, wallShelf, propFrame } from "./crewProps.js";

// clinical but not blown out: the white share is held under half so the bacta glow and the green
// lines still register against the walls
const WHITE_PAINTS = [
  [PALETTE.impWhite, 0.45],
  [PALETTE.impLight, 0.4],
  [PALETTE.impGrey, 0.15],
];
// issue blanket blue-grey and its darker hem: the one colour band on the white beds
const MED_BLANKET = new THREE.Color("#4f6a86");
const MED_HEM = new THREE.Color("#35485e");

/** Scanner boom built around a pivot (post top). k: kit-like target (sector kit or a mini kit). */
function scannerBoom(k, seed, lit) {
  const rand = rng(seed);
  // L boom: out along +x over the bed centre, then along +z over the body
  k.box("paintedMetal", 0.3, 0, 0, 0.6, 0.1, 0.1, { color: PALETTE.impGrey, texel: 2 });
  k.box("paintedMetal", 0.6, 0, 0.75, 0.1, 0.1, 1.5, { color: PALETTE.impGrey, texel: 2 });
  k.add("metal", new THREE.SphereGeometry(0.09, 12, 8), { pos: [0.6, 0, 0], color: PALETTE.steel });
  // scanner head hanging at the end: hood + ring emitter + lens
  k.box("paintedMetal", 0.6, -0.22, 1.35, 0.3, 0.34, 0.36, { color: PALETTE.impDark, texel: 2 });
  k.add(lit ? "emitBlue" : "rubber", new THREE.TorusGeometry(0.13, 0.014, 8, 20), { pos: [0.6, -0.4, 1.35], rot: [Math.PI / 2, 0, 0], color: PALETTE.rubber });
  k.cyl("darkGloss", 0.6, -0.395, 1.35, 0.08, 0.01, "y", { segments: 14 });
  k.box("leds", 0.6, -0.15, 1.53, 0.2, 0.03, 0.006, { uv: "keep" });
  k.box(rand() < 0.5 ? "emitGreen" : "emitBlue", 0.75, -0.15, 1.53, 0.02, 0.02, 0.006);
  // cable along the boom
  k.cyl("rubber", 0.66, 0.06, 0.75, 0.012, 1.5, "z", { color: PALETTE.rubber, segments: 6 });
}

function medBed(kit, ctx, { x, z, seed, arm = true, animate = false, occupied = false }) {
  const rand = rng(seed);
  const L = 2.1;
  const W = 0.86;
  const zc = z; // bed centre; head toward -z
  // pedestal, frame, mattress, pillow, blanket
  kit.box("paintedMetal", x, 0.24, zc, 0.55, 0.48, 1.5, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", x, 0.03, zc, 0.7, 0.06, 1.7, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitBlueDim", x, 0.1, zc + 0.755, 0.4, 0.02, 0.01);
  // mid-grey frame so the white mattress reads as the light thing on the bed
  kit.box("impPanel", x, 0.55, zc, W + 0.06, 0.1, L, { color: PALETTE.impMid, uv: "keep" });
  kit.box("fabric", x, 0.66, zc, W - 0.06, 0.12, L - 0.1, { color: PALETTE.impWhite, uv: "world", texel: 2 });
  kit.box("fabric", x, 0.75, zc - L / 2 + 0.3, 0.5, 0.08, 0.32, { color: PALETTE.impWhite, uv: "world", texel: 2 });
  // issue blanket: a blue-grey band over the foot two thirds with a darker turned-down hem, so the
  // beds are not one grey slab each
  const blanketZ = zc + 0.4;
  kit.box("fabric", x, 0.745, blanketZ, W - 0.08, 0.05, 1.2, { color: MED_BLANKET, uv: "world", texel: 2 });
  kit.box("fabric", x, 0.752, blanketZ - 0.5, W - 0.06, 0.055, 0.2, { color: MED_HEM, uv: "world", texel: 2 });
  if (occupied) {
    // patient under the sheet: a boxed head bump and a body ridge (no bare sphere)
    kit.box("fabric", x, 0.8, zc - L / 2 + 0.34, 0.28, 0.14, 0.26, { color: PALETTE.impLight, uv: "world", texel: 2 });
    kit.box("fabric", x, 0.8, zc - 0.25, 0.62, 0.16, 0.7, { color: PALETTE.impLight, uv: "world", texel: 2 });
    kit.box("fabric", x, 0.79, blanketZ + 0.1, 0.5, 0.12, 1.0, { color: MED_BLANKET, uv: "world", texel: 2 });
  }
  // side rails on posts
  for (const s of [-1, 1]) {
    kit.cyl("metal", x + s * (W / 2 + 0.04), 0.98, zc + 0.1, 0.016, 1.2, "z", { color: PALETTE.steel, segments: 8 });
    for (const dz of [-0.5, 0.5]) kit.cyl("metal", x + s * (W / 2 + 0.04), 0.79, zc + 0.1 + dz, 0.014, 0.38, "y", { color: PALETTE.steel, segments: 6 });
  }
  // head-end panel: a light headboard in a black frame rising well above the mattress, carrying the
  // vitals readout and status lamps
  const hz = zc - L / 2 - 0.05;
  kit.box("paintedMetal", x, 0.9, hz - 0.01, W + 0.14, 1.3, 0.05, { color: PALETTE.impBlack, texel: 2 });
  kit.box("impPanel1", x, 0.92, hz + 0.01, W + 0.04, 1.2, 0.04, { color: PALETTE.impLight, uv: "keep" });
  kit.box("paintedMetal", x, 1.2, hz + 0.03, 0.6, 0.36, 0.02, { color: PALETTE.impDark, texel: 2 });
  kit.box("darkGloss", x, 1.2, hz + 0.042, 0.5, 0.26, 0.01);
  const sg = new THREE.PlaneGeometry(0.44, 0.2);
  kit.add("impScreen1", sg, { pos: [x, 1.2, hz + 0.05], uv: "keep" });
  kit.box("leds", x, 0.95, hz + 0.035, 0.5, 0.03, 0.006, { uv: "keep" });
  for (let k = 0; k < 3; k++) kit.box(["emitGreen", "emitBlue", rand() < 0.3 ? "emitRed" : "emitGreen"][k], x - 0.3 + k * 0.08, 0.85, hz + 0.035, 0.03, 0.03, 0.006);
  kit.box("emitGreen", x, 1.46, hz + 0.035, W - 0.3, 0.012, 0.006);
  kit.collider([x - W / 2 - 0.08, 0, zc - L / 2 - 0.1], [x + W / 2 + 0.08, 1.5, zc + L / 2], "medbed");
  // bedside cabinet with a tray and a cup
  const cx = x + W / 2 + 0.45;
  kit.box("impPanel1", cx, 0.4, hz + 0.6, 0.45, 0.8, 0.5, { color: PALETTE.impLight, uv: "keep" });
  kit.box("paintedMetal", cx, 0.04, hz + 0.6, 0.47, 0.08, 0.52, { color: PALETTE.impBlack, texel: 2 });
  kit.box("metal", cx, 0.82, hz + 0.6, 0.47, 0.04, 0.52, { color: PALETTE.steel, texel: 1 });
  kit.box("paintedMetal", cx + 0.1, 0.5, hz + 0.855, 0.16, 0.02, 0.02, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", cx, 0.86, hz + 0.6, 0.3, 0.02, 0.24, { color: PALETTE.impMid, texel: 3 });
  kit.cyl("metal", cx - 0.1, 0.9, hz + 0.65, 0.035, 0.09, "y", { color: PALETTE.steel, segments: 8 });
  kit.collider([cx - 0.24, 0, hz + 0.34], [cx + 0.24, 0.86, hz + 0.86], "cabinet");
  // scanner arm: post at the head-side corner, boom pivoting at the top
  if (arm) {
    const px = x - 0.62;
    const pz = hz - 0.15;
    kit.cyl("paintedMetal", px, 1.1, pz, 0.05, 2.2, "y", { color: PALETTE.impMid, segments: 12, texel: 2 });
    kit.cyl("paintedMetal", px, 0.04, pz, 0.22, 0.08, "y", { color: PALETTE.impBlack, segments: 16, texel: 2 });
    kit.box("paintedMetal", px, 0.5, pz + 0.06, 0.12, 0.3, 0.12, { color: PALETTE.impDark, texel: 2 });
    kit.box("emitBlue", px + 0.0, 0.55, pz + 0.125, 0.06, 0.06, 0.006);
    kit.collider([px - 0.12, 0, pz - 0.12], [px + 0.12, 2.2, pz + 0.12], "post");
    const pivot = [px, 2.2, pz];
    if (animate) {
      const mk = new Kit(ctx.materials);
      scannerBoom(mk, seed + 7, true);
      const group = new THREE.Group();
      group.position.set(...pivot);
      mk.build(group, { castShadow: false, receiveShadow: true });
      ctx.mesh(group);
      const phase = rand() * 6;
      ctx.anim((dt, t) => {
        group.rotation.y = Math.sin(t * 0.45 + phase) * 0.28;
      });
    } else {
      const shim = {
        box: (m, cx2, cy, cz2, sx, sy, sz, o = {}) => kit.box(m, pivot[0] + cx2, pivot[1] + cy, pivot[2] + cz2, sx, sy, sz, o),
        add: (m, g, o = {}) => kit.add(m, g, { ...o, pos: [pivot[0] + o.pos[0], pivot[1] + o.pos[1], pivot[2] + o.pos[2]] }),
        cyl: (m, cx2, cy, cz2, r, len, axis, o = {}) => kit.cyl(m, pivot[0] + cx2, pivot[1] + cy, pivot[2] + cz2, r, len, axis, o),
      };
      scannerBoom(shim, seed + 7, rand() < 0.6);
    }
  }
}

function bactaTank(kit, ctx, { x, z, seed, patient }) {
  const rand = rng(seed);
  const rGlass = 0.9;
  const y0 = 0.55;
  const y1 = 2.95;
  // base drum with a blue kick strip, top hood with pipes
  kit.cyl("paintedMetal", x, y0 / 2, z, 1.12, y0, "y", { color: PALETTE.impDark, segments: 24, texel: 1.5 });
  kit.cyl("impPanel1", x, y0 / 2 + 0.05, z, 1.13, 0.3, "y", { color: PALETTE.impGrey, segments: 24, uv: "scale", uvScale: [4, 1] });
  kit.cyl("paintedMetal", x, 0.05, z, 1.2, 0.1, "y", { color: PALETTE.impBlack, segments: 24, texel: 2 });
  kit.add("emitBlue", new THREE.TorusGeometry(1.13, 0.015, 6, 40), { pos: [x, y0 - 0.06, z] , rot: [Math.PI / 2, 0, 0] });
  kit.cyl("paintedMetal", x, y1 + 0.25, z, 1.08, 0.5, "y", { color: PALETTE.impDark, segments: 24, texel: 1.5 });
  kit.cyl("paintedMetal", x, y1 + 0.02, z, 1.12, 0.08, "y", { color: PALETTE.impBlack, segments: 24, texel: 2 });
  kit.add("emitWhiteSoft", new THREE.TorusGeometry(0.98, 0.02, 6, 40), { pos: [x, y1 + 0.5, z], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  pipeRun(kit, [[x + 0.5, y1 + 0.5, z], [x + 0.5, 3.6 - 0.1, z]], 0.1, PALETTE.impMid);
  pipeRun(kit, [[x - 0.4, y1 + 0.5, z + 0.3], [x - 0.4, 3.35, z + 0.3], [x - 0.4, 3.35, z + 1.2], [x - 0.4, 3.6 - 0.1, z + 1.2]], 0.05, PALETTE.steel);
  // glass shell + liquid column
  kit.cyl("crew_glass", x, (y0 + y1) / 2, z, rGlass, y1 - y0, "y", { segments: 32, open: true });
  kit.cyl("crew_bacta", x, (y0 + y1 - 0.12) / 2 + 0.02, z, rGlass - 0.05, y1 - y0 - 0.14, "y", { segments: 32 });
  // vertical ribs holding the glass, a maintenance plate, the tank readout facing the room (-x)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("paintedMetal", x + Math.cos(a) * (rGlass + 0.02), (y0 + y1) / 2, z + Math.sin(a) * (rGlass + 0.02), 0.06, y1 - y0, 0.06, { color: PALETTE.impMid, texel: 2, rot: [0, -a, 0] });
  }
  kit.box("darkGloss", x - 1.13, 0.32, z, 0.02, 0.2, 0.6);
  const sg = new THREE.PlaneGeometry(0.5, 0.14);
  sg.rotateY(-Math.PI / 2);
  kit.add("impScreen1", sg, { pos: [x - 1.142, 0.32, z], uv: "keep" });
  kit.box("leds", x - 1.135, 0.16, z, 0.006, 0.03, 0.4, { uv: "keep" });
  kit.box(rand() < 0.5 ? "emitGreen" : "emitBlue", x - 1.135, 0.16, z + 0.3, 0.006, 0.03, 0.03);
  if (patient) {
    // suspended figure: dark silhouette with a breathing mask and feed tubes
    const fy = 1.75;
    kit.box("rubber", x, fy + 0.62, z - 0.05, 0.22, 0.26, 0.22, { color: PALETTE.rubber, rot: [0.1, 0, 0] });
    kit.box("rubber", x, fy + 0.2, z, 0.42, 0.62, 0.22, { color: PALETTE.rubber, rot: [0.1, 0, 0] });
    kit.box("rubber", x, fy - 0.45, z + 0.05, 0.36, 0.5, 0.2, { color: PALETTE.rubber, rot: [-0.05, 0, 0] });
    for (const s of [-1, 1]) {
      kit.box("rubber", x + s * 0.3, fy + 0.15, z + 0.05, 0.1, 0.62, 0.1, { color: PALETTE.rubber, rot: [0, 0, s * 0.35] });
      kit.box("rubber", x + s * 0.11, fy - 0.98, z + 0.1, 0.13, 0.62, 0.13, { color: PALETTE.rubber, rot: [0.08, 0, s * 0.06] });
    }
    kit.box("emitWhite", x, fy + 0.58, z - 0.17, 0.12, 0.08, 0.06);
    kit.cyl("rubber", x, fy + 1.15, z - 0.2, 0.014, 1.0, "y", { color: PALETTE.rubber, segments: 6 });
    kit.cyl("rubber", x + 0.1, fy + 1.15, z - 0.14, 0.01, 1.0, "y", { color: PALETTE.rubber, segments: 6 });
  }
  // rising bubbles: one merged mesh per tank cycling upward
  const bk = new Kit(ctx.materials);
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const rr = rand() * (rGlass - 0.25);
    bk.add("emitWhiteSoft", new THREE.SphereGeometry(0.015 + rand() * 0.02, 6, 4), { pos: [Math.cos(a) * rr, rand() * 0.8, Math.sin(a) * rr], uv: "keep" });
  }
  const bubbles = new THREE.Group();
  bubbles.position.set(x, y0 + 0.1, z);
  bk.build(bubbles, { castShadow: false, receiveShadow: false });
  ctx.mesh(bubbles);
  const phase = rand();
  ctx.anim((dt, t) => {
    const k = (t * 0.22 + phase) % 1;
    bubbles.position.y = y0 + 0.1 + k * (y1 - y0 - 1.05);
  });
  kit.collider([x - 1.15, 0, z - 1.15], [x + 1.15, y1 + 0.5, z + 1.15], "tank");
}

export function buildMedbay(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x 2.9..26, y 0..3.6, z -64..-42
  const H = max[1];
  const rand = rng(ctx.seed + 13);

  roomShell(kit, ctx, {
    // three strips across the 22 m depth (spacing 7.5) instead of five: the strips light the room,
    // they should not be the room
    ceiling: { lights: false, spacing: 7.5, along: "x", stripMat: "emitWhiteDim", paints: [[PALETTE.impLight, 0.55], [PALETTE.impWhite, 0.3], [PALETTE.impGrey, 0.15]] },
    walls: { rows: [0, 0.5, 1.7, 2.7, H], paints: WHITE_PAINTS, styles: { panel: 0.72, vent: 0.08, greeble: 0.08, strip: 0.06, screen: 0.04, conduit: 0.02 }, theme: { accent2: "emitGreen", screenMats: ["impScreen1", "impScreen2"] } },
  });
  // identity line: a green band along the ward wall above the monitors
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    const u0 = 0.6;
    const u1 = max[0] - min[0] - 0.6;
    frame.box("paintedMetal", (u0 + u1) / 2, 2.7, 0.02, u1 - u0, 0.1, 0.04, { color: PALETTE.impBlack, texel: 2 });
    frame.box("emitGreen", (u0 + u1) / 2, 2.7, 0.042, u1 - u0 - 0.1, 0.035, 0.006, { uv: "keep" });
  }
  // light grey inlays: ward strip and the sterile zone, with a green edge line
  kit.boxMM("impPanel", [5.6, 0, -63.4], [21.6, 0.012, -58.6], { color: PALETTE.impGrey, uv: "world", texel: 0.5 });
  kit.boxMM("impPanel", [10.8, 0, -49.6], [18.4, 0.012, -43.6], { color: PALETTE.impGrey, uv: "world", texel: 0.5 });
  for (const [a, b] of [
    [[10.75, 0.012, -49.65], [18.45, 0.02, -49.6]],
    [[10.75, 0.012, -43.65], [18.45, 0.02, -43.6]],
    [[10.75, 0.012, -49.65], [10.8, 0.02, -43.6]],
    [[18.4, 0.012, -49.65], [18.45, 0.02, -43.6]],
  ]) kit.boxMM("emitGreen", a, b);

  // ------------------------------------------------------------------ lights (6): cold white (held at 7-8) + blue-green at the tanks
  const cold = 0xdcecff;
  ctx.light(pointLight(cold, 7.5, 14, [9.5, H - 0.6, -60.0]));
  ctx.light(pointLight(cold, 7.5, 14, [17.5, H - 0.6, -60.0]));
  ctx.light(pointLight(0xf4f8ff, 8, 12, [14.6, H - 0.9, -46.6]));
  ctx.light(pointLight(cold, 7, 12, [6.5, H - 0.6, -47.5]));
  ctx.light(pointLight(cold, 7, 12, [21.0, H - 0.6, -46.0]));
  ctx.light(pointLight(0x3fc4ff, 7, 9, [22.4, 1.9, -53.2]));

  // privacy screen: a 1.2 m frosted head-end pane on two posts (translucent, so the beds still read
  // through it from the door)
  const privacyScreen = (sx, zc) => {
    kit.box("crew_frost", sx, 1.45, zc, 0.02, 1.5, 1.2, { uv: "keep" });
    kit.box("paintedMetal", sx, 2.21, zc, 0.05, 0.04, 1.28, { color: PALETTE.impMid, texel: 2 });
    kit.box("paintedMetal", sx, 0.69, zc, 0.05, 0.04, 1.28, { color: PALETTE.impMid, texel: 2 });
    for (const dz of [-0.62, 0.62]) kit.cyl("metal", sx, 1.12, zc + dz, 0.02, 2.24, "y", { color: PALETTE.steel, segments: 8 });
    for (const dz of [-0.62, 0.62]) kit.cyl("metal", sx, 0.02, zc + dz, 0.12, 0.04, "y", { color: PALETTE.impBlack, segments: 12 });
    kit.collider([sx - 0.15, 0, zc - 0.7], [sx + 0.15, 2.2, zc + 0.7], "screen");
  };

  // ------------------------------------------------------------------ ward: four beds, monitors, privacy screens
  const bedXs = [7.6, 11.6, 15.6, 19.6];
  bedXs.forEach((x, i) => {
    medBed(kit, ctx, { x, z: -61.2, seed: ctx.seed * 5 + i * 17, arm: i !== 3, animate: i === 1, occupied: i === 2 });
    wallScreen(kit, ctx, { side: "zmin", u: x - min[0], v: 2.1, w: 0.9, h: 0.55, screen: 1 });
    if (i < 3) privacyScreen(x + 2.0, -61.55);
  });
  // second row of three beds facing the same way (heads at z ≈ -56.4), one occupied
  [7.6, 11.6, 15.6].forEach((x, i) => {
    medBed(kit, ctx, { x, z: -55.3, seed: ctx.seed * 7 + i * 19, arm: i !== 1, animate: false, occupied: i === 0 });
    if (i < 2) privacyScreen(x + 2.0, -55.65);
  });
  // reception / triage desk facing the door, with a chair and a datapad rack
  impConsole(kit, ctx, { x: 8.6, z: -50.2, yaw: Math.PI / 2, w: 2.0, d: 0.8, screens: [1, 2, 1], chair: true, seed: ctx.seed + 17, lampMat: "emitGreen" });
  kit.box("paintedMetal", 8.6, 1.0, -48.9, 0.6, 0.06, 0.4, { color: PALETTE.impMid, texel: 2 });
  kit.box("paintedMetal", 8.6, 0.5, -48.9, 0.1, 1.0, 0.1, { color: PALETTE.impDark, texel: 2 });
  for (let k = 0; k < 4; k++) kit.box("darkGloss", 8.4 + k * 0.13, 1.14, -48.9, 0.02, 0.22, 0.16);
  kit.box("emitBlue", 8.6, 1.032, -48.9, 0.5, 0.006, 0.3);
  kit.collider([8.25, 0, -49.15], [8.95, 1.3, -48.65], "rack");
  // body scanner booth: round plinth, twin posts, an emitter ring hovering at chest height
  {
    const bx = 8.0;
    const bz = -45.6;
    kit.cyl("paintedMetal", bx, 0.06, bz, 1.0, 0.12, "y", { color: PALETTE.impDark, segments: 28, texel: 1.5 });
    kit.cyl("impPanel1", bx, 0.125, bz, 0.9, 0.012, "y", { color: PALETTE.impLight, segments: 28, uv: "keep" });
    kit.add("emitBlue", new THREE.TorusGeometry(0.95, 0.015, 6, 40), { pos: [bx, 0.125, bz], rot: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) {
      kit.box("paintedMetal", bx + s * 0.95, 1.3, bz, 0.16, 2.4, 0.3, { color: PALETTE.impGrey, texel: 1.5 });
      kit.box("paintedMetal", bx + s * 0.95, 0.35, bz, 0.22, 0.6, 0.36, { color: PALETTE.impBlack, texel: 2 });
      kit.box("leds", bx + s * 0.93, 1.6, bz + 0.16, 0.06, 0.8, 0.006, { uv: "keep", rot: [0, 0, Math.PI / 2] });
    }
    kit.box("paintedMetal", bx, 2.55, bz, 2.06, 0.22, 0.34, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("emitWhiteSoft", bx, 2.435, bz, 1.7, 0.012, 0.2, { uv: "keep" });
    kit.add("paintedMetal", new THREE.TorusGeometry(0.62, 0.05, 8, 32), { pos: [bx, 1.35, bz], rot: [Math.PI / 2, 0, 0], color: PALETTE.impMid, texel: 2 });
    kit.add("emitGreen", new THREE.TorusGeometry(0.62, 0.02, 6, 32), { pos: [bx, 1.3, bz], rot: [Math.PI / 2, 0, 0] });
    kit.box("darkGloss", bx + 1.05, 1.4, bz + 0.22, 0.02, 0.3, 0.2);
    const bg = new THREE.PlaneGeometry(0.16, 0.24);
    bg.rotateY(Math.PI / 2);
    kit.add("impScreen2", bg, { pos: [bx + 1.062, 1.4, bz + 0.22], uv: "keep" });
    kit.collider([bx - 1.05, 0, bz - 0.2], [bx - 0.85, 2.7, bz + 0.2], "boothpost");
    kit.collider([bx + 0.85, 0, bz - 0.2], [bx + 1.05, 2.7, bz + 0.2], "boothpost");
    floorSign(kit, SIGN.MEDICAL, bx, bz + 1.5, 1.6, 0, false);
  }
  // IV stand by the occupied bed + a monitor trolley by the first
  {
    const x = 15.6 - 0.75;
    const z = -60.6;
    kit.cyl("metal", x, 0.9, z, 0.014, 1.8, "y", { color: PALETTE.steel, segments: 8 });
    kit.cyl("metal", x, 0.03, z, 0.22, 0.05, "y", { color: PALETTE.impBlack, segments: 12 });
    kit.box("metal", x, 1.8, z, 0.36, 0.02, 0.02, { color: PALETTE.steel });
    kit.box("crew_glass", x - 0.14, 1.6, z, 0.14, 0.34, 0.06);
    kit.box("crew_bacta", x - 0.14, 1.55, z, 0.12, 0.2, 0.05);
    kit.cyl("rubber", x - 0.14, 1.2, z, 0.006, 0.5, "y", { color: PALETTE.rubber, segments: 6 });
    kit.collider([x - 0.25, 0, z - 0.25], [x + 0.25, 1.85, z + 0.25], "iv");
    const tx = 7.6 + 0.95;
    const tz = -59.6;
    kit.box("impPanel1", tx, 0.5, tz, 0.5, 0.9, 0.45, { color: PALETTE.impLight, uv: "keep" });
    kit.box("paintedMetal", tx, 0.04, tz, 0.54, 0.08, 0.5, { color: PALETTE.impBlack, texel: 2 });
    kit.box("darkGloss", tx, 1.15, tz, 0.44, 0.34, 0.06);
    const sg = new THREE.PlaneGeometry(0.38, 0.26);
    sg.rotateY(Math.PI);
    kit.add("impScreen2", sg, { pos: [tx, 1.15, tz - 0.032], uv: "keep" });
    kit.box("leds", tx, 0.98, tz - 0.03, 0.3, 0.03, 0.006, { uv: "keep" });
    kit.collider([tx - 0.27, 0, tz - 0.25], [tx + 0.27, 1.32, tz + 0.25], "trolley");
  }
  // ward wall: cable tray above the monitors, oxygen roundels, a supply shelf
  cableTray(kit, ctx, "zmin", 1.0, 20.0, 3.1);
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    for (const x of [9.6, 17.6]) frame.add("decal", new THREE.PlaneGeometry(0.34, 0.34), x - min[0], 2.42, 0.004, { uv: "keep", uvRect: decalRect(4) });
    wallShelf(frame, 22.6 - min[0], 1.3, 1.6, 0.3);
    for (let k = 0; k < 6; k++) frame.cylV("crew_white", 22.0 - min[0] + k * 0.24, 1.42, 0.15, 0.05, 0.2, { color: k % 2 ? PALETTE.impWhite : PALETTE.impBlue, segments: 10 });
    frame.collider(21.8 - min[0], 23.4 - min[0], 1.1, 1.7, 0, 0.32, "shelf");
    ventGrille(frame, 4.4 - min[0], 0.4, 0.8, 0.35);
    ventGrille(frame, 24.4 - min[0], 0.4, 0.8, 0.35);
  }

  // ------------------------------------------------------------------ bacta tanks on the xmax side + consoles
  bactaTank(kit, ctx, { x: 23.6, z: -49.6, seed: ctx.seed + 61, patient: true });
  bactaTank(kit, ctx, { x: 23.6, z: -56.8, seed: ctx.seed + 62, patient: false });
  impConsole(kit, ctx, { x: 21.3, z: -53.2, yaw: -Math.PI / 2, w: 1.5, d: 0.7, screens: [1, 2], chair: false, seed: ctx.seed + 8, lampMat: "emitBlue" });
  wallSign(kit, ctx, { side: "xmax", u: -53.2 - min[2], v: 3.15, w: 1.2, cell: SIGN.BACTA, lit: true });
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = z - min.z
    gauge(frame, -53.9 - min[2], 2.4, 0.02, 0.11, "impScreen1");
    gauge(frame, -52.5 - min[2], 2.4, 0.02, 0.11, "impScreen2");
    frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), -53.2 - min[2], 1.9, 0.004, { uv: "keep", uvRect: decalRect(4) });
    // pipe manifold between the tanks feeding both hoods
    frame.cylU("metal", -53.2 - min[2], 3.3, 0.14, 0.06, 7.2, { color: PALETTE.impMid, segments: 10 });
    for (const dz of [-3.6, 0, 3.6]) frame.box("paintedMetal", -53.2 - min[2] + dz, 3.3, 0.1, 0.2, 0.22, 0.2, { color: PALETTE.impDark, texel: 2 });
    floorGrime(kit, 22.2, -49.6, 2.6, 2.6, 0.2);
    floorGrime(kit, 22.2, -56.8, 2.6, 2.6, -0.3);
  }

  // ------------------------------------------------------------------ surgical station (sterile zone)
  {
    const sx = 14.6;
    const sz = -46.6;
    // table: pedestal, articulated top, white sheet, instrument rail
    kit.box("paintedMetal", sx, 0.35, sz, 0.5, 0.7, 0.9, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("paintedMetal", sx, 0.04, sz, 0.8, 0.08, 1.4, { color: PALETTE.impBlack, texel: 2 });
    kit.box("metal", sx, 0.78, sz, 0.75, 0.08, 2.1, { color: PALETTE.steel, texel: 1 });
    kit.box("fabric", sx, 0.85, sz, 0.66, 0.06, 1.9, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    kit.box("emitBlue", sx, 0.5, sz + 0.455, 0.3, 0.02, 0.01);
    kit.collider([sx - 0.4, 0, sz - 1.05], [sx + 0.4, 0.9, sz + 1.05], "surgtable");
    // ring light overhead on a boom from the ceiling
    kit.cyl("paintedMetal", sx, (2.75 + H) / 2, sz, 0.08, H - 2.75, "y", { color: PALETTE.impMid, segments: 10 });
    kit.add("paintedMetal", new THREE.TorusGeometry(0.75, 0.09, 10, 36), { pos: [sx, 2.75, sz], rot: [Math.PI / 2, 0, 0], color: PALETTE.impDark, texel: 2 });
    kit.add("emitWhiteSoft", new THREE.TorusGeometry(0.75, 0.05, 8, 36), { pos: [sx, 2.7, sz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      kit.cyl("emitWhite", sx + Math.cos(a) * 0.75, 2.66, sz + Math.sin(a) * 0.75, 0.07, 0.02, "y", { segments: 12 });
    }
    // articulated droid arm hanging from a ceiling mount beside the ring
    const ax = sx + 1.1;
    const az = sz - 0.6;
    kit.box("paintedMetal", ax, H - 0.12, az, 0.6, 0.24, 0.6, { color: PALETTE.impDark, texel: 2 });
    kit.cyl("paintedMetal", ax, H - 0.55, az, 0.12, 0.62, "y", { color: PALETTE.impGrey, segments: 12, texel: 2 });
    kit.add("metal", new THREE.SphereGeometry(0.17, 14, 10), { pos: [ax, H - 0.9, az], color: PALETTE.steel });
    // upper segment angled toward the table, elbow, forearm, wrist, manipulator
    const seg1 = new THREE.Vector3(-0.55, -0.55, 0.35);
    const elbow = new THREE.Vector3(ax, H - 0.9, az).add(seg1);
    const addSeg = (a, b, r, col) => {
      const len = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      kit.add("paintedMetal", new THREE.CylinderGeometry(r, r * 0.8, len, 12), { pos: [mid.x, mid.y, mid.z], quat: q, color: col, texel: 2 });
    };
    addSeg(new THREE.Vector3(ax, H - 0.9, az), elbow, 0.09, PALETTE.impGrey);
    kit.add("metal", new THREE.SphereGeometry(0.12, 12, 8), { pos: [elbow.x, elbow.y, elbow.z], color: PALETTE.steel });
    const wrist = elbow.clone().add(new THREE.Vector3(-0.35, -0.75, 0.15));
    addSeg(elbow, wrist, 0.07, PALETTE.impGrey);
    kit.add("metal", new THREE.SphereGeometry(0.09, 12, 8), { pos: [wrist.x, wrist.y, wrist.z], color: PALETTE.steel });
    // manipulator head: hub with three tool fingers and a lit sensor
    kit.cyl("paintedMetal", wrist.x, wrist.y - 0.14, wrist.z, 0.1, 0.16, "y", { color: PALETTE.impDark, segments: 12, texel: 2 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      kit.cyl("metal", wrist.x + Math.cos(a) * 0.07, wrist.y - 0.32, wrist.z + Math.sin(a) * 0.07, 0.012, 0.22, "y", { color: PALETTE.steel, segments: 6 });
    }
    kit.box("emitRed", wrist.x, wrist.y - 0.2, wrist.z + 0.1, 0.03, 0.03, 0.01);
    // cables from the mount to the elbow, drooping
    cableDroop(kit, [ax + 0.2, H - 0.25, az + 0.2], [elbow.x + 0.1, elbow.y + 0.05, elbow.z], 0.35, 0.014);
    cableDroop(kit, [ax - 0.2, H - 0.25, az - 0.2], [elbow.x - 0.05, elbow.y + 0.08, elbow.z - 0.05], 0.25, 0.01);
    // instrument cart + stool + waste unit
    const cx = sx - 1.3;
    kit.box("paintedMetal", cx, 0.45, sz + 0.4, 0.6, 0.9, 0.45, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("metal", cx, 0.92, sz + 0.4, 0.64, 0.04, 0.49, { color: PALETTE.steel, texel: 1 });
    kit.box("paintedMetal", cx, 0.96, sz + 0.4, 0.42, 0.02, 0.3, { color: PALETTE.impMid, texel: 3 });
    for (let k = 0; k < 5; k++) kit.box("metal", cx - 0.15 + k * 0.07, 0.98, sz + 0.4, 0.02, 0.012, 0.22, { color: PALETTE.steel });
    for (const y of [0.3, 0.6]) kit.box("paintedMetal", cx - 0.31, y, sz + 0.4, 0.02, 0.02, 0.3, { color: PALETTE.impBlack, texel: 2 });
    kit.collider([cx - 0.32, 0, sz + 0.15], [cx + 0.32, 1.0, sz + 0.65], "cart");
    stool(kit, sx - 1.2, sz - 0.9, 0.6);
    kit.cyl("paintedMetal", sx + 1.2, 0.35, sz + 0.9, 0.22, 0.7, "y", { color: PALETTE.impMid, segments: 14, texel: 2 });
    kit.cyl("paintedMetal", sx + 1.2, 0.72, sz + 0.9, 0.24, 0.05, "y", { color: PALETTE.impRed, segments: 14, texel: 2 });
    kit.collider([sx + 0.96, 0, sz + 0.66], [sx + 1.44, 0.8, sz + 1.14], "waste");
    floorSign(kit, SIGN.STERILE, sx, sz - 2.6, 2.4, 0, false);
    floorSign(kit, SIGN.STERILE, sx, sz + 2.6, 2.4, Math.PI, false);
  }

  // ------------------------------------------------------------------ zmax wall: diagnostics screen wall, cabinets, wash station
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.x - x
    // 2x2 diagnostics grid with a shared bezel
    const gx = 13.6;
    frame.box("paintedMetal", max[0] - gx, 1.95, 0.03, 3.4, 1.9, 0.06, { color: PALETTE.impDark, texel: 2 });
    for (const [dx, dy, m] of [
      [-0.85, 0.48, "impScreen1"],
      [0.85, 0.48, "impScreen2"],
      [-0.85, -0.48, "impScreen2"],
      [0.85, -0.48, "impScreen1"],
    ]) {
      frame.box("darkGloss", max[0] - gx + dx, 1.95 + dy, 0.062, 1.6, 0.86, 0.006);
      frame.add(m, new THREE.PlaneGeometry(1.5, 0.78), max[0] - gx + dx, 1.95 + dy, 0.067, { uv: "keep" });
    }
    frame.box("leds", max[0] - gx, 0.93, 0.05, 2.4, 0.03, 0.01, { uv: "keep" });
    // medicine cabinets x 17..25: open-fronted glass cases over drawer units, lit shelves of vials
    for (let c = 0; c < 4; c++) {
      const cx = 17.6 + c * 1.9;
      const u = max[0] - cx;
      const cw = 1.7;
      const cd = 0.5;
      // carcass: back, two sides, top and the plinth; the case interior stays open
      frame.box("impPanel", u, 1.55, 0.03, cw, 1.6, 0.06, { color: PALETTE.impLight, uv: "keep" });
      for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (cw / 2 - 0.03), 1.2, cd / 2, 0.06, 2.4, cd, { color: PALETTE.impDark, texel: 1.5 });
      frame.box("paintedMetal", u, 2.37, cd / 2, cw + 0.04, 0.08, cd + 0.04, { color: PALETTE.impBlack, texel: 2 });
      frame.box("paintedMetal", u, 2.3, cd / 2, cw - 0.1, 0.08, cd - 0.04, { color: PALETTE.impDark, texel: 2 });
      frame.box("emitWhiteSoft", u, 2.255, cd / 2, cw - 0.3, 0.012, cd - 0.14, { uv: "keep" });
      // drawer unit below the case (solid white front with pulls)
      frame.box("paintedMetal", u, 0.4, cd / 2, cw - 0.06, 0.8, cd - 0.02, { color: PALETTE.impDark, texel: 1.5 });
      for (let dr = 0; dr < 2; dr++) {
        frame.box("impPanel", u, 0.22 + dr * 0.38, cd + 0.006, cw - 0.16, 0.34, 0.012, { color: PALETTE.impWhite, uv: "keep" });
        frame.box("paintedMetal", u, 0.22 + dr * 0.38, cd + 0.02, 0.4, 0.025, 0.02, { color: PALETTE.impBlack, texel: 2 });
      }
      frame.box("hazard", u, 0.025, cd / 2, cw - 0.06, 0.05, cd, { texel: 3 });
      frame.box("metal", u, 0.82, cd / 2, cw - 0.02, 0.04, cd + 0.02, { color: PALETTE.steel, texel: 1 });
      // three lit glass shelves of vials and packs
      for (let s = 0; s < 3; s++) {
        const y = 0.95 + s * 0.44;
        frame.box("impPanel", u, y, cd / 2, cw - 0.14, 0.025, cd - 0.1, { color: PALETTE.impLight, uv: "keep" });
        frame.box("emitBlue", u, y + 0.4, 0.08, cw - 0.4, 0.008, 0.02);
        const nb = 5 + Math.floor(rand() * 4);
        for (let b = 0; b < nb; b++) {
          const bu = u - 0.62 + (b / (nb - 1)) * 1.24;
          const bh = 0.12 + rand() * 0.14;
          const col = [PALETTE.impWhite, PALETTE.impBlue, PALETTE.impLight, PALETTE.impRed][Math.floor(rand() * 4)];
          if (rand() < 0.7) frame.cylV("crew_white", bu, y + bh / 2 + 0.013, 0.28, 0.03 + rand() * 0.02, bh, { color: col, segments: 8 });
          else frame.box("crew_white", bu, y + 0.06, 0.28, 0.16, 0.1, 0.12, { color: rand() < 0.5 ? PALETTE.impWhite : PALETTE.impBlue });
        }
      }
      // glass front with a thin frame, a handle and status lamps
      frame.add("crew_glass", new THREE.PlaneGeometry(cw - 0.14, 1.5), u, 1.55, cd + 0.005, { uv: "keep" });
      frame.box("paintedMetal", u, 2.31, cd + 0.005, cw - 0.1, 0.03, 0.03, { color: PALETTE.impMid, texel: 2 });
      frame.box("paintedMetal", u, 0.8, cd + 0.005, cw - 0.1, 0.03, 0.03, { color: PALETTE.impMid, texel: 2 });
      frame.box("metal", u + 0.55, 1.5, cd + 0.03, 0.02, 0.3, 0.02, { color: PALETTE.steel });
      frame.box(c % 2 ? "emitGreen" : "emitBlue", u - 0.6, 0.86, cd + 0.03, 0.04, 0.02, 0.006);
      frame.collider(u - cw / 2, u + cw / 2, 0, 2.4, 0, cd + 0.04, "medcabinet");
    }
    // Imperial medical emblem: lit cross over the cabinets
    const eu = max[0] - 20.45;
    frame.box("paintedMetal", eu, 2.95, 0.02, 0.9, 0.9, 0.04, { color: PALETTE.impBlack, texel: 2 });
    frame.box("emitWhite", eu, 2.95, 0.045, 0.16, 0.7, 0.01);
    frame.box("emitWhite", eu, 2.95, 0.045, 0.7, 0.16, 0.01);
    frame.box("emitRed", eu, 2.95, 0.05, 0.08, 0.5, 0.01);
    frame.box("emitRed", eu, 2.95, 0.05, 0.5, 0.08, 0.01);
    // wash station near the door: basin, tap, soap dispensers, mirror, sterile sign
    const wu = max[0] - 6.0;
    frame.box("paintedMetal", wu, 0.42, 0.28, 1.4, 0.84, 0.56, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("impPanel", wu, 0.45, 0.565, 1.3, 0.6, 0.02, { color: PALETTE.impWhite, uv: "keep" });
    frame.box("metal", wu, 0.87, 0.3, 1.46, 0.06, 0.62, { color: PALETTE.steel, texel: 1 });
    frame.box("darkGloss", wu, 0.905, 0.32, 1.1, 0.012, 0.42);
    frame.cylV("metal", wu, 1.05, 0.1, 0.016, 0.34, { color: PALETTE.steel, segments: 8 });
    frame.cylN("metal", wu, 1.22, 0.2, 0.016, 0.22, { color: PALETTE.steel, segments: 8 });
    for (const du of [-0.5, 0.5]) {
      frame.box("crew_white", wu + du, 1.25, 0.06, 0.1, 0.22, 0.1, { color: PALETTE.impWhite });
      frame.box("emitGreen", wu + du, 1.15, 0.115, 0.04, 0.02, 0.006);
    }
    frame.box("darkGloss", wu, 1.85, 0.015, 1.1, 0.7, 0.02);
    frame.box("paintedMetal", wu, 1.85, 0.0, 1.2, 0.8, 0.02, { color: PALETTE.impBlack, texel: 2 });
    frame.box("emitWhiteSoft", wu, 2.32, 0.05, 1.1, 0.03, 0.06, { uv: "keep" });
    frame.collider(wu - 0.75, wu + 0.75, 0, 1.0, 0, 0.62, "wash");
    wallSign(kit, ctx, { side: "zmax", u: wu, v: 2.75, w: 1.4, cell: SIGN.STERILE, lit: true });
    intercom(frame, max[0] - 4.1, 1.5);
    ventGrille(frame, max[0] - 9.2, 0.4, 0.8, 0.35);
    // dispenser bin for gloves / masks by the wash station
    frame.box("crew_white", max[0] - 7.6, 1.4, 0.1, 0.3, 0.4, 0.2, { color: PALETTE.impWhite });
    frame.box("paintedMetal", max[0] - 7.6, 1.25, 0.21, 0.24, 0.05, 0.01, { color: PALETTE.impBlack, texel: 2 });
  }

  // ------------------------------------------------------------------ door wall: sign, roster screens; gurney parked mid-ward
  wallSign(kit, ctx, { side: "xmin", u: max[2] - (-53), v: 3.3, w: 1.8, cell: SIGN.MEDICAL, lit: true });
  wallScreen(kit, ctx, { side: "xmin", u: max[2] - (-47.5), v: 1.9, w: 1.4, h: 0.8, screen: 2 });
  wallScreen(kit, ctx, { side: "xmin", u: max[2] - (-58.5), v: 1.9, w: 1.4, h: 0.8, screen: 1 });
  {
    // gurney left parked mid-ward between the second bed row and the sterile zone, a little askew
    // (a wheeled stretcher, not a low table: tall tubular side rails, big castors on forks, a push
    // handle at the head, a folded blanket and an IV pole)
    const g = propFrame(kit, 12.0, -52.0, 0.32);
    g.box("metal", 0, 0.8, 0, 0.7, 0.06, 1.9, { color: PALETTE.steel, texel: 1 });
    g.box("fabric", 0, 0.88, 0, 0.62, 0.1, 1.8, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    g.box("fabric", 0, 0.96, -0.65, 0.42, 0.07, 0.3, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    g.box("fabric", 0, 0.955, 0.3, 0.58, 0.035, 1.0, { color: PALETTE.impLight, uv: "world", texel: 2 });
    g.box("fabric", 0, 1.0, 0.72, 0.5, 0.08, 0.34, { color: MED_BLANKET, uv: "world", texel: 2 });
    // undercarriage: a narrow central column on an H-frame with four visible castor forks
    g.box("paintedMetal", 0, 0.45, 0, 0.3, 0.64, 1.2, { color: PALETTE.impDark, texel: 2 });
    g.box("paintedMetal", 0, 0.12, 0, 0.16, 0.08, 1.7, { color: PALETTE.impBlack, texel: 2 });
    for (const dz of [-0.78, 0.78]) {
      g.box("paintedMetal", 0, 0.12, dz, 0.74, 0.06, 0.06, { color: PALETTE.impBlack, texel: 2 });
      for (const s of [-1, 1]) {
        g.box("paintedMetal", s * 0.33, 0.12, dz, 0.04, 0.14, 0.05, { color: PALETTE.impMid, texel: 2 });
        g.cyl("rubber", s * 0.36, 0.11, dz, 0.11, 0.05, "x", { color: PALETTE.rubber, segments: 14 });
        g.cyl("metal", s * 0.36, 0.11, dz, 0.04, 0.06, "x", { color: PALETTE.steel, segments: 10 });
      }
    }
    // side rails: a tubular loop each side on two stanchions
    for (const s of [-1, 1]) {
      g.cyl("metal", s * 0.37, 1.22, 0, 0.016, 1.4, "z", { color: PALETTE.steel, segments: 8 });
      for (const dz of [-0.65, 0.65]) g.cyl("metal", s * 0.37, 1.02, dz, 0.014, 0.42, "y", { color: PALETTE.steel, segments: 6 });
      g.cyl("metal", s * 0.37, 1.02, 0, 0.012, 1.3, "z", { color: PALETTE.steel, segments: 6 });
    }
    // push handle at the head end, IV pole with a bag at the foot corner
    g.cyl("metal", 0, 1.15, -1.0, 0.016, 0.6, "x", { color: PALETTE.steel, segments: 8 });
    for (const s of [-1, 1]) g.cyl("metal", s * 0.3, 0.98, -1.0, 0.014, 0.36, "y", { color: PALETTE.steel, segments: 6 });
    g.cyl("metal", 0.3, 1.4, 0.9, 0.012, 1.2, "y", { color: PALETTE.steel, segments: 6 });
    g.box("metal", 0.3, 2.0, 0.9, 0.3, 0.02, 0.02, { color: PALETTE.steel });
    g.box("crew_glass", 0.42, 1.85, 0.9, 0.12, 0.26, 0.05);
    g.box("crew_bacta", 0.42, 1.82, 0.9, 0.1, 0.16, 0.04);
    g.box("emitBlueDim", 0, 0.5, 0.75, 0.3, 0.02, 0.01);
    g.collider(-0.45, -1.05, 0.45, 1.0, 1.25, "gurney");
    // stacked supply crates opposite
    kit.box("impPanel1", 4.3, 0.35, -46.4, 0.9, 0.7, 0.9, { color: PALETTE.impWhite, uv: "keep" });
    kit.box("paintedMetal", 4.3, 0.06, -46.4, 0.94, 0.12, 0.94, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitRed", 4.3, 0.5, -45.945, 0.1, 0.1, 0.01);
    kit.box("emitRed", 4.3, 0.5, -45.945, 0.3, 0.04, 0.01);
    kit.box("emitRed", 4.3, 0.5, -45.945, 0.04, 0.3, 0.01);
    kit.box("impPanel1", 4.3, 0.95, -46.5, 0.7, 0.5, 0.7, { color: PALETTE.impLight, uv: "keep" });
    kit.collider([3.8, 0, -46.9], [4.8, 1.2, -45.9], "medcrates");
  }

  // ------------------------------------------------------------------ wear + ambience
  scuffRun(kit, 3.6, -53, 12.0, -53, 4, ctx.seed + 71, 0.8);
  floorGrime(kit, 3.7, -63.3, 1.2, 1.0, 0.2);
  floorGrime(kit, 25.3, -42.7, 1.0, 1.2, -0.3);
  wallGrime(kit, ctx, "xmin", 2.2, 0.5, 1.6, 0.6);
  {
    // one replaced (darker) wall panel on the ward wall and a maintenance stencil beside it
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("impPanel1", 21.2 - min[0], 2.2, -0.02, 1.16, 0.96, 0.03, { color: PALETTE.impGrey, uv: "keep" });
    frame.add("decal", new THREE.PlaneGeometry(0.3, 0.3), 22.0 - min[0], 2.42, 0.004, { uv: "keep", uvRect: decalRect(6) });
  }
  if (ctx.audioZone) ctx.audioZone({ kind: "medical", pos: [14, 1.5, -53], radius: 10 });
}
