// Fold a production build into one self-contained document.
//
// The game has no runtime fetches — all geometry, textures and audio are
// generated in code — so the whole thing collapses into a single file with the
// stylesheet and the script inlined. That makes it playable from any static host
// with one URL, and immune to the relative-path quirks of raw file hosting.
//
// Two flavours, because file hosts disagree about content types:
//
//   .html   inline ES module. What you want for a local file, a real static
//           host, or htmlpreview. Pure CDNs serve `.html` as `text/plain`, so a
//           browser shows the source instead of running it.
//   .xhtml  inline classic script, wrapped in CDATA and well-formed XML. Served
//           as `application/xhtml+xml`, which browsers do render — but XML
//           documents cannot run module scripts (crbug.com/717643), so this
//           flavour must be built with NS_FORMAT=iife.
//
// Usage: node tools/bundle-single.mjs --in dist --out dist/game.html
//        node tools/bundle-single.mjs --in dist-iife --out dist/game.xhtml --xhtml

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const IN = arg('in', 'dist');
const OUT = arg('out', join(IN, 'northstar-rescue.html'));
const XHTML = argv.includes('--xhtml');

if (!existsSync(join(IN, 'index.html'))) {
  console.error(`[bundle] ${IN}/index.html is missing — run the vite build first`);
  process.exit(1);
}

const assetsDir = join(IN, 'assets');
const files = readdirSync(assetsDir);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssName = files.find((f) => f.endsWith('.css'));
if (jsFiles.length !== 1) {
  console.error(`[bundle] expected exactly one JS chunk in ${assetsDir}, found: ${jsFiles.join(', ') || 'none'}`);
  process.exit(1);
}

const js = readFileSync(join(assetsDir, jsFiles[0]), 'utf8');
const css = cssName ? readFileSync(join(assetsDir, cssName), 'utf8') : '';
let html = readFileSync(join(IN, 'index.html'), 'utf8');

// Vite writes `type="module"` into index.html whatever the rollup format is, so
// the tag is not evidence. What actually matters for the XHTML flavour is
// whether the bundle can run as a classic script: `import.meta` and top-level
// `import`/`export` are module-only syntax and would be a parse error.
const isModule = !XHTML;
if (XHTML) {
  const offenders = [];
  if (/\bimport\s*\.\s*meta\b/.test(js)) offenders.push('import.meta');
  if (/^\s*(?:import|export)\s/m.test(js)) offenders.push('top-level import/export');
  if (offenders.length) {
    console.error(`[bundle] this build cannot run as a classic script (${offenders.join(', ')}); rebuild with NS_FORMAT=iife`);
    process.exit(1);
  }
}

// Strip the tags that pointed at the now-inlined files.
html = html
  .replace(/\s*<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  .replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g, '')
  .replace(/\s*<link[^>]*rel="modulepreload"[^>]*>/g, '');

// A literal `</script` inside a string would close the inline script early; the
// escape is invisible to the JS parser and safe in both flavours.
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const scriptOpen = isModule ? '<script type="module">' : '<script>';

// The replacement text is a whole minified bundle, and `String.replace` expands
// `$&`, `$$`, `` $` `` and `$'` inside a replacement *string*. The three.js
// bundle contains `$&&` (a variable named `$` followed by a logical and), which
// silently became `</body>&` and broke the script 370 kB in. Passing a function
// makes the replacement literal.
const literal = (text) => () => text;

if (!XHTML) {
  html = html
    .replace('</head>', literal(`  <style>\n${css}\n  </style>\n</head>`))
    .replace('</body>', literal(`  ${scriptOpen}\n${safeJs}\n  </script>\n</body>`));
} else {
  // Well-formed XML: explicit namespace, CDATA around the style and script
  // bodies, and no stray `]]>` inside them.
  const cdata = (body, what) => {
    if (body.includes(']]>')) {
      body = body.split(']]>').join(']]]]><![CDATA[>');
      console.warn(`[bundle] escaped a literal ]]> inside the ${what}`);
    }
    return `/*<![CDATA[*/\n${body}\n/*]]>*/`;
  };
  // The shim has to run before the bundle, in the same script, so it is in
  // place before any interface code touches innerHTML.
  const shim = readFileSync(new URL('./xml-compat-shim.js', import.meta.url), 'utf8');
  html = html
    .replace('<html lang="en">', literal('<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">'))
    .replace('</head>', literal(`  <style type="text/css">${cdata(css, 'stylesheet')}</style>\n</head>`))
    .replace('</body>', literal(`  <script>${cdata(`${shim}\n${safeJs}`, 'script')}</script>\n</body>`));
  html = `<?xml version="1.0" encoding="UTF-8"?>\n${html}`;
}

// Guard the whole class of corruption rather than just the one case: the inlined
// bundle must survive byte-for-byte into the document.
if (!html.includes(safeJs)) {
  console.error('[bundle] the inlined script was altered during assembly — refusing to write a corrupt bundle');
  process.exit(1);
}
if (css && !XHTML && !html.includes(css)) {
  console.error('[bundle] the inlined stylesheet was altered during assembly');
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);

const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
console.log(`[bundle] ${OUT}  ${mb(Buffer.byteLength(html))}  ${XHTML ? '(XHTML, classic script)' : `(${isModule ? 'ES module' : 'classic script'})`}`);
