// Deterministic traffic schedule for sys-traffic. Two candidate streams (arrivals, launches) at fixed
// intervals from the module seed; each candidate becomes a flight only if a rack slot is available and the
// hangar mover cap holds at that instant. Generation is lazy and strictly time-ordered, so replaying from
// t = -inf to any t gives the same flights on every client (COORDINATION.md §9.6).
import { ARRIVAL_DURATION, LAUNCH_DURATION, ARRIVAL_SHAFT_TIME } from "./paths.js";

export function hash32(...parts) {
  let h = 2166136261;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    h = Math.imul(h ^ 0x9e3779b9, 16777619);
  }
  return h >>> 0;
}

/** unit float from a hash (stateless RNG: the same key always yields the same number) */
export function unit(...parts) {
  return hash32(...parts) / 4294967296;
}

/** The harness screenshot anchor: the first arrival is exactly at the aperture centre at this time. */
export const ANCHOR_SHAFT_T = 40;
/** launches are offset so no launch is in the shaft or at the hover point while an arrival is */
export const LAUNCH_PHASE = 8;

export class Schedule {
  /**
   * @param {object} o
   * @param {number} o.seed
   * @param {Array} o.slots rack slot objects [{id, pos, yaw, occupied}]; initial occupancy from slot.fighterId
   * @param {number} o.maxHangarMovers concurrent arrivals + launches allowed
   * @param {number} o.maxHangarFighters cap on racked + inbound + outbound fighters (triangle budget); arrivals
   *   are skipped while the hangar holds that many
   */
  constructor({ seed, slots, arrivalsPerMinute = 2, launchesPerMinute = 2, maxHangarMovers = 6, maxHangarFighters = Infinity }) {
    this.seed = seed;
    this.slots = slots;
    this.maxHangarMovers = maxHangarMovers;
    this.maxHangarFighters = maxHangarFighters;
    this.rates = { arrivalsPerMinute, launchesPerMinute };
    this.reset();
  }

  interval(kind) {
    const r = kind === "arrival" ? this.rates.arrivalsPerMinute : this.rates.launchesPerMinute;
    return r > 0 ? 60 / r : Infinity;
  }

  /** Back to the initial state (before any flight). Occupancy comes from slot.fighterId (initial racked). */
  reset() {
    this.flights = [];
    this.occ = new Map();
    for (const s of this.slots) this.occ.set(s.id, s.fighterId ? { fighterId: s.fighterId, readyAt: -Infinity } : null);
    this.cursor = {
      arrivalIndex: 0,
      launchIndex: 0,
      nextArrivalT0: ANCHOR_SHAFT_T - ARRIVAL_SHAFT_TIME,
      nextLaunchT0: LAUNCH_PHASE,
    };
    this.seq = 0;
  }

  setRates({ arrivalsPerMinute, launchesPerMinute } = {}, now = 0) {
    if (arrivalsPerMinute !== undefined) this.rates.arrivalsPerMinute = Math.max(0, +arrivalsPerMinute || 0);
    if (launchesPerMinute !== undefined) this.rates.launchesPerMinute = Math.max(0, +launchesPerMinute || 0);
    // a stream that was parked at infinity (rate 0) or far out restarts from now
    const ia = this.interval("arrival");
    const il = this.interval("launch");
    if (this.cursor.nextArrivalT0 > now + ia) this.cursor.nextArrivalT0 = now + ia;
    if (this.cursor.nextLaunchT0 > now + il) this.cursor.nextLaunchT0 = now + il;
  }

  activeAt(t, kind = null) {
    let n = 0;
    for (const f of this.flights) if (f.t0 <= t && t < f.t0 + f.duration && (!kind || f.kind === kind)) n++;
    return n;
  }

  /** fighters the hangar accounts for at t: racked or inbound (slot reserved) plus outbound launches in flight */
  hangarFightersAt(t) {
    let n = this.activeAt(t, "launch");
    for (const o of this.occ.values()) if (o) n++;
    return n;
  }

  /** Generate every candidate with t0 <= t. */
  generateUntil(t) {
    let guard = 0;
    while (guard++ < 10000) {
      const c = this.cursor;
      const ta = c.nextArrivalT0;
      const tl = c.nextLaunchT0;
      if (Math.min(ta, tl) > t) break;
      if (ta <= tl) {
        this.candidate("arrival", ta, c.arrivalIndex++);
        c.nextArrivalT0 = ta + this.interval("arrival");
      } else {
        this.candidate("launch", tl, c.launchIndex++);
        c.nextLaunchT0 = tl + this.interval("launch");
      }
    }
  }

  candidate(kind, t0, index) {
    if (this.activeAt(t0) >= this.maxHangarMovers) return null;
    const rnd = unit(this.seed, kind, index);
    if (kind === "arrival") {
      if (this.hangarFightersAt(t0) >= this.maxHangarFighters) return null;
      const free = this.slots.filter((s) => this.occ.get(s.id) === null);
      if (!free.length) return null;
      const slot = free[Math.floor(rnd * free.length) % free.length];
      const fighterId = `tie-${String(this.seq++).padStart(3, "0")}`;
      const flight = {
        id: `A${index}`,
        kind,
        t0,
        duration: ARRIVAL_DURATION,
        slotId: slot.id,
        variant: index % 8,
        fighterId,
        pathId: `arr:${slot.id}:${index % 8}`,
        started: false,
        ended: false,
      };
      this.occ.set(slot.id, { fighterId, readyAt: t0 + ARRIVAL_DURATION });
      this.flights.push(flight);
      return flight;
    }
    const ready = this.slots.filter((s) => {
      const o = this.occ.get(s.id);
      return o && o.readyAt <= t0;
    });
    if (!ready.length) return null;
    const slot = ready[Math.floor(rnd * ready.length) % ready.length];
    const o = this.occ.get(slot.id);
    const flight = {
      id: `L${index}`,
      kind,
      t0,
      duration: LAUNCH_DURATION,
      slotId: slot.id,
      variant: index % 8,
      fighterId: o.fighterId,
      pathId: `lau:${slot.id}:${index % 8}`,
      started: false,
      ended: false,
    };
    this.occ.set(slot.id, null);
    this.flights.push(flight);
    return flight;
  }

  /** drop finished flights that can no longer influence anything (keeps replay memory flat) */
  prune(t) {
    if (this.flights.length < 64) return;
    this.flights = this.flights.filter((f) => !f.ended || f.t0 + f.duration > t - 5);
  }

  serialize() {
    const inf = (x) => (Number.isFinite(x) ? x : null);
    return {
      arrivalsPerMinute: this.rates.arrivalsPerMinute,
      launchesPerMinute: this.rates.launchesPerMinute,
      maxHangarMovers: this.maxHangarMovers,
      maxHangarFighters: inf(this.maxHangarFighters),
      cursor: { ...this.cursor, nextArrivalT0: inf(this.cursor.nextArrivalT0), nextLaunchT0: inf(this.cursor.nextLaunchT0) },
      seq: this.seq,
      occupancy: this.slots.map((s) => {
        const o = this.occ.get(s.id);
        return { slotId: s.id, fighterId: o ? o.fighterId : null, readyAt: o ? inf(o.readyAt) : null };
      }),
      flights: this.flights.filter((f) => !f.ended).map((f) => ({ ...f })),
    };
  }

  apply(s) {
    if (!s) return;
    const fin = (x, dflt) => (x === null || x === undefined ? dflt : x);
    this.rates.arrivalsPerMinute = fin(s.arrivalsPerMinute, this.rates.arrivalsPerMinute);
    this.rates.launchesPerMinute = fin(s.launchesPerMinute, this.rates.launchesPerMinute);
    this.maxHangarMovers = fin(s.maxHangarMovers, this.maxHangarMovers);
    this.maxHangarFighters = s.maxHangarFighters === null ? Infinity : fin(s.maxHangarFighters, this.maxHangarFighters);
    if (s.cursor) {
      this.cursor = {
        arrivalIndex: fin(s.cursor.arrivalIndex, 0),
        launchIndex: fin(s.cursor.launchIndex, 0),
        nextArrivalT0: fin(s.cursor.nextArrivalT0, Infinity),
        nextLaunchT0: fin(s.cursor.nextLaunchT0, Infinity),
      };
    }
    this.seq = fin(s.seq, 0);
    this.occ = new Map();
    for (const slot of this.slots) this.occ.set(slot.id, null);
    for (const o of s.occupancy || []) if (this.occ.has(o.slotId)) this.occ.set(o.slotId, o.fighterId ? { fighterId: o.fighterId, readyAt: fin(o.readyAt, -Infinity) } : null);
    this.flights = (s.flights || []).map((f) => ({ ...f }));
  }
}
