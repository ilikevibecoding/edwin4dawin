// Fighter traffic entry point (owner: hangar + fighters workstream). main.js constructs this once, before any
// room is built, and calls update() every frame in both camera modes (fighters fly around the hull outside).
// The hangar room calls attachHangar(ctx) when it builds so racks / tractor effects can be placed.
//
// Public interface (keep stable — other systems and tests rely on it):
//   traffic.fighters                -> array of fighter records { id, state, object, ... }
//   traffic.requestLaunch(id)       -> schedule a launch (returns false if not parked)
//   traffic.requestRecall(id)       -> bring a flying fighter home
//   traffic.setController(id, ctrl) -> ctrl.update(dt, fighter) overrides the scripted path (future NPC pilots)
//   traffic.on(event, handler)      -> 'launch' | 'depart' | 'return' | 'dock' | 'field_pass'
//   traffic.snapshot() / apply(s)   -> compact state for network sync
import * as THREE from "three";

export function createFighters({ scene, materials, audio = null }) {
  const group = new THREE.Group();
  group.name = "fighters";
  scene.add(group);
  const handlers = new Map();
  const traffic = {
    fighters: [],
    requestLaunch: () => false,
    requestRecall: () => false,
    setController: () => false,
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(fn);
    },
    emit(event, data) {
      for (const fn of handlers.get(event) || []) fn(data);
    },
    snapshot: () => ({ fighters: [] }),
    apply: () => {},
  };
  return {
    group,
    traffic,
    /** Called by the hangar room builder with its BuildContext. */
    attachHangar(ctx) {
      void ctx;
    },
    /** info: { mode: 'interior'|'exterior', cameraPos, playerPos, hangarVisible } */
    update(dt, t, info) {
      void dt;
      void t;
      void info;
    },
    stats() {
      return { fighters: traffic.fighters.length };
    },
  };
}
