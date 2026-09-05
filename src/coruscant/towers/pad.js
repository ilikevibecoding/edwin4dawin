// Family 6: landing-platform tower. A podium on the full lot, then a shaft receded from the front so cantilevered
// landing pads can reach the lot edge every fourth floor: DECK_PLATE decks with striped touchdown marks,
// CITY_LAMP posts, railings, a tapered underside and a 3x3 hangar door into a hangar/garage floor.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { buildTiered } from './tiered.js';

export function pad(bp, lot, ctx) {
  const { nF, midDoorF } = ctx;
  const baseEnd = Math.max(midDoorF, 2, Math.min(nF - 4, 4));
  const tiers = [{ f0: 0, f1: baseEnd }];
  const padFloors = [];
  if (baseEnd < nF - 1) {
    tiers.push({ f0: baseEnd + 1, f1: nF - 1, inset: { f: 6, r: 2 } });
    for (let f = baseEnd + 3; f <= nF - 2; f += 4) padFloors.push(f);
  }
  ctx.style.vents = true;
  const front = ctx.spec.front;
  const hooks = {
    poolFor: (f) => (padFloors.includes(f) ? ctx.pools.pad : f <= 1 ? ctx.pools.ground : f >= nF - 2 ? ctx.pools.top : ctx.pools.typical),
    afterTier: (t, yRoof, frame) => {
      if (t.index !== 1) return;
      const e = t.ext, W = bp.w - 1, D = bp.d - 1;
      for (const f of padFloors) {
        const y = 5 * f;
        // the deck spans the shaft's front width from the shaft wall to the lot edge
        let x0, x1, z0, z1, wallX = null, wallZ = null;
        if (front === 'S') { x0 = e.x0; x1 = e.x1; z0 = e.z1 + 1; z1 = D; wallZ = e.z1; }
        else if (front === 'N') { x0 = e.x0; x1 = e.x1; z0 = 0; z1 = e.z0 - 1; wallZ = e.z0; }
        else if (front === 'E') { z0 = e.z0; z1 = e.z1; x0 = e.x1 + 1; x1 = W; wallX = e.x1; }
        else { z0 = e.z0; z1 = e.z1; x0 = 0; x1 = e.x0 - 1; wallX = e.x0; }
        if (x1 < x0 || z1 < z0) continue;
        const depth = wallZ !== null ? z1 - z0 + 1 : x1 - x0 + 1;
        if (depth < 4) continue;
        bp.fill(x0, y, z0, x1, y, z1, B.DECK_PLATE);
        // tapered underside
        for (let k = 1; k <= 2; k++) {
          if (wallZ !== null) { const zz = front === 'S' ? z0 + k - 1 : z1 - k + 1; bp.fill(x0 + k, y - k, front === 'S' ? z0 : zz, x1 - k, y - k, front === 'S' ? zz : z1, B.DURASTEEL_DARK); }
          else { const xx = front === 'E' ? x0 + k - 1 : x1 - k + 1; bp.fill(front === 'E' ? x0 : xx, y - k, z0 + k, front === 'E' ? xx : x1, y - k, z1 - k, B.DURASTEEL_DARK); }
        }
        // touchdown marks: an H of stripes around the centre, lamp posts at the outer corners, railing on the free edges
        const cx = Math.floor((x0 + x1) / 2), cz = Math.floor((z0 + z1) / 2);
        for (let k = -2; k <= 2; k++) { bp.set(cx + k, y, cz - 2, B.PANEL_STRIPE); bp.set(cx + k, y, cz + 2, B.PANEL_STRIPE); bp.set(cx - 2, y, cz + k, B.PANEL_STRIPE); bp.set(cx + 2, y, cz + k, B.PANEL_STRIPE); }
        bp.set(cx, y, cz, B.GLOW_PANEL);
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
          const onWall = (wallZ !== null && z === (front === 'S' ? z0 : z1)) || (wallX !== null && x === (front === 'E' ? x0 : x1));
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          if (!edge || onWall) continue;
          const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
          if (corner) { bp.set(x, y + 1, z, B.IRON_BARS); bp.set(x, y + 2, z, B.IRON_BARS); bp.set(x, y + 3, z, B.CITY_LAMP); }
          else if ((x + z) % 2 === 0) bp.set(x, y + 1, z, B.IRON_BARS);
        }
        // hangar door in the shaft wall, 3 wide 3 high, plus a short passage carved to the corridor behind
        const din = front === 'S' || front === 'E' ? -1 : 1;
        for (let k = -1; k <= 1; k++) {
          for (let yy = y + 1; yy <= y + 3; yy++) { if (wallZ !== null) bp.set(cx + k, yy, wallZ, FORCE_AIR); else bp.set(wallX, yy, cz + k, FORCE_AIR); }
          for (let s = 1; s <= 3; s++) {
            const px = wallZ !== null ? cx + k : wallX + din * s, pz = wallZ !== null ? wallZ + din * s : cz + k;
            if (bp.isAir(px, y + 1, pz) && bp.isAir(px, y + 2, pz)) break;
            bp.set(px, y + 1, pz, FORCE_AIR); bp.set(px, y + 2, pz, FORCE_AIR);
          }
        }
        if (wallZ !== null) { bp.set(cx - 2, y + 2, wallZ, B.PANEL_RED); bp.set(cx + 2, y + 2, wallZ, B.PANEL_RED); bp.set(cx, y + 4, wallZ, B.HOLO_SIGN); }
        else { bp.set(wallX, y + 2, cz - 2, B.PANEL_RED); bp.set(wallX, y + 2, cz + 2, B.PANEL_RED); bp.set(wallX, y + 4, cz, B.HOLO_SIGN); }
      }
    },
    crownKind: 'beacon',
  };
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'pad', hooks });
}
