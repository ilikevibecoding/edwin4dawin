// Deck 3 — Recreation Lounge (d3_rec). Warm amber low lighting under a slatted ceiling: three
// "windows to space" (they are screens — this room is deep inside the hull), sofa clusters on rugs,
// a round holo-game table with hovering pieces, a bar with a back-bar of bottles, a games / datapad
// shelf, viewscreens, a drinks dispenser. Everything deck-local, floor y = 0.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallScreen, wallSegment, impChair, hologram } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect, makeCanvas, toTexture } from "../../textures.js";
import { signPlate } from "../corridor.js";
import { ensureCrewMaterials, SIGN, wallSign, floorGrime, scuffRun, wallGrime, cableTray, ventGrille, intercom, stool, propFrame } from "./crewProps.js";

const LOUNGE_PAINTS = [
  [PALETTE.impGrey, 0.42],
  [PALETTE.impLight, 0.3],
  [PALETTE.impMid, 0.2],
  [PALETTE.impDark, 0.08],
];
// upholstery held well above the black deck so the furniture reads from the door (albedo lifted ~30 %
// after the lounge measured darkest on the deck): slate blue, oxblood, olive, tan
const FABRICS = [new THREE.Color("#707f9e"), new THREE.Color("#8b4a4a"), new THREE.Color("#798a60"), new THREE.Color("#b39f75")];
// rugs: a warm grey field with a lighter woven border, so they read as rugs rather than stains
const RUG = new THREE.Color("#5a4e55");
const RUG_EDGE = new THREE.Color("#867a76");

/** Sofa of `len` metres, seat facing +Z when yaw = 0 (back at -Z). */
function sofa(kit, { x, z, yaw = 0, len = 2.2, color = FABRICS[0], seed = 1 }) {
  const L = propFrame(kit, x, z, yaw);
  const rand = rng(seed);
  const d = 0.9;
  const seatH = 0.42;
  // plinth, mid-grey frame, seat cushions (split per seat), back cushion leaning, armrests, a lit kick strip
  L.box("paintedMetal", 0, 0.06, 0, len - 0.1, 0.12, d - 0.15, { color: PALETTE.impBlack, texel: 2 });
  L.box("paintedMetal", 0, 0.2, -0.02, len, 0.16, d - 0.05, { color: PALETTE.impMid, texel: 1.5 });
  const seats = Math.max(1, Math.round(len / 0.75));
  const sw = (len - 0.2) / seats;
  for (let i = 0; i < seats; i++) {
    const sx = -len / 2 + 0.1 + (i + 0.5) * sw;
    L.box("fabric", sx, seatH - 0.07, 0.04, sw - 0.03, 0.15, d - 0.3, { color, uv: "world", texel: 2 });
    const bq = L.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.16));
    L.box("fabric", sx, seatH + 0.3, -d / 2 + 0.2, sw - 0.03, 0.6, 0.16, { color, uv: "world", texel: 2, quat: bq });
  }
  // back shell + top rail
  L.box("paintedMetal", 0, seatH + 0.28, -d / 2 + 0.05, len, 0.72, 0.1, { color: PALETTE.impMid, texel: 1.5 });
  L.box("paintedMetal", 0, seatH + 0.66, -d / 2 + 0.06, len + 0.02, 0.05, 0.14, { color: PALETTE.impGrey, texel: 2 });
  for (const s of [-1, 1]) {
    L.box("paintedMetal", s * (len / 2 + 0.05), 0.38, 0.0, 0.1, 0.62, d - 0.1, { color: PALETTE.impMid, texel: 1.5 });
    L.box("fabric", s * (len / 2 + 0.05), 0.7, 0.02, 0.12, 0.06, d - 0.2, { color, uv: "world", texel: 2 });
  }
  L.box("emitAmber", 0, 0.125, d / 2 - 0.1, len - 0.4, 0.015, 0.01);
  // a left-behind datapad or cup on one seat
  if (rand() < 0.7) {
    const sx = -len / 2 + 0.4 + rand() * (len - 0.8);
    if (rand() < 0.5) L.box("darkGloss", sx, seatH + 0.02, 0.1, 0.16, 0.012, 0.22, { quat: L.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.6)) });
    else L.add("metal", new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), sx, seatH + 0.06, 0.15, { color: PALETTE.steel });
  }
  L.collider(-len / 2 - 0.1, -d / 2, len / 2 + 0.1, d / 2, seatH + 0.7, "sofa");
}

/** Low table: dark gloss top on a black pedestal with a few drinks. */
function lowTable(kit, { x, z, yaw = 0, w = 1.2, d = 0.7, seed = 2 }) {
  const L = propFrame(kit, x, z, yaw);
  const rand = rng(seed);
  L.box("paintedMetal", 0, 0.03, 0, w * 0.6, 0.06, d * 0.6, { color: PALETTE.impBlack, texel: 2 });
  L.box("paintedMetal", 0, 0.22, 0, 0.18, 0.4, 0.18, { color: PALETTE.impDark, texel: 2 });
  L.box("paintedMetal", 0, 0.435, 0, w, 0.03, d, { color: PALETTE.impMid, texel: 2 });
  L.box("darkGloss", 0, 0.458, 0, w - 0.06, 0.016, d - 0.06);
  L.box("emitAmber", 0, 0.44, 0, w - 0.02, 0.008, d - 0.02);
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const px = (rand() - 0.5) * (w - 0.4);
    const pz = (rand() - 0.5) * (d - 0.3);
    if (rand() < 0.6) L.add("metal", new THREE.CylinderGeometry(0.035, 0.03, 0.11, 10), px, 0.52, pz, { color: rand() < 0.5 ? PALETTE.steel : PALETTE.impDark });
    else L.add("crew_glass", new THREE.CylinderGeometry(0.03, 0.03, 0.09, 10), px, 0.51, pz);
  }
  L.collider(-w / 2, -d / 2, w / 2, d / 2, 0.47, "table");
}

/** Fabric rug under a seating cluster: lighter woven border, field, and a thin inner line. */
function rug(kit, x, z, w, d, color, yaw = 0) {
  kit.add("fabric", new THREE.BoxGeometry(w, 0.014, d), { pos: [x, 0.007, z], rot: [0, yaw, 0], color: RUG_EDGE, uv: "world", texel: 1.5 });
  kit.add("fabric", new THREE.BoxGeometry(w - 0.5, 0.006, d - 0.5), { pos: [x, 0.017, z], rot: [0, yaw, 0], color, uv: "world", texel: 1.5 });
  kit.add("fabric", new THREE.BoxGeometry(w - 0.8, 0.004, d - 0.8), { pos: [x, 0.022, z], rot: [0, yaw, 0], color: RUG_EDGE, uv: "world", texel: 1.5 });
  kit.add("fabric", new THREE.BoxGeometry(w - 0.9, 0.004, d - 0.9), { pos: [x, 0.0245, z], rot: [0, yaw, 0], color, uv: "world", texel: 1.5 });
}

/** Standing lamp: dark pole with an amber-lit drum shade (no real light; the room lights carry it). */
function floorLamp(kit, x, z, h = 1.75) {
  kit.cyl("metal", x, 0.02, z, 0.16, 0.04, "y", { color: PALETTE.impBlack, segments: 14 });
  kit.cyl("metal", x, h / 2, z, 0.022, h, "y", { color: PALETTE.impMid, segments: 8 });
  kit.cyl("paintedMetal", x, h + 0.02, z, 0.19, 0.28, "y", { color: PALETTE.impDark, segments: 18, texel: 2, open: true });
  kit.cyl("emitAmber", x, h + 0.02, z, 0.16, 0.26, "y", { segments: 18 });
  kit.collider([x - 0.17, 0, z - 0.17], [x + 0.17, h + 0.2, z + 0.17], "lamp");
}

/** Window to space (a screen) recessed in a wall opening: bevelled frame, star screen, sill light. */
function starWindow(frame, u, v, w, h, flip = false) {
  // black back plate, then the screen a little proud of it (the wall panels and the trim plate sit at
  // n <= 0.02); alternate windows mirror the starfield so the three views do not repeat
  frame.box("paintedMetal", u, v, 0.025, w + 0.1, h + 0.1, 0.01, { color: PALETTE.impBlack, texel: 2 });
  frame.add("crew_starScreen", new THREE.PlaneGeometry(w, h), u, v, 0.032, { uv: "keep", uvRect: flip ? [1, 0, 0, 1] : null });
  // bevelled frame: four angled slabs from the wall face into the recess
  const t = 0.12;
  for (const [du, dv, su, sv, tilt, spin] of [
    [0, h / 2 + t / 2, w + 2 * t, t, 0, 0],
    [0, -h / 2 - t / 2, w + 2 * t, t, 0, 0],
    [-w / 2 - t / 2, 0, t, h, 0, 0],
    [w / 2 + t / 2, 0, t, h, 0, 0],
  ]) {
    frame.box("paintedMetal", u + du, v + dv, 0.0, su, sv, 0.14, { color: PALETTE.impDark, texel: 2, tilt, spin });
  }
  // outer trim and corner bolts, sill ledge with an amber strip, a small "viewport" label plate
  frame.box("paintedMetal", u, v, 0.01, w + 2 * t + 0.1, h + 2 * t + 0.1, 0.02, { color: PALETTE.impMid, texel: 2 });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.cylN("metal", u + a * (w / 2 + t + 0.02), v + b * (h / 2 + t + 0.02), 0.02, 0.016, 0.02, { color: PALETTE.steel, segments: 8 });
  frame.box("paintedMetal", u, v - h / 2 - t - 0.07, 0.12, w + 0.4, 0.06, 0.24, { color: PALETTE.impDark, texel: 2 });
  frame.box("emitAmber", u, v - h / 2 - t - 0.03, 0.05, w + 0.2, 0.012, 0.01);
  frame.box("darkGloss", u + w / 2 - 0.3, v - h / 2 - t - 0.16, 0.012, 0.36, 0.08, 0.01);
  frame.box("emitBlue", u + w / 2 - 0.42, v - h / 2 - t - 0.16, 0.02, 0.03, 0.03, 0.006);
}

/** Round holo-game table with hovering pieces (pieces are separate animated meshes). */
function holoTable(kit, ctx, x, z, seed) {
  const rand = rng(seed);
  kit.cyl("paintedMetal", x, 0.04, z, 0.62, 0.08, "y", { color: PALETTE.impBlack, segments: 24, texel: 2 });
  kit.cyl("paintedMetal", x, 0.4, z, 0.34, 0.66, "y", { color: PALETTE.impDark, segments: 16, texel: 2 });
  kit.cyl("paintedMetal", x, 0.76, z, 0.75, 0.1, "y", { color: PALETTE.impMid, segments: 28, texel: 2 });
  kit.cyl("darkGloss", x, 0.815, z, 0.68, 0.02, "y", { segments: 28 });
  kit.add("emitBlue", new THREE.TorusGeometry(0.71, 0.012, 6, 40), { pos: [x, 0.82, z], rot: [Math.PI / 2, 0, 0] });
  // playing surface: holo grid disc + concentric rings
  kit.add("holo", new THREE.CircleGeometry(0.6, 32), { pos: [x, 0.83, z], rot: [-Math.PI / 2, 0, 0], uv: "keep" });
  // control pads around the rim
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = x + Math.cos(a) * 0.66;
    const pz = z + Math.sin(a) * 0.66;
    kit.box("darkGloss", px, 0.822, pz, 0.14, 0.01, 0.1, { rot: [0, -a, 0] });
    kit.box(i % 2 ? "emitBlue" : "emitAmber", px, 0.83, pz, 0.08, 0.006, 0.02, { rot: [0, -a, 0] });
  }
  kit.collider([x - 0.76, 0, z - 0.76], [x + 0.76, 0.84, z + 0.76], "holotable");
  // hovering pieces: a merged ring of pieces bobbing together + two singles out of phase
  const mats = ctx.materials;
  const group = new THREE.Group();
  group.position.set(x, 0.85, z);
  const pk = new Kit(mats);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 0.24 + (i % 2) * 0.2;
    const kind = i % 3;
    const g = kind === 0 ? new THREE.OctahedronGeometry(0.11) : kind === 1 ? new THREE.ConeGeometry(0.09, 0.26, 6) : new THREE.BoxGeometry(0.12, 0.2, 0.12);
    pk.add("holo", g, { pos: [Math.cos(a) * r, 0.2 + (i % 2) * 0.05, Math.sin(a) * r], uv: "keep" });
    // bright core so the pieces read from across the room
    pk.add("emitBlue", new THREE.OctahedronGeometry(0.03), { pos: [Math.cos(a) * r, 0.2 + (i % 2) * 0.05, Math.sin(a) * r], uv: "keep" });
  }
  pk.build(group, { castShadow: false, receiveShadow: false });
  const singles = [];
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(i ? new THREE.TetrahedronGeometry(0.14) : new THREE.CylinderGeometry(0.05, 0.1, 0.28, 6), mats.holo);
    m.position.set(i ? -0.1 : 0.12, 0.3, i ? 0.08 : -0.06);
    group.add(m);
    singles.push(m);
  }
  ctx.mesh(group);
  const phase = rand() * 6;
  ctx.anim((dt, t) => {
    group.rotation.y = t * 0.12;
    group.position.y = 0.85 + Math.sin(t * 1.1 + phase) * 0.02;
    singles[0].position.y = 0.32 + Math.sin(t * 1.7 + phase) * 0.06;
    singles[0].rotation.y = t * 0.9;
    singles[1].position.y = 0.3 + Math.cos(t * 1.3 + phase) * 0.06;
    singles[1].rotation.x = t * 0.7;
  });
}

/** Back-bar shelving with bottles + the counter in front, along the xmin wall (u = max.z - z). */
function bar(kit, ctx, frame, u0, u1, seed) {
  const rand = rng(seed);
  const cu = (u0 + u1) / 2;
  const len = u1 - u0;
  // back-bar: dark unit with three lit glass shelves of bottles, mirror-dark back
  frame.box("paintedMetal", cu, 1.25, 0.2, len, 2.5, 0.4, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("darkGloss", cu, 1.6, 0.41, len - 0.2, 1.6, 0.01);
  for (let s = 0; s < 3; s++) {
    const v = 1.0 + s * 0.5;
    frame.box("paintedMetal", cu, v, 0.5, len - 0.2, 0.03, 0.3, { color: PALETTE.impMid, texel: 2 });
    frame.box("emitAmber", cu, v + 0.02, 0.36, len - 0.3, 0.008, 0.02);
    const nb = Math.floor((len - 0.4) / 0.19);
    for (let b = 0; b < nb; b++) {
      if (rand() < 0.15) continue;
      const bu = cu - len / 2 + 0.3 + b * 0.19 + (rand() - 0.5) * 0.04;
      const bh = 0.2 + rand() * 0.16;
      const br = 0.03 + rand() * 0.02;
      const col = [PALETTE.impDark, new THREE.Color("#3a1e12"), new THREE.Color("#12303a"), PALETTE.steel, new THREE.Color("#2e3a1a")][Math.floor(rand() * 5)];
      const mat = rand() < 0.35 ? "crew_glass" : "darkGloss";
      frame.cylV(mat, bu, v + 0.015 + bh / 2, 0.52, br, bh, { color: col, segments: 8 });
      frame.cylV("metal", bu, v + 0.015 + bh + 0.05, 0.52, br * 0.45, 0.1, { color: rand() < 0.5 ? PALETTE.steel : PALETTE.impBlack, segments: 8 });
    }
  }
  frame.box("emitAmber", cu, 2.45, 0.42, len - 0.3, 0.02, 0.2, { uv: "keep" });
  frame.box("paintedMetal", cu, 2.53, 0.3, len + 0.04, 0.1, 0.6, { color: PALETTE.impBlack, texel: 2 });
  frame.collider(u0, u1, 0, 2.6, 0, 0.62, "backbar");
  // counter 1.1 m out: body, top, lit kick, taps and a glass rack
  const cn = 1.6;
  frame.box("paintedMetal", cu, 0.5, cn, len, 1.0, 0.6, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("impPanel1", cu, 0.55, cn + 0.31, len - 0.1, 0.8, 0.02, { color: PALETTE.impGrey, uv: "keep" });
  frame.box("paintedMetal", cu, 1.03, cn, len + 0.1, 0.06, 0.74, { color: PALETTE.impBlack, texel: 2 });
  frame.box("darkGloss", cu, 1.065, cn, len + 0.04, 0.012, 0.68);
  frame.box("emitAmber", cu, 0.08, cn + 0.31, len - 0.3, 0.015, 0.01);
  frame.box("emitAmber", cu, 1.0, cn + 0.375, len - 0.2, 0.012, 0.01);
  // tap cluster: chrome column with three spouts and a drip tray
  frame.box("metal", cu, 1.25, cn - 0.15, 0.5, 0.38, 0.12, { color: PALETTE.steel, texel: 1 });
  for (let i = 0; i < 3; i++) {
    frame.cylN("metal", cu - 0.16 + i * 0.16, 1.32, cn - 0.02, 0.016, 0.16, { color: PALETTE.steel, segments: 8 });
    frame.box("rubber", cu - 0.16 + i * 0.16, 1.44, cn - 0.1, 0.03, 0.08, 0.03, { color: PALETTE.rubber });
    frame.box(i === 1 ? "emitRed" : "emitBlue", cu - 0.16 + i * 0.16, 1.2, cn - 0.085, 0.02, 0.02, 0.006);
  }
  frame.box("metal", cu, 1.08, cn - 0.05, 0.6, 0.02, 0.3, { color: PALETTE.gunmetal, texel: 2 });
  // glasses / cups along the counter
  for (let i = 0; i < 6; i++) {
    const gu = u0 + 0.5 + rand() * (len - 1.0);
    frame.cylV(rand() < 0.5 ? "crew_glass" : "metal", gu, 1.13, cn - 0.15 + (rand() - 0.5) * 0.3, 0.035, 0.1, { color: PALETTE.steel, segments: 8 });
  }
  frame.collider(u0 - 0.05, u1 + 0.05, 0, 1.08, cn - 0.37, cn + 0.37, "bar");
  // bar stools in front (frame n ≈ cn + 0.9)
  const n = Math.floor(len / 1.1);
  for (let i = 0; i < n; i++) {
    const su = u0 + 0.55 + i * ((len - 1.1) / Math.max(1, n - 1));
    const p = frame.pos(su, 0, cn + 0.95);
    stool(kit, p.x, p.z, 0.72);
  }
}

/**
 * Holo-board emissive map: a 128 x 42 canvas (the board plane is 2.5 x 0.82 m) with an 8 x 8 board in
 * the middle, amber and cyan piece markers on it, and a captured-pieces / turn panel either side, so
 * the games unit reads as a board game in play rather than a status console.
 */
function holoBoardMaterial(ctx) {
  const m = ctx.materials;
  if (m.rec_holoBoard) return "rec_holoBoard";
  const W = 128;
  const Hc = 42;
  const c = makeCanvas(W, Hc);
  const g = c.getContext("2d");
  g.fillStyle = "#05070a";
  g.fillRect(0, 0, W, Hc);
  const AMBER = "#ffb347";
  const CYAN = "#4ad0ff";
  // board: 8 x 8 cells of 4 px, faint checker shading and teal grid lines
  const bx = 48;
  const by = 5;
  const cell = 4;
  for (let r = 0; r < 8; r++) {
    for (let q = 0; q < 8; q++) {
      g.fillStyle = (r + q) % 2 ? "#0c1620" : "#101d2a";
      g.fillRect(bx + q * cell, by + r * cell, cell, cell);
    }
  }
  g.fillStyle = "#2a6a7e";
  for (let k = 0; k <= 8; k++) {
    g.fillRect(bx + k * cell, by, 1, 8 * cell + 1);
    g.fillRect(bx, by + k * cell, 8 * cell + 1, 1);
  }
  const piece = (col, q, r) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(bx + q * cell + cell / 2 + 0.5, by + r * cell + cell / 2 + 0.5, 1.6, 0, Math.PI * 2);
    g.fill();
  };
  for (const [q, r] of [[0, 0], [2, 1], [3, 0], [5, 2], [6, 1], [1, 3], [4, 3]]) piece(AMBER, q, r);
  for (const [q, r] of [[1, 7], [3, 6], [4, 7], [6, 6], [7, 7], [2, 4], [5, 5]]) piece(CYAN, q, r);
  // side panels: player label bar, captured-piece markers, a move counter of ticks
  const panel = (x0, col, captured, turn) => {
    g.fillStyle = col;
    g.fillRect(x0, 6, 30, 2);
    for (let k = 0; k < captured; k++) {
      g.beginPath();
      g.arc(x0 + 3 + k * 5, 15, 1.6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#1e3a48";
    for (let k = 0; k < 6; k++) g.fillRect(x0 + k * 5, 24, 3, 6);
    g.fillStyle = col;
    for (let k = 0; k < turn; k++) g.fillRect(x0 + k * 5, 24, 3, 6);
    g.fillStyle = turn ? col : "#1e3a48";
    g.fillRect(x0, 34, 30, 3);
  };
  panel(8, AMBER, 3, 4);
  panel(90, CYAN, 2, 0);
  m.rec_holoBoard = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: toTexture(c, { srgb: true, wrap: false }), emissiveIntensity: 1.0, roughness: 0.15, metalness: 0 });
  return "rec_holoBoard";
}

/**
 * Games unit on a wall frame: a mid-grey cabinet with two lit shelves of datapads and boxed games, a
 * control ledge and a dim holo-board screen in the upper half (the earlier full-height dark shelf unit
 * read as an unlit black rectangle under the GAMES board from the door).
 */
function gameShelf(frame, u, seed, boardMat = "crew_holoDim") {
  const rand = rng(seed);
  const w = 3.0;
  // open-fronted case: mid-grey back, black sides, plinth and top
  frame.box("impPanel1", u, 1.2, 0.03, w, 2.4, 0.06, { color: PALETTE.impMid, uv: "world", texel: 0.5 });
  for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (w / 2 - 0.04), 1.2, 0.2, 0.08, 2.4, 0.4, { color: PALETTE.impBlack, texel: 2 });
  frame.box("paintedMetal", u, 0.06, 0.2, w + 0.04, 0.12, 0.4, { color: PALETTE.impBlack, texel: 2 });
  frame.box("paintedMetal", u, 2.42, 0.2, w + 0.04, 0.08, 0.4, { color: PALETTE.impBlack, texel: 2 });
  // holo-board in the closed upper half: dark housing, gloss bezel, dim amber tabular screen, lit header
  frame.box("impPanel1", u, 1.85, 0.19, w - 0.16, 1.0, 0.34, { color: PALETTE.impDark, uv: "keep" });
  frame.box("darkGloss", u, 1.85, 0.375, w - 0.3, 1.0, 0.03);
  frame.add(boardMat, new THREE.PlaneGeometry(w - 0.5, 0.82), u, 1.85, 0.392, { uv: "keep" });
  frame.box("emitAmberDim", u, 2.375, 0.37, w - 0.5, 0.025, 0.01);
  // control ledge between the board and the shelves: gloss deck, a row of amber keys, two dice cups
  frame.box("paintedMetal", u, 1.3, 0.3, w - 0.16, 0.08, 0.6, { color: PALETTE.impDark, texel: 2 });
  frame.box("darkGloss", u, 1.345, 0.36, w - 0.4, 0.012, 0.44);
  for (let k = 0; k < 10; k++) frame.box(k % 3 === 1 ? "emitRedDim" : "emitAmberDim", u - 0.9 + k * 0.2, 1.353, 0.42, 0.1, 0.006, 0.06);
  for (const du of [-1.2, 1.2]) frame.cylV("metal", u + du, 1.4, 0.36, 0.06, 0.1, { color: PALETTE.steel, segments: 10 });
  // two lit shelves below the ledge with the games stock
  for (let s = 0; s < 2; s++) {
    const v = 0.42 + s * 0.44;
    frame.box("paintedMetal", u, v, 0.2, w - 0.16, 0.03, 0.32, { color: PALETTE.impGrey, texel: 2 });
    frame.box("emitWhiteFaint", u, v + 0.38, 0.3, w - 0.4, 0.012, 0.1, { uv: "keep" });
    // datapads standing in a row, boxed games, holo-chips
    let cu = u - w / 2 + 0.2;
    while (cu < u + w / 2 - 0.2) {
      const kind = rand();
      if (kind < 0.5) {
        const n = 3 + Math.floor(rand() * 5);
        for (let k = 0; k < n; k++) {
          frame.box("darkGloss", cu + k * 0.035, v + 0.14, 0.2, 0.012, 0.22, 0.16, { color: PALETTE.impBlack });
          if (rand() < 0.4) frame.box("emitBlue", cu + k * 0.035, v + 0.22, 0.29, 0.008, 0.02, 0.006);
        }
        cu += n * 0.035 + 0.1;
      } else if (kind < 0.8) {
        const bw = 0.16 + rand() * 0.12;
        frame.box("impPanel1", cu + bw / 2, v + 0.09, 0.2, bw, 0.15, 0.22, { color: [PALETTE.impGrey, PALETTE.impLight, PALETTE.impDark][Math.floor(rand() * 3)], uv: "keep" });
        frame.add("decal", new THREE.PlaneGeometry(0.1, 0.1), cu + bw / 2, v + 0.09, 0.312, { uv: "keep", uvRect: decalRect(Math.floor(rand() * 16)) });
        cu += bw + 0.08;
      } else {
        frame.cylV("metal", cu + 0.06, v + 0.06, 0.2, 0.05, 0.09, { color: PALETTE.steel, segments: 10 });
        frame.box("emitAmber", cu + 0.06, v + 0.115, 0.2, 0.05, 0.005, 0.05);
        cu += 0.24;
      }
    }
  }
  frame.collider(u - w / 2, u + w / 2, 0, 2.5, 0, 0.6, "shelf");
}

/** Drinks dispenser: tall unit with a lit menu screen, cup slot and a status lamp. */
function dispenser(frame, u) {
  frame.box("paintedMetal", u, 1.05, 0.35, 1.0, 2.1, 0.7, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("impPanel", u, 1.1, 0.705, 0.9, 1.9, 0.02, { color: PALETTE.impGrey, uv: "keep" });
  frame.box("darkGloss", u, 1.65, 0.72, 0.7, 0.42, 0.01);
  frame.add("impScreen2", new THREE.PlaneGeometry(0.64, 0.36), u, 1.65, 0.726, { uv: "keep" });
  frame.box("paintedMetal", u, 0.9, 0.7, 0.5, 0.5, 0.08, { color: PALETTE.impBlack, texel: 2 });
  frame.box("emitAmber", u, 1.13, 0.745, 0.44, 0.01, 0.01);
  frame.box("metal", u, 0.68, 0.72, 0.4, 0.02, 0.1, { color: PALETTE.steel });
  frame.cylV("metal", u, 0.76, 0.72, 0.03, 0.09, { color: PALETTE.steel, segments: 8 });
  for (let k = 0; k < 4; k++) frame.box(k === 3 ? "emitRed" : "emitBlue", u - 0.3 + k * 0.08, 1.32, 0.725, 0.04, 0.03, 0.006);
  frame.box("hazard", u, 0.03, 0.36, 1.0, 0.06, 0.7, { texel: 3 });
  frame.collider(u - 0.5, u + 0.5, 0, 2.1, 0, 0.74, "dispenser");
}

export function buildRecreation(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x -26..-2.9, y 0..3.6, z -64..-42
  const H = max[1];
  const rand = rng(ctx.seed + 29);
  const W = max[0] - min[0];
  const D = max[2] - min[2];

  // window openings in the zmin wall (u = x - min.x) and one smaller viewport in the zmax wall
  // (u = max.x - x) so the left wall seen from the door is not a blank run of grille panels
  const windows = [-20.4, -14.45, -8.5].map((x) => ({ u: x - min[0], w: 3.8, h: 1.7, v: 1.95 }));
  const sideWindow = { u: max[0] - -20.5, w: 2.2, h: 1.2, v: 2.0 };
  const opening = (w) => ({ type: "window", u0: w.u - w.w / 2 - 0.12, u1: w.u + w.w / 2 + 0.12, v0: w.v - w.h / 2 - 0.12, v1: w.v + w.h / 2 + 0.12 });
  roomShell(kit, ctx, {
    ceiling: false,
    walls: { rows: [0, 0.5, 1.5, 2.6, H], paints: LOUNGE_PAINTS, styles: { panel: 0.74, vent: 0.08, greeble: 0.08, strip: 0.04, screen: 0.03, conduit: 0.03 }, theme: { accent: "emitAmber", accent2: "emitBlue" } },
    wall: { zmin: { openings: windows.map(opening) }, zmax: { openings: [opening(sideWindow)] } },
  });

  // ------------------------------------------------------------------ slatted ceiling with four soft warm bands, beams, perimeter soffit
  // (the ceiling is kept quiet so the star windows are the brightest thing in the room)
  kit.boxMM("paintedMetal", [min[0] - 0.2, H, min[2] - 0.2], [max[0] + 0.2, H + 0.12, max[2] + 0.2], { color: PALETTE.impBlack, texel: 2 });
  // the bands stop 9.5 m short of the door wall: the stretch overhead of the fixed view showed through
  // the slats as hotspots in the top corners of the frame (at -10.5 the left one was still in view)
  const bandX1 = -12.5;
  for (let i = 0; i < 4; i++) {
    const z = min[2] + ((i + 0.5) / 4) * D;
    kit.box("crew_warmBand", (min[0] + 0.8 + bandX1) / 2, H - 0.008, z, bandX1 - min[0] - 0.8, 0.012, 1.6, { uv: "keep" });
  }
  const slatMat = "paintedMetal";
  for (let z = min[2] + 0.9; z < max[2] - 0.7; z += 0.3) {
    kit.box(slatMat, min[0] + W / 2, H - 0.11, z, W - 1.4, 0.12, 0.06, { color: PALETTE.impGrey, texel: 2 });
  }
  // plain beams along z (no downlight cans)
  for (const x of [-20.4, -14.45, -8.5]) {
    kit.box("paintedMetal", x, H - 0.2, min[2] + D / 2, 0.36, 0.3, D - 1.4, { color: PALETTE.impDark, texel: 1.5 });
  }
  // perimeter soffit: dark band with an amber cove line on its inner edge
  const sof = 0.7;
  const drop = 0.24;
  for (const [a, b] of [
    [[min[0], H - drop, min[2]], [max[0], H, min[2] + sof]],
    [[min[0], H - drop, max[2] - sof], [max[0], H, max[2]]],
    [[min[0], H - drop, min[2]], [min[0] + sof, H, max[2]]],
    [[max[0] - sof, H - drop, min[2]], [max[0], H, max[2]]],
  ]) kit.boxMM("paintedMetal", a, b, { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("emitAmber", [min[0] + sof - 0.03, H - drop - 0.01, min[2] + sof - 0.03], [max[0] - sof + 0.03, H - drop + 0.02, min[2] + sof + 0.03]);
  kit.boxMM("emitAmber", [min[0] + sof - 0.03, H - drop - 0.01, max[2] - sof - 0.03], [max[0] - sof + 0.03, H - drop + 0.02, max[2] - sof + 0.03]);
  kit.boxMM("emitAmber", [min[0] + sof - 0.03, H - drop - 0.01, min[2] + sof], [min[0] + sof + 0.03, H - drop + 0.02, max[2] - sof]);
  kit.boxMM("emitAmber", [max[0] - sof - 0.03, H - drop - 0.01, min[2] + sof], [max[0] - sof + 0.03, H - drop + 0.02, max[2] - sof]);

  // ------------------------------------------------------------------ lights (6): amber clusters, bar, cool window wash, holo teal, door
  // (the amber pair hang at pendant height and the games-wall one sits nearer the door: at (-11, 2.8,
  // -48) its specular reflection on the painted slats fell in the top-left of the fixed view and read
  // as a louvre hotspot; from (-9.2, 2.6, -47.2) the reflection lands outside the frame)
  ctx.light(pointLight(0xffb060, 24, 15, [-18.0, 2.3, -56.5]));
  ctx.light(pointLight(0xffb060, 24, 15, [-9.2, 2.6, -47.2]));
  ctx.light(pointLight(0xffc27a, 16, 11, [-22.6, 2.4, -54.0]));
  ctx.light(pointLight(0x7f9fe0, 10, 12, [-14.5, 2.2, -61.8]));
  ctx.light(pointLight(0x4fd8cc, 6, 6, [-8.6, 1.6, -58.6]));
  ctx.light(pointLight(0xffe0c0, 17, 12, [-7.0, 2.9, -53.5]));

  // ------------------------------------------------------------------ windows to space + window seat
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    windows.forEach((w, i) => starWindow(frame, w.u, w.v, w.w, w.h, i % 2 === 1));
    // long window bench: dark base, fabric cushions in sections, occasional cushion
    const bx0 = -23.6;
    const bx1 = -5.4;
    kit.boxMM("paintedMetal", [bx0, 0, -63.84], [bx1, 0.38, -63.1], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("emitAmber", [bx0 + 0.2, 0.06, -63.12], [bx1 - 0.2, 0.075, -63.11]);
    for (let x = bx0 + 0.05; x < bx1 - 0.1; x += 1.5) {
      const col = FABRICS[Math.floor(rand() * FABRICS.length)];
      kit.box("fabric", x + 0.72, 0.44, -63.47, 1.4, 0.12, 0.72, { color: col, uv: "world", texel: 2 });
      if (rand() < 0.3) kit.box("fabric", x + 0.72, 0.56, -63.6, 0.4, 0.12, 0.4, { color: FABRICS[(Math.floor(rand() * 3) + 1) % 4], uv: "world", texel: 2, rot: [0, (rand() - 0.5) * 0.8, 0] });
    }
    kit.collider([bx0, 0, -63.9], [bx1, 0.5, -63.08], "windowseat");
    wallGrime(kit, ctx, "zmin", 2.0, 0.45, 1.6, 0.5);
    ventGrille(frame, 1.6, 0.4, 0.8, 0.35);
    ventGrille(frame, W - 1.6, 0.4, 0.8, 0.35);
  }

  // ------------------------------------------------------------------ seating clusters on rugs
  rug(kit, -18.4, -57.4, 5.0, 4.2, RUG);
  sofa(kit, { x: -18.4, z: -59.1, yaw: 0, len: 2.6, color: FABRICS[0], seed: ctx.seed + 1 });
  sofa(kit, { x: -20.4, z: -57.2, yaw: Math.PI / 2, len: 2.0, color: FABRICS[1], seed: ctx.seed + 2 });
  sofa(kit, { x: -16.3, z: -57.3, yaw: -Math.PI / 2, len: 1.0, color: FABRICS[0], seed: ctx.seed + 3 });
  lowTable(kit, { x: -18.4, z: -57.2, w: 1.3, d: 0.75, seed: ctx.seed + 4 });
  floorLamp(kit, -21.2, -59.3);

  rug(kit, -10.2, -47.6, 4.6, 4.4, RUG);
  sofa(kit, { x: -10.2, z: -45.9, yaw: Math.PI, len: 2.4, color: FABRICS[3], seed: ctx.seed + 5 });
  sofa(kit, { x: -10.2, z: -49.3, yaw: 0, len: 2.4, color: FABRICS[2], seed: ctx.seed + 6 });
  lowTable(kit, { x: -10.2, z: -47.6, w: 1.4, d: 0.7, seed: ctx.seed + 7 });
  floorLamp(kit, -12.2, -49.6);

  // two armchairs by the middle window, a side table between them
  rug(kit, -14.5, -60.6, 3.6, 2.6, RUG, 0.05);
  sofa(kit, { x: -15.4, z: -61.0, yaw: Math.PI + 0.45, len: 1.0, color: FABRICS[1], seed: ctx.seed + 8 });
  sofa(kit, { x: -13.6, z: -61.0, yaw: Math.PI - 0.45, len: 1.0, color: FABRICS[1], seed: ctx.seed + 9 });
  lowTable(kit, { x: -14.5, z: -60.2, w: 0.6, d: 0.6, seed: ctx.seed + 10 });

  // near cluster in the front third by the door: two armchairs across a low table on a rug (the deck
  // between the door and the card table was an empty apron in the fixed view)
  rug(kit, -8.3, -55.2, 2.6, 3.2, RUG);
  sofa(kit, { x: -8.3, z: -53.9, yaw: Math.PI, len: 1.0, color: FABRICS[1], seed: ctx.seed + 17 });
  sofa(kit, { x: -8.3, z: -56.5, yaw: 0, len: 1.0, color: FABRICS[3], seed: ctx.seed + 18 });
  lowTable(kit, { x: -8.3, z: -55.2, w: 1.1, d: 0.65, seed: ctx.seed + 19 });

  // ------------------------------------------------------------------ holo-game table with four stools
  holoTable(kit, ctx, -8.6, -58.6, ctx.seed + 11);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    stool(kit, -8.6 + Math.cos(a) * 1.15, -58.6 + Math.sin(a) * 1.15, 0.47);
  }
  floorGrime(kit, -8.6, -58.6, 3.4, 3.4, 0.4);

  // ------------------------------------------------------------------ centre: card table on a rug facing the door, a third cluster, a crest pedestal
  {
    const cx = -13.0;
    const cz = -53.0;
    rug(kit, cx, cz, 3.8, 3.8, RUG, 0.12);
    kit.cyl("paintedMetal", cx, 0.04, cz, 0.5, 0.08, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
    kit.cyl("paintedMetal", cx, 0.4, cz, 0.16, 0.72, "y", { color: PALETTE.impDark, segments: 12, texel: 2 });
    kit.cyl("paintedMetal", cx, 0.76, cz, 0.85, 0.06, "y", { color: PALETTE.impMid, segments: 28, texel: 2 });
    kit.cyl("fabric", cx, 0.795, cz, 0.78, 0.012, "y", { color: new THREE.Color("#2d3a2e"), segments: 28, uv: "world", texel: 2 });
    kit.add("emitAmber", new THREE.TorusGeometry(0.82, 0.012, 6, 40), { pos: [cx, 0.8, cz], rot: [Math.PI / 2, 0, 0] });
    // dealt cards and chip stacks
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      kit.box("darkGloss", cx + Math.cos(a) * 0.5, 0.81, cz + Math.sin(a) * 0.5, 0.12, 0.006, 0.08, { rot: [0, -a + (rand() - 0.5) * 0.5, 0] });
      if (i % 2) kit.cyl("metal", cx + Math.cos(a) * 0.3, 0.83, cz + Math.sin(a) * 0.3, 0.035, 0.05, "y", { color: PALETTE.steel, segments: 10 });
    }
    kit.collider([cx - 0.86, 0, cz - 0.86], [cx + 0.86, 0.82, cz + 0.86], "cardtable");
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      impChair(kit, ctx, { x: cx + Math.cos(a) * 1.3, z: cz + Math.sin(a) * 1.3, yaw: Math.atan2(Math.cos(a), Math.sin(a)) });
    }
    floorGrime(kit, cx, cz, 3.6, 3.6, 0.2);
  }
  rug(kit, -19.6, -49.4, 4.4, 4.0, RUG, -0.2);
  sofa(kit, { x: -20.9, z: -48.2, yaw: Math.PI / 2 - 0.2, len: 2.0, color: FABRICS[2], seed: ctx.seed + 14 });
  sofa(kit, { x: -18.3, z: -50.6, yaw: -Math.PI / 2 - 0.2, len: 2.0, color: FABRICS[3], seed: ctx.seed + 15 });
  lowTable(kit, { x: -19.6, z: -49.4, yaw: -0.2, w: 1.2, d: 0.7, seed: ctx.seed + 16 });
  floorLamp(kit, -21.6, -50.6);
  {
    // unit crest pedestal: black plinth with a lit holo ship rotating above it
    const px = -14.6;
    const pz = -50.0;
    kit.box("paintedMetal", px, 0.5, pz, 0.7, 1.0, 0.7, { color: PALETTE.impBlack, texel: 1.5 });
    kit.box("impPanel1", px, 0.55, pz, 0.62, 0.8, 0.62, { color: PALETTE.impDark, uv: "keep" });
    kit.box("paintedMetal", px, 1.02, pz, 0.76, 0.05, 0.76, { color: PALETTE.impMid, texel: 2 });
    kit.box("emitBlue", px, 1.05, pz, 0.5, 0.008, 0.5);
    kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [px, 0.6, pz + 0.352], uv: "keep", uvRect: decalRect(4) });
    kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [px, 0.6, pz - 0.352], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(4) });
    kit.collider([px - 0.38, 0, pz - 0.38], [px + 0.38, 1.06, pz + 0.38], "pedestal");
    hologram(kit, ctx, { x: px, y: 1.45, z: pz, kind: "ship", scale: 0.28 });
  }

  // ------------------------------------------------------------------ bar along the xmin wall
  {
    const seg = wallSegment(ctx.bounds, "xmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.z - z
    bar(kit, ctx, frame, -42 - -50.2, -42 - -58.6, ctx.seed + 12);
    // menu / entertainment screens flanking the back-bar
    wallScreen(kit, ctx, { side: "xmin", u: -42 - -48.6, v: 1.8, w: 1.1, h: 0.65, screen: 2 });
    wallScreen(kit, ctx, { side: "xmin", u: -42 - -60.2, v: 1.8, w: 1.1, h: 0.65, screen: 0 });
    wallSign(kit, ctx, { side: "xmin", u: -42 - -54.4, v: 2.95, w: 1.4, cell: SIGN.RECREATION, lit: true });
    // kegs at the end of the bar, a worn mat behind the counter
    kit.cyl("paintedMetal", -25.2, 0.38, -61.6, 0.32, 0.76, "y", { color: PALETTE.impMid, segments: 16, texel: 2 });
    kit.cyl("paintedMetal", -25.2, 0.8, -61.6, 0.2, 0.08, "y", { color: PALETTE.impBlack, segments: 12 });
    kit.cyl("paintedMetal", -24.5, 0.3, -62.4, 0.28, 0.6, "y", { color: PALETTE.impDark, segments: 16, texel: 2 });
    kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [-24.86, 0.4, -61.6], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: decalRect(11) });
    kit.collider([-25.6, 0, -62.8], [-24.1, 0.9, -61.2], "kegs");
    floorGrime(kit, -24.7, -53.0, 1.2, 7.0, 0.0);
    floorGrime(kit, -22.3, -55.0, 1.4, 1.2, 0.5);
    ventGrille(frame, -42 - -46.0, 0.4, 0.8, 0.35);
    intercom(frame, -42 - -44.2, 1.5);
  }

  // ------------------------------------------------------------------ zmax wall: games shelf, dispenser, viewscreens, cable tray
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.x - x
    gameShelf(frame, max[0] - -17.6, ctx.seed + 13, holoBoardMaterial(ctx));
    // lit header over the shelf and two lit notice posters beside it (this wall was a featureless
    // grille from the door)
    signPlate(kit, ctx, { side: "zmax", u: max[0] - -17.6, v: 2.78, w: 2.2, h: 0.36, text: "Games", sub: "Sign out at the bar", accent: "#ffb347" });
    signPlate(kit, ctx, { side: "zmax", u: max[0] - -15.0, v: 2.05, w: 1.3, h: 0.5, text: "Sabacc", sub: "Cycle 04 tournament", accent: "#ffb347" });
    signPlate(kit, ctx, { side: "zmax", u: max[0] - -15.0, v: 1.35, w: 1.3, h: 0.5, text: "Holonet", sub: "Fleet news 21:00", accent: "#4a9dff" });
    // side viewport between the shelf and the dispensers, with its own sill
    starWindow(frame, sideWindow.u, sideWindow.v, sideWindow.w, sideWindow.h, true);
    dispenser(frame, max[0] - -23.6);
    dispenser(frame, max[0] - -22.4);
    wallScreen(kit, ctx, { side: "zmax", u: max[0] - -13.0, v: 1.9, w: 1.6, h: 0.9, screen: 1 });
    wallScreen(kit, ctx, { side: "zmax", u: max[0] - -7.4, v: 1.9, w: 1.6, h: 0.9, screen: 3 });
    cableTray(kit, ctx, "zmax", 0.8, W - 0.8, 3.05);
    ventGrille(frame, max[0] - -10.2, 0.4, 0.8, 0.35);
    wallGrime(kit, ctx, "zmax", max[0] - -23.0, 0.5, 2.2, 0.6);
    // a couple of standing tables near the dispensers
    for (const [x, z] of [[-21.0, -44.2], [-19.0, -45.0]]) {
      kit.cyl("metal", x, 0.03, z, 0.3, 0.06, "y", { color: PALETTE.impBlack, segments: 16 });
      kit.cyl("metal", x, 0.55, z, 0.04, 1.04, "y", { color: PALETTE.impMid, segments: 8 });
      kit.cyl("paintedMetal", x, 1.08, z, 0.36, 0.05, "y", { color: PALETTE.impMid, segments: 20, texel: 2 });
      kit.cyl("darkGloss", x, 1.11, z, 0.33, 0.012, "y", { segments: 20 });
      kit.cyl("metal", x + 0.1, 1.17, z - 0.05, 0.035, 0.1, "y", { color: PALETTE.steel, segments: 8 });
      kit.collider([x - 0.36, 0, z - 0.36], [x + 0.36, 1.12, z + 0.36], "hightable");
    }
  }

  // ------------------------------------------------------------------ door wall (xmax): notice screens, coat pegs, a bin
  wallScreen(kit, ctx, { side: "xmax", u: -47.6 - min[2], v: 1.85, w: 1.3, h: 0.75, screen: 2 });
  wallScreen(kit, ctx, { side: "xmax", u: -58.4 - min[2], v: 1.85, w: 1.3, h: 0.75, screen: 4 });
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = z - min.z
    for (let k = 0; k < 5; k++) {
      const u = -60.6 - min[2] + k * 0.3;
      frame.cylN("metal", u, 1.7, 0.05, 0.012, 0.1, { color: PALETTE.steel, segments: 6 });
      if (k === 1 || k === 3) frame.box("fabric", u, 1.35, 0.1, 0.22, 0.6, 0.12, { color: PALETTE.impDark, uv: "world", texel: 2 });
    }
    frame.cylV("paintedMetal", -45.4 - min[2], 0.35, 0.3, 0.22, 0.7, { color: PALETTE.impMid, segments: 14, texel: 2 });
    frame.cylV("paintedMetal", -45.4 - min[2], 0.72, 0.3, 0.24, 0.05, { color: PALETTE.impBlack, segments: 14 });
    kit.collider([-3.5, 0, -45.7], [-2.9, 0.8, -45.1], "bin");
    intercom(frame, -51.2 - min[2], 1.5);
  }

  // ------------------------------------------------------------------ wear
  scuffRun(kit, -3.6, -53, -12, -53, 5, ctx.seed + 31, 0.9);
  scuffRun(kit, -12, -53, -22, -53.5, 4, ctx.seed + 32, 0.8);
  floorGrime(kit, -25.2, -42.8, 1.2, 1.0, 0.3);
  floorGrime(kit, -3.6, -63.2, 1.0, 1.2, -0.2);
  if (ctx.audioZone) ctx.audioZone({ kind: "lounge", pos: [-14, 1.5, -53], radius: 12 });
}
