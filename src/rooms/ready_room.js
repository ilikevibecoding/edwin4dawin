// Pilots' Ready Room (deck A): a squadron briefing hall. Three rows of four high-backed pilot seats
// face a large framed wall display on the E wall across a central aisle; a briefing lectern and a
// holo plinth (rotating sortie chart) flank the display; a flight-gear bay (open helmet / suit rack,
// closed lockers) lines the N wall beside the service alcove (counter, dispenser, cups); wall status
// boards over the seat block; honour boards, plaques, a presentation model of the ship, a padded bench
// and a lounge corner by the door. Softer grey panels, dark carpet with the cog woven in. Accent gold.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE, setDomain } from "../materials.js";
import { impRoomShell, impConsole, impChair, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { deckASetup, wallScreen, wireSphereGeometry, lineSegments, mergedMesh, datapad, cup, datapadRack, indicatorRow, yawToward, yawFrame, projectorColumn, helmet } from "./deck_a_kit.js";
import { locker } from "./deck_b_props.js";

const BRASS = new THREE.Color("#b08a52");
const GOLD = "deckA_emitGold";
const CLOTH = new THREE.Color("#1e1f25");
const SUIT = new THREE.Color("#101114");

/** Hanging wall banner: brass rod, dark cloth with the cog emblem and a glyph line, gold hem bar. */
function banner(f, u, vTop) {
  const bw = 0.9;
  const bh = 2.65;
  f.cylU("impMetal", u, vTop, 0.16, 0.02, bw + 0.3, { color: BRASS, segments: 10 });
  for (const s of [-1, 1]) f.box("impMetal", u + s * (bw / 2 + 0.1), vTop, 0.08, 0.04, 0.05, 0.16, { color: PALETTE.impGreyDark });
  f.box("fabric", u, vTop - 0.04 - bh / 2, 0.14, bw, bh, 0.03, { color: CLOTH, texel: 2 });
  f.decal(IMP_DECAL.cog, u, vTop - 1.0, 0.16, 0.62);
  f.decal(IMP_DECAL.glyphs1, u, vTop - 1.75, 0.16, 0.34);
  f.box(GOLD, u, vTop - 0.04 - bh + 0.08, 0.16, bw * 0.8, 0.015, 0.006);
  f.box("impMetal", u, vTop - 0.04 - bh - 0.02, 0.14, bw + 0.04, 0.04, 0.05, { color: BRASS });
  f.collider(u - bw / 2 - 0.1, u + bw / 2 + 0.1, 0, vTop + 0.05, 0.08, 0.22, "banner");
}

/** Presentation model of the Star Destroyer on a brass stand (light grey solid wedge, terraces, tower). */
function shipModel(f, cu, cv, cn, L) {
  f.box("impMetal", cu, cv + 0.01, cn, L + 0.1, 0.02, 0.36, { color: BRASS, texel: 2 });
  const y0 = cv + 0.12; // hull underside at the stern
  const W = 0.3 * L;
  const yT = 0.033 * L;
  const yB = -0.049 * L;
  // stand posts reach the sloping underside (bow end sits higher than the stern end)
  for (const s of [-1, 1]) {
    const top = y0 - yB * (0.5 - 0.22 * s);
    f.cylV("impMetal", cu + s * L * 0.22, (cv + 0.02 + top) / 2, cn, 0.012, top - cv - 0.02 + 0.006, { color: BRASS, segments: 8 });
  }
  // hull: wedge as six outward-facing triangles (bow at -z, stern at +z), then rotated to lie along u
  const bow = [0, 0, -L / 2];
  const sTL = [-W, yT, L / 2];
  const sTR = [W, yT, L / 2];
  const sBL = [-W, yB, L / 2];
  const sBR = [W, yB, L / 2];
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute([...bow, ...sTL, ...sTR, ...bow, ...sBR, ...sBL, ...sBL, ...sBR, ...sTR, ...sBL, ...sTR, ...sTL, ...bow, ...sBL, ...sTL, ...bow, ...sTR, ...sBR], 3));
  hull.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(18 * 2), 2)); // same attribute set as the boxes (kit re-projects UVs)
  hull.computeVertexNormals();
  const parts = [hull];
  const block = (zc, len, hw, y, hgt) => parts.push(new THREE.BoxGeometry(hw * 2, hgt, len).translate(0, y + hgt / 2, zc));
  block(0.12 * L, 0.56 * L, 0.14 * L, yT, 0.02 * L);
  block(0.2 * L, 0.42 * L, 0.1 * L, yT + 0.02 * L, 0.018 * L);
  block(0.27 * L, 0.3 * L, 0.07 * L, yT + 0.038 * L, 0.016 * L);
  block(0.32 * L, 0.06 * L, 0.024 * L, yT + 0.054 * L, 0.055 * L);
  block(0.32 * L, 0.11 * L, 0.065 * L, yT + 0.109 * L, 0.024 * L);
  for (const s of [-1, 1]) parts.push(new THREE.SphereGeometry(0.018 * L, 10, 8).translate(s * 0.04 * L, yT + 0.133 * L, 0.29 * L));
  const model = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  model.rotateY(Math.PI / 2).translate(0, y0 - yB - cv, 0); // +90 deg about V: bow to -u, stern to +u
  f.add("impMetal", model, cu, cv, cn, { color: PALETTE.impGrey, texel: 2 });
  // engine glow on the stern face
  for (const ex of [-0.12, 0, 0.12]) f.box("emitBlue", cu + L / 2 + 0.004, y0 + 0.035 * L, cn + ex * L, 0.006, 0.04 * L, 0.05 * L);
}

/**
 * Pilot seat: rail-mounted pedestal, deep bucket pan with side bolsters, a high back leaning 8 degrees
 * with wing bolsters and a headrest, armrests (the right one carries a fold-out datapad), a grey back
 * panel with a gold seat plate. Faces local -z (toward the display when yaw = -PI/2).
 */
function pilotSeat(kit, x, z, yaw, opts = {}) {
  const { pad = PALETTE.impGreyDark, screen = "scrBlue0", accentKey = "emitAmber", collide = true } = opts;
  const f = yawFrame(kit, x, 0, z, yaw);
  const T = 0.14;
  f.box("impMetal", 0, 0.03, 0, 0.5, 0.06, 0.62, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impTrim", 0, 0.24, 0.03, 0.26, 0.36, 0.32, { color: PALETTE.impBlack, texel: 1 });
  f.box("impTrim", 0, 0.46, 0, 0.6, 0.08, 0.6, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("rubber", 0, 0.53, 0.03, 0.46, 0.07, 0.5, { color: pad, texel: 2 });
  for (const s of [-1, 1]) f.box("impTrim", s * 0.27, 0.57, 0.06, 0.06, 0.14, 0.46, { color: PALETTE.impBlack });
  f.box("impTrim", 0, 1.02, 0.3, 0.6, 1.04, 0.12, { color: PALETTE.impCharcoal, texel: 1, tilt: T });
  f.box("rubber", 0, 1.0, 0.235, 0.44, 0.8, 0.05, { color: pad, texel: 2, tilt: T });
  for (const s of [-1, 1]) f.box("impTrim", s * 0.25, 0.96, 0.2, 0.08, 0.62, 0.12, { color: PALETTE.impBlack, tilt: T });
  f.box("impTrim", 0, 1.6, 0.35, 0.34, 0.2, 0.1, { color: PALETTE.impCharcoal, tilt: T });
  f.box("rubber", 0, 1.6, 0.29, 0.26, 0.14, 0.03, { color: pad, tilt: T });
  // back panel (seen from the door) with the seat plate
  f.box("impMetal", 0, 1.02, 0.365, 0.48, 0.7, 0.012, { color: PALETTE.impGrey, texel: 2, tilt: T });
  f.box(GOLD, 0, 1.3, 0.38, 0.1, 0.035, 0.008, { tilt: T });
  for (const s of [-1, 1]) f.box("impTrim", s * 0.33, 0.74, 0.06, 0.06, 0.05, 0.44, { color: PALETTE.impBlack });
  f.box("impGloss", 0.37, 0.78, -0.14, 0.2, 0.014, 0.16);
  f.add(screen, new THREE.PlaneGeometry(0.16, 0.12).rotateX(-Math.PI / 2), 0.37, 0.788, -0.14, { uv: "keep" });
  f.box(accentKey, 0.37, 0.79, -0.03, 0.03, 0.01, 0.02);
  if (collide) f.collider(-0.4, 0.4, 0, 1.75, -0.32, 0.42, "seat");
}

export function buildReadyRoom(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitAmber";
  const warm = 0xffe2c0;
  const panelColor = PALETTE.impWhite.clone().lerp(PALETTE.impGrey, 0.35);
  // one fixture temperature in here: every wall lamp is a warm-white diffuser (dimmer than the kit's
  // cool emitWhiteSoft), matching the suspended bar and the warm ceiling fills
  const WALL = "deckA_readyWarm";
  const SLOT = "deckA_readyWarmDim";
  if (!M[WALL]) {
    const m = M.emitWarmSoft.clone();
    m.emissiveIntensity = 1.3;
    M[WALL] = setDomain(m, "interior");
    const s = M.emitWarmSoft.clone();
    s.emissiveIntensity = 1.0;
    M[SLOT] = setDomain(s, "interior");
  }

  // ---- shell: softer panel tint, clean features, two lit troughs ----------------------------------
  // (the kit's random wall light strips are off: 70 % of them come out cool white)
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 5177,
    wall: { panelW: 1.8, features: { vent: 0.03, equipment: 0.04, conduit: 0.0, light: 0.0, screen: 0.05 }, panelColor, panelColorAlt: PALETTE.impGrey, altChance: 0.25 },
    walls: { E: { features: { vent: 0.0, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 } }, S: { features: { vent: 0.02, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 } }, N: { features: { vent: 0.0, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 } } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.6, beamStep: 4.0, lightKey: SLOT },
  });
  // carpet with a brass edge trim replaces the deck lane; the cog woven in between the door and the
  // first row of seats (upright as seen from the door); a brass aisle strip runs up to the display
  kit.boxMM("fabric", [-6.6, 0, -4.3], [8.2, 0.014, 4.3], { color: new THREE.Color("#4a4c54"), texel: 2 });
  for (const [a, b] of [[[-6.66, -4.36], [8.26, -4.3]], [[-6.66, 4.3], [8.26, 4.36]], [[-6.66, -4.36], [-6.6, 4.36]], [[8.2, -4.36], [8.26, 4.36]]]) kit.boxMM("impMetal", [a[0], 0, a[1]], [b[0], 0.02, b[1]], { color: BRASS, texel: 2 });
  kit.add("decalImp", new THREE.PlaneGeometry(2.6, 2.6), { pos: [-4.9, 0.02, 0], rot: [-Math.PI / 2, 0, Math.PI / 2], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
  kit.add("impMetal", new THREE.RingGeometry(1.45, 1.5, 64).rotateX(-Math.PI / 2), { pos: [-4.9, 0.017, 0], color: BRASS });
  for (const s of [-1, 1]) kit.boxMM("impMetal", [-3.2, 0.015, s * 0.8 - 0.02], [7.6, 0.022, s * 0.8 + 0.02], { color: BRASS, texel: 2 });

  // ---- seat block: three rows of four pilot seats facing the E-wall display across a 1.6 m aisle ---
  const rowsX = [-1.8, -0.2, 1.4];
  const seatsZ = [-2.55, -1.45, 1.45, 2.55];
  const screens = ["scrBlue0", "scrAmber0", "scrWhite0", "scrBlue1"];
  rowsX.forEach((rx, r) => {
    seatsZ.forEach((sz, i) => pilotSeat(kit, rx, sz, -Math.PI / 2, { screen: screens[(r + i) % 4], accentKey, collide: false }));
    // one collider per row and side (two seats each)
    for (const s of [-1, 1]) kit.collider([rx - 0.42, 0, Math.min(s * 0.95, s * 3.1)], [rx + 0.4, 1.75, Math.max(s * 0.95, s * 3.1)], "seats");
    // row rail on the deck under the seats, a gold row marker at the aisle end
    for (const s of [-1, 1]) {
      kit.box("impTrim", rx, 0.02, s * 2.0, 0.16, 0.04, 2.4, { color: PALETTE.impBlack });
      kit.box(GOLD, rx, 0.045, s * 0.86, 0.12, 0.012, 0.06);
    }
  });
  // helmets and a datapad left on two seats (third row), a cup on an armrest
  helmet(kit, 1.4, 0.56, -1.45, -Math.PI / 2 + 0.3);
  datapad(kit, -0.2, 0.565, 2.55, -Math.PI / 2 + 0.2, { screen: "scrAmber1", accentKey });

  // ---- lectern (S of the aisle) and holo plinth (N of the aisle) framing the display -------------
  {
    const lx = 5.0;
    const lz = 1.9;
    impConsole(kit, lx, 0, lz, 1.1, 0.6, { yaw: Math.PI / 2, seed: 41, screens: ["scrAmber1"], accentKey, height: 1.05 });
    // reading lamp on a stalk over the lectern top, a gold cog plate on the audience face
    kit.cyl("impMetal", lx - 0.42, 1.35, lz + 0.35, 0.012, 0.5, "y", { color: BRASS, segments: 8 });
    kit.box("impTrim", lx - 0.42, 1.62, lz + 0.2, 0.12, 0.06, 0.34, { color: PALETTE.impBlack });
    kit.box(WALL, lx - 0.42, 1.588, lz + 0.2, 0.08, 0.01, 0.26, { uv: "keep" });
    kit.box("impMetal", lx - 0.31, 0.62, lz, 0.02, 0.44, 0.44, { color: BRASS, texel: 2 });
    kit.add("decalImp", new THREE.PlaneGeometry(0.34, 0.34).rotateY(-Math.PI / 2), { pos: [lx - 0.322, 0.62, lz], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
    // holo plinth: brass-ringed projector column + rotating sortie chart hologram
    const px = 5.0;
    const pz = -1.9;
    const ph = 0.95;
    projectorColumn(kit, px, pz, 0.34, ph, { accentKey: GOLD, rings: 2 });
    kit.add("holo", new THREE.CircleGeometry(0.7, 40).rotateX(-Math.PI / 2), { pos: [px, ph + 0.12, pz], uv: "keep" });
    const chart = new THREE.Group();
    chart.position.set(px, ph + 0.55, pz);
    const geos = [new THREE.TorusGeometry(0.6, 0.007, 6, 64).rotateX(Math.PI / 2), new THREE.TorusGeometry(0.4, 0.005, 6, 48).rotateX(Math.PI / 2).translate(0, 0.3, 0)];
    const bars = [0.5, 0.78, 0.36, 0.66, 0.9, 0.44, 0.72, 0.58];
    for (let i = 0; i < bars.length; i++) {
      const a = (i / bars.length) * Math.PI * 2;
      geos.push(new THREE.BoxGeometry(0.05, bars[i], 0.05).translate(Math.cos(a) * 0.6, bars[i] / 2 - 0.1, Math.sin(a) * 0.6));
    }
    chart.add(mergedMesh(geos, M.holoBright));
    const globe = lineSegments(wireSphereGeometry(0.26, 5, 8, 24), M.deckA_holoLine);
    globe.position.y = 0.66;
    chart.add(globe);
    kit.attach(chart);
    kit.onUpdate((dt, t) => {
      chart.rotation.y = t * 0.3;
      globe.rotation.y = -t * 0.6;
    });
  }
  // suspended warm light bar across the seat block
  {
    const bx = -0.2;
    kit.box("impTrim", bx, 3.2, 0, 0.5, 0.12, 6.4, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", bx, 3.13, 0, 0.4, 0.03, 6.2, { color: PALETTE.impCharcoal });
    kit.box(WALL, bx, 3.11, 0, 0.3, 0.02, 6.0, { uv: "keep" });
    kit.box(GOLD, bx + 0.256, 3.2, 0, 0.01, 0.02, 6.2);
    kit.box(GOLD, bx - 0.256, 3.2, 0, 0.01, 0.02, 6.2);
    for (const z of [-2.4, 2.4]) kit.cyl("impMetal", bx, (3.26 + h) / 2, z, 0.015, h - 3.26, "y", { color: PALETTE.impGreyDark, segments: 8 });
  }

  // ---- E wall: large briefing display with a brass surround, indicator rows, banners --------------
  {
    const f = walls.E.frame;
    f.box("impMetal", hz, 2.05, 0.085, 4.0, 2.16, 0.01, { color: BRASS, texel: 2 });
    wallScreen(f, hz, 2.05, 3.6, 1.8, "scrBlue1", { accentKey: GOLD, n0: 0.09, label: false });
    f.decal(IMP_DECAL.cog, hz, 3.35, 0.09, 0.36);
    indicatorRow(f, hz - 2.6, 1.6, 0.1, 6, { accentKey, seed: 21, step: 0.09, size: 0.045 });
    indicatorRow(f, hz + 2.6, 1.6, 0.1, 6, { accentKey, seed: 22, step: 0.09, size: 0.045 });
    impWallLight(f, hz - 3.6, 2.6, { key: WALL, w: 0.7 });
    impWallLight(f, hz + 3.6, 2.6, { key: WALL, w: 0.7 });
    // squadron status boards flanking the display (sortie roster / readiness), the wing's plaques
    wallScreen(f, hz - 5.6, 2.3, 1.4, 0.9, "scrAmber2", { accentKey: GOLD, n0: 0.08 });
    wallScreen(f, hz + 5.6, 2.3, 1.4, 0.9, "scrWhite1", { accentKey: GOLD, n0: 0.08 });
    indicatorRow(f, hz - 5.6, 1.62, 0.1, 8, { accentKey, seed: 23, step: 0.1, size: 0.05 });
    indicatorRow(f, hz + 5.6, 1.62, 0.1, 8, { accentKey, seed: 24, step: 0.1, size: 0.05 });
    // hanging banners: brass rod, dark cloth with the cog, gold hem bar
    for (const s of [-1, 1]) banner(f, hz + s * 7.2, 3.45);
  }

  // ---- N wall (W part): flight-gear bay — open helmet / suit rack + closed lockers -----------------
  {
    const f = walls.N.frame;
    const ru = 3.9 + hx - 10; // rack centre u (x = -6.1)
    const rw = 3.0;
    const rh = 2.2;
    const rd = 0.55;
    // open rack: black frame, charcoal back, a helmet shelf with four helmets, four flight suits on a rail
    f.box("impTrim", ru, rh / 2, 0.04, rw, rh, 0.08, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", ru, rh / 2 + 0.05, 0.085, rw - 0.16, rh - 0.3, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
    for (const s of [-1, 1]) f.box("impTrim", ru + s * (rw / 2 - 0.05), rh / 2, rd / 2, 0.1, rh, rd, { color: PALETTE.impBlack, texel: 1 });
    f.box("impTrim", ru, rh - 0.05, rd / 2, rw, 0.1, rd, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", ru, 0.06, rd / 2, rw + 0.04, 0.12, rd + 0.04, { color: PALETTE.impCharcoal, texel: 1 });
    f.box(GOLD, ru, rh - 0.11, rd + 0.006, rw - 0.4, 0.02, 0.01);
    f.box("impMetal", ru, 1.58, rd / 2, rw - 0.2, 0.04, rd - 0.08, { color: PALETTE.impGreyDark, texel: 1 });
    f.box("impTrim", ru, 1.56, rd - 0.02, rw - 0.2, 0.05, 0.03, { color: PALETTE.impBlack });
    for (let k = 0; k < 4; k++) {
      const p = f.pos(ru - rw / 2 + 0.45 + k * 0.7, 1.6, 0.3);
      helmet(kit, p.x, p.y, p.z, Math.PI + (k - 1.5) * 0.15);
    }
    // suit rail with four black flight suits (torso, sleeves, chest box, belt) hanging under the shelf
    f.cylU("impMetal", ru, 1.48, 0.3, 0.015, rw - 0.3, { color: BRASS, segments: 8 });
    for (let k = 0; k < 4; k++) {
      const su = ru - rw / 2 + 0.45 + k * 0.7;
      f.box("impMetal", su, 1.44, 0.3, 0.3, 0.03, 0.03, { color: PALETTE.impGreyDark });
      f.box("fabric", su, 0.95, 0.3, 0.4, 1.0, 0.16, { color: SUIT, texel: 2 });
      for (const s of [-1, 1]) f.box("fabric", su + s * 0.26, 1.15, 0.3, 0.12, 0.6, 0.14, { color: SUIT, texel: 2 });
      f.box("impGloss", su, 1.22, 0.39, 0.22, 0.14, 0.04);
      for (let j = 0; j < 3; j++) f.box(j === 1 ? accentKey : "impMetal", su - 0.06 + j * 0.06, 1.24, 0.412, 0.03, 0.03, 0.006, { color: PALETTE.impGrey });
      f.box("impMetal", su, 0.7, 0.385, 0.42, 0.05, 0.02, { color: PALETTE.impGreyDark });
      f.box("impTrim", su, 0.36, 0.3, 0.34, 0.2, 0.16, { color: PALETTE.impBlack });
    }
    f.decal(IMP_DECAL.glyphs1, ru, rh + 0.3, 0.09, 0.4);
    f.collider(ru - rw / 2 - 0.04, ru + rw / 2 + 0.04, 0, rh + 0.02, 0, rd + 0.06, "gearrack");
    // closed lockers beside the rack (four doors), each with a status lamp; number stencils above
    locker(f, ru + rw / 2 + 1.55, 2.8, 2.1, { doors: 4, accentKey: GOLD, color: PALETTE.impGrey, decal: IMP_DECAL.glyphs2, depth: 0.5 });
    f.decal(IMP_DECAL.glyphs3, ru + rw / 2 + 1.55, 2.5, 0.09, 0.4);
    impWallLight(f, 1.6, 2.6, { key: WALL, w: 0.7 });
    // squadron status boards over the seat block: two framed readouts with lamp rows
    const bu = ru + rw / 2 + 1.55 + 1.4 + 1.25;
    wallScreen(f, bu, 2.0, 1.5, 0.9, "scrWhite2", { accentKey: GOLD, n0: 0.08 });
    wallScreen(f, bu + 2.3, 2.0, 1.5, 0.9, "scrAmber3", { accentKey: GOLD, n0: 0.08 });
    indicatorRow(f, bu, 1.3, 0.1, 10, { accentKey, seed: 25, step: 0.12, size: 0.05 });
    indicatorRow(f, bu + 2.3, 1.3, 0.1, 10, { accentKey, seed: 26, step: 0.12, size: 0.05 });
    f.decal(IMP_DECAL.cog, bu + 1.15, 2.6, 0.09, 0.4);
  }

  // ---- N wall (E part): service alcove (counter, dispenser, cups, shelf) --------------------------
  {
    const f = walls.N.frame;
    const u0 = 4.4 + hx;
    const u1 = 8.8 + hx;
    const cu = (u0 + u1) / 2;
    const cw = u1 - u0;
    // counter: black base with door leaves, gloss top with brass edge
    f.box("impTrim", cu, 0.44, 0.38, cw, 0.88, 0.6, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", cu, 0.06, 0.38, cw + 0.04, 0.12, 0.64, { color: PALETTE.impCharcoal, texel: 1 });
    for (let k = 0; k < 4; k++) {
      f.box("impPanel1", u0 + 0.1 + (k + 0.5) * ((cw - 0.2) / 4), 0.45, 0.685, (cw - 0.2) / 4 - 0.06, 0.6, 0.02, { color: panelColor, uv: "world", texel: 1 });
      f.box("impMetal", u0 + 0.1 + (k + 0.5) * ((cw - 0.2) / 4) + 0.2, 0.55, 0.705, 0.03, 0.18, 0.02, { color: BRASS });
    }
    f.box("impMetal", cu, 0.89, 0.39, cw + 0.06, 0.03, 0.66, { color: BRASS, texel: 2 });
    f.box("impGloss", cu, 0.92, 0.38, cw + 0.02, 0.04, 0.62);
    f.collider(u0, u1, 0, 0.95, 0.08, 0.7, "counter");
    // splash panel + shelf with cups
    f.box("impMetal", cu, 1.35, 0.1, cw, 0.82, 0.04, { color: PALETTE.impCharcoal, texel: 2 });
    f.box(GOLD, cu, 0.97, 0.13, cw - 0.2, 0.012, 0.01);
    f.box("impTrim", cu - 0.5, 1.62, 0.22, cw - 1.4, 0.04, 0.28, { color: PALETTE.impBlack });
    f.box("impMetal", cu - 0.5, 1.66, 0.22, cw - 1.5, 0.04, 0.24, { color: BRASS, texel: 2 });
    for (let k = 0; k < 6; k++) {
      const p = f.pos(u0 + 0.5 + k * 0.42, 1.68, 0.22);
      cup(kit, p.x, p.y, p.z, { color: k % 3 === 0 ? PALETTE.impGrey : PALETTE.impWhite });
    }
    for (let k = 0; k < 4; k++) {
      const p = f.pos(u0 + 0.5 + k * 0.32, 0.94, 0.5);
      cup(kit, p.x, p.y, p.z);
    }
    // beverage dispenser on the counter's east end
    const du = u1 - 0.55;
    f.box("impTrim", du, 1.3, 0.35, 0.7, 0.76, 0.5, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", du, 1.3, 0.605, 0.6, 0.66, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
    f.screen("scrAmber0", du + 0.1, 1.5, 0.612, 0.3, 0.16);
    for (let k = 0; k < 3; k++) f.box(k === 1 ? GOLD : k === 0 ? "emitWhite" : "impGloss", du - 0.2, 1.55 - k * 0.1, 0.615, 0.08, 0.06, 0.012);
    f.box("impMetal", du, 1.12, 0.62, 0.5, 0.05, 0.03, { color: PALETTE.impGreyDark });
    f.cylV("impMetal", du, 1.06, 0.72, 0.015, 0.12, { color: PALETTE.impGrey, segments: 8 });
    f.box("impMetal", du, 0.96, 0.72, 0.36, 0.02, 0.22, { color: PALETTE.impGreyDark });
    f.decal(IMP_DECAL.glyphs2, du + 0.1, 1.28, 0.612, 0.16);
    cup(kit, ...f.pos(du, 0.98, 0.72).toArray());
    f.decal(IMP_DECAL.glyphs3, cu + 0.6, 2.3, 0.09, 0.5);
    impWallLight(f, cu - 1.2, 2.7, { key: WALL, w: 0.9 });
  }

  // ---- lounge corner (S side, near the door): round table with two chairs ---------------------
  {
    const lx = -4.4;
    const lz = 5.4;
    kit.cyl("impMetal", lx, 0.03, lz, 0.36, 0.06, "y", { color: PALETTE.impCharcoal, segments: 20, texel: 1 });
    kit.cyl("impTrim", lx, 0.37, lz, 0.1, 0.68, "y", { color: PALETTE.impBlack, segments: 16, texel: 1 });
    kit.cyl("impMetal", lx, 0.705, lz, 0.47, 0.03, "y", { color: BRASS, segments: 32, texel: 2 });
    kit.cyl("impGloss", lx, 0.74, lz, 0.45, 0.04, "y", { segments: 32 });
    kit.add(GOLD, new THREE.TorusGeometry(0.2, 0.006, 6, 32).rotateX(Math.PI / 2), { pos: [lx, 0.765, lz] });
    datapad(kit, lx + 0.12, 0.76, lz - 0.14, 2.6, { screen: "scrWhite0", accentKey });
    cup(kit, lx - 0.2, 0.76, lz + 0.16);
    cup(kit, lx + 0.22, 0.76, lz + 0.2, { color: PALETTE.impGrey });
    kit.collider([lx - 0.47, 0, lz - 0.47], [lx + 0.47, 0.78, lz + 0.47], "loungetable");
    for (const s of [-1, 1]) impChair(kit, lx + s * 0.95, 0, lz + 0.15 * s, yawToward(lx + s * 0.95, lz + 0.15 * s, lx, lz));
  }

  // ---- S wall: plaques, the ship model on its sideboard, honour board -------------------------
  {
    const f = walls.S.frame;
    const plaque = (u, v, pw, ph, decal) => {
      f.box("impMetal", u, v, 0.1, pw + 0.06, ph + 0.06, 0.03, { color: BRASS, texel: 2 });
      f.box("impTrim", u, v, 0.12, pw, ph, 0.03, { color: PALETTE.impBlack, texel: 1 });
      f.decal(decal, u, v + ph * 0.1, 0.137, Math.min(pw, ph) * 0.62);
      f.box(GOLD, u, v - ph / 2 + 0.06, 0.137, pw * 0.6, 0.01, 0.006);
    };
    for (const [x, dec] of [[-5.2, IMP_DECAL.cog], [-3.1, IMP_DECAL.bay01], [-1.0, IMP_DECAL.glyphs2]]) plaque(hx - x, 2.1, 1.0, 0.7, dec);
    // sideboard with the presentation model of the ship on a brass stand, a small display above
    {
      const su = hx - 2.2;
      const sw = 2.4;
      f.box("impTrim", su, 0.45, 0.33, sw, 0.9, 0.5, { color: PALETTE.impBlack, texel: 1 });
      f.box("impMetal", su, 0.06, 0.33, sw + 0.04, 0.12, 0.54, { color: PALETTE.impCharcoal, texel: 1 });
      for (const s of [-1, 1]) {
        f.box("impPanel1", su + s * (sw / 4 + 0.01), 0.5, 0.585, sw / 2 - 0.08, 0.62, 0.02, { color: panelColor, uv: "world", texel: 1 });
        f.box("impMetal", su + s * 0.12, 0.5, 0.605, 0.03, 0.2, 0.02, { color: BRASS });
      }
      f.box("impMetal", su, 0.905, 0.34, sw + 0.06, 0.03, 0.56, { color: BRASS, texel: 2 });
      f.box("impGloss", su, 0.935, 0.33, sw + 0.02, 0.04, 0.52);
      f.collider(su - sw / 2, su + sw / 2, 0, 0.96, 0.08, 0.6, "sideboard");
      shipModel(f, su, 0.955, 0.33, 1.1);
      cup(kit, ...f.pos(su + 1.0, 0.955, 0.42).toArray(), { color: PALETTE.impGrey });
      wallScreen(f, su, 2.15, 1.6, 0.9, "scrWhite1", { accentKey: GOLD, n0: 0.08 });
    }
    // honour board: rows of small brass plates
    const bu = hx - 6.0;
    f.box("impMetal", bu, 2.0, 0.1, 2.16, 1.56, 0.03, { color: BRASS, texel: 2 });
    f.box("impTrim", bu, 2.0, 0.12, 2.1, 1.5, 0.03, { color: PALETTE.impBlack, texel: 1 });
    f.decal(IMP_DECAL.cog, bu, 2.55, 0.137, 0.32);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) f.box("impMetal", bu - 0.85 + c * 0.34, 2.25 - r * 0.2, 0.14, 0.26, 0.09, 0.01, { color: BRASS, texel: 4 });
    f.box(GOLD, bu, 1.3, 0.137, 1.6, 0.012, 0.006);
    impWallLight(f, bu, 3.0, { key: WALL, w: 1.2 });
    impWallLight(f, hx + 1.0, 3.0, { key: WALL, w: 1.2 });
    impWallLight(f, hx - 8.6, 3.0, { key: WALL, w: 0.9 });
  }

  // ---- W wall: padded bench south of the door, datapad rack north of it ------------------------
  {
    const f = walls.W.frame;
    const bz0 = 2.4;
    const bz1 = 6.6;
    const bu = hz - (bz0 + bz1) / 2;
    const bl = bz1 - bz0;
    f.box("impTrim", bu, 0.22, 0.42, bl, 0.44, 0.68, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", bu, 0.05, 0.42, bl + 0.04, 0.1, 0.72, { color: PALETTE.impCharcoal, texel: 1 });
    f.box("fabric", bu, 0.49, 0.42, bl - 0.08, 0.1, 0.62, { color: PALETTE.impGreyDark, texel: 2 });
    for (let k = 1; k < 4; k++) f.box("impTrim", bu - bl / 2 + (k * bl) / 4, 0.5, 0.42, 0.02, 0.11, 0.6, { color: PALETTE.impBlack });
    f.box("fabric", bu, 0.92, 0.13, bl - 0.08, 0.5, 0.1, { color: PALETTE.impGreyDark, texel: 2 });
    f.box("impTrim", bu, 1.2, 0.1, bl, 0.06, 0.12, { color: PALETTE.impBlack });
    f.box(GOLD, bu, 1.235, 0.1, bl - 0.2, 0.01, 0.06);
    f.collider(bu - bl / 2, bu + bl / 2, 0, 0.6, 0.08, 0.78, "bench");
    datapadRack(f, hz + 3.6, 1.3, { n: 5, accentKey: GOLD });
    f.decal(IMP_DECAL.glyphs1, hz + 3.6, 2.2, 0.09, 0.5);
    // side table with a cup at the bench end
    const p = f.pos(hz - 7.2, 0, 0.45);
    kit.box("impTrim", p.x, 0.3, p.z, 0.5, 0.6, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impGloss", p.x, 0.62, p.z, 0.54, 0.04, 0.54);
    cup(kit, p.x + 0.1, 0.64, p.z - 0.08);
    datapad(kit, p.x - 0.08, 0.64, p.z + 0.1, 0.5, { screen: "scrAmber1", accentKey });
    kit.collider([p.x - 0.27, 0, p.z - 0.27], [p.x + 0.27, 0.66, p.z + 0.27], "sidetable");
  }
  // door-side stencils
  walls.W.frame.decal(IMP_DECAL.glyphs2, hz - 1.6, 2.2, 0.09, 0.45);
  walls.W.frame.decal(IMP_DECAL.cog, hz + 1.6, 2.2, 0.09, 0.45);

  // ---- lights (8): warm key over the seat block, warm fills door / display side, gear bay, alcove,
  // lounge, display-wall fill, a cool point in the hologram ---------------------------------------
  kit.light({ type: "spot", pos: [-0.2, h - 0.2, 0], target: [-0.2, 0.5, 0], color: warm, intensity: lux(h - 0.7, 6.0), distance: 13, angle: 1.05, penumbra: 0.6, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [-6.2, h - 0.6, 0], color: 0xffcf9a, intensity: lux(h - 0.6, 4.4), distance: 13, priority: 0.56 });
  kit.light({ type: "point", pos: [5.2, h - 0.6, 0], color: 0xffcf9a, intensity: lux(h - 0.6, 3.8), distance: 13, priority: 0.55 });
  kit.light({ type: "point", pos: [-4.6, h - 0.8, -6.0], color: 0xffd9b0, intensity: lux(h - 0.8, 2.8), distance: 11, priority: 0.46 });
  kit.light({ type: "point", pos: [6.6, h - 0.8, -6.2], color: 0xffd9b0, intensity: lux(h - 0.8, 2.4), distance: 10, priority: 0.44 });
  kit.light({ type: "point", pos: [-2.0, h - 0.8, 6.0], color: 0xffd9b0, intensity: lux(h - 0.8, 2.6), distance: 11, priority: 0.43 });
  // display-wall fill kept high so its mirror image on the glossy display falls above the screen
  // for anyone standing between the seats and the lectern
  kit.light({ type: "point", pos: [8.6, 3.6, 0], color: warm, intensity: lux(3.6, 1.6), distance: 10, priority: 0.42 });
  kit.light({ type: "point", pos: [5.0, 2.0, -1.9], color: 0x9fd0ff, intensity: 3.2, distance: 5, priority: 0.3 });
}
