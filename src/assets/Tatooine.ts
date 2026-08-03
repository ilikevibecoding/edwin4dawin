import * as THREE from 'three';
import type { QualitySettings } from '../core/Quality';

/**
 * The desert world.
 *
 * Rendered in the background scene at planetary scale: a shaded sphere with
 * banded dune colour, a dust haze layer, and two additive atmosphere shells
 * that give the bright limb its glow.
 *
 * All surface detail is analytic value noise in GLSL — no textures, so the
 * planet stays crisp from orbit down to a limb close-up.
 */

const NOISE_GLSL = /* glsl */ `
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
          mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
          mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p, int octaves) {
    float sum = 0.0, amp = 0.5, norm = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      sum += vnoise(p) * amp;
      norm += amp;
      p *= 2.07;
      amp *= 0.5;
    }
    return sum / norm;
  }
  float ridged(vec3 p, int octaves) {
    float sum = 0.0, amp = 0.5, norm = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      sum += (1.0 - abs(vnoise(p) * 2.0 - 1.0)) * amp;
      norm += amp;
      p *= 2.13;
      amp *= 0.5;
    }
    return sum / norm;
  }
`;

const _center = new THREE.Vector3();

export class Tatooine {
  readonly root = new THREE.Group();
  readonly radius: number;
  private surfaceMat: THREE.ShaderMaterial;
  private hazeMat: THREE.ShaderMaterial;
  private rimMat: THREE.ShaderMaterial;
  private dustMat: THREE.ShaderMaterial;
  private surface: THREE.Mesh;

  constructor(quality: QualitySettings, radius = 9000) {
    this.radius = radius;
    this.root.name = 'Tatooine';

    const segs = quality.planetSegments;
    const detailOctaves = quality.name === 'low' ? 4 : quality.name === 'medium' ? 6 : 7;

    this.surfaceMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(0.62, 0.34, 0.7).normalize() },
        time: { value: 0 },
        octaves: { value: detailOctaves },
        sandLow: { value: new THREE.Color(0xb26c30) },
        sandHigh: { value: new THREE.Color(0xdcae62) },
        sandDeep: { value: new THREE.Color(0x6b3d1d) },
        polar: { value: new THREE.Color(0xc9b491) },
        ambient: { value: 0.045 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vPosL;
        varying vec3 vViewDir;
        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vPosL = normalize(position);
          vec4 world = modelMatrix * vec4(position, 1.0);
          vViewDir = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 sunDirection, sandLow, sandHigh, sandDeep, polar;
        uniform float time, ambient;
        uniform int octaves;
        varying vec3 vNormalW;
        varying vec3 vPosL;
        varying vec3 vViewDir;
        ${NOISE_GLSL}
        void main() {
          vec3 p = vPosL;
          float continents = fbm(p * 2.3, octaves);
          float dunes = ridged(p * 11.0 + vec3(3.1), octaves);
          float fine = fbm(p * 46.0, min(octaves, 5));
          float basins = smoothstep(0.42, 0.66, continents);

          vec3 col = mix(sandDeep, sandLow, smoothstep(0.28, 0.58, continents));
          col = mix(col, sandHigh, basins * 0.85);
          col = mix(col, col * 1.14, dunes * 0.55);
          col *= 0.86 + fine * 0.3;

          // Salt flats / dry seabeds catch more light.
          float flats = smoothstep(0.74, 0.9, fbm(p * 3.7 + vec3(11.0), 4));
          col = mix(col, vec3(0.78, 0.70, 0.55), flats * 0.42);

          // Darker mineral highlands break up the sand.
          float highland = smoothstep(0.62, 0.82, fbm(p * 5.1 + vec3(29.0), 5));
          col = mix(col, col * vec3(0.72, 0.66, 0.58), highland * 0.6);

          // Cooler tone toward the poles.
          float lat = abs(p.y);
          col = mix(col, polar, smoothstep(0.74, 0.99, lat) * 0.4);

          vec3 n = normalize(vNormalW);
          float ndl = dot(n, normalize(sunDirection));
          // Soft terminator, slight wrap for atmospheric scattering.
          float light = smoothstep(-0.2, 0.36, ndl);
          float rim = pow(1.0 - max(dot(n, normalize(vViewDir)), 0.0), 3.4);

          vec3 lit = col * (light * 1.18 + ambient);
          lit += vec3(0.95, 0.6, 0.34) * rim * light * 0.4;
          // Dusk band along the terminator.
          lit += vec3(0.5, 0.2, 0.08) * smoothstep(0.26, 0.0, abs(ndl)) * 0.45;
          // Limb darkening: without it a fully lit hemisphere reads as a flat
          // disc with a texture on it rather than as a ball.
          float facing = max(dot(n, normalize(vViewDir)), 0.0);
          lit *= mix(0.62, 1.04, pow(facing, 0.42));
          gl_FragColor = vec4(lit, 1.0);
        }
      `,
    });

    const sphere = new THREE.SphereGeometry(radius, segs, Math.max(24, segs / 2));
    this.surface = new THREE.Mesh(sphere, this.surfaceMat);
    this.surface.name = 'planetSurface';
    this.root.add(this.surface);

    // ------------------------------------------------------- dust / cloud
    this.dustMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(0.62, 0.34, 0.7).normalize() },
        time: { value: 0 },
        tint: { value: new THREE.Color(0xf0dcb4) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW; varying vec3 vPosL;
        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vPosL = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 sunDirection, tint; uniform float time;
        varying vec3 vNormalW; varying vec3 vPosL;
        ${NOISE_GLSL}
        void main() {
          vec3 p = vPosL * 3.4 + vec3(time * 0.004, 0.0, time * 0.002);
          float bands = fbm(vec3(p.x, p.y * 3.0, p.z), 5);
          float storm = smoothstep(0.52, 0.78, bands);
          float ndl = smoothstep(-0.16, 0.42, dot(normalize(vNormalW), normalize(sunDirection)));
          float a = storm * 0.42 * ndl;
          gl_FragColor = vec4(tint * ndl * 1.1, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const dust = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.006, Math.max(48, segs / 2), Math.max(24, segs / 4)),
      this.dustMat,
    );
    dust.name = 'planetDust';
    this.root.add(dust);

    // ------------------------------------------------------- atmosphere
    // A fresnel on a slightly larger shell draws a hard ring: the glow stops
    // dead at the shell's own silhouette. Instead the shell is thick and the
    // shader works from the view ray's impact parameter, so the air thins out
    // smoothly with altitude the way it actually does.
    const atmoVert = /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `;
    const atmoFrag = /* glsl */ `
      uniform vec3 sunDirection, innerColor, outerColor, center;
      uniform float rPlanet, rAtmo, strength, falloff, limbPower;
      varying vec3 vWorld;
      void main() {
        vec3 ro = cameraPosition - center;
        vec3 rd = normalize(vWorld - cameraPosition);
        float tc = dot(-ro, rd);
        vec3 closest = ro + rd * max(tc, 0.0);
        float b = length(closest);

        // Above the surface the column thins exponentially with altitude;
        // across the disc it brightens toward the limb.
        float altitude = clamp((b - rPlanet) / max(1.0, rAtmo - rPlanet), 0.0, 1.0);
        float outside = exp(-altitude * falloff) * (1.0 - smoothstep(0.85, 1.0, altitude));
        float inside = pow(clamp(b / rPlanet, 0.0, 1.0), limbPower);
        float density = b > rPlanet ? outside : max(inside, 0.0);

        vec3 limbDir = b > 1.0 ? normalize(closest) : vec3(0.0, 1.0, 0.0);
        float ndl = smoothstep(-0.30, 0.42, dot(limbDir, normalize(sunDirection)));

        vec3 col = mix(innerColor, outerColor, clamp(altitude * 1.6, 0.0, 1.0));
        float a = density * ndl * strength;
        gl_FragColor = vec4(col * a * 1.7, a);
      }
    `;
    const atmoUniforms = (
      inner: number,
      outer: number,
      rp: number,
      ra: number,
      strengthValue: number,
      falloff: number,
      limbPower: number,
    ): Record<string, THREE.IUniform> => ({
      sunDirection: { value: new THREE.Vector3(0.62, 0.34, 0.7).normalize() },
      innerColor: { value: new THREE.Color(inner) },
      outerColor: { value: new THREE.Color(outer) },
      center: { value: new THREE.Vector3() },
      rPlanet: { value: rp },
      rAtmo: { value: ra },
      strength: { value: strengthValue },
      falloff: { value: falloff },
      limbPower: { value: limbPower },
    });

    // Low, warm dust haze hugging the surface.
    this.hazeMat = new THREE.ShaderMaterial({
      uniforms: atmoUniforms(0xffc590, 0xf0b884, radius, radius * 1.035, 0.62, 5.2, 7.0),
      vertexShader: atmoVert,
      fragmentShader: atmoFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const haze = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.04, 96, 48), this.hazeMat);
    haze.name = 'planetHaze';
    this.root.add(haze);

    // The high, cool scattering shell that gives the limb its blue edge.
    this.rimMat = new THREE.ShaderMaterial({
      uniforms: atmoUniforms(0xd8e2ec, 0x86b4e8, radius, radius * 1.09, 0.3, 3.4, 14.0),
      vertexShader: atmoVert,
      fragmentShader: atmoFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const rim = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.1, 80, 40), this.rimMat);
    rim.name = 'planetRim';
    this.root.add(rim);
  }

  setSunDirection(dir: THREE.Vector3): void {
    const d = dir.clone().normalize();
    (this.surfaceMat.uniforms.sunDirection.value as THREE.Vector3).copy(d);
    (this.dustMat.uniforms.sunDirection.value as THREE.Vector3).copy(d);
    (this.hazeMat.uniforms.sunDirection.value as THREE.Vector3).copy(d);
    (this.rimMat.uniforms.sunDirection.value as THREE.Vector3).copy(d);
  }

  update(t: number): void {
    this.surfaceMat.uniforms.time.value = t;
    this.dustMat.uniforms.time.value = t;
    this.surface.rotation.y = t * 0.0035;
    // The atmosphere shaders integrate along the view ray, so they need the
    // planet's world-space centre rather than an object-space normal.
    this.root.getWorldPosition(_center);
    (this.hazeMat.uniforms.center.value as THREE.Vector3).copy(_center);
    (this.rimMat.uniforms.center.value as THREE.Vector3).copy(_center);
  }
}
