// Distant background traffic: a few hundred dim points drifting slowly in the band between the
// planet's limb and the horizontal, 80-400 km out (other formations, transports, debris). One Points
// draw call; motion is a triangle wave in the vertex shader so nothing is allocated or updated per frame
// beyond a time uniform.
import * as THREE from "three";
import { mulberry32 } from "../textures.js";

const trafficVert = /* glsl */ `
attribute vec3 aVel;
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
  vColor = color;
  // back and forth along a long track (period 1400 s) so the layer never drifts away
  float t = abs(fract(uTime / 1400.0 + aPhase) * 2.0 - 1.0) - 0.5;
  vec3 p = position + aVel * (t * 1400.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, floor(aSize * uPixelRatio + 0.5));
}`;

const trafficFrag = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}`;

export function buildTraffic(group, count = 360) {
  const rand = mulberry32(919);
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const d = 8e4 + rand() * rand() * 3.2e5;
    // small clusters: formations of a few contacts
    const cluster = rand() < 0.5;
    const cx = Math.cos(a) * d;
    const cz = Math.sin(a) * d;
    const jitter = cluster ? 4000 : 0;
    pos[i * 3] = cx + (rand() - 0.5) * jitter;
    pos[i * 3 + 1] = -7e4 + rand() * 7.2e4 + (rand() - 0.5) * jitter * 0.3;
    pos[i * 3 + 2] = cz + (rand() - 0.5) * jitter;
    // slow tangential drift, 60-300 m/s
    const sp = 60 + rand() * 240;
    const dirA = a + Math.PI / 2 + (rand() - 0.5) * 0.6;
    vel[i * 3] = Math.cos(dirA) * sp;
    vel[i * 3 + 1] = (rand() - 0.5) * 20;
    vel[i * 3 + 2] = Math.sin(dirA) * sp;
    const kind = rand();
    const I = 0.25 + rand() * 0.6;
    // warm running lights, a share of cool engine glows
    const c =
      kind < 0.65
        ? [1.0, 0.85, 0.65]
        : kind < 0.9
          ? [0.6, 0.75, 1.0]
          : [1.0, 0.55, 0.45];
    col[i * 3] = c[0] * I;
    col[i * 3 + 1] = c[1] * I;
    col[i * 3 + 2] = c[2] * I;
    size[i] = rand() < 0.15 ? 2 : 1;
    phase[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aVel", new THREE.BufferAttribute(vel, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: trafficVert,
    fragmentShader: trafficFrag,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const pts = new THREE.Points(g, m);
  pts.name = "traffic";
  pts.frustumCulled = false;
  pts.renderOrder = -10;
  pts.onBeforeRender = (renderer) => {
    m.uniforms.uTime.value = performance.now() * 0.001;
    m.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  };
  group.add(pts);
  return pts;
}
