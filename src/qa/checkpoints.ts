/**
 * Visual-tour checkpoint manifest.
 *
 * Each entry names a moment the piece has to get right. The automated tour
 * seeks to the timestamp, waits for the frame to settle, screenshots it, and
 * asserts the listed conditions. A failure here is a real regression, because
 * the whole show is a deterministic function of time.
 */

import type { World } from '../show/world';
import type { CameraDirector } from '../show/camera-director';
import type { Timeline } from '../show/timeline';

export interface CheckpointContext {
  world: World;
  director: CameraDirector;
  timeline: Timeline;
  /** Screen-space test: is this selectable's origin inside the safe frame? */
  onScreen(id: string, margin?: number): boolean;
  /** Apparent height of a subject as a fraction of the viewport. */
  screenSize(id: string): number;
  visible(id: string): boolean;
}

export interface Checkpoint {
  id: string;
  /** Show time in seconds. */
  t: number;
  chapter: string;
  shot: string;
  /** Human-readable description of what must be visible. */
  expect: string;
  file: string;
  /**
   * Seconds of show time to run before capturing, so transient effects
   * (bolts in flight, sparks, smoke) are present in the frame.
   */
  preroll?: number;
  /** Returns a list of failure messages; empty means the checkpoint passed. */
  assert(c: CheckpointContext): string[];
}

const ok: string[] = [];

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: 'prologue-open',
    t: 6.5,
    chapter: 'prologue',
    shot: 'void',
    expect: 'Black field, first gold prologue card legible, starfield still dim.',
    file: '01-prologue-open.png',
    assert: (c) => {
      const f: string[] = [];
      if (c.timeline.chapterAt(c.timeline.time).id !== 'prologue') f.push('not in the prologue chapter');
      if (c.director.current?.id !== 'void') f.push(`shot is ${c.director.current?.id}`);
      if (c.world.currentRegion !== 'exterior') f.push('region should be exterior');
      return f;
    },
  },
  {
    id: 'prologue-late',
    t: 29,
    chapter: 'prologue',
    shot: 'void',
    expect: 'Final prologue card receding, starfield now at full brightness.',
    file: '02-prologue-late.png',
    assert: () => ok,
  },
  {
    id: 'planet-reveal',
    t: 44,
    chapter: 'tatooine',
    shot: 'planet-reveal',
    expect: 'Tatooine limb across the frame, bright atmospheric edge, no ships.',
    file: '03-planet-reveal.png',
    assert: (c) => {
      const f: string[] = [];
      if (c.director.current?.id !== 'planet-reveal') f.push(`shot is ${c.director.current?.id}`);
      return f;
    },
  },
  {
    id: 'planet-drift',
    t: 56,
    chapter: 'tatooine',
    shot: 'planet-drift',
    expect: 'High drift over the day side; planet occupies the lower half.',
    file: '04-planet-drift.png',
    assert: () => ok,
  },
  {
    id: 'runner-entry',
    t: 70.5,
    chapter: 'pursuit',
    shot: 'runner-entry',
    expect: 'Corvette streaking past the lens at close range, engines lit.',
    file: '05-runner-entry.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.onScreen('runner', 0.18)) f.push('corvette is not in the safe frame');
      if (c.screenSize('runner') < 0.06) f.push('corvette is too small for an entry shot');
      return f;
    },
  },
  {
    id: 'runner-track',
    t: 81,
    chapter: 'pursuit',
    shot: 'runner-track',
    expect: 'Three-quarter tracking view: hammerhead, hull stripe and engine cluster all legible.',
    file: '06-runner-track.png',
    assert: (c) => (c.onScreen('runner', 0.15) ? ok : ['corvette out of frame']),
  },
  {
    id: 'destroyer-arrives',
    t: 104,
    chapter: 'pursuit',
    shot: 'destroyer-reveal',
    expect: 'Destroyer bow entering from the top of frame above the corvette.',
    file: '07-destroyer-arrives.png',
    assert: (c) => {
      const f: string[] = [];
      if (c.director.current?.id !== 'destroyer-reveal') f.push(`shot is ${c.director.current?.id}`);
      if (!c.visible('destroyer')) f.push('destroyer is not visible');
      return f;
    },
  },
  {
    id: 'destroyer-overhead',
    preroll: 1.2,
    t: 112,
    chapter: 'pursuit',
    shot: 'destroyer-reveal',
    expect: 'Destroyer belly filling most of the frame; the corvette is tiny beneath it.',
    file: '08-destroyer-overhead.png',
    assert: (c) => (c.screenSize('destroyer') > 0.5 ? ok : ['destroyer does not dominate the frame']),
  },
  {
    id: 'battle-profile',
    preroll: 2.2,
    t: 126,
    chapter: 'pursuit',
    shot: 'battle-profile',
    expect: 'Side-on two-shot with turbolaser bolts in flight and shield flashes.',
    file: '09-battle-profile.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.onScreen('runner', 0.1)) f.push('corvette out of frame');
      if (!c.visible('destroyer')) f.push('destroyer not visible');
      if (c.world.exteriorBolts.activeCount === 0) f.push('no turbolaser fire in flight');
      return f;
    },
  },
  {
    id: 'drives-hit',
    preroll: 2.2,
    t: 138,
    chapter: 'pursuit',
    shot: 'engines-hit',
    expect: 'Close on the corvette stern: engines failing, scorching visible.',
    file: '10-drives-hit.png',
    assert: (c) => (c.onScreen('runner', 0.12) ? ok : ['corvette out of frame']),
  },
  {
    id: 'tractor',
    t: 158,
    chapter: 'capture',
    shot: 'tractor',
    expect: 'Tractor beam from the destroyer belly to the powerless corvette.',
    file: '11-tractor.png',
    assert: (c) => (c.visible('destroyer') ? ok : ['destroyer not visible']),
  },
  {
    id: 'alongside',
    t: 172,
    chapter: 'capture',
    shot: 'alongside',
    expect: 'Corvette dwarfed against the destroyer flank; clear scale relationship.',
    file: '12-alongside.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.onScreen('runner', 0.1)) f.push('corvette out of frame');
      if (c.screenSize('destroyer') < 0.4) f.push('destroyer flank does not fill enough of the frame');
      return f;
    },
  },
  {
    id: 'corridor-establish',
    t: 190,
    chapter: 'corridor',
    shot: 'corridor-establish',
    expect: 'Interior wide: white corridor, sealed door far end, rebels taking positions.',
    file: '13-corridor-establish.png',
    assert: (c) => {
      const f: string[] = [];
      if (c.world.currentRegion !== 'interior') f.push('region should be interior');
      if (c.director.current?.id !== 'corridor-establish') f.push(`shot is ${c.director.current?.id}`);
      return f;
    },
  },
  {
    id: 'defender-eye',
    preroll: 2.0,
    t: 202,
    chapter: 'corridor',
    shot: 'defender-eye',
    expect: 'Eye level behind the defensive line; the door is glowing where it is being cut.',
    file: '14-defender-eye.png',
    assert: () => ok,
  },
  {
    id: 'breach',
    preroll: 1.6,
    t: 207.9,
    chapter: 'corridor',
    shot: 'door-breach',
    expect: 'The door tearing inward, debris and smoke, camera shake.',
    file: '15-breach.png',
    assert: (c) => (c.world.blastDoor.isBlown ? ok : ['door has not blown in']),
  },
  {
    id: 'firefight',
    preroll: 2.4,
    t: 220,
    chapter: 'corridor',
    shot: 'firefight',
    expect: 'Bolts crossing the corridor in both directions; troopers advancing, rebels in cover.',
    file: '16-firefight.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.world.troopers.some((t) => t.group.visible)) f.push('no stormtroopers present');
      if (c.world.interiorBolts.activeCount === 0) f.push('no blaster fire in flight');
      return f;
    },
  },
  {
    id: 'vader-entrance',
    preroll: 2.0,
    t: 246,
    chapter: 'corridor',
    shot: 'vader-entrance',
    expect: 'Vader through the breached doorway, low angle, red key light, troopers turned toward him.',
    file: '17-vader-entrance.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.visible('vader')) f.push('Vader is not visible');
      if (!c.onScreen('vader', 0.1)) f.push('Vader is outside the safe frame');
      return f;
    },
  },
  {
    id: 'plans',
    t: 269,
    chapter: 'plans',
    shot: 'plans-projection',
    expect: 'Leia beside the glowing station schematic; both readable.',
    file: '18-plans.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.visible('leia')) f.push('Leia is not visible');
      if (!c.onScreen('plans', 0.12)) f.push('the projection is outside the safe frame');
      return f;
    },
  },
  {
    id: 'transfer',
    preroll: 1.6,
    t: 280,
    chapter: 'plans',
    shot: 'transfer',
    expect: 'Close two-shot: the plans collapsing into the astromech.',
    file: '19-transfer.png',
    assert: (c) => (c.visible('r2') ? ok : ['astromech not visible']),
  },
  {
    id: 'droids-run',
    t: 293,
    chapter: 'pod',
    shot: 'droids-run',
    expect: 'Both droids moving aft; the astromech leading, the protocol droid trailing.',
    file: '20-droids-run.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.visible('r2')) f.push('astromech not visible');
      if (!c.visible('c3po')) f.push('protocol droid not visible');
      return f;
    },
  },
  {
    id: 'pod-bay',
    t: 303.4,
    chapter: 'pod',
    shot: 'bay',
    expect: 'Pod broadside in its cradle, launch hatch off its nose, the astromech on the boarding platform.',
    file: '21-pod-bay.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.world.pod.group.visible) f.push('pod not visible in the bay');
      if (!c.onScreen('r2', 0.05)) f.push('the astromech is outside the frame');
      return f;
    },
  },
  {
    id: 'pod-launch',
    t: 308.8,
    chapter: 'pod',
    shot: 'tube',
    expect: 'Hatch fully open on the starfield, the pod running out along its rail.',
    file: '21b-pod-launch.png',
    assert: (c) => (c.world.pod.group.visible ? ok : ['pod not visible']),
  },
  {
    id: 'pod-away',
    preroll: 1.6,
    t: 313,
    chapter: 'pod',
    shot: 'pod-away',
    expect: 'Exterior: the pod clear of the corvette, thrusters lit, capital ship behind.',
    file: '22-pod-away.png',
    assert: (c) => {
      const f: string[] = [];
      if (c.world.currentRegion !== 'exterior') f.push('region should be exterior');
      if (!c.world.pod.group.visible) f.push('pod not visible');
      return f;
    },
  },
  {
    id: 'descent',
    t: 320,
    chapter: 'pod',
    shot: 'descent',
    expect: 'The pod as a bright point against Tatooine, entry glow beginning.',
    file: '23-descent.png',
    assert: () => ok,
  },
  {
    id: 'epilogue-wide',
    t: 330,
    chapter: 'epilogue',
    shot: 'final-wide',
    expect: 'Very wide: destroyer and captured corvette above, pod falling toward the planet.',
    file: '24-epilogue-wide.png',
    assert: (c) => {
      const f: string[] = [];
      if (!c.visible('destroyer')) f.push('destroyer not visible');
      if (!c.visible('runner')) f.push('corvette not visible');
      return f;
    },
  },
  {
    id: 'closing-card',
    t: 340,
    chapter: 'epilogue',
    shot: 'closing-card',
    expect: 'Closing line legible over the wide final frame.',
    file: '25-closing-card.png',
    assert: () => ok,
  },
];
