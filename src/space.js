// Everything outside the windows: drifting parallax stars, planets with atmosphere glow,
// nebula billboards, a distant sun and near-field dust streaks that sell forward motion.
import * as THREE from "three";
import { makeStarSprite, makeNebula, makeGasGiant, makeOceanWorld, makeMoon, makeClouds, mulberry32 } from "./textures.js";

const TURN_RATE = THREE.MathUtils.degToRad(1.0); // ship slowly banking: everything slides past at 1 deg/s

const planetVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const planetFrag = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D clouds;
  uniform float hasClouds;
  uniform float cloudShift;
  uniform vec3 sunDir;
  uniform vec3 atmo;
  uniform float atmoStrength;
  uniform float brightness;
  varying vec3 vN;
  varying vec3 vW;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    float ndl = dot(n, sunDir);
    float day = smoothstep(-0.06, 0.32, ndl);
    vec3 alb = texture2D(map, vUv).rgb;
    if (hasClouds > 0.5) {
      float c = texture2D(clouds, vec2(vUv.x + cloudShift, vUv.y)).a;
      alb = mix(alb, vec3(1.0), c * 0.85);
    }
    float ndv = max(dot(n, v), 0.0);
    float fres = pow(1.0 - ndv, 3.2);
    vec3 col = alb * (day * brightness + 0.01);
    // terminator warmth
    float term = smoothstep(-0.2, 0.15, ndl) * (1.0 - smoothstep(0.15, 0.55, ndl));
    col += vec3(0.9, 0.45, 0.2) * term * 0.12;
    col += atmo * fres * atmoStrength * (0.2 + 0.8 * day);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const atmoFrag = /* glsl */ `
  uniform vec3 atmo;
  uniform vec3 sunDir;
  uniform float strength;
  uniform float limb; // sqrt(1 - (R/Rshell)^2)
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    float d = clamp(-dot(n, v) / limb, 0.0, 1.0);
    float glow = pow(d, 3.0);
    float day = smoothstep(-0.35, 0.35, dot(n, sunDir));
    gl_FragColor = vec4(atmo * glow * strength * (0.12 + 0.88 * day), glow);
  }
`;

const ringVert = /* glsl */ `
  varying vec3 vL;
  varying vec3 vW;
  void main() {
    vL = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ringFrag = /* glsl */ `
  uniform float rIn;
  uniform float rOut;
  uniform float planetR;
  uniform vec3 sunDirLocal;
  uniform vec3 colA;
  uniform vec3 colB;
  varying vec3 vL;
  varying vec3 vW;
  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  void main() {
    float r = length(vL.xy);
    float t = (r - rIn) / (rOut - rIn);
    if (t < 0.0 || t > 1.0) discard;
    // banded density
    float bands = 0.55 + 0.45 * sin(t * 60.0) * sin(t * 17.0 + 1.3);
    float gaps = smoothstep(0.02, 0.08, abs(t - 0.38)) * smoothstep(0.01, 0.05, abs(t - 0.72));
    float dens = bands * gaps * (0.6 + 0.4 * hash(floor(t * 90.0)));
    float edge = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
    float alpha = dens * edge * 0.85;
    // shadow of the planet on the ring
    float b = dot(vL, sunDirLocal);
    vec3 q = vL - b * sunDirLocal;
    float shadow = (b < 0.0) ? smoothstep(planetR * planetR * 0.9, planetR * planetR * 1.15, dot(q, q)) : 1.0;
    vec3 col = mix(colA, colB, bands) * (0.15 + 0.85 * shadow);
    gl_FragColor = vec4(col * 1.1, alpha);
  }
`;

export function buildSpace(scene) {
  const root = new THREE.Group();
  root.name = "space";
  scene.add(root);
  const rand = mulberry32(2024);

  // --- star layers (parallax: nearer layers drift faster)
  const starTex = makeStarSprite(64);
  const layers = [];
  const layerCfg = [
    { n: 2600, r: 4200, size: 1.9, rate: 0.7, tint: 0.95 },
    { n: 1600, r: 3600, size: 2.7, rate: 1.0, tint: 1.05 },
    { n: 520, r: 3000, size: 3.8, rate: 1.55, tint: 1.2 },
  ];
  for (const cfg of layerCfg) {
    const pos = new Float32Array(cfg.n * 3);
    const col = new Float32Array(cfg.n * 3);
    for (let i = 0; i < cfg.n; i++) {
      // uniform on sphere
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = s * Math.cos(th) * cfg.r;
      pos[i * 3 + 1] = u * cfg.r;
      pos[i * 3 + 2] = s * Math.sin(th) * cfg.r;
      // colour temperature spread
      const k = rand();
      const b = 0.55 + rand() * 0.45;
      let r, g, bl;
      if (k < 0.15) {
        r = 1.0;
        g = 0.75;
        bl = 0.55;
      } else if (k < 0.55) {
        r = 1.0;
        g = 0.96;
        bl = 0.9;
      } else {
        r = 0.75;
        g = 0.85;
        bl = 1.0;
      }
      col[i * 3] = r * b * cfg.tint;
      col[i * 3 + 1] = g * b * cfg.tint;
      col[i * 3 + 2] = bl * b * cfg.tint;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: cfg.size,
      sizeAttenuation: false,
      map: starTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.rate = cfg.rate;
    root.add(pts);
    layers.push(pts);
  }

  // --- sun (behind-right of the ship, lights the planets from the upper right)
  const sunDirLocal = new THREE.Vector3(0.62, 0.42, 0.66).normalize();
  const sunTex = makeStarSprite(128);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, color: 0xfff1d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sun.position.copy(sunDirLocal).multiplyScalar(4400);
  sun.scale.setScalar(520);
  root.add(sun);
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, color: 0xffb070, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sunHalo.position.copy(sun.position);
  sunHalo.scale.setScalar(1600);
  root.add(sunHalo);

  // --- nebulae
  const nebTexA = makeNebula(512, 3, [0.2, 0.7, 0.75], [0.9, 0.45, 0.3]);
  const nebTexB = makeNebula(512, 9, [0.45, 0.35, 0.8], [0.25, 0.75, 0.7]);
  const nebulae = [];
  for (const cfg of [
    { tex: nebTexA, dir: [-0.6, 0.15, -0.78], size: 3200, op: 0.6 },
    { tex: nebTexB, dir: [0.8, -0.2, -0.55], size: 2600, op: 0.45 },
    { tex: nebTexA, dir: [-0.2, 0.55, 0.8], size: 2800, op: 0.4 },
    { tex: nebTexB, dir: [0.1, -0.6, 0.75], size: 2200, op: 0.35 },
  ]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cfg.tex, transparent: true, opacity: cfg.op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: rand() * Math.PI * 2 }));
    sp.position.set(cfg.dir[0], cfg.dir[1], cfg.dir[2]).normalize().multiplyScalar(4000);
    sp.scale.set(cfg.size, cfg.size, 1);
    root.add(sp);
    nebulae.push(sp);
  }

  // --- planets
  const planets = [];
  function addPlanet({ tex, clouds = null, radius, dist, bearingDeg, elevation, atmo, atmoStrength = 1.2, brightness = 1.5, spin = 0.012, tilt = 0.2, ring = null }) {
    const g = new THREE.Group();
    const b = THREE.MathUtils.degToRad(bearingDeg);
    g.position.set(Math.sin(b) * dist, elevation, -Math.cos(b) * dist);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        clouds: { value: clouds },
        hasClouds: { value: clouds ? 1 : 0 },
        cloudShift: { value: 0 },
        sunDir: { value: new THREE.Vector3() },
        atmo: { value: new THREE.Color(atmo) },
        atmoStrength: { value: atmoStrength },
        brightness: { value: brightness },
      },
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      fog: false,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
    body.rotation.z = tilt;
    g.add(body);
    const shellR = radius * 1.075;
    const limb = Math.sqrt(1 - (radius * radius) / (shellR * shellR));
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        atmo: { value: new THREE.Color(atmo) },
        sunDir: { value: new THREE.Vector3() },
        strength: { value: atmoStrength * 1.6 },
        limb: { value: limb },
      },
      vertexShader: planetVert,
      fragmentShader: atmoFrag,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(shellR, 96, 64), atmoMat);
    g.add(shell);
    let ringMesh = null;
    if (ring) {
      const rIn = radius * ring.inner;
      const rOut = radius * ring.outer;
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          rIn: { value: rIn },
          rOut: { value: rOut },
          planetR: { value: radius },
          sunDirLocal: { value: new THREE.Vector3() },
          colA: { value: new THREE.Color(ring.colA) },
          colB: { value: new THREE.Color(ring.colB) },
        },
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        fog: false,
      });
      ringMesh = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 128, 4), ringMat);
      ringMesh.rotation.set(Math.PI / 2 + ring.tiltX, ring.tiltY, 0);
      g.add(ringMesh);
    }
    root.add(g);
    planets.push({ group: g, body, mat, atmoMat, ringMesh, spin, bearing: b });
    return g;
  }

  addPlanet({
    tex: makeGasGiant(1024, 512, 77),
    radius: 430,
    dist: 2150,
    bearingDeg: 0,
    elevation: -60,
    atmo: "#f2b07a",
    atmoStrength: 1.1,
    brightness: 0.95,
    spin: 0.006,
    tilt: 0.28,
    ring: { inner: 1.35, outer: 2.25, colA: "#c9b393", colB: "#7d6a55", tiltX: 0.42, tiltY: 0.15 },
  });
  addPlanet({
    tex: makeOceanWorld(1024, 512, 88),
    clouds: makeClouds(1024, 512, 111),
    radius: 300,
    dist: 1900,
    bearingDeg: 112,
    elevation: 60,
    atmo: "#5fc8ff",
    atmoStrength: 1.5,
    brightness: 1.05,
    spin: 0.02,
    tilt: 0.1,
  });
  addPlanet({
    tex: makeMoon(512, 256, 99),
    radius: 95,
    dist: 1150,
    bearingDeg: -62,
    elevation: -20,
    atmo: "#8a8f99",
    atmoStrength: 0.25,
    brightness: 0.85,
    spin: 0.01,
    tilt: 0.05,
  });
  addPlanet({
    tex: makeMoon(512, 256, 143),
    radius: 240,
    dist: 2300,
    bearingDeg: 190,
    elevation: 90,
    atmo: "#ff8a5a",
    atmoStrength: 0.9,
    brightness: 0.8,
    spin: 0.008,
    tilt: 0.3,
  });

  // --- dust streaks near the ship (not rotating with the far field)
  const dustCount = 260;
  const dustPos = new Float32Array(dustCount * 2 * 3);
  const dust = [];
  const spawn = (i, zOverride = null) => {
    let x, y, z;
    do {
      x = (rand() * 2 - 1) * 90;
      y = (rand() * 2 - 1) * 60;
      z = zOverride !== null ? zOverride : (rand() * 2 - 1) * 160;
    } while (Math.abs(x) < 9 && y > -4 && y < 7); // keep them out of the hull volume
    dust[i] = { x, y, z, len: 1.2 + rand() * 2.2 };
  };
  for (let i = 0; i < dustCount; i++) spawn(i);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.LineBasicMaterial({ color: 0xa9c3e6, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const dustLines = new THREE.LineSegments(dustGeo, dustMat);
  dustLines.frustumCulled = false;
  dustLines.name = "dust";
  scene.add(dustLines);
  const updateDust = (dt) => {
    const speed = 34;
    for (let i = 0; i < dustCount; i++) {
      const d = dust[i];
      d.z += speed * dt;
      if (d.z > 160) spawn(i, -160 + (d.z - 160));
      dustPos[i * 6] = d.x;
      dustPos[i * 6 + 1] = d.y;
      dustPos[i * 6 + 2] = d.z;
      dustPos[i * 6 + 3] = d.x;
      dustPos[i * 6 + 4] = d.y;
      dustPos[i * 6 + 5] = d.z - d.len;
    }
    dustGeo.attributes.position.needsUpdate = true;
  };

  // --- state / animation
  const state = { time: 0, baseAngle: 0 };
  const sunWorld = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();

  function apply() {
    root.rotation.y = state.baseAngle + state.time * TURN_RATE;
    for (const l of layers) l.rotation.y = state.time * TURN_RATE * (l.userData.rate - 1);
    root.updateMatrixWorld(true);
    sunWorld.copy(sunDirLocal).applyQuaternion(root.quaternion);
    for (const p of planets) {
      p.body.rotation.y = state.time * p.spin;
      p.mat.uniforms.sunDir.value.copy(sunWorld);
      p.mat.uniforms.cloudShift.value = state.time * 0.0025;
      p.atmoMat.uniforms.sunDir.value.copy(sunWorld);
      if (p.ringMesh) {
        // sun direction in the ring's local frame
        p.ringMesh.getWorldQuaternion(tmpQ);
        tmpV.copy(sunWorld).applyQuaternion(tmpQ.invert());
        p.ringMesh.material.uniforms.sunDirLocal.value.copy(tmpV);
      }
    }
  }

  function update(dt) {
    state.time += dt;
    apply();
    updateDust(dt);
  }

  function setTime(t) {
    state.time = t;
    apply();
  }

  // Rotate the far field so planet `index` sits along `worldDir` (XZ bearing) right now.
  function framePlanet(index, worldDir) {
    const p = planets[index];
    const w = Math.atan2(worldDir.x, -worldDir.z);
    state.baseAngle = p.bearing - w - state.time * TURN_RATE;
    apply();
  }

  apply();
  return { root, planets, layers, update, setTime, framePlanet, sunDirLocal, state };
}
