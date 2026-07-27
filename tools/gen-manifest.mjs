// Emit docs/asset-manifest.md from the live registry, so the document can never
// drift from the code that actually registers the assets.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const b = await chromium.launch({ channel:'chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:225} });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil:'domcontentloaded' });
const t0=Date.now(); while (Date.now()-t0<300000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.levelReady===true).catch(()=>0)) break; await new Promise(r=>setTimeout(r,2000)); }
await p.evaluate(()=>globalThis.__NORTHSTAR__.startMission({difficulty:'operator',loadout:{primary:'carbine',secondary:'pistol',gadget:'flash'}}));
const t1=Date.now(); while (Date.now()-t1<60000){ if(await p.evaluate(()=>globalThis.__NORTHSTAR__?.state==='playing')) break; await new Promise(r=>setTimeout(r,500)); }
await p.evaluate(()=>globalThis.advanceTime(500));
// Cycle every weapon slot so the lazily-built view models exist and register
// an instance — and so the pass doubles as a check that each one builds.
for (const slot of [1,2,3,4,5,1]) {
  await p.evaluate((s)=>{ globalThis.__NORTHSTAR__.weapons?.select?.(s); globalThis.advanceTime(700); }, slot);
}
await p.evaluate(()=>{ globalThis.__NORTHSTAR__.trimCharacterCost?.(); globalThis.advanceTime(200); });

const data = await p.evaluate(() => {
  const assets = globalThis.__NORTHSTAR__.assets;
  return {
    records: assets.toJSON().map(r => ({ ...r, instances: assets.countInstances(r.id) })),
    summary: assets.summary(),
    unused: assets.unusedRecords().map(r => r.id),
  };
});
await b.close();

const OWNER = {
  opus1:'Opus 1 — lead architect', opus2:'Opus 2 — player & combat',
  opus3:'Opus 3 — AI & objectives', opus4:'Opus 4 — testing & release',
  fable1:'Fable 1 — art direction & UI', fable2:'Fable 2 — map architecture',
  fable3:'Fable 3 — props & materials', fable4:'Fable 4 — characters & effects',
};
const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const list = (v) => Array.isArray(v) ? (v.length ? v.map(esc).join(', ') : '—') : esc(v || '—');
const dims = (d) => Array.isArray(d) ? d.map(n => (+n).toFixed(2)).join(' × ') + ' m' : '—';

const byCat = {};
for (const r of data.records) (byCat[r.category] ||= []).push(r);

let md = `# Asset Manifest — Northstar Rescue

Generated from the live runtime registry (\`src/core/assets.js\`) by \`node tools/gen-manifest.mjs\`,
so it cannot drift from the code that registers the assets. Every entry carries the metadata the
project requires: unique ID, name, category, responsible agent, file locations, intended rooms or
game states, physical dimensions, pivot and orientation, material slots, texture maps, collision
type, LOD requirement, animation states, audio dependencies, status, acceptance criteria, Playwright
evidence, and remaining discrepancies.

**No production asset may be introduced without a record here.** \`assets.tag()\` warns at load if an
object carries an unregistered ID, and \`tests/assets.spec.js\` fails the build on a missing field.

## Summary

- **${data.summary.total} registered assets** across ${Object.keys(data.summary.byCategory).length} categories.
- **Instances placed in the built level:** ${data.records.reduce((a, r) => a + r.instances, 0)}.
- **Registered but never instantiated:** ${data.unused.length}${data.unused.length ? ` (${data.unused.map(esc).join(', ')})` : ''}.

| Category | Records | Instances |
| --- | ---: | ---: |
${Object.entries(byCat).sort().map(([c, rs]) => `| ${c} | ${rs.length} | ${rs.reduce((a, r) => a + r.instances, 0)} |`).join('\n')}

| Responsible agent | Records |
| --- | ---: |
${Object.entries(data.summary.byOwner).sort().map(([o, n]) => `| ${OWNER[o] || o} | ${n} |`).join('\n')}

| Status | Records |
| --- | ---: |
${Object.entries(data.summary.byStatus).sort().map(([s, n]) => `| ${s} | ${n} |`).join('\n')}

---
`;

for (const [cat, rs] of Object.entries(byCat).sort()) {
  md += `\n## ${cat} (${rs.length})\n\n`;
  for (const r of rs.sort((a, b) => a.id.localeCompare(b.id))) {
    md += `### \`${esc(r.id)}\` — ${esc(r.name)}\n\n`;
    md += `| Field | Value |\n| --- | --- |\n`;
    md += `| Category | ${esc(r.category)} |\n`;
    md += `| Responsible agent | ${OWNER[r.owner] || esc(r.owner)} |\n`;
    md += `| File locations | ${list(r.files)} |\n`;
    md += `| Rooms / game states | ${list(r.rooms)} |\n`;
    md += `| Dimensions (w × h × d) | ${dims(r.dims)} |\n`;
    md += `| Pivot & orientation | ${esc(r.pivot)} |\n`;
    md += `| Material slots | ${list(r.materials)} |\n`;
    md += `| Texture maps | ${list(r.textures)} |\n`;
    md += `| Collision | ${esc(r.collision)} |\n`;
    md += `| LOD | ${esc(r.lod)} |\n`;
    if (r.anims?.length) md += `| Animation states | ${list(r.anims)} |\n`;
    if (r.audio?.length) md += `| Audio dependencies | ${list(r.audio)} |\n`;
    md += `| Instances in level | ${r.instances} |\n`;
    md += `| Status | **${esc(r.status)}** |\n`;
    md += `| Acceptance criteria | ${esc(r.acceptance) || '—'} |\n`;
    md += `| Playwright evidence | ${esc(r.evidence) || '—'} |\n`;
    md += `| Remaining discrepancies | ${esc(r.discrepancies) || 'none'} |\n\n`;
  }
}
writeFileSync('docs/asset-manifest.md', md);
console.log(`wrote docs/asset-manifest.md — ${data.records.length} records, ${data.unused.length} unused`);
console.log('by category:', JSON.stringify(data.summary.byCategory));
