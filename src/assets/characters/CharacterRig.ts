import * as THREE from 'three';
import type { MaterialLibrary } from '../materials';
import { clamp, easeOutCubic, invLerp, lerp, saturate, smoothstep } from '../../core/mathx';
import { fbm1 } from '../../core/Rng';
import { VectorTrack } from '../../timeline/tracks';

/**
 * Stylised humanoid rig.
 *
 * Deliberately low-poly: silhouette, colour and posture do the identification
 * work, not polygon count. The skeleton is a plain Object3D hierarchy and every
 * pose is a closed-form function of the master clock, so characters scrub
 * perfectly and can never drift out of sync with the timeline.
 *
 * Local space: character stands on y = 0, faces +Z, 1 unit = 1 metre.
 */

export type CharacterState =
  | 'idle' | 'alert' | 'walk' | 'run' | 'aim' | 'fire'
  | 'react' | 'down' | 'interact' | 'kneel' | 'crouch' | 'look' | 'cower' | 'march';

export interface CharacterSpec {
  name: string;
  height?: number;
  /** Body proportions multiplier: >1 reads as bulkier armour. */
  bulk?: number;
  colors: {
    head: THREE.ColorRepresentation;
    visor?: THREE.ColorRepresentation;
    torso: THREE.ColorRepresentation;
    arms: THREE.ColorRepresentation;
    legs: THREE.ColorRepresentation;
    belt?: THREE.ColorRepresentation;
    accent?: THREE.ColorRepresentation;
  };
  helmet?: 'trooper' | 'rebel' | 'vader' | 'none';
  hair?: 'buns' | 'none';
  cape?: boolean;
  skirt?: boolean;
  backpack?: boolean;
  weapon?: 'blaster' | 'rifle' | 'saber' | 'none';
  metalness?: number;
  roughness?: number;
}

export interface Joints {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Object3D;
  torso: THREE.Object3D;
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
  muzzle: THREE.Object3D | null;
  cape: THREE.Mesh | null;
  saber: THREE.Mesh | null;
}

function box(lib: MaterialLibrary, w: number, h: number, d: number, color: THREE.ColorRepresentation, rough = 0.62, metal = 0.12): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  lib.registry.track(geo);
  const m = new THREE.Mesh(geo, lib.character(color, rough, metal));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function capsule(lib: MaterialLibrary, r: number, len: number, color: THREE.ColorRepresentation, rough = 0.62, metal = 0.12): THREE.Mesh {
  const geo = new THREE.CapsuleGeometry(r, len, 4, 8);
  lib.registry.track(geo);
  const m = new THREE.Mesh(geo, lib.character(color, rough, metal));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildHumanoid(lib: MaterialLibrary, spec: CharacterSpec): Joints {
  const h = spec.height ?? 1.82;
  const bulk = spec.bulk ?? 1;
  const s = h / 1.82;
  const rough = spec.roughness ?? 0.62;
  const metal = spec.metalness ?? 0.12;
  const c = spec.colors;

  const root = new THREE.Group();
  root.name = `character:${spec.name}`;
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);

  const hips = new THREE.Object3D();
  hips.position.y = 0.94 * s;
  body.add(hips);

  const pelvis = box(lib, 0.34 * bulk * s, 0.2 * s, 0.22 * bulk * s, c.legs, rough, metal);
  hips.add(pelvis);
  if (c.belt) {
    const belt = box(lib, 0.36 * bulk * s, 0.07 * s, 0.24 * bulk * s, c.belt, 0.5, 0.3);
    belt.position.y = 0.06 * s;
    hips.add(belt);
  }

  const torso = new THREE.Object3D();
  torso.position.y = 0.1 * s;
  hips.add(torso);

  const abdomen = box(lib, 0.33 * bulk * s, 0.24 * s, 0.21 * bulk * s, c.torso, rough, metal);
  abdomen.position.y = 0.12 * s;
  torso.add(abdomen);

  const chest = new THREE.Object3D();
  chest.position.y = 0.26 * s;
  torso.add(chest);

  const ribcage = box(lib, 0.39 * bulk * s, 0.32 * s, 0.25 * bulk * s, c.torso, rough, metal);
  ribcage.position.y = 0.15 * s;
  chest.add(ribcage);

  if (c.accent) {
    const plate = box(lib, 0.26 * bulk * s, 0.16 * s, 0.05 * s, c.accent, 0.4, 0.5);
    plate.position.set(0, 0.17 * s, 0.13 * bulk * s);
    chest.add(plate);
  }

  const neck = new THREE.Object3D();
  neck.position.y = 0.33 * s;
  chest.add(neck);
  const neckMesh = capsule(lib, 0.055 * s, 0.07 * s, c.head, rough, metal);
  neck.add(neckMesh);

  const head = new THREE.Object3D();
  head.position.y = 0.11 * s;
  neck.add(head);
  buildHead(lib, spec, head, s, rough, metal);

  // Arms.
  const makeArm = (side: number): { shoulder: THREE.Object3D; elbow: THREE.Object3D; hand: THREE.Object3D } => {
    const shoulder = new THREE.Object3D();
    shoulder.position.set(side * 0.255 * bulk * s, 0.27 * s, 0);
    chest.add(shoulder);
    const pad = capsule(lib, 0.075 * bulk * s, 0.03 * s, c.arms, rough, metal);
    shoulder.add(pad);
    const upper = capsule(lib, 0.052 * bulk * s, 0.18 * s, c.arms, rough, metal);
    upper.position.y = -0.14 * s;
    shoulder.add(upper);

    const elbow = new THREE.Object3D();
    elbow.position.y = -0.27 * s;
    shoulder.add(elbow);
    const lower = capsule(lib, 0.046 * bulk * s, 0.16 * s, c.arms, rough, metal);
    lower.position.y = -0.12 * s;
    elbow.add(lower);

    const hand = new THREE.Object3D();
    hand.position.y = -0.24 * s;
    elbow.add(hand);
    const fist = box(lib, 0.07 * s, 0.09 * s, 0.07 * s, c.accent ?? c.arms, 0.55, metal);
    hand.add(fist);
    return { shoulder, elbow, hand };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Legs.
  const makeLeg = (side: number): { hip: THREE.Object3D; knee: THREE.Object3D } => {
    const hip = new THREE.Object3D();
    hip.position.set(side * 0.11 * s, -0.06 * s, 0);
    hips.add(hip);
    const thigh = capsule(lib, 0.072 * bulk * s, 0.25 * s, c.legs, rough, metal);
    thigh.position.y = -0.2 * s;
    hip.add(thigh);

    const knee = new THREE.Object3D();
    knee.position.y = -0.42 * s;
    hip.add(knee);
    const shin = capsule(lib, 0.06 * bulk * s, 0.24 * s, c.legs, rough, metal);
    shin.position.y = -0.19 * s;
    knee.add(shin);

    const boot = box(lib, 0.11 * s, 0.09 * s, 0.22 * s, c.belt ?? c.legs, 0.6, metal);
    boot.position.set(0, -0.4 * s, 0.04 * s);
    knee.add(boot);
    return { hip, knee };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  if (spec.skirt) {
    // Closed at both ends and single sided: an open cone shows its unlit
    // interior as a dark slab the moment the wearer bends forward.
    const geo = new THREE.CylinderGeometry(0.27 * s, 0.35 * s, 0.72 * s, 16, 1, false);
    lib.registry.track(geo);
    const m = new THREE.Mesh(geo, lib.character(c.legs, 0.7, 0.02));
    m.position.y = -0.24 * s;
    m.castShadow = true;
    m.receiveShadow = true;
    hips.add(m);
  }

  if (spec.backpack) {
    const pack = box(lib, 0.26 * s, 0.3 * s, 0.14 * s, c.accent ?? c.torso, 0.55, 0.35);
    pack.position.set(0, 0.16 * s, -0.18 * s);
    chest.add(pack);
  }

  let cape: THREE.Mesh | null = null;
  if (spec.cape) {
    const geo = new THREE.CylinderGeometry(0.26 * s, 0.46 * s, 1.32 * s, 14, 4, true, Math.PI * 0.18, Math.PI * 1.64);
    lib.registry.track(geo);
    const capeMat = lib.character(0x0a0a0d, 0.85, 0.02);
    // The cape is the only double-sided body part; the cached material is
    // unique to this colour so flipping it here affects nothing else.
    capeMat.side = THREE.DoubleSide;
    cape = new THREE.Mesh(geo, capeMat);
    cape.position.set(0, -0.28 * s, -0.04 * s);
    cape.rotation.y = Math.PI;
    cape.castShadow = true;
    chest.add(cape);
  }

  // Weapon.
  let muzzle: THREE.Object3D | null = null;
  let saber: THREE.Mesh | null = null;
  if (spec.weapon === 'blaster' || spec.weapon === 'rifle') {
    const long = spec.weapon === 'rifle';
    const gun = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.05 * s, 0.07 * s, (long ? 0.42 : 0.2) * s);
    lib.registry.track(bodyGeo);
    const gm = new THREE.Mesh(bodyGeo, lib.character(0x1b1c20, 0.45, 0.6));
    gm.castShadow = true;
    gun.add(gm);
    const barrelGeo = new THREE.CylinderGeometry(0.015 * s, 0.018 * s, (long ? 0.3 : 0.16) * s, 6);
    barrelGeo.rotateX(Math.PI / 2);
    lib.registry.track(barrelGeo);
    const bm = new THREE.Mesh(barrelGeo, lib.character(0x101115, 0.4, 0.7));
    bm.position.z = (long ? 0.32 : 0.16) * s;
    gun.add(bm);
    const gripGeo = new THREE.BoxGeometry(0.035 * s, 0.1 * s, 0.05 * s);
    lib.registry.track(gripGeo);
    const grip = new THREE.Mesh(gripGeo, lib.character(0x17181c, 0.5, 0.4));
    grip.position.set(0, -0.07 * s, -0.02 * s);
    gun.add(grip);
    gun.position.set(0, -0.04 * s, 0.06 * s);
    armR.hand.add(gun);
    muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, (long ? 0.48 : 0.26) * s);
    gun.add(muzzle);
  } else if (spec.weapon === 'saber') {
    const hiltGeo = new THREE.CylinderGeometry(0.021 * s, 0.024 * s, 0.26 * s, 8);
    hiltGeo.rotateX(Math.PI / 2);
    lib.registry.track(hiltGeo);
    const hilt = new THREE.Mesh(hiltGeo, lib.character(0x2b2c30, 0.35, 0.8));
    hilt.position.set(0, -0.04 * s, 0.06 * s);
    armR.hand.add(hilt);
    const bladeGeo = new THREE.CylinderGeometry(0.019 * s, 0.019 * s, 1.05 * s, 8);
    bladeGeo.rotateX(Math.PI / 2);
    bladeGeo.translate(0, 0, 0.52 * s);
    lib.registry.track(bladeGeo);
    saber = new THREE.Mesh(bladeGeo, lib.energy(0xff2b1e));
    saber.position.set(0, 0, 0.14 * s);
    saber.visible = false;
    hilt.add(saber);
    muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, 0.2 * s);
    hilt.add(muzzle);
  }

  return {
    root, body, hips, torso, chest, neck, head,
    shoulderL: armL.shoulder, shoulderR: armR.shoulder,
    elbowL: armL.elbow, elbowR: armR.elbow,
    handL: armL.hand, handR: armR.hand,
    hipL: legL.hip, hipR: legR.hip,
    kneeL: legL.knee, kneeR: legR.knee,
    muzzle, cape, saber,
  };
}

function buildHead(lib: MaterialLibrary, spec: CharacterSpec, head: THREE.Object3D, s: number, rough: number, metal: number): void {
  void rough;
  void metal;
  const c = spec.colors;
  switch (spec.helmet) {
    case 'trooper': {
      const shell = box(lib, 0.2 * s, 0.24 * s, 0.22 * s, c.head, 0.34, 0.06);
      shell.geometry.dispose();
      const g = new THREE.SphereGeometry(0.125 * s, 12, 10);
      g.scale(0.86, 1, 0.94);
      lib.registry.track(g);
      shell.geometry = g;
      head.add(shell);
      // Brow ridge and mouth vents make the trooper read instantly.
      const brow = box(lib, 0.2 * s, 0.045 * s, 0.03 * s, c.visor ?? 0x1b1c20, 0.3, 0.2);
      brow.position.set(0, 0.045 * s, 0.105 * s);
      head.add(brow);
      const lensL = box(lib, 0.055 * s, 0.06 * s, 0.03 * s, c.visor ?? 0x1b1c20, 0.25, 0.3);
      lensL.position.set(-0.055 * s, -0.005 * s, 0.1 * s);
      head.add(lensL);
      const lensR = lensL.clone();
      lensR.position.x = 0.055 * s;
      head.add(lensR);
      const vent = box(lib, 0.075 * s, 0.05 * s, 0.035 * s, 0x2a2b30, 0.4, 0.3);
      vent.position.set(0, -0.062 * s, 0.098 * s);
      head.add(vent);
      break;
    }
    case 'rebel': {
      const shell = new THREE.Mesh(
        lib.registry.track(new THREE.SphereGeometry(0.115 * s, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)),
        lib.character(c.head, 0.55, 0.2),
      );
      shell.castShadow = true;
      shell.scale.set(1, 1.15, 1.05);
      shell.position.y = 0.015 * s;
      head.add(shell);
      const face = capsule(lib, 0.085 * s, 0.06 * s, 0x6d5344, 0.7, 0.02);
      face.position.y = -0.02 * s;
      head.add(face);
      const brim = new THREE.Mesh(
        lib.registry.track(new THREE.CylinderGeometry(0.13 * s, 0.135 * s, 0.03 * s, 12)),
        lib.character(c.head, 0.55, 0.2),
      );
      brim.position.y = 0.02 * s;
      head.add(brim);
      const comm = box(lib, 0.04 * s, 0.06 * s, 0.05 * s, c.accent ?? 0x2a2c30, 0.5, 0.3);
      comm.position.set(0.11 * s, -0.01 * s, 0.02 * s);
      head.add(comm);
      break;
    }
    case 'vader': {
      const dome = new THREE.Mesh(
        lib.registry.track(new THREE.SphereGeometry(0.135 * s, 14, 12)),
        lib.character(c.head, 0.28, 0.55),
      );
      dome.scale.set(0.92, 1.12, 1.0);
      dome.castShadow = true;
      head.add(dome);
      // Flared helmet skirt.
      const skirt = new THREE.Mesh(
        lib.registry.track(new THREE.CylinderGeometry(0.115 * s, 0.175 * s, 0.14 * s, 14, 1, true)),
        lib.character(c.head, 0.28, 0.55),
      );
      skirt.material.side = THREE.DoubleSide;
      skirt.position.y = -0.1 * s;
      skirt.castShadow = true;
      head.add(skirt);
      // Faceplate, eye lenses and the triangular respirator.
      const face = box(lib, 0.15 * s, 0.14 * s, 0.05 * s, 0x0d0e11, 0.24, 0.6);
      face.position.set(0, -0.02 * s, 0.1 * s);
      head.add(face);
      const eyeL = box(lib, 0.05 * s, 0.045 * s, 0.03 * s, 0x14171c, 0.2, 0.7);
      eyeL.position.set(-0.045 * s, 0.02 * s, 0.125 * s);
      head.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.045 * s;
      head.add(eyeR);
      const resp = new THREE.Mesh(
        lib.registry.track(new THREE.CylinderGeometry(0.045 * s, 0.03 * s, 0.05 * s, 3)),
        lib.character(0x0a0b0e, 0.3, 0.6),
      );
      resp.rotation.x = Math.PI / 2;
      resp.rotation.z = Math.PI;
      resp.position.set(0, -0.075 * s, 0.115 * s);
      head.add(resp);
      break;
    }
    default: {
      const skull = capsule(lib, 0.088 * s, 0.06 * s, c.head, 0.66, 0.02);
      head.add(skull);
      if (spec.hair === 'buns') {
        const hairMat = lib.character(0x35241a, 0.8, 0.02);
        const cap = new THREE.Mesh(lib.registry.track(new THREE.SphereGeometry(0.096 * s, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)), hairMat);
        cap.position.y = 0.012 * s;
        cap.castShadow = true;
        head.add(cap);
        for (const side of [-1, 1]) {
          const bun = new THREE.Mesh(lib.registry.track(new THREE.SphereGeometry(0.062 * s, 12, 10)), hairMat);
          bun.position.set(side * 0.105 * s, -0.012 * s, -0.005 * s);
          bun.scale.set(0.85, 1, 0.9);
          bun.castShadow = true;
          head.add(bun);
        }
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

export interface StateKey {
  t: number;
  state: CharacterState;
  /** World-space (scene-local) point the character should face or aim at. */
  focus?: THREE.Vector3;
  /** Overrides the automatic facing derived from movement. */
  facing?: number;
  /** For 'fire': shots per second. */
  rate?: number;
}

export interface CharacterOptions {
  /** Floor path through the scene. Constant if a single key is supplied. */
  path: VectorTrack;
  states: StateKey[];
  /** Phase offset so a crowd never moves in lockstep. */
  phase?: number;
  /** Multiplier on stride length and cadence. */
  gait?: number;
  /** 1 = fluid, 0 = mechanically stiff (used for the protocol droid). */
  fluidity?: number;
}

const _v = new THREE.Vector3();

export class Character {
  readonly joints: Joints;
  readonly group: THREE.Group;
  readonly name: string;
  readonly options: CharacterOptions;
  private phase: number;
  private lastState: CharacterState = 'idle';
  private contact: THREE.Mesh;
  private contactRadius: number;
  /** Set by the scene so blaster muzzles can be located in world space. */
  readonly muzzleWorld = new THREE.Vector3();

  constructor(lib: MaterialLibrary, spec: CharacterSpec, options: CharacterOptions) {
    this.joints = buildHumanoid(lib, spec);
    this.group = this.joints.root;
    this.name = spec.name;
    this.options = options;
    this.phase = options.phase ?? 0;
    this.contactRadius = (spec.height ?? 1.82) * 0.44;
    this.contact = makeContactShadow(lib);
    this.group.add(this.contact);
  }

  stateAt(t: number): StateKey {
    const keys = this.options.states;
    let found = keys[0];
    for (const k of keys) {
      if (t >= k.t) found = k;
      else break;
    }
    return found;
  }

  /** The state immediately before the one active at `t`, if any. */
  private previousState(t: number): StateKey | null {
    const keys = this.options.states;
    let prev: StateKey | null = null;
    for (const k of keys) {
      if (t >= k.t) {
        if (k !== this.stateAt(t)) prev = k;
      } else break;
    }
    return prev;
  }

  /** Seconds since the active state began - drives one-shot pose transitions. */
  private stateAge(t: number): number {
    return t - this.stateAt(t).t;
  }

  update(t: number): void {
    const j = this.joints;
    const opts = this.options;
    const gait = opts.gait ?? 1;
    const fluid = opts.fluidity ?? 1;

    const pos = opts.path.at(t, _v);
    j.root.position.copy(pos);

    const vel = opts.path.velocityAt(t);
    const speed = Math.hypot(vel.x, vel.z);
    const key = this.stateAt(t);
    const age = this.stateAge(t);
    this.lastState = key.state;

    // Facing: travel direction wins, then an explicit focus, then hold still.
    let yaw = j.root.rotation.y;
    if (speed > 0.12) yaw = Math.atan2(vel.x, vel.z);
    else if (key.facing !== undefined) yaw = key.facing;
    else if (key.focus) yaw = Math.atan2(key.focus.x - pos.x, key.focus.z - pos.z);
    j.root.rotation.y = yaw;

    // Reset the pose each evaluation so the result depends only on `t`.
    resetJoints(j);

    const walkPhase = (t + this.phase) * gait;
    this.applyPose(key.state, t, age, key, walkPhase, speed, fluid);

    // Cross-fade out of the previous pose so a state change reads as a move
    // rather than a snap. `down` is excluded: collapsing needs a hard start.
    const previous = this.previousState(t);
    if (previous && age < POSE_BLEND && key.state !== 'down') {
      const blend = 1 - age / POSE_BLEND;
      captureJoints(j, BLEND_TARGET);
      resetJoints(j);
      this.applyPose(previous.state, t, t - previous.t, previous, walkPhase, speed, fluid);
      captureJoints(j, BLEND_PREVIOUS);
      blendJoints(j, BLEND_PREVIOUS, BLEND_TARGET, smoothstep(0, 1, 1 - blend));
    }

    // Locomotion still applies while walking and firing simultaneously.
    if (speed > 0.12 && (key.state === 'aim' || key.state === 'fire')) {
      this.overlayStride(walkPhase, speed, fluid);
    }

    if (key.focus && key.state !== 'down') this.lookAtFocus(key.focus);

    if (j.cape) {
      const sway = Math.sin(t * 0.9 + this.phase) * 0.05 + fbm1(t * 0.6 + this.phase) * 0.04;
      j.cape.rotation.x = -0.06 + sway * 0.5 + clamp(speed * 0.06, 0, 0.22);
      j.cape.rotation.z = sway;
    }

    // The grounding blob stretches along the direction of travel and spreads
    // as a body goes down.
    const down = key.state === 'down' ? saturate(age / 1.25) : 0;
    const r = this.contactRadius;
    this.contact.scale.set(r * (1 + down * 0.7), 1, r * (1 + Math.min(0.45, speed * 0.1) + down * 1.1));
    (this.contact.material as THREE.MeshBasicMaterial).opacity = 0.62 - down * 0.16;

    j.root.updateMatrixWorld(true);
    if (j.muzzle) j.muzzle.getWorldPosition(this.muzzleWorld);
  }

  private applyPose(
    state: CharacterState,
    t: number,
    age: number,
    key: StateKey,
    walkPhase: number,
    speed: number,
    fluid: number,
  ): void {
    switch (state) {
      case 'walk':
      case 'march':
        this.poseLocomotion(walkPhase, Math.max(0.9, speed), state === 'march' ? 0.75 : 1, fluid);
        break;
      case 'run':
        this.poseLocomotion(walkPhase * 1.55, Math.max(2.6, speed), 1.35, fluid);
        break;
      case 'aim':
        this.poseAim(t, key, 0);
        break;
      case 'fire':
        this.poseAim(t, key, 1);
        break;
      case 'alert':
        this.poseAlert(t, fluid);
        break;
      case 'react':
        this.poseReact(age);
        break;
      case 'down':
        this.poseDown(age);
        break;
      case 'interact':
        this.poseInteract(t, age, key);
        break;
      case 'kneel':
        this.poseKneel(t, key);
        break;
      case 'crouch':
        this.poseCrouch(t, key);
        break;
      case 'cower':
        this.poseCower(t);
        break;
      case 'look':
      case 'idle':
      default:
        this.poseIdle(t, fluid);
        break;
    }
  }

  get currentState(): CharacterState {
    return this.lastState;
  }

  private poseIdle(t: number, fluid: number): void {
    const j = this.joints;
    const breathe = Math.sin(t * 1.1 + this.phase) * 0.012 * fluid;
    j.torso.position.y += breathe;
    j.chest.rotation.x = breathe * 0.6;
    j.shoulderL.rotation.x = -0.06 + breathe;
    j.shoulderR.rotation.x = -0.06 - breathe;
    j.shoulderL.rotation.z = 0.14;
    j.shoulderR.rotation.z = -0.14;
    j.elbowL.rotation.x = -0.24;
    j.elbowR.rotation.x = -0.24;
    j.head.rotation.y = Math.sin(t * 0.31 + this.phase * 2) * 0.1 * fluid;
  }

  private poseAlert(t: number, fluid: number): void {
    const j = this.joints;
    const breathe = Math.sin(t * 1.6 + this.phase) * 0.01 * fluid;
    j.hips.position.y -= 0.06;
    j.torso.rotation.x = 0.1;
    j.hipL.rotation.x = 0.16;
    j.hipR.rotation.x = -0.1;
    j.kneeL.rotation.x = -0.3;
    j.kneeR.rotation.x = -0.24;
    j.shoulderL.rotation.x = -0.55 + breathe;
    j.shoulderR.rotation.x = -0.6 - breathe;
    j.shoulderL.rotation.z = 0.3;
    j.shoulderR.rotation.z = -0.3;
    j.elbowL.rotation.x = -1.25;
    j.elbowR.rotation.x = -1.35;
  }

  private poseLocomotion(phase: number, speed: number, amplitude: number, fluid: number): void {
    const j = this.joints;
    const cadence = clamp(speed * 1.5, 2.2, 8.5);
    const p = phase * cadence;
    const swing = 0.5 * amplitude * clamp(speed / 2.2, 0.5, 1.3);
    const sin = Math.sin(p);
    const cos = Math.cos(p);

    j.hipL.rotation.x = sin * swing;
    j.hipR.rotation.x = -sin * swing;
    j.kneeL.rotation.x = -Math.max(0, -sin) * swing * 1.5 - 0.06;
    j.kneeR.rotation.x = -Math.max(0, sin) * swing * 1.5 - 0.06;

    // Vertical bob keeps feet near the floor rather than sliding.
    j.hips.position.y += Math.abs(cos) * 0.028 * amplitude - 0.014;
    j.torso.rotation.x = 0.06 * amplitude + Math.abs(sin) * 0.02;
    j.chest.rotation.y = -sin * 0.09 * fluid;
    j.hips.rotation.y = sin * 0.05 * fluid;

    j.shoulderL.rotation.x = -sin * swing * 0.8 - 0.1;
    j.shoulderR.rotation.x = sin * swing * 0.8 - 0.1;
    j.shoulderL.rotation.z = 0.13;
    j.shoulderR.rotation.z = -0.13;
    j.elbowL.rotation.x = -0.35 - Math.abs(sin) * 0.25;
    j.elbowR.rotation.x = -0.35 - Math.abs(sin) * 0.25;
    j.head.rotation.x = -0.03;
  }

  private overlayStride(phase: number, speed: number, fluid: number): void {
    const j = this.joints;
    const p = phase * clamp(speed * 1.5, 2.2, 8);
    const sin = Math.sin(p);
    const swing = 0.4 * clamp(speed / 2.2, 0.4, 1.2);
    j.hipL.rotation.x = sin * swing;
    j.hipR.rotation.x = -sin * swing;
    j.kneeL.rotation.x = -Math.max(0, -sin) * swing * 1.4 - 0.06;
    j.kneeR.rotation.x = -Math.max(0, sin) * swing * 1.4 - 0.06;
    j.hips.position.y += Math.abs(Math.cos(p)) * 0.02 - 0.01;
    j.hips.rotation.y = sin * 0.04 * fluid;
  }

  private poseAim(t: number, key: StateKey, firing: number): void {
    const j = this.joints;
    j.hips.position.y -= 0.05;
    j.torso.rotation.x = 0.08;
    j.hipL.rotation.x = 0.22;
    j.hipR.rotation.x = -0.16;
    j.kneeL.rotation.x = -0.34;
    j.kneeR.rotation.x = -0.2;

    // Point the right arm at the focus; the left supports it.
    let pitch = -1.35;
    let twist = 0;
    if (key.focus) {
      const origin = _v.copy(j.root.position);
      const dx = key.focus.x - origin.x;
      const dy = key.focus.y - (origin.y + 1.35);
      const dz = key.focus.z - origin.z;
      const flat = Math.hypot(dx, dz);
      pitch = -Math.PI / 2 + Math.atan2(dy, flat);
      const worldYaw = Math.atan2(dx, dz);
      twist = clamp(angleDelta(worldYaw, j.root.rotation.y), -0.7, 0.7);
    }
    const recoil = firing > 0 ? recoilPulse(t, key.rate ?? 2.4) : 0;
    j.chest.rotation.y = twist * 0.55;
    j.shoulderR.rotation.x = pitch + recoil * 0.16;
    j.shoulderR.rotation.z = -0.24;
    j.shoulderR.rotation.y = twist * 0.4;
    j.elbowR.rotation.x = -0.34;
    j.shoulderL.rotation.x = pitch + 0.14;
    j.shoulderL.rotation.z = 0.42;
    j.shoulderL.rotation.y = twist * 0.3 + 0.24;
    j.elbowL.rotation.x = -0.72;
    j.torso.rotation.x = 0.08 - recoil * 0.05;
    j.head.rotation.y = twist * 0.35;
  }

  private poseReact(age: number): void {
    const j = this.joints;
    const k = Math.exp(-age * 4.5);
    j.torso.rotation.x = -0.32 * k;
    j.chest.rotation.x = -0.2 * k;
    j.head.rotation.x = 0.3 * k;
    j.shoulderL.rotation.x = -1.1 * k;
    j.shoulderR.rotation.x = -1.0 * k;
    j.shoulderL.rotation.z = 0.7 * k;
    j.shoulderR.rotation.z = -0.7 * k;
    j.hipL.rotation.x = 0.2 * k;
    j.hipR.rotation.x = 0.14 * k;
    j.kneeL.rotation.x = -0.5 * k;
    j.kneeR.rotation.x = -0.42 * k;
    j.hips.position.y -= 0.12 * k;
  }

  /** Non-graphic incapacitation: a controlled slump, then stillness. */
  private poseDown(age: number): void {
    const j = this.joints;
    const f = easeOutCubic(saturate(age / 1.25));
    j.body.rotation.x = -1.42 * f;
    j.body.position.y = -0.86 * f;
    j.body.position.z = -0.34 * f;
    j.hipL.rotation.x = 0.5 * f;
    j.hipR.rotation.x = 0.34 * f;
    j.kneeL.rotation.x = -0.7 * f;
    j.kneeR.rotation.x = -0.5 * f;
    j.shoulderL.rotation.x = -0.5 * f;
    j.shoulderR.rotation.x = -0.4 * f;
    j.shoulderL.rotation.z = 0.9 * f;
    j.shoulderR.rotation.z = -0.85 * f;
    j.head.rotation.x = 0.35 * f;
  }

  private poseInteract(t: number, age: number, key: StateKey): void {
    const j = this.joints;
    const reach = smoothstep(0, 0.6, age) * (1 - smoothstep(3.4, 4.4, age));
    j.torso.rotation.x = 0.16 * reach;
    j.shoulderR.rotation.x = -1.15 * reach - 0.08;
    j.shoulderR.rotation.z = -0.2;
    j.elbowR.rotation.x = -0.5 + 0.2 * Math.sin(t * 2.4);
    j.shoulderL.rotation.x = -0.5 * reach - 0.08;
    j.shoulderL.rotation.z = 0.24;
    j.elbowL.rotation.x = -0.7;
    j.hipL.rotation.x = 0.1 * reach;
    j.kneeL.rotation.x = -0.2 * reach;
    j.hips.position.y -= 0.05 * reach;
    if (key.focus) this.lookAtFocus(key.focus);
  }

  private poseKneel(t: number, key: StateKey): void {
    const j = this.joints;
    j.hips.position.y -= 0.42;
    j.hipL.rotation.x = 1.2;
    j.kneeL.rotation.x = -1.9;
    j.hipR.rotation.x = -0.55;
    j.kneeR.rotation.x = -1.5;
    j.torso.rotation.x = 0.18;
    j.shoulderL.rotation.x = -0.4;
    j.shoulderR.rotation.x = -0.5;
    j.shoulderL.rotation.z = 0.28;
    j.shoulderR.rotation.z = -0.26;
    j.elbowL.rotation.x = -0.9;
    j.elbowR.rotation.x = -1.0;
    j.chest.rotation.x = Math.sin(t * 1.3) * 0.02;
    if (key.focus) this.lookAtFocus(key.focus);
  }

  /**
   * A shallow two-footed crouch with a forward reach. Unlike `kneel` this keeps
   * the thighs close to vertical, which matters for the robed silhouette: a
   * full kneel drove the legs straight through the skirt geometry.
   */
  private poseCrouch(t: number, key: StateKey): void {
    const j = this.joints;
    j.hips.position.y -= 0.17;
    j.hipL.rotation.x = 0.24;
    j.hipR.rotation.x = 0.2;
    j.kneeL.rotation.x = -0.48;
    j.kneeR.rotation.x = -0.44;
    j.torso.rotation.x = 0.11;
    j.chest.rotation.x = 0.07 + Math.sin(t * 1.4) * 0.015;
    j.shoulderR.rotation.x = -0.72;
    j.shoulderR.rotation.z = -0.2;
    j.elbowR.rotation.x = -0.5 + Math.sin(t * 2.1) * 0.07;
    j.shoulderL.rotation.x = -0.38;
    j.shoulderL.rotation.z = 0.26;
    j.elbowL.rotation.x = -0.7;
    if (key.focus) this.lookAtFocus(key.focus);
  }

  private poseCower(t: number): void {
    const j = this.joints;
    const tremor = Math.sin(t * 11 + this.phase * 6) * 0.02;
    j.hips.position.y -= 0.14;
    j.torso.rotation.x = 0.34;
    j.chest.rotation.x = 0.2;
    j.head.rotation.x = 0.24;
    j.shoulderL.rotation.x = -1.9 + tremor;
    j.shoulderR.rotation.x = -1.95 - tremor;
    j.shoulderL.rotation.z = 0.55;
    j.shoulderR.rotation.z = -0.55;
    j.elbowL.rotation.x = -1.5;
    j.elbowR.rotation.x = -1.55;
    j.hipL.rotation.x = 0.35;
    j.hipR.rotation.x = 0.3;
    j.kneeL.rotation.x = -0.6;
    j.kneeR.rotation.x = -0.55;
  }

  private lookAtFocus(focus: THREE.Vector3): void {
    const j = this.joints;
    const dx = focus.x - j.root.position.x;
    const dy = focus.y - (j.root.position.y + 1.6);
    const dz = focus.z - j.root.position.z;
    const worldYaw = Math.atan2(dx, dz);
    const rel = clamp(angleDelta(worldYaw, j.root.rotation.y), -1.1, 1.1);
    j.head.rotation.y += rel * 0.75;
    j.head.rotation.x += clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.5, 0.5) * 0.8;
    j.chest.rotation.y += rel * 0.22;
  }
}

/**
 * Soft grounding blob under every figure.
 *
 * A single shadow-casting key cannot reliably ground a dozen bodies in a
 * corridor lit mostly by practicals, and without contact the eye reads them as
 * hovering. One cheap radial decal per character fixes that outright.
 */
let contactTexture: THREE.CanvasTexture | null = null;
let contactMaterial: THREE.MeshBasicMaterial | null = null;
let contactGeometry: THREE.PlaneGeometry | null = null;

function makeContactShadow(lib: MaterialLibrary): THREE.Mesh {
  if (!contactTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    contactTexture = new THREE.CanvasTexture(canvas);
    lib.registry.track(contactTexture);
  }
  if (!contactMaterial) {
    contactMaterial = new THREE.MeshBasicMaterial({
      map: contactTexture, transparent: true, opacity: 0.62,
      depthWrite: false, toneMapped: false, color: 0x000000,
    });
    lib.registry.track(contactMaterial);
  }
  if (!contactGeometry) {
    contactGeometry = new THREE.PlaneGeometry(1, 1);
    contactGeometry.rotateX(-Math.PI / 2);
    lib.registry.track(contactGeometry);
  }
  const mesh = new THREE.Mesh(contactGeometry, contactMaterial.clone());
  lib.registry.track(mesh.material as THREE.Material);
  mesh.position.y = 0.012;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}

/** Public helper so non-humanoid assets (the astromech) can be grounded too. */
export function makeGroundContact(lib: MaterialLibrary, radius: number): THREE.Mesh {
  const mesh = makeContactShadow(lib);
  mesh.scale.set(radius * 2, 1, radius * 2);
  return mesh;
}

/** Discard the shared contact-shadow resources when the library is rebuilt. */
export function resetContactShadowCache(): void {
  contactTexture = null;
  contactMaterial = null;
  contactGeometry = null;
}

/** Seconds spent easing from one pose into the next. */
const POSE_BLEND = 0.72;

/** Joints captured during a cross-fade, in a fixed order. */
const BLEND_ORDER: Array<keyof Joints> = [
  'body', 'hips', 'torso', 'chest', 'head',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR',
];

interface JointSnapshot {
  rotation: THREE.Euler;
  position: THREE.Vector3;
}

function makeSnapshot(): JointSnapshot[] {
  return BLEND_ORDER.map(() => ({ rotation: new THREE.Euler(), position: new THREE.Vector3() }));
}

const BLEND_TARGET = makeSnapshot();
const BLEND_PREVIOUS = makeSnapshot();

function captureJoints(j: Joints, into: JointSnapshot[]): void {
  BLEND_ORDER.forEach((key, i) => {
    const node = j[key] as THREE.Object3D;
    into[i].rotation.copy(node.rotation);
    into[i].position.copy(node.position);
  });
}

/** Write `lerp(previous, target, k)` back onto the rig. */
function blendJoints(j: Joints, previous: JointSnapshot[], target: JointSnapshot[], k: number): void {
  BLEND_ORDER.forEach((key, i) => {
    const node = j[key] as THREE.Object3D;
    const a = previous[i];
    const b = target[i];
    node.rotation.set(
      a.rotation.x + (b.rotation.x - a.rotation.x) * k,
      a.rotation.y + (b.rotation.y - a.rotation.y) * k,
      a.rotation.z + (b.rotation.z - a.rotation.z) * k,
    );
    node.position.lerpVectors(a.position, b.position, k);
  });
}

function resetJoints(j: Joints): void {
  j.body.rotation.set(0, 0, 0);
  j.body.position.set(0, 0, 0);
  j.hips.rotation.set(0, 0, 0);
  j.hips.position.y = j.hips.userData.baseY ?? (j.hips.userData.baseY = j.hips.position.y);
  j.torso.rotation.set(0, 0, 0);
  j.torso.position.y = j.torso.userData.baseY ?? (j.torso.userData.baseY = j.torso.position.y);
  j.chest.rotation.set(0, 0, 0);
  j.head.rotation.set(0, 0, 0);
  for (const o of [j.shoulderL, j.shoulderR, j.elbowL, j.elbowR, j.hipL, j.hipR, j.kneeL, j.kneeR]) {
    o.rotation.set(0, 0, 0);
  }
}

function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Sharp attack, quick settle - one per shot at the given rate. */
function recoilPulse(t: number, rate: number): number {
  const period = 1 / Math.max(0.2, rate);
  const phase = (t % period) / period;
  return Math.exp(-phase * 7) * (1 - phase * 0.2);
}

export { lerp, invLerp };
