// Main Bridge of the ISD Vigilant: the Imperial command bridge. A black-gloss command walkway runs
// from the aft doors to the windows between two sunken crew pits lined with consoles and screens;
// outer platforms carry wall stations, a tactical holo table and a navigation plotting table; the
// forward wall is the bridge module's hull face with the two great trapezoid window banks looking
// forward and down over 1,300 m of hull toward the bow.
//
// Layout (world metres, forward = -Z, floor y = 190):
//   z 548.3..548.8  armoured window frame slab (plugs the hull's open window band, x ±22.4)
//   z 548.8..550.05 sill bench under the glass (consoles, pillar plinth) - it also buries the hull's lip
//   z 550.05..555.3 captain's step at the forward end of the walkway
//   z 552..592.4    walkway (x ±2.2, y 190) between the crew pits (x ±2.2..±9.5, floor y 187.4) with
//                   the outer platforms (x ±9.8..±20.75) either side; stairs at the pits' aft end
//   z 592.4..599.75 aft platform with the three doors in the aft wall (main x 0, side doors x ±14)
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { STD } from "../../../config/layout.js";
import { roomWalls, wallOpenings } from "../../shell.js";
import { wallFrame, ceilingFrame, X_AXIS } from "../../../core/frame.js";
import {
  impWall,
  impCeiling,
  impFloor,
  walkable,
  stairs,
  railing,
  console as impConsole,
  chair,
  table,
  lockers,
  crate,
  column,
  pipeRun,
  wallScreen,
  doorSign,
  pointLightDesc,
  spotLightDesc,
  rng,
} from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { prism } from "../../../kit.js";

const WALK = 2.2; // walkway half-width
const PIT_X0 = 2.2; // pit inner wall (walkway side)
const PIT_X1 = 9.5; // pit outer wall (platform side)
const PIT_Z0 = 552; // pit forward wall
const PIT_Z1 = 592.4; // top of the pit stairs / aft platform edge
const PIT_DEPTH = 2.6;
const STAIR_RUN = 14 * 0.3; // stairs(): 2.6 m at a 0.19 riser -> 14 treads of 0.3
const FRAME_Z = 548.3; // window frame slab, room side at FRAME_Z + FRAME_D
const FRAME_D = 0.5;
const SILL_Z = FRAME_Z + FRAME_D;
const BENCH_D = 1.25; // sill bench depth (the hull's casement lip reaches z 550 at y 190.2)
const BENCH_H = 0.6;
const LOWER = 4.6; // the walls are built in two lifts: 0..4.6 (doors, control bays) and 4.6..9
const CAP_STEP = 0.25; // captain's raised step
const CAP_Z0 = SILL_Z + BENCH_D;
const CAP_Z1 = 555.3;
// lit key colours (red, blue, amber, white) for the unlit vertex-coloured key material: bright enough
// to read as lit, under the bloom threshold
const KEY_LIT = [0xb03a2a, 0x3a78d0, 0xb88024, 0xb8c4d0];

// box from two arbitrary corners
const mm = (kit, mat, a, b, opts = {}) =>
  kit.boxMM(mat, [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], opts);

export function buildBridge(kit, ctx) {
  const { room, floorY: y, mats } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const H = room.h;
  const T = STD.wallT;
  const xi0 = x0 + T;
  const xi1 = x1 - T;
  const zi1 = z1 - T;
  const ceilY = y + H;
  const pitY = y - PIT_DEPTH;
  const wb = room.windowBand;

  // --- materials owned by this room: light bands the alert toggle can recolour, a semi-gloss deck ---
  const band = mats.lightBand.clone();
  band.emissiveIntensity = 1.05;
  mats.bridgeBand = band;
  const bandWarm = mats.lightBandWarm.clone();
  bandWarm.emissiveIntensity = 0.85; // the beam troughs run down the walkway's axis; at 1.0 they tone-map to white
  mats.bridgeBandWarm = bandWarm;
  const bandRest = { color: band.color.clone(), emissive: band.emissive.clone(), wColor: bandWarm.color.clone(), wEmissive: bandWarm.emissive.clone() };
  const alertLights = []; // descriptors tinted red on alert
  if (!mats.bridgeGloss) {
    // the black gloss deck, roughened so the space light does not mirror into a blown-out streak. The
    // gloss deck's roughness map sits around 0.16, so the factor has to be well over 1 to leave a broad
    // highlight (2.6 lands near 0.4, the same as impGlossSoft).
    const gloss = mats.impGloss.clone();
    gloss.roughness = 2.6;
    gloss.envMapIntensity = 0.8;
    mats.bridgeGloss = gloss;
  }
  // lit console keys: unlit vertex colours kept under the bloom threshold, so an indicator reads as a
  // small lit key instead of a blown square (the shared emit* materials run at 2.2-2.4)
  if (!mats.bridgeKeyLit) mats.bridgeKeyLit = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  // window glass under a room-owned key: unlike "glass" it is not in NO_SHADOW_KEYS, so the panes cast
  // shadows and keep the exterior sun (exposed for the hull, it blows out the sill consoles whenever
  // the sky brings it round to the bow) out of the room while staying see-through
  if (!mats.bridgeGlass) mats.bridgeGlass = mats.glass.clone();

  // ---------------------------------------------------------------------------------------------
  // Walls: three impWalls in two lifts each (lower with the door openings, upper with a second band)
  // ---------------------------------------------------------------------------------------------
  const walls = roomWalls(room);
  let wi = 0;
  for (const key of ["south", "west", "east"]) {
    wi++;
    const w = walls[key];
    const openings = wallOpenings(ctx.id, room, key);
    const { frame, length } = wallFrame(kit, w.from, w.to, y);
    impWall(frame, length, LOWER, {
      openings,
      pitch: 4,
      tone: IMP.wallDark,
      toneAlt: IMP.gunmetal,
      bandMat: "bridgeBand",
      bandY: 2.3,
      bandH: 0.14,
      cornice: 0.3,
      // no hatch bays: at 1.4 x 1.3 m in a lighter tone they read as unframed door slabs from across the room
      styles: { plain: 0.44, control: 0.18, vent: 0.1, hatch: 0, pipes: 0.1, screen: 0.14, niche: 0.04 },
      seed: 900 + wi * 11,
      tag: ctx.id + ":" + key,
    });
    const { frame: up } = wallFrame(kit, w.from, w.to, y + LOWER);
    impWall(up, length, H - LOWER, {
      pitch: 6,
      tone: IMP.wallDark,
      toneAlt: IMP.consoleDark,
      bandMat: "bridgeBand",
      bandY: 2.5,
      bandH: 0.12,
      kick: 0.36,
      cornice: 0.34,
      styles: { plain: 0.72, vent: 0.14, pipes: 0.08, hatch: 0.06 },
      seed: 950 + wi * 7,
      collide: false,
    });
    // door lintels: a dark panel closing the bay above each door, a stencil, a sign and a marker light
    for (const op of openings) {
      const u = (op.u0 + op.u1) / 2;
      const dw = op.u1 - op.u0 + 0.5;
      frame.box("impPanel1", u, (op.v1 + 0.4 + LOWER - 0.3) / 2, 0.03, dw, LOWER - 0.3 - op.v1 - 0.4 - 0.04, 0.06, { color: IMP.wallDark, uv: "keep" });
      doorSign(frame, u, op.v1 + 0.3, { decal: 7 });
      frame.quad("impDecal", u, op.v1 + 0.95, 0.062, 0.55, 0.55, { uvRect: impDecalRect(op.door && op.door.kind === "wide" ? 4 : 2) });
      frame.box(op.door && op.door.kind === "wide" ? "emitAmber" : "emitRed", u, LOWER - 0.42, 0.075, Math.min(dw - 0.6, 2.4), 0.05, 0.02);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Deck: aft platform, forward strip, outer platforms, walkway block, captain's step
  // ---------------------------------------------------------------------------------------------
  impFloor(kit, [xi0, PIT_Z1, xi1, zi1], y, { tone: IMP.wallDark });
  impFloor(kit, [xi0, SILL_Z, xi1, PIT_Z0], y, { tone: IMP.wallDark });
  // gloss strips: the walkway continues across the aft platform to the main door; a cross strip
  // along the sill bench; a lane down each outer platform
  mm(kit, "bridgeGloss", [-WALK, y - 0.001, PIT_Z1], [WALK, y + 0.006, zi1 - 0.12], { color: IMP.white, texel: 0.25 });
  mm(kit, "bridgeGloss", [xi0 + 0.12, y - 0.001, CAP_Z0 + 0.35], [xi1 - 0.12, y + 0.006, CAP_Z0 + 1.45], { color: IMP.white, texel: 0.25 });
  for (const s of [-1, 1]) {
    impFloor(kit, s > 0 ? [PIT_X1 + 0.3, PIT_Z0, xi1, PIT_Z1] : [xi0, PIT_Z0, -PIT_X1 - 0.3, PIT_Z1], y, { tone: IMP.wallDark });
    mm(kit, "bridgeGloss", [s * 14.6, y - 0.001, PIT_Z0 + 0.4], [s * 15.8, y + 0.006, PIT_Z1 - 0.4], { color: IMP.white, texel: 0.25 });
    // pit kerb: the outer pit wall block rises to deck level (railing stands on it)
    mm(kit, "impPaintedMetal", [s * PIT_X1, pitY, PIT_Z0], [s * (PIT_X1 + 0.3), y, PIT_Z1], { color: IMP.trim, texel: 0.5 });
    // pit forward wall block
    mm(kit, "impPaintedMetal", [s * PIT_X0, pitY, PIT_Z0], [s * PIT_X1, y, PIT_Z0 + 0.3], { color: IMP.trim, texel: 0.5 });
  }
  walkable(ctx, xi0, PIT_Z1, xi1, zi1, y, "aft");
  walkable(ctx, xi0, SILL_Z, xi1, PIT_Z0, y, "fwd");
  walkable(ctx, PIT_X1, PIT_Z0, xi1, PIT_Z1, y, "platE");
  walkable(ctx, xi0, PIT_Z0, -PIT_X1, PIT_Z1, y, "platW");
  walkable(ctx, -WALK, PIT_Z0, WALK, PIT_Z1, y, "walkway");

  // command walkway: solid block between the pits (its sides are the pits' inner walls) + gloss deck
  mm(kit, "impPaintedMetal", [-WALK, pitY, PIT_Z0], [WALK, y - 0.14, PIT_Z1], { color: IMP.trim, texel: 0.5 });
  mm(kit, "bridgeGloss", [-WALK, y - 0.14, PIT_Z0], [WALK, y, PIT_Z1], { color: IMP.white, texel: 0.25 });
  for (const s of [-1, 1]) {
    mm(kit, "emitBlue", [s * (WALK - 0.1), y + 0.003, PIT_Z0 + 0.2], [s * (WALK - 0.04), y + 0.011, PIT_Z1 - 0.2]);
    railing(kit, [s * (WALK - 0.16), CAP_Z1 + 0.2], [s * (WALK - 0.16), PIT_Z1 - 0.15], y, { h: 0.86, postPitch: 2.6, lit: true });
  }
  for (let z = PIT_Z0 + 4; z < PIT_Z1 - 1; z += 4) mm(kit, "impMetal", [-WALK + 0.25, y + 0.002, z - 0.015], [WALK - 0.25, y + 0.006, z + 0.015], { color: IMP.gunmetal });

  // captain's step at the forward end of the walkway, flush against the sill bench
  mm(kit, "impPaintedMetal", [-WALK, y, CAP_Z0], [WALK, y + CAP_STEP - 0.03, CAP_Z1], { color: IMP.trim, texel: 1 });
  mm(kit, "bridgeGloss", [-WALK, y + CAP_STEP - 0.03, CAP_Z0], [WALK, y + CAP_STEP, CAP_Z1], { color: IMP.white, texel: 0.25 });
  mm(kit, "emitBlue", [-WALK + 0.15, y + CAP_STEP - 0.11, CAP_Z1 - 0.005], [WALK - 0.15, y + CAP_STEP - 0.08, CAP_Z1 + 0.006]);
  for (const s of [-1, 1]) {
    mm(kit, "emitBlue", [s * (WALK - 0.03), y + CAP_STEP - 0.11, CAP_Z0 + 0.1], [s * WALK + s * 0.006, y + CAP_STEP - 0.08, CAP_Z1 - 0.1]);
    // short rail closing the step's sides above the pits
    railing(kit, [s * (WALK - 0.16), PIT_Z0 + 0.1], [s * (WALK - 0.16), CAP_Z1 - 0.1], y + CAP_STEP, { h: 0.86, postPitch: 1.7, lit: true });
  }
  walkable(ctx, -WALK, CAP_Z0, WALK, CAP_Z1, y + CAP_STEP, "captain");

  // ---------------------------------------------------------------------------------------------
  // Crew pits
  // ---------------------------------------------------------------------------------------------
  for (const s of [-1, 1]) buildPit(kit, ctx, s, y, pitY, alertLights);

  // ---------------------------------------------------------------------------------------------
  // Outer platforms
  // ---------------------------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    // railing along the pit edge (on the kerb), lit
    railing(kit, [s * (PIT_X1 + 0.15), PIT_Z0 + 0.15], [s * (PIT_X1 + 0.15), PIT_Z1 - 0.1], y, { h: 1.05, postPitch: 2.6, lit: true });
    railing(kit, [s * (PIT_X0 + 0.15), PIT_Z0 + 0.15], [s * (PIT_X1 + 0.15), PIT_Z0 + 0.15], y, { h: 1.05, postPitch: 2.4, lit: true });
    // wall stations along the outer wall, in two groups
    let k = 0;
    for (const z of [556.5, 559.6, 562.7, 574.5, 577.6, 580.7]) {
      impConsole(kit, ctx, [s * (xi1 - 0.64), y, z], (-s * Math.PI) / 2, { kind: "wall", width: 2.6, seed: 300 + k * 13 + (s > 0 ? 7 : 0), light: false });
      k++;
    }
    // heavy structural columns against the outer wall
    for (const z of [568.6, 587.2]) column(kit, s * (xi1 - 0.28), z, y, ceilY, { w: 0.7, d: 0.7, lit: true, tone: IMP.wallDark });
    // standing officer stations facing the windows over the pit
    bridgeConsole(kit, [s * 13.2, y, 557.8], 0, { width: 1.4, seed: 41 + s });
    bridgeConsole(kit, [s * 13.2, y, 585.2], 0, { width: 1.4, seed: 47 + s });
    bridgeConsole(kit, [s * 17.4, y, 585.2], 0, { width: 1.4, seed: 53 + s });
    // storage: lockers on the outer wall between the aft column and the aft doors, crates in the corners
    {
      const w = s > 0 ? walls.east : walls.west;
      const { frame } = wallFrame(kit, w.from, w.to, y);
      const ua = w.u(s > 0 ? 593.6 : 589.6);
      lockers(frame, ua, ua + 4.0, 2.1, { seed: 5 + s, tone: IMP.wallMid });
    }
    crate(kit, [s * 19.3, y, 596.6], [1.4, 1.1, 1.0], { seed: 11 + s, yaw: s * 0.06 });
    crate(kit, [s * 17.5, y, 596.9], [1.1, 0.8, 0.9], { seed: 13 + s });
    crate(kit, [s * 19.3, y + 1.1, 596.6], [1.0, 0.7, 0.9], { seed: 17 + s, collide: false });
    // platform wall-station glow
    pointLightDesc(ctx, 0x5f8fff, 2.2, 7, [s * (xi1 - 1.6), y + 1.9, 559.6], 0);
    pointLightDesc(ctx, 0x5f8fff, 2.2, 7, [s * (xi1 - 1.6), y + 1.9, 577.6], 0);
  }
  // tactical holo table (port) and navigation plotting table (starboard)
  tacticalTable(kit, ctx, [-15.2, y, 570.5], 1.6);
  navTable(kit, ctx, [15.2, y, 570.5]);

  // ---------------------------------------------------------------------------------------------
  // Aft platform: wall stations flanking the main door, alert station
  // ---------------------------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    impConsole(kit, ctx, [s * 7.2, y, zi1 - 0.62], Math.PI, { kind: "wall", width: 2.4, seed: 61 + s, light: false });
    impConsole(kit, ctx, [s * 11.5, y, zi1 - 0.62], Math.PI, { kind: "wall", width: 2.0, seed: 67 + s, light: false });
  }
  {
    // comms panel between the starboard wall stations (mirrors the alert station on the port side)
    const { frame } = wallFrame(kit, walls.south.from, walls.south.to, y);
    const u = walls.south.u(9.9);
    frame.box("impPaintedMetal", u, 1.5, 0.01, 0.7, 1.3, 0.02, { color: IMP.consoleDark, texel: 1 });
    wallScreen(frame, u, 1.68, 0.48, 0.34, 1, { leds: false });
    frame.box("blinkDense", u, 1.28, 0.026, 0.46, 0.2, 0.01, { uv: "keep" });
    frame.box("leds", u, 1.12, 0.026, 0.4, 0.04, 0.01, { uv: "keep" });
    frame.quad("impDecal", u, 2.02, 0.021, 0.3, 0.3, { uvRect: impDecalRect(3) });
  }
  // door lights: amber over the main door approach, red at the side doors (they also light the door leaves)
  pointLightDesc(ctx, IMP.amber, 2.4, 7, [0, y + 2.4, zi1 - 1.4], 1);
  for (const s of [-1, 1]) pointLightDesc(ctx, IMP.red, 1.6, 5, [s * 14, y + 2.2, zi1 - 1.2], 0);

  // ---------------------------------------------------------------------------------------------
  // Forward wall: window banks, central pillar, sill bench with its consoles
  // ---------------------------------------------------------------------------------------------
  buildWindows(kit, ctx, { xi0, xi1, y, ceilY, wb });
  kit.collider([xi0, y, FRAME_Z], [xi1, y + 0.95, SILL_Z + BENCH_D + 0.05], "sill");

  // captain's command console on the step, facing the windows
  const capConsole = bridgeConsole(kit, [0, y + CAP_STEP, CAP_Z0 + 2.3], 0, { width: 1.5, screens: 2, seed: 77, keyPitch: 0.13 });
  pointLightDesc(ctx, 0xcfe0ff, 1.6, 4.5, [0, y + CAP_STEP + 1.5, CAP_Z0 + 2.5], 1);

  // ---------------------------------------------------------------------------------------------
  // Ceiling: dark panels, central structural beam, cross frames, light troughs, conduit
  // ---------------------------------------------------------------------------------------------
  buildCeiling(kit, ctx, { xi0, xi1, zi1, ceilY });

  // ---------------------------------------------------------------------------------------------
  // Lights (descriptors)
  // ---------------------------------------------------------------------------------------------
  // cool "space light": the glow of space through the windows, cast down the room from just inside
  // the glass head (the panes block shadow-casting light, so it cannot sit outside). Its upper edge
  // runs level under the ceiling and its lower edge lands just aft of the captain's step, so neither
  // the ceiling above it nor the sill consoles get a hot spot.
  spotLightDesc(ctx, 0xc4d6ff, 70, 60, [2.5, ceilY - 0.9, SILL_Z + 0.6], [0, y + 0.6, 565], { angle: 0.45, penumbra: 0.55, shadow: true, priority: 2 });
  for (const z of [562, 578, 594]) {
    const d = pointLightDesc(ctx, 0xffe0c0, 4.2, 12, [0, ceilY - 1.0, z], 1);
    d.baseColor = d.color.clone();
    alertLights.push(d);
  }

  // ---------------------------------------------------------------------------------------------
  // Interactables
  // ---------------------------------------------------------------------------------------------
  // captain's console: a command key plate on the sloped slab
  {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0c1016, emissive: IMP.blue, emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.1 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.16), mat);
    // the plate sits on the slab over the middle of the indicator row, between the screens and the keys
    plate.position.copy(capConsole.slab(0, 0.06, 0.03));
    plate.quaternion.copy(capConsole.slabQuat);
    ctx.add(plate);
    // insignia stencil on the plate (merged into the room's decal mesh)
    const ip = capConsole.slab(0, 0.06, 0.056);
    kit.add("impDecal", new THREE.PlaneGeometry(0.17, 0.17), { pos: [ip.x, ip.y, ip.z], quat: capConsole.planeQuat, uv: "keep", uvRect: impDecalRect(4) });
    ctx.interactables.push({
      object: plate,
      material: mat,
      id: "bridge:captain",
      key: "E",
      label: "Command console — status report",
      onActivate: (api) => {
        api.hud.setStatus("Bridge: all stations report ready.");
        return true;
      },
    });
  }
  // alert toggle at the aft wall (west of the main door)
  {
    const { frame } = wallFrame(kit, walls.south.from, walls.south.to, y);
    const u = walls.south.u(-9.9);
    frame.box("impPaintedMetal", u, 1.45, 0.08, 0.5, 0.72, 0.16, { color: IMP.consoleDark, texel: 1 });
    frame.quad("impDecal", u, 1.45, 0.165, 0.42, 0.62, { uvRect: impDecalRect(1) });
    frame.box("impPaintedMetal", u, 1.45, 0.17, 0.3, 0.5, 0.01, { color: IMP.trim });
    frame.quad("impDecal", u, 1.78, 0.18, 0.22, 0.22, { uvRect: impDecalRect(13) });
    frame.box("leds", u, 1.16, 0.18, 0.22, 0.04, 0.01, { uv: "keep" });
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a0a08, emissive: IMP.red, emissiveIntensity: 0.8, roughness: 0.35 });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.07, 18), mat);
    btn.rotation.x = Math.PI / 2;
    const p = frame.pos(u, 1.45, 0.205);
    btn.position.copy(p);
    ctx.add(btn);
    const state = { on: false };
    const setAlert = (on) => {
      state.on = on;
      if (on) {
        band.color.set(0x140606);
        band.emissive.copy(IMP.red);
        bandWarm.color.set(0x140606);
        bandWarm.emissive.copy(IMP.red);
        for (const d of alertLights) d.color.copy(IMP.red);
        mat.emissiveIntensity = 2.2;
      } else {
        band.color.copy(bandRest.color);
        band.emissive.copy(bandRest.emissive);
        bandWarm.color.copy(bandRest.wColor);
        bandWarm.emissive.copy(bandRest.wEmissive);
        for (const d of alertLights) d.color.copy(d.baseColor);
        mat.emissiveIntensity = 0.8;
      }
    };
    ctx.interactables.push({
      object: btn,
      material: mat,
      id: "bridge:alert",
      key: "E",
      label: () => (state.on ? "Alert — stand down" : "Alert — condition red"),
      onActivate: (api, item) => {
        setAlert(!state.on);
        item.baseEmissiveIntensity = mat.emissiveIntensity;
        api.hud.setStatus(state.on ? "Alert status: red" : "Alert status: normal");
        return true;
      },
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------------------------
  ctx.view("bridge", 0, y + STD.eye, 597.4, 0, -4);
  ctx.view("bridge_captain", 0, y + CAP_STEP + STD.eye, 553.6, 180, -3);
  ctx.view("bridge_pit", 6.2, pitY + STD.eye, 585.5, 12, -2);
  // the pit view stands on the pit floor, 2.6 m under the room's nominal floor: detach it from the
  // room so the harness derives the feet from the eye height instead of the room floor
  ctx.views.bridge_pit.room = "bridge:pit";
  ctx.view("bridge_window", -7.6, y + STD.eye, 550.5, -4, -18);
  ctx.view("bridge_holo", -15.2, y + STD.eye, 574.9, 0, -7);
}

// -----------------------------------------------------------------------------------------------
// Tactical holo table (port platform). The kit's holoTable throws a 2 m projection column that ends in
// a flat cut; this one keeps the same pedestal but caps the projection at 1.5 m over the top in a
// narrowing cone and fills it: the ship over a range grid, a target planet with its orbit ring and a
// stack of readout tags, escort blips on two orbits and a hostile pair on the perimeter (one instanced
// mesh, animated) each on an altitude stalk down to the grid.
// -----------------------------------------------------------------------------------------------
function tacticalTable(kit, ctx, pos, r) {
  const [x, y, z] = pos;
  const h = 0.9;
  const mats = ctx.mats;
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(r, r + 0.1, h, 32), { pos: [x, y + h / 2, z], color: IMP.consoleDark, uv: "scale", uvScale: [4, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.08, 32), { pos: [x, y + h, z], color: IMP.steel, uv: "scale", uvScale: [4, 0.2] });
  kit.add("impMatte", new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.02, 32), { pos: [x, y + h + 0.03, z], color: IMP.black, uv: "keep" });
  kit.add("emitBlue", new THREE.TorusGeometry(r - 0.08, 0.02, 8, 48), { pos: [x, y + h + 0.04, z], rot: [Math.PI / 2, 0, 0] });
  kit.add("blink", new THREE.CylinderGeometry(r + 0.001, r + 0.001, 0.14, 32, 1, true), { pos: [x, y + h - 0.2, z], uv: "scale", uvScale: [6, 1] });
  kit.collider([x - r, y, z - r], [x + r, y + h, z + r], "holoTable");
  // projection cone: wide at the rim, narrowing to a 0.45 m crown 1.5 m up
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, r - 0.15, 1.5, 32, 1, true), mats.beam);
  cone.position.set(x, y + h + 0.75, z);
  ctx.add(cone);
  const holo = new THREE.Group();
  holo.position.set(x, y + h + 0.6, z);
  // range grid + two range rings (one line batch)
  const pts = [];
  const half = r - 0.35;
  for (let i = -4; i <= 4; i++) {
    const s = (i / 4) * half;
    pts.push(-half, 0, s, half, 0, s, s, 0, -half, s, 0, half);
  }
  for (const rr of [half * 0.55, half * 1.05]) {
    for (let i = 0; i < 64; i++) {
      const a0 = (i / 64) * Math.PI * 2;
      const a1 = ((i + 1) / 64) * Math.PI * 2;
      pts.push(Math.cos(a0) * rr, 0.004, Math.sin(a0) * rr, Math.cos(a1) * rr, 0.004, Math.sin(a1) * rr);
    }
  }
  const gridGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const gridMat = new THREE.LineBasicMaterial({ color: IMP.holo, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  holo.add(new THREE.LineSegments(gridGeo, gridMat));
  // the ship: wedge hull with a tower block, filled + wireframe
  const ship = new THREE.Group();
  const shape = new THREE.Shape([new THREE.Vector2(0, 0.9), new THREE.Vector2(0.5, -0.65), new THREE.Vector2(-0.5, -0.65)]);
  const wedge = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
  wedge.rotateX(Math.PI / 2);
  ship.add(new THREE.Mesh(wedge, mats.holo), new THREE.Mesh(wedge.clone(), mats.holoWire));
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.12), mats.holoWire);
  tower.position.set(0, 0.13, 0.4);
  ship.add(tower);
  ship.position.y = 0.42;
  holo.add(ship);
  // target planet with its orbit ring, off the bow
  const planetPos = new THREE.Vector3(-0.8, 0.55, -0.55);
  const sphere = new THREE.SphereGeometry(0.3, 16, 10);
  const ring = new THREE.TorusGeometry(0.48, 0.006, 6, 56);
  ring.rotateX(Math.PI / 2 - 0.3);
  const planet = new THREE.Mesh(mergeGeometries([sphere, ring], false), mats.holoWire);
  planet.position.copy(planetPos);
  holo.add(planet);
  // data tags: a stack of readout bars beside the planet and one over the ship (read from eye level,
  // where the grid plane is edge-on)
  const tags = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.PlaneGeometry(0.34 - i * 0.05, 0.035);
    g.translate(planetPos.x + 0.62, planetPos.y + 0.34 - i * 0.07, planetPos.z + 0.1);
    tags.push(g);
  }
  for (let i = 0; i < 2; i++) {
    const g = new THREE.PlaneGeometry(0.28, 0.03);
    g.translate(0.45, 0.82 - i * 0.06, 0.15);
    tags.push(g);
  }
  holo.add(new THREE.Mesh(mergeGeometries(tags, false), mats.holo));
  // blips: six escorts on two orbits round the planet, two hostiles running the outer ring
  const N_ESC = 6;
  const N_HOS = 2;
  const blipShape = new THREE.Shape([new THREE.Vector2(0, 0.13), new THREE.Vector2(0.07, -0.08), new THREE.Vector2(-0.07, -0.08)]);
  const blip = new THREE.ExtrudeGeometry(blipShape, { depth: 0.02, bevelEnabled: false });
  blip.rotateX(Math.PI / 2);
  const blipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const blips = new THREE.InstancedMesh(blip, blipMat, N_ESC + N_HOS);
  blips.frustumCulled = false;
  const col = new THREE.Color();
  for (let i = 0; i < N_ESC + N_HOS; i++) blips.setColorAt(i, col.set(i < N_ESC ? 0xa8d4ff : 0xff7a60));
  blips.instanceColor.needsUpdate = true;
  holo.add(blips);
  // altitude stalks from the grid plane up to every blip (positions rewritten each frame)
  const stalkPos = new Float32Array((N_ESC + N_HOS) * 6);
  const stalkGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(stalkPos, 3));
  const stalks = new THREE.LineSegments(stalkGeo, gridMat);
  stalks.frustumCulled = false;
  holo.add(stalks);
  ctx.add(holo);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const dir = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  const stalk = (i) => {
    const o = i * 6;
    stalkPos[o] = stalkPos[o + 3] = p.x;
    stalkPos[o + 2] = stalkPos[o + 5] = p.z;
    stalkPos[o + 1] = 0;
    stalkPos[o + 4] = p.y - 0.03;
  };
  ctx.animate((dt, t) => {
    ship.rotation.y += dt * 0.2;
    ship.position.y = 0.42 + Math.sin(t * 0.8) * 0.03;
    planet.rotation.y += dt * 0.35;
    for (let i = 0; i < N_ESC; i++) {
      const k = i % 2;
      const rr = 0.5 + k * 0.18;
      const w = k ? -0.35 : 0.5;
      const a = t * w + Math.floor(i / 2) * ((Math.PI * 2) / 3);
      p.set(planetPos.x + Math.cos(a) * rr, planetPos.y + Math.sin(a * 2) * 0.04, planetPos.z + Math.sin(a) * rr);
      dir.set(-Math.sin(a) * w, 0, Math.cos(a) * w).normalize();
      q.setFromUnitVectors(Z, dir);
      blips.setMatrixAt(i, m.compose(p, q, one));
      stalk(i);
    }
    for (let j = 0; j < N_HOS; j++) {
      const a = -t * 0.18 + j * 0.12;
      p.set(Math.cos(a) * half * 1.05, 0.2, Math.sin(a) * half * 1.05);
      dir.set(Math.sin(a), 0, -Math.cos(a)).normalize();
      q.setFromUnitVectors(Z, dir);
      blips.setMatrixAt(N_ESC + j, m.compose(p, q, one));
      stalk(N_ESC + j);
    }
    stalkGeo.attributes.position.needsUpdate = true;
    blips.instanceMatrix.needsUpdate = true;
    gridMat.opacity = 0.28 + 0.04 * Math.sin(t * 3.1);
  });
  pointLightDesc(ctx, IMP.holo, 2.6, 6, [x, y + h + 1.4, z], 2);
}

// -----------------------------------------------------------------------------------------------
// Crew pit: floor with a central grated cable trench, console rows along both walls (kit consoles
// against the outer wall, continuous desks under the walkway), screens and indicator grids on the
// walls, a screen bank on the forward wall, stairs up to the aft platform.
// -----------------------------------------------------------------------------------------------
function buildPit(kit, ctx, s, y, pitY, alertLights) {
  const xa = s * PIT_X0; // inner wall x
  const xb = s * PIT_X1; // outer wall x
  const gx = (s * (PIT_X0 + PIT_X1)) / 2;
  const zA = PIT_Z0 + 0.3;
  const zB = PIT_Z1 - STAIR_RUN; // stairs start here
  const dark = { color: IMP.darkMetal, texel: 0.5 };
  const rand = rng(s > 0 ? 501 : 733);

  // floor slabs (0.3 thick so their sides form the trench walls) + trench + grate
  const gw = 0.6;
  const tz0 = PIT_Z0 + 1.2;
  const tz1 = zB - 0.9;
  mm(kit, "impDeck", [xa, pitY - 0.3, PIT_Z0], [gx - gw, pitY, PIT_Z1], dark);
  mm(kit, "impDeck", [gx + gw, pitY - 0.3, PIT_Z0], [xb, pitY, PIT_Z1], dark);
  mm(kit, "impDeck", [gx - gw, pitY - 0.3, PIT_Z0], [gx + gw, pitY, tz0], dark);
  mm(kit, "impDeck", [gx - gw, pitY - 0.3, tz1], [gx + gw, pitY, PIT_Z1], dark);
  mm(kit, "impPaintedMetal", [gx - gw, pitY - 0.34, tz0], [gx + gw, pitY - 0.29, tz1], { color: IMP.trim, texel: 1 });
  for (const e of [-1, 1]) {
    mm(kit, "emitBlue", [gx + e * (gw - 0.14), pitY - 0.29, tz0 + 0.3], [gx + e * (gw - 0.08), pitY - 0.275, tz1 - 0.3]);
    mm(kit, "impMetal", [gx + e * gw - 0.035, pitY, tz0 - 0.04], [gx + e * gw + 0.035, pitY + 0.012, tz1 + 0.04], { color: IMP.steel });
  }
  pipeRun(kit, [[gx - 0.28, pitY - 0.2, tz0 + 0.3], [gx - 0.28, pitY - 0.2, tz1 - 0.3]], 0.05, { color: IMP.darkMetal, clamps: true, clampPitch: 4 });
  pipeRun(kit, [[gx + 0.18, pitY - 0.22, tz0 + 0.3], [gx + 0.18, pitY - 0.22, tz1 - 0.3]], 0.035, { color: IMP.gunmetal, clamps: false });
  {
    const g = new THREE.PlaneGeometry(gw * 2, tz1 - tz0);
    g.rotateX(-Math.PI / 2);
    kit.add("impGrate", g, { pos: [gx, pitY - 0.004, (tz0 + tz1) / 2], uv: "scale", uvScale: [(gw * 2) / 1.24, (tz1 - tz0) / 0.9], color: 0xffffff });
  }
  walkable(ctx, xa, PIT_Z0, xb, zB, pitY, "pit");

  // stairs up to the aft platform (full pit width; the side walls take the place of rails)
  stairs(kit, ctx, [gx, zB], [0, 1], PIT_X1 - PIT_X0 + 0.1, pitY, y, { rails: false, tone: IMP.wallDark });
  {
    // sloped handrails on both pit walls + a nosing light at the bottom step
    const rise = y - pitY;
    const len = Math.hypot(STAIR_RUN, rise);
    const ang = -Math.atan2(rise, STAIR_RUN);
    for (const x of [xa + s * 0.1, xb - s * 0.1]) {
      kit.add("impMetal", new THREE.BoxGeometry(0.05, 0.05, len), { pos: [x, (y + pitY) / 2 + 0.95, zB + STAIR_RUN / 2], rot: [ang, 0, 0], color: IMP.steel, texel: 1 });
      for (let i = 0; i < 3; i++) {
        const t = 0.15 + i * 0.35;
        kit.box("impPaintedMetal", x, pitY + 0.95 + rise * t - 0.12, zB + STAIR_RUN * t, 0.06, 0.24, 0.06, { color: IMP.trim });
      }
    }
    mm(kit, "emitWhite", [xa + s * 0.4, pitY + 0.01, zB - 0.06], [xb - s * 0.4, pitY + 0.02, zB - 0.02]);
  }

  // outer wall: kit consoles + chairs, screens above
  const outer = pitFrame(kit, xb, -s, zA, zB, pitY);
  pitWallDress(outer.frame, outer.length, { seed: rand() * 1000, screens: true, band: true, kick: true });
  const n = 12;
  const pitch = (zB - zA) / n;
  for (let i = 0; i < n; i++) {
    const cz = zA + (i + 0.5) * pitch;
    bridgeConsole(kit, [s * 8.5, pitY, cz], (-s * Math.PI) / 2, { width: pitch - 0.5, screens: 3, seed: 100 + i * 7 + (s > 0 ? 50 : 0) });
    if (i % 4 !== 2) chair(kit, [s * 7.82, pitY, cz + (i % 2 ? 0.18 : -0.12)], (-s * Math.PI) / 2 + (rand() - 0.5) * 0.5, { collide: i % 2 === 0 });
  }
  // inner wall (under the walkway): continuous low desks with wall screens, chairs facing the wall
  const inner = pitFrame(kit, xa, s, zA, zB, pitY);
  pitWallDress(inner.frame, inner.length, { seed: rand() * 1000, screens: false, band: true, kick: false });
  for (let i = 0; i < n; i++) {
    const cz = zA + (i + 0.5) * pitch;
    deskSegment(inner.frame, inner.u(cz), pitch - 0.16, 200 + i * 5 + (s > 0 ? 30 : 0));
    if (i % 3 !== 1) chair(kit, [s * 3.42, pitY, cz + (i % 2 ? -0.15 : 0.1)], (s * Math.PI) / 2 + (rand() - 0.5) * 0.5, { collide: i % 2 === 1 });
  }
  kit.collider([Math.min(xa, xa + s * 0.7), pitY, zA], [Math.max(xa, xa + s * 0.7), pitY + 1.0, zB], "desk");

  // forward wall: a screen bank
  {
    const { frame, length } = wallFrame(kit, [Math.min(xa, xb), PIT_Z0 + 0.3], [Math.max(xa, xb), PIT_Z0 + 0.3], pitY);
    frame.box("impPanel1", length / 2, 1.3, 0.03, length - 0.3, 2.4, 0.06, { color: IMP.wallDark, uv: "keep" });
    for (const u of [0.1, length - 0.1]) frame.box("impPaintedMetal", u, 1.3, 0.06, 0.2, 2.6, 0.12, { color: IMP.trim, texel: 1 });
    wallScreen(frame, length / 2 - 2.0, 1.55, 1.7, 0.95, 0);
    wallScreen(frame, length / 2 + 0.05, 1.55, 1.7, 0.95, 2);
    wallScreen(frame, length / 2 + 2.05, 1.55, 1.5, 0.95, 1);
    frame.box("impPaintedMetal", length / 2, 0.55, 0.05, length - 0.8, 0.5, 0.04, { color: IMP.consoleDark, texel: 1 });
    frame.box("blinkDense", length / 2 - 1.6, 0.55, 0.075, 2.6, 0.34, 0.01, { uv: "keep" });
    frame.box("blink", length / 2 + 1.6, 0.55, 0.075, 2.6, 0.34, 0.01, { uv: "keep" });
    frame.quad("impDecal", 0.7, 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", length - 0.7, 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(6) });
    frame.box("impPaintedMetal", length / 2, 2.5, -0.03, length - 0.6, 0.14, 0.06, { color: IMP.trim, texel: 1 });
    frame.box("bridgeBand", length / 2, 2.5, -0.005, length - 0.8, 0.08, 0.01, { uv: "keep" });
  }

  // sensor station interactable (starboard pit, outer row): a scope hood on the console's riser
  if (s > 0) {
    const cz = zA + 5.5 * pitch;
    const mat = new THREE.MeshStandardMaterial({ color: 0x11151b, emissive: IMP.blue, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1 });
    const riserTop = pitY + 0.78 + 0.67; // bridgeConsole riser top
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.62), mat);
    hood.position.set(s * 9.2, riserTop + 0.06 + 0.15, cz);
    ctx.add(hood);
    kit.box("impPaintedMetal", s * 9.19, riserTop + 0.03, cz, 0.46, 0.06, 0.68, { color: IMP.trim, texel: 1 });
    kit.box("emitBlue", s * 8.99, riserTop + 0.06 + 0.15, cz, 0.02, 0.16, 0.42);
    ctx.interactables.push({
      object: hood,
      material: mat,
      id: "bridge:sensors",
      key: "E",
      label: "Sensor station — sweep",
      onActivate: (api) => {
        api.hud.setStatus("Sensors: no contacts within 40,000 km.");
        return true;
      },
    });
  }

  // lights: blue console glow (fills), amber accent at the forward screen bank
  for (const z of [561, 579]) pointLightDesc(ctx, 0x5f90ff, 3.4, 9, [gx, pitY + 1.7, z], 1);
  const amb = pointLightDesc(ctx, IMP.amber, 1.6, 6, [gx, pitY + 1.6, PIT_Z0 + 1.6], 0);
  amb.baseColor = amb.color.clone();
  alertLights.push(amb);
}

// wall frame on a pit wall at x, facing ±x, covering z za..zb. Returns { frame, length, u(z) }.
function pitFrame(kit, x, facing, za, zb, base) {
  const { frame, length } = facing > 0 ? wallFrame(kit, [x, zb], [x, za], base) : wallFrame(kit, [x, za], [x, zb], base);
  return { frame, length, u: (z) => (facing > 0 ? zb - z : z - za) };
}

// Pit wall dressing (2.6 m high): black ribs every 3 m, dark panels, overhead screens + indicator
// blocks, stencils, a recessed light band under the deck lip, cable tray along the top.
function pitWallDress(frame, length, opts) {
  const { seed = 1, screens = true, band = true, kick = true } = opts;
  const rand = rng(Math.floor(seed) + 1);
  const h = PIT_DEPTH;
  const n = Math.round(length / 3);
  const pw = length / n;
  for (let i = 0; i <= n; i++) {
    const u = Math.min(Math.max(i * pw, 0.1), length - 0.1);
    frame.box("impPaintedMetal", u, h / 2, 0.06, 0.2, h, 0.12, { color: IMP.trim, texel: 1 });
    frame.box("impMetal", u, h / 2, 0.124, 0.03, h - 0.3, 0.006, { color: IMP.gunmetal });
  }
  for (let i = 0; i < n; i++) {
    const cu = (i + 0.5) * pw;
    const w = pw - 0.24;
    frame.box(rand() < 0.5 ? "impPanel" : "impPanel1", cu, 2.0, 0.03, w, 0.86, 0.06, { color: IMP.wallDark, uv: "keep" });
    frame.box("impPanel1", cu, 0.78, 0.03, w, 1.52, 0.06, { color: IMP.darkMetal, uv: "keep" });
    if (screens) {
      wallScreen(frame, cu - w * 0.17, 2.02, w * 0.5, 0.54, Math.floor(rand() * 3), { leds: false });
      frame.box("impPaintedMetal", cu + w * 0.3, 2.02, 0.05, w * 0.3, 0.62, 0.04, { color: IMP.consoleDark, texel: 1 });
      frame.box(rand() < 0.5 ? "blinkDense" : "blink", cu + w * 0.3, 2.09, 0.075, w * 0.26, 0.36, 0.01, { uv: "keep" });
      frame.box("leds", cu + w * 0.3, 1.8, 0.075, w * 0.22, 0.05, 0.01, { uv: "keep" });
    } else if (rand() < 0.5) {
      frame.box("impPaintedMetal", cu, 2.15, 0.045, w * 0.7, 0.28, 0.03, { color: IMP.consoleDark, texel: 1 });
      frame.box("blinkSparse", cu, 2.15, 0.065, w * 0.64, 0.2, 0.01, { uv: "keep" });
    }
    if (rand() < 0.45) frame.quad("impDecal", cu - w * 0.36, 1.62, 0.062, 0.3, 0.3, { uvRect: impDecalRect([0, 3, 6, 9, 15][Math.floor(rand() * 5)]) });
    if (band) {
      frame.box("impPaintedMetal", cu, h - 0.09, -0.03, w, 0.14, 0.06, { color: IMP.trim, texel: 1 });
      frame.box("bridgeBand", cu, h - 0.09, -0.005, w - 0.1, 0.08, 0.01, { uv: "keep" });
    }
  }
  if (kick) {
    // cable trunking along the foot of the wall
    frame.box("impPaintedMetal", length / 2, 0.11, 0.1, length, 0.22, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("emitBlue", length / 2, 0.225, 0.1, length - 0.4, 0.012, 0.16);
  }
}

// Tilted control slab in a wall frame: centre (cu, cv, cn), width w along U, depth d along N, tilted
// by `a` so the operator's edge (+N) is lower. items: { mat, du, dd, w, h, uvRect } on its surface.
function slopedSlab(frame, cu, cv, cn, w, d, a, items, tone = IMP.consoleDark) {
  frame.box("impMatte", cu, cv, cn, w, 0.06, d, { color: tone, uv: "keep", tilt: a });
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const rot = new THREE.Quaternion().setFromAxisAngle(X_AXIS, a - Math.PI / 2);
  for (const it of items) {
    const lift = 0.031 + (it.lift || 0);
    const dd = it.dd || 0;
    const u = cu + (it.du || 0);
    const v = cv + lift * ca - dd * sa;
    const n = cn + lift * sa + dd * ca;
    frame.add(it.mat, new THREE.PlaneGeometry(it.w, it.h), u, v, n, { quat: frame.quat(rot), uv: "keep", uvRect: it.uvRect || null });
  }
  return { ca, sa };
}

// Bridge duty console: pedestal, body, a slab tilted TOWARD the operator (screens along the far edge,
// indicator grid and a key row nearest the operator), rear riser with a vertical screen. pos = floor
// point at the operator's side centre, yaw 0 faces -Z (operator looks over the console toward -Z).
// Returns helpers to place extra parts on the slab surface: slab(x, dd, lift) -> world point, slabQuat.
function bridgeConsole(kit, pos, yaw, opts = {}) {
  const { width = 1.4, depth = 0.85, h = 0.78, screens = 2, seed = 3, riser = true, color = IMP.console, keys = true, keyPitch = 0.18 } = opts;
  const rand = rng(seed);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const o = new THREE.Vector3(pos[0], pos[1], pos[2]);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.06, -depth / 2, width - 0.2, 0.12, depth - 0.2, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h / 2, -depth / 2, width, h, depth, { color, texel: 1 });
  box("impPaintedMetal", 0, h * 0.4, 0.005, width - 0.16, h * 0.5, 0.01, { color: IMP.consoleDark, texel: 1 });
  box("emitBlue", 0, 0.16, 0.005, width - 0.3, 0.02, 0.01);
  // slab: centre above the body, tilted by a about local X so the operator's edge (+z) is lower
  const a = 0.4;
  const slabLen = 0.62;
  const c = new THREE.Vector3(0, h + 0.1, -depth / 2 + 0.02);
  const dir = new THREE.Vector3(0, -Math.sin(a), Math.cos(a)); // along the slab toward the operator
  const up = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  const slabQuat = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, a));
  const planeQuat = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, a - Math.PI / 2));
  const slab = (x, dd, lift = 0) => {
    const p = c.clone().addScaledVector(dir, dd).addScaledVector(up, 0.03 + lift);
    p.x += x;
    return L(p.x, p.y, p.z);
  };
  {
    const p = L(c.x, c.y, c.z);
    kit.add("impPaintedMetal", new THREE.BoxGeometry(width, 0.06, slabLen), { pos: [p.x, p.y, p.z], quat: slabQuat, color: IMP.consoleDark, texel: 1 });
  }
  const n = Math.max(1, Math.min(screens, Math.floor(width / 0.55)));
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + (width / n) * (i + 0.5);
    const sw = width / n - 0.16;
    const p = slab(x, -0.14, 0.006);
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.04, 0.012, 0.27), { pos: [p.x, p.y, p.z], quat: slabQuat });
    const p2 = slab(x, -0.14, 0.013);
    kit.add("screen" + Math.floor(rand() * 3), new THREE.PlaneGeometry(sw, 0.23), { pos: [p2.x, p2.y, p2.z], quat: planeQuat, uv: "keep" });
  }
  {
    const g = slab(0, 0.06, 0.002);
    kit.add(rand() < 0.5 ? "blink" : "blinkDense", new THREE.PlaneGeometry(width - 0.24, 0.1), { pos: [g.x, g.y, g.z], quat: planeQuat, uv: "keep" });
  }
  if (keys) {
    const nb = Math.floor((width - 0.36) / keyPitch);
    const kw = Math.min(keyPitch * 0.62, 0.06);
    for (let b = 0; b < nb; b++) {
      const p = slab(-((nb - 1) * keyPitch) / 2 + b * keyPitch, 0.19, 0.012);
      const em = rand() < 0.28;
      kit.add(em ? "bridgeKeyLit" : "impRubber", new THREE.BoxGeometry(kw, 0.025, 0.05), { pos: [p.x, p.y, p.z], quat: slabQuat, color: em ? KEY_LIT[Math.floor(rand() * 4)] : IMP.rubber });
    }
  }
  if (riser) {
    box("impPaintedMetal", 0, h + 0.36, -depth + 0.06, width - 0.2, 0.62, 0.1, { color: IMP.consoleDark, texel: 1 });
    box("darkGloss", 0, h + 0.38, -depth + 0.116, width - 0.4, 0.42, 0.01);
    box("screen" + Math.floor(rand() * 3), 0, h + 0.38, -depth + 0.123, width - 0.5, 0.34, 0.004, { uv: "keep" });
    box("blinkSparse", 0, h + 0.615, -depth + 0.116, width - 0.4, 0.05, 0.01, { uv: "keep" });
  }
  const c0 = L(-width / 2, 0, 0.05);
  const c1 = L(width / 2, 0, -depth - 0.05);
  kit.collider([Math.min(c0.x, c1.x), pos[1], Math.min(c0.z, c1.z)], [Math.max(c0.x, c1.x), pos[1] + h + 0.7, Math.max(c0.z, c1.z)], "console");
  return { slab, slabQuat, planeQuat };
}

// Row of 5 cm physical keys along a sloped slab (tilt a, centre cv/cn) at slab depth offset dd; lit
// keys in the dim vertex-coloured key material.
function keyRow(frame, rand, cu, cv, cn, a, dd, w, pitchU) {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const nb = Math.floor(w / pitchU);
  const v = cv + 0.05 * ca - dd * sa;
  const n = cn + 0.05 * sa + dd * ca;
  for (let b = 0; b < nb; b++) {
    const em = rand() < 0.3;
    frame.box(em ? "bridgeKeyLit" : "impRubber", cu - w / 2 + pitchU / 2 + b * pitchU, v, n, 0.05, 0.03, 0.05, { color: em ? KEY_LIT[Math.floor(rand() * 4)] : IMP.rubber, tilt: a });
  }
}

// Continuous low desk console under the walkway: body, sloped top with screen + indicator grids,
// key row, kick glow, and a riser screen on the wall above.
function deskSegment(frame, cu, w, seed) {
  const rand = rng(seed);
  frame.box("impPaintedMetal", cu, 0.36, 0.3, w, 0.72, 0.6, { color: IMP.console, texel: 1 });
  frame.box("impPaintedMetal", cu, 0.3, 0.605, w - 0.2, 0.36, 0.01, { color: IMP.consoleDark, texel: 1 });
  frame.box("emitBlue", cu, 0.12, 0.605, w - 0.3, 0.02, 0.01);
  const a = 0.36;
  slopedSlab(frame, cu, 0.78, 0.38, w, 0.52, a, [
    { mat: "screen" + Math.floor(rand() * 3), du: -w * 0.23, dd: -0.06, w: w * 0.38, h: 0.24 },
    { mat: rand() < 0.5 ? "blink" : "blinkDense", du: w * 0.2, dd: -0.06, w: w * 0.36, h: 0.22 },
    { mat: "blinkSparse", du: 0, dd: 0.17, w: w - 0.4, h: 0.07 },
  ]);
  keyRow(frame, rand, cu, 0.78, 0.38, a, 0.09, w - 0.5, 0.12);
  // riser screen + indicator block on the wall above the desk
  wallScreen(frame, cu - w * 0.16, 1.32, w * 0.5, 0.42, Math.floor(rand() * 3), { leds: false });
  frame.box("impPaintedMetal", cu + w * 0.3, 1.32, 0.05, w * 0.26, 0.5, 0.04, { color: IMP.consoleDark, texel: 1 });
  frame.box("blink", cu + w * 0.3, 1.38, 0.075, w * 0.22, 0.3, 0.01, { uv: "keep" });
  frame.box("leds", cu + w * 0.3, 1.13, 0.075, w * 0.2, 0.04, 0.01, { uv: "keep" });
}

// Navigation plotting table: a large horizontal chart display with a course globe hologram over it.
function navTable(kit, ctx, pos) {
  const [x, y, z] = pos;
  const w = 3.6;
  const d = 2.0;
  const h = 0.95;
  table(kit, pos, w, d, { h, tone: IMP.consoleDark });
  kit.box("darkGloss", x, y + h + 0.012, z, w - 0.3, 0.024, d - 0.3);
  const g = new THREE.PlaneGeometry(w - 0.4, d - 0.4);
  g.rotateX(-Math.PI / 2);
  kit.add("screen2", g, { pos: [x, y + h + 0.026, z], uv: "keep" });
  kit.box("emitBlue", x, y + h + 0.005, z - d / 2 + 0.06, w - 0.2, 0.012, 0.03);
  kit.box("emitBlue", x, y + h + 0.005, z + d / 2 - 0.06, w - 0.2, 0.012, 0.03);
  const grid = new THREE.PlaneGeometry(w - 0.6, 0.1);
  grid.rotateX(-Math.PI / 2);
  kit.add("blinkDense", grid, { pos: [x, y + h + 0.005, z + d / 2 - 0.16], uv: "keep" });
  for (const s of [-1, 1]) kit.box("impPaintedMetal", x + s * (w / 2 - 0.25), y + h + 0.05, z, 0.5, 0.1, d - 0.5, { color: IMP.consoleDark, texel: 1 });
  for (const s of [-1, 1]) kit.box("blinkSparse", x + s * (w / 2 - 0.25), y + h + 0.105, z, 0.4, 0.01, d - 0.7, { uv: "keep" });
  // course globe hologram: one line-segment mesh (graticule, tilted orbit ring, course arc, waypoints)
  const holo = new THREE.LineSegments(courseGlobe(0.42), new THREE.LineBasicMaterial({ color: IMP.holo, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  holo.position.set(x, y + h + 0.78, z);
  ctx.add(holo);
  ctx.animate((dt, t) => {
    holo.rotation.y -= dt * 0.3;
    holo.position.y = y + h + 0.78 + Math.sin(t * 0.7) * 0.03;
  });
  pointLightDesc(ctx, IMP.holo, 1.6, 6, [x, y + h + 1.1, z], 1);
}

function courseGlobe(r) {
  const pts = [];
  const seg = 48;
  const circle = (fn) => {
    for (let i = 0; i < seg; i++) {
      pts.push(...fn((i / seg) * Math.PI * 2), ...fn(((i + 1) / seg) * Math.PI * 2));
    }
  };
  for (const lat of [-60, -30, 0, 30, 60]) {
    const a = (lat * Math.PI) / 180;
    circle((t) => [r * Math.cos(a) * Math.cos(t), r * Math.sin(a), r * Math.cos(a) * Math.sin(t)]);
  }
  for (let k = 0; k < 6; k++) {
    const lon = (k * Math.PI) / 6;
    circle((t) => [r * Math.cos(t) * Math.cos(lon), r * Math.sin(t), r * Math.cos(t) * Math.sin(lon)]);
  }
  // tilted orbit ring and a course arc with waypoint ticks
  const tilt = 0.5;
  circle((t) => [1.4 * r * Math.cos(t), 1.4 * r * Math.sin(t) * Math.sin(tilt), 1.4 * r * Math.sin(t) * Math.cos(tilt)]);
  const wp = (t) => [1.75 * r * Math.cos(t), 0.3 * r * Math.sin(2 * t), 1.75 * r * Math.sin(t)];
  for (let i = 0; i < 20; i++) pts.push(...wp((i / 20) * Math.PI * 1.2), ...wp(((i + 1) / 20) * Math.PI * 1.2));
  for (const t of [0, 0.4, 0.8, 1.2]) {
    const p = wp(t * Math.PI);
    pts.push(p[0], p[1] - 0.06, p[2], p[0], p[1] + 0.06, p[2]);
  }
  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
}

// -----------------------------------------------------------------------------------------------
// Forward wall: the armoured frame slab that plugs the hull's window band, two trapezoid glass banks
// with fanned mullions and a horizontal rail, the heavy central pillar, header beam, and the sill
// bench with its console strip under the glass.
// -----------------------------------------------------------------------------------------------
function buildWindows(kit, ctx, { xi0, xi1, y, ceilY, wb }) {
  const zc = FRAME_Z + FRAME_D / 2;
  const outer = [
    [-22.4, y - 0.1],
    [22.4, y - 0.1],
    [22.4, ceilY + 0.5],
    [-22.4, ceilY + 0.5],
  ];
  const yb = wb.y0 + 0.1; // 190.9: glass sill just above the hull band's lower edge
  const yt = wb.y1 - 0.25; // 198.35
  const xiB = 2.9;
  const xiT = 1.75;
  const xoB = 17.9;
  const xoT = 19.55;
  const bank = (s, grow = 0) => [
    [s * (xiB - grow), yb - grow],
    [s * (xoB + grow), yb - grow],
    [s * (xoT + grow), yt + grow],
    [s * (xiT - grow), yt + grow],
  ];
  // frame slab with the two openings. The frame, rings and mullions are map-less matte (impMatte): the
  // worn-metal maps under the raw exterior sun read as mottled stone; a smooth dark metal with one steel
  // edge line per mullion reads as machined casement
  kit.add("impMatte", prism(outer, FRAME_D, { holes: [bank(-1), bank(1)] }), { pos: [0, 0, zc], color: IMP.darkMetal, uv: "keep" });
  const mullion = (a, b, w, d, z, color = IMP.trim, mat = "impMatte") => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    kit.add(mat, new THREE.BoxGeometry(w, L, d), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], rot: [0, 0, -Math.atan2(dx, dy)], color, uv: "keep" });
  };
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  for (const s of [-1, 1]) {
    const b = bank(s);
    // glass: one pane per bank in the slab's mid-plane
    const shape = new THREE.Shape(b.map(([px, py]) => new THREE.Vector2(px, py)));
    kit.add("bridgeGlass", new THREE.ShapeGeometry(shape), { pos: [0, 0, zc], uv: "keep" });
    // stepped rings on both faces of the slab
    for (const [zr, dr] of [
      [FRAME_Z + FRAME_D + 0.06, 0.12],
      [FRAME_Z - 0.06, 0.12],
    ]) {
      kit.add("impMatte", prism(bank(s, 0.34), dr, { holes: [b] }), { pos: [0, 0, zr], color: IMP.trim, uv: "keep" });
    }
    kit.add("impMatte", prism(bank(s, 0.4), 0.02, { holes: [bank(s, 0.34)] }), { pos: [0, 0, FRAME_Z + FRAME_D + 0.13], color: IMP.gunmetal, uv: "keep" });
    // fanned mullions (bottom edge -> top edge), a horizontal rail; one steel edge line per mullion on the
    // room side, a dark one outside
    const [ib, ob, ot, it] = b;
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const p = lerp(ib, ob, t);
      const q = lerp(it, ot, t);
      mullion(p, q, 0.24, FRAME_D - 0.04, zc);
      mullion(p, q, 0.03, 0.01, FRAME_Z + FRAME_D - 0.02 + 0.006, IMP.steel);
      mullion(p, q, 0.05, 0.01, FRAME_Z + 0.02 - 0.006, IMP.gunmetal);
    }
    const th = 0.42;
    const hl = lerp(ib, it, th);
    const hr = lerp(ob, ot, th);
    mullion(hl, hr, 0.2, FRAME_D - 0.04, zc);
    mullion(hl, hr, 0.03, 0.01, FRAME_Z + FRAME_D - 0.02 + 0.006, IMP.steel);
  }
  // sill bench across the whole forward wall with a console run under each bank
  sillBench(kit, y, xi0, xi1, [xiB + 0.2, xoB + 1.5]);
  // central pillar relief: raised plate, blue slits, roundel, status panel
  mm(kit, "impPaintedMetal", [-1.15, y + 0.8, SILL_Z], [1.15, ceilY - 0.55, SILL_Z + 0.22], { color: IMP.trim, texel: 1 });
  mm(kit, "impPanel1", [-0.8, y + 1.3, SILL_Z + 0.22], [0.8, ceilY - 0.9, SILL_Z + 0.26], { color: IMP.wallDark, uv: "keep" });
  for (const s of [-1, 1]) mm(kit, "emitBlue", [s * 0.98, y + 1.2, SILL_Z + 0.225], [s * 1.02, ceilY - 0.9, SILL_Z + 0.23]);
  {
    const q = new THREE.PlaneGeometry(1.1, 1.1);
    kit.add("impDecal", q, { pos: [0, y + 6.6, SILL_Z + 0.265], uv: "keep", uvRect: impDecalRect(4) });
    mm(kit, "impPaintedMetal", [-0.6, y + 2.0, SILL_Z + 0.26], [0.6, y + 3.4, SILL_Z + 0.3], { color: IMP.consoleDark, texel: 1 });
    mm(kit, "blinkDense", [-0.5, y + 2.7, SILL_Z + 0.3], [0.5, y + 3.3, SILL_Z + 0.31], { uv: "keep" });
    mm(kit, "darkGloss", [-0.5, y + 2.1, SILL_Z + 0.3], [0.5, y + 2.6, SILL_Z + 0.31]);
    mm(kit, "screen1", [-0.46, y + 2.14, SILL_Z + 0.31], [0.46, y + 2.56, SILL_Z + 0.315], { uv: "keep" });
    mm(kit, "emitRed", [-0.3, y + 3.55, SILL_Z + 0.26], [0.3, y + 3.6, SILL_Z + 0.28]);
  }
  // header beam along the window top with red markers
  mm(kit, "impPaintedMetal", [xi0, ceilY - 0.55, SILL_Z], [xi1, ceilY - 0.02, SILL_Z + 0.75], { color: IMP.trim, texel: 0.5 });
  mm(kit, "impPaintedMetal", [xi0 + 0.3, ceilY - 0.5, SILL_Z + 0.75], [xi1 - 0.3, ceilY - 0.1, SILL_Z + 0.85], { color: IMP.consoleDark, texel: 1 });
  for (let x = -18; x <= 18; x += 6) mm(kit, x % 12 === 0 ? "emitRed" : "emitAmber", [x - 0.25, ceilY - 0.34, SILL_Z + 0.85], [x + 0.25, ceilY - 0.26, SILL_Z + 0.87]);
  // the band's dark head above the glass (between yt and the header) gets a steel seam line
  mm(kit, "impMetal", [xi0, yt + 0.55, SILL_Z + 0.01], [xi1, yt + 0.58, SILL_Z + 0.02], { color: IMP.gunmetal });
}

// Sill bench: a continuous low bench along the forward wall (x xi0..xi1, BENCH_D deep) that buries the
// hull's casement lip, with a run of sloped consoles under each window bank between |x| = xa..xb, a
// plinth under the central pillar, and an indicator ledge right under the glass.
function sillBench(kit, y, xi0, xi1, [xa, xb]) {
  const { frame, length } = wallFrame(kit, [xi0, SILL_Z], [xi1, SILL_Z], y);
  const U = (x) => x - xi0;
  // sunlit surfaces (bench top, ledge, plinth) in the map-less matte: see buildWindows
  frame.box("impMatte", length / 2, BENCH_H / 2, BENCH_D / 2, length, BENCH_H, BENCH_D, { color: IMP.console, uv: "keep" });
  frame.box("impPaintedMetal", length / 2, 0.06, BENCH_D - 0.05, length - 0.2, 0.12, 0.2, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", length / 2, 0.4, BENCH_D + 0.005, length - 0.2, 0.3, 0.01, { color: IMP.consoleDark, texel: 1 });
  frame.box("emitBlue", length / 2, 0.16, BENCH_D + 0.005, length - 0.4, 0.02, 0.01);
  // indicator ledge under the glass, full width
  frame.box("impMatte", length / 2, BENCH_H + 0.06, 0.1, length - 0.3, 0.12, 0.2, { color: IMP.consoleDark, uv: "keep" });
  frame.box("leds", length / 2, BENCH_H + 0.06, 0.205, length - 0.6, 0.05, 0.01, { uv: "keep" });
  // central pillar plinth (3 cm proud of the bench front so the two never share a face)
  frame.box("impMatte", U(0), 0.4, (BENCH_D + 0.03) / 2, 2.9, 0.8, BENCH_D + 0.03, { color: IMP.trim, uv: "keep" });
  frame.box("impPanel1", U(0), 0.42, BENCH_D + 0.04, 2.4, 0.5, 0.02, { color: IMP.wallDark, uv: "keep" });
  frame.box("leds", U(0), 0.72, BENCH_D + 0.035, 1.2, 0.04, 0.01, { uv: "keep" });
  frame.quad("impDecal", U(0), 0.42, BENCH_D + 0.051, 0.36, 0.36, { uvRect: impDecalRect(9) });
  // console runs: sloped slabs sitting on the bench top (front edge at the bench top, back edge 0.84 up,
  // under the glass sill at 0.9), thin tilted fins between the modules
  const a = 0.3;
  const sv = 0.72;
  const sn = 0.78;
  for (const s of [-1, 1]) {
    const rand = rng(s > 0 ? 811 : 813);
    const n = 7;
    const run = xb - xa;
    const pw = run / n;
    for (let i = 0; i <= n; i++) frame.box("impMatte", U(s * (xa + i * pw)), sv + 0.02, sn, 0.06, 0.1, 0.62, { color: IMP.trim, uv: "keep", tilt: a });
    for (let i = 0; i < n; i++) {
      const cx = s * (xa + (i + 0.5) * pw);
      const cu = U(cx);
      const w = pw - 0.12;
      slopedSlab(frame, cu, sv, sn, w, 0.6, a, [
        { mat: "screen" + Math.floor(rand() * 3), du: -w * 0.22, dd: -0.12, w: w * 0.42, h: 0.2 },
        { mat: rand() < 0.5 ? "blinkDense" : "blink", du: w * 0.22, dd: -0.12, w: w * 0.4, h: 0.2 },
        { mat: "blinkSparse", du: 0, dd: 0.09, w: w - 0.3, h: 0.07 },
      ]);
      keyRow(frame, rand, cu, sv, sn, a, 0.21, w - 0.4, 0.09);
      if (i % 3 === 1) frame.quad("impDecal", cu, 0.32, BENCH_D + 0.012, 0.24, 0.24, { uvRect: impDecalRect(9) });
    }
    // deck-number stencil on the plain bench ends
    frame.quad("impDecal", U(s * (xb + 0.65)), 0.36, BENCH_D + 0.012, 0.4, 0.4, { uvRect: impDecalRect(14) });
  }
}

// -----------------------------------------------------------------------------------------------
// Ceiling at 9 m: dark panels, a big central structural beam with warm troughs over the walkway,
// cross frames with blue slits, recessed light troughs over the pits and platforms, conduit runs.
// -----------------------------------------------------------------------------------------------
function buildCeiling(kit, ctx, { xi0, xi1, zi1, ceilY }) {
  const cf = ceilingFrame(kit, xi0, SILL_Z, ceilY);
  impCeiling(cf, xi1 - xi0, zi1 - SILL_Z, { lights: false, tone: IMP.wallDark, panelW: 4, seed: 77 });
  const trim = { color: IMP.trim, texel: 0.5 };
  // central beam over the walkway
  mm(kit, "impPaintedMetal", [-1.7, ceilY - 0.8, SILL_Z + 0.75], [1.7, ceilY - 0.02, zi1 - 0.2], trim);
  mm(kit, "impPaintedMetal", [-1.9, ceilY - 0.5, SILL_Z + 0.75], [1.9, ceilY - 0.3, zi1 - 0.2], trim);
  for (const s of [-1, 1]) mm(kit, "emitBlue", [s * 1.72, ceilY - 0.7, SILL_Z + 1.5], [s * 1.735, ceilY - 0.66, zi1 - 1.0]);
  // warm troughs in the beam's underside, in 6 m fixtures
  for (let z = SILL_Z + 3.5; z < zi1 - 3; z += 6.5) {
    mm(kit, "impPaintedMetal", [-0.55, ceilY - 0.86, z - 2.6], [0.55, ceilY - 0.8, z + 2.6], { color: IMP.consoleDark, texel: 1 });
    mm(kit, "bridgeBandWarm", [-0.32, ceilY - 0.865, z - 2.4], [0.32, ceilY - 0.855, z + 2.4], { uv: "keep" });
  }
  // cross frames
  for (const z of [556, 564, 572, 580, 588, 596]) {
    mm(kit, "impPaintedMetal", [xi0, ceilY - 0.6, z - 0.35], [xi1, ceilY - 0.02, z + 0.35], trim);
    for (const e of [-1, 1]) mm(kit, "emitBlue", [xi0 + 1.2, ceilY - 0.5, z + e * 0.352], [xi1 - 1.2, ceilY - 0.46, z + e * 0.36]);
  }
  // light troughs along z over the pits and the platforms, segmented between the cross frames
  const zs = [SILL_Z + 0.9, 556, 564, 572, 580, 588, 596, zi1 - 0.3];
  for (const x of [-15, -5.85, 5.85, 15]) {
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i] + 0.55;
      const zb = zs[i + 1] - 0.55;
      if (zb - za < 1.5) continue;
      mm(kit, "impPaintedMetal", [x - 0.38, ceilY - 0.16, za], [x + 0.38, ceilY - 0.02, zb], { color: IMP.trim, texel: 1 });
      mm(kit, "bridgeBand", [x - 0.22, ceilY - 0.165, za + 0.2], [x + 0.22, ceilY - 0.155, zb - 0.2], { uv: "keep" });
    }
  }
  // conduit
  for (const s of [-1, 1]) {
    pipeRun(kit, [[s * 3.4, ceilY - 0.32, SILL_Z + 1.2], [s * 3.4, ceilY - 0.32, zi1 - 0.6]], 0.09, { color: IMP.steel, clampPitch: 4 });
    pipeRun(kit, [[s * 3.75, ceilY - 0.26, SILL_Z + 1.2], [s * 3.75, ceilY - 0.26, zi1 - 0.6]], 0.05, { color: IMP.gunmetal, clamps: false });
    pipeRun(kit, [[s * 11.8, ceilY - 0.3, SILL_Z + 1.2], [s * 11.8, ceilY - 0.3, zi1 - 0.6]], 0.07, { color: IMP.darkMetal, clampPitch: 5 });
  }
  for (const z of [560, 576, 592]) pipeRun(kit, [[xi0 + 0.4, ceilY - 0.9, z], [xi1 - 0.4, ceilY - 0.9, z]], 0.07, { color: IMP.steel, clampPitch: 6 });
}
