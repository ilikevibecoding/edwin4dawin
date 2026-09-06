import * as THREE from 'three';
import { gridGeometry, halfWidthAt, inBlock, insetSections, loftGrid, revealGeometry, sectionAt, strapGeometry, tOfHeight, type QuadBlock } from '../geometry';
import { PANEL_UV, SURF } from '../textures';
import { at, FLOOR, SEAT_Y, SKIN, UP, V3, type BuildContext } from './context';

/**
 * Seats with headrests, the baggage in the aft cabin, lap belts on the empty seats and the pilot's harness, the
 * folded chart (all into `cabinKit`). Runs before the pilot builder: the cabin kit is one merged geometry and the
 * parts keep their original order in it.
 */
export function buildSeats(ctx: BuildContext): void {
  const { cabinKit } = ctx;
  // ------------------------------------------------------------ cockpit: seats, belts, pilot, door trim, headliner
  const seatGeo = new THREE.BoxGeometry(0.46, 0.12, 0.46), backGeo = new THREE.BoxGeometry(0.1, 0.55, 0.46), frameGeo = new THREE.BoxGeometry(0.26, 0.34, 0.26);
  const seats: [number, number][] = [[1.0, -0.34], [1.0, 0.34], [-0.2, -0.34], [-0.2, 0.34], [-1.0, 0]];
  const headrestGeo = new THREE.BoxGeometry(0.11, 0.13, 0.24), postGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8);
  for (const [x, z] of seats) {
    cabinKit.add(seatGeo, at([x, SEAT_Y, z]), SURF.leather);
    cabinKit.add(backGeo, at([x - 0.25, SEAT_Y + 0.33, z], [0, 0, 0.15]), SURF.leather);
    cabinKit.add(frameGeo, at([x, FLOOR + 0.17, z]), SURF.darkMetal);
    // headrest on two posts above the seat back (the back leans aft by 0.15 rad)
    const topX = x - 0.25 - Math.sin(0.15) * 0.275, topY = SEAT_Y + 0.33 + Math.cos(0.15) * 0.275;
    for (const e of [-1, 1]) cabinKit.add(postGeo, at([topX - 0.01, topY + 0.04, z + e * 0.07], [0, 0, 0.15]), SURF.metal);
    cabinKit.add(headrestGeo, at([topX - 0.03, topY + 0.13, z], [0, 0, 0.15]), SURF.leather);
  }
  // baggage in the aft cabin, stacked up into the aft window band (sill 0.40, top 0.78): from outside that window
  // otherwise looked straight across at the far wall's dark vinyl and read as an opaque grey panel. Hard case and
  // cooler on the floor in the bench's legroom, duffels on top and on the bench cushion beside the passenger
  cabinKit.add(new THREE.BoxGeometry(0.40, 0.30, 0.34), at([-0.66, FLOOR + 0.15, 0.34], [0, 0.10, 0]), SURF.hardCase);
  cabinKit.add(new THREE.BoxGeometry(0.34, 0.26, 0.30), at([-0.66, FLOOR + 0.43, 0.33], [0.06, -0.25, 0.04]), SURF.duffelRed);
  cabinKit.add(new THREE.BoxGeometry(0.30, 0.18, 0.26), at([-0.64, FLOOR + 0.65, 0.31], [0.0, 0.5, 0.08]), SURF.duffelOlive);
  cabinKit.add(new THREE.BoxGeometry(0.36, 0.34, 0.30), at([-0.66, FLOOR + 0.17, -0.34], [0, -0.12, 0]), SURF.cooler);
  cabinKit.add(new THREE.BoxGeometry(0.42, 0.26, 0.30), at([-0.68, FLOOR + 0.47, -0.34], [0.04, 0.3, -0.05]), SURF.duffelOlive);
  cabinKit.add(new THREE.BoxGeometry(0.30, 0.24, 0.24), at([-1.02, SEAT_Y + 0.18, 0.36], [0.1, 0.35, 0]), SURF.duffelRed);
  cabinKit.add(new THREE.BoxGeometry(0.26, 0.20, 0.22), at([-1.00, SEAT_Y + 0.40, 0.34], [0.0, -0.4, 0.06]), SURF.duffelOlive);
  cabinKit.add(new THREE.BoxGeometry(0.34, 0.22, 0.24), at([-1.02, SEAT_Y + 0.17, -0.36], [0, 0.2, 0]), SURF.hardCase);
  cabinKit.add(new THREE.BoxGeometry(0.28, 0.24, 0.22), at([-1.00, SEAT_Y + 0.40, -0.35], [0.05, -0.15, 0.03]), SURF.duffelRed);
  const cushionTop = SEAT_Y + 0.06;
  const strap = (a: [number, number, number], b: [number, number, number], n: [number, number, number] = [0, 1, 0]) => cabinKit.add(strapGeometry(V3(...a), V3(...b), 0.045, 0.005, V3(...n)), undefined, SURF.belt);
  const buckle = (p: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => cabinKit.add(new THREE.BoxGeometry(0.055, 0.016, 0.06), at(p, rot), SURF.metal);
  // lap belts on the empty seats lie across the cushions; the pilot wears his, with a shoulder strap
  for (const [x, z] of seats.slice(1)) {
    const yb = cushionTop + 0.004;
    strap([x, yb, z - 0.24], [x, yb, z - 0.04]); strap([x, yb, z + 0.24], [x, yb, z + 0.04]);
    buckle([x, yb + 0.004, z]);
  }
  // folded sectional chart dropped on the copilot seat: two leaves of paper, the top one half-open at an angle,
  // with the printed face (pale blue-grey) showing on the open leaf
  cabinKit.add(new THREE.BoxGeometry(0.24, 0.006, 0.17), at([1.02, cushionTop + 0.011, 0.35], [0, 0.28, 0]), SURF.paper);
  cabinKit.add(new THREE.BoxGeometry(0.20, 0.0025, 0.13), at([1.02, cushionTop + 0.0155, 0.35], [0, 0.28, 0]), SURF.chartInk);
  cabinKit.add(new THREE.BoxGeometry(0.24, 0.006, 0.085), at([1.075, cushionTop + 0.030, 0.42], [0.55, 0.28, 0]), SURF.paper);
  const lapY = cushionTop + 0.09, chestY = SEAT_Y + 0.06 + 0.50;
  strap([0.96, cushionTop + 0.01, -0.60], [1.07, lapY, -0.36], [0.35, 1, 0]); strap([0.96, cushionTop + 0.01, -0.08], [1.07, lapY, -0.32], [0.35, 1, 0]);
  buckle([1.075, lapY, -0.34], [0, 0, 0.35]);
  strap([1.10, chestY, -0.50], [1.09, lapY + 0.01, -0.32], [1, 0.1, 0]);           // across the chest
  strap([1.0, chestY + 0.02, -0.50], [0.52, 0.96, -0.68], [0, 1, -0.3]);            // over the shoulder back to the sidewall anchor
  strap([0.52, 0.96, 0.68], [0.74, SEAT_Y + 0.55, 0.46], [0, 1, 0.3]);              // copilot's shoulder strap draped over the seat back
  for (const s of [-1, 1]) cabinKit.add(new THREE.BoxGeometry(0.05, 0.05, 0.02), at([0.52, 0.96, s * 0.69]), SURF.darkMetal);
}

/** Door skins with their reveals, armrests, handles, map pockets and placards, headliner bows, eyeball vents, the fire extinguisher. Runs after the pilot builder. */
export function buildCabinTrim(ctx: BuildContext): void {
  const { decal, cabinFixed, cabinShell, cabinKit } = ctx;
  const { sections, outer, inner, R, ring, jA, jC, si } = ctx.fuselage;
  // doors: an inner door skin 15 mm proud of the sidewall (with the gap around it) from the sill down to the
  // door's bottom line, an armrest, the interior handle and a map pocket; an exit placard above the window
  const doorSections = insetSections(sections, SKIN + 0.015);
  const doorGrid = loftGrid(doorSections, (_s, i) => outer.t[i]);
  const jDoorBot = (() => {
    const s = sectionAt(sections, 1.3), t = tOfHeight(s, -0.42) ?? 0.4;
    const ts = outer.t[si(1.77)];
    let best = jC, bestD = Infinity;
    for (let j = jC; j <= R / 2; j++) { const d = Math.abs(ts[j] - t); if (d < bestD) { bestD = d; best = j; } }
    return best;
  })();
  const doorBlocks: QuadBlock[] = [{ i0: si(1.77), i1: si(0.95), j0: jC, j1: jDoorBot }, { i0: si(1.77), i1: si(0.95), j0: R - jDoorBot, j1: R - jC }];
  for (const b of doorBlocks) {
    cabinShell.add(gridGeometry(doorGrid, { i0: b.i0, i1: b.i1, quad: (i, j) => inBlock(b, R, i, j), flip: true }));
    cabinFixed.add(revealGeometry(inner, doorGrid, b), undefined, SURF.trim);
  }
  const doorHalf = (x: number, y: number) => halfWidthAt(sectionAt(doorSections, x), y);
  for (const s of [-1, 1]) {
    cabinKit.add(new THREE.BoxGeometry(0.34, 0.045, 0.07), at([1.32, 0.17, s * (doorHalf(1.32, 0.17) - 0.035)]), SURF.plastic);
    cabinKit.add(new THREE.BoxGeometry(0.05, 0.05, 0.012), at([1.06, 0.06, s * (doorHalf(1.06, 0.06) - 0.006)]), SURF.metal);
    cabinKit.add(new THREE.BoxGeometry(0.10, 0.018, 0.02), at([1.10, 0.05, s * (doorHalf(1.06, 0.06) - 0.025)], [0, 0, -0.25]), SURF.metal);
    cabinKit.add(new THREE.BoxGeometry(0.30, 0.16, 0.02), at([1.30, -0.16, s * (doorHalf(1.30, -0.16) - 0.012)]), SURF.trim);
    // placards on the flat door skin just under the sill (the roof line above the window curves inward)
    decal(PANEL_UV.exit, 0.10, 0.036, new THREE.Vector3(1.15, 0.33, s * (doorHalf(1.15, 0.33) - 0.002)), new THREE.Vector3(0, 0, -s), UP);
    decal(PANEL_UV.belts, 0.10, 0.030, new THREE.Vector3(1.55, 0.33, s * (doorHalf(1.55, 0.33) - 0.002)), new THREE.Vector3(0, 0, -s), UP);
  }
  // headliner bows over the window pillars, eyeball vents, fire extinguisher by the copilot door
  for (const x of [1.81, 0.90]) {
    const bowSections = [sectionAt(insetSections(sections, SKIN + 0.004), x + 0.012), sectionAt(insetSections(sections, SKIN + 0.004), x - 0.012)];
    const bowGrid = loftGrid(bowSections, (s) => ring(s));
    cabinFixed.add(gridGeometry(bowGrid, { flip: true, quad: (_i, j) => j < jA || j >= R - jA }), undefined, SURF.bow);
  }
  // eyeball vents: flush housings let into the headliner outboard of each front seat (roof inner surface ~1.09 at
  // z 0.50), dark ball inside; they protrude about a centimetre
  for (const s of [-1, 1]) {
    cabinKit.add(new THREE.CylinderGeometry(0.028, 0.028, 0.024, 12), at([1.60, 1.092, s * 0.50]), SURF.lightPlastic);
    cabinKit.add(new THREE.CylinderGeometry(0.015, 0.015, 0.028, 10), at([1.60, 1.091, s * 0.50]), SURF.plastic);
  }
  cabinKit.add(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 10), at([0.55, FLOOR + 0.14, 0.62], [0, 0, 0.1]), SURF.extinguisher);
  cabinKit.add(new THREE.BoxGeometry(0.06, 0.08, 0.04), at([0.55, FLOOR + 0.06, 0.66]), SURF.darkMetal);
}
