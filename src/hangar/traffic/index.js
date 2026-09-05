// sys-traffic — TIE-style fighter traffic for the Deck 4 hangar (COORDINATION.md §9.6).
// Racked + flying fighters share one InstancedMesh; one shuttle-style craft (folding wings) parks in the
// shuttle bay; tractor beams, engine glow, beacons and rack clamps are one draw call each (≤ 6 total).
// Motion is time-parametric: pos(t) = path.getPointAt(profile((t - t0) / duration)); the schedule is
// deterministic from ctx.seed so every client replays the same traffic. See README.md in this folder.
import * as THREE from "three";
import { buildFighter, buildShuttle, buildClamp, SHUTTLE_SPEC, FIGHTER_ENGINES, SHUTTLE_ENGINES } from "./craft.js";
import { PathRegistry } from "./paths.js";
import { Schedule, unit } from "./scheduler.js";
import { makeBeams, makeGlow, makeBeacons, makeClamps, shaftStrength, insideShaft, EMITTERS } from "./effects.js";
import { makeTrafficMaterials } from "./materials.js";
import * as hooks from "./hooks.js";

const FIGHTER_CAPACITY = 48;
const SHUTTLE_CAPACITY = 2;
const MAX_MOVERS = 16;
/** COORDINATION.md §12: the whole system stays under this many triangles at any time */
const TRI_BUDGET = 40000;
const PATROL = [
  { loop: "alpha", count: 5 },
  { loop: "beta", count: 5 },
];
/**
 * Patrol flights fly as a five-ship V: member i trails the lead by `behind` metres along the loop and sits
 * `right`/`up` metres off the path in the flight's tangent frame (so the echelon banks with the leader).
 */
const FORMATION = [
  { behind: 0, right: 0, up: 0 },
  { behind: 20, right: 16, up: -3 },
  { behind: 20, right: -16, up: -3 },
  { behind: 40, right: 32, up: -6 },
  { behind: 40, right: -32, up: -6 },
];
const MAX_HANGAR_MOVERS = MAX_MOVERS - PATROL.reduce((n, p) => n + p.count, 0);
const MAX_RACKED = 22;
const RACK_FILL = 0.7;

const FALLBACK_PAD = { pos: [-110, -71.7, 15], yaw: 90 };
const FALLBACK_CRADLES = [
  { pos: [110, -67.8, -10], yaw: 0 },
  { pos: [110, -67.8, 30], yaw: 0 },
];
// mirrors the hangar plan: two tiers per side wall, seven slots each, none within 10 m of the bay doors
function fallbackSlots() {
  const out = [];
  for (const side of ["port", "starboard"]) {
    const x = side === "port" ? -70 : 70;
    [-62, -46].forEach((y, tier) => {
      for (let i = 0; i < 7; i++) out.push({ id: `rack-${side[0]}${tier}-${i}`, pos: [x, y, 28 + i * 10], yaw: 0, tier, side, occupied: false });
    });
  }
  return out;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
const _upRef = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qLevel = new THREE.Quaternion();
const _qSlot = new THREE.Quaternion();
const _qRest = new THREE.Quaternion();
const _s1 = new THREE.Vector3(1, 1, 1);
const _w = { tangent: 1, level: 0, slot: 0, yaw: 0 };
const GLOW_COLOUR = new THREE.Color(0.62, 0.8, 1.0);
const HOLD_COLOUR = new THREE.Color(0.5, 0.72, 1.0);
const ENGINE_OFFSETS = FIGHTER_ENGINES.offsets.map(([x, y]) => new THREE.Vector3(x, y, FIGHTER_ENGINES.exitZ + 0.25));
const SHUTTLE_ENGINE_OFFSETS = SHUTTLE_ENGINES.offsets.map(([x, y]) => new THREE.Vector3(x, y, SHUTTLE_ENGINES.exitZ + 0.25));
const NAV_PORT = new THREE.Vector3(-3.95, 3.62, 0);
const NAV_STBD = new THREE.Vector3(3.95, 3.62, 0);
const LANDING = new THREE.Vector3(0, -2.35, -0.5);
/** landing-light cone direction in the craft frame (forward and 45° down) and length */
const LANDING_DIR = new THREE.Vector3(0, -0.707, -0.707);
const LANDING_LEN = 18;
const FIN_BEACON = new THREE.Vector3(0, 8.8, 1.3);

const MOVING = new Set(["launching", "patrol", "arriving", "docking"]);
const HANGAR_MOVING = new Set(["launching", "arriving", "docking"]);
const EVENTS = ["launch", "dock", "depart", "arrive"];
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Patrol view camera, derived from the alpha loop itself: sit on the loop 100 m behind, 45 m right of and
 * 30 m above the lead's position at the anchor time (its first control point), looking at empty air 30 m
 * behind the lead so the V fills the frame in a 3/4 rear view at 75-115 m and nothing sits dead centre.
 */
function patrolCamera() {
  const path = new PathRegistry(new Map(), 1).get("patrol:alpha");
  const p = path.pointAt(0, new THREE.Vector3());
  const d = path.tangentAt(0, new THREE.Vector3()).normalize();
  const r = new THREE.Vector3().crossVectors(d, Y_AXIS).normalize();
  const u = new THREE.Vector3().crossVectors(r, d).normalize();
  const pos = p.clone().addScaledVector(d, -100).addScaledVector(r, 45).addScaledVector(u, 30);
  const look = p.clone().addScaledVector(d, -30).addScaledVector(u, -5);
  const arr = (v) => [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)];
  return { pos: arr(pos), lookAt: arr(look) };
}
const PATROL_CAM = patrolCamera();

class Craft {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.state = "racked";
    this.pathId = null;
    this.t0 = 0;
    this.duration = 0;
    this.from = null;
    this.to = null;
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.inst = -1;
    this.controller = null;
    this.external = false;
    this.flight = null;
    this.fold = 1;
    this.speed = 0;
    this.accel = 0;
    this.s = 0;
    this.phase = unit(id) * 6.283;
    this.arrived = false;
    this.cleared = false;
    /** formation offset [right, up] metres in the path's tangent frame (patrol V members), or null */
    this.offset = null;
  }
  yaw() {
    _f.set(0, 0, -1).applyQuaternion(this.quaternion);
    return THREE.MathUtils.radToDeg(Math.atan2(-_f.x, -_f.z));
  }
  plain() {
    const o = {
      id: this.id,
      type: this.type,
      state: this.state,
      pathId: this.pathId,
      t0: this.t0,
      duration: this.duration,
      from: this.from,
      to: this.to,
      position: [+this.position.x.toFixed(3), +this.position.y.toFixed(3), +this.position.z.toFixed(3)],
      yaw: +this.yaw().toFixed(2),
    };
    if (this.offset) o.offset = this.offset.slice();
    return o;
  }
}

export default {
  id: "sys-traffic",
  name: "Fighter traffic",
  kind: "system",
  deck: 4,
  owner: "D",
  materials: (shared) => makeTrafficMaterials(shared),
  views: {
    // below the keel, 39 m from the aperture centre: at t 40 arrival A0 is exactly there, held by all four
    // beams (it spends ~6 s in the column, so the moment survives ±2 s of drift)
    "sys-traffic-approach": { mode: "exterior", camPos: [20, -108, 8], lookAt: [0, -82, 34], time: 40 },
    // on the deck outside the aperture rail (x -36), looking up at both port rack tiers
    "sys-traffic-racks": { pos: [-42, -72, 40], yaw: 108, pitch: 18, time: 40 },
    // 27 m from the hover point, aft-starboard of it and 20 m above the deck: A0 hovers 46..48 s, so at 47 it
    // sits level with its engines toward the camera, the landing light sweeping down and the hold glow under it
    "sys-traffic-hover": { mode: "exterior", camPos: [20, -52, 46], lookAt: [0, -40, 32], time: 47 },
    // on alpha's loop 100 m behind / 45 m right / 30 m above the lead as the V passes its first control point
    "sys-traffic-patrol": { mode: "exterior", camPos: PATROL_CAM.pos, lookAt: PATROL_CAM.lookAt, time: 40 },
  },

  build(ctx) {
    const { group, materials, PALETTE, world, seed } = ctx;
    const log = (...a) => console.log("[traffic]", ...a);

    // ---- world interfaces (systems are built after rooms; fall back to the Deck 4 plan when a room is absent)
    const hangar = world && world.get ? world.get("d4-hangar") : null;
    let rawSlots = null;
    try {
      rawSlots = hangar && hangar.result && hangar.result.api && hangar.result.api.rackSlots ? hangar.result.api.rackSlots() : null;
    } catch (e) {
      console.warn("[traffic] d4-hangar rackSlots() failed, using fallback grid:", e);
    }
    const slotSource = Array.isArray(rawSlots) && rawSlots.length ? rawSlots : fallbackSlots();
    const slots = slotSource.map((s, i) => ({
      id: s.id || `rack-${i}`,
      pos: [s.pos[0], s.pos[1], s.pos[2]],
      yaw: s.yaw || 0,
      tier: s.tier ?? 0,
      side: s.side ?? (s.pos[0] < 0 ? "port" : "starboard"),
      fighterId: null,
      ref: s,
    }));
    const slotById = new Map(slots.map((s) => [s.id, s]));
    const shuttleBay = world && world.get ? world.get("d4-shuttle-bay") : null;
    const pad = (shuttleBay && shuttleBay.result && shuttleBay.result.api && shuttleBay.result.api.shuttlePad && shuttleBay.result.api.shuttlePad()) || FALLBACK_PAD;
    const fighterBay = world && world.get ? world.get("d4-fighter-bay") : null;
    const cradleSrc = fighterBay && fighterBay.result && fighterBay.result.api && fighterBay.result.api.cradles ? fighterBay.result.api.cradles() : null;
    const cradles = Array.isArray(cradleSrc) && cradleSrc.length ? cradleSrc : FALLBACK_CRADLES;
    const extraZones = hooks.landingZones();
    // tractor emitters: the hangar's published points (its emitter housings) so the beams line up with them
    let emitters = EMITTERS;
    try {
      const tp = hangar && hangar.result && hangar.result.api && hangar.result.api.tractorPoints ? hangar.result.api.tractorPoints() : null;
      if (Array.isArray(tp) && tp.length >= 4 && tp.every((p) => Array.isArray(p) && p.length === 3)) emitters = tp.slice(0, 4).map((p) => [p[0], p[1], p[2]]);
    } catch (e) {
      console.warn("[traffic] d4-hangar tractorPoints() failed, using the plan's emitters:", e);
    }
    log(`${slots.length} rack slots (${rawSlots ? "d4-hangar" : "fallback"}), pad ${pad.pos}, ${cradles.length} cradles, ${extraZones.length} extra zones, emitters ${emitters === EMITTERS ? "plan" : "d4-hangar"}`);

    // ---- geometry + the six drawables
    const fighterGeo = buildFighter(PALETTE);
    const shuttleGeo = buildShuttle(PALETTE);
    const clampGeo = buildClamp(PALETTE);
    const fighters = new THREE.InstancedMesh(fighterGeo, materials.trafficHull, FIGHTER_CAPACITY);
    fighters.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fighters.count = 0;
    fighters.frustumCulled = false;
    fighters.castShadow = true;
    fighters.receiveShadow = true;
    fighters.name = "traffic_fighters";
    const shuttles = new THREE.InstancedMesh(shuttleGeo, materials.trafficShuttle, SHUTTLE_CAPACITY);
    shuttles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shuttles.count = 0;
    shuttles.frustumCulled = false;
    shuttles.castShadow = true;
    shuttles.receiveShadow = true;
    shuttles.name = "traffic_shuttles";
    const foldAttr = shuttleGeo.getAttribute("aFold");
    const beams = makeBeams(materials.trafficBeam, emitters);
    const glow = makeGlow(materials.trafficGlow, 64);
    const beacons = makeBeacons(materials.trafficBeacon, FIGHTER_CAPACITY * 3 + SHUTTLE_CAPACITY + emitters.length);
    const clamps = makeClamps(clampGeo, materials.trafficHull, slots);
    group.add(fighters, shuttles, beams.mesh, glow.mesh, beacons.points, clamps.mesh);
    const clampAmounts = new Float32Array(slots.length);

    // triangle budget -> hard cap on live fighter instances. Everything else the schedule can show is
    // fixed-size (one parked shuttle, the clamps, the beam cones, the glow quads); api.spawn() craft are the
    // integrator's explicit extras and are not reserved for here.
    const fixedTris = shuttleGeo.userData.tris + clampGeo.userData.tris * slots.length * 2 + beams.tris + glow.capacity * 2;
    const maxFighterInstances = Math.max(0, Math.min(FIGHTER_CAPACITY, Math.floor((TRI_BUDGET - fixedTris) / fighterGeo.userData.tris)));
    const patrolCount = PATROL.reduce((n, p) => n + p.count, 0);
    const maxHangarFighters = Math.max(0, maxFighterInstances - cradles.length - patrolCount);

    // one pooled light rides with the craft in the shaft (tractor-beam fill); removed from the list when idle
    const beamLight = { type: "point", pos: [0, -85, 32], color: 0x6f9cff, intensity: 60, distance: 80, decay: 1.5, priority: 0.7 };

    // ---- state
    const crafts = new Map();
    const listeners = new Map(EVENTS.map((e) => [e, new Set()]));
    const paths = new PathRegistry(slotById, seed);
    const schedule = new Schedule({ seed, slots, arrivalsPerMinute: 2, launchesPerMinute: 2, maxHangarMovers: MAX_HANGAR_MOVERS, maxHangarFighters });
    let lastT = -Infinity;
    let spawnCount = 0;
    const emit = (name, craft, extra) => {
      const set = listeners.get(name);
      if (!set || !set.size) return;
      const payload = craft.plain();
      if (extra) Object.assign(payload, extra);
      for (const cb of set) {
        try {
          cb(payload);
        } catch (e) {
          console.error("[traffic] listener error", e);
        }
      }
    };

    // instance slots in the fighter mesh (compacted so mesh.count == live fighters)
    const byInst = [];
    const allocInst = (craft) => {
      craft.inst = fighters.count;
      byInst[craft.inst] = craft;
      fighters.count++;
    };
    const freeInst = (craft) => {
      const i = craft.inst;
      if (i < 0) return;
      const last = fighters.count - 1;
      if (i !== last) {
        const moved = byInst[last];
        moved.inst = i;
        byInst[i] = moved;
        fighters.getMatrixAt(last, _m);
        fighters.setMatrixAt(i, _m);
      }
      byInst.length = last;
      fighters.count = last;
      fighters.instanceMatrix.needsUpdate = true;
      craft.inst = -1;
    };
    const shuttleByInst = [];
    const allocShuttle = (craft) => {
      if (shuttles.count >= SHUTTLE_CAPACITY) return false;
      craft.inst = shuttles.count;
      shuttleByInst[craft.inst] = craft;
      shuttles.count++;
      return true;
    };
    const freeShuttle = (craft) => {
      const i = craft.inst;
      if (i < 0) return;
      const last = shuttles.count - 1;
      if (i !== last) {
        const moved = shuttleByInst[last];
        moved.inst = i;
        shuttleByInst[i] = moved;
        shuttles.getMatrixAt(last, _m);
        shuttles.setMatrixAt(i, _m);
        foldAttr.setX(i, moved.fold);
      }
      shuttleByInst.length = last;
      shuttles.count = last;
      shuttles.instanceMatrix.needsUpdate = true;
      craft.inst = -1;
    };

    const addCraft = (craft) => {
      if (craft.type === "shuttle") {
        if (!allocShuttle(craft)) return null;
      } else allocInst(craft);
      crafts.set(craft.id, craft);
      return craft;
    };
    const removeCraft = (craft) => {
      if (craft.type === "shuttle") freeShuttle(craft);
      else freeInst(craft);
      crafts.delete(craft.id);
    };
    const clearCrafts = () => {
      for (const c of [...crafts.values()]) removeCraft(c);
      for (const s of slots) {
        s.fighterId = null;
        if (s.ref) s.ref.occupied = false;
      }
    };

    const setSlotFighter = (slot, craft) => {
      slot.fighterId = craft ? craft.id : null;
      if (slot.ref) slot.ref.occupied = !!craft;
    };

    // ---- initial population (deterministic from the seed)
    const populate = () => {
      const order = slots.map((_, i) => i).sort((a, b) => unit(seed, "rack", a) - unit(seed, "rack", b));
      // ~70 % of the slots, leaving room under the instance cap for the movers the schedule adds
      const nRacked = Math.max(0, Math.min(MAX_RACKED, Math.round(slots.length * RACK_FILL), maxHangarFighters - MAX_HANGAR_MOVERS));
      for (let k = 0; k < nRacked; k++) {
        const slot = slots[order[k]];
        const c = new Craft(`tie-r${String(k).padStart(2, "0")}`, "fighter");
        c.state = "racked";
        c.to = slot.id;
        addCraft(c);
        setSlotFighter(slot, c);
      }
      cradles.forEach((cr, i) => {
        const c = new Craft(`tie-m${i}`, "fighter");
        c.state = "maintenance";
        c.to = `cradle-${i}`;
        c.pad = cr;
        addCraft(c);
      });
      PATROL.forEach(({ loop, count }) => {
        const path = paths.get("patrol:" + loop);
        const speed = path.length / path.duration;
        // the alpha lead passes the loop's first control point at the anchor time (t 40); beta is phased so
        // its V is on the far side of the ship then. Members trail the lead by their formation distance.
        const leadT0 = loop === "alpha" ? 40 : -17 - path.duration * 0.5;
        for (let i = 0; i < count; i++) {
          const c = new Craft(`tie-p-${loop}-${i}`, "fighter");
          c.state = "patrol";
          c.pathId = path.id;
          c.duration = path.duration;
          const fm = FORMATION[i % FORMATION.length];
          c.t0 = leadT0 + fm.behind / speed;
          c.offset = [fm.right, fm.up];
          addCraft(c);
        }
      });
      const sh = new Craft("shuttle-0", "shuttle");
      sh.state = "racked";
      sh.to = "shuttle-pad";
      sh.pad = pad;
      sh.fold = SHUTTLE_SPEC.parkedFold;
      addCraft(sh);
      hooks.surfaceContact(sh, pad);
    };

    // ---- flight lifecycle (driven by the schedule; also used by api.spawn for path ids)
    const startFlight = (flight, t) => {
      flight.started = true;
      const slot = slotById.get(flight.slotId);
      if (flight.kind === "arrival") {
        const c = new Craft(flight.fighterId, "fighter");
        c.state = "arriving";
        c.pathId = flight.pathId;
        c.t0 = flight.t0;
        c.duration = flight.duration;
        c.from = "space";
        c.to = flight.slotId;
        c.flight = flight;
        addCraft(c);
        return;
      }
      const c = crafts.get(flight.fighterId);
      if (!c) {
        flight.ended = true;
        return;
      }
      c.state = "launching";
      c.pathId = flight.pathId;
      c.t0 = flight.t0;
      c.duration = flight.duration;
      c.from = flight.slotId;
      c.to = "space";
      c.flight = flight;
      if (slot && slot.fighterId === c.id) setSlotFighter(slot, null);
      hooks.hangarDeploy(c, slot);
      emit("launch", c);
    };
    const endFlight = (flight, t) => {
      flight.ended = true;
      const c = crafts.get(flight.fighterId);
      if (!c) return;
      c.flight = null;
      if (flight.kind === "arrival") {
        const slot = slotById.get(flight.slotId);
        c.state = "racked";
        c.pathId = null;
        c.from = null;
        c.to = flight.slotId;
        if (slot) {
          setSlotFighter(slot, c);
          hooks.docking(c, slot);
        }
        emit("dock", c);
      } else {
        hooks.atmosphericEntry(c, { altitude: Infinity, speed: c.speed });
        emit("depart", c);
        removeCraft(c);
      }
    };

    // populate first: Schedule.reset() reads the initial rack occupancy from slot.fighterId
    const reset = () => {
      clearCrafts();
      populate();
      schedule.reset();
      lastT = -Infinity;
    };

    const advanceTo = (t) => {
      schedule.generateUntil(t);
      for (const f of schedule.flights) {
        if (!f.started && f.t0 <= t) startFlight(f, t);
        if (f.started && !f.ended && f.t0 + f.duration <= t) endFlight(f, t);
      }
      schedule.prune(t);
      // external flights spawned through the API
      for (const c of [...crafts.values()]) {
        if (!c.external || !c.pathId) continue;
        const path = paths.get(c.pathId);
        if (!path || path.closed) continue;
        if (t >= c.t0 + c.duration) {
          if (path.kind === "arrival") {
            const slot = slotById.get(c.to);
            if (slot && !slot.fighterId) {
              c.state = "racked";
              c.pathId = null;
              setSlotFighter(slot, c);
              hooks.docking(c, slot);
              emit("dock", c);
              continue;
            }
          }
          emit("depart", c);
          removeCraft(c);
        }
      }
    };

    // ---- pose sampling ----------------------------------------------------------------------------
    const yawQuat = (deg, out) => out.setFromAxisAngle(Y_AXIS, THREE.MathUtils.degToRad(deg));

    const posePath = (c, t) => {
      const path = paths.get(c.pathId);
      if (!path) return false;
      const D = c.duration || path.duration;
      const s = (t - c.t0) / D;
      c.s = s;
      const ds = 0.25 / D;
      path.pointAt(s, _p);
      path.pointAt(s - ds, _pa);
      path.pointAt(s + ds, _pb);
      _v1.subVectors(_p, _pa).multiplyScalar(4); // velocity before
      _v2.subVectors(_pb, _p).multiplyScalar(4); // velocity after
      const sp1 = _v1.length();
      const sp2 = _v2.length();
      c.speed = (sp1 + sp2) * 0.5;
      c.accel = (sp2 - sp1) * 4;
      // tangent frame with a stable up reference through vertical segments
      path.tangentAt(s, _f);
      if (_f.lengthSq() < 1e-8) _f.set(0, 0, -1);
      _f.normalize();
      const k = THREE.MathUtils.smoothstep(Math.abs(_f.y), 0.85, 0.98);
      _upRef.set(0, 1 - k, -k).normalize();
      _r.crossVectors(_f, _upRef).normalize();
      _u.crossVectors(_r, _f).normalize();
      // formation members ride beside/below the path in its unbanked tangent frame
      if (c.offset) _p.addScaledVector(_r, c.offset[0]).addScaledVector(_u, c.offset[1]);
      // bank into the turn: lateral acceleration vs an effective gravity
      _v2.sub(_v1).multiplyScalar(4);
      const aLat = _v2.dot(_r);
      const bank = THREE.MathUtils.clamp(Math.atan2(aLat, 12), -0.9, 0.9);
      const cb = Math.cos(bank);
      const sb = Math.sin(bank);
      _v1.copy(_r).multiplyScalar(cb).addScaledVector(_u, -sb); // right'
      _v2.copy(_u).multiplyScalar(cb).addScaledVector(_r, sb); // up'
      _f.negate(); // object +Z points backwards
      _m.makeBasis(_v1, _v2, _f);
      _q.setFromRotationMatrix(_m);
      // blend with level / slot orientations
      const w = path.orientWeights(s, _w);
      if (w.level + w.slot > 1e-4) {
        yawQuat(w.yaw, _qLevel);
        const slot = slotById.get(path.kind === "launch" ? c.from : c.to);
        yawQuat(slot ? slot.yaw : w.yaw, _qSlot);
        _qRest.copy(_qLevel).slerp(_qSlot, w.slot / (w.level + w.slot));
        _q.slerp(_qRest, Math.min(1, w.level + w.slot));
      }
      c.position.copy(_p);
      c.quaternion.copy(_q);
      // state transitions along an arrival
      if (c.state === "arriving" || c.state === "docking") {
        if (path.keys.hover && s >= path.keys.hover[1] && c.state !== "docking") c.state = "docking";
        if (!c.arrived && path.keys.shaft && s >= path.keys.shaft) {
          c.arrived = true;
          hooks.landingGear(c, true);
          emit("arrive", c);
        }
      }
      if (c.state === "launching" && path.keys.clear && s >= path.keys.clear && !c.cleared) {
        c.cleared = true;
        hooks.landingGear(c, false);
      }
      return true;
    };

    const poseStatic = (c) => {
      if (c.type === "shuttle") {
        const p = c.pad || pad;
        c.position.set(p.pos[0], p.pos[1] + SHUTTLE_SPEC.standHeight, p.pos[2]);
        yawQuat(p.yaw || 0, c.quaternion);
        return;
      }
      if (c.state === "maintenance") {
        const p = c.pad || cradles[0];
        c.position.set(p.pos[0], p.pos[1], p.pos[2]);
        yawQuat(p.yaw || 0, c.quaternion);
        return;
      }
      const slot = slotById.get(c.to);
      if (slot) {
        c.position.set(slot.pos[0], slot.pos[1], slot.pos[2]);
        yawQuat(slot.yaw || 0, c.quaternion);
      }
    };

    const writeInstance = (c) => {
      _m.compose(c.position, c.quaternion, _s1);
      if (c.type === "shuttle") {
        shuttles.setMatrixAt(c.inst, _m);
        foldAttr.setX(c.inst, c.fold);
      } else fighters.setMatrixAt(c.inst, _m);
    };

    // ---- per-frame effects --------------------------------------------------------------------------
    const flicker = (t, phase, rate) => {
      const a = Math.sin(t * rate + phase) * Math.sin(t * rate * 0.37 + phase * 1.7);
      return a > -0.15 ? 1 : 0.25;
    };

    const tick = (t, dt = 0) => {
      if (t < lastT - 1e-6) reset();
      advanceTo(t);
      lastT = t;

      let shaftCraft = null;
      let shaftStr = 0;
      let lightCraft = null; // hangar mover that carries the landing-light cone (the shaft craft wins)
      glow.begin();
      beacons.begin();
      for (const c of crafts.values()) {
        const moving = MOVING.has(c.state);
        if (c.controller) {
          try {
            c.controller(dt, c);
          } catch (e) {
            console.error("[traffic] controller error", e);
          }
        } else if (moving && c.pathId) {
          hooks.flightControl(c, dt, t);
          if (!posePath(c, t)) poseStatic(c);
        } else poseStatic(c);
        if (c.type === "shuttle") c.fold = c.state === "racked" ? SHUTTLE_SPEC.parkedFold : c.fold;
        writeInstance(c);

        // tractor beam target: the (first) craft inside the shaft column
        if (moving) {
          const str = shaftStrength(c.position);
          if (str > shaftStr) {
            shaftStr = str;
            shaftCraft = c;
          }
        }
        // engine glow: movers only, brighter with speed and acceleration
        if (moving) {
          const offs = c.type === "shuttle" ? SHUTTLE_ENGINE_OFFSETS : ENGINE_OFFSETS;
          // idle 1.2, +0.8 with speed, +1.6 while accelerating; the fighter quad (2.6 m) is narrow enough that the
          // two nozzles (1.44 m apart) stay two hot centres when seen head-on
          const thr = 1.2 + 0.8 * THREE.MathUtils.clamp(c.speed / 160, 0, 1) + 1.6 * THREE.MathUtils.clamp(c.accel / 12, 0, 1);
          for (const o of offs) {
            _p.copy(o).applyQuaternion(c.quaternion).add(c.position);
            glow.add(_p, c.type === "shuttle" ? 3.6 : 2.6, GLOW_COLOUR, thr);
          }
        }
        // hangar movers inside the hall and away from their slot: a soft hold glow under a level, slow craft
        // (it reads as held in the air rather than pasted on the wall) and the landing-light cone on the
        // first of them
        if (HANGAR_MOVING.has(c.state) && c.position.y > -86 && c.pathId) {
          const keys = paths.get(c.pathId)?.keys || {};
          const free = c.state === "launching" ? c.s > (keys.unclamp ?? 0) && c.s < (keys.shaft ?? 1) : c.s > (keys.shaft ?? 0) && c.s < (keys.settle ?? 1);
          if (free) {
            _f.set(0, 0, -1).applyQuaternion(c.quaternion);
            const level = 1 - THREE.MathUtils.smoothstep(Math.abs(_f.y), 0.3, 0.7);
            const slow = 1 - THREE.MathUtils.smoothstep(c.speed, 2, 10);
            const hold = level * slow;
            if (hold > 0.02) {
              _p.copy(c.position);
              _p.y -= 4.6;
              glow.add(_p, 7.0, HOLD_COLOUR, 0.32 * hold * (0.9 + 0.1 * Math.sin(t * 6 + c.phase)));
            }
            if (!lightCraft) lightCraft = c;
          }
        }
        // beacons: nav lights (red port / green starboard), landing light on hangar movers, fin beacon on shuttles
        if (c.type === "shuttle") {
          const blink = Math.sin(t * 2.2 + c.phase) > 0.75 ? 1 : 0.12;
          _p.copy(FIN_BEACON).applyQuaternion(c.quaternion).add(c.position);
          beacons.add(_p, 3.2 * blink, 0.35 * blink, 0.25 * blink, 0.55);
        } else {
          const standby = c.state === "racked" || c.state === "maintenance";
          const nav = standby ? (Math.sin(t * 1.4 + c.phase) > 0.88 ? 1.6 : 0.18) : 1.3;
          _p.copy(NAV_PORT).applyQuaternion(c.quaternion).add(c.position);
          beacons.add(_p, 2.6 * nav, 0.25 * nav, 0.2 * nav, 0.42);
          _p.copy(NAV_STBD).applyQuaternion(c.quaternion).add(c.position);
          beacons.add(_p, 0.25 * nav, 2.4 * nav, 0.5 * nav, 0.42);
          if (c.state === "arriving" || c.state === "docking" || c.state === "launching") {
            // landing lamp: warm hot centre over the chin lens, peak 1.3 (just past the bloom threshold, never a
            // flat clipped disc), dropping to 30 % on the flicker's off beats
            const f = flicker(t, c.phase, 21) === 1 ? 1.0 : 0.3;
            _p.copy(LANDING).applyQuaternion(c.quaternion).add(c.position);
            beacons.add(_p, 1.3 * f, 1.15 * f, 0.9 * f, 0.5);
          }
        }
      }
      fighters.instanceMatrix.needsUpdate = true;
      shuttles.instanceMatrix.needsUpdate = true;
      foldAttr.needsUpdate = true;

      // emitter glow points + beam
      for (const e of emitters) {
        _p.set(e[0], e[1], e[2]);
        const k = 0.25 + 2.2 * shaftStr * (0.85 + 0.15 * Math.sin(t * 5.5));
        beacons.add(_p, 0.45 * k, 0.7 * k, 1.0 * k, 0.9);
      }
      beams.update(t, shaftCraft ? shaftCraft.position : null, shaftStr);
      // landing-light cone: forward-and-down from the belly lamp of the shaft craft (or the first hangar mover)
      const lc = shaftStr > 0.05 ? shaftCraft : lightCraft;
      if (lc) {
        _p.copy(LANDING).applyQuaternion(lc.quaternion).add(lc.position);
        _f.copy(LANDING_DIR).applyQuaternion(lc.quaternion);
        beams.setLight(_p, _f, LANDING_LEN, 1);
      } else beams.setLight(null, null, 0, 0);
      const li = ctx.lights.indexOf(beamLight);
      if (shaftStr > 0.05) {
        beamLight.pos[0] = shaftCraft.position.x;
        beamLight.pos[1] = shaftCraft.position.y;
        beamLight.pos[2] = shaftCraft.position.z;
        beamLight.intensity = 60 * shaftStr;
        if (li < 0) ctx.lights.push(beamLight);
      } else if (li >= 0) ctx.lights.splice(li, 1);
      glow.end();
      beacons.end();

      // rack clamps: closed on settled fighters, folded flat under the beam at empty slots, animating over
      // the settle window of an arrival / the unclamp window of a launch
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        let a = slot.fighterId ? 1 : 0;
        for (const f of schedule.flights) {
          if (f.ended || !f.started || f.slotId !== slot.id) continue;
          const s = (t - f.t0) / f.duration;
          const keys = paths.get(f.pathId)?.keys || {};
          if (f.kind === "arrival") a = Math.max(a, THREE.MathUtils.smoothstep(s, keys.settle ?? 0.96, 1));
          else a = Math.max(a, 1 - THREE.MathUtils.smoothstep(s, 0, keys.unclamp ?? 0.05));
        }
        clampAmounts[i] = a;
      }
      clamps.update(clampAmounts);
    };

    // ---- API ---------------------------------------------------------------------------------------
    const api = {
      /** @returns {string|null} id of the new craft */
      spawn({ type = "fighter", path = null, duration = null, id = null } = {}) {
        let p = null;
        if (typeof path === "string") p = paths.get(path);
        else if (Array.isArray(path) && path.length >= 2) p = paths.custom(path, duration);
        if (!p) throw new Error("[traffic] spawn: path must be a known path id or an array of >= 2 points");
        const c = new Craft(id || `spawn-${spawnCount++}`, type === "shuttle" ? "shuttle" : "fighter");
        c.external = true;
        c.pathId = p.id;
        c.t0 = lastT === -Infinity ? 0 : lastT;
        c.duration = duration || p.duration;
        c.fold = 0;
        if (p.kind === "arrival") {
          c.state = "arriving";
          c.from = "space";
          c.to = p.id.split(":")[1];
        } else if (p.kind === "launch") {
          c.state = "launching";
          c.from = p.id.split(":")[1];
          c.to = "space";
        } else {
          c.state = "patrol";
        }
        if (!addCraft(c)) return null;
        posePath(c, c.t0);
        writeInstance(c);
        return c.id;
      },
      /** plain state of every craft, sorted by id (stable across serialize()/apply()) */
      list() {
        return [...crafts.values()].sort(byId).map((c) => c.plain());
      },
      get(id) {
        const c = crafts.get(id);
        return c ? c.plain() : null;
      },
      /** fn(dt, fighter) writes fighter.position / fighter.quaternion; pass null to return to the script */
      setController(id, fn) {
        const c = crafts.get(id);
        if (!c) return false;
        c.controller = typeof fn === "function" ? fn : null;
        return true;
      },
      on(name, cb) {
        const set = listeners.get(name);
        if (!set) throw new Error("[traffic] unknown event " + name);
        set.add(cb);
        return () => set.delete(cb);
      },
      off(name, cb) {
        const set = listeners.get(name);
        if (set) set.delete(cb);
      },
      setSchedule(opts = {}) {
        schedule.setRates(opts, lastT === -Infinity ? 0 : lastT);
        return api.getSchedule();
      },
      getSchedule() {
        return {
          arrivalsPerMinute: schedule.rates.arrivalsPerMinute,
          launchesPerMinute: schedule.rates.launchesPerMinute,
          maxHangarMovers: schedule.maxHangarMovers,
          maxHangarFighters: schedule.maxHangarFighters,
        };
      },
      serialize() {
        const list = [...crafts.values()].sort(byId);
        const customPaths = {};
        for (const c of list) {
          if (c.pathId && c.pathId.startsWith("custom:")) {
            const p = paths.get(c.pathId);
            if (p) customPaths[c.pathId] = { points: p.curve.points.map((v) => [v.x, v.y, v.z]), duration: p.duration };
          }
        }
        return {
          version: 1,
          seed,
          time: Number.isFinite(lastT) ? lastT : 0,
          schedule: schedule.serialize(),
          fighters: list.map((c) => ({
            id: c.id,
            type: c.type,
            state: c.state,
            pathId: c.pathId,
            t0: c.t0,
            duration: c.duration,
            from: c.from,
            to: c.to,
            external: c.external,
            fold: c.type === "shuttle" ? c.fold : undefined,
            arrived: c.arrived || undefined,
            cleared: c.cleared || undefined,
            offset: c.offset ? c.offset.slice() : undefined,
          })),
          paths: customPaths,
          spawnCount,
        };
      },
      apply(state) {
        if (!state || !Array.isArray(state.fighters)) throw new Error("[traffic] apply: bad state");
        clearCrafts();
        schedule.apply(state.schedule);
        spawnCount = state.spawnCount || 0;
        for (const [pid, p] of Object.entries(state.paths || {})) {
          const path = paths.custom(p.points, p.duration);
          paths.cache.delete(path.id);
          path.id = pid;
          paths.cache.set(pid, path);
          paths.customCount = Math.max(paths.customCount, (parseInt(pid.split(":")[1], 10) || 0) + 1);
        }
        for (const f of state.fighters) {
          const c = new Craft(f.id, f.type === "shuttle" ? "shuttle" : "fighter");
          c.state = f.state;
          c.pathId = f.pathId || null;
          c.t0 = f.t0 || 0;
          c.duration = f.duration || 0;
          c.from = f.from ?? null;
          c.to = f.to ?? null;
          c.external = !!f.external;
          c.arrived = !!f.arrived;
          c.cleared = !!f.cleared;
          c.offset = Array.isArray(f.offset) && f.offset.length === 2 ? [+f.offset[0], +f.offset[1]] : null;
          if (c.type === "shuttle") {
            c.fold = f.fold ?? SHUTTLE_SPEC.parkedFold;
            c.pad = pad;
          }
          if (c.state === "maintenance") c.pad = cradles[parseInt(String(c.to).split("-")[1], 10) || 0] || cradles[0];
          if (!addCraft(c)) continue;
          if (c.state === "racked" && c.type === "fighter") {
            const slot = slotById.get(c.to);
            if (slot) setSlotFighter(slot, c);
          }
        }
        for (const fl of schedule.flights) if (fl.started && !fl.ended) {
          const c = crafts.get(fl.fighterId);
          if (c) c.flight = fl;
        }
        // re-pose everything at the saved time without triggering the backward-jump reset
        lastT = -Infinity;
        tick(Number.isFinite(state.time) ? state.time : 0, 0);
        return true;
      },
      /** plain copies of the rack slots (id, pos, yaw, occupied) for tooling */
      slots() {
        return slots.map((s) => ({ id: s.id, pos: s.pos.slice(), yaw: s.yaw, tier: s.tier, side: s.side, occupied: !!s.fighterId, fighterId: s.fighterId }));
      },
      stats() {
        let movers = 0;
        let inShaft = 0;
        for (const c of crafts.values()) {
          if (MOVING.has(c.state)) movers++;
          if (insideShaft(c.position)) inShaft++;
        }
        const triangles = fighters.count * fighterGeo.userData.tris + shuttles.count * shuttleGeo.userData.tris + clamps.mesh.count * clampGeo.userData.tris + (beams.mesh.visible ? beams.tris : 0) + glow.mesh.count * 2;
        return {
          crafts: crafts.size,
          movers,
          inShaft,
          fighterInstances: fighters.count,
          maxFighterInstances,
          shuttleInstances: shuttles.count,
          time: lastT,
          fighterTris: fighterGeo.userData.tris,
          shuttleTris: shuttleGeo.userData.tris,
          clampTris: clampGeo.userData.tris,
          triangles,
          drawCalls: [fighters, shuttles, beams.mesh, glow.mesh, beacons.points, clamps.mesh].filter((o) => o.visible && (o.count === undefined || o.count > 0)).length,
        };
      },
      hooks,
      MAX_MOVERS,
    };

    populate();
    schedule.reset();
    tick(typeof ctx.time === "function" ? ctx.time() : 0, 0);
    log(
      `fighter ${fighterGeo.userData.tris} tris, shuttle ${shuttleGeo.userData.tris} tris, clamp ${clampGeo.userData.tris} tris; ${crafts.size} craft, ` +
        `${fighters.count} fighter instances (cap ${maxFighterInstances} for ${TRI_BUDGET} tris), hangar cap ${maxHangarFighters}`,
    );

    return {
      update(dt, t) {
        tick(t, dt);
      },
      dispose() {
        fighterGeo.dispose();
        shuttleGeo.dispose();
        clampGeo.dispose();
        beams.mesh.geometry.dispose();
        glow.mesh.geometry.dispose();
        beacons.points.geometry.dispose();
      },
      api,
    };
  },
};
