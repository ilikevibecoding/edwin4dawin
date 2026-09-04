// Cargo Storage & Logistics Bay: the deck's largest hall. Container stacks (one instanced prefab, ~150
// containers) stand in numbered blocks either side of a marked lane that runs from the blast door to the
// central cargo lift — a 14 m platform with screw-jack posts, a control pedestal and a hazard border. Loader
// sleds are parked by the stacks, a gantry crane on columns carries a container over the west blocks,
// gantry catwalks with stairs run the length of both side walls, and a glazed logistics office watches
// the door from the north-east corner. Amber work light, lane markings everywhere.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, ceilingLight, pointLightDesc, spotLightDesc, railing, catwalk, wallScreen, lockers, walkable, pipeRun, column, crate, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { containerPrefab, instancePrefab, platform, industrialStair, craneRails, craneBridge, hazardKerb, hazardBand, floorDecal, deckMark, relayCabinet, cableTray, screenBank, beacon, toolCart, yawQ } from "./engKit.js";

export function buildCargo(kit, ctx) {
  addEngMaterials(ctx.mats);
  const { room, floorY: y, id } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const T = STD.wallT;
  const rand = rng(97);

  buildShell(kit, ctx, id, room, {
    wall: { slabHoles: true, pitch: 4, tone: IMP.wallDark, toneAlt: IMP.wallMid, bandMat: "lightBandWarm", styles: { plain: 0.35, control: 0.1, vent: 0.2, hatch: 0.15, pipes: 0.15, screen: 0.05 } },
    ceiling: { lights: false, panelW: 3.0, tone: IMP.wallDark },
    floor: { tone: IMP.wallDark },
  });
  const walls = roomWalls(room);

  // ------------------------------------------------------------ central cargo lift
  const LIFT = { x: 0, z: 706, half: 7 };
  const LY = y + 0.3;
  {
    const { x: lx, z: lz, half: hf } = LIFT;
    platform(kit, ctx, lx - hf, lz - hf, lx + hf, lz + hf, y, LY, { glow: "emitAmber", tone: IMP.wallMid, tag: "cargoLift" });
    // hazard border + landing target + seam lines on the plate
    for (const s of [-1, 1]) {
      hazardBand(kit, [lx, LY - 0.1, lz + s * (hf + 0.021)], s > 0 ? 0 : Math.PI, hf * 2 - 0.2, 0.12);
      hazardBand(kit, [lx + s * (hf + 0.021), LY - 0.1, lz], s > 0 ? -Math.PI / 2 : Math.PI / 2, hf * 2 - 0.2, 0.12);
    }
    const border = new THREE.PlaneGeometry(hf * 2 - 0.2, 0.5);
    border.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) {
      kit.add("hazard", border.clone(), { pos: [lx, LY + 0.004, lz + s * (hf - 0.35)], uv: "scale", uvScale: [(hf * 2) / 0.6, 1] });
      kit.add("hazard", border.clone(), { pos: [lx + s * (hf - 0.35), LY + 0.004, lz], rot: [0, Math.PI / 2, 0], uv: "scale", uvScale: [(hf * 2) / 0.6, 1] });
    }
    deckMark(kit, lx, LY, lz, 6, 6, 1, 0);
    for (const s of [-1, 1]) {
      kit.boxMM("impMetal", [lx + s * 3.5 - 0.03, LY + 0.002, lz - hf + 0.6], [lx + s * 3.5 + 0.03, LY + 0.008, lz + hf - 0.6], { color: IMP.steel });
      kit.boxMM("impMetal", [lx - hf + 0.6, LY + 0.002, lz + s * 3.5 - 0.03], [lx + hf - 0.6, LY + 0.008, lz + s * 3.5 + 0.03], { color: IMP.steel });
    }
    // screw-jack posts at the corners with a threaded look, guide collars, and the lift machinery housings
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = lx + sx * (hf + 1.0);
        const pz = lz + sz * (hf + 1.0);
        kit.box("impPaintedMetal", px, y + 0.3, pz, 1.4, 0.6, 1.4, { color: IMP.trim, texel: 1 });
        kit.cyl("impMetal", px, y + 0.6 + 2.0, pz, 0.32, 4.0, "y", { color: IMP.steel, segments: 16, texel: 0.5 });
        for (let k = 0; k < 9; k++) kit.cyl("impPaintedMetal", px, y + 1.0 + k * 0.4, pz, 0.38, 0.08, "y", { color: IMP.gunmetal, segments: 16 });
        kit.box("impPaintedMetal", px, y + 4.75, pz, 0.9, 0.5, 0.9, { color: IMP.trim, texel: 1 });
        kit.box("emitAmber", px, y + 4.75, pz + 0.455, 0.5, 0.06, 0.01);
        kit.collider([px - 0.7, y, pz - 0.7], [px + 0.7, y + 5, pz + 0.7], "jack");
      }
      // machinery housings on the east/west flanks
      const mx = lx + sx * (hf + 2.6);
      kit.box("impPaintedMetal", mx, y + 0.9, lz, 1.6, 1.8, 5.0, { color: IMP.wallDark, texel: 1 });
      kit.box("impMetal", mx, y + 1.83, lz, 1.7, 0.06, 5.1, { color: IMP.trim });
      for (let k = -2; k <= 2; k++) kit.box("impMetal", mx - sx * 0.83, y + 0.9, lz + k * 0.9, 0.06, 1.2, 0.5, { color: IMP.gunmetal });
      kit.box("blinkSparse", mx - sx * 0.81, y + 1.5, lz + 2.1, 0.004, 0.2, 0.5, { uv: "keep" });
      hazardBand(kit, [mx - sx * 0.805, y + 0.2, lz], sx > 0 ? Math.PI / 2 : -Math.PI / 2, 4.8, 0.2);
      kit.collider([mx - 0.8, y, lz - 2.5], [mx + 0.8, y + 1.9, lz + 2.5], "liftMachinery");
      pipeRun(kit, [[mx, y + 1.86, lz - 1.5], [mx, y + 4.0, lz - 1.5], [lx + sx * (hf + 1.0), y + 4.0, lz - 1.5], [lx + sx * (hf + 1.0), y + 4.0, lz - hf - 1.0]], 0.12, { color: IMP.gunmetal, clampPitch: 2 });
    }
    // control pedestal at the north edge + keep-clear hatching around the lift
    impConsole(kit, ctx, [lx - 4.5, y, lz - hf - 1.6], Math.PI, { kind: "station", width: 1.3, screens: 1, seed: 300, light: false });
    for (const s of [-1, 1]) {
      deckMark(kit, lx + s * (hf + 2.7), y, lz + 5.0, 3.4, 3.4, 2, 0);
      deckMark(kit, lx + s * (hf + 2.7), y, lz - 5.0, 3.4, 3.4, 2, 0);
      deckMark(kit, lx + s * 4.5, y, lz + hf + 1.8, 3.4, 3.4, 2, 0);
    }
    // shaft outline on the ceiling: a lit frame and four hoist sheaves
    kit.boxMM("impPaintedMetal", [lx - hf - 0.4, y + h - 0.6, lz - hf - 0.4], [lx + hf + 0.4, y + h, lz - hf + 0.2], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPaintedMetal", [lx - hf - 0.4, y + h - 0.6, lz + hf - 0.2], [lx + hf + 0.4, y + h, lz + hf + 0.4], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPaintedMetal", [lx - hf - 0.4, y + h - 0.6, lz - hf + 0.2], [lx - hf + 0.2, y + h, lz + hf - 0.2], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPaintedMetal", [lx + hf - 0.2, y + h - 0.6, lz - hf + 0.2], [lx + hf + 0.4, y + h, lz + hf - 0.2], { color: IMP.trim, texel: 1 });
    kit.boxMM("emitRed", [lx - hf + 0.2, y + h - 0.61, lz - hf - 0.1], [lx + hf - 0.2, y + h - 0.6, lz - hf + 0.1]);
    kit.boxMM("emitRed", [lx - hf + 0.2, y + h - 0.61, lz + hf - 0.1], [lx + hf - 0.2, y + h - 0.6, lz + hf + 0.1]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("impMetal", lx + sx * (hf - 1), y + h - 1.0, lz + sz * (hf - 1), 0.6, 0.3, "x", { color: IMP.gunmetal, segments: 16 });
  }

  // ------------------------------------------------------------ container blocks (instanced)
  const palette = [IMP.wallMid, IMP.gunmetal, IMP.wallMid, IMP.steel, 0x7a3a2c, 0x8a8440, IMP.wallDark, IMP.fabricOlive];
  const pf = containerPrefab(ctx.mats, [2.4, 2.4, 2.4], { label: 3, label2: 9 });
  const xf = [];
  const C = 2.4;
  const G = 0.18;
  const blocks = [
    // [x, z, cols(x), rows(z), layers, bay numeral]
    [-42, 668, 3, 2, 3, 1],
    [-42, 682, 3, 3, 2, 2],
    [-30, 668, 2, 2, 3, 3],
    [-42, 708, 3, 2, 3, 4],
    [-42, 728, 3, 2, 3, 5],
    [-30, 728, 2, 2, 2, 6],
    [32, 680, 3, 2, 3, 7],
    [20, 690, 2, 2, 2, 8],
    [32, 700, 3, 3, 2, 9],
    [32, 722, 3, 2, 3, 10],
    [20, 728, 3, 2, 1, 11],
  ];
  for (const [bx, bz, cols, rows, layers] of blocks) {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // top layer is ragged: some stacks stop short
        const L = layers - (rand() < 0.3 && layers > 1 ? 1 : 0);
        for (let l = 0; l < L; l++) {
          const t = { pos: [bx + c * (C + G) + C / 2, y + l * (C + 0.05), bz + r * (C + G) + C / 2], quat: yawQ((rand() - 0.5) * 0.06 + (rand() < 0.5 ? 0 : Math.PI)), color: palette[Math.floor(rand() * palette.length)] };
          xf.push(t);
        }
      }
    }
    const W = cols * (C + G) - G;
    const D = rows * (C + G) - G;
    kit.collider([bx, y, bz], [bx + W, y + layers * (C + 0.05), bz + D], "containers");
    // bay numeral in front of the block (on the lane side) and a kerb along its front
    const lane = bx < 0 ? 1 : -1;
    const fx = lane > 0 ? bx + W + 2.2 : bx - 2.2;
    deckMark(kit, fx, y, bz + D / 2, 2.6, 2.6, 3, lane > 0 ? -Math.PI / 2 : Math.PI / 2);
    hazardKerb(kit, [lane > 0 ? bx + W + 0.3 : bx - 0.3, bz - 0.3], [lane > 0 ? bx + W + 0.3 : bx - 0.3, bz + D + 0.3], y, { w: 0.22, h: 0.05 });
  }
  // a few loose containers around the lift and the lane
  for (const [cx, cz, yaw] of [[-11, 696, 0.3], [11.5, 717, -0.2], [12.5, 693, 0.1], [-13.5, 719, 0.8]]) {
    xf.push({ pos: [cx, y, cz], quat: yawQ(yaw), color: palette[Math.floor(rand() * palette.length)] });
    kit.collider([cx - 1.8, y, cz - 1.8], [cx + 1.8, y + 2.4, cz + 1.8], "container");
  }
  // receiving area inside the blast door, east of the lane: three containers just set down on a
  // keep-clear hatch (one stacked), waiting for the sled parked in front of them
  {
    const RZ = 677.5;
    for (const [cx, cz, yaw, col] of [[9.6, RZ - 0.1, 0.05, IMP.steel], [12.3, RZ + 0.1, 0.18, 0x7a3a2c]]) {
      xf.push({ pos: [cx, y, cz], quat: yawQ(yaw), color: col });
    }
    xf.push({ pos: [9.7, y + C + 0.05, RZ], quat: yawQ(-0.12), color: IMP.fabricOlive });
    kit.collider([8.2, y, RZ - 1.6], [13.8, y + 2 * C + 0.1, RZ + 1.6], "receiving");
    deckMark(kit, 11.0, y, RZ, 6.6, 3.6, 2, 0);
    hazardKerb(kit, [7.6, RZ - 2.1], [7.6, RZ + 2.1], y, { w: 0.22, h: 0.05 });
  }
  const colorKeys = new Set(["impPaintedMetal"]);

  // ------------------------------------------------------------ loader sleds (original repulsor-sled shapes)
  const sled = (pos, yaw, opts = {}) => {
    const { color = IMP.hazardYellow, forks = true, seed = 1 } = opts;
    const q = yawQ(yaw);
    const o = new THREE.Vector3(...pos);
    const L = (x, yy, z) => o.clone().add(new THREE.Vector3(x, yy, z).applyQuaternion(q));
    const box = (mat, x, yy, z, sx, sy, sz, extra = {}) => {
      const p = L(x, yy, z);
      kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
    };
    const cyl = (mat, x, yy, z, r, len, extra = {}) => {
      const p = L(x, yy, z);
      kit.add(mat, new THREE.CylinderGeometry(r, r, len, extra.segments || 12), { pos: [p.x, p.y, p.z], quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), uv: "scale", uvScale: [2, 1], ...extra });
    };
    // hull: low chamfered deck floating on four repulsor pads
    box("impPaintedMetal", 0, 0.55, 0.2, 2.0, 0.5, 3.6, { color, texel: 1 });
    box("impPaintedMetal", 0, 0.85, 0.2, 1.7, 0.1, 3.3, { color: IMP.trim, texel: 1 });
    box("impMetal", 0, 0.32, 0.2, 1.6, 0.14, 3.0, { color: IMP.gunmetal, texel: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box("impPaintedMetal", sx * 0.7, 0.24, 0.2 + sz * 1.3, 0.5, 0.16, 0.7, { color: IMP.wallDark, texel: 1 });
      box("emitBlue", sx * 0.7, 0.155, 0.2 + sz * 1.3, 0.4, 0.01, 0.6);
    }
    // driver's seat + control yoke at the back, headlight bar at the front
    box("impPaintedMetal", 0, 1.15, 1.45, 0.9, 0.7, 0.5, { color: IMP.wallDark, texel: 1 });
    box("impPaintedMetal", 0, 1.0, 1.05, 0.8, 0.14, 0.7, { color: IMP.fabricBlack, texel: 1 });
    box("impPaintedMetal", 0, 1.35, 1.35, 0.8, 0.7, 0.14, { color: IMP.fabricBlack, texel: 1 });
    cyl("impMetal", 0, 1.3, 0.4, 0.04, 0.9, { color: IMP.steel, segments: 8 });
    box("impPaintedMetal", 0, 1.75, 0.15, 0.6, 0.25, 0.3, { color: IMP.consoleDark, texel: 1 });
    box("blinkSparse", 0, 1.78, 0.0, 0.5, 0.15, 0.004, { uv: "keep" });
    box("impPaintedMetal", 0, 0.75, -1.65, 1.6, 0.16, 0.16, { color: IMP.trim, texel: 1 });
    box("emitAmber", 0, 0.75, -1.735, 1.3, 0.06, 0.01);
    box("emitAmber", 0.75, 1.0, 1.45, 0.06, 0.06, 0.04);
    if (forks) for (const sx of [-1, 1]) box("impMetal", sx * 0.6, 0.42, -2.3, 0.22, 0.1, 1.6, { color: IMP.steel, texel: 1 });
    const g = new THREE.PlaneGeometry(0.5, 0.5);
    const lp = L(1.0, 0.6, 0.6);
    kit.add("impDecal", g, { pos: [lp.x, lp.y, lp.z], quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)), uv: "keep", uvRect: impDecalRect(6 + (seed % 4)) });
    const a = L(-1.05, 0, -3.15);
    const b = L(1.05, 0, 1.8);
    const c = L(-1.05, 0, 1.8);
    const d = L(1.05, 0, -3.15);
    kit.collider([Math.min(a.x, b.x, c.x, d.x), pos[1], Math.min(a.z, b.z, c.z, d.z)], [Math.max(a.x, b.x, c.x, d.x), pos[1] + 1.7, Math.max(a.z, b.z, c.z, d.z)], "sled");
  };
  sled([-19, y, 690], Math.PI / 2, { seed: 1 });
  sled([17, y, 710.5], -Math.PI / 2 + 0.3, { color: IMP.red, seed: 2 });
  sled([-8, y, 730], Math.PI, { color: IMP.hazardYellow, forks: false, seed: 3 });
  toolCart(kit, [-16, y, 732.5], 0.5, { seed: 12 });
  // receiving area: a sled nosed up to the fresh containers (forks toward them), and a pile of small
  // crates being sorted on the west side of the lane with the checker's cart
  sled([9.4, y, 684.2], 0, { color: IMP.hazardYellow, seed: 4 });
  crate(kit, [-10.6, y, 676.4], [1.6, 1.2, 1.4], { seed: 61 });
  crate(kit, [-8.6, y, 677.0], [1.3, 1.0, 1.2], { seed: 62, yaw: 0.3 });
  crate(kit, [-10.5, y + 1.2, 676.5], [1.2, 0.9, 1.0], { seed: 63, yaw: -0.15 });
  crate(kit, [-12.6, y, 678.4], [1.1, 0.8, 1.1], { seed: 64, yaw: 0.6 });
  kit.collider([-13.3, y, 675.5], [-7.8, y + 2.2, 679.1], "sorting");
  toolCart(kit, [-9.2, y, 680.6], 1.25, { seed: 13 });
  deckMark(kit, -10.4, y, 677.4, 6.0, 4.0, 2, 0);

  // ------------------------------------------------------------ gantry crane on columns, carrying a container
  const CRX = 24;
  const CRY = y + h - 1.6;
  craneRails(kit, z0 + 3, z1 - 3, -CRX, CRX, CRY, "z", { brackets: false, h: 0.8, w: 0.4 });
  for (const sx of [-1, 1]) for (const cz of [672, 686, 698, 714, 726, 736]) column(kit, sx * CRX, cz, y, CRY - 0.4, { w: 0.7, d: 0.7, lit: true });
  craneBridge(kit, CRX * 2, CRY + 0.7, 690, { cx: 0, tx: -12, drop: 4.2, girder: 1.0 });
  {
    // slung container under the hook: spreader beam and four chains, the box itself joins the instances
    const cx = -12;
    const cz = 690;
    const top = CRY + 0.7 - 4.2 - 1.0;
    kit.box("impPaintedMetal", cx, top - 0.15, cz, 2.8, 0.3, 0.4, { color: IMP.hazardYellow, texel: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("impMetal", cx + sx * 1.15, top - 0.3 - 0.4, cz + sz * 1.0, 0.02, 0.8, "y", { color: IMP.steel, segments: 6 });
    xf.push({ pos: [cx, top - 1.1 - 2.4, cz], quat: yawQ(0.08), color: IMP.gunmetal });
  }
  instancePrefab(kit, pf, xf, { colorKeys });

  // ------------------------------------------------------------ gantry catwalks along both side walls, with stairs
  const CY = y + 6;
  for (const s of [-1, 1]) {
    const wx = s < 0 ? x0 + T : x1 - T; // wall face
    const cx = wx - s * 1.05; // catwalk centre (2 m wide, hugging the wall)
    const zA = 677.2;
    const zB = 727.0;
    catwalk(kit, ctx, [cx, zA], [cx, zB], 2.0, CY, { rails: false });
    railing(kit, [cx - s * 1.0, zA], [cx - s * 1.0, zB], CY, { lit: true });
    for (let bz = zA + 2; bz < zB; bz += 4) kit.box("impPaintedMetal", wx - s * 0.6, CY - 0.5, bz, 1.2, 0.7, 0.3, { color: IMP.trim, texel: 1 });
    // stairs down at both ends (ascend toward the catwalk)
    industrialStair(kit, ctx, [cx, zA - 8.4], [0, 1], 1.6, y, CY, { riser: 0.2, tread: 0.28 });
    industrialStair(kit, ctx, [cx, zB + 8.4], [0, -1], 1.6, y, CY, { riser: 0.2, tread: 0.28 });
    // wall dressing at catwalk level: light bands and stencils
    const w = s < 0 ? walls.west : walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    for (const dz of [685, 702, 719]) frame.quad("impDecal", w.u(dz), 7.8, 0.064, 1.4, 1.4, { uvRect: impDecalRect(s < 0 ? 4 : 8) });
    cableTray(frame, w.u(s < 0 ? zB : zA), w.u(s < 0 ? zA : zB), 7.4, { n: 0.4, cables: 4 });
  }

  // ------------------------------------------------------------ logistics office (north-east corner, glazed booth)
  {
    const bx0 = 33.0;
    const bx1 = x1 - T;
    const bz0 = z0 + T;
    const bz1 = 673.5;
    const BH = 3.2;
    kit.boxMM("impPaintedMetal", [bx0, y, bz0], [bx1, y + 0.15, bz1], { color: IMP.trim, texel: 1 });
    kit.boxMM("impDeck", [bx0 + 0.05, y + 0.15, bz0 + 0.05], [bx1 - 0.05, y + 0.16, bz1 - 0.05], { color: IMP.wallMid, texel: 0.5 });
    walkable(ctx, bx0, bz0, bx1, bz1, y + 0.16, "office");
    // glazing: sill, glass, head beam + mullions; a 1.6 m opening on the west side
    const glaze = (ax, az, bx, bz, gap = null) => {
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dz, dx);
      const q = yawQ(yaw);
      const mid = [(ax + bx) / 2, (az + bz) / 2];
      kit.add("impPaintedMetal", new THREE.BoxGeometry(len, 0.9, 0.16), { pos: [mid[0], y + 0.6, mid[1]], quat: q, color: IMP.wallDark, texel: 1 });
      kit.add("impPaintedMetal", new THREE.BoxGeometry(len, 0.2, 0.2), { pos: [mid[0], y + BH - 0.1, mid[1]], quat: q, color: IMP.trim, texel: 1 });
      kit.add("glassDark", new THREE.BoxGeometry(len - 0.04, BH - 1.25, 0.03), { pos: [mid[0], y + 1.05 + (BH - 1.25) / 2, mid[1]], quat: q });
      const n = Math.max(1, Math.round(len / 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        kit.add("impPaintedMetal", new THREE.BoxGeometry(0.1, BH, 0.1), { pos: [ax + dx * t, y + BH / 2, az + dz * t], color: IMP.trim, texel: 1 });
      }
      if (!gap) kit.collider([Math.min(ax, bx) - 0.1, y, Math.min(az, bz) - 0.1], [Math.max(ax, bx) + 0.1, y + BH, Math.max(az, bz) + 0.1], "glazing");
    };
    glaze(bx0, bz1, bx1, bz1); // south face
    glaze(bx0, bz0, bx0, bz1 - 2.2); // west face up to the opening
    kit.collider([bx0 - 0.1, y, bz0], [bx0 + 0.1, y + BH, bz1 - 2.2], "glazing");
    kit.box("impPaintedMetal", bx0, y + BH - 0.15, bz1 - 1.1, 0.16, 0.3, 2.2, { color: IMP.trim, texel: 1 });
    kit.box("emitBlue", bx0 - 0.09, y + BH - 0.15, bz1 - 1.1, 0.01, 0.06, 1.6);
    kit.boxMM("impPaintedMetal", [bx0 - 0.1, y + BH, bz0], [bx1, y + BH + 0.3, bz1 + 0.1], { color: IMP.wallDark, texel: 1 });
    // inside: two consoles facing the bay through the south glass, a screen wall on the east, lockers
    impConsole(kit, ctx, [bx0 + 4.0, y + 0.16, bz1 - 1.2], Math.PI, { kind: "wide", width: 2.6, screens: 3, seed: 310, light: true });
    impConsole(kit, ctx, [bx0 + 8.6, y + 0.16, bz1 - 1.2], Math.PI, { kind: "wide", width: 2.4, screens: 3, seed: 311, light: false });
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenBank(frame, w.u((bz0 + bz1) / 2), 2.1, 3, 2, 1.1, 0.7, 37);
    const wn = walls.north;
    const fn = wallFrame(kit, wn.from, wn.to, y).frame;
    lockers(fn, wn.u(bx0 + 1.0), wn.u(bx0 + 5.0), 2.1, { seed: 39 });
    wallScreen(fn, wn.u(bx0 + 8.5), 2.2, 1.6, 0.9, 2);
    pointLightDesc(ctx, 0xd6e2ff, 3.0, 8, [(bx0 + bx1) / 2, y + BH - 0.3, (bz0 + bz1) / 2], 1);
    floorDecal(kit, bx0 - 1.6, y, bz1 - 1.1, 1.0, 5, Math.PI / 2);
  }

  // ------------------------------------------------------------ lanes, stencils, wall dressing
  deckMark(kit, 0, y, (z0 + T + 4 + LIFT.z - LIFT.half - 2) / 2, LIFT.z - LIFT.half - 2 - (z0 + T + 4), 4.4, 0, Math.PI / 2);
  deckMark(kit, -22, y, 690, 34, 4.0, 0, 0);
  deckMark(kit, 22, y, 690, 34, 4.0, 0, 0);
  deckMark(kit, 0, y, 735, 60, 4.0, 0, 0);
  floorDecal(kit, 3.6, y, z0 + T + 5, 1.4, 0);
  floorDecal(kit, -3.6, y, z0 + T + 5, 1.4, 15);
  for (const [bx, bz] of [[-11.5, 698.8], [11.5, 698.8], [-11.5, 713.2], [11.5, 713.2]]) beacon(kit, ctx, [bx, y, bz], { light: false, mat: "emitAmber" });
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    relayCabinet(frame, w.u(-8), 0, 3.0, 3.2, 320);
    relayCabinet(frame, w.u(8), 0, 3.0, 3.2, 321);
    wallScreen(frame, w.u(-14), 2.6, 1.8, 1.0, 1);
    wallScreen(frame, w.u(14), 2.6, 1.8, 1.0, 0);
    frame.quad("impDecal", w.u(-22), 6.5, 0.064, 2.4, 2.4, { uvRect: impDecalRect(1) });
    frame.quad("impDecal", w.u(22), 6.5, 0.064, 2.4, 2.4, { uvRect: impDecalRect(13) });
    cableTray(frame, 1.0, w.u(30), 4.6, { n: 0.5, cables: 4 });
  }
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    for (const dx of [-30, -10, 10, 30]) frame.quad("impDecal", w.u(dx), 6.5, 0.064, 2.4, 2.4, { uvRect: impDecalRect(dx < 0 ? 3 : 9) });
    relayCabinet(frame, w.u(0), 0, 3.0, 3.6, 322);
    wallScreen(frame, w.u(-20), 2.6, 1.8, 1.0, 2);
    wallScreen(frame, w.u(20), 2.6, 1.8, 1.0, 1);
    lockers(frame, w.u(14), w.u(8), 2.1, { seed: 45 });
  }

  // ------------------------------------------------------------ lights: amber work light on long drops
  // The bay is 92 x 76 m under a 12 m ceiling, so the fixtures hang their light 5.5 m over the deck and
  // run hot; priority 2 keeps them ahead of the lobby lights in the pool when standing at the door. The
  // two centre-lane fixtures over the receiving area and the lift hand over to shadow-casting spots.
  for (const lx of [-30, 0, 30]) for (const lz of [676, 700, 724]) {
    const spot = lx === 0 && lz !== 724;
    ceilingLight(kit, ctx, [lx, y + h, lz], 8, "x", { mat: "lightBandWarm", color: 0xffc27a, intensity: spot ? 0 : 90, distance: 40, priority: 2, drop: 6.5 });
  }
  spotLightDesc(ctx, 0xffd3a0, 560, 40, [0, y + h - 1.4, 677], [0, y, 679], { angle: 0.8, penumbra: 0.5, priority: 2 }); // receiving lane
  spotLightDesc(ctx, 0xffd3a0, 380, 40, [0, y + h - 1.4, LIFT.z - 2], [0, y, LIFT.z], { angle: 0.8, penumbra: 0.5, priority: 2 }); // lift plate (yellow paint blows out sooner)
  pointLightDesc(ctx, 0xdfe8ff, 3.0, 9, [0, y + 3.6, z0 + T + 2.0], 1); // blast door

  // ------------------------------------------------------------ views
  ctx.view("cargo", 0, y + STD.eye, z0 + T + 1.6, 180, -2);
  ctx.view("cargo_catwalk", x0 + T + 1.05, CY + STD.eye, 696, -110, -10);
  ctx.view("cargo_lift", 3.0, LY + STD.eye, LIFT.z + 2.0, 60, 4);
  void rand;
}
