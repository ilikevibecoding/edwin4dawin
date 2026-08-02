import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { SW } from '../lego/palette.js';

/*
 * Deep space.
 *
 * Nothing here is brick built — it is the void the bricks hang in. Everything
 * is generated: the star sphere is a single Points draw, the nebulae are a
 * handful of additive quads painted into canvases, and the planet's surface is
 * banded noise rasterised once at build time.
 *
 * All of it is deliberately cheap. These pieces sit behind every space shot and
 * the film renders on a software rasteriser.
 */

// ------------------------------------------------------------- procedural --

/** Wrapping value-noise lattice. */
function lattice(rng, n) {
  const a = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) a[i] = rng.next();
  return a;
}

function sampleLattice(a, n, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const x0 = ((xi % n) + n) % n;
  const x1 = (x0 + 1) % n;
  const y0 = ((yi % n) + n) % n;
  const y1 = (y0 + 1) % n;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const t = a[y0 * n + x0] * (1 - sx) + a[y0 * n + x1] * sx;
  const b = a[y1 * n + x0] * (1 - sx) + a[y1 * n + x1] * sx;
  return t * (1 - sy) + b * sy;
}

const texCache = new Map();
function canvasTexture(key, w, h, draw) {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  texCache.set(key, t);
  return t;
}

// ------------------------------------------------------------- starfield --

const STAR_VERT = /* glsl */`
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale;
  }
`;

const STAR_FRAG = /* glsl */`
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    float a = smoothstep(0.25, 0.015, r2);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/**
 * Deep star sphere. One Points draw call, varied sizes and colour temperatures
 * with a scatter of much brighter stars.
 *
 * userData.update(t, dt)      very slow parallax drift
 * userData.setDensity(0..1)   thins the field (draw range), for busy shots
 * userData.setScale(s)        point size multiplier
 */
export function buildStarfield({ count = 3000, radius = 1400, seed = 'starfield', scale = 1 } = {}) {
  const rng = makeRng(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const p = { x: 0, y: 0, z: 0 };
  // Rough stellar classes: white, blue-white, warm yellow, orange.
  const tints = [
    [1.00, 0.99, 0.96], [0.80, 0.87, 1.00], [1.00, 0.92, 0.78],
    [0.90, 0.94, 1.00], [1.00, 0.82, 0.66], [1.00, 1.00, 1.00],
  ];
  for (let i = 0; i < count; i++) {
    rng.onSphere(radius * rng.range(0.82, 1.0), p);
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;

    const roll = rng.next();
    let mag;
    if (roll > 0.988) { siz[i] = rng.range(4.6, 7.0); mag = 1.0; }
    else if (roll > 0.93) { siz[i] = rng.range(2.6, 3.8); mag = rng.range(0.68, 0.94); }
    else if (roll > 0.7) { siz[i] = rng.range(1.7, 2.5); mag = rng.range(0.38, 0.66); }
    else { siz[i] = rng.range(1.0, 1.7); mag = rng.range(0.16, 0.42); }

    const t = tints[rng.int(0, tints.length - 1)];
    col[i * 3] = t[0] * mag;
    col[i * 3 + 1] = t[1] * mag;
    col[i * 3 + 2] = t[2] * mag;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);

  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: scale } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'stars';
  points.frustumCulled = false;
  points.renderOrder = -100;

  const g = new THREE.Group();
  g.name = 'starfield';
  g.add(points);
  g.userData.points3d = points;
  g.userData.count = count;
  g.userData.update = (t) => {
    g.rotation.y = t * 0.0035;
    g.rotation.x = Math.sin(t * 0.0021) * 0.02;
  };
  g.userData.setDensity = (f) => {
    geo.setDrawRange(0, Math.max(1, Math.floor(count * THREE.MathUtils.clamp(f, 0, 1))));
  };
  g.userData.setScale = (s) => { mat.uniforms.uScale.value = s; };
  return g;
}

// ---------------------------------------------------------------- nebula --

function nebulaTexture(seed, tint) {
  return canvasTexture(`nebula-${seed}-${tint}`, 256, 256, (g, w, h) => {
    const rng = makeRng(`nebula-tex-${seed}`);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const x = rng.range(0.2, 0.8) * w;
      const y = rng.range(0.2, 0.8) * h;
      const r = rng.range(0.12, 0.42) * w;
      const a = rng.range(0.03, 0.10);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${tint}, ${a.toFixed(3)})`);
      grad.addColorStop(0.45, `rgba(${tint}, ${(a * 0.4).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${tint}, 0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Fade the border so the quad edge never shows.
    g.globalCompositeOperation = 'destination-in';
    const vign = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    vign.addColorStop(0, 'rgba(0,0,0,1)');
    vign.addColorStop(0.30, 'rgba(0,0,0,0.78)');
    vign.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vign;
    g.fillRect(0, 0, w, h);
  });
}

/**
 * A few very large soft quads that put faint colour in the void. Deep blue and
 * violet by default, always subtle — they should read as a tint, never as a
 * shape. Additive and depth-write free, so they never occlude a ship.
 */
export function buildNebula({
  count = 5, radius = 900, seed = 'nebula', opacity = 0.24,
  tints = ['70,110,220', '130,90,210', '60,150,210', '90,80,190'],
} = {}) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.name = 'nebula';
  for (let i = 0; i < count; i++) {
    const tint = tints[i % tints.length];
    const tex = nebulaTexture(i % 3, tint);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: opacity * rng.range(0.45, 1.0),
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
      side: THREE.DoubleSide, fog: false,
    });
    const size = radius * rng.range(0.9, 1.9);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * rng.range(0.6, 1.0)), mat);
    const a = (i / count) * Math.PI * 2 + rng.range(-0.5, 0.5);
    const y = rng.range(-0.45, 0.45);
    m.position.set(Math.cos(a) * radius, y * radius, Math.sin(a) * radius);
    m.lookAt(0, 0, 0);
    m.rotation.z = rng.range(0, Math.PI * 2);
    m.renderOrder = -90;
    m.frustumCulled = false;
    g.add(m);
  }
  g.userData.update = (t) => { g.rotation.y = t * 0.002; };
  return g;
}

// ------------------------------------------------------------ the planet --

function planetTexture(seed, w = 1024, h = 512) {
  return canvasTexture(`planet-${seed}`, w, h, (g) => {
    const rng = makeRng(`planet-${seed}`);
    const nA = lattice(rng, 16);
    const nB = lattice(rng, 48);
    const nC = lattice(rng, 128);
    const nBand = lattice(rng, 8);
    const img = g.createImageData(w, h);
    const d = img.data;
    // Ochre ramp, dark sand through bleached crest.
    const stops = [
      [0.00, 142, 98, 54], [0.26, 180, 133, 76], [0.46, 208, 166, 104],
      [0.66, 228, 194, 138], [0.84, 241, 217, 172], [1.00, 250, 238, 211],
    ];
    const ramp = (v) => {
      let i = 0;
      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
      const a = stops[i];
      const b = stops[i + 1];
      const f = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0])));
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    };
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = (v - 0.5) * Math.PI;
      // Latitude banding: broad climate belts plus a slow wobble.
      const band = 0.52
        + 0.21 * Math.sin(lat * 6.5 + 0.7)
        + 0.11 * Math.sin(lat * 15.0 + 2.1)
        + 0.12 * (sampleLattice(nBand, 8, 1.7, v * 8) - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const n = sampleLattice(nA, 16, u * 16, v * 16) * 0.42
          + sampleLattice(nB, 48, u * 48, v * 48) * 0.36
          + sampleLattice(nC, 128, u * 128, v * 128) * 0.22;
        // Streak the noise along latitude so the bands read as wind-blown.
        const streak = sampleLattice(nB, 48, u * 48, v * 140) * 0.18;
        let val = band + (n - 0.5) * 0.3 + (streak - 0.09) * 0.42;
        // Bleached poles.
        const pole = Math.max(0, Math.abs(v - 0.5) * 2 - 0.74) / 0.26;
        val = val * (1 - pole) + (0.9 + n * 0.1) * pole;
        val = Math.min(1, Math.max(0, val));
        const c = ramp(val);
        // Dark basins from the coarsest octave.
        const basin = Math.max(0, 0.3 - sampleLattice(nA, 16, u * 16 + 5.5, v * 16 + 2.5)) * 0.65;
        const i4 = (y * w + x) * 4;
        d[i4] = c[0] * (1 - basin * 0.42);
        d[i4 + 1] = c[1] * (1 - basin * 0.5);
        d[i4 + 2] = c[2] * (1 - basin * 0.6);
        d[i4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

const PLANET_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const PLANET_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uSun;
  uniform vec3 uRim;
  uniform float uAmbient;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 base = texture2D(uMap, vUv).rgb;
    vec3 N = normalize(vN);
    vec3 S = normalize(uSun);
    // Soft terminator with a hint of warm scatter just before the night side.
    float ndl = dot(N, S);
    float day = smoothstep(-0.16, 0.46, ndl);
    float dusk = smoothstep(-0.28, 0.08, ndl) * (1.0 - smoothstep(0.06, 0.44, ndl));
    vec3 col = base * (uAmbient + day * 1.02);
    col += base * uRim * dusk * 0.22;
    // Limb brightening on the sunlit edge.
    vec3 V = normalize(cameraPosition - vW);
    float limb = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.4);
    col += uRim * limb * day * 0.22;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */`
  uniform vec3 uSun;
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float f = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 3.1);
    float sun = clamp(dot(N, normalize(uSun)) * 0.85 + 0.42, 0.0, 1.0);
    gl_FragColor = vec4(uColor * f * sun * uStrength, 1.0);
  }
`;

/**
 * Tatooine from orbit: banded ochre desert, a soft terminator and a warm
 * atmospheric rim.
 *
 * userData.update(t, dt)     slow axial rotation
 * userData.setSun(x, y, z)   world-space direction the sunlight comes FROM
 * userData.radius
 */
export function buildTatooinePlanet({
  radius = 200, seed = 'tatooine', seg = 48, tilt = 0.2, spin = 0.006,
} = {}) {
  const g = new THREE.Group();
  g.name = 'tatooine-planet';

  const uSun = { value: new THREE.Vector3(0.66, 0.45, -0.66).normalize() };
  const surfaceMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: planetTexture(seed) },
      uSun,
      uRim: { value: new THREE.Color(SW.sunOrange) },
      uAmbient: { value: 0.06 },
    },
    vertexShader: PLANET_VERT,
    fragmentShader: PLANET_FRAG,
  });
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uSun,
      uColor: { value: new THREE.Color(0xffbe80) },
      uStrength: { value: 0.8 },
    },
    vertexShader: PLANET_VERT,
    fragmentShader: ATMO_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, seg, seg >> 1), surfaceMat);
  ball.name = 'surface';
  const spinner = new THREE.Group();
  spinner.add(ball);
  spinner.rotation.z = tilt;
  g.add(spinner);

  const atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 40, 20), atmoMat);
  atmo.name = 'atmosphere';
  atmo.renderOrder = 2;
  g.add(atmo);

  g.userData.radius = radius;
  g.userData.surface = ball;
  g.userData.atmosphere = atmo;
  g.userData.update = (t) => { ball.rotation.y = t * spin; };
  g.userData.setSun = (x, y, z) => {
    if (x && x.isVector3) uSun.value.copy(x).normalize();
    else uSun.value.set(x, y, z).normalize();
  };
  return g;
}

// ------------------------------------------------------------- twin suns --

function discTexture(key, inner, outer, power) {
  return canvasTexture(key, 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const a = Math.pow(1 - t, power);
      const c = [
        Math.round(inner[0] + (outer[0] - inner[0]) * t),
        Math.round(inner[1] + (outer[1] - inner[1]) * t),
        Math.round(inner[2] + (outer[2] - inner[2]) * t),
      ];
      grad.addColorStop(t, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`);
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function sunSprite(size, tex, opacity, order) {
  const mat = new THREE.SpriteMaterial({
    map: tex, color: 0xffffff, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.renderOrder = order;
  return s;
}

/**
 * The two suns of Tatooine: billboarded discs with a halo and a faint flare.
 * The caller positions the group; the suns sit either side of its origin.
 *
 * userData.suns = [sunA, sunB]        Object3Ds, move them to re-aim
 * userData.points = { sunA, sunB }    local positions
 * userData.update(t, dt)              lazy shimmer
 */
export function buildTwinSuns({
  separation = 20, size = 9, tilt = 0.42, seed = 'twin-suns',
  colorA = [255, 246, 222], colorB = [255, 206, 150],
} = {}) {
  const g = new THREE.Group();
  g.name = 'twin-suns';
  const rng = makeRng(seed);
  const core = discTexture('sun-core', [255, 255, 252], [255, 226, 168], 1.8);
  const haloA = discTexture('sun-halo-a', colorA, [255, 150, 60], 2.9);
  const haloB = discTexture('sun-halo-b', colorB, [232, 110, 40], 3.2);
  const streak = discTexture('sun-streak', [255, 236, 200], [255, 150, 70], 2.2);

  const suns = [];
  const spec = [
    { s: 1.0, halo: haloA, x: -separation / 2, y: 0 },
    { s: 0.74, halo: haloB, x: separation / 2, y: -separation * Math.tan(tilt) * 0.5 },
  ];
  for (let i = 0; i < spec.length; i++) {
    const o = spec[i];
    const sun = new THREE.Group();
    sun.position.set(o.x, o.y, 0);
    const glowSize = size * o.s;
    const flare = sunSprite(glowSize * 5.2, o.halo, 0.30, 6);
    const halo = sunSprite(glowSize * 2.5, o.halo, 0.55, 7);
    const disc = sunSprite(glowSize, core, 0.98, 8);
    const bar = sunSprite(glowSize * 7.4, streak, 0.10, 5);
    bar.scale.set(glowSize * 7.4, glowSize * 0.5, 1);
    sun.add(flare, bar, halo, disc);
    sun.userData.halo = halo;
    sun.userData.flare = flare;
    sun.userData.base = glowSize;
    g.add(sun);
    suns.push(sun);
  }

  const ph = [rng.range(0, 6.28), rng.range(0, 6.28)];
  g.userData.suns = suns;
  g.userData.points = {
    sunA: suns[0].position.clone(),
    sunB: suns[1].position.clone(),
  };
  g.userData.update = (t) => {
    for (let i = 0; i < suns.length; i++) {
      const s = suns[i];
      const b = s.userData.base;
      const k = 1 + 0.035 * Math.sin(t * 0.7 + ph[i]) + 0.02 * Math.sin(t * 1.9 + ph[i] * 2);
      s.userData.halo.scale.set(b * 2.5 * k, b * 2.5 * k, 1);
      s.userData.flare.material.opacity = 0.30 + 0.05 * Math.sin(t * 0.53 + ph[i]);
    }
  };
  return g;
}

// -------------------------------------------------------------- lighting --

/**
 * Lighting rig for a space shot: one hard key, a dim cold fill, a rim to peel
 * hulls off the black, and a whisper of bounce. No ambient wash — space is a
 * one-light environment and the contrast is the point.
 *
 * Lights, by name: 'key' (warm sun, casts shadows), 'fill' (dim blue),
 * 'rim' (cold backlight), 'bounce' (very dim underlight).
 * Passing a scene adds the rig to it as a convenience; the group is returned
 * either way.
 */
export function buildSpaceLighting(scene, { keyIntensity = 3.0, shadowRadius = 90 } = {}) {
  const g = new THREE.Group();
  g.name = 'space-lighting';

  const key = new THREE.DirectionalLight(0xfff2dc, keyIntensity);
  key.name = 'key';
  key.position.set(60, 34, 44);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = shadowRadius * 6;
  key.shadow.camera.left = -shadowRadius;
  key.shadow.camera.right = shadowRadius;
  key.shadow.camera.top = shadowRadius;
  key.shadow.camera.bottom = -shadowRadius;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.04;

  const fill = new THREE.DirectionalLight(0x3d5f9e, 0.42);
  fill.name = 'fill';
  fill.position.set(-70, -16, -26);

  const rim = new THREE.DirectionalLight(0xa8ccff, 1.05);
  rim.name = 'rim';
  rim.position.set(-34, 16, -80);

  const bounce = new THREE.DirectionalLight(0x1d2a44, 0.2);
  bounce.name = 'bounce';
  bounce.position.set(6, -46, 10);

  g.add(key, fill, rim, bounce);
  g.userData.lights = { key, fill, rim, bounce };
  if (scene && scene.isObject3D) scene.add(g);
  return g;
}

// -------------------------------------------------------------- exhibits --

export const EXHIBITS = {
  starfield: () => buildStarfield(),
  nebula: () => {
    const g = new THREE.Group();
    g.add(buildStarfield({ count: 1800, radius: 1200 }));
    g.add(buildNebula({ radius: 700 }));
    return g;
  },
  'tatooine-planet': () => buildTatooinePlanet({ radius: 100 }),
  'twin-suns': () => buildTwinSuns(),
  space: () => {
    const g = new THREE.Group();
    g.add(buildStarfield({ count: 2400, radius: 1200 }));
    g.add(buildNebula({ radius: 760 }));
    const planet = buildTatooinePlanet({ radius: 100 });
    planet.position.set(58, -30, -160);
    g.add(planet);
    g.add(buildSpaceLighting());
    return g;
  },
};
