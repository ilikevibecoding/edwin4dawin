// Landing / docking reservations (future phase): landing supports on the ventral hull, docking ports,
// surface-contact points, planetary landing zones. Data + interfaces only; no gameplay yet.
import { VENTRAL, HANGAR, TOWER } from "../spec.js";
export const LANDING_SUPPORTS = [
  { id: "fwd", x: 0, z: -520 },
  { id: "port", x: -300, z: 250 },
  { id: "stbd", x: 300, z: 250 },
  { id: "aft", x: 0, z: 480 },
];
export const DOCKING_PORTS = [
  { id: "hangar_mouth", kind: "hangar", pos: [0, HANGAR.floorY, 10], size: [60, 100] },
  { id: "ventral_recess", kind: "docking", pos: [VENTRAL.dockingRecess.x, -80, VENTRAL.dockingRecess.z] },
  { id: "tower_aft", kind: "docking", pos: [0, (TOWER.bridge.y0 + TOWER.bridge.y1) / 2, TOWER.bridge.z1] },
];
export const LANDING_ZONES = []; // populated when planets become destinations
export function createLandingSystem() {
  return { supports: LANDING_SUPPORTS, ports: DOCKING_PORTS, zones: LANDING_ZONES, state: { gear: "retracted", contact: false }, deploy() {}, retract() {} };
}
