// Effect objects for sys-traffic: tractor beams (one mesh, four shader-stretched cones), engine glow
// (one InstancedMesh of additive billboards) and beacons/landing lights (one Points cloud). Each is exactly
// one draw call; all animation is driven by the t handed to update(). Nothing here creates THREE.Lights.
import * as THREE from "three";
import { buildBeamCones } from "./craft.js";

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/** Shaft column the tractor emitters cover: inside the aperture hole in x/z, y between -100 and -62. */
export const SHAFT = { x: [-36, 36], z: [-30, 94], y: [-100, -62] };
export const EMITTERS = [
  [-36, -73, -30],
  [36, -73, -30],
  [-36, -73, 94],
  [36, -73, 94],
];

export function insideShaft(p) {
  return p.x >= SHAFT.x[0] && p.x <= SHAFT.x[1] && p.z >= SHAFT.z[0] && p.z <= SHAFT.z[1] && p.y >= SHAFT.y[0] && p.y <= SHAFT.y[1];
}

/** 0..1 beam strength for a craft position: full inside the column, fading over 6 m at the top and bottom. */
export function shaftStrength(p) {
  if (p.x < SHAFT.x[0] || p.x > SHAFT.x[1] || p.z < SHAFT.z[0] || p.z > SHAFT.z[1]) return 0;
  const lo = THREE.MathUtils.smoothstep(p.y, SHAFT.y[0] - 6, SHAFT.y[0] + 2);
  const hi = 1 - THREE.MathUtils.smoothstep(p.y, SHAFT.y[1] - 2, SHAFT.y[1] + 6);
  return lo * hi;
}

/** Tractor beams and the landing-light cone share one mesh/material (see materials.js makeBeamMaterial). */
export function makeBeams(material) {
  const mesh = new THREE.Mesh(buildBeamCones(12), material);
  mesh.name = "traffic_beams";
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  mesh.visible = false;
  const u = material.uniforms;
  EMITTERS.forEach((e, i) => u.uEmit.value[i].set(e[0], e[1], e[2]));
  const refresh = () => {
    mesh.visible = u.uOn.value > 0 || u.uLightOn.value > 0;
  };
  return {
    mesh,
    tris: mesh.geometry.attributes.position.count / 3,
    /** tractor beams — target: Vector3 | null, strength 0..1 */
    update(t, target, strength) {
      u.uTime.value = t;
      if (!target || strength <= 0.001) u.uOn.value = 0;
      else {
        u.uOn.value = strength;
        u.uTarget.value.copy(target);
      }
      refresh();
    },
    /** landing-light cone from the lamp (Vector3) along dir (unit Vector3) for len metres; strength 0..1 */
    setLight(lamp, dir, len, strength) {
      if (!lamp || strength <= 0.001) u.uLightOn.value = 0;
      else {
        u.uLightOn.value = strength;
        u.uLight0.value.copy(lamp);
        u.uLight1.value.copy(lamp).addScaledVector(dir, len);
      }
      refresh();
    },
  };
}

export function makeGlow(material, capacity) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, material, capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 21;
  mesh.name = "traffic_glow";
  let n = 0;
  return {
    mesh,
    capacity,
    begin() {
      n = 0;
    },
    /** world position, size (m), colour (THREE.Color), intensity */
    add(pos, size, color, intensity) {
      if (n >= capacity) return;
      _m.compose(pos, _q.identity(), _s.set(size, size, size));
      mesh.setMatrixAt(n, _m);
      mesh.instanceColor.setXYZ(n, color.r * intensity, color.g * intensity, color.b * intensity);
      n++;
    },
    end() {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    },
  };
}

export function makeBeacons(material, capacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(capacity * 3);
  const col = new Float32Array(capacity * 3);
  const size = new Float32Array(capacity);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 6000);
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = 22;
  points.name = "traffic_beacons";
  let n = 0;
  return {
    points,
    begin() {
      n = 0;
    },
    add(p, r, g, b, s) {
      if (n >= capacity) return;
      pos[n * 3] = p.x;
      pos[n * 3 + 1] = p.y;
      pos[n * 3 + 2] = p.z;
      col[n * 3] = r;
      col[n * 3 + 1] = g;
      col[n * 3 + 2] = b;
      size[n] = s;
      n++;
    },
    end() {
      geo.setDrawRange(0, n);
      points.visible = n > 0;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
    },
  };
}

/**
 * Clamp pivots relative to the fighter centre: ±x offset, height (the rack's overhead beam bottom is at
 * +4.5) and a fore/aft stagger so the two arms pass each other when folded up.
 */
export const CLAMP_PIVOT = { x: 2.4, y: 4.32, z: 0.32 };
/** arm angle from vertical (positive = toward the centre line): folded flat under the beam / pressed on the hull */
export const CLAMP_OPEN_DEG = 90;
export const CLAMP_CLOSED_DEG = 25;
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Rack clamps: two arms per slot hanging from the rack's overhead beam either side of the cockpit hatch.
 * Open = folded flat against the underside of the beam (the two arms pass each other on the z stagger, so an
 * empty slot shows nothing hanging in the air and a fighter can slide in along the slot's x axis);
 * closed = swung down to 25° from vertical so the pads meet the hull sphere on its upper shoulders.
 */
export function makeClamps(geometry, material, slots) {
  const n = slots.length * 2;
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, n));
  mesh.count = n;
  mesh.name = "traffic_clamps";
  mesh.visible = n > 0;
  const amounts = new Float32Array(slots.length).fill(-1);
  const CLOSED = THREE.MathUtils.degToRad(CLAMP_CLOSED_DEG);
  const OPEN = THREE.MathUtils.degToRad(CLAMP_OPEN_DEG);
  const euler = new THREE.Euler();
  const write = (i, amount) => {
    const s = slots[i];
    const yaw = THREE.MathUtils.degToRad(s.yaw || 0);
    const ang = OPEN + (CLOSED - OPEN) * amount;
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      _v.set(side * CLAMP_PIVOT.x, CLAMP_PIVOT.y, side * CLAMP_PIVOT.z).applyAxisAngle(_yAxis, yaw);
      _v.x += s.pos[0];
      _v.y += s.pos[1];
      _v.z += s.pos[2];
      _q.setFromEuler(euler.set(0, yaw, -side * ang));
      _m.compose(_v, _q, _s.set(1, 1, 1));
      mesh.setMatrixAt(i * 2 + k, _m);
    }
  };
  return {
    mesh,
    /** amounts: Float32Array|number[] of 0 (open) .. 1 (closed) per slot */
    update(next) {
      let dirty = false;
      for (let i = 0; i < slots.length; i++) {
        const a = Math.min(1, Math.max(0, next[i]));
        if (Math.abs(a - amounts[i]) > 1e-4) {
          amounts[i] = a;
          write(i, a);
          dirty = true;
        }
      }
      if (dirty) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    },
  };
}
