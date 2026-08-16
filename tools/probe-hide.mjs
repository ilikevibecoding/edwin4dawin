// One-off: render a view with named objects/materials hidden, to bisect what
// draws a given artifact. Usage: node tools/probe-hide.mjs <view> <hideSpec> <outName>
// hideSpec: comma list of object-name / material-name substrings ("water,rock").
import { startServer, launchBrowser, openApp, applyBaseline, shootView } from './lib.mjs';
import fs from 'node:fs';

const view = process.argv[2] || 'porthole';
const hideSpec = (process.argv[3] || '').split(',').filter(Boolean);
const outName = process.argv[4] || 'probe-hide';

const { url, close } = await startServer();
const browser = await launchBrowser();
try {
  const page = await openApp(browser, url, { seed: 1337 });
  await applyBaseline(page, {});
  const hidden = await page.evaluate((subs) => {
    const ctx = window.__ctx;
    let n = 0;
    ctx.scene.traverse((o) => {
      const name = (o.name || '') + '|' + (o.material && o.material.name ? o.material.name : '');
      if (subs.some((s) => name.toLowerCase().includes(s.toLowerCase()))) { o.visible = false; n++; }
    });
    window.debugAPI.pumpFrame();
    return n;
  }, hideSpec);
  console.log(`hidden ${hidden} objects matching [${hideSpec.join(', ')}]`);
  fs.mkdirSync('shots/iter_3/hide', { recursive: true });
  await shootView(page, view, `shots/iter_3/hide/${outName}.png`);
  console.log('saved', `shots/iter_3/hide/${outName}.png`);
} finally {
  await browser.close();
  await close();
}
