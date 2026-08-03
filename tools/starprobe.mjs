import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--window-size=1280,720',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text());
});
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 800));
  window.__SW.setPlaying(false);
  window.__SW.hideUi(true);
});

const out = await page.evaluate(async (t) => {
  window.__SW.seek(t);
  window.__SW.settle(8, 1 / 30);
  window.__SW.renderOnce();
  const app = window.__SW.app;
  const sf = app.stage.starfield;
  const cam = app.render.camera;
  const mat = sf.points.material;
  return {
    t,
    camPos: cam.position.toArray().map((v) => +v.toFixed(1)),
    camNear: cam.near,
    camFar: cam.far,
    fov: cam.fov,
    starRootVisible: sf.root.visible,
    pointsVisible: sf.points.visible,
    spaceRootVisible: app.stage.spaceRoot.visible,
    starOpacity: mat.uniforms.uOpacity.value,
    starPixelRatio: mat.uniforms.uPixelRatio.value,
    count: sf.points.geometry.attributes.position.count,
    firstPos: Array.from(sf.points.geometry.attributes.position.array.slice(0, 3)).map((v) => +v.toFixed(0)),
    firstSize: sf.points.geometry.attributes.size.array[0],
    mapReady: !!mat.uniforms.uMap.value?.image,
    mapSize: mat.uniforms.uMap.value?.image
      ? [mat.uniforms.uMap.value.image.width, mat.uniforms.uMap.value.image.height]
      : null,
    programError: mat.program ? mat.program.diagnostics : 'noprogram',
    background: app.stage.scene.background?.getHexString?.() ?? null,
    renderInfo: { calls: app.render.renderer.info.render.calls, points: app.render.renderer.info.render.points },
    dofEnabled: app.render.dofEnabled,
    tier: app.stage.qualityTier.name,
  };
}, 120);

console.log(JSON.stringify(out, null, 2));

// pixel histogram of a region of pure sky
const shot = await page.screenshot({ encoding: 'base64' });
console.log('screenshot bytes', shot.length);
await page.screenshot({ path: '/workspace/qa-output/diag/starprobe.png' });
await browser.close();
