// TEMPORARY placeholder for the Death Star style battle station (the real implementation lives in station.js and
// follows the same contract). A grey low-poly sphere, a shallow dish disc on the aim axis and a small lens at the
// dish centre: three meshes, three draw calls, no textures. Only the geometry the beam sequence relies on
// (dish centre, focus point in front of the dish, rim points) needs to be right.
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';

export const STATION_RADIUS = 64;
const DISH_ANGLE = 0.40;             // angular radius of the dish (rad) on the sphere
const DISH_DEPTH = 0.16;             // how far the dish floor is recessed (fraction of the radius)

const VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */ `
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uColor;
uniform vec3 uGlow;
uniform float uGlowAmt;
uniform float uAlpha;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(vNormal);
  vec3 l1 = normalize(vec3(0.35, 1.0, -0.55));
  vec3 l2 = normalize(vec3(-0.4, -0.6, 0.6));   // ground bounce: the town mostly sees the underside
  float d = max(dot(n, l1), 0.0) + 0.7 * max(dot(n, l2), 0.0);
  // faint panel grid so the sphere reads as a built structure rather than a ball
  float grid = step(0.94, fract(vWorld.y * 0.09)) + step(0.94, fract(atan(vWorld.z, vWorld.x) * 5.0));
  vec3 col = uColor * (0.5 + 0.5 * d) * (0.4 + 0.6 * uSkyLight) * uSkyTint * (1.0 - 0.18 * clamp(grid, 0.0, 1.0));
  float pulse = 0.85 + 0.15 * sin(uTime * 6.0);
  col = mix(col, uGlow * (0.6 + 1.2 * uGlowAmt) * pulse, clamp(uGlowAmt, 0.0, 1.0));
  gl_FragColor = vec4(col, uAlpha);
}`;

export class BattleStation {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius || STATION_RADIUS;
    const R = this.radius;
    this.center = new THREE.Vector3(0, 300, 0);
    this.aim = new THREE.Vector3(0, -1, 0);
    this.group = new THREE.Group();
    this.group.visible = false;
    this.materials = [];
    const mat = (color, glow) => {
      const m = new THREE.ShaderMaterial({
        uniforms: {
          uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint,
          uColor: { value: new THREE.Vector3(...color) }, uGlow: { value: new THREE.Vector3(...glow) },
          uGlowAmt: { value: 0 }, uAlpha: { value: 1 }, uTime: { value: 0 },
        },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: THREE.DoubleSide,
      });
      this.materials.push(m);
      return m;
    };
    // hull
    this.hull = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 18), mat([0.55, 0.56, 0.6], [0.2, 1, 0.4]));
    // dish: a shallow cone sunk into the hull; its mouth radius matches the rim points on the sphere
    const rimR = Math.sin(DISH_ANGLE) * R, mouthZ = Math.cos(DISH_ANGLE) * R, floorZ = R * (1 - DISH_DEPTH);
    const dishGeo = new THREE.CylinderGeometry(rimR * 1.02, rimR * 0.2, mouthZ - floorZ, 32, 1, true);
    dishGeo.rotateX(Math.PI / 2); // cylinder axis (+y) -> +z, the aim axis in dish-local space; the wide mouth ends up at +z
    dishGeo.translate(0, 0, (mouthZ + floorZ) / 2);
    this.dish = new THREE.Mesh(dishGeo, mat([0.22, 0.23, 0.27], [0.25, 1, 0.45]));
    // lens at the dish centre
    const lensGeo = new THREE.SphereGeometry(R * 0.045, 12, 8);
    lensGeo.translate(0, 0, R * (1 - DISH_DEPTH));
    this.lens = new THREE.Mesh(lensGeo, mat([0.3, 0.6, 0.35], [0.6, 1, 0.7]));
    this.group.add(this.hull, this.dish, this.lens);
    for (const m of [this.hull, this.dish, this.lens]) { m.frustumCulled = false; m.renderOrder = 8; }
    scene.add(this.group);
    this._q = new THREE.Quaternion();
    this._z = new THREE.Vector3(0, 0, 1);
    this._s1 = new THREE.Vector3(); this._s2 = new THREE.Vector3(); this._tmp = new THREE.Vector3();
  }

  // centre, UNIT aim direction (dish -> target), state {power, heat, charge, firing, alpha, time}
  set(x, y, z, ax, ay, az, state = {}) {
    this.center.set(x, y, z);
    this.aim.set(ax, ay, az).normalize();
    this.group.position.copy(this.center);
    this._q.setFromUnitVectors(this._z, this.aim);
    this.group.quaternion.copy(this._q);
    const alpha = state.alpha ?? 1, time = state.time || 0;
    const charge = state.charge ?? 0, power = state.power ?? 0, firing = state.firing ?? 0;
    for (const m of this.materials) { m.uniforms.uAlpha.value = alpha; m.uniforms.uTime.value = time; }
    this.hull.material.uniforms.uGlowAmt.value = 0.05 * power;
    this.dish.material.uniforms.uGlowAmt.value = 0.15 * power + 0.55 * charge + 0.3 * firing;
    this.lens.material.uniforms.uGlowAmt.value = 0.3 * power + 0.7 * Math.max(charge, firing);
    this.group.visible = alpha > 0.01;
  }

  // orthonormal side vectors of the aim axis (for rim points)
  _basis() {
    const a = this.aim;
    const up = Math.abs(a.y) < 0.98 ? this._tmp.set(0, 1, 0) : this._tmp.set(1, 0, 0);
    this._s1.crossVectors(a, up).normalize();
    this._s2.crossVectors(a, this._s1).normalize();
  }

  dishWorld(out = new THREE.Vector3()) { return out.copy(this.aim).multiplyScalar(this.radius * (1 - DISH_DEPTH)).add(this.center); }
  focusWorld(out = new THREE.Vector3(), dist = this.radius * 0.35) { return out.copy(this.aim).multiplyScalar(this.radius * (1 - DISH_DEPTH) + dist).add(this.center); }
  rimPoints(n, outArray = []) {
    this._basis();
    const R = this.radius, ca = Math.cos(DISH_ANGLE) * R, sa = Math.sin(DISH_ANGLE) * R;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + 0.4;
      const p = outArray[i] || (outArray[i] = new THREE.Vector3());
      p.copy(this.center).addScaledVector(this.aim, ca).addScaledVector(this._s1, Math.cos(t) * sa).addScaledVector(this._s2, Math.sin(t) * sa);
    }
    outArray.length = n;
    return outArray;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of [this.hull, this.dish, this.lens]) { m.geometry.dispose(); m.material.dispose(); }
  }
}
