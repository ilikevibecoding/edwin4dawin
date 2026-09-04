// Deck 3 — Emergency Escape Pod Bay (d3_escape). Six round pod hatches recessed into the forward
// (zmin) wall, each with a hazard ring, a lit viewport into the pod, status lamps and its own launch
// panel; evacuation chevrons across the deck, a status / countdown wall either side of the blast
// door, emergency suit lockers and O2 racks along the side walls, rotating amber beacons.
// Deck-local metres, floor y = 0.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallScreen, crate, pipeRun, wallSegment, railing } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng, panelWithHoles, fitUVs, insideOut } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { ensureCrewMaterials, SIGN, signRect, numeralRect, wallSign, signQuad, floorGrime, scuffRun, wallGrime, cableTray, cableDroop, ventGrille, intercom, lockerBank, propFrame, helmet } from "./crewProps.js";

const ESC_PAINTS = [
  [PALETTE.impGrey, 0.45],
  [PALETTE.impMid, 0.3],
  [PALETTE.impLight, 0.15],
  [PALETTE.impDark, 0.1],
];
const ESC_STYLES = { panel: 0.6, vent: 0.1, greeble: 0.12, strip: 0.06, screen: 0.02, conduit: 0.1 };

const HATCH_X = [-10, -6, -2, 2, 6, 10];
const HATCH_V = 1.75; // hatch centre height
const HATCH_R = 1.0;

const DOOR_N = -0.45; // hatch door plane, set back into the tube

// door face reinforcing: two horizontal ribs and a vertical spine (a plug door with a ribbed face; the
// earlier eight radial spokes were what made every hatch read as a washing-machine drum)
const RIB_V = 0.45;
const RIB_LEN = 2 * Math.sqrt(HATCH_R * HATCH_R - RIB_V * RIB_V) - 0.3;

/** Hub, ribs, dog clamps (rotated per seed), rim ring, lit viewport and pod numeral on a door face. */
function doorFace(frame, u, doorN, index, armed, clampRot) {
  frame.add("paintedMetal", new THREE.TorusGeometry(HATCH_R - 0.05, 0.035, 8, 40), u, HATCH_V, doorN + 0.09, { color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) frame.box("paintedMetal", u, HATCH_V + s * RIB_V, doorN + 0.1, RIB_LEN, 0.09, 0.04, { color: PALETTE.impMid, texel: 2 });
  frame.box("paintedMetal", u, HATCH_V, doorN + 0.1, 0.09, 2 * (HATCH_R - 0.15), 0.04, { color: PALETTE.impMid, texel: 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + clampRot;
    frame.box("metal", u + Math.cos(a) * (HATCH_R - 0.12), HATCH_V + Math.sin(a) * (HATCH_R - 0.12), doorN + 0.12, 0.16, 0.1, 0.08, { color: PALETTE.steel, spin: a });
  }
  frame.cylN("paintedMetal", u, HATCH_V, doorN + 0.11, 0.34, 0.06, { color: PALETTE.impDark, segments: 24, texel: 2 });
  frame.add("paintedMetal", new THREE.TorusGeometry(0.3, 0.025, 8, 28), u, HATCH_V, doorN + 0.14, { color: armed ? PALETTE.impRed : PALETTE.impMid, texel: 2 });
  // viewport: glass over the lit pod interior (amber cabin light, a dark seat silhouette)
  frame.cylN("emitAmberDim", u, HATCH_V, doorN + 0.125, 0.22, 0.01, { segments: 24 });
  frame.box("rubber", u, HATCH_V - 0.05, doorN + 0.132, 0.16, 0.2, 0.01, { color: PALETTE.rubber });
  frame.box("rubber", u, HATCH_V + 0.1, doorN + 0.132, 0.08, 0.08, 0.01, { color: PALETTE.rubber });
  frame.add("crew_glass", new THREE.CircleGeometry(0.22, 24), u, HATCH_V, doorN + 0.15, { uv: "keep" });
  // (the pod number lives on the lit header plate above the hatch; a grey stencil on the grey door
  // was invisible from the door)
}

/** Closed hatch door: thick grey disc set back into the tube, hinged at its left rim like the open one. */
function closedDoor(frame, u, index, armed, clampRot) {
  frame.cylN("impPanel", u, HATCH_V, DOOR_N, HATCH_R, 0.16, { color: PALETTE.impGrey, segments: 40, uv: "scale", uvScale: [6, 1] });
  doorFace(frame, u, DOOR_N, index, armed, clampRot);
  // hinge: pin and two knuckles on the housing beside the rim, a swing arm reaching into the tube
  const hu = u - (HATCH_R + 0.14);
  frame.cylV("metal", hu, HATCH_V, 0.17, 0.045, 2.0, { color: PALETTE.steel, segments: 12 });
  for (const dv of [-0.78, 0.78]) frame.box("paintedMetal", hu, HATCH_V + dv, 0.15, 0.2, 0.16, 0.14, { color: PALETTE.impDark, texel: 2 });
  for (const dv of [-0.3, 0.3]) {
    frame.box("paintedMetal", hu + 0.1, HATCH_V + dv, 0.17, 0.3, 0.1, 0.08, { color: PALETTE.impMid, texel: 2 });
    frame.box("paintedMetal", u - 0.98, HATCH_V + dv, (DOOR_N + 0.21) / 2, 0.08, 0.1, 0.21 - DOOR_N, { color: PALETTE.impMid, texel: 2 });
  }
}

/**
 * Open hatch: the plug door has been drawn out of the tube and swung 90 degrees on a hinge at its rim
 * (side `hs`), so it stands out from the wall beside the opening; the boarding tube behind is lit and
 * the pod's crash seat is visible against the warm cabin wall.
 */
function openHatch(kit, ctx, frame, u, index, clampRot, hs = -1) {
  const hu = u + hs * (HATCH_R + 0.14); // hinge line just outside the rim collar
  const hn = 0.08; // hinge stands just proud of the plate
  const cn = hn + HATCH_R + 0.02; // door centre, swung out into the room
  // hinge pin and knuckles
  frame.cylV("metal", hu, HATCH_V, hn, 0.05, 2.2, { color: PALETTE.steel, segments: 12 });
  for (const dv of [-0.85, 0.85]) frame.box("paintedMetal", hu, HATCH_V + dv, hn - 0.03, 0.2, 0.16, 0.18, { color: PALETTE.impDark, texel: 2 });
  // the disc lies in the plane u = hu; its room face (hub, spokes) now faces hs*u, its pod face -hs*u
  frame.cylU("impPanel", hu, HATCH_V, cn, HATCH_R, 0.16, { color: PALETTE.impGrey, segments: 40, uvScale: [6, 1] });
  const toFace = frame.quat(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hs * (Math.PI / 2))); // local n -> hs*u
  const f = (d) => hu + hs * d;
  frame.add("paintedMetal", new THREE.TorusGeometry(HATCH_R - 0.05, 0.035, 8, 40), f(0.09), HATCH_V, cn, { quat: toFace, color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) frame.box("paintedMetal", f(0.1), HATCH_V + s * RIB_V, cn, 0.04, 0.09, RIB_LEN, { color: PALETTE.impMid, texel: 2 });
  frame.box("paintedMetal", f(0.1), HATCH_V, cn, 0.04, 2 * (HATCH_R - 0.15), 0.09, { color: PALETTE.impMid, texel: 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + clampRot;
    frame.box("metal", f(0.12), HATCH_V - Math.sin(a) * (HATCH_R - 0.12), cn + Math.cos(a) * (HATCH_R - 0.12), 0.08, 0.1, 0.16, { color: PALETTE.steel, tilt: a });
  }
  frame.cylU("paintedMetal", f(0.11), HATCH_V, cn, 0.34, 0.06, { color: PALETTE.impDark, segments: 24, texel: 2 });
  frame.add("paintedMetal", new THREE.TorusGeometry(0.3, 0.025, 8, 28), f(0.14), HATCH_V, cn, { quat: toFace, color: PALETTE.impMid, texel: 2 });
  frame.add("crew_glass", new THREE.CircleGeometry(0.22, 24), f(0.15), HATCH_V, cn, { quat: toFace, uv: "keep" });
  // pod side of the door: rubber seal ring, pressure boss and the backs of the dog clamps
  frame.add("rubber", new THREE.TorusGeometry(HATCH_R - 0.08, 0.04, 8, 40), f(-0.085), HATCH_V, cn, { quat: toFace, color: PALETTE.rubber });
  frame.cylU("paintedMetal", f(-0.1), HATCH_V, cn, 0.3, 0.05, { color: PALETTE.impDark, segments: 24, texel: 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + clampRot;
    frame.box("metal", f(-0.1), HATCH_V - Math.sin(a) * (HATCH_R - 0.2), cn + Math.cos(a) * (HATCH_R - 0.2), 0.04, 0.08, 0.12, { color: PALETTE.steel, tilt: a });
  }
  // lit boarding tube: dim amber ring light half-way in, warm cabin wall at the far end
  const back = DOOR_N - 1.0;
  frame.add("emitAmberDim", new THREE.TorusGeometry(HATCH_R + 0.02, 0.025, 8, 40), u, HATCH_V, DOOR_N - 0.4, {});
  frame.cylN("emitWarmSoft", u, HATCH_V, back, HATCH_R + 0.06, 0.04, { segments: 40, uv: "keep" });
  frame.add("paintedMetal", new THREE.TorusGeometry(HATCH_R - 0.02, 0.05, 8, 40), u, HATCH_V, back + 0.05, { color: PALETTE.impDark, texel: 2 });
  // crash seat facing the door: pedestal, pan, backrest, headrest, red harness straps, status panel
  frame.box("paintedMetal", u, HATCH_V - 0.85, back + 0.5, 0.5, 0.6, 0.4, { color: PALETTE.impDark, texel: 2 });
  frame.box("rubber", u, HATCH_V - 0.52, back + 0.5, 0.64, 0.12, 0.54, { color: PALETTE.rubber });
  frame.box("rubber", u, HATCH_V - 0.02, back + 0.2, 0.64, 0.9, 0.14, { color: PALETTE.rubber });
  frame.box("rubber", u, HATCH_V + 0.58, back + 0.2, 0.32, 0.26, 0.14, { color: PALETTE.rubber });
  for (const s of [-1, 1]) frame.box("paintedMetal", u + s * 0.17, HATCH_V + 0.02, back + 0.28, 0.07, 0.82, 0.02, { color: PALETTE.impRed, texel: 2, spin: s * 0.22 });
  frame.box("darkGloss", u, HATCH_V + 0.86, back + 0.1, 0.5, 0.18, 0.06);
  frame.add("impScreen2", new THREE.PlaneGeometry(0.44, 0.12), u, HATCH_V + 0.86, back + 0.135, { uv: "keep" });
  for (let k = 0; k < 3; k++) frame.box(k < 2 ? "emitGreen" : "emitAmber", u - 0.14 + k * 0.14, HATCH_V - 0.2, back + 0.28, 0.06, 0.03, 0.01);
  // the swung door blocks the deck beside the hatch
  const x = hu + ctx.bounds[0][0];
  const z0 = ctx.bounds[0][2];
  kit.collider([x - 0.16, 0, z0], [x + 0.16, 3.0, z0 + cn + HATCH_R + 0.05], "hatchdoor");
}

/** Wheeled tool cart: drawer body, top tray with tools, a toolbox, castors. */
function toolCart(kit, x, z, yaw, seed) {
  const rand = rng(seed);
  const C = propFrame(kit, x, z, yaw);
  C.box("paintedMetal", 0, 0.5, 0, 0.8, 0.72, 0.5, { color: PALETTE.impMid, texel: 2 });
  for (let k = 0; k < 3; k++) {
    C.box("paintedMetal", 0, 0.28 + k * 0.2, 0.255, 0.7, 0.16, 0.01, { color: k === 1 ? PALETTE.impRed : PALETTE.impDark, texel: 2 });
    C.box("metal", 0, 0.28 + k * 0.2, 0.27, 0.3, 0.025, 0.02, { color: PALETTE.steel });
  }
  C.box("paintedMetal", 0, 0.88, 0, 0.86, 0.04, 0.56, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) C.box("paintedMetal", s * 0.42, 0.92, 0, 0.02, 0.06, 0.56, { color: PALETTE.impBlack, texel: 2 });
  C.box("paintedMetal", 0.15, 0.98, -0.05, 0.42, 0.16, 0.26, { color: PALETTE.impRed, texel: 2 });
  C.box("metal", 0.15, 1.08, -0.05, 0.16, 0.03, 0.03, { color: PALETTE.steel });
  for (let k = 0; k < 4; k++) {
    C.cyl("metal", -0.3 + rand() * 0.14, 0.92, -0.18 + k * 0.11, 0.012, 0.28 + rand() * 0.14, "x", { color: k % 2 ? PALETTE.steel : PALETTE.gunmetal, segments: 6 });
  }
  C.box("darkGloss", -0.22, 0.925, 0.16, 0.22, 0.03, 0.14);
  C.box("emitGreen", -0.22, 0.945, 0.16, 0.05, 0.01, 0.03);
  for (const [dx, dz] of [[-0.32, -0.18], [0.32, -0.18], [-0.32, 0.18], [0.32, 0.18]]) C.cyl("rubber", dx, 0.07, dz, 0.07, 0.05, "x", { color: PALETTE.rubber, segments: 10 });
  C.cyl("metal", 0.44, 0.75, 0, 0.015, 0.4, "z", { color: PALETTE.steel, segments: 8 });
  for (const dz of [-0.2, 0.2]) C.box("metal", 0.42, 0.75, dz, 0.06, 0.02, 0.02, { color: PALETTE.steel });
  C.collider(-0.45, -0.3, 0.5, 0.3, 1.1, "cart");
}

/**
 * One pod hatch in the zmin wall frame at u. The wall has a 2.8 x 3.0 opening here; we fill it with a
 * recessed plate, a short tube and the round hatch door with a lit viewport, then dress the outside.
 * `open`: door swung aside, tube lit, seat visible. `service`: hatch down, launch panel cover off.
 */
function podHatch(kit, ctx, frame, u, index, seed, { open = false, service = false } = {}) {
  const rand = rng(seed);
  const armed = service ? false : rand() < 0.85;
  const clampRot = rand() * (Math.PI / 2);
  // recess plate flush with the wall face, round hole
  const plate = panelWithHoles(2.8, 3.0, 0.12, [{ x: 0, y: HATCH_V - 1.7, r: HATCH_R + 0.06 }]);
  fitUVs(plate, 2.8, 3.0);
  frame.add("impPanel1", plate, u, 1.7, -0.08, { color: PALETTE.impMid, uv: "keep" });
  // tube through the wall, black inside (the open hatch shows the whole boarding tube)
  const tubeLen = open ? 1.0 - DOOR_N : 0.7;
  const tube = insideOut(new THREE.CylinderGeometry(HATCH_R + 0.06, HATCH_R + 0.06, tubeLen, 40, 1, true));
  tube.rotateX(Math.PI / 2);
  frame.add("metal", tube, u, HATCH_V, -0.02 - tubeLen / 2, { color: PALETTE.impBlack, uv: "scale", uvScale: [8, 1] });
  // the hatch door: thick disc set 0.45 m back, with a hub, spokes, dog clamps and a rim ring
  if (open) openHatch(kit, ctx, frame, u, index, clampRot);
  else closedDoor(frame, u, index, armed, clampRot);
  // square housing around the round hatch: a dark frame proud of the wall with a black reveal and
  // corner bolts, so the door reads as a plug hatch set in a square housing rather than a drum
  {
    const fw = 2.5;
    const sq = panelWithHoles(fw, fw, 0.1, [{ x: 0, y: 0, r: HATCH_R + 0.24 }]);
    fitUVs(sq, fw, fw);
    frame.add("impPanel1", sq, u, HATCH_V, 0.05, { color: PALETTE.impDark, uv: "keep" });
    for (const s of [-1, 1]) {
      frame.box("paintedMetal", u + s * (fw / 2 - 0.03), HATCH_V, 0.06, 0.06, fw, 0.12, { color: PALETTE.impBlack, texel: 2 });
      frame.box("paintedMetal", u, HATCH_V + s * (fw / 2 - 0.03), 0.06, fw, 0.06, 0.12, { color: PALETTE.impBlack, texel: 2 });
    }
    for (const su of [-1, 1]) for (const sv of [-1, 1]) frame.cylN("metal", u + su * (fw / 2 - 0.16), HATCH_V + sv * (fw / 2 - 0.16), 0.1, 0.035, 0.03, { color: PALETTE.steel, segments: 8 });
  }
  // hatch rim on the wall face: a cast collar with an outer flange ring and bolts (the striped hazard
  // ring was the porthole rim of the drum read; the amber identity lives on the header plate instead)
  frame.add("paintedMetal", new THREE.TorusGeometry(HATCH_R + 0.145, 0.035, 8, 48), u, HATCH_V, 0.1, { color: PALETTE.impMid, texel: 2 });
  frame.add("paintedMetal", new THREE.TorusGeometry(HATCH_R + 0.06, 0.05, 8, 48), u, HATCH_V, 0.08, { color: PALETTE.impDark, texel: 2 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    frame.cylN("metal", u + Math.cos(a) * (HATCH_R + 0.32), HATCH_V + Math.sin(a) * (HATCH_R + 0.32), 0.1, 0.02, 0.04, { color: PALETTE.steel, segments: 8 });
  }
  // header plate over the housing: a big black numeral on an amber lit square, the POD sign and the
  // three status lamps beside it (the numeral used to be a grey stencil on the grey door)
  {
    const hv = 3.34;
    frame.box("paintedMetal", u, hv, 0.06, 2.0, 0.66, 0.12, { color: PALETTE.impBlack, texel: 2 });
    frame.box("paintedMetal", u, hv, 0.125, 1.9, 0.58, 0.02, { color: PALETTE.impDark, texel: 2 });
    frame.box("emitAmberDim", u - 0.62, hv, 0.14, 0.56, 0.56, 0.01, { uv: "keep" });
    frame.add("crew_numeral", new THREE.PlaneGeometry(0.52, 0.52), u - 0.62, hv, 0.15, { uv: "keep", uvRect: numeralRect(index + 1), color: PALETTE.impBlack });
    frame.add("crew_signLit", new THREE.PlaneGeometry(0.9, 0.225), u + 0.2, hv + 0.13, 0.14, { uv: "keep", uvRect: signRect(SIGN.POD1 + index) });
    const lamps = armed ? ["emitGreen", "emitGreen", "emitAmber"] : ["emitRed", "emitRed", "rubber"];
    for (let k = 0; k < 3; k++) frame.box(lamps[k], u - 0.12 + k * 0.3, hv - 0.14, 0.14, 0.2, 0.1, 0.01, { color: PALETTE.rubber });
    frame.box("leds", u + 0.78, hv - 0.14, 0.14, 0.22, 0.1, 0.006, { uv: "keep" });
  }
  // lit status column beside the housing (pressure / seal / power readouts stacked on a black post)
  {
    const cu = u - 1.5;
    frame.box("paintedMetal", cu, 1.7, 0.06, 0.18, 1.7, 0.12, { color: PALETTE.impBlack, texel: 2 });
    const col = armed ? ["emitGreen", "emitGreen", "emitGreen", "emitAmber"] : ["emitRed", "emitAmber", "rubber", "rubber"];
    for (let k = 0; k < 4; k++) {
      frame.box(col[k], cu, 2.35 - k * 0.32, 0.125, 0.1, 0.18, 0.01, { color: PALETTE.rubber });
      frame.box("paintedMetal", cu, 2.19 - k * 0.32, 0.125, 0.18, 0.02, 0.01, { color: PALETTE.impDark, texel: 2 });
    }
    frame.box("darkGloss", cu, 1.0, 0.125, 0.12, 0.22, 0.006);
    frame.add("impScreen3", new THREE.PlaneGeometry(0.1, 0.18), cu, 1.0, 0.13, { uv: "keep" });
    // cable from the header down into the column and on to the launch panel
    const a = frame.pos(u - 1.2, 3.06, 0.1);
    const b = frame.pos(cu, 2.56, 0.1);
    cableDroop(kit, [a.x, a.y, a.z], [b.x, b.y, b.z], 0.12, 0.014, PALETTE.rubber);
  }
  // caution block beside the housing
  frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), u + 1.5, 0.55, 0.004, { uv: "keep", uvRect: decalRect(1) });
  // boot scuffs under the hatch
  wallGrime(kit, ctx, "zmin", u, 0.45, 1.6, 0.5);
  // launch panel to the right of the hatch (between hatches): tilted console face on a wall box
  const pu = u + 2.0;
  const x = u + ctx.bounds[0][0];
  const z0 = ctx.bounds[0][2];
  frame.box("paintedMetal", pu, 1.35, 0.1, 0.72, 1.3, 0.2, { color: PALETTE.impDark, texel: 2 });
  if (service) {
    // cover off: black cavity with boards, lamps and loose cables; the cover leans on the wall beside it
    frame.box("paintedMetal", pu, 1.35, 0.13, 0.62, 1.18, 0.02, { color: PALETTE.impBlack, texel: 2 });
    frame.box("leds", pu - 0.12, 1.55, 0.145, 0.28, 0.6, 0.01, { uv: "keep" });
    frame.box("leds", pu + 0.16, 1.0, 0.145, 0.2, 0.36, 0.01, { uv: "keep" });
    for (let k = 0; k < 3; k++) frame.box(k === 1 ? "emitRed" : "emitGreen", pu + 0.1 + k * 0.08, 1.72, 0.15, 0.04, 0.04, 0.01);
    for (let k = 0; k < 3; k++) frame.box("paintedMetal", pu - 0.2 + k * 0.2, 0.84, 0.16, 0.12, 0.08, 0.04, { color: PALETTE.gunmetal, texel: 2 });
    const a = frame.pos(pu - 0.2, 1.9, 0.17);
    const b = frame.pos(pu + 0.22, 0.86, 0.26);
    cableDroop(kit, [a.x, a.y, a.z], [b.x, b.y, b.z], 0.2, 0.012, PALETTE.impRed);
    const c = frame.pos(pu + 0.12, 1.9, 0.17);
    const d = frame.pos(pu + 0.62, 0.12, 0.5);
    cableDroop(kit, [c.x, c.y, c.z], [d.x, d.y, d.z], 0.15, 0.012, PALETTE.rubber);
    frame.box("paintedMetal", pu + 0.78, 0.58, 0.22, 0.66, 1.22, 0.02, { color: PALETTE.impMid, texel: 2, tilt: -0.34 });
    frame.box("darkGloss", pu + 0.78, 0.99, 0.09, 0.54, 0.3, 0.01, { tilt: -0.34 });
    toolCart(kit, x + 2.3, z0 + 1.05, 0.4, seed + 5);
  } else {
    frame.box("paintedMetal", pu, 1.35, 0.21, 0.66, 1.22, 0.02, { color: PALETTE.impMid, texel: 2 });
    frame.box("darkGloss", pu, 1.78, 0.225, 0.54, 0.3, 0.01);
    frame.add(armed ? "impScreen2" : "impScreen3", new THREE.PlaneGeometry(0.5, 0.26), pu, 1.78, 0.232, { uv: "keep" });
    // guarded launch button (red mushroom under a cage), arming key and a lever
    frame.cylN("paintedMetal", pu - 0.15, 1.35, 0.25, 0.1, 0.06, { color: PALETTE.impBlack, segments: 16, texel: 2 });
    frame.cylN(armed ? "emitRed" : "rubber", pu - 0.15, 1.35, 0.285, 0.07, 0.03, { segments: 16, color: PALETTE.rubber });
    for (const s of [-1, 1]) frame.box("metal", pu - 0.15 + s * 0.11, 1.35, 0.3, 0.02, 0.24, 0.12, { color: PALETTE.steel });
    frame.box("metal", pu - 0.15, 1.35 + 0.12, 0.3, 0.24, 0.02, 0.12, { color: PALETTE.steel });
    frame.box("paintedMetal", pu + 0.17, 1.4, 0.24, 0.18, 0.28, 0.04, { color: PALETTE.impBlack, texel: 2 });
    frame.box("metal", pu + 0.17, 1.46, 0.3, 0.03, 0.14, 0.08, { color: PALETTE.steel, tilt: -0.5 });
    frame.box("rubber", pu + 0.17, 1.52, 0.33, 0.05, 0.05, 0.05, { color: PALETTE.impRed });
    for (let k = 0; k < 4; k++) frame.box(k < (armed ? 3 : 1) ? "emitGreen" : "emitRed", pu - 0.24 + k * 0.16, 1.0, 0.228, 0.06, 0.03, 0.006);
    frame.add("crew_sign", new THREE.PlaneGeometry(0.5, 0.125), pu, 0.86, 0.228, { uv: "keep", uvRect: signRect(SIGN.ESCAPE) });
  }
  intercom(frame, pu, 2.35, 0.0);
  // conduit from the panel up to the ceiling tray
  frame.box("paintedMetal", pu, 2.85, 0.04, 0.1, 1.6, 0.06, { color: PALETTE.impBlack, texel: 2 });
  frame.box("paintedMetal", pu, 2.35 + 0.2, 0.07, 0.14, 0.06, 0.1, { color: PALETTE.gunmetal, texel: 2 });
  // threshold: hazard pad and a pod-side kick plate; the pad doubles as the hatch's walk-up mark
  kit.boxMM("hazard", [x - 1.35, 0, z0 + 0.1], [x + 1.35, 0.012, z0 + 0.35], { texel: 4 });
  kit.boxMM("paintedMetal", [x - 1.4, 0, z0 + 0.35], [x + 1.4, 0.008, z0 + 1.6], { color: PALETTE.impBlack, texel: 2 });
  // grime around the threshold
  floorGrime(kit, x + (rand() - 0.5) * 0.8, z0 + 1.0, 1.4, 1.0, rand());
  return armed;
}

/** Floor chevron pointing along `dir` ([dx,dz] unit), dim amber inlay in a dark channel. */
function chevron(kit, x, z, dir, size = 0.9, mat = "emitAmberDim") {
  const yaw = Math.atan2(dir[0], dir[1]); // 0 → points toward +z
  const F = propFrame(kit, x, z, yaw);
  // arms run from the tip (local +z) back to the outer corners (±x, -z)
  for (const s of [-1, 1]) {
    const q = F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -s * 0.785));
    F.box("paintedMetal", s * size * 0.34, 0.004, -size * 0.04, 0.28, 0.008, size * 0.95, { color: PALETTE.impBlack, texel: 2, quat: q });
    F.box(mat, s * size * 0.34, 0.006, -size * 0.04, 0.14, 0.008, size * 0.85, { quat: q });
  }
}

/** Rotating beacon: amber dome on a black base with a rotating shutter cage (ctx.mesh + anim). */
function beacon(kit, ctx, x, y, z, phase) {
  kit.cyl("paintedMetal", x, y + 0.03, z, 0.2, 0.06, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
  kit.cyl("crew_beacon", x, y + 0.2, z, 0.14, 0.28, "y", { segments: 20 });
  kit.add("crew_beacon", new THREE.SphereGeometry(0.14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + 0.34, z], uv: "keep" });
  kit.cyl("paintedMetal", x, y + 0.5, z, 0.16, 0.04, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
  const mk = new Kit(ctx.materials);
  // two opposing dark shutter blades: as they turn, the dome reads as a sweeping beacon
  for (const s of [-1, 1]) mk.add("rubber", new THREE.CylinderGeometry(0.17, 0.17, 0.3, 12, 1, true, s > 0 ? 0 : Math.PI, Math.PI * 0.55), { pos: [0, 0, 0], color: PALETTE.rubber });
  const g = new THREE.Group();
  g.position.set(x, y + 0.2, z);
  mk.build(g, { castShadow: false, receiveShadow: false });
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    g.rotation.y = t * 3.2 + phase;
  });
}

/** Hanging emergency suit: white torso and legs on a hanger rail, helmet on the shelf above. */
function hangingSuit(kit, x, z, yaw, seed) {
  const rand = rng(seed);
  const F = propFrame(kit, x, z, yaw);
  const white = new THREE.Color("#e8e9ec");
  const grey = new THREE.Color("#b9bcc4");
  F.box("crew_white", 0, 1.55, 0, 0.44, 0.55, 0.22, { color: rand() < 0.7 ? white : grey });
  F.box("crew_white", 0, 1.05, 0, 0.36, 0.5, 0.2, { color: white });
  for (const s of [-1, 1]) {
    F.box("crew_white", s * 0.3, 1.5, 0, 0.13, 0.6, 0.14, { color: grey });
    F.box("crew_white", s * 0.1, 0.55, 0, 0.14, 0.55, 0.16, { color: grey });
    F.box("rubber", s * 0.1, 0.24, 0.02, 0.15, 0.1, 0.22, { color: PALETTE.rubber });
  }
  F.box("rubber", 0, 1.3, 0.12, 0.3, 0.12, 0.06, { color: PALETTE.rubber });
  F.box("emitGreen", 0, 1.62, 0.115, 0.08, 0.04, 0.01);
  F.box("darkGloss", 0, 1.45, 0.115, 0.2, 0.08, 0.01);
  F.cyl("metal", 0, 1.86, 0, 0.012, 0.16, "y", { color: PALETTE.steel, segments: 6 });
  F.cyl("metal", 0, 1.93, 0, 0.03, 0.03, "y", { color: PALETTE.steel, segments: 8 });
  F.collider(-0.35, -0.2, 0.35, 0.2, 1.9, "suit");
}

/** O2 canister rack: a wall-mounted cradle holding upright steel cylinders with green valve caps. */
function o2Rack(kit, x, z, yaw, n, seed) {
  const rand = rng(seed);
  const F = propFrame(kit, x, z, yaw);
  const w = n * 0.32 + 0.1;
  F.box("paintedMetal", 0, 0.05, 0.2, w, 0.1, 0.44, { color: PALETTE.impBlack, texel: 2 });
  F.box("paintedMetal", 0, 0.9, 0.42, w, 0.06, 0.05, { color: PALETTE.impDark, texel: 2 });
  F.box("paintedMetal", 0, 0.9, 0.0, w, 0.06, 0.05, { color: PALETTE.impDark, texel: 2 });
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + 0.21 + i * 0.32;
    if (rand() < 0.12) continue; // one taken
    F.cyl("metal", lx, 0.6, 0.21, 0.12, 1.0, "y", { color: PALETTE.steel, segments: 14 });
    F.cyl("paintedMetal", lx, 1.15, 0.21, 0.07, 0.1, "y", { color: PALETTE.impGreen || PALETTE.impMid, segments: 12, texel: 2 });
    F.box("metal", lx, 1.22, 0.21, 0.06, 0.05, 0.16, { color: PALETTE.gunmetal });
    F.add("decal", new THREE.PlaneGeometry(0.16, 0.16), lx, 0.7, 0.335, { uv: "keep", uvRect: decalRect(4) });
  }
  F.collider(-w / 2, 0, w / 2, 0.44, 1.25, "o2rack");
}

export function buildEscape(kit, ctx) {
  ensureCrewMaterials(ctx);
  const m = ctx.materials;
  const [min, max] = ctx.bounds; // x -14..14, y 0..4, z -86..-71
  const H = max[1];

  // ------------------------------------------------------------------ shell
  const hatchOpenings = HATCH_X.map((x) => ({ type: "hatch", u0: x - min[0] - 1.4, u1: x - min[0] + 1.4, v0: 0.2, v1: 3.2 }));
  roomShell(kit, ctx, {
    floor: { color: 0x9a9aa0 },
    ceiling: false,
    walls: { rows: [0, 0.5, 1.6, 2.6, H], paints: ESC_PAINTS, styles: ESC_STYLES, theme: { accent: "emitAmber", accent2: "emitAmber", screenMats: ["impScreen2", "impScreen3"] } },
    wall: { zmin: { openings: hatchOpenings, styles: { panel: 0.8, vent: 0.1, greeble: 0.1 } } },
  });
  // grey plate ceiling between heavy black beams (the dark slab read as a void with five hot bars);
  // dim amber emergency bars along x, dim white bars near the door
  kit.boxMM("impPanel1", [min[0] - 0.2, H, min[2] - 0.2], [max[0] + 0.2, H + 0.12, max[2] + 0.2], { color: PALETTE.impLight, uv: "world", texel: 0.5 });
  for (let x = min[0] + 2; x < max[0] - 1; x += 4) kit.box("paintedMetal", x, H - 0.12, (min[2] + max[2]) / 2, 0.3, 0.24, max[2] - min[2] - 0.3, { color: PALETTE.impBlack, texel: 2 });
  for (let z = min[2] + 2.5; z < max[2] - 1; z += 3) kit.box("paintedMetal", (min[0] + max[0]) / 2, H - 0.05, z, max[0] - min[0] - 0.3, 0.1, 0.12, { color: PALETTE.impBlack, texel: 2 });
  const strip = (mat, x0, z0, x1, z1) => {
    kit.boxMM("paintedMetal", [Math.min(x0, x1) - 0.14, H - 0.1, Math.min(z0, z1) - 0.14], [Math.max(x0, x1) + 0.14, H, Math.max(z0, z1) + 0.14], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM(mat, [Math.min(x0, x1), H - 0.11, Math.min(z0, z1)], [Math.max(x0, x1), H - 0.09, Math.max(z0, z1)]);
  };
  strip("emitAmberDim", min[0] + 1, -83.62, max[0] - 1, -83.48);
  strip("emitAmberDim", min[0] + 1, -79.02, max[0] - 1, -78.88);
  strip("emitWhiteDim", -5, -73.32, 5, -73.18);
  for (const x of [-8, 8]) strip("emitWhiteDim", x - 3, -75.02, x + 3, -74.88);
  // vents in the ceiling
  for (const [x, z] of [[-12, -74], [12, -74], [-12, -84], [12, -84]]) {
    kit.box("paintedMetal", x, H - 0.03, z, 0.9, 0.06, 0.9, { color: PALETTE.impBlack, texel: 2 });
    for (let k = 0; k < 6; k++) kit.box("metal", x, H - 0.07, z - 0.35 + k * 0.14, 0.8, 0.02, 0.05, { color: PALETTE.impMid });
  }

  // ------------------------------------------------------------------ lights (6): two amber over the
  // lane, a white over the door, and three warm-white washes hung 1.4 m below the ceiling close to the
  // hatch wall so they wash the housings and header plates (the wall had gone muddy at 14 m) instead
  // of blowing out the ceiling plate above them
  const amber = 0xffb347;
  ctx.light(pointLight(amber, 14, 14, [-7, H - 0.6, -80.5]));
  ctx.light(pointLight(amber, 14, 14, [7, H - 0.6, -80.5]));
  ctx.light(pointLight(0xffe2c0, 15, 11, [0, H - 1.4, -84.0]));
  ctx.light(pointLight(0xe8f0ff, 12, 12, [0, H - 0.6, -73.5]));
  ctx.light(pointLight(0xffe2c0, 13, 10, [-8, H - 1.4, -84.0]));
  ctx.light(pointLight(0xffe2c0, 13, 10, [8, H - 1.4, -84.0]));

  // ------------------------------------------------------------------ pod hatches (zmin wall)
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    // pod 2 stands open for boarding drill; pod 4 is down with its launch panel cover off
    HATCH_X.forEach((x, i) => podHatch(kit, ctx, frame, x - min[0], i, ctx.seed * 3 + i * 17, { open: i === 1, service: i === 3 }));
    // the big lit sign over the middle (no glare bars), cable tray along the top of the wall, pipes above it
    frame.add("crew_signLit", new THREE.PlaneGeometry(1.8, 0.45), 14, 3.4, 0.03, { uv: "keep", uvRect: signRect(SIGN.ESCAPE) });
    frame.box("paintedMetal", 14, 3.4, 0.02, 1.96, 0.6, 0.03, { color: PALETTE.impBlack, texel: 2 });
  }
  cableTray(kit, ctx, "zmin", 0.4, 27.6, 3.85);
  pipeRun(kit, [[min[0] + 0.3, H - 0.3, min[2] + 0.6], [max[0] - 0.3, H - 0.3, min[2] + 0.6]], 0.09, PALETTE.impMid);
  pipeRun(kit, [[min[0] + 0.3, H - 0.5, min[2] + 0.45], [max[0] - 0.3, H - 0.5, min[2] + 0.45]], 0.05, PALETTE.impRed);
  for (const x of [-12, -4, 4, 12]) pipeRun(kit, [[x, H - 0.5, min[2] + 0.45], [x, H - 0.5, min[2] + 1.6], [x, H - 0.15, min[2] + 1.6]], 0.05, PALETTE.impRed);

  // ------------------------------------------------------------------ floor: evac chevrons, lanes, wear
  // central lane from the blast door toward the pods, then a cross lane along the hatch line
  for (let z = -72.6; z > -82.5; z -= 1.9) chevron(kit, 0, z, [0, -1], 1.0);
  for (const s of [-1, 1]) {
    for (let x = 2.2; x < 12; x += 2.4) chevron(kit, s * x, -82.0, [s, 0], 0.8);
  }
  // muster boxes: a thin white painted outline in front of each hatch where its crew assembles
  for (const x of HATCH_X) {
    const [x0, x1, z0, z1] = [x - 1.3, x + 1.3, -84.3, -82.9];
    const line = (a, b) => kit.boxMM("paintedMetal", a, b, { color: PALETTE.impWhite, texel: 2 });
    line([x0, 0, z0], [x1, 0.008, z0 + 0.05]);
    line([x0, 0, z1 - 0.05], [x1, 0.008, z1]);
    line([x0, 0, z0], [x0 + 0.05, 0.008, z1]);
    line([x1 - 0.05, 0, z0], [x1, 0.008, z1]);
  }
  // queue rails either side of the evacuation lane, open at both ends
  for (const s of [-1, 1]) railing(kit, s * 2.0, -80.4, s * 2.0, -74.8, 0, { h: 1.0 });
  // lane edges: hazard stripes along the centre lane and the cross lane
  kit.boxMM("hazard", [-1.5, 0, -82.7], [-1.32, 0.01, -72.0], { texel: 4 });
  kit.boxMM("hazard", [1.32, 0, -82.7], [1.5, 0.01, -72.0], { texel: 4 });
  kit.boxMM("hazard", [-12.5, 0, -81.4], [12.5, 0.01, -81.22], { texel: 4 });
  // emergency stencils on the deck at the lane start and end
  kit.add("decal", (() => { const g = new THREE.PlaneGeometry(1.2, 1.2); g.rotateX(-Math.PI / 2); return g; })(), { pos: [0, 0.006, -84.6], uv: "keep", uvRect: decalRect(13) });
  for (const s of [-1, 1]) kit.add("decal", (() => { const g = new THREE.PlaneGeometry(1.0, 1.0); g.rotateX(-Math.PI / 2); g.rotateY(s * Math.PI / 2); return g; })(), { pos: [s * 12.6, 0.006, -82.0], uv: "keep", uvRect: decalRect(3) });
  scuffRun(kit, 0, -72, 0, -83, 9, ctx.seed + 3, 0.7);
  scuffRun(kit, -2, -82.0, -11, -82.0, 6, ctx.seed + 4, 0.6);
  scuffRun(kit, 2, -82.0, 11, -82.0, 6, ctx.seed + 5, 0.6);

  // ------------------------------------------------------------------ door wall (zmax): status / countdown
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.x - x
    // starboard side (x > 0): pod status board + a big situation screen
    wallScreen(kit, ctx, { side: "zmax", u: 4.2, v: 2.1, w: 2.6, h: 1.3, screen: 2 });
    const bu = 8.6;
    frame.box("paintedMetal", bu, 2.0, 0.05, 3.4, 2.0, 0.1, { color: PALETTE.impBlack, texel: 2 });
    frame.box("paintedMetal", bu, 2.0, 0.11, 3.3, 1.9, 0.02, { color: PALETTE.impDark, texel: 2 });
    frame.add("crew_signLit", new THREE.PlaneGeometry(2.4, 0.6), bu, 2.72, 0.125, { uv: "keep", uvRect: signRect(SIGN.ESCAPE) });
    for (let i = 0; i < 6; i++) {
      const cu = bu - 1.25 + i * 0.5;
      frame.add("crew_signLit", new THREE.PlaneGeometry(0.44, 0.11), cu, 2.28, 0.125, { uv: "keep", uvRect: signRect(SIGN.POD1 + i) });
      const down = i === 3;
      for (let k = 0; k < 4; k++) frame.box(down ? (k === 0 ? "emitRed" : "rubber") : k < 3 ? "emitGreen" : "emitAmber", cu, 2.05 - k * 0.2, 0.125, 0.3, 0.12, 0.012, { color: PALETTE.rubber });
    }
    frame.box("leds", bu, 1.22, 0.125, 3.0, 0.06, 0.006, { uv: "keep" });
    intercom(frame, 11.2, 1.5, 0.0);
    // port side (x < 0): countdown display and a second screen
    const cu = 19.4;
    frame.box("paintedMetal", cu, 2.2, 0.05, 3.6, 1.7, 0.1, { color: PALETTE.impBlack, texel: 2 });
    frame.box("darkGloss", cu, 2.2, 0.105, 3.5, 1.6, 0.01);
    frame.add("crew_signLit", new THREE.PlaneGeometry(2.4, 0.6), cu, 2.65, 0.115, { uv: "keep", uvRect: signRect(SIGN.EVAC_R) });
    for (let k = 0; k < 4; k++) frame.box("leds", cu, 1.6 + k * 0.16, 0.115, 3.2 - k * 0.6, 0.06, 0.006, { uv: "keep" });
    for (let k = 0; k < 8; k++) frame.box(k % 3 === 0 ? "emitRed" : "emitAmber", cu - 1.5 + k * 0.42, 1.55, 0.115, 0.24, 0.05, 0.008);
    wallScreen(kit, ctx, { side: "zmax", u: 23.8, v: 2.1, w: 2.6, h: 1.3, screen: 3 });
    // door surround: hazard chevrons and lamps either side of the blast door
    for (const du of [-2.1, 2.1]) {
      frame.box("hazard", 14 + du, 1.6, 0.02, 0.3, 3.2, 0.03, { texel: 3 });
      frame.box("paintedMetal", 14 + du, 3.45, 0.06, 0.4, 0.3, 0.12, { color: PALETTE.impBlack, texel: 2 });
      frame.box("crew_beacon", 14 + du, 3.45, 0.125, 0.3, 0.2, 0.01);
    }
    wallGrime(kit, ctx, "zmax", 14, 0.5, 3.6, 0.7);
  }

  // ------------------------------------------------------------------ side walls: suit lockers, racks, benches
  for (const s of [-1, 1]) {
    const side = s < 0 ? "xmin" : "xmax";
    const wallX = s < 0 ? min[0] : max[0];
    const yaw = s < 0 ? Math.PI / 2 : -Math.PI / 2; // doors face into the room
    // u along the wall: xmin u = max.z - z ; xmax u = z - min.z
    const uOf = (z) => (s < 0 ? max[2] - z : z - min[2]);
    const inX = (d) => wallX - s * d; // d metres in from the wall face
    lockerBank(kit, ctx, { x: inX(0.15), z: -76.5, yaw, n: 5, w: 0.6, h: 2.1, d: 0.55, seed: ctx.seed + (s < 0 ? 1 : 2), color: PALETTE.impGrey, lamp: "emitAmber" });
    wallSign(kit, ctx, { side, u: uOf(-76.5), v: 2.55, w: 1.6, cell: s < 0 ? SIGN.EVAC_R : SIGN.EVAC_L, lit: true });
    // suit rail: a bar on brackets with three hanging suits, helmets on the shelf above
    const rz = -80.4;
    kit.cyl("metal", inX(0.45), 1.95, rz, 0.02, 2.4, "z", { color: PALETTE.steel, segments: 8 });
    for (const dz of [-1.1, 1.1]) kit.box("paintedMetal", inX(0.25), 1.95, rz + dz, 0.5, 0.05, 0.05, { color: PALETTE.impDark, texel: 2 });
    for (let i = 0; i < 3; i++) hangingSuit(kit, inX(0.45), rz - 0.85 + i * 0.85, yaw, ctx.seed + i + (s < 0 ? 10 : 20));
    kit.box("paintedMetal", inX(0.3), 2.35, rz, 0.6, 0.04, 2.8, { color: PALETTE.impMid, texel: 2 });
    for (let i = 0; i < 4; i++) helmet(kit, inX(0.3), 2.37, rz - 1.05 + i * 0.7, yaw, new THREE.Color("#eceef2"));
    kit.collider([Math.min(wallX, inX(0.75)), 0, rz - 1.45], [Math.max(wallX, inX(0.75)), 2.6, rz + 1.45], "suits");
    // O2 rack toward the pods
    o2Rack(kit, inX(0.05), -83.4, yaw, 5, ctx.seed + (s < 0 ? 31 : 32));
    // waiting bench by the door end
    const bz = -72.6;
    kit.box("paintedMetal", inX(0.5), 0.42, bz, 0.5, 0.06, 2.4, { color: PALETTE.impDark, texel: 2 });
    kit.box("rubber", inX(0.5), 0.475, bz, 0.46, 0.05, 2.36, { color: PALETTE.rubber });
    for (const dz of [-1.0, 1.0]) kit.box("paintedMetal", inX(0.5), 0.2, bz + dz, 0.4, 0.4, 0.08, { color: PALETTE.impBlack, texel: 2 });
    kit.collider([Math.min(wallX, inX(0.8)), 0, bz - 1.25], [Math.max(wallX, inX(0.8)), 0.5, bz + 1.25], "bench");
    // wall dressing: emergency decal, a vent, cable tray at height, grime under the rack
    {
      const seg = wallSegment(ctx.bounds, side);
      const { frame } = wallFrame(kit, seg.from, seg.to, 0);
      frame.add("decal", new THREE.PlaneGeometry(0.7, 0.7), uOf(-73.8), 2.2, 0.004, { uv: "keep", uvRect: decalRect(13) });
      ventGrille(frame, uOf(-74.6), 0.9, 0.8, 0.5);
      ventGrille(frame, uOf(-85.0), 3.3, 0.8, 0.4);
      frame.box("crew_beacon", uOf(-78.8), 3.5, 0.06, 0.24, 0.16, 0.06);
      frame.box("paintedMetal", uOf(-78.8), 3.5, 0.03, 0.34, 0.26, 0.04, { color: PALETTE.impBlack, texel: 2 });
    }
    cableTray(kit, ctx, side, 0.6, 14.4, 3.7);
    wallGrime(kit, ctx, side, uOf(-83.4), 0.5, 2.0, 0.7);
  }

  // ------------------------------------------------------------------ beacons, crates, misc
  beacon(kit, ctx, -3.2, H - 0.6, -72.2, 0);
  beacon(kit, ctx, 3.2, H - 0.6, -72.2, Math.PI / 2);
  beacon(kit, ctx, -12.6, H - 0.6, -81.2, 1.0);
  beacon(kit, ctx, 12.6, H - 0.6, -81.2, 2.3);
  // survival ration crates stacked in the port corner by the door, one open
  crate(kit, ctx, { x: -11.6, z: -74.8, sx: 1.2, sy: 0.9, sz: 1.2, seed: ctx.seed + 41 });
  crate(kit, ctx, { x: -11.6, y: 0.9, z: -74.8, sx: 1.0, sy: 0.7, sz: 1.0, yaw: 0.2, seed: ctx.seed + 42 });
  crate(kit, ctx, { x: -10.3, z: -74.7, sx: 0.9, sy: 0.7, sz: 0.9, yaw: -0.15, seed: ctx.seed + 43 });
  signQuad(kit, SIGN.RATIONS, [-11.6, 0.5, -74.19], [0, 0, 0], 0.7);
  // pulsing emergency emitters: strips, dome beacons and the door lamps share crew_beacon
  const beaconMat = m.crew_beacon;
  ctx.anim((dt, t) => {
    beaconMat.emissiveIntensity = 1.4 + Math.max(0, Math.sin(t * 2.6)) * 1.6;
  });
  if (ctx.audioZone) ctx.audioZone({ kind: "hum", pos: [0, 1.5, -78], radius: 12 });
}
