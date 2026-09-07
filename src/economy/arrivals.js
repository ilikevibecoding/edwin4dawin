// Freighter arrivals for the import chain (rubric 15 #11): a read-only adapter over W2's ship traffic. The economy
// never edits `src/ships/`; it reads the deterministic ship list (the same `buildShips()` records the ShipTraffic
// vehicle animates) and asks each cargo ship for its phase and pose at the port clock. Imports are bound to these
// ships: a shipment is loaded when a freighter leaves on its loop, rides the hold, and is unloaded only while the
// ship stands on its pad with the doors open - with no cargo ships (traffic absent), nothing is ever imported.
import { shipModels } from '../ships/models.js';
import { buildShips, routePose, padStateAt, nextPhaseStart, PORT_PHASES } from '../ships/traffic.js';
import { TICK_RATE } from '../constants.js';

export const CARGO_CLASSES = new Set(['freighter', 'hauler']);
// units of bulk goods a hold carries per landing (a unit is a crate / canister / cell / kit / bale, see prices.js)
export const HOLD_UNITS = { freighter: 480, hauler: 900 };
// phases during which the cargo doors are open on the pad (unloading happens here)
export const DOORS_OPEN = new Set(['boarding', 'servicing']);
export const ON_GROUND = new Set(['touchdown', 'shutdown', 'doors', 'boarding', 'servicing', 'closure']);
export const AIRBORNE_INBOUND = new Set(['fly', 'reservation', 'approach']);
export const PHASE_INDEX = Object.fromEntries(PORT_PHASES.map((p, i) => [p, i]));

// Hold cells (model space, grid units) where crates stand: the aft cargo bay of each freighter design, floor row
// then a second tier. Laid out by hand from designs_transport.js interiors (light freighter hold z 14..20, bulk
// freighter hold z 8..27), so the crates sit inside the hull behind the lounge / cockpit.
const HOLD_CELLS = {
  light_freighter: (() => { const c = []; for (let z = 14; z <= 20; z += 2) for (let x = 5; x <= 9; x += 2) c.push([x, 2, z]); for (let z = 15; z <= 19; z += 2) for (let x = 6; x <= 8; x += 2) c.push([x, 3, z]); return c; })(),
  bulk_freighter: (() => { const c = []; for (let z = 8; z <= 26; z += 2) for (let x = 5; x <= 9; x += 2) c.push([x, 2, z]); for (let z = 9; z <= 25; z += 2) for (let x = 6; x <= 8; x += 2) c.push([x, 3, z]); return c; })(),
};

// One cargo ship of the traffic as the economy sees it. `index` is its position in the traffic's ship list (the id
// used by holdFor / shipments().carrier.id), `t` everywhere is the port clock in seconds (vehicle ticks / TICK_RATE).
export class CargoShip {
  constructor(ship, index, model) {
    this.ship = ship; this.index = index; this.model = model;
    this.name = ship.name; this.cls = model.cls; this.pad = ship.pad; this.padPos = ship.padPos; this.deckY = ship.deckY;
    this.holdUnits = HOLD_UNITS[model.cls] || 400;
    this.holdCells = HOLD_CELLS[model.name] || HOLD_CELLS.light_freighter;
    this.origin = { x: model.w / 2, y: 0, z: model.d / 2 };
    this.period = ship.route.period;
  }
  phaseAt(t) { return padStateAt(this.ship, t).phase; }
  poseAt(t, out) { return routePose(this.ship.route, t + this.ship.offset, out); }
  nextPhase(phase, t) { return nextPhaseStart(this.ship, phase, t); }
  // seconds of the current fly leg left before the reservation call (null when not flying)
  flyRemaining(t) { const ph = this.phaseAt(t); if (ph !== 'fly') return null; const nt = this.nextPhase('reservation', t); return nt === null ? null : nt - t; }
  // model-space hold cell -> world position at pose (same rotation the instanced hull uses, yaw only: the crates are
  // drawn level with the deck when the ship is landed, and the crate layer applies pitch / roll itself in flight)
  cellToWorld(cell, pose, out) {
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw), dx = cell[0] + 0.5 - this.origin.x, dz = cell[2] + 0.5 - this.origin.z;
    out.x = pose.x + dx * c + dz * s; out.y = pose.y + cell[1]; out.z = pose.z - dx * s + dz * c;
    return out;
  }
}

// The cargo ships of a ship list (a ShipTraffic's `ships` or a fresh buildShips()).
export function cargoShipsOf(ships) {
  const models = shipModels();
  const out = [];
  ships.forEach((sh, i) => {
    if (sh.pad === null || sh.pad === undefined || sh.repair || sh.pad === 'frontier') return;
    const m = models[sh.type];
    if (m && CARGO_CLASSES.has(m.cls)) out.push(new CargoShip(sh, i, m));
  });
  return out;
}

// Arrivals provider for the game: reads game.shipTraffic lazily (it installs itself once the world exists) and the
// vehicle tick clock; returns [] until then, so no import can be loaded before the traffic exists.
export function gameArrivals(game) {
  let cached = null, source = null;
  return {
    ships() {
      const tr = game.shipTraffic;
      if (!tr) return [];
      if (source !== tr.ships) { source = tr.ships; cached = cargoShipsOf(tr.ships); }
      return cached;
    },
    time() { const v = game.vehicles; return v ? v.tickCount / TICK_RATE : 0; },
    shipRecord(index) { const tr = game.shipTraffic; return tr ? tr.ships[index] || null : null; },
  };
}

// Arrivals provider for headless runs (scripts/sim-economy.mjs, offline tests): the same deterministic ship list the
// game animates, driven by a clock the caller advances.
export function offlineArrivals(pads, deckY, layout) {
  const ships = buildShips(pads, deckY, null, layout);
  const cargo = cargoShipsOf(ships);
  const clock = { t: 0 };
  return { ships: () => cargo, time: () => clock.t, set: (t) => { clock.t = t; }, all: ships, shipRecord: (i) => ships[i] || null };
}

// An arrivals provider with no ships at all (rubric 15 #11: with the traffic absent nothing is imported).
export const noArrivals = () => ({ ships: () => [], time: () => 0, shipRecord: () => null });
