/**
 * Material slots.
 *
 * Four, and no more, because every slot is a draw call on every soldier on screen.
 * Variation between squad members comes from vertex colours baked per variant and
 * from which uniform material a variant points its cloth slot at, neither of which
 * costs anything at draw time.
 */
export const SLOT = {
  /** Uniform cloth: torso, sleeves, trousers. */
  uniform: 0,
  /** Hard armour: helmet shell, plates, optics housings. */
  armour: 1,
  /** Bare skin: face, neck. */
  skin: 2,
  /** Nylon webbing: carrier, pouches, belt, gloves, boots, slings. */
  gear: 3,
} as const;

export const SLOT_COUNT = 4;
