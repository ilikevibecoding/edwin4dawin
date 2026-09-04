// Network-friendly state: everything that moves (doors, lifts, fighter traffic, alert state) can be captured
// as a compact snapshot and re-applied. Scripted motion is a pure function of the shared clock, so peers stay
// in step by exchanging the clock offset plus these small deltas. No transport is implemented here.
export class SyncState {
  constructor({ doors, lifts, traffic = null, lighting = null }) {
    this.doors = doors;
    this.lifts = lifts;
    this.traffic = traffic;
    this.lighting = lighting;
    this.clock = 0;
  }
  tick(dt) {
    this.clock += dt;
  }
  snapshot() {
    return {
      t: +this.clock.toFixed(3),
      doors: this.doors.snapshot(),
      lift: this.lifts.snapshot(),
      traffic: this.traffic && this.traffic.snapshot ? this.traffic.snapshot() : null,
      alert: this.lighting ? this.lighting.alert : 0,
    };
  }
  apply(snap) {
    if (!snap) return;
    if (snap.doors) this.doors.apply(snap.doors);
    if (snap.traffic && this.traffic && this.traffic.apply) this.traffic.apply(snap.traffic);
    if (this.lighting && typeof snap.alert === "number") this.lighting.setAlert(snap.alert, true);
    if (typeof snap.t === "number") this.clock = snap.t;
  }
}
