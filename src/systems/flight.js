// Flight-control state (reserved for the future flight / landing phases). Today it only owns the
// slow heading drift that the far field renders; later phases add acceleration, attitude control,
// atmospheric entry and approach modes without touching the renderer.
export function createFlightControl(space) {
  const state = { mode: "cruise", heading: 0, velocity: 0, altitude: null, target: null };
  return {
    state,
    modes: ["cruise", "manoeuvre", "orbit", "atmospheric_entry", "approach", "landing", "docked"],
    setMode(m) {
      state.mode = m;
    },
    update(dt) {
      state.heading = space.state.time; // the far-field rotation is the heading for now
      void dt;
    },
  };
}
