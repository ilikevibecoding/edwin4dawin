/**
 * The scripting vocabulary chapters are written in. A chapter is a flat list of
 * steps with labels and jumps, which keeps branching readable and makes the
 * whole story trivially replayable and machine-drivable (autoplay demo, film
 * capture) without a separate cutscene format.
 */
import type { ShotSpec } from './camera';
import type { ExpressionName, LedState, PoseName } from '../engine/character';

export type ChoiceOption = {
  label: string;
  /** Small grey annotation, e.g. "RISKY" or "PROBE". */
  hint?: string;
  goto?: string;
  flag?: string;
  stat?: [string, number];
  risk?: boolean;
  /** Only offered when this flag is set. */
  requires?: string;
  /** Flowchart node reached by taking this option. */
  node?: string;
  instability?: number;
};

export type Step =
  | ({ t: 'shot' } & ShotSpec)
  | {
      t: 'say';
      who: string;
      text: string;
      dur?: number;
      think?: boolean;
      expr?: ExpressionName;
      exprW?: number;
      pose?: PoseName;
      gesture?: number;
      look?: string | null;
      led?: LedState;
      /** Skip the synthetic voice for radio/VO lines. */
      silent?: boolean;
    }
  | {
      t: 'do';
      who: string;
      pose?: PoseName;
      blend?: number;
      expr?: ExpressionName;
      exprW?: number;
      look?: string | null;
      led?: LedState;
      walkTo?: string;
      mark?: string;
      shiver?: number;
      gesture?: number;
      talk?: number;
    }
  | { t: 'choice'; prompt?: string; time?: number; options: ChoiceOption[] }
  | {
      t: 'qte';
      key: string;
      window?: number;
      kind?: 'press' | 'hold' | 'mash';
      caption?: string;
      onFail?: string;
      slowmo?: number;
      shake?: number;
    }
  | { t: 'scan'; need?: number; time?: number; hint?: string }
  | { t: 'precon'; label?: string; dur?: number }
  | { t: 'wait'; dur: number }
  | { t: 'goto'; label: string }
  | { t: 'label'; name: string }
  | { t: 'if'; flag: string; goto: string; not?: boolean }
  | { t: 'ifStat'; name: string; min?: number; max?: number; goto: string }
  | { t: 'set'; flag: string; value?: boolean }
  | { t: 'stat'; name: string; delta: number }
  | { t: 'title'; kicker?: string; title: string; sub?: string; dur?: number }
  | { t: 'fade'; to: 'black' | 'white' | 'in'; dur?: number }
  | { t: 'flash'; power?: number }
  | { t: 'sfx'; name: string }
  | { t: 'music'; mood?: number; stop?: boolean; level?: number }
  | { t: 'ambience'; rain?: number; drone?: number; stop?: boolean }
  | { t: 'objective'; text: string; done?: boolean }
  | { t: 'hud'; show: boolean; actor?: string; model?: string }
  | { t: 'action'; name: string; on?: boolean }
  | { t: 'letterbox'; on: boolean }
  | { t: 'node'; id: string }
  | { t: 'lightning'; delay?: number }
  | { t: 'shake'; power: number }
  | { t: 'slowmo'; scale: number; dur?: number }
  | { t: 'toast'; text: string; warn?: boolean }
  | { t: 'instability'; delta: number }
  | { t: 'chapterEnd'; outcome: string };

export type CastEntry = {
  /** Instance id used by the script. */
  id: string;
  /** Key into the CAST table. */
  spec: string;
  mark: string;
  pose?: PoseName;
  expr?: ExpressionName;
  led?: LedState;
  hidden?: boolean;
};

export type FlowNode = {
  id: string;
  label: string;
  /** Column / row in the flowchart grid. */
  col: number;
  row: number;
  kind?: 'start' | 'choice' | 'action' | 'death' | 'end';
  from?: string[];
};

export type Chapter = {
  id: string;
  kicker: string;
  title: string;
  sub: string;
  set: 'rooftop' | 'apartment' | 'interrogation' | 'street';
  cast: CastEntry[];
  hud?: { actor: string; model: string };
  objective?: string;
  steps: Step[];
  flow: FlowNode[];
  /** Choice indices the autoplay demo takes, in order. */
  demoChoices?: number[];
  /** Approximate playtime in seconds, for the chapter select screen. */
  minutes?: number;
};

/** Default spoken duration from line length — roughly natural speech pace. */
export function lineDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1.5, Math.min(9, 0.62 + words / 2.5));
}
