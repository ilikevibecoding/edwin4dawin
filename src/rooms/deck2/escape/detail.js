// Deck 2 escape-pod bay — Phase 2 detail (fix round). Ten pod stations (five per long wall): a heavy
// round hatch door (thick disc, eight locking dogs, lit viewport, hinge blocks, lever) seated on the
// annular face of a framed collar with a numbered label plate, a muster step with rails, a status
// pillar and a launch-tube housing above. One hatch per wall stands open on a lit two-seat cabin
// (through a real wall opening); one east pod is in FAULT (red ring, dark viewport, red pillar).
// Centre: dark runway with the amber muster line, a boarding checkpoint (pedestal pair + open lane
// gate) and a stretcher trolley near the door, numbered muster squares in front of every pod, mid-bay
// pedestals; 26 housed suspended fixtures in three hall rows (+ two east-side pendants) plus one
// pendant per pod; belt dividers hold the west waiting area, the east has A-frame barriers at the
// FAULT pod and an information pylon. Door end: lockers, O2 rack, console. Forward wall: status
// board (numbered tiles + text strips + LED row), suit rack, supply shelves, locker banks. Amber
// accents; lights are descriptors (5 hatch accents + the FAULT beacon + 2 cabin lights + 4 down-spots
// under the centreline fixtures + 2 east-side pendants; the down-spot nearest the door is the shadow
// key, aimed 36° down the runway).
// Motion (lighting round): one animated emitter mesh (glow.js atlas, 1 draw call) carries the FAULT
// pod's rotating beacon drum + pulsing ring / tube strip / board tile, the READY pods' breathing
// green caps, the runway guide dashes chasing toward the pods, the status board tiles' occasional
// flicker and the open cabins' flickering lights; the beacon and cabin descriptors follow.
import * as THREE from "three";
import { insideOut, rng } from "../../../kit.js";
import { col } from "../_shared/palette.js";
import { rail, WALL_T } from "../_shared/shell.js";
import { placer, indicatorField, console as consoleProp, wallScreen, lockerBank, cabinet, floorLine, pipe, dropLight } from "../_shared/props.js";
import { GlowAtlas, rgb, frac } from "../lifesupport/glow.js";

const X0 = -20;
const X1 = 20;
const Z0 = 305;
const Z1 = 330;
const IX0 = X0 + WALL_T; // -19.7
const IX1 = X1 - WALL_T; // 19.7
const IZ0 = Z0 + WALL_T; // 305.3
const IZ1 = Z1 - WALL_T; // 329.7

export const STATION_Z = [308.6, 313.0, 317.4, 321.8, 326.2];
// per-station state: s = g ready / a standby / r fault; h = hinge side (local ±x); open = hatch open
// West row alternates standby / ready (a g a g a from the door) with pod 4 open; east row is all
// ready with pod 2 open and pod 3 in FAULT — the two rows never show the same sequence. The open
// pods sit second from each row's camera so the cabin is seen ~35 deg off its axis.
const WEST = [
  { s: "a", h: -1 },
  { s: "g", h: 1 },
  { s: "a", h: -1 },
  { s: "g", h: 1, open: true },
  { s: "a", h: -1 },
];
const EAST = [
  { s: "g", h: 1 },
  { s: "g", h: 1, open: true },
  { s: "r", h: -1 },
  { s: "g", h: 1 },
  { s: "g", h: -1 },
];
const EMIT = { g: "emitGreen", a: "emitAmber", r: "emitRedImp" };
const RED = new THREE.Color("#7a2a24");
// painted floor amber: a pigment, not the emitter colour — at #ffb040 (≈0.6 effective albedo) a line
// straight under a 160 cd fill already sat on the bloom threshold, and the gate marks under the
// 400 cd key bloomed into a white haze over the checkpoint. DEEP is for marks inside the key pool
// (E ≈ 2–3× a fill pool) so they render at the same perceived brightness as the rest.
const PAINT_AMBER = new THREE.Color("#c8802a");
const PAINT_AMBER_DEEP = new THREE.Color("#7a4a12");
const SWING = (135 * Math.PI) / 180; // open-hatch swing angle (past 90 deg so the leaf clears the cabin view)

// Animated emitter atlas rows (glow.js). Static rows scroll at RATE texture widths / s: the beacon
// row holds 5 sectors so the drum turns at 1 rev/s, the green row two sine periods (0.4 Hz
// breathing), the runway row one pulse (a 5 s chase). Live rows are rewritten per frame.
const ROW = { GREEN: 0, RUNWAY: 1, BEACON: 2, FAULT: 3, TILE0: 4, CABIN0: 14, LINE: 16, WHITE: 17, AMBER: 18 };
const ROWS = 19;
const RATE = 0.2;
const BEACON = { sectors: 5, s0: 0.64, width: 0.22 }; // s0 puts the sector facing the bay at t = 40
const hash = (n) => frac(Math.sin(n * 12.9898) * 43758.5453);
// status board tile: steady with a hair of jitter; a brief flutter in ~6 % of the 1/3 s segments
const flicker = (t, seed) => {
  const seg = Math.floor(t * 3) + seed * 17;
  if (hash(seg) < 0.06) return 0.4 + 0.6 * Math.abs(Math.sin(t * 37 + seed));
  return 0.95 + 0.05 * hash(seg + 0.5);
};
// open cabin lamp: gentle irregular flicker, 0.72–1.0
const cabinFlicker = (t, phase) => 0.84 + 0.1 * Math.sin(t * 6.1 + phase) + 0.06 * Math.sin(t * 15.7 + 1.7 * phase);

// Wall openings behind the two open hatches (the manifest passes these to the shell): square holes
// hidden behind the collar throat, closed off by the cabin tube built in detail().
export function podOpenings(Y) {
  const op = (face, z) => ({ face, a0: z - 1.1, a1: z + 1.1, y0: Y + 0.8, y1: Y + 3.0, kind: "window", glass: false, reveal: false });
  const out = [];
  WEST.forEach((w, i) => w.open && out.push(op("w", STATION_Z[i])));
  EAST.forEach((e, i) => e.open && out.push(op("e", STATION_Z[i])));
  return out;
}

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
  const amber = P("impAmber");

  // ---- animated emitters: one atlas mesh for every moving light's visible source -------------------
  const glow = new GlowAtlas(ROWS, { intensity: 1.4, rate: RATE });
  const C_GREEN = rgb(P("impGreen"));
  const C_AMBER = rgb(P("impAmber"));
  const C_RED = rgb(P("impRed"));
  const C_WARM = rgb(0xffe4c4);
  glow.pattern(ROW.GREEN, C_GREEN, (u) => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(Math.PI * 4 * u)));
  glow.pattern(ROW.RUNWAY, C_AMBER, (u) => 0.2 + 0.8 * Math.exp(-(((u - 0.745) / 0.045) ** 2))); // lit dash 5 (z 322.9) at t = 40
  glow.beaconRow(ROW.BEACON, C_RED, BEACON.sectors, BEACON.s0, BEACON.width);
  glow.fill(ROW.LINE, C_AMBER, 0.4); // steady dim inlay (the muster line)
  // steady white row (= emitWhite at 1.3): the lit viewports and the board's "open" markers ride the
  // atlas so the room keeps a material slot free for the rubber runway mat
  const C_WHITE = rgb(0xdfe9ff);
  glow.fill(ROW.WHITE, C_WHITE, 0.93);
  glow.fill(ROW.AMBER, C_AMBER, 1); // steady amber for emitters that face a down-spot (board header)
  let beacon = null; // { desc, cx, cz, yaw } — the FAULT pod's red beacon light
  const cabins = []; // { desc, row, phase } — open pods' cabin lights
  const tiles = []; // { row, c, seed } — status board colour fields (live rows)

  // ---- local helpers ------------------------------------------------------------------------------
  // painted hazard markings (amber stripes on black): a floor patch lying flat, or a band on a face
  // toward local +Z. Painted instead of the shared hazard texture so its draw call goes to the atlas.
  const hazardFloor = (Q, lx, lz, w, d, y = 0.003) => {
    Q.box("paintedMetal", lx, y, lz, w, 0.006, d, { color: black });
    const n = Math.round(w / 0.4);
    for (let k = 0; k < n; k++) Q.box("paintedMetal", lx - w / 2 + (k + 0.5) * (w / n), y + 0.004, lz, (w / n) * 0.5, 0.004, d - 0.08, { color: PAINT_AMBER });
  };
  const hazardBand = (Q, lx, ly, lz, w, h) => {
    Q.box("paintedMetal", lx, ly, lz, w, h, 0.01, { color: black });
    const n = Math.round(w / 0.3);
    for (let k = 0; k < n; k++) Q.box("paintedMetal", lx - w / 2 + (k + 0.5) * (w / n), ly, lz + 0.002, (w / n) * 0.5, h - 0.02, 0.01, { color: PAINT_AMBER });
  };
  const junction = (x, y, z, yaw, { w = 0.4, h = 0.5, conduitTo = null, emit = "emitAmber", seed = 1 } = {}) => {
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
  const grille = (x, y, z, yaw, w = 1.2, h = 0.6) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", 0, 0, 0.085, w - 0.12, h - 0.12, 0.01, { color: black });
    const n = Math.floor((h - 0.2) / 0.1);
    for (let i = 0; i < n; i++) Q.box("paintedMetal", 0, -h / 2 + 0.14 + i * 0.1, 0.1, w - 0.2, 0.03, 0.02, { color: grey });
  };
  // wall-mounted fire-hose reel: bracket, drum with a coiled hose, nozzle
  const hoseReel = (x, y, z, yaw) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, 0, 0.06, 0.5, 0.7, 0.12, { color: RED, texel: 2.5 });
    Q.cyl("paintedMetal", 0, 0, 0.22, 0.3, 0.16, "z", { color: black, segments: 24 });
    Q.add("metal", new THREE.TorusGeometry(0.22, 0.05, 8, 28), 0, 0, 0.26, { color: dark });
    Q.add("metal", new THREE.TorusGeometry(0.14, 0.04, 8, 24), 0, 0, 0.27, { color: dark });
    Q.cyl("metal", 0, 0, 0.3, 0.04, 0.04, "z", { color: steel, segments: 10 });
    Q.cyl("metal", 0.32, -0.28, 0.16, 0.035, 0.28, "y", { color: steel, segments: 8 });
    Q.box("emitRedImp", -0.18, 0.28, 0.125, 0.1, 0.03, 0.01);
  };
  // Imperial cargo module without rubber bumpers (keeps the material count down)
  const crate = (x, z, yaw, { s = 1.2, color = mid, y = Y, emit = "emitAmber" } = {}) => {
    const Q = placer(kit, [x, y, z], yaw);
    Q.box("paintedMetal", 0, s / 2, 0, s, s, s, { color, texel: 2.5 });
    for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (sz) Q.box("paintedMetal", 0, s / 2, (sz * s) / 2 + sz * 0.001, s - 0.3, s - 0.3, 0.03, { color: dark, texel: 2.5 });
      else Q.box("paintedMetal", (sx * s) / 2 + sx * 0.001, s / 2, 0, 0.03, s - 0.3, s - 0.3, { color: dark, texel: 2.5 });
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Q.box("paintedMetal", (sx * (s - 0.1)) / 2, s / 2, (sz * (s - 0.1)) / 2, 0.1, s + 0.02, 0.1, { color: black });
    Q.box("metal", 0, s - 0.15, s / 2 + 0.03, 0.4, 0.05, 0.05, { color: steel });
    Q.box(emit, s / 2 - 0.2, s - 0.12, s / 2 + 0.017, 0.12, 0.03, 0.006);
    // stencil label + latch bars so the module does not read as a plain cube
    Q.box("paintedMetal", -s / 2 + 0.3, s * 0.55, s / 2 + 0.017, 0.28, 0.12, 0.006, { color: white });
    for (const lx of [-0.2, 0.2]) Q.box("metal", lx, s * 0.3, s / 2 + 0.03, 0.06, 0.16, 0.04, { color: steel });
    Q.collider([-s / 2, 0, -s / 2], [s / 2, s, s / 2], "crate");
  };
  // one line of "text": a slice of the text-columns screen mapped onto a thin strip
  const textStrip = (Q, lx, ly, lz, w, h, seed = 0) => {
    const v0 = 0.3 + (seed % 5) * 0.08;
    Q.box("screenImp2", lx, ly, lz, w, h, 0.01, { uv: "keep", uvRect: [0.05, v0, 0.42, v0 + 0.05] });
  };

  // =============================================================================================
  // POD STATIONS — local frame: wall at z 0, room toward +Z, x along the wall
  // =============================================================================================
  const TUBE_Y0 = 3.55; // launch-tube housing starts above the collar
  const tubeH = CY - 0.1 - (Y + TUBE_Y0);

  // Heavy hatch door in a door-local frame: hinge axis at local x 0, the door extends toward +x with
  // its centre at (cx, 1.9, 0); `f` is the front-face sign so one builder serves both hinge sides.
  const hatchDoor = (D, cx, f, status) => {
    const z = (d) => f * d;
    D.cyl("paintedMetal", cx, 1.9, 0, 1.05, 0.22, "z", { color: mid, segments: 40 });
    D.add("metal", new THREE.TorusGeometry(0.96, 0.05, 6, 40), cx, 1.9, z(0.11), { color: steel });
    D.add("paintedMetal", new THREE.TorusGeometry(0.62, 0.03, 6, 32), cx, 1.9, z(0.115), { color: black });
    // eight locking dogs straddling the door edge
    for (let k = 0; k < 8; k++) {
      const g = new THREE.BoxGeometry(0.3, 0.16, 0.18);
      g.translate(1.0, 0, 0);
      g.rotateZ(((k + 0.5) / 8) * Math.PI * 2);
      D.add("metal", g, cx, 1.9, z(0.19), { color: steel });
    }
    // viewport: steel ring, glowing cabin behind it (dark glass on a fault pod), two frame bars
    D.add("metal", new THREE.TorusGeometry(0.3, 0.045, 6, 24), cx, 1.9, z(0.13), { color: steel });
    if (status === "r") D.cyl("darkGloss", cx, 1.9, z(0.122), 0.27, 0.02, "z", { segments: 32 });
    else {
      const g = new THREE.CylinderGeometry(0.27, 0.27, 0.02, 32);
      g.rotateX(Math.PI / 2);
      g.rotateY(D.yaw);
      const p = D.world(cx, 1.9, z(0.122));
      g.translate(p[0], p[1], p[2]);
      glow.add(g, ROW.WHITE, 0.5);
    }
    D.box("paintedMetal", cx, 1.9, z(0.135), 0.03, 0.54, 0.01, { color: black });
    D.box("paintedMetal", cx, 1.9, z(0.135), 0.54, 0.03, 0.01, { color: black });
    // lever handle on the side away from the hinge, knuckles on the hinge axis
    const lg = new THREE.BoxGeometry(0.62, 0.07, 0.07);
    lg.translate(0.31, 0, 0);
    lg.rotateZ(-0.5);
    D.add("metal", lg, cx + 0.45, 1.55, z(0.2), { color: steel });
    D.cyl("paintedMetal", cx + 0.45, 1.55, z(0.2), 0.08, 0.1, "z", { color: black, segments: 12 });
    D.box("paintedMetal", cx + 0.45 + 0.54 * Math.cos(-0.5), 1.55 + 0.54 * Math.sin(-0.5), z(0.2), 0.1, 0.1, 0.1, { color: black });
    for (const y of [1.35, 2.45]) D.cyl("metal", 0, y, 0, 0.075, 0.34, "y", { color: dark, segments: 12 });
    // inner face (seen on the open hatches): dog-bolt heads, viewport glass, locking wheel, warning plate
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2;
      D.cyl("metal", cx + 0.85 * Math.cos(a), 1.9 + 0.85 * Math.sin(a), z(-0.125), 0.05, 0.03, "z", { color: steel, segments: 8 });
    }
    D.cyl("darkGloss", cx, 1.9, z(-0.12), 0.27, 0.02, "z", { segments: 32 });
    D.add("metal", new THREE.TorusGeometry(0.3, 0.03, 6, 24), cx, 1.9, z(-0.125), { color: steel });
    D.add("metal", new THREE.TorusGeometry(0.44, 0.03, 6, 28), cx, 1.9, z(-0.17), { color: steel });
    for (let k = 0; k < 4; k++) {
      const g = new THREE.BoxGeometry(0.16, 0.04, 0.04);
      g.translate(0.37, 0, 0);
      g.rotateZ((k / 4) * Math.PI * 2 + Math.PI / 4);
      D.add("metal", g, cx, 1.9, z(-0.16), { color: steel });
    }
    D.box("paintedMetal", cx, 2.62, z(-0.115), 0.5, 0.14, 0.01, { color: amber });
    D.box("paintedMetal", cx, 2.62, z(-0.117), 0.36, 0.05, 0.01, { color: black });
  };

  const station = (pos, yaw, spec, idx, seed) => {
    const Q = placer(kit, pos, yaw);
    const { s: status, h, open } = spec;
    const cap = EMIT[status];
    const cabinRow = open ? ROW.CABIN0 + cabins.length : -1;
    // animated piece in the station frame: box (yaw-rotated) on a glow row at phase u
    const G = (row, u, lx, ly, lz, sx, sy, sz) => glow.box(row, u, sx, sy, sz, Q.world(lx, ly, lz), yaw);
    // plinth + framed collar (3.0 x 3.0 x 0.5) around a 2.0 m throat, annular seat plate with bolts
    Q.box("paintedMetal", 0, 0.25, 0.25, 3.0, 0.5, 0.5, { color: black, texel: 4 });
    for (const sx of [-1, 1]) Q.box("paintedMetal", sx * 1.25, 2.0, 0.25, 0.5, 3.0, 0.5, { color: dark, texel: 4 });
    Q.box("paintedMetal", 0, 0.7, 0.25, 2.0, 0.4, 0.5, { color: dark, texel: 4 });
    Q.box("paintedMetal", 0, 3.2, 0.25, 2.0, 0.6, 0.5, { color: dark, texel: 4 });
    for (const sx of [-1, 1]) Q.box("impPanel", sx * 1.25, 2.0, 0.512, 0.34, 2.8, 0.02, { color: grey, uv: "keep" });
    Q.add("paintedMetal", new THREE.RingGeometry(1.0, 1.45, 48), 0, 1.9, 0.505, { color: grey, texel: 2.5 });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      Q.cyl("metal", 1.32 * Math.cos(a), 1.9 + 1.32 * Math.sin(a), 0.51, 0.045, 0.03, "z", { color: steel, segments: 8 });
    }
    // lit seal ring in the status colour; the FAULT pod's ring pulses (glow row FAULT)
    if (status === "r") {
      const ring = new THREE.TorusGeometry(1.08, 0.02, 4, 48);
      ring.rotateY(yaw);
      ring.translate(...Q.world(0, 1.9, 0.52));
      glow.add(ring, ROW.FAULT, 0.5);
    } else Q.add(cap, new THREE.TorusGeometry(1.08, 0.02, 4, 48), 0, 1.9, 0.52);
    // hinge blocks on the jamb, then the door (closed on its seat, or swung 110 deg into the bay)
    for (const y of [1.35, 2.45]) Q.box("paintedMetal", h * 1.25, y, 0.62, 0.3, 0.36, 0.28, { color: black, texel: 2.5 });
    {
      const dyaw = yaw + (h > 0 ? Math.PI : 0) + (open ? (h > 0 ? SWING : -SWING) : 0);
      hatchDoor(placer(kit, Q.world(h * 1.3, 0, 0.61), dyaw), 1.3, -h, status);
    }
    if (open) {
      // cabin: inside-out tube through the wall opening, aft bulkhead, deck, two seats with straps,
      // a housed cabin light and a grab bar
      const tube = new THREE.CylinderGeometry(1.0, 1.0, 2.05, 24, 1, true);
      tube.rotateX(Math.PI / 2);
      Q.add("impPanel", insideOut(tube), 0, 1.9, -0.525, { color: white, uv: "scale", uvScale: [6.3, 2.05] });
      Q.cyl("paintedMetal", 0, 1.9, -1.52, 1.0, 0.06, "z", { color: mid, segments: 32, texel: 2.5 });
      Q.cyl("darkGloss", 0, 2.35, -1.485, 0.16, 0.02, "z", { segments: 20 });
      Q.box("emitAmber", 0, 1.3, -1.485, 0.4, 0.05, 0.01);
      Q.box("paintedMetal", 0, 1.17, -0.55, 1.3, 0.05, 1.95, { color: dark, texel: 2.5 });
      // two seats pulled toward the hatch so they read through the opening from the row views:
      // black pads on dark frames, tall backs, crossed amber straps with lit buckles, headrests
      for (const sx of [-1, 1]) {
        Q.box("paintedMetal", sx * 0.36, 1.38, -0.5, 0.5, 0.38, 0.5, { color: dark, texel: 2.5 });
        Q.box("paintedMetal", sx * 0.36, 1.6, -0.5, 0.46, 0.08, 0.46, { color: black });
        Q.box("paintedMetal", sx * 0.36, 2.05, -0.8, 0.5, 0.9, 0.1, { color: dark, texel: 2.5 });
        Q.box("paintedMetal", sx * 0.36, 2.05, -0.74, 0.4, 0.8, 0.02, { color: black });
        Q.box("paintedMetal", sx * 0.36, 2.6, -0.79, 0.3, 0.18, 0.12, { color: black });
        for (const d of [-1, 1]) {
          const g = new THREE.BoxGeometry(0.07, 0.7, 0.02);
          g.rotateZ(d * 0.55);
          Q.add("paintedMetal", g, sx * 0.36, 2.05, -0.72, { color: amber });
        }
        Q.box("emitAmber", sx * 0.36, 2.05, -0.705, 0.1, 0.1, 0.01);
        Q.box("emitAmber", sx * 0.36, 2.72, -1.484, 0.14, 0.06, 0.01);
      }
      // cabin lamp + boarding light are on the pod's own circuit: both flicker with the cabin light
      Q.box("paintedMetal", 0, 2.86, -0.6, 0.18, 0.05, 1.5, { color: black });
      G(cabinRow, 0.5, 0, 2.83, -0.6, 0.1, 0.02, 1.4);
      Q.cyl("metal", 0, 2.55, 0.1, 0.02, 1.3, "x", { color: steel, segments: 8 });
      for (const sx of [-1, 1]) Q.box("emitAmber", sx * 0.62, 1.2, -0.55, 0.03, 0.02, 1.8);
      // boarding light recessed in the collar's top rail, lighting the cabin and the open door
      Q.box("paintedMetal", 0, 2.93, 0.25, 0.9, 0.06, 0.34, { color: black });
      G(cabinRow, 0.5, 0, 2.895, 0.25, 0.8, 0.01, 0.26);
    }
    // label plate: dark plate, "POD" glyph in white bars, pod number as lit blocks, status lamp
    Q.box("paintedMetal", 0, 3.2, 0.52, 1.7, 0.36, 0.04, { color: black, texel: 2.5 });
    const gy = 3.2;
    const gz = 0.545;
    Q.box("paintedMetal", -0.7, gy, gz, 0.04, 0.22, 0.01, { color: white });
    Q.box("paintedMetal", -0.63, gy + 0.06, gz, 0.1, 0.1, 0.01, { color: white });
    Q.box("paintedMetal", -0.46, gy, gz, 0.16, 0.22, 0.01, { color: white });
    Q.box("paintedMetal", -0.46, gy, gz + 0.002, 0.08, 0.12, 0.01, { color: black });
    Q.box("paintedMetal", -0.26, gy, gz, 0.16, 0.22, 0.01, { color: white });
    Q.box("paintedMetal", -0.23, gy, gz + 0.002, 0.07, 0.12, 0.01, { color: black });
    for (let k = 0; k < 5; k++) Q.box(k <= idx ? "emitAmber" : "darkGloss", 0.02 + k * 0.13, gy, gz, 0.09, 0.09, 0.01);
    Q.box(cap, 0.72, gy, gz, 0.1, 0.1, 0.01);
    // muster step: 0.6 m block with a deck tread, lit nose, kick base; hazard on the floor in front
    Q.box("paintedMetal", 0, 0.05, 1.0, 2.5, 0.1, 1.1, { color: black });
    Q.box("paintedMetal", 0, 0.35, 1.0, 2.4, 0.5, 1.0, { color: mid, texel: 4 });
    Q.box("paintedMetal", 0, 0.61, 1.0, 2.42, 0.02, 1.02, { color: dark, texel: 4 });
    Q.box("emitAmber", 0, 0.58, 1.505, 2.2, 0.03, 0.01);
    hazardFloor(Q, 0, 1.85, 2.8, 0.7);
    for (const sx of [-1, 1]) {
      if (open && sx === h) continue; // rail folded away on the hinge side of an open hatch
      rail(kit, PALETTE, Q.world(sx * 1.2, 0, 0.55), Q.world(sx * 1.2, 0, 1.45), pos[1] + 0.6, { h: 1.02, post: 1.0 });
    }
    Q.collider([-1.5, 0, 0], [1.5, 3.5, 0.55], "pod-collar");
    Q.collider([-1.25, 0, 0.5], [1.25, 0.62, 1.5], "pod-step");
    // numbered muster square on the deck: painted outline + block pattern (pod number) + chevron
    {
      const cz = 3.1;
      const s = 1.5;
      for (const [lx, lz, sx, sz] of [[0, cz - s / 2, s, 0.08], [0, cz + s / 2, s, 0.08], [-s / 2, cz, 0.08, s], [s / 2, cz, 0.08, s]]) {
        Q.box("paintedMetal", lx, 0.004, lz, sx, 0.008, sz, { color: PAINT_AMBER });
      }
      for (let k = 0; k < 5; k++) Q.box("paintedMetal", -0.52 + k * 0.26, 0.004, cz + 0.35, 0.18, 0.008, 0.18, { color: k <= idx ? PAINT_AMBER : dark });
      Q.box("paintedMetal", 0, 0.004, cz - 0.25, 0.7, 0.008, 0.08, { color: PAINT_AMBER });
      Q.box("paintedMetal", 0, 0.004, cz - 0.45, 0.4, 0.008, 0.08, { color: PAINT_AMBER });
    }
    // status pillar beside the collar: READY caps breathe (glow row GREEN, staggered phase), a
    // standby cap is a steady amber block, the FAULT pod carries a rotating red beacon drum
    Q.box("paintedMetal", 1.95, 0.05, 0.55, 0.36, 0.1, 0.36, { color: black });
    Q.box("paintedMetal", 1.95, 0.75, 0.55, 0.3, 1.5, 0.3, { color: status === "r" ? RED : dark, texel: 2.5 });
    if (status === "g") G(ROW.GREEN, frac(idx * 0.23 + (yaw > 0 ? 0 : 0.5)), 1.95, 1.54, 0.55, 0.32, 0.08, 0.32);
    else if (status === "r") {
      Q.box("paintedMetal", 1.95, 1.53, 0.55, 0.32, 0.06, 0.32, { color: black });
      Q.cyl("paintedMetal", 1.95, 1.59, 0.55, 0.13, 0.06, "y", { color: black, segments: 20 });
      const drum = new THREE.CylinderGeometry(0.11, 0.11, 0.2, 24, 1, true);
      const c = Q.world(1.95, 1.72, 0.55);
      drum.translate(c[0], c[1], c[2]);
      glow.addRange(drum, ROW.BEACON, 0, 1 / BEACON.sectors);
      Q.cyl("paintedMetal", 1.95, 1.835, 0.55, 0.125, 0.03, "y", { color: black, segments: 20 });
      const desc = { type: "point", pos: [c[0], c[1], c[2]], color: 0xff4a2a, intensity: 8, distance: 9, priority: 0.7 };
      ctx.lights.push(desc);
      beacon = { desc, cx: c[0], cz: c[2], yaw };
    } else Q.box(cap, 1.95, 1.54, 0.55, 0.32, 0.08, 0.32);
    indicatorField(Q, 1.95, 1.15, 0.705, 0.22, 0.3, seed + 2);
    Q.collider([1.77, 0, 0.37], [2.13, 1.85, 0.73], "status-pillar");
    // launch-tube housing above: a vertical half-cylinder from the collar top to the ceiling
    Q.add("paintedMetal", new THREE.CylinderGeometry(1.3, 1.3, tubeH, 20, 1, false, -Math.PI / 2, Math.PI), 0, TUBE_Y0 + tubeH / 2, 0, { color: dark, texel: 4 });
    for (const y of [TUBE_Y0 + 0.15, TUBE_Y0 + tubeH - 0.2]) Q.add("paintedMetal", new THREE.CylinderGeometry(1.36, 1.36, 0.14, 20, 1, false, -Math.PI / 2, Math.PI), 0, y, 0, { color: black });
    Q.box("paintedMetal", 0, TUBE_Y0 + tubeH / 2, 1.3, 0.12, tubeH - 0.5, 0.08, { color: black });
    if (status === "r") G(ROW.FAULT, 0.5, 0, TUBE_Y0 + tubeH / 2, 1.345, 0.03, tubeH - 0.7, 0.01);
    else Q.box("emitAmber", 0, TUBE_Y0 + tubeH / 2, 1.345, 0.03, tubeH - 0.7, 0.01);
    // pendant fixture hung from the gantry cross-tie over the muster step: the housing that explains
    // the warm accent light. An open pod is lit from the boarding light in its throat instead; the
    // FAULT pod's pendant is dark (its station light is the beacon).
    const pend = Q.world(0, 0, 1.9);
    dropLight(kit, PALETTE, [pend[0], CY - 0.47, pend[2]], { w: 0.5, d: 1.5, stem: 2.0, mat: status === "r" ? "darkGloss" : "emitWarmSoft" });
    if (open) {
      const desc = { type: "point", pos: Q.world(0, 2.45, -0.05), color: 0xffe8d0, intensity: 4.5, distance: 6, priority: 0.6 };
      ctx.lights.push(desc);
      cabins.push({ desc, row: cabinRow, phase: idx * 1.7 });
    } else if (status !== "r" && !(yaw < 0 && idx >= 3)) {
      // east pods 4 and 5 keep their pendant but not its descriptor: the door view's 104° frame ends
      // at pod 2 on either side, the west-row camera faces away from them and from the east-row
      // camera they hide behind the FAULT pod's platform and barrier — their two slots pay for the
      // door-end wall wash and the pylon light. West pod 5 keeps its light: it fills the west-row
      // foreground (its muster floor read 6 % with the pendant dark). 50 cd, 0.4 m under the
      // diffuser: the muster floor in front of the pods carries the row views' centre (it read 18 %
      // at 40); lifting the descriptor above the housing to halo the ceiling instead made the deck
      // darker, not brighter — the painted marks want the direct light
      ctx.lights.push({ type: "point", pos: Q.world(0, 3.0, 1.9), color: 0xffb35c, intensity: 50, distance: 13, priority: 0.6 });
    }
  };
  STATION_Z.forEach((z, i) => station([IX0, Y, z], Math.PI / 2, WEST[i], i, 100 + i * 7));
  STATION_Z.forEach((z, i) => station([IX1, Y, z], -Math.PI / 2, EAST[i], i, 200 + i * 7));

  // side walls between the stations: floor guide lights, junction boxes, grilles; the two walls get
  // different service props (west: hose reel + tool cart; east: fire cabinet + supply crates)
  const gaps = [306.9, 310.8, 315.2, 319.6, 324.0, 328.2];
  for (const z of gaps) {
    for (const s of [-1, 1]) kit.box("emitAmber", s * (IX1 - 0.16), Y + 0.05, z, 0.3, 0.05, 0.1);
  }
  junction(IX0, Y + 1.5, 310.8, Math.PI / 2, { seed: 11 });
  junction(IX0, Y + 1.4, 319.6, Math.PI / 2, { w: 0.5, h: 0.6, seed: 12 });
  junction(IX1, Y + 1.5, 315.2, -Math.PI / 2, { w: 0.5, h: 0.6, seed: 13 });
  junction(IX1, Y + 1.4, 324.0, -Math.PI / 2, { seed: 14 });
  for (const z of [310.8, 319.6]) grille(IX0, Y + 2.85, z, Math.PI / 2);
  for (const z of [315.2, 324.0]) grille(IX1, Y + 2.85, z, -Math.PI / 2);
  hoseReel(IX0, Y + 1.5, 324.0, Math.PI / 2);
  hoseReel(IX1, Y + 1.5, 319.6, -Math.PI / 2);
  {
    // west: a tool cart parked in the gap aft of the open pod (its leaf swings into the forward gap)
    const Q = placer(kit, [IX0 + 1.1, Y, 324.0], Math.PI / 2);
    for (const [lx, lz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) Q.cyl("paintedMetal", lx, 0.09, lz, 0.09, 0.06, "x", { color: black, segments: 12 });
    Q.box("paintedMetal", 0, 0.25, 0, 1.2, 0.05, 0.7, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", 0, 0.85, 0, 1.2, 0.05, 0.7, { color: dark, texel: 2.5 });
    for (const [lx, lz] of [[-0.56, -0.31], [0.56, -0.31], [-0.56, 0.31], [0.56, 0.31]]) Q.box("metal", lx, 0.55, lz, 0.04, 0.6, 0.04, { color: steel });
    Q.cyl("metal", -0.64, 1.0, 0, 0.02, 0.6, "z", { color: steel, segments: 8 });
    for (const lz of [-0.3, 0.3]) Q.cyl("metal", -0.64, 0.94, lz, 0.02, 0.14, "y", { color: steel, segments: 8 });
    Q.box("paintedMetal", 0.2, 0.99, -0.1, 0.5, 0.22, 0.3, { color: black, texel: 2.5 });
    Q.box("emitAmber", 0.2, 1.06, 0.06, 0.3, 0.02, 0.01);
    Q.cyl("metal", -0.3, 1.02, 0.15, 0.09, 0.3, "y", { color: white, segments: 12 });
    Q.add("metal", new THREE.TorusGeometry(0.16, 0.035, 8, 20), -0.25, 0.9, -0.15, { color: dark, rot: [Math.PI / 2, 0, 0] });
    Q.collider([-0.7, 0, -0.4], [0.7, 1.1, 0.4], "cart");
  }
  {
    // east: fire cabinet + two supply crates in the gap between pods 2 and 3
    cabinet(kit, PALETTE, [IX1 - 0.27, Y, 310.8], -Math.PI / 2, { w: 1.0, h: 1.6, d: 0.45, color: RED, emit: "emitRedImp", seed: 61 });
    crate(IX1 - 0.65, 328.2, 0.05, { s: 1.0, color: grey });
    crate(IX1 - 0.65, 328.2, -0.08, { s: 0.7, y: Y + 1.0, color: dark, emit: "emitGreen" });
  }
  // muster-control furniture differs per side. West: the waiting area is held back from the lanes
  // by belt dividers (post pairs with a retractable belt between neighbouring boarding lanes).
  {
    const beltPost = (x, z) => {
      kit.cyl("paintedMetal", x, Y + 0.025, z, 0.18, 0.05, "y", { color: black, segments: 16 });
      kit.cyl("metal", x, Y + 0.55, z, 0.03, 1.0, "y", { color: steel, segments: 10 });
      kit.cyl("paintedMetal", x, Y + 1.07, z, 0.045, 0.04, "y", { color: black, segments: 10 });
      kit.box("paintedMetal", x, Y + 0.92, z, 0.09, 0.12, 0.09, { color: black });
    };
    const BX = -11.8;
    for (let i = 0; i < STATION_Z.length - 1; i++) {
      const z0 = STATION_Z[i] + 1.1;
      const z1 = STATION_Z[i + 1] - 1.1;
      beltPost(BX, z0);
      beltPost(BX, z1);
      const zm = (z0 + z1) / 2;
      const len = z1 - z0 - 0.09;
      kit.box("paintedMetal", BX, Y + 0.92, zm, 0.012, 0.07, len, { color: PAINT_AMBER });
      kit.box("paintedMetal", BX, Y + 0.92, zm, 0.016, 0.02, len, { color: black });
      kit.collider([BX - 0.2, Y, z0 - 0.2], [BX + 0.2, Y + 1.1, z1 + 0.2], "belt-divider");
    }
  }
  // East: two striped A-frame barriers with beacons close the FAULT pod's lane at its muster square,
  // and a double-sided information pylon (bay map toward the door, assembly pictogram forward) stands
  // in the waiting area.
  {
    const aFrame = (x, z, yaw) => {
      const Q = placer(kit, [x, Y, z], yaw);
      const tilt = 0.21;
      for (const f of [-1, 1]) {
        const panel = new THREE.BoxGeometry(1.05, 0.7, 0.03);
        panel.rotateX(-f * tilt);
        Q.add("paintedMetal", panel, 0, 0.4, f * 0.095, { color: RED });
        for (const sy of [-0.18, 0.18]) {
          const stripe = new THREE.BoxGeometry(0.9, 0.1, 0.01);
          stripe.translate(0, sy, f * 0.02);
          stripe.rotateX(-f * tilt);
          Q.add("paintedMetal", stripe, 0, 0.4, f * 0.095, { color: white });
        }
      }
      Q.box("paintedMetal", 0, 0.78, 0, 0.32, 0.06, 0.14, { color: black });
      Q.box("emitRedImp", 0, 0.85, 0, 0.1, 0.08, 0.1);
      for (const lx of [-0.45, 0.45]) Q.box("paintedMetal", lx, 0.02, 0, 0.06, 0.04, 0.5, { color: black });
      Q.collider([-0.55, 0, -0.25], [0.55, 0.9, 0.25], "a-frame");
    };
    EAST.forEach((e, i) => {
      if (e.s !== "r") return;
      for (const dz of [-0.6, 0.6]) aFrame(IX1 - 4.35, STATION_Z[i] + dz, Math.PI / 2);
    });
    const K = placer(kit, [12.4, Y, 315.2], 0);
    K.box("paintedMetal", 0, 0.03, 0, 0.9, 0.06, 0.6, { color: black });
    K.box("paintedMetal", 0, 1.05, 0, 0.6, 2.0, 0.22, { color: dark, texel: 2.5 });
    K.box("paintedMetal", 0, 2.09, 0, 0.66, 0.08, 0.28, { color: black });
    for (const f of [-1, 1]) {
      K.box("emitAmber", 0, 1.94, f * 0.115, 0.5, 0.04, 0.01);
      K.box("darkGloss", 0, 1.64, f * 0.115, 0.56, 0.36, 0.01);
      K.box("emitGreen", 0, 1.0, f * 0.115, 0.34, 0.34, 0.01);
      K.box("paintedMetal", 0, 1.08, f * 0.121, 0.08, 0.08, 0.01, { color: white });
      K.box("paintedMetal", 0, 0.93, f * 0.121, 0.12, 0.18, 0.01, { color: white });
      for (const sx of [-1, 1]) K.box("paintedMetal", sx * 0.11, 0.97, f * 0.121, 0.06, 0.03, 0.01, { color: white });
      for (let k = 0; k < 3; k++) textStrip(K, 0, 1.36 - k * 0.08, f * 0.116, 0.46, 0.05, k + 3 * (f + 1));
    }
    K.box("screenImp0", 0, 1.64, 0.121, 0.52, 0.3, 0.01, { uv: "keep" });
    K.box("screenImp1", 0, 1.64, -0.121, 0.52, 0.3, 0.01, { uv: "keep" });
    K.collider([-0.45, 0, -0.3], [0.45, 2.15, 0.3], "info-pylon");
  }

  // =============================================================================================
  // CENTRE: runway with the muster line, guide lights, hanging muster signs, boarding lanes
  // =============================================================================================
  // runway: a charcoal rubber anti-slip mat. It must be genuinely matte — the door view looks down
  // the centreline with the four down-spots overhead, so every spot has a mirror point on the mat
  // 2–5 m ahead of the camera. darkGloss (r 0.25) and paintedMetal (worn-metal map, brushed grain
  // r ≈ 0.3) both bloomed those points into one white glitter path; rubber (r 0.8–0.94) does not.
  kit.boxMM("rubber", [-0.9, Y, 306.4], [0.9, Y + 0.012, 328.4], { color: 0xffffff });
  const LY = Y + 0.014;
  // muster line: a steady dim inlay on the matte atlas material. Both a painted (paintedMetal) and
  // an emitAmber strip sit on the camera–key axis of the door view and mirrored the four centreline
  // spots into one bloomed glitter path (worn-metal roughness ≈ 0.5 at a grazing sightline)
  glow.box(ROW.LINE, 0.5, 0.16, 0.006, 13.7, [0, LY + 0.003, 313.45]); // 306.6 .. 320.3
  glow.box(ROW.LINE, 0.5, 0.16, 0.006, 7.3, [0, LY + 0.003, 324.55]); // 320.9 .. 328.2
  for (const z of STATION_Z) floorLine(kit, [-0.85, LY, z], [0.85, LY, z], 0.1, "emitAmber");
  // guide dashes either side of the muster line: one animated pair-row (glow row RUNWAY) whose lit
  // pulse runs from the door toward the pods every 5 s — dash k's u is its position on the pattern,
  // decreasing away from the door so the scrolling pulse travels forward
  {
    const N = 23;
    for (let k = 0; k < N; k++) {
      const u = 0.05 + 0.9 * (1 - k / (N - 1));
      for (const x of [-0.62, 0.62]) glow.box(ROW.RUNWAY, u, 0.12, 0.012, 0.4, [x, Y + 0.026, 327.4 - k * 0.9]);
    }
  }
  // painted boarding lanes from the runway to each pod's muster square
  for (const z of STATION_Z) {
    for (const s of [-1, 1]) {
      floorLine(kit, [s * 1.0, Y + 0.004, z], [s * 15.7, Y + 0.004, z], 0.12, "paintedMetal", PAINT_AMBER);
      for (let x = 4.0; x < 15.0; x += 4.0) floorLine(kit, [s * x, Y + 0.004, z - 0.45], [s * x, Y + 0.004, z + 0.45], 0.1, "paintedMetal", PAINT_AMBER);
    }
  }
  // boarding-control pedestals either side of the runway at mid-bay
  consoleProp(kit, PALETTE, [-2.9, Y, 317.4], Math.PI / 2, { w: 1.2, d: 0.7, h: 1.15, screens: 1, screenMat: "screenImp1", seed: 43 });
  consoleProp(kit, PALETTE, [2.9, Y, 317.4], -Math.PI / 2, { w: 1.2, d: 0.7, h: 1.15, screens: 1, screenMat: "screenImp3", seed: 44 });
  // muster gate at the door end of the runway: two sign posts with lit glyph plates flanking a
  // painted stop line (foreground anchor for the door view; clear of the door's 1 m zone)
  for (const s of [-1, 1]) {
    const G = placer(kit, [s * 1.4, Y, 324.6], 0);
    G.box("paintedMetal", 0, 0.03, 0, 0.4, 0.06, 0.4, { color: black });
    G.box("paintedMetal", 0, 0.9, 0, 0.1, 1.8, 0.1, { color: dark, texel: 2.5 });
    G.box("paintedMetal", 0, 1.6, 0.05, 0.5, 0.4, 0.06, { color: black, texel: 2.5 });
    G.box("darkGloss", 0, 1.6, 0.085, 0.42, 0.32, 0.01);
    for (let k = 0; k < 3; k++) G.box("emitAmber", -0.15 + k * 0.15, 1.7, 0.092, 0.09, 0.05, 0.01);
    textStrip(G, 0, 1.56, 0.092, 0.4, 0.06, 2 + s);
    G.box("emitAmber", 0, 1.47, 0.092, 0.3, 0.04, 0.01);
    G.box(s < 0 ? "emitGreen" : "emitAmber", 0, 0.5, 0.062, 0.05, 0.4, 0.01);
    G.collider([-0.2, 0, -0.2], [0.2, 1.85, 0.2], "muster-post");
  }
  // stop line: three amber inlays on the matte atlas row — as painted checkers (paintedMetal) they
  // sat exactly on the second down-spot's mirror line in the door view and bloomed to white
  for (let k = 0; k < 3; k++) glow.box(ROW.LINE, 0.5, 0.18, 0.006, 0.18, [-0.39 + k * 0.39, LY + 0.004, 324.6]);
  for (const x of [-1.1, 1.1]) floorLine(kit, [x, Y + 0.004, 324.1], [x, Y + 0.004, 325.1], 0.1, "paintedMetal", PAINT_AMBER_DEEP);
  // boarding checkpoint on the runway 7.6 m in from the door: a pair of control pedestals angled at
  // the arriving crew, a floor-mounted lane gate between them (pivot housing with its striped boom
  // raised, receiving bollard opposite, lane-open lamps) and a painted check zone
  {
    const gz = 320.6;
    // (turned 43 deg toward the lane: at 20 deg their tilted screens mirrored the door-end key into
    // the door view as two blown rectangles)
    consoleProp(kit, PALETTE, [-1.55, Y, gz], 0.75, { w: 0.9, d: 0.6, h: 1.15, screens: 1, screenMat: "screenImp2", seed: 45 });
    consoleProp(kit, PALETTE, [1.55, Y, gz], -0.75, { w: 0.9, d: 0.6, h: 1.15, screens: 1, screenMat: "screenImp0", seed: 46 });
    const C = placer(kit, [0, Y, gz], 0);
    C.box("paintedMetal", 0, 0.03, 0, 1.2, 0.06, 0.4, { color: black, texel: 4 });
    for (const f of [-1, 1]) C.box("paintedMetal", 0, 0.062, f * 0.17, 1.1, 0.004, 0.04, { color: PAINT_AMBER_DEEP });
    // pivot housing + raised boom (red / white bands) on the west side
    C.box("paintedMetal", -0.62, 0.41, 0.02, 0.24, 0.7, 0.3, { color: dark, texel: 4 });
    C.box("paintedMetal", -0.62, 0.78, 0.02, 0.26, 0.04, 0.32, { color: black });
    C.box("darkGloss", -0.62, 0.5, 0.175, 0.16, 0.2, 0.01);
    C.box("emitGreen", -0.62, 0.55, 0.182, 0.1, 0.03, 0.01);
    C.box("emitAmber", -0.62, 0.46, 0.182, 0.06, 0.03, 0.01);
    C.cyl("metal", -0.62, 0.7, 0.2, 0.05, 0.3, "x", { color: steel, segments: 12 });
    // light bands in grey, not white: the boom stands 4 m under the 400 cd key and white bloomed
    for (let k = 0; k < 4; k++) C.box("paintedMetal", -0.62, 0.7 + 0.155 + k * 0.31, 0.2, 0.06, 0.31, 0.12, { color: k % 2 ? grey : P("impRed") });
    C.box("paintedMetal", -0.62, 1.96, 0.2, 0.08, 0.04, 0.14, { color: black });
    C.collider([-0.75, 0, -0.14], [-0.49, 2.0, 0.28], "lane-gate");
    // receiving bollard with the boom cradle on the east side
    C.cyl("paintedMetal", 0.62, 0.3, 0.2, 0.07, 0.6, "y", { color: dark, segments: 12 });
    C.box("emitGreen", 0.62, 0.5, 0.272, 0.06, 0.1, 0.01);
    for (const f of [-1, 1]) C.box("metal", 0.62, 0.7, 0.2 + f * 0.08, 0.08, 0.16, 0.02, { color: steel });
    C.box("metal", 0.62, 0.63, 0.2, 0.08, 0.02, 0.18, { color: steel });
    C.collider([0.53, 0, -0.07], [0.71, 0.8, 0.3], "lane-gate");
    for (let k = -1; k <= 1; k++) C.box("paintedMetal", k * 0.36, 0.016, 0.5, 0.2, 0.006, 0.2, { color: k ? PAINT_AMBER_DEEP : black });
  }
  // stretcher trolley parked off the runway between the gate posts and the checkpoint: wheeled frame
  // with two shelves, a folded stretcher on top, med kit + blanket + O2 bottle below, push handle
  {
    const S = placer(kit, [2.5, Y, 322.6], 0.12);
    for (const [lx, lz] of [[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]]) S.cyl("paintedMetal", lx, 0.08, lz, 0.08, 0.05, "x", { color: black, segments: 12 });
    for (const [lx, lz] of [[-0.33, -0.85], [0.33, -0.85], [-0.33, 0.85], [0.33, 0.85]]) S.box("metal", lx, 0.55, lz, 0.04, 0.9, 0.04, { color: steel });
    for (const y of [0.35, 0.85]) S.box("paintedMetal", 0, y, 0, 0.7, 0.04, 1.9, { color: dark, texel: 4 });
    S.cyl("metal", 0, 1.0, 0.9, 0.02, 0.7, "x", { color: steel, segments: 8 });
    for (const lx of [-0.33, 0.33]) S.cyl("metal", lx, 0.95, 0.9, 0.02, 0.1, "y", { color: steel, segments: 8 });
    for (const lx of [-0.2, 0.2]) S.cyl("metal", lx, 0.89, 0, 0.02, 1.9, "z", { color: steel, segments: 8 });
    S.box("paintedMetal", 0, 0.89, 0, 0.42, 0.06, 1.7, { color: mid, texel: 4 });
    S.box("paintedMetal", 0, 0.925, 0, 0.42, 0.01, 0.12, { color: PAINT_AMBER_DEEP });
    S.box("paintedMetal", 0, 0.5, 0.55, 0.36, 0.26, 0.36, { color: white, texel: 4 });
    S.box("paintedMetal", -0.183, 0.5, 0.55, 0.01, 0.16, 0.05, { color: P("impRed") });
    S.box("paintedMetal", -0.183, 0.5, 0.55, 0.01, 0.05, 0.16, { color: P("impRed") });
    S.box("paintedMetal", 0, 0.43, -0.05, 0.4, 0.12, 0.5, { color: mid, texel: 4 });
    S.cyl("metal", 0.12, 0.45, -0.6, 0.08, 0.5, "z", { color: white, segments: 12 });
    S.cyl("metal", 0.12, 0.45, -0.88, 0.03, 0.06, "z", { color: steel, segments: 8 });
    S.box("emitAmber", 0, 0.85, 0.955, 0.24, 0.03, 0.01);
    S.collider([-0.4, 0, -1.0], [0.4, 1.05, 1.0], "stretcher-trolley");
  }
  // hanging muster signs: framed dark plates with small amber glyph bars (not a lit slab)
  for (const z of [311.85, 321.6]) {
    kit.box("paintedMetal", 0, CY - 0.555, z, 0.06, 1.05, 0.06, { color: black });
    kit.box("paintedMetal", 0, CY - 1.3, z, 1.5, 0.5, 0.12, { color: black, texel: 2.5 });
    for (const s of [-1, 1]) {
      kit.box("darkGloss", 0, CY - 1.3, z + s * 0.065, 1.36, 0.38, 0.01);
      for (let k = 0; k < 5; k++) kit.box("emitAmber", -0.44 + k * 0.2, CY - 1.21, z + s * 0.072, 0.12, 0.05, 0.01);
      kit.box("emitAmber", 0.28, CY - 1.38, z + s * 0.072, 0.7, 0.04, 0.01);
      kit.box("emitAmber", -0.45, CY - 1.38, z + s * 0.072, 0.16, 0.16, 0.01);
    }
  }
  // hall fixtures in three rows: a centreline row over the runway (the three down-spots — two fills
  // and the key — hang under these; two fills 6.6 m apart at 175/215 lay the same 22–26 lx runway
  // three at 145/180/130 did, and the third slot became the west waiting-floor pendant) and two side
  // rows on the pod rhythm over the muster floor (the door-end fixture sits 1.4 m nearer the door
  // than the rhythm so its key rakes the checkpoint)
  const FIX = [309.4, 316.0, 325.4];
  for (const z of FIX) dropLight(kit, PALETTE, [0, CY, z], { w: 2.4, d: 0.6, stem: 0.9, mat: "emitWarmSoft" });
  for (const x of [-8.2, 8.2]) for (const z of STATION_Z) dropLight(kit, PALETTE, [x, CY, z], { w: 2.0, d: 0.5, stem: 0.9, mat: "emitWarmSoft" });
  // three more over the waiting floors between the muster strips and the runway, each with its own
  // descriptor (below): east over the information pylon (the east waiting floor read 15 % from the
  // east-row camera) and 2.2 m off the aft wall so the two door-end screens there hang in a wall
  // wash instead of a 6 % wall; west over the divider queue (the west-row camera's centre-right is
  // that floor — 8–13 m from the centreline fills it read 15 %, the pod accents stop 3 m short of
  // it), 7.5 m ahead of that camera so its foreground deck gets the pendant at ~40° incidence
  const SIDE_FIX = [
    [12.4, 316.4],
    [11.0, 327.5],
    [-11.5, 319.5],
  ];
  for (const [x, z] of SIDE_FIX) dropLight(kit, PALETTE, [x, CY, z], { w: 2.0, d: 0.5, stem: 0.9, mat: "emitWarmSoft" });
  // overhead gantry beams tying the launch tubes together along each wall (hung between channels)
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", s * 16.6, CY - 0.35, (IZ0 + IZ1) / 2, 0.32, 0.36, IZ1 - IZ0 - 1.0, { color: dark, texel: 4 });
    for (const z of [309.3, 313.4, 317.5, 321.6, 325.7]) kit.box("paintedMetal", s * 16.6, CY - 0.1, z, 0.16, 0.14, 0.24, { color: black });
    for (const z of STATION_Z) kit.box("paintedMetal", s * 17.5, CY - 0.37, z, 1.9, 0.2, 0.3, { color: dark, texel: 4 });
  }

  // =============================================================================================
  // DOOR END (aft wall): emergency lockers, O2 rack, crates, console, screens (door dressing = shell)
  // =============================================================================================
  for (const s of [-1, 1]) {
    cabinet(kit, PALETTE, [s * 4.0, Y, IZ1 - 0.27], Math.PI, { color: RED, emit: "emitRedImp", seed: 31 + s });
    kit.box("paintedMetal", s * 4.0, Y + 2.05, IZ1 - 0.03, 1.2, 0.3, 0.06, { color: black, texel: 2.5 });
    kit.box("emitRedImp", s * 4.0, Y + 2.05, IZ1 - 0.065, 1.0, 0.12, 0.01);
  }
  {
    // oxygen supply rack: dark frame, two shelves of white bottles behind a retaining bar
    const Q = placer(kit, [-8.5, Y, IZ1 - 0.32], Math.PI);
    const w = 2.4;
    const h = 2.0;
    const d = 0.6;
    for (const lx of [-w / 2 + 0.04, w / 2 - 0.04]) for (const lz of [-d / 2 + 0.04, d / 2 - 0.04]) Q.box("paintedMetal", lx, h / 2, lz, 0.08, h, 0.08, { color: dark });
    for (const y of [0.06, 1.0]) Q.box("paintedMetal", 0, y, 0, w, 0.06, d, { color: mid, texel: 2.5 });
    Q.box("paintedMetal", 0, h - 0.03, 0, w, 0.06, d, { color: dark });
    Q.box("paintedMetal", 0, h / 2, -d / 2 + 0.01, w - 0.1, h - 0.1, 0.02, { color: black, texel: 2.5 });
    for (const y0 of [0.09, 1.03]) {
      for (let k = 0; k < 6; k++) {
        const lx = -w / 2 + 0.25 + k * 0.38;
        Q.cyl("metal", lx, y0 + 0.375, 0.05, 0.13, 0.75, "y", { color: white, segments: 14 });
        Q.cyl("metal", lx, y0 + 0.8, 0.05, 0.05, 0.1, "y", { color: steel, segments: 8 });
        Q.box(k === 4 ? "emitAmber" : "emitGreen", lx, y0 + 0.4, 0.185, 0.06, 0.16, 0.01);
      }
      Q.cyl("metal", 0, y0 + 0.5, 0.24, 0.015, w - 0.16, "x", { color: steel, segments: 8 });
    }
    hazardBand(Q, 0, h - 0.13, d / 2 + 0.005, w - 0.2, 0.12);
    Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "o2-rack");
  }
  crate(10.6, IZ1 - 0.65, 0.04);
  crate(11.9, IZ1 - 0.65, -0.03, { color: grey });
  crate(10.6, IZ1 - 0.65, 0.12, { s: 0.9, y: Y + 1.2, color: dark });
  consoleProp(kit, PALETTE, [5.9, Y, 327.2], 0.35, { w: 2.0, screens: 2, screenMat: "screenImp1", seed: 41 });
  wallScreen(kit, [-12.6, Y + 2.2, IZ1 - 0.1], Math.PI, 1.6, 0.9, "screenImp3", { accent: "emitAmber" });
  wallScreen(kit, [7.4, Y + 2.3, IZ1 - 0.1], Math.PI, 1.6, 0.9, "screenImp2", { accent: "emitAmber", tilt: 0.25 });
  wallScreen(kit, [14.6, Y + 2.2, IZ1 - 0.1], Math.PI, 1.6, 0.9, "screenImp1", { accent: "emitAmber" });
  for (const s of [-1, 1]) cabinet(kit, PALETTE, [s * 17.3, Y, IZ1 - 0.27], Math.PI, { emit: "emitAmber", seed: 35 + s, color: s < 0 ? mid : grey });
  junction(-15.2, Y + 1.7, IZ1, Math.PI, { conduitTo: Y + 3.95, seed: 15 });
  junction(15.9, Y + 3.2, IZ1, Math.PI, { w: 0.5, h: 0.4, conduitTo: Y + 3.95, seed: 16 });

  // =============================================================================================
  // FORWARD WALL: pod status board (numbered tiles + text strips), flanking screens, suit rack,
  // supply shelves, locker banks, cabinets
  // =============================================================================================
  {
    const bz = IZ0 + 0.02;
    // clean dark panel plate (the worn-metal map on a 6.6 m slab reads as speckle even at texel 4)
    kit.boxMM("impPanel", [-3.3, Y + 1.25, bz], [3.3, Y + 3.75, bz + 0.12], { color: black, uv: "keep" });
    kit.boxMM("impPanel", [-3.3, Y + 3.5, bz + 0.12], [3.3, Y + 3.75, bz + 0.14], { color: grey, uv: "keep" });
    // header strip on the matte atlas: as emitAmber (r 0.4) it mirrored the forward down-spot into a
    // white spot whose bloom washed the tile below it in the board view
    glow.box(ROW.AMBER, 0.5, 6.2, 0.08, 0.01, [0, Y + 3.62, bz + 0.145]);
    const B = placer(kit, [0, Y, bz + 0.12], 0);
    // header: "POD STATUS" text strip + bay glyph
    textStrip(B, -1.6, 3.625, 0.03, 1.2, 0.1, 1);
    for (let i = 0; i < 5; i++) {
      for (const [row, arr] of [[0, WEST], [1, EAST]]) {
        const st = arr[i];
        const x = -2.4 + i * 1.2;
        const y = 2.9 - row * 0.85;
        // matte bezel: as darkGloss (r 0.25) the strip of plate showing above the status field sat on
        // the forward down-spot's mirror point in the board view and bloomed white over the field
        B.box("impPanel", x, y, 0.01, 1.0, 0.7, 0.02, { color: black, uv: "keep" });
        // status colour field (top) on a live glow row — the FAULT tile pulses with its pod's ring,
        // the others flicker occasionally; pod number as five 14 cm blocks (middle, readable at
        // 3 m) with the row's W / E marker, and one READY / FAULT text strip across the tile (bottom)
        const tileRow = st.s === "r" ? ROW.FAULT : ROW.TILE0 + row * 5 + i;
        glow.box(tileRow, 0.5, 0.9, 0.22, 0.01, [x, Y + y + 0.21, bz + 0.12 + 0.025]);
        if (st.s !== "r") tiles.push({ row: tileRow, c: st.s === "g" ? C_GREEN : C_AMBER, seed: row * 5 + i });
        B.box("paintedMetal", x - 0.4, y + 0.21, 0.03, 0.1, 0.14, 0.01, { color: row ? black : white });
        for (let k = 0; k < 5; k++) B.box(k <= i ? "emitAmber" : "paintedMetal", x - 0.34 + k * 0.17, y - 0.01, 0.025, 0.14, 0.14, 0.01, { color: dark });
        textStrip(B, x - 0.06, y - 0.23, 0.025, 0.74, 0.12, i + row * 3);
        if (st.open) glow.box(ROW.WHITE, 0.5, 0.1, 0.1, 0.01, B.world(x + 0.38, y - 0.23, 0.025));
        else B.box(st.s === "r" ? "emitRedImp" : "emitGreen", x + 0.38, y - 0.23, 0.025, 0.1, 0.1, 0.01);
      }
    }
    // bottom row: a matte field with two rows of 5 × 3.6 cm status LEDs — the shared indicatorField's
    // 1.6 cm blocks were 1 px from the board camera (pass 3); mostly amber/green for a muster board
    {
      const rand = rng(51);
      B.box("impPanel", 0, 1.45, 0.005, 5.8, 0.26, 0.02, { color: black, uv: "keep" });
      const cols = 62;
      for (let i = 0; i < cols; i++) {
        for (const j of [-1, 1]) {
          if (rand() < 0.35) continue;
          const r = rand();
          const m = r < 0.4 ? "emitAmber" : r < 0.7 ? "emitGreen" : r < 0.9 ? "emitBlue" : "emitRedImp";
          B.box(m, -2.79 + i * (5.58 / (cols - 1)), 1.45 + j * 0.055, 0.018, 0.05, 0.036, 0.006);
        }
      }
    }
    kit.collider([-3.3, Y, bz], [3.3, Y + 3.75, bz + 0.15], "status-board");
  }
  wallScreen(kit, [-5.6, Y + 2.6, IZ0 + 0.1], 0, 1.6, 1.0, "screenImp0", { accent: "emitAmber" });
  wallScreen(kit, [5.6, Y + 2.6, IZ0 + 0.1], 0, 1.6, 1.0, "screenImp1", { accent: "emitAmber", tilt: 0.25 });
  {
    // EV suit rack (west of the board): frame with a hanger rail and four suits
    const Q = placer(kit, [-9.0, Y, IZ0 + 0.4], 0);
    const w = 2.8;
    const h = 2.3;
    const d = 0.7;
    for (const lx of [-w / 2, w / 2]) Q.box("paintedMetal", lx, h / 2, 0, 0.08, h, d, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", 0, h - 0.04, 0, w, 0.08, d, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", 0, 0.05, 0, w, 0.1, d, { color: black });
    Q.box("impPanel", 0, h / 2, -d / 2 + 0.02, w - 0.1, h - 0.1, 0.02, { color: mid, uv: "keep" });
    Q.cyl("metal", 0, h - 0.2, 0.05, 0.02, w - 0.2, "x", { color: steel, segments: 8 });
    hazardBand(Q, 0, h - 0.12, d / 2 + 0.005, w - 0.3, 0.1);
    for (let k = 0; k < 4; k++) {
      const lx = -w / 2 + 0.42 + k * 0.65;
      Q.cyl("metal", lx, h - 0.27, 0.05, 0.012, 0.14, "y", { color: steel, segments: 6 });
      Q.add("paintedMetal", new THREE.SphereGeometry(0.16, 14, 10), lx, 1.9, 0.05, { color: white });
      Q.box("darkGloss", lx, 1.9, 0.17, 0.2, 0.11, 0.06);
      Q.box("paintedMetal", lx, 1.39, 0.05, 0.44, 0.64, 0.26, { color: white, texel: 2.5 });
      Q.box("paintedMetal", lx, 1.52, 0.19, 0.28, 0.16, 0.03, { color: dark });
      Q.box(k === 1 ? "emitAmber" : "emitGreen", lx, 1.52, 0.206, 0.12, 0.04, 0.01);
      for (const s of [-1, 1]) Q.box("paintedMetal", lx + s * 0.28, 1.36, 0.05, 0.12, 0.58, 0.14, { color: white, texel: 2.5 });
      Q.box("paintedMetal", lx, 1.04, 0.05, 0.46, 0.06, 0.28, { color: amber });
      for (const s of [-1, 1]) Q.box("paintedMetal", lx + s * 0.12, 0.62, 0.05, 0.16, 0.76, 0.2, { color: white, texel: 2.5 });
      for (const s of [-1, 1]) Q.box("paintedMetal", lx + s * 0.12, 0.17, 0.1, 0.18, 0.14, 0.3, { color: dark });
    }
    Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "suit-rack");
  }
  {
    // supply shelves (east of the board): O2 bottles, ration modules, med kits, blankets, line coil
    const Q = placer(kit, [9.0, Y, IZ0 + 0.35], 0);
    const w = 2.8;
    const h = 2.2;
    const d = 0.6;
    for (const lx of [-w / 2, w / 2]) Q.box("paintedMetal", lx, h / 2, 0, 0.08, h, d, { color: dark, texel: 2.5 });
    Q.box("impPanel", 0, h / 2, -d / 2 + 0.02, w - 0.1, h, 0.02, { color: mid, uv: "keep" });
    for (const y of [0.1, 0.8, 1.5, 2.16]) Q.box("paintedMetal", 0, y, 0, w, 0.06, d, { color: dark, texel: 2.5 });
    for (let k = 0; k < 6; k++) {
      const lx = -w / 2 + 0.3 + k * 0.44;
      Q.cyl("metal", lx, 0.43, 0.05, 0.11, 0.6, "y", { color: white, segments: 12 });
      Q.cyl("metal", lx, 0.77, 0.05, 0.04, 0.08, "y", { color: steel, segments: 8 });
    }
    Q.cyl("metal", 0, 0.5, 0.24, 0.012, w - 0.2, "x", { color: steel, segments: 8 });
    for (let k = 0; k < 3; k++) Q.box("paintedMetal", -0.9 + k * 0.55, 1.08, 0, 0.48, 0.5, 0.48, { color: k === 1 ? mid : grey, texel: 2.5 });
    for (let k = 0; k < 2; k++) {
      const lx = 0.75 + k * 0.5;
      Q.box("paintedMetal", lx, 1.0, 0, 0.42, 0.34, 0.42, { color: white, texel: 2.5 });
      Q.box("paintedMetal", lx, 1.0, 0.212, 0.06, 0.2, 0.01, { color: P("impRed") });
      Q.box("paintedMetal", lx, 1.0, 0.212, 0.2, 0.06, 0.01, { color: P("impRed") });
    }
    for (let k = 0; k < 4; k++) Q.box("paintedMetal", -1.0 + k * 0.42, 1.68, 0, 0.38, 0.3, 0.5, { color: k % 2 ? mid : dark, texel: 2.5 });
    Q.add("metal", new THREE.TorusGeometry(0.2, 0.05, 8, 20), 0.9, 1.6, 0, { color: steel, rot: [Math.PI / 2, 0, 0] });
    Q.box("paintedMetal", 0.4, 1.63, 0, 0.3, 0.2, 0.3, { color: black, texel: 2.5 });
    Q.box("emitAmber", 0.4, 1.68, 0.155, 0.16, 0.03, 0.01);
    hazardBand(Q, 0, h - 0.1, d / 2 + 0.005, w - 0.3, 0.1);
    Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "supply-shelf");
  }
  wallScreen(kit, [-9.0, Y + 2.95, IZ0 + 0.1], 0, 2.4, 0.8, "screenImp3", { accent: "emitAmber" });
  wallScreen(kit, [9.0, Y + 2.9, IZ0 + 0.1], 0, 2.4, 0.8, "screenImp2", { accent: "emitAmber" });
  for (const s of [-1, 1]) {
    lockerBank(kit, PALETTE, [s * 13.5, Y, IZ0 + 0.27], 0, { count: 6, unit: 0.6, h: 2.0 });
    cabinet(kit, PALETTE, [s * 17.6, Y, IZ0 + 0.27], 0, { emit: "emitAmber", seed: 37 + s, color: s < 0 ? grey : mid });
    junction(s * 16.2, Y + 1.5, IZ0, 0, { conduitTo: Y + 3.95, seed: 17 + s });
  }
  pipe(kit, PALETTE, [-19.0, Y + 5.1, IZ0 + 0.3], [19.0, Y + 5.1, IZ0 + 0.3], 0.08, { color: steel, bracket: 3 });
  pipe(kit, PALETTE, [-19.0, Y + 5.4, IZ0 + 0.3], [19.0, Y + 5.4, IZ0 + 0.3], 0.06, { color: dark, bracket: 3 });

  // =============================================================================================
  // LIGHTS: three warm spots under the centreline fixtures (their own pool slot, so the eleven
  // point lights — 5 hatch accents + beacon + 2 cabins + the 3 waiting-floor pendants — stay live)
  // = 14 total. The spot nearest the door is the room's shadow KEY: 4.6 m up and 4.8 m behind the
  // checkpoint, aimed 6.4 m down the runway (36° below the horizon) so the pedestals, lane gate,
  // bollard and stretcher trolley throw shadows that rake forward along the deck instead of pooling
  // under them; the other two are fills at 50–60 % of the key (the rig's captured environment no
  // longer lifts the floor, so the fills carry the far half — the hall reads brightest at the door
  // and falls off toward the board).
  // =============================================================================================
  FIX.forEach((z, i) => {
    if (i === FIX.length - 1) {
      ctx.lights.push({ type: "spot", pos: [0, CY - 1.4, z], target: [0, Y, z - 6.4], color: 0xffe6cc, intensity: 360, distance: 40, angle: 1.15, penumbra: 0.4, priority: 1.0, shadow: true });
    } else {
      // near-hemispherical flat cones (83 deg, short penumbra) so the muster floor either side of
      // the runway reads; the forward one is softer (it also lights the status board wall 4 m away);
      // the second sits 6.6 m on, 9.4 m short of the key, so the checkpoint keeps the key's raking
      // shadows (a fill straight over it clipped the check zone at 180 and flattened them at 130)
      ctx.lights.push({ type: "spot", pos: [0, CY - 1.4, z], target: [0, Y, z], color: 0xffe6cc, intensity: i === 0 ? 175 : 215, distance: 30, angle: 1.45, penumbra: 0.2, priority: 0.9 });
    }
  });
  // waiting-floor pendants: pylon light, the door-end wall wash and the west divider-queue light
  // (housings with the hall fixtures); omnidirectional points hang 0.45 m under the diffuser so the
  // housing rim above them is not blasted white (these hang on 0.9 m stems — above the housing they
  // would sit 0.7 m under the ceiling and burn a disc into it)
  ctx.lights.push({ type: "point", pos: [SIDE_FIX[0][0], CY - 1.5, SIDE_FIX[0][1]], color: 0xffe6cc, intensity: 40, distance: 14, priority: 0.7 });
  ctx.lights.push({ type: "point", pos: [SIDE_FIX[1][0], CY - 1.5, SIDE_FIX[1][1]], color: 0xffe6cc, intensity: 36, distance: 14, priority: 0.7 });
  // (84 cd: the west-row camera's foreground deck 5–8 m aft of it sits outside the key's cone and
  // reads this pendant at grazing incidence — at 60 cd / 8.5 m the frame's bottom band measured
  // 18 %, under policy B's 20)
  ctx.lights.push({ type: "point", pos: [SIDE_FIX[2][0], CY - 1.5, SIDE_FIX[2][1]], color: 0xffe6cc, intensity: 84, distance: 15, priority: 0.7 });

  glow.build(ctx.group);
  return {
    update(dt, t) {
      // FAULT pod: ring, tube strip and board tile pulse together (0.9 Hz); the beacon light rides
      // the drum's bright sector on a 16 cm circle and flashes as the sector sweeps the bay
      glow.fill(ROW.FAULT, C_RED, 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * Math.PI * 1.8)));
      if (beacon) {
        const a = glow.beaconAngle(t, BEACON.sectors, BEACON.s0, BEACON.width);
        const d = beacon.desc;
        d.pos[0] = beacon.cx + 0.16 * Math.sin(a);
        d.pos[2] = beacon.cz + 0.16 * Math.cos(a);
        const f = Math.max(0, Math.cos(a - beacon.yaw)); // 1 when the sector faces the bay (local +z)
        d.intensity = 4 + 14 * f * f;
      }
      // open cabins: lamp + boarding light + their descriptor flicker as one circuit
      for (const c of cabins) {
        const f = cabinFlicker(t, c.phase);
        c.desc.intensity = 4.5 * f;
        glow.fill(c.row, C_WARM, f);
      }
      // status board: each tile on its own live row
      for (const tile of tiles) glow.fill(tile.row, tile.c, flicker(t, tile.seed));
      glow.update(t);
    },
    dispose() {
      glow.dispose();
    },
  };
}
