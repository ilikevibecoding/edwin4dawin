// Crew pits and platform edges for d1-bridge. The two 2.4 m pits either side of the walkway get panelled faces
// with operator displays, cable ducts, access hatches, vents and junction boxes; the outer walls get a display
// band over floor cabinets under a cable tray; hanging light rafts carry the pit pools; the pit floors get plating
// variation, floor ducts and data pillars. Platforms get nosings, lit kick strips and floor inlays.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { decalRect } from "../../../textures.js";
import { FLOOR, PIT_FLOOR } from "../shared/plan.js";
import { stairs } from "../shared/imperial.js";
import { IMP } from "../shared/palette.js";
import { SCUFF, shade, wallDisplay, cabinet, hatch, ventPanel, junctionBox, conduitRun, dataPillar, rack, dropConduit, stairRail, floorHatch, deckSeams, cableCover } from "./props.js";
import { CELLS } from "./screens.js";

const SCREENS = ["screenImp0", "screenImp1", "screenImp2", "screenImp3"];
const NOSING = IMP.grey; // painted edge steel, lighter than the wall tone so every drop edge reads
const PLATE = IMP.mid; // pit deck plating tint (bridgePitFloor carries the worn-metal map at ~0.4, so mid tints read as dark plating)
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
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [s * 6.7, y0 + 1.5, pz0 + 0.005], uv: "keep", uvRect: decalRect(s < 0 ? 2 : 14) });

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

    // --- outer wall (x = ±19.7): display band over floor cabinets; 0.4 m cable tray at +3 m with a drop conduit
    // and a junction box (1.4 m) in every display gap; vent grilles every 6 m; 1.6 m status displays every 8 m and
    // a conduit run in the upper band; base duct
    const ox = s * xi;
    for (let k = 0; k < 8; k++) {
      const z = 467.1 + k * 4.2;
      wallDisplay(kit, { x: ox + s * 0.01, y: y0 + 1.75, z, yaw: yawOut, w: 3.0, h: 1.1, ...pickScreen(k + 1 + (s < 0 ? 1 : 0)), label: k % 3 === 1 ? 12 : undefined });
      if (k < 7) {
        cabinet(kit, { x: ox, y: y0, z: z + 2.1, yaw: yawOut, w: 0.8, h: 1.05, d: 0.5, seed: 100 + k + (s < 0 ? 0 : 20) });
        dropConduit(kit, { x: ox, z: z + 2.1, yaw: yawOut, y0: y0 + 1.1, y1: y0 + 3.0, boxY: y0 + 1.4, lamp: k % 2 ? "emitRedImp" : "emitAmber" });
      }
      // second cabinet under every other display, staggered so the wall never reads as one repeated cell
      if (k % 2 === 0) cabinet(kit, { x: ox, y: y0, z: z + (k % 4 ? -1.0 : 0.8), yaw: yawOut, w: 0.7 + (k % 3) * 0.1, h: 0.95, d: 0.45, seed: 300 + k + (s < 0 ? 0 : 40) });
    }
    // cable tray 3 m over the pit floor: 0.4 m deep, outer lip, three cable bundles
    [a, b] = span(ox, ox - s * 0.4);
    kit.boxMM("paintedMetal", [a, y0 + 3.0, pz0 + 0.4], [b, y0 + 3.04, pz1 - 0.4], { color: IMP.mid, texel: 1 });
    [a, b] = span(ox - s * 0.37, ox - s * 0.4);
    kit.boxMM("paintedMetal", [a, y0 + 3.0, pz0 + 0.4], [b, y0 + 3.14, pz1 - 0.4], { color: IMP.mid, texel: 1 });
    [a, b] = span(ox - s * 0.06, ox - s * 0.16);
    kit.boxMM("paintedMetal", [a, y0 + 3.04, pz0 + 0.6], [b, y0 + 3.12, pz1 - 0.6], { color: IMP.black, texel: 2 });
    [a, b] = span(ox - s * 0.18, ox - s * 0.26);
    kit.boxMM("paintedMetal", [a, y0 + 3.04, pz0 + 0.6], [b, y0 + 3.11, pz1 - 0.6], { color: 0x2a2320, texel: 2 });
    [a, b] = span(ox - s * 0.28, ox - s * 0.35);
    kit.boxMM("paintedMetal", [a, y0 + 3.04, pz0 + 0.6], [b, y0 + 3.1, pz1 - 0.6], { color: shade(IMP.dark, 0.6), texel: 2 });
    for (let z = 467; z < pz1 - 1; z += 6) ventPanel(kit, { x: ox + s * 0.01, y: y0 + 3.9, z, yaw: yawOut, w: 1.0, h: 0.5 });
    for (let k = 0; k < 4; k++) wallDisplay(kit, { x: ox + s * 0.01, y: y0 + 6.3, z: 468 + k * 8, yaw: yawOut, w: 1.6, h: 0.9, ...pickScreen(k + 13 + (s < 0 ? 0 : 2)), label: k % 2 ? 12 : undefined });
    conduitRun(kit, [ox, pz0 + 1.0], [ox, pz1 - 1.0], y0 + 7.3, [-s, 0], { r: 0.04, out: 0.09, every: 3.0 });
    for (const z of [472, 488]) junctionBox(kit, { x: ox + s * 0.01, y: y0 + 7.75, z, yaw: yawOut, w: 0.34, h: 0.4, lamp: "emitBlue" });
    [a, b] = span(ox, ox - s * 0.3);
    kit.boxMM("paintedMetal", [a, y0, pz0 + 0.3], [b, y0 + 0.12, pz1 - 0.3], { color: IMP.black, texel: 1 });
    [a, b] = span(ox - s * 0.3, ox - s * 0.33);
    kit.boxMM("paintedMetal", [a, y0 + 0.02, pz0 + 0.3], [b, y0 + 0.13, pz1 - 0.3], { color: IMP.mid, texel: 2 });

    // --- floor: deck-plate seams, plating variation, cable-cover channels wall → console, aisle duct, data pillars
    // seams and plates in the floor's own material: a paintedMetal strip on the low-Fresnel pit floor reads light at grazing angles
    deckSeams(kit, [Math.min(L.walkHalf * s, ox), pz0], [Math.max(L.walkHalf * s, ox), pz1], y0, { xs: s < 0 ? -18.5 : 4.7, zs: pz0 + 2.4, mat: "bridgePitFloor" });
    for (let k = 0; k < 5; k++) {
      const z = 466 + k * 6.4 + rand() * 1.2;
      const x = s * (7.2 + rand() * 5.2);
      const tint = shade(PLATE, [0.78, 1.18, 0.9, 1.3][k % 4]);
      [a, b] = span(x, x + s * 3.2);
      kit.boxMM("bridgePitFloor", [a, y0, z], [b, y0 + 0.006, z + 2.8], { color: tint, texel: 0.5 });
    }
    for (const z of [468.6, 474.0, 479.4, 484.8, 490.2]) cableCover(kit, s * 19.4, s * 17.75, y0, z);
    for (const z of [470.0, 478.4, 486.8]) cableCover(kit, s * 3.8, s * 7.55, y0, z);
    // aisle cable duct down the pit centre with cover plates and amber inspection lamps
    kit.boxMM("paintedMetal", [s * 11 - 0.14, y0, pz0 + 0.6], [s * 11 + 0.14, y0 + 0.035, pz1 - 4.5], { color: IMP.black, texel: 1 });
    for (let z = pz0 + 2.4; z < pz1 - 5; z += 3.6) {
      kit.box("paintedMetal", s * 11, y0 + 0.041, z, 0.34, 0.012, 0.5, { color: IMP.mid, texel: 2 });
      kit.box("emitAmber", s * 11 + s * 0.12, y0 + 0.05, z + 0.18, 0.04, 0.008, 0.04);
    }
    dataPillar(kit, s * 11, y0, 474.5, { seed: 7 + (s < 0 ? 0 : 3), screen: "screenImp3" });
    dataPillar(kit, s * 11, y0, 486.8, { seed: 9 + (s < 0 ? 0 : 3), screen: "screenImp1" });

    // --- hanging light rafts (the pit point lights sit inside each raft, see index.js); the rods run from the
    // housing top up into the recessed blue channel at x ±11.5, ending just under its emitter strip (ceilY + 0.19)
    for (const z of L.raftZ) raft(kit, s * L.raftX, L.raftY, z, L.ceilY + 0.17 - (L.raftY + 0.16));
  }
}

// Both stair pairs into the pits: aft (x ±6..8.4, z 496..500, down toward -z from the aft deck) and fore
// (1.2 m wide at x ±4.7..5.9, z 464..468, down toward +z from the fore platform). Shared stairs() for the treads
// and the stairs-pending head blocker, plus lit nosings on every tread, sloped handrails and 0.1 m hazard
// chevrons at head and foot.
export function buildStairs(kit, L) {
  const [pz0, pz1] = L.pitZ;
  for (const s of [-1, 1]) {
    const [ax0, ax1] = s < 0 ? L.stairX[0] : L.stairX[1];
    litStairs(kit, { x0: Math.min(ax0, ax1), x1: Math.max(ax0, ax1), z0: L.stairZ[0], z1: L.stairZ[1], dir: "-z" });
    const fx0 = Math.min(s * 4.7, s * 5.9);
    const fx1 = Math.max(s * 4.7, s * 5.9);
    litStairs(kit, { x0: fx0, x1: fx1, z0: pz0, z1: pz0 + 4, dir: "+z" });
  }
}

function litStairs(kit, { x0, x1, z0, z1, dir }) {
  const yTop = FLOOR;
  const yBot = PIT_FLOOR;
  stairs(kit, { x0, x1, z0, z1, yTop, yBottom: yBot, dir, mat: "paintedMetal", color: IMP.grey });
  // same step arithmetic as stairs(): n treads walking in `dir`, nosing on the step-off edge
  const drop = yTop - yBot;
  const n = Math.max(2, Math.round(drop / 0.18));
  const rise = drop / n;
  const tread = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const top = yTop - rise * (i + 1);
    const edge = dir === "+z" ? z0 + tread * (i + 1) : z1 - tread * (i + 1);
    const e0 = dir === "+z" ? edge - 0.06 : edge + 0.035;
    const e1 = dir === "+z" ? edge - 0.035 : edge + 0.06;
    kit.boxMM("emitBlue", [x0 + 0.1, top + 0.004, e0], [x1 - 0.1, top + 0.012, e1]);
  }
  // hazard chevrons: 0.1 m at the head (platform) and the foot (pit floor)
  const headZ = dir === "+z" ? z0 : z1;
  const footZ = dir === "+z" ? z1 : z0;
  const d = dir === "+z" ? -1 : 1; // platform side of the head edge
  kit.boxMM("hazard", [x0, yTop + 0.004, Math.min(headZ + d * 0.03, headZ + d * 0.13)], [x1, yTop + 0.012, Math.max(headZ + d * 0.03, headZ + d * 0.13)], { texel: 3 });
  kit.boxMM("hazard", [x0, yBot + 0.002, Math.min(footZ - d * 0.02, footZ - d * 0.12)], [x1, yBot + 0.01, Math.max(footZ - d * 0.02, footZ - d * 0.12)], { texel: 3 });
  // sloped handrails both sides
  for (const x of [x0 - 0.06, x1 + 0.06]) stairRail(kit, x, headZ, footZ, yTop, yBot);
}

// Hanging light raft over each pit aisle: a CLOSED 0.7 × 0.3 × 2.8 m housing with the pit pool light inside it
// just under its top (index.js: raftY + 0.13), so every outer face points away from the light and stays dark and
// the lit interior is sealed (the open-bottomed version lit its own inner walls and louvre to E ≈ 500 and read
// as a clipped white bar from every pit view). The lamp is a 0.3 × 2.5 m emitWhite diffuser flush under the
// bottom face in a black lip, split by black fins 0.3 m under the light. Red end lamps, two rods up into the
// blue ceiling channel.
function raft(kit, x, y, z, rodLen) {
  const dark = shade(IMP.dark, 0.7);
  kit.box("paintedMetal", x, y, z, 0.7, 0.3, 2.8, { color: dark, texel: 1 });
  for (const s of [-1, 1]) {
    kit.box("emitRedImp", x, y + 0.02, z + s * 1.403, 0.16, 0.03, 0.006);
    kit.box("paintedMetal", x, y + 0.15 + rodLen / 2, z + s * 1.2, 0.04, rodLen, 0.04, { color: IMP.black, texel: 2 });
    kit.box("paintedMetal", x + s * 0.17, y - 0.18, z, 0.04, 0.06, 2.58, { color: IMP.black, texel: 1 });
    kit.box("paintedMetal", x, y - 0.18, z + s * 1.27, 0.3, 0.06, 0.04, { color: IMP.black, texel: 1 });
  }
  const yb = y - 0.15;
  kit.box("emitWhite", x, yb - 0.006, z, 0.3, 0.012, 2.5, { uv: "keep" });
  kit.box("paintedMetal", x, yb - 0.037, z, 0.012, 0.05, 2.5, { color: IMP.black, texel: 1 });
  for (let k = -4; k <= 4; k++) kit.box("paintedMetal", x, yb - 0.037, z + k * 0.25, 0.3, 0.05, 0.012, { color: IMP.black, texel: 1 });
}

// Platform edges: nosings (split at the stair heads), 0.15 m black inlay with a blue kick strip along both
// walkway rails, deck-plate seams (1.2 × 2.4 m joints) on the black gloss, two 1 m floor hatches on the walkway.
export function buildPlatforms(kit, L) {
  const xi = L.xIn;
  const [pz0, pz1] = L.pitZ;
  const y = FLOOR;
  const span = (a, b) => [Math.min(a, b), Math.max(a, b)];
  for (const s of [-1, 1]) {
    const wx = s * L.walkHalf;
    let [a, b] = span(wx - s * 0.02, wx - s * 0.17);
    kit.boxMM("paintedMetal", [a, y, pz0 + 0.2], [b, y + 0.02, pz1 - 0.2], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [a, y, pz1 + 0.3], [b, y + 0.02, 502.4], { color: IMP.black, texel: 1 });
    [a, b] = span(wx - s * 0.075, wx - s * 0.115);
    kit.boxMM("emitBlue", [a, y + 0.008, pz0 + 0.5], [b, y + 0.024, pz1 - 0.5]);
    kit.boxMM("emitBlue", [a, y + 0.008, pz1 + 0.5], [b, y + 0.024, 502.2]);
    // fore platform edge nosing, split around the fore stair head (x ±4.7..5.9)
    [a, b] = span(wx, s * 4.7);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz0 - 0.1], [b, y + 0.02, pz0 + 0.06], { color: NOSING, texel: 2 });
    [a, b] = span(s * 5.9, s * xi);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz0 - 0.1], [b, y + 0.02, pz0 + 0.06], { color: NOSING, texel: 2 });
    // aft deck edge nosing, split around the aft stair head
    const [sx0, sx1] = s < 0 ? L.stairX[0] : L.stairX[1];
    [a, b] = span(wx, s < 0 ? sx1 : sx0);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz1 - 0.06], [b, y + 0.02, pz1 + 0.1], { color: NOSING, texel: 2 });
    [a, b] = span(s < 0 ? sx0 : sx1, s * xi);
    kit.boxMM("paintedMetal", [a, y - 0.04, pz1 - 0.06], [b, y + 0.02, pz1 + 0.1], { color: NOSING, texel: 2 });
  }
  // deck-plate joints: 2 cm seams on the gloss decks (walkway, fore platform, aft deck), no plates, in the
  // module-local bridgeSeam material (index.js: the deck's lobe with a quarter of its Fresnel, so the x = 0 seam
  // stays dark inside the key spot's grazing streak instead of becoming a bright line as darkGloss/paintedMetal did)
  deckSeams(kit, [-L.walkHalf + 0.2, pz0], [L.walkHalf - 0.2, pz1], y, { xs: -2.4, zs: pz0 + 2.4, mat: "bridgeSeam" });
  deckSeams(kit, [-xi, 458.6], [xi, pz0 - 0.1], y, { xs: -18, zs: 461.2, mat: "bridgeSeam" });
  deckSeams(kit, [-xi, pz1 + 0.1], [xi, 511.6], y, { xs: -18, zs: 502.4, mat: "bridgeSeam" });
  // walkway floor hatches between the pendant pools
  for (const z of [476, 488]) floorHatch(kit, 0, y, z);
}
