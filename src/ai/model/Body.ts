/**
 * The body under the gear.
 *
 * A torso from a swept profile, limbs lofted along their bone chains with a
 * radius curve per segment, an ellipsoidal skull, gloved fists and boots. The
 * proportions are the ones in `Rig`, so the mesh and the skeleton cannot drift
 * apart, and every part declares the bones it is allowed to bind to, which is
 * what keeps the skin weights clean without any hand authoring.
 *
 * Detail level is a multiplier on segment counts only — the silhouette is
 * identical at every level, which is what stops a distant soldier from visibly
 * changing shape as they walk towards the camera.
 */
import * as THREE from 'three';
import { addDome, addRoundedBox, addSweep, addTube, Part, type Section, type Tint } from './GeoUtil';
import { B } from './Rig';
import { SLOT } from './Slots';
import type { VariantSpec } from './Variants';

export interface BodyDetail {
  /** 1 = full, 0.5 = half the segments around every sweep and tube. */
  scale: number;
  /** Drops the small readability details that only matter up close. */
  simple: boolean;
}

const seg = (base: number, detail: BodyDetail): number =>
  Math.max(4, Math.round(base * detail.scale));

/**
 * Height of the eyes in the bind pose, and the datum for the whole head.
 *
 * Everything on the face hangs off this, and so does the helmet: the brim has to
 * clear the brow or the shell swallows the face, which is exactly what the first
 * pass did. Anthropometrically the crown is 115 mm above it and the chin 110 mm
 * below, which is where the head's radii come from.
 */
export const EYE_LINE = 1.66;

const TORSO_BONES = [B.hips, B.spine, B.spine1, B.spine2, B.neck, B.shoulderL, B.shoulderR];
const HEAD_BONES = [B.head, B.neck];
const ARM_BONES_L = [B.shoulderL, B.armL, B.foreArmL, B.handL, B.spine2];
const ARM_BONES_R = [B.shoulderR, B.armR, B.foreArmR, B.handR, B.spine2];
const HAND_BONES_L = [B.handL, B.foreArmL];
const HAND_BONES_R = [B.handR, B.foreArmR];
const LEG_BONES_L = [B.hips, B.upLegL, B.legL, B.footL];
const LEG_BONES_R = [B.hips, B.upLegR, B.legR, B.footR];
const FOOT_BONES_L = [B.footL, B.toeL, B.legL];
const FOOT_BONES_R = [B.footR, B.toeR, B.legR];

/** Appends the whole body to `parts`. Gear is layered on top separately. */
export function buildBody(parts: Part[], variant: VariantSpec, detail: BodyDetail): void {
  parts.push(buildTorso(variant, detail));
  parts.push(buildHead(variant, detail));
  parts.push(buildArm(variant, detail, -1));
  parts.push(buildArm(variant, detail, 1));
  parts.push(buildHand(variant, detail, -1));
  parts.push(buildHand(variant, detail, 1));
  parts.push(buildLeg(variant, detail, -1));
  parts.push(buildLeg(variant, detail, 1));
  parts.push(buildBoot(variant, detail, -1));
  parts.push(buildBoot(variant, detail, 1));
}

// ---------------------------------------------------------------------------
// Torso
// ---------------------------------------------------------------------------

/**
 * The torso profile.
 *
 * Read bottom to top: the hips are wide and shallow, the waist pulls in, the
 * ribcage flares and squares off (a higher superellipse exponent), the shoulders
 * are the widest section, and the trapezius slopes in sharply to the neck. The
 * small forward offsets are the spine's curve — without them the back is a flat
 * plank and the whole figure reads as a mannequin.
 */
function buildTorso(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.uniform, TORSO_BONES);
  const c = variant.uniformTint;
  const dark = variant.uniformShadeTint;
  const sections: Section[] = [
    { y: 0.83, rx: 0.142, rz: 0.109, power: 2.6, z: 0.004, tint: dark },
    { y: 0.9, rx: 0.155, rz: 0.117, power: 2.6, z: 0.004, tint: dark },
    { y: 0.985, rx: 0.159, rz: 0.118, power: 2.7, z: 0.002, tint: c },
    { y: 1.06, rx: 0.146, rz: 0.106, power: 2.7, z: -0.006, tint: c },
    { y: 1.12, rx: 0.145, rz: 0.106, power: 2.8, z: -0.012, tint: c },
    { y: 1.2, rx: 0.157, rz: 0.115, power: 3, z: -0.014, tint: c },
    { y: 1.28, rx: 0.168, rz: 0.126, power: 3.2, z: -0.012, tint: c },
    { y: 1.36, rx: 0.174, rz: 0.132, power: 3.2, z: -0.006, tint: c },
    // The trapezius has to slope: a shoulder line that runs flat out to the arm
    // and then turns down at a right angle is the shoulder-pad silhouette, and it
    // is visible from any distance.
    { y: 1.43, rx: 0.163, rz: 0.124, power: 3, z: 0, tint: c },
    { y: 1.47, rx: 0.138, rz: 0.11, power: 2.6, z: 0.004, tint: c },
    { y: 1.5, rx: 0.1, rz: 0.092, power: 2.3, z: 0.006, tint: dark },
    { y: 1.525, rx: 0.07, rz: 0.07, power: 2, z: 0.006, tint: dark },
  ];
  addSweep(part, sections, seg(14, detail), c);
  return part;
}

// ---------------------------------------------------------------------------
// Head and neck
// ---------------------------------------------------------------------------

function buildHead(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.skin, HEAD_BONES);
  const skin = variant.skinTint;

  // Neck: a slightly forward-leaning column from the collar into the skull.
  addTube(
    part,
    [
      new THREE.Vector3(0, 1.46, 0.004),
      new THREE.Vector3(0, 1.51, 0.006),
      new THREE.Vector3(0, 1.56, 0.002),
    ],
    { sides: seg(8, detail), radii: [0.062, 0.056, 0.054], tint: variant.skinShadeTint },
  );

  // Skull: an ellipsoid pulled back at the crown and in at the jaw. The centre is
  // on EYE_LINE rather than in the middle of the head, because everything else on
  // the face and everything on the helmet is placed relative to the eyes.
  addDome(part, {
    centre: new THREE.Vector3(0, EYE_LINE, -0.004),
    radius: new THREE.Vector3(0.085, 0.115, 0.098),
    segments: seg(14, detail),
    rings: seg(10, detail),
    from: 0,
    to: Math.PI * 0.84,
    tint: skin,
    backScale: 1.06,
    frontScale: 0.94,
  });

  // Jaw and chin, so the profile is not a sphere on a stick.
  addSweep(
    part,
    [
      { y: 1.548, rx: 0.043, rz: 0.048, power: 2.4, z: -0.026 },
      { y: 1.582, rx: 0.06, rz: 0.07, power: 2.6, z: -0.02 },
      { y: 1.625, rx: 0.078, rz: 0.09, power: 2.6, z: -0.012 },
    ],
    seg(12, detail),
    skin,
    true,
    false,
  );

  // Hair, as a shell over the crown and down the nape. Almost all of it is under
  // the helmet, but the nape and the temples show, and without it every soldier is
  // visibly bald from behind. Every section is pushed back in Z far enough that its
  // front edge stays inside the skull and never crosses onto the face.
  addSweep(
    part,
    [
      { y: 1.566, rx: 0.058, rz: 0.05, power: 2.6, z: 0.03, tint: variant.hairTint },
      { y: 1.605, rx: 0.08, rz: 0.069, power: 2.6, z: 0.028, tint: variant.hairTint },
      { y: 1.645, rx: 0.091, rz: 0.085, power: 2.8, z: 0.022, tint: variant.hairTint },
      { y: 1.7, rx: 0.089, rz: 0.088, power: 2.8, z: 0.014, tint: variant.hairTint },
      { y: 1.752, rx: 0.066, rz: 0.07, power: 2.6, z: 0.008, tint: variant.hairTint },
    ],
    seg(12, detail),
    variant.hairTint,
    false,
    true,
  );

  if (detail.simple) return part;

  // Nose, brow and eye sockets. A few dozen triangles, but they are what makes a
  // head at 6 m read as a face rather than as an egg. Heights are anthropometric
  // off the eye line: brow 14 mm above it, nose tip 45 mm below.
  part.pushTRS(new THREE.Vector3(0, EYE_LINE - 0.026, -0.098), new THREE.Euler(0.24, 0, 0));
  addRoundedBox(part, new THREE.Vector3(0.013, 0.026, 0.013), skin, { sides: 6, power: 3 });
  part.pop();
  part.pushTRS(new THREE.Vector3(0, EYE_LINE + 0.016, -0.086), new THREE.Euler(-0.12, 0, 0));
  addRoundedBox(part, new THREE.Vector3(0.052, 0.012, 0.016), variant.skinShadeTint, {
    sides: 6,
    power: 4,
  });
  part.pop();
  // Sockets, recessed and shaded: at any distance past a few metres these are the
  // eyes, and without them the strip between brow and mask is a blank panel.
  for (const side of [-1, 1]) {
    part.pushTRS(
      new THREE.Vector3(side * 0.031, EYE_LINE, -0.081),
      new THREE.Euler(0.05, side * 0.16, 0),
    );
    addRoundedBox(part, new THREE.Vector3(0.019, 0.009, 0.007), variant.eyeTint, {
      sides: 6,
      power: 3,
    });
    part.pop();
  }
  // Ears.
  for (const side of [-1, 1]) {
    part.pushTRS(new THREE.Vector3(side * 0.085, EYE_LINE - 0.012, 0.004), new THREE.Euler(0, 0, 0));
    addDome(part, {
      centre: new THREE.Vector3(0, 0, 0),
      radius: new THREE.Vector3(0.012, 0.028, 0.018),
      segments: 6,
      rings: 4,
      tint: variant.skinShadeTint,
    });
    part.pop();
  }
  return part;
}

// ---------------------------------------------------------------------------
// Arms
// ---------------------------------------------------------------------------

/** `side` is -1 for the character's left (which is -X) and +1 for the right. */
function buildArm(variant: VariantSpec, detail: BodyDetail, side: number): Part {
  const part = new Part(SLOT.uniform, side < 0 ? ARM_BONES_L : ARM_BONES_R);
  const x = side * 1;
  // The tube starts *on* the shoulder joint, not inboard of it: its domed cap is
  // then centred on the joint the arm rotates about, so raising the arm turns the
  // deltoid in place instead of swinging a lump out through the chest.
  const path = [
    new THREE.Vector3(x * 0.199, 1.437, -0.006),
    new THREE.Vector3(x * 0.204, 1.36, -0.008),
    new THREE.Vector3(x * 0.206, 1.262, -0.01),
    new THREE.Vector3(x * 0.207, 1.176, -0.012),
    new THREE.Vector3(x * 0.209, 1.06, -0.009),
    new THREE.Vector3(x * 0.211, 0.968, -0.006),
  ];
  addTube(part, path, {
    sides: seg(10, detail),
    // The deltoid is the widest point of the arm but it is not a ball: 72 mm keeps
    // the shoulder inside the plate carrier's line instead of on top of it.
    radii: [0.072, 0.068, 0.056, 0.049, 0.046, 0.039],
    tint: variant.uniformTint,
    capStart: true,
    capEnd: false,
  });

  if (!detail.simple) {
    // Rolled cuff at the wrist: a hard edge where the sleeve ends stops the arm
    // reading as one continuous rubber tube.
    part.pushTRS(new THREE.Vector3(x * 0.211, 0.987, -0.007));
    addSweep(
      part,
      [
        { y: -0.016, rx: 0.045, rz: 0.045, power: 2 },
        { y: 0.006, rx: 0.05, rz: 0.05, power: 2 },
        { y: 0.02, rx: 0.045, rz: 0.045, power: 2 },
      ],
      seg(10, detail),
      variant.uniformShadeTint,
      false,
      false,
    );
    part.pop();
  }
  return part;
}

function buildHand(variant: VariantSpec, detail: BodyDetail, side: number): Part {
  const part = new Part(SLOT.gear, side < 0 ? HAND_BONES_L : HAND_BONES_R);
  const x = side * 0.211;
  // A closed fist, angled slightly inwards as a hand hangs.
  part.pushTRS(
    new THREE.Vector3(x, 0.912, -0.012),
    new THREE.Euler(0.12, 0, side * -0.14),
  );
  addRoundedBox(part, new THREE.Vector3(0.036, 0.05, 0.032), variant.gloveTint, {
    sides: seg(10, detail),
    power: 3.4,
    topScale: 1.05,
    bottomScale: 0.86,
  });
  part.pop();
  if (!detail.simple) {
    // Knuckle ridge and a thumb, both tiny, both visible on a shouldered weapon.
    part.pushTRS(new THREE.Vector3(x, 0.876, -0.03), new THREE.Euler(0.2, 0, 0));
    addRoundedBox(part, new THREE.Vector3(0.032, 0.014, 0.016), variant.gloveShadeTint, {
      sides: 6,
      power: 4,
    });
    part.pop();
    part.pushTRS(
      new THREE.Vector3(x - side * 0.03, 0.918, -0.026),
      new THREE.Euler(0.4, 0, side * 0.5),
    );
    addRoundedBox(part, new THREE.Vector3(0.012, 0.028, 0.013), variant.gloveTint, {
      sides: 6,
      power: 3,
    });
    part.pop();
  }
  return part;
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

function buildLeg(variant: VariantSpec, detail: BodyDetail, side: number): Part {
  const part = new Part(SLOT.uniform, side < 0 ? LEG_BONES_L : LEG_BONES_R);
  const x = side * 1;
  const path = [
    new THREE.Vector3(x * 0.096, 1.0, -0.004),
    new THREE.Vector3(x * 0.098, 0.87, 0),
    new THREE.Vector3(x * 0.1, 0.7, 0.006),
    new THREE.Vector3(x * 0.102, 0.528, 0.008),
    new THREE.Vector3(x * 0.103, 0.37, 0.002),
    new THREE.Vector3(x * 0.104, 0.22, -0.008),
    new THREE.Vector3(x * 0.104, 0.13, -0.014),
  ];
  addTube(part, path, {
    sides: seg(10, detail),
    // Loose combat trousers: the thigh is full, the knee pinches, the calf swells
    // and the cuff is bloused into the boot. The top radius is held just under the
    // hip separation so the two thighs meet rather than intersecting, which is what
    // was putting a pale wedge of inside-out geometry between the legs.
    radii: [0.094, 0.091, 0.081, 0.07, 0.069, 0.059, 0.055],
    tint: variant.uniformTint,
    capStart: true,
    capEnd: false,
  });
  if (!detail.simple) {
    part.pushTRS(new THREE.Vector3(x * 0.104, 0.185, -0.012));
    addSweep(
      part,
      [
        { y: -0.022, rx: 0.062, rz: 0.062, power: 2.4 },
        { y: 0.004, rx: 0.069, rz: 0.069, power: 2.4 },
        { y: 0.026, rx: 0.06, rz: 0.06, power: 2.4 },
      ],
      seg(10, detail),
      variant.uniformShadeTint,
      false,
      false,
    );
    part.pop();
  }
  return part;
}

function buildBoot(variant: VariantSpec, detail: BodyDetail, side: number): Part {
  const part = new Part(SLOT.gear, side < 0 ? FOOT_BONES_L : FOOT_BONES_R);
  const x = side * 0.104;
  // Ankle cuff.
  part.pushTRS(new THREE.Vector3(x, 0.135, -0.014));
  addSweep(
    part,
    [
      { y: -0.038, rx: 0.056, rz: 0.06, power: 3 },
      { y: 0.008, rx: 0.058, rz: 0.062, power: 3 },
      { y: 0.042, rx: 0.052, rz: 0.056, power: 3 },
    ],
    seg(10, detail),
    variant.bootTint,
    false,
    true,
  );
  part.pop();

  // Foot: a wedge that runs forward from the ankle, wider at the toe than at the
  // heel, with a sole slab under it.
  part.pushTRS(new THREE.Vector3(x, 0.055, -0.036));
  addSweep(
    part,
    [
      { y: -0.048, rx: 0.048, rz: 0.115, power: 4.5, z: -0.006 },
      { y: -0.02, rx: 0.052, rz: 0.12, power: 4.5, z: -0.008 },
      { y: 0.03, rx: 0.05, rz: 0.1, power: 4, z: 0.008 },
      { y: 0.062, rx: 0.045, rz: 0.07, power: 3.4, z: 0.026 },
    ],
    seg(10, detail),
    variant.bootTint,
  );
  part.pop();

  part.pushTRS(new THREE.Vector3(x, 0.014, -0.038));
  addRoundedBox(part, new THREE.Vector3(0.052, 0.015, 0.126), variant.bootSoleTint, {
    sides: seg(10, detail),
    power: 6,
  });
  part.pop();
  return part;
}
