// Reserved systems for future phases (flight, atmospheric entry, landing, docking). Each is an interface
// with a no-op implementation registered under a stable name, so later work plugs into these seams
// instead of rewiring the ship. Nothing here changes gameplay in this milestone.
import { RESERVED_SYSTEMS } from "../config/shipSpec.js";

/** Base class: every reserved system reports readiness and receives the frame tick. */
export class ReservedSystem {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.enabled = false; // future phases flip this
  }
  /** Called once with the world handles ({ scene, interior, exterior, traffic, camera, player }). */
  attach(world) {
    this.world = world;
  }
  update(_dt) {}
  /** Serialisable snapshot for save / network sync. */
  serialize() {
    return { name: this.name, enabled: this.enabled };
  }
}

/** Flight control: thrust / attitude commands for the ship itself (orbit -> transit). */
export class FlightControlSystem extends ReservedSystem {
  constructor() {
    super("flightControl", "Ship thrust and attitude; owns the navigation state the bridge displays will read.");
    this.velocity = [0, 0, 0];
    this.heading = 0;
  }
  setThrottle(_t) {}
  setHeading(_yaw, _pitch) {}
}

/** Atmospheric entry: heating, drag, effects, and the handoff from vacuum to atmosphere. */
export class AtmosphericEntrySystem extends ReservedSystem {
  constructor() {
    super("atmosphericEntry", "Entry heating / drag envelope and the vacuum-to-air handoff.");
    this.altitude = Infinity;
  }
}

/** Landing supports: struts / pads that deploy from the keel (reserved geometry hooks under the keel block). */
export class LandingSupportsSystem extends ReservedSystem {
  constructor() {
    super("landingSupports", "Deployable landing struts under the keel block; positions reserved in shipSpec.");
    this.deployed = 0; // 0..1
  }
  deploy(_amount) {}
}

/** Docking: hard-points and the approach corridor for docking another vessel to the ship. */
export class DockingSystem extends ReservedSystem {
  constructor() {
    super("docking", "Dorsal / ventral docking hard-points and approach guidance.");
    this.ports = [{ id: "dorsal-1", position: [0, 78, 200], free: true }, { id: "ventral-1", position: [0, -82, 300], free: true }];
  }
}

/** Surface contact: ground collision / settling once landing supports touch down. */
export class SurfaceContactSystem extends ReservedSystem {
  constructor() {
    super("surfaceContact", "Ground contact resolution for the landed ship.");
    this.grounded = false;
  }
}

/** Hangar deployment: opening the bays for ground operations, ramps and lifts to the surface. */
export class HangarDeploymentSystem extends ReservedSystem {
  constructor() {
    super("hangarDeployment", "Ground-mode hangar configuration: bay doors, ramps, surface lifts.");
  }
  setGroundMode(_on) {}
}

/** Descent camera: orbit -> atmosphere -> ground camera transition (extends camera/modes.js). */
export class DescentCameraSystem extends ReservedSystem {
  constructor() {
    super("descentCamera", "Camera path for orbit -> atmosphere -> ground; hooks into ModeManager transitions.");
  }
}

/** Landing zones: registry of future planetary landing sites. */
export class LandingZonesSystem extends ReservedSystem {
  constructor() {
    super("landingZones", "Registry of planetary landing zones (empty in this milestone).");
    this.zones = [];
  }
  register(zone) {
    this.zones.push(zone);
  }
}

export function createReservedSystems() {
  const systems = [
    new FlightControlSystem(),
    new AtmosphericEntrySystem(),
    new LandingSupportsSystem(),
    new DockingSystem(),
    new SurfaceContactSystem(),
    new HangarDeploymentSystem(),
    new DescentCameraSystem(),
    new LandingZonesSystem(),
  ];
  const byName = Object.fromEntries(systems.map((s) => [s.name, s]));
  for (const name of RESERVED_SYSTEMS) if (!byName[name]) throw new Error("reserved system missing: " + name);
  return {
    systems,
    byName,
    attach(world) {
      for (const s of systems) s.attach(world);
    },
    update(dt) {
      for (const s of systems) if (s.enabled) s.update(dt);
    },
    describe() {
      return systems.map((s) => ({ name: s.name, description: s.description, enabled: s.enabled }));
    },
  };
}
