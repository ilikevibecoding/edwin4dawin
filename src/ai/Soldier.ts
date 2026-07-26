import * as THREE from 'three';
import type { MaterialLibrary } from '../render/Materials';
import { mergeGeometries } from '../world/Level';

/**
 * Procedural soldier character.
 *
 * An articulated rig of merged primitive limbs rather than a skinned mesh:
 * without an asset pipeline a hand-built skeleton with proper joint hierarchy
 * gives far better silhouettes and animation control than a deformed blob
 * would. The proportions follow real anthropometry (8 heads tall, shoulder
 * width ~1.4 head, upper:lower arm ratio 1:0.95) because getting those wrong
 * is what makes game characters read as toys.
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
  hipL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeL: THREE.Object3D;
  kneeR: THREE.Object3D;
  weapon: THREE.Object3D;
  muzzle: THREE.Object3D;
  /** Hitbox anchors, matched to `Hitbox` registrations. */
  hitHead: THREE.Object3D;
  hitChest: THREE.Object3D;
  hitStomach: THREE.Object3D;
  dispose(): void;
}

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

function capsule(r: number, len: number, cap = 5, radial = 8): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, len, cap, radial);
  return g;
}

export function buildSoldier(materials: MaterialLibrary, variant = 0): SoldierRig {
  const root = new THREE.Group();
  root.name = 'soldier';

  const palette = [
    { fatigue: 'fabricTarp' as const, vest: 'polymerBlack' as const, skin: 0x8a6448 },
    { fatigue: 'fabricSandbag' as const, vest: 'polymerTan' as const, skin: 0x7a563c },
    { fatigue: 'fabricTarp' as const, vest: 'polymerTan' as const, skin: 0x9a7355 },
  ][variant % 3];

  const cloth = materials.get(palette.fatigue, { scale: 0.35, roughness: 0.95 });
  const gear = materials.get(palette.vest, { scale: 0.25, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({
    color: palette.skin,
    roughness: 0.72,
    metalness: 0,
  });
  const metal = materials.get('gunmetal', { scale: 0.5 });

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

  // ---- skeleton ----
  const pelvis = mk(root, 'pelvis', 0, 0.95, 0);
  const spine = mk(pelvis, 'spine', 0, 0.14, 0);
  const chest = mk(spine, 'chest', 0, 0.2, 0);
  const neck = mk(chest, 'neck', 0, 0.2, 0);
  const head = mk(neck, 'head', 0, 0.09, 0);

  const shoulderL = mk(chest, 'shoulderL', -0.19, 0.13, 0);
  const shoulderR = mk(chest, 'shoulderR', 0.19, 0.13, 0);
  const elbowL = mk(shoulderL, 'elbowL', 0, -0.28, 0);
  const elbowR = mk(shoulderR, 'elbowR', 0, -0.28, 0);

  const hipL = mk(pelvis, 'hipL', -0.1, -0.04, 0);
  const hipR = mk(pelvis, 'hipR', 0.1, -0.04, 0);
  const kneeL = mk(hipL, 'kneeL', 0, -0.44, 0);
  const kneeR = mk(hipR, 'kneeR', 0, -0.44, 0);

  // ---- geometry ----
  // Torso: tapered, with a distinct chest and narrower waist.
  const torsoGeo = bake([
    { geo: capsule(0.15, 0.2, 5, 10), y: 0.1, sx: 1.28, sz: 0.72 },
  ]);
  const torso = new THREE.Mesh(torsoGeo, cloth);
  torso.castShadow = true;
  spine.add(torso);

  // Plate carrier — the strongest silhouette cue for a modern soldier.
  const vestGeo = bake([
    { geo: new THREE.BoxGeometry(0.34, 0.36, 0.21), y: 0.11 },
    { geo: new THREE.BoxGeometry(0.1, 0.09, 0.06), x: -0.11, y: 0.2, z: 0.11 },
    { geo: new THREE.BoxGeometry(0.1, 0.09, 0.06), x: 0.11, y: 0.2, z: 0.11 },
    // Magazine pouches across the front.
    { geo: new THREE.BoxGeometry(0.08, 0.13, 0.06), x: -0.09, y: -0.02, z: 0.13 },
    { geo: new THREE.BoxGeometry(0.08, 0.13, 0.06), x: 0.0, y: -0.02, z: 0.13 },
    { geo: new THREE.BoxGeometry(0.08, 0.13, 0.06), x: 0.09, y: -0.02, z: 0.13 },
    // Radio on the back.
    { geo: new THREE.BoxGeometry(0.1, 0.14, 0.07), x: 0.08, y: 0.12, z: -0.13 },
  ]);
  const vest = new THREE.Mesh(vestGeo, gear);
  vest.castShadow = true;
  chest.add(vest);

  // Hips / belt
  const hipsGeo = bake([
    { geo: capsule(0.135, 0.1, 4, 9), y: -0.02, sx: 1.12, sz: 0.8 },
    { geo: new THREE.BoxGeometry(0.3, 0.06, 0.2), y: -0.05 },
    { geo: new THREE.BoxGeometry(0.09, 0.14, 0.07), x: 0.16, y: -0.12, z: 0.02 },
  ]);
  const hips = new THREE.Mesh(hipsGeo, cloth);
  hips.castShadow = true;
  pelvis.add(hips);

  // Head: helmet + face. The helmet shape does most of the identification
  // work at combat ranges, so it gets the detail.
  const helmetGeo = bake([
    { geo: new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), y: 0.01, sz: 1.14 },
    { geo: new THREE.BoxGeometry(0.2, 0.02, 0.08), y: 0.035, z: 0.1, rx: -0.25 },
    // NVG mount.
    { geo: new THREE.BoxGeometry(0.05, 0.05, 0.03), y: 0.06, z: 0.1 },
    // Side rails.
    { geo: new THREE.BoxGeometry(0.02, 0.03, 0.13), x: -0.1, y: 0.0, z: 0 },
    { geo: new THREE.BoxGeometry(0.02, 0.03, 0.13), x: 0.1, y: 0.0, z: 0 },
  ]);
  const helmet = new THREE.Mesh(helmetGeo, gear);
  helmet.castShadow = true;
  head.add(helmet);

  const faceGeo = bake([
    { geo: capsule(0.07, 0.05, 4, 9), y: -0.02, sz: 0.95 },
  ]);
  const face = new THREE.Mesh(faceGeo, skin);
  face.castShadow = true;
  head.add(face);

  // Balaclava / shemagh over the lower face.
  const maskGeo = bake([{ geo: capsule(0.068, 0.03, 4, 9), y: -0.045, sz: 1.02 }]);
  const mask = new THREE.Mesh(maskGeo, gear);
  head.add(mask);

  // Limbs
  const upperArmGeo = bake([{ geo: capsule(0.05, 0.2, 4, 8), y: -0.14 }]);
  const lowerArmGeo = bake([
    { geo: capsule(0.043, 0.19, 4, 8), y: -0.13 },
    { geo: capsule(0.05, 0.04, 4, 8), y: -0.26 },
  ]);
  const upperLegGeo = bake([{ geo: capsule(0.075, 0.3, 4, 9), y: -0.22 }]);
  const lowerLegGeo = bake([
    { geo: capsule(0.06, 0.3, 4, 9), y: -0.22 },
    // Boot
    { geo: new THREE.BoxGeometry(0.1, 0.09, 0.24), y: -0.42, z: 0.045 },
  ]);

  for (const [joint, geo] of [
    [shoulderL, upperArmGeo], [shoulderR, upperArmGeo],
  ] as Array<[THREE.Object3D, THREE.BufferGeometry]>) {
    const mesh = new THREE.Mesh(geo, cloth);
    mesh.castShadow = true;
    joint.add(mesh);
  }
  for (const joint of [elbowL, elbowR]) {
    const mesh = new THREE.Mesh(lowerArmGeo, cloth);
    mesh.castShadow = true;
    joint.add(mesh);
  }
  for (const joint of [hipL, hipR]) {
    const mesh = new THREE.Mesh(upperLegGeo, cloth);
    mesh.castShadow = true;
    joint.add(mesh);
  }
  for (const joint of [kneeL, kneeR]) {
    const mesh = new THREE.Mesh(lowerLegGeo, cloth);
    mesh.castShadow = true;
    joint.add(mesh);
  }

  // ---- weapon ----
  const weapon = new THREE.Object3D();
  weapon.name = 'weapon';
  const weaponGeo = bake([
    { geo: new THREE.BoxGeometry(0.05, 0.07, 0.3) },
    { geo: new THREE.CylinderGeometry(0.011, 0.011, 0.32, 8), z: -0.3, y: 0.012, rx: Math.PI / 2 },
    { geo: new THREE.BoxGeometry(0.045, 0.05, 0.22), z: -0.22, y: 0.005 },
    { geo: new THREE.BoxGeometry(0.03, 0.11, 0.05), y: -0.08, z: 0.06, rx: -0.3 },
    { geo: new THREE.BoxGeometry(0.028, 0.13, 0.04), y: -0.09, z: -0.02, rx: -0.15 },
    { geo: new THREE.BoxGeometry(0.04, 0.06, 0.18), z: 0.22, y: -0.01 },
    { geo: new THREE.BoxGeometry(0.03, 0.03, 0.07), y: 0.055, z: -0.05 },
  ]);
  const weaponMesh = new THREE.Mesh(weaponGeo, metal);
  weaponMesh.castShadow = true;
  weapon.add(weaponMesh);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.46);
  weapon.add(muzzle);

  // The weapon hangs off the right hand; the left hand is posed onto it by
  // the animation code each frame.
  elbowR.add(weapon);
  weapon.position.set(0.02, -0.3, -0.12);
  weapon.rotation.set(0.25, 0, 0);

  // ---- hitboxes ----
  const hitHead = mk(head, 'hitHead', 0, -0.06, 0);
  const hitChest = mk(chest, 'hitChest', 0, -0.02, 0);
  const hitStomach = mk(spine, 'hitStomach', 0, -0.06, 0);

  return {
    root, pelvis, spine, chest, neck, head,
    shoulderL, shoulderR, elbowL, elbowR,
    hipL, hipR, kneeL, kneeR,
    weapon, muzzle,
    hitHead, hitChest, hitStomach,
    dispose(): void {
      torsoGeo.dispose();
      vestGeo.dispose();
      hipsGeo.dispose();
      helmetGeo.dispose();
      faceGeo.dispose();
      maskGeo.dispose();
      upperArmGeo.dispose();
      lowerArmGeo.dispose();
      upperLegGeo.dispose();
      lowerLegGeo.dispose();
      weaponGeo.dispose();
      skin.dispose();
    },
  };
}

/**
 * Procedural locomotion and aiming.
 *
 * A phase-driven gait rather than a keyframed clip: the leg cycle is a pair of
 * offset sinusoids with a knee-lift curve, the arms counter-swing, and the
 * upper body counter-rotates against the hips. This means the character walks
 * correctly at any speed without blend trees, and can be interrupted at any
 * point to aim, react, or fall.
 */
export function animateSoldier(
  rig: SoldierRig,
  state: {
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
  },
): void {
  const { phase, speed, crouch, aiming, aimPitch, aimYaw, recoil, flinch } = state;
  const stride = THREE.MathUtils.clamp(speed / 4.5, 0, 1.5);
  const run = THREE.MathUtils.clamp(speed / 6.0, 0, 1);

  // ---- legs ----
  const legSwing = 0.72 * stride;
  const lPhase = phase;
  const rPhase = phase + Math.PI;

  rig.hipL.rotation.x = Math.sin(lPhase) * legSwing - crouch * 0.62;
  rig.hipR.rotation.x = Math.sin(rPhase) * legSwing - crouch * 0.62;

  // Knees only bend backward, and lift most during the swing phase.
  const kneeCurve = (p: number): number => {
    const s = Math.sin(p);
    const lift = Math.max(0, -Math.cos(p));
    return (lift * 0.9 + Math.max(0, -s) * 0.35) * stride;
  };
  rig.kneeL.rotation.x = kneeCurve(lPhase) + crouch * 1.24;
  rig.kneeR.rotation.x = kneeCurve(rPhase) + crouch * 1.24;

  // Slight outward splay when strafing.
  rig.hipL.rotation.z = state.strafe * 0.12;
  rig.hipR.rotation.z = state.strafe * 0.12;

  // ---- pelvis bob and sway ----
  const bobY = -Math.abs(Math.cos(phase)) * 0.035 * stride - crouch * 0.34;
  rig.pelvis.position.y = 0.95 + bobY;
  rig.pelvis.rotation.y = -Math.sin(phase) * 0.1 * stride;
  rig.pelvis.rotation.z = Math.sin(phase) * 0.045 * stride;

  // ---- spine counter-rotation ----
  rig.spine.rotation.y = Math.sin(phase) * 0.12 * stride;
  rig.spine.rotation.x = run * 0.22 + crouch * 0.3 + flinch * 0.18;
  rig.chest.rotation.y = THREE.MathUtils.clamp(aimYaw * 0.45, -0.7, 0.7);
  rig.chest.rotation.x = -aimPitch * 0.35;

  // ---- head stabilisation ----
  // The head counter-rotates against the torso so the eyeline stays level —
  // without this, characters look like they are being shaken.
  rig.neck.rotation.y = THREE.MathUtils.clamp(aimYaw * 0.5, -0.6, 0.6) - rig.chest.rotation.y * 0.6;
  rig.neck.rotation.x = -aimPitch * 0.55 - rig.spine.rotation.x * 0.7;
  rig.head.rotation.z = -rig.pelvis.rotation.z * 0.4;

  // ---- arms ----
  const recoilKick = Math.max(0, 1 - recoil * 9) ** 2;

  if (aiming > 0.05) {
    // Shouldered: both arms lock onto the weapon.
    const aimBlend = aiming;
    rig.shoulderR.rotation.set(
      THREE.MathUtils.lerp(-0.3, -1.32 - aimPitch * 0.5, aimBlend) + recoilKick * 0.22,
      THREE.MathUtils.lerp(0, -0.28, aimBlend),
      THREE.MathUtils.lerp(0, 0.24, aimBlend),
    );
    rig.elbowR.rotation.set(
      THREE.MathUtils.lerp(-0.2, -0.95, aimBlend) - recoilKick * 0.16,
      0,
      0,
    );
    rig.shoulderL.rotation.set(
      THREE.MathUtils.lerp(-0.3, -1.5 - aimPitch * 0.5, aimBlend),
      THREE.MathUtils.lerp(0, 0.55, aimBlend),
      THREE.MathUtils.lerp(0, -0.42, aimBlend),
    );
    rig.elbowL.rotation.set(
      THREE.MathUtils.lerp(-0.2, -1.5, aimBlend),
      0,
      0,
    );
  } else {
    // At the low ready the arms counter-swing against the legs.
    const armSwing = 0.5 * stride;
    rig.shoulderR.rotation.set(Math.sin(rPhase) * armSwing - 0.55, -0.2, 0.18);
    rig.shoulderL.rotation.set(Math.sin(lPhase) * armSwing - 0.75, 0.36, -0.3);
    rig.elbowR.rotation.set(-0.85, 0, 0);
    rig.elbowL.rotation.set(-1.2, 0, 0);
  }

  // ---- weapon recoil ----
  rig.weapon.rotation.x = 0.25 - recoilKick * 0.22;
  rig.weapon.position.z = -0.12 + recoilKick * 0.035;
}

/**
 * Collapses the rig into a death pose.
 * `t` runs 0..1 over the fall; the pose interpolates limbs toward a slack
 * configuration and drops the pelvis, which reads far better than instantly
 * swapping to a corpse mesh.
 */
export function collapseSoldier(rig: SoldierRig, t: number, direction: number): void {
  const e = t * t * (3 - 2 * t);
  rig.pelvis.position.y = THREE.MathUtils.lerp(0.95, 0.16, e);
  rig.pelvis.rotation.x = THREE.MathUtils.lerp(0, Math.PI * 0.46 * direction, e);
  rig.pelvis.rotation.z = THREE.MathUtils.lerp(0, 0.35 * direction, e);
  rig.spine.rotation.x = THREE.MathUtils.lerp(rig.spine.rotation.x, 0.3 * direction, e);
  rig.chest.rotation.x = THREE.MathUtils.lerp(rig.chest.rotation.x, 0.2, e);
  rig.neck.rotation.x = THREE.MathUtils.lerp(rig.neck.rotation.x, 0.55, e);

  rig.shoulderL.rotation.set(
    THREE.MathUtils.lerp(rig.shoulderL.rotation.x, 0.4, e),
    THREE.MathUtils.lerp(rig.shoulderL.rotation.y, 0.9, e),
    THREE.MathUtils.lerp(rig.shoulderL.rotation.z, -0.7, e),
  );
  rig.shoulderR.rotation.set(
    THREE.MathUtils.lerp(rig.shoulderR.rotation.x, 0.3, e),
    THREE.MathUtils.lerp(rig.shoulderR.rotation.y, -1.0, e),
    THREE.MathUtils.lerp(rig.shoulderR.rotation.z, 0.8, e),
  );
  rig.elbowL.rotation.x = THREE.MathUtils.lerp(rig.elbowL.rotation.x, -0.35, e);
  rig.elbowR.rotation.x = THREE.MathUtils.lerp(rig.elbowR.rotation.x, -0.25, e);

  rig.hipL.rotation.set(THREE.MathUtils.lerp(rig.hipL.rotation.x, -0.5, e), 0, -0.25 * e);
  rig.hipR.rotation.set(THREE.MathUtils.lerp(rig.hipR.rotation.x, -0.2, e), 0, 0.35 * e);
  rig.kneeL.rotation.x = THREE.MathUtils.lerp(rig.kneeL.rotation.x, 0.9, e);
  rig.kneeR.rotation.x = THREE.MathUtils.lerp(rig.kneeR.rotation.x, 0.5, e);
}
