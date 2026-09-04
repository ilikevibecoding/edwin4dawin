// d1-spine — the 168 m transverse corridor behind the bridge: bridge blast door and lift-lobby blast door face
// each other at x = 0 (junction node); side passages, officers' country and two locked future-expansion doors at
// the ends. Shell from shared/imperial.js; Phase 2 detail from ./dressing.js in repeating 4 m bays.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { rng } from "../../../kit.js";
import { signMaterials } from "./signage.js";
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
    return signMaterials(); // backlit `sign` + matte `signPaint`, one shared canvas atlas
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const rand = rng(4101);
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 41, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "x", inset: 0.25, channels: [{ at: 514, w: 0.5, emit: "emitWhite", emitW: 0.16 }] } });
    // greybox centre strip only (ribEvery: Infinity suppresses its plain ribs — dressing.js builds the structural ones)
    corridorDressing(kit, manifest, FLOOR, ceilY, { ribEvery: Infinity });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    const cf = corridorFrame(manifest, FLOOR, ceilY);
    const endZone = 4.4; // end bays carry the sealed-door treatment instead of a grid feature (the first centre is at ±80)
    dressCorridor(kit, cf, {
      seed: 4102,
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
    ribs(kit, cf, [-HEAVY_RIB_X, HEAVY_RIB_X], { heavy: true, plate: IMP.hullDark });
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

    // 14 descriptors (budget 14): one pool every 13.5 m (the outer pair at ±81 lights the sealed-end treatments),
    // the junction brightest, plus a low blue accent on the medallion. 6.5 ≈ E 0.9 under a pool and ≈ 0.25 midway
    // between two (6.75 m out): bays stay readable, and the corridor sits ~0.7 EV under its old level so it no
    // longer out-shines the bridge it leads to (critic rounds 1 and 2: transit spaces were the brightest frames).
    for (let i = -6; i <= 6; i++) {
      const x = i * 13.5;
      const end = Math.abs(i) === 6;
      ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, 514], color: LIGHT.coolWhite, intensity: x === 0 ? 8 : 6.5, distance: 17, priority: x === 0 ? 0.9 : end ? 0.4 : 0.3 });
    }
    ctx.lights.push({ type: "point", pos: [0, FLOOR + 0.5, 514], color: LIGHT.blue, intensity: 1.6, distance: 5, priority: 0.6 });
    return {};
  },
};

// Hanging cross housing across the corridor at x 0 with recessed edge light lines, a central luminaire (drum, bezel
// ring, annular lens set back behind the bezel, dark centre cap) and four square recessed corner downlights — the
// ceiling marks the node the way the ribs mark the walls. No bare emitter anywhere.
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
    cf.box(kit, "emitWhite", s - 0.008, s + 0.008, yb - 0.002, yb + 0.006, c0 + 0.5, c1 - 0.5);
  }
  // central luminaire
  kit.cyl("metalRough", 0, ceilY - 0.23, mid, 0.56, 0.16, "y", { color: IMP.mid, segments: 24, texel: 1 });
  kit.cyl("paintedMetal", 0, ceilY - 0.32, mid, 0.44, 0.03, "y", { color: IMP.black, segments: 24, texel: 1 });
  const bezel = new THREE.TorusGeometry(0.36, 0.03, 8, 32);
  bezel.rotateX(Math.PI / 2);
  kit.add("metalRough", bezel, { pos: [0, ceilY - 0.35, mid], color: IMP.dark, texel: 1 });
  const lens = new THREE.RingGeometry(0.2, 0.32, 32, 1);
  lens.rotateX(Math.PI / 2); // faces down, 4 cm above the bezel's lowest point
  kit.add("emitBlue", lens, { pos: [0, ceilY - 0.337, mid] });
  kit.cyl("paintedMetal", 0, ceilY - 0.345, mid, 0.18, 0.02, "y", { color: IMP.black, segments: 24, texel: 1 });
  // square recessed corner downlights
  for (const x of [-2.3, 2.3]) for (const z of [c0 + 0.62, c1 - 0.62]) downlight(kit, ceilY, x, z);
}

// Dark gloss field between the heavy ribs with a steel inlay frame (2 cm lit groove) around the centre strip, steel
// corner plates and two blue-grooved cross inlays — physical plates, not a glowing outline.
function junctionFloor(kit, cf) {
  const { floorY, c0, c1, mid } = cf;
  kit.boxMM("blackGloss", [-HEAVY_RIB_X + 0.24, floorY + 0.002, c0 + 0.02], [HEAVY_RIB_X - 0.24, floorY + 0.009, c1 - 0.02]);
  const zA = mid - 0.7;
  const zB = mid + 0.7;
  floorInlay(kit, floorY, [-2.3, zA], [2.3, zA]);
  floorInlay(kit, floorY, [-2.3, zB], [2.3, zB]);
  for (const x of [-2.3, 2.3]) {
    floorInlay(kit, floorY, [x, zA], [x, zB]);
    for (const z of [zA, zB]) inlayCorner(kit, floorY, x, z);
  }
  for (const x of [-1.25, 1.25]) floorInlay(kit, floorY, [x, mid - 0.5], [x, mid + 0.5], "emitBlue");
}

export default manifest;
