// Crew pits and platform edges for d1-bridge. The two 2.4 m pits either side of the walkway get panelled faces
// with operator displays, cable ducts, access hatches, vents and junction boxes; the outer walls get a display
// band over floor cabinets under a cable tray; hanging light rafts carry the pit pools; the pit floors get plating
// variation, floor ducts and data pillars. Platforms get nosings, lit kick strips and floor inlays.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { decalRect } from "../../../textures.js";
import { FLOOR, PIT_FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { SCUFF, shade, wallDisplay, cabinet, hatch, ventPanel, junctionBox, conduitRun, dataPillar, rack } from "./props.js";
import { CELLS } from "./screens.js";

const SCREENS = ["screenImp0", "screenImp1", "screenImp2", "screenImp3"];
const NOSING = IMP.grey; // painted edge steel, lighter than the wall tone so every drop edge reads
const PLATE = IMP.grey; // pit deck plating tint (paintedMetal: the worn-metal map is ~0.4, so grey tints read as dark plating)
// every third display is a live (animated) bridgeScreen cell, the rest are the shared static Imperial screens
export function pickScreen(i) {
  if (i % 3 === 0) return { screen: "bridgeScreen", rect: CELLS[(i / 3) % 4] };
  return { screen: SCREENS[i % 4], rect: null };
}

export function buildPits(kit, ctx, L) {
  const xi = L.xIn;
  const [pz0, pz1] = L.pitZ;
  const y0 = PIT_FLOOR;
  const y1 = FLOOR;
  const rand = rng(4242);

  for (const s of [-1, 1]) {
    const wx = s * L.walkHalf; // walkway face plane
    const yawIn = s < 0 ? -Math.PI / 2 : Math.PI / 2; // local +z points from the walkway face into the pit
    const yawOut = s < 0 ? Math.PI / 2 : -Math.PI / 2; // local +z points from the outer wall into the pit
    const span = (a, b) => [Math.min(a, b), Math.max(a, b)];

    // --- walkway face (x = ±3.5): dark panels, scuff plate, seams, blue kick strip on a floor duct, operator displays
    let [a, b] = span(wx, wx + s * 0.03);
    kit.boxMM("paintedMetal", [a, y0, pz0], [b, y1 - 0.02, pz1], { color: IMP.dark, texel: 1 });
    [a, b] = span(wx, wx + s * 0.04);
    kit.boxMM("paintedMetal", [a, y0, pz0], [b, y0 + 0.26, pz1], { color: SCUFF, texel: 1 });
    [a, b] = span(wx, wx + s * 0.28);
    kit.boxMM("paintedMetal", [a, y0, pz0 + 0.2], [b, y0 + 0.1, pz1 - 0.2], { color: IMP.black, texel: 1 });
    [a, b] = span(wx + s * 0.28, wx + s * 0.3);
    kit.boxMM("emitBlue", [a, y0 + 0.05, pz0 + 0.5], [b, y0 + 0.085, pz1 - 0.5]);
    [a, b] = span(wx, wx + s * 0.05);
    for (let z = pz0 + 1.5; z < pz1 - 1; z += 3.0) kit.boxMM("paintedMetal", [a, y0 + 0.26, z - 0.02], [b, y1 - 0.25, z + 0.02], { color: IMP.black, texel: 1 });
    for (let k = 0; k < 8; k++) {
      const z = 466.9 + k * 4.2;
      wallDisplay(kit, { x: wx + s * 0.01, y: y0 + 1.65, z, yaw: yawIn, w: 1.6, h: 1.0, ...pickScreen(k + (s < 0 ? 0 : 2)), label: k % 4 === 0 ? 9 : undefined });
      if (k < 7) {
        junctionBox(kit, { x: wx + s * 0.02, y: y0 + 1.9, z: z + 2.1, yaw: yawIn, w: 0.26, h: 0.3, lamp: k % 2 ? "emitRedImp" : "emitAmber" });
        [a, b] = span(wx, wx + s * 0.09);
        kit.boxMM("paintedMetal", [a, y0 + 0.3, z + 2.07], [b, y0 + 1.74, z + 2.13], { color: IMP.black, texel: 2 });
      }
    }
    // nosing under the walkway edge + lit strip just below it (painted steel: `metal` would only mirror the dark pit)
    [a, b] = span(wx - s * 0.06, wx + s * 0.1);
    kit.boxMM("paintedMetal", [a, y1 - 0.04, pz0], [b, y1 + 0.02, pz1], { color: NOSING, texel: 2 });
    [a, b] = span(wx + s * 0.03, wx + s * 0.05);
    kit.boxMM("emitBlue", [a, y1 - 0.12, pz0 + 0.4], [b, y1 - 0.09, pz1 - 0.4]);

    // --- fore drop face (z = 464, faces +z into the pit)
    const px0 = s < 0 ? -xi : L.walkHalf;
    const px1 = s < 0 ? -L.walkHalf : xi;
    kit.boxMM("paintedMetal", [px0, y0, pz0 - 0.03], [px1, y1 - 0.02, pz0], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [px0, y0, pz0 - 0.04], [px1, y0 + 0.26, pz0 + 0.01], { color: SCUFF, texel: 1 });
    hatch(kit, { x: s * 8.0, y: y0 + 1.15, z: pz0, yaw: 0, w: 1.2, h: 1.6, label: 6 });
    // equipment racks fill the pit's fore bay (the empty floor in front of the first console row)
    for (const [ax, i] of [
      [10.4, 0],
      [11.5, 1],
      [15.6, 2],
    ])
      rack(kit, { x: s * ax, y: y0, z: pz0, yaw: 0, seed: 40 + i + (s < 0 ? 0 : 10), label: i === 1 ? 6 : undefined });
    ventPanel(kit, { x: s * 13.2, y: y0 + 1.85, z: pz0, yaw: 0, w: 1.1, h: 0.5 });
    ventPanel(kit, { x: s * 17.3, y: y0 + 1.85, z: pz0, yaw: 0, w: 1.1, h: 0.5 });
    junctionBox(kit, { x: s * 14.6, y: y0 + 0.9, z: pz0, yaw: 0, lamp: "emitRedImp" });
    junctionBox(kit, { x: s * 13.5, y: y0 + 1.0, z: pz0, yaw: 0, lamp: "emitAmber" });
    conduitRun(kit, [s * 9.2, pz0], [s * 18.6, pz0], y0 + 2.22, [0, 1], { r: 0.035, out: 0.08, every: 2.2 });
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [s * 5.2, y0 + 1.5, pz0 + 0.005], uv: "keep", uvRect: decalRect(s < 0 ? 2 : 14) });

    // --- aft drop face (z = 500, faces -z), leaving the stair gap
    const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
    kit.boxMM("paintedMetal", [px0, y0, pz1], [Math.min(sx0, px1), y1 - 0.02, pz1 + 0.03], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [Math.max(sx1, px0), y0, pz1], [px1, y1 - 0.02, pz1 + 0.03], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [Math.max(sx1, px0), y0, pz1 - 0.01], [px1, y0 + 0.26, pz1 + 0.04], { color: SCUFF, texel: 1 });
    hatch(kit, { x: s * 12.4, y: y0 + 1.15, z: pz1, yaw: Math.PI, w: 1.2, h: 1.6, label: 6 });
    for (const [ax, i] of [
      [9.6, 0],
      [14.6, 1],
      [15.7, 2],
    ])
      rack(kit, { x: s * ax, y: y0, z: pz1, yaw: Math.PI, seed: 50 + i + (s < 0 ? 0 : 10), label: i === 0 ? 9 : undefined });
    ventPanel(kit, { x: s * 16.8, y: y0 + 2.05, z: pz1, yaw: Math.PI, w: 1.1, h: 0.36 });
    junctionBox(kit, { x: s * 10.7, y: y0 + 1.2, z: pz1, yaw: Math.PI, lamp: "emitAmber" });
    junctionBox(kit, { x: s * 13.6, y: y0 + 0.9, z: pz1, yaw: Math.PI, lamp: "emitRedImp" });
    conduitRun(kit, [s * 9.0, pz1], [s * 18.6, pz1], y0 + 2.28, [0, -1], { r: 0.035, out: 0.08, every: 2.2 });
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [s * 4.75, y0 + 1.5, pz1 - 0.005], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(s < 0 ? 2 : 14) });
    kit.boxMM("hazard", [Math.min(sx0, sx1), y0 + 0.002, L.stairZ[0] - 0.22], [Math.max(sx0, sx1), y0 + 0.01, L.stairZ[0] - 0.02], { texel: 3 });

    // --- outer wall (x = ±19.7): display band over floor cabinets, cable tray above, base duct
    const ox = s * xi;
    for (let k = 0; k < 8; k++) {
      const z = 467.1 + k * 4.2;
      wallDisplay(kit, { x: ox + s * 0.01, y: y0 + 1.75, z, yaw: yawOut, w: 3.0, h: 1.1, ...pickScreen(k + 1 + (s < 0 ? 1 : 0)), label: k % 3 === 1 ? 12 : undefined });
      if (k < 7) {
        cabinet(kit, { x: ox, y: y0, z: z + 2.1, yaw: yawOut, w: 0.8, h: 1.05, d: 0.5, seed: 100 + k + (s < 0 ? 0 : 20) });
        [a, b] = span(ox, ox - s * 0.1);
        kit.boxMM("paintedMetal", [a, y0 + 1.1, z + 2.07], [b, y1 + 0.3, z + 2.13], { color: IMP.black, texel: 2 });
      }
      // second cabinet under every other display, staggered so the wall never reads as one repeated cell
      if (k % 2 === 0) cabinet(kit, { x: ox, y: y0, z: z + (k % 4 ? -1.0 : 0.8), yaw: yawOut, w: 0.7 + (k % 3) * 0.1, h: 0.95, d: 0.45, seed: 300 + k + (s < 0 ? 0 : 40) });
    }
    [a, b] = span(ox, ox - s * 0.34);
    kit.boxMM("paintedMetal", [a, y1 + 0.3, pz0 + 0.4], [b, y1 + 0.34, pz1 - 0.4], { color: IMP.mid, texel: 1 });
    [a, b] = span(ox - s * 0.32, ox - s * 0.34);
    kit.boxMM("paintedMetal", [a, y1 + 0.3, pz0 + 0.4], [b, y1 + 0.42, pz1 - 0.4], { color: IMP.mid, texel: 1 });
    [a, b] = span(ox - s * 0.06, ox - s * 0.16);
    kit.boxMM("paintedMetal", [a, y1 + 0.34, pz0 + 0.6], [b, y1 + 0.42, pz1 - 0.6], { color: IMP.black, texel: 2 });
    [a, b] = span(ox - s * 0.18, ox - s * 0.28);
    kit.boxMM("paintedMetal", [a, y1 + 0.34, pz0 + 0.6], [b, y1 + 0.41, pz1 - 0.6], { color: 0x2a2320, texel: 2 });
    for (let z = pz0 + 4; z < pz1 - 2; z += 8.4) junctionBox(kit, { x: ox + s * 0.01, y: y1 + 0.75, z, yaw: yawOut, w: 0.34, h: 0.4, lamp: "emitBlue" });
    [a, b] = span(ox, ox - s * 0.3);
    kit.boxMM("paintedMetal", [a, y0, pz0 + 0.3], [b, y0 + 0.12, pz1 - 0.3], { color: IMP.black, texel: 1 });
    [a, b] = span(ox - s * 0.3, ox - s * 0.33);
    kit.boxMM("paintedMetal", [a, y0 + 0.02, pz0 + 0.3], [b, y0 + 0.13, pz1 - 0.3], { color: IMP.mid, texel: 2 });

    // --- floor: plating variation, floor ducts, data pillars
    for (let k = 0; k < 5; k++) {
      const z = 466 + k * 6.4 + rand() * 1.2;
      const x = s * (7.2 + rand() * 5.2);
      const tint = shade(PLATE, [0.78, 1.18, 0.9, 1.3][k % 4]);
      [a, b] = span(x, x + s * 3.2);
      kit.boxMM("paintedMetal", [a, y0, z], [b, y0 + 0.006, z + 2.8], { color: tint, texel: 0.5 });
    }
    // aisle cable duct down the pit centre with cover plates and amber inspection lamps
    kit.boxMM("paintedMetal", [s * 11 - 0.14, y0, pz0 + 0.6], [s * 11 + 0.14, y0 + 0.035, pz1 - 4.5], { color: IMP.black, texel: 1 });
    for (let z = pz0 + 2.4; z < pz1 - 5; z += 3.6) {
      kit.box("paintedMetal", s * 11, y0 + 0.041, z, 0.34, 0.012, 0.5, { color: IMP.mid, texel: 2 });
      kit.box("emitAmber", s * 11 + s * 0.12, y0 + 0.05, z + 0.18, 0.04, 0.008, 0.04);
    }
    [a, b] = span(s * 6.3, s * 15.7);
    for (const z of [470.4, 480.6, 494.4]) kit.boxMM("paintedMetal", [a, y0, z - 0.12], [b, y0 + 0.03, z + 0.12], { color: IMP.black, texel: 1 });
    dataPillar(kit, s * 11, y0, 474.5, { seed: 7 + (s < 0 ? 0 : 3), screen: "screenImp3" });
    dataPillar(kit, s * 11, y0, 486.8, { seed: 9 + (s < 0 ? 0 : 3), screen: "screenImp1" });

    // --- hanging light rafts (the pit point lights sit below each raft, see index.js); the rods run up into the
    // recessed blue channel at x ±11.5 and end against its emitter strip (channel top = ceilY + 0.24 - 0.05)
    for (const z of L.raftZ) raft(kit, s * L.raftX, L.raftY, z, L.ceilY + 0.17 - L.raftY);
  }
}

// Hanging light raft: two emissive tubes in a dark frame on four rods from the ceiling.
function raft(kit, x, y, z, rodLen) {
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", x + s * 0.6, y, z, 0.08, 0.08, 2.8, { color: IMP.dark, texel: 1 });
    kit.box("paintedMetal", x, y, z + s * 1.36, 1.28, 0.08, 0.08, { color: IMP.dark, texel: 1 });
    kit.box("emitWhite", x + s * 0.3, y - 0.02, z, 0.07, 0.05, 2.5, { uv: "keep" });
    kit.box("emitRedImp", x + s * 0.6, y + 0.06, z + s * 1.36, 0.06, 0.05, 0.06);
    kit.box("metal", x, y + 0.04 + rodLen / 2, z + s * 1.3, 0.04, rodLen, 0.04, { color: IMP.mid, texel: 2 });
  }
  kit.box("metalRough", x, y + 0.02, z, 0.14, 0.06, 2.8, { color: IMP.mid, texel: 1 });
}

// Platform edges: nosings, lit kick strips along the walkway and onto the aft deck, floor inlays, hazard at the stair heads.
export function buildPlatforms(kit, L) {
  const xi = L.xIn;
  const [pz0, pz1] = L.pitZ;
  const y = FLOOR;
  const span = (a, b) => [Math.min(a, b), Math.max(a, b)];
  for (const s of [-1, 1]) {
    const wx = s * L.walkHalf;
    let [a, b] = span(wx - s * 0.06, wx - s * 0.16);
    kit.boxMM("paintedMetal", [a, y, pz0 + 0.2], [b, y + 0.02, pz1 - 0.2], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [a, y, pz1 + 0.3], [b, y + 0.02, 503.0], { color: IMP.black, texel: 1 });
    [a, b] = span(wx - s * 0.09, wx - s * 0.13);
    kit.boxMM("emitBlue", [a, y + 0.008, pz0 + 0.5], [b, y + 0.024, pz1 - 0.5]);
    kit.boxMM("emitWhite", [a, y + 0.008, pz1 + 0.5], [b, y + 0.024, 502.8]);
    // fore platform edge and aft deck edge nosings (proud metal lip along the drop)
    [a, b] = span(wx, s * xi);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz0 - 0.1], [b, y + 0.02, pz0 + 0.06], { color: NOSING, texel: 2 });
    const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
    [a, b] = span(wx, s < 0 ? sx1 : sx0);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz1 - 0.06], [b, y + 0.02, pz1 + 0.1], { color: NOSING, texel: 2 });
    [a, b] = span(s < 0 ? sx0 : sx1, s * xi);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz1 - 0.06], [b, y + 0.02, pz1 + 0.1], { color: NOSING, texel: 2 });
    kit.boxMM("hazard", [Math.min(sx0, sx1), y + 0.004, pz1 + 0.02], [Math.max(sx0, sx1), y + 0.012, pz1 + 0.24], { texel: 3 });
  }
  // walkway floor inlays: matte plates down the centre line and a strip pair along the edges (matte painted steel
  // set into the black gloss, so the plating reads as variation in both reflection and tone)
  const inlay = shade(IMP.dark, 1.15);
  for (let z = pz0 + 3; z < pz1 - 2; z += 6) kit.boxMM("paintedMetal", [-1.2, y, z - 1.6], [1.2, y + 0.005, z + 1.6], { color: inlay, texel: 0.5 });
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [Math.min(s * 2.2, s * 2.5), y, pz0 + 0.5], [Math.max(s * 2.2, s * 2.5), y + 0.004, pz1 - 0.5], { color: IMP.dark, texel: 0.5 });
  // fore platform and aft deck plating variation
  for (let x = -18; x < 18; x += 6.2) {
    kit.boxMM("paintedMetal", [x + 0.3, y, 461.4], [x + 5.7, y + 0.004, 463.6], { color: inlay, texel: 0.5 });
    kit.boxMM("paintedMetal", [x + 0.3, y, 508.3], [x + 5.7, y + 0.004, 511.2], { color: IMP.dark, texel: 0.5 });
  }
}
