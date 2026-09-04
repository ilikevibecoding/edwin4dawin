// Reserved system interfaces for the next phases (flight, atmospheric entry, landing, docking,
// planetary surfaces). Nothing here changes the ship; these are the contracts the hangar traffic,
// camera director and exterior already call into so those phases can be added without rebuilding.
//
// Each system exposes `state`, `update(dt, world)` and typed hooks. Implementations are no-ops that
// record calls so tests can assert the ship is wired for them.

class Recorder {
  constructor(name) {
    this.name = name;
    this.calls = [];
    this.state = "idle";
  }
  record(method, args) {
    this.calls.push({ method, args, t: performance.now() });
    if (this.calls.length > 100) this.calls.shift();
  }
}

/** Ship-level flight control: heading / velocity / attitude commands for the whole destroyer. */
export class FlightControl extends Recorder {
  constructor() {
    super("FlightControl");
    this.heading = { yaw: 0, pitch: 0, roll: 0 };
    this.velocity = 0;
  }
  setCourse(yaw, pitch, roll) {
    this.record("setCourse", [yaw, pitch, roll]);
    Object.assign(this.heading, { yaw, pitch, roll });
  }
  setThrottle(v) {
    this.record("setThrottle", [v]);
    this.velocity = v;
  }
  update() {}
}

/** Atmospheric entry: heating / drag / sky-colour phases when the ship (or a craft) descends. */
export class AtmosphericEntry extends Recorder {
  constructor() {
    super("AtmosphericEntry");
    this.altitude = Infinity;
  }
  setAltitude(m) {
    this.record("setAltitude", [m]);
    this.altitude = m;
    this.state = m === Infinity ? "idle" : m > 80000 ? "approach" : m > 2000 ? "entry" : "atmosphere";
  }
  update() {}
}

/** Landing supports / gear on the ship and on hangar craft (deploy / retract with animation hooks). */
export class LandingGear extends Recorder {
  constructor() {
    super("LandingGear");
    this.deployed = false;
  }
  deploy() {
    this.record("deploy", []);
    this.deployed = true;
  }
  retract() {
    this.record("retract", []);
    this.deployed = false;
  }
  update() {}
}

/** Docking: capture / hard-dock / undock cycle for shuttles and the ship's own docking rings. */
export class Docking extends Recorder {
  constructor() {
    super("Docking");
    this.ports = [];
  }
  registerPort(id, worldPos, facing) {
    this.record("registerPort", [id]);
    this.ports.push({ id, worldPos, facing, occupied: false });
  }
  requestDock(craftId, portId) {
    this.record("requestDock", [craftId, portId]);
    return this.ports.find((p) => p.id === portId && !p.occupied) || null;
  }
  update() {}
}

/** Surface contact: ground / deck contact events for landed craft and the ship's supports. */
export class SurfaceContact extends Recorder {
  constructor() {
    super("SurfaceContact");
  }
  onContact(fn) {
    this.record("onContact", []);
    this.listener = fn;
  }
  update() {}
}

/** Hangar deployment: sorties (launch N fighters), recovery, and bay-door scheduling. */
export class HangarDeployment extends Recorder {
  constructor(traffic) {
    super("HangarDeployment");
    this.traffic = traffic;
  }
  sortie(count = 2) {
    this.record("sortie", [count]);
    return this.traffic ? this.traffic.requestLaunch(count) : 0;
  }
  recall() {
    this.record("recall", []);
    if (this.traffic) this.traffic.requestRecall();
  }
  update() {}
}

/** Camera phases for orbit → atmosphere → ground transitions (the director will consume these). */
export class CameraTransition extends Recorder {
  constructor() {
    super("CameraTransition");
    this.phase = "orbit";
  }
  setPhase(p) {
    this.record("setPhase", [p]);
    this.phase = p;
  }
  update() {}
}

/** Planetary landing zones: registered targets with approach vectors. */
export class LandingZones extends Recorder {
  constructor() {
    super("LandingZones");
    this.zones = [];
  }
  register(zone) {
    this.record("register", [zone.id]);
    this.zones.push(zone);
  }
  update() {}
}

export function createReservedSystems(traffic) {
  const systems = {
    flight: new FlightControl(),
    entry: new AtmosphericEntry(),
    gear: new LandingGear(),
    docking: new Docking(),
    contact: new SurfaceContact(),
    hangar: new HangarDeployment(traffic),
    cameraTransition: new CameraTransition(),
    landingZones: new LandingZones(),
  };
  return {
    ...systems,
    update(dt, world) {
      for (const s of Object.values(systems)) if (s.update) s.update(dt, world);
    },
    summary() {
      return Object.fromEntries(Object.entries(systems).map(([k, s]) => [k, { state: s.state, calls: s.calls.length }]));
    },
  };
}
