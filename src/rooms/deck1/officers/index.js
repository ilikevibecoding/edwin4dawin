// d1-officers — officers' country: a private corridor off the spine (x 64.2..67.8) with the wardroom and four
// senior cabins to port, six cabins and a duty office to starboard. Warmer grey, single amber lamp per cabin.
// Lighting: downward spots for every ceiling fixture (no shadows → a point near the ceiling blows it out), points
// only inside wall-lamp housings.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, partition, doorReveal, wall } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { officersMaterials } from "./atlas.js";
import { buildCabin } from "./cabin.js";
import { cableTrays, ceilingRibs, doorway, endWall, fireStation, floorScuffs, floorStrip, noticeScreen, ribs, serviceHatch, wallBands } from "./corridor.js";
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
const CABIN_WHITE = 0xffdcb4; // cabin ceiling lamps: warm white, so the amber wall lamp stays the cabin's single amber lamp
const STRIP = "emitWarm"; // warm wall strips / ceiling channel instead of the spine's blue-white (officers' accent)

// cabins whose door leaf is closed (no real light inside; they read from the corridor status lamp only).
// Open: captain w0, w1 (the critic's cabin view), w2 and e2 — the lit doorways the corridor view sees.
const CLOSED = { w3: true, e0: true, e1: true, e3: true, e4: true, e5: true };
// atlas nameplate per cabin (west 0..3 → cabins 01..04, east 0..5 → cabins 05..10)
const PLATE_W = ["plate0", "plate1", "plate2", "plate3"];
const PLATE_E = ["plate4", "plate5", "plate6", "plate7", "plate8", "plate9"];

// officers' palette: the Imperial greys pulled ~5 % toward amber
const warm = (c) => new THREE.Color().copy(c).lerp(IMP.amber, 0.05);
const TONE = { light: warm(IMP.grey), mid: warm(IMP.mid) };

/**
 * Corridor wall at x = `at` (same construction as the shared partition(), both halves 0.15 m): the corridor-facing
 * half runs the full length; the room-facing half is built only over `ranges`, the stretches where an open room
 * stands behind it — the closed cabins have no interior, so their side of the wall can never be seen and its ~250
 * panel boxes would only cost build time. `corridor` = "+x" when the corridor lies on the +x side of the wall.
 */
function corridorWall(kit, { at, corridor, doors, ranges, seed, ceilY, tone }) {
  const ops = doors.map((o) => ({ a0: o.a0, a1: o.a1, y0: FLOOR, y1: FLOOR + (o.h || 2.2), kind: "door" }));
  const half = (face, a0, a1, s) => {
    const bounds = face === "e" ? { min: [at - 2 * WT, FLOOR, a0], max: [at, ceilY, a1] } : { min: [at, FLOOR, a0], max: [at + 2 * WT, ceilY, a1] };
    const openings = ops.filter((o) => o.a0 >= a0 && o.a1 <= a1);
    wall(kit, { face, bounds, floorY: FLOOR, ceilY, wallT: WT, openings, seed: s, strip: STRIP, tone, tag: "partition", collide: true });
  };
  half(corridor === "+x" ? "w" : "e", Z0, Z1, seed);
  ranges.forEach(([a0, a1], i) => half(corridor === "+x" ? "e" : "w", a0, a1, seed + 17 + i * 7));
  // door gap liners (both jambs + head) so the cut reads finished; clean panel, not worn metal (wear stays below knee height)
  const liner = { color: IMP.black.clone().multiplyScalar(0.47), texel: 1 };
  for (const o of ops) {
    kit.boxMM("impPanel", [at - WT - 0.02, FLOOR, o.a0 - 0.06], [at + WT + 0.02, o.y1 + 0.06, o.a0], liner);
    kit.boxMM("impPanel", [at - WT - 0.02, FLOOR, o.a1], [at + WT + 0.02, o.y1 + 0.06, o.a1 + 0.06], liner);
    kit.boxMM("impPanel", [at - WT - 0.02, o.y1, o.a0 - 0.06], [at + WT + 0.02, o.y1 + 0.06, o.a1 + 0.06], liner);
  }
}

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
    // Shell walls only where a face can be seen: the east perimeter (x 83.7) sits behind the cabin block and is
    // skipped; the west wall exists for the wardroom only; north/south stop at the void beyond the cabin rows.
    roomShell(kit, manifest, {
      floorY: FLOOR,
      ceilY,
      seed: 83,
      panelW: 2.4,
      strip: STRIP,
      tone,
      skip: ["e"],
      walls: { w: { aRange: [Z0, WARD_Z1 + WT] }, n: { aRange: [B.min[0] + 0.3, COR.x1 + WT] }, s: { aRange: [WEST_CABIN_X0, EAST_CABIN_X1] } },
      ceiling: { axis: "z", inset: 0.25, channels: [{ at: 66, w: 0.5, emit: STRIP, emitW: 0.14 }] },
    });
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
    // room-facing halves only behind the wardroom, w0–w2 and the utility room (west) and e2 + the duty office (east);
    // the ranges reach into the cross walls so no edge shows in a doorway
    corridorWall(kit, { at: COR.x0, corridor: "+x", doors: westDoors, ranges: [[Z0, WARD_Z1 + CABIN * 3 + WT], [WARD_Z1 + CABIN * 4 - WT, Z1]], seed: 85, ceilY, tone });
    corridorWall(kit, { at: COR.x1, corridor: "-x", doors: eastDoors, ranges: [[Z0 + CABIN * 2 - WT, Z0 + CABIN * 3 + WT], [Z0 + CABIN * 6 - WT, Z1]], seed: 87, ceilY, tone });
    // corridor-kit centre strip with the blue edge lines recessed in grooves (local version: half-width emitters)
    floorStrip(kit, 66, Z0, Z1);

    // --- west block: wardroom back wall, cabin cross walls, cabins' west wall (not behind the closed cabin w3)
    partition(kit, { axis: "x", at: WARD_Z1, from: B.min[0] + 0.3, to: COR.x0 - WT, floorY: FLOOR, ceilY, seed: 89, tone });
    partition(kit, { axis: "z", at: WEST_CABIN_X0, from: WARD_Z1, to: WARD_Z1 + CABIN * 3 + WT, floorY: FLOOR, ceilY, seed: 91, tone, strip: null });
    partition(kit, { axis: "z", at: WEST_CABIN_X0, from: WARD_Z1 + CABIN * 4 - WT, to: Z1, floorY: FLOOR, ceilY, seed: 92, tone, strip: null });
    for (let i = 1; i <= 4; i++) partition(kit, { axis: "x", at: WARD_Z1 + CABIN * i, from: WEST_CABIN_X0 + WT, to: COR.x0 - WT, floorY: FLOOR, ceilY, seed: 93 + i, tone, strip: null });
    // --- east block: cross walls and outer-wall stretches that face an open room (e2, duty office); walls between two
    // closed cabins are never seen from either side and are omitted
    partition(kit, { axis: "z", at: EAST_CABIN_X1, from: Z0 + CABIN * 2 - WT, to: Z0 + CABIN * 3 + WT, floorY: FLOOR, ceilY, seed: 101, tone, strip: null });
    partition(kit, { axis: "z", at: EAST_CABIN_X1, from: Z0 + CABIN * 6 - WT, to: Z1, floorY: FLOOR, ceilY, seed: 102, tone, strip: null });
    for (const i of [2, 3, 6]) partition(kit, { axis: "x", at: Z0 + CABIN * i, from: COR.x1 + WT, to: EAST_CABIN_X1 - WT, floorY: FLOOR, ceilY, seed: 103 + i, tone, strip: null });

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

    // --- cabins (one function, varied by seed); the west cabin next to the wardroom is the captain's suite.
    // Closed cabins get no interior at all: their leaves are fixed, so nothing behind them can ever be seen, and
    // the ~600 primitives each would only cost build time (the room sits near the 250 ms budget).
    const lamps = {};
    for (let i = 0; i < 4; i++) {
      if (CLOSED["w" + i]) continue;
      const faces = { x0: WEST_CABIN_X0 + WT, x1: COR.x0 - WT, z0: WARD_Z1 + CABIN * i + WT, z1: WARD_Z1 + CABIN * (i + 1) - WT };
      const r = buildCabin(kit, faces, -1, WARD_Z1 + CABIN * i + CABIN / 2, { seed: 11 + i, captain: i === 0, ceilY, plateName: PLATE_W[i] });
      lamps["w" + i] = r.lamp;
    }
    for (let i = 0; i < 6; i++) {
      if (CLOSED["e" + i]) continue;
      const faces = { x0: COR.x1 + WT, x1: EAST_CABIN_X1 - WT, z0: Z0 + CABIN * i + (i ? WT : 0), z1: Z0 + CABIN * (i + 1) - WT };
      const r = buildCabin(kit, faces, +1, Z0 + CABIN * i + CABIN / 2, { seed: 31 + i, ceilY, plateName: PLATE_E[i] });
      lamps["e" + i] = r.lamp;
    }

    // --- wardroom, duty office, utility room
    const wardFaces = { x0: B.min[0] + 0.3, x1: COR.x0 - WT, z0: Z0, z1: WARD_Z1 - WT };
    const ward = buildWardroom(kit, wardFaces, { z0: 463.4, z1: 464.6 }, ceilY);
    buildDutyOffice(kit, { x0: COR.x1 + WT, x1: EAST_CABIN_X1 - WT, z0: Z0 + CABIN * 6 + WT, z1: Z1 }, { z0: 508.4, z1: 509.6 }, ceilY);
    buildUtility(kit, { x0: WEST_CABIN_X0 + WT, x1: COR.x0 - WT, z0: WARD_Z1 + CABIN * 4 + WT, z1: Z1 }, { z0: 506.7, z1: 507.9 }, ceilY);

    // --- lights (14 of 14). There are no shadows, so a point near a light-toned ceiling blows it out (critic round 2:
    // "blown warm blob", "blotchy hotspot"). Every ceiling fixture is therefore a wide DOWNWARD SPOT (75–89°): its
    // cone excludes the ceiling and its own housing but still reaches the walls at grazing angles, so the rooms are
    // not black voids under a lit floor. Radiance is E·ρ/π: a wall panel (ρ ≈ 0.22) needs E ≈ 2
    // to read as lit grey, a plate (ρ ≈ 0.1) E ≈ 3 — hence the intensities below (22–33 cd, 1/r^1.8 falloff; run
    // off-obs-r3 at 30–44 cd measured mean luminance 30–32 in the corridor/cabin/wardroom views against the 20–26
    // target, so everything sits ~0.45 EV under that run).
    // The pool has 4 spot slots; score = (own room) + priority − d/120, so the priorities below pick, per view,
    // the fixtures in frame: corridor → duty + pools 506/496/486; cabin → its lamp + pools 486/476 + the wash;
    // captain → its lamp + pools 476/486 + the wash; wardroom → the wash + the three pendants; duty → its
    // luminaire + pools 506/496/486. The rest are dropped, not misplaced (checked with a pool simulation).
    // Spot slot 0 (the top score) casts a shadow map whose frustum is 2 × angle wide: at angle 1.5 that is a 172°
    // camera with ~8 cm texels, and run off-obs-r3 showed its acne as horizontal stripes on the door plates 1 m from
    // the camera. So the fixtures that take slot 0 in these views — the duty luminaire (0.8, first in the corridor
    // and duty views, 1.25 rad), the pools (cabin/captain views, where their walls are out of frame; 1.35 rad) and
    // the wash (1.3 rad) — keep their cones at ≤ 1.35 rad (≤ 2.6 cm texels at 3 m); only the cabin lamps and
    // pendants, never slot 0 here, stay near-hemispherical.
    // corridor pools every 10 m (none over the dead end by the wardroom door — that slot went to the wardroom's
    // wall-wash): spots right under the ceiling channel, the channel emitter reads as the source
    for (const z of [476, 486, 496, 506]) ctx.lights.push({ type: "spot", pos: [66, ceilY - 0.12, z], target: [66, FLOOR, z], color: LIGHT.warm, intensity: 25, distance: 14, angle: 1.35, penumbra: 0.2, priority: 0.74 });
    // wardroom: three pendants (spot inside each shade; the wide cone lights the table, chairs and the lower walls,
    // the ceiling stays outside it), the wall-wash can over the locker bay (0.78: it must beat the corridor pools
    // in the wardroom view) and the west sconce as a real point so the back wall reads
    for (const p of ward.pendants) ctx.lights.push({ type: "spot", pos: p, target: [p[0], FLOOR, p[2]], color: LIGHT.warm, intensity: 26, distance: 12, angle: 1.5, penumbra: 0.15, priority: 0.75 });
    ctx.lights.push({ type: "spot", pos: ward.wash, target: [ward.wash[0], FLOOR, ward.wash[2]], color: LIGHT.warm, intensity: 13, distance: 10, angle: 1.3, penumbra: 0.25, priority: 0.78 });
    ctx.lights.push({ type: "point", pos: ward.sconces[0], color: LIGHT.amber, intensity: 5, distance: 8, priority: 0.5 });
    // duty office: spot inside the 3 m flush luminaire, at its east third so the 1.25 rad cone still reaches the far
    // wall's displays (0.8: it is the shadow-casting slot 0 in the corridor view too, so with shadows its light
    // stays inside the office instead of leaking through the wall onto the corridor)
    ctx.lights.push({ type: "spot", pos: [73, ceilY - 0.03, 508.6], target: [73, FLOOR, 508.6], color: LIGHT.coolWhite, intensity: 27, distance: 10, angle: 1.25, penumbra: 0.25, priority: 0.8 });
    // open cabins: warm-white spot inside the hanging housing (the amber wall lamp stays the cabin's single amber lamp).
    // The cone stops just short of horizontal: the walls read up to ~2.2 m instead of falling black above the wainscot.
    for (const [k, p] of Object.entries(lamps)) {
      ctx.lights.push({ type: "spot", pos: p, target: [p[0], FLOOR, p[2]], color: CABIN_WHITE, intensity: k === "w0" ? 33 : 30, distance: 10, angle: 1.55, penumbra: 0.2, priority: 0.7 });
    }
    return {};
  },
};
export default manifest;
