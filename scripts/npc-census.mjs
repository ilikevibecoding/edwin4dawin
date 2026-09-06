// Coruscant crowd census over CDP (rubric 07 rows 4, 6, 10, 11): loads 5 vantage points x 3 times of day in headless
// Chrome, lets the population settle, and reports per view the visible / live / walking / stuck citizens and the
// failed transitions (trips that had to be retargeted, path legs that failed), plus draw calls and heap.
//   node scripts/npc-census.mjs --url http://localhost:5214/ [--wait 20000] [--out /tmp/npc-census.json] [--rd 8]
//   optional: --spots '[{"name":"x","x":2975,"z":120,"y":97.2,"yaw":0,"pitch":-2}]'  --times '0.5,0.8,0'
// One headless Chrome at a time (software GL); ~25 s per view.
import { launchPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const base = args.url || 'http://localhost:5214/';
const wait = parseInt(args.wait || '20000', 10);
const out = args.out || '/tmp/npc-census.json';
const rd = args.rd || '8';
// the five vantage points: Senate plaza, market plaza, financial plaza (the core districts: boulevard decks, feet 97),
// the Uscru undercity strip (ground, feet 61) and the spaceport apron between the pad pairs (deck, feet 97)
const SPOTS = args.spots ? JSON.parse(args.spots) : [
  { name: 'senate_plaza', x: 2975, z: 120, y: 97.2, yaw: 0, pitch: -2, core: true },
  { name: 'market_plaza', x: 2806, z: -34, y: 97.2, yaw: 0, pitch: -2, core: true },
  { name: 'financial_plaza', x: 3352, z: -34, y: 97.2, yaw: 0, pitch: -2, core: true },
  { name: 'undercity_strip', x: 2748, z: 386, y: 61.2, yaw: 0, pitch: 3, core: false },
  { name: 'spaceport_apron', x: 2616, z: -62, y: 97.2, yaw: 90, pitch: -4, core: false },
];
const TIMES = (args.times || '0.5,0.8,0').split(',').map(Number);   // noon, 19:12, midnight
const label = (t) => { const h = (t * 24) % 24; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; };

const CENSUS = `(function(){ const pop = game.coruscant && game.coruscant.population; if (!pop) return { error: 'no population' };
  const c = pop.census(); delete c.jobs; delete c.modes; delete c.legsFailedBy;
  c.draws = game.renderer.info.render.calls; c.heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1;
  c.townNpcs = game.npcs ? game.npcs.list.length : -1; c.jsAvg = game.perf && game.perf.snapshot ? game.perf.snapshot().jsAvg : null;
  return c; })()`;

const rows = [];
let bad = 0;
for (const t of TIMES) for (const s of SPOTS) {
  const q = `?x=${s.x}&z=${s.z}&y=${s.y}&yaw=${s.yaw}&pitch=${s.pitch}&fly=1&time=${t}&quality=light&rd=${rd}`;
  const page = await launchPage(base + q, { width: 1280, height: 720 });
  const row = { spot: s.name, core: !!s.core, time: label(t), t };
  try {
    await page.waitForGame(180000);
    await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
    await page.sleep(wait);
    const c = await page.evaluate(`JSON.stringify(${CENSUS})`);
    Object.assign(row, JSON.parse(c));
    row.exceptions = page.exceptions.length;
    if (row.error || page.exceptions.length) bad++;
  } catch (e) { row.error = e.message; bad++; }
  page.close();
  rows.push(row);
  const r = row;
  console.log(`${r.spot.padEnd(16)} ${r.time}  live ${String(r.live ?? '-').padStart(3)}  visible ${String(r.visible ?? '-').padStart(3)} (outdoors ${String(r.visibleOutdoors ?? '-').padStart(3)})  within96 ${String(r.within96 ?? '-').padStart(3)}  unseen indoors/other level ${r.unseenIndoors ?? '-'}/${r.otherLevel ?? '-'}  walking ${String(r.walking ?? '-').padStart(3)}  stuck ${r.stuckNow ?? '-'}/${r.stuck ?? '-'}  trips ${r.trips ?? '-'} failed ${r.tripsFailed ?? '-'} retargets ${r.retargets ?? '-'} (${r.failRate != null ? (r.failRate * 100).toFixed(1) + '%' : '-'})  legs ${r.legs ?? '-'}/${r.legsFailed ?? '-'} failed  lifts ${r.lifts ?? '-'}  unplaceable ${r.unplaceable ?? '-'}  draws ${r.draws ?? '-'} heap ${r.heapMB ?? '-'}MB${r.error ? '  ERROR ' + r.error : ''}${r.exceptions ? '  exceptions ' + r.exceptions : ''}`);
}

// rubric checks: <= 150 live objects, >= 120 visible in core districts at midday, < 2% failed transitions overall
const ok = rows.filter((r) => !r.error);
const maxLive = Math.max(...ok.map((r) => r.live || 0));
const noonCore = ok.filter((r) => r.core && r.t === 0.5);
const trips = ok.reduce((a, r) => a + (r.trips || 0), 0), failed = ok.reduce((a, r) => a + (r.tripsFailed || 0) + (r.retargets || 0), 0);
const legs = ok.reduce((a, r) => a + (r.legs || 0), 0), legsFailed = ok.reduce((a, r) => a + (r.legsFailed || 0), 0);
const stuck = ok.reduce((a, r) => a + (r.stuck || 0), 0);
const summary = {
  views: rows.length, errors: rows.length - ok.length, maxLive, liveOk: maxLive <= 150,
  noonCoreVisible: noonCore.map((r) => ({ spot: r.spot, visible: r.visible, outdoors: r.visibleOutdoors })),
  noonCoreOk: noonCore.some((r) => (r.visible || 0) >= 120),
  trips, failedTransitions: failed, failRate: trips ? +(failed / trips).toFixed(4) : 0, failOk: !trips || failed / trips < 0.02,
  legs, legsFailed, legFailRate: legs ? +(legsFailed / legs).toFixed(4) : 0, stuckTotal: stuck,
  drawsMax: Math.max(...ok.map((r) => r.draws || 0)), heapMBMax: Math.max(...ok.map((r) => r.heapMB || 0)),
};
console.log('\nsummary', JSON.stringify(summary));
console.log(`live <= 150: ${summary.liveOk ? 'PASS' : 'FAIL'} (max ${maxLive}) | >= 120 visible in a core district at noon: ${summary.noonCoreOk ? 'PASS' : 'FAIL'} | failed transitions < 2%: ${summary.failOk ? 'PASS' : 'FAIL'} (${(summary.failRate * 100).toFixed(2)}% of ${trips} trips)`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), base, wait, rd, rows, summary }, null, 1));
console.log(`wrote ${out}`);
process.exit(bad || !summary.liveOk || !summary.failOk ? 1 : 0);
