// Camp-only dev config: identical to the repo's, plus a guard that serves the
// last committed version of any *other* family's module when its working copy
// does not parse (six agents save mid-edit). src/campground/** is never masked.
import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import base from '../vite.config.js';

const ROOT = '/workspace/';
export default defineConfig({
  ...base,
  root: '/workspace',
  // no HMR: the other families' saves must not reload a page mid-capture
  server: { ...base.server, hmr: false },
  plugins: [
    {
      name: 'camp-parse-guard',
      enforce: 'pre',
      async load(id) {
        if (!id.startsWith(ROOT + 'src/') || !id.endsWith('.js') || id.includes('/campground/')) return null;
        const code = await readFile(id, 'utf8');
        try {
          const tmp = '/tmp/camp/check.mjs';
          writeFileSync(tmp, code);
          execFileSync(process.execPath, ['--check', tmp], { stdio: 'ignore' });
          return null;
        } catch (e) {
          const rel = id.slice(ROOT.length);
          console.warn(`[camp-guard] ${rel} does not parse; serving HEAD version`);
          return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: '/workspace', encoding: 'utf8', maxBuffer: 64 << 20 });
        }
      },
    },
  ],
});
