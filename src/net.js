// Network adapter placeholder: gathers the deterministic state of everything that moves (doors,
// lifts, fighters, camera mode) so a future transport can broadcast / apply it.
export function createNetAdapter({ doors, lifts, traffic, rig }) {
  return {
    getState() {
      return { t: performance.now(), doors: doors.map((d) => d.getState()), lift: lifts.getState(), traffic: traffic ? traffic.getState() : null, camera: rig.getState() };
    },
    applyState(s) {
      if (!s) return;
      const byId = new Map(doors.map((d) => [d.id, d]));
      for (const ds of s.doors || []) {
        const d = byId.get(ds.id);
        if (d) d.setState(ds);
      }
      if (traffic && s.traffic) traffic.setState(s.traffic);
    },
  };
}
