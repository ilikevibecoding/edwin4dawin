/**
 * The droids.
 *
 * R2 unit — squat cylindrical body, domed head that rotates independently of
 * the chassis, two articulated side legs plus a retractable centre leg. It
 * moves steadily and purposefully, rocking slightly as it rolls.
 *
 * Protocol droid — a tall, thin, gold-plated humanoid built on the standard
 * rig but deliberately stiff: short stride, almost no torso twist, elbows kept
 * bent, and a nervous head tremor. Its body language is the comic counterpoint
 * to the astromech's steadiness.
 */

import * as THREE from 'three';
import { Figure, HUMAN, type FigureOptions } from './figure';
import { limb, ball, torsoBlock, glove } from './parts';
import { paintMaterial, metalMaterial, emissiveMaterial, glassMaterial, additiveMaterial, PALETTE } from '../assets/materials';
import { roundedBox } from '../assets/geometry';
import { glowSprite } from '../assets/textures';
import { damp, clamp } from '../core/math';
import { Rng } from '../core/rng';

/* ------------------------------------------------------------- astromech */

export class AstroDroid extends Figure {
  readonly chassis = new THREE.Group();
  readonly dome = new THREE.Group();
  /** Anchor the data projection is emitted from. */
  readonly projector = new THREE.Object3D();
  /** Anchor for the data port Leia plugs into. */
  readonly dataPort = new THREE.Object3D();

  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private centreLeg = new THREE.Group();
  private eyeMat: THREE.MeshStandardMaterial;
  private lampMats: THREE.MeshStandardMaterial[] = [];
  private holoBeam: THREE.Mesh;
  private holoMat: THREE.MeshBasicMaterial;

  private domeYaw = 0;
  private domeTarget = 0;
  private scanTimer = 0;
  private tripod = 1;
  private tripodTarget = 1;
  private rollAngle = 0;
  /** Excitement level: raises chirp rate and dome activity. */
  agitation = 0;

  constructor(o: FigureOptions = {}) {
    super({
      ...o,
      proportions: { ...HUMAN, height: 1.06, hipHeight: 0.56, walkSpeed: 1.15, runSpeed: 1.7, stride: 0.4 },
    });
    this.group.name = 'AstroDroid';

    const rng = new Rng(o.seed ?? 'r2');
    const white = paintMaterial('r2White', PALETTE.r2White, 0.34, 0.28);
    const blue = paintMaterial('r2Blue', PALETTE.r2Blue, 0.38, 0.4);
    const silver = metalMaterial('r2Silver', '#a7adb4', 0.32, 0.9);
    const dark = metalMaterial('r2Dark', '#2a2d31', 0.7, 0.5);
    this.eyeMat = emissiveMaterial('r2Eye', '#ff6a4a', 1.6).clone();

    this.group.add(this.chassis);
    this.chassis.position.y = 0.3;

    /* ---- body ---- */
    const bodyR = 0.245;
    const bodyH = 0.56;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 24), white);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    this.chassis.add(body);

    // Vertical blue detail strips and greeble panels.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, bodyH * 0.86, 0.02), i % 2 ? blue : dark);
      strip.position.set(Math.cos(a) * (bodyR + 0.006), bodyH / 2, Math.sin(a) * (bodyR + 0.006));
      strip.rotation.y = -a;
      this.chassis.add(strip);
    }
    for (let i = 0; i < 5; i++) {
      const a = rng.range(0, Math.PI * 2);
      const y = rng.range(0.12, 0.46);
      const panel = new THREE.Mesh(roundedBox(0.09, 0.07, 0.012, 0.008), rng.chance(0.5) ? blue : dark);
      panel.position.set(Math.cos(a) * (bodyR + 0.004), y, Math.sin(a) * (bodyR + 0.004));
      panel.rotation.y = -a;
      this.chassis.add(panel);
    }
    // Front utility panel and the data port.
    const frontPanel = new THREE.Mesh(roundedBox(0.13, 0.1, 0.014, 0.01), silver);
    frontPanel.position.set(0, 0.34, -(bodyR + 0.005));
    this.chassis.add(frontPanel);
    const port = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 10), dark);
    port.rotation.x = Math.PI / 2;
    port.position.set(0, 0.34, -(bodyR + 0.014));
    this.chassis.add(port);
    this.dataPort.position.set(0, 0.34, -(bodyR + 0.06));
    this.chassis.add(this.dataPort);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(bodyR * 1.02, bodyR * 1.02, 0.03, 24), silver);
    collar.position.y = bodyH;
    this.chassis.add(collar);

    /* ---- dome ---- */
    this.dome.position.y = bodyH + 0.015;
    this.chassis.add(this.dome);
    const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(bodyR, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), white);
    domeMesh.scale.y = 0.78;
    domeMesh.castShadow = true;
    this.dome.add(domeMesh);
    // Blue dome segments.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25;
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(bodyR * 1.006, 8, 6, a, 0.34, 0, Math.PI * 0.42),
        blue,
      );
      seg.scale.y = 0.78;
      this.dome.add(seg);
    }
    // Main photoreceptor.
    const eyeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14), silver);
    eyeHousing.rotation.x = Math.PI / 2;
    eyeHousing.position.set(0, 0.075, -bodyR * 0.86);
    this.dome.add(eyeHousing);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), glassMaterial('r2Lens', '#101820', 0.95));
    lens.position.set(0, 0.075, -bodyR * 0.86 - 0.026);
    this.dome.add(lens);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.019, 12), this.eyeMat);
    pupil.position.set(0, 0.075, -bodyR * 0.86 - 0.03);
    this.dome.add(pupil);

    // Small dome lamps.
    for (let i = 0; i < 3; i++) {
      const a = -0.55 + i * 0.55;
      const m = emissiveMaterial(`r2Lamp${i}`, i === 1 ? '#6fd6ff' : '#ffd36a', 1.2).clone();
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), m);
      lamp.position.set(Math.sin(a) * bodyR * 0.72, 0.13, -Math.cos(a) * bodyR * 0.72);
      this.dome.add(lamp);
      this.lampMats.push(m);
    }
    // Holoprojector.
    const holo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 10), silver);
    holo.position.set(-0.09, 0.15, -0.09);
    holo.rotation.set(0.4, 0, -0.3);
    this.dome.add(holo);
    this.projector.position.set(-0.09, 0.18, -0.11);
    this.dome.add(this.projector);

    this.holoMat = additiveMaterial('r2Holo', PALETTE.hologram, 0, glowSprite(0.4)).clone();
    this.holoMat.opacity = 0;
    this.holoBeam = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 12, 1, true), this.holoMat);
    this.holoBeam.position.set(-0.09, 0.4, -0.2);
    this.holoBeam.rotation.x = Math.PI;
    this.holoBeam.visible = false;
    this.dome.add(this.holoBeam);

    /* ---- legs ---- */
    const buildSideLeg = (side: number): THREE.Group => {
      const g = new THREE.Group();
      const shoulder = new THREE.Mesh(roundedBox(0.07, 0.16, 0.19, 0.03), silver);
      shoulder.position.set(side * 0.03, -0.03, 0);
      g.add(shoulder);
      const upper = new THREE.Mesh(roundedBox(0.075, 0.42, 0.15, 0.03), white);
      upper.position.set(side * 0.055, -0.26, 0);
      g.add(upper);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.34, 0.1), blue);
      stripe.position.set(side * 0.095, -0.26, 0);
      g.add(stripe);
      const ankle = new THREE.Mesh(roundedBox(0.08, 0.09, 0.2, 0.03), dark);
      ankle.position.set(side * 0.055, -0.53, -0.01);
      g.add(ankle);
      const footShell = new THREE.Mesh(roundedBox(0.1, 0.11, 0.27, 0.035), white);
      footShell.position.set(side * 0.055, -0.645, -0.015);
      footShell.castShadow = true;
      g.add(footShell);
      for (const z of [-0.085, 0.085]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 12), dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.055, -0.665, z);
        g.add(wheel);
      }
      // Pivot sits just below the body's shoulder line; the leg reaches the floor.
      g.position.set(side * (bodyR + 0.04), 0.42, 0);
      return g;
    };
    this.legL = buildSideLeg(-1);
    this.legR = buildSideLeg(1);
    this.chassis.add(this.legL, this.legR);

    // Retractable centre leg.
    const cUpper = new THREE.Mesh(roundedBox(0.09, 0.3, 0.09, 0.025), white);
    cUpper.position.y = -0.15;
    this.centreLeg.add(cUpper);
    const cFoot = new THREE.Mesh(roundedBox(0.11, 0.09, 0.24, 0.03), dark);
    cFoot.position.set(0, -0.325, -0.02);
    this.centreLeg.add(cFoot);
    const cWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), dark);
    cWheel.rotation.z = Math.PI / 2;
    cWheel.position.set(0, -0.345, -0.06);
    this.centreLeg.add(cWheel);
    this.centreLeg.position.set(0, 0.08, -0.16);
    this.chassis.add(this.centreLeg);
  }

  /** Extend (1) or retract (0) the centre leg. Retracted = two-legged waddle. */
  setTripod(v: number): void {
    this.tripodTarget = clamp(v, 0, 1);
  }

  /** Aim the dome at a world point; pass null to resume idle scanning. */
  setDomeTarget(world: THREE.Vector3 | null): void {
    if (!world) {
      this.domeTarget = NaN;
      return;
    }
    const local = this.chassis.worldToLocal(world.clone());
    this.domeTarget = Math.atan2(local.x, -local.z);
  }

  setProjecting(v: number): void {
    const k = clamp(v, 0, 1);
    this.holoBeam.visible = k > 0.01;
    this.holoMat.opacity = k * 0.35;
  }

  /** The rig's humanoid pose is meaningless here. */
  protected override pose(_elapsed: number): void {}

  protected override poseExtra(dt: number, elapsed: number): void {
    this.tripod = damp(this.tripod, this.tripodTarget, 0.0015, dt);

    // Centre leg extends downward and the chassis tips back as it retracts.
    this.centreLeg.position.y = 0.08 + (1 - this.tripod) * 0.3;
    this.centreLeg.visible = this.tripod > 0.02;
    const tilt = (1 - this.tripod) * 0.2;
    this.chassis.rotation.x = tilt;
    this.chassis.position.y = 0.3 - (1 - this.tripod) * 0.02;

    // Roll: a slight side-to-side rock while moving; wheels spin with distance.
    const moving = this.speed > 0.05;
    this.rollAngle += this.speed * dt * 7;
    const rock = moving ? Math.sin(this.rollAngle * 1.1) * 0.045 * (1 - this.tripod * 0.5) : 0;
    this.chassis.rotation.z = rock;
    this.legL.rotation.z = -rock * 0.5;
    this.legR.rotation.z = -rock * 0.5;

    // Dome: track a target, otherwise scan in slow, deliberate sweeps.
    if (Number.isNaN(this.domeTarget)) {
      this.scanTimer -= dt;
      if (this.scanTimer <= 0) {
        this.scanTimer = 1.6 + this.rng.next() * 2.6 - this.agitation;
        this.domeYawGoal = (this.rng.next() * 2 - 1) * (0.7 + this.agitation * 1.6);
      }
    } else {
      this.domeYawGoal = this.domeTarget;
    }
    this.domeYaw = damp(this.domeYaw, this.domeYawGoal, 0.0009, dt);
    this.dome.rotation.y = this.domeYaw;

    const pulse = 0.5 + 0.5 * Math.sin(elapsed * (2.6 + this.agitation * 5));
    this.eyeMat.emissiveIntensity = 1.1 + pulse * 1.1;
    for (let i = 0; i < this.lampMats.length; i++) {
      this.lampMats[i].emissiveIntensity =
        0.5 + 1.3 * (0.5 + 0.5 * Math.sin(elapsed * (3 + i * 1.7 + this.agitation * 4) + i * 2));
    }
  }

  private domeYawGoal = 0;

  override headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.dome.getWorldPosition(out);
  }
}

/* -------------------------------------------------------- protocol droid */

export class ProtocolDroid extends Figure {
  private plating: THREE.MeshStandardMaterial;
  private eyeMat: THREE.MeshStandardMaterial;
  private fretTimer = 0;
  private tremor = 0;
  /** 0 = composed, 1 = thoroughly alarmed. Drives fidgeting and posture. */
  anxiety = 0.5;

  constructor(o: FigureOptions = {}) {
    super({
      ...o,
      proportions: {
        ...HUMAN,
        height: 1.71,
        hipHeight: 0.9,
        thigh: 0.42,
        shin: 0.42,
        spine: 0.26,
        chest: 0.24,
        shoulderWidth: 0.175,
        upperArm: 0.28,
        forearm: 0.26,
        // Short steps: the protocol droid never strides.
        stride: 0.42,
        walkSpeed: 0.95,
        runSpeed: 1.5,
        ...(o.proportions ?? {}),
      },
      tempo: 1.3,
    });
    this.group.name = 'ProtocolDroid';
    const j = this.joints;
    const p = this.p;

    // Brushed rather than mirror-polished: a mirror finish blows out under
    // any strong key light and loses all of the form.
    this.plating = new THREE.MeshStandardMaterial({
      color: PALETTE.goldDroid,
      roughness: 0.36,
      metalness: 0.88,
    });
    const jointMat = metalMaterial('c3poJoint', '#5c5346', 0.55, 0.85);
    const wire = metalMaterial('c3poWire', '#2b2721', 0.8, 0.5);
    this.eyeMat = emissiveMaterial('c3poEye', '#fff0c0', 1.5).clone();

    // Torso: chest shell, exposed midriff wiring, hip shell.
    const chestShell = new THREE.Mesh(roundedBox(0.3, 0.29, 0.19, 0.075, 3), this.plating);
    chestShell.position.y = 0.13;
    chestShell.castShadow = true;
    j.chest.add(chestShell);
    const midriff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.16, 12), wire);
    midriff.position.y = 0.09;
    j.spine.add(midriff);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 5), wire);
      cable.position.set(Math.cos(a) * 0.1, 0.09, Math.sin(a) * 0.1);
      j.spine.add(cable);
    }
    const hipShell = new THREE.Mesh(roundedBox(0.27, 0.18, 0.19, 0.06), this.plating);
    hipShell.position.y = -0.01;
    j.pelvis.add(hipShell);
    const neckPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 10), jointMat);
    neckPost.position.y = 0.02;
    j.neck.add(neckPost);

    // Head: the most recognisable part — round eyes, mouth grille, side vents.
    const skull = new THREE.Mesh(roundedBox(0.155, 0.185, 0.155, 0.07, 4), this.plating);
    skull.position.y = 0.095;
    skull.castShadow = true;
    j.head.add(skull);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.079, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.5), this.plating);
    crown.position.y = 0.165;
    crown.scale.set(1.02, 0.72, 1.02);
    j.head.add(crown);
    const faceplate = new THREE.Mesh(roundedBox(0.13, 0.15, 0.03, 0.02), this.plating);
    faceplate.position.set(0, 0.1, -0.076);
    j.head.add(faceplate);
    for (const s of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.028, 14), jointMat);
      socket.rotation.x = Math.PI / 2;
      socket.position.set(s * 0.04, 0.135, -0.088);
      j.head.add(socket);
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.021, 14), this.eyeMat);
      eye.position.set(s * 0.04, 0.135, -0.104);
      j.head.add(eye);
    }
    // Mouth grille.
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.036, 0.008), jointMat);
      bar.position.set(-0.024 + i * 0.012, 0.062, -0.09);
      j.head.add(bar);
    }
    // Side "ear" vents.
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(roundedBox(0.022, 0.06, 0.05, 0.012), jointMat);
      ear.position.set(s * 0.082, 0.1, -0.005);
      j.head.add(ear);
    }
    const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.055, 10), jointMat);
    neckCol.position.y = -0.005;
    j.head.add(neckCol);

    // Thin limbs with visible joints — the "assembled from parts" read.
    for (const side of [-1, 1] as const) {
      const upper = side < 0 ? j.upperArmL : j.upperArmR;
      const fore = side < 0 ? j.forearmL : j.forearmR;
      const hand = side < 0 ? j.handL : j.handR;
      upper.add(ball(0.05, this.plating));
      upper.add(limb(p.upperArm * 0.9, 0.033, 0.028, this.plating));
      upper.add(ball(0.032, jointMat, -p.upperArm));
      fore.add(limb(p.forearm * 0.9, 0.03, 0.026, this.plating));
      hand.add(glove(this.plating, 0.85));

      const thigh = side < 0 ? j.thighL : j.thighR;
      const shin = side < 0 ? j.shinL : j.shinR;
      const foot = side < 0 ? j.footL : j.footR;
      thigh.add(limb(p.thigh * 0.92, 0.055, 0.042, this.plating));
      thigh.add(ball(0.042, jointMat, -p.thigh));
      shin.add(limb(p.shin * 0.92, 0.042, 0.034, this.plating));
      const footShell = new THREE.Mesh(roundedBox(0.085, 0.055, 0.2, 0.025), this.plating);
      footShell.position.set(0, 0.028, -0.035);
      foot.add(footShell);
    }

    void torsoBlock; // torso is bespoke here
  }

  protected override poseExtra(dt: number, elapsed: number): void {
    const j = this.joints;

    // Stiffness: cancel most of the natural torso counter-rotation.
    j.pelvis.rotation.y *= 0.25;
    j.spine.rotation.y *= 0.2;
    j.chest.rotation.y *= 0.2;
    j.spine.rotation.x = j.spine.rotation.x * 0.5 + 0.07;

    // Elbows stay bent, forearms held out — the signature protocol-droid pose.
    if (this.state !== 'cower' && this.state !== 'fall' && this.state !== 'down') {
      j.forearmL.rotation.x = Math.max(j.forearmL.rotation.x, 0.85);
      j.forearmR.rotation.x = Math.max(j.forearmR.rotation.x, 0.85);
      j.upperArmL.rotation.z = -0.24;
      j.upperArmR.rotation.z = 0.24;
      j.upperArmL.rotation.x *= 0.55;
      j.upperArmR.rotation.x *= 0.55;
    }

    // Anxiety: an occasional flinch and a constant low tremor.
    this.fretTimer -= dt;
    if (this.fretTimer <= 0) {
      this.fretTimer = 1.2 + this.rng.next() * 2.4 - this.anxiety;
      this.tremor = this.anxiety;
    }
    this.tremor = Math.max(0, this.tremor - dt * 0.9);
    const shiver = Math.sin(elapsed * 17) * 0.02 * this.anxiety + this.tremor * Math.sin(elapsed * 24) * 0.05;
    j.head.rotation.y += shiver;
    j.head.rotation.x += Math.sin(elapsed * 13) * 0.012 * this.anxiety;
    j.chest.rotation.z += shiver * 0.4;
    if (this.anxiety > 0.6 && !this.isMoving) {
      // Wringing hands.
      j.upperArmL.rotation.x = 1.0 + Math.sin(elapsed * 3.1) * 0.08;
      j.upperArmR.rotation.x = 1.0 - Math.sin(elapsed * 3.1) * 0.08;
      j.forearmL.rotation.x = 1.35;
      j.forearmR.rotation.x = 1.35;
      j.upperArmL.rotation.z = -0.42;
      j.upperArmR.rotation.z = 0.42;
    }

    this.eyeMat.emissiveIntensity = 1.2 + 0.5 * (0.5 + 0.5 * Math.sin(elapsed * 2.2));
    void clamp;
  }
}
