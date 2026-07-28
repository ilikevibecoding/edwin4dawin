import * as THREE from 'three';
import type { MaterialLibrary } from '../render/Materials';
import { mergeGeometries } from '../world/Level';

/**
 * Procedural soldier character.
 *
 * An articulated rig of merged primitive limbs rather than a skinned mesh:
 * without an asset pipeline a hand-built skeleton with proper joint hierarchy
 * gives far better silhouettes and animation control than a deformed blob
 * would.
 *
 * Two things carry the read at combat range, and neither of them is detail.
 * The first is proportion — the measurements below come from real
 * anthropometry (1.80 m, 7.6 heads, shoulder breadth 0.45 m, upper arm to
 * forearm 1:0.90, thigh to shin 1:0.95) because getting those wrong is what
 * makes a game character read as a toy no matter how much geometry is piled
 * onto it. The second is the outline: helmet, plate carrier, shoulders, and
 * the triangle a shouldered rifle makes with the arms. Everything here that is
 * not one of those is there to break up the silhouette so it does not read as
 * a stack of capsules.
 */

export interface SoldierRig {
  root: THREE.Group;
  /** Hips — the animation root. */
  pelvis: THREE.Object3D;
  spine: THREE.Object3D;
  chest: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  shoulderL: THREE.Object3D;
  shoulderR: THREE.Object3D;
  elbowL: THREE.Object3D;
  elbowR: THREE.Object3D;
  handL: THREE.Object3D;
  handR: THREE.Object3D;
  hipL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeL: THREE.Object3D;
  kneeR: THREE.Object3D;
  ankleL: THREE.Object3D;
  ankleR: THREE.Object3D;
  /** Carries the weapon; posed by the animation, the arms then follow it. */
  weaponMount: THREE.Object3D;
  weapon: THREE.Object3D;
  muzzle: THREE.Object3D;
  /** Where each hand has to end up on the weapon. */
  gripR: THREE.Object3D;
  gripL: THREE.Object3D;
  /** Hitbox anchors, matched to `Hitbox` registrations. */
  hitHead: THREE.Object3D;
  hitChest: THREE.Object3D;
  hitStomach: THREE.Object3D;
  dispose(): void;
}

/**
 * The rig faces local +Z, because that is what the AI drives it with
 * (`root.rotation.y = yaw` against a forward of `(sin yaw, 0, cos yaw)`). With
 * +Y up that puts the character's own right hand on **-X**, so the firing side
 * is negative and the support side positive throughout. Getting this backwards
 * is not cosmetic: it points the rifle out of the character's back and sends
 * the IK reaching behind them for the handguard.
 */
const RIGHT = -1;

// ---- skeleton measurements, metres ----------------------------------------
const HIP_Y = 0.98;
const SPINE_Y = 0.13;
const CHEST_Y = 0.21;
const NECK_Y = 0.20;
const HEAD_Y = 0.10;
const SHOULDER_X = 0.185;
const SHOULDER_Y = 0.135;
const UPPER_ARM = 0.29;
const FOREARM = 0.26;
const HIP_X = 0.105;
const THIGH = 0.45;
const SHIN = 0.43;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

interface Piece {
  geo: THREE.BufferGeometry;
  x?: number; y?: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  sx?: number; sy?: number; sz?: number;
}

function bake(pieces: Piece[]): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  for (const p of pieces) {
    const g = p.geo.clone();
    if (!g.getAttribute('uv')) {
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = pos.getX(i) * 2;
        uv[i * 2 + 1] = pos.getY(i) * 2;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    _e.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    _q.setFromEuler(_e);
    _s.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
    _m.compose(_p.set(p.x ?? 0, p.y ?? 0, p.z ?? 0), _q, _s);
    g.applyMatrix4(_m);
    list.push(g);
  }
  const merged = mergeGeometries(list)!;
  for (const g of list) g.dispose();
  return merged;
}

function capsule(r: number, len: number, cap = 4, radial = 8): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(r, len, cap, radial);
}

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

export function buildSoldier(materials: MaterialLibrary, variant = 0): SoldierRig {
  const root = new THREE.Group();
  root.name = 'soldier';

  /**
   * Three loadouts, each built around a *value* break rather than a hue one.
   *
   * At the range enemies are actually engaged from, hue is nearly free
   * information and lightness is nearly all of it: the previous set put an
   * olive uniform under an olive-black carrier under an olive-brown kit, and
   * the whole soldier collapsed into one silhouette-less green mass. So each
   * of these pairs a dark layer against a light one, and the helmet is always
   * the odd one out — it is the first thing that clears cover and the thing
   * the player identifies the target by.
   *
   * The tints only ever multiply the baked albedo down, so the base material
   * has to be chosen for the lightest tone each layer needs to reach.
   */
  const palette = [
    {
      fatigue: 'fabricSandbag' as const, fatigueTint: 0xb2a583,
      vest: 'fabricTarp' as const, vestTint: 0x40443a,
      helmet: 'fabricTarp' as const, helmetTint: 0x7e8268,
      kitMat: 'fabricSandbag' as const, kit: 0x3a3428,
      glove: 0x3c3d3a, skin: 0x8a6448,
    },
    {
      fatigue: 'fabricSandbag' as const, fatigueTint: 0xbfb28e,
      vest: 'fabricTarp' as const, vestTint: 0x33362d,
      helmet: 'fabricSandbag' as const, helmetTint: 0x6e6656,
      kitMat: 'fabricTarp' as const, kit: 0x3c402f,
      glove: 0x303130, skin: 0x7a563c,
    },
    {
      fatigue: 'fabricTarp' as const, fatigueTint: 0x949a7c,
      vest: 'fabricSandbag' as const, vestTint: 0x4b432f,
      helmet: 'fabricTarp' as const, helmetTint: 0x8a9072,
      kitMat: 'polymerBlack' as const, kit: 0x46443e,
      glove: 0x44433d, skin: 0x9a7355,
    },
  ][variant % 3];

  // Everything a soldier wears is matte. The gear was on the polymer material,
  // which bakes a semi-gloss injection-moulded finish: under a hard sun that
  // put a specular crown on every pouch and shoulder strap, and at the range
  // these are actually seen those crowns are the *only* thing that resolves —
  // a soldier reduced to a scatter of white blobs on a green mass. Cordura and
  // a helmet cover are near-Lambertian, and reading as cloth is worth more
  // than reading as anything.
  const cloth = materials.get(palette.fatigue, {
    scale: 0.35, roughness: 0.99, color: palette.fatigueTint,
  });
  const gear = materials.get(palette.vest, {
    scale: 0.22, roughness: 0.97, color: palette.vestTint,
  });
  const cover = materials.get(palette.helmet, {
    scale: 0.13, roughness: 0.96, color: palette.helmetTint,
  });
  const webbing = materials.get(palette.kitMat, {
    scale: 0.16, roughness: 0.96, color: palette.kit,
  });
  const rubber = materials.get('polymerBlack', {
    scale: 0.2, roughness: 0.88, color: palette.glove,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: palette.skin,
    roughness: 0.72,
    metalness: 0,
  });
  const metal = materials.get('gunmetal', { scale: 0.5 });
  const owned: THREE.BufferGeometry[] = [];

  const mk = (
    parent: THREE.Object3D,
    name: string,
    x: number, y: number, z: number,
  ): THREE.Object3D => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const attach = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    shadow = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
  };
  const own = <T extends THREE.BufferGeometry>(g: T): T => { owned.push(g); return g; };

  // ---- skeleton ----
  const pelvis = mk(root, 'pelvis', 0, HIP_Y, 0);
  const spine = mk(pelvis, 'spine', 0, SPINE_Y, 0);
  const chest = mk(spine, 'chest', 0, CHEST_Y, 0);
  const neck = mk(chest, 'neck', 0, NECK_Y, 0);
  const head = mk(neck, 'head', 0, HEAD_Y, 0);

  const shoulderL = mk(chest, 'shoulderL', -RIGHT * SHOULDER_X, SHOULDER_Y, 0);
  const shoulderR = mk(chest, 'shoulderR', RIGHT * SHOULDER_X, SHOULDER_Y, 0);
  const elbowL = mk(shoulderL, 'elbowL', 0, -UPPER_ARM, 0);
  const elbowR = mk(shoulderR, 'elbowR', 0, -UPPER_ARM, 0);
  const handL = mk(elbowL, 'handL', 0, -FOREARM, 0);
  const handR = mk(elbowR, 'handR', 0, -FOREARM, 0);

  const hipL = mk(pelvis, 'hipL', -RIGHT * HIP_X, -0.05, 0);
  const hipR = mk(pelvis, 'hipR', RIGHT * HIP_X, -0.05, 0);
  const kneeL = mk(hipL, 'kneeL', 0, -THIGH, 0);
  const kneeR = mk(hipR, 'kneeR', 0, -THIGH, 0);
  const ankleL = mk(kneeL, 'ankleL', 0, -SHIN, 0);
  const ankleR = mk(kneeR, 'ankleR', 0, -SHIN, 0);

  // ---- torso ----
  // A tapered ribcage with a narrower waist. The chest is deliberately shallow
  // front-to-back: a cylinder torso is the single biggest reason a primitive
  // character reads as a snowman.
  const torsoGeo = own(bake([
    { geo: capsule(0.145, 0.16, 4, 10), y: 0.10, sx: 1.30, sz: 0.74 },
    { geo: capsule(0.125, 0.06, 3, 9), y: -0.03, sx: 1.24, sz: 0.72 },
  ]));
  attach(spine, torsoGeo, cloth);

  // Plate carrier. The front and back plates are flat slabs with a bevelled
  // top, which is what gives a modern soldier that boxy chest — and the
  // cummerbund wrapping the ribs is what stops it looking like a sandwich
  // board.
  //
  // Heights are measured against the chest pivot, which sits at 1.32 m — and
  // getting that reference wrong is what buried the head. The carrier was
  // authored with its shoulder straps centred 0.235 above the pivot, which is
  // 1.555 m: level with the mouth on a 1.80 m man, and a good nine centimetres
  // over the acromion. The result had no neck at all, so the helmet sat
  // straight onto the webbing and the whole figure read as hunched. The
  // suprasternal notch is at 1.47 and the plate stops above the navel at 1.15,
  // which is where these now are.
  const vestGeo = own(bake([
    // Front plate. A 10x12 SAPI plate is 30 by 36 centimetres and its carrier
    // covers from the sternal notch to the navel — most of the torso, not a
    // band across the ribs. Undersized, the carrier reads as a bib and the
    // fatigues either side of it carry the torso instead, which throws away
    // the one shape that identifies the target as a combatant at range.
    { geo: box(0.315, 0.335, 0.055), y: -0.005, z: 0.10, rx: -0.05 },
    { geo: box(0.25, 0.055, 0.05), y: 0.158, z: 0.092, rx: -0.42 },
    // Back plate.
    { geo: box(0.315, 0.355, 0.05), y: -0.005, z: -0.10, rx: 0.04 },
    // Cummerbund, wrapping the plates into one hard box.
    { geo: capsule(0.145, 0.11, 3, 10), y: -0.075, sx: 1.32, sz: 0.84 },
    { geo: box(0.33, 0.10, 0.235), y: -0.075 },
    // Shoulder straps over the trapezius.
    { geo: box(0.095, 0.062, 0.245), x: -0.104, y: 0.152, z: 0.0 },
    { geo: box(0.095, 0.062, 0.245), x: 0.104, y: 0.152, z: 0.0 },
  ]));
  attach(chest, vestGeo, gear);

  // Load-bearing kit. Deliberately asymmetric — three rifle mags left of
  // centre, a radio and an admin pouch on the right — because a symmetric
  // loadout reads as a uniform texture rather than as equipment.
  const kitGeo = own(bake([
    { geo: box(0.075, 0.125, 0.07), x: 0.105, y: -0.045, z: 0.125, rx: -0.10 },
    { geo: box(0.075, 0.125, 0.07), x: 0.022, y: -0.05, z: 0.13, rx: -0.10 },
    { geo: box(0.075, 0.115, 0.065), x: -0.062, y: -0.055, z: 0.128, rx: -0.10 },
    // Radio, antenna over the right shoulder.
    { geo: box(0.085, 0.15, 0.065), x: -0.10, y: 0.055, z: -0.135 },
    { geo: capsule(0.006, 0.20, 2, 5), x: -0.10, y: 0.235, z: -0.145, rx: -0.16 },
    // Admin pouch and a canteen at the back of the hip.
    { geo: box(0.10, 0.085, 0.055), x: -0.118, y: 0.075, z: 0.10, rx: -0.08 },
    { geo: box(0.16, 0.11, 0.09), x: 0.05, y: -0.085, z: -0.13 },
  ]));
  attach(chest, kitGeo, webbing);

  // ---- hips ----
  const hipsGeo = own(bake([
    { geo: capsule(0.128, 0.09, 3, 10), y: -0.02, sx: 1.14, sz: 0.82 },
  ]));
  attach(pelvis, hipsGeo, cloth);

  // Battle belt, in the dark webbing rather than in the fatigues' tan. The
  // plate carrier can only read as a plate carrier if the body below it is a
  // different value, and with the belt in cloth the vest, the abdomen and the
  // thighs were one continuous tan column from the shoulder straps to the
  // knee: at any range past ten metres that is a tan cylinder with a green
  // helmet on it, not a soldier in armour.
  const beltGeo = own(bake([
    { geo: box(0.29, 0.075, 0.205), y: -0.055 },
    { geo: capsule(0.132, 0.03, 3, 10), y: -0.055, sx: 1.06, sz: 0.80 },
    // Dump pouch and a holster, which break the leg-to-torso junction.
    { geo: box(0.10, 0.15, 0.075), x: -0.155, y: -0.10, z: 0.015, rz: -0.12 },
    { geo: box(0.085, 0.10, 0.06), x: 0.15, y: -0.08, z: -0.04 },
  ]));
  attach(pelvis, beltGeo, webbing);

  // ---- head ----
  // The helmet does the identification work at range, so it gets the shape
  // budget: a high-cut shell with a real brim, a bulge at the occiput, side
  // rails and a counterweight pouch at the back.
  const helmetGeo = own(bake([
    { geo: new THREE.SphereGeometry(0.115, 16, 11, 0, Math.PI * 2, 0, Math.PI * 0.60), y: 0.012, sy: 1.06, sz: 1.16 },
    // Occipital bulge and neck cover.
    { geo: new THREE.SphereGeometry(0.090, 12, 8), y: -0.016, z: -0.054, sy: 0.80, sz: 0.9 },
    // Brim, stood proud of the shell so it casts its own shadow line across
    // the face — which is most of what reads as "helmet" and not "hat".
    { geo: box(0.196, 0.018, 0.082), y: 0.024, z: 0.090, rx: -0.30 },
  ]));
  attach(head, helmetGeo, cover);

  // Furniture in a harder, darker material than the cover. A helmet rendered
  // in one tone is a ball; the rails, shroud and counterweight are what give
  // the head an outline with corners in it.
  const helmetKitGeo = own(bake([
    // NVG shroud.
    { geo: box(0.054, 0.034, 0.058), y: 0.064, z: 0.082, rx: -0.24 },
    { geo: box(0.032, 0.042, 0.024), y: 0.090, z: 0.098, rx: -0.24 },
    // Side rails and the counterweight pouch that balances them.
    { geo: box(0.018, 0.028, 0.140), x: -0.106, y: 0.004, z: 0.006 },
    { geo: box(0.018, 0.028, 0.140), x: 0.106, y: 0.004, z: 0.006 },
    { geo: box(0.092, 0.056, 0.050), y: 0.010, z: -0.100 },
    // Chin strap, down past the ear to the jaw.
    { geo: box(0.014, 0.090, 0.016), x: -0.092, y: -0.052, z: 0.020, rz: 0.22 },
    { geo: box(0.014, 0.090, 0.016), x: 0.092, y: -0.052, z: 0.020, rz: -0.22 },
  ]));
  attach(head, helmetKitGeo, rubber, false);

  const faceGeo = own(bake([
    { geo: capsule(0.068, 0.055, 4, 9), y: -0.022, sz: 0.96 },
    // Jaw, so the profile is not a sphere on a stick.
    { geo: box(0.085, 0.055, 0.075), y: -0.062, z: 0.014, rx: 0.18 },
  ]));
  attach(head, faceGeo, skin);

  // Balaclava over the lower face and a set of goggles pushed up on the brim.
  const maskGeo = own(bake([
    { geo: capsule(0.066, 0.045, 4, 9), y: -0.055, sz: 1.03 },
    { geo: box(0.155, 0.038, 0.055), y: 0.036, z: 0.075, rx: -0.28 },
  ]));
  attach(head, maskGeo, rubber, false);

  // ---- limbs ----
  // Deltoid at the top of the upper arm and a taper toward the elbow; a
  // constant-radius capsule arm is instantly readable as a tube.
  const upperArmGeo = own(bake([
    { geo: capsule(0.052, 0.17, 4, 8), y: -0.115 },
    { geo: new THREE.SphereGeometry(0.062, 9, 7), y: -0.028, sy: 0.9 },
  ]));
  attach(shoulderL, upperArmGeo, cloth);
  attach(shoulderR, upperArmGeo, cloth);

  // The brassard, in the carrier's colour rather than the sleeve's.
  //
  // Uniform, arm and torso were all one tone, so from the front an aiming
  // soldier had no arms at all: the whole upper body was a single tan mass
  // with a rifle leaving it. A dark cap on each shoulder is what a plate
  // carrier actually looks like and it costs one draw call to make the arms
  // separate objects at the range they are seen from.
  const brassardGeo = own(bake([
    { geo: box(0.104, 0.095, 0.135), y: -0.034 },
    { geo: capsule(0.055, 0.02, 3, 8), y: -0.088, sx: 1.05, sz: 1.15 },
  ]));
  attach(shoulderL, brassardGeo, gear);
  attach(shoulderR, brassardGeo, gear);

  const forearmGeo = own(bake([
    { geo: capsule(0.044, 0.17, 4, 8), y: -0.11 },
    // Rolled sleeve cuff, then bare forearm into a glove.
    { geo: capsule(0.049, 0.02, 3, 8), y: -0.035 },
  ]));
  attach(elbowL, forearmGeo, cloth);
  attach(elbowR, forearmGeo, cloth);

  // Elbow pads, which do for the arm's midpoint what the knee pads do for the
  // leg: put a hard, dark corner where a smooth capsule reads as a tube.
  const elbowPadGeo = own(bake([
    { geo: box(0.086, 0.10, 0.052), y: -0.028, z: -0.040, rx: -0.10 },
  ]));
  attach(elbowL, elbowPadGeo, rubber, false);
  attach(elbowR, elbowPadGeo, rubber, false);

  const handGeo = own(bake([
    { geo: box(0.048, 0.085, 0.075), y: -0.035 },
    { geo: capsule(0.022, 0.03, 3, 6), x: -0.026, y: -0.028, z: 0.014, rz: 0.5 },
  ]));
  attach(handL, handGeo, rubber, false);
  attach(handR, handGeo, rubber, false);

  // Legs in two materials, not one. A thigh, a shin and a drop pouch all baked
  // into the fatigues' tan is a smooth tan column from the belt to the boot,
  // and the pieces that were added specifically to break that silhouette up —
  // the pouch and the knee pad — disappear into it because they share its
  // value. The dark kit is what makes a leg read as a leg at twenty metres.
  const thighLGeo = own(bake([{ geo: capsule(0.078, 0.27, 4, 9), y: -0.20, sz: 0.95 }]));
  attach(hipL, thighLGeo, cloth);
  attach(hipL, own(bake([
    // Drop pouch strapped to the outside of the thigh.
    { geo: box(0.055, 0.16, 0.10), x: 0.075, y: -0.24, rz: 0.05 },
  ])), webbing);
  const thighRGeo = own(bake([{ geo: capsule(0.078, 0.27, 4, 9), y: -0.20, sz: 0.95 }]));
  attach(hipR, thighRGeo, cloth);
  attach(hipR, own(bake([
    { geo: box(0.055, 0.16, 0.10), x: -0.075, y: -0.24, rz: -0.05 },
  ])), webbing);

  const shinGeo = own(bake([{ geo: capsule(0.058, 0.24, 4, 9), y: -0.185, sz: 0.94 }]));
  // Knee pad, which is most of what identifies a soldier from the knee down.
  const kneePadGeo = own(bake([
    { geo: box(0.104, 0.115, 0.058), y: -0.035, z: 0.058, rx: 0.12 },
  ]));
  attach(kneeL, shinGeo, cloth);
  attach(kneeL, kneePadGeo, rubber);
  attach(kneeR, shinGeo, cloth);
  attach(kneeR, kneePadGeo, rubber);

  // Boot: a sole plate, a toe box and an ankle cuff, so it silhouettes as
  // footwear rather than as a brick.
  //
  // The ankle joint is at 0.10 m and the sole has to reach the floor from
  // there. It did not — the deepest piece bottomed out at 0.052 — so every
  // soldier in the game stood five centimetres in the air. On sand, with no
  // contact shadow tight enough to give it away at range, that reads as
  // characters pasted onto the frame rather than standing in it, which is a
  // remarkably large effect for a five-centimetre error.
  const bootGeo = own(bake([
    { geo: box(0.104, 0.034, 0.262), y: -0.083, z: 0.038 },
    { geo: box(0.098, 0.078, 0.222), y: -0.036, z: 0.030 },
    { geo: box(0.090, 0.098, 0.106), y: 0.026, z: -0.022 },
  ]));
  attach(ankleL, bootGeo, rubber);
  attach(ankleR, bootGeo, rubber);

  // ---- weapon ----
  // Carried on a mount off the chest rather than off a hand, so the animation
  // poses the *weapon* and the arms are then solved onto it. A rifle parented
  // to a forearm can never have the support hand land on the handguard.
  const weaponMount = mk(chest, 'weaponMount', RIGHT * 0.115, 0.075, 0.28);
  const weapon = new THREE.Object3D();
  weapon.name = 'weapon';
  weaponMount.add(weapon);

  // Laid out along the bore with the muzzle at +Z, because that is the
  // direction the character faces. Lengths are a 14.5" carbine: 0.52 m from
  // the receiver face to the flash hider, 0.26 m between the hands.
  const weaponGeo = own(bake([
    // Receiver, then the handguard forward of it.
    { geo: box(0.042, 0.078, 0.26), y: 0.0, z: 0.0 },
    { geo: box(0.046, 0.056, 0.235), y: 0.004, z: 0.245 },
    { geo: box(0.028, 0.020, 0.20), y: 0.042, z: 0.24 },
    // Barrel and flash hider.
    { geo: new THREE.CylinderGeometry(0.010, 0.010, 0.13, 8), y: 0.006, z: 0.42, rx: Math.PI / 2 },
    { geo: new THREE.CylinderGeometry(0.017, 0.014, 0.055, 8), y: 0.006, z: 0.50, rx: Math.PI / 2 },
    // Magazine, raked forward out of the well.
    { geo: box(0.030, 0.16, 0.055), y: -0.108, z: 0.005, rx: 0.17 },
    // Pistol grip, behind the well and raked back.
    { geo: box(0.032, 0.115, 0.044), y: -0.082, z: -0.095, rx: 0.32 },
    // Stock: buffer tube, cheek riser, butt pad.
    { geo: new THREE.CylinderGeometry(0.020, 0.020, 0.13, 8), y: 0.006, z: -0.19, rx: Math.PI / 2 },
    { geo: box(0.048, 0.070, 0.115), y: -0.006, z: -0.265 },
    { geo: box(0.052, 0.095, 0.028), y: -0.016, z: -0.328, rx: -0.10 },
    // Optic on a riser, and back-up irons.
    { geo: box(0.032, 0.030, 0.034), y: 0.058, z: 0.035 },
    { geo: new THREE.CylinderGeometry(0.021, 0.021, 0.10, 8), y: 0.083, z: 0.040, rx: Math.PI / 2 },
    { geo: box(0.022, 0.030, 0.010), y: 0.062, z: 0.185 },
    // Vertical foregrip under the handguard.
    { geo: box(0.026, 0.075, 0.030), y: -0.058, z: 0.235, rx: -0.12 },
  ]));
  attach(weapon, weaponGeo, metal);

  const muzzle = mk(weapon, 'muzzle', 0, 0.006, 0.53);
  // Where the hands have to end up: the firing hand on the pistol grip behind
  // the magazine well, the support hand wrapped round the handguard ahead of
  // it. Everything the arms do is derived from these two points.
  const gripR = mk(weapon, 'gripR', 0, -0.070, -0.095);
  const gripL = mk(weapon, 'gripL', 0, -0.032, 0.118);

  // ---- hitboxes ----
  const hitHead = mk(head, 'hitHead', 0, -0.04, 0);
  const hitChest = mk(chest, 'hitChest', 0, 0.02, 0);
  const hitStomach = mk(spine, 'hitStomach', 0, -0.05, 0);

  return {
    root, pelvis, spine, chest, neck, head,
    shoulderL, shoulderR, elbowL, elbowR, handL, handR,
    hipL, hipR, kneeL, kneeR, ankleL, ankleR,
    weaponMount, weapon, muzzle, gripR, gripL,
    hitHead, hitChest, hitStomach,
    dispose(): void {
      for (const g of owned) g.dispose();
      owned.length = 0;
      skin.dispose();
    },
  };
}

// ---------------------------------------------------------------------- IK --

const _target = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _toT = new THREE.Vector3();
const _n = new THREE.Vector3();
const _poleDir = new THREE.Vector3();
const _upperDir = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _ay = new THREE.Vector3();
const _az = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _inv = new THREE.Matrix4();

/**
 * Two-bone analytic IK.
 *
 * Both bones run down local -Y and the lower joint bends about local +X, which
 * matches how the limbs above are built. The elbow angle comes straight out of
 * the law of cosines; the pole picks which way the joint breaks, and without
 * it a solver will happily fold an arm through the chest or bend a knee
 * forwards — which is the specific failure that makes procedural characters
 * look broken.
 *
 * Returns the shortfall in metres when the target is out of reach, so the
 * caller can decide whether to drag the rest of the body toward it.
 */
export function solveTwoBone(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  l1: number,
  l2: number,
  targetWorld: THREE.Vector3,
  poleWorld: THREE.Vector3,
): number {
  const parent = upper.parent;
  if (!parent) return 0;
  parent.updateWorldMatrix(true, false);
  _inv.copy(parent.matrixWorld).invert();
  _target.copy(targetWorld).applyMatrix4(_inv);
  _pole.copy(poleWorld).applyMatrix4(_inv);

  _toT.copy(_target).sub(upper.position);
  const reach = l1 + l2;
  const raw = _toT.length();
  if (raw < 1e-5) return 0;
  const d = THREE.MathUtils.clamp(raw, Math.abs(l1 - l2) + 1e-3, reach - 1e-3);
  _n.copy(_toT).divideScalar(raw);

  // Interior angle at the joint, then the bend away from straight.
  const cosE = THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
  const bend = Math.PI - Math.acos(cosE);
  // How far the upper bone swings off the line to the target.
  const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const swing = Math.acos(cosA);

  _poleDir.copy(_pole).sub(upper.position);
  _poleDir.addScaledVector(_n, -_poleDir.dot(_n));
  if (_poleDir.lengthSq() < 1e-8) {
    // Degenerate pole: fall back to anything perpendicular so the limb still
    // bends in a plane instead of snapping to an arbitrary roll.
    _poleDir.set(0, 0, 1).addScaledVector(_n, -_n.z);
    if (_poleDir.lengthSq() < 1e-8) _poleDir.set(1, 0, 0);
  }
  _poleDir.normalize();

  _upperDir.copy(_n).multiplyScalar(Math.cos(swing)).addScaledVector(_poleDir, Math.sin(swing));

  _ax.crossVectors(_n, _poleDir).normalize();
  _ay.copy(_upperDir).negate();
  _az.crossVectors(_ax, _ay);
  _basis.makeBasis(_ax, _ay, _az);
  upper.quaternion.setFromRotationMatrix(_basis);
  lower.rotation.set(-bend, 0, 0);

  return Math.max(0, raw - reach);
}

// --------------------------------------------------------------- animation --

const _gripTarget = new THREE.Vector3();
const _poleTarget = new THREE.Vector3();
const _chestQ = new THREE.Quaternion();

export interface SoldierPose {
  /** Metres per second along the ground. */
  speed: number;
  /** Gait phase accumulator, radians. */
  phase: number;
  /** -1..1, strafing. */
  strafe: number;
  /** Radians; where the character is looking relative to its facing. */
  aimYaw: number;
  aimPitch: number;
  /** 0 = standing, 1 = fully crouched. */
  crouch: number;
  /** 0..1, weapon shouldered. */
  aiming: number;
  /** Seconds since the last shot; drives recoil. */
  recoil: number;
  /** 0..1 flinch from being hit. */
  flinch: number;
  elapsed: number;
}

/**
 * Procedural locomotion and aiming.
 *
 * A phase-driven gait rather than a keyframed clip: the leg cycle is a pair of
 * offset sinusoids with a knee-lift curve, the ankles keep the boots flat
 * through the stance, and the upper body counter-rotates against the hips.
 * This means the character walks correctly at any speed without blend trees,
 * and can be interrupted at any point to aim, react, or fall.
 *
 * The arms are not animated. The *weapon* is animated, and the arms are solved
 * onto it, which is the only way the support hand ends up on the handguard
 * instead of somewhere near it.
 */
export function animateSoldier(rig: SoldierRig, state: SoldierPose): void {
  const { phase, speed, crouch, aiming, aimPitch, aimYaw, recoil, flinch } = state;
  const stride = THREE.MathUtils.clamp(speed / 4.5, 0, 1.5);
  const run = THREE.MathUtils.clamp(speed / 6.0, 0, 1);
  const recoilKick = Math.max(0, 1 - recoil * 9) ** 2;

  // ---- legs ----
  // Hip and knee are offset by a quarter cycle: the knee is straightest at
  // heel strike and most flexed halfway through the swing. Getting that
  // relationship wrong is what makes a walk look like a march.
  const legSwing = 0.68 * stride;
  const lPhase = phase;
  const rPhase = phase + Math.PI;

  const hipCurve = (p: number): number => Math.sin(p) * legSwing - crouch * 0.75;
  // Knees only ever bend one way, so this is clamped positive by construction.
  const kneeCurve = (p: number): number => {
    const lift = Math.max(0, -Math.cos(p));
    const push = Math.max(0, Math.sin(p));
    return (lift * 1.05 + push * 0.22) * stride;
  };
  // The ankle takes out most of the shin's swing so the sole stays roughly
  // parallel to the ground through the stance phase.
  const ankleCurve = (hip: number, knee: number, p: number): number =>
    -(hip + knee) * 0.55 + Math.max(0, Math.sin(p + 0.6)) * 0.28 * stride - crouch * 0.35;

  // A standing soldier does not stand to attention. The feet are apart and
  // staggered with the support foot forward, the knees are unlocked and the
  // weight is over the front foot — and that fighting stance, not the walk
  // cycle, is what most enemies are photographed in. Straight legs together
  // is the single clearest tell of a mannequin.
  const planted = (1 - Math.min(1, stride)) * (0.4 + 0.6 * aiming);
  // Fore-and-aft, not side-to-side. A braced shooter's feet are about shoulder
  // width apart and one is half a pace in front of the other; the width is
  // small and the *stagger* is what carries the pose. Opening the hips
  // laterally instead gave a bow-legged wishbone — knees out, shins angling
  // back in, no daylight where the daylight should be — which reads as a
  // wrestler rather than as an infantryman.
  const stagger = 0.42 * planted;
  const splay = 0.055 * planted;
  const unlock = 0.20 * planted;

  const hipLx = hipCurve(lPhase) - stagger;
  const hipRx = hipCurve(rPhase) + stagger * 0.55;
  const kneeLx = kneeCurve(lPhase) + unlock * 1.35;
  const kneeRx = kneeCurve(rPhase) + unlock * 0.75;
  // Hip joints are 19 cm apart and the thighs are 16 cm thick, so rotating the
  // legs apart from the pelvis alone leaves barely a centimetre of daylight
  // between them — from three quarters on, the two legs merge into a single
  // column and the whole lower body reads as a plinth. Sliding the joints out
  // as well opens the stance to a boot width, which is where a braced shooter
  // actually stands and is what lets the gap between the legs carry the pose.
  const stance = 0.028 * planted;
  rig.hipL.position.x = -RIGHT * (HIP_X + stance);
  rig.hipR.position.x = RIGHT * (HIP_X + stance);
  rig.hipL.rotation.set(hipLx, -0.10 * planted, state.strafe * 0.10 + splay);
  rig.hipR.rotation.set(hipRx, 0.16 * planted, state.strafe * 0.10 - splay * 1.2);
  rig.kneeL.rotation.x = kneeLx + crouch * 1.5;
  rig.kneeR.rotation.x = kneeRx + crouch * 1.5;
  rig.ankleL.rotation.x = ankleCurve(hipLx, kneeLx, lPhase);
  rig.ankleR.rotation.x = ankleCurve(hipRx, kneeRx, rPhase);

  // ---- pelvis bob and sway ----
  // Two bobs per stride, since both legs push. The lateral sway is what keeps
  // the mass over the stance foot.
  const bobY = -Math.abs(Math.cos(phase)) * 0.032 * stride - crouch * 0.36;
  rig.pelvis.position.set(0, HIP_Y + bobY - 0.055 * planted, 0);
  rig.pelvis.rotation.set(
    0,
    -Math.sin(phase) * 0.10 * stride + RIGHT * 0.16 * planted,
    Math.sin(phase) * 0.05 * stride,
  );

  // ---- spine ----
  rig.spine.rotation.y = Math.sin(phase) * 0.11 * stride;
  rig.spine.rotation.x = run * 0.20 + crouch * 0.32 + flinch * 0.20;
  rig.spine.rotation.z = -Math.sin(phase) * 0.03 * stride;

  // Shouldering a rifle blades the torso: the support shoulder comes forward
  // so the arm can reach the handguard at all. Without it the support hand is
  // a good ten centimetres short of the weapon and the solver just straightens
  // the arm and leaves it hanging in space.
  //
  // The sign matters and is easy to get backwards. A yaw of +φ carries a point
  // on +X toward -Z, so with the character's left shoulder on +X, bringing
  // that shoulder *forward* is a negative yaw — the firing side, on -X, then
  // swings back behind it, which is the whole point of the stance.
  const a = aiming;
  const blade = RIGHT * (0.20 + 0.16 * a);
  rig.chest.rotation.set(
    -aimPitch * 0.28 - flinch * 0.1 + 0.10 * a,
    THREE.MathUtils.clamp(aimYaw * 0.45, -0.7, 0.7) + blade,
    0,
  );

  // ---- head stabilisation and cheek weld ----
  // The head counter-rotates against the torso so the eyeline stays level —
  // without this, characters look like they are being shaken. Shouldered, it
  // also has to come down and across onto the stock: a shooter brings his
  // head to the gun, and a character that keeps its chin up while a rifle
  // floats under it reads as holding a prop rather than aiming one.
  rig.neck.rotation.y = THREE.MathUtils.clamp(aimYaw * 0.5, -0.6, 0.6)
    - rig.chest.rotation.y * 0.75 + RIGHT * 0.10 * a;
  rig.neck.rotation.x = -aimPitch * 0.5 - rig.spine.rotation.x * 0.75
    - rig.chest.rotation.x * 0.4 + 0.16 * a;
  rig.neck.rotation.z = RIGHT * 0.14 * a;
  rig.head.rotation.z = -rig.pelvis.rotation.z * 0.4 + RIGHT * 0.06 * a;

  // ---- weapon ----
  // Shouldered, the rifle sits under the cheek and points where the eyes do;
  // at the low ready it drops across the body and hangs off the sling. The
  // whole pose is carried on the mount, and the arms follow it.
  // Shouldered, the sight has to end up under the firing eye or the character
  // is aiming at the floor two metres in front of it. The eye sits about
  // 0.28 m above the chest pivot, the optic 0.083 m above the bore, so the
  // mount rides high and inboard rather than out at the low-ready carry
  // position — which is where it was, twelve centimetres below the eyeline.
  const sway = Math.sin(phase) * 0.03 * stride * (1 - a * 0.65);
  rig.weaponMount.position.set(
    RIGHT * THREE.MathUtils.lerp(0.150, 0.072, a),
    THREE.MathUtils.lerp(-0.075, 0.170, a) + sway,
    THREE.MathUtils.lerp(0.19, 0.255, a),
  );
  rig.weaponMount.rotation.set(
    THREE.MathUtils.lerp(0.50, -aimPitch * 0.62, a) - recoilKick * 0.14 * a + sway * 0.5,
    // Cancel the blade so the bore still points where the character is
    // looking, and swing the muzzle across the body at the low ready.
    -blade + RIGHT * THREE.MathUtils.lerp(-0.22, 0.0, a),
    RIGHT * THREE.MathUtils.lerp(-0.30, -0.06, a),
  );
  rig.weapon.position.z = -recoilKick * 0.045;
  rig.weapon.rotation.x = recoilKick * 0.10;

  // ---- arms ----
  rig.chest.updateWorldMatrix(true, false);
  rig.chest.matrixWorld.decompose(_poleTarget, _chestQ, _target);

  // Firing elbow out to the side and slightly back; support elbow tucked down
  // and under. That pair of poles is the difference between a shooting stance
  // and a zombie reaching forwards.
  rig.gripR.updateWorldMatrix(true, false);
  _gripTarget.setFromMatrixPosition(rig.gripR.matrixWorld);
  rig.shoulderR.updateWorldMatrix(true, false);
  _poleTarget.setFromMatrixPosition(rig.shoulderR.matrixWorld);
  _poleTarget.add(
    _pole.set(RIGHT * 0.75, THREE.MathUtils.lerp(-0.55, -0.30, a), -0.55).applyQuaternion(_chestQ),
  );
  solveTwoBone(rig.shoulderR, rig.elbowR, UPPER_ARM, FOREARM, _gripTarget, _poleTarget);

  rig.gripL.updateWorldMatrix(true, false);
  _gripTarget.setFromMatrixPosition(rig.gripL.matrixWorld);
  rig.shoulderL.updateWorldMatrix(true, false);
  _poleTarget.setFromMatrixPosition(rig.shoulderL.matrixWorld);
  _poleTarget.add(
    _pole.set(-RIGHT * 0.22, -0.95, -0.20).applyQuaternion(_chestQ),
  );
  solveTwoBone(rig.shoulderL, rig.elbowL, UPPER_ARM, FOREARM, _gripTarget, _poleTarget);

  // Wrists: the firing hand cocks over the grip, the support hand rolls onto
  // the top of the handguard.
  rig.handR.rotation.set(0.30, 0, RIGHT * 0.22);
  rig.handL.rotation.set(0.50, 0, -RIGHT * 0.35);
}

/**
 * Collapses the rig into a death pose.
 *
 * `t` runs 0..1 over the fall. A body does not deflate: the knees go first and
 * the mass drops nearly straight down, the torso only pitches over once the
 * hips have arrived, and the limbs trail the motion instead of leading it. The
 * three overlapping timings below are the whole trick — run them in lockstep
 * and it reads as a mesh being scaled toward the floor.
 */
export function collapseSoldier(rig: SoldierRig, t: number, direction: number): void {
  const buckle = smooth(THREE.MathUtils.clamp(t / 0.30, 0, 1));
  const fall = smooth(THREE.MathUtils.clamp((t - 0.14) / 0.52, 0, 1));
  const settle = smooth(THREE.MathUtils.clamp((t - 0.58) / 0.42, 0, 1));
  const dir = direction >= 0 ? 1 : -1;

  // Which way the body goes over decides the sign of everything below, and it
  // is the specific thing the last version had inconsistent: the hips slid
  // *backward* while the torso pitched *forward*, which folds a soldier in
  // half around his own belt and is why the result read as laundry. Rotating
  // about +X carries +Y toward +Z, so a body going over backwards is a
  // negative pitch — and its legs, hanging on -Y, then extend forward in
  // front of it, which is exactly what a dropped body does.
  const pitch = -1.36 * fall + 0.18 * buckle * (1 - fall);

  rig.pelvis.position.set(
    dir * 0.14 * fall,
    THREE.MathUtils.lerp(HIP_Y, 0.62, buckle) - 0.40 * fall,
    -0.30 * fall,
  );
  rig.pelvis.rotation.set(pitch, dir * 0.34 * fall, dir * 0.42 * fall);
  // The spine keeps a little of its arch on the way down and gives it up when
  // the shoulders finally touch.
  rig.spine.rotation.set(-0.16 * fall + 0.10 * settle, dir * 0.14 * fall, dir * -0.12 * fall);
  rig.chest.rotation.set(-0.12 * fall + 0.22 * settle, dir * -0.26 * fall, dir * 0.14 * fall);
  // The head lolls last and furthest: chin onto the chest, then over to one
  // side as the neck gives up.
  rig.neck.rotation.set(0.35 * buckle + 0.45 * settle, dir * 0.40 * settle, dir * 0.30 * settle);
  rig.head.rotation.set(0.15 * settle, 0, dir * 0.35 * settle);

  // Knees buckle first and take the mass straight down; once the hips are on
  // the deck the legs slide out in front and go slack.
  //
  // Where they end up is set by the pelvis, not by these numbers on their own.
  // A pelvis pitched 78 degrees back already points the thighs along the
  // ground and twelve degrees into it, so a hip left at -0.20 drives a whole
  // leg through the deck and the solver has nowhere to put it but folded. The
  // fall terms below land both thighs a little above horizontal with the knees
  // barely broken, which is a body lying out at its full length instead of the
  // knot the last pass produced.
  rig.hipL.rotation.set(0.85 * buckle - 0.62 * fall, dir * 0.06 * fall, 0.10 + 0.30 * fall);
  rig.hipR.rotation.set(1.00 * buckle - 0.72 * fall, -dir * 0.05 * fall, -0.08 - 0.24 * fall);
  rig.kneeL.rotation.x = Math.max(0, 1.75 * buckle - 1.52 * fall + 0.12 * settle);
  rig.kneeR.rotation.x = Math.max(0, 1.95 * buckle - 1.60 * fall);
  // Feet flop outward once nothing is holding them, which is the single most
  // recognisable thing about a body on the ground.
  rig.ankleL.rotation.set(-0.45 * buckle + 0.52 * fall, 0, 0.34 * settle);
  rig.ankleR.rotation.set(-0.30 * buckle + 0.62 * fall, 0, -0.42 * settle);

  // The weapon leaves the hands the moment the body gives, and the arms go
  // slack rather than staying locked in a firing grip.
  const drop = smooth(THREE.MathUtils.clamp((t - 0.08) / 0.38, 0, 1));
  rig.weaponMount.position.set(
    RIGHT * 0.150 + dir * 0.40 * drop,
    -0.075 - 0.42 * drop,
    0.19 + 0.30 * drop,
  );
  rig.weaponMount.rotation.set(
    0.50 + 1.05 * drop,
    RIGHT * -0.22 + dir * 1.1 * drop,
    RIGHT * -0.30 + dir * 1.7 * drop,
  );

  // Arms fall out to the sides and back over the head, which is what an
  // unbraced fall actually produces and reads instantly as dead weight.
  rig.shoulderL.rotation.set(0.10 + 0.30 * fall - 0.55 * settle, -RIGHT * 0.55 * fall, -RIGHT * (0.60 + 0.55 * settle));
  rig.shoulderR.rotation.set(0.05 + 0.20 * fall - 0.35 * settle, RIGHT * 0.70 * fall, RIGHT * (0.70 + 0.50 * settle));
  rig.elbowL.rotation.set(-0.95 + 0.70 * fall - 0.35 * settle, 0, 0);
  rig.elbowR.rotation.set(-0.85 + 0.55 * fall - 0.25 * settle, 0, 0);
  rig.handL.rotation.set(0.25, 0, 0);
  rig.handR.rotation.set(0.25, 0, 0);
}

function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}
