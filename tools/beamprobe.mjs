import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: ['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio','--window-size=1280,720'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type()==='error') console.log('CONSOLE-ERR', m.text()); });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise(r=>setTimeout(r,900));
  window.__SW.setPlaying(false);
  window.__SW.hideUi(true);
});
for (const t of [180, 186, 195, 200]) {
  const out = await page.evaluate(async (time) => {
    window.__SW.seek(time);
    window.__SW.settle(12, 1/30);
    window.__SW.renderOnce();
    const app = window.__SW.app;
    const THREE = window.__THREE_NS;
    let beam = null;
    app.stage.scene.traverse(o => { if (o.name === 'TractorBeam') beam = o; });
    const cam = app.render.camera;
    const runner = app.stage.runner.root;
    const dest = app.stage.destroyer.root;
    const anchor = app.stage.destroyer.anchors.tractor;
    const wp = (o) => { o.updateWorldMatrix(true,false); const v = new (o.position.constructor)(); return v.setFromMatrixPosition(o.matrixWorld).toArray().map(x=>+x.toFixed(1)); };
    return {
      time,
      beam: beam ? { visible: beam.visible, pos: beam.position.toArray().map(x=>+x.toFixed(1)), scale: beam.scale.toArray().map(x=>+x.toFixed(1)), op: beam.material.uniforms.uOpacity.value, parentVisible: beam.parent?.visible, parentName: beam.parent?.name } : 'MISSING',
      runner: runner.position.toArray().map(x=>+x.toFixed(1)),
      dest: dest.position.toArray().map(x=>+x.toFixed(1)),
      anchor: anchor ? wp(anchor) : 'no anchor',
      cam: cam.position.toArray().map(x=>+x.toFixed(1)),
    };
  }, t);
  console.log(JSON.stringify(out));
}
await browser.close();
