import * as THREE from 'three';
import { GeoBatch, extrude, revolve, roundRectSection, roundedBox, taperedBox } from './GeoKit';

/**
 * Gloved first-person hands.
 *
 * What sells a first-person grip is not finger count, it is that the fingers
 * are demonstrably *in contact with something*. Posing them by eye does not
 * survive contact with a 46 mm handguard: either the fingers float a centimetre
 * clear or they pass through the part, and both read instantly as wrong even to
 * someone who could not say why.
 *
 * So a grip is not authored as angles here, it is solved. The caller names the
 * thing being held — an axis, a radius, and where around it the knuckles sit —
 * and `solveCylinderGrip` returns the hand transform plus the per-joint curls
 * that make each phalanx a chord of that circle. Change the handguard diameter
 * and the hand re-closes on it.
 *
 * Canonical frame (right hand):
 *   +Z  wrist to fingertips
 *   -Y  the palm faces this way
 *   +X  thumb side
 * The left hand is the same frame mirrored through X, which flips the content
 * but not the axes — so the fingers still curl about +X for both hands, and the
 * thumb ends up on the -X side for a left hand. That asymmetry is what decides
 * which way round a grip can physically be, and the solver respects it.
 */

export interface FingerPose {
  /** Sideways fan at the knuckle, radians; positive spreads toward +X. */
  spread?: number;
  /** Curl of the three joints toward the palm, radians. */
  curl: [number, number, number];
  /** Extra lift at the knuckle, radians; negative lifts off the palm. */
  lift?: number;
}

export interface HandPose {
  side: 'right' | 'left';
  /** Index, middle, ring, little. */
  fingers: [FingerPose, FingerPose, FingerPose, FingerPose];
  thumb: {
    /**
     * Where the thumb column points, in weapon space. Authoring this as a
     * direction rather than as two Euler angles is the difference between
     * "the thumb lies along the handguard" and forty minutes of guessing at
     * a yaw that means nothing outside the hand's own frame.
     */
    dir: THREE.Vector3;
    curl: [number, number];
  };
  /**
   * Direction from the wrist toward the elbow, in weapon space, and how far
   * the sleeve runs. The arm has to leave the frame: an arm that stops inside
   * it is a severed forearm floating in mid-air, which is precisely what the
   * previous hands did.
   */
  forearm: { dir: THREE.Vector3; length: number };
  /** How far the palm cups around what it is holding, radians. */
  cup?: number;
  /** Overall size multiplier; the support hand reads better a touch smaller. */
  scale?: number;
}

export interface HandPlacement {
  /** Where the wrist joint sits, in weapon space. */
  origin: THREE.Vector3;
  /** Direction from the wrist to the knuckles. */
  fingerDir: THREE.Vector3;
  /** Direction the palm faces. */
  palmDir: THREE.Vector3;
}

// Anthropometry, metres. A size-large male hand, which is what the arms of
// every shooter protagonist are modelled on.
const PALM_LEN = 0.086;
/** Where along the palm the metacarpal arch bends around what is held. */
const PALM_PIVOT = 0.042;
const PALM_W_WRIST = 0.058;
const PALM_W_KNUCKLE = 0.082;
const PALM_THICK = 0.028;

interface Phalanx {
  len: number;
  w0: number;
  w1: number;
}

const FINGER_CHAINS: Phalanx[][] = [
  // index
  [
    { len: 0.043, w0: 0.019, w1: 0.0175 },
    { len: 0.026, w0: 0.0172, w1: 0.0158 },
    { len: 0.022, w0: 0.0155, w1: 0.0132 },
  ],
  // middle
  [
    { len: 0.047, w0: 0.019, w1: 0.0176 },
    { len: 0.030, w0: 0.0173, w1: 0.0158 },
    { len: 0.023, w0: 0.0155, w1: 0.0132 },
  ],
  // ring
  [
    { len: 0.043, w0: 0.018, w1: 0.0166 },
    { len: 0.028, w0: 0.0163, w1: 0.015 },
    { len: 0.022, w0: 0.0147, w1: 0.0126 },
  ],
  // little
  [
    { len: 0.034, w0: 0.0158, w1: 0.0146 },
    { len: 0.021, w0: 0.0143, w1: 0.0132 },
    { len: 0.019, w0: 0.0129, w1: 0.0112 },
  ],
];

/**
 * Knuckle positions on the palm, before the metacarpal bend and mirroring.
 *
 * Z is measured from the wrist, and the row is staggered: index and middle
 * stand furthest forward, the little finger a centimetre short of them. That
 * stagger is why a closed hand has a diagonal knuckle line rather than a
 * square end, and it is visible on any support grip.
 */
const KNUCKLES: Array<[number, number, number]> = [
  [0.0288, 0.0010, 0.0840],
  [0.0094, 0.0020, 0.0865],
  [-0.0100, 0.0010, 0.0828],
  [-0.0281, -0.0010, 0.0752],
];

const _mat = new THREE.Matrix4();

// ------------------------------------------------------------ grip solver --

export interface CylinderGrip {
  /** A point on the axis of the part being held, weapon space. */
  centre: THREE.Vector3;
  /**
   * Axis of the part. The thumb comes off the `wrap * axis` end for a right
   * hand and the opposite end for a left one, so between them `axis` and
   * `wrap` decide whether a given grip is anatomically possible at all.
   */
  axis: THREE.Vector3;
  /** Radius of the part where the hand closes on it. */
  radius: number;
  /** Reference direction for `wrist` = 0; orthogonalised against `axis`. */
  up: THREE.Vector3;
  /** Where the *wrist* sits around the part, radians about `axis`. */
  wrist: number;
  /** Which way round the part the palm and fingers travel; +1 or -1. */
  wrap?: 1 | -1;
  /** Slide along the axis from `centre`. */
  along?: number;
  /** Extra clearance between the hand and the surface. */
  slack?: number;
  /** Scales the finger closure; below 1 the hold is loose. */
  close?: number;
}

export interface SolvedGrip {
  place: HandPlacement;
  /** Per-finger joint angles that lay each phalanx on the surface. */
  curls: Array<[number, number, number]>;
  cup: number;
  /** Outward radial direction at the wrist. */
  normal: THREE.Vector3;
  /** Direction the hand travels around the part. */
  tangent: THREE.Vector3;
  /** Where the knuckle row lands, weapon space — handy for aiming thumbs. */
  knuckle: THREE.Vector3;
}

/** Half-thickness of a closed finger, metres. */
const FINGER_HALF = 0.0095;

/**
 * Places a hand on a cylinder and closes it around it.
 *
 * The hand is walked around the part as a chain of chords on one circle: the
 * two palm panels first, then the twelve phalanges. Every joint angle is then
 * just the turn between two consecutive chords, so the pads land *on* the
 * surface for any radius rather than a centimetre inside it or floating clear
 * — which is the entire difference between a hand holding a rifle and a hand
 * posed near one.
 *
 * The caller says where the *wrist* goes, not where the knuckles go. That is
 * the constraint an animator actually has: the wrist is the end of the arm,
 * and the arm has to come from the shoulder.
 */
export function solveCylinderGrip(g: CylinderGrip): SolvedGrip {
  const a = g.axis.clone().normalize();
  const u = g.up.clone().addScaledVector(a, -g.up.dot(a)).normalize();
  const v = new THREE.Vector3().crossVectors(a, u);
  const s = g.wrap ?? 1;
  const slack = g.slack ?? 0;

  // Two radii: the palm slab is centred half its own thickness off the
  // surface, the fingers half of theirs. The step between them is taken up by
  // the first knuckle, which is exactly where a real hand takes it.
  //
  // Each panel is a chord, so its middle sits deeper than its ends. Lifting
  // the whole walk by half the sagitta splits the error: the middle of every
  // panel presses a couple of millimetres into the surface and the ends stand
  // the same amount clear, which is what a gloved hand squeezing something
  // actually looks like. Placing the chord *on* the circle instead buries the
  // middle of the palm a centimetre inside a handguard.
  const lift = (r0: number, len: number): number => {
    let r = r0;
    for (let i = 0; i < 3; i++) {
      r = r0 + r * (1 - Math.cos(Math.asin(Math.min(1, len / (2 * r))))) * 0.5;
    }
    return r;
  };
  const rPalm = lift(g.radius + PALM_THICK * 0.5 + slack, PALM_LEN * 0.5);
  const rFing = lift(g.radius + FINGER_HALF + slack, FINGER_CHAINS[1][0].len);

  const hub = g.centre.clone().addScaledVector(a, g.along ?? 0);
  const at = (phi: number, r: number): THREE.Vector3 =>
    hub
      .clone()
      .addScaledVector(u, r * Math.cos(phi))
      .addScaledVector(v, r * Math.sin(phi));
  /** Angle subtended by a chord of the given length. */
  const arc = (len: number, r: number): number => 2 * Math.asin(Math.min(1, len / (2 * r)));

  const dProx = arc(PALM_PIVOT, rPalm);
  const dDist = arc(PALM_LEN - PALM_PIVOT, rPalm);

  const phi0 = g.wrist;
  const origin = at(phi0, rPalm);
  const pivot = at(phi0 + s * dProx, rPalm);

  // The hand frame: Z runs wrist to pivot along the first chord, Y is the
  // outward radial at that chord's midpoint (so it is exactly perpendicular
  // to Z), and X falls out as `wrap * axis` — the thumb side.
  const z = pivot.clone().sub(origin).normalize();
  const mid = phi0 + s * dProx * 0.5;
  const y = u.clone().multiplyScalar(Math.cos(mid)).addScaledVector(v, Math.sin(mid));

  // The metacarpal arch takes the turn between the two palm chords.
  const cup = (dProx + dDist) * 0.5;

  // Stepping in from the palm circle to the finger circle over the length of
  // the proximal phalanx is a small extra bend at the first knuckle.
  const step = Math.atan2(rPalm - rFing, FINGER_CHAINS[1][0].len);
  const close = g.close ?? 1;
  // A grip is not four fingers doing the same thing. The little and ring
  // fingers do the clamping and close hardest; the index barely closes at all
  // because it is the one that has to be free. Solving every finger to the
  // same circle is geometrically tidy and reads as a bundle of identical
  // tubes, and the fix costs four numbers.
  const BIAS = [0.94, 0.98, 1.02, 1.06];
  const curls = FINGER_CHAINS.map((chain, i): [number, number, number] => {
    const e = chain.map((seg) => arc(seg.len, rFing));
    const c = close * BIAS[i];
    return [((dDist + e[0]) * 0.5 + step) * c, ((e[0] + e[1]) * 0.5) * c, ((e[1] + e[2]) * 0.5) * c];
  });

  return {
    place: { origin, fingerDir: z, palmDir: y.clone().negate() },
    curls,
    cup,
    normal: y,
    tangent: new THREE.Vector3().crossVectors(a, y).multiplyScalar(s),
    knuckle: at(phi0 + s * (dProx + dDist), rPalm),
  };
}

// --------------------------------------------------------------- geometry --

/**
 * Builds one finger as a chain of tapered segments plus knuckle pads.
 *
 * Each joint accumulates rotation, so a curl of (1.1, 1.4, 0.8) folds the
 * finger into a grip the way a real one folds rather than bending it in one
 * smooth arc — the middle joint always closes hardest and that difference is
 * what makes a fist read as a fist.
 */
function buildFinger(chain: Phalanx[], pose: FingerPose, batch: GeoBatch, base: THREE.Matrix4): void {
  const m = base.clone();
  m.multiply(_mat.makeRotationY(pose.spread ?? 0));
  m.multiply(_mat.makeRotationX(pose.lift ?? 0));

  for (let i = 0; i < chain.length; i++) {
    const seg = chain[i];
    m.multiply(_mat.makeRotationX(pose.curl[i]));
    // Joint pad: a slightly fatter knuckle so the silhouette has articulation
    // instead of reading as a single bent tube.
    const pad = roundedBox(seg.w0 * 1.05, seg.w0 * 1.02, seg.w0 * 0.74, seg.w0 * 0.35, 2);
    batch.addMatrix(pad, m.clone().multiply(_mat.makeTranslation(0, 0, seg.w0 * 0.16)));

    const last = i === chain.length - 1;
    const body = taperedBox(
      seg.w0,
      seg.w0 * 0.96,
      seg.w1,
      seg.w1 * 0.94,
      seg.len,
      Math.min(seg.w1, seg.w0) * (last ? 0.46 : 0.36),
      2,
    );
    batch.addMatrix(body, m.clone().multiply(_mat.makeTranslation(0, 0, seg.len * 0.5)));
    m.multiply(_mat.makeTranslation(0, 0, seg.len));
  }
}

function buildThumb(
  pose: HandPose['thumb'],
  yaw: number,
  pitch: number,
  batch: GeoBatch,
  base: THREE.Matrix4,
): void {
  const m = base.clone();
  m.multiply(_mat.makeRotationY(yaw));
  m.multiply(_mat.makeRotationX(pitch));

  // Thenar eminence — the muscle pad at the base of the thumb. Leaving it out
  // is why placeholder hands look skeletal from the side. It is a *pad*, not a
  // segment: run it out 40 mm on the thumb's own axis, as the first version
  // did, and the thumb starts a knuckle's length clear of the hand and reaches
  // past the end of the handguard like a sixth finger.
  const thenar = taperedBox(0.031, 0.032, 0.0225, 0.0235, 0.029, 0.012, 2);
  batch.addMatrix(thenar, m.clone().multiply(_mat.makeTranslation(0, 0, 0.0125)));

  m.multiply(_mat.makeTranslation(0, 0, 0.025));
  const segs: Phalanx[] = [
    { len: 0.030, w0: 0.0205, w1: 0.0186 },
    { len: 0.023, w0: 0.0181, w1: 0.0156 },
  ];
  for (let i = 0; i < segs.length; i++) {
    m.multiply(_mat.makeRotationX(pose.curl[i]));
    const seg = segs[i];
    batch.addMatrix(
      taperedBox(
        seg.w0,
        seg.w0 * 0.9,
        seg.w1,
        seg.w1 * 0.88,
        seg.len,
        seg.w1 * (i === 1 ? 0.45 : 0.34),
        2,
      ),
      m.clone().multiply(_mat.makeTranslation(0, 0, seg.len * 0.5)),
    );
    m.multiply(_mat.makeTranslation(0, 0, seg.len));
  }
}

/**
 * The palm, hinged at the metacarpal arch.
 *
 * A flat 92 mm slab cannot lie against a 42 mm tube — the ends stand a
 * centimetre proud and the fingers have to start from mid-air. Real palms cup,
 * and modelling that bend is what lets the hand touch the thing it is holding
 * along its whole length.
 */
function buildPalm(batch: GeoBatch, base: THREE.Matrix4, cup: number): void {
  const proximal = taperedBox(
    PALM_W_WRIST,
    PALM_THICK * 0.86,
    PALM_W_KNUCKLE * 0.96,
    PALM_THICK * 0.99,
    PALM_PIVOT,
    0.010,
    3,
  );
  batch.addMatrix(proximal, base.clone().multiply(_mat.makeTranslation(0, 0, PALM_PIVOT * 0.5)));

  // Heel of the hand, which is what actually rests on a grip.
  batch.addMatrix(
    roundedBox(PALM_W_WRIST * 1.02, PALM_THICK * 0.92, 0.028, 0.012, 2),
    base.clone().multiply(_mat.makeTranslation(0, -0.001, 0.013)),
  );

  const distLen = PALM_LEN - PALM_PIVOT;
  const hinge = base
    .clone()
    .multiply(_mat.makeTranslation(0, 0, PALM_PIVOT))
    .multiply(_mat.makeRotationX(cup));
  batch.addMatrix(
    taperedBox(
      PALM_W_KNUCKLE * 0.96,
      PALM_THICK * 0.99,
      PALM_W_KNUCKLE,
      PALM_THICK * 0.9,
      distLen,
      0.010,
      3,
    ),
    hinge.clone().multiply(_mat.makeTranslation(0, 0, distLen * 0.5)),
  );
  // Knuckle ridge across the front, and the tendon swell behind it. The back
  // of the hand is what the player looks at on a support grip, so it is the
  // one surface here that has to carry some form.
  batch.addMatrix(
    taperedBox(PALM_W_KNUCKLE * 0.99, 0.027, PALM_W_KNUCKLE * 0.9, 0.023, 0.019, 0.009, 2),
    hinge.clone().multiply(_mat.makeTranslation(0, 0.001, distLen - 0.005)),
  );
  batch.addMatrix(
    taperedBox(PALM_W_KNUCKLE * 0.78, 0.010, PALM_W_KNUCKLE * 0.9, 0.008, distLen * 0.8, 0.004, 2),
    hinge.clone().multiply(_mat.makeTranslation(0, PALM_THICK * 0.46, distLen * 0.42)),
  );
}

/**
 * Glove cuff.
 *
 * The single cheapest piece of characterisation available: a bare wrist reads
 * as a mannequin, and a cuff with a strap and a stitched hem reads as
 * equipment. It is also where the glove material stops and the sleeve begins,
 * which gives the arm a colour break exactly where the eye expects one — and
 * it hides the angle between the hand and the forearm.
 */
function buildCuff(batch: GeoBatch, base: THREE.Matrix4): void {
  batch.addMatrix(
    extrude(roundRectSection(0.064, 0.041, 0.017, 3), -0.048, 0.008, {
      capFront: true,
      capBack: false,
      smooth: true,
    }),
    base,
  );
  batch.addMatrix(
    extrude(roundRectSection(0.069, 0.046, 0.018, 3), -0.052, -0.043, { smooth: true }),
    base,
  );
  batch.addMatrix(
    extrude(roundRectSection(0.0695, 0.0465, 0.018, 3), -0.029, -0.020, { smooth: true }),
    base,
  );
  batch.addMatrix(
    roundedBox(0.014, 0.008, 0.013, 0.002, 1),
    base.clone().multiply(_mat.makeTranslation(0, 0.025, -0.0245)),
  );
}

/**
 * Forearm, aimed at an explicit elbow rather than derived from wrist angles.
 *
 * Built in its own basis so it can run wherever the arm has to go — which for
 * a first-person view is always "off the bottom of the frame". Its near end
 * overlaps the cuff, so the kink at the wrist is covered.
 */
function buildForearm(
  batch: GeoBatch,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  scale: number,
): void {
  const z = dir.clone().normalize().negate();
  const up = Math.abs(z.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
  // A forearm is an oval, not a dowel: about 15% deeper front-to-back than it
  // is wide. Squashing the revolve on X is a free way to stop the arm reading
  // as a length of pipe, and it costs nothing in geometry.
  m.multiply(_mat.makeScale(scale * 0.9, scale * 1.04, 1));

  batch.addMatrix(
    revolve(
      // Measured on the sleeve of a field jacket the wrist is about 55 mm
      // across and the belly of the arm about 80 mm, and going wider than
      // that — which the first version did by a centimetre — turns the arms
      // into the subject of the shot instead of the frame.
      //
      // The profile is not monotonic. The gathered fabric where the sleeve is
      // pushed back over the glove cuff stands slightly proud of the arm
      // behind it, and that one reversal is what reads as cloth rather than
      // as a tapered cylinder.
      [
        { r: 0, z: -length },
        { r: 0.0384, z: -length },
        { r: 0.0380, z: -length + 0.040, smooth: true },
        { r: 0.0338, z: -length * 0.52, smooth: true },
        { r: 0.0286, z: -0.098, smooth: true },
        { r: 0.0272, z: -0.070, smooth: true },
        { r: 0.0300, z: -0.055 },
        { r: 0.0304, z: -0.044 },
        { r: 0.0266, z: -0.036, smooth: true },
        { r: 0.0258, z: -0.030 },
        { r: 0, z: -0.029 },
      ],
      18,
    ),
    m,
  );
}

/**
 * Builds a hand into two batches: one for the glove and one for the sleeve,
 * so the two can carry genuinely different materials. A hand and a sleeve of
 * the same shader is the thing that makes cheap arms look like one extruded
 * lump of putty.
 */
export function buildHand(
  pose: HandPose,
  place: HandPlacement,
  glove: GeoBatch,
  sleeve: GeoBatch,
): void {
  const z = place.fingerDir.clone().normalize();
  const y = place.palmDir.clone().normalize().negate();
  // Orthogonalise: the caller's two directions are intent, not a basis.
  y.addScaledVector(z, -y.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();

  const mirror = pose.side === 'left' ? -1 : 1;
  const s = pose.scale ?? 1;
  const cup = pose.cup ?? 0.9;
  const base = new THREE.Matrix4().makeBasis(x, y, z).setPosition(place.origin);
  base.multiply(_mat.makeScale(mirror * s, s, s));

  buildPalm(glove, base, cup);

  const hinge = base
    .clone()
    .multiply(_mat.makeTranslation(0, 0, PALM_PIVOT))
    .multiply(_mat.makeRotationX(cup));
  for (let i = 0; i < 4; i++) {
    const k = KNUCKLES[i];
    buildFinger(
      FINGER_CHAINS[i],
      pose.fingers[i],
      glove,
      hinge.clone().multiply(_mat.makeTranslation(k[0], k[1], k[2] - PALM_PIVOT)),
    );
  }
  // The thumb direction arrives in weapon space; resolve it against the hand's
  // own axes, undoing the mirror so a left thumb reads the same as a right one.
  const d = pose.thumb.dir.clone().normalize();
  const local = new THREE.Vector3(d.dot(x) * mirror, d.dot(y), d.dot(z));
  buildThumb(
    pose.thumb,
    Math.atan2(local.x, local.z),
    -Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)),
    glove,
    base.clone().multiply(_mat.makeTranslation(PALM_W_KNUCKLE * 0.44, -0.003, 0.022)),
  );
  buildCuff(glove, base);
  buildForearm(sleeve, place.origin, pose.forearm.dir, pose.forearm.length, s);
}
