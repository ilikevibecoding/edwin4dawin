/**
 * space.js — everything outside the hull.
 *
 * Rendered as its own scene with its own camera *behind* the interior (see
 * post.js), so the interior can keep a 0.1 m near plane while the planet sits
 * 3 km away with zero depth-precision conflict. The space camera copies the
 * player camera's orientation but only 3 % of its translation, which gives
 * believable parallax without a planet that swings when you take a step.
 */
import * as THREE from 'three';
import { PALETTE, mulberry32 } from './materials.js';

const PLANET_PERIOD = 82;     // seconds for a full traverse loop
const PLANET_X = 4600;        // metres abeam to starboard
const PLANET_TRAVEL = 20000;  // metres travelled along the loop (bow-ahead → astern)
// Sun sits up/port/slightly forward: from the starboard porthole the planet
// reads as a fat gibbous with a clear terminator, and from the cockpit the
// star itself sits just off the left edge of the viewport.
const SUN_DIR = new THREE.Vector3(-0.60, 0.50, -0.62).normalize();

/* ---------------------------------------------------------------- textures */

function cvs(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function makeNoise2D(seed) {
  const rnd = mulberry32(seed);
  const size = 256;
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const i = (a, b) => g[((b % size) + size) % size * size + (((a % size) + size) % size)];
    const a = i(xi, yi), b = i(xi + 1, yi), c = i(xi, yi + 1), d = i(xi + 1, yi + 1);
    return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf;
  };
}

function fbm(noise, x, y, oct = 5, lac = 2.1, gain = 0.52) {
  let s = 0, a = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += noise(x * f, y * f) * a; norm += a; a *= gain; f *= lac; }
  return s / norm;
}

/** Banded gas giant, warm ochre with teal polar haze — matches the interior palette. */
function makePlanetTexture(seed = 7) {
  const W = 1024, H = 512;
  const c = cvs(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const n1 = makeNoise2D(seed);
  const n2 = makeNoise2D(seed + 991);

  const bandCol = (v, lat) => {
    // v in 0..1 -> ochre / cream / rust bands, teal-ish toward the poles
    const stops = [
      [0.00, [46, 34, 30]],
      [0.28, [122, 74, 44]],
      [0.46, [186, 132, 78]],
      [0.62, [222, 190, 148]],
      [0.78, [176, 116, 66]],
      [1.00, [238, 214, 178]],
    ];
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (v >= stops[i][0] && v <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const t = (v - a[0]) / Math.max(1e-5, b[0] - a[0]);
    const col = [0, 1, 2].map((k) => a[1][k] + (b[1][k] - a[1][k]) * t);
    // polar teal haze
    const p = Math.pow(Math.abs(lat), 3);
    col[0] = col[0] * (1 - p * 0.55) + 60 * p * 0.55;
    col[1] = col[1] * (1 - p * 0.35) + 150 * p * 0.35;
    col[2] = col[2] * (1 - p * 0.25) + 150 * p * 0.25;
    return col;
  };

  // sample noise on a circle in u so the texture is seamless at the wrap
  const TAU = Math.PI * 2;
  for (let y = 0; y < H; y++) {
    const lat = (y / H) * 2 - 1;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const cu = Math.cos(u * TAU), su = Math.sin(u * TAU);
      const warp = fbm(n1, 20 + cu * 3.4, 20 + su * 3.4 + lat * 3, 4) - 0.5;
      const band = 0.5 + 0.5 * Math.sin((lat * 9 + warp * 2.2) * Math.PI);
      const detail = fbm(n2, 40 + cu * 7.5, 40 + su * 7.5 + lat * 6, 5);
      const v = THREE.MathUtils.clamp(band * 0.72 + detail * 0.4, 0, 1);
      const col = bandCol(v, lat);
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // great storm
  ctx.save();
  ctx.globalAlpha = 0.75;
  const gx = W * 0.62, gy = H * 0.58, gr = W * 0.075;
  const g = ctx.createRadialGradient(gx, gy, gr * 0.15, gx, gy, gr);
  g.addColorStop(0, 'rgba(226,146,72,0.95)');
  g.addColorStop(0.55, 'rgba(158,86,42,0.7)');
  g.addColorStop(1, 'rgba(158,86,42,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Soft round star sprite. */
function makeStarSprite() {
  const S = 64;
  const c = cvs(S);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.55, 'rgba(190,215,255,0.22)');
  g.addColorStop(1, 'rgba(160,190,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Wispy nebula billboard. */
function makeNebulaTexture(seed, hue) {
  const S = 256;
  const c = cvs(S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const n = makeNoise2D(seed);
  const col = new THREE.Color(hue);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      let a = fbm(n, u * 5, v * 5, 5, 2.2, 0.55);
      a = Math.pow(THREE.MathUtils.clamp(a * 1.7 - 0.42, 0, 1), 1.5);
      a *= Math.pow(THREE.MathUtils.clamp(1 - d, 0, 1), 1.6);
      const i = (y * S + x) * 4;
      const shade = 0.55 + fbm(n, u * 11 + 3, v * 11, 3) * 0.6;
      img.data[i] = col.r * 255 * shade;
      img.data[i + 1] = col.g * 255 * shade;
      img.data[i + 2] = col.b * 255 * shade;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------- build */

export function buildSpace() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 1, 60000);
  scene.add(camera);

  const sprite = makeStarSprite();

  /* --- starfield: three parallax shells ------------------------------- */
  const starLayers = [];
  const layerCfg = [
    { count: 2600, radius: 2400, size: 13, opacity: 1.0, spin: 0.0065 },
    { count: 2200, radius: 5200, size: 20, opacity: 0.78, spin: 0.0030 },
    { count: 1600, radius: 9000, size: 30, opacity: 0.5, spin: 0.0014 },
  ];
  layerCfg.forEach((cfg, li) => {
    const rnd = mulberry32(1000 + li * 77);
    const pos = new Float32Array(cfg.count * 3);
    const col = new Float32Array(cfg.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < cfg.count; i++) {
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const r = cfg.radius * (0.85 + rnd() * 0.3);
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(th) * s * r;
      // colour temperature spread, biased to the palette
      const k = rnd();
      if (k < 0.62) c.setHSL(0.58 + rnd() * 0.07, 0.25 + rnd() * 0.3, 0.75 + rnd() * 0.25);
      else if (k < 0.86) c.setHSL(0.09 + rnd() * 0.05, 0.4 + rnd() * 0.3, 0.7 + rnd() * 0.2);
      else c.setHSL(0.5 + rnd() * 0.05, 0.32, 0.8);
      const b = 0.3 + Math.pow(rnd(), 2.6) * 0.72;
      col[i * 3] = c.r * b; col[i * 3 + 1] = c.g * b; col[i * 3 + 2] = c.b * b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: cfg.size, map: sprite, vertexColors: true, transparent: true,
      opacity: cfg.opacity, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.userData.spin = cfg.spin;
    scene.add(pts);
    starLayers.push(pts);
  });

  /* --- nebulae -------------------------------------------------------- */
  const nebulae = [];
  const nebCfg = [
    { seed: 21, hue: 0x2a6ad0, pos: [-5200, 900, -6200], size: 9000, op: 0.5, rot: 0.3 },
    { seed: 33, hue: 0xa8368f, pos: [6400, -1200, -5400], size: 8000, op: 0.4, rot: -0.6 },
    { seed: 44, hue: 0x1f8f9c, pos: [-2200, 250, -8200], size: 8000, op: 0.5, rot: 1.1 },
    { seed: 58, hue: 0x3a4fb0, pos: [-6800, -1800, 3600], size: 7000, op: 0.3, rot: -1.4 },
  ];
  for (const n of nebCfg) {
    const mat = new THREE.MeshBasicMaterial({
      map: makeNebulaTexture(n.seed, n.hue), transparent: true, opacity: n.op,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(n.size, n.size * 0.72), mat);
    m.position.set(...n.pos);
    m.rotation.z = n.rot;
    m.lookAt(0, 0, 0);
    m.rotation.z += n.rot;
    m.frustumCulled = false;
    scene.add(m);
    nebulae.push(m);
  }

  /* --- the planet ------------------------------------------------------ */
  const planetGroup = new THREE.Group();
  scene.add(planetGroup);

  const PLANET_R = 1150;
  const planetTex = makePlanetTexture(7);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R, 72, 48),
    new THREE.MeshStandardMaterial({
      map: planetTex, roughness: 0.95, metalness: 0.0, fog: false,
      emissive: 0x05080c, emissiveIntensity: 1.0,
    }),
  );
  planet.rotation.z = 0.22;
  planetGroup.add(planet);

  // thin cloud/haze shell
  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R * 1.012, 48, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffe8cf, transparent: true, opacity: 0.16, roughness: 1, metalness: 0,
      depthWrite: false, fog: false,
    }),
  );
  planetGroup.add(haze);

  // atmosphere rim: fresnel shell, brightest on the lit limb
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uLight: { value: SUN_DIR.clone() },
      uColorIn: { value: new THREE.Color(0x63c8ff) },
      uColorOut: { value: new THREE.Color(0x6f7fd0) },
      uPower: { value: 2.4 },
      uStrength: { value: 1.2 },
    },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uLight; uniform vec3 uColorIn; uniform vec3 uColorOut;
      uniform float uPower; uniform float uStrength;
      varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
      void main() {
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), uPower);
        float lit = max(dot(normalize(vN), normalize(uLight)), 0.0);
        float term = smoothstep(0.0, 0.55, lit);
        vec3 col = mix(uColorOut, uColorIn, term);
        float a = fres * uStrength * (0.045 + term * 1.35);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.11, 64, 40), rimMat);
  planetGroup.add(rim);

  // a small moon for scale
  const moonGroup = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(340, 40, 28),
    new THREE.MeshStandardMaterial({ color: 0x8f9298, roughness: 1, metalness: 0, fog: false }),
  );
  moonGroup.add(moon);
  const moonRim = new THREE.Mesh(new THREE.SphereGeometry(340 * 1.05, 32, 22), rimMat.clone());
  moonRim.material.uniforms.uColorIn.value = new THREE.Color(0x8fb6ff);
  moonRim.material.uniforms.uColorOut.value = new THREE.Color(0x40507a);
  moonRim.material.uniforms.uStrength.value = 0.8;
  moonGroup.add(moonRim);
  scene.add(moonGroup);

  /* --- sun + light ----------------------------------------------------- */
  const sun = new THREE.DirectionalLight(0xfff0dd, 2.3);
  sun.position.copy(SUN_DIR).multiplyScalar(10000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223349, 0.42));

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeStarSprite(), color: 0xfff6e0, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunSprite.position.copy(SUN_DIR).multiplyScalar(16000);
  sunSprite.scale.setScalar(2600);
  scene.add(sunSprite);

  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeStarSprite(), color: 0xffffff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunCore.position.copy(sunSprite.position);
  sunCore.scale.setScalar(900);
  scene.add(sunCore);

  /* --- debris streaking past ------------------------------------------- */
  const DEB = 260;
  const debPos = new Float32Array(DEB * 6);
  const debCol = new Float32Array(DEB * 6);
  const debSeed = mulberry32(555);
  const debData = [];
  for (let i = 0; i < DEB; i++) {
    const p = new THREE.Vector3(
      (debSeed() - 0.5) * 900,
      (debSeed() - 0.5) * 500,
      (debSeed() - 0.5) * 1400,
    );
    debData.push({ p, len: 10 + debSeed() * 42, speed: 240 + debSeed() * 380 });
    const b = 0.25 + debSeed() * 0.75;
    for (let k = 0; k < 2; k++) {
      debCol[i * 6 + k * 3] = 0.75 * b;
      debCol[i * 6 + k * 3 + 1] = 0.88 * b;
      debCol[i * 6 + k * 3 + 2] = 1.0 * b;
    }
  }
  const debGeo = new THREE.BufferGeometry();
  debGeo.setAttribute('position', new THREE.BufferAttribute(debPos, 3));
  debGeo.setAttribute('color', new THREE.BufferAttribute(debCol, 3));
  const debris = new THREE.LineSegments(debGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.42,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  debris.frustumCulled = false;
  scene.add(debris);

  /* --- update ----------------------------------------------------------- */
  const tmp = new THREE.Vector3();
  let lastT = 0;

  function update(t, mainCamera) {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;

    // camera: full rotation, scaled translation
    camera.quaternion.copy(mainCamera.quaternion);
    camera.fov = mainCamera.fov;
    camera.aspect = mainCamera.aspect;
    camera.position.copy(mainCamera.position).multiplyScalar(0.03);
    camera.updateProjectionMatrix();

    // Planet drifts past the starboard side, looping. It sits far enough abeam
    // (PLANET_X) that when it is level with the hull its disc fits *inside* the
    // corridor porthole — limb, atmosphere rim and stars all visible instead of a
    // full-bleed orange field — and the travel span is wide enough that early in
    // the loop it is ahead of the bow, inside the cockpit viewport.
    const phase = (t % PLANET_PERIOD) / PLANET_PERIOD;          // 0..1
    const travel = (phase - 0.5) * PLANET_TRAVEL;
    planetGroup.position.set(PLANET_X, -520 + Math.sin(phase * Math.PI) * 160, travel);
    planet.rotation.y = t * 0.008;
    haze.rotation.y = t * 0.011;
    rimMat.uniforms.uLight.value.copy(SUN_DIR);

    moonGroup.position.set(
      -760 + Math.sin(t * 0.006) * 140,
      95,
      -3500 + travel * 0.22,
    );
    moon.rotation.y = t * 0.004;

    // star shells counter-rotate slightly -> parallax
    for (const layer of starLayers) {
      layer.rotation.y = t * layer.userData.spin * 0.35;
      layer.rotation.x = Math.sin(t * layer.userData.spin * 0.2) * 0.05;
    }
    for (let i = 0; i < nebulae.length; i++) {
      nebulae[i].position.z += dt * (7 + i * 3);
      if (nebulae[i].position.z > 9000) nebulae[i].position.z -= 18000;
    }

    // debris streaks rushing aft
    const arr = debGeo.attributes.position.array;
    for (let i = 0; i < DEB; i++) {
      const d = debData[i];
      d.p.z += d.speed * dt;
      if (d.p.z > 900) { d.p.z -= 1800; d.p.x = (Math.random() - 0.5) * 900; d.p.y = (Math.random() - 0.5) * 500; }
      arr[i * 6] = d.p.x; arr[i * 6 + 1] = d.p.y; arr[i * 6 + 2] = d.p.z;
      arr[i * 6 + 3] = d.p.x; arr[i * 6 + 4] = d.p.y; arr[i * 6 + 5] = d.p.z - d.len;
    }
    debGeo.attributes.position.needsUpdate = true;
  }

  /** Deterministic reset so screenshots are reproducible. */
  function seek(t) {
    lastT = t - 1 / 60;
    const debSeed2 = mulberry32(555);
    for (let i = 0; i < DEB; i++) {
      const d = debData[i];
      d.p.set((debSeed2() - 0.5) * 900, (debSeed2() - 0.5) * 500, (debSeed2() - 0.5) * 1400);
      debSeed2(); debSeed2();
    }
  }

  return { scene, camera, update, seek, sunDir: SUN_DIR, planetGroup, PLANET_PERIOD };
}
