// Security / small craft designs (original, Clone Wars idiom): troop gunship with sliding side doors, starfighter
// with splitting S-foils, open-top air taxi and an enclosed police speeder. The gunship has a walkable troop bay;
// the compact craft have a functional cockpit / seat entry from the pad instead of a walkable lounge.
import { B } from '../blocks.js';
import { ShipBuilder, CH, EMIT, SEAT, CONSOLE, STEP, SH, above, below, sideXZ, sideXY, planXZ } from './builder.js';

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, CHR = B.CHROME, RED = B.PANEL_RED, GL = B.STEEL_GLASS, ENG = B.GLOW_PANEL_BLUE;
const BLK = B.PANEL_BLACK, HP = B.HULL_PLATE, HT = B.HULL_TRENCH, VENT = B.VENT, LAMP = B.GLOW_PANEL, STR = B.PANEL_STRIPE;
const PLATE = B.DECK_PLATE, HOLO = B.HOLO_SIGN, GRN = B.NEON_GREEN;

function gear(b, legs, h = 1, id = DD) {
  const p = b.part('gear', CH.GEAR, { slide: [0, h, 0] });
  for (const [x, z] of legs) for (let y = 0; y < h; y++) { p.set(x, y, z, id); p.set(b.mx(x), y, z, id); }
  return p;
}

// ------------------------------------------------------------------------------------------------ gunship
// Wide low troop bay with a bench, sliding side doors (two half panels per side run fore and aft on outside rails),
// tandem cockpit under a WEDGE nose (plan taper, chin slope and a 45 degree top slope running through the sloped
// windscreen and glass roof), the bay BULBOUS (ceiling and floor edges bevelled, plan-chamfered corners, sloped
// glass turrets), swept stub wings with pointed tip pods, a hipped roof hump and a twin-fin tail (swept fins, chrome
// leading edges, lit tips) ending in an octagonal nozzle plate.
export function gunship() {
  const b = new ShipBuilder('gunship', 21, 9, 24, { cls: 'gunship', family: 'security / troop transport', label: 'Troop gunship', primary: D, accent: RED, seam: DD, speed: 34, engineHz: 62, gain: 1.1, capacity: 10 });
  // troop bay x 6..14, floor y 0 (feet y 1), walls y 1..2, ceiling y 3; bay z 6..17
  b.fill(6, 0, 6, 14, 0, 17, DD); b.deck(7, 0, 7, 13, 16, PLATE);
  b.fill(6, 1, 6, 14, 2, 17, D); b.fill(7, 1, 7, 13, 2, 16, 0);
  b.fill(6, 3, 6, 14, 3, 17, HP);
  for (const z of [9, 13, 17]) { b.seamRing(z, D, DD); b.seamRing(z, HP, DD); }
  // bulbous bay: the ceiling and floor edges bevelled along the flanks and around the four outer end corners (the
  // nose and the tail boom carry the roof line on across the centre), the vertical corners chamfered in plan
  b.bevelTop([6, 3, 6, 14, 17], { XN: true, XP: true }); b.bevelBottom([6, 0, 6, 14, 17], { XN: true, XP: true });
  for (const z of [6, 17]) {
    const zs = z === 6 ? 'ZN' : 'ZP';
    b.sshape(6, 3, z, SH[`HIP_XN_${zs}_UP`]); b.sshape(7, 3, z, SH[`WEDGE_${zs}_UP`]);
    b.sshape(6, 0, z, SH[`HIP_XN_${zs}_DOWN`]); b.sshape(7, 0, z, SH[`WEDGE_${zs}_DOWN`]);
    for (const y of [1, 2]) b.sshape(6, y, z, SH[`VWEDGE_XN_${zs}`]);
  }
  // side doorways x 6 / x 14, y 1..2, z 8..13; panels authored OPEN (slid fore/aft on the outside, x 5 / x 15)
  b.fill(6, 1, 8, 6, 2, 13, 0); b.fill(14, 1, 8, 14, 2, 13, 0);
  const fwd = b.part('doorFwdL', CH.DOOR, { slide: [0, 0, 3] });
  fwd.fill(5, 1, 5, 5, 2, 7, D); fwd.set(5, 2, 6, GL); fwd.set(5, 1, 5, RED);
  b.mirrorPart(fwd);
  const aft = b.part('doorAftL', CH.DOOR, { slide: [0, 0, -3] });
  aft.fill(5, 1, 14, 5, 2, 16, D); aft.set(5, 2, 15, GL); aft.set(5, 1, 16, RED);
  b.mirrorPart(aft);
  const doorCells = [];
  for (let z = 8; z <= 13; z++) for (const y of [1, 2]) { doorCells.push([6, y, z], [14, y, z]); }
  // boarding step outside the port door (slab on the pad), tucks into the floor edge in flight
  const step = b.part('step', CH.GEAR, { slide: [1, 0, 0] });
  step.set(5, 0, 10, STEP); step.set(5, 0, 11, STEP);
  b.setDoor([7, 1, 10], [4, 0, 10], [-1, 0], doorCells);
  // door rails (half-height bars under the roof bevel) and bay lights
  b.sfill(5, 3, 5, 5, 3, 16, DD, undefined, SH.SLAB_BOTTOM);
  for (const z of [8, 11, 14]) { b.lamp(8, 3, z); b.lamp(12, 3, z); }
  // central bench (seats facing both doors), weapon racks, a comm console
  for (let z = 9; z <= 15; z++) { if (z !== 12) { b.seat(9, 1, z); b.seat(11, 1, z); } else { b.set(9, 1, z, CONSOLE); b.set(11, 1, z, HOLO); } b.set(10, 1, z, z % 2 ? BLK : DD); }   // z 8 = cross aisle
  b.set(7, 1, 16, CONSOLE); b.set(13, 1, 16, VENT); b.set(8, 1, 7, VENT); b.set(12, 1, 7, VENT);
  b.interior(7, 1, 7, 14, 3, 17); b.interior(9, 1, 2, 12, 3, 6);
  // nose / cockpit x 8..12, z 0..5: a solid block carved by the top slope (z 0, y 1) -> (z 3, y 4) (the windscreen
  // z 1 and the glass roof z 2 ride it), the chin (z 0, y 0.75) -> (z 2, y 0) and the plan taper (z 0, x 9) ->
  // (z 2, x 8) mirrored; pilot + gunner tandem inside, side windows, a sensor tip and bevelled chin guns
  b.fill(8, 0, 0, 12, 0, 5, DD); b.fill(8, 1, 0, 12, 3, 5, D); b.fill(9, 1, 2, 11, 2, 5, 0);
  b.fill(9, 1, 1, 11, 2, 1, GL); b.fill(8, 3, 2, 12, 3, 5, DD); b.fill(9, 3, 2, 11, 3, 4, GL); b.fill(9, 1, 0, 11, 1, 0, DD);
  b.cut([8, 1, 0, 12, 3, 5], above(0, 1, 3, 4));
  b.cut([8, 0, 0, 12, 0, 1], below(0, 0.75, 2, 0));
  b.scut([8, 0, 0, 8, 3, 2], sideXZ(0, 9, 2, 8, false));
  b.paint(10, 1, 0, HOLO); b.sset(8, 1, 0, CHR, undefined, SH.VWEDGE_XN_ZN);
  // pilot forward on the centre line, gunner offset aft to starboard; the port side stays a free aisle from the bay
  b.fill(9, 1, 2, 11, 1, 2, CONSOLE); b.seat(10, 1, 3); b.set(11, 1, 4, CONSOLE); b.seat(11, 1, 5); b.set(10, 2, 2, HOLO);
  b.fill(9, 1, 6, 11, 2, 6, 0);                                                     // bulkhead opening into the bay
  b.setCockpit([10, 1, 3], [10, 1, 2], [10, 1, 1]);
  b.set(8, 2, 3, GL); b.set(12, 2, 3, GL); b.sset(8, 3, 4, VENT); b.sset(8, 3, 5, HT);
  // sloped glass turrets on the bay's outer corners
  b.sset(5, 3, 6, GL, undefined, SH.HIP_XN_ZN_UP); b.sset(5, 3, 17, GL, undefined, SH.HIP_XN_ZP_UP);
  // stub wings (y 4): the outer plates cut to swept trapezoids (leading edge root (x 6, z 9) -> tip (x 1, z 11.5),
  // chrome along the cut), red stripe; the hipped housing on the root and the ridge-roofed hump above it
  b.fill(1, 4, 9, 19, 4, 12, D); b.fill(1, 4, 10, 19, 4, 10, RED);
  b.scut([1, 4, 9, 5, 4, 12], planXZ(6, 9, 1, 11.5, [3, 12]));
  b.paintClipped([1, 4, 9, 5, 4, 12], CHR); b.paintClipped([15, 4, 9, 19, 4, 12], CHR);
  b.fill(6, 5, 9, 14, 5, 12, DD); b.bevelTop([6, 5, 9, 14, 12]);
  for (const x of [3, 5, 15, 17]) b.set(x, 5, 12, VENT);
  b.fill(7, 6, 10, 13, 6, 11, HP); b.bevelTop([7, 6, 10, 13, 11]); b.shape(10, 6, 10, SH.CUBE); b.set(10, 7, 10, CHR); b.set(10, 8, 10, LAMP);
  // tip pods x 0 / x 20, y 3..5, z 8..14: pointed noses (top slope (z 8, y 4) -> (z 9, y 6), chin (z 8, y 4) ->
  // (z 9, y 3)), tapered tails around the engine, trench flanks, stripes, nav lights on top
  for (const x of [0, 20]) { b.fill(x, 3, 8, x, 5, 14, DD); b.set(x, 4, 8, CHR); b.fill(x, 3, 9, x, 3, 13, HT); b.set(x, 5, 10, STR); b.set(x, 5, 11, STR); b.set(x, 5, 13, RED); b.set(x, 4, 14, ENG, EMIT.ENGINE); }
  b.scut([0, 3, 8, 0, 5, 9], above(8, 4, 9, 6)); b.scut([0, 3, 8, 0, 3, 9], below(8, 4, 9, 3));
  b.scut([0, 5, 14, 0, 5, 14], above(15, 4, 14, 6)); b.scut([0, 3, 14, 0, 3, 14], below(15, 4, 14, 3));
  b.nav(0, 5, 11, RED); b.nav(20, 5, 11, GRN);
  // roof greebles: pipes, vents, antennae
  for (const z of [7, 14, 16]) { b.sset(7, 4, z, VENT); b.set(10, 4, z, HT); }
  b.set(10, 4, 15, CHR); b.set(10, 5, 15, CHR);
  // tail boom x 8..12, y 1..3, z 18..22 on a chamfered floor: roof edges bevelled ahead of the fins; twin fins x 8 /
  // x 12, y 4..6, z 20..22 cut to a swept profile (leading edge (z 19, y 4) -> (z 22, y 7), trailing edge raked
  // (z 23.5, y 4) -> (z 22, y 7)) with chrome edges and lit tips; the nozzle plate z 23 an octagonal cone
  b.fill(8, 0, 18, 12, 0, 22, DD); b.fill(8, 1, 18, 12, 3, 22, D); b.fill(9, 2, 19, 11, 2, 21, DD);
  b.bevelBottom([8, 0, 18, 12, 22], { XN: true, XP: true, ZP: true }); b.bevelTop([8, 3, 18, 12, 19], { XN: true, XP: true });
  for (const x of [8, 12]) { b.fill(x, 4, 20, x, 6, 22, D); b.set(x, 4, 20, DD); b.cut([x, 4, 20, x, 6, 22], above(19, 4, 22, 7)); b.cut([x, 4, 20, x, 6, 22], above(23.5, 4, 22, 7)); b.paintClipped([x, 4, 20, x, 6, 22], CHR); }
  b.paint(8, 6, 22, RED, EMIT.NAV); b.paint(12, 6, 22, GRN, EMIT.NAV);
  b.fill(9, 4, 22, 11, 4, 22, HP, undefined, SH.RIDGE_X); b.set(10, 3, 19, VENT); b.set(10, 3, 21, HT);
  b.fill(8, 1, 23, 12, 3, 23, CHR);
  for (const [x, y] of [[9, 1], [9, 2], [11, 1], [11, 2], [10, 2], [8, 2], [12, 2]]) b.engine(x, y, 23);
  b.set(10, 1, 23, VENT); b.set(10, 3, 23, VENT);
  b.bevelTop([8, 3, 23, 12, 23], { XN: true, XP: true, ZP: true }); b.bevelBottom([8, 1, 23, 12, 23], { XN: true, XP: true, ZP: true });
  b.sshape(8, 2, 23, SH.VWEDGE_XN_ZP);
  // landing lights under the nose and skids under nose and tail
  b.slandingLight(9, 0, 2); b.set(10, 0, 19, LAMP, EMIT.LANDING);
  gear(b, [[9, 3], [9, 20]], 1);
  b.spot(3, 0, 10); b.spot(17, 0, 10); b.spot(10, 0, 0);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ starfighter
// A wedge: the fuselage tapers in plan and elevation to a sharp nose (26 degree top slope running into the sloped
// windscreen, chin and plan tapers), hexagonal spine and belly, a rear-sliding canopy between sloped glass sides,
// twin engine nacelles with pointed intakes and bevelled outer edges, and split S-foils cut to swept trapezoids with
// knife-edged tips (upper foil swings up, lower foil swings down in flight; closed flat when landed). Compact: climb
// the port foil to the cockpit well.
export function starfighter() {
  const b = new ShipBuilder('starfighter', 17, 6, 16, { cls: 'starfighter', family: 'starfighter', label: 'Starfighter', primary: D, accent: RED, seam: DD, speed: 44, engineHz: 110, gain: 0.7, compact: true, capacity: 1 });
  // fuselage x 7..9, y 1..3 (spine behind the cockpit y 1..2); the nose block z 0..1 is carved by the planes below
  b.fill(7, 1, 0, 9, 3, 7, D); b.fill(7, 1, 8, 9, 2, 15, D); b.fill(7, 1, 0, 9, 2, 1, DD);
  b.fill(7, 1, 2, 9, 1, 15, DD);
  for (let z = 3; z <= 15; z += 3) b.set(8, 1, z, HT);                              // belly trench line
  for (const z of [4, 10, 13]) { b.seamRing(z, D, DD); }
  // cockpit well (8, 2, 6) with the seat behind it, console in front, instrument lamps, glass sides and windscreen
  b.set(8, 2, 6, 0); b.seat(8, 2, 7); b.set(8, 2, 5, CONSOLE); b.set(8, 3, 5, GL); b.set(8, 3, 4, GL);
  b.lamp(7, 2, 5); b.lamp(9, 2, 5);
  b.set(7, 3, 6, GL); b.set(9, 3, 6, GL); b.set(7, 3, 7, GL); b.set(9, 3, 7, GL); b.set(8, 3, 6, 0); b.set(8, 3, 7, 0);
  b.setCockpit([8, 2, 7], [8, 2, 5], [8, 3, 5]);
  b.interior(8, 2, 6, 9, 4, 8);                                                     // the well + seat (carry volume)
  // the wedge: top slope (z 0, y 1.5) -> (z 5, y 4) through the windscreen, chin (z 0, y 1.4) -> (z 3, y 1), plan
  // taper (z 0, x 8.3) -> (z 4, x 7) mirrored; the canopy sides slope up to the canopy rail
  b.cut([7, 1, 0, 9, 3, 4], above(0, 1.5, 5, 4));
  b.cut([7, 1, 0, 9, 1, 2], below(0, 1.4, 3, 1));
  b.scut([7, 1, 0, 8, 3, 4], sideXZ(0, 8.3, 4, 7, false));
  b.paint(8, 1, 0, CHR); b.spaint(7, 3, 3, DD); b.spaint(7, 2, 1, HT);
  for (const z of [5, 6, 7]) b.sshape(7, 3, z, SH.WEDGE_XN_UP);
  // hexagonal spine and belly: the roof and belly edges bevelled along the fuselage, the tail tapered in plan
  b.bevelTop([7, 2, 8, 9, 15], { XN: true, XP: true }); b.bevelBottom([7, 1, 2, 9, 15], { XN: true, XP: true });
  b.scut([7, 1, 13, 7, 2, 15], sideXZ(13, 7, 16, 7.75, false));
  // canopy: authored OPEN (slid back over the spine), slides forward 3 to close over the well
  const canopy = b.part('canopy', CH.DOOR, { slide: [0, 0, -3] });
  canopy.set(8, 3, 9, GL); canopy.set(8, 3, 10, GL); canopy.set(8, 4, 9, CHR, 0, SH.RIDGE_X);
  b.setDoor([8, 2, 6], [3, 0, 6], [-1, 0], [[8, 3, 6], [8, 3, 7]]);
  // spine greebles, tail fin with the beacon as its sloped tip
  for (const z of [11, 13]) b.set(8, 3, z, z === 11 ? HT : VENT); b.set(8, 3, 15, CHR); b.set(8, 4, 15, RED, EMIT.NAV, SH.WEDGE_ZN_UP);
  // engine nacelles x 5..6 / 10..11, y 1..2, z 9..14: pointed chrome intakes (top and bottom wedges, hips at the
  // outer corner), the outer top and bottom edges bevelled, blue exhausts aft, greebles on the flat inner top
  b.sfill(5, 1, 9, 6, 2, 14, DD); b.sset(5, 2, 9, CHR); b.sset(6, 2, 9, CHR); b.sset(5, 1, 9, CHR); b.sset(6, 1, 9, CHR); b.sset(5, 1, 12, VENT);
  b.sfill(5, 1, 15, 6, 2, 15, CHR); b.sengine(5, 1, 15); b.sengine(6, 2, 15); b.sengine(6, 1, 15); b.sengine(5, 2, 15);
  b.bevelTop([5, 2, 9, 6, 14], { XN: true, ZN: true }); b.bevelBottom([5, 1, 9, 6, 14], { XN: true, ZN: true });
  b.bevelTop([10, 2, 9, 11, 14], { XP: true, ZN: true }); b.bevelBottom([10, 1, 9, 11, 14], { XP: true, ZN: true });
  b.sset(6, 3, 11, HT); b.sset(6, 3, 12, HT); b.sset(6, 3, 10, VENT);
  // S-foils: lower foil y 1 (x 1..4), upper foil y 2 (x 1..4), z 8..12, closed flat when landed; each plate is cut
  // to a swept trapezoid (leading edge root (x 5, z 8) -> tip (x 1, z 10), trailing edge raked forward toward the
  // tip), knife-edged tips, wingtip cannons forward of the lower foil
  const lower = b.part('foilLowL', CH.CLASS, { pivot: [5, 1, 0], axis: [0, 0, 1], angle: 0.42 });
  const upper = b.part('foilHighL', CH.CLASS, { pivot: [5, 3, 0], axis: [0, 0, 1], angle: -0.42 });
  for (let x = 1; x <= 4; x++) for (let z = 8; z <= 12; z++) {
    const edge = x === 1 || z === 8 || z === 12;
    lower.set(x, 1, z, edge ? DD : (z === 10 ? RED : D));
    upper.set(x, 2, z, edge ? DD : (z === 10 ? RED : D));
  }
  for (const foil of [lower, upper]) {
    foil.cut(planXZ(5, 8, 1, 10, [3, 12])); foil.cut(planXZ(5, 13, 1, 12, [3, 9]));
    foil.paintClipped(DD);
    for (const z of [10, 11]) if (foil.get(1, foil === lower ? 1 : 2, z) && !foil.shapeAt(1, foil === lower ? 1 : 2, z)) foil.set(1, foil === lower ? 1 : 2, z, DD, 0, SH.KNIFE_XN);
  }
  for (let z = 6; z <= 9; z++) lower.set(1, 1, z, CHR); upper.set(4, 2, 12, VENT, 0, upper.shapeAt(4, 2, 12));
  lower.set(1, 1, 10, RED, EMIT.NAV, SH.KNIFE_XN);
  const lowerR = b.mirrorPart(lower); b.mirrorPart(upper);
  for (const c of lowerR.cells) if (c[4] === EMIT.NAV) c[3] = GRN;
  // boarding ladder on the port side ahead of the swept foil (two steps up to the closed foils) -> along the foil
  // top -> cockpit well; in flight it tucks into the fuselage (slid half a block past the skin, no shared faces)
  b.sfill(6, 1, 6, 6, 2, 8, DD); b.sset(6, 2, 7, HT);
  const ladder = b.part('ladder', CH.GEAR, { slide: [4.5, 1, 0] });
  ladder.set(3, 0, 7, DD); ladder.set(4, 0, 7, DD); ladder.set(4, 1, 7, DD);
  b.slandingLight(7, 1, 1);
  gear(b, [[6, 4], [6, 12]], 1); b.parts[b.parts.length - 1].set(8, 0, 3, DD);
  b.spot(3, 0, 12); b.spot(13, 0, 12); b.spot(8, 0, 0);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ air taxi
// Open-top repulsor taxi: a low tub with a driver's dash, four passenger seats, running boards that fold in, twin
// rear pods and a holo taxi sign on the roll bar. Compact: step onto the running board and into the tub. Sculpted
// low and sloped: a wedge nose (top slope + plan chamfer) over a chamfered chin, the windscreen a 45 degree pane,
// the tub's rim and belly edges bevelled, pointed pods and a cowl sloping down to the tail.
export function taxi() {
  const b = new ShipBuilder('taxi', 7, 5, 12, { cls: 'taxi', family: 'local taxi / courier', label: 'Air taxi', primary: D, accent: STR, seam: DD, speed: 40, engineHz: 118, gain: 0.5, compact: true, capacity: 5 });
  // belly y 0 (x 1..5, z 1..10), tub walls y 1, well x 2..4 z 3..7 (feet y 1)
  b.fill(1, 0, 1, 5, 0, 10, DD); b.fill(2, 0, 3, 4, 0, 7, PLATE);
  b.fill(1, 1, 1, 5, 1, 10, D); b.fill(2, 1, 3, 4, 1, 7, 0);
  b.sset(1, 1, 5, 0);                                                              // door cut-outs in the tub walls
  b.sset(1, 1, 3, STR); b.sset(1, 1, 7, STR); b.sset(1, 1, 9, DD); b.set(3, 1, 1, CHR); b.set(2, 1, 1, CHR); b.set(4, 1, 1, CHR);
  b.fill(2, 1, 0, 4, 1, 0, DD); b.set(3, 1, 0, LAMP, EMIT.LANDING); b.fill(2, 0, 0, 4, 0, 0, DD, undefined, SH.WEDGE_ZN_DOWN);
  b.cut([2, 1, 0, 4, 1, 0], above(0, 1, 1, 2)); b.scut([2, 1, 0, 2, 1, 0], planXZ(2, 1, 3, 0, [3, 1]));
  b.bevelBottom([1, 0, 1, 5, 10], { XN: true, XP: true, ZP: true }); b.sshape(1, 0, 1, SH.HIP_XN_ZN_DOWN); b.shape(3, 0, 10, SH.CUBE);
  b.bevelTop([1, 1, 1, 5, 7], { XN: true, XP: true }); b.sshape(1, 1, 1, SH.HIP_XN_ZN_UP);
  // dash + seats
  b.set(2, 1, 3, CONSOLE); b.set(4, 1, 3, HOLO); b.seat(3, 1, 3); b.fill(2, 2, 2, 4, 2, 2, GL, undefined, SH.WEDGE_ZN_UP); b.set(3, 2, 3, 0);
  b.seat(2, 1, 6); b.seat(4, 1, 6); b.seat(2, 1, 7); b.seat(4, 1, 7);
  b.setCockpit([3, 1, 3], [2, 1, 3], [2, 2, 2]);
  b.interior(2, 1, 3, 5, 3, 8);
  // rear cowl with vents sloping down to the tail, roll bar with the taxi sign, a lamp under the bar lights the tub
  b.fill(1, 2, 8, 5, 2, 10, DD); b.set(3, 2, 9, VENT); b.set(2, 2, 10, HT); b.set(4, 2, 10, HT);
  b.bevelTop([1, 2, 9, 5, 10], { ZP: true });
  b.set(1, 2, 8, CHR); b.set(5, 2, 8, CHR); b.fill(1, 3, 8, 5, 3, 8, CHR); b.set(3, 3, 8, HOLO); b.set(3, 4, 8, LAMP);
  b.set(2, 3, 8, LAMP); b.set(4, 3, 8, LAMP); b.sshape(1, 3, 8, SH.WEDGE_XN_UP);
  // side pods x 0 / x 6, z 6..10: pointed noses, bevelled outer edges, the engines aft, nav lights forward
  b.sfill(0, 1, 6, 0, 2, 10, DD); b.sset(0, 2, 7, HT); b.sset(0, 2, 9, VENT); b.sset(0, 1, 6, CHR);
  b.sengine(0, 1, 10); b.engine(3, 1, 11); b.set(3, 0, 11, CHR, undefined, SH.WEDGE_ZP_DOWN);
  b.bevelTop([0, 2, 6, 0, 10], { XN: true, ZN: true, ZP: true }); b.bevelBottom([0, 1, 6, 0, 9], { XN: true, ZN: true });
  b.bevelTop([6, 2, 6, 6, 10], { XP: true, ZN: true, ZP: true }); b.bevelBottom([6, 1, 6, 6, 9], { XP: true, ZN: true });
  b.navPair(0, 2, 6); b.sshape(0, 2, 6, SH.HIP_XN_ZN_UP);
  // running boards (half steps) beside the door cut-outs, fold in under the tub in flight
  const boards = b.part('boardL', CH.GEAR, { slide: [1, 0, 0] });
  boards.set(0, 0, 4, STEP); boards.set(0, 0, 5, STEP);
  b.mirrorPart(boards);
  b.setDoor([1, 1, 5], [0, 0, 3], [-1, 0], []);
  b.spot(0, 0, 8); b.spot(6, 0, 2);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ police speeder
// Enclosed two-seat patrol speeder: white hull with a red stripe, a rear-sliding canopy, a roof light bar, twin
// side pods with engines and a tall sensor fin. Compact: canopy open when landed, step in from the pad.
// Sculpted low and sloped: one 34 degree line from the nose tip through the windscreen up to the canopy, the canopy a
// hipped glass shell, the belly chamfered, pointed pods, a light bar spanning the deck on posts (the canopy slides
// under it) and a lit fin on the tail.
export function policeSpeeder() {
  const b = new ShipBuilder('police', 7, 6, 14, { cls: 'police', family: 'police speeder', label: 'Police speeder', primary: D, accent: RED, seam: DD, speed: 46, engineHz: 124, gain: 0.55, compact: true, capacity: 2 });
  b.fill(1, 0, 1, 5, 0, 12, DD); b.fill(2, 0, 3, 4, 0, 7, PLATE); for (const z of [1, 2, 9, 10, 11, 12]) b.set(3, 0, z, HT);
  b.fill(1, 1, 1, 5, 1, 12, D); b.fill(2, 1, 3, 4, 1, 7, 0);
  b.fill(2, 1, 0, 4, 1, 0, DD); b.set(3, 1, 0, LAMP, EMIT.LANDING); b.fill(2, 2, 1, 4, 2, 1, D);
  for (const z of [4, 8, 11]) b.seamRing(z, D, DD);
  b.sset(1, 1, 5, RED); b.sset(1, 1, 6, RED); b.sset(1, 1, 9, RED); b.sset(1, 1, 2, CHR);
  // cockpit: driver + partner seats, consoles, glass sides; the canopy roof is a sliding part
  b.set(2, 1, 3, CONSOLE); b.set(4, 1, 3, CONSOLE); b.set(3, 1, 3, HOLO); b.seat(2, 1, 5); b.seat(4, 1, 5);
  b.set(1, 2, 3, GL); b.set(5, 2, 3, GL); b.fill(1, 2, 4, 1, 2, 7, GL); b.fill(5, 2, 4, 5, 2, 7, GL); b.fill(2, 2, 2, 4, 2, 2, GL);
  b.setCockpit([2, 1, 5], [2, 1, 3], [1, 2, 3]);
  b.sset(1, 1, 5, 0); b.sset(1, 2, 5, 0);                                          // side door cut-outs (2 tall)
  // the nose line (z 0, y 1) -> (z 3, y 3): the tip, the bonnet shoulder and the windscreen are cells of one slope;
  // the tip is chamfered in plan, the belly edges are chamfered, the front corners cut
  b.cut([2, 1, 0, 4, 2, 2], above(0, 1, 3, 3)); b.scut([2, 1, 0, 2, 1, 0], planXZ(2, 1, 3, 0, [3, 1]));
  b.bevelBottom([1, 0, 1, 5, 12], { XN: true, XP: true, ZN: true, ZP: true }); b.shape(3, 0, 12, SH.CUBE);
  b.sshape(1, 1, 1, SH.VWEDGE_XN_ZN);
  const canopy = b.part('canopy', CH.DOOR, { slide: [0, 0, -5] });
  for (let z = 8; z <= 12; z++) {
    const zs = z === 8 ? 'ZN' : z === 12 ? 'ZP' : null;
    canopy.set(2, 3, z, GL, 0, zs ? SH[`HIP_XN_${zs}_UP`] : SH.WEDGE_XN_UP); canopy.set(4, 3, z, GL, 0, zs ? SH[`HIP_XP_${zs}_UP`] : SH.WEDGE_XP_UP);
    canopy.set(3, 3, z, zs ? CHR : GL, 0, zs ? SH[`WEDGE_${zs}_UP`] : 0);
  }
  b.setDoor([2, 1, 4], [0, 0, 6], [-1, 0], [[1, 1, 5], [1, 2, 5], [5, 1, 5], [5, 2, 5]]);
  b.interior(2, 1, 3, 5, 3, 8);
  // rear deck (outer edges bevelled), light bar on chrome posts spanning the deck, lit tail fin, twin pods
  b.fill(1, 2, 8, 5, 2, 12, DD); b.set(3, 2, 10, VENT); b.set(2, 2, 12, HT); b.set(4, 2, 12, HT);
  b.bevelTop([1, 2, 8, 5, 12], { XN: true, XP: true, ZP: true });
  b.set(1, 3, 8, CHR); b.set(5, 3, 8, CHR); b.fill(1, 4, 8, 5, 4, 8, CHR); b.set(2, 4, 8, RED, EMIT.NAV); b.set(4, 4, 8, ENG, EMIT.NAV); b.set(3, 4, 8, LAMP);
  b.set(1, 4, 8, CHR, undefined, SH.WEDGE_XN_UP); b.set(5, 4, 8, CHR, undefined, SH.WEDGE_XP_UP);
  b.set(3, 2, 13, VENT); b.set(3, 3, 13, DD); b.set(3, 4, 13, RED, EMIT.NAV, SH.WEDGE_ZP_UP);
  b.sfill(0, 1, 7, 0, 2, 12, DD); b.sset(0, 2, 8, HT); b.sset(0, 2, 10, VENT); b.sset(0, 1, 7, CHR);
  b.sengine(0, 1, 12); b.sengine(0, 2, 12); b.engine(3, 1, 13); b.set(3, 0, 13, CHR, undefined, SH.WEDGE_ZP_DOWN);
  b.bevelTop([0, 2, 7, 0, 11], { XN: true, ZN: true }); b.bevelBottom([0, 1, 7, 0, 11], { XN: true, ZN: true });
  b.bevelTop([6, 2, 7, 6, 11], { XP: true, ZN: true }); b.bevelBottom([6, 1, 7, 6, 11], { XP: true, ZN: true });
  b.navPair(0, 2, 7); b.sshape(0, 2, 7, SH.HIP_XN_ZN_UP);
  const boards = b.part('boardL', CH.GEAR, { slide: [1, 0, 0] });
  boards.set(0, 0, 4, STEP); boards.set(0, 0, 5, STEP);
  b.mirrorPart(boards);
  b.spot(0, 0, 10); b.spot(6, 0, 2);
  return b.build();
}
