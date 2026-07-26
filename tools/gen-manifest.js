// Generates docs/asset-manifest.md from the live asset registry (the game
// registers every production asset at boot). Usage: npm run manifest
// (requires the dev server on 127.0.0.1:5173)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
await page.goto('http://127.0.0.1:5173/?qa=1&lowspec=1');
await page.waitForFunction(() => window.NSR?.state === 'title', null, { timeout: 60000 });
const assets = await page.evaluate(() => window.__qa.listAssets());
await browser.close();

// which assets are placed in the map (integration evidence)
const placement = fs.readFileSync('src/world/props_placement.js', 'utf8');
const usedInMap = (id) => placement.includes(`'${id}'`);

const CAT_AGENT = { material: 'Fable 3', prop: 'Fable 3', character: 'Fable 4', weapon: 'Fable 4', architecture: 'Fable 2', environment: 'Fable 2' };
const EVIDENCE = {
  material: 'screenshots/materials/', prop: 'screenshots/props/', character: 'screenshots/characters/',
  weapon: 'screenshots/viewmodel/', architecture: 'screenshots/archkit/', environment: 'screenshots/environment/',
};

const byCat = {};
for (const a of assets) (byCat[a.category] ||= []).push(a);

let md = `# Asset Manifest — Northstar Rescue

Generated from the live asset registry (\`src/assets/registry.js\`) by
\`npm run manifest\`. Every production asset must be registered; unregistered
assets are a release defect. ${assets.length} assets registered.

Common fields: units = meters; Y-up; props pivot at floor-center facing -Z
unless noted; wall/ceiling props pivot at mount point. Collision: local AABBs
in \`userData.collision\` registered into the collision world at placement.
LOD strategy: merged static batching + camera-distance material simplicity
(no per-asset LOD swaps; documented budget per category). Audio: all sounds
are synthesized at runtime (no per-asset audio files); audio dependencies are
event-driven (see src/audio/audio.js).

Acceptance criteria (all categories): correct real-world scale, believable
materials (no missing textures), no z-fighting/floating/clipping in placed
locations, no console errors, visible in a reviewed gameplay screenshot.

`;

const order = ['material', 'architecture', 'prop', 'character', 'weapon', 'environment'];
for (const cat of order) {
  const list = byCat[cat] || [];
  if (!list.length) continue;
  md += `\n## ${cat[0].toUpperCase() + cat.slice(1)}s (${list.length})\n\n`;
  md += `| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |\n|---|---|---|---|---|---|---|---|\n`;
  for (const a of list.sort((x, y) => x.id.localeCompare(y.id))) {
    const dims = a.footprint ? `${a.footprint[0]}×${a.footprint[1]}×${a.height ?? '?'}` : (a.dims || '—');
    const placed = cat === 'prop' ? (usedInMap(a.id) ? 'yes' : 'library') :
      (cat === 'material' || cat === 'architecture' || cat === 'environment' || cat === 'character' || cat === 'weapon') ? 'yes' : '—';
    md += `| ${a.id} | ${a.name} | ${a.agent || CAT_AGENT[cat]} | ${dims} | ${placed} | ${a.hasBuilder ? 'yes' : 'no'} | ${a.status || 'built'} | ${EVIDENCE[cat] || ''} |\n`;
  }
}

md += `\n## Remaining discrepancies\n\nTracked in docs/checklists.md (known-issues list).\n`;

fs.writeFileSync('docs/asset-manifest.md', md);
console.log('Wrote docs/asset-manifest.md with', assets.length, 'assets');
