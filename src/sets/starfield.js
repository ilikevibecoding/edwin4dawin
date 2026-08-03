import * as THREE from 'three';
import { RNG } from '../engine/rng.js';
import { canvasTexture } from '../lego/svg.js';
import { num, clamp, fbm2 } from './common.js';

/*
 * Deep space backdrop.
 *
 * A nebula-painted sphere (one canvas texture, unlit, always behind), three
 * point clouds at different sizes so brightness varies, and a stretched-quad
 * layer that turns the whole thing into a hyperspace tunnel on demand.
 *
 * Camera is assumed to sit near the group origin looking down -Z, which is why
 * the streaks simply extend along +Z: under perspective that reads as stars
 * flying radially out of the vanishing point.
 */

const STAR_TINTS = [
  [1.00, 1.00, 1.00], [0.86, 0.92, 1.00], [0.74, 0.84, 1.00],
  [1.00, 0.96, 0.86], [1.00, 0.88, 0.70], [1.00, 0.78, 0.62],
  [0.94, 0.86, 1.00], [1.00, 1.00, 0.94],
];

function dotTexture() {
  return canvasTexture(32, 32, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0.00, 'rgba(255,255,255,1)');
    g.addColorStop(0.26, 'rgba(255,255,255,0.90)');
    g.addColorStop(0.46, 'rgba(255,255,255,0.30)');
    g.addColorStop(0.68, 'rgba(255,255,255,0.05)');
    g.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { key: 'sf_dot' });
}

/*
 * The nebula is painted per pixel rather than with canvas gradients on
 * purpose: the camera sits inside this sphere, so the map is magnified ~3x and
 * Skia's gradient dithering shows up as a fine lattice across the whole frame.
 * Straight arithmetic into an ImageData has no dither to reveal.
 */
function nebulaTexture(seed) {
  const W = 1024, H = 512;
  return canvasTexture(W, H, (ctx) => {
    const img = ctx.createImageData(W, H);
    const d = img.data;

    // Colour blooms scattered along the dust lane.
    const r = new RNG(seed + 17);
    const blooms = [];
    const hues = [
      [56, 34, 128], [20, 54, 128], [112, 26, 86],
      [12, 72, 104], [104, 48, 30], [30, 62, 152], [82, 20, 118],
    ];
    for (let i = 0; i < 18; i++) {
      blooms.push({
        u: r.range(0, 1),
        v: 0.5 + r.gauss(0, 0.15),
        rad: r.range(0.04, 0.135),
        amp: r.range(0.20, 0.58),
        c: hues[i % hues.length],
      });
    }

    for (let y = 0; y < H; y++) {
      const v = y / (H - 1);
      for (let x = 0; x < W; x++) {
        const u = x / W;
        // Dust lane: a wandering great circle across the sky.
        const lane = 0.5
          + Math.sin(u * Math.PI * 2) * 0.15
          + Math.sin(u * Math.PI * 4 + 1.3) * 0.055;
        const dv = (v - lane) / 0.15;
        const band = Math.exp(-dv * dv * 0.5);

        const n1 = fbm2(u * 8, v * 4, { seed, octaves: 5 });
        const n2 = fbm2(u * 19 + 3, v * 9 + 1, { seed: seed + 91, octaves: 4 });
        let dens = band * (0.05 + n1 * 1.0) * (0.25 + n2 * 0.85);

        let cr = 22 + n2 * 15;
        let cg = 26 + n1 * 14;
        let cb = 62 + n1 * 30;

        for (const bl of blooms) {
          let du = u - bl.u;
          if (du > 0.5) du -= 1; else if (du < -0.5) du += 1;
          const ddv = (v - bl.v) * 1.6;
          const q2 = (du * du + ddv * ddv) / (bl.rad * bl.rad);
          if (q2 > 9) continue;
          const g = Math.exp(-q2 * 0.8) * bl.amp;
          cr += bl.c[0] * g; cg += bl.c[1] * g; cb += bl.c[2] * g;
          dens += g * 0.5 * band;
        }

        const k = Math.min(1, Math.max(0, dens)) ** 1.6;
        const i4 = (y * W + x) * 4;
        d[i4] = Math.min(255, 2 + cr * k);
        d[i4 + 1] = Math.min(255, 3 + cg * k);
        d[i4 + 2] = Math.min(255, 8 + cb * k);
        d[i4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { key: 'sf_neb_' + seed });
}

function makePoints(pts, cols, size, tex) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  g.computeBoundingSphere();
  const m = new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = -900;
  return p;
}

export function buildStarfield(opts = {}) {
  const R = num(opts, 'radius', 900);
  // Only ~2% of a full sphere is ever in a 35-degree frame, so "a few thousand"
  // stars on the sphere is what puts a couple of hundred on screen.
  const count = Math.round(num(opts, 'stars', 9000));
  const seed = Math.round(num(opts, 'seed', 90210));
  const group = new THREE.Group();
  group.name = 'starfield';

  // ------------------------------------------------------------- nebula
  const nebGeo = new THREE.SphereGeometry(R * 1.06, 48, 28);
  const nebTex = nebulaTexture(seed);
  // The camera sits inside the sphere, so the map is always magnified.
  // Mipmaps and anisotropy buy nothing here and SwiftShader's filtering of
  // them shows up as a visible texel lattice.
  nebTex.generateMipmaps = false;
  nebTex.minFilter = THREE.LinearFilter;
  nebTex.anisotropy = 1;
  nebTex.needsUpdate = true;
  // The painted map is authored bright enough to survive being scaled down;
  // scaling here rather than in the texture keeps one cached canvas for every
  // brightness a scene asks for. The default is deliberately low -- at full
  // strength the dust lane competes with the stars for the eye, and this is a
  // backdrop that spends most of its screen time behind moving ships.
  const nebAmt = clamp(num(opts, 'nebula', 0.6), 0, 1);
  const nebMat = new THREE.MeshBasicMaterial({
    map: nebTex,
    color: new THREE.Color(nebAmt, nebAmt, nebAmt),
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });
  const nebRot = num(opts, 'nebrot', 1.37);
  const neb = new THREE.Mesh(nebGeo, nebMat);
  neb.rotation.y = nebRot;
  neb.renderOrder = -1000;
  neb.frustumCulled = false;
  neb.visible = nebAmt > 0.001;
  group.add(neb);

  // -------------------------------------------------------------- stars
  const rng = new RNG(seed);
  const tex = dotTexture();

  // Three buckets so point size varies without a per-vertex size shader.
  const buckets = [
    { frac: 0.68, size: 1.6, bright: [0.34, 0.72] },
    { frac: 0.26, size: 2.4, bright: [0.70, 1.20] },
    { frac: 0.06, size: 4.0, bright: [1.30, 2.30] },
  ];

  const allPos = [];
  const allCol = [];
  const allBright = [];
  const layers = [];

  for (const b of buckets) {
    const n = Math.max(1, Math.round(count * b.frac));
    const pos = new Array(n * 3);
    const col = new Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Uniform on the sphere.
      const u = rng.range(-1, 1);
      const th = rng.range(0, Math.PI * 2);
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      // Slight bias toward -Z: that is where the camera looks, and a denser
      // field ahead makes the hyperspace jump read better.
      const jitter = rng.range(0.92, 1.0);
      const x = Math.cos(th) * s * R * jitter;
      const y = u * R * jitter;
      const z = Math.sin(th) * s * R * jitter;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;

      const tint = STAR_TINTS[Math.floor(rng.next() * STAR_TINTS.length)];
      const br = rng.range(b.bright[0], b.bright[1]);
      col[i * 3] = tint[0] * br;
      col[i * 3 + 1] = tint[1] * br;
      col[i * 3 + 2] = tint[2] * br;

      allPos.push(x, y, z);
      allCol.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]);
      allBright.push(br * (b.size / 2.4));
    }
    const p = makePoints(pos, col, b.size, tex);
    layers.push({ points: p, size: b.size });
    group.add(p);
  }

  // ------------------------------------------------------------ streaks
  // One tapered quad per star, pointing along +Z. Rebuilt on setStreaks().
  const nStars = allBright.length;
  const sPos = new Float32Array(nStars * 6 * 3);
  const sCol = new Float32Array(nStars * 6 * 3);
  const headX = new Float32Array(nStars);
  const headY = new Float32Array(nStars);
  const headZ = new Float32Array(nStars);
  const sideX = new Float32Array(nStars);
  const sideY = new Float32Array(nStars);

  for (let i = 0; i < nStars; i++) {
    const x = allPos[i * 3], y = allPos[i * 3 + 1], z = allPos[i * 3 + 2];
    headX[i] = x; headY[i] = y; headZ[i] = z;
    // Perpendicular to both the view ray and the +Z streak axis.
    let sx = y, sy = -x;
    const l = Math.hypot(sx, sy) || 1;
    sideX[i] = sx / l; sideY[i] = sy / l;
    const r = allCol[i * 3] * 0.5, g = allCol[i * 3 + 1] * 0.5, b = allCol[i * 3 + 2] * 0.5;
    for (let v = 0; v < 6; v++) {
      // Fade the tail so the streak looks like a comet, not a bar.
      const tail = (v === 2 || v === 4 || v === 5) ? 0.10 : 1.0;
      sCol[(i * 6 + v) * 3] = r * tail;
      sCol[(i * 6 + v) * 3 + 1] = g * tail;
      sCol[(i * 6 + v) * 3 + 2] = b * tail;
    }
  }

  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  sGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 3);
  const sMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const streaks = new THREE.Mesh(sGeo, sMat);
  streaks.frustumCulled = false;
  streaks.renderOrder = -880;
  streaks.visible = false;
  group.add(streaks);

  let amount = 0;

  function writeStreaks(a) {
    const len = R * 1.35 * Math.pow(a, 1.25);
    // At R=900 one screen pixel is ~0.8 units across, so streaks want to be
    // single-digit units wide, not tens.
    const wide = 0.30 + a * 0.55;
    for (let i = 0; i < nStars; i++) {
      const hx = headX[i], hy = headY[i], hz = headZ[i];
      // Never go under a pixel wide or the rasteriser breaks the streak up.
      const w = Math.max(0.62, wide * (0.35 + allBright[i] * 0.9));
      const ax = sideX[i] * w, ay = sideY[i] * w;
      const bx = sideX[i] * w * 0.16, by = sideY[i] * w * 0.16;
      const tz = hz + len;
      const o = i * 18;
      // tri 1: head-left, head-right, tail-right
      sPos[o + 0] = hx - ax; sPos[o + 1] = hy - ay; sPos[o + 2] = hz;
      sPos[o + 3] = hx + ax; sPos[o + 4] = hy + ay; sPos[o + 5] = hz;
      sPos[o + 6] = hx + bx; sPos[o + 7] = hy + by; sPos[o + 8] = tz;
      // tri 2: head-left, tail-right, tail-left
      sPos[o + 9] = hx - ax; sPos[o + 10] = hy - ay; sPos[o + 11] = hz;
      sPos[o + 12] = hx + bx; sPos[o + 13] = hy + by; sPos[o + 14] = tz;
      sPos[o + 15] = hx - bx; sPos[o + 16] = hy - by; sPos[o + 17] = tz;
    }
    sGeo.attributes.position.needsUpdate = true;
  }

  /** 0 = still starfield, 1 = full hyperspace tunnel. */
  function setStreaks(a) {
    amount = clamp(+a || 0, 0, 1);
    if (amount < 0.002) {
      streaks.visible = false;
      for (const l of layers) l.points.material.opacity = 1;
      return;
    }
    streaks.visible = true;
    writeStreaks(amount);
    sMat.opacity = Math.min(0.92, amount * 1.9);
    const dim = 1 - Math.min(1, amount * 1.5);
    for (const l of layers) l.points.material.opacity = dim;
  }

  group.userData.setStreaks = setStreaks;
  group.userData.nodes = {};
  group.userData.update = (t) => {
    // Barely-there twinkle: enough to keep the frame alive, cheap enough to
    // run every frame under software GL.
    const tw = 1 + Math.sin(t * 2.1) * 0.06;
    layers[2].points.material.size = buckets[2].size * tw;
    layers[1].points.material.size = buckets[1].size * (1 + Math.sin(t * 1.3 + 2) * 0.04);
    neb.rotation.y = nebRot + t * 0.002;
  };

  if (num(opts, 'streaks', 0) > 0) setStreaks(num(opts, 'streaks', 0));
  return group;
}
