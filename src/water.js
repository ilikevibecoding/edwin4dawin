// Deep-water exterior: backdrop, absorption, particle parallax layers, rocks,
// seabed, bubbles, bioluminescence, floodlight cones. Owner: underwater agent.
// All motion driven by uTime (sim time) so debug views are deterministic.
//
// Sight-line notes (drives every placement below):
// - forwardViewport debug camera sits at (0,1.42,3.0) and looks through the
//   r=0.46 aperture at z=-0.62 -> visible exterior is a ~7deg half-angle cone
//   along (0,-0.044,-1). At z=-15 it spans x +-2.3 around y 0.6; at z=-30 it
//   spans x +-4.2 around y 0.0. Anything meant to read through the window must
//   cross that lane.
// - starboard porthole camera (0.12,1.3,7.46) looks through the r=0.17 glass
//   at (1.52,1.42,6.95); the sleeve tube + boot ring vignette the cone (the
//   lower-left of the glass shows sleeve wall). True water window: at x 2.4..
//   3.2 it is y 1.3..1.9, z 6.15..6.9; at x=10.5 it is y 1.5..3.5, z 3.0..5.0.
// - the hull (x +-1.62, y -0.76..2.48, z -3..25 incl. bow fairing) must never
//   be clipped by conveyor rocks at any point of their drift cycle.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from './rng.js';

const WATER_NEAR = new THREE.Color('#0a2e33');
const WATER_FAR = new THREE.Color('#041418');

// Two floodlights on the bow fairing. Aimed mostly forward, ~14deg down and a
// touch inward, so the beams converge through the viewport sight cone, cross
// the view axis around z -10..-16 and rake the rock lane crowns (y ~ -1.3 at
// z ~ -14).
const CONES = [
  { pos: new THREE.Vector3(-1.05, 1.75, -1.3), dir: new THREE.Vector3(0.038, -0.27, -0.962).normalize() },
  { pos: new THREE.Vector3(1.05, 1.75, -1.3), dir: new THREE.Vector3(-0.038, -0.27, -0.962).normalize() },
];
const CONE_LEN = 24.0;

const coneGLSL = `
uniform vec3 uConePosA; uniform vec3 uConeDirA;
uniform vec3 uConePosB; uniform vec3 uConeDirB;
float coneLight(vec3 wp) {
  float total = 0.0;
  for (int i = 0; i < 2; i++) {
    vec3 cp = i == 0 ? uConePosA : uConePosB;
    vec3 cd = i == 0 ? uConeDirA : uConeDirB;
    vec3 d = wp - cp;
    float along = dot(d, cd);
    if (along < 0.0 || along > ${CONE_LEN.toFixed(1)}) continue;
    float rad = length(d - cd * along);
    float coneR = 0.45 + along * 0.10;
    float radial = 1.0 - smoothstep(coneR * 0.45, coneR, rad);
    float axial = (1.0 - smoothstep(8.0, ${CONE_LEN.toFixed(1)}, along)) * smoothstep(0.0, 1.3, along);
    total += radial * axial;
  }
  return total;
}
`;

function coneUniforms() {
  return {
    uConePosA: { value: CONES[0].pos }, uConeDirA: { value: CONES[0].dir },
    uConePosB: { value: CONES[1].pos }, uConeDirB: { value: CONES[1].dir },
  };
}

// ---------------------------------------------------------------------------
// Backdrop sphere: deep gradient (dark below, hinting light far above), large
// slow mottling so it is not a perfect ramp, god-ray banding near top only.
// ---------------------------------------------------------------------------
function buildBackdrop() {
  const geo = new THREE.SphereGeometry(95, 48, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uNear: { value: WATER_NEAR },
      uFar: { value: WATER_FAR },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform float uTime;
      uniform vec3 uNear, uFar;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vnoise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash3(i);
        float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
        return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
                   mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
      }
      void main() {
        vec3 dir = normalize(vWorld - cameraPosition);
        float up = dir.y * 0.5 + 0.5;
        // vertical absorption gradient, compressed around the horizon so the
        // narrow viewport band (up 0.41..0.55) still reads darker-below
        float g = smoothstep(0.30, 0.58, up);
        vec3 col = mix(uFar * 0.24, uNear * 0.95, g);
        // fall to near-black straight down
        col = mix(col, uFar * 0.10, smoothstep(0.40, 0.04, up));
        // large-scale mottling, drifting aft very slowly (suspended murk)
        float m = vnoise(dir * 3.1 + vec3(0.0, 0.0, uTime * 0.014)) * 0.62
                + vnoise(dir * 7.3 + vec3(0.0, -uTime * 0.006, uTime * 0.021)) * 0.38;
        col *= 0.84 + 0.32 * m;
        // faint god-ray banding, top only
        float band = sin(dir.x * 14.0 + uTime * 0.10) * sin(dir.x * 5.0 - uTime * 0.05 + dir.z * 4.0);
        col += uNear * 0.06 * max(0.0, band) * smoothstep(0.66, 0.97, up);
        // forward marginally clearer than aft (travel direction)
        col *= 1.0 + 0.08 * smoothstep(0.2, 1.0, -dir.z);
        // dithering to prevent banding
        col += (hash(gl_FragCoord.xy) - 0.5) * 0.0015;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, 11);
  mesh.userData.static = false;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

// ---------------------------------------------------------------------------
// Particle layers. Small, sharp-ish marine snow; hard pixel-size caps so the
// near field never blows out into big blobs against the glass.
// ---------------------------------------------------------------------------
function buildParticleLayer({ seed, count, box, speed, size, opacity, color, sink = 0.02,
  pxScale = 28, pxMin = 1.0, pxMax = 5.0, fade0 = 18, fade1 = 42, twinkle = 0 }) {
  const rng = makeRng(seed);
  const pos = new Float32Array(count * 3);
  const aSize = new Float32Array(count);
  const aPhase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rng.range(box.x0, box.x1);
    pos[i * 3 + 1] = rng.range(box.y0, box.y1);
    pos[i * 3 + 2] = rng.range(box.z0, box.z1);
    aSize[i] = size * rng.range(0.55, 1.5);
    aPhase[i] = rng.range(0, Math.PI * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uSink: { value: sink },
      uOpacity: { value: opacity },
      uColor: { value: new THREE.Color(color) },
      uZ0: { value: box.z0 }, uZ1: { value: box.z1 },
      uY0: { value: box.y0 }, uY1: { value: box.y1 },
      uPxScale: { value: pxScale }, uPxMin: { value: pxMin }, uPxMax: { value: pxMax },
      uFade0: { value: fade0 }, uFade1: { value: fade1 },
      uTwinkle: { value: twinkle },
      ...coneUniforms(),
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime, uSpeed, uSink, uZ0, uZ1, uY0, uY1;
      uniform float uPxScale, uPxMin, uPxMax, uFade0, uFade1;
      varying float vFade;
      varying float vPhase;
      ${coneGLSL}
      varying float vCone;
      void main() {
        vec3 p = position;
        p.z = mod(p.z + uTime * uSpeed - uZ0, uZ1 - uZ0) + uZ0;
        p.y = mod(p.y - uTime * uSink - uY0, uY1 - uY0) + uY0;
        p.x += sin(uTime * 0.22 + aPhase) * 0.22;
        p.y += sin(uTime * 0.185 + aPhase * 1.7) * 0.15;
        vPhase = aPhase;
        vCone = coneLight(p);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vFade = (1.0 - smoothstep(uFade0, uFade1, dist)) * smoothstep(0.55, 2.0, dist);
        // never render inside the pressure hull
        float inHull = step(length(p.xy - vec2(0.0, 0.86)), 2.35) * step(-2.2, p.z) * step(p.z, 25.2);
        vFade *= 1.0 - inHull;
        gl_PointSize = clamp(aSize * uPxScale / dist, uPxMin, uPxMax);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity, uTime, uTwinkle;
      varying float vFade;
      varying float vCone;
      varying float vPhase;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.15, d) * vFade * uOpacity;
        a *= mix(1.0, 0.3 + 0.7 * max(0.0, sin(uTime * 1.4 + vPhase * 11.0)), uTwinkle);
        if (a < 0.004) discard;
        vec3 col = uColor * (1.0 + vCone * 4.0);
        gl_FragColor = vec4(col, a * (1.0 + vCone * 1.5));
      }
    `,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.static = false;
  return { mesh: pts, mat };
}

// ---------------------------------------------------------------------------
// Rocks / terrain with absorption shader
// ---------------------------------------------------------------------------
function rockMaterial(extra = {}) {
  return new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uNear: { value: WATER_NEAR },
      uFar: { value: WATER_FAR },
      uRock: { value: new THREE.Color('#1d302a') },
      uDensity: { value: extra.density || 0.018 },
      ...coneUniforms(),
    },
    vertexShader: `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      varying vec3 vNormal;
      uniform vec3 uNear, uFar, uRock;
      uniform float uTime, uDensity;
      ${coneGLSL}
      void main() {
        float dist = length(vWorld - cameraPosition);
        float fogF = 1.0 - exp(-dist * uDensity);
        // top-lit from the distant surface
        float topLight = clamp(vNormal.y, 0.0, 1.0);
        vec3 col = uRock * (0.09 + topLight * 0.32);
        // sediment strata bands so cliff faces are not a flat wall
        float strata = sin(vWorld.y * 1.7 + vWorld.x * 0.22 + vWorld.z * 0.13);
        col *= 0.82 + 0.22 * strata * (1.0 - topLight * 0.7);
        // slow caustic shimmer on up-facing surfaces (kept subtle so crowns
        // stay dark rock, not pale dapple) + a finer y-aware octave that leaks
        // slightly onto steep flanks so near rocks (porthole crag at ~8 m)
        // carry lit-pool detail instead of rendering as flat cutouts
        float caust = max(0.0, sin(vWorld.x * 0.9 + uTime * 0.35) * sin(vWorld.z * 0.8 - uTime * 0.28));
        float caust2 = max(0.0, sin(vWorld.x * 2.3 - uTime * 0.22) * sin(vWorld.y * 1.9 + vWorld.z * 2.1 + uTime * 0.31));
        float dapple = caust * topLight + caust2 * (0.5 + 0.5 * topLight);
        col += vec3(0.02, 0.033, 0.03) * dapple * (1.0 - fogF);
        // faint water-glow fresnel rim: traces crag edges against the veil so
        // silhouettes read as modeled rock; fades with fog so distant rocks
        // keep their soft murk-mixed profile
        float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld))), 3.0);
        col += mix(uNear, uFar, 0.4) * rim * 0.14 * (1.0 - fogF);
        // floodlight pools (absorbed toward green-cyan with distance)
        float cone = coneLight(vWorld);
        col += vec3(0.38, 0.47, 0.44) * cone * (1.0 - fogF);
        // fade toward the water-column veil; slightly lighter than the rock
        // flanks so silhouettes split from the murk instead of washing out
        col = mix(col, mix(uNear * 0.22, uFar * 0.22, smoothstep(10.0, 60.0, dist)), fogF);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function displacedRock(seed, radius, detail = 3, stretch = [1, 1, 1]) {
  const rng = makeRng(seed);
  // weld the icosahedron (non-indexed by default) so computeVertexNormals
  // yields smooth organic normals instead of flat crystal facets
  const geo = mergeVertices(new THREE.IcosahedronGeometry(radius, detail), 1e-4);
  const pos = geo.attributes.position;
  const seedOff = rng.range(0, 100);
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const d = 1
      + 0.35 * Math.sin(n.x * 3.1 + seedOff) * Math.sin(n.y * 2.7 + seedOff * 1.7)
      + 0.22 * Math.sin(n.z * 5.3 + seedOff * 0.6) * Math.sin(n.x * 4.7)
      + 0.1 * Math.sin(n.y * 9.1 + seedOff * 2.2)
      // high-frequency octave: breaks the polygonal silhouette at close range
      + 0.045 * Math.sin(n.x * 16.3 + seedOff * 3.1) * Math.sin(n.y * 13.7 + seedOff * 1.3)
      + 0.028 * Math.sin(n.z * 21.7 + seedOff * 2.6) * Math.sin(n.y * 18.1);
    v.multiplyScalar(d);
    v.x *= stretch[0]; v.y *= stretch[1]; v.z *= stretch[2];
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function smoothstepJS(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
export function build(ctx) {
  const group = new THREE.Group();
  group.name = 'water';
  const mats = [];

  const backdrop = buildBackdrop();
  group.add(backdrop.mesh);
  mats.push(backdrop.mat);

  // marine snow: near window fast, mid, far slow. Small + dense, never blobby.
  const layers = [
    buildParticleLayer({ seed: 'part-near', count: 1900, box: { x0: -8, x1: 8, y0: -4, y1: 6, z0: -14, z1: 18 }, speed: 1.5, size: 1.15, opacity: 0.52, color: '#8fbcb8', sink: 0.06, pxScale: 26, pxMin: 1.5, pxMax: 5.5 }),
    buildParticleLayer({ seed: 'part-mid', count: 2100, box: { x0: -22, x1: 22, y0: -12, y1: 8, z0: -30, z1: 34 }, speed: 0.75, size: 1.05, opacity: 0.5, color: '#639290', sink: 0.035, pxScale: 30, pxMin: 1.2, pxMax: 5 }),
    buildParticleLayer({ seed: 'part-far', count: 1300, box: { x0: -42, x1: 42, y0: -18, y1: 10, z0: -48, z1: 48 }, speed: 0.3, size: 1.0, opacity: 0.3, color: '#456e70', sink: 0.015, pxScale: 34, pxMin: 1.5, pxMax: 4, fade0: 26, fade1: 55 }),
  ];
  for (const l of layers) { group.add(l.mesh); mats.push(l.mat); }

  // silt puffs: sparse, large, very faint, kept BELOW the window sightlines so
  // they read as bottom murk instead of a milky veil on the glass
  const silt = buildParticleLayer({ seed: 'silt', count: 30, box: { x0: -20, x1: 20, y0: -9, y1: -1.5, z0: -26, z1: 26 }, speed: 0.5, size: 1.0, opacity: 0.04, color: '#4a6668', sink: 0.008, pxScale: 900, pxMin: 24, pxMax: 110 });
  group.add(silt.mesh); mats.push(silt.mat);

  // bubbles rising from hull vents; columns placed on each side so they cross
  // the porthole sight rays. The stbd porthole's water window is vignetted by
  // the sleeve tube + boot ring to roughly y 1.3..1.9, z 6.15..6.9 at x 2.4..
  // 3.2 (lower-left of the glass shows the sleeve wall, not water) — the
  // column threads that lane 1..1.7 m past the glass so bright specks climb
  // the left-center of the view in front of the dark stbdMid flank.
  const bubS = buildParticleLayer({ seed: 'bubbles-s', count: 200, box: { x0: 2.4, x1: 3.2, y0: -2, y1: 4, z0: 6.45, z1: 6.95 }, speed: 0.5, size: 1.0, opacity: 0.92, color: '#c9e6e2', sink: -0.85, pxScale: 26, pxMin: 2.0, pxMax: 9 });
  group.add(bubS.mesh); mats.push(bubS.mat);
  const bubP = buildParticleLayer({ seed: 'bubbles-p', count: 60, box: { x0: -4.2, x1: -2.4, y0: -2, y1: 4, z0: 9.8, z1: 12.8 }, speed: 0.5, size: 1.0, opacity: 0.8, color: '#c9e6e2', sink: -0.8, pxScale: 16, pxMin: 1.5, pxMax: 7 });
  group.add(bubP.mesh); mats.push(bubP.mat);

  // bioluminescent sparks: rare, tiny, cyan, twinkling per particle
  const bio = buildParticleLayer({ seed: 'bio', count: 54, box: { x0: -30, x1: 30, y0: -14, y1: 4, z0: -40, z1: 40 }, speed: 0.3, size: 1.0, opacity: 0.0, color: '#6fd7d4', sink: 0.01, pxScale: 30, pxMin: 1.0, pxMax: 3.5, twinkle: 1 });
  group.add(bio.mesh); mats.push(bio.mat);

  // ---------------------------------------------------------------------------
  // Rock conveyor. Vessel travels -z so rocks drift +z and wrap.
  // rockDefs: {mesh, baseZ, span, lat?} — lat slides x as a function of wrapped
  // z so tall rocks can sit dead ahead when distant yet dodge the hull lane as
  // they close in (reads as the sub steering past them).
  // ---------------------------------------------------------------------------
  const rockMat = rockMaterial();
  mats.push(rockMat);
  const rocks = new THREE.Group();
  const rockDefs = [];
  const addRock = (mesh, baseZ, span, lat = null) => {
    rocks.add(mesh);
    rockDefs.push({ mesh, baseZ, span, lat });
  };

  // flanking rocks: parallax texture on both sides, occasionally crossing the
  // porthole views. Inner extent kept >= ~3.2 from centerline.
  const rng = makeRng('rocks');
  for (let i = 0; i < 8; i++) {
    const r = rng.range(2.4, 4.8);
    const sx = rng.range(0.8, 1.4);
    const geo = displacedRock('rock' + i, r, 2, [sx, rng.range(0.5, 0.9), rng.range(1.0, 1.7)]);
    const m = new THREE.Mesh(geo, rockMat);
    const side = rng.sign();
    const x = side * (3.2 + r * 1.5 * sx + rng.range(2.5, 9.0));
    m.position.set(x, rng.range(-11.5, -4.5), 0);
    m.rotation.y = rng.range(0, 3.1);
    addRock(m, rng.range(-45, 45), rng.range(78, 112));
  }

  // center-lane seamounts: low crowns (top ~ -1.3) that slide beneath the bow.
  // sea1 is timed to sit at z=-13 at t=40, in the floodlight crossover.
  const sea1 = new THREE.Mesh(displacedRock('sea1', 4.2, 3, [1.35, 0.6, 1.5]), rockMat);
  sea1.position.set(1.2, -4.9, 0);
  addRock(sea1, -43, 58);
  const sea2 = new THREE.Mesh(displacedRock('sea2', 3.6, 3, [1.2, 0.55, 1.4]), rockMat);
  sea2.position.set(-2.0, -5.0, 0);
  addRock(sea2, 48, 64);

  // broad transverse swell: a wide ridge the sub flies over (top <= ~-1.0),
  // fills the lower window band around z=-24 at t=40; ~83 s per pass
  const swell = new THREE.Mesh(displacedRock('swell', 7.5, 3, [2.2, 0.5, 1.1]), rockMat);
  swell.position.set(-2.0, -7.2, 0);
  addRock(swell, -54, 62);

  // hero pinnacle: tall silhouette that looms dead ahead when distant
  // (x=-1.5 while z<-30, at t=40 it stands at z=-33 filling the left-center of
  // the viewport), then slides to port as it closes so it clears the hull and
  // later passes the port porthole at mid distance. ~101 s cycle.
  const pinn = new THREE.Mesh(displacedRock('pinn', 4.6, 3, [0.6, 1.65, 0.95]), rockMat);
  pinn.position.set(-1.5, -5.5, 0);
  addRock(pinn, -57, 76, { xFar: -1.5, xNear: -10.0, z0: -24, z1: -8 });

  // starboard porthole hero: crag timed to cross the porthole sight cone at
  // t=40. Through the tube vignette the window at x~10.5 is y 1.5..3.5,
  // z 3.0..5.0 (see sight-line notes). Raised to y=-1.9 (rot 5.8 shows its
  // craggiest ridge) the crown crosses that window diagonally: rock fills the
  // lower/aft two-thirds at 7..10 m with open water upper-left. Wrap:
  // z(t=40) = wrap(-23.3 + 40*0.75 + 36, 72) = +6.7;
  // the pass runs ~t 26..48 and the wrap pop happens at z=+-36, >27 m off the
  // porthole sight axis (and >3 m off centerline, fog-veiled at the viewport
  // edge like the other flankers).
  const stbdMid = new THREE.Mesh(displacedRock('stbdMid', 4.2, 3, [1.2, 0.8, 1.5]), rockMat);
  stbdMid.position.set(10.5, -1.9, 0);
  stbdMid.rotation.y = 5.8;
  addRock(stbdMid, -23.3, 72);

  group.add(rocks);

  // seabed: two leapfrogging displaced planes far below (mostly a dark floor
  // tone; the swell rocks do the visible floor work)
  const bedMat = rockMaterial({ density: 0.038 });
  mats.push(bedMat);
  const bedDefs = [];
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.PlaneGeometry(120, 70, 48, 28);
    const p = geo.attributes.position;
    const rngB = makeRng('bed' + i);
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j);
      p.setZ(j, 2.2 * Math.sin(x * 0.14 + rngB.range(0, 0.4)) * Math.sin(y * 0.1) + 0.9 * Math.sin(x * 0.5) * Math.sin(y * 0.33) + rngB.range(-0.25, 0.25));
    }
    geo.computeVertexNormals();
    const bed = new THREE.Mesh(geo, bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, -11.5, i * 70 - 30);
    group.add(bed);
    bedDefs.push({ mesh: bed, baseZ: i * 70 - 30, span: 140 });
  }

  // floodlight beams (additive volumes). Bright when sighted along the axis
  // (through the viewport) via the core term; soft flanks via fresnel edge.
  for (const cone of CONES) {
    const len = CONE_LEN;
    const geo = new THREE.CylinderGeometry(0.45, 2.65, len, 20, 6, true);
    geo.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
      uniforms: { uTime: { value: 0 }, uDir: { value: cone.dir }, uPos: { value: cone.pos } },
      vertexShader: `
        varying float vAlong; varying vec3 vWorld;
        void main() {
          vAlong = -position.y / ${len.toFixed(1)};
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlong; varying vec3 vWorld;
        uniform float uTime;
        uniform vec3 uDir, uPos;
        void main() {
          // brightness from how near the view ray passes to the beam axis:
          // reads as a volume from the side AND from behind without blow-out
          vec3 vd = normalize(vWorld - cameraPosition);
          vec3 w = cameraPosition - uPos;
          vec3 n = cross(vd, uDir);
          float ln = length(n);
          float axisDist = ln > 1.0e-4 ? abs(dot(w, n)) / ln : length(w - uDir * dot(w, uDir));
          float coneR = 0.45 + 2.2 * vAlong;
          float radial = 1.0 - smoothstep(0.0, coneR, axisDist);
          float axial = smoothstep(0.0, 0.10, vAlong) * pow(1.0 - vAlong, 1.9);
          float flick = 0.93 + 0.07 * sin(uTime * 2.1 + vAlong * 7.0);
          // subtle drifting dust striations along the beam
          float stria = 0.88 + 0.12 * sin(vAlong * 30.0 - uTime * 1.6);
          // fade fragments close to the camera so standing beside the lamps
          // (or at the glass) never floods the whole frame with bloom
          float nearFade = smoothstep(1.5, 4.5, length(vWorld - cameraPosition));
          // looking down-beam from inside the hull the eye ray runs the whole
          // length of the volume, but BackSide gives a single fragment layer —
          // compensate with an axis-alignment gain so the cones read through
          // the forward viewport
          float align = pow(max(0.0, dot(vd, uDir)), 10.0);
          float a = (pow(radial, 3.5) * 0.18 + pow(radial, 2.0) * align * 0.30) * axial * flick * stria * nearFade;
          gl_FragColor = vec4(vec3(0.30, 0.43, 0.41), a);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(cone.pos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), cone.dir);
    mesh.userData.static = false;
    mesh.renderOrder = 5;
    group.add(mesh);
    mats.push(mat);
  }

  // motion update
  const SPEED = 0.75; // m/s relative water speed
  const wrap = (v, span) => ((v % span) + span) % span - span / 2;
  ctx.anim.add((t) => {
    for (const m of mats) if (m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t;
    // rocks conveyor: move aft (+z), wrap; lateral dodge for tall lane rocks
    for (const r of rockDefs) {
      const z = wrap(r.baseZ + t * SPEED + r.span / 2, r.span);
      r.mesh.position.z = z;
      if (r.lat) {
        r.mesh.position.x = r.lat.xFar + (r.lat.xNear - r.lat.xFar) * smoothstepJS(r.lat.z0, r.lat.z1, z);
      }
    }
    for (const b of bedDefs) {
      const z = ((b.baseZ + t * SPEED * 0.9 + 105) % 140) - 70;
      b.mesh.position.z = z;
    }
    // biolum swell: rare, subtle (per-particle twinkle in shader on top)
    bio.mat.uniforms.uOpacity.value = 0.1 + 0.1 * Math.sin(t * 0.45);
  });

  return group;
}
