// d1-spine — the 168 m transverse corridor behind the bridge: bridge blast door and lift-lobby blast door face
// each other at x = 0 (junction node); side passages, officers' country and two locked future-expansion doors at
// the ends. Shell from shared/imperial.js; Phase 2 detail from ./dressing.js in repeating 4 m bays.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { rng } from "../../../kit.js";
import { signMaterials } from "./signage.js";
import { STRIP, stripMaterials } from "./strip.js";
import { corridorFrame, dressCorridor, ribs, signPanel, chevronBand, chevronThreshold, sealedEnd, doorSigns, arrowToward, floorInlay, inlayCorner, downlight, SIGN_TOP } from "./dressing.js";

const ID = "d1-spine";
const B = BOUNDS[ID];
const HEAVY_RIB_X = 3.1; // junction ribs framing both blast doors (4.0 wide + 0.05 jamb + chevron band)

const manifest = {
  id: ID,
  name: "Deck 1 Spine",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [0, FLOOR, 514], yaw: 0 },
  apertures: [],
  views: {
    "d1-spine-junction": { pos: [-7, FLOOR, 514], yaw: -90, pitch: -3 },
    "d1-spine-east": { pos: [-40, FLOOR, 514], yaw: -90, pitch: -2 },
    "d1-spine-west": { pos: [40, FLOOR, 514], yaw: 90, pitch: -2 },
    "d1-spine-end-port": { pos: [-78, FLOOR, 514], yaw: 90, pitch: -2 },
    // one forward-wall bay under the x 27 light pool: rib 26, fire panel, equipment locker (x 28), grille + plates,
    // rib 30, then the SECTION 1-B sign bay and rib 34 receding to the right; rails, kick plates, grating, conduits
    "d1-spine-bay": { pos: [26.4, FLOOR, 515.35], yaw: -24, pitch: 1 },
  },
  materials() {
    return { ...signMaterials(), ...stripMaterials() }; // backlit `sign` + matte `signPaint` (one shared canvas atlas), under-bloom strip emitter
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const rand = rng(4101);
    // every white strip / lens in this room is the under-bloom STRIP emitter (no emitWhite anywhere: same draw-call count)
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 41, panelW: 2.0, strip: STRIP, ceiling: { axis: "x", inset: 0.25, channels: [{ at: 514, w: 0.5, emit: STRIP, emitW: 0.08 }] } });
    // greybox centre strip only (ribEvery: Infinity suppresses its plain ribs — dressing.js builds the structural ones)
    corridorDressing(kit, manifest, FLOOR, ceilY, { ribEvery: Infinity });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    const cf = corridorFrame(manifest, FLOOR, ceilY);
    const endZone = 4.4; // end bays carry the sealed-door treatment instead of a grid feature (the first centre is at ±80)
    dressCorridor(kit, cf, {
      seed: 4102,
      emit: STRIP,
      ribEvery: 4,
      ribPhase: 1.7, // ribs at x = -82, -78, …, 82 (minus doors, the junction and the two end bays)
      pipeFaces: ["n"],
      trayFace: "s",
      railFaces: ["n", "s"], // handrails on both walls, broken at doors, ribs, lockers and alcoves
      gratingW: 0.62,
      noRibs: [
        [-5.5, 5.5],
        [-83.5, -81],
        [81, 83.5],
      ],
      extraBlocks: [
        { a: -HEAVY_RIB_X, w: 0.46 },
        { a: HEAVY_RIB_X, w: 0.46 },
      ],
      reserved: ["n", "s"].flatMap((face) => [
        { face, a0: -6.8, a1: 6.8 },
        { face, a0: B.min[0], a1: B.min[0] + endZone },
        { face, a0: B.max[0] - endZone, a1: B.max[0] },
      ]),
      sectionLabel: (a) => (a < 0 ? "SECTION 1-A" : "SECTION 1-B"),
    });

    // --- junction node between the two facing blast doors
    ribs(kit, cf, [-HEAVY_RIB_X, HEAVY_RIB_X], { heavy: true, plate: IMP.hullDark, emit: STRIP });
    junctionCeiling(kit, cf);
    junctionFloor(kit, cf);
    for (const d of cf.sideDoors.filter((d) => d.kind === "blast")) {
      const wf = cf.walls[d.face];
      for (const s of [-1, 1]) chevronBand(kit, wf, d.a + s * (d.w / 2 + 0.05 + 0.2), FLOOR + 1.45, { w: 0.28, h: 2.1 });
      chevronThreshold(kit, cf, d, FLOOR);
    }
    const { n, s } = cf.walls;
    const sx = HEAVY_RIB_X + 0.23 + 0.72; // sign stacks just outboard of the heavy ribs
    const top = { top: FLOOR + SIGN_TOP };
    signPanel(kit, n, -sx, 0, [
      { label: "BRIDGE", arrow: arrowToward(n, -sx, 0) },
      { label: "PORT PASSAGE", arrow: arrowToward(n, -sx, -21.8) },
      { label: "OBSERVATION GALLERY", arrow: arrowToward(n, -sx, -21.8) },
    ], top);
    signPanel(kit, n, sx, 0, [
      { label: "BRIDGE", arrow: arrowToward(n, sx, 0) },
      { label: "STARBOARD PASSAGE", arrow: arrowToward(n, sx, 21.8) },
      { label: "OFFICERS' QUARTERS", arrow: arrowToward(n, sx, 66) },
    ], top);
    signPanel(kit, s, -sx, 0, [{ label: "TURBOLIFT", arrow: arrowToward(s, -sx, 0) }, { label: "LIFT LOBBY" }], top);
    signPanel(kit, s, sx, 0, [{ label: "TURBOLIFT", arrow: arrowToward(s, sx, 0) }, { label: "DECK 01 · COMMAND" }], top);

    // --- room signs beside the standard doors on the forward wall
    doorSigns(kit, cf, [
      { id: "d1-spine-port", labels: ["PORT PASSAGE", "NAVIGATION"], side: -1 },
      { id: "d1-spine-stbd", labels: ["STARBOARD PASSAGE", "TACTICAL PLANNING"], side: 1 },
      { id: "d1-officers-spine", labels: ["OFFICERS' QUARTERS", "AUTHORISED PERSONNEL ONLY"], side: 1 },
    ]);

    // --- locked future-expansion doors at both ends read intentional: red housing, chevrons, SEALED panel, cluster
    for (const d of cf.endDoors) sealedEnd(kit, cf, d, { signFace: "n", clusterFace: "s", rand });

    // 13 descriptors (budget 14): one pool every 13.5 m (the outer pair at ±81 lights the sealed-end treatments), the
    // junction brightest (its point sits in the ceiling's top slab — see JUNCTION_POOL). 5.8 ≈ E 0.8 under a pool and
    // ≈ 0.2 midway between two: bays stay readable, and the corridor sits ~0.8 EV under its round-2 level so it no
    // longer out-shines the bridge it leads to. The old blue floor accent (0.5 m over the medallion) is gone: mirrored
    // in the gloss field it was the "floor glow" at frame (0.50, 0.67); the medallion's blue lenses carry the colour.
    for (let i = -6; i <= 6; i++) {
      const x = i * 13.5;
      const end = Math.abs(i) === 6;
      const junction = x === 0;
      ctx.lights.push({ type: "point", pos: junction ? JUNCTION_POOL(ceilY) : [x, ceilY - 0.5, 514], color: LIGHT.coolWhite, intensity: junction ? 8 : 5.8, distance: 17, priority: junction ? 0.9 : end ? 0.4 : 0.3 });
    }
    return {};
  },
};

// Junction pool point: INSIDE the ceiling's closed top slab (shared ceiling(): y ∈ [ceilY + 0.22, ceilY + 0.37]), 0.6 m
// off the light-channel axis toward the bridge door. §9.4, no shadows: a point anywhere under the ceiling plane lights
// every downward face above it — from inside the luminaire drum (round 4, ceilY - 0.2) it lit the wide cap plate's
// exposed margin to a white line (E ≈ 5.5) and, seen through the channel, the top slab beside the strip to E ≈ 12: the
// white blob over the fixture (with the strip's own specular glint on top). Above all of those faces none of them sees
// it, so the drum, bezel, lens ring and edge lines stay the only visible sources. The one lit ceiling part left is the
// channel lips' inner faces: on the axis both took E ≈ 22 at the crossing; 0.6 m off it the near lip turns its back
// and the far one gets ≤ E 12 (edge-on from the corridor axis anyway).
const JUNCTION_POOL = (ceilY) => [0, ceilY + 0.3, 514 - 0.6];

// Hanging cross housing across the corridor at x 0 with recessed edge light lines, a central luminaire (closed drum,
// bezel disc, a 6 cm annular lens set back behind the bezel, dark centre cap — the visible source of the junction pool,
// whose point sits in the slab above: JUNCTION_POOL) and four square recessed corner downlights — the ceiling marks
// the node the way the ribs mark the walls. No bare emitter anywhere.
function junctionCeiling(kit, cf) {
  const { ceilY, c0, c1, mid } = cf;
  cf.box(kit, "paintedMetal", -0.55, 0.55, ceilY - 0.16, ceilY, c0 + 0.3, c1 - 0.3, { color: IMP.dark, texel: 1 });
  cf.box(kit, "metalRough", -0.62, 0.62, ceilY - 0.06, ceilY, c0 + 0.3, c1 - 0.3, { color: IMP.mid, texel: 1 });
  // edge light lines: two lips 12 mm below the housing with a 1.6 cm lens set 1 cm up between them
  const yb = ceilY - 0.16;
  for (const s of [-0.43, 0.43]) {
    cf.box(kit, "paintedMetal", s - 0.05, s - 0.02, yb - 0.012, yb + 0.03, c0 + 0.45, c1 - 0.45, { color: IMP.black, texel: 1 });
    cf.box(kit, "paintedMetal", s + 0.02, s + 0.05, yb - 0.012, yb + 0.03, c0 + 0.45, c1 - 0.45, { color: IMP.black, texel: 1 });
    cf.box(kit, "paintedMetal", s - 0.02, s + 0.02, yb + 0.006, yb + 0.03, c0 + 0.45, c1 - 0.45, { color: IMP.black, texel: 1 });
    cf.box(kit, STRIP, s - 0.008, s + 0.008, yb - 0.002, yb + 0.006, c0 + 0.5, c1 - 0.5);
  }
  // central luminaire: every face looks down or outward, away from the pool point above the ceiling — the bezel is a
  // chamfered lathe disc, not a torus (a torus's inner wall faces the axis and the point lit it to a bright arc — the
  // round-3 "far ring").
  kit.cyl("metalRough", 0, ceilY - 0.23, mid, 0.56, 0.16, "y", { color: IMP.mid, segments: 24, texel: 1 });
  kit.cyl("paintedMetal", 0, ceilY - 0.32, mid, 0.44, 0.03, "y", { color: IMP.black, segments: 24, texel: 1 });
  const yb0 = ceilY - 0.338; // bezel underside (flat, faces down), then a chamfer rising outward to the cap's rim
  const bezel = new THREE.LatheGeometry([new THREE.Vector2(0.305, yb0), new THREE.Vector2(0.4, yb0), new THREE.Vector2(0.44, yb0 + 0.013), new THREE.Vector2(0.44, yb0 + 0.033)], 32);
  kit.add("metalRough", bezel, { pos: [0, 0, mid], color: IMP.dark, texel: 1 });
  const lens = new THREE.RingGeometry(0.24, 0.3, 32, 1);
  lens.rotateX(Math.PI / 2); // faces down, flush in the bezel's opening
  kit.add("emitBlue", lens, { pos: [0, ceilY - 0.337, mid] });
  kit.cyl("paintedMetal", 0, ceilY - 0.345, mid, 0.22, 0.02, "y", { color: IMP.black, segments: 24, texel: 1 });
  // square recessed corner downlights
  for (const x of [-2.3, 2.3]) for (const z of [c0 + 0.62, c1 - 0.62]) downlight(kit, ceilY, x, z, { emit: STRIP });
}

// Dark gloss field between the heavy ribs with a steel inlay frame (2 cm lit groove) around the centre strip, steel
// corner plates and two blue-grooved cross inlays — physical plates, not a glowing outline.
function junctionFloor(kit, cf) {
  const { floorY, c0, c1, mid } = cf;
  kit.boxMM("blackGloss", [-HEAVY_RIB_X + 0.24, floorY + 0.002, c0 + 0.02], [HEAVY_RIB_X - 0.24, floorY + 0.009, c1 - 0.02]);
  const zA = mid - 0.7;
  const zB = mid + 0.7;
  floorInlay(kit, floorY, [-2.3, zA], [2.3, zA], STRIP);
  floorInlay(kit, floorY, [-2.3, zB], [2.3, zB], STRIP);
  for (const x of [-2.3, 2.3]) {
    floorInlay(kit, floorY, [x, zA], [x, zB], STRIP);
    for (const z of [zA, zB]) inlayCorner(kit, floorY, x, z);
  }
  for (const x of [-1.25, 1.25]) floorInlay(kit, floorY, [x, mid - 0.5], [x, mid + 0.5], "emitBlue");
}

export default manifest;
