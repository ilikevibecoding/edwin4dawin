// Reserved seams for a future gameplay / server layer (COORDINATION.md §9.6).
// Every export is a documented no-op today. sys-traffic calls each one at the moment described so the
// integration points are visible in the flight code and can be wired later without touching the spline
// logic. None of them may create THREE objects, block, or mutate the fighter it receives (yet).

/**
 * Per-frame flight-control seam for scripted movers.
 * Future: a server-authoritative or AI controller returns a correction {position, quaternion, throttle}
 * that replaces or nudges the spline sample (formation keeping, collision avoidance, wave-offs).
 * @param {object} fighter live fighter record ({id, type, state, position, quaternion, ...})
 * @param {number} dt frame step in seconds (0 while the harness clock is frozen)
 * @param {number} t module time in seconds
 * @returns {null} today; later a control override or null to keep the scripted sample
 */
export function flightControl(fighter, dt, t) {
  return null;
}

/**
 * Atmospheric-entry seam. Called when a craft leaves the ship's traffic volume (> 3 km on a departure).
 * Future: hand the craft to a planet-side simulation (re-entry heating shader, drag model, weather).
 * @param {object} fighter
 * @param {{altitude:number, speed:number}} info
 */
export function atmosphericEntry(fighter, info) {}

/**
 * Landing-gear seam. Called with extended=true when a craft enters the hangar volume on arrival and with
 * extended=false when a launching craft clears the keel. Future: animate skids/gear on the craft
 * geometry (the shuttle already has a per-instance `fold` channel that a gear channel would mirror).
 * @param {object} fighter
 * @param {boolean} extended
 */
export function landingGear(fighter, extended) {}

/**
 * Docking seam. Called once when a fighter settles into its rack slot (state -> "racked").
 * Future: refuel/rearm timers, maintenance scheduling, crew boarding, persistence to the server.
 * @param {object} fighter
 * @param {{id:string,pos:number[],yaw:number,tier?:number,side?:string}} slot
 */
export function docking(fighter, slot) {}

/**
 * Surface-contact seam. Called when a craft touches a pad or cradle (shuttle pad, maintenance cradles)
 * rather than a rack. Future: landing dust/light effects, pad clamps, deck-crew choreography.
 * @param {object} fighter
 * @param {{pos:number[], yaw:number}} pad
 */
export function surfaceContact(fighter, pad) {}

/**
 * Hangar-deploy seam. Called when a racked fighter is released for launch (clamps start opening).
 * Future: launch authorisation from flight control, scramble orders, squadron assignment.
 * @param {object} fighter
 * @param {{id:string,pos:number[],yaw:number}} slot
 */
export function hangarDeploy(fighter, slot) {}

/**
 * Camera seam for a future "follow a craft to the ground" mode. Never called by sys-traffic itself;
 * the camera system (A) may call it with a fighter id to request an orbit-to-ground transition.
 * @param {string} fighterId
 * @returns {boolean} false today (not implemented)
 */
export function cameraOrbitToGround(fighterId) {
  return false;
}

/**
 * Landing-zone registry seam. Called once at build to collect extra pads/cradles beyond the hangar's
 * rack slots, shuttle pad and maintenance cradles. Future: planet-side pads, other capital ships.
 * @returns {Array<{id:string,pos:number[],yaw:number,kind:string}>} empty today
 */
export function landingZones() {
  return [];
}
