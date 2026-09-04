// Reserved interfaces for the future flight / landing phase. Nothing here moves the ship yet; these are the
// hooks the ship, hangar and camera systems already call or expose so that a later milestone can implement
// flight control, atmospheric entry, landing supports, docking, surface contact, hangar deployment, the
// orbit→atmosphere→ground camera transition and planetary landing zones without rebuilding what exists.

/** Ship-level flight state (kinematics are the future flight model's responsibility). */
export class FlightState {
  constructor() {
    this.phase = "orbit"; // 'orbit' | 'transit' | 'atmosphere' | 'approach' | 'landed'
    this.velocity = 0; // m/s along the ship's forward axis
    this.altitude = null; // metres above a surface when a planet is the reference
    this.landingGear = { deployed: false, progress: 0 }; // landing supports (see LandingSupports)
    this.dockingClamps = { engaged: false };
    this.surfaceContact = false;
  }
}

/** Landing supports: animated struts under the hull. Positions are reserved along the ventral plateau. */
export const LANDING_SUPPORTS = [
  { id: "fwd", pos: [0, -30, -600] },
  { id: "port", pos: [-210, -40, 140] },
  { id: "stbd", pos: [210, -40, 140] },
  { id: "aft", pos: [0, -60, 420] },
];

/** Camera phases for a future orbit → atmosphere → ground transition (durations in seconds). */
export const LANDING_CAMERA_PLAN = [
  { phase: "orbit", desc: "wide exterior orbit, planet limb below", dur: 4 },
  { phase: "entry", desc: "chase camera behind the stern, plasma sheath shader", dur: 8 },
  { phase: "descent", desc: "low orbit over terrain, hangar bay opens", dur: 6 },
  { phase: "touchdown", desc: "ground camera, dust and supports", dur: 5 },
];

/** Placeholder planetary landing zones (ids only; terrain is a future workstream). */
export const LANDING_ZONES = [
  { id: "imperial_base_alpha", kind: "landing pad", size: [2200, 1200] },
  { id: "desert_flats", kind: "open terrain", size: [4000, 4000] },
];

/** Hangar deployment hook: the hangar's traffic controller implements these on the fighter side. */
export const HANGAR_DEPLOYMENT_API = ["requestLaunch(id)", "requestRecall(id)", "setController(id, controller)", "on(event, handler)", "snapshot()", "apply(snapshot)"];
