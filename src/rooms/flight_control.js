// Hangar flight control (workstream HANGAR): a 24 × 4 × 14 m booth set into the main hangar's E wall,
// 16 m above the deck (reached by the E stair tower and its catwalk). The W wall facing the hangar is
// a full-height window wall (glass 0.4–3.7 m) with real openings that match the holes cut in the
// hangar's E wall, so the controllers (and the player) look across and down onto the deck. Three
// stepped levels face the glass: a pit at the window with the traffic desks, a tier (0.45 m) with the
// second console row and the spawn, and a supervisor's dais (0.9 m) at the back with the holo table
// under the E-wall status board. Bay status board (bays 01–07, fighter glyphs) on the N wall, traffic
// plot screens on the S wall. Imperial neutral: white fixtures, screens carry the colour.
// Room-local coordinates; the spawn (6, 0, yaw 90) looks toward -x = the window wall.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { roomWalls, openingsFor, impWall, impCeiling, impFloor, impConsole, impChair, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { HG_DECAL, hgNumber, hgDecalRect } from "../textures_hangar.js";
import { hgSetup, cutSpans, hgBeacons, deckDecalImp, HG_PALETTE } from "./hangar_kit.js";

/**
 * Window wall: slab strips around the openings, a low kick and sill, frames, header, and the glazing
 * itself raked outward by `rake` radians (the top of each pane leans out over the hangar, control-tower
 * style, so the deck below is in view from the consoles). One thin mullion per pane follows the rake.
 */
function windowWall(frame, length, height, openings, opts = {}) {
  const { depth = 0.4, accentKey = "emitWhiteDim", tag = "fcW", rake = -0.21 } = opts;
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
  // header band (above the windows) with a white light channel
  const vTop = Math.max(...windows.map((o) => o.v1));
  frame.box("impTrim", length / 2, (vTop + height) / 2, 0.06, length, height - vTop, 0.12, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", length / 2, vTop + 0.12, 0.13, length - 0.4, 0.1, 0.03, { color: PALETTE.impCharcoal });
  frame.box("emitWhiteDim", length / 2, vTop + 0.12, 0.15, length - 0.6, 0.04, 0.012, { uv: "keep" });
  for (const w of windows) {
    const cu = (w.u0 + w.u1) / 2;
    const cv = (w.v0 + w.v1) / 2;
    const ww = w.u1 - w.u0;
    const wh = w.v1 - w.v0;
    // the pane's centre sits inside the slab so that its raked top leans out over the hangar and its
    // foot lands on the sill
    const gn = -depth / 2 - 0.1;
    // kick plate and sill under the glass (the sill spans the slab), a conduit run along the kick
    frame.box("impTrim", cu, w.v0 / 2 - 0.06, 0.04, ww + 0.3, w.v0 - 0.12, 0.08, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impTrim", cu, w.v0 - 0.06, 0.0, ww + 0.3, 0.12, 0.5, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impMetal", cu, w.v0, 0.15, ww + 0.34, 0.03, 0.3, { color: PALETTE.impGreyDark });
    frame.cylU("impMetal", cu, 0.16, 0.1, 0.03, ww, { color: PALETTE.impGreyDark, segments: 8 });
    // frame ring proud of the wall (jambs), one raked mullion and the raked pane
    frame.box("impTrim", cu, w.v1 + 0.08, 0.1, ww + 0.3, 0.16, 0.2, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impTrim", w.u0 - 0.08, cv, 0.1, 0.16, wh + 0.3, 0.2, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impTrim", w.u1 + 0.08, cv, 0.1, 0.16, wh + 0.3, 0.2, { color: PALETTE.impBlack, texel: 1 });
    const nM = Math.max(1, Math.round(ww / 2.6));
    for (let m = 1; m < nM; m++) frame.box("impGloss", w.u0 + (ww * m) / nM, cv, gn, 0.06, wh + 0.1, 0.12, { tilt: rake });
    // top and bottom glazing bars following the rake
    for (const s of [-1, 1]) frame.box("impTrim", cu, cv + (s * wh) / 2, gn + s * (wh / 2) * Math.sin(rake), ww, 0.1, 0.14, { color: PALETTE.impBlack, tilt: rake });
    frame.add("viewGlass", new THREE.PlaneGeometry(ww, wh).rotateX(rake), cu, cv, gn, { uv: "keep" });
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
  const [W, H, D] = room.size;
  const hx = W / 2;
  const hz = D / 2;
  const accentKey = "emitWhiteDim";
  const blink = [];

  // ---- three levels facing the glass: pit (0) at the window, tier (T1) with the spawn, dais (T2) at the
  //      E wall; open stairs in the centre aisle (the door is at z = 0) between them
  const X1 = -3.5; // pit / tier step
  const X2 = 8.5; // tier / dais step
  const T1 = 0.45;
  const T2 = 0.9;
  const AISLE = 1.5; // half-width of the centre aisle
  impFloor(kit, -hx, -hz, hx, hz, { lane: false });
  const level = (x0, y, tag) => {
    kit.boxMM("impDeck", [x0, 0, -hz], [hx, y, hz], { color: PALETTE.impGrey, texel: 0.5 });
    kit.boxMM("impTrim", [x0, 0, -hz], [x0 + 0.12, y - 0.02, hz], { color: PALETTE.impBlack, texel: 1 }); // riser nosing
    kit.boxMM("impPanel1", [x0, y - 0.02, -hz], [x0 + 0.16, y + 0.006, hz], { color: PALETTE.impWhite, texel: 1 }); // white painted edge
    kit.boxMM(accentKey, [x0 + 0.02, y - 0.09, -hz + 0.3], [x0 + 0.05, y - 0.05, hz - 0.3]); // lit step edge
    kit.floor(x0, -hz, hx, hz, y, tag);
    kit.collider([x0, 0, -hz], [hx, y - 0.02, hz], tag + "-slab");
    kit.colliders[kit.colliders.length - 1].walkable = true;
  };
  level(X1, T1, "tier");
  level(X2, T2, "dais");
  // stairs down the centre aisle: three treads from the tier to the pit, three from the dais to the tier
  const stair = (xTop, yLo, yHi) => {
    const run = 1.8;
    const n = 3;
    kit.stairs(xTop - run, -AISLE, xTop, AISLE, "x", xTop - run, xTop, yLo, yHi);
    for (let k = 0; k < n; k++) {
      const yt = yLo + ((yHi - yLo) * (k + 1)) / n;
      const xa = xTop - run + (run * k) / n;
      const xb = xTop - run + (run * (k + 1)) / n;
      kit.boxMM("impDeck", [xa, yLo, -AISLE], [xb + 0.02, yt, AISLE], { color: PALETTE.impGrey, texel: 0.5 });
      kit.boxMM("impTrim", [xa, yt - 0.03, -AISLE], [xa + 0.08, yt + 0.004, AISLE], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM(accentKey, [xa + 0.02, yt - 0.02, -AISLE + 0.15], [xa + 0.05, yt, AISLE - 0.15]);
    }
    // handrail posts and a top rail each side of the run
    for (const s of [-1, 1]) {
      const z = s * (AISLE + 0.08);
      for (const [x, y] of [[xTop - run + 0.1, yLo], [xTop - 0.1, yHi]]) kit.box("impTrim", x, y + 0.45, z, 0.06, 0.9, 0.06, { color: PALETTE.impBlack });
      const a = new THREE.Vector3(xTop - run + 0.1, yLo + 0.9, z);
      const b = new THREE.Vector3(xTop - 0.1, yHi + 0.9, z);
      const m = a.clone().add(b).multiplyScalar(0.5);
      const g = new THREE.CylinderGeometry(0.025, 0.025, a.distanceTo(b), 8);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      kit.add("impMetal", g, { pos: [m.x, m.y, m.z], quat: q, color: PALETTE.impGreyDark, uv: "scale", uvScale: [0.2, 4] });
    }
  };
  stair(X1, 0, T1);
  stair(X2, T1, T2);
  // walkway from the door to the tier stairs: two painted edge lines only (no speckled runner)
  for (const s of [-1, 1]) kit.boxMM("impTrim", [-hx + 0.3, 0.001, s * AISLE - 0.03], [X1 - 1.8, 0.014, s * AISLE + 0.03], { color: PALETTE.impBlack });
  // cable trays along the foot of each console row (the tiers' risers carry the conduit)
  for (const [x0, x1, y] of [[X1 + 0.15, X1 + 0.45, T1 + 0.03], [X2 + 0.15, X2 + 0.45, T2 + 0.03]]) {
    kit.boxMM("impMetal", [x0, y, -hz + 0.4], [x1, y + 0.06, hz - 0.4], { color: PALETTE.impCharcoal, texel: 1 });
  }

  // ---- walls: full-height window wall toward the hangar (W), Imperial panels elsewhere
  const walls = roomWalls(kit, room);
  const wOpen = openingsFor(room, ctx.doors, "W");
  // full-width window strip (sill 0.4, head 3.7) in two panes flanking the door: these must match the
  // holes in the hangar's E wall (hangar.js fcWin, u_hangar = 117 - u_here, v_hangar = 16 + v_here)
  const fcWin = [
    { u0: 0.3, u1: 5.45, v0: 0.4, v1: 3.7 },
    { u0: 8.55, u1: 13.7, v0: 0.4, v1: 3.7 },
  ];
  windowWall(walls.W.frame, D, H, [...wOpen, ...fcWin], { accentKey });
  for (const side of ["N", "E", "S"]) {
    const { frame, length } = walls[side];
    // hangar-complex cool grey on the plates (the kit's off-white read as blown-out slabs beside the keys)
    impWall(frame, length, H, { openings: openingsFor(room, ctx.doors, side), seed: 500 + side.charCodeAt(0), accentKey, tag: "fc" + side, panelW: 1.6, panelColor: HG_PALETTE.plate, panelColorAlt: HG_PALETTE.plateAlt, features: { vent: 0.12, equipment: 0.16, conduit: 0.08, light: 0.12, screen: 0 } });
  }
  // bay status board on the N wall over the pit and tier rows (u = lx + 12): black housing, the lit
  // board (bays 01–07 with fighter glyphs), a light bar above and an indicator row below
  {
    const f = walls.N.frame;
    const cu = 5.4; // lx -6.6: spans the pit / tier step, in the spawn view's right-hand third
    const bw = 8.4;
    const bh = 2.1;
    const cv = 2.4;
    f.box("impTrim", cu, cv, 0.12, bw + 0.4, bh + 0.4, 0.24, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", cu, cv, 0.245, bw + 0.2, bh + 0.2, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
    f.add("hangar_board", new THREE.PlaneGeometry(bw, bh), cu, cv, 0.262, { uv: "keep" });
    f.box("impMetal", cu, cv + bh / 2 + 0.34, 0.3, bw + 0.2, 0.08, 0.16, { color: PALETTE.impGreyDark });
    f.box("emitWhiteDim", cu, cv + bh / 2 + 0.31, 0.34, bw - 0.2, 0.03, 0.02, { uv: "keep" });
    for (let k = 0; k < 7; k++) {
      const u = cu - bw / 2 + (bw * (k + 0.5)) / 7;
      const p = f.pos(u, cv - bh / 2 - 0.3, 0.27);
      if (k === 2 || k === 5) blink.push([p.x, p.y, p.z, 0.16, 0.08, 0.02]);
      else f.box(k === 4 ? "emitRedImp" : "emitGreen", u, cv - bh / 2 - 0.3, 0.27, 0.16, 0.08, 0.02);
    }
    f.collider(cu - bw / 2 - 0.2, cu + bw / 2 + 0.2, 0.9, cv + bh / 2 + 0.2, 0, 0.3, "board");
    impWallLight(f, 15.5, 3.2, { key: "emitWhiteDim", w: 1.2 });
    impWallLight(f, 21.0, 3.2, { key: "emitWhiteDim", w: 1.2 });
  }
  // traffic plot and approach screens on the S wall (u = 12 - lx), facing the N board
  {
    const f = walls.S.frame;
    const cu = 18.6; // lx -6.6
    f.box("impTrim", cu, 2.25, 0.12, 8.8, 2.5, 0.24, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", cu, 2.25, 0.245, 8.6, 2.3, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
    f.screen("scrBlue2", cu - 2.4, 2.45, 0.26, 3.6, 1.7);
    f.screen("scrBlue1", cu + 1.4, 2.7, 0.26, 3.6, 1.2);
    f.screen("scrAmber2", cu + 0.5, 1.5, 0.26, 1.8, 0.8);
    f.screen("scrGreen3", cu + 2.6, 1.5, 0.26, 1.8, 0.8);
    // deck schematic: rack rows as numbered plates around a fighter outline
    f.add("hangar_decal", new THREE.PlaneGeometry(1.3, 1.3), cu - 3.6, 1.55, 0.262, { uv: "keep", uvRect: hgDecalRect(HG_DECAL.tie) });
    for (let k = 0; k < 4; k++) f.add("hangar_decal", new THREE.PlaneGeometry(0.42, 0.42), cu - 2.3 + k * 0.5, 1.55, 0.262, { uv: "keep", uvRect: hgDecalRect(hgNumber(k + 1)) });
    f.box("impMetal", cu, 3.6, 0.3, 8.6, 0.08, 0.16, { color: PALETTE.impGreyDark });
    f.box("emitWhiteDim", cu, 3.57, 0.34, 8.2, 0.03, 0.02, { uv: "keep" });
    f.collider(cu - 4.5, cu + 4.5, 0.9, 3.6, 0, 0.3, "plot");
    impWallLight(f, 3.0, 3.2, { key: "emitWhiteDim", w: 1.2 });
    impWallLight(f, 8.5, 3.2, { key: "emitWhiteDim", w: 1.2 });
  }
  // supervisor's status board on the E wall over the dais (u = lz + 7)
  {
    const f = walls.E.frame;
    f.box("impTrim", hz, 2.1 + T2, 0.12, 9.0, 2.0, 0.24, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", hz, 2.1 + T2, 0.245, 8.8, 1.8, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
    f.screen("scrBlue0", hz - 2.6, 2.15 + T2, 0.26, 3.2, 1.4);
    f.screen("scrWhite1", hz + 1.0, 2.45 + T2, 0.26, 3.6, 0.9);
    f.screen("scrGreen2", hz + 3.4, 2.45 + T2, 0.26, 1.0, 0.9);
    f.screen("scrRed0", hz + 1.9, 1.5 + T2, 0.26, 2.6, 0.7);
    f.decal(IMP_DECAL.glyphs3, hz + 3.6, 1.5 + T2, 0.27, 0.7);
    f.box("impMetal", hz, 3.25 + T2, 0.3, 8.6, 0.08, 0.16, { color: PALETTE.impGreyDark });
    f.box("emitWhiteDim", hz, 3.22 + T2, 0.34, 8.2, 0.03, 0.02, { uv: "keep" });
    f.collider(hz - 4.6, hz + 4.6, T2 + 1.0, T2 + 3.3, 0, 0.3, "board");
  }

  // ---- stepped console rows facing the window (operators sit at +x looking toward -x); every desk gets
  //      its own mix of the screen layouts (traffic plot, status grid, bars, star chart)
  const layouts = [
    ["scrBlue0", "scrBlue2", "scrGreen1", "scrAmber3"],
    ["scrBlue3", "scrWhite1", "scrBlue1", "scrGreen2"],
    ["scrBlue2", "scrAmber0", "scrBlue0", "scrRed3"],
    ["scrGreen0", "scrBlue1", "scrBlue3", "scrWhite2"],
  ];
  let desk = 0;
  const consoleRow = (x, y, zs, w, seedBase) => {
    zs.forEach((z, i) => {
      impConsole(kit, x, y, z, w, 0.9, { yaw: Math.PI / 2, seed: seedBase + i, screens: layouts[desk++ % layouts.length], accentKey, tall: i % 2 === 0 });
      impChair(kit, x + 0.95, y, z, Math.PI / 2);
    });
  };
  consoleRow(-8.6, 0, [-4.3, 4.3], 4.4, 600); // pit: two long traffic desks flanking the door aisle
  consoleRow(-2.4, T1, [-4.5, 4.5], 4.0, 620); // tier, front row at the step edge
  consoleRow(2.2, T1, [-4.0, 4.0], 3.4, 660); // tier, back row (frames the spawn view either side of the aisle)
  consoleRow(10.2, T2, [-4.2, 4.2], 3.2, 640); // dais: supervisors, overlooking all three rows
  // crest inlay in the tier aisle (the spawn camera sees the floor from x ≈ 1 forward) and hazard
  // chevrons at both stair heads
  deckDecalImp(kit, IMP_DECAL.cog, -0.9, 0, 1.7, Math.PI / 2, T1 + 0.006);
  for (const [x, y] of [[X1 + 0.35, T1], [X2 + 0.35, T2]]) kit.boxMM("chevronY", [x - 0.25, y + 0.002, -AISLE], [x + 0.25, y + 0.01, AISLE], { texel: 1.5 });
  // holo table in the dais aisle behind the spawn, with the hangar footprint and the opening as a brighter slab
  {
    const hx0 = 10.6;
    kit.cyl("impTrim", hx0, T2 + 0.45, 0, 0.9, 0.9, "y", { color: PALETTE.impBlack, segments: 18 });
    kit.cyl("impMetal", hx0, T2 + 0.92, 0, 0.95, 0.06, "y", { color: PALETTE.impGreyDark, segments: 18 });
    kit.cyl(accentKey, hx0, T2 + 0.6, 0, 0.91, 0.03, "y", { segments: 18 });
    kit.cyl("holo", hx0, T2 + 1.55, 0, 0.8, 1.2, "y", { segments: 20, open: true });
    kit.cyl("holoBright", hx0, T2 + 1.0, 0, 0.62, 0.05, "y", { segments: 20 });
    kit.box("holo", hx0, T2 + 1.02, 0, 1.2, 0.02, 0.7, {});
    kit.box("holoBright", hx0, T2 + 1.03, 0, 0.55, 0.02, 0.32, {});
    for (const [dx, dz] of [[-0.46, -0.24], [0.46, -0.24], [-0.46, 0.24], [0.46, 0.24]]) kit.box("holoBright", hx0 + dx, T2 + 1.06, dz, 0.15, 0.06, 0.09, {});
    kit.collider([hx0 - 0.95, T2, -0.95], [hx0 + 0.95, T2 + 1.0, 0.95], "holo-table");
  }
  // wall gear on the dais: comms rack by the S wall, a row of small lockers by the N wall
  kit.boxMM("impTrim", [X2 + 0.6, T2, hz - 0.7], [X2 + 3.2, T2 + 2.4, hz - 0.05], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [X2 + 0.7, T2 + 0.1, hz - 0.72], [X2 + 3.1, T2 + 2.3, hz - 0.7], { color: PALETTE.impCharcoal, texel: 2 });
  for (let r = 0; r < 6; r++) kit.boxMM("leds", [X2 + 0.85, T2 + 0.35 + r * 0.32, hz - 0.735], [X2 + 2.95, T2 + 0.4 + r * 0.32, hz - 0.72], { uv: "keep" });
  kit.collider([X2 + 0.5, T2, hz - 0.8], [X2 + 3.3, T2 + 2.4, hz], "rack");
  for (let k = 0; k < 3; k++) {
    kit.boxMM("impPanel1", [X2 + 0.7 + k * 0.8, T2, -hz + 0.05], [X2 + 1.4 + k * 0.8, T2 + 1.9, -hz + 0.5], { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.box("impTrim", X2 + 1.05 + k * 0.8, T2 + 1.1, -hz + 0.52, 0.06, 0.2, 0.03, { color: PALETTE.impBlack });
  }
  kit.collider([X2 + 0.6, T2, -hz], [X2 + 3.1, T2 + 1.9, -hz + 0.55], "lockers");
  // pit dressing: equipment cabinets under the board and the plot, a floor-standing comms console by the door
  for (const s of [-1, 1]) {
    kit.boxMM("impTrim", [-11.4, 0, s > 0 ? hz - 0.75 : -hz + 0.05], [-9.4, 0.95, s > 0 ? hz - 0.05 : -hz + 0.75], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [-11.3, 0.1, s > 0 ? hz - 0.77 : -hz + 0.75], [-9.5, 0.85, s > 0 ? hz - 0.75 : -hz + 0.77], { color: PALETTE.impCharcoal, texel: 2 });
    kit.collider([-11.4, 0, s > 0 ? hz - 0.8 : -hz], [-9.4, 0.95, s > 0 ? hz : -hz + 0.8], "cabinet");
  }

  // ---- ceiling and lights: neutral white keys as hooded pendants under the two trough fixtures
  //      (x = -6 / 6), which are the motivated sources. A key 0.4 m under the slab lit the slab 80x
  //      harder than the floor, so even a matte black plate there blew out into two white blobs over the
  //      window from the spawn. Hung at 3.1 m inside an opaque hood (an unshadowed point light cannot
  //      light the outside of the box it sits in) the slab gets a sixth of that, the emitter is never
  //      seen bare (the lit pane faces the floor) and the hood reads as a fixture at 12 m
  impCeiling(kit, -hx, -hz, hx, hz, H, { beamStep: 3.5, troughs: 2, seed: 71, accentKey });
  for (const tx of [-6, 6]) kit.boxMM("paintedMetal", [tx - 1.6, H - 0.03, -hz + 0.15], [tx + 1.6, H, hz - 0.15], { color: PALETTE.impBlack, texel: 1 });
  const PY = 3.1; // pendant light height (hood 3.0–3.3, stem to the slab)
  const pendant = (x, z) => {
    kit.cyl("impTrim", x, (H + PY + 0.3) / 2, z, 0.04, H - PY - 0.3, "y", { color: PALETTE.impBlack, segments: 6 });
    kit.box("impTrim", x, PY + 0.15, z, 1.2, 0.3, 0.7, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetalRough", x, PY - 0.02, z, 1.26, 0.06, 0.76, { color: PALETTE.impGreyDark });
    kit.box(accentKey, x, PY - 0.06, z, 1.0, 0.02, 0.5, { uv: "keep" });
  };
  // (mid-segment between the 3.5 m beams: z = ±1.75)
  const white = HG_PALETTE.keyWhite;
  // (k 1.8: with the environment fill at 0.55 the aisle under the keys reached 200/255 and the frame mean
  // 75; the critic's target for a room is a 50–65 mean, screens and the window carrying the highlights)
  for (const [x, z, drop, pr] of [[-6, -1.75, 0, 0.6], [-6, 1.75, 0, 0.59], [6, -1.75, T1, 0.58], [6, 1.75, T1, 0.57]]) {
    pendant(x, z);
    kit.light({ type: "point", pos: [x, PY, z], color: white, intensity: lux(PY - drop, 1.8), distance: 20, priority: pr });
  }
  kit.light({ type: "point", pos: [10.6, T2 + 1.4, 0], color: 0x5fd0ff, intensity: lux(1.2, 0.9), distance: 6, priority: 0.35 }); // holo glow

  hgBeacons(kit, materials, "emitAmber", blink, { period: 1.2, duty: 0.5, min: 0.3, max: 3.0 });
  void W;
}
