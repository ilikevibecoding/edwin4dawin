// d4-stairs — Deck 4 stairwell: switchback stair from the lift lobby (-72) up to the hangar flight-control
// tower (-60). Six flights of 11 risers (0.1818) × 10 treads (0.28) around a central light spine, near
// landings against the door wall (z = 181), far landings overlooking a machinery alcove at the back.
// Until the player controller can step, two lit sign plates teleport foot ↔ top (with a fade); their
// "stair-stop" colliders and the interactables go away when stepping lands.
import * as THREE from "three";
import { doorOpening } from "../../systems/doors/helper.js";
import { impWall, impCeiling, impFloorSlab, impRail, MAT, col } from "../../systems/corridor/imperial.js";
import { Placer, impLocker, makeSignPlate } from "../../systems/corridor/props.js";

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
const Y_AXIS = new THREE.Vector3(0, 1, 0);

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

    // ---- shell
    impFloorSlab(kit, { x0: B.min[0], x1: B.max[0], z0: B.min[2], z1: B.max[2], y: FLOOR, tint: "impDark" });
    // wall strips sit 2.1 m above the landing they serve: near landings (-72/-68/-64/-60) on the door wall and
    // the near third of the side walls, far landings (-70/-66/-62) on the back wall and the far third. The
    // flight zone between them gets sloped strips (below) instead.
    const nearStrips = [FLOOR, -68, -64, TOP].map((lvl) => lvl - FLOOR + 2.1);
    const farStrips = [-70, -66, -62].map((lvl) => lvl - FLOOR + 2.1);
    const wall = { y0: FLOOR, h: CEIL - 0.12 - FLOOR, holes, tint: "impWhite", tint2: "impGrey", greebles: 0.05 };
    impWall(kit, { ...wall, plane: "z", at: B.min[2], inward: 1, a0: B.min[0], a1: B.max[0], stripYs: nearStrips, seed: seed + 1, tag: "stairs-fwd" });
    impWall(kit, { ...wall, plane: "z", at: B.max[2], inward: -1, a0: B.min[0], a1: B.max[0], stripYs: farStrips, seed: seed + 2, tag: "stairs-aft" });
    for (const [at, inward, name, s] of [[B.min[0], 1, "west", 3], [B.max[0], -1, "east", 6]]) {
      impWall(kit, { ...wall, plane: "x", at, inward, a0: B.min[2], a1: RUN0, stripYs: nearStrips, seed: seed + s, tag: `stairs-${name}` });
      impWall(kit, { ...wall, plane: "x", at, inward, a0: RUN0, a1: RUN1, stripYs: [], greebles: 0, seed: seed + s + 1, tag: `stairs-${name}` });
      impWall(kit, { ...wall, plane: "x", at, inward, a0: RUN1, a1: B.max[2], stripYs: farStrips, seed: seed + s + 2, tag: `stairs-${name}` });
    }
    impCeiling(kit, { x0: B.min[0], x1: B.max[0], z0: B.min[2], z1: B.max[2], y: CEIL - 0.12, seed: seed + 5, channels: [{ axis: "z", at: 7, width: 0.6, c0: 182, c1: 192, fixtureAt: [184, 187.2, 190.4], fixtureLen: 2.2 }] });

    // ---- landings: near (z 181.16..185.5) at -68/-64/-60, far (z 188.3..190.8) at -70/-66/-62
    const landing = (z0, z1, lvl, edgeZ) => {
      kit.boxMM(MAT.floor, [X0 - 0.01, lvl - 0.15, z0], [X1 + 0.01, lvl, z1], { color: mid, texel: 0.5 });
      kit.boxMM(MAT.dark, [X0 - 0.01, lvl - 0.19, z0], [X1 + 0.01, lvl - 0.15, z1], { color: black, texel: 1 });
      // fascia + hazard nosing on the open edge (toward the flights)
      const e0 = Math.min(edgeZ, edgeZ + (edgeZ > z0 ? -0.05 : 0.05));
      kit.boxMM("hazard", [X0, lvl, e0], [X1, lvl + 0.006, e0 + 0.05], { texel: 4 });
      kit.boxMM(MAT.dark, [X0 - 0.01, lvl - 0.28, edgeZ > z0 ? edgeZ - 0.06 : edgeZ], [X1 + 0.01, lvl - 0.15, edgeZ > z0 ? edgeZ : edgeZ + 0.06], { color: dark, texel: 1 });
    };
    for (const lvl of [-68, -64, -60]) landing(Z0, RUN0, lvl, RUN0);
    for (const lvl of [-70, -66, -62]) landing(RUN1, ALCOVE, lvl, RUN1);

    // ---- flights (odd = west side rising +z, even = east side rising -z)
    const slopeLen = Math.hypot(RUN1 - RUN0, RISE);
    const theta = Math.atan2(RISE, RUN1 - RUN0);
    for (let k = 1; k <= 6; k++) {
      const base = FLOOR + (k - 1) * RISE;
      const west = k % 2 === 1;
      const x0 = west ? X0 : WELL[1];
      const x1 = west ? WELL[0] : X1;
      const xm = (x0 + x1) / 2;
      const w = x1 - x0;
      for (let i = 0; i < RISERS - 1; i++) {
        const top = base + RISER * (i + 1);
        const zA = west ? RUN0 + TREAD * i : RUN1 - TREAD * (i + 1);
        const zB = zA + TREAD;
        const front = west ? zA : zB; // nosing edge
        kit.boxMM(MAT.dark, [x0, top - RISER - 0.03, zA], [x1, top - 0.04, zB], { color: dark, texel: 1 });
        kit.boxMM(MAT.floor, [x0, top - 0.04, west ? zA - 0.03 : zA], [x1, top, west ? zB : zB + 0.03], { color: mid, texel: 0.5 });
        kit.boxMM(MAT.panel, [x0 + 0.05, top, west ? front - 0.03 : front - 0.015], [x1 - 0.05, top + 0.003, west ? front + 0.015 : front + 0.03], { color: col("impWhite"), uv: "keep" });
        kit.collider([x0, top - RISER, zA], [x1, top, zB], "step");
      }
      // sloped soffit slab + well-side stringer
      const q = new THREE.Quaternion().setFromAxisAngle(X_AXIS, west ? -theta : theta);
      const zMid = (RUN0 + RUN1) / 2;
      const dz = west ? 1 : -1;
      const soffit = new THREE.BoxGeometry(w, 0.16, slopeLen + 0.2);
      const soffitY = base + RISE / 2 - 0.2 - 0.08 * Math.cos(theta);
      const soffitZ = zMid + dz * 0.08 * Math.sin(theta);
      kit.add(MAT.dark, soffit, { pos: [xm, soffitY, soffitZ], quat: q, color: mid, texel: 1 });
      // slim light strip along the soffit underside so the flight above reads from the landing below
      kit.add(MAT.dark, new THREE.BoxGeometry(0.14, 0.03, slopeLen - 0.4), { pos: [xm, soffitY - 0.085, soffitZ], quat: q, color: black, texel: 2 });
      kit.add(MAT.strip, new THREE.BoxGeometry(0.06, 0.02, slopeLen - 0.44), { pos: [xm, soffitY - 0.1, soffitZ], quat: q });
      // sloped wall light strip following the flight, 2.1 m above the nosing line (in a dark channel)
      const stripX = west ? X0 : X1;
      const stripY = base + RISER / 2 + RISE / 2 + 2.1;
      kit.add(MAT.dark, new THREE.BoxGeometry(0.04, 0.16, slopeLen - 0.2), { pos: [stripX, stripY, zMid], quat: q, color: black, texel: 2 });
      kit.add(MAT.strip, new THREE.BoxGeometry(0.02, 0.06, slopeLen - 0.24), { pos: [stripX - (west ? -0.02 : 0.02), stripY, zMid], quat: q });
      const stringerX = west ? WELL[0] - 0.03 : WELL[1] + 0.03;
      const stringer = new THREE.BoxGeometry(0.06, 0.34, slopeLen + 0.1);
      kit.add(MAT.dark, stringer, { pos: [stringerX, base + RISE / 2 + 0.02, zMid], quat: q, color: black, texel: 1 });
      // handrails at 1.02 above the nosing line: wall side (tube on brackets), well side (posts + tube + mid rail)
      const railDir = new THREE.Vector3(0, RISE, dz * (RUN1 - RUN0)).normalize();
      const rq = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, railDir);
      const railY = base + RISER / 2 + RISE / 2 + 1.02;
      const wallX = west ? X0 + 0.08 : X1 - 0.08;
      kit.add(MAT.steel, new THREE.CylinderGeometry(0.022, 0.022, slopeLen - 0.3, 10), { pos: [wallX, railY, zMid], quat: rq, color: col("impGrey"), uv: "scale", uvScale: [0.14, slopeLen] });
      for (const t of [0.15, 0.5, 0.85]) {
        const zb = RUN0 + (RUN1 - RUN0) * (west ? t : 1 - t);
        const yb = base + RISER / 2 + RISE * t + 1.02;
        kit.boxMM(MAT.dark, [west ? X0 : X1 - 0.09, yb - 0.05, zb - 0.03], [west ? X0 + 0.09 : X1, yb - 0.01, zb + 0.03], { color: black });
      }
      const wellX = west ? WELL[0] - 0.05 : WELL[1] + 0.05;
      kit.add(MAT.steel, new THREE.CylinderGeometry(0.022, 0.022, slopeLen - 0.1, 10), { pos: [wellX, railY, zMid], quat: rq, color: col("impGrey"), uv: "scale", uvScale: [0.14, slopeLen] });
      kit.add(MAT.steel, new THREE.CylinderGeometry(0.014, 0.014, slopeLen - 0.1, 8), { pos: [wellX, railY - 0.45, zMid], quat: rq, color: col("impGrey"), uv: "scale", uvScale: [0.1, slopeLen] });
      for (let i = 0; i <= RISERS - 1; i += 2) {
        const zp = west ? RUN0 + TREAD * i + 0.06 : RUN1 - TREAD * i - 0.06;
        const yt = base + RISER * (i + 1);
        kit.boxMM(MAT.dark, [wellX - 0.02, yt, zp - 0.02], [wellX + 0.02, yt + 1.02 + RISER / 2, zp + 0.02], { color: black, texel: 2 });
      }
      kit.collider([wellX - 0.06, base, RUN0], [wellX + 0.06, base + RISE + 1.1, RUN1], "stair-rail");
    }

    // ---- rails across the well on each landing + alcove balustrades on the far landings and the ground
    for (const lvl of [-68, -64]) impRail(kit, { a: [WELL[0], RUN0 - 0.05], b: [WELL[1], RUN0 - 0.05], y0: lvl, wall: false, postEvery: 0.9 });
    for (const lvl of [-70, -66, -62]) impRail(kit, { a: [WELL[0], RUN1 + 0.05], b: [WELL[1], RUN1 + 0.05], y0: lvl, wall: false, postEvery: 0.9 });
    for (const lvl of [-70, -66, -62]) impRail(kit, { a: [X0 + 0.05, ALCOVE], b: [X1 - 0.05, ALCOVE], y0: lvl, wall: false, postEvery: 1.4, tag: "alcove-rail" });
    // top landing guard over the flight-5 drop (west) — the sign totem closes the well, the stair-stop the flight-6 head
    impRail(kit, { a: [X0 + 0.05, RUN0 - 0.05], b: [WELL[0], RUN0 - 0.05], y0: TOP, wall: false, postEvery: 0.8, tag: "top-rail" });
    // stair-stop: keeps the (non-stepping) player from walking off the top landing onto flight 6
    kit.collider([WELL[1], TOP, RUN0 - 0.05], [X1, TOP + 1.0, RUN0 + 0.05], "stair-stop");

    // ---- under-landing equipment store: the ground floor beneath the -70 far landing has < 1.9 m headroom,
    // so it is closed off with a panelled partition (its face 6 cm behind the landing fascia) and lockers
    impWall(kit, { plane: "z", at: RUN1 + 0.06 + T, inward: -1, a0: X0, a1: X1, y0: FLOOR, h: 1.81, stripYs: [], tint: "impGrey", tint2: "impDark", greebles: 0.2, seed: seed + 6, tag: "understair" });
    for (const [x, i] of [[7.95, 0], [8.65, 1]]) impLocker(kit, { pos: [x, FLOOR, RUN1 + 0.06 - 0.26], yaw: Math.PI, w: 0.62, h: 1.7, d: 0.5, status: i ? MAT.amber : MAT.blue, seed: seed + 7 + i, tag: "store-locker" });
    kit.boxMM("hazard", [WELL[1] + 0.1, FLOOR, RUN1 + 0.06 - 0.6], [X1 - 0.1, FLOOR + 0.006, RUN1 + 0.06 - 0.54], { texel: 4 });

    // ---- central light spine in the well
    {
      const sx = 7;
      const sz = (RUN0 + RUN1) / 2 + 0.3;
      kit.boxMM(MAT.dark, [sx - 0.14, FLOOR, sz - 0.14], [sx + 0.14, CEIL - 0.12, sz + 0.14], { color: dark, texel: 1 });
      for (const [ox, oz, sxw, szw] of [
        [0.14, 0, 0.006, 0.03],
        [-0.14, 0, 0.006, 0.03],
        [0, 0.14, 0.03, 0.006],
        [0, -0.14, 0.03, 0.006],
      ]) {
        kit.boxMM(MAT.strip, [sx + ox - sxw / 2 - (ox > 0 ? -0.003 : 0.003) * 0, FLOOR + 0.4, sz + oz - szw / 2], [sx + ox + sxw / 2, CEIL - 0.6, sz + oz + szw / 2]);
      }
      for (let y = FLOOR + 2; y < CEIL - 0.5; y += 2) kit.boxMM(MAT.dark, [sx - 0.17, y - 0.04, sz - 0.17], [sx + 0.17, y + 0.04, sz + 0.17], { color: black, texel: 1 });
      kit.collider([sx - 0.16, FLOOR, sz - 0.16], [sx + 0.16, FLOOR + 3, sz + 0.16], "spine");
    }

    // ---- machinery alcove (z 190.8..192.84): three vertical trunks, manifolds every level, indicators
    {
      const zc = 191.9;
      for (const x of [5.2, 7.0, 8.8]) {
        kit.cyl(MAT.dark, x, (FLOOR + CEIL - 0.12) / 2, zc, 0.34, CEIL - 0.12 - FLOOR, "y", { color: mid, segments: 18, texel: 0.5 });
        for (let y = FLOOR + 1.0; y < CEIL - 1; y += 4) {
          kit.cyl(MAT.dark, x, y, zc, 0.38, 0.16, "y", { color: black, segments: 18 });
          kit.boxMM(MAT.dark, [x - 0.2, y + 0.4, zc - 0.5], [x + 0.2, y + 0.7, zc - 0.34], { color: dark });
          kit.boxMM(MAT.amber, [x - 0.14, y + 0.5, zc - 0.505], [x + 0.14, y + 0.53, zc - 0.5]);
        }
      }
      for (let y = FLOOR + 3.0; y < CEIL - 1; y += 4) {
        kit.boxMM(MAT.dark, [X0 + 0.2, y - 0.12, zc - 0.12], [X1 - 0.2, y + 0.12, zc + 0.12], { color: dark, texel: 1 });
        kit.cyl(MAT.steel, (X0 + X1) / 2, y + 0.3, zc + 0.3, 0.06, X1 - X0 - 0.4, "x", { color: col("impGrey"), segments: 10 });
      }
      // conduit ladder on the back wall
      for (const x of [4.6, 6.1, 7.9, 9.4]) kit.cyl(MAT.steel, x, (FLOOR + CEIL - 0.12) / 2, Z1 - 0.08, 0.035, CEIL - 0.12 - FLOOR - 0.4, "y", { color: col("impGrey"), segments: 8 });
      kit.collider([X0, FLOOR, ALCOVE + 0.1], [X1, FLOOR + 3, Z1], "alcove");
    }

    // ---- interactables: lit sign totems at the well entrance (foot) and on the top landing. "Up" lands just
    // inside d4-control (the top landing at z 184 is still inside this room's bounds, and the brief's
    // acceptance check expects getStats().room === "d4-control" after the climb).
    const items = [
      { id: "d4-stairs-up", label: "Climb to flight control", lvl: FLOOR, target: { pos: [7, TOP, 179.6], yaw: 30 }, arrow: "up" },
      { id: "d4-stairs-down", label: "Descend to the lobby", lvl: TOP, target: { pos: [7, FLOOR, 184], yaw: 0 }, arrow: "down" },
    ];
    for (const it of items) {
      const P = new Placer(kit, [7, it.lvl, RUN0 + 0.02], Math.PI); // local +z faces the landing (-z)
      P.box(MAT.dark, 0, 0.8, -0.1, 0.9, 1.6, 0.2, { color: dark, texel: 1 });
      P.box(MAT.dark, 0, 0.02, -0.1, 1.0, 0.04, 0.3, { color: black });
      P.box(MAT.panel, 0, 0.55, 0.005, 0.7, 0.5, 0.01, { color: col("impGrey"), uv: "keep" });
      P.box(it.arrow === "up" ? MAT.blue : MAT.amber, 0, 1.55, 0.005, 0.6, 0.03, 0.01);
      P.collider(-0.5, 0.5, 0, 1.7, -0.25, 0.05, "totem");
      const sign = makeSignPlate(materials, { w: 0.7, h: 0.34, emissive: it.arrow === "up" ? 0x3a7bff : 0xffa028, emissiveIntensity: 0.8, arrow: it.arrow, pos: [7, it.lvl + 1.28, RUN0 + 0.02], normal: [0, 0, -1] });
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

    // ---- lights: one per landing level (at strip height, 1.7 m under the next landing so its underside does
    // not blow out) + ceiling (8 descriptors)
    ctx.lights.push({ type: "point", pos: [7, CEIL - 1.0, 187], color: 0xdfe8ff, intensity: 14, distance: 16, priority: 0.5 });
    const levels = [
      [FLOOR, 183.3, 0.7],
      [-70, 189.6, 0.4],
      [-68, 183.3, 0.4],
      [-66, 189.6, 0.4],
      [-64, 183.3, 0.4],
      [-62, 189.6, 0.4],
      [TOP, 183.3, 0.7],
    ];
    for (const [lvl, z, pr] of levels) ctx.lights.push({ type: "point", pos: [7, lvl + 2.1, z], color: 0xdfe8ff, intensity: 6, distance: 8, priority: pr });
    // two mid-shaft lights in the open well (between the sign totem and the spine) so the flight soffits,
    // stringers and rails read from below (10 descriptors)
    for (const y of [-66.5, -59.5]) ctx.lights.push({ type: "point", pos: [7, y, 186.4], color: 0xcfdcff, intensity: 5, distance: 9, priority: 0.3 });
    return {};
  },
};
