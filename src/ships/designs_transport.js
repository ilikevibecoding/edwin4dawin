// Transport designs (original, Clone Wars idiom): light freighter, passenger shuttle, bulk freighter, diplomatic
// cruiser, air bus. Every one has a walkable interior inside the exterior envelope, a boarding ramp/door reachable
// from the pad, a glass cockpit with seats + console, emissive engines, nav lights and animated parts.
import { B } from '../blocks.js';
import { ShipBuilder, CH, EMIT, SEAT, BUNK, CONSOLE, STEP, SH, above, below, sideXZ, sideXY, planXZ } from './builder.js';

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, CHR = B.CHROME, RED = B.PANEL_RED, GL = B.STEEL_GLASS, ENG = B.GLOW_PANEL_BLUE;
const BLK = B.PANEL_BLACK, HP = B.HULL_PLATE, HT = B.HULL_TRENCH, VENT = B.VENT, LAMP = B.GLOW_PANEL, STR = B.PANEL_STRIPE;
const PLATE = B.DECK_PLATE, HOLO = B.HOLO_SIGN, WIN = B.WINDOW_LIT, CRATE = B.CRATE, BARREL = B.BARREL;

// alternating greeble strip along z (vents / trench pipes / chrome), mirrored
function sgreebles(b, x, y, z0, z1, ids, phase = 0) {
  for (let z = z0; z <= z1; z++) b.sset(x, y, z, ids[(z + phase) % ids.length]);
}
// landing gear legs: mirrored pairs at (x, z), `h` cells tall from y 0, retracting straight up into the hull
function gear(b, legs, h = 1, id = DD) {
  const p = b.part('gear', CH.GEAR, { slide: [0, h, 0] });
  for (const [x, z] of legs) for (let y = 0; y < h; y++) { p.set(x, y, z, id); p.set(b.mx(x), y, z, id); }
  return p;
}
function seatRow(b, xs, y, z) { for (const x of xs) b.seat(x, y, z); }

// ------------------------------------------------------------------------------------------------ light freighter
// Wedge-and-saucer freighter with a starboard cockpit tube, a raised cargo hump, twin flank pods, a dorsal turret
// bubble and a wide engine bank aft. Port-side boarding ramp. Sculpted as a flat cargo body with chamfered corners:
// bevelled roof and belly edges, saucer pods tapering to a knife-edged rim, wedge mandibles, a sloped cockpit tube
// nose, a hipped cargo hump and a truncated-cone engine bank.
export function lightFreighter() {
  const b = new ShipBuilder('light_freighter', 15, 9, 24, { cls: 'freighter', family: 'light freighter', label: 'Light freighter', primary: D, accent: RED, seam: DD, speed: 26, engineHz: 78, gain: 1.0, asym: true, capacity: 6 });
  // belly + floor (y 1), walls (y 2..4), roof (y 5)
  b.fill(3, 1, 3, 11, 1, 21, DD); b.deck(4, 1, 4, 10, 20, PLATE);
  b.fill(3, 2, 3, 11, 4, 21, D); b.fill(4, 2, 4, 10, 4, 20, 0);                    // cabin volume x 4..10, z 4..20
  b.fill(3, 5, 3, 11, 5, 21, HP);
  // saucer flanks: pods hugging the walls (y 2..4) from z 6 to 18, sloping top and bottom out to a knife-edged rim
  // (x 1) that carries the red markings; the pod ends are hipped and plan-chamfered
  b.sfill(2, 2, 6, 2, 4, 18, D); b.sfill(1, 3, 8, 1, 3, 16, DD, undefined, SH.KNIFE_XN); b.sfill(2, 2, 6, 2, 2, 18, DD);
  for (const z of [7, 9, 11, 13, 15, 17]) b.sset(2, 3, z, z % 4 === 1 ? VENT : HT);
  b.spaint(1, 3, 9, RED); b.spaint(1, 3, 10, RED); b.spaint(1, 3, 14, RED); b.spaint(1, 3, 15, RED);
  b.bevelTop([2, 4, 6, 2, 18], { XN: true, ZN: true, ZP: true }); b.bevelBottom([2, 2, 6, 2, 18], { XN: true, ZN: true, ZP: true });
  b.bevelTop([12, 4, 6, 12, 18], { XP: true, ZN: true, ZP: true }); b.bevelBottom([12, 2, 6, 12, 18], { XP: true, ZN: true, ZP: true });
  b.sshape(2, 3, 6, SH.VWEDGE_XN_ZN); b.sshape(2, 3, 18, SH.VWEDGE_XN_ZP);
  // wedge nose: mandibles either side of a sensor notch, each carved by the top slope (z 0, y 2) -> (z 2, y 4), a
  // chin wedge and a plan chamfer of the tip
  b.sfill(4, 2, 0, 5, 3, 2, D); b.sfill(4, 1, 1, 5, 1, 2, DD); b.sset(4, 4, 1, DD); b.sset(5, 4, 2, DD);
  b.sset(4, 2, 0, DD); b.set(7, 2, 2, HOLO); b.set(7, 3, 2, VENT); b.set(6, 3, 2, GL); b.set(8, 3, 2, GL);
  b.scut([4, 2, 0, 5, 4, 2], above(0, 2, 2, 4));
  b.scut([4, 1, 0, 4, 4, 0], planXZ(4, 1, 5, 0, [5, 1]));
  b.sshape(4, 1, 1, SH.WEDGE_ZN_DOWN); b.sshape(5, 1, 1, SH.WEDGE_ZN_DOWN);
  // seams every 4 along the walls and roof
  for (const z of [6, 10, 14, 18]) { b.seamRing(z, D, DD); b.seamRing(z, HP, DD); }
  // the body's roof edges bevelled (the starboard edge only aft of the cockpit tube, whose roof continues the
  // body's), the belly edges chamfered (the nose row between the mandibles)
  b.bevelTop([3, 5, 3, 11, 21], { XN: true, ZN: true }); b.bevelTop([3, 5, 10, 11, 21], { XP: true });
  b.bevelBottom([3, 1, 3, 11, 21], { XN: true }); b.bevelBottom([3, 1, 10, 11, 21], { XP: true }); b.bevelBottom([3, 1, 3, 11, 3], { ZN: true });
  b.shape(3, 1, 3, SH.HIP_XN_ZN_DOWN); for (const x of [4, 5]) b.sshape(x, 1, 3, SH.CUBE);
  // the port pod frames the doorway with hipped ends
  b.shape(2, 4, 9, SH.HIP_XN_ZP_UP); b.shape(2, 4, 12, SH.HIP_XN_ZN_UP); b.shape(2, 2, 9, SH.HIP_XN_ZP_DOWN); b.shape(2, 2, 12, SH.HIP_XN_ZN_DOWN);
  // roof greebles: hipped cargo hump with red chamfers, vents, pipes, a glass turret ridge
  b.fill(5, 6, 8, 9, 6, 15, D); b.fill(5, 6, 8, 5, 6, 15, RED); b.fill(9, 6, 8, 9, 6, 15, RED); b.bevelTop([5, 6, 8, 9, 15]);
  b.fill(6, 7, 10, 8, 7, 13, DD); b.bevelTop([6, 7, 10, 8, 13]); b.set(7, 8, 11, GL, undefined, SH.WEDGE_ZN_UP); b.set(7, 8, 12, GL, undefined, SH.WEDGE_ZP_UP);
  b.fill(6, 6, 9, 6, 6, 14, HT); b.fill(8, 6, 9, 8, 6, 14, HT);
  for (const z of [5, 17, 19]) { b.sset(4, 6, z, VENT); b.sset(6, 6, z, CHR); }
  b.set(7, 6, 5, CHR); b.set(7, 7, 5, CHR); b.set(7, 8, 5, LAMP);                     // sensor mast
  b.sset(4, 6, 12, CHR); b.sset(4, 6, 13, CHR);
  // starboard cockpit tube (x 12..14, z 1..9): dark tube, wrap-around glass, pilot + co-pilot seats, consoles; the
  // nose slopes (z 1, y 3) -> (z 4, y 6) through the windscreen and the glass roof, chin wedge, outer edges bevelled,
  // the front outer corner chamfered in plan
  b.fill(12, 1, 1, 14, 5, 9, DD); b.fill(12, 2, 3, 13, 4, 8, 0);
  b.fill(12, 2, 1, 13, 4, 2, GL); b.fill(14, 3, 3, 14, 4, 6, GL); b.fill(12, 5, 3, 13, 5, 5, GL); b.set(14, 5, 2, CHR);
  b.set(12, 2, 3, CONSOLE); b.set(13, 2, 3, CONSOLE); b.seat(12, 2, 4); b.seat(13, 2, 4);
  b.set(13, 5, 7, LAMP);
  b.fill(11, 2, 5, 11, 3, 7, 0);                                                    // opening into the cabin (feet y 2)
  b.setCockpit([13, 2, 4], [13, 2, 3], [13, 3, 2]);
  b.set(12, 1, 1, CHR); b.set(13, 1, 1, CHR); b.set(14, 2, 1, RED);
  b.cut([12, 1, 1, 14, 5, 3], above(1, 3, 4, 6));
  b.cut([12, 1, 1, 14, 1, 1], below(1, 2, 2, 1));
  b.cut([14, 1, 1, 14, 5, 1], planXZ(14, 1, 15, 2, [14, 2]));
  b.bevelTop([12, 5, 4, 14, 9], { XP: true, ZP: true }); b.bevelBottom([12, 1, 2, 14, 9], { XP: true, ZP: true });
  // cabin: lounge seats, holo table, bunks aft, crates forward, ceiling lamps every 3
  b.set(5, 2, 5, CRATE); b.set(6, 2, 5, CRATE); b.set(9, 2, 5, BARREL); b.set(5, 3, 5, CRATE);
  b.set(7, 2, 9, CONSOLE); seatRow(b, [6, 8], 2, 9); b.seat(7, 2, 10);
  b.set(4, 2, 12, CONSOLE); b.set(4, 2, 13, CONSOLE); b.seat(5, 2, 12);
  b.set(10, 2, 17, BUNK); b.set(10, 2, 18, SEAT); b.set(4, 2, 17, BUNK); b.set(4, 2, 18, SEAT);
  b.set(7, 2, 19, CONSOLE); b.set(6, 2, 19, VENT); b.set(8, 2, 19, VENT);
  for (const z of [5, 8, 11, 14, 17, 20]) b.lamp(7, 5, z);
  for (const z of [7, 13, 19]) { b.lamp(4, 5, z); b.lamp(10, 5, z); }
  b.interior(4, 2, 4, 11, 4, 21); b.interior(11, 2, 3, 14, 4, 9);
  // port door (x 3 wall, y 2..4, z 10..11) with a three-column ramp of half steps; the ramp bay cuts through the
  // port flank pod (x 1..2), so the pod frames the doorway
  b.fill(3, 2, 10, 3, 4, 11, 0); b.fill(1, 2, 10, 2, 4, 11, 0);
  b.ramp('ramp', 2, 10, [-1, 0], 2, 2, [0, 1], DD);
  b.setDoor([4, 2, 10], [0, 0, 12], [-1, 0], [[3, 2, 10], [3, 3, 10], [3, 4, 10], [3, 2, 11], [3, 3, 11], [3, 4, 11]]);
  b.set(3, 5, 10, LAMP, EMIT.LAMP, SH.WEDGE_XN_UP); b.set(3, 5, 11, LAMP, EMIT.LAMP, SH.WEDGE_XN_UP);
  // engine bank aft: dark housing (top and belly rings bevelled, aft vertical edges chamfered), a chrome nozzle ring
  // whose rim is bevelled all round (a truncated cone), seven blue cores
  b.fill(3, 1, 22, 11, 5, 22, DD); b.fill(4, 2, 23, 10, 4, 23, CHR); b.sset(3, 3, 23, VENT, undefined, SH.VWEDGE_XN_ZP);
  for (const x of [4, 5, 6, 7, 8, 9, 10]) b.engine(x, 3, 23);
  b.engine(7, 2, 23); b.engine(7, 4, 23);
  b.set(6, 5, 22, VENT); b.set(8, 5, 22, VENT);
  b.bevelTop([3, 5, 22, 11, 22], { XN: true, XP: true, ZP: true }); b.bevelBottom([3, 1, 22, 11, 22], { XN: true, XP: true, ZP: true });
  for (const y of [2, 3, 4]) b.sshape(3, y, 22, SH.VWEDGE_XN_ZP);
  b.bevelTop([4, 4, 23, 10, 23], { XN: true, XP: true, ZP: true }); b.bevelBottom([4, 2, 23, 10, 23], { XN: true, XP: true, ZP: true });
  b.sshape(4, 3, 23, SH.VWEDGE_XN_ZP);
  // nav lights on the flank pod rims, landing lights under the nose mandibles
  b.navPair(1, 3, 12); b.sshape(1, 3, 12, SH.KNIFE_XN);
  b.slandingLight(4, 1, 1); b.sshape(4, 1, 1, SH.WEDGE_ZN_DOWN); b.set(7, 1, 4, LAMP, EMIT.LANDING);
  // gear: three legs (nose + two aft), 1 tall
  gear(b, [[5, 3], [5, 19]], 1); b.parts[b.parts.length - 1].set(7, 0, 3, DD);
  b.spot(0, 0, 6); b.spot(14, 0, 12); b.spot(7, 0, 24 - 1);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ passenger shuttle
// Tri-wing shuttle: a tall narrow fuselage with a WEDGE nose (plan taper + 45 degree top slope + chin) carrying the
// sloped wrap-around canopy, a swept dorsal fin with a chrome leading edge and a lit ridge tip, two big swept wings
// that fold UP for landing (authored folded; the flight pose swings them out and down), a bevelled engine deck and
// the rear boarding ramp between the engines.
export function shuttle() {
  const b = new ShipBuilder('shuttle', 17, 14, 26, { cls: 'shuttle', family: 'passenger shuttle', label: 'Passenger shuttle', primary: D, accent: RED, seam: DD, speed: 30, engineHz: 96, gain: 0.8, capacity: 8 });
  // fuselage x 6..10, belly y 1, walls y 2..4, roof y 5; cabin x 7..9, feet y 2, z 3..20
  b.fill(6, 1, 2, 10, 1, 21, DD); b.fill(7, 1, 3, 9, 1, 20, PLATE);
  b.fill(6, 2, 2, 10, 4, 21, D); b.fill(7, 2, 3, 9, 4, 20, 0);
  b.fill(6, 5, 2, 10, 5, 21, HP); b.fill(7, 5, 4, 9, 5, 19, D);
  for (const z of [7, 11, 15, 19]) { b.seamRing(z, D, DD); b.seamRing(z, HP, DD); }
  // roof edges bevelled along the cabin (a hexagonal fuselage section), belly edges chamfered
  b.bevelTop([6, 5, 4, 10, 21], { XN: true, XP: true }); b.bevelBottom([6, 1, 3, 10, 21], { XN: true, XP: true });
  // wedge nose: a solid block z 0..1 plus the front wall z 2 and the roof over the cockpit, carved by three planes:
  // the top slope (z 0, y 2) -> (z 4, y 6), the chin (z 0, y 1.6) -> (z 2, y 1) and the plan taper (z 0, x 7.75) ->
  // (z 3.5, x 6) mirrored; the canopy glass rides the top slope (windscreen band z 2, sloped panes z 1 and z 3)
  b.fill(6, 1, 0, 10, 5, 1, DD); b.fill(6, 2, 2, 10, 2, 2, DD);
  b.fill(6, 3, 2, 10, 4, 2, GL); b.fill(7, 3, 1, 9, 3, 1, GL); b.fill(7, 5, 2, 9, 5, 3, GL);
  b.cut([6, 1, 0, 10, 5, 3], above(0, 2, 4, 6));
  b.cut([6, 1, 0, 10, 1, 1], below(0, 1.6, 2, 1));
  b.scut([6, 1, 0, 7, 5, 3], sideXZ(0, 7.75, 3.5, 6, false));
  b.paint(8, 2, 0, CHR); b.spaint(7, 1, 0, HT);                                       // sensor tip, chin trenches
  b.set(7, 2, 3, CONSOLE); b.set(9, 2, 3, CONSOLE); b.set(8, 2, 3, HOLO); b.seat(7, 2, 4); b.seat(9, 2, 4);
  b.setCockpit([7, 2, 4], [7, 2, 3], [7, 3, 2]);
  // cabin windows (lit at night), seats along both walls, aisle in the middle, lamps
  for (const z of [6, 9, 12, 15, 18]) b.sset(6, 3, z, WIN);
  for (const z of [7, 10, 13, 16]) { b.seat(7, 2, z); b.seat(9, 2, z); }
  b.set(7, 2, 19, CONSOLE); b.set(9, 2, 19, CONSOLE);
  for (const z of [5, 8, 11, 14, 17, 20]) b.lamp(8, 5, z);
  b.interior(7, 2, 3, 10, 4, 21);
  // dorsal fin: a solid blade cut by the leading edge (root z 8, y 6 -> tip z 19, y 14), chrome along the cut edge,
  // ridge-shaped top with the beacon as a lit ridge, red band
  b.fill(8, 6, 8, 8, 13, 20, D);
  b.cut([8, 6, 8, 8, 13, 20], above(8, 6, 19, 14));
  b.paintClipped([8, 6, 8, 8, 13, 20], CHR);
  for (const y of [7, 9, 11]) b.set(8, y, 20, DD);
  b.set(8, 13, 19, D, undefined, SH.RIDGE_Z); b.set(8, 13, 20, LAMP, EMIT.LAMP, SH.RIDGE_Z);
  b.set(8, 8, 14, RED); b.set(8, 8, 15, RED); b.set(8, 10, 19, VENT); b.set(8, 11, 20, HT);
  // roof greebles between fin and canopy
  b.sset(7, 6, 5, VENT); b.sset(7, 6, 7, CHR); b.set(8, 6, 6, HT); b.set(8, 6, 7, HT);
  // wings: authored folded UP beside the fuselage (x 5 / x 11, y 5..12), pivot at the wing root, swing out 105 deg;
  // the plate is cut to a swept trapezoid (leading edge root (z 5, y 7) -> tip (z 9, y 13), trailing edge raked
  // forward toward the tip), chrome on the cut edges, a knife-edged (ridge) tip carrying the nav light
  const wing = b.part('wingL', CH.CLASS, { pivot: [6, 5, 0], axis: [0, 0, 1], angle: -1.85 });
  for (let z = 5; z <= 20; z++) for (let y = 5; y <= 12; y++) wing.set(5, y, z, (y === 8 || y === 9) && z % 4 === 1 ? DD : (y === 6 && z >= 8 && z <= 17) ? RED : D);
  wing.cut(above(5, 7, 9, 13)); wing.cut(above(21, 9, 17, 13));
  wing.paintClipped(CHR);
  for (let z = 5; z <= 20; z++) if (wing.get(5, 12, z) && !wing.shapeAt(5, 12, z)) wing.set(5, 12, z, CHR, 0, SH.RIDGE_Z);
  wing.set(5, 9, 12, RED); wing.set(5, 9, 13, RED); wing.set(5, 12, 12, RED, EMIT.NAV, SH.RIDGE_Z); wing.set(5, 12, 13, RED, EMIT.NAV, SH.RIDGE_Z);
  const wingR = b.mirrorPart(wing);
  for (const c of wingR.cells) if (c[4] === EMIT.NAV) c[3] = B.NEON_GREEN;
  // wing root fairings on the hull
  b.sfill(5, 3, 8, 5, 4, 17, DD); b.sset(5, 4, 12, VENT); b.sset(5, 3, 10, HT); b.sset(5, 3, 15, HT);
  b.sshape(5, 4, 8, SH.HIP_XN_ZN_UP); b.sshape(5, 4, 17, SH.HIP_XN_ZP_UP); b.sshape(5, 3, 8, SH.HIP_XN_ZN_DOWN); b.sshape(5, 3, 17, SH.HIP_XN_ZP_DOWN);
  // rear ramp bay + engines: the aft wall opening (x 7..9, y 2..4, z 21) leads onto a ramp of half steps running
  // aft (z 22..24) between two side walls (x 6 / x 10) under the engine deck (y 5..7); the raised ramp stands in
  // the bay. Nozzles: the outer pair in the wall ends, the centre pair on the deck, all facing aft. The deck's cap
  // row is a ridge (roof slopes fore and aft) with hips at its ends; the side walls' outer bottom edges are chamfered.
  b.fill(7, 2, 21, 9, 4, 21, 0);
  b.fill(6, 1, 22, 6, 4, 23, DD); b.fill(10, 1, 22, 10, 4, 23, DD);
  b.fill(6, 5, 22, 10, 7, 23, DD); b.fill(7, 5, 23, 9, 7, 23, CHR); b.fill(6, 8, 22, 10, 8, 22, HP);
  b.engine(6, 3, 23); b.engine(10, 3, 23); b.engine(8, 6, 23); b.engine(8, 7, 23); b.engine(7, 6, 23); b.engine(9, 6, 23);
  b.set(6, 2, 23, CHR); b.set(10, 2, 23, CHR); b.set(6, 4, 23, VENT); b.set(10, 4, 23, VENT); b.set(7, 5, 23, VENT); b.set(9, 5, 23, VENT);
  b.sset(6, 6, 22, HT); b.sset(6, 7, 22, VENT); b.set(8, 8, 22, LAMP);
  b.cut([6, 8, 22, 10, 8, 22], above(22, 8.5, 23, 9.5)); b.cut([6, 8, 22, 10, 8, 22], above(23, 8.5, 22, 9.5));
  b.scut([6, 8, 22, 6, 8, 22], sideXY(8, 6, 9, 7, false));
  b.sshape(6, 1, 22, SH.WEDGE_XN_DOWN); b.sshape(6, 1, 23, SH.HIP_XN_ZP_DOWN);
  b.ramp('ramp', 7, 22, [0, 1], 2, 3, [1, 0], DD);
  b.setDoor([8, 2, 20], [8, 0, 25], [0, 1], [[7, 2, 21], [8, 2, 21], [9, 2, 21], [7, 3, 21], [8, 3, 21], [9, 3, 21], [7, 4, 21], [8, 4, 21], [9, 4, 21]]);
  b.set(8, 5, 21, LAMP, EMIT.LAMP);
  // lights: nav on the fin sides, landing lights under the nose
  b.set(7, 8, 16, RED, EMIT.NAV); b.set(9, 8, 16, B.NEON_GREEN, EMIT.NAV);
  b.slandingLight(7, 1, 2);
  gear(b, [[7, 5], [7, 18]], 1); b.parts[b.parts.length - 1].set(8, 0, 2, DD);
  b.spot(4, 0, 10); b.spot(12, 0, 10); b.spot(8, 0, 0);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ bulk freighter
// Long boxy hauler: wedge nose with the bridge, a tall cargo hull with container bays, a crew superstructure aft
// and four huge engines. Port-side cargo door with a ramp; hold with crate stacks, a workshop and a bunk room.
// Sculpted as a flat cargo body with chamfered corners: an octagonal hull section (roof and belly edges bevelled),
// the bridge a 45 degree wedge running up onto the hull roof with a sloped windscreen and a chamfered tip, the
// superstructure hipped and plan-chamfered, the engine block a truncated cone with bevelled radiator bulges.
export function bulkFreighter() {
  const b = new ShipBuilder('bulk_freighter', 15, 12, 38, { cls: 'hauler', family: 'bulk freight', label: 'Bulk freighter', primary: DD, accent: STR, seam: BLK, speed: 20, engineHz: 66, gain: 1.2, capacity: 6 });
  // hull x 3..11, y 1..7, z 4..31 (belly 1, walls 2..6, roof 7); hold x 4..10, feet y 2, z 5..30
  b.fill(3, 1, 4, 11, 1, 31, BLK); b.deck(4, 1, 5, 10, 30, PLATE, BLK);
  b.fill(3, 2, 4, 11, 6, 31, DD); b.fill(4, 2, 5, 10, 6, 30, 0);
  b.fill(3, 7, 4, 11, 7, 31, HP);
  for (let z = 8; z <= 28; z += 4) { b.seamRing(z, DD, BLK); b.seamRing(z, HP, BLK); }
  // container bays: recessed stripe panels with rib frames along both flanks, vents on the roof
  for (let z = 6; z <= 29; z++) {
    const bay = ((z - 6) % 8) < 6;
    for (let y = 3; y <= 5; y++) if (bay) b.sset(3, y, z, y === 4 ? STR : D);
    if (!bay) b.sset(3, 4, z, HT);
  }
  for (let z = 6; z <= 29; z += 3) { b.sset(5, 8, z, VENT); b.set(7, 8, z + 1, HT); }
  b.fill(7, 8, 6, 7, 8, 29, HT); b.sset(4, 8, 12, CHR); b.sset(4, 8, 24, CHR);
  // octagonal hull: roof and belly edges bevelled along the flanks, the front wall's top row sloping down onto the
  // bridge roof (one 45 degree line from the nose tip to the hull roof), the front vertical edges chamfered
  b.bevelTop([3, 7, 4, 11, 31], { XN: true, XP: true, ZN: true }); b.bevelBottom([3, 1, 4, 11, 31], { XN: true, XP: true });
  for (let y = 2; y <= 6; y++) b.sshape(3, y, 4, SH.VWEDGE_XN_ZN); b.sshape(3, 1, 4, SH.HIP_XN_ZN_DOWN);
  // wedge nose with the bridge: lower prow x 4..10 z 0..3 carved by the top slope (z 0, y 3) -> (z 3, y 6) (the
  // windscreen band rides it), a chin under the tip and the belly, plan-chamfered tip and corners; glass band,
  // pilot seats + consoles, sensor mast on the hull roof behind the slope
  b.fill(4, 1, 1, 10, 1, 3, BLK); b.fill(4, 2, 1, 10, 5, 3, DD); b.fill(5, 2, 2, 9, 4, 3, 0); b.fill(4, 6, 2, 10, 6, 3, HP);
  b.fill(5, 3, 1, 9, 4, 1, GL); b.fill(4, 3, 2, 4, 4, 2, GL); b.fill(10, 3, 2, 10, 4, 2, GL); b.fill(5, 2, 0, 9, 2, 0, DD); b.set(7, 3, 0, HOLO);
  b.cut([4, 1, 0, 10, 6, 3], above(0, 3, 3, 6));
  b.cut([5, 2, 0, 9, 2, 0], below(0, 2.5, 1, 2));
  b.bevelBottom([4, 1, 1, 10, 3], { XN: true, XP: true, ZN: true });
  b.scut([4, 1, 1, 4, 6, 1], planXZ(4, 2, 5, 1, [5, 2])); b.scut([5, 2, 0, 5, 3, 0], planXZ(5, 1, 6, 0, [6, 1]));
  b.set(5, 2, 2, CONSOLE); b.set(9, 2, 2, CONSOLE); b.set(7, 2, 2, CONSOLE); b.seat(5, 2, 3); b.seat(9, 2, 3); b.seat(7, 2, 3);
  b.fill(4, 2, 4, 10, 4, 4, 0);                                                     // bridge opens into the hold
  b.set(3, 4, 4, DD, undefined, SH.VWEDGE_XN_ZN); b.set(11, 4, 4, DD, undefined, SH.VWEDGE_XP_ZN);
  b.setCockpit([7, 2, 3], [7, 2, 2], [7, 3, 1]);
  b.sset(4, 5, 3, CHR); b.set(7, 8, 5, CHR); b.set(7, 9, 5, RED, EMIT.NAV);
  // hold: crate stacks along the flanks, service machinery, bunk room aft, lamps every 3
  for (const z of [7, 8, 12, 13, 17, 18]) { b.set(4, 2, z, CRATE); b.set(10, 2, z, CRATE); if (z % 2) { b.set(4, 3, z, CRATE); b.set(10, 3, z, CRATE); } }
  b.set(4, 2, 22, CONSOLE); b.set(4, 2, 23, VENT); b.set(4, 3, 23, ENG); b.set(10, 2, 22, BARREL); b.set(10, 2, 23, BARREL); b.set(10, 3, 22, BARREL);
  b.set(7, 2, 15, CONSOLE); b.set(7, 2, 14, HOLO);
  for (const z of [26, 28]) { b.set(4, 2, z, BUNK); b.set(5, 2, z, SEAT); b.set(10, 2, z, BUNK); b.set(9, 2, z, SEAT); }
  b.set(7, 2, 30, CONSOLE); b.seat(6, 2, 30); b.seat(8, 2, 30);
  for (let z = 6; z <= 30; z += 3) { b.lamp(7, 7, z); b.lamp(5, 7, z + 1); b.lamp(9, 7, z + 1); }
  b.interior(4, 2, 5, 11, 7, 31); b.interior(5, 2, 2, 10, 5, 5);
  // port cargo door (x 3, y 2..4, z 14..15) with a three-column ramp
  b.fill(3, 2, 14, 3, 4, 15, 0);
  b.ramp('ramp', 2, 14, [-1, 0], 2, 2, [0, 1], DD);
  b.setDoor([4, 2, 14], [0, 0, 16], [-1, 0], [[3, 2, 14], [3, 3, 14], [3, 4, 14], [3, 2, 15], [3, 3, 15], [3, 4, 15]]);
  b.set(3, 5, 14, LAMP, EMIT.LAMP); b.set(3, 5, 15, LAMP, EMIT.LAMP); b.set(3, 5, 13, STR); b.set(3, 5, 16, STR);
  // crew superstructure aft on the roof (x 5..9, y 8..10, z 24..30) with lit windows, a hipped roof and chamfered
  // corners
  b.fill(5, 8, 24, 9, 10, 30, DD); b.fill(6, 8, 25, 8, 9, 29, 0); b.fill(5, 11, 24, 9, 11, 30, HP);
  for (const z of [25, 27, 29]) b.sset(5, 9, z, WIN); b.fill(6, 9, 24, 8, 9, 24, WIN);
  b.set(7, 8, 25, CONSOLE); b.seat(7, 8, 26); b.set(6, 8, 28, BUNK); b.set(6, 8, 29, SEAT); b.set(8, 8, 28, BUNK); b.set(8, 8, 29, SEAT);
  b.set(7, 10, 27, LAMP);
  b.bevelTop([5, 11, 24, 9, 30]); b.chamferCorners([5, 8, 24, 9, 10, 30]);
  b.set(7, 12 - 1, 26, CHR); b.sset(6, 11, 30, RED, EMIT.NAV, SH.WEDGE_ZP_UP);
  // engine block: wide dark housing z 32..36 (a truncated cone: the top ring bevelled and stepping up onto a hipped
  // roof, the belly ring chamfered, the radiator bulges x 1 / x 13 bevelled top and bottom with chamfered ends), the
  // chrome nozzle plate z 37 bevelled all round, four 2x2 nozzles plus the centre cluster
  b.fill(2, 1, 32, 12, 7, 36, DD); b.fill(1, 3, 33, 13, 6, 35, DD); b.fill(3, 8, 32, 11, 8, 35, HP);
  for (const z of [33, 35]) { b.seamRing(z, DD, BLK); }
  b.fill(2, 2, 37, 12, 6, 37, CHR);
  for (const [x, y] of [[3, 3], [4, 3], [3, 4], [4, 4], [10, 3], [11, 3], [10, 4], [11, 4], [6, 5], [8, 5], [6, 2], [8, 2], [7, 3]]) b.engine(x, y, 37);
  b.sset(2, 7, 33, VENT); b.sset(2, 7, 35, VENT); b.set(7, 8, 33, HT); b.set(7, 8, 34, HT);
  b.bevelTop([2, 7, 32, 12, 36], { XN: true, XP: true, ZP: true }); b.bevelTop([3, 8, 32, 11, 35]);
  b.bevelBottom([2, 1, 32, 12, 36], { XN: true, XP: true, ZP: true }); b.sshape(2, 1, 32, SH.HIP_XN_ZN_DOWN);
  for (const y of [2, 3, 4, 5, 6]) { b.sshape(2, y, 32, SH.VWEDGE_XN_ZN); b.sshape(2, y, 36, SH.VWEDGE_XN_ZP); }
  b.bevelTop([1, 6, 33, 1, 35], { XN: true, ZN: true, ZP: true }); b.bevelBottom([1, 3, 33, 1, 35], { XN: true, ZN: true, ZP: true });
  b.bevelTop([13, 6, 33, 13, 35], { XP: true, ZN: true, ZP: true }); b.bevelBottom([13, 3, 33, 13, 35], { XP: true, ZN: true, ZP: true });
  for (const y of [4, 5]) { b.sshape(1, y, 33, SH.VWEDGE_XN_ZN); b.sshape(1, y, 35, SH.VWEDGE_XN_ZP); }
  b.bevelTop([2, 6, 37, 12, 37], { XN: true, XP: true, ZP: true }); b.bevelBottom([2, 2, 37, 12, 37], { XN: true, XP: true, ZP: true });
  for (const y of [3, 4, 5]) b.sshape(2, y, 37, SH.VWEDGE_XN_ZP);
  // nav lights at the hull corners, landing lights under the nose and tail
  b.navPair(3, 7, 10); b.sshape(3, 7, 10, SH.WEDGE_XN_UP); b.navPair(1, 6, 34); b.sshape(1, 6, 34, SH.WEDGE_XN_UP);
  b.slandingLight(5, 1, 2); b.slandingLight(4, 1, 30);
  gear(b, [[4, 6], [4, 28], [10 - 3, 17]], 1);
  b.spot(1, 0, 8); b.spot(13, 0, 20); b.spot(1, 0, 30); b.spot(7, 0, 0);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ diplomatic cruiser
// Red-hulled Republic cruiser idiom, sculpted as a tapered cigar: a hammerhead prow with plan-chamfered corners
// (the bridge glass wraps the chamfer), bevelled roof and belly edges and a roof that slopes down onto the spine, a
// hexagonal-section spine with a hipped dorsal ridge, and an engine block stepped down like a truncated cone with
// bevelled radiators. Port-side airlock with a ramp; interior: bridge, corridor, salon, bunk cabin.
export function cruiser() {
  const b = new ShipBuilder('cruiser', 15, 11, 40, { cls: 'yacht', family: 'diplomatic transport', label: 'Republic cruiser', primary: RED, accent: D, seam: DD, speed: 32, engineHz: 84, gain: 1.0, capacity: 8 });
  // hammerhead prow x 2..12, y 1..7, z 0..8 (bridge deck feet y 2)
  b.fill(2, 1, 1, 12, 1, 8, DD); b.deck(3, 1, 2, 11, 7, PLATE);
  b.fill(2, 2, 1, 12, 6, 8, RED); b.fill(3, 2, 2, 11, 5, 7, 0); b.fill(2, 7, 1, 12, 7, 8, D);
  b.fill(3, 2, 0, 11, 6, 0, DD); b.fill(4, 3, 0, 10, 4, 0, GL); b.set(7, 5, 0, GL);
  b.fill(2, 3, 2, 2, 4, 4, GL); b.fill(12, 3, 2, 12, 4, 4, GL);
  b.sset(2, 7, 1, CHR); b.sset(3, 7, 8, VENT); b.set(7, 7, 2, CHR); b.set(7, 8, 2, CHR); b.set(7, 9, 2, LAMP);
  b.sset(2, 2, 3, HT); b.sset(2, 2, 6, HT); b.sset(2, 5, 5, D); b.sset(2, 5, 6, D);
  b.set(4, 2, 1, CONSOLE); b.set(6, 2, 1, CONSOLE); b.set(8, 2, 1, CONSOLE); b.set(10, 2, 1, CONSOLE);
  b.seat(4, 2, 2); b.seat(6, 2, 2); b.seat(8, 2, 2); b.seat(10, 2, 2); b.set(7, 2, 4, HOLO); b.set(7, 3, 4, HOLO);
  b.setCockpit([6, 2, 2], [6, 2, 1], [6, 3, 0]);
  for (const z of [3, 6]) { b.lamp(5, 7, z); b.lamp(9, 7, z); }
  // prow sculpt: roof edges bevelled all round (the aft edge slopes down onto the spine roof), belly edges
  // chamfered, the front corners cut 45 degrees in plan (x + z >= 5), the aft vertical edges chamfered
  b.bevelTop([2, 7, 1, 12, 8]); b.bevelBottom([2, 1, 1, 12, 8]);
  b.scut([2, 1, 0, 4, 7, 2], planXZ(2, 3, 5, 0, [7, 5]));
  for (let y = 2; y <= 6; y++) b.sshape(2, y, 8, SH.VWEDGE_XN_ZP);
  // spine x 4..10, y 1..6, z 9..32 (belly 1, walls 2..5, roof 6); corridor/salon x 5..9, feet y 2
  b.fill(4, 1, 9, 10, 1, 32, DD); b.deck(5, 1, 9, 9, 32, PLATE);
  b.fill(4, 2, 9, 10, 5, 32, RED); b.fill(5, 2, 9, 9, 5, 32, 0); b.fill(4, 6, 9, 10, 6, 32, D);
  b.fill(3, 2, 8, 11, 5, 8, RED); b.fill(5, 2, 8, 9, 5, 8, 0);                    // prow / spine bulkhead with a wide opening
  for (let z = 12; z <= 30; z += 4) { b.seamRing(z, RED, DD); b.seamRing(z, D, DD); }
  for (let z = 10; z <= 31; z += 2) b.sset(4, 3, z, z % 4 === 0 ? WIN : (z % 8 === 2 ? VENT : RED));
  for (let z = 11; z <= 31; z += 3) b.sset(4, 5, z, HT);
  for (let z = 9; z <= 32; z += 2) b.sset(4, 2, z, HT);                                                // lower trench line
  // hexagonal spine section: roof and belly edges bevelled (the belly stays square under the airlock sill)
  b.bevelTop([4, 6, 9, 10, 32], { XN: true, XP: true });
  b.bevelBottom([4, 1, 9, 10, 32], { XP: true }); b.bevelBottom([4, 1, 9, 10, 15], { XN: true }); b.bevelBottom([4, 1, 18, 10, 32], { XN: true });
  for (let z = 34; z <= 37; z++) b.sset(1, z % 2 ? 4 : 5, z, VENT);                                    // engine block radiators
  for (let z = 10; z <= 31; z += 3) { b.set(7, 7, z, HT); b.sset(5, 7, z + 1, VENT); }
  b.fill(6, 7, 14, 8, 7, 26, D); b.bevelTop([6, 7, 14, 8, 26]); b.set(7, 8, 20, CHR); b.set(7, 9, 20, RED, EMIT.NAV, SH.RIDGE_Z);   // hipped dorsal spine
  // salon (z 14..22): facing seats around holo tables; bunk cabin aft (z 25..31)
  for (const z of [15, 18, 21]) { b.seat(5, 2, z); b.seat(9, 2, z); b.set(5, 2, z + 1, CONSOLE); b.set(9, 2, z + 1, CONSOLE); }
  b.set(7, 2, 18, HOLO); b.set(7, 2, 12, CONSOLE);
  for (const z of [26, 29]) { b.set(5, 2, z, BUNK); b.set(5, 2, z + 1, SEAT); b.set(9, 2, z, BUNK); b.set(9, 2, z + 1, SEAT); }
  b.set(7, 2, 32 - 1, CONSOLE); b.set(6, 2, 31, VENT); b.set(8, 2, 31, VENT);
  for (let z = 10; z <= 31; z += 3) b.lamp(7, 6, z);
  b.interior(3, 2, 1, 12, 6, 9); b.interior(5, 2, 8, 10, 6, 32);
  // port airlock (x 4, y 2..4, z 16..17) + ramp
  b.fill(4, 2, 16, 4, 4, 17, 0);
  b.ramp('ramp', 3, 16, [-1, 0], 2, 2, [0, 1], DD);
  b.setDoor([6, 2, 16], [1, 0, 18], [-1, 0], [[4, 2, 16], [4, 3, 16], [4, 4, 16], [4, 2, 17], [4, 3, 17], [4, 4, 17]]);
  b.set(4, 5, 16, LAMP, EMIT.LAMP); b.set(4, 5, 17, LAMP, EMIT.LAMP);
  // engine section z 33..39: wide dark housing, three chrome shrouds, blue cores, radiator fins; sculpted as a
  // truncated cone: the housing's top ring and cap ring bevelled, its belly ring chamfered, the front and aft
  // vertical edges cut 45 degrees in plan, the radiator layers bevelled top and bottom with hips at their ends
  b.fill(2, 1, 33, 12, 7, 38, DD); b.fill(1, 3, 34, 13, 6, 37, DD); b.fill(3, 8, 34, 11, 8, 37, D);
  for (const z of [35, 37]) b.seamRing(z, DD, BLK);
  for (let z = 34; z <= 37; z++) b.sset(1, z % 2 ? 4 : 5, z, VENT);                                    // radiators
  b.fill(2, 2, 39, 12, 6, 39, CHR);
  for (const [x, y] of [[3, 3], [3, 4], [4, 3], [4, 4], [10, 3], [10, 4], [11, 3], [11, 4], [7, 3], [7, 4], [6, 3], [8, 3], [6, 4], [8, 4], [7, 5], [7, 2]]) b.engine(x, y, 39);
  b.sset(1, 7, 35, D, undefined, SH.WEDGE_XN_UP); b.sset(1, 7, 36, D, undefined, SH.WEDGE_XN_UP); b.sset(2, 6, 38, RED); b.set(7, 9, 35, CHR); b.set(7, 9, 36, VENT);
  b.bevelTop([2, 7, 33, 12, 38]); b.bevelBottom([2, 1, 33, 12, 38], { XN: true, XP: true, ZP: true }); b.bevelTop([3, 8, 34, 11, 37]);
  for (let y = 2; y <= 6; y++) { b.sshape(2, y, 33, SH.VWEDGE_XN_ZN); b.sshape(2, y, 38, SH.VWEDGE_XN_ZP); b.sshape(2, y, 39, SH.VWEDGE_XN_ZP); }
  for (let z = 34; z <= 37; z++) b.sshape(1, 3, z, z === 34 ? SH.HIP_XN_ZN_DOWN : z === 37 ? SH.HIP_XN_ZP_DOWN : SH.WEDGE_XN_DOWN);
  b.sshape(1, 6, 34, SH.HIP_XN_ZN_UP); b.sshape(1, 6, 37, SH.HIP_XN_ZP_UP);
  for (const y of [4, 5]) { b.sshape(1, y, 34, SH.VWEDGE_XN_ZN); b.sshape(1, y, 37, SH.VWEDGE_XN_ZP); }
  b.navPair(1, 6, 35); b.navPair(2, 5, 4);
  b.slandingLight(4, 1, 1); b.slandingLight(5, 1, 31);
  gear(b, [[4, 4], [5, 14], [5, 30]], 1);
  b.spot(0, 0, 5); b.spot(14, 0, 20); b.spot(0, 0, 36); b.spot(7, 0, 0);
  return b.build();
}

// ------------------------------------------------------------------------------------------------ air bus
// Long low box with big lit windows, a low floor (kneeling repulsor bus), two sliding doors on the port side,
// rows of seats, a driver's cab with a wrap-around windscreen and twin engines aft. Sculpted as a rounded box with
// sloped ends: octagonal section (roof and belly edges bevelled), the nose one 45 degree line from the chin over the
// bonnet, the raked windscreen and the roof edge, the tail wall bevelled and chamfered around the engines.
export function airBus() {
  const b = new ShipBuilder('air_bus', 11, 7, 22, { cls: 'bus', family: 'local transit', label: 'Air bus', primary: D, accent: STR, seam: DD, speed: 24, engineHz: 72, gain: 0.8, capacity: 14 });
  // body x 1..9, floor y 0 (feet y 1), walls y 1..2, roof y 3
  b.fill(1, 0, 1, 9, 0, 20, DD); b.deck(2, 0, 1, 8, 20, PLATE);
  b.fill(1, 1, 1, 9, 2, 20, D); b.fill(2, 1, 2, 8, 2, 19, 0);
  b.fill(1, 3, 1, 9, 3, 20, HP);
  for (let z = 4; z <= 20; z += 4) { b.seamRing(z, D, DD); b.seamRing(z, HP, DD); }
  for (let z = 3; z <= 19; z++) { if (z % 4 !== 0) b.sset(1, 2, z, WIN); b.sset(1, 1, z, z % 4 === 0 ? DD : STR); }   // livery stripe
  b.bevelTop([1, 3, 2, 9, 20], { XN: true, XP: true }); b.bevelBottom([1, 0, 1, 9, 20], { XN: true, XP: true });
  // nose cab: chin wedge and bonnet wedge at z 0, the raked windscreen (glass wedges) at z 1 under the roof's front
  // slope at z 2, corners hipped and chamfered; driver seat + console
  b.fill(2, 0, 0, 8, 0, 0, DD, undefined, SH.WEDGE_ZN_DOWN); b.fill(2, 1, 0, 8, 1, 0, DD, undefined, SH.WEDGE_ZN_UP);
  b.sshape(2, 0, 0, SH.HIP_XN_ZN_DOWN); b.sshape(2, 1, 0, SH.HIP_XN_ZN_UP);
  b.fill(2, 2, 1, 8, 2, 1, GL, undefined, SH.WEDGE_ZN_UP); b.sset(1, 2, 1, GL, undefined, SH.HIP_XN_ZN_UP); b.sset(1, 1, 1, DD, undefined, SH.VWEDGE_XN_ZN); b.sshape(1, 0, 1, SH.HIP_XN_ZN_DOWN);
  b.fill(1, 3, 1, 9, 3, 1, 0); b.fill(2, 3, 2, 8, 3, 2, HP, undefined, SH.WEDGE_ZN_UP); b.sshape(1, 3, 2, SH.HIP_XN_ZN_UP);
  b.set(5, 1, 1, CONSOLE); b.seat(5, 1, 2); b.set(4, 1, 1, HOLO); b.set(6, 1, 1, HOLO);
  b.setCockpit([5, 1, 2], [5, 1, 1], [5, 2, 1]);
  // seats in pairs along both walls with a centre aisle x 4..6 (none beside the doors), poles, ceiling lamps
  for (const z of [3, 8, 10, 16, 18]) { b.seat(2, 1, z); b.seat(3, 1, z); b.seat(7, 1, z); b.seat(8, 1, z); }
  b.set(2, 1, 19, CONSOLE); b.set(8, 1, 19, CONSOLE);
  for (let z = 3; z <= 19; z += 2) b.lamp(5, 3, z);
  b.interior(2, 1, 1, 9, 3, 20);
  // two port doors (x 1 wall, y 1..2): z 5..6 and z 13..14, panels slide aft outside the wall (x 0)
  for (const z0 of [5, 13]) {
    b.fill(1, 1, z0, 1, 2, z0 + 1, 0);
    const door = b.part('door' + z0, CH.DOOR, { slide: [0, 0, -2] });
    door.fill(0, 1, z0 + 2, 0, 2, z0 + 3, DD); door.set(0, 2, z0 + 2, GL); door.set(0, 2, z0 + 3, GL);
    b.set(1, 3, z0, LAMP, EMIT.LAMP, SH.WEDGE_XN_UP); b.set(1, 3, z0 + 1, LAMP, EMIT.LAMP, SH.WEDGE_XN_UP);
  }
  const step = b.part('steps', CH.GEAR, { slide: [1, 0, 0] });
  step.set(0, 0, 5, STEP); step.set(0, 0, 6, STEP); step.set(0, 0, 13, STEP); step.set(0, 0, 14, STEP);
  b.setDoor([2, 1, 5], [-1, 0, 5], [-1, 0], [[1, 1, 5], [1, 2, 5], [1, 1, 6], [1, 2, 6], [1, 1, 13], [1, 2, 13], [1, 1, 14], [1, 2, 14]]);
  // roof greebles: AC units, antenna, route sign
  for (const z of [4, 10, 16]) { b.sset(3, 4, z, VENT); b.set(5, 4, z + 1, HT); }
  b.set(5, 4, 3, HOLO); b.set(5, 4, 8, CHR); b.set(5, 5, 8, CHR); b.set(5, 6, 8, LAMP); b.sset(2, 4, 19, CHR);
  // engines aft in a tail wall whose top and belly rows are bevelled and whose vertical edges are chamfered; red
  // tail markings on the bevel
  b.fill(1, 0, 21, 9, 3, 21, DD); b.sset(2, 1, 21, CHR); b.sset(2, 2, 21, CHR);
  b.engine(3, 1, 21); b.engine(3, 2, 21); b.engine(7, 1, 21); b.engine(7, 2, 21); b.engine(5, 1, 21);
  b.set(5, 2, 21, VENT); b.sset(1, 3, 21, RED);
  b.bevelTop([1, 3, 21, 9, 21], { XN: true, XP: true, ZP: true }); b.bevelBottom([1, 0, 21, 9, 21], { XN: true, XP: true, ZP: true });
  for (const y of [1, 2]) b.sshape(1, y, 21, SH.VWEDGE_XN_ZP);
  b.navPair(1, 3, 10); b.sshape(1, 3, 10, SH.WEDGE_XN_UP);
  b.slandingLight(3, 0, 0);
  // repulsor outriggers on both flanks (the body itself is the low floor); they tuck into the floor layer in flight
  const skids = b.part('skidsL', CH.GEAR, { slide: [1, 0, 0] });
  for (const z of [2, 3, 18, 19]) skids.set(0, 0, z, CHR);
  b.mirrorPart(skids);
  b.spot(0, 0, 10); b.spot(10, 0, 10); b.spot(5, 0, 22 - 1);
  return b.build();
}
