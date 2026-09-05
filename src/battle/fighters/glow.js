// Engine glow: one instanced, camera-facing additive quad per fighter (a single draw call). The quad is
// stretched backwards along the projected heading into a streak whose length shrinks head-on, keeps a
// minimum on-screen size so distant fighters read as moving points of light, and is depth-tested so the
// glows vanish behind capital hulls.
import * as THREE from "three";

const vert = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iDir;    // unit heading (world)
attribute vec3 iCol;
attribute vec3 iParam;  // radius (m), streak length (radii), intensity
varying vec2 vUv;
varying vec3 vCol;
varying float vTail;
varying float vI;
void main() {
  vec4 c = modelViewMatrix * vec4(iPos, 1.0);
  float dist = max(1.0, -c.z);
  // keep at least a few pixels: radius grows with distance once the true size would vanish
  float radius = max(iParam.x, dist * 0.0055);
  float far = iParam.x / radius; // 1 near, < 1 when the minimum-size clamp is active
  vec3 dv = (viewMatrix * vec4(iDir, 0.0)).xyz;
  vec2 d2 = dv.xy;
  float l = length(d2);
  vec2 along = l > 1e-4 ? d2 / l : vec2(0.0, 1.0);
  vec2 side = vec2(-along.y, along.x);
  float tail = iParam.y * clamp(l * 1.3, 0.0, 1.0) * mix(0.35, 1.0, far);
  // quad y in [-0.5, 0.5]: +0.5 is one radius ahead of the engine, -0.5 is the streak's end
  float a = mix(-tail, 1.0, position.y + 0.5) * radius;
  c.xy += side * (position.x * 2.0 * radius) + along * a;
  vUv = uv;
  vCol = iCol;
  vTail = tail;
  vI = iParam.z * mix(0.9, 1.0, far);
  gl_Position = projectionMatrix * c;
}`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vCol;
varying float vTail;
varying float vI;
void main() {
  float x = (vUv.x - 0.5) * 2.0;
  float an = mix(-vTail, 1.0, vUv.y); // 0 at the engine, +1 at the front edge, -tail at the end
  float rc = length(vec2(x, max(an, 0.0)));
  float core = exp(-rc * rc * 4.5);
  float t = an < 0.0 ? exp(an * 2.4 / max(vTail, 0.01)) * exp(-x * x * 7.0) : 0.0;
  float I = (core + 0.5 * t) * vI;
  if (I < 0.008) discard;
  vec3 col = vCol * I + vec3(0.35 * I * I);
  gl_FragColor = vec4(col, 1.0);
}`;

export class EngineGlow {
  constructor(scene, capacity) {
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
    this.iDir = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iCol = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iParam = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iPos", this.iPos);
    geo.setAttribute("iDir", this.iDir);
    geo.setAttribute("iCol", this.iCol);
    geo.setAttribute("iParam", this.iParam);
    geo.instanceCount = 0;
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.name = "fighter_glow";
    scene.add(this.mesh);
    this.n = 0;
  }

  begin() {
    this.n = 0;
  }

  // x,y,z engine position; dx,dy,dz unit heading; r,g,b colour; radius, tail, intensity
  push(x, y, z, dx, dy, dz, r, g, b, radius, tail, intensity) {
    const i = this.n;
    if (i >= this.capacity) return;
    const p = this.iPos.array;
    p[i * 3] = x;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = z;
    const d = this.iDir.array;
    d[i * 3] = dx;
    d[i * 3 + 1] = dy;
    d[i * 3 + 2] = dz;
    const c = this.iCol.array;
    c[i * 3] = r;
    c[i * 3 + 1] = g;
    c[i * 3 + 2] = b;
    const q = this.iParam.array;
    q[i * 3] = radius;
    q[i * 3 + 1] = tail;
    q[i * 3 + 2] = intensity;
    this.n = i + 1;
  }

  end() {
    this.geo.instanceCount = this.n;
    this.iPos.needsUpdate = true;
    this.iDir.needsUpdate = true;
    this.iCol.needsUpdate = true;
    this.iParam.needsUpdate = true;
  }
}
