#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// Report the state of every light and env setting, then render a few
// controlled variants so we can tell "no light" apart from "wrong exposure".

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5173/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const view = arg('view', 'forest');

await mkdir('shots/debug', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
await page.evaluate((v) => window.debugAPI.setView(v), view);

console.log(
  JSON.stringify(
    await page.evaluate(() => {
      const { scene, renderer, camera, skyRig } = window.debugAPI.objects;
      const lights = [];
      scene.traverse((o) => {
        if (o.isLight) {
          lights.push({
            type: o.type,
            intensity: o.intensity,
            color: o.color?.getHexString(),
            visible: o.visible,
            pos: [+o.position.x.toFixed(1), +o.position.y.toFixed(1), +o.position.z.toFixed(1)],
            castShadow: !!o.castShadow,
            shadowCam: o.shadow
              ? {
                  near: o.shadow.camera.near,
                  far: o.shadow.camera.far,
                  left: o.shadow.camera.left,
                  right: o.shadow.camera.right,
                  mapSize: o.shadow.mapSize.x,
                  bias: o.shadow.bias,
                  normalBias: o.shadow.normalBias,
                }
              : null,
            targetPos: o.target ? [+o.target.position.x.toFixed(1), +o.target.position.y.toFixed(1), +o.target.position.z.toFixed(1)] : null,
          });
        }
      });
      return {
        lights,
        envIntensity: scene.environmentIntensity,
        hasEnv: !!scene.environment,
        toneMapping: renderer.toneMapping,
        exposure: renderer.toneMappingExposure,
        shadowsEnabled: renderer.shadowMap.enabled,
        shadowType: renderer.shadowMap.type,
        camera: [+camera.position.x.toFixed(1), +camera.position.y.toFixed(1), +camera.position.z.toFixed(1)],
        fog: scene.fog ? { type: scene.fog.type ?? 'FogExp2', density: scene.fog.density, color: scene.fog.color.getHexString() } : null,
      };
    }),
    null,
    1,
  ),
);

async function variant(label, setup) {
  const { dataUrl, luma } = await page.evaluate((code) => {
    // eslint-disable-next-line no-new-func
    new Function('THREE_API', code)(window.debugAPI.objects);
    const dataUrl = window.debugAPI.captureFrame(1);
    return { dataUrl, luma: window.debugAPI.sampleLuma() };
  }, setup);
  await writeFile(`shots/debug/lp_${label}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`${label.padEnd(22)} mean ${luma.mean.toFixed(4)} max ${luma.max.toFixed(4)}`);
}

await variant('00_asis', 'void 0;');
await variant('01_shadowsoff', 'THREE_API.renderer.shadowMap.enabled = false; THREE_API.scene.traverse(o => { if (o.isMesh) o.material.needsUpdate = true; });');
await variant('02_shadowson', 'THREE_API.renderer.shadowMap.enabled = true; THREE_API.scene.traverse(o => { if (o.isMesh) o.material.needsUpdate = true; });');
await variant('03_nofog', 'THREE_API.scene.fog = null; THREE_API.scene.traverse(o => { if (o.isMesh) o.material.needsUpdate = true; });');
await variant('04_exposure3', 'THREE_API.renderer.toneMappingExposure = 3;');
await variant('05_sun20', 'THREE_API.renderer.toneMappingExposure = 0.85; THREE_API.skyRig.sun.intensity = 20;');
await variant('06_noenv', 'THREE_API.skyRig.sun.intensity = 3.1; THREE_API.scene.environment = null; THREE_API.scene.traverse(o => { if (o.isMesh) { const m = o.material; if (m) { m.envMap = null; m.needsUpdate = true; } } });');
await variant('07_nosky', 'THREE_API.scene.traverse(o => { if (o.material && o.material.type === "ShaderMaterial" && o.material.fragmentShader && o.material.fragmentShader.includes("vSunDirection")) o.visible = false; });');
await variant('08_nosanitize', 'window.debugAPI.toggle("sanitize", false); window.debugAPI.toggle("bloom", false);');

await browser.close();
