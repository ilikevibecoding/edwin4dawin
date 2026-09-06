// The security apron (the diplomatic / security facility): a fenced annex east of field B with two M pads for the
// Coruscant Guard gunships (painted by pads.js), checkpoints with barrier arms and glass booths in the west and
// north fences, a red hazard line inside the fence, and the Guard post south of the pads (front desk, holding cells,
// armoury racks, briefing benches, lockers, comm mast and searchlight on the roof).
import { M, LINE, lampPost } from './painter.js';
import { SECURITY as S, SECURITY_PADS, DECK_TOP, DECK_Y } from './plan.js';

const F = DECK_TOP, W = DECK_Y;

function paintFence(p) {
  if (!p.overlaps(S.x0 - 1, S.z0 - 1, S.x1 + 1, S.z1 + 1)) return;
  const x1 = S.x1 - 2;                                                                       // keeps the apron's own parapet at x 2487
  const gateW = (z) => z >= S.gateW.z0 && z <= S.gateW.z1, gateN = (x) => x >= S.gateN.x0 && x <= S.gateN.x1;
  for (let x = S.x0; x <= x1; x++) for (const z of [S.z0, S.z1]) {
    if (z === S.z0 && gateN(x)) continue;
    p.set(x, W, z, M.DD); p.set(x, W + 1, z, ((x - S.x0) & 7) === 0 ? M.DD : M.BARS); p.set(x, W + 2, z, ((x - S.x0) & 7) === 0 ? M.RED : M.BARS);
  }
  for (let z = S.z0; z <= S.z1; z++) for (const x of [S.x0, x1]) {
    if (x === S.x0 && gateW(z)) continue;
    p.set(x, W, z, M.DD); p.set(x, W + 1, z, ((z - S.z0) & 7) === 0 ? M.DD : M.BARS); p.set(x, W + 2, z, ((z - S.z0) & 7) === 0 ? M.RED : M.BARS);
  }
  // red hazard line inside the fence, lamps on the corners
  p.ring(S.x0 + 2, F, S.z0 + 2, x1 - 2, S.z1 - 2, M.RED);
  for (const x of [S.x0, x1]) for (const z of [S.z0, S.z1]) lampPost(p, x, z, W, 4);
  // checkpoints: barrier arm across the gap (red / white, on a post), glass booth with a console beside it, holo
  // "SECURITY" header on a gantry over the gate
  const gw = S.gateW;
  p.col(S.x0, gw.z0 - 1, W, W + 3, M.DD); p.col(S.x0, gw.z1 + 1, W, W + 3, M.DD); p.box(S.x0, W + 4, gw.z0 - 1, S.x0, W + 4, gw.z1 + 1, M.HOLO);
  for (let z = gw.z0; z <= gw.z1; z++) p.set(S.x0, W + 1, z, (z & 1) ? M.RED : M.STR);           // barrier arm
  p.box(S.x0 + 1, W, gw.z1 + 2, S.x0 + 3, W, gw.z1 + 4, M.DD); p.walls(S.x0 + 1, W + 1, gw.z1 + 2, S.x0 + 3, W + 2, gw.z1 + 4, M.GL); p.box(S.x0 + 1, W + 3, gw.z1 + 2, S.x0 + 3, W + 3, gw.z1 + 4, M.DD);
  p.set(S.x0 + 2, W + 3, gw.z1 + 3, M.GLOW); p.set(S.x0 + 2, W + 1, gw.z1 + 2, M.CON); p.box(S.x0 + 3, W + 1, gw.z1 + 3, S.x0 + 3, W + 2, gw.z1 + 3, M.AIR);
  const gn = S.gateN;
  p.col(gn.x0 - 1, S.z0, W, W + 3, M.DD); p.col(gn.x1 + 1, S.z0, W, W + 3, M.DD); p.box(gn.x0 - 1, W + 4, S.z0, gn.x1 + 1, W + 4, S.z0, M.HOLO);
  for (let x = gn.x0; x <= gn.x1; x++) p.set(x, W + 1, S.z0, (x & 1) ? M.RED : M.STR);
  p.box(gn.x1 + 2, W, S.z0 + 1, gn.x1 + 4, W, S.z0 + 3, M.DD); p.walls(gn.x1 + 2, W + 1, S.z0 + 1, gn.x1 + 4, W + 2, S.z0 + 3, M.GL); p.box(gn.x1 + 2, W + 3, S.z0 + 1, gn.x1 + 4, W + 3, S.z0 + 3, M.DD);
  p.set(gn.x1 + 3, W + 3, S.z0 + 2, M.GLOW); p.set(gn.x1 + 2, W + 1, S.z0 + 2, M.CON); p.box(gn.x1 + 3, W + 1, S.z0 + 3, gn.x1 + 3, W + 2, S.z0 + 3, M.AIR);
  // walk lines from the gates to the pads' service side and on to the post's door
  const post = S.post;
  for (let x = S.x0 + 1; x <= post.x0 + 9; x++) { p.set(x, F, gw.z0 - 2, (x & 3) === 0 ? M.GLOW : LINE); p.set(x, F, gw.z1 + 6, (x & 3) === 0 ? M.GLOW : LINE); }
  for (let z = S.z0 + 1; z <= post.z0 - 1; z++) { p.set(gn.x0 - 2, F, z, (z & 3) === 0 ? M.GLOW : LINE); p.set(gn.x1 + 6, F, z, (z & 3) === 0 ? M.GLOW : LINE); }
  for (let z = gw.z0 - 2; z <= post.z0 - 1; z++) { p.set(post.x0 + 9, F, z, (z & 3) === 0 ? M.GLOW : LINE); }
  // pad designations on the fence line: "SEC 1" / "SEC 2" holo boards on masts north of the pads
  SECURITY_PADS.forEach((pad) => { p.col(pad.x, pad.z - 24, W, W + 3, M.DD); p.box(pad.x - 1, W + 4, pad.z - 24, pad.x + 1, W + 5, pad.z - 24, M.HOLO); p.set(pad.x, W + 6, pad.z - 24, M.RED); });
}

function paintPost(p) {
  const P = S.post;
  if (!p.overlaps(P.x0, P.z0, P.x1, P.z1)) return;
  const roof = P.roof, xc = P.door.x;
  const [x0, x1] = p.xRange(P.x0, P.x1), [z0, z1] = p.zRange(P.z0, P.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const onX = x === P.x0 || x === P.x1, onZ = z === P.z0 || z === P.z1;
    if (onX || onZ) {
      const along = onX ? z - P.z0 : x - P.x0;
      for (let y = W; y < roof; y++) {
        let id = M.DD;
        if ((along & 5) === 0) id = M.D;
        else if (y === W + 3 && (along & 3) !== 0) id = M.GL;                                    // slit window band
        else if (y === W + 1 && z === P.z0 && !onX) id = M.RED;                                    // Guard red band on the front
        else if (y === roof - 1) id = M.STR;
        p.set(x, y, z, id);
      }
    } else if (((x - P.x0) & 7) === 0 || ((z - P.z0) & 7) === 0) p.set(x, F, z, M.DD);
    p.set(x, roof, z, (onX || onZ) ? M.D : M.DD);
    if (!onX && !onZ && ((x - P.x0) & 3) === 2 && ((z - P.z0) & 3) === 2) p.set(x, roof - 1, z, M.GLOW);
  }
  // door (3 wide) in the north face with the holo header and the Guard crest (red / white panels) beside it
  p.box(xc - 1, W, P.z0, xc + 1, W + 2, P.z0, M.AIR); p.box(xc - 1, W + 3, P.z0, xc + 1, W + 4, P.z0, M.HOLO);
  p.col(xc - 2, P.z0, W, W + 4, M.GLOW); p.col(xc + 2, P.z0, W, W + 4, M.GLOW);
  for (const x of [xc - 6, xc + 6]) { p.box(x - 1, W + 4, P.z0, x + 1, W + 6, P.z0, M.RED); p.set(x, W + 5, P.z0, M.GLOW); }
  // interior: front desk facing the door, holding cells (bars) in the south-west, armoury racks in the south-east,
  // briefing benches, lockers, a duty console row on the east wall
  p.box(xc - 5, W, P.z0 + 7, xc + 5, W, P.z0 + 7, M.DD); p.set(xc - 3, W, P.z0 + 7, M.CON); p.set(xc + 3, W, P.z0 + 7, M.CON); p.box(xc - 1, W + 3, P.z0 + 8, xc + 1, W + 4, P.z0 + 8, M.HOLO);
  const cz0 = P.z1 - 10;
  p.box(P.x0 + 1, W, cz0, P.x0 + 13, W + 2, cz0, M.BARS); p.box(P.x0 + 7, W, cz0, P.x0 + 7, W + 2, P.z1 - 1, M.BARS); p.box(P.x0 + 1, W + 3, cz0, P.x0 + 13, W + 3, P.z1 - 1, M.DD);
  p.box(P.x0 + 13, W, cz0, P.x0 + 13, W + 2, P.z1 - 1, M.BARS);
  for (const x of [P.x0 + 3, P.x0 + 10]) { p.box(x, W, cz0, x, W + 1, cz0, M.AIR); p.set(x, W + 2, cz0, M.RED); p.set(x, W, P.z1 - 2, M.SLAB); }
  p.box(P.x1 - 12, W, P.z1 - 1, P.x1 - 1, W + 1, P.z1 - 1, M.SHELF); p.box(P.x1 - 12, W + 2, P.z1 - 1, P.x1 - 1, W + 2, P.z1 - 1, M.BLUE);   // armoury racks
  p.box(P.x1 - 1, W, P.z1 - 10, P.x1 - 1, W + 1, P.z1 - 2, M.SHELF);
  for (let x = P.x0 + 16; x <= P.x1 - 14; x++) for (const z of [P.z0 + 12, P.z0 + 16]) if ((x - P.x0) % 5 !== 0) p.set(x, W, z, M.SLAB);   // briefing benches
  p.box(P.x1 - 8, W + 2, P.z0 + 10, P.x1 - 2, W + 3, P.z0 + 10, M.HOLO);                                                   // briefing screen
  for (let z = P.z0 + 3; z <= P.z0 + 15; z += 2) p.set(P.x1 - 1, W, z, (z & 3) === 1 ? M.CON : M.DD);                     // duty consoles
  for (let x = P.x0 + 2; x <= P.x0 + 12; x += 2) { p.box(x, W, P.z0 + 1, x, W + 1, P.z0 + 1, M.DD); p.set(x, W + 1, P.z0 + 1, M.BLUE); }   // lockers
  // roof: comm mast with a red beacon, searchlight, parapet corners
  p.box(P.x1 - 4, roof + 1, P.z1 - 4, P.x1 - 4, roof + 8, P.z1 - 4, M.DD); p.set(P.x1 - 4, roof + 9, P.z1 - 4, M.RED);
  p.box(P.x0 + 3, roof + 1, P.z0 + 3, P.x0 + 3, roof + 2, P.z0 + 3, M.DD); p.set(P.x0 + 3, roof + 3, P.z0 + 3, M.LAMP);
  for (const x of [P.x0, P.x1]) for (const z of [P.z0, P.z1]) p.set(x, roof + 1, z, M.DD);
  lampPost(p, P.x0 - 2, P.z0 - 2, W); lampPost(p, P.x1 + 2, P.z0 - 2, W);
}

export function paintSecurity(p) {
  paintFence(p);
  paintPost(p);
}
