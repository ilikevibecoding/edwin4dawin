import * as THREE from 'three';
import { canvasTexture } from '../lego/svg.js';
import { num, bool, clamp, lerp } from './common.js';

/*
 * Tatooine's two suns going down.
 *
 * Additive billboards only -- no post-processing required, so the shot survives
 * --nopost=1 and still reads as two blazing discs with flare halos. The cards
 * sit at -Z; the set faces +Z like every other location, and y = 0 is the
 * horizon line a scene's dunes should meet.
 *
 * userData.setHeight(0..1): 0 drops the suns onto the horizon, 1 lifts them clear.
 */

function radialTexture(key, stops, size = 256) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (const [p, c] of stops) g.addColorStop(p, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { key });
}

const CORE_TEX = () => radialTexture('ts_core', [
  [0.00, 'rgba(255,255,255,1)'],
  [0.46, 'rgba(255,252,240,1)'],
  [0.72, 'rgba(255,238,200,0.95)'],
  [0.87, 'rgba(255,214,150,0.42)'],
  [1.00, 'rgba(255,196,120,0)'],
]);

const HALO_TEX = () => radialTexture('ts_halo', [
  [0.00, 'rgba(255,240,210,0.80)'],
  [0.09, 'rgba(255,224,172,0.46)'],
  [0.24, 'rgba(255,192,118,0.19)'],
  [0.50, 'rgba(255,152,74,0.075)'],
  [0.76, 'rgba(220,112,62,0.024)'],
  [1.00, 'rgba(180,80,50,0)'],
], 512);

/*
 * Six-point flare star. Painted per pixel because a canvas gradient bar has a
 * hard edge across its thickness, which reads as a rectangle laid over the sky.
 */
const BURST_TEX = () => canvasTexture(512, 512, (ctx, W, H) => {
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const spikes = [
    [0.00, 0.98, 0.013], [Math.PI / 2, 0.60, 0.010],
    [0.52, 0.42, 0.0065], [-0.52, 0.42, 0.0065],
    [1.05, 0.30, 0.005], [-1.05, 0.30, 0.005],
  ];
  const pre = spikes.map(([a, len, wid]) => [Math.cos(a), Math.sin(a), len, wid]);
  for (let y = 0; y < H; y++) {
    const ny = (y / (H - 1) - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const nx = (x / (W - 1) - 0.5) * 2;
      let a = 0;
      for (const [ca, sa, len, wid] of pre) {
        const u = nx * ca + ny * sa;
        const v = -nx * sa + ny * ca;
        const along = 1 - Math.min(1, Math.abs(u) / len);
        if (along <= 0) continue;
        a += along * along * Math.exp(-(v * v) / (2 * wid * wid));
      }
      const r2 = nx * nx + ny * ny;
      a += 0.55 * Math.exp(-r2 / 0.0022);
      const k = Math.min(1, a);
      const i = (y * W + x) * 4;
      d[i] = 255; d[i + 1] = 240 - 40 * (1 - k); d[i + 2] = 210 - 90 * (1 - k);
      d[i + 3] = Math.round(k * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}, { key: 'ts_burst' });

function billboard(tex, w, h, color, opacity) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(color).convertSRGBToLinear(),
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  m.frustumCulled = false;
  return m;
}

function sun({ core, halo, burst, tint, coreTint, r, haloR, burstR, coreOp, haloOp, burstOp }) {
  const g = new THREE.Group();
  const h = billboard(halo, haloR, haloR, tint, haloOp);
  h.position.z = -0.6;
  h.renderOrder = -820;
  g.add(h);
  const b = billboard(burst, burstR, burstR, tint, burstOp);
  b.position.z = -0.3;
  b.renderOrder = -815;
  g.add(b);
  const c = billboard(core, r, r, coreTint, coreOp);
  c.renderOrder = -810;
  g.add(c);
  g.userData.parts = { core: c, halo: h, burst: b };
  return g;
}

export function buildTwinSuns(opts = {}) {
  const group = new THREE.Group();
  group.name = 'twinsuns';

  const D = num(opts, 'sundist', 260);
  const s = num(opts, 'scale', 1);
  const core = CORE_TEX(), halo = HALO_TEX(), burst = BURST_TEX();

  // Sky wash: a gradient card so the suns bleed into a warm sky rather than
  // floating on flat background colour. Fades out at both ends -- a hard card
  // edge across the frame is the one thing that gives this trick away.
  const skyTex = canvasTexture(8, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0.00, 'rgba(120,40,30,0.0)');
    g.addColorStop(0.10, 'rgba(255,132,52,0.55)');
    g.addColorStop(0.26, 'rgba(255,146,62,0.95)');
    g.addColorStop(0.40, 'rgba(238,110,52,0.52)');
    g.addColorStop(0.62, 'rgba(158,66,58,0.20)');
    g.addColorStop(1.00, 'rgba(50,28,50,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { key: 'ts_sky' });

  const skyH = 340 * s;
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(1000 * s, skyH),
    new THREE.MeshBasicMaterial({
      map: skyTex, transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.85,
    }),
  );
  // Gradient peak (0.26 up from the card's bottom) lands just above y = 0.
  sky.position.set(0, skyH * (0.5 - 0.26) + 14 * s, -D * 1.5);
  sky.renderOrder = -880;
  sky.frustumCulled = false;
  group.add(sky);

  // Big white primary.
  const big = sun({
    core, halo, burst,
    tint: 0xffd9a0, coreTint: 0xfff6e2,
    r: 40 * s, haloR: 260 * s, burstR: 330 * s,
    coreOp: 1, haloOp: 0.9, burstOp: 0.42,
  });
  big.position.set(-44 * s, 0, -D);
  group.add(big);

  // Smaller, deeper orange companion, trailing low and to the right.
  const small = sun({
    core, halo, burst,
    tint: 0xff8a3a, coreTint: 0xffb257,
    r: 25 * s, haloR: 165 * s, burstR: 190 * s,
    coreOp: 0.96, haloOp: 0.72, burstOp: 0.26,
  });
  small.position.set(34 * s, 0, -D * 0.99);
  group.add(small);

  // Flare ghosts marching back through the frame centre.
  const ghosts = new THREE.Group();
  for (const [t, size, a, col] of [[0.30, 22, 0.16, 0xffb060], [0.58, 13, 0.11, 0x8fd0ff],
    [0.84, 30, 0.085, 0xff8a4a], [1.22, 17, 0.07, 0xffe0a0]]) {
    const gm = billboard(halo, size * s, size * s, col, a);
    gm.position.set(lerp(-44 * s, 52 * s, t), 0, -D * (1 - t * 0.4));
    gm.renderOrder = -800;
    gm.userData.t = t;
    ghosts.add(gm);
  }
  group.add(ghosts);

  // Optional dune silhouette so the set reads on its own; a scene that puts
  // real terrain in front of these suns can switch it off with ridge=0.
  let ridge = null;
  if (bool(opts, 'ridge', true)) {
    const RH = 300 * s;
    const crestFrac = 0.22; // where the dune line sits in the texture, top-down
    const ridgeTex = canvasTexture(1024, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const grd = ctx.createLinearGradient(0, h * crestFrac, 0, h);
      grd.addColorStop(0, '#3a1a22');
      grd.addColorStop(0.25, '#2a1119');
      grd.addColorStop(1, '#150910');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const y = h * crestFrac
          - Math.sin(x * 0.0065) * h * 0.035
          - Math.sin(x * 0.021 + 1.7) * h * 0.016
          - Math.sin(x * 0.0035 + 0.4) * h * 0.030;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }, { key: 'ts_ridge' });
    ridge = new THREE.Mesh(
      new THREE.PlaneGeometry(1000 * s, RH),
      new THREE.MeshBasicMaterial({
        map: ridgeTex, transparent: true, depthWrite: false, depthTest: false,
        toneMapped: false, opacity: 1,
      }),
    );
    ridge.position.set(0, RH * (crestFrac - 0.5) - 16 * s, -D * 1.22);
    ridge.renderOrder = -790;
    ridge.frustumCulled = false;
    group.add(ridge);
  }

  const WARM_HI = new THREE.Color(0xfff6e2).convertSRGBToLinear();
  const WARM_LO = new THREE.Color(0xff8a2e).convertSRGBToLinear();
  const ORANGE_HI = new THREE.Color(0xffb257).convertSRGBToLinear();
  const ORANGE_LO = new THREE.Color(0xff4e18).convertSRGBToLinear();

  let height = num(opts, 'height', 0.5);

  function setHeight(v) {
    height = clamp(+v || 0, 0, 1);
    const yBig = lerp(-9, 64, height) * s;
    const ySmall = lerp(-20, 44, height) * s;
    big.position.y = yBig;
    small.position.y = ySmall;
    for (const gm of ghosts.children) gm.position.y = lerp(yBig, -yBig * 0.5, gm.userData.t);
    // Redder and dimmer the lower they sit: atmospheric extinction.
    const low = 1 - height;
    big.userData.parts.core.material.color.copy(WARM_HI).lerp(WARM_LO, low * 0.7);
    small.userData.parts.core.material.color.copy(ORANGE_HI).lerp(ORANGE_LO, low * 0.75);
    sky.material.opacity = 0.34 + low * 0.68;
  }
  setHeight(height);

  group.userData.nodes = { big, small };
  group.userData.setHeight = setHeight;
  group.userData.setRidge = (on) => { if (ridge) ridge.visible = !!on; };
  group.userData.update = (t) => {
    // Gentle heat shimmer on the flare spikes.
    big.userData.parts.burst.scale.setScalar(1 + Math.sin(t * 0.9) * 0.035);
    small.userData.parts.burst.scale.setScalar(1 + Math.sin(t * 1.3 + 1.2) * 0.05);
  };
  return group;
}
