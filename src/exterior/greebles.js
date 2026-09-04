// Surface detail for the exterior: instanced greebles on the terraces and in the edge trenches,
// turbolaser batteries, sensor arrays, antennas, hatches, docking bays and running lights, with
// distance-based LOD. Filled in by the exterior-detail workstream; this stub keeps the build green.
import * as THREE from "three";

export function buildGreebles(mats, opts = {}) {
  const group = new THREE.Group();
  group.name = "greebles";
  return {
    group,
    // called every frame with the camera position so LOD tiers can toggle
    update(cameraPos) {},
    stats: { instances: 0, drawCalls: 0 },
  };
}
