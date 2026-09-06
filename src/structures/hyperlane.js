// The hyperlane: an elevated straight track at y ~90 along z = 0 from the frontier station (x 240..315) to the
// Coruscant west-edge station (x 2473..2548): deck, guide rails, glow strips, lamps, supports every 32 blocks down
// to the terrain or sea floor, buffer stops. Registered lazily per chunk; `register` also registers the two
// stations and adds the space train to the vehicle manager.
// The train corridor (every route x, z -4..3, y 89..96) holds nothing but the deck, the lips and the rails: lamps
// hang from brackets outside it (z = -5) and the buffer stops sit beyond the docked train's ends.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';
import { ROUTE } from '../vehicles/route.js';
import { SpaceTrain } from '../vehicles/train.js';
import { registerStations, stationLayout } from './stations.js';
import { lowerLocal, lowerGround } from '../worldgen.js';
import { lowerFloorAt } from '../coruscant/lowercity/plan.js';

export const LOWER_PYLON_EVERY = 24;   // bridge pylon spacing over the lower city (spec section 4)

// World-coordinate block setter bounded to one chunk (returns false outside it).
export function chunkSetter(chunk) {
  const bx = chunk.cx * CS, bz = chunk.cz * CS, blocks = chunk.blocks;
  return (x, y, z, id) => {
    const lx = x - bx, lz = z - bz;
    if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return false;
    blocks[(lx * CS + lz) * CH + y] = id;
    return true;
  };
}

const DECK = ROUTE.deckY, RAIL = ROUTE.railY;
export const DECK_Z0 = -4, DECK_Z1 = 3; // deck spans z = -4..3 (8 wide); the train uses -3..2
// walkway on the platform side (z 3..5, floor top level with the car sills at y 92) with a railing at z 6: hopping
// off a slow train or off the roof lands here instead of 40 blocks down; the stations fill their own platforms
export const WALK_Z0 = 3, WALK_Z1 = 5, WALK_Y = ROUTE.floorY - 1;
let walkSkip = null;   // the stations' own footprints (platform, stair tower, concourse), resolved lazily (module cycle)
const onWalkway = (x) => {
  if (!walkSkip) walkSkip = [ROUTE.frontier, ROUTE.coruscant].map((S) => { const L = stationLayout(S); return [L.x0 - 1, L.x1 + 1]; });
  return x >= ROUTE.x0 + 2 && x <= ROUTE.x1 - 2 && !walkSkip.some(([a, b]) => x >= a && x <= b);
};

function fillHyperlane(chunk, gen) {
  const set = chunkSetter(chunk);
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  const xa = Math.max(bx, ROUTE.x0), xb = Math.min(bx + CS - 1, ROUTE.x1);
  if (xa > xb || bz + CS <= DECK_Z0 - 2 || bz > WALK_Z1 + 2) return;
  for (let x = xa; x <= xb; x++) {
    // deck + girder
    for (let z = DECK_Z0; z <= DECK_Z1; z++) set(x, DECK, z, z === DECK_Z0 || z === DECK_Z1 ? B.DURASTEEL : B.DURASTEEL_DARK);
    for (let z = -2; z <= 1; z++) set(x, DECK - 1, z, B.DURASTEEL_DARK);
    // edge lips + blue glow studs every 8 blocks
    const stud = x % 8 === 4;
    set(x, RAIL, DECK_Z0, stud ? B.GLOW_PANEL_BLUE : B.DURASTEEL_DARK);
    set(x, RAIL, DECK_Z1, stud ? B.GLOW_PANEL_BLUE : B.DURASTEEL_DARK);
    // guide rails
    set(x, RAIL, -2, B.RAIL); set(x, RAIL, 1, B.RAIL);
    // lamps every 32 blocks on brackets off the north lip (z = -5, outside the train corridor)
    if (x % 32 === 16) { set(x, DECK, DECK_Z0 - 1, B.DURASTEEL); for (let y = RAIL; y <= RAIL + 2; y++) set(x, y, DECK_Z0 - 1, B.DURASTEEL_DARK); set(x, RAIL + 3, DECK_Z0 - 1, B.CITY_LAMP); }
    // supports every 32 blocks: a 2 x 4 shaft with a wide capital under the deck, down to terrain / sea floor. Over
    // the lower city (west of the plateau) they are bridge pylons every 24 blocks down to the lowest deck: the
    // track runs above the west freight trench, so they stand on its floor, with a lit collar at the deck level.
    const lower = lowerLocal(x, 0);
    const every = lower ? LOWER_PYLON_EVERY : ROUTE.supportEvery;
    if (x % every === 0 || x % every === 1) {
      for (let z = DECK_Z0; z <= DECK_Z1; z++) set(x, DECK - 2, z, B.DURASTEEL_DARK);
      for (let z = -3; z <= 2; z++) set(x, DECK - 3, z, B.DURASTEEL_DARK);
      for (let z = -2; z <= 1; z++) {
        const ground = lower ? lowerFloorAt(x, z) : gen.surfaceHeight(x, z);
        for (let y = DECK - 4; y > ground; y--) {
          const band = (y & 7) === 0;
          set(x, y, z, band ? B.PANEL_STRIPE : (z === -2 || z === 1 ? B.DURASTEEL : B.DURASTEEL_DARK));
        }
        for (let y = ground; y >= ground - 2 && y > 0; y--) set(x, y, z, B.DURASTEEL_DARK); // footing
        if (lower && lowerGround(lower.d) > ground) set(x, lowerGround(lower.d) + 1, z, z === -2 || z === 1 ? B.GLOW_PANEL_BLUE : B.DURASTEEL);
      }
    }
    // walkway: two courses (support + floor) over the south lip, railing with glow studs, lamps every 32
    if (onWalkway(x)) {
      for (let z = WALK_Z0; z <= WALK_Z1; z++) { set(x, WALK_Y - 1, z, B.DURASTEEL_DARK); set(x, WALK_Y, z, z === WALK_Z1 ? B.DURASTEEL : (x % 8 === 0 ? B.PANEL_STRIPE : B.DECK_PLATE)); }
      set(x, WALK_Y - 1, WALK_Z1 + 1, B.DURASTEEL_DARK); set(x, WALK_Y, WALK_Z1 + 1, B.DURASTEEL);
      set(x, WALK_Y + 1, WALK_Z1 + 1, x % 8 === 4 ? B.GLOW_PANEL_BLUE : B.IRON_BARS);
      if (x % 32 === 0) { for (let y = WALK_Y + 1; y <= WALK_Y + 3; y++) set(x, y, WALK_Z1 + 1, B.DURASTEEL_DARK); set(x, WALK_Y + 4, WALK_Z1 + 1, B.CITY_LAMP); }
    }
    // buffer stops
    if (x <= ROUTE.x0 + 1 || x >= ROUTE.x1 - 1) for (let z = -3; z <= 2; z++) for (let y = RAIL; y <= RAIL + 2; y++) set(x, y, z, y === RAIL + 2 ? B.PANEL_RED : B.DURASTEEL);
  }
}

// The track alone (deck, rails, supports, walkway): what the node tests register without the train and stations.
export function registerTrack(gen) {
  gen.addStructure({ name: 'hyperlane', x0: ROUTE.x0, z0: DECK_Z0 - 1, x1: ROUTE.x1 + 1, z1: WALK_Z1 + 2, fill: fillHyperlane });
}

export async function register(gen, game) {
  registerTrack(gen);
  const train = new SpaceTrain();
  registerStations(gen, game, train);
  game.spaceTrain = train;
  // the vehicle manager (game.vehicles), world and atlas exist only after the terrain is set up: attach then
  const attach = () => {
    if (game.vehicles && game.world && game.atlas && game.scene) { if (!game.vehicles.list.includes(train)) game.vehicles.add(train); }
    else setTimeout(attach, 25);
  };
  attach();
}
