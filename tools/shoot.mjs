/**
 * Headless screenshot harness.
 *
 * Renders deterministic frames through Chrome + SwiftShader so image quality can
 * be reviewed without a GPU.
 *
 *   node tools/shoot.mjs --shots=lookdev@2 --w=1280 --h=720 --q=high --out=shots/run1
 *   node tools/shoot.mjs --shots="still@0.4" --extra="chapter=ch1&shot=two"
 */
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=') === '' ? 'true' : v.join('=')];
    })
);

const BASE = args.base ?? 'http://localhost:5173';
const W = Number(args.w ?? 1280);
const H = Number(args.h ?? 720);
const Q = args.q ?? 'medium';
const OUT = args.out ?? 'shots/latest';
const TIMEOUT = Number(args.timeout ?? 900000);
const EXTRA = args.extra ?? '';

const shots = (args.shots ?? 'lookdev@2')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [scene, t] = s.split('@');
    return { scene, t: Number(t ?? 2) };
  });

function findChrome() {
  for (const c of [process.env.CHROME_PATH, '/usr/local/bin/google-chrome', '/usr/bin/google-chrome']) {
    if (c && existsSync(c)) return c;
  }
  return undefined;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    protocolTimeout: TIMEOUT + 60000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      '--mute-audio',
      `--window-size=${W},${H}`,
      '--js-flags=--max-old-space-size=4096',
    ],
  });

  const results = [];
  try {
    for (const shot of shots) {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      const logs = [];
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
      });
      page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

      const url = `${BASE}/?shot=1&scene=${encodeURIComponent(shot.scene)}&t=${shot.t}&w=${W}&h=${H}&q=${Q}${
        EXTRA ? '&' + EXTRA : ''
      }`;
      const label = `${shot.scene}_t${String(shot.t).replace('.', 'p')}`;
      process.stdout.write(`-> ${label} ... `);
      const started = Date.now();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForFunction('window.__READY__ === true || window.__ERROR__', { timeout: TIMEOUT, polling: 500 });
        const err = await page.evaluate('window.__ERROR__ || null');
        if (err) throw new Error(err);
        const file = path.join(OUT, `${label}.png`);
        // Capture the whole page so the DOM interface layer is included
        await page.screenshot({ path: file, captureBeyondViewport: false });
        const stats = await page.evaluate(() => {
          const s = window.__STAGE__;
          if (!s) return null;
          return {
            tier: s.tier,
            frames: s.frameCount,
            elapsed: Number(s.elapsed.toFixed(3)),
            scene: window.__SCENESTATS__ ?? null,
            frameMs: (window.__FRAMEMS__ ?? []).slice(0, 4),
          };
        });
        console.log(`ok  ${((Date.now() - started) / 1000).toFixed(1)}s  ${file}`);
        if (stats) console.log(`     ${JSON.stringify(stats)}`);
        results.push({ label, file, stats, logs: logs.slice(0, 30), ok: true });
      } catch (e) {
        console.log(`FAIL (${((Date.now() - started) / 1000).toFixed(1)}s)`);
        console.log(`     ${String(e.message).slice(0, 600)}`);
        if (logs.length) console.log('     logs:\n' + logs.slice(0, 20).map((l) => '       ' + l).join('\n'));
        results.push({ label, ok: false, error: String(e.message), logs: logs.slice(0, 30) });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length}/${results.length} shots failed`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${results.length} shots captured -> ${OUT}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
