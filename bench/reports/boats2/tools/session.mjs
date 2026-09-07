// Hold ONE Chrome and serve capture jobs from a queue directory until it has been idle for `idleMs`:
//   node bench/reports/boats2/tools/session.mjs <queueDir> [idleMs]
// A job is a file <queueDir>/<name>.job whose first line is "@ <w> <h> <settleFrames>" and whose remaining lines
// are the spec (see shotlib.mjs). Jobs run in name order; each finishes with <name>.done holding the failure
// count (and <name>.log the console lines). The idle window lets a builder shoot, look, fix a parameter and
// shoot again on the same slot; it is kept short so the slot is not held while code is being written.
import fs from 'node:fs';
import path from 'node:path';
import { launch, shootAll } from './shotlib.mjs';

const [queueDir, idleArg = '210000'] = process.argv.slice(2);
if (!queueDir) { console.error('usage: session.mjs <queueDir> [idleMs]'); process.exit(2); }
const idleMs = Number(idleArg);
fs.mkdirSync(queueDir, { recursive: true });
const pidFile = path.join(queueDir, 'session.pid');
fs.writeFileSync(pidFile, String(process.pid));
const stamp = () => new Date().toISOString().slice(11, 19);
console.log(`${stamp()} [session] launching Chrome`);
const browser = await launch(1280, 720);
console.log(`${stamp()} [session] ready, idle window ${idleMs / 1000} s`);
let lastWork = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (;;) {
  const jobs = fs.readdirSync(queueDir).filter((f) => f.endsWith('.job')).sort();
  if (jobs.length === 0) {
    if (Date.now() - lastWork > idleMs) break;
    await sleep(1000);
    continue;
  }
  const name = jobs[0].slice(0, -4);
  const jobPath = path.join(queueDir, jobs[0]);
  const lines = fs.readFileSync(jobPath, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const header = lines[0].startsWith('@') ? lines.shift().slice(1).trim().split(/\s+/) : ['1280', '720', '3'];
  const [w = '1280', h = '720', settle = '3'] = header;
  const specs = lines.map((l) => { const [out, url, cam] = l.split('\t'); return { out, url, cam }; });
  console.log(`${stamp()} [session] job ${name}: ${specs.length} views at ${w}x${h}`);
  const logLines = [];
  const orig = console.log;
  console.log = (...a) => { logLines.push(a.join(' ')); orig(...a); };
  let failures = 0;
  try { failures = await shootAll(browser, specs, w, h, settle); } catch (e) { failures = specs.length; orig(`FAIL job ${name}: ${e.message}`); }
  console.log = orig;
  fs.writeFileSync(path.join(queueDir, `${name}.log`), logLines.join('\n') + '\n');
  fs.unlinkSync(jobPath);
  fs.writeFileSync(path.join(queueDir, `${name}.done`), `${failures}\n`);
  lastWork = Date.now();
  console.log(`${stamp()} [session] job ${name} done, ${failures} failures`);
}
console.log(`${stamp()} [session] idle, releasing the slot`);
await browser.close();
try { fs.unlinkSync(pidFile); } catch {}
