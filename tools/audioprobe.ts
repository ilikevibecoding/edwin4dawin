/**
 * Locate the exact source of non-finite samples in the synthesised sound set.
 *
 * The audio synthesis path is pure typed-array DSP with no Web Audio or DOM
 * dependency, so it can be bundled and run under Node. That makes it possible
 * to bisect a bad sound by stage instead of inferring the cause from a browser
 * console warning.
 */
import { Rng } from '../src/core/MathUtils';
import { SoundLibrary } from '../src/audio/sounds';

const SAMPLE_RATE = Number(process.argv[2] ?? 48000);

interface Bad {
  id: string;
  variant: number;
  firstIndex: number;
  kind: 'NaN' | 'Infinity';
  count: number;
  total: number;
}

const bad: Bad[] = [];
let checked = 0;

const library = new SoundLibrary();
for (const id of library.ids()) {
  const spec = library.get(id)!;
  const variants = Math.max(1, spec.variants);
  for (let v = 0; v < variants; v++) {
    const rng = new Rng((hashString(spec.id) ^ (0x9e3779b9 + v * 0x9e3779b9)) >>> 0);
    let rendered;
    try {
      rendered = spec.render({ sampleRate: SAMPLE_RATE, rng, variant: v });
    } catch (err) {
      console.log(`THREW  ${spec.id} v${v}: ${err}`);
      continue;
    }
    checked++;
    for (const ch of rendered.channels) {
      let first = -1;
      let count = 0;
      let kind: 'NaN' | 'Infinity' = 'NaN';
      for (let i = 0; i < ch.length; i++) {
        if (!Number.isFinite(ch[i])) {
          if (first < 0) {
            first = i;
            kind = Number.isNaN(ch[i]) ? 'NaN' : 'Infinity';
          }
          count++;
        }
      }
      if (first >= 0) {
        bad.push({ id: spec.id, variant: v, firstIndex: first, kind, count, total: ch.length });
        break;
      }
    }
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

console.log(`checked ${checked} renders across ${library.size} sounds`);
console.log(`${bad.length} produced non-finite samples\n`);
for (const b of bad) {
  console.log(
    `${b.id.padEnd(26)} v${b.variant}  first=${b.firstIndex}/${b.total} ` +
      `(${((b.firstIndex / b.total) * 100).toFixed(1)}%)  ${b.kind}  bad=${b.count}`,
  );
}
