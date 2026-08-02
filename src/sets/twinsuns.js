import * as THREE from 'three';
import { canvasTexture } from '../lego/svg.js';
import { num, bool, clamp, lerp } from './common.js';

/*
 * Tatooine's two suns going down.
 *
 * Additive billboards only -- no post-processing required, so the shot survives
 * --nopost=1 and still reads as two blazing discs with flare halos. The suns
 * live on a card at -Z; the set faces +Z like every other location.
 *
 * userData.setHeight(0..1): 0 drops them onto the horizon, 1 lifts them clear.
 */

function discTexture(key, stops) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (const [p, c] of stops) g.addColorStop(p, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { key });
}

const CORE_TEX = () => discTexture('ts_core', [
  [0.00, 'rgba(255,255,255,1)'],
  [0.52, 'rgba(255,252,238,1)'],
  [0.78, 'rgba(255,236,196,0.94)'],
  [0.90, 'rgba(255,214,150,0.45)'],
  [1.00, 'rgba(255,196,120,0)'],
]);

const HALO_TEX = () => discTexture('ts_halo', [
  [0.00, 'rgba(255,238,206,0.85)'],
  [0.10, 'rgba(255,222,168,0.52)'],
  [0.26, 'rgba(255,190,116,0.22)'],
  [0.52, 'rgba(255,150,72,0.085)'],
  [0.78, 'rgba(220,110,60,0.028)'],
  [1.00, 'rgba(180,80,50,0)'],
]);

/** Six-point starburst so the discs get a lens-flare bite without post. */
const BURST_TEX = () => canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(w / 2, h / 2);
  const spikes = [
    [0, 1.0, 0.030], [Math.PI / 2, 0.62, 0.022],
    [Math.PI / 6, 0.40, 0.014], [-Math.PI / 6, 0.40, 0.014],
    [Math.PI / 3, 0.30, 0.011], [-Math.PI / 3, 0.30, 0.011],
  ];
  for (const [ang, len, wid] of spikes) {
    ctx.save();
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(-w / 2 * len, 0, w / 2 * len, 0);
    g.addColorStop(0.00, 'rgba(255,210,150,0)');
    g.addColorStop(0.44, 'rgba(255,232,190,0.55)');
    g.addColorStop(0.50, 'rgba(255,250,235,0.95)');
    g.addColorStop(0.56, 'rgba(255,232,190,0.55)');
    g.addColorStop(1.00, 'rgba(255,210,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2 * len, -h * wid, w * len, h * wid * 2);
    ctx.restore();
  }
}, { key: 'ts_burst' });

function billboard(tex, size, color, opacity, blending = THREE.AdditiveBlending) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(color).convertSRGBToLinear(),
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      blending,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  m.frustumCulled = false;
  return m;
}

function sun({ core, halo, burst, tint, coreTint, r, haloR, burstR, coreOp = 1, haloOp = 1, burstOp = 0.6 }) {
  const g = new THREE.Group();
  const h = billboard(halo, haloR, tint, haloOp);
  h.position.z = -0.6;
  h.renderOrder = -820;
  g.add(h);
  const b = billboard(burst, burstR, tint, burstOp);
  b.position.z = -0.3;
  b.renderOrder = -815;
  g.add(b);
  const c = billboard(core, r, coreTint, coreOp);
  c.renderOrder = -810;
  g.add(c);
  g.userData.parts = { core: c, halo: h, burst: b };
  return g;
}

export function buildTwinSuns(opts = {}) {
  const group = new THREE.Group();
  group.name = 'twinsuns';

  const dist = num(opts, 'dist', 260);
  const scale = num(opts, 'scale', 1);
  const core = CORE_TEX(), halo = HALO_TEX(), burst = BURST_TEX();

  // Sky wash: a wide gradient card that lets the suns bleed into a warm sky
  // instead of floating on flat background colour.
  const skyTex = canvasTexture(64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0.00, 'rgba(255,158,72,0.92)');
    g.addColorStop(0.10, 'rgba(255,140,62,0.72)');
    g.addColorStop(0.30, 'rgba(226,104,56,0.36)');
    g.addColorStop(0.58, 'rgba(150,66,60,0.14)');
    g.addColorStop(1.00, 'rgba(60,32,54,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { key: 'ts_sky' });

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(760 * scale, 300 * scale),
    new THREE.MeshBasicMaterial({
      map: skyTex, transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.8,
    }),
  );
  sky.position.set(0, 150 * scale - 40, -dist * 1.3);
  sky.renderOrder = -880;
  sky.frustumCulled = false;
  group.add(sky);

  // Big white primary.
  const big = sun({
    core, halo, burst,
    tint: 0xffd9a0, coreTint: 0xfff6e2,
    r: 34 * scale, haloR: 190 * scale, burstR: 300 * scale,
    coreOp: 1, haloOp: 0.95, burstOp: 0.5,
  });
  big.position.set(-26 * scale, 0, -dist);
  group.add(big);

  // Smaller, deeper orange companion, trailing low and to the right.
  const small = sun({
    core, halo, burst,
    tint: 0xff8a3a, coreTint: 0xffb257,
    r: 21 * scale, haloR: 120 * scale, burstR: 170 * scale,
    coreOp: 0.98, haloOp: 0.8, burstOp: 0.34,
  });
  small.position.set(26 * scale, 0, -dist * 0.98);
  group.add(small);

  // Flare ghosts marching back through the frame centre.
  const ghosts = new THREE.Group();
  for (const [t, s, a, col] of [[0.34, 26, 0.20, 0xffb060], [0.62, 15, 0.14, 0x8fd0ff],
    [0.86, 34, 0.10, 0xff8a4a], [1.28, 20, 0.09, 0xffe0a0]]) {
    const gm = billboard(halo, s * scale, col, a);
    gm.position.set(lerp(-26 * scale, 40 * scale, t), 0, -dist * (1 - t * 0.45));
    gm.renderOrder = -800;
    gm.userData.t = t;
    ghosts.add(gm);
  }
  group.add(ghosts);

  // Optional haze ridge so the set reads on its own in the lab; scenes that
  // drop real dunes in front of it can switch it off.
  const ridge = new THREE.Group();
  if (bool(opts, 'ridge', true)) {
    const ridgeTex = canvasTexture(512, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#2a1420';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.62
          - Math.sin(x * 0.013) * h * 0.16
          - Math.sin(x * 0.041 + 1.7) * h * 0.09
          - Math.sin(x * 0.007 + 0.4) * h * 0.13;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }, { key: 'ts_ridge' });
    const r = new THREE.Mesh(
      new THREE.PlaneGeometry(700 * scale, 60 * scale),
      new THREE.MeshBasicMaterial({
        map: ridgeTex, transparent: true, depthWrite: false, depthTest: false,
        toneMapped: false, opacity: 0.96,
      }),
    );
    r.position.set(0, 12 * scale, -dist * 1.24);
    r.renderOrder = -790;
    r.frustumCulled = false;
    ridge.add(r);
    group.add(ridge);
  }

  let height = num(opts, 'height', 0.42);

  function setHeight(v) {
    height = clamp(+v || 0, 0, 1);
    const yBig = lerp(-6, 74, height) * scale;
    const ySmall = lerp(-16, 52, height) * scale;
    big.position.y = yBig;
    small.position.y = ySmall;
    for (const gm of ghosts.children) {
      gm.position.y = lerp(yBig, -yBig * 0.45, gm.userData.t);
      gm.material.opacity = gm.userData.opacity ?? gm.material.opacity;
    }
    // Redder and dimmer the lower they sit -- atmospheric extinction.
    const low = 1 - height;
    big.userData.parts.core.material.color
      .setHex(0xfff6e2).convertSRGBToLinear().lerp(new THREE.Color(0xff9a3a).convertSRGBToLinear(), low * 0.65);
    small.userData.parts.core.material.color
      .setHex(0xffb257).convertSRGBToLinear().lerp(new THREE.Color(0xff5a1e).convertSRGBToLinear(), low * 0.7);
    sky.material.opacity = 0.28 + low * 0.72;
  }
  setHeight(height);

  group.userData.nodes = { big, small };
  group.userData.setHeight = setHeight;
  group.userData.update = (t) => {
    // Gentle heat shimmer on the flare spikes.
    const s = 1 + Math.sin(t * 0.9) * 0.035;
    big.userData.parts.burst.scale.setScalar(s);
    small.userData.parts.burst.scale.setScalar(1 + Math.sin(t * 1.3 + 1.2) * 0.05);
  };
  return group;
}
