// Damage drama and the battle director: hits accumulate into hit points, every so much damage starts a
// persistent fire at the impact, badly hurt ships vent smoke and secondary bursts from their wounds, and a
// ship that runs out of hit points dies in a staged sequence (secondaries escalating along the hull while
// the engines fail, two or three sub-blasts down the spine, the final detonation, then a burning hulk).
// The director paces the deaths: it dooms a victim every minute or so (enemy fire converges on it), holds
// every 3-minute window to 2-4 deaths (a ship that runs out of hit points when the window is full burns
// critically and waits for its turn), keeps at least 70% of the original fleet alive, retires wrecks a few
// minutes after death so their class capacity frees, and brings reinforcements in from high above.
//
// Particle budgets are tested per layer (`explosions.hasRoom("add" | "smoke", frac)`): flames, ripples and
// bursts need room in the additive layer, smoke in the smoke layer. Random draws always happen before the
// budget checks so the capital ships' seeded stream never depends on the (unseeded) particle load.
import * as THREE from "three";
import { makeHulk } from "./choreoMotion.js";
import { classInfo } from "./choreoLayout.js";
import { setTarget } from "./choreoCombat.js";

const _inv = new THREE.Matrix4();
const _n = new THREE.Vector3();
const _local = new THREE.Vector3();
const _w = new THREE.Vector3();

const MIN_ALIVE_FRACTION = 0.7;
const WINDOW = 180; // s
const MAX_DEATHS_PER_WINDOW = 4;
const MIN_DEATHS_PER_WINDOW = 2; // below this the director dooms the next victim early
export const FIRST_DOOM = [12, 22]; // s after the visible start
export const DOOM_INTERVAL = [40, 70]; // s between scheduled dooms
const DOOM_FORCE = 18; // s: a doomed ship that outlives the focus fire this long goes anyway
const HULK_RETIRE = [180, 300]; // s after death before a wreck is retired
const MAX_FIRES = 12; // persistent fire records per ship
const FIRE_LIFE = [100, 240]; // s a fire burns on a ship that is still fighting (wrecks burn until retired)
const MIN_DEATH_GAP = 30; // s between deaths the director did not schedule (the marked ones set the beat)

// Budget test on one particle layer ("add" for everything that glows, "smoke" for the smoke puffs).
// Falls back to the summed count for an Explosions without the per-layer test.
export function roomFor(explosions, layer = "add", frac = 0.9) {
  if (typeof explosions.hasRoom === "function")
    return explosions.hasRoom(layer, frac);
  return explosions.alive < (layer === "smoke" ? 1600 : 1150);
}

export class Director {
  constructor(ctx) {
    // { states, fleet, explosions, rand, stats, inFlight, time(), spawnReinforcement, forget(ship),
    //   reinforceChance, fighters, frand }
    this.ctx = ctx;
    this.fleetSize = Math.max(1, ctx.states.length); // the original fleet: the floor is against this
    this.nextDoomAt = ctx.rand.range(FIRST_DOOM[0], FIRST_DOOM[1]);
    this.lastDoomAt = -Infinity;
    this.dryCheckAt = 0;
    this.relightT = 1;
    this.pendingReinforcements = [];
    this.deaths = 0;
    this.retired = 0;
    this.deathTimes = []; // when each death sequence began (for the rolling window)
    this.deathLog = []; // { t, cls, id, doomedFor } for diagnostics
  }

  get alive() {
    let n = 0;
    for (const st of this.ctx.states) if (!st.dead) n++;
    return n;
  }
  recentDeaths() {
    const now = this.ctx.time();
    const times = this.deathTimes;
    while (times.length && now - times[0] > WINDOW) times.shift();
    return times.length;
  }
  doomedCount() {
    let n = 0;
    for (const st of this.ctx.states) if (st.doomed && !st.dying) n++;
    return n;
  }
  // may one more ship die now? (fleet floor against the original fleet size and the rolling 3-minute
  // budget; ships already dying or marked to die count against both)
  canDie() {
    let alive = 0;
    let dying = 0;
    let doomed = 0;
    for (const st of this.ctx.states) {
      if (st.dead) continue;
      alive++;
      if (st.dying) dying++;
      else if (st.doomed) doomed++;
    }
    if ((alive - dying - doomed - 1) / this.fleetSize < MIN_ALIVE_FRACTION)
      return false;
    return this.recentDeaths() + doomed < MAX_DEATHS_PER_WINDOW;
  }

  // a new persistent fire at a local hull point, burning `life` seconds (Infinity on wrecks). The record
  // is always kept (so the ship state stays reproducible); the flame is lit when the additive layer has
  // room, otherwise it is lit later by the tending pass (so wrecks never stay dark for long).
  ignite(st, local, size, life = Infinity) {
    const s = st.ship;
    const rec = {
      local: local.clone(),
      size,
      lit: false,
      emitter: null,
      until: this.ctx.time() + life,
    };
    s.fires.push(rec);
    this.light(s, rec, 0.9);
  }
  light(s, rec, frac) {
    if (rec.lit) return true;
    if (!roomFor(this.ctx.explosions, "add", frac)) {
      this.ctx.stats.firesDeferred++;
      return false;
    }
    rec.emitter = this.ctx.explosions.fire(s, rec.local, rec.size) || null;
    rec.lit = true;
    this.ctx.stats.firesLit++;
    return true;
  }
  // once a second: fires on ships still fighting burn out after their time (damage control; this also
  // bounds the emitter count), and one fire skipped for lack of particles is lit while there is room
  tendFires() {
    const now = this.ctx.time();
    let relit = false;
    for (const st of this.ctx.states) {
      const s = st.ship;
      const fires = s.fires;
      const burning = st.dead || st.dying; // wrecks and dying ships keep every fire
      for (let i = fires.length - 1; i >= 0; i--) {
        const rec = fires[i];
        if (!burning && now >= rec.until) {
          if (rec.emitter) rec.emitter.dead = true; // what explosions.extinguish does per emitter
          fires[i] = fires[fires.length - 1];
          fires.pop();
          continue;
        }
        if (!rec.lit && !relit) relit = this.light(s, rec, 0.85);
      }
    }
  }
  lastDeathAt() {
    const times = this.deathTimes;
    return times.length ? times[times.length - 1] : -Infinity;
  }

  // bolts.onHit
  onBoltHit(b) {
    const { explosions, rand, inFlight, stats } = this.ctx;
    const s = b.target;
    if (b.kind === "fighter") {
      // fighter lasers only flash and scorch the paint: the swarms use their own (unseeded) randomness,
      // and keeping them out of the hit points (and of the capital ships' random stream) keeps the
      // capital battle reproducible from the seed
      if (!s || !s.model) {
        // at another fighter (or nothing): a small flash where the burst ends; a hit on a fighter
        // quarry feeds its health counter (destroy -> onDestroyed -> respawn from its hangar)
        if (!b.miss) {
          explosions.flak(b.to, 9 + this.ctx.frand() * 6);
          const q = b.fighterTarget;
          if (q && q.alive && this.ctx.fighters && this.ctx.fighters.damage) {
            if (b.pd) stats.pdHits++;
            else stats.dogfightHits++;
            this.ctx.fighters.damage(q, 1);
          }
        }
      } else if (!s.alive) explosions.flak(b.to, 12);
      else if (b.miss) explosions.flak(b.to, 10);
      else if (!roomFor(explosions, "add", 0.9)) explosions.flak(b.to, 11);
      else {
        _inv.copy(s.matrix).invert();
        _local.copy(b.to).applyMatrix4(_inv);
        explosions.hit(b.to, 14, s, _local);
      }
      return;
    }
    if (b.capital) {
      inFlight.n--;
      if (b.heavy) inFlight.heavy--;
    }
    if (!s || !s.alive) {
      explosions.flak(b.to, 45);
      return;
    }
    if (b.miss) {
      explosions.flak(b.to, 35 + rand() * 40);
      return;
    }
    _inv.copy(s.matrix).invert();
    _local.copy(b.to).applyMatrix4(_inv);
    const size = b.kind === "light" ? 30 : 58;
    // when the additive layer runs hot, light hits become a single flash instead of the full impact
    if (b.kind !== "turbo" && !roomFor(explosions, "add", 0.9))
      explosions.flak(b.to, size * 0.8);
    else explosions.hit(b.to, size, s, _local);
    const st = this.ctx.stateOf(s);
    // shields still up on lightly hurt ships: a hex ripple spreads over the hull around the hit
    if (
      st &&
      !st.dead &&
      !st.dying &&
      st.hits < st.hp * 0.35 &&
      explosions.shieldHit &&
      roomFor(explosions, "add", 0.9)
    )
      explosions.shieldHit(
        b.to,
        explosions.hullNormal(s, _local, _n),
        size * 1.6,
        null,
        s,
        _local,
      );
    if (!st || st.dead || st.dying) return; // hulks and dying ships just flash
    // armour: only ships the director has marked take full (quadrupled) damage, so the pacing of
    // deaths is the director's and emergent losses stay rare
    st.hits += b.damage * (st.doomed ? 4 : 0.2);
    s.damage = 12 * Math.min(1, st.hits / st.hp); // the fleet's scorch tint runs 0..12
    if (st.hits >= st.nextFire) {
      st.nextFire += st.hp / 7;
      const size = 45 + rand() * 50;
      const life = rand.range(FIRE_LIFE[0], FIRE_LIFE[1]);
      if (s.fires.length < 6) this.ignite(st, _local, size, life);
    }
    if (st.hits >= st.hp) {
      // marked ships go now; an unscheduled loss needs a free slot in the window and a little
      // distance from the last death, so two ships never blow within seconds of each other
      const spaced = this.ctx.time() - this.lastDeathAt() > MIN_DEATH_GAP;
      if (st.doomed || (spaced && this.canDie())) this.beginDeath(st);
      else {
        // the window's deaths are spent (or the fleet is at its floor): critical, burning, holding
        // together until the director's next pick, which strongly prefers ships in this state
        st.hits = st.hp * 0.96;
        st.critical = true;
      }
    }
  }

  // a secondary explosion on a dying hull (the effects system's dedicated one when it exists)
  secondary(s, local, world, size) {
    const ex = this.ctx.explosions;
    if (typeof ex.secondary === "function") ex.secondary(s, local, size);
    else ex.hit(world, size, s, local);
  }

  beginDeath(st) {
    if (st.dying || st.dead) return;
    const rand = this.ctx.rand;
    const s = st.ship;
    const L = s.model.length;
    const half = s.model.bounds.half || [L * 0.1, L * 0.05, L * 0.5];
    // two or three sub-blasts walk the spine before the final detonation, in random order
    const nSub = 2 + (rand() < 0.5 ? 1 : 0);
    const zs = nSub === 3 ? [-0.3, 0.02, 0.32] : [-0.25, 0.25];
    for (let i = zs.length - 1; i > 0; i--) {
      const j = rand.int(i + 1);
      const t = zs[i];
      zs[i] = zs[j];
      zs[j] = t;
    }
    const subs = zs.map((z, i) => ({
      u: nSub === 3 ? [0.42, 0.66, 0.86][i] : [0.5, 0.8][i],
      local: new THREE.Vector3(
        rand.range(-0.25, 0.25) * half[0],
        rand.range(0.1, 0.5) * half[1],
        z * L,
      ),
      size: L * rand.range(0.1, 0.16),
    }));
    st.dying = {
      t: 0,
      dur: rand.range(3.5, 5),
      next: rand.range(0.05, 0.2),
      subs,
      subIdx: 0,
    };
    s.engineLevel = 1;
    setTarget(st, null);
    st.target2 = null;
    st.doomedFor = st.doomed ? this.ctx.time() - st.doomedAt : -1;
    st.doomed = false;
    st.critical = false;
    this.deathTimes.push(this.ctx.time());
    this.lastDoomAt = Math.max(this.lastDoomAt, this.ctx.time()); // the dry check waits after a death
    this.ctx.stats.dyingNow++;
  }

  finishDeath(st) {
    const { explosions, rand, stats, time } = this.ctx;
    const s = st.ship;
    explosions.blast(s.position, s.model.length * 0.38, {
      velocity: s.velocity,
      ship: s, // debris takes the hull colour
    });
    // the wreck burns from many wounds
    const nFires = 5 + rand.int(3);
    for (let i = 0; i < nFires && s.fires.length < MAX_FIRES; i++) {
      s.randomSurfacePoint(_w, rand);
      _inv.copy(s.matrix).invert();
      this.ignite(st, _w.applyMatrix4(_inv), rand.range(80, 150));
    }
    s.engineLevel = 0; // engines dark (the plume system also darkens dead ships on its own)
    s.health = 0; // the fleet tints it as a wreck
    s.damage = 12;
    st.dead = true;
    st.dying = null;
    st.diedAt = time();
    st.retireAt = time() + rand.range(HULK_RETIRE[0], HULK_RETIRE[1]);
    if (st.group) {
      const k = st.group.ships.indexOf(st);
      if (k >= 0) st.group.ships.splice(k, 1);
    }
    const slot = st.slot ? st.slot.clone() : null;
    const group = st.group;
    makeHulk(st, rand);
    this.deaths++;
    stats.deaths = this.deaths;
    stats.kills = this.deaths;
    stats.dyingNow = Math.max(0, stats.dyingNow - 1);
    this.deathLog.push({
      t: +time().toFixed(1),
      cls: s.model.id,
      id: s.id,
      doomedFor: +st.doomedFor.toFixed(1),
    });
    // a replacement arrives from off-screen a little later, if the class has capacity left (phones
    // replace only most of their losses: the battle thins slowly toward the fleet floor)
    const arrival = time() + rand.range(25, 45);
    const replace = rand() < (this.ctx.reinforceChance ?? 1);
    if (replace)
      this.pendingReinforcements.push({
        at: arrival,
        side: st.side,
        cls: s.model.id,
        group,
        slot,
      });
  }

  // a wreck leaves the battle: fires out, hidden (Ship.alive = false stops the fleet drawing and moving
  // it; the fires' loop particles die with it) and its state dropped so the class capacity frees for
  // reinforcements. The Ship record stays in fleet.ships (other systems index that array).
  retire(st, index) {
    const { explosions, states, stats } = this.ctx;
    const s = st.ship;
    explosions.extinguish(s);
    s.fires.length = 0;
    s.velocity.set(0, 0, 0);
    s.angular.set(0, 0, 0);
    s.target = null;
    s.alive = false;
    states.splice(index, 1);
    if (this.ctx.forget) this.ctx.forget(s);
    this.retired++;
    stats.retired = this.retired;
  }

  // pick the next victim: frigates and destroyers die more often than the big ships; damaged ships
  // first, ships already burning critically (out of hit points, waiting for the window) first of all
  doomWeight(st) {
    if (st.dead || st.dying || st.doomed) return 0;
    const w = classInfo(st.cls).deathWeight * (1 + 2.5 * (1 - st.hpFrac()));
    return st.critical ? w * 6 : w;
  }
  doomOne() {
    const { states, rand } = this.ctx;
    let total = 0;
    for (const st of states) total += this.doomWeight(st);
    if (total <= 0) return null;
    let r = rand() * total;
    for (const st of states) {
      const w = this.doomWeight(st);
      if (w <= 0) continue;
      r -= w;
      if (r <= 0) {
        st.doomed = true;
        st.doomedAt = this.ctx.time();
        this.lastDoomAt = st.doomedAt;
        // the enemy notices: nearby guns swing onto it
        for (const o of states) {
          if (o.side === st.side || o.dead || o.dying) continue;
          if (
            o.ship.position.distanceTo(st.ship.position) < 12000 &&
            rand() < 0.6
          ) {
            setTarget(o, st);
            o.retargetT = rand.range(6, 12);
          }
        }
        return st;
      }
    }
    return null;
  }

  update(dt) {
    const { states, explosions, rand, time } = this.ctx;
    const now = time();
    // scheduled dooms (held back a little when a ship has just gone, so deaths keep their spacing),
    // plus an early one when the rolling window is running dry
    if (now >= this.nextDoomAt) {
      if (now - this.lastDeathAt() < 20) this.nextDoomAt = now + 15;
      else {
        this.nextDoomAt = now + rand.range(DOOM_INTERVAL[0], DOOM_INTERVAL[1]);
        if (this.canDie()) this.doomOne();
      }
    } else if (now >= this.dryCheckAt) {
      this.dryCheckAt = now + 5;
      if (
        now - this.lastDoomAt > 30 &&
        this.recentDeaths() + this.doomedCount() < MIN_DEATHS_PER_WINDOW &&
        this.canDie()
      ) {
        this.nextDoomAt = now + rand.range(DOOM_INTERVAL[0], DOOM_INTERVAL[1]);
        this.doomOne();
      }
    }
    this.relightT -= dt;
    if (this.relightT <= 0) {
      this.relightT = 1;
      this.tendFires();
    }
    for (let i = states.length - 1; i >= 0; i--) {
      const st = states[i];
      const s = st.ship;
      if (st.dead) {
        if (now >= st.retireAt) this.retire(st, i);
        continue;
      }
      if (st.dying) {
        // staged death: secondaries ripple along the hull, bigger and more frequent toward the end,
        // fires catch, the engines stutter out, sub-blasts walk the spine, then the final detonation
        const d = st.dying;
        d.t += dt;
        const u = Math.min(1, d.t / d.dur);
        s.engineLevel =
          (1 - u) * (1 - u) * (0.7 + 0.3 * Math.sin(d.t * 19 + s.id));
        while (d.next <= d.t && d.t < d.dur) {
          d.next += rand.range(0.1, 0.32) * (1 - 0.65 * u);
          s.randomSurfacePoint(_w, rand);
          _inv.copy(s.matrix).invert();
          _local.copy(_w).applyMatrix4(_inv);
          const size = rand.range(55, 130) * (1 + 1.3 * u); // 55-130 m -> 125-300 m
          const catches = rand() < 0.5;
          const fireSize = rand.range(60, 130);
          this.secondary(s, _local, _w, size);
          if (catches && s.fires.length < MAX_FIRES)
            this.ignite(st, _local, fireSize);
        }
        while (d.subIdx < d.subs.length && u >= d.subs[d.subIdx].u) {
          const sb = d.subs[d.subIdx++];
          _w.copy(sb.local).applyMatrix4(s.matrix);
          explosions.blast(_w, sb.size, {
            velocity: s.velocity,
            debris: 14,
            ship: s,
          });
        }
        if (d.t >= d.dur) this.finishDeath(st);
        continue;
      }
      // a doomed ship that somehow survives the focus fire goes anyway
      if (st.doomed && now - st.doomedAt > DOOM_FORCE) {
        this.beginDeath(st);
        continue;
      }
      // venting: badly damaged ships puff smoke and small bursts from their wounds
      if (st.hpFrac() < 0.55 && s.fires.length) {
        st.ventT -= dt;
        if (st.ventT <= 0) {
          st.ventT = rand.range(1.5, 4) * (st.critical ? 0.5 : 1);
          // the random draws happen whether or not the particle budget allows the effect
          const f = s.fires[rand.int(s.fires.length)];
          const smokeSize = rand.range(55, 115);
          const smokeLife = rand.range(3, 5);
          const r = rand();
          const fireSize = rand.range(35, 70);
          const fireLife = rand.range(0.5, 0.9);
          const hitSize = rand.range(28, 50);
          _w.copy(f.local).applyMatrix4(s.matrix);
          if (roomFor(explosions, "smoke", 0.8))
            explosions.spawn(_w, {
              kind: "smoke",
              size: smokeSize,
              life: smokeLife,
              ship: s,
              local: f.local,
            });
          if (roomFor(explosions, "add", 0.9)) {
            if (r < 0.35)
              explosions.spawn(_w, {
                kind: "fire",
                size: fireSize,
                life: fireLife,
                ship: s,
                local: f.local,
              });
            else if (r < 0.5) explosions.hit(_w, hitSize, s, f.local);
          }
        }
      }
    }
    // reinforcements
    for (let i = this.pendingReinforcements.length - 1; i >= 0; i--) {
      const r = this.pendingReinforcements[i];
      if (r.at > now) continue;
      this.pendingReinforcements.splice(i, 1);
      this.ctx.spawnReinforcement(r);
    }
  }

  // the ship a camera should look at for drama: dying now, else the most recent wreck, else the most hurt
  mostDramatic() {
    const now = this.ctx.time();
    let best = null;
    let bestScore = -Infinity;
    for (const st of this.ctx.states) {
      let sc;
      if (st.dying) sc = 100 + st.dying.t;
      else if (st.dead) sc = 60 - Math.max(0, now - st.diedAt) * 0.4;
      else if (st.doomed) sc = 40 + (1 - st.hpFrac()) * 20;
      else sc = (1 - st.hpFrac()) * 30 + st.ship.fires.length * 2;
      if (sc > bestScore) {
        bestScore = sc;
        best = st;
      }
    }
    return best;
  }
}
