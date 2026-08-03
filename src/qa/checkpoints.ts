/**
 * Screenshot checkpoint manifest.
 *
 * Each entry names a moment the automated visual tour must capture and the
 * assertions that must hold at that instant. The tour drives the application
 * through `window.__starfall`, renders exactly one deterministic frame per
 * checkpoint, and writes the screenshot named below.
 */

export interface Checkpoint {
  /** Stable identifier, also used as the screenshot filename stem. */
  id: string;
  /** Master timeline time in seconds. */
  time: number;
  chapter: string;
  /** Expected camera shot id. */
  shot: string;
  /** Expected scene. */
  scene: 'space' | 'interior';
  /** Human-readable subjects that must be on screen. */
  expects: string[];
  /** Machine-checkable assertions evaluated by the runtime test hooks. */
  assertions: CheckpointAssertion[];
  notes?: string;
}

export type CheckpointAssertion =
  | { kind: 'visible'; target: string; minScreenFraction?: number }
  | { kind: 'onScreen'; target: string }
  | { kind: 'brightness'; min: number; max?: number }
  | { kind: 'subtitle'; contains: string }
  | { kind: 'narration'; playing: boolean }
  | { kind: 'noIssues' }
  | { kind: 'particlesActive'; min: number }
  | { kind: 'boltsActive'; min: number };

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: '01-prologue-open',
    time: 7.5,
    chapter: 'prologue',
    shot: 'pro-1',
    scene: 'space',
    expects: ['golden prologue typography', 'starfield'],
    assertions: [{ kind: 'brightness', min: 0.008, max: 0.35 }, { kind: 'subtitle', contains: 'civil war' }, { kind: 'noIssues' }],
    notes: 'Opens in near darkness; text must be legible without being blown out.',
  },
  {
    id: '02-prologue-final-line',
    time: 39.5,
    chapter: 'prologue',
    shot: 'pro-1',
    scene: 'space',
    expects: ['final prologue card', 'starfield'],
    assertions: [{ kind: 'brightness', min: 0.008 }, { kind: 'noIssues' }],
  },
  {
    id: '03-tatooine-establish',
    time: 54,
    chapter: 'tatooine',
    shot: 'tat-1',
    scene: 'space',
    expects: ['Tatooine limb', 'atmospheric haze', 'starfield'],
    assertions: [{ kind: 'onScreen', target: 'tatooine' }, { kind: 'brightness', min: 0.05 }, { kind: 'noIssues' }],
    notes: 'The planet must read as a sphere with a bright limb, not a flat disc.',
  },
  {
    id: '04-tatooine-corvette',
    time: 80,
    chapter: 'tatooine',
    shot: 'tat-2',
    scene: 'space',
    expects: ['blockade runner', 'Tatooine below'],
    assertions: [{ kind: 'visible', target: 'runner', minScreenFraction: 0.0008 }, { kind: 'noIssues' }],
  },
  {
    id: '05-pursuit-tracking',
    time: 92,
    chapter: 'pursuit',
    shot: 'pur-1',
    scene: 'space',
    expects: ['blockade runner large in frame', 'engine glow'],
    assertions: [{ kind: 'visible', target: 'runner', minScreenFraction: 0.01 }, { kind: 'noIssues' }],
  },
  {
    id: '06-destroyer-reveal',
    time: 112,
    chapter: 'pursuit',
    shot: 'pur-2',
    scene: 'space',
    expects: ['destroyer bow entering frame', 'blockade runner small below'],
    assertions: [
      { kind: 'onScreen', target: 'destroyer' },
      { kind: 'onScreen', target: 'runner' },
      { kind: 'noIssues' },
    ],
    notes: 'The scale relationship is the point of this frame.',
  },
  {
    id: '07-under-the-hull',
    time: 126,
    chapter: 'pursuit',
    shot: 'pur-3',
    scene: 'space',
    expects: ['destroyer underside filling frame', 'turbolaser fire'],
    assertions: [{ kind: 'visible', target: 'destroyer', minScreenFraction: 0.2 }, { kind: 'noIssues' }],
  },
  {
    id: '08-battle-profile',
    time: 139,
    chapter: 'pursuit',
    shot: 'pur-4',
    scene: 'space',
    expects: ['both ships in profile', 'bolts in flight', 'impact flashes'],
    assertions: [
      { kind: 'onScreen', target: 'destroyer' },
      { kind: 'onScreen', target: 'runner' },
      { kind: 'boltsActive', min: 1 },
      { kind: 'noIssues' },
    ],
  },
  {
    id: '09-corvette-hit',
    time: 149,
    chapter: 'pursuit',
    shot: 'pur-5',
    scene: 'space',
    expects: ['corvette taking hits', 'sparks and smoke'],
    assertions: [{ kind: 'visible', target: 'runner', minScreenFraction: 0.02 }, { kind: 'noIssues' }],
  },
  {
    id: '10-engines-dead',
    time: 155,
    chapter: 'pursuit',
    shot: 'pur-6',
    scene: 'space',
    expects: ['engine block blown out', 'debris'],
    assertions: [{ kind: 'visible', target: 'runner', minScreenFraction: 0.01 }, { kind: 'noIssues' }],
  },
  {
    id: '11-capture-two-shot',
    time: 165,
    chapter: 'capture',
    shot: 'cap-1',
    scene: 'space',
    expects: ['destroyer above', 'corvette below', 'tractor beam'],
    assertions: [
      { kind: 'onScreen', target: 'destroyer' },
      { kind: 'onScreen', target: 'runner' },
      { kind: 'noIssues' },
    ],
  },
  {
    id: '12-umbilical',
    time: 191,
    chapter: 'capture',
    shot: 'cap-3',
    scene: 'space',
    expects: ['boarding umbilical', 'corvette dorsal hull'],
    assertions: [{ kind: 'visible', target: 'runner', minScreenFraction: 0.05 }, { kind: 'noIssues' }],
  },
  {
    id: '13-corridor-establish',
    time: 200,
    chapter: 'corridor',
    shot: 'cor-1',
    scene: 'interior',
    expects: ['white corridor', 'rebel defenders moving into position', 'red alarm light'],
    assertions: [{ kind: 'brightness', min: 0.06 }, { kind: 'visible', target: 'rebel-0' }, { kind: 'noIssues' }],
    notes: 'Interiors must stay readable - never crush to black.',
  },
  {
    id: '14-defenders-ready',
    time: 212,
    chapter: 'corridor',
    shot: 'cor-2',
    scene: 'interior',
    expects: ['rebels aiming at the door', 'door glowing'],
    assertions: [{ kind: 'visible', target: 'rebel-1' }, { kind: 'noIssues' }],
  },
  {
    id: '15-door-breach',
    time: 219.1,
    chapter: 'corridor',
    shot: 'cor-3',
    scene: 'interior',
    expects: ['door blown inward', 'smoke and debris', 'hard flash'],
    assertions: [{ kind: 'brightness', min: 0.08 }, { kind: 'particlesActive', min: 20 }, { kind: 'noIssues' }],
  },
  {
    id: '16-firefight',
    time: 224.5,
    chapter: 'corridor',
    shot: 'cor-4',
    scene: 'interior',
    expects: ['stormtroopers advancing', 'blaster bolts', 'rebels firing'],
    assertions: [{ kind: 'visible', target: 'trooper-0' }, { kind: 'boltsActive', min: 1 }, { kind: 'noIssues' }],
  },
  {
    id: '17-line-breaks',
    time: 232,
    chapter: 'corridor',
    shot: 'cor-5',
    scene: 'interior',
    expects: ['fallen defenders', 'smoke'],
    assertions: [{ kind: 'noIssues' }],
  },
  {
    id: '18-vader-entrance',
    time: 248,
    chapter: 'corridor',
    shot: 'cor-7',
    scene: 'interior',
    expects: ['Vader silhouette', 'red rim light', 'stormtroopers standing aside'],
    assertions: [{ kind: 'visible', target: 'vader', minScreenFraction: 0.01 }, { kind: 'brightness', min: 0.03 }, { kind: 'noIssues' }],
    notes: 'Must be dramatic but still readable.',
  },
  {
    id: '19-vader-advance',
    time: 258,
    chapter: 'corridor',
    shot: 'cor-8',
    scene: 'interior',
    expects: ['Vader walking the corridor', 'troopers flanking'],
    assertions: [{ kind: 'visible', target: 'vader', minScreenFraction: 0.01 }, { kind: 'noIssues' }],
  },
  {
    id: '20-leia-console',
    time: 276,
    chapter: 'plans',
    shot: 'pln-2',
    scene: 'interior',
    expects: ['Leia at the archive console', 'data projection booting'],
    assertions: [{ kind: 'visible', target: 'leia', minScreenFraction: 0.01 }, { kind: 'noIssues' }],
  },
  {
    id: '21-plans-projection',
    time: 284,
    chapter: 'plans',
    shot: 'pln-3',
    scene: 'interior',
    expects: ['glowing station schematic', 'Leia'],
    assertions: [{ kind: 'visible', target: 'plans' }, { kind: 'noIssues' }],
  },
  {
    id: '22-transfer',
    time: 293,
    chapter: 'plans',
    shot: 'pln-4',
    scene: 'interior',
    expects: ['Leia kneeling by R2', 'transfer beam', 'R2 data port lit'],
    assertions: [
      { kind: 'visible', target: 'r2', minScreenFraction: 0.004 },
      { kind: 'visible', target: 'leia' },
      { kind: 'noIssues' },
    ],
  },
  {
    id: '23-droids-run',
    time: 310,
    chapter: 'escape',
    shot: 'esc-1',
    scene: 'interior',
    expects: ['astromech rolling aft', 'protocol droid stopped dead behind him'],
    assertions: [
      { kind: 'visible', target: 'r2', minScreenFraction: 0.002 },
      { kind: 'visible', target: 'threepio', minScreenFraction: 0.002 },
      { kind: 'noIssues' },
    ],
  },
  {
    id: '24-droids-reach-the-pod',
    time: 316,
    chapter: 'escape',
    shot: 'esc-2',
    scene: 'interior',
    expects: ['astromech at the pod hatch', 'protocol droid catching up', 'lit hatch sign'],
    assertions: [
      { kind: 'visible', target: 'threepio', minScreenFraction: 0.004 },
      { kind: 'visible', target: 'r2', minScreenFraction: 0.004 },
      { kind: 'noIssues' },
    ],
  },
  {
    id: '25-pod-separation',
    // Late in the shot, where the gap between pod and hull is widest. Sampled at
    // launch the pod is still pressed against the hull's apex and the separation
    // - the point of the shot - is the one thing you cannot see.
    time: 325.5,
    chapter: 'escape',
    shot: 'esc-3',
    scene: 'space',
    expects: ['pod leaving the corvette', 'thruster flare'],
    assertions: [
      { kind: 'visible', target: 'pod', minScreenFraction: 0.0015 },
      // The thruster plume sits twenty metres from the lens. Capped so an
      // over-scaled particle burst fails the tour instead of quietly washing
      // the shot to white.
      { kind: 'brightness', min: 0.02, max: 0.5 },
      { kind: 'noIssues' },
    ],
  },
  {
    id: '26-pod-falling',
    time: 334,
    chapter: 'escape',
    shot: 'esc-4',
    scene: 'space',
    expects: ['pod falling away', 'both ships above', 'planet below'],
    assertions: [{ kind: 'onScreen', target: 'pod' }, { kind: 'noIssues' }],
  },
  {
    id: '27-descent',
    time: 348,
    chapter: 'escape',
    shot: 'esc-5',
    scene: 'space',
    expects: ['pod against the desert', 'atmosphere'],
    assertions: [{ kind: 'onScreen', target: 'pod' }, { kind: 'brightness', min: 0.05 }, { kind: 'noIssues' }],
  },
  {
    id: '28-epilogue-entry',
    time: 360,
    chapter: 'epilogue',
    shot: 'epi-1',
    scene: 'space',
    expects: ['pod as a bright point entering atmosphere'],
    assertions: [{ kind: 'brightness', min: 0.04 }, { kind: 'noIssues' }],
  },
  {
    id: '29-epilogue-ships',
    time: 374,
    chapter: 'epilogue',
    shot: 'epi-2',
    scene: 'space',
    expects: ['destroyer and captured corvette overhead', 'closing line'],
    assertions: [{ kind: 'onScreen', target: 'destroyer' }, { kind: 'noIssues' }],
  },
];

export const CHECKPOINT_IDS = CHECKPOINTS.map((c) => c.id);
