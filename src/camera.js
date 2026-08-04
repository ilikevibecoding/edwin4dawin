import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Three ways to look at the ship:
 *   orbit - free drag/zoom around her, the pivot follows the hull
 *   chase - a spring-damped camera off the quarter
 *   helm  - standing at the wheel, looking down the deck
 */
export const CAMERA_MODES = ['orbit', 'chase', 'helm'];

export function createCameraRig(camera, domElement, ship) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 14;
  controls.maxDistance = 260;
  controls.maxPolarAngle = Math.PI * 0.495;
  const DEFAULT_TARGET = new THREE.Vector3(0, 7, 0);
  controls.target.copy(ship.root.position).add(DEFAULT_TARGET);

  // Portrait screens need to stand further off to fit her rig in frame.
  const framing = camera.aspect < 1 ? 1.45 : 1;
  const HOME_OFFSET = new THREE.Vector3(-30, 20, -42).multiplyScalar(framing);
  camera.position.copy(HOME_OFFSET);
  controls.update();

  let mode = 'orbit';
  const previousShipPosition = ship.root.position.clone();
  const targetOffset = DEFAULT_TARGET.clone();
  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const smoothLook = new THREE.Vector3();

  function setMode(next) {
    mode = next;
    controls.enabled = mode === 'orbit';
    if (mode === 'orbit') {
      const offset = HOME_OFFSET.clone();
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), ship.state.heading);
      camera.position.copy(ship.root.position).add(offset);
      targetOffset.copy(DEFAULT_TARGET);
      controls.target.copy(ship.root.position).add(targetOffset);
      controls.update();
    }
    // The ship may have just been teleported (reset); forget the old position
    // so the next frame does not apply the jump as a camera delta.
    previousShipPosition.copy(ship.root.position);
  }

  function cycle() {
    setMode(CAMERA_MODES[(CAMERA_MODES.indexOf(mode) + 1) % CAMERA_MODES.length]);
    return mode;
  }

  function update(dt) {
    const shipPosition = ship.root.position;

    if (mode === 'orbit') {
      // Carry the orbit with the ship so she never sails out from under it,
      // while keeping whatever pan offset the user has dialled in. A jump too
      // large to be sailing means she was teleported, so re-frame instead.
      const delta = shipPosition.clone().sub(previousShipPosition);
      if (delta.lengthSq() > 900) {
        setMode('orbit');
        return;
      }
      camera.position.add(delta);
      targetOffset.copy(controls.target).sub(previousShipPosition);
      controls.target.copy(shipPosition).add(targetOffset);
      controls.update();
    } else if (mode === 'chase') {
      desired.set(0, 13, -34).applyEuler(new THREE.Euler(0, ship.state.heading, 0)).add(shipPosition);
      desired.y = Math.max(desired.y, shipPosition.y + 6);
      camera.position.lerp(desired, Math.min(dt * 2.2, 1));
      lookAt.copy(shipPosition).add(new THREE.Vector3(0, 9, 0));
      smoothLook.lerp(lookAt, Math.min(dt * 3.5, 1));
      camera.lookAt(smoothLook);
    } else {
      // On the quarterdeck abaft the wheel, off to starboard of the mizzen: a
      // square-rigger's own canvas blocks any view straight down the deck, so
      // this looks past the helm and out over the lee rail.
      const offset = new THREE.Vector3(2.5, 7.5, -12.8).applyEuler(ship.root.rotation);
      camera.position.copy(shipPosition).add(offset);
      lookAt
        .copy(shipPosition)
        .add(new THREE.Vector3(0.8, 6.0, 34).applyEuler(ship.root.rotation));
      smoothLook.lerp(lookAt, Math.min(dt * 5, 1));
      camera.lookAt(smoothLook);
    }

    previousShipPosition.copy(shipPosition);
  }

  smoothLook.copy(ship.root.position);

  return {
    controls,
    update,
    cycle,
    setMode,
    get mode() {
      return mode;
    },
  };
}
