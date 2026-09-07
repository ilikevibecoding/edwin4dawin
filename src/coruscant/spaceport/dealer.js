// Westport Starship Showroom (the economy's ship_dealer lot) on the old deck beside the workshop: a glass hall with
// four lit plinths carrying static voxel copies of the dealer's classes (speeder, shuttle, freighter, yacht), a price
// holo board per plinth (lit digits: the price in thousands of credits), the sales desk, a parts counter and lounge.
import { M, LINE, wallNumber, wallNumberX } from './painter.js';
import { DEALER as D, DEALER_PLINTHS, DECK_TOP, DECK_Y } from './plan.js';
import { shipModels, stampShip } from '../../ships/models.js';

const F = DECK_TOP, W = DECK_Y;

function paintShell(p) {
  const roof = D.roof;
  const [x0, x1] = p.xRange(D.x0, D.x1), [z0, z1] = p.zRange(D.z0, D.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const onX = x === D.x0 || x === D.x1, onZ = z === D.z0 || z === D.z1, corner = onX && onZ;
    if (onX || onZ) {
      const along = onX ? z - D.z0 : x - D.x0;
      for (let y = W; y < roof; y++) {
        let id;
        if (y === W) id = (along & 7) === 4 ? M.GLOW : M.DD;
        else if (y <= roof - 3) id = (corner || (along & 3) === 0) ? M.D : M.GL;
        else id = y === roof - 2 ? M.STR : M.D;
        p.set(x, y, z, id);
      }
    } else {
      p.set(x, F, z, ((x - D.x0) & 7) === 0 || ((z - D.z0) & 7) === 0 ? M.DD : M.D);
      if (((x - D.x0) % 6) === 3 && ((z - D.z0) % 6) === 3) p.set(x, roof - 1, z, M.GLOW);
    }
    p.set(x, roof, z, (onX || onZ || ((x - D.x0) & 7) === 0 || ((z - D.z0) & 7) === 0) ? M.D : M.GL);
  }
  // doors: west (3 wide) from the pad aprons, north (3 wide) from the plaza; holo headers, glow jambs, the name band
  p.box(D.x0, W, D.door.z0, D.x0, W + 3, D.door.z1, M.AIR); p.box(D.x0, W + 4, D.door.z0, D.x0, W + 5, D.door.z1, M.HOLO);
  p.col(D.x0, D.door.z0 - 1, W, W + 5, M.GLOW); p.col(D.x0, D.door.z1 + 1, W, W + 5, M.GLOW);
  p.box(D.doorN.x0, W, D.doorN.z, D.doorN.x1, W + 3, D.doorN.z, M.AIR); p.box(D.doorN.x0, W + 4, D.doorN.z, D.doorN.x1, W + 5, D.doorN.z, M.HOLO);
  p.col(D.doorN.x0 - 1, D.doorN.z, W, W + 5, M.GLOW); p.col(D.doorN.x1 + 1, D.doorN.z, W, W + 5, M.GLOW);
  p.box(D.x0, roof - 2, D.door.z0 - 6, D.x0, roof - 2, D.door.z1 + 6, M.HOLO); p.box(D.doorN.x0 - 6, roof - 2, D.z0, D.doorN.x1 + 6, roof - 2, D.z0, M.HOLO);
  // aisle markings (lit lines) along the two aisles
  for (let z = D.z0 + 1; z < D.z1; z++) { if ((z & 3) === 0) { p.set(D.x0 + 2, F, z, M.GLOW); p.set(D.x0 + 21, F, z, M.GLOW); p.set(D.x0 + 24, F, z, M.GLOW); } }
}

let models = null;
function paintPlinths(p) {
  if (!models) models = shipModels();
  for (const pl of DEALER_PLINTHS) {
    const m = models[pl.type], hx = (m.w >> 1) + 1, hz = (m.d >> 1) + 1;
    if (!p.overlaps(pl.x - hx - 2, pl.z - hz - 2, pl.x + hx + 2, pl.z + hz + 2)) continue;
    // plinth: striped kerb ring round a dark top with lit corners, the hull on it
    p.box(pl.x - hx, W, pl.z - hz, pl.x + hx, W, pl.z + hz, M.DD); p.ring(pl.x - hx, W, pl.z - hz, pl.x + hx, pl.z + hz, M.STR);
    for (const [cx, cz] of [[pl.x - hx, pl.z - hz], [pl.x + hx, pl.z - hz], [pl.x - hx, pl.z + hz], [pl.x + hx, pl.z + hz]]) p.set(cx, W, cz, M.GLOW);
    stampShip(m, (x, y, z, id) => p.set(x, y, z, id), pl.x, W + 1, pl.z, pl.x < D.x0 + 22 ? 0 : 2);
    // price holo board on a chrome post at the aisle side of the plinth: class banner (holo) over the lit price
    const bx = pl.x < D.x0 + 22 ? pl.x + hx + 2 : pl.x - hx - 2, bz = pl.z;
    p.col(bx, bz, W, W + 1, M.CHR);
    p.box(bx, W + 7, bz - 2, bx, W + 8, bz + 2, M.HOLO);
    const s = String(pl.price / 1000), w = s.length * 4 - 1;
    p.box(bx, W + 2, bz - 2, bx, W + 6, bz + 2, M.BLK);
    wallNumber(p, pl.price / 1000, bx, W + 2, bz - (w >> 1), M.GLOW, M.BLK);
  }
}

function paintFittings(p) {
  // sales desk inside the west door, parts counter along the south wall, a lounge (benches, table) in the north-east
  p.box(D.x0 + 3, W, D.door.z0 - 8, D.x0 + 3, W, D.door.z0 - 3, M.DD); p.set(D.x0 + 3, W, D.door.z0 - 6, M.CON); p.box(D.x0 + 3, W + 3, D.door.z0 - 8, D.x0 + 3, W + 4, D.door.z0 - 3, M.HOLO);
  p.box(D.x0 + 3, W, D.z1 - 1, D.x1 - 3, W + 1, D.z1 - 1, M.SHELF); p.box(D.x0 + 3, W + 2, D.z1 - 1, D.x1 - 3, W + 2, D.z1 - 1, M.BLUE);
  p.box(D.x0 + 8, W, D.z1 - 4, D.x0 + 20, W, D.z1 - 4, M.DD); p.set(D.x0 + 14, W, D.z1 - 4, M.CON);
  for (const x of [D.x1 - 8, D.x1 - 4]) for (let z = D.z0 + 3; z <= D.z0 + 9; z++) if (z !== D.z0 + 6) p.set(x, W, z, M.SLAB);
  p.set(D.x1 - 6, W, D.z0 + 6, M.TABLE);
  // registration desk board on the east wall: "REGISTRY" holo with the four class numbers
  p.box(D.x1 - 1, W + 3, D.z0 + 12, D.x1 - 1, W + 4, D.z0 + 19, M.HOLO);
  wallNumberX(p, 4, D.doorN.x0 - 6, W + 1, D.z0 + 1, M.GLOW, M.BLK);                          // "4 classes" tally by the north door
  for (let x = D.x0 + 6; x <= D.x1 - 6; x += 10) for (const z of [D.z0 + 6, D.z1 - 8]) p.set(x, F, z, LINE);
}

export function paintDealer(p) {
  if (!p.overlaps(D.x0, D.z0, D.x1, D.z1)) return;
  paintShell(p);
  paintPlinths(p);
  paintFittings(p);
}
