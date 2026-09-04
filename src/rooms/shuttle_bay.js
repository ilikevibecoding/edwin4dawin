// Shuttle & secondary docking bay (workstream HANGAR): 50 × 18 × 80 m east of the main hangar,
// entered through the 20 m blast door in its W wall. A round landing pad (centre local (0, -5),
// r 12 kept clear for the shuttle model placed by the fighters workstream), a refuelling boom, mobile
// boarding stairs, cargo pallets in a marshalling area, a customs / inspection point and blue-white
// lighting. The flight-control booth (world x 65.4..89.4, y -24..-20, z -37..-23) intrudes into this
// room's upper SW corner: that volume is left empty and boxed in by a soffit so neither room shows
// through the other. Room-local coordinates (floor centre, -z forward).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { ROOM_BY_ID } from "../spec.js";
import { lux, roomWalls, impConsole, impChair } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { HG_DECAL, hgNumber } from "../textures_hangar.js";
import { rng } from "../kit.js";
import {
  hgSetup,
  Placer,
  tiltedBox,
  tube,
  hose,
  deckDecal,
  deckDecalImp,
  dashedLine,
  deckLine,
  hgRailing,
  hgHazardBorder,
  hgFloorDrain,
  hgToolWall,
  hgPallet,
  hgBeacons,
  hgFuelBowser,
  hgHoseReel,
  hgToolCart,
  hgPowerBox,
  hgDiagConsole,
  hgFloorSocket,
  hgDeckLamp,
  hgCrateStack,
  hgManifold,
  hgWall,
  hgWallOpenings,
  hgCeiling,
} from "./hangar_kit.js";

/** Mobile boarding stairs: wheeled chassis, solid-sided flight rising toward -x, top platform. */
function boardingStairs(kit, ux, uz, opts = {}) {
  const { accentKey = "emitBlue", top = 3.2 } = opts;
  const w = 1.6;
  const z0 = uz - w / 2;
  const z1 = uz + w / 2;
  const px0 = ux - 0.2; // platform (pad side)
  const px1 = ux + 1.4;
  const sx1 = ux + 5.2; // foot of the flight
  // chassis: base frame, wheels, tow bar
  kit.boxMM("impTrim", [px0, 0.32, z0 - 0.1], [sx1 + 0.3, 0.52, z1 + 0.1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("chevronY", [px0, 0.34, z0 - 0.11], [sx1 + 0.3, 0.5, z1 + 0.11], { texel: 1.5 });
  for (const x of [px0 + 0.7, sx1 - 0.5]) {
    for (const z of [z0 - 0.05, z1 + 0.05]) {
      kit.cyl("rubber", x, 0.3, z, 0.3, 0.24, "z", { color: PALETTE.impCharcoal, segments: 14 });
      kit.cyl("impMetal", x, 0.3, z, 0.12, 0.28, "z", { color: PALETTE.impGrey, segments: 10 });
    }
  }
  kit.box("impMetal", sx1 + 0.8, 0.35, uz, 1.0, 0.08, 0.1, { color: PALETTE.impGrey });
  kit.box("impTrim", sx1 + 1.3, 0.3, uz, 0.16, 0.16, 0.5, { color: PALETTE.impBlack });
  // flight: steps (floors) rising from sx1 (deck) to px1 (top), treads, solid side panels
  const n = Math.round(top / 0.18);
  kit.stairs(px1, z0 + 0.05, sx1, z1 - 0.05, "x", sx1, px1, 0, top, n);
  for (let k = 0; k < n; k++) {
    const yt = (top * (k + 1)) / n;
    const xa = sx1 - ((sx1 - px1) * (k + 1)) / n;
    const xb = sx1 - ((sx1 - px1) * k) / n;
    kit.boxMM("impMetalRough", [xa - 0.02, yt - 0.05, z0 + 0.06], [xb + 0.02, yt, z1 - 0.06], { color: PALETTE.impGreyDark, texel: 2 });
    kit.boxMM("chevronY", [xa - 0.02, yt + 0.001, z0 + 0.08], [xa + 0.06, yt + 0.008, z1 - 0.08], { texel: 3 });
  }
  for (const [za, zb] of [[z0 - 0.02, z0 + 0.06], [z1 - 0.06, z1 + 0.02]]) {
    // side panel: a thin wedge approximated by the sloped stringer plus a lower skirt
    tiltedBox(kit, "impTrim", new THREE.Vector3(sx1, 0.5, (za + zb) / 2), new THREE.Vector3(px1, top + 0.3, (za + zb) / 2), zb - za, 0.9, { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impPanel1", [px1, 0.5, za], [sx1 - 0.3, top * 0.35, zb], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    kit.collider([px1, 0, za - 0.06], [sx1, top + 1.2, zb + 0.06], "stair-side");
  }
  // sloped handrails
  for (const z of [z0 - 0.02, z1 + 0.02]) {
    const a = new THREE.Vector3(sx1, 0, z);
    const b = new THREE.Vector3(px1, top, z);
    const up = new THREE.Vector3(0, 1.05, 0);
    tube(kit, "impMetal", a.clone().add(up), b.clone().add(up), 0.035, { color: PALETTE.impGreyDark, segments: 8 });
    for (let k = 0; k <= 3; k++) {
      const p = a.clone().lerp(b, k / 3);
      kit.box("impTrim", p.x, p.y + 0.52, p.z, 0.07, 1.05, 0.07, { color: PALETTE.impBlack });
    }
  }
  // top platform (walkable) with railings on three sides; the pad-side end is open
  kit.boxMM("impMetalRough", [px0, top - 0.12, z0], [px1, top - 0.02, z1], { color: PALETTE.impCharcoal, texel: 0.5 });
  kit.boxMM("hangar_grate", [px0 + 0.02, top - 0.02, z0 + 0.02], [px1 - 0.02, top, z1 - 0.02], { texel: 1 });
  kit.floor(px0, z0, px1, z1, top, "boarding-platform");
  kit.collider([px0, 0.5, z0], [px1, top - 0.02, z1], "boarding-slab");
  kit.colliders[kit.colliders.length - 1].walkable = true;
  hgRailing(kit, [px0, z0 + 0.06], [px1, z0 + 0.06], top, { h: 1.05, postStep: 1.6 });
  hgRailing(kit, [px0, z1 - 0.06], [px1, z1 - 0.06], top, { h: 1.05, postStep: 1.6 });
  // platform legs, lamp, ident
  for (const [lx, lz] of [[px0 + 0.15, z0 + 0.15], [px0 + 0.15, z1 - 0.15]]) kit.box("impTrim", lx, (0.5 + top) / 2, lz, 0.14, top - 0.5, 0.14, { color: PALETTE.impBlack });
  kit.box("impTrim", px1 - 0.1, top + 1.4, z1 - 0.06, 0.1, 0.5, 0.1, { color: PALETTE.impBlack });
  kit.box(accentKey, px1 - 0.1, top + 1.68, z1 - 0.06, 0.16, 0.08, 0.16);
  kit.add("decalImp", new THREE.PlaneGeometry(0.5, 0.5).rotateY(-Math.PI / 2), { pos: [px0 - 0.01, top - 0.4, uz], uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs2) });
}

/** Refuelling boom: pedestal, mast, jib reaching toward `aim`, hanging hose with a nozzle. */
function refuelBoom(kit, x, z, aim, beacons, accentKey = "emitBlue") {
  kit.cyl("impTrim", x, 0.3, z, 1.4, 0.6, "y", { color: PALETTE.impBlack, segments: 20 });
  kit.cyl("chevronY", x, 0.62, z, 1.42, 0.06, "y", { segments: 20, texel: 1 });
  kit.box("impMetal", x, 1.3, z, 1.6, 1.4, 1.6, { color: PALETTE.impGreyDark, texel: 1 });
  kit.box("impTrim", x, 1.3, z + 0.81, 0.9, 0.7, 0.04, { color: PALETTE.impBlack });
  kit.add("scrBlue1", new THREE.PlaneGeometry(0.6, 0.35), { pos: [x, 1.4, z + 0.835], uv: "keep" });
  kit.cyl("impMetal", x, 5.5, z, 0.42, 7.2, "y", { color: PALETTE.impGrey, segments: 14, texel: 0.5 });
  for (const yy of [2.6, 5.0, 7.4]) kit.cyl("impTrim", x, yy, z, 0.48, 0.3, "y", { color: PALETTE.impBlack, segments: 14 });
  const top = new THREE.Vector3(x, 9.1, z);
  kit.box("impTrim", x, 9.3, z, 1.2, 1.0, 1.2, { color: PALETTE.impBlack, texel: 1 });
  const tip = new THREE.Vector3(aim[0], aim[1], aim[2]);
  const back = top.clone().add(top.clone().sub(tip).setY(0).normalize().multiplyScalar(2.6)).setY(9.6);
  tiltedBox(kit, "impMetal", top.clone().setY(9.4), tip, 0.5, 0.6, { color: PALETTE.impGreyDark, texel: 1 });
  tiltedBox(kit, "impTrim", top.clone().setY(9.4), back, 0.4, 0.5, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impTrim", back.x, back.y - 0.1, back.z, 0.9, 0.9, 0.9, { color: PALETTE.impBlack, texel: 1 }); // counterweight
  tube(kit, "impMetal", top.clone().setY(10.2), tip.clone().add(new THREE.Vector3(0, 0.3, 0)).lerp(top, 0.1), 0.03, { color: PALETTE.impGrey, segments: 6 }); // stay cable
  // hazard bands + tip lamp + hanging hose
  const t2 = tip.clone().lerp(top.clone().setY(9.4), 0.12);
  kit.box("chevronY", t2.x, t2.y, t2.z, 0.62, 0.72, 0.62, { texel: 1.5 });
  beacons.push([tip.x, tip.y + 0.5, tip.z, 0.3, 0.3, 0.3]);
  kit.box("impTrim", tip.x, tip.y - 0.55, tip.z, 0.5, 0.5, 0.5, { color: PALETTE.impBlack });
  hose(kit, "rubber", tip.clone().add(new THREE.Vector3(0, -0.8, 0)), tip.clone().add(new THREE.Vector3(0.3, -4.2, 0.4)), -0.4, 0.09, 6, { color: PALETTE.impCharcoal });
  kit.box("impMetal", tip.x + 0.3, tip.y - 4.55, tip.z + 0.4, 0.3, 0.7, 0.3, { color: PALETTE.impGrey });
  kit.box(accentKey, tip.x + 0.3, tip.y - 4.4, tip.z + 0.56, 0.12, 0.08, 0.02);
  kit.collider([x - 1.45, 0, z - 1.45], [x + 1.45, 2.1, z + 1.45], "boom");
}

export function buildShuttleBay(kit, ctx, room) {
  hgSetup(kit);
  const materials = kit.materials;
  const [W, H, D] = room.size;
  const hx = W / 2;
  const hz = D / 2;
  const [OX, OY, OZ] = room.origin;
  const accentKey = "emitBlue";
  const rand = rng(9090);
  const blueBlink = [];
  const redBlink = [];
  const amberBlink = [];
  const PAD = { x: 0, z: -5, r: 12 };

  // ---- flight-control intrusion (room-local box) -> soffit + wall notch + ceiling skip
  const fc = ROOM_BY_ID.flight_control;
  const fcBox = {
    x0: fc.origin[0] - fc.size[0] / 2 - OX - 0.4,
    x1: fc.origin[0] + fc.size[0] / 2 - OX + 0.4,
    z0: fc.origin[2] - fc.size[2] / 2 - OZ - 0.4,
    z1: fc.origin[2] + fc.size[2] / 2 - OZ + 0.4,
    y0: fc.origin[1] - OY - 0.2,
  };
  const soffit = { x0: -hx, x1: Math.min(hx, fcBox.x1 + 0.6), z0: Math.max(-hz, fcBox.z0 - 0.3), z1: Math.min(hz, fcBox.z1 + 0.3), y0: fcBox.y0 - 0.4, y1: fcBox.y0 };
  const hasSoffit = fcBox.x1 > -hx && fcBox.z1 > -hz && fcBox.z0 < hz && fcBox.y0 < H;

  // ---- deck: dark plates, seams, approach lane from the blast door to the pad
  kit.boxMM("impDeck", [-hx, -0.14, -hz], [hx, 0, hz], { color: PALETTE.impGreyDark, texel: 0.35 });
  for (let x = -20; x <= 20; x += 10) kit.boxMM("impTrim", [x - 0.04, 0.0005, -hz + 0.5], [x + 0.04, 0.006, hz - 0.5], { color: PALETTE.impBlack, texel: 1 });
  for (let z = -30; z <= 30; z += 10) kit.boxMM("impTrim", [-hx + 0.5, 0.0005, z - 0.04], [hx - 0.5, 0.006, z + 0.04], { color: PALETTE.impBlack, texel: 1 });
  // landing pad: ring decal, inner dashed ring, centre mark, lamps and sockets around the rim
  deckDecal(kit, HG_DECAL.pad, PAD.x, PAD.z, PAD.r * 2.15, 0, 0.0065);
  deckDecal(kit, hgNumber(7), PAD.x, PAD.z - PAD.r - 2.6, 3.2, 0, 0.007);
  deckDecal(kit, hgNumber(7), PAD.x, PAD.z + PAD.r + 2.6, 3.2, Math.PI, 0.007);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    hgDeckLamp(kit, PAD.x + Math.cos(a) * (PAD.r + 1.0), PAD.z + Math.sin(a) * (PAD.r + 1.0), i % 2 ? "emitWhite" : "emitBlue");
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    hgFloorSocket(kit, PAD.x + Math.cos(a) * 9.0, PAD.z + Math.sin(a) * 9.0);
  }
  // radial approach ticks on the door side, taxi lane from the door with chevron edges
  for (let i = -2; i <= 2; i++) {
    const a = Math.PI + i * 0.22;
    deckLine(kit, [PAD.x + Math.cos(a) * (PAD.r + 1.8), PAD.z + Math.sin(a) * (PAD.r + 1.8)], [PAD.x + Math.cos(a) * (PAD.r + 4.5), PAD.z + Math.sin(a) * (PAD.r + 4.5)], 0.3);
  }
  dashedLine(kit, [-24, 0], [-PAD.r - 4.8, -3.6], { dash: 2.2, gap: 1.6, w: 0.25 });
  kit.boxMM("chevronY", [-24.5, 0.002, -7.8], [-17, 0.011, -7.2], { texel: 0.8 });
  kit.boxMM("chevronY", [-24.5, 0.002, 7.2], [-17, 0.011, 7.8], { texel: 0.8 });
  deckDecal(kit, HG_DECAL.launch, -20.5, -1.2, 4.5, Math.PI / 2 + 0.3, 0.0068);
  kit.boxMM("chevronY", [-24.9, 0.002, -11.5], [-23.6, 0.012, 11.5], { texel: 0.6 });
  deckDecalImp(kit, IMP_DECAL.keepClear, PAD.x, PAD.z + PAD.r * 0.55, 3.0, 0, 0.0072);
  deckDecalImp(kit, IMP_DECAL.keepClear, PAD.x, PAD.z - PAD.r * 0.55, 3.0, Math.PI, 0.0072);

  // ---- refuelling boom (NW of the pad), fuel bowser and hose reels along the N wall
  refuelBoom(kit, -15.5, -23, [-9.2, 8.3, -14.8], amberBlink, accentKey);
  hgFuelBowser(kit, -19.5, -33, Math.PI / 2 - 0.15, { seed: 4 });
  hgHoseReel(kit, -10, -37.2, Math.PI, { hoseOut: true });
  hgPowerBox(kit, -13.5, -37.6, 0);
  hgPowerBox(kit, 14, -18.5, -Math.PI / 2, { on: false });
  hgFloorDrain(kit, -8, -30, 1.4, 1.4);
  hgFloorDrain(kit, 8, 14, 1.4, 1.4);
  hgFloorDrain(kit, PAD.x - 15, PAD.z + 12, 1.2, 1.2);

  // ---- boarding stairs (E of the pad, top toward the pad), tool cart, ground crew console
  boardingStairs(kit, 12.6, -1.5, { accentKey });
  hgToolCart(kit, 16.5, -8.5, 0.9, { seed: 17 });
  hgDiagConsole(kit, 15.5, 9.5, Math.PI / 2, { seed: 51, screens: ["scrBlue0", "scrBlue1"], accentKey, cableTo: [13.4, 6.4] });

  // ---- cargo marshalling along the E wall: pallets in two rows, hazard border, crates
  const pallets = [
    [20.5, -31, 0, 0],
    [20.5, -26.5, 1, 0.1],
    [20.5, -22, 2, -0.05],
    [16.5, -29, 0, 1.5],
    [20.5, 20, 1, 0],
    [20.5, 24.5, 2, 0.08],
    [20.5, 29, 0, -0.1],
    [16.5, 27, 1, 1.4],
  ];
  pallets.forEach(([x, z, kind, yaw], i) => hgPallet(kit, x, z, yaw, { seed: 60 + i, kind }));
  hgHazardBorder(kit, 14.6, -34, 23.6, -19.5, 0.4);
  hgHazardBorder(kit, 14.6, 17.5, 23.6, 32, 0.4);
  deckDecalImp(kit, IMP_DECAL.bay02, 18.5, -36.2, 2.2, 0, 0.0065);
  deckDecalImp(kit, IMP_DECAL.bay03, 18.5, 34.5, 2.2, Math.PI, 0.0065);
  hgCrateStack(kit, 8, -37, 0.15, [["b", 0, 0, 0], ["a", 1.5, 0, 0.1, 0.3], ["c", 0.1, 1.2, 0, 0.7]], { seed: 71 });
  hgCrateStack(kit, 21, 36.5, -0.2, [["a", 0, 0, 0], ["a", 0, 1.0, 0.05, 0.2], ["c", 1.3, 0, 0.2, 1.0]], { seed: 72 });

  // ---- customs / inspection point S of the pad: scanner arch, console, stanchion line, holo post
  {
    const cz = 22;
    for (const ax of [-9, -3]) {
      kit.box("impTrim", ax, 1.7, cz, 0.5, 3.4, 0.5, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", ax, 0.15, cz, 0.8, 0.3, 0.8, { color: PALETTE.impCharcoal });
      kit.box(accentKey, ax + (ax < -6 ? 0.26 : -0.26), 1.8, cz, 0.02, 2.4, 0.12);
      kit.collider([ax - 0.4, 0, cz - 0.4], [ax + 0.4, 3.6, cz + 0.4], "arch");
    }
    kit.box("impTrim", -6, 3.55, cz, 6.5, 0.3, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("emitBlueSoft", -6, 3.38, cz, 5.4, 0.04, 0.3, { uv: "keep" });
    kit.box("impMetal", -6, 3.9, cz, 1.0, 0.4, 0.6, { color: PALETTE.impGreyDark });
    for (let k = 0; k < 3; k++) kit.box([accentKey, "emitGreen", "emitRedImp"][k], -6.3 + k * 0.3, 3.9, cz + 0.31, 0.1, 0.1, 0.01);
    kit.boxMM("chevronY", [-9.3, 0.002, cz - 3.5], [-8.7, 0.011, cz + 3.5], { texel: 0.8 });
    kit.boxMM("chevronY", [-3.3, 0.002, cz - 3.5], [-2.7, 0.011, cz + 3.5], { texel: 0.8 });
    deckDecalImp(kit, IMP_DECAL.arrowRight, -6, cz - 2.2, 1.8, Math.PI, 0.0068);
    deckDecalImp(kit, IMP_DECAL.glyphs3, -6, cz + 2.4, 1.6, Math.PI, 0.0068);
    // inspection console (operator S side, facing the arrivals) and a chair, holo emblem post
    impConsole(kit, -6, 0, cz + 5.5, 2.6, 0.9, { yaw: Math.PI, seed: 55, screens: ["scrBlue0", "scrBlue1", "scrGreen0"], accentKey, tall: true });
    impChair(kit, -6, 0, cz + 6.9, Math.PI);
    kit.cyl("impTrim", -13, 0.6, cz + 2, 0.45, 1.2, "y", { color: PALETTE.impBlack, segments: 14 });
    kit.cyl("holo", -13, 1.75, cz + 2, 0.7, 1.1, "y", { segments: 16, open: true });
    kit.cyl("holoBright", -13, 1.3, cz + 2, 0.5, 0.06, "y", { segments: 16 });
    kit.collider([-13.5, 0, cz + 1.5], [-12.5, 1.3, cz + 2.5], "holo");
    // stanchions + chain line closing the customs zone except through the arch
    const stan = (x, z) => {
      kit.cyl("impMetal", x, 0.5, z, 0.03, 1.0, "y", { color: PALETTE.impGrey, segments: 8 });
      kit.cyl("impTrim", x, 0.03, z, 0.18, 0.06, "y", { color: PALETTE.impBlack, segments: 10 });
      kit.cyl("impTrim", x, 1.02, z, 0.06, 0.06, "y", { color: PALETTE.impBlack, segments: 8 });
    };
    const line = (a, b) => {
      stan(a[0], a[1]);
      stan(b[0], b[1]);
      hose(kit, "impMetal", new THREE.Vector3(a[0], 0.95, a[1]), new THREE.Vector3(b[0], 0.95, b[1]), 0.15, 0.02, 5, { color: PALETTE.impGrey });
      kit.collider([Math.min(a[0], b[0]) - 0.1, 0, Math.min(a[1], b[1]) - 0.1], [Math.max(a[0], b[0]) + 0.1, 1.05, Math.max(a[1], b[1]) + 0.1], "chain");
    };
    line([-16, cz], [-12.5, cz]);
    line([-12.5, cz], [-9.5, cz]);
    line([-2.5, cz], [1, cz]);
    line([1, cz], [4.5, cz]);
    // arrivals side (S of the line, where the room spawn is): queue lane to the arch, waiting benches,
    // an arrivals desk, impounded cargo waiting for inspection
    dashedLine(kit, [-9.5, 36], [-9.5, cz + 4], { dash: 1.4, gap: 1.0, w: 0.16 });
    dashedLine(kit, [-2.5, 36], [-2.5, cz + 4], { dash: 1.4, gap: 1.0, w: 0.16 });
    deckDecalImp(kit, IMP_DECAL.arrowRight, -6, 33.5, 1.6, Math.PI, 0.0068);
    for (const bx of [-17.5, -13.5]) {
      kit.box("impMetal", bx, 0.46, 36.5, 2.4, 0.08, 0.55, { color: PALETTE.impGreyDark });
      kit.box("impMetal", bx, 0.78, 36.78, 2.4, 0.5, 0.06, { color: PALETTE.impGreyDark, rot: [-0.15, 0, 0] });
      for (const lx of [bx - 1.0, bx + 1.0]) kit.box("impTrim", lx, 0.22, 36.5, 0.08, 0.44, 0.5, { color: PALETTE.impBlack });
      kit.collider([bx - 1.25, 0, 36.2], [bx + 1.25, 1.0, 36.85], "bench");
    }
    hgDiagConsole(kit, -20.5, 36.5, 0, { seed: 52, screens: ["scrBlue1", "scrGreen0"], accentKey });
    hgPallet(kit, 1.5, 33.5, 0.2, { seed: 68, kind: 1 });
    hgCrateStack(kit, 5.5, 35, -0.15, [["b", 0, 0, 0], ["c", 1.4, 0, 0.1, 0.5], ["a", 0.1, 1.2, 0.1, 0.3]], { seed: 73 });
    hgPowerBox(kit, -24, 37.6, Math.PI / 2, { on: true });
    for (const z of [26, 32]) {
      hgDeckLamp(kit, -10.5, z, "emitBlue");
      hgDeckLamp(kit, -1.5, z, "emitBlue");
    }
  }

  // ---- soffit boxing in the flight-control booth's volume (only where it intrudes)
  if (hasSoffit) {
    const s = soffit;
    kit.boxMM("impMetalRough", [s.x0, s.y0, s.z0], [s.x1, s.y1, s.z1], { color: PALETTE.impCharcoal, texel: 0.4 });
    kit.boxMM("impMetalRough", [s.x1 - 0.3, s.y0, s.z0], [s.x1, H + 0.02, s.z1], { color: PALETTE.impCharcoal, texel: 0.4 });
    kit.boxMM("impMetalRough", [s.x0, s.y0, s.z0], [s.x1, H + 0.02, s.z0 + 0.3], { color: PALETTE.impCharcoal, texel: 0.4 });
    kit.boxMM("impMetalRough", [s.x0, s.y0, s.z1 - 0.3], [s.x1, H + 0.02, s.z1], { color: PALETTE.impCharcoal, texel: 0.4 });
    // black edge beams under the soffit, blue light channel, vents, stencil
    kit.boxMM("impTrim", [s.x0, s.y0 - 0.45, s.z0 - 0.05], [s.x1 + 0.05, s.y0 + 0.02, s.z0 + 0.45], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impTrim", [s.x0, s.y0 - 0.45, s.z1 - 0.45], [s.x1 + 0.05, s.y0 + 0.02, s.z1 + 0.05], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impTrim", [s.x1 - 0.45, s.y0 - 0.45, s.z0], [s.x1 + 0.05, s.y0 + 0.02, s.z1], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("emitBlueSoft", [s.x0 + 0.3, s.y0 - 0.46, s.z0 + 0.5], [s.x1 - 0.5, s.y0 - 0.42, s.z0 + 0.58], { uv: "keep" });
    kit.boxMM("emitBlueSoft", [s.x0 + 0.3, s.y0 - 0.46, s.z1 - 0.58], [s.x1 - 0.5, s.y0 - 0.42, s.z1 - 0.5], { uv: "keep" });
    kit.boxMM("emitBlueSoft", [s.x1 - 0.58, s.y0 - 0.46, s.z0 + 0.5], [s.x1 - 0.5, s.y0 - 0.42, s.z1 - 0.5], { uv: "keep" });
    for (let x = s.x0 + 4; x < s.x1 - 3; x += 5) {
      kit.box("impTrim", x, s.y0 - 0.12, (s.z0 + s.z1) / 2, 2.4, 0.24, 1.6, { color: PALETTE.impCharcoal, texel: 1 });
      for (let f = 0; f < 6; f++) kit.box("impMetal", x, s.y0 - 0.26, (s.z0 + s.z1) / 2 - 0.65 + f * 0.26, 2.2, 0.03, 0.2, { color: PALETTE.impGreyDark });
    }
    const fe = new THREE.PlaneGeometry(1.8, 1.8).rotateY(Math.PI / 2);
    kit.add("decalImp", fe, { pos: [s.x1 + 0.01, (s.y0 + H) / 2, (s.z0 + s.z1) / 2], uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs3) });
    kit.box("impTrim", s.x1 + 0.2, (s.y0 + H) / 2 - 1.0, (s.z0 + s.z1) / 2 + 4.5, 0.4, 0.4, 0.4, { color: PALETTE.impBlack });
    redBlink.push([s.x1 + 0.41, (s.y0 + H) / 2 - 1.0, (s.z0 + s.z1) / 2 + 4.5, 0.05, 0.25, 0.25]);
    kit.box("impTrim", s.x1 + 0.2, (s.y0 + H) / 2 - 1.0, (s.z0 + s.z1) / 2 - 4.5, 0.4, 0.4, 0.4, { color: PALETTE.impBlack });
    blueBlink.push([s.x1 + 0.41, (s.y0 + H) / 2 - 1.0, (s.z0 + s.z1) / 2 - 4.5, 0.05, 0.25, 0.25]);
  }

  // ---- walls: 18 m industrial; blast door on the W wall (+ the notch for the booth volume)
  const walls = roomWalls(kit, room);
  const wallOpts = { ribPitch: 10, plateH: 6, rowH: 4, floodV: 14.5, floodAim: 15, accentKey, bigDecals: false, ducts: false, lightKey: "emitWhiteSoft" };
  const wOpen = hgWallOpenings(room, ctx.doors, "W");
  const notch = hasSoffit ? [{ u0: hz - soffit.z1, u1: hz - soffit.z0, v0: soffit.y0, v1: H }] : [];
  hgWall(walls.N.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "N"), seed: 301, tag: "sbN" });
  hgWall(walls.S.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "S"), seed: 303, tag: "sbS", quiet: [[8, 24]] });
  hgWall(walls.W.frame, D, H, { ...wallOpts, openings: [...wOpen, ...notch], seed: 307, tag: "sbW" });
  hgWall(walls.E.frame, D, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "E"), seed: 309, tag: "sbE", quiet: [[30, 50]] });
  // blast-door dressing
  for (const o of wOpen) {
    const f = walls.W.frame;
    for (const e of [o.u0 - 1.5, o.u1 + 1.5]) {
      const p = f.pos(e, o.v1 + 1.2, 0.62);
      f.box("impTrim", e, o.v1 + 1.2, 0.32, 0.6, 0.6, 0.6, { color: PALETTE.impBlack, texel: 1 });
      redBlink.push([p.x, p.y, p.z, 0.1, 0.4, 0.4]);
    }
    f.box("chevronY", (o.u0 + o.u1) / 2, o.v1 + 0.3, 0.2, o.u1 - o.u0 + 2.6, 0.45, 0.4, { texel: 0.8 });
    f.decal(IMP_DECAL.hazard, (o.u0 + o.u1) / 2, o.v1 + 1.3, 0.08, 1.2);
  }
  // giant stencils: bay ident on the E wall upper band, glyphs on the S wall
  walls.E.frame.decal(IMP_DECAL.bay03, 40, 11.6, 0.08, 5.0);
  walls.S.frame.decal(IMP_DECAL.glyphs3, 16, 11.4, 0.08, 4.0);
  // tool wall + bench on the N wall (u = lx + 25), manifold along the E wall at 4 m
  hgToolWall(walls.N.frame, 26, 3.6, { seed: 35, accentKey, tag: "bench" }); // lx 1
  hgManifold(kit, [hx - 0.9, -34], [hx - 0.9, 14], 4.0, { r: 0.2, step: 12, accentKey, bracket: 1.0 });

  // ---- ceiling with the booth volume skipped; troughs either side of the pad
  hgCeiling(kit, -hx, -hz, hx, hz, H, {
    beamStep: 10,
    beamAxis: "x",
    troughsX: [-12, 12],
    ductsX: [22.5],
    lightKey: "emitWhiteSoft",
    beamH: 1.2,
    skip: hasSoffit ? { x0: soffit.x0, x1: soffit.x1, z0: soffit.z0, z1: soffit.z1 } : null,
  });

  // ---- lights: blue-white around the pad, cool key over customs, red at the blast door
  const blue = 0xa0c8ff;
  // four pad floods carry the room (≈2.5× the default per-fixture output), one white over the customs point
  for (const [x, z] of [[-13, -17], [13, -17], [-13, 7], [13, 7]]) kit.light({ type: "point", pos: [x, 16, z], color: blue, intensity: lux(16, 2.8), distance: 80, priority: 0.62 });
  kit.light({ type: "point", pos: [-6, 13, 26], color: 0xdfe8ff, intensity: lux(13, 2.2), distance: 56, priority: 0.55 });
  kit.light({ type: "point", pos: [-22, 12, 0], color: 0xff3b2e, intensity: lux(12, 0.4), distance: 24, priority: 0.3 });

  // ---- animated beacons
  hgBeacons(kit, materials, "emitRedImp", redBlink, { period: 1.5, duty: 0.42, min: 0.15, max: 3.6 });
  hgBeacons(kit, materials, "emitBlue", blueBlink, { period: 1.5, duty: 0.42, phase: 0.5, min: 0.2, max: 3.2 });
  hgBeacons(kit, materials, "emitAmber", amberBlink, { period: 2.4, duty: 0.5, phase: 0.2, min: 0.2, max: 3.2 });
  void rand;
}
