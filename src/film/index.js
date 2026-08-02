import { Timeline } from '../core/timeline.js';

import { OpeningSequence } from './seq/00_opening.js';
import { CrawlSequence } from './seq/01_crawl.js';
import { ChaseSequence } from './seq/02_chase.js';
import { BoardingSequence } from './seq/03_boarding.js';
import { DroidsSequence } from './seq/04_droids.js';
import { TatooineSequence } from './seq/05_tatooine.js';
import { BattleSequence } from './seq/06_battle.js';
import { FinaleSequence } from './seq/07_finale.js';

/*
 * The cut.
 *
 * Each sequence owns its own scene, lighting, camera work and — importantly —
 * its own cue list in sequence-local time. Assembling the film shifts those
 * local cues onto the global clock, so a sequence can be re-timed or moved
 * without hand-editing a master spreadsheet of audio timings.
 */

const SEQUENCES = [
  OpeningSequence,
  CrawlSequence,
  ChaseSequence,
  BoardingSequence,
  DroidsSequence,
  TatooineSequence,
  BattleSequence,
  FinaleSequence,
];

export async function buildFilm(ctx, onProgress) {
  const timeline = new Timeline(ctx);
  for (const S of SEQUENCES) timeline.add(new S());

  await timeline.buildAll(onProgress);

  const cues = [];
  const chapters = [];
  for (const seq of timeline.sequences) {
    for (const c of seq.cues || []) cues.push({ ...c, t: c.t + seq.start });
    if (seq.chapter) {
      chapters.push({
        t0: seq.start + (seq.chapter.t ?? 0.6),
        t1: seq.start + (seq.chapter.t ?? 0.6) + (seq.chapter.hold ?? 3.4),
        title: seq.chapter.title,
        subtitle: seq.chapter.subtitle,
      });
    }
  }
  cues.sort((a, b) => a.t - b.t);

  ctx.timeline = timeline;
  return { timeline, cues, chapters };
}
