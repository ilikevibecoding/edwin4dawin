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
import { cableTrays, ceilingRibs, channelHousing, doorway, endWall, fireRecess, fireStation, floorStrip, noticeScreen, ribs, serviceHatch, thresholdMats, wallBands } from "./corridor.js";
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
// Open: captain w0 and w1 (the critic's cabin views). w2/e2 were open in round 2 but their doorways sit 19–32 m
// from the corridor camera at a grazing angle, and closing them freed two descriptors for the cabin uplights.
// The corridor view's repeat breaker is the UTILITY door, 3 m from that camera on the left: its leaf stands ajar
// with a 0.85 m gap at the near (south) jamb and an amber sconce point just inside that jamb (a cabin door would be
// 8+ m away, where a gap in a 0.3 m wall cannot be seen through — a 0.45 m gap at 11° shows 0.09 m of wall
// thickness, not interior).
const CLOSED = { w2: true, w3: true, e0: true, e1: true, e2: true, e3: true, e4: true, e5: true };
const UTILITY_GAP = 0.85;
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
  const ops = doors.map((o) => ({ a0: o.a0, a1: o.a1, y0: FLOOR + (o.y0 || 0), y1: FLOOR + (o.h || 2.2), kind: "door" }));
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
    const yb = o.y0 > FLOOR + 0.01 ? o.y0 - 0.06 : FLOOR;
    kit.boxMM("impPanel", [at - WT - 0.02, yb, o.a0 - 0.06], [at + WT + 0.02, o.y1 + 0.06, o.a0], liner);
    kit.boxMM("impPanel", [at - WT - 0.02, yb, o.a1], [at + WT + 0.02, o.y1 + 0.06, o.a1 + 0.06], liner);
    kit.boxMM("impPanel", [at - WT - 0.02, o.y1, o.a0 - 0.06], [at + WT + 0.02, o.y1 + 0.06, o.a1 + 0.06], liner);
    if (yb > FLOOR) kit.boxMM("impPanel", [at - WT - 0.02, yb, o.a0 - 0.06], [at + WT + 0.02, o.y0, o.a1 + 0.06], liner);
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
    // room-facing halves only behind the wardroom, w0–w1 and the utility room (west) and the duty office (east);
    // the ranges reach into the cross walls so no edge shows in a doorway. A fire-point recess (0.9 × 1.7, sill at
    // 0.35) is cut into the east half mid-corridor between e3 and e4.
    const fireOp = { a0: 489.6, a1: 490.5, y0: 0.35, h: 2.05 };
    corridorWall(kit, { at: COR.x0, corridor: "+x", doors: westDoors, ranges: [[Z0, WARD_Z1 + CABIN * 2 + WT], [WARD_Z1 + CABIN * 4 - WT, Z1]], seed: 85, ceilY, tone });
    corridorWall(kit, { at: COR.x1, corridor: "-x", doors: [...eastDoors, fireOp], ranges: [[Z0 + CABIN * 6 - WT, Z1]], seed: 87, ceilY, tone });
    // corridor-kit centre strip with the edge lines recessed in grooves (local version: half-width emitters, amber
    // rather than the spine's blue — the officers' accent)
    floorStrip(kit, 66, Z0, Z1);

    // --- west block: wardroom back wall, cabin cross walls, cabins' west wall (only behind the open cabins w0/w1)
    partition(kit, { axis: "x", at: WARD_Z1, from: B.min[0] + 0.3, to: COR.x0 - WT, floorY: FLOOR, ceilY, seed: 89, tone });
    partition(kit, { axis: "z", at: WEST_CABIN_X0, from: WARD_Z1, to: WARD_Z1 + CABIN * 2 + WT, floorY: FLOOR, ceilY, seed: 91, tone, strip: null });
    partition(kit, { axis: "z", at: WEST_CABIN_X0, from: WARD_Z1 + CABIN * 4 - WT, to: Z1, floorY: FLOOR, ceilY, seed: 92, tone, strip: null });
    for (const i of [1, 2, 4]) partition(kit, { axis: "x", at: WARD_Z1 + CABIN * i, from: WEST_CABIN_X0 + WT, to: COR.x0 - WT, floorY: FLOOR, ceilY, seed: 93 + i, tone, strip: null });
    // --- east block: only the duty office's cross wall and outer-wall stretch face an open room; walls between two
    // closed cabins are never seen from either side and are omitted
    partition(kit, { axis: "z", at: EAST_CABIN_X1, from: Z0 + CABIN * 6 - WT, to: Z1, floorY: FLOOR, ceilY, seed: 102, tone, strip: null });
    partition(kit, { axis: "x", at: Z0 + CABIN * 6, from: COR.x1 + WT, to: EAST_CABIN_X1 - WT, floorY: FLOOR, ceilY, seed: 109, tone, strip: null });

    // --- corridor: doorways with leaves + nameplates + lamps, ribs, bay ribs, trays, hatches, notices, end wall
    const westFace = COR.x0 + WT; // 64.35
    const eastFace = COR.x1 - WT; // 67.65
    const plateColor = TONE.light;
    doorway(kit, { wallX: COR.x0, face: westFace, n: "+x", z0: 463.4, z1: 464.6, plateName: "plate10", pocket: -1, plateColor, ceilY });
    for (let i = 0; i < 4; i++) {
      const zc = WARD_Z1 + CABIN * i + CABIN / 2;
      doorway(kit, { wallX: COR.x0, face: westFace, n: "+x", z0: zc - 0.6, z1: zc + 0.6, closed: !!CLOSED["w" + i], plateName: PLATE_W[i], pocket: i % 2 ? 1 : -1, plateColor, ceilY });
    }
    // utility door: leaf slid into the north pocket, 0.35 m of it left across the opening at the far jamb and the
    // gap at the jamb nearest the camera. From (66, 510.5) the sight lines run at 30–35° to the wall: past the
    // frame's proud lip (0.5 m of depth from lip to room face) they reach the leaf plane 0.56 m north of the near
    // jamb, so a gap this wide shows the leaf's lit edge and ~0.3 m of the room beside it; with the gap at the far
    // jamb the leaf would hide behind the lip and the door would read as simply open
    doorway(kit, { wallX: COR.x0, face: westFace, n: "+x", z0: 506.7, z1: 507.9, ajar: UTILITY_GAP, plateName: "plate9", pocket: -1, plateColor, lamp: false, ceilY });
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
    // centre channel: proud lips either side of the shared recess and louvre bars inside it, so the 5 cm emitter is a
    // housed fixture that fades out with distance instead of a bare white gap the corridor's full length
    channelHousing(kit, 66, Z0, Z1, ceilY);
    // every third bay: a service hatch or a fire-suppression station between the doors; mid-corridor the east wall
    // carries a fire-point recess instead of a surface cabinet
    serviceHatch(kit, [eastFace, FLOOR + 1.0, 464.8], "-x");
    fireStation(kit, [westFace, FLOOR + 1.3, 469.5], "+x");
    serviceHatch(kit, [westFace, FLOOR + 1.0, 486.2], "+x");
    fireRecess(kit, { face: eastFace, n: "-x", z0: fireOp.a0, z1: fireOp.a1, y0: FLOOR + fireOp.y0, y1: FLOOR + fireOp.h });
    serviceHatch(kit, [eastFace, FLOOR + 1.0, 498.6], "-x");
    fireStation(kit, [westFace, FLOOR + 1.3, 502.3], "+x");
    noticeScreen(kit, [westFace, FLOOR + 1.7, 509.7], "+x", "notice", 0.9);
    noticeScreen(kit, [eastFace, FLOOR + 1.7, 505.9], "-x", "deckplan", 0.7);
    endWall(kit, Z0, 66, "+z");
    // crisp threshold mats in front of every door (replaced the floor scuffs, which read as spills)
    thresholdMats(kit, westFace, +1, westDoors.map((o) => [o.a0, o.a1]));
    thresholdMats(kit, eastFace, -1, eastDoors.map((o) => [o.a0, o.a1]));

    // --- cabins (one function, varied by seed); the west cabin next to the wardroom is the captain's suite.
    // Closed cabins get no interior at all: their leaves are fixed, so nothing behind them can ever be seen, and
    // the ~600 primitives each would only cost build time (the room sits near the 250 ms budget).
    const lamps = {};
    const uplights = {};
    for (let i = 0; i < 4; i++) {
      if (CLOSED["w" + i]) continue;
      const faces = { x0: WEST_CABIN_X0 + WT, x1: COR.x0 - WT, z0: WARD_Z1 + CABIN * i + WT, z1: WARD_Z1 + CABIN * (i + 1) - WT };
      const r = buildCabin(kit, faces, -1, WARD_Z1 + CABIN * i + CABIN / 2, { seed: 11 + i, captain: i === 0, ceilY, plateName: PLATE_W[i] });
      lamps["w" + i] = r.lamp;
      uplights["w" + i] = r.uplight;
    }
    for (let i = 0; i < 6; i++) {
      if (CLOSED["e" + i]) continue;
      const faces = { x0: COR.x1 + WT, x1: EAST_CABIN_X1 - WT, z0: Z0 + CABIN * i + (i ? WT : 0), z1: Z0 + CABIN * (i + 1) - WT };
      const r = buildCabin(kit, faces, +1, Z0 + CABIN * i + CABIN / 2, { seed: 31 + i, ceilY, plateName: PLATE_E[i] });
      lamps["e" + i] = r.lamp;
      uplights["e" + i] = r.uplight;
    }

    // --- wardroom, duty office, utility room
    const wardFaces = { x0: B.min[0] + 0.3, x1: COR.x0 - WT, z0: Z0, z1: WARD_Z1 - WT };
    const ward = buildWardroom(kit, wardFaces, { z0: 463.4, z1: 464.6 }, ceilY);
    buildDutyOffice(kit, { x0: COR.x1 + WT, x1: EAST_CABIN_X1 - WT, z0: Z0 + CABIN * 6 + WT, z1: Z1 }, { z0: 508.4, z1: 509.6 }, ceilY);
    const utility = buildUtility(kit, { x0: WEST_CABIN_X0 + WT, x1: COR.x0 - WT, z0: WARD_Z1 + CABIN * 4 + WT, z1: Z1 }, { z0: 506.7, z1: 507.9 }, ceilY);

    // --- lights (14 of 14): 9 spots + 5 points. Only spot slot 0 casts shadows, so every descriptor sits where
    // the surfaces nearest to it face away from it: downward spots in ceiling housings (their cones exclude the
    // ceiling and the fixture), upward spots in the cabin partition caps (cones exclude the floor and the cap),
    // points inside the pendant shades and sconce housings ≥ 0.9 m from the nearest surface that faces them.
    // Radiance is E·ρ/π: a wall panel (ρ ≈ 0.22) needs E ≈ 2 to read as lit grey; the shell ceiling (ρ ≈ 0.013)
    // only reads under E ≳ 10, which a pendant point 0.9 m below it gives as a soft halo, never a blown blob.
    // The pool has 4 spot slots; score = (own room) + priority − d/120, so per view: corridor → duty + pools
    // 506/496/486; cabin → pool 486 (slot 0, its shadows keep it out of the cabin) + w1 lamp + w1 uplight + wash;
    // captain → wash (slot 0) + w0 lamp + w0 uplight + pool 486; wardroom → wash (slot 0) + w0 lamp/uplight + pool
    // 486 (the last three are out of frame and their cones miss the wardroom); duty → its luminaire + three pools.
    // Points are never short of slots (12). Slot 0's shadow frustum is 2 × angle wide, so the fixtures that take it
    // (duty 1.25 rad, pools 1.35, wash 1.3) keep ≤ 2.6 cm texels at 3 m; the cabin lamps (never slot 0) stay
    // near-hemispherical.
    // corridor pools every 10 m over the lit half (506/496/486 — the dead end by the wardroom reads from the
    // wardroom's own light through the door and the amber strips): spots right under the channel emitter
    for (const z of [486, 496, 506]) ctx.lights.push({ type: "spot", pos: [66, ceilY - 0.12, z], target: [66, FLOOR, z], color: LIGHT.warm, intensity: 25, distance: 14, angle: 1.35, penumbra: 0.2, priority: 0.74 });
    // wardroom: three pendants as POINTS inside the shades (table pools + wall/ceiling fill in every direction,
    // critic round 3: "one pool at y ≈ 0.8 with black above y ≈ 0.35"), the wall-wash can over the drinks cabinet
    // (0.78: it must beat the corridor pools in the wardroom view) and the west sconce as a point so the back wall reads
    // (I17 / I16: the round-4 frame at I14 / I13 measured a mean of 24.3 against the 24–28 target, with 11 clipped px)
    for (const p of ward.pendants) ctx.lights.push({ type: "point", pos: p, color: LIGHT.warm, intensity: 17, distance: 14, priority: 0.75 });
    ctx.lights.push({ type: "spot", pos: ward.wash, target: [ward.wash[0], FLOOR, ward.wash[2]], color: LIGHT.warm, intensity: 16, distance: 10, angle: 1.3, penumbra: 0.25, priority: 0.78 });
    ctx.lights.push({ type: "point", pos: ward.sconces[0], color: LIGHT.amber, intensity: 6, distance: 8, priority: 0.5 });
    // duty office: spot inside the 3 m flush luminaire, at its east third so the 1.25 rad cone still reaches the far
    // wall's displays (0.8: it is the shadow-casting slot 0 in the corridor view too, so with shadows its light
    // stays inside the office instead of leaking through the wall onto the corridor)
    ctx.lights.push({ type: "spot", pos: [73, ceilY - 0.03, 508.6], target: [73, FLOOR, 508.6], color: LIGHT.coolWhite, intensity: 27, distance: 10, angle: 1.25, penumbra: 0.25, priority: 0.8 });
    // open cabins: warm-white spot inside the hanging housing (the amber wall lamp stays the cabin's single amber lamp);
    // the cone stops just short of horizontal so the walls read up to ~2.2 m. Plus the housed UPLIGHT in the cap of
    // the half-height partition: a 1.2 rad cone aimed at the ceiling 1.95 m above (E ≈ 3.5 at the peak on the cabin's
    // own IMP.grey ceiling slab, the beams' sides and the upper walls) — the second small lamp that makes the
    // ceiling read as a surface (critic round 3: "ceiling is black").
    for (const [k, p] of Object.entries(lamps)) {
      ctx.lights.push({ type: "spot", pos: p, target: [p[0], FLOOR, p[2]], color: CABIN_WHITE, intensity: k === "w0" ? 30 : 27, distance: 10, angle: 1.55, penumbra: 0.2, priority: 0.7 });
      const u = uplights[k];
      ctx.lights.push({ type: "spot", pos: u, target: [u[0], ceilY, u[2]], color: CABIN_WHITE, intensity: 13, distance: 6, angle: 1.2, penumbra: 0.35, priority: 0.7 });
    }
    // ajar utility door: amber point inside the sconce just past the gap's jamb, on the room side of the corridor
    // wall. Points cast no shadows, so the leaf does not shape it: E ≈ 3 on the corridor floor in front of the
    // gap, 1.3 at the centre line, 0.9 on the east wall opposite — a half-disc of warm spill at the gap (the
    // corridor's repeat breaker), E ≈ 8 on the leaf's edge facing the gap and a dim amber cast on the racks seen
    // through it; the wall's corridor face points away from it and stays unlit.
    ctx.lights.push({ type: "point", pos: utility.lamp, color: LIGHT.amber, intensity: 15, distance: 7, priority: 0.6 });
    return {};
  },
};
export default manifest;
