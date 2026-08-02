/**
 * 00 — A LONG TIME AGO
 *
 * The opening title sequence, in four beats:
 *
 *   1. black -> starfield, and the blue title line fades up and away
 *   2. the BRICK WARS logo slams in and recedes toward the vanishing point
 *   3. the yellow crawl climbs away on a plane tilted back from the camera
 *   4. the camera tilts down off the crawl onto a rust-orange planet, a moon
 *      and two tiny ships — the chase that opens the next scene
 *
 * Everything is a pure function of t. The only randomness is seeded hash noise
 * evaluated once at build time (the planet texture), never inside update().
 *
 * GEOMETRY OF THE CRAWL
 * ---------------------
 * The camera sits at the origin looking slightly up. The text lives on a plane
 * rotated back about x by TILT, anchored below and in front of the camera, so
 * the plane's own +y axis climbs away from the lens at (90 - TILT) degrees of
 * elevation and every vertical edge converges on a single vanishing point near
 * the top of frame. Scrolling is a translation of the text along that local +y
 * axis; distance does the rest. The far end is dissolved by a distance fade in
 * the text material so the crawl melts into the stars instead of popping out.
 */
import * as THREE from 'three';
import { Starfield, glowSprite } from '../engine/fx.js';
import { makeTextTexture, FONT_STACK } from '../engine/overlay.js';
import { extrudeSVG } from '../engine/svg.js';
import { Bricks } from '../engine/brick.js';
import { COLORS } from '../engine/palette.js';
import { hash11, fbm1 } from '../engine/rng.js';
import * as ease from '../engine/ease.js';
import { CRAWL_TEXT, CRAWL_HEADING } from '../story/script.js';

export const meta = { id: 'crawl', title: 'A Long Time Ago', duration: 46, letterbox: 0, hardCutIn: true };

const RAD = Math.PI / 180;

// --- camera --------------------------------------------------------------
const FOV_CRAWL = 56; // wide enough for the crawl to converge inside the frame
const FOV_END = 36; // slow push in on the planet
const PITCH_CRAWL = 4 * RAD; // the lens looks a little above the horizon
const PITCH_END = -27 * RAD;

// --- crawl plane ---------------------------------------------------------
const TILT = 63 * RAD; // plane rotation.x = -TILT  => vanishing point 27 deg up
const CRAWL_ORIGIN = [0, -9, -13]; // where the plane's local origin sits
const CRAWL_W = 26; // world width of the text panels
const TEX_W = 2048; // text texture width in pixels
const BODY_PX = 92; // body font size
const BODY_LH = 1.34;
const BODY_PAD = 48;
const HEAD_PX = 104; // "EPISODE I / THE STOLEN PLANS"
const HEAD_LH = 1.3;
const HEAD_PAD = 40;
const CRAWL_YELLOW = '#f2cd37';
// Plane-local height at which each paragraph should read biggest. They climb
// so the crawl decelerates gently instead of lurching: the first paragraph is
// caught low and large, the last one is already on its way out.
const PROMINENT_Y = [7.5, 11.0, 15.5];
const FADE_NEAR = 33; // distance where the crawl starts dissolving
const FADE_FAR = 70; // distance where it is gone (~73% up the frame)
// Bloom threshold is 0.6 and #f2cd37 sits just above it. Knocking the panel
// back a few percent keeps a warm halo on the letters without the whole lower
// frame turning into a yellow wash.
const CRAWL_LEVEL = 0xe2e2e2;

// --- reveal --------------------------------------------------------------
const PLANET_R = 44;
const PLANET_DIST = 680;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Spherical placement: azimuth/elevation in degrees, looking down -z. */
function polar(azDeg, elDeg, dist) {
  const az = azDeg * RAD;
  const el = elDeg * RAD;
  const h = Math.cos(el) * dist;
  return new THREE.Vector3(h * Math.sin(az), dist * Math.sin(el), -h * Math.cos(az));
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson).
 *
 * The crawl has to hit four timing marks taken from the narration, but a
 * piecewise-linear scroll would visibly change speed at each mark. This keeps
 * the velocity continuous and never overshoots (the crawl can only ever climb).
 */
function monoSpline(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (x - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] +
      (u3 - 2 * u2 + u) * h * m[i] +
      (-2 * u3 + 3 * u2) * ys[i + 1] +
      (u3 - u2) * h * m[i + 1]
    );
  };
}

/**
 * Plane-local y at which the crawl plane crosses a given ndc height.
 * Used to place the content so it enters exactly at the bottom of frame.
 */
function planeYAtNdc(ndcY) {
  const k = Math.tan((FOV_CRAWL * RAD) / 2);
  const cp = Math.cos(PITCH_CRAWL);
  const sp = Math.sin(PITCH_CRAWL);
  const A = cp - ndcY * k * sp;
  const B = sp + ndcY * k * cp;
  const c = Math.cos(TILT);
  const s = Math.sin(TILT);
  return -(CRAWL_ORIGIN[1] * A + CRAWL_ORIGIN[2] * B) / (c * A - s * B);
}

/** Unlit, camera-facing text panel sized from its own texture. */
function textPanel(texture, width, texW, texH, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: opts.opacity ?? 1,
    depthWrite: false,
    toneMapped: false,
    color: opts.tint ?? 0xffffff,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, (width * texH) / texW), mat);
}

/** Text texture at crawl quality: crisp, mip-mapped, heavily anisotropic. */
function crawlText(opts) {
  const r = makeTextTexture(opts);
  r.texture.anisotropy = 16;
  r.texture.minFilter = THREE.LinearMipmapLinearFilter;
  r.texture.generateMipmaps = true;
  r.texture.needsUpdate = true;
  return r;
}

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------

/**
 * Dim equirect environment so the gold logo has something to reflect.
 * Without it a metalness ~1 material renders almost black.
 */
function envTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#04060b';
  g.fillRect(0, 0, 512, 256);
  const warm = g.createRadialGradient(150, 60, 0, 150, 60, 230);
  warm.addColorStop(0, '#cfae7d');
  warm.addColorStop(0.34, '#6d4f26');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = warm;
  g.fillRect(0, 0, 512, 256);
  const cool = g.createRadialGradient(400, 170, 0, 400, 170, 230);
  cool.addColorStop(0, '#3a6ea8');
  cool.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = cool;
  g.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Banded rust/tan planet skin. Seeded at build time, never at update time. */
function planetTexture() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);

  // Latitude band profile, precomputed so the per-pixel loop stays cheap.
  const N = 4096;
  const lut = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const lat = i / N;
    lut[i] = fbm1(lat * 21, 4, 3) * 0.72 + fbm1(lat * 94, 2, 9) * 0.28;
  }

  // rust -> orange -> tan ramp
  const stops = [
    [0.0, 88, 41, 22],
    [0.35, 158, 76, 30],
    [0.58, 205, 116, 44],
    [0.78, 222, 160, 88],
    [1.0, 240, 212, 162],
  ];
  const ramp = (k) => {
    for (let i = 1; i < stops.length; i++) {
      if (k <= stops[i][0] || i === stops.length - 1) {
        const a = stops[i - 1];
        const b = stops[i];
        const u = Math.min(1, Math.max(0, (k - a[0]) / (b[0] - a[0])));
        return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
      }
    }
    return [0, 0, 0];
  };

  const TAU = Math.PI * 2;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    // polar caps: pale and washed out
    const cap = Math.max(0, 1 - Math.min(v, 1 - v) / 0.085);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // swirl the bands so they are not dead straight
      const warp =
        0.011 * Math.sin(u * TAU * 3 + v * 8.0) +
        0.006 * Math.sin(u * TAU * 7 - v * 19.0) +
        0.004 * Math.sin(u * TAU * 13 + v * 4.0);
      let k = lut[Math.min(N - 1, Math.max(0, Math.round((v + warp) * N)))];
      k += (hash11(y * W + x, 17) - 0.5) * 0.07;
      k = Math.min(1, Math.max(0, k));
      let [r, g, b] = ramp(k);
      if (cap > 0) {
        const t = cap * 0.75;
        r += (226 - r) * t;
        g += (208 - g) * t;
        b += (186 - b) * t;
      }
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Cratered grey moon skin. */
function moonTexture() {
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#8d8b86';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 700; i++) {
    const x = hash11(i, 41) * W;
    const y = hash11(i, 42) * H;
    const r = 1 + Math.pow(hash11(i, 43), 3) * 16;
    const shade = 0.62 + hash11(i, 44) * 0.5;
    g.fillStyle = `rgba(${Math.round(150 * shade)},${Math.round(146 * shade)},${Math.round(138 * shade)},0.55)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Additive fresnel shell: a lit atmosphere rim around a planet. */
function atmosphereMaterial(color, sunDir, power = 3.0, gain = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSun: { value: sunDir.clone().normalize() },
      uGain: { value: gain },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNv; varying vec3 vNw; varying vec3 vP;
      void main() {
        vNv = normalize(normalMatrix * normal);
        vNw = normalize(mat3(modelMatrix) * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uSun; uniform float uGain; uniform float uPower;
      varying vec3 vNv; varying vec3 vNw; varying vec3 vP;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vNv), normalize(-vP))), uPower);
        float lit = clamp(dot(normalize(vNw), uSun) * 0.5 + 0.55, 0.0, 1.0);
        lit = pow(lit, 1.7);
        float a = fres * lit * uGain;
        gl_FragColor = vec4(uColor * (0.4 + lit * 1.5), a);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(FOV_CRAWL, ctx.aspect, 0.5, 6000);
  camera.rotation.order = 'YXZ';
  scene.add(camera); // the title card hangs off the camera

  scene.environment = envTexture();

  // ---- beat times, taken from the real narration timings ------------------
  const at = (i, t, dur) => {
    const l = ctx.lines?.[i];
    const t0 = l ? l.local : t;
    return { t0, t1: t0 + (l ? l.dur : dur) };
  };
  const L0 = at(0, 2.2, 3.92); // "A long time ago, in a galaxy far, far away..."
  const L1 = at(1, 9.0, 8.31); // crawl paragraph 1
  const L2 = at(2, 18.01, 10.19); // crawl paragraph 2
  const L3 = at(3, 28.9, 7.76); // crawl paragraph 3

  const T = {
    starsUp: [0.7, 3.8],
    cardIn: [L0.t0 - 0.75, L0.t0 + 0.6],
    cardOut: [L0.t1 + 0.5, L0.t1 + 1.55],
    logoIn: L0.t1 + 1.4, // ~7.5  slam
    logoHold: L0.t1 + 2.2, // ~8.3  settled, starts falling away
    logoSmall: L0.t1 + 4.6, // ~10.7 shrink is essentially done
    logoGone: L0.t1 + 7.4, // ~13.5 faded out, comfortably before 15
    // The crawl heading also reads THE STOLEN PLANS, so it must not enter the
    // frame while the title's subtitle is still down there.
    crawlStart: L1.t0 - 1.0, // ~8.0  content edge just below the frame
    p1: L1.t0 + 4.9, // ~13.9
    p2: L2.t0 + 4.0, // ~22.0
    p3: L3.t0 + 3.0, // ~31.9
    crawlExit: L3.t1 + 0.95, // ~37.6 last line has climbed away
    dissolve: [L3.t1 - 0.95, L3.t1 + 1.55], // ~35.7 -> 38.2
    tilt: [L3.t1 + 0.25, L3.t1 + 5.75], // ~36.9 -> 42.4
  };
  const END = ctx.duration;

  // ---- lighting -----------------------------------------------------------
  // Two rigs share the scene: a title rig for the gold logo (up to ~13.5s) and
  // a sun for the planet reveal (from ~37s). Intensities are keyed off t so
  // they never light each other's beat.
  const ambient = new THREE.HemisphereLight(0x5b7ba8, 0x0a0d14, 0.35);
  scene.add(ambient);

  const logoKey = new THREE.DirectionalLight(0xfff2d8, 2.5);
  logoKey.position.set(26, 34, 40);
  const logoRim = new THREE.DirectionalLight(0xffc06a, 3.2);
  logoRim.position.set(-40, 26, -34);
  const logoFill = new THREE.DirectionalLight(0x88b6ff, 0.8);
  logoFill.position.set(-18, -14, 30);
  scene.add(logoKey, logoRim, logoFill);

  // Raking light from the left: a crescent on the planet, a hard edge on the
  // ships. The fill is kept low so the planet's night side stays night.
  const sunDir = new THREE.Vector3(-0.963, 0.166, -0.213).normalize();
  const sun = new THREE.DirectionalLight(0xfff1de, 0);
  sun.position.copy(sunDir).multiplyScalar(1500);
  const sunFill = new THREE.DirectionalLight(0x93b4e6, 0);
  sunFill.position.set(150, 180, 500);
  scene.add(sun, sunFill);

  // Everything belonging to the final reveal lives here. The crawl camera is
  // wide enough to catch objects a long way below the lens axis, so the group
  // is not merely unlit during the crawl — it is faded out entirely, otherwise
  // an unlit moon would sit in the corner of frame quietly eating stars.
  const revealRoot = new THREE.Group();
  revealRoot.visible = false;
  scene.add(revealRoot);
  const revealMats = []; // surfaces: plain opacity
  const revealGains = []; // additive shells and sprites: scaled by their own gain

  /** Register everything under `obj` with the reveal fade. */
  function fadeWithReveal(obj) {
    obj.traverse((o) => {
      const m = o.material;
      if (!m) return;
      if (m.uniforms?.uGain) {
        const g0 = m.uniforms.uGain.value;
        revealGains.push({ set: (a) => (m.uniforms.uGain.value = g0 * a) });
      } else if (o.isSprite) {
        const o0 = m.opacity;
        revealGains.push({ set: (a) => (m.opacity = o0 * a) });
      } else {
        m.transparent = true;
        revealMats.push(m);
      }
    });
  }

  // =========================================================================
  // buildStars — two shells at different radii, counter-drifting for parallax
  // =========================================================================
  function buildStars() {
    const near = new Starfield({ count: 3800, radius: 1300, seed: 7, sizeMin: 2.0, sizeMax: 7.2 });
    const far = new Starfield({ count: 3200, radius: 2600, seed: 61, sizeMin: 3.0, sizeMax: 9.5 });
    scene.add(near.object, far.object);
    return {
      update(t, a) {
        near.update(t);
        far.update(t);
        near.object.rotation.y = t * 0.0042;
        far.object.rotation.y = -t * 0.0016;
        near.opacity = a;
        far.opacity = a * 0.85;
      },
    };
  }

  // =========================================================================
  // buildCard — "A long time ago, in a galaxy far, far away...."
  // =========================================================================
  function buildCard() {
    const W = 2048;
    const H = 320;
    const { texture } = crawlText({
      text: 'A long time ago, in a galaxy far,\nfar away....',
      width: W,
      height: H,
      font: `600 84px ${FONT_STACK}`,
      color: '#a9cdf5',
      align: 'center',
      outline: 0,
      shadow: 26,
      shadowColor: 'rgba(30,70,140,0.55)',
      letterSpacing: 2,
      padding: 40,
    });
    const panel = textPanel(texture, 17.4, W, H, { opacity: 0 });
    panel.position.set(0, 0.6, -14);
    panel.renderOrder = 4;
    camera.add(panel);
    return panel;
  }

  // =========================================================================
  // buildLogo — episode plate + extruded gold logo + subtitle, receding
  // =========================================================================
  async function buildLogo() {
    const group = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({
      color: 0xd7a63f,
      metalness: 0.92,
      roughness: 0.32,
      envMapIntensity: 1.25,
      emissive: 0x180e02,
      emissiveIntensity: 1,
    });
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xe8d9a6,
      metalness: 0.72,
      roughness: 0.32,
      envMapIntensity: 1.3,
    });

    /** extrudeSVG with a flat-text fallback: the art may still be in flight. */
    async function art(url, svgOpts, fallback) {
      try {
        const g = await extrudeSVG(url, svgOpts);
        const s = g.userData.svgSize;
        if (!s || !isFinite(s.x) || s.x <= 0) throw new Error('empty svg');
        return g;
      } catch (e) {
        console.warn(`[crawl] ${url} unavailable (${e.message}) — using text fallback`);
        const { texture } = crawlText({
          text: fallback.text,
          width: 2048,
          height: fallback.texH,
          font: fallback.font,
          color: fallback.color,
          letterSpacing: fallback.letterSpacing ?? 10,
          outline: 6,
          outlineColor: 'rgba(60,38,4,0.9)',
          shadow: 20,
          shadowColor: 'rgba(0,0,0,0.6)',
          padding: 30,
        });
        return textPanel(texture, fallback.width, 2048, fallback.texH);
      }
    }

    const logo = await art(
      'svg/logo-brickwars.svg',
      { depth: 74, size: 40, bevel: true, bevelSize: 4, bevelThickness: 6, curveSegments: 8, material: gold },
      { text: 'BRICK WARS', texH: 512, font: `800 300px ${FONT_STACK}`, color: '#e8bf59', width: 40 }
    );
    logo.position.y = 0;
    group.add(logo);

    const plate = await art(
      'svg/episode-plate.svg',
      { depth: 30, size: 21, bevel: true, bevelSize: 2, bevelThickness: 3, curveSegments: 8, material: plateMat },
      { text: 'EPISODE ONE', texH: 256, font: `700 150px ${FONT_STACK}`, color: '#e8d9a6', width: 21 }
    );
    plate.position.y = 12.2;
    group.add(plate);

    const subH = 220;
    const { texture: subTex } = crawlText({
      text: 'THE STOLEN PLANS',
      width: 2048,
      height: subH,
      font: `700 118px ${FONT_STACK}`,
      color: '#efe2b4',
      letterSpacing: 26,
      outline: 0,
      shadow: 18,
      shadowColor: 'rgba(0,0,0,0.7)',
      padding: 30,
    });
    const sub = textPanel(subTex, 27, 2048, subH);
    sub.position.y = -12.8;
    group.add(sub);

    group.visible = false;
    scene.add(group);

    // Everything the recede touches, so opacity can be driven as one.
    const mats = [];
    group.traverse((o) => {
      if (o.material) mats.push(o.material);
    });
    for (const m of mats) {
      m.transparent = true;
      m.depthWrite = m.depthWrite ?? true;
    }

    const camDir = new THREE.Vector3(0, Math.sin(PITCH_CRAWL), -Math.cos(PITCH_CRAWL));
    const D0 = 31; // slam distance — fills the frame
    const D1 = 250; // end of the fast fall-away
    const D2 = 760; // a distant speck by the time it fades

    return {
      group,
      update(t) {
        const vis = t >= T.logoIn - 0.05 && t <= T.logoGone + 0.3;
        group.visible = vis;
        if (!vis) return;
        // Distance is interpolated in log space so the logo shrinks at a
        // steady *rate* rather than easing to a halt. Two segments: a hard
        // fall-away that clears the frame, then a slow drift to the vanishing
        // point while the crawl takes over.
        let d;
        if (t < T.logoHold) {
          d = ease.lerp(D0 * 0.7, D0, ease.outQuint(ease.range(t, T.logoIn, T.logoHold)));
        } else if (t < T.logoSmall) {
          d = D0 * Math.pow(D1 / D0, ease.range(t, T.logoHold, T.logoSmall));
        } else {
          d = D1 * Math.pow(D2 / D1, ease.smooth(ease.range(t, T.logoSmall, T.logoGone)));
        }
        const pos = camDir.clone().multiplyScalar(d);
        pos.y += (d - D0) * 0.45; // drift toward the crawl's vanishing point
        group.position.copy(pos);
        group.lookAt(0, 0, 0); // faces of the extrusion are on +z, so this is front-on

        const a =
          Math.min(1, ease.range(t, T.logoIn, T.logoIn + 0.12)) *
          (1 - ease.smooth(ease.range(t, T.logoGone - 2.4, T.logoGone)));
        for (const m of mats) m.opacity = a;
      },
    };
  }

  // =========================================================================
  // buildCrawl — heading + paragraphs on the tilted plane
  // =========================================================================
  function buildCrawl() {
    const px = CRAWL_W / TEX_W; // world units per texture pixel

    const bodyFont = `700 ${BODY_PX}px ${FONT_STACK}`;
    const bodyOpts = {
      width: TEX_W,
      font: bodyFont,
      color: CRAWL_YELLOW,
      align: 'left',
      justify: true,
      lineHeight: BODY_LH,
      padding: BODY_PAD,
      outline: 0,
      shadow: 14,
      shadowColor: 'rgba(0,0,0,0.55)',
    };

    // Measure the wrap of each paragraph so the scroll can be timed to the
    // narration no matter how the text breaks.
    const probe = document.createElement('canvas');
    const paraLines = CRAWL_TEXT.map(
      (p) => makeTextTexture({ ...bodyOpts, text: p, height: 8, canvas: probe }).lines
    );
    const lineCount = paraLines.reduce((a, b) => a + b, 0) + (CRAWL_TEXT.length - 1);
    const lh = BODY_PX * BODY_LH;
    const blockH = lineCount * lh;
    const bodyH = Math.ceil(blockH + BODY_PAD * 2);
    const { texture: bodyTex } = crawlText({ ...bodyOpts, text: CRAWL_TEXT.join('\n\n'), height: bodyH });

    const headH = Math.ceil(2 * HEAD_PX * HEAD_LH + HEAD_PAD * 2);
    const { texture: headTex } = crawlText({
      text: CRAWL_HEADING,
      width: TEX_W,
      height: headH,
      font: `700 ${HEAD_PX}px ${FONT_STACK}`,
      color: CRAWL_YELLOW,
      align: 'center',
      lineHeight: HEAD_LH,
      padding: HEAD_PAD,
      letterSpacing: 12,
      outline: 0,
      shadow: 16,
      shadowColor: 'rgba(0,0,0,0.55)',
    });

    // Distance fade, shared by both panels. Anchored in world space (true
    // distance from the lens) so it stays put while the text scrolls through.
    const fadeU = {
      uFar0: { value: FADE_NEAR },
      uFar1: { value: FADE_FAR },
      uGlobal: { value: 1 },
    };
    // Tone mapping stays ON here: it keeps the yellow just under the bloom
    // threshold, so the crawl glows at the edges instead of washing the frame.
    const panel = (tex, texH) => {
      const m = new THREE.MeshBasicMaterial({ map: tex, color: CRAWL_LEVEL, transparent: true, depthWrite: false });
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, fadeU);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vDist;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvDist = length(mvPosition.xyz);');
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying float vDist;\nuniform float uFar0;\nuniform float uFar1;\nuniform float uGlobal;'
          )
          .replace(
            '#include <dithering_fragment>',
            '#include <dithering_fragment>\ngl_FragColor.a *= uGlobal * (1.0 - smoothstep(uFar0, uFar1, vDist));'
          );
      };
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CRAWL_W, CRAWL_W * (texH / TEX_W), 1, 24), m);
      mesh.renderOrder = 2;
      return mesh;
    };

    const headMesh = panel(headTex, headH);
    const bodyMesh = panel(bodyTex, bodyH);

    // Content hangs downward from y = 0 (its top edge), so the group's y is
    // simply "where the top of the crawl currently is" on the plane.
    const headWorldH = headH * px;
    const bodyWorldH = bodyH * px;
    const gap = 2.0;
    headMesh.position.y = -headWorldH / 2;
    bodyMesh.position.y = -(headWorldH + gap + bodyWorldH / 2);

    const content = new THREE.Group();
    content.add(headMesh, bodyMesh);
    const root = new THREE.Group();
    root.position.set(...CRAWL_ORIGIN);
    root.rotation.x = -TILT;
    root.add(content);
    scene.add(root);

    // Distance from the content's top edge down to each paragraph's centre.
    const top = headWorldH + gap + ((bodyH - blockH) / 2) * px;
    const centres = [];
    let line = 0;
    for (const n of paraLines) {
      centres.push(top + (line + n / 2) * lh * px);
      line += n + 1;
    }
    const contentH = headWorldH + gap + bodyWorldH;

    // Scroll choreography. `content.position.y` is where the top edge of the
    // crawl currently sits on the plane, so putting paragraph i at plane height
    // h means position.y = h + centres[i]. The last key carries the whole block
    // clear of the readable zone so the text climbs away rather than just
    // dimming out in place.
    const yEnter = planeYAtNdc(-1.05); // plane-local y just below the frame
    const keys = [
      [T.crawlStart, yEnter],
      [T.p1, PROMINENT_Y[0] + centres[0]],
      [T.p2, PROMINENT_Y[1] + centres[1]],
      [T.p3, PROMINENT_Y[2] + centres[2]],
      [T.crawlExit, contentH + 22],
    ];
    const scroll = monoSpline(keys);

    return {
      lines: lineCount,
      keys,
      update(t) {
        const on = t >= T.crawlStart - 0.2 && t <= T.dissolve[1] + 0.4;
        root.visible = on;
        if (!on) return;
        content.position.y = scroll(t);
        // The fade horizon sweeps in toward the lens at the end, dissolving the
        // crawl from the top down as the last line of narration lands. Combined
        // with the accelerating scroll, the text is gone by ~38s.
        const d = ease.smooth(ease.range(t, T.dissolve[0], T.dissolve[1]));
        fadeU.uFar0.value = ease.lerp(FADE_NEAR, 13, d);
        fadeU.uFar1.value = ease.lerp(FADE_FAR, 23, d);
      },
    };
  }

  // =========================================================================
  // buildPlanet — rust world, atmosphere shell and a small moon
  // =========================================================================
  function buildPlanet() {
    const group = new THREE.Group();

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_R, 72, 48),
      new THREE.MeshStandardMaterial({ map: planetTexture(), roughness: 0.97, metalness: 0.0, envMapIntensity: 0.06 })
    );
    // The camera looks down on the planet, so tip the pole away: we want the
    // banding to read as latitude bands, not as concentric rings.
    globe.rotation.set(-0.64, 1.1, 0.16);

    const air = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_R * 1.075, 48, 32),
      atmosphereMaterial(0xff9448, sunDir, 2.4, 1.9)
    );

    const planet = new THREE.Group();
    planet.add(globe, air);
    planet.position.copy(polar(-15, -33, PLANET_DIST));
    group.add(planet);

    // High and off to the right: keeps the planet, ships and moon off a single
    // horizontal line so the last frame has a diagonal to read along.
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(12, 36, 24),
      new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1.0, metalness: 0.0, envMapIntensity: 0.06 })
    );
    moon.position.copy(polar(25, -30, 900));
    moon.rotation.set(-0.5, 2.0, 0);
    group.add(moon);

    revealRoot.add(group);
    fadeWithReveal(group);
    return {
      update(t) {
        globe.rotation.y = 1.1 + t * 0.0032; // barely turning, but not frozen
      },
    };
  }

  // =========================================================================
  // buildShips — the corvette running, the destroyer closing behind it
  // =========================================================================
  function buildShips() {
    const W = COLORS.white;
    const G = COLORS.lightBluishGray;
    const DG = COLORS.darkBluishGray;
    const noStud = { studs: false };

    // --- rebel corvette: hammerhead bow, tapering hull, four engines --------
    const cb = new Bricks({ studSegments: 6 });
    cb.panel(-3.4, 0, -12.5, 6.8, 2.4, 3, W, noStud);
    cb.panel(-2.4, 0.6, -11.9, 4.8, 1.2, 1.6, G, noStud);
    cb.panel(-1.1, 0.4, -10.2, 2.2, 4.2, 2.2, G, noStud);
    cb.panel(-2.1, -0.6, -6.4, 4.2, 5.4, 4.4, W, noStud);
    cb.panel(-3, -0.8, -1.6, 6, 5.6, 5.4, W, noStud);
    cb.panel(-2.3, 2.6, 0.4, 4.6, 3.6, 2, G, noStud);
    cb.panel(-3.4, -0.8, 4.2, 6.8, 1.8, 5.6, DG, noStud);
    for (const x of [-2.2, -0.75, 0.75, 2.2]) cb.cyl(x, 0.5, 5.4, 0.66, 2.8, DG, { segments: 8 });
    const corvette = cb.build({ castShadow: false, receiveShadow: false });

    // --- imperial destroyer: stepped grey wedge with a bridge tower ---------
    // Built as slices along z so the plan view is a clean triangle, with a
    // darker ventral hull under it so the silhouette has real thickness when
    // the wedge is rolled toward the light.
    const db = new Bricks({ studSegments: 6 });
    const SEG = 16;
    const LEN = 58;
    const MAXW = 33;
    for (let i = 0; i < SEG; i++) {
      const w = Math.max(2.4, (MAXW * (i + 1.1)) / SEG);
      const z = -LEN / 2 + (LEN / SEG) * i;
      const d = LEN / SEG + 0.04;
      db.panel(-w / 2, 0, z, w, d, 2.6, G, noStud); // dorsal plating
      db.panel(-w * 0.44, -2.4, z, w * 0.88, d, 2.4, DG, noStud); // ventral hull
      // a raised spine and inset trenches so it is not one flat grey slab
      if (i > 3) {
        db.panel(-w * 0.31, 2.6, z, w * 0.62, d, 0.6, DG, noStud);
        db.panel(-w * 0.11, 3.2, z, w * 0.22, d, 0.8, G, noStud);
      }
    }
    // superstructure
    db.panel(-6.2, 3.2, 9.5, 12.4, 12.5, 4.2, G, noStud);
    db.panel(-4.3, 7.4, 13, 8.6, 7.5, 4.2, G, noStud);
    db.panel(-2.5, 11.6, 15.2, 5, 4.2, 3.6, DG, noStud);
    db.sphere(-3.2, 16.6, 16.9, 1.25, DG, { segments: 10 });
    db.sphere(3.2, 16.6, 16.9, 1.25, DG, { segments: 10 });
    // engine block and bells
    db.panel(-9.2, 0.4, 25.6, 18.4, 3.4, 6.8, DG, noStud);
    for (const x of [-6.4, -2.2, 2.2, 6.4]) db.cyl(x, 1.4, 27.5, 1.7, 4.6, DG, { segments: 10 });
    const destroyer = db.build({ castShadow: false, receiveShadow: false });

    // --- placement ----------------------------------------------------------
    // The lane climbs to the right, so the corvette sits high and the destroyer
    // trails low and left, near the planet: a diagonal, not a row.
    const lane = new THREE.Vector3(0.9, 0.25, 0.36).normalize();
    const leadHome = polar(12, -26.5, 400);
    const chaseHome = polar(-6, -33.5, 530);

    const nose = new THREE.Vector3(0, 0, -1); // both hulls are built bow-to--z
    const lead = new THREE.Group();
    lead.add(corvette);
    lead.scale.setScalar(1.7);
    lead.quaternion.setFromUnitVectors(nose, lane);
    lead.rotateZ(0.14);
    lead.rotateX(-0.06);

    const chase = new THREE.Group();
    chase.add(destroyer);
    chase.scale.setScalar(1.3);
    chase.quaternion.setFromUnitVectors(nose, lane);
    chase.rotateZ(-0.24); // rolled so the lit flank and the ventral hull read
    chase.rotateX(0.1);

    // engine glow
    const leadGlow = new THREE.Group();
    for (const x of [-2.2, -0.75, 0.75, 2.2]) {
      const s = glowSprite(0xa8e8ff, 2.6, 0.9);
      s.position.set(x, 0.7, 6.4);
      leadGlow.add(s);
    }
    corvette.add(leadGlow);
    const chaseGlow = new THREE.Group();
    for (const x of [-6.2, -2.1, 2.1, 6.2]) {
      const s = glowSprite(0x9ed2ff, 4.2, 0.7);
      s.position.set(x, 2.4, 29.6);
      chaseGlow.add(s);
    }
    destroyer.add(chaseGlow);

    const group = new THREE.Group();
    group.add(lead, chase);
    revealRoot.add(group);

    // The warm title environment map would turn the grey hulls khaki; the sun
    // is the only thing that should be colouring them.
    group.traverse((o) => {
      if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = 0.2;
    });
    fadeWithReveal(group);

    return {
      update(t) {
        // far away and slowly closing: the destroyer runs a little faster
        const u = ease.range(t, T.tilt[0] - 6, END);
        lead.position.copy(leadHome).addScaledVector(lane, -14 + u * 30);
        chase.position.copy(chaseHome).addScaledVector(lane, -18 + u * 44);
      },
    };
  }

  // ---- assemble -----------------------------------------------------------
  const stars = buildStars();
  const card = buildCard();
  const logo = await buildLogo();
  const crawl = buildCrawl();
  const planet = buildPlanet();
  const ships = buildShips();

  // ---- sound cues (names that do not exist yet are ignored at playback) ----
  ctx.sfx(T.logoIn - 0.45, 'whoosh_transition', { gain: 0.8 });
  ctx.sfx(T.logoIn, 'impact_hit', { gain: 1.0 });
  ctx.sfx(T.logoHold + 0.15, 'whoosh_transition', { gain: 0.4, rate: 0.8 });
  ctx.sfx(T.tilt[0] + 0.1, 'whoosh_transition', { gain: 0.45, rate: 0.75 });

  // =========================================================================
  // update
  // =========================================================================
  function update(t) {
    // --- 1. starfield ------------------------------------------------------
    stars.update(t, ease.smooth(ease.range(t, T.starsUp[0], T.starsUp[1])));

    // --- 2. "A long time ago..." -------------------------------------------
    const cardA =
      ease.smooth(ease.range(t, T.cardIn[0], T.cardIn[1])) *
      (1 - ease.smooth(ease.range(t, T.cardOut[0], T.cardOut[1])));
    card.material.opacity = cardA;
    card.visible = cardA > 0.002;

    // --- 3. logo -----------------------------------------------------------
    logo.update(t);
    const titleLit = 1 - ease.smooth(ease.range(t, T.logoGone - 1.5, T.logoGone + 0.4));
    logoKey.intensity = 2.5 * titleLit;
    logoRim.intensity = 3.2 * titleLit;
    logoFill.intensity = 0.8 * titleLit;

    // --- 4. crawl ----------------------------------------------------------
    crawl.update(t);

    // --- 5. the reveal -----------------------------------------------------
    // The planet, moon and ships fade up out of nothing as the tilt starts, so
    // there is never an unlit body sitting in the corner of the crawl frame.
    const revealA = ease.smooth(ease.range(t, T.tilt[0], T.tilt[0] + 2.2));
    revealRoot.visible = revealA > 0.004;
    if (revealRoot.visible) {
      planet.update(t);
      ships.update(t);
      for (const m of revealMats) m.opacity = revealA;
      for (const g of revealGains) g.set(revealA);
    }
    const reveal = ease.smooth(ease.range(t, T.tilt[0], T.tilt[0] + 3.2));
    sun.intensity = 3.6 * reveal;
    sunFill.intensity = 0.34 * reveal;
    // The hemisphere fill only ever exists to soften the gold title, so it is
    // keyed off the title rather than left burning through the crawl.
    ambient.intensity = 0.34 * titleLit + 0.08 * reveal;

    // --- 6. camera ---------------------------------------------------------
    // Locked off through the crawl, then a long tilt down onto the planet with
    // a slow push in on the lens. The ease leaves and arrives at rest but is
    // front-loaded, so the empty starfield between the crawl and the planet is
    // crossed quickly.
    const k = Math.pow(ease.smooth(ease.range(t, T.tilt[0], T.tilt[1])), 0.62);
    const settle = ease.smooth(ease.range(t, T.tilt[1], END));
    camera.rotation.x = ease.lerp(PITCH_CRAWL, PITCH_END, k) - settle * 0.6 * RAD;
    camera.rotation.y = settle * 0.5 * RAD;
    const fov = ease.lerp(FOV_CRAWL, FOV_END, k) - settle * 1.4;
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  update(0);
  return {
    scene,
    camera,
    update,
    bloom: { strength: 0.8, radius: 0.7, threshold: 0.6 },
  };
}
