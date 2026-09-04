// Command bridge of the ISD Vindicator — film topology:
//   * the aft blast door (S wall, y 0) opens straight onto the raised central command walkway (y 0,
//     x -4..4) that runs forward to the nine viewports;
//   * two crew pits sunk to y -1.8 on both sides of the walkway (x ±4..±14, z -12..+10), each entered
//     by a narrow stair at its aft end beside the walkway;
//   * a forward command platform under the viewports (holo table, flag officers' stations) and outer
//     decks beyond the pits (y 0) with computer banks, tactical wall displays and a comms alcove;
//   * a low dark ribbed ceiling (6.8 m) with dim slot lights over the pits only; the starlight key
//     comes from the viewports and lights the walkway and the platform.
// Room-local frame: origin at the deck centre, +x starboard, +y up, -z forward (bow).
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { rng, prism } from "../kit.js";
import { Frame, wallFrame, roomWalls, openingsFor, impWall, impCeiling, impConsole, impChair, impRailing, impPillar, impWallGear, lux, UP } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { TOWER } from "../spec.js";
import { makeTacticalMap, makeStatusBoard } from "../textures_bridge.js";
import { BridgeFx, BLACK, CHAR, GREYD, GREY, tube, placer, cabinet, displayColumn, commsMast, guardAlcove, scopeStation, plotTable, pitWall, buildHoloTable } from "./bridge_props.js";

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// ---------------------------------------------------------------------------
// materials owned by this room (prefix bridge_)
// ---------------------------------------------------------------------------
function ensureMaterials(M) {
  if (!M.bridge_tacScreen) {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeTacticalMap(1024, 512, 7), emissiveIntensity: 1.2, roughness: 0.6, metalness: 0 });
    M.bridge_tacScreen = setDomain(m, "interior");
  }
  if (!M.bridge_statusBoard) {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeStatusBoard(512, 1024, 3), emissiveIntensity: 1.2, roughness: 0.6, metalness: 0 });
    M.bridge_statusBoard = setDomain(m, "interior");
  }
}

// ---------------------------------------------------------------------------
// the builder
// ---------------------------------------------------------------------------
export function buildBridge(kit, ctx, room) {
  const M = ctx.materials;
  ensureMaterials(M);
  const [W, , D] = room.size; // 64 × (12) × 30; the interior uses a 6.8 m false ceiling
  const hx = W / 2;
  const hz = D / 2;
  const CEIL = 6.8;
  const PIT_Y = -1.8;
  const PIT = { x0: 4, x1: 14, z0: -12, z1: 10 };
  const WALK_HW = 4; // walkway deck half-width (rails at ±3.8)
  const RAIL_X = 3.8;
  const STAIR = { x0: 4.0, x1: 5.6, zTop: 10, zBot: 7 }; // narrow side stairs at the pits' aft ends
  const NF = -hz + 0.4; // interior face of the forward bulkhead (z -14.6); the exterior slab is z -16..-15
  const accentKey = "emitBlue";
  const fx = new BridgeFx();
  const crewSpots = [];
  const state = { alert: false };
  kit.skipDefaultFloor = true;

  // viewport strip (spec) in room-local coordinates
  const vp = TOWER.viewports;
  const WY0 = vp.y0 - room.origin[1]; // 1.6
  const WY1 = vp.y1 - room.origin[1]; // 5.4
  const vw = (vp.hw * 2 - vp.pillar * (vp.count - 1)) / vp.count; // 6.58
  const winX = (i) => -vp.hw + vw / 2 + i * (vw + vp.pillar);

  const walls = roomWalls(kit, room);

  // =========================================================================
  // 1. Shell: side and aft walls (panelled, 6.8 m), forward bulkhead with the viewports, ceiling
  // =========================================================================
  {
    const feats = { vent: 0.09, equipment: 0.12, conduit: 0.06, light: 0.08, screen: 0.06 };
    impWall(walls.E.frame, D, CEIL, { panelW: 2.4, seed: 41, bands: [2.7, 4.8], features: feats, accentKey, tag: "bridgeE", kickH: 0.36, corniceH: 0.36 });
    impWall(walls.W.frame, D, CEIL, { panelW: 2.6, seed: 34, bands: [2.5, 4.6], features: feats, accentKey, tag: "bridgeW", kickH: 0.36, corniceH: 0.36 });
    impWall(walls.S.frame, W, CEIL, { openings: openingsFor(room, ctx.doors, "S"), panelW: 2.1, seed: 77, bands: [2.6, 4.7], features: { vent: 0.08, equipment: 0.12, conduit: 0.05, light: 0.1, screen: 0.08 }, accentKey, tag: "bridgeS", corniceH: 0.36 });
    buildForwardWall();
    buildCeiling();
  }

  function buildForwardWall() {
    const nf = new Frame(kit, new THREE.Vector3(-hx, 0, NF), X_AXIS, UP); // room face, N = +z
    const YBr = WY0 - 0.35; // room-face sill (the sill slopes down 0.35 toward the room)
    const YTr = WY1 + 0.4; // room-face head (the head splays up)
    const hwB = vw / 2 - 0.25; // exterior cut-out half-widths (bottom / top)
    const hwT = vw / 2;
    const hwBr = hwB + 0.15; // room-face opening half-widths: splayed reveals, stronger trapezoid
    const hwTr = hwT + 0.3;
    // bulkhead slabs (z -15 .. -14.6) below the sills and above the heads: pale Imperial panels, so the
    // viewports read as dark trapezoid openings between pale mullions (the film's silhouette)
    kit.boxMM("impPanel1", [-hx - 0.4, -0.2, -hz], [hx + 0.4, YBr, NF], { color: GREY, texel: 1 });
    kit.boxMM("impPanel1", [-hx - 0.4, YTr, -hz], [hx + 0.4, CEIL + 0.4, NF], { color: GREY, texel: 1 });
    kit.boxMM("impTrim", [-hx - 0.4, YTr - 0.02, NF - 0.01], [hx + 0.4, YTr + 0.5, NF + 0.01], { color: BLACK, texel: 1 }); // black head band
    // wedge pillars between the viewports: wide at the sill, narrow at the head (film silhouette)
    const pitch = vw + vp.pillar;
    for (let i = 0; i < vp.count - 1; i++) {
      const xp = (winX(i) + winX(i + 1)) / 2;
      const bw = pitch / 2 - hwBr;
      const tw = pitch / 2 - hwTr;
      kit.add("impPanel1", prism([[-bw, YBr - 0.02], [bw, YBr - 0.02], [tw, YTr + 0.02], [-tw, YTr + 0.02]], 0.4), { pos: [xp, 0, NF - 0.2], color: GREY, texel: 1 });
      kit.add("impTrim", prism([[-bw + 0.16, YBr + 0.3], [bw - 0.16, YBr + 0.3], [tw - 0.12, YTr - 0.4], [-tw + 0.12, YTr - 0.4]], 0.03), { pos: [xp, 0, NF + 0.015], color: BLACK, texel: 1 });
      // narrow dim lamp, brackets, glyph plate, status lamp at the head
      nf.box("impMetal", xp + hx, 3.3, 0.05, 0.14, 1.24, 0.02, { color: CHAR });
      nf.box("emitBlueDim", xp + hx, 3.3, 0.062, 0.03, 1.1, 0.01, { uv: "keep" });
      for (const v of [2.2, 4.6]) nf.box("impMetal", xp + hx, v, 0.06, bw * 1.2, 0.06, 0.02, { color: GREYD });
      nf.decal(IMP_DECAL.glyphs1, xp + hx, YBr + 0.62, 0.052, 0.3);
      const p = nf.pos(xp + hx, YTr - 0.62, 0.055);
      fx.lamp(i % 2 ? "red" : "amber", p.x, p.y, p.z, 0.05, 0.05, 0.02);
    }
    // splayed reveals (room face -> exterior cut-out), tunnel lining through the exterior slab
    const ang = Math.atan(0.25 / (WY1 - WY0)); // exterior trapezoid lean
    const splay = Math.atan(((hwBr - hwB + hwTr - hwT) / 2) / 0.4);
    const lean = ((hwTr - hwBr) / (YTr - YBr) + (hwT - hwB) / (WY1 - WY0)) / 2;
    const hwM = (hwB + hwT) / 2;
    for (let i = 0; i < vp.count; i++) {
      const xc = winX(i);
      // sill: sloped reveal (dark metal) + flat tunnel sill (lighter, catches the starlight) + dim sill groove
      kit.add("impMetal", new THREE.BoxGeometry(hwB * 2 + 0.1, 0.06, Math.hypot(0.4, WY0 - YBr) + 0.04), { pos: [xc, (YBr + WY0) / 2 - 0.02, NF - 0.2], quat: new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.atan2(WY0 - YBr, 0.4)), color: CHAR, texel: 1 });
      kit.boxMM("impMetal", [xc - hwB + 0.02, WY0 - 0.06, -hz - 1.0], [xc + hwB - 0.02, WY0, -hz + 0.02], { color: GREYD, texel: 1 });
      kit.boxMM("emitWhiteDim", [xc - hwB + 0.3, WY0, -hz - 0.64], [xc + hwB - 0.3, WY0 + 0.012, -hz - 0.58], { uv: "keep" });
      // head: sloped reveal + flat tunnel head
      kit.add("impTrim", new THREE.BoxGeometry(hwTr * 2 + 0.04, 0.06, Math.hypot(0.4, YTr - WY1) + 0.04), { pos: [xc, (YTr + WY1) / 2 + 0.02, NF - 0.2], quat: new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan2(YTr - WY1, 0.4)), color: BLACK, texel: 1 });
      kit.boxMM("impTrim", [xc - hwT + 0.02, WY1, -hz - 1.0], [xc + hwT - 0.02, WY1 + 0.06, -hz + 0.02], { color: BLACK, texel: 1 });
      for (const s of [-1, 1]) {
        // splayed jamb reveal (room face -> cut-out edge), leaning with the trapezoid
        const jx = xc + s * ((hwB + hwT + hwBr + hwTr) / 4);
        if (Math.abs(jx) > hx + 0.2) continue;
        const q = new THREE.Quaternion().setFromAxisAngle(UP, s * splay).multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, -s * Math.atan(lean)));
        kit.add("impMetal", new THREE.BoxGeometry(0.08, YTr - YBr + 0.12, 0.4 / Math.cos(splay) + 0.06), { pos: [jx, (YBr + YTr) / 2, NF - 0.2], quat: q, color: CHAR, texel: 1 });
        // tunnel jamb (exterior slab thickness), bolt row
        const tx = xc + s * (hwM - 0.05);
        const qt = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, -s * ang);
        kit.add("impTrim", new THREE.BoxGeometry(0.1, WY1 - WY0 + 0.04, 1.0), { pos: [tx, (WY0 + WY1) / 2, -hz - 0.5], quat: qt, color: BLACK, texel: 1 });
        for (let k = 0; k < 4; k++) kit.cyl("impMetal", tx - s * 0.06, WY0 + 0.5 + k * 0.95, -hz - 0.5, 0.02, 0.02, "x", { color: GREYD, segments: 8 });
      }
      // readout housing over the viewport (small: a detail, not a light source)
      const a = Math.max(-hx + 0.5, xc - vw / 2 + 0.6);
      const b = Math.min(hx - 0.5, xc + vw / 2 - 0.6);
      if (b - a > 2.4) {
        const c = (a + b) / 2 + hx;
        nf.box("impTrim", c, 6.18, 0.08, b - a, 0.42, 0.16, { color: BLACK, texel: 1 });
        nf.box("impGloss", c, 6.18, 0.165, 1.0, 0.3, 0.02);
        nf.screen(["scrBlue1", "scrRed0", "scrBlue2", "scrAmber0", "scrBlue3", "scrGreen0", "scrBlue0", "scrRed1", "scrBlue1"][i], c, 6.18, 0.18, 0.92, 0.24);
        nf.box("leds", c - (b - a) / 2 + 0.9, 6.18, 0.165, 1.2, 0.05, 0.005, { uv: "keep" });
        nf.decal([IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][i % 2], c + (b - a) / 2 - 0.7, 6.18, 0.162, 0.3);
      }
    }
    // bulkhead face below the sills: kick, grey instrument bays with readouts, continuous dim sill groove
    nf.box("impTrim", hx, 0.16, 0.03, W, 0.32, 0.06, { color: BLACK, texel: 1 });
    nf.box("impMetal", hx, 0.3, 0.06, W - 0.4, 0.03, 0.01, { color: GREYD });
    for (let i = 0; i < vp.count; i++) {
      const xc = winX(i);
      const a = Math.max(-hx + 0.4, xc - hwBr + 0.1);
      const b = Math.min(hx - 0.4, xc + hwBr - 0.1);
      if (b - a < 2) continue;
      const c = (a + b) / 2 + hx;
      // dark instrument module set into the pale wall: black frame, charcoal panel, readouts
      nf.box("impTrim", c, 0.76, 0.015, b - a + 0.1, 0.9, 0.03, { color: BLACK, texel: 1 });
      nf.box("impPanel1", c, 0.76, 0.035, b - a, 0.78, 0.03, { color: GREYD, uv: "world", texel: 1 });
      nf.box("impTrim", c, 0.76, 0.055, 0.06, 0.62, 0.01, { color: BLACK });
      nf.box("leds", c - (b - a) / 4, 0.98, 0.056, Math.min(1.6, (b - a) / 2 - 0.5), 0.05, 0.006, { uv: "keep" });
      nf.decal([IMP_DECAL.glyphs1, IMP_DECAL.bay02, IMP_DECAL.power][i % 3], c + (b - a) / 4, 0.7, 0.056, 0.34);
    }
    nf.box("impMetal", hx, YBr - 0.07, 0.05, W, 0.1, 0.1, { color: CHAR, texel: 1 });
    nf.box("emitWhiteDim", hx, YBr - 0.08, 0.1, W - 1.0, 0.03, 0.01, { uv: "keep" });
    // cornice band under the ceiling with a dim slot (matches the kit walls)
    nf.box("impTrim", hx, CEIL - 0.18, 0.02, W, 0.36, 0.06, { color: BLACK, texel: 1 });
    nf.box("impMetal", hx, CEIL - 0.2, 0.05, W - 0.4, 0.12, 0.02, { color: CHAR });
    nf.box("emitWhiteDim", hx, CEIL - 0.2, 0.065, W - 0.8, 0.05, 0.012, { uv: "keep" });
    // the outermost viewports run past the side walls: end jamb at the wall + dark backing in the cut-out
    for (const s of [-1, 1]) {
      kit.boxMM("impTrim", [Math.min(s * (hx - 0.3), s * (hx + 0.44)), YBr - 0.1, -hz - 1.0], [Math.max(s * (hx - 0.3), s * (hx + 0.44)), YTr + 0.1, NF + 0.02], { color: BLACK, texel: 1 });
      kit.boxMM("impTrim", [Math.min(s * (hx + 0.44), s * (vp.hw + 0.6)), WY0 - 0.2, -hz - 0.1], [Math.max(s * (hx + 0.44), s * (vp.hw + 0.6)), WY1 + 0.25, -hz], { color: BLACK, texel: 1 });
    }
    kit.collider([-hx - 0.4, 0, -hz - 1.2], [hx + 0.4, CEIL, NF + 0.06], "bridgeN");
  }

  function buildCeiling() {
    // dark ribbed ceiling: dim slot lights over the pits and outer decks only; the walkway stays dark
    const co = { beamStep: 3.75, accentKey: "emitBlueDim", troughW: 0.5 };
    impCeiling(kit, -hx, -hz, -4.4, hz, CEIL, { ...co, troughs: 2, seed: 11 });
    impCeiling(kit, 4.4, -hz, hx, hz, CEIL, { ...co, troughs: 2, seed: 13 });
    impCeiling(kit, -4.4, -hz, 4.4, hz, CEIL, { ...co, troughs: 0, seed: 17 });
    // main girders over the pit edges (the nave over the walkway) and a few dim red service lamps
    for (const s of [-1, 1]) kit.boxMM("impTrim", [s * 4.4 - 0.25, CEIL - 0.6, -hz], [s * 4.4 + 0.25, CEIL + 0.01, hz], { color: BLACK, texel: 1 });
    const nB = Math.round(D / co.beamStep);
    for (let i = 0; i <= nB; i++) {
      const z = -hz + (i / nB) * D;
      if (i > 0 && i < nB) kit.box("emitRedDim", 0, CEIL - 0.24, z, 0.3, 0.02, 0.05);
      fx.alertStrip(0, CEIL - 0.25, z + (i === nB ? -0.16 : 0.16), W - 0.6, 0.03, 0.06);
    }
  }

  // =========================================================================
  // 2. Levels: deck plates, walkway inlay + crest, pit floors, pit faces, stairs, railings, floors
  // =========================================================================
  const plate = (x0, z0, x1, z1, y = 0) => kit.boxMM("impDeck", [x0, y - 0.14, z0], [x1, y, z1], { color: GREY, texel: 0.5 });
  plate(-WALK_HW, PIT.z0, WALK_HW, PIT.z1); // walkway
  plate(-hx, PIT.z1, hx, hz); // aft deck (behind the pits, the door lands here)
  plate(-hx, -hz, hx, PIT.z0); // forward command platform strip
  for (const s of [-1, 1]) plate(Math.min(s * PIT.x1, s * hx), PIT.z0, Math.max(s * PIT.x1, s * hx), PIT.z1); // outer decks
  kit.floor(-WALK_HW, PIT.z0, WALK_HW, PIT.z1, 0, "walkway");
  kit.floor(-hx - 0.5, PIT.z1, hx + 0.5, hz + 0.5, 0, "aftdeck");
  kit.floor(-hx - 0.5, -hz - 0.5, hx + 0.5, PIT.z0, 0, "platform");
  for (const s of [-1, 1]) {
    kit.floor(Math.min(s * PIT.x1, s * (hx + 0.5)), PIT.z0, Math.max(s * PIT.x1, s * (hx + 0.5)), PIT.z1, 0, "outerdeck");
    kit.floor(Math.min(s * PIT.x0, s * PIT.x1), PIT.z0, Math.max(s * PIT.x0, s * PIT.x1), PIT.z1, PIT_Y, "pit");
  }
  // walkway: dark deck inlay lane (no emissive edges), black kerbs along the pit edges
  kit.boxMM("impDeck", [-1.6, 0, PIT.z0 + 0.4], [1.6, 0.012, hz - 0.7], { color: GREYD, texel: 0.5 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [s * 1.6 - 0.03, 0, PIT.z0 + 0.4], [s * 1.6 + 0.03, 0.014, hz - 0.7], { color: BLACK });
  for (const s of [-1, 1]) {
    const m = (a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
    let [a, b] = m(PIT.x0 - 0.24, PIT.x0);
    kit.boxMM("impTrim", [a, 0.001, PIT.z0 - 0.24], [b, 0.03, STAIR.zBot], { color: BLACK }); // inner kerb (stops at the stair)
    [a, b] = m(PIT.x1, PIT.x1 + 0.24);
    kit.boxMM("impTrim", [a, 0.001, PIT.z0 - 0.24], [b, 0.03, PIT.z1 + 0.24], { color: BLACK }); // outer kerb
    [a, b] = m(PIT.x0 - 0.24, PIT.x1 + 0.24);
    kit.boxMM("impTrim", [a, 0.001, PIT.z0 - 0.24], [b, 0.03, PIT.z0], { color: BLACK }); // forward kerb
    [a, b] = m(STAIR.x1, PIT.x1 + 0.24);
    kit.boxMM("impTrim", [a, 0.001, PIT.z1], [b, 0.03, PIT.z1 + 0.24], { color: BLACK }); // aft kerb
    // grated service strip along the outer deck edge, hazard chevron at the stair mouth
    [a, b] = m(15.0, 15.7);
    kit.boxMM("impTrim", [a - 0.03, 0, PIT.z0 + 0.2], [b + 0.03, 0.008, PIT.z1 - 0.2], { color: BLACK });
    kit.add("grate", new THREE.PlaneGeometry(b - a, PIT.z1 - PIT.z0 - 0.4).rotateX(-Math.PI / 2), { pos: [(a + b) / 2, 0.012, (PIT.z0 + PIT.z1) / 2], uv: "scale", uvScale: [(b - a) / 1.24, (PIT.z1 - PIT.z0 - 0.4) / 0.9] });
    for (let z = PIT.z0 + 1.7; z < PIT.z1 - 0.6; z += 3) kit.boxMM("impMetal", [a, 0.008, z - 0.02], [b, 0.014, z + 0.02], { color: GREYD });
    [a, b] = m(STAIR.x0, STAIR.x1);
    kit.boxMM("chevronY", [a, 0.003, PIT.z1], [b, 0.011, PIT.z1 + 0.42], { texel: 1.5 });
    // outer deck lane between the computer bank and the wall stations
    [a, b] = m(23.4, 25.6);
    kit.boxMM("impDeck", [a, 0, -hz + 0.8], [b, 0.012, hz - 0.8], { color: GREYD, texel: 0.5 });
    for (const e of [23.4, 25.6]) kit.boxMM("impTrim", [s * e - 0.03, 0, -hz + 0.8], [s * e + 0.03, 0.014, hz - 0.8], { color: BLACK });
  }
  // crest inlaid in the walkway just inside the aft door (dark disc, metal ring, 2.5 m cog decal)
  {
    const cz = 11.6;
    kit.cyl("impTrim", 0, 0.016, cz, 1.46, 0.008, "y", { segments: 32, color: CHAR, texel: 1 });
    kit.add("impMetal", new THREE.TorusGeometry(1.46, 0.025, 6, 48).rotateX(Math.PI / 2), { pos: [0, 0.022, cz], color: GREYD });
    kit.add("decalImp", new THREE.PlaneGeometry(2.5, 2.5).rotateX(-Math.PI / 2), { pos: [0, 0.026, cz], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
  }

  // pit floors: deck plates, darker centre lane, grated cable trenches along both long walls
  for (const s of [-1, 1]) {
    const x0 = Math.min(s * PIT.x0, s * PIT.x1);
    const x1 = Math.max(s * PIT.x0, s * PIT.x1);
    kit.boxMM("impDeck", [x0 + 0.7, PIT_Y - 0.14, PIT.z0], [x1 - 0.7, PIT_Y, PIT.z1], { color: GREY, texel: 0.5 });
    kit.boxMM("impDeck", [x0 + 2.2, PIT_Y, PIT.z0 + 0.4], [x1 - 2.2, PIT_Y + 0.01, PIT.z1 - 0.4], { color: GREYD, texel: 0.5 });
    for (const [ta, tb] of [[x0, x0 + 0.7], [x1 - 0.7, x1]]) {
      kit.boxMM("impTrim", [ta, PIT_Y - 0.5, PIT.z0], [tb, PIT_Y - 0.44, PIT.z1], { color: BLACK, texel: 1 });
      kit.boxMM("impTrim", [ta, PIT_Y - 0.5, PIT.z0], [ta + 0.03, PIT_Y, PIT.z1], { color: BLACK });
      kit.boxMM("impTrim", [tb - 0.03, PIT_Y - 0.5, PIT.z0], [tb, PIT_Y, PIT.z1], { color: BLACK });
      for (let k = 0; k < 3; k++) kit.cyl("impMetal", ta + 0.15 + k * 0.2, PIT_Y - 0.32 + (k % 2) * 0.08, (PIT.z0 + PIT.z1) / 2, 0.035, PIT.z1 - PIT.z0 - 0.2, "z", { color: [GREYD, CHAR, GREY][k], segments: 8 });
      for (let z = PIT.z0 + 1; z < PIT.z1; z += 2.4) kit.boxMM("impTrim", [ta + 0.05, PIT_Y - 0.42, z - 0.04], [tb - 0.05, PIT_Y - 0.2, z + 0.04], { color: BLACK });
      kit.add("grate", new THREE.PlaneGeometry(tb - ta, PIT.z1 - PIT.z0).rotateX(-Math.PI / 2), { pos: [(ta + tb) / 2, PIT_Y, (PIT.z0 + PIT.z1) / 2], uv: "scale", uvScale: [(tb - ta) / 1.24, (PIT.z1 - PIT.z0) / 0.9] });
      for (const e of [ta, tb]) kit.boxMM("impMetal", [e - 0.025, PIT_Y - 0.02, PIT.z0], [e + 0.025, PIT_Y + 0.012, PIT.z1], { color: GREYD });
    }
  }

  // pit faces (frame base at the pit floor, N into the pit); the inner face stops at the stair
  for (const s of [-1, 1]) {
    const inner = s > 0 ? wallFrame(kit, [PIT.x0, STAIR.zBot], [PIT.x0, PIT.z0], PIT_Y) : wallFrame(kit, [-PIT.x0, PIT.z0], [-PIT.x0, STAIR.zBot], PIT_Y);
    pitWall(kit, fx, inner.frame, inner.length, { seed: 11 + s, screens: true });
    const outer = s > 0 ? wallFrame(kit, [PIT.x1, PIT.z0], [PIT.x1, PIT.z1], PIT_Y) : wallFrame(kit, [-PIT.x1, PIT.z1], [-PIT.x1, PIT.z0], PIT_Y);
    pitWall(kit, fx, outer.frame, outer.length, { seed: 21 + s, screens: true });
    const fwd = s > 0 ? wallFrame(kit, [PIT.x0, PIT.z0], [PIT.x1, PIT.z0], PIT_Y) : wallFrame(kit, [-PIT.x1, PIT.z0], [-PIT.x0, PIT.z0], PIT_Y);
    pitWall(kit, fx, fwd.frame, fwd.length, { seed: 31 + s });
    const aft = s > 0 ? wallFrame(kit, [PIT.x1, PIT.z1], [STAIR.x1, PIT.z1], PIT_Y) : wallFrame(kit, [-STAIR.x1, PIT.z1], [-PIT.x1, PIT.z1], PIT_Y);
    pitWall(kit, fx, aft.frame, aft.length, { seed: 41 + s, panelColor: PALETTE.impWhite });
  }

  // stairs: kit floors + stepped blocks (metal nosings, no riser LEDs), wall-side backing, handrails
  function stairBlock(x0, x1, zTop, zBot, y0, y1) {
    const n = 10;
    const run = (zTop - zBot) / n;
    for (let i = 0; i < n; i++) {
      const zb = zTop - run * i;
      const zt = zb - run;
      const y = y0 + ((y1 - y0) * (i + 1)) / n;
      kit.boxMM("impTrim", [x0, y1 - 0.14, zt], [x1, y - 0.03, zb], { color: BLACK, texel: 0.5 });
      kit.boxMM("impDeck", [x0 + 0.02, y - 0.03, zt + 0.02], [x1 - 0.02, y, zb - 0.02], { color: GREY, texel: 1 });
      kit.boxMM("impMetal", [x0 + 0.02, y - 0.012, zt], [x1 - 0.02, y + 0.008, zt + 0.07], { color: GREYD, texel: 2 });
    }
  }
  function slopedRail(x, side, zBot, zTop, yBot, yTop) {
    const a = new THREE.Vector3(x, yBot + 0.95, zBot);
    const b = new THREE.Vector3(x, yTop + 0.95, zTop);
    tube(kit, "impMetal", a, b, 0.025, { color: GREYD });
    for (let k = 0; k <= 3; k++) {
      const p = a.clone().lerp(b, k / 3);
      if (side === 0) kit.box("impTrim", p.x, p.y - 0.5, p.z, 0.05, 1.0, 0.05, { color: BLACK });
      else kit.box("impTrim", p.x + side * 0.06, p.y - 0.05, p.z, 0.12, 0.05, 0.05, { color: BLACK });
    }
  }
  for (const s of [-1, 1]) {
    const a = Math.min(s * STAIR.x0, s * STAIR.x1);
    const b = Math.max(s * STAIR.x0, s * STAIR.x1);
    kit.stairs(a, STAIR.zBot, b, STAIR.zTop, "z", STAIR.zTop, STAIR.zBot, 0, PIT_Y);
    stairBlock(a + (s > 0 ? 0.06 : 0), b - (s > 0 ? 0 : 0.06), STAIR.zTop, STAIR.zBot, 0, PIT_Y);
    // wall side: plain black backing under the walkway edge (the pit face proper stops at the stair)
    const wa = Math.min(s * (PIT.x0 - 0.5), s * (PIT.x0 + 0.06));
    const wb = Math.max(s * (PIT.x0 - 0.5), s * (PIT.x0 + 0.06));
    kit.boxMM("impTrim", [wa, PIT_Y - 0.14, STAIR.zBot - 0.02], [wb, 0.0, STAIR.zTop + 0.02], { color: BLACK, texel: 1 });
    kit.collider([Math.min(s * (PIT.x0 - 0.5), s * PIT.x0), PIT_Y, STAIR.zBot], [Math.max(s * (PIT.x0 - 0.5), s * PIT.x0), 0, STAIR.zTop], "stairwall");
    slopedRail(s * (PIT.x0 + 0.12), s, STAIR.zBot + 0.1, STAIR.zTop - 0.1, PIT_Y, 0);
    // one sloped guide light in the wall-side backing, 0.3 m over the treads (no lit nosings)
    {
      const a = new THREE.Vector3(s * (PIT.x0 + 0.09), PIT_Y + 0.3, STAIR.zBot + 0.3);
      const b = new THREE.Vector3(s * (PIT.x0 + 0.09), 0.3 - 0.18, STAIR.zTop - 0.3);
      const d = b.clone().sub(a);
      const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, d.clone().normalize());
      const mid = a.clone().add(b).multiplyScalar(0.5);
      kit.add("impTrim", new THREE.BoxGeometry(0.06, 0.08, d.length() + 0.1), { pos: [mid.x, mid.y, mid.z], quat: q, color: BLACK });
      kit.add("emitWhiteDim", new THREE.BoxGeometry(0.02, 0.03, d.length()), { pos: [mid.x + s * 0.03, mid.y, mid.z], quat: q, uv: "keep" });
    }
    // open side: sloped handrail on posts + a thin collider wall the full height of the run
    const ox = s * (STAIR.x1 - 0.06);
    slopedRail(ox, 0, STAIR.zBot + 0.1, STAIR.zTop - 0.1, PIT_Y, 0);
    kit.collider([ox - 0.05, PIT_Y, STAIR.zBot], [ox + 0.05, 1.0, STAIR.zTop], "stairrail");
  }

  // railings (1.05 m): dim blue rail light along the walkway only; plain rails on the other pit edges
  const rail = (a, b, lit = false) => impRailing(kit, a, b, 0, { h: 1.05, postStep: 1.6, light: lit ? "emitBlueDim" : null, color: GREYD });
  for (const s of [-1, 1]) {
    rail([s * RAIL_X, PIT.z1 - 0.2], [s * RAIL_X, PIT.z0 + 0.2], true);
    rail([s * RAIL_X, PIT.z0 + 0.2], [s * (PIT.x1 + 0.2), PIT.z0 + 0.2]);
    rail([s * (PIT.x1 + 0.2), PIT.z0 + 0.2], [s * (PIT.x1 + 0.2), PIT.z1 - 0.2]);
    rail([s * (PIT.x1 + 0.2), PIT.z1 - 0.2], [s * (STAIR.x1 + 0.25), PIT.z1 - 0.2]);
  }

  // =========================================================================
  // 3. Stations (consoles + chairs + crew spots)
  // =========================================================================
  function station(cx, cy, cz, w, d, yaw, o = {}) {
    impConsole(kit, cx, cy, cz, w, d, { yaw, seed: o.seed || 3, screens: o.screens || ["scrBlue0", "scrBlue1"], accentKey: o.accentKey || accentKey, tall: !!o.tall });
    const fxv = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const seated = o.chair !== false;
    const off = d / 2 + (seated ? 0.62 : 0.5);
    const px = cx + fxv * off;
    const pz = cz + fz * off;
    if (seated) impChair(kit, px, cy, pz, yaw);
    if (o.backPanel) {
      // dressed rear face (service panel with vents, a readout strip and a lamp) for consoles seen from behind
      const { q, place } = placer(cx, cy, cz, yaw);
      const add = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
        const p = place(lx, ly, lz);
        kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
      };
      add("impMetalRough", 0, 0.47, -d / 2 - 0.012, w - 0.3, 0.62, 0.024, { color: GREYD, uv: "world", texel: 1 });
      for (let k = 0; k < 6; k++) add("impTrim", -w / 4 + 0.05, 0.3 + k * 0.07, -d / 2 - 0.028, w / 2 - 0.5, 0.025, 0.01, { color: BLACK });
      add("impTrim", w / 4 - 0.05, 0.62, -d / 2 - 0.028, w / 2 - 0.5, 0.14, 0.01, { color: BLACK });
      add("leds", w / 4 - 0.05, 0.64, -d / 2 - 0.036, w / 2 - 0.6, 0.05, 0.006, { uv: "keep" });
      add("emitBlueDim", 0, 0.12, -d / 2 - 0.02, w - 0.5, 0.025, 0.008, { uv: "keep" });
      const dp = place(w / 4 - 0.05, 0.4, -d / 2 - 0.03);
      kit.add("decalImp", new THREE.PlaneGeometry(0.26, 0.26).rotateY(Math.PI), { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs1) });
    }
    crewSpots.push({ id: o.label || `station${crewSpots.length}`, x: +px.toFixed(2), y: cy, z: +pz.toFixed(2), yaw: +yaw.toFixed(3), seated });
  }
  const scr = {
    blue: ["scrBlue0", "scrBlue1"],
    blue2: ["scrBlue2", "scrBlue3"],
    mix: ["scrBlue1", "scrAmber0"],
    red: ["scrRed0", "scrBlue2"],
    green: ["scrGreen0", "scrBlue3"],
    white: ["scrWhite0", "scrBlue0"],
    amber: ["scrAmber1", "scrAmber0"],
  };
  // --- crew pits: two rows along the pit walls (operators face the walls), tall stations at the
  //     forward end (displays face aft, up the pit), low consoles at the aft end, supervisor's table
  for (const s of [-1, 1]) {
    const side = s > 0 ? "stbd" : "port";
    // inner row stops at z 3.1 so the stair lands in a clear bay; aft stations sit clear of the stair foot
    [-10.2, -7.2, -4.2, -1.2, 1.8].forEach((zc, i) => station(s * 4.6, PIT_Y, zc, 2.6, 0.9, s > 0 ? Math.PI / 2 : -Math.PI / 2, { seed: 100 + i + s, screens: [scr.blue, scr.mix, scr.green, scr.blue2, scr.white][i], label: `${side}-pit-inner-${i}` }));
    [-9.6, -6.4, -3.2, 0, 3.2, 6.4].forEach((zc, i) => station(s * 13.4, PIT_Y, zc, 2.6, 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: 120 + i - s, screens: [scr.mix, scr.blue2, scr.blue, scr.red, scr.amber, scr.blue][i], label: `${side}-pit-outer-${i}` }));
    for (const [xc, k] of [[7.7, 0], [10.3, 1]]) station(s * xc, PIT_Y, -10.8, 2.4, 0.9, 0, { seed: 140 + k + s, screens: k ? scr.mix : scr.blue2, tall: true, label: `${side}-pit-fwd-${k}` });
    for (const [xc, k] of [[8.6, 0], [11.2, 1]]) station(s * xc, PIT_Y, 8.4, 2.4, 0.9, Math.PI, { seed: 150 + k - s, screens: k ? scr.blue : scr.green, backPanel: true, label: `${side}-pit-aft-${k}` });
    plotTable(kit, fx, s * 9.4, PIT_Y, -1.2);
    crewSpots.push({ id: `${side}-pit-supervisor`, x: s * 9.4, y: PIT_Y, z: 0.15, yaw: 0, seated: false });
  }
  // --- command platform: holo table on the axis, display columns flanking the walkway's end,
  //     flag officers at the centre viewport, standing stations / scopes / cabinets under the viewports
  const holo = buildHoloTable(kit, M, 0, 0, -12.95, accentKey);
  for (const s of [-1, 1]) {
    displayColumn(kit, fx, s * 3.3, 0, -12.55, Math.PI, 260 + s);
    crewSpots.push({ id: s > 0 ? "executive-officer" : "flag-officer", x: s * 2.4, y: 0, z: -13.6, yaw: 0, seated: false });
    for (const [xc, k] of [[5.4, 0], [8.8, 1], [12.2, 2], [18.6, 3], [22.0, 4], [25.4, 5]]) {
      station(s * xc, 0, NF + 0.5, 3.2, 0.9, 0, { seed: 200 + k * 2 + (s > 0 ? 1 : 0), screens: [scr.red, scr.blue, scr.mix, scr.green, scr.amber, scr.blue2][k], chair: false, label: `fwd-bank-${s > 0 ? "s" : "p"}${k}`, accentKey: k === 0 ? "emitRedImp" : accentKey });
    }
    scopeStation(kit, fx, s * 15.4, 0, NF + 0.75, 0, 3 + s);
    crewSpots.push({ id: `${s > 0 ? "stbd" : "port"}-scope`, x: s * 15.4, y: 0, z: NF + 1.55, yaw: 0, seated: false });
    for (const xc of [28.3, 29.8]) cabinet(kit, fx, s * xc, 0, NF + 0.36, 0, 420 + Math.round(xc) + s, 1.4, 2.1, 0.7);
  }
  crewSpots.push({ id: "commander", x: 0, y: 0, z: -11.3, yaw: 0, seated: false });

  // --- outer decks: tactical wall display + wall stations, equipment banks, comms alcove, computer
  //     bank island, standing stations, structural columns
  let k2 = 0;
  for (const s of [-1, 1]) {
    const f = (s > 0 ? walls.E : walls.W).frame;
    const uOf = (z) => (s > 0 ? z + hz : hz - z);
    const side = s > 0 ? "stbd" : "port";
    // tactical wall display (bridge_tacScreen) with header, ledge and standing stations beneath
    const uc = uOf(0.6);
    f.box("impTrim", uc, 3.7, 0.22, 9.2, 4.2, 0.16, { color: BLACK, texel: 1 });
    f.box("impGloss", uc, 3.75, 0.31, 8.5, 3.65, 0.02);
    f.screen("bridge_tacScreen", uc, 3.75, 0.325, 8.2, 3.5);
    f.box("impMetal", uc, 5.85, 0.31, 8.8, 0.12, 0.04, { color: CHAR });
    f.box("emitBlueDim", uc, 5.85, 0.335, 8.4, 0.04, 0.01);
    f.box("impMetal", uc, 1.62, 0.36, 9.0, 0.12, 0.32, { color: CHAR, texel: 1 });
    f.box("emitWhiteDim", uc, 1.58, 0.44, 8.4, 0.03, 0.1, { uv: "keep" });
    for (let k = 0; k < 6; k++) f.box("impGloss", uc - 3.5 + k * 1.4, 1.42, 0.34, 0.9, 0.16, 0.02);
    f.collider(uc - 4.7, uc + 4.7, 0, 6.2, 0, 0.4, "tacscreen");
    for (const [zc, k] of [[-2.4, 0], [0.6, 1], [3.6, 2]]) station(s * 31.2, 0, zc, 2.6, 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: 300 + k + s, screens: [scr.blue, scr.mix, scr.white][k], chair: false, label: `${side}-tactical-${k}` });
    // equipment banks forward along the side wall
    for (let k = 0; k < 4; k++) cabinet(kit, fx, s * 31.55, 0, -12.6 + k * 1.75, s > 0 ? -Math.PI / 2 : Math.PI / 2, 320 + k * 3 + s);
    impWallGear(f, uOf(-6.4), 3.3, { seed: 7 + s, accentKey });
    // comms alcove at the aft corner: wall board, console, relay mast
    const uc2 = uOf(12.2);
    f.box("impTrim", uc2, 2.6, 0.2, 3.6, 2.2, 0.12, { color: BLACK, texel: 1 });
    f.box("impMetal", uc2, 2.6, 0.27, 3.4, 2.0, 0.02, { color: CHAR, texel: 2 });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const u = uc2 - 1.35 + c * 0.9;
        const v = 3.3 - r * 0.45;
        if ((r + c) % 3 === 0) f.screen(["scrAmber0", "scrBlue2", "scrGreen0"][(r + c) % 3], u, v, 0.285, 0.7, 0.32);
        else {
          f.box("impGloss", u, v, 0.28, 0.72, 0.34, 0.01);
          f.box("leds", u, v + 0.08, 0.29, 0.6, 0.05, 0.005, { uv: "keep" });
          const p = f.pos(u - 0.2 + (c % 2) * 0.4, v - 0.08, 0.295);
          fx.lamp(["red", "amber", "blue"][(r * 4 + c) % 3], p.x, p.y, p.z, 0.05, 0.04, 0.02);
        }
      }
    }
    f.decal(IMP_DECAL.glyphs3, uc2 + 1.4, 3.85, 0.21, 0.5);
    station(s * 31.2, 0, 12.2, 2.4, 0.9, s > 0 ? -Math.PI / 2 : Math.PI / 2, { seed: 340 + s, screens: scr.mix, label: `${side}-comms-0` });
    commsMast(kit, fx, s * 28.2, 0, 13.6);
    // computer bank island: two rows of cabinets back to back with a cable-tray spine on top
    const BANK = { z0: -5.6, z1: 5.0, n: 7 };
    for (let k = 0; k < BANK.n; k++) {
      const zc = BANK.z0 + 0.8 + k * 1.5;
      cabinet(kit, fx, s * 19.2, 0, zc, s > 0 ? -Math.PI / 2 : Math.PI / 2, 500 + k * 2 + s, 1.4, 2.3, 0.7);
      cabinet(kit, fx, s * 19.94, 0, zc, s > 0 ? Math.PI / 2 : -Math.PI / 2, 501 + k * 2 + s, 1.4, 2.3, 0.7);
    }
    {
      const a = Math.min(s * 18.7, s * 20.44);
      const b = Math.max(s * 18.7, s * 20.44);
      const zm = (BANK.z0 + BANK.z1) / 2;
      kit.boxMM("impTrim", [a, 2.4, BANK.z0], [b, 2.62, BANK.z1], { color: BLACK, texel: 1 });
      kit.boxMM("impMetal", [a + 0.1, 2.62, BANK.z0 + 0.1], [b - 0.1, 2.66, BANK.z1 - 0.1], { color: CHAR });
      for (let k = 0; k < 3; k++) kit.cyl("impMetal", s * (19.2 + k * 0.35), 2.72, zm, 0.045, BANK.z1 - BANK.z0 - 0.4, "z", { color: [GREYD, CHAR, GREY][k], segments: 8 });
      for (const zc of [BANK.z0 + 0.2, zm, BANK.z1 - 0.2]) kit.boxMM("impTrim", [a + 0.2, 2.62, zc - 0.05], [b - 0.2, 2.82, zc + 0.05], { color: BLACK });
      for (const e of [a, b]) kit.boxMM("emitBlueDim", [e - 0.01, 2.46, BANK.z0 + 0.2], [e + 0.01, 2.5, BANK.z1 - 0.2], { uv: "keep" });
      for (const [ze, dz] of [[BANK.z0, -1], [BANK.z1, 1]]) {
        const z0 = Math.min(ze, ze + dz * 0.08);
        const z1 = Math.max(ze, ze + dz * 0.08);
        const zf = ze + dz * 0.08;
        kit.boxMM("impTrim", [a, 0, z0], [b, 2.4, z1], { color: BLACK, texel: 1 });
        kit.boxMM("impPanel1", [a + 0.12, 0.3, Math.min(zf, zf + dz * 0.03)], [b - 0.12, 2.1, Math.max(zf, zf + dz * 0.03)], { color: GREY, uv: "world", texel: 1 });
        kit.boxMM("impTrim", [a + 0.2, 2.12, Math.min(zf, zf + dz * 0.06)], [b - 0.2, 2.3, Math.max(zf, zf + dz * 0.06)], { color: BLACK });
        kit.boxMM("emitWhiteDim", [a + 0.3, 2.18, Math.min(zf + dz * 0.06, zf + dz * 0.07)], [b - 0.3, 2.24, Math.max(zf + dz * 0.06, zf + dz * 0.07)], { uv: "keep" });
        kit.boxMM("impGloss", [s * 19.57 - 0.5, 1.55, Math.min(zf + dz * 0.03, zf + dz * 0.05)], [s * 19.57 + 0.5, 1.95, Math.max(zf + dz * 0.03, zf + dz * 0.05)]);
        kit.add(k2 % 2 ? "scrAmber0" : "scrBlue3", new THREE.PlaneGeometry(0.9, 0.3).rotateY(dz > 0 ? 0 : Math.PI), { pos: [s * 19.57, 1.75, zf + dz * 0.055], uv: "keep" });
        kit.add("decalImp", new THREE.PlaneGeometry(0.6, 0.6).rotateY(dz > 0 ? 0 : Math.PI), { pos: [s * 19.57, 0.95, zf + dz * 0.035], uv: "keep", uvRect: impDecalRect(IMP_DECAL.power) });
        for (let k = 0; k < 3; k++) fx.lamp(["blue", "red", "amber"][k], s * 19.57 - 0.4 + k * 0.4, 0.45, zf + dz * 0.04, 0.06, 0.04, 0.02);
        kit.collider([a, 0, z0], [b, 2.4, z1], "bankEnd");
        k2++;
      }
    }
    // standing stations on the open deck between the bank and the wall lane (operators face forward)
    for (const [zc, k] of [[-6.4, 0], [-2.6, 1], [1.2, 2]]) station(s * 27.4, 0, zc, 2.6, 0.9, 0, { seed: 360 + k + s, screens: [scr.mix, scr.blue, scr.white][k], chair: false, label: `${side}-deck-${k}` });
    // structural columns with ribs to the side wall
    for (const zc of [-5.6, 3.4]) {
      impPillar(kit, s * 16.2, zc, CEIL, { w: 0.8, accentKey: "emitBlueDim" });
      kit.boxMM("impTrim", [Math.min(s * 16.2, s * hx), CEIL - 0.75, zc - 0.22], [Math.max(s * 16.2, s * hx), CEIL - 0.35, zc + 0.22], { color: BLACK, texel: 1 });
      kit.boxMM("impMetal", [Math.min(s * 16.2, s * (hx - 0.2)), CEIL - 0.72, zc - 0.05], [Math.max(s * 16.2, s * (hx - 0.2)), CEIL - 0.62, zc + 0.05], { color: CHAR });
    }
  }
  // --- aft deck: crest plate over the door, directory boards, guard alcoves, lockers, benches, pillars
  {
    const f = walls.S.frame; // u = hx - x
    f.box("impTrim", hx, 5.05, 0.16, 3.2, 2.6, 0.06, { color: BLACK, texel: 1 });
    f.box("impMetal", hx, 5.05, 0.2, 3.0, 2.4, 0.02, { color: CHAR, texel: 2 });
    f.decal(IMP_DECAL.cog, hx, 5.05, 0.215, 2.2);
    f.box("impMetal", hx, 3.82, 0.2, 3.0, 0.06, 0.2, { color: CHAR });
    f.box("emitWhiteDim", hx, 3.8, 0.24, 2.6, 0.02, 0.14, { uv: "keep" });
    for (const s of [-1, 1]) {
      const u = hx - s * 7;
      f.box("impTrim", u, 1.95, 0.22, 1.7, 3.3, 0.16, { color: BLACK, texel: 1 });
      f.box("impGloss", u, 2.0, 0.31, 1.44, 2.9, 0.02);
      f.screen("bridge_statusBoard", u, 2.0, 0.325, 1.32, 2.64);
      f.box("emitBlueDim", u, 3.66, 0.31, 1.3, 0.04, 0.02);
      f.box("impMetal", u, 0.2, 0.35, 1.5, 0.1, 0.3, { color: CHAR });
      f.collider(u - 0.85, u + 0.85, 0, 3.6, 0, 0.36, "directory");
      guardAlcove(kit, fx, f, hx - s * 12.5);
      f.decal(IMP_DECAL.turbolift, hx - s * 4.4, 3.95, 0.16, 0.5);
      f.decal(IMP_DECAL.arrowRight, hx - s * 3.6, 3.95, 0.16, 0.45);
      for (let k = 0; k < 3; k++) cabinet(kit, fx, s * (24.2 + k * 1.6), 0, hz - 0.42, 0, 400 + k + s, 1.4, 2.1, 0.7);
      kit.boxMM("impTrim", [Math.min(s * 15.4, s * 18.6), 0, hz - 0.95], [Math.max(s * 15.4, s * 18.6), 0.46, hz - 0.3], { color: BLACK, texel: 1 });
      kit.boxMM("rubber", [Math.min(s * 15.5, s * 18.5), 0.46, hz - 0.9], [Math.max(s * 15.5, s * 18.5), 0.54, hz - 0.34], { color: GREYD });
      kit.collider([Math.min(s * 15.4, s * 18.6), 0, hz - 1.0], [Math.max(s * 15.4, s * 18.6), 0.6, hz], "bench");
      impPillar(kit, s * 14.9, 11.5, CEIL, { w: 0.8, accentKey: "emitBlueDim" });
    }
    // door surround: two guard posts flanking the blast door
    for (const s of [-1, 1]) {
      const px = s * 2.5;
      kit.box("impTrim", px, 0.8, hz - 0.45, 0.5, 1.6, 0.5, { color: BLACK, texel: 1 });
      kit.box("impMetal", px, 1.4, hz - 0.71, 0.36, 0.5, 0.02, { color: CHAR });
      kit.box("emitRedDim", px, 1.52, hz - 0.725, 0.12, 0.06, 0.01);
      kit.box("impGloss", px, 1.3, hz - 0.725, 0.24, 0.16, 0.01);
      kit.collider([px - 0.25, 0, hz - 0.7], [px + 0.25, 1.7, hz], "post");
    }
  }

  // =========================================================================
  // 4. Animated overlays: blinking status lamps, tactical screen sweep bars, alert strips, hologram
  // =========================================================================
  const anim = fx.build(kit, M);
  const sweeps = [];
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.4, 0.05), M.holoBright);
    bar.position.set(s * (hx - 0.35), 3.75, 0.6);
    sweeps.push(kit.attach(bar));
  }
  kit.onUpdate((dt, t) => {
    holo.update(dt, t);
    const rate = state.alert ? 2.2 : 1;
    if (anim.red) anim.red.visible = (t * 0.9 * rate) % 1 < 0.55;
    if (anim.blue) anim.blue.visible = (t * 0.6 * rate + 0.3) % 1 < 0.7;
    if (anim.amber) anim.amber.visible = (t * 1.3 * rate + 0.6) % 1 < 0.45;
    for (let i = 0; i < sweeps.length; i++) sweeps[i].position.z = 0.6 - 3.9 + ((t * 0.09 + i * 0.5) % 1) * 7.8;
  });

  // =========================================================================
  // 5. Lights (8): the starlight key from the viewports casts the shadows down the walkway
  // =========================================================================
  const alertDim = (t) => (state.alert ? 0.7 + 0.3 * Math.sin(t * 5) : 1);
  // starlight key: sits inside the centre viewport tunnel, so the sill, head and jambs clip its cone to the
  // window shape; it rakes the command platform and the walkway and throws the railing shadows aft
  kit.light({ type: "spot", pos: [0, 4.0, -hz - 0.25], target: [0, 0, 1], color: 0xd8e6ff, intensity: 240, distance: 40, angle: 0.95, penumbra: 0.55, shadow: true, priority: 1.0, dim: alertDim });
  // aft deck: a cool fill over the floor crest that also reaches the door, the guard posts and the crest
  // plate (kept 2 m off the wall so the plate does not blow out)
  kit.light({ type: "point", pos: [0, 3.4, hz - 2.6], color: 0xe6ecff, intensity: lux(3.4, 1.0), distance: 16, priority: 0.8 });
  for (const s of [-1, 1]) {
    // pit fill: blue-white from the console banks, low; set aft of centre because the key spills into the
    // pits' forward ends through the viewports
    kit.light({ type: "point", pos: [s * 9, 1.6, 1.5], color: 0xa8c8ff, intensity: 28, distance: 24, priority: 0.85 - (s > 0 ? 0.01 : 0) });
    // one red practical per guard alcove
    kit.light({ type: "point", pos: [s * 12.5, 2.6, hz - 0.8], color: 0xff4030, intensity: lux(2.6, 0.9), distance: 9, priority: 0.6 - (s > 0 ? 0.01 : 0) });
    // outer decks: dim white from the ceiling slots
    kit.light({ type: "point", pos: [s * 23, CEIL - 0.6, -2], color: 0xdfe8ff, intensity: lux(CEIL - 0.6, 1.1), distance: 26, priority: 0.7 - (s > 0 ? 0.01 : 0) });
  }

  // =========================================================================
  // 6. Runtime hooks
  // =========================================================================
  kit.api = {
    crewSpots,
    setAlert(on) {
      state.alert = !!on;
      if (anim.alert) anim.alert.visible = state.alert;
    },
    get alert() {
      return state.alert;
    },
  };
  void rng;
}
