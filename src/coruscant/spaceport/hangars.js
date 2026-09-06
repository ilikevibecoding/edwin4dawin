// The repair wing on the south apron: three hangars (44 x 45, roof 113) with open north fronts (30 wide x 15 high)
// onto the repair apron, the repair berths (live ships from ships/traffic.js REPAIR_BERTHS) inside under an overhead
// gantry, workbenches, tool crates and parts racks along the back wall, work-light strips, a lit skylight grid; the
// west fuel farm (two chrome tanks, pump house, manifold) beside them, and the repair apron's markings and lamps.
import { M, LINE, lampPost, wallNumberX } from './painter.js';
import { HANGARS, HANGAR_ROOF, HANGAR_OPEN_H, HANGAR_OPEN_HALF, WEST_FUEL, DECK_TOP, DECK_Y } from './plan.js';
import { hash2 } from '../../rng.js';

const abs = Math.abs;
const F = DECK_TOP, W = DECK_Y;

function paintHangar(p, H, n) {
  if (!p.overlaps(H.x0, H.z0 - 2, H.x1, H.z1)) return;
  const roof = HANGAR_ROOF, xc = (H.x0 + H.x1 + 1) >> 1;
  const [x0, x1] = p.xRange(H.x0, H.x1), [z0, z1] = p.zRange(H.z0, H.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    // floor: centre line, berth box and vent grates
    if (z > H.z0 && ((abs(x - xc) === 11 && z > H.z0 + 4) || (x === xc && (z & 7) < 4))) p.set(x, F, z, LINE);
    else if (((x - H.x0) % 9) === 4 && ((z - H.z0) % 9) === 4) p.set(x, F, z, M.VENT);
    else if (z === H.z1 - 1 && x > H.x0 && x < H.x1) p.set(x, F, z, M.STR);
    const back = z === H.z1, side = x === H.x0 || x === H.x1, front = z === H.z0;
    if (back || side) {
      const along = back ? x - H.x0 : z - H.z0, column = (along & 7) === 0;
      for (let y = W; y < roof; y++) {
        let id = M.DD;
        if (column) id = M.D;
        else if (y >= W + 7 && y <= W + 8 && (along & 7) >= 3) id = M.GL;                                  // window band
        else if ((y === W + 2 || y === W + 11) && (along % 3) === 1) id = M.GLOW;                          // work-light strips
        else if (y === roof - 1) id = M.D;
        p.set(x, y, z, id);
      }
    } else if (front) {
      // open front: piers beside the opening, lintel over it with the hangar number
      if (abs(x - xc) > HANGAR_OPEN_HALF) p.box(x, W, z, x, roof - 1, z, abs(x - xc) === HANGAR_OPEN_HALF + 1 ? M.D : M.DD);
      else p.box(x, W + HANGAR_OPEN_H, z, x, roof - 1, z, M.D);
    }
    // roof: frame at the walls, vents, dense lit skylight grid
    p.set(x, roof, z, (front || back || side) ? M.D : ((x - H.x0) % 6 === 3 && (z - H.z0) % 6 === 3) ? M.VENT : M.DD);
    if (!front && !back && !side && ((x - H.x0) & 3) === 2 && ((z - H.z0) & 3) === 2) p.set(x, roof - 1, z, M.GLOW);
  }
  // hangar number on the west pier (lit digits on a black panel) and red / green door lamps on the piers
  wallNumberX(p, n, xc - HANGAR_OPEN_HALF - 6, W + 8, H.z0, M.GLOW, M.BLK);
  p.set(xc - HANGAR_OPEN_HALF - 1, W + 4, H.z0, M.RED); p.set(xc + HANGAR_OPEN_HALF + 1, W + 4, H.z0, M.GLOW);
  // overhead gantry: rails on both side walls, a beam across the bay with the trolley and hook over the berth
  p.box(H.x0 + 1, roof - 5, H.z0 + 2, H.x0 + 1, roof - 5, H.z1 - 2, M.D); p.box(H.x1 - 1, roof - 5, H.z0 + 2, H.x1 - 1, roof - 5, H.z1 - 2, M.D);
  const gz = H.z0 + 16;
  p.box(H.x0 + 1, roof - 4, gz, H.x1 - 1, roof - 4, gz, M.D);
  p.box(xc - 1, roof - 6, gz, xc, roof - 5, gz, M.DD); p.set(xc, roof - 7, gz, M.CHR); p.set(xc, roof - 8, gz, M.CHR);
  // back wall: parts racks (shelves with blue light), workbenches with consoles, tool crates, the furnace corner
  p.box(H.x0 + 2, W, H.z1 - 1, H.x0 + 12, W + 1, H.z1 - 1, M.SHELF); p.box(H.x0 + 2, W + 2, H.z1 - 1, H.x0 + 12, W + 2, H.z1 - 1, M.BLUE);
  p.box(H.x1 - 12, W, H.z1 - 1, H.x1 - 2, W + 1, H.z1 - 1, M.SHELF); p.box(H.x1 - 12, W + 2, H.z1 - 1, H.x1 - 2, W + 2, H.z1 - 1, M.BLUE);
  for (let x = H.x0 + 14; x <= H.x1 - 14; x += 2) p.set(x, W, H.z1 - 1, (x & 3) === 0 ? M.CON : M.TABLE);
  for (let x = H.x0 + 2; x <= H.x0 + 8; x++) for (let z = H.z0 + 2; z <= H.z0 + 5; z++) {
    const h = Math.floor(hash2(x, z, 41 + n) * 3.2);
    if (h > 0) p.box(x, W, z, x, W - 1 + h, z, hash2(x, z, 42 + n) < 0.6 ? M.CRATE : M.BARREL);
  }
  p.set(H.x1 - 3, W, H.z0 + 3, M.ANVIL); p.set(H.x1 - 5, W, H.z0 + 3, M.FURNACE); p.set(H.x1 - 7, W, H.z0 + 3, M.TABLE); p.set(H.x1 - 5, W + 1, H.z0 + 3, M.GLOW);
  // side-wall gear: fuel / power hookups (chrome stubs with red lamps) at berth height
  for (const z of [H.z0 + 12, H.z0 + 24, H.z0 + 36]) { p.set(H.x0 + 1, W + 1, z, M.CHR); p.set(H.x0 + 1, W + 2, z, M.RED); p.set(H.x1 - 1, W + 1, z, M.CHR); p.set(H.x1 - 1, W + 2, z, M.RED); }
  // mechanics' spots: lit floor cells beside the berth (the NPC work spots of the hall record)
  for (const x of [H.x0 + 6, H.x1 - 6]) p.set(x, F, H.z0 + 38, M.GLOW);
}

// The west fuel farm: two chrome tanks on hazard rings, manifold pipes on posts, a pump house, a low glass fence.
function paintWestFuel(p) {
  const Fu = WEST_FUEL;
  if (!p.overlaps(Fu.x0, Fu.z0, Fu.x1, Fu.z1)) return;
  for (const [cx, cz] of Fu.tanks) {
    p.cyl(cx, cz, 7.5, F, F, M.DD); p.cyl(cx, cz, 6.5, F, F, M.RED); p.cyl(cx, cz, 5.6, F, F, M.DD);
    p.cyl(cx, cz, 6.5, W, W + 15, M.CHR);
    p.cyl(cx, cz, 6.5, W + 7, W + 7, M.STR); p.cyl(cx, cz, 5.6, W + 7, W + 7, M.CHR);
    p.cyl(cx, cz, 5.5, W + 16, W + 16, M.CHR); p.cyl(cx, cz, 3.5, W + 17, W + 17, M.CHR); p.cyl(cx, cz, 1.5, W + 18, W + 18, M.DD); p.set(cx, W + 19, cz, M.LAMP);
    p.box(cx - 1, W, cz - 8, cx, W + 2, cz - 8, M.DD);                                    // access hatch stub
  }
  // manifold: overhead pipe between the tanks and east to the hangars' hookups, posts every 8
  const [[ax, az], [bx, bz]] = Fu.tanks;
  p.box(ax, W + 3, az, ax, W + 3, bz, M.DD); p.box(ax, W + 3, bz, bx, W + 3, bz, M.DD); p.box(bx, W + 3, bz, Fu.x1 + 6, W + 3, bz, M.DD);
  for (let x = bx; x <= Fu.x1 + 6; x += 8) p.col(x, bz, W, W + 2, M.DD);
  p.col(ax, bz, W, W + 2, M.DD);
  // pump house
  const hx = Fu.x0 + 4, hz = Fu.z0 + 2;
  p.box(hx, W, hz, hx + 4, W + 3, hz + 4, M.DD); p.box(hx + 1, W, hz + 1, hx + 3, W + 2, hz + 3, M.AIR);
  p.box(hx + 2, W, hz, hx + 2, W + 1, hz, M.AIR); p.set(hx + 2, W + 3, hz + 2, M.GLOW); p.set(hx + 3, W, hz + 3, M.CON); p.set(hx + 4, W + 1, hz + 2, M.RED);
  p.box(hx, W + 4, hz, hx + 4, W + 4, hz + 4, M.D); p.col(hx + 2, hz + 2, W + 5, W + 6, M.DD); p.set(hx + 2, W + 7, hz + 2, M.LAMP);
  // fence with a gap toward the hangars, warning lamps
  for (let x = Fu.x0; x <= Fu.x1; x++) for (const z of [Fu.z0, Fu.z1]) { p.set(x, W, z, M.DD); p.set(x, W + 1, z, M.GL); }
  for (let z = Fu.z0; z <= Fu.z1; z++) { p.set(Fu.x0, W, z, M.DD); p.set(Fu.x0, W + 1, z, M.GL); if (abs(z - 284) > 3) { p.set(Fu.x1, W, z, M.DD); p.set(Fu.x1, W + 1, z, M.GL); } }
  for (const x of [Fu.x0, Fu.x1]) for (const z of [Fu.z0, Fu.z1]) lampPost(p, x, z, W);
  p.box(Fu.x1 - 10, F, 282, Fu.x1, F, 286, LINE);                                            // entrance marking
  p.box(Fu.x0 + 10, W + 4, Fu.z0, Fu.x0 + 17, W + 5, Fu.z0, M.HOLO);                          // "FUEL" holo header
}

// Repair apron in front of the hangars (z 200..261): bay lines from each opening, lamps, tug / trolley crates.
function paintApron(p) {
  if (!p.overlaps(HANGARS[0].x0 - 4, 200, HANGARS[2].x1 + 4, 261)) return;
  for (const H of HANGARS) {
    const xc = (H.x0 + H.x1 + 1) >> 1;
    for (let z = 232; z < H.z0; z++) { p.set(xc - HANGAR_OPEN_HALF, F, z, (z & 3) === 0 ? M.GLOW : LINE); p.set(xc + HANGAR_OPEN_HALF, F, z, (z & 3) === 0 ? M.GLOW : LINE); }
    for (let x = xc - HANGAR_OPEN_HALF; x <= xc + HANGAR_OPEN_HALF; x++) if ((x & 3) < 2) p.set(x, F, 232, LINE);
    for (let k = 0; k < 4; k++) { const x = H.x0 + 2 + k * 3, z = 250 + (k & 1); if (hash2(x, z, 77) < 0.6) p.set(x, W, z, hash2(x, z, 78) < 0.5 ? M.CRATE : M.BARREL); }
  }
  for (let x = 2160; x <= 2350; x += 24) lampPost(p, x, 228, W);
  p.box(2200, W + 3, 236, 2214, W + 4, 236, M.HOLO); p.col(2200, 236, W, W + 2, M.DD); p.col(2214, 236, W, W + 2, M.DD);   // "REPAIR APRON" board
}

export function paintHangars(p) {
  HANGARS.forEach((H, i) => paintHangar(p, H, i + 1));
  paintWestFuel(p);
  paintApron(p);
}
