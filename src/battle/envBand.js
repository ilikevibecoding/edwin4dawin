// Galactic band: a smooth milky glow with dust lanes and a fine grain of unresolved stars. The 12
// noise octaves it takes are far too expensive to evaluate per sky pixel every frame (the sky covers
// 35-90 % of most frames), so the band is baked once, on the first frame, into a 1024x512 equirect
// render target with the same shader, and the sky sphere then samples it with a single texture tap.
// Stored as 8-bit intensity (x0.5) + core weight; the tint is applied at sample time.
import * as THREE from "three";
import { GLSL_HASH, GLSL_NOISE3 } from "./envGlsl.js";

// direction of the galactic plane's normal and of its bright core, shared by stars and band
export const BAND_NORMAL = new THREE.Vector3(0.3, 0.75, -0.6).normalize();
export const BAND_CORE = new THREE.Vector3(-0.85, 0.05, -0.5).normalize();

const BAKE_W = 1024;
const BAKE_H = 512;

const bakeVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// the original per-pixel band, evaluated over the equirect parameterisation (u longitude about +y,
// v latitude)
const bakeFrag = /* glsl */ `
uniform vec3 uBandN;
uniform vec3 uCore;
varying vec2 vUv;
${GLSL_HASH}
${GLSL_NOISE3}
void main() {
  float lon = (vUv.x - 0.5) * 6.2831853;
  float lat = (vUv.y - 0.5) * 3.14159265;
  vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float bl = dot(d, uBandN);
  // band profile ~ +-10 degrees, brightening toward the core, broken by patchiness, dust lanes and a
  // fine grain (unresolved stars) so it never reads as smooth fog
  float band = exp(-bl * bl / (2.0 * 0.09 * 0.09));
  float n1 = fbm3(d * 6.0, 4);
  float n2 = fbm3(d * 21.0 + 3.1, 3);
  float grain = fbm3(d * 90.0 + 7.7, 2);
  float lane = smoothstep(0.48, 0.66, fbm3(d * 4.5 + 9.0, 3)) * exp(-bl * bl / (2.0 * 0.04 * 0.04));
  float ang = acos(clamp(dot(d, uCore), -1.0, 1.0));
  float core = exp(-ang * ang / (2.0 * 0.45 * 0.45));
  // low-contrast patchiness: high contrast here reads as smoke rather than unresolved starlight
  float I = band * (0.45 + 0.55 * smoothstep(0.2, 0.8, n1)) * (0.7 + 0.3 * n2) * (0.6 + 0.8 * grain)
          * (1.0 - 0.55 * lane) * (0.45 + 1.5 * core);
  // I peaks near 2: half of it fits 8 bits with 1/128 steps, far below what the eye sees at this level
  gl_FragColor = vec4(I * 0.5, core, 0.0, 1.0);
}`;

const bandVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
}`;

const bandFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uIntensity;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  vec4 t = texture2D(uMap, uv);
  vec3 col = mix(vec3(0.88, 0.92, 1.0), vec3(1.0, 0.93, 0.85), t.g) * (t.r * 2.0 * uIntensity);
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * Render the band once into an equirect texture. Called with the renderer on the first frame (the sky
 * is built before the renderer is handed around), so it is safe inside onBeforeRender: three.js
 * supports nested render calls (this is how Reflector works) and the previous target is restored.
 */
function bakeBand(renderer) {
  const rt = new THREE.WebGLRenderTarget(BAKE_W, BAKE_H, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    colorSpace: THREE.NoColorSpace,
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: { uBandN: { value: BAND_NORMAL }, uCore: { value: BAND_CORE } },
    vertexShader: bakeVert,
    fragmentShader: bakeFrag,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prevTarget = renderer.getRenderTarget();
  const prevXr = renderer.xr.enabled;
  renderer.xr.enabled = false;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prevTarget);
  renderer.xr.enabled = prevXr;
  quad.geometry.dispose();
  mat.dispose();
  return rt.texture;
}

export function buildBand(group, radius) {
  // 1x1 black placeholder until the first frame bakes the real map
  const placeholder = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  placeholder.needsUpdate = true;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: placeholder },
      uIntensity: { value: 0.027 },
    },
    vertexShader: bandVert,
    fragmentShader: bandFrag,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.95, 48, 32),
    m,
  );
  mesh.name = "galacticBand";
  mesh.frustumCulled = false;
  mesh.renderOrder = -11;
  let baked = false;
  mesh.onBeforeRender = (renderer) => {
    if (baked) return;
    baked = true;
    const t0 = performance.now();
    m.uniforms.uMap.value = bakeBand(renderer);
    placeholder.dispose();
    mesh.userData.bakeMs = performance.now() - t0;
  };
  group.add(mesh);
  return mesh;
}
