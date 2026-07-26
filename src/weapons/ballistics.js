// Hitscan ballistics with glass interaction, material-aware penetration, capsule hit regions and
// distance falloff. Used by both player and AI fire. (Opus 2 domain)
import { HEAD_MULT, LEG_MULT, WEAPONS } from './defs.js';
import { bus } from '../core/events.js';

// What a bullet can get through, by surface material.
//   minPen    the weapon's `penetration` must reach this to pass at all
//   maxThick  metres of material the round will cross (measured along the ray, per collider)
//   dmgMul    extra damage multiplier applied on top of the weapon's own retention
// Anything absent from this table — concrete, metal, stone — stops every round in the game.
const PENETRABLE = {
  drywall: { minPen: 0.25, maxThick: 0.25, dmgMul: 1 },
  wood: { minPen: 0.45, maxThick: 0.2, dmgMul: 0.85 },
  tile: { minPen: 0.55, maxThick: 0.16, dmgMul: 0.75 },
  snow: { minPen: 0.2, maxThick: 0.9, dmgMul: 0.9 },
};

// How much damage survives one wall, as a function of the weapon's penetration rating. The K5
// (0.35) keeps 43 %; the LR-8 (0.95) keeps 79 % and stays lethal through an office partition.
function retention(pen) {
  return 0.22 + Math.min(1, Math.max(0, pen)) * 0.6;
}

// Thickness of a collider along the ray, so a partition hit at a glancing angle is harder to
// punch through than one hit square on. Deterministic: no rng anywhere in the penetration path.
function thicknessAlong(c, dx, dy, dz) {
  const sx = Math.abs(dx) > 1e-6 ? (c.max.x - c.min.x) / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 1e-6 ? (c.max.y - c.min.y) / Math.abs(dy) : Infinity;
  const sz = Math.abs(dz) > 1e-6 ? (c.max.z - c.min.z) / Math.abs(dz) : Infinity;
  const t = Math.min(sx, sy, sz);
  return Number.isFinite(t) ? t : 0.16;
}

// entities: [{ kind:'enemy'|'player'|'hostage', ref, capsule: () => {x, z, y0, y1, r}, alive }]
export function fireHitscan({ world, entities, origin, dir, def, shooter, rng, damageScale = 1 }) {
  let ox = origin.x, oy = origin.y, oz = origin.z;
  const dx = dir.x, dy = dir.y, dz = dir.z;
  // A melee swing arrives with an inline def built by the mission's swing handler. The blade's own
  // numbers live in defs.js, so those stay the authority for damage and the backstab bonus.
  const blade = def.class === 'melee' ? WEAPONS['cq-blade'] : null;
  let damage = (blade ? blade.damage : def.damage) * damageScale;
  let glassLeft = 3;   // cap: three panes
  let wallsLeft = 1;   // cap: one solid wall, whatever the weapon
  let traveled = 0;
  const events = [];
  const maxRange = def.range ?? 80;
  const pen = def.penetration ?? 0;

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
      const back = backstabMul(blade ?? def, entHit.e.ref, dx, dz);
      const dealt = damage * mult * fall * back;
      events.push({
        type: 'entity', kind: entHit.e.kind, region, point: { x: px, y: py, z: pz },
        damage: dealt, target: entHit.e.ref, dist, backstab: back > 1,
      });
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
      pane.hit(p);
      bus.emit('impact', { point: p, normal: worldHit.normal, material: 'glass' });
      events.push({ type: 'surface', material: 'glass', point: p });
      if (glassLeft-- > 0) {
        // glass always lets a round through, for a small toll
        damage *= 0.92;
        ox = p.x + dx * 0.06; oy = p.y + dy * 0.06; oz = p.z + dz * 0.06;
        continue;
      }
      break;
    }

    bus.emit('impact', { point: p, normal: worldHit.normal, material: c.material || 'concrete' });
    events.push({ type: 'surface', material: c.material, point: p });

    const rule = PENETRABLE[c.material];
    const thick = thicknessAlong(c, dx, dy, dz);
    if (wallsLeft > 0 && rule && pen >= rule.minPen && thick <= rule.maxThick) {
      wallsLeft--;
      damage *= retention(pen) * rule.dmgMul;
      const exitT = thick + 0.04;
      ox = p.x + dx * exitT; oy = p.y + dy * exitT; oz = p.z + dz * exitT;
      // exit wound on the far face, so both sides of a shot-through partition show it
      bus.emit('impact', {
        point: { x: ox, y: oy, z: oz }, normal: { x: dx, y: dy, z: dz },
        material: c.material || 'drywall', exit: true,
      });
      events.push({ type: 'penetration', material: c.material, thickness: +thick.toFixed(3), point: { x: ox, y: oy, z: oz }, damage });
      continue;
    }
    break;
  }
  return events;
}

/** Knife in the back: ×2 when the target is facing away from where the blade came from. */
function backstabMul(def, target, dx, dz) {
  const mul = def.backstabMul;
  if (!mul || target?.yaw == null) return 1;
  // the target's own facing, and the direction the blade travels
  const fx = -Math.sin(target.yaw), fz = -Math.cos(target.yaw);
  const len = Math.hypot(dx, dz) || 1;
  return (fx * dx + fz * dz) / len > 0.35 ? mul : 1;
}

function falloff(dist, def) {
  const start = def.falloffStart ?? 20;
  const end = def.falloffEnd ?? def.range ?? 80;
  const floor = def.falloffFloor ?? 0.45;
  const curve = def.falloffCurve ?? 1;
  if (dist <= start) return 1;
  if (dist >= end) return floor;
  return 1 - (1 - floor) * Math.pow((dist - start) / (end - start), curve);
}

// Ray vs vertical capsule: returns t or null.
export function rayCapsule(ox, oy, oz, dx, dy, dz, cap, maxDist) {
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
