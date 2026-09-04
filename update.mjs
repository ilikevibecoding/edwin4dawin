// Tiny updater for status.json:  node update.mjs <cmd> args...
//   phase "text" ["summary"]          ws "Name" "status" "detail"       log "text"
//   metric "scenario" "load" "js" "draws" "heap" "longTasks" "notes"    shot img/file.png "caption"
//   issue "text" | issues-clear         link "label" "url"                push ["commit message"]
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const file = `${dir}/status.json`;
const data = JSON.parse(readFileSync(file, 'utf8'));
const [cmd, ...a] = process.argv.slice(2);
const now = new Date();
const stamp = now.toISOString().slice(11, 16) + ' UTC';
switch (cmd) {
  case 'phase': data.phase = a[0]; if (a[1] !== undefined) data.summary = a[1]; break;
  case 'ws': { const w = data.workstreams.find((x) => x.name === a[0]); if (w) { w.status = a[1]; w.detail = a[2] ?? w.detail; } else data.workstreams.push({ name: a[0], status: a[1], detail: a[2] || '' }); break; }
  case 'log': data.log.push({ time: now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC', text: a[0] }); if (data.log.length > 60) data.log.shift(); break;
  case 'metric': { const m = data.metrics.find((x) => x.scenario === a[0]); const v = { scenario: a[0], load: a[1], js: a[2], draws: a[3], heap: a[4], longTasks: a[5], notes: a[6] || '' }; if (m) Object.assign(m, v); else data.metrics.push(v); break; }
  case 'shot': data.screenshots = data.screenshots.filter((s) => s.src !== a[0]); data.screenshots.unshift({ src: a[0], caption: `${a[1]} (${stamp})` }); data.screenshots = data.screenshots.slice(0, 10); break;
  case 'issue': data.issues.push(a[0]); break;
  case 'issues-clear': data.issues = []; break;
  case 'link': { data.links = data.links.filter((l) => l.label !== a[0]); data.links.push({ label: a[0], url: a[1] }); break; }
  case 'push': break;
  default: console.error('unknown command', cmd); process.exit(1);
}
data.updated = now.toISOString();
writeFileSync(file, JSON.stringify(data, null, 2));
if (cmd === 'push') {
  execSync(`cd ${dir} && git add -A && git commit -q -m ${JSON.stringify(a[0] || 'progress update')} && git push -q -u origin progress`, { stdio: 'inherit' });
  console.log('pushed');
}
