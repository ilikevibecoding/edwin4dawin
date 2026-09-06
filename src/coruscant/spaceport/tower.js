// Control towers (the original east tower and Westport control): an 8x8 shaft with blue light strips, stripe bands
// and slit windows, a 20-cell spiral stair of half steps round a lit core column, a flared 16x16 glass cab with a
// console ring, holo column and a roof lip, and the radar / antenna mast with its beacon. Parametrised on the plan's
// tower record { x0, x1, z0, z1, cabY }: the door is in the west face.
import { M } from './painter.js';
import { DECK_Y } from './plan.js';

export function paintTower(p, T) {
  if (!p.overlaps(T.x0 - 4, T.z0 - 4, T.x1 + 4, T.z1 + 4)) return;
  const cabY = T.cabY, W = DECK_Y;
  const cx0 = T.x0 + 3, cx1 = T.x0 + 4, cz0 = T.z0 + 3, cz1 = T.z0 + 4;            // core column cells
  // shaft: durasteel with dark corners, blue light strips, stripe bands, slit windows
  for (let y = W; y <= cabY - 3; y++) {
    for (let x = T.x0; x <= T.x1; x++) for (const z of [T.z0, T.z1]) {
      const corner = x === T.x0 || x === T.x1;
      p.set(x, y, z, corner ? M.DD : (y % 6 === 3 && x >= T.x0 + 2 && x <= T.x1 - 2) ? M.GL : (y === 120 || y === 140) ? M.STR : M.D);
    }
    for (const x of [T.x0, T.x1]) for (let z = T.z0 + 1; z <= T.z1 - 1; z++) {
      p.set(x, y, z, (z === cz0 || z === cz1) && y >= W + 3 ? M.BLUE : (y === 120 || y === 140) ? M.STR : M.D);
    }
  }
  // flare below the cab (solid rings), then the shaft interior is carved back through it
  p.box(T.x0 - 1, cabY - 3, T.z0 - 1, T.x1 + 1, cabY - 3, T.z1 + 1, M.DD);
  p.box(T.x0 - 2, cabY - 2, T.z0 - 2, T.x1 + 2, cabY - 1, T.z1 + 2, M.DD);
  p.box(T.x0 + 1, W, T.z0 + 1, T.x1 - 1, cabY - 1, T.z1 - 1, M.AIR);
  p.box(T.x0, W, cz0, T.x0, W + 1, cz1, M.AIR); p.box(T.x0, W + 2, cz0, T.x0, W + 2, cz1, M.HOLO);      // door + sign
  // core column with stairwell lights
  p.box(cx0, W, cz0, cx1, cabY - 1, cz1, M.DD);
  for (let y = W + 2; y < cabY; y += 4) { p.set(cx0, y, cz0, M.BLUE); p.set(cx1, y, cz1, M.BLUE); }
  // spiral stair on the interior ring (20 cells, half a block per cell)
  const ring = [];
  for (let x = T.x0 + 1; x <= T.x1 - 1; x++) ring.push([x, T.z0 + 1]);
  for (let z = T.z0 + 2; z <= T.z1 - 1; z++) ring.push([T.x1 - 1, z]);
  for (let x = T.x1 - 2; x >= T.x0 + 1; x--) ring.push([x, T.z1 - 1]);
  for (let z = T.z1 - 2; z >= T.z0 + 2; z--) ring.push([T.x0 + 1, z]);
  const kMax = (cabY - W) * 2 + 2;
  for (let k = 1; k <= kMax; k++) {
    const [x, z] = ring[k % 20];
    const T2 = W + k / 2, top = Math.floor(T2), half = T2 !== top;
    if (half) { p.set(x, top, z, M.SLAB); p.set(x, top - 1, z, M.DD); }
    else { p.set(x, top - 1, z, M.DD); p.set(x, top - 2, z, M.DD); }
  }
  // cab (16 x 16)
  p.box(T.x0 - 4, cabY, T.z0 - 4, T.x1 + 4, cabY, T.z1 + 4, M.D);
  p.box(T.x0 + 1, cabY, T.z0 + 1, T.x1 - 1, cabY, T.z1 - 1, M.AIR);                     // stairwell opening
  p.box(cx0, cabY, cz0, cx1, cabY, cz1, M.DD);                                           // core column reaches the cab floor
  p.set(T.x1 - 1, cabY, T.z1 - 1, M.DD); p.set(T.x1 - 1, cabY, T.z1 - 2, M.SLAB);        // last steps
  p.walls(T.x0 - 4, cabY + 1, T.z0 - 4, T.x1 + 4, cabY + 1, T.z1 + 4, M.DD);              // sill ring
  p.walls(T.x0 - 4, cabY + 2, T.z0 - 4, T.x1 + 4, cabY + 4, T.z1 + 4, M.GL);
  for (const x of [T.x0 - 4, T.x1 + 4]) for (const z of [T.z0 - 4, T.z1 + 4]) p.col(x, z, cabY + 1, cabY + 4, M.D);
  p.box(T.x0 - 4, cabY + 5, T.z0 - 4, T.x1 + 4, cabY + 5, T.z1 + 4, M.D);                 // roof
  for (let x = T.x0 - 2; x <= T.x1 + 2; x += 3) for (let z = T.z0 - 2; z <= T.z1 + 2; z += 3) p.set(x, cabY + 5, z, M.GLOW);
  p.walls(T.x0 - 3, cabY + 6, T.z0 - 3, T.x1 + 3, cabY + 6, T.z1 + 3, M.DD);              // roof lip
  for (const x of [T.x0 - 3, T.x1 + 3]) for (const z of [T.z0 - 3, T.z1 + 3]) p.set(x, cabY + 6, z, M.RED);
  // stairwell railing (glass) around the opening, gap at the arrival
  for (let x = T.x0; x <= T.x1; x++) for (const z of [T.z0, T.z1]) p.set(x, cabY + 1, z, M.GL);
  for (let z = T.z0; z <= T.z1; z++) { p.set(T.x0, cabY + 1, z, M.GL); if (z <= cz1) p.set(T.x1, cabY + 1, z, M.GL); }
  // console ring along the cab windows, holo column on the antenna base
  for (let x = T.x0 - 3; x <= T.x1 + 3; x++) for (let z = T.z0 - 3; z <= T.z1 + 3; z++) {
    if (x === T.x0 - 3 || x === T.x1 + 3 || z === T.z0 - 3 || z === T.z1 + 3) p.set(x, cabY + 1, z, ((x + z) & 1) ? M.CON : M.DD);
  }
  p.box(cx0, cabY + 1, cz0, cx1, cabY + 3, cz1, M.HOLO);
  // radar / antenna mast with beacon: a lattice mast, a dish ring and the red beacon
  p.box(cx0, cabY + 6, cz0, cx1, cabY + 11, cz1, M.DD);
  p.ring(cx0 - 2, cabY + 9, cz0 - 2, cx1 + 2, cz1 + 2, M.CHR);                            // radar dish ring
  p.box(cx0, cabY + 12, cz0, cx1, cabY + 12, cz1, M.LAMP); p.set(cx0, cabY + 13, cz0, M.RED); p.set(cx1, cabY + 14, cz0, M.LAMP);
}
