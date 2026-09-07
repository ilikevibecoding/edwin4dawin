#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// Hide one group at a time and re-render the same view, so an unexplained
// artifact can be attributed to a specific mesh instead of guessed at.
//
//   node tools/isolate.mjs --view road --width 520

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5173/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const view = arg('view', 'road');
const width = Number(arg('width', '520'));
const height = Math.round((width * 9) / 16);

await mkdir('shots/isolate', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

// what is in the forest group, by name and instance count
console.log(
  JSON.stringify(
    await page.evaluate(() => {
      const { forest, scene } = window.debugAPI.objects;
      const out = [];
      forest.group.traverse((o) => {
        if (o.isMesh) out.push({ name: o.name || o.type, count: o.count ?? 1, mat: o.material?.name || '' });
      });
      const top = [];
      scene.children.forEach((c) => top.push(c.name || c.type));
      return { forest: out, sceneTop: top };
    }),
    null,
    1,
  ),
);

async function shot(label, hider) {
  const { dataUrl } = await page.evaluate(
    ([code, v]) => {
      const objs = window.debugAPI.objects;
      // eslint-disable-next-line no-new-func
      new Function('O', code)(objs);
      window.debugAPI.setView(v);
      return { dataUrl: window.debugAPI.captureFrame(1) };
    },
    [hider, view],
  );
  await writeFile(`shots/isolate/${view}_${label}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', `shots/isolate/${view}_${label}.png`);
}

const showAll = `
  O.forest.group.traverse(o => { if (o.isMesh) o.visible = true; });
  O.scene.traverse(o => { if (o.name === 'wheelDust' || o.type === 'Points') o.visible = true; });
`;

await shot('0_all', showAll);
await shot('1_nodust', showAll + `
  O.scene.traverse(o => { if (o.type === 'Points' || /dust/i.test(o.name)) o.visible = false; });
`);
await shot('2_nobillboards', showAll + `
  O.forest.group.traverse(o => { if (/billboard|far/i.test(o.name)) o.visible = false; });
`);
await shot('3_nohorizon', showAll + `
  O.forest.group.traverse(o => { if (/skirt|treeline|ridge/i.test(o.name)) o.visible = false; });
`);
await shot('4_noforestatall', showAll + `O.forest.group.visible = false;`);

await browser.close();
