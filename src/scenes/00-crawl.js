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
const PITCH_END = -30 * RAD;

// --- crawl plane ---------------------------------------------------------
const TILT = 63 * RAD; // plane rotation.x = -TILT  => vanishing point 27 deg up
const CRAWL_ORIGIN = [0, -9, -13]; // where the plane's local origin sits
const CRAWL_W = 27.5; // world width of the text panels
const TEX_W = 2048; // text texture width in pixels
const BODY_PX = 92; // body font size
const BODY_LH = 1.34;
const BODY_PAD = 48;
const HEAD_PX = 104; // "EPISODE I / THE STOLEN PLANS"
const HEAD_LH = 1.3;
const HEAD_PAD = 40;
const CRAWL_YELLOW = '#f2cd37';
const PROMINENT_Y = 9.0; // plane-local y where a paragraph reads biggest
const FADE_NEAR = 26; // distance where the crawl starts dissolving
const FADE_FAR = 45; // distance where it is gone

// --- reveal --------------------------------------------------------------
const PLANET_R = 44;
const PLANET_DIST = 620;

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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, (width * texH) / texW), mat);
  mesh.material = mat;
  return mesh;
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
  const warm = g.createRadialGradient(150, 60, 0, 150, 60, 210);
  warm.addColorStop(0, '#ffe6bd');
  warm.addColorStop(0.3, '#8a6634');
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
    logoIn: L0.t1 + 1.4, // ~7.5
    logoHold: L0.t1 + 2.3,
    logoGone: L0.t1 + 10.9, // ~15.0
    crawlStart: L1.t0 - 2.6, // heading enters the bottom of frame
    p1: L1.t0 + 3.4,
    p2: L2.t0 + 3.4,
    p3: L3.t0 + 1.6,
    dissolve: [L3.t1 - 0.05, L3.t1 + 1.75], // ~36.6 -> 38.4
    tilt: [L3.t1 + 1.15, L3.t1 + 7.55], // ~37.8 -> 44.2
  };
  const END = ctx.duration;

  // ---- lighting -----------------------------------------------------------
  // Two rigs share the scene: a title rig for the gold logo (up to ~16s) and a
  // sun for the planet reveal (from ~36s). Intensities are keyed off t so they
  // never light each other's beat.
  const ambient = new THREE.HemisphereLight(0x5b7ba8, 0x0a0d14, 0.35);
  scene.add(ambient);

  const logoKey = new THREE.DirectionalLight(0xfff2d8, 3.1);
  logoKey.position.set(26, 34, 40);
  const logoRim = new THREE.DirectionalLight(0xffc06a, 4.4);
  logoRim.position.set(-40, 26, -34);
  const logoFill = new THREE.DirectionalLight(0x88b6ff, 0.9);
  logoFill.position.set(-18, -14, 30);
  scene.add(logoKey, logoRim, logoFill);

  const sunDir = new THREE.Vector3(-0.834, 0.082, -0.546).normalize(); // toward the light
  const sun = new THREE.DirectionalLight(0xfff0dc, 0);
  sun.position.copy(sunDir).multiplyScalar(1200);
  const sunFill = new THREE.DirectionalLight(0x9fc0ff, 0);
  sunFill.position.set(120, 60, 400);
  scene.add(sun, sunFill);

  // =========================================================================
  // buildStars — two shells at different radii, counter-drifting for parallax
  // =========================================================================
  function buildStars() {
    const near = new Starfield({ count: 2400, radius: 1300, seed: 7, sizeMin: 1.7, sizeMax: 6.2 });
    const far = new Starfield({ count: 2000, radius: 2600, seed: 61, sizeMin: 2.6, sizeMax: 8.4 });
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
      roughness: 0.26,
      envMapIntensity: 1.5,
      emissive: 0x2a1a04,
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
    const D0 = 31; // slam distance
    const D1 = 700; // gone

    return {
      group,
      update(t) {
        const vis = t >= T.logoIn - 0.05 && t <= T.logoGone + 0.3;
        group.visible = vis;
        if (!vis) return;
        // slam: arrives over-sized and settles, then recedes exponentially so
        // it shrinks at a constant rate rather than easing to a halt
        let d;
        if (t < T.logoHold) d = ease.lerp(D0 * 0.72, D0, ease.outQuint(ease.range(t, T.logoIn, T.logoHold)));
        else d = D0 * Math.pow(D1 / D0, ease.range(t, T.logoHold, T.logoGone));
        const pos = camDir.clone().multiplyScalar(d);
        pos.y += (d - D0) * 0.45; // drift toward the crawl's vanishing point
        group.position.copy(pos);
        group.lookAt(0, 0, 0); // faces of the extrusion are on +z, so this is front-on

        const a =
          Math.min(1, ease.range(t, T.logoIn, T.logoIn + 0.12)) *
          (1 - ease.smooth(ease.range(t, T.logoGone - 2.6, T.logoGone)));
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
    const panel = (tex, texH) => {
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
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

    const yEnter = planeYAtNdc(-1.0); // plane-local y at the bottom of frame
    const scroll = monoSpline([
      [T.crawlStart, yEnter],
      [T.p1, PROMINENT_Y + centres[0]],
      [T.p2, PROMINENT_Y + centres[1]],
      [T.p3, PROMINENT_Y + centres[2]],
      [T.dissolve[1], PROMINENT_Y + centres[2] + 12.3],
    ]);

    return {
      lines: lineCount,
      update(t) {
        const on = t >= T.crawlStart - 0.2 && t <= T.dissolve[1] + 0.2;
        root.visible = on;
        if (!on) return;
        content.position.y = scroll(t);
        // The fade horizon sweeps in toward the lens at the end, dissolving the
        // crawl from the top down as the last line of narration lands.
        const d = ease.smooth(ease.range(t, T.dissolve[0], T.dissolve[1]));
        fadeU.uFar0.value = ease.lerp(FADE_NEAR, 5, d);
        fadeU.uFar1.value = ease.lerp(FADE_FAR, 12, d);
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
      new THREE.MeshStandardMaterial({ map: planetTexture(), roughness: 0.96, metalness: 0.0, envMapIntensity: 0.18 })
    );
    globe.rotation.z = 0.19;
    globe.rotation.y = 1.1;

    const air = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET_R * 1.055, 48, 32),
      atmosphereMaterial(0xff8a44, sunDir, 3.0, 1.05)
    );

    const planet = new THREE.Group();
    planet.add(globe, air);
    planet.position.copy(polar(-12, -40, PLANET_DIST));
    group.add(planet);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(16, 36, 24),
      new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1.0, metalness: 0.0, envMapIntensity: 0.15 })
    );
    moon.position.copy(polar(18, -32, 900));
    group.add(moon);

    scene.add(group);
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
    cb.panel(-3, 0, -11.5, 6, 2, 3, W, noStud);
    cb.panel(-1, 0.5, -9.5, 2, 3.5, 2, G, noStud);
    cb.panel(-2, -0.5, -6, 4, 5, 4, W, noStud);
    cb.panel(-2.8, -0.5, -1.5, 5.6, 5, 5, W, noStud);
    cb.panel(-2.2, 2, 0.5, 4.4, 3.5, 2, G, noStud);
    cb.panel(-3.2, -0.5, 3.5, 6.4, 1.6, 5, DG, noStud);
    for (const x of [-2.1, -0.7, 0.7, 2.1]) cb.cyl(x, 0.6, 4.6, 0.62, 2.6, DG, { segments: 8 });
    const corvette = cb.build({ castShadow: false, receiveShadow: false });

    // --- imperial destroyer: stepped grey wedge with a bridge tower ---------
    const db = new Bricks({ studSegments: 6 });
    const SEG = 9;
    const LEN = 58;
    const MAXW = 34;
    for (let i = 0; i < SEG; i++) {
      const w = Math.max(3, Math.round((MAXW * (i + 0.8)) / SEG));
      const z = -LEN / 2 + (LEN / SEG) * i;
      db.panel(-w / 2, 0, z, w, LEN / SEG + 0.05, 2.2, G, noStud);
      if (i > 2) {
        const w2 = Math.round(w * 0.8);
        db.panel(-w2 / 2, 2.2, z + 0.4, w2, LEN / SEG - 0.8, 1.1, DG, noStud);
      }
    }
    db.panel(-5.5, 3.2, 12, 11, 10, 4, G, noStud);
    db.panel(-4, 7.2, 15, 8, 6, 4, G, noStud);
    db.panel(-2.2, 11.2, 16.5, 4.4, 3.4, 3, DG, noStud);
    db.sphere(-2.9, 15.6, 18.2, 1.15, DG, { segments: 10 });
    db.sphere(2.9, 15.6, 18.2, 1.15, DG, { segments: 10 });
    db.panel(-8.5, 1.2, 26.5, 17, 2.4, 6, DG, noStud);
    for (const x of [-6, -2, 2, 6]) db.cyl(x, 1.6, 28, 1.55, 4, DG, { segments: 10 });
    const destroyer = db.build({ castShadow: false, receiveShadow: false });

    // --- placement ----------------------------------------------------------
    const lane = new THREE.Vector3(0.93, 0.05, 0.36).normalize();
    const leadHome = polar(7, -33.5, 400);
    const chaseHome = polar(-4, -35, 470);

    const nose = new THREE.Vector3(0, 0, -1); // both hulls are built bow-to--z
    const lead = new THREE.Group();
    lead.add(corvette);
    lead.quaternion.setFromUnitVectors(nose, lane);
    lead.rotateZ(0.12);
    lead.rotateX(-0.05);

    const chase = new THREE.Group();
    chase.add(destroyer);
    chase.scale.setScalar(1.25);
    chase.quaternion.setFromUnitVectors(nose, lane);
    chase.rotateZ(-0.06);

    // engine glow
    const leadGlow = new THREE.Group();
    for (const x of [-2.1, -0.7, 0.7, 2.1]) {
      const s = glowSprite(0x9fe4ff, 3.2, 0.95);
      s.position.set(x, 0.85, 5.6);
      leadGlow.add(s);
    }
    corvette.add(leadGlow);
    const chaseGlow = new THREE.Group();
    for (const x of [-6, -2, 2, 6]) {
      const s = glowSprite(0x88c8ff, 6.4, 0.8);
      s.position.set(x, 2.2, 30.4);
      chaseGlow.add(s);
    }
    destroyer.add(chaseGlow);

    const group = new THREE.Group();
    group.add(lead, chase);
    scene.add(group);

    const tris = (corvette.userData.triangles || 0) + (destroyer.userData.triangles || 0);
    return {
      tris,
      update(t) {
        // far away and slowly closing: the destroyer runs a little faster
        const u = ease.range(t, T.tilt[0] - 6, END);
        lead.position.copy(leadHome).addScaledVector(lane, -14 + u * 30);
        chase.position.copy(chaseHome).addScaledVector(lane, -18 + u * 41);
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
    logoKey.intensity = 3.1 * titleLit;
    logoRim.intensity = 4.4 * titleLit;
    logoFill.intensity = 0.9 * titleLit;

    // --- 4. crawl ----------------------------------------------------------
    crawl.update(t);

    // --- 5. the reveal -----------------------------------------------------
    planet.update(t);
    ships.update(t);
    const reveal = ease.smooth(ease.range(t, T.tilt[0] - 1.5, T.tilt[0] + 2.4));
    sun.intensity = 3.4 * reveal;
    sunFill.intensity = 0.5 * reveal;
    ambient.intensity = 0.35 * (1 - reveal) + 0.12 * reveal;

    // --- 6. camera ---------------------------------------------------------
    // Locked off through the crawl, then a long tilt down onto the planet with
    // a slow push in on the lens.
    const k = ease.smoother(ease.range(t, T.tilt[0], T.tilt[1]));
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
