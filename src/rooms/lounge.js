// Officers' Lounge (Deck B): a long bar with a lit under-counter and a backlit back-bar along the
// E wall under a black canopy, booths along the N and S walls, four table clusters with stools on
// the open floor (holo-game table with creature pieces, round table, a low pair, a tall leaner) and
// a seating group in front of a large nav chart on the S wall. Amber mood lighting: frosted amber
// sconces between the booths, pendants over the tables, warm low keys under a dark ceiling.
// Animated: one holo-game creature turns slowly and the nav chart's course marker pulses.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng } from "../kit.js";
import { impRoomShell, impWallGear, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { bench, table, roundTable, stool, wallScreen, locker, fakeDoor, cableRun, holoCreature, holoCreatureStatic, rod, floorStrip, deckBSetup } from "./deck_b_props.js";

const CARPET = new THREE.Color("#2b2a2e");
const PAD = new THREE.Color("#7a5a44");
const PAD_ALT = new THREE.Color("#4f5868");
const SCONCE = "deckB_emitAmberWarm";

export function buildLounge(kit, ctx, room) {
  deckBSetup(kit);
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitAmber";
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 7411,
    accentKey,
    // the walls are dressed by the booths, sconces and plaques: keep the shell's own features flush
    wall: { panelW: 1.6, features: { vent: 0.05, screen: 0.03 }, altChance: 0.3 },
    walls: { E: { features: { vent: 0.03 } } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.2, lightKey: "emitAmberDim" },
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x
  const E = walls.E.frame; // u = z + hz
  const W = walls.W.frame; // u = hz - z

  // --- bar along the E wall: counter, stools, back-bar
  const bar = buildBar(kit, ctx, E, hx, hz, accentKey);

  // --- booths along the N wall (6) and the west part of the S wall (2)
  const boothsN = [-9.9, -6.9, -3.9, -0.9, 2.1, 5.1];
  for (let i = 0; i < boothsN.length; i++) booth(kit, N, boothsN[i], -hz, -1, hx, accentKey, i, i < boothsN.length - 1);
  const boothsS = [-9.9, -6.9];
  for (let i = 0; i < boothsS.length; i++) booth(kit, S, boothsS[i], hz, 1, hx, accentKey, 10 + i, i < boothsS.length - 1);

  // --- nav chart on the S wall with a small 3D course hologram in front of it, lounge group facing it
  wallScreen(S, hx, 2.2, 4.4, 2.4, "scrBlue0", { accentKey, bezel: 0.18, leds: 3 });
  for (const s of [-1, 1]) {
    S.box("impTrim", hx + s * 2.75, 2.2, 0.07, 0.24, 2.5, 0.08, { color: PALETTE.impBlack });
    S.box("emitWarmSoft", hx + s * 2.75, 2.2, 0.115, 0.08, 2.3, 0.012, { uv: "keep" });
  }
  S.decal(IMP_DECAL.glyphs1, hx, 0.62, 0.034, 1.2, { h: 0.3 });
  // course hologram: three legs and two waypoints floating 20 cm off the chart
  const chart = (u, v, n) => {
    const p = S.pos(u, v, n);
    return [p.x, p.y, p.z];
  };
  rod(kit, "holoBright", chart(hx - 1.6, 1.5, 0.2), chart(hx - 0.4, 2.3, 0.32), 0.012, { segments: 6 });
  rod(kit, "holoBright", chart(hx - 0.4, 2.3, 0.32), chart(hx + 0.9, 2.0, 0.26), 0.012, { segments: 6 });
  rod(kit, "holo", chart(hx + 0.9, 2.0, 0.26), chart(hx + 1.7, 2.8, 0.2), 0.012, { segments: 6 });
  for (const [u, v, n, r] of [[hx - 1.6, 1.5, 0.2, 0.09], [hx - 0.4, 2.3, 0.32, 0.06], [hx + 0.9, 2.0, 0.26, 0.07]]) {
    const p = S.pos(u, v, n);
    kit.add("holo", new THREE.SphereGeometry(r, 12, 8), { pos: [p.x, p.y, p.z], uv: "keep" });
  }
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), ctx.materials.holoBright);
  const markerA = S.pos(hx - 1.6, 1.5, 0.2);
  const markerB = S.pos(hx + 1.7, 2.8, 0.2);
  marker.position.copy(markerA);
  kit.attach(marker);
  // seating group: two benches facing the chart, two low tables
  for (const s of [-1, 1]) {
    bench(kit, s * 1.75, 4.7, 3.0, Math.PI, { pad: "fabric", padColor: PAD, accentKey });
    table(kit, s * 1.75, 6.4, 1.6, 0.7, 0, { h: 0.46, accentKey });
    // a couple of cups on each table
    kit.cyl("impMetal", s * 1.75 - 0.3, 0.52, 6.3, 0.04, 0.09, "y", { color: PALETTE.impGrey, segments: 10 });
    kit.cyl("impMetal", s * 1.75 + 0.2, 0.52, 6.5, 0.04, 0.09, "y", { color: PALETTE.impGrey, segments: 10 });
  }
  kit.boxMM("fabric", [-3.6, 0.002, 3.9], [3.6, 0.014, 7.4], { color: CARPET, texel: 1.5 });
  for (const s of [-1, 1]) floorStrip(kit, "emitAmberDim", s * 3.65, 3.9, s * 3.69, 7.4);

  // --- four table clusters on the open floor: the holo-game table (S half), a round table (N half),
  // a pair of low tables in the middle and a tall leaner table nearer the bar; stools at all of them
  const gameX = -6.8;
  const gameZ = 5.0;
  const rtX = -6.8; // round table cluster (N half), mirrored across the entrance axis
  const rtZ = -5.0;
  roundTable(kit, gameX, gameZ, 0.8, { h: 0.8, accentKey });
  const gameTop = 0.8 + 0.012;
  kit.add("emitBlue", new THREE.TorusGeometry(0.52, 0.008, 6, 48).rotateX(Math.PI / 2), { pos: [gameX, gameTop + 0.008, gameZ], uv: "keep" });
  kit.add("emitBlue", new THREE.TorusGeometry(0.26, 0.006, 6, 32).rotateX(Math.PI / 2), { pos: [gameX, gameTop + 0.008, gameZ], uv: "keep" });
  // holo-game pieces: two sides (blue / red-orange) of alien creature silhouettes on the two rings
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = i % 2 ? 0.52 : 0.38;
    const px = gameX + Math.cos(a) * r;
    const pz = gameZ + Math.sin(a) * r;
    kit.box("impGloss", px, gameTop + 0.006, pz, 0.1, 0.012, 0.1);
    kit.box(i % 2 ? "emitRedImp" : "emitBlue", px, gameTop + 0.013, pz, 0.02, 0.006, 0.02);
    if (i !== 3) holoCreatureStatic(kit, px, gameTop + 0.014, pz, i, i % 3 === 0 ? 0.3 : 0.24, i % 2 ? "deckB_holoRed" : "holo", -a + Math.PI);
  }
  const piece = holoCreature(kit.materials, 3, 0.3, "deckB_holoRedBright");
  const pa = (3 / 8) * Math.PI * 2 + Math.PI / 8;
  piece.position.set(gameX + Math.cos(pa) * 0.52, gameTop + 0.014, gameZ + Math.sin(pa) * 0.52);
  kit.attach(piece);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    stool(kit, gameX + Math.cos(a) * 1.25, gameZ + Math.sin(a) * 1.25, { h: 0.5, pad: "fabric", padColor: PAD });
  }
  kit.cyl("impMetal", gameX, 0.002, gameZ, 1.8, 0.004, "y", { color: PALETTE.impCharcoal, segments: 40 });
  // round table cluster (N half)
  roundTable(kit, rtX, rtZ, 0.62, { h: 0.76, accentKey });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    stool(kit, rtX + Math.cos(a) * 1.05, rtZ + Math.sin(a) * 1.05, { h: 0.5, pad: "fabric", padColor: PAD_ALT });
  }
  kit.cyl("impMetal", rtX, 0.002, rtZ, 1.55, 0.004, "y", { color: PALETTE.impCharcoal, segments: 40 });
  kit.cyl("impMetal", rtX - 0.2, 0.822, rtZ + 0.1, 0.04, 0.1, "y", { color: PALETTE.impGrey, segments: 10 });
  kit.cyl("impGloss", rtX + 0.25, 0.882, rtZ - 0.15, 0.05, 0.22, "y", { segments: 10 });
  kit.cyl(accentKey, rtX + 0.25, 1.002, rtZ - 0.15, 0.02, 0.02, "y", { segments: 8 });
  // middle cluster: two low tables sharing a carpet disc, three stools each
  for (const [tx, tz, rot] of [[0.6, -3.9, 0.3], [2.3, -2.3, 1.4]]) {
    roundTable(kit, tx, tz, 0.5, { h: 0.5, accentKey });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rot;
      stool(kit, tx + Math.cos(a) * 0.95, tz + Math.sin(a) * 0.95, { h: 0.46, pad: "fabric", padColor: i % 2 ? PAD : PAD_ALT });
    }
    kit.cyl("impMetal", tx + 0.2, 0.522, tz - 0.15, 0.04, 0.09, "y", { color: PALETTE.impGrey, segments: 10 });
  }
  kit.cyl("impMetal", 1.45, 0.002, -3.1, 2.4, 0.004, "y", { color: PALETTE.impCharcoal, segments: 48 });
  // leaner table nearer the bar: tall, three tall stools, a lit rim
  roundTable(kit, 3.8, 1.6, 0.45, { h: 1.05, accentKey });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.9;
    stool(kit, 3.8 + Math.cos(a) * 0.9, 1.6 + Math.sin(a) * 0.9, { h: 0.72, pad: "fabric", padColor: PAD });
  }
  kit.cyl("impGloss", 3.95, 1.16, 1.5, 0.05, 0.2, "y", { segments: 10 });
  kit.cyl(accentKey, 3.95, 1.27, 1.5, 0.02, 0.02, "y", { segments: 8 });
  // two more groups on the entry axis so the floor by the door is not bare: a round table with four
  // stools N of the axis, and a lounge group (two facing benches over a low table) S of it; the walk
  // from the door to the bar weaves between them
  const g1X = -8.4;
  const g1Z = -1.5;
  roundTable(kit, g1X, g1Z, 0.62, { h: 0.76, accentKey });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    stool(kit, g1X + Math.cos(a) * 1.05, g1Z + Math.sin(a) * 1.05, { h: 0.5, pad: "fabric", padColor: i % 2 ? PAD : PAD_ALT });
  }
  kit.cyl("impMetal", g1X, 0.002, g1Z, 1.55, 0.004, "y", { color: PALETTE.impCharcoal, segments: 40 });
  for (const [dx, dz] of [[-0.25, 0.15], [0.2, -0.2], [0.05, 0.3]]) kit.cyl("impMetal", g1X + dx, 0.822, g1Z + dz, 0.04, 0.09, "y", { color: PALETTE.impGrey, segments: 10 });
  const g2X = -3.6;
  const g2Z = 1.7;
  table(kit, g2X, g2Z, 1.4, 0.7, 0, { h: 0.46, accentKey });
  bench(kit, g2X, g2Z - 1.15, 2.2, Math.PI, { pad: "fabric", padColor: PAD, accentKey });
  bench(kit, g2X, g2Z + 1.15, 2.2, 0, { pad: "fabric", padColor: PAD, accentKey });
  kit.boxMM("fabric", [g2X - 1.6, 0.002, g2Z - 1.8], [g2X + 1.6, 0.014, g2Z + 1.8], { color: CARPET, texel: 1.5 });
  kit.cyl("impMetal", g2X - 0.3, 0.52, g2Z + 0.1, 0.04, 0.09, "y", { color: PALETTE.impGrey, segments: 10 });
  kit.cyl("impGloss", g2X + 0.35, 0.56, g2Z - 0.15, 0.05, 0.2, "y", { segments: 10 });
  kit.cyl(accentKey, g2X + 0.35, 0.67, g2Z - 0.15, 0.02, 0.02, "y", { segments: 8 });

  // --- W wall: plaques either side of the door, sconces, unit glyphs over the door
  for (const s of [-1, 1]) {
    const u = hz + s * 4.6;
    W.box("impTrim", u, 2.0, 0.06, 2.6, 1.7, 0.12, { color: PALETTE.impBlack, texel: 1 });
    W.box("impMetal", u, 2.0, 0.125, 2.5, 1.6, 0.012, { color: PALETTE.impCharcoal, texel: 2 });
    const plaques = [IMP_DECAL.cog, IMP_DECAL.bay01, IMP_DECAL.glyphs1, IMP_DECAL.bay02, IMP_DECAL.glyphs2, IMP_DECAL.bay03];
    for (let i = 0; i < 6; i++) {
      const pu = u - 0.8 + (i % 3) * 0.8;
      const pv = 2.38 - Math.floor(i / 3) * 0.76;
      W.box("impTrim", pu, pv, 0.14, 0.62, 0.62, 0.03, { color: PALETTE.impBlack });
      W.box("impPanel1", pu, pv, 0.158, 0.54, 0.54, 0.008, { color: PALETTE.impGrey, uv: "world", texel: 1 });
      W.decal(plaques[(i + (s > 0 ? 3 : 0)) % 6], pu, pv, 0.164, 0.42);
    }
    W.box(accentKey, u, 1.12, 0.125, 2.2, 0.02, 0.012);
    sconce(W, u, 3.1);
    W.collider(u - 1.3, u + 1.3, 1.1, 2.9, 0, 0.18, "plaques");
  }
  sconce(W, 1.6, 2.4);
  sconce(W, d - 1.6, 2.4);
  // (the amber runner from the door is gone: the floor stays plain deck up to the clusters)

  // --- E wall ends beyond the back-bar: supply locker and cable run (N), galley door (S)
  locker(E, 2.0, 1.2, 2.0, { accentKey, doors: 1, color: PALETTE.impGrey, decal: IMP_DECAL.glyphs3 });
  cableRun(E, 0.6, 3.3, 3.0, { n: 3, seed: 41, r: 0.03 });
  impWallGear(E, 3.4, 1.7, { seed: 9, accentKey });
  fakeDoor(E, d - 1.9, 1.2, 2.2, { accentKey, statusKey: "emitGreen", label: IMP_DECAL.glyphs3 });
  sconce(E, d - 0.9, 2.6);

  // --- ceiling: a black canopy over the bar with four amber downlights, amber pendants over the
  // table clusters and the lounge group (no cool-white light boxes: the room is amber)
  barCanopy(kit, 9.4, h, accentKey);
  pendant(kit, gameX, gameZ, h, 0.34, accentKey);
  pendant(kit, rtX, rtZ, h, 0.3, accentKey);
  pendant(kit, 0.6, -3.9, h, 0.24, accentKey);
  pendant(kit, 2.3, -2.3, h, 0.24, accentKey);
  pendant(kit, 3.8, 1.6, h, 0.22, accentKey);
  pendant(kit, g1X, g1Z, h, 0.3, accentKey);
  pendant(kit, g2X, g2Z, h, 0.26, accentKey);
  for (const s of [-1, 1]) pendant(kit, s * 1.75, 5.6, h, 0.26, accentKey);

  // --- animation: the rotating game piece and the course marker sliding along the chart
  kit.onUpdate((dt, tt) => {
    piece.rotation.y += dt * 0.7;
    piece.position.y = gameTop + 0.014 + Math.sin(tt * 1.5) * 0.01;
    const k = (tt * 0.12) % 1;
    marker.position.lerpVectors(markerA, markerB, k);
    marker.visible = Math.sin(tt * 6) > -0.4;
  });

  // --- lights (8): amber keys over the bar and its lit under-counter, warm keys over the clusters and
  // the booth rows, a cooler key on the chart seating, blue holo glow under the game table
  kit.light({ type: "point", pos: [9.6, h - 0.7, 0], color: 0xffbf80, intensity: lux(h - 0.7, 3.6), distance: 13, priority: 0.5 });
  kit.light({ type: "point", pos: [bar.frontX - 0.7, 0.5, 0], color: 0xffb56b, intensity: 4.5, distance: 9, priority: 0.47 });
  kit.light({ type: "point", pos: [1.5, h - 0.8, -3.0], color: 0xffd0a0, intensity: lux(h - 0.8, 5.2), distance: 14, priority: 0.48 });
  kit.light({ type: "point", pos: [-7.5, h - 1.0, -7.0], color: 0xffc898, intensity: lux(h - 1.0, 4.2), distance: 13, priority: 0.42 });
  kit.light({ type: "point", pos: [1.5, h - 1.0, -7.0], color: 0xffc898, intensity: lux(h - 1.0, 4.2), distance: 13, priority: 0.41 });
  kit.light({ type: "point", pos: [0, h - 1.0, 5.5], color: 0xf0e6dc, intensity: lux(h - 1.0, 4.2), distance: 12, priority: 0.44 });
  kit.light({ type: "point", pos: [-7.0, h - 0.9, 0.2], color: 0xffd0a0, intensity: lux(h - 0.9, 5.2), distance: 14, priority: 0.4 });
  kit.light({ type: "point", pos: [gameX, 1.5, gameZ], color: 0x5fa8ff, intensity: 2.2, distance: 5, priority: 0.3 });
}

/** Lounge sconce: black bracket, frosted amber half-shade, charcoal cap, a soft up-wash strip on the wall above. */
function sconce(frame, u, v) {
  frame.box("impTrim", u, v - 0.1, 0.06, 0.16, 0.32, 0.12, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u, v + 0.18, 0.13, 0.5, 0.03, 0.26, { color: PALETTE.impCharcoal, texel: 1 });
  const shade = new THREE.CylinderGeometry(0.15, 0.17, 0.3, 14, 1, true, 0, Math.PI);
  shade.rotateY(Math.PI / 2);
  frame.add(SCONCE, shade, u, v, 0.13, { uv: "keep" });
  frame.box("impMetal", u, v - 0.16, 0.13, 0.38, 0.02, 0.2, { color: PALETTE.impCharcoal });
  frame.box("emitAmberDim", u, v + 0.34, 0.03, 0.4, 0.5, 0.008, { uv: "keep" });
}

/** Hanging pendant: thin rod, black cone shade with an amber emitter inside, accent ring on the rim. */
function pendant(kit, x, z, ceilY, r, accentKey) {
  const y = ceilY - 1.05;
  kit.cyl("impTrim", x, ceilY - 0.03, z, 0.1, 0.06, "y", { color: PALETTE.impBlack, segments: 12 });
  kit.cyl("impMetal", x, (ceilY - 0.06 + y + 0.12) / 2, z, 0.012, ceilY - 0.06 - y - 0.12, "y", { color: PALETTE.impGreyDark, segments: 6 });
  kit.add("impTrim", new THREE.CylinderGeometry(r * 0.3, r, 0.26, 18, 1, true), { pos: [x, y, z], color: PALETTE.impBlack, uv: "scale", uvScale: [1, 0.3] });
  kit.cyl("impTrim", x, y + 0.13, z, r * 0.3, 0.02, "y", { color: PALETTE.impBlack, segments: 12 });
  kit.cyl(SCONCE, x, y - 0.06, z, r * 0.62, 0.012, "y", { segments: 18, uv: "keep" });
  kit.add(accentKey, new THREE.TorusGeometry(r + 0.01, 0.008, 6, 28).rotateX(Math.PI / 2), { pos: [x, y - 0.12, z], uv: "keep" });
}

/** Black canopy over the bar with four amber downlights and an accent hairline along its front edge. */
function barCanopy(kit, x, ceilY, accentKey) {
  const z0 = -6.2;
  const z1 = 6.2;
  kit.boxMM("impTrim", [x - 1.0, ceilY - 0.5, z0], [x + 1.0, ceilY, z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [x - 0.9, ceilY - 0.52, z0 + 0.1], [x + 0.9, ceilY - 0.5, z1 - 0.1], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM(accentKey, [x - 1.006, ceilY - 0.42, z0 + 0.2], [x - 0.994, ceilY - 0.4, z1 - 0.2]);
  for (const z of [-4.5, -1.5, 1.5, 4.5]) {
    kit.cyl("impTrim", x - 0.25, ceilY - 0.6, z, 0.2, 0.16, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.cyl(SCONCE, x - 0.25, ceilY - 0.685, z, 0.15, 0.012, "y", { segments: 16, uv: "keep" });
  }
  // glass rack hanging from the canopy's front edge
  kit.boxMM("impMetal", [x - 0.95, ceilY - 0.9, z0 + 1.0], [x - 0.35, ceilY - 0.86, z1 - 1.0], { color: PALETTE.impGreyDark, texel: 1 });
  for (let k = 0; k < 18; k++) kit.cyl("impGloss", x - 0.65, ceilY - 0.98, z0 + 1.3 + k * 0.56, 0.04, 0.14, "y", { segments: 8 });
}

/**
 * Booth on a wall: table sticking out from the wall, two facing benches, a low partition to the
 * next booth, a sconce and a unit plaque above. `side` -1 = N wall (inward +z), +1 = S wall.
 */
function booth(kit, frame, bx, wallZ, side, hx, accentKey, idx, partitionAfter) {
  const inward = -side;
  const zc = wallZ + inward * 1.05;
  table(kit, bx, wallZ + inward * 1.1, 0.75, 1.5, 0, { h: 0.74, accentKey });
  // benches face each other across the table: the W one faces +x (yaw -PI/2), the E one faces -x
  bench(kit, bx - 1.05, zc, 1.7, -Math.PI / 2, { pad: "fabric", padColor: idx % 2 ? PAD : PAD_ALT, accentKey });
  bench(kit, bx + 1.05, zc, 1.7, Math.PI / 2, { pad: "fabric", padColor: idx % 2 ? PAD : PAD_ALT, accentKey });
  // low partition to the next booth (E side): black panel with an amber cap, plus a call light
  if (partitionAfter) {
    const px = bx + 1.5;
    const z0 = Math.min(wallZ, wallZ + inward * 1.95);
    const z1 = Math.max(wallZ, wallZ + inward * 1.95);
    kit.boxMM("impTrim", [px - 0.07, 0.02, z0], [px + 0.07, 1.5, z1], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [px - 0.05, 1.5, z0 + 0.05], [px + 0.05, 1.54, z1 - 0.05], { color: PALETTE.impCharcoal });
    kit.boxMM(accentKey, [px - 0.025, 1.542, z0 + 0.2], [px + 0.025, 1.552, z1 - 0.15]);
    kit.collider([px - 0.08, 0, z0], [px + 0.08, 1.56, z1], "partition");
  }
  // wall fittings above the booth: sconce, plaque, call button strip
  const u = side < 0 ? bx + hx : hx - bx;
  sconce(frame, u, 2.2);
  frame.box("impTrim", u, 2.85, 0.03, 0.5, 0.5, 0.06, { color: PALETTE.impBlack });
  frame.box("impPanel1", u, 2.85, 0.065, 0.42, 0.42, 0.01, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  frame.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.cog][idx % 6], u, 2.85, 0.072, 0.34);
  frame.box("impTrim", u, 1.15, 0.03, 0.4, 0.14, 0.06, { color: PALETTE.impBlack });
  frame.box(accentKey, u - 0.1, 1.15, 0.062, 0.08, 0.05, 0.012);
  frame.box("emitGreen", u + 0.08, 1.15, 0.062, 0.05, 0.05, 0.012);
  // carpet under the booth
  const c0 = Math.min(wallZ + inward * 0.15, wallZ + inward * 2.3);
  const c1 = Math.max(wallZ + inward * 0.15, wallZ + inward * 2.3);
  kit.boxMM("fabric", [bx - 1.4, 0.002, c0], [bx + 1.4, 0.014, c1], { color: CARPET, texel: 1.5 });
}

/** Bar counter (front facing west), stools, dispenser, and a backlit back-bar on the E wall. Returns { frontX }. */
function buildBar(kit, ctx, E, hx, hz, accentKey) {
  const x0 = 9.2; // front face of the counter
  const x1 = 10.0;
  const z0 = -6.0;
  const z1 = 6.0;
  const top = 1.08;
  // body: black shell, grey inset panels on the front with black frames, kick recess with the lit
  // under-counter strip (amber, facing out and down onto the deck)
  kit.boxMM("impTrim", [x0, 0.12, z0], [x1, top - 0.06, z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [x0 + 0.1, 0.0, z0 + 0.05], [x1, 0.12, z1 - 0.05], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("emitAmber", [x0 + 0.02, 0.09, z0 + 0.2], [x0 + 0.1, 0.115, z1 - 0.2], { uv: "keep" });
  const nP = 8;
  for (let i = 0; i < nP; i++) {
    const za = z0 + 0.1 + ((z1 - z0 - 0.2) * i) / nP + 0.05;
    const zb = z0 + 0.1 + ((z1 - z0 - 0.2) * (i + 1)) / nP - 0.05;
    kit.boxMM("impPanel2", [x0 - 0.03, 0.3, za], [x0, top - 0.2, zb], { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.boxMM(accentKey, [x0 - 0.036, 0.42, za + 0.1], [x0 - 0.03, 0.44, zb - 0.1]);
  }
  // top: gloss slab with a black nosing and an amber underglow on the front overhang
  kit.boxMM("impTrim", [x0 - 0.16, top - 0.06, z0 - 0.06], [x1 + 0.06, top, z1 + 0.06], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impGloss", [x0 - 0.13, top, z0 - 0.03], [x1 + 0.03, top + 0.012, z1 + 0.03]);
  kit.boxMM(accentKey, [x0 - 0.14, top - 0.075, z0 + 0.15], [x0 - 0.02, top - 0.06, z1 - 0.15]);
  // end panels and a footrest rail with brackets
  for (const z of [z0, z1]) kit.boxMM("impTrim", [x0 - 0.02, 0.0, z - 0.03], [x1, top - 0.06, z + 0.03], { color: PALETTE.impBlack, texel: 1 });
  kit.cyl("impMetal", x0 - 0.28, 0.24, 0, 0.03, z1 - z0 - 0.4, "z", { color: PALETTE.impGrey, segments: 10 });
  for (let k = 0; k <= 6; k++) {
    const z = z0 + 0.3 + ((z1 - z0 - 0.6) * k) / 6;
    kit.box("impTrim", x0 - 0.15, 0.24, z, 0.26, 0.05, 0.05, { color: PALETTE.impBlack });
  }
  kit.collider([x0 - 0.3, 0, z0 - 0.06], [x1 + 0.06, top + 0.02, z1 + 0.06], "bar");
  // dispenser tower (taps toward the stools) at the north end, register at the south end, bar mats, tumblers
  kit.box("impTrim", x1 - 0.2, top + 0.2, -4.6, 0.3, 0.4, 0.5, { color: PALETTE.impBlack, texel: 1 });
  for (let k = 0; k < 4; k++) {
    kit.cyl("impMetal", x1 - 0.42, top + 0.3, -4.78 + k * 0.12, 0.018, 0.16, "x", { color: PALETTE.impGrey, segments: 8 });
    kit.box(k % 2 ? accentKey : "emitGreen", x1 - 0.356, top + 0.37, -4.78 + k * 0.12, 0.012, 0.03, 0.03);
  }
  kit.box("impMetal", x1 - 0.2, top + 0.42, -4.6, 0.32, 0.04, 0.52, { color: PALETTE.impCharcoal });
  kit.box("impTrim", x1 - 0.2, top + 0.072, 5.2, 0.24, 0.12, 0.3, { color: PALETTE.impBlack });
  const regQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.7);
  kit.add("impGloss", new THREE.BoxGeometry(0.26, 0.03, 0.22), { pos: [x1 - 0.2, top + 0.17, 5.2], quat: regQ });
  const reg = new THREE.PlaneGeometry(0.22, 0.15);
  reg.rotateX(-Math.PI / 2);
  kit.add("scrAmber0", reg, { pos: [x1 - 0.2 + 0.0103, top + 0.17 + 0.0122, 5.2], quat: regQ, uv: "keep" });
  for (let k = 0; k < 3; k++) kit.box("impMetalRough", x0 + 0.35, top + 0.02, -2.4 + k * 2.4, 0.5, 0.012, 1.2, { color: PALETTE.impGreyDark, texel: 2 });
  for (let k = 0; k < 6; k++) kit.cyl("impMetal", x1 - 0.25, top + 0.06, -1.4 + k * 0.28, 0.035, 0.1, "y", { color: PALETTE.impGrey, segments: 10 });
  // stools along the front
  for (let k = 0; k < 7; k++) {
    const z = -5.4 + k * 1.8;
    stool(kit, x0 - 0.75, z, { h: 0.72, pad: "fabric", padColor: PAD });
    kit.add("impMetal", new THREE.TorusGeometry(0.19, 0.012, 6, 18).rotateX(Math.PI / 2), { pos: [x0 - 0.75, 0.3, z], color: PALETTE.impGrey, uv: "keep" });
  }
  // dark deck inlay under the stools (no floor LED: the under-counter strip does the glowing)
  kit.boxMM("impMetalRough", [x0 - 1.5, 0.002, z0], [x0 - 0.02, 0.008, z1], { color: PALETTE.impCharcoal, texel: 0.7 });

  // back-bar on the E wall: cabinet base, backlit panel, three shelves of bottles, glass rack
  const u0 = z0 + hz;
  const u1 = z1 + hz;
  const um = (u0 + u1) / 2;
  const len = u1 - u0;
  E.box("impTrim", um, 0.5, 0.3, len, 1.0, 0.6, { color: PALETTE.impBlack, texel: 1 });
  E.box("impMetal", um, 0.06, 0.31, len + 0.02, 0.12, 0.62, { color: PALETTE.impCharcoal, texel: 1 });
  for (let i = 0; i < 6; i++) {
    const cu = u0 + 1.0 + i * 2.0;
    E.box("impPanel2", cu, 0.56, 0.606, 1.7, 0.7, 0.012, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    E.box("impMetal", cu + 0.7, 0.56, 0.625, 0.03, 0.3, 0.025, { color: PALETTE.impGrey });
  }
  E.box("impGloss", um, 1.006, 0.3, len + 0.04, 0.012, 0.64);
  E.collider(u0 - 0.02, u1 + 0.02, 0, 1.02, 0, 0.66, "backbar");
  // backlit unit: black surround, warm diffuser, shelves
  E.box("impTrim", um, 1.98, 0.08, len, 1.96, 0.16, { color: PALETTE.impBlack, texel: 1 });
  E.box("emitWarmSoft", um, 2.0, 0.165, len - 0.3, 1.6, 0.012, { uv: "keep" });
  E.box("impTrim", um, 3.02, 0.2, len + 0.1, 0.14, 0.44, { color: PALETTE.impBlack, texel: 1 });
  E.box(accentKey, um, 2.94, 0.3, len - 0.4, 0.02, 0.012);
  const shelves = [1.32, 1.86, 2.4];
  const rand = rng(913);
  for (let s = 0; s < shelves.length; s++) {
    const v = shelves[s];
    E.box("impGloss", um, v, 0.28, len - 0.2, 0.03, 0.26);
    E.box("impTrim", um, v - 0.03, 0.4, len - 0.2, 0.03, 0.02, { color: PALETTE.impBlack });
    // bottles: dark glossy cylinders of varied sizes with emissive caps
    let u = u0 + 0.35;
    while (u < u1 - 0.35) {
      const r = 0.035 + rand() * 0.03;
      const hh = 0.18 + rand() * 0.16;
      const neck = rand() < 0.5;
      E.cylV("impGloss", u, v + 0.015 + hh / 2, 0.28, r, hh, { segments: 10 });
      if (neck) E.cylV("impGloss", u, v + 0.015 + hh + 0.04, 0.28, r * 0.45, 0.08, { segments: 8 });
      const capKey = rand() < 0.4 ? accentKey : rand() < 0.5 ? "emitBlue" : rand() < 0.5 ? "emitGreen" : "emitWhite";
      E.cylV(capKey, u, v + 0.015 + hh + (neck ? 0.085 : 0.01), 0.28, r * (neck ? 0.45 : 0.7), 0.02, { segments: 8, uv: "keep" });
      u += r * 2 + 0.06 + rand() * 0.12;
    }
  }
  // rows of metal tumblers on the cabinet top, in front of the lowest shelf
  for (let k = 0; k < 14; k++) E.cylV("impMetal", u0 + 0.6 + k * 0.8, 1.062, 0.5, 0.035, 0.1, { color: PALETTE.impGrey, segments: 10 });
  E.decal(IMP_DECAL.glyphs3, um, 3.34, 0.034, 1.4, { h: 0.35 });
  return { frontX: x0 };
}
