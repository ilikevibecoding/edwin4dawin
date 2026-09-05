// The Death Star: a lazy, deterministic per-chunk structure in the space void (centre (0, 128, -4000), radius 100).
//
// Every block of a chunk column is classified with a signed-distance style test against the sphere (surface radius
// varies per band: equatorial trench recessed 6, its raised lips, the superlaser crater with its raised rim),
// the negative bowl sphere of the dish, and the nine emitter nodes. Blocks inside the hull are looked up in the
// deck plans (plan.js). Priority boxes (hangar mouth, superlaser chamber, the overlook tower and its stair neck)
// let the plans overrule the shell so those pieces can cut through or sit on top of the hull.
import { B } from '../blocks.js';
import { hash2, hash3 } from '../rng.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';
import {
  CX, CY, CZ, R, SHELL, OUTER, TRENCH_HALF, TRENCH_DEPTH, LIP_RAISE, LIP_HALF, DISH, bowlDist2,
  HANGAR, TOWER, DISH_WINDOW, DECK_Y0, DECK_H, N_DECKS, deckFloorY, N, X0, Z0,
} from './layout.js';
import { DeckPlans } from './plan.js';

const {
  HULL_PLATE, HULL_TRENCH, DURASTEEL, DURASTEEL_DARK, PANEL_BLACK, WINDOW_LIT, WINDOW_DARK, GLOW_PANEL, GLOW_PANEL_BLUE,
  CITY_LAMP, CHROME, STEEL_GLASS,
} = B;

const R2 = R * R, OUTER2 = OUTER * OUTER;
const TRENCH_R = R - TRENCH_DEPTH, TRENCH_R2 = TRENCH_R * TRENCH_R, TRENCH_INNER2 = (TRENCH_R - SHELL) ** 2;
const LIP_R2 = (R + LIP_RAISE) ** 2, RIM_R = R + DISH.rimRaise, RIM_R2 = RIM_R * RIM_R;
const INNER2 = (R - SHELL) ** 2, NEAR_SURFACE2 = (R - 1.5) ** 2;
const HULL_OUTER2 = (R - 1) ** 2, TRENCH_OUTER2 = (TRENCH_R - 1) ** 2, RIM_OUTER2 = (RIM_R - 1) ** 2, WALL_TOP2 = (R - 0.5) ** 2;
const LAMP_IN2 = (TRENCH_R + 0.5) ** 2, LAMP_OUT2 = (TRENCH_R + 1.5) ** 2;
const SKIN_INNER2 = (DISH.rc + 1.2) ** 2;
const SEAMS = [30, 90, 150, 210, 270, 330].map((deg) => {
  const p = deg * Math.PI / 180;
  return { nx: Math.cos(p), nz: -Math.sin(p), dx: Math.sin(p), dz: Math.cos(p) };
});
const SEAM_LAT = 52 * Math.PI / 180, SEAM_MAX_LAT = 70 * Math.PI / 180;
const EMITTERS = [{ ...DISH.emitter, r2: 4, id: GLOW_PANEL_BLUE }].concat(DISH.nodes.map((n) => ({ ...n, r2: 1.1, id: GLOW_PANEL })));
const EMIT_NEAR = Math.min(...EMITTERS.map((e) => e.y * DISH.Dy + e.z * DISH.Dz)) - 3;
const RING_ANGLES = [0.3, 0.55, 0.8].map((f) => DISH.alpha * f);
const PANEL = 9;   // plating panel size (blocks of arc)

// Outer-layer hull material: seams, hashed panel mosaic and window specks.
function plating(px, dy, pz, r, x, y, z) {
  const lat = Math.asin(dy / r), alat = Math.abs(lat);
  if (alat < SEAM_MAX_LAT) {
    for (let i = 0; i < SEAMS.length; i++) {
      const s = SEAMS[i];
      if (px * s.dx + pz * s.dz > 0 && Math.abs(px * s.nx + pz * s.nz) < 0.5) return PANEL_BLACK;
    }
  }
  if (Math.abs(alat - SEAM_LAT) * r < 0.5) return PANEL_BLACK;
  const speck = hash3(x, y, z, 11);
  if (speck < 0.010) return WINDOW_LIT;
  if (speck < 0.0115) return GLOW_PANEL;
  if (speck < 0.03) return WINDOW_DARK;
  const lon = Math.atan2(px, pz);
  const h = hash2(Math.floor(lat * R / PANEL), Math.floor(lon * R * Math.cos(lat) / PANEL), 7);
  if (h < 0.55) return HULL_PLATE;
  if (h < 0.72) return DURASTEEL;
  if (h < 0.88) return DURASTEEL_DARK;
  return PANEL_BLACK;
}

// Trench lamp rows: one lamp every 6 blocks of arc along the base of both trench walls.
function trenchLamp(px, pz) {
  const s = (Math.atan2(px, pz) + Math.PI) * TRENCH_R;
  return Math.floor(s) % 6 === 0;
}

const towerCarve = { x0: TOWER.module.mx - 4, x1: TOWER.module.mx + 4, z0: TOWER.module.mz - 4, z1: TOWER.module.mz + 4 };
const SL = { x0: -8, x1: 8, z0: 64, z1: 71, y0: deckFloorY(19), y1: deckFloorY(19) + 6 };   // superlaser chamber (see FIXED.superlaser)
const TOWER_TOP = deckFloorY(N_DECKS) - 1;

export function fillChunk(chunk, plans) {
  const wx0 = chunk.cx * CS, wz0 = chunk.cz * CS, blocks = chunk.blocks;
  const planBlocks = new Array(N_DECKS).fill(null);
  const pb = (d) => planBlocks[d] || (planBlocks[d] = plans.get(d).blocks);
  const { Dy, Dz, rc2, skin2, cosRimIn, cosRimOut } = DISH;
  for (let lx = 0; lx < CS; lx++) {
    const x = wx0 + lx - CX, px = x + 0.5;
    for (let lz = 0; lz < CS; lz++) {
      const z = wz0 + lz - CZ, pz = z + 0.5;
      const h2 = px * px + pz * pz;
      const inTower = x >= TOWER.x0 && x <= TOWER.x1 && z >= TOWER.z0 && z <= TOWER.balconyZ1;
      if (h2 > OUTER2 && !inTower) continue;
      const base = (lx * CS + lz) * CH;
      const inGrid = x >= X0 && z >= Z0 && x < X0 + N && z < Z0 + N;
      const ci = inGrid ? ((x - X0) * N + (z - Z0)) * DECK_H : -1;
      // y ranges where the deck plan is authoritative (plan air = no block, plan blocks written even in the shell)
      let pa0 = 1e9, pa1 = -1, pb0 = 1e9, pb1 = -1, clipHangar = false;
      if (x >= HANGAR.wallX0 && x <= HANGAR.wallX1 && z >= HANGAR.backZ && z <= HANGAR.z1) { pa0 = HANGAR.y0; pa1 = HANGAR.y1 - 1; clipHangar = true; }
      else if (x >= SL.x0 && x <= SL.x1 && z >= SL.z0 && z <= SL.z1) { pa0 = SL.y0; pa1 = SL.y1; }
      const inCarve = x >= towerCarve.x0 && x <= towerCarve.x1 && z >= towerCarve.z0 && z <= towerCarve.z1;
      if (inCarve) { pb0 = deckFloorY(23); pb1 = TOWER_TOP; }
      else if (inTower) { pb0 = TOWER.yBase; pb1 = TOWER_TOP; }
      const dyMax = h2 < OUTER2 ? Math.sqrt(OUTER2 - h2) : 0;
      let y0 = Math.max(0, Math.floor(CY - dyMax)), y1 = Math.min(CH - 1, Math.ceil(CY + dyMax));
      if (pb1 >= 0) { y0 = Math.min(y0, pb0); y1 = Math.max(y1, pb1); }
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - CY, r2 = h2 + dy * dy;
        if ((y >= pa0 && y <= pa1 && (!clipHangar || r2 <= LIP_R2)) || (y >= pb0 && y <= pb1)) {
          if (ci >= 0) {
            const d = ((y - DECK_Y0) / DECK_H) | 0, id = pb(d)[ci + (y - DECK_Y0 - d * DECK_H)];
            if (id) blocks[base + y] = id;
          } else blocks[base + y] = DURASTEEL_DARK;
          continue;
        }
        if (r2 > OUTER2) continue;
        const dd = dy * Dy + pz * Dz;
        // emitter nodes win over everything (they sit on the rim / bowl floor)
        if (dd > EMIT_NEAR) {
          let hit = 0;
          for (let i = 0; i < EMITTERS.length; i++) {
            const e = EMITTERS[i], ex = px - e.x, ey = dy - e.y, ez = pz - e.z;
            if (ex * ex + ey * ey + ez * ez < e.r2) { hit = e.id; break; }
          }
          if (hit) { blocks[base + y] = hit; continue; }
        }
        const ay = Math.abs(dy);
        let S2 = R2, kind = 0;                         // 0 hull, 1 trench floor, 2 lip, 3 dish rim
        if (ay < TRENCH_HALF) { S2 = TRENCH_R2; kind = 1; }
        else if (ay < LIP_HALF) { S2 = LIP_R2; kind = 2; }
        let dc2 = Infinity;
        if (dd > 0) {
          dc2 = bowlDist2(px, dy, pz);
          if (kind === 0 && r2 > NEAR_SURFACE2) {
            const cosT = dd / Math.sqrt(r2);
            if (cosT < cosRimIn && cosT > cosRimOut) { S2 = RIM_R2; kind = 3; }
          }
        }
        if (r2 > S2) continue;                         // outside the surface
        if (dc2 < rc2) continue;                       // inside the superlaser bowl
        if (dc2 < skin2) {                             // bowl skin: dark bowl with focusing rings, glass in front of the chamber
          let id = DURASTEEL_DARK;
          if (dc2 < SKIN_INNER2) {
            const t = Math.acos(Math.min(1, dd / Math.sqrt(r2))), rr = Math.sqrt(r2);
            for (let i = 0; i < RING_ANGLES.length; i++) {
              if (Math.abs(t - RING_ANGLES[i]) * rr < 0.6) { id = i === 0 ? (hash3(x, y, z, 5) < 0.5 ? GLOW_PANEL_BLUE : CHROME) : CHROME; break; }
            }
          }
          if (x >= DISH_WINDOW.x0 && x <= DISH_WINDOW.x1 && y >= DISH_WINDOW.y0 && y <= DISH_WINDOW.y1 && z >= DISH_WINDOW.z0 && z <= DISH_WINDOW.z1) id = STEEL_GLASS;
          blocks[base + y] = id;
          continue;
        }
        const inner2 = kind === 1 ? TRENCH_INNER2 : INNER2;
        if (r2 > inner2) {                             // hull shell
          let id;
          if (kind === 1) {
            id = r2 > TRENCH_OUTER2 ? (hash3(x, y, z, 23) < 0.03 ? WINDOW_LIT : HULL_TRENCH) : DURASTEEL_DARK;
          } else if (kind === 2) {
            if (ay < TRENCH_HALF + 1 || r2 < WALL_TOP2) id = (ay < TRENCH_HALF + 1 && r2 > LAMP_IN2 && r2 <= LAMP_OUT2 && trenchLamp(px, pz)) ? CITY_LAMP : HULL_TRENCH;
            else id = plating(px, dy, pz, Math.sqrt(r2), x, y, z);
          } else if (kind === 3) {
            id = r2 > RIM_OUTER2 ? (hash3(x, y, z, 29) < 0.2 ? DURASTEEL_DARK : DURASTEEL) : HULL_PLATE;
          } else {
            id = r2 > HULL_OUTER2 ? plating(px, dy, pz, Math.sqrt(r2), x, y, z) : HULL_PLATE;
          }
          blocks[base + y] = id;
          continue;
        }
        // interior: deck plans between y 40 and the top sphere deck's ceiling, solid machinery fill above/below
        if (y >= DECK_Y0 && y < TOWER.yBase && ci >= 0) {
          const d = ((y - DECK_Y0) / DECK_H) | 0, id = pb(d)[ci + (y - DECK_Y0 - d * DECK_H)];
          if (id) blocks[base + y] = id;
        } else blocks[base + y] = DURASTEEL_DARK;
      }
      // plinth under the tower: hull plating from the hull surface up to the tower base (not under the balcony)
      if (inTower && !inCarve && z < TOWER.cantileverZ) {
        const hullTop = Math.floor(CY - 0.5 + Math.sqrt(Math.max(0, R2 - h2)));
        for (let y = Math.max(0, hullTop + 1); y < TOWER.yBase; y++) if (!blocks[base + y]) blocks[base + y] = HULL_PLATE;
      }
    }
  }
}

export function register(gen, game) {
  const plans = new DeckPlans(gen.seed ?? 1337);
  const st = {
    name: 'deathstar',
    x0: CX - OUTER - 1, z0: CZ - OUTER - 1, x1: CX + OUTER + 2, z1: CZ + OUTER + 2,
    plans,
    fill: (chunk) => fillChunk(chunk, plans),
  };
  gen.addStructure(st);
  if (game) game.deathstar = st;
  return st;
}
