// Fire exchange: target selection (nearest, with a taste for already-damaged and doomed enemies, one
// target per side of the hull so both broadsides work), heavy turrets firing in staggered salvos with a
// long recharge, light guns in rapid sporadic bursts, leads on the target's drift, a share of misses that
// fly past the hull and burst as flak, and a density controller that holds the number of capital-ship
// bolts in flight inside a band whatever the fleet size.
import * as THREE from "three";
import { BOLT_COLORS } from "./weapons.js";

const _from = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _to = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _line = new THREE.Vector3();
const _side = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// damage is in hit points (CLASS_INFO.hp: a Munificent has 70, a Venator 130); ships that are not
// marked by the director take a fifth of it, doomed ships three times it (see choreoDamage)
export const BOLT_SPECS = {
  heavy: {
    republic: {
      color: BOLT_COLORS.republic,
      speed: 2500,
      length: 110,
      radius: 3.4,
      damage: 0.35,
    },
    separatist: {
      color: BOLT_COLORS.separatist,
      speed: 2500,
      length: 95,
      radius: 3.0,
      damage: 0.35,
    },
  },
  light: {
    republic: {
      color: BOLT_COLORS.republic,
      speed: 3000,
      length: 56,
      radius: 1.9,
      damage: 0.08,
    },
    separatist: {
      color: BOLT_COLORS.separatist,
      speed: 3000,
      length: 50,
      radius: 1.8,
      damage: 0.08,
    },
  },
  fighter: {
    republic: {
      color: BOLT_COLORS.fighterRepublic,
      speed: 3400,
      length: 24,
      radius: 0.7,
      damage: 0.015,
    },
    separatist: {
      color: BOLT_COLORS.fighterSeparatist,
      speed: 3400,
      length: 24,
      radius: 0.7,
      damage: 0.015,
    },
  },
};

export const MISS_RATE = 0.3;
const MAX_RANGE = 16000;

// Density controller: the recharge times of every gun are divided by `heat`, which climbs while too few
// heavy turbolaser bolts are in flight and drops when there are too many. The heavy salvos are what
// reads on camera at a few kilometres; the light guns ride along on the same factor.
export class Heat {
  constructor(lo = 80, hi = 140) {
    this.lo = lo;
    this.hi = hi;
    this.value = 1;
  }
  update(inFlight, dt) {
    // slow proportional slew outside the band: the guns answer a change of heat only after their
    // current recharge (several seconds), so a fast integrator would hunt
    const mid = 0.5 * (this.lo + this.hi);
    let err = 0;
    if (inFlight < this.lo) err = (this.lo - inFlight) / mid;
    else if (inFlight > this.hi) err = (this.hi - inFlight) / mid;
    this.value = THREE.MathUtils.clamp(this.value + err * 0.15 * dt, 0.4, 3.0);
  }
}

// nominal heavy recharge between salvos (divided by heat); the initial cooldowns are spread over it so
// the exchange starts at its steady rhythm instead of every gun firing in the first seconds
export const HEAVY_RECHARGE = [9, 19];

// Pick the primary target (best score) and a secondary one on the opposite side of the hull. Every ship
// counts how many enemies have it as primary target (`targetedBy`) so fire spreads over the line
// instead of everyone hammering the nearest hull.
export function chooseTargets(st, states, rand) {
  const s = st.ship;
  _side.set(1, 0, 0).applyQuaternion(s.quaternion);
  let best = null;
  let bestScore = Infinity;
  let bestSide = 0;
  for (const o of states) {
    if (o.side === st.side || o.dead || o.dying) continue;
    const d = o.ship.position.distanceTo(s.position);
    if (d > MAX_RANGE) continue;
    // nearer is better; hurt or doomed ships draw fire; crowded targets repel it; noise on top
    let score = d * (1 - 0.2 * (1 - o.hpFrac())) * (o.doomed ? 0.45 : 1);
    score *= 1 + 0.18 * (o.targetedBy - (st.target === o ? 1 : 0));
    score *= 0.7 + 0.6 * rand();
    if (score < bestScore) {
      bestScore = score;
      best = o;
      _to.subVectors(o.ship.position, s.position);
      bestSide = Math.sign(_to.dot(_side)) || 1;
    }
  }
  setTarget(st, best);
  st.target2 = null;
  if (!best) return;
  let best2 = null;
  let best2Score = Infinity;
  for (const o of states) {
    if (o === best || o.side === st.side || o.dead || o.dying) continue;
    _to.subVectors(o.ship.position, s.position);
    if (Math.sign(_to.dot(_side)) === bestSide) continue;
    const d = _to.length();
    if (d > MAX_RANGE * 0.7) continue;
    const score = d * (1 - 0.3 * (1 - o.hpFrac()));
    if (score < best2Score) {
      best2Score = score;
      best2 = o;
    }
  }
  st.target2 = best2;
}

// Change a ship's primary target, keeping the targets' `targetedBy` counts current.
export function setTarget(st, tgt) {
  if (st.target === tgt) return;
  if (st.target) st.target.targetedBy = Math.max(0, st.target.targetedBy - 1);
  st.target = tgt;
  st.ship.target = tgt ? tgt.ship : null; // the fleet's tracking turrets follow Ship.target
  if (tgt) tgt.targetedBy++;
}

// Fire hardpoint i of `st` at target state `tgt`. Returns true when a bolt left the barrel.
function fireAt(st, i, tgt, ctx) {
  const s = st.ship;
  const t = tgt.ship;
  const hp = s.model.hardpoints[i];
  const { bolts, rand, stats } = ctx;
  s.hardpointWorld(i, _from, _dir);
  // turrets cannot shoot through their own hull: the target must lie on the hardpoint's side
  _line.subVectors(t.position, _from);
  const dist = _line.length();
  if (dist > hp.range || dist < 50) return false;
  _line.divideScalar(dist);
  if (_line.dot(_dir) < -0.2) return false;
  // aim: the salvo's shared hull point (a surface sample chosen at salvo start) plus scatter and lead
  const surf = t.model.surface;
  const ns = surf.length / 3;
  if (ns > 0) {
    const k = (st.aimIdx[i] % ns) * 3;
    _aim.set(surf[k], surf[k + 1], surf[k + 2]).applyMatrix4(t.matrix);
  } else _aim.copy(t.position);
  const spec = BOLT_SPECS[hp.kind === "heavy" ? "heavy" : "light"][st.side];
  const flight = dist / spec.speed;
  _aim.addScaledVector(t.velocity, flight);
  const scatter = hp.kind === "heavy" ? 35 : 60;
  _aim.x += rand.range(-scatter, scatter);
  _aim.y += rand.range(-scatter, scatter);
  _aim.z += rand.range(-scatter, scatter);
  const miss = rand() < MISS_RATE * (tgt.doomed ? 0.6 : 1);
  if (miss) {
    // a wide shot: carries on past the hull and bursts as flak beyond it
    _line.subVectors(_aim, _from).normalize();
    _aim.addScaledVector(_line, rand.range(350, 1100));
    _side.crossVectors(_line, UP).normalize();
    const r = t.model.bounds.radius;
    _aim.addScaledVector(_side, rand.sign() * rand.range(r * 0.3, r * 0.75));
    _aim.y += rand.range(-r * 0.45, r * 0.45);
  }
  const b = bolts.fire(_from, _aim, {
    ...spec,
    target: t,
    side: st.side,
    kind: hp.kind === "heavy" ? "turbo" : "light",
  });
  if (!b) return false;
  b.miss = miss;
  b.capital = true;
  b.heavy = hp.kind === "heavy";
  ctx.inFlight.n++;
  if (miss) stats.misses++;
  if (b.heavy) {
    ctx.inFlight.heavy++;
    stats.shotsHeavy++;
  } else stats.shotsLight++;
  return true;
}

// Per-frame gun loop for one ship: cooldowns, salvo sequencing, target choice per hardpoint.
export function updateGuns(st, dt, ctx) {
  const s = st.ship;
  const hps = s.model.hardpoints;
  const n = hps.length;
  const cd = s.cooldowns;
  const heat = ctx.heat.value;
  const rand = ctx.rand;
  const hasTarget = st.target || st.target2;
  for (let i = 0; i < n; i++) {
    cd[i] -= dt;
    if (cd[i] > 0) continue;
    if (!hasTarget) {
      cd[i] = 0.5;
      continue;
    }
    const hp = hps[i];
    const heavy = hp.kind === "heavy";
    // which target can this gun see? try the primary, then the one on the other side
    let fired = false;
    if (st.target && fireAt(st, i, st.target, ctx)) fired = true;
    else if (st.target2 && fireAt(st, i, st.target2, ctx)) fired = true;
    if (!fired) {
      st.salvoLeft[i] = 0;
      cd[i] = 0.6 + rand() * 0.9; // masked by the hull: try again shortly
      continue;
    }
    if (heavy) {
      if (st.salvoLeft[i] === 0) {
        // start of a salvo: 2-4 bolts 80-150 ms apart (this one plus 1-3 more), then a long recharge
        st.salvoLeft[i] = 1 + rand.int(3);
        ctx.stats.salvos++;
      } else st.salvoLeft[i]--;
      if (st.salvoLeft[i] > 0) cd[i] = rand.range(0.08, 0.15);
      else {
        cd[i] = rand.range(HEAVY_RECHARGE[0], HEAVY_RECHARGE[1]) / heat;
        st.aimIdx[i] = rand.int(65535); // next salvo walks to another point on the hull
      }
    } else {
      // light guns: sporadic bursts of a few quick rounds, then a long pause
      st.aimIdx[i] = rand.int(65535);
      if (st.salvoLeft[i] === 0) st.salvoLeft[i] = 1 + rand.int(3);
      else st.salvoLeft[i]--;
      cd[i] =
        st.salvoLeft[i] > 0
          ? rand.range(0.3, 0.6)
          : rand.range(7, 16) / Math.min(heat, 1.5);
    }
  }
}

// fighter-vs-fighter rounds that connect (3-round bursts every 2-5 s of a dogfight); together with the
// point defence below this puts the mean fighter life at two to three minutes
export const DOGFIGHT_HIT_CHANCE = 0.15;

// Fighter lasers: called by fighters.update for every fighter that wants to shoot. A second argument (a
// fighter quarry) means fighter-vs-fighter fire; otherwise the fighter strafes its anchor capital ship.
export function makeFighterFire(ctx) {
  return (f, quarry) => {
    const { bolts } = ctx;
    const rand = ctx.frand; // the fighters' own stream (see choreography.js)
    if (bolts.alive > 1250) return; // keep headroom in the bolt pool for the capital exchange
    const spec = BOLT_SPECS.fighter[f.side] || BOLT_SPECS.fighter.republic;
    if (quarry && quarry.pos) {
      // lead: the quarry's `vel` is a unit heading, its speed is separate
      _aim.copy(quarry.pos);
      if (quarry.vel)
        _aim.addScaledVector(
          quarry.vel,
          (quarry.speed || 250) * (_aim.distanceTo(f.pos) / spec.speed),
        );
      _aim.x += rand.range(-8, 8);
      _aim.y += rand.range(-8, 8);
      _aim.z += rand.range(-8, 8);
      const b = bolts.fire(f.pos, _aim, {
        ...spec,
        target: null,
        side: f.side,
        kind: "fighter",
      });
      if (b) {
        // the bolt pool recycles records without clearing our flags: set every one of them
        b.miss = rand() >= DOGFIGHT_HIT_CHANCE;
        b.fighterTarget = quarry;
        b.pd = false;
      }
      return;
    }
    const t = f.anchor;
    if (!t || !t.alive) return;
    t.randomSurfacePoint(_aim, rand);
    const b = bolts.fire(f.pos, _aim, {
      ...spec,
      target: t,
      side: f.side,
      kind: "fighter",
    });
    if (b) {
      b.miss = rand() < 0.4;
      b.fighterTarget = null;
      b.pd = false;
    }
  };
}

// Point defence: every living capital ship snaps a shot at the nearest enemy fighter inside 1.5 km from
// its closest light emplacement every second or three (one short bolt, ~10 % hits: the swarms should
// live two or three minutes, not seconds). Hits feed the fighter's health counter through the
// fighter-vs-fighter path of the hit handler, so fighters die and relaunch from their hangars. Uses the
// fighters' random stream, keeping the capital exchange reproducible.
const _pd = new THREE.Vector3();
const PD_RANGE2 = 1500 * 1500;
export const PD_HIT_CHANCE = 0.1;
export const PD_COOLDOWN = [1.05, 3.15];
export function pointDefence(ctx, dt) {
  const { fleet, bolts, fighters, frand } = ctx;
  if (!fighters || !fighters.all) return;
  ctx.pdTimer = (ctx.pdTimer || 0) - dt;
  if (ctx.pdTimer > 0) return;
  ctx.pdTimer = 0.1;
  if (bolts.alive > 1200) return;
  const list = fighters.all;
  for (const s of fleet.ships) {
    if (!s.alive || s.health <= 0) continue;
    s.pdCool = (s.pdCool || 0) - 0.1;
    if (s.pdCool > 0) continue;
    let best = null;
    let bestD = PD_RANGE2;
    for (const f of list) {
      if (!f.alive || f.side === s.side) continue;
      const d = f.pos.distanceToSquared(s.position);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    if (!best) {
      s.pdCool = 0.5;
      continue;
    }
    const hps = s.model.hardpoints;
    let hi = -1;
    let hd = Infinity;
    for (let i = 0; i < hps.length; i++) {
      if (hps[i].kind !== "light") continue;
      s.hardpointWorld(i, _pd);
      const d = _pd.distanceToSquared(best.pos);
      if (d < hd) {
        hd = d;
        hi = i;
      }
    }
    if (hi < 0) {
      s.pdCool = 1;
      continue;
    }
    s.hardpointWorld(hi, _pd);
    const spec = BOLT_SPECS.fighter[s.side] || BOLT_SPECS.fighter.republic;
    const dist = Math.sqrt(hd);
    _aim.copy(best.pos);
    if (best.vel)
      _aim.addScaledVector(best.vel, (best.speed || 250) * (dist / spec.speed));
    _aim.x += frand.range(-10, 10);
    _aim.y += frand.range(-10, 10);
    _aim.z += frand.range(-10, 10);
    const miss = frand() >= PD_HIT_CHANCE;
    s.pdCool = frand.range(PD_COOLDOWN[0], PD_COOLDOWN[1]);
    const b = bolts.fire(_pd, _aim, {
      ...spec,
      length: 34,
      radius: 1.1,
      target: null,
      side: s.side,
      kind: "fighter",
    });
    if (b) {
      b.miss = miss;
      b.fighterTarget = best;
      b.pd = true;
      ctx.stats.pdShots++;
    }
  }
}
