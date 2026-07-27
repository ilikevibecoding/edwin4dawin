// Fold the production build into one self-contained HTML file.
//
// The game has no runtime fetches — all geometry, textures and audio are
// generated in code — so the whole thing collapses into a single document with
// the stylesheet and the module script inlined. That makes it playable from any
// static host or CDN with one URL, and immune to the relative-path and
// content-type quirks of raw file hosting.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT = join(DIST, 'northstar-rescue.html');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[bundle] dist/index.html is missing — run `npm run build` first');
  process.exit(1);
}

const assetsDir = join(DIST, 'assets');
const files = readdirSync(assetsDir);
const jsName = files.find((f) => f.endsWith('.js'));
const cssName = files.find((f) => f.endsWith('.css'));
const extraJs = files.filter((f) => f.endsWith('.js') && f !== jsName);
if (extraJs.length) {
  console.error(`[bundle] expected a single JS chunk, found extra: ${extraJs.join(', ')}`);
  process.exit(1);
}

const js = readFileSync(join(assetsDir, jsName), 'utf8');
const css = cssName ? readFileSync(join(assetsDir, cssName), 'utf8') : '';
let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// Strip the tags that pointed at the now-inlined files.
html = html
  .replace(/\s*<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  .replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g, '')
  .replace(/\s*<link[^>]*rel="modulepreload"[^>]*>/g, '');

// A literal `</script` inside a string in the bundle would close the inline
// script early; the escape is invisible to the JS parser.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

html = html
  .replace('</head>', `  <style>\n${css}\n  </style>\n</head>`)
  .replace('</body>', `  <script type="module">\n${safeJs}\n  </script>\n</body>`);

writeFileSync(OUT, html);

const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
console.log(`[bundle] ${OUT}  ${mb(Buffer.byteLength(html))}  (js ${mb(js.length)}, css ${mb(css.length)})`);
