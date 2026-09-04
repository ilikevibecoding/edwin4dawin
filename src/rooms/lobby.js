// Turbolift lobby (one per deck): the two lift doors on the aft wall are framed in the deck accent
// with a lit deck indicator over each and a call panel beside; a deck-letter inlay in the middle of
// the floor, waiting benches on the forward wall, a free-standing deck directory column, a droid
// alcove with a parked mouse droid on charge. One warm key over the inlay plus the accent at the
// lifts — not an evenly lit box.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { DECK_ORDER } from "../spec.js";
import { bench, propFrame } from "./deck_b_props.js";
import { ensureLobbyMaterials } from "../textures_lobby.js";

export function buildLobby(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const accentHex = new THREE.Color(room.accent || "#4f8dff");
  const { inlayKey, indKey } = ensureLobbyMaterials(kit.materials, room.deck, "#" + accentHex.getHexString());
  kit.noShadowKeys.add(inlayKey);
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 500 + room.deck.charCodeAt(0),
    // narrow panels (1.25 m) with almost no wall features: the lobby is dressed by its fittings
    wall: { panelW: 1.25, features: { vent: 0.04, equipment: 0.04, conduit: 0.03, light: 0.0, screen: 0.04 } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.0 },
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x

  // --- lift doors on the S wall: accent surround, header with the lit deck indicator, call panel
  const lifts = ctx.doors.filter((dd) => dd.type === "lift");
  for (const lf of lifts) {
    const u = hx - lf.lx;
    liftSurround(kit, S, u, lf.w, lf.h, accentKey, indKey);
    // chevron mat leading to the door
    kit.box("chevronY", lf.lx, 0.005, hz - 1.8, lf.w + 0.4, 0.008, 1.4, { texel: 1.2 });
  }

  // --- the crest repeats on the lift wall (between the corridor door and the starboard lift's call panel)
  {
    const cu = hx - 4.4;
    S.box("impTrim", cu, 2.3, 0.05, 3.0, 2.9, 0.08, { color: PALETTE.impBlack, texel: 1 });
    S.box("impMetal", cu, 2.3, 0.095, 2.8, 2.7, 0.012, { color: PALETTE.impGreyDark, texel: 1 });
    S.decal(IMP_DECAL.cog, cu, 2.34, 0.105, 2.3);
    S.box(accentKey, cu, 2.3 - 1.4, 0.1, 2.4, 0.03, 0.012, { uv: "keep" });
    S.box(accentKey, cu, 2.3 + 1.4, 0.1, 2.4, 0.03, 0.012, { uv: "keep" });
    S.collider(cu - 1.5, cu + 1.5, 0.8, 3.8, 0, 0.11, "crest");
  }

  // --- deck-letter inlay in the middle of the floor (charcoal disc with the painted decal)
  const iz = -0.6;
  kit.cyl("impMetal", 0, 0.003, iz, 2.05, 0.006, "y", { color: PALETTE.impCharcoal, segments: 48 });
  kit.cyl(accentKey, 0, 0.004, iz, 2.12, 0.006, "y", { segments: 48, uv: "keep" });
  kit.cyl("impMetal", 0, 0.0055, iz, 2.05, 0.005, "y", { color: PALETTE.impCharcoal, segments: 48 });
  kit.add(inlayKey, new THREE.PlaneGeometry(3.9, 3.9).rotateX(-Math.PI / 2), { pos: [0, 0.012, iz], uv: "keep" });

  // --- waiting benches on the forward wall either side of the door, facing the lifts
  for (const s of [-1, 1]) bench(kit, s * 4.9, -hz + 0.45, 2.6, Math.PI, { pad: "rubber", padColor: PALETTE.impGreyDark, accentKey, tag: "bench" });

  // --- deck directory: free-standing column facing the lifts
  directoryColumn(kit, -7.4, -2.6, room.deck, accentKey);

  // --- droid alcove on the forward wall (E side): housing proud of the wall, mouse droid on charge
  droidAlcove(kit, N, hx + 8.0, accentKey);

  // wall gear on the W wall (the E wall keeps the shell's own features)
  impWallGear(walls.W.frame, hz - 3.2, 1.5, { seed: 9, accentKey });

  // --- lights: one warm key over the inlay, the deck accent at the lift wall, a small cool fill at
  // the forward door; the corners fall off on purpose
  // pendant over the inlay: slim stem, black disc canopy, warm lens on the underside — the key light
  // hangs well below the ceiling so the slab above it stays dark instead of blooming
  kit.cyl("impMetal", 0, h - 0.4, iz, 0.03, 0.8, "y", { color: PALETTE.impGreyDark, segments: 8 });
  kit.cyl("impTrim", 0, h - 0.86, iz, 0.62, 0.12, "y", { color: PALETTE.impBlack, segments: 24, texel: 1 });
  kit.cyl(accentKey, 0, h - 0.925, iz, 0.66, 0.012, "y", { segments: 24, uv: "keep" });
  kit.cyl("impMetal", 0, h - 0.935, iz, 0.5, 0.012, "y", { color: PALETTE.impCharcoal, segments: 24 });
  kit.cyl("emitWhiteDim", 0, h - 0.947, iz, 0.4, 0.012, "y", { segments: 24, uv: "keep" });
  kit.light({ type: "point", pos: [0, h - 1.8, iz], color: 0xffdcb4, intensity: lux(h - 1.8, 3.0), distance: 15, priority: 0.5 });
  // deck accent at each lift so the framed doors read from across the lobby
  for (const lf of lifts) kit.light({ type: "point", pos: [lf.lx, 2.9, hz - 1.3], color: accentHex.getHex(), intensity: 7.0, distance: 9, priority: 0.44 - (lf.lx > 0 ? 0.005 : 0) });
  // small warm wash on the crest plate
  kit.light({ type: "point", pos: [4.4, 3.3, hz - 1.1], color: 0xffe2c0, intensity: 3.6, distance: 6, priority: 0.38 });
  kit.light({ type: "point", pos: [0, h - 0.6, -4.4], color: 0xdfe8ff, intensity: lux(h - 0.6, 1.1), distance: 10, priority: 0.36 });
}

/** Accent surround around a lift door (frame ring drawn by the door system), header with the lit deck indicator, call panel. */
function liftSurround(kit, F, u, dw, dh, accentKey, indKey) {
  const fw = dw / 2 + 0.3; // door frame ring outer half-width (t = 0.3)
  const ringTop = dh + 0.3;
  const sideW = 0.42;
  // outer black surround (proud 0.06) with the accent band just outside the frame ring
  for (const s of [-1, 1]) {
    F.box("impTrim", u + s * (fw + 0.06 + sideW / 2), (ringTop + 0.72) / 2, 0.03, sideW, ringTop + 0.72, 0.06, { color: PALETTE.impBlack, texel: 1 });
    F.box(accentKey, u + s * (fw + 0.13), (ringTop + 0.14) / 2, 0.062, 0.08, ringTop + 0.14, 0.012, { uv: "keep" });
  }
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
