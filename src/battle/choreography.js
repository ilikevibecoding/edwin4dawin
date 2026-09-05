// Battle choreography: builds the fleets (choreoLayout), drives their ponderous motion (choreoMotion), the
// turbolaser exchange (choreoCombat) and the damage drama with its director (choreoDamage), and wires the
// fighters and effects into one `battle` object that main.js steps with a fixed dt. Deterministic given
// the seed: layout and runtime randomness both come from seeded generators.
import * as THREE from "three";
import * as venatorMod from "./ships/venator.js";
import { buildProvidence } from "./ships/providence.js";
import { buildMunificent } from "./ships/munificent.js";
import { buildRecusant } from "./ships/recusant.js";
import { rng, modelBox, dirFromYawPitch, boxesOverlap } from "./choreoRng.js";
import {
  FLEET_PLAN,
  CLASS_INFO,
  classInfo,
  layoutFleet,
} from "./choreoLayout.js";
import {
  updateGroups,
  updateShipMotion,
  avoidPass,
  quatFromYPR,
} from "./choreoMotion.js";
import {
  Heat,
  HEAVY_RECHARGE,
  chooseTargets,
  updateGuns,
  makeFighterFire,
  pointDefence,
} from "./choreoCombat.js";
import { Director } from "./choreoDamage.js";

export { FLEET_PLAN, CLASS_INFO };

const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _inv = new THREE.Matrix4();
const _w = new THREE.Vector3();
const ORIGIN = new THREE.Vector3();

export function createBattle({
  fleet,
  bolts,
  explosions,
  fighters,
  mats,
  seed = 11,
  scale = 1,
}) {
  const rand = rng(seed); // layout stream
  const rrand = rng((seed * 2654435761) >>> 0); // runtime stream (capital ships, director)
  // fighter fire has its own stream: the swarms decide when to shoot with their own randomness, and
  // that must not disturb the capital ships' stream (which keeps the battle reproducible from the seed)
  const frand = rng((seed * 40503 + 977) >>> 0);
  const models = {
    venator: venatorMod.buildVenator(mats),
    providence: buildProvidence(mats),
    munificent: buildMunificent(mats),
    recusant: buildRecusant(mats),
  };
  // optional hangar-doors-open Venator variant from the Venator workstream: used for ~30% of Venators
  if (typeof venatorMod.buildVenatorOpen === "function") {
    try {
      const m = venatorMod.buildVenatorOpen(mats);
      if (m && m.parts && m.id) models.venatorOpen = m;
    } catch (e) {
      console.warn("venatorOpen variant unavailable:", e);
    }
  }
  for (const m of Object.values(models)) fleet.registerModel(m, 40);
  fleet.enableInstanceColor();
  const boxes = new Map();
  for (const m of Object.values(models)) boxes.set(m.id, modelBox(m));

  const states = [];
  const stateByShip = new Map();
  const fires = [];
  let id = 0;
  let time = 0;
  const stats = {
    shotsHeavy: 0,
    shotsLight: 0,
    salvos: 0,
    misses: 0,
    kills: 0,
    deaths: 0,
    dyingNow: 0,
    reinforcements: 0,
    boltsInFlight: 0,
    heavyInFlight: 0,
    alive: 0,
    heat: 1,
    updateMs: 0,
    updateMsMax: 0,
    choreoMs: 0,
    prerollMs: 0,
  };

  // ---- runtime state per ship
  function addShip(model, spec, rnd = rand) {
    const s = fleet.add(model, {
      id: id++,
      position: [spec.x, spec.y, spec.z],
    });
    quatFromYPR(spec.yaw, spec.pitch || 0, spec.roll || 0, s.quaternion);
    s.updateMatrix();
    const info = classInfo(model.id);
    const cruise = spec.cruise ?? rnd.range(info.cruise[0], info.cruise[1]);
    dirFromYawPitch(spec.yaw, spec.pitch || 0, _dir);
    s.velocity.copy(_dir).multiplyScalar(cruise);
    // guns start at random points of their recharge, so the exchange opens at its steady rhythm
    for (let i = 0; i < s.cooldowns.length; i++)
      s.cooldowns[i] = rnd() * HEAVY_RECHARGE[1];
    const n = model.hardpoints.length;
    const st = {
      ship: s,
      side: model.side,
      cls: model.id,
      role: spec.role,
      group: spec.group || null,
      slot: new THREE.Vector3(),
      yawOff: 0,
      pitchOff: 0,
      home: new THREE.Vector3(0, 0, 200),
      headYaw: spec.yaw,
      headPitch: spec.pitch || 0,
      turn: spec.turn || 0,
      cruise,
      agile: 0,
      wander: { x: rnd.range(0.01, 0.03), y: rnd.range(0.008, 0.02) },
      phase: rnd() * Math.PI * 2,
      listDir: rnd.sign(),
      listAngle: 0,
      hp: info.hp * (0.85 + rnd() * 0.3),
      hits: 0,
      nextFire: 0,
      target: null,
      target2: null,
      targetedBy: 0,
      retargetT: rnd() * 4,
      salvoLeft: new Uint8Array(n),
      aimIdx: new Uint16Array(n),
      doomed: false,
      doomedAt: 0,
      critical: false,
      dying: null,
      dead: false,
      diedAt: -1,
      ventT: rnd() * 3,
      pending: null,
      hpFrac() {
        return Math.max(0, 1 - this.hits / this.hp);
      },
      // reinforcement reached its slot: join the formation (or roam if the lost ship roamed)
      arrive() {
        const p = this.pending;
        this.pending = null;
        this.agile = 120;
        if (p && p.group) {
          this.role = "line";
          this.group = p.group;
          this.slot.copy(p.slot);
          this.yawOff = 0;
          this.pitchOff = 0;
          p.group.ships.push(this);
        } else {
          this.role = "free";
          this.turn = rrand.sign() * rrand.range(0.002, 0.004);
          this.headYaw = Math.atan2(
            -this.ship.velocity.x,
            -this.ship.velocity.z,
          );
          this.headPitch = 0;
        }
      },
    };
    st.nextFire = st.hp / 7;
    for (let i = 0; i < n; i++) st.aimIdx[i] = rnd.int(65535);
    states.push(st);
    stateByShip.set(s, st);
    return st;
  }

  const { groups, melee } = layoutFleet({
    models,
    rand,
    scale,
    addShip,
    boxes,
  });
  for (const st of states) st.home.copy(melee);
  fighters.deploy(fleet.ships);

  // ---- combat plumbing
  const inFlight = { n: 0, heavy: 0 }; // capital bolts in flight (all / heavy turbolasers)
  const heat = new Heat(80, 140);
  const ctx = {
    states,
    fleet,
    explosions,
    bolts,
    rand: rrand,
    frand,
    stats,
    inFlight,
    heat,
    fires,
    time: () => time,
    stateOf: (s) => stateByShip.get(s) || null,
    spawnReinforcement,
    fighters,
  };
  const director = new Director(ctx);
  bolts.onHit = (b) => director.onBoltHit(b);
  const fighterFire = makeFighterFire(ctx);
  const onFighterDestroyed = (f) => {
    if (f && f.pos) explosions.hit(f.pos, 12);
  };
  if ("onDestroyed" in fighters) fighters.onDestroyed = onFighterDestroyed;

  // ---- pre-existing battle damage: a third of the fleet already scorched and burning, the frigates
  // pushing through the Republic side of the melee badly hurt
  for (const st of states) {
    const s = st.ship;
    let frac = 0;
    let nFires = 0;
    if (st.role === "melee" && st.cls === "munificent") {
      frac = rand.range(0.35, 0.5);
      nFires = 3;
    } else if (rand() < 0.3) {
      frac = rand.range(0.08, 0.3);
      nFires = 1 + (rand() < 0.3 ? 1 : 0);
    }
    if (!nFires) continue;
    st.hits = st.hp * frac;
    s.damage = 12 * frac;
    s.health = 1 - frac;
    while (st.nextFire <= st.hits) st.nextFire += st.hp / 7;
    for (let i = 0; i < nFires; i++) {
      s.randomSurfacePoint(_w, rand);
      _inv.copy(s.matrix).invert();
      director.ignite(st, _w.applyMatrix4(_inv), rand.range(45, 110));
    }
  }

  function venatorModel(rnd) {
    return models.venatorOpen && rnd() < 0.3
      ? models.venatorOpen
      : models.venator;
  }

  // a replacement ship arrives from far above its own line, drifting in at 60 m/s toward the lost slot
  function spawnReinforcement(r) {
    const model =
      r.side === "republic"
        ? venatorModel(rrand)
        : models[r.cls] || models.munificent;
    const entry = fleet.classes.get(model.id);
    if (!entry || entry.ships.length >= entry.capacity) return false;
    const home = _p;
    if (r.group && r.slot) {
      const g = r.group;
      const c = Math.cos(g.yaw);
      const sn = Math.sin(g.yaw);
      home.set(
        g.pos.x + r.slot.x * c + r.slot.z * sn,
        g.pos.y + r.slot.y,
        g.pos.z - r.slot.x * sn + r.slot.z * c,
      );
    } else
      home
        .copy(melee)
        .add(
          _w.set(
            rrand.range(-3000, 3000),
            rrand.range(-600, 600),
            rrand.range(-800, 1200),
          ),
        );
    const zSide = r.side === "republic" ? -1 : 1;
    const x = home.x + rrand.range(-2500, 2500);
    const y = home.y + rrand.range(5500, 8000);
    const z = home.z + zSide * rrand.range(3000, 5000);
    _dir.set(home.x - x, home.y - y, home.z - z).normalize();
    const yaw = Math.atan2(-_dir.x, -_dir.z);
    const pitch = Math.asin(THREE.MathUtils.clamp(_dir.y, -1, 1));
    const st = addShip(
      model,
      {
        x,
        y,
        z,
        yaw,
        pitch,
        roll: rrand.range(-0.3, 0.3),
        role: "reinforcement",
        group: null,
        cruise: 60,
      },
      rrand,
    );
    st.home.copy(home);
    st.pending = {
      group: r.group || null,
      slot: r.slot ? r.slot.clone() : null,
    };
    st.ship.velocity.copy(_dir).multiplyScalar(60);
    st.cruise = rrand.range(
      classInfo(model.id).cruise[0],
      classInfo(model.id).cruise[1],
    );
    stats.reinforcements++;
    return true;
  }

  // ---- main step
  let tick = 0.5;
  let flakTimer = 0;
  const FIXED_TICK = 1.0;

  function update(dt, camPos) {
    const t0 = performance.now();
    time += dt;
    // 1 Hz tick: retargeting (pairwise) and hull avoidance (pairwise)
    tick -= dt;
    if (tick <= 0) {
      tick += FIXED_TICK;
      for (const st of states) {
        if (st.dead || st.dying) continue;
        st.retargetT -= FIXED_TICK;
        const t = st.target;
        if (st.retargetT <= 0 || !t || t.dead || t.dying) {
          st.retargetT = rrand.range(3, 6);
          chooseTargets(st, states, rrand);
        }
      }
      avoidPass(states, boxes);
    }
    heat.update(inFlight.heavy, dt);
    updateGroups(groups, dt, time);
    for (const st of states) {
      if (st.pending && st.pending.group) {
        // the slot drifts with its group: keep the reinforcement's destination current
        const g = st.pending.group;
        const c = Math.cos(g.yaw);
        const sn = Math.sin(g.yaw);
        st.home.set(
          g.pos.x + st.pending.slot.x * c + st.pending.slot.z * sn,
          g.pos.y + st.pending.slot.y,
          g.pos.z - st.pending.slot.x * sn + st.pending.slot.z * c,
        );
      }
      if (st.agile > 0) st.agile -= dt;
      updateShipMotion(st, dt, time);
      if (!st.dead && !st.dying) {
        updateGuns(st, dt, ctx);
        st.ship.health = Math.max(0.05, st.hpFrac());
      }
    }
    director.update(dt);
    // ambient flak: bursts around the hulls and between the lines
    flakTimer -= dt;
    if (flakTimer <= 0 && states.length) {
      flakTimer = 0.16;
      const st = states[rrand.int(states.length)];
      const r = st.ship.model.bounds.radius;
      _p.set(rrand.range(-1, 1), rrand.range(-0.6, 0.6), rrand.range(-1, 1))
        .normalize()
        .multiplyScalar(r * rrand.range(0.7, 1.8))
        .add(st.ship.position);
      const size = 30 + rrand() * 55;
      // (drawn before the budget check so the stream does not depend on the particle load)
      if (explosions.alive < 1100) explosions.flak(_p, size);
    }
    pointDefence(ctx, dt);
    const t1 = performance.now();
    fleet.update(dt, camPos);
    fighters.update(dt, time, fighterFire);
    bolts.update(dt);
    explosions.update(dt);
    stats.boltsInFlight = inFlight.n;
    stats.heavyInFlight = inFlight.heavy;
    stats.alive = director.alive;
    stats.heat = +heat.value.toFixed(2);
    const t2 = performance.now();
    const ms = t2 - t0;
    stats.updateMs = +(
      stats.updateMs ? stats.updateMs * 0.95 + ms * 0.05 : ms
    ).toFixed(3);
    stats.updateMsMax = Math.max(stats.updateMsMax, +ms.toFixed(3));
    stats.choreoMs = +(stats.choreoMs * 0.95 + (t1 - t0) * 0.05).toFixed(3);
  }

  // open on a battle already joined: the first seconds run off-screen so the first frame has the
  // steady exchange in flight, the fires burning and the fighter swarms dispersed (a few hundred ms)
  const PREROLL = 16;
  const tp = performance.now();
  for (let i = 0; i < PREROLL * 30; i++) update(1 / 30, ORIGIN);
  stats.prerollMs = +(performance.now() - tp).toFixed(1);
  time = 0;
  director.nextDoomAt = rrand.range(35, 60);
  stats.updateMs = stats.updateMsMax = stats.choreoMs = 0;

  return {
    fleet,
    models,
    fires,
    states,
    groups,
    director,
    heat,
    melee,
    boxes,
    get time() {
      return time;
    },
    update,
    stats,
    stateOf: ctx.stateOf,
    mostDramatic: () => director.mostDramatic(),
    onFighterDestroyed,
    // diagnostics: pairs of hulls whose oriented boxes intersect (margin in metres, 0 = touching)
    overlaps(margin = 0) {
      const out = [];
      for (let i = 0; i < states.length; i++)
        for (let j = i + 1; j < states.length; j++) {
          const a = states[i].ship;
          const b = states[j].ship;
          if (
            a.position.distanceTo(b.position) >
            a.model.bounds.radius + b.model.bounds.radius + margin
          )
            continue;
          if (
            boxesOverlap(
              a.matrix,
              boxes.get(a.model.id),
              b.matrix,
              boxes.get(b.model.id),
              margin,
            )
          )
            out.push([
              a.id,
              b.id,
              +a.position.distanceTo(b.position).toFixed(0),
            ]);
        }
      return out;
    },
    serialize() {
      let dying = 0;
      for (const st of states) if (st.dying) dying++;
      return {
        time: +time.toFixed(2),
        ships: fleet.serialize(),
        bolts: bolts.alive,
        particles: explosions.alive,
        fighters: fighters.count,
        alive: director.alive,
        deaths: director.deaths,
        dying,
        boltsInFlight: inFlight.n,
        heavyInFlight: inFlight.heavy,
        heat: +heat.value.toFixed(2),
      };
    },
  };
}
