// Deep-water exterior: backdrop, absorption, particle parallax layers, rocks,
// seabed, bubbles, bioluminescence, floodlight cones. Owner: underwater agent.
// All motion driven by uTime (sim time) so debug views are deterministic.

import * as THREE from 'three';
import { makeRng } from './rng.js';

const WATER_NEAR = new THREE.Color('#0a2e33');
const WATER_FAR = new THREE.Color('#041418');

// two floodlights on the bow fairing, aimed forward-down
const CONES = [
  { pos: new THREE.Vector3(-1.05, 1.75, -1.3), dir: new THREE.Vector3(0, -0.45, -0.893).normalize() },
  { pos: new THREE.Vector3(1.05, 1.75, -1.3), dir: new THREE.Vector3(0, -0.45, -0.893).normalize() },
];

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
    if (along < 0.0 || along > 20.0) continue;
    float rad = length(d - cd * along);
    float coneR = 0.35 + along * 0.24;
    float radial = 1.0 - smoothstep(coneR * 0.55, coneR, rad);
    float axial = (1.0 - smoothstep(4.0, 20.0, along)) * smoothstep(0.0, 1.2, along);
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
// Backdrop sphere
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
      void main() {
        vec3 dir = normalize(vWorld - cameraPosition);
        float up = dir.y * 0.5 + 0.5;
        // brighter toward the distant surface, darker below
        vec3 col = mix(uFar * 0.35, uNear * 0.85, smoothstep(0.3, 0.97, up));
        col = mix(col, uFar * 0.22, smoothstep(0.42, 0.0, up));
        // very soft god-ray banding from above, drifting aft
        float band = sin(dir.x * 14.0 + uTime * 0.10) * sin(dir.x * 5.0 - uTime * 0.05 + dir.z * 4.0);
        col += uNear * 0.10 * max(0.0, band) * smoothstep(0.55, 1.0, up);
        // forward slightly clearer than aft (travel direction)
        col *= 1.0 + 0.10 * smoothstep(0.2, 1.0, -dir.z);
        // dithering to prevent banding
        col += (hash(gl_FragCoord.xy) - 0.5) * 0.008;
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
// Particle layers
// ---------------------------------------------------------------------------
function buildParticleLayer({ seed, count, box, speed, size, opacity, color, sink = 0.02 }) {
  const rng = makeRng(seed);
  const pos = new Float32Array(count * 3);
  const aSize = new Float32Array(count);
  const aPhase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rng.range(box.x0, box.x1);
    pos[i * 3 + 1] = rng.range(box.y0, box.y1);
    pos[i * 3 + 2] = rng.range(box.z0, box.z1);
    aSize[i] = size * rng.range(0.5, 1.6);
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
      ...coneUniforms(),
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime, uSpeed, uSink, uZ0, uZ1, uY0, uY1;
      varying float vFade;
      varying vec3 vWorld;
      ${coneGLSL}
      varying float vCone;
      void main() {
        vec3 p = position;
        p.z = mod(p.z + uTime * uSpeed - uZ0, uZ1 - uZ0) + uZ0;
        p.y = mod(p.y - uTime * uSink - uY0, uY1 - uY0) + uY0;
        p.x += sin(uTime * 0.22 + aPhase) * 0.25;
        p.y += sin(uTime * 0.185 + aPhase * 1.7) * 0.18;
        vWorld = p;
        vCone = coneLight(p);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vFade = (1.0 - smoothstep(18.0, 42.0, dist)) * smoothstep(0.55, 2.2, dist);
        // never render inside the pressure hull
        float inHull = step(length(p.xy - vec2(0.0, 0.86)), 2.35) * step(-2.2, p.z) * step(p.z, 25.2);
        vFade *= 1.0 - inHull;
        gl_PointSize = aSize * clamp(150.0 / dist, 0.7, 7.5);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      varying float vCone;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.08, d) * vFade * uOpacity;
        if (a < 0.004) discard;
        vec3 col = uColor * (1.0 + vCone * 5.0);
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
      uRock: { value: new THREE.Color('#13221f') },
      uDensity: { value: extra.density || 0.052 },
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
        vec3 col = uRock * (0.35 + topLight * 0.85);
        // slow caustic shimmer on up-facing surfaces
        float caust = max(0.0, sin(vWorld.x * 0.9 + uTime * 0.35) * sin(vWorld.z * 0.8 - uTime * 0.28));
        col += vec3(0.10, 0.16, 0.15) * caust * topLight * (1.0 - fogF) * 0.55;
        // floodlight
        float cone = coneLight(vWorld);
        col += vec3(0.55, 0.68, 0.66) * cone * (1.0 - fogF);
        col = mix(col, mix(uNear, uFar, smoothstep(6.0, 60.0, dist)), fogF);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function displacedRock(seed, radius, detail = 2, stretch = [1, 1, 1]) {
  const rng = makeRng(seed);
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const seedOff = rng.range(0, 100);
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const d = 1
      + 0.35 * Math.sin(n.x * 3.1 + seedOff) * Math.sin(n.y * 2.7 + seedOff * 1.7)
      + 0.22 * Math.sin(n.z * 5.3 + seedOff * 0.6) * Math.sin(n.x * 4.7)
      + 0.1 * Math.sin(n.y * 9.1 + seedOff * 2.2);
    v.multiplyScalar(d);
    v.x *= stretch[0]; v.y *= stretch[1]; v.z *= stretch[2];
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
export function build(ctx) {
  const group = new THREE.Group();
  group.name = 'water';
  const mats = [];

  const backdrop = buildBackdrop();
  group.add(backdrop.mesh);
  mats.push(backdrop.mat);

  // particle layers (near window fast, mid, far slow)
  const layers = [
    buildParticleLayer({ seed: 'part-near', count: 850, box: { x0: -7, x1: 7, y0: -4, y1: 6, z0: -10, z1: 18 }, speed: 1.15, size: 2.2, opacity: 0.38, color: '#9fc4c2', sink: 0.05 }),
    buildParticleLayer({ seed: 'part-mid', count: 1200, box: { x0: -20, x1: 20, y0: -10, y1: 8, z0: -25, z1: 32 }, speed: 0.55, size: 2.0, opacity: 0.34, color: '#7ba7a6', sink: 0.03 }),
    buildParticleLayer({ seed: 'part-far', count: 800, box: { x0: -40, x1: 40, y0: -18, y1: 10, z0: -45, z1: 45 }, speed: 0.22, size: 1.7, opacity: 0.2, color: '#5d8a8c', sink: 0.015 }),
  ];
  for (const l of layers) { group.add(l.mesh); mats.push(l.mat); }

  // silt puffs: sparse, large, very faint
  const silt = buildParticleLayer({ seed: 'silt', count: 26, box: { x0: -18, x1: 18, y0: -9, y1: 2, z0: -20, z1: 26 }, speed: 0.4, size: 30, opacity: 0.05, color: '#6c8886', sink: 0.008 });
  group.add(silt.mesh); mats.push(silt.mat);

  // bubbles rising near amidships vents
  const bub = buildParticleLayer({ seed: 'bubbles', count: 90, box: { x0: -2.4, x1: 2.4, y0: -3, y1: 5, z0: 9, z1: 13 }, speed: 0.25, size: 1.6, opacity: 0.5, color: '#cfe8e6', sink: -0.75 });
  group.add(bub.mesh); mats.push(bub.mat);

  // bioluminescent sparks: rare, tiny, cyan
  const bio = buildParticleLayer({ seed: 'bio', count: 42, box: { x0: -30, x1: 30, y0: -14, y1: 4, z0: -40, z1: 40 }, speed: 0.3, size: 1.3, opacity: 0.0, color: '#6fd7d4', sink: 0.01 });
  // pulse opacity in shader via time-based hack: override in update below
  group.add(bio.mesh); mats.push(bio.mat);

  // rock conveyor
  const rockMat = rockMaterial();
  mats.push(rockMat);
  const rocks = new THREE.Group();
  const rng = makeRng('rocks');
  const rockDefs = [];
  for (let i = 0; i < 11; i++) {
    const r = rng.range(2.2, 6.5);
    const geo = displacedRock('rock' + i, r, 2, [rng.range(0.8, 1.6), rng.range(0.5, 1.0), rng.range(0.9, 1.8)]);
    const m = new THREE.Mesh(geo, rockMat);
    const side = rng.sign();
    m.position.set(side * rng.range(9, 26), rng.range(-13, -3), rng.range(-55, 45));
    m.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
    rocks.add(m);
    rockDefs.push({ mesh: m, baseZ: m.position.z, span: 100 });
  }
  // one large ridge sliding past over ~80 s (speed 0.75 m/s, span 60 m)
  const ridgeGeo = displacedRock('ridge', 9, 3, [1.1, 1.4, 3.2]);
  const ridge = new THREE.Mesh(ridgeGeo, rockMat);
  ridge.position.set(-17, -9, 0);
  rocks.add(ridge);
  rockDefs.push({ mesh: ridge, baseZ: -20, span: 60 });
  // starboard counterpart further out
  const ridge2 = new THREE.Mesh(displacedRock('ridge2', 11, 3, [1.3, 1.1, 2.6]), rockMat);
  ridge2.position.set(24, -11, 10);
  rocks.add(ridge2);
  rockDefs.push({ mesh: ridge2, baseZ: 10, span: 90 });
  group.add(rocks);

  // seabed: two leapfrogging displaced planes
  const bedMat = rockMaterial({ density: 0.06 });
  mats.push(bedMat);
  const bedDefs = [];
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.PlaneGeometry(120, 70, 48, 28);
    const p = geo.attributes.position;
    const rngB = makeRng('bed' + i);
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j);
      p.setZ(j, 1.6 * Math.sin(x * 0.14 + rngB.range(0, 0.4)) * Math.sin(y * 0.1) + 0.8 * Math.sin(x * 0.5) * Math.sin(y * 0.33) + rngB.range(-0.2, 0.2));
    }
    geo.computeVertexNormals();
    const bed = new THREE.Mesh(geo, bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, -14.5, i * 70 - 30);
    group.add(bed);
    bedDefs.push({ mesh: bed, baseZ: i * 70 - 30, span: 140 });
  }

  // floodlight cones (additive volumes)
  for (const cone of CONES) {
    const len = 17;
    const geo = new THREE.CylinderGeometry(0.28, 4.4, len, 24, 8, true);
    geo.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying float vAlong; varying vec3 vWorld; varying vec3 vNormal;
        void main() {
          vAlong = -position.y / ${len.toFixed(1)};
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlong; varying vec3 vWorld; varying vec3 vNormal;
        uniform float uTime;
        void main() {
          vec3 view = normalize(cameraPosition - vWorld);
          float fres = abs(dot(view, vNormal));
          float edge = pow(fres, 1.6);
          float axial = smoothstep(0.0, 0.12, vAlong) * pow(1.0 - vAlong, 1.7);
          float flick = 0.92 + 0.08 * sin(uTime * 2.3 + vAlong * 9.0);
          float a = edge * axial * 0.20 * flick;
          gl_FragColor = vec4(vec3(0.55, 0.72, 0.72), a);
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
  ctx.anim.add((t) => {
    for (const m of mats) if (m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t;
    // rocks conveyor: move aft (+z), wrap
    for (const r of rockDefs) {
      const z = ((r.baseZ + t * SPEED + r.span / 2) % r.span + r.span) % r.span - r.span / 2;
      r.mesh.position.z = z;
    }
    for (const b of bedDefs) {
      const z = ((b.baseZ + t * SPEED * 0.9 + 105) % 140) - 70;
      b.mesh.position.z = z;
    }
    // biolum pulse
    bio.mat.uniforms.uOpacity.value = 0.25 + 0.25 * Math.sin(t * 0.5);
  });

  return group;
}
