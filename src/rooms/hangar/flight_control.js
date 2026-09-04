// Hangar Flight Control — a glass-fronted booth perched 18 m up the starboard wall (floor y -22, 12 × 20 m,
// 4 m tall) looking straight down onto the launch well. The whole west wall (x 40) is the opening onto the
// hangar: a 1 m sill wall + rail with glass panes above it and a 1.2 m gap onto the gallery balcony that the
// stair tower in hangar.js reaches. Controllers face the hangar; the traffic board fills the back wall; the
// launch-control pedestal in the middle is the interactable that pushes the next fighter off the rack.
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { SYSTEMS } from "../../core/systems.js";
import { Placer } from "../../core/props.js";
import { DECAL, screenRect, ledRect } from "../../textures.js";

export const meta = { id: "flight_control", stream: "hangar" };

const GAP = { z0: -11.2, z1: -10.0 }; // walk-through gap in the glass front (aligned with the console aisle)

export function build(ctx) {
  const { kit, props } = ctx;
  const Y = ctx.floor; // -22
  const { x0, x1, z0, z1 } = ctx.inner; // 40.25..51.75, -19.75..-0.25
  ctx.shell({
    floorMat: "deckGrey",
    floorColor: new THREE.Color("#6f757d"), // same worn-plate deck tint as the hangar (plateDark reads black)
    seed: 23,
    walls: { xmin: false, zmin: { panelW: 1.6 }, zmax: { panelW: 1.6 }, xmax: { panelW: 1.6 } },
    ceiling: { panelW: 1.6, stripSpacing: 5.75, stripW: 0.3 }, // two strips (x 43.1 / 48.9): none right over the aisle
  });

  glassFront(ctx, Y, x0, z0, z1);
  floorMarkings(kit, Y, x0, x1, z0, z1);

  // ---- controller row facing the hangar (operators sit at +x, looking -x through the glass)
  const consoleX = 42.3;
  for (const [z, seed, screens] of [[-16.6, 41, [7, 2, 12]], [-13.6, 42, [12, 7, 5]], [-7.6, 43, [7, 1, 2]], [-4.6, 44, [5, 12, 7]]]) {
    props.consoleStation(kit, { pos: [consoleX, Y, z], yaw: Math.PI / 2, w: 2.5, d: 0.85, screens: 3, accent: "emitAmber", seed, screenSet: screens });
    props.chair(kit, { pos: [consoleX + 0.75, Y, z], yaw: Math.PI / 2 });
  }
  // aisle strip lights leading from the gap to the pedestal
  for (const z of [GAP.z0 + 0.15, GAP.z1 - 0.15]) kit.boxMM("emitAmber", [x0 + 0.9, Y + 0.008, z - 0.03], [46.0, Y + 0.02, z + 0.03]);

  // ---- launch-control pedestal (interactable)
  launchPedestal(ctx, [46.8, Y, -10.6]);

  // ---- back wall: traffic board + flanking computer banks; side walls: status boards
  const back = ctx.wall("xmax").frame; // u = z - z0
  const ub = (z) => z - z0;
  back.box("paintedMetal", ub(-10), 2.35, 0.03, 8.4, 2.5, 0.08, { color: IMP.black, texel: 1 });
  back.box("darkGloss", ub(-10), 2.35, 0.08, 8.2, 2.3, 0.03);
  back.box("screen", ub(-10), 2.35, 0.1, 8.0, 2.1, 0.01, { uv: "keep", uvRect: screenRect(7) });
  back.box("leds", ub(-10), 1.05, 0.1, 6.0, 0.1, 0.01, { uv: "keep", uvRect: ledRect(2) });
  back.box("emitAmber", ub(-10), 3.7, 0.1, 8.0, 0.06, 0.01);
  back.decal(ub(-15.4), 2.9, 0.12, 0.9, 0.9, DECAL.BAY_CODE);
  back.decal(ub(-4.6), 2.9, 0.12, 0.9, 0.9, DECAL.EMBLEM);
  props.computerBank(kit, { pos: [x1 - 0.6, Y, -17.4], yaw: -Math.PI / 2, w: 3.6, h: 2.6, d: 0.6, seed: 51, accent: "emitAmber" });
  props.computerBank(kit, { pos: [x1 - 0.6, Y, -2.6], yaw: -Math.PI / 2, w: 3.6, h: 2.6, d: 0.6, seed: 52, accent: "emitAmber" });
  const zminF = ctx.wall("zmin").frame; // u = x - x0
  const zmaxF = ctx.wall("zmax").frame; // u = x1 - x
  for (const [F, u] of [[zminF, (x) => x - x0], [zmaxF, (x) => x1 - x]]) {
    F.box("darkGloss", u(46.5), 2.3, 0.05, 3.4, 1.3, 0.06);
    F.box("screen", u(46.5), 2.3, 0.09, 3.2, 1.1, 0.01, { uv: "keep", uvRect: screenRect(F === zminF ? 12 : 1) });
    props.wallPanel(kit, F, u(43.2), 1.5, { w: 1.0, h: 0.7, accent: "emitAmber", seed: 61 });
    props.wallPanel(kit, F, u(49.8), 1.5, { w: 1.0, h: 0.7, accent: "emitAmber", seed: 62 });
  }
  // supervisor's standing desk by the aft wall + a spares locker row forward
  props.consoleStation(kit, { pos: [49.2, Y, -3.6], yaw: Math.PI, w: 1.8, d: 0.7, h: 1.05, screens: 2, accent: "emitAmber", seed: 45 });
  props.lockerRow(kit, zminF, 47.6 - x0, 4, { lw: 0.6, h: 2.0, d: 0.45 });

  // ---- lights: a wide downlight over the console aisle (a spot, so the ceiling right above it does not
  // blow out) and an amber wash down the traffic board
  ctx.spot(0xd8e2ff, 70, 24, 1.2, [44.0, Y + 3.7, -10], [44.0, Y, -10], { penumbra: 0.5, decay: 1.5 });
  ctx.spot(0xffb25c, 40, 16, 1.0, [50.6, Y + 3.7, -10], [51.7, Y + 1.0, -10], { penumbra: 0.6, decay: 1.5 });
  for (const x of [44.0, 50.6]) {
    kit.box("paintedMetal", x, Y + 3.82, -10, 0.9, 0.28, 0.6, { color: IMP.black, texel: 1 });
    kit.box(x < 48 ? "emitWhiteSoft" : "emitAmber", x, Y + 3.675, -10, 0.6, 0.02, 0.36, { uv: "keep" });
  }
  // a faint fill so the ceiling plates and upper walls are not pitch black between the downlights
  ctx.light(0xc8d2ea, 7, 12, [47.6, Y + 2.6, -10], { decay: 1.5 });
}

/** Sill wall + rail + glass panes across the whole opening, with the walk-through gap onto the balcony. */
function glassFront(ctx, Y, x0, z0, z1) {
  const { kit } = ctx;
  const x = x0 + 0.35;
  const sillH = 1.0;
  const ceil = ctx.ceil;
  const spans = [
    [z0, GAP.z0],
    [GAP.z1, z1],
  ];
  for (const [a, b] of spans) {
    // sill wall with a hazard cap and a steel top rail
    kit.boxMM("plate", [x - 0.18, Y, a], [x + 0.18, Y + sillH - 0.1, b], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.22, Y, a], [x + 0.22, Y + 0.16, b], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.22, Y + sillH - 0.1, a], [x + 0.22, Y + sillH, b], { color: IMP.trim, texel: 1 });
    kit.boxMM("hazard", [x - 0.2, Y + sillH + 0.001, a], [x + 0.2, Y + sillH + 0.008, b], { texel: 3 });
    kit.cyl("metal", x + 0.28, Y + sillH + 0.08, (a + b) / 2, 0.035, b - a, "z", { color: IMP.steel, segments: 10 });
    for (let z = a + 0.6; z < b; z += 2.4) kit.box("paintedMetal", x + 0.2, Y + sillH + 0.04, z, 0.16, 0.08, 0.06, { color: IMP.gunmetal });
    // glass with mullions up to the ceiling
    const L = b - a;
    const bays = Math.max(1, Math.round(L / 2.45));
    for (let i = 0; i <= bays; i++) {
      const z = a + (i / bays) * L;
      kit.box("paintedMetal", x, Y + sillH + (ceil - Y - sillH) / 2, Math.min(Math.max(z, a + 0.06), b - 0.06), 0.14, ceil - Y - sillH, 0.12, { color: IMP.black, texel: 1 });
    }
    const g = new THREE.PlaneGeometry(L - 0.1, ceil - Y - sillH - 0.05);
    g.rotateY(-Math.PI / 2);
    kit.add("glass", g, { pos: [x, Y + sillH + (ceil - Y - sillH) / 2, (a + b) / 2], uv: "keep" });
    kit.boxMM("paintedMetal", [x - 0.1, ceil - 0.25, a], [x + 0.1, ceil, b], { color: IMP.black, texel: 1 });
    kit.collider([x - 0.25, Y, a], [x + 0.3, ceil, b], "glass");
  }
  // gap jambs with amber edge lights (facing the balcony) and a hazard sill on the floor
  for (const [za, zb] of [
    [GAP.z0 - 0.3, GAP.z0],
    [GAP.z1, GAP.z1 + 0.3],
  ]) {
    kit.boxMM("paintedMetal", [x - 0.25, Y, za], [x + 0.25, ceil, zb], { color: IMP.black, texel: 1 });
    kit.boxMM("emitAmber", [x - 0.27, Y + 0.3, za + 0.1], [x - 0.25, ceil - 0.5, zb - 0.1]);
  }
  kit.boxMM("hazard", [x - 0.6, Y + 0.004, GAP.z0 + 0.3], [x + 0.6, Y + 0.012, GAP.z1 - 0.3], { texel: 3 });
  kit.boxMM("paintedMetal", [x0 - 0.5, Y - 0.02, GAP.z0 + 0.3], [x0 + 0.4, Y + 0.02, GAP.z1 - 0.3], { color: IMP.black, texel: 1 });
}

function floorMarkings(kit, Y, x0, x1, z0, z1) {
  // dark operator dais under the console row (matte anti-fatigue matting: a glossy deckBlack dais mirrors the
  // gallery work light outside the glass into a blown-out streak at the spawn view), amber edge, aisle centre line
  kit.boxMM("rubber", [x0 + 0.6, Y + 0.003, z0 + 0.6], [44.2, Y + 0.006, z1 - 0.6], { color: new THREE.Color("#b0b6c0"), texel: 0.5 });
  kit.boxMM("paintedMetal", [44.2, Y + 0.006, z0 + 0.6], [44.32, Y + 0.018, z1 - 0.6], { color: IMP.hazardYellow, texel: 1 });
  kit.boxMM("paintedMetal", [x0 + 0.6, Y + 0.006, -10.68], [x1 - 0.8, Y + 0.018, -10.52], { color: new THREE.Color("#c9ced6"), texel: 1 });
}

/** Launch control pedestal: angular plinth, sloped glass panel, status LEDs and the big amber launch key. */
function launchPedestal(ctx, pos) {
  const { kit } = ctx;
  const P = new Placer(kit, pos, Math.PI / 2); // faces -x (the hangar)
  P.box("paintedMetal", 0, 0.08, 0, 1.5, 0.16, 1.1, { color: IMP.black, texel: 1 });
  P.box("plate", 0, 0.55, 0, 1.3, 0.8, 0.9, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, 0.98, 0, 1.36, 0.06, 0.96, { color: IMP.trim, texel: 1 });
  P.box("darkGloss", 0, 1.07, -0.05, 1.2, 0.08, 0.8, { rot: [0.22, 0, 0] });
  P.box("leds", -0.3, 1.13, -0.28, 0.5, 0.005, 0.1, { rot: [0.22, 0, 0], uv: "keep", uvRect: ledRect(3) });
  P.box("screen", -0.3, 1.125, 0.06, 0.5, 0.005, 0.32, { rot: [0.22, 0, 0], uv: "keep", uvRect: screenRect(7) });
  P.box("emitAmber", 0, 0.16, -0.46, 1.2, 0.03, 0.01);
  P.decal(0, 0.6, -0.455, 0.5, 0.5, DECAL.WARNING);
  P.box("hazard", 0, 0.012, 0, 2.0, 0.006, 1.6, { texel: 2 });
  P.collider([-0.75, 0, -0.55], [0.75, 1.2, 0.55], "pedestal");
  // the launch key: a dedicated mesh + material so the interaction system can highlight it
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a0b06, emissive: new THREE.Color(0xff9a2a), emissiveIntensity: 1.6, roughness: 0.35, metalness: 0.1 });
  const key = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 24), mat);
  const top = P.world(0.35, 1.155, -0.02);
  key.position.copy(top);
  key.rotation.z = -0.22; // follows the sloped panel (panel tilts about the local x axis = world -z after the yaw)
  key.castShadow = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 32), ctx.materials.metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, -0.02, 0);
  key.add(ring);
  let flash = 0;
  ctx.interactable({
    object: key,
    material: mat,
    id: "launch_control",
    label: "Launch next fighter",
    key: "E",
    action: ({ hud, audio }) => {
      const tr = SYSTEMS.fighters && SYSTEMS.fighters.traffic;
      const id = tr ? tr.requestLaunch() : false;
      flash = 1.2;
      if (hud && hud.roomToast) hud.roomToast(id === false ? "Flight Control" : "Flight Control — launch authorised", id === false ? "no fighter racked or the pattern is full" : `TIE ${String(id + 1).padStart(2, "0")} released from the rack`);
      if (audio && audio.event) audio.event(id === false ? "ui_denied" : "ui_confirm", { position: key.position });
    },
  });
  ctx.animate((dt) => {
    if (flash > 0) {
      flash = Math.max(0, flash - dt);
      mat.emissiveIntensity = 1.6 + 3.5 * flash * (0.5 + 0.5 * Math.sin(flash * 40));
    } else if (mat.emissiveIntensity !== 1.6) mat.emissiveIntensity = 1.6;
  });
}
