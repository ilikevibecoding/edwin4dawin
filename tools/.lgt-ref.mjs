/**
 * Scratch reference: one-bounce ground truth for interior irradiance.
 *
 * The rig computes an interior point's indirect light as two terms that come
 * from completely different machinery — sky as `aperture * skyIrradiance`, and
 * bounce as an SH volume carried in through the openings — so nothing forces
 * their ratio to be right. This fires a few thousand cosine-weighted rays from
 * chosen points and integrates both terms the same way, which is the only way
 * to tell which of the two is wrong and by how much.
 *
 * Sky radiance is modelled as uniform over the upper hemisphere at the same
 * `skyColor` the shader's aperture term assumes, so the comparison is against
 * the rig's own idea of the sky rather than against a better one.
 *
 *   node tools/.lgt-ref.mjs [shot] [rays]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const RAYS = Number(process.argv[3] ?? 1536);
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=320,180',
  ],
  protocolTimeout: 2400000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__?.listShots?.().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

const out = await page.evaluate(async (shot, RAYS) => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose(shot);

  const lighting = engine.get('lighting');
  const physics = engine.get('physics');
  const world = engine.get('world');
  const sky = engine.get('sky');
  const volume = lighting.volume;
  const cam = engine.camera;

  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 30; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  /* ---- albedo readback, same as the bake's ---- */
  const scene = new THREE.Scene();
  const ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const RES = 16;
  const rt = new THREE.WebGLRenderTarget(RES, RES, {
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tMap: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: 'uniform sampler2D tMap; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tMap,vUv).rgb,1.0); }',
    depthTest: false, depthWrite: false,
  }));
  scene.add(quad);
  const px = new Uint8Array(RES * RES * 4);
  const matCache = new Map();
  const geoCache = new Map();
  function albedoOf(obj) {
    const m = Array.isArray(obj?.material) ? obj.material[0] : obj?.material;
    if (!m) return [0.5, 0.5, 0.5];
    let base = matCache.get(m.uuid);
    if (!base) {
      base = [m.color?.r ?? 1, m.color?.g ?? 1, m.color?.b ?? 1];
      if (m.map) {
        quad.material.uniforms.tMap.value = m.map;
        const prev = engine.renderer.getRenderTarget();
        engine.renderer.setRenderTarget(rt);
        engine.renderer.render(scene, ocam);
        engine.renderer.readRenderTargetPixels(rt, 0, 0, RES, RES, px);
        engine.renderer.setRenderTarget(prev);
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < RES * RES; i++) { r += px[i * 4]; gg += px[i * 4 + 1]; b += px[i * 4 + 2]; }
        const s = 1 / (255 * RES * RES);
        base = [base[0] * r * s, base[1] * gg * s, base[2] * b * s];
      }
      matCache.set(m.uuid, base);
    }
    let vc = geoCache.get(obj.geometry?.uuid);
    if (!vc) {
      vc = [1, 1, 1];
      const a = obj.geometry?.getAttribute('color');
      if (a) {
        let r = 0, gg = 0, b = 0, n = 0;
        const stride = Math.max(1, Math.floor(a.count / 2048));
        for (let i = 0; i < a.count; i += stride) { r += a.getX(i); gg += a.getY(i); b += a.getZ(i); n++; }
        vc = [r / n, gg / n, b / n];
      }
      geoCache.set(obj.geometry?.uuid, vc);
    }
    return [
      Math.min(base[0] * vc[0], 0.8),
      Math.min(base[1] * vc[1], 0.8),
      Math.min(base[2] * vc[2], 0.8),
    ];
  }

  /* ---- raycast through glazing, as the bake does ---- */
  const GLAZING = 0.72, LAYERS = 3;
  /* WORLD | PROP | GLASS, matching the bake's mask in GameContext. */
  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const walk = new THREE.Vector3();
  function traceOpaque(origin, dir, maxDist, out) {
    let travelled = 0, through = 1;
    walk.copy(origin);
    for (let pane = 0; ; pane++) {
      const remaining = maxDist - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, dir, remaining, out, MASK)) return through;
      travelled += out.distance;
      if (out.surface !== 'glass' || pane >= LAYERS) { out.distance = travelled; return 0; }
      through *= GLAZING;
      walk.copy(out.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  }

  const sunDir = sky.sunDirection.clone().normalize();
  const sunE = [sky.sunColor.r, sky.sunColor.g, sky.sunColor.b];
  const skyL = [sky.skyColor.r, sky.skyColor.g, sky.skyColor.b];
  const skyE = skyL.map((v) => v * Math.PI);
  /* Ground radiance the environment probe composites below the horizon. */
  const gAlb = lighting.debugReport ? 0.3 : 0.3;
  const sunUp = Math.max(sunDir.y, 0);
  const groundL = skyL.map((v, i) => ((sunE[i] * sunUp + Math.PI * v) * gAlb) / Math.PI);

  const shadowHit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const hp = new THREE.Vector3();
  const vis4 = new THREE.Vector4();
  const d = new THREE.Vector3();
  const t1 = new THREE.Vector3(), t2 = new THREE.Vector3();

  function apertureOf(v, n) {
    const openness = Math.max(0, Math.min(1, v.w));
    const len = Math.hypot(v.x, v.y, v.z);
    const cosA = len > 1e-4 ? (n.x * v.x + n.y * v.y + n.z * v.z) / len : n.y;
    const cone = Math.min(openness, 0.5);
    const sinSq = 4 * cone * (1 - cone);
    const sinT = Math.sqrt(sinSq);
    const narrow = cosA >= sinT ? cosA : cosA <= -sinT ? 0 : ((cosA + sinT) ** 2) / (4 * Math.max(sinT, 1e-4));
    const wide = 0.5 + 0.5 * cosA;
    return sinSq * (narrow + (wide - narrow) * Math.min(openness * 2, 1));
  }

  /** One-bounce irradiance at a point on a surface with the given normal. */
  function reference(p, n) {
    /* Tangent frame for cosine sampling. */
    t1.set(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0).cross(n).normalize();
    t2.copy(n).cross(t1);
    const skySum = [0, 0, 0];
    const bounceSum = [0, 0, 0];
    let openCos = 0;
    let distSum = 0;
    let hits = 0;
    let sunlit = 0;
    const who = new Map();
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < RAYS; i++) {
      /* Cosine-weighted: r = sqrt(u), so pdf = cos/pi and E = (pi/N) sum L. */
      const u = (i + 0.5) / RAYS;
      const r = Math.sqrt(u);
      const phi = golden * i;
      const x = r * Math.cos(phi), y = r * Math.sin(phi);
      const z = Math.sqrt(Math.max(1 - u, 0));
      d.set(
        t1.x * x + t2.x * y + n.x * z,
        t1.y * x + t2.y * y + n.y * z,
        t1.z * x + t2.z * y + n.z * z,
      ).normalize();

      const through = traceOpaque(p, d, 120, hit);
      if (through > 0) {
        openCos += through;
        const L = d.y > 0 ? skyL : groundL;
        for (let c = 0; c < 3; c++) skySum[c] += L[c] * through;
        continue;
      }
      /* One bounce off what it hit. */
      const alb = albedoOf(hit.object);
      let sunVis = 0;
      if (sunDir.y > 0.02 && hit.normal.dot(sunDir) > 0) {
        hp.copy(hit.point).addScaledVector(hit.normal, 0.05);
        sunVis = traceOpaque(hp, sunDir, 80, shadowHit);
      }
      const ndl = sunVis > 0 ? sunVis * Math.max(hit.normal.dot(sunDir), 0) : 0;
      /* Ambient at the bounce point, read the way the bake reads it. */
      hp.copy(hit.point).addScaledVector(hit.normal, 0.35);
      volume.sampleVisibility(hp.x, hp.y, hp.z, vis4, hit.normal);
      const amb = apertureOf(vis4, hit.normal) * Math.PI;
      let contrib = 0;
      for (let c = 0; c < 3; c++) {
        const v = (alb[c] * (sunE[c] * ndl + skyL[c] * amb)) / Math.PI;
        bounceSum[c] += v;
        contrib += v;
      }
      hits++;
      distSum += hit.distance;
      if (ndl > 0) sunlit++;
      const key = (hit.object?.name || hit.object?.type || '?').slice(0, 26);
      const e = who.get(key) ?? { n: 0, sum: 0, dist: 0, sun: 0 };
      e.n++; e.sum += contrib; e.dist += hit.distance; e.sun += ndl > 0 ? 1 : 0;
      who.set(key, e);
    }
    const k = Math.PI / RAYS;
    const top = [...who.entries()]
      .sort((a, b) => b[1].sum - a[1].sum).slice(0, 4)
      .map(([name, e]) => `${name} n=${e.n} d=${(e.dist / e.n).toFixed(1)}m sun=${e.sun} L=${((e.sum / 3) * k).toFixed(3)}`);
    return {
      sky: skySum.map((v) => v * k),
      bounce: bounceSum.map((v) => v * k),
      /* Cosine-weighted open fraction: what `aperture` is trying to be. */
      aperture: openCos / RAYS,
      meanDist: hits ? distSum / hits : 0,
      sunlitFrac: hits ? sunlit / hits : 0,
      top,
    };
  }

  /* SH read, matching the shader. */
  const SH_A = [Math.PI, (2 * Math.PI) / 3, (2 * Math.PI) / 3, (2 * Math.PI) / 3,
    Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
  function shIrradiance(x, y, z, n) {
    const res = volume.resolution, min = volume.bounds.min, cell = volume.cell;
    const f = [
      THREE.MathUtils.clamp((x - min.x) / cell.x, 0, res.x - 1),
      THREE.MathUtils.clamp((y - min.y) / cell.y, 0, res.y - 1),
      THREE.MathUtils.clamp((z - min.z) / cell.z, 0, res.z - 1),
    ];
    const i = f.map((v, k) => Math.min(Math.floor(v), [res.x, res.y, res.z][k] - 1));
    const j = i.map((v, k) => Math.min(v + 1, [res.x, res.y, res.z][k] - 1));
    const t = f.map((v, k) => v - i[k]);
    const c = new Float32Array(27);
    for (let k = 0; k < 8; k++) {
      const w = (k & 1 ? t[0] : 1 - t[0]) * (k & 2 ? t[1] : 1 - t[1]) * (k & 4 ? t[2] : 1 - t[2]);
      if (w <= 0) continue;
      const q = ((k & 1 ? j[0] : i[0]) + res.x * ((k & 2 ? j[1] : i[1]) + res.y * (k & 4 ? j[2] : i[2]))) * 27;
      for (let s = 0; s < 27; s++) c[s] += (volume.sh[q + s] + volume.shSpread[q + s]) * w;
    }
    const b = [0.282095, 0.488603 * n.y, 0.488603 * n.z, 0.488603 * n.x,
      1.092548 * n.x * n.y, 1.092548 * n.y * n.z, 0.315392 * (3 * n.z * n.z - 1),
      1.092548 * n.x * n.z, 0.546274 * (n.x * n.x - n.y * n.y)];
    const rgb = [0, 0, 0];
    for (let s = 0; s < 9; s++) for (let ch = 0; ch < 3; ch++) rgb[ch] += c[s * 3 + ch] * b[s] * SH_A[s];
    return rgb.map((v) => Math.max(v, 0));
  }

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const cx = (room.rect.x0 + room.rect.x1) / 2;
  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const probes = [
    { name: 'floor near win', p: V(room.rect.x1 - 1.2, room.y + 0.05, cz), n: V(0, 1, 0) },
    { name: 'floor mid', p: V(cx, room.y + 0.05, cz), n: V(0, 1, 0) },
    { name: 'ceiling mid', p: V(cx, room.y + room.height - 0.05, cz), n: V(0, -1, 0) },
    { name: 'wall -x', p: V(room.rect.x0 + 0.1, room.y + 1.5, cz), n: V(1, 0, 0) },
    { name: 'wall +x', p: V(room.rect.x1 - 0.1, room.y + 1.5, cz), n: V(-1, 0, 0) },
    { name: 'wall -z', p: V(cx, room.y + 1.5, room.rect.z0 + 0.1), n: V(0, 0, 1) },
    { name: 'wall +z', p: V(cx, room.y + 1.5, room.rect.z1 - 0.1), n: V(0, 0, -1) },
  ];

  const rows = [];
  for (const pr of probes) {
    const ref = reference(pr.p, pr.n);
    volume.sampleVisibility(pr.p.x, pr.p.y, pr.p.z, vis4, pr.n);
    const ap = apertureOf(vis4, pr.n);
    const sh = shIrradiance(pr.p.x, pr.p.y, pr.p.z, pr.n);
    const rigSky = skyE.map((v) => v * ap);
    rows.push({
      name: pr.name,
      refAp: r3(ref.aperture),
      rigAp: r3(ap),
      openness: r3(vis4.w),
      refSky: ref.sky.map(r3), refBounce: ref.bounce.map(r3),
      rigSky: rigSky.map(r3), rigSh: sh.map(r3),
      refTotL: r3(luma(ref.sky.map((v, i) => v + ref.bounce[i]))),
      rigTotL: r3(luma(rigSky.map((v, i) => v + sh[i]))),
      refBR: r3(ref.sky[2] + ref.bounce[2] - ref.sky[0] - ref.bounce[0]),
      rigBR: r3(rigSky[2] + sh[2] - rigSky[0] - sh[0]),
      meanDist: r3(ref.meanDist), sunlitFrac: r3(ref.sunlitFrac), top: ref.top,
      at: [r3(pr.p.x), r3(pr.p.y), r3(pr.p.z)],
    });
  }

  return {
    room: room.name, rays: RAYS,
    skyL: skyL.map(r3), skyE: skyE.map(r3), groundL: groundL.map(r3),
    sunE: sunE.map(r3), sunEl: r3((Math.asin(sunDir.y) * 180) / Math.PI),
    grid: `${volume.resolution.x}x${volume.resolution.y}x${volume.resolution.z}`,
    rows,
  };
}, SHOT, RAYS);

if (out.error) { console.log('ERROR:', out.error); }
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room}  grid ${out.grid}  ${out.rays} rays/point  sun ${out.sunEl} deg`);
  console.log(`sky radiance ${out.skyL.join(', ')}  -> skyE ${out.skyE.join(', ')}   ground radiance ${out.groundL.join(', ')}   sunE ${out.sunE.join(', ')}`);
  console.log('\n' + pad('point', 16) + pad('aperture', 20) + pad('reference sky', 22) + pad('reference bounce', 22) + pad('rig sky', 22) + pad('rig SH', 22));
  for (const r of out.rows) {
    console.log(
      pad(r.name, 16) + pad(`ref ${r.refAp} rig ${r.rigAp}`, 20) +
      pad(r.refSky.join(','), 22) + pad(r.refBounce.join(','), 22) +
      pad(r.rigSky.join(','), 22) + pad(r.rigSh.join(','), 22),
    );
  }
  console.log('\n' + pad('point', 16) + pad('ref total L', 14) + pad('rig total L', 14) + pad('rig/ref', 10) + pad('ref B-R', 12) + 'rig B-R');
  for (const r of out.rows) {
    console.log(
      pad(r.name, 16) + pad(r.refTotL, 14) + pad(r.rigTotL, 14) +
      pad((r.rigTotL / Math.max(r.refTotL, 1e-6)).toFixed(2), 10) + pad(r.refBR, 12) + r.rigBR,
    );
  }
  console.log('\n-- what the reference rays hit --');
  for (const r of out.rows) {
    console.log(`  ${pad(r.name, 16)} at ${r.at.join(',')}  mean hit ${r.meanDist} m  sunlit ${(r.sunlitFrac * 100).toFixed(1)}%`);
    for (const t of r.top) console.log(`      ${t}`);
  }
  const f = out.rows.find((r) => r.name === 'floor mid');
  const c = out.rows.find((r) => r.name === 'ceiling mid');
  if (f && c) {
    console.log(`\nfloor/ceiling  reference ${(f.refTotL / Math.max(c.refTotL, 1e-6)).toFixed(2)}   rig ${(f.rigTotL / Math.max(c.rigTotL, 1e-6)).toFixed(2)}`);
  }
}
await browser.close();
