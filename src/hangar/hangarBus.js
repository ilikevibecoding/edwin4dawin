// Tiny event bus shared by the fighter traffic and the hangar room builder. Traffic emits what it
// needs the bay to do (open the keel blast doors, run the tractor emitters while a fighter is in the
// shaft, extend / retract a rack ram); the hangar subscribes and animates. Keeping the two modules
// decoupled means either can be rebuilt or replaced (e.g. a networked replica) without the other
// knowing.
//
// Events (payloads are plain objects):
//   wellOpen   {}                                   keel blast doors should open
//   wellClose  {}                                   keel blast doors should close
//   passing    { id, dir: "out"|"in", x, z, duration }   a fighter is transiting the shaft
//   rack       { rack, ext, clamped }               rack ram extension in metres (0 = stowed)
//   launch / dock / flyby  { id, ... }              mirrored traffic events for anything else listening
const handlers = new Map();

export const hangarBus = {
  on(evt, cb) {
    if (!handlers.has(evt)) handlers.set(evt, new Set());
    handlers.get(evt).add(cb);
    return () => hangarBus.off(evt, cb);
  },
  off(evt, cb) {
    const set = handlers.get(evt);
    if (set) set.delete(cb);
  },
  emit(evt, payload = {}) {
    const set = handlers.get(evt);
    if (!set) return 0;
    for (const cb of [...set]) cb(payload);
    return set.size;
  },
  clear() {
    handlers.clear();
  },
};

export default hangarBus;
