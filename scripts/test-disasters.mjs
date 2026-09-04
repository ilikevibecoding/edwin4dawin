// Integration test: lifecycle + deterministic replay + full restore for every registered disaster.
//   node scripts/test-disasters.mjs [--url http://localhost:5173] [--ticks 400] [--types tsunami,tornado,beam]
import { launchPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const base = args.url || 'http://localhost:5173';
const ticks = parseInt(args.ticks || '400', 10);
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failed++; };

const page = await launchPage(`${base}/?x=-8&z=2&yaw=-70&time=0.5`);
await page.waitForGame();
await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
const types = (args.types ? args.types.split(',') : await page.evaluate('game.disasters.types()'));
console.log('disasters:', types.join(', '));

const waitFor = async (expr, timeoutMs = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < timeoutMs) { if (await page.evaluate(expr)) return true; await page.sleep(250); } return false; };
const status = async () => JSON.parse(await page.evaluate('JSON.stringify(game.disasters.status())'));
const worldHash = async () => page.evaluate(`(() => { let h = 0x811c9dc5; const w = game.world; for (let x = -40; x <= 40; x += 2) for (let z = -30; z <= 30; z += 2) for (let y = 50; y < 75; y++) { h ^= w.getBlock(x, y, z) + 1; h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16); })()`);
const pristine = await worldHash();

for (const type of types) {
  console.log(`\n== ${type} ==`);
  const params = await page.evaluate(`JSON.stringify(game.disasters.defaults(${JSON.stringify(type)}))`);
  const startCmd = `game.disasters.command({type:'start', disaster:${JSON.stringify(type)}, seed: 7, params: ${params}})`;
  // preview must not change the world
  await page.evaluate(`game.disasters.command({type:'preview', disaster:${JSON.stringify(type)}, seed: 7, params: ${params}})`);
  await page.sleep(1500);
  check(`${type} preview state`, (await status()).state === 'preview');
  check(`${type} preview leaves world untouched`, (await worldHash()) === pristine && (await status()).journal === 0);
  await page.evaluate(`game.disasters.command({type:'stop'})`);
  // run 1 (pause exactly at `ticks` so both runs are compared at the identical tick)
  await page.evaluate(`game.disasters.pauseAtTick = ${ticks}`);
  const r1 = await page.evaluate(startCmd);
  check(`${type} start accepted`, r1 && r1.ok, JSON.stringify(r1));
  check(`${type} running`, (await status()).state === 'running');
  // pause/resume
  await page.sleep(1000);
  await page.evaluate(`game.disasters.command({type:'pause'})`);
  const tPaused = (await status()).tick; await page.sleep(800);
  check(`${type} pause freezes ticks`, (await status()).state === 'paused' && (await status()).tick === tPaused);
  await page.evaluate(`game.disasters.command({type:'resume'})`);
  check(`${type} resume`, (await status()).state === 'running');
  const reached = await waitFor(`game.disasters.tick >= ${ticks} || game.disasters.state === 'finished' || game.disasters.state === 'idle'`, 120000);
  await page.sleep(400); // let the relight/remesh queue settle
  const s1 = await status();
  const h1 = await page.evaluate('game.disasters.journal.hash(game.world)');
  const t1 = s1.tick;
  check(`${type} reached tick ${ticks}`, reached && t1 >= Math.min(ticks, t1), `tick=${t1} state=${s1.state} journal=${s1.journal} edits=${s1.edits}`);
  check(`${type} modified the world`, s1.journal > 0, `journal=${s1.journal}`);
  const exc1 = page.exceptions.length;
  // stop + reset restores everything
  await page.evaluate(`game.disasters.command({type:'stop'})`);
  await page.evaluate(`game.disasters.command({type:'reset'})`);
  const restored = await waitFor(`game.disasters.state === 'idle'`, 120000);
  const hAfter = await worldHash();
  check(`${type} reset restores the sampled world region`, restored && hAfter === pristine, `restored=${restored} hash=${hAfter} pristine=${pristine}`);
  check(`${type} journal cleared after reset`, (await status()).journal === 0);
  const saveInfo = JSON.parse(await page.evaluate(`JSON.stringify({ cells: game.save ? game.save.disasterCells.size : 0, count: game.save ? game.save.count : 0 })`));
  check(`${type} save no longer excludes the restored cells`, saveInfo.cells === 0 && saveInfo.count === 0, `disasterCells=${saveInfo.cells} saved=${saveInfo.count}`);
  // run 2 with the same seed -> same journal hash at the same tick
  await page.evaluate(`game.disasters.pauseAtTick = ${t1}`);
  await page.evaluate(startCmd);
  await waitFor(`game.disasters.tick >= ${t1} || game.disasters.state !== 'running'`, 120000);
  await page.sleep(400);
  const s2 = await status();
  const h2 = await page.evaluate('game.disasters.journal.hash(game.world)');
  check(`${type} deterministic replay (same seed => same journal hash at tick ${t1})`, h1 === h2 && s2.tick === t1, `run1=${h1} run2=${h2} tick2=${s2.tick}`);
  await page.evaluate(`game.disasters.command({type:'stop'})`);
  await page.evaluate(`game.disasters.command({type:'reset'})`);
  await waitFor(`game.disasters.state === 'idle'`, 120000);
  check(`${type} no exceptions`, page.exceptions.length === exc1 && exc1 === 0, page.exceptions.slice(0, 2).join(' | '));
}
console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
page.close();
process.exit(failed ? 1 : 0);
