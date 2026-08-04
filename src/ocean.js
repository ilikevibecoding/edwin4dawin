import * as THREE from 'three';
import { waveGLSL } from './waves.js';
import { HORIZON_COLOR, SUN_COLOR, SUN_DIRECTION, ZENITH_COLOR } from './sky.js';

/**
 * A radial (polar) ocean grid: dense rings near the ship for crisp waves,
 * exponentially larger rings out to the horizon for coverage. The mesh is
 * re-centred under the ship every frame, so the sea is effectively infinite.
 */
function radialGrid(sectors, rings, innerRadius, outerRadius) {
  const positions = [];
  const indices = [];

  positions.push(0, 0, 0); // centre vertex
  const radii = [];
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    radii.push(innerRadius * Math.pow(outerRadius / innerRadius, t));
  }

  for (const r of radii) {
    for (let s = 0; s < sectors; s++) {
      const angle = (s / sectors) * Math.PI * 2;
      positions.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    }
  }

  for (let s = 0; s < sectors; s++) {
    indices.push(0, 1 + ((s + 1) % sectors), 1 + s);
  }
  for (let i = 0; i < rings - 1; i++) {
    const a = 1 + i * sectors;
    const b = a + sectors;
    for (let s = 0; s < sectors; s++) {
      const n = (s + 1) % sectors;
      indices.push(a + s, a + n, b + s);
      indices.push(a + n, b + n, b + s);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outerRadius * 1.2);
  return geometry;
}

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uDetailFade;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;

${waveGLSL()}

void main() {
  vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 normal;
  vec3 offset = waveDisplace(world.xz, uTime, normal);

  // Flatten the far field so the huge outer rings do not alias into noise.
  float distance = length(world.xz - cameraPosition.xz);
  float fade = 1.0 - smoothstep(uDetailFade, uDetailFade * 5.0, distance);
  offset *= fade;
  normal = normalize(mix(vec3(0.0, 1.0, 0.0), normal, fade));

  world += offset;
  vWorldPosition = world;
  vNormal = normal;
  vWaveHeight = offset.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uHorizonColor;
uniform vec3 uZenithColor;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uShipPosition;
uniform vec2 uShipForward;
uniform float uFogDensity;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

/** Small scrolling chop that lives only in the normal, not the geometry. */
vec3 rippleNormal(vec2 p, float t) {
  vec2 g = vec2(0.0);
  float amp = 0.045;
  float freq = 0.9;
  for (int i = 0; i < 4; i++) {
    vec2 dir = normalize(vec2(sin(float(i) * 2.7 + 0.4), cos(float(i) * 1.9 + 1.1)));
    float phase = dot(p, dir) * freq - t * (1.1 + float(i) * 0.6);
    g += dir * cos(phase) * amp * freq;
    amp *= 0.62;
    freq *= 2.15;
  }
  return normalize(vec3(-g.x, 1.0, -g.y));
}

vec3 skyColor(vec3 dir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 base = mix(uHorizonColor, uZenithColor, pow(h, 0.62));
  float sunAmount = max(dot(dir, uSunDirection), 0.0);
  return base + uSunColor * pow(sunAmount, 90.0) * 1.1 + uSunColor * pow(sunAmount, 6.0) * 0.16;
}

void main() {
  vec3 view = cameraPosition - vWorldPosition;
  float distance = length(view);
  vec3 viewDir = view / distance;

  float detail = 1.0 - smoothstep(40.0, 320.0, distance);
#ifdef WATER_DETAIL
  vec3 ripple = rippleNormal(vWorldPosition.xz, uTime);
  vec3 normal = normalize(mix(vNormal, normalize(vNormal + ripple * 1.35), detail));
#else
  vec3 normal = vNormal;
#endif

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
  fresnel = clamp(0.02 + 0.98 * fresnel, 0.0, 1.0);

  vec3 reflected = reflect(-viewDir, normal);
  reflected.y = abs(reflected.y);
  vec3 reflection = skyColor(reflected);

  // Body colour: deep blue in the troughs, brighter turquoise on the crests.
  float crest = smoothstep(-0.7, 1.1, vWaveHeight);
  vec3 body = mix(uDeepColor, uShallowColor, crest);
  body += uSunColor * pow(max(dot(normal, uSunDirection), 0.0), 2.0) * 0.06;

  vec3 color = mix(body, reflection, fresnel);

  // Sun glitter.
  vec3 halfway = normalize(uSunDirection + viewDir);
  float specular = pow(max(dot(normal, halfway), 0.0), 220.0);
  color += uSunColor * specular * 2.4;

#ifdef WATER_DETAIL
  // Wind-blown foam on the steepest crests.
  float steep = 1.0 - normal.y;
  float foamMask = smoothstep(0.9, 1.45, vWaveHeight) * smoothstep(0.02, 0.16, steep);
  float foamNoise = noise(vWorldPosition.xz * 1.6 + uTime * 0.35);
  foamNoise *= noise(vWorldPosition.xz * 5.5 - uTime * 0.8);
  color = mix(color, vec3(0.95, 0.98, 1.0), clamp(foamMask * foamNoise * 3.4, 0.0, 0.85) * detail);
#endif

  // Soft contact shadow so the hull reads as sitting in the water.
  vec2 toShip = vWorldPosition.xz - uShipPosition.xz;
  vec2 right = vec2(uShipForward.y, -uShipForward.x);
  vec2 local = vec2(dot(toShip, uShipForward), dot(toShip, right));
  local -= vec2(6.0, -3.0); // pushed downsun
  float shade = 1.0 - smoothstep(0.35, 1.0, length(local / vec2(19.0, 6.5)));
  color *= 1.0 - shade * 0.4;

  float fog = 1.0 - exp(-uFogDensity * distance);
  color = mix(color, uHorizonColor, clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

export function createOcean() {
  const uniforms = {
    uTime: { value: 0 },
    uDetailFade: { value: 260 },
    uSunDirection: { value: SUN_DIRECTION.clone() },
    uSunColor: { value: SUN_COLOR.clone() },
    uHorizonColor: { value: HORIZON_COLOR.clone() },
    uZenithColor: { value: ZENITH_COLOR.clone() },
    uShallowColor: { value: new THREE.Color('#2f9fb5') },
    uDeepColor: { value: new THREE.Color('#0b3550') },
    uShipPosition: { value: new THREE.Vector3() },
    uShipForward: { value: new THREE.Vector2(0, 1) },
    uFogDensity: { value: 0.0016 },
  };

  const ocean = new THREE.Mesh(
    radialGrid(200, 130, 0.9, 3200),
    new THREE.ShaderMaterial({
      uniforms,
      defines: { WATER_DETAIL: '' },
      vertexShader,
      fragmentShader,
      fog: false,
    }),
  );
  ocean.name = 'ocean';
  ocean.frustumCulled = false;
  ocean.renderOrder = -1;

  ocean.userData.detail = '200x130';
  ocean.userData.setDetail = (sectors, rings) => {
    if (ocean.userData.detail === `${sectors}x${rings}`) return;
    ocean.userData.detail = `${sectors}x${rings}`;
    ocean.geometry.dispose();
    ocean.geometry = radialGrid(sectors, rings, 0.9, 3200);
  };

  ocean.userData.update = (elapsed, focus, forward) => {
    uniforms.uTime.value = elapsed;
    // Re-centre on the ship, snapped so the grid does not shimmer as it moves.
    ocean.position.set(Math.round(focus.x / 2) * 2, 0, Math.round(focus.z / 2) * 2);
    uniforms.uShipPosition.value.copy(focus);
    uniforms.uShipForward.value.set(forward.x, forward.z);
  };

  return ocean;
}
