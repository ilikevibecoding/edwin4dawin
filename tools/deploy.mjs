#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { copyFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Deploy the committed state to the live preview and prove it arrived.
//
//   node tools/deploy.mjs            build from HEAD, commit the bundle, push, smoke-test
//   node tools/deploy.mjs --check    smoke-test only
//
// The bundle is built from a clean worktree of HEAD, never from the working
// tree: with several agents editing at once the working tree is routinely
// half-finished, and a preview that "always points to the latest verified
// build" has to be built from something that was actually verified — which is
// what a commit is.
//
// The smoke test opens the public link in a real browser, waits for the game to
// boot, and reads the build revision back out of the running page. Matching
// that against HEAD is what turns "I pushed" into "it is live".
// ---------------------------------------------------------------------------

const REPO = 'ilikevibecoding/edwin4dawin';
const BRANCH = 'cursor/offroad-truck-forza-demo-8461';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/demo/index.html`;
export const LIVE = `https://htmlpreview.github.io/?${RAW}`;

// the bundle is over a megabyte and `git show` returns it whole
const sh = (cmd, opts = {}) =>
  execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024, ...opts })
    .toString()
    .trim();
const checkOnly = process.argv.includes('--check');

if (!checkOnly) {
  const head = sh('git rev-parse --short=7 HEAD');
  console.log(`[deploy] building bundle from clean worktree of ${head}`);
  sh('rm -rf /tmp/deploy && git worktree prune && git worktree add -q /tmp/deploy HEAD');
  sh('ln -s /workspace/node_modules /tmp/deploy/node_modules');
  sh('npx vite build --config vite.config.single.js', { cwd: '/tmp/deploy' });
  await copyFile('/tmp/deploy/demo/index.html', 'demo/index.html');
  sh('git worktree remove --force /tmp/deploy');
  const stamped = (await readFile('demo/index.html', 'utf8')).match(/build ([0-9a-f]+\+?)/)?.[1];
  if (stamped !== head) throw new Error(`bundle stamped ${stamped}, expected ${head}`);
  const changed = sh('git status --porcelain demo/index.html') !== '';
  if (changed) {
    sh(`git add demo/index.html && git commit -q -m "Bundle: ${head}"`);
    console.log(`[deploy] committed bundle ${head}`);
  } else {
    console.log('[deploy] bundle unchanged');
  }
  sh(`git push -u origin ${BRANCH}`);
  console.log('[deploy] pushed');
}

// The raw file and the live page have to agree with each other and with HEAD.
const expect = sh('git show HEAD:demo/index.html').match(/build ([0-9a-f]+\+?)/)?.[1];
let raw = null;
for (let i = 0; i < 6 && raw !== expect; i++) {
  if (i) await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(RAW, { cache: 'no-store' }).catch(() => null);
  raw = res?.ok ? (await res.text()).match(/build ([0-9a-f]+\+?)/)?.[1] ?? null : null;
}
console.log(`[deploy] raw file serves build ${raw ?? 'n/a'} (expected ${expect})`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const t0 = Date.now();
await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 });
const ready = await page
  .waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 300000 })
  .then(() => true)
  .catch(() => false);
const live = await page.evaluate(() => ({
  build: window.debugAPI?.build?.rev ?? null,
  ready: window.__READY__ === true,
  error: window.__ERROR__ ? String(window.__ERROR__).slice(0, 200) : null,
  canvas: !!document.querySelector('canvas'),
  hudRev: document.getElementById('hud-rev')?.textContent ?? null,
}));
await browser.close();

console.log(`[deploy] live page: ready=${live.ready} build=${live.build} hud="${live.hudRev}" in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (errors.length) console.log(`[deploy] page errors: ${errors.slice(0, 3).join(' | ')}`);
const ok = ready && live.ready && live.build === expect && errors.length === 0;
console.log(ok ? `[deploy] OK — ${LIVE}` : `[deploy] FAILED`);
if (live.error) console.log('[deploy]', live.error);
process.exit(ok ? 0 : 1);
