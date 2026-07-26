// Reports the brightest pixels of a view in scene-linear HDR, before tone
// mapping. Bloom works on those raw values, so when a highlight smears across
// the frame this is the only way to see how much energy is actually there and
// where it sits. Three disables tone mapping when drawing to a render target,
// so the readback is the untouched linear image.
//
//   node tests/hdrpeak.mjs --setup="__t.island(2)" [--url=...]
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const setup = flag('setup', '__t.island(2)');
// Peaks restricted to a box, for interrogating one feature rather than the
// brightest thing on screen.
const region = flag('region', '');
const url = flag('url', 'http://127.0.0.1:5173/?quality=high');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const logs = [];
page.on('pageerror', (err) => logs.push(err.message));
await page.goto(url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__gameReady === true, { timeout: 180000 });

await page.evaluate(`
  window.__t = {
    _cam(fn) { const g = window.game; g.player.updateCamera = fn; },
    free(p, t) { this._cam(() => { const c = window.engine.camera;
      c.position.set(p[0], p[1], p[2]); c.lookAt(t[0], t[1], t[2]); }); },
    shipCam(off, look) {
      const s = window.game.playerShip;
      this._cam(() => {
        const c = window.engine.camera;
        c.position.copy(s.localToWorld(new window.THREE.Vector3(off[0], off[1], off[2])));
        c.lookAt(s.localToWorld(new window.THREE.Vector3(look[0], look[1], look[2])));
      });
    },
    sail(windAngle, amount) {
      const s = window.game.playerShip;
      window.env.windAngle = windAngle;
      s.sailAmount = amount;
      s.anchorUp = true;
      s.anchorRaise = 1;
      s.autoTrim(window.env, 4);
      const knots = amount * 6.5;
      s.velocity.set(Math.cos(s.heading) * knots, 0, Math.sin(s.heading) * knots);
    },
    helm() {
      const g = window.game;
      g.leaveStation();
      g.enterStation('helm');
      if (g.player.stationLock) g.player.position.copy(g.player.stationLock);
      g.player.firstPerson = false;
    },
    island(i) {
      const g = window.game, isle = g.islands.islands[i], a = 2.3;
      let r = isle.radius * 0.4;
      for (let k = 0; k < 400; k++) {
        if (g.islands.heightAt(isle.x + Math.cos(a) * r, isle.z + Math.sin(a) * r) < -1.2) break;
        r += 1;
      }
      this.free([isle.x + Math.cos(a) * (r + 14), 2.6, isle.z + Math.sin(a) * (r + 14)],
        [isle.x + Math.cos(a - 0.5) * (r - 26), 5, isle.z + Math.sin(a - 0.5) * (r - 26)]);
    },
  };
`);
await page.evaluate(() => {
  window.game.begin();
  window.game.hud.setVisible(false);
  window.env.secondsPerHour = 1e7;
  window.env.timeOfDay = 9.4;
});
await page.evaluate(setup);

const report = await page.evaluate((regionArg) => {
  const THREE = window.THREE;
  const e = window.engine;
  e.stop();
  for (let i = 0; i < 8; i++) e.onFixedUpdate(1 / 60);
  e.onRender(1 / 60);
  // Full resolution: a single blown pixel is exactly the thing that feeds a
  // screen-wide bloom halo, and a subsampled readback walks straight past it.
  const size = e.renderer.getDrawingBufferSize(new THREE.Vector2());
  const W = size.x;
  const H = size.y;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
  e.renderer.setRenderTarget(rt);
  e.renderer.render(e.scene, e.camera);
  const buf = new Float32Array(W * H * 4);
  e.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  e.renderer.setRenderTarget(null);
  rt.dispose();

  const box = regionArg ? regionArg.split(',').map(Number) : null;
  const px = [];
  for (let i = 0; i < W * H; i++) {
    if (box) {
      const x = i % W;
      const y = H - 1 - Math.floor(i / W);
      if (x < box[0] || x >= box[0] + box[2] || y < box[1] || y >= box[1] + box[3]) continue;
    }
    const r = buf[i * 4];
    const g = buf[i * 4 + 1];
    const b = buf[i * 4 + 2];
    px.push({ i, r, g, b, l: 0.2126 * r + 0.7152 * g + 0.0722 * b });
  }
  px.sort((a, b) => b.l - a.l);
  const fmt = (p) => ({
    // Readback rows start at the bottom of the image; report top-down.
    x: p.i % W,
    y: H - 1 - Math.floor(p.i / W),
    rgb: [p.r, p.g, p.b].map((v) => +v.toFixed(2)),
    lum: +p.l.toFixed(2),
  });
  const overThreshold = px.filter((p) => p.l > 0.95).length;
  const bad = px.filter((p) => !isFinite(p.l) || isNaN(p.l)).length;
  return {
    size: [W, H],
    peak: px.slice(0, 8).map(fmt),
    nonFinite: bad,
    over8: px.filter((p) => p.l > 8).length,
    median: +px[Math.floor(px.length / 2)].l.toFixed(3),
    aboveBloomThreshold: `${overThreshold} of ${px.length} px (${((overThreshold / px.length) * 100).toFixed(1)}%)`,
  };
}, region);

// The composited frame, so the raw numbers above can be compared against what
// the post chain actually produces.
// Evaluated after the game's own per-frame update and before the draw, which
// is the only place an override of something the game rewrites every frame -
// bloom strength, for one - will actually survive to the composited image.
await page.evaluate(
  (post) => {
    window.game.player.viewModelGroup.visible = false;
    if (post) new Function(post)();
    window.engine.render();
  },
  flag('post', ''),
);
await page.screenshot({ path: 'artifacts/hdrpeak.png', timeout: 300000 });
const clip = flag('clip', '');
if (clip) {
  const [x, y, width, height] = clip.split(',').map(Number);
  await page.screenshot({ path: 'artifacts/hdrpeak-clip.png', clip: { x, y, width, height }, timeout: 300000 });
}

// Anything self-lit that lands inside the frame, with where it lands. A bright
// unlit material is invisible to the lighting model but very visible to bloom.
const emitters = await page.evaluate(() => {
  const THREE = window.THREE;
  const cam = window.engine.camera;
  cam.updateMatrixWorld();
  const found = [];
  const p = new THREE.Vector3();
  window.engine.scene.traverse((o) => {
    if (!o.material || !o.visible) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const unlit = m.type === 'MeshBasicMaterial' || m.type === 'PointsMaterial';
      const emissive = m.emissive && m.emissive.getHex() !== 0 ? m.emissiveIntensity ?? 1 : 0;
      if (!unlit && !emissive) continue;
      const col = unlit ? m.color : m.emissive;
      const lum = (0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b) * (unlit ? 1 : emissive);
      if (lum < 0.35) continue;
      o.getWorldPosition(p);
      const ndc = p.clone().project(cam);
      if (Math.abs(ndc.x) > 1.2 || Math.abs(ndc.y) > 1.2 || ndc.z > 1) continue;
      // Ancestry, because an unnamed Mesh tells you nothing and the origin of
      // a child can sit a long way from the geometry you are looking at.
      const chain = [];
      for (let n = o; n && chain.length < 5; n = n.parent) chain.push(n.name || n.type);
      o.geometry?.computeBoundingSphere?.();
      found.push({
        path: chain.join(' < '),
        mat: m.type,
        hex: col.getHexString(),
        lum: +lum.toFixed(2),
        px: [Math.round(((ndc.x + 1) / 2) * 800), Math.round(((1 - ndc.y) / 2) * 450)],
        dist: Math.round(p.distanceTo(cam.position)),
        radius: +(o.geometry?.boundingSphere?.radius ?? 0).toFixed(2),
      });
    }
  });
  return found.sort((a, b) => b.lum - a.lum).slice(0, 14);
});

// What is actually under a given pixel, nearest hit first.
const ray = flag('ray', '');
const rayHits = ray
  ? await page.evaluate((arg) => {
      const THREE = window.THREE;
      const [px, py] = arg.split(',').map(Number);
      const cam = window.engine.camera;
      const caster = new THREE.Raycaster();
      caster.setFromCamera(new THREE.Vector2((px / 800) * 2 - 1, -((py / 450) * 2 - 1)), cam);
      caster.far = 20000;
      return caster
        .intersectObjects(window.engine.scene.children, true)
        .slice(0, 6)
        .map((h) => {
          const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
          const g = h.object.geometry;
          g?.computeBoundingSphere?.();
          return {
            name: h.object.name || h.object.type,
            mat: m?.type,
            hex: m?.color?.getHexString?.(),
            dist: Math.round(h.distance),
            radius: +(g?.boundingSphere?.radius ?? 0).toFixed(2),
            scale: h.object.scale.toArray().map((v) => +v.toFixed(2)),
          };
        });
    }, ray)
  : null;

const state = await page.evaluate(() => ({
  timeOfDay: +window.env.timeOfDay.toFixed(3),
  sunY: +window.env.uniforms.uSunDir.value.y.toFixed(3),
  sunColor: window.env.uniforms.uSunColor.value.getHexString(),
  localStorm: +window.env.localStorm.toFixed(3),
  cloudCover: +window.env.cloudCover.toFixed(3),
  fog: window.env.uniforms.uFogColor.value.getHexString(),
  bloom: window.engine.bloomPass ? window.engine.bloomPass.strength : 'none',
}));

console.log(JSON.stringify({ setup, ...report, state, rayHits, emitters, logs }, null, 2));
await browser.close();
