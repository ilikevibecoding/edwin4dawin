// d4-stairs — Deck 4 stairwell: switchback stair from the lift lobby (-72) up to the hangar flight-control
// tower (-60). Six flights of 11 risers (0.1818) × 10 treads (0.28) around an open well, near landings
// against the door wall (z = 181), far landings overlooking a machinery alcove at the back.
// Every landing is a panelled, lit ceiling for the level below (housed light channel across it), the
// flights have panelled soffits lit by a housed strip, metal treads with steel nosings on painted risers,
// visible stringers, and balustrades of square newels, top/mid rails and panel infill; wall handrails on
// brackets; wall strips at 2.1 m above each landing. Chevrons appear only on the first and last nosing of
// each flight. Until the player controller can step, two lit wall plaques beside the flights teleport
// foot ↔ top (with a fade); their "stair-stop" collider and the interactables go away when stepping lands.
import * as THREE from "three";
import { doorOpening } from "../../systems/doors/helper.js";
import { impWall, impCeiling, impFloorSlab, impRail, MAT, col } from "../../systems/corridor/imperial.js";
import { impLocker, makeSignPlate, deckPlacard, sectionMarker } from "../../systems/corridor/props.js";
import { textMaterials, stencilText } from "../../systems/corridor/text.js";

const FLOOR = -72;
const TOP = -60;
const CEIL = -55;
const B = { min: [4, FLOOR, 181], max: [10, CEIL, 193] };
const T = 0.16;
const X0 = B.min[0] + T; // 4.16 inner faces
const X1 = B.max[0] - T; // 9.84
const Z0 = B.min[2] + T; // 181.16
const Z1 = B.max[2] - T; // 192.84
const WELL = [6.56, 7.44]; // open shaft between the two flights
const RUN0 = 185.5; // near edge of the flights (near landings end here)
const RUN1 = 188.3; // far edge (far landings start here)
const ALCOVE = 190.8; // far landings end; machinery alcove beyond
const RISERS = 11;
const RISE = 2.0;
const RISER = RISE / RISERS;
const TREAD = 0.28;

const DOORS = [
  { id: "d4-lobby-stairs", pos: [7, FLOOR, 181], dir: [0, 0, -1], kind: "standard", to: "d4-lobby" },
  { id: "d4-control-stairs", pos: [7, TOP, 181], dir: [0, 0, -1], kind: "standard", to: "d4-control" },
];

const X_AXIS = new THREE.Vector3(1, 0, 0);

export default {
  id: "d4-stairs",
  name: "Deck 4 Stairwell",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [7, FLOOR, 184], yaw: 180 },
  apertures: [],
  materials: textMaterials,
  views: {
    "d4-stairs-foot": { pos: [7, FLOOR, 182.3], yaw: 180, pitch: 9 },
    "d4-stairs-well": { pos: [9.0, -64, 182.6], yaw: 155, pitch: 8 },
    "d4-stairs-landing": { pos: [8.9, -70, 190.2], yaw: 25, pitch: -6 },
    "d4-stairs-top": { pos: [5.0, TOP, 182.0], yaw: -140, pitch: 4 },
  },
  build(ctx) {
    const { kit, seed, materials } = ctx;
    const holes = DOORS.map((d) => doorOpening(d));
    const dark = col("impDark");
    const black = col("impBlack");
    const mid = col("impMid");
    const grey = col("impGrey");
    const steel = col("impGrey");

    // ---- shell
    impFloorSlab(kit, { x0: B.min[0], x1: B.max[0], z0: B.min[2], z1: B.max[2], y: FLOOR, tint: "impDark" });
    // wall strips sit 2.1 m above the landing they serve: near landings (-72/-68/-64/-60) on the door wall and
    // the near third of the side walls, far landings (-70/-66/-62) on the back wall and the far third.
    const nearStrips = [FLOOR, -68, -64, TOP].map((lvl) => lvl - FLOOR + 2.1);
    const farStrips = [-70, -66, -62].map((lvl) => lvl - FLOOR + 2.1);
    const wall = { y0: FLOOR, h: CEIL - 0.12 - FLOOR, holes, tint: "impWhite", tint2: "impGrey", greebles: 0.04 };
    impWall(kit, { ...wall, plane: "z", at: B.min[2], inward: 1, a0: B.min[0], a1: B.max[0], stripYs: nearStrips, seed: seed + 1, tag: "stairs-fwd", greebles: 0 });
    impWall(kit, { ...wall, plane: "z", at: B.max[2], inward: -1, a0: B.min[0], a1: B.max[0], stripYs: farStrips, seed: seed + 2, tag: "stairs-aft" });
    for (const [at, inward, name, s] of [
      [B.min[0], 1, "west", 3],
      [B.max[0], -1, "east", 6],
    ]) {
      impWall(kit, { ...wall, plane: "x", at, inward, a0: B.min[2], a1: RUN0, stripYs: nearStrips, greebles: 0, seed: seed + s, tag: `stairs-${name}` });
      impWall(kit, { ...wall, plane: "x", at, inward, a0: RUN0, a1: RUN1, stripYs: [], greebles: 0, seed: seed + s + 1, tag: `stairs-${name}` });
      impWall(kit, { ...wall, plane: "x", at, inward, a0: RUN1, a1: B.max[2], stripYs: farStrips, greebles: 0.03, clear: [[189.1, 190.1]], seed: seed + s + 2, tag: `stairs-${name}` }); // level markers at z 189.6
    }
    // lit ceiling plane: the corridor's channel language with housed fixtures, plus a second channel
    impCeiling(kit, {
      x0: B.min[0],
      x1: B.max[0],
      z0: B.min[2],
      z1: B.max[2],
      y: CEIL - 0.12,
      seed: seed + 5,
      channels: [
        { axis: "z", at: 7, width: 0.6, c0: 182, c1: 192, fixtureAt: [183.6, 187.0, 190.4], fixtureLen: 2.4, fixtureMat: MAT.strip },
        { axis: "x", at: 185.2, width: 0.5, c0: X0 + 0.4, c1: X1 - 0.4, fixtureAt: [7], fixtureLen: 3.6, fixtureMat: MAT.strip, stripW: 0.1 },
      ],
    });

    // ---- landings: near (z 181.16..185.5) at -68/-64/-60, far (z 188.3..190.8) at -70/-66/-62. Each is a
    // panelled ceiling for the level below with a housed light channel across it, a deck-plate top, a dark
    // fascia and a steel nosing on the open edge.
    const landing = (z0, z1, lvl, edgeZ, k) => {
      impCeiling(kit, {
        x0: X0 - 0.01,
        x1: X1 + 0.01,
        z0,
        z1,
        y: lvl - 0.22,
        thick: 0.2,
        tint: "impGrey",
        seed: seed + 20 + k,
        channels: [{ axis: "x", at: (z0 + z1) / 2, width: 0.5, c0: X0 + 0.45, c1: X1 - 0.45, fixtureAt: [7], fixtureLen: Math.min(3.4, X1 - X0 - 1.3), fixtureMat: MAT.strip, stripW: 0.12 }],
      });
      kit.boxMM(MAT.floor, [X0 - 0.01, lvl - 0.02, z0], [X1 + 0.01, lvl, z1], { color: mid, texel: 0.5 });
      const fz0 = edgeZ > z0 ? edgeZ - 0.06 : edgeZ;
      kit.boxMM(MAT.dark, [X0 - 0.01, lvl - 0.24, fz0], [X1 + 0.01, lvl - 0.02, fz0 + 0.06], { color: dark, texel: 1 });
      kit.boxMM(MAT.steel, [X0, lvl, edgeZ > z0 ? edgeZ - 0.04 : edgeZ], [X1, lvl + 0.004, edgeZ > z0 ? edgeZ : edgeZ + 0.04], { color: steel });
      kit.boxMM(MAT.dark, [X0, lvl - 0.005, edgeZ > z0 ? edgeZ - 0.2 : edgeZ + 0.04], [X1, lvl + 0.002, edgeZ > z0 ? edgeZ - 0.04 : edgeZ + 0.2], { color: black });
    };
    [-68, -64, -60].forEach((lvl, k) => landing(Z0, RUN0, lvl, RUN0, k));
    [-70, -66, -62].forEach((lvl, k) => landing(RUN1, ALCOVE, lvl, RUN1, k + 3));

    // ---- flights (odd = west side rising +z, even = east side rising -z)
    const run = RUN1 - RUN0;
    const slopeLen = Math.hypot(run, RISE);
    const theta = Math.atan2(RISE, run);
    for (let k = 1; k <= 6; k++) {
      const base = FLOOR + (k - 1) * RISE;
      const west = k % 2 === 1;
      const x0 = west ? X0 : WELL[1];
      const x1 = west ? WELL[0] : X1;
      const xm = (x0 + x1) / 2;
      const w = x1 - x0;
      const dz = west ? 1 : -1;
      for (let i = 0; i < RISERS - 1; i++) {
        const top = base + RISER * (i + 1);
        const zA = west ? RUN0 + TREAD * i : RUN1 - TREAD * (i + 1);
        const zB = zA + TREAD;
        const front = west ? zA : zB; // nosing edge
        // painted riser + tread body, metal tread plate, steel nosing (chevron on the first and last step)
        kit.boxMM(MAT.panel, [x0, top - RISER - 0.02, zA], [x1, top - 0.04, zB], { color: dark, uv: "keep" });
        kit.boxMM(MAT.floor, [x0, top - 0.04, west ? zA - 0.03 : zA], [x1, top, west ? zB : zB + 0.03], { color: grey, texel: 0.5 });
        const n0 = west ? front - 0.03 : front - 0.02;
        const n1 = west ? front + 0.02 : front + 0.03;
        if (i === 0 || i === RISERS - 2) kit.boxMM("hazard", [x0 + 0.04, top, n0 - 0.01], [x1 - 0.04, top + 0.005, n1 + 0.03], { texel: 4 });
        else kit.boxMM(MAT.steel, [x0 + 0.04, top, n0], [x1 - 0.04, top + 0.004, n1], { color: steel });
        kit.collider([x0, top - RISER, zA], [x1, top, zB], "step");
      }
      // sloped soffit: a panelled slab whose top follows the riser bottoms (no gap), black seams across
      // it and a housed light strip along its underside centre
      const q = new THREE.Quaternion().setFromAxisAngle(X_AXIS, west ? -theta : theta);
      const zMid = (RUN0 + RUN1) / 2;
      const TS = 0.3;
      const nY = Math.cos(theta);
      const nZ = -dz * Math.sin(theta);
      const lineY = base + RISE / 2 - 0.03;
      const sc = [xm, lineY - nY * (TS / 2), zMid - nZ * (TS / 2)];
      kit.add(MAT.panel, new THREE.BoxGeometry(w - 0.02, TS, slopeLen + 0.3), { pos: sc, quat: q, color: grey, texel: 0.5 });
      const under = (off) => [sc[0], sc[1] - nY * (TS / 2 + off), sc[2] - nZ * (TS / 2 + off)];
      for (const t of [-0.25, 0, 0.25]) {
        const u = under(0.002);
        kit.add(MAT.dark, new THREE.BoxGeometry(w - 0.02, 0.004, 0.025), { pos: [u[0], u[1] + Math.sin(theta) * t * slopeLen * dz, u[2] + Math.cos(theta) * t * slopeLen], quat: q, color: black });
      }
      for (const sx of [-0.09, 0.09]) {
        const u = under(0.03);
        kit.add(MAT.dark, new THREE.BoxGeometry(0.03, 0.06, slopeLen - 0.5), { pos: [u[0] + sx, u[1], u[2]], quat: q, color: dark, texel: 2 });
      }
      {
        const u = under(0.016);
        kit.add(MAT.dark, new THREE.BoxGeometry(0.15, 0.03, slopeLen - 0.5), { pos: u, quat: q, color: black, texel: 2 });
        const s = under(0.036);
        kit.add(MAT.strip, new THREE.BoxGeometry(0.05, 0.012, slopeLen - 0.56), { pos: s, quat: q });
      }
      // stringers: well side C-channel with a steel top flange, wall side skirting
      const stringerX = west ? WELL[0] - 0.03 : WELL[1] + 0.03;
      kit.add(MAT.dark, new THREE.BoxGeometry(0.06, 0.42, slopeLen + 0.2), { pos: [stringerX, lineY - 0.12, zMid], quat: q, color: dark, texel: 1 });
      kit.add(MAT.steel, new THREE.BoxGeometry(0.1, 0.02, slopeLen + 0.2), { pos: [stringerX, lineY + 0.1, zMid], quat: q, color: steel, texel: 1 });
      kit.add(MAT.dark, new THREE.BoxGeometry(0.06, 0.06, slopeLen + 0.2), { pos: [stringerX, lineY - 0.33, zMid], quat: q, color: black, texel: 1 });
      const skirtX = west ? X0 + 0.025 : X1 - 0.025;
      kit.add(MAT.dark, new THREE.BoxGeometry(0.05, 0.3, slopeLen + 0.2), { pos: [skirtX, lineY + 0.04, zMid], quat: q, color: dark, texel: 1 });
      // rails 1.02 m above the nosing line: wall side on brackets, well side a newel balustrade with panel infill
      const ya = base + RISER / 2;
      const yb = base + RISE + RISER / 2;
      const za = west ? RUN0 : RUN1;
      const zb = west ? RUN1 : RUN0;
      impRail(kit, { a: [west ? X0 + 0.06 : X1 - 0.06, za], b: [west ? X0 + 0.06 : X1 - 0.06, zb], y0: ya, y1: yb, wall: true, wallSide: [west ? -1 : 1, 0], mid: false, postEvery: 0.95, collide: false });
      const wellX = west ? WELL[0] - 0.06 : WELL[1] + 0.06;
      impRail(kit, { a: [wellX, za], b: [wellX, zb], y0: ya, y1: yb, wall: false, infill: "panel", postEvery: 0.95, newel: 0.07, tag: "stair-rail" });
    }

    // ---- rails across the well on each landing + alcove balustrades on the far landings
    for (const lvl of [-68, -64]) impRail(kit, { a: [WELL[0] - 0.06, RUN0 - 0.05], b: [WELL[1] + 0.06, RUN0 - 0.05], y0: lvl, wall: false, postEvery: 1.2 });
    for (const lvl of [-70, -66, -62]) impRail(kit, { a: [WELL[0] - 0.06, RUN1 + 0.05], b: [WELL[1] + 0.06, RUN1 + 0.05], y0: lvl, wall: false, postEvery: 1.2 });
    for (const lvl of [-70, -66, -62]) impRail(kit, { a: [X0 + 0.06, ALCOVE], b: [X1 - 0.06, ALCOVE], y0: lvl, wall: false, postEvery: 1.4, tag: "alcove-rail" });
    // top landing guard over the flight-5 drop (west half of the edge); the stair-stop keeps the
    // (non-stepping) player from walking off the east half onto flight 6
    impRail(kit, { a: [X0 + 0.06, RUN0 - 0.05], b: [WELL[1] + 0.06, RUN0 - 0.05], y0: TOP, wall: false, postEvery: 1.0, tag: "top-rail" });
    kit.collider([WELL[1], TOP, RUN0 - 0.05], [X1, TOP + 1.0, RUN0 + 0.05], "stair-stop");

    // ---- under-landing equipment store: the ground floor beneath the -70 far landing has < 1.9 m headroom,
    // so it is closed off with a panelled partition (its face 6 cm behind the landing fascia) and lockers
    impWall(kit, { plane: "z", at: RUN1 + 0.06 + T, inward: -1, a0: X0, a1: X1, y0: FLOOR, h: 1.81, stripYs: [], tint: "impGrey", tint2: "impDark", greebles: 0, seed: seed + 6, tag: "understair" });
    for (const [x, i] of [
      [7.95, 0],
      [8.65, 1],
    ]) impLocker(kit, { pos: [x, FLOOR, RUN1 + 0.06 - 0.26], yaw: Math.PI, w: 0.62, h: 1.7, d: 0.5, status: i ? MAT.amber : MAT.blue, label: `STORE ${i + 1}`, seed: seed + 7 + i, tag: "store-locker" });
    sectionMarker(kit, { pos: [5.4, FLOOR + 1.45, RUN1 + 0.06], normal: [0, 0, -1], text: "STORE 4-S", accent: "impAmber", w: 0.7, h: 0.22 });

    // ---- machinery alcove (z 190.8..192.84): three clad vertical trunks, manifolds every level, indicators
    {
      const zc = 191.9;
      for (const x of [5.2, 7.0, 8.8]) {
        kit.cyl(MAT.panel, x, (FLOOR + CEIL - 0.12) / 2, zc, 0.34, CEIL - 0.12 - FLOOR, "y", { color: grey, segments: 18, texel: 0.5 });
        for (let y = FLOOR + 1.0; y < CEIL - 1; y += 4) {
          kit.cyl(MAT.dark, x, y, zc, 0.38, 0.16, "y", { color: black, segments: 18 });
          kit.cyl(MAT.dark, x, y + 2.0, zc, 0.36, 0.05, "y", { color: dark, segments: 18 });
          kit.boxMM(MAT.dark, [x - 0.2, y + 0.4, zc - 0.5], [x + 0.2, y + 0.7, zc - 0.34], { color: dark });
          kit.boxMM(MAT.amber, [x - 0.14, y + 0.5, zc - 0.505], [x + 0.14, y + 0.53, zc - 0.5]);
        }
      }
      for (let y = FLOOR + 3.0; y < CEIL - 1; y += 4) {
        kit.boxMM(MAT.dark, [X0 + 0.2, y - 0.12, zc - 0.12], [X1 - 0.2, y + 0.12, zc + 0.12], { color: dark, texel: 1 });
        kit.cyl(MAT.steel, (X0 + X1) / 2, y + 0.3, zc + 0.3, 0.06, X1 - X0 - 0.4, "x", { color: steel, segments: 10 });
      }
      for (const x of [4.6, 6.1, 7.9, 9.4]) kit.cyl(MAT.steel, x, (FLOOR + CEIL - 0.12) / 2, Z1 - 0.08, 0.035, CEIL - 0.12 - FLOOR - 0.4, "y", { color: steel, segments: 8 });
      kit.collider([X0, FLOOR, ALCOVE + 0.1], [X1, FLOOR + 3, Z1], "alcove");
    }

    // ---- signage: placards beside the doors at reading height, level markers on every landing
    deckPlacard(kit, { pos: [4.8, FLOOR + 1.7, Z0], normal: [0, 0, 1], w: 1.0, h: 0.34, title: "STAIRWELL 4-S", sub: "FLIGHT CONTROL +12 M", arrow: "↑", accent: "impBlue" });
    deckPlacard(kit, { pos: [4.8, TOP + 1.7, Z0], normal: [0, 0, 1], w: 1.0, h: 0.34, title: "FLIGHT CONTROL", sub: "LIFT LOBBY -12 M", arrow: "↓", accent: "impAmber" });
    for (const lvl of [-68, -64]) sectionMarker(kit, { pos: [9.2, lvl + 1.7, Z0], normal: [0, 0, 1], text: `LEVEL ${lvl}`, accent: "impBlue" });
    for (const lvl of [-70, -66, -62]) sectionMarker(kit, { pos: [X1, lvl + 1.7, 189.6], normal: [-1, 0, 0], text: `LEVEL ${lvl}`, accent: "impBlue" });
    stencilText(kit, { text: "4-S", pos: [7, FLOOR + 0.006, 183.2], normal: [0, 1, 0], up: [0, 0, 1], size: 0.5, color: "white" });

    // ---- interactables: lit wall plaques beside the flights (never in the walking line). "Up" lands just
    // inside d4-control (the top landing at z 184 is still inside this room's bounds, and the brief's
    // acceptance check expects getStats().room === "d4-control" after the climb).
    const items = [
      { id: "d4-stairs-up", label: "Climb to flight control", lvl: FLOOR, x: X0 + 0.012, normal: [1, 0, 0], text: "FLIGHT CONTROL", arrow: "up", emissive: 0x3a7bff, target: { pos: [7, TOP, 179.6], yaw: 30 } },
      { id: "d4-stairs-down", label: "Descend to the lobby", lvl: TOP, x: X1 - 0.012, normal: [-1, 0, 0], text: "LIFT LOBBY", arrow: "down", emissive: 0xffa028, target: { pos: [7, FLOOR, 184], yaw: 0 } },
    ];
    for (const it of items) {
      const z = 184.5;
      // backing plate on the wall + a painted caption under the lit sign
      kit.boxMM(MAT.dark, [Math.min(it.x, it.x + it.normal[0] * 0.02), it.lvl + 1.02, z - 0.55], [Math.max(it.x, it.x + it.normal[0] * 0.02), it.lvl + 1.72, z + 0.55], { color: black, texel: 2 });
      stencilText(kit, { text: "PRESS E - STAIR TRANSIT", pos: [it.x + it.normal[0] * 0.024, it.lvl + 1.12, z], normal: it.normal, size: 0.045, color: "white" });
      const sign = makeSignPlate(materials, { w: 0.92, h: 0.34, emissive: it.emissive, emissiveIntensity: 0.8, arrow: it.arrow, text: it.text, pos: [it.x + it.normal[0] * 0.02, it.lvl + 1.45, z], normal: it.normal });
      ctx.group.add(sign.group);
      ctx.interactables.push({
        id: it.id,
        key: "E",
        label: it.label,
        object: sign.group,
        material: sign.material,
        action: async () => {
          await ctx.hud.fadeIn(500);
          ctx.teleport(it.target);
          await ctx.hud.fadeOut(500);
        },
      });
    }

    // ---- lights (10 descriptors): a strong pool under the ceiling channel so the top plane reads from the
    // foot, one per landing level (at strip height, 1.7 m under the next landing so its underside does not
    // blow out), two mid-shaft lights in the open well for the soffits, stringers and rails
    ctx.lights.push({ type: "point", pos: [7, CEIL - 1.3, 187], color: 0xdfe8ff, intensity: 18, distance: 20, priority: 0.5 });
    const levels = [
      [FLOOR, 183.3, 0.7],
      [-70, 189.6, 0.4],
      [-68, 183.3, 0.4],
      [-66, 189.6, 0.4],
      [-64, 183.3, 0.4],
      [-62, 189.6, 0.4],
      [TOP, 183.3, 0.7],
    ];
    for (const [lvl, z, pr] of levels) ctx.lights.push({ type: "point", pos: [7, lvl + 2.1, z], color: 0xdfe8ff, intensity: 9, distance: 9, priority: pr });
    for (const y of [-66.5, -59.5]) ctx.lights.push({ type: "point", pos: [7, y, 186.4], color: 0xcfdcff, intensity: 8, distance: 10, priority: 0.3 });
    return {};
  },
};
