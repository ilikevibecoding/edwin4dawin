// Atmosphere effects (owner: atmosphere / post / lighting workstream): dust motes in light shafts, volumetric-
// style light cones for the hangar and bridge, hologram flicker, engine heat shimmer. Constructed once by
// main.js; update() runs every frame with the current mode and camera. Keep everything pooled and cheap.
import * as THREE from "three";

export function createAtmosphere({ scene, camera, materials, rooms }) {
  const group = new THREE.Group();
  group.name = "atmosphere";
  scene.add(group);
  return {
    group,
    /** info: { mode, playerPos, currentRoom } */
    update(dt, t, info) {
      void dt;
      void t;
      void info;
      void camera;
      void materials;
      void rooms;
    },
  };
}
