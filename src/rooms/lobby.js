// Turbolift lobby (one per deck). Shared across decks: the two lift doors on the aft wall framed in
// the deck accent with a lit deck indicator over each and a call panel beside, the deck-letter floor
// inlay and the Imperial shell. Everything else is the deck's own signature so no two lobbies read
// alike: the bridge deck's honour guard, the officers' memorial, the crew deck's weapons check, the
// engineering manifold and vent stack, the hangar deck's fuel lines and cargo. Each deck also lights
// its lobby differently (cool white key, warm cans, twin bars, caged industrial lamps, work lights).
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { impRoomShell, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { DECK_ORDER } from "../spec.js";
import { bench, propFrame } from "./deck_b_props.js";
import { ensureLobbyMaterials } from "../textures_lobby.js";
import {
  guardAlcove,
  noticeBoard,
  sentryPost,
  memorialWall,
  benchRow,
  glossRunner,
  warmCan,
  sconce,
  rosterBoard,
  checkBooth,
  helmetRack,
  hazardBars,
  hazardBorder,
  pipeManifold,
  lockerBank,
  ventStack,
  gratingStrip,
  warningLampF,
  conduitRun,
  fuelLine,
  bayStatusBoard,
  deckLane,
  workLight,
  crateCorner,
  deckInlay,
  barFixture,
  highBayLamp,
  signPlate,
  framedPanel,
  pipeWall,
} from "./deck_signature.js";

const BLK = PALETTE.impBlack;

// per-deck shell options: wall panel mix and features, ceiling coffers and trough count
const SHELL = {
  A: { wall: { panelW: 1.25, features: { vent: 0.04, equipment: 0.04, conduit: 0.03, light: 0.0, screen: 0.04 } }, ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.0 } },
  B: { wall: { panelW: 1.5, altChance: 0.04, features: { vent: 0.02, equipment: 0.02, conduit: 0.0, light: 0.0, screen: 0.02 } }, ceiling: { troughs: 0, beamStep: 2.4 } },
  C: { wall: { panelW: 1.25, altChance: 0.4, features: { vent: 0.12, equipment: 0.05, conduit: 0.08, light: 0.0, screen: 0.02 } }, ceiling: { troughs: 3, troughW: 0.36, beamStep: 2.5, lightKey: "emitWhiteDim" } },
  D: { wall: { panelW: 1.7, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impGreyDark, altChance: 0.3, features: { vent: 0.15, equipment: 0.06, conduit: 0.15, light: 0.0, screen: 0.02 } }, ceiling: { troughs: 1, troughW: 0.5, beamStep: 2.0, lightKey: "emitAmberDim" } },
  E: { wall: { panelW: 1.7, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impWhite, altChance: 0.4, features: { vent: 0.1, equipment: 0.08, conduit: 0.1, light: 0.0, screen: 0.02 } }, ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.0, lightKey: "emitWhiteDim" } },
};

export function buildLobby(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const deck = room.deck;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const accentHex = new THREE.Color(room.accent || "#4f8dff");
  const { inlayKey, indKey } = ensureLobbyMaterials(kit.materials, deck, "#" + accentHex.getHexString());
  kit.noShadowKeys.add(inlayKey);
  const shell = SHELL[deck] || SHELL.A;
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 500 + deck.charCodeAt(0),
    wall: shell.wall,
    floor: { lane: false },
    ceiling: shell.ceiling,
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x

  // --- lift doors on the S wall (shared): accent surround, header with the lit deck indicator, call panel
  const lifts = ctx.doors.filter((dd) => dd.type === "lift");
  for (const lf of lifts) liftSurround(kit, S, hx - lf.lx, lf.w, lf.h, accentKey, indKey);
  const liftLights = (intensity, color = accentHex.getHex()) => {
    for (const lf of lifts) kit.light({ type: "point", pos: [lf.lx, 2.9, hz - 1.3], color, intensity, distance: 10, priority: 0.44 - (lf.lx > 0 ? 0.005 : 0) });
  };
  const env = { kit, ctx, room, walls, N, S, hx, hz, h, accentKey, accentHex, inlayKey, lifts, liftLights };
  ({ A: deckA, B: deckB, C: deckC, D: deckD, E: deckE }[deck] || deckA)(env);
}

// ---------------------------------------------------------------------------
// Deck A — bridge deck: honour guard at the bridge door, crest medallion, notice boards, cool white
// ---------------------------------------------------------------------------
function deckA({ kit, N, S, hx, hz, h, accentKey, accentHex, inlayKey, lifts, liftLights }) {
  // honour-guard alcoves flanking the bridge blast door, sentry post watching the approach
  for (const s of [-1, 1]) guardAlcove(N, hx + s * 3.75, { accentKey, ledKey: "emitGreen" });
  for (const s of [-1, 1]) noticeBoard(N, hx + s * 8.75, 1.95, 3.0, 1.4, { accentKey, seed: s > 0 ? 11 : 12, screen: s > 0 ? "scrWhite1" : "scrBlue2" });
  sentryPost(kit, 7.0, -3.3, Math.PI / 2, { accentKey, screen: "scrBlue3" });
  // crest medallion at the bridge threshold: gloss disc, white ring, the cog
  kit.cyl("impTrim", 0, 0.003, -3.9, 1.55, 0.006, "y", { color: BLK, segments: 40 });
  kit.cyl("emitWhiteDim", 0, 0.004, -3.9, 1.6, 0.006, "y", { segments: 40, uv: "keep" });
  kit.cyl("impGloss", 0, 0.0055, -3.9, 1.5, 0.006, "y", { segments: 40 });
  kit.add("decalImp", new THREE.PlaneGeometry(2.8, 2.8).rotateX(-Math.PI / 2), { pos: [0, 0.012, -3.9], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
  deckInlay(kit, 0, 0.4, inlayKey, accentKey, 1.0);
  // lift thresholds: gloss plates edged in white
  for (const lf of lifts) {
    kit.box("impGloss", lf.lx, 0.005, hz - 0.85, lf.w + 0.6, 0.008, 1.5);
    for (const s of [-1, 1]) kit.box("emitWhiteDim", lf.lx + s * (lf.w / 2 + 0.33), 0.006, hz - 0.85, 0.04, 0.008, 1.5, { uv: "keep" });
  }
  // the crest repeats on the lift wall between the corridor door and the starboard lift's call panel
  crestPlate(S, hx - 4.4, accentKey);
  // lights: cool white pendant over the inlay, white downlights in the alcove soffits, the deck accent
  // at the lifts, a small fill at the corridor door
  pendant(kit, 0, h, 0.4, accentKey);
  kit.light({ type: "point", pos: [0, h - 1.8, 0.4], color: 0xe6eeff, intensity: lux(h - 1.8, 6.0), distance: 17, priority: 0.5 });
  for (const s of [-1, 1]) kit.light({ type: "point", pos: [s * 3.75, 2.3, -hz + 0.6], color: 0xf2f6ff, intensity: 5.5, distance: 8, priority: 0.42 });
  liftLights(7.0);
  kit.light({ type: "point", pos: [0, h - 0.6, 4.4], color: 0xdfe8ff, intensity: lux(h - 0.6, 2.6), distance: 13, priority: 0.36 });
}

// ---------------------------------------------------------------------------
// Deck B — officers: memorial walls, bench rows, gloss runner with brass rails, warm dim cans
// ---------------------------------------------------------------------------
function deckB({ kit, N, S, walls, hx, hz, h, accentKey, accentHex, inlayKey, lifts, liftLights }) {
  memorialWall(N, hx - 10.6, hx - 2.4, { accentKey, seed: 21, crestEnd: 1 });
  memorialWall(N, hx + 2.4, hx + 10.6, { accentKey, seed: 22, crestEnd: -1 });
  for (const s of [-1, 1]) benchRow(kit, s * 6.3, -2.3, 2, 0, { accentKey });
  // runner from the corridor door to the observation door, interrupted by the inlay disc
  glossRunner(kit, -0.9, 1.7, 0.9, hz - 0.3);
  glossRunner(kit, -0.9, -hz + 0.3, 0.9, -2.9);
  deckInlay(kit, 0, -0.6, inlayKey, accentKey, 1.0, { disc: "impGloss", discColor: 0xffffff });
  for (const lf of lifts) {
    kit.box("impGloss", lf.lx, 0.004, hz - 0.85, lf.w + 0.2, 0.008, 1.5);
    for (const s of [-1, 1]) kit.box("impMetal", lf.lx + s * (lf.w / 2 + 0.13), 0.005, hz - 0.85, 0.06, 0.012, 1.5, { color: PALETTE.brass, texel: 2 });
  }
  // framed crest on the lift wall, sconces on the side walls
  framedPanel(S, hx - 4.4, 2.3, 1.9, 2.1, { glow: "emitAmberDim" });
  S.collider(hx - 4.4 - 1.1, hx - 4.4 + 1.1, 1.1, 3.6, 0, 0.16, "frame");
  for (const side of ["W", "E"]) for (const u of [hz - 3.0, hz + 1.0]) sconce(walls[side].frame, u, 2.4, "emitAmberDim", 0.6);
  // lights: three warm cans (memorial side pair and one over the inlay), the accent at the lifts, a
  // warm fill at the corridor door
  for (const [x, z] of [[-6.3, -2.8], [6.3, -2.8], [0, 0.2]]) {
    warmCan(kit, x, h, z, "emitAmberDim");
    kit.light({ type: "point", pos: [x, h - 0.7, z], color: 0xffc890, intensity: lux(h - 0.7, x === 0 ? 4.0 : 3.6), distance: 12, priority: 0.5 - Math.abs(x) * 0.001 });
  }
  liftLights(4.5);
  kit.light({ type: "point", pos: [0, h - 0.6, 4.4], color: 0xffd8b0, intensity: lux(h - 0.6, 2.4), distance: 11, priority: 0.36 });
}

// ---------------------------------------------------------------------------
// Deck C — crew: weapons-check booth, helmet rack, duty roster, hazard borders, twin bar fixtures
// ---------------------------------------------------------------------------
function deckC({ kit, N, S, walls, hx, hz, h, accentKey, accentHex, inlayKey, lifts, liftLights }) {
  checkBooth(N, hx, 5.6, h, { accentKey });
  helmetRack(N, hx - 7.7, { accentKey, W: 3.0 });
  rosterBoard(N, hx + 7.7, 2.05, 3.4, 1.9, { accentKey, screens: ["scrGreen0", "scrGreen1", "scrWhite0", "scrGreen2", "scrWhite1", "scrGreen3"] });
  // waiting benches along the side walls, facing in
  for (const s of [-1, 1]) for (const z of [-2.6, 1.4]) bench(kit, s * 11.6, z, 2.4, s < 0 ? -Math.PI / 2 : Math.PI / 2, { pad: "rubber", padColor: PALETTE.impGreyDark, accentKey, tag: "bench" });
  // hazard marking: borders at both lift thresholds, a bar line along the counter front
  for (const lf of lifts) hazardBorder(kit, lf.lx - 1.6, hz - 2.3, lf.lx + 1.6, hz - 0.05, 0.22);
  hazardBars(kit, -2.6, -hz + 1.12, 2.6, -hz + 1.12, { w: 0.24 });
  deckInlay(kit, 0, 0.0, inlayKey, accentKey, 0.9);
  // lift wall: hazard band with a restricted stencil where the other decks carry the crest
  signPlate(S, hx - 4.4, 2.35, 2.6, 1.0, { accentKey, decal: IMP_DECAL.glyphs3, decalW: 1.6, decalH: 0.3, hazard: true, badge: IMP_DECAL.restricted });
  // lights: two linear bar fixtures across the room, the booth's own lamp, the accent at the lifts,
  // a small green wash on the roster board
  for (const s of [-1, 1]) {
    barFixture(kit, s * 4.6, h - 0.02, -1.2, 3.2, "x", "emitWhiteSoft");
    kit.light({ type: "point", pos: [s * 4.6, h - 0.5, -1.2], color: 0xf4f8ff, intensity: lux(h - 0.5, 3.0), distance: 13, priority: 0.5 - (s > 0 ? 0.005 : 0) });
  }
  kit.light({ type: "point", pos: [0, 2.6, -hz + 0.5], color: 0xfff0d0, intensity: 3.0, distance: 5, priority: 0.42 });
  liftLights(5.5);
  kit.light({ type: "point", pos: [7.7, 3.2, -hz + 1.0], color: 0xd0ffe0, intensity: 2.0, distance: 5, priority: 0.34 });
}

// ---------------------------------------------------------------------------
// Deck D — engineering: pipe manifold, tool lockers, vent stack, lit gratings, caged industrial lamps
// ---------------------------------------------------------------------------
function deckD({ kit, N, S, walls, hx, hz, h, accentKey, accentHex, inlayKey, lifts, liftLights }) {
  pipeManifold(N, hx - 9.4, hx - 0.8, h, { risers: 5, seed: 41 });
  lockerBank(N, hx + 1.6, hx + 8.6, { accentKey, openIndex: 2 });
  ventStack(kit, 10.9, -hz + 1.1, h, ["-x", "+z"], { glow: "emitAmberDim", lampKey: "emitRedImp" });
  gratingStrip(kit, -9.6, -hz + 1.0, -0.6, -hz + 1.8, { glow: "emitAmberDim" });
  gratingStrip(kit, -0.55, 1.4, 0.55, hz - 1.4, { glow: "emitAmberDim" });
  for (const lf of lifts) gratingStrip(kit, lf.lx - 1.2, hz - 1.9, lf.lx + 1.2, hz - 0.25, { glow: "emitAmberDim", bars: false });
  deckInlay(kit, 0, -0.8, inlayKey, accentKey, 1.0, { disc: "impMetalRough" });
  directoryColumn(kit, -7.4, -1.8, "D", accentKey);
  // ceiling conduits along the port side, warning lamps and a pipe on the side walls (the east wall's
  // forward lamp sits clear of the vent stack)
  conduitRun(kit, [-3.4, -3.2, -2.98], h - 0.36, -hz + 0.6, hz - 0.6, { clampStep: 2.4 });
  for (const side of ["W", "E"]) {
    const F = walls[side].frame;
    warningLampF(F, side === "W" ? hz - 4.6 : hz - 2.4, 3.3, "emitRedImp", 0.09);
    warningLampF(F, hz + 4.6, 3.3, "emitAmber", 0.09);
    pipeWall(F, 1.0, 2 * hz - 1.0, 2.75, 0.07, { color: PALETTE.impGreyDark, clampStep: 2.4, flangeStep: 4.8 });
  }
  // lift wall: power stencil and a caged lamp where the other decks carry the crest
  signPlate(S, hx - 4.4, 2.5, 2.4, 0.9, { accentKey, decal: IMP_DECAL.glyphs3, decalW: 1.4, decalH: 0.28, badge: IMP_DECAL.power });
  warningLampF(S, hx - 4.4, 3.45, "emitAmber", 0.09);
  // lights: two caged high-bay lamps, an amber wash on the manifold, red at the vent stack, the accent
  // at the lifts (no pendant on this deck)
  for (const s of [-1, 1]) {
    highBayLamp(kit, s * 5.5, h - 0.5, -1.0, "emitAmberDim");
    kit.light({ type: "point", pos: [s * 5.5, h - 1.1, -1.0], color: 0xffc890, intensity: lux(h - 1.1, 4.6), distance: 14, priority: 0.5 - (s > 0 ? 0.005 : 0) });
  }
  kit.light({ type: "point", pos: [-5.0, 3.3, -hz + 1.6], color: 0xffa040, intensity: 7.0, distance: 8, priority: 0.42 });
  kit.light({ type: "point", pos: [10.2, 3.2, -hz + 1.9], color: 0xff4030, intensity: 2.5, distance: 5, priority: 0.34 });
  liftLights(7.0);
}

// ---------------------------------------------------------------------------
// Deck E — hangar: fuel lines, cargo crates, bay status board, painted lane to the lifts, work lights
// ---------------------------------------------------------------------------
function deckE({ kit, N, S, walls, hx, hz, h, accentKey, accentHex, inlayKey, lifts, liftLights }) {
  fuelLine(N, hx - 10.8, hx - 2.6, 1.45, { stations: 3, seed: 61 });
  bayStatusBoard(N, hx + 5.4, 2.15, 4.2, 1.8, { accentKey });
  crateCorner(kit, 10.7, -hz + 1.1, { seed: 63 });
  droidAlcove(kit, walls.W.frame, hz + 2.0, accentKey);
  // painted lane: from the hangar door into the lobby, then across to both lifts
  deckLane(kit, -1.1, -hz + 0.4, 1.1, -2.0, { arrows: [{ at: -3.9, yaw: Math.PI }] });
  deckLane(kit, -10.6, hz - 3.1, 10.6, hz - 0.9, { arrows: [{ at: -5.0, yaw: Math.PI / 2 }, { at: 5.0, yaw: -Math.PI / 2 }], size: 1.4 });
  deckInlay(kit, 0, 0.6, inlayKey, accentKey, 1.0);
  // work lights on tripods, aimed at the fuel station and at the cargo
  workLight(kit, -7.0, -1.6, 0.0, { key: "emitWhiteSoft" });
  workLight(kit, 6.2, -1.2, -Math.PI / 2, { key: "emitWhiteSoft" });
  // lift wall: hangar deck sign between the lifts (this lobby has no corridor door)
  signPlate(S, hx, 2.5, 3.2, 1.1, { accentKey, decal: IMP_DECAL.glyphs3, decalW: 2.0, decalH: 0.34, hazard: true, badge: IMP_DECAL.hazard });
  // lights: the two work lights, a high bay lamp over the inlay, the accent at the lifts, a warm fill
  // at the hangar door
  kit.light({ type: "point", pos: [-7.0, 2.3, -1.9], color: 0xfff2e0, intensity: 8.0, distance: 9, priority: 0.46 });
  kit.light({ type: "point", pos: [6.5, 2.3, -1.2], color: 0xfff2e0, intensity: 8.0, distance: 9, priority: 0.455 });
  highBayLamp(kit, 0, h - 0.5, 0.6, "emitAmberDim");
  kit.light({ type: "point", pos: [0, h - 1.1, 0.6], color: 0xffc080, intensity: lux(h - 1.1, 4.0), distance: 14, priority: 0.5 });
  liftLights(6.5);
  // fill inside the hangar door, kept low and away from the lintel panel so the header does not bloom
  kit.light({ type: "point", pos: [0, 2.2, -hz + 3.4], color: 0xffe8d0, intensity: 6.0, distance: 8, priority: 0.36 });
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------
/** Accent surround around a lift door (frame ring drawn by the door system), header with the lit deck indicator, call panel. */
function liftSurround(kit, F, u, dw, dh, accentKey, indKey) {
  const fw = dw / 2 + 0.3; // door frame ring outer half-width (t = 0.3)
  const ringTop = dh + 0.3;
  const sideW = 0.42;
  // outer black surround (proud 0.06) with the accent band just outside the frame ring, and a thin
  // white strip hugging the ring itself (jambs and head) so the door frame reads lit
  for (const s of [-1, 1]) {
    F.box("impTrim", u + s * (fw + 0.06 + sideW / 2), (ringTop + 0.72) / 2, 0.03, sideW, ringTop + 0.72, 0.06, { color: PALETTE.impBlack, texel: 1 });
    F.box(accentKey, u + s * (fw + 0.13), (ringTop + 0.14) / 2, 0.062, 0.08, ringTop + 0.14, 0.012, { uv: "keep" });
    F.box("emitWhiteDim", u + s * (fw + 0.045), ringTop / 2, 0.062, 0.025, ringTop, 0.012, { uv: "keep" });
  }
  F.box("emitWhiteDim", u, ringTop + 0.015, 0.062, 2 * fw + 0.115, 0.025, 0.012, { uv: "keep" });
  // header: black box over the ring, indicator screen, accent line under it, turbolift glyph
  F.box("impTrim", u, ringTop + 0.37, 0.05, 2 * (fw + 0.06 + sideW), 0.72, 0.1, { color: PALETTE.impBlack, texel: 1 });
  F.box(accentKey, u, ringTop + 0.07, 0.062, 2 * (fw + 0.13) + 0.08, 0.08, 0.012, { uv: "keep" });
  F.box("impGloss", u, ringTop + 0.4, 0.105, 1.16, 0.5, 0.012);
  F.screen(indKey, u, ringTop + 0.4, 0.115, 1.06, 0.4);
  F.decal(IMP_DECAL.turbolift, u - fw - 0.04, ringTop + 0.4, 0.106, 0.42);
  F.decal(IMP_DECAL.arrowUp, u + fw + 0.04, ringTop + 0.4, 0.106, 0.36);
  // call panel beside the door: black plate, two lit buttons, mini readout
  const cu = u + fw + 0.06 + sideW + 0.34;
  F.box("impTrim", cu, 1.3, 0.04, 0.36, 0.66, 0.08, { color: PALETTE.impBlack, texel: 1 });
  F.box("impMetal", cu, 1.3, 0.082, 0.3, 0.6, 0.012, { color: PALETTE.impCharcoal, texel: 2 });
  F.screen("scrBlue3", cu, 1.48, 0.09, 0.22, 0.14);
  F.box(accentKey, cu, 1.24, 0.095, 0.1, 0.07, 0.014);
  F.box("emitRedImp", cu, 1.1, 0.095, 0.1, 0.07, 0.014);
  F.decal(IMP_DECAL.turbolift, cu, 1.62, 0.09, 0.18);
  // collide the side surrounds, the call panel and the header only: the 2.2 m opening must stay clear
  F.collider(u - fw - 0.06 - sideW, u - fw, 0, ringTop + 0.75, 0, 0.12, "liftframe");
  F.collider(u + fw, cu + 0.2, 0, ringTop + 0.75, 0, 0.12, "liftframe");
  F.collider(u - fw, u + fw, ringTop, ringTop + 0.75, 0, 0.12, "liftframe");
}

/** Crest plate on a wall: black backing, dark grey field, the cog, accent lines above and below. */
function crestPlate(F, cu, accentKey) {
  F.box("impTrim", cu, 2.3, 0.05, 3.0, 2.9, 0.08, { color: PALETTE.impBlack, texel: 1 });
  F.box("impMetal", cu, 2.3, 0.095, 2.8, 2.7, 0.012, { color: PALETTE.impGreyDark, texel: 1 });
  F.decal(IMP_DECAL.cog, cu, 2.34, 0.105, 2.3);
  F.box(accentKey, cu, 2.3 - 1.4, 0.1, 2.4, 0.03, 0.012, { uv: "keep" });
  F.box(accentKey, cu, 2.3 + 1.4, 0.1, 2.4, 0.03, 0.012, { uv: "keep" });
  F.collider(cu - 1.5, cu + 1.5, 0.8, 3.8, 0, 0.11, "crest");
}

/**
 * Pendant over the inlay: slim stem, black disc canopy, accent ring and a warm lens on the underside.
 * The ring and lens run at half the kit emissive: a fixture, not the brightest surface in the room.
 */
function pendant(kit, x, h, z, accentKey) {
  const ringKey = `lobby_ring_${accentKey}`;
  if (!kit.materials[ringKey]) {
    const m = kit.materials[accentKey].clone();
    m.emissiveIntensity *= 0.5;
    kit.materials[ringKey] = setDomain(m, "interior");
  }
  if (!kit.materials.lobby_lensHalf) {
    const m = kit.materials.emitWhiteDim.clone();
    m.emissiveIntensity *= 0.5;
    kit.materials.lobby_lensHalf = setDomain(m, "interior");
  }
  kit.cyl("impMetal", x, h - 0.4, z, 0.03, 0.8, "y", { color: PALETTE.impGreyDark, segments: 8 });
  kit.cyl("impTrim", x, h - 0.86, z, 0.62, 0.12, "y", { color: PALETTE.impBlack, segments: 24, texel: 1 });
  kit.cyl(ringKey, x, h - 0.925, z, 0.66, 0.012, "y", { segments: 24, uv: "keep" });
  kit.cyl("impMetal", x, h - 0.935, z, 0.5, 0.012, "y", { color: PALETTE.impCharcoal, segments: 24 });
  kit.cyl("lobby_lensHalf", x, h - 0.947, z, 0.4, 0.012, "y", { segments: 24, uv: "keep" });
}

/** Free-standing deck directory: plinth, black column, screen listing the decks, lamp per deck, lit cap. */
function directoryColumn(kit, x, z, deck, accentKey) {
  const f = propFrame(kit, x, 0, z, 0); // N = +z: the face toward the lifts / the spawn
  const W = 0.96;
  const D = 0.5;
  const H = 2.55;
  f.box("impMetal", 0, 0.07, 0, W + 0.24, 0.14, D + 0.24, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impTrim", 0, 0.14 + (H - 0.14) / 2, 0, W, H - 0.14, D, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0, H + 0.03, 0, W + 0.06, 0.06, D + 0.06, { color: PALETTE.impCharcoal, texel: 1 });
  f.box(accentKey, 0, H - 0.02, 0, W + 0.02, 0.03, D + 0.02, { uv: "keep" });
  // face: charcoal inset, screen with the deck plan, deck list with a lamp per deck (this deck white)
  f.box("impMetal", 0, H * 0.52, D / 2 + 0.006, W - 0.16, H * 0.82, 0.012, { color: PALETTE.impCharcoal, texel: 2 });
  f.box("impGloss", 0, 1.78, D / 2 + 0.014, W - 0.3, 0.96, 0.012);
  f.screen("scrBlue1", 0, 1.78, D / 2 + 0.024, W - 0.4, 0.86);
  for (let i = 0; i < DECK_ORDER.length; i++) {
    const on = DECK_ORDER[i] === deck;
    const v = 1.16 - i * 0.17;
    f.box(on ? "emitWhite" : accentKey, -W / 2 + 0.16, v, D / 2 + 0.024, 0.08, 0.06, 0.012);
    f.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1, IMP_DECAL.glyphs2][i], -W / 2 + 0.36, v, D / 2 + 0.024, 0.14);
    f.box(on ? "impGloss" : "impTrim", 0.14, v, D / 2 + 0.02, 0.38, 0.1, 0.006, on ? {} : { color: PALETTE.impBlack });
  }
  f.decal(IMP_DECAL.turbolift, 0, 0.42, D / 2 + 0.02, 0.3);
  // back and sides: vent slots and a maintenance hatch so it is not a blank block from behind
  for (let k = 0; k < 5; k++) f.box("impTrim", 0, 0.5 + k * 0.08, -D / 2 - 0.006, W * 0.6, 0.025, 0.012, { color: PALETTE.impBlack });
  f.box("impMetal", 0, 1.7, -D / 2 - 0.006, W * 0.7, 0.9, 0.012, { color: PALETTE.impCharcoal, texel: 2 });
  f.box(accentKey, 0, 1.2, -D / 2 - 0.014, W * 0.5, 0.02, 0.01);
  f.collider(-W / 2 - 0.12, W / 2 + 0.12, 0, H + 0.06, -D / 2 - 0.12, D / 2 + 0.12, "directory");
}

/** Droid alcove on a wall frame: black housing proud of the wall, lit inside, a mouse droid on charge. */
function droidAlcove(kit, F, u, accentKey) {
  const W = 1.9;
  const H = 2.3;
  const D = 0.6;
  // housing: back panel, cheeks, lintel with the light strip on its underside, plinth
  F.box("impMetal", u, H / 2, 0.02, W - 0.24, H, 0.03, { color: PALETTE.impCharcoal, texel: 1 });
  for (const s of [-1, 1]) F.box("impTrim", u + s * (W / 2 - 0.06), H / 2, D / 2, 0.12, H, D, { color: PALETTE.impBlack, texel: 1 });
  F.box("impTrim", u, H - 0.1, D / 2, W, 0.2, D, { color: PALETTE.impBlack, texel: 1 });
  F.box("impMetal", u, H - 0.205, D / 2 - 0.02, W - 0.3, 0.012, D - 0.2, { color: PALETTE.impCharcoal });
  F.box(accentKey, u, H - 0.212, D / 2 + 0.06, W - 0.5, 0.008, 0.08, { uv: "keep" });
  F.box("impMetal", u, 0.04, D / 2 - 0.04, W - 0.24, 0.08, D - 0.08, { color: PALETTE.impCharcoal, texel: 1 });
  F.box("chevronY", u, 0.085, D / 2 - 0.04, W - 0.4, 0.01, D - 0.2, { texel: 1.2 });
  // wall plaque over the alcove and a service glyph on the back panel
  F.box("impTrim", u, H + 0.28, 0.03, 0.9, 0.34, 0.06, { color: PALETTE.impBlack });
  F.box("impGloss", u, H + 0.28, 0.062, 0.8, 0.26, 0.012);
  F.decal(IMP_DECAL.power, u - 0.22, H + 0.28, 0.07, 0.22);
  F.decal(IMP_DECAL.glyphs2, u + 0.16, H + 0.28, 0.07, 0.34, { h: 0.18 });
  F.decal(IMP_DECAL.restricted, u, 1.6, 0.04, 0.5);
  // charging post on the back panel with a cable to the droid
  F.box("impTrim", u - 0.55, 0.55, 0.12, 0.26, 0.9, 0.2, { color: PALETTE.impBlack, texel: 1 });
  F.box("impMetal", u - 0.55, 0.75, 0.225, 0.2, 0.32, 0.012, { color: PALETTE.impCharcoal });
  F.box("emitGreen", u - 0.55, 0.84, 0.235, 0.06, 0.04, 0.012);
  F.box(accentKey, u - 0.55, 0.72, 0.235, 0.12, 0.02, 0.012);
  F.cylN("impMetal", u - 0.55, 0.42, 0.34, 0.03, 0.2, { color: PALETTE.impGreyDark, segments: 8 });
  const cableA = F.pos(u - 0.55, 0.42, 0.44);
  const cableB = F.pos(u + 0.02, 0.2, 0.36);
  const dir = cableB.clone().sub(cableA);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  kit.add("impMetal", new THREE.CylinderGeometry(0.022, 0.022, dir.length(), 8), { pos: cableA.clone().add(cableB).multiplyScalar(0.5).toArray(), quat: q, color: PALETTE.impCharcoal, uv: "scale", uvScale: [0.2, 1] });
  // mouse droid: low black chassis, sloped nose, sensor dome, two lamps, tread skirts
  const dx = u + 0.25;
  F.box("impTrim", dx, 0.06, 0.34, 0.34, 0.06, 0.52, { color: PALETTE.impBlack, texel: 1 });
  F.box("impTrim", dx, 0.2, 0.34, 0.3, 0.22, 0.46, { color: PALETTE.impBlack, texel: 1 });
  F.box("impMetal", dx, 0.2, 0.34, 0.31, 0.16, 0.42, { color: PALETTE.impCharcoal, texel: 1 });
  F.box("impTrim", dx, 0.33, 0.3, 0.28, 0.04, 0.34, { color: PALETTE.impBlack });
  F.add("impGloss", new THREE.SphereGeometry(0.06, 12, 8), dx, 0.37, 0.24);
  F.box("impMetal", dx, 0.31, 0.5, 0.3, 0.02, 0.12, { color: PALETTE.impGrey });
  F.box(accentKey, dx - 0.1, 0.26, 0.575, 0.05, 0.03, 0.012);
  F.box("emitRedImp", dx + 0.1, 0.26, 0.575, 0.05, 0.03, 0.012);
  for (let k = 0; k < 3; k++) F.box("impTrim", dx + 0.16, 0.14 + k * 0.05, 0.34, 0.012, 0.02, 0.4, { color: PALETTE.impBlack });
  F.cylN("impMetal", dx, 0.42, 0.34, 0.012, 0.16, { color: PALETTE.impGrey, segments: 6 });
  F.box(accentKey, dx, 0.51, 0.34, 0.03, 0.03, 0.03);
  F.collider(u - W / 2, u + W / 2, 0, H + 0.5, 0, D + 0.02, "alcove");
}
