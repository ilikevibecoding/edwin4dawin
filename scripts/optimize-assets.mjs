#!/usr/bin/env node
/**
 * Shrinks downloaded textures to committable sizes:
 * - deletes displacement maps (unused)
 * - hero sets keep 2K diffuse/normal, others resized to 1K
 * - all re-encoded as JPEG q82
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const TEX = join(ROOT, 'public', 'assets', 'textures');
const HERO = new Set(['asphalt', 'concrete_wall', 'plaster_painted', 'brick', 'concrete_floor']);

async function main() {
  const sets = await readdir(TEX);
  let before = 0, after = 0;
  for (const set of sets) {
    const dir = join(TEX, set);
    const files = await readdir(dir);
    for (const f of files) {
      const p = join(dir, f);
      const s = await stat(p);
      before += s.size;
      if (f.startsWith('disp')) { await unlink(p); continue; }
      const isHeroMap = HERO.has(set) && (f.startsWith('diff') || f.startsWith('normal'));
      const size = isHeroMap ? 2048 : 1024;
      const buf = await sharp(p).resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      await sharp(buf).toFile(p);
      after += buf.length;
    }
  }
  console.log(`textures: ${(before / 1e6).toFixed(0)}MB -> ${(after / 1e6).toFixed(0)}MB`);
}
main();
