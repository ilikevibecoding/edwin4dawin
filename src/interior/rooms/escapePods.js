// Escape pod bay: six round pod hatches set into the forward slab face with heavy frames, hazard
// stripes and status lamps, a pod-launch console with the pod status board between the two centre
// hatches, small portholes beside every pod, evacuation chevrons on the deck, grab rails and emergency
// supply lockers. The pods are not all in the same state: pod 03 is open for boarding (door swung back
// on its hinges, the lit pod cabin showing through the collar), pod 04 is sealed off behind a lock bar
// under a red lamp, the others are armed and waiting. Lit low and amber with the red beacon over the
// sealed pod: this is the one room on the deck that should feel like an alarm.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar, IMPERIAL_STYLES, IMPERIAL_PAINTS } from "../shell.js";
import { Frame, panelGrid, pointLight, wallFrame, WALL_T } from "../lib.js";
import { insideOut, panelWithHoles } from "../../kit.js";
import { lockerRun, grabRail, wallScreen, stencil, HAZARD_YELLOW, floorChevron, ceilingFixture, pipeRun, Labels, decalRect } from "./crewFwdKit.js";

const HATCH_U = [3, 6.6, 10.2, 13.8, 17.4, 21]; // centres along the forward wall (u = x + 12)
const HATCH_HALF = 1.0;
const HATCH_TOP = 2.75;
const FW = 0.16; // hatch frame band width
const DOOR_V = 1.4; // centre height of the round door
const DOOR_R = 0.78;
// The exterior tower's forward face plate (hull.js, 1.2 m thick from z 470) ends at z 471.2, i.e. 0.2 m
// inside this room, and it is drawn while the player is in here (the room lists a forward window).
// The hatch wall is therefore built on its own plane far enough proud of that face that the porthole
// sleeves, the closed shutters behind their glass and the open pod's boarding collar all sit in front
// of the hull plate (the collar's back wall lands 0.12 m short of it).
const FWD = 1.1;
const TUBE_D = 0.72; // boarding collar depth behind the open hatch
// Pod state, left to right along the wall.
const STATE = ["armed", "armed", "boarding", "sealed", "armed", "armed"];
const LAMP = { armed: "emitAmber", sealed: "emitRed", boarding: "emitBlue" };
// Label sheet cells: 0..5 pod numbers, then the words used on the wall.
const L = { ARMED: 6, SEALED: 7, BOARDING: 8, STATUS: 9, EVAC: 10, LAUNCH: 11, MASKS: 12, MEDKIT: 13, SUPPLY: 14, COMMS: 15 };
const TEXTS = ["POD 01", "POD 02", "POD 03", "POD 04", "POD 05", "POD 06", "ARMED", { t: "SEALED", accent: "#ff3b30" }, { t: "BOARDING", accent: "#6fb4ff" }, "POD STATUS", "EVAC ROUTE", "LAUNCH CTRL", "O2 MASKS", "MED KIT", "SUPPLY", "COMMS"];
const STATE_LABEL = { armed: L.ARMED, sealed: L.SEALED, boarding: L.BOARDING };

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    skipWalls: ["-z"],
    lights: false,
    lightMat: "emitWarmSoft",
    lightRows: 1,
    floorColor: PALETTE.impGreyDark,
    seed: 31,
  });
  const { y0, yTop, frames } = shell;
  const zf = z0 + FWD;
  const labels = new Labels(ctx, TEXTS);

  // ------------------------------------------------------------ forward wall: hatch bays + portholes
  {
    const { frame: f, length } = wallFrame(kit, [x0, zf], [x1, zf], y0);
    const openings = HATCH_U.map((u) => ({ u0: u - HATCH_HALF, u1: u + HATCH_HALF, v0: 0, v1: HATCH_TOP, type: "hatch" }));
    // one small porthole in every gap beside a pod (the centre gap carries the launch console)
    const gaps = [[0, 2], [4, 5.6], [7.6, 9.2], [14.8, 16.4], [18.4, 20], [22, 24]];
    for (const [a, b] of gaps) openings.push({ u0: a, u1: b, v0: 1.55, v1: 2.35, type: "porthole", r: 0.26 });
    panelGrid(f, length, h, { openings, depth: WALL_T, seed: 41, kick: true, topPipes: false, styles: IMPERIAL_STYLES, paints: IMPERIAL_PAINTS, tag: room.id + "-z" });
    f.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    // blast shutters closed behind the porthole glass (there is only hull behind this wall), with a
    // status lamp on each shutter ring
    for (const [a, b] of gaps) {
      f.cylN("satinBlack", (a + b) / 2, 1.95, -0.14, 0.25, 0.02, { segments: 32 });
      f.box("emitAmber", (a + b) / 2, 1.95 + 0.3, 0.032, 0.05, 0.016, 0.006);
    }
    HATCH_U.forEach((u, i) => podHatch(kit, f, u, i, y0, zf, x0, labels, ctx));
    launchConsole(f, 12, labels);
    // grab bar under every porthole cell so the gaps between pods have something to hold; the gaps
    // alternate an evac-route plate with a stencil so they do not repeat either
    for (const [a, b] of gaps) grabRail(f, a + 0.2, b - 0.2, 1.0);
    gaps.forEach(([a, b], i) => {
      if (i % 2) labels.onFrame(f, L.EVAC, (a + b) / 2, 1.3, 0.008, 0.5, 0.125);
      else stencil(f, (a + b) / 2, 1.28, 0.22, [10, 9, 6][i >> 1], 0.003);
    });
  }

  // ------------------------------------------------------------ aft wall (door wall): lockers, rails, signage
  {
    const { frame: f } = frames["+z"]; // u = x1 - x, door at u 11..13
    lockerRun(f, 1.6, 5.2, { w: 0.6, h: 2.0, d: 0.45, decals: [4, 13, 4, 13, 4], band: PALETTE.orange });
    lockerRun(f, 18.8, 22.4, { w: 0.6, h: 2.0, d: 0.45, decals: [13, 4, 13, 4, 13], band: PALETTE.orange });
    labels.onFrame(f, L.SUPPLY, 3.4, 2.24, 0.008, 0.6, 0.15);
    labels.onFrame(f, L.SUPPLY, 20.6, 2.24, 0.008, 0.6, 0.15);
    grabRail(f, 5.5, 10.3, 1.0);
    grabRail(f, 13.7, 18.5, 1.0);
    for (const [a, b] of [[6.0, 10.4], [13.6, 18.0]]) wallLightBar(f, a, b, 2.5, "emitWarmSoft");
    for (const u of [10.72, 13.28]) f.box("hazard", u, 1.15, 0.004, 0.12, 2.3, 0.006, { color: HAZARD_YELLOW, texel: 1 });
    stencil(f, 10.2, 1.85, 0.42, 1);
    stencil(f, 13.8, 1.85, 0.42, 13);
    wallScreen(f, 7.6, 1.7, 0.56, 0.28, "screen7");
    wallScreen(f, 16.4, 1.7, 0.56, 0.28, "screen1");
    extinguisher(f, 6.3);
    extinguisher(f, 17.7);
    pipeRun(f, 0.4, 23.6, 2.88, 0.045, { color: PALETTE.steel });
    pipeRun(f, 0.4, 23.6, 2.76, 0.028, { color: PALETTE.orange, clamps: false });
  }

  // ------------------------------------------------------------ side walls
  for (const dir of ["-x", "+x"]) {
    const { frame: f, length } = frames[dir]; // 7 m; u runs aft -> forward on -x, forward -> aft on +x
    const aftEnd = dir === "-x" ? 0 : length; // where the door wall is
    const sgn = dir === "-x" ? 1 : -1; // direction from the aft end toward the forward wall
    const at = (t) => aftEnd + sgn * t;
    // supply lockers near the aft corner, rail + kit along the rest
    lockerRun(f, Math.min(at(0.5), at(2.6)), Math.max(at(0.5), at(2.6)), { w: 0.7, h: 2.0, d: 0.45, decals: [4, 13, 4], band: PALETTE.orange });
    grabRail(f, Math.min(at(3.0), at(6.6)), Math.max(at(3.0), at(6.6)), 1.0);
    wallLightBar(f, Math.min(at(0.5), at(6.4)), Math.max(at(0.5), at(6.4)), 2.5, "emitWarmSoft");
    if (dir === "-x") {
      medkit(f, at(3.7));
      labels.onFrame(f, L.MEDKIT, at(3.7), 2.05, 0.008, 0.5, 0.125);
      wallScreen(f, at(5.4), 1.75, 0.42, 0.28, "screen8");
    } else {
      commPanel(f, at(3.7));
      labels.onFrame(f, L.COMMS, at(3.7), 1.9, 0.008, 0.4, 0.1);
      wallScreen(f, at(5.4), 1.75, 0.42, 0.28, "screen2");
    }
    maskDispenser(f, at(5.4), 1.2);
    labels.onFrame(f, L.MASKS, at(5.4), 1.42, 0.008, 0.44, 0.11);
    stencil(f, at(6.4), 2.1, 0.3, dir === "-x" ? 0 : 14);
  }

  // ------------------------------------------------------------ deck: evacuation route
  // a lighter runner from the door to a lateral lane along the hatches, edged with thin amber guide
  // lines and small chevrons (large ones read as paint blobs from the door)
  const zLat = zf + 2.1;
  kit.boxMM("deck", [-1.3, y0, zLat + 0.6], [1.3, y0 + 0.01, z1 - 0.2], { color: PALETTE.impGrey, texel: 1 });
  kit.boxMM("deck", [-9.9, y0, zLat - 0.6], [9.9, y0 + 0.01, zLat + 0.6], { color: PALETTE.impGrey, texel: 1 });
  for (const s of [-1, 1]) kit.box("emitAmber", 0, y0 + 0.014, zLat + s * 0.58, 19.8, 0.006, 0.02, { uv: "keep" });
  for (const s of [-1, 1]) kit.box("emitAmber", s * 1.27, y0 + 0.014, (zLat + 0.6 + z1 - 0.2) / 2, 0.02, 0.006, z1 - 0.2 - (zLat + 0.6), { uv: "keep" });
  for (const z of [477.2, 476.4, 475.6]) floorChevron(kit, "emitAmber", 0, y0 + 0.016, z, 0, 0.2, 0.05);
  for (const s of [-1, 1]) for (const x of [2.4, 4.6, 6.8]) floorChevron(kit, "emitAmber", s * x, y0 + 0.016, zLat, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.18, 0.045);
  HATCH_U.forEach((u, i) => {
    // one small chevron toward each armed / boarding pod; the sealed pod gets a hazard bar instead
    const x = x0 + u;
    if (STATE[i] === "sealed") kit.box("hazard", x, y0 + 0.012, zLat - 0.95, 2.0, 0.012, 0.16, { color: HAZARD_YELLOW, texel: 1 });
    else floorChevron(kit, "emitAmber", x, y0 + 0.016, zLat - 1.0, 0, 0.16, 0.045);
  });

  // ------------------------------------------------------------ ceiling: soft amber downlights over the hatches, red beacons
  for (const u of HATCH_U) ceilingFixture(kit, x0 + u, yTop, zf + 0.9, 0.9, 0.18, "emitWarmSoft");
  const sealedX = x0 + HATCH_U[STATE.indexOf("sealed")];
  for (const [x, z] of [[sealedX, zf + 1.5], [-6, 476.3]]) {
    kit.cyl("satinBlack", x, yTop - 0.035, z, 0.16, 0.07, "y", { segments: 20 });
    kit.cyl("emitRed", x, yTop - 0.11, z, 0.1, 0.1, "y", { segments: 16 });
  }

  // ------------------------------------------------------------ lights: amber wash, a red beacon over the sealed pod, a little cool fill
  for (const u of HATCH_U) ctx.lights.warm.push(pointLight(0xffb060, 6.0, 10, [x0 + u, yTop - 0.5, zf + 1.3]));
  ctx.lights.warm.push(pointLight(0xff3a2a, 3.2, 7, [sealedX, yTop - 0.45, zf + 1.5]));
  // the evacuation lane itself: two warm pools under the shell's light channel (which runs along the
  // lane), set off the room axis so neither throws a glare spot onto the status board's screens
  for (const x of [-2.2, 2.2]) ctx.lights.warm.push(pointLight(0xffc48c, 5.5, 11, [x, yTop - 0.6, zLat + 0.3]));
  for (const x of [-6, 6]) ctx.lights.cool.push(pointLight(0xdfe8ff, 5.0, 10, [x, yTop - 0.5, 476.4]));
  labels.build("podLabels");
  void lib;
  return shell;
}

// One pod hatch: recessed cast bay plate (a different tone and grime scale per pod), heavy bolted frame
// with hazard strips on its uprights, the round door (closed, or swung open on the boarding pod), lock
// dogs, hinges and lever, the status lamp cluster and number plate above, release plate below and a
// threshold on the deck.
function podHatch(kit, f, u, idx, y0, zf, x0, labels, ctx) {
  const state = STATE[idx];
  const tone = [PALETTE.gunmetal, PALETTE.darkMetal, PALETTE.gunmetal, PALETTE.slate, PALETTE.darkMetal, PALETTE.gunmetal][idx];
  const texel = [1, 1.35, 0.8, 1.15, 0.9, 1.25][idx];
  if (state === "boarding") {
    // the plate is a ring around the boarding collar
    const plate = panelWithHoles(HATCH_HALF * 2 - 0.04, HATCH_TOP - 0.04, 0.17, [{ x: 0, y: DOOR_V - HATCH_TOP / 2, r: DOOR_R + 0.02 }]);
    f.add("metalRough", plate, u, HATCH_TOP / 2, -0.085, { color: tone, uv: "world", texel });
    podCabin(f, u, ctx);
  } else {
    f.box("metal", u, HATCH_TOP / 2, -0.11, HATCH_HALF * 2, HATCH_TOP, 0.1, { color: PALETTE.darkMetal, texel: 1.2 });
    f.box("metalRough", u, HATCH_TOP / 2, -0.035, HATCH_HALF * 2 - 0.04, HATCH_TOP - 0.04, 0.07, { color: tone, texel });
  }
  // frame bands, bolts, hazard strips on the uprights
  for (const s of [-1, 1]) f.box("paintedMetal", u + s * (HATCH_HALF - FW / 2), HATCH_TOP / 2, 0.06, FW, HATCH_TOP, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", u, HATCH_TOP - FW / 2, 0.06, HATCH_HALF * 2, FW, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  f.box("paintedMetal", u, FW / 2, 0.06, HATCH_HALF * 2, FW, 0.12, { color: PALETTE.darkMetal, texel: 2 });
  for (const s of [-1, 1]) f.box("hazard", u + s * (HATCH_HALF - FW / 2), 1.42, 0.121, 0.1, 2.2, 0.006, { color: HAZARD_YELLOW, texel: 1 });
  for (const v of [0.4, 1.0, 1.8, 2.4]) for (const s of [-1, 1]) f.cylN("metal", u + s * (HATCH_HALF - FW / 2), v, 0.125, 0.018, 0.024, { color: PALETTE.steel, segments: 8 });
  // hinge blocks (left) and the wall-mounted lock dogs around the rim: clamped on a closed door,
  // swung clear on the open one
  for (const dv of [-0.42, 0.42]) f.box("metalRough", u - 0.9, DOOR_V + dv, 0.1, 0.1, 0.24, 0.18, { color: PALETTE.darkMetal });
  const dog0 = Math.PI / 8 + idx * 0.11 + (state === "boarding" ? 0.35 : 0);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + dog0;
    f.box("metal", u + 0.88 * Math.cos(a), DOOR_V + 0.88 * Math.sin(a), 0.11, 0.12, 0.06, 0.06, { color: PALETTE.steel, spin: a });
  }
  if (state === "boarding") openDoor(kit, f, u);
  else closedDoor(f, u, idx, state, labels);
  // status lamp cluster (red / amber / blue, only the pod's state lit) with the state word under it and
  // the pod number plate on the lintel; a small stencil beside the lamps, different on every pod
  f.box("satinBlack", u, 2.5, 0.06, 0.56, 0.16, 0.12);
  f.box("metal", u, 2.5, 0.121, 0.5, 0.11, 0.004, { color: PALETTE.darkMetal, texel: 2 });
  const lit = { sealed: 0, armed: 1, boarding: 2 }[state];
  ["emitRed", "emitAmber", "emitBlue"].forEach((m, k) => {
    const lu = u - 0.15 + k * 0.15;
    f.cylN("metal", lu, 2.5, 0.125, 0.048, 0.02, { color: PALETTE.steel, segments: 16 });
    f.cylN(k === lit ? m : "darkGloss", lu, 2.5, 0.14, 0.036, 0.03, { segments: 16 });
  });
  labels.onFrame(f, STATE_LABEL[state], u, 2.32, 0.008, 0.44, 0.11);
  labels.onFrame(f, idx, u, HATCH_TOP - FW / 2, 0.125, 0.56, 0.14);
  stencil(f, u - 0.62, 2.5, 0.3, [14, 0, 9, 13, 6, 12][idx], 0.002);
  // release plate under the door (taped over on the sealed pod)
  f.box("painted", u, 0.36, 0.015, 0.5, 0.24, 0.03, { color: PALETTE.creamDark, uv: "keep" });
  if (state === "sealed") {
    f.box("hazard", u, 0.36, 0.032, 0.56, 0.07, 0.006, { color: HAZARD_YELLOW, texel: 1, spin: 0.18 });
  } else {
    stencil(f, u - 0.1, 0.36, 0.2, 13, 0.031);
    f.box("emitTeal", u + 0.18, 0.42, 0.031, 0.02, 0.02, 0.006);
    f.box("emitOrange", u + 0.18, 0.3, 0.031, 0.02, 0.02, 0.006);
  }
  f.cylU("metal", u, 0.2, 0.06, 0.012, 0.22, { color: PALETTE.steel, segments: 8 });
  f.collider(u - HATCH_HALF, u + HATCH_HALF, 0, HATCH_TOP, 0, 0.24, "hatch");
  // threshold + hazard strip on the deck; the boarding pod has its fold-down step deployed
  const x = x0 + u;
  kit.box("metal", x, y0 + 0.008, zf + 0.15, HATCH_HALF * 2, 0.016, 0.3, { color: PALETTE.steel, texel: 2 });
  kit.box("hazard", x, y0 + 0.006, zf + 0.42, HATCH_HALF * 2, 0.012, 0.18, { color: HAZARD_YELLOW, texel: 1 });
  if (state === "boarding") {
    f.box("metal", u, 0.13, 0.42, 1.2, 0.26, 0.5, { color: PALETTE.darkMetal, texel: 2 });
    f.box("metal", u, 0.27, 0.42, 1.16, 0.02, 0.46, { color: PALETTE.steel, texel: 3 });
    for (const s of [-1, 1]) f.box("hazard", u + s * 0.55, 0.13, 0.42, 0.06, 0.24, 0.5, { color: HAZARD_YELLOW, texel: 1 });
    f.collider(u - 0.6, u + 0.6, 0, 0.28, 0.17, 0.67, "step");
  }
}

// Closed door: skin tone and dog-spin differ per pod; the sealed pod carries a lock bar bolted across
// it, a red SEALED plate and a blanked viewport, and its lever hangs in the locked position.
function closedDoor(f, u, idx, state, labels) {
  const sealed = state === "sealed";
  const skin = [PALETTE.impGrey, PALETTE.creamDark, PALETTE.impGrey, PALETTE.slate, PALETTE.impGrey, PALETTE.creamDark][idx];
  f.cylN("painted1", u, DOOR_V, 0.06, DOOR_R, 0.12, { color: skin, segments: 40, uv: "world", texel: [1, 1.3, 1, 0.8, 1.15, 1][idx] });
  f.add("metalRough", new THREE.TorusGeometry(DOOR_R + 0.02, 0.05, 10, 48), u, DOOR_V, 0.1, { color: PALETTE.gunmetal, uv: "scale", uvScale: [4, 1] });
  f.add("painted", new THREE.TorusGeometry(0.64, 0.018, 8, 48), u, DOOR_V, 0.125, { color: sealed ? PALETTE.impRed : PALETTE.orange, uv: "scale", uvScale: [4, 1] });
  // viewport
  f.cylN(sealed ? "satinBlack" : "darkGloss", u, DOOR_V + 0.12, 0.124, 0.19, 0.012, { segments: 32 });
  f.add("metal", new THREE.TorusGeometry(0.2, 0.022, 8, 32), u, DOOR_V + 0.12, 0.13, { color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
  if (!sealed) f.box("emitAmber", u - 0.21, DOOR_V + 0.02, 0.126, 0.02, 0.05, 0.006);
  // release lever on its pivot: upright when armed (a little off on alternate pods), dropped when sealed
  const pv = DOOR_V - 0.2;
  f.cylN("metal", u + 0.45, pv, 0.15, 0.055, 0.06, { color: PALETTE.steel, segments: 12 });
  const ang = sealed ? Math.PI / 2 + 0.25 : idx % 2 ? 0.18 : -0.08;
  const lx = u + 0.45 - 0.2 * Math.sin(ang);
  const lv = pv + 0.2 * Math.cos(ang);
  f.box("metal", lx, lv, 0.19, 0.03, 0.4, 0.03, { color: PALETTE.steel, spin: ang });
  f.box("rubber", u + 0.45 - 0.38 * Math.sin(ang), pv + 0.38 * Math.cos(ang), 0.19, 0.04, 0.09, 0.04, { color: PALETTE.rubber, spin: ang });
  stencil(f, u, DOOR_V - 0.44, 0.34, sealed ? 13 : 8, 0.121);
  if (sealed) {
    f.box("metal", u, DOOR_V - 0.05, 0.19, 1.7, 0.09, 0.07, { color: PALETTE.steel, texel: 2 });
    for (const s of [-1, 1]) f.box("metalRough", u + s * 0.86, DOOR_V - 0.05, 0.17, 0.14, 0.2, 0.1, { color: PALETTE.darkMetal });
    for (const s of [-1, 1]) f.cylN("metal", u + s * 0.86, DOOR_V - 0.05, 0.22, 0.03, 0.02, { color: PALETTE.steel, segments: 10 });
    labels.onFrame(f, L.SEALED, u, DOOR_V + 0.44, 0.135, 0.56, 0.14);
    f.box("hazard", u, DOOR_V - 0.68, 0.13, 0.8, 0.07, 0.006, { color: HAZARD_YELLOW, texel: 1 });
  }
}

// The open door: swung back 105 degrees on its hinge side so it stands proud of the wall, inner face
// (rubber seal ring, dogging wheel, viewport) toward the room.
function openDoor(kit, f, u) {
  const th = THREE.MathUtils.degToRad(105);
  const hu = u - 0.9;
  const U2 = f.U.clone().multiplyScalar(Math.cos(th)).addScaledVector(f.N, Math.sin(th));
  const d = new Frame(kit, f.pos(hu, 0, 0.13), U2, f.V);
  const c = 0.9; // door centre from the hinge line
  d.cylN("painted1", c, DOOR_V, 0, DOOR_R, 0.12, { color: PALETTE.impGrey, segments: 40, uv: "world", texel: 1 });
  d.add("metalRough", new THREE.TorusGeometry(DOOR_R + 0.02, 0.05, 10, 48), c, DOOR_V, 0.0, { color: PALETTE.gunmetal, uv: "scale", uvScale: [4, 1] });
  // outer face (turned toward the hinge-side wall)
  d.add("painted", new THREE.TorusGeometry(0.64, 0.018, 8, 48), c, DOOR_V, 0.065, { color: PALETTE.orange, uv: "scale", uvScale: [4, 1] });
  d.cylN("darkGloss", c, DOOR_V + 0.12, 0.064, 0.19, 0.012, { segments: 32 });
  d.add("metal", new THREE.TorusGeometry(0.2, 0.022, 8, 32), c, DOOR_V + 0.12, 0.07, { color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
  // inner face (toward the room)
  d.add("rubber", new THREE.TorusGeometry(0.7, 0.03, 8, 48), c, DOOR_V, -0.06, { color: PALETTE.rubber, uv: "scale", uvScale: [4, 1] });
  d.add("metal", new THREE.TorusGeometry(0.26, 0.02, 8, 32), c, DOOR_V - 0.12, -0.13, { color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
  for (let k = 0; k < 4; k++) d.box("metal", c, DOOR_V - 0.12, -0.13, 0.03, 0.52, 0.03, { color: PALETTE.steel, spin: (k * Math.PI) / 4 });
  d.cylN("metal", c, DOOR_V - 0.12, -0.1, 0.05, 0.08, { color: PALETTE.steel, segments: 12 });
  d.add("metal", new THREE.TorusGeometry(0.2, 0.022, 8, 32), c, DOOR_V + 0.12, -0.07, { color: PALETTE.steel, uv: "scale", uvScale: [2, 1] });
  d.cylN("darkGloss", c, DOOR_V + 0.12, -0.064, 0.19, 0.012, { segments: 32 });
  d.add("decal", new THREE.PlaneGeometry(0.2, 0.2).rotateY(Math.PI), c + 0.38, DOOR_V + 0.32, -0.062, { uv: "keep", uvRect: decalRect(9) });
  // hinge arms from the door rim to the pin through the wall blocks
  for (const dv of [-0.42, 0.42]) d.box("metal", 0.08, DOOR_V + dv, 0, 0.16, 0.08, 0.08, { color: PALETTE.darkMetal });
  f.cylV("metal", hu, DOOR_V, 0.14, 0.03, 1.1, { color: PALETTE.steel, segments: 10 });
  d.collider(c - DOOR_R - 0.05, c + DOOR_R + 0.05, 0, DOOR_V + DOOR_R + 0.05, -0.12, 0.12, "hatchDoor");
}

// Behind the open hatch: the boarding collar (a ribbed tube through the wall) and the lit pod cabin at
// its end: two padded couches facing each other across a deck plate, harness straps, a padded rear
// bulkhead with the pod's status display, a cabin light and a ring of boarding lights inside the rim.
function podCabin(f, u, ctx) {
  const R = DOOR_R + 0.02;
  const n0 = -0.06; // collar mouth, just behind the plate face
  const nb = n0 - TUBE_D; // cabin back wall
  const nc = (n0 + nb) / 2;
  const tube = insideOut(new THREE.CylinderGeometry(R, R, TUBE_D, 32, 1, true));
  tube.rotateX(Math.PI / 2);
  f.add("metalRough", tube, u, DOOR_V, nc, { color: PALETTE.gunmetal, uv: "scale", uvScale: [6, 1] });
  for (const dn of [0.24, 0.5]) f.add("metal", new THREE.TorusGeometry(R - 0.012, 0.02, 8, 40), u, DOOR_V, n0 - dn, { color: PALETTE.steel, uv: "scale", uvScale: [6, 1] });
  f.cylN("painted", u, DOOR_V, nb, R + 0.03, 0.04, { color: PALETTE.impGreyDark, segments: 32, uv: "world", texel: 1 });
  f.box("fabric", u, DOOR_V + 0.02, nb + 0.04, 1.1, 0.92, 0.05, { color: PALETTE.fabricTeal, uv: "world", texel: 2 });
  f.box("satinBlack", u, DOOR_V + 0.44, nb + 0.06, 0.5, 0.26, 0.04);
  f.box("screen9", u, DOOR_V + 0.44, nb + 0.083, 0.42, 0.2, 0.004, { uv: "keep" });
  // deck plate and sill
  f.box("metal", u, DOOR_V - 0.62, nc, 1.0, 0.03, TUBE_D - 0.04, { color: PALETTE.darkMetal, texel: 2 });
  f.box("metal", u, DOOR_V - 0.76, n0 + 0.02, 1.0, 0.08, 0.16, { color: PALETTE.steel, texel: 2 });
  // couches along both sides of the aisle with orange harness straps
  for (const s of [-1, 1]) {
    f.box("fabric", u + s * 0.42, DOOR_V - 0.3, nc, 0.36, 0.1, TUBE_D - 0.2, { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
    f.box("fabric", u + s * 0.6, DOOR_V + 0.05, nc, 0.1, 0.62, TUBE_D - 0.24, { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
    f.box("rubber", u + s * 0.42, DOOR_V - 0.22, nc, 0.05, 0.06, TUBE_D - 0.3, { color: PALETTE.rubber });
    f.box("painted", u + s * 0.45, DOOR_V + 0.06, nc, 0.03, 0.4, 0.05, { color: PALETTE.orange, uv: "keep" });
  }
  // cabin light on the collar ceiling and the amber boarding ring inside the mouth
  f.box("emitWarmSoft", u, DOOR_V + 0.74, nc, 0.24, 0.012, TUBE_D - 0.3, { uv: "keep" });
  f.add("emitAmber", new THREE.TorusGeometry(R - 0.03, 0.012, 6, 40), u, DOOR_V, n0 - 0.1, { uv: "keep" });
  const p = f.pos(u, DOOR_V + 0.3, nc);
  ctx.lights.warm.push(pointLight(0xffc890, 2.4, 3.5, [p.x, p.y, p.z]));
}

// Pod-launch console in the centre gap: slanted desk with the alert display, six pod lamps and a
// covered launch button, plus the pod status board above it: title plate, the amber status-bars
// display, a cell per pod with its number, lamp and state, and the launch sequencer's data screen.
function launchConsole(f, u, labels) {
  const t = 0.5;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const S = { v: 0.98, n: 0.32 };
  const on = (dx, dy, dz) => [u + dx, S.v + dy * ct - dz * st, S.n + dy * st + dz * ct];
  f.box("satinBlack", u, 0.42, 0.28, 1.3, 0.84, 0.56);
  f.box("metal", u, 0.04, 0.26, 1.2, 0.08, 0.5, { color: PALETTE.darkMetal, texel: 2 });
  f.box("leds", u, 0.12, 0.562, 0.9, 0.03, 0.006, { uv: "keep" });
  f.box("satinBlack", ...on(0, 0, 0), 1.3, 0.04, 0.6, { tilt: t });
  f.box("screen5", ...on(-0.3, 0.024, -0.06), 0.56, 0.006, 0.3, { uv: "keep", tilt: t });
  for (let i = 0; i < 6; i++) {
    f.box("metal", ...on(0.12 + i * 0.09, 0.03, -0.17), 0.075, 0.02, 0.075, { color: PALETTE.steel, tilt: t });
    f.box(LAMP[STATE[i]], ...on(0.12 + i * 0.09, 0.045, -0.17), 0.055, 0.012, 0.055, { tilt: t });
  }
  f.box("satinBlack", ...on(0.36, 0.035, 0.1), 0.2, 0.03, 0.2, { tilt: t });
  f.box("emitRed", ...on(0.36, 0.07, 0.1), 0.12, 0.05, 0.12, { tilt: t });
  f.box("metal", ...on(0.1, 0.03, 0.1), 0.06, 0.03, 0.06, { color: PALETTE.steel, tilt: t });
  f.box("rubber", ...on(0.1, 0.055, 0.1), 0.02, 0.03, 0.05, { color: PALETTE.rubber, tilt: t });
  f.box("leds", ...on(-0.3, 0.024, 0.19), 0.5, 0.006, 0.03, { uv: "keep", tilt: t });
  f.collider(u - 0.65, u + 0.65, 0, 1.15, 0, 0.62, "console");
  // status board
  f.box("satinBlack", u, 1.98, 0.03, 1.56, 1.16, 0.06);
  f.box("metal", u, 1.98, 0.061, 1.5, 1.1, 0.004, { color: PALETTE.darkMetal, texel: 2 });
  labels.onFrame(f, L.STATUS, u - 0.3, 2.46, 0.066, 0.66, 0.15);
  f.box("darkGloss", u - 0.3, 2.13, 0.064, 0.9, 0.48, 0.004);
  f.box("screen10", u - 0.3, 2.13, 0.068, 0.86, 0.43, 0.004, { uv: "keep" });
  f.box("darkGloss", u + 0.47, 2.32, 0.064, 0.5, 0.27, 0.004);
  f.box("screen9", u + 0.47, 2.32, 0.068, 0.46, 0.23, 0.004, { uv: "keep" });
  labels.onFrame(f, L.LAUNCH, u + 0.47, 2.08, 0.066, 0.46, 0.115);
  f.cylN("metal", u + 0.36, 1.94, 0.075, 0.04, 0.03, { color: PALETTE.steel, segments: 12 });
  f.box("metal", u + 0.36, 1.94, 0.095, 0.012, 0.05, 0.012, { color: PALETTE.steel, spin: 0.6 });
  f.box("satinBlack", u + 0.58, 1.94, 0.07, 0.14, 0.14, 0.02);
  f.box("emitRed", u + 0.58, 1.94, 0.082, 0.08, 0.08, 0.006);
  for (let i = 0; i < 6; i++) {
    const lu = u - 0.55 + i * 0.22;
    f.box("metal", lu, 1.69, 0.066, 0.19, 0.3, 0.012, { color: PALETTE.gunmetal });
    labels.onFrame(f, i, lu, 1.795, 0.074, 0.17, 0.0425);
    f.cylN("metal", lu, 1.68, 0.073, 0.045, 0.01, { color: PALETTE.steel, segments: 14 });
    f.cylN(LAMP[STATE[i]], lu, 1.68, 0.08, 0.034, 0.02, { segments: 14 });
    labels.onFrame(f, STATE_LABEL[STATE[i]], lu, 1.585, 0.074, 0.17, 0.0425);
  }
  f.box("leds", u, 1.48, 0.062, 1.0, 0.03, 0.006, { uv: "keep" });
  f.box("satinBlack", u, 2.62, 0.05, 0.4, 0.1, 0.1);
  f.box("emitRed", u, 2.62, 0.101, 0.3, 0.05, 0.006);
}

function extinguisher(f, u) {
  f.box("metalRough", u, 1.15, 0.05, 0.12, 0.5, 0.1, { color: PALETTE.gunmetal });
  f.cylV("painted", u, 1.1, 0.14, 0.075, 0.5, { color: PALETTE.impRed, uv: "keep", segments: 14 });
  f.cylV("metal", u, 1.4, 0.14, 0.03, 0.1, { color: PALETTE.steel, segments: 10 });
  f.box("metal", u + 0.05, 1.46, 0.14, 0.12, 0.03, 0.03, { color: PALETTE.darkMetal });
  stencil(f, u, 1.62, 0.16, 5, 0.003);
}

function medkit(f, u) {
  f.box("paintedMetal", u, 1.55, 0.08, 0.54, 0.68, 0.16, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted", u, 1.55, 0.168, 0.48, 0.62, 0.015, { color: PALETTE.cream, uv: "keep" });
  f.box("painted", u, 1.55, 0.178, 0.3, 0.07, 0.008, { color: PALETTE.orange, uv: "keep" });
  f.box("painted", u, 1.55, 0.178, 0.07, 0.3, 0.008, { color: PALETTE.orange, uv: "keep" });
  f.box("metal", u + 0.2, 1.55, 0.185, 0.03, 0.12, 0.02, { color: PALETTE.steel });
  f.box("emitTeal", u - 0.2, 1.82, 0.178, 0.02, 0.012, 0.006);
  stencil(f, u, 1.08, 0.18, 9);
}

function commPanel(f, u) {
  f.box("satinBlack", u, 1.5, 0.04, 0.34, 0.5, 0.08);
  f.box("screen4", u, 1.62, 0.081, 0.24, 0.12, 0.005, { uv: "keep" });
  f.box("leds", u, 1.5, 0.081, 0.24, 0.03, 0.005, { uv: "keep" });
  f.box("rubber", u - 0.08, 1.36, 0.11, 0.07, 0.16, 0.06, { color: PALETTE.rubber });
  for (const dx of [0.03, 0.09]) f.box("rubber", u + dx, 1.36, 0.085, 0.035, 0.035, 0.012, { color: PALETTE.rubber });
  stencil(f, u, 1.1, 0.18, 6);
}

function maskDispenser(f, u, v) {
  f.box("satinBlack", u, v, 0.08, 0.42, 0.3, 0.16);
  f.box("painted", u, v + 0.09, 0.161, 0.36, 0.06, 0.006, { color: PALETTE.orange, uv: "keep" });
  for (let i = 0; i < 4; i++) f.box("emitTeal", u - 0.12 + i * 0.08, v - 0.02, 0.161, 0.03, 0.03, 0.006);
  f.box("darkGloss", u, v - 0.1, 0.161, 0.34, 0.05, 0.006);
  stencil(f, u, v - 0.29, 0.14, 4, 0.003);
}
