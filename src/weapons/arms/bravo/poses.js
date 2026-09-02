/**
 * Finger poses as joint angles (degrees) relative to the relaxed bind pose.
 *   fingers: [mcpFlex, pipFlex, dipFlex, abduction(+ toward the thumb)]
 *   thumb:   [cmcFlex, cmcAbduction, cmcTwist, mcpFlex, ipFlex]
 * Flexion curls toward the palm. Poses are compiled to flat Float32Arrays and blended per channel.
 */

export const CHANNELS = 21;
const ORDER = ['index', 'middle', 'ring', 'pinky'];

export function compilePose(p) {
  const out = new Float32Array(CHANNELS);
  for (let f = 0; f < 4; f++) {
    const a = p[ORDER[f]];
    for (let k = 0; k < 4; k++) out[f * 4 + k] = a[k];
  }
  for (let k = 0; k < 5; k++) out[16 + k] = p.thumb[k];
  return out;
}

const RAW = {
  relaxed: {
    index: [8, 12, 6, 0],
    middle: [10, 14, 8, 0],
    ring: [12, 16, 10, 0],
    pinky: [14, 18, 12, 0],
    thumb: [0, 0, 0, 5, 5],
  },
  // Right hand on the pistol grip: index on the trigger, the other three wrapped around the grip, thumb over the selector.
  gripRight: {
    index: [5, 25, 10, 18],
    middle: [60, 60, 50, 2],
    ring: [55, 60, 45, -2],
    pinky: [35, 45, 35, -6],
    thumb: [20, -20, 10, 10, 10],
  },
  // Left hand on the handguard from the side: first phalanges lie over the top rail, tips reach the far top
  // corner, pinky wraps the near top corner, thumb hugs the bottom rail (fitted numerically to the M4A1 quad rail).
  gripLeft: {
    index: [60, 30, 0, -6],
    middle: [65, 25, 15, -2],
    ring: [45, 40, 0, 2],
    pinky: [20, 20, 30, 6],
    thumb: [70, 30, 0, 20, 40],
  },
  // Holding the magazine from its left face: fingers curl round the front edge with the pads on the far face,
  // thumb extended up the near face toward the mag well (fitted numerically to the M4A1 magazine).
  magGrab: {
    index: [15, 80, 30, 6],
    middle: [25, 80, 40, 2],
    ring: [20, 80, 35, -2],
    pinky: [0, 65, 20, -8],
    thumb: [-28, -5, 0, 10, 10],
  },
  // Open palm slap (seating the magazine).
  slap: {
    index: [-6, 6, 2, 8],
    middle: [-4, 8, 4, 2],
    ring: [-2, 10, 6, -3],
    pinky: [0, 12, 8, -10],
    thumb: [-10, 26, 0, 4, 4],
  },
  // Heel-of-hand hit on the bolt release: fingers together and nearly straight (they pass beside the optic).
  boltSlap: {
    index: [4, 10, 6, 2],
    middle: [6, 12, 8, 0],
    ring: [8, 14, 10, -1],
    pinky: [10, 16, 12, -3],
    thumb: [-10, -25, 0, 6, 6],
  },
};

export const POSES = Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, compilePose(v)]));

/** Resolve a target pose name from the hand target's userData.pose for a given side. */
export function resolvePose(name, side) {
  if (name === 'grip' || !name) return side > 0 ? POSES.gripRight : POSES.gripLeft;
  return POSES[name] || POSES.relaxed;
}
