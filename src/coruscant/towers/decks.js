// Cantilevered landing decks (rubric 11, reference 2): a DECK_PLATE platform hanging off a building face with a
// tapered underside, rails and blue rim lights on the free edges, lamp posts at the free corners, striped touchdown
// marks with a lit centre, an optional parked speeder (a 4-block voxel sketch) and a 3x3 hangar door into the floor
// behind. Shared by the spine family and any family that wants a deck on a facade.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { slab } from '../crowns.js';

const OUT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };

// rect: inclusive deck rect (local xz); y: plate level (walk level y + 1); wall: which side of the rect touches the
// building ('N'|'S'|'E'|'W', the wall cells lie just outside the rect on that side). o: { door, speeder, sign }
export function paintLandingDeck(bp, rect, y, wall, style, o = {}) {
  const { x0, x1, z0, z1 } = rect;
  const W = x1 - x0 + 1, D = z1 - z0 + 1;
  if (W < 3 || D < 3) return false;
  const [wx, wz] = OUT[wall];                         // direction from the deck toward the wall
  const onWall = (x, z) => (wall === 'N' && z === z0) || (wall === 'S' && z === z1) || (wall === 'W' && x === x0) || (wall === 'E' && x === x1);
  const depthOf = (x, z) => (wall === 'N' ? z - z0 : wall === 'S' ? z1 - z : wall === 'W' ? x - x0 : x1 - x);   // 0 at the wall
  slab(bp, x0, z0, x1, z1, y, B.DECK_PLATE);
  // tapered underside: two steps of dark plate under the half of the deck nearest the wall
  const depth = wall === 'N' || wall === 'S' ? D : W;
  for (let k = 1; k <= 2; k++) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const edge = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      if (depthOf(x, z) > Math.max(1, Math.floor(depth * (0.75 - 0.3 * k))) || edge < k - 1) continue;
      if (bp.isAir(x, y - k, z)) bp.set(x, y - k, z, k === 1 ? B.DURASTEEL_DARK : B.DURASTEEL);
    }
  }
  // rails, rim lights and lamp posts on the free edges
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    if (!edge || onWall(x, z)) continue;
    const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
    if (corner) { bp.set(x, y + 1, z, B.IRON_BARS); bp.set(x, y + 2, z, B.IRON_BARS); bp.set(x, y + 3, z, B.CITY_LAMP); continue; }
    bp.set(x, y + 1, z, B.IRON_BARS);
    if ((x + z) % 4 === 0) bp.set(x, y, z, B.GLOW_PANEL_BLUE);
  }
  // touchdown marks: an H of stripes around the deck centre
  const cx = Math.floor((x0 + x1) / 2), cz = Math.floor((z0 + z1) / 2);
  if (W >= 7 && D >= 7) {
    for (let k = -2; k <= 2; k++) { bp.set(cx + k, y, cz - 2, B.PANEL_STRIPE); bp.set(cx + k, y, cz + 2, B.PANEL_STRIPE); bp.set(cx - 2, y, cz + k, B.PANEL_STRIPE); bp.set(cx + 2, y, cz + k, B.PANEL_STRIPE); }
    bp.set(cx, y, cz, B.GLOW_PANEL);
  } else bp.set(cx, y, cz, B.GLOW_PANEL);
  // parked speeder beside the mark: chrome nose, durasteel hull, blue engine glow, steel-glass canopy
  if (o.speeder) {
    const alongX = W >= D;
    const sx = alongX ? x0 + 1 : cx + (W >= 9 ? 3 : -3), sz = alongX ? cz + (D >= 9 ? 3 : -3) : z0 + 1;
    const ex = alongX ? sx + 3 : sx, ez = alongX ? sz : sz + 3;
    if (sx > x0 && sz > z0 && ex < x1 && ez < z1 && !onWall(sx, sz) && !onWall(ex, ez)) {
      const P = (k, id) => bp.set(alongX ? sx + k : sx, y + 1, alongX ? sz : sz + k, id);
      P(0, B.CHROME); P(1, B.DURASTEEL); P(2, B.DURASTEEL); P(3, B.GLOW_PANEL_BLUE);
      bp.set(alongX ? sx + 1 : sx, y + 2, alongX ? sz : sz + 1, B.STEEL_GLASS);
    }
  }
  // hangar door (3 wide, 3 high) in the wall behind the deck centre, a short passage carved to the first free cell
  if (o.door !== false) {
    const dx = wall === 'N' || wall === 'S' ? cx : (wall === 'W' ? x0 - 1 : x1 + 1);
    const dz = wall === 'N' || wall === 'S' ? (wall === 'N' ? z0 - 1 : z1 + 1) : cz;
    const tang = wall === 'N' || wall === 'S' ? [1, 0] : [0, 1];
    for (let k = -1; k <= 1; k++) {
      const px = dx + tang[0] * k, pz = dz + tang[1] * k;
      for (let yy = y + 1; yy <= y + 3; yy++) bp.set(px, yy, pz, FORCE_AIR);
      for (let s = 1; s <= 3; s++) {
        const qx = px + wx * s, qz = pz + wz * s;
        if (bp.isAir(qx, y + 1, qz) && bp.isAir(qx, y + 2, qz)) break;
        bp.set(qx, y + 1, qz, FORCE_AIR); bp.set(qx, y + 2, qz, FORCE_AIR);
      }
    }
    bp.set(dx - tang[0] * 2, y + 2, dz - tang[1] * 2, B.PANEL_RED); bp.set(dx + tang[0] * 2, y + 2, dz + tang[1] * 2, B.PANEL_RED);
    if (o.sign !== false) bp.set(dx, y + 4, dz, B.HOLO_SIGN);
  }
  return true;
}
