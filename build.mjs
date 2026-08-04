/**
 * Bundles src/ + three.js into one self-contained HTML file (pirate-ship.html)
 * so the scene can be opened straight from the filesystem, with no server and
 * no network access.
 *
 *   node build.mjs            build once
 *   node build.mjs --watch    rebuild on source changes
 *   node build.mjs --serve    serve the repo on http://localhost:8080
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OUTPUT = join(root, 'pirate-ship.html');
const PORT = Number(process.env.PORT || 8080);

async function bundle() {
  const started = Date.now();
  const result = await build({
    entryPoints: [join(root, 'src', 'main.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    write: false,
  });

  const script = result.outputFiles[0].text;
  const template = await readFile(join(root, 'templates', 'index.html'), 'utf8');
  if (!template.includes('__BUNDLE__')) {
    throw new Error('templates/index.html is missing the __BUNDLE__ placeholder');
  }
  // A literal </script> inside the bundle would close the inline tag early.
  const inlined = template.replace('__BUNDLE__', () => script.replaceAll('</script', '<\\/script'));
  await writeFile(OUTPUT, inlined);

  const kb = (Buffer.byteLength(inlined) / 1024).toFixed(0);
  console.log(`built pirate-ship.html (${kb} kB) in ${Date.now() - started} ms`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};

function serve() {
  createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname === '/' ? '/pirate-ship.html' : url.pathname;
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    }
  }).listen(PORT, () => console.log(`serving http://localhost:${PORT}/`));
}

await bundle();

if (args.includes('--watch')) {
  let pending = null;
  for (const dir of ['src', 'templates']) {
    watch(join(root, dir), { recursive: true }, () => {
      clearTimeout(pending);
      pending = setTimeout(() => bundle().catch((err) => console.error(err.message)), 60);
    });
  }
  console.log('watching src/ and templates/ ...');
}

if (args.includes('--serve')) serve();
