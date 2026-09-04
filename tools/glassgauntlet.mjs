#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// The glass gauntlet: every condition the car glass has to survive, shot in one
// page load, each frame measured.
//
//   node tools/glassgauntlet.mjs --round 3 --out shots/glass_3 \
//     --url "http://127.0.0.1:5197/?quality=fast" [--width 320 --height 180]
//     [--only ws_close,interior] [--sheet 4]
//
// Conditions: windscreen close and medium, door glass on the sun side and the
// shade side, the driver's view out, the passenger glass from inside, the rear
// glass through the dust plume, the door mirror, dusk, night from inside with
// the lamps on, night from outside, and a moving pair. Camera positions are in
// the truck's local frame, like VIEWS.
//
// The numbers, per frame, come from a hide-and-diff: the frame is rendered
// once with the glass and once without, and the pixels that changed are the
// glass. Over that region:
//
//   cover   how much of the frame the glass occupies
//   veil    mean luma with the glass minus mean luma of what is behind it. A
//           pane adds a little; a milky one adds a lot; a negative value means
//           the tint is doing more than the reflection
//   see     correlation between the lit frame and the background inside the
//           region. 1 is a pane you look straight through, 0 is a wall
//   spread  10-90 percentile luma spread inside the region. A pane that holds
//           one value has no gradient and reads as a decal
//   hot     fraction of glass pixels over 0.94
//   flick   mean abs difference of the glass region between two renders with a
//           2 mm camera shift (or two sim steps for the moving shot). Sorting
//           swaps and z-fights show up here as a number instead of a maybe
//
// Every frame is also tiled into one contact sheet so a round is one image.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const round = arg('round', '0');
const outDir = arg('out', path.join('shots', `glass_${round}`));
const width = Number(arg('width', '320'));
const height = Number(arg('height', '180'));
const url = arg('url', 'http://127.0.0.1:5197/?quality=fast') + '&capture=1';
const only = arg('only', '').split(',').filter(Boolean);
const sheetCols = Number(arg('sheet', '4'));
const glassRe = arg('glass', '_(glass|glassDark|glassSide|glassEdge|mirrorGlass|cabinGlass)(_|$)');

// `side: 'sun' | 'shade'` mirrors x onto whichever flank the key light hits.
const SHOTS = [
  { name: 'ws_close', pos: [0.95, 1.95, 2.75], target: [0.15, 1.7, 0.7], fov: 30 },
  { name: 'ws_mid', pos: [2.7, 1.75, 5.6], target: [0.0, 1.6, 0.6], fov: 22 },
  { name: 'side_sun', side: 'sun', pos: [2.15, 1.72, 0.55], target: [0.85, 1.66, 0.42], fov: 34 },
  { name: 'side_shade', side: 'shade', pos: [2.15, 1.72, 0.55], target: [0.85, 1.66, 0.42], fov: 34 },
  { name: 'interior', pos: [0.3, 1.6, -0.16], target: [0.2, 1.24, 9.0], fov: 62 },
  { name: 'int_side', pos: [0.38, 1.55, 0.0], target: [-0.95, 1.62, 0.45], fov: 58 },
  // through the slot between the bed gear (fridge lid 1.59) and the rack (2.07),
  // past the spare on the swing-out
  { name: 'rear_dust', pos: [-0.55, 1.95, -3.2], target: [0.05, 1.7, -0.79], fov: 26 },
  // the head is toed in 13 degrees off straight outboard, so its face is read
  // from outboard and a little aft
  { name: 'mirror', pos: [2.25, 1.68, 0.2], target: [1.13, 1.615, 0.8], fov: 16 },
  { name: 'dusk_ws', time: 'dusk', pos: [2.7, 1.75, 5.6], target: [0.0, 1.6, 0.6], fov: 22 },
  { name: 'night_int', time: 'night', lights: true, pos: [0.3, 1.6, -0.16], target: [0.2, 1.24, 9.0], fov: 62 },
  { name: 'night_ext', time: 'night', lights: true, pos: [3.6, 1.7, 4.2], target: [0.1, 1.45, 0.5], fov: 30 },
  { name: 'moving', moving: 6, pos: [2.7, 1.75, 5.6], target: [0.0, 1.6, 0.6], fov: 22 },
];

const log = (...a) => console.log('[glass]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  // A module that fails to import never reaches `__ERROR__`, so a boot-time
  // page error is given a short grace and then treated as fatal — with seven
  // agents editing the tree, a half-saved file is the common way a run dies.
  let bootError = null;
  let fail;
  const failed = new Promise((_, reject) => (fail = reject));
  page.on('pageerror', (e) => {
    log('page error:', e.message);
    if (!bootError) {
      bootError = e.message;
      setTimeout(() => fail(new Error(`boot: ${e.message}`)), 20000);
    }
  });
  page.on('console', (m) => {
    if (m.type() === 'error') log('console:', m.text());
  });
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await Promise.race([
    page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 }),
    failed,
  ]);
  failed.catch(() => {}); // a late error after boot is logged, not fatal
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) throw new Error(err);
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const shots = only.length ? SHOTS.filter((s) => only.includes(s.name)) : SHOTS;
  await page.evaluate(
    ({ cols, n, w, h }) => {
      window.debugAPI.setView('hero');
      const sheet = document.createElement('canvas');
      sheet.width = cols * w;
      sheet.height = Math.ceil(n / cols) * h;
      window.__sheet = { c: sheet, i: 0, cols, w, h };
    },
    { cols: sheetCols, n: shots.length, w: width, h: height },
  );

  const rows = [];
  for (const s of shots) {
    const ts = Date.now();
    const res = await page.evaluate(
      ({ s, glassRe }) => {
        const api = window.debugAPI;
        const { camera, vehicle, scene, renderer } = api.objects;
        const re = new RegExp(glassRe);

        if (api.timeOfDay !== (s.time || 'day')) api.setTimeOfDay(s.time || 'day');
        api.setLights(!!s.lights);

        vehicle.root.updateMatrixWorld(true);
        const M = vehicle.root.matrixWorld;
        const e = M.elements;
        const xf = (v) => [
          e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12],
          e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13],
          e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14],
        ];
        // which flank the key light lands on, in truck space
        let sunX = 1;
        scene.traverse((o) => {
          if (o.isDirectionalLight && o.intensity > 0 && o.visible) {
            const d = o.position.clone().sub(o.target.position).normalize();
            const lx = d.x * e[0] + d.y * e[1] + d.z * e[2];
            sunX = lx >= 0 ? 1 : -1;
          }
        });
        const flip = s.side ? (s.side === 'sun' ? sunX : -sunX) : 1;
        const pos = [s.pos[0] * flip, s.pos[1], s.pos[2]];
        const target = [s.target[0] * flip, s.target[1], s.target[2]];
        const place = (dx = 0) => {
          const p = xf([pos[0] + dx, pos[1], pos[2] + dx]);
          const t = xf(target);
          camera.position.set(p[0], p[1], p[2]);
          camera.fov = s.fov;
          camera.near = 0.02;
          camera.lookAt(t[0], t[1], t[2]);
          camera.updateProjectionMatrix();
        };
        const grab = () => {
          api.renderFrames(1);
          const gl = renderer.domElement;
          const c = document.createElement('canvas');
          c.width = gl.width;
          c.height = gl.height;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(gl, 0, 0);
          return { data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
        };
        const luma = (d, i) => (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;

        place();
        const A = grab();
        const dataUrl = renderer.domElement.toDataURL('image/png');
        // tile into the sheet
        {
          const S = window.__sheet;
          const ctx = S.c.getContext('2d');
          const x = (S.i % S.cols) * S.w;
          const y = Math.floor(S.i / S.cols) * S.h;
          ctx.drawImage(renderer.domElement, x, y, S.w, S.h);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(x, y, 8 + s.name.length * 7, 14);
          ctx.fillStyle = '#fff';
          ctx.font = '11px monospace';
          ctx.fillText(s.name, x + 4, y + 11);
          S.i++;
        }

        // second render: a camera nudge, or a few sim steps for the moving shot
        let B;
        if (s.moving) {
          // A longer pre-roll moves the truck on by a few frames; the camera is
          // re-attached to it, so the pane is compared against itself with the
          // world moving behind it rather than against a shifted frame
          api.setView('hero', { preroll: 170 + s.moving });
          vehicle.root.updateMatrixWorld(true);
          place();
          B = grab();
        } else {
          place(0.002);
          B = grab();
        }
        place();

        // hide the glass and render the background. For the moving shot the
        // world has moved on between A and B, so the hide-and-diff is taken
        // against B, which is the state the scene is still in.
        const hidden = [];
        scene.traverse((o) => {
          if (o.isMesh && o.visible && re.test(o.name)) {
            o.visible = false;
            hidden.push(o);
          }
        });
        const G = grab();
        for (const o of hidden) o.visible = true;
        const W = s.moving ? B : A;

        const n = A.w * A.h;
        let frameSum = 0;
        let peak = 0;
        let clip = 0;
        let cover = 0;
        let withSum = 0;
        let bgSum = 0;
        let hot = 0;
        let flick = 0;
        const withL = [];
        const bgL = [];
        for (let i = 0; i < n; i++) {
          const la = luma(W.data, i);
          frameSum += la;
          if (la > peak) peak = la;
          if (la > 0.94) clip++;
          const d =
            Math.abs(W.data[i * 4] - G.data[i * 4]) +
            Math.abs(W.data[i * 4 + 1] - G.data[i * 4 + 1]) +
            Math.abs(W.data[i * 4 + 2] - G.data[i * 4 + 2]);
          if (d < 9) continue;
          cover++;
          const lg = luma(G.data, i);
          withSum += la;
          bgSum += lg;
          withL.push(la);
          bgL.push(lg);
          if (la > 0.94) hot++;
          flick += Math.abs(luma(A.data, i) - luma(B.data, i));
        }
        let see = 0;
        let spread = 0;
        if (cover > 8) {
          const mw = withSum / cover;
          const mb = bgSum / cover;
          let sxy = 0;
          let sxx = 0;
          let syy = 0;
          for (let i = 0; i < cover; i++) {
            const a = withL[i] - mw;
            const b = bgL[i] - mb;
            sxy += a * b;
            sxx += a * a;
            syy += b * b;
          }
          see = sxx > 1e-9 && syy > 1e-9 ? sxy / Math.sqrt(sxx * syy) : 0;
          const sorted = withL.slice().sort((p, q) => p - q);
          spread = sorted[Math.floor(cover * 0.9)] - sorted[Math.floor(cover * 0.1)];
        }
        return {
          dataUrl,
          mean: frameSum / n,
          peak,
          clipPct: (clip / n) * 100,
          cover: (cover / n) * 100,
          veil: cover ? withSum / cover - bgSum / cover : 0,
          withLuma: cover ? withSum / cover : 0,
          bgLuma: cover ? bgSum / cover : 0,
          see,
          spread,
          hot: cover ? hot / cover : 0,
          flick: cover ? flick / cover : 0,
          hiddenCount: hidden.length,
        };
      },
      { s, glassRe },
    );
    await writeFile(path.join(outDir, `${s.name}.png`), Buffer.from(res.dataUrl.split(',')[1], 'base64'));
    const row = { name: s.name, ...res };
    delete row.dataUrl;
    rows.push(row);
    log(
      `${s.name.padEnd(11)} panes ${String(res.hiddenCount).padStart(2)} cover ${res.cover.toFixed(1).padStart(5)}%  glass ${res.withLuma.toFixed(3)} bg ${res.bgLuma
        .toFixed(3)}  veil ${(res.veil >= 0 ? '+' : '') + res.veil.toFixed(3)}  see ${res.see.toFixed(2)}  spread ${res.spread
        .toFixed(3)}  hot ${(res.hot * 100).toFixed(1)}%  flick ${res.flick.toFixed(3)}  | frame ${res.mean.toFixed(3)} clip ${res.clipPct
        .toFixed(2)}%  (${((Date.now() - ts) / 1000).toFixed(0)}s)`,
    );
  }

  await page.evaluate(() => {
    window.debugAPI.setTimeOfDay('day');
    window.debugAPI.setLights(false);
  });
  const sheet = await page.evaluate(() => window.__sheet.c.toDataURL('image/png'));
  await writeFile(path.join(outDir, 'sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
  await writeFile(path.join(outDir, 'metrics.json'), JSON.stringify({ round, rows }, null, 2));
  log(`sheet -> ${path.join(outDir, 'sheet.png')}  (${((Date.now() - t0) / 1000).toFixed(0)}s total)`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
