// The apron: the deck plates (layers 94..96) of the west apron and the plateau strip, the pylons down to the lower
// city terraces, the hyperlane tube with its raised glass promenade (the hump), the station / ramp cuts with their
// railings, the lit freight lane under the plateau strip, the perimeter parapet and the emergency stair towers.
import { M, LINE, lampPost, kerb, switchbackTower, TOWER_W, TOWER_D } from './painter.js';
import { APRON, PLATEAU_DECK, OLD_DECK_X0, STATION_CUT, RAMP_CUT, inCut, TUBE, HUMP, inTube, FREIGHT_LANE, PYLON_XS, PYLON_ZS, pylonZ, TERMINUS, EMERGENCY_STAIRS, DECK_TOP, DECK_Y } from './plan.js';
import { lowerFloorAt } from '../lowercity/plan.js';

const abs = Math.abs;
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
export const onDeck = (x, z) => inRect(APRON, x, z) || inRect(PLATEAU_DECK, x, z);
const UNDER = TERMINUS.box;
const underTerminus = (x, z) => x >= UNDER.x0 && x <= UNDER.x1 && z >= UNDER.z0 && z <= UNDER.z1;
const onLane = (x, z) => x >= FREIGHT_LANE.x0 - 2 && x <= FREIGHT_LANE.x1 + 2 && z >= FREIGHT_LANE.z0 - 2 && z <= FREIGHT_LANE.z1 + 2;

// What a deck column holds: 'none' (tube, cuts), 'plate' (the 96 plate only: over the terminus undercroft) or 'full'.
export function deckKind(x, z) {
  if (!onDeck(x, z)) return 'none';
  if (x <= HUMP.x1 && inTube(z)) return 'none';
  if (inCut(x, z)) return 'none';
  if (underTerminus(x, z)) return 'plate';
  return 'full';
}

// ------------------------------------------------------------------------------------------------ plates + supports
function paintPlates(p) {
  const [x0, x1] = p.xRange(APRON.x0, PLATEAU_DECK.x1), [z0, z1] = p.zRange(APRON.z0, APRON.z1);
  if (x0 > x1 || z0 > z1) return;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const k = deckKind(x, z);
    if (k === 'none') continue;
    p.set(x, DECK_TOP, z, M.PLATE);
    if (k === 'plate') continue;
    p.set(x, 94, z, M.DD); p.set(x, 95, z, M.DD);
    // girders on a 16 grid under the plate, blue underside lights between them
    const gx = ((x - 2138) & 15) === 0, gz = ((z + 358) & 15) === 0;
    if (gx || gz) p.set(x, 93, z, M.DD);
    else if (((x - 2138) & 15) === 8 && ((z + 358) & 15) === 8) p.set(x, 93, z, M.BLUE);
  }
  // pylons under the west apron
  for (const px of PYLON_XS) for (const pz0 of PYLON_ZS) {
    const pz = pylonZ(px, pz0);
    if (!p.overlaps(px - 1, pz - 1, px + 2, pz + 2)) continue;
    const ground = lowerFloorAt(px, pz) ?? 12;
    for (let x = px - 1; x <= px + 2; x++) for (let z = pz - 1; z <= pz + 2; z++) {
      const corner = (x === px - 1 || x === px + 2) && (z === pz - 1 || z === pz + 2);
      for (let y = ground - 2; y <= 93; y++) p.set(x, y, z, corner ? M.DD : (y & 7) === 0 ? M.STR : y >= 92 ? M.BLUE : M.D);
    }
    p.box(px - 2, ground + 1, pz - 2, px + 3, ground + 1, pz + 3, M.DD);                         // footing plinth
    p.box(px - 2, 91, pz - 2, px + 3, 93, pz + 3, M.DD); p.box(px - 1, 92, pz - 1, px + 2, 92, pz + 2, M.BLUE);   // capital
  }
  // 2x2 pillars under the plateau deck down to the plateau ground (61), on a 16 grid; the old deck keeps its grid
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (x < PLATEAU_DECK.x0 || !inRect(PLATEAU_DECK, x, z)) continue;
    const old = x >= OLD_DECK_X0;
    const px = old ? (x - 2584) & 15 : (x - 2496) & 15, pz = old ? (z + 168) & 15 : (z + 164) & 15;
    if (px <= 1 && pz <= 1 && !inCut(x, z) && !onLane(x, z)) p.col(x, z, 61, 92, M.DD);
  }
}

// ------------------------------------------------------------------------------------------------ tube + hump
// The hyperlane slot: deck edges at z -6 / 5 lit from 94 to 97, the glass cover at 98 over z -5..4, half-step ramps
// on both sides up to the promenade (walk 99). Runs from the apron's west edge to the station canopy.
function paintHump(p) {
  if (!p.overlaps(APRON.x0, HUMP.z0, HUMP.x1, HUMP.z1)) return;
  const [x0, x1] = p.xRange(APRON.x0, HUMP.x1);
  for (let x = x0; x <= x1; x++) {
    // tube walls (the deck edge columns) with light strips
    for (const z of [TUBE.z0 - 1, TUBE.z1 + 1]) {
      p.set(x, 94, z, M.DD); p.set(x, 95, z, (x & 3) === 0 ? M.GLOW : M.DD); p.set(x, 96, z, M.DD);
      p.set(x, 97, z, (x & 7) === 4 ? M.BLUE : M.DD); p.set(x, 98, z, M.D);
    }
    // glass cover with durasteel frames every 4 blocks
    for (let z = TUBE.z0; z <= TUBE.z1; z++) p.set(x, HUMP.cover, z, ((x - 2138) & 3) === 0 ? M.D : M.GL);
    // ramps: 97.5 / 98 / 98.5 on z -9..-7 and 8..6
    for (const [z, level] of [[-9, 97.5], [-8, 98], [-7, 98.5], [8, 97.5], [7, 98], [6, 98.5]]) {
      const top = Math.floor(level);
      if (level !== top) { p.set(x, top, z, M.SLAB); if (top - 1 >= 97) p.set(x, top - 1, z, M.DD); }
      else p.set(x, top - 1, z, (x & 7) === 0 ? M.STR : M.DD);
    }
  }
  // the west end of the hump is the apron edge: glass parapet across the promenade and the ramps
  if (p.overlaps(APRON.x0, HUMP.z0, APRON.x0, HUMP.z1)) {
    for (let z = HUMP.z0; z <= HUMP.z1; z++) { const lvl = z >= -6 && z <= 5 ? 99 : abs(z) === 7 ? 99 : abs(z) === 8 ? 98 : 98; p.set(APRON.x0, lvl, z, M.STR); p.set(APRON.x0, lvl + 1, z, M.GL); }
    for (const z of [-6, 5]) p.set(APRON.x0, 101, z, M.LAMP);
  }
  // the east end meets the station: railings at the ramps' ends over the cut, the cover runs onto the canopy (98)
  const xe = HUMP.x1;
  if (p.overlaps(xe, HUMP.z0, xe + 1, HUMP.z1)) {
    for (let z = HUMP.z0; z <= HUMP.z1; z++) if (!inTube(z)) { p.set(xe, 97, z, M.DD); p.set(xe, 98, z, M.DD); p.set(xe, 99, z, M.GL); p.set(xe, 100, z, M.GL); }
    for (let z = TUBE.z0; z <= TUBE.z1; z++) p.set(xe, HUMP.cover, z, M.D);
  }
}

// Railings on the station canopy (walk 99, the promenade continues over it) and around the cuts.
function paintCuts(p) {
  const C = STATION_CUT, R = RAMP_CUT;
  if (!p.overlaps(C.x0 - 1, C.z0 - 1, R.x1 + 1, C.z1 + 1)) return;
  // deck edge kerbs round the station cut (north side, south side, and the west side outside the hump)
  for (let x = C.x0 - 1; x <= C.x1 + 1; x++) { kerb(p, x, C.z0 - 1, DECK_Y); if (x > R.x1 || x < R.x0) kerb(p, x, C.z1 + 1, DECK_Y); else kerb(p, x, C.z1 + 1, DECK_Y); }
  for (let z = C.z0 - 1; z <= C.z1 + 1; z++) if (z < HUMP.z0 || z > HUMP.z1) kerb(p, C.x0 - 1, z, DECK_Y);
  // the ramp cut east of the station (the old half-step ramp climbs inside it)
  for (let x = R.x0; x <= R.x1 + 1; x++) { kerb(p, x, R.z0 - 1, DECK_Y); kerb(p, x, R.z1 + 1, DECK_Y); }
  for (let z = R.z1 + 2; z <= C.z1 + 1; z++) kerb(p, C.x1 + 1, z, DECK_Y);
  for (let z = C.z0 - 1; z <= R.z0 - 2; z++) kerb(p, C.x1 + 1, z, DECK_Y);
  // canopy railings (the station's glass canopy at 98 is the promenade's floor between x 2473 and 2532)
  for (let x = 2473; x <= 2532; x++) { p.set(x, 99, -5, M.GL); p.set(x, 99, 10, M.GL); }
  for (let z = -5; z <= 10; z++) { p.set(2533, 99, z, M.GL); p.set(2533, 100, z, z === -5 || z === 10 ? M.LAMP : M.GL); }
  for (const x of [2480, 2500, 2520]) { p.set(x, 100, -5, M.LAMP); p.set(x, 100, 10, M.LAMP); }
  // lamps along the cut edges
  for (let x = C.x0; x <= C.x1; x += 16) { lampPost(p, x, C.z0 - 1, DECK_Y); lampPost(p, x, C.z1 + 1, DECK_Y); }
}

// The freight lane on the plateau ground stays lit under the deck: lamps on the deck's underside along both sides.
function paintLane(p) {
  const L = FREIGHT_LANE;
  if (!p.overlaps(L.x0, L.z0 - 2, L.x1, L.z1 + 2)) return;
  const [x0, x1] = p.xRange(L.x0, L.x1);
  for (let x = x0; x <= x1; x++) {
    if ((x & 7) === 4) { for (const z of [L.z0 - 1, L.z1 + 1]) if (!inCut(x, z)) { p.set(x, 93, z, M.LAMP); p.set(x, 92, z, M.DD); } }
    if ((x & 7) === 0) for (const z of [L.z0 - 2, L.z1 + 2]) if (!inCut(x, z)) { p.col(x, z, 61, 64, M.DD); p.set(x, 65, z, M.GLOW); }   // lane bollard lights
  }
  // "FREIGHT" marker: lit lintel over the lane where it leaves the plateau edge cut
  p.box(2496, 66, L.z0 - 1, 2496, 66, L.z1 + 1, M.HOLO);
}

// ------------------------------------------------------------------------------------------------ parapet
function isDeckEdge(x, z) {
  if (deckKind(x, z) === 'none') return false;
  return !onDeck(x - 1, z) || !onDeck(x + 1, z) || !onDeck(x, z - 1) || !onDeck(x, z + 1);
}
function paintParapet(p) {
  const [x0, x1] = p.xRange(APRON.x0, PLATEAU_DECK.x1), [z0, z1] = p.zRange(APRON.z0, APRON.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (!isDeckEdge(x, z)) continue;
    if (x === APRON.x0 && z >= HUMP.z0 && z <= HUMP.z1) continue;               // the hump has its own parapet
    kerb(p, x, z, DECK_Y);
    if ((((x - 2138) & 15) === 0 && (z === APRON.z0 || z === APRON.z1 || z === PLATEAU_DECK.z0 || z === PLATEAU_DECK.z1)) ||
        (((z + 358) & 15) === 0 && (x === APRON.x0 || x === APRON.x1 || x === PLATEAU_DECK.x1))) lampPost(p, x, z, DECK_Y);
  }
}

// ------------------------------------------------------------------------------------------------ emergency stairs
function paintEmergencyStairs(p) {
  for (const s of EMERGENCY_STAIRS) {
    if (!p.overlaps(s.x0 - 1, s.z0 - 1, s.x0 + TOWER_W, s.z0 + TOWER_D)) continue;
    let g = 0;
    for (let x = s.x0; x < s.x0 + TOWER_W; x++) for (let z = s.z0; z < s.z0 + TOWER_D; z++) g = Math.max(g, lowerFloorAt(x, z) ?? 12);
    switchbackTower(p, s.x0, s.z0, DECK_Y, g + 1);
    // red-lit "EMERGENCY EXIT" header over the stair head
    p.box(s.x0 + 4, DECK_Y + 2, s.z0 + 2, s.x0 + 11, DECK_Y + 2, s.z0 + 2, M.HOLO); p.set(s.x0 + 3, DECK_Y + 2, s.z0 + 2, M.RED); p.set(s.x0 + 12, DECK_Y + 2, s.z0 + 2, M.RED);
    for (const x of [s.x0 + 3, s.x0 + 12]) p.col(x, s.z0 + 2, DECK_Y, DECK_Y + 1, M.DD);
  }
}

export function paintDeckAll(p) {
  paintPlates(p);
  paintHump(p);
  paintCuts(p);
  paintLane(p);
  paintParapet(p);
  paintEmergencyStairs(p);
}
export { LINE };
