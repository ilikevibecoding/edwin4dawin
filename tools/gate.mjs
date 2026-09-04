#!/usr/bin/env node
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// The landing gate. Builds HEAD plus a named set of working-tree files in a
// throwaway worktree, serves the bundle, boots it at every quality tier and
// counts shader and page errors, then runs the camera checks.
//
//   node tools/gate.mjs --files src/sky.js,src/post.js,src/campground
//   node tools/gate.mjs --files src/vehicle --tiers fast --interact
//   node tools/gate.mjs                        # HEAD alone
//
// Why a worktree: several builders edit one checkout at once, so a build of the
// working tree tests everyone's half-finished work together and a failure
// cannot be pinned on the files being landed. Why every tier: the shader
// patches in sky.js are installed per tier (PCSS only at high and ultra), and
// a gate that booted `fast` alone passed a cascade that broke 107 programs at
// `high`. A program that fails to compile is not always a page error — three
// logs it and carries on with the program invalid — so link status is read
// back from every program as well as the console.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const files = (arg('files', '') || '').split(',').filter(Boolean);
const tiers = arg('tiers', 'fast,high,ultra').split(',').filter(Boolean);
const port = Number(arg('port', '5199'));
const dir = arg('dir', '/tmp/gate');
const interact = argv.includes('--interact');
const keep = argv.includes('--keep');
const root = process.cwd();

const log = (...a) => console.log('[gate]', ...a);
let failed = false;
const fail = (msg) => {
  failed = true;
  console.log(`  FAIL  ${msg}`);
};
const pass = (msg) => console.log(`  PASS  ${msg}`);

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}` };
};

// --- worktree ---------------------------------------------------------------
if (existsSync(dir)) {
  sh('git', ['worktree', 'remove', '--force', dir], { cwd: root });
  rmSync(dir, { recursive: true, force: true });
}
const add = sh('git', ['worktree', 'add', '--detach', dir, 'HEAD'], { cwd: root });
if (!add.ok) {
  console.error(add.out);
  process.exit(2);
}
const head = sh('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).out.trim();
for (const f of files) {
  const src = path.resolve(root, f);
  const dst = path.join(dir, f);
  if (!existsSync(src)) {
    fail(`no such file to land: ${f}`);
    continue;
  }
  mkdirSync(path.dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
}
symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
const status = sh('git', ['status', '--short'], { cwd: dir })
  .out.split('\n')
  .filter((l) => l && !l.includes('node_modules'));
log(`HEAD ${head} + ${files.length} path${files.length === 1 ? '' : 's'}:`);
for (const l of status) console.log(`        ${l}`);

// --- build ------------------------------------------------------------------
const build = sh('npx', ['vite', 'build'], { cwd: dir });
if (build.ok) pass(`vite build (${(build.out.match(/built in [^\n]+/) || [''])[0]})`);
else {
  fail('vite build');
  console.log(build.out);
  cleanup();
  process.exit(1);
}

// --- serve ------------------------------------------------------------------
const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: dir, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}/`;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(base);
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

// --- boot every tier --------------------------------------------------------
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const noise = /willReadFrequently|toNonIndexed/;
for (const tier of tiers) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !noise.test(m.text())) errors.push(m.text().split('\n')[0].slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${(e.message || String(e)).slice(0, 200)}`));
  const t0 = Date.now();
  try {
    await page.goto(`${base}?quality=${tier}&capture=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
    const info = await page.evaluate(() => {
      const r = window.debugAPI.objects.renderer;
      const gl = r.getContext();
      let unlinked = 0;
      for (const p of r.info.programs) if (!gl.getProgramParameter(p.program, gl.LINK_STATUS)) unlinked++;
      return { programs: r.info.programs.length, unlinked, textures: r.info.memory.textures, error: window.__ERROR__ || null };
    });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const summary = `${tier}: ${info.programs} programs, ${info.textures} textures, booted in ${secs}s`;
    if (info.error) fail(`${summary} — boot error ${info.error}`);
    else if (info.unlinked) fail(`${summary} — ${info.unlinked} programs failed to link`);
    else if (errors.length) fail(`${summary} — ${errors.length} console/page errors`);
    else pass(summary);
    const shown = [...new Set(errors)].slice(0, 4);
    for (const e of shown) console.log(`          ${e}`);
  } catch (e) {
    fail(`${tier}: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();

// --- camera checks ----------------------------------------------------------
if (interact) {
  const r = sh('node', ['tools/interact.mjs', '--url', `${base}?quality=fast`, '--out', path.join(dir, 'interact')], { cwd: root });
  const fails = r.out.split('\n').filter((l) => /^\s+FAIL/.test(l));
  if (r.ok && fails.length === 0 && /all checks passed/.test(r.out)) pass('interact: all checks passed');
  else {
    fail(`interact: ${fails.length ? fails.join(' | ') : r.out.split('\n').slice(-6).join(' | ')}`);
  }
}

cleanup();
log(failed ? 'NOT CLEAR' : 'CLEAR');
process.exit(failed ? 1 : 0);

function cleanup() {
  try {
    preview?.kill();
  } catch {}
  if (keep) log(`worktree kept at ${dir}`);
  else {
    sh('git', ['worktree', 'remove', '--force', dir], { cwd: root });
    rmSync(dir, { recursive: true, force: true });
  }
}
