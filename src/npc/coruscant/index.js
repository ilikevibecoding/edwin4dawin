// CoruscantPopulation: the city life manager (rubric 07 rows 3-12). It owns the deterministic pool (census.js), keeps
// at most MAX_LIVE citizens alive around the player (spawn within SPAWN_R, despawn beyond DESPAWN_R), runs their
// schedules (home -> work -> meal -> work -> leisure -> home on the sky clock), plans real routes through doors,
// lifts and boulevards (planner.js / nav.js), plays working animations (jobs.js) through the instanced crowd
// renderer (crowd.js), and talks (dialog/, bubbles.js, talk.js). Registered on `game.vehicles` for its tick/update
// (the engine's generic per-tick list), and wrapped around game.npcs for raycast/talk/poke/collision/disasters, so
// game.js is untouched. Client-side ambience only: nothing here touches the simulation or the protocol.
import { buildPool, activityAt } from './census.js';
import { LotCache } from './lots.js';
import { CityNav, PathQueue, findStand } from './nav.js';
import { CrowdRenderer, MODE } from './crowd.js';
import { Citizen, WALK_SPEED } from './citizen.js';
import { Planner, LIFT_WAIT, PORT } from './planner.js';
import { poseAt, jobErrand, sparks, isWelder, isGuard } from './jobs.js';
import { Bubbles } from './bubbles.js';
import { TalkBox } from './talk.js';
import { ambientLine, greetLine, directionsLine, priceLine, workLine, jobLine } from '../dialog/dialog.js';
import { RNG } from '../../rng.js';
import { standHeight } from '../pathfinding.js';
import * as THREE from 'three';

const TICK = 0.05;
const _dir = new THREE.Vector3();
export const SPAWN_R = 96, DESPAWN_R = 128, MAX_LIVE = 150;
const SPAWN_PER_CYCLE = 10, CYCLE_TICKS = 10;
const INDOOR_PENALTY = 40, INDOOR_MARGIN = 24, INDOOR_MAX = 20, OWN_LOT_MAX = 110;   // see spawnCycle
const RECYCLE_AGE = 160, RECYCLE_PER_CYCLE = 4;                    // out-of-sight recycling: min age (ticks), rate
const SKIP_TICKS = 200;                                            // 10 s before retrying someone who could not be placed
const RUN_SPEED = 4.2;
const HOP_S = 0.6, HOP_H = 1.05;                                   // the kerb hop: seconds, rise (clears the railing)
const LEG_NODES = { street: 1600, lot: 4000, door: 900, spot: 3000 };
const CIVIC = new Set(['senate', 'financial']);
const VENDOR_JOBS = new Set(['vendor', 'shopkeeper', 'tailor', 'pharmacist', 'bartender', 'barista', 'server', 'cook', 'broker']);

export class CoruscantPopulation {
  constructor(game, layout) {
    this.game = game; this.layout = layout; this.world = game.world; this.scene = game.scene;
    this.pool = buildPool(layout);
    this.people = this.pool.people;
    this.lots = new LotCache(layout, 96);
    this.nav = new CityNav(layout);
    this.paths = new PathQueue(game.world, 1.5);
    this.crowd = new CrowdRenderer(game.scene, { humanoids: MAX_LIVE + 10, astromechs: 24, sweepers: 24 });
    this.bubbles = new Bubbles(game.scene);
    this.planner = new Planner(this);
    this.talkBox = new TalkBox(game, this);
    this.live = [];
    this.liveByPerson = new Map();
    this.occupied = new Map();     // port spot keys -> citizen id (lot spots are tracked by LotInfo)
    this.skip = new Map();         // person id -> tick before which spawning is not retried
    this.view = { x: 0, y: 0, z: 1 };   // camera forward at the last spawn cycle: big halls seat their crowd in view
    this.rng = new RNG(0xc0c0);
    this.hour = 12; this.tickCount = 0; this.time = 0; this.enabled = true;
    this.stats = { spawned: 0, despawned: 0, trips: 0, tripsFailed: 0, legs: 0, legsFailed: 0, legsFailedBy: {}, retargets: 0, stuck: 0, lifts: 0, bubbles: 0, talks: 0, unloadedWaits: 0, unplaceable: 0, errands: 0, arrivals: 0, recycled: 0 };
    this.disaster = null; this.watching = false;
    this.lastBubbleAt = -10; this.lastChatAt = -10;
    this.playerCtx = { vandalT: 0, bumpT: 0 };
    this.onTrade = null;           // (npc, purpose) => void - the economy builder hooks this (or population.on('trade', fn))
    this.listeners = {};
    this.lotCentres = layout.lots.map((l) => ({ x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1 }));
    this.frame = 0; this.sparkT = 0;
    this.installHooks();
    console.log(`[coruscant] population: ${this.people.length} citizens in ${this.pool.stats.lots} lots (${this.pool.stats.street} street, ${this.pool.stats.droids} droids)`);
  }

  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  emit(ev, ...args) { for (const fn of this.listeners[ev] || []) { try { fn(...args); } catch (e) { console.error('[coruscant] listener', e); } } if (ev === 'trade' && this.onTrade) this.onTrade(...args); if (this.game.events && typeof this.game.events.emit === 'function') this.game.events.emit('npc:' + ev, ...args); }

  // ---------------------------------------------------------------------------------------- engine hooks
  // Wrap game.npcs so the existing interaction path (crosshair raycast, right-click talk, left-click poke, player
  // collision, disaster alerts) reaches the crowd without a game.js change. Town NPC behaviour is unchanged.
  installHooks() {
    const mgr = this.game.npcs;
    if (!mgr || mgr._coruscantHooked) return;
    mgr._coruscantHooked = true;
    const o = { raycast: mgr.raycast.bind(mgr), talk: mgr.talk.bind(mgr), poke: mgr.poke.bind(mgr), collectBoxes: mgr.collectBoxes.bind(mgr), onWorldChanged: mgr.onWorldChanged.bind(mgr), alert: mgr.alert.bind(mgr), watch: mgr.watch.bind(mgr), clearAlert: mgr.clearAlert.bind(mgr), clearWatch: mgr.clearWatch.bind(mgr) };
    mgr.raycast = (origin, dir, maxDist) => { const a = o.raycast(origin, dir, maxDist); const b = this.raycast(origin, dir, a ? a.dist : maxDist); return b && (!a || b.dist < a.dist) ? b : a; };
    mgr.talk = (npc, game) => (npc && npc.city ? this.talk(npc) : o.talk(npc, game));
    mgr.poke = (npc, game) => (npc && npc.city ? this.poke(npc) : o.poke(npc, game));
    mgr.collectBoxes = (out, x, z) => { o.collectBoxes(out, x, z); this.npcBoxes(out, x, z); };
    mgr.onWorldChanged = (x, y, z) => { o.onWorldChanged(x, y, z); this.onWorldChanged(x, y, z); };
    mgr.alert = (info) => { o.alert(info); this.alert(info); };
    mgr.watch = (point, opts) => { o.watch(point, opts); this.watching = true; };
    mgr.clearWatch = () => { o.clearWatch(); this.watching = false; };
    mgr.clearAlert = () => { o.clearAlert(); this.clearAlert(); };
  }

  // ---------------------------------------------------------------------------------------- spawning
  get player() { return this.game.player; }
  nearPlateau(p) { const P = this.layout.plateau; return p.x > P.x0 - 160 && p.x < P.x1 + 160 && p.z > P.z0 - 160 && p.z < P.z1 + 160; }
  // distance from p to the place where the person is doing `a`
  placeDist(a, p) {
    if (a.lot === PORT) { const dx = Math.max(2576 - p.x, 0, p.x - 2716), dz = Math.max(-176 - p.z, 0, p.z - 176); return Math.hypot(dx, dz); }
    const r = a.lot != null ? this.lotCentres[a.lot] : null;
    if (!r) return Infinity;
    const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1), dz = Math.max(r.z0 - p.z, 0, p.z - r.z1);
    return Math.hypot(dx, dz);
  }

  // lot the player stands in (null on the streets / plazas / port)
  playerLot(p) {
    for (const l of this.layout.lots) if (l.kind !== 'plaza' && p.x >= l.x0 && p.x < l.x1 && p.z >= l.z0 && p.z < l.z1) return l.id;
    return null;
  }
  spawnCycle() {
    const p = this.player.pos;
    if (this.game.camera && this.game.camera.getWorldDirection) { const v = this.game.camera.getWorldDirection(_dir); this.view.x = v.x; this.view.y = v.y; this.view.z = v.z; }
    // despawn: far away, stuck for too long, or the player left the city
    const leave = !this.nearPlateau(p);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const n = this.live[i];
      const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
      if (leave || d > DESPAWN_R || n.stuckT > 45 || n.waitT > 25) { if (n.stuckT > 45) this.stats.stuck++; this.despawn(n); }
    }
    if (leave || this.live.length >= MAX_LIVE || !this.enabled) return;
    // Candidates by distance to where they are right now. People inside buildings other than the player's own are
    // pushed back (INDOOR_PENALTY) and capped, so the live budget goes to the streets and plazas the player can see
    // (rubric row 4: >= 120 visible) while the building the player enters still fills with its staff.
    const lotAt = this.playerLot(p);
    if (lotAt != null) { const li = this.lots.get(lotAt); if (li) this.staffFloor(li, p.y); }
    // on a landmark's own street (the undercity strip's main street, a forecourt) the player is outdoors
    const inLot = lotAt != null && !this.nav.walkable(this.nav.levelAt(p.x, p.y, p.z), p.x, p.z) ? lotAt : null;
    const cands = [];
    let indoorLive = 0, ownLive = 0;
    for (const n of this.live) { if (n.lot == null) continue; if (n.lot === inLot) ownLive++; else indoorLive++; }
    const indoorMax = inLot != null ? INDOOR_MAX / 3 : INDOOR_MAX;
    // The indoor cap only limits spawns: people spawned on the street walk into other buildings (lunch in the
    // restaurant across the plaza) and stay there out of sight. When the live budget is nearly spent, those beyond the
    // cap who have arrived and sat down give their slot back to the street the player is looking at (farthest first,
    // a few per cycle); the schedule puts them back the next time the player comes near. Nobody vanishes in view.
    if (this.live.length >= MAX_LIVE - SPAWN_PER_CYCLE && indoorLive > indoorMax) {
      const unseen = [];
      for (const n of this.live) if (n.lot != null && n.lot !== inLot && n.state === 'at' && this.tickCount - n.spawnedAt > RECYCLE_AGE) unseen.push(n);
      unseen.sort((a, b) => (b.pos.x - p.x) ** 2 + (b.pos.z - p.z) ** 2 - (a.pos.x - p.x) ** 2 - (a.pos.z - p.z) ** 2);
      for (let i = 0; i < unseen.length && i < RECYCLE_PER_CYCLE && indoorLive > indoorMax; i++) { this.despawn(unseen[i]); indoorLive--; this.stats.recycled++; }
    }
    for (const person of this.people) {
      if (this.liveByPerson.has(person.id)) continue;
      const skip = this.skip.get(person.id);
      if (skip !== undefined) { if (skip > this.tickCount) continue; this.skip.delete(person.id); }
      const a = activityAt(person, this.hour);
      const d = this.placeDist(a, p);
      if (d > SPAWN_R) continue;
      const own = inLot != null && a.lot === inLot && this.isIndoor(person, a);
      const indoor = !own && this.isIndoor(person, a);
      if (indoor && d > SPAWN_R - INDOOR_MARGIN) continue;
      cands.push([indoor ? d + INDOOR_PENALTY : d, person, a, indoor, own]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    let n = 0;
    for (const [, person, a, indoor, own] of cands) {
      if (n >= SPAWN_PER_CYCLE || this.live.length >= MAX_LIVE) break;
      if (indoor && indoorLive >= indoorMax) continue;
      if (own && ownLive >= OWN_LOT_MAX) continue;
      if (this.spawn(person, a)) { n++; if (indoor) indoorLive++; if (own) ownLive++; }
    }
  }
  // The rooms on the floor the player stands on get their own occupants (census.staffRoom, rubric row 3) the first
  // time the player is there; they join the pool for good and spawn like everyone else.
  staffFloor(li, y) {
    for (const [i, room] of li.roomsAtHeight(y)) {
      if (this.pool.staffed.has(li.id + ':' + i)) continue;
      const added = this.pool.staffRoom(li.lot, room, i, li.roomSeats(room).length, li.roomBeds(room), li.roomWork(room));
      this.stats.roomStaff = (this.stats.roomStaff || 0) + added.length;
    }
  }
  // does activity `a` of `person` happen inside a building (as opposed to a street, plaza or spaceport spot)?
  isIndoor(person, a) {
    if (a.lot == null || a.lot === PORT) return false;
    if (person.street && a.act === 'work') return false;
    const l = this.layout.lots[a.lot];
    return !!l && l.kind !== 'plaza';
  }

  spawn(person, a) {
    const npc = new Citizen(person);
    npc.pop = this;
    npc.act = a.act; npc.actLot = a.lot;
    const rng = () => this.rng.next();
    const p = this.player.pos;
    const spot = this.planner.resolveSpot(npc, a.act, a.lot, rng, { x: p.x, y: p.y, z: p.z, r: SPAWN_R - 4, fx: this.view.x, fy: this.view.y, fz: this.view.z });
    if (!spot) { this.skip.set(person.id, this.tickCount + SKIP_TICKS); return false; }
    // street spots are picked around the post, which may itself be near the edge of the ring: never spawn someone
    // who would be despawned by the next cycle
    if (Math.hypot(spot.x - p.x, spot.z - p.z) > SPAWN_R + 8) { this.skip.set(person.id, this.tickCount + SKIP_TICKS); return false; }
    // people whose activity changed a moment ago are still on their way: put them at the previous place and let them
    // walk, so the streets carry real commuter traffic (only when that place is loaded and not too far)
    let from = null;
    const prev = activityAt(person, this.hour - 0.7);
    if ((prev.act !== a.act || prev.lot !== a.lot) && this.placeDist(prev, p) < 110) {
      const ps = this.planner.resolveSpot(npc, prev.act, prev.lot, rng, { x: p.x, y: p.y, z: p.z, r: DESPAWN_R - 16, fx: this.view.x, fy: this.view.y, fz: this.view.z });
      if (ps && this.world.isLoaded(ps.x, ps.z) && Math.hypot(ps.x - p.x, ps.z - p.z) < DESPAWN_R - 16) from = ps;
    }
    const start = from || spot;
    const place = this.placeable(start);
    if (!place) {
      // a loaded cell nobody can stand in: block the spot so the next person picks another one
      if (this.world.isLoaded(start.x, start.z)) { this.stats.unplaceable++; this.blockSpot(start); this.skip.set(person.id, this.tickCount + 20); }
      else this.skip.set(person.id, this.tickCount + 40);
      return false;
    }
    const slot = this.crowd.alloc(this.crowd.bodyFor(person.archetype));
    if (!slot) return false;
    npc.slot = slot;
    npc.skin = this.crowd.skinIndex(person.archetype, person.variant, person.female);
    npc.setPos(place.x + 0.5, place.h, place.z + 0.5);
    npc.yaw = npc.targetYaw = (from || spot).yaw ?? this.rng.range(0, Math.PI * 2);
    npc.spawnedAt = this.tickCount;
    this.live.push(npc);
    this.liveByPerson.set(person.id, npc);
    this.stats.spawned++;
    const startAt = from || spot;
    npc.lot = startAt.lot ?? null;
    npc.level = startAt.level && startAt.level !== 'lot' ? startAt.level : this.nav.levelAt(npc.pos.x, npc.pos.y, npc.pos.z);
    npc.spot = spot;
    this.occupy(spot, npc);
    if (from) this.beginTrip(npc, spot);
    else this.arrive(npc, spot);
    return true;
  }
  // standable feet cell at/near a spot in the live world, or null (also null when the chunk is not loaded)
  placeable(spot) {
    if (!this.world.isLoaded(spot.x, spot.z)) return null;
    const s = findStand(this.world, spot.x, spot.y, spot.z, 2);
    if (s) return s;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const t = findStand(this.world, spot.x + dx, spot.y, spot.z + dz, 2); if (t) return t; }
    return null;
  }
  despawn(npc) {
    npc.dead = true;
    this.paths.cancel(npc);
    this.vacate(npc.spot, npc);
    if (npc.slot) this.crowd.release(npc.slot);
    const i = this.live.indexOf(npc);
    if (i >= 0) this.live.splice(i, 1);
    this.liveByPerson.delete(npc.person.id);
    if (this.talkBox.npc === npc) this.talkBox.close();
    this.stats.despawned++;
  }
  occupy(spot, npc) { if (!spot) return; if (spot.lot != null) { const li = this.lots.peek(spot.lot); if (li) li.occupy(spot, npc.id); } else if (spot.key) this.occupied.set(spot.key, npc.id); }
  blockSpot(spot) { if (!spot || !spot.key) return; if (spot.lot != null) { const li = this.lots.peek(spot.lot); if (li) li.block(spot); } else this.occupied.set(spot.key, -2); }
  vacate(spot, npc) { if (!spot) return; if (spot.lot != null) { const li = this.lots.peek(spot.lot); if (li) li.vacate(spot, npc.id); } else if (spot.key && this.occupied.get(spot.key) === npc.id) this.occupied.delete(spot.key); }
  idleCount(x, z, r) { let n = 0; const r2 = r * r; for (const c of this.live) if (c.state === 'at' && (c.pos.x - x) ** 2 + (c.pos.z - z) ** 2 <= r2) n++; return n; }

  // ---------------------------------------------------------------------------------------- schedule / trips
  setActivity(npc, a) {
    npc.act = a.act; npc.actLot = a.lot;
    this.retarget(npc, 0);
  }
  // Choose a spot for the current activity (an alternative after `attempt` failures) and start the trip there.
  retarget(npc, attempt) {
    const rng = () => this.rng.next();
    const p = this.player.pos, within = { x: p.x, y: p.y, z: p.z, r: DESPAWN_R - 16, fx: this.view.x, fy: this.view.y, fz: this.view.z };
    this.vacate(npc.spot, npc);
    let spot = attempt === 0 ? this.planner.resolveSpot(npc, npc.act, npc.actLot, rng, within) : null;
    if (!spot) {
      // fall back to the street outside (or the plaza) so nobody stands frozen
      spot = this.planner.resolveSpot(npc, 'leisure', npc.person.plaza ?? null, rng, within) || this.planner.streetSpot(npc, npc.act, rng, null, within);
      if (attempt > 0) this.stats.retargets++;
    }
    if (!spot) { npc.spot = null; this.settle(npc, 12); return; }
    npc.spot = spot;
    this.occupy(spot, npc);
    this.beginTrip(npc, spot);
  }
  beginTrip(npc, spot) {
    this.paths.cancel(npc);
    npc.path = null; npc.errand = null; npc.legFails = 0; npc.pathFails = 0;
    const legs = this.planner.planTrip(npc, spot);
    this.stats.trips++;
    if (!legs) { this.stats.tripsFailed++; npc.tripFails = (npc.tripFails || 0) + 1; if (npc.tripFails < 3) this.retarget(npc, npc.tripFails); else { npc.tripFails = 0; this.settle(npc, 20); } return; }
    npc.tripFails = 0;
    npc.legs = legs; npc.legIdx = 0;
    npc.sitting = false; npc.lying = false; npc.hidden = false;
    this.startLeg(npc);
  }
  // stay where we are for a while (pose for the current activity), then try again
  settle(npc, seconds) { npc.legs = null; npc.path = null; npc.state = 'at'; npc.timer = seconds; this.applyPose(npc, npc.spot); }

  startLeg(npc) {
    const leg = npc.legs && npc.legs[npc.legIdx];
    if (!leg) { npc.legs = null; npc.state = 'idle'; return; }
    if (leg.kind === 'arrive') { this.arrive(npc, npc.spot); return; }
    if (leg.kind === 'lift') {
      npc.state = 'lift'; npc.timer = LIFT_WAIT; npc.hidden = true; npc.mode = MODE.WAITING; this.stats.lifts++;
      return;
    }
    if (leg.kind === 'hop') {
      // jump the plaza kerb railing: a short arc from where we stand to the cell beyond the kerb (never more than a
      // few blocks - the walk leg before it brought us to the kerb)
      if (!this.world.isLoaded(leg.tx, leg.tz)) { npc.state = 'wait'; npc.timer = 1; npc.waitT = (npc.waitT || 0) + 1; return; }
      const to = this.standNear(leg.tx, leg.ty, leg.tz) || { x: leg.tx, z: leg.tz, h: leg.ty };
      const dx = to.x + 0.5 - npc.pos.x, dz = to.z + 0.5 - npc.pos.z;
      if (dx * dx + dz * dz > 6 * 6) { npc.pathFails++; this.stats.legsFailed++; this.stats.legsFailedBy.hop = (this.stats.legsFailedBy.hop || 0) + 1; if (npc.pathFails >= 3) { npc.pathFails = 0; npc.tripFails = (npc.tripFails || 0) + 1; this.retarget(npc, npc.tripFails); } else this.nextLeg(npc); return; }
      npc.hop = { x0: npc.pos.x, y0: npc.pos.y, z0: npc.pos.z, x1: to.x + 0.5, y1: to.h, z1: to.z + 0.5, t: 0 };
      npc.state = 'hop'; npc.targetYaw = Math.atan2(dx, dz); npc.sitting = false; npc.lying = false; npc.hidden = false;
      npc.mode = MODE.RUN; npc.speed = 3.5; npc.amp = 1.1; npc.animSpeed = 5;
      this.stats.hops = (this.stats.hops || 0) + 1;
      return;
    }
    // walk leg: needs both ends loaded
    if (!this.world.isLoaded(leg.x, leg.z) || !this.world.isLoaded(npc.pos.x, npc.pos.z)) { npc.state = 'wait'; npc.timer = 1; npc.waitT = (npc.waitT || 0) + 1; this.stats.unloadedWaits++; return; }
    npc.waitT = 0;
    const dx = leg.x + 0.5 - npc.pos.x, dz = leg.z + 0.5 - npc.pos.z;
    if (dx * dx + dz * dz < 0.5 && Math.abs(leg.y - npc.pos.y) < 1.5) { this.nextLeg(npc); return; }
    const goal = this.standNear(leg.x, leg.y, leg.z) || leg;
    npc.state = 'wait'; npc.timer = 4; npc.waitingPath = true;
    const pr = (npc.pos.x - this.player.pos.x) ** 2 + (npc.pos.z - this.player.pos.z) ** 2;
    this.stats.legs++;
    this.paths.request(npc, { x: Math.floor(npc.pos.x), y: Math.floor(npc.pos.y + 0.01), z: Math.floor(npc.pos.z) }, goal, LEG_NODES[leg.tag] || 1500, (path) => {
      npc.waitingPath = false;
      if (npc.dead) return;
      if (path) { npc.path = path; npc.pathIdx = 0; npc.state = 'walk'; npc.pathFails = 0; npc.stuckT = 0; npc.lastProgress = { x: npc.pos.x, z: npc.pos.z, t: this.tickCount }; this.applyWalkMode(npc); return; }
      this.stats.legsFailed++;
      this.stats.legsFailedBy[leg.tag] = (this.stats.legsFailedBy[leg.tag] || 0) + 1;
      // the last few failures, for the census script and debugging (from -> to, tag, who)
      const fl = this.stats.failedLegs || (this.stats.failedLegs = []);
      fl.push({ tag: leg.tag, from: [Math.floor(npc.pos.x), Math.floor(npc.pos.y + 0.01), Math.floor(npc.pos.z)], to: [goal.x, goal.y, goal.z], lot: npc.lot, level: npc.level, act: npc.act, job: npc.person.job, nodes: LEG_NODES[leg.tag] || 1500 });
      if (fl.length > 12) fl.shift();
      npc.pathFails++;
      if (npc.pathFails >= 3) { npc.pathFails = 0; npc.tripFails = (npc.tripFails || 0) + 1; this.retarget(npc, npc.tripFails); }
      else { npc.state = 'wait'; npc.timer = 0.8 + this.rng.next(); }
    }, pr);
  }
  standNear(x, y, z) {
    const s = findStand(this.world, x, y, z, 2);
    if (s) return s;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const t = findStand(this.world, x + dx, y, z + dz, 2); if (t) return t; }
    return null;
  }
  nextLeg(npc) { npc.legIdx++; npc.path = null; this.startLeg(npc); }
  applyWalkMode(npc) {
    const p = npc.person;
    npc.sitting = false; npc.lying = false;
    if (npc.panic) { npc.mode = MODE.RUN; npc.speed = RUN_SPEED; npc.amp = 1.2; }
    else if (p.droid && p.archetype !== 'protocol droid') { npc.mode = p.job === 'sweeper droid' || p.job === 'maintenance droid' ? MODE.SWEEPING : MODE.ROLL; npc.speed = p.job === 'sweeper droid' ? 1.15 : 1.8; npc.amp = 1; }
    else if (npc.errand && npc.errand.mode != null && !npc.errand.back) { npc.mode = npc.errand.mode; npc.speed = 2.0; npc.amp = 0.9; }
    else if (p.job === 'courier') { npc.mode = MODE.WALK; npc.speed = 3.4; npc.amp = 1.15; }
    else if (p.job === 'child') { npc.mode = MODE.RUN; npc.speed = 3.0; npc.amp = 0.9; }
    else if (p.job === 'jedi' || p.job === 'senator' || p.job === 'acolyte') { npc.mode = MODE.WALK; npc.speed = 2.0; npc.amp = 0.8; }
    else { npc.mode = MODE.WALK; npc.speed = WALK_SPEED * (0.9 + (p.key % 100) / 500); npc.amp = 1; }
    npc.animSpeed = npc.speed * 1.45;
  }

  arrive(npc, spot) {
    npc.legs = null; npc.path = null; npc.state = 'at'; npc.hidden = false;
    npc.timer = 0.5 + this.rng.next();
    this.stats.arrivals++;
    if (spot) {
      npc.lot = spot.lot ?? null;
      if (spot.level && spot.level !== 'lot') npc.level = spot.level;
      else if (npc.lot == null) npc.level = this.nav.levelAt(npc.pos.x, npc.pos.y, npc.pos.z);
      if (spot.yaw != null) npc.targetYaw = spot.yaw;
    }
    if (npc.errand) { npc.timer = npc.errand.waitS; }
    npc.wanderT = spot && (spot.kind === 'street' || spot.kind === 'plaza') ? 10 + this.rng.next() * 30 : Infinity;
    this.applyPose(npc, spot);
  }
  applyPose(npc, spot) {
    const li = spot && spot.lot != null ? this.lots.peek(spot.lot) : null;
    const pose = poseAt(npc, npc.errand && npc.errand.back === false ? 'work' : npc.act, spot, li, this.hour);
    if (npc.errand && npc.errand.mode === MODE.CARRY && !npc.errand.back) pose.mode = MODE.TENDING;
    npc.mode = pose.mode; npc.sitting = pose.sitting; npc.lying = pose.lying;
    npc.animSpeed = pose.mode === MODE.TYPING ? 3.2 : pose.mode === MODE.SWEEPING ? 2.2 : pose.mode === MODE.DANCING ? 4.5 : pose.mode === MODE.WELDING ? 5 : 1.6;
    npc.amp = 1;
  }

  // ---------------------------------------------------------------------------------------- per tick
  tick() {
    if (!this.enabled) return;
    this.tickCount++;
    const sky = this.game.sky;
    this.hour = ((sky ? sky.time : 0.5) * 24) % 24;
    if (this.tickCount % CYCLE_TICKS === 0) this.spawnCycle();
    this.paths.process();
    const p = this.player.pos;
    if (this.playerCtx.vandalT > 0) this.playerCtx.vandalT -= TICK;
    if (this.playerCtx.bumpT > 0) this.playerCtx.bumpT -= TICK;
    for (let i = 0; i < this.live.length; i++) {
      const n = this.live[i];
      n.prev.x = n.pos.x; n.prev.y = n.pos.y; n.prev.z = n.pos.z;
      if (n.talkCooldown > 0) n.talkCooldown -= TICK;
      switch (n.state) {
        case 'walk': this.stepWalk(n); break;
        case 'lift': n.timer -= TICK; if (n.timer <= 0) this.finishLift(n); break;
        case 'hop': this.stepHop(n); break;
        case 'wait': if (!n.waitingPath) { n.timer -= TICK; if (n.timer <= 0) this.startLeg(n); } else { n.timer -= TICK; if (n.timer <= 0) { n.waitingPath = false; this.paths.cancel(n); n.timer = 1; } } break;
        case 'at': n.timer -= TICK; if (n.timer <= 0) this.think(n); break;
        default: n.timer -= TICK; if (n.timer <= 0) { if (n.legs) this.startLeg(n); else if (n.spot) this.beginTrip(n, n.spot); else this.think(n); } break;
      }
    }
    if (this.tickCount % 4 === 0) this.separate(p);
    if (this.tickCount % CYCLE_TICKS === 5) this.chatter(p);
    if (this.talkBox.npc && (this.talkBox.npc.dead || Math.hypot(this.talkBox.npc.pos.x - p.x, this.talkBox.npc.pos.z - p.z) > 6)) this.talkBox.close();
  }

  // Once a second while parked: schedule changes, wandering, job errands.
  think(npc) {
    npc.timer = 0.9 + this.rng.next() * 0.4;
    if (npc.panic) { if (!this.disaster) { npc.panic = false; } else return; }
    const a = activityAt(npc.person, this.hour);
    if (npc.errand) {
      // errand done: head back to the work spot
      if (npc.errand.back) { npc.errand = null; this.applyPose(npc, npc.spot); return; }
      npc.errand.back = true;
      npc.legs = [{ kind: 'walk', x: npc.spot.x, y: npc.spot.y, z: npc.spot.z, tag: 'spot' }, { kind: 'arrive' }]; npc.legIdx = 0;
      this.startLeg(npc);
      return;
    }
    if (a.act !== npc.act || a.lot !== npc.actLot) { this.setActivity(npc, a); return; }
    if (npc.wanderT !== Infinity) {
      npc.wanderT -= 1;
      if (npc.wanderT <= 0) { this.retarget(npc, 0); return; }
    }
    if (npc.act === 'work' && npc.spot && !npc.person.street && !npc.person.visitor) {
      const err = jobErrand(npc, (kind) => this.errandCell(npc, kind), () => this.rng.next());
      if (err) {
        this.stats.errands++;
        npc.errand = { ...err, back: false };
        npc.legs = [{ kind: 'walk', x: err.target.x, y: err.target.y, z: err.target.z, tag: 'spot' }, { kind: 'arrive' }]; npc.legIdx = 0;
        this.startLeg(npc);
      }
    }
  }
  // a cell for a job errand: a meal-room seat on the same floor ('meal') or a free cell a few blocks away ('near')
  errandCell(npc, kind) {
    const s = npc.spot;
    if (!s) return null;
    if (kind === 'meal' && s.lot != null) {
      const li = this.lots.peek(s.lot);
      if (!li) return null;
      const c = li.candidates(npc.person, 'meal').filter((t) => t.y === s.y && (t.x !== s.x || t.z !== s.z));
      if (!c.length) return null;
      return c[Math.floor(this.rng.next() * c.length)];
    }
    for (let t = 0; t < 6; t++) {
      const x = s.x + Math.round((this.rng.next() - 0.5) * 8), z = s.z + Math.round((this.rng.next() - 0.5) * 8);
      if ((x === s.x && z === s.z) || !this.world.isLoaded(x, z)) continue;
      const li = s.lot != null ? this.lots.peek(s.lot) : null;
      if (li && !li.inside(x, z)) continue;
      const st = findStand(this.world, x, s.y, z, 1);
      if (st) return { x, y: st.y, z };
    }
    return null;
  }

  stepWalk(npc) {
    const path = npc.path;
    if (!path || npc.pathIdx >= path.length) { this.nextLeg(npc); return; }
    const c = path[npc.pathIdx];
    const tx = c.x + 0.5, tz = c.z + 0.5, ty = c.h;
    const dx = tx - npc.pos.x, dz = tz - npc.pos.z;
    const d = Math.hypot(dx, dz);
    const step = npc.speed * TICK;
    if (d <= step + 0.02) {
      npc.pos.x = tx; npc.pos.z = tz; npc.pos.y = ty;
      npc.pathIdx++;
      if (npc.pathIdx >= path.length) { this.nextLeg(npc); return; }
      const nx = path[npc.pathIdx];
      npc.targetYaw = Math.atan2(nx.x + 0.5 - npc.pos.x, nx.z + 0.5 - npc.pos.z);
    } else {
      npc.pos.x += (dx / d) * step; npc.pos.z += (dz / d) * step;
      npc.pos.y += (ty - npc.pos.y) * Math.min(1, 12 * TICK);
      npc.targetYaw = Math.atan2(dx, dz);
    }
    // stuck detection: no progress for a while -> re-plan the leg, much longer -> the spawn cycle removes them
    if (this.tickCount % 40 === 0) {
      const lp = npc.lastProgress;
      if (lp && Math.hypot(npc.pos.x - lp.x, npc.pos.z - lp.z) < 0.6) { npc.stuckT += 2; if (npc.stuckT >= 6 && npc.stuckT % 6 === 0) { npc.path = null; this.startLeg(npc); } }
      else npc.stuckT = 0;
      npc.lastProgress = { x: npc.pos.x, z: npc.pos.z };
    }
  }
  // the kerb hop: a HOP_S second arc (the body rises HOP_H at the middle), then on with the next leg
  stepHop(npc) {
    const h = npc.hop;
    if (!h) { this.nextLeg(npc); return; }
    h.t = Math.min(1, h.t + TICK / HOP_S);
    const t = h.t;
    npc.pos.x = h.x0 + (h.x1 - h.x0) * t; npc.pos.z = h.z0 + (h.z1 - h.z0) * t;
    npc.pos.y = h.y0 + (h.y1 - h.y0) * t + 4 * t * (1 - t) * HOP_H;
    if (t >= 1) { npc.pos.y = h.y1; npc.hop = null; this.nextLeg(npc); }
  }
  finishLift(npc) {
    const leg = npc.legs && npc.legs[npc.legIdx];
    if (leg) {
      const s = this.standNear(leg.tx, leg.ty, leg.tz);
      if (s) npc.setPos(s.x + 0.5, s.h, s.z + 0.5); else npc.setPos(leg.tx + 0.5, leg.ty, leg.tz + 0.5);
      if (npc.lot == null) npc.level = this.nav.levelAt(npc.pos.x, npc.pos.y, npc.pos.z);
    }
    npc.hidden = false;
    this.nextLeg(npc);
  }

  // Light separation among walkers near the player, and the player-bump reaction (rubric row 8: "running into them").
  separate(p) {
    const near = [];
    for (const n of this.live) { if (n.state === 'walk' && (n.pos.x - p.x) ** 2 + (n.pos.z - p.z) ** 2 < 40 * 40) near.push(n); }
    for (let i = 0; i < near.length; i++) {
      const a = near[i];
      for (let j = i + 1; j < near.length; j++) {
        const b = near[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz;
        if (d2 > 0.36 || d2 < 1e-6 || Math.abs(a.pos.y - b.pos.y) > 1.2) continue;
        const d = Math.sqrt(d2), push = (0.6 - d) * 0.5;
        a.pos.x -= (dx / d) * push; a.pos.z -= (dz / d) * push; b.pos.x += (dx / d) * push; b.pos.z += (dz / d) * push;
      }
    }
    // the player walking into someone
    const pv = this.player.vel || { x: 0, z: 0 };
    const speed = Math.hypot(pv.x || 0, pv.z || 0) * 20;   // player velocity is per tick
    if (this.playerCtx.bumpT <= 0 && speed > 1.5) {
      for (const n of this.live) {
        if (n.hidden || Math.abs(n.pos.y - p.y) > 1.5) continue;
        const dx = n.pos.x - p.x, dz = n.pos.z - p.z;
        if (dx * dx + dz * dz < 0.75 * 0.75) {
          this.playerCtx.bumpT = 4;
          this.speak(n, ambientLine(n.voice, { player: speed > 4 ? 'running' : 'bump' }), true);
          n.face(p.x, p.z);
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------------------- chatter (row 8)
  chatter(p) {
    const now = this.tickCount * TICK;
    if (now - this.lastBubbleAt < 1) return;
    let best = null, bd = Infinity;
    for (const n of this.live) {
      if (n.hidden || n.lying) continue;
      const d2 = (n.pos.x - p.x) ** 2 + (n.pos.z - p.z) ** 2;
      if (d2 > 24 * 24) continue;
      n.chatterT -= CYCLE_TICKS * TICK;
      if (n.chatterT > 0) continue;
      if (d2 < bd) { bd = d2; best = n; }
    }
    if (!best) return;
    const vendor = VENDOR_JOBS.has(best.person.job) && best.act === 'work';
    best.chatterT = (vendor ? 9 : 16) + this.rng.next() * (vendor ? 10 : 24);
    const ctx = { hour: this.hour, district: best.person.district, disaster: this.disaster ? this.disaster.kind : (this.watching ? 'sky' : null), player: this.playerCtx.vandalT > 0 && this.rng.next() < 0.5 ? 'vandal' : (this.player.flying && !this.player.onGround && this.rng.next() < 0.4 ? 'flying' : null), vendor, working: best.act === 'work' };
    const line = ambientLine(best.voice, ctx);
    if (line) this.speak(best, line, bd < 12 * 12);
  }
  speak(npc, line, toChat = false) {
    if (!line) return;
    const now = this.tickCount * TICK;
    this.bubbles.say(npc, line, this.time);
    this.lastBubbleAt = now;
    this.stats.bubbles++;
    if (toChat && now - this.lastChatAt > 4 && this.game.hud) { this.lastChatAt = now; this.game.hud.addMessage(`<${npc.name}> ${line}`); }
    if (this.game.audio && this.game.audio.npcGrunt && toChat) this.game.audio.npcGrunt(npc.pos, npc.droid ? 2.0 : npc.female ? 1.5 : 1.0);
  }

  // ---------------------------------------------------------------------------------------- interaction (row 9)
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const n of this.live) {
      if (n.hidden) continue;
      const dx = n.pos.x - origin.x, dz = n.pos.z - origin.z;
      if (dx * dx + dz * dz > (maxDist + 1) * (maxDist + 1)) continue;
      const t = rayAABB(origin, dir, n.box);
      if (t !== null && t < maxDist && (!best || t < best.dist)) best = { npc: n, dist: t };
    }
    return best;
  }
  // (named npcBoxes, not collectBoxes: VehicleManager calls `collectBoxes(region, out)` on every registered system)
  npcBoxes(out, x, z) { for (const n of this.live) if (!n.hidden && Math.abs(n.pos.x - x) < 3 && Math.abs(n.pos.z - z) < 3) out.push(n.box); }

  talk(npc) {
    if (npc.talkCooldown > 0 && this.talkBox.npc === npc) return;
    npc.talkCooldown = 2;
    this.stats.talks++;
    const p = this.player.pos;
    npc.face(p.x, p.z);
    npc.lookAt = { x: p.x, y: p.y + 1.6, z: p.z };
    npc.talkingT = 12;
    if (npc.state === 'at') npc.timer = Math.max(npc.timer, 8);
    const person = npc.person;
    const workLi = person.work != null && person.work !== PORT ? this.lots.get(person.work) : null;
    const purpose = workLi ? workLi.purpose : null;
    const atWork = npc.act === 'work' && !person.street && !person.visitor;
    const greeting = atWork && purpose && purpose.greeting && this.rng.next() < 0.6 ? purpose.greeting : greetLine(npc.voice);
    const sells = purpose && purpose.sells && purpose.sells.length && (VENDOR_JOBS.has(person.job) || purpose.category === 'food' || purpose.category === 'retail');
    const role = person.street ? `${person.job} - ${person.district} district` : person.visitor ? `${person.job}${purpose ? ' at ' + purpose.name : ''}` : `${person.job}${purpose ? ' at ' + purpose.name : person.port ? ' at the spaceport' : ''}`;
    const options = [
      { label: 'Which way to the nearest landmark?', act: () => ({ line: directionsLine(npc.voice, this.layout, { x: npc.pos.x, z: npc.pos.z }, person.work ?? -1), options: this.followUps(npc, purpose, sells, 'dir') }) },
      { label: 'What do you do here?', act: () => ({ line: workLine(npc.voice, person, purpose) + ' ' + (jobLine(npc.voice) || ''), options: this.followUps(npc, purpose, sells, 'work') }) },
    ];
    if (sells) options.push({ label: 'What are you selling?', act: () => { this.emit('trade', npc, purpose); return { line: priceLine(npc.voice, purpose), options: [] }; } });
    this.speak(npc, greeting, true);
    this.talkBox.open(npc, greeting, options.slice(0, 3), role);
    if (this.game.audio && this.game.audio.npcGrunt) this.game.audio.npcGrunt(npc.pos, npc.droid ? 2.0 : npc.female ? 1.5 : 1.0);
  }
  followUps(npc, purpose, sells, asked) {
    const opts = [];
    if (asked !== 'dir') opts.push({ label: 'Which way to the nearest landmark?', act: () => ({ line: directionsLine(npc.voice, this.layout, { x: npc.pos.x, z: npc.pos.z }, npc.person.work ?? -1), options: [] }) });
    if (asked !== 'work') opts.push({ label: 'What do you do here?', act: () => ({ line: workLine(npc.voice, npc.person, purpose), options: [] }) });
    if (sells) opts.push({ label: 'What are you selling?', act: () => { this.emit('trade', npc, purpose); return { line: priceLine(npc.voice, purpose), options: [] }; } });
    opts.push({ label: 'Thanks, take care.', act: () => null });
    return opts.slice(0, 3);
  }
  onTalkEnd(npc) { npc.lookAt = null; npc.talkingT = 0; if (npc.spot && npc.spot.yaw != null && npc.state === 'at') npc.targetYaw = npc.spot.yaw; }
  poke(npc) {
    if (npc.talkCooldown <= 0) { npc.talkCooldown = 1.5; this.speak(npc, ambientLine(npc.voice, { player: 'poke' }), true); }
    const p = this.player.pos;
    const dx = npc.pos.x - p.x, dz = npc.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
    const nx = npc.pos.x + (dx / d) * 0.4, nz = npc.pos.z + (dz / d) * 0.4;
    if (standHeight(this.world, Math.floor(nx), Math.floor(npc.pos.y + 0.01), Math.floor(nz)) !== null) { npc.pos.x = nx; npc.pos.z = nz; }
    npc.face(p.x, p.z);
    npc.lookAt = { x: p.x, y: p.y + 1.6, z: p.z }; npc.talkingT = 3;
  }
  // block broken/placed by the player: vandalism context in civic districts and on plazas (row 8)
  onWorldChanged(x, y, z) {
    const p = this.player.pos;
    if (Math.abs(x - p.x) > 8 || Math.abs(z - p.z) > 8) return;
    const d = this.layout.districtAt ? this.layout.districtAt(x, z) : null;
    const kind = d && d.kind ? d.kind : d;
    const onPlaza = this.layout.lotsIn ? this.layout.lotsIn(x, z, x + 1, z + 1).some((l) => l.kind === 'plaza') : false;
    if (CIVIC.has(kind) || onPlaza) this.playerCtx.vandalT = 8;
  }

  // ---------------------------------------------------------------------------------------- disasters (row 8)
  alert(info) {
    this.disaster = { kind: info.kind || 'flood', x: info.x, z: info.z, radius: info.radius || 80 };
    const r2 = this.disaster.radius ** 2;
    for (const n of this.live) {
      if ((n.pos.x - info.x) ** 2 + (n.pos.z - info.z) ** 2 > r2 || n.lot != null) continue;
      n.panic = true;
      // run for the nearest doorway: home if it is close, else the closest lot with a door
      const home = n.person.home != null && n.person.home !== PORT ? this.lots.get(n.person.home) : null;
      const target = home && Math.hypot(home.lot.x0 - n.pos.x, home.lot.z0 - n.pos.z) < 120 ? home : this.nearestLot(n.pos);
      if (!target) continue;
      const e = target.entrance(n.level) || target.entrances()[0];
      if (!e) continue;
      this.vacate(n.spot, n);
      n.spot = { x: e.in.x, y: e.in.y, z: e.in.z, lot: target.id, level: 'lot', kind: 'shelter' };
      n.act = 'shelter'; n.actLot = target.id;
      this.beginTrip(n, n.spot);
    }
  }
  clearAlert() { this.disaster = null; for (const n of this.live) if (n.panic) { n.panic = false; n.timer = 0.5; } }
  nearestLot(pos) {
    let best = null, bd = Infinity;
    for (const l of this.layout.lots) { if (l.kind === 'plaza') continue; const d = Math.hypot(l.x0 + l.w / 2 - pos.x, l.z0 + l.d / 2 - pos.z); if (d < bd) { bd = d; best = l; } }
    return best ? this.lots.get(best.id) : null;
  }

  // ---------------------------------------------------------------------------------------- per frame
  update(dt, alpha, camera) {
    if (!this.enabled) return;
    this.time += dt;
    this.frame++;
    const cp = camera.position, p = this.player.pos;
    const eye = { x: p.x, y: p.y + 1.6, z: p.z };
    this.sparkT -= dt;
    const doSparks = this.sparkT <= 0;
    if (doSparks) this.sparkT = 0.11 + this.rng.next() * 0.1;
    for (const n of this.live) {
      const px = n.prev.x + (n.pos.x - n.prev.x) * alpha, py = n.prev.y + (n.pos.y - n.prev.y) * alpha, pz = n.prev.z + (n.pos.z - n.prev.z) * alpha;
      n.rx = px; n.ry = py; n.rz = pz;
      const dx = px - cp.x, dz = pz - cp.z, d2 = dx * dx + dz * dz;
      if (n.hidden || d2 > 140 * 140) { this.crowd.set(n.slot, { hidden: true }); continue; }
      // turning
      let dy = n.targetYaw - n.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      n.yaw += dy * Math.min(1, dt * 9);
      // head: guards track the player within six blocks, others glance when close or while talking
      let hy = 0, hp = 0;
      const dpx = eye.x - px, dpz = eye.z - pz, dp2 = dpx * dpx + dpz * dpz;
      const guard = isGuard(n.person.job) && n.state === 'at';
      if (n.talkingT > 0 || (dp2 < 36 && (guard || (n.person.key & 3) !== 0)) && !n.lying) {
        const want = Math.atan2(dpx, dpz) - n.yaw;
        let w = want; while (w > Math.PI) w -= Math.PI * 2; while (w < -Math.PI) w += Math.PI * 2;
        hy = Math.max(-1.1, Math.min(1.1, w));
        hp = Math.max(-0.8, Math.min(0.6, -Math.atan2(eye.y - (py + 1.6 * n.scale), Math.sqrt(dp2))));
        if (guard && dp2 < 36 && Math.abs(w) > 1.0) n.targetYaw = Math.atan2(dpx, dpz);
      } else if (n.mode === MODE.WATCHING) hp = -0.55;
      n.headYaw += (hy - n.headYaw) * Math.min(1, dt * 7);
      n.headPitch += (hp - n.headPitch) * Math.min(1, dt * 7);
      if (n.talkingT > 0) n.talkingT -= dt;
      // lighting sample, staggered
      if (++n.lightTimer >= 12) { n.lightTimer = 0; const l = this.world.sampleLight(n.pos.x, n.pos.y + 1, n.pos.z); n.sky = l[0]; n.blk = l[1]; }
      // pose offsets: sitting lowers the body, sleeping lays it flat along the bed
      let y = py, pitch = 0, x = px, z = pz;
      if (n.lying) { pitch = -Math.PI / 2; y = py + 0.55; x = px + Math.sin(n.yaw) * 0.9; z = pz + Math.cos(n.yaw) * 0.9; }
      else if (n.sitting) y = py - 0.42 * n.scale;
      const walking = n.state === 'walk';
      this.crowd.set(n.slot, { x, y, z, yaw: n.yaw, pitch, scale: n.scale, skin: n.skin, mode: n.talkingT > 0 && !walking && !n.sitting && !n.lying ? MODE.TALKING : n.mode, phase: n.phase, speed: walking ? n.speed * 1.45 : n.animSpeed, amp: n.amp, headYaw: n.headYaw, headPitch: n.headPitch, sky: n.sky, blk: n.blk, blink: n.blink });
      // welding sparks near the player
      if (doSparks && n.mode === MODE.WELDING && n.state === 'at' && d2 < 48 * 48 && isWelder(n.person.job)) sparks(this.game.particles, n, () => this.rng.next());
    }
    this.bubbles.update(this.time, camera);
    this.crowd.update(this.time);
  }

  // ---------------------------------------------------------------------------------------- census (row 4 / scripts)
  // `visible` counts the people the player can actually see: in front of the camera within 64 blocks, on the player's
  // own street level (a deck crowd is invisible from the undercity and vice versa) or on the player's floor of the
  // building they are in. `within96` is everyone spawned around the player, seen or not.
  census(camera = this.game.camera) {
    const p = this.player.pos, states = {}, acts = {}, modes = {}, jobs = {};
    let visible = 0, visibleOutdoors = 0, onStreet = 0, inLots = 0, walking = 0, within96 = 0, outdoors96 = 0, outdoors40 = 0, onPlaza = 0, droids = 0, stuckNow = 0, unseenIndoors = 0, otherLevel = 0;
    let fwd = null;
    if (camera && camera.getWorldDirection) { const v = camera.getWorldDirection(_dir); fwd = { x: v.x, z: v.z }; }
    const lotAt = this.playerLot(p);
    // the hall the player stands in (the Senate rotunda spans 27 blocks of tiers): its occupants are in view too
    const li = lotAt != null ? this.lots.peek(lotAt) : null;
    const halls = li ? li.roomsAtHeight(p.y).map(([, r]) => r) : [];
    const inHall = (n) => halls.some((r) => n.pos.x >= r.x && n.pos.x < r.x + r.w && n.pos.z >= r.z && n.pos.z < r.z + r.d && n.pos.y >= r.y - 1 && n.pos.y <= li.roomSpan(r)[1] + 2);
    for (const n of this.live) {
      states[n.state] = (states[n.state] || 0) + 1;
      acts[n.act] = (acts[n.act] || 0) + 1;
      modes[n.mode] = (modes[n.mode] || 0) + 1;
      jobs[n.person.job] = (jobs[n.person.job] || 0) + 1;
      if (n.lot != null) inLots++; else onStreet++;
      if (n.state === 'walk') walking++;
      if (n.person.droid) droids++;
      if (n.stuckT >= 6) stuckNow++;
      const dx = n.pos.x - p.x, dz = n.pos.z - p.z, d = Math.hypot(dx, dz);
      if (!n.hidden && d <= 96) { within96++; if (n.lot == null) { outdoors96++; if (d <= 40) outdoors40++; } }
      const dy = Math.abs(n.pos.y - p.y);
      const seen = n.lot == null ? dy <= 8 : (n.lot === lotAt && (dy <= 4 || inHall(n)));
      if (n.lot != null && n.lot !== lotAt) unseenIndoors++; else if (n.lot == null && dy > 8) otherLevel++;
      if (!n.hidden && seen && d < 64 && (!fwd || d < 6 || (dx * fwd.x + dz * fwd.z) / d > -0.2)) { visible++; if (n.lot == null) visibleOutdoors++; }
      if (n.lot == null && n.spot && n.spot.kind === 'plaza') onPlaza++;
    }
    const s = this.stats;
    return {
      hour: +this.hour.toFixed(2), pool: this.people.length, live: this.live.length, visible, visibleOutdoors, within96, outdoors96, outdoors40, onPlaza, onStreet, inLots, unseenIndoors, otherLevel, walking, droids, stuckNow, states, acts, modes, jobs,
      stuck: s.stuck, trips: s.trips, tripsFailed: s.tripsFailed, legs: s.legs, legsFailed: s.legsFailed, legsFailedBy: s.legsFailedBy, retargets: s.retargets, lifts: s.lifts, hops: s.hops || 0, errands: s.errands,
      failRate: s.trips ? +((s.tripsFailed + s.retargets) / s.trips).toFixed(4) : 0, legFailRate: s.legs ? +(s.legsFailed / s.legs).toFixed(4) : 0,
      spawned: s.spawned, despawned: s.despawned, recycled: s.recycled, bubbles: s.bubbles, talks: s.talks, unloadedWaits: s.unloadedWaits, unplaceable: s.unplaceable,
      paths: { ...this.paths.stats, ms: +this.paths.stats.ms.toFixed(1), pending: this.paths.pending }, coarse: { ...this.nav.stats }, drawCalls: this.crowd.drawCalls,
    };
  }

  dispose() {
    for (const n of [...this.live]) this.despawn(n);
    this.crowd.dispose(); this.bubbles.dispose();
  }
}

function rayAABB(o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  const axes = [[o.x, d.x, b.x0, b.x1], [o.y, d.y, b.y0, b.y1], [o.z, d.z, b.z0, b.z1]];
  for (const [oo, dd, lo, hi] of axes) {
    if (Math.abs(dd) < 1e-9) { if (oo < lo || oo > hi) return null; continue; }
    let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return Math.max(tmin, 0);
}

// Self-registration (like installShipTraffic): wait until the game has its world, scene, town NPC manager and the
// vehicle list, then attach the population as game.coruscant.population and register it for tick/update.
export function installPopulation(game, layout) {
  if (!game || typeof requestAnimationFrame !== 'function') return;
  const tryInstall = () => {
    if (game.coruscant && game.coruscant.population) return;
    if (game.vehicles && game.npcs && game.world && game.scene && game.player && game.sky) {
      try {
        const pop = new CoruscantPopulation(game, layout);
        game.coruscant = game.coruscant || {};
        game.coruscant.population = game.vehicles.add(pop);
      } catch (e) { console.error('[coruscant] population failed to start', e); }
      return;
    }
    requestAnimationFrame(tryInstall);
  };
  tryInstall();
}
