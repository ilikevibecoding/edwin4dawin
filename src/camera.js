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
  // Stood off to 9 m and narrowed to hold the same framing. At 7 m the camera
  // was inside the headlamp cones, so at night the lit pool on the trail — the
  // whole subject of a night front shot — was always behind the lens.
  front: { pos: [1.35, 1.3, 9.0], target: [0.0, 1.15, 0.8], fov: 30 },
  rear: { pos: [-4.3, 1.78, -5.6], target: [0.0, 1.1, -1.4], fov: 40 },
  wheel: { pos: [2.35, 0.72, 2.85], target: [0.86, 0.48, 1.52], fov: 32 },
  detail: { pos: [1.55, 1.16, 4.55], target: [0.0, 1.06, 2.3], fov: 32 },
  // Sat too high and too far forward in the cab: the header crowded down into
  // frame and the windscreen came out a letterbox between it and the dash pad.
  // Swept four framings with tools/camvar.mjs and took the one that reads.
  interior: { pos: [0.3, 1.6, -0.16], target: [0.2, 1.24, 9.0], fov: 62 },
  forest: { pos: [1.2, 3.6, -10.5], target: [-0.2, 1.5, 9.0], fov: 46 },
  road: { pos: [1.82, 0.42, 4.5], target: [0.12, 0.98, -0.7], fov: 34 },
  // The graded mainline. `place` is a hint to whoever resets the world before a
  // capture: every other framing here is relative to a truck sitting on the
  // spur, and no camera placement can show a road the truck is not on.
  mainroad: { pos: [4.6, 2.5, -8.4], target: [-0.4, 1.1, 9.0], fov: 44, place: 'main', t: 0.06 },
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

/** How far a head will turn, and how far it drifts back once you let go. */
const LOOK_MAX_YAW = 1.45;
const LOOK_MIN_PITCH = -0.62;
const LOOK_MAX_PITCH = 0.72;
const LOOK_HOLD = 2.4;

/** What the camera key walks through. `interior` is a view, the rest are modes. */
const DRIVE_CAMS = ['chase', 'hood', 'interior', 'orbit'];

export function createCameraRig(camera, { vehicle, terrain }) {
  const modes = ['chase', 'hood', 'orbit'];
  let mode = 'chase';
  // set only in 'view' mode; names a live, truck-tracking beauty framing
  let viewName = null;

  // Free look from the driver's seat. `hold` keeps the camera where it was put
  // for a couple of seconds after the drag ends and then eases it forward
  // again, so nobody gets stranded facing the door card.
  const look = { yaw: 0, pitch: 0, hold: 0, driftYaw: 0, driftPitch: 0 };
  const firstPerson = () => mode === 'hood' || (mode === 'view' && viewName === 'interior');

  let orbitAz = 0.6;
  let orbitEl = 0.17;
  let orbitR = 8.4;
  let orbitAuto = true;

  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _r = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  const _m = new THREE.Matrix4();
  const smoothPos = new THREE.Vector3();
  const smoothTarget = new THREE.Vector3();
  let initialised = false;

  const chaseOffset = new THREE.Vector3(0, 2.35, -7.2);
  const hoodOffset = new THREE.Vector3(0.36, 1.62, 0.05);

  function localToWorld(v, out) {
    return out.set(v[0], v[1], v[2]).applyMatrix4(vehicle.root.matrixWorld);
  }

  /**
   * Same offset, but placed off the truck's heading alone with no body pitch or
   * roll. The chase camera hangs seven metres behind the axle, and on that lever
   * a fifth of a degree of body pitch is a centimetre of camera travel — it was
   * most of the vertical motion left on the chase view after the truck itself
   * had been calmed down. A trailing camera that ignores attitude is also just
   * what a racing game does.
   */
  function yawToWorld(v, heading, out) {
    const s = Math.sin(heading);
    const c = Math.cos(heading);
    const o = vehicle.root.position;
    return out.set(o.x + v[0] * c + v[2] * s, o.y + v[1], o.z - v[0] * s + v[2] * c);
  }

  /**
   * Keep the camera above the dirt without a kink where it starts and stops
   * being held up. A hard max leaves a corner in the position curve, and a
   * corner in position is a spike in acceleration — on the chase cam that was
   * most of the motion left after the truck itself was calmed down.
   */
  function clampToGround(p, clearance, soft = 0.5) {
    const floor = terrain.heightAt(p.x, p.z) + clearance;
    const d = p.y - floor;
    if (d > soft) return;
    p.y = floor + (d > -soft ? ((d + soft) * (d + soft)) / (4 * soft) : 0);
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

  /**
   * Swing the aim direction by the free-look offsets plus whatever the driver
   * would be doing anyway. Rotating the aim rather than the camera keeps the
   * eye where the seat puts it, so the cab moves across the view the way it
   * does when you turn your head rather than sliding sideways.
   */
  function applyLook(dt, steer, speed) {
    // A driver looks into the corner before turning into it. +X is the truck's
    // left, so a positive steer and a positive yaw are the same direction.
    const intoCorner = THREE.MathUtils.clamp(steer * 1.15, -0.5, 0.5) * THREE.MathUtils.clamp(speed / 6, 0, 1);
    look.driftYaw += (intoCorner - look.driftYaw) * (1 - Math.exp(-dt * 2.2));
    look.driftPitch += (-0.03 - look.driftPitch) * (1 - Math.exp(-dt * 2));

    if (look.hold > 0) look.hold -= dt;
    else {
      const k = 1 - Math.exp(-dt * 1.5);
      look.yaw -= look.yaw * k;
      look.pitch -= look.pitch * k;
    }

    const yaw = look.yaw + look.driftYaw;
    const pitch = look.pitch + look.driftPitch;
    if (Math.abs(yaw) < 1e-4 && Math.abs(pitch) < 1e-4) return;

    _d.copy(_t).sub(_p);
    const len = _d.length();
    if (len < 1e-4) return;
    _d.divideScalar(len);
    _d.applyAxisAngle(_up, yaw);
    _r.crossVectors(_d, _up);
    if (_r.lengthSq() > 1e-6) _d.applyAxisAngle(_r.normalize(), pitch);
    _t.copy(_p).addScaledVector(_d, len);
  }

  function update(dt, drive = 0) {
    const speed = typeof drive === 'number' ? drive : (drive?.speed ?? 0);
    const steer = typeof drive === 'number' ? 0 : (drive?.steer ?? 0);
    const heading = typeof drive === 'number' ? null : (drive?.heading ?? null);
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
      if (heading === null) {
        localToWorld([0, up, back], _p);
        localToWorld([0, 1.15, 3.4], _t);
      } else {
        yawToWorld([0, up, back], heading, _p);
        yawToWorld([0, 1.15, 3.4], heading, _t);
      }
      camera.fov = 46 + Math.min(speed, 20) * 0.42;
      clampToGround(_p, 1.1, 0.7);
    }

    const fp = firstPerson();
    if (fp) applyLook(dt, steer, speed);

    if (!initialised || (snap && !fp)) {
      smoothPos.copy(_p);
      smoothTarget.copy(_t);
      initialised = true;
    } else if (fp) {
      // The eye is bolted to the seat. Any position lag at all puts the camera
      // behind where the driver is sitting — a tenth of a second at ten metres
      // a second is a third of a metre — so only the aim eases, and that easing
      // is what makes a head turn read as a turn rather than a cut.
      smoothPos.copy(_p);
      smoothTarget.lerp(_t, 1 - Math.exp(-dt * 12));
    } else {
      smoothPos.lerp(_p, 1 - Math.exp(-dt * (mode === 'hood' ? 24 : 7)));
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
      // The cockpit is a view rather than a mode, but it belongs in the camera
      // key's rotation: it is the first-person seat, and free look only means
      // anything from there or from the bonnet.
      const cur = viewName === 'interior' ? 'interior' : DRIVE_CAMS.includes(mode) ? mode : 'chase';
      const next = DRIVE_CAMS[(DRIVE_CAMS.indexOf(cur) + 1) % DRIVE_CAMS.length];
      if (next === 'interior') {
        viewName = 'interior';
        mode = 'view';
      } else {
        mode = next;
        viewName = null;
        if (next === 'orbit') {
          seedOrbitFromCamera();
          orbitAuto = true;
        }
      }
      return next;
    },
    /** True when the camera is in the cab, where drag should turn the head. */
    get firstPerson() {
      return firstPerson();
    },
    /** Turn the driver's head. Deltas are in pixels, same sense as the orbit drag. */
    lookBy(dx, dy) {
      look.yaw = THREE.MathUtils.clamp(look.yaw + dx * 0.0042, -LOOK_MAX_YAW, LOOK_MAX_YAW);
      look.pitch = THREE.MathUtils.clamp(look.pitch + dy * 0.0034, LOOK_MIN_PITCH, LOOK_MAX_PITCH);
      look.hold = LOOK_HOLD;
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
