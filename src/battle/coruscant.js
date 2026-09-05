// Coruscant: a city planet under the battle. Night side dominated by dense warm light grids, brighter
// arterial lines and a few very bright districts; the day side is a muted grey-violet city texture. No
// atmospheric halo (a thin terminator haze only). Scaled: radius 1500 km at 120 km below the battle gives
// the low-orbit horizon of the film without a 10,000 km depth range.
import * as THREE from "three";
import { fbm, vnoise, mulberry32, makeCanvas, toTexture } from "../textures.js";

export const PLANET_RADIUS = 1.5e6;
export const PLANET_ALTITUDE = 1.2e5;

// distance to the nearest Voronoi *edge* (F2 - F1), tileable; small values = arterial lines
function worleyEdge(u, v, freq, seed) {
  const x = u * freq;
  const y = v * freq;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 10;
  let f2 = 10;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = (((xi + i) % freq) + freq) % freq;
      const cy = (((yi + j) % freq) + freq) % freq;
      const h1 = Math.sin(cx * 127.1 + cy * 311.7 + seed) * 43758.5453;
      const h2 = Math.sin(cx * 269.5 + cy * 183.3 + seed * 1.7) * 43758.5453;
      const rx = h1 - Math.floor(h1);
      const ry = h2 - Math.floor(h2);
      const dx = xi + i + rx - x;
      const dy = yi + j + ry - y;
      const d = dx * dx + dy * dy;
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return Math.sqrt(f2) - Math.sqrt(f1);
}

function makeCityTexture(w = 2048, h = 1024, seed = 501) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const lat = Math.abs(v - 0.5) * 2; // 0 equator .. 1 pole
    const polar = clamp01(1.25 - lat * 1.35);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      // district structure: broad density field, Voronoi edges at three scales = arterial networks,
      // fine value noise = individual blocks / lit points
      const density = fbm(u, v, {
        octaves: 5,
        freq: 5,
        gain: 0.55,
        seed: seed + 7,
      });
      const dens = clamp01((density - 0.28) * 2.2);
      const e1 = worleyEdge(u, v, 14, seed);
      const e2 = worleyEdge(u, v, 42, seed + 3);
      const e3 = worleyEdge(u, v, 120, seed + 5);
      const artery =
        clamp01(1 - e1 * 30) * 1.0 +
        clamp01(1 - e2 * 45) * 0.8 +
        clamp01(1 - e3 * 70) * 0.55;
      const fine = vnoise(u, v, 900, seed + 11);
      const fine2 = vnoise(u, v, 1900, seed + 13);
      const points =
        clamp01((fine - 0.5) * 3.2) * 0.9 + clamp01((fine2 - 0.62) * 4.0) * 0.6;
      // everything scaled by district density and latitude
      const k = (0.25 + 0.75 * dens) * polar;
      const glow = (artery * 0.9 + points * 0.8) * k;
      const haze = clamp01((density - 0.3) * 1.4) * polar * 0.09; // ambient city glow between lights
      const hub = clamp01((density - 0.7) * 5) * polar; // brightest districts go white-gold
      // base ground: dark violet-slate
      let r = 0.045 + haze * 1.0 + glow * 1.15 + hub * 0.4;
      let g = 0.03 + haze * 0.6 + glow * 0.66 + hub * 0.38;
      let b = 0.065 + haze * 0.32 + glow * 0.22 + hub * 0.4;
      const i = (y * w + x) * 4;
      d[i] = clamp01(r) * 255;
      d[i + 1] = clamp01(g) * 255;
      d[i + 2] = clamp01(b) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: true, anisotropy: 8 });
}

const planetVert = /* glsl */ `
varying vec3 vN;
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const planetFrag = /* glsl */ `
uniform sampler2D map;
uniform vec3 sunDir;
uniform float emissive;
varying vec3 vN;
varying vec2 vUv;
varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  vec3 base = texture2D(map, vUv).rgb;
  // fine detail: the same map tiled, gated by the local brightness so dense districts get crisp blocks
  vec3 fine = texture2D(map, vUv * vec2(23.0, 11.5)).rgb;
  float lum = dot(base, vec3(0.5, 0.35, 0.15));
  vec3 city = base * (0.75 + 0.9 * fine) + fine * smoothstep(0.08, 0.35, lum) * 0.55;
  float day = smoothstep(-0.12, 0.25, dot(n, sunDir));
  // day side: the same city as a grey-violet ground with muted lights; night: lights glow
  vec3 dayCol = vec3(0.33, 0.31, 0.38) * (0.55 + 0.45 * dot(n, sunDir)) + city * 0.25;
  // lift the mid-tones (the map is authored dark) and let only the brightest arteries reach bloom
  vec3 nightCol = pow(max(city, vec3(0.0)), vec3(0.8)) * emissive;
  vec3 col = mix(nightCol, dayCol, day);
  // thin terminator haze only (no halo): a faint warm band where the sun grazes
  float graze = smoothstep(0.0, 0.08, abs(dot(n, sunDir))) ;
  col += vec3(0.16, 0.1, 0.06) * (1.0 - graze) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

export function buildCoruscant(scene, sun) {
  const group = new THREE.Group();
  group.name = "coruscant";
  const tex = makeCityTexture(2048, 1024, 501);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      sunDir: { value: sun.dir.value.clone() },
      emissive: { value: 3.0 },
    },
    vertexShader: planetVert,
    fragmentShader: planetFrag,
    fog: false,
  });
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 192, 128),
    mat,
  );
  sphere.position.set(0, -(PLANET_RADIUS + PLANET_ALTITUDE), 0);
  sphere.rotation.y = 1.2;
  sphere.name = "coruscant";
  group.add(sphere);
  scene.add(group);
  return {
    group,
    sphere,
    update(sunDir, dt) {
      // the battle sits over the night side: the planet's own sun points below the horizon on the key
      // light's azimuth, so the city glows under the fleet and a lit crescent shows at the far limb
      mat.uniforms.sunDir.value.set(sunDir.x, -0.42, sunDir.z).normalize();
      sphere.rotation.y += dt * 0.00002;
    },
  };
}
