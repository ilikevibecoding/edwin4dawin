import type { Chapter } from '../Timeline';
import type { ShowContext } from '../context';
import { prologueChapter } from './prologue';
import { tatooineChapter } from './tatooine';
import { pursuitChapter } from './pursuit';
import { captureChapter } from './capture';
import { corridorChapter } from './corridor';
import { plansChapter } from './plans';
import { escapeChapter } from './escape';
import { epilogueChapter } from './epilogue';

/** The complete running order. */
export function buildChapters(): Array<Chapter<ShowContext>> {
  return [
    prologueChapter(),
    tatooineChapter(),
    pursuitChapter(),
    captureChapter(),
    corridorChapter(),
    plansChapter(),
    escapeChapter(),
    epilogueChapter(),
  ];
}

export { EPILOGUE_CARD } from './epilogue';
