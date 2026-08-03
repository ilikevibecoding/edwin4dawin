import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { attach, boot, limb, plate } from './parts';
import { box, cyl, merge, sphere, torus } from '../geometry';
import { CHAR_MATS, emissive } from '../materials';
import { clamp01, damp, TAU } from '../../core/math';
import { freshRng } from '../../core/Random';

/**
 * Astromech unit.
 *
 * It ignores the humanoid pose solver entirely and drives its own three-legged
 * body: a rolling waddle, a dome that scans independently of travel direction,
 * and a projector that the plans hologram is parented to.
 */
export class Astromech extends CharacterRig {
  readonly dome = new THREE.Group();
  readonly projector = new THREE.Object3D();
  readonly bodyGroup = new THREE.Group();

  private legL: THREE.Group;
  private legR: THREE.Group;
  private centreLeg: THREE.Group;
  private eyeLens: THREE.Mesh;
  private eyeLight: THREE.PointLight;
  private panelLights: THREE.Mesh;
  private domeTargetYaw = 0;
  private domeYaw = 0;
  private wobble = 0;
  private centreLegAmount = 1;
  /** Height of the body origin above the deck. */
  readonly bodyHeight = 0.62;

  constructor(seed = 0) {
    super(
      'R2 Astromech Unit',
      'A stubby three-legged repair droid. Carries the stolen readouts in its data core and never once considers surrendering them.',
      { hipHeight: 0.62, stiffness: 0, strideLength: 0.5 },
      seed,
    );
    // Hide the unused humanoid armature.
    this.joints.body.visible = false;

    const white = CHAR_MATS.droidWhite();
    const blue = CHAR_MATS.droidBlue();
    const silver = CHAR_MATS.droidSilver();
    const dark = CHAR_MATS.trooperUnder();

    this.root.add(this.bodyGroup);
    this.bodyGroup.position.y = this.bodyHeight;

    const R = 0.29;
    const H = 0.62;
    // Barrel body.
    const barrel = new THREE.Mesh(
      merge([
        cyl(R, R, H, 20, { pos: [0, 0, 0] }),
        torus(R * 1.01, 0.018, { pos: [0, H * 0.32, 0], rot: [Math.PI / 2, 0, 0] }, 6, 22),
        torus(R * 1.01, 0.018, { pos: [0, -H * 0.28, 0], rot: [Math.PI / 2, 0, 0] }, 6, 22),
      ]),
      white,
    );
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    this.bodyGroup.add(barrel);

    // Blue panel blocking: the signature colour read.
    const panels: THREE.BufferGeometry[] = [];
    const rng = freshRng('astromech-panels');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      const w = 0.15;
      panels.push(
        box(w, 0.16, 0.03, {
          pos: [Math.cos(a) * (R + 0.005), rng.range(-0.12, 0.16), Math.sin(a) * (R + 0.005)],
          rot: [0, -a + Math.PI / 2, 0],
        }),
      );
    }
    panels.push(
      box(0.2, 0.12, 0.03, { pos: [0, -0.05, R + 0.005] }),
      box(0.09, 0.09, 0.03, { pos: [0.15, 0.14, R + 0.005] }),
    );
    attach(this.bodyGroup, merge(panels), blue, 'bodyPanels');

    // Front detail: data port, vents, utility arms.
    attach(
      this.bodyGroup,
      merge([
        box(0.16, 0.09, 0.035, { pos: [0, 0.1, R + 0.008] }),
        box(0.05, 0.05, 0.05, { pos: [-0.13, -0.16, R - 0.02] }),
        box(0.05, 0.05, 0.05, { pos: [0.13, -0.16, R - 0.02] }),
        cyl(0.03, 0.03, 0.1, 8, { pos: [0, -0.2, R * 0.5], rot: [Math.PI / 2, 0, 0] }),
      ]),
      silver,
      'frontDetail',
    );

    this.panelLights = new THREE.Mesh(
      merge([
        box(0.03, 0.02, 0.01, { pos: [-0.05, 0.1, R + 0.026] }),
        box(0.03, 0.02, 0.01, { pos: [0.0, 0.1, R + 0.026] }),
        box(0.03, 0.02, 0.01, { pos: [0.05, 0.1, R + 0.026] }),
      ]),
      emissive('r2Panel', 0x6cff9a, 2.4),
    );
    this.bodyGroup.add(this.panelLights);

    // Dome.
    this.dome.position.y = H * 0.5;
    this.bodyGroup.add(this.dome);
    const domeGeo = new THREE.SphereGeometry(R * 1.005, 20, 12, 0, TAU, 0, Math.PI * 0.5);
    const domeMesh = new THREE.Mesh(domeGeo, white);
    domeMesh.castShadow = true;
    this.dome.add(domeMesh);
    attach(
      this.dome,
      merge([
        // Radial dome panels.
        box(0.1, 0.02, 0.14, { pos: [0.11, 0.14, 0.11], rot: [0, -0.8, 0.4] }),
        box(0.1, 0.02, 0.14, { pos: [-0.11, 0.14, 0.11], rot: [0, 0.8, -0.4] }),
        box(0.16, 0.02, 0.1, { pos: [0, 0.19, -0.14], rot: [0.5, 0, 0] }),
        cyl(0.05, 0.05, 0.03, 10, { pos: [0, 0.288, 0] }),
      ]),
      blue,
      'domePanels',
    );
    // Radar eye + holoprojector.
    attach(
      this.dome,
      merge([
        cyl(0.055, 0.06, 0.06, 12, { pos: [0, 0.1, R * 0.82], rot: [Math.PI / 2, 0, 0] }),
        cyl(0.028, 0.028, 0.05, 10, { pos: [0.11, 0.16, R * 0.6], rot: [Math.PI / 2 - 0.4, 0, 0] }),
        box(0.05, 0.04, 0.03, { pos: [-0.12, 0.15, R * 0.62] }),
      ]),
      silver,
      'domeSensors',
    );
    this.eyeLens = new THREE.Mesh(
      cyl(0.036, 0.036, 0.02, 12, { pos: [0, 0.1, R * 0.86], rot: [Math.PI / 2, 0, 0] }),
      emissive('r2Eye', 0xff5a3a, 2.2),
    );
    this.dome.add(this.eyeLens);
    this.eyeLight = new THREE.PointLight(0xff6a4a, 0.6, 2.2, 2);
    this.eyeLight.position.set(0, 0.1, R * 0.95);
    this.dome.add(this.eyeLight);

    this.projector.position.set(0.11, 0.2, R * 0.62);
    this.dome.add(this.projector);

    // Legs.
    const makeLeg = (side: number): THREE.Group => {
      const g = new THREE.Group();
      g.position.set(side * (R + 0.055), 0.08, 0);
      const shoulder = new THREE.Mesh(
        merge([
          box(0.11, 0.2, 0.16, { pos: [0, -0.04, 0] }),
          box(0.09, 0.34, 0.13, { pos: [0, -0.24, 0.01] }),
        ]),
        white,
      );
      shoulder.castShadow = true;
      g.add(shoulder);
      const foot = new THREE.Mesh(
        merge([
          box(0.15, 0.11, 0.3, { pos: [0, -0.48, 0.02] }),
          cyl(0.055, 0.055, 0.05, 10, { pos: [0, -0.55, 0.1], rot: [0, 0, Math.PI / 2] }),
          cyl(0.055, 0.055, 0.05, 10, { pos: [0, -0.55, -0.06], rot: [0, 0, Math.PI / 2] }),
        ]),
        silver,
      );
      foot.castShadow = true;
      g.add(foot);
      const stripe = new THREE.Mesh(box(0.1, 0.06, 0.14, { pos: [0, -0.14, 0.01] }), blue);
      g.add(stripe);
      this.bodyGroup.add(g);
      return g;
    };
    this.legL = makeLeg(1);
    this.legR = makeLeg(-1);

    this.centreLeg = new THREE.Group();
    this.centreLeg.position.set(0, -0.12, R * 0.5);
    const centreShaft = new THREE.Mesh(
      merge([
        box(0.13, 0.4, 0.12, { pos: [0, -0.2, 0] }),
        box(0.15, 0.1, 0.28, { pos: [0, -0.42, 0.04] }),
        cyl(0.05, 0.05, 0.05, 10, { pos: [0, -0.47, 0.12], rot: [0, 0, Math.PI / 2] }),
      ]),
      white,
    );
    centreShaft.castShadow = true;
    this.centreLeg.add(centreShaft);
    attach(this.centreLeg, box(0.09, 0.05, 0.1, { pos: [0, -0.06, 0] }), dark, 'centreHousing');
    this.bodyGroup.add(this.centreLeg);
  }

  /** 0 = two-legged tall stance, 1 = tripod stance. */
  setTripod(v: number): void {
    this.centreLegAmount = clamp01(v);
  }

  /** Point the dome at a world position. */
  lookDomeAt(point: THREE.Vector3): void {
    const local = point.clone();
    this.root.updateWorldMatrix(true, false);
    local.applyMatrix4(new THREE.Matrix4().copy(this.root.matrixWorld).invert());
    this.domeTargetYaw = Math.atan2(local.x, local.z);
  }

  setDomeYaw(rad: number): void {
    this.domeTargetYaw = rad;
  }

  protected override evaluatePose(dt: number, elapsed: number): void {
    // Waddle: roll side to side in step with travel.
    const moving = this.speed > 0.05;
    if (moving) this.cyclePhase = (this.cyclePhase + (this.speed * dt) / 0.42) % 1;
    const amp = clamp01(this.speed / 1.3);
    this.wobble = damp(this.wobble, moving ? 1 : 0, 0.25, dt);
    const ph = this.cyclePhase * TAU;

    this.bodyGroup.rotation.z = Math.sin(ph) * 0.16 * amp * this.wobble;
    this.bodyGroup.rotation.x = 0.05 * amp * this.wobble + Math.sin(ph * 2) * 0.03 * amp;
    // The centre leg extends downward, so deploying it lifts the barrel.
    this.bodyGroup.position.y =
      this.bodyHeight + Math.abs(Math.sin(ph)) * 0.022 * amp + this.centreLegAmount * 0.045;

    this.legL.rotation.x = Math.sin(ph) * 0.12 * amp;
    this.legR.rotation.x = -Math.sin(ph) * 0.12 * amp;

    this.centreLeg.visible = this.centreLegAmount > 0.02;
    this.centreLeg.scale.y = Math.max(0.02, this.centreLegAmount);
    this.centreLeg.rotation.x = -0.06 - Math.sin(ph) * 0.05 * amp;

    // Dome scanning.
    let delta = this.domeTargetYaw - this.domeYaw;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    this.domeYaw += delta * (1 - Math.exp(-dt / 0.28));
    this.dome.rotation.y = this.domeYaw + (moving ? 0 : Math.sin(elapsed * 0.5 + this.seedPhase) * 0.3);

    const blink = 0.6 + 0.4 * Math.sin(elapsed * 3.1 + this.seedPhase);
    (this.eyeLens.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + blink;
    this.eyeLight.intensity = 0.4 + blink * 0.5;
    (this.panelLights.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.6 + 1.2 * Math.max(0, Math.sin(elapsed * 7.3 + this.seedPhase));
  }

  override eyePosition(out: THREE.Vector3): THREE.Vector3 {
    this.dome.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.dome.matrixWorld).add(new THREE.Vector3(0, 0.1, 0));
  }
}

/**
 * Protocol droid.
 *
 * Uses the humanoid solver but with heavy stiffness, short strides and
 * permanently bent elbows, plus an anxiety tremor that rises under stress.
 */
export class ProtocolDroid extends CharacterRig {
  private eyes: THREE.Mesh;
  private anxiety = 0.35;
  private tremorPhase = 0;

  constructor(seed = 0) {
    super(
      'Protocol Droid',
      'A gold-plated translator built for etiquette, not for boarding actions. Complains continuously and follows the astromech anyway.',
      {
        hipHeight: 0.93,
        thigh: 0.42,
        shin: 0.41,
        ankle: 0.09,
        spine: 0.48,
        shoulderWidth: 0.19,
        headRadius: 0.115,
        upperArm: 0.28,
        foreArm: 0.26,
        stiffness: 0.42,
        strideLength: 0.58,
      },
      seed,
    );
    const j = this.joints;
    const gold = CHAR_MATS.droidGold();
    const goldDark = CHAR_MATS.droidGoldDark();
    const dark = CHAR_MATS.trooperUnder();

    // Plated torso with an exposed wiring waist.
    attach(
      j.hips,
      merge([
        box(0.26, 0.16, 0.18, { pos: [0, -0.02, 0] }),
        cyl(0.13, 0.12, 0.12, 12, { pos: [0, 0.06, 0] }),
      ]),
      goldDark,
      'pelvis',
    );
    const wires: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      wires.push(
        cyl(0.011, 0.011, 0.15, 5, { pos: [Math.cos(a) * 0.085, 0.14, Math.sin(a) * 0.075] }),
      );
    }
    attach(j.hips, merge(wires), dark, 'waistWiring');

    attach(
      j.chest,
      merge([
        box(0.32, 0.36, 0.21, { pos: [0, 0.26, 0] }),
        cyl(0.16, 0.15, 0.3, 14, { pos: [0, 0.26, 0] }),
        box(0.38, 0.1, 0.2, { pos: [0, 0.42, 0] }),
        box(0.13, 0.13, 0.05, { pos: [0, 0.3, 0.11] }),
        box(0.06, 0.06, 0.04, { pos: [0.09, 0.16, 0.11] }),
      ]),
      gold,
      'torso',
    );
    attach(
      j.chest,
      merge([box(0.1, 0.07, 0.04, { pos: [0, 0.31, 0.13] })]),
      dark,
      'chestPort',
    );
    attach(j.neck, cyl(0.045, 0.05, 0.1, 10, { pos: [0, -0.02, 0] }), goldDark, 'neck');

    for (const side of ['L', 'R'] as const) {
      const shoulder = side === 'L' ? j.shoulderL : j.shoulderR;
      const elbow = side === 'L' ? j.elbowL : j.elbowR;
      const hand = side === 'L' ? j.handL : j.handR;
      attach(shoulder, sphere(0.072, 10, 8), goldDark, `shoulderBall${side}`);
      attach(shoulder, limb(0.05, this.p.upperArm, 0.95), gold, `upperArm${side}`);
      attach(elbow, sphere(0.05, 8, 6), goldDark, `elbowBall${side}`);
      attach(elbow, limb(0.045, this.p.foreArm, 0.92), gold, `foreArm${side}`);
      attach(
        hand,
        merge([
          box(0.07, 0.09, 0.05, { pos: [0, -0.04, 0.005] }),
          box(0.02, 0.06, 0.02, { pos: [0.02, -0.1, 0.01] }),
          box(0.02, 0.06, 0.02, { pos: [-0.005, -0.105, 0.01] }),
          box(0.02, 0.05, 0.02, { pos: [-0.03, -0.095, 0.01] }),
        ]),
        gold,
        `hand${side}`,
      );
    }

    for (const side of ['L', 'R'] as const) {
      const hip = side === 'L' ? j.hipL : j.hipR;
      const knee = side === 'L' ? j.kneeL : j.kneeR;
      const ankle = side === 'L' ? j.ankleL : j.ankleR;
      attach(hip, sphere(0.075, 10, 8), goldDark, `hipBall${side}`);
      attach(hip, limb(0.058, this.p.thigh, 0.9), gold, `thigh${side}`);
      attach(hip, plate(0.058, 0.06, 0.34, 1.14), goldDark, `thighPlate${side}`);
      attach(knee, sphere(0.05, 8, 6), goldDark, `kneeBall${side}`);
      attach(knee, limb(0.05, this.p.shin, 0.88), gold, `shin${side}`);
      attach(ankle, boot(1.05), goldDark, `foot${side}`);
    }

    // Head: flat faceplate, big round optics, slotted mouth.
    attach(
      j.head,
      merge([
        sphere(0.115, 16, 12, { pos: [0, 0.01, 0], scale: [1, 1.12, 1.02] }),
        box(0.17, 0.15, 0.06, { pos: [0, 0.0, 0.085] }),
        box(0.05, 0.09, 0.05, { pos: [0.115, 0.0, 0.0] }),
        box(0.05, 0.09, 0.05, { pos: [-0.115, 0.0, 0.0] }),
        box(0.1, 0.03, 0.05, { pos: [0, 0.105, 0.075] }),
      ]),
      gold,
      'head',
    );
    attach(
      j.head,
      merge([
        cyl(0.038, 0.038, 0.03, 12, { pos: [0.048, 0.028, 0.108], rot: [Math.PI / 2, 0, 0] }),
        cyl(0.038, 0.038, 0.03, 12, { pos: [-0.048, 0.028, 0.108], rot: [Math.PI / 2, 0, 0] }),
        box(0.09, 0.035, 0.03, { pos: [0, -0.06, 0.1] }),
        box(0.014, 0.05, 0.03, { pos: [0.03, -0.03, 0.105] }),
        box(0.014, 0.05, 0.03, { pos: [-0.03, -0.03, 0.105] }),
      ]),
      dark,
      'face',
    );
    this.eyes = new THREE.Mesh(
      merge([
        cyl(0.027, 0.027, 0.012, 12, { pos: [0.048, 0.028, 0.122], rot: [Math.PI / 2, 0, 0] }),
        cyl(0.027, 0.027, 0.012, 12, { pos: [-0.048, 0.028, 0.122], rot: [Math.PI / 2, 0, 0] }),
      ]),
      emissive('c3poEyes', 0xfff0b0, 2.6),
    );
    j.head.add(this.eyes);
  }

  /** 0 = composed, 1 = wringing hands and shaking. */
  setAnxiety(v: number): void {
    this.anxiety = clamp01(v);
  }

  protected override onUpdate(dt: number, elapsed: number): void {
    this.tremorPhase += dt * (5 + this.anxiety * 9);
    const tremor = Math.sin(this.tremorPhase) * 0.014 * this.anxiety;
    this.joints.chest.rotation.z += tremor;
    this.joints.head.rotation.z += tremor * 1.6;
    this.joints.head.rotation.y += Math.sin(elapsed * 1.9 + this.seedPhase) * 0.18 * this.anxiety;
    // Elbows never fully straighten.
    this.joints.elbowL.rotation.x = Math.max(0.55, this.joints.elbowL.rotation.x);
    this.joints.elbowR.rotation.x = Math.max(0.55, this.joints.elbowR.rotation.x);
    this.joints.shoulderL.rotation.z += 0.16 * this.anxiety;
    this.joints.shoulderR.rotation.z -= 0.16 * this.anxiety;
    (this.eyes.material as THREE.MeshStandardMaterial).emissiveIntensity =
      2.2 + 0.6 * Math.sin(elapsed * 2.2);
  }
}
