// Main bridge: the ship's command deck and its most detailed interior. A raised command walkway runs
// from the aft door to a bank of trapezoidal forward windows over the hull; two sunken crew pits flank
// it, ringed with operator stations that face the pit walls. Under the windows a continuous sill console
// bank carries the helm / navigation stations; the walkway ends on a raised captain's platform with a
// holo-projector and a plotting table. Lighting is low-key: white channels over the walkway, the pits lit
// by screen-coloured practicals, cool space light falling in through the windows.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../../kit.js";
import { GRATE_TILE, decalRect } from "../../textures.js";
import { roomFloorY } from "../../config/shipSpec.js";

// Pit depth: the registry only resolves a room while the player's feet are within 1.5 m below its
// floor (registry.js spaceAt), so the pits stop at 1.45 m rather than the 1.6 m of the brief; deeper
// pits would drop the player out of the room (HUD, culling and the hull behind the windows all go).
const PIT = { x0: 3.2, x1: 14, z0: 474, z1: 492, depth: 1.45 };
const WALK_HW = 2.4;
const STAIR = { z0: 490.4, z1: 492, run: 2.4, steps: 8 };
const RAIL_H = 1.05;
const RAIL_SET = 0.25; // rails stand this far back from a pit edge
// window bank: seven trapezoidal panes between 0.3 m black mullions, inside the exterior opening
const WINDOW = { halfW: 15.5, y0: 0.9, y1: 5.2, panes: 7, slant: 0.6, bar: 0.3 };
// the exterior's dark bay linings reach 1.2 m into the room above and below the opening; the sill
// console bank and the header soffit are deep enough to swallow them
const SILL_DEPTH = 1.3;

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const { Frame, wallFrame, panelGrid, pointLight, LIGHT_SCALE, roomShell, DARK_PAINTS, wallLightBar, roomWalls, WALL_T } = lib;
  const y0 = roomFloorY(room);
  const h = room.height;
  const yTop = y0 + h;
  const pitY = y0 - PIT.depth;
  const { x0, x1, z0, z1 } = room;
  const rand = rng(4471);
  const dynamic = ctx.dynamic || (ctx.dynamic = []);

  // ---------------------------------------------------------------- helpers
  const box = (mat, a, b, opts = {}) =>
    kit.boxMM(mat, [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], opts);
  // wall-local u of a world point lying on a frame's plane
  const uAt = (f, x, z) => (x - f.o.x) * f.U.x + (z - f.o.z) * f.U.z;
  // plate leaning about the frame's U axis: bottom edge at (vBase, nBase), h along the leaning axis,
  // th along its normal; `along` / `lift` offset it along those two axes (stacking screens on bezels)
  const tiltedBox = (f, mat, u, vBase, nBase, w, hh, th, tilt, opts = {}) => {
    const { along = 0, lift = 0, ...rest } = opts;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const a = along + hh / 2;
    const l = lift + th / 2;
    return f.box(mat, u, vBase + a * c - l * s, nBase + a * s + l * c, w, hh, th, { tilt, ...rest });
  };

  // Operator seat, kit-bashed like the freighter cockpit seats but in dark grey: swivel column, rubber
  // pan shell with a fabric insert, leaning backrest with a steel spine, headrest, armrests. Built on a
  // wall frame so the seat faces the wall (its back toward +N).
  function seat(f, u, nS) {
    f.cylV("metal", u, 0.02, nS, 0.27, 0.04, { color: P.darkMetal, segments: 12 });
    f.cylV("metal", u, 0.2, nS, 0.055, 0.36, { color: P.gunmetal, segments: 8 });
    f.box("metal", u, 0.4, nS, 0.44, 0.04, 0.44, { color: P.gunmetal });
    f.box("rubber", u, 0.47, nS, 0.56, 0.1, 0.54, { color: P.rubber });
    f.box("fabric", u, 0.535, nS - 0.02, 0.4, 0.04, 0.46, { color: P.slate, uv: "world", texel: 2 });
    for (const b of [-0.24, 0.24]) f.box("rubber", u + b, 0.55, nS - 0.02, 0.09, 0.06, 0.48, { color: P.rubber });
    const tilt = 0.2;
    const vb = 0.5;
    const nb = nS + 0.22;
    tiltedBox(f, "rubber", u, vb, nb, 0.56, 0.5, 0.1, tilt, { color: P.rubber });
    tiltedBox(f, "rubber", u, vb, nb, 0.46, 0.4, 0.1, tilt, { along: 0.5, color: P.rubber });
    tiltedBox(f, "fabric", u, vb, nb, 0.4, 0.8, 0.04, tilt, { along: 0.05, lift: -0.04, color: P.slate, uv: "world", texel: 2 });
    tiltedBox(f, "metal", u, vb, nb, 0.08, 0.98, 0.04, tilt, { lift: 0.1, color: P.steel });
    tiltedBox(f, "metal", u, vb, nb, 0.5, 0.05, 0.06, tilt, { along: 0.02, lift: 0.1, color: P.gunmetal });
    tiltedBox(f, "rubber", u, vb, nb, 0.3, 0.16, 0.1, tilt, { along: 0.98, color: P.rubber });
    tiltedBox(f, "fabric", u, vb, nb, 0.24, 0.1, 0.03, tilt, { along: 1.0, lift: -0.03, color: P.slate, uv: "world", texel: 2 });
    tiltedBox(f, "emitBlue", u, vb, nb, 0.03, 0.03, 0.01, tilt, { along: 0.7, lift: 0.1 });
    for (const a of [-0.34, 0.34]) {
      f.box("metal", u + a, 0.66, nS + 0.1, 0.05, 0.2, 0.06, { color: P.gunmetal });
      f.box("metal", u + a, 0.77, nS - 0.02, 0.06, 0.04, 0.42, { color: P.gunmetal });
      f.box("rubber", u + a, 0.805, nS - 0.02, 0.08, 0.03, 0.38, { color: P.rubber });
    }
    f.collider(u - 0.32, u + 0.32, 0, 1.2, nS - 0.3, nS + 0.42, "seat");
  }

  // Operator station on a wall frame: black desk with a dark-gloss top, sloped instrument panel with the
  // main screen and indicator lamps, key deck, wall display above the desk, seat facing the wall.
  function station(f, u, o = {}) {
    const { screen = "screen4", wall = "screen4", accent = "emitBlue", w = 1.5, hd = 0.78, d = 0.7, withSeat = true, wallScreen = true, panelH = 0.34 } = o;
    f.box("metal", u, 0.05, 0.08 + (d - 0.16) / 2, w - 0.1, 0.1, d - 0.16, { color: P.darkMetal, texel: 2 });
    f.box("satinBlack", u, 0.1 + (hd - 0.12) / 2, 0.06 + (d - 0.06) / 2, w, hd - 0.12, d - 0.06);
    f.box("darkGloss", u, hd - 0.01, 0.06 + d / 2, w + 0.02, 0.02, d + 0.02);
    if (accent === "emitRed") f.box("painted", u, 0.2, 0.06 + d + 0.002, w - 0.3, 0.035, 0.004, { color: P.orange, uv: "keep" });
    // kick light under the desk front: the pits read as rows of consoles even where no practical reaches
    f.box(accent === "emitRed" ? "emitRedSoft" : "emitBlueSoft", u, 0.12, 0.06 + d + 0.002, w - 0.4, 0.02, 0.004, { uv: "keep" });
    const tilt = -0.32;
    tiltedBox(f, "satinBlack", u, hd, 0.24, w - 0.04, panelH, 0.06, tilt);
    tiltedBox(f, "darkGloss", u, hd, 0.24, w - 0.26, panelH - 0.08, 0.006, tilt, { along: 0.04, lift: 0.06 });
    tiltedBox(f, screen, u, hd, 0.24, w - 0.34, panelH - 0.14, 0.006, tilt, { along: 0.07, lift: 0.064, uv: "keep" });
    tiltedBox(f, accent, u - w / 2 + 0.1, hd, 0.24, 0.05, 0.05, 0.006, tilt, { along: panelH * 0.55, lift: 0.062 });
    tiltedBox(f, "emitAmber", u + w / 2 - 0.1, hd, 0.24, 0.05, 0.05, 0.006, tilt, { along: panelH * 0.55, lift: 0.062 });
    f.box("rubber", u, hd + 0.006, 0.5, w - 0.5, 0.012, 0.18, { color: P.rubber });
    f.box("leds", u, hd + 0.008, 0.36, w - 0.5, 0.012, 0.05, { uv: "keep" });
    for (let i = 0; i < 7; i++) {
      const r = rand();
      const m = r < 0.35 ? accent : r < 0.5 ? "emitAmber" : "rubber";
      f.box(m, u - (w - 0.6) / 2 + (i / 6) * (w - 0.6), hd + 0.012, 0.62, 0.07, 0.024, 0.06, { color: P.rubber });
    }
    if (wallScreen) {
      f.box("darkGloss", u, 1.33, 0.03, w - 0.2, 0.5, 0.05);
      f.box(wall, u, 1.33, 0.057, w - 0.3, 0.4, 0.006, { uv: "keep" });
      f.box(accent, u - w / 2 + 0.16, 1.03, 0.03, 0.06, 0.02, 0.008);
      f.box("leds", u + 0.1, 1.03, 0.03, w - 0.7, 0.03, 0.008, { uv: "keep" });
    }
    f.collider(u - w / 2, u + w / 2, 0, hd + 0.4, 0, d + 0.1, "station");
    if (withSeat) seat(f, u, d + 0.5);
  }

  // Equipment rack (pit aft walls): five unit rows with LED strips, lamps and a small amber readout.
  function rack(f, u, seed) {
    const r = rng(seed);
    const w = 1.1;
    const hh = 1.45;
    const d = 0.5;
    f.box("satinBlack", u, hh / 2, d / 2, w, hh, d);
    f.box("metal", u, 0.04, d / 2, w - 0.06, 0.08, d - 0.04, { color: P.darkMetal });
    f.box("darkGloss", u, hh / 2 + 0.04, d + 0.005, w - 0.12, hh - 0.2, 0.01);
    for (let k = 0; k < 5; k++) {
      const v = 0.2 + k * 0.24;
      f.box("metal", u, v, d + 0.012, w - 0.2, 0.2, 0.012, { color: P.gunmetal, texel: 2 });
      f.box("leds", u - 0.12, v + 0.05, d + 0.02, 0.5, 0.03, 0.006, { uv: "keep" });
      f.box(r() < 0.6 ? "emitBlue" : "emitAmber", u + 0.3, v + 0.05, d + 0.02, 0.04, 0.03, 0.006);
      if (r() < 0.3) f.box("emitRed", u + 0.38, v + 0.05, d + 0.02, 0.04, 0.03, 0.006);
      f.box("rubber", u, v - 0.05, d + 0.02, w - 0.36, 0.03, 0.01, { color: P.rubber });
    }
    if (r() < 0.6) f.box("screen6", u, hh - 0.12, d + 0.02, 0.5, 0.14, 0.006, { uv: "keep" });
    f.add("decal", new THREE.PlaneGeometry(0.16, 0.16), u + w / 2 - 0.16, hh - 0.12, d + 0.018, { uv: "keep", uvRect: decalRect(Math.floor(r() * 16)) });
    f.collider(u - w / 2, u + w / 2, 0, hh, 0, d + 0.03, "rack");
  }

  // Wall equipment bay: black cabinet with two painted access doors and a status module on top.
  function equipmentBay(f, u, w, hh, d, seed) {
    const r = rng(seed);
    f.box("satinBlack", u, hh / 2, d / 2, w, hh, d);
    f.box("metal", u, 0.06, d / 2, w - 0.04, 0.12, d - 0.02, { color: P.darkMetal });
    const doorH = hh * 0.62;
    const doorV = 0.14 + doorH / 2;
    for (const k of [-1, 1]) {
      f.box("painted1", u + k * (w / 4), doorV, d + 0.006, w / 2 - 0.08, doorH, 0.012, { color: P.impGreyDark, uv: "keep" });
      f.box("darkGloss", u + k * (w / 4 + 0.1), doorV, d + 0.016, 0.03, 0.16, 0.01);
    }
    const mv = hh - 0.26;
    f.box("darkGloss", u, mv, d + 0.006, w - 0.16, 0.34, 0.012);
    f.box("leds", u - w / 2 + 0.36, mv + 0.08, d + 0.014, Math.min(0.6, w - 0.5), 0.04, 0.006, { uv: "keep" });
    f.box("screen6", u + w / 2 - 0.3, mv, d + 0.014, Math.min(0.4, w * 0.3), 0.2, 0.006, { uv: "keep" });
    for (let i = 0; i < 4; i++) {
      const c = r();
      f.box(c < 0.5 ? "emitBlue" : c < 0.8 ? "emitAmber" : "emitRed", u - w / 2 + 0.2 + i * 0.11, mv - 0.08, d + 0.014, 0.05, 0.03, 0.006);
    }
    f.add("decal", new THREE.PlaneGeometry(0.2, 0.2), u - w / 2 + 0.24, doorV + doorH / 2 - 0.2, d + 0.017, { uv: "keep", uvRect: decalRect(Math.floor(r() * 16)) });
    f.collider(u - w / 2, u + w / 2, 0, hh, 0, d + 0.03, "bay");
  }

  // Wall status board: bezelled screen with an LED readout strip under it.
  function statusBoard(f, u, v, w, hh, screenMat) {
    f.box("darkGloss", u, v, 0.03, w + 0.12, hh + 0.12, 0.05);
    f.box(screenMat, u, v, 0.058, w, hh, 0.006, { uv: "keep" });
    f.box("satinBlack", u, v - hh / 2 - 0.13, 0.02, w + 0.12, 0.1, 0.04);
    f.box("leds", u - 0.2, v - hh / 2 - 0.13, 0.042, Math.min(0.9, w - 0.6), 0.04, 0.008, { uv: "keep" });
    f.box("emitBlue", u + w / 2 - 0.1, v - hh / 2 - 0.13, 0.042, 0.05, 0.03, 0.008);
  }

  // Crew locker: black shell, grey door with a handle, status lamp and stencil.
  function locker(f, u, seed) {
    const w = 0.9;
    const hh = 2.1;
    const d = 0.45;
    f.box("satinBlack", u, hh / 2, d / 2, w, hh, d);
    f.box("painted2", u, hh / 2 - 0.02, d + 0.006, w - 0.08, hh - 0.24, 0.012, { color: P.impGreyDark, uv: "keep" });
    f.box("metal", u + w / 2 - 0.12, 1.1, d + 0.02, 0.03, 0.22, 0.02, { color: P.steel });
    f.box("metal", u, hh - 0.05, d / 2, w, 0.06, d + 0.01, { color: P.darkMetal });
    f.box("emitBlue", u - w / 2 + 0.14, hh - 0.2, d + 0.01, 0.06, 0.02, 0.006);
    f.add("decal", new THREE.PlaneGeometry(0.22, 0.22), u, hh - 0.45, d + 0.014, { uv: "keep", uvRect: decalRect(seed % 16) });
    f.collider(u - w / 2, u + w / 2, 0, hh, 0, d + 0.03, "locker");
  }

  // Straight railing between two points on the upper deck: square posts, steel top rail, mid rail,
  // black kick plate, one collider.
  function railing(ax, az, bx, bz, o = {}) {
    const { postStart = true, postEnd = true } = o;
    const len = Math.hypot(bx - ax, bz - az);
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    const n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) {
      if ((i === 0 && !postStart) || (i === n && !postEnd)) continue;
      const t = i / n;
      kit.box("paintedMetal", ax + (bx - ax) * t, y0 + RAIL_H / 2, az + (bz - az) * t, 0.06, RAIL_H, 0.06, { color: P.darkMetal, texel: 2 });
    }
    const cx = (ax + bx) / 2;
    const cz = (az + bz) / 2;
    const axis = alongX ? "x" : "z";
    kit.cyl("metal", cx, y0 + RAIL_H, cz, 0.03, len + 0.06, axis, { color: P.steel, segments: 10 });
    kit.cyl("metal", cx, y0 + 0.62, cz, 0.018, len, axis, { color: P.gunmetal, segments: 8 });
    if (alongX) kit.box("satinBlack", cx, y0 + 0.08, cz, len, 0.16, 0.03);
    else kit.box("satinBlack", cx, y0 + 0.08, cz, 0.03, 0.16, len);
    kit.collider([Math.min(ax, bx) - 0.05, y0, Math.min(az, bz) - 0.05], [Math.max(ax, bx) + 0.05, y0 + RAIL_H + 0.05, Math.max(az, bz) + 0.05], "rail");
  }

  // ---------------------------------------------------------------- shell: side + aft walls only
  const shell = roomShell(kit, ctx, room, { style: "dark", floor: false, ceiling: false, skipWalls: ["-z"], seed: 23 });

  // ---------------------------------------------------------------- upper deck around the two pits
  const deckOpts = { color: P.impGreyDark, uv: "world", texel: 1 };
  const slab = (ax, az, bx, bz) => {
    box("deck", [ax, y0 - 0.12, az], [bx, y0, bz], deckOpts);
    kit.floor(ax, az, bx, bz, y0);
  };
  slab(-PIT.x0, PIT.z0, PIT.x0, PIT.z1); // walkway between the pits (incl. ledges)
  slab(x0 - WALL_T, z0 - WALL_T, x1 + WALL_T, PIT.z0); // command area
  slab(x0 - WALL_T, PIT.z1, x1 + WALL_T, z1 + WALL_T); // aft landing at the door
  for (const s of [-1, 1]) slab(s * PIT.x1, PIT.z0, s * (x1 + WALL_T), PIT.z1); // side galleries
  // walkway: lighter centre runner, black edge lines, stencils
  box("deck", [-1.3, y0, PIT.z0 - 1.2], [1.3, y0 + 0.012, z1 - 0.4], { color: P.impGrey, uv: "world", texel: 1 });
  for (const s of [-1, 1]) box("satinBlack", [s * (WALK_HW - 0.14), y0, PIT.z0 - 1.2], [s * (WALK_HW - 0.02), y0 + 0.008, z1 - 0.4]);
  for (const [dz, idx] of [[477, 3], [484.5, 6], [491.5, 3]]) {
    const g = new THREE.PlaneGeometry(0.7, 0.7);
    g.rotateX(-Math.PI / 2);
    kit.add("decal", g, { pos: [1.7, y0 + 0.014, dz], uv: "keep", uvRect: decalRect(idx) });
    const g2 = new THREE.PlaneGeometry(0.7, 0.7);
    g2.rotateX(-Math.PI / 2);
    kit.add("decal", g2, { pos: [-1.7, y0 + 0.014, dz], uv: "keep", uvRect: decalRect(idx + 1) });
  }

  // ---------------------------------------------------------------- pits
  for (const s of [-1, 1]) {
    const pit = { x0: Math.min(s * PIT.x0, s * PIT.x1), x1: Math.max(s * PIT.x0, s * PIT.x1), z0: PIT.z0, z1: PIT.z1 };
    const zc = (pit.z0 + pit.z1) / 2;
    const red = s > 0; // starboard pit: weapons / defence, red accents; port: navigation / sensors, blue
    const accent = red ? "emitRed" : "emitBlue";

    // floor with a central cable trench under grating
    const tx0 = Math.min(s * 7.3, s * 9.7);
    const tx1 = Math.max(s * 7.3, s * 9.7);
    box("deck", [pit.x0, pitY - 0.12, pit.z0], [tx0, pitY, pit.z1], deckOpts);
    box("deck", [tx1, pitY - 0.12, pit.z0], [pit.x1, pitY, pit.z1], deckOpts);
    box("metal", [tx0 - 0.02, pitY - 0.26, pit.z0], [tx1 + 0.02, pitY - 0.22, pit.z1], { color: P.darkMetal, texel: 1 });
    box("metal", [tx0 - 0.02, pitY - 0.26, pit.z0], [tx0, pitY, pit.z1], { color: P.darkMetal });
    box("metal", [tx1, pitY - 0.26, pit.z0], [tx1 + 0.02, pitY, pit.z1], { color: P.darkMetal });
    const tcx = (tx0 + tx1) / 2;
    const tl = pit.z1 - pit.z0 - 0.3;
    for (const [dx, r, mat, col] of [[-0.7, 0.035, "rubber", P.rubber], [-0.45, 0.03, "rubber", P.rubber], [0.1, 0.045, "metal", P.steel], [0.5, 0.028, "metal", P.orange], [0.8, 0.035, "rubber", P.rubber]]) {
      kit.cyl(mat, tcx + dx, pitY - 0.18, zc, r, tl, "z", { color: col, segments: 8 });
    }
    for (let z = pit.z0 + 1.5; z < pit.z1 - 1; z += 3.5) box("emitAmber", [tcx - 0.9, pitY - 0.2, z], [tcx - 0.84, pitY - 0.17, z + 0.12]);
    const gw = tx1 - tx0;
    const gl = pit.z1 - pit.z0 - 0.2;
    const grate = new THREE.PlaneGeometry(gw, gl);
    grate.rotateX(-Math.PI / 2);
    kit.add("grate", grate, { pos: [tcx, pitY - 0.004, zc], uv: "scale", uvScale: [gw / GRATE_TILE[0], gl / GRATE_TILE[1]], color: 0xffffff });
    for (const rx of [-1, -0.5, 0, 0.5, 1]) kit.box("metal", tcx + rx * (gw / 2 - 0.04), pitY - 0.02, zc, 0.035, 0.05, gl, { color: P.gunmetal, texel: 2 });
    kit.floor(pit.x0, pit.z0, pit.x1, pit.z1, pitY);

    // pit walls: dark panels, black lip; the inner wall leaves the stair block open (also frees its collider)
    const pw = roomWalls(kit, pit, pitY);
    const innerDir = s > 0 ? "-x" : "+x";
    const outerDir = s > 0 ? "+x" : "-x";
    let seed = 300 + (s > 0 ? 40 : 0);
    for (const [dir, { frame, length }] of Object.entries(pw)) {
      const ops = [];
      if (dir === innerDir) {
        const ua = uAt(frame, s * PIT.x0, STAIR.z0);
        const ub = uAt(frame, s * PIT.x0, STAIR.z1);
        ops.push({ u0: Math.min(ua, ub), u1: Math.max(ua, ub), v0: 0, v1: PIT.depth, type: "door" });
      }
      panelGrid(frame, length, PIT.depth, { openings: ops, depth: WALL_T, seed: seed++, kick: true, topPipes: false, rows: [0, 0.3, PIT.depth], styles: { panel: 0.8, vent: 0.08, strip: 0.12 }, paints: DARK_PAINTS, tag: "pit" + dir });
      const lip = (ua, ub) => frame.box("satinBlack", (ua + ub) / 2, PIT.depth - 0.03, 0.0, ub - ua, 0.06, 0.1);
      if (ops.length) {
        if (ops[0].u0 > 0.01) lip(0, ops[0].u0);
        if (ops[0].u1 < length - 0.01) lip(ops[0].u1, length);
      } else lip(0, length);
      // floor-level cable tray along the wall foot
      frame.box("metalRough", length / 2, 0.06, 0.2, length - 0.4, 0.12, 0.26, { color: P.darkMetal, texel: 2 });
      frame.cylU("rubber", length / 2, 0.13, 0.14, 0.024, length - 0.5, { color: P.rubber, segments: 8 });
      frame.cylU("metal", length / 2, 0.13, 0.24, 0.02, length - 0.5, { color: P.orange, segments: 8 });
    }
    // black curbs with a blue guide line on the upper deck around the pit edge, open at the stair
    const cw = 0.22;
    const curb = (ax, az, bx, bz) => box("satinBlack", [ax, y0, az], [bx, y0 + 0.05, bz]);
    curb(s * (PIT.x0 - cw), pit.z0 - cw, s * PIT.x0, STAIR.z0);
    curb(s * PIT.x1, pit.z0 - cw, s * (PIT.x1 + cw), pit.z1 + cw);
    curb(s * PIT.x0, pit.z0 - cw, s * PIT.x1, pit.z0);
    curb(s * PIT.x0, pit.z1, s * PIT.x1, pit.z1 + cw);
    box("emitBlueSoft", [s * (PIT.x0 - 0.13), y0 + 0.05, pit.z0 - 0.1], [s * (PIT.x0 - 0.09), y0 + 0.06, STAIR.z0 - 0.1], { uv: "keep" });
    box("emitBlueSoft", [s * (PIT.x1 + 0.09), y0 + 0.05, pit.z0 - 0.1], [s * (PIT.x1 + 0.13), y0 + 0.06, pit.z1 + 0.1], { uv: "keep" });

    // stations: outer row (6) and inner row (5) face their walls, forward row (3) faces the bow
    const outer = pw[outerDir].frame;
    const inner = pw[innerDir].frame;
    const fwd = pw["-z"].frame;
    const aft = pw["+z"].frame;
    const outerX = s * PIT.x1;
    const innerX = s * PIT.x0;
    const deskScreens = red ? ["screen5", "screen4", "screen2", "screen5", "screen4", "screen1"] : ["screen4", "screen0", "screen4", "screen1", "screen3", "screen4"];
    [476.2, 479.0, 481.8, 484.6, 487.4, 490.2].forEach((z, i) => station(outer, uAt(outer, outerX, z), { screen: deskScreens[i], wall: red && i % 2 ? "screen5" : "screen4", accent }));
    [476.4, 479.2, 482.0, 484.8, 487.6].forEach((z, i) => station(inner, uAt(inner, innerX, z), { screen: deskScreens[(i + 2) % 6], wall: "screen4", accent }));
    [5.4, 8.6, 11.8].forEach((x, i) => station(fwd, uAt(fwd, s * x, PIT.z0), { screen: red ? "screen5" : "screen4", wall: red ? "screen5" : "screen0", accent }));
    // small equipment cabinets between the outer stations
    for (const z of [477.6, 483.2, 488.8]) equipmentBay(outer, uAt(outer, outerX, z), 0.7, 1.3, 0.3, 500 + Math.round(z) + (s > 0 ? 7 : 0));
    // aft wall: equipment racks beside the stair block
    [6.7, 8.2, 9.7, 11.2, 12.7].forEach((x, i) => rack(aft, uAt(aft, s * x, PIT.z1), 600 + i * 3 + (s > 0 ? 50 : 0)));

    // stairs from the walkway ledge down into the pit, against the pit's aft wall
    const sx0 = s * PIT.x0;
    const sx1 = s * (PIT.x0 + STAIR.run);
    kit.stairs("paintedMetal", sx0, STAIR.z0, sx1, STAIR.z1, y0, pitY, "x", { color: P.gunmetal, steps: STAIR.steps });
    const rise = PIT.depth / STAIR.steps;
    const run = STAIR.run / STAIR.steps;
    for (let i = 0; i < STAIR.steps; i++) {
      const xe = s * (PIT.x0 + run * (i + 1));
      const top = y0 - rise * (i + 1);
      box("metal", [xe - s * 0.03, top - 0.012, STAIR.z0 + 0.02], [xe, top + 0.004, STAIR.z1 - 0.02], { color: P.steel, texel: 2 });
      // amber tread light behind each nosing so the descent reads in the dark
      box("emitAmber", [xe - s * 0.065, top + 0.004, STAIR.z0 + 0.15], [xe - s * 0.04, top + 0.014, STAIR.z1 - 0.15], { uv: "keep" });
    }
    // open side of the stair: sloped stringer, handrail with posts, collider
    const L = Math.hypot(STAIR.run, PIT.depth);
    const ang = Math.atan2(PIT.depth, STAIR.run);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -s * ang);
    const scx = (sx0 + sx1) / 2;
    const scy = (y0 + pitY) / 2;
    kit.add("satinBlack", new THREE.BoxGeometry(L, 0.28, 0.05), { pos: [scx, scy - 0.1, STAIR.z0 + 0.03], quat: q });
    kit.add("metal", new THREE.CylinderGeometry(0.025, 0.025, L, 10).rotateZ(Math.PI / 2), { pos: [scx, scy + 0.98, STAIR.z0 + 0.03], quat: q, color: P.steel });
    for (const t of [0.08, 0.5, 0.92]) {
      const px = sx0 + (sx1 - sx0) * t;
      const py = y0 - PIT.depth * t;
      kit.box("paintedMetal", px, py + 0.5, STAIR.z0 + 0.03, 0.05, 1.0, 0.05, { color: P.darkMetal });
    }
    kit.collider([Math.min(sx0, sx1), pitY, STAIR.z0 - 0.04], [Math.max(sx0, sx1), y0 + 1.1, STAIR.z0 + 0.07], "stairRail");

    // railings around the pit on the upper deck; the walkway rail stops short of the stair gap
    const rx = s * (PIT.x0 - RAIL_SET);
    const ox = s * (PIT.x1 + RAIL_SET);
    const fz = PIT.z0 - RAIL_SET;
    const az = PIT.z1 + RAIL_SET;
    railing(rx, fz, rx, STAIR.z0 - 0.15);
    railing(rx, az, ox, az);
    railing(rx, fz, ox, fz, { postStart: false, postEnd: false });
    railing(ox, fz, ox, az, { postEnd: false });
  }

  // ---------------------------------------------------------------- forward window wall
  const winV = { y0: WINDOW.y0, y1: WINDOW.y1 };
  {
    const { frame, length } = wallFrame(kit, [x0, z0], [x1, z0], y0);
    const wu0 = -WINDOW.halfW - x0;
    const wu1 = WINDOW.halfW - x0;
    panelGrid(frame, length, h, {
      openings: [{ u0: wu0, u1: wu1, v0: winV.y0, v1: winV.y1, type: "window" }],
      depth: WALL_T,
      seed: 77,
      kick: true,
      topPipes: false,
      rows: [0, 0.45, winV.y0, 2.2, 3.7, winV.y1, h],
      styles: { panel: 1 },
      paints: DARK_PAINTS,
      tag: "bridge-z",
    });
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);

    // trapezoidal mullion plate: one extrusion with the pane cut-outs. Interior mullions lean
    // alternately so the panes alternate wide-top / narrow-top; the outer mullions stay vertical.
    const W = WINDOW.halfW * 2;
    const H = winV.y1 - winV.y0 - 0.04;
    const { bar, panes: N, slant } = WINDOW;
    const outline = new THREE.Shape([new THREE.Vector2(-W / 2, -H / 2), new THREE.Vector2(W / 2, -H / 2), new THREE.Vector2(W / 2, H / 2), new THREE.Vector2(-W / 2, H / 2)]);
    const pitch = (W - bar) / N;
    const mull = (i) => -W / 2 + bar / 2 + i * pitch;
    const lean = (i) => (i === 0 || i === N ? 0 : i % 2 ? slant : -slant);
    const yb = -H / 2 + bar;
    const yt = H / 2 - bar;
    for (let i = 0; i < N; i++) {
      const lb = mull(i) - lean(i) + bar / 2;
      const lt = mull(i) + lean(i) + bar / 2;
      const rb = mull(i + 1) - lean(i + 1) - bar / 2;
      const rt = mull(i + 1) + lean(i + 1) - bar / 2;
      outline.holes.push(new THREE.Path([new THREE.Vector2(lb, yb), new THREE.Vector2(lt, yt), new THREE.Vector2(rt, yt), new THREE.Vector2(rb, yb)]));
    }
    const plate = new THREE.ExtrudeGeometry(outline, { depth: 0.28, bevelEnabled: false });
    plate.translate(0, 0, -0.14);
    const wvc = (winV.y0 + winV.y1) / 2;
    frame.add("satinBlack", plate, length / 2, wvc, 0.0, { uv: "world", texel: 1 });
    frame.add("glass", new THREE.PlaneGeometry(W - 0.2, H - 0.2), length / 2, wvc, -0.03, { uv: "keep" });

    // sill console bank: deep black shelf under the windows (swallows the exterior bay lining), panelled
    // front, steel nosing with a blue light line, four standing helm / navigation stations on top
    const shelfTop = winV.y0 + 0.05;
    const shelfZ = z0 + SILL_DEPTH;
    box("satinBlack", [x0, y0 + 0.02, z0 - 0.1], [x1, y0 + shelfTop - 0.05, shelfZ - 0.16]);
    box("darkGloss", [x0, y0 + shelfTop - 0.06, z0 + 0.1], [x1, y0 + shelfTop, shelfZ + 0.02]);
    box("metal", [x0, y0 + shelfTop - 0.06, shelfZ - 0.02], [x1, y0 + shelfTop + 0.01, shelfZ + 0.04], { color: P.steel, texel: 2 });
    box("emitBlueSoft", [x0 + 0.6, y0 + shelfTop - 0.11, shelfZ + 0.035], [x1 - 0.6, y0 + shelfTop - 0.09, shelfZ + 0.045], { uv: "keep" });
    const front = wallFrame(kit, [x0, shelfZ], [x1, shelfZ], y0);
    panelGrid(front.frame, front.length, shelfTop - 0.06, { depth: WALL_T, seed: 91, kick: true, topPipes: false, rows: [0, 0.3, shelfTop - 0.06], styles: { panel: 0.6, vent: 0.25, strip: 0.15 }, paints: DARK_PAINTS, tag: "sill" });
    // stations sit on the shelf: sloped panel leaning toward the glass, controls on the shelf top
    const sill = new Frame(kit, new THREE.Vector3(x0, y0 + shelfTop, shelfZ), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    [-11.2, -5.6, 5.6, 11.2].forEach((sx, i) => {
      const u = sx - x0;
      const red = sx > 0;
      const accent = red ? "emitRed" : "emitBlue";
      const w = 2.0;
      const tilt = -0.42;
      tiltedBox(sill, "satinBlack", u, 0, -0.62, w, 0.46, 0.07, tilt);
      tiltedBox(sill, "darkGloss", u, 0, -0.62, w - 0.2, 0.38, 0.006, tilt, { along: 0.04, lift: 0.07 });
      tiltedBox(sill, red ? "screen5" : "screen4", u - 0.32, 0, -0.62, w - 0.9, 0.3, 0.006, tilt, { along: 0.08, lift: 0.074, uv: "keep" });
      tiltedBox(sill, i % 2 ? "screen1" : "screen6", u + 0.6, 0, -0.62, 0.5, 0.3, 0.006, tilt, { along: 0.08, lift: 0.074, uv: "keep" });
      tiltedBox(sill, accent, u - w / 2 + 0.12, 0, -0.62, 0.06, 0.06, 0.006, tilt, { along: 0.2, lift: 0.072 });
      tiltedBox(sill, "emitAmber", u + w / 2 - 0.12, 0, -0.62, 0.06, 0.06, 0.006, tilt, { along: 0.2, lift: 0.072 });
      sill.box("rubber", u, 0.008, -0.34, w - 0.6, 0.014, 0.2, { color: P.rubber });
      sill.box("leds", u, 0.01, -0.5, w - 0.6, 0.012, 0.05, { uv: "keep" });
      for (let k = 0; k < 9; k++) {
        const r = rand();
        sill.box(r < 0.35 ? accent : r < 0.5 ? "emitAmber" : "rubber", u - (w - 0.7) / 2 + (k / 8) * (w - 0.7), 0.014, -0.2, 0.07, 0.026, 0.06, { color: P.rubber });
      }
      // grille + status lamps on the shelf between stations
      sill.box("metal", u + (i % 2 ? 1 : -1) * 2.0, 0.006, -0.7, 0.8, 0.012, 0.36, { color: P.gunmetal, texel: 3 });
    });
    // viewport-side rail along the shelf where no station stands (leaning rail for the watch officer)
    for (const [a, b] of [[-15.4, -12.6], [-9.8, -7.0], [7.0, 9.8], [12.6, 15.4]]) {
      const rz = shelfZ + 0.22;
      kit.cyl("metal", (a + b) / 2, y0 + RAIL_H, rz, 0.03, b - a, "x", { color: P.steel, segments: 10 });
      for (const px of [a, b]) kit.box("paintedMetal", px, y0 + RAIL_H / 2, rz, 0.06, RAIL_H, 0.06, { color: P.darkMetal, texel: 2 });
      kit.collider([a - 0.05, y0, rz - 0.06], [b + 0.05, y0 + RAIL_H + 0.05, rz + 0.06], "sillRail");
    }
    // header soffit over the windows: deep dark hood with a recessed light line washing the glass
    box("paintedMetal", [x0, y0 + winV.y1 - 0.05, z0 - 0.1], [x1, yTop, shelfZ], { color: P.gunmetal, uv: "world", texel: 0.7 });
    box("satinBlack", [x0, y0 + winV.y1 - 0.05, shelfZ - 0.02], [x1, y0 + winV.y1 + 0.3, shelfZ + 0.06]);
    box("satinBlack", [x0 + 0.5, y0 + winV.y1 - 0.1, z0 + 0.5], [x1 - 0.5, y0 + winV.y1 - 0.05, z0 + 0.86]);
    box("emitCoolSoft", [x0 + 0.7, y0 + winV.y1 - 0.11, z0 + 0.64], [x1 - 0.7, y0 + winV.y1 - 0.1, z0 + 0.72], { uv: "keep" });
  }

  // ---------------------------------------------------------------- captain's platform
  const plat = { x0: -2.7, x1: 2.7, z0: z0 + SILL_DEPTH + 0.1, z1: PIT.z0, y: y0 + 0.35 };
  box("deck", [plat.x0, y0, plat.z0], [plat.x1, plat.y, plat.z1], { color: P.impGrey, uv: "world", texel: 1 });
  kit.floor(plat.x0, plat.z0, plat.x1, plat.z1, plat.y);
  box("satinBlack", [plat.x0 - 0.01, plat.y - 0.07, plat.z1 - 0.01], [plat.x1 + 0.01, plat.y + 0.005, plat.z1 + 0.02]);
  box("emitBlueSoft", [plat.x0 + 0.3, y0 + 0.14, plat.z1 + 0.01], [plat.x1 - 0.3, y0 + 0.16, plat.z1 + 0.02], { uv: "keep" });
  for (const s of [-1, 1]) box("satinBlack", [s * (plat.x1 + 0.01), plat.y - 0.07, plat.z0], [s * (plat.x1 - 0.01), plat.y + 0.005, plat.z1]);

  // holo-projector pedestal on the starboard half of the platform
  const holoX = 1.55;
  const holoZ = (plat.z0 + plat.z1) / 2;
  kit.cyl("metal", holoX, plat.y + 0.08, holoZ, 0.62, 0.16, "y", { color: P.darkMetal, segments: 28 });
  kit.cyl("satinBlack", holoX, plat.y + 0.5, holoZ, 0.5, 0.84, "y", { segments: 28 });
  kit.cyl("metal", holoX, plat.y + 0.9, holoZ, 0.56, 0.05, "y", { color: P.steel, segments: 28 });
  kit.cyl("darkGloss", holoX, plat.y + 0.945, holoZ, 0.5, 0.04, "y", { segments: 28 });
  kit.add("emitBlue", new THREE.TorusGeometry(0.43, 0.014, 8, 48).rotateX(Math.PI / 2), { pos: [holoX, plat.y + 0.968, holoZ] });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    kit.box(k % 3 === 0 ? "emitAmber" : "emitBlue", holoX + Math.cos(a) * 0.54, plat.y + 0.62, holoZ + Math.sin(a) * 0.54, 0.03, 0.05, 0.03);
  }
  kit.boxMM("leds", [holoX - 0.3, plat.y + 0.72, holoZ + 0.49], [holoX + 0.3, plat.y + 0.75, holoZ + 0.505], { uv: "keep" });
  kit.collider([holoX - 0.62, plat.y, holoZ - 0.62], [holoX + 0.62, plat.y + 1.0, holoZ + 0.62], "holo");

  // plotting table on the port half: horizontal chart screen, two angled displays on its far edge
  const nav = { x: -1.7, z: holoZ, w: 1.5, d: 0.95, h: 0.9 };
  box("metal", [nav.x - nav.w / 2 + 0.1, plat.y, nav.z - nav.d / 2 + 0.1], [nav.x + nav.w / 2 - 0.1, plat.y + 0.1, nav.z + nav.d / 2 - 0.1], { color: P.darkMetal });
  box("satinBlack", [nav.x - nav.w / 2, plat.y + 0.1, nav.z - nav.d / 2], [nav.x + nav.w / 2, plat.y + nav.h - 0.04, nav.z + nav.d / 2]);
  box("darkGloss", [nav.x - nav.w / 2 - 0.03, plat.y + nav.h - 0.04, nav.z - nav.d / 2 - 0.03], [nav.x + nav.w / 2 + 0.03, plat.y + nav.h, nav.z + nav.d / 2 + 0.03]);
  {
    const g = new THREE.PlaneGeometry(nav.w - 0.24, nav.d - 0.24);
    g.rotateX(-Math.PI / 2);
    kit.add("screen4", g, { pos: [nav.x, plat.y + nav.h + 0.003, nav.z], uv: "keep" });
    kit.add("emitBlue", new THREE.TorusGeometry(0.3, 0.006, 6, 40).rotateX(Math.PI / 2), { pos: [nav.x, plat.y + nav.h + 0.006, nav.z] });
    box("leds", [nav.x - 0.5, plat.y + nav.h - 0.14, nav.z + nav.d / 2 + 0.001], [nav.x + 0.5, plat.y + nav.h - 0.1, nav.z + nav.d / 2 + 0.011], { uv: "keep" });
    box("painted", [nav.x - nav.w / 2 + 0.1, plat.y + 0.3, nav.z + nav.d / 2 + 0.001], [nav.x + nav.w / 2 - 0.1, plat.y + 0.335, nav.z + nav.d / 2 + 0.005], { color: P.orange, uv: "keep" });
    const nf = new Frame(kit, new THREE.Vector3(nav.x - nav.w / 2, plat.y + nav.h, nav.z - nav.d / 2), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    tiltedBox(nf, "satinBlack", nav.w / 2, 0, 0.16, nav.w - 0.2, 0.42, 0.05, -0.4);
    tiltedBox(nf, "screen0", nav.w / 4 + 0.02, 0, 0.16, nav.w / 2 - 0.2, 0.28, 0.006, -0.4, { along: 0.06, lift: 0.052, uv: "keep" });
    tiltedBox(nf, "screen4", (3 * nav.w) / 4 - 0.02, 0, 0.16, nav.w / 2 - 0.2, 0.28, 0.006, -0.4, { along: 0.06, lift: 0.052, uv: "keep" });
  }
  kit.collider([nav.x - nav.w / 2 - 0.04, plat.y, nav.z - nav.d / 2 - 0.04], [nav.x + nav.w / 2 + 0.04, plat.y + nav.h + 0.3, nav.z + nav.d / 2 + 0.04], "navTable");

  // ---------------------------------------------------------------- side and aft wall dressing
  const sideDress = (dir) => {
    const { frame, length } = shell.frames[dir];
    const uOf = (z) => (dir === "-x" ? z1 - z : z - z0);
    // secondary trim band and two pipe runs break up the tall upper panel row
    frame.box("satinBlack", length / 2, 3.26, 0.02, length, 0.12, 0.05);
    frame.cylU("metal", length / 2, 5.5, 0.07, 0.05, length, { color: P.steel, segments: 10 });
    frame.cylU("metal", length / 2, 5.3, 0.055, 0.03, length, { color: P.orange, segments: 8 });
    for (let u = 1.2; u < length; u += 3.2) frame.box("metal", u, 5.4, 0.04, 0.08, 0.34, 0.1, { color: P.gunmetal });
    // tactical display at the forward end, leaning out over the command strip
    const ut = uOf(473.1);
    tiltedBox(frame, "darkGloss", ut, 1.25, 0.08, 2.5, 1.5, 0.08, 0.14);
    frame.box("satinBlack", ut, 1.1, 0.08, 2.7, 0.14, 0.32);
    frame.box("leds", ut - 0.6, 1.1, 0.245, 1.0, 0.03, 0.01, { uv: "keep" });
    frame.box("emitRed", ut + 1.1, 1.1, 0.245, 0.06, 0.03, 0.01);
    wallLightBar(frame, ut - 1.3, ut + 1.3, 3.0);
    // gallery: equipment bays, status boards, light bars between them
    const bays = [488.6, 482.2, 476.6];
    const boards = [485.4, 479.4];
    bays.forEach((z, i) => equipmentBay(frame, uOf(z), 1.4, 2.3, 0.5, 700 + i + (dir === "-x" ? 9 : 0)));
    boards.forEach((z, i) => statusBoard(frame, uOf(z), 2.0, 1.7, 0.9, i ? "screen4" : dir === "-x" ? "screen0" : "screen5"));
    for (const [a, b] of [[474.6, 475.8], [477.5, 478.4], [480.4, 481.4], [483.2, 484.3], [486.4, 487.6], [489.6, 491.2]]) {
      const ua = uOf(a);
      const ub = uOf(b);
      wallLightBar(frame, Math.min(ua, ub), Math.max(ua, ub), 2.75);
    }
  };
  sideDress("-x");
  sideDress("+x");
  {
    const { frame, length } = shell.frames["+z"];
    const uOf = (x) => x1 - x;
    for (const s of [-1, 1]) {
      [7.15, 8.1, 9.05, 10.0].forEach((x, i) => locker(frame, uOf(s * x), 11 + i + (s > 0 ? 4 : 0)));
      equipmentBay(frame, uOf(s * 4.3), 1.4, 2.3, 0.45, 810 + (s > 0 ? 1 : 0));
      statusBoard(frame, uOf(s * 12.7), 1.95, 1.8, 0.9, s > 0 ? "screen5" : "screen0");
      wallLightBar(frame, Math.min(uOf(s * 5.4), uOf(s * 6.4)), Math.max(uOf(s * 5.4), uOf(s * 6.4)), 2.75);
      wallLightBar(frame, Math.min(uOf(s * 10.8), uOf(s * 14.6)), Math.max(uOf(s * 10.8), uOf(s * 14.6)), 2.75);
    }
    frame.box("satinBlack", length / 2, 3.26, 0.02, length, 0.12, 0.05);
    // door surround: status lamps and a stencil over the lintel
    frame.box("emitRed", uOf(-1.7), 2.45, 0.03, 0.08, 0.08, 0.02);
    frame.box("emitBlue", uOf(1.7), 2.45, 0.03, 0.08, 0.08, 0.02);
    frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uOf(0), 2.75, 0.02, { uv: "keep", uvRect: decalRect(12) });
  }

  // ---------------------------------------------------------------- ceiling
  box("paintedMetal", [x0 - WALL_T, yTop, z0 - WALL_T], [x1 + WALL_T, yTop + 0.12, z1 + WALL_T], { color: P.gunmetal, uv: "world", texel: 0.7 });
  for (let z = z0 + SILL_DEPTH + 1.9; z < z1 - 1.2; z += 3.2) box("paintedMetal", [x0, yTop - 0.36, z - 0.14], [x1, yTop, z + 0.14], { color: P.darkMetal, texel: 1.2 });
  for (const bx of [-3.0, 3.0, -14.2, 14.2]) box("paintedMetal", [bx - 0.15, yTop - 0.44, z0 + SILL_DEPTH], [bx + 0.15, yTop, z1 - 0.2], { color: P.darkMetal, texel: 1.2 });
  // walkway light channels, one over each edge of the walkway
  for (const s of [-1, 1]) {
    const lx = s * 1.7;
    box("satinBlack", [lx - 0.2, yTop - 0.06, z0 + SILL_DEPTH + 0.2], [lx + 0.2, yTop, z1 - 0.7]);
    box("emitWhiteSoft", [lx - 0.12, yTop - 0.065, z0 + SILL_DEPTH + 0.3], [lx + 0.12, yTop - 0.045, z1 - 0.8], { uv: "keep" });
  }
  // over the pits: small recessed downlights (dim) and hung cable trays with cable runs
  for (const s of [-1, 1]) {
    for (const x of [6.0, 8.6, 11.2]) for (const z of [478.5, 487.5]) {
      box("satinBlack", [s * x - 0.25, yTop - 0.05, z - 0.25], [s * x + 0.25, yTop, z + 0.25]);
      box("emitCoolSoft", [s * x - 0.12, yTop - 0.055, z - 0.12], [s * x + 0.12, yTop - 0.045, z + 0.12], { uv: "keep" });
    }
    for (const tx of [5.2, 12.6]) {
      const x = s * tx;
      box("metalRough", [x - 0.16, yTop - 0.62, PIT.z0], [x + 0.16, yTop - 0.54, PIT.z1], { color: P.darkMetal, texel: 2 });
      box("metalRough", [x - 0.16, yTop - 0.62, PIT.z0], [x - 0.13, yTop - 0.46, PIT.z1], { color: P.darkMetal, texel: 2 });
      box("metalRough", [x + 0.13, yTop - 0.62, PIT.z0], [x + 0.16, yTop - 0.46, PIT.z1], { color: P.darkMetal, texel: 2 });
      kit.cyl("rubber", x - 0.06, yTop - 0.51, (PIT.z0 + PIT.z1) / 2, 0.03, PIT.z1 - PIT.z0 - 0.2, "z", { color: P.rubber, segments: 8 });
      kit.cyl("metal", x + 0.05, yTop - 0.51, (PIT.z0 + PIT.z1) / 2, 0.025, PIT.z1 - PIT.z0 - 0.2, "z", { color: P.steel, segments: 8 });
      for (let z = PIT.z0 + 1.6; z < PIT.z1; z += 3.2) kit.box("metal", x, yTop - 0.24, z, 0.04, 0.48, 0.04, { color: P.gunmetal });
    }
  }

  // ---------------------------------------------------------------- lights
  // twelve practicals. The ceiling is 6 m up, so the white fixtures carry roughly three times the
  // candela of a standard 3.2 m room and a long reach: whichever subset the pool keeps active from a
  // given spot, the walkway stays lit and the pits / walls never fall to black. The pits themselves get
  // two coloured practicals each (blue port, red starboard) so they read as lit by their consoles.
  for (const z of [478, 484.5, 491]) ctx.lights.cool.push(pointLight(0xdfe8ff, 18, 26, [0, yTop - 0.7, z]));
  for (const s of [-1, 1]) {
    ctx.lights.cool.push(pointLight(0xdfe8ff, 14, 24, [s * 7, yTop - 0.9, z0 + SILL_DEPTH + 1.3]));
    ctx.lights.cool.push(pointLight(0xd8e2ff, 14, 22, [s * 15.0, y0 + 4.7, 483]));
    const fam = s > 0 ? "warm" : "teal";
    const col = s > 0 ? 0xff5a3a : 0x4a8dff;
    ctx.lights[fam].push(pointLight(col, 12, 14, [s * 8.6, pitY + 1.9, 485]));
    ctx.lights[fam].push(pointLight(col, 12, 14, [s * 11.5, pitY + 1.9, 477.5]));
  }
  ctx.lights.teal.push(pointLight(0x66b6ff, 3, 8, [holoX, plat.y + 1.6, holoZ]));
  // key light: cool space light through the windows, one spot parked well outside the glass and aimed
  // down the centreline so the mullions throw their shadows across the platform and the walkway. The
  // pooled spot always shadows, and its shadow camera reaches exactly `distance`: 26 m ends inside the
  // bridge, so the rooms behind the aft wall never enter the shadow pass.
  const key = new THREE.SpotLight(0x9fc6ff, 150 * LIGHT_SCALE, 26, 0.72, 0.55, 1.2);
  key.position.set(0, y0 + 7.5, z0 - 9);
  key.target.position.set(0, y0 - 1.0, z0 + 12);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 26;
  ctx.lights.spots.push(key);

  // ---------------------------------------------------------------- animated interface elements
  {
    // hologram over the pedestal: additive light cone, rings and a slowly turning wireframe world
    const holoMat = new THREE.MeshBasicMaterial({ color: 0x5fb0ff, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const ring = (r, y, tube = 0.012, tiltX = 0) => {
      const g = new THREE.TorusGeometry(r, tube, 6, 48);
      g.rotateX(Math.PI / 2 + tiltX);
      g.translate(0, y, 0);
      return g;
    };
    const cone = new THREE.CylinderGeometry(0.7, 0.16, 1.5, 32, 1, true);
    cone.translate(0, 0.75, 0);
    const parts = [cone, ring(0.6, 0.02), ring(0.55, 0.95), ring(0.4, 0.95, 0.008), ring(0.5, 0.95, 0.006, 0.6), ring(0.5, 0.95, 0.006, -0.6)];
    const holo = new THREE.Group();
    holo.position.set(holoX, plat.y + 0.97, holoZ);
    holo.add(new THREE.Mesh(mergeGeometries(parts, false), holoMat));
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x8fd0ff, wireframe: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), globeMat);
    globe.position.y = 0.95;
    holo.add(globe);
    let t = 0;
    dynamic.push({
      object: holo,
      update(dt) {
        t += dt;
        holo.rotation.y += dt * 0.35;
        globe.rotation.y -= dt * 0.9;
        globe.rotation.x = 0.35;
        holoMat.opacity = 0.25 + 0.05 * Math.sin(t * 2.1);
      },
    });

    // sweeping radar sector over the plotting table
    const sweepMat = new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const sweepGeo = new THREE.CircleGeometry(0.3, 20, 0, 0.5);
    sweepGeo.rotateX(-Math.PI / 2);
    const sweep = new THREE.Mesh(sweepGeo, sweepMat);
    sweep.position.set(nav.x, plat.y + nav.h + 0.012, nav.z);
    dynamic.push({ object: sweep, update: (dt) => (sweep.rotation.y -= dt * 1.1) });

    // blinking alert beacons on the pit racks and at the top of each stair
    const beaconMat = ctx.materials.emitRed.clone();
    const beaconGeos = [];
    const beacon = (x, y, z) => beaconGeos.push(new THREE.BoxGeometry(0.1, 0.06, 0.1).translate(x, y, z));
    for (const s of [-1, 1]) {
      beacon(s * 6.7, pitY + 1.48, PIT.z1 - 0.25);
      beacon(s * 12.7, pitY + 1.48, PIT.z1 - 0.25);
      beacon(s * (PIT.x0 - RAIL_SET), y0 + RAIL_H + 0.09, STAIR.z0 - 0.15);
      beacon(s * (PIT.x0 - RAIL_SET), y0 + RAIL_H + 0.09, PIT.z1 + RAIL_SET);
    }
    const beacons = new THREE.Mesh(mergeGeometries(beaconGeos, false), beaconMat);
    let bt = 0;
    dynamic.push({
      object: beacons,
      update(dt) {
        bt += dt;
        beaconMat.emissiveIntensity = bt % 1.6 < 0.22 ? 3.2 : 0.2;
      },
    });

    // scrolling tactical displays on the side walls: a cloned screen material whose UI texture drifts
    const base = ctx.materials.screen4;
    const tex = base.emissiveMap.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    const scrollMat = base.clone();
    scrollMat.emissiveMap = tex;
    const quads = [];
    for (const dir of ["-x", "+x"]) {
      const { frame } = shell.frames[dir];
      const ut = dir === "-x" ? z1 - 473.1 : 473.1 - z0;
      const tilt = 0.14;
      const q = frame.quat(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
      const c = Math.cos(tilt);
      const sn = Math.sin(tilt);
      const p = frame.pos(ut, 1.25 + 0.75 * c - 0.085 * sn, 0.08 + 0.75 * sn + 0.085 * c);
      const g = new THREE.PlaneGeometry(2.3, 1.3);
      g.applyMatrix4(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
      quads.push(g);
    }
    const tact = new THREE.Mesh(mergeGeometries(quads, false), scrollMat);
    dynamic.push({ object: tact, update: (dt) => (tex.offset.y = (tex.offset.y + dt * 0.03) % 1) });
  }

  return shell;
}
