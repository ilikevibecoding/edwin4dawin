// Main hangar bay (workstream HANGAR): the 130 × 40 × 220 m ventral bay. The opening to space is in
// the floor (a well through the hull skin, rimmed by a raised coaming with railings, launch-lane gaps
// and a magnetic containment field), TIE racks hang from the ceiling at spec.rackSlot() with service
// gantries at y = 30 reached by a switchback stair tower on the W wall, a second tower on the E wall
// climbs to the flight-control door (y = 16) and on to the E gantries, refuelling / repair stations
// sit under the racks, a static gantry crane rides ceiling rails, and a recessed cargo lift sits at
// the aft end. Walls are industrial: black structural ribs, pale plate band, dark upper bays, flood
// banks. Room-local coordinates; fighters are parented in at runtime by the fighters workstream.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../materials.js";
import { HANGAR, rackSlot, DECK_SPOTS, KESTREL, hullBottomY } from "../spec.js";
import { lux, roomWalls } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { HG_DECAL, hgDecalRect, hgNumber } from "../textures_hangar.js";
import { rng } from "../kit.js";
import {
  hgSetup,
  inst,
  tiltedBox,
  deckDecal,
  deckDecalImp,
  frameHgDecal,
  dashedLine,
  cutSpans,
  hgRailing,
  hgRailingGaps,
  hgCatwalk,
  hgStairTower,
  hgBeacons,
  hgFuelBowser,
  hgHoseReel,
  hgToolCart,
  hgPowerBox,
  hgDiagConsole,
  hgScissorLift,
  hgGantryCrane,
  hgFloorSocket,
  hgDeckLamp,
  hoseGeometry,
  hgCrateStack,
  hgManifold,
  hgWall,
  hgWallOpenings,
  hgCeiling,
  hgTieCradle,
  hgBerthOutline,
  hgLadder,
  hgPowerDroid,
  hgBollard,
  hgDeckCable,
  deckLine,
} from "./hangar_kit.js";

export function buildHangar(kit, ctx, room) {
  hgSetup(kit);
  const materials = kit.materials;
  const [W, H, D] = room.size;
  const hx = W / 2;
  const hz = D / 2;
  const [OX, OY, OZ] = room.origin;
  const accentKey = "emitAmber";
  const rand = rng(4242);

  // ---- spec geometry in room-local coordinates
  const op = { x0: HANGAR.opening.x0 - OX, x1: HANGAR.opening.x1 - OX, z0: HANGAR.opening.z0 - OZ, z1: HANGAR.opening.z1 - OZ };
  const tie = HANGAR.tie;
  const rows = HANGAR.rackRows.map((r, i) => ({
    x: r.x - OX,
    z0: r.z0 - OZ,
    z1: r.z1 - OZ,
    n: r.n,
    side: r.x < 0 ? -1 : 1,
    slots: Array.from({ length: r.n }, (_, k) => {
      const p = rackSlot(i, k);
      return { x: p.x - OX, y: p.y - OY, z: p.z - OZ, k };
    }),
  }));
  const fighterTop = rows[0].slots[0].y + tie.wingH / 2; // wing tops (the clamps grip here)
  const ballTop = rows[0].slots[0].y + tie.ballR;
  const spots = DECK_SPOTS.map((s) => ({ x: s.x - OX, z: s.z - OZ, yaw: s.yaw }));
  // Kestrel local frame (aft door at its origin, bow at -z, yawed KESTREL.yaw) -> hangar local
  const kz = (vx, vz) => {
    const c = Math.cos(KESTREL.yaw);
    const s = Math.sin(KESTREL.yaw);
    return [vx * c + vz * s + KESTREL.position.x - OX, -vx * s + vz * c + KESTREL.position.z - OZ];
  };
  const ky = (vy) => vy + KESTREL.position.y - OY;

  // ---- opening rim geometry
  // coaming height: just under the player's STEP_UP (0.55) so the spec spawn (local -20, 90 = on the aft
  // coaming) lands ON the rim instead of jamming the player between the rim and the field colliders;
  // the field collider, not the rim height, is what keeps the player off the well
  const cH = 0.5;
  const cIn = 0.4; // coaming overlap inside the opening edge (covers the well-wall tops built by hull.js)
  const cOut = 1.2; // coaming width on the deck side
  const CX0 = op.x0 - cOut;
  const CX1 = op.x1 + cOut;
  const CZ0 = op.z0 - cOut;
  const CZ1 = op.z1 + cOut;
  const IX0 = op.x0 + cIn;
  const IX1 = op.x1 - cIn;
  const IZ0 = op.z0 + cIn;
  const IZ1 = op.z1 - cIn;
  const LANE_Z = [30, 40]; // launch-lane gaps in the W / E coaming railings

  // cargo lift platform (aft, W of the cargo door lane) and its recessed channel
  const LP = { x0: -44, x1: -32, z0: 95, z1: 107 };
  const chan = 0.5;
  const LC = { x0: LP.x0 - chan, x1: LP.x1 + chan, z0: LP.z0 - chan, z1: LP.z1 + chan };

  // stair towers (1.5 m off the wall faces so the wall ribs stay clear)
  const towerW = { x0: -63.5, x1: -59.5, z0: -20, z1: -9.5 };
  // E tower sits aft of the flight-control window strips (lz 1.8..6.6) so it never fronts the glass; its
  // y = 16 landing joins a catwalk that runs along the wall under the windows to the raised door
  const towerE = { x0: 59.5, x1: 63.5, z0: 7.5, z1: 18 };
  const GANTRY_Y = 30;
  const FC_Y = 16; // flight-control door / catwalk level

  // animated beacon groups (filled while building, meshed at the end)
  const redBlink = [];
  const amberBlink = [];
  const amberPulse = [];

  // ---- keep-clear bookkeeping for deck props
  const kf = KESTREL.footprint;
  const clear = [
    { x0: kf.x0 - OX - 4, z0: kf.z0 - OZ - 8, x1: kf.x1 - OX + 4, z1: kf.z1 - OZ + 4 },
    { x0: towerW.x0 - 1, z0: towerW.z0 - 2, x1: towerW.x1 + 1, z1: towerW.z1 + 1.5 },
    { x0: towerE.x0 - 1, z0: towerE.z0 - 1.5, x1: towerE.x1 + 1, z1: towerE.z1 + 1.5 },
    { x0: -hx, z0: -44, x1: -50, z1: -16 }, // fighter-bay blast door approach
    { x0: 50, z0: -46, x1: hx, z1: -14 }, // shuttle-bay blast door approach
    { x0: -13, z0: 94, x1: 13, z1: hz }, // cargo door lane
    { x0: 56, z0: 100, x1: hx, z1: hz }, // lobby door
    { x0: 58, z0: -4, x1: hx, z1: towerE.z0 + 1 }, // under the flight-control catwalk struts
    { x0: CX0 - 3.5, z0: CZ0 - 3.5, x1: CX1 + 3.5, z1: CZ1 + 3.5 }, // opening + chevron band
    { x0: -47, z0: 28, x1: -32, z1: 42 },
    { x0: 32, z0: 28, x1: 47, z1: 42 },
    { x0: LC.x0 - 1.6, z0: LC.z0 - 1.6, x1: LC.x1 + 1.6, z1: LC.z1 + 1.6 },
    ...spots.map((s) => ({ x0: s.x - 8.5, z0: s.z - 8.5, x1: s.x + 8.5, z1: s.z + 8.5 })),
    ...rows.flatMap((r) => r.slots.map((s) => ({ x0: s.x - 4.9, z0: s.z - 3.4, x1: s.x + 4.9, z1: s.z + 3.4 }))),
  ];
  const free = (x0, z0, x1, z1) => x0 > -64 && x1 < 64 && z0 > -109 && z1 < 109 && !clear.some((c) => c.x1 > x0 && c.x0 < x1 && c.z1 > z0 && c.z0 < z1);
  /** Place a prop if its footprint (half sizes hw × hd around cx, cz) is free; reserves the footprint. */
  const place = (cx, cz, hw, hd, fn) => {
    if (!free(cx - hw, cz - hd, cx + hw, cz + hd)) return false;
    fn();
    clear.push({ x0: cx - hw, z0: cz - hd, x1: cx + hw, z1: cz + hd });
    return true;
  };

  // =====================================================================================
  // Deck
  // =====================================================================================
  // dark deck: the grid texture's 0.62 sRGB base × this tint ≈ 0.04 linear albedo (sRGB ≈ #38393c), i.e.
  // near-black away from the floods and a dark grey under them; the painted markings carry it
  const DECK_TINT = new THREE.Color("#5e6168");
  const deck = (x0, z0, x1, z1) => kit.boxMM("impDeck", [x0, -0.14, z0], [x1, 0, z1], { color: DECK_TINT, texel: 0.35 });
  deck(-hx, -hz, hx, CZ0); // forward deck
  deck(-hx, CZ0, CX0, CZ1); // W flank of the opening
  deck(CX1, CZ0, hx, CZ1); // E flank
  deck(-hx, CZ1, LC.x0, hz); // aft deck, split around the cargo lift channel
  deck(LC.x1, CZ1, hx, hz);
  deck(LC.x0, CZ1, LC.x1, LC.z0);
  deck(LC.x0, LC.z1, LC.x1, hz);
  // plate seams every 12.5 m (skipping the opening and the lift channel)
  {
    const holes = [
      { x0: CX0 - 1.7, x1: CX1 + 1.7, z0: CZ0 - 1.7, z1: CZ1 + 1.7 },
      { x0: LC.x0 - 0.8, x1: LC.x1 + 0.8, z0: LC.z0 - 0.8, z1: LC.z1 + 0.8 },
    ];
    const seam = (x0, z0, x1, z1) => kit.boxMM("impTrim", [x0, 0.0005, z0], [x1, 0.006, z1], { color: PALETTE.impBlack, texel: 1 });
    for (let x = -50; x <= 50; x += 12.5) {
      const cuts = holes.filter((h) => x > h.x0 && x < h.x1).map((h) => [h.z0, h.z1]);
      for (const [a, b] of cutSpans([[-hz + 0.5, hz - 0.5]], cuts)) seam(x - 0.04, a, x + 0.04, b);
    }
    for (let z = -97.5; z <= 97.5; z += 12.5) {
      const cuts = holes.filter((h) => z > h.z0 && z < h.z1).map((h) => [h.x0, h.x1]);
      for (const [a, b] of cutSpans([[-hx + 0.5, hx - 0.5]], cuts)) seam(a, z - 0.04, b, z + 0.04);
    }
  }

  // =====================================================================================
  // Opening to space: coaming, chevrons, railings, barriers, inset lights, field, glow
  // =====================================================================================
  {
    const sides = [
      [CX0, CZ0, IX0, CZ1],
      [IX1, CZ0, CX1, CZ1],
      [IX0, CZ0, IX1, IZ0],
      [IX0, IZ1, IX1, CZ1],
    ];
    for (const [a, b, c, d] of sides) {
      kit.boxMM("impMetalRough", [a, -0.14, b], [c, cH - 0.08, d], { color: PALETTE.impCharcoal, texel: 0.5 });
      kit.boxMM("impMetal", [a, cH - 0.08, b], [c, cH, d], { color: PALETTE.impGreyDark, texel: 0.5 });
      // walkable: the player steps up onto the rim (the spec spawn is on it); the field collider below is
      // what keeps them off the well. A non-walkable rim would shove a player spawned inside it sideways.
      kit.collider([a, 0, b], [c, cH, d], "coaming");
      kit.colliders[kit.colliders.length - 1].walkable = true;
      kit.floor(a, b, c, d, cH, "coaming");
    }
    // soft blue rim glow: one dim channel recessed in the coaming top along the inner edge (the old
    // bright edge strips on the well face and the white inset lamps are gone — the rim reads by its
    // coaming, chevron band and railings, not by light lines)
    const s = 0.08;
    kit.boxMM("emitBlueDim", [IX0 + 0.12, cH, IZ0 + 0.12], [IX0 + 0.12 + s, cH + 0.02, IZ1 - 0.12], { uv: "keep" });
    kit.boxMM("emitBlueDim", [IX1 - 0.12 - s, cH, IZ0 + 0.12], [IX1 - 0.12, cH + 0.02, IZ1 - 0.12], { uv: "keep" });
    kit.boxMM("emitBlueDim", [IX0 + 0.12, cH, IZ0 + 0.12], [IX1 - 0.12, cH + 0.02, IZ0 + 0.12 + s], { uv: "keep" });
    kit.boxMM("emitBlueDim", [IX0 + 0.12, cH, IZ1 - 0.12 - s], [IX1 - 0.12, cH + 0.02, IZ1 - 0.12], { uv: "keep" });
    // small amber marker lamps on the deck-facing coaming faces every 12 m
    for (let z = CZ0 + 3; z < CZ1 - 1; z += 12) {
      kit.box("emitAmberDim", CX0 - 0.01, 0.3, z, 0.02, 0.1, 0.5);
      kit.box("emitAmberDim", CX1 + 0.01, 0.3, z, 0.02, 0.1, 0.5);
    }
    for (let x = CX0 + 3; x < CX1 - 1; x += 12) {
      kit.box("emitAmberDim", x, 0.3, CZ0 - 0.01, 0.5, 0.1, 0.02);
      kit.box("emitAmberDim", x, 0.3, CZ1 + 0.01, 0.5, 0.1, 0.02);
    }
    // hazard chevron band on the deck around the coaming
    const cb = 1.6;
    kit.boxMM("chevronY", [CX0 - cb, 0.002, CZ0 - cb], [CX0, 0.012, CZ1 + cb], { texel: 0.6 });
    kit.boxMM("chevronY", [CX1, 0.002, CZ0 - cb], [CX1 + cb, 0.012, CZ1 + cb], { texel: 0.6 });
    kit.boxMM("chevronY", [CX0, 0.002, CZ0 - cb], [CX1, 0.012, CZ0], { texel: 0.6 });
    kit.boxMM("chevronY", [CX0, 0.002, CZ1], [CX1, 0.012, CZ1 + cb], { texel: 0.6 });
    // railings on the coaming top: W / E with launch-lane gaps, forward end closed, aft end open
    const railOpts = { h: 1.1, light: "emitBlueDim", tag: "coaming-rail", postStep: 2.5 };
    hgRailingGaps(kit, "z", op.x0 - 0.7, CZ0 + 0.3, CZ1 - 0.3, cH, [LANE_Z], railOpts);
    hgRailingGaps(kit, "z", op.x1 + 0.7, CZ0 + 0.3, CZ1 - 0.3, cH, [LANE_Z], railOpts);
    hgRailingGaps(kit, "x", op.z0 - 0.7, CX0 + 0.3, CX1 - 0.3, cH, [], railOpts);
    // aft end: knee-high barrier with an amber light bar and red warning lamps (fighters drop through here);
    // steppable, so a player standing on the coaming (the room spawn is on it) can get back to the deck
    hgRailing(kit, [CX0 + 0.3, op.z1 + 0.7], [CX1 - 0.3, op.z1 + 0.7], cH, { h: 0.45, midRail: false, kick: false, postStep: 3, light: "emitAmber", tag: "barrier", walkable: true });
    // the field itself is impassable to personnel: one collider over the whole opening (the default room
    // floor still spans it, so this is what keeps the player off the well from the coaming top). Pulled
    // 0.5 m in from the opening edge so its face never coincides with the spawn point on the rim (a player
    // centre exactly on a collider face is treated as "inside" and ejected along x); the player's radius
    // still holds them over the coaming (inner edge at 0.4 m).
    const fIn = 0.5;
    kit.collider([op.x0 + fIn, -0.6, op.z0 + fIn], [op.x1 - fIn, 2.6, op.z1 - fIn], "field");
    for (let x = CX0 + 1.5; x < CX1 - 1; x += 5) hgDeckLamp(kit, x, op.z1 + 0.25, "emitRedImp", cH);
    for (const x of [CX0 + 0.6, CX1 - 0.6]) redBlink.push([x, cH + 1.7, op.z1 + 0.7, 0.35, 0.35, 0.35]);
    for (const x of [CX0 + 0.6, CX1 - 0.6]) kit.box("impTrim", x, cH + 1.05, op.z1 + 0.7, 0.14, 0.9, 0.14, { color: PALETTE.impBlack });
    // launch-lane gap markers
    for (const z of LANE_Z) {
      hgDeckLamp(kit, op.x0 - 0.3, z, "emitAmber", cH);
      hgDeckLamp(kit, op.x1 + 0.3, z, "emitAmber", cH);
    }
    // corner beacons on stubby masts
    for (const [x, z] of [[CX0 + 0.6, CZ0 + 0.6], [CX1 - 0.6, CZ0 + 0.6], [CX0 + 0.6, CZ1 - 0.6], [CX1 - 0.6, CZ1 - 0.6]]) {
      kit.box("impTrim", x, cH + 1.2, z, 0.18, 1.2, 0.18, { color: PALETTE.impBlack });
      amberBlink.push([x, cH + 1.95, z, 0.4, 0.3, 0.4]);
    }
    // well liner: hull.js builds the well walls in pale exterior plate, which reads as a floating slab
    // from the deck; clad them from the inside in dark plate with light strips and ribs, following the
    // hull bottom (the well is 6.8 m deep forward and 11.7 m aft)
    {
      const wellY = (lz) => hullBottomY(lz + OZ) - OY + 0.3; // local y of the hull skin under the well, with a margin
      const t = 0.1;
      const yTop = -0.14;
      const strip = (x0, z0, x1, z1, y0) => {
        kit.boxMM("impMetalRough", [x0, y0, z0], [x1, yTop, z1], { color: PALETTE.impCharcoal, texel: 0.5 });
      };
      for (let z = op.z0; z < op.z1 - 0.01; z += 10) {
        const z1 = Math.min(op.z1, z + 10);
        const y0 = Math.max(wellY(z), wellY(z1));
        strip(op.x0 + 0.3, z, op.x0 + 0.3 + t, z1, y0);
        strip(op.x1 - 0.3 - t, z, op.x1 - 0.3, z1, y0);
        // vertical ribs between the strips
        kit.boxMM("impTrim", [op.x0 + 0.3, y0, z1 - 0.25], [op.x0 + 0.65, yTop, z1 + 0.25], { color: PALETTE.impBlack, texel: 1 });
        kit.boxMM("impTrim", [op.x1 - 0.65, y0, z1 - 0.25], [op.x1 - 0.3, yTop, z1 + 0.25], { color: PALETTE.impBlack, texel: 1 });
      }
      const yEnd0 = wellY(op.z0);
      const yEnd1 = wellY(op.z1);
      strip(op.x0 + 0.3, op.z0 + 0.3, op.x1 - 0.3, op.z0 + 0.3 + t, yEnd0);
      strip(op.x0 + 0.3, op.z1 - 0.3 - t, op.x1 - 0.3, op.z1 - 0.3, yEnd1);
      // one dim blue marker line half-way down the shaft (the two bright rings are gone)
      const ly = -2.6;
      kit.boxMM("emitBlueDim", [op.x0 + 0.4, ly - 0.04, op.z0 + 0.4], [op.x0 + 0.46, ly + 0.04, op.z1 - 0.4], { uv: "keep" });
      kit.boxMM("emitBlueDim", [op.x1 - 0.46, ly - 0.04, op.z0 + 0.4], [op.x1 - 0.4, ly + 0.04, op.z1 - 0.4], { uv: "keep" });
      kit.boxMM("emitBlueDim", [op.x0 + 0.4, ly - 0.04, op.z0 + 0.4], [op.x1 - 0.4, ly + 0.04, op.z0 + 0.46], { uv: "keep" });
      kit.boxMM("emitBlueDim", [op.x0 + 0.4, ly - 0.04, op.z1 - 0.46], [op.x1 - 0.4, ly + 0.04, op.z1 - 0.4], { uv: "keep" });
    }
    // magnetic containment field (additive, animated via map offset by main.js) + faint corner glow
    const fg = new THREE.PlaneGeometry(op.x1 - op.x0, op.z1 - op.z0);
    fg.rotateX(-Math.PI / 2);
    kit.add("field", fg, { pos: [(op.x0 + op.x1) / 2, 0.12, (op.z0 + op.z1) / 2], uv: "scale", uvScale: [12, 20] });
    for (const [gx, gz] of [[op.x0, op.z0], [op.x1, op.z0], [op.x0, op.z1], [op.x1, op.z1]]) {
      const g = new THREE.PlaneGeometry(8, 8);
      g.rotateX(-Math.PI / 2);
      kit.add("hangar_glowBlue", g, { pos: [gx, 0.45, gz], uv: "keep" });
    }
  }

  // =====================================================================================
  // Deck markings: lanes, pads, slot footprints, sockets, numbers
  // =====================================================================================
  {
    // main forward centreline and the cross lane at the blast-door station (z = -30)
    dashedLine(kit, [0, -106], [0, CZ0 - 2.2]);
    dashedLine(kit, [-52, -30], [52, -30], { dash: 3, gap: 2 });
    // per-row service lanes along the inner edge of each rack row
    for (const r of rows) {
      const lx = r.x - r.side * 6;
      dashedLine(kit, [lx, r.z0 - 3], [lx, r.z1 + 3]);
      // spur from the centreline to each forward slot (skipping the Kestrel's parking area)
      for (const s of r.slots) {
        if (r.z1 < 0) {
          if (r.side < 0 && s.z > clear[0].z0 && s.z < clear[0].z1) continue;
          dashedLine(kit, [r.side * 2, s.z], [lx, s.z], { dash: 2, gap: 2, w: 0.18 });
        }
      }
    }
    // launch lanes from the rack rows to the coaming gaps, with arrows and chevron edges
    const lz = (LANE_Z[0] + LANE_Z[1]) / 2;
    for (const side of [-1, 1]) {
      dashedLine(kit, [side * 44, lz], [side * (Math.abs(CX0) + 1.2), lz], { dash: 2.5, gap: 1.6, w: 0.3 });
      kit.boxMM("chevronY", [Math.min(side * 46, side * 32.8), 0.003, LANE_Z[0] - 0.7], [Math.max(side * 46, side * 32.8), 0.011, LANE_Z[0]], { texel: 0.8 });
      kit.boxMM("chevronY", [Math.min(side * 46, side * 32.8), 0.003, LANE_Z[1]], [Math.max(side * 46, side * 32.8), 0.011, LANE_Z[1] + 0.7], { texel: 0.8 });
      deckDecal(kit, HG_DECAL.launch, side * 37.5, lz, 5.5, side < 0 ? -Math.PI / 2 : Math.PI / 2, 0.0065);
      deckDecal(kit, HG_DECAL.launch, side * 43.5, lz, 5.5, side < 0 ? -Math.PI / 2 : Math.PI / 2, 0.0065);
      // "open deck" drop hazard signs beside the aft barrier
      deckDecal(kit, HG_DECAL.drop, side * 26, CZ1 + 3.3, 2.6, Math.PI, 0.0065);
    }
    // cargo door lane and threshold
    dashedLine(kit, [0, CZ1 + 2.2], [0, 98.5]);
    kit.boxMM("chevronY", [-9.2, 0.002, 98.8], [9.2, 0.012, 100.2], { texel: 0.6 });
    deckDecalImp(kit, IMP_DECAL.arrowRight, 0, 96.5, 2.4, Math.PI / 2, 0.0065);
    // taxi arrows: along the forward centreline toward the blast-door station, along the cross lane
    // toward the fighter / shuttle bay doors, and along the rack service lanes toward the launch lanes
    for (const z of [-95, -70, -45]) deckDecalImp(kit, IMP_DECAL.arrowRight, 0, z, 3.0, -Math.PI / 2, 0.0065);
    for (const x of [-46, -20, 20, 46]) deckDecalImp(kit, IMP_DECAL.arrowRight, x, -30, 3.0, x < 0 ? Math.PI : 0, 0.0065);
    for (const side of [-1, 1]) {
      for (const z of side < 0 ? [-8, 10, 55] : [-8, 10, 55, 70]) deckDecalImp(kit, IMP_DECAL.arrowRight, side * 44, z, 2.6, z < lz ? -Math.PI / 2 : Math.PI / 2, 0.0065);
    }
    // chevron thresholds at the fighter-bay (W, lz -38..-22) and shuttle-bay (E, lz -40..-20) blast doors,
    // with a painted approach box and keep-clear stencil in front of each
    kit.boxMM("chevronY", [-hx + 0.5, 0.002, -38.6], [-hx + 2.0, 0.012, -21.4], { texel: 0.6 });
    kit.boxMM("chevronY", [hx - 2.0, 0.002, -40.6], [hx - 0.5, 0.012, -19.4], { texel: 0.6 });
    deckLine(kit, [-hx + 2.0, -39.4], [-hx + 14, -39.4]);
    deckLine(kit, [-hx + 2.0, -20.6], [-hx + 14, -20.6]);
    deckLine(kit, [-hx + 14, -39.4], [-hx + 14, -20.6]);
    deckLine(kit, [hx - 2.0, -41.4], [hx - 14, -41.4]);
    deckLine(kit, [hx - 2.0, -18.6], [hx - 14, -18.6]);
    deckLine(kit, [hx - 14, -41.4], [hx - 14, -18.6]);
    deckDecalImp(kit, IMP_DECAL.keepClear, -hx + 8, -30, 4.0, Math.PI / 2, 0.0065);
    deckDecalImp(kit, IMP_DECAL.keepClear, hx - 8, -30, 4.0, -Math.PI / 2, 0.0065);
    // slot footprints, slot numbers and magnetic sockets under every rack slot
    let bay = 0;
    for (const r of rows) {
      bay++;
      for (const s of r.slots) {
        // the spec parks fighters on landing pads directly under some rack slots: the pad markings win there
        if (spots.some((sp) => Math.hypot(sp.x - s.x, sp.z - s.z) < 11)) continue;
        deckDecal(kit, HG_DECAL.tie, s.x, s.z, 8.4, 0, 0.006);
        deckDecal(kit, hgNumber(s.k + 1), s.x - r.side * 6.3, s.z, 2.0, r.side < 0 ? Math.PI / 2 : -Math.PI / 2, 0.0068);
        for (const [dx, dz] of [[-3.3, -1.4], [3.3, -1.4], [-3.3, 1.4], [3.3, 1.4]]) hgFloorSocket(kit, s.x + dx, s.z + dz);
      }
      // bay number on the deck at the row head (6 m)
      const headZ = r.z1 < 0 ? r.z0 - 8 : r.z1 + 7.5;
      deckDecal(kit, hgNumber(bay), r.x, headZ, 6, r.z1 < 0 ? 0 : Math.PI, 0.0068);
    }
    // berths at the deck spots: painted outline with corner brackets, ring decal, fighter outline, lamps
    for (const s of spots) {
      hgBerthOutline(kit, s.x, s.z, s.yaw, 5.6, 4.6);
      deckDecal(kit, HG_DECAL.pad, s.x, s.z, 13, 0, 0.007);
      deckDecal(kit, HG_DECAL.tie, s.x, s.z, 8.4, s.yaw, 0.0075);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        hgDeckLamp(kit, s.x + Math.cos(a) * 7, s.z + Math.sin(a) * 7, i % 2 ? "emitAmberDim" : "emitAmber");
      }
    }
  }

  // =====================================================================================
  // TIE racks: ceiling rails per row, an instanced clamp / guide assembly per slot, hoses
  // =====================================================================================
  {
    const railY0 = 38.4;
    const B = (parts, sx, sy, sz, x, y, z) => parts.push(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z).toNonIndexed());
    // black: trolley, clamp jaws, pistons
    const clampGeo = () => {
      const parts = [];
      for (const sx of [-1, 1]) {
        B(parts, 0.5, 1.5, 0.9, sx * 4.4, railY0 + 0.75, 0); // trolley uprights riding the rails
        B(parts, 0.55, 0.7, 2.4, sx * 3.3, fighterTop - 0.25, 0); // clamp jaws around the wing tops
        B(parts, 0.16, 0.6, 0.16, sx * 2.5, fighterTop - 0.05, 0.3); // pistons
        B(parts, 0.16, 0.6, 0.16, sx * 2.5, fighterTop - 0.05, -0.3);
      }
      B(parts, 1.2, 0.3, 0.6, 0, fighterTop + 0.55, 0); // umbilical block
      return mergeGeometries(parts, false);
    };
    // grey: yoke beam, docking guide rails and feet, pads, rail shoes (so the racks read against the dark ceiling)
    const padGeo = () => {
      const parts = [];
      B(parts, 9.6, 0.5, 0.9, 0, fighterTop + 0.25, 0); // yoke beam over the wing tops
      for (const sx of [-1, 1]) {
        B(parts, 0.3, railY0 - (fighterTop - tie.wingH), 0.3, sx * 4.4, (railY0 + fighterTop - tie.wingH) / 2, 0); // docking guide rails
        B(parts, 0.7, 0.2, 0.7, sx * 4.4, fighterTop - tie.wingH + 0.1, 0); // guide feet
        B(parts, 0.75, 0.22, 2.6, sx * 3.3, fighterTop - 0.7, 0); // pads
        B(parts, 0.2, 0.2, 1.0, sx * 4.4, railY0 + 0.05, 0); // rail shoes
      }
      return mergeGeometries(parts, false);
    };
    // hazard bands on the jaws and the yoke ends
    const hazGeo = () => {
      const parts = [];
      for (const sx of [-1, 1]) {
        B(parts, 0.57, 0.3, 2.42, sx * 3.3, fighterTop - 0.25, 0);
        B(parts, 1.0, 0.52, 0.92, sx * 4.3, fighterTop + 0.25, 0);
      }
      return mergeGeometries(parts, false);
    };
    const hoseGeo = () =>
      mergeGeometries(
        [hoseGeometry(new THREE.Vector3(1.2, fighterTop + 0.1, 0.45), new THREE.Vector3(0.45, ballTop + 0.1, 0.3), 0.6, 0.07, 7), hoseGeometry(new THREE.Vector3(-1.2, fighterTop + 0.1, -0.45), new THREE.Vector3(-0.5, ballTop + 0.1, -0.3), 0.7, 0.05, 7)],
        false,
      );
    for (const r of rows) {
      for (const sx of [-1, 1]) {
        const x = r.x + sx * 4.4;
        kit.boxMM("impTrim", [x - 0.5, H - 0.15, r.z0 - 4], [x + 0.5, H, r.z1 + 4], { color: PALETTE.impBlack, texel: 0.5 });
        kit.boxMM("impTrim", [x - 0.12, railY0 + 0.15, r.z0 - 4], [x + 0.12, H - 0.15, r.z1 + 4], { color: PALETTE.impBlack, texel: 0.5 });
        kit.boxMM("impMetal", [x - 0.5, railY0, r.z0 - 4], [x + 0.5, railY0 + 0.15, r.z1 + 4], { color: PALETTE.impGreyDark, texel: 0.5 });
        // end stops with a hazard band and a lamp
        for (const z of [r.z0 - 4, r.z1 + 4]) {
          kit.box("chevronY", x, railY0 + 0.8, z, 1.1, 1.6, 0.4, { texel: 1 });
          kit.box(accentKey, x, railY0 - 0.15, z, 0.4, 0.12, 0.3);
        }
      }
      // cross ties between the two rails every other slot gap
      for (let j = 0; j <= r.n; j += 2) {
        const z = r.z0 + (j * (r.z1 - r.z0)) / r.n;
        kit.boxMM("impTrim", [r.x - 4.9, H - 0.9, z - 0.3], [r.x + 4.9, H, z + 0.3], { color: PALETTE.impBlack, texel: 0.5 });
      }
      for (const s of r.slots) {
        inst(kit, "hg_rack_clamp", "impTrim", clampGeo, [s.x, 0, s.z], null, PALETTE.impBlack);
        inst(kit, "hg_rack_pads", "impMetal", padGeo, [s.x, 0, s.z], null, PALETTE.impGrey);
        inst(kit, "hg_rack_haz", "chevronY", hazGeo, [s.x, 0, s.z], null);
        inst(kit, "hg_rack_hose", "rubber", hoseGeo, [s.x, 0, s.z], null, PALETTE.impCharcoal);
        amberPulse.push([s.x, fighterTop + 0.25, s.z + 0.47, 0.5, 0.16, 0.04]);
        amberPulse.push([s.x, fighterTop + 0.25, s.z - 0.47, 0.5, 0.16, 0.04]);
        for (const dz of [-1, 1]) {
          const g = new THREE.PlaneGeometry(0.42, 0.42);
          if (dz < 0) g.rotateY(Math.PI);
          kit.add("hangar_decal", g, { pos: [s.x + 2.2, fighterTop + 0.25, s.z + dz * 0.462], uv: "keep", uvRect: hgDecalRect(hgNumber(s.k + 1)) });
        }
      }
    }
  }

  // =====================================================================================
  // Service gantries (y = 30) with cross platforms, stair towers, flight-control catwalk (y = 16)
  // =====================================================================================
  {
    const CW = 3.5;
    for (const r of rows) {
      const wallSide = r.side < 0 ? "W" : "E";
      const xw = r.side < 0 ? [-59.5, -59.5 + CW] : [59.5 - CW, 59.5];
      const zr = r.z1 < 0 ? [-98, -17] : [r.side < 0 ? 7 : 2.5, 88];
      const gapsZ = [];
      for (let j = 1; j < r.n; j++) {
        const g = r.z0 + (j * (r.z1 - r.z0)) / r.n;
        gapsZ.push([g - 1.2, g + 1.2]);
      }
      const towerGap = r.z1 < 0 && r.side < 0 ? [[towerW.z0, towerW.z0 + 1.7]] : r.z1 > 0 && r.side > 0 ? [[towerE.z0, towerE.z0 + 1.7]] : [];
      hgCatwalk(kit, xw[0], zr[0], xw[1], zr[1], GANTRY_Y, {
        rails: { N: true, S: true, E: true, W: true },
        gaps: wallSide === "W" ? { E: gapsZ, W: towerGap } : { W: gapsZ, E: towerGap },
        hangers: { yTop: H, step: 12.5, start: zr[0] + 2, end: zr[1] - 2, axis: "z" },
        tag: "gantry",
        light: "hangar_amberDim",
      });
      // cross platforms reaching in between the fighters
      for (const [g0, g1] of gapsZ) {
        const px = r.side < 0 ? [xw[1], r.x + 5] : [r.x - 5, xw[0]];
        hgCatwalk(kit, px[0], g0, px[1], g1, GANTRY_Y, {
          rails: r.side < 0 ? { N: true, S: true, E: true, W: false } : { N: true, S: true, E: false, W: true },
          hangers: { yTop: H, axis: "x", at: r.side < 0 ? [px[0] + 1.0, px[1] - 1.6] : [px[0] + 1.6, px[1] - 1.0] },
          tag: "gantry-x",
        });
        // hose reel / tool locker on the platform end
        const ex = r.side < 0 ? px[1] - 0.9 : px[0] + 0.9;
        kit.box("impTrim", ex, GANTRY_Y + 0.45, (g0 + g1) / 2, 0.7, 0.9, 0.9, { color: PALETTE.impBlack, texel: 1 });
        kit.box(accentKey, ex, GANTRY_Y + 0.75, (g0 + g1) / 2 + (r.side < 0 ? 0 : 0), 0.3, 0.06, 0.5);
        kit.collider([ex - 0.35, GANTRY_Y, (g0 + g1) / 2 - 0.45], [ex + 0.35, GANTRY_Y + 0.9, (g0 + g1) / 2 + 0.45], "locker");
      }
      // gantry-mounted work lights aimed at the fighters
      for (const s of r.slots) {
        const lx = r.side < 0 ? xw[1] - 0.3 : xw[0] + 0.3;
        kit.box("impTrim", lx, GANTRY_Y + 2.3, s.z, 0.4, 0.3, 0.6, { color: PALETTE.impBlack });
        kit.box("emitWhite", lx + r.side * -0.21, GANTRY_Y + 2.3, s.z, 0.02, 0.2, 0.5);
      }
    }
    // stair towers
    hgStairTower(kit, { ...towerW, rises: Array(9).fill(GANTRY_Y / 9), wallSide: "W", tag: "towerW", accentKey, openFaces: { 9: "inner" } });
    hgStairTower(kit, { ...towerE, rises: [3.2, 3.2, 3.2, 3.2, 3.2, 3.5, 3.5, 3.5, 3.5], wallSide: "E", tag: "towerE", accentKey, openFaces: { 5: "end", 9: "inner" } });
    // tower ident stencils and top beacons
    for (const t of [towerW, towerE]) {
      const cx = (t.x0 + t.x1) / 2;
      amberBlink.push([cx, GANTRY_Y + 1.6, (t.z0 + t.z1) / 2, 0.4, 0.3, 0.4]);
      kit.box("impTrim", cx, GANTRY_Y + 1.3, (t.z0 + t.z1) / 2, 0.16, 0.5, 0.16, { color: PALETTE.impBlack });
    }
    // catwalk at y = 16 along the E wall: from the tower's level-5 landing (open N face) it runs under the
    // booth's window strip to the raised flight-control door, braced off the wall
    hgCatwalk(kit, towerE.x0, -2.5, hx, towerE.z0, FC_Y, { rails: { N: true, S: true, E: false, W: true }, gaps: { S: [[towerE.x0, towerE.x1]] }, tag: "fc-catwalk" });
    for (const z of [-1.9, 2.3, towerE.z0 - 1.0]) tiltedBox(kit, "impTrim", new THREE.Vector3(hx - 0.1, FC_Y - 4.6, z), new THREE.Vector3(towerE.x0 + 0.6, FC_Y - 0.55, z), 0.26, 0.3, { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impTrim", [hx - 0.5, FC_Y - 0.62, -2.5], [hx, FC_Y - 0.42, towerE.z0], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [hx - 0.35, FC_Y - 0.9, -2.5], [hx - 0.05, FC_Y - 0.62, towerE.z0], { color: PALETTE.impGreyDark });
    // door approach marking on the catwalk grate
    kit.boxMM("chevronY", [hx - 2.6, FC_Y + 0.004, -1.5], [hx - 0.2, FC_Y + 0.012, 1.5], { texel: 1 });
  }

  // =====================================================================================
  // Refuelling and repair stations under the racks, staging areas, crane, cargo lift
  // =====================================================================================
  {
    for (const r of rows) {
      const side = r.side;
      const faceRoom = side < 0 ? -Math.PI / 2 : Math.PI / 2; // prop local -z toward the room centre
      r.slots.forEach((s, i) => {
        const v = (i + (r.z1 > 0 ? 1 : 0)) % 3;
        const jitter = () => (rand() - 0.5) * 0.4;
        if (v === 0) {
          place(side * 60.5, s.z - 3.4, 2.8, 1.2, () => hgFuelBowser(kit, side * 60.5, s.z - 3.4, faceRoom + Math.PI / 2 + jitter() * 0.3, { seed: i }));
          place(side * 62.6, s.z + 1.4, 0.8, 0.8, () => hgHoseReel(kit, side * 62.6, s.z + 1.4, faceRoom + Math.PI));
          place(side * 57.6, s.z + 3.2, 0.8, 0.8, () => hgToolCart(kit, side * 57.6, s.z + 3.2, faceRoom + jitter() * 2, { seed: i + 3 }));
        } else if (v === 1) {
          place(side * 58.4, s.z - 1.2, 1.1, 0.8, () => hgDiagConsole(kit, side * 58.4, s.z - 1.2, faceRoom, { seed: i + 11, cableTo: [side * 61.5, s.z - 2.4] }));
          place(side * 62.6, s.z - 2.4, 0.5, 0.5, () => hgPowerBox(kit, side * 62.6, s.z - 2.4, faceRoom));
          place(side * 62.6, s.z + 0.2, 0.5, 0.5, () => hgPowerBox(kit, side * 62.6, s.z + 0.2, faceRoom, { on: false }));
          place(side * 61, s.z + 3.6, 1.7, 1.7, () => hgCrateStack(kit, side * 61, s.z + 3.6, faceRoom + jitter(), [["a", 0, 0, 0], ["b", 0, 1.0, 0.1, 0.1], ["c", 1.4, 0, 0.3, 0.4]], { seed: i }));
        } else {
          place(side * 58.2, s.z + 2.6, 1.5, 1.5, () => hgScissorLift(kit, side * 58.2, s.z + 2.6, faceRoom + Math.PI / 2 + jitter(), 3.2 + (i % 2) * 0.8));
          place(side * 62.4, s.z - 3.4, 1.7, 1.7, () => hgCrateStack(kit, side * 62.4, s.z - 3.4, jitter(), [["b", 0, 0, 0], ["a", 0.1, 1.2, 0], ["c", -0.1, 2.2, 0.1, 0.5]], { seed: i + 5 }));
          place(side * 62.6, s.z + 0.4, 0.8, 0.8, () => hgHoseReel(kit, side * 62.6, s.z + 0.4, faceRoom + Math.PI, { hoseOut: false }));
          place(side * 58.6, s.z - 2.2, 0.5, 0.5, () => hgPowerBox(kit, side * 58.6, s.z - 2.2, faceRoom + Math.PI));
        }
      });
    }
    // forward staging area along the N wall
    for (const x of [-22, -6, 10, 26]) {
      place(x, -105, 2.2, 2.0, () => hgCrateStack(kit, x, -105, rand() * 0.4, [["b", 0, 0, 0], ["b", 0, 1.2, 0, 0.05], ["a", 2.0, 0, 0.2, 0.3], ["c", 2.0, 1.0, 0.2, 0.8], ["c", -1.6, 0, 0.4, 1.2]], { seed: x }));
    }
    place(40, -104.5, 1.2, 0.8, () => hgDiagConsole(kit, 40, -104.5, Math.PI, { seed: 21, screens: ["scrBlue0", "scrAmber0"] }));
    place(43.5, -104.5, 0.8, 0.8, () => hgToolCart(kit, 43.5, -104.5, 0.3, { seed: 8 }));
    place(-36, -104.5, 0.5, 0.5, () => hgPowerBox(kit, -36, -104.5, 0));
    // deck-spot pit crews (between the two W spots and beside the E spot)
    place(-35.5, 71.5, 0.8, 0.8, () => hgHoseReel(kit, -35.5, 71.5, Math.PI / 2));
    place(-35.5, 59, 0.8, 0.8, () => hgToolCart(kit, -35.5, 59, 1.2, { seed: 9 }));
    place(-35.5, 84.5, 0.5, 0.5, () => hgPowerBox(kit, -35.5, 84.5, Math.PI / 2));
    place(35.5, -70, 0.8, 0.8, () => hgToolCart(kit, 35.5, -70, -1.1, { seed: 10 }));
    place(35.5, -90, 0.5, 0.5, () => hgPowerBox(kit, 35.5, -90, -Math.PI / 2));
    // berth kit at every deck spot, laid out in the fighter's frame (x = wing span, +z = aft, toward the room):
    // clamp cradle, fuel bowser beside the starboard wing, hose reel and power droid on the port side,
    // maintenance ladder up to the hatch behind the ball, hazard bollards fore and aft
    spots.forEach((s, i) => {
      const L = (lx, lz) => {
        const c = Math.cos(s.yaw);
        const sn = Math.sin(s.yaw);
        return [s.x + lx * c + lz * sn, s.z - lx * sn + lz * c];
      };
      hgTieCradle(kit, s.x, s.z, s.yaw);
      const [bx, bz] = L(5.9, -0.4);
      hgFuelBowser(kit, bx, bz, s.yaw + (i % 2 ? 0.08 : -0.06), { seed: 40 + i });
      const [rx, rz] = L(-5.9, 2.4);
      hgHoseReel(kit, rx, rz, s.yaw + Math.PI / 2);
      const [lx, lz2] = L(1.3, 3.7);
      hgLadder(kit, lx, lz2, s.yaw, 3.3 + (i % 2) * 0.3);
      const [dx, dz] = L(-5.4, -3.3);
      const [cx, cz] = L(-3.5, -2.2);
      hgPowerDroid(kit, dx, dz, s.yaw + Math.PI / 2, { cableTo: [cx, cz], on: i !== 1 });
      for (const [ox, oz] of [[-3, 7.6], [3, 7.6], [-3, -7.6], [3, -7.6]]) {
        const [px, pz] = L(ox, oz);
        hgBollard(kit, px, pz, oz > 0 ? "emitAmber" : "emitRedImp");
      }
    });
    // Kestrel: painted exclusion outline around the parked freighter and the ground kit staged at the
    // ramp foot (ship local +z is the ramp direction; the ramp lands at z = 0.7 + 7). Placed directly:
    // the keep-clear list pads the ship's footprint, but these positions are known to be clear.
    {
      const rl = KESTREL.local.z1 + 0.4 + KESTREL.ramp.length; // ramp foot, ship local z
      const yawK = KESTREL.yaw;
      const at = (vx, vz, fn) => {
        const [px, pz] = kz(vx, vz);
        fn(px, pz);
      };
      const box = [kz(-9.6, -27.5), kz(9.6, -27.5), kz(9.6, rl + 3.2), kz(-9.6, rl + 3.2)];
      for (let i = 0; i < 4; i++) dashedLine(kit, box[i], box[(i + 1) % 4], { dash: 1.6, gap: 1.2, w: 0.24 });
      at(0, rl + 2.2, (px, pz) => deckDecalImp(kit, IMP_DECAL.keepClear, px, pz, 3.2, yawK + Math.PI, 0.0065));
      at(-4.6, rl + 1.6, (px, pz) => hgCrateStack(kit, px, pz, yawK + 0.25, [["b", 0, 0, 0], ["a", 0.1, 1.2, 0, 0.2], ["c", -1.5, 0, 0.2, 0.9], ["c", 1.4, 0, 0.3, 0.5]], { seed: 91 }));
      at(4.8, rl + 2.4, (px, pz) => hgCrateStack(kit, px, pz, yawK - 0.3, [["a", 0, 0, 0], ["c", 0.2, 1.0, 0.1, 0.4], ["b", 1.5, 0, 0.2, 0.1]], { seed: 92 }));
      at(-2.9, rl + 0.6, (px, pz) => hgBollard(kit, px, pz, "emitAmber"));
      at(2.9, rl + 0.6, (px, pz) => hgBollard(kit, px, pz, "emitAmber"));
      at(-3.6, rl - 4.2, (px, pz) => hgToolCart(kit, px, pz, yawK + 1.3, { seed: 93 }));
      at(4.6, 3.8, (px, pz) => hgPowerDroid(kit, px, pz, yawK - Math.PI / 2, { cableTo: kz(6.6, 1.0), on: true }));
      at(-6.2, rl - 1.8, (px, pz) => hgHoseReel(kit, px, pz, yawK + Math.PI / 2));
      at(3.4, rl - 1.4, (px, pz) => hgLadder(kit, px, pz, yawK + Math.PI / 2, 3.0));
      hgDeckCable(kit, [kz(-5.6, rl - 1.0), kz(-3.2, rl - 0.4), kz(-1.4, rl + 0.3)]);
    }
    // rim clutter along the W / E deck flanks between the coaming and the rack rows, plus a few
    // cable runs from the reels / droids toward the coaming so the rim reads as a working deck
    const rim = [
      [-38, -20, "crates", 3], [-38, -6, "cart", 1.4], [-39, 4, "reel", 0.4], [-38.5, 14, "crates", 0.2], [-38, 22, "droid", 1.2], [-38, 47, "crates", 2.9], [-39, 52, "cart", 1.9], [-24, 97, "crates", 0.3],
      [38, -20, "droid", -1.3], [38, -6, "crates", 0.1], [38.5, 4, "droid", -1.5], [38, 14, "cart", -1.2], [39, 22, "reel", -0.3], [38, 48, "cart", -1.9], [38.5, 56, "crates", 3.0], [38, 64, "droid", -1.4], [39, 72, "reel", -0.2], [38, 80, "crates", 0.2], [38.5, 88, "cart", -1.0],
    ];
    rim.forEach(([x, z, kind, yaw], i) => {
      if (kind === "crates") place(x, z, 1.8, 1.6, () => hgCrateStack(kit, x, z, yaw, i % 2 ? [["a", 0, 0, 0], ["c", 0.2, 1.0, 0.1, 0.3], ["b", 1.5, 0, 0.2, 0.1]] : [["b", 0, 0, 0], ["a", 0.2, 1.2, 0, 0.2], ["c", -1.4, 0, 0.3, 0.7]], { seed: 60 + i }));
      else if (kind === "cart") place(x, z, 0.8, 0.8, () => hgToolCart(kit, x, z, yaw, { seed: 70 + i }));
      else if (kind === "reel") place(x, z, 0.8, 0.8, () => hgHoseReel(kit, x, z, yaw));
      else if (kind === "droid") {
        const tx = x < 0 ? -34 : 34;
        place(x, z, 0.6, 0.6, () => hgPowerDroid(kit, x, z, yaw, { cableTo: [tx, z + 1.5], on: i % 3 !== 1 }));
      }
    });
    hgDeckCable(kit, [[-39.6, 5.2], [-36.5, 6.4], [-34.2, 5.8], [-33.4, 8.0]]);
    hgDeckCable(kit, [[39.6, 22.8], [36.2, 24.0], [34.0, 23.2], [33.4, 25.5]]);
    hgDeckCable(kit, [[39.6, 72.8], [36.0, 74.5], [33.6, 73.6]]);
    // bollards flanking the launch-lane entries on both flanks
    for (const side of [-1, 1]) for (const z of [LANE_Z[0] - 1.4, LANE_Z[1] + 1.4]) hgBollard(kit, side * 35.2, z, "emitAmber");
    // aft staging beside the cargo door and the lobby
    for (const [x, z] of [[-20, 104.5], [20, 104.5], [28, 105], [-52, 101], [-52, 106.5]]) {
      place(x, z, 2.0, 1.6, () => hgCrateStack(kit, x, z, rand() * 0.5, [["a", 0, 0, 0], ["a", 1.3, 0, 0, 0.2], ["b", 0.6, 1.0, 0, 0.1], ["c", 2.4, 0, 0.3, 1.0]], { seed: Math.abs(x) + z }));
    }
    place(16, 100, 1.5, 1.5, () => hgScissorLift(kit, 16, 100, 0.4, 4.0));
    place(-16, 99.5, 1.1, 0.8, () => hgDiagConsole(kit, -16, 99.5, Math.PI, { seed: 31, screens: ["scrAmber1", "scrBlue1"], cableTo: [-14, 103] }));
    place(44, 104, 1.2, 0.8, () => hgDiagConsole(kit, 44, 104, Math.PI, { seed: 33, tall: true }));
    place(48, 104, 0.5, 0.5, () => hgPowerBox(kit, 48, 104, Math.PI));

    // static gantry crane on ceiling rails spanning the bay
    hgGantryCrane(kit, 40, -106, 106, 37.2, -96, 12, 9, { beacons: amberBlink });

    // recessed cargo lift platform with hazard frame, channel lights and hydraulic corner posts
    kit.boxMM("impMetalRough", [LC.x0, -0.56, LC.z0], [LC.x1, -0.42, LC.z1], { color: PALETTE.impBlack, texel: 0.5 });
    kit.boxMM("impMetalRough", [LP.x0, -0.42, LP.z0], [LP.x1, 0, LP.z1], { color: PALETTE.impCharcoal, texel: 0.4 });
    kit.floor(LP.x0, LP.z0, LP.x1, LP.z1, 0, "lift-platform");
    kit.collider([LP.x0, -0.42, LP.z0], [LP.x1, -0.02, LP.z1], "lift-slab");
    kit.colliders[kit.colliders.length - 1].walkable = true;
    const hb = 0.7;
    kit.boxMM("chevronY", [LP.x0, 0.001, LP.z0], [LP.x1, 0.012, LP.z0 + hb], { texel: 0.6 });
    kit.boxMM("chevronY", [LP.x0, 0.001, LP.z1 - hb], [LP.x1, 0.012, LP.z1], { texel: 0.6 });
    kit.boxMM("chevronY", [LP.x0, 0.001, LP.z0 + hb], [LP.x0 + hb, 0.012, LP.z1 - hb], { texel: 0.6 });
    kit.boxMM("chevronY", [LP.x1 - hb, 0.001, LP.z0 + hb], [LP.x1, 0.012, LP.z1 - hb], { texel: 0.6 });
    kit.boxMM("chevronY", [LC.x0 - 0.6, 0.001, LC.z0 - 0.6], [LC.x1 + 0.6, 0.012, LC.z0], { texel: 0.6 });
    kit.boxMM("chevronY", [LC.x0 - 0.6, 0.001, LC.z1], [LC.x1 + 0.6, 0.012, LC.z1 + 0.6], { texel: 0.6 });
    kit.boxMM("chevronY", [LC.x0 - 0.6, 0.001, LC.z0], [LC.x0, 0.012, LC.z1], { texel: 0.6 });
    kit.boxMM("chevronY", [LC.x1, 0.001, LC.z0], [LC.x1 + 0.6, 0.012, LC.z1], { texel: 0.6 });
    kit.boxMM("emitAmber", [LP.x0 - 0.03, -0.3, LP.z0], [LP.x0, -0.2, LP.z1]);
    kit.boxMM("emitAmber", [LP.x1, -0.3, LP.z0], [LP.x1 + 0.03, -0.2, LP.z1]);
    kit.boxMM("emitAmber", [LP.x0, -0.3, LP.z0 - 0.03], [LP.x1, -0.2, LP.z0]);
    kit.boxMM("emitAmber", [LP.x0, -0.3, LP.z1], [LP.x1, -0.2, LP.z1 + 0.03]);
    deckDecalImp(kit, IMP_DECAL.keepClear, (LP.x0 + LP.x1) / 2, (LP.z0 + LP.z1) / 2, 4.5, 0, 0.0065);
    for (const [cx, cz] of [[LC.x0 - 1.1, LC.z0 - 1.1], [LC.x1 + 1.1, LC.z0 - 1.1], [LC.x0 - 1.1, LC.z1 + 1.1], [LC.x1 + 1.1, LC.z1 + 1.1]]) {
      kit.box("impTrim", cx, 1.1, cz, 0.9, 2.2, 0.9, { color: PALETTE.impBlack, texel: 1 });
      kit.box("chevronY", cx, 0.45, cz, 0.92, 0.5, 0.92, { texel: 1.5 });
      kit.cyl("impMetal", cx, 2.6, cz, 0.22, 0.8, "y", { color: PALETTE.impGrey, segments: 12 });
      kit.box("impTrim", cx, 3.15, cz, 0.6, 0.3, 0.6, { color: PALETTE.impBlack });
      amberBlink.push([cx, 3.45, cz, 0.3, 0.3, 0.3]);
      kit.collider([cx - 0.45, 0, cz - 0.45], [cx + 0.45, 3.3, cz + 0.45], "lift-post");
    }
  }

  // =====================================================================================
  // Walls
  // =====================================================================================
  const walls = roomWalls(kit, room);
  {
    // dark structural bays: charcoal plates, black ribs, no backlit galleries — the only emissives are
    // the amber lamp points at every gallery level, the sodium flood banks and dim cornice lines
    const wallOpts = {
      ribPitch: 12.5,
      plateH: 8,
      floodV: 25,
      floodAim: 30,
      accentKey,
      bigDecals: false,
      lightKey: "emitWhiteDim",
      corniceKey: "emitWhiteDim",
      lightBays: false,
      lampRows: true,
      lampKey: "emitAmber",
      lampStep: 4.2,
      floodLamp: "emitAmber",
      plateColor: PALETTE.hullTrench,
      plateAlt: PALETTE.impGreyDark,
      upperColor: PALETTE.hullTrench,
      ribAccentKey: "emitAmber",
      features: { gear: 0.22, light: 0.06, vent: 0.14, pipes: 0.14, cabinet: 0.08, stencil: 0.12 },
    };
    hgWall(walls.N.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "N"), seed: 101, tag: "hangarN", quiet: [[24, 41], [89, 106]] });
    hgWall(walls.S.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "S"), seed: 103, tag: "hangarS", quiet: [[24, 41], [89, 106]] });
    hgWall(walls.W.frame, D, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "W"), seed: 107, tag: "hangarW" });
    // flight-control booth glazing (E wall, u = lz + 110): a full-width strip (sill 16.9, head 19.2) in two
    // panes flanking the raised door. The holes match flight_control.js's W wall (u_fc = 117 - u), which
    // builds the outward-raked glass and mullions; this side builds the frame ring, sill and hood only.
    const fcWin = [
      { u0: 103.3, u1: 108.45, v0: 16.9, v1: 19.2 },
      { u0: 111.55, u1: 116.7, v0: 16.9, v1: 19.2 },
    ];
    const eOpen = hgWallOpenings(room, ctx.doors, "E");
    hgWall(walls.E.frame, D, H, { ...wallOpts, openings: [...eOpen, ...fcWin], seed: 109, tag: "hangarE", quiet: [[100, 120]] });
    const fe = walls.E.frame;
    for (const w of fcWin) {
      const cu = (w.u0 + w.u1) / 2;
      const cv = (w.v0 + w.v1) / 2;
      const ww = w.u1 - w.u0;
      const wh = w.v1 - w.v0;
      // frame ring proud of the wall (deep head so the raked glass has a soffit to lean into), sill ledge
      fe.box("impTrim", cu, w.v1 + 0.2, 0.45, ww + 0.5, 0.4, 0.9, { color: PALETTE.impBlack, texel: 1 });
      fe.box("impTrim", cu, w.v0 - 0.15, 0.25, ww + 0.5, 0.3, 0.5, { color: PALETTE.impBlack, texel: 1 });
      fe.box("impTrim", w.u0 - 0.12, cv, 0.3, 0.24, wh + 0.7, 0.6, { color: PALETTE.impBlack, texel: 1 });
      fe.box("impTrim", w.u1 + 0.12, cv, 0.3, 0.24, wh + 0.7, 0.6, { color: PALETTE.impBlack, texel: 1 });
      fe.box("impMetal", cu, w.v0 - 0.34, 0.45, ww + 0.7, 0.12, 0.9, { color: PALETTE.impGreyDark, texel: 1 });
      fe.box("emitBlueDim", cu, w.v0 - 0.29, 0.9, ww * 0.9, 0.03, 0.03);
    }
    // hood over the booth, ident glyphs, status lamps
    fe.box("impTrim", 110, 19.95, 0.75, 15.4, 0.5, 1.5, { color: PALETTE.impBlack, texel: 1 });
    fe.box("impMetal", 110, 19.62, 1.42, 15.0, 0.16, 0.16, { color: PALETTE.impCharcoal });
    fe.box("emitWhiteDim", 110, 19.62, 1.51, 14.6, 0.06, 0.02, { uv: "keep" });
    fe.decal(IMP_DECAL.glyphs3, 110, 21.2, 0.08, 3.2);
    fe.box("emitBlue", 102.6, 18.3, 0.62, 0.3, 0.3, 0.05);
    fe.box("emitRedImp", 117.4, 18.3, 0.62, 0.3, 0.3, 0.05);
    // blast-door beacon pairs (red, blinking) and door ident stencils on every big door
    const doorDeco = (frame, openings) => {
      for (const o of openings) {
        if (o.v0 > 0.5) continue;
        const big = o.u1 - o.u0 >= 6;
        for (const e of [o.u0 - (big ? 1.5 : 0.8), o.u1 + (big ? 1.5 : 0.8)]) {
          const p = frame.pos(e, o.v1 + (big ? 1.5 : 0.9), 0.62);
          frame.box("impTrim", e, o.v1 + (big ? 1.5 : 0.9), 0.32, big ? 0.7 : 0.4, big ? 0.7 : 0.4, 0.6, { color: PALETTE.impBlack, texel: 1 });
          redBlink.push([p.x, p.y, p.z, big ? 0.45 : 0.28, big ? 0.45 : 0.28, 0.1]);
        }
        if (big) {
          frame.decal(IMP_DECAL.hazard, (o.u0 + o.u1) / 2, o.v1 + 1.5, 0.08, 1.6);
          frame.box("chevronY", (o.u0 + o.u1) / 2, o.v1 + 0.35, 0.2, o.u1 - o.u0 + 2.6, 0.5, 0.4, { texel: 0.8 });
        }
      }
    };
    doorDeco(walls.N.frame, hgWallOpenings(room, ctx.doors, "N"));
    doorDeco(walls.S.frame, hgWallOpenings(room, ctx.doors, "S"));
    doorDeco(walls.W.frame, hgWallOpenings(room, ctx.doors, "W"));
    doorDeco(walls.E.frame, eOpen);
    // giant bay numbers (8 m) in the quiet upper bays
    frameHgDecal(walls.N.frame, hgNumber(1), 32.5, 20.5, 0.08, 8);
    frameHgDecal(walls.N.frame, hgNumber(2), 97.5, 20.5, 0.08, 8);
    frameHgDecal(walls.S.frame, hgNumber(3), 97.5, 20.5, 0.08, 8);
    frameHgDecal(walls.S.frame, hgNumber(4), 32.5, 20.5, 0.08, 8);
    frameHgDecal(walls.E.frame, HG_DECAL.tie, 110, 30.5, 0.08, 6);
    // fuel / coolant manifolds along the long walls at deck level, valve stations between the ribs
    const mo = { r: 0.24, step: 12.5, accentKey, bracket: 1.15 };
    hgManifold(kit, [-63.9, 100], [-63.9, -8], 4.6, mo);
    hgManifold(kit, [-63.9, -44], [-63.9, -105], 4.6, mo);
    hgManifold(kit, [63.9, -105], [63.9, -46], 4.6, mo);
    hgManifold(kit, [63.9, -10], [63.9, 105], 4.6, mo);
  }

  // =====================================================================================
  // Ceiling and lights
  // =====================================================================================
  // ceiling troughs: warm white at ≈ 30 % of the old output, louvred every metre (hgCeiling fins)
  // slab in trench grey rather than charcoal: the amber fills 13 m below it are what light the far half of
  // the spawn view, and a charcoal slab swallowed them
  hgCeiling(kit, -hx, -hz, hx, hz, H, { beamStep: 12.5, beamAxis: "x", troughsX: [-35, -20, 20, 35], ductsX: [-62.5, 62.5], lightKey: "hangar_ceilWarm", beamH: 1.4, slabColor: PALETTE.hullTrench });
  {
    // Sodium-amber deck lighting (10 lights: the hangar's budget). Three spots hang under the gantries at
    // rack height (y = 27) aimed at the berths and the parked Kestrel: the pool has three spot slots, and
    // with priority 0.9+ the hangar's own spots always win them while the player is in here (slot 0 casts
    // shadows: the W berths' fighters and ground kit throw shadows on the deck). Seven amber fills at the
    // same height along the rack service lanes cover the rims, racks and ceiling along the full 220 m.
    // The fills use a 1/d^1.5 falloff (decay 1.5): a 130 × 220 m bay lit by a handful of pooled lights
    // with inverse-square falloff is black beyond ~40 m of each one, and the pool cannot hold the thirty
    // lights the physical answer would need. `k` is the irradiance at the deck under each light.
    // Priorities are high because the pool score subtracts dist/40: in a 220 m bay a fill at the far end
    // is 4+ points down and would otherwise be evicted by any neighbour room's light.
    const amber = 0xffb45a;
    const DECAY = 1.5;
    const I = (h, k) => k * Math.pow(h, DECAY);
    const spot = (pos, target, k, extra = {}) => kit.light({ type: "spot", pos, target, color: amber, intensity: I(pos[1], k), distance: 120, decay: DECAY, angle: 0.8, penumbra: 0.5, ...extra });
    spot([-40, 27, 58], [-43, 0, 71], 5.0, { priority: 3.06, shadow: true }); // W berths (deck spots 1–2) + W rim aft
    spot([40, 27, -64], [43, 0, -79], 4.5, { priority: 3.04 }); // E berth (deck spot 3), forward
    spot([-42, 27, -56], [-22, 0, -70], 4.5, { priority: 3.02 }); // the parked Kestrel: hull, ramp and its ground kit
    const fills = [
      [-40, 27, 24],
      [-40, 27, -30],
      [-40, 27, -86],
      [40, 27, 80],
      [40, 27, 24],
      [40, 27, -34],
    ];
    fills.forEach(([x, y, z], i) => kit.light({ type: "point", pos: [x, y, z], color: amber, intensity: I(y, 4.6), distance: 170, decay: DECAY, priority: 3.0 - i * 0.01 }));
    // warm interior spill at the Kestrel's door: under the hood's soffit lamp (ship local (0, 2.85, 1.8) →
    // hangar local), physical falloff, reaching the ramp and the staged kit at its foot
    const [sx, sz] = kz(0, 1.8);
    kit.light({ type: "point", pos: [sx, ky(2.75), sz], color: 0xffc07a, intensity: lux(5.0, 1.8), distance: 18, decay: 2, priority: 2.9 });
  }

  // =====================================================================================
  // Animated beacon groups
  // =====================================================================================
  hgBeacons(kit, materials, "emitRedImp", redBlink, { period: 1.5, duty: 0.42, min: 0.15, max: 3.6 });
  hgBeacons(kit, materials, "emitAmber", amberBlink, { period: 2.1, duty: 0.5, phase: 0.3, min: 0.2, max: 3.4 });
  hgBeacons(kit, materials, "emitAmber", amberPulse, { period: 3.2, soft: true, min: 0.5, max: 3.0 });
}
