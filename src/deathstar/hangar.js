// Hangar bay: a 40 x 20 x 66 box cut into the equatorial trench on the +z side (decks 11-13). Floor with landing-pad
// markings and guide lights, lit side walls with corridor doors (deck 11) and windows (decks 12-13), blast doors at
// the back, the control gallery's window strip, and three parked voxel ships (two folded-wing shuttles, one fighter).
import { B } from '../blocks.js';
import { HANGAR, FIXED, deckOfY, deckFloorY } from './layout.js';

const { AIR, DURASTEEL, DURASTEEL_DARK, PANEL_BLACK, PANEL_RED, PANEL_STRIPE, GLOW_PANEL, GLOW_PANEL_BLUE, DECK_PLATE, STEEL_GLASS, CHROME, IRON_BLOCK, HOLO_SIGN } = B;

// ---------------------------------------------------------------------------------------------- ships
const SHIPS = [];
const push = (x, y, z, id) => SHIPS.push([x, y, z, id]);
const FLOOR_TOP = HANGAR.y0 + 1;   // first block row above the deck plating

function shuttle(sx, sz) {
  const y = FLOOR_TOP;
  for (const dz of [-5, 4]) for (const dx of [-2, 2]) push(sx + dx, y, sz + dz, IRON_BLOCK);            // skids
  for (let dz = -6; dz <= 6; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 1; dy <= 3; dy++) {
    if (dz >= 5 && Math.abs(dx) === 2) continue;                                                        // taper toward the nose
    push(sx + dx, y + dy, sz + dz, dy === 3 && dz >= 4 && Math.abs(dx) <= 1 ? STEEL_GLASS : DURASTEEL);
  }
  for (let dx = -1; dx <= 1; dx++) for (let dy = 1; dy <= 2; dy++) push(sx + dx, y + dy, sz + 7, CHROME);   // nose
  for (let dy = 4; dy <= 9; dy++) for (let dz = -6; dz <= (dy >= 8 ? -4 : -2); dz++) push(sx, y + dy, sz + dz, PANEL_BLACK); // fin
  for (let k = 0; k <= 5; k++) for (let dz = -4; dz <= 4; dz++) for (const s of [-1, 1]) {
    push(sx + s * (3 + k), y + 2 + k, sz + dz, k === 5 && dz === 0 ? PANEL_RED : DURASTEEL_DARK);        // folded wings
  }
  for (const dx of [-1, 1]) push(sx + dx, y + 2, sz - 7, GLOW_PANEL_BLUE);                               // engines
}
function fighter(sx, sz) {
  const y = FLOOR_TOP;
  for (let dx = -1; dx <= 1; dx++) for (let dy = 1; dy <= 3; dy++) for (let dz = -1; dz <= 1; dz++) push(sx + dx, y + dy, sz + dz, DURASTEEL_DARK);
  push(sx, y + 2, sz + 1, STEEL_GLASS);
  for (const s of [-2, 2]) push(sx + s, y + 2, sz, IRON_BLOCK);
  for (const s of [-3, 3]) for (let dy = 0; dy <= 4; dy++) for (let dz = -3; dz <= 3; dz++) {
    if ((dy === 0 || dy === 4) && Math.abs(dz) === 3) continue;
    const edge = dy === 0 || dy === 4 || Math.abs(dz) === 3 || ((dy === 1 || dy === 3) && Math.abs(dz) === 2);
    push(sx + s, y + dy, sz + dz, edge ? DURASTEEL : PANEL_BLACK);
  }
}
shuttle(-9, 60);
shuttle(10, 78);
fighter(-10, 82);

// ---------------------------------------------------------------------------------------------- plan stamping
// types = true: mark cell types (before rooms are packed); types = false: write blocks (after the generic render).
export function stampHangar(P, T, render = false) {
  const H = HANGAR, d = P.d;
  const isWall = (x, z) => x === H.wallX0 || x === H.wallX1 || z === H.backZ;
  if (!render) {
    for (let x = H.wallX0; x <= H.wallX1; x++) for (let z = H.backZ; z <= H.z1; z++) {
      const t = P.t(x, z);
      if (isWall(x, z)) {
        if (t === T.CORR && d === H.deck0) { P.setT(x, z, T.DOOR); P.hangarDoors.push([x, z]); }
        else { if (t === T.CORR) P.hangarDoors.push([x, z, 'window']); P.setT(x, z, T.HWALL); }
      } else P.setT(x, z, T.HANGAR);
    }
    return;
  }
  const windows = new Set(P.hangarDoors.filter((e) => e[2] === 'window').map(([x, z]) => x * 4096 + z));
  const G = FIXED.gallery;
  for (let x = H.wallX0; x <= H.wallX1; x++) for (let z = H.backZ; z <= H.z1; z++) {
    const t = P.t(x, z);
    if (t === T.HWALL) {
      const mouth = z >= H.mouthZ;
      const mat = mouth ? PANEL_STRIPE : DURASTEEL;
      for (let dy = 0; dy < 7; dy++) P.set(x, z, dy, dy === 0 || dy === 6 ? DURASTEEL_DARK : mat);
      P.set(x, z, 4, GLOW_PANEL);
      if (windows.has(x * 4096 + z)) for (let dy = 1; dy <= 3; dy++) P.set(x, z, dy, STEEL_GLASS);
      if (d === H.deck1 && x === H.wallX0 && z >= G.z0 && z <= G.z1) for (let dy = 1; dy <= 3; dy++) P.set(x, z, dy, STEEL_GLASS);
      if (z === H.backZ && x >= -6 && x <= 5 && d <= H.deck0 + 1) {   // blast doors
        for (let dy = 1; dy <= 5; dy++) P.set(x, z, dy, x === -1 || x === 0 ? PANEL_RED : PANEL_BLACK);
        P.set(x, z, 4, x === -1 || x === 0 ? PANEL_RED : PANEL_BLACK);
        if (d === H.deck0) P.set(x, z, 1, PANEL_STRIPE);
      }
      if (z === H.backZ && d === H.deck1 && x % 6 === 0) P.set(x, z, 2, HOLO_SIGN);
      continue;
    }
    if (t === T.DOOR) { P.set(x, z, 5, GLOW_PANEL); continue; }
    if (t !== T.HANGAR) continue;
    for (let dy = 0; dy < 7; dy++) P.set(x, z, dy, AIR);
    if (d === H.deck0) {
      let floor = DECK_PLATE;
      const onPad = (x === -14 || x === 13) && z >= 44 && z <= 84 || (z === 44 || z === 84) && x >= -14 && x <= 13;
      if (onPad) floor = PANEL_STRIPE;
      if (x >= -1 && x <= 0 && z >= 50 && z <= 78 && z % 2 === 0) floor = PANEL_STRIPE;
      if (z >= 94 && z <= 98) floor = ((x >> 1) + (z >> 1)) % 2 === 0 ? PANEL_STRIPE : PANEL_BLACK;
      if (x % 6 === 0 && z % 6 === 0) floor = GLOW_PANEL;
      if ((x === -18 || x === 17) && z % 6 === 0) floor = GLOW_PANEL_BLUE;
      P.set(x, z, 0, floor);
    }
    if (d === H.deck1) P.set(x, z, 6, (x % 4 === 0 && z % 6 === 0) ? GLOW_PANEL : DURASTEEL_DARK);
  }
  for (const [x, y, z, id] of SHIPS) {
    if (deckOfY(y) !== d) continue;
    P.set(x, z, y - deckFloorY(d), id);
  }
}
