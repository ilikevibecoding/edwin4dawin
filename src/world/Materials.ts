import * as THREE from 'three';
import { T } from '../engine/Textures';

/**
 * Adds a cheap fresnel "subsurface" term so skin and porcelain shells pick up a
 * warm rim instead of going flat black in shadow.
 */
function addRim(mat: THREE.MeshPhysicalMaterial, color: THREE.Color, power = 2.4, strength = 0.35) {
  const uniforms = {
    uRimColor: { value: color },
    uRimPower: { value: power },
    uRimStrength: { value: strength },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform vec3 uRimColor;
         uniform float uRimPower;
         uniform float uRimStrength;
         void main() {`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           vec3 vDir = normalize(vViewPosition);
           float fres = pow(1.0 - clamp(dot(normalize(normal), vDir), 0.0, 1.0), uRimPower);
           totalEmissiveRadiance += uRimColor * fres * uRimStrength;
         }`,
      );
  };
  mat.customProgramCacheKey = () => `rim-${color.getHexString()}-${power}-${strength}`;
  return mat;
}

export interface SkinTone {
  base: THREE.ColorRepresentation;
  sss: THREE.ColorRepresentation;
}

export const SKIN_TONES: Record<string, SkinTone> = {
  porcelain: { base: 0xd8b5a4, sss: 0xff6a52 },
  fair: { base: 0xc99a86, sss: 0xff5f45 },
  olive: { base: 0xa87a5f, sss: 0xf2543a },
  brown: { base: 0x74503c, sss: 0xd8402c },
  deep: { base: 0x4b3226, sss: 0xb02c1c },
};

export function skinMaterial(tone: SkinTone, opts: { android?: boolean } = {}): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: tone.base,
    roughness: 0.46,
    roughnessMap: T.skinRough(),
    normalMap: T.skinNormal(),
    normalScale: new THREE.Vector2(0.55, 0.55),
    metalness: 0,
    clearcoat: opts.android ? 0.45 : 0.2,
    clearcoatRoughness: opts.android ? 0.24 : 0.42,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(tone.sss).multiplyScalar(0.4),
  });
  return addRim(mat, new THREE.Color(tone.sss), opts.android ? 2.6 : 2.0, opts.android ? 0.3 : 0.42);
}

export function eyeMaterial(iris: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    map: iris,
    roughness: 0.02,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    envMapIntensity: 3.0,
  });
}

export function clothMaterial(color: THREE.ColorRepresentation, roughness = 0.78, sheen = 0.2) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    roughnessMap: T.fabricRough(),
    normalMap: T.fabricNormal(),
    normalScale: new THREE.Vector2(0.5, 0.5),
    metalness: 0,
    sheen,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4),
  });
  mat.normalMap!.repeat.set(3, 3);
  return mat;
}

export function leatherMaterial(color: THREE.ColorRepresentation = 0x17181c) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    roughnessMap: T.fabricRough(),
    normalMap: T.fabricNormal(),
    normalScale: new THREE.Vector2(0.9, 0.9),
    clearcoat: 0.5,
    clearcoatRoughness: 0.35,
    metalness: 0.05,
  });
}

export function metalMaterial(color: THREE.ColorRepresentation = 0x9aa3ad, roughness = 0.32) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 1,
    roughness,
    roughnessMap: T.metalRough(),
    normalMap: T.metalNormal(),
    normalScale: new THREE.Vector2(0.4, 0.4),
    envMapIntensity: 1.1,
  });
}

export function paintedMetal(color: THREE.ColorRepresentation, roughness = 0.35) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.15,
    roughness,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    normalMap: T.metalNormal(),
    normalScale: new THREE.Vector2(0.18, 0.18),
  });
}

export function concreteMaterial(repeat = 4) {
  const mat = new THREE.MeshStandardMaterial({
    map: T.concreteAlbedo(),
    normalMap: T.concreteNormal(),
    roughnessMap: T.concreteRough(),
    roughness: 1,
    metalness: 0,
  });
  [mat.map, mat.normalMap, mat.roughnessMap].forEach((t) => t && t.repeat.set(repeat, repeat));
  return mat;
}

export function glassMaterial(tint: THREE.ColorRepresentation = 0x0b1a24, opacity = 0.28) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
    normalMap: T.scratchedGlass(),
    normalScale: new THREE.Vector2(0.15, 0.15),
  });
}

export function emissiveMaterial(color: THREE.ColorRepresentation, intensity = 3) {
  const c = new THREE.Color(color);
  return new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(intensity), toneMapped: false });
}

/** Additive card for neon glow halos and light shafts. */
export function glowMaterial(color: THREE.ColorRepresentation, intensity = 1, softness = 1.8) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uSoftness: { value: softness },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uSoftness;
      void main() {
        vec2 d = vUv * 2.0 - 1.0;
        float f = 1.0 - clamp(length(d), 0.0, 1.0);
        float a = pow(f, uSoftness);
        gl_FragColor = vec4(uColor * uIntensity * a, a);
      }`,
  });
}

/** Volumetric-ish light cone: soft at the rim, fades along its length. */
export function lightShaftMaterial(color: THREE.ColorRepresentation, intensity = 0.5) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vNormalW), vViewDir));
        float along = 1.0 - vUv.y;
        float a = pow(rim, 1.6) * pow(along, 1.5);
        float dust = 0.85 + 0.15 * sin(vUv.y * 40.0 + uTime * 0.6);
        gl_FragColor = vec4(uColor * uIntensity * a * dust, a * 0.9);
      }`,
  });
}

/**
 * Wet asphalt: planar reflection texture distorted by ripples, blended by fresnel
 * and a puddle mask. Cheaper than SSR and reads perfectly for rainy nights.
 */
export function wetGroundMaterial(reflection: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tReflect: { value: reflection },
      tAlbedo: { value: T.asphaltAlbedo() },
      tNormal: { value: T.asphaltNormal() },
      tPuddle: { value: T.puddleMask() },
      uTime: { value: 0 },
      uRepeat: { value: 8 },
      uReflectStrength: { value: 1.0 },
      uRipple: { value: 1.0 },
      uFogColor: { value: new THREE.Color(0x0a141c) },
      uFogDensity: { value: 0.018 },
      uAmbient: { value: new THREE.Color(0x16222c) },
      uTextureMatrix: { value: new THREE.Matrix4() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vReflectUv;
      uniform mat4 uTextureMatrix;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vReflectUv = uTextureMatrix * world;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec4 vReflectUv;
      uniform sampler2D tReflect;
      uniform sampler2D tAlbedo;
      uniform sampler2D tNormal;
      uniform sampler2D tPuddle;
      uniform float uTime, uRepeat, uReflectStrength, uRipple, uFogDensity;
      uniform vec3 uFogColor, uAmbient;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }

      void main() {
        vec2 uv = vUv * uRepeat;
        vec3 albedo = texture2D(tAlbedo, uv).rgb;
        float puddle = texture2D(tPuddle, vUv * uRepeat * 0.5).r;

        // Expanding rain rings on the water surface.
        vec2 rip = vec2(0.0);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 cell = floor(vWorld.xz * 1.4 + fi * 13.0);
          float t = fract(uTime * 0.6 + hash(cell + fi));
          vec2 c = (cell + vec2(hash(cell), hash(cell + 7.7))) / 1.4;
          float d = length(vWorld.xz - c);
          float r = t * 1.2;
          float ring = exp(-abs(d - r) * 22.0) * (1.0 - t);
          rip += normalize(vWorld.xz - c + 1e-5) * ring * 0.06;
        }
        vec3 n = texture2D(tNormal, uv).rgb * 2.0 - 1.0;
        vec2 distort = (n.xy * 0.035 + rip * uRipple) * mix(0.35, 1.0, puddle);

        vec2 ruv = vReflectUv.xy / max(vReflectUv.w, 1e-4);
        vec3 refl = texture2D(tReflect, clamp(ruv + distort, vec2(0.001), vec2(0.999))).rgb;

        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = mix(0.12, 1.0, pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 3.0));
        float wet = mix(0.3, 1.0, puddle);
        vec3 col = albedo * uAmbient * 38.0;
        col += refl * fres * uReflectStrength * 1.25 * wet;
        // Sheen where the water film catches grazing light.
        col += refl * 0.2 * wet;
        // Broad wet specular so the road never goes flat black.
        vec3 sheenDir = normalize(vec3(0.35, 0.75, 0.55));
        vec3 nrm = normalize(vec3(n.x * 0.35, 1.0, n.y * 0.35));
        float spec = pow(max(dot(reflect(-viewDir, nrm), sheenDir), 0.0), 24.0);
        col += vec3(0.55, 0.68, 0.85) * spec * wet * 0.5;

        float dist = length(cameraPosition - vWorld);
        float fog = 1.0 - exp(-dist * dist * uFogDensity * 0.02);
        col = mix(col, uFogColor, clamp(fog, 0.0, 0.92));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/** Animated holographic advertisement panel. */
export function hologramMaterial(color: THREE.ColorRepresentation, seed = 0) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uSeed: { value: seed },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uSeed;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(21.3 + uSeed, 91.7))) * 43758.5); }
      float bar(float y, float t) {
        return step(hash(vec2(floor(y * 14.0), floor(t))) , 0.55);
      }
      void main() {
        vec2 uv = vUv;
        float rows = bar(uv.y, uTime * 0.7);
        float scan = 0.55 + 0.45 * sin(uv.y * 220.0 + uTime * 6.0);
        float flick = 0.8 + 0.2 * sin(uTime * 30.0 + uSeed);
        float edge = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x) *
                     smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
        float glyph = step(0.45, hash(floor(uv * vec2(26.0, 34.0)) + floor(uTime * 1.5)));
        float a = edge * (0.18 + glyph * 0.55 * rows) * scan * flick;
        gl_FragColor = vec4(uColor * a * 2.4, a * 0.75);
      }`,
  });
}
