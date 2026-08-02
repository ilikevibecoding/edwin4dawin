import * as THREE from 'three';
import type { MaterialLibrary } from '../materials';
import { PALETTE } from '../materials';
import { clamp, saturate, smoothstep } from '../../core/mathx';
import { fbm1 } from '../../core/Rng';
import { VectorTrack } from '../../timeline/tracks';
import { Character, type CharacterOptions } from './CharacterRig';

/**
 * The two droids.
 *
 * Their contrast is the point of the escape sequence: the astromech rolls in a
 * straight line at a constant rate and never hesitates; the protocol droid
 * walks with locked knees, over-corrects, and keeps looking behind him.
 */

export interface AstromechStates {
  /** Time ranges during which the dome scans left and right. */
  scanning?: Array<[number, number]>;
  /** Times at which the holoprojector / data port is active. */
  projecting?: Array<[number, number]>;
}

export class Astromech {
  readonly group = new THREE.Group();
  readonly dome: THREE.Group;
  readonly body: THREE.Group;
  readonly legs: THREE.Object3D[] = [];
  readonly anchors: Record<string, THREE.Object3D> = {};
  private path: VectorTrack;
  private states: AstromechStates;
  private eyeMat: THREE.MeshBasicMaterial;
  private portMat: THREE.MeshBasicMaterial;
  private radius = 0.34;

  constructor(lib: MaterialLibrary, path: VectorTrack, states: AstromechStates = {}) {
    this.path = path;
    this.states = states;
    this.group.name = 'character:R2 unit';

    const white = lib.character(PALETTE.r2White, 0.42, 0.35);
    const blue = lib.character(PALETTE.r2Blue, 0.4, 0.45);
    const dark = lib.character(0x24262b, 0.5, 0.5);
    const silver = lib.character(0x9aa0a8, 0.35, 0.75);

    this.body = new THREE.Group();
    this.body.position.y = 0.52;
    this.group.add(this.body);

    const shellGeo = new THREE.CylinderGeometry(this.radius, this.radius, 0.72, 18, 1);
    lib.registry.track(shellGeo);
    const shell = new THREE.Mesh(shellGeo, white);
    shell.castShadow = shell.receiveShadow = true;
    this.body.add(shell);

    // Blue detail bands and panels.
    for (const [y, h, r] of [[0.3, 0.09, this.radius + 0.008], [-0.1, 0.06, this.radius + 0.006]] as const) {
      const g = new THREE.CylinderGeometry(r, r, h, 18, 1, true);
      lib.registry.track(g);
      const m = new THREE.Mesh(g, blue);
      m.material.side = THREE.DoubleSide;
      m.position.y = y;
      this.body.add(m);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.35;
      const g = new THREE.BoxGeometry(0.13, 0.2, 0.03);
      lib.registry.track(g);
      const m = new THREE.Mesh(g, i % 2 ? blue : dark);
      m.position.set(Math.sin(a) * (this.radius + 0.005), 0.06, Math.cos(a) * (this.radius + 0.005));
      m.rotation.y = a;
      this.body.add(m);
    }

    // Dome.
    this.dome = new THREE.Group();
    this.dome.position.y = 0.36;
    this.body.add(this.dome);
    const domeGeo = new THREE.SphereGeometry(this.radius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    lib.registry.track(domeGeo);
    const domeMesh = new THREE.Mesh(domeGeo, white);
    domeMesh.castShadow = true;
    this.dome.add(domeMesh);

    const eyeHousingGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12);
    eyeHousingGeo.rotateX(Math.PI / 2);
    lib.registry.track(eyeHousingGeo);
    const eyeHousing = new THREE.Mesh(eyeHousingGeo, dark);
    eyeHousing.position.set(0, 0.11, this.radius - 0.03);
    this.dome.add(eyeHousing);

    const eyeGeo = new THREE.CircleGeometry(0.048, 12);
    lib.registry.track(eyeGeo);
    this.eyeMat = lib.energy(0x6fd8ff);
    const eye = new THREE.Mesh(eyeGeo, this.eyeMat);
    eye.position.set(0, 0.11, this.radius + 0.001);
    this.dome.add(eye);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.07, 0.045, 0.04);
      lib.registry.track(g);
      const m = new THREE.Mesh(g, i % 2 ? blue : silver);
      m.position.set(Math.sin(a) * 0.27, 0.16, Math.cos(a) * 0.27);
      m.rotation.y = a;
      this.dome.add(m);
    }
    const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10);
    lib.registry.track(capGeo);
    const cap = new THREE.Mesh(capGeo, silver);
    cap.position.y = 0.33;
    this.dome.add(cap);

    // Legs: two side legs plus a centre foot.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * (this.radius + 0.04), 0.1, 0);
      const upperGeo = new THREE.BoxGeometry(0.13, 0.42, 0.24);
      lib.registry.track(upperGeo);
      const upper = new THREE.Mesh(upperGeo, silver);
      upper.position.y = -0.16;
      upper.castShadow = true;
      leg.add(upper);
      const footGeo = new THREE.BoxGeometry(0.19, 0.16, 0.4);
      lib.registry.track(footGeo);
      const foot = new THREE.Mesh(footGeo, dark);
      foot.position.set(0, -0.44, 0.02);
      foot.castShadow = true;
      leg.add(foot);
      this.body.add(leg);
      this.legs.push(leg);
    }
    const centreLeg = new THREE.Group();
    const clGeo = new THREE.BoxGeometry(0.14, 0.4, 0.16);
    lib.registry.track(clGeo);
    const cl = new THREE.Mesh(clGeo, silver);
    cl.position.set(0, -0.2, -0.02);
    centreLeg.add(cl);
    const cfGeo = new THREE.BoxGeometry(0.17, 0.13, 0.3);
    lib.registry.track(cfGeo);
    const cf = new THREE.Mesh(cfGeo, dark);
    cf.position.set(0, -0.44, 0.02);
    centreLeg.add(cf);
    centreLeg.position.set(0, 0.1, -this.radius - 0.02);
    this.body.add(centreLeg);
    this.legs.push(centreLeg);

    // Data port on the dome shoulder - glows during the transfer.
    const portGeo = new THREE.BoxGeometry(0.1, 0.02, 0.1);
    lib.registry.track(portGeo);
    this.portMat = lib.energy(0x8fe8ff, 0.9);
    const port = new THREE.Mesh(portGeo, this.portMat);
    port.position.set(0.14, 0.3, 0.1);
    this.dome.add(port);

    const proj = new THREE.Object3D();
    proj.position.set(0, 0.58, 0.2);
    this.body.add(proj);
    this.anchors.projector = proj;
    const dataPort = new THREE.Object3D();
    dataPort.position.set(0.2, 0.5, 0.16);
    this.body.add(dataPort);
    this.anchors.dataPort = dataPort;
  }

  private isIn(ranges: Array<[number, number]> | undefined, t: number): boolean {
    if (!ranges) return false;
    return ranges.some(([a, b]) => t >= a && t <= b);
  }

  update(t: number): void {
    const pos = this.path.at(t);
    this.group.position.copy(pos);
    const vel = this.path.velocityAt(t);
    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.05) this.group.rotation.y = Math.atan2(vel.x, vel.z);

    // Rolling: body rocks slightly fore/aft, legs counter-rotate.
    const roll = speed > 0.05 ? Math.sin(t * 9) * 0.03 : 0;
    this.body.rotation.x = clamp(speed * 0.045, 0, 0.14) + roll;
    this.body.position.y = 0.52 + Math.abs(Math.sin(t * 7.5)) * (speed > 0.05 ? 0.012 : 0.002);

    // The astromech's head turns with intent - never randomly.
    const scanning = this.isIn(this.states.scanning, t);
    const targetYaw = scanning ? Math.sin(t * 0.9) * 1.1 : clamp(-this.group.rotation.y * 0, -1, 1);
    this.dome.rotation.y = targetYaw + fbm1(t * 0.4) * 0.05;

    const projecting = this.isIn(this.states.projecting, t);
    this.eyeMat.color.setRGB(0.4, 0.82, 1).multiplyScalar(projecting ? 1.4 : 0.9 + Math.sin(t * 3.3) * 0.1);
    this.portMat.opacity = projecting ? 0.9 : 0.15;
  }
}

/**
 * Protocol droid. Uses the shared humanoid rig with stiffness dialled down and
 * a permanent nervous overlay so his body language contrasts with the astromech.
 */
export class ProtocolDroid {
  readonly character: Character;
  readonly group: THREE.Group;
  private plateMat: THREE.MeshStandardMaterial;

  constructor(lib: MaterialLibrary, options: CharacterOptions) {
    this.character = new Character(lib, {
      name: 'Protocol droid',
      height: 1.76,
      bulk: 0.92,
      helmet: 'none',
      weapon: 'none',
      roughness: 0.24,
      metalness: 0.92,
      colors: {
        head: PALETTE.goldDroid,
        torso: PALETTE.goldDroid,
        arms: 0xc79a26,
        legs: PALETTE.goldDroid,
        belt: 0x8a6a18,
        accent: 0xb8891f,
      },
    }, { ...options, fluidity: 0.25, gait: 0.82 });
    this.group = this.character.group;
    this.plateMat = lib.character(PALETTE.goldDroid, 0.24, 0.92);

    // Photoreceptors and a chest control plate turn the rig into a droid.
    const head = this.character.joints.head;
    for (const side of [-1, 1]) {
      const g = new THREE.SphereGeometry(0.032, 10, 8);
      lib.registry.track(g);
      const m = new THREE.Mesh(g, lib.energy(0xfff0c0));
      m.position.set(side * 0.042, 0.02, 0.078);
      head.add(m);
      const ring = new THREE.Mesh(
        lib.registry.track(new THREE.TorusGeometry(0.036, 0.008, 6, 12)),
        this.plateMat,
      );
      ring.position.set(side * 0.042, 0.02, 0.076);
      head.add(ring);
    }
    const mouth = new THREE.Mesh(
      lib.registry.track(new THREE.BoxGeometry(0.06, 0.018, 0.02)),
      lib.character(0x3a2c08, 0.4, 0.6),
    );
    mouth.position.set(0, -0.05, 0.082);
    head.add(mouth);

    const collar = new THREE.Mesh(
      lib.registry.track(new THREE.CylinderGeometry(0.075, 0.085, 0.05, 12)),
      lib.character(0x5c4712, 0.4, 0.7),
    );
    collar.position.y = -0.09;
    head.add(collar);

    const panel = new THREE.Mesh(
      lib.registry.track(new THREE.BoxGeometry(0.12, 0.09, 0.03)),
      lib.character(0x2b2216, 0.4, 0.6),
    );
    panel.position.set(0, 0.16, 0.13);
    this.character.joints.chest.add(panel);
    for (let i = 0; i < 5; i++) {
      const led = new THREE.Mesh(
        lib.registry.track(new THREE.BoxGeometry(0.014, 0.014, 0.006)),
        lib.energy([0xff6a4a, 0x6fe08a, 0x6fc8ff, 0xffd166, 0xff8ac0][i]),
      );
      led.position.set(-0.04 + i * 0.02, 0.18, 0.147);
      this.character.joints.chest.add(led);
    }
  }

  update(t: number): void {
    this.character.update(t);
    // Nervous overlay: stiff shoulders, small tremor, head checking behind.
    const j = this.character.joints;
    const anxiety = 0.35 + 0.65 * smoothstep(300, 316, t);
    const tremor = fbm1(t * 6.2) * 0.03 * anxiety;
    j.shoulderL.rotation.z += 0.22 * anxiety;
    j.shoulderR.rotation.z -= 0.22 * anxiety;
    j.elbowL.rotation.x -= 0.5 * anxiety;
    j.elbowR.rotation.x -= 0.5 * anxiety;
    j.head.rotation.y += Math.sin(t * 1.6) * 0.45 * anxiety;
    j.head.rotation.z += tremor;
    j.torso.rotation.x += 0.06 * anxiety;
    j.root.updateMatrixWorld(true);
  }
}

/** Simple helper: a constant-position path for characters that hold station. */
export function fixedPath(x: number, y: number, z: number): VectorTrack {
  return new VectorTrack([{ t: 0, v: [x, y, z] }, { t: 1e6, v: [x, y, z] }]);
}

export { saturate };
