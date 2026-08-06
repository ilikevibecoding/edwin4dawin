/**
 * Additive pose library.
 *
 * The downloaded rigs come with locomotion clips and almost no acting, so the
 * performance is built here instead: each pose is a set of per-bone rotations
 * blended *on top of* whatever the animation mixer produced. Because they are
 * additive, "lean in", "point" and "shield the child" can all be layered over a
 * breathing idle without authoring new clips.
 *
 * Rotations are degrees in the character's own frame, not the bone's. The signs
 * below were read off the axis probes in the character lab (`probe_*` framings),
 * which exist because getting them wrong is invisible in code and glaring on
 * screen — an aiming pose spent a while as both arms flung overhead:
 *
 *   -X  pitch forward  — spine bends forward, an arm swings forward and up
 *   +Y  yaw right      — head/chest turns to the character's right
 *   -Z  roll           — lifts an arm away from the body on the character's
 *                        right; the left arm abducts on +Z. On the spine, -Z
 *                        leans to the character's right.
 *
 * Authoring in body space is what lets one library drive every character: the
 * source rigs disagree about which local axis runs down a bone, so local-space
 * Eulers would mean different things on each of them.
 */

/**
 * `[pitch, yaw, roll]` in body space, plus an optional fourth value: a twist in
 * degrees about the bone's own axis. Twist has to be handled separately because
 * "rotate the forearm so the palm faces down" is only meaningful relative to the
 * limb, not to the body.
 */
export type PoseOffsets = Partial<Record<string, [number, number, number] | [number, number, number, number]>>;

export interface Pose {
  name: string;
  offsets: PoseOffsets;
  /** Default blend-in / blend-out seconds. */
  fadeIn?: number;
  fadeOut?: number;
}

const pose = (name: string, offsets: PoseOffsets, fadeIn = 0.35, fadeOut = 0.45): Pose => ({
  name,
  offsets,
  fadeIn,
  fadeOut,
});

export const POSES: Record<string, Pose> = {
  // ---- axis probes ---------------------------------------------------------
  // Single-bone, single-axis poses used by the character lab to verify what the
  // body-space convention actually does on each rig. Cheap to keep and the only
  // way to author an arm pose without guessing at signs.
  probeArmPitchNeg: pose('probeArmPitchNeg', { RightArm: [-70, 0, 0] }, 0, 0),
  probeArmPitchPos: pose('probeArmPitchPos', { RightArm: [70, 0, 0] }, 0, 0),
  probeArmRollNeg: pose('probeArmRollNeg', { RightArm: [0, 0, -70] }, 0, 0),
  probeArmRollPos: pose('probeArmRollPos', { RightArm: [0, 0, 70] }, 0, 0),
  probeArmYawPos: pose('probeArmYawPos', { RightArm: [0, 70, 0] }, 0, 0),
  probeForeArmPitchNeg: pose('probeForeArmPitchNeg', { RightForeArm: [-70, 0, 0] }, 0, 0),

  // ---- conversational -------------------------------------------------------
  /** One hand opens outward, chest turns slightly off-axis. */
  talkOpen: pose('talkOpen', {
    Spine1: [0, -3, 0],
    Spine2: [-2, -4, 0],
    RightShoulder: [-3, 0, 0],
    RightArm: [-20, 6, 12],
    RightForeArm: [-38, 10, 4, 42],
    RightHand: [-6, 0, -10],
    LeftArm: [-6, 0, 4],
    LeftForeArm: [-16, 0, 0, 10],
  }),
  talkSmall: pose('talkSmall', {
    Spine2: [-1, -3, 0],
    RightArm: [-10, 4, 6],
    RightForeArm: [-26, 6, 2, 34],
    RightHand: [-6, 0, -8],
    LeftForeArm: [-10, 0, 0, 8],
  }),
  /** Both hands come up to chest height; the torso commits to the line. */
  talkEmphatic: pose('talkEmphatic', {
    Spine: [-3, 0, 0],
    Spine1: [-3, 0, 0],
    Spine2: [-2, 0, 0],
    Neck: [-2, 0, 0],
    RightShoulder: [-4, 0, 0],
    RightArm: [-24, 8, 14],
    RightForeArm: [-42, 12, 6, 30],
    RightHand: [-8, 0, -12],
    LeftShoulder: [-4, 0, 0],
    LeftArm: [-24, -8, -14],
    LeftForeArm: [-42, -12, -6, -30],
    LeftHand: [-8, 0, 12],
  }),
  leanIn: pose('leanIn', {
    Hips: [3, 0, 0],
    Spine: [5, 0, 0],
    Spine1: [4, 0, 0],
    Neck: [-4, 0, 0],
    Head: [-2, 0, 0],
  }),
  leanBack: pose('leanBack', {
    Hips: [-3, 0, 0],
    Spine: [-5, 0, 0],
    Spine1: [-3, 0, 0],
    Neck: [3, 0, 0],
  }),
  /** Head cocked, the classic android "processing" tell. */
  headTilt: pose('headTilt', {
    Neck: [0, 4, 7],
    Head: [-2, 6, 9],
  }),

  // ---- emotional -----------------------------------------------------------
  slump: pose(
    'slump',
    {
      Hips: [9, 0, 0],
      Spine: [16, 0, 0],
      Spine1: [13, 0, 0],
      Spine2: [9, 0, 0],
      Neck: [18, 0, 0],
      Head: [12, 0, 0],
      LeftShoulder: [12, 0, 7],
      RightShoulder: [12, 0, -7],
      LeftArm: [10, 0, 14],
      RightArm: [10, 0, -14],
      LeftForeArm: [-20, 0, 0],
      RightForeArm: [-20, 0, 0],
    },
    0.8,
    0.9
  ),
  defiant: pose(
    'defiant',
    {
      Hips: [-2, 0, 0],
      Spine: [-6, 0, 0],
      Spine1: [-5, 0, 0],
      Neck: [-4, 0, 0],
      Head: [-6, 0, 0],
      LeftShoulder: [-4, 0, -5],
      RightShoulder: [-4, 0, 5],
      LeftArm: [0, 0, 6],
      RightArm: [0, 0, -6],
    },
    0.5,
    0.7
  ),
  flinch: pose(
    'flinch',
    {
      Hips: [7, 0, 0],
      Spine: [11, 0, 0],
      Spine1: [9, 0, 0],
      Neck: [12, 0, 0],
      Head: [8, 0, 0],
      LeftShoulder: [-12, 0, -10],
      RightShoulder: [-12, 0, 10],
      LeftArm: [-52, -14, -34],
      RightArm: [-52, 14, 34],
      LeftForeArm: [-84, 0, 0],
      RightForeArm: [-84, 0, 0],
      LeftHand: [-18, 0, 0],
      RightHand: [-18, 0, 0],
    },
    0.08,
    0.4
  ),
  /** Shoulders drop, head hangs: the moment a machine gives up. */
  resigned: pose(
    'resigned',
    {
      Hips: [6, 0, 0],
      Spine: [12, 0, 0],
      Spine1: [9, 0, 0],
      Spine2: [5, 0, 0],
      Neck: [20, 0, 0],
      Head: [14, 0, 0],
      LeftShoulder: [10, 0, 6],
      RightShoulder: [10, 0, -6],
      LeftArm: [8, 0, 12],
      RightArm: [8, 0, -12],
      LeftForeArm: [-14, 0, 0],
      RightForeArm: [-14, 0, 0],
    },
    0.7,
    0.8
  ),

  // ---- gestural ------------------------------------------------------------
  pointForward: pose('pointForward', {
    Spine1: [0, 6, 0],
    RightShoulder: [-10, 0, 0],
    RightArm: [-72, 8, 14],
    RightForeArm: [-16, 0, 0],
    RightHand: [0, 0, -6],
    RightHandMiddle1: [0, 0, 62],
    RightHandMiddle2: [0, 0, 58],
    RightHandRing1: [0, 0, 66],
    RightHandRing2: [0, 0, 60],
    RightHandPinky1: [0, 0, 68],
    RightHandPinky2: [0, 0, 62],
    RightHandThumb1: [0, 0, 22],
  }),
  handsUp: pose('handsUp', {
    LeftShoulder: [-14, 0, -12],
    RightShoulder: [-14, 0, 12],
    LeftArm: [-84, 0, -48],
    RightArm: [-84, 0, 48],
    LeftForeArm: [-96, 0, 0],
    RightForeArm: [-96, 0, 0],
    LeftHand: [-12, 0, 0],
    RightHand: [-12, 0, 0],
  }),
  reachOut: pose('reachOut', {
    Spine1: [-3, 0, 0],
    RightShoulder: [-12, 0, 0],
    RightArm: [-76, 4, 10],
    RightForeArm: [-12, 0, 0],
    RightHand: [-16, 0, 0],
  }),
  /** An arm sweeps across to put a body between a threat and a child. */
  shieldChild: pose(
    'shieldChild',
    {
      Spine1: [2, -10, 0],
      Spine2: [0, -6, 0],
      LeftShoulder: [-10, 0, 0],
      LeftArm: [-38, 30, -26],
      LeftForeArm: [-34, 0, 0],
      LeftHand: [-10, 0, 6],
      RightShoulder: [-4, 0, 0],
      RightArm: [-14, 10, 10],
      RightForeArm: [-24, 0, 0],
    },
    0.3,
    0.5
  ),
  /** Two-handed grip, arms extended, sights up. */
  aimPistol: pose(
    'aimPistol',
    {
      Spine1: [0, 14, 0],
      Spine2: [0, 8, 0],
      Neck: [0, -10, 0],
      RightShoulder: [-10, 0, 0],
      RightArm: [-62, 14, 16],
      RightForeArm: [-26, 0, 0],
      RightHand: [-4, 0, -4],
      RightHandIndex1: [0, 0, 40],
      RightHandMiddle1: [0, 0, 70],
      RightHandRing1: [0, 0, 74],
      RightHandPinky1: [0, 0, 76],
      RightHandThumb1: [0, 0, 28],
      LeftShoulder: [-8, 0, 0],
      LeftArm: [-56, -6, -22],
      LeftForeArm: [-46, 0, 0],
      LeftHand: [-8, 0, 0],
      LeftHandIndex1: [0, 0, -40],
      LeftHandMiddle1: [0, 0, -66],
      LeftHandRing1: [0, 0, -70],
      LeftHandPinky1: [0, 0, -72],
    },
    0.25,
    0.5
  ),
  /** One arm clamps a hostage in, the other holds a weapon out to the side. */
  holdHostage: pose(
    'holdHostage',
    {
      Spine1: [0, -10, 0],
      LeftShoulder: [-10, 0, 0],
      LeftArm: [-62, -34, -20],
      LeftForeArm: [-72, 0, 0],
      LeftHand: [-10, 0, 8],
      RightShoulder: [-8, 0, 0],
      RightArm: [-52, 26, 30],
      RightForeArm: [-24, 0, 0],
      RightHand: [-8, 0, -6],
      RightHandMiddle1: [0, 0, 62],
      RightHandRing1: [0, 0, 66],
      RightHandPinky1: [0, 0, 68],
    },
    0.4,
    0.6
  ),
  /** Hand raised, palm forward: the android reconstruction gesture. */
  scanning: pose('scanning', {
    Spine1: [0, 4, 0],
    RightShoulder: [-8, 0, 0],
    RightArm: [-58, 10, 16],
    RightForeArm: [-46, 6, 0],
    RightHand: [-22, 0, -6],
    Neck: [4, 0, 0],
    Head: [3, 0, 0],
  }),
  clutchWound: pose(
    'clutchWound',
    {
      Hips: [4, 0, 4],
      Spine: [8, 0, 5],
      Spine1: [7, 0, 4],
      Neck: [8, 0, 0],
      Head: [6, 0, 0],
      LeftShoulder: [-8, 0, 0],
      LeftArm: [-46, -30, -18],
      LeftForeArm: [-76, 0, 0],
      RightShoulder: [4, 0, 0],
      RightArm: [6, 0, -6],
    },
    0.3,
    0.8
  ),
  raiseFist: pose(
    'raiseFist',
    {
      Spine1: [-3, 0, 0],
      RightShoulder: [-16, 0, 6],
      RightArm: [-128, 8, 26],
      RightForeArm: [-56, 0, 0],
      RightHand: [-8, 0, 0],
      RightHandIndex1: [0, 0, 78],
      RightHandIndex2: [0, 0, 74],
      RightHandMiddle1: [0, 0, 80],
      RightHandMiddle2: [0, 0, 76],
      RightHandRing1: [0, 0, 82],
      RightHandRing2: [0, 0, 76],
      RightHandPinky1: [0, 0, 84],
      RightHandPinky2: [0, 0, 78],
      RightHandThumb1: [0, 0, 34],
      Neck: [-6, 0, 0],
      Head: [-4, 0, 0],
    },
    0.35,
    0.6
  ),
  openPalms: pose('openPalms', {
    LeftShoulder: [-6, 0, 0],
    RightShoulder: [-6, 0, 0],
    LeftArm: [-44, -12, -22],
    RightArm: [-44, 12, 22],
    LeftForeArm: [-44, 0, 0],
    RightForeArm: [-44, 0, 0],
    LeftHand: [-20, 0, 0],
    RightHand: [-20, 0, 0],
    Spine1: [-2, 0, 0],
  }),
  fists: pose('fists', {
    LeftHandIndex1: [0, 0, -76],
    LeftHandMiddle1: [0, 0, -78],
    LeftHandRing1: [0, 0, -80],
    LeftHandPinky1: [0, 0, -82],
    LeftHandThumb1: [0, 0, -30],
    RightHandIndex1: [0, 0, 76],
    RightHandMiddle1: [0, 0, 78],
    RightHandRing1: [0, 0, 80],
    RightHandPinky1: [0, 0, 82],
    RightHandThumb1: [0, 0, 30],
  }),
  /** Relaxed hands; the stock rigs hold their fingers unnaturally splayed. */
  restHands: pose('restHands', {
    LeftHandIndex1: [0, 0, -24],
    LeftHandIndex2: [0, 0, -20],
    LeftHandMiddle1: [0, 0, -28],
    LeftHandMiddle2: [0, 0, -24],
    LeftHandRing1: [0, 0, -30],
    LeftHandRing2: [0, 0, -26],
    LeftHandPinky1: [0, 0, -32],
    LeftHandPinky2: [0, 0, -28],
    LeftHandThumb1: [0, 0, -12],
    RightHandIndex1: [0, 0, 24],
    RightHandIndex2: [0, 0, 20],
    RightHandMiddle1: [0, 0, 28],
    RightHandMiddle2: [0, 0, 24],
    RightHandRing1: [0, 0, 30],
    RightHandRing2: [0, 0, 26],
    RightHandPinky1: [0, 0, 32],
    RightHandPinky2: [0, 0, 28],
    RightHandThumb1: [0, 0, 12],
  }),
  /** Brings the stock wide stance in to a composed standing posture. */
  armsRelaxed: pose('armsRelaxed', {
    LeftShoulder: [0, 0, 2],
    RightShoulder: [0, 0, -2],
    LeftArm: [-2, 0, 10],
    RightArm: [-2, 0, -10],
    LeftForeArm: [-12, 0, 0],
    RightForeArm: [-12, 0, 0],
    LeftHand: [-4, 0, 0],
    RightHand: [-4, 0, 0],
  }),
};

export type PoseName = keyof typeof POSES;
