import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 640, height: 360 }, protocolTimeout: 600000 });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/?bench=cockpit-city&w=640&h=360&quality=low&freeze=1', { waitUntil: 'load' });
await page.waitForFunction('window.__benchReady === true', { timeout: 600000, polling: 250 });
const info = await page.evaluate(() => {
  const g = window.__game; const f = g.aircraft.flight; const cam = g.camera;
  const fwd = f.forward(new (cam.position.constructor)());
  const camDir = new (cam.position.constructor)(0, 0, -1).applyQuaternion(cam.quaternion);
  const eyeLocal = cam.position.clone().sub(f.position).applyQuaternion(f.quaternion.clone().invert());
  return { planeFwd: fwd.toArray().map(v => +v.toFixed(2)), camDir: camDir.toArray().map(v => +v.toFixed(2)), eyeLocal: eyeLocal.toArray().map(v => +v.toFixed(2)), mode: g.flightCamera.mode, planePos: f.position.toArray().map(v => +v.toFixed(1)), camPos: cam.position.toArray().map(v => +v.toFixed(1)), heading: f.telemetry.heading.toFixed(0) };
});
console.log(JSON.stringify(info));
await browser.close();
