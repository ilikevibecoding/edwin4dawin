import type { ShotDefinition } from './Capture';

/**
 * Named camera setups for the offline review pipeline.
 *
 * Each one targets a specific quality question, so a reviewer looking at the
 * set can tell which subsystem is falling short rather than just "it looks
 * off". Keep them stable — comparing the same framing across iterations is
 * what makes regressions obvious.
 */
export const SHOTS: Record<string, ShotDefinition> = {
  /** Wide establishing view: composition, silhouettes, atmosphere, sky. */
  overview: {
    name: 'overview',
    position: [44, 17, -50],
    lookAt: [-2, 4, 10],
    fov: 55,
    warmup: 1.2,
    freeCamera: true,
  },
  /** Eye-level street: the shot that most reads as "is this a real game". */
  street: {
    name: 'street',
    position: [1.5, 1.72, 26],
    lookAt: [-1, 2.2, -14],
    fov: 70,
    warmup: 1.2,
    freeCamera: true,
  },
  /** Close material inspection under grazing light. */
  materials: {
    name: 'materials',
    position: [7.2, 1.5, 6.5],
    lookAt: [1.5, 1.1, -1],
    fov: 45,
    warmup: 0.8,
    freeCamera: true,
  },
  /** Full first-person gameplay framing with weapon and HUD. */
  gameplay: {
    name: 'gameplay',
    position: [3, 1.7, 18],
    lookAt: [-3, 1.9, -10],
    fov: 80,
    warmup: 1.5,
    viewmodel: true,
    hud: true,
  },
  /** Aiming down sights: scope/reticle, DoF, FOV change. */
  ads: {
    name: 'ads',
    position: [3, 1.7, 18],
    lookAt: [-3, 1.9, -10],
    fov: 80,
    warmup: 1.6,
    viewmodel: true,
    hud: true,
    ads: 1,
  },
  /** Interior: bounced light, contact shadows, indoor material read. */
  interior: {
    name: 'interior',
    position: [-16, 1.7, -6],
    lookAt: [-4, 2.4, -14],
    fov: 72,
    warmup: 1.2,
    freeCamera: true,
  },
  /** Golden hour: long shadows, volumetric haze, warm/cool separation. */
  golden: {
    name: 'golden',
    position: [3, 4.5, 34],
    lookAt: [-1, 3.2, -20],
    fov: 58,
    sky: 'golden_hour',
    warmup: 1.2,
    freeCamera: true,
  },
  /** Airstrike: explosions, smoke, debris, screen effects. */
  airstrike: {
    name: 'airstrike',
    position: [24, 8, 34],
    lookAt: [-4, 5, -8],
    fov: 62,
    warmup: 0.6,
    freeCamera: true,
  },
  /** Combat: enemies, muzzle flash, tracers, impacts. */
  firefight: {
    name: 'firefight',
    position: [6, 1.75, 14],
    lookAt: [-6, 1.8, -12],
    fov: 78,
    warmup: 1.4,
    viewmodel: true,
    hud: true,
  },
};

export const SHOT_NAMES = Object.keys(SHOTS);
