export type SetId = 'street' | 'apartment' | 'interrogation' | 'garden' | 'rooftop';

export type Emotion = 'neutral' | 'tense' | 'angry' | 'sad' | 'afraid' | 'warm' | 'shocked';
export type LedState = 'blue' | 'amber' | 'red' | 'off';

/** Where a camera or actor should be: a set mark, an actor, or a literal point. */
export type Anchor = string | [number, number, number];

export interface ShotBase {
  fov?: number;
  aperture?: number;
  focalRange?: number;
  handheld?: number;
  roll?: number;
  dolly?: { offset: [number, number, number]; duration: number; ease?: 'linear' | 'inOut' | 'out' | 'in' | 'sine' | 'quint' };
  push?: { amount: number; duration: number };
  /** Seconds to blend from the previous shot; 0 cuts. */
  blend?: number;
  shake?: number;
}

export type ShotSpec = ShotBase &
  (
    | { type: 'cu'; who: string; side?: number; height?: number; dist?: number }
    | { type: 'ots'; who: string; at: string; side?: number; height?: number; dist?: number }
    | { type: 'two'; a: string; b: string; side?: number; height?: number; dist?: number }
    | { type: 'free'; from: Anchor; to: Anchor; heightFrom?: number; heightTo?: number }
    | { type: 'follow' }
  );

export interface ActorPlacement {
  who: string;
  at?: Anchor;
  yaw?: number;
  /** Face this actor / mark. */
  look?: string | null;
  gestures?: string[];
  clearGestures?: boolean;
  emotion?: Emotion;
  led?: LedState;
  hidden?: boolean;
}

export interface ChoiceOption {
  label: string;
  /** Extra line of flavour under the label. */
  hint?: string;
  /** Jump to this label when chosen. */
  goto?: string;
  effects?: MeterChange[];
  flags?: string[];
  /** Recorded in the chapter flowchart. */
  node?: string;
  /** Only offered when every flag here is set. */
  requires?: string[];
}

export interface MeterChange {
  meter: 'voss' | 'deviancy' | 'noah' | 'ezra';
  delta: number;
}

export interface ScanPoint {
  label: string;
  at: Anchor;
  /** Line spoken (as analysis) when the point is examined. */
  note: string;
  detail?: string;
}

export type Beat =
  | { kind: 'label'; name: string }
  | { kind: 'goto'; label: string }
  | { kind: 'set'; set: SetId; fadeIn?: number }
  | { kind: 'title'; chapter: string; title: string; sub: string; hold?: number }
  | { kind: 'place'; actors: ActorPlacement[] }
  | { kind: 'shot'; shot: ShotSpec }
  | {
      kind: 'line';
      who: string;
      text: string;
      /** Override the automatic duration. */
      time?: number;
      thought?: boolean;
      emotion?: Emotion;
      gesture?: string;
      stopGesture?: string;
      look?: string | null;
      led?: LedState;
      shot?: ShotSpec;
    }
  | { kind: 'wait'; time: number }
  | { kind: 'objective'; text: string; done?: boolean }
  | { kind: 'choice'; time: number; prompt?: string; options: ChoiceOption[] }
  | {
      kind: 'qte';
      keys: string[];
      window: number;
      label?: string;
      onFail?: string;
      /** Slow-motion factor while the prompt is up. */
      slowmo?: number;
    }
  | { kind: 'scan'; objective: string; points: ScanPoint[]; time?: number }
  | { kind: 'walk'; to: Anchor; objective: string; who?: string; time?: number }
  | { kind: 'meter'; changes: MeterChange[] }
  | { kind: 'stress'; value: number; show?: boolean }
  | {
      kind: 'fx';
      fade?: number;
      flash?: number;
      deviancy?: number;
      glitch?: number;
      shake?: number;
      time?: number;
      letterbox?: boolean;
      hud?: boolean;
      slowmo?: number;
    }
  | { kind: 'flowchart'; chapter: string; nodes: FlowNode[] }
  | { kind: 'chapterEnd' }
  | { kind: 'end'; epilogue: string[] };

export interface FlowNode {
  id: string;
  label: string;
  kind?: string;
  col: number;
  row: number;
  from?: string[];
  /** Shown as taken when this flag is set (or always, when omitted). */
  flag?: string;
}

export interface Chapter {
  id: string;
  title: string;
  beats: Beat[];
}
