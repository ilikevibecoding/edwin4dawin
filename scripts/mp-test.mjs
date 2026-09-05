// Multiplayer end-to-end test: starts server/index.mjs, launches headless clients through Vite and verifies
// replication, permissions, synchronized disasters, late-join replay and traffic.
//   node scripts/mp-test.mjs [--base http://localhost:5185] [--port 8765] [--idle 20]
// By default a private Vite dev server with HMR disabled is spawned on a free port (so files saved while the
// test runs cannot reload the test pages); pass --base to use an already running dev server instead. The game
// server uses port 8765 when it is free, otherwise a free port (or --port).
// Requires Chrome (see scripts/cdp.mjs).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const IDLE_SECONDS = parseFloat(args.idle || '20');
const ADMIN_TOKEN = 'test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => { const s = createServer(); s.unref(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PORT = args.port ? parseInt(args.port, 10) : (await portFree(8765) ? 8765 : await freePort());
const WS = `ws://localhost:${PORT}`;
async function portFree(port) { return new Promise((res) => { const s = createServer(); s.unref(); s.on('error', () => res(false)); s.listen(port, '127.0.0.1', () => s.close(() => res(true))); }); }

// ------------------------------------------------------------------------------------------- vite
let vite = null;
let BASE = args.base;
if (!BASE) {
  const vitePort = args.vitePort ? parseInt(args.vitePort, 10) : await freePort();
  const cfg = '/tmp/frontier-craft-mp-test.vite.config.mjs';
  writeFileSync(cfg, `export default { base: './', cacheDir: '/tmp/frontier-craft-mp-test-vite-cache', server: { hmr: false } };\n`);
  vite = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), '--config', cfg, '--port', String(vitePort), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let viteErr = '';
  vite.stderr.on('data', (d) => { viteErr += d; });
  BASE = `http://localhost:${vitePort}`;
  let up = false;
  for (let i = 0; i < 100 && !up && vite.exitCode === null; i++) { try { up = (await fetch(BASE + '/')).ok; } catch (e) { await sleep(200); } }
  if (!up) { console.log('FAIL  private vite dev server did not start\n' + viteErr); vite.kill('SIGKILL'); process.exit(1); }
  console.log(`vite: private dev server (HMR off) at ${BASE}`);
} else console.log(`vite: using ${BASE}`);
const results = [];
function report(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -  ' + detail : ''}`);
}
async function until(fn, timeoutMs, everyMs = 100) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeoutMs) { v = await fn(); if (v) return v; await sleep(everyMs); }
  return v;
}
const j = (o) => JSON.stringify(o);

// ------------------------------------------------------------------------------------------- server
const serverLines = [];
const server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT), ADMIN_TOKEN, STATS_INTERVAL: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', (d) => { for (const l of d.toString().split('\n')) if (l.trim()) serverLines.push(l.trim()); });
server.stderr.on('data', (d) => process.stderr.write('[server] ' + d));
server.on('exit', (code) => { if (!shuttingDown) { console.log(`FAIL  server exited early (code ${code})`); process.exit(1); } });
let shuttingDown = false;
const listening = await until(() => serverLines.some((l) => l.includes('listening')), 5000);
if (!listening) { console.log('FAIL  server did not start:\n' + serverLines.join('\n')); process.exit(1); }
console.log(`server: ${serverLines[serverLines.length - 1]}`);
const serverStats = async () => {
  const n = serverLines.length;
  server.kill('SIGUSR2');
  await until(() => serverLines.slice(n).some((l) => l.includes('[stats]')), 2000, 50);
  const line = [...serverLines].reverse().find((l) => l.includes('[stats]')) || '';
  const o = {};
  for (const m of line.matchAll(/(\w+)=(\S+)/g)) o[m[1]] = isNaN(+m[2]) ? m[2] : +m[2];
  return o;
};

// ------------------------------------------------------------------------------------------- clients
const pages = [];
async function client(label, query) {
  const url = `${BASE}/?server=${WS}${query}`;
  const t0 = Date.now();
  const p = await launchPage(url, { width: 960, height: 600 });
  p.label = label;
  pages.push(p);
  await p.waitForGame();
  await p.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
  console.log(`client ${label} loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s  (${url})`);
  return p;
}
const netState = (p) => p.evaluate('JSON.stringify({connected: game.net.connected, id: game.net.id, admin: game.net.admin, players: game.net.stats.players, visible: game.net.remote.visibleCount, replaying: game.net.replaying, isAdmin: game.permissions.isAdmin()})').then(JSON.parse);
const disasterState = (p) => p.evaluate('JSON.stringify({state: game.disasters.state, type: game.disasters.activeType, tick: game.disasters.tick, seed: game.disasters.active ? game.disasters.active.seed : null, serverTick: game.net.serverTick, expected: game.net._expectedDisasterTick(), fps: game.fps, now: Date.now()})').then(JSON.parse);
const stats = (p) => p.evaluate('JSON.stringify(game.net.stats)').then(JSON.parse);
const sampleAll = (ps) => Promise.all(ps.map(disasterState));

let exitCode = 0;
try {
  const [A, B] = await Promise.all([
    client('A (admin)', `&admin=${ADMIN_TOKEN}&x=-8&z=2`),
    client('B', '&x=-4&z=2'),
  ]);
  // connected, each knows about the other and has rendered at least one frame with the avatar
  const both = await until(async () => { const [a, b] = await Promise.all([netState(A), netState(B)]); return a.connected && b.connected && a.players >= 1 && b.players >= 1 && a.visible >= 1 && b.visible >= 1 ? [a, b] : null; }, 30000, 250);
  if (!both) throw new Error('clients did not connect / see each other: ' + j(await Promise.all([netState(A), netState(B)])));
  await sleep(1500); // let the avatars render a few more frames
  const [a1, b1] = await Promise.all([netState(A), netState(B)]);
  console.log(`A: ${j(a1)}\nB: ${j(b1)}`);

  // (1) both see one remote player
  report('1. both clients see exactly one remote player', a1.players === 1 && b1.players === 1 && a1.visible === 1 && b1.visible === 1 && a1.admin === true && b1.admin === false,
    `A players=${a1.players} visible=${a1.visible} admin=${a1.admin}; B players=${b1.players} visible=${b1.visible} admin=${b1.admin}`);

  // (2) block edit replication A -> B
  const before = await B.evaluate('game.world.getBlock(-6,58,4)');
  const tEdit = Date.now();
  await A.evaluate('game.world.setBlock(-6,58,4,9); game.onPlayerEdit(-6,58,4,9); "ok"');
  const got = await until(() => B.evaluate('game.world.getBlock(-6,58,4) === 9'), 2000, 50);
  report('2. block placed by A appears on B within 2 s', got === true, `B block before=${before} after=${await B.evaluate('game.world.getBlock(-6,58,4)')} (${Date.now() - tEdit} ms)`);

  // (3) non-admin cannot start a disaster
  const rB = await B.evaluate('JSON.stringify(game.disasters.command({type:"start",disaster:"tornado"}))').then(JSON.parse);
  const deniedBefore = await B.evaluate('game.net.denied');
  await B.evaluate('game.net.sendCommand({type:"start",disaster:"tornado"}); "ok"'); // bypass the client-side check: the server must refuse too
  const denied = await until(() => B.evaluate(`game.net.denied > ${deniedBefore}`), 2000, 50);
  await sleep(1000);
  const [sA3, sB3] = await sampleAll([A, B]);
  const isAdminB = await B.evaluate('game.permissions.isAdmin()');
  report('3. non-admin start is denied (local + server) and nothing runs', rB.ok === false && denied === true && sA3.state === 'idle' && sB3.state === 'idle' && isAdminB === false,
    `command() -> ${j(rB)}; server deny="${await B.evaluate('game.net.lastDeny')}"; states A=${sA3.state} B=${sB3.state}; B isAdmin=${isAdminB}`);

  // (4) admin starts a tornado: both run the same seed on the same tick
  const rA = await A.evaluate('JSON.stringify(game.disasters.command({type:"start",disaster:"tornado",seed:7}))').then(JSON.parse);
  const running = await until(async () => { const [a, b] = await sampleAll([A, B]); return a.state === 'running' && b.state === 'running' ? [a, b] : null; }, 3000, 100);
  let best = null;
  if (running) {
    await sleep(700);
    for (let i = 0; i < 3; i++) {
      const [a, b] = await sampleAll([A, B]);
      const d = Math.abs(a.tick - b.tick);
      console.log(`   sample ${i + 1}: A tick=${a.tick} (expected ${a.expected}, fps ${a.fps})  B tick=${b.tick} (expected ${b.expected}, fps ${b.fps})  |dTick|=${d}  clock skew ${Math.abs(a.now - b.now)} ms  seeds ${a.seed}/${b.seed}`);
      if (!best || d < best.d) best = { a, b, d };
      await sleep(500);
    }
  }
  report('4. admin start: both running, same seed, |tickA - tickB| <= 3', !!running && rA.ok === true && best && best.a.seed === 7 && best.b.seed === 7 && best.d <= 3,
    running ? `command() -> ${j(rA)}; seeds ${best.a.seed}/${best.b.seed}; ticks ${best.a.tick}/${best.b.tick} (|d|=${best.d})` : `not running within 3 s: ${j(await sampleAll([A, B]))}`);

  // (5) pause
  await sleep(1100);
  await A.evaluate('game.disasters.command({type:"pause"}); "ok"');
  const paused = await until(async () => { const [a, b] = await sampleAll([A, B]); return a.state === 'paused' && b.state === 'paused' ? [a, b] : null; }, 2000, 100);
  report('5. pause: both clients report paused', !!paused, paused ? `ticks frozen at ${paused[0].tick}/${paused[1].tick}` : j(await sampleAll([A, B])));

  // (6) reset
  await sleep(1100);
  await A.evaluate('game.disasters.command({type:"reset"}); "ok"');
  const idle = await until(async () => { const [a, b] = await sampleAll([A, B]); return a.state === 'idle' && b.state === 'idle' ? [a, b] : null; }, 5000, 100);
  report('6. reset: both clients report idle', !!idle, idle ? 'restored' : j(await sampleAll([A, B])));

  // (7) idle traffic
  const [sa0, sb0] = await Promise.all([stats(A), stats(B)]);
  await sleep(IDLE_SECONDS * 1000);
  const [sa1, sb1] = await Promise.all([stats(A), stats(B)]);
  const rate = (s0, s1) => ({ inKBs: +((s1.bytesIn - s0.bytesIn) / 1024 / IDLE_SECONDS).toFixed(2), outKBs: +((s1.bytesOut - s0.bytesOut) / 1024 / IDLE_SECONDS).toFixed(2), msgsInPerS: +((s1.msgsIn - s0.msgsIn) / IDLE_SECONDS).toFixed(1), msgsOutPerS: +((s1.msgsOut - s0.msgsOut) / IDLE_SECONDS).toFixed(1) });
  const ra = rate(sa0, sa1), rb = rate(sb0, sb1);
  const srv = await serverStats();
  console.log(`   A totals: ${j(sa1)}\n   B totals: ${j(sb1)}\n   A idle rate: ${j(ra)}\n   B idle rate: ${j(rb)}\n   server: ${j(srv)}`);
  report(`7. idle traffic per client < 4 KB/s over ${IDLE_SECONDS} s`, ra.inKBs < 4 && ra.outKBs < 4 && rb.inKBs < 4 && rb.outKBs < 4,
    `A in ${ra.inKBs} KB/s out ${ra.outKBs} KB/s; B in ${rb.inKBs} KB/s out ${rb.outKBs} KB/s; server msgsIn=${srv.msgsIn} msgsOut=${srv.msgsOut} bytesIn=${srv.bytesIn} bytesOut=${srv.bytesOut}`);

  // (8) late join: C connects while a tornado is running and must end up on the same tick
  await A.evaluate('game.disasters.command({type:"start",disaster:"tornado",seed:11}); "ok"');
  const runA = await until(() => disasterState(A).then((s) => (s.state === 'running' ? s : null)), 3000, 100);
  if (!runA) throw new Error('second tornado did not start on A: ' + j(await disasterState(A)));
  await sleep(4000);
  const C = await client('C (late)', '&x=-6&z=2');
  const cReady = await until(async () => { const n = await netState(C); const s = await disasterState(C); return n.connected && !n.replaying && s.state === 'running' ? { n, s } : null; }, 15000, 100);
  let bestC = null;
  if (cReady) {
    for (let i = 0; i < 3; i++) {
      const [a, c] = await sampleAll([A, C]);
      const d = Math.abs(a.tick - c.tick);
      console.log(`   sample ${i + 1}: A tick=${a.tick} (expected ${a.expected}, fps ${a.fps})  C tick=${c.tick} (expected ${c.expected}, fps ${c.fps})  |dTick|=${d}  seeds ${a.seed}/${c.seed}`);
      if (!bestC || d < bestC.d) bestC = { a, c, d };
      await sleep(500);
    }
  }
  const replayLog = C.consoleLines.find((l) => l.includes('late-join replay')) || '';
  report('8. late joiner C replays the running tornado: same seed, |tickA - tickC| <= 2', !!cReady && bestC && bestC.a.seed === 11 && bestC.c.seed === 11 && bestC.d <= 2,
    cReady ? `seeds ${bestC.a.seed}/${bestC.c.seed}; ticks ${bestC.a.tick}/${bestC.c.tick} (|d|=${bestC.d}); C sees ${cReady.n.players} players` : `C state: ${j(await netState(C))} ${j(await disasterState(C))}`);
  if (replayLog) console.log('   ' + replayLog);

  await sleep(1100);
  await A.evaluate('game.disasters.command({type:"reset"}); "ok"');
  await sleep(1000);
  for (const p of pages) {
    const ex = p.exceptions.filter((e) => !e.includes('AudioContext'));
    console.log(`${p.label}: ${ex.length} page exceptions${ex.length ? ':\n   ' + ex.slice(0, 3).join('\n   ') : ''}`);
    if (ex.length) exitCode = 1;
  }
} catch (e) {
  console.log('FAIL  test aborted: ' + (e.stack || e));
  exitCode = 1;
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} FAILED)` : ''}`);
shuttingDown = true;
for (const p of pages) p.close();
server.kill('SIGTERM');
await sleep(400);
console.log(serverLines.filter((l) => l.includes('[stats]')).slice(-1)[0] || '');
if (vite) vite.kill('SIGTERM');
process.exit(exitCode || (failed ? 1 : 0));
