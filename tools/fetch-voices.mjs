#!/usr/bin/env node
/**
 * Download the open Piper TTS voice models used to render the narration.
 *
 * These models are third-party binaries (MIT-licensed Piper voices from the
 * rhasspy/piper-voices collection) and are intentionally not committed: only
 * the rendered audio ships with the project. Run this once before
 * `npm run narration`.
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'voices');
const BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';

const VOICES = [
  'en/en_GB/alan/medium/en_GB-alan-medium',
  'en/en_US/amy/medium/en_US-amy-medium',
  'en/en_US/ryan/high/en_US-ryan-high',
];

mkdirSync(outDir, { recursive: true });

for (const path of VOICES) {
  const name = path.split('/').pop();
  for (const ext of ['.onnx', '.onnx.json']) {
    const dest = join(outDir, `${name}${ext}`);
    if (existsSync(dest) && statSync(dest).size > 1024) {
      console.log(`have ${name}${ext}`);
      continue;
    }
    const url = `${BASE}/${path}${ext}`;
    process.stdout.write(`fetching ${name}${ext} ... `);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok || !res.body) {
      console.error(`FAILED (${res.status})`);
      process.exitCode = 1;
      continue;
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    console.log(`${(statSync(dest).size / 1e6).toFixed(1)} MB`);
  }
}
console.log('done');
