// Dust skirt at the funnel's ground contact: a ring of low, fast pixel-art dust puffs that orbit the base, drift
// outward and rise while they grow and fade. One InstancedMesh (one draw call); every puff's position is a
// pure function of time and its static per-instance seed, so the CPU only updates a handful of uniforms.
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';
import { RNG } from '../../rng.js';
import { SWIRL_SIGN } from './field.js';
import { STORM_GLSL } from './funnel.js';

export const SKIRT_PUFFS = 64;
const VARIANTS = 4;   // blob shapes in the mask atlas

let maskTexture = null;
// 4 chunky 8x8 blob masks side by side (NearestFilter -> visible pixels)
function getMaskTexture() {
  if (maskTexture) return maskTexture;
  const S = 8, canvas = document.createElement('canvas');
  canvas.width = S * VARIANTS; canvas.height = S;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S * VARIANTS, S);
  const rng = new RNG(0x5c1a7);
  for (let v = 0; v < VARIANTS; v++) {
    const cx = 3.5 + (rng.next() - 0.5), cy = 3.5 + (rng.next() - 0.5), rx = 3.2 + rng.next() * 0.8, ry = 2.6 + rng.next() * 1.2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const inside = dx * dx + dy * dy + (rng.next() - 0.5) * 0.35 < 1;
      const i = (y * S * VARIANTS + v * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = inside ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
  maskTexture = t;
  return t;
}

const VERT = /* glsl */ `
attribute vec4 aSeed;   // life phase, start angle, speed/radius factor, size factor
attribute float aVariant;
uniform float uTime; uniform vec3 uCenter; uniform float uRadius; uniform float uSpin; uniform float uLift;
varying vec2 vUv; varying float vAlpha; varying float vDist; varying float vShade;
void main() {
  float period = 1.3 + 0.8 * aSeed.z;
  float u = fract(uTime / period + aSeed.x);                       // 0..1 life cycle
  float r = uRadius * (0.55 + 0.25 * aSeed.z + 1.15 * u);           // spirals outward from the core wall
  float ang = aSeed.y - uSpin * uTime * (2.2 + 1.2 * aSeed.z) / (0.7 + 1.0 * u);
  float y = uLift + 0.3 + (1.5 + 3.0 * aSeed.w) * u * u;            // stays low, rises late
  vec3 c = uCenter + vec3(cos(ang) * r, y, sin(ang) * r);
  float size = (1.8 + 1.6 * aSeed.w) * (0.55 + 0.75 * u);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 p = c + (right * position.x + up * position.y) * size;
  vAlpha = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.45, 1.0, u));
  vShade = 0.8 + 0.4 * aSeed.w;
  vUv = vec2((uv.x + aVariant) / ${VARIANTS.toFixed(1)}, uv.y);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMask; uniform vec3 uColor; uniform float uOpacity;
${STORM_GLSL}
varying vec2 vUv; varying float vAlpha; varying float vDist; varying float vShade;
void main() {
  if (texture2D(uMask, vUv).a < 0.5) discard;
  float a = floor(vAlpha * 3.0 + 0.5) / 3.0 * uOpacity;            // banded fade: pixel-art puffs
  if (a < 0.02) discard;
  vec3 col = stormLight(uColor * vShade);
  col = applyStormFog(col, vDist);
  gl_FragColor = vec4(col, a);
}`;

export class DustSkirt {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const seed = new Float32Array(SKIRT_PUFFS * 4), variant = new Float32Array(SKIRT_PUFFS);
    const rng = new RNG(0x9d0ff);
    for (let i = 0; i < SKIRT_PUFFS; i++) {
      seed[i * 4] = i / SKIRT_PUFFS; seed[i * 4 + 1] = rng.next() * Math.PI * 2; seed[i * 4 + 2] = rng.next(); seed[i * 4 + 3] = rng.next();
      variant[i] = i % VARIANTS;
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    geo.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variant, 1));
    geo.instanceCount = SKIRT_PUFFS;
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uDay: { value: 1 },
        uMask: { value: getMaskTexture() }, uColor: { value: new THREE.Vector3(0.62, 0.52, 0.38) }, uOpacity: { value: 0 },
        uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uRadius: { value: 9 }, uSpin: { value: SWIRL_SIGN }, uLift: { value: 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  // x, y, z: funnel base; radius: core radius; time: visual clock; opacity: 0..1 (fades with the rope-out);
  // lift: how far the base has lifted off the ground (rope-out), day: daylight factor
  update(x, y, z, radius, time, opacity, lift, day) {
    this.mesh.visible = opacity > 0.01;
    const u = this.material.uniforms;
    u.uCenter.value.set(x, y, z); u.uRadius.value = radius; u.uTime.value = time; u.uOpacity.value = opacity; u.uLift.value = lift; u.uDay.value = day;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.material.dispose();
    this.geo.dispose();
  }
}
