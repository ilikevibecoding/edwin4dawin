// Battle choreography: builds the fleets (choreoLayout), drives their ponderous motion (choreoMotion), the
// turbolaser exchange (choreoCombat) and the damage drama with its director (choreoDamage), and wires the
// fighters and effects into one `battle` object that main.js steps with a fixed dt. Deterministic given
// the seed: layout and runtime randomness both come from seeded generators.
//
// Ship classes: the four original classes plus the Lucrehulk and Consular are imported statically; the
// classes still being built by other workstreams (Acclamator, Arquitens, Carrack, Dreadnought) are
// loaded through `import.meta.glob`, Vite's existence check: a missing file leaves the class out of the
// battle with one warning, a builder that throws does the same, and the layout adapts to the roster.
import * as THREE from "three";
import * as venatorMod from "./ships/venator.js";
import { buildProvidence } from "./ships/providence.js";
import { buildMunificent } from "./ships/munificent.js";
import { buildRecusant } from "./ships/recusant.js";
import { buildLucrehulk } from "./ships/lucrehulk.js";
import { buildConsular } from "./ships/consular.js";
import { rng, modelBox, dirFromYawPitch, boxesOverlap } from "./choreoRng.js";
import {
  FLEET_PLAN,
  CLASS_INFO,
  WARD_CLASSES,
  classInfo,
  isAgileRole,
  layoutFleet,
} from "./choreoLayout.js";
import {
  updateGroups,
  updateShipMotion,
  updateAgileMotion,
  avoidPass,
  quatFromYPR,
  makeEscortPath,
  makeCourierRun,
} from "./choreoMotion.js";
import {
  Heat,
  HEAVY_RECHARGE,
  chooseTargets,
  updateGuns,
  makeFighterFire,
  pointDefence,
} from "./choreoCombat.js";
import { Director, FIRST_DOOM, roomFor } from "./choreoDamage.js";

export { FLEET_PLAN, CLASS_INFO };

// ---- ship classes arriving from other workstreams: loaded if their module exists in this build
const ARRIVING = [
  { id: "acclamator", file: "./ships/acclamator.js", fn: "buildAcclamator" },
  { id: "arquitens", file: "./ships/arquitens.js", fn: "buildArquitens" },
  { id: "carrack", file: "./ships/carrack.js", fn: "buildCarrack" },
  { id: "dreadnought", file: "./ships/dreadnought.js", fn: "buildDreadnought" },
];
const arrivingModules = import.meta.glob([
  "./ships/acclamator.js",
  "./ships/arquitens.js",
  "./ships/carrack.js",
  "./ships/dreadnought.js",
]);
const arrivingBuilders = {};
for (const c of ARRIVING) {
  const load = arrivingModules[c.file];
  if (!load) {
    console.warn(
      `battle: ${c.id} class not in this build (src/battle/${c.file.slice(2)} missing); left out of the fleet`,
    );
    continue;
  }
  try {
    const mod = await load();
    if (typeof mod[c.fn] === "function") arrivingBuilders[c.id] = mod[c.fn];
    else
      console.warn(
        `battle: ${c.file} does not export ${c.fn}(); ${c.id} left out of the fleet`,
      );
  } catch (e) {
    console.warn(`battle: ${c.id} module failed to load; left out:`, e);
  }
}
// the classes present in this worktree, built defensively as well (a broken builder costs one class)
const OPTIONAL = {
  lucrehulk: buildLucrehulk,
  consular: buildConsular,
  ...arrivingBuilders,
};

const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _inv = new THREE.Matrix4();
const _w = new THREE.Vector3();
const ORIGIN = new THREE.Vector3();

// the battle opens already joined: this many seconds run off-screen before the first frame
const PREROLL = 16;

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
  // effect densities follow the fleet size (phones run scale 0.6): the heavy-bolt band the density
  // controller holds, the ambient flak rate and the share of losses that are replaced
  const fxScale = scale >= 1 ? 1 : Math.max(0.5, scale) * 1.04;
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
  for (const [id, build] of Object.entries(OPTIONAL)) {
    try {
      const m = build(mats);
      if (m && m.parts && m.id && m.hardpoints && m.bounds) models[m.id] = m;
      else console.warn(`battle: ${id} builder returned no model; left out`);
    } catch (e) {
      console.warn(`battle: ${id} builder failed; class left out:`, e);
    }
  }
  const capacity = Math.round(40 * Math.max(0.5, Math.min(1, scale)));
  for (const m of Object.values(models))
    fleet.registerModel(m, m.id === "lucrehulk" ? 4 : capacity);
  fleet.enableInstanceColor();
  const boxes = new Map();
  for (const m of Object.values(models)) boxes.set(m.id, modelBox(m));

  const states = [];
  const stateByShip = new Map();
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
    retired: 0,
    reinforcements: 0,
    firesLit: 0,
    firesDeferred: 0,
    pdShots: 0,
    pdHits: 0,
    dogfightHits: 0,
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
    const turnK = info.turn || 1;
    const agileRole = isAgileRole(spec.role);
    const st = {
      ship: s,
      side: model.side,
      cls: model.id,
      role: spec.role,
      group: spec.group || null,
      slot: agileRole ? null : new THREE.Vector3(),
      // escorts and couriers: the line ship they attach to and their path around it
      ward: spec.ward || null,
      path: spec.path || null,
      yawOff: 0,
      pitchOff: 0,
      home: new THREE.Vector3(0, 0, 200),
      headYaw: spec.yaw,
      headPitch: spec.pitch || 0,
      turn: spec.turn || 0,
      cruise,
      turnK,
      accel: info.accel || 0.7,
      // effect sizes follow the hull: a courier's fires and blasts are a third of a Venator's
      fxScale: Math.sqrt(THREE.MathUtils.clamp(model.length / 1100, 0.12, 1.6)),
      agile: 0,
      wander: { x: rnd.range(0.01, 0.03), y: rnd.range(0.008, 0.02) },
      // heading weave of the line ships: amplitude 7-17 degrees over 3.5-7 minute swings (a
      // Lucrehulk's is a third of that)
      weave: {
        amp: rnd.range(0.12, 0.3) * Math.min(1, turnK),
        pitchAmp: rnd.range(0.02, 0.05) * Math.min(1, turnK),
        omega: (Math.PI * 2) / rnd.range(210, 420),
        phase: rnd() * Math.PI * 2,
      },
      bank: 0,
      phase: rnd() * Math.PI * 2,
      listDir: rnd.sign(),
      listAngle: 0,
      hp: info.hp * (0.85 + rnd() * 0.3),
      hits: 0,
      nextFire: 0,
      target: null,
      target2: null,
      targetSmall: null,
      targetedBy: 0,
      retargetT: rnd() * 4,
      salvoLeft: new Uint8Array(n),
      aimIdx: new Uint16Array(n),
      doomed: false,
      doomedAt: 0,
      doomedFor: -1,
      critical: false,
      dying: null,
      dead: false,
      diedAt: -1,
      retireAt: Infinity,
      ventT: rnd() * 3,
      pending: null,
      hpFrac() {
        return Math.max(0, 1 - this.hits / this.hp);
      },
      // reinforcement reached its slot: join the formation (or roam if the lost ship roamed); a lost
      // escort or courier goes back to work around the line
      arrive() {
        const p = this.pending;
        this.pending = null;
        this.agile = 120;
        if (p && isAgileRole(p.role)) {
          this.role = p.role;
          this.group = p.group;
          this.slot = null;
          this.ward =
            p.ward && !p.ward.dead && p.ward.ship.alive ? p.ward : null;
          this.path =
            p.role === "escort" ? makeEscortPath(rrand, this.ship.id) : null;
          if (this.ward && p.role === "courier")
            this.path = makeCourierRun(this.ward, rrand, boxes);
          this.headYaw = Math.atan2(
            -this.ship.velocity.x,
            -this.ship.velocity.z,
          );
        } else if (p && p.group) {
          this.role = "line";
          this.group = p.group;
          this.slot = this.slot || new THREE.Vector3();
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

  // ---- wards for the small ships: an escort takes the nearest line Venator (any line ship failing
  // that); a courier finishing a run picks another line ship near by, nearer ones more often
  function assignWard(st) {
    let cands = [];
    for (const o of states) {
      if (
        o.side !== st.side ||
        o === st ||
        o.dead ||
        o.dying ||
        !o.ship.alive ||
        (o.role !== "line" && o.role !== "melee") ||
        !WARD_CLASSES.has(o.cls)
      )
        continue;
      cands.push(o);
    }
    if (st.role === "escort") {
      const vens = cands.filter(
        (o) => o.cls === "venator" || o.cls === "venatorOpen",
      );
      if (vens.length) cands = vens;
    } else if (cands.length > 1 && st.ward)
      cands = cands.filter((o) => o !== st.ward);
    if (!cands.length) {
      st.ward = null;
      return;
    }
    let pick = null;
    if (st.role === "escort") {
      let best = Infinity;
      for (const o of cands) {
        const d =
          o.ship.position.distanceTo(st.ship.position) * (0.8 + 0.4 * rrand());
        if (d < best) {
          best = d;
          pick = o;
        }
      }
    } else {
      let total = 0;
      const ws = cands.map((o) => {
        const d = o.ship.position.distanceTo(st.ship.position);
        const w = d < 4500 ? 1 / (d + 600) : 0.05 / (d + 600);
        total += w;
        return w;
      });
      let r = rrand() * total;
      pick = cands[cands.length - 1];
      for (let i = 0; i < cands.length; i++) {
        r -= ws[i];
        if (r <= 0) {
          pick = cands[i];
          break;
        }
      }
    }
    st.ward = pick;
    if (st.role === "courier") st.path = makeCourierRun(pick, rrand, boxes);
    else if (!st.path) st.path = makeEscortPath(rrand, st.ship.id);
  }

  // ---- combat plumbing
  const inFlight = { n: 0, heavy: 0 }; // capital bolts in flight (all / heavy turbolasers)
  const heat = new Heat(Math.round(80 * fxScale), Math.round(140 * fxScale));
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
    time: () => time,
    stateOf: (s) => stateByShip.get(s) || null,
    forget: (s) => stateByShip.delete(s),
    spawnReinforcement,
    reinforceChance: Math.min(1, 0.5 + 0.5 * scale),
    fighters,
  };
  const director = new Director(ctx);
  bolts.onHit = (b) => director.onBoltHit(b);
  const fighterFire = makeFighterFire(ctx);
  // a destroyed fighter: a bright pop that reads at a few hundred metres
  const onFighterDestroyed = (f) => {
    if (!f || !f.pos) return;
    explosions.hit(f.pos, 18);
    if (roomFor(explosions, "add", 0.9))
      explosions.spawn(f.pos, { kind: "flash", size: 46, life: 0.16 });
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
      const size = rand.range(45, 110) * st.fxScale;
      const life = rand.range(120, 330); // old wounds: some burn well into the visible battle
      director.ignite(st, _w.applyMatrix4(_inv), size, life);
    }
  }

  function venatorModel(rnd) {
    return models.venatorOpen && rnd() < 0.3
      ? models.venatorOpen
      : models.venator;
  }

  // a replacement of the lost ship's class arrives from far above its own line, drifting in at 60 m/s
  // toward the lost slot (or toward the line, for an escort or courier)
  function spawnReinforcement(r) {
    const model =
      r.cls === "venator" || r.cls === "venatorOpen"
        ? venatorModel(rrand)
        : models[r.cls] ||
          (r.side === "republic" ? models.venator : models.munificent);
    const entry = fleet.classes.get(model.id);
    if (!entry) return false;
    // the fleet draws only living instances: retired wrecks no longer take a slot
    let drawn = 0;
    for (const s of entry.ships) if (s.alive) drawn++;
    if (drawn >= entry.capacity) return false;
    const home = _p;
    const agileRole = isAgileRole(r.role);
    const ward = r.ward && !r.ward.dead && r.ward.ship.alive ? r.ward : null;
    if (agileRole && ward)
      home.copy(ward.ship.position).add(_w.set(0, -700, 0));
    else if (agileRole && r.group)
      home.copy(r.group.pos).add(_w.set(rrand.range(-2500, 2500), -700, 0));
    else if (r.group && r.slot) {
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
      role: r.role || null,
      ward,
    };
    st.ship.velocity.copy(_dir).multiplyScalar(60);
    st.cruise = rrand.range(
      classInfo(model.id).cruise[0],
      classInfo(model.id).cruise[1],
    );
    stats.reinforcements++;
    // entry flare: a flash and a ring of flak-like bursts around the arriving hull (no detonation)
    const R = model.bounds.radius;
    const bursts = [];
    const nb = 4 + rrand.int(3);
    for (let i = 0; i < nb; i++)
      bursts.push([
        rrand.range(-1, 1),
        rrand.range(-0.5, 0.5),
        rrand.range(-1, 1),
        rrand.range(0.5, 0.95) * R,
        rrand.range(45, 95) * st.fxScale,
      ]);
    if (roomFor(explosions, "add", 0.9)) {
      explosions.spawn(st.ship.position, {
        kind: "flash",
        size: model.length * 0.55,
        life: 0.4,
      });
      for (const [bx, by, bz, dist, size] of bursts) {
        _w.set(bx, by, bz)
          .normalize()
          .multiplyScalar(dist)
          .add(st.ship.position);
        explosions.flak(_w, size);
      }
    }
    return true;
  }

  // ---- main step
  let tick = 0.5;
  let flakTimer = 0;
  const FIXED_TICK = 1.0;
  const FLAK_PERIOD = 0.16 / fxScale;
  const nextRun = (st) => assignWard(st);

  function update(dt, camPos) {
    const t0 = performance.now();
    time += dt;
    // 1 Hz tick: retargeting (pairwise) and hull avoidance (pairwise). Targets change here and in the
    // director's doom focus only (setTarget), every few seconds, so the tracking turrets visibly swing.
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
        // escorts and couriers whose ward is gone (or who have none yet) attach to another line ship
        if (
          isAgileRole(st.role) &&
          (!st.ward ||
            st.ward.dead ||
            st.ward.dying ||
            !st.ward.ship.alive ||
            (st.role === "courier" && !st.path))
        )
          assignWard(st);
      }
      avoidPass(states, boxes);
    }
    heat.update(inFlight.heavy, dt);
    updateGroups(groups, dt, time);
    for (const st of states) {
      if (st.pending && st.pending.group && st.pending.slot) {
        // the slot drifts with its group: keep the reinforcement's destination current
        const g = st.pending.group;
        const c = Math.cos(g.yaw);
        const sn = Math.sin(g.yaw);
        st.home.set(
          g.pos.x + st.pending.slot.x * c + st.pending.slot.z * sn,
          g.pos.y + st.pending.slot.y,
          g.pos.z - st.pending.slot.x * sn + st.pending.slot.z * c,
        );
      } else if (st.pending && st.pending.ward) {
        const w = st.pending.ward;
        if (!w.dead && w.ship.alive) {
          st.home.copy(w.ship.position);
          st.home.y -= 700;
        }
      }
      if (st.agile > 0) st.agile -= dt;
      if (isAgileRole(st.role))
        updateAgileMotion(st, dt, time, states, boxes, nextRun);
      else updateShipMotion(st, dt, time);
      if (!st.dead && !st.dying) {
        updateGuns(st, dt, ctx);
        st.ship.health = Math.max(0.05, st.hpFrac());
      }
    }
    director.update(dt);
    // ambient flak: bursts around the hulls and between the lines
    flakTimer -= dt;
    if (flakTimer <= 0 && states.length) {
      flakTimer = FLAK_PERIOD;
      const st = states[rrand.int(states.length)];
      const r = st.ship.model.bounds.radius;
      _p.set(rrand.range(-1, 1), rrand.range(-0.6, 0.6), rrand.range(-1, 1))
        .normalize()
        .multiplyScalar(r * rrand.range(0.7, 1.8))
        .add(st.ship.position);
      const size = 30 + rrand() * 55;
      // (drawn before the budget check so the stream does not depend on the particle load)
      if (roomFor(explosions, "add", 0.9)) explosions.flak(_p, size);
    }
    pointDefence(ctx, dt);
    const t1 = performance.now();
    fleet.update(dt, camPos);
    fighters.update(dt, time + PREROLL, fighterFire); // the swarms' clock starts at the pre-roll
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

  // open on a battle already joined: the first seconds run off-screen (time counts up from -PREROLL,
  // so every timestamp stays in one frame) with the steady exchange in flight, the fires burning, the
  // fighter swarms dispersed, and one ship already marked by the director so a wreck or a death is on
  // screen from the first minute; the next doom follows shortly after the visible start
  time = -PREROLL;
  director.nextDoomAt = -PREROLL + rrand.range(6, 10);
  const tp = performance.now();
  for (let i = 0; i < PREROLL * 30; i++) update(1 / 30, ORIGIN);
  stats.prerollMs = +(performance.now() - tp).toFixed(1);
  time = 0;
  director.nextDoomAt = rrand.range(FIRST_DOOM[0], FIRST_DOOM[1]);
  stats.updateMs = stats.updateMsMax = stats.choreoMs = 0;

  return {
    fleet,
    models,
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
    // diagnostics: ships per class (alive / dying / dead wrecks still drawn) and per role
    classCounts() {
      const out = {};
      for (const st of states) {
        const c = (out[st.cls] = out[st.cls] || {
          alive: 0,
          dying: 0,
          dead: 0,
          roles: {},
        });
        if (st.dead) c.dead++;
        else if (st.dying) c.dying++;
        else c.alive++;
        c.roles[st.role] = (c.roles[st.role] || 0) + 1;
      }
      return out;
    },
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
        retired: director.retired,
        dying,
        boltsInFlight: inFlight.n,
        heavyInFlight: inFlight.heavy,
        heat: +heat.value.toFixed(2),
        deathLog: director.deathLog.slice(),
      };
    },
  };
}
