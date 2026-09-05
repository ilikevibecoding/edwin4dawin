// Deck planner: one 2D plan per deck (N x N cells, each cell = 7 block ids for floor / 5 clear rows / ceiling),
// built lazily and deterministically from (seed, deck). The chunk filler only looks blocks up in these plans, so the
// whole interior (corridors, rooms, turbolift/stair modules, reactor shaft, hangar, tower) is decided here.
//
// Build order per deck: interior mask -> reactor shaft -> corridors (3 radials + rings) -> hangar/tower zones ->
// stair modules (+ passages to the nearest corridor) -> fixed rooms -> seeded generic rooms along the corridor walls
// -> render cell types into blocks -> furnish rooms -> module stairs -> reactor catwalks.
import { B } from '../blocks.js';
import { RNG } from '../rng.js';
import {
  N, X0, Z0, DECK_H, N_DECKS, CY, deckFloorY, deckInteriorRadius, TOP_SPHERE_DECK, REACTOR_R, REACTOR_WALL_R, CATWALK_EVERY,
  RADIALS, RINGS, CORR_HALF, WALL_HALF, MODULES, HANGAR, TOWER, bowlDist2, DISH,
} from './layout.js';
import { GENERIC_TEMPLATES, forcedTemplatesFor, furnishRoom, placeFixedRooms } from './rooms.js';
import { stampHangar } from './hangar.js';

export const T = {
  OUT: 0, FREE: 1, SOLID: 2, CORR: 3, CWALL: 4, ROOM: 5, RWALL: 6, DOOR: 7, PASS: 8, MODULE: 9,
  REACTOR: 10, RWALLX: 11, RDOOR: 12, HANGAR: 13, HWALL: 14, VOID: 15,
};
// cell types a player can stand in (used by passage carving and the connectivity test)
export const WALKABLE = new Uint8Array(32);
for (const t of [T.CORR, T.ROOM, T.DOOR, T.PASS, T.HANGAR, T.RDOOR]) WALKABLE[t] = 1;

const { AIR, DURASTEEL, DURASTEEL_DARK, PANEL_BLACK, PANEL_STRIPE, GLOW_PANEL, GLOW_PANEL_BLUE, DECK_PLATE, STEEL_GLASS, CHROME, IRON_BARS, IRON_BLOCK, STONE_BRICK_SLAB } = B;

export const cellIndex = (x, z) => (x - X0) * N + (z - Z0);
export const inGrid = (x, z) => x >= X0 && z >= Z0 && x < X0 + N && z < Z0 + N;
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// module local frame (door side = +x) -> world offset
export const rotate = (side, fx, fz) => (side === 0 ? [fx, fz] : side === 1 ? [-fz, fx] : side === 2 ? [-fx, -fz] : [fz, -fx]);
// stair ring order (Chebyshev distance 3 cells around the shaft, landing first, then 14 half-block steps)
export const RING_ORDER = (() => {
  const o = [];
  for (let k = 0; k <= 6; k++) o.push([3, -3 + k]);
  o.push([2, 3], [1, 3], [0, 3], [-1, 3], [-2, 3], [-3, 3]);
  for (let k = 2; k >= -3; k--) o.push([-3, k]);
  for (let k = -2; k <= 2; k++) o.push([k, -3]);
  return o;
})();

export class DeckPlan {
  constructor(d) {
    this.d = d;
    this.y0 = deckFloorY(d);
    this.type = new Uint8Array(N * N);
    this.blocks = new Uint8Array(N * N * DECK_H);
    this.roomOf = new Int16Array(N * N).fill(-1);
    this.strip = new Uint8Array(N * N);   // bit 1: corridor light strip, bit 2: bulkhead frame
    this.rooms = [];
    this.moduleDoors = new Map();        // module index -> door connected on this deck
    this.hangarDoors = [];
    this.warnings = [];
  }
  t(x, z) { return inGrid(x, z) ? this.type[cellIndex(x, z)] : T.OUT; }
  setT(x, z, t) { if (inGrid(x, z)) this.type[cellIndex(x, z)] = t; }
  set(x, z, dy, id) { if (inGrid(x, z) && dy >= 0 && dy < DECK_H) this.blocks[cellIndex(x, z) * DECK_H + dy] = id; }
  get(x, z, dy) { return inGrid(x, z) ? this.blocks[cellIndex(x, z) * DECK_H + dy] : DURASTEEL_DARK; }
  col(x, z, arr) { if (!inGrid(x, z)) return; const b = cellIndex(x, z) * DECK_H; for (let i = 0; i < DECK_H; i++) this.blocks[b + i] = arr[i]; }
  fillCol(x, z, dy0, dy1, id) { for (let dy = dy0; dy <= dy1; dy++) this.set(x, z, dy, id); }
}

// ------------------------------------------------------------------------------------------------ geometry passes
function interiorMask(P) {
  const d = P.d, rIn = deckInteriorRadius(d) - 0.75;
  if (d > TOP_SPHERE_DECK) return;   // tower decks: everything is OUT except what tower() stamps
  const type = P.type, y0 = P.y0;
  const skin2 = (Math.sqrt(DISH.skin2) + 1) ** 2;
  for (let ix = 0; ix < N; ix++) {
    const x = ix + X0;
    for (let iz = 0; iz < N; iz++) {
      const z = iz + Z0, r = Math.sqrt(x * x + z * z);
      let t = r < rIn ? T.FREE : T.OUT;
      if (t === T.FREE && z > 30) { // superlaser bowl skin intrudes into the +z upper interior
        for (let y = y0; y < y0 + DECK_H; y++) {
          if (bowlDist2(x + 0.5, y + 0.5 - CY, z + 0.5) < skin2) { t = T.OUT; break; }
        }
      }
      type[ix * N + iz] = t;
    }
  }
}

function reactor(P) {
  if (P.d > TOP_SPHERE_DECK) return;
  for (let x = -REACTOR_WALL_R; x <= REACTOR_WALL_R; x++) for (let z = -REACTOR_WALL_R; z <= REACTOR_WALL_R; z++) {
    const r = Math.hypot(x, z);
    if (r < REACTOR_R) P.setT(x, z, T.REACTOR);
    else if (r < REACTOR_WALL_R) P.setT(x, z, T.RWALLX);
  }
}

function corridors(P) {
  if (P.d > TOP_SPHERE_DECK) return;
  const rIn = deckInteriorRadius(P.d) - 0.75;
  const rings = RINGS.filter((rr) => rr + WALL_HALF + 1 < rIn);
  const rad = RADIALS.map((phi) => ({ ux: Math.sin(phi), uz: Math.cos(phi), nx: Math.cos(phi), nz: -Math.sin(phi) }));
  const type = P.type, strip = P.strip;
  for (let ix = 0; ix < N; ix++) {
    const x = ix + X0;
    for (let iz = 0; iz < N; iz++) {
      const i = ix * N + iz, t0 = type[i];
      if (t0 !== T.FREE && t0 !== T.RWALLX) continue;
      const z = iz + Z0;
      let corr = false, wall = false, s = 0;
      for (const a of rad) {
        const along = x * a.ux + z * a.uz, perp = x * a.nx + z * a.nz, ap = Math.abs(perp);
        if (along < REACTOR_R - 0.5 || ap > WALL_HALF) continue;
        if (ap <= CORR_HALF) { corr = true; if (ap < 0.5) s |= 1; if (Math.round(along) % 12 === 0) s |= 2; }
        else wall = true;
      }
      if (t0 === T.FREE) {
        const r = Math.hypot(x, z), th = Math.atan2(x, z);
        for (const rr of rings) {
          const dr = Math.abs(r - rr);
          if (dr > WALL_HALF) continue;
          if (dr <= CORR_HALF) { corr = true; if (dr < 0.5) s |= 1; if (Math.floor(((th + Math.PI) * rr) % 12) === 0) s |= 2; }
          else wall = true;
        }
        if (corr) { type[i] = T.CORR; strip[i] = s; }
        else if (wall) { type[i] = T.CWALL; strip[i] = s & 2; }
      } else if (corr) type[i] = T.RDOOR; // radial corridor meets the reactor wall
    }
  }
}

// ------------------------------------------------------------------------------------------------ passages
// Breadth-first from (sx, sz) through non-room cells to the nearest walkable cell; carves the path as PASS.
export function carvePassage(P, sx, sz, maxLen = 9) {
  if (!inGrid(sx, sz)) return false;
  const t0 = P.t(sx, sz);
  if (WALKABLE[t0]) return true;
  if (t0 !== T.FREE && t0 !== T.SOLID && t0 !== T.CWALL) return false;
  const prev = new Map();
  const key = (x, z) => (x + 512) * 4096 + (z + 512);   // offset so negative local coordinates decode correctly
  const queue = [[sx, sz, 0]];
  prev.set(key(sx, sz), null);
  let found = null;
  while (queue.length && !found) {
    const [x, z, len] = queue.shift();
    for (const [dx, dz] of DIR4) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (prev.has(k) || !inGrid(nx, nz)) continue;
      const t = P.t(nx, nz);
      if (t === T.CORR || t === T.PASS || t === T.HANGAR) { prev.set(k, key(x, z)); found = k; break; }   // corridor network reached (never a door)
      if ((t === T.FREE || t === T.SOLID || t === T.CWALL) && len + 1 < maxLen) { prev.set(k, key(x, z)); queue.push([nx, nz, len + 1]); }
    }
  }
  if (!found) return false;
  // walk back from the cell before the corridor to the start, carving
  let k = prev.get(found);
  while (k !== null && k !== undefined) {
    const x = Math.floor(k / 4096) - 512, z = (k % 4096) - 512;
    P.setT(x, z, T.PASS);
    k = prev.get(k);
  }
  return true;
}

// ------------------------------------------------------------------------------------------------ modules
function modules(P) {
  const d = P.d;
  MODULES.forEach((m, mi) => {
    if (d < m.d0 || d > m.d1) return;
    for (let fx = -4; fx <= 4; fx++) for (let fz = -4; fz <= 4; fz++) {
      const [dx, dz] = rotate(m.side, fx, fz);
      const x = m.mx + dx, z = m.mz + dz;
      if (P.t(x, z) === T.CORR) P.warnings.push(`module ${m.name} overlaps a corridor at ${x},${z} deck ${d}`);
      P.setT(x, z, T.MODULE);
    }
    const [ox, oz] = rotate(m.side, 5, 0);
    const connected = carvePassage(P, m.mx + ox, m.mz + oz, 9);
    P.moduleDoors.set(mi, connected);
    if (!connected) P.warnings.push(`module ${m.name} has no corridor connection on deck ${d}`);
  });
}

// ------------------------------------------------------------------------------------------------ tower zone
// Bridge deck: the 35 x 25 footprint (its back part lies inside the hull; the deck's 0-degree radial corridor ends
// at the back wall, which gets a door there). Throne decks: the 23-wide footprint plus the balcony; the stair
// module's housing continues through the double-height room as a solid pillar on the upper deck.
function tower(P) {
  const d = P.d, tw = TOWER;
  if (d < tw.bridgeDeck) return;
  const inModule = (x, z) => Math.max(Math.abs(x - tw.module.mx), Math.abs(z - tw.module.mz)) <= 4;
  if (d === tw.bridgeDeck) {
    for (let x = tw.x0; x <= tw.x1; x++) for (let z = tw.z0; z <= tw.z1; z++) {
      if (x === tw.x0 || x === tw.x1 || z === tw.z0 || z === tw.z1) P.setT(x, z, T.RWALL);
      else if (!inModule(x, z)) P.setT(x, z, T.ROOM);
    }
    for (let x = tw.tx0; x <= tw.tx1; x++) for (let z = tw.z1 + 1; z <= tw.balconyZ1; z++) P.setT(x, z, T.VOID);   // air under the balcony
    for (let x = -1; x <= 1; x++) if (P.t(x, tw.z0 - 1) === T.CORR) P.setT(x, tw.z0, T.DOOR);
  } else {
    for (let x = tw.tx0; x <= tw.tx1; x++) for (let z = tw.z0; z <= tw.balconyZ1; z++) {
      if (x === tw.tx0 || x === tw.tx1 || z === tw.z0 || z === tw.balconyZ1) P.setT(x, z, T.RWALL);
      else if (inModule(x, z)) { if (d === tw.throneTop) P.setT(x, z, T.SOLID); }
      else P.setT(x, z, T.ROOM);
    }
  }
  const mk = (name, x0, x1, z0, z1) => P.rooms.push({ id: P.rooms.length, name, d, x0, x1, z0, z1, fixed: true, ox: x0, oz: z0, ax: 1, az: 0, dx: 0, dz: 1, w: x1 - x0 + 1, dp: z1 - z0 + 1 });
  if (d === tw.bridgeDeck) mk('bridge', tw.x0 + 1, tw.x1 - 1, tw.z0 + 1, tw.z1 - 1);
  if (d === tw.throneDeck) mk('throne', tw.tx0 + 1, tw.tx1 - 1, tw.z0 + 1, tw.balconyZ1 - 1);
  if (d === tw.throneTop) mk('throneUpper', tw.tx0 + 1, tw.tx1 - 1, tw.z0 + 1, tw.balconyZ1 - 1);
  for (const room of P.rooms) for (let x = room.x0; x <= room.x1; x++) for (let z = room.z0; z <= room.z1; z++) if (P.t(x, z) === T.ROOM) P.roomOf[cellIndex(x, z)] = room.id;
}

// ------------------------------------------------------------------------------------------------ generic rooms
// Places a room of template `tpl` behind corridor-wall anchor (ax, az) whose corridor neighbour is at (cx, cz).
function tryPlaceRoom(P, tpl, ax, az, cx, cz, rng) {
  const dx = ax - cx, dz = az - cz;          // into the room
  const acx = -dz, acz = dx;                 // across the door
  const w = rng.int(tpl.w[0], tpl.w[1]), dp = rng.int(tpl.dp[0], tpl.dp[1]);
  const offsets = []; for (let o = 0; o < w; o++) offsets.push(o);
  rng.shuffle(offsets);
  const wallOk = tpl.wallTypes || [T.FREE, T.CWALL, T.RWALL, T.OUT];
  for (const o of offsets) {
    const ox = ax + dx - acx * o, oz = az + dz - acz * o;   // interior cell (u=0, v=0)
    let ok = true, rMin = Infinity, rMax = 0;
    for (let v = -1; v <= dp && ok; v++) for (let u = -1; u <= w && ok; u++) {
      const x = ox + acx * u + dx * v, z = oz + acz * u + dz * v;
      if (!inGrid(x, z)) { ok = false; break; }
      const t = P.t(x, z);
      const isWall = v === -1 || v === dp || u === -1 || u === w;
      if (isWall) { if (!wallOk.includes(t)) ok = false; }
      else { if (t !== T.FREE) ok = false; const r = Math.hypot(x, z); if (r < rMin) rMin = r; if (r > rMax) rMax = r; }
    }
    if (!ok) continue;
    if (tpl.accept && !tpl.accept({ rMin, rMax, d: P.d })) continue;
    const room = { id: P.rooms.length, name: tpl.name, d: P.d, ox, oz, ax: acx, az: acz, dx, dz, w, dp, rMin, rMax, doors: [], tpl };
    for (let v = -1; v <= dp; v++) for (let u = -1; u <= w; u++) {
      const x = ox + acx * u + dx * v, z = oz + acz * u + dz * v, i = cellIndex(x, z);
      const isWall = v === -1 || v === dp || u === -1 || u === w;
      if (isWall) { if (P.type[i] === T.FREE) P.type[i] = T.RWALL; }
      else { P.type[i] = T.ROOM; P.roomOf[i] = room.id; }
    }
    // door(s) at the anchor (and its across-neighbour when that is also a corridor-adjacent wall cell)
    P.setT(ax, az, T.DOOR); room.doors.push([ax, az]);
    if (w >= 5 && !tpl.singleDoor) {
      const s = o <= w - 2 ? 1 : -1, bx = ax + acx * s, bz = az + acz * s;
      const bt = P.t(bx, bz), corrSide = P.t(bx - dx, bz - dz);
      if ((bt === T.CWALL || bt === T.RWALL) && corrSide === T.CORR) { P.setT(bx, bz, T.DOOR); room.doors.push([bx, bz]); }
    }
    P.rooms.push(room);
    return room;
  }
  return null;
}

function packRooms(P, rng) {
  if (P.d > TOP_SPHERE_DECK) return;
  const anchors = [];
  for (let ix = 1; ix < N - 1; ix++) for (let iz = 1; iz < N - 1; iz++) {
    if (P.type[ix * N + iz] !== T.CWALL) continue;
    const x = ix + X0, z = iz + Z0;
    for (const [dx, dz] of DIR4) {
      if (P.t(x - dx, z - dz) === T.CORR && P.t(x + dx, z + dz) === T.FREE) { anchors.push([x, z, x - dx, z - dz]); break; }
    }
  }
  rng.shuffle(anchors);
  const forced = forcedTemplatesFor(P.d).slice();
  let forcedTries = 0;
  const totalWeight = GENERIC_TEMPLATES.reduce((s, t) => s + t.weight, 0);
  const pick = () => { let r = rng.next() * totalWeight; for (const t of GENERIC_TEMPLATES) { r -= t.weight; if (r <= 0) return t; } return GENERIC_TEMPLATES[0]; };
  for (const [ax, az, cx, cz] of anchors) {
    if (P.t(ax, az) !== T.CWALL) continue;
    let tpl;
    if (forced.length) { tpl = GENERIC_TEMPLATES.find((t) => t.name === forced[0]); forcedTries++; }
    else tpl = pick();
    const room = tryPlaceRoom(P, tpl, ax, az, cx, cz, rng);
    if (room && forced.length && tpl.name === forced[0]) { forced.shift(); forcedTries = 0; }
    else if (!room && forced.length && forcedTries > 400) { forced.shift(); forcedTries = 0; }
  }
}

// ------------------------------------------------------------------------------------------------ render
const COL = {
  solid: [DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK],
  wall: [DURASTEEL_DARK, DURASTEEL, DURASTEEL, PANEL_STRIPE, DURASTEEL, DURASTEEL, DURASTEEL_DARK],
  wallPlain: [DURASTEEL_DARK, DURASTEEL, DURASTEEL, DURASTEEL, DURASTEEL, DURASTEEL, DURASTEEL_DARK],
  frame: [DURASTEEL_DARK, CHROME, CHROME, CHROME, CHROME, DURASTEEL, DURASTEEL_DARK],
  corr: [DECK_PLATE, AIR, AIR, AIR, AIR, DURASTEEL_DARK, DURASTEEL_DARK],
  corrLit: [DECK_PLATE, AIR, AIR, AIR, AIR, GLOW_PANEL, DURASTEEL_DARK],
  door: [DECK_PLATE, AIR, AIR, AIR, GLOW_PANEL_BLUE, DURASTEEL, DURASTEEL_DARK],
  room: [DECK_PLATE, AIR, AIR, AIR, AIR, AIR, DURASTEEL_DARK],
  air: [AIR, AIR, AIR, AIR, AIR, AIR, AIR],
  reactorWall: [DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK, GLOW_PANEL_BLUE, DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK],
  reactorDoor: [DECK_PLATE, AIR, AIR, AIR, PANEL_BLACK, DURASTEEL_DARK, DURASTEEL_DARK],
  reactorWindow: [DURASTEEL_DARK, STEEL_GLASS, STEEL_GLASS, STEEL_GLASS, DURASTEEL_DARK, DURASTEEL_DARK, DURASTEEL_DARK],
  shaftWall: [PANEL_BLACK, PANEL_BLACK, PANEL_BLACK, PANEL_BLACK, PANEL_BLACK, PANEL_BLACK, PANEL_BLACK],
};

function renderTypes(P) {
  const type = P.type, strip = P.strip, catwalk = P.d % CATWALK_EVERY === 0, aboveHull = P.d > TOP_SPHERE_DECK;
  for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) {
    const i = ix * N + iz, x = ix + X0, z = iz + Z0;
    let c;
    if (aboveHull && type[i] === T.OUT) { P.blocks.fill(AIR, i * DECK_H, i * DECK_H + DECK_H); continue; }   // open space around the tower
    switch (type[i]) {
      case T.CORR: c = (strip[i] & 1) ? COL.corrLit : COL.corr; break;
      case T.PASS: c = COL.corrLit; break;
      case T.CWALL: c = (strip[i] & 2) ? COL.frame : COL.wall; break;
      case T.DOOR: c = COL.door; break;
      case T.ROOM: c = COL.room; break;
      case T.RWALL: c = COL.wallPlain; break;
      case T.RWALLX: c = COL.reactorWall; break;
      case T.RDOOR: c = catwalk ? COL.reactorDoor : COL.reactorWindow; break;
      case T.REACTOR: case T.VOID: case T.HANGAR: case T.MODULE: c = COL.air; break;
      default: {
        // solid fill; faces that meet a walkable cell get the panelled wall look
        let wallLook = false;
        for (const [dx, dz] of DIR4) { const t = P.t(x + dx, z + dz); if (WALKABLE[t] || t === T.MODULE) { wallLook = true; break; } }
        c = wallLook ? COL.wall : COL.solid;
      }
    }
    const b = i * DECK_H;
    for (let k = 0; k < DECK_H; k++) P.blocks[b + k] = c[k];
    if (type[i] === T.CORR && (strip[i] & 2)) P.blocks[b + 4] = PANEL_BLACK; // bulkhead lintel every 12 blocks
  }
}

function renderReactor(P) {
  const d = P.d;
  if (d > TOP_SPHERE_DECK) return;
  const catwalk = d % CATWALK_EVERY === 0;
  for (let x = -REACTOR_R; x <= REACTOR_R; x++) for (let z = -REACTOR_R; z <= REACTOR_R; z++) {
    if (P.t(x, z) !== T.REACTOR) continue;
    const r = Math.hypot(x, z);
    if (d === 0) {
      P.set(x, z, 0, DURASTEEL_DARK);
      if (r < 3) P.fillCol(x, z, 0, 5, GLOW_PANEL_BLUE), P.set(x, z, 6, CHROME);
      else if (r < 4.2) P.set(x, z, 0, GLOW_PANEL_BLUE);
    }
    if (x === 0 && z === 0 && d > 0) P.fillCol(x, z, 0, 6, GLOW_PANEL_BLUE);   // the energy beam up the shaft
    if (d === TOP_SPHERE_DECK) P.set(x, z, 6, DURASTEEL_DARK);
    if (catwalk && d > 0 && r >= 8.5) {
      P.set(x, z, 0, IRON_BLOCK);
      if (r < 9.5) P.set(x, z, 1, IRON_BARS);
    } else if (catwalk && d === 0 && r >= 8.5) P.set(x, z, 0, IRON_BLOCK);
    if (catwalk && d === 0 && r >= 7.5 && r < 8.5) P.set(x, z, 1, IRON_BARS);
  }
}

// Spiral stair + shaft module (see RING_ORDER / rotate). Steps are half-block slabs alternating with full blocks so
// the walking surface rises 0.5 per cell: 14 cells climb one deck, the other 10 ring cells are the landing.
function renderModules(P) {
  const d = P.d;
  MODULES.forEach((m, mi) => {
    if (d < m.d0 || d > m.d1) return;
    const top = d === m.d1, bottom = d === m.d0;
    const connected = P.moduleDoors.get(mi);
    const ringIdx = new Map(RING_ORDER.map(([fx, fz], k) => [fx * 16 + fz, k]));
    for (let fx = -4; fx <= 4; fx++) for (let fz = -4; fz <= 4; fz++) {
      const [dx, dz] = rotate(m.side, fx, fz);
      const x = m.mx + dx, z = m.mz + dz, c = Math.max(Math.abs(fx), Math.abs(fz));
      if (c <= 1) { P.col(x, z, COL.air); if (bottom) P.set(x, z, 0, PANEL_BLACK); if (top) P.set(x, z, 6, PANEL_BLACK); continue; }
      if (c === 2) {
        P.col(x, z, COL.shaftWall);
        if (fx === 2 && fz === 0) { P.set(x, z, 1, IRON_BARS); P.set(x, z, 2, IRON_BARS); P.set(x, z, 3, GLOW_PANEL_BLUE); }
        else if (fx === 2 && Math.abs(fz) === 1) P.set(x, z, 3, GLOW_PANEL_BLUE);
        else if ((fx === -2 && fz === 0) || (fz === 2 && fx === 0) || (fz === -2 && fx === 0)) P.set(x, z, 5, GLOW_PANEL);
        continue;
      }
      if (c === 3) {
        const k = ringIdx.get(fx * 16 + fz);
        P.col(x, z, COL.air);
        if (top) { P.set(x, z, 0, k === 22 && !bottom ? STONE_BRICK_SLAB : DECK_PLATE); P.set(x, z, 6, DURASTEEL_DARK); continue; }
        if (bottom) P.set(x, z, 0, DECK_PLATE);
        if (k <= 9) { P.set(x, z, 0, DECK_PLATE); continue; }
        const s = 0.5 * (k - 9), mm = Math.ceil(s), slab = mm !== s;
        if (mm <= 6) P.set(x, z, mm, slab ? STONE_BRICK_SLAB : DURASTEEL);
        else if (!bottom) P.set(x, z, mm - 7, slab ? STONE_BRICK_SLAB : DECK_PLATE); // top step of the flight from the deck below
        if (mm - 1 >= 1 && mm - 1 <= 6) P.set(x, z, mm - 1, DURASTEEL_DARK);
        continue;
      }
      // c === 4: outer wall
      P.col(x, z, COL.wall);
      if (top) P.set(x, z, 6, DURASTEEL_DARK);
      const extra = m.doors2.some((dd) => dd.fx === fx && dd.fz === fz && d >= dd.d0 && d <= dd.d1);
      if ((fx === 4 && fz === 0 && connected) || extra) { P.set(x, z, 1, AIR); P.set(x, z, 2, AIR); P.set(x, z, 3, AIR); P.set(x, z, 4, GLOW_PANEL_BLUE); }
      if ((fx === 4 && fz === 0) || (fx === -4 && fz === 0) || (fz === 4 && fx === 0) || (fz === -4 && fx === 0)) P.set(x, z, 5, GLOW_PANEL);
    }
  });
}

// ------------------------------------------------------------------------------------------------ entry point
export function buildDeckPlan(d, seed) {
  const P = new DeckPlan(d);
  const rng = new RNG((seed * 7919 + d * 104729 + 17) >>> 0);
  interiorMask(P);
  reactor(P);
  corridors(P);
  if (d >= HANGAR.deck0 && d <= HANGAR.deck1) stampHangar(P, T);
  tower(P);
  modules(P);
  placeFixedRooms(P, T, carvePassage);
  packRooms(P, rng);
  for (let i = 0; i < N * N; i++) if (P.type[i] === T.FREE) P.type[i] = T.SOLID;
  renderTypes(P);
  renderReactor(P);
  for (const room of P.rooms) furnishRoom(P, room, rng, T);
  if (d >= HANGAR.deck0 && d <= HANGAR.deck1) stampHangar(P, T, true);
  renderModules(P);
  return P;
}

// Lazy, seeded cache of deck plans (shared by the chunk filler and the tests).
export class DeckPlans {
  constructor(seed) { this.seed = seed; this.plans = new Array(N_DECKS).fill(null); this.buildMs = 0; this.built = 0; }
  get(d) {
    let p = this.plans[d];
    if (!p) {
      const t0 = performance.now();
      p = this.plans[d] = buildDeckPlan(d, this.seed);
      this.buildMs += performance.now() - t0;
      this.built++;
    }
    return p;
  }
}
