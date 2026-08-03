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
  footL: THREE.Object3D;
  footR: THREE.Object3D;
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
  const makeLeg = (side: number): { hip: THREE.Object3D; knee: THREE.Object3D; foot: THREE.Object3D } => {
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

    // The sole, as an empty. The foot-slip check in the QA harness needs a point
    // it can sample in world space, and the mesh origin sits mid-boot.
    const sole = new THREE.Object3D();
    sole.position.set(0, -0.045 * s, 0);
    boot.add(sole);
    return { hip, knee, foot: sole };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  if (spec.skirt) {
    // Closed at both ends and single sided: an open cone shows its unlit
    // interior as a dark slab the moment the wearer bends forward. Narrow and
    // floor length rather than short and wide - a hem 0.7 m across ends at the
    // knee and reads as a lampshade with one leg under it. This still has to be
    // wide enough at knee height to contain a full stride, since the skirt is a
    // rigid cone and cannot drape out of the way.
    const geo = new THREE.CylinderGeometry(0.2 * s, 0.31 * s, 0.86 * s, 20, 1, false);
    lib.registry.track(geo);
    const m = new THREE.Mesh(geo, lib.character(c.legs, 0.7, 0.02));
    m.position.y = -0.33 * s;
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
    // Hangs from the shoulder line, not over it. A cape whose mouth sits above
    // the shoulders turns the whole figure into one smooth bell and throws away
    // the only silhouette cue that survives a backlit doorway.
    const geo = new THREE.CylinderGeometry(0.235 * s, 0.4 * s, 1.2 * s, 14, 4, true, Math.PI * 0.2, Math.PI * 1.6);
    lib.registry.track(geo);
    const capeMat = lib.character(0x0a0a0d, 0.85, 0.02);
    // The cape is the only double-sided body part; the cached material is
    // unique to this colour so flipping it here affects nothing else.
    capeMat.side = THREE.DoubleSide;
    cape = new THREE.Mesh(geo, capeMat);
    cape.position.set(0, -0.36 * s, -0.05 * s);
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
    footL: legL.foot, footR: legR.foot,
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
  /** Hip pivot to sole, in metres. The stride solve needs it. */
  private legLength: number;
  private stride: { t0: number; dt: number; table: Float32Array };
  private lastStepRate = 0;
  /** Set by the scene so blaster muzzles can be located in world space. */
  readonly muzzleWorld = new THREE.Vector3();

  constructor(lib: MaterialLibrary, spec: CharacterSpec, options: CharacterOptions) {
    this.joints = buildHumanoid(lib, spec);
    this.group = this.joints.root;
    this.name = spec.name;
    this.options = options;
    this.phase = options.phase ?? 0;
    this.contactRadius = (spec.height ?? 1.82) * 0.44;
    this.legLength = LEG_LENGTH * ((spec.height ?? 1.82) / 1.82);
    this.stride = this.buildStridePhase();
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

    const walkPhase = this.phaseAt(t);
    this.lastStepRate = this.stepsPerSecond(speed);
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
      if (GAITS.has(key.state) || GAITS.has(previous.state)) restoreLegs(j, BLEND_TARGET);
    }

    // A pose that holds the legs still while the path carries the body along is
    // a slide by construction, so any of those get a stride laid over the top.
    if (speed > 0.2 && STRIDE_OVERLAY.has(key.state)) {
      this.overlayStride(walkPhase, speed, fluid);
    }

    // Lying figures pivot about the deck, and a kneel deliberately rests a knee
    // on it, so neither wants its hips set from where its soles are.
    if (key.state !== 'down' && key.state !== 'kneel') this.groundFeet();

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
      // The gait's timing comes from the ground speed, so these differ only in
      // carriage: a march is stiffer than a walk, a run leans further forward.
      case 'walk':
        this.poseLocomotion(walkPhase, speed, 1, fluid);
        break;
      case 'march':
        this.poseLocomotion(walkPhase, speed, 0.85, fluid);
        break;
      case 'run':
        this.poseLocomotion(walkPhase, speed, 1.2, fluid);
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

  /** Steps per second solved for the speed at the last evaluation. */
  get stepRate(): number {
    return this.lastStepRate;
  }

  /** Longest step these legs can take, in metres. */
  get strideReach(): number {
    return 2 * STRIDE_REACH * this.legLength;
  }

  /**
   * Steps per second at a given ground speed.
   *
   * People do not walk faster by taking the same steps quicker; both the rate
   * and the length grow with speed, which is why a single cadence per gait can
   * only ever suit one speed. This is the standard shape - rate rising roughly
   * linearly with speed and saturating at a sprint - scaled so that a longer
   * legged figure steps more slowly, and finally scaled by the figure's own
   * `gait` so Vader can tread heavily and a droid can scurry.
   */
  private stepsPerSecond(speed: number): number {
    const size = this.legLength / LEG_LENGTH;
    return (clamp(1.3 + 0.62 * speed, 1.25, 4.4) / size) * (this.options.gait ?? 1);
  }

  /**
   * Stride phase in radians at `t`, where half a cycle is one step.
   *
   * Cadence has to be free to follow speed, and that rules out the obvious
   * `t * cadence`: the phase would leap by tens of radians whenever the cadence
   * changed, because `t` runs into the hundreds. So the phase is the integral of
   * the cadence, built once from the figure's own path and read back by
   * interpolation. Continuous by construction, still a pure function of time,
   * and still reproducible.
   */
  private phaseAt(t: number): number {
    const { t0, dt, table } = this.stride;
    const offset = (this.options.phase ?? 0) * TAU;
    if (t <= t0) return offset;
    const i = (t - t0) / dt;
    if (i >= table.length - 1) return table[table.length - 1] + offset;
    const k = Math.floor(i);
    return lerp(table[k], table[k + 1], i - k) + offset;
  }

  /** Integrate the cadence across the window in which this figure can move. */
  private buildStridePhase(): { t0: number; dt: number; table: Float32Array } {
    const keys = this.options.path.keys;
    const dt = 0.05;
    const t0 = keys[0].t;
    // Past the last key that differs from the final position the figure is
    // parked for good, so there is nothing left to integrate.
    const final = keys[keys.length - 1].v;
    let tEnd = t0;
    for (let i = keys.length - 1; i >= 0; i--) {
      const v = keys[i].v;
      if (v[0] !== final[0] || v[1] !== final[1] || v[2] !== final[2]) {
        tEnd = keys[Math.min(i + 1, keys.length - 1)].t;
        break;
      }
    }
    const steps = Math.max(1, Math.ceil((tEnd - t0) / dt));
    const table = new Float32Array(steps + 1);
    const vel = new THREE.Vector3();
    let acc = 0;
    for (let i = 0; i < steps; i++) {
      const mid = t0 + (i + 0.5) * dt;
      this.options.path.velocityAt(mid, vel);
      acc += Math.PI * this.stepsPerSecond(Math.hypot(vel.x, vel.z)) * dt;
      table[i + 1] = acc;
    }
    return { t0, dt, table };
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

  private poseLocomotion(p: number, speed: number, carriage: number, fluid: number): void {
    const j = this.joints;
    const legs = this.strideLegs(p, speed);
    const sin = Math.sin(p);

    j.hipL.rotation.x = legs.hipL;
    j.hipR.rotation.x = legs.hipR;
    j.kneeL.rotation.x = legs.kneeL;
    j.kneeR.rotation.x = legs.kneeR;

    j.torso.rotation.x = 0.06 * carriage + Math.abs(sin) * 0.02;
    j.chest.rotation.y = -sin * 0.09 * fluid;
    j.hips.rotation.y = sin * 0.05 * fluid;

    // Arms oppose the leg on the same side, which is what reads as walking
    // rather than as a mannequin being pushed along.
    j.shoulderL.rotation.x = -legs.hipL * 0.95 - 0.1;
    j.shoulderR.rotation.x = -legs.hipR * 0.95 - 0.1;
    j.shoulderL.rotation.z = 0.13;
    j.shoulderR.rotation.z = -0.13;
    j.elbowL.rotation.x = -0.35 - Math.abs(legs.hipR) * 0.3;
    j.elbowR.rotation.x = -0.35 - Math.abs(legs.hipL) * 0.3;
    j.head.rotation.x = -0.03;
  }

  private overlayStride(p: number, speed: number, fluid: number): void {
    const j = this.joints;
    const legs = this.strideLegs(p, speed);
    j.hipL.rotation.x = legs.hipL;
    j.hipR.rotation.x = legs.hipR;
    j.kneeL.rotation.x = legs.kneeL;
    j.kneeR.rotation.x = legs.kneeR;
    j.hips.rotation.y = Math.sin(p) * 0.04 * fluid;
  }

  /**
   * One frame of a walk cycle, solved from the foot rather than from the hip.
   *
   * Swinging the hip through a sine puts the foot's own speed at zero at each
   * end of the stride, so a planted foot has no choice but to skate along with
   * the body there. Instead the stance foot is given a straight, constant-speed
   * sweep backwards over the deck - the body's own speed, so the foot holds
   * still in the world - and the hip angle is whatever puts it there. The swing
   * leg then eases forward and lifts, and the hips ride at whatever height keeps
   * the stance sole exactly on the deck. Each leg is in stance for half the
   * cycle, so the two hand over at a double-support instant with no flight
   * phase to float through.
   *
   * `p` is the integrated stride phase in radians: half a cycle is one step.
   */
  private strideLegs(p: number, speed: number): {
    hipL: number; hipR: number; kneeL: number; kneeR: number;
  } {
    const L = this.legLength;
    // Half a step. Beyond what the legs can reach the figure is travelling
    // faster than its gait can carry it and some slip is unavoidable; the gait
    // harness reports those so the path or the state can be corrected.
    const half = Math.min(STRIDE_REACH * L, speed / (2 * this.stepsPerSecond(speed)));
    // Fade the whole cycle out as the figure comes to rest, or a stationary
    // figure still nominally walking marches on the spot.
    const engage = smoothstep(0, 0.06, half);
    const flex = 0.014 * (L / LEG_LENGTH);

    const cycle = (u: number): { stance: boolean; f: number } => {
      const turns = (((u % TAU) + TAU) % TAU) / Math.PI;
      return turns < 1 ? { stance: true, f: turns } : { stance: false, f: turns - 1 };
    };
    const cl = cycle(p);
    const cr = cycle(p + Math.PI);

    // Stance sweeps the sole straight back at constant speed - the body's own
    // speed, so it holds still over the deck.
    const stanceForward = (f: number): number => half * (1 - 2 * f);
    const front = stanceForward(cl.stance ? cl.f : cr.f);
    // A straight leg reaching `front` ahead of the hip hangs this far below it,
    // which is the hip height that leaves the sole exactly on the deck.
    const rise = Math.sqrt(Math.max(0, L * L - front * front)) - L - flex;

    const solve = (c: { stance: boolean; f: number }): { hip: number; knee: number } => {
      if (c.stance) return this.solveLeg(stanceForward(c.f), L + rise);
      // Swing hands over to stance at the same speed it left it, so the sole
      // never has to stop dead on the deck and skate while it waits.
      const f = c.f;
      const forward = half * (-8 * f * f * f + 12 * f * f - 2 * f - 1);
      const lift = engage * (0.035 + half * 0.2) * Math.sin(Math.PI * f);
      return this.solveLeg(forward, L + rise - lift);
    };

    const l = solve(cl);
    const r = solve(cr);
    return { hipL: l.hip, hipR: r.hip, kneeL: l.knee, kneeR: r.knee };
  }

  /**
   * Set the hip height so that the lower sole rests on the deck.
   *
   * Runs after every pose. A pose that drops the hips further than the legs fold
   * has no choice but to push the boots through the floor, and several did; this
   * makes the leg angles the single authority on how low a figure stands.
   */
  private groundFeet(): void {
    const j = this.joints;
    const size = this.legLength / LEG_LENGTH;
    const thighLen = 0.42 * size;
    const shinLen = 0.445 * size;
    const depth = (hip: number, knee: number): number => thighLen * Math.cos(hip)
      + shinLen * Math.cos(hip + knee);
    const lower = Math.max(
      depth(j.hipL.rotation.x, j.kneeL.rotation.x),
      depth(j.hipR.rotation.x, j.kneeR.rotation.x),
    );
    const baseY = (j.hips.userData.baseY as number | undefined) ?? j.hips.position.y;
    j.hips.position.y = baseY - this.legLength + lower;
  }

  /**
   * Hip and knee rotations that place the sole `forward` metres ahead of the hip
   * pivot and `depth` metres below it.
   *
   * The branch chosen puts the knee ahead of the line from hip to sole, which is
   * how a leg actually folds. Worth stating because in this rig that means a
   * positive knee rotation: negative values, which the static poses use, swing
   * the shin forward and bend the knee backwards.
   */
  private solveLeg(forward: number, depth: number): { hip: number; knee: number } {
    const size = this.legLength / LEG_LENGTH;
    const thighLen = 0.42 * size;
    const shinLen = 0.445 * size;
    const d = clamp(
      Math.hypot(forward, depth),
      Math.abs(thighLen - shinLen) + 1e-3,
      thighLen + shinLen - 1e-4,
    );
    const toSole = Math.atan2(forward, depth);
    const spread = Math.acos(clamp(
      (thighLen * thighLen + d * d - shinLen * shinLen) / (2 * thighLen * d),
      -1,
      1,
    ));
    const thigh = toSole + spread;
    const shin = Math.atan2(
      forward - thighLen * Math.sin(thigh),
      depth - thighLen * Math.cos(thigh),
    );
    return { hip: -thigh, knee: thigh - shin };
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
    // The body pivots about its own origin, which sits on the deck, so tipping it
    // through 81 degrees already lays it flat and lowers it. Subtracting a further
    // 0.86 m on top buried the whole figure, soles included, under the floor. All
    // that is wanted now is enough lift to rest the torso's thickness on the deck.
    j.body.rotation.x = -1.42 * f;
    j.body.position.y = 0.13 * f;
    j.body.position.z = -0.12 * f;
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
    // Drop the hips and fold the legs by matching amounts, or the crouch simply
    // pushes both boots through the deck.
    j.hips.position.y -= 0.2;
    j.torso.rotation.x = 0.34;
    j.chest.rotation.x = 0.2;
    j.head.rotation.x = 0.24;
    j.shoulderL.rotation.x = -1.9 + tremor;
    j.shoulderR.rotation.x = -1.95 - tremor;
    j.shoulderL.rotation.z = 0.55;
    j.shoulderR.rotation.z = -0.55;
    j.elbowL.rotation.x = -1.5;
    j.elbowR.rotation.x = -1.55;
    j.hipL.rotation.x = 0.8;
    j.hipR.rotation.x = 0.72;
    j.kneeL.rotation.x = -1.45;
    j.kneeR.rotation.x = -1.35;
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

/**
 * Hip pivot to sole at full height, in metres: 0.42 down to the knee, 0.4 to the
 * middle of the boot, 0.045 to the sole.
 */
const LEG_LENGTH = 0.865;

/**
 * Furthest a sole may reach from directly under the hip, as a fraction of leg
 * length. Short of 1 so the hip angle never has to approach a right angle; at
 * 0.78 a figure can just cover a hard sprint, which is what the defenders'
 * scramble to their positions demands.
 */
const STRIDE_REACH = 0.78;

/** Poses that leave the legs alone, so a moving figure needs a stride over them. */
const STRIDE_OVERLAY = new Set<CharacterState>([
  'idle', 'alert', 'aim', 'fire', 'react', 'interact', 'look',
]);

/** States whose legs come from the stride solve rather than from a fixed pose. */
const GAITS = new Set<CharacterState>(['walk', 'march', 'run']);

const TAU = Math.PI * 2;

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

/**
 * Put the legs back to the pose the figure is actually in.
 *
 * The stride solves the legs so the planted sole holds still, and averaging that
 * against whatever the previous pose had the legs doing drags the foot across the
 * deck for the length of the cross-fade. The upper body still cross-fades; the
 * legs come straight from the gait, whose amplitude already grows from nothing as
 * the figure gets under way, so nothing snaps.
 */
function restoreLegs(j: Joints, target: JointSnapshot[]): void {
  for (const key of ['hipL', 'hipR', 'kneeL', 'kneeR'] as const) {
    const i = BLEND_ORDER.indexOf(key);
    (j[key] as THREE.Object3D).rotation.copy(target[i].rotation);
  }
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
