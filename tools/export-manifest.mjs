#!/usr/bin/env node
/**
 * Regenerate docs/asset-manifest.md from the live runtime asset registry
 * (single source of truth — see src/assets/registry.ts).
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto('http://127.0.0.1:5173/?test=1&mode=playing&quality=low', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && !document.getElementById('boot-overlay'), null, { timeout: 60000 });
const assets = await page.evaluate(() => window.__qa.assets());
await browser.close();

const esc = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rows = assets.map((a) =>
  `| \`${a.id}\` | ${esc(a.name)} | ${a.category} | ${a.agent} | ${esc(a.files)} | ${esc(a.where)} | ${esc(a.dims)} | ${esc(a.pivot ?? 'floor-center,+X front')} | ${esc(a.materials)} | ${esc(a.textures)} | ${esc(a.collision ?? 'static-aabb')} | ${esc(a.lod ?? 'merged-static')} | ${esc(a.anim)} | ${esc(a.audio)} | **${a.status}** | ${esc(a.accept)} | ${esc(a.evidence ?? 'artifacts/shots/**')} | ${esc(a.notes ?? 'none')} |`,
).join('\n');

const table = `
**${assets.length} registered assets** (generated ${new Date().toISOString().slice(0, 10)} — run \`npm run manifest\` to refresh).

| ID | Name | Category | Agent | Files | Rooms/States | Dims | Pivot | Materials | Textures | Collision | LOD | Anim | Audio | Status | Acceptance | Evidence | Discrepancies |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows}
`;

const path = 'docs/asset-manifest.md';
const md = fs.readFileSync(path, 'utf8');
const updated = md.replace(
  /<!-- MANIFEST:BEGIN \(generated\) -->[\s\S]*<!-- MANIFEST:END -->/,
  `<!-- MANIFEST:BEGIN (generated) -->\n${table}\n<!-- MANIFEST:END -->`,
);
fs.writeFileSync(path, updated);
console.log(`wrote ${assets.length} assets to ${path}`);
