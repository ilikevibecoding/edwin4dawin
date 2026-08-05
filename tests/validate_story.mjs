// Story graph validation: every jump target must exist, every shot must be
// registered and present on disk, flowchart marks must be settable, and
// chapter chaining must resolve. Run: node tests/validate_story.mjs

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ch1 } = await import('../src/story/ch1.js');
const { ch2 } = await import('../src/story/ch2.js');
const { ch3 } = await import('../src/story/ch3.js');

const chapters = [ch1, ch2, ch3];
const errors = [];
const warns = [];

// --- shots registered in stage.js and files on disk ---
const stageSrc = readFileSync(join(root, 'src/stage.js'), 'utf8');
const shotDefs = [...stageSrc.matchAll(/^\s*([A-Za-z0-9_]+):\s*\{\s*src:\s*'([^']+)'/gm)];
const shots = new Map(shotDefs.map((m) => [m[1], m[2]]));
for (const [name, src] of shots) {
  if (!existsSync(join(root, src))) errors.push(`stage.js: shot "${name}" file missing: ${src}`);
}

const VALID_NEXT = new Set(['ch2', 'ch3', 'fin']);

for (const ch of chapters) {
  const labels = new Set();
  const jumps = [];
  const marksSet = new Set();
  const flagsSet = new Set(['ins', 'reese', 'opinion', 'evidence', 'prob', 'stress', 'ending']);

  const scanBeat = (b, where) => {
    if (b.label) labels.add(b.label);
    if (b.go) jumps.push([b.go, where]);
    if (b.if?.go) jumps.push([b.if.go, where]);
    if (b.ifMark && b.goMark) jumps.push([b.goMark, where]);
    if (b.ifNotMark && b.goMark) jumps.push([b.goMark, where]);
    if (b.mark) marksSet.add(b.mark);
    if (b.set) Object.keys(b.set).forEach((k) => flagsSet.add(k));
    if (b.fx?.set) Object.keys(b.fx.set).forEach((k) => flagsSet.add(k));
    if (b.fx?.add) Object.keys(b.fx.add).forEach((k) => flagsSet.add(k));
    if (b.add) Object.keys(b.add).forEach((k) => flagsSet.add(k));
    if (b.sh && !shots.has(b.sh)) errors.push(`${ch.id} ${where}: unknown shot "${b.sh}"`);
    if (b.choice) {
      b.choice.opts.forEach((o, i) => {
        if (o.go) jumps.push([o.go, `${where} choice[${i}]`]);
        if (o.mark) marksSet.add(o.mark);
        if (o.fx?.set) Object.keys(o.fx.set).forEach((k) => flagsSet.add(k));
        if (o.fx?.add) Object.keys(o.fx.add).forEach((k) => flagsSet.add(k));
        if (o.req) flagsSet.add(o.req.k);
      });
      if (!b.choice.opts.some((o) => o.def) && b.choice.opts.every((o) => o.req)) {
        warns.push(`${ch.id} ${where}: choice has no unlocked default`);
      }
    }
    for (const kind of ['qte', 'mash']) {
      if (b[kind]) {
        if (b[kind].ok) jumps.push([b[kind].ok, `${where} ${kind}.ok`]);
        if (b[kind].fail) jumps.push([b[kind].fail, `${where} ${kind}.fail`]);
        if (b[kind].okMark) marksSet.add(b[kind].okMark);
        if (b[kind].failMark) marksSet.add(b[kind].failMark);
      }
    }
    if (b.invest) {
      if (b.invest.done) jumps.push([b.invest.done, `${where} invest.done`]);
      if (b.invest.img && !shots.has(b.invest.img)) errors.push(`${ch.id} ${where}: invest unknown shot "${b.invest.img}"`);
      b.invest.spots.forEach((s, i) => {
        if (s.set) Object.keys(s.set).forEach((k) => flagsSet.add(k));
        (s.beats || []).forEach((sb, j) => scanBeat(sb, `${where} spot[${i}].beat[${j}]`));
        const evidCount = b.invest.spots.filter((sp) => sp.evid).length;
        if (b.invest.min > evidCount) errors.push(`${ch.id} ${where}: invest.min ${b.invest.min} > evidence spots ${evidCount}`);
      });
    }
    if (b.end) {
      if (!VALID_NEXT.has(b.end.next)) errors.push(`${ch.id} ${where}: bad end.next "${b.end.next}"`);
      if (b.end.flow) {
        const ids = new Set();
        b.end.flow.nodes.forEach((n) => {
          if (ids.has(n.id)) errors.push(`${ch.id} flowchart: duplicate node "${n.id}"`);
          ids.add(n.id);
        });
        b.end.flow.edges.forEach(([a, bb]) => {
          if (!ids.has(a) || !ids.has(bb)) errors.push(`${ch.id} flowchart: edge [${a},${bb}] references missing node`);
        });
        // "when" marks must be settable in ANY chapter (cross-chapter refs allowed) — collect later
        b.end.flow.nodes.forEach((n) => { if (n.when) flowWhens.push([ch.id, n.id, n.when]); });
      }
    }
  };

  const flowWhens = [];
  ch.beats.forEach((b, i) => scanBeat(b, `beat[${i}]`));

  for (const [target, where] of jumps) {
    if (!labels.has(target)) errors.push(`${ch.id} ${where}: jump to missing label "${target}"`);
  }
  ch.__marks = marksSet;
  ch.__flowWhens = flowWhens;
}

// cross-chapter mark check for flowchart "when"
const allMarks = new Set();
chapters.forEach((ch) => ch.__marks.forEach((m) => allMarks.add(m)));
chapters.forEach((ch) => {
  ch.__flowWhens.forEach(([cid, nid, when]) => {
    if (!allMarks.has(when)) errors.push(`${cid} flowchart node "${nid}": mark "${when}" is never set`);
  });
});

// hotspot sanity
for (const ch of chapters) {
  for (const b of ch.beats) {
    if (b.invest) {
      b.invest.spots.forEach((s) => {
        if (s.x < 0 || s.x > 100 || s.y < 0 || s.y > 100) errors.push(`${ch.id}: hotspot "${s.label}" out of range`);
      });
    }
  }
}

console.log(`Chapters: ${chapters.map((c) => c.id).join(', ')}`);
console.log(`Shots registered: ${shots.size}`);
console.log(`Marks defined: ${allMarks.size}`);
warns.forEach((w) => console.log('WARN:', w));
if (errors.length) {
  errors.forEach((e) => console.error('ERROR:', e));
  process.exit(1);
}
console.log('OK — story graph is valid.');
