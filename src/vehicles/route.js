// The hyperlane route shared by the track/station structures and the space train: where the track is, where the
// train docks, how the cars are laid out, and the timetable as a pure function of the shared 20 TPS tick so every
// client computes the identical train position.
import { TICK_DT } from '../constants.js';

export const ROUTE = {
  z: 0,            // track centre line: the train straddles the boundary between cells z = -1 and z = 0
  deckY: 89,       // solid deck layer of the track (DURASTEEL_DARK); the guide rails sit on it at railY
  railY: 90,       // RAIL blocks (non-solid) and the train's undercarriage layer
  floorY: 92,      // walking surface inside the cars and on the station platforms (top of block 91)
  // track extent (inclusive), with buffer stops beyond both stations; the east end stops at x 2548 so that the
  // concourse (x 2549..2560) and the spaceport's covered bridge (x 2561..2575) stay clear of the track
  x0: 222, x1: 2548,
  supportEvery: 32,
  trainZ0: -3,     // the train occupies cells z = -3 .. 2 (6 wide)
  trainWidth: 6,
  platformZ0: 3, platformZ1: 10, // platforms are on the +z (south) side, flush with the train's wall
  frontier: { name: 'Frontier Station', dockX0: 226, platformX0: 240, platformX1: 300 },
  coruscant: { name: 'Coruscant Spaceport', dockX0: 2459, platformX0: 2473, platformX1: 2533 },
  // Westport Terminus: the spaceport's rail yard under the grand terminal on the west apron, beside the live track
  // (platform 1 = the hyperlane, x 2264..2323; the yard tracks A/B/C are dead-end sidings). Eastbound trains run
  // express F -> C past it; westbound they call there: C -> T -> F. It has no departure display of its own.
  terminus: { name: 'Westport Terminus', dockX0: 2250, platformX0: 2264, platformX1: 2324, undercroft: true },
};
ROUTE.stops = [ROUTE.frontier, ROUTE.terminus, ROUTE.coruscant];   // west to east

// Car layout along the train's grid x (west to east): engine, three passenger cars, observation car.
export const CAR_LENGTH = 14;
export const CAR_GAP = 1; // gangway between cars
export const CARS = [
  { kind: 'engine', x0: 0 },
  { kind: 'passenger', x0: 15 },
  { kind: 'passenger', x0: 30 },
  { kind: 'passenger', x0: 45 },
  { kind: 'observation', x0: 60 },
];
export const TRAIN_LENGTH = CARS[CARS.length - 1].x0 + CAR_LENGTH; // 74
export const TRAIN_HEIGHT = 6;   // undercarriage, floor, 3 interior rows, roof
// door openings on the platform side (grid z = 5), as car-local x offsets of the 2-wide doorways
// the engine has no passenger door: docked, it stands short of the platform at both stations (crew reach it through
// the gangway), so a door there would open onto the drop
export const DOOR_OFFSETS = { engine: [], passenger: [2, 10], observation: [2, 10] };
// world x of every door's first cell when the train is docked with its west end at dockX0
export function doorWorldXs(dockX0) {
  const out = [];
  for (const car of CARS) for (const dx of DOOR_OFFSETS[car.kind]) out.push(dockX0 + car.x0 + dx);
  return out;
}

export const SCHEDULE = {
  dwell: 20,      // seconds docked at each end (doors open)
  accel: 8,       // seconds 0 -> vmax (and vmax -> 0)
  vmax: 30,       // blocks/s
  hopSpeed: 16,   // blocks/s: the train's own doors stay open below this speed, so you can hop on and off while it
                  // rolls through the station and along the walkway (they seal for the cruise)
};
const DIST = ROUTE.coruscant.dockX0 - ROUTE.frontier.dockX0; // 2233
const ACC = SCHEDULE.vmax / SCHEDULE.accel;
const RAMP_DIST = 0.5 * ACC * SCHEDULE.accel * SCHEDULE.accel; // 120
// the express ride F -> C (constant-acceleration ramps; train.js eases them into S-curves with the same end points)
export const RIDE_TIME = SCHEDULE.accel * 2 + (DIST - 2 * RAMP_DIST) / SCHEDULE.vmax; // ~82.4 s

// distance travelled and speed after tau seconds of the express ride
function rideProfile(tau) {
  if (tau <= 0) return { s: 0, v: 0, phase: 'accel' };
  if (tau >= RIDE_TIME) return { s: DIST, v: 0, phase: 'decel' };
  if (tau < SCHEDULE.accel) return { s: 0.5 * ACC * tau * tau, v: ACC * tau, phase: 'accel' };
  const rem = RIDE_TIME - tau;
  if (rem < SCHEDULE.accel) return { s: DIST - 0.5 * ACC * rem * rem, v: ACC * rem, phase: 'decel' };
  return { s: RAMP_DIST + SCHEDULE.vmax * (tau - SCHEDULE.accel), v: SCHEDULE.vmax, phase: 'cruise' };
}

// The westbound stopping legs (C -> T, T -> F) are jerk-limited in the timetable itself: smoothstep speed ramps of
// `accel` seconds (0 -> vp: distance vp * T / 2, the same curve train.js uses for its easing) round a cruise; a leg too
// short to reach vmax peaks lower. `names` = the phase names of [ramp up, cruise, ramp down]: train.js re-eases only
// 'accel' / 'decel' (anchored on the frontier / Coruscant docks), so a ramp that starts or ends at the terminus keeps
// its own name ('launch' / 'brake') and is drawn as the timetable says.
function easedRamp(tau, vp, T) {
  const u = Math.min(1, Math.max(0, tau / T));
  return { s: vp * T * (u * u * u - 0.5 * u * u * u * u), v: vp * (3 * u * u - 2 * u * u * u) };
}
export function legTime(dist) { const T = SCHEDULE.accel, vp = Math.min(SCHEDULE.vmax, dist / T); return 2 * T + (dist - vp * T) / vp; }
function legProfile(dist, tau, names) {
  const T = SCHEDULE.accel, vp = Math.min(SCHEDULE.vmax, dist / T), rampD = vp * T / 2, total = legTime(dist);
  if (tau <= 0) return { s: 0, v: 0, phase: names[0] };
  if (tau >= total) return { s: dist, v: 0, phase: names[2] };
  if (tau < T) { const r = easedRamp(tau, vp, T); return { s: r.s, v: r.v, phase: names[0] }; }
  const rem = total - tau;
  if (rem < T) { const r = easedRamp(rem, vp, T); return { s: dist - r.s, v: r.v, phase: names[2] }; }
  return { s: rampD + vp * (tau - T), v: vp, phase: names[1] };
}
const DIST_CT = ROUTE.coruscant.dockX0 - ROUTE.terminus.dockX0;   // 209: too short for vmax, peaks at ~26 blocks/s
const DIST_TF = ROUTE.terminus.dockX0 - ROUTE.frontier.dockX0;    // 2024
export const LEG_CT = legTime(DIST_CT), LEG_TF = legTime(DIST_TF);  // ~16 s, ~75.5 s
// One cycle: dwell F, express F -> C, dwell C, C -> T, dwell T, T -> F. The frontier dwell opens the cycle and the
// Coruscant dwell follows the express ride exactly as before, so a board that knows only those two stations
// (dwell, RIDE_TIME, PERIOD) still reads the timetable correctly.
export const PERIOD = 3 * SCHEDULE.dwell + RIDE_TIME + LEG_CT + LEG_TF;
const T_EXPRESS = SCHEDULE.dwell, T_DWELL_C = T_EXPRESS + RIDE_TIME, T_LEG_CT = T_DWELL_C + SCHEDULE.dwell, T_DWELL_T = T_LEG_CT + LEG_CT, T_LEG_TF = T_DWELL_T + SCHEDULE.dwell;

// Train state at a tick: west-end world x, speed (blocks/s, signed by direction), phase, station docked at,
// destination, doors. Pure function of the tick (period ~234 s), so identical for every client. `phaseT` counts the
// dwell while docked; on the move it is set so that RIDE_TIME - phaseT is the time left to the next stop (the
// express leg's phaseT is simply its elapsed time).
export function trainState(tick) {
  const t = ((tick * TICK_DT) % PERIOD + PERIOD) % PERIOD;
  const D = SCHEDULE.dwell, R = RIDE_TIME;
  const F = ROUTE.frontier, C = ROUTE.coruscant, W = ROUTE.terminus;
  const open = (v) => v <= SCHEDULE.hopSpeed;
  // the train's own doors are open whenever it is slower than hopSpeed: through the whole dwell and the first / last
  // ~19 blocks of each ride (so people can hop on and off a rolling train); the platform screens follow (stations.js)
  if (t < T_EXPRESS) return { x0: F.dockX0, v: 0, phase: 'dwell', at: F, dest: C, dir: 1, doorsOpen: true, phaseT: t, cycleT: t };
  if (t < T_DWELL_C) { const p = rideProfile(t - T_EXPRESS); return { x0: F.dockX0 + p.s, v: p.v, phase: p.phase, at: null, dest: C, dir: 1, doorsOpen: open(p.v), phaseT: t - T_EXPRESS, cycleT: t }; }
  if (t < T_LEG_CT) return { x0: C.dockX0, v: 0, phase: 'dwell', at: C, dest: W, dir: -1, doorsOpen: true, phaseT: t - T_DWELL_C, cycleT: t };
  if (t < T_DWELL_T) { const tau = t - T_LEG_CT, p = legProfile(DIST_CT, tau, ['launch', 'cruise', 'brake']); return { x0: C.dockX0 - p.s, v: -p.v, phase: p.phase, at: null, dest: W, dir: -1, doorsOpen: open(p.v), phaseT: R - (LEG_CT - tau), cycleT: t }; }
  if (t < T_LEG_TF) return { x0: W.dockX0, v: 0, phase: 'dwell', at: W, dest: F, dir: -1, doorsOpen: true, phaseT: t - T_DWELL_T, cycleT: t };
  const tau = t - T_LEG_TF, p = legProfile(DIST_TF, tau, ['launch', 'cruise', 'decel']);
  return { x0: W.dockX0 - p.s, v: -p.v, phase: p.phase, at: null, dest: F, dir: -1, doorsOpen: open(p.v), phaseT: R - (LEG_TF - tau), cycleT: t };
}

// Ticks until the train next docks at `station` with open doors (for timetable boards / tests).
export function ticksUntilDock(tick, station) {
  const st = trainState(tick);
  if (st.at === station && st.doorsOpen) return 0;
  for (let k = 1; k < PERIOD / TICK_DT + 2; k++) { const s = trainState(tick + k); if (s.at === station && s.doorsOpen) return k; }
  return -1;
}
