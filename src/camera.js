import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Camera rig. Two jobs:
//   1. the live chase / hood / orbit cameras you drive with
//   2. a set of frozen, named beauty-shot views used by tools/shots.mjs so
//      every iteration is judged on exactly the same framing
// ---------------------------------------------------------------------------

/**
 * Beauty views, expressed in the truck's local space (+X right, +Z nose).
 * `focus` is the distance the depth of field / framing is tuned around.
 */
export const VIEWS = {
  hero: { pos: [4.9, 1.62, 5.0], target: [0.1, 1.05, 0.5], fov: 36 },
  front: { pos: [1.15, 1.12, 7.0], target: [0.0, 1.15, 0.8], fov: 38 },
  rear: { pos: [-4.3, 1.78, -5.6], target: [0.0, 1.1, -1.4], fov: 40 },
  wheel: { pos: [2.35, 0.72, 2.85], target: [0.86, 0.48, 1.52], fov: 32 },
  detail: { pos: [1.55, 1.16, 4.55], target: [0.0, 1.06, 2.3], fov: 32 },
  interior: { pos: [0.38, 1.63, 0.02], target: [0.2, 1.32, 9.0], fov: 58 },
  forest: { pos: [1.2, 3.6, -10.5], target: [-0.2, 1.5, 9.0], fov: 46 },
  road: { pos: [2.15, 0.3, 4.3], target: [0.15, 0.95, -0.6], fov: 34 },
};

export const VIEW_NAMES = Object.keys(VIEWS);

export function createCameraRig(camera, { vehicle, terrain }) {
  const modes = ['chase', 'hood', 'orbit'];
  let mode = 'chase';
  let orbitAngle = 0.6;

  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const smoothPos = new THREE.Vector3();
  const smoothTarget = new THREE.Vector3();
  let initialised = false;

  const chaseOffset = new THREE.Vector3(0, 2.35, -7.2);
  const hoodOffset = new THREE.Vector3(0.36, 1.62, 0.05);

  function localToWorld(v, out) {
    return out.set(v[0], v[1], v[2]).applyMatrix4(vehicle.root.matrixWorld);
  }

  function update(dt, speed = 0) {
    vehicle.root.updateMatrixWorld();
    if (mode === 'orbit') {
      orbitAngle += dt * 0.14;
      const r = 8.4;
      _p.set(Math.sin(orbitAngle) * r, 2.5 + Math.sin(orbitAngle * 0.7) * 0.9, Math.cos(orbitAngle) * r);
      _p.applyMatrix4(vehicle.root.matrixWorld);
      localToWorld([0, 1.1, 0.2], _t);
      camera.fov = 42;
    } else if (mode === 'hood') {
      localToWorld([hoodOffset.x, hoodOffset.y, hoodOffset.z], _p);
      localToWorld([hoodOffset.x * 0.6, hoodOffset.y - 0.32, hoodOffset.z + 9], _t);
      camera.fov = 62;
    } else {
      // chase: pulls back and drops as speed rises
      const back = chaseOffset.z - Math.min(speed, 20) * 0.075;
      const up = chaseOffset.y + Math.min(speed, 20) * 0.012;
      localToWorld([0, up, back], _p);
      localToWorld([0, 1.15, 3.4], _t);
      camera.fov = 46 + Math.min(speed, 20) * 0.42;
      // never dip below the ground
      const groundY = terrain.heightAt(_p.x, _p.z) + 1.1;
      if (_p.y < groundY) _p.y = groundY;
    }

    if (!initialised) {
      smoothPos.copy(_p);
      smoothTarget.copy(_t);
      initialised = true;
    }
    const k = 1 - Math.exp(-dt * (mode === 'hood' ? 24 : 7));
    smoothPos.lerp(_p, k);
    smoothTarget.lerp(_t, 1 - Math.exp(-dt * 9));
    camera.position.copy(smoothPos);
    camera.lookAt(smoothTarget);
    camera.updateProjectionMatrix();
  }

  /** Snap to a frozen beauty view. Used by the screenshot tool. */
  function setView(name) {
    const v = VIEWS[name];
    if (!v) return false;
    vehicle.root.updateMatrixWorld();
    localToWorld(v.pos, _p);
    localToWorld(v.target, _t);
    // keep any exterior view above the dirt
    if (name !== 'interior') {
      const groundY = terrain.heightAt(_p.x, _p.z) + 0.16;
      if (_p.y < groundY) _p.y = groundY;
    }
    camera.position.copy(_p);
    camera.fov = v.fov;
    camera.lookAt(_t);
    camera.updateProjectionMatrix();
    smoothPos.copy(_p);
    smoothTarget.copy(_t);
    initialised = true;
    return true;
  }

  return {
    update,
    setView,
    get mode() {
      return mode;
    },
    set mode(m) {
      if (modes.includes(m)) mode = m;
    },
    cycle() {
      mode = modes[(modes.indexOf(mode) + 1) % modes.length];
      return mode;
    },
    modes,
  };
}
