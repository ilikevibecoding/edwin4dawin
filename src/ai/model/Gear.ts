/**
 * Load-bearing equipment, worn over the body.
 *
 * Gear is what makes a procedural humanoid read as a soldier rather than as a
 * mannequin in coveralls: the silhouette a player recognises at thirty metres is
 * the helmet, the bulk of the plate carrier and the broken outline of pouches and
 * straps, not the shape of the man underneath.
 *
 * Every piece is skinned to the bone it sits on rather than parented as a separate
 * object, so a carrier compresses with the spine when the wearer crouches and a
 * helmet turns with the head, for no extra draw calls.
 */
import * as THREE from 'three';
import { addDome, addRoundedBox, addSweep, addTube, Part, type Tint } from './GeoUtil';
import { B } from './Rig';
import { SLOT } from './Slots';
import { EYE_LINE, type BodyDetail } from './Body';
import type { VariantSpec } from './Variants';

const seg = (base: number, detail: BodyDetail): number =>
  Math.max(4, Math.round(base * detail.scale));

/** Brow line: the lowest a helmet shell may reach across the front of the face. */
const BRIM = EYE_LINE + 0.016;

const CARRIER_BONES = [B.spine, B.spine1, B.spine2, B.hips];
const HELMET_BONES = [B.head];
const NECK_BONES = [B.neck, B.head, B.spine2];
const BELT_BONES = [B.hips, B.spine];
const THIGH_BONES_R = [B.upLegR, B.hips];
const KNEE_BONES_L = [B.legL, B.upLegL];
const KNEE_BONES_R = [B.legR, B.upLegR];
const ELBOW_BONES_L = [B.foreArmL, B.armL];
const ELBOW_BONES_R = [B.foreArmR, B.armR];

export function buildGear(parts: Part[], variant: VariantSpec, detail: BodyDetail): void {
  parts.push(buildCarrier(variant, detail));
  parts.push(buildCarrierHard(variant, detail));
  parts.push(buildHeadgear(variant, detail));
  parts.push(buildHeadgearHard(variant, detail));
  parts.push(buildBelt(variant, detail));
  if (variant.shemagh || variant.maskLower) parts.push(buildNeckwear(variant, detail));
  if (!detail.simple && (variant.kneepads || variant.bandolier)) {
    parts.push(buildPads(variant, detail));
  }
}

// ---------------------------------------------------------------------------
// Plate carrier
// ---------------------------------------------------------------------------

/** Nylon half of the carrier: cummerbund, straps, pouches. */
function buildCarrier(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.gear, CARRIER_BONES);
  const c = variant.gearTint;
  const dark = variant.gearShadeTint;

  // Cummerbund: a band around the lower ribs, slightly proud of the torso.
  addSweep(
    part,
    [
      { y: 1.12, rx: 0.158, rz: 0.119, power: 3, z: -0.012, tint: dark },
      { y: 1.17, rx: 0.168, rz: 0.128, power: 3.1, z: -0.014, tint: c },
      { y: 1.23, rx: 0.176, rz: 0.134, power: 3.2, z: -0.014, tint: c },
    ],
    seg(14, detail),
    c,
    false,
    false,
  );

  // Shoulder straps, over the trapezius and down onto the plates.
  for (const side of [-1, 1]) {
    addTube(
      part,
      [
        new THREE.Vector3(side * 0.062, 1.29, -0.128),
        new THREE.Vector3(side * 0.07, 1.42, -0.1),
        new THREE.Vector3(side * 0.076, 1.475, -0.02),
        new THREE.Vector3(side * 0.072, 1.44, 0.075),
        new THREE.Vector3(side * 0.062, 1.32, 0.115),
      ],
      {
        sides: seg(8, detail),
        radii: [0.03, 0.032, 0.034, 0.032, 0.03],
        flatten: [1.7, 1.7, 1.6, 1.7, 1.7],
        tint: c,
        capStart: true,
        capEnd: true,
      },
    );
  }

  // Front magazine pouches, laid out symmetrically across the plate.
  const count = Math.max(1, variant.pouches);
  const spread = 0.062;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    part.pushTRS(
      new THREE.Vector3(t * spread * count, 1.19, -0.152),
      new THREE.Euler(0.06, 0, t * 0.12),
    );
    addRoundedBox(part, new THREE.Vector3(0.032, 0.058, 0.026), i % 2 === 0 ? c : dark, {
      sides: seg(8, detail),
      power: 5,
      topScale: 0.94,
    });
    // Closure flap over the top of each pouch. A horizontal band in a contrasting
    // shade across the chest is the single most legible piece of gear on the model
    // at range: it is what turns a smooth plate into load-bearing equipment.
    if (!detail.simple) {
      part.pushTRS(new THREE.Vector3(0, 0.05, -0.006), new THREE.Euler(0.06, 0, 0));
      addRoundedBox(
        part,
        new THREE.Vector3(0.034, 0.014, 0.03),
        i % 2 === 0 ? dark : variant.armourTint,
        { sides: 6, power: 5 },
      );
      part.pop();
    }
    part.pop();
  }

  // Side utility pouches.
  for (const side of [-1, 1]) {
    part.pushTRS(
      new THREE.Vector3(side * 0.164, 1.16, -0.02),
      new THREE.Euler(0, 0, side * -0.1),
    );
    addRoundedBox(part, new THREE.Vector3(0.028, 0.05, 0.052), dark, {
      sides: seg(8, detail),
      power: 5,
    });
    part.pop();
  }

  if (variant.radio) {
    part.pushTRS(new THREE.Vector3(0.07, 1.27, 0.152), new THREE.Euler(-0.08, 0, 0));
    addRoundedBox(part, new THREE.Vector3(0.048, 0.072, 0.03), dark, {
      sides: seg(8, detail),
      power: 5,
    });
    part.pop();
    // Whip antenna. One tube, and it does a disproportionate amount of work on
    // the silhouette from behind.
    addTube(
      part,
      [
        new THREE.Vector3(0.104, 1.34, 0.15),
        new THREE.Vector3(0.116, 1.46, 0.166),
        new THREE.Vector3(0.126, 1.6, 0.19),
      ],
      { sides: 4, radii: [0.007, 0.005, 0.003], tint: variant.armourTint, capEnd: true },
    );
  }

  if (variant.bandolier) {
    addTube(
      part,
      [
      new THREE.Vector3(-0.086, 1.418, -0.1),
      new THREE.Vector3(0.02, 1.3, -0.148),
      new THREE.Vector3(0.132, 1.16, -0.09),
      new THREE.Vector3(0.163, 1.11, 0.03),
      ],
      {
        sides: seg(8, detail),
        radii: [0.024, 0.028, 0.028, 0.024],
        flatten: [1.6, 1.8, 1.8, 1.6],
        tint: dark,
        capStart: true,
        capEnd: true,
      },
    );
  }
  return part;
}

/** Hard-armour half: the front and rear plates themselves. */
function buildCarrierHard(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.armour, CARRIER_BONES);
  const c = variant.armourTint;

  // Front plate: follows the chest curve, squarer than the torso beneath it.
  addSweep(
    part,
    [
      { y: 1.15, rx: 0.152, rz: 0.138, power: 4.4, z: -0.014 },
      { y: 1.24, rx: 0.172, rz: 0.149, power: 4.6, z: -0.016 },
      { y: 1.33, rx: 0.183, rz: 0.154, power: 4.6, z: -0.012 },
      { y: 1.41, rx: 0.176, rz: 0.146, power: 4.2, z: -0.004 },
      { y: 1.45, rx: 0.136, rz: 0.128, power: 3.4, z: 0.002 },
    ],
    seg(14, detail),
    c,
    true,
    true,
  );

  if (detail.simple) return part;
  // Velcro admin panel on the upper chest, and a drag handle at the back.
  part.pushTRS(new THREE.Vector3(-0.052, 1.36, -0.156), new THREE.Euler(0.1, 0, 0.04));
  addRoundedBox(part, new THREE.Vector3(0.042, 0.03, 0.008), variant.gearShadeTint, {
    sides: 6,
    power: 6,
  });
  part.pop();
  addTube(
    part,
    [
      new THREE.Vector3(-0.05, 1.418, 0.13),
      new THREE.Vector3(0, 1.438, 0.148),
      new THREE.Vector3(0.05, 1.418, 0.13),
    ],
    {
      sides: 5,
      radii: [0.014, 0.016, 0.014],
      flatten: [2.2, 2.2, 2.2],
      tint: variant.gearShadeTint,
    },
  );
  return part;
}

// ---------------------------------------------------------------------------
// Headgear
// ---------------------------------------------------------------------------

/** Cloth parts of the headgear: helmet cover, cap crown, brim, headset pads. */
function buildHeadgear(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.gear, HELMET_BONES);
  const c = variant.gearTint;
  const dark = variant.gearShadeTint;

  if (variant.headgear === 'cap') {
    // Patrol cap: a low crown with a stitched panel and a peak over the brow.
    addDome(part, {
      centre: new THREE.Vector3(0, BRIM + 0.03, -0.004),
      radius: new THREE.Vector3(0.094, 0.078, 0.104),
      segments: seg(14, detail),
      rings: seg(5, detail),
      from: 0,
      to: Math.PI * 0.5,
      tint: c,
      backScale: 1.04,
      frontScale: 0.98,
    });
    addSweep(
      part,
      [
        { y: BRIM + 0.024, rx: 0.094, rz: 0.104, power: 3, z: -0.004, tint: dark },
        { y: BRIM + 0.038, rx: 0.096, rz: 0.106, power: 3, z: -0.004, tint: c },
      ],
      seg(14, detail),
      c,
      true,
      false,
    );
    part.pushTRS(new THREE.Vector3(0, BRIM + 0.016, -0.128), new THREE.Euler(0.12, 0, 0));
    addRoundedBox(part, new THREE.Vector3(0.072, 0.008, 0.042), dark, { sides: 8, power: 6 });
    part.pop();
  } else {
    // Helmet cover, a hair proud of the shell so both are visible at the rim. It
    // stops at the equator, which is BRIM: a dome that carries on past it is a
    // bowl whose front wall closes over the eyes.
    addDome(part, {
      centre: new THREE.Vector3(0, BRIM, 0.002),
      radius: new THREE.Vector3(0.118, 0.114, 0.128),
      segments: seg(14, detail),
      rings: seg(6, detail),
      from: 0,
      to: Math.PI * 0.5,
      tint: variant.headgear === 'helmet_cover' ? c : dark,
      backScale: 1.06,
      frontScale: 0.96,
    });
  }

  if (!detail.simple) {
    // Headset: a pad over each ear joined by a band, plus a boom mic.
    for (const side of [-1, 1]) {
      part.pushTRS(
        new THREE.Vector3(side * 0.098, EYE_LINE - 0.014, 0.006),
        new THREE.Euler(0, 0, side * 0.08),
      );
      addRoundedBox(part, new THREE.Vector3(0.016, 0.04, 0.034), dark, { sides: 8, power: 4 });
      part.pop();
    }
    addTube(
      part,
      [
        new THREE.Vector3(-0.086, BRIM + 0.024, 0.03),
        new THREE.Vector3(0, BRIM + 0.07, 0.036),
        new THREE.Vector3(0.086, BRIM + 0.024, 0.03),
      ],
      { sides: 4, radii: [0.008, 0.009, 0.008], tint: dark },
    );
    // Boom mic, out to the corner of the mouth.
    addTube(
      part,
      [
        new THREE.Vector3(-0.104, EYE_LINE - 0.03, -0.008),
        new THREE.Vector3(-0.084, EYE_LINE - 0.056, -0.062),
        new THREE.Vector3(-0.05, EYE_LINE - 0.062, -0.088),
      ],
      { sides: 4, radii: [0.006, 0.005, 0.008], tint: dark, capEnd: true },
    );
  }
  return part;
}

/** Hard parts of the headgear: shell, rails, NVG mount, goggles. */
function buildHeadgearHard(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.armour, HELMET_BONES);
  const c = variant.armourTint;

  if (variant.headgear !== 'cap') {
    // Shell, stopping at the brow line. Past the equator a dome of revolution
    // becomes a bowl whose front wall passes in front of the eyes, which turns the
    // face into a blank chin patch.
    addDome(part, {
      centre: new THREE.Vector3(0, BRIM, 0.002),
      radius: new THREE.Vector3(0.112, 0.112, 0.122),
      segments: seg(14, detail),
      rings: seg(6, detail),
      from: 0,
      to: Math.PI * 0.5,
      tint: c,
      backScale: 1.08,
      frontScale: 0.96,
    });
    // Rim: a lip proud of the shell all round, which is what catches the light and
    // separates helmet from head in silhouette.
    addSweep(
      part,
      [
        { y: BRIM - 0.012, rx: 0.11, rz: 0.12, power: 3, z: 0.004 },
        { y: BRIM + 0.008, rx: 0.117, rz: 0.127, power: 3, z: 0.004 },
      ],
      seg(14, detail),
      c,
      true,
      false,
    );
    // Nape and ear coverage. Pushed back in Z so its front is buried inside the
    // skull: the sides and the back of the shell come down over the ears without
    // any of it reaching around onto the face.
    addSweep(
      part,
      [
        { y: BRIM - 0.062, rx: 0.096, rz: 0.086, power: 2.8, z: 0.034 },
        { y: BRIM - 0.03, rx: 0.106, rz: 0.096, power: 3, z: 0.028 },
        { y: BRIM - 0.004, rx: 0.111, rz: 0.101, power: 3, z: 0.024 },
      ],
      seg(12, detail),
      c,
      true,
      false,
    );

    if (!detail.simple) {
      // Side accessory rails.
      for (const side of [-1, 1]) {
        part.pushTRS(
          new THREE.Vector3(side * 0.112, BRIM + 0.014, 0.006),
          new THREE.Euler(0, 0, side * 0.12),
        );
        addRoundedBox(part, new THREE.Vector3(0.008, 0.016, 0.062), variant.gearShadeTint, {
          sides: 6,
          power: 6,
        });
        part.pop();
      }
    }
  }

  if (variant.headgear === 'helmet_nvg' || variant.headgear === 'cap') {
    // NVG shroud on the brow, with the mount arm folded up.
    part.pushTRS(new THREE.Vector3(0, BRIM + 0.026, -0.1), new THREE.Euler(0.24, 0, 0));
    addRoundedBox(part, new THREE.Vector3(0.03, 0.026, 0.014), c, { sides: 6, power: 6 });
    part.pop();
    part.pushTRS(new THREE.Vector3(0, BRIM + 0.062, -0.076), new THREE.Euler(-0.5, 0, 0));
    addRoundedBox(part, new THREE.Vector3(0.014, 0.05, 0.012), variant.gearShadeTint, {
      sides: 6,
      power: 6,
    });
    part.pop();
  }

  // Goggles, pushed up onto the shell for the variants that are not wearing them.
  const onBrow = variant.headgear === 'helmet_cover' || variant.headgear === 'helmet_bare';
  if (onBrow) {
    addSweep(
      part,
      [
        {
          y: BRIM + 0.04,
          rx: 0.11,
          rz: 0.12,
          power: 4,
          z: 0.008,
          tint: variant.gearShadeTint,
        },
        { y: BRIM + 0.066, rx: 0.108, rz: 0.118, power: 4, z: 0.008, tint: variant.lensTint },
      ],
      seg(12, detail),
      variant.lensTint,
      false,
      false,
    );
  }
  // Eye protection, always. A soldier whose eyes are two dots of skin tone reads
  // as a mannequin; a dark lens band across the sockets reads as a soldier from
  // any distance, and it is the cheapest geometry on the model. Proud of the face
  // in Z by 15 mm, or it disappears inside the skull.
  part.pushTRS(
    new THREE.Vector3(0, EYE_LINE + 0.004, -0.092),
    new THREE.Euler(0.08, 0, 0),
  );
  addRoundedBox(
    part,
    new THREE.Vector3(onBrow ? 0.079 : 0.084, onBrow ? 0.013 : 0.024, onBrow ? 0.019 : 0.024),
    variant.lensTint,
    { sides: 10, power: 4.5 },
  );
  part.pop();
  if (!onBrow) {
    // Strap around the back of the head.
    addTube(
      part,
      [
        new THREE.Vector3(-0.086, EYE_LINE + 0.004, -0.05),
        new THREE.Vector3(-0.1, EYE_LINE + 0.012, 0.05),
        new THREE.Vector3(0, EYE_LINE + 0.016, 0.116),
        new THREE.Vector3(0.1, EYE_LINE + 0.012, 0.05),
        new THREE.Vector3(0.086, EYE_LINE + 0.004, -0.05),
      ],
      {
        sides: 4,
        radii: [0.012, 0.014, 0.014, 0.014, 0.012],
        flatten: [1.6, 1.6, 1.6, 1.6, 1.6],
        tint: variant.gearShadeTint,
      },
    );
  }
  return part;
}

/** Shemagh or balaclava over the neck and lower face. */
function buildNeckwear(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.gear, NECK_BONES);
  const c = variant.shemagh ? variant.gearTint : variant.gearShadeTint;

  if (variant.shemagh) {
    // A loose wrap: wide at the collar, gathered at the throat.
    addSweep(
      part,
      [
        // Outboard of the shirt collar at every height, or the collar pokes
        // through the wrap it is supposed to be underneath.
        { y: 1.44, rx: 0.118, rz: 0.11, power: 2.6, z: 0.006, tint: variant.gearShadeTint },
        { y: 1.49, rx: 0.108, rz: 0.104, power: 2.4, z: 0.008, tint: c },
        { y: 1.535, rx: 0.094, rz: 0.094, power: 2.2, z: 0.01, tint: c },
        { y: 1.572, rx: 0.086, rz: 0.086, power: 2.2, z: 0.008, tint: c },
      ],
      seg(12, detail),
      c,
      false,
      false,
    );
  }
  if (variant.maskLower) {
    // Balaclava front: chin to just under the eye line, leaving the eyes. Every
    // section is 8 mm proud of the skull beneath it, or the two surfaces are
    // coplanar and the mask z-fights instead of covering anything.
    addSweep(
      part,
      [
        { y: 1.552, rx: 0.05, rz: 0.055, power: 2.6, z: -0.022, tint: c },
        { y: 1.586, rx: 0.068, rz: 0.078, power: 2.8, z: -0.018, tint: c },
        { y: 1.628, rx: 0.086, rz: 0.098, power: 2.8, z: -0.01, tint: c },
        {
          y: EYE_LINE - 0.014,
          rx: 0.093,
          rz: 0.106,
          power: 2.8,
          z: -0.004,
          tint: variant.gearShadeTint,
        },
      ],
      seg(12, detail),
      c,
      true,
      false,
    );
  }
  return part;
}

/** Kneepads, elbow pads and a thigh holster. */
function buildPads(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.gear, [
    ...KNEE_BONES_L,
    ...KNEE_BONES_R,
    ...ELBOW_BONES_L,
    ...ELBOW_BONES_R,
    ...THIGH_BONES_R,
  ]);
  const c = variant.gearShadeTint;

  if (variant.kneepads) {
    for (const side of [-1, 1]) {
      part.pushTRS(
        new THREE.Vector3(side * 0.102, 0.528, -0.058),
        new THREE.Euler(0, 0, 0),
      );
      addDome(part, {
        centre: new THREE.Vector3(0, 0, 0),
        radius: new THREE.Vector3(0.062, 0.078, 0.05),
        segments: seg(10, detail),
        rings: seg(5, detail),
        from: Math.PI * 0.16,
        to: Math.PI * 0.84,
        tint: c,
        frontScale: 1,
        backScale: 0.2,
      });
      part.pop();
    }
  }
  if (variant.bandolier) {
    for (const side of [-1, 1]) {
      part.pushTRS(new THREE.Vector3(side * 0.207, 1.176, -0.034), new THREE.Euler(0, 0, 0));
      addDome(part, {
        centre: new THREE.Vector3(0, 0, 0),
        radius: new THREE.Vector3(0.05, 0.056, 0.038),
        segments: seg(8, detail),
        rings: seg(4, detail),
        from: Math.PI * 0.18,
        to: Math.PI * 0.82,
        tint: c,
        frontScale: 1,
        backScale: 0.25,
      });
      part.pop();
    }
  }
  return part;
}

// ---------------------------------------------------------------------------
// Belt kit
// ---------------------------------------------------------------------------

function buildBelt(variant: VariantSpec, detail: BodyDetail): Part {
  const part = new Part(SLOT.gear, BELT_BONES);
  const c = variant.gearTint;
  const dark = variant.gearShadeTint;

  addSweep(
    part,
    [
      { y: 0.966, rx: 0.162, rz: 0.121, power: 2.8, z: 0.002, tint: dark },
      { y: 0.995, rx: 0.168, rz: 0.126, power: 2.8, z: 0.002, tint: c },
      { y: 1.022, rx: 0.163, rz: 0.122, power: 2.8, z: 0.002, tint: dark },
    ],
    seg(14, detail),
    c,
    false,
    false,
  );

  // Rear utility pouches: what stops the back view from being a flat plane.
  for (const side of [-1, 1]) {
    part.pushTRS(
      new THREE.Vector3(side * 0.1, 0.98, 0.14),
      new THREE.Euler(0, side * -0.3, 0),
    );
    addRoundedBox(part, new THREE.Vector3(0.042, 0.05, 0.028), dark, {
      sides: seg(8, detail),
      power: 5,
    });
    part.pop();
  }

  if (variant.holster) {
    // Drop-leg holster with a stubby pistol butt showing.
    part.pushTRS(new THREE.Vector3(0.152, 0.86, 0.012), new THREE.Euler(0, 0, -0.1));
    addRoundedBox(part, new THREE.Vector3(0.038, 0.084, 0.05), dark, {
      sides: seg(8, detail),
      power: 5,
      topScale: 1.06,
    });
    part.pop();
    if (!detail.simple) {
      part.pushTRS(new THREE.Vector3(0.15, 0.958, 0.016), new THREE.Euler(0.16, 0, -0.12));
      addRoundedBox(part, new THREE.Vector3(0.016, 0.03, 0.03), variant.armourTint, {
        sides: 6,
        power: 6,
      });
      part.pop();
    }
  }
  return part;
}

/** Exposed so the animator can attach a magazine to the reload hand. */
export function magazineTint(variant: VariantSpec): Tint {
  return variant.gearShadeTint;
}
