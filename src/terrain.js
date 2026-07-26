import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { clamp, fbm, smoothstep } from './textures/core.js';
import { detailNormal, dirtRoadMaps, litterMaps, vergeMaps } from './textures/ground.js';

// ---------------------------------------------------------------------------
// Rolling forest floor with a dirt two-track graded into it.
//
// One mesh, one draw call. Three tiling surface sets (packed track, gravel
// verge, needle litter) are blended in the fragment shader by a per-vertex
// road weight, so there is no decal z-fighting and the transition can be as
// soft or as sharp as the art wants.
// ---------------------------------------------------------------------------

const SIZE = 300;
const SEGS = 224;
const ROAD_HALF = 2.3;
const SHOULDER = 2.6;

function baseHeight(x, z) {
  const hills = fbm(x * 0.0055 + 40, z * 0.0055 + 12, { octaves: 4, period: 64, seed: 71 });
  const medium = fbm(x * 0.021 + 3, z * 0.021 + 9, { octaves: 4, period: 64, seed: 12 });
  const fine = fbm(x * 0.09, z * 0.09, { octaves: 3, period: 64, seed: 33 });
  return (hills - 0.5) * 13 + (medium - 0.5) * 2.4 + (fine - 0.5) * 0.5;
}

export function createRoadCurve() {
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const z = -SIZE * 0.55 + t * SIZE * 1.1;
    const x = Math.sin(t * Math.PI * 2.1) * 22 + Math.sin(t * Math.PI * 5.4 + 1.2) * 6.5;
    pts.push(new THREE.Vector3(x, 0, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

export function createTerrain({ env = null } = {}) {
  const curve = createRoadCurve();

  // --- sample and grade the road centreline --------------------------------
  const SAMPLES = 900;
  const cx = new Float32Array(SAMPLES);
  const cz = new Float32Array(SAMPLES);
  const cy = new Float32Array(SAMPLES);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < SAMPLES; i++) {
    curve.getPoint(i / (SAMPLES - 1), tmp);
    cx[i] = tmp.x;
    cz[i] = tmp.z;
    cy[i] = baseHeight(tmp.x, tmp.z);
  }
  // a grader would smooth the profile out; do the same with a wide box blur
  const smoothed = new Float32Array(SAMPLES);
  const W = 26;
  for (let i = 0; i < SAMPLES; i++) {
    let s = 0;
    let c = 0;
    for (let j = -W; j <= W; j++) {
      const k = i + j;
      if (k < 0 || k >= SAMPLES) continue;
      const w = 1 - Math.abs(j) / (W + 1);
      s += cy[k] * w;
      c += w;
    }
    smoothed[i] = s / c;
  }
  cy.set(smoothed);

  // --- spatial hash over the centreline samples ----------------------------
  const CELL = 8;
  const buckets = new Map();
  const key = (ix, iz) => ix * 100003 + iz;
  for (let i = 0; i < SAMPLES; i++) {
    const ix = Math.floor(cx[i] / CELL);
    const iz = Math.floor(cz[i] / CELL);
    const kk = key(ix, iz);
    if (!buckets.has(kk)) buckets.set(kk, []);
    buckets.get(kk).push(i);
  }

  /** Nearest centreline sample: returns { dist, y, t }. */
  function nearestRoad(x, z) {
    const ix = Math.floor(x / CELL);
    const iz = Math.floor(z / CELL);
    let best = 1e9;
    let bi = -1;
    for (let r = 1; r <= 4 && bi < 0; r++) {
      for (let oz = -r; oz <= r; oz++) {
        for (let ox = -r; ox <= r; ox++) {
          if (r > 1 && Math.max(Math.abs(ox), Math.abs(oz)) < r) continue;
          const list = buckets.get(key(ix + ox, iz + oz));
          if (!list) continue;
          for (const i of list) {
            const dx = cx[i] - x;
            const dz = cz[i] - z;
            const d = dx * dx + dz * dz;
            if (d < best) {
              best = d;
              bi = i;
            }
          }
        }
      }
      if (bi >= 0 && r < 3) {
        // widen one more ring so we do not latch onto a corner sample
        const rr = r + 1;
        for (let oz = -rr; oz <= rr; oz++) {
          for (let ox = -rr; ox <= rr; ox++) {
            if (Math.max(Math.abs(ox), Math.abs(oz)) < rr) continue;
            const list = buckets.get(key(ix + ox, iz + oz));
            if (!list) continue;
            for (const i of list) {
              const dx = cx[i] - x;
              const dz = cz[i] - z;
              const d = dx * dx + dz * dz;
              if (d < best) {
                best = d;
                bi = i;
              }
            }
          }
        }
        break;
      }
    }
    if (bi < 0) return { dist: 1e6, y: 0, t: 0 };
    return { dist: Math.sqrt(best), y: cy[bi], t: bi / (SAMPLES - 1) };
  }

  /** Final terrain elevation including the graded track. */
  function surfaceHeight(x, z) {
    const base = baseHeight(x, z);
    const { dist, y: roadY } = nearestRoad(x, z);
    const blend = 1 - smoothstep(ROAD_HALF, ROAD_HALF + SHOULDER, dist);
    let y = base * (1 - blend) + roadY * blend;
    // crown, wheel ruts, and a low berm pushed to the edge by the grader
    const rut = Math.exp(-((dist - 1.16) ** 2) / (2 * 0.42 ** 2));
    const crown = Math.exp(-(dist ** 2) / (2 * 1.0 ** 2));
    const berm = Math.exp(-((dist - ROAD_HALF - 1.5) ** 2) / (2 * 1.1 ** 2));
    y += blend * (crown * 0.055 - rut * 0.085);
    y += smoothstep(0.0, 0.4, blend) * berm * 0.16;
    // fine surface chop everywhere so the mesh is never a smooth ramp
    y += (fbm(x * 0.42, z * 0.42, { octaves: 3, period: 64, seed: 5 }) - 0.5) * 0.11 * (1 - blend * 0.55);
    return y;
  }

  // --- mesh ----------------------------------------------------------------
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const road = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, surfaceHeight(x, z));
    const { dist } = nearestRoad(x, z);
    road[i] = 1 - smoothstep(ROAD_HALF - 0.5, ROAD_HALF + SHOULDER, dist);
    // world-space UVs keep the tiling uniform regardless of mesh density
    uv.setXY(i, x * 0.05, z * 0.05);
  }
  geo.setAttribute('aRoad', new THREE.BufferAttribute(road, 1));
  geo.computeVertexNormals();

  const dirt = dirtRoadMaps();
  const verge = vergeMaps();
  const litter = litterMaps();
  const detail = detailNormal();

  const material = new THREE.MeshStandardMaterial({
    map: dirt.map,
    normalMap: dirt.normal,
    roughnessMap: dirt.rough,
    aoMap: dirt.ao,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.55,
    color: 0xffffff,
    dithering: true,
  });
  material.userData.uniforms = {
    uVergeMap: { value: verge.map },
    uVergeNormal: { value: verge.normal },
    uVergeRough: { value: verge.rough },
    uLitterMap: { value: litter.map },
    uLitterNormal: { value: litter.normal },
    uLitterRough: { value: litter.rough },
    uDetailNormal: { value: detail },
    uScale: { value: new THREE.Vector3(0.34, 0.19, 0.26) },
    uDetailScale: { value: 3.1 },
    uWet: { value: 0.35 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.userData.uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aRoad;
        varying float vRoad;
        varying vec2 vTile;
        varying vec3 vWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vRoad = aRoad;
        vec4 wp = modelMatrix * vec4( transformed, 1.0 );
        vWorld = wp.xyz;
        vTile = wp.xz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uVergeMap, uVergeNormal, uVergeRough;
        uniform sampler2D uLitterMap, uLitterNormal, uLitterRough;
        uniform sampler2D uDetailNormal;
        uniform vec3 uScale;
        uniform float uDetailScale;
        uniform float uWet;
        varying float vRoad;
        varying vec2 vTile;
        varying vec3 vWorld;

        float wTrack() { return smoothstep( 0.52, 0.94, vRoad ); }
        float wVerge() { return smoothstep( 0.06, 0.55, vRoad ) * ( 1.0 - wTrack() ); }`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 uvT = vTile * uScale.x;
        vec2 uvV = vTile * uScale.y;
        vec2 uvL = vTile * uScale.z;
        float wt = wTrack();
        float wv = wVerge();
        vec3 aTrack = texture2D( map, uvT ).rgb;
        vec3 aVerge = texture2D( uVergeMap, uvV ).rgb;
        vec3 aLitter = texture2D( uLitterMap, uvL ).rgb;
        // a second, much larger tile of the same map kills obvious repetition
        vec3 aLitter2 = texture2D( uLitterMap, uvL * 0.17 + 0.31 ).rgb;
        aLitter = mix( aLitter, aLitter * aLitter2 * 2.1, 0.45 );
        vec3 aTrack2 = texture2D( map, uvT * 0.21 + 0.63 ).rgb;
        aTrack = mix( aTrack, aTrack * aTrack2 * 2.0, 0.4 );
        vec3 albedo = mix( aLitter, aVerge, wv );
        albedo = mix( albedo, aTrack, wt );
        // damp centre of the ruts
        float damp = uWet * wt * smoothstep( 0.75, 1.0, vRoad );
        albedo *= mix( 1.0, 0.62, damp );
        diffuseColor.rgb *= albedo;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float rTrack = texture2D( roughnessMap, vTile * uScale.x ).g;
        float rVerge = texture2D( uVergeRough, vTile * uScale.y ).g;
        float rLitter = texture2D( uLitterRough, vTile * uScale.z ).g;
        float roughnessFactor = roughness * mix( mix( rLitter, rVerge, wVerge() ), rTrack, wTrack() );
        roughnessFactor = mix( roughnessFactor, 0.28, uWet * wTrack() * smoothstep( 0.78, 1.0, vRoad ) );`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 nTrack = texture2D( normalMap, vTile * uScale.x ).xyz * 2.0 - 1.0;
        vec3 nVerge = texture2D( uVergeNormal, vTile * uScale.y ).xyz * 2.0 - 1.0;
        vec3 nLitter = texture2D( uLitterNormal, vTile * uScale.z ).xyz * 2.0 - 1.0;
        vec3 nDetail = texture2D( uDetailNormal, vTile * uDetailScale ).xyz * 2.0 - 1.0;
        vec3 mapN = mix( mix( nLitter, nVerge, wVerge() ), nTrack, wTrack() );
        float detailFade = 1.0 - smoothstep( 12.0, 34.0, length( vWorld - cameraPosition ) );
        mapN.xy += nDetail.xy * 0.55 * detailFade;
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#ifdef USE_AOMAP
        float ambientOcclusion = texture2D( aoMap, vTile * uScale.x ).r;
        ambientOcclusion = mix( 1.0, ambientOcclusion, aoMapIntensity );
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
        #endif
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'terrain-blend-v1';

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  if (env) material.envMap = env;

  return {
    mesh,
    material,
    curve,
    heightAt: surfaceHeight,
    roadDistance: (x, z) => nearestRoad(x, z).dist,
    roadHalf: ROAD_HALF,
    shoulder: SHOULDER,
    size: SIZE,
    /** Position + tangent on the graded centreline at curve parameter t. */
    roadPoint(t) {
      const p = curve.getPoint(THREE.MathUtils.clamp(t, 0, 1));
      const i = Math.min(SAMPLES - 1, Math.max(0, Math.round(t * (SAMPLES - 1))));
      p.y = cy[i];
      return p;
    },
    roadTangent(t) {
      return curve.getTangent(THREE.MathUtils.clamp(t, 0, 1)).normalize();
    },
  };
}
