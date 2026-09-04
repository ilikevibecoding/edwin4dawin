// The beam column: bright core cylinder + wide translucent glow + a faint distorted "heat shimmer" sleeve +
// the focus sphere under the dish + a hot ball at the descending tip. All five live in ONE geometry
// (per-vertex layer id) rendered with one additive ShaderMaterial -> a single draw call. Cylinders are
// unit-height in object space; the vertex shader stretches them between uBottom and uTop so the descending
// end can be animated for free.
import * as THREE from 'three';

const VERT = /* glsl */ `
attribute float aLayer;
uniform float uBottom;
uniform float uTop;
uniform float uTime;
uniform float uSphereR;
uniform float uTipR;
uniform float uRadiusScale;
uniform vec3 uFocus;
varying float vLayer;
varying float vH;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vPolar;
void main() {
  vLayer = aLayer;
  vec3 world;
  if (aLayer > 3.5) {
    // hot tip ball riding the descending end of the column
    world = vec3(uFocus.x, uBottom, uFocus.z) + position * uTipR * uRadiusScale;
    vH = 0.0;
    vPolar = vec2(atan(position.z, position.x), world.y);
  } else if (aLayer > 2.5) {
    world = uFocus + position * uSphereR;
    vH = 1.0;
    vPolar = vec2(atan(position.z, position.x), world.y);
  } else {
    float ang = atan(position.z, position.x);
    float y = mix(uBottom, uTop, position.y);
    float wob = 1.0;
    if (aLayer > 1.5) wob = 1.0 + 0.22 * sin(ang * 3.0 + y * 0.35 - uTime * 7.0) * sin(y * 0.21 + uTime * 4.0 + ang);
    else if (aLayer > 0.5) wob = 1.0 + 0.05 * sin(ang * 5.0 - uTime * 11.0 + y * 0.3);
    float s = wob * uRadiusScale;
    world = vec3(uFocus.x + position.x * s, y, uFocus.z + position.z * s);
    vH = position.y;
    vPolar = vec2(ang, y);
  }
  vNormal = normal;
  vView = cameraPosition - world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uSphereAlpha;
uniform float uTipHot;
uniform float uBottomFade;
uniform vec3 uCoreColor;
uniform vec3 uGlowColor;
varying float vLayer;
varying float vH;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vPolar;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  vec3 col;
  float a;
  if (vLayer > 3.5) {
    float rim = pow(1.0 - facing, 1.5);
    float n = vnoise(vec2(vPolar.x * 3.0 - uTime * 4.0, vPolar.y * 0.7 + uTime * 6.0));
    col = mix(vec3(1.0, 0.98, 0.9), mix(uCoreColor, uGlowColor, 0.5), rim * 0.7 + 0.3 * n);
    a = (0.9 - 0.4 * rim) * uIntensity * min(uTipHot, 1.0);
  } else if (vLayer > 2.5) {
    float rim = pow(1.0 - facing, 2.0);
    float n = vnoise(vec2(vPolar.x * 2.0 + uTime * 2.0, vPolar.y * 0.5 + uTime * 3.0));
    col = mix(vec3(1.0, 0.98, 0.92), uGlowColor, rim * 0.8 + 0.2 * n);
    a = (1.0 - 0.55 * rim) * uSphereAlpha;
  } else {
    // scrolling streaks: noise in (angle, height) space moving downward along the beam
    float n = vnoise(vec2(vPolar.x * 2.5, vPolar.y * 0.10 - uTime * 5.0)) * 0.6 + 0.4 * vnoise(vec2(vPolar.x * 6.0 + 3.0, vPolar.y * 0.3 - uTime * 9.0));
    float tip = smoothstep(0.0, uBottomFade, vH);
    float hot = exp(-vH * 24.0) * uTipHot;
    if (vLayer < 0.5) {
      col = mix(uCoreColor, vec3(1.0), hot * 0.6);
      a = (0.75 + 0.3 * n) * pow(facing, 0.8) * uIntensity * smoothstep(0.0, 0.015, vH) + hot * 0.7 * uIntensity;
    } else if (vLayer < 1.5) {
      col = mix(uGlowColor, vec3(1.0, 0.95, 0.85), hot * 0.5);
      a = pow(facing, 1.5) * (0.38 + 0.4 * n) * uIntensity * tip + hot * 0.25 * uIntensity;
    } else {
      col = uGlowColor * 0.7 + vec3(0.2);
      a = pow(facing, 2.6) * 0.1 * (0.4 + 1.2 * n) * uIntensity * tip;
    }
  }
  gl_FragColor = vec4(col * a, a);
}`;

export class BeamMesh {
  constructor(scene, beamRadius) {
    this.scene = scene;
    this.baseRadius = beamRadius;
    const parts = [];
    const cyl = (r, seg, layer) => { const g = new THREE.CylinderGeometry(r, r, 1, seg, 1, true); g.translate(0, 0.5, 0); parts.push([g, layer]); };
    cyl(beamRadius * 0.55, 32, 0);
    cyl(beamRadius * 1.35, 40, 1);
    cyl(beamRadius * 2.5, 40, 2);
    parts.push([new THREE.SphereGeometry(1, 24, 16), 3]);
    parts.push([new THREE.SphereGeometry(1, 20, 12), 4]);
    const pos = [], nor = [], lay = [], idx = [];
    for (const [g, layer] of parts) {
      const base = pos.length / 3;
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); lay.push(layer); }
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
      g.dispose();
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    this.geometry.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1));
    this.geometry.setIndex(idx);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uBottom: { value: 200 }, uTop: { value: 200 }, uTime: { value: 0 }, uSphereR: { value: 0 }, uTipR: { value: beamRadius * 0.7 }, uRadiusScale: { value: 1 },
        uFocus: { value: new THREE.Vector3() }, uIntensity: { value: 0 }, uSphereAlpha: { value: 0 }, uTipHot: { value: 0 }, uBottomFade: { value: 0.08 },
        uCoreColor: { value: new THREE.Vector3(1.0, 0.97, 0.9) }, uGlowColor: { value: new THREE.Vector3(0.25, 0.75, 1.0) },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false; // vertices are placed by the shader
    this.mesh.renderOrder = 10;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  // focus: {x,y,z}; bottom/top world y of the column; intensity 0..1 (0 hides the column);
  // sphereR/sphereAlpha for the focus sphere; tipHot brightens the descending end; radiusScale pulses width.
  set(focus, bottom, top, intensity, sphereR, sphereAlpha, tipHot, radiusScale, time) {
    const u = this.material.uniforms;
    u.uFocus.value.set(focus.x, focus.y, focus.z);
    u.uBottom.value = bottom; u.uTop.value = top;
    u.uIntensity.value = intensity; u.uSphereR.value = sphereR; u.uSphereAlpha.value = sphereAlpha;
    u.uTipHot.value = tipHot; u.uRadiusScale.value = radiusScale; u.uTime.value = time;
    this.mesh.visible = intensity > 0.002 || (sphereAlpha > 0.002 && sphereR > 0.02);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
