#!/usr/bin/env node
/**
 * tools/inline.mjs — fold the Vite build into one self-contained HTML file so a
 * single raw CDN link runs the demo (no relative asset fetches, no CORS).
 *
 *   npm run build:cdn   ->  docs/play.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'docs');
const OUT = path.join(OUT_DIR, 'play.html');

let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// inline every emitted module script
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (m, src) => {
  const file = path.join(DIST, src.replace(/^\.?\//, ''));
  if (!fs.existsSync(file)) return m;
  const code = fs.readFileSync(file, 'utf8');
  return `<script type="module">\n${code}\n</script>`;
});

// inline every emitted stylesheet
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => {
  const file = path.join(DIST, href.replace(/^\.?\//, ''));
  if (!fs.existsSync(file)) return m;
  return `<style>\n${fs.readFileSync(file, 'utf8')}\n</style>`;
});

// the favicon is a tiny svg — inline it as a data URI
const favicon = path.join(DIST, 'favicon.svg');
if (fs.existsSync(favicon)) {
  const data = Buffer.from(fs.readFileSync(favicon)).toString('base64');
  html = html.replace(/href="[^"]*favicon\.svg"/, `href="data:image/svg+xml;base64,${data}"`);
}

// drop any leftover modulepreload hints (their targets no longer exist)
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '');

const leftovers = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
if (leftovers.length) {
  console.error('! not inlined:', leftovers.join(', '));
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`· wrote ${path.relative(ROOT, OUT)} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
