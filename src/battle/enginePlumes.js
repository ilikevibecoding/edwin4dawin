// Engine plumes and nozzle glows for every capital ship, in one additive draw call. Each engine gets a
// camera-facing plume quad stretched along the ship's exhaust axis (a bright blue-white core fading to a
// blue skirt with flicker) and a billboard glow disc at the nozzle mouth. Intensity follows the ship:
// dead hulks go dark, a `ship.engineLevel` override lets the choreography dim engines during a death.
import * as THREE from "three";

const vert = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iAxis;
attribute vec4 iParam; // radius, length, intensity, kind (0 plume, 1 disc)
attribute float iSeed;
uniform float uTime;
varying vec2 vUv;
varying vec4 vParam;
varying float vSeed;
void main() {
  vUv = uv;
  vParam = iParam;
  vSeed = iSeed;
  float r = iParam.x;
  float len = iParam.y;
  vec3 world;
  if (iParam.w < 0.5) {
    // plume: u along the axis (0 at the nozzle), v across; the quad faces the camera around the axis
    float u = uv.y;
    float v = (uv.x - 0.5) * 2.0;
    vec3 toCam = normalize(cameraPosition - iPos);
    vec3 side = cross(iAxis, toCam);
    float sl = length(side);
    side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
    // width: flares just behind the nozzle then tapers to a point
    float w = r * (1.0 + 0.35 * sin(u * 3.1416) ) * (1.0 - 0.85 * u * u);
    // flicker in length
    float fl = 1.0 + 0.08 * sin(uTime * 23.0 + iSeed * 40.0) + 0.05 * sin(uTime * 41.0 + iSeed * 17.0);
    world = iPos + iAxis * (u * len * fl) + side * (v * w);
  } else {
    // nozzle glow disc: billboard
    vec3 toCam = normalize(cameraPosition - iPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    if (length(right) < 1e-3) right = vec3(1.0, 0.0, 0.0);
    vec3 up = cross(toCam, right);
    world = iPos + (right * (uv.x - 0.5) + up * (uv.y - 0.5)) * (r * 2.6);
  }
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const frag = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
varying vec4 vParam;
varying float vSeed;
void main() {
  float I = vParam.z;
  if (I <= 0.001) discard;
  vec3 col;
  float a;
  if (vParam.w < 0.5) {
    float u = vUv.y;
    float v = abs(vUv.x - 0.5) * 2.0;
    float across = exp(-v * v * 3.2) * (1.0 - v * v);
    float along = exp(-u * 3.4);
    float core = exp(-v * v * 14.0) * exp(-u * 6.0);
    float flick = 0.9 + 0.1 * sin(uTime * 31.0 + vSeed * 50.0 + u * 9.0);
    col = mix(vec3(0.35, 0.6, 1.0), vec3(0.95, 0.98, 1.0), core) * flick;
    a = (across * along * 0.85 + core * 0.9) * I;
  } else {
    vec2 c = vUv - 0.5;
    float rr = length(c) * 2.0;
    float glow = exp(-rr * rr * 6.0);
    float hot = exp(-rr * rr * 30.0);
    col = mix(vec3(0.45, 0.7, 1.0), vec3(1.0, 1.0, 1.0), hot);
    a = (glow * 0.9 + hot * 1.2) * I;
  }
  gl_FragColor = vec4(col * a, a);
}`;

const _p = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);

export class EnginePlumes {
  constructor(scene, capacity = 1200) {
    this.capacity = capacity;
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    this.iPos = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iAxis = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iParam = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 4),
      4,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iSeed = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1,
    ).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iPos", this.iPos);
    geo.setAttribute("iAxis", this.iAxis);
    geo.setAttribute("iParam", this.iParam);
    geo.setAttribute("iSeed", this.iSeed);
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.name = "enginePlumes";
    scene.add(this.mesh);
    this.count = 0;
  }

  /** Write one plume + one disc per engine of every living ship (plumes only at LOD 0/1). */
  update(fleet, time) {
    let n = 0;
    const cap = this.capacity;
    for (const s of fleet.ships) {
      if (!s.alive) continue;
      const engines = s.model.engines;
      if (!engines || !engines.length) continue;
      let level =
        s.engineLevel !== undefined
          ? s.engineLevel
          : s.health > 0
            ? 1 - 0.35 * Math.min(1, s.damage / 12)
            : 0;
      if (level <= 0.001) continue;
      _axis.copy(_z).applyQuaternion(s.quaternion);
      for (let e = 0; e < engines.length && n + 1 < cap; e++) {
        const en = engines[e];
        _p.set(en.pos[0], en.pos[1], en.pos[2]).applyMatrix4(s.matrix);
        const r = en.r || 20;
        const seed = ((s.id * 13 + e * 7) % 97) / 97;
        // disc at the nozzle (all LODs)
        this.iPos.setXYZ(n, _p.x, _p.y, _p.z);
        this.iAxis.setXYZ(n, _axis.x, _axis.y, _axis.z);
        this.iParam.setXYZW(n, r, 0, level, 1);
        this.iSeed.setX(n, seed);
        n++;
        if (s.lod < 2) {
          this.iPos.setXYZ(
            n,
            _p.x + _axis.x * r * 0.2,
            _p.y + _axis.y * r * 0.2,
            _p.z + _axis.z * r * 0.2,
          );
          this.iAxis.setXYZ(n, _axis.x, _axis.y, _axis.z);
          this.iParam.setXYZW(n, r * 0.95, r * 6.5, level, 0);
          this.iSeed.setX(n, seed);
          n++;
        }
      }
    }
    this.count = n;
    this.mesh.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iAxis.needsUpdate = true;
    this.iParam.needsUpdate = true;
    this.iSeed.needsUpdate = true;
    this.mat.uniforms.uTime.value = time;
  }
}
