/**
 * Finger poses (degrees). Layout: 4 fingers (index, middle, ring, pinky) × [mcpFlex, mcpAbd, pipFlex, dipFlex]
 * then thumb [cmcFlex, cmcAbd, mcpFlex, ipFlex]. Positive abduction spreads toward the thumb side.
 */
const D = Math.PI / 180;

function pose(fingers, thumb) {
  const out = new Float32Array(20);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) out[i * 4 + k] = fingers[i][k] * D;
  for (let k = 0; k < 4; k++) out[16 + k] = thumb[k] * D;
  return out;
}

export const POSES = {
  right: {
    // pistol grip: index on the trigger, three fingers wrapped around the front strap, thumb over the left side
    grip: pose(
      [
        [14, 9, 48, 22],
        [66, 0, 92, 42],
        [72, -3, 96, 48],
        [78, -7, 98, 55],
      ],
      [22, -6, 30, 22],
    ),
    relaxed: pose(
      [
        [25, 4, 30, 15],
        [28, 0, 35, 18],
        [30, -3, 38, 20],
        [32, -6, 40, 22],
      ],
      [10, 5, 15, 10],
    ),
  },
  left: {
    // support hand cupping the handguard from below-left, thumb along the top-left rail
    grip: pose(
      [
        [66, 4, 78, 32],
        [74, 0, 84, 38],
        [78, -3, 86, 42],
        [82, -6, 88, 46],
      ],
      [-8, 18, 6, 6],
    ),
    // gripping the magazine from its left face, fingers around the front edge
    magGrab: pose(
      [
        [56, 2, 82, 36],
        [62, 0, 86, 40],
        [64, -1, 86, 42],
        [68, -4, 86, 46],
      ],
      [28, 10, 30, 24],
    ),
    // open flat palm slapping the magazine base
    slap: pose(
      [
        [8, 8, 10, 5],
        [6, 2, 10, 5],
        [8, -3, 12, 6],
        [12, -8, 14, 8],
      ],
      [0, 22, 6, 6],
    ),
    // hand slapping the bolt release (palm flat, fingers slightly curled)
    boltSlap: pose(
      [
        [18, 6, 24, 10],
        [20, 1, 26, 12],
        [22, -2, 28, 14],
        [26, -6, 30, 16],
      ],
      [8, 16, 10, 10],
    ),
    relaxed: pose(
      [
        [25, 4, 30, 15],
        [28, 0, 35, 18],
        [30, -3, 38, 20],
        [32, -6, 40, 22],
      ],
      [10, 5, 15, 10],
    ),
  },
};
