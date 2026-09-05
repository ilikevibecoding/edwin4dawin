// Deck 2 life support — Phase 2 detail. A 10 m tall plant room split into a water section (four
// tanks + manifolds + pumps along the west wall), an air section (six scrubber cabinets + duct trunk
// along the east wall), waste reclamation (two horizontal digesters in a curbed sump at the aft end),
// a control station by the door and a service catwalk at +4.5 m along the east and aft walls.
// Teal-tinted metal = water, white/grey = air. Everything is kit-bashed; lights are descriptors.
// Lighting round: the shadow key is a yoked flood head in the tank farm's south-west corner aimed
// 50° across the row (tanks, manifold and pump skids throw diagonal shadow bands across the deck and
// the walkway; every tank shows a lit and an unlit side from the door); the eight fills
// hang in two rows of housed pendant bars either side of the walkway. One animated emitter mesh (glow.js atlas,
// 1 draw call) carries the coolant-flow sight-glass sleeves on the manifold and return line, the pump
// skids' status lamps (three blink rates), the sump beacon's rotating amber drum (its spot sweeps the
// grating with it), a scrubber's pulsing fan glow and the pendant/key lamp faces (static row).
import * as THREE from "three";
import { GRATE_TILE } from "../../../textures.js";
import { col } from "../_shared/palette.js";
import { rail, WALL_T } from "../_shared/shell.js";
import { placer, indicatorField, console as consoleProp, wallScreen, lockerBank, table, pipe, duct, tank, pillar, floorLine, cabinet } from "../_shared/props.js";
import { GlowAtlas, rgb, frac, smoothstep } from "./glow.js";

const X0 = 38;
const X1 = 62;
const Z0 = 377.5;
const Z1 = 415;
const IX0 = X0 + WALL_T; // 38.3
const IX1 = X1 - WALL_T; // 61.7
const IZ0 = Z0 + WALL_T; // 377.8
const IZ1 = Z1 - WALL_T; // 414.7

const TANK_X = 41.3;
const TANK_Z = [388.5, 394.5, 400.5, 406.5];
const PUMP_Z = [391.5, 397.5, 403.5];
const SCRUB_Z = [387.3, 389.9, 392.5, 395.1, 397.7, 400.3];
const CAT_Y = 4.5; // catwalk deck height above the floor
const WATER = new THREE.Color("#3f8f88"); // teal-tinted pipe metal
const WATER_DARK = new THREE.Color("#2c6b66");
const PAINT_TEAL = new THREE.Color("#5fd8c8"); // painted floor markings
const PAINT_AMBER = new THREE.Color("#ffb040");

// Animated emitter atlas rows (glow.js). Static rows scroll at RATE widths / s: the flow row's 12
// stripes travel along the sight-glass sleeves, the beacon row's single sector turns the sump drum
// at 0.2 rev/s. Live rows (pump lamps, fan glow) are rewritten per frame.
const ROW = { FLOW: 0, BEACON: 1, PUMP0: 2, FAN: 5, LAMP: 6 };
const ROWS = 7;
// pendant bar diffusers: a uniform atlas row (LAMP) written once. The atlas texture is sRGB, so
// 0.85 × #dfe9ff decodes to ~0.52 linear × the atlas' 1.4 = 0.73 emissive (+ the fill's bounce off
// the face) → ~88 % after tone mapping, under the bloom threshold — emitWhite (1.3) renders flat
// white and the shell's channel strips already spend that material
const LAMP_LEVEL = 0.85;
const RATE = 0.2;
const BEACON = { sectors: 1, s0: 0.4, width: 0.2 }; // s0: the sector faces the door (-z) at t = 40
const PUMP_BLINK = [
  { hz: 0.5, phase: 0.25 },
  { hz: 0.8, phase: 0.75 },
  { hz: 1.3, phase: 0.3 },
];
const GLOW_SCRUB = 1; // scrubber whose fan glow pulses
const SUMP_Z = 411.6; // sump beacon hangs off the aft catwalk at x 50
// status lamp blink with soft edges: on for the first half of each cycle
const blink = (t, { hz, phase }) => {
  const s = frac(t * hz + phase);
  return 0.12 + 0.88 * smoothstep(0, 0.06, s) * (1 - smoothstep(0.5, 0.56, s));
};

export function detail(ctx, shell, room) {
  const { kit, PALETTE } = ctx;
  const Y = room.floorY;
  const CY = room.ceilY;
  const P = (k) => col(PALETTE, k);
  const white = P("impWhite");
  const grey = P("impGrey");
  const mid = P("impMid");
  const dark = P("impDark");
  const black = P("impBlack");
  const steel = P("steel");
  const WMX = 44.9; // ceiling water main (r 0.3) runs along z at this x
  const WMY = CY - 1.3;

  // ---- animated emitters: one atlas mesh for every moving light's visible source -------------------
  const glow = new GlowAtlas(ROWS, { intensity: 1.4, rate: RATE });
  const C_TEAL = rgb(PAINT_TEAL);
  const C_AMBER = rgb(P("impAmber"));
  // stripe peak 0.7 (× 1.4 = 0.98): at 1.0 the teal sat over the bloom threshold and the six
  // stripes on a sleeve fused into one white streak in the catwalk view
  glow.pattern(ROW.FLOW, C_TEAL, (u) => {
    const s = frac(12 * u);
    return 0.15 + 0.55 * smoothstep(0, 0.08, s) * (1 - smoothstep(0.3, 0.38, s));
  });
  glow.beaconRow(ROW.BEACON, C_AMBER, BEACON.sectors, BEACON.s0, BEACON.width);
  glow.fill(ROW.LAMP, rgb(new THREE.Color("#dfe9ff")), LAMP_LEVEL);
  // coolant-flow sight glass: a short sleeve around a pipe run along z whose stripes travel in `dir`
  const sightGlass = (x, y, z, r, len, dir) => {
    const g = new THREE.CylinderGeometry(r, r, len, 16, 1, true);
    g.rotateX(Math.PI / 2); // axis → +z (uv.y runs -z → +z)
    g.translate(x, y, z);
    const span = len * 0.5;
    if (dir > 0) glow.addAxial(g, ROW.FLOW, span, 0);
    else glow.addAxial(g, ROW.FLOW, 0, span);
    for (const s of [-1, 1]) kit.cyl("metal", x, y, z + s * (len / 2 + 0.03), r + 0.03, 0.06, "z", { color: steel, segments: 16 });
  };
  let sump = null; // the sump beacon's spot descriptor

  // ---- small local helpers ----------------------------------------------------------------------
  // painted hazard strip (amber blocks on black) over a floor/curb rectangle — painted rather than
  // the shared hazard texture so that draw call goes to the animated emitters
  const hazardStrip = (min, max, y) => {
    const w = max[0] - min[0];
    const d = max[1] - min[1];
    kit.boxMM("paintedMetal", [min[0], y, min[1]], [max[0], y + 0.005, max[1]], { color: black });
    const along = w >= d ? w : d;
    const n = Math.max(2, Math.round(along / 0.4));
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * (along / n);
      const half = (along / n) * 0.25;
      if (w >= d) kit.boxMM("paintedMetal", [min[0] + a - half, y + 0.005, min[1] + 0.03], [min[0] + a + half, y + 0.009, max[1] - 0.03], { color: PAINT_AMBER });
      else kit.boxMM("paintedMetal", [min[0] + 0.03, y + 0.005, min[1] + a - half], [max[0] - 0.03, y + 0.009, min[1] + a + half], { color: PAINT_AMBER });
    }
  };
  const elbow = (x, y, z, r, color = WATER) => kit.add("metal", new THREE.SphereGeometry(r, 14, 10), { pos: [x, y, z], color });
  const strut = (a, b, size = 0.12, color = dark) => {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    kit.add("paintedMetal", new THREE.BoxGeometry(size, len, size), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, color });
  };
  // grated deck plate: one cut-out quad (tile 1.24 × 0.9 m)
  const grateQuad = (x0, z0, x1, z1, y) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    kit.add("grate", g, { pos: [(x0 + x1) / 2, y, (z0 + z1) / 2], uv: "scale", uvScale: [(x1 - x0) / GRATE_TILE[0], (z1 - z0) / GRATE_TILE[1]], color: 0xffffff });
  };
  // valve handwheel whose axis is `axis`; rim + two spokes
  const handwheel = (x, y, z, axis, r = 0.18, color = P("impRed")) => {
    const rot = axis === "x" ? [0, Math.PI / 2, 0] : axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    kit.add("metal", new THREE.TorusGeometry(r, 0.025, 8, 24), { pos: [x, y, z], rot, color });
    const [s1, s2] = axis === "x" ? ["z", "y"] : axis === "y" ? ["x", "z"] : ["x", "y"];
    kit.cyl("metal", x, y, z, 0.03, r * 2, s1, { color: steel, segments: 8 });
    kit.cyl("metal", x, y, z, 0.03, r * 2, s2, { color: steel, segments: 8 });
  };
  // wall junction box (front = local +Z) with two conduits running up to a tray height
  const junction = (x, y, z, yaw, { w = 0.4, h = 0.5, conduitTo = null, emit = "emitTeal", seed = 1 } = {}) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, 0, 0.08, w, h, 0.16, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", 0, 0, 0.165, w - 0.08, h - 0.08, 0.01, { color: black });
    Q.box(emit, -w / 2 + 0.08, h / 2 - 0.08, 0.172, 0.06, 0.02, 0.006);
    indicatorField(Q, 0.04, -h / 2 + 0.12, 0.17, w - 0.16, 0.1, seed, { density: 0.8 });
    if (conduitTo != null) {
      const len = conduitTo - (y + h / 2);
      Q.cyl("metal", -w / 4, h / 2 + len / 2, 0.08, 0.03, len, "y", { color: steel, segments: 8 });
      Q.cyl("metal", w / 4, h / 2 + len / 2, 0.08, 0.022, len, "y", { color: dark, segments: 8 });
    }
  };
  // vent grille: dark frame, black throat, light slats
  const grille = (x, y, z, yaw, w = 1.6, h = 0.8) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", 0, 0, 0.085, w - 0.12, h - 0.12, 0.01, { color: black });
    const n = Math.floor((h - 0.2) / 0.1);
    for (let i = 0; i < n; i++) Q.box("paintedMetal", 0, -h / 2 + 0.14 + i * 0.1, 0.1, w - 0.2, 0.03, 0.02, { color: grey });
  };
  // cable tray between two points (axis-aligned): bed, two lips, steel straps
  const tray = (a, b, w = 0.35) => {
    const min = [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2])];
    const max = [Math.max(a[0], b[0]), a[1], Math.max(a[2], b[2])];
    if (max[0] - min[0] > max[2] - min[2]) {
      kit.boxMM("paintedMetal", [min[0], a[1], a[2] - w / 2], [max[0], a[1] + 0.04, a[2] + w / 2], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [min[0], a[1], a[2] - w / 2], [max[0], a[1] + 0.12, a[2] - w / 2 + 0.02], { color: dark });
      kit.boxMM("paintedMetal", [min[0], a[1], a[2] + w / 2 - 0.02], [max[0], a[1] + 0.12, a[2] + w / 2], { color: dark });
      for (let x = min[0] + 1.0; x < max[0]; x += 2.0) kit.boxMM("metal", [x, a[1] + 0.03, a[2] - w / 2], [x + 0.06, a[1] + 0.05, a[2] + w / 2], { color: steel });
    } else {
      kit.boxMM("paintedMetal", [a[0] - w / 2, a[1], min[2]], [a[0] + w / 2, a[1] + 0.04, max[2]], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [a[0] - w / 2, a[1], min[2]], [a[0] - w / 2 + 0.02, a[1] + 0.12, max[2]], { color: dark });
      kit.boxMM("paintedMetal", [a[0] + w / 2 - 0.02, a[1], min[2]], [a[0] + w / 2, a[1] + 0.12, max[2]], { color: dark });
      for (let z = min[2] + 1.0; z < max[2]; z += 2.0) kit.boxMM("metal", [a[0] - w / 2, a[1] + 0.03, z], [a[0] + w / 2, a[1] + 0.05, z + 0.06], { color: steel });
    }
  };
  // painted floor marking (non-emissive, 6 mm proud)
  const mark = (a, b, w, color) => floorLine(kit, a, b, w, "paintedMetal", color);
  // open straight stair climbing along +Z from z0: treads with riser plates and nosing lights, two
  // sloped stringers, rails on both sides; one collider over the whole volume (no gravity anyway)
  const openStairs = (x, z0, rise, run, w) => {
    const n = Math.round(rise / 0.2);
    const sh = rise / n;
    const sd = run / n;
    for (let i = 0; i < n; i++) {
      const zc = z0 + sd * (i + 0.5);
      kit.box("impFloor", x, Y + sh * (i + 1) - 0.03, zc, w, 0.06, sd + 0.04, { color: mid, texel: 0.5 });
      kit.box("paintedMetal", x, Y + sh * (i + 0.5), z0 + sd * i + 0.015, w - 0.1, sh - 0.04, 0.03, { color: dark });
      kit.box("emitWhite", x, Y + sh * (i + 1) + 0.003, z0 + sd * i + 0.06, w - 0.3, 0.006, 0.03);
    }
    const slope = Math.atan2(rise, run);
    const L = Math.hypot(rise, run);
    for (const s of [-1, 1]) {
      const sx = x + s * (w / 2 + 0.04);
      kit.add("paintedMetal", new THREE.BoxGeometry(0.06, 0.34, L + 0.2), { pos: [sx, Y + rise / 2 - 0.12, z0 + run / 2], rot: [-slope, 0, 0], color: dark, texel: 2.5 });
      kit.add("metal", new THREE.CylinderGeometry(0.03, 0.03, L, 10), { pos: [sx, Y + rise / 2 + 1.02, z0 + run / 2], rot: [Math.PI / 2 - slope, 0, 0], color: steel });
      kit.add("metal", new THREE.CylinderGeometry(0.018, 0.018, L, 8), { pos: [sx, Y + rise / 2 + 0.56, z0 + run / 2], rot: [Math.PI / 2 - slope, 0, 0], color: dark });
      for (let k = 0; k <= 4; k++) kit.box("paintedMetal", sx, Y + (rise * k) / 4 + 0.51, z0 + (run * k) / 4, 0.05, 1.02, 0.05, { color: dark });
    }
    kit.collider([x - w / 2 - 0.1, Y, z0], [x + w / 2 + 0.1, Y + rise + 1.1, z0 + run], "stair");
  };
  // Imperial cargo module without the rubber bumpers (keeps the material count down)
  const crate = (x, z, yaw, { s = 1.2, color = mid, y = Y, emit = "emitTeal" } = {}) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, s / 2, 0, s, s, s, { color, texel: 2.5 });
    for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (sz) Q.box("paintedMetal", 0, s / 2, (sz * s) / 2 + sz * 0.001, s - 0.3, s - 0.3, 0.03, { color: dark, texel: 2.5 });
      else Q.box("paintedMetal", (sx * s) / 2 + sx * 0.001, s / 2, 0, 0.03, s - 0.3, s - 0.3, { color: dark, texel: 2.5 });
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Q.box("paintedMetal", (sx * (s - 0.1)) / 2, s / 2, (sz * (s - 0.1)) / 2, 0.1, s + 0.02, 0.1, { color: black });
    Q.box("metal", 0, s - 0.15, s / 2 + 0.03, 0.4, 0.05, 0.05, { color: steel });
    Q.box(emit, s / 2 - 0.2, s - 0.12, s / 2 + 0.017, 0.12, 0.03, 0.006);
    Q.collider([-s / 2, 0, -s / 2], [s / 2, s, s / 2], "crate");
  };

  // =============================================================================================
  // WATER SECTION (west wall): four tanks, manifold + return line, three pump skids
  // =============================================================================================
  // per-tank state: tank 1 is plated in the shell's cooler impWhite, tank 2 carries amber ID bands
  // and a sight-glass gauge, tank 4 is offline with its manway open for inspection (red status,
  // lockout tag, work lamp)
  const TANK_BAND = [WATER, new THREE.Color("#c48a2c"), WATER, WATER];
  for (let i = 0; i < TANK_Z.length; i++) {
    const z = TANK_Z[i];
    const offline = i === 3;
    tank(kit, PALETTE, [TANK_X, Y, z], Math.PI / 2, { r: 2.0, h: 6, color: P("medWhite"), bands: 4, emit: offline ? "emitRedImp" : "emitTeal" });
    // plated shell over the prop's galvanised body: four 3 m bevelled plates round × two courses on
    // the clean panel material (uniform roughness 0.62). The worn-metal paint (texel 4) had no speckle
    // but its roughness map has smooth grains, and once the key raked the row from the south-west
    // they mirrored it as a clipped white lobe on tank 2 in the door view. Tank 1 is plated in the
    // shell's impWhite (22 % below medWhite in linear): it stands 6 m from the key head and its
    // shoulder takes ~7× the irradiance of the deck band, so in medWhite the key pool on it
    // saturated to a hard-edged white disc in the water view (the deck contrast in the door view is
    // set by the fills' absence on that strip, so the key could not simply be turned down).
    kit.cyl("impPanel", TANK_X, Y + 3.3, z, 2.012, 6.02, "y", { color: P(i === 0 ? "impWhite" : "medWhite"), segments: 32, uvScale: [4, 2] });
    // identification bands
    kit.cyl("paintedMetal", TANK_X, Y + 3.6, z, 2.06, 0.16, "y", { color: TANK_BAND[i], segments: 28 });
    kit.cyl("paintedMetal", TANK_X, Y + 5.3, z, 2.06, 0.08, "y", { color: TANK_BAND[i], segments: 28 });
    if (i === 1) {
      // sight glass on the door-side face: bracketed dark tube, lit liquid column, scale ticks
      const G = placer(kit, [TANK_X, Y, z], Math.PI / 2 + (62 * Math.PI) / 180);
      for (const y of [1.0, 2.6, 4.2]) G.box("paintedMetal", 0, y, 2.06, 0.3, 0.08, 0.16, { color: dark });
      G.box("darkGloss", 0, 2.6, 2.16, 0.14, 3.4, 0.1);
      G.box("emitTeal", 0, 1.85, 2.215, 0.06, 1.9, 0.01);
      for (let k = 0; k < 8; k++) G.box("paintedMetal", 0.11, 1.0 + k * 0.45, 2.2, 0.04, 0.02, 0.03, { color: white });
      for (const y of [0.86, 4.34]) G.cyl("metal", 0, y, 2.16, 0.05, 0.12, "y", { color: steel, segments: 8 });
    }
    if (offline) {
      // manway at working height with its cover swung 110 deg open on a vertical hinge
      const M = placer(kit, [TANK_X, Y, z], Math.PI / 2 + (45 * Math.PI) / 180);
      M.add("metal", new THREE.TorusGeometry(0.44, 0.05, 6, 32), 0, 1.6, 2.03, { color: steel });
      M.cyl("paintedMetal", 0, 1.6, 1.99, 0.4, 0.1, "z", { color: black, segments: 24 });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        M.cyl("metal", 0.5 * Math.cos(a), 1.6 + 0.5 * Math.sin(a), 2.05, 0.03, 0.04, "z", { color: steel, segments: 6 });
      }
      const H = placer(kit, M.world(-0.5, 0, 2.1), M.yaw - (110 * Math.PI) / 180);
      H.cyl("paintedMetal", 0.46, 1.6, 0, 0.44, 0.06, "z", { color: dark, segments: 28 });
      H.add("metal", new THREE.TorusGeometry(0.4, 0.03, 6, 28), 0.46, 1.6, 0.04, { color: steel });
      H.cyl("metal", 0.46, 1.6, 0.07, 0.07, 0.08, "z", { color: steel, segments: 10 });
      H.box("metal", 0.46, 1.6, 0.09, 0.4, 0.03, 0.03, { color: steel });
      H.box("metal", 0.46, 1.6, 0.09, 0.03, 0.4, 0.03, { color: steel });
      for (const y of [1.35, 1.85]) H.cyl("metal", 0, y, 0, 0.05, 0.16, "y", { color: dark, segments: 8 });
      // lockout tag on the ring, clip-on work lamp above the opening
      M.box("paintedMetal", 0.62, 1.15, 2.06, 0.16, 0.22, 0.01, { color: PAINT_AMBER });
      M.box("paintedMetal", 0.62, 1.12, 2.066, 0.1, 0.03, 0.01, { color: black });
      M.box("paintedMetal", 0, 2.22, 2.08, 0.2, 0.12, 0.1, { color: black });
      M.box("emitWhite", 0, 2.155, 2.09, 0.16, 0.02, 0.08);
    }
    // stencil plate + lit label, tangent to the shell 30° round from +X toward the door
    {
      const S = placer(kit, [TANK_X, Y, z], Math.PI / 2 + (30 * Math.PI) / 180);
      S.box("paintedMetal", 0, 2.7, 2.02, 0.9, 0.6, 0.04, { color: dark });
      S.box("emitTeal", 0, 2.9, 2.045, 0.6, 0.05, 0.01);
      S.box("paintedMetal", 0, 2.55, 2.045, 0.6, 0.16, 0.01, { color: white });
    }
    // top: manway hatch with a handle, vent flange into the manifold
    kit.cyl("paintedMetal", TANK_X + 0.9, Y + 6.68, z + 0.5, 0.42, 0.16, "y", { color: dark, segments: 20 });
    kit.box("metal", TANK_X + 0.9, Y + 6.79, z + 0.5, 0.5, 0.05, 0.05, { color: steel });
    kit.cyl("paintedMetal", TANK_X, Y + 6.72, z, 0.3, 0.1, "y", { color: WATER_DARK, segments: 16 });
    // ladder on the room side, 35° round from +X: two thin rails + rungs + a top hoop
    {
      const a = (35 * Math.PI) / 180;
      const L = placer(kit, [TANK_X, Y, z], Math.PI / 2 - a);
      const rr = 2.24;
      // (painted: 2 cm bare-metal rails under the raking key drew 1-px white lines down every tank)
      for (const lx of [-0.2, 0.2]) L.cyl("paintedMetal", lx, 3.6, rr, 0.02, 6.6, "y", { color: steel, segments: 8 });
      for (let y = 0.6; y < 6.7; y += 0.3) L.box("paintedMetal", 0, y, rr, 0.4, 0.03, 0.03, { color: steel });
      for (const y of [1.5, 3.5, 5.5]) L.box("paintedMetal", 0, y, rr - 0.12, 0.48, 0.05, 0.22, { color: dark });
      L.cyl("metal", 0, 6.95, rr - 0.25, 0.02, 0.5, "z", { color: steel, segments: 8 });
      L.cyl("metal", 0, 6.95, rr, 0.02, 0.44, "x", { color: steel, segments: 8 });
    }
  }
  // supply manifold at +7 m (r 0.25) above the tank centreline, both ends turned into the west wall
  const MY = Y + 7.0;
  pipe(kit, PALETTE, [TANK_X, MY, 386.0], [TANK_X, MY, 409.0], 0.25, { color: WATER, bracket: 3 });
  pipe(kit, PALETTE, [TANK_X, MY, 386.0], [IX0, MY, 386.0], 0.25, { color: WATER, bracket: 9 });
  pipe(kit, PALETTE, [TANK_X, MY, 409.0], [IX0, MY, 409.0], 0.25, { color: WATER, bracket: 9 });
  elbow(TANK_X, MY, 386.0, 0.28);
  elbow(TANK_X, MY, 409.0, 0.28);
  for (const z of [387.5, 392.5, 397.5, 402.5, 407.5]) {
    const h = CY - 0.02 - (MY + 0.25);
    kit.box("paintedMetal", TANK_X, MY + 0.25 + h / 2, z, 0.08, h, 0.08, { color: dark });
  }
  // return line (r 0.16) at +6.4 m above the pump skids, with drops onto each pump
  const RX = 42.4;
  const RY = Y + 6.4;
  // (painted, not bare metal: the run sits in the key's mirror for the door and catwalk cameras and
  // as `metal` its top clipped to a 1-px white line)
  pipe(kit, PALETTE, [RX, RY, 386.0], [RX, RY, 409.0], 0.16, { color: steel, bracket: 3, mat: "paintedMetal" });
  pipe(kit, PALETTE, [RX, RY, 386.0], [IX0, RY, 386.0], 0.16, { color: steel, bracket: 9, mat: "paintedMetal" });
  pipe(kit, PALETTE, [RX, RY, 409.0], [IX0, RY, 409.0], 0.16, { color: steel, bracket: 9, mat: "paintedMetal" });
  kit.add("paintedMetal", new THREE.SphereGeometry(0.18, 14, 10), { pos: [RX, RY, 386.0], color: steel });
  kit.add("paintedMetal", new THREE.SphereGeometry(0.18, 14, 10), { pos: [RX, RY, 409.0], color: steel });
  // flow sight glasses between the manifold's ceiling hangers: supply runs aft (+z) on the manifold,
  // the return line brings it back (-z) — flanged sleeves whose lit stripes travel with the flow
  for (const z of [390.3, 396.0, 401.8]) {
    sightGlass(TANK_X, MY, z, 0.29, 1.0, +1);
    sightGlass(RX, RY, z, 0.19, 0.8, -1);
  }
  for (let i = 0; i < PUMP_Z.length; i++) {
    const z = PUMP_Z[i];
    // pump skid: black block, grey motor along z, end bells, indicator field, teal status strip
    const Q = placer(kit, [RX, Y, z], Math.PI / 2); // front → +X (the room)
    Q.box("paintedMetal", 0, 0.45, 0, 1.2, 0.9, 1.1, { color: black, texel: 4 });
    Q.box("paintedMetal", 0, 0.04, 0, 1.3, 0.08, 1.2, { color: dark });
    Q.cyl("metal", 0, 1.22, 0, 0.32, 0.9, "x", { color: grey, segments: 16 });
    for (const lx of [-0.5, 0.5]) Q.cyl("paintedMetal", lx, 1.22, 0, 0.36, 0.1, "x", { color: dark, segments: 16 });
    Q.box("paintedMetal", 0, 1.22, 0, 0.5, 0.2, 0.75, { color: dark });
    indicatorField(Q, 0.15, 0.62, 0.56, 0.7, 0.2, 60 + i);
    // run lamp: blinks at this skid's own rate (glow live row PUMP0 + i)
    Q.box("paintedMetal", -0.35, 0.62, 0.555, 0.29, 0.09, 0.01, { color: black });
    glow.box(ROW.PUMP0 + i, 0.5, 0.25, 0.05, 0.01, Q.world(-0.35, 0.62, 0.56), Q.yaw);
    Q.box("darkGloss", 0, 0.25, 0.56, 1.0, 0.16, 0.02);
    Q.collider([-0.6, 0, -0.55], [0.6, 1.55, 0.55], "pump");
    // low-level suction/discharge stubs into the neighbouring tanks
    for (const s of [-1, 1]) pipe(kit, PALETTE, [RX, Y + 0.5, z + s * 0.55], [RX, Y + 0.5, z + s * 1.45], 0.12, { color: WATER, bracket: 9 });
    // return drop from the line onto the motor, valve body + handwheel at working height
    pipe(kit, PALETTE, [RX, Y + 1.52, z], [RX, RY, z], 0.16, { color: steel, bracket: 2.5, mat: "paintedMetal" });
    kit.box("paintedMetal", RX, Y + 2.3, z, 0.42, 0.5, 0.42, { color: dark, texel: 2.5 });
    handwheel(RX + 0.24, Y + 2.3, z, "x", 0.2);
  }
  // transfer pump at the tank farm's forward corner (foreground of the water view): skid, motor,
  // volute facing the walkway, suction riser from a floor flange, discharge into tank 1's shell
  {
    const T = placer(kit, [46.7, Y, 387.0], Math.PI / 2); // front → +X
    T.box("paintedMetal", 0, 0.06, 0, 1.3, 0.12, 1.1, { color: dark, texel: 2.5 });
    T.box("paintedMetal", 0, 0.5, 0, 0.9, 0.76, 0.8, { color: black, texel: 4 });
    T.cyl("metal", 0, 1.12, -0.05, 0.28, 0.8, "x", { color: grey, segments: 16 });
    for (const lx of [-0.42, 0.42]) T.cyl("paintedMetal", lx, 1.12, -0.05, 0.32, 0.08, "x", { color: dark, segments: 16 });
    T.cyl("metal", 0.2, 1.12, 0.36, 0.22, 0.16, "z", { color: WATER, segments: 16 });
    T.cyl("metal", 0.2, 1.12, 0.46, 0.08, 0.06, "z", { color: steel, segments: 10 });
    indicatorField(T, 0.15, 0.55, 0.405, 0.5, 0.16, 71);
    T.box("emitTeal", -0.25, 0.55, 0.405, 0.18, 0.05, 0.01);
    T.box("darkGloss", 0, 0.25, 0.405, 0.7, 0.14, 0.02);
    T.collider([-0.65, 0, -0.55], [0.65, 1.45, 0.55], "transfer-pump");
  }
  // suction riser: deck flange, bolted flange pairs at both ends of the bend, into the pump's end bell
  kit.cyl("paintedMetal", 46.7, Y + 0.03, 386.0, 0.22, 0.06, "y", { color: dark, segments: 16 });
  pipe(kit, PALETTE, [46.7, Y + 0.06, 386.0], [46.7, Y + 1.12, 386.0], 0.12, { color: WATER, bracket: 9 });
  elbow(46.7, Y + 1.12, 386.0, 0.14);
  pipe(kit, PALETTE, [46.7, Y + 1.12, 386.0], [46.7, Y + 1.12, 386.62], 0.12, { color: WATER, bracket: 9 });
  for (const y of [0.2, 0.86]) {
    kit.cyl("paintedMetal", 46.7, Y + y, 386.0, 0.17, 0.06, "y", { color: WATER_DARK, segments: 16 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      kit.cyl("metal", 46.7 + 0.15 * Math.cos(a), Y + y, 386.0 + 0.15 * Math.sin(a), 0.018, 0.08, "y", { color: steel, segments: 6 });
    }
  }
  kit.cyl("paintedMetal", 46.7, Y + 1.12, 386.5, 0.17, 0.06, "z", { color: WATER_DARK, segments: 16 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    kit.cyl("metal", 46.7 + 0.15 * Math.cos(a), Y + 1.12 + 0.15 * Math.sin(a), 386.5, 0.018, 0.08, "z", { color: steel, segments: 6 });
  }
  pipe(kit, PALETTE, [46.5, Y + 0.5, 387.0], [42.85, Y + 0.5, 387.25], 0.12, { color: WATER, bracket: 2 });
  kit.box("paintedMetal", 44.6, Y + 0.5, 387.13, 0.36, 0.36, 0.36, { color: dark, texel: 2.5 });
  kit.cyl("metal", 44.6, Y + 0.78, 387.13, 0.03, 0.2, "y", { color: steel, segments: 8 });
  handwheel(44.6, Y + 0.9, 387.13, "y", 0.16);
  // low-level services behind the tanks along the west wall (level 1 pipes) + cable tray
  pipe(kit, PALETTE, [IX0 + 0.3, Y + 1.6, 384.0], [IX0 + 0.3, Y + 1.6, 411.0], 0.1, { color: WATER, bracket: 2.5 });
  pipe(kit, PALETTE, [IX0 + 0.3, Y + 2.15, 384.0], [IX0 + 0.3, Y + 2.15, 411.0], 0.08, { color: steel, bracket: 2.5 });
  tray([IX0 + 0.18, Y + 3.2, 381.0], [IX0 + 0.18, Y + 3.2, 412.0], 0.3);
  // west wall high zone: vent grilles, tray, junction boxes
  for (const z of [391.5, 397.5, 403.5]) grille(IX0, Y + 8.4, z, Math.PI / 2, 1.8, 0.9);
  tray([IX0 + 0.2, Y + 7.6, 380.0], [IX0 + 0.2, Y + 7.6, 412.0], 0.35);
  junction(IX0, Y + 1.6, 382.2, Math.PI / 2, { conduitTo: Y + 3.2, seed: 3 });
  junction(IX0, Y + 1.4, 412.6, Math.PI / 2, { w: 0.5, h: 0.6, conduitTo: Y + 3.2, seed: 4 });
  // floor: painted teal boundary line of the tank farm
  mark([46.0, Y + 0.004, 385.2], [46.0, Y + 0.004, 409.4], 0.1, PAINT_TEAL);

  // =============================================================================================
  // AIR SECTION (east wall): six scrubber cabinets, duct trunk, riser, ceiling mains
  // =============================================================================================
  const OPEN_SCRUB = 2; // unit 3 is in service: front panel off, cart parked in front
  for (let i = 0; i < SCRUB_Z.length; i++) {
    const z = SCRUB_Z[i];
    const Q = placer(kit, [61.3, Y, z], -Math.PI / 2); // front → -X
    const w = 1.6;
    const h = 2.4;
    const d = 0.8;
    const open = i === OPEN_SCRUB;
    Q.box("paintedMetal", 0, 0.06, 0, w, 0.12, d, { color: black });
    Q.box("paintedMetal", 0, h / 2 + 0.06, 0, w, h - 0.12, d, { color: grey, texel: 4 });
    Q.box("paintedMetal", 0, h - 0.03, 0, w + 0.04, 0.06, d + 0.04, { color: dark });
    if (!open) {
      Q.box("impPanel", 0, h / 2 + 0.06, d / 2 + 0.012, w - 0.12, h - 0.24, 0.02, { color: white, uv: "keep" });
      // fan intake: dark housing, recessed gloss disc, steel bezel, hub + six blades
      Q.cyl("paintedMetal", 0, 1.98, d / 2 + 0.1, 0.42, 0.2, "z", { color: dark, segments: 24 });
      Q.cyl("darkGloss", 0, 1.98, d / 2 + 0.2, 0.36, 0.02, "z", { segments: 24 });
      if (i === GLOW_SCRUB) {
        // UV sterilizer glow behind the blades of this unit's fan: a teal annulus pulsing (live row)
        const ring = new THREE.RingGeometry(0.1, 0.34, 32);
        ring.rotateY(Q.yaw);
        ring.translate(...Q.world(0, 1.98, d / 2 + 0.213));
        glow.add(ring, ROW.FAN, 0.5);
      }
      Q.add("metal", new THREE.TorusGeometry(0.4, 0.02, 8, 32), 0, 1.98, d / 2 + 0.205, { color: steel });
      Q.cyl("metal", 0, 1.98, d / 2 + 0.23, 0.07, 0.06, "z", { color: steel, segments: 12 });
      for (let k = 0; k < 6; k++) {
        const g = new THREE.BoxGeometry(0.05, 0.3, 0.012);
        g.translate(0, 0.19, 0);
        g.rotateZ((k / 6) * Math.PI * 2 + i * 0.3);
        Q.add("metal", g, 0, 1.98, d / 2 + 0.225, { color: steel });
      }
      // filter drawers: five stacked trays with handles and a status dot each
      for (let k = 0; k < 5; k++) {
        const y = 0.3 + k * 0.24;
        Q.box("paintedMetal", 0, y, d / 2 + 0.035, w - 0.3, 0.2, 0.05, { color: k % 2 ? white : grey, texel: 2.5 });
        Q.box("paintedMetal", 0, y + 0.015, d / 2 + 0.07, 0.5, 0.03, 0.02, { color: black });
        Q.box(k === 2 && i % 2 ? "emitAmber" : "emitGreen", -(w / 2) + 0.26, y, d / 2 + 0.062, 0.05, 0.05, 0.006);
      }
      indicatorField(Q, 0.35, 1.5, d / 2 + 0.03, 0.66, 0.14, 40 + i);
      Q.box("emitTeal", -0.42, 1.5, d / 2 + 0.045, 0.3, 0.04, 0.01);
    } else {
      // exposed interior: black cavity, side ribs, fan drum with its blades, filter rails with one
      // cartridge seated and one pulled half out, cable loom, service lamp
      Q.box("paintedMetal", 0, h / 2 + 0.06, d / 2 - 0.25, w - 0.2, h - 0.3, 0.02, { color: black, texel: 2.5 });
      for (const lx of [-0.64, 0.64]) Q.box("paintedMetal", lx, h / 2 + 0.06, d / 2 - 0.12, 0.06, h - 0.3, 0.26, { color: dark });
      Q.cyl("metal", 0, 1.98, d / 2 - 0.12, 0.34, 0.24, "z", { color: grey, segments: 20 });
      Q.cyl("metal", 0, 1.98, d / 2 + 0.02, 0.07, 0.06, "z", { color: steel, segments: 12 });
      for (let k = 0; k < 6; k++) {
        const g = new THREE.BoxGeometry(0.05, 0.3, 0.012);
        g.translate(0, 0.19, 0);
        g.rotateZ((k / 6) * Math.PI * 2 + 0.2);
        Q.add("metal", g, 0, 1.98, d / 2 + 0.015, { color: steel });
      }
      for (let k = 0; k < 5; k++) Q.box("paintedMetal", 0, 0.19 + k * 0.24, d / 2 - 0.1, w - 0.36, 0.02, 0.5, { color: dark });
      Q.box("paintedMetal", 0, 0.3, d / 2 - 0.1, w - 0.4, 0.18, 0.5, { color: white, texel: 2.5 });
      Q.box("paintedMetal", 0, 0.78, d / 2 + 0.15, w - 0.4, 0.18, 0.5, { color: white, texel: 2.5 });
      Q.box("paintedMetal", 0, 0.795, d / 2 + 0.41, 0.5, 0.03, 0.02, { color: black });
      for (const [lx, c] of [[0.5, steel], [0.55, dark], [0.6, PAINT_AMBER]]) Q.cyl("metal", lx, 1.3, d / 2 - 0.2, 0.015, 1.8, "y", { color: c, segments: 6 });
      Q.box("paintedMetal", 0.52, 1.2, d / 2 - 0.05, 0.16, 0.2, 0.06, { color: black });
      Q.box("emitAmber", -0.5, 2.2, d / 2 - 0.05, 0.08, 0.08, 0.01);
    }
    // duct stub up into the trunk
    Q.box("paintedMetal", 0, h + 0.05, 0, 0.72, 0.1, 0.72, { color: dark });
    Q.box("paintedMetal", 0, h + 0.36, 0, 0.6, 0.6, 0.6, { color: white, texel: 1 });
    Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2 + 0.2], "scrubber");
  }
  {
    // maintenance cart parked in front of the open unit, its front panel laid across the top tray
    const C = placer(kit, [59.6, Y, SCRUB_Z[OPEN_SCRUB]], Math.PI / 2); // local x along the wall
    for (const [lx, lz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) C.cyl("paintedMetal", lx, 0.09, lz, 0.09, 0.06, "x", { color: black, segments: 12 });
    C.box("paintedMetal", 0, 0.25, 0, 1.2, 0.05, 0.7, { color: dark, texel: 2.5 });
    C.box("paintedMetal", 0, 0.85, 0, 1.2, 0.05, 0.7, { color: dark, texel: 2.5 });
    for (const [lx, lz] of [[-0.56, -0.31], [0.56, -0.31], [-0.56, 0.31], [0.56, 0.31]]) C.box("metal", lx, 0.55, lz, 0.04, 0.6, 0.04, { color: steel });
    C.cyl("metal", -0.64, 1.0, 0, 0.02, 0.6, "z", { color: steel, segments: 8 });
    for (const lz of [-0.3, 0.3]) C.cyl("metal", -0.64, 0.94, lz, 0.02, 0.14, "y", { color: steel, segments: 8 });
    C.box("paintedMetal", 0.1, 0.4, 0.1, 0.5, 0.24, 0.3, { color: black, texel: 2.5 });
    C.box("emitTeal", 0.1, 0.47, 0.26, 0.3, 0.02, 0.01);
    C.cyl("metal", -0.3, 0.42, -0.15, 0.09, 0.3, "y", { color: white, segments: 12 });
    C.add("impPanel", new THREE.BoxGeometry(2.16, 0.02, 1.48), 0, 0.885, 0, { color: white, uv: "keep", quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2 + 0.1, 0)) });
    C.cyl("paintedMetal", 0.35, 0.9, 0.05, 0.36, 0.012, "y", { color: black, segments: 24 });
    C.collider([-0.7, 0, -0.4], [0.7, 1.1, 0.4], "cart");
  }
  // trunk over the bank (1.2 × 0.8) and the riser at its forward end, up into the ceiling main. The
  // trunk is grey, not white: its face stands 2 m from the under-catwalk work light and in white it
  // rendered as a clipped band (door + air views)
  duct(kit, PALETTE, [61.1, Y + 3.4, 386.2], [61.1, Y + 3.4, 401.4], 1.2, 0.8, { color: grey });
  kit.boxMM("paintedMetal", [60.5, Y + 3.0, 385.25], [IX1, CY - 0.1, 386.35], { color: white, texel: 1 });
  for (const y of [Y + 3.9, Y + 6.2, Y + 8.4]) kit.boxMM("paintedMetal", [60.47, y, 385.22], [IX1 + 0.01, y + 0.08, 386.38], { color: dark });
  // ceiling air main along x (white) feeding two branch runs along z with louvred vents
  duct(kit, PALETTE, [61.1, CY - 0.8, 385.8], [39.2, CY - 0.8, 385.8], 1.2, 0.8, { color: white });
  for (const bx of [46.1, 53.9]) {
    duct(kit, PALETTE, [bx, CY - 0.65, 385.8], [bx, CY - 0.65, 412.0], 0.8, 0.5, { color: white });
    for (const vz of [391.0, 398.0, 405.0, 411.0]) {
      kit.box("paintedMetal", bx, CY - 0.95, vz, 1.1, 0.1, 0.7, { color: dark, texel: 2.5 });
      for (let k = -2; k <= 2; k++) kit.box("paintedMetal", bx, CY - 1.015, vz + k * 0.12, 1.0, 0.02, 0.08, { color: white });
    }
  }
  // forward-wall duct at +6 m with two exhaust risers into the ceiling
  duct(kit, PALETTE, [39.0, Y + 6.0, IZ0 + 0.54], [61.5, Y + 6.0, IZ0 + 0.54], 1.1, 0.8, { color: white });
  for (const rx of [44.5, 56.0]) {
    kit.boxMM("paintedMetal", [rx - 0.4, Y + 6.3, IZ0 + 0.14], [rx + 0.4, CY - 0.1, IZ0 + 0.94], { color: white, texel: 1 });
    kit.boxMM("paintedMetal", [rx - 0.43, Y + 7.6, IZ0 + 0.11], [rx + 0.43, Y + 7.68, IZ0 + 0.97], { color: dark });
  }
  // east wall: grilles + tray above the catwalk; the forward zone (no catwalk) gets a bench and stores
  for (const z of [392.0, 400.0, 408.0]) grille(IX1, Y + 6.6, z, -Math.PI / 2, 1.8, 0.9);
  tray([IX1 - 0.2, Y + 7.4, 388.0], [IX1 - 0.2, Y + 7.4, 413.5], 0.35);
  junction(IX1, Y + 1.7, 380.2, -Math.PI / 2, { w: 0.5, h: 0.6, conduitTo: Y + 3.9, seed: 5 });
  junction(IX1, Y + 1.5, 383.6, -Math.PI / 2, { conduitTo: Y + 3.9, emit: "emitAmber", seed: 6 });
  tray([IX1 - 0.2, Y + 3.9, 379.0], [IX1 - 0.2, Y + 3.9, 385.0], 0.35);
  table(kit, PALETTE, [IX1 - 0.5, Y, 382.0], Math.PI / 2, { len: 2.6, w: 0.8, h: 0.9, benches: false });
  crate(IX1 - 0.65, 385.8, 0.1, { color: mid });
  crate(IX1 - 0.65, 385.8, -0.05, { s: 0.8, y: Y + 1.2, color: grey, emit: "emitAmber" });
  crate(IX1 - 0.65, 384.4, 0, { color: dark });
  // floor: painted service line along the scrubber fronts, hazard at the stairs' foot
  mark([58.6, Y + 0.004, 386.2], [58.6, Y + 0.004, 401.4], 0.1, PAINT_AMBER);
  hazardStrip([58.3, 401.0], [60.1, 401.8], Y + 0.004);

  // ---- process skids in the middle-east strip (between the walkway and the scrubber bank) --------
  {
    // filter bank: four vertical housings with domed tops on a skid, inlet header above, outlet below
    const sx = 55.5;
    const sz0 = 389.0;
    const sz1 = 396.0;
    kit.boxMM("paintedMetal", [sx - 1.3, Y, sz0], [sx + 1.3, Y + 0.15, sz1], { color: black, texel: 4 });
    const zs = [0, 1, 2, 3].map((k) => sz0 + 1.0 + k * 1.7);
    zs.forEach((z, k) => {
      // four vessel states, different in silhouette so they read from the door: 1 standard (dome,
      // teal); 2 isolated (dark grey body, amber band, red status, amber handwheel, lockout tag); 3 flat
      // top with a relief-valve stack and a lit sight-glass level gauge; 4 dome off for a cartridge
      // change (bolted flange ring) — the spare cartridge waits on a pallet by the walkway
      const isolated = k === 1;
      const gauged = k === 2;
      const opened = k === 3;
      kit.cyl("paintedMetal", sx, Y + 0.3, z, 0.58, 0.3, "y", { color: dark, segments: 20, texel: 4 });
      kit.cyl("paintedMetal", sx, Y + 1.65, z, 0.55, 2.4, "y", { color: isolated ? mid : white, segments: 20, texel: 4 });
      if (gauged) {
        kit.cyl("paintedMetal", sx, Y + 2.89, z, 0.57, 0.08, "y", { color: dark, segments: 20 });
        kit.cyl("metal", sx, Y + 3.1, z, 0.07, 0.36, "y", { color: steel, segments: 10 });
        kit.cyl("paintedMetal", sx, Y + 3.31, z, 0.11, 0.07, "y", { color: WATER_DARK, segments: 12 });
        kit.cyl("metal", sx - 0.2, Y + 3.02, z, 0.03, 0.2, "y", { color: steel, segments: 6 });
        // sight glass on the walkway side: brackets to the shell, dark tube, lit liquid column, ticks
        for (const y of [0.9, 1.7, 2.5]) kit.box("paintedMetal", sx - 0.53, Y + y, z + 0.34, 0.22, 0.06, 0.12, { color: dark });
        kit.box("darkGloss", sx - 0.66, Y + 1.7, z + 0.34, 0.08, 1.8, 0.1);
        kit.box("emitTeal", sx - 0.705, Y + 1.35, z + 0.34, 0.01, 1.1, 0.04);
        for (let t = 0; t < 6; t++) kit.box("paintedMetal", sx - 0.705, Y + 0.95 + t * 0.3, z + 0.375, 0.01, 0.015, 0.03, { color: white });
      } else if (!opened) {
        // painted, not bare metal: the glossy white dome mirrored the nearest fill as a blown lobe
        // in the air view (pass 3 — cap the cap at 85 %)
        kit.add("paintedMetal", new THREE.SphereGeometry(0.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [sx, Y + 2.85, z], color: isolated ? mid : white, texel: 4 });
      }
      else {
        kit.add("metal", new THREE.TorusGeometry(0.57, 0.05, 6, 28), { pos: [sx, Y + 2.87, z], rot: [Math.PI / 2, 0, 0], color: steel });
        kit.cyl("paintedMetal", sx, Y + 2.84, z, 0.52, 0.04, "y", { color: black, segments: 20 });
        for (let b = 0; b < 8; b++) {
          const a = (b / 8) * Math.PI * 2;
          kit.cyl("metal", sx + 0.57 * Math.cos(a), Y + 2.93, z + 0.57 * Math.sin(a), 0.03, 0.06, "y", { color: steel, segments: 6 });
        }
      }
      kit.cyl("paintedMetal", sx, Y + 2.65, z, 0.58, 0.12, "y", { color: isolated ? TANK_BAND[1] : WATER, segments: 20 });
      kit.cyl("paintedMetal", sx, Y + 1.2, z, 0.58, 0.12, "y", { color: dark, segments: 20 });
      kit.box("darkGloss", sx - 0.56, Y + 1.7, z, 0.04, 0.26, 0.26);
      kit.box(isolated ? "emitRedImp" : "emitTeal", sx - 0.578, Y + 1.7, z, 0.01, 0.16, 0.16);
      handwheel(sx - 0.6, Y + 0.95, z, "x", 0.14, isolated ? P("impAmber") : P("impRed"));
      if (isolated) {
        // lockout tag hanging off the handwheel rim
        kit.box("paintedMetal", sx - 0.6, Y + 0.72, z + 0.05, 0.01, 0.2, 0.14, { color: PAINT_AMBER });
        kit.box("paintedMetal", sx - 0.606, Y + 0.7, z + 0.05, 0.01, 0.03, 0.09, { color: black });
      }
      if (!opened) pipe(kit, PALETTE, [sx + 0.2, Y + (gauged ? 2.93 : 3.3), z], [sx + 0.2, Y + 3.55, z], 0.1, { color: WATER, bracket: 9 });
      else kit.cyl("paintedMetal", sx + 0.2, Y + 3.38, z, 0.14, 0.06, "y", { color: WATER_DARK, segments: 12 });
      pipe(kit, PALETTE, [sx + 0.4, Y + 0.6, z], [sx + 0.75, Y + 0.6, z], 0.1, { color: WATER, bracket: 9 });
    });
    {
      // pallet with the spare cartridge by the walkway
      const px = 53.4;
      const pz = 390.9;
      kit.box("paintedMetal", px, Y + 0.06, pz, 1.0, 0.12, 1.0, { color: dark, texel: 4 });
      for (const dx of [-0.4, 0.4]) kit.box("paintedMetal", px + dx, Y + 0.14, pz, 0.12, 0.04, 1.0, { color: black });
      kit.cyl("paintedMetal", px, Y + 0.16 + 0.65, pz, 0.36, 1.3, "y", { color: white, segments: 18, texel: 4 });
      kit.cyl("paintedMetal", px, Y + 0.16 + 1.31, pz, 0.38, 0.06, "y", { color: dark, segments: 18 });
      kit.cyl("paintedMetal", px, Y + 0.16 + 0.65, pz, 0.37, 0.08, "y", { color: PAINT_AMBER, segments: 18 });
      kit.box("paintedMetal", px + 0.365, Y + 1.0, pz, 0.01, 0.3, 0.4, { color: dark });
      kit.collider([px - 0.5, Y, pz - 0.5], [px + 0.5, Y + 1.5, pz + 0.5], "pallet");
    }
    {
      // circulation pump for the filter bank beside the pallet: plinth, motor with end bells, coupling
      // guard, teal volute, flanged suction and discharge stubs down into deck flanges, status strip
      const U = placer(kit, [53.4, Y, 392.45], 0);
      U.box("paintedMetal", 0, 0.06, 0, 0.9, 0.12, 0.8, { color: black, texel: 4 });
      U.box("paintedMetal", 0, 0.2, -0.1, 0.5, 0.16, 0.5, { color: dark, texel: 4 });
      U.cyl("metal", 0, 0.42, -0.1, 0.19, 0.55, "z", { color: grey, segments: 16 });
      for (const lz of [-0.38, 0.18]) U.cyl("paintedMetal", 0, 0.42, lz, 0.22, 0.06, "z", { color: dark, segments: 16 });
      U.box("paintedMetal", 0, 0.38, 0.28, 0.3, 0.26, 0.14, { color: dark });
      U.cyl("metal", 0, 0.42, 0.44, 0.24, 0.18, "z", { color: WATER, segments: 16 });
      U.cyl("metal", 0, 0.42, 0.56, 0.1, 0.06, "z", { color: steel, segments: 10 });
      // suction: out of the volute nose, elbow down to a deck flange
      pipe(kit, PALETTE, U.world(0, 0.42, 0.59), U.world(0, 0.42, 0.78), 0.08, { color: WATER, bracket: 9 });
      elbow(...U.world(0, 0.42, 0.78), 0.1);
      pipe(kit, PALETTE, U.world(0, 0.42, 0.78), U.world(0, 0.05, 0.78), 0.08, { color: WATER, bracket: 9 });
      U.cyl("paintedMetal", 0, 0.03, 0.78, 0.15, 0.06, "y", { color: dark, segments: 12 });
      U.cyl("paintedMetal", 0, 0.42, 0.62, 0.12, 0.04, "z", { color: WATER_DARK, segments: 12 });
      // discharge: up off the volute, over toward the skid, down to a second deck flange
      pipe(kit, PALETTE, U.world(0, 0.66, 0.44), U.world(0, 0.98, 0.44), 0.08, { color: WATER, bracket: 9 });
      elbow(...U.world(0, 0.98, 0.44), 0.1);
      pipe(kit, PALETTE, U.world(0, 0.98, 0.44), U.world(0.62, 0.98, 0.44), 0.08, { color: WATER, bracket: 9 });
      elbow(...U.world(0.62, 0.98, 0.44), 0.1);
      pipe(kit, PALETTE, U.world(0.62, 0.98, 0.44), U.world(0.62, 0.05, 0.44), 0.08, { color: WATER, bracket: 9 });
      U.cyl("paintedMetal", 0.62, 0.03, 0.44, 0.15, 0.06, "y", { color: dark, segments: 12 });
      U.cyl("paintedMetal", 0, 0.74, 0.44, 0.12, 0.04, "y", { color: WATER_DARK, segments: 12 });
      handwheel(...U.world(0.62, 0.55, 0.44), "z", 0.12, P("impRed"));
      // status panel tangent to the motor's walkway-side flank
      const V = placer(kit, U.world(-0.2, 0, -0.1), -Math.PI / 2); // front → -X (the walkway)
      V.box("darkGloss", 0, 0.42, 0.01, 0.3, 0.14, 0.02);
      V.box("emitTeal", 0, 0.46, 0.025, 0.2, 0.03, 0.01);
      indicatorField(V, 0, 0.385, 0.022, 0.24, 0.05, 79);
      U.collider([-0.45, 0, -0.42], [0.8, 1.0, 0.9], "filter-pump");
    }
    pipe(kit, PALETTE, [sx + 0.2, Y + 3.55, sz0 + 0.3], [sx + 0.2, Y + 3.55, sz1 - 0.3], 0.14, { color: WATER, bracket: 9 });
    pipe(kit, PALETTE, [sx + 0.75, Y + 0.6, sz0 + 0.3], [sx + 0.75, Y + 0.6, sz1 - 0.3], 0.14, { color: WATER, bracket: 9 });
    // header ends: blind flange on the inlet, elbows down into the skid on the outlet
    kit.cyl("paintedMetal", sx + 0.2, Y + 3.55, sz1 - 0.3, 0.2, 0.1, "z", { color: WATER_DARK, segments: 14 });
    for (const ez of [sz0 + 0.3, sz1 - 0.3]) {
      pipe(kit, PALETTE, [sx + 0.75, Y + 0.6, ez], [sx + 0.75, Y + 0.1, ez], 0.14, { color: WATER, bracket: 9 });
      elbow(sx + 0.75, Y + 0.6, ez, 0.16);
    }
    pipe(kit, PALETTE, [sx + 0.2, Y + 3.55, sz0 + 0.3], [sx + 0.2, CY - 1.7, sz0 + 0.3], 0.14, { color: WATER, bracket: 3 });
    pipe(kit, PALETTE, [sx + 0.2, CY - 1.7, sz0 + 0.3], [WMX, CY - 1.7, sz0 + 0.3], 0.14, { color: WATER, bracket: 3 });
    elbow(sx + 0.2, Y + 3.55, sz0 + 0.3, 0.16);
    elbow(sx + 0.2, CY - 1.7, sz0 + 0.3, 0.16);
    const K = placer(kit, [sx - 1.05, Y + 0.15, sz1 - 0.45], -Math.PI / 2);
    K.box("paintedMetal", 0, 0.7, 0, 0.5, 1.4, 0.25, { color: black, texel: 2.5 });
    indicatorField(K, 0, 1.1, 0.13, 0.4, 0.3, 77);
    K.box("emitTeal", 0, 0.5, 0.13, 0.3, 0.04, 0.01);
    kit.collider([sx - 1.3, Y, sz0], [sx + 1.3, Y + 3.5, sz1], "filter-skid");
  }
  {
    // O2 generator: grey cabinet with louvres and a screen, two white separator columns, pipes up
    const G = placer(kit, [55.5, Y, 402.5], -Math.PI / 2); // front → -X (walkway side); local x → world +Z
    G.box("paintedMetal", 0, 0.1, 0, 4.6, 0.2, 2.6, { color: black, texel: 4 });
    G.box("paintedMetal", -0.9, 1.5, 0, 2.6, 2.6, 2.2, { color: grey, texel: 4 });
    G.box("paintedMetal", -0.9, 2.83, 0, 2.7, 0.06, 2.3, { color: dark });
    G.box("impPanel", -0.9, 1.5, 1.11, 2.3, 2.3, 0.02, { color: white, uv: "keep" });
    indicatorField(G, -1.45, 2.15, 1.125, 1.0, 0.4, 88);
    G.box("darkGloss", -0.3, 2.15, 1.125, 0.9, 0.5, 0.02);
    G.box("screenImp2", -0.3, 2.15, 1.137, 0.8, 0.4, 0.01, { uv: "keep" });
    for (let k = 0; k < 3; k++) G.box("paintedMetal", -0.9, 0.55 + k * 0.35, 1.135, 2.0, 0.25, 0.03, { color: k % 2 ? white : grey });
    G.box("emitTeal", -0.9, 1.7, 1.13, 2.0, 0.04, 0.01);
    for (const lx of [1.1, 1.95]) {
      G.cyl("paintedMetal", lx, 0.3, -0.4, 0.5, 0.2, "y", { color: dark, segments: 18 });
      G.cyl("metal", lx, 1.9, -0.4, 0.42, 3.2, "y", { color: white, segments: 18, texel: 4 });
      G.cyl("paintedMetal", lx, 3.52, -0.4, 0.46, 0.16, "y", { color: dark, segments: 18 });
      G.cyl("paintedMetal", lx, 2.3, -0.4, 0.44, 0.1, "y", { color: WATER, segments: 18 });
      G.box("darkGloss", lx, 1.5, 0.03, 0.22, 0.22, 0.04);
      G.box("emitTeal", lx, 1.5, 0.052, 0.14, 0.14, 0.01);
    }
    const c1 = G.world(1.1, 3.6, -0.4);
    const c2 = G.world(1.95, 3.6, -0.4);
    pipe(kit, PALETTE, [c1[0], Y + 3.9, c1[2]], [c2[0], Y + 3.9, c2[2]], 0.1, { color: steel, bracket: 9 });
    for (const c of [c1, c2]) pipe(kit, PALETTE, [c[0], Y + 3.5, c[2]], [c[0], Y + 3.9, c[2]], 0.1, { color: steel, bracket: 9 });
    // product line runs east under the catwalk deck into the wall
    pipe(kit, PALETTE, [c1[0], Y + 3.9, c1[2]], [IX1, Y + 3.9, c1[2]], 0.12, { color: steel, bracket: 2.5 });
    elbow(c1[0], Y + 3.9, c1[2], 0.13, steel);
    G.collider([-2.3, 0, -1.3], [2.3, 3.6, 1.3], "o2-gen");
  }

  // =============================================================================================
  // WASTE RECLAMATION (aft): curbed grated sump, two horizontal digesters on cradles
  // =============================================================================================
  const WX0 = 42.5;
  const WX1 = 57.5;
  const WZ0 = 408.6;
  const CURB = 0.25;
  kit.boxMM("paintedMetal", [WX0 + CURB, Y + 0.005, WZ0 + CURB], [WX1 - CURB, Y + 0.03, IZ1 - 0.02], { color: black });
  grateQuad(WX0 + CURB, WZ0 + CURB, WX1 - CURB, IZ1 - 0.02, Y + 0.035);
  for (const [min, max] of [
    [[WX0, WZ0], [WX0 + CURB, IZ1]],
    [[WX1 - CURB, WZ0], [WX1, IZ1]],
    [[WX0, WZ0], [WX1, WZ0 + CURB]],
  ]) {
    kit.boxMM("paintedMetal", [min[0], Y, min[1]], [max[0], Y + 0.3, max[1]], { color: dark, texel: 4 });
    hazardStrip(min, max, Y + 0.3);
    kit.collider([min[0], Y, min[1]], [max[0], Y + 0.3, max[1]], "curb");
  }
  const cy0 = Y + 0.3;
  rail(kit, PALETTE, [WX0 + 0.12, cy0, WZ0 + 0.12], [WX0 + 0.12, cy0, IZ1 - 0.1], cy0, { post: 1.5 });
  rail(kit, PALETTE, [WX1 - 0.12, cy0, WZ0 + 0.12], [WX1 - 0.12, cy0, IZ1 - 0.1], cy0, { post: 1.5 });
  rail(kit, PALETTE, [WX0 + 0.12, cy0, WZ0 + 0.12], [48.9, cy0, WZ0 + 0.12], cy0, { post: 1.6 });
  rail(kit, PALETTE, [51.1, cy0, WZ0 + 0.12], [WX1 - 0.12, cy0, WZ0 + 0.12], cy0, { post: 1.6 });
  hazardStrip([48.9, WZ0 - 0.9], [51.1, WZ0], Y + 0.004);
  mark([WX0 - 0.5, Y + 0.004, WZ0 - 0.5], [WX1 + 0.5, Y + 0.004, WZ0 - 0.5], 0.12, PAINT_AMBER);
  for (const cz of [410.6, 413.0]) {
    const cy = Y + 1.55;
    kit.cyl("metal", 50, cy, cz, 1.1, 11, "x", { color: grey, segments: 28, texel: 4 });
    for (const ex of [44.5, 55.5]) kit.add("metal", new THREE.SphereGeometry(1.1, 20, 12), { pos: [ex, cy, cz], color: grey });
    for (const bx of [46.5, 50, 53.5]) kit.cyl("paintedMetal", bx, cy, cz, 1.14, 0.2, "x", { color: dark, segments: 28 });
    for (const bx of [46.0, 50.0, 54.0]) {
      kit.box("paintedMetal", bx, Y + 0.25, cz, 0.6, 0.5, 2.4, { color: black, texel: 4 });
      kit.box("paintedMetal", bx, Y + 0.62, cz, 0.7, 0.3, 2.3, { color: dark });
    }
    // amber warning strip along the room-facing shoulder, manway + handwheel on top
    kit.box("emitAmber", 50, cy + 0.9, cz - 0.63, 9.6, 0.04, 0.04);
    kit.cyl("paintedMetal", 52.5, cy + 1.18, cz, 0.36, 0.2, "y", { color: dark, segments: 16 });
    handwheel(52.5, cy + 1.3, cz, "y", 0.2);
    kit.collider([44.2, Y, cz - 1.15], [55.8, Y + 2.7, cz + 1.15], "digester");
  }
  for (const x of [46.5, 53.5]) pipe(kit, PALETTE, [x, Y + 1.55, 411.4], [x, Y + 1.55, 412.2], 0.14, { color: WATER, bracket: 9 });
  handwheel(48.5, Y + 1.35, 410.6 - 1.12, "z", 0.18);
  handwheel(51.5, Y + 1.35, 410.6 - 1.12, "z", 0.18);
  // control pedestal for the sump, off the access gap
  consoleProp(kit, PALETTE, [45.6, Y, 407.2], Math.PI, { w: 1.4, d: 0.8, screens: 1, screenMat: "screenImp3", seed: 7 });

  // water main at ceiling level (r 0.3, level 3) from the tank farm to the digesters
  pipe(kit, PALETTE, [WMX, WMY, 380.5], [WMX, WMY, 412.3], 0.3, { color: WATER, bracket: 3 });
  pipe(kit, PALETTE, [WMX, WMY, 380.5], [IX0, WMY, 380.5], 0.3, { color: WATER, bracket: 9 });
  elbow(WMX, WMY, 380.5, 0.33);
  pipe(kit, PALETTE, [WMX, WMY, 412.3], [47.5, WMY, 412.3], 0.3, { color: WATER, bracket: 9 });
  elbow(WMX, WMY, 412.3, 0.33);
  pipe(kit, PALETTE, [47.5, WMY, 412.3], [47.5, Y + 2.2, 412.3], 0.3, { color: WATER, bracket: 3 });
  elbow(47.5, WMY, 412.3, 0.33);
  pipe(kit, PALETTE, [47.5, WMY - 0.4, 410.6], [47.5, Y + 2.6, 410.6], 0.2, { color: WATER, bracket: 3 });
  pipe(kit, PALETTE, [47.5, WMY - 0.4, 410.6], [WMX, WMY - 0.4, 410.6], 0.2, { color: WATER, bracket: 9 });
  elbow(47.5, WMY - 0.4, 410.6, 0.22);
  // tap from the manifold up to the main across the tank farm
  pipe(kit, PALETTE, [TANK_X, MY, 397.5], [WMX, MY, 397.5], 0.18, { color: WATER, bracket: 9 });
  pipe(kit, PALETTE, [WMX, MY, 397.5], [WMX, WMY - 0.2, 397.5], 0.18, { color: WATER, bracket: 9 });
  elbow(WMX, MY, 397.5, 0.2);
  // ceiling cable trays (below ducts and pipes)
  tray([39.0, CY - 1.85, 383.0], [61.0, CY - 1.85, 383.0], 0.4);
  tray([39.0, CY - 1.85, 407.4], [58.0, CY - 1.85, 407.4], 0.4);

  // =============================================================================================
  // CATWALK at +4.5 m: east wall (from the riser aft) + aft wall, stairs + landing at the corner
  // =============================================================================================
  const CT = Y + CAT_Y;
  const deck = (x0, z0, x1, z1) => {
    grateQuad(x0, z0, x1, z1, CT);
    kit.boxMM("paintedMetal", [x0, CT - 0.28, z0], [x0 + 0.1, CT - 0.02, z1], { color: dark, texel: 4 });
    kit.boxMM("paintedMetal", [x1 - 0.1, CT - 0.28, z0], [x1, CT - 0.02, z1], { color: dark, texel: 4 });
    kit.boxMM("paintedMetal", [x0, CT - 0.28, z0], [x1, CT - 0.02, z0 + 0.1], { color: dark, texel: 4 });
    kit.boxMM("paintedMetal", [x0, CT - 0.28, z1 - 0.1], [x1, CT - 0.02, z1], { color: dark, texel: 4 });
    const alongX = x1 - x0 > z1 - z0;
    const len = alongX ? x1 - x0 : z1 - z0;
    for (let t = 1.6; t < len - 0.3; t += 1.6) {
      if (alongX) kit.boxMM("paintedMetal", [x0 + t - 0.04, CT - 0.2, z0], [x0 + t + 0.04, CT - 0.02, z1], { color: dark, texel: 4 });
      else kit.boxMM("paintedMetal", [x0, CT - 0.2, z0 + t - 0.04], [x1, CT - 0.02, z0 + t + 0.04], { color: dark, texel: 4 });
    }
  };
  // rail with a kick plate + amber edge strip along the open edge; `inward` points onto the deck
  const railK = (a, b, inward) => {
    rail(kit, PALETTE, a, b, CT, { h: 1.02, post: 1.6 });
    const [ix, iz] = inward;
    const zmin = Math.min(a[2], b[2]);
    const zmax = Math.max(a[2], b[2]);
    const xmin = Math.min(a[0], b[0]);
    const xmax = Math.max(a[0], b[0]);
    if (ix) {
      const x0 = ix > 0 ? a[0] : a[0] - 0.06;
      kit.boxMM("paintedMetal", [x0, CT, zmin], [x0 + 0.06, CT + 0.1, zmax], { color: black, texel: 4 });
      kit.boxMM("emitAmber", [a[0] - 0.005, CT + 0.03, zmin + 0.1], [a[0] + 0.005, CT + 0.07, zmax - 0.1]);
    } else {
      const z0 = iz > 0 ? a[2] : a[2] - 0.06;
      kit.boxMM("paintedMetal", [xmin, CT, z0], [xmax, CT + 0.1, z0 + 0.06], { color: black, texel: 4 });
      kit.boxMM("emitAmber", [xmin + 0.1, CT + 0.03, a[2] - 0.005], [xmax - 0.1, CT + 0.07, a[2] + 0.005]);
    }
  };
  deck(60.1, 387.0, IX1, IZ1); // east run
  deck(IX0, 413.1, 60.1, IZ1); // aft run
  deck(58.6, 408.3, 60.1, 409.9); // stair landing
  railK([60.1, CT, 387.0], [60.1, CT, 408.3], [1, 0]);
  railK([58.6, CT, 408.3], [58.6, CT, 409.9], [1, 0]);
  railK([58.6, CT, 409.9], [60.1, CT, 409.9], [0, -1]);
  railK([60.1, CT, 409.9], [60.1, CT, 413.1], [1, 0]);
  railK([IX0, CT, 413.1], [60.1, CT, 413.1], [0, 1]);
  railK([60.1, CT, 387.0], [IX1, CT, 387.0], [0, 1]);
  // supports: pillars along the east run (in the cabinet gaps), pillars + wall struts for the aft run
  for (const z of [388.6, 393.8, 399.0, 404.2, 409.4]) pillar(kit, PALETTE, [60.3, Y, z], 0.3, CAT_Y - 0.1);
  for (const x of [41.0, 59.0]) pillar(kit, PALETTE, [x, Y, 413.3], 0.3, CAT_Y - 0.1);
  for (let x = 44.5; x < 58; x += 3.6) strut([x, CT - 1.5, IZ1], [x, CT - 0.28, 413.3]);
  for (const z of [391.0, 396.5, 402.0, 407.5, 412.0]) strut([IX1, CT - 0.62, z], [60.3, CT - 0.3, z]);
  // stairs: rise 4.5 over 6.5 alongside the east run, landing at the top
  openStairs(59.2, 401.8, CAT_Y, 6.5, 1.2);
  // under-catwalk work lights (fixtures hung from the deck frame)
  for (const z of [390.5, 396.5, 402.5]) {
    kit.box("paintedMetal", 60.6, CT - 0.33, z, 1.2, 0.1, 0.3, { color: dark });
    kit.box("emitWhite", 60.6, CT - 0.385, z, 1.0, 0.02, 0.16);
  }
  // sump beacon: arm off the aft deck's edge beam, stem, hood, and under it a slowly rotating amber
  // beacon drum (glow row BEACON, 0.2 rev/s). Its light is a down-spot whose target circles the
  // grating in step with the drum's bright sector (a spot cannot mirror off the aft wall).
  {
    const fz = SUMP_Z;
    kit.boxMM("paintedMetal", [49.96, CT - 0.19, fz - 0.04], [50.04, CT - 0.11, 413.15], { color: dark });
    kit.cyl("metal", 50.0, CT - 0.42, fz, 0.025, 0.5, "y", { color: steel, segments: 8 });
    kit.box("paintedMetal", 50.0, CT - 0.73, fz, 0.7, 0.14, 0.44, { color: dark, texel: 2.5 });
    kit.box("paintedMetal", 50.0, CT - 0.81, fz, 0.6, 0.03, 0.34, { color: black });
    kit.cyl("paintedMetal", 50.0, CT - 0.845, fz, 0.16, 0.04, "y", { color: black, segments: 20 });
    const drum = new THREE.CylinderGeometry(0.13, 0.13, 0.24, 24, 1, true);
    drum.translate(50.0, CT - 0.985, fz);
    glow.addRange(drum, ROW.BEACON, 0, 1 / BEACON.sectors);
    kit.cyl("paintedMetal", 50.0, CT - 1.12, fz, 0.14, 0.03, "y", { color: black, segments: 20 });
    sump = { type: "spot", pos: [50.0, CT - 1.15, fz], target: [50.0, Y, fz], color: 0xffb060, intensity: 26, distance: 11, angle: 0.7, penumbra: 0.5, priority: 0.5 };
  }
  // aft wall above the deck: grilles, junction boxes, tray
  for (const x of [43.0, 50.0, 57.0]) grille(x, Y + 7.0, IZ1, Math.PI, 2.0, 0.9);
  junction(46.0, CT + 1.4, IZ1, Math.PI, { conduitTo: CT + 3.0, seed: 8 });
  junction(54.0, CT + 1.4, IZ1, Math.PI, { conduitTo: CT + 3.0, emit: "emitAmber", seed: 9 });
  tray([40.0, CT + 3.0, IZ1 - 0.2], [61.0, CT + 3.0, IZ1 - 0.2], 0.35);

  // =============================================================================================
  // CONTROL STATION (forward wall, west of the door) + stores (east of the door)
  // =============================================================================================
  wallScreen(kit, [40.7, Y + 2.05, IZ0 + 0.1], 0, 1.6, 0.9, "screenImp0", { accent: "emitTeal" });
  wallScreen(kit, [42.5, Y + 2.05, IZ0 + 0.1], 0, 1.6, 0.9, "screenImp3", { accent: "emitTeal" });
  wallScreen(kit, [44.3, Y + 2.05, IZ0 + 0.1], 0, 1.6, 0.9, "screenImp2", { accent: "emitTeal" });
  wallScreen(kit, [42.5, Y + 3.45, IZ0 + 0.1], 0, 3.6, 1.2, "screenImp0", { accent: "emitTeal", tilt: 0.25 });
  wallScreen(kit, [46.2, Y + 3.45, IZ0 + 0.1], 0, 1.2, 1.2, "screenImp3", { accent: "emitTeal" });
  consoleProp(kit, PALETTE, [41.3, Y, 380.0], 0, { w: 2.4, screens: 2, screenMat: "screenImp0", seed: 3 });
  consoleProp(kit, PALETTE, [43.9, Y, 380.0], 0, { w: 2.4, screens: 2, screenMat: "screenImp3", seed: 5 });
  junction(46.6, Y + 1.5, IZ0, 0, { w: 0.5, h: 0.7, conduitTo: Y + 4.7, emit: "emitTeal", seed: 10 });
  mark([39.5, Y + 0.004, 381.3], [46.6, Y + 0.004, 381.3], 0.1, PAINT_TEAL);
  // east of the door: equipment cabinets + lockers + a status screen
  for (let i = 0; i < 3; i++) cabinet(kit, PALETTE, [54.2 + i * 1.4, Y, IZ0 + 0.27], 0, { emit: "emitTeal", seed: 21 + i, color: i === 1 ? grey : mid });
  lockerBank(kit, PALETTE, [59.6, Y, IZ0 + 0.27], 0, { count: 3, unit: 0.6, h: 2.0 });
  wallScreen(kit, [55.6, Y + 2.7, IZ0 + 0.1], 0, 2.4, 0.9, "screenImp2", { accent: "emitTeal" });
  junction(58.6, Y + 2.9, IZ0, 0, { w: 0.4, h: 0.5, conduitTo: Y + 4.7, emit: "emitAmber", seed: 11 });
  // walkway lines into the plant (door sign/keypad/lintel/threshold come from the shell dressing)
  mark([47.6, Y + 0.004, 379.0], [47.6, Y + 0.004, 407.4], 0.12, PAINT_TEAL);
  mark([52.4, Y + 0.004, 379.0], [52.4, Y + 0.004, 407.4], 0.12, PAINT_TEAL);
  // small emissive floor markers at the walkway's door end and at the sump access
  for (const x of [47.6, 52.4]) for (const z of [379.2, 407.2]) kit.box("emitTeal", x, Y + 0.012, z, 0.16, 0.012, 0.16);
  // walkway centre: flush bolted access hatch with a painted border, and a drain grate further aft
  // (floor anchors for the long empty run; both are flat enough to walk over, so no colliders)
  {
    const hx = 50.0;
    const hz = 395.0;
    kit.box("paintedMetal", hx, Y + 0.006, hz, 1.6, 0.012, 1.6, { color: dark, texel: 4 });
    kit.box("paintedMetal", hx, Y + 0.013, hz, 1.3, 0.004, 1.3, { color: black });
    for (const dx of [-0.7, 0, 0.7]) for (const dz of [-0.7, 0, 0.7]) {
      if (dx === 0 && dz === 0) continue;
      kit.cyl("metal", hx + dx, Y + 0.02, hz + dz, 0.035, 0.016, "y", { color: steel, segments: 8 });
    }
    for (const dx of [-0.3, 0.3]) kit.box("metal", hx + dx, Y + 0.02, hz, 0.06, 0.014, 0.4, { color: steel });
    for (const [a, b] of [
      [[hx - 1.0, hz - 1.0], [hx + 1.0, hz - 1.0]],
      [[hx - 1.0, hz + 1.0], [hx + 1.0, hz + 1.0]],
      [[hx - 1.0, hz - 1.0], [hx - 1.0, hz + 1.0]],
      [[hx + 1.0, hz - 1.0], [hx + 1.0, hz + 1.0]],
    ]) mark([a[0], Y + 0.004, a[1]], [b[0], Y + 0.004, b[1]], 0.08, PAINT_TEAL);
    kit.box("paintedMetal", 50.0, Y + 0.004, 401.5, 1.16, 0.008, 1.16, { color: black });
    grateQuad(49.48, 400.98, 50.52, 402.02, Y + 0.01);
    for (const [cx, cz, sx, sz] of [[50.0, 400.95, 1.2, 0.06], [50.0, 402.05, 1.2, 0.06], [49.43, 401.5, 0.06, 1.2], [50.57, 401.5, 0.06, 1.2]]) {
      kit.box("paintedMetal", cx, Y + 0.008, cz, sx, 0.016, sz, { color: dark });
    }
  }

  // =============================================================================================
  // LIGHTS (descriptors): cool fills below the ceiling, teal accents over the water plant, a work
  // light for the scrubber bank, amber over the sump, a bright pool over the control station
  // =============================================================================================
  // Fills hang in two rows of housed pendant bars (x 48 / 52, either side of the walkway centreline
  // and 1.9 m inside the white branch ducts at x 46.1 / 53.9 — a fill within ~1.5 m of a white duct
  // blew its underside out). The bars drop 3 m from the ceiling: the rig's captured environment no
  // longer lifts the painted deck, so the floor exposure comes from key + fills, and from 3 m below
  // the plate each fill also paints a soft halo on the (lifted) ceiling around its bar instead of
  // the black plane pass 3 saw. West row weaker: the key covers that side and its shadow bands need
  // the contrast; east row carries the scrubber side. Fills stay ≤ 15 % of the key.
  const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
  // drop rod from a ceiling plate, dark housing over a black bezel, matte diffuser face on the
  // atlas' LAMP row (~88 %) filling the underside. The fill descriptor sits on the rod 0.3 m ABOVE
  // the housing: a point light is omnidirectional, and under the face (0.25 m, then 0.4 m) its
  // specular on the diffuser and the bezel pushed the whole bar to clipped white; above the housing
  // the face is turned away from it, the pool still centres under the bar and the ceiling 2.6 m up
  // gets the soft halo the fixture is supposed to make
  const pendantBar = (x, z, intensity, distance, priority = 0.5) => {
    const fy = CY - 3.1; // diffuser face
    kit.box("paintedMetal", x, CY - 0.03, z, 0.5, 0.06, 0.5, { color: black });
    const rodTop = CY - 0.06;
    const rodBot = fy + 0.16;
    kit.box("paintedMetal", x, (rodTop + rodBot) / 2, z, 0.06, rodTop - rodBot, 0.06, { color: black });
    kit.box("paintedMetal", x, fy + 0.11, z, 0.46, 0.1, 2.2, { color: dark, texel: 2.5 });
    kit.box("paintedMetal", x, fy + 0.035, z, 0.48, 0.06, 2.22, { color: black });
    glow.box(ROW.LAMP, 0.5, 0.4, 0.01, 2.12, [x, fy, z]);
    L([x, fy + 0.46, z], 0xd8f0ea, intensity, distance, priority);
  };
  // first pair 5 m inside the door hole (lit approach), last pair 6 m short of the aft catwalk camera
  const BAR_Z = [382.5, 391.5, 400.5, 407.9];
  BAR_Z.forEach((z, i) => pendantBar(48.0, z, i === 0 ? 55 : 38, 20, i === 0 ? 0.8 : 0.5));
  BAR_Z.forEach((z, i) => pendantBar(52.0, z, i === 0 ? 60 : 66, 24, i === 0 ? 0.8 : 0.5));
  L([45.8, Y + 4.6, 391.5], 0x5fe8d8, 22, 11);
  L([45.8, Y + 4.6, 403.5], 0x5fe8d8, 22, 11);
  L([43.0, Y + 4.3, 381.0], 0xe4f6ff, 32, 12, 0.7);
  L([59.0, CT - 0.8, 394.0], 0xdde8ff, 16, 10);
  // sump beacon spot (its target sweeps the grating in update())
  ctx.lights.push(sump);
  // SHADOW KEY: a yoked flood head hung from the ceiling in the south-west corner of the tank farm
  // (between the water main's wall branch and the forward cable tray, 1 m off the west wall), aimed
  // 50° across the row at the walkway's east edge, 24° below the horizon. From there it lights the
  // tanks' door-facing sides from the right while their walkway-facing sides stay fill-lit (a lit
  // and an unlit side on every tank in the door view), and each tank throws a 13 m shadow band
  // across the deck and the walkway (door + water views) — aimed along the row (pass 3) the bands
  // fell on the next tank and the pump skids instead of the deck. Hung 7 m from tank 1's rim rather
  // than 4.5: closer, its specular on the white shell clipped.
  // Exposure: the rig builds spots with decay 1.6 (not 2), so at 8 m the white shell of tank 1 takes
  // I/28 while the deck 15 m out takes I/75 — the shell, not the deck, sets the ceiling on I. The
  // beam is shaped so the deck band and the walkway sit inside the full cone (≤ 24° off axis) while
  // tank 1's forward shoulder (the water view's near side, ~30° off) is already in the penumbra fade
  // and tank 4 at the rim. 260 cd keeps that shoulder ≤ ~85 % after tone mapping: at 340 it
  // saturated into a hard-edged white pool (~0.7 % of the water frame) while the door view's deck
  // and tank readings did not move between 270 and 340 — the bands' read comes from direction and
  // the fills' absence on that strip, not from the key's absolute level. distance 40 ≥ the room's
  // long side.
  {
    const pivot = [39.3, CY - 0.95, 381.8];
    const target = [55.0, Y, 395.0];
    const dir = new THREE.Vector3(target[0] - pivot[0], target[1] - pivot[1], target[2] - pivot[2]).normalize();
    const yaw = Math.atan2(dir.x, dir.z); // aim azimuth → yoke local +z
    const tilt = Math.acos(-dir.y); // head tilt about the axle, from straight down toward local +z
    const H = placer(kit, [pivot[0], CY, pivot[2]], yaw);
    const py = pivot[1] - CY;
    // ceiling plate, yoke arms either side of the head, pivot axle along local x
    H.box("paintedMetal", 0, -0.03, 0, 0.9, 0.06, 0.6, { color: black });
    for (const dx of [-0.33, 0.33]) H.box("paintedMetal", dx, py / 2 - 0.03, 0, 0.06, -py - 0.06, 0.06, { color: black });
    H.cyl("metal", 0, py, 0, 0.035, 0.72, "x", { color: steel, segments: 10 });
    // head box, black bezel, side flaps: built facing down about the pivot, then tilted toward the aim
    const part = (mat, sx, sy, sz, oy, oz, opts) => {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      g.translate(0, oy, oz);
      g.rotateX(-tilt);
      H.add(mat, g, 0, py, 0, opts);
    };
    part("paintedMetal", 0.9, 0.34, 0.56, 0, 0, { color: dark, texel: 2.5 });
    part("paintedMetal", 0.96, 0.05, 0.62, -0.16, 0, { color: black });
    for (const s of [-1, 1]) part("paintedMetal", 0.9, 0.22, 0.04, -0.27, s * 0.3, { color: dark });
    // lamp face on the atlas' LAMP row (~88 %, not the flat-white emitter)
    const face = new THREE.BoxGeometry(0.8, 0.012, 0.46);
    face.translate(0, -0.19, 0);
    face.rotateX(-tilt);
    face.rotateY(yaw);
    face.translate(pivot[0], pivot[1], pivot[2]);
    glow.add(face, ROW.LAMP, 0.5);
    const pos = [pivot[0] + 0.55 * dir.x, pivot[1] + 0.55 * dir.y, pivot[2] + 0.55 * dir.z];
    ctx.lights.push({ type: "spot", pos, target, color: 0xe8f4f0, intensity: 260, distance: 40, angle: 0.85, penumbra: 0.5, priority: 1.0, shadow: true });
  }

  glow.build(ctx.group);
  return {
    update(dt, t) {
      // pump run lamps: three skids, three rates
      for (let i = 0; i < PUMP_BLINK.length; i++) glow.fill(ROW.PUMP0 + i, C_TEAL, blink(t, PUMP_BLINK[i]));
      // scrubber fan glow breathes at 0.3 Hz
      glow.fill(ROW.FAN, C_TEAL, 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * Math.PI * 0.6)));
      // sump beacon: the spot's pool circles the grating under the drum's bright sector
      const a = glow.beaconAngle(t, BEACON.sectors, BEACON.s0, BEACON.width);
      sump.target[0] = 50.0 + 1.2 * Math.sin(a);
      sump.target[2] = SUMP_Z + 1.2 * Math.cos(a);
      glow.update(t);
    },
    dispose() {
      glow.dispose();
    },
  };
}
