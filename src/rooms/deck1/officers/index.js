// d1-officers — officers' country: a private corridor off the spine (x 64.2..67.8) with the wardroom and four
// senior cabins to port, six cabins and a duty office to starboard. Warmer grey, single amber lamp per cabin.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, partition, corridorDressing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { officersMaterials } from "./atlas.js";
import { buildCabin } from "./cabin.js";
import { cableTrays, ceilingRibs, doorway, endWall, fireStation, floorScuffs, noticeScreen, ribs, serviceHatch, wallBands } from "./corridor.js";
import { buildWardroom } from "./wardroom.js";
import { buildDutyOffice, buildUtility } from "./service.js";

const ID = "d1-officers";
const B = BOUNDS[ID];
const COR = { x0: 64.2, x1: 67.8 };
const Z0 = B.min[2] + 0.3; // 458.3
const Z1 = B.max[2] - 0.3; // 511.7
const WARD_Z1 = 471;
const WEST_CABIN_X0 = 56;
const EAST_CABIN_X1 = 76;
const CABIN = 8;
const WT = 0.15; // partition half thickness
const AMBER_WARM = 0xffb060;
const STRIP = "emitWarm"; // warm wall strips / ceiling channel instead of the spine's blue-white (officers' accent)

// cabins whose door leaf is closed (no real light inside; they read from the corridor status lamp only)
const CLOSED = { w3: true, e1: true, e3: true, e4: true };
// atlas nameplate per cabin (west 0..3 → cabins 01..04, east 0..5 → cabins 05..10)
const PLATE_W = ["plate0", "plate1", "plate2", "plate3"];
const PLATE_E = ["plate4", "plate5", "plate6", "plate7", "plate8", "plate9"];

// officers' palette: the Imperial greys pulled ~5 % toward amber
const warm = (c) => new THREE.Color().copy(c).lerp(IMP.amber, 0.05);
const TONE = { light: warm(IMP.grey), mid: warm(IMP.mid) };

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
    "d1-officers-captain": { pos: [63.3, FLOOR, 475.3], yaw: 96, pitch: -4 },
    "d1-officers-duty": { pos: [68.8, FLOOR, 509.0], yaw: -76, pitch: -4 },
  },
  materials: officersMaterials,
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const tone = TONE;
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 83, panelW: 2.4, strip: STRIP, tone, ceiling: { axis: "z", inset: 0.25, channels: [{ at: 66, w: 0.5, emit: STRIP, emitW: 0.14 }] } });
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
    partition(kit, { axis: "z", at: COR.x0, from: Z0, to: Z1, floorY: FLOOR, ceilY, openings: westDoors, seed: 85, strip: STRIP, tone });
    partition(kit, { axis: "z", at: COR.x1, from: Z0, to: Z1, floorY: FLOOR, ceilY, openings: eastDoors, seed: 87, strip: STRIP, tone });
    // corridor look (floor strip + ribs) on a synthetic corridor manifest
    // (synthetic bounds so the dressing's interior x0/x1 land on the partitions' visible faces at 64.35 / 67.65)
    corridorDressing(kit, { bounds: { min: [COR.x0 + WT - 0.3, FLOOR, B.min[2]], max: [COR.x1 - WT + 0.3, ceilY, B.max[2]] }, doors: [...westDoors, ...eastDoors].map((o) => ({ pos: [66, FLOOR, (o.a0 + o.a1) / 2] })) }, FLOOR, ceilY, { ribs: false });

    // --- west block: wardroom back wall, cabin cross walls, cabins' west wall
    partition(kit, { axis: "x", at: WARD_Z1, from: B.min[0] + 0.3, to: COR.x0 - WT, floorY: FLOOR, ceilY, seed: 89, tone });
    partition(kit, { axis: "z", at: WEST_CABIN_X0, from: WARD_Z1, to: Z1, floorY: FLOOR, ceilY, seed: 91, tone, strip: null });
    for (let i = 1; i <= 4; i++) partition(kit, { axis: "x", at: WARD_Z1 + CABIN * i, from: WEST_CABIN_X0 + WT, to: COR.x0 - WT, floorY: FLOOR, ceilY, seed: 93 + i, tone, strip: null });
    // --- east block: cabins' east wall + cross walls
    partition(kit, { axis: "z", at: EAST_CABIN_X1, from: Z0, to: Z1, floorY: FLOOR, ceilY, seed: 101, tone, strip: null });
    for (let i = 1; i <= 6; i++) partition(kit, { axis: "x", at: Z0 + CABIN * i, from: COR.x1 + WT, to: EAST_CABIN_X1 - WT, floorY: FLOOR, ceilY, seed: 103 + i, tone, strip: null });

    // --- corridor: doorways with leaves + nameplates + lamps, ribs, bay ribs, trays, hatches, notices, end wall
    const westFace = COR.x0 + WT; // 64.35
    const eastFace = COR.x1 - WT; // 67.65
    const plateColor = TONE.light;
    doorway(kit, { wallX: COR.x0, face: westFace, n: "+x", z0: 463.4, z1: 464.6, plateName: "plate10", pocket: -1, plateColor, ceilY });
    for (let i = 0; i < 4; i++) {
      const zc = WARD_Z1 + CABIN * i + CABIN / 2;
      doorway(kit, { wallX: COR.x0, face: westFace, n: "+x", z0: zc - 0.6, z1: zc + 0.6, closed: !!CLOSED["w" + i], plateName: PLATE_W[i], pocket: i % 2 ? 1 : -1, plateColor, ceilY });
    }
    doorway(kit, { wallX: COR.x0, face: westFace, n: "+x", z0: 506.7, z1: 507.9, plateName: "plate9", pocket: 1, plateColor, lamp: false, ceilY });
    for (let i = 0; i < 6; i++) {
      const zc = Z0 + CABIN * i + CABIN / 2;
      doorway(kit, { wallX: COR.x1, face: eastFace, n: "-x", z0: zc - 0.6, z1: zc + 0.6, closed: !!CLOSED["e" + i], plateName: PLATE_E[i], pocket: i % 2 ? -1 : 1, plateColor, ceilY });
    }
    doorway(kit, { wallX: COR.x1, face: eastFace, n: "-x", z0: 508.4, z1: 509.6, plateName: "plate11", pocket: -1, plateColor, ceilY });
    // clean eye-level plates + dark upper panelling between the doorways (covers the stand-in panel dots)
    wallBands(kit, westFace, "+x", Z0, Z1, westDoors.map((o) => [o.a0, o.a1]), ceilY, plateColor);
    wallBands(kit, eastFace, "-x", Z0, Z1, eastDoors.map((o) => [o.a0, o.a1]), ceilY, plateColor);
    ribs(kit, westFace, eastFace, FLOOR, ceilY, [460.3, 466.3, 472.6, 480.3, 488.3, 496.3, 504.3]);
    ceilingRibs(kit, westFace, eastFace, ceilY, [464.3, 468.3, 476.3, 484.3, 492.3, 500.3, 508.3]);
    cableTrays(kit, ceilY, Z0 + 0.2, Z1 - 0.2, [64.95, 67.05]);
    // every third bay: a service hatch or a fire-suppression station between the doors
    serviceHatch(kit, [eastFace, FLOOR + 1.0, 464.8], "-x");
    fireStation(kit, [westFace, FLOOR + 1.3, 469.5], "+x");
    serviceHatch(kit, [westFace, FLOOR + 1.0, 486.2], "+x");
    fireStation(kit, [eastFace, FLOOR + 1.3, 482.6], "-x");
    serviceHatch(kit, [eastFace, FLOOR + 1.0, 498.6], "-x");
    fireStation(kit, [westFace, FLOOR + 1.3, 502.3], "+x");
    noticeScreen(kit, [westFace, FLOOR + 1.7, 509.7], "+x", "notice", 0.9);
    noticeScreen(kit, [eastFace, FLOOR + 1.7, 505.9], "-x", "deckplan", 0.7);
    endWall(kit, Z0, 66, "+z");
    floorScuffs(kit, 66, [463.4, 470.6, 475.4, 483.3, 491.2, 494.5, 502.6, 507.5]);

    // --- cabins (one function, varied by seed); the west cabin next to the wardroom is the captain's suite
    const centers = {};
    for (let i = 0; i < 4; i++) {
      const faces = { x0: WEST_CABIN_X0 + WT, x1: COR.x0 - WT, z0: WARD_Z1 + CABIN * i + WT, z1: WARD_Z1 + CABIN * (i + 1) - WT };
      const r = buildCabin(kit, faces, -1, WARD_Z1 + CABIN * i + CABIN / 2, { seed: 11 + i, captain: i === 0, ceilY, plateName: PLATE_W[i] });
      centers["w" + i] = r.center;
    }
    for (let i = 0; i < 6; i++) {
      const faces = { x0: COR.x1 + WT, x1: EAST_CABIN_X1 - WT, z0: Z0 + CABIN * i + (i ? WT : 0), z1: Z0 + CABIN * (i + 1) - WT };
      const r = buildCabin(kit, faces, +1, Z0 + CABIN * i + CABIN / 2, { seed: 31 + i, ceilY, plateName: PLATE_E[i] });
      centers["e" + i] = r.center;
    }

    // --- wardroom, duty office, utility room
    const wardFaces = { x0: B.min[0] + 0.3, x1: COR.x0 - WT, z0: Z0, z1: WARD_Z1 - WT };
    const ward = buildWardroom(kit, wardFaces, { z0: 463.4, z1: 464.6 }, ceilY);
    buildDutyOffice(kit, { x0: COR.x1 + WT, x1: EAST_CABIN_X1 - WT, z0: Z0 + CABIN * 6 + WT, z1: Z1 }, { z0: 508.4, z1: 509.6 }, ceilY);
    buildUtility(kit, { x0: WEST_CABIN_X0 + WT, x1: COR.x0 - WT, z0: WARD_Z1 + CABIN * 4 + WT, z1: Z1 }, { z0: 506.7, z1: 507.9 }, ceilY);

    // --- lights (14 of 14): warm corridor pools ×3, three wardroom pendants + serving hatch, duty office,
    // captain + five open cabins. Closed cabins and the utility room have no real light (emissives only).
    for (const z of [466, 486, 506]) ctx.lights.push({ type: "point", pos: [66, ceilY - 0.45, z], color: LIGHT.warm, intensity: 12, distance: 13, priority: 0.8 });
    for (const p of ward.pendants) ctx.lights.push({ type: "point", pos: p, color: LIGHT.warm, intensity: 10, distance: 12, priority: 0.7 });
    ctx.lights.push({ type: "point", pos: ward.hatch, color: LIGHT.warm, intensity: 5, distance: 5, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [71.5, ceilY - 0.4, 508.8], color: LIGHT.coolWhite, intensity: 8, distance: 9, priority: 0.35 });
    const c0 = centers.w0;
    ctx.lights.push({ type: "point", pos: [c0[0], ceilY - 0.4, c0[2]], color: AMBER_WARM, intensity: 16, distance: 10, priority: 0.45 });
    for (const k of ["w1", "w2", "e0", "e2", "e5"]) {
      const c = centers[k];
      ctx.lights.push({ type: "point", pos: [c[0], ceilY - 0.4, c[2]], color: AMBER_WARM, intensity: 14, distance: 9.5, priority: 0.3 });
    }
    return {};
  },
};
export default manifest;
