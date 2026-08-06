/**
 * The narrative format.
 *
 * A chapter is a graph of nodes; each node is a list of beats the director
 * performs in order, followed by a `next` that may branch on game state. Beats
 * are built with the helper functions at the bottom so the script reads close to
 * a screenplay.
 */
import type { Emotion } from '../characters/Character';
import type { AmbienceKind, MusicMood, SfxName } from '../engine/Audio';
import type { ShotOptions, ShotSize } from './CameraDirector';

export type SceneId = 'street' | 'apartment' | 'interrogation';

export interface GameState {
  flags: Record<string, boolean | number | string>;
  /** choiceId -> chosen optionId. */
  choices: Record<string, string>;
  relationships: Record<string, number>;
  /** Android software instability, 0..1. */
  instability: number;
  /** Node ids passed through, for the flowchart. */
  visited: string[];
  ending: string | null;
  unlocked: string[];
}

export function newGameState(): GameState {
  return {
    flags: {},
    choices: {},
    relationships: { wren: 0.5, voss: 0.35 },
    instability: 0,
    visited: [],
    ending: null,
    unlocked: ['ch1'],
  };
}

export interface CamSpec {
  kind: 'single' | 'ots' | 'two' | 'mark' | 'lock';
  who?: string;
  other?: string;
  size?: ShotSize;
  mark?: string;
  lookAt?: string;
  opts?: ShotOptions & { side?: 1 | -1 };
}

export interface ChoiceOptionSpec {
  id: string;
  label: string;
  hint?: string;
  danger?: boolean;
  /** Requires this flag to be truthy to be selectable. */
  requires?: string;
  effects?: Partial<{
    flags: Record<string, boolean | number | string>;
    instability: number;
    relationships: Record<string, number>;
  }>;
  /** Fictional global percentage shown on the stats card. */
  percent?: number;
}

export type Beat =
  | { kind: 'slate'; text: string | null }
  | {
      kind: 'line';
      who: string;
      text: string;
      emotion?: Emotion;
      emotionWeight?: number;
      clip?: string;
      cam?: CamSpec | 'auto';
      lookAt?: string | null;
      seconds?: number;
      /** Pause after the line finishes. */
      hold?: number;
      /** Internal monologue styling. */
      inner?: boolean;
      shake?: number;
    }
  | { kind: 'choice'; id: string; prompt: string; options: ChoiceOptionSpec[]; seconds: number; showStats?: boolean }
  | {
      kind: 'qte';
      id: string;
      qteKind: 'press' | 'hold' | 'mash' | 'direction';
      key: string;
      seconds: number;
      label?: string;
      flag?: string;
      shake?: number;
    }
  | { kind: 'scan'; required: number; objective?: string }
  | { kind: 'cam'; spec: CamSpec }
  | { kind: 'place'; who: string; mark: string }
  | { kind: 'move'; who: string; marks: string[]; speed?: number; wait?: boolean }
  | { kind: 'clip'; who: string; clip: string }
  | { kind: 'expr'; who: string; emotion: Emotion; weight?: number }
  | { kind: 'look'; who: string; at: string | null }
  | { kind: 'led'; who: string; state: 'blue' | 'yellow' | 'red' | 'off' }
  | { kind: 'wait'; seconds: number }
  | {
      kind: 'fx';
      letterbox?: boolean;
      glitch?: number;
      fadeTo?: number;
      fadeColor?: number;
      fadeSeconds?: number;
      shake?: number;
      rain?: number;
    }
  | { kind: 'music'; mood: MusicMood; intensity?: number; fade?: number }
  | { kind: 'ambience'; ambience: AmbienceKind; intensity?: number }
  | { kind: 'sfx'; name: SfxName; volume?: number }
  | { kind: 'stinger'; stinger: 'reveal' | 'shock' | 'sad' | 'hope' }
  | { kind: 'objective'; text: string | null }
  | { kind: 'notice'; text: string; variant?: 'neutral' | 'warn' | 'good' }
  | { kind: 'instability'; delta: number }
  | { kind: 'relationship'; who: string; delta: number }
  | { kind: 'meters'; show: boolean }
  | { kind: 'title'; chapter: string; title: string; subtitle?: string }
  | { kind: 'ending'; id: string };

export interface StoryNode {
  id: string;
  /** Shown in the branch flowchart. */
  label: string;
  column: number;
  row: number;
  ending?: boolean;
  beats: Beat[];
  next?: string | null | ((s: GameState) => string | null);
  /** Possible successors, for drawing the flowchart. */
  edges?: string[];
}

export interface ActorSpec {
  /** Role name used in beats. */
  role: string;
  /** Cast id from src/characters/Cast.ts. */
  cast: string;
  mark?: string;
  clip?: string;
  visible?: boolean;
}

export interface Chapter {
  id: string;
  index: number;
  name: string;
  title: string;
  subtitle?: string;
  scene: SceneId;
  actors: ActorSpec[];
  entry: string;
  nodes: StoryNode[];
  unlocks?: string;
}

// ---------------------------------------------------------------------------
// Beat constructors
// ---------------------------------------------------------------------------

export const slate = (text: string | null): Beat => ({ kind: 'slate', text });

export const line = (
  who: string,
  text: string,
  opts: Omit<Extract<Beat, { kind: 'line' }>, 'kind' | 'who' | 'text'> = {}
): Beat => ({ kind: 'line', who, text, ...opts });

export const inner = (
  who: string,
  text: string,
  opts: Omit<Extract<Beat, { kind: 'line' }>, 'kind' | 'who' | 'text' | 'inner'> = {}
): Beat => ({ kind: 'line', who, text, inner: true, ...opts });

export const choice = (
  id: string,
  prompt: string,
  options: ChoiceOptionSpec[],
  seconds = 9,
  showStats = false
): Beat => ({ kind: 'choice', id, prompt, options, seconds, showStats });

export const qte = (
  id: string,
  qteKind: 'press' | 'hold' | 'mash' | 'direction',
  key: string,
  seconds: number,
  opts: { label?: string; flag?: string; shake?: number } = {}
): Beat => ({ kind: 'qte', id, qteKind, key, seconds, ...opts });

export const scan = (required: number, objective?: string): Beat => ({ kind: 'scan', required, objective });

export const cam = (spec: CamSpec): Beat => ({ kind: 'cam', spec });
export const single = (who: string, size: ShotSize = 'close', opts: ShotOptions = {}): CamSpec => ({
  kind: 'single', who, size, opts,
});
export const ots = (near: string, far: string, opts: ShotOptions & { side?: 1 | -1 } = {}): CamSpec => ({
  kind: 'ots', who: near, other: far, opts,
});
export const two = (a: string, b: string, opts: ShotOptions = {}): CamSpec => ({
  kind: 'two', who: a, other: b, opts,
});
export const atMark = (mark: string, lookAt: string, opts: ShotOptions = {}): CamSpec => ({
  kind: 'mark', mark, lookAt, opts,
});

export const place = (who: string, mark: string): Beat => ({ kind: 'place', who, mark });
export const move = (who: string, marks: string[], speed = 1.1, wait = true): Beat => ({
  kind: 'move', who, marks, speed, wait,
});
export const clip = (who: string, name: string): Beat => ({ kind: 'clip', who, clip: name });
export const expr = (who: string, emotion: Emotion, weight = 1): Beat => ({ kind: 'expr', who, emotion, weight });
export const look = (who: string, at: string | null): Beat => ({ kind: 'look', who, at });
export const led = (who: string, state: 'blue' | 'yellow' | 'red' | 'off'): Beat => ({ kind: 'led', who, state });
export const wait = (seconds: number): Beat => ({ kind: 'wait', seconds });
export const fx = (opts: Omit<Extract<Beat, { kind: 'fx' }>, 'kind'>): Beat => ({ kind: 'fx', ...opts });
export const music = (mood: MusicMood, intensity?: number, fade?: number): Beat => ({
  kind: 'music', mood, intensity, fade,
});
export const ambience = (kind2: AmbienceKind, intensity?: number): Beat => ({
  kind: 'ambience', ambience: kind2, intensity,
});
export const sfx = (name: SfxName, volume?: number): Beat => ({ kind: 'sfx', name, volume });
export const stinger = (s: 'reveal' | 'shock' | 'sad' | 'hope'): Beat => ({ kind: 'stinger', stinger: s });
export const objective = (text: string | null): Beat => ({ kind: 'objective', text });
export const notice = (text: string, variant: 'neutral' | 'warn' | 'good' = 'neutral'): Beat => ({
  kind: 'notice', text, variant,
});
export const instability = (delta: number): Beat => ({ kind: 'instability', delta });
export const relationship = (who: string, delta: number): Beat => ({ kind: 'relationship', who, delta });
export const meters = (show: boolean): Beat => ({ kind: 'meters', show });
export const title = (chapter: string, t: string, subtitle?: string): Beat => ({
  kind: 'title', chapter, title: t, subtitle,
});
export const ending = (id: string): Beat => ({ kind: 'ending', id });
