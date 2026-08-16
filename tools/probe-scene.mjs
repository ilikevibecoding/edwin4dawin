// One-off: inspect the live scene for the jacket meshes.
import { startServer, launchBrowser, openApp } from './lib.mjs';

const { url, close } = await startServer();
const browser = await launchBrowser();
try {
  const page = await openApp(browser, url, { seed: 1337 });
  const out = await page.evaluate(() => {
    const ctx = window.__ctx;
    const res = [];
    ctx.scene.traverse((o) => {
      if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x24221e) {
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        const wp = o.getWorldPosition(o.position.clone());
        res.push({
          type: o.geometry.type,
          world: [wp.x.toFixed(2), wp.y.toFixed(2), wp.z.toFixed(2)],
          size: [(bb.max.x - bb.min.x).toFixed(2), (bb.max.y - bb.min.y).toFixed(2), (bb.max.z - bb.min.z).toFixed(2)],
        });
      }
    });
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
  await close();
}
