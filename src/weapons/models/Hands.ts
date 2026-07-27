import * as THREE from 'three';
import { clamp } from '../../core/MathUtils';
import type { GunPalette } from './Materials';
import {
  circleProfile,
  framesAlongPath,
  loft,
  ovalProfile,
  roundBoxGeo,
  smoothPath,
} from './Parts';

/**
 * Gloved forearms.
 *
 * A floating weapon with no hands is the loudest amateur tell in a first-person
 * game, so both arms are always present, always wrapped around the weapon, and
 * always driven from the weapon's own anchors — which means they follow every
 * animation for free, including the reload where the support hand leaves the
 * handguard.
 *
 * The fist is authored in "grip space": the grip runs along +Y, the palm sits on
 * +X and the fingers curl through -Z. Any cylindrical thing on a weapon can then
 * be gripped by orienting an anchor, which is how the same mesh serves a pistol
 * grip, a handguard, a pump and a knife handle.
 */

/**
 * Deliberately longer than a human forearm.
 *
 * The bone has to reach past the bottom edge of the frame from wherever the wrist
 * happens to be, because an arm that terminates on screen shows the flat cap of
 * its far end and instantly reads as a length of pipe. Only the first 15 cm or so
 * is ever visible, so the excess costs nothing and removes the artefact entirely.
 */
const FOREARM_LENGTH = 0.42;
const FORWARD = new THREE.Vector3(0, 0, 1);
const DOWN = new THREE.Vector3(0, -1, 0);

/**
 * How far off straight-down the forearm is allowed to lie, and how close to the
 * eye its elbow may end up.
 *
 * Both are about apparent size rather than anatomy. A real support elbow is
 * tucked under the ribs, which in view space is a point beside — sometimes
 * behind — the camera, and a forearm aimed there is a metre-wide tube lying
 * across the frame with the near cap almost touching the lens. Held inside these
 * limits the arm always leaves through the bottom edge within a hand's length of
 * the wrist, which is all that is ever seen of it anyway.
 */
const MAX_ARM_TILT = 0.62;
const MIN_ELBOW_DEPTH = 0.14;

export interface FistOptions {
  /** Nominal radius of the thing being held. */
  gripRadius: number;
  /**
   * Half-extents of the gripped column as fractions of `gripRadius`: across the
   * palm (`width`) and along the direction the fingers wrap (`depth`).
   *
   * Almost nothing on a weapon is actually round. A pistol grip is a flattened
   * column about 29 mm across and 42 mm front to back, so a hand built to wrap a
   * circle of its nominal radius floats 15 mm clear of the sides while its
   * fingers cut into the front strap. Wrapping an ellipse instead is the
   * difference between a hand holding the weapon and a hand near it.
   */
  shape?: { width: number; depth: number };
  /** +1 right hand, -1 left hand (mirrored). */
  side: 1 | -1;
  /** Trigger finger extended forward instead of curled. */
  indexExtended?: boolean;
  /** Index finger nearest -Y instead of +Y (support hand on a forend). */
  indexDown?: boolean;
  /** Thumb points along -Y (forward on a forend) rather than wrapping. */
  thumbForward?: boolean;
  /** Spread between fingers. */
  spacing?: number;
}

/** Half-extents of a pistol grip, matching what `buildPistolGrip` extrudes. */
const GRIP_SHAPE = { width: 0.8, depth: 1.2 } as const;
const ROUND_SHAPE = { width: 1, depth: 1 } as const;

/** Clearance between the gripped surface and a finger's centreline. */
const FINGER_LIFT = 0.0102;

function arcPath(
  rx: number,
  rz: number,
  taper: (t: number) => number,
  angleFrom: number,
  angleTo: number,
  y: (t: number) => number,
  side: number,
  samples = 5,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const a = angleFrom + (angleTo - angleFrom) * t;
    const k = taper(t);
    pts.push(new THREE.Vector3(side * rx * k * Math.cos(a), y(t), -rz * k * Math.sin(a)));
  }
  return pts;
}

function fingerMesh(
  path: THREE.Vector3[],
  rStart: number,
  rEnd: number,
  material: THREE.Material,
): THREE.Mesh {
  const spine = smoothPath(path, 9, 0.5);
  // Slightly flattened in section and swollen at the middle knuckle. A finger of
  // constant round section is the giveaway: at 19 mm across and 30 cm from the
  // camera the facets of an octagon are plainly visible, and a uniform tube reads
  // as a hose rather than as something with joints in it.
  const frames = framesAlongPath(
    spine,
    [rStart, rStart * 1.04, rStart * 0.96, rStart * 1.0, rEnd],
    [rStart * 0.9, rStart * 0.96, rStart * 0.88, rStart * 0.92, rEnd * 0.9],
  );
  const geometry = loft(circleProfile(12, 1), frames, true, true);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * The body of the hand: one domed, tapered mass from the wrist to the knuckle
 * line, lofted along the grip axis.
 *
 * Built as a loft rather than the obvious pair of rounded boxes because the palm
 * is the largest single piece of the hand and the one most often silhouetted
 * against the weapon. A box shows a flat face and two straight edges from every
 * angle, which is what makes procedural hands read as blocks no matter how good
 * the fingers are.
 */
function palmMesh(side: number, x: number, material: THREE.Material): THREE.Mesh {
  const ys = [-0.06, -0.042, -0.02, 0.004, 0.028, 0.045];
  const thickness = [0.0082, 0.0108, 0.0126, 0.0132, 0.0122, 0.0086];
  const depth = [0.0112, 0.016, 0.0198, 0.0212, 0.0196, 0.0132];
  // Leans forward towards the knuckles and rolls a touch off the column, the way
  // a hand sits on a grip rather than clamping it symmetrically.
  const path = ys.map((y) => new THREE.Vector3(x - side * y * 0.05, y, 0.005 - y * 0.09));
  const mesh = new THREE.Mesh(
    loft(circleProfile(14, 1), framesAlongPath(path, thickness, depth), true, true),
    material,
  );
  mesh.frustumCulled = false;
  return mesh;
}

/** Builds a closed hand around a column of `gripRadius` lying along +Y. */
export function buildFist(pal: GunPalette, opts: FistOptions): THREE.Group {
  const side = opts.side;
  const r = opts.gripRadius;
  const shape = opts.shape ?? ROUND_SHAPE;
  // Half-extents of the gripped column, and the ellipse the fingers ride on.
  const hw = r * shape.width;
  const hd = r * shape.depth;
  const rx = hw + FINGER_LIFT;
  const rz = hd + FINGER_LIFT;
  const spacing = opts.spacing ?? 0.0205;
  const group = new THREE.Group();
  group.name = side > 0 ? 'handRight' : 'handLeft';

  // Palm, sitting against the side of the column. Shallower and narrower than the
  // obvious slab: at 56 mm deep it reads as a plate stuck on the grip, because a
  // real palm is mostly hidden behind the fingers and only its heel and thenar are
  // ever silhouetted.
  const palmX = side * (hw + 0.0126);
  group.add(palmMesh(side, palmX, pal.glove));

  // Thenar mass at the base of the thumb. Sits proud of the palm dome, and is what
  // gives the hand a wide silhouette on the thumb side.
  const thenar = new THREE.Mesh(roundBoxGeo(0.026, 0.028, 0.026, 0.012, 2), pal.glove);
  thenar.position.set(palmX + side * 0.001, 0.024, -0.001);
  thenar.frustumCulled = false;
  group.add(thenar);

  // Padded knuckle guards on the back of the glove, following the dome.
  for (let i = 0; i < 2; i++) {
    const pad = new THREE.Mesh(roundBoxGeo(0.006, 0.024, 0.03, 0.003, 1), pal.nylon);
    pad.position.set(palmX + side * (0.0108 - i * 0.0008), 0.019 - i * 0.026, 0.001);
    pad.rotation.z = side * (0.06 + i * 0.05);
    pad.frustumCulled = false;
    group.add(pad);
  }

  const indexSign = opts.indexDown ? -1 : 1;
  for (let i = 0; i < 4; i++) {
    const y = indexSign * (0.031 - i * spacing);
    const len = i === 0 ? 1.0 : i === 1 ? 1.06 : i === 2 ? 0.98 : 0.86;
    const isIndex = i === 0;
    let path: THREE.Vector3[];
    if (isIndex && opts.indexExtended) {
      path = [
        new THREE.Vector3(side * (hw + 0.009), y, -hd * 0.4),
        new THREE.Vector3(side * (hw * 0.5), y - 0.002, -hd - 0.014),
        new THREE.Vector3(side * -0.002, y - 0.004, -hd - 0.03),
        new THREE.Vector3(side * -0.008, y - 0.009, -hd - 0.039),
      ];
    } else {
      path = arcPath(
        rx,
        rz,
        (t) => 1 - 0.14 * t,
        0.42,
        0.42 + 2.5 * len,
        (t) => y - 0.004 * t,
        side,
      );
    }
    group.add(fingerMesh(path, 0.0094 - i * 0.0004, 0.0072 - i * 0.0004, pal.glove));
  }

  // Thumb: wraps the far side, or lies along the forend for a C-clamp.
  const thumbPath = opts.thumbForward
    ? [
        new THREE.Vector3(side * (hw + 0.012), 0.03, 0.012),
        new THREE.Vector3(side * (hw + 0.005), 0.008, -hd * 0.7),
        new THREE.Vector3(side * (hw * 0.7), -0.02, -hd - 0.008),
        new THREE.Vector3(side * (hw * 0.55), -0.046, -hd - 0.014),
      ]
    : [
        new THREE.Vector3(side * (hw + 0.011), 0.038, 0.016),
        new THREE.Vector3(side * (hw * 0.6), 0.05, -hd * 0.3),
        new THREE.Vector3(side * -0.004, 0.05, -hd * 0.85),
        new THREE.Vector3(side * -0.016, 0.042, -hd * 0.9),
      ];
  group.add(fingerMesh(thumbPath, 0.0122, 0.0092, pal.glove));

  // Wrist block bridging the heel of the hand into the forearm. The gauntlet cuff
  // itself belongs on the arm, not here: anything cuff-shaped authored in fist
  // space keeps the fist's orientation, and the fist is rotated to match whatever
  // is being gripped, so on a horizontal handguard it ends up lying across the
  // wrist instead of around it.
  const wrist = new THREE.Mesh(roundBoxGeo(0.03, 0.026, 0.036, 0.011, 2), pal.glove);
  wrist.position.set(palmX + side * 0.003, -0.05, 0.016);
  wrist.frustumCulled = false;
  group.add(wrist);

  return group;
}

/** Wrist position in fist space, where the forearm attaches. */
function wristOffset(side: number, gripRadius: number, shape: { width: number }): THREE.Vector3 {
  return new THREE.Vector3(side * (gripRadius * shape.width + 0.0155), -0.062, 0.03);
}

export class ArmRig {
  readonly root = new THREE.Group();
  readonly hand: THREE.Group;
  readonly forearm = new THREE.Group();
  private readonly wrist: THREE.Vector3;
  private readonly scratch = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly quat = new THREE.Quaternion();
  private readonly rotation = new THREE.Quaternion();

  constructor(pal: GunPalette, opts: FistOptions) {
    this.root.name = opts.side > 0 ? 'armRight' : 'armLeft';
    this.hand = buildFist(pal, opts);
    this.root.add(this.hand);
    this.root.add(this.forearm);
    this.wrist = wristOffset(opts.side, opts.gripRadius, opts.shape ?? ROUND_SHAPE);

    // One closed loft for the whole forearm, wrist to elbow. Built as a single
    // capped solid rather than a tube plus a separate sleeve piece: any tube that
    // ends inside the frame shows its opening, and on a viewmodel arm the far end
    // is regularly on screen, so a two-part arm reads as a length of pipe with a
    // hole in it. The step in the radii near the middle is the rolled cuff of the
    // combat shirt, which is the value break that stops the arm being one smooth
    // pale cylinder.
    const zs = [0.006, 0.045, 0.09, 0.14, 0.16, 0.22, 0.32, FOREARM_LENGTH + 0.01];
    const radii = [0.0272, 0.0294, 0.0322, 0.036, 0.0412, 0.0428, 0.0452, 0.047];
    const frames = framesAlongPath(
      zs.map((z) => new THREE.Vector3(0, 0, z)),
      radii,
    );
    const arm = new THREE.Mesh(loft(ovalProfile(14, 1, 0.87), frames, true, true), pal.sleeve);
    arm.frustumCulled = false;
    this.forearm.add(arm);

    // Gauntlet cuff of the glove closing over the sleeve, in glove leather so the
    // wrist is a hard value break rather than a continuation of the arm.
    const cuffZ = [0.0, 0.03, 0.062, 0.082];
    const cuffFrames = framesAlongPath(
      cuffZ.map((z) => new THREE.Vector3(0, 0, z)),
      [0.0292, 0.0312, 0.0338, 0.0322],
    );
    const cuffMesh = new THREE.Mesh(loft(ovalProfile(14, 1, 0.88), cuffFrames, true, true), pal.glove);
    cuffMesh.frustumCulled = false;
    this.forearm.add(cuffMesh);

    // Wrist strap over the cuff and the elastic that holds the rolled sleeve.
    for (const [z, r, thick, material] of [
      [0.052, 0.0322, 0.0028, pal.polymerDark],
      [0.156, 0.0396, 0.0032, pal.nylon],
    ] as const) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(r, thick, 6, 18), material);
      strap.scale.y = 0.88;
      strap.position.z = z;
      strap.frustumCulled = false;
      this.forearm.add(strap);
    }
  }

  /** Places the hand on a target transform (a weapon anchor, in view space). */
  setGoal(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.root.position.copy(position);
    this.hand.quaternion.copy(quaternion);
  }

  /**
   * One-bone solve: aim the forearm at the elbow goal, then bound the result.
   *
   * The elbow goal only ever chooses a direction — the bone keeps its own length,
   * so the arm cannot stretch and its apparent thickness never changes as the
   * weapon moves. The direction is then pulled back towards straight down if it
   * lies too flat, and the bone shortened if that would still bring the elbow
   * inside `MIN_ELBOW_DEPTH` of the eye. What survives all of that is a short
   * length of forearm entering the frame from a bottom corner, which is what a
   * first-person arm actually is; where the elbow ends up is never seen.
   */
  solve(elbow: THREE.Vector3): void {
    this.scratch.copy(this.wrist).applyQuaternion(this.hand.quaternion);
    this.forearm.position.copy(this.scratch);
    this.dir.copy(elbow).sub(this.root.position).sub(this.scratch);
    if (this.dir.lengthSq() < 1e-8) this.dir.copy(DOWN);
    this.dir.normalize();

    const tilt = Math.acos(clamp(-this.dir.y, -1, 1));
    if (tilt > MAX_ARM_TILT) {
      this.quat.setFromUnitVectors(this.dir, DOWN);
      this.rotation.identity().slerp(this.quat, 1 - MAX_ARM_TILT / tilt);
      this.dir.applyQuaternion(this.rotation);
    }

    let length = FOREARM_LENGTH;
    const wristDepth = -(this.root.position.z + this.scratch.z);
    if (this.dir.z > 1e-3) {
      length = clamp((wristDepth - MIN_ELBOW_DEPTH) / this.dir.z, 0.1, FOREARM_LENGTH);
    }

    this.quat.setFromUnitVectors(FORWARD, this.dir);
    this.forearm.quaternion.copy(this.quat);
    this.forearm.scale.set(1, 1, length / FOREARM_LENGTH);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }
}

/**
 * How the support hand is shaped. The difference between a C-clamp on a
 * handguard and a cup under a pistol butt is entirely in which way the fingers
 * and thumb run, so the style picks the fist options rather than a whole
 * separate mesh.
 */
export type SupportStyle = 'forend' | 'pump' | 'vertical' | 'cup' | 'none';

const SUPPORT_FIST: Record<SupportStyle, Omit<FistOptions, 'gripRadius' | 'side'>> = {
  // Modern C-clamp: fingers over the top of the forend, thumb pointing downrange.
  forend: { indexDown: true, thumbForward: true, spacing: 0.0198, shape: ROUND_SHAPE },
  // Pump grip is the same shape but tighter, because a forend is slimmer.
  pump: { indexDown: true, thumbForward: true, spacing: 0.019, shape: ROUND_SHAPE },
  // Vertical foregrip or magwell hold: a plain closed fist round a column.
  vertical: { indexDown: false, thumbForward: false, spacing: 0.0192, shape: GRIP_SHAPE },
  // Two-handed pistol cup: fingers under the firing hand, thumb forward.
  cup: { indexDown: false, thumbForward: true, spacing: 0.0182, shape: { width: 0.9, depth: 1.25 } },
  none: { indexDown: false, thumbForward: false, shape: ROUND_SHAPE },
};

/**
 * Where each elbow wants to sit, in view space, per support style.
 *
 * Only the direction from the wrist is used, so these are aiming hints rather
 * than joint positions. They sit well below the weapon and still a good way
 * downrange: goals nearer the shoulder are anatomically truer and look far
 * worse, because the forearm then lies across the bottom third of the frame at a
 * shallow angle instead of dropping out of it.
 */
const LEFT_ELBOW: Record<SupportStyle, readonly [number, number, number]> = {
  forend: [-0.12, -0.52, -0.4],
  pump: [-0.12, -0.52, -0.38],
  vertical: [-0.1, -0.53, -0.34],
  cup: [0.02, -0.5, -0.3],
  none: [-0.1, -0.52, -0.34],
};

export interface HandsOptions {
  gripRadius: number;
  supportRadius: number;
  support: SupportStyle;
  indexExtended?: boolean;
}

/** Both arms plus the elbow targets that keep them tucked into the body. */
export class HandsRig {
  readonly root = new THREE.Group();
  readonly right: ArmRig;
  readonly left: ArmRig;
  readonly rightElbow = new THREE.Vector3(0.26, -0.55, -0.16);
  readonly leftElbow = new THREE.Vector3();
  readonly supportStyle: SupportStyle;

  constructor(pal: GunPalette, opts: HandsOptions) {
    this.root.name = 'hands';
    this.supportStyle = opts.support;
    this.right = new ArmRig(pal, {
      gripRadius: opts.gripRadius,
      shape: GRIP_SHAPE,
      side: 1,
      indexExtended: opts.indexExtended ?? true,
    });
    this.left = new ArmRig(pal, {
      ...SUPPORT_FIST[opts.support],
      gripRadius: opts.supportRadius,
      side: -1,
    });
    const elbow = LEFT_ELBOW[opts.support];
    this.leftElbow.set(elbow[0], elbow[1], elbow[2]);
    this.root.add(this.right.root, this.left.root);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  dispose(): void {
    const seen = new Set<THREE.BufferGeometry>();
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      if (geometry && !seen.has(geometry)) {
        seen.add(geometry);
        geometry.dispose();
      }
    });
    this.root.removeFromParent();
  }
}
