import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Camera rig. Three jobs:
//   1. the live chase / hood / orbit cameras you drive with
//   2. the named views again, but tracking the moving truck, so a click can put
//      you on the nose or in the cab without stopping the drive
//   3. the same views frozen, for tools/shots.mjs, so every iteration is judged
//      on exactly the same framing
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
  // Sat too high and too far forward in the cab: the header crowded down into
  // frame and the windscreen came out a letterbox between it and the dash pad.
  // Swept four framings with tools/camvar.mjs and took the one that reads.
  interior: { pos: [0.3, 1.6, -0.16], target: [0.2, 1.24, 9.0], fov: 62 },
  forest: { pos: [1.2, 3.6, -10.5], target: [-0.2, 1.5, 9.0], fov: 46 },
  road: { pos: [1.82, 0.42, 4.5], target: [0.12, 0.98, -0.7], fov: 34 },
};

export const VIEW_NAMES = Object.keys(VIEWS);

/**
 * What a click walks through. Deliberately shorter than VIEW_NAMES — clicking
 * is for looking round the truck, and `detail`, `forest` and `road` are framings
 * that only make sense held still for a screenshot. The nose comes first,
 * because that is the one you cannot get to from any of the drive cameras.
 */
export const VIEW_TOUR = ['front', 'hero', 'rear', 'wheel', 'interior'];

const ORBIT_PIVOT = [0, 1.1, 0.2];
const ORBIT_MIN_R = 3.6;
const ORBIT_MAX_R = 22;
const ORBIT_MIN_EL = -0.06;
const ORBIT_MAX_EL = 1.15;

export function createCameraRig(camera, { vehicle, terrain }) {
  const modes = ['chase', 'hood', 'orbit'];
  let mode = 'chase';
  // set only in 'view' mode; names a live, truck-tracking beauty framing
  let viewName = null;

  let orbitAz = 0.6;
  let orbitEl = 0.17;
  let orbitR = 8.4;
  let orbitAuto = true;

  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const smoothPos = new THREE.Vector3();
  const smoothTarget = new THREE.Vector3();
  let initialised = false;

  const chaseOffset = new THREE.Vector3(0, 2.35, -7.2);
  const hoodOffset = new THREE.Vector3(0.36, 1.62, 0.05);

  function localToWorld(v, out) {
    return out.set(v[0], v[1], v[2]).applyMatrix4(vehicle.root.matrixWorld);
  }

  function clampToGround(p, clearance) {
    const groundY = terrain.heightAt(p.x, p.z) + clearance;
    if (p.y < groundY) p.y = groundY;
  }

  /**
   * Read the current camera back into orbit angles so taking hold of the view
   * starts from wherever it already is. Without this, the first drag out of a
   * beauty view snaps to whatever the orbit was left at, which reads as the
   * click having done something rather than the drag.
   */
  function seedOrbitFromCamera() {
    _m.copy(vehicle.root.matrixWorld).invert();
    _p.copy(camera.position).applyMatrix4(_m);
    const dx = _p.x - ORBIT_PIVOT[0];
    const dy = _p.y - ORBIT_PIVOT[1];
    const dz = _p.z - ORBIT_PIVOT[2];
    const r = Math.hypot(dx, dy, dz);
    if (r < 1e-3) return;
    orbitR = THREE.MathUtils.clamp(r, ORBIT_MIN_R, ORBIT_MAX_R);
    orbitAz = Math.atan2(dx, dz);
    orbitEl = THREE.MathUtils.clamp(Math.asin(dy / r), ORBIT_MIN_EL, ORBIT_MAX_EL);
  }

  function enterOrbit() {
    if (mode !== 'orbit') {
      seedOrbitFromCamera();
      mode = 'orbit';
      viewName = null;
    }
    orbitAuto = false;
  }

  function update(dt, speed = 0) {
    vehicle.root.updateMatrixWorld();
    // A named view is defined relative to the truck, so smoothing it would only
    // add lag to a framing that is already locked — those snap instead.
    let snap = false;

    if (mode === 'view') {
      const v = VIEWS[viewName];
      localToWorld(v.pos, _p);
      localToWorld(v.target, _t);
      camera.fov = v.fov;
      if (viewName !== 'interior') clampToGround(_p, 0.16);
      snap = true;
    } else if (mode === 'orbit') {
      if (orbitAuto) orbitAz += dt * 0.14;
      const ce = Math.cos(orbitEl);
      _p.set(
        Math.sin(orbitAz) * ce * orbitR + ORBIT_PIVOT[0],
        Math.sin(orbitEl) * orbitR + ORBIT_PIVOT[1],
        Math.cos(orbitAz) * ce * orbitR + ORBIT_PIVOT[2],
      );
      _p.applyMatrix4(vehicle.root.matrixWorld);
      localToWorld(ORBIT_PIVOT, _t);
      camera.fov = 42;
      clampToGround(_p, 0.5);
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

    if (!initialised || snap) {
      smoothPos.copy(_p);
      smoothTarget.copy(_t);
      initialised = true;
    } else {
      const k = 1 - Math.exp(-dt * (mode === 'hood' ? 24 : 7));
      smoothPos.lerp(_p, k);
      smoothTarget.lerp(_t, 1 - Math.exp(-dt * 9));
    }
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
      if (modes.includes(m)) {
        mode = m;
        viewName = null;
      }
    },
    /** Name of the live beauty view, or null when a drive camera is up. */
    get view() {
      return viewName;
    },
    /** What the HUD shows. */
    get label() {
      const n = viewName ?? mode;
      return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${viewName ? 'view' : 'cam'}`;
    },
    cycle() {
      // 'view' is not in `modes`, so indexOf gives -1 and this lands on chase —
      // which is what you want from a camera key pressed while parked on a view.
      mode = modes[(modes.indexOf(mode) + 1) % modes.length];
      viewName = null;
      if (mode === 'orbit') {
        seedOrbitFromCamera();
        orbitAuto = true;
      }
      return mode;
    },
    /** Step through VIEW_TOUR, then hand back to the chase cam. */
    nextView() {
      const next = (viewName ? VIEW_TOUR.indexOf(viewName) : -1) + 1;
      if (next >= VIEW_TOUR.length) {
        mode = 'chase';
        viewName = null;
      } else {
        viewName = VIEW_TOUR[next];
        mode = 'view';
      }
      return viewName ?? mode;
    },
    /** Jump straight to a named view and track the truck from it. */
    showView(name) {
      if (!VIEWS[name]) return null;
      viewName = name;
      mode = 'view';
      return name;
    },
    /** Drag to swing round the truck. Deltas are in pixels. */
    orbitBy(dx, dy) {
      enterOrbit();
      orbitAz -= dx * 0.005;
      orbitEl = THREE.MathUtils.clamp(orbitEl + dy * 0.005, ORBIT_MIN_EL, ORBIT_MAX_EL);
    },
    /** Wheel to pull in or back off. */
    zoomBy(delta) {
      enterOrbit();
      orbitR = THREE.MathUtils.clamp(orbitR * (1 + delta * 0.0012), ORBIT_MIN_R, ORBIT_MAX_R);
    },
    modes,
  };
}
