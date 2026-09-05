// The hyperlane: an elevated straight track at y ~90 along z = 0 from the frontier station (x 240..300) to the
// Coruscant west-edge station (x 2500..2560): deck, guide rails, glow strips, lamps, supports every 32 blocks down
// to the terrain or sea floor, buffer stops. Registered lazily per chunk; `register` also registers the two
// stations and adds the space train to the vehicle manager.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';
import { ROUTE } from '../vehicles/route.js';
import { SpaceTrain } from '../vehicles/train.js';
import { registerStations } from './stations.js';

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

function fillHyperlane(chunk, gen) {
  const set = chunkSetter(chunk);
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  const xa = Math.max(bx, ROUTE.x0), xb = Math.min(bx + CS - 1, ROUTE.x1);
  if (xa > xb || bz + CS <= DECK_Z0 - 2 || bz > DECK_Z1 + 2) return;
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
    // lamps on the north lip every 32 blocks
    if (x % 32 === 16) { set(x, RAIL + 1, DECK_Z0, B.DURASTEEL_DARK); set(x, RAIL + 2, DECK_Z0, B.DURASTEEL_DARK); set(x, RAIL + 3, DECK_Z0, B.CITY_LAMP); }
    // supports every 32 blocks: a 2 x 4 shaft with a wide capital under the deck, down to terrain / sea floor
    if (x % ROUTE.supportEvery === 0 || x % ROUTE.supportEvery === 1) {
      for (let z = DECK_Z0; z <= DECK_Z1; z++) set(x, DECK - 2, z, B.DURASTEEL_DARK);
      for (let z = -3; z <= 2; z++) set(x, DECK - 3, z, B.DURASTEEL_DARK);
      for (let z = -2; z <= 1; z++) {
        const ground = gen.surfaceHeight(x, z);
        for (let y = DECK - 4; y > ground; y--) {
          const band = (y & 7) === 0;
          set(x, y, z, band ? B.PANEL_STRIPE : (z === -2 || z === 1 ? B.DURASTEEL : B.DURASTEEL_DARK));
        }
        for (let y = ground; y >= ground - 2 && y > 0; y--) set(x, y, z, B.DURASTEEL_DARK); // footing
      }
    }
    // buffer stops
    if (x <= ROUTE.x0 + 1 || x >= ROUTE.x1 - 1) for (let z = -3; z <= 2; z++) for (let y = RAIL; y <= RAIL + 2; y++) set(x, y, z, y === RAIL + 2 ? B.PANEL_RED : B.DURASTEEL);
  }
}

export async function register(gen, game) {
  gen.addStructure({ name: 'hyperlane', x0: ROUTE.x0, z0: DECK_Z0 - 1, x1: ROUTE.x1 + 1, z1: DECK_Z1 + 2, fill: fillHyperlane });
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
