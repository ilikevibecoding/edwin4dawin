/**
 * Tatooine — a procedural desert world.
 *
 * Three concentric shells:
 *   surface  : fbm-driven dune/rock/salt-flat colouring lit by a binary star
 *              pair, with wrap lighting so the terminator stays soft;
 *   dust     : a thin, slowly drifting haze layer that catches the light;
 *   atmosphere: an additive fresnel shell that produces the bright limb.
 *
 * The whole thing lives in the sky scene, so its radius is chosen for framing
 * rather than physical accuracy.
 */

import * as THREE from 'three';

export const PLANET_RADIUS = 3000;

/** Shared GLSL: hash-based 3D value noise and fbm. */
const NOISE = /* glsl */ `
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
                   mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                   mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p, int oct) {
    float a = 0.5, s = 0.0, n = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= oct) break;
      s += a * vnoise(p);
      n += a;
      a *= 0.5;
      p *= 2.03;
      p.xy = mat2(0.8, 0.6, -0.6, 0.8) * p.xy;
    }
    return s / n;
  }
  // Expand a noise field around its mid-point. fbm averages toward 0.5, so
  // without this every feature washes out into the same beige.
  float ct(float v, float c) { return clamp((v - 0.5) * c + 0.5, 0.0, 1.0); }
  // Ridged variant — gives the sharp escarpments that read as canyon country.
  float ridged(vec3 p, int oct) {
    float a = 0.5, s = 0.0, n = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= oct) break;
      float v = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
      s += a * v * v;
      n += a;
      a *= 0.5;
      p *= 2.11;
    }
    return s / n;
  }
`;

const surfaceVert = /* glsl */ `
  varying vec3 vObjPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vObjPos = normalize(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFrag = /* glsl */ `
  uniform vec3  uSunA;        // primary star direction (world)
  uniform vec3  uSunB;        // companion star direction
  uniform vec3  uSunAColor;
  uniform vec3  uSunBColor;
  uniform float uTime;
  uniform float uDetail;      // noise frequency multiplier
  uniform float uExposure;

  varying vec3 vObjPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  ${NOISE}

  void main() {
    vec3 p = vObjPos;

    // --- Terrain field ------------------------------------------------------
    float continents = fbm(p * 3.1 * uDetail, 5);
    float duneField  = fbm(p * 17.0 * uDetail + vec3(11.0), 5);
    float fineDunes  = fbm(p * 95.0 * uDetail, 4);
    float canyons    = ridged(p * 11.0 * uDetail + vec3(3.7), 6);
    float saltMask   = smoothstep(0.54, 0.70, fbm(p * 4.6 * uDetail + vec3(31.0), 4));

    // Latitude drives a subtle cooler, paler polar band.
    float lat = abs(p.y);
    float polar = smoothstep(0.72, 0.97, lat);

    // --- Palette ------------------------------------------------------------
    vec3 duneOchre   = vec3(0.80, 0.56, 0.29);
    vec3 duneLight   = vec3(0.93, 0.77, 0.48);
    vec3 rustRock    = vec3(0.49, 0.26, 0.14);
    vec3 darkRock    = vec3(0.24, 0.16, 0.12);
    vec3 saltFlat    = vec3(0.90, 0.85, 0.72);
    vec3 polarPale   = vec3(0.84, 0.81, 0.75);

    float land  = ct(continents, 2.6);
    float dunes = ct(duneField, 2.0);
    float rock  = ct(canyons, 2.4);
    float fine  = ct(fineDunes, 1.8);

    vec3 albedo = mix(duneOchre, duneLight, dunes);
    albedo = mix(albedo, rustRock, smoothstep(0.40, 0.86, land));
    albedo = mix(albedo, darkRock, smoothstep(0.52, 0.96, rock) * 0.9);
    albedo = mix(albedo, saltFlat, saltMask * 0.8);
    albedo = mix(albedo, polarPale, polar * 0.5);
    // Fine ripple contrast is what stops the surface reading as a smooth egg.
    albedo *= 0.74 + fine * 0.54;
    albedo *= 0.84 + dunes * 0.32;

    // --- Relief -------------------------------------------------------------
    // Perturb the normal with the gradient of the fine dune field so the
    // terminator picks up ripple detail instead of looking like a smooth ball.
    float e = 0.0009;
    float h0 = duneField * 0.6 + canyons * 0.8;
    float hx = fbm((p + vec3(e,0.0,0.0)) * 17.0 * uDetail + vec3(11.0), 5) * 0.6
             + ridged((p + vec3(e,0.0,0.0)) * 11.0 * uDetail + vec3(3.7), 6) * 0.8;
    float hy = fbm((p + vec3(0.0,e,0.0)) * 17.0 * uDetail + vec3(11.0), 5) * 0.6
             + ridged((p + vec3(0.0,e,0.0)) * 11.0 * uDetail + vec3(3.7), 6) * 0.8;
    float hz = fbm((p + vec3(0.0,0.0,e)) * 17.0 * uDetail + vec3(11.0), 5) * 0.6
             + ridged((p + vec3(0.0,0.0,e)) * 11.0 * uDetail + vec3(3.7), 6) * 0.8;
    vec3 grad = vec3(hx - h0, hy - h0, hz - h0) / e;
    vec3 N = normalize(vNormalW - (grad - dot(grad, vNormalW) * vNormalW) * 0.0016);

    // --- Binary illumination ------------------------------------------------
    // Wrap diffuse keeps the day/night boundary from being a hard knife edge.
    float wrapA = clamp((dot(N, normalize(uSunA)) + 0.10) / 1.10, 0.0, 1.0);
    float wrapB = clamp((dot(N, normalize(uSunB)) + 0.10) / 1.10, 0.0, 1.0);
    vec3 light = uSunAColor * pow(wrapA, 1.55) + uSunBColor * pow(wrapB, 1.7) * 0.4;

    // Rough desert scatters back toward the viewer at grazing sun angles.
    float backscatter = pow(clamp(dot(normalize(uSunA), -vViewDir), 0.0, 1.0), 5.0) * 0.16;

    vec3 col = albedo * (light + backscatter);

    // --- Atmospheric contribution ------------------------------------------
    float fres = pow(1.0 - clamp(dot(N, vViewDir), 0.0, 1.0), 2.6);
    float dayside = max(wrapA, wrapB * 0.5);
    // Warm haze thickening toward the limb on the lit side.
    col += vec3(0.95, 0.66, 0.40) * fres * dayside * 0.34;
    // Thin cool arc that survives just past the terminator.
    col += vec3(0.42, 0.44, 0.58) * fres * smoothstep(0.0, 0.30, dayside) * (1.0 - dayside) * 0.62;
    // Faint night-side ambience so the dark limb never becomes a void.
    col += albedo * 0.012;

    col *= uExposure;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const atmosphereVert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vWorld;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const atmosphereFrag = /* glsl */ `
  uniform vec3  uSunA;
  uniform vec3  uColorDay;
  uniform vec3  uColorRim;
  uniform float uIntensity;
  uniform vec3  uCenter;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vWorld;

  void main() {
    vec3 N = normalize(vNormalW);
    float fres = pow(1.0 - clamp(dot(N, vViewDir), 0.0, 1.0), 5.0);
    float sun = clamp(dot(N, normalize(uSunA)) + 0.32, 0.0, 1.0);

    // Forward scattering: the limb blazes where we look through the most air
    // toward the star.
    float toward = pow(clamp(dot(normalize(uSunA), -vViewDir), 0.0, 1.0), 3.0);

    vec3 col = mix(uColorRim, uColorDay, sun) * fres * (0.7 + toward * 1.5);
    float a = fres * uIntensity * (0.24 + sun * 0.95);
    if (a < 0.002) discard;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

const dustVert = /* glsl */ `
  varying vec3 vObjPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vObjPos = normalize(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const dustFrag = /* glsl */ `
  uniform vec3  uSunA;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vObjPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  ${NOISE}

  void main() {
    vec3 p = vObjPos;
    // Two layers drifting at different rates give the haze internal motion.
    float a = fbm(p * 3.1 + vec3(uTime * 0.0043, 0.0, uTime * 0.0021), 5);
    float b = fbm(p * 7.4 + vec3(-uTime * 0.0031, uTime * 0.0012, 0.0), 4);
    float mask = smoothstep(0.46, 0.80, a * 0.65 + b * 0.35);
    // Streak the bands along latitude the way high dust bands actually sit.
    mask *= 0.55 + 0.45 * smoothstep(0.0, 0.5, 1.0 - abs(p.y));

    vec3 N = normalize(vNormalW);
    float sun = clamp(dot(N, normalize(uSunA)) + 0.18, 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(N, vViewDir), 0.0, 1.0), 1.6);

    vec3 col = mix(vec3(0.68, 0.55, 0.42), vec3(1.0, 0.93, 0.82), sun) * (0.6 + fres * 0.8);
    float alpha = mask * uOpacity * (0.10 + sun * 0.72);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col * sun, alpha);
  }
`;

export interface TatooineOptions {
  segments: number;
  /** Direction from planet centre toward the primary star (unit). */
  sunA: THREE.Vector3;
  sunB: THREE.Vector3;
}

export class Tatooine {
  readonly group = new THREE.Group();
  readonly surface: THREE.Mesh;
  readonly atmosphere: THREE.Mesh;
  readonly dust: THREE.Mesh;

  private surfaceMat: THREE.ShaderMaterial;
  private atmosphereMat: THREE.ShaderMaterial;
  private dustMat: THREE.ShaderMaterial;
  readonly radius = PLANET_RADIUS;

  constructor(o: TatooineOptions) {
    this.group.name = 'Tatooine';

    const sunA = o.sunA.clone().normalize();
    const sunB = o.sunB.clone().normalize();

    this.surfaceMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunA: { value: sunA },
        uSunB: { value: sunB },
        uSunAColor: { value: new THREE.Color('#fff0d0').multiplyScalar(1.34) },
        uSunBColor: { value: new THREE.Color('#ffa860').multiplyScalar(0.82) },
        uTime: { value: 0 },
        uDetail: { value: 1 },
        uExposure: { value: 1 },
      },
      vertexShader: surfaceVert,
      fragmentShader: surfaceFrag,
    });

    this.surface = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS, o.segments, o.segments / 2), this.surfaceMat);
    this.surface.name = 'TatooineSurface';
    this.group.add(this.surface);

    this.dustMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunA: { value: sunA },
        uTime: { value: 0 },
        uOpacity: { value: 0.62 },
      },
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.dust = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_RADIUS * 1.012, Math.max(48, o.segments / 2), Math.max(24, o.segments / 4)),
      this.dustMat,
    );
    this.dust.name = 'TatooineDust';
    this.group.add(this.dust);

    this.atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunA: { value: sunA },
        uColorDay: { value: new THREE.Color('#ffcf9c') },
        uColorRim: { value: new THREE.Color('#6d86ad') },
        uIntensity: { value: 0.78 },
        uCenter: { value: new THREE.Vector3() },
      },
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_RADIUS * 1.026, Math.max(48, o.segments / 2), Math.max(24, o.segments / 4)),
      this.atmosphereMat,
    );
    this.atmosphere.name = 'TatooineAtmosphere';
    this.group.add(this.atmosphere);
  }

  setDetail(d: number): void {
    this.surfaceMat.uniforms.uDetail.value = d;
  }

  setExposure(e: number): void {
    this.surfaceMat.uniforms.uExposure.value = e;
  }

  setAtmosphereIntensity(i: number): void {
    this.atmosphereMat.uniforms.uIntensity.value = i;
  }

  update(elapsed: number): void {
    this.surfaceMat.uniforms.uTime.value = elapsed;
    this.dustMat.uniforms.uTime.value = elapsed;
    // A very slow axial spin. Over a six-minute piece this is a few degrees —
    // enough to feel alive, not enough to distract.
    this.group.rotation.y = elapsed * 0.0018;
  }
}

/**
 * The two suns rendered as billboarded discs with a halo, so lens flare-ish
 * warmth appears when they enter frame.
 */
export function makeSunDisc(color: string, size: number, name: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.22, 'rgba(255,240,215,0.55)');
  grad.addColorStop(0.5, 'rgba(255,210,160,0.14)');
  grad.addColorStop(1, 'rgba(255,190,130,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.name = name;
  mesh.onBeforeRender = (_r, _s, camera) => mesh.quaternion.copy(camera.quaternion);
  return mesh;
}
