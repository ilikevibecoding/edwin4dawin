// The two hyperlane stations (frontier, Coruscant west edge): a 60 x 8 platform at track level with glass edge doors
// that open with the train, a canopy, a waiting hall with benches, kiosks and timetable boards (holo panels + text
// signs), and a switchback stair tower down to the ground. Lazy per-chunk fills; the edge doors are toggled as world
// blocks whenever the train's doors change.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS } from '../constants.js';
import { addSignTiles } from '../textures.js';
import { World } from '../world.js';
import { ROUTE, doorWorldXs, PERIOD } from '../vehicles/route.js';
import { chunkSetter, DECK_Z0 } from './hyperlane.js';

const FLOOR = ROUTE.floorY - 1;      // 91: platform / hall floor blocks (walk on 92)
const PZ0 = ROUTE.platformZ0, PZ1 = ROUTE.platformZ1; // 3..10
const HALL_Z0 = PZ1 + 1, HALL_Z1 = PZ1 + 14;          // 11..24
const CANOPY_Y = 98, HALL_ROOF_Y = 97;
const PLATFORM_LEN = 60, TOWER_LEN = 16;               // tower (stair head) continues the platform eastwards

// Geometry of one station derived from the route entry.
export function stationLayout(S) {
  const px0 = S.platformX0, px1 = px0 + PLATFORM_LEN - 1;
  const tx0 = px1 + 1, tx1 = tx0 + TOWER_LEN - 1;        // tower footprint (walls included)
  return {
    S, px0, px1, tx0, tx1,
    hallX0: px0 + 10, hallX1: px0 + 49,
    doorXs: doorWorldXs(S.dockX0),
    // structure AABB (x1/z1 exclusive)
    x0: px0 - 1, x1: tx1 + 2, z0: DECK_Z0 - 3, z1: HALL_Z1 + 2,
  };
}

// ground walking level under the stair tower (max terrain in its footprint + 1), deterministic from the generator
function towerGround(gen, L) {
  let g = 0;
  for (let x = L.tx0; x <= L.tx1; x++) for (let z = PZ0; z <= PZ1; z++) g = Math.max(g, gen.surfaceHeight(x, z));
  return g + 1;
}

function fillStation(chunk, gen, L, doorsOpen) {
  const set = chunkSetter(chunk);
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  const cx0 = bx, cx1 = bx + CS - 1, cz0 = bz, cz1 = bz + CS - 1;
  const inX = (a, b) => !(b < cx0 || a > cx1);
  const inZ = (a, b) => !(b < cz0 || a > cz1);
  const xa = Math.max(cx0, L.px0), xb = Math.min(cx1, L.tx1);
  const { px0, px1, tx0, tx1, S } = L;

  // ---------------------------------------------------------------- clear the air volume of the station
  if (inX(L.px0, L.tx1) && inZ(DECK_Z0 - 2, HALL_Z1)) {
    for (let x = Math.max(cx0, L.px0); x <= Math.min(cx1, L.tx1); x++) for (let z = Math.max(cz0, PZ0); z <= Math.min(cz1, HALL_Z1); z++) for (let y = FLOOR + 1; y <= CANOPY_Y + 1; y++) set(x, y, z, 0);
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
    }
  }
  // ---------------------------------------------------------------- edge doors (z = 3) with boards above
  if (xa <= xb && PZ0 >= cz0 && PZ0 <= cz1) {
    for (let x = xa; x <= xb; x++) {
      let door = false;
      for (const dx of L.doorXs) if (x === dx || x === dx + 1) door = true;
      set(x, FLOOR + 1, PZ0, door && doorsOpen ? 0 : B.STEEL_GLASS);
      set(x, FLOOR + 2, PZ0, door && doorsOpen ? 0 : B.STEEL_GLASS);
      set(x, FLOOR + 3, PZ0, door ? B.HOLO_SIGN : (x % 6 === 3 ? B.GLOW_PANEL : B.DURASTEEL_DARK));
    }
  }
  // ---------------------------------------------------------------- canopy over track + platform (x <= px1)
  if (inX(px0, px1) && inZ(DECK_Z0 - 1, PZ1)) {
    for (let x = Math.max(cx0, px0); x <= Math.min(cx1, px1); x++) for (let z = Math.max(cz0, DECK_Z0 - 1); z <= Math.min(cz1, PZ1); z++) {
      const glass = (x - px0) % 4 === 1 || (x - px0) % 4 === 2;
      set(x, CANOPY_Y, z, glass && z > DECK_Z0 - 1 && z < PZ1 ? B.STEEL_GLASS : B.DURASTEEL_DARK);
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
    const G = towerGround(gen, L);
    for (let x = Math.max(cx0, tx0); x <= Math.min(cx1, tx1); x++) for (let z = Math.max(cz0, PZ0); z <= Math.min(cz1, PZ1); z++) {
      const wall = x === tx0 || x === tx1 || z === PZ0 || z === PZ1;
      const ground = gen.surfaceHeight(x, z);
      if (wall) {
        for (let y = Math.min(ground, G - 1); y < FLOOR; y++) set(x, y, z, y < G ? B.DURASTEEL_DARK : (y % 4 === 2 && y > G + 2 && (x === tx0 || x === tx1 || (z === PZ1)) ? B.STEEL_GLASS : B.DURASTEEL));
        // exit on the east side at ground level
        if (x === tx1 && z >= PZ0 + 1 && z <= PZ1 - 1) for (let y = G; y <= G + 2; y++) set(x, y, z, 0);
      } else {
        // hollow interior with a solid core between the two flights, foundation up to the ground floor
        for (let y = Math.min(ground, G - 1); y < FLOOR; y++) set(x, y, z, 0);
        for (let y = Math.min(ground, G - 1); y < G; y++) set(x, y, z, B.DURASTEEL_DARK);
        if ((z === 6 || z === 7) && x >= tx0 + 3 && x <= tx0 + 12) for (let y = G; y < FLOOR; y++) set(x, y, z, (y & 3) === 1 && x % 5 === 2 ? B.GLOW_PANEL : B.DURASTEEL);
      }
    }
    // stair head: open the platform floor over the first flight, railings around it
    for (let x = tx0 + 3; x <= tx0 + 12; x++) for (const z of [4, 5]) set(x, FLOOR, z, 0);
    for (let x = tx0 + 3; x <= tx0 + 12; x++) set(x, FLOOR + 1, 6, B.IRON_BARS);
    for (const z of [4, 5]) { set(tx0 + 2, FLOOR + 1, z, B.IRON_BARS); set(tx0 + 13, FLOOR + 1, z, B.IRON_BARS); }
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
}

// Toggles the platform edge doors (world blocks) whenever the train's doors change; chunks generated later read the
// current state through `doorsOpenAt`.
class StationDoors {
  constructor(game, layouts, train) {
    this.game = game; this.layouts = layouts; this.train = train;
    train.on((ev) => { if (ev === 'doors' || ev === 'arrive') this.apply(); });
  }
  doorsOpenAt(S) { const st = this.train.state; return !!(st && st.at === S && st.doorsOpen); }
  apply() {
    const world = this.game.world;
    if (!world) return;
    let changed = 0;
    for (const L of this.layouts) {
      const open = this.doorsOpenAt(L.S);
      for (const dx of L.doorXs) for (let k = 0; k < 2; k++) for (let y = FLOOR + 1; y <= FLOOR + 2; y++) {
        if (world.setBlock(dx + k, y, PZ0, open ? 0 : B.STEEL_GLASS, true)) changed++;
      }
    }
    if (changed && this.game.terrain && this.game.player) this.game.terrain.remeshDirty(16, this.game.player.pos.x, this.game.player.pos.z);
  }
}

export function registerStations(gen, game, train) {
  const layouts = [stationLayout(ROUTE.frontier), stationLayout(ROUTE.coruscant)];
  const doors = new StationDoors(game, layouts, train);
  for (const L of layouts) {
    gen.addStructure({ name: 'station:' + L.S.name, x0: L.x0, z0: L.z0, x1: L.x1, z1: L.z1, fill: (chunk, g) => fillStation(chunk, g, L, doors.doorsOpenAt(L.S)) });
  }
  // timetable text: sign tiles are baked into the atlas now (before it is finalised); the positions are registered
  // with the world once it exists
  const minutes = (PERIOD / 60).toFixed(1);
  const rows = [];
  for (const L of layouts) {
    const dest = L.S === ROUTE.frontier ? 'TO CORUSCANT' : 'TO FRONTIER';
    const texts = [[`${dest}`, `EVERY ${minutes} MIN`]];
    const tiles = [addSignTiles(texts[0][0], 4), addSignTiles(texts[0][1], 4)];
    for (let k = 0; k < 4; k++) { rows.push([L.hallX0 + 16 + k, FLOOR + 2, HALL_Z1 - 1, tiles[0][k]]); rows.push([L.hallX0 + 20 + k, FLOOR + 2, HALL_Z1 - 1, tiles[1][k]]); }
  }
  const attach = () => {
    if (game.world) { for (const [x, y, z, tile] of rows) game.world.signTiles.set(World.posKey(x, y, z), tile); }
    else setTimeout(attach, 25);
  };
  attach();
  return { layouts, doors };
}
