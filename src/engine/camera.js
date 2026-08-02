/**
 * Shot list evaluation.
 *
 * A scene declares its camera work as a list of shots. Each shot interpolates a
 * position and a look-at target over its duration, optionally with a lens
 * change, handheld shake, or a target object to track.
 */
import * as THREE from 'three';

export const ease = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicIn: (t) => t * t * t,
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -9 * t)),
  expoIn: (t) => (t <= 0 ? 0 : Math.pow(2, 9 * (t - 1))),
  smooth: (t) => t * t * (3 - 2 * t),
  back: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Deterministic value noise for handheld shake. */
function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n) => {
    let s = Math.sin((n * 127.1 + seed * 311.7) * 43758.5453);
    return s - Math.floor(s);
  };
  const a = h(i), b = h(i + 1);
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}

/**
 * @param {Array} list shots:
 *   {
 *     dur,                              // seconds
 *     from: [x,y,z] | fn(t)->Vector3,   // camera position at shot start
 *     to:   [x,y,z] | fn,               // camera position at shot end (optional)
 *     look: [x,y,z] | fn,               // look target at start
 *     lookTo: [x,y,z] | fn,             // look target at end (optional)
 *     fov, fovTo,
 *     roll, rollTo,                     // radians
 *     shake: 0..1, shakeFreq,
 *     ease: 'cubicOut' | fn,
 *   }
 * @returns {(camera, tLocal, ctx) => void}
 */
export function shots(list) {
  let acc = 0;
  const timed = list.map((s) => {
    const entry = { ...s, start: acc, end: acc + s.dur };
    acc += s.dur;
    return entry;
  });
  const total = acc;

  const resolve = (v, t, ctx) => {
    if (!v) return null;
    if (typeof v === 'function') return v(t, ctx);
    if (v.isVector3) return _a.copy(v);
    return _a.set(v[0], v[1], v[2]);
  };

  const fn = (camera, t, ctx) => {
    let s = timed[timed.length - 1];
    for (const c of timed) if (t >= c.start && t < c.end) { s = c; break; }
    const raw = Math.min(Math.max((t - s.start) / Math.max(s.dur, 1e-6), 0), 1);
    const e = typeof s.ease === 'function' ? s.ease : ease[s.ease || 'inOut'];
    const k = e(raw);

    const p0 = resolve(s.from, t, ctx)?.clone();
    const p1 = s.to ? resolve(s.to, t, ctx).clone() : p0;
    if (p0) camera.position.copy(p0).lerp(p1, k);

    const l0 = resolve(s.look, t, ctx)?.clone();
    const l1 = s.lookTo ? resolve(s.lookTo, t, ctx).clone() : l0;
    if (l0) {
      _b.copy(l0).lerp(l1, k);
      camera.lookAt(_b);
    }

    if (s.fov != null) {
      const f = s.fov + ((s.fovTo ?? s.fov) - s.fov) * k;
      if (camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); }
    }
    if (s.roll != null) {
      camera.rotateZ(s.roll + ((s.rollTo ?? s.roll) - s.roll) * k);
    }
    if (s.shake) {
      const f = s.shakeFreq || 9;
      const amp = s.shake;
      camera.rotateX(noise1(t * f, 1) * 0.012 * amp);
      camera.rotateY(noise1(t * f, 2) * 0.012 * amp);
      camera.rotateZ(noise1(t * f * 0.7, 3) * 0.008 * amp);
      camera.position.x += noise1(t * f * 1.3, 4) * 0.05 * amp;
      camera.position.y += noise1(t * f * 1.1, 5) * 0.05 * amp;
    }
  };
  fn.total = total;
  fn.shots = timed;
  return fn;
}

/** Follow an object from a fixed offset in its local frame. */
export function chase(target, offset, damp = 0.12) {
  const cur = new THREE.Vector3();
  let init = false;
  return (t) => {
    const want = _a.set(offset[0], offset[1], offset[2]).applyQuaternion(target.quaternion).add(target.position);
    if (!init) { cur.copy(want); init = true; }
    else cur.lerp(want, damp);
    return cur.clone();
  };
}

/** Add a persistent low-frequency drift so locked-off shots feel alive. */
export function drift(base, amp = 0.4, speed = 0.13, seed = 7) {
  return (t) => new THREE.Vector3(
    base[0] + noise1(t * speed, seed) * amp,
    base[1] + noise1(t * speed * 1.31, seed + 1) * amp,
    base[2] + noise1(t * speed * 0.77, seed + 2) * amp
  );
}
