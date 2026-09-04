// Industrial kit shared by the deck rooms (hangar support rooms + engineering section): hazard floor bays,
// work lights, displays, instanced crates / containers, catwalks, columns, cranes, switchback stairs, cable
// trenches, generic machine blocks, tanks, scrubber towers, valves, vents, benches, racks and window walls.
// Everything is built with the room Kit (merged per material) or its instanced prototypes.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Placer, railing, stairs, floorGrate, pipeRun } from "../../core/props.js";
import { prism, rng } from "../../core/kit.js";
import { panelGrid } from "../../core/frame.js";
import { IMP } from "../../core/palette.js";
import { DECAL, decalRect, screenRect, ledRect } from "../../textures.js";

const Y = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------------------------
// Floor markings
// ---------------------------------------------------------------------------------------------------
/** Hazard-banded floor bay outline with an optional stencil in the middle (lying flat). */
export function hazardBay(kit, [x0, z0], [x1, z1], y, { w = 0.3, mat = "hazard", decal = null, decalSize = 2.4, decalYaw = 0, decalAt = null } = {}) {
  const t = 0.008;
  kit.boxMM(mat, [x0, y + 0.003, z0], [x1, y + 0.003 + t, z0 + w], { texel: 1.5 });
  kit.boxMM(mat, [x0, y + 0.003, z1 - w], [x1, y + 0.003 + t, z1], { texel: 1.5 });
  kit.boxMM(mat, [x0, y + 0.003, z0], [x0 + w, y + 0.003 + t, z1], { texel: 1.5 });
  kit.boxMM(mat, [x1 - w, y + 0.003, z0], [x1, y + 0.003 + t, z1], { texel: 1.5 });
  if (decal !== null) {
    const at = decalAt || [(x0 + x1) / 2, (z0 + z1) / 2];
    floorDecal(kit, at, y, decalSize, decal, decalYaw);
  }
}

/** Stencil lying flat on the floor at (x, z). */
export function floorDecal(kit, [x, z], y, size, index, yaw = 0) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  kit.add("decal", g, { pos: [x, y + 0.015, z], uv: "keep", uvRect: decalRect(index) });
}

/** Painted lane line between two floor points. */
export function floorLine(kit, [x0, z0], [x1, z1], y, { w = 0.12, color = IMP.hazardYellow, mat = "paintedMetal" } = {}) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const L = Math.hypot(dx, dz);
  if (L < 1e-3) return;
  const P = new Placer(kit, [x0, y, z0], Math.atan2(-dz, dx));
  P.box(mat, L / 2, 0.004, 0, L, 0.006, w, { color, texel: 2 });
}

/** Painted rectangle outline (thin lines). */
export function floorRect(kit, [x0, z0], [x1, z1], y, opts = {}) {
  floorLine(kit, [x0, z0], [x1, z0], y, opts);
  floorLine(kit, [x1, z0], [x1, z1], y, opts);
  floorLine(kit, [x1, z1], [x0, z1], y, opts);
  floorLine(kit, [x0, z1], [x0, z0], y, opts);
}

/** Emissive strip (status / approach light) as a thin box between min and max. */
export function strip(kit, min, max, mat = "emitAmber") {
  kit.boxMM(mat, min, max, { uv: "keep" });
}

// ---------------------------------------------------------------------------------------------------
// Lights and displays
// ---------------------------------------------------------------------------------------------------
/**
 * Hanging industrial work light: stem from the ceiling, wide black housing, diffuser, point light 0.6 m below.
 * pos = ceiling attachment point. Returns the light.
 */
export function workLight(ctx, pos, { drop = 1.2, size = 1.4, warm = false, color = null, intensity = 160, distance = 40, shadow = false, cage = true } = {}) {
  const kit = ctx.kit;
  const [x, y, z] = pos;
  const hy = y - drop;
  kit.cyl("metal", x, y - drop / 2 + 0.1, z, 0.04, drop - 0.2, "y", { color: IMP.steelDark, segments: 8 });
  kit.box("paintedMetal", x, hy + 0.1, z, size, 0.2, size, { color: IMP.black, texel: 1 });
  kit.box("paintedMetal", x, hy - 0.05, z, size * 0.86, 0.1, size * 0.86, { color: IMP.plateDark, texel: 1 });
  kit.box(warm ? "emitWarmSoft" : "emitWhiteSoft", x, hy - 0.11, z, size * 0.7, 0.02, size * 0.7, { uv: "keep" });
  if (cage) {
    for (const s of [-1, 1]) {
      kit.box("metal", x + s * size * 0.36, hy - 0.16, z, 0.03, 0.03, size * 0.72, { color: IMP.steelDark });
      kit.box("metal", x, hy - 0.16, z + s * size * 0.36, size * 0.72, 0.03, 0.03, { color: IMP.steelDark });
    }
  }
  return ctx.light(color || (warm ? 0xffd2a0 : 0xe8f0ff), intensity, distance, [x, hy - 0.7, z], { shadow });
}

/**
 * Drive a room light's intensity from an animator. The lighting controller re-applies
 * `userData.baseIntensity` every frame, so animate that once it exists. `base` = intensity after ctx.light().
 */
export function setLightLevel(light, base, k) {
  if (light.userData.baseIntensity !== undefined) light.userData.baseIntensity = base * k;
  else light.intensity = base * k;
}

/** Wall-mounted display facing local −Z: black housing, glossy bezel, screen from the atlas, LED row. */
export function screenPanel(kit, { pos, yaw = 0, w = 3, h = 1.8, index = 3, leds = true, accent = "emitCyan", stand = false, collide = false }) {
  const P = new Placer(kit, pos, yaw);
  const b = 0.14;
  P.box("paintedMetal", 0, h / 2 + b, 0.08, w + 2 * b, h + 2 * b, 0.16, { color: IMP.black, texel: 1 });
  P.box("plate", 0, h / 2 + b, 0.12, w + 2 * b + 0.1, h + 2 * b + 0.1, 0.06, { color: IMP.plateDark, uv: "keep" });
  P.box("darkGloss", 0, h / 2 + b, -0.005, w + 0.06, h + 0.06, 0.02);
  P.box("screen", 0, h / 2 + b, -0.02, w, h, 0.01, { uv: "keep", uvRect: screenRect(index) });
  if (leds) {
    P.box("darkGloss", 0, h + 2 * b + 0.12, 0.06, w * 0.6, 0.14, 0.05);
    P.box("leds", 0, h + 2 * b + 0.12, 0.03, w * 0.56, 0.08, 0.01, { uv: "keep", uvRect: ledRect(Math.floor(Math.abs(pos[0] * 3 + pos[2]) % 16)) });
    P.box(accent, w / 2 + b - 0.1, 0.08, -0.01, 0.12, 0.04, 0.01);
  }
  if (stand) {
    P.box("paintedMetal", 0, -0.5, 0.1, w * 0.3, 1.0, 0.16, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", 0, -0.97, 0.1, w * 0.5, 0.06, 0.6, { color: IMP.black, texel: 1 });
  }
  if (collide) P.collider([-w / 2 - b, stand ? -1 : 0, 0], [w / 2 + b, h + 2 * b, 0.16], "screen");
  return P;
}

/** Screen with bezel on a wall frame at (u, v) centre. */
export function frameScreen(frame, u, v, w, h, index, { accent = "emitCyan", leds = true } = {}) {
  frame.box("paintedMetal", u, v, 0.1, w + 0.3, h + 0.3, 0.14, { color: IMP.black, texel: 1 });
  frame.box("darkGloss", u, v, 0.175, w + 0.06, h + 0.06, 0.02);
  frame.box("screen", u, v, 0.19, w, h, 0.01, { uv: "keep", uvRect: screenRect(index) });
  if (leds) {
    frame.box("leds", u, v - h / 2 - 0.09, 0.18, w * 0.6, 0.07, 0.01, { uv: "keep", uvRect: ledRect((index * 5) % 16) });
    frame.box(accent, u + w / 2 + 0.06, v + h / 2 + 0.06, 0.18, 0.06, 0.06, 0.01);
  }
}

/** Indicator cluster on a dark plate (any orientation via yaw), facing local −Z. */
export function ledCluster(kit, { pos, yaw = 0, w = 0.6, h = 0.25, index = 4, accent = null }) {
  const P = new Placer(kit, pos, yaw);
  P.box("darkGloss", 0, 0, 0.02, w + 0.08, h + 0.08, 0.04);
  P.box("leds", 0, 0, -0.005, w, h, 0.01, { uv: "keep", uvRect: ledRect(index % 16) });
  if (accent) P.box(accent, w / 2 - 0.05, h / 2 + 0.02, -0.006, 0.05, 0.03, 0.01);
}

// ---------------------------------------------------------------------------------------------------
// Instanced crates / containers
// ---------------------------------------------------------------------------------------------------
/** Register the crate prototypes (body, frame, band). Unit crate is 1.2 × 1.0 × 1.2 m; scale per instance. */
export function crateProtos(kit) {
  if (kit.protos.has("crate_body")) return;
  const w = 1.2,
    h = 1.0,
    d = 1.2;
  kit.proto("crate_body", "plate", new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), { texel: 1 });
  const parts = [];
  parts.push(new THREE.BoxGeometry(w + 0.04, 0.16, d + 0.04).translate(0, 0.08, 0));
  parts.push(new THREE.BoxGeometry(w + 0.04, 0.16, d + 0.04).translate(0, h - 0.08, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(new THREE.BoxGeometry(0.08, h - 0.2, 0.08).translate((sx * w) / 2, h / 2, (sz * d) / 2));
  parts.push(new THREE.BoxGeometry(w * 0.5, 0.06, 0.02).translate(0, h * 0.72, d / 2 + 0.01));
  parts.push(new THREE.BoxGeometry(w * 0.5, 0.06, 0.02).translate(0, h * 0.72, -d / 2 - 0.01));
  kit.proto("crate_frame", "paintedMetal", mergeGeometries(parts), { texel: 1 });
  kit.proto("crate_band", "hazard", new THREE.BoxGeometry(w + 0.01, 0.08, d + 0.01).translate(0, h * 0.5, 0), { texel: 3 });
}

/** Place an instanced crate. size = [w, h, d] scales the unit crate. */
export function placeCrate(kit, pos, yaw = 0, { size = [1.2, 1.0, 1.2], color = IMP.plateDark, band = true, collide = true } = {}) {
  crateProtos(kit);
  const scale = [size[0] / 1.2, size[1] / 1.0, size[2] / 1.2];
  const rot = [0, yaw, 0];
  kit.place("crate_body", { pos, rot, scale, color });
  kit.place("crate_frame", { pos, rot, scale, color: IMP.black });
  if (band) kit.place("crate_band", { pos, rot, scale });
  if (collide) {
    const P = new Placer(kit, pos, yaw);
    P.collider([-size[0] / 2, 0, -size[2] / 2], [size[0] / 2, size[1], size[2] / 2], "crate");
  }
}

/** Register the Imperial cargo container prototypes (hex pod body + black frames). 4 × 1.6 × 1.7 m. */
export function containerProtos(kit, { len = 4, w = 1.6, h = 1.7 } = {}) {
  if (kit.protos.has("cont_body")) return;
  const hex = prism(
    [
      [-w / 2, h * 0.2],
      [-w / 2 + w * 0.15, 0],
      [w / 2 - w * 0.15, 0],
      [w / 2, h * 0.2],
      [w / 2, h * 0.8],
      [w / 2 - w * 0.15, h],
      [-w / 2 + w * 0.15, h],
      [-w / 2, h * 0.8],
    ],
    len,
  );
  kit.proto("cont_body", "plate", hex, { texel: 0.8 });
  const parts = [];
  for (const z of [-len / 2 + 0.2, len / 2 - 0.2, 0]) parts.push(new THREE.BoxGeometry(w + 0.06, h + 0.04, 0.14).translate(0, h / 2, z));
  parts.push(new THREE.BoxGeometry(w * 0.6, 0.1, len - 0.4).translate(0, 0.05, 0));
  parts.push(new THREE.BoxGeometry(0.02, 0.3, 0.5).translate(w / 2 + 0.01, h * 0.5, len * 0.25));
  parts.push(new THREE.BoxGeometry(0.02, 0.3, 0.5).translate(-w / 2 - 0.01, h * 0.5, -len * 0.25));
  kit.proto("cont_frame", "paintedMetal", mergeGeometries(parts), { texel: 1 });
  const led = new THREE.PlaneGeometry(0.4, 0.08);
  led.rotateY(Math.PI / 2);
  led.translate(w / 2 + 0.025, h * 0.5, len * 0.25);
  const uv = led.attributes.uv;
  const r = ledRect(3);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
  kit.proto("cont_led", "leds", led, { uv: "keep" });
  kit.containerSize = { len, w, h };
}

export function placeContainer(kit, pos, yaw = 0, { color = IMP.plate, collide = true } = {}) {
  containerProtos(kit);
  const { len, w, h } = kit.containerSize;
  const rot = [0, yaw, 0];
  kit.place("cont_body", { pos, rot, color });
  kit.place("cont_frame", { pos, rot, color: IMP.black });
  kit.place("cont_led", { pos, rot });
  if (collide) new Placer(kit, pos, yaw).collider([-w / 2, 0, -len / 2], [w / 2, h, len / 2], "container");
}

// ---------------------------------------------------------------------------------------------------
// Structure: columns, beams, catwalks, stairs, cranes
// ---------------------------------------------------------------------------------------------------
/** Square structural column between y0 and y1 with base/cap plates and a collider. */
export function column(kit, x, z, y0, y1, w = 0.5, { color = IMP.plateDark, collide = true, hazard = false } = {}) {
  kit.box("paintedMetal", x, (y0 + y1) / 2, z, w, y1 - y0, w, { color, texel: 1 });
  kit.box("paintedMetal", x, y0 + 0.15, z, w + 0.16, 0.3, w + 0.16, { color: IMP.black, texel: 1 });
  kit.box("paintedMetal", x, y1 - 0.15, z, w + 0.16, 0.3, w + 0.16, { color: IMP.black, texel: 1 });
  if (hazard) kit.box("hazard", x, y0 + 1.0, z, w + 0.02, 0.5, w + 0.02, { texel: 2 });
  if (collide) kit.collider([x - w / 2, y0, z - w / 2], [x + w / 2, y1, z + w / 2], "column");
}

/** Box beam between two world points (any direction). */
export function beam(kit, from, to, size = 0.3, { color = IMP.plateDark, mat = "paintedMetal", h = null } = {}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const d = new THREE.Vector3().subVectors(b, a);
  const L = d.length();
  if (L < 1e-4) return;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
  kit.add(mat, new THREE.BoxGeometry(size, h || size, L), { pos: [mid.x, mid.y, mid.z], quat: q, color, texel: 1 });
}

/**
 * Grated catwalk deck between (x0,z0) and (x1,z1) with its top surface at y. rails: which sides get a railing
 * ('xmin','xmax','zmin','zmax'); gaps: [{side, from, to}] left open (stair landings).
 */
export function catwalk(kit, [x0, z0], [x1, z1], y, { rails = ["xmin", "xmax", "zmin", "zmax"], gaps = [], thick = 0.28, grate = true, edge = IMP.black, tag = "catwalk" } = {}) {
  kit.boxMM("paintedMetal", [x0, y - thick, z0], [x1, y - 0.02, z1], { color: IMP.plateDark, texel: 1 });
  if (grate) floorGrate(kit, [x0 + 0.05, z0 + 0.05], [x1 - 0.05, z1 - 0.05], y);
  else kit.boxMM("plate", [x0, y - 0.03, z0], [x1, y, z1], { color: IMP.plateDark, texel: 1 });
  // edge channels
  kit.boxMM("paintedMetal", [x0 - 0.05, y - thick - 0.05, z0 - 0.05], [x1 + 0.05, y - thick + 0.1, z1 + 0.05], { color: edge, texel: 1 });
  kit.boxMM("paintedMetal", [x0 - 0.02, y - 0.02, z0 - 0.02], [x1 + 0.02, y + 0.03, z0 + 0.06], { color: edge });
  kit.boxMM("paintedMetal", [x0 - 0.02, y - 0.02, z1 - 0.06], [x1 + 0.02, y + 0.03, z1 + 0.02], { color: edge });
  kit.boxMM("paintedMetal", [x0 - 0.02, y - 0.02, z0], [x0 + 0.06, y + 0.03, z1], { color: edge });
  kit.boxMM("paintedMetal", [x1 - 0.06, y - 0.02, z0], [x1 + 0.02, y + 0.03, z1], { color: edge });
  kit.collider([x0, y - thick, z0], [x1, y, z1], tag);
  const seg = (side) => {
    const g = gaps.filter((q) => q.side === side);
    const [a, b] = side === "xmin" || side === "xmax" ? [z0, z1] : [x0, x1];
    let spans = [[a, b]];
    for (const q of g) {
      const next = [];
      for (const [s0, s1] of spans) {
        if (q.to <= s0 || q.from >= s1) next.push([s0, s1]);
        else {
          if (q.from > s0) next.push([s0, q.from]);
          if (q.to < s1) next.push([q.to, s1]);
        }
      }
      spans = next;
    }
    return spans.filter(([s0, s1]) => s1 - s0 > 0.3);
  };
  for (const side of rails) {
    for (const [s0, s1] of seg(side)) {
      if (side === "xmin") railing(kit, { from: [x0 + 0.1, s0], to: [x0 + 0.1, s1], y });
      else if (side === "xmax") railing(kit, { from: [x1 - 0.1, s0], to: [x1 - 0.1, s1], y });
      else if (side === "zmin") railing(kit, { from: [s0, z0 + 0.1], to: [s1, z0 + 0.1], y });
      else railing(kit, { from: [s0, z1 - 0.1], to: [s1, z1 - 0.1], y });
    }
  }
}

/**
 * Switchback stairs: two flights of rise/2 with a landing. pos = bottom leading edge centre of flight 1;
 * flight 1 climbs local −Z, the landing turns, flight 2 climbs back toward +Z beside flight 1 (offset +X).
 * Returns { top (world Vector3 at the top landing edge centre), landing: {min,max}, footprint }.
 */
export function stairSwitchback(kit, { pos, yaw = 0, rise, width = 2.2, landing = 2.6, gap = 0.3, stepH = 0.2 }) {
  const P = new Placer(kit, pos, yaw);
  const half = rise / 2;
  const n = Math.max(1, Math.round(half / stepH));
  const run = n * 0.3;
  const f1 = stairs(kit, { pos, yaw, width, rise: half, stepH });
  // landing spans both flights
  const lx0 = -width / 2,
    lx1 = width / 2 + gap + width;
  const lz0 = -run - landing,
    lz1 = -run;
  P.boxMM("paintedMetal", [lx0 - 0.05, half - 0.3, lz0 - 0.05], [lx1 + 0.05, half - 0.02, lz1 + 0.05], { color: IMP.plateDark, texel: 1 });
  P.boxMM("plate", [lx0, half - 0.03, lz0], [lx1, half, lz1], { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("hazard", (lx0 + lx1) / 2, half + 0.003, lz1 - 0.06, lx1 - lx0 - 0.2, 0.006, 0.1, { texel: 2 });
  P.collider([lx0, half - 0.3, lz0], [lx1, half, lz1], "landing");
  // landing rails: far side and the outer side of flight 2 start; flight 1 side is open where the flight lands
  const a = P.world(lx0, half, lz0);
  const b = P.world(lx1, half, lz0);
  railing(kit, { from: [a.x, a.z], to: [b.x, b.z], y: half });
  const c = P.world(lx0, half, lz1);
  railing(kit, { from: [a.x, a.z], to: [c.x, c.z], y: half });
  const d = P.world(lx1, half, lz1);
  railing(kit, { from: [b.x, b.z], to: [d.x, d.z], y: half });
  // close the gap between the two flights on the landing's inner edge
  const g0 = P.world(width / 2 - 0.05, half, lz1);
  const g1 = P.world(width / 2 + gap + 0.05, half, lz1);
  railing(kit, { from: [g0.x, g0.z], to: [g1.x, g1.z], y: half, posts: 2 });
  // flight 2 starts at the landing's inner edge and climbs back toward +Z
  const f2pos = P.world(width / 2 + gap + width / 2, half, lz0 + landing);
  const f2 = stairs(kit, { pos: [f2pos.x, f2pos.y, f2pos.z], yaw: yaw + Math.PI, width, rise: half, stepH });
  // support posts under the landing
  for (const [px, pz] of [[lx0 + 0.15, lz0 + 0.15], [lx1 - 0.15, lz0 + 0.15], [lx0 + 0.15, lz1 - 0.15], [lx1 - 0.15, lz1 - 0.15]]) {
    P.box("paintedMetal", px, half / 2 - 0.15, pz, 0.16, half - 0.3, 0.16, { color: IMP.black, texel: 1 });
  }
  void f1;
  return { top: f2.top, topYaw: yaw + Math.PI, footprint: { x0: lx0, x1: lx1, z0: lz0, z1: 0 }, half, run };
}

/**
 * Overhead gantry crane: two rails along Z on wall brackets, a bridge across X with a trolley and a hoist.
 * Static parts go to `kit`; if `bridgeKit` is given the bridge/trolley/hook are built there at z = 0 so the
 * caller can animate them along the rails.
 */
export function gantryCrane(kit, { x0, x1, z0, z1, y, bridgeZ = null, trolleyX = null, hookDrop = 3.5, bridgeKit = null, railW = 0.4 }) {
  // rails + brackets
  for (const x of [x0, x1]) {
    kit.boxMM("paintedMetal", [x - railW / 2, y - 0.6, z0], [x + railW / 2, y, z1], { color: IMP.plateDark, texel: 1 });
    kit.boxMM("metal", [x - 0.08, y, z0], [x + 0.08, y + 0.12, z1], { color: IMP.steelDark });
    kit.boxMM("hazard", [x - railW / 2 - 0.01, y - 0.55, z0], [x + railW / 2 + 0.01, y - 0.35, z1], { texel: 0.5 });
    const n = Math.max(2, Math.round((z1 - z0) / 6));
    for (let i = 0; i <= n; i++) {
      const z = z0 + ((z1 - z0) * i) / n;
      kit.box("paintedMetal", x, y - 1.2, z, railW + 0.3, 1.2, 0.5, { color: IMP.black, texel: 1 });
    }
  }
  const bz = bridgeZ === null ? (z0 + z1) / 2 : bridgeZ;
  const bk = bridgeKit || kit;
  const zz = bridgeKit ? 0 : bz;
  const tx = trolleyX === null ? (x0 + x1) / 2 : trolleyX;
  // bridge: two girders + end trucks
  for (const dz of [-0.7, 0.7]) bk.boxMM("paintedMetal", [x0 - 0.3, y + 0.12, zz + dz - 0.25], [x1 + 0.3, y + 1.1, zz + dz + 0.25], { color: IMP.hazardYellow, texel: 1 });
  bk.boxMM("paintedMetal", [x0 - 0.3, y + 0.12, zz - 1.0], [x1 + 0.3, y + 0.3, zz + 1.0], { color: IMP.black, texel: 1 });
  for (const x of [x0, x1]) bk.box("paintedMetal", x, y + 0.5, zz, railW + 0.6, 0.9, 2.4, { color: IMP.black, texel: 1 });
  // trolley + hoist drum + cable + hook block
  bk.box("paintedMetal", tx, y + 0.7, zz, 1.6, 1.0, 1.6, { color: IMP.plateDark, texel: 1 });
  bk.cyl("metal", tx, y + 0.9, zz, 0.3, 1.2, "x", { color: IMP.gunmetal, segments: 12 });
  bk.box("emitAmber", tx + 0.6, y + 0.7, zz + 0.81, 0.3, 0.08, 0.01);
  bk.cyl("metal", tx, y + 0.2 - hookDrop / 2, zz, 0.025, hookDrop, "y", { color: IMP.steel, segments: 6 });
  bk.box("paintedMetal", tx, y + 0.2 - hookDrop, zz, 0.5, 0.6, 0.35, { color: IMP.hazardYellow, texel: 1 });
  bk.add("metal", new THREE.TorusGeometry(0.22, 0.05, 8, 16, Math.PI * 1.5), { pos: [tx, y + 0.2 - hookDrop - 0.5, zz], rot: [0, 0, Math.PI * 0.75], color: IMP.steel });
  return { bridgeZ: bz };
}

// ---------------------------------------------------------------------------------------------------
// Cable trenches, machines, tanks, towers, valves, vents
// ---------------------------------------------------------------------------------------------------
/** Floor cable trench: dark channel with edge rails, cables inside, grating on top (a 4 cm proud channel). */
export function cableTrench(kit, [x0, z0], [x1, z1], y, { cables = 3, colors = [IMP.black, IMP.gunmetal, IMP.plateBlue], grate = true } = {}) {
  kit.boxMM("paintedMetal", [x0, y + 0.001, z0], [x1, y + 0.02, z1], { color: IMP.gloss, texel: 1 });
  const along = x1 - x0 >= z1 - z0 ? "x" : "z";
  kit.boxMM("metal", [x0, y + 0.02, z0], [along === "x" ? x1 : x0 + 0.06, y + 0.05, along === "x" ? z0 + 0.06 : z1], { color: IMP.steelDark });
  kit.boxMM("metal", [along === "x" ? x0 : x1 - 0.06, y + 0.02, along === "x" ? z1 - 0.06 : z0], [x1, y + 0.05, z1], { color: IMP.steelDark });
  const rand = rng(Math.floor(x0 * 3 + z0 * 7));
  for (let c = 0; c < cables; c++) {
    const t = (c + 0.5) / cables;
    const off = (rand() - 0.5) * 0.04;
    const pts = along === "x" ? [[x0, y + 0.03 + off, z0 + (z1 - z0) * t], [x1, y + 0.03 + off, z0 + (z1 - z0) * t]] : [[x0 + (x1 - x0) * t, y + 0.03 + off, z0], [x0 + (x1 - x0) * t, y + 0.03 + off, z1]];
    pipeRun(kit, { points: pts, r: 0.025 + rand() * 0.02, color: colors[c % colors.length], mat: "rubber" });
  }
  if (grate) floorGrate(kit, [x0, z0], [x1, z1], y + 0.055);
}

/**
 * Generic boxy Imperial machine (processor, pump skid, converter): plated body, black skirt and cap, front
 * control face with LEDs / screen, vent slats on one side, hazard band, indicator lamp. Faces local −Z.
 */
export function machineBlock(kit, { pos, yaw = 0, size = [3, 2.4, 1.6], color = IMP.plateDark, accent = "emitCyan", seed = 1, hazard = true, vents = true, screen = true, stencil = null, collide = true }) {
  const [w, h, d] = size;
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, 0.12, 0, w + 0.1, 0.24, d + 0.1, { color: IMP.black, texel: 1 });
  P.box("plate", 0, h / 2 + 0.1, 0, w, h - 0.3, d, { color, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, h - 0.06, 0, w + 0.08, 0.14, d + 0.08, { color: IMP.trim, texel: 1 });
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box("paintedMetal", (sx * w) / 2, h / 2, (sz * d) / 2, 0.1, h - 0.2, 0.1, { color: IMP.black });
  if (hazard) P.box("hazard", 0, 0.42, 0, w + 0.02, 0.14, d + 0.02, { texel: 3 });
  // front control face
  const fw = Math.min(w - 0.5, 1.6);
  const fh = Math.min(h * 0.4, 1.0);
  const fy = h * 0.6;
  P.box("darkGloss", 0, fy, -d / 2 - 0.02, fw + 0.1, fh + 0.1, 0.04);
  if (screen) P.box("screen", 0, fy + fh * 0.15, -d / 2 - 0.045, fw - 0.2, fh * 0.5, 0.01, { uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
  P.box("leds", 0, fy - fh * 0.35, -d / 2 - 0.045, fw - 0.2, 0.08, 0.01, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  P.box(rand() < 0.5 ? accent : "emitRed", fw / 2 - 0.08, fy + fh / 2 - 0.08, -d / 2 - 0.05, 0.06, 0.06, 0.01);
  P.box(accent, 0, h - 0.06, -d / 2 - 0.05, w * 0.5, 0.03, 0.01);
  // vent slats on the +X side
  if (vents) {
    const vh = h * 0.45;
    P.box("paintedMetal", w / 2 + 0.01, h * 0.55, 0, 0.04, vh, d * 0.6, { color: IMP.black, texel: 1 });
    const n = Math.max(3, Math.floor(vh / 0.14));
    for (let i = 0; i < n; i++) P.box("metal", w / 2 + 0.04, h * 0.55 - vh / 2 + 0.07 + (i * (vh - 0.14)) / (n - 1), 0, 0.04, 0.03, d * 0.56, { color: IMP.steelDark, rot: [0, 0, 0.5] });
  }
  if (stencil !== null) P.decal(-w / 2 - 0.01, h * 0.55, 0, Math.min(d, h) * 0.5, Math.min(d, h) * 0.5, stencil, { rot: [0, -Math.PI / 2, 0] });
  // access hatch on the back
  P.box("paintedMetal", 0, h * 0.45, d / 2 + 0.01, w * 0.5, h * 0.5, 0.02, { color: IMP.black, texel: 1 });
  P.box("plate", 0, h * 0.45, d / 2 + 0.02, w * 0.46, h * 0.46, 0.02, { color: IMP.plateDark, uv: "keep" });
  if (collide) P.collider([-w / 2 - 0.05, 0, -d / 2 - 0.05], [w / 2 + 0.05, h, d / 2 + 0.05], "machine");
  return P;
}

/** Vertical storage tank: cylinder on a skirt with a domed cap, bands, ladder, level gauge and top valve. */
export function tank(kit, { pos, r = 2.2, h = 6, color = IMP.plate, accent = "emitGreen", gauge = true, ladder = true, seed = 1, collide = true }) {
  const [x, y, z] = pos;
  const rand = rng(seed);
  kit.cyl("paintedMetal", x, y + 0.2, z, r + 0.15, 0.4, "y", { color: IMP.black, segments: 32 });
  kit.cyl("plate", x, y + h / 2, z, r, h - 0.4, "y", { color, segments: 32, texel: 0.5 });
  kit.add("plate", new THREE.SphereGeometry(r, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + h - 0.2, z], scale: [1, 0.35, 1], color, uv: "scale", uvScale: [6, 2] });
  for (const by of [0.3, 0.55, 0.8]) kit.cyl("paintedMetal", x, y + h * by, z, r + 0.04, 0.16, "y", { color: IMP.black, segments: 32 });
  kit.cyl("paintedMetal", x, y + h * 0.42, z, r + 0.03, 0.25, "y", { color: IMP.hazardYellow, segments: 32 });
  // top valve + pipe stub
  kit.cyl("metal", x, y + h + 0.3, z, 0.25, 0.8, "y", { color: IMP.gunmetal, segments: 12 });
  kit.add("metal", new THREE.TorusGeometry(0.35, 0.04, 8, 20), { pos: [x, y + h + 0.75, z], rot: [Math.PI / 2, 0, 0], color: IMP.steel });
  if (gauge) {
    const gx = x - r - 0.06;
    kit.box("darkGloss", gx, y + h / 2, z, 0.08, h - 1.2, 0.36);
    const segs = 8;
    const fill = 0.3 + rand() * 0.6;
    for (let i = 0; i < segs; i++) {
      const gy = y + 0.9 + ((h - 1.8) * (i + 0.5)) / segs;
      kit.box(i / segs < fill ? accent : "paintedMetal", gx - 0.045, gy, z, 0.01, (h - 1.8) / segs - 0.06, 0.22, { color: IMP.darkMetal, uv: "keep" });
    }
    kit.box("paintedMetal", gx - 0.02, y + h / 2, z, 0.14, h - 1.1, 0.06, { color: IMP.black });
  }
  if (ladder) {
    const lz = z + r + 0.2;
    for (const s of [-0.25, 0.25]) kit.box("metal", x + s, y + h / 2 + 0.3, lz, 0.05, h - 0.2, 0.05, { color: IMP.steelDark });
    const n = Math.floor((h - 0.6) / 0.32);
    for (let i = 0; i < n; i++) kit.box("metal", x, y + 0.5 + i * 0.32, lz, 0.5, 0.03, 0.03, { color: IMP.steel });
    kit.box("paintedMetal", x, y + h - 0.4, lz - 0.15, 0.7, 0.05, 0.3, { color: IMP.black });
  }
  new Placer(kit, [x, y, z], 0).decal(0, h * 0.62, -r - 0.01, r * 0.5, r * 0.5, DECAL.SPEC_PLATE, { rot: [0, Math.PI, 0] });
  if (collide) kit.collider([x - r - 0.15, y, z - r - 0.3], [x + r + 0.15, y + h, z + r + 0.3], "tank");
}

/** Air scrubber tower: tall cylinder with louvred bands, top cowl, status light column and a base manifold. */
export function scrubberTower(kit, { pos, r = 1.4, h = 8, accent = "emitGreen", seed = 1, collide = true }) {
  const [x, y, z] = pos;
  const rand = rng(seed);
  kit.cyl("paintedMetal", x, y + 0.25, z, r + 0.25, 0.5, "y", { color: IMP.black, segments: 24 });
  kit.cyl("plate", x, y + h / 2, z, r, h - 0.5, "y", { color: IMP.plateDark, segments: 24, texel: 0.6 });
  kit.cyl("paintedMetal", x, y + h + 0.3, z, r * 0.7, 0.6, "y", { color: IMP.black, segments: 24, r2: r * 0.45 });
  kit.cyl("metal", x, y + h + 0.9, z, 0.35, 0.6, "y", { color: IMP.gunmetal, segments: 12 });
  // louvred bands: rings of tilted slats
  const bands = 3;
  for (let b = 0; b < bands; b++) {
    const by = y + 1.6 + b * ((h - 3.2) / (bands - 1));
    kit.cyl("paintedMetal", x, by, z, r + 0.08, 1.2, "y", { color: IMP.black, segments: 24 });
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * (r + 0.12);
      const pz = z + Math.sin(a) * (r + 0.12);
      for (let s = 0; s < 4; s++) {
        kit.box("metal", px, by - 0.4 + s * 0.27, pz, 0.06, 0.03, (2 * Math.PI * (r + 0.12)) / n - 0.06, { color: IMP.steelDark, rot: [0, -a, 0.5] });
      }
    }
    kit.cyl("paintedMetal", x, by + 0.62, z, r + 0.1, 0.08, "y", { color: IMP.trim, segments: 24 });
    kit.cyl("paintedMetal", x, by - 0.62, z, r + 0.1, 0.08, "y", { color: IMP.trim, segments: 24 });
  }
  // status light column on the front (-Z)
  const fz = z - r - 0.03;
  kit.box("darkGloss", x, y + h * 0.5, fz, 0.3, h * 0.5, 0.06);
  const n = 6;
  for (let i = 0; i < n; i++) kit.box(rand() < 0.8 ? accent : "emitAmber", x, y + h * 0.28 + (i * h * 0.44) / (n - 1), fz - 0.035, 0.16, 0.08, 0.01);
  kit.box("leds", x, y + h * 0.2, fz - 0.035, 0.26, 0.1, 0.01, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  new Placer(kit, [x, y, z], 0).decal(0, 1.1, -r - 0.02, 0.6, 0.6, DECAL.TEXT_B, { rot: [0, Math.PI, 0] });
  // base manifold + hazard
  kit.cyl("paintedMetal", x, y + 0.75, z, r + 0.02, 0.12, "y", { color: IMP.hazardYellow, segments: 24 });
  if (collide) kit.collider([x - r - 0.25, y, z - r - 0.25], [x + r + 0.25, y + h, z + r + 0.25], "scrubber");
}

/** Valve stack: vertical pipe with n branch valves (bodies + handwheels), facing local −Z. */
export function valveStack(kit, { pos, yaw = 0, n = 3, r = 0.12, h = 2.4, color = IMP.steelDark, wheel = IMP.red }) {
  const P = new Placer(kit, pos, yaw);
  P.cyl("metal", 0, h / 2, 0, r, h, "y", { color, segments: 12 });
  P.box("paintedMetal", 0, 0.08, 0, r * 4, 0.16, r * 4, { color: IMP.black });
  for (let i = 0; i < n; i++) {
    const y = 0.5 + (i * (h - 1.0)) / Math.max(1, n - 1);
    P.cyl("metal", 0, y, -r - 0.25, r * 0.8, 0.5, "z", { color, segments: 10 });
    P.box("paintedMetal", 0, y, -r - 0.3, r * 2.4, r * 2.4, 0.3, { color: IMP.gunmetal, texel: 2 });
    P.cyl("metal", 0, y + r * 1.2 + 0.15, -r - 0.3, 0.03, 0.3, "y", { color, segments: 6 });
    P.add("metal", new THREE.TorusGeometry(0.16, 0.025, 6, 16), 0, y + r * 1.2 + 0.32, -r - 0.3, { rot: [Math.PI / 2, 0, 0], color: wheel });
    P.box("paintedMetal", 0, y, -r - 0.5, r * 1.4, 0.05, 0.04, { color: IMP.black });
  }
  P.collider([-r * 2, 0, -r - 0.6], [r * 2, h, r * 2], "valves");
}

/** Wall vent: black housing with tilted slats; faces local −Z; pos = bottom centre. */
export function louvreVent(kit, { pos, yaw = 0, w = 2, h = 1.2, depth = 0.25, slats = null, frame = true }) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, h / 2, depth / 2, w, h, depth, { color: IMP.black, texel: 1 });
  if (frame) P.box("paintedMetal", 0, h / 2, -0.02, w + 0.12, h + 0.12, 0.06, { color: IMP.plateDark, texel: 1 });
  const n = slats || Math.max(3, Math.floor(h / 0.16));
  for (let i = 0; i < n; i++) P.box("metal", 0, 0.1 + (i * (h - 0.2)) / (n - 1), -0.03, w - 0.16, 0.035, 0.12, { color: IMP.steelDark, rot: [0.55, 0, 0] });
  P.box("paintedMetal", 0, h / 2, -0.04, 0.06, h - 0.1, 0.06, { color: IMP.plateDark });
}

/** Round duct fan: housing ring + hub + blades (blades built in `bladeKit` if given for animation). */
export function fanUnit(kit, { pos, yaw = 0, r = 0.9, bladeKit = null }) {
  const P = new Placer(kit, pos, yaw);
  P.cyl("paintedMetal", 0, 0, 0, r + 0.12, 0.35, "z", { color: IMP.black, segments: 24, r2: r + 0.12 });
  P.add("paintedMetal", new THREE.TorusGeometry(r + 0.05, 0.05, 6, 32), 0, 0, -0.16, { color: IMP.steelDark });
  for (let i = 0; i < 4; i++) P.box("metal", 0, 0, -0.14, r * 2, 0.03, 0.02, { color: IMP.steelDark, rot: [0, 0, (i * Math.PI) / 4] });
  const bk = bladeKit || kit;
  const B = bladeKit ? new Placer(bladeKit, [0, 0, 0], 0) : P;
  B.cyl("paintedMetal", 0, 0, 0, r * 0.22, 0.3, "z", { color: IMP.plateDark, segments: 12 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    B.box("paintedMetal", Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0, r * 0.7, 0.24, 0.03, { color: IMP.plateDark, rot: [0, 0, a], texel: 1 });
  }
  void bk;
}

// ---------------------------------------------------------------------------------------------------
// Furniture: benches, racks, kiosks, alcoves
// ---------------------------------------------------------------------------------------------------
/** Workbench with drawers, a steel top and scattered tools; faces local −Z (worker stands at −Z). */
export function workbench(kit, { pos, yaw = 0, w = 3, d = 0.9, h = 0.95, seed = 1, accent = "emitCyan", lamp = true, collide = true }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, h - 0.03, 0, w, 0.06, d, { color: IMP.black, texel: 1 });
  P.box("metal", 0, h + 0.005, 0, w - 0.04, 0.02, d - 0.04, { color: IMP.steelDark, texel: 1 });
  P.box("plate", 0, h * 0.5, 0.08, w - 0.3, h - 0.25, d - 0.3, { color: IMP.plateDark, uv: "world", texel: 1 });
  for (const sx of [-1, 1]) P.box("paintedMetal", sx * (w / 2 - 0.06), h / 2, 0, 0.1, h - 0.06, d - 0.05, { color: IMP.gunmetal, texel: 1 });
  // drawers on the front
  const cols = Math.max(1, Math.floor((w - 0.4) / 0.7));
  for (let c = 0; c < cols; c++) {
    const x = -(w - 0.4) / 2 + 0.35 + c * 0.7;
    for (let r = 0; r < 2; r++) {
      P.box("paintedMetal", x, 0.35 + r * 0.3, -d / 2 + 0.16, 0.6, 0.24, 0.02, { color: IMP.black });
      P.box("metal", x, 0.35 + r * 0.3, -d / 2 + 0.14, 0.3, 0.03, 0.03, { color: IMP.steel });
    }
  }
  // tools on top
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const x = -(w / 2 - 0.3) + rand() * (w - 0.6);
    const z = -(d / 2 - 0.2) + rand() * (d - 0.4);
    const k = rand();
    if (k < 0.4) P.box("paintedMetal", x, h + 0.06, z, 0.12 + rand() * 0.3, 0.1, 0.1 + rand() * 0.15, { color: [IMP.gunmetal, IMP.black, IMP.hazardYellow][Math.floor(rand() * 3)], rot: [0, rand() * 1.5, 0] });
    else if (k < 0.7) P.cyl("metal", x, h + 0.02, z, 0.02 + rand() * 0.03, 0.2 + rand() * 0.3, "x", { color: IMP.steel, segments: 8, rot: [0, rand() * 3, 0] });
    else P.cyl("paintedMetal", x, h + 0.09, z, 0.06 + rand() * 0.06, 0.16, "y", { color: [IMP.red, IMP.plateBlue, IMP.gunmetal][Math.floor(rand() * 3)], segments: 10 });
  }
  // back rail with a small panel
  P.box("paintedMetal", 0, h + 0.25, d / 2 - 0.03, w, 0.5, 0.05, { color: IMP.plateDark, texel: 1 });
  P.box("leds", -w * 0.25, h + 0.25, d / 2 - 0.06, w * 0.35, 0.08, 0.01, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  P.box(accent, w * 0.3, h + 0.35, d / 2 - 0.06, 0.4, 0.03, 0.01);
  if (lamp) {
    P.box("metal", w * 0.35, h + 0.9, d / 2 - 0.05, 0.05, 1.3, 0.05, { color: IMP.steelDark });
    P.box("paintedMetal", w * 0.1, h + 1.5, 0, w * 0.6, 0.08, 0.2, { color: IMP.black });
    P.box("emitWhiteSoft", w * 0.1, h + 1.45, 0, w * 0.55, 0.01, 0.12, { uv: "keep" });
  }
  if (collide) P.collider([-w / 2, 0, -d / 2], [w / 2, h + 0.1, d / 2], "bench");
  return P;
}

/** Wall tool board: hooks with tools (wrenches, cutters, power packs) — pos = floor point at the wall, faces −Z. */
export function toolRack(kit, { pos, yaw = 0, w = 2.4, h = 1.6, base = 1.0, seed = 1 }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  P.box("paintedMetal", 0, base + h / 2, 0.06, w, h, 0.08, { color: IMP.black, texel: 1 });
  P.box("plate", 0, base + h / 2, 0.02, w - 0.1, h - 0.1, 0.03, { color: IMP.plateDark, uv: "keep" });
  const n = Math.floor(w / 0.3);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.2 + i * ((w - 0.4) / Math.max(1, n - 1));
    const k = rand();
    const y = base + h - 0.25 - rand() * 0.2;
    P.box("metal", x, y, -0.03, 0.03, 0.03, 0.08, { color: IMP.steel });
    if (k < 0.35) {
      P.box("metal", x, y - 0.25, -0.06, 0.05, 0.5, 0.03, { color: IMP.steel });
      P.box("metal", x, y - 0.5, -0.06, 0.12, 0.08, 0.03, { color: IMP.steel });
    } else if (k < 0.65) {
      P.cyl("paintedMetal", x, y - 0.22, -0.07, 0.04, 0.4, "y", { color: IMP.gunmetal, segments: 8 });
      P.box(rand() < 0.5 ? "emitRed" : "emitGreen", x, y - 0.1, -0.115, 0.03, 0.03, 0.01);
    } else if (k < 0.85) {
      P.box("paintedMetal", x, y - 0.18, -0.07, 0.16, 0.3, 0.08, { color: IMP.hazardYellow, texel: 2 });
      P.box("paintedMetal", x, y - 0.18, -0.115, 0.1, 0.08, 0.01, { color: IMP.black });
    } else {
      P.box("rubber", x, y - 0.3, -0.06, 0.08, 0.5, 0.05, { color: IMP.black });
    }
  }
  P.box("leds", 0, base + 0.12, -0.01, w * 0.5, 0.07, 0.01, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  P.collider([-w / 2, 0, -0.15], [w / 2, base + h, 0.12], "toolrack");
}

/** Storage shelving with instanced part bins on each level; faces −Z; pos = floor centre of the front edge. */
export function shelving(kit, { pos, yaw = 0, w = 3.6, d = 0.8, h = 2.6, levels = 3, seed = 1, fill = 0.75, collide = true }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box("paintedMetal", (sx * (w - 0.08)) / 2, h / 2, (sz * (d - 0.08)) / 2, 0.08, h, 0.08, { color: IMP.gunmetal, texel: 1 });
  for (let l = 0; l <= levels; l++) {
    const y = 0.15 + (l * (h - 0.3)) / levels;
    P.box("paintedMetal", 0, y, 0, w, 0.05, d, { color: IMP.plateDark, texel: 1 });
    P.box("paintedMetal", 0, y - 0.05, -d / 2 + 0.03, w, 0.08, 0.04, { color: IMP.black });
    if (l < levels) {
      const cell = (h - 0.3) / levels;
      let x = -w / 2 + 0.15;
      while (x < w / 2 - 0.4) {
        const bw = 0.35 + rand() * 0.4;
        if (rand() < fill) {
          const bh = Math.min(cell - 0.15, 0.3 + rand() * 0.4);
          const k = rand();
          if (k < 0.6) placeCrate(kit, P.world(x + bw / 2, y + 0.025, 0).toArray(), yaw, { size: [bw - 0.06, bh, d - 0.2], color: [IMP.plateDark, IMP.gunmetal, IMP.plateBlue][Math.floor(rand() * 3)], band: rand() < 0.3, collide: false });
          else P.cyl("plate", x + bw / 2, y + 0.025 + bh / 2, 0, Math.min(bw, d) * 0.4, bh, "y", { color: rand() < 0.5 ? IMP.plateDark : IMP.hazardYellow, segments: 12 });
        }
        x += bw + 0.08;
      }
    }
  }
  P.decal(-w / 2 + 0.4, h - 0.35, -d / 2 - 0.05, 0.4, 0.4, DECAL.NUMBER0 + (seed % 4));
  if (collide) P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "shelf");
}

/** Standing terminal kiosk: pedestal with an angled screen; faces −Z (operator at −Z). */
export function terminalKiosk(kit, { pos, yaw = 0, accent = "emitAmber", index = 15, collide = true }) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.05, 0, 0.7, 0.1, 0.6, { color: IMP.black, texel: 1 });
  P.box("plate", 0, 0.55, 0.05, 0.5, 0.9, 0.4, { color: IMP.plateDark, uv: "keep" });
  P.box("paintedMetal", 0, 1.1, -0.05, 0.9, 0.5, 0.5, { color: IMP.black, texel: 1, rot: [-0.5, 0, 0] });
  P.box("darkGloss", 0, 1.15, -0.28, 0.8, 0.44, 0.02, { rot: [-0.5, 0, 0] });
  P.box("screen", 0, 1.15, -0.29, 0.72, 0.36, 0.01, { rot: [-0.5, 0, 0], uv: "keep", uvRect: screenRect(index) });
  P.box("leds", 0, 0.9, -0.2, 0.4, 0.06, 0.01, { uv: "keep", uvRect: ledRect(index % 16) });
  P.box(accent, 0.3, 1.3, -0.22, 0.05, 0.05, 0.01, { rot: [-0.5, 0, 0] });
  if (collide) P.collider([-0.45, 0, -0.35], [0.45, 1.4, 0.3], "kiosk");
}

/**
 * Droid maintenance alcove: recessed bay with side walls, back panel with LED status matrix, charging plate
 * on the floor and an indicator lamp. Faces −Z; pos = floor centre of the open front. No droid.
 */
export function droidAlcove(kit, { pos, yaw = 0, w = 2.2, h = 2.8, d = 1.6, accent = "emitCyan", seed = 1, occupiedLight = false }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  for (const s of [-1, 1]) {
    P.box("plate", s * (w / 2 + 0.15), h / 2, d / 2, 0.3, h, d, { color: IMP.plateDark, uv: "world", texel: 1 });
    P.box("paintedMetal", s * (w / 2 + 0.15), h / 2, -0.02, 0.36, h + 0.1, 0.1, { color: IMP.black, texel: 1 });
    P.collider([s * (w / 2 + 0.15) - 0.18, 0, 0], [s * (w / 2 + 0.15) + 0.18, h, d], "alcove");
  }
  P.box("paintedMetal", 0, h + 0.2, d / 2, w + 0.6, 0.4, d, { color: IMP.black, texel: 1 });
  P.box("hazard", 0, h + 0.2, -0.01, w + 0.3, 0.2, 0.02, { texel: 2 });
  P.box("plate", 0, h / 2, d - 0.1, w, h, 0.2, { color: IMP.black, uv: "world", texel: 1 });
  P.collider([-w / 2, 0, d - 0.25], [w / 2, h, d], "alcove");
  // back panel: LED matrix + power coupling
  P.box("darkGloss", 0, h * 0.6, d - 0.21, w - 0.4, h * 0.45, 0.03);
  for (let r = 0; r < 3; r++) P.box("leds", 0, h * 0.5 + r * 0.24, d - 0.23, w - 0.6, 0.1, 0.01, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
  P.cyl("metal", 0, h * 0.28, d - 0.35, 0.18, 0.3, "z", { color: IMP.gunmetal, segments: 12 });
  P.add("metal", new THREE.TorusGeometry(0.2, 0.03, 6, 16), 0, h * 0.28, d - 0.5, { color: IMP.steel });
  P.box(accent, 0, h * 0.28, d - 0.51, 0.1, 0.1, 0.01);
  // charging plate + hazard rim
  P.box("paintedMetal", 0, 0.03, d / 2, w - 0.3, 0.06, d - 0.4, { color: IMP.black, texel: 1 });
  P.box("hazard", 0, 0.068, d / 2, w - 0.35, 0.006, d - 0.45, { texel: 2 });
  P.box(occupiedLight ? "emitRed" : accent, 0, 0.09, d / 2, w * 0.3, 0.005, 0.15);
  // strip light under the lintel
  P.box("emitWhiteSoft", 0, h - 0.06, d * 0.5, w - 0.6, 0.02, 0.15, { uv: "keep" });
  // cables from the back panel to the coupling
  pipeRun(kit, { points: [P.world(-w * 0.3, h * 0.35, d - 0.25).toArray(), P.world(-w * 0.1, h * 0.3, d - 0.5).toArray(), P.world(0, h * 0.28, d - 0.6).toArray()], r: 0.025, color: IMP.black, mat: "rubber" });
  P.decal(-w / 2 - 0.15, h * 0.75, -0.08, 0.4, 0.4, DECAL.NUMBER0 + (seed % 4));
}

// ---------------------------------------------------------------------------------------------------
// Door side fix-up + throats (passages between a room wall and a door plane that sits beyond it)
// ---------------------------------------------------------------------------------------------------
/**
 * Work-around for RoomManager.doorsOf: it matches a door to a room wall by exact plane equality, so doors
 * that sit on the neighbour's wall line (hangar arches at x ±40 vs. the support rooms at ±44, the shuttle
 * blast door at z 70 vs. z 72, the reactor airlock at z 300 vs. 304) land on the *opposite* wall. Re-assign
 * every door of this room to its nearest wall before `ctx.shell()` carves the openings.
 */
export function fixDoorSides(ctx) {
  const { x0, x1, z0, z1 } = ctx.inner;
  const b = ctx.box;
  for (const d of ctx.doors) {
    const spec = d.door;
    if (!spec || spec.axis === undefined) continue;
    if (spec.axis === "z") {
      const side = Math.abs(spec.at - b.z0) <= Math.abs(spec.at - b.z1) ? "zmin" : "zmax";
      if (side === d.side) continue;
      d.side = side;
      if (side === "zmin") [d.u0, d.u1] = [spec.from - x0, spec.to - x0];
      else [d.u0, d.u1] = [x1 - spec.to, x1 - spec.from];
    } else {
      const side = Math.abs(spec.at - b.x0) <= Math.abs(spec.at - b.x1) ? "xmin" : "xmax";
      if (side === d.side) continue;
      d.side = side;
      if (side === "xmin") [d.u0, d.u1] = [z1 - spec.to, z1 - spec.from];
      else [d.u0, d.u1] = [spec.from - z0, spec.to - z0];
    }
  }
}

/**
 * Some doors in the layout sit on the neighbour's wall line, several metres beyond this room's own wall
 * (hangar arches at x ±40 vs. the support rooms at ±44; the shuttle blast door at z 70 vs. z 72). Line that
 * gap with a floor, ceiling and side walls so the passage is walkable and reads as a heavy bulkhead throat.
 * Returns the throat box or null when the door is flush with the wall.
 */
export function doorThroat(ctx, doorId, { accent = "emitAmber", hazard = true, lightStrip = true, floorMat = "deckGrey" } = {}) {
  const d = ctx.doors.find((q) => q.door.id === doorId);
  if (!d) return null;
  const { axis, at, from, to, h } = d.door;
  const kit = ctx.kit;
  const y = ctx.floor + (d.v0 || 0);
  const { x0, x1, z0, z1 } = ctx.inner;
  const half = 0.25; // door frame half depth (WALL_T / 2)
  let a, b;
  if (d.side === "xmax") [a, b] = [x1, at - half];
  else if (d.side === "xmin") [a, b] = [at + half, x0];
  else if (d.side === "zmax") [a, b] = [z1, at - half];
  else [a, b] = [at + half, z0];
  if (b - a < 0.3) return null;
  const T = 0.3;
  const lo = axis === "x" ? [a, from] : [from, a];
  const hi = axis === "x" ? [b, to] : [to, b];
  const box = { x0: lo[0], x1: hi[0], z0: lo[1], z1: hi[1] };
  // floor + ceiling
  kit.boxMM(floorMat, [box.x0, y - 0.3, box.z0], [box.x1, y, box.z1], { color: IMP.plateDark, texel: 0.5 });
  kit.collider([box.x0 - 0.1, y - 0.6, box.z0 - 0.1], [box.x1 + 0.1, y, box.z1 + 0.1], "throat-floor");
  kit.boxMM("paintedMetal", [box.x0 - (axis === "x" ? 0 : T), y + h, box.z0 - (axis === "x" ? T : 0)], [box.x1 + (axis === "x" ? 0 : T), y + h + T, box.z1 + (axis === "x" ? T : 0)], { color: IMP.black, texel: 1 });
  // side walls (perpendicular to the span), with a hazard band and a light strip line
  const sides = axis === "x" ? [[box.x0, box.z0 - T, box.x1, box.z0], [box.x0, box.z1, box.x1, box.z1 + T]] : [[box.x0 - T, box.z0, box.x0, box.z1], [box.x1, box.z0, box.x1 + T, box.z1]];
  sides.forEach(([sx0, sz0, sx1, sz1], i) => {
    kit.boxMM("plate", [sx0, y, sz0], [sx1, y + h, sz1], { color: IMP.plateDark, texel: 0.6 });
    kit.collider([sx0, y, sz0], [sx1, y + h, sz1], "throat-wall");
    if (hazard) {
      // band on the face looking into the passage (i = 0 is the low-coordinate wall)
      if (axis === "x") kit.boxMM("hazard", [sx0 + 0.2, y + 0.9, i === 0 ? sz1 : sz0 - 0.02], [sx1 - 0.2, y + 1.3, i === 0 ? sz1 + 0.02 : sz0], { texel: 1 });
      else kit.boxMM("hazard", [i === 0 ? sx1 : sx0 - 0.02, y + 0.9, sz0 + 0.2], [i === 0 ? sx1 + 0.02 : sx0, y + 1.3, sz1 - 0.2], { texel: 1 });
    }
    // dark structural ribs
    const n = Math.max(1, Math.round((axis === "x" ? sx1 - sx0 : sz1 - sz0) / 2));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (axis === "x") kit.box("paintedMetal", sx0 + (sx1 - sx0) * t, y + h / 2, i === 0 ? sz1 + 0.08 : sz0 - 0.08, 0.3, h, 0.16, { color: IMP.black, texel: 1 });
      else kit.box("paintedMetal", i === 0 ? sx1 + 0.08 : sx0 - 0.08, y + h / 2, sz0 + (sz1 - sz0) * t, 0.16, h, 0.3, { color: IMP.black, texel: 1 });
    }
  });
  if (lightStrip) {
    const cx = (box.x0 + box.x1) / 2;
    const cz = (box.z0 + box.z1) / 2;
    if (axis === "x") {
      kit.boxMM("paintedMetal", [box.x0, y + h - 0.2, cz - 0.4], [box.x1, y + h, cz + 0.4], { color: IMP.black, texel: 1 });
      kit.boxMM("emitWhiteSoft", [box.x0 + 0.1, y + h - 0.22, cz - 0.25], [box.x1 - 0.1, y + h - 0.2, cz + 0.25], { uv: "keep" });
      kit.boxMM(accent, [box.x0 + 0.1, y + 0.004, box.z0 + 0.1], [box.x1 - 0.1, y + 0.012, box.z0 + 0.18], { uv: "keep" });
      kit.boxMM(accent, [box.x0 + 0.1, y + 0.004, box.z1 - 0.18], [box.x1 - 0.1, y + 0.012, box.z1 - 0.1], { uv: "keep" });
    } else {
      kit.boxMM("paintedMetal", [cx - 0.4, y + h - 0.2, box.z0], [cx + 0.4, y + h, box.z1], { color: IMP.black, texel: 1 });
      kit.boxMM("emitWhiteSoft", [cx - 0.25, y + h - 0.22, box.z0 + 0.1], [cx + 0.25, y + h - 0.2, box.z1 - 0.1], { uv: "keep" });
      kit.boxMM(accent, [box.x0 + 0.1, y + 0.004, box.z0 + 0.1], [box.x0 + 0.18, y + 0.012, box.z1 - 0.1], { uv: "keep" });
      kit.boxMM(accent, [box.x1 - 0.18, y + 0.004, box.z0 + 0.1], [box.x1 - 0.1, y + 0.012, box.z1 - 0.1], { uv: "keep" });
    }
  }
  return box;
}

// ---------------------------------------------------------------------------------------------------
// Walls with windows
// ---------------------------------------------------------------------------------------------------
/** Wall-U coordinate of a world x (for z walls) or z (for x walls) on a room wall side. */
export function wallU(ctx, side, c) {
  const { x0, x1, z0, z1 } = ctx.inner;
  if (side === "zmin") return c - x0;
  if (side === "zmax") return x1 - c;
  if (side === "xmin") return z1 - c;
  return c - z0;
}

/**
 * Build one wall of the room with extra openings (windows given in world coordinates: {c0, c1, v0, v1}).
 * `extraDoors` are door openings in world coordinates the layout did not deliver to this side.
 */
export function windowWall(ctx, side, windows = [], { extraDoors = [], seed = 5, panelGridOpts = {} } = {}) {
  const { frame, length, height, openings } = ctx.wall(side);
  const ops = [...openings];
  for (const d of extraDoors) {
    const a = wallU(ctx, side, d.c0);
    const b = wallU(ctx, side, d.c1);
    const u0 = Math.min(a, b),
      u1 = Math.max(a, b);
    // skip if the layout already delivered this opening (once the core matches doors to the nearest wall)
    if (ops.some((o) => o.type === "door" && Math.abs(o.u0 - u0) < 0.2 && Math.abs(o.u1 - u1) < 0.2)) continue;
    ops.push({ type: "door", u0, u1, v0: d.v0 || 0, v1: d.v1 });
  }
  for (const w of windows) {
    const a = wallU(ctx, side, w.c0);
    const b = wallU(ctx, side, w.c1);
    ops.push({ type: "window", u0: Math.min(a, b), u1: Math.max(a, b), v0: w.v0, v1: w.v1 });
  }
  const acc = ctx.accent.key === IMP.cyan ? "emitCyan" : ctx.accent.key === IMP.amber ? "emitAmber" : ctx.accent.key === IMP.violet ? "emitViolet" : ctx.accent.key === IMP.green ? "emitGreen" : "emitBlue";
  panelGrid(frame, length, height, { openings: ops, seed, tag: ctx.id + ":" + side, accent: acc, ...panelGridOpts });
  return { frame, length, height, openings: ops };
}

/** Heavy angular window surround (mullions + sill) drawn on a wall frame around a window rect. */
export function windowSurround(frame, u0, u1, v0, v1, { mullions = 3, color = IMP.black } = {}) {
  const cu = (u0 + u1) / 2;
  frame.box("paintedMetal", cu, v0 - 0.12, 0.06, u1 - u0 + 0.6, 0.24, 0.12, { color, texel: 1 });
  frame.box("paintedMetal", cu, v1 + 0.12, 0.06, u1 - u0 + 0.6, 0.24, 0.12, { color, texel: 1 });
  frame.box("paintedMetal", u0 - 0.12, (v0 + v1) / 2, 0.06, 0.24, v1 - v0 + 0.5, 0.12, { color, texel: 1 });
  frame.box("paintedMetal", u1 + 0.12, (v0 + v1) / 2, 0.06, 0.24, v1 - v0 + 0.5, 0.12, { color, texel: 1 });
  for (let i = 1; i <= mullions; i++) {
    const u = u0 + ((u1 - u0) * i) / (mullions + 1);
    frame.box("paintedMetal", u, (v0 + v1) / 2, -0.05, 0.1, v1 - v0, 0.12, { color, texel: 1 });
  }
  frame.box("hazard", cu, v0 - 0.27, 0.06, u1 - u0 + 0.6, 0.06, 0.13, { texel: 2 });
}

export { DECAL, decalRect, screenRect, ledRect, Y };
