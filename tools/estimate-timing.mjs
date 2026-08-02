#!/usr/bin/env node
/**
 * Provisional timing so scenes can be built before the real voice tracks exist.
 * `tools/build-audio.mjs` overwrites src/story/timing.json with measured
 * durations from the synthesised narration; this is only the stand-in.
 */
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SCRIPT, CHAPTER_ORDER } from '../src/story/script.js';

const EXTRA_TAIL = {
  title: 6, chase: 8, boarding: 6, message: 4, dunes: 4,
  twinsuns: 3, saber: 3, trench: 18, medals: 6,
};

const out = resolve(import.meta.dirname, '../src/story/timing.json');
if (existsSync(out) && !process.argv.includes('--force')) {
  console.log('timing.json already exists; pass --force to overwrite');
  process.exit(0);
}

const estimate = (text) => Math.max(1.1, text.split(/\s+/).length / 2.75 + 0.45);

let cursor = 0;
const lines = [];
const chapters = [];
for (const ch of CHAPTER_ORDER) {
  const start = cursor;
  for (const l of SCRIPT.filter((s) => s.ch === ch)) {
    cursor += l.pre || 0;
    const dur = estimate(l.text);
    lines.push({ id: l.id, ch, who: l.who, start: +cursor.toFixed(3), dur: +dur.toFixed(3), text: l.text });
    cursor += dur + (l.post || 0);
  }
  cursor += EXTRA_TAIL[ch] || 0;
  chapters.push({ id: ch, start: +start.toFixed(3), dur: +(cursor - start).toFixed(3) });
}

const timing = {
  provisional: true,
  duration: +cursor.toFixed(3),
  chapters,
  lines,
  sfx: [],
  music: [],
};
writeFileSync(out, JSON.stringify(timing, null, 2));
console.log(`wrote ${out}  total ${timing.duration.toFixed(1)}s`);
for (const c of chapters) console.log(`  ${c.id.padEnd(10)} ${c.start.toFixed(1).padStart(7)}  +${c.dur.toFixed(1)}`);
