import type { Stance, WeaponDefinition } from '../../core/Contracts';

/**
 * Everything the animation layers are allowed to read. Bundling it keeps the
 * layers pure functions of state, which is what makes them safe to reorder and
 * cheap to reason about.
 */
export interface ViewState {
  weapon: WeaponDefinition | null;
  /** 0..1 aim-down-sight blend. */
  ads: number;
  /** 0..1 how much of the sprint pose is engaged. */
  sprint: number;
  tacticalSprint: boolean;
  stance: Stance;
  grounded: boolean;
  /** Horizontal speed in m/s. */
  speed: number;
  /** speed normalised against walk speed, so 1 = walking, >1 = sprinting. */
  speedNorm: number;
  /** Footstep-locked cycle phase in radians; the bob is a function of this. */
  moveCycle: number;
  /** Look delta consumed this frame, radians. */
  lookYawDelta: number;
  lookPitchDelta: number;
  /** 0..1 how blocked the muzzle is by nearby geometry. */
  obstruction: number;
  firing: boolean;
  reloading: boolean;
  empty: boolean;
  /** Seconds since the last shot. */
  sinceShot: number;
  /** Fraction of the magazine remaining, 0..1. */
  magFraction: number;
}

export function createViewState(): ViewState {
  return {
    weapon: null,
    ads: 0,
    sprint: 0,
    tacticalSprint: false,
    stance: 'stand',
    grounded: true,
    speed: 0,
    speedNorm: 0,
    moveCycle: 0,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    obstruction: 0,
    firing: false,
    reloading: false,
    empty: false,
    sinceShot: 99,
    magFraction: 1,
  };
}

/**
 * Per-part animation channels. The viewmodel writes these every frame and the
 * weapon model maps them onto whichever parts it actually has, so a pistol can
 * ignore `pump` and a revolver can ignore `bolt` without any special casing.
 */
export interface PartState {
  /** 0..1 bolt carrier travel, 1 = fully rearward. */
  bolt: number;
  /** 0..1 charging handle travel (usually follows the bolt, but not always). */
  charging: number;
  /** 0..1 bolt-action handle rotation, 1 = unlocked/up. */
  boltHandle: number;
  /** 0..1 pump/forend travel. */
  pump: number;
  /** 0..1 pistol slide travel. */
  slide: number;
  /** 0..1 trigger pull. */
  trigger: number;
  /** 0..1 hammer cocked. */
  hammer: number;
  /** Cylinder rotation in radians (revolver). */
  cylinder: number;
  /** 0..1 magazine displacement out of the well. */
  magDrop: number;
  magVisible: boolean;
  /** 0..1 ejection port dust cover open. */
  dustCover: number;
  /** A chambered case is visible in the port. */
  caseVisible: boolean;
  /** 0..1 safety selector rotation towards FIRE. */
  safety: number;
  /** Rocket/shell present in the tube. */
  ordnanceVisible: boolean;
  /** 0..1 bipod deployment. */
  bipod: number;
}

export function createPartState(): PartState {
  return {
    bolt: 0,
    charging: 0,
    boltHandle: 0,
    pump: 0,
    slide: 0,
    trigger: 0,
    hammer: 1,
    cylinder: 0,
    magDrop: 0,
    magVisible: true,
    dustCover: 0,
    caseVisible: true,
    safety: 1,
    ordnanceVisible: true,
    bipod: 0,
  };
}

export function resetPartState(p: PartState): void {
  p.bolt = 0;
  p.charging = 0;
  p.boltHandle = 0;
  p.pump = 0;
  p.slide = 0;
  p.trigger = 0;
  p.hammer = 1;
  p.magDrop = 0;
  p.magVisible = true;
  p.caseVisible = true;
  p.ordnanceVisible = true;
}
