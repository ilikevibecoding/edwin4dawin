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
};

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
  doorLead: 1.5,  // doors close this long before departure
  doorLag: 0.5,   // doors open this long after arrival
};
const DIST = ROUTE.coruscant.dockX0 - ROUTE.frontier.dockX0; // 2233
const ACC = SCHEDULE.vmax / SCHEDULE.accel;
const RAMP_DIST = 0.5 * ACC * SCHEDULE.accel * SCHEDULE.accel; // 120
export const RIDE_TIME = SCHEDULE.accel * 2 + (DIST - 2 * RAMP_DIST) / SCHEDULE.vmax; // ~82.4 s
export const PERIOD = 2 * (SCHEDULE.dwell + RIDE_TIME);

// distance travelled and speed after tau seconds of a ride
function rideProfile(tau) {
  if (tau <= 0) return { s: 0, v: 0, phase: 'accel' };
  if (tau >= RIDE_TIME) return { s: DIST, v: 0, phase: 'decel' };
  if (tau < SCHEDULE.accel) return { s: 0.5 * ACC * tau * tau, v: ACC * tau, phase: 'accel' };
  const rem = RIDE_TIME - tau;
  if (rem < SCHEDULE.accel) return { s: DIST - 0.5 * ACC * rem * rem, v: ACC * rem, phase: 'decel' };
  return { s: RAMP_DIST + SCHEDULE.vmax * (tau - SCHEDULE.accel), v: SCHEDULE.vmax, phase: 'cruise' };
}

// Train state at a tick: west-end world x, speed (blocks/s, signed by direction), phase, station docked at,
// destination, doors. Pure function of the tick (period ~205 s), so identical for every client.
export function trainState(tick) {
  const t = ((tick * TICK_DT) % PERIOD + PERIOD) % PERIOD;
  const D = SCHEDULE.dwell, R = RIDE_TIME;
  const F = ROUTE.frontier, C = ROUTE.coruscant;
  if (t < D) return { x0: F.dockX0, v: 0, phase: 'dwell', at: F, dest: C, dir: 1, doorsOpen: t >= SCHEDULE.doorLag && t < D - SCHEDULE.doorLead, phaseT: t, cycleT: t };
  if (t < D + R) { const p = rideProfile(t - D); return { x0: F.dockX0 + p.s, v: p.v, phase: p.phase, at: null, dest: C, dir: 1, doorsOpen: false, phaseT: t - D, cycleT: t }; }
  if (t < 2 * D + R) { const tt = t - D - R; return { x0: C.dockX0, v: 0, phase: 'dwell', at: C, dest: F, dir: -1, doorsOpen: tt >= SCHEDULE.doorLag && tt < D - SCHEDULE.doorLead, phaseT: tt, cycleT: t }; }
  const p = rideProfile(t - 2 * D - R);
  return { x0: C.dockX0 - p.s, v: -p.v, phase: p.phase, at: null, dest: F, dir: -1, doorsOpen: false, phaseT: t - 2 * D - R, cycleT: t };
}

// Ticks until the train next docks at `station` with open doors (for timetable boards / tests).
export function ticksUntilDock(tick, station) {
  const st = trainState(tick);
  if (st.at === station && st.doorsOpen) return 0;
  for (let k = 1; k < PERIOD / TICK_DT + 2; k++) { const s = trainState(tick + k); if (s.at === station && s.doorsOpen) return k; }
  return -1;
}
