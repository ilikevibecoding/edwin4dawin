// The energy geometry of the orbital beam, all in ONE draw call (per-vertex layer id, one ShaderMaterial with
// premultiplied-alpha blending so the green partly covers the sky instead of adding to cyan): the main beam (bright core + wide glow sleeve + faint heat shimmer) built along an
// ARBITRARY line from uFrom (the station's focus point) to uTo (the impact point), the pulsating focus ball,
// a hot ball riding the head of the beam, and up to MAX_TRIBUTARIES thin tributary beams that shoot from the
// dish rim into the focus. Cylinders are unit-length in object space; the vertex shader stretches them
// between uTail and uHead (fractions of the from->to line) so extension / retraction is free.
import * as THREE from 'three';

export const MAX_TRIBUTARIES = 8;

const VERT = /* glsl */ `
attribute float aLayer;
attribute float aSlot;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uHead;
uniform float uTail;
uniform float uTime;
uniform float uSphereR;
uniform float uTipR;
uniform float uRadiusScale;
uniform vec3 uRim[${MAX_TRIBUTARIES}];
uniform vec2 uTrib[${MAX_TRIBUTARIES}];   // x extension 0..1 (rim -> focus), y brightness
uniform float uTribScale;
varying float vLayer;
varying float vH;
varying float vSlot;
varying float vBright;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vPolar;
void basis(vec3 dir, out vec3 s1, out vec3 s2) {
  vec3 up = abs(dir.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  s1 = normalize(cross(dir, up));
  s2 = cross(dir, s1);
}
void main() {
  vLayer = aLayer; vSlot = aSlot; vBright = 0.0;
  vec3 world, nrm = normal, s1, s2;
  vec3 axis = uTo - uFrom;
  float L = max(length(axis), 0.001);
  vec3 dir = axis / L;
  if (aLayer > 4.5) {
    // tributary: thin beam from a rim point to the focus, extending with uTrib.x
    int s = int(aSlot + 0.5);
    vec3 start = uRim[s];
    float ext = clamp(uTrib[s].x, 0.0, 1.0);
    vBright = uTrib[s].y;
    vec3 taxis = uFrom - start;
    float tl = max(length(taxis), 0.001);
    vec3 tdir = taxis / tl;
    basis(tdir, s1, s2);
    float along = position.y * ext * tl;
    float rad = uTribScale * (1.0 + 0.18 * sin(along * 0.6 - uTime * 22.0 + aSlot * 1.7));
    world = start + tdir * along + (s1 * position.x + s2 * position.z) * rad;
    nrm = s1 * normal.x + s2 * normal.z;
    vH = position.y;
    vPolar = vec2(atan(position.z, position.x), along);
  } else if (aLayer > 3.5) {
    // hot ball riding the head of the beam
    world = uFrom + dir * (uHead * L) + position * uTipR * uRadiusScale;
    vH = 0.0;
    vPolar = vec2(atan(position.z, position.x), world.y);
  } else if (aLayer > 2.5) {
    world = uFrom + position * uSphereR;
    vH = 1.0;
    vPolar = vec2(atan(position.z, position.x), world.y);
  } else {
    basis(dir, s1, s2);
    float ang = atan(position.z, position.x);
    float along = mix(uTail, uHead, position.y) * L;
    float wob = 1.0;
    if (aLayer > 1.5) wob = 1.0 + 0.22 * sin(ang * 3.0 + along * 0.35 - uTime * 7.0) * sin(along * 0.21 + uTime * 4.0 + ang);
    else if (aLayer > 0.5) wob = 1.0 + 0.05 * sin(ang * 5.0 - uTime * 11.0 + along * 0.3);
    float sc = wob * uRadiusScale;
    world = uFrom + dir * along + (s1 * position.x + s2 * position.z) * sc;
    nrm = s1 * normal.x + s2 * normal.z;
    vH = 1.0 - position.y; // 0 at the head (impact end), 1 at the focus
    vPolar = vec2(ang, along);
  }
  vNormal = nrm;
  vView = cameraPosition - world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uSphereAlpha;
uniform float uTipHot;
uniform float uHeadFade;
uniform float uTribAlpha;
uniform vec3 uCoreColor;
uniform vec3 uGlowColor;
uniform vec3 uTribColor;
varying float vLayer;
varying float vH;
varying float vSlot;
varying float vBright;
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
// Premultiplied output: out = col * a + dst * (1 - a * body). body > 0 lets the green partly REPLACE the blue sky
// behind it (pure additive green on a blue sky reads as cyan/white).
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  vec3 col;
  float a, body;
  if (vLayer > 4.5) {
    float bright = vBright * uTribAlpha;
    float n = vnoise(vec2(vPolar.x * 1.5 + vSlot * 3.1, vPolar.y * 0.35 - uTime * 16.0));
    float head = 0.6 + 0.4 * smoothstep(0.55, 1.0, vH); // hotter as it nears the focus
    // seen almost end-on from the town, so the facing term is kept weak
    if (vLayer > 5.5) {
      float rim = pow(1.0 - facing, 1.6);
      col = uTribColor * (0.8 + 0.4 * n) + vec3(0.12, 0.2, 0.12) * rim;
      a = pow(facing, 0.7) * (0.35 + 0.3 * n) * bright * head;
      body = 0.35;
    } else {
      col = mix(vec3(0.55, 1.0, 0.6), vec3(0.9, 1.0, 0.9), 0.5 * n);
      a = (0.9 + 0.2 * n) * pow(facing, 0.25) * bright * head;
      body = 0.55;
    }
  } else if (vLayer > 3.5) {
    float rim = pow(1.0 - facing, 1.5);
    float n = vnoise(vec2(vPolar.x * 3.0 - uTime * 4.0, vPolar.y * 0.7 + uTime * 6.0));
    col = mix(vec3(1.0, 1.0, 0.95), mix(uCoreColor, uGlowColor, 0.5), rim * 0.7 + 0.3 * n);
    a = (0.9 - 0.4 * rim) * uIntensity * min(uTipHot, 1.0);
    body = 0.4;
  } else if (vLayer > 2.5) {
    float rim = pow(1.0 - facing, 2.0);
    float n = vnoise(vec2(vPolar.x * 2.0 + uTime * 2.0, vPolar.y * 0.5 + uTime * 3.0));
    col = mix(vec3(0.95, 1.0, 0.95), uGlowColor, rim * 0.85 + 0.2 * n);
    a = (1.0 - 0.5 * rim) * uSphereAlpha;
    body = 0.6;
  } else {
    // scrolling streaks: noise in (angle, distance-along) space moving from the focus toward the impact
    float n = vnoise(vec2(vPolar.x * 2.5, vPolar.y * 0.10 - uTime * 5.0)) * 0.6 + 0.4 * vnoise(vec2(vPolar.x * 6.0 + 3.0, vPolar.y * 0.3 - uTime * 9.0));
    float tip = smoothstep(0.0, uHeadFade, vH);
    float hot = exp(-vH * 24.0) * uTipHot;
    float fres = pow(1.0 - facing, 2.2);
    if (vLayer < 0.5) {
      col = mix(uCoreColor, vec3(1.0), hot * 0.6);
      a = (0.62 + 0.28 * n) * pow(facing, 0.8) * uIntensity * smoothstep(0.0, 0.015, vH) + hot * 0.7 * uIntensity;
      body = 0.6;
    } else if (vLayer < 1.5) {
      col = mix(uGlowColor, vec3(0.9, 1.0, 0.9), hot * 0.5) + uGlowColor * fres * 0.8;
      a = (pow(facing, 1.5) * (0.38 + 0.4 * n) + 0.25 * fres) * uIntensity * tip + hot * 0.25 * uIntensity;
      body = 0.5;
    } else {
      col = uGlowColor * 0.7 + vec3(0.2);
      a = pow(facing, 2.6) * 0.1 * (0.4 + 1.2 * n) * uIntensity * tip;
      body = 0.0;
    }
  }
  gl_FragColor = vec4(col * a, min(1.0, a * body));
}`;

export class BeamMesh {
  constructor(scene, beamRadius) {
    this.scene = scene;
    this.baseRadius = beamRadius;
    const parts = [];
    const cyl = (r, seg, layer, slot = 0) => { const g = new THREE.CylinderGeometry(r, r, 1, seg, 1, true); g.translate(0, 0.5, 0); parts.push([g, layer, slot]); };
    cyl(beamRadius * 0.55, 32, 0);
    cyl(beamRadius * 1.35, 40, 1);
    cyl(beamRadius * 2.5, 40, 2);
    parts.push([new THREE.SphereGeometry(1, 24, 16), 3, 0]);
    parts.push([new THREE.SphereGeometry(1, 20, 12), 4, 0]);
    for (let s = 0; s < MAX_TRIBUTARIES; s++) { cyl(0.9, 10, 5, s); cyl(3.2, 12, 6, s); }
    const pos = [], nor = [], lay = [], slot = [], idx = [];
    for (const [g, layer, sl] of parts) {
      const base = pos.length / 3;
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); lay.push(layer); slot.push(sl); }
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
      g.dispose();
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    this.geometry.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1));
    this.geometry.setAttribute('aSlot', new THREE.Float32BufferAttribute(slot, 1));
    this.geometry.setIndex(idx);
    this.rim = []; this.trib = [];
    for (let s = 0; s < MAX_TRIBUTARIES; s++) { this.rim.push(new THREE.Vector3(0, 300, 0)); this.trib.push(new THREE.Vector2(0, 0)); }
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uFrom: { value: new THREE.Vector3(0, 300, 0) }, uTo: { value: new THREE.Vector3(0, 60, 0) }, uHead: { value: 0 }, uTail: { value: 0 },
        uTime: { value: 0 }, uSphereR: { value: 0 }, uTipR: { value: beamRadius * 0.7 }, uRadiusScale: { value: 1 },
        uIntensity: { value: 0 }, uSphereAlpha: { value: 0 }, uTipHot: { value: 0 }, uHeadFade: { value: 0.08 },
        uCoreColor: { value: new THREE.Vector3(0.62, 1.0, 0.66) }, uGlowColor: { value: new THREE.Vector3(0.12, 1.0, 0.25) },
        uTribColor: { value: new THREE.Vector3(0.15, 1.0, 0.3) }, uTribAlpha: { value: 0 }, uTribScale: { value: 1 },
        uRim: { value: this.rim }, uTrib: { value: this.trib },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false; // vertices are placed by the shader
    this.mesh.renderOrder = 10;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this._tribAny = false;
  }

  // Main beam. from/to: {x,y,z} (focus point / impact point); head, tail: fractions of the from->to line the
  // column spans (head 0 = nothing, 1 = reaches the impact); intensity 0..1 (0 hides the column); sphereR /
  // sphereAlpha: focus ball; tipHot brightens the head; radiusScale pulses the width.
  setBeam(from, to, head, tail, intensity, sphereR, sphereAlpha, tipHot, radiusScale, time) {
    const u = this.material.uniforms;
    u.uFrom.value.set(from.x, from.y, from.z);
    u.uTo.value.set(to.x, to.y, to.z);
    u.uHead.value = head; u.uTail.value = tail;
    u.uIntensity.value = intensity; u.uSphereR.value = sphereR; u.uSphereAlpha.value = sphereAlpha;
    u.uTipHot.value = tipHot; u.uRadiusScale.value = radiusScale; u.uTime.value = time;
    this.mesh.visible = (intensity > 0.002 && head > tail + 0.0005) || (sphereAlpha > 0.002 && sphereR > 0.02) || this._tribAny;
  }

  // Tributary i: start point on the dish rim, extension 0..1 toward the focus, brightness 0..1.
  setTributary(i, x, y, z, ext, bright) {
    this.rim[i].set(x, y, z);
    this.trib[i].set(ext, bright);
  }
  // Overall tributary alpha/scale (call before setBeam so visibility accounts for them).
  setTributaryStyle(alpha, scale = 1) {
    const u = this.material.uniforms;
    u.uTribAlpha.value = alpha; u.uTribScale.value = scale;
    let any = false;
    if (alpha > 0.002) for (let i = 0; i < MAX_TRIBUTARIES; i++) if (this.trib[i].x > 0.001 && this.trib[i].y > 0.002) { any = true; break; }
    this._tribAny = any;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
