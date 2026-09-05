import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('console', (m) => { if (m.type()==='error') console.log('console:', m.text()); });
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const out = await page.evaluate(() => {
  const api = window.debugAPI; api.setView('front'); api.renderFrames(1);
  const { skyRig, vehicle, scene, camera } = api.objects;
  const b = skyRig.beams;
  const lamps = []; vehicle.root.traverse((o) => { if (o.isSpotLight) lamps.push({ i: o.intensity, d: o.distance, a: o.angle, p: o.getWorldPosition(new (window.debugAPI.objects.camera.position.constructor)()).toArray().map(x=>+x.toFixed(2)) }); });
  const meshes = b.group.children.map((m) => ({ vis: m.visible, u: Object.fromEntries(Object.entries(m.material.uniforms).map(([k,v]) => [k, v.value && v.value.isVector3 ? v.value.toArray().map(x=>+x.toFixed(2)) : v.value && v.value.isColor ? v.value.getHexString() : v.value])) }));
  return { groupVisible: b.group.visible, parent: !!b.group.parent, lamps, meshes, cam: camera.position.toArray().map(x=>+x.toFixed(2)), headlightEmissive: vehicle.materials?.headlight ? [vehicle.materials.headlight.emissive.getHexString(), vehicle.materials.headlight.emissiveIntensity] : null, time: api.timeOfDay };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
