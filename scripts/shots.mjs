// Visual verification shots for the render pipeline (rubric 5). Launches headless Chrome (SwiftShader) per view,
// waits for the game, lets it settle, screenshots, and reports console warnings / exceptions.
//   node scripts/shots.mjs --base http://localhost:5207 --out /tmp/shots --prefix after [--set frontier,coruscant,shore,disasters] [--quality cinematic]
// Every shot is `${prefix}_${name}.png`; a `${prefix}_console.txt` collects non-vite console output per view.
import { launchPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const base = args.base || 'http://localhost:5207';
const out = args.out || '/tmp/shots';
const prefix = args.prefix || 'shot';
const quality = args.quality || 'cinematic';
const sets = (args.set || 'frontier,coruscant,shore,disasters').split(',');
const settleMs = parseInt(args.settle || '6000', 10);
mkdirSync(out, { recursive: true });

const TOWN = 'x=-8&z=2&yaw=-70';
const views = [];
if (sets.includes('frontier')) {
  views.push({ name: 'town_dawn', q: `${TOWN}&time=0.25` });
  views.push({ name: 'town_noon', q: `${TOWN}&time=0.5` });
  views.push({ name: 'town_dusk', q: `${TOWN}&time=0.74` });
  views.push({ name: 'town_midnight', q: `${TOWN}&time=0.0` });
}
// a river bend north of the town (water at sea level 48); yaw 180 = facing north (-z)
if (sets.includes('shore')) views.push({ name: 'shore_noon', q: args.shore || 'x=-30&z=-96&y=58&yaw=180&pitch=-22&fly=1&time=0.45' });
if (sets.includes('coruscant')) {
  views.push({ name: 'coruscant_noon', q: 'x=3000&z=0&y=140&fly=1&pitch=-20&time=0.5' });
  views.push({ name: 'coruscant_night', q: 'x=3000&z=0&y=140&fly=1&pitch=-20&time=0.0' });
}
if (sets.includes('disasters')) {
  for (const d of ['tornado', 'tsunami', 'beam']) {
    views.push({ name: `disaster_${d}`, q: `${TOWN}&time=0.5`, before: `game.disasters.command({type:'start', disaster:'${d}'})`, wait: parseInt(args.disasterMs || '10000', 10) });
  }
}
// ad-hoc views: --views "name:x=..&z=..&time=..;name2:..." (optionally "name:query|js to run before the shot")
if (args.views) {
  for (const spec of String(args.views).split(';')) {
    const [name, rest] = spec.split(/:(.*)/s);
    if (!name || !rest) continue;
    const [q, before] = rest.split('|');
    views.push({ name, q, before: before || null });
  }
}

const consoleLog = [];
for (const v of views) {
  const url = `${base}/?${v.q}&quality=${quality}`;
  const t0 = Date.now();
  const page = await launchPage(url, { width: 1280, height: 800 });
  try {
    await page.waitForGame();
    await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
    if (v.before) { const r = await page.evaluate(v.before); consoleLog.push(`[${v.name}] step -> ${JSON.stringify(r)}`); }
    await page.sleep(v.wait || settleMs);
    const path = `${out}/${prefix}_${v.name}.png`;
    await page.screenshot(path);
    const lines = page.consoleLines.filter((l) => !l.startsWith('[dbg]'));
    consoleLog.push(`== ${v.name} (${url}) ${Date.now() - t0} ms, ${lines.length} console lines, ${page.exceptions.length} exceptions`);
    for (const l of lines.slice(0, 40)) consoleLog.push('  ' + l.slice(0, 400));
    for (const e of page.exceptions.slice(0, 5)) consoleLog.push('  EXC ' + e);
    console.log(`${v.name}: ${path}  (${lines.length} console lines, ${page.exceptions.length} exceptions)`);
  } catch (e) {
    consoleLog.push(`== ${v.name} FAILED: ${e.message}`);
    console.log(`${v.name}: FAILED ${e.message}`);
  } finally { page.close(); }
}
writeFileSync(`${out}/${prefix}_console.txt`, consoleLog.join('\n') + '\n');
console.log(`console log: ${out}/${prefix}_console.txt`);
process.exit(0);
