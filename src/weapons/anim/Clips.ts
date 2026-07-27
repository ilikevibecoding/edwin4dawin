import * as THREE from 'three';
import { clamp, saturate, smoothstep } from '../../core/MathUtils';
import { createPartState, type PartState } from './State';

/**
 * Procedural animation clips.
 *
 * Everything is authored in normalised time, so a clip always fits the duration
 * the weapon definition states — `reloadTime` is a contract with the rest of the
 * game (the HUD draws a progress bar against it) and an animation that runs long
 * or short is immediately visible. Sampling is smoothstep between sparse keys,
 * which gives C1 continuity for free; the fast beats (the mag tap, the knife
 * slash) are authored with dense keys instead of relying on easing.
 */

export type CueId =
  | 'magOut'
  | 'magDrop'
  | 'magIn'
  | 'tap'
  | 'boltBack'
  | 'boltForward'
  | 'pumpBack'
  | 'pumpForward'
  | 'shellInsert'
  | 'cylinderOpen'
  | 'cylinderClose'
  | 'rocketLoad'
  | 'eject'
  | 'inspect'
  | 'knifeSwing'
  | 'knifeHit'
  | 'buttStrike'
  | 'grenadePin'
  | 'grenadeThrow'
  | 'selector';

export interface ClipCue {
  at: number;
  id: CueId;
}

/** Which weapon anchor a hand override is expressed relative to. */
export type HandAnchor = 'support' | 'grip' | 'magWell' | 'charge' | 'pouch';

export interface HandPose {
  /** 0 = ride the natural anchor, 1 = fully at `anchor` + `offset`. */
  weight: number;
  anchor: HandAnchor;
  readonly offset: THREE.Vector3;
  readonly rot: THREE.Vector3;
  hidden: boolean;
}

/** A prop carried in the support hand for part of a clip. */
export type ClipProp = 'none' | 'mag' | 'shell' | 'rocket' | 'grenade';

export interface ClipOut {
  readonly position: THREE.Vector3;
  readonly rotation: THREE.Vector3;
  readonly parts: PartState;
  readonly left: HandPose;
  readonly right: HandPose;
  prop: ClipProp;
}

export interface ClipEnv {
  /** The reload started with an empty chamber, so the bolt has to be released. */
  empty: boolean;
  ads: number;
}

export interface Clip {
  readonly name: string;
  readonly cues: readonly ClipCue[];
  /** Clips that survive being interrupted mid-way (the pump, the bolt cycle). */
  readonly essential?: boolean;
  sample(u: number, out: ClipOut, env: ClipEnv): void;
}

// ---------------------------------------------------------------------------
// Track sampling
// ---------------------------------------------------------------------------

type V3Key = readonly [t: number, x: number, y: number, z: number];
type NKey = readonly [t: number, v: number];

function trackV3(keys: readonly V3Key[], u: number, out: THREE.Vector3): THREE.Vector3 {
  const n = keys.length;
  if (n === 0) return out.set(0, 0, 0);
  if (u <= keys[0][0]) return out.set(keys[0][1], keys[0][2], keys[0][3]);
  for (let i = 1; i < n; i++) {
    const b = keys[i];
    if (u > b[0]) continue;
    const a = keys[i - 1];
    const t = smoothstep(a[0], b[0], u);
    return out.set(
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
      a[3] + (b[3] - a[3]) * t,
    );
  }
  const last = keys[n - 1];
  return out.set(last[1], last[2], last[3]);
}

function trackN(keys: readonly NKey[], u: number): number {
  const n = keys.length;
  if (n === 0) return 0;
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < n; i++) {
    const b = keys[i];
    if (u > b[0]) continue;
    const a = keys[i - 1];
    return a[1] + (b[1] - a[1]) * smoothstep(a[0], b[0], u);
  }
  return keys[n - 1][1];
}

export function createClipOut(): ClipOut {
  return {
    position: new THREE.Vector3(),
    rotation: new THREE.Vector3(),
    parts: createPartState(),
    left: { weight: 0, anchor: 'support', offset: new THREE.Vector3(), rot: new THREE.Vector3(), hidden: false },
    right: { weight: 0, anchor: 'grip', offset: new THREE.Vector3(), rot: new THREE.Vector3(), hidden: false },
    prop: 'none',
  };
}

function resetHand(h: HandPose, anchor: HandAnchor): void {
  h.weight = 0;
  h.anchor = anchor;
  h.offset.set(0, 0, 0);
  h.rot.set(0, 0, 0);
  h.hidden = false;
}

export function resetClipOut(out: ClipOut): void {
  out.position.set(0, 0, 0);
  out.rotation.set(0, 0, 0);
  resetHand(out.left, 'support');
  resetHand(out.right, 'grip');
  out.prop = 'none';
}

// ---------------------------------------------------------------------------
// Magazine reload
// ---------------------------------------------------------------------------

/** Weapon dips inboard so the magwell is visible, then returns. */
const RELOAD_POS: readonly V3Key[] = [
  [0, 0, 0, 0],
  [0.14, -0.014, -0.03, 0.026],
  [0.34, -0.026, -0.05, 0.04],
  [0.62, -0.022, -0.044, 0.036],
  [0.78, -0.012, -0.022, 0.016],
  [0.84, -0.006, 0.006, 0.004],
  [1, 0, 0, 0],
];
const RELOAD_ROT: readonly V3Key[] = [
  [0, 0, 0, 0],
  [0.14, 0.12, 0.24, -0.3],
  [0.34, 0.2, 0.4, -0.52],
  [0.62, 0.18, 0.37, -0.48],
  [0.78, 0.08, 0.16, -0.2],
  [0.84, -0.05, 0.04, -0.04],
  [0.92, 0.02, 0, 0],
  [1, 0, 0, 0],
];

const RELOAD_MAG_DROP: readonly NKey[] = [
  [0.12, 0],
  [0.2, 0.35],
  [0.26, 1.2],
];
const RELOAD_HAND_W: readonly NKey[] = [
  [0, 0],
  [0.12, 1],
  [0.82, 1],
  [0.96, 0],
];
/** Support hand: magwell, down to the pouch, back up with a fresh magazine. */
const RELOAD_HAND: readonly V3Key[] = [
  [0.1, 0.0, 0.03, 0.0],
  [0.22, -0.01, 0.0, 0.01],
  [0.36, -0.07, -0.2, 0.14],
  [0.46, -0.08, -0.24, 0.16],
  [0.58, -0.05, -0.14, 0.1],
  [0.68, -0.005, -0.035, 0.005],
  [0.74, 0, 0.005, 0],
  [0.86, 0.0, 0.02, 0.0],
];

export class MagReloadClip implements Clip {
  readonly name: string;
  readonly cues: readonly ClipCue[];

  constructor(private readonly withCharge: boolean) {
    this.name = withCharge ? 'reloadEmpty' : 'reload';
    this.cues = withCharge
      ? [
          { at: 0.1, id: 'magOut' },
          { at: 0.26, id: 'magDrop' },
          { at: 0.7, id: 'magIn' },
          { at: 0.76, id: 'tap' },
          { at: 0.86, id: 'boltBack' },
          { at: 0.93, id: 'boltForward' },
        ]
      : [
          { at: 0.11, id: 'magOut' },
          { at: 0.27, id: 'magDrop' },
          { at: 0.72, id: 'magIn' },
          { at: 0.85, id: 'tap' },
        ];
  }

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(RELOAD_POS, u, out.position);
    trackV3(RELOAD_ROT, u, out.rotation);

    const p = out.parts;
    p.magDrop = u < 0.66 ? trackN(RELOAD_MAG_DROP, u) : trackN([[0.66, 1.0], [0.72, 0]], u);
    p.magVisible = u < 0.26 || u >= 0.66;
    p.trigger = 0;

    out.left.anchor = 'magWell';
    out.left.weight = trackN(RELOAD_HAND_W, u);
    trackV3(RELOAD_HAND, u, out.left.offset);
    out.left.rot.set(0, 0, 0);
    out.prop = u > 0.42 && u < 0.7 ? 'mag' : 'none';

    if (this.withCharge) {
      // Bolt is held back on an empty gun until the charging handle releases it.
      p.bolt = u < 0.9 ? 1 : trackN([[0.9, 1], [0.94, 0]], u);
      p.charging = trackN(
        [
          [0.8, 0],
          [0.87, 1],
          [0.9, 1],
          [0.94, 0],
        ],
        u,
      );
      p.caseVisible = u > 0.94;
      if (u > 0.78 && u < 0.96) {
        out.left.anchor = 'charge';
        out.left.weight = 1;
        out.left.offset.set(0, 0.004, -p.charging * 0.02);
        // Extra snap in the weapon as the bolt slams home.
        const slam = smoothstep(0.9, 0.945, u) * (1 - smoothstep(0.945, 1, u));
        out.position.z += slam * 0.012;
        out.rotation.x += slam * 0.09;
      }
    } else {
      p.caseVisible = true;
    }
    void env;
  }
}

// ---------------------------------------------------------------------------
// Shell-at-a-time reload (pump shotgun)
// ---------------------------------------------------------------------------

const SHELL_POS: readonly V3Key[] = [
  [0, 0, 0, 0],
  [0.3, -0.016, -0.034, 0.026],
  [0.7, -0.014, -0.03, 0.024],
  [1, 0, 0, 0],
];
const SHELL_ROT: readonly V3Key[] = [
  [0, 0, 0, 0],
  [0.3, -0.12, 0.3, -0.62],
  [0.7, -0.1, 0.28, -0.58],
  [1, 0, 0, 0],
];
const SHELL_HAND: readonly V3Key[] = [
  [0, 0, 0, 0],
  [0.26, -0.03, -0.2, 0.1],
  [0.52, -0.01, -0.05, 0.03],
  [0.66, 0, -0.005, -0.01],
  [0.8, -0.01, -0.05, 0.04],
  [1, 0, 0, 0],
];

export class ShellInsertClip implements Clip {
  readonly name = 'shellInsert';
  readonly cues: readonly ClipCue[] = [{ at: 0.66, id: 'shellInsert' }];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(SHELL_POS, u, out.position);
    trackV3(SHELL_ROT, u, out.rotation);
    out.left.anchor = 'magWell';
    out.left.weight = trackN([[0, 0], [0.18, 1], [0.86, 1], [1, 0]], u);
    trackV3(SHELL_HAND, u, out.left.offset);
    out.left.rot.set(0, 0, 0);
    out.prop = u > 0.3 && u < 0.7 ? 'shell' : 'none';
    void env;
  }
}

// ---------------------------------------------------------------------------
// Revolver reload
// ---------------------------------------------------------------------------

export class RevolverReloadClip implements Clip {
  readonly name = 'revolverReload';
  readonly cues: readonly ClipCue[] = [
    { at: 0.16, id: 'cylinderOpen' },
    { at: 0.34, id: 'eject' },
    { at: 0.68, id: 'magIn' },
    { at: 0.86, id: 'cylinderClose' },
  ];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(
      [
        [0, 0, 0, 0],
        [0.2, -0.02, -0.02, 0.04],
        [0.4, -0.026, -0.01, 0.05],
        [0.75, -0.02, -0.02, 0.04],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.2, 0.1, 0.5, -0.7],
        [0.4, 0.45, 0.62, -1.15],
        [0.62, 0.4, 0.6, -1.1],
        [0.86, 0.05, 0.2, -0.3],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    const p = out.parts;
    p.cylinder = trackN([[0.2, 0], [0.42, 1.2], [0.66, 2.1], [0.86, 2.1]], u);
    p.caseVisible = u < 0.3 || u > 0.7;
    p.hammer = 1;
    out.left.anchor = 'magWell';
    out.left.weight = trackN([[0.1, 0], [0.26, 1], [0.8, 1], [0.94, 0]], u);
    trackV3(
      [
        [0.2, -0.01, 0.02, -0.02],
        [0.34, -0.03, -0.06, -0.02],
        [0.5, -0.05, -0.18, 0.08],
        [0.64, -0.02, -0.02, -0.02],
        [0.8, -0.02, 0.0, -0.02],
      ],
      u,
      out.left.offset,
    );
    out.prop = u > 0.44 && u < 0.7 ? 'mag' : 'none';
    void env;
  }
}

// ---------------------------------------------------------------------------
// Rocket reload
// ---------------------------------------------------------------------------

export class RocketReloadClip implements Clip {
  readonly name = 'rocketReload';
  readonly cues: readonly ClipCue[] = [{ at: 0.74, id: 'rocketLoad' }];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(
      [
        [0, 0, 0, 0],
        [0.25, 0.03, -0.06, 0.05],
        [0.6, 0.04, -0.07, 0.06],
        [0.85, 0.01, -0.02, 0.02],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.25, -0.1, -0.34, 0.22],
        [0.6, -0.14, -0.4, 0.26],
        [0.85, -0.04, -0.1, 0.06],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    out.parts.ordnanceVisible = u > 0.74;
    // The support hand leaves the foregrip, collects a round from the pack and
    // pushes it into the muzzle, so it works relative to the support anchor.
    out.left.anchor = 'support';
    out.left.weight = trackN([[0.1, 0], [0.3, 1], [0.8, 1], [0.95, 0]], u);
    trackV3(
      [
        [0.2, 0.0, -0.1, 0.24],
        [0.45, -0.02, -0.16, 0.3],
        [0.62, -0.02, -0.06, -0.24],
        [0.78, 0.0, 0.0, -0.34],
        [0.9, 0, 0, 0],
      ],
      u,
      out.left.offset,
    );
    out.prop = u > 0.28 && u < 0.78 ? 'rocket' : 'none';
    void env;
  }
}

// ---------------------------------------------------------------------------
// Draw / holster
// ---------------------------------------------------------------------------

export class DrawClip implements Clip {
  readonly name = 'draw';
  readonly cues: readonly ClipCue[] = [{ at: 0.55, id: 'selector' }];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    const e = 1 - Math.pow(1 - saturate(u), 2.4);
    out.position.set(0.04 * (1 - e), -0.34 * (1 - e), 0.06 * (1 - e));
    out.rotation.set(-1.05 * (1 - e), 0.5 * (1 - e), 0.62 * (1 - e));
    // Settle: a small overshoot as the weapon arrives in frame.
    const settle = smoothstep(0.6, 0.86, u) * (1 - smoothstep(0.86, 1, u));
    out.position.y += settle * 0.012;
    out.rotation.x += settle * 0.07;
    out.parts.safety = smoothstep(0.5, 0.7, u);
    void env;
  }
}

export class HolsterClip implements Clip {
  readonly name = 'holster';
  readonly cues: readonly ClipCue[] = [];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    const e = Math.pow(saturate(u), 1.8);
    out.position.set(0.04 * e, -0.36 * e, 0.07 * e);
    out.rotation.set(-1.1 * e, 0.54 * e, 0.66 * e);
    out.parts.safety = 1 - smoothstep(0.1, 0.4, u);
    void env;
  }
}

// ---------------------------------------------------------------------------
// Inspect
// ---------------------------------------------------------------------------

/** Idle flourish: brings the weapon in, turns the left side up, checks the mag. */
export class InspectClip implements Clip {
  readonly name = 'inspect';
  readonly cues: readonly ClipCue[] = [{ at: 0.05, id: 'inspect' }];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(
      [
        [0, 0, 0, 0],
        [0.18, -0.03, 0.01, 0.07],
        [0.42, -0.05, 0.0, 0.09],
        [0.62, -0.02, -0.02, 0.06],
        [0.82, -0.01, 0.0, 0.03],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.18, 0.1, 0.7, -0.35],
        [0.42, 0.16, 1.05, -0.5],
        [0.58, -0.06, 0.6, 0.34],
        [0.78, -0.12, -0.3, 0.5],
        [0.92, 0.03, 0.05, 0.06],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    // Thumb over the magazine, then a tug to check it is seated.
    out.left.anchor = 'magWell';
    out.left.weight = trackN([[0.2, 0], [0.34, 0.85], [0.62, 0.85], [0.76, 0]], u);
    trackV3(
      [
        [0.3, 0, 0.03, 0],
        [0.46, 0, 0.045, 0.005],
        [0.62, 0, 0.02, 0],
      ],
      u,
      out.left.offset,
    );
    out.parts.trigger = 0;
    void env;
  }
}

// ---------------------------------------------------------------------------
// Melee
// ---------------------------------------------------------------------------

/** Knife: wind-up across the body, fast diagonal slash, long follow-through. */
export class KnifeSlashClip implements Clip {
  readonly name = 'knifeSlash';
  readonly cues: readonly ClipCue[] = [
    { at: 0.2, id: 'knifeSwing' },
    { at: 0.36, id: 'knifeHit' },
  ];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(
      [
        [0, 0, 0, 0],
        [0.18, 0.07, 0.06, 0.1],
        [0.26, 0.05, 0.05, 0.04],
        [0.36, -0.12, -0.04, -0.16],
        [0.5, -0.16, -0.08, -0.1],
        [0.72, -0.04, -0.02, 0.02],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.18, -0.2, 1.1, 0.55],
        [0.26, -0.24, 1.25, 0.6],
        [0.36, 0.3, -0.85, -0.7],
        [0.5, 0.4, -1.0, -0.9],
        [0.72, 0.1, -0.2, -0.2],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    void env;
  }
}

/** Rifle butt-stroke: drive the stock forward and up, then recover. */
export class ButtStrikeClip implements Clip {
  readonly name = 'buttStrike';
  readonly cues: readonly ClipCue[] = [{ at: 0.3, id: 'buttStrike' }];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(
      [
        [0, 0, 0, 0],
        [0.16, 0.02, -0.03, 0.1],
        [0.3, -0.05, 0.03, -0.2],
        [0.44, -0.06, 0.04, -0.22],
        [0.7, -0.02, 0.01, -0.04],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.16, -0.3, -0.5, -0.3],
        [0.3, 0.5, 0.9, 0.5],
        [0.44, 0.6, 1.05, 0.6],
        [0.7, 0.15, 0.3, 0.16],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    void env;
  }
}

// ---------------------------------------------------------------------------
// Action cycling
// ---------------------------------------------------------------------------

/** Bolt-action cycle: lift, pull, eject, feed, close. */
export class BoltCycleClip implements Clip {
  readonly name = 'boltCycle';
  readonly essential = true;
  readonly cues: readonly ClipCue[] = [
    { at: 0.22, id: 'boltBack' },
    { at: 0.3, id: 'eject' },
    { at: 0.78, id: 'boltForward' },
  ];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    const p = out.parts;
    p.boltHandle = trackN([[0.05, 0], [0.2, 1], [0.72, 1], [0.9, 0]], u);
    p.bolt = trackN([[0.18, 0], [0.42, 1], [0.6, 1], [0.82, 0]], u);
    p.caseVisible = u > 0.68;
    // The whole weapon rocks as the shooter works the bolt.
    trackV3(
      [
        [0, 0, 0, 0],
        [0.3, 0.012, -0.008, 0.012],
        [0.6, 0.014, -0.01, 0.014],
        [0.9, 0.004, -0.002, 0.004],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.3, -0.03, -0.12, 0.1],
        [0.6, -0.04, -0.16, 0.13],
        [0.9, -0.01, -0.04, 0.03],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    out.right.anchor = 'charge';
    out.right.weight = trackN([[0.02, 0], [0.16, 1], [0.84, 1], [0.98, 0]], u);
    out.right.offset.set(0.01, 0.014 * p.boltHandle, 0.03 - p.bolt * 0.06);
    void env;
  }
}

/** Pump cycle: back, eject, forward, chamber. */
export class PumpCycleClip implements Clip {
  readonly name = 'pumpCycle';
  readonly essential = true;
  readonly cues: readonly ClipCue[] = [
    { at: 0.16, id: 'pumpBack' },
    { at: 0.3, id: 'eject' },
    { at: 0.72, id: 'pumpForward' },
  ];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    const p = out.parts;
    p.pump = trackN([[0.08, 0], [0.42, 1], [0.52, 1], [0.82, 0]], u);
    p.bolt = p.pump;
    p.caseVisible = u > 0.6;
    trackV3(
      [
        [0, 0, 0, 0],
        [0.4, 0.0, -0.006, 0.016],
        [0.7, 0.0, -0.004, -0.006],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.4, 0.05, -0.05, 0.04],
        [0.7, -0.03, 0.02, -0.02],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    void env;
  }
}

// ---------------------------------------------------------------------------
// Grenade throw
// ---------------------------------------------------------------------------

/**
 * The weapon swings out of the way to the right while the support hand cooks and
 * throws. Release is at 0.46 so the arc starts before the arm has finished its
 * follow-through, which is what makes a throw look committed.
 */
export class GrenadeThrowClip implements Clip {
  readonly name = 'grenadeThrow';
  readonly cues: readonly ClipCue[] = [
    { at: 0.12, id: 'grenadePin' },
    { at: 0.46, id: 'grenadeThrow' },
  ];

  sample(u: number, out: ClipOut, env: ClipEnv): void {
    trackV3(
      [
        [0, 0, 0, 0],
        [0.2, 0.05, -0.06, 0.05],
        [0.44, 0.06, -0.07, 0.06],
        [0.7, 0.03, -0.03, 0.03],
        [1, 0, 0, 0],
      ],
      u,
      out.position,
    );
    trackV3(
      [
        [0, 0, 0, 0],
        [0.2, -0.06, -0.4, 0.5],
        [0.44, -0.08, -0.46, 0.56],
        [0.7, -0.03, -0.2, 0.24],
        [1, 0, 0, 0],
      ],
      u,
      out.rotation,
    );
    out.left.anchor = 'pouch';
    out.left.weight = trackN([[0, 0], [0.14, 1], [0.66, 1], [0.9, 0]], u);
    trackV3(
      [
        [0.1, 0, 0, 0],
        [0.3, 0.04, 0.06, 0.16],
        [0.42, 0.02, 0.12, 0.2],
        [0.5, -0.04, 0.16, -0.14],
        [0.62, -0.06, 0.1, -0.24],
        [0.8, -0.02, 0.02, -0.06],
      ],
      u,
      out.left.offset,
    );
    trackV3(
      [
        [0.1, 0, 0, 0],
        [0.42, -0.6, 0, 0],
        [0.56, 0.7, 0, 0],
        [0.8, 0.1, 0, 0],
      ],
      u,
      out.left.rot,
    );
    out.prop = u < 0.48 ? 'grenade' : 'none';
    void env;
  }
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/**
 * Runs one clip at a time and fires its cues as the playhead crosses them. Cues
 * are edge-triggered on normalised time, so they land at the same point in the
 * motion whatever duration the weapon definition asks for.
 */
export class ClipPlayer {
  private clip: Clip | null = null;
  private duration = 1;
  private time = 0;
  private cueIndex = 0;
  onCue: ((id: CueId) => void) | null = null;

  get active(): boolean {
    return this.clip !== null;
  }

  get current(): Clip | null {
    return this.clip;
  }

  /** 0..1 progress, or 1 when idle. */
  get progress(): number {
    return this.clip ? saturate(this.time / this.duration) : 1;
  }

  get remaining(): number {
    return this.clip ? Math.max(0, this.duration - this.time) : 0;
  }

  play(clip: Clip, duration: number): void {
    this.clip = clip;
    this.duration = Math.max(0.01, duration);
    this.time = 0;
    this.cueIndex = 0;
  }

  cancel(): void {
    this.clip = null;
    this.time = 0;
    this.cueIndex = 0;
  }

  update(dt: number, out: ClipOut, env: ClipEnv): void {
    const clip = this.clip;
    if (!clip) return;
    this.time += dt;
    const u = clamp(this.time / this.duration, 0, 1);
    while (this.cueIndex < clip.cues.length && clip.cues[this.cueIndex].at <= u) {
      this.onCue?.(clip.cues[this.cueIndex].id);
      this.cueIndex++;
    }
    clip.sample(u, out, env);
    if (this.time >= this.duration) this.clip = null;
  }
}
