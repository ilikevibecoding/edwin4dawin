import * as THREE from 'three';
import { getMaterials } from '../assets/Materials';
import { boxAt, mergeParts, parametricSurface } from '../assets/Greeble';
import { buildBlaster, buildHumanoidRig, skinHumanoid } from './Humanoid';
import { Character, type CharState } from './Character';
import { clamp, damp, lerp } from '../core/MathX';

/**
 * The cast.
 *
 * Each figure is deliberately simple, but silhouette, colour and posture are
 * tuned so a viewer recognises who is who instantly: white armour with a
 * blank visor, a tall black respirator helmet, a small white-robed figure
 * with side buns, a blue-and-white barrel droid, a golden stiff-limbed droid.
 */

export interface ArmedCharacter {
  muzzles: THREE.Object3D[];
}

/* -------------------------------------------------------------- trooper */

export class Stormtrooper extends Character implements ArmedCharacter {
  readonly muzzles: THREE.Object3D[];

  constructor(id: string) {
    const M = getMaterials();
    const rig = buildHumanoidRig({ height: 1.85, shoulderWidth: 0.46, bulk: 1.15, limbThickness: 0.095 });
    skinHumanoid(rig, {
      bodyMat: M.whiteArmor,
      limbMat: M.whiteArmor,
      bootMat: M.blackRubber,
      headMat: M.blackRubber,
      beltMat: M.blackRubber,
      armor: true,
      shoulderPads: true,
    });
    super({
      id,
      displayName: 'Imperial Stormtrooper',
      description:
        'Sealed white composite armour over a black bodyglove. The blank visor removes any trace of individuality, which is precisely the point.',
      root: rig.root,
      rig,
      height: 1.85,
    });
    this.gaitAmplitude = 0.85;

    // Helmet.
    const helmet = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.148, 14, 12), M.whiteArmor);
    dome.scale.set(1, 1.02, 1.06);
    dome.castShadow = true;
    helmet.add(dome);
    const jaw = new THREE.Mesh(
      mergeParts([
        boxAt(0.2, 0.11, 0.2, 0, -0.11, -0.012),
        boxAt(0.235, 0.075, 0.13, 0, -0.03, -0.05),
      ]),
      M.whiteArmor,
    );
    helmet.add(jaw);
    // Visor: a dark angular band with the characteristic brow and frown.
    const visor = new THREE.Mesh(
      mergeParts([
        boxAt(0.085, 0.055, 0.05, -0.052, -0.008, -0.128),
        boxAt(0.085, 0.055, 0.05, 0.052, -0.008, -0.128),
        boxAt(0.055, 0.035, 0.045, 0, -0.075, -0.135),
        boxAt(0.03, 0.09, 0.04, 0, -0.005, -0.145),
      ]),
      M.glassDark,
    );
    helmet.add(visor);
    const vents = new THREE.Mesh(
      mergeParts([
        boxAt(0.055, 0.02, 0.03, -0.075, -0.075, -0.115),
        boxAt(0.055, 0.02, 0.03, 0.075, -0.075, -0.115),
      ]),
      M.blackRubber,
    );
    helmet.add(vents);
    rig.head.add(helmet);

    // Chest and back plates.
    const armor = new THREE.Mesh(
      mergeParts([
        boxAt(0.34, 0.2, 0.27, 0, 0.28, 0),
        boxAt(0.3, 0.13, 0.3, 0, 0.12, 0),
        boxAt(0.15, 0.11, 0.06, 0, 0.3, -0.14),
      ]),
      M.whiteArmor,
    );
    armor.castShadow = true;
    rig.torso.add(armor);

    const blaster = buildBlaster(M.blackRubber, M.chrome, 1);
    rig.handR.add(blaster.root);
    blaster.root.position.set(0.02, -0.1, -0.04);
    blaster.root.rotation.x = Math.PI / 2;
    this.muzzles = [blaster.muzzle];
  }
}

/* ---------------------------------------------------------- rebel guard */

export class RebelSoldier extends Character implements ArmedCharacter {
  readonly muzzles: THREE.Object3D[];

  constructor(id: string) {
    const M = getMaterials();
    const rig = buildHumanoidRig({ height: 1.79, shoulderWidth: 0.42, limbThickness: 0.088 });
    skinHumanoid(rig, {
      bodyMat: M.brownCloth,
      limbMat: M.brownCloth,
      bootMat: M.blackRubber,
      headMat: M.skin,
      beltMat: M.blackRubber,
    });
    super({
      id,
      displayName: 'Rebel Trooper',
      description:
        'Ship security in a padded flight vest and an open combat helmet. Outnumbered, out-armoured, and holding the corridor anyway.',
      root: rig.root,
      rig,
      height: 1.79,
    });

    // Vest.
    const vest = new THREE.Mesh(
      mergeParts([boxAt(0.4, 0.32, 0.29, 0, 0.24, 0), boxAt(0.18, 0.1, 0.08, 0, 0.3, -0.16)]),
      M.darkCloth,
    );
    vest.castShadow = true;
    rig.torso.add(vest);

    // Open-face helmet with a brim.
    const helmet = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.darkCloth);
    shell.position.y = 0.012;
    shell.castShadow = true;
    helmet.add(shell);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.028, 0.1), M.darkCloth);
    brim.position.set(0, 0.03, -0.13);
    helmet.add(brim);
    const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.14), M.darkCloth);
    cheekL.position.set(-0.115, -0.05, -0.01);
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.115;
    helmet.add(cheekL, cheekR);
    // Goggle band: gives the face a direction without modelling features.
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.042, 0.06), M.glassDark);
    goggles.position.set(0, -0.012, -0.105);
    helmet.add(goggles);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.03, 0.2), M.blackRubber);
    strap.position.set(0, -0.012, -0.01);
    helmet.add(strap);
    rig.head.add(helmet);

    const blaster = buildBlaster(M.blackRubber, M.rebelTrim, 0.95);
    rig.handR.add(blaster.root);
    blaster.root.position.set(0.02, -0.1, -0.04);
    blaster.root.rotation.x = Math.PI / 2;
    this.muzzles = [blaster.muzzle];
  }
}

/* ---------------------------------------------------------------- Vader */

export class Vader extends Character {
  private cape: THREE.Mesh;
  private capeGeo: THREE.BufferGeometry;
  private capeBase: Float32Array;
  private chestLights: THREE.MeshBasicMaterial;
  private saber: THREE.Group;
  private saberBlade: THREE.Mesh;
  private saberLight: THREE.PointLight;
  private breathPhase = 0;

  /** 0 = hilt on the belt, 1 = ignited and held. */
  saberActive = 0;

  constructor(id: string) {
    const M = getMaterials();
    const rig = buildHumanoidRig({
      height: 2.03,
      shoulderWidth: 0.52,
      hipWidth: 0.32,
      limbThickness: 0.105,
      bulk: 1.2,
      headRadius: 0.128,
    });
    skinHumanoid(rig, {
      bodyMat: M.vaderBlack,
      limbMat: M.vaderBlack,
      bootMat: M.blackRubber,
      headMat: M.vaderBlack,
      beltMat: M.chrome,
      armor: true,
      shoulderPads: true,
    });
    super({
      id,
      displayName: 'The Dark Lord',
      description:
        'Two metres of black armour and life support. He does not hurry, and the corridor gets colder when he steps into it.',
      root: rig.root,
      rig,
      height: 2.03,
    });
    this.gaitAmplitude = 0.72;
    this.strideScale = 1.35;

    // Helmet: dome, flared cheeks, angular faceplate, respirator.
    const helmet = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), M.vaderBlack);
    dome.scale.set(1, 1.24, 1.05);
    dome.position.y = 0.02;
    dome.castShadow = true;
    helmet.add(dome);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.158, 0.06, 14), M.vaderBlack);
    crown.position.y = 0.01;
    helmet.add(crown);
    const face = new THREE.Mesh(
      mergeParts([
        boxAt(0.19, 0.2, 0.13, 0, -0.06, -0.07),
        boxAt(0.13, 0.09, 0.09, 0, -0.15, -0.1),
        boxAt(0.22, 0.09, 0.1, 0, 0.02, -0.06),
      ]),
      M.vaderBlack,
    );
    helmet.add(face);
    // Angled eye lenses.
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x1a1207, roughness: 0.18, metalness: 0.75 });
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.045, 0.03), lensMat);
      lens.position.set(side * 0.052, -0.018, -0.135);
      lens.rotation.z = side * 0.42;
      helmet.add(lens);
    }
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.035), M.chrome);
    grille.position.set(0, -0.135, -0.125);
    helmet.add(grille);
    // Flared cheek panels.
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.19, 0.16), M.vaderBlack);
      cheek.position.set(side * 0.13, -0.07, -0.02);
      cheek.rotation.z = side * 0.14;
      helmet.add(cheek);
    }
    rig.head.add(helmet);

    // Shoulder mantle and cape.
    const mantle = new THREE.Mesh(
      mergeParts([boxAt(0.62, 0.09, 0.36, 0, 0.42, 0.02), boxAt(0.5, 0.2, 0.3, 0, 0.34, 0.06)]),
      M.vaderBlack,
    );
    mantle.castShadow = true;
    rig.chest.add(mantle);

    this.capeGeo = parametricSurface(
      10,
      8,
      (u, v, out) => {
        const width = 0.34 + u * 0.36;
        out.set((v - 0.5) * 2 * width, -u * 1.62, 0.12 + u * 0.18 + Math.pow(Math.abs(v - 0.5) * 2, 2) * 0.1);
      },
      [1, 1],
      false,
    );
    this.capeBase = (this.capeGeo.getAttribute('position').array as Float32Array).slice();
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0e,
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.cape = new THREE.Mesh(this.capeGeo, capeMat);
    this.cape.position.y = 0.46;
    this.cape.castShadow = true;
    rig.chest.add(this.cape);

    // Chest control panel.
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), M.chrome);
    panel.position.set(0, 0.22, -0.15);
    rig.torso.add(panel);
    this.chestLights = new THREE.MeshBasicMaterial({ color: 0xff3b28, toneMapped: false });
    for (let i = 0; i < 6; i++) {
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.018), this.chestLights);
      led.position.set(-0.075 + (i % 3) * 0.075, 0.25 - Math.floor(i / 3) * 0.05, -0.181);
      led.rotation.y = Math.PI;
      rig.torso.add(led);
    }
    const beltBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.075, 0.22), M.chrome);
    beltBox.position.y = -0.02;
    rig.torso.add(beltBox);

    // Sabre (kept dark unless the story calls for it).
    this.saber = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.26, 10), M.chrome);
    hilt.rotation.x = Math.PI / 2;
    this.saber.add(hilt);
    const bladeGeo = new THREE.CylinderGeometry(0.021, 0.017, 1.35, 10);
    bladeGeo.translate(0, 0.675, 0);
    bladeGeo.rotateX(-Math.PI / 2);
    this.saberBlade = new THREE.Mesh(
      bladeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff4433,
        toneMapped: false,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.saberBlade.position.z = -0.14;
    this.saberBlade.visible = false;
    this.saber.add(this.saberBlade);
    this.saberLight = new THREE.PointLight(0xff3b28, 0, 5, 2);
    this.saberLight.position.z = -0.7;
    this.saber.add(this.saberLight);
    this.saber.position.set(0.19, -0.03, 0.04);
    rig.torso.add(this.saber);
  }

  protected override onUpdate(time: number, dt: number, state: CharState): void {
    // Respirator: a slow chest lift with a sharp intake.
    this.breathPhase = (time * 0.42) % 1;
    const breath = Math.sin(this.breathPhase * Math.PI * 2);
    this.rig!.chest.scale.set(1 + breath * 0.014, 1 + breath * 0.01, 1 + breath * 0.016);
    this.chestLights.color.setRGB(1, 0.2 + 0.22 * Math.max(0, breath), 0.14);

    // Cape sway follows the walk and lags behind the body.
    const pos = this.capeGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const moving = state === 'walk' || state === 'run' ? 1 : 0.25;
    for (let i = 0; i < arr.length; i += 3) {
      const bx = this.capeBase[i];
      const by = this.capeBase[i + 1];
      const bz = this.capeBase[i + 2];
      const drop = -by / 1.62;
      const sway = Math.sin(time * 1.7 + drop * 3.1) * 0.045 * drop * moving;
      arr[i] = bx + sway;
      arr[i + 1] = by;
      arr[i + 2] = bz + Math.sin(time * 2.2 + drop * 2.4) * 0.03 * drop * moving + drop * drop * 0.12 * moving;
    }
    pos.needsUpdate = true;
    this.capeGeo.computeVertexNormals();

    const active = clamp(this.saberActive, 0, 1);
    this.saberBlade.visible = active > 0.02;
    this.saberBlade.scale.z = 0.04 + active * 0.96;
    (this.saberBlade.material as THREE.Material).opacity = 0.95 * active;
    this.saberLight.intensity = active * 4;
    if (active > 0.02) {
      this.saber.position.set(0.24, 0.1, -0.12);
      this.saber.rotation.set(-0.5, 0, 0);
    } else {
      this.saber.position.set(0.19, -0.03, 0.04);
      this.saber.rotation.set(0, 0, 0);
    }
    void dt;
  }
}

/* ----------------------------------------------------------------- Leia */

export class Leia extends Character {
  private skirt: THREE.Mesh;
  private hairBuns: THREE.Group;

  constructor(id: string) {
    const M = getMaterials();
    const rig = buildHumanoidRig({
      height: 1.6,
      shoulderWidth: 0.32,
      hipWidth: 0.24,
      limbThickness: 0.068,
      headRadius: 0.104,
    });
    skinHumanoid(rig, {
      bodyMat: M.leiaWhite,
      limbMat: M.leiaWhite,
      bootMat: M.leiaWhite,
      headMat: M.skin,
      beltMat: M.chrome,
    });
    super({
      id,
      displayName: 'Princess Leia',
      description:
        'A senator on a diplomatic mission that stopped being diplomatic several hours ago. She is carrying the only copy of the stolen plans.',
      root: rig.root,
      rig,
      height: 1.6,
    });
    this.gaitAmplitude = 0.7;
    this.strideScale = 0.82;

    // Floor-length robe: hides the legs and reads instantly as her silhouette.
    const skirtGeo = new THREE.CylinderGeometry(0.16, 0.31, 0.86, 16, 3, true);
    skirtGeo.translate(0, -0.43, 0);
    this.skirt = new THREE.Mesh(skirtGeo, M.leiaWhite);
    this.skirt.castShadow = true;
    this.skirt.receiveShadow = true;
    rig.hips.add(this.skirt);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.09, 14), M.leiaWhite);
    collar.position.y = 0.4;
    rig.torso.add(collar);

    // Hair: dark cap plus the two side coils.
    this.hairBuns = new THREE.Group();
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      M.darkCloth,
    );
    cap.position.y = 0.012;
    cap.scale.set(1.02, 1.1, 1.04);
    this.hairBuns.add(cap);
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), M.darkCloth);
    back.position.set(0, -0.03, 0.055);
    this.hairBuns.add(back);
    for (const side of [-1, 1]) {
      const bun = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.031, 8, 14), M.darkCloth);
      bun.position.set(side * 0.115, -0.025, 0.005);
      bun.rotation.y = Math.PI / 2;
      this.hairBuns.add(bun);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), M.darkCloth);
      inner.position.copy(bun.position);
      this.hairBuns.add(inner);
    }
    rig.head.add(this.hairBuns);

    // Hide the lower legs; the robe covers them.
    rig.kneeL.visible = false;
    rig.kneeR.visible = false;
  }

  protected override onUpdate(time: number, _dt: number, state: CharState): void {
    const moving = state === 'walk' || state === 'run' ? 1 : 0;
    this.skirt.rotation.x = Math.sin(time * 5.5) * 0.035 * moving;
    this.skirt.rotation.z = Math.cos(time * 5.1) * 0.03 * moving;
  }
}

/* --------------------------------------------------------------- R2-D2 */

export class R2D2 extends Character {
  private dome: THREE.Group;
  private body: THREE.Group;
  private legs: THREE.Group[] = [];
  private centerLeg: THREE.Group;
  private eyeMat: THREE.MeshBasicMaterial;
  private holoMat: THREE.MeshBasicMaterial;
  /** Angle (radians, local) the dome should point toward. */
  domeTarget = 0;
  /** Raised when he is projecting the plans. */
  projecting = 0;

  constructor(id: string) {
    const M = getMaterials();
    const root = new THREE.Group();
    root.name = 'R2D2';
    super({
      id,
      displayName: 'R2 Unit',
      description:
        'A stubby astromech built for starship repair. Utterly literal, completely stubborn, and about to be handed the most important file in the galaxy.',
      root,
      rig: null,
      height: 1.06,
    });

    this.body = new THREE.Group();
    this.body.position.y = 0.52;
    root.add(this.body);

    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.68, 18, 1, false), M.droidWhite);
    shell.castShadow = true;
    shell.receiveShadow = true;
    this.body.add(shell);

    // Blue detail bands and panels.
    const bandGeo = new THREE.CylinderGeometry(0.252, 0.252, 0.055, 18, 1, true);
    for (const y of [0.26, -0.02, -0.28]) {
      const band = new THREE.Mesh(bandGeo.clone(), M.droidBlue);
      band.position.y = y;
      this.body.add(band);
    }
    bandGeo.dispose();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.02), i % 2 ? M.droidBlue : M.corridorTrim);
      panel.position.set(Math.sin(a) * 0.25, 0.1, Math.cos(a) * 0.25);
      panel.lookAt(new THREE.Vector3(Math.sin(a) * 2, 0.1, Math.cos(a) * 2));
      this.body.add(panel);
    }

    // Dome.
    this.dome = new THREE.Group();
    this.dome.position.y = 0.34;
    this.body.add(this.dome);
    const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.245, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.droidWhite);
    domeMesh.castShadow = true;
    this.dome.add(domeMesh);
    const domeRing = new THREE.Mesh(new THREE.TorusGeometry(0.243, 0.016, 6, 20), M.droidBlue);
    domeRing.rotation.x = Math.PI / 2;
    this.dome.add(domeRing);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.02), M.droidBlue);
      wedge.position.set(Math.sin(a) * 0.2, 0.11, Math.cos(a) * 0.2);
      wedge.lookAt(new THREE.Vector3(Math.sin(a) * 2, 0.11, Math.cos(a) * 2));
      this.dome.add(wedge);
    }
    // Primary photoreceptor.
    const eyeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 12), M.corridorTrim);
    eyeHousing.rotation.x = Math.PI / 2;
    eyeHousing.position.set(0, 0.11, -0.22);
    this.dome.add(eyeHousing);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x2c3a48, toneMapped: false });
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.042, 12), this.eyeMat);
    eye.position.set(0, 0.11, -0.246);
    eye.rotation.y = Math.PI;
    this.dome.add(eye);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 10), M.emissiveRed);
    lens.position.set(0.016, 0.11, -0.248);
    lens.rotation.y = Math.PI;
    this.dome.add(lens);

    // Holoprojector on the dome top.
    this.holoMat = new THREE.MeshBasicMaterial({
      color: 0x8ad4ff,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const holo = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), this.holoMat);
    holo.rotation.x = -Math.PI / 2;
    holo.position.set(0.08, 0.243, -0.06);
    this.dome.add(holo);

    // Legs.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.27, 0.52, 0);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.24), M.droidWhite);
      shoulder.position.y = 0.06;
      leg.add(shoulder);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.42, 0.14), M.droidWhite);
      shin.position.y = -0.19;
      leg.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.32), M.corridorTrim);
      foot.position.set(0, -0.44, -0.02);
      foot.castShadow = true;
      leg.add(foot);
      root.add(leg);
      this.legs.push(leg);
    }
    this.centerLeg = new THREE.Group();
    this.centerLeg.position.set(0, 0.5, -0.16);
    const cShin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.12), M.droidWhite);
    cShin.position.y = -0.2;
    this.centerLeg.add(cShin);
    const cFoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.28), M.corridorTrim);
    cFoot.position.set(0, -0.44, -0.02);
    this.centerLeg.add(cFoot);
    root.add(this.centerLeg);
  }

  protected override onUpdate(time: number, dt: number, state: CharState): void {
    const moving = state === 'walk' || state === 'run' ? 1 : 0;
    const speed = state === 'run' ? 9 : 6;
    // Body rocks side to side over the treads instead of taking steps.
    this.body.rotation.z = Math.sin(time * speed) * 0.045 * moving;
    this.body.rotation.x = -moving * 0.06 + Math.sin(time * speed * 2) * 0.012 * moving;
    this.body.position.y = 0.52 + Math.abs(Math.sin(time * speed)) * 0.012 * moving;
    this.legs.forEach((l, i) => {
      l.rotation.x = Math.sin(time * speed + i * Math.PI) * 0.05 * moving;
    });
    this.centerLeg.rotation.x = -0.06 * moving;

    this.dome.rotation.y = damp(this.dome.rotation.y, this.domeTarget, 4, dt);
    const blink = Math.sin(time * 3.1) > 0.7 ? 1 : 0.35;
    this.eyeMat.color.setRGB(0.17 * blink + 0.05, 0.23 * blink + 0.05, 0.3 * blink + 0.08);
    this.holoMat.opacity = clamp(this.projecting, 0, 1) * 0.7;
  }
}

/* --------------------------------------------------------------- C-3PO */

export class C3PO extends Character {
  private wires: THREE.Group;
  private eyeMat: THREE.MeshBasicMaterial;

  constructor(id: string) {
    const M = getMaterials();
    const rig = buildHumanoidRig({
      height: 1.72,
      shoulderWidth: 0.38,
      hipWidth: 0.24,
      limbThickness: 0.062,
      headRadius: 0.112,
    });
    skinHumanoid(rig, {
      bodyMat: M.gold,
      limbMat: M.gold,
      bootMat: M.gold,
      headMat: M.gold,
      beltMat: M.corridorTrim,
    });
    super({
      id,
      displayName: 'Protocol Droid',
      description:
        'Fluent in a great many forms of communication, most of which he is using right now to explain that this is a very bad idea.',
      root: rig.root,
      rig,
      height: 1.72,
    });
    // Stiff, short-stepped, permanently bent elbows.
    this.gaitAmplitude = 0.42;
    this.elbowBias = 0.55;
    this.strideScale = 0.6;

    // Head: smooth gold mask with large optics and a mouth grille.
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.118, 14, 12), M.gold);
    skull.scale.set(0.94, 1.06, 0.98);
    skull.castShadow = true;
    head.add(skull);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.112, 0.05, 14), M.gold);
    crown.position.y = 0.08;
    head.add(crown);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, toneMapped: false });
    for (const side of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 12), M.corridorTrim);
      socket.rotation.x = Math.PI / 2;
      socket.position.set(side * 0.048, 0.018, -0.098);
      head.add(socket);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.026, 12), this.eyeMat);
      glow.position.set(side * 0.048, 0.018, -0.115);
      glow.rotation.y = Math.PI;
      head.add(glow);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.038, 0.03), M.corridorTrim);
    mouth.position.set(0, -0.062, -0.096);
    head.add(mouth);
    rig.head.add(head);

    // Exposed midriff wiring — his most identifiable detail.
    this.wires = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), M.corridorTrim);
      wire.position.set(Math.sin(a) * 0.075, 0.03, Math.cos(a) * 0.06);
      this.wires.add(wire);
    }
    rig.torso.add(this.wires);
    const midriff = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.17, 12), M.blackRubber);
    midriff.position.y = 0.03;
    rig.torso.add(midriff);

    // Chest plate with a small status light.
    const plate = new THREE.Mesh(
      mergeParts([boxAt(0.3, 0.2, 0.22, 0, 0.28, 0), boxAt(0.1, 0.06, 0.05, 0, 0.3, -0.12)]),
      M.gold,
    );
    plate.castShadow = true;
    rig.torso.add(plate);
    const statusLight = new THREE.Mesh(new THREE.CircleGeometry(0.014, 8), M.emissiveRed);
    statusLight.position.set(0, 0.31, -0.146);
    statusLight.rotation.y = Math.PI;
    rig.torso.add(statusLight);
  }

  protected override onUpdate(time: number, _dt: number, state: CharState): void {
    // Anxious micro-motion: he never settles.
    const fret = state === 'idle' || state === 'cower' ? 1 : 0.35;
    this.rig!.neck.rotation.y += Math.sin(time * 2.7) * 0.09 * fret;
    this.rig!.torso.rotation.z += Math.sin(time * 1.9) * 0.02 * fret;
    const glow = 0.8 + 0.2 * Math.sin(time * 4.1);
    this.eyeMat.color.setRGB(glow, glow * 0.94, glow * 0.76);
  }
}

/* --------------------------------------------------------------- helpers */

/** Point a character's weapon-bearing arm at a world position. */
export function aimAt(character: Character, worldTarget: THREE.Vector3, dt: number): void {
  const rig = character.rig;
  if (!rig) return;
  const local = worldTarget.clone();
  rig.chest.worldToLocal(local);
  const yaw = clamp(Math.atan2(local.x, -local.z), -0.9, 0.9);
  const pitch = clamp(Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.6, 0.6);
  rig.shoulderR.rotation.y = damp(rig.shoulderR.rotation.y, yaw * 0.8, 9, dt);
  rig.shoulderR.rotation.x = damp(rig.shoulderR.rotation.x, -Math.PI / 2 + 0.18 - pitch, 9, dt);
  rig.shoulderL.rotation.y = damp(rig.shoulderL.rotation.y, yaw * 0.55, 9, dt);
  rig.shoulderL.rotation.x = damp(rig.shoulderL.rotation.x, lerp(rig.shoulderL.rotation.x, -1.1 - pitch, 0.5), 9, dt);
}
