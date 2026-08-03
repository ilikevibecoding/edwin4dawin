// Dumps the absolute-time cue sheet (music, effects, voice) so the audio audit
// can find each spoken line inside the finished mix.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEQUENCES } from '../src/scenes/index.js';
import { collectCues } from '../src/scenes/kit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cues = collectCues(SEQUENCES);
const out = path.join(ROOT, 'build', 'cues.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(cues, null, 1));

const counts = cues.reduce((a, c) => ({ ...a, [c.kind]: (a[c.kind] || 0) + 1 }), {});
let total = 0;
for (const s of SEQUENCES) total += s.duration;
console.log(`${cues.length} cues (${JSON.stringify(counts)}) over ${total}s -> ${path.relative(ROOT, out)}`);
