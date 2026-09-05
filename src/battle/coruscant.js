// Coruscant: a city planet under the battle. The night side is an endless city: dark violet ground,
// warm gold arterial networks forming irregular districts at four scales, rings and spokes around the
// district hubs, capillary streets, thousands of pin lights, a few white-gold hubs, occasional dark
// districts and rare water. Everything sharp is computed per fragment (wrapping Voronoi lattices plus
// a tiled detail map gated by the baked density), so the surface stays crisp from 5 km to the limb;
// the equirect base map only carries smooth fields (density, water, mood, cloud). No atmospheric halo:
// a thin warm terminator band and slight limb extinction only. Scaled: radius 1500 km at 120 km below
// the battle gives the low-orbit horizon of the film without a 10,000 km depth range.
import * as THREE from "three";
import { GLSL_HASH, GLSL_VORONOI } from "./envGlsl.js";
import { bakeBaseFields, bakeDetail } from "./envCityBake.js";

export const PLANET_RADIUS = 1.5e6;
export const PLANET_ALTITUDE = 1.2e5;
// the planet's sun sits this far (radians) below the fleet's horizontal plane, on the key light's
// azimuth: the city under the fleet is night and the terminator sits ~2 degrees inside the far limb on
// the sun's side (the horizon from 120 km up is 22 degrees from nadir), a warm twilight band
export const PLANET_SUN_ELEVATION = -0.245;
// rad/s about the planet's axis (world X): ~375 m/s of ground drift under the fleet, visible over a shot
export const PLANET_SPIN = 0.00025;

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
uniform sampler2D detail;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float emissive;
varying vec3 vN;
varying vec2 vUv;
varying vec3 vW;
${GLSL_HASH}
${GLSL_VORONOI}

// One scale of the city: N districts around the equator. Returns (arterial lines, rings + spokes,
// hub glow). Widths are in cell units. warp bends the district boundaries (straight Voronoi edges
// read as a mosaic; the film's arteries curve). Fades out when the cells shrink toward a few pixels.
vec3 cityLevel(vec2 uv, vec2 warp, int N, uint seed, float hw, float k, float ringStep, float ringHW,
               float hubR, float ringFrac, float spokeFrac, float hubFrac) {
  vec2 c = vec2(uv.x * float(N), uv.y * float(N) * 0.5) + warp;
  // screen-space Jacobian of the cell coordinate: taken before any branch, then projected onto each
  // line's normal so anti-aliasing is right at grazing angles (an isotropic footprint fattens lines)
  vec2 jx = dFdx(c);
  vec2 jy = dFdy(c);
  float px = length(jx) + length(jy);
  float fade = 1.0 - smoothstep(0.1, 0.32, px);
  if (fade <= 0.0) return vec3(0.0);
  Cell v = voronoi(c, N, seed);
  // arteries along the district boundaries: brightness varies from district to district
  float lines = lineAA(v.edge, hw, footprint(jx, jy, v.en), k) * (0.35 + 0.65 * v.id.y);
  float r = 0.0;
  vec2 rn = v.r1 / max(v.f1, 1e-4);
  if (v.id.x < ringFrac) {
    // ring roads around the district centre, fading toward the boundary
    float q = abs(fract(v.f1 / ringStep + 0.5) - 0.5) * ringStep;
    r = lineAA(q, ringHW, footprint(jx, jy, rn), k) * (1.0 - smoothstep(0.32, 0.5, v.f1))
        * smoothstep(0.02, 0.05, v.f1);
  }
  if (v.id.y > 1.0 - spokeFrac) {
    // radial spokes
    float ns = 5.0 + floor(v.id.z * 7.0);
    float a = atan(v.r1.y, v.r1.x);
    float qa = abs(fract(a * ns / 6.2831853 + 0.5) - 0.5) * (6.2831853 / ns) * v.f1;
    r += lineAA(qa, ringHW, footprint(jx, jy, vec2(-rn.y, rn.x)), k) * smoothstep(0.03, 0.08, v.f1)
         * (1.0 - smoothstep(0.28, 0.48, v.f1));
  }
  float hub = 0.0;
  if (hubFrac > 0.0 && v.id.z > 1.0 - hubFrac) {
    // a hot core inside a wider glow
    float q = v.f1 * v.f1 / (hubR * hubR);
    hub = (0.65 * exp(-q * 4.0) + 0.35 * exp(-q)) * (0.5 + 0.9 * v.id.x);
  }
  return vec3(lines, r, hub) * fade;
}

void main() {
  vec3 n = normalize(vN);
  vec3 viewDir = normalize(cameraPosition - vW);
  float ndv = max(dot(n, viewDir), 0.0);
  vec4 F = texture2D(map, vUv);
  float dens = F.r;
  float waterF = F.g;
  float mood = F.b;
  float cloud = F.a;

  // tiled detail: square tiles at the equator (u spans twice the angle of v); 98 km and 24.5 km tiles,
  // so texels of 96 m and 24 m. Each layer's pin lights fade out once a texel grows past ~4 pixels
  // (they would show as soft squares), leaving the finer layer and the analytic lines.
  vec2 tuv = vec2(vUv.x * 2.0, vUv.y);
  vec4 D1 = texture2D(detail, tuv * 48.0);
  mat2 rot = mat2(0.857, 0.515, -0.515, 0.857);
  vec4 D2 = texture2D(detail, rot * (tuv * 192.0) + vec2(0.37, 0.61));
  float tpp = length(fwidth(tuv)) * 1024.0;
  float d1pts = smoothstep(0.08, 0.25, tpp * 48.0);
  float d2pts = smoothstep(0.08, 0.25, tpp * 192.0);
  // the baked capillaries are one texel wide: once several texels share a pixel they are only a wash;
  // the pins likewise fade toward the limb (the film's far city is lace over dark ground, not speckle)
  float d1net = 1.0 - smoothstep(1.2, 3.5, tpp * 48.0);
  float d2net = 1.0 - smoothstep(1.2, 3.5, tpp * 192.0);
  d1pts *= 1.0 - 0.8 * smoothstep(1.5, 5.0, tpp * 48.0);
  d2pts *= 1.0 - 0.8 * smoothstep(1.5, 5.0, tpp * 192.0);
  float blocks = D1.b;
  // warp fields for the district boundaries: the block noise sampled so its dominant wavelength is
  // about one cell of each level (curved boundaries, not meanders)
  vec2 w0 = vec2(texture2D(detail, tuv * 2.5).b, texture2D(detail, tuv * 2.5 + 0.5).b) - 0.55;
  vec2 w1 = vec2(texture2D(detail, tuv * 10.0).b, texture2D(detail, tuv * 10.0 + 0.5).b) - 0.55;
  vec2 w2 = vec2(texture2D(detail, tuv * 40.0).b, texture2D(detail, tuv * 40.0 + 0.5).b) - 0.55;
  vec2 w3 = vec2(D2.b, texture2D(detail, tuv * 160.0 + 0.5).b) - 0.55;

  // rare water / parks with a crisp, wiggly coast and a lit shoreline
  float wf = waterF + (blocks - 0.5) * 0.10 + (D2.b - 0.5) * 0.03;
  float water = smoothstep(0.49, 0.53, wf);
  float shore = smoothstep(0.40, 0.49, wf) * (1.0 - water);

  // district networks at five scales (336 km, 59 km, 14.7 km, 5.3 km, 1.3 km cells); the fine ones fade
  // in only when the camera is close enough for their cells to span several pixels
  // line half-widths are physical (cell units x cell size): 270 m, 150 m, 85 m, 58 m, 40 m, i.e. the
  // biggest arteries are ~4 px from the fleet's altitude and the block streets ~1 px; sub-pixel lines
  // stay visible but dim (lineAA), which is what makes the far view read as lace over dark ground
  vec3 L0 = cityLevel(vUv, w0 * 0.55, 28, 11u, 0.0008, 1.0, 0.11, 0.0006, 0.04, 0.25, 0.15, 0.3);
  vec3 L1 = cityLevel(vUv, w1 * 0.5, 160, 23u, 0.0025, 1.0, 0.16, 0.0018, 0.05, 0.2, 0.1, 0.18);
  vec3 L2 = cityLevel(vUv, w2 * 0.45, 640, 37u, 0.0058, 1.0, 0.22, 0.0042, 0.035, 0.18, 0.06, 0.04);
  vec3 L3 = cityLevel(vUv, w3 * 0.4, 1792, 53u, 0.011, 1.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  vec3 L4 = cityLevel(vUv, w3 * 0.3, 7168, 71u, 0.03, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  float g0 = 0.35 + 0.65 * dens;
  float g1 = smoothstep(0.06, 0.55, dens) * (0.6 + 0.4 * dens);
  float g2 = smoothstep(0.1, 0.6, dens) * (0.5 + 0.5 * blocks);
  float g3 = smoothstep(0.25, 0.8, dens) * (0.25 + 0.75 * blocks);
  // arteries are strings of lit blocks, not flat bands: bead them with the block texture
  float bead = 0.55 + 0.9 * blocks;
  // the two biggest artery levels run hot enough to bloom a little (threshold 0.85), like the film
  float lines = (L0.x * 2.4 * g0 + L1.x * 2.0 * g1 + L2.x * 1.3 * g2 + L3.x * 0.7 * g3) * bead
              + L4.x * 0.35 * g3 + D1.r * 0.25 * g2 * blocks * d1net + D2.r * 0.2 * g3 * d2net;
  float rings = (L0.y * 1.2 * g0 + L1.y * 1.1 * g1 + L2.y * 0.8 * g2) * bead;
  float hubs = (L0.z * 1.6 * g0 + L1.z * 1.1 * g1 + L2.z * 0.8 * g2) * (0.6 + 0.8 * blocks);
  // pin lights cluster: dense blocks sparkle, quiet blocks stay dark
  float cl = smoothstep(0.3, 0.8, blocks);
  float pts = (D1.g * 0.6 + D1.a * 0.35) * g2 * (0.3 + 0.7 * cl) * d1pts
            + (D2.g * 0.5 + D2.a * 0.3) * g3 * d2pts;
  // ambient glow between the lights: dense districts light their own haze
  float haze = dens * dens * (0.3 + 0.7 * blocks) * 0.02 + hubs * 0.1;

  vec3 gold = vec3(1.0, 0.36, 0.05);
  vec3 amber = vec3(1.0, 0.72, 0.4);
  vec3 whiteGold = vec3(1.0, 0.85, 0.6);
  vec3 ground = vec3(0.02, 0.011, 0.052) * (0.55 + 0.9 * mood);
  vec3 waterCol = vec3(0.003, 0.005, 0.012);
  vec3 lights = gold * (lines + rings) + amber * pts + whiteGold * hubs;
  vec3 night = ground + vec3(1.0, 0.5, 0.3) * haze + lights;
  night = mix(night, waterCol + amber * shore * 0.5, water);
  // thin cloud, lit from below: softens the lights into a diffuse warm glow
  vec3 cloudGlow = vec3(0.5, 0.28, 0.12) * (0.03 + 0.3 * dens);
  night = mix(night, cloudGlow + night * 0.3, cloud * 0.75);
  night *= emissive;

  // day side: muted grey-tan city with the lights gone, reddened light at the terminator
  float ndl = dot(n, sunDir);
  float day = smoothstep(-0.04, 0.12, ndl);
  vec3 albedo = vec3(0.36, 0.33, 0.28) * (0.7 + 0.5 * blocks) * (1.0 - 0.3 * min(lines, 1.0))
              + whiteGold * hubs * 0.12;
  albedo = mix(albedo, vec3(0.02, 0.04, 0.08), water);
  albedo = mix(albedo, vec3(0.85), cloud * 0.8);
  vec3 sunTint = mix(vec3(1.0, 0.38, 0.14), vec3(1.0), smoothstep(0.0, 0.14, ndl));
  // the visible day side only ever sees the sun 0-13 degrees up (the terminator sits just inside the
  // far limb), so it is lifted past Lambert to read as muted grey-tan city rather than dusk brown; a
  // little scattered light wraps past the terminator so the twilight band does not drop to black
  float lit = max(ndl, 0.0) * 1.8 + 0.06 * smoothstep(-0.04, 0.14, ndl);
  vec3 dayCol = albedo * sunColor * sunTint * lit * 0.3183;
  vec3 col = mix(night, dayCol, day);
  // thin faint terminator band only (no halo): reddened light scattered along the dawn line, ~50 km
  // either side of it
  col += vec3(0.3, 0.12, 0.04) * exp(-ndl * ndl * 900.0) * 0.3;
  // slight extinction toward the limb keeps the edge crisp against space
  col *= 0.6 + 0.4 * smoothstep(0.0, 0.3, ndv);
  gl_FragColor = vec4(col, 1.0);
}`;

function dataTexture(data, w, h, { wrapT = THREE.RepeatWrapping } = {}) {
  const t = new THREE.DataTexture(
    data,
    w,
    h,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = wrapT;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function buildCoruscant(scene, sun) {
  const group = new THREE.Group();
  group.name = "coruscant";
  const t0 = performance.now();
  const BASE_W = 2048;
  const BASE_H = 1024;
  const DETAIL = 1024;
  const base = dataTexture(
    bakeBaseFields(BASE_W, BASE_H, 501),
    BASE_W,
    BASE_H,
    {
      wrapT: THREE.ClampToEdgeWrapping,
    },
  );
  const detail = dataTexture(bakeDetail(DETAIL, 733), DETAIL, DETAIL);
  const bakeMs = performance.now() - t0;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: base },
      detail: { value: detail },
      sunDir: { value: new THREE.Vector3(0, -1, 0) },
      sunColor: sun.color,
      emissive: { value: 1.0 },
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
  // the map's equator runs under the fleet (its poles point along world X), so the visible cap sits
  // where the equirect map is undistorted; the slow spin is about that axis
  sphere.rotation.z = -Math.PI / 2;
  sphere.rotateY(1.2);
  sphere.name = "coruscant";
  group.add(sphere);
  scene.add(group);
  const planet = {
    group,
    sphere,
    material: mat,
    bakeMs,
    update(sunDir, dt) {
      const az = Math.hypot(sunDir.x, sunDir.z) || 1;
      const ce = Math.cos(PLANET_SUN_ELEVATION) / az;
      mat.uniforms.sunDir.value.set(
        sunDir.x * ce,
        Math.sin(PLANET_SUN_ELEVATION),
        sunDir.z * ce,
      );
      if (dt > 0) sphere.rotateY(dt * PLANET_SPIN);
    },
  };
  planet.update(sun.dir.value, 0);
  return planet;
}
