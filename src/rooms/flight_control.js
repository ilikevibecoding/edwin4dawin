// Hangar flight control (workstream HANGAR): a 24 × 4 × 14 m booth set into the main hangar's E wall,
// 16 m above the deck (reached by the E stair tower and its catwalk). The W wall facing the hangar is
// a continuous window strip with real openings that match the holes cut in the hangar's E wall, so the
// controllers (and the player) look down onto the deck. Two tiers of consoles face the window, a big
// status board covers the E wall, a holo table sits on the upper tier. Room-local coordinates.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { roomWalls, openingsFor, impWall, impCeiling, impFloor, impConsole, impChair, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { HG_DECAL, hgNumber, hgDecalRect } from "../textures_hangar.js";
import { hgSetup, cutSpans, hgBeacons } from "./hangar_kit.js";

/** Window wall: slab strips around the openings, dado under the sills, frames, mullions, glass, header. */
function windowWall(frame, length, height, openings, opts = {}) {
  const { depth = 0.4, accentKey = "emitBlue", tag = "fcW" } = opts;
  const ops = openings.map((o) => ({ ...o, u0: Math.max(0, o.u0), u1: Math.min(length, o.u1), v0: Math.max(0, o.v0), v1: Math.min(height, o.v1) }));
  // backing slab as strips with their own solid v-intervals (drives the colliders too)
  const edges = [...new Set([0, length, ...ops.flatMap((o) => [o.u0, o.u1])])].sort((a, b) => a - b);
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    if (b - a < 0.01) continue;
    const cuts = ops.filter((o) => o.u0 < b - 1e-6 && o.u1 > a + 1e-6).map((o) => [o.v0, o.v1]);
    for (const [va, vb] of cutSpans([[0, height]], cuts)) {
      if (vb - va < 0.01) continue;
      frame.box("impTrim", (a + b) / 2, (va + vb) / 2, -depth / 2 - 0.02, b - a, vb - va, depth, { color: PALETTE.impBlack, texel: 0.5 });
      frame.collider(a, b, va, vb, -depth, 0.3, tag);
    }
  }
  const windows = ops.filter((o) => o.v0 > 0.3);
  const doors = ops.filter((o) => o.v0 <= 0.3);
  // header band (above the windows) with a white light channel, kick along the floor
  const vTop = Math.max(...windows.map((o) => o.v1));
  frame.box("impTrim", length / 2, (vTop + height) / 2, 0.06, length, height - vTop, 0.12, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", length / 2, vTop + 0.22, 0.13, length - 0.4, 0.1, 0.03, { color: PALETTE.impCharcoal });
  frame.box("emitWhiteSoft", length / 2, vTop + 0.22, 0.15, length - 0.6, 0.04, 0.012, { uv: "keep" });
  for (const w of windows) {
    const cu = (w.u0 + w.u1) / 2;
    const cv = (w.v0 + w.v1) / 2;
    const ww = w.u1 - w.u0;
    const wh = w.v1 - w.v0;
    // dado under the sill: pale panel with a black kick and an inset conduit run
    frame.box("impTrim", cu, 0.16, 0.04, ww + 0.3, 0.32, 0.08, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impPanel1", cu, (0.32 + w.v0 - 0.1) / 2, 0.03, ww + 0.3, w.v0 - 0.42, 0.06, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    frame.box("impTrim", cu, w.v0 - 0.06, 0.12, ww + 0.3, 0.12, 0.24, { color: PALETTE.impBlack, texel: 1 }); // sill
    frame.box("impMetal", cu, w.v0 - 0.0, 0.15, ww + 0.34, 0.03, 0.3, { color: PALETTE.impGreyDark });
    frame.cylU("impMetal", cu, 0.6, 0.1, 0.04, ww, { color: PALETTE.impGreyDark, segments: 8 });
    // frame ring proud of the wall + mullions + glass
    frame.box("impTrim", cu, w.v1 + 0.08, 0.1, ww + 0.3, 0.16, 0.2, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impTrim", w.u0 - 0.08, cv, 0.1, 0.16, wh + 0.3, 0.2, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impTrim", w.u1 + 0.08, cv, 0.1, 0.16, wh + 0.3, 0.2, { color: PALETTE.impBlack, texel: 1 });
    const nM = Math.round(ww / 1.2);
    for (let m = 1; m < nM; m++) frame.box("impGloss", w.u0 + (ww * m) / nM, cv, 0.0, 0.1, wh, 0.2);
    frame.add("viewGlass", new THREE.PlaneGeometry(ww, wh), cu, cv, -0.02, { uv: "keep" });
    // accent strip under the sill (controllers' side)
    frame.box(accentKey, cu, w.v0 - 0.13, 0.245, ww - 0.2, 0.03, 0.01);
  }
  for (const d of doors) {
    const cu = (d.u0 + d.u1) / 2;
    frame.box("impTrim", cu, (d.v1 + vTop) / 2, 0.0, d.u1 - d.u0 + 0.3, Math.max(0.05, vTop - d.v1), 0.06, { color: PALETTE.impBlack, texel: 1 });
    frame.decal(IMP_DECAL.glyphs2, cu, (d.v1 + vTop) / 2, 0.05, Math.min(0.4, Math.max(0.1, vTop - d.v1 - 0.05)));
    for (const e of [d.u0 - 0.35, d.u1 + 0.35]) frame.box(accentKey, e, d.v1 - 0.3, 0.06, 0.05, 0.4, 0.02);
  }
}

export function buildFlightControl(kit, ctx, room) {
  hgSetup(kit);
  const materials = kit.materials;
  // The booth exists to look into the hangar, but the small-room default fog (FogExp2 0.03) turns the
  // 130 m of hangar behind the glass into a flat grey wall (exp(-(0.03·130)²) ≈ 0). Use the hangar's
  // density while the player is in here. Runtime shim — spec.js owns this; see the orchestrator request.
  const [W, H, D] = room.size;
  const hx = W / 2;
  const hz = D / 2;
  const accentKey = "emitBlue";
  const blueBlink = [];

  // ---- floor: lower tier at the window, upper tier (y 0.45) from x = 1 aft, lit step edge
  impFloor(kit, -hx, -hz, hx, hz, { lane: false });
  const TX = 1.0;
  const TY = 0.45;
  kit.boxMM("impDeck", [TX, 0, -hz], [hx, TY, hz], { color: PALETTE.impGrey, texel: 0.5 });
  kit.boxMM("impTrim", [TX, 0, -hz], [TX + 0.12, TY + 0.005, hz], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM(accentKey, [TX + 0.02, TY - 0.09, -hz + 0.3], [TX + 0.05, TY - 0.05, hz - 0.3]);
  kit.floor(TX, -hz, hx, hz, TY, "upper-tier");
  kit.collider([TX, 0, -hz], [hx, TY - 0.02, hz], "tier-slab");
  kit.colliders[kit.colliders.length - 1].walkable = true;
  // walkway lane from the door to the upper tier
  kit.boxMM("impMetalRough", [-hx + 0.3, 0.001, -1.1], [TX, 0.012, 1.1], { color: PALETTE.impGreyDark, texel: 0.7 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [-hx + 0.3, 0.001, s * 1.1 - 0.03], [TX, 0.014, s * 1.1 + 0.03], { color: PALETTE.impBlack });

  // ---- walls: window wall toward the hangar (W), Imperial panels elsewhere
  const walls = roomWalls(kit, room);
  const wOpen = openingsFor(room, ctx.doors, "W");
  // window strips flanking the door: these must match the holes in the hangar's E wall (world z ±1.8..±6.6, y 1.0..3.4)
  const fcWin = [
    { u0: hz - 6.6 - 0.02, u1: hz - 1.8 + 0.02, v0: 0.98, v1: 3.42 },
    { u0: hz + 1.8 - 0.02, u1: hz + 6.6 + 0.02, v0: 0.98, v1: 3.42 },
  ];
  windowWall(walls.W.frame, D, H, [...wOpen, ...fcWin], { accentKey });
  for (const side of ["N", "E", "S"]) {
    const { frame, length } = walls[side];
    impWall(frame, length, H, { openings: openingsFor(room, ctx.doors, side), seed: 500 + side.charCodeAt(0), accentKey, tag: "fc" + side, panelW: 1.6, features: { vent: 0.1, equipment: 0.14, conduit: 0.06, light: 0.12, screen: 0.08 } });
  }
  // status board on the E wall (u = lz + 7): black housing, four screens, hangar schematic, light bar
  {
    const f = walls.E.frame;
    f.box("impTrim", hz, 2.0 + TY, 0.12, 9.0, 2.5, 0.24, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", hz, 2.0 + TY, 0.245, 8.8, 2.3, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
    f.screen("scrBlue0", hz - 2.6, 2.25 + TY, 0.26, 3.2, 1.5);
    f.screen("scrBlue1", hz + 0.9, 2.45 + TY, 0.26, 3.4, 1.1);
    f.screen("scrGreen0", hz + 3.4, 2.45 + TY, 0.26, 1.2, 1.1);
    f.screen("scrAmber1", hz + 0.9, 1.35 + TY, 0.26, 2.0, 0.7);
    f.screen("scrRed0", hz + 3.1, 1.35 + TY, 0.26, 1.6, 0.7);
    // deck schematic: rack rows as numbered plates around a fighter outline
    const g = new THREE.PlaneGeometry(1.3, 1.3);
    f.add("hangar_decal", g, hz - 2.6, 1.2 + TY, 0.262, { uv: "keep", uvRect: hgDecalRect(HG_DECAL.tie) });
    for (let k = 0; k < 4; k++) {
      const g2 = new THREE.PlaneGeometry(0.42, 0.42);
      f.add("hangar_decal", g2, hz - 3.9 + k * 0.5, 1.2 + TY, 0.262, { uv: "keep", uvRect: hgDecalRect(hgNumber(k + 1)) });
    }
    f.box("impMetal", hz, 3.35 + TY, 0.3, 8.6, 0.08, 0.16, { color: PALETTE.impGreyDark });
    f.box("emitWhiteSoft", hz, 3.32 + TY, 0.34, 8.2, 0.03, 0.02, { uv: "keep" });
    for (let k = 0; k < 10; k++) {
      const p = f.pos(hz - 3.6 + k * 0.8, 0.95 + TY, 0.27);
      if (k % 3 === 0) blueBlink.push([p.x, p.y, p.z, 0.02, 0.08, 0.16]);
      else f.box(k % 3 === 1 ? "emitGreen" : "emitWhite", hz - 3.6 + k * 0.8, 0.95 + TY, 0.27, 0.16, 0.08, 0.02);
    }
    f.collider(hz - 4.6, hz + 4.6, TY, TY + 3.4, 0, 0.3, "board");
    impWallLight(walls.N.frame, 4, 3.2, { key: "emitWhiteSoft", w: 1.2 });
    impWallLight(walls.S.frame, 4, 3.2, { key: "emitWhiteSoft", w: 1.2 });
  }

  // ---- tiered consoles facing the window (operators sit at +x looking toward -x)
  const consoleRow = (x, y, zs, w, seedBase) => {
    zs.forEach((z, i) => {
      impConsole(kit, x, y, z, w, 0.9, { yaw: Math.PI / 2, seed: seedBase + i, screens: ["scrBlue0", "scrBlue1", "scrGreen0", "scrAmber0"], accentKey, tall: i % 2 === 0 });
      impChair(kit, x + 0.95, y, z, Math.PI / 2);
    });
  };
  consoleRow(-8.2, 0, [-4.2, 4.2], 3.0, 600); // lower tier: two long desks flanking the entry aisle
  consoleRow(3.6, TY, [-4.6, 4.6], 3.4, 620); // upper tier
  // supervisor station on the upper tier facing the board, a holo table in the middle
  impConsole(kit, 8.6, TY, -4.8, 1.8, 0.8, { yaw: -Math.PI / 2, seed: 640, screens: ["scrBlue1", "scrRed0"], accentKey });
  impChair(kit, 7.65, TY, -4.8, -Math.PI / 2);
  {
    const hx0 = 7.8;
    kit.cyl("impTrim", hx0, TY + 0.45, 0, 1.0, 0.9, "y", { color: PALETTE.impBlack, segments: 18 });
    kit.cyl("impMetal", hx0, TY + 0.92, 0, 1.05, 0.06, "y", { color: PALETTE.impGreyDark, segments: 18 });
    kit.cyl(accentKey, hx0, TY + 0.6, 0, 1.01, 0.03, "y", { segments: 18 });
    kit.cyl("holo", hx0, TY + 1.6, 0, 0.9, 1.3, "y", { segments: 20, open: true });
    kit.cyl("holoBright", hx0, TY + 1.0, 0, 0.7, 0.05, "y", { segments: 20 });
    // holographic deck plan: the hangar footprint with the opening as a brighter slab
    kit.box("holo", hx0, TY + 1.02, 0, 1.3, 0.02, 0.77, {});
    kit.box("holoBright", hx0, TY + 1.03, 0, 0.6, 0.02, 0.35, {});
    for (const [dx, dz] of [[-0.5, -0.26], [0.5, -0.26], [-0.5, 0.26], [0.5, 0.26]]) kit.box("holoBright", hx0 + dx, TY + 1.06, dz, 0.16, 0.06, 0.1, {});
    kit.collider([hx0 - 1.05, TY, -1.05], [hx0 + 1.05, TY + 1.0, 1.05], "holo-table");
  }
  // wall gear: comms rack on the S wall, a coat of small lockers on the N wall
  kit.boxMM("impTrim", [8.5, TY, hz - 0.7], [11.5, TY + 2.4, hz - 0.05], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [8.6, TY + 0.1, hz - 0.72], [11.4, TY + 2.3, hz - 0.7], { color: PALETTE.impCharcoal, texel: 2 });
  for (let r = 0; r < 6; r++) {
    kit.boxMM("leds", [8.75, TY + 0.35 + r * 0.32, hz - 0.735], [11.25, TY + 0.4 + r * 0.32, hz - 0.72], { uv: "keep" });
  }
  kit.collider([8.4, TY, hz - 0.8], [11.6, TY + 2.4, hz], "rack");
  for (let k = 0; k < 4; k++) {
    kit.boxMM("impPanel1", [3.2 + k * 0.8, TY, -hz + 0.05], [3.9 + k * 0.8, TY + 1.9, -hz + 0.5], { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.box("impTrim", 3.55 + k * 0.8, TY + 1.1, -hz + 0.52, 0.06, 0.2, 0.03, { color: PALETTE.impBlack });
  }
  kit.collider([3.1, TY, -hz], [6.4, TY + 1.9, -hz + 0.55], "lockers");

  // ---- ceiling and lights (blue-white)
  impCeiling(kit, -hx, -hz, hx, hz, H, { beamStep: 3.5, troughs: 2, seed: 71, accentKey });
  // two ceiling keys (≈2.5× the default per-fixture output: the room has 2 fixtures where the default rig
  // would place 8) + a small cyan accent over the holo table
  kit.light({ type: "point", pos: [-6, 3.55, 0], color: 0xbfe0ff, intensity: lux(3.5, 3.2), distance: 22, priority: 0.6 });
  kit.light({ type: "point", pos: [6, 3.55, 0], color: 0xbfe0ff, intensity: lux(3.1, 3.0), distance: 22, priority: 0.58 });
  kit.light({ type: "point", pos: [7.8, TY + 1.4, 0], color: 0x5fd0ff, intensity: lux(1.2, 1.0), distance: 7, priority: 0.35 });

  hgBeacons(kit, materials, "emitBlue", blueBlink, { period: 1.2, duty: 0.5, min: 0.3, max: 3.0 });
  void W;
}
