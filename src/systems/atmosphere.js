// Atmosphere effects (owner: atmosphere / post / lighting workstream): dust motes drifting through the current
// room, volumetric-style light shafts (window beams that follow the sun / planet-shine, hangar work-light
// cones), the hologram shader shared by every room, and the engine heat glow seen from outside.
// Constructed once by main.js before any room is built; update() runs every frame with the current mode.
// Budget: ≤ 3 draw calls per frame (motes + shafts inside, engine glow outside), ~200 triangles, no per-frame
// allocations (everything is pooled; geometry is rewritten in place only when a shaft set changes).
import * as THREE from "three";
import { SYSTEMS } from "../core/systems.js";
import { ENGINES, HULL, BAYS, ROOM_BY_ID, WALL_T } from "../core/layout.js";

/**
 * Red-alert level (0..1) mirrored from the lighting controller every frame. post.js imports this (both
 * files belong to this workstream) to drive the pulsing alert vignette without a main.js change.
 */
export const alertLevel = { value: 0 };

const ALERT_TINT = new THREE.Vector3(1.55, 0.32, 0.26);
const WHITE = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------------------------------
// GLSL helpers shared by the shaders below
// ---------------------------------------------------------------------------------------------------
const NOISE_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
`;

// ---------------------------------------------------------------------------------------------------
// Hologram material: additive, scanlines, slow flicker + occasional dropout, fresnel rim, upward sweep.
// Replaces materials.holo before any room is built, so every ctx.kit.add("holo", …) gets this look.
// ---------------------------------------------------------------------------------------------------
export function makeHoloMaterial(baseColor = 0x5fb8ff) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(baseColor) },
      opacity: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vC;
      void main() {
        #ifdef USE_COLOR
          vC = color;
        #else
          vC = vec3(1.0);
        #endif
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color;
      uniform float opacity;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vC;
      ${NOISE_GLSL}
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        float ndv = abs(dot(normalize(vN), V));
        // fresnel-ish rim: edges glow, faces stay translucent
        float rim = pow(1.0 - ndv, 2.2);
        // fine scanlines (~5 cm) scrolling slowly downward, plus a coarser interference band
        float scan = 0.72 + 0.28 * sin(vW.y * 125.0 - time * 4.0);
        float band = 0.85 + 0.15 * sin(vW.y * 9.0 + time * 1.7);
        // bright refresh line sweeping upward every ~2.5 m
        float sweep = pow(1.0 - fract(vW.y * 0.4 - time * 0.16), 14.0) * 0.9;
        // slow flicker with a rare, brief dropout
        float flick = 0.86 + 0.14 * sin(time * 21.0) * sin(time * 6.7 + 1.3);
        float drop = hash21(vec2(floor(time * 9.0), 3.7)) > 0.965 ? 0.45 : 1.0;
        // faint static so flat faces never read as solid plastic
        float grain = 0.9 + 0.2 * hash21(floor(vW.xy * 40.0) + floor(time * 18.0));
        float a = opacity * flick * drop * grain * scan * band * (0.42 + 0.9 * rim) + sweep * opacity * 0.6;
        gl_FragColor = vec4(color * vC * a, a);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true,
    fog: false,
  });
  mat.name = "holo";
  // back-compat: code that reads/sets materials.holo.color / .opacity keeps working
  mat.color = mat.uniforms.color.value;
  mat.opacity = mat.uniforms.opacity.value;
  return mat;
}

// ---------------------------------------------------------------------------------------------------
// Dust motes: one THREE.Points, positions integrated and wrapped on the GPU inside a box that follows the
// camera but never leaves the current room. Lit by up to 8 of the room's own lights.
// ---------------------------------------------------------------------------------------------------
const MOTE_COUNT = 1200;
const MOTE_LIGHTS = 8;
const CLOUD = new THREE.Vector3(22, 9, 22); // max extent of the mote cloud around the camera (metres)

function makeMotes() {
  const pos = new Float32Array(MOTE_COUNT * 3);
  const vel = new Float32Array(MOTE_COUNT * 3);
  const rnd = new Float32Array(MOTE_COUNT * 4);
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < MOTE_COUNT; i++) {
    pos[i * 3] = rand() * 64;
    pos[i * 3 + 1] = rand() * 64;
    pos[i * 3 + 2] = rand() * 64;
    // slow drift: random direction, 2–9 cm/s, a slight settling bias
    const th = rand() * Math.PI * 2;
    const ph = (rand() - 0.5) * 1.2;
    const sp = 0.02 + rand() * 0.07;
    vel[i * 3] = Math.cos(th) * Math.cos(ph) * sp;
    vel[i * 3 + 1] = Math.sin(ph) * sp - 0.008;
    vel[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * sp;
    rnd[i * 4] = 0.55 + rand() * 0.9; // size
    rnd[i * 4 + 1] = 0.35 + rand() * 0.65; // brightness
    rnd[i * 4 + 2] = rand(); // phase
    rnd[i * 4 + 3] = 0.8 + rand() * 2.4; // twinkle rate
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aVel", new THREE.BufferAttribute(vel, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

  const lights = [];
  const lightCols = [];
  for (let i = 0; i < MOTE_LIGHTS; i++) {
    lights.push(new THREE.Vector4(0, 0, 0, 1));
    lightCols.push(new THREE.Vector3());
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      boxMin: { value: new THREE.Vector3() },
      boxSize: { value: new THREE.Vector3(1, 1, 1) },
      viewH: { value: 540 },
      sizeBase: { value: 0.032 },
      strength: { value: 0.42 },
      ambient: { value: new THREE.Vector3(0.22, 0.25, 0.3) },
      tint: { value: new THREE.Vector3(1, 1, 1) },
      lightCount: { value: 0 },
      lights: { value: lights },
      lightCols: { value: lightCols },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aVel;
      attribute vec4 aRand;
      uniform float time;
      uniform vec3 boxMin;
      uniform vec3 boxSize;
      uniform float viewH;
      uniform float sizeBase;
      uniform vec3 ambient;
      uniform int lightCount;
      uniform vec4 lights[${MOTE_LIGHTS}];
      uniform vec3 lightCols[${MOTE_LIGHTS}];
      varying float vA;
      varying vec3 vCol;
      void main() {
        // integrate + wrap in world space: a mote keeps its world position while the box follows the camera
        vec3 p = position + aVel * time;
        p = boxMin + mod(p - boxMin, boxSize);
        p += 0.12 * aRand.x * vec3(sin(time * 0.61 + aRand.z * 6.283), sin(time * 0.43 + aRand.z * 3.1), cos(time * 0.53 + aRand.z * 2.0));
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = max(-mv.z, 0.05);
        float px = sizeBase * aRand.x * projectionMatrix[1][1] * viewH * 0.5 / d;
        gl_PointSize = clamp(px, 1.5, 14.0);
        // never a blob in the face, gone before the fog eats it
        float fade = smoothstep(0.6, 2.4, d) * (1.0 - smoothstep(14.0, 26.0, d));
        float tw = 0.65 + 0.35 * sin(time * aRand.w + aRand.z * 40.0);
        vec3 lit = ambient;
        for (int i = 0; i < ${MOTE_LIGHTS}; i++) {
          if (i >= lightCount) break;
          vec4 L = lights[i];
          float dl = distance(p, L.xyz);
          float att = L.w / (1.0 + dl * dl * 0.35);
          lit += lightCols[i] * min(att, 1.6);
        }
        vCol = lit;
        vA = fade * tw * aRand.y;
      }`,
    fragmentShader: /* glsl */ `
      uniform float strength;
      uniform vec3 tint;
      varying float vA;
      varying vec3 vCol;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float r2 = dot(q, q) * 4.0;
        float a = 1.0 - smoothstep(0.0, 1.0, r2);
        a *= a;
        gl_FragColor = vec4(vCol * tint * (a * vA * strength), 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.name = "atmo_motes";
  points.frustumCulled = false;
  points.castShadow = false;
  points.receiveShadow = false;
  points.renderOrder = 20;
  const vp = new THREE.Vector4();
  points.onBeforeRender = (renderer) => {
    renderer.getCurrentViewport(vp);
    mat.uniforms.viewH.value = vp.w;
  };
  return { points, mat };
}

// ---------------------------------------------------------------------------------------------------
// Light shafts: a pooled batch of ≤ MAX_BEAMS beams in one mesh. Each beam = a 12-sided frustum shell
// (soft at the silhouette through a |N·V| falloff) + 4 cross slices (carry the glow when looking along the
// beam). Cross-section is a superellipse: exponent 2 = round cone, 4 = rounded window rectangle.
// ---------------------------------------------------------------------------------------------------
const MAX_BEAMS = 6;
const SEGS = 12;
const SLICES = 3;
const SLICE_T = [0.12, 0.42, 0.74];
const VERTS_PER_BEAM = SEGS * 4 + SLICES * 4;
const IDX_PER_BEAM = SEGS * 6 + SLICES * 6;

class BeamBatch {
  constructor() {
    const V = MAX_BEAMS * VERTS_PER_BEAM;
    this.pos = new Float32Array(V * 3);
    this.nor = new Float32Array(V * 3);
    this.uv = new Float32Array(V * 2);
    this.local = new Float32Array(V * 2);
    this.col = new Float32Array(V * 3);
    this.kind = new Float32Array(V);
    this.beamId = new Float32Array(V);
    for (let b = 0; b < MAX_BEAMS; b++) this.beamId.fill(b, b * VERTS_PER_BEAM, (b + 1) * VERTS_PER_BEAM);
    const idx = new Uint16Array(MAX_BEAMS * IDX_PER_BEAM);
    let k = 0;
    for (let b = 0; b < MAX_BEAMS; b++) {
      const base = b * VERTS_PER_BEAM;
      for (let q = 0; q < SEGS + SLICES; q++) {
        const v = base + q * 4;
        idx[k++] = v;
        idx[k++] = v + 1;
        idx[k++] = v + 2;
        idx[k++] = v;
        idx[k++] = v + 2;
        idx[k++] = v + 3;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aLocal", new THREE.BufferAttribute(this.local, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aCol", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aKind", new THREE.BufferAttribute(this.kind, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aBeam", new THREE.BufferAttribute(this.beamId, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.geo = geo;
    // per-beam bookkeeping for the camera-inside fade (preallocated)
    this.beams = [];
    for (let b = 0; b < MAX_BEAMS; b++) this.beams.push({ origin: new THREE.Vector3(), axis: new THREE.Vector3(), length: 1, r0: 1, r1: 1 });
    const fades = new Array(MAX_BEAMS).fill(1);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        strength: { value: 1 },
        tint: { value: new THREE.Vector3(1, 1, 1) },
        beamFade: { value: fades },
      },
      vertexShader: /* glsl */ `
        attribute vec2 aLocal;
        attribute vec3 aCol;
        attribute float aKind;
        attribute float aBeam;
        uniform float beamFade[${MAX_BEAMS}];
        varying vec3 vN;
        varying vec3 vW;
        varying vec2 vUv;
        varying vec2 vLocal;
        varying vec3 vCol;
        varying float vKind;
        varying float vFade;
        void main() {
          vN = normal;
          vW = position;
          vUv = uv;
          vLocal = aLocal;
          vCol = aCol;
          vKind = aKind;
          vFade = beamFade[int(aBeam + 0.5)];
          gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform float strength;
        uniform vec3 tint;
        varying vec3 vN;
        varying vec3 vW;
        varying vec2 vUv;
        varying vec2 vLocal;
        varying vec3 vCol;
        varying float vKind;
        varying float vFade;
        ${NOISE_GLSL}
        void main() {
          vec3 toCam = cameraPosition - vW;
          float dc = length(toCam);
          vec3 V = toCam / max(dc, 1e-4);
          float ndv = abs(dot(normalize(vN), V));
          float a;
          if (vKind < 0.5) {
            // shell (smooth normals): brightest where the line of sight crosses the thickest part of the
            // volume, dying out toward the silhouette so no edge is ever visible
            a = pow(ndv, 3.2);
          } else {
            // slice: carries the glow when looking along the beam; soft rounded falloff, never close-up
            float r = pow(pow(abs(vLocal.x), 3.0) + pow(abs(vLocal.y), 3.0), 1.0 / 3.0);
            a = pow(ndv, 3.0) * (1.0 - smoothstep(0.15, 1.0, r)) * 0.32 * smoothstep(1.0, 6.0, dc);
          }
          // bright near the aperture, fading out toward the far end
          float along = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.15, 1.0, vUv.y));
          // drifting dust density inside the beam (large slow billows + fine streaks)
          float n = vnoise(vec2(vUv.x * 2.0 + time * 0.02, vUv.y * 3.0 - time * 0.04));
          n += 0.5 * vnoise(vec2(vUv.x * 6.0 - time * 0.015, vUv.y * 9.0 - time * 0.07));
          n = 0.4 + 0.8 * n;
          // no wall of light when the camera walks through a beam
          a *= smoothstep(0.0, 3.0, dc) * vFade;
          gl_FragColor = vec4(vCol * tint * (a * along * n * strength), 1.0);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = "atmo_shafts";
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 18;
    this.count = 0;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._e = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  begin() {
    this.count = 0;
  }

  /**
   * beam: { origin, axis (unit), across (unit), up (unit), w0, h0, w1, h1, length, color (Vector3), n }
   * n = superellipse exponent of the cross-section (2 round, 4 rounded rectangle).
   */
  add(beam) {
    if (this.count >= MAX_BEAMS) return;
    const base = this.count * VERTS_PER_BEAM;
    const { origin, axis, across, up, w0, h0, w1, h1, length, color } = beam;
    const n = beam.n || 2;
    const e = 2 / n;
    const { _a: A, _b: B, _c: C, _d: D, _e: E, _n: N } = this;
    const rec = this.beams[this.count];
    rec.origin.copy(origin);
    rec.axis.copy(axis);
    rec.length = length;
    rec.r0 = Math.max(w0, h0);
    rec.r1 = Math.max(w1, h1);
    // superellipse |x/w|^n + |y/h|^n = 1: point and outward normal (smooth around the perimeter)
    const profile = (th, out, along) => {
      const c = Math.cos(th);
      const s = Math.sin(th);
      const px = Math.sign(c) * Math.pow(Math.abs(c), e);
      const py = Math.sign(s) * Math.pow(Math.abs(s), e);
      const w = w0 + (w1 - w0) * along;
      const h = h0 + (h1 - h0) * along;
      out.copy(origin).addScaledVector(axis, length * along).addScaledVector(across, px * w).addScaledVector(up, py * h);
    };
    const normalAt = (th, out) => {
      const c = Math.cos(th);
      const s = Math.sin(th);
      const px = Math.sign(c) * Math.pow(Math.abs(c), e);
      const py = Math.sign(s) * Math.pow(Math.abs(s), e);
      const gx = (Math.sign(px) * Math.pow(Math.abs(px), n - 1)) / Math.max(w0, 1e-3);
      const gy = (Math.sign(py) * Math.pow(Math.abs(py), n - 1)) / Math.max(h0, 1e-3);
      out.set(0, 0, 0).addScaledVector(across, gx).addScaledVector(up, gy).normalize();
    };
    let v = base;
    for (let s = 0; s < SEGS; s++) {
      const th0 = (s / SEGS) * Math.PI * 2;
      const th1 = ((s + 1) / SEGS) * Math.PI * 2;
      profile(th0, A, 0);
      profile(th1, B, 0);
      profile(th1, C, 1);
      profile(th0, D, 1);
      normalAt(th0, N);
      normalAt(th1, E);
      this.vert(v++, A, N, s / SEGS, 0, 0, 0, color, 0);
      this.vert(v++, B, E, (s + 1) / SEGS, 0, 0, 0, color, 0);
      this.vert(v++, C, E, (s + 1) / SEGS, 1, 0, 0, color, 0);
      this.vert(v++, D, N, s / SEGS, 1, 0, 0, color, 0);
    }
    for (let k = 0; k < SLICES; k++) {
      const t = SLICE_T[k];
      const w = (w0 + (w1 - w0) * t) * 1.05;
      const h = (h0 + (h1 - h0) * t) * 1.05;
      C.copy(origin).addScaledVector(axis, length * t);
      A.copy(C).addScaledVector(across, -w).addScaledVector(up, -h);
      B.copy(C).addScaledVector(across, w).addScaledVector(up, -h);
      D.copy(C).addScaledVector(across, -w).addScaledVector(up, h);
      C.addScaledVector(across, w).addScaledVector(up, h);
      this.vert(v++, A, axis, 0.5, t, -1, -1, color, 1);
      this.vert(v++, B, axis, 0.5, t, 1, -1, color, 1);
      this.vert(v++, C, axis, 0.5, t, 1, 1, color, 1);
      this.vert(v++, D, axis, 0.5, t, -1, 1, color, 1);
    }
    this.count++;
  }

  vert(i, p, n, u, v, lx, ly, col, kind) {
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.nor[i * 3] = n.x;
    this.nor[i * 3 + 1] = n.y;
    this.nor[i * 3 + 2] = n.z;
    this.uv[i * 2] = u;
    this.uv[i * 2 + 1] = v;
    this.local[i * 2] = lx;
    this.local[i * 2 + 1] = ly;
    this.col[i * 3] = col.x;
    this.col[i * 3 + 1] = col.y;
    this.col[i * 3 + 2] = col.z;
    this.kind[i] = kind;
  }

  end() {
    this.geo.setDrawRange(0, this.count * IDX_PER_BEAM);
    for (const k of ["position", "normal", "uv", "aLocal", "aCol", "aKind"]) this.geo.attributes[k].needsUpdate = true;
    this.mesh.visible = this.count > 0;
  }

  /** Dim a beam the camera is standing inside (a haze instead of a wall of light); call every frame. */
  updateCameraFade(cam) {
    const fades = this.material.uniforms.beamFade.value;
    for (let i = 0; i < MAX_BEAMS; i++) {
      if (i >= this.count) {
        fades[i] = 1;
        continue;
      }
      const b = this.beams[i];
      this._a.subVectors(cam, b.origin);
      const t = this._a.dot(b.axis);
      if (t < -2 || t > b.length + 2) {
        fades[i] = 1;
        continue;
      }
      const k = THREE.MathUtils.clamp(t / b.length, 0, 1);
      const r = b.r0 + (b.r1 - b.r0) * k;
      const d = this._a.addScaledVector(b.axis, -t).length();
      fades[i] = 0.22 + 0.78 * THREE.MathUtils.smoothstep(d, r * 0.7, r * 1.6);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// Engine glow: 7 camera-facing soft discs (one merged quad batch) behind the nozzles, exterior only.
// ---------------------------------------------------------------------------------------------------
function makeEngineGlow(materials) {
  const engines = [...ENGINES.main.map((e) => ({ ...e, main: true })), ...ENGINES.aux];
  const n = engines.length;
  const pos = new Float32Array(n * 4 * 3);
  const corner = new Float32Array(n * 4 * 2);
  const size = new Float32Array(n * 4);
  const phase = new Float32Array(n * 4);
  const idx = new Uint16Array(n * 6);
  const CORNERS = [-1, -1, 1, -1, 1, 1, -1, 1];
  engines.forEach((e, i) => {
    const L = e.main ? ENGINES.nozzleLen : ENGINES.nozzleLen * 0.5;
    const z = HULL.sternZ + L * 1.02;
    for (let c = 0; c < 4; c++) {
      const v = i * 4 + c;
      pos[v * 3] = e.x;
      pos[v * 3 + 1] = e.y;
      pos[v * 3 + 2] = z;
      corner[v * 2] = CORNERS[c * 2];
      corner[v * 2 + 1] = CORNERS[c * 2 + 1];
      size[v] = e.r * (e.main ? 1.75 : 1.6);
      phase[v] = i * 1.7;
    }
    idx[i * 6] = i * 4;
    idx[i * 6 + 1] = i * 4 + 1;
    idx[i * 6 + 2] = i * 4 + 2;
    idx[i * 6 + 3] = i * 4;
    idx[i * 6 + 4] = i * 4 + 2;
    idx[i * 6 + 5] = i * 4 + 3;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aCorner", new THREE.BufferAttribute(corner, 2));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, HULL.sternZ + 40), 420);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pulse: { value: 1 },
      color: { value: new THREE.Color(0x6fb4ff) },
      strength: { value: 0.62 },
    },
    vertexShader: /* glsl */ `
      attribute vec2 aCorner;
      attribute float aSize;
      attribute float aPhase;
      varying vec2 vQ;
      varying float vA;
      varying float vPhase;
      void main() {
        vec3 toCam = cameraPosition - position;
        float dc = length(toCam);
        // the plume is only seen from astern; from abeam it hides inside the nozzle
        float facing = toCam.z / max(dc, 1e-3);
        vA = smoothstep(0.05, 0.55, facing);
        vQ = aCorner;
        vPhase = aPhase;
        vec4 mv = viewMatrix * vec4(position, 1.0);
        mv.xy += aCorner * aSize;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform float pulse;
      uniform vec3 color;
      uniform float strength;
      varying vec2 vQ;
      varying float vA;
      varying float vPhase;
      ${NOISE_GLSL}
      void main() {
        float r2 = dot(vQ, vQ);
        if (r2 > 1.0) discard;
        // hot core + wide halo, with turbulent heat shimmer riding on the halo
        float core = exp(-r2 * 7.0);
        float halo = exp(-r2 * 2.0) * 0.34;
        float n = vnoise(vQ * 4.0 + vec2(time * 0.9 + vPhase, -time * 1.7));
        n += 0.5 * vnoise(vQ * 9.0 - vec2(time * 1.3, time * 2.4 + vPhase));
        float shimmer = 0.75 + 0.45 * n;
        float edge = 1.0 - smoothstep(0.55, 1.0, r2);
        vec3 c = color * (core * 1.6 + halo * shimmer) * edge;
        c += vec3(1.0, 1.0, 1.0) * core * 0.6;
        gl_FragColor = vec4(c * (pulse * strength * vA), 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "atmo_engine_glow";
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 6;
  const base = materials.engineGlow ? materials.engineGlow.emissiveIntensity : 3;
  return { mesh, mat, base: base || 3 };
}

// ---------------------------------------------------------------------------------------------------
// Atmosphere system
// ---------------------------------------------------------------------------------------------------
const _dir = new THREE.Vector3();
const _sun = new THREE.Vector3();
const _planet = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _across = new THREE.Vector3();
const _up = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _edge = new THREE.Vector3();
const _col = new THREE.Vector3();
const _lastAxis = new THREE.Vector3(0, 0, 0);
const _cam = new THREE.Vector3();
const _lightPick = []; // scratch for light selection (holds references, no allocation after warm-up)
const _q = new THREE.Quaternion();
const byDistanceToCamera = (a, b) => a.position.distanceToSquared(_cam) - b.position.distanceToSquared(_cam);

const SUN_COLOR = new THREE.Vector3(1.0, 0.86, 0.68);
const PLANET_COLOR = new THREE.Vector3(0.5, 0.72, 1.0);
const WORK_COLOR = new THREE.Vector3(1.0, 0.82, 0.58);

/** Distance along dir from p until the ray exits the room's inner box (floor..ceil), clamped to [minLen, 60]. */
function exitDistance(p, dir, def, minLen = 1) {
  const t = WALL_T / 2;
  let best = 1e9;
  best = Math.min(best, slabExit(def.box[0] + t, def.box[1] - t, p.x, dir.x));
  best = Math.min(best, slabExit(def.floor, def.floor + def.h, p.y, dir.y));
  best = Math.min(best, slabExit(def.box[2] + t, def.box[3] - t, p.z, dir.z));
  return Math.max(minLen, Math.min(best, 60));
}
function slabExit(lo, hi, o, d) {
  if (Math.abs(d) < 1e-6) return 1e9;
  const tt = d > 0 ? (hi - o) / d : (lo - o) / d;
  return tt > 0 ? tt : 1e9;
}

export function createAtmosphere({ scene, camera, materials, rooms }) {
  const group = new THREE.Group();
  group.name = "atmosphere";
  scene.add(group);

  // hologram look: swap the shared material before any room is built
  const holo = makeHoloMaterial(materials.holo && materials.holo.color ? materials.holo.color.getHex() : 0x5fb8ff);
  materials.holo = holo;

  const motes = makeMotes();
  group.add(motes.points);
  const shafts = new BeamBatch();
  group.add(shafts.mesh);
  const engine = makeEngineGlow(materials);
  group.add(engine.mesh);

  const state = {
    shaftRoom: null, // room def whose windows / work lights currently cast the shafts
    shaftKind: null, // "sun" | "planet" | "work" | null
    shaftCount: 0,
    shaftGain: 0,
    moteRoom: null,
    motesActive: false,
    alert: 0,
  };
  // wall side → inward normal and horizontal tangent of the window
  const SIDE_N = { zmin: new THREE.Vector3(0, 0, 1), zmax: new THREE.Vector3(0, 0, -1), xmin: new THREE.Vector3(1, 0, 0), xmax: new THREE.Vector3(-1, 0, 0) };
  const SIDE_T = { zmin: new THREE.Vector3(1, 0, 0), zmax: new THREE.Vector3(1, 0, 0), xmin: new THREE.Vector3(0, 0, 1), xmax: new THREE.Vector3(0, 0, 1) };

  // ---- light shafts ----------------------------------------------------------------------------
  /** Direction light travels (unit, into the scene) for the sun; false when the space system is not up. */
  function sunLightDir(out) {
    const sp = SYSTEMS.space;
    if (!sp || !sp.sunWorld) return false;
    out.copy(sp.sunWorld).normalize().negate();
    return true;
  }
  /** Light travelling from the primary planet (bright ocean world ahead) toward the ship. */
  function planetLightDir(out) {
    const sp = SYSTEMS.space;
    if (!sp || !sp.planets || !sp.planets.length || !sp.root) return false;
    const g = sp.planets[0].group;
    // sky root sits on the camera, so the planet's rotated local position is its direction from the viewer
    sp.root.getWorldQuaternion(_q);
    out.copy(g.position).applyQuaternion(_q).normalize().negate();
    // planet-shine is scattered by its atmosphere: compress the elevation so the beams stay shallow
    out.y *= 0.35;
    out.normalize();
    return true;
  }

  function roomHasWindows(def) {
    return !!(def && def.windows && def.windows.length);
  }

  /** Pick the room that should cast shafts this frame (current room first, then any visible one). */
  function pickShaftRoom(current) {
    if (rooms.visibleIds.has("hangar")) {
      if (!current || current.id === "hangar" || !roomHasWindows(current)) return ROOM_BY_ID.hangar;
    }
    if (roomHasWindows(current) && rooms.visibleIds.has(current.id)) return current;
    for (const id of rooms.visibleIds) {
      const def = ROOM_BY_ID[id];
      if (roomHasWindows(def)) return def;
    }
    return null;
  }

  function buildWindowBeams(def, dir, color, gain) {
    shafts.begin();
    let budget = MAX_BEAMS;
    for (const w of def.windows) {
      const nrm = SIDE_N[w.side] || SIDE_N.zmin;
      const tan = SIDE_T[w.side] || SIDE_T.zmin;
      const enter = dir.dot(nrm);
      if (enter < 0.12) continue;
      const [x0, x1, z0, z1] = def.box;
      const half = WALL_T / 2;
      const along = w.side === "zmin" || w.side === "zmax" ? [w.x0, w.x1] : [w.z0, w.z1];
      const width = along[1] - along[0];
      const height = w.v1 - w.v0;
      const K = Math.min(budget, Math.max(1, Math.round(width / 7)));
      const segW = width / K;
      _axis.copy(dir);
      // beam frame: across = horizontal perpendicular to the light, up = completes the frame
      _across.crossVectors(_axis, UP);
      if (_across.lengthSq() < 1e-6) _across.copy(tan);
      _across.normalize();
      _up.crossVectors(_across, _axis).normalize();
      // projected window extents on the beam cross-section
      const ax = Math.abs(tan.dot(_across));
      const ay = Math.abs(UP.dot(_across));
      const bx = Math.abs(tan.dot(_up));
      const by = Math.abs(UP.dot(_up));
      const cy = def.floor + (w.v0 + w.v1) / 2;
      for (let k = 0; k < K; k++) {
        const u = along[0] + segW * (k + 0.5);
        if (w.side === "zmin") _origin.set(u, cy, z0 + half + 0.05);
        else if (w.side === "zmax") _origin.set(u, cy, z1 - half - 0.05);
        else if (w.side === "xmin") _origin.set(x0 + half + 0.05, cy, u);
        else _origin.set(x1 - half - 0.05, cy, u);
        const w0 = 0.5 * (segW * 0.86 * ax + height * ay);
        const h0 = 0.5 * (segW * 0.86 * bx + height * 0.92 * by);
        // run the beam until the rays from the window's top and bottom edges have both left the room (the
        // part below the floor / beyond a wall is hidden by the depth test)
        _edge.copy(_origin).setY(_origin.y + height / 2);
        let len = exitDistance(_edge, _axis, def, 2);
        _edge.setY(_origin.y - height / 2);
        len = Math.max(len, exitDistance(_edge, _axis, def, 2));
        _col.copy(color).multiplyScalar(gain);
        shafts.add({ origin: _origin, axis: _axis, across: _across, up: _up, w0, h0, w1: w0 * 1.18, h1: h0 * 1.18, length: len, color: _col, n: 4 });
        budget--;
      }
      if (budget <= 0) break;
    }
    shafts.end();
    return shafts.count;
  }

  /** Hangar work-light cones: the room's own lights over the well when it has them, else a fixed grid. */
  function buildHangarCones(def) {
    const bay = BAYS.hangar;
    const rec = rooms.rooms.get(def.id);
    const lights = rec && rec.ctx ? rec.ctx.lights : null;
    _lightPick.length = 0;
    if (lights) {
      for (const l of lights) {
        if (!l.isPointLight && !l.isSpotLight) continue;
        const p = l.position;
        if (p.x < bay.x0 - 4 || p.x > bay.x1 + 4 || p.z < bay.z0 - 4 || p.z > bay.z1 + 4) continue;
        if (p.y < def.floor + def.h * 0.3) continue;
        _lightPick.push(l);
        if (_lightPick.length >= MAX_BEAMS) break;
      }
    }
    shafts.begin();
    _axis.set(0, -1, 0);
    _across.set(1, 0, 0);
    _up.set(0, 0, 1);
    if (_lightPick.length >= 2) {
      for (const l of _lightPick) {
        _origin.copy(l.position);
        const len = Math.max(6, _origin.y - (def.floor - 4));
        _col.set(l.color.r, l.color.g, l.color.b).multiply(WORK_COLOR).multiplyScalar(0.9);
        shafts.add({ origin: _origin, axis: _axis, across: _across, up: _up, w0: 0.9, h0: 0.9, w1: len * 0.22, h1: len * 0.22, length: len, color: _col, n: 2 });
      }
    } else {
      const cx = (bay.x0 + bay.x1) / 2;
      const zs = [bay.z0 + 20, (bay.z0 + bay.z1) / 2, bay.z1 - 20];
      for (const z of zs) {
        for (const sx of [-1, 1]) {
          _origin.set(cx + sx * 11, def.floor + def.h - 0.6, z);
          const len = def.h + 4;
          _col.copy(WORK_COLOR).multiplyScalar(0.85);
          shafts.add({ origin: _origin, axis: _axis, across: _across, up: _up, w0: 0.9, h0: 0.9, w1: len * 0.22, h1: len * 0.22, length: len, color: _col, n: 2 });
        }
      }
    }
    shafts.end();
    return shafts.count;
  }

  function updateShafts(mode, current) {
    if (mode !== "interior") {
      if (state.shaftCount) {
        shafts.begin();
        shafts.end();
        state.shaftCount = 0;
        state.shaftRoom = null;
        state.shaftKind = null;
      }
      return;
    }
    const def = pickShaftRoom(current);
    if (!def) {
      if (state.shaftCount) {
        shafts.begin();
        shafts.end();
      }
      state.shaftCount = 0;
      state.shaftRoom = null;
      state.shaftKind = null;
      return;
    }
    if (def.id === "hangar") {
      if (state.shaftRoom !== def || state.shaftKind !== "work") {
        state.shaftCount = buildHangarCones(def);
        state.shaftRoom = def;
        state.shaftKind = "work";
        shafts.material.uniforms.strength.value = 0.16;
      }
      return;
    }
    // window room: sun beams when the sun is in front of the glazing, otherwise planet-shine
    let kind = null;
    let gain = 0;
    if (sunLightDir(_sun)) {
      let best = 0;
      for (const w of def.windows) best = Math.max(best, _sun.dot(SIDE_N[w.side] || SIDE_N.zmin));
      if (best > 0.12) {
        kind = "sun";
        gain = THREE.MathUtils.smoothstep(best, 0.12, 0.6);
        _dir.copy(_sun);
      }
    }
    if (!kind && planetLightDir(_planet)) {
      let best = 0;
      for (const w of def.windows) best = Math.max(best, _planet.dot(SIDE_N[w.side] || SIDE_N.zmin));
      if (best > 0.1) {
        kind = "planet";
        gain = 0.7 * THREE.MathUtils.smoothstep(best, 0.1, 0.5);
        _dir.copy(_planet);
      }
    }
    if (!kind) {
      if (state.shaftCount) {
        shafts.begin();
        shafts.end();
      }
      state.shaftCount = 0;
      state.shaftRoom = def;
      state.shaftKind = null;
      return;
    }
    // rebuild only when the set changes or the light has swung by more than ~0.3°
    const moved = _lastAxis.dot(_dir) < 0.999986;
    if (state.shaftRoom !== def || state.shaftKind !== kind || moved || Math.abs(state.shaftGain - gain) > 0.02) {
      state.shaftCount = buildWindowBeams(def, _dir, kind === "sun" ? SUN_COLOR : PLANET_COLOR, gain);
      state.shaftRoom = def;
      state.shaftKind = kind;
      state.shaftGain = gain;
      _lastAxis.copy(_dir);
      shafts.material.uniforms.strength.value = kind === "sun" ? 0.2 : 0.22;
    }
  }

  // ---- dust motes ------------------------------------------------------------------------------
  const u = motes.mat.uniforms;
  function updateMotes(mode, current) {
    const active = mode === "interior" && !!current;
    motes.points.visible = active;
    state.motesActive = active;
    state.moteRoom = active ? current : null;
    if (!active) return;
    const [x0, x1, z0, z1] = current.box;
    const t = WALL_T / 2;
    const rx0 = x0 + t + 0.1;
    const rx1 = x1 - t - 0.1;
    const ry0 = current.floor + 0.05;
    const ry1 = current.floor + current.h - 0.1;
    const rz0 = z0 + t + 0.1;
    const rz1 = z1 - t - 0.1;
    _cam.copy(camera.position);
    const sx = Math.min(rx1 - rx0, CLOUD.x);
    const sy = Math.min(ry1 - ry0, CLOUD.y);
    const sz = Math.min(rz1 - rz0, CLOUD.z);
    u.boxSize.value.set(Math.max(sx, 0.5), Math.max(sy, 0.5), Math.max(sz, 0.5));
    u.boxMin.value.set(THREE.MathUtils.clamp(_cam.x - sx / 2, rx0, rx1 - sx), THREE.MathUtils.clamp(_cam.y - sy / 2, ry0, ry1 - sy), THREE.MathUtils.clamp(_cam.z - sz / 2, rz0, rz1 - sz));
    // room lights: the 8 nearest to the camera
    const rec = rooms.rooms.get(current.id);
    const lights = rec && rec.ctx ? rec.ctx.lights : null;
    let n = 0;
    if (lights) {
      _lightPick.length = 0;
      for (const l of lights) if (l.isPointLight || l.isSpotLight) _lightPick.push(l);
      if (_lightPick.length > MOTE_LIGHTS) _lightPick.sort(byDistanceToCamera);
      n = Math.min(MOTE_LIGHTS, _lightPick.length);
      for (let i = 0; i < n; i++) {
        const l = _lightPick[i];
        const p = l.position;
        // rooms attach lights directly to their group (identity transform), so local == world
        u.lights.value[i].set(p.x, p.y, p.z, Math.min(2.5, Math.sqrt(Math.max(l.intensity, 0) / 12)));
        u.lightCols.value[i].set(l.color.r, l.color.g, l.color.b);
      }
    }
    u.lightCount.value = n;
  }

  // ---- engine glow -----------------------------------------------------------------------------
  function updateEngine(mode, t) {
    const on = mode === "exterior";
    engine.mesh.visible = on;
    if (!on) return;
    const em = materials.engineGlow;
    engine.mat.uniforms.pulse.value = em ? em.emissiveIntensity / engine.base : 1;
    engine.mat.uniforms.time.value = t;
    if (em && em.emissive) engine.mat.uniforms.color.value.copy(em.emissive);
  }

  return {
    group,
    holo,
    motes: motes.points,
    shafts: shafts.mesh,
    engineGlow: engine.mesh,
    state,
    /** info: { mode, playerPos, currentRoom } */
    update(dt, t, info) {
      void dt;
      const mode = info && info.mode ? info.mode : "exterior";
      const current = (info && info.currentRoom) || rooms.current;
      const alert = SYSTEMS.lighting ? SYSTEMS.lighting.alert : 0;
      state.alert = alert;
      alertLevel.value = alert;
      holo.uniforms.time.value = t;
      holo.uniforms.opacity.value = holo.opacity;
      motes.mat.uniforms.time.value = t;
      shafts.material.uniforms.time.value = t;
      // alert: shafts and motes go red with the strips
      motes.mat.uniforms.tint.value.copy(WHITE).lerp(ALERT_TINT, alert);
      shafts.material.uniforms.tint.value.copy(WHITE).lerp(ALERT_TINT, alert * 0.9);
      updateMotes(mode, current);
      updateShafts(mode, current);
      if (state.shaftCount) shafts.updateCameraFade(camera.position);
      updateEngine(mode, t);
    },
    /** Cheap stats for tools / the debug API. */
    stats() {
      return {
        motes: state.motesActive ? MOTE_COUNT : 0,
        moteRoom: state.moteRoom ? state.moteRoom.id : null,
        shafts: state.shaftCount,
        shaftRoom: state.shaftRoom ? state.shaftRoom.id : null,
        shaftKind: state.shaftKind,
        shaftTriangles: state.shaftCount * (IDX_PER_BEAM / 3),
        engineGlow: engine.mesh.visible,
        alert: state.alert,
      };
    },
  };
}
