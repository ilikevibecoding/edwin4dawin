// Hitscan ballistics with glass interaction, thin-wall penetration, capsule hit regions and
// distance falloff. Used by both player and AI fire. (Opus 2 domain)
import { HEAD_MULT, LEG_MULT } from './defs.js';
import { bus } from '../core/events.js';

// entities: [{ kind:'enemy'|'player'|'hostage', ref, capsule: () => {x, z, y0, y1, r}, alive }]
export function fireHitscan({ world, entities, origin, dir, def, shooter, rng, damageScale = 1 }) {
  let ox = origin.x, oy = origin.y, oz = origin.z;
  let dx = dir.x, dy = dir.y, dz = dir.z;
  let damage = def.damage * damageScale;
  let glassLeft = 3;
  let wallsLeft = def.penetration >= 0.5 ? 1 : 0;
  let traveled = 0;
  const events = [];
  const maxRange = def.range ?? 80;

  for (let hop = 0; hop < 6; hop++) {
    const remaining = maxRange - traveled;
    if (remaining <= 0.1 || damage < 3) break;
    const worldHit = world.raycast(ox, oy, oz, dx, dy, dz, remaining, (c) => c.blockShot || c.tag === 'glass');
    let entHit = null;
    for (const e of entities) {
      if (!e.alive || e.ref === shooter) continue;
      const cap = e.capsule();
      const t = rayCapsule(ox, oy, oz, dx, dy, dz, cap, remaining);
      if (t != null && (!entHit || t < entHit.t)) entHit = { t, e, cap };
    }

    if (entHit && (!worldHit || entHit.t < worldHit.t)) {
      const px = ox + dx * entHit.t, py = oy + dy * entHit.t, pz = oz + dz * entHit.t;
      const frac = (py - entHit.cap.y0) / Math.max(0.01, entHit.cap.y1 - entHit.cap.y0);
      const region = frac > 0.84 ? 'head' : frac < 0.42 ? 'legs' : 'torso';
      const mult = region === 'head' ? HEAD_MULT : region === 'legs' ? LEG_MULT : 1;
      const dist = traveled + entHit.t;
      const fall = falloff(dist, def);
      const dealt = damage * mult * fall;
      events.push({ type: 'entity', kind: entHit.e.kind, region, point: { x: px, y: py, z: pz }, damage: dealt, target: entHit.e.ref });
      entHit.e.ref.damage(dealt, { x: ox, y: oy, z: oz }, region, shooter);
      bus.emit('impact', { point: { x: px, y: py, z: pz }, normal: { x: -dx, y: -dy, z: -dz }, material: 'flesh', kind: entHit.e.kind });
      break; // bodies stop bullets
    }

    if (!worldHit) {
      break; // flew into the void / sky
    }

    const c = worldHit.collider;
    const p = worldHit.point;
    traveled += worldHit.t;

    if (c.tag === 'glass' && c.ref) {
      const pane = c.ref;
      const wasIntact = pane.state !== 'broken';
      pane.hit(p);
      bus.emit('impact', { point: p, normal: worldHit.normal, material: 'glass' });
      events.push({ type: 'surface', material: 'glass', point: p });
      if (glassLeft-- > 0) {
        damage *= 0.92;
        ox = p.x + dx * 0.06; oy = p.y + dy * 0.06; oz = p.z + dz * 0.06;
        continue;
      }
      break;
    }

    // door leaves & thin interior walls can be penetrated by rifles
    const thin = c.thin && c.thin > 0 && c.thin < 0.22;
    bus.emit('impact', { point: p, normal: worldHit.normal, material: c.material || 'concrete' });
    events.push({ type: 'surface', material: c.material, point: p });
    if (thin && wallsLeft > 0 && def.penetration >= 0.5) {
      wallsLeft--;
      damage *= 0.5;
      // jitter the continued path slightly
      if (rng) {
        dx += (rng.next() - 0.5) * 0.02; dy += (rng.next() - 0.5) * 0.02; dz += (rng.next() - 0.5) * 0.02;
        const len = Math.hypot(dx, dy, dz); dx /= len; dy /= len; dz /= len;
      }
      const exitT = (c.thin ?? 0.16) + 0.05;
      ox = p.x + dx * exitT; oy = p.y + dy * exitT; oz = p.z + dz * exitT;
      // exit-side impact
      bus.emit('impact', { point: { x: ox, y: oy, z: oz }, normal: { x: dx, y: dy, z: dz }, material: c.material || 'drywall', exit: true });
      continue;
    }
    break;
  }
  return events;
}

function falloff(dist, def) {
  const start = def.falloffStart ?? 20;
  const range = def.range ?? 80;
  if (dist <= start) return 1;
  return Math.max(0.42, 1 - ((dist - start) / Math.max(1, range - start)) * 0.58);
}

// Ray vs vertical capsule: returns t or null.
export function rayCapsule(ox, oy, oz, dx, dy, dz, cap, maxDist) {
  const ay0 = cap.y0 + cap.r, ay1 = cap.y1 - cap.r;
  // 2D circle test in XZ for the infinite cylinder
  const mx = ox - cap.x, mz = oz - cap.z;
  const a = dx * dx + dz * dz;
  let tCyl = null;
  if (a > 1e-8) {
    const b = 2 * (mx * dx + mz * dz);
    const cc = mx * mx + mz * mz - cap.r * cap.r;
    const disc = b * b - 4 * a * cc;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t > 0 && t < maxDist) {
        const y = oy + dy * t;
        if (y >= cap.y0 && y <= cap.y1) tCyl = t;
      }
    }
  } else {
    // vertical ray: inside circle?
    if (mx * mx + mz * mz <= cap.r * cap.r) {
      const tTop = (cap.y1 - oy) / dy;
      const tBot = (cap.y0 - oy) / dy;
      const t = Math.min(...[tTop, tBot].filter((v) => v > 0));
      if (isFinite(t) && t < maxDist) tCyl = t;
    }
  }
  return tCyl;
}
