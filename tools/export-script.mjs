// Dumps the screenplay to JSON so the Python TTS pipeline can read it without
// having to parse ES modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allLines, CAST, LINES } from '../src/data/script.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'build', 'script.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ cast: CAST, lines: LINES, all: allLines() }, null, 2));
console.log(`wrote ${out} (${Object.keys(LINES).length} lines)`);
