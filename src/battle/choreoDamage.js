// Damage drama and the battle director: hits accumulate into hit points, every so much damage starts a
// persistent fire at the impact, badly hurt ships vent smoke and secondary bursts from their wounds, and a
// ship that runs out of hit points dies in stages (explosions rippling along the hull for 3-5 s, then the
// final blast, engines dark, a slowly tumbling burning hulk). The director paces the deaths: it dooms a
// victim every minute or so (enemy fire converges on it), holds every 3-minute window to 2-4 deaths (a
// ship that runs out of hit points when the window is full burns critically and waits for its turn),
// keeps at least 70% of the fleet alive, and brings reinforcements in from high above to replace losses
// when the class capacity allows.
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

export class Director {
  constructor(ctx) {
    this.ctx = ctx; // { states, fleet, explosions, rand, stats, inFlight, time(), spawnReinforcement }
    this.nextDoomAt = ctx.rand.range(35, 60);
    this.pendingReinforcements = [];
    this.deaths = 0;
    this.deathTimes = []; // when each death sequence began (for the rolling window)
  }

  get alive() {
    return this.ctx.states.length - this.deaths;
  }
  recentDeaths() {
    const now = this.ctx.time();
    const times = this.deathTimes;
    while (times.length && now - times[0] > WINDOW) times.shift();
    return times.length;
  }
  // may one more ship die now? (fleet floor and the rolling 3-minute budget; ships already dying or
  // marked to die count against both)
  canDie() {
    const states = this.ctx.states;
    let dying = 0;
    let doomed = 0;
    for (const st of states) {
      if (st.dying) dying++;
      else if (st.doomed) doomed++;
    }
    if ((this.alive - dying - doomed - 1) / states.length < MIN_ALIVE_FRACTION)
      return false;
    return this.recentDeaths() + doomed < MAX_DEATHS_PER_WINDOW;
  }

  // a new persistent fire at a local hull point. The record is always kept (so the ship state stays
  // reproducible); the flame itself is skipped when the particle pool is nearly full.
  ignite(st, local, size) {
    const s = st.ship;
    const rec = { local: local.clone(), size };
    s.fires.push(rec);
    if (this.ctx.explosions.alive < 1150)
      this.ctx.explosions.fire(s, rec.local, size);
    this.ctx.fires.push({ ship: s, local: rec.local, size });
  }

  // bolts.onHit
  onBoltHit(b) {
    const { explosions, rand, inFlight } = this.ctx;
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
          if (q && q.alive && this.ctx.fighters && this.ctx.fighters.damage)
            this.ctx.fighters.damage(q, 1);
        }
      } else if (!s.alive) explosions.flak(b.to, 12);
      else if (b.miss) explosions.flak(b.to, 10);
      else if (explosions.alive > 1150) explosions.flak(b.to, 11);
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
    // when the particle pools run hot, light hits become a single flash instead of flash+smoke
    if (b.kind !== "turbo" && explosions.alive > 1150)
      explosions.flak(b.to, size * 0.8);
    else explosions.hit(b.to, size, s, _local);
    const st = this.ctx.stateOf(s);
    // shields still up on lightly hurt ships: a hex ripple spreads over the hull around the hit
    if (
      st &&
      !st.dead &&
      !st.dying &&
      st.hits < st.hp * 0.35 &&
      explosions.alive < 1150 &&
      explosions.shieldHit
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
    // armour: only ships the director has marked take full (tripled) damage, so the pacing of deaths
    // is the director's and emergent losses stay rare
    st.hits += b.damage * (st.doomed ? 3 : 0.2);
    s.damage = 12 * Math.min(1, st.hits / st.hp); // the fleet's scorch tint runs 0..12
    if (st.hits >= st.nextFire) {
      st.nextFire += st.hp / 7;
      if (s.fires.length < 6) this.ignite(st, _local, 45 + rand() * 50);
    }
    if (st.hits >= st.hp) {
      if (st.doomed || this.canDie()) this.beginDeath(st);
      else {
        // the window's deaths are spent (or the fleet is at its floor): critical, burning, holding
        // together until the director's next pick, which strongly prefers ships in this state
        st.hits = st.hp * 0.96;
        st.critical = true;
      }
    }
  }

  beginDeath(st) {
    if (st.dying || st.dead) return;
    const rand = this.ctx.rand;
    st.dying = { t: 0, dur: rand.range(3, 5), next: 0 };
    setTarget(st, null);
    st.target2 = null;
    st.doomed = false;
    st.critical = false;
    this.deathTimes.push(this.ctx.time());
    this.ctx.stats.dyingNow++;
  }

  finishDeath(st) {
    const { explosions, rand, stats, time } = this.ctx;
    const s = st.ship;
    explosions.blast(s.position, s.model.length * 0.38, {
      velocity: s.velocity,
    });
    for (let i = 0; i < 3 && s.fires.length < 10; i++) {
      s.randomSurfacePoint(_w, rand);
      _inv.copy(s.matrix).invert();
      this.ignite(st, _w.applyMatrix4(_inv), rand.range(80, 150));
    }
    s.health = 0; // engines dark, the fleet tints it as a wreck
    s.damage = 12;
    st.dead = true;
    st.dying = null;
    st.diedAt = time();
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
    // a replacement arrives from off-screen a little later, if the class has capacity left
    this.pendingReinforcements.push({
      at: time() + rand.range(25, 45),
      side: st.side,
      cls: s.model.id,
      group,
      slot,
    });
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
    // scheduled dooms
    if (now >= this.nextDoomAt) {
      this.nextDoomAt = now + rand.range(45, 80);
      if (this.canDie()) this.doomOne();
    }
    const fxBudgetOk = explosions.alive < 1000;
    for (const st of states) {
      if (st.dead) continue;
      const s = st.ship;
      if (st.dying) {
        // staged death: secondary explosions ripple along the hull, new fires catch, then the blast
        const d = st.dying;
        d.t += dt;
        while (d.next <= d.t && d.t < d.dur) {
          d.next += rand.range(0.12, 0.3);
          s.randomSurfacePoint(_w, rand);
          _inv.copy(s.matrix).invert();
          _local.copy(_w).applyMatrix4(_inv);
          explosions.hit(_w, rand.range(55, 130), s, _local);
          const catches = rand() < 0.45;
          const fireSize = rand.range(60, 120);
          if (catches && s.fires.length < 8) this.ignite(st, _local, fireSize);
        }
        if (d.t >= d.dur) this.finishDeath(st);
        continue;
      }
      // a doomed ship that somehow survives the focus fire goes anyway
      if (st.doomed && now - st.doomedAt > 40) this.beginDeath(st);
      // venting: badly damaged ships puff smoke and small bursts from their wounds
      if (st.hpFrac() < 0.55 && s.fires.length) {
        st.ventT -= dt;
        if (st.ventT <= 0) {
          st.ventT = rand.range(1.5, 4) * (st.critical ? 0.5 : 1);
          // the random draws happen whether or not the particle budget allows the effect, so the
          // capital ships' stream does not depend on the (unseeded) particle load
          const f = s.fires[rand.int(s.fires.length)];
          const smokeSize = rand.range(55, 115);
          const smokeLife = rand.range(3, 5);
          const r = rand();
          const fireSize = rand.range(35, 70);
          const fireLife = rand.range(0.5, 0.9);
          const hitSize = rand.range(28, 50);
          if (fxBudgetOk) {
            _w.copy(f.local).applyMatrix4(s.matrix);
            explosions.spawn(_w, {
              kind: "smoke",
              size: smokeSize,
              life: smokeLife,
              ship: s,
              local: f.local,
            });
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
