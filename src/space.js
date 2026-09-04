// Everything outside the windows: drifting parallax stars, planets with atmosphere glow,
// nebula billboards, a distant sun and near-field dust streaks that sell forward motion.
import * as THREE from "three";
import { makeStarSprite, makeNebula, makeGasGiant, makeOceanWorld, makeMoon, makeClouds, mulberry32 } from "./textures.js";

const TURN_RATE = THREE.MathUtils.degToRad(1.3); // ship slowly banking: the sky slides past at 1.3 deg/s (a planet crosses the windshield in ~80 s)

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
    // soft terminator, then a Lambert roll-off across the lit face so the disc reads as a sphere
    float day = smoothstep(-0.06, 0.25, ndl) * (0.6 + 0.4 * clamp(ndl, 0.0, 1.0));
    vec3 alb = texture2D(map, vUv).rgb;
    if (hasClouds > 0.5) {
      float c = texture2D(clouds, vec2(vUv.x + cloudShift, vUv.y)).a;
      alb = mix(alb, vec3(1.0), c * 0.85);
    }
    float ndv = max(dot(n, v), 0.0);
    // atmosphere seen through a thickening column toward the limb: wide, bright and blue-shifted
    float fres = pow(1.0 - ndv, 3.5);
    // faint night-side ambient so the dark hemisphere still reads as a sphere
    vec3 col = alb * (day * brightness + 0.035 * vec3(0.55, 0.65, 1.0));
    // terminator warmth
    float term = smoothstep(-0.2, 0.15, ndl) * (1.0 - smoothstep(0.15, 0.55, ndl));
    col += vec3(0.9, 0.45, 0.2) * term * 0.12;
    // grazing sunlight still lights the atmosphere column at the limb (ndl ~ 0 there when the sun is
    // behind the viewer), so the ramp is centred below zero
    float lit = smoothstep(-0.5, 0.15, ndl);
    // limb darkening: the disc falls off toward its edge so the additive atmosphere outside it has
    // something dark to stand against (a limb as bright as the halo hides the halo)
    col *= 1.0 - 0.38 * pow(1.0 - ndv, 1.6);
    // haze toward the limb is capped below 1.0 so a planet filling a porthole never goes white;
    // only the last few degrees of the limb get the additive edge that blooms
    vec3 rim = atmo * (0.3 + 0.7 * lit) * min(atmoStrength * 0.55, 0.95);
    col = mix(col, rim, fres * 0.35);
    col += atmo * fres * fres * fres * atmoStrength * 0.6 * lit;
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
    // d = 1 at the planet's limb, 0 at the shell's silhouette
    float d = clamp(-dot(n, v) / limb, 0.0, 1.0);
    // cubic: a bright line right at the limb that fades across the halo — with a slower falloff the
    // whole 15% shell rendered near-white and read as a bigger planet with a soft edge
    float glow = pow(d, 3.0);
    // lit side of the limb: judge by the screen-radial direction, not the back-face normal (that
    // points away from the camera, so with the sun behind the viewer it read as night everywhere
    // and the whole halo ran at 18%). Grazing light still lights the column, hence the wide ramp.
    vec3 nr = normalize(n - v * dot(n, v));
    float day = smoothstep(-0.55, 0.15, dot(nr, sunDir));
    // additive blend multiplies by alpha, so keep it at 1 or the falloff gets squared into a hairline
    gl_FragColor = vec4(atmo * glow * strength * (0.15 + 0.85 * day), 1.0);
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
  // galactic band: a great circle tilted across the sky; the faint far layer clusters along it
  const bandN = new THREE.Vector3(0.35, 0.8, -0.5).normalize();
  const bandE1 = new THREE.Vector3(1, 0, 0).cross(bandN).normalize();
  const bandE2 = new THREE.Vector3().crossVectors(bandN, bandE1);
  const gauss = () => {
    let s = 0;
    for (let k = 0; k < 4; k++) s += rand();
    return (s - 2) / Math.sqrt(4 / 12);
  };
  const layerCfg = [
    { n: 9000, r: 4400, size: 1.35, rate: 0.6, tint: 0.7, band: 0.16 },
    { n: 3200, r: 4200, size: 1.9, rate: 0.7, tint: 0.95, band: 0 },
    { n: 1900, r: 3600, size: 2.7, rate: 1.0, tint: 1.05, band: 0 },
    { n: 640, r: 3000, size: 3.9, rate: 1.55, tint: 1.25, band: 0 },
    { n: 60, r: 2800, size: 6.5, rate: 1.7, tint: 1.6, band: 0 },
  ];
  for (const cfg of layerCfg) {
    const pos = new Float32Array(cfg.n * 3);
    const col = new Float32Array(cfg.n * 3);
    const p = new THREE.Vector3();
    for (let i = 0; i < cfg.n; i++) {
      if (cfg.band > 0) {
        // along the band: uniform in longitude, gaussian in latitude
        const phi = rand() * Math.PI * 2;
        const lat = gauss() * cfg.band;
        p.copy(bandE1).multiplyScalar(Math.cos(phi) * Math.cos(lat)).addScaledVector(bandE2, Math.sin(phi) * Math.cos(lat)).addScaledVector(bandN, Math.sin(lat));
      } else {
        // uniform on sphere
        const u = rand() * 2 - 1;
        const th = rand() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        p.set(s * Math.cos(th), u, s * Math.sin(th));
      }
      pos[i * 3] = p.x * cfg.r;
      pos[i * 3 + 1] = p.y * cfg.r;
      pos[i * 3 + 2] = p.z * cfg.r;
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

  // --- sun: aft-left-above the ship, so the planets ahead / abeam show their lit face to the windows
  const sunDirLocal = new THREE.Vector3(-0.464, 0.375, 0.803).normalize();
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
    { tex: nebTexA, dir: [-0.6, 0.15, -0.78], size: 3000, op: 0.7 },
    { tex: nebTexB, dir: [0.8, -0.2, -0.55], size: 2400, op: 0.55 },
    { tex: nebTexA, dir: [-0.2, 0.55, 0.8], size: 2600, op: 0.5 },
    { tex: nebTexB, dir: [0.1, -0.6, 0.75], size: 2000, op: 0.45 },
  ]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cfg.tex, transparent: true, opacity: cfg.op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: rand() * Math.PI * 2 }));
    sp.position.set(cfg.dir[0], cfg.dir[1], cfg.dir[2]).normalize().multiplyScalar(4000);
    sp.scale.set(cfg.size, cfg.size, 1);
    root.add(sp);
    nebulae.push(sp);
  }
  // soft galactic glow along the star band (very low opacity, many overlapping blobs)
  {
    const glowTex = makeNebula(256, 27, [0.75, 0.8, 0.95], [0.95, 0.85, 0.75]);
    const p = new THREE.Vector3();
    for (let i = 0; i < 26; i++) {
      const phi = (i / 26) * Math.PI * 2 + rand() * 0.2;
      const lat = gauss() * 0.06;
      p.copy(bandE1).multiplyScalar(Math.cos(phi) * Math.cos(lat)).addScaledVector(bandE2, Math.sin(phi) * Math.cos(lat)).addScaledVector(bandN, Math.sin(lat));
      // kept very faint and large: on a full-screen exterior sky discrete blobs read as sprites
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.03 + rand() * 0.02, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: rand() * Math.PI * 2 }));
      sp.position.copy(p).multiplyScalar(4500);
      const s = 1800 + rand() * 900;
      sp.scale.set(s, s * 0.6, 1);
      root.add(sp);
    }
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
    // 15% shell: ~19 px of halo on a 1080p frame for the gas giant in a porthole; the peak at the
    // limb (~0.9 × strength) sits just over the disc's limb-darkened edge so the line reads as glow
    const shellR = radius * 1.15;
    const limb = Math.sqrt(1 - (radius * radius) / (shellR * shellR));
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        atmo: { value: new THREE.Color(atmo) },
        sunDir: { value: new THREE.Vector3() },
        strength: { value: atmoStrength * 0.9 },
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
    // saturated amber: the halo has to differ from the cream disc or it reads as more disc
    atmo: "#ffae5c",
    atmoStrength: 0.95,
    brightness: 1.1,
    spin: 0.006,
    tilt: 0.28,
    ring: { inner: 1.35, outer: 2.25, colA: "#c9b393", colB: "#7d6a55", tiltX: 0.42, tiltY: 0.15 },
  });
  addPlanet({
    tex: makeOceanWorld(1024, 512, 88),
    clouds: makeClouds(1024, 512, 111),
    radius: 300,
    dist: 1900,
    bearingDeg: 60,
    elevation: 40,
    atmo: "#58b8ff",
    atmoStrength: 1.4,
    brightness: 0.85,
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
    atmoStrength: 0.15,
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
    atmoStrength: 0.7,
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

  function update(dt, camPos = null, showDust = true) {
    state.time += dt;
    apply();
    // the streak field rides along with the viewer so it sells motion from every deck; outside the
    // ship the streaks read as scratches on the sky, so the exterior camera never shows them
    dustLines.visible = showDust;
    if (showDust) {
      updateDust(dt);
      if (camPos) dustLines.position.copy(camPos);
    }
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
  return { root, planets, layers, update, setTime, framePlanet, sunDirLocal, sunWorld, state };
}
