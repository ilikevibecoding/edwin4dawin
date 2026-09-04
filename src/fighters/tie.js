// STUB (workstream FIGHTERS): procedural TIE-style fighter. Must export
//   buildTieGeometry(materialsKeys?) -> { parts: [{ geometry, matKey }], bounds }   (parts merged per material)
//   createTiePool(materials, count) -> { group, setInstance(i, matrix, visible), count }
// Envelope from spec.HANGAR.tie: ball radius 1.75, wing half-span 3.3, wing 7.6 tall x 4.4 wide.
import * as THREE from "three";
export function createTiePool(materials, count) {
  const group = new THREE.Group();
  group.name = "tie_pool_stub";
  return { group, count, setInstance() {}, materials };
}
