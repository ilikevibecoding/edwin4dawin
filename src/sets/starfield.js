import * as THREE from 'three';
import { RNG } from '../engine/rng.js';
import { canvasTexture } from '../lego/svg.js';
import { num, clamp, lerp } from './common.js';

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

function nebulaTexture(seed) {
  return canvasTexture(2048, 1024, (ctx, w, h) => {
    const r = new RNG(seed);
    ctx.fillStyle = '#02030700';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#020307';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';

    // The milky band: a soft diagonal river of dust across the sphere.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-0.20);
    const band = ctx.createLinearGradient(0, -h * 0.30, 0, h * 0.30);
    band.addColorStop(0.00, 'rgba(8,10,26,0)');
    band.addColorStop(0.36, 'rgba(26,32,66,0.55)');
    band.addColorStop(0.50, 'rgba(52,58,104,0.55)');
    band.addColorStop(0.64, 'rgba(24,28,62,0.5)');
    band.addColorStop(1.00, 'rgba(8,10,26,0)');
    ctx.fillStyle = band;
    ctx.fillRect(-w, -h * 0.30, w * 2, h * 0.60);
    ctx.restore();

    // Nebula blooms, biased onto the band so the colour has somewhere to live.
    const hues = [
      [58, 34, 118], [20, 52, 118], [104, 28, 84],
      [14, 74, 104], [96, 46, 28], [34, 66, 148], [78, 22, 110],
    ];
    for (let i = 0; i < 34; i++) {
      const cx = r.range(0, w);
      const bandY = h * 0.5 + (cx - w * 0.5) * -Math.tan(-0.20);
      const cy = bandY + r.gauss(0, h * 0.16);
      const rad = r.range(70, 420);
      const [rr, gg, bb] = hues[i % hues.length];
      const a = r.range(0.06, 0.26);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a.toFixed(3)})`);
      g.addColorStop(0.40, `rgba(${rr >> 1},${gg >> 1},${bb >> 1},${(a * 0.4).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Background star dust: soft 2-3 px smudges rather than hard texels, so
    // magnifying the sphere never turns them into a visible pixel lattice.
    for (let i = 0; i < 5200; i++) {
      const x = r.range(0, w), y = r.range(0, h);
      const a = Math.pow(r.next(), 2.6) * 0.5;
      if (a < 0.02) continue;
      const rad = r.range(1.1, 2.6);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(226,236,255,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(226,236,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
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
  const count = Math.round(num(opts, 'stars', 6500));
  const seed = Math.round(num(opts, 'seed', 90210));
  const group = new THREE.Group();
  group.name = 'starfield';

  // ------------------------------------------------------------- nebula
  const nebGeo = new THREE.SphereGeometry(R * 1.06, 40, 24);
  const nebMat = new THREE.MeshBasicMaterial({
    map: nebulaTexture(seed),
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });
  const neb = new THREE.Mesh(nebGeo, nebMat);
  neb.renderOrder = -1000;
  neb.frustumCulled = false;
  group.add(neb);

  // -------------------------------------------------------------- stars
  const rng = new RNG(seed);
  const tex = dotTexture();

  // Three buckets so point size varies without a per-vertex size shader.
  const buckets = [
    { frac: 0.66, size: 1.5, bright: [0.22, 0.52] },
    { frac: 0.28, size: 2.2, bright: [0.45, 0.85] },
    { frac: 0.06, size: 3.6, bright: [0.9, 1.5] },
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
    const r = allCol[i * 3], g = allCol[i * 3 + 1], b = allCol[i * 3 + 2];
    for (let v = 0; v < 6; v++) {
      // Fade the tail so the streak looks like a comet, not a bar.
      const tail = (v === 2 || v === 3 || v === 4) ? 0.22 : 1.0;
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
    const wide = 0.9 + a * 5.5;
    for (let i = 0; i < nStars; i++) {
      const hx = headX[i], hy = headY[i], hz = headZ[i];
      const w = wide * (0.5 + allBright[i]);
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
    sMat.opacity = Math.min(1, amount * 2.4);
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
    neb.rotation.y = t * 0.002;
  };

  if (num(opts, 'streaks', 0) > 0) setStreaks(num(opts, 'streaks', 0));
  return group;
}
