// Starfighter swarms. Seven original low-poly types (Republic heavy starfighter, wing fighter, Jedi
// interceptors in two colour schemes, gunship; Separatist droid fighter and tri-arm droid) rendered as ONE
// THREE.BatchedMesh (all types share a lit vertex-colour material; multi-draw makes it one draw call, with
// a per-instance squadron colour) plus one instanced additive engine-glow layer: two draw calls total.
//
// Motion (see fighters/flight.js): fighters fly in flights of 2–4 (wingmen hold slots on a leader), keep
// clear of capital hulls and run strafing passes along them, make attack runs at hull points and break
// away rolling, pick fights with enemy fighters (lead pursuit, evasive weaving), fly combat air patrol over
// their home ship, and gunships shuttle between friendly ships. Turn rate and acceleration are limited and
// the bank follows the yaw rate. Deterministic given the fixed-step time and per-fighter seeds.
//
// Integration hooks: `update(dt, t, fire)` calls `fire(f)` for capital-ship runs and `fire(f, target)`
// for fighter-vs-fighter shots; `damage(f, amount)` feeds a health counter, destroyed fighters call
// `onDestroyed(f)` and respawn from their home ship's ventral hangar after `respawnDelay` seconds
// (`onRespawn(f)` fires then). Other systems read `all`, `count` and per-fighter `pos`, `vel` (unit
// heading; `speed` is m/s), `quat`, `side`, `anchor`, `home`, `alive`.
import * as THREE from "three";
import {
  FIGHTER_DEFS,
  buildFighterGeometries,
  fighterMaterial,
} from "./fighters/models.js";
import { EngineGlow } from "./fighters/glow.js";
import {
  MODE,
  MODE_NAMES,
  mulberry32,
  frame,
  hullInfo,
  hullMetric,
  pushOut,
  refreshNear,
  avoidHulls,
  lissajous,
  slotPosition,
  setPatrol,
  startDogfight,
  endDogfight,
  steerLeader,
  steerWingman,
  evade,
  integrate,
} from "./fighters/flight.js";

export const FIGHTER_TYPES = FIGHTER_DEFS;
export { MODE as FIGHTER_MODE };

const ORIGIN = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _desired = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _n = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _qi = new THREE.Quaternion();
const _col = new THREE.Color();

function makeFighter(type, def, index, seed) {
  const rng = mulberry32(seed * 7919 + index * 104729 + 17);
  return {
    id: -1, // batched-mesh instance id
    index,
    type,
    def,
    side: def.side,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(0, 0, -1), // unit heading
    quat: new THREE.Quaternion(),
    speed: def.speed[1],
    speedTarget: def.speed[1],
    speedK: 0.92 + rng() * 0.16, // per-airframe speed variation
    roll: 0,
    bank: 0,
    spin: 0,
    spinRate: 0,
    breakSpin: 0,
    anchor: null, // enemy capital ship this fighter works against
    home: null, // friendly capital ship it launched from
    anchorR: 600,
    homeR: 600,
    alive: true,
    hp: def.hp,
    respawnAt: 0,
    flight: null,
    lead: null, // leader fighter when flying as wingman
    slot: 0,
    role: "strike",
    mode: MODE.PATROL,
    modeUntil: 0,
    goal: new THREE.Vector3(),
    aimLocal: new THREE.Vector3(), // attack-run aim point in the anchor's local frame
    breakDir: new THREE.Vector3(),
    dest: null, // gunship transit destination ship
    destOff: new THREE.Vector3(),
    quarry: null, // enemy fighter being pursued
    threat: null, // enemy fighter pursuing this one
    hunters: 0,
    noFightUntil: rng() * 20, // dogfight cooldown
    fireTimer: rng() * 3,
    burst: 3,
    rng,
    phase: rng() * Math.PI * 2,
    f1: 0.16 + rng() * 0.16,
    f2: 0.12 + rng() * 0.14,
    f3: 0.16 + rng() * 0.16,
    orbitK: 1.3 + rng() * 0.8,
    near: [null, null, null, null],
    nearH: [null, null, null, null],
    nearD: new Float64Array(4),
    nearN: 0,
    skim: 0,
  };
}

export class Fighters {
  constructor(scene, sun, opts = {}) {
    this.group = new THREE.Group();
    this.group.name = "fighters";
    scene.add(this.group);
    this.seed = opts.seed ?? 1337;
    const scale = opts.scale ?? 1;
    this.mat = fighterMaterial(sun);
    const geos = buildFighterGeometries();

    let total = 0;
    for (const def of Object.values(FIGHTER_DEFS))
      total += Math.max(1, Math.round(def.count * scale));
    let vertexCount = 0;
    for (const g of Object.values(geos))
      vertexCount += g.attributes.position.count;

    this.mesh = new THREE.BatchedMesh(total, vertexCount, 0, this.mat);
    this.mesh.name = "fighters";
    this.mesh.frustumCulled = false; // instances span the battlefield; culled per instance instead
    this.mesh.perObjectFrustumCulled = true;
    this.mesh.sortObjects = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.group.add(this.mesh);
    this.geoIds = {};
    for (const [key, g] of Object.entries(geos))
      this.geoIds[key] = this.mesh.addGeometry(g);

    this.types = {};
    this.all = [];
    this.bySide = { republic: [], separatist: [] };
    let index = 0;
    for (const [id, def] of Object.entries(FIGHTER_DEFS)) {
      const count = Math.max(1, Math.round(def.count * scale));
      const geoId = this.geoIds[def.geometry || id];
      const list = [];
      for (let i = 0; i < count; i++) {
        const f = makeFighter(id, def, index++, this.seed);
        f.id = this.mesh.addInstance(geoId);
        _col.set(def.paint[i % def.paint.length]);
        this.mesh.setColorAt(f.id, _col);
        this.mesh.setMatrixAt(f.id, _m.identity());
        list.push(f);
        this.all.push(f);
        (this.bySide[def.side] || (this.bySide[def.side] = [])).push(f);
      }
      this.types[id] = { list, def, geoId };
    }
    this.flights = this._buildFlights();
    this.glow = new EngineGlow(this.group, total);

    this.ships = null;
    this.hulls = null;
    this.time = 0;
    this.frame = 0;
    this.dead = [];
    this.respawnDelay = opts.respawnDelay ?? [5, 9];
    this.onDestroyed = null; // (f) => void, wired by the integrator to an explosion
    this.onRespawn = null; // (f) => void
    this.stats = {
      shotsCapital: 0,
      shotsFighter: 0,
      destroyed: 0,
      respawned: 0,
    };
    this.ctx = {
      time: 0,
      dt: 0,
      frame: 0,
      fire: null,
      stats: this.stats,
      pickDest: (f) => this._pickDest(f),
    };
  }

  get count() {
    return this.all.length;
  }

  // ---- flights: leader + wingmen of one type (Jedi interceptors pair yellow with red) ----
  _buildFlights() {
    const flights = [];
    const make = (members, def) => {
      const fl = {
        id: flights.length,
        side: def.side,
        members,
        role: "strike",
        anchor: null,
        home: null,
        mirror: (flights.length & 1) === 1,
        rng: mulberry32(this.seed * 31 + flights.length * 613 + 5),
      };
      for (let k = 0; k < members.length; k++) {
        const f = members[k];
        f.flight = fl;
        f.slot = k;
        f.lead = k ? members[0] : null;
        f.mode = k ? MODE.FORM : MODE.PATROL;
      }
      flights.push(fl);
      return fl;
    };
    const paired = new Set();
    for (const [id, T] of Object.entries(this.types)) {
      const other = T.def.pairWith && this.types[T.def.pairWith];
      if (!other) continue;
      const n = Math.min(T.list.length, other.list.length);
      for (let i = 0; i < n; i++) make([T.list[i], other.list[i]], T.def);
      for (let i = n; i < T.list.length; i++) make([T.list[i]], T.def);
      for (let i = n; i < other.list.length; i++) make([other.list[i]], T.def);
      paired.add(id);
      paired.add(T.def.pairWith);
    }
    for (const [id, T] of Object.entries(this.types)) {
      if (paired.has(id)) continue;
      const fs = Math.max(1, T.def.flight || 1);
      for (let i = 0; i < T.list.length; i += fs)
        make(T.list.slice(i, i + fs), T.def);
    }
    return flights;
  }

  _applyFlightShips(fl) {
    const aR = fl.anchor ? hullInfo(fl.anchor.model).R : 600;
    const hR = fl.home ? hullInfo(fl.home.model).R : 600;
    for (const f of fl.members) {
      f.anchor = fl.anchor;
      f.home = fl.home;
      f.anchorR = aR;
      f.homeR = hR;
      f.role = fl.role;
    }
  }

  _nearestShip(pos, side, friendly) {
    let best = null;
    let bestD = Infinity;
    for (const s of this.ships) {
      if (s.health <= 0) continue;
      if (friendly ? s.side !== side : s.side === side) continue;
      const d = s.position.distanceToSquared(pos);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  _nearestEnemyFighter(f, radius) {
    const list =
      this.bySide[f.side === "republic" ? "separatist" : "republic"] || [];
    let best = null;
    let bestD = radius * radius;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (!q.alive || q.hunters >= 2 || q.mode === MODE.LAUNCH) continue;
      const d = q.pos.distanceToSquared(f.pos);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
    return best;
  }

  // gunships: next friendly ship to shuttle to, with an offset beside/above it
  _pickDest(f) {
    let n = 0;
    for (const s of this.ships)
      if (s.side === f.side && s.health > 0 && s !== f.dest) n++;
    if (!n) {
      f.dest = null;
      return;
    }
    let k = Math.floor(f.rng() * n);
    for (const s of this.ships) {
      if (s.side !== f.side || s.health <= 0 || s === f.dest) continue;
      if (k-- === 0) {
        f.dest = s;
        break;
      }
    }
    const R = hullInfo(f.dest.model).R;
    const ang = f.rng() * Math.PI * 2;
    f.destOff.set(
      Math.cos(ang) * R * 1.5,
      (f.rng() - 0.5) * R,
      Math.sin(ang) * R * 1.5,
    );
  }

  // Give every flight a home ship, an enemy anchor ship, a role and a starting position: strike flights
  // are spread along the way to (and around) their anchor so the battle is already joined at t = 0.
  deploy(ships) {
    this.ships = ships;
    this.hulls = ships.map((s) => hullInfo(s.model));
    // spread flights over the fleet: among three random candidates take the ship with the fewest flights
    // so far, nearer ships winning ties
    const homeLoad = new Map();
    const anchorLoad = new Map();
    const pick = (list, load, near, rng) => {
      let best = null;
      let bestScore = Infinity;
      for (let k = 0; k < 3 && list.length; k++) {
        const s = list[Math.floor(rng() * list.length)];
        const d = near ? s.position.distanceTo(near.position) : 0;
        const score = (load.get(s) || 0) + d / 12000;
        if (score < bestScore) {
          bestScore = score;
          best = s;
        }
      }
      if (best) load.set(best, (load.get(best) || 0) + 1);
      return best;
    };
    for (const fl of this.flights) {
      const rng = fl.rng;
      const friends = [];
      const enemies = [];
      for (const s of ships) (s.side === fl.side ? friends : enemies).push(s);
      const leader = fl.members[0];
      const def = leader.def;
      fl.home = pick(friends, homeLoad, null, rng);
      const anchor = pick(enemies, anchorLoad, fl.home, rng);
      fl.anchor = anchor;
      const roles = def.role || {};
      fl.role = roles.transit
        ? "transit"
        : rng() < (roles.cap || 0)
          ? "cap"
          : "strike";
      if (!anchor && fl.role === "strike") fl.role = "cap";
      this._applyFlightShips(fl);

      // spawn point
      const hp = fl.home ? fl.home.position : ORIGIN;
      const ap = anchor ? anchor.position : hp;
      const R = fl.home ? hullInfo(fl.home.model).R : 600;
      let u = 0;
      if (fl.role === "strike")
        u = rng() < 0.7 ? 0.55 + rng() * 0.45 : 0.1 + rng() * 0.35;
      _a.lerpVectors(hp, ap, u);
      _b.copy(ap).sub(hp);
      if (_b.lengthSq() < 1) _b.set(0, 0, 1);
      _b.normalize();
      frame(_b, _right, _up);
      const ang = rng() * Math.PI * 2;
      const rad = R * (0.9 + rng() * 0.8);
      _a.addScaledVector(_right, Math.cos(ang) * rad).addScaledVector(
        _up,
        Math.sin(ang) * rad * 0.6,
      );
      pushOut(_a, ships, this.hulls);
      leader.pos.copy(_a);

      // starting mode, goal and heading
      if (fl.role === "transit") {
        this._pickDest(leader);
        leader.mode = MODE.TRANSIT;
        if (leader.dest)
          leader.goal.copy(leader.dest.position).add(leader.destOff);
        else leader.goal.copy(leader.pos).add(_b);
      } else {
        setPatrol(leader, 0);
        leader.modeUntil = rng() * 10;
        const c = leader.mode === MODE.CAP ? leader.home : leader.anchor;
        const cR = leader.mode === MODE.CAP ? leader.homeR : leader.anchorR;
        lissajous(
          leader,
          c ? c.position : ORIGIN,
          cR * leader.orbitK,
          0,
          leader.goal,
        );
      }
      _desired.copy(leader.goal).sub(leader.pos);
      if (_desired.lengthSq() < 1) _desired.copy(_b);
      leader.vel.copy(_desired.normalize());
      leader.speed = leader.speedTarget = def.speed[1] * leader.speedK;
      for (let k = 1; k < fl.members.length; k++) {
        const f = fl.members[k];
        f.vel.copy(leader.vel);
        f.speed = f.speedTarget = leader.speed;
        slotPosition(f, f.pos);
        pushOut(f.pos, ships, this.hulls);
        f.mode = MODE.FORM;
      }
      for (const f of fl.members) refreshNear(f, ships, this.hulls);
    }
    this.glow.begin();
    for (const f of this.all) this._write(f, true);
    this.glow.end();
  }

  // periodic upkeep for leaders (every half second): lost anchor/home, dogfight acquisition, role flips
  _maintain(f, t) {
    const fl = f.flight;
    if (fl.role !== "transit" && (!fl.anchor || fl.anchor.health <= 0)) {
      fl.anchor = this._nearestShip(f.pos, fl.side, false);
      if (!fl.anchor) fl.role = "cap";
      this._applyFlightShips(fl);
      if (f.mode === MODE.ATTACK || f.mode === MODE.PATROL) setPatrol(f, t);
    }
    if (!fl.home || fl.home.health <= 0) {
      const h = this._nearestShip(f.pos, fl.side, true);
      if (h) {
        fl.home = h;
        this._applyFlightShips(fl);
      }
    }
    if (
      (f.mode === MODE.PATROL || f.mode === MODE.CAP) &&
      t >= f.noFightUntil &&
      f.rng() < 0.2
    ) {
      const q = this._nearestEnemyFighter(f, f.mode === MODE.CAP ? 2400 : 1500);
      if (q) startDogfight(f, q, t);
    }
    if (fl.role === "cap" && fl.anchor && f.rng() < 0.004) {
      fl.role = "strike";
      this._applyFlightShips(fl);
      setPatrol(f, t);
    } else if (
      fl.role === "strike" &&
      f.mode === MODE.PATROL &&
      f.rng() < 0.002
    ) {
      fl.role = "cap";
      this._applyFlightShips(fl);
      setPatrol(f, t);
    }
  }

  update(dt, t, fire) {
    if (!this.ships) return;
    this.time = t;
    this.frame++;
    const ctx = this.ctx;
    ctx.dt = dt;
    ctx.time = t;
    ctx.frame = this.frame;
    ctx.fire = typeof fire === "function" ? fire : null;

    for (let i = this.dead.length - 1; i >= 0; i--) {
      const f = this.dead[i];
      if (t < f.respawnAt) continue;
      this.dead[i] = this.dead[this.dead.length - 1];
      this.dead.pop();
      this._respawn(f, t);
    }

    const all = this.all;
    const n = all.length;
    const frameNo = this.frame;
    this.glow.begin();
    for (let i = 0; i < n; i++) {
      const f = all[i];
      if (!f.alive) continue;
      if (((frameNo + i) & 3) === 0) refreshNear(f, this.ships, this.hulls);
      if (!f.lead && f.mode !== MODE.LAUNCH && (frameNo + i) % 30 === 0)
        this._maintain(f, t);
      f.fireTimer -= dt;
      let turn;
      if (f.mode === MODE.LAUNCH) {
        f.spinRate = 0;
        _desired.copy(f.vel);
        f.speedTarget = f.def.speed[1] * f.speedK;
        turn = f.def.turn;
        if (t >= f.modeUntil) {
          if (f.lead) f.mode = MODE.FORM;
          else if (f.role === "transit") {
            this._pickDest(f);
            f.mode = MODE.TRANSIT;
          } else setPatrol(f, t);
        }
      } else if (f.lead) turn = steerWingman(f, ctx, _desired);
      else turn = steerLeader(f, ctx, _desired);
      avoidHulls(f, _desired);
      evade(f, ctx, _desired);
      integrate(f, dt, _desired, turn);
      this._write(f, true);
    }
    this.glow.end();
  }

  // orientation matrix from heading + roll, instance matrix, quaternion and engine glow
  _write(f, withGlow) {
    frame(f.vel, _right, _up);
    const cr = Math.cos(f.roll);
    const sr = Math.sin(f.roll);
    const e = _m.elements;
    e[0] = _right.x * cr - _up.x * sr;
    e[1] = _right.y * cr - _up.y * sr;
    e[2] = _right.z * cr - _up.z * sr;
    e[3] = 0;
    e[4] = _up.x * cr + _right.x * sr;
    e[5] = _up.y * cr + _right.y * sr;
    e[6] = _up.z * cr + _right.z * sr;
    e[7] = 0;
    e[8] = -f.vel.x;
    e[9] = -f.vel.y;
    e[10] = -f.vel.z;
    e[11] = 0;
    e[12] = f.pos.x;
    e[13] = f.pos.y;
    e[14] = f.pos.z;
    e[15] = 1;
    this.mesh.setMatrixAt(f.id, _m);
    f.quat.setFromRotationMatrix(_m);
    if (!withGlow) return;
    const en = f.def.engine;
    const p = en.pos;
    const gx = e[12] + e[0] * p[0] + e[4] * p[1] + e[8] * p[2];
    const gy = e[13] + e[1] * p[0] + e[5] * p[1] + e[9] * p[2];
    const gz = e[14] + e[2] * p[0] + e[6] * p[1] + e[10] * p[2];
    const flicker =
      0.9 + 0.1 * Math.sin(this.time * 41 + f.phase * 10) + f.speed * 0.0006;
    this.glow.push(
      gx,
      gy,
      gz,
      f.vel.x,
      f.vel.y,
      f.vel.z,
      en.color[0],
      en.color[1],
      en.color[2],
      en.size,
      en.tail,
      en.glow * flicker,
    );
  }

  // ---- damage, destruction, respawn ----

  /** Apply damage; returns true when the fighter was destroyed by this hit. */
  damage(f, amount = 1) {
    if (!f || !f.alive) return false;
    f.hp -= amount;
    if (f.hp > 0) return false;
    this._destroy(f);
    return true;
  }

  _destroy(f) {
    f.alive = false;
    f.hp = 0;
    f.mode = MODE.DEAD;
    const [d0, d1] = this.respawnDelay;
    f.respawnAt = this.time + d0 + f.rng() * (d1 - d0);
    this.mesh.setVisibleAt(f.id, false);
    endDogfight(f);
    f.threat = null;
    f.hunters = 0;
    this.dead.push(f);
    this._refreshFlight(f.flight);
    this.stats.destroyed++;
    if (this.onDestroyed) this.onDestroyed(f);
  }

  _respawn(f, t) {
    const fl = f.flight;
    let home = fl.home;
    if (!home || home.health <= 0) {
      home = this._nearestShip(home ? home.position : f.pos, f.side, true);
      if (home) {
        fl.home = home;
        this._applyFlightShips(fl);
      }
    }
    if (home) {
      const h = hullInfo(home.model);
      f.pos.copy(h.hangar).applyMatrix4(home.matrix);
      f.vel.set(0, -0.3, -1).normalize().applyQuaternion(home.quaternion);
    } else {
      f.pos.set(0, 0, 0);
      f.vel.set(0, 0, -1);
    }
    f.speed = 150;
    f.speedTarget = f.def.speed[1] * f.speedK;
    f.alive = true;
    f.hp = f.def.hp;
    f.mode = MODE.LAUNCH;
    f.modeUntil = t + 3;
    f.bank = f.spin = f.roll = f.spinRate = 0;
    f.fireTimer = 2;
    f.quarry = null;
    f.threat = null;
    f.hunters = 0;
    refreshNear(f, this.ships, this.hulls);
    this.mesh.setVisibleAt(f.id, true);
    this._refreshFlight(fl);
    this.stats.respawned++;
    if (this.onRespawn) this.onRespawn(f);
  }

  // first living member leads; the others take slots behind it
  _refreshFlight(fl) {
    let leader = null;
    let k = 0;
    for (const f of fl.members) {
      if (!f.alive) {
        f.lead = null;
        continue;
      }
      if (!leader) {
        leader = f;
        f.lead = null;
        f.slot = 0;
        if (f.mode === MODE.FORM) {
          if (fl.role === "transit") {
            this._pickDest(f);
            f.mode = MODE.TRANSIT;
          } else setPatrol(f, this.time);
        }
      } else {
        f.lead = leader;
        f.slot = ++k;
        if (f.mode !== MODE.LAUNCH) {
          if (f.mode === MODE.DOGFIGHT) endDogfight(f);
          f.mode = MODE.FORM;
        }
      }
    }
  }

  // ---- diagnostics ----

  /** Fighters inside a capital hull: no-fly zone metric, tight hull box, and the 0.6 R anchor sphere. */
  insideHullCount() {
    const out = { zone: 0, hullBox: 0, anchorSphere06: 0, alive: 0 };
    if (!this.ships) return out;
    for (const f of this.all) {
      if (!f.alive) continue;
      out.alive++;
      let zone = false;
      let inBox = false;
      for (let i = 0; i < this.ships.length; i++) {
        const s = this.ships[i];
        const h = this.hulls[i];
        if (f.pos.distanceToSquared(s.position) > h.reach * h.reach) continue;
        if (hullMetric(s, h, f.pos, _n) < 1) zone = true;
        _a.copy(f.pos)
          .sub(s.position)
          .applyQuaternion(_qi.copy(s.quaternion).invert())
          .sub(h.center);
        if (
          Math.abs(_a.x) < h.ax / 1.05 - 85 &&
          Math.abs(_a.y) < h.ay / 1.05 - 85 &&
          Math.abs(_a.z) < h.az / 1.03 - 85
        )
          inBox = true;
      }
      if (zone) out.zone++;
      if (inBox) out.hullBox++;
      if (
        f.anchor &&
        f.pos.distanceTo(f.anchor.position) < f.anchor.model.bounds.radius * 0.6
      )
        out.anchorSphere06++;
    }
    return out;
  }

  modeCounts() {
    const out = {};
    for (const f of this.all) {
      const k = MODE_NAMES[f.mode] || "?";
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }
}
