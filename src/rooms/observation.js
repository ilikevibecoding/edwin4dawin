// Forward Observation Gallery (Deck B): a 96 m gallery directly behind the tower's forward face.
// Its north wall carries the six wide gallery viewport bays cut into the hull (three per side, each
// ~11.7 m wide between 0.9 m hull mullions), each lined with a window tunnel that runs right through
// the hull face slab to the glass; the solid centre holds the Imperial crest as the room's second key.
// Dim, blue, quiet: a viewing rail with standing scopes, benches, and a cut-away hologram of the
// tower on the data column; the view outside is the point.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { roomWalls, wallFrame, impWall, impFloor, impCeiling, impRailing, openingsFor, lux } from "./imperial_kit.js";
import { panelWithHoles } from "../kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { TOWER } from "../spec.js";
import { bench, propFrame, rod, floorStrip, holoTowerMap, cableRun, deckBSetup } from "./deck_b_props.js";

export function buildObservation(kit, ctx, room) {
  deckBSetup(kit);
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const seed = 4101;
  const walls = roomWalls(kit, room);

  // --- E, S, W walls: standard Imperial panelling (door to the lobby on the S wall), wide 2.3 m panels
  for (const side of ["E", "S", "W"]) {
    const { frame, length } = walls[side];
    impWall(frame, length, h, {
      openings: openingsFor(room, ctx.doors, side),
      seed: seed + side.charCodeAt(0),
      accentKey,
      tag: room.id + side,
      panelW: 2.3,
      bands: [0.9],
      features: { vent: 0.06, equipment: 0.07, conduit: 0.05, light: 0.05, screen: 0.06 },
    });
  }

  // --- N wall: three wide viewport bays per side, solid crest section in the middle
  const gv = TOWER.galleryViewports;
  const gw = (gv.x1 - gv.x0) / gv.count; // bay pitch (12.67 m); hull opening = pitch - 0.9
  const vc = (gv.y0 + gv.y1) / 2 - room.origin[1]; // window centre height (2.3 m)
  const lineW = gw - 0.9 - 0.1; // tunnel lining outer size: 5 cm inside the hull opening all round
  const lineH = gv.y1 - gv.y0 - 0.1;
  const N = walls.N.frame; // u = x + hx
  const winP = { h, vc, lineW, lineH, accentKey, pitch: gw };
  const bayX = [];
  for (const s of [-1, 1]) {
    const centres = [];
    for (let i = 0; i < gv.count; i++) centres.push(hx + s * (gv.x0 + gw * (i + 0.5)));
    centres.sort((a, b) => a - b);
    const u0 = s < 0 ? 0 : hx + gv.x0;
    const u1 = s < 0 ? hx - gv.x0 : w;
    windowRun(kit, N, u0, u1, centres, winP, room.id + "N" + (s < 0 ? "W" : "E"));
    bayX.push(...centres.map((u) => u - hx));
  }
  // centre section (x -8..8): panelled, with the crest on a lit plate, two tall light slots, uplights
  {
    const { frame: cF, length: cL } = wallFrame(kit, [-gv.x0, -hz], [gv.x0, -hz]);
    impWall(cF, cL, h, { seed: seed + 7, accentKey, tag: room.id + "Nc", panelW: 2.0, features: {}, altChance: 0, bands: [1.15] });
    const cu = cL / 2;
    cF.box("impTrim", cu, 2.6, 0.11, 4.5, 4.1, 0.1, { color: PALETTE.impBlack, texel: 1 });
    cF.box("impMetal", cu, 2.6, 0.166, 4.2, 3.8, 0.012, { color: PALETTE.impGreyDark, texel: 1 });
    cF.decal(IMP_DECAL.cog, cu, 2.65, 0.176, 3.4);
    cF.box(accentKey, cu, 2.6 - 1.98, 0.17, 3.6, 0.03, 0.012);
    cF.box(accentKey, cu, 2.6 + 1.98, 0.17, 3.6, 0.03, 0.012);
    // dedication plate under the crest
    cF.box("impGloss", cu, 0.62, 0.1, 2.4, 0.34, 0.05);
    cF.decal(IMP_DECAL.glyphs3, cu - 0.65, 0.62, 0.128, 0.9, { h: 0.24 });
    cF.decal(IMP_DECAL.glyphs1, cu + 0.65, 0.62, 0.128, 0.9, { h: 0.24 });
    for (const s of [-1, 1]) {
      const su = cu + s * 3.1;
      cF.box("impTrim", su, 2.55, 0.1, 0.34, 3.9, 0.09, { color: PALETTE.impBlack, texel: 1 });
      cF.box("emitWhiteSoft", su, 2.55, 0.15, 0.12, 3.7, 0.012, { uv: "keep" });
      // floor uplight can aimed at the crest
      const ux = s * 1.3;
      kit.box("impTrim", ux, 0.16, -hz + 0.55, 0.5, 0.32, 0.4, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", ux, 0.33, -hz + 0.55, 0.42, 0.02, 0.32, { color: PALETTE.impCharcoal });
      kit.box("emitWhiteSoft", ux, 0.345, -hz + 0.5, 0.34, 0.012, 0.16, { uv: "keep" });
      kit.collider([ux - 0.26, 0, -hz + 0.34], [ux + 0.26, 0.36, -hz + 0.76], "uplight");
    }
    cF.collider(cu - 2.3, cu + 2.3, 0, h, 0, 0.19, "emblem");
  }

  // --- floor and ceiling
  impFloor(kit, -hx, -hz, hx, hz, { laneAxis: "x", laneW: 2.6, texel: 0.5 });
  impCeiling(kit, -hx, -hz, hx, hz, h, { troughs: 0, beamStep: 3.2, seed: seed + 3, accentKey });
  // dim blue floor-edge strips along the window wall and the aft wall (broken at the door)
  for (const s of [-1, 1]) {
    floorStrip(kit, "emitBlueDim", s * (gv.x0 + 0.6), -hz + 0.3, s * (gv.x1 - 0.3), -hz + 0.36);
    floorStrip(kit, "emitBlueDim", s * 2.2, hz - 0.26, s * (hx - 0.6), hz - 0.2);
  }

  // --- structural ribs on every window pier (the hull mullions): ceiling beam + pilasters both sides
  const ribX = [gv.x0, gv.x0 + gw, gv.x0 + 2 * gw, gv.x1].flatMap((x) => [-x, x]);
  const ribW = 0.6;
  for (const x of ribX) {
    kit.box("impTrim", x, h - 0.3, 0, ribW, 0.6, d, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", x, h - 0.62, 0, ribW - 0.16, 0.06, d - 0.8, { color: PALETTE.impCharcoal, texel: 1 });
    kit.box(accentKey, x, h - 0.658, 0, 0.1, 0.012, d - 1.6);
    for (const s of [-1, 1]) {
      const z = s * (hz - 0.2);
      const zFace = s * (hz - 0.4);
      kit.box("impTrim", x, (h - 0.6) / 2, z, ribW, h - 0.6, 0.4, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", x, 0.25, z - s * 0.02, ribW + 0.1, 0.5, 0.46, { color: PALETTE.impCharcoal, texel: 1 });
      kit.box("impMetal", x, h * 0.55, zFace - s * 0.01, 0.3, h * 0.5, 0.02, { color: PALETTE.impCharcoal });
      kit.box(accentKey, x, h * 0.55, zFace - s * 0.025, 0.05, h * 0.42, 0.012);
      kit.collider([x - ribW / 2, 0, Math.min(z - 0.23, z + 0.23)], [x + ribW / 2, h, Math.max(z - 0.23, z + 0.23)], "rib");
    }
  }
  // long ceiling light troughs (dim blue) between the ribs, either side of the walkway
  const ribSorted = [-hx, ...ribX.slice().sort((a, b) => a - b), hx];
  for (let i = 0; i < ribSorted.length - 1; i++) {
    const xa = ribSorted[i] + (i === 0 ? 0.3 : ribW / 2 + 0.3);
    const xb = ribSorted[i + 1] - (i === ribSorted.length - 2 ? 0.3 : ribW / 2 + 0.3);
    if (xb - xa < 1.5) continue;
    for (const z of [-3.2, 3.2]) {
      kit.boxMM("impTrim", [xa, h - 0.03, z - 0.36], [xb, h + 0.02, z + 0.36], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM("impMetal", [xa + 0.1, h - 0.1, z - 0.26], [xb - 0.1, h - 0.03, z + 0.26], { color: PALETTE.impCharcoal, texel: 1 });
      kit.boxMM("emitBlueDim", [xa + 0.2, h - 0.115, z - 0.16], [xb - 0.2, h - 0.095, z + 0.16], { uv: "keep" });
      for (let f = xa + 0.4; f < xb - 0.3; f += 0.6) kit.boxMM("impTrim", [f, h - 0.15, z - 0.22], [f + 0.03, h - 0.115, z + 0.22], { color: PALETTE.impBlack });
    }
  }

  // --- viewing rail 1.1 m in front of the windows (unlit; open in the centre so the crest can be approached)
  for (const s of [-1, 1]) {
    const xa = s * (gv.x0 + 0.5);
    const xb = s * (gv.x1 + 0.4);
    impRailing(kit, [Math.min(xa, xb), -hz + 1.1], [Math.max(xa, xb), -hz + 1.1], 0, { h: 1.0, postStep: gw / 4, color: PALETTE.impCharcoal });
  }
  // --- standing scopes at the rail: one at the inner edge of the first bay each side (in the spawn
  // view), one at the middle bay
  for (const s of [-1, 1]) for (const x of [gv.x0 + 3.0, gv.x0 + gw * 1.5]) viewer(kit, s * x, -hz + 1.85, 0, accentKey);

  // --- benches: along the aft wall on the mullion axes, and island benches facing the view
  const benchColor = new THREE.Color("#3b4250");
  for (const s of [-1, 1]) {
    bench(kit, s * 4.6, hz - 0.55, 3.0, 0, { pad: "fabric", padColor: benchColor, accentKey });
    for (const x of [gv.x0 + gw, gv.x0 + 2 * gw]) bench(kit, s * x, hz - 0.55, 4.2, 0, { pad: "fabric", padColor: benchColor, accentKey });
    for (const x of [gv.x0 + 0.5 * gw, gv.x0 + 2.5 * gw]) bench(kit, s * x, -3.4, 4.0, 0, { pad: "fabric", padColor: benchColor, accentKey });
  }

  // --- data column with the slowly turning tower cut-away
  const tower = dataColumn(kit, ctx, 5.6, -3.0, accentKey);
  kit.onUpdate((dt, t) => {
    tower.group.rotation.y += dt * 0.18;
    tower.blip.visible = Math.sin(t * 4.0) > -0.2;
  });

  // --- lights: white fills over the walkway (hotter than the deck default: the windows are black
  // space and the ceiling is dark), cool fills on the rail / surrounds, the crest spot as the second
  // key, a blue glow at the data column, a warm wash on the aft benches
  const whites = [-32, -16, 0, 16, 32];
  whites.forEach((x, i) => {
    // pendant can under each fill so the light has a visible source and the ceiling above stays dark
    kit.cyl("impTrim", x, h - 0.2, 1.2, 0.3, 0.4, "y", { color: PALETTE.impBlack, segments: 18, texel: 1 });
    kit.cyl("impMetal", x, h - 0.41, 1.2, 0.24, 0.02, "y", { color: PALETTE.impCharcoal, segments: 18 });
    kit.cyl("emitWhiteDim", x, h - 0.425, 1.2, 0.18, 0.012, "y", { segments: 18, uv: "keep" });
    kit.light({ type: "point", pos: [x, h - 1.3, 1.2], color: 0xd8e4ff, intensity: lux(h - 1.3, 2.6), distance: 22, priority: 0.46 - Math.abs(i - 2) * 0.01 });
  });
  for (const s of [-1, 1]) {
    kit.light({ type: "point", pos: [s * 10.5, 2.6, -hz + 1.7], color: 0x9fc6ff, intensity: 7.0, distance: 13, priority: 0.4 });
    kit.light({ type: "point", pos: [s * 27, 2.6, -hz + 1.7], color: 0x9fc6ff, intensity: 7.0, distance: 13, priority: 0.3 });
  }
  kit.light({ type: "spot", pos: [0, h - 0.3, -hz + 3.4], target: [0, 2.5, -hz], color: 0xeef3ff, intensity: lux(4.5, 2.2), distance: 12, angle: 0.58, penumbra: 0.4, priority: 0.62 });
  kit.light({ type: "point", pos: [5.6, 2.0, -3.0], color: 0x6fa4ff, intensity: 3.5, distance: 6, priority: 0.36 });
  kit.light({ type: "point", pos: [0, h - 0.5, 6.0], color: 0xffe6cc, intensity: lux(h - 0.5, 1.6), distance: 12, priority: 0.35 });
}

/**
 * One run of gallery viewports on wall frame F between u0 and u1: black slab with the holes, sill
 * and lintel bands, black piers, a window surround per opening and the tunnel lining that runs from
 * the frame face right through the hull face slab (n -2..-3) to just short of its outer face, so the
 * raw hull cut is never visible; a flange hides the lining/hole gap at the slab's back.
 */
function windowRun(kit, F, u0, u1, centres, p, tag) {
  const { h, vc, lineW, lineH, accentKey, pitch } = p;
  const len = u1 - u0;
  const um = (u0 + u1) / 2;
  const kickH = 0.32;
  const corniceH = 0.36;
  const fieldV1 = h - corniceH;
  const iu = lineW / 2; // lining outer half-width
  const v0 = vc - lineH / 2; // lining outer bottom (1.05)
  const v1 = vc + lineH / 2; // lining outer top (3.55)
  const t = 0.05; // lining board thickness
  const tubeLen = 3.08; // from n = +0.10 (frame face) to n = -2.98 (2 cm inside the hull's outer face)
  const tubeN = 0.1 - tubeLen / 2;
  const bw = 0.16; // surround bar width
  // slab with the openings (2 cm inside the lining so the boards cover the cut edges)
  const holes = centres.map((u) => ({ x: u - um, y: vc - h / 2, w: lineW - 0.02, h: lineH - 0.02 }));
  F.add("impTrim", panelWithHoles(len, h, 0.4, holes), um, h / 2, -0.22, { color: PALETTE.impBlack, texel: 0.5 });
  // kick and cornice along the whole run
  F.box("impTrim", um, kickH / 2, 0.01, len, kickH, 0.06, { color: PALETTE.impBlack, texel: 1 });
  F.box("impMetal", um, kickH - 0.03, 0.045, len - 0.1, 0.03, 0.01, { color: PALETTE.impGreyDark, texel: 2 });
  F.box("impTrim", um, h - corniceH / 2, 0.01, len, corniceH, 0.06, { color: PALETTE.impBlack, texel: 1 });
  for (let k = 0; k < centres.length; k++) {
    const u = centres[k];
    // cornice light channel over the bay (three short dim segments, not one long bar)
    F.box("impMetal", u, h - corniceH * 0.55, 0.05, lineW - 0.4, 0.12, 0.02, { color: PALETTE.impCharcoal });
    for (const s of [-1, 0, 1]) F.box("emitWhiteDim", u + s * (lineW * 0.3), h - corniceH * 0.55, 0.065, lineW * 0.2, 0.04, 0.012, { uv: "keep" });
    // lintel panel above and sill panel below the opening
    F.box("impPanel", u, (v1 + bw + fieldV1) / 2, 0.005, lineW + 2 * bw, fieldV1 - v1 - bw - 0.04, 0.05, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    F.box("impPanel1", u, (kickH + v0 - bw) / 2, 0.005, lineW + 2 * bw, v0 - bw - kickH - 0.04, 0.05, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    F.box("impTrim", u, v0 - bw - 0.12, 0.035, lineW + 2 * bw, 0.02, 0.02, { color: PALETTE.impBlack });
    // bay label and a small readout on the sill panel
    F.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][k % 3], u + iu - 0.5, v1 + bw + 0.32, 0.034, 0.4);
    F.box("impTrim", u - iu + 0.6, 0.62, 0.03, 0.5, 0.2, 0.05, { color: PALETTE.impBlack });
    F.screen(k % 2 ? "scrBlue3" : "scrBlue2", u - iu + 0.6, 0.62, 0.058, 0.42, 0.14);
    // surround: black bars around the lining, proud of the wall (n 0..0.10)
    F.box("impTrim", u, v1 + bw / 2, 0.05, lineW + 2 * bw, bw, 0.1, { color: PALETTE.impBlack, texel: 1 });
    F.box("impTrim", u, v0 - bw / 2, 0.05, lineW + 2 * bw, bw, 0.1, { color: PALETTE.impBlack, texel: 1 });
    F.box("impTrim", u - iu - bw / 2, vc, 0.05, bw, lineH, 0.1, { color: PALETTE.impBlack, texel: 1 });
    F.box("impTrim", u + iu + bw / 2, vc, 0.05, bw, lineH, 0.1, { color: PALETTE.impBlack, texel: 1 });
    // blue hairline on the surround's inner top edge
    F.box(accentKey, u, v1 + 0.03, 0.105, lineW - 0.3, 0.02, 0.012);
    // tunnel lining: sill, lintel, two jambs; the sill carries three seam strips so the 11 m board reads as plates
    F.box("impPanel1", u, v0 + t / 2, tubeN, lineW, t, tubeLen, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    F.box("impTrim", u, v1 - t / 2, tubeN, lineW, t, tubeLen, { color: PALETTE.impBlack, texel: 1 });
    F.box("impPanel1", u - iu + t / 2, vc, tubeN, t, lineH - 2 * t, tubeLen, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    F.box("impPanel1", u + iu - t / 2, vc, tubeN, t, lineH - 2 * t, tubeLen, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    for (const s of [-1, 0, 1]) F.box("impTrim", u + s * lineW * 0.25, v0 + t + 0.006, tubeN, 0.04, 0.012, tubeLen - 0.1, { color: PALETTE.impBlack });
    // flange against the back of the hull face slab (1 cm lip inside the lining)
    const fi = iu - t + 0.01;
    const fv0 = v0 + t - 0.01;
    const fv1 = v1 - t + 0.01;
    F.box("impTrim", u, fv1 + 0.1, -2.023, 2 * fi + 0.44, 0.2, 0.035, { color: PALETTE.impBlack });
    F.box("impTrim", u, fv0 - 0.1, -2.023, 2 * fi + 0.44, 0.2, 0.035, { color: PALETTE.impBlack });
    F.box("impTrim", u - fi - 0.11, vc, -2.023, 0.22, fv1 - fv0, 0.035, { color: PALETTE.impBlack });
    F.box("impTrim", u + fi + 0.11, vc, -2.023, 0.22, fv1 - fv0, 0.035, { color: PALETTE.impBlack });
    // pier to the next window (the hull mullion): black column, the rib pilaster lands on it
    if (k < centres.length - 1) {
      const pu = (u + centres[k + 1]) / 2;
      const pw = pitch - lineW - 2 * bw;
      F.box("impTrim", pu, (kickH + fieldV1) / 2, 0.03, pw + 0.04, fieldV1 - kickH, 0.06, { color: PALETTE.impBlack, texel: 1 });
    }
  }
  // solid end panel(s) of the run: the 2.3 m at the hull corner and the filler at the centre
  const first = centres[0] - iu - bw;
  const last = centres[centres.length - 1] + iu + bw;
  for (const [a, b] of [[u0, first], [last, u1]]) {
    const cw = b - a;
    if (cw < 0.1) continue;
    const cu = (a + b) / 2;
    if (cw > 1.2) {
      F.box("impTrim", cu, (kickH + fieldV1) / 2, 0.01, cw, fieldV1 - kickH, 0.06, { color: PALETTE.impBlack, texel: 1 });
      F.box("impPanel2", cu, (kickH + fieldV1) / 2, 0.02, cw - 0.3, fieldV1 - kickH - 0.2, 0.05, { color: PALETTE.impWhite, uv: "world", texel: 1 });
      F.box("impTrim", cu, 2.4, 0.06, 0.3, 3.0, 0.08, { color: PALETTE.impBlack });
      F.box("emitWhiteDim", cu, 2.4, 0.105, 0.1, 2.8, 0.012, { uv: "keep" });
      F.decal(IMP_DECAL.arrowRight, cu, 0.68, 0.05, 0.4);
    } else {
      F.box("impTrim", cu, (kickH + fieldV1) / 2, 0.03, cw + 0.02, fieldV1 - kickH, 0.06, { color: PALETTE.impBlack, texel: 1 });
    }
  }
  // cable tray over the windows, clamped along the lintel band
  cableRun(F, u0 + 0.3, u1 - 0.3, 4.15, { n: 3, seed: 91, r: 0.03, clampStep: 2.1 });
  F.collider(u0, u1, 0, h, -0.42, 0.12, tag);
}

/** Standing viewer: tripod, column, tilted scope with a readout, facing -z (the windows). */
function viewer(kit, x, z, yaw, accentKey) {
  const f = propFrame(kit, x, 0, z, yaw);
  kit.cyl("impTrim", x, 0.02, z, 0.46, 0.04, "y", { color: PALETTE.impBlack, segments: 18 });
  for (let i = 0; i < 3; i++) {
    const a = yaw + Math.PI / 6 + (i * 2 * Math.PI) / 3;
    rod(kit, "impMetal", [x, 0.98, z], [x + Math.sin(a) * 0.36, 0.04, z + Math.cos(a) * 0.36], 0.025, { color: PALETTE.impGreyDark });
  }
  kit.cyl("impTrim", x, 1.0, z, 0.09, 0.14, "y", { color: PALETTE.impBlack, segments: 12 });
  kit.cyl("impMetal", x, 1.26, z, 0.04, 0.4, "y", { color: PALETTE.impGrey, segments: 10 });
  f.box("impTrim", 0, 1.48, 0, 0.16, 0.14, 0.16, { color: PALETTE.impBlack });
  const a = f.pos(0, 1.5, 0.36);
  const b = f.pos(0, 1.66, -0.62);
  const c = f.pos(0, 1.685, -0.8);
  rod(kit, "impMetal", [a.x, a.y, a.z], [b.x, b.y, b.z], 0.07, { color: PALETTE.impCharcoal, segments: 12 });
  rod(kit, "impTrim", [b.x, b.y, b.z], [c.x, c.y, c.z], 0.1, { color: PALETTE.impBlack, segments: 12 });
  const e = f.pos(0, 1.47, 0.54);
  rod(kit, "impGloss", [a.x, a.y, a.z], [e.x, e.y, e.z], 0.04, { segments: 10 });
  f.box("impTrim", 0, 1.3, 0.13, 0.26, 0.18, 0.05, { color: PALETTE.impBlack });
  f.screen("scrBlue2", 0, 1.31, 0.157, 0.2, 0.12);
  f.box(accentKey, 0.09, 1.2, 0.157, 0.04, 0.02, 0.012);
  kit.collider([x - 0.46, 0, z - 0.46], [x + 0.46, 1.75, z + 0.46], "viewer");
}

/** Data column: black plinth with four readouts and the dim tower cut-away hologram above it. */
function dataColumn(kit, ctx, x, z, accentKey) {
  kit.box("impMetal", x, 0.08, z, 1.0, 0.16, 1.0, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impTrim", x, 0.63, z, 0.9, 0.94, 0.9, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, 1.13, z, 0.96, 0.06, 0.96, { color: PALETTE.impCharcoal, texel: 1 });
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const nx = Math.sin(ang);
    const nz = Math.cos(ang);
    const g = new THREE.PlaneGeometry(0.6, 0.42);
    g.rotateY(ang);
    kit.add(["scrBlue3", "scrBlue1", "scrBlue2", "scrWhite1"][i], g, { pos: [x + nx * 0.455, 0.78, z + nz * 0.455], uv: "keep" });
    const b = new THREE.BoxGeometry(0.5, 0.02, 0.012);
    b.rotateY(ang);
    kit.add(accentKey, b, { pos: [x + nx * 0.455, 0.5, z + nz * 0.455] });
    const bt = new THREE.BoxGeometry(0.16, 0.08, 0.012);
    bt.rotateY(ang);
    kit.add("impGloss", bt, { pos: [x + nx * 0.455 - nz * 0.25, 0.4, z + nz * 0.455 + nx * 0.25] });
  }
  kit.cyl("emitBlueDim", x, 1.175, z, 0.4, 0.02, "y", { segments: 24, uv: "keep" });
  kit.cyl("impGloss", x, 1.19, z, 0.36, 0.04, "y", { segments: 24 });
  kit.add("deckB_holoDim", new THREE.CylinderGeometry(0.7, 0.3, 0.4, 20, 1, true), { pos: [x, 1.41, z], uv: "keep" });
  const tower = holoTowerMap(kit.materials, 1.1);
  tower.group.position.set(x, 1.25, z);
  kit.attach(tower.group);
  kit.collider([x - 0.5, 0, z - 0.5], [x + 0.5, 1.25, z + 0.5], "datacolumn");
  return tower;
}
