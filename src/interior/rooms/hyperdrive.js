// Hyperdrive room (deck C, 6 m): two rows of five stacked motivator banks flank a central inspection
// aisle whose floor grates cover an amber-lit coolant trench. The banks are satin-black two-tier units
// with steel spines, dark louvre bays and amber glow slits that breathe; four variants (standard, one
// with its service panel off showing the coils, a ring-emitter face, an offline unit under lockout).
// The hero motivator closes the aisle: a 5 m coil stack around a pulsing blue-white core on an
// octagonal plinth, flanked by two diagnostic pulpits. Coolant reservoirs line the port wall, power
// conditioning cabinets (three variants) the starboard wall, a wall of pressure gauges flanks the door,
// the coolant trunk runs along the forward wall and an overhead crane rail spans the aisle. Warm-white
// working light, amber from the slits and trench, blue-white from the hero; hazard paint only at the
// grate edges; lane lines are paint.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import {
  yawFrame,
  yawToward,
  cylBetween,
  pipeRun,
  framePipe,
  flange,
  pipeClamp,
  valveWheel,
  cableTray,
  cageLight,
  grateDeck,
  paintStrip,
  paintRect,
  stencil,
  gauge,
  breakerColumn,
  toolCart,
  wallBaseTube,
  tubeFixture,
} from "./deckCProps.js";

const UNIT_W = 3.6; // along the row
const UNIT_D = 7.0; // from the aisle face back
const TIER_H = 2.3;
const TOP_V = 0.3 + 2 * TIER_H + 0.12; // top plate height of a unit
const CPL_V = TIER_H + 0.36; // coolant coupling height (tier boundary)
const ROW_Z = [486.0, 490.4, 494.8, 499.2, 503.6];
const WEST_FACE = 50.0;
const EAST_FACE = 58.0;
const TRENCH = { x0: 52.8, x1: 55.2, z0: 484.6, z1: 501.4, depth: 0.75 };
const TANK_Z = [487.5, 494.0, 500.5];
const HERO = { x: 54, z: 503.7, r: 1.9 };
// unit variants per row position: 0 standard, 1 service panel off, 2 ring emitter, 3 offline
const WEST_VAR = [0, 1, 0, 2, 3];
const EAST_VAR = [2, 0, 3, 0, 1];

// Box geometry placed in a frame but kept out of the kit (for the separately animated glow mesh).
function glowBox(f, u, v, n, su, sv, sn) {
  const g = new THREE.BoxGeometry(su, sv, sn);
  g.applyMatrix4(new THREE.Matrix4().compose(f.pos(u, v, n), f.q, new THREE.Vector3(1, 1, 1)));
  return g;
}

// Louvre bay with three slots at (bu, v0): dark slats, glow slit geometry pushed to `glow` (or dark when off).
function louvreBay(f, bu, v0, bayW, glow) {
  f.box("satinBlack", bu, v0 + 1.45, 0.0, bayW + 0.1, 1.5, 0.03);
  for (let k = 0; k < 3; k++) {
    const v = v0 + 1.0 + k * 0.45;
    f.box("darkGloss", bu, v, 0.016, bayW - 0.1, 0.14, 0.01);
    if (glow) glow.push(glowBox(f, bu, v, 0.024, bayW - 0.2, 0.07, 0.01));
    f.box("metal", bu, v + 0.11, 0.02, bayW - 0.1, 0.02, 0.02, { color: PALETTE.gunmetal });
  }
}

// One motivator bank. Frame origin: centre of the aisle-facing face at floor level, n > 0 into the aisle.
function motivator(kit, f, i, variant, glow) {
  const W = UNIT_W;
  const D = UNIT_D;
  const hw = W / 2;
  f.box("paintedMetal", 0, 0.15, -D / 2, W + 0.1, 0.3, D + 0.1, { color: PALETTE.darkMetal, texel: 1.5 });
  for (let t = 0; t < 2; t++) {
    const v0 = 0.3 + t * (TIER_H + 0.12);
    const vc = v0 + TIER_H / 2;
    // body: satin black with a gunmetal skirt band, steel corner spines
    f.box("satinBlack", 0, vc, -D / 2 - 0.1, W - 0.2, TIER_H, D - 0.2);
    f.box("metal", 0, v0 + 0.2, -D / 2 - 0.1, W - 0.16, 0.4, D - 0.16, { color: PALETTE.gunmetal, texel: 2 });
    for (const s of [-1, 1]) f.box("metal", s * (hw - 0.1), vc, -0.1, 0.2, TIER_H, 0.2, { color: PALETTE.steel, texel: 2 });
    // front plate: dark grey with a steel spine between two bays and a service band underneath
    f.box("metal", 0, vc, -0.1, W - 0.5, TIER_H - 0.2, 0.2, { color: PALETTE.darkMetal, texel: 1.5 });
    f.box("metal", 0, v0 + 1.45, 0.0, 0.3, 1.6, 0.06, { color: PALETTE.steel, texel: 2 });
    const bayW = 0.9;
    if (t === 1 && variant === 2) {
      // ring emitter face on the upper tier
      f.cylN("satinBlack", 0, v0 + 1.35, 0.0, 0.95, 0.08, { segments: 32 });
      f.cylN("darkGloss", 0, v0 + 1.35, 0.045, 0.72, 0.02, { segments: 32 });
      f.add("metal", new THREE.TorusGeometry(0.82, 0.09, 8, 36), 0, v0 + 1.35, 0.06, { color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
      f.add("emitCoolSoft", new THREE.TorusGeometry(0.52, 0.03, 6, 36), 0, v0 + 1.35, 0.07, { uv: "keep" });
      f.cylN("metal", 0, v0 + 1.35, 0.08, 0.2, 0.1, { color: PALETTE.darkMetal, segments: 16 });
      for (let k = 0; k < 4; k++) f.box("metal", 0, v0 + 1.35, 0.065, 1.5, 0.05, 0.04, { color: PALETTE.gunmetal, spin: (k * Math.PI) / 4 });
      f.box("metal", 0, v0 + 1.45, 0.0, 0.3, 0.1, 0.06, { color: PALETTE.steel, texel: 2 });
    } else if (t === 0 && variant === 1) {
      // service panel off the left bay: cavity with coils, cable loom, a board and a clip lamp; the
      // panel itself leans against the unit beside the bay
      const bu = -(0.2 + bayW / 2);
      f.box("satinBlack", bu, v0 + 1.45, -0.5, bayW + 0.1, 1.5, 0.04);
      for (const s of [-1, 1]) f.box("satinBlack", bu + s * (bayW / 2 + 0.03), v0 + 1.45, -0.25, 0.04, 1.5, 0.5);
      f.box("satinBlack", bu, v0 + 2.2, -0.25, bayW + 0.1, 0.04, 0.5);
      for (const [k, cu] of [-0.28, 0, 0.28].entries()) {
        f.cylV("metal", bu + cu, v0 + 1.35, -0.3, 0.09, 1.0, { color: PALETTE.brass, segments: 10 });
        for (let r = 0; r < 5; r++) f.add("metal", new THREE.TorusGeometry(0.1, 0.012, 4, 12).rotateX(Math.PI / 2), bu + cu, v0 + 0.95 + r * 0.2, -0.3, { color: PALETTE.steel, uv: "scale", uvScale: [4, 1] });
        f.cylV("rubber", bu + cu, v0 + 2.05, -0.3 + (k - 1) * 0.05, 0.02, 0.3, { color: k === 1 ? PALETTE.orange : PALETTE.rubber, segments: 6 });
      }
      f.box("darkGloss", bu, v0 + 0.85, -0.44, 0.6, 0.2, 0.02);
      f.box("leds", bu, v0 + 0.85, -0.428, 0.5, 0.03, 0.005, { uv: "keep" });
      f.box("emitWarmSoft", bu + 0.36, v0 + 2.1, -0.12, 0.08, 0.08, 0.14, { uv: "keep" });
      f.box("metal", bu + 0.36, v0 + 2.16, -0.05, 0.03, 0.03, 0.14, { color: PALETTE.gunmetal });
      louvreBay(f, 0.2 + bayW / 2, v0, bayW, glow);
      // the removed panel leans against the unit's side in the gap to its neighbour
      const sp = f.pos(hw + 0.02, 0, -1.2);
      const sf = yawFrame(kit, sp.x, sp.y, sp.z, Math.atan2(f.U.x, f.U.z));
      sf.box("satinBlack", 0, 0.75, 0.44, 0.95, 1.5, 0.03, { tilt: -0.3 });
      sf.collider(-0.5, 0.5, 0, 1.5, 0, 0.5, "panel");
      f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), bu - 0.05, v0 + 0.45, 0.005, { uv: "keep", uvRect: decalRect(13) });
    } else {
      for (const s of [-1, 1]) louvreBay(f, s * (0.2 + bayW / 2), v0, bayW, variant === 3 ? null : glow);
    }
    if (t === 0) {
      f.box("darkGloss", -0.62, v0 + 0.42, 0.02, 0.76, 0.4, 0.03);
      if (variant === 3) {
        f.box("satinBlack", -0.62, v0 + 0.42, 0.04, 0.7, 0.34, 0.01);
        f.box("emitRed", -0.3, v0 + 0.42, 0.05, 0.04, 0.04, 0.005, { uv: "keep" });
        f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 1.0, v0 + 0.4, 0.005, { uv: "keep", uvRect: decalRect(5) });
        f.add("decal", new THREE.PlaneGeometry(0.4, 0.4), 0.4, v0 + 0.4, 0.005, { uv: "keep", uvRect: decalRect(13) });
      } else {
        f.box("screen6", -0.62, v0 + 0.42, 0.038, 0.68, 0.32, 0.006, { uv: "keep" });
        f.box("leds", 0.45, v0 + 0.5, 0.01, 0.6, 0.04, 0.01, { uv: "keep" });
        f.add("decal", new THREE.PlaneGeometry(0.42, 0.42), 1.0, v0 + 0.4, 0.005, { uv: "keep", uvRect: decalRect(9) });
      }
    } else if (variant !== 1) {
      f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), -1.2, v0 + 0.42, 0.005, { uv: "keep", uvRect: decalRect(i % 3 ? 9 : 6) });
      f.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 1.2, v0 + 0.42, 0.005, { uv: "keep", uvRect: decalRect(2) });
    }
    // side heat fins (visible in the gaps between units)
    for (let k = 0; k < 9; k++) {
      const n = -0.8 - k * 0.7;
      for (const s of [-1, 1]) f.box("metal", s * (hw - 0.02), vc, n, 0.36, TIER_H - 0.5, 0.05, { color: PALETTE.gunmetal, texel: 2 });
    }
    if (t === 0) f.box("metal", 0, v0 + TIER_H + 0.06, -D / 2, W, 0.12, D, { color: PALETTE.darkMetal, texel: 2 });
  }
  // crown: top plate with a fin stack and the rear coolant collar
  f.box("metal", 0, TOP_V + 0.05, -D / 2 - 0.1, W - 0.4, 0.1, D - 0.4, { color: PALETTE.darkMetal, texel: 2 });
  for (let k = 0; k < 11; k++) f.box("metal", 0, TOP_V + 0.32, -0.7 - k * 0.6, W - 0.8, 0.45, 0.05, { color: PALETTE.gunmetal, texel: 2 });
  f.cylV("metal", 0, TOP_V + 0.25, -D + 0.5, 0.3, 0.3, { color: PALETTE.darkMetal, segments: 16 });
  // coolant risers at the face edges with frosted couplings and hand valves
  for (const s of [-1, 1]) {
    const u = s * (hw - 0.3);
    f.cylV("metal", u, 2.95, 0.3, 0.1, 5.1, { color: PALETTE.steel, segments: 12 });
    framePipe(f, [[u, 5.5, 0.3], [u, 5.5, -0.5], [u, TOP_V + 0.05, -0.5]], 0.1, { color: PALETTE.steel, segments: 12 });
    f.box("metal", u, CPL_V, 0.3, 0.44, 0.5, 0.44, { color: PALETTE.darkMetal, texel: 2 });
    const frost = new THREE.TorusGeometry(0.2, 0.05, 6, 14);
    frost.rotateX(Math.PI / 2);
    f.add("emitCoolSoft", frost, u, CPL_V + 0.36, 0.3, { uv: "keep" });
    f.cylV("emitCoolSoft", u, CPL_V - 0.34, 0.3, 0.15, 0.1, { segments: 14, uv: "keep" });
    const wp = f.pos(u, 1.45, 0.3);
    const wn = f.pos(u, 1.45, 0.62);
    valveWheel(kit, wn.x, wn.y, wn.z, "x", 0.19, { stem: 0.02, color: PALETTE.slate });
    cylBetween(kit, "metal", [wp.x, wp.y, wp.z], [wn.x, wn.y, wn.z], 0.028, { color: PALETTE.gunmetal, segments: 8 });
    f.box("metal", u, 1.45, 0.3, 0.26, 0.22, 0.26, { color: PALETTE.gunmetal, texel: 2 });
  }
  // low service light under the readout: a tube in a housing washing the unit base and the aisle floor
  f.box("satinBlack", 0, 0.42, 0.1, W - 1.0, 0.08, 0.12);
  f.cylU("emitWarmSoft", 0, 0.38, 0.13, 0.02, W - 1.2, { segments: 8, uv: "keep" });
  f.collider(-hw - 0.15, hw + 0.15, 0, 6, -D - 0.1, 0.5, "motivator");
}

// Power-conditioning cabinet on the starboard wall frame at u; three variants.
function cabinet(E, kit, u, variant, x1, y0, z0) {
  E.box("satinBlack", u, 2.1, 0.6, 2.4, 4.2, 1.2);
  E.box("metal", u, 0.12, 0.6, 2.5, 0.24, 1.3, { color: PALETTE.darkMetal, texel: 2 });
  E.box("metal", u, 4.26, 0.6, 2.42, 0.12, 1.22, { color: PALETTE.gunmetal, texel: 2 });
  for (const s of [-1, 1]) E.box("metal", u + s * 1.15, 2.1, 1.2, 0.1, 4.0, 0.1, { color: PALETTE.steel, texel: 2 });
  E.cylV("metal", u, 4.9, 0.6, 0.08, 1.2, { color: PALETTE.steel, segments: 10 });
  if (variant === 0) {
    for (let s = 0; s < 6; s++) {
      E.box("darkGloss", u - 0.5, 1.0 + s * 0.5, 1.22, 0.96, 0.1, 0.02);
      E.box("emitAmber", u - 0.5, 1.0 + s * 0.5, 1.235, 0.86, 0.04, 0.01, { uv: "keep" });
    }
    E.box("darkGloss", u + 0.55, 1.6, 1.215, 0.8, 0.6, 0.02);
    E.box("screen6", u + 0.55, 1.6, 1.23, 0.72, 0.5, 0.006, { uv: "keep" });
    E.box("leds", u + 0.55, 2.2, 1.215, 0.7, 0.05, 0.01, { uv: "keep" });
    E.add("decal", new THREE.PlaneGeometry(0.6, 0.6), u + 0.55, 3.3, 1.215, { uv: "keep", uvRect: decalRect(5) });
  } else if (variant === 1) {
    const bf = yawFrame(kit, x1 - 1.2, y0, z0 + u, -Math.PI / 2);
    for (const bu of [-0.75, -0.45, -0.15]) breakerColumn(bf, bu, 0.7, 9);
    bf.box("darkGloss", 0.55, 1.4, 0.01, 0.8, 0.9, 0.02);
    for (let r = 0; r < 3; r++) bf.box("leds", 0.55, 1.15 + r * 0.25, 0.025, 0.6, 0.04, 0.005, { uv: "keep" });
    gauge(bf, 0.55, 2.5, 0.22, { needle: 0.55 });
    gauge(bf, 0.55, 3.1, 0.16, { mat: "emitWhite", needle: 0.3 });
    bf.box("emitAmber", -0.45, 2.45, 0.02, 1.0, 0.04, 0.01, { uv: "keep" });
    bf.add("decal", new THREE.PlaneGeometry(0.5, 0.5), -0.45, 3.2, 0.012, { uv: "keep", uvRect: decalRect(8) });
  } else {
    for (let s = 0; s < 9; s++) E.box("darkGloss", u - 0.35, 0.9 + s * 0.3, 1.215, 1.4, 0.16, 0.03);
    for (let s = 0; s < 9; s++) E.box("metal", u - 0.35, 1.0 + s * 0.3, 1.24, 1.4, 0.03, 0.03, { color: PALETTE.gunmetal });
    E.cylN("metal", u + 0.75, 3.0, 1.2, 0.34, 0.08, { color: PALETTE.gunmetal, segments: 20 });
    E.cylN("darkGloss", u + 0.75, 3.0, 1.245, 0.3, 0.01, { segments: 20 });
    E.add("emitWhite", new THREE.TorusGeometry(0.26, 0.012, 4, 20), u + 0.75, 3.0, 1.25);
    E.box("emitWhite", u + 0.75, 3.12, 1.25, 0.012, 0.22, 0.006);
    E.box("emitRed", u + 0.75, 2.3, 1.22, 0.06, 0.06, 0.01, { uv: "keep" });
    E.box("leds", u + 0.75, 2.1, 1.215, 0.6, 0.04, 0.01, { uv: "keep" });
    E.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u + 0.75, 3.7, 1.215, { uv: "keep", uvRect: decalRect(12) });
  }
  E.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u - 0.7, 3.75, 1.215, { uv: "keep", uvRect: decalRect(variant === 2 ? 6 : 8) });
  E.collider(u - 1.25, u + 1.25, 0, 4.4, 0, 1.35, "cabinet");
}

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", floor: false, lights: false, lightRows: 3, panelW: 2.0, styles: { panel: 0.62, vent: 0.14, conduit: 0.12, strip: 0.06, screen: 0.06 } });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const { x0, x1, z0, z1 } = room;
  const WT = lib.WALL_T;
  const T = TRENCH;
  const tb = y0 - T.depth;

  // ---------------------------------------------------------------- floor: four deck plates around the trench
  const slab = (ax, az, bx, bz) => {
    kit.boxMM("deck", [ax, y0 - 0.12, az], [bx, y0, bz], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    kit.floor(ax, az, bx, bz, y0);
  };
  slab(x0 - WT, z0 - WT, T.x0, z1 + WT);
  slab(T.x1, z0 - WT, x1 + WT, z1 + WT);
  slab(T.x0, z0 - WT, T.x1, T.z0);
  slab(T.x0, T.z1, T.x1, z1 + WT);
  // aisle markings: painted lane lines at the bank fronts, hazard chevrons only around the trench grates
  paintStrip(kit, WEST_FACE + 0.55, 484.4, WEST_FACE + 0.65, 501.6, y0, PALETTE.impGrey);
  paintStrip(kit, EAST_FACE - 0.65, 484.4, EAST_FACE - 0.55, 501.6, y0, PALETTE.impGrey);
  kit.boxMM("hazard", [T.x0 - 0.5, y0 + 0.002, T.z0 - 0.5], [T.x0 - 0.2, y0 + 0.006, T.z1 + 0.5], { texel: 3 });
  kit.boxMM("hazard", [T.x1 + 0.2, y0 + 0.002, T.z0 - 0.5], [T.x1 + 0.5, y0 + 0.006, T.z1 + 0.5], { texel: 3 });
  kit.boxMM("hazard", [T.x0 - 0.5, y0 + 0.002, T.z0 - 0.5], [T.x1 + 0.5, y0 + 0.006, T.z0 - 0.2], { texel: 3 });
  kit.boxMM("hazard", [T.x0 - 0.5, y0 + 0.002, T.z1 + 0.2], [T.x1 + 0.5, y0 + 0.006, T.z1 + 0.5], { texel: 3 });
  stencil(kit, 54, y0 + 0.009, 483.0, 1.4, 1, "up");
  stencil(kit, 51.4, y0 + 0.009, 484.2, 0.6, 15, "up");
  stencil(kit, 56.6, y0 + 0.009, 484.2, 0.6, 15, "up");

  // ---------------------------------------------------------------- the lit trench under the aisle grates
  kit.boxMM("metal", [T.x0 - 0.16, tb - 0.1, T.z0 - 0.16], [T.x1 + 0.16, tb, T.z1 + 0.16], { color: PALETTE.darkMetal, uv: "world", texel: 1 });
  kit.boxMM("paintedMetal", [T.x0 - 0.16, tb, T.z0 - 0.16], [T.x0, y0, T.z1 + 0.16], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [T.x1, tb, T.z0 - 0.16], [T.x1 + 0.16, y0, T.z1 + 0.16], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [T.x0, tb, T.z0 - 0.16], [T.x1, y0, T.z0], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [T.x0, tb, T.z1], [T.x1, y0, T.z1 + 0.16], { color: PALETTE.gunmetal, texel: 1 });
  // amber tubes in channels along both trench walls
  for (const [xa, dir] of [[T.x0, 1], [T.x1, -1]]) {
    kit.boxMM("satinBlack", [Math.min(xa, xa + dir * 0.12), tb + 0.3, T.z0 + 0.2], [Math.max(xa, xa + dir * 0.12), tb + 0.42, T.z1 - 0.2]);
    kit.cyl("emitAmber", xa + dir * 0.09, tb + 0.28, (T.z0 + T.z1) / 2, 0.02, T.z1 - T.z0 - 0.6, "z", { segments: 8, uv: "keep" });
  }
  const tzc = (T.z0 + T.z1) / 2;
  const tl = T.z1 - T.z0 - 0.3;
  kit.cyl("metal", 53.45, tb + 0.17, tzc, 0.15, tl, "z", { color: PALETTE.steel, segments: 12 });
  kit.cyl("metal", 54.55, tb + 0.13, tzc, 0.11, tl, "z", { color: PALETTE.orange, segments: 10 });
  kit.cyl("rubber", 54.0, tb + 0.07, tzc, 0.06, tl, "z", { color: PALETTE.rubber, segments: 8 });
  for (let z = T.z0 + 1.5; z < T.z1 - 1; z += 3.0) {
    pipeClamp(kit, 53.45, tb + 0.17, z, 0.15, { axis: "z" });
    pipeClamp(kit, 54.55, tb + 0.13, z, 0.11, { axis: "z" });
    flange(kit, [53.45, tb + 0.17, z + 1.2], [0, 0, 1], 0.21);
  }
  const nSec = 7;
  const secL = (T.z1 - T.z0) / nSec;
  for (let i = 0; i < nSec; i++) grateDeck(kit, T.x0, T.z0 + i * secL, T.x1, T.z0 + (i + 1) * secL, y0, { bearerStep: 1.2 });
  for (const z of [488.0, 493.0, 498.0]) ctx.lights.warm.push(pointLight(0xffa040, 12, 8, [54, tb + 0.4, z]));

  // ---------------------------------------------------------------- the two rows of motivator banks
  const glow = [];
  for (const [i, zc] of ROW_Z.entries()) {
    motivator(kit, yawFrame(kit, WEST_FACE, y0, zc, Math.PI / 2), i, WEST_VAR[i], glow);
    motivator(kit, yawFrame(kit, EAST_FACE, y0, zc, -Math.PI / 2), i + 5, EAST_VAR[i], glow);
  }
  const rowMid = (ROW_Z[0] + ROW_Z[4]) / 2;
  const rowLen = ROW_Z[4] - ROW_Z[0] + UNIT_W;
  for (const [fx, s] of [[WEST_FACE, 1], [EAST_FACE, -1]]) {
    // front coolant header through every coupling block, rear header on the unit tops
    kit.cyl("metal", fx + s * 0.3, y0 + CPL_V, rowMid, 0.09, rowLen, "z", { color: PALETTE.steel, segments: 12 });
    kit.cyl("metal", fx - s * (UNIT_D - 0.5), y0 + TOP_V + 0.5, rowMid, 0.16, rowLen + 0.6, "z", { color: PALETTE.orange, segments: 12 });
    for (const zc of ROW_Z) flange(kit, [fx - s * (UNIT_D - 0.5), y0 + TOP_V + 0.5, zc + UNIT_W / 2 + 0.2], [0, 0, 1], 0.24);
    // cable tray above the row fronts, conduit drops into every unit top
    const tx = fx + s * 0.9;
    cableTray(kit, [tx, 484.6], [tx, 505.0], yTop - 0.3, { w: 0.5, ceilY: yTop, cables: 4, hangerStep: 4.0 });
    for (const zc of ROW_Z) {
      for (const dz of [-0.9, 0.9]) pipeRun(kit, "metal", [[tx, yTop - 0.36, zc + dz], [fx - s * 0.45, yTop - 0.36, zc + dz], [fx - s * 0.45, y0 + TOP_V + 0.08, zc + dz]], 0.045, { color: PALETTE.steel, segments: 8 });
      pipeRun(kit, "rubber", [[tx, yTop - 0.34, zc], [fx - s * 0.45, yTop - 0.34, zc], [fx - s * 0.45, y0 + TOP_V + 0.08, zc]], 0.035, { color: PALETTE.rubber, segments: 8 });
    }
  }
  // glow slits and the hero core share one dynamic updater
  const glowMat = ctx.materials.emitAmber.clone();
  glowMat.emissive = new THREE.Color("#ffb860");
  glowMat.emissiveIntensity = 1.25;
  const heroMat = ctx.materials.emitCoolSoft.clone();
  heroMat.emissive = new THREE.Color("#9cc8ff");
  heroMat.emissiveIntensity = 1.5;
  const heroLights = [];
  {
    const glowMesh = new THREE.Mesh(mergeGeometries(glow, false), glowMat);
    glowMesh.name = "motivatorGlow";
    let t = 0;
    ctx.dynamic.push({
      object: glowMesh,
      update(dt) {
        t += dt;
        glowMat.emissiveIntensity = 1.25 * (0.9 + 0.07 * Math.sin(t * 2.1) + 0.03 * Math.sin(t * 9.3));
        const p = 0.85 + 0.15 * Math.sin(t * 0.9);
        heroMat.emissiveIntensity = 1.5 * p;
        for (const l of heroLights) l.intensity = (l.userData.baseIntensity ?? l.intensity) * (0.85 + 0.15 * p);
      },
    });
  }

  // ---------------------------------------------------------------- hero motivator at the head of the aisle
  {
    const { x: HX, z: HZ, r: HR } = HERO;
    const oct = (r, hgt, y, mat, opts = {}) => kit.add(mat, new THREE.CylinderGeometry(r, r, hgt, 8), { pos: [HX, y, HZ], rot: [0, Math.PI / 8, 0], ...opts });
    oct(HR + 0.3, 0.16, y0 + 0.08, "metal", { color: PALETTE.darkMetal, texel: 1 });
    oct(HR, 0.5, y0 + 0.41, "satinBlack");
    oct(HR - 0.25, 0.12, y0 + 0.72, "metal", { color: PALETTE.steel, texel: 1 });
    kit.add("emitCoolSoft", new THREE.CylinderGeometry(HR + 0.02, HR + 0.02, 0.05, 8), { pos: [HX, y0 + 0.62, HZ], rot: [0, Math.PI / 8, 0], uv: "keep" });
    // the core: pulsing blue-white column inside a glass sleeve
    const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.2, 24, 1, true);
    const uv = coreGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, uv.getY(i));
    coreGeo.translate(HX, y0 + 2.9, HZ);
    const core = new THREE.Mesh(coreGeo, heroMat);
    core.name = "heroCore";
    ctx.dynamic.push({ object: core });
    kit.cyl("glass", HX, y0 + 2.9, HZ, 0.72, 4.2, "y", { segments: 24, open: true });
    // coil stack: steel tori with clamp blocks, thin frost rings between them
    for (let k = 0; k < 6; k++) {
      const y = y0 + 1.15 + k * 0.66;
      kit.add("metal", new THREE.TorusGeometry(1.35, 0.24, 8, 40), { pos: [HX, y, HZ], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "world", texel: 1 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        kit.add("satinBlack", new THREE.BoxGeometry(0.34, 0.56, 0.5), { pos: [HX + Math.cos(a) * 1.5, y, HZ + Math.sin(a) * 1.5], rot: [0, Math.PI / 2 - a, 0] });
      }
      if (k < 5) kit.add("emitCoolSoft", new THREE.TorusGeometry(0.95, 0.03, 4, 32), { pos: [HX, y + 0.33, HZ], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    }
    // six struts and the top cap with its feeds into the ceiling
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      kit.add("paintedMetal", new THREE.BoxGeometry(0.22, 4.3, 0.22), { pos: [HX + Math.cos(a) * 1.75, y0 + 2.85, HZ + Math.sin(a) * 1.75], rot: [0, -a, 0], color: PALETTE.gunmetal, texel: 1.5 });
    }
    oct(HR - 0.2, 0.45, y0 + 5.2, "metal", { color: PALETTE.darkMetal, texel: 1 });
    kit.cyl("metal", HX, y0 + 5.5, HZ, 0.9, 0.16, "y", { color: PALETTE.steel, segments: 24 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const px = HX + Math.cos(a) * 0.55;
      const pz = HZ + Math.sin(a) * 0.55;
      kit.cyl("metal", px, (y0 + 5.55 + yTop) / 2, pz, 0.13, yTop - y0 - 5.55, "y", { color: i ? PALETTE.steel : PALETTE.orange, segments: 10 });
      flange(kit, [px, y0 + 5.8, pz], [0, 1, 0], 0.2);
    }
    // heavy feeds: from the plinth down through the deck, and from the stack to the trunk halves
    for (const s of [-1, 1]) {
      pipeRun(kit, "metal", [[HX + s * 1.0, y0 + 0.7, HZ - HR + 0.2], [HX + s * 1.0, y0 + 0.7, HZ - HR - 0.3], [HX + s * 1.0, y0 - 0.3, HZ - HR - 0.3]], 0.14, { color: PALETTE.steel, segments: 12 });
      flange(kit, [HX + s * 1.0, y0 + 0.04, HZ - HR - 0.3], [0, 1, 0], 0.24, { t: 0.08 });
      pipeRun(kit, "metal", [[HX + s * (HR - 0.3), y0 + 3.6, HZ + 0.6], [HX + s * 3.2, y0 + 3.6, HZ + 0.6], [HX + s * 3.2, y0 + 3.6, z1 - 1.05]], 0.22, { color: PALETTE.steel, segments: 14 });
    }
    kit.collider([HX - HR - 0.3, y0, HZ - HR - 0.3], [HX + HR + 0.3, y0 + 5.8, HZ + HR + 0.3], "hero");
    // diagnostic pulpits either side of the aisle head: the operator stands between pulpit and core
    for (const s of [-1, 1]) {
      const px = HX + s * 2.6;
      const pz = 501.0;
      const f = yawFrame(kit, px, y0, pz, yawToward(HX, HZ, px, pz));
      wallConsole(f, 0, 1.2, s < 0 ? "screen4" : "screen6");
      f.box("emitBlue", 0, 0.5, 0.56, 1.0, 0.03, 0.01, { uv: "keep" });
    }
    const hl = pointLight(0xcfe4ff, 110, 20, [HX, y0 + 3.2, HZ]);
    ctx.lights.cool.push(hl);
    heroLights.push(hl);
    ctx.lights.cool.push(pointLight(0xcfe4ff, 28, 12, [HX, y0 + 0.9, HZ - HR - 1.4]));
  }

  // ---------------------------------------------------------------- overhead crane rail with a parked hoist
  for (const rx of [52.0, 56.0]) {
    kit.boxMM("paintedMetal", [rx - 0.15, yTop - 0.75, 483.6], [rx + 0.15, yTop - 0.45, 505.2], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("metal", [rx - 0.22, yTop - 0.8, 483.6], [rx + 0.22, yTop - 0.74, 505.2], { color: PALETTE.steel, texel: 2 });
    for (let z = 484.5; z < 505; z += 4.0) kit.box("metal", rx, yTop - 0.22, z, 0.14, 0.45, 0.14, { color: PALETTE.darkMetal, texel: 2 });
    for (const ze of [483.75, 505.05]) kit.box("painted", rx, yTop - 0.6, ze, 0.5, 0.36, 0.2, { color: PALETTE.orange, uv: "keep" });
  }
  {
    const bz = 496.4;
    kit.box("paintedMetal", 54, yTop - 1.0, bz, 4.9, 0.36, 0.4, { color: PALETTE.gunmetal, texel: 1 });
    for (const rx of [52.0, 56.0]) kit.box("metal", rx, yTop - 0.9, bz, 0.5, 0.36, 0.7, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("paintedMetal", 54.6, yTop - 1.42, bz, 0.8, 0.5, 0.7, { color: PALETTE.slate, texel: 1.5 });
    kit.box("emitOrange", 54.6, yTop - 1.2, bz + 0.355, 0.3, 0.06, 0.01, { uv: "keep" });
    const hookY = y0 + 3.5;
    kit.cyl("metal", 54.6, (yTop - 1.67 + hookY + 0.2) / 2, bz, 0.015, yTop - 1.67 - hookY - 0.2, "y", { color: PALETTE.steel, segments: 6 });
    kit.box("metal", 54.6, hookY, bz, 0.26, 0.4, 0.2, { color: PALETTE.darkMetal, texel: 2 });
    kit.add("metal", new THREE.TorusGeometry(0.14, 0.03, 6, 16, Math.PI * 1.5), { pos: [54.6, hookY - 0.34, bz], rot: [0, 0, (3 * Math.PI) / 4], color: PALETTE.steel, uv: "scale", uvScale: [3, 1] });
  }

  // ---------------------------------------------------------------- port side: coolant reservoirs and the overhead feed network
  const headerX = 40.2;
  const headerY = yTop - 0.75;
  kit.cyl("metal", headerX, headerY, 494.5, 0.2, 19.0, "z", { color: PALETTE.steel, segments: 16 });
  for (const [i, tz] of TANK_Z.entries()) {
    const tx = x0 + 1.9;
    kit.cyl("paintedMetal", tx, y0 + 0.15, tz, 1.55, 0.3, "y", { color: PALETTE.darkMetal, segments: 24, texel: 1 });
    kit.cyl("paintedMetal", tx, y0 + 2.65, tz, 1.35, 4.7, "y", { color: i % 2 ? PALETTE.slate : PALETTE.gunmetal, segments: 28, texel: 0.7 });
    kit.cyl("paintedMetal", tx, y0 + 5.15, tz, 1.1, 0.3, "y", { color: PALETTE.darkMetal, segments: 24 });
    kit.cyl("metal", tx, y0 + 5.32, tz, 0.5, 0.04, "y", { color: PALETTE.steel, segments: 20 });
    for (const v of [1.5, 3.9]) kit.add("metal", new THREE.TorusGeometry(1.37, 0.07, 8, 40), { pos: [tx, y0 + v, tz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "scale", uvScale: [8, 1] });
    // sight glass with the coolant level glowing frost-blue, nameplate, gauge
    kit.box("darkGloss", tx + 1.33, y0 + 2.7, tz, 0.08, 3.4, 0.24);
    kit.box("emitCoolSoft", tx + 1.375, y0 + 1.85, tz, 0.01, 1.6 + i * 0.25, 0.14, { uv: "keep" });
    kit.box("metal", tx + 1.36, y0 + 4.5, tz - 0.6, 0.06, 0.5, 0.8, { color: PALETTE.darkMetal, texel: 2 });
    const np = new THREE.PlaneGeometry(0.6, 0.4);
    np.rotateY(Math.PI / 2);
    kit.add("decal", np, { pos: [tx + 1.395, y0 + 4.5, tz - 0.6], uv: "keep", uvRect: decalRect(9) });
    const gf = yawFrame(kit, tx + 1.35, y0, tz + 0.75, Math.PI / 2);
    gf.box("metal", 0, 1.4, 0.0, 0.5, 0.5, 0.1, { color: PALETTE.darkMetal, texel: 2 });
    gauge(gf, 0, 1.4, 0.16, { mat: "emitWhite", needle: 0.35 + i * 0.15 });
    // feed to the header
    pipeRun(kit, "metal", [[tx, y0 + 5.3, tz], [tx, headerY, tz], [headerX, headerY, tz]], 0.16, { color: PALETTE.steel, segments: 14 });
    flange(kit, [tx, y0 + 5.7, tz], [0, 1, 0], 0.24);
    valveWheel(kit, tx, y0 + 4.7, tz + 1.55, "z", 0.2);
    kit.cyl("metal", tx, y0 + 4.7, tz + 1.35, 0.1, 0.4, "z", { color: PALETTE.gunmetal, segments: 10 });
    kit.collider([tx - 1.6, y0, tz - 1.6], [tx + 1.6, y0 + 5.5, tz + 1.6], "tank");
  }
  for (const [i, zc] of ROW_Z.entries()) {
    const bx = WEST_FACE - UNIT_D + 0.5;
    pipeRun(kit, "metal", [[headerX, headerY, zc], [bx, headerY, zc], [bx, y0 + TOP_V + 0.6, zc]], 0.13, { color: i % 2 ? PALETTE.orange : PALETTE.steel, segments: 12 });
    valveWheel(kit, headerX, headerY + 0.42, zc, "y", 0.22);
    kit.cyl("metal", headerX, headerY + 0.24, zc, 0.09, 0.2, "y", { color: PALETTE.gunmetal, segments: 10 });
    flange(kit, [bx, headerY - 0.7, zc], [0, 1, 0], 0.2);
  }
  // port wall fixtures between the tanks (u = z1 - z)
  const W = shell.frames["-x"].frame;
  for (const [ua, ub] of [[1.0, 3.8], [7.6, 10.4], [14.1, 16.9], [20.6, 24.0]]) {
    wallLightBar(W, ua, ub, 3.4);
    W.add("decal", new THREE.PlaneGeometry(0.5, 0.5), (ua + ub) / 2, 2.6, 0.005, { uv: "keep", uvRect: decalRect(ua > 10 ? 12 : 6) });
  }
  wallConsole(W, 22.3, 1.6, "screen6");
  for (const u of [8.4, 15.2]) {
    W.box("satinBlack", u, 1.3, 0.1, 1.1, 1.6, 0.2);
    const bf = yawFrame(kit, x0 + 0.2, y0, z1 - u, Math.PI / 2);
    breakerColumn(bf, -0.3, 0.7, 7);
    breakerColumn(bf, 0.0, 0.7, 7);
    breakerColumn(bf, 0.3, 0.7, 7);
    W.collider(u - 0.6, u + 0.6, 0, 2.2, 0, 0.3, "breakers");
  }
  cableTray(kit, [x0 + 0.65, 482.6], [x0 + 0.65, 505.4], yTop - 1.3, { w: 0.5, ceilY: yTop, cables: 4 });
  for (const z of [488.5, 498.5]) tubeFixture(kit, ctx, 42.6, yTop, z, 2.4, "z", { drop: 0.9, intensity: 55, distance: 16, color: 0xffe2c0 });
  ctx.lights.cool.push(pointLight(0xcfe4ff, 30, 12, [39.8, y0 + 5.0, 494.0]));

  // ---------------------------------------------------------------- starboard side: power-conditioning cabinets, spare core, cart
  const E = shell.frames["+x"].frame; // u = z - z0
  for (const [i, zc] of ROW_Z.entries()) {
    cabinet(E, kit, zc - z0, [0, 1, 2, 0, 1][i], x1, y0, z0);
    if (i + 1 < ROW_Z.length) {
      const g = zc - z0 + 2.0;
      E.box("paintedMetal", g, 3.0, 0.15, 0.4, 6.0, 0.3, { color: PALETTE.darkMetal, texel: 1 });
      E.box("emitAmber", g, 2.0, 0.31, 0.16, 0.05, 0.01, { uv: "keep" });
    }
  }
  wallLightBar(E, 1.0, ROW_Z[0] - 1.3 - z0, 3.4);
  if (z1 - z0 - 1.0 - (ROW_Z[4] + 1.3 - z0) > 0.8) wallLightBar(E, ROW_Z[4] + 1.3 - z0, z1 - z0 - 1.0, 3.4);
  E.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 2.0, 2.4, 0.005, { uv: "keep", uvRect: decalRect(5) });
  cableTray(kit, [x1 - 0.7, 483.0], [x1 - 0.7, 505.2], yTop - 0.9, { w: 0.6, ceilY: yTop, cables: 5 });
  {
    const sx = 67.6;
    const sz = 492.0;
    for (const dz of [-1.8, 1.8]) {
      kit.box("paintedMetal", sx, y0 + 0.5, sz + dz, 2.2, 1.0, 0.3, { color: PALETTE.gunmetal, texel: 1.5 });
      kit.box("metal", sx, y0 + 1.02, sz + dz, 1.4, 0.06, 0.4, { color: PALETTE.darkMetal, texel: 2 });
    }
    kit.cyl("satinBlack", sx, y0 + 1.75, sz, 0.75, 5.0, "z", { segments: 28 });
    for (let k = 0; k < 8; k++) kit.add("metal", new THREE.TorusGeometry(0.9, 0.05, 6, 36), { pos: [sx, y0 + 1.75, sz - 2.1 + k * 0.6], color: PALETTE.steel, uv: "scale", uvScale: [6, 1] });
    kit.cyl("metal", sx, y0 + 1.75, sz - 2.55, 0.85, 0.12, "z", { color: PALETTE.darkMetal, segments: 28 });
    kit.cyl("metal", sx, y0 + 1.75, sz + 2.55, 0.85, 0.12, "z", { color: PALETTE.darkMetal, segments: 28 });
    kit.cyl("emitCoolSoft", sx, y0 + 1.75, sz + 2.63, 0.4, 0.04, "z", { segments: 20, uv: "keep" });
    paintRect(kit, sx - 1.5, sz - 3.2, sx + 1.5, sz + 3.2, y0, 0.1);
    stencil(kit, sx, y0 + 0.009, sz + 3.7, 0.6, 6, "up");
    kit.collider([sx - 1.2, y0, sz - 2.7], [sx + 1.2, y0 + 2.6, sz + 2.7], "spareCore");
    toolCart(kit, 69.3, y0, 496.6, 0.4, 2);
    toolCart(kit, 66.2, y0, 486.2, -1.2, 5);
    cageLight(kit, ctx, 67.8, yTop, 488.0, 1.0, { intensity: 55, distance: 16, color: 0xffe2c0 });
    cageLight(kit, ctx, 67.8, yTop, 500.0, 1.0, { intensity: 55, distance: 16, color: 0xffe2c0 });
  }

  // ---------------------------------------------------------------- aft wall: gauge wall (port of the door), status board and switchgear (starboard)
  const S = shell.frames["-z"].frame; // u = x - x0
  {
    S.box("paintedMetal", 8.5, 2.15, 0.06, 12.0, 2.3, 0.12, { color: PALETTE.gunmetal, texel: 1 });
    for (let r = 0; r < 3; r++) {
      S.cylU("metal", 8.5, 1.1 + r * 0.72, 0.16, 0.06, 12.0, { color: r === 1 ? PALETTE.orange : PALETTE.steel, segments: 10 });
      for (let c = 0; c < 8; c++) {
        const u = 3.25 + c * 1.5;
        const v = 1.45 + r * 0.72;
        gauge(S, u, v, 0.24, { mat: r === 1 ? "emitWhite" : "emitAmber", needle: 0.25 + ((r * 5 + c * 3) % 8) / 12 });
        S.cylV("metal", u, v - 0.25, 0.16, 0.035, 0.36, { color: PALETTE.steel, segments: 8 });
      }
    }
    S.cylU("metal", 8.5, 0.55, 0.35, 0.18, 12.2, { color: PALETTE.steel, segments: 16 });
    for (let c = 0; c < 8; c++) {
      const u = 3.25 + c * 1.5;
      valveWheel(kit, x0 + u, y0 + 0.55, z0 + 0.35 + 0.3, "z", 0.2, { stem: 0.02 });
      S.cylN("metal", u, 0.55, 0.5, 0.03, 0.3, { color: PALETTE.gunmetal, segments: 8 });
      S.cylV("metal", u, 0.8, 0.35, 0.05, 0.5, { color: PALETTE.steel, segments: 8 });
    }
    S.box("leds", 8.5, 3.36, 0.125, 10.0, 0.05, 0.01, { uv: "keep" });
    S.add("decal", new THREE.PlaneGeometry(0.8, 0.8), 8.5, 3.85, 0.005, { uv: "keep", uvRect: decalRect(5) });
    S.add("decal", new THREE.PlaneGeometry(0.5, 0.5), 3.0, 3.75, 0.005, { uv: "keep", uvRect: decalRect(9) });
    S.collider(2.4, 14.6, 0, 3.4, 0, 0.62, "gaugeWall");
  }
  {
    S.box("satinBlack", 26.0, 2.3, 0.05, 7.0, 1.4, 0.1);
    for (let k = 0; k < 4; k++) {
      const u = 23.4 + k * 1.75;
      S.box("darkGloss", u, 2.4, 0.11, 1.5, 0.9, 0.02);
      S.box(k === 1 ? "screen4" : "screen6", u, 2.4, 0.125, 1.4, 0.8, 0.006, { uv: "keep" });
      S.box("leds", u, 1.75, 0.11, 1.2, 0.05, 0.01, { uv: "keep" });
    }
    S.box("emitAmber", 26.0, 3.06, 0.11, 6.6, 0.04, 0.01, { uv: "keep" });
    wallConsole(S, 26.0, 3.0, "screen6");
    for (let k = 0; k < 3; k++) {
      const u = 31.2 + k * 1.3;
      S.box("paintedMetal", u, 1.2, 0.2, 1.2, 2.4, 0.4, { color: PALETTE.gunmetal, texel: 1 });
      S.box("satinBlack", u, 1.2, 0.42, 1.1, 2.2, 0.04);
      const bf = yawFrame(kit, x0 + u, y0, z0 + 0.44, 0);
      for (const bu of [-0.3, 0, 0.3]) breakerColumn(bf, bu, 0.45, 8);
      gauge(bf, 0, 2.05, 0.15, { needle: 0.3 + k * 0.2 });
      bf.add("decal", new THREE.PlaneGeometry(0.4, 0.4), 0.38, 2.05, 0.002, { uv: "keep", uvRect: decalRect(8) });
    }
    S.collider(30.5, 35.0, 0, 2.5, 0, 0.5, "switchgear");
    // fire cabinet beside the door
    S.box("painted", 20.9, 1.35, 0.14, 0.6, 0.9, 0.28, { color: PALETTE.orange, uv: "keep" });
    S.box("metal", 20.9, 1.35, 0.285, 0.5, 0.8, 0.01, { color: PALETTE.darkMetal });
    S.box("metal", 21.12, 1.35, 0.29, 0.03, 0.2, 0.02, { color: PALETTE.steel });
    S.add("decal", new THREE.PlaneGeometry(0.3, 0.3), 20.9, 2.05, 0.005, { uv: "keep", uvRect: decalRect(13) });
    S.collider(20.55, 21.25, 0.8, 1.85, 0, 0.32, "fireCab");
  }
  wallLightBar(S, 2.5, 14.5, 3.6);
  wallLightBar(S, 21.5, 35.0, 3.6);
  wallBaseTube(S, 15.4, 16.5, 0.4, "emitCoolSoft");
  wallBaseTube(S, 19.5, 20.4, 0.4, "emitCoolSoft");
  S.box("emitAmber", 18, 2.7, 0.03, 2.8, 0.05, 0.02, { uv: "keep" });
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 15.7, 1.75, 0.005, { uv: "keep", uvRect: decalRect(5) });
  S.add("decal", new THREE.PlaneGeometry(0.6, 0.6), 20.3, 1.75, 0.005, { uv: "keep", uvRect: decalRect(1) });
  cableTray(kit, [37.0, z0 + 0.45], [71.0, z0 + 0.45], yTop - 1.1, { w: 0.5, ceilY: yTop, cables: 4 });
  ctx.lights.cool.push(pointLight(0xdfe8ff, 36, 14, [44.5, y0 + 4.2, 484.0]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 36, 14, [63.5, y0 + 4.2, 484.0]));
  // low fill by the door so the floor and the first unit bases read
  ctx.lights.cool.push(pointLight(0xdfe8ff, 22, 10, [51.0, y0 + 0.8, 483.6]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 22, 10, [57.0, y0 + 0.8, 483.6]));

  // ---------------------------------------------------------------- forward wall: coolant trunk in two halves, pump units, consoles
  const N = shell.frames["+z"].frame; // u = x1 - x
  {
    const trunkY = y0 + 3.6;
    const tz = z1 - 1.05;
    for (const [ta, tb2] of [[x0 + 1.5, HERO.x - 3.2], [HERO.x + 3.2, x1 - 1.5]]) {
      kit.cyl("metal", (ta + tb2) / 2, trunkY, tz, 0.8, tb2 - ta, "x", { color: PALETTE.steel, segments: 28, texel: 0.7 });
      flange(kit, [ta + 0.1, trunkY, tz], [1, 0, 0], 0.95, { t: 0.2 });
      flange(kit, [tb2 - 0.1, trunkY, tz], [1, 0, 0], 0.95, { t: 0.2 });
    }
    for (const fx of [39.5, 45.5, 62.5, 68.5]) flange(kit, [fx, trunkY, tz], [1, 0, 0], 0.95, { t: 0.2 });
    for (const fx of [38.5, 47.0, 61.0, 69.5]) kit.box("paintedMetal", fx, trunkY, z1 - 0.45, 0.5, 1.9, 0.7, { color: PALETTE.gunmetal, texel: 1 });
    for (const [i, px] of [39.6, 42.0, 66.0, 68.4].entries()) {
      pipeRun(kit, "metal", [[px, trunkY, tz], [px, y0 + 1.5, tz], [px, y0 + 1.5, z1 - 1.6]], 0.3, { color: i % 2 ? PALETTE.orange : PALETTE.steel, segments: 14 });
      kit.box("paintedMetal", px, y0 + 0.65, z1 - 1.9, 1.8, 1.3, 1.4, { color: PALETTE.gunmetal, texel: 1.2 });
      kit.box("metal", px, y0 + 1.33, z1 - 1.9, 1.84, 0.06, 1.44, { color: PALETTE.darkMetal, texel: 2 });
      kit.box("metal", px, y0 + 0.1, z1 - 1.9, 1.9, 0.2, 1.5, { color: PALETTE.darkMetal, texel: 2 });
      kit.cyl("paintedMetal", px, y0 + 0.7, z1 - 2.7, 0.5, 0.3, "z", { color: PALETTE.slate, segments: 20 });
      const pf = yawFrame(kit, px, y0, z1 - 2.6, Math.PI);
      gauge(pf, -0.45, 1.05, 0.15, { needle: 0.3 + i * 0.12 });
      pf.box("leds", 0.3, 1.05, 0.01, 0.5, 0.04, 0.01, { uv: "keep" });
      pf.box("emitAmber", 0.3, 0.85, 0.01, 0.2, 0.06, 0.01, { uv: "keep" });
      valveWheel(kit, px + 0.62, y0 + 2.5, tz, "x", 0.22, { stem: 0.02 });
      kit.cyl("metal", px + 0.4, y0 + 2.5, tz, 0.03, 0.44, "x", { color: PALETTE.gunmetal, segments: 8 });
      kit.cyl("metal", px + 0.3, y0 + 2.5, tz, 0.1, 0.2, "x", { color: PALETTE.gunmetal, segments: 10 });
      kit.collider([px - 0.95, y0, z1 - 2.75], [px + 0.95, y0 + 1.5, z1], "pump");
    }
    for (const [ua, ub] of [[1.0, 5.0], [7.2, 10.8], [25.2, 28.8], [31.0, 35.0]]) wallLightBar(N, ua, ub, 2.5);
    // dark plate behind the hero (its glow, not a lit wall, is what reads at the end of the aisle)
    N.box("satinBlack", 18.0, 2.9, 0.05, 7.4, 5.4, 0.1);
    for (const s of [-1, 1]) N.box("metal", 18.0 + s * 3.6, 2.9, 0.1, 0.16, 5.4, 0.16, { color: PALETTE.steel, texel: 2 });
    N.box("emitBlue", 18.0, 5.5, 0.11, 6.4, 0.04, 0.01, { uv: "keep" });
    N.add("decal", new THREE.PlaneGeometry(1.2, 1.2), 18.0, 1.4, 0.11, { uv: "keep", uvRect: decalRect(2) });
    wallConsole(N, 9.0, 1.6, "screen4");
    wallConsole(N, 27.0, 1.6, "screen6");
    for (const [u, idx] of [[3.0, 12], [8.9, 6], [27.1, 6], [33.0, 12]]) N.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u, 1.9, 0.005, { uv: "keep", uvRect: decalRect(idx) });
    ctx.lights.warm.push(pointLight(0xffe2c0, 24, 10, [43.5, y0 + 2.2, 502.6]));
    ctx.lights.warm.push(pointLight(0xffe2c0, 24, 10, [64.5, y0 + 2.2, 502.6]));
  }

  // ---------------------------------------------------------------- aisle lighting: warm-white tube fittings over the aisle
  // (the pool keeps the 14 best-scoring fixtures, so the aisle carries the room with few strong lights
  // whose reach covers the whole 24 m from the door; the amber comes from the slits and the trench)
  for (const z of [486.5, 491.5, 496.5]) tubeFixture(kit, ctx, 54, yTop, z, 3.2, "x", { drop: 1.0, intensity: 95, distance: 22, color: 0xfff0dc });
  ctx.lights.warm.push(pointLight(0xfff0dc, 30, 12, [54, yTop - 0.9, 483.3]));
  // low fill in the aisle at the unit bases
  for (const z of [489.0, 497.0]) ctx.lights.warm.push(pointLight(0xffe2c0, 16, 9, [51.2, y0 + 0.7, z]));
  for (const z of [489.0, 497.0]) ctx.lights.warm.push(pointLight(0xffe2c0, 16, 9, [56.8, y0 + 0.7, z]));
  return shell;
}
