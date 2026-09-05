// The two hyperlane stations (frontier, Coruscant west edge): a 60 x 8 platform at track level with glass edge doors
// that open with the train, a canopy, a waiting hall with benches, kiosks and timetable boards (holo panels + text
// signs), and a switchback stair tower down to the ground. Lazy per-chunk fills; the edge doors are toggled as world
// blocks whenever the train's doors change.
// Junctions with the spaceports (src/coruscant/spaceport.js):
//   - Coruscant: the track ends (buffer stops) at x 2548, the tower top (platform level, walk on 92) at x 2533..2548;
//     a glass-walled concourse at the bridge floor level (walk on 91) fills x 2549..2560 between the tower and the
//     spaceport's covered bridge (x 2561..2575) and joins the two levels with a half-slab step;
//   - frontier: the mini spaceport is a roof deck at the canopy level (walk on 99); a fenced 13-step stair at the
//     platform's west end (x 243..255, z 8..9, a 2-wide landing at its foot) climbs from the platform through the
//     canopy onto the deck.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS } from '../constants.js';
import { addSignTiles } from '../textures.js';
import { World } from '../world.js';
import { ROUTE, doorWorldXs, PERIOD, TRAIN_LENGTH } from '../vehicles/route.js';
import { chunkSetter, DECK_Z0 } from './hyperlane.js';
import { SPACEPORT, STATION_Y, FRONTIER, FRONTIER_DECK_Y, onFrontierDeck } from '../coruscant/spaceport.js';

const FLOOR = ROUTE.floorY - 1;      // 91: platform / hall floor blocks (walk on 92)
const PZ0 = ROUTE.platformZ0, PZ1 = ROUTE.platformZ1; // 3..10
const HALL_Z0 = PZ1 + 1, HALL_Z1 = PZ1 + 14;          // 11..24
const CANOPY_Y = 98, HALL_ROOF_Y = 97;
const PLATFORM_LEN = 60, TOWER_LEN = 16;               // tower (stair head) continues the platform eastwards
const RAIL_Y = FLOOR + 1;                              // railings (iron bars) stand on the platform floor

// Geometry of one station derived from the route entry.
export function stationLayout(S) {
  const px0 = S.platformX0, px1 = px0 + PLATFORM_LEN - 1;
  const tx0 = px1 + 1, tx1 = tx0 + TOWER_LEN - 1;        // tower footprint (walls included)
  const L = { S, px0, px1, tx0, tx1, hallX0: px0 + 10, hallX1: px0 + 49, doorXs: doorWorldXs(S.dockX0), concourse: null, roofStair: null };
  if (S === ROUTE.coruscant) {
    // concourse between the tower and the spaceport's covered bridge, at the bridge floor level (walk on 91)
    const br = SPACEPORT.bridge;
    L.concourse = { x0: tx1 + 1, x1: br.x0 - 1, z0: -br.hw, z1: PZ1, wallN: -br.hw - 1, wallS: PZ1 + 1, floor: STATION_Y };
  }
  if (S === ROUTE.frontier) {
    // stair from the platform's west end up to the spaceport roof deck: half-block steps at x0 .. x0 + steps - 1 on
    // z 8..9 (the deck floor itself is the last step), fenced with glass balustrades on both sides; its foot leaves a
    // 2-wide landing (x px0 + 1 .. px0 + 2) between the platform's end railing and the balustrades
    const steps = (FRONTIER_DECK_Y - ROUTE.floorY) * 2 - 1;    // 13: 92.5 .. 98.5
    L.roofStair = { x0: px0 + 3, x1: px0 + 2 + steps, steps, z0: 8, z1: 9, deckX0: FRONTIER.deck.x0 };
  }
  // structure AABB (x1/z1 exclusive)
  L.x0 = px0 - 1; L.x1 = L.concourse ? L.concourse.x1 + 1 : tx1 + 2;
  L.z0 = L.concourse ? L.concourse.wallN - 2 : DECK_Z0 - 3; L.z1 = HALL_Z1 + 2;
  return L;
}

// walking height of step i (0-based) of the roof stair
const stairHeight = (i) => ROUTE.floorY + 0.5 * (i + 1);

// ground walking level under the stair tower (max terrain in its footprint + 1), deterministic from the generator
function towerGround(gen, L) {
  let g = 0;
  for (let x = L.tx0; x <= L.tx1; x++) for (let z = PZ0; z <= PZ1; z++) g = Math.max(g, gen.surfaceHeight(x, z));
  return g + 1;
}
// The switchback flights land at walking levels 87, 77, 67, ... at the tower's east end and 82, 72, 62, ... at its
// west end; a landing at most three blocks above the ground floor leaves no head room under it, so the ground exit
// goes into the end wall that stays clear (east unless the ground level is 4..6 mod 10).
export function towerExitX(G, L) { const m = G % 10; return m >= 4 && m <= 6 ? L.tx0 : L.tx1; }

function fillStation(chunk, gen, L, edgeMode) {
  const set = chunkSetter(chunk);
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  const cx0 = bx, cx1 = bx + CS - 1, cz0 = bz, cz1 = bz + CS - 1;
  const inX = (a, b) => !(b < cx0 || a > cx1);
  const inZ = (a, b) => !(b < cz0 || a > cz1);
  const xa = Math.max(cx0, L.px0), xb = Math.min(cx1, L.tx1);
  const { px0, px1, tx0, tx1 } = L;
  const canopyColumn = (x) => x <= px1 && (x - px0) % 12 === 2;
  const stairX = (x) => !!L.roofStair && x >= L.roofStair.x0 && x <= L.roofStair.x1;   // the roof stair's balustrade fences these columns

  // ---------------------------------------------------------------- clear the air volume of the station (below the canopy)
  if (inX(L.px0, L.tx1) && inZ(DECK_Z0 - 2, HALL_Z1)) {
    for (let x = Math.max(cx0, L.px0); x <= Math.min(cx1, L.tx1); x++) for (let z = Math.max(cz0, PZ0); z <= Math.min(cz1, HALL_Z1); z++) for (let y = FLOOR + 1; y <= CANOPY_Y - 2; y++) set(x, y, z, 0);
  }
  // ---------------------------------------------------------------- platform body, floor, pillars
  if (xa <= xb && inZ(PZ0, HALL_Z1)) {
    for (let x = xa; x <= xb; x++) {
      const hall = x >= L.hallX0 && x <= L.hallX1;
      const zEnd = hall ? HALL_Z1 : PZ1;
      for (let z = Math.max(cz0, PZ0); z <= Math.min(cz1, zEnd); z++) {
        for (let y = FLOOR - 3; y < FLOOR; y++) set(x, y, z, B.DURASTEEL_DARK);
        set(x, FLOOR, z, z === PZ0 ? B.DURASTEEL : (z === PZ0 + 1 && x % 2 === 0 ? B.PANEL_STRIPE : B.DECK_PLATE));
      }
      // pillars every 16 blocks (2 x 2) under the platform and the hall, down to terrain / sea floor
      if (x % 16 === 8 || x % 16 === 9) {
        const zs = hall ? [6, 7, 17, 18] : [6, 7];
        for (const z of zs) if (z >= cz0 && z <= cz1) {
          const ground = gen.surfaceHeight(x, z);
          for (let y = FLOOR - 4; y > ground; y--) set(x, y, z, (y & 7) === 0 ? B.PANEL_STRIPE : B.DURASTEEL_DARK);
        }
      }
      // deck extension + canopy columns on the north side of the track
      if (x <= px1) {
        for (const z of [DECK_Z0 - 2, DECK_Z0 - 1]) if (z >= cz0 && z <= cz1) { set(x, ROUTE.deckY, z, B.DURASTEEL); set(x, ROUTE.deckY - 1, z, B.DURASTEEL_DARK); }
        if ((x - px0) % 12 === 2 && DECK_Z0 - 1 >= cz0 && DECK_Z0 - 1 <= cz1) for (let y = ROUTE.deckY + 1; y < CANOPY_Y; y++) set(x, y, DECK_Z0 - 1, B.DURASTEEL);
      }
      // railings along the open back edge (outside the hall) and the platform's west end
      const openBack = (x < L.hallX0 || x > L.hallX1) && !canopyColumn(x) && !stairX(x);
      if (openBack && PZ1 >= cz0 && PZ1 <= cz1) set(x, RAIL_Y, PZ1, B.IRON_BARS);
      if (x === px0) for (let z = Math.max(cz0, PZ0 + 1); z <= Math.min(cz1, PZ1 - 1); z++) set(x, RAIL_Y, z, B.IRON_BARS);
    }
  }
  // ---------------------------------------------------------------- edge doors (z = 3) with boards above
  if (xa <= xb && PZ0 >= cz0 && PZ0 <= cz1) {
    for (let x = xa; x <= xb; x++) {
      let door = false;
      for (const dx of L.doorXs) if (x === dx || x === dx + 1) door = true;
      const open = edgeMode === 'open' || (edgeMode === 'doors' && door);
      set(x, FLOOR + 1, PZ0, open ? 0 : B.STEEL_GLASS);
      set(x, FLOOR + 2, PZ0, open ? 0 : B.STEEL_GLASS);
      set(x, FLOOR + 3, PZ0, door ? B.HOLO_SIGN : (x % 6 === 3 ? B.GLOW_PANEL : B.DURASTEEL_DARK));
    }
  }
  // ---------------------------------------------------------------- canopy over track + platform (x <= px1)
  if (inX(px0, px1) && inZ(DECK_Z0 - 1, PZ1)) {
    for (let x = Math.max(cx0, px0); x <= Math.min(cx1, px1); x++) for (let z = Math.max(cz0, DECK_Z0 - 1); z <= Math.min(cz1, PZ1); z++) {
      const glass = (x - px0) % 4 === 1 || (x - px0) % 4 === 2;
      // the frontier spaceport's roof deck is the canopy where it overlaps; its underside keeps the beams and lights
      if (!(L.roofStair && onFrontierDeck(x, z))) set(x, CANOPY_Y, z, glass && z > DECK_Z0 - 1 && z < PZ1 ? B.STEEL_GLASS : B.DURASTEEL_DARK);
      if ((x - px0) % 12 === 2) set(x, CANOPY_Y - 1, z, B.DURASTEEL_DARK); // cross beams
      if ((x - px0) % 6 === 5 && z === 7) set(x, CANOPY_Y - 1, z, B.GLOW_PANEL); // hanging lights over the platform
    }
    // canopy columns on the platform's back edge
    for (let x = Math.max(cx0, px0); x <= Math.min(cx1, px1); x++) if ((x - px0) % 12 === 2 && PZ1 >= cz0 && PZ1 <= cz1) for (let y = FLOOR + 1; y < CANOPY_Y; y++) set(x, y, PZ1, B.DURASTEEL);
  }
  // ---------------------------------------------------------------- waiting hall (z 11..24)
  if (inX(L.hallX0, L.hallX1) && inZ(HALL_Z0, HALL_Z1)) {
    const hx0 = L.hallX0, hx1 = L.hallX1;
    for (let x = Math.max(cx0, hx0); x <= Math.min(cx1, hx1); x++) for (let z = Math.max(cz0, HALL_Z0); z <= Math.min(cz1, HALL_Z1); z++) {
      const endWall = x === hx0 || x === hx1, backWall = z === HALL_Z1, front = z === HALL_Z0;
      const lx = x - hx0;
      if (endWall || backWall) {
        for (let y = FLOOR + 1; y < HALL_ROOF_Y; y++) {
          let id = B.DURASTEEL;
          const along = backWall ? lx : z - HALL_Z0; // coordinate running along the wall
          const win = (y === FLOOR + 2 || y === FLOOR + 3) && !(backWall && lx >= 16 && lx <= 23) && along % 4 !== 0;
          if (win) id = B.STEEL_GLASS;
          if (y === FLOOR + 1) id = B.PANEL_STRIPE;
          if (y === FLOOR + 5) id = B.DURASTEEL_DARK;
          set(x, y, z, id);
        }
        // timetable: holo panels flanking two rows of text signs (placed below, in front of the wall)
        if (backWall && lx >= 16 && lx <= 23) { set(x, FLOOR + 2, z, B.HOLO_SIGN); set(x, FLOOR + 3, z, B.HOLO_SIGN); set(x, FLOOR + 4, z, B.GLOW_PANEL_BLUE); }
        // side exits in the end walls
        if (endWall && z >= 16 && z <= 18) { set(x, FLOOR + 1, z, 0); set(x, FLOOR + 2, z, 0); set(x, FLOOR + 3, z, 0); }
      } else if (front) {
        if (lx % 8 === 0) for (let y = FLOOR + 1; y < HALL_ROOF_Y; y++) set(x, y, z, B.DURASTEEL); // open colonnade to the platform
      }
      // roof with skylights and ceiling lights
      set(x, HALL_ROOF_Y, z, (z === 14 || z === 20) && lx % 4 === 2 ? B.GLOW_PANEL : ((z === 17 || z === 18) && lx % 3 !== 0 ? B.STEEL_GLASS : B.DURASTEEL_DARK));
      // furniture
      if (!endWall && !backWall && !front) {
        if ((z === 14 || z === 21) && lx >= 3 && lx <= 36 && lx % 9 !== 0) set(x, FLOOR + 1, z, B.STONE_BRICK_SLAB); // benches
        if (z === HALL_Z1 - 1 && (lx === 6 || lx === 7 || lx === 32 || lx === 33)) set(x, FLOOR + 1, z, B.CONSOLE);   // ticket kiosks
        if (z === HALL_Z1 - 1 && lx >= 16 && lx <= 23) { set(x, FLOOR + 1, z, B.DURASTEEL_DARK); set(x, FLOOR + 2, z, B.WALL_SIGN); } // timetable text row (8 cells)
        if (z === 17 && (lx === 12 || lx === 27)) { set(x, FLOOR + 1, z, B.CHROME); set(x, FLOOR + 2, z, B.HOLO_SIGN); } // info pylons
      }
    }
  }
  // ---------------------------------------------------------------- stair tower (x tx0..tx1, z 3..10) down to ground
  if (inX(tx0, tx1) && inZ(PZ0, PZ1)) {
    const G = towerGround(gen, L), exitX = towerExitX(G, L);
    for (let x = Math.max(cx0, tx0); x <= Math.min(cx1, tx1); x++) for (let z = Math.max(cz0, PZ0); z <= Math.min(cz1, PZ1); z++) {
      const wall = x === tx0 || x === tx1 || z === PZ0 || z === PZ1;
      const ground = gen.surfaceHeight(x, z);
      if (wall) {
        for (let y = Math.min(ground, G - 1); y < FLOOR; y++) set(x, y, z, y < G ? B.DURASTEEL_DARK : (y % 4 === 2 && y > G + 2 && (x === tx0 || x === tx1 || (z === PZ1)) ? B.STEEL_GLASS : B.DURASTEEL));
        // exit at ground level in the end wall that the lowest landing leaves clear
        if (x === exitX && z >= PZ0 + 1 && z <= PZ1 - 1) for (let y = G; y <= G + 2; y++) set(x, y, z, 0);
      } else {
        // hollow interior with a solid core between the two flights, foundation up to the ground floor
        for (let y = Math.min(ground, G - 1); y < FLOOR; y++) set(x, y, z, 0);
        for (let y = Math.min(ground, G - 1); y < G; y++) set(x, y, z, B.DURASTEEL_DARK);
        if ((z === 6 || z === 7) && x >= tx0 + 3 && x <= tx0 + 12) for (let y = G; y < FLOOR; y++) set(x, y, z, (y & 3) === 1 && x % 5 === 2 ? B.GLOW_PANEL : B.DURASTEEL);
      }
    }
    // stair head: open the platform floor over the first flight, railings along its south side and its far (east)
    // end; the flight is entered from the west at x tx0 + 2
    for (let x = tx0 + 3; x <= tx0 + 12; x++) for (const z of [4, 5]) set(x, FLOOR, z, 0);
    for (let x = tx0 + 3; x <= tx0 + 12; x++) set(x, FLOOR + 1, 6, B.IRON_BARS);
    for (const z of [4, 5]) set(tx0 + 13, FLOOR + 1, z, B.IRON_BARS);
    // the tower top's east edge is open only where the concourse continues it
    if (!L.concourse) for (let z = PZ0 + 1; z <= PZ1 - 1; z++) set(tx1, RAIL_Y, z, B.IRON_BARS);
    // switchback flights: 10 half-block steps along x, landings (2 x 6) at both ends, alternating sides
    let level = ROUTE.floorY; // walking level at the start landing
    for (let f = 0; f < 12 && level - 0.5 > G; f++) {
      const east = f % 2 === 0, zs = east ? [4, 5] : [8, 9];
      for (let i = 1; i <= 10; i++) {
        const h = level - 0.5 * i;
        if (h <= G) break;
        const x = east ? tx0 + 2 + i : tx0 + 13 - i;
        const yTop = Math.floor(h);
        for (const z of zs) {
          if (h === yTop) { set(x, yTop - 1, z, B.DURASTEEL); set(x, yTop - 2, z, B.DURASTEEL_DARK); }
          else { set(x, yTop, z, B.STONE_BRICK_SLAB); set(x, yTop - 1, z, B.DURASTEEL_DARK); }
        }
      }
      level -= 5;
      // landing floor (a full block below the walking level) at the far end
      const lx = east ? [tx0 + 13, tx0 + 14] : [tx0 + 1, tx0 + 2];
      if (level > G) for (const x of lx) for (let z = 4; z <= 9; z++) { set(x, level - 1, z, B.DECK_PLATE); set(x, level - 2, z, B.DURASTEEL_DARK); }
      // wall lamp at each landing (in the track-side wall)
      if (level > G) set(east ? tx1 - 1 : tx0 + 1, level + 2, PZ0, B.GLOW_PANEL);
    }
  }
  // station name boards on the canopy fascia facing the track
  if (inX(px0, px1) && DECK_Z0 - 1 >= cz0 && DECK_Z0 - 1 <= cz1) {
    const mid = Math.floor((px0 + px1) / 2);
    for (let x = mid - 3; x <= mid + 4; x++) if (x >= cx0 && x <= cx1) set(x, CANOPY_Y - 1, DECK_Z0 - 1, B.HOLO_SIGN);
  }
  if (L.concourse) fillConcourse(set, gen, L, cx0, cx1, cz0, cz1);
  if (L.roofStair) fillRoofStair(set, L, cx0, cx1, cz0, cz1);
}

// Coruscant: glass-walled concourse continuing the spaceport bridge (floor y 90, walk on 91) west to the tower top
// (walk on 92): a half-slab step along its west edge for z 3..10, a wall with the "TO TRAINS" sign in front of the
// buffer stops for z <= 2, lamps in the glass roof, pillars to the ground, and a "TO SPACEPORT" board facing the
// platform over the step.
function fillConcourse(set, gen, L, cx0, cx1, cz0, cz1) {
  const C = L.concourse, F = C.floor, bx0 = SPACEPORT.bridge.x0;
  if (cx1 < C.x0 || cx0 > C.x1 || cz1 < C.wallN || cz0 > C.wallS) return;
  const stripeX = C.x0 + 5;   // the floor stripe runs along z = 0, turns south and leads to the step
  for (let x = Math.max(cx0, C.x0); x <= Math.min(cx1, C.x1); x++) for (let z = Math.max(cz0, C.wallN); z <= Math.min(cz1, C.wallS); z++) {
    set(x, F - 1, z, B.DURASTEEL_DARK);                                                            // underside
    const wall = z === C.wallN || z === C.wallS || (x === C.x1 && z >= C.z1 - 3) || (x === C.x0 && z <= PZ0 - 1);
    if (wall) {
      set(x, F, z, B.DURASTEEL_DARK); set(x, F + 1, z, B.DURASTEEL_DARK);
      for (let y = F + 2; y <= F + 4; y++) set(x, y, z, B.STEEL_GLASS);
      if (x === C.x0 && z >= -5 && z <= 1) set(x, F + 4, z, B.HOLO_SIGN);                           // holo band over the "TO TRAINS" sign
      set(x, F + 5, z, B.DURASTEEL);
      continue;
    }
    const stripe = (z === 0 && x >= stripeX) || (x === stripeX && z >= 0 && z <= 7) || (z === 7 && x > C.x0 && x <= stripeX);
    const floorLight = ((Math.abs(z) === 5 || z === 9) && (x & 3) === 0);
    set(x, F, z, stripe ? B.PANEL_STRIPE : floorLight ? B.GLOW_PANEL : B.DURASTEEL);
    for (let y = F + 1; y <= F + 4; y++) set(x, y, z, 0);
    const beam = (bx0 - x) % 7 === 0, lamp = (x === C.x0 + 2 || x === C.x1 - 3) && (z === -3 || z === 3 || z === 9);
    set(x, F + 5, z, beam ? B.DURASTEEL : lamp ? B.GLOW_PANEL : B.STEEL_GLASS);                     // glass roof with beams and lamps
    if (x === C.x0) {                                                                              // step up to the tower top + fascia over it
      set(x, F + 1, z, B.STONE_BRICK_SLAB);
      set(x, F + 4, z, z >= 8 ? B.HOLO_SIGN : B.DURASTEEL_DARK);
    }
  }
  // pillars to the ground along both wall lines
  for (const x of [C.x0 + 2, C.x0 + 8]) for (const z of [C.wallN, C.wallS]) if (x >= cx0 && x <= cx1 && z >= cz0 && z <= cz1) {
    for (let y = gen.surfaceHeight(x, z) + 1; y <= F - 2; y++) set(x, y, z, B.DURASTEEL_DARK);
  }
  // text signs: "TO TRAINS" on the west wall (read looking west), "TO SPACEPORT" under the fascia (read looking east)
  for (let k = 0; k < 4; k++) { set(C.x0 + 1, F + 3, 1 - k, B.WALL_SIGN); set(L.tx1, F + 4, 4 + k, B.WALL_SIGN); }
}

// Frontier: the stair from the platform (walk on 92) to the spaceport roof deck (walk on 99) on z 8..9, glass
// balustrades (dark posts every 4 blocks) on both sides, an opening through the canopy and the deck's west kerb,
// guard glass around the opening on the deck, a "TO SPACEPORT" sign on the platform side and a "TO TRAINS" gate on
// the deck at the stair head.
function fillRoofStair(set, L, cx0, cx1, cz0, cz1) {
  const st = L.roofStair, { px0 } = L, d = FRONTIER.deck, W = FRONTIER_DECK_Y;
  if (cx1 < st.x0 - 1 || cx0 > st.x1 + 3 || cz1 < st.z0 - 2 || cz0 > st.z1 + 1) return;
  for (let i = 0; i < st.steps; i++) {
    const x = st.x0 + i;
    if (x < cx0 || x > cx1) continue;
    const h = stairHeight(i), yTop = Math.floor(h), half = h !== yTop;
    for (let z = st.z0; z <= st.z1; z++) {
      if (z < cz0 || z > cz1) continue;
      if (half) { set(x, yTop, z, B.STONE_BRICK_SLAB); set(x, yTop - 1, z, B.DURASTEEL_DARK); }
      else { set(x, yTop - 1, z, B.DURASTEEL); set(x, yTop - 2, z, B.DURASTEEL_DARK); }
      // head room through the canopy / deck layers: the 1.8 high body arrives from the next step up (h + 0.5)
      for (let y = Math.ceil(h); y <= Math.floor(h + 2.3); y++) set(x, y, z, 0);
      if (x === d.x0) { set(x, W, z, 0); set(x, W + 1, z, 0); }                                     // opening in the deck's west kerb
    }
    // balustrades: glass up to two blocks above the step, dark posts every 4, kept out of the canopy / deck layers
    for (const z of [st.z0 - 1, st.z1 + 1]) {
      if (z < cz0 || z > cz1) continue;
      const column = z === PZ1 && (x - px0) % 12 === 2;
      for (let y = FLOOR + 1; y <= yTop + 2; y++) {
        if (column && y <= CANOPY_Y - 1) continue;                                                   // the canopy column stands here
        if (y === CANOPY_Y && x < d.x0) continue;                                                    // canopy roof
        if (x >= d.x0 && (y === CANOPY_Y - 1 || y === CANOPY_Y || (x === d.x0 && y >= W))) continue; // deck layers and its kerb
        if (y === CANOPY_Y - 1 && z === st.z0 - 1 && (x - px0) % 6 === 5) continue;                  // hanging light
        set(x, y, z, (x - st.x0) % 4 === 0 ? B.DURASTEEL_DARK : B.STEEL_GLASS);
      }
    }
  }
  // "TO SPACEPORT" sign on the platform side of the north balustrade (read looking south), with a holo band behind it
  for (let k = 0; k < 4; k++) {
    const x = st.x0 + 7 - k;
    if (x >= cx0 && x <= cx1 && st.z0 - 2 >= cz0 && st.z0 - 2 <= cz1) set(x, FLOOR + 3, st.z0 - 2, B.WALL_SIGN);
    if (x >= cx0 && x <= cx1 && st.z0 - 1 >= cz0 && st.z0 - 1 <= cz1) set(x, FLOOR + 3, st.z0 - 1, B.HOLO_SIGN);
  }
  // gate on the deck at the stair head: posts, header beam with the "TO TRAINS" sign (read looking west), holo top
  const gx = st.x1 + 2;
  if (gx >= cx0 && gx <= cx1) {
    for (const z of [st.z0 - 1, st.z1 + 1]) if (z >= cz0 && z <= cz1) { set(gx, W, z, B.DURASTEEL_DARK); set(gx, W + 1, z, B.DURASTEEL_DARK); }
    for (let z = st.z0 - 1; z <= st.z1 + 1; z++) if (z >= cz0 && z <= cz1) set(gx, W + 2, z, B.DURASTEEL_DARK);
    for (let z = st.z0; z <= st.z1; z++) if (z >= cz0 && z <= cz1) set(gx, W + 3, z, B.HOLO_SIGN);
  }
  if (gx + 1 >= cx0 && gx + 1 <= cx1) for (let k = 0; k < 4; k++) { const z = st.z1 + 1 - k; if (z >= cz0 && z <= cz1) set(gx + 1, W + 2, z, B.WALL_SIGN); }
}

// The platform edge screen (world blocks at z = 3): 'doors' while the train is docked (the door columns are open),
// 'open' along the whole platform while the train rolls through slowly with its doors open (hop on and off),
// 'closed' glass otherwise. Re-applied on every train door / depart / arrive event; chunks generated later read the
// current mode through `edgeMode`.
class StationDoors {
  constructor(game, layouts, train) {
    this.game = game; this.layouts = layouts; this.train = train;
    train.on((ev) => { if (ev === 'doors' || ev === 'arrive' || ev === 'depart') this.apply(); });
  }
  edgeMode(S) {
    const st = this.train.state;
    if (!st || !st.doorsOpen) return 'closed';
    if (st.at === S) return 'doors';
    const x0 = st.x0, x1 = st.x0 + TRAIN_LENGTH;
    return (x1 >= S.platformX0 - 2 && x0 <= S.platformX1 + 2) ? 'open' : 'closed';
  }
  doorsOpenAt(S) { return this.edgeMode(S) !== 'closed'; }
  apply() {
    const world = this.game.world;
    if (!world) return;
    let changed = 0;
    for (const L of this.layouts) {
      const mode = this.edgeMode(L.S);
      for (let x = L.px0; x <= L.tx1; x++) {
        const door = L.doorXs.some((dx) => x === dx || x === dx + 1);
        const open = mode === 'open' || (mode === 'doors' && door);
        for (let y = FLOOR + 1; y <= FLOOR + 2; y++) if (world.setBlock(x, y, PZ0, open ? 0 : B.STEEL_GLASS, true)) changed++;
      }
    }
    if (changed && this.game.terrain && this.game.player) this.game.terrain.remeshDirty(16, this.game.player.pos.x, this.game.player.pos.z);
  }
}

export function registerStations(gen, game, train) {
  const layouts = [stationLayout(ROUTE.frontier), stationLayout(ROUTE.coruscant)];
  const doors = new StationDoors(game, layouts, train);
  for (const L of layouts) {
    gen.addStructure({ name: 'station:' + L.S.name, x0: L.x0, z0: L.z0, x1: L.x1, z1: L.z1, fill: (chunk, g) => fillStation(chunk, g, L, doors.edgeMode(L.S)) });
  }
  // sign text: tiles are baked into the atlas now (before it is finalised); the positions are registered with the
  // world once it exists. Reading direction: a board facing -x is read looking +x, so its text runs -z -> +z, etc.
  const minutes = (PERIOD / 60).toFixed(1);
  const rows = [];
  for (const L of layouts) {
    const dest = L.S === ROUTE.frontier ? 'TO CORUSCANT' : 'TO FRONTIER';
    const tiles = [addSignTiles(dest, 4), addSignTiles(`EVERY ${minutes} MIN`, 4)];
    // the timetable boards face north (-z): a reader looks south, so the text runs from +x to -x
    for (let k = 0; k < 4; k++) { rows.push([L.hallX0 + 23 - k, FLOOR + 2, HALL_Z1 - 1, tiles[0][k]]); rows.push([L.hallX0 + 19 - k, FLOOR + 2, HALL_Z1 - 1, tiles[1][k]]); }
    const toTrains = addSignTiles('TO TRAINS', 4), toPort = addSignTiles('TO SPACEPORT', 4);
    if (L.concourse) {
      const C = L.concourse;
      for (let k = 0; k < 4; k++) { rows.push([C.x0 + 1, C.floor + 3, 1 - k, toTrains[k]]); rows.push([L.tx1, C.floor + 4, 4 + k, toPort[k]]); }
    }
    if (L.roofStair) {
      const st = L.roofStair;
      for (let k = 0; k < 4; k++) { rows.push([st.x0 + 7 - k, FLOOR + 3, st.z0 - 2, toPort[k]]); rows.push([st.x1 + 3, FRONTIER_DECK_Y + 2, st.z1 + 1 - k, toTrains[k]]); }
    }
  }
  const attach = () => {
    if (game.world) { for (const [x, y, z, tile] of rows) game.world.signTiles.set(World.posKey(x, y, z), tile); }
    else setTimeout(attach, 25);
  };
  attach();
  return { layouts, doors };
}
