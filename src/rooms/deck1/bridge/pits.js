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
import { SCUFF, shade, wallDisplay, cabinet, hatch, ventPanel, junctionBox, junctionCluster, ventCluster, breakerCluster, manifoldPanel, riserBank, conduitRun, dataPillar, rack, dropConduit, stairRail, floorHatch, deckSeams, cableCover } from "./props.js";
import { CELLS } from "./screens.js";

const SCREENS = ["screenImp0", "screenImp1", "screenImp2", "screenImp3"];
const NOSING = IMP.grey; // painted edge steel, lighter than the wall tone so every drop edge reads
// pit deck plating tint: bridgePitFloor carries no albedo map (0xa0a0a0 mean), so this is ≈ 0.07 albedo — dark
// plating that still shows the raft pools and the plate bands from the aft deck (critic round 3: at IMP.mid the
// starboard pit floor filled the right third of the dais view as "one flat black slab")
export const PLATE = shade(IMP.grey, 0.72);
// every third display is a live (animated) bridgeScreen cell, the rest are the shared static Imperial screens,
// each on its own crop of the texture (critic round 3: adjacent units with the same texture read as one monitor
// repeated), and a housing style per unit so neighbours never share a template
const CROPS = [null, [0, 0, 0.72, 0.72], [0.28, 0.28, 1, 1], [0, 0.3, 0.7, 1], [0.3, 0, 1, 0.7], [0.14, 0.14, 0.86, 0.86]];
export function pickScreen(i) {
  const style = ((i * 5) % 7) % 3;
  if (i % 3 === 0) return { screen: "bridgeScreen", rect: CELLS[(i / 3) % 4], style };
  return { screen: SCREENS[i % 4], rect: CROPS[(i * 7 + 1) % CROPS.length], style };
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
    // operator displays for the inner console row: six mounted units (arm, black bezel, cable down to the kick
    // duct) at two heights and two widths, a junction-box cluster and a vent pair in the third and sixth slots so
    // the row is not one template tiled at one height (critic round 2)
    for (let k = 0; k < 8; k++) {
      const z = 466.9 + k * 4.2;
      if (k === 2) junctionCluster(kit, { x: wx + s * 0.01, y: y0 + 1.6, z, yaw: yawIn, seed: s < 0 ? 1 : 2 });
      else if (k === 5) ventCluster(kit, { x: wx + s * 0.01, y: y0 + 1.6, z, yaw: yawIn, w: 0.9, h: 0.5 });
      else {
        const dy = k % 2 ? -0.12 : 0.08;
        wallDisplay(kit, { x: wx + s * 0.01, y: y0 + 1.65 + dy, z, yaw: yawIn, w: k % 3 ? 1.4 : 1.6, h: 1.0, ...pickScreen(k + (s < 0 ? 0 : 2)), label: k % 4 === 0 ? 9 : undefined, cableTo: y0 + 0.3, bracket: k % 2 === 1 });
      }
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

    // --- outer wall (x = ±19.7). Lower band, one slot per outer-row station (5.4 m pitch): four mounted displays
    // of three widths at four heights (±0.2 m), a junction-box cluster and a vent pair in place of the other two
    // (critic round 2: the eight 3 m units at one height read as one tiled template); floor cabinets between
    // them; a drop conduit per station from the 0.4 m cable tray (+3 m) into a cabinet with its junction box at
    // 1.4 m; a housed head-height (2.6 m) blue-white strip along the whole wall; a junction box per beam bay
    // over the tray; vent grilles every 6 m at 3.9 m; three mounted status displays (of the four slots) and a
    // junction-box cluster in the upper band, each cabled down to the tray; conduit run at 7.3 m; base duct.
    const ox = s * xi;
    const lower = [
      [468.6, "d", 3.0, 1.1, 0.06, 1],
      [474.0, "d", 2.4, 1.0, -0.2, 2],
      [476.7, "jb"],
      [479.4, "d", 3.0, 1.1, 0.02, 3],
      [484.8, "vent"],
      [490.2, "d", 2.6, 1.0, -0.12, 4],
    ];
    for (const [z, kind, w, h, dy, si] of lower) {
      if (kind === "jb") junctionCluster(kit, { x: ox + s * 0.01, y: y0 + 1.75, z, yaw: yawOut, seed: s < 0 ? 3 : 4 });
      else if (kind === "vent") ventCluster(kit, { x: ox + s * 0.01, y: y0 + 1.75, z, yaw: yawOut, w: 1.0, h: 0.5 });
      else wallDisplay(kit, { x: ox + s * 0.01, y: y0 + 1.75 + dy, z, yaw: yawOut, w, h, ...pickScreen(si + (s < 0 ? 1 : 0)), label: si === 3 ? 12 : undefined, cableTo: y0 + 3.0, cableOut: 0.1, bracket: true });
    }
    // scuff band along the wall base under the consoles (0.13..0.5 over the pit floor, behind the cabinets)
    [a, b] = span(ox, ox - s * 0.012);
    kit.boxMM("paintedMetal", [a, y0 + 0.13, pz0 + 0.3], [b, y0 + 0.5, pz1 - 0.3], { color: SCUFF, texel: 1 });
    [
      [466.5, 0.8, 1.05],
      [471.3, 0.9, 1.05],
      [472.3, 0.7, 1.05],
      [477.3, 0.8, 1.05],
      [483.0, 0.9, 1.05],
      [487.5, 0.7, 0.95],
      [488.3, 0.8, 1.05],
      [493.4, 0.9, 1.05],
      [496.6, 0.8, 0.95],
    ].forEach(([z, w, h], k) => cabinet(kit, { x: ox, y: y0, z, yaw: yawOut, w, h, d: 0.5, seed: 100 + k + (s < 0 ? 0 : 20) }));
    [466.8, 472.2, 477.6, 483.0, 488.4].forEach((z, k) => dropConduit(kit, { x: ox, z, yaw: yawOut, y0: y0 + 1.05, y1: y0 + 3.0, boxY: y0 + 1.4, lamp: k % 2 ? "emitRedImp" : "emitAmber" }));
    // head-height strip 2.75 m over the pit floor (0.35 m over the walkway deck, clear of the tallest display
    // bracket at 2.66): two 6 cm lips with a 5 cm emitBlue emitter set 2 cm back between them (critic round 3:
    // the 2 cm emitWhite at the back of a 4 mm slot read grey-dim from the pit camera; the 3 cm emitBlue that
    // replaced it was a 3 px line from 6.8 m)
    [a, b] = span(ox, ox - s * 0.06);
    kit.boxMM("paintedMetal", [a, y0 + 2.78, pz0 + 0.5], [b, y0 + 2.83, pz1 - 0.5], { color: shade(IMP.dark, 0.7), texel: 1 });
    kit.boxMM("paintedMetal", [a, y0 + 2.67, pz0 + 0.5], [b, y0 + 2.72, pz1 - 0.5], { color: shade(IMP.dark, 0.7), texel: 1 });
    [a, b] = span(ox, ox - s * 0.034);
    kit.boxMM("paintedMetal", [a, y0 + 2.72, pz0 + 0.5], [b, y0 + 2.78, pz1 - 0.5], { color: SCUFF, texel: 2 });
    [a, b] = span(ox - s * 0.034, ox - s * 0.04);
    kit.boxMM("emitBlue", [a, y0 + 2.725, pz0 + 0.7], [b, y0 + 2.775, pz1 - 0.7], { uv: "keep" });
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
    // one junction box per beam bay just over the tray, with a stub down into it (off the pilaster centres)
    [469.4, 475.2, 480.0, 487.2, 493.6, 497.6].forEach((z, k) => {
      junctionBox(kit, { x: ox + s * 0.01, y: y0 + 3.5, z, yaw: yawOut, w: 0.3, h: 0.36, lamp: k % 3 === 1 ? "emitRedImp" : "emitAmber" });
      kit.cyl("metal", ox - s * 0.07, y0 + 3.23, z, 0.022, 0.2, "y", { color: IMP.mid, segments: 8, texel: 2 });
    });
    for (let z = 467; z < pz1 - 1; z += 6) ventPanel(kit, { x: ox + s * 0.01, y: y0 + 3.9, z, yaw: yawOut, w: 1.0, h: 0.5 });
    // pilasters on every other 3 m panel bay's centre (6 m pitch), tray top to cornice with a gap for the wall's
    // 4.8 m strip channel, so the upper wall's 3 × 2.8 m grid does not read as wallpaper (critic round 3). At the
    // 9 m pitch of the first pass the bay the pit camera sees head-on (z 480–484, the left third of that frame)
    // had no pilaster at all. 0.44 m dark body, 0.1 m lighter fillet, foot and cap plates.
    for (const z of [468.5, 474.5, 480.5, 486.5, 492.5, 498.5]) {
      for (const [ya, yb] of [
        [3.16, 4.72],
        [5.08, 9.95],
      ]) {
        [a, b] = span(ox, ox - s * 0.06);
        kit.boxMM("paintedMetal", [a, y0 + ya, z - 0.22], [b, y0 + yb, z + 0.22], { color: IMP.dark, texel: 1 });
        [a, b] = span(ox - s * 0.06, ox - s * 0.08);
        kit.boxMM("paintedMetal", [a, y0 + ya + 0.05, z - 0.05], [b, y0 + yb - 0.05, z + 0.05], { color: shade(IMP.mid, 1.1), texel: 2 });
        [a, b] = span(ox, ox - s * 0.09);
        kit.boxMM("paintedMetal", [a, y0 + ya, z - 0.26], [b, y0 + ya + 0.06, z + 0.26], { color: IMP.black, texel: 2 });
        kit.boxMM("paintedMetal", [a, y0 + yb - 0.06, z - 0.26], [b, y0 + yb, z + 0.26], { color: IMP.black, texel: 2 });
      }
    }
    // upper band: three bracket-mounted status displays cabled down to a junction box on the tray, a breaker-box
    // cluster with its vent grille between the first two (critic round 3: "two floating monitors on a bare grid"),
    // then — in the bay the pit camera faces head-on — a coolant manifold panel in the 1.1 m band between the
    // tray top and the wall's 4.8 m strip channel (the only part of that bay inside the pit frame), a three-pipe
    // riser bank from the tray up to the 7.3 m conduit beside it, and a junction-box cluster; all off the 6 m
    // pilaster centres
    [
      [467.0, 0.2, 13],
      [476, -0.2, 14],
      [489.6, 0.1, 16],
    ].forEach(([z, dy, si]) => wallDisplay(kit, { x: ox + s * 0.01, y: y0 + 6.3 + dy, z, yaw: yawOut, w: 1.6, h: 0.9, ...pickScreen(si + (s < 0 ? 0 : 2)), label: si === 14 ? 12 : undefined, cableTo: y0 + 3.3, bracket: true, cableBox: true }));
    breakerCluster(kit, { x: ox + s * 0.01, y: y0 + 5.9, z: 472, yaw: yawOut, seed: s < 0 ? 1 : 2 });
    manifoldPanel(kit, { x: ox + s * 0.01, y: y0 + 4.15, z: 482.0, yaw: yawOut, seed: s < 0 ? 1 : 2 });
    riserBank(kit, { x: ox + s * 0.01, z: 483.6, yaw: yawOut, y0: y0 + 3.14, y1: y0 + 7.22 });
    junctionCluster(kit, { x: ox + s * 0.01, y: y0 + 6.3, z: 485.0, yaw: yawOut, seed: s < 0 ? 5 : 6 });
    // service hatch between the 4.8 m wall strip and the status displays, and a heavier pipe run at 8.7 m
    hatch(kit, { x: ox + s * 0.01, y: y0 + 5.6, z: 487.6, yaw: yawOut, w: 1.0, h: 0.8, label: 9 });
    conduitRun(kit, [ox, pz0 + 1.0], [ox, pz1 - 1.0], y0 + 7.3, [-s, 0], { r: 0.04, out: 0.09, every: 3.0 });
    conduitRun(kit, [ox, pz0 + 0.6], [ox, pz1 - 0.6], y0 + 8.7, [-s, 0], { r: 0.07, out: 0.12, every: 3.0, color: shade(IMP.mid, 1.1) });
    for (const z of [472, 488]) junctionBox(kit, { x: ox + s * 0.01, y: y0 + 7.75, z, yaw: yawOut, w: 0.34, h: 0.4, lamp: "emitBlue" });
    [a, b] = span(ox, ox - s * 0.3);
    kit.boxMM("paintedMetal", [a, y0, pz0 + 0.3], [b, y0 + 0.12, pz1 - 0.3], { color: IMP.black, texel: 1 });
    [a, b] = span(ox - s * 0.3, ox - s * 0.33);
    kit.boxMM("paintedMetal", [a, y0 + 0.02, pz0 + 0.3], [b, y0 + 0.13, pz1 - 0.3], { color: IMP.mid, texel: 2 });

    // --- floor: deck-plate seams, plating variation, cable-cover channels wall → console, aisle duct, data pillars
    // seams and plates in the floor's own material: a paintedMetal strip on the low-Fresnel pit floor reads light at grazing angles
    deckSeams(kit, [Math.min(L.walkHalf * s, ox), pz0], [Math.max(L.walkHalf * s, ox), pz1], y0, { xs: s < 0 ? -18.5 : 4.7, zs: pz0 + 2.4, mat: "bridgePitFloor" });
    // alternate 2.4 m plate rows across the whole pit width (±18 % tint, 2 mm, under the 3 mm seams): from the aft
    // deck the pit floor is seen at 20–30 m where 2 cm seams vanish, and the banding is what keeps it from reading
    // as one flat polygon (critic round 3, dais view)
    for (let z = pz0, k = 0; z < pz1 - 0.1; z += 2.4, k++) {
      [a, b] = span(L.walkHalf * s + s * 0.3, ox - s * 0.35);
      kit.boxMM("bridgePitFloor", [a, y0, z + 0.02], [b, y0 + 0.002, Math.min(z + 2.38, pz1 - 0.02)], { color: shade(PLATE, k % 2 ? 0.82 : 1.18), texel: 0.5 });
    }
    for (let k = 0; k < 5; k++) {
      const z = 466 + k * 6.4 + rand() * 1.2;
      const x = s * (7.2 + rand() * 5.2);
      const tint = shade(PLATE, [0.78, 1.18, 0.9, 1.3][k % 4]);
      [a, b] = span(x, x + s * 3.2);
      kit.boxMM("bridgePitFloor", [a, y0, z], [b, y0 + 0.006, z + 2.8], { color: tint, texel: 0.5 });
    }
    for (const z of [468.6, 474.0, 479.4, 484.8, 490.2]) cableCover(kit, s * 19.4, s * 17.75, y0, z);
    for (const z of [470.0, 478.4, 486.8]) cableCover(kit, s * 3.8, s * 7.55, y0, z);
    // aisle cable duct down the pit centre (to 1.2 m short of the aft face) with cover plates and amber inspection
    // lamps, and amber lane dashes 0.55 m either side of it every 1.8 m
    kit.boxMM("paintedMetal", [s * 11 - 0.14, y0, pz0 + 0.6], [s * 11 + 0.14, y0 + 0.035, pz1 - 1.2], { color: IMP.black, texel: 1 });
    for (let z = pz0 + 2.4; z < pz1 - 1.6; z += 3.6) {
      kit.box("paintedMetal", s * 11, y0 + 0.041, z, 0.34, 0.012, 0.5, { color: IMP.mid, texel: 2 });
      kit.box("emitAmber", s * 11 + s * 0.12, y0 + 0.05, z + 0.18, 0.04, 0.008, 0.04);
    }
    for (let z = pz0 + 1.2; z < pz1 - 1.4; z += 1.8) for (const t of [-1, 1]) kit.box("emitAmber", s * 11 + t * 0.55, y0 + 0.008, z, 0.03, 0.006, 0.45);
    dataPillar(kit, s * 11, y0, 474.5, { seed: 7 + (s < 0 ? 0 : 3), screen: "screenImp3" });
    dataPillar(kit, s * 11, y0, 486.8, { seed: 9 + (s < 0 ? 0 : 3), screen: "screenImp1" });
    // aft bay (z 490..500) equipment, so the floor the aft deck looks down on carries something: a third data
    // pillar on the duct, a back-to-back rack island and a floor hatch
    dataPillar(kit, s * 11, y0, 496.0, { seed: 11 + (s < 0 ? 0 : 3), screen: "screenImp2" });
    rack(kit, { x: s * 14.0, y: y0, z: 493.2, yaw: 0, seed: 60 + (s < 0 ? 0 : 5), label: 4 });
    rack(kit, { x: s * 14.0, y: y0, z: 493.2, yaw: Math.PI, seed: 61 + (s < 0 ? 0 : 5) });
    floorHatch(kit, s * 9.9, y0, 492.6);

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
// as a clipped white bar from every pit view). The lamp is a 0.14 × 2.5 m bridgeLamp diffuser (emissive 1.05,
// under the bloom threshold; half the area of the 0.3 m emitWhite strip that still clipped from the pit floor in
// critic round 2) flush under the bottom face between two 0.12 m deep black cheeks, split by 21 black cross
// fins 0.12 m deep at 0.125 m pitch (cut-off ≈ 44° off the vertical). Red end lamps, two rods up into the blue
// ceiling channel.
function raft(kit, x, y, z, rodLen) {
  const dark = shade(IMP.dark, 0.7);
  kit.box("paintedMetal", x, y, z, 0.7, 0.3, 2.8, { color: dark, texel: 1 });
  for (const s of [-1, 1]) {
    kit.box("emitRedImp", x, y + 0.02, z + s * 1.403, 0.16, 0.03, 0.006);
    kit.box("paintedMetal", x, y + 0.15 + rodLen / 2, z + s * 1.2, 0.04, rodLen, 0.04, { color: IMP.black, texel: 2 });
    kit.box("paintedMetal", x + s * 0.11, y - 0.21, z, 0.04, 0.12, 2.6, { color: IMP.black, texel: 1 });
    kit.box("paintedMetal", x, y - 0.21, z + s * 1.28, 0.26, 0.12, 0.04, { color: IMP.black, texel: 1 });
  }
  const yb = y - 0.15;
  kit.box("bridgeLamp", x, yb - 0.006, z, 0.14, 0.012, 2.5, { uv: "keep" });
  for (let k = -10; k <= 10; k++) kit.box("paintedMetal", x, yb - 0.072, z + k * 0.125, 0.18, 0.12, 0.012, { color: IMP.black, texel: 1 });
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
    // inset amber edge line 0.3 m back from both pit edges (fore platform and aft deck), split at the stair heads:
    // a 2 cm emitter in a 0.1 m black inlay — the aft deck floor between the pods and the dais had no read at
    // all from the command camera (critic round 3: "near-black empty floor")
    const edgeLine = (x0, x1, z) => {
      const [p, q] = span(x0, x1);
      if (q - p < 0.3) return;
      kit.boxMM("paintedMetal", [p, y, z - 0.05], [q, y + 0.006, z + 0.05], { color: IMP.black, texel: 1 });
      kit.boxMM("emitAmber", [p + 0.08, y + 0.006, z - 0.01], [q - 0.08, y + 0.012, z + 0.01], { uv: "keep" });
    };
    edgeLine(wx - s * 0.3, s * 4.55, pz0 - 0.3);
    edgeLine(s * 6.05, s * (xi - 0.3), pz0 - 0.3);
    edgeLine(wx - s * 0.3, s < 0 ? sx1 + 0.15 : sx0 - 0.15, pz1 + 0.3);
    edgeLine(s < 0 ? sx0 - 0.15 : sx1 + 0.15, s * (xi - 0.3), pz1 + 0.3);
  }
  // walkway threshold lines at both ends (blue, in a black inlay between the rail inlays): the 36 m black gloss
  // between the pit rails read as a void from the aft camera — the two lines mark where the walkway starts and ends
  for (const z of [pz0 + 0.3, pz1 - 0.3]) {
    kit.boxMM("paintedMetal", [-L.walkHalf + 0.2, y, z - 0.06], [L.walkHalf - 0.2, y + 0.006, z + 0.06], { color: IMP.black, texel: 1 });
    kit.boxMM("emitBlue", [-L.walkHalf + 0.3, y + 0.006, z - 0.012], [L.walkHalf - 0.3, y + 0.012, z + 0.012], { uv: "keep" });
  }
  // deck-plate joints: 2 cm seams on the gloss decks (walkway, fore platform, aft deck), no plates, in the
  // module-local bridgeSeam material (index.js: the deck's lobe with a quarter of its Fresnel, so the x = 0 seam
  // stays dark inside the key spot's grazing streak instead of becoming a bright line as darkGloss/paintedMetal did)
  deckSeams(kit, [-L.walkHalf + 0.2, pz0], [L.walkHalf - 0.2, pz1], y, { xs: -2.4, zs: pz0 + 2.4, mat: "bridgeSeam" });
  deckSeams(kit, [-xi, 458.6], [xi, pz0 - 0.1], y, { xs: -18, zs: 461.2, mat: "bridgeSeam" });
  deckSeams(kit, [-xi, pz1 + 0.1], [xi, 511.6], y, { xs: -18, zs: 502.4, mat: "bridgeSeam" });
  // walkway floor hatches between the pendant pools
  for (const z of [476, 488]) floorHatch(kit, 0, y, z);
  // deck plating on the fore platform and the aft deck (critic round 4: "foreground floor black, featureless" from
  // the command and window cameras): a 2.4 m plate grid in the pit-floor material with 2 cm gaps showing the dark
  // deck (the gaps are the seams here — the plates sit over the deckSeams' level), alternating tints a step darker
  // than the pit plates so the command deck stays the more formal surface. The walkway keeps its gloss (its read is
  // the threshold lines, hatches and the channel reflections). 3 mm thick: under the dais, pods and station bases.
  const plateGrid = (x0, x1, z0, z1) => {
    let k = 0;
    for (let x = x0; x < x1 - 0.05; x += 2.4, k++) {
      for (let z = z0, j = 0; z < z1 - 0.05; z += 2.4, j++) {
        const tint = shade(PLATE, (k + j) % 2 ? 0.62 : 0.8);
        kit.boxMM("bridgePitFloor", [x, y + 0.001, z], [Math.min(x + 2.38, x1), y + 0.004, Math.min(z + 2.38, z1)], { color: tint, texel: 0.5 });
      }
    }
  };
  plateGrid(-xi + 0.3, xi - 0.3, 458.6, pz0 - 0.5);
  plateGrid(-xi + 0.3, xi - 0.3, pz1 + 0.5, 511.6);
}
