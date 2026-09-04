// d1-officers — officers' country: a private corridor off the spine (x 64.2..67.8) with the wardroom and four
// senior cabins to port, six cabins and a duty office to starboard. Warmer grey, single amber lamp per cabin.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, partition, corridorDressing, doorReveal } from "../shared/imperial.js";
import { seat } from "../bridge/stations.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-officers";
const B = BOUNDS[ID];
const COR = { x0: 64.2, x1: 67.8 };
const Z0 = B.min[2] + 0.3; // 458.3
const Z1 = B.max[2] - 0.3; // 511.7
const WARD_Z1 = 471;
const WEST_CABIN_X0 = 56;
const EAST_CABIN_X1 = 76;
const CABIN = 8;

const manifest = {
  id: ID,
  name: "Officers' Quarters",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [66, FLOOR, 509.5], yaw: 0 },
  apertures: [],
  views: {
    "d1-officers-corridor": { pos: [66, FLOOR, 510.5], yaw: 0, pitch: -2 },
    "d1-officers-cabin": { pos: [63.3, FLOOR, 483], yaw: 90, pitch: -6 },
    "d1-officers-wardroom": { pos: [62.8, FLOOR, 465], yaw: 100, pitch: -4 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const tone = { light: IMP.grey, mid: IMP.mid };
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 83, panelW: 2.4, strip: "emitWhite", tone, ceiling: { axis: "z", inset: 0.25, channels: [{ at: 66, w: 0.5, emit: "emitWhite", emitW: 0.14 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // --- private corridor walls with cabin/wardroom door gaps (1.2 × 2.2 internal doors)
    const westDoors = [{ a0: 463.4, a1: 464.6, h: 2.2 }];
    for (let i = 0; i < 4; i++) {
      const zc = WARD_Z1 + CABIN * i + CABIN / 2;
      westDoors.push({ a0: zc - 0.6, a1: zc + 0.6, h: 2.2 });
    }
    westDoors.push({ a0: 506.7, a1: 507.9, h: 2.2 }); // utility room
    const eastDoors = [];
    for (let i = 0; i < 6; i++) {
      const zc = Z0 + CABIN * i + CABIN / 2;
      eastDoors.push({ a0: zc - 0.6, a1: zc + 0.6, h: 2.2 });
    }
    eastDoors.push({ a0: 508.4, a1: 509.6, h: 2.2 }); // duty office
    partition(kit, { axis: "z", at: COR.x0, from: Z0, to: Z1, floorY: FLOOR, ceilY, openings: westDoors, seed: 85, strip: "emitWhite", tone });
    partition(kit, { axis: "z", at: COR.x1, from: Z0, to: Z1, floorY: FLOOR, ceilY, openings: eastDoors, seed: 87, strip: "emitWhite", tone });
    // corridor look (floor strip + ribs) on a synthetic corridor manifest
    // (synthetic bounds so the dressing's interior x0/x1 land on the partitions' visible faces at 64.35 / 67.65)
    corridorDressing(kit, { bounds: { min: [COR.x0 + 0.15 - 0.3, FLOOR, B.min[2]], max: [COR.x1 - 0.15 + 0.3, ceilY, B.max[2]] }, doors: [...westDoors, ...eastDoors].map((o) => ({ pos: [66, FLOOR, (o.a0 + o.a1) / 2] })) }, FLOOR, ceilY, { ribEvery: 4 });

    // --- west block: wardroom back wall, cabin cross walls, cabins' west wall
    partition(kit, { axis: "x", at: WARD_Z1, from: B.min[0] + 0.3, to: COR.x0 - 0.15, floorY: FLOOR, ceilY, seed: 89, tone });
    partition(kit, { axis: "z", at: WEST_CABIN_X0, from: WARD_Z1, to: Z1, floorY: FLOOR, ceilY, seed: 91, tone, strip: null });
    for (let i = 1; i <= 4; i++) partition(kit, { axis: "x", at: WARD_Z1 + CABIN * i, from: WEST_CABIN_X0 + 0.15, to: COR.x0 - 0.15, floorY: FLOOR, ceilY, seed: 93 + i, tone, strip: null });
    // --- east block: cabins' east wall + cross walls
    partition(kit, { axis: "z", at: EAST_CABIN_X1, from: Z0, to: Z1, floorY: FLOOR, ceilY, seed: 101, tone, strip: null });
    for (let i = 1; i <= 6; i++) partition(kit, { axis: "x", at: Z0 + CABIN * i, from: COR.x1 + 0.15, to: EAST_CABIN_X1 - 0.15, floorY: FLOOR, ceilY, seed: 103 + i, tone, strip: null });

    // --- cabins: bunk against the outer wall, desk + seat, locker, amber lamp
    const cabin = (x0, x1, z0, z1, side) => {
      const outerX = side < 0 ? x0 + 0.2 : x1 - 0.2; // far wall from the corridor
      const bx0 = side < 0 ? outerX : outerX - 0.95;
      const bx1 = side < 0 ? outerX + 0.95 : outerX;
      kit.boxMM("paintedMetal", [bx0, FLOOR, z0 + 0.4], [bx1, FLOOR + 0.45, z0 + 2.5], { color: IMP.dark, texel: 1 });
      kit.boxMM("fabric", [bx0 + 0.03, FLOOR + 0.45, z0 + 0.43], [bx1 - 0.03, FLOOR + 0.62, z0 + 2.47], { color: IMP.grey, texel: 2 });
      kit.boxMM("fabric", [bx0 + 0.1, FLOOR + 0.62, z0 + 0.5], [bx1 - 0.1, FLOOR + 0.72, z0 + 1.0], { color: IMP.white, texel: 2 });
      kit.collider([bx0, FLOOR, z0 + 0.4], [bx1, FLOOR + 0.7, z0 + 2.5], "bunk");
      // desk on the far wall further along, seat facing it
      const dx0 = side < 0 ? outerX : outerX - 0.7;
      const dx1 = side < 0 ? outerX + 0.7 : outerX;
      kit.boxMM("paintedMetal", [dx0, FLOOR + 0.7, z1 - 2.6], [dx1, FLOOR + 0.76, z1 - 1.0], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [dx0 + 0.1, FLOOR, z1 - 1.3], [dx1 - 0.1, FLOOR + 0.7, z1 - 1.05], { color: IMP.dark, texel: 1 });
      kit.boxMM("screenImp3", [side < 0 ? dx1 - 0.02 : dx0 + 0.01, FLOOR + 0.9, z1 - 2.3], [side < 0 ? dx1 - 0.01 : dx0 + 0.02, FLOOR + 1.4, z1 - 1.3], { uv: "keep" });
      kit.collider([dx0, FLOOR, z1 - 2.6], [dx1, FLOOR + 0.8, z1 - 1.0], "desk");
      seat(kit, side < 0 ? dx1 + 0.55 : dx0 - 0.55, FLOOR, z1 - 1.8, side < 0 ? 1 : 3);
      // locker by the door wall
      const lx0 = side < 0 ? x1 - 0.8 : x0 + 0.2;
      kit.boxMM("paintedMetal", [lx0, FLOOR, z0 + 0.3], [lx0 + 0.6, FLOOR + 2.1, z0 + 1.3], { color: IMP.dark, texel: 1 });
      kit.collider([lx0, FLOOR, z0 + 0.3], [lx0 + 0.6, FLOOR + 2.1, z0 + 1.3], "locker");
      // amber lamp over the bunk
      kit.boxMM("paintedMetal", [side < 0 ? outerX : outerX - 0.12, FLOOR + 1.9, z0 + 1.3], [side < 0 ? outerX + 0.12 : outerX, FLOOR + 2.0, z0 + 1.7], { color: IMP.black, texel: 1 });
      kit.boxMM("emitAmber", [side < 0 ? outerX + 0.12 : outerX - 0.13, FLOOR + 1.92, z0 + 1.35], [side < 0 ? outerX + 0.13 : outerX - 0.12, FLOOR + 1.98, z0 + 1.65]);
    };
    for (let i = 0; i < 4; i++) cabin(WEST_CABIN_X0 + 0.15, COR.x0 - 0.15, WARD_Z1 + CABIN * i, WARD_Z1 + CABIN * (i + 1), -1);
    for (let i = 0; i < 6; i++) cabin(COR.x1 + 0.15, EAST_CABIN_X1 - 0.15, Z0 + CABIN * i, Z0 + CABIN * (i + 1), +1);

    // --- wardroom: long table with chairs, sideboard along the north wall, viewscreen on the west wall
    const wx = (B.min[0] + 0.3 + COR.x0) / 2;
    const wz = (Z0 + WARD_Z1) / 2;
    kit.boxMM("paintedMetal", [wx - 4, FLOOR + 0.72, wz - 0.7], [wx + 4, FLOOR + 0.78, wz + 0.7], { color: IMP.black, texel: 1 });
    for (const x of [wx - 3, wx + 3]) kit.boxMM("paintedMetal", [x - 0.25, FLOOR, wz - 0.45], [x + 0.25, FLOOR + 0.72, wz + 0.45], { color: IMP.dark, texel: 1 });
    kit.collider([wx - 4, FLOOR, wz - 0.7], [wx + 4, FLOOR + 0.8, wz + 0.7], "table");
    for (let k = 0; k < 6; k++) {
      seat(kit, wx - 3.3 + k * 1.3, FLOOR, wz - 1.25, 2);
      seat(kit, wx - 3.3 + k * 1.3, FLOOR, wz + 1.25, 0);
    }
    kit.boxMM("paintedMetal", [B.min[0] + 0.35, FLOOR, Z0 + 0.35], [COR.x0 - 1.2, FLOOR + 0.95, Z0 + 0.95], { color: IMP.dark, texel: 1 });
    kit.collider([B.min[0] + 0.35, FLOOR, Z0 + 0.35], [COR.x0 - 1.2, FLOOR + 0.95, Z0 + 0.95], "sideboard");
    kit.boxMM("darkGloss", [B.min[0] + 0.3, FLOOR + 1.0, wz - 2.5], [B.min[0] + 0.4, FLOOR + 3.0, wz + 2.5]);
    kit.boxMM("screenImp0", [B.min[0] + 0.4, FLOOR + 1.1, wz - 2.4], [B.min[0] + 0.41, FLOOR + 2.9, wz + 2.4], { uv: "keep" });

    // --- lights (10 of 14): corridor pools, wardroom pair, one amber per west cabin, duty office
    for (const z of [466, 486, 506]) ctx.lights.push({ type: "point", pos: [66, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 7, distance: 11, priority: 0.6 });
    for (const x of [wx - 3, wx + 3]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, wz], color: LIGHT.warm, intensity: 8, distance: 10, priority: 0.5 });
    for (let i = 0; i < 4; i++) ctx.lights.push({ type: "point", pos: [WEST_CABIN_X0 + 1.2, FLOOR + 1.95, WARD_Z1 + CABIN * i + 1.5], color: LIGHT.amber, intensity: 2.5, distance: 6, priority: 0.3 });
    ctx.lights.push({ type: "point", pos: [72, ceilY - 0.5, 509], color: LIGHT.coolWhite, intensity: 6, distance: 8, priority: 0.3 });
    return {};
  },
};
export default manifest;
