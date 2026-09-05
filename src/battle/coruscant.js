// Coruscant: a city planet under the battle. The night side is an endless city read as a *light
// fabric*: a dense high-frequency field of warm pin lights fills every district (four tiled layers of
// baked point lights, cross-faded by texel footprint so the sparkle is resolved at every altitude and
// mip-averages into the city's glow from far away), modulated by baked density, block texture and
// district brightness; over it, gold arterial networks at four scales (only the two coarsest bright,
// the finer ones soft glows), concentric rings and radial spokes around district hubs at three scales,
// hubs as white-gold cores with wide halos, capillary streets, occasional dark districts and rare
// water over a near-black warm-brown ground. Everything sharp is computed per fragment (wrapping
// Voronoi lattices plus the tiled detail map), so the surface stays crisp from 3 km to the limb; the
// equirect base map only carries smooth fields (density, water, mood, cloud). No atmospheric halo: a
// thin warm terminator band and slight limb extinction only. Scaled: radius 1500 km at 120 km below
// the battle gives the low-orbit horizon of the film without a 10,000 km depth range.
//
// The CPU bake runs in a Web Worker (envBakeWorker.js); the planet renders with tiny placeholder
// maps (uniform density, no pins: the analytic arteries are already there) until the buffers arrive.
import * as THREE from "three";
import { GLSL_HASH, GLSL_NOISE2, GLSL_VORONOI } from "./envGlsl.js";
import { bakeBaseFields, bakeDetail, channelMean } from "./envCityBake.js";

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
uniform float pinNorm;
uniform int levels;
varying vec3 vN;
varying vec2 vUv;
varying vec3 vW;
${GLSL_HASH}
${GLSL_NOISE2}
${GLSL_VORONOI}

// One scale of the city: N districts around the equator. Returns (arterial lines, rings + spokes,
// hub core, soft glow = artery halo + hub halo). Widths are in cell units. warp bends the district
// boundaries (straight Voronoi edges read as a mosaic; the film's arteries curve). Fades out when the
// cells shrink toward a few pixels. Rings and spokes belong to the hub districts (plus a few others),
// so the film's target-like patterns sit around the bright cores.
vec4 cityLevel(vec2 uv, vec2 warp, float wobble, int N, uint seed, float hw, float k, float glowW,
               float ringStep, float ringHW, float hubR, float ringFrac, float spokeFrac,
               float hubFrac, out float district) {
  district = 0.5;
  vec2 c = vec2(uv.x * float(N), uv.y * float(N) * 0.5) + warp;
  // screen-space Jacobian of the cell coordinate: taken before any branch, then projected onto each
  // line's normal so anti-aliasing is right at grazing angles (an isotropic footprint fattens lines)
  vec2 jx = dFdx(c);
  vec2 jy = dFdy(c);
  float px = length(jx) + length(jy);
  float fade = 1.0 - smoothstep(0.1, 0.32, px);
  if (fade <= 0.0) return vec4(0.0);
  Cell v = voronoi(c, N, seed);
  // arteries along the district boundaries: brightness varies from district to district
  float bright = 0.35 + 0.65 * v.id.y;
  district = mix(0.5, v.id.y, fade);
  float lines = lineAA(v.edge, hw, footprint(jx, jy, v.en), k) * bright;
  // soft halo either side of the artery: the lit blocks that line it
  float glow = exp(-v.edge * v.edge / (glowW * glowW)) * bright;
  bool hubCell = hubFrac > 0.0 && v.id.z > 1.0 - hubFrac;
  float r = 0.0;
  vec2 rn = v.r1 / max(v.f1, 1e-4);
  // rings and spokes wobble with the block texture so they are not compass-drawn
  float f1 = v.f1 + wobble * 0.04;
  if (hubCell || v.id.x < ringFrac) {
    // ring roads around the district centre, fading toward the boundary
    float q = abs(fract(f1 / ringStep + 0.5) - 0.5) * ringStep;
    r = lineAA(q, ringHW, footprint(jx, jy, rn), k) * (1.0 - smoothstep(0.26, 0.46, v.f1))
        * smoothstep(0.02, 0.05, v.f1);
  }
  if ((hubCell && v.id.y > 0.3) || v.id.y > 1.0 - spokeFrac) {
    // short radial spokes out of the hub
    float ns = 5.0 + floor(v.id.z * 7.0);
    float a = atan(v.r1.y, v.r1.x) + wobble * 0.5;
    float qa = abs(fract(a * ns / 6.2831853 + 0.5) - 0.5) * (6.2831853 / ns) * v.f1;
    r += lineAA(qa, ringHW, footprint(jx, jy, vec2(-rn.y, rn.x)), k) * smoothstep(0.03, 0.08, v.f1)
         * (1.0 - smoothstep(0.16, 0.34, v.f1));
  }
  float hub = 0.0;
  float halo = 0.0;
  if (hubCell) {
    // a hot white-gold core inside a wide warm halo
    float q = v.f1 * v.f1 / (hubR * hubR);
    float s = 0.5 + 0.9 * v.id.x;
    hub = exp(-q * 4.0) * s;
    halo = exp(-q * 0.5) * s;
  }
  return vec4(lines, r, hub, glow * 0.5 + halo) * fade;
}

// weight of a tiled pin layer from its magnification q (screen pixels per texel): fades out once a
// texel grows past ~3 px (single lights would show as squares), and minified layers keep a share
// (their mip average is the fabric's low-frequency wash) while the resolved one carries the sparkle
float layerW(float q) {
  return (1.0 - smoothstep(2.2, 4.5, q)) * (0.3 + 0.7 * smoothstep(0.25, 0.7, q));
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

  // tiled detail: square tiles at the equator (u spans twice the angle of v). Four layers: 392 km,
  // 98 km, 24.5 km and 6.1 km tiles (384 m, 96 m, 24 m and 6 m texels), rotated against each other so
  // the tiling never lines up.
  vec2 tuv = vec2(vUv.x * 2.0, vUv.y);
  float tpp = length(fwidth(tuv)) * 1024.0;
  mat2 rB = mat2(0.857, 0.515, -0.515, 0.857);
  mat2 rC = mat2(0.469, -0.883, 0.883, 0.469);
  mat2 rD = mat2(-0.259, 0.966, -0.966, -0.259);
  vec4 DA = texture2D(detail, tuv * 12.0 + vec2(0.13, 0.71));
  vec4 D1 = texture2D(detail, tuv * 48.0);
  vec4 D2 = texture2D(detail, rB * (tuv * 192.0) + vec2(0.37, 0.61));
  vec4 D3 = texture2D(detail, rC * (tuv * 768.0) + vec2(0.81, 0.29));
  float qA = 1.0 / (tpp * 12.0);
  float q1 = 1.0 / (tpp * 48.0);
  float q2 = 1.0 / (tpp * 192.0);
  float q3 = 1.0 / (tpp * 768.0);
  // the coarsest layer's texels are 384 m lights: kept low so it adds grain, not blobs
  float wA = layerW(qA) * 0.3;
  float w1 = layerW(q1);
  float w2 = layerW(q2);
  float w3 = layerW(q3);
  // pin field, normalised to mean 1 whatever the layer mix (the large A-channel lights count more)
  float pins = (wA * (DA.g + 0.9 * DA.a) + w1 * (D1.g + 0.9 * D1.a) + w2 * (D2.g + 0.9 * D2.a)
                + w3 * (D3.g + 0.9 * D3.a)) * pinNorm / max(wA + w1 + w2 + w3, 0.4);
  // block-scale texture (12 km and 3 km wavelengths): which blocks are lit densely, which sleep
  float blocks = D1.b;
  float fine = D2.b;
  // warp fields for the district boundaries, with a dominant wavelength of about one cell of each
  // level (curved boundaries, not meanders): analytic noise for the two big levels (a texture tap
  // magnified 60x would kink the arteries along its texel grid), block textures for the fine ones
  vec2 c0 = vec2(vUv.x * 40.0, vUv.y * 20.0);
  vec2 w0 = vec2(vnoise2(c0, 40, 3u), vnoise2(c0 + 17.3, 40, 5u)) - 0.5;
  vec2 c1 = vec2(vUv.x * 200.0, vUv.y * 100.0);
  vec2 w1v = vec2(vnoise2(c1, 200, 7u), vnoise2(c1 + 9.1, 200, 9u)) - 0.5;
  vec2 w2v = vec2(blocks, texture2D(detail, tuv * 48.0 + 0.5).b) - 0.55;
  vec2 w3v = vec2(fine, DA.b) - 0.55;

  // rare water / parks with a crisp, wiggly coast and a lit shoreline
  float wf = waterF + (blocks - 0.5) * 0.10 + (fine - 0.5) * 0.03;
  float water = smoothstep(0.49, 0.53, wf);
  float shore = smoothstep(0.40, 0.49, wf) * (1.0 - water);

  // district networks at four scales (336 km, 59 km, 14.7 km, 5.3 km cells; phones skip the last).
  // Line half-widths are physical (cell units x cell size): 270 m, 150 m, 85 m, 58 m; the two big
  // levels are the bright arteries, the fine ones soft dim glows (k > 1 fades sub-pixel nets to the
  // ground instead of averaging them into a wash)
  float d0, d1, d2, d3;
  float wob = blocks - 0.5;
  vec4 L0 = cityLevel(vUv, w0 * 0.55, wob, 28, 11u, 0.0008, 1.0, 0.006, 0.11, 0.0006, 0.04, 0.12,
                      0.1, 0.3, d0);
  vec4 L1 = cityLevel(vUv, w1v * 0.5, wob, 160, 23u, 0.0025, 1.0, 0.016, 0.16, 0.0018, 0.05, 0.1,
                      0.08, 0.18, d1);
  vec4 L2 = vec4(0.0);
  vec4 L3 = vec4(0.0);
  d2 = 0.5;
  d3 = 0.5;
  if (levels > 2)
    L2 = cityLevel(vUv, w2v * 0.45, fine - 0.5, 640, 37u, 0.0058, 1.5, 0.03, 0.22, 0.0042, 0.035,
                   0.1, 0.05, 0.05, d2);
  if (levels > 3)
    L3 = cityLevel(vUv, w3v * 0.4, 0.0, 1792, 53u, 0.011, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                   d3);
  float g0 = 0.4 + 0.6 * dens;
  float g1 = smoothstep(0.06, 0.55, dens) * (0.6 + 0.4 * dens);
  float g2 = smoothstep(0.1, 0.6, dens) * (0.5 + 0.5 * blocks);
  float g3 = smoothstep(0.25, 0.8, dens) * (0.3 + 0.7 * blocks);
  // arteries are strings of lit blocks, not flat bands: bead them with the block textures
  float bead = (0.6 + 0.8 * blocks) * (0.7 + 0.6 * fine);
  // the wide arteries carry the pin texture too: rivers of lit blocks rather than flat ribbons
  float tex = 0.55 + 0.45 * min(pins, 2.0);
  float lines = (L0.x * 1.3 * g0 + L1.x * 1.0 * g1) * bead * tex + L2.x * 0.4 * g2 + L3.x * 0.2 * g3;
  float rings = (L0.y * 0.8 * g0 + L1.y * 0.65 * g1) * bead + L2.y * 0.35 * g2;
  float hubs = L0.z * 1.2 * g0 + L1.z * 0.8 * g1 + L2.z * 0.5 * g2;
  float halo = L0.w * 0.6 * g0 + L1.w * 0.45 * g1 + L2.w * 0.25 * g2;
  // capillary streets from the tile (one texel wide): only while resolved, neither several texels per
  // pixel (a wash) nor several pixels per texel (blurred bands)
  float s2 = (1.0 - smoothstep(1.2, 3.5, 1.0 / q2)) * (1.0 - smoothstep(3.0, 6.0, q2));
  float s3 = (1.0 - smoothstep(1.2, 3.5, 1.0 / q3)) * (1.0 - smoothstep(3.0, 6.0, q3));
  float streets = (D2.r * 0.22 * s2 + D3.r * 0.18 * s3) * g3;

  // the light fabric: the pin field gated by density, patchy by district (the 59 km and 14.7 km
  // cells each have their own brightness), brighter in busy blocks and around hubs
  float gf = smoothstep(0.05, 0.7, dens) * (0.25 + 0.75 * dens);
  float fabric = pins * gf * (0.4 + 0.6 * d1) * (0.6 + 0.4 * d2)
               * (0.1 + 0.9 * smoothstep(0.25, 0.9, blocks)) * (0.6 + 0.8 * fine)
               * (1.0 + 1.6 * halo);

  // sRGB hue ~30 degrees: the film's orange-gold, not yellow
  vec3 gold = vec3(1.0, 0.37, 0.05);
  vec3 amber = vec3(1.0, 0.39, 0.07);
  vec3 whiteGold = vec3(1.0, 0.82, 0.55);
  // only the hottest lights saturate toward white-gold like the film's hot spots
  vec3 pinCol = mix(amber, whiteGold, smoothstep(2.5, 7.0, fabric));
  // dark violet-indigo ground (the plan's palette): the gold networks sit on a cool base, not on brown
  vec3 ground = vec3(0.012, 0.010, 0.026) * (0.5 + mood) * (0.35 + 0.65 * dens);
  vec3 waterCol = vec3(0.003, 0.005, 0.012);
  vec3 lights = gold * (lines + rings + streets + halo * 0.7) + pinCol * fabric * 0.5
              + whiteGold * hubs;
  vec3 night = ground + lights;
  night = mix(night, waterCol + amber * shore * 0.5, water);
  // thin cloud, lit from below: softens the lights into a diffuse warm glow
  vec3 cloudGlow = vec3(0.5, 0.3, 0.14) * (0.03 + 0.25 * dens);
  night = mix(night, cloudGlow + night * 0.3, cloud * 0.7);
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

function dataTexture(data, w, h, anisotropy, wrapT = THREE.RepeatWrapping) {
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
  t.anisotropy = anisotropy;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// 2x2 stand-ins while the worker bakes: uniform mid density / no water / neutral mood / no cloud, and
// a detail tile with no streets or pins and a flat block field
function placeholderBase() {
  const d = new Uint8Array(16);
  for (let i = 0; i < 4; i++) d.set([160, 0, 128, 0], i * 4);
  return d;
}
function placeholderDetail() {
  const d = new Uint8Array(16);
  for (let i = 0; i < 4; i++) d.set([0, 0, 128, 0], i * 4);
  return d;
}

export function buildCoruscant(scene, sun) {
  const group = new THREE.Group();
  group.name = "coruscant";
  const t0 = performance.now();
  // phones: half-size base map, three Voronoi levels, anisotropy 4
  const touch =
    typeof matchMedia !== "undefined" &&
    matchMedia("(pointer: coarse)").matches;
  const BASE_W = touch ? 1024 : 2048;
  const BASE_H = touch ? 512 : 1024;
  const DETAIL = 1024;
  const ANISO = touch ? 4 : 8;
  const SEED_BASE = 501;
  const SEED_DETAIL = 733;
  const clampT = THREE.ClampToEdgeWrapping;
  let base = dataTexture(placeholderBase(), 2, 2, 1, clampT);
  let detail = dataTexture(placeholderDetail(), 2, 2, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: base },
      detail: { value: detail },
      sunDir: { value: new THREE.Vector3(0, -1, 0) },
      sunColor: sun.color,
      emissive: { value: 1.0 },
      // the placeholder has no pins: the fabric term is off until the real tile arrives
      pinNorm: { value: 0.0 },
      levels: { value: touch ? 3 : 4 },
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
    touch,
    pending: true,
    // main-thread time spent on the planet's maps (placeholders + swapping in the baked ones)
    bakeMainMs: performance.now() - t0,
    // worker time spent baking, and wall-clock time from construction to the real maps being live
    bakeMs: 0,
    bakeReadyMs: 0,
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
  const install = (baseData, detailData, pinMean) => {
    const t1 = performance.now();
    const b = dataTexture(baseData, BASE_W, BASE_H, ANISO, clampT);
    const d = dataTexture(detailData, DETAIL, DETAIL, ANISO);
    mat.uniforms.map.value = b;
    mat.uniforms.detail.value = d;
    mat.uniforms.pinNorm.value = pinMean > 0 ? 1 / pinMean : 0;
    base.dispose();
    detail.dispose();
    base = b;
    detail = d;
    planet.pending = false;
    planet.bakeMainMs += performance.now() - t1;
    planet.bakeReadyMs = performance.now() - t0;
  };
  const bakeSync = () => {
    const t1 = performance.now();
    const b = bakeBaseFields(BASE_W, BASE_H, SEED_BASE);
    const d = bakeDetail(DETAIL, SEED_DETAIL);
    planet.bakeMs = performance.now() - t1;
    planet.bakeMainMs += planet.bakeMs;
    install(b, d, channelMean(d, 1) + 0.9 * channelMean(d, 3));
  };
  let worker = null;
  try {
    worker = new Worker(new URL("./envBakeWorker.js", import.meta.url), {
      type: "module",
    });
  } catch (_) {
    worker = null;
  }
  if (worker) {
    worker.onmessage = (e) => {
      const m = e.data;
      planet.bakeMs = m.ms;
      install(m.base, m.detail, m.pinMean);
      worker.terminate();
      worker = null;
    };
    worker.onerror = (err) => {
      console.warn("planet bake worker failed, baking on the main thread", err);
      worker.terminate();
      worker = null;
      bakeSync();
    };
    worker.postMessage({
      baseW: BASE_W,
      baseH: BASE_H,
      detailSize: DETAIL,
      seedBase: SEED_BASE,
      seedDetail: SEED_DETAIL,
    });
  } else {
    bakeSync();
  }
  planet.update(sun.dir.value, 0);
  return planet;
}
