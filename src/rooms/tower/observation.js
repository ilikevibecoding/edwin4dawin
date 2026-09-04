// Observation Gallery — the hull view is the point. A 0.6 m viewing platform runs the full width of the
// forward glazing (three flights of stairs, railing along its edge, benches, a floor-standing sensor
// scope on the axis), a long colonnaded gallery leads back from the corridor door along a gloss aisle
// with white edge lights, wall alcoves hold fleet honours plaques between the columns, and the Imperial
// emblem crowns the aft wall above the door. Accent white; four warm-dim lights only.
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { floorFrame } from "../../core/frame.js";
import { Placer } from "../../core/props.js";
import { ledRect, DECAL } from "../../textures.js";
import { lightBand } from "./tactical.js";

export const meta = { id: "observation", stream: "tower-rooms" };

const PLAT_Z = 178.0; // aft edge of the viewing platform
const PLAT_H = 0.6;
const AXIS_X = -73.5; // door centre; everything lines up on it

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const ax = AXIS_X;

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    stripSpacing: 30, // a single narrow light channel down the axis
    ceiling: { stripW: 0.14 },
    seed: 8,
    walls: {
      zmin: { styles: { plate: 0.9, panel: 0.05, vent: 0.05 } },
      zmax: { styles: { plate: 0.85, panel: 0.1, hatch: 0.05 } },
      xmin: { styles: { plate: 0.9, vent: 0.05, pipes: 0.05 } },
      xmax: { styles: { plate: 0.9, vent: 0.05, pipes: 0.05 } },
    },
  });
  for (const side of ["zmax", "xmin", "xmax"]) lightBand(ctx.wall(side));

  // ---- viewing platform ----
  {
    const py = fy + PLAT_H;
    kit.boxMM("plate", [x0, fy, z0], [x1, py, PLAT_Z], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [x0, py - 0.08, PLAT_Z - 0.05], [x1, py, PLAT_Z + 0.06], { color: IMP.black, texel: 1 });
    kit.boxMM("deckGrey", [x0 + 0.05, py, z0 + 0.05], [x1 - 0.05, py + 0.012, PLAT_Z - 0.1], { color: IMP.plate, texel: 0.5 });
    kit.collider([x0, fy - 0.2, z0], [x1, py, PLAT_Z], "platform");
    // riser light band along the whole front edge (the white accent of the room)
    kit.boxMM("emitWarmSoft", [x0 + 0.3, fy + 0.22, PLAT_Z], [x1 - 0.3, fy + 0.27, PLAT_Z + 0.012], { uv: "keep" });
    // three flights: wide centre, two side flights; railing sections between them
    const flights = [
      { x: ax, w: 4.0 },
      { x: x0 + 2.4, w: 2.0 },
      { x: x1 - 2.4, w: 2.0 },
    ];
    for (const f of flights) props.stairs(kit, { pos: [f.x, fy, PLAT_Z + 0.9], yaw: 0, width: f.w, rise: PLAT_H, run: 0.9, rails: false, stringers: false, color: IMP.plateDark });
    const cuts = flights.map((f) => [f.x - f.w / 2 - 0.1, f.x + f.w / 2 + 0.1]).sort((a, b) => a[0] - b[0]);
    let u = x0;
    for (const [a, b] of cuts) {
      if (a - u > 0.5) props.railing(kit, { from: [u, PLAT_Z], to: [a, PLAT_Z], y: py, color: IMP.gunmetal });
      u = b;
    }
    if (x1 - u > 0.5) props.railing(kit, { from: [u, PLAT_Z], to: [x1, PLAT_Z], y: py, color: IMP.gunmetal });

    // leaning rail under the glazing: posts off the platform, padded top at 1.0 m, dim LED read-out
    const W = ctx.wall("zmin");
    W.frame.box("paintedMetal", W.length / 2, PLAT_H + 0.97, 0.22, W.length - 0.4, 0.07, 0.3, { color: IMP.black, texel: 1 });
    W.frame.box("fabric", W.length / 2, PLAT_H + 1.02, 0.24, W.length - 0.6, 0.04, 0.22, { color: IMP.fabricGrey, uv: "world", texel: 2 });
    const nPosts = Math.round(W.length / 3.3);
    for (let i = 0; i <= nPosts; i++) {
      const pu = 0.3 + ((W.length - 0.6) * i) / nPosts;
      W.frame.box("paintedMetal", pu, PLAT_H + 0.48, 0.3, 0.06, 0.96, 0.06, { color: IMP.gunmetal });
    }
    W.frame.box("leds", W.length / 2, PLAT_H + 0.72, 0.03, 4.0, 0.06, 0.01, { uv: "keep", uvRect: ledRect(3) });
    W.frame.collider(0.2, W.length - 0.2, PLAT_H, PLAT_H + 1.05, 0, 0.38, "sill");

    // benches facing the glazing, and the sensor scope on the axis
    for (const bx of [ax - 4.6, ax + 4.6]) bench(kit, { pos: [bx, py, 175.6], yaw: 0, len: 3.2 });
    for (const bx of [ax - 9.0, ax + 9.0]) bench(kit, { pos: [bx, py, 175.6], yaw: 0, len: 1.6 });
    scope(kit, [ax, py, 174.2]);
    // deck stencils at the top of each flight
    const F = floorFrame(kit, x0, z1, py + 0.02);
    for (const f of flights) F.decal(f.x - x0, z1 - (PLAT_Z - 0.7), 0, 0.6, 0.6, DECAL.ARROW);
  }

  // ---- gallery aisle: gloss inlay with white edge lights from the door to the centre stairs ----
  {
    const a0 = PLAT_Z + 1.0;
    const a1 = z1 - 1.4;
    kit.boxMM("darkGloss", [ax - 1.6, fy + 0.002, a0], [ax + 1.6, fy + 0.012, a1]);
    for (const s of [-1, 1]) {
      kit.boxMM("emitWhiteSoft", [ax + s * 1.62 - 0.012, fy + 0.003, a0], [ax + s * 1.62 + 0.012, fy + 0.013, a1], { uv: "keep" });
      kit.boxMM("paintedMetal", [ax + s * 1.75 - 0.08, fy, a0], [ax + s * 1.75 + 0.08, fy + 0.02, a1], { color: IMP.black, texel: 1 });
    }
    kit.boxMM("hazard", [ax - 1.5, fy + 0.003, z1 - 1.3], [ax + 1.5, fy + 0.009, z1 - 0.05], { texel: 1.5 });
    // centre medallion: emblem inlay in a white ring where the aisle meets the gallery's middle
    const mz = 192;
    kit.add("darkGloss", new THREE.CircleGeometry(3.0, 48).rotateX(-Math.PI / 2), { pos: [ax, fy + 0.014, mz], uv: "keep" });
    kit.add("emitWhiteSoft", new THREE.RingGeometry(2.85, 2.95, 48).rotateX(-Math.PI / 2), { pos: [ax, fy + 0.016, mz], uv: "keep" });
    const F = floorFrame(kit, x0, z1, fy + 0.02);
    F.decal(ax - x0, z1 - mz, 0, 4.4, 4.4, DECAL.EMBLEM);
  }

  // ---- colonnade + honours alcoves on both side walls ----
  for (const side of ["xmin", "xmax"]) {
    const W = ctx.wall(side);
    const wx = side === "xmin" ? x0 : x1;
    const inward = side === "xmin" ? 1 : -1;
    const u = (z) => (side === "xmin" ? z1 - z : z - z0);
    for (const pz of [181.5, 189.5, 197.5]) props.pillar(kit, { pos: [wx + inward * 0.5, fy, pz], h: ctx.h, w: 0.8, color: IMP.plateDark });
    for (const [az, decal, seat] of [[185.5, DECAL.TEXT_A, true], [193.5, DECAL.SPEC_PLATE, false], [201.5, DECAL.TEXT_C, true]]) {
      alcove(W.frame, u(az), decal);
      if (seat) bench(kit, { pos: [wx + inward * 0.75, fy, az], yaw: inward > 0 ? Math.PI / 2 : -Math.PI / 2, len: 2.4 });
      else pedestal(kit, [wx + inward * 1.1, fy, az], inward > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    W.frame.decal(u(178.6), 3.6, 0.06, 0.7, 0.7, DECAL.DECK_A);
  }

  // ---- aft wall: emblem over the door, banner panels either side, plaque by the door ----
  {
    const W = ctx.wall("zmax");
    const u = (x) => x1 - x;
    W.frame.decal(u(ax), 4.35, 0.06, 2.6, 2.6, DECAL.EMBLEM);
    for (const s of [-1, 1]) {
      const bu = u(ax + s * 4.2);
      W.frame.box("paintedMetal", bu, ctx.h / 2, 0.1, 1.6, ctx.h - 0.5, 0.2, { color: IMP.black, texel: 1 });
      W.frame.box("plate", bu, ctx.h / 2, 0.2, 1.4, ctx.h - 0.7, 0.02, { color: IMP.plateDark, uv: "keep" });
      W.frame.box("emitWhiteSoft", bu - 0.62, ctx.h / 2, 0.21, 0.03, ctx.h - 0.9, 0.012, { uv: "keep" });
      W.frame.box("emitWhiteSoft", bu + 0.62, ctx.h / 2, 0.21, 0.03, ctx.h - 0.9, 0.012, { uv: "keep" });
      W.frame.decal(bu, 3.9, 0.22, 1.0, 1.0, DECAL.EMBLEM_RED);
      W.frame.decal(bu, 2.2, 0.22, 0.9, 0.9, DECAL.TEXT_B);
      W.frame.collider(bu - 0.8, bu + 0.8, 0, ctx.h, 0, 0.22, "banner");
    }
    W.frame.decal(u(ax + 2.4), 1.65, 0.06, 0.8, 0.8, DECAL.SPEC_PLATE);
    W.frame.decal(u(ax - 2.4), 1.65, 0.06, 0.6, 0.6, DECAL.DECK_A);
    // the ship's plaque: a lectern on the axis at the head of the aisle, read from the door side
    plaqueStand(kit, [ax, fy, PLAT_Z + 2.9], 0);
  }

  // ---- lights: four warm, low-key (the emissive bands and the glazing carry the rest) ----
  ctx.light(0xffd7ad, 44, 26, [ax, fy + 4.8, 175.5], { decay: 1.3 });
  ctx.light(0xffd7ad, 48, 26, [ax, fy + 4.8, 186.0], { decay: 1.3 });
  ctx.light(0xffd7ad, 48, 26, [ax, fy + 4.8, 196.0], { decay: 1.3 });
  ctx.light(0xffd7ad, 40, 24, [ax, fy + 4.4, 203.5], { decay: 1.3 });
}

// ---------------------------------------------------------------------------------------------------
/** Backless gallery bench: black plinth feet, dark steel frame, grey cushion. Length along local X. */
function bench(kit, { pos, yaw = 0, len = 2.4 }) {
  const P = new Placer(kit, pos, yaw);
  for (const s of [-1, 1]) P.box("paintedMetal", s * (len / 2 - 0.35), 0.19, 0, 0.5, 0.38, 0.42, { color: IMP.black, texel: 1 });
  P.box("metal", 0, 0.4, 0, len, 0.04, 0.5, { color: IMP.steelDark });
  P.box("fabric", 0, 0.47, 0, len - 0.06, 0.1, 0.46, { color: IMP.fabricGrey, uv: "world", texel: 2 });
  P.box("emitWarmSoft", 0, 0.36, 0.24, len - 0.8, 0.012, 0.01, { uv: "keep" });
  P.collider([-len / 2, 0, -0.26], [len / 2, 0.55, 0.26], "bench");
}

/** Floor-standing sensor scope: pedestal, yoke, tube tilted up and looking out through the glazing (−Z). */
function scope(kit, pos) {
  const [x, y, z] = pos;
  kit.cyl("paintedMetal", x, y + 0.06, z, 0.42, 0.12, "y", { color: IMP.black, segments: 16 });
  kit.cyl("paintedMetal", x, y + 0.55, z, 0.16, 0.9, "y", { color: IMP.plateDark, segments: 12, r2: 0.2 });
  kit.box("darkGloss", x, y + 0.72, z + 0.19, 0.22, 0.18, 0.03, { rot: [-0.3, 0, 0] });
  kit.box("leds", x, y + 0.72, z + 0.205, 0.18, 0.06, 0.005, { rot: [-0.3, 0, 0], uv: "keep", uvRect: ledRect(7) });
  kit.box("paintedMetal", x, y + 1.08, z, 0.34, 0.16, 0.16, { color: IMP.black, texel: 1 });
  for (const s of [-1, 1]) kit.box("metal", x + s * 0.2, y + 1.3, z, 0.04, 0.5, 0.12, { color: IMP.steelDark });
  const e = 0.28; // elevation: nose up toward the hull horizon
  const d = new THREE.Vector3(0, Math.sin(e), -Math.cos(e)); // tube axis, objective end
  const c = new THREE.Vector3(x, y + 1.46, z - 0.1);
  const at = (t) => c.clone().addScaledVector(d, t).toArray();
  kit.add("paintedMetal", new THREE.CylinderGeometry(0.1, 0.13, 1.5, 16).rotateX(-Math.PI / 2 + e), { pos: at(0), color: IMP.gunmetal, uv: "scale", uvScale: [1, 2] });
  kit.add("darkGloss", new THREE.CylinderGeometry(0.125, 0.125, 0.06, 16).rotateX(-Math.PI / 2 + e), { pos: at(0.78) });
  kit.add("emitBlue", new THREE.TorusGeometry(0.13, 0.012, 6, 24).rotateX(Math.PI + e), { pos: at(0.76), uv: "keep" });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.16, 0.14, 0.24).rotateX(e), { pos: at(-0.8), color: IMP.black });
  kit.collider([x - 0.42, y, z - 0.42], [x + 0.42, y + 1.6, z + 0.42], "scope");
}

/** Wall alcove: black frame, dark plate back, picture light above, a large stencil plaque. */
function alcove(frame, u, decal) {
  frame.box("paintedMetal", u, 2.55, 0.05, 2.8, 2.2, 0.1, { color: IMP.black, texel: 1 });
  frame.box("plate", u, 2.55, 0.1, 2.6, 2.0, 0.02, { color: IMP.plateDark, uv: "keep" });
  frame.box("paintedMetal", u, 3.75, 0.2, 2.9, 0.08, 0.3, { color: IMP.black, texel: 1 });
  frame.box("emitWarmSoft", u, 3.7, 0.2, 2.6, 0.012, 0.16, { uv: "keep" });
  frame.decal(u, 2.6, 0.12, 1.6, 1.6, decal);
  frame.box("metal", u, 1.42, 0.08, 2.6, 0.03, 0.06, { color: IMP.steelDark });
}

/** Low display pedestal under an alcove: a black plinth with a lit spec plate on top. */
function pedestal(kit, pos, yaw) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.5, 0, 1.0, 1.0, 0.6, { color: IMP.black, texel: 1 });
  P.box("plate", 0, 0.5, 0, 0.9, 0.8, 0.5, { color: IMP.plateDark, uv: "keep" });
  P.box("darkGloss", 0, 1.03, 0, 0.9, 0.06, 0.5);
  P.box("emitWhiteSoft", 0, 1.062, 0, 0.8, 0.005, 0.4, { uv: "keep" });
  P.decal(0, 1.07, 0, 0.7, 0.4, DECAL.SPEC_PLATE, { rot: [-Math.PI / 2, 0, 0] });
  P.collider([-0.5, 0, -0.3], [0.5, 1.1, 0.3], "pedestal");
}

/** Lectern-style plaque stand: tilted top carrying the ship's spec plate, read from local +Z. */
function plaqueStand(kit, pos, yaw) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.05, 0, 0.9, 0.1, 0.7, { color: IMP.black, texel: 1 });
  P.box("plate", 0, 0.55, 0.05, 0.5, 0.9, 0.36, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("emitWhiteSoft", 0, 0.55, 0.24, 0.03, 0.7, 0.01, { uv: "keep" });
  const tilt = 0.5;
  P.add("darkGloss", new THREE.BoxGeometry(0.95, 0.06, 0.7).rotateX(tilt), 0, 1.05, -0.05);
  // decal sits on the tilted top face: centre + 0.036 along the face normal (0, cos, sin)
  P.decal(0, 1.05 + Math.cos(tilt) * 0.036, -0.05 + Math.sin(tilt) * 0.036, 0.8, 0.5, DECAL.SPEC_PLATE, { rot: [-Math.PI / 2 + tilt, 0, 0] });
  P.collider([-0.48, 0, -0.42], [0.48, 1.15, 0.36], "plaque");
}
