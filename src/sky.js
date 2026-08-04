import * as THREE from 'three';

/** Shared lighting direction: mid-afternoon sun, off the starboard bow. */
export const SUN_DIRECTION = new THREE.Vector3(0.72, 0.44, -0.53).normalize();
export const SUN_COLOR = new THREE.Color('#fff3d4');
export const HORIZON_COLOR = new THREE.Color('#bcd7e6');
export const ZENITH_COLOR = new THREE.Color('#2f7fc4');

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uHorizonColor;
uniform vec3 uZenithColor;
varying vec3 vDirection;

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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(11.3, 7.7);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec3 dir = normalize(vDirection);
  float height = clamp(dir.y, -1.0, 1.0);

  vec3 sky = mix(uHorizonColor, uZenithColor, pow(clamp(height, 0.0, 1.0), 0.62));
  // Below the horizon the dome is only ever seen through distance haze.
  sky = mix(sky, uHorizonColor * 0.86, smoothstep(0.0, -0.12, height));

  float sunAmount = max(dot(dir, uSunDirection), 0.0);
  sky += uSunColor * pow(sunAmount, 8.0) * 0.28;
  sky += uSunColor * pow(sunAmount, 420.0) * 1.4;
  sky += uSunColor * smoothstep(0.9992, 0.99965, sunAmount) * 6.0;

#ifdef CLOUDS
  if (height > 0.02) {
    // Project the view ray onto a flat cloud deck and drift it downwind.
    vec2 plane = dir.xz / max(dir.y, 0.055);
    vec2 uv = plane * 0.55 + vec2(uTime * 0.0055, uTime * 0.0022);
    float clouds = fbm(uv + fbm(uv * 0.5) * 0.7);
    clouds = smoothstep(0.52, 0.92, clouds);
    clouds *= smoothstep(0.02, 0.3, height);

    float lit = 0.55 + 0.45 * pow(sunAmount, 3.0);
    vec3 cloudColor = mix(vec3(0.72, 0.76, 0.82), uSunColor, lit * 0.85);
    sky = mix(sky, cloudColor, clouds * 0.9);
  }
#endif

  gl_FragColor = vec4(sky, 1.0);
  #include <colorspace_fragment>
}`;

export function createSky() {
  const uniforms = {
    uTime: { value: 0 },
    uSunDirection: { value: SUN_DIRECTION.clone() },
    uSunColor: { value: SUN_COLOR.clone() },
    uHorizonColor: { value: HORIZON_COLOR.clone() },
    uZenithColor: { value: ZENITH_COLOR.clone() },
  };

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 48, 32),
    new THREE.ShaderMaterial({
      uniforms,
      defines: { CLOUDS: '' },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.userData.update = (elapsed) => {
    uniforms.uTime.value = elapsed;
  };
  return sky;
}

/** Sun, sky bounce and a touch of fill so the shaded side of the hull reads. */
export function createLights() {
  const group = new THREE.Group();
  group.name = 'lights';

  const sun = new THREE.DirectionalLight(SUN_COLOR, 2.6);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 320;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.04;
  group.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(new THREE.Color('#cfe6f5'), new THREE.Color('#20506b'), 1.15);
  group.add(hemi);

  const fill = new THREE.DirectionalLight(new THREE.Color('#8fc4e8'), 0.45);
  fill.position.set(-60, 30, 70);
  group.add(fill);

  group.userData.sun = sun;
  return group;
}
