// Landing pads in three sizes (S 24 x 24, M 36 x 36, L 48 x 48): hazard border with flush edge lights, lit landing
// ring and centre cross, the gate number painted in both corners, corner lamps, and a service strip on the east side
// (fuel bowser, pad console, gate board on a mast, container stack, a portal gantry on the large pads). Blast walls
// stand in the gaps of each pad field; walk lines lead from every pad toward its terminal.
import { M, LINE, paintNumber, lampPost, numberBoard } from './painter.js';
import { PADS, padHalf, DECK_TOP, DECK_Y } from './plan.js';
import { hash3 } from '../../rng.js';

const abs = Math.abs;

// One pad with its centre at (pad.x, pad.z), floor layer `fy` (feet at fy + 1), gate number `gate`, half size `H`.
export function paintPad(p, pad, gate, fy, H = padHalf(pad)) {
  const W = fy + 1;
  const px0 = pad.x - H, px1 = pad.x + H - 1, pz0 = pad.z - H, pz1 = pad.z + H - 1;
  if (!p.overlaps(px0 - 3, pz0 - 3, px1 + 12, pz1 + 3)) return;
  const [x0, x1] = p.xRange(px0, px1), [z0, z1] = p.zRange(pz0, pz1);
  const ring = H * 0.62, ring2 = ring * ring, ringIn = (ring - 1) * (ring - 1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = x + 0.5 - pad.x, dz = z + 0.5 - pad.z, r2 = dx * dx + dz * dz;
    const edge = x === px0 || x === px1 || z === pz0 || z === pz1;
    let id = M.PLATE;
    if (edge) {                                                                       // hazard border with flush edge lights
      const k = x === px0 ? z - pz0 : x === px1 ? pz1 - z : z === pz0 ? px1 - x : x - px0;
      id = k % 6 === 3 ? M.LAMP : ((k >> 1) & 1) ? M.RED : LINE;
    } else if (r2 >= ringIn && r2 < ring2) id = (abs(abs(dx) - abs(dz)) < 1.2) ? M.GLOW : LINE;   // lit landing ring
    else if ((abs(dx) < 1 && abs(dz) < H / 3) || (abs(dz) < 1 && abs(dx) < H / 3)) id = abs(dx) < 1 && abs(dz) < 1 ? M.GLOW : M.RED;   // centre cross
    else if (H >= 18 && (abs(dx) === H - 5.5 || abs(dz) === H - 5.5) && abs(dx) <= H - 5.5 && abs(dz) <= H - 5.5) id = M.DD;   // inner box for the big hulls
    p.set(x, fy, z, id);
  }
  paintNumber(p, gate, px0 + 3, fy, pz0 + 3, LINE); paintNumber(p, gate, px1 - 5 - (String(gate).length - 1) * 4, fy, pz1 - 7, LINE, true);
  for (const [cx, cz] of [[px0 + 1, pz0 + 1], [px1 - 1, pz0 + 1], [px0 + 1, pz1 - 1], [px1 - 1, pz1 - 1]]) { p.col(cx, cz, W, W + 1, M.DD); p.set(cx, W + 2, cz, M.LAMP); }
  // service strip east of the pad: bowser, console, gate board, containers, gantry on the large pads
  const sx = px1 + 2;
  p.box(sx, W, pz0 + 2, sx + 1, W, pz0 + 3, M.STR); p.box(sx, W + 1, pz0 + 2, sx + 1, W + 1, pz0 + 3, M.CHR); p.set(sx, W + 2, pz0 + 2, M.DD); p.set(sx + 1, W + 2, pz0 + 3, M.RED); p.set(sx, W, pz0 + 4, M.DD);
  p.box(sx, W, pz0 + 6, sx + 1, W, pz0 + 7, M.DD); p.set(sx, W + 1, pz0 + 6, M.CON);            // pad control console
  numberBoard(p, gate, sx, pz0 + 9, W, true, 3);                                              // gate board on its mast
  const n = H >= 24 ? 6 : H >= 18 ? 4 : 3;
  for (let k = 0; k < n; k++) {
    const cx = sx + (k & 1), cz = pz1 - 2 - (k >> 1) * 2;
    const h = Math.floor(hash3(cx, gate, cz, 31) * 3);
    if (h > 0) p.box(cx, W, cz, cx, W - 1 + h, cz, hash3(cx, gate, cz, 32) < 0.7 ? M.CRATE : M.BARREL);
  }
  if (H >= 24) {
    // portal gantry over the strip: posts at both ends of the pad's east edge, beam, trolley + hook
    const gz0 = pz0 + 14, gz1 = pz1 - 14;
    p.box(sx, W, gz0, sx + 1, W + 8, gz0 + 1, M.DD); p.box(sx, W, gz1 - 1, sx + 1, W + 8, gz1, M.DD);
    p.box(sx, W + 9, gz0, sx + 1, W + 9, gz1, M.D); p.box(sx, W + 7, pad.z - 1, sx + 1, W + 8, pad.z, M.CHR); p.box(sx, W + 4, pad.z, sx, W + 6, pad.z, M.DD);
    p.set(sx, W + 10, gz0, M.LAMP); p.set(sx + 1, W + 10, gz1, M.LAMP);
  }
}

// blast walls: [x0, x1, z0, z1] inclusive (2 thick), 5 high with a hazard band and a lit cap, crew gaps in the middle
const BLAST = [
  [2211, 2212, -180, -77], [2267, 2268, -180, -77], [2160, 2319, -129, -128],       // field A
  [2197, 2198, 102, 137], [2241, 2242, 102, 137], [2285, 2286, 102, 137],           // field B
  [2397, 2398, -42, -19], [2433, 2434, -42, -19], [2397, 2398, 28, 51], [2433, 2434, 28, 51],   // field C
  [2414, 2415, 112, 147],                                                            // security apron
  [2222, 2223, -258, -211],                                                          // cargo bays
];
function paintBlastWalls(p) {
  const W = DECK_Y;
  for (const [x0, x1, z0, z1] of BLAST) {
    if (!p.overlaps(x0, z0, x1, z1)) continue;
    const alongX = x1 - x0 > z1 - z0, mid = alongX ? (x0 + x1) >> 1 : (z0 + z1) >> 1;
    p.each(x0, z0, x1, z1, (x, z) => {
      const a = alongX ? x : z;
      if (abs(a - mid) <= 1) return;                                                    // crew gap
      p.set(x, W, z, M.DD); p.set(x, W + 1, z, M.STR); p.set(x, W + 2, z, M.DD); p.set(x, W + 3, z, M.DD); p.set(x, W + 4, z, (a & 3) === 0 ? M.GLOW : M.D);
    });
  }
}

// walk lines from the pads to their halls: [pad index range, direction, target coordinate]
const WALKS = [
  [8, 13, 'S', -47], [14, 17, 'N', 61], [18, 23, 'W', 2360], [24, 25, 'E', 2239], [26, 27, 'N', 81], [28, 29, 'E', 2303],
];
function paintWalks(p) {
  for (const [a, b, dir, target] of WALKS) for (let i = a; i <= b; i++) {
    const pad = PADS[i], H = padHalf(pad);
    if (dir === 'S' || dir === 'N') {
      const from = dir === 'S' ? pad.z + H : pad.z - H - 1, to = dir === 'S' ? Math.min(target, pad.z + H + 40) : Math.max(target, pad.z - H - 40);
      const [za, zb] = [Math.min(from, to), Math.max(from, to)];
      if (!p.overlaps(pad.x - 3, za, pad.x + 3, zb)) continue;
      for (let z = za; z <= zb; z++) { p.set(pad.x - 3, DECK_TOP, z, (z & 3) === 0 ? M.GLOW : LINE); p.set(pad.x + 3, DECK_TOP, z, (z & 3) === 0 ? M.GLOW : LINE); }
    } else {
      const from = dir === 'E' ? pad.x + H : pad.x - H - 1, to = dir === 'E' ? Math.min(target, pad.x + H + 40) : Math.max(target, pad.x - H - 40);
      const [xa, xb] = [Math.min(from, to), Math.max(from, to)];
      if (!p.overlaps(xa, pad.z - 3, xb, pad.z + 3)) continue;
      for (let x = xa; x <= xb; x++) { p.set(x, DECK_TOP, pad.z - 3, (x & 3) === 0 ? M.GLOW : LINE); p.set(x, DECK_TOP, pad.z + 3, (x & 3) === 0 ? M.GLOW : LINE); }
    }
  }
  // lamp posts along the field A / B aprons
  for (const z of [-70, 92]) for (let x = 2160; x <= 2320; x += 20) lampPost(p, x, z, DECK_Y);
}

export function paintPads(p) {
  for (let i = 0; i < PADS.length; i++) paintPad(p, PADS[i], i + 1, DECK_TOP);
  paintBlastWalls(p);
  paintWalks(p);
}
