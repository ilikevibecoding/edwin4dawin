// Reserved systems for the future flight / landing phase. These are real state machines with events
// and no-op physics so the ship, camera and hangar can be wired to them now without any landing
// gameplay existing yet. Nothing here moves the ship in this milestone.
class Emitter {
  constructor() {
    this.handlers = {};
  }
  on(evt, cb) {
    (this.handlers[evt] = this.handlers[evt] || []).push(cb);
    return this;
  }
  emit(evt, payload) {
    for (const cb of this.handlers[evt] || []) cb(payload);
  }
}

// Ship-level flight control: heading / velocity / throttle state, orbit vs atmosphere regime.
export class FlightController extends Emitter {
  constructor() {
    super();
    this.state = "station"; // station | cruise | approach | atmosphere | landing | landed
    this.throttle = 0;
    this.heading = { yaw: 0, pitch: 0, roll: 0 };
    this.velocity = 0;
  }
  setState(s) {
    if (s === this.state) return;
    const prev = this.state;
    this.state = s;
    this.emit("state", { prev, next: s });
  }
  update(dt) {
    /* no ship motion in this milestone */
  }
}

// Atmospheric entry: tracks altitude / density and drives heat-glow & shake hooks.
export class AtmosphereEntry extends Emitter {
  constructor() {
    super();
    this.altitude = Infinity;
    this.density = 0;
    this.heat = 0;
  }
  update(dt, altitude) {
    this.altitude = altitude;
    this.density = altitude < 120000 ? Math.min(1, (120000 - altitude) / 100000) : 0;
    this.heat = Math.max(0, this.heat - dt * 0.2);
  }
}

// Landing supports: a Star Destroyer has none in canon; these model repulsor pylons / mooring points.
export class LandingGear extends Emitter {
  constructor(points = []) {
    super();
    this.points = points; // [{ id, pos:[x,y,z], deployed }]
    this.deployed = false;
    this.progress = 0;
  }
  deploy() {
    this.deployed = true;
    this.emit("deploy");
  }
  retract() {
    this.deployed = false;
    this.emit("retract");
  }
  update(dt) {
    const target = this.deployed ? 1 : 0;
    this.progress += Math.sign(target - this.progress) * Math.min(Math.abs(target - this.progress), dt * 0.5);
  }
}

// Docking with another vessel / station: ports are defined on the hull, state machine only.
export class DockingSystem extends Emitter {
  constructor(ports = []) {
    super();
    this.ports = ports; // [{ id, pos, normal, size }]
    this.state = "free"; // free | approaching | soft | hard
  }
  request(portId) {
    this.state = "approaching";
    this.emit("approach", portId);
  }
  update(dt) {}
}

// Surface contact: which parts of the hull would touch ground first, and the contact events.
export class SurfaceContact extends Emitter {
  constructor(probes = []) {
    super();
    this.probes = probes; // [{ id, pos }]
    this.contacts = [];
  }
  update(dt, groundHeightAt) {
    if (!groundHeightAt) return;
    this.contacts = this.probes.filter((p) => groundHeightAt(p.pos[0], p.pos[2]) >= p.pos[1]);
  }
}

// Hangar deployment: coordinates bay doors, tractor beams and fighter traffic for surface operations.
export class HangarDeployment extends Emitter {
  constructor(traffic = null) {
    super();
    this.traffic = traffic;
    this.mode = "space"; // space | atmosphere | ground
  }
  setMode(m) {
    this.mode = m;
    this.emit("mode", m);
  }
}

// Camera staging for orbit -> atmosphere -> ground. Each stage names camera limits and transitions.
export class CameraStage extends Emitter {
  constructor() {
    super();
    this.stage = "orbit"; // orbit | atmosphere | ground
    this.stages = {
      orbit: { minDistance: 25, maxDistance: 14000, fog: 0 },
      atmosphere: { minDistance: 40, maxDistance: 6000, fog: 0.00005 },
      ground: { minDistance: 10, maxDistance: 3000, fog: 0.0002 },
    };
  }
  setStage(s) {
    if (!this.stages[s]) return;
    this.stage = s;
    this.emit("stage", s);
  }
}

// Planetary landing zones: named pads with world transforms; empty until planets exist.
export class LandingZoneRegistry {
  constructor() {
    this.zones = new Map();
  }
  add(id, { planet, pos, radius, heading }) {
    this.zones.set(id, { id, planet, pos, radius, heading });
  }
  list() {
    return [...this.zones.values()];
  }
}

export function createFlightSystems(traffic) {
  return {
    flight: new FlightController(),
    atmosphere: new AtmosphereEntry(),
    gear: new LandingGear(),
    docking: new DockingSystem(),
    contact: new SurfaceContact(),
    hangarDeploy: new HangarDeployment(traffic),
    cameraStage: new CameraStage(),
    landingZones: new LandingZoneRegistry(),
  };
}
