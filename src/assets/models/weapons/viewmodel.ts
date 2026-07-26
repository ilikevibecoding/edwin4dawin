import * as THREE from 'three';
import type { WeaponId } from '../../../game/types';
import type { WeaponRig } from '../../../game/weapons/weapons';
import type { Player } from '../../../game/player';
import { settings } from '../../../core/settings';
import { bevelBoxGeo } from '../../../world/kit/geo';
import { registerAsset } from '../../registry';

registerAsset({
  id: 'weapon.viewmodels',
  name: 'First-person arms + weapon view models (all 8 weapons)',
  category: 'weapon',
  agent: 'Fable 4',
  files: 'src/assets/models/weapons/viewmodel.ts',
  where: 'playing state',
  dims: 'true scale, right-handed',
  pivot: 'camera-relative hip/ads anchors',
  materials: 'polymer, blued steel, alu, gloves',
  textures: 'plain PBR + emissive sight dots',
  collision: 'none (separate depth-cleared pass prevents wall clipping)',
  lod: 'none',
  anim: 'sway, bob, ads, fire kick, reload (mag out/in, chamber), draw/holster, melee, throw, land dip',
  audio: 'reload set, fire set',
  status: 'integrated',
  accept: 'no camera/wall clipping; believable proportions; distinct silhouettes; anim states complete',
});

const POLYMER = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.72, metalness: 0.08 });
const POLYMER2 = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.65, metalness: 0.1 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x4e565e, roughness: 0.34, metalness: 0.85 });
const STEEL_DARK = new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 0.42, metalness: 0.8 });
const ALU = new THREE.MeshStandardMaterial({ color: 0x8b959e, roughness: 0.4, metalness: 0.75 });
const GLOVE = new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.9 });
const SLEEVE = new THREE.MeshStandardMaterial({ color: 0x3d4a55, roughness: 0.95 });
const WOOD_GRIP = new THREE.MeshStandardMaterial({ color: 0x5e4632, roughness: 0.6 });
const SIGHT_DOT = new THREE.MeshStandardMaterial({ color: 0x223326, emissive: 0x51ff7e, emissiveIntensity: 2.2, roughness: 0.4 });
const BLADE = new THREE.MeshStandardMaterial({ color: 0xb8c2ca, roughness: 0.25, metalness: 0.9 });
const CAN_GREEN = new THREE.MeshStandardMaterial({ color: 0x51584a, roughness: 0.5, metalness: 0.35 });
const CAN_GRAY = new THREE.MeshStandardMaterial({ color: 0x6e7478, roughness: 0.5, metalness: 0.35 });

interface WeaponModel {
  root: THREE.Group;
  mag: THREE.Group | null;
  slide: THREE.Mesh | null;
  handL: THREE.Group;
  handR: THREE.Group;
  /** hip position/rotation */
  hip: { pos: THREE.Vector3; rot: THREE.Euler };
  ads: { pos: THREE.Vector3; rot: THREE.Euler };
  magHome: THREE.Vector3;
}

function bx(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0, bevel = 0.004): THREE.Mesh {
  const m = new THREE.Mesh(bevelBoxGeo(w, h, d, Math.min(bevel, w / 3.1, h / 3.1, d / 3.1)), mat);
  m.position.set(x, y, z);
  return m;
}

function cyl(mat: THREE.Material, r: number, len: number, x = 0, y = 0, z = 0, alongZ = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
  if (alongZ) m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

function mkHand(): THREE.Group {
  const g = new THREE.Group();
  const palm = bx(GLOVE, 0.062, 0.082, 0.034, 0, 0, 0, 0.012);
  g.add(palm);
  // simplified fingers (curled)
  const fingers = bx(GLOVE, 0.058, 0.04, 0.046, 0, -0.05, 0.012, 0.012);
  fingers.rotation.x = 0.5;
  g.add(fingers);
  const thumb = bx(GLOVE, 0.02, 0.044, 0.022, -0.036, -0.012, 0.01, 0.008);
  thumb.rotation.z = 0.5;
  g.add(thumb);
  const wrist = cyl(GLOVE, 0.034, 0.07, 0, 0.058, -0.008, false);
  g.add(wrist);
  return g;
}

/**
 * Forearm sleeve connecting a hand to an off-screen elbow anchor
 * (model space). Keeps arms reading correctly from the camera.
 */
function mkForearm(hand: THREE.Vector3, elbow: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(elbow, hand);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(hand, elbow).multiplyScalar(0.5);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.052, len, 10), SLEEVE);
  sleeve.position.copy(mid);
  sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  g.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.035, 10), GLOVE);
  cuff.position.copy(hand).addScaledVector(dir.normalize(), 0.055);
  cuff.quaternion.copy(sleeve.quaternion);
  g.add(cuff);
  return g;
}

function buildModel(id: WeaponId): WeaponModel {
  const root = new THREE.Group();
  let mag: THREE.Group | null = null;
  let slide: THREE.Mesh | null = null;
  const handL = mkHand();
  const handR = mkHand();
  const magHome = new THREE.Vector3();
  let hip = { pos: new THREE.Vector3(0.16, -0.2, -0.5), rot: new THREE.Euler(0, 0.03, 0) };
  let ads = { pos: new THREE.Vector3(0, -0.118, -0.42), rot: new THREE.Euler(0, 0, 0) };

  const addSights = (topY: number, frontZ: number, rearZ: number): void => {
    const rear = bx(STEEL_DARK, 0.026, 0.018, 0.012, 0, topY + 0.008, rearZ);
    root.add(rear);
    for (const sx of [-0.008, 0.008]) {
      const dot = bx(SIGHT_DOT, 0.004, 0.004, 0.004, sx, topY + 0.014, rearZ);
      root.add(dot);
    }
    const post = bx(STEEL_DARK, 0.008, 0.02, 0.01, 0, topY + 0.008, frontZ);
    root.add(post);
    const fdot = bx(SIGHT_DOT, 0.005, 0.005, 0.005, 0, topY + 0.019, frontZ);
    root.add(fdot);
  };

  switch (id) {
    case 'vp9': {
      const frame = bx(POLYMER, 0.032, 0.048, 0.19, 0, 0, -0.02);
      slide = bx(STEEL_DARK, 0.034, 0.036, 0.21, 0, 0.038, -0.03, 0.006);
      // ejection port detail
      const port = bx(STEEL, 0.03, 0.02, 0.045, 0.004, 0.042, -0.055);
      const grip = bx(POLYMER2, 0.034, 0.115, 0.055, 0, -0.072, 0.055, 0.008);
      grip.rotation.x = -0.22;
      const trigGuard = bx(POLYMER, 0.026, 0.01, 0.055, 0, -0.038, -0.025);
      const muzzlePt = new THREE.Object3D();
      muzzlePt.name = 'muzzle';
      muzzlePt.position.set(0, 0.038, -0.145);
      mag = new THREE.Group();
      const magMesh = bx(STEEL, 0.028, 0.1, 0.045, 0, 0, 0, 0.005);
      mag.add(magMesh);
      mag.position.set(0, -0.075, 0.052);
      magHome.copy(mag.position);
      root.add(frame, slide, port, grip, trigGuard, mag, muzzlePt);
      addSights(0.056, -0.125, 0.06);
      handR.position.set(0, -0.1, 0.085);
      handR.rotation.x = -0.3;
      handL.position.set(-0.03, -0.115, 0.06);
      handL.rotation.set(-0.2, 0.35, 0.45);
      hip = { pos: new THREE.Vector3(0.16, -0.17, -0.38), rot: new THREE.Euler(0, 0.04, 0) };
      ads = { pos: new THREE.Vector3(0, -0.088, -0.3), rot: new THREE.Euler(0, 0, 0) };
      break;
    }
    case 'kis10': {
      const body = bx(POLYMER, 0.044, 0.07, 0.3, 0, 0, -0.02, 0.007);
      const barrel = cyl(STEEL_DARK, 0.013, 0.12, 0, 0.012, -0.22);
      const shroud = bx(POLYMER2, 0.04, 0.045, 0.1, 0, 0.01, -0.19, 0.008);
      const grip = bx(POLYMER2, 0.034, 0.1, 0.05, 0, -0.075, 0.06, 0.008);
      grip.rotation.x = -0.18;
      const stock1 = cyl(ALU, 0.008, 0.16, 0.015, 0.02, 0.18);
      const stock2 = cyl(ALU, 0.008, 0.16, -0.015, 0.02, 0.18);
      const plate = bx(POLYMER, 0.05, 0.08, 0.02, 0, 0.005, 0.26, 0.006);
      mag = new THREE.Group();
      mag.add(bx(STEEL, 0.03, 0.16, 0.05, 0, -0.005, 0, 0.006));
      mag.position.set(0, -0.1, -0.04);
      mag.rotation.x = 0.12;
      magHome.copy(mag.position);
      const muzzlePt = new THREE.Object3D();
      muzzlePt.name = 'muzzle';
      muzzlePt.position.set(0, 0.012, -0.29);
      root.add(body, barrel, shroud, grip, stock1, stock2, plate, mag, muzzlePt);
      addSights(0.036, -0.16, 0.03);
      handR.position.set(0, -0.1, 0.085);
      handR.rotation.x = -0.28;
      handL.position.set(-0.008, -0.05, -0.16);
      handL.rotation.set(-0.4, 0.2, 1.35);
      break;
    }
    case 'vc7': {
      const receiver = bx(POLYMER, 0.046, 0.075, 0.26, 0, 0, 0.03, 0.007);
      const handguard = bx(POLYMER2, 0.042, 0.055, 0.24, 0, 0.005, -0.21, 0.009);
      // rail slots
      for (let i = 0; i < 5; i++) {
        handguard.add(bx(POLYMER, 0.044, 0.006, 0.02, 0, -0.01, -0.09 + i * 0.045));
      }
      const barrel = cyl(STEEL_DARK, 0.011, 0.1, 0, 0.008, -0.37);
      const brake = bx(STEEL_DARK, 0.026, 0.026, 0.05, 0, 0.008, -0.4, 0.006);
      const stock = bx(POLYMER2, 0.04, 0.08, 0.14, 0, -0.005, 0.22, 0.01);
      const cheek = bx(POLYMER, 0.042, 0.03, 0.1, 0, 0.045, 0.22, 0.008);
      const grip = bx(POLYMER2, 0.033, 0.1, 0.05, 0, -0.078, 0.1, 0.008);
      grip.rotation.x = -0.2;
      mag = new THREE.Group();
      const magMesh = bx(STEEL, 0.032, 0.14, 0.06, 0, -0.01, 0.01, 0.007);
      magMesh.rotation.x = 0.22;
      mag.add(magMesh);
      mag.position.set(0, -0.09, -0.015);
      magHome.copy(mag.position);
      // charging handle + port
      const port = bx(STEEL, 0.036, 0.024, 0.05, 0.006, 0.02, -0.01);
      const muzzlePt = new THREE.Object3D();
      muzzlePt.name = 'muzzle';
      muzzlePt.position.set(0, 0.008, -0.43);
      root.add(receiver, handguard, barrel, brake, stock, cheek, grip, mag, port, muzzlePt);
      addSights(0.04, -0.3, 0.06);
      handR.position.set(0, -0.105, 0.125);
      handR.rotation.x = -0.28;
      handL.position.set(-0.005, -0.052, -0.2);
      handL.rotation.set(-0.4, 0.2, 1.3);
      break;
    }
    case 'br8': {
      const receiver = bx(STEEL_DARK, 0.046, 0.07, 0.2, 0, 0, 0.02, 0.008);
      const barrel = cyl(STEEL_DARK, 0.012, 0.34, 0, 0.02, -0.26);
      const tube = cyl(STEEL, 0.011, 0.26, 0, -0.012, -0.22);
      const pump = bx(WOOD_GRIP, 0.05, 0.05, 0.11, 0, -0.012, -0.2, 0.012);
      const stock = bx(WOOD_GRIP, 0.042, 0.095, 0.19, 0, -0.02, 0.2, 0.014);
      const muzzlePt = new THREE.Object3D();
      muzzlePt.name = 'muzzle';
      muzzlePt.position.set(0, 0.02, -0.43);
      slide = pump; // pump acts as "slide" anim target
      root.add(receiver, barrel, tube, pump, stock, muzzlePt);
      addSights(0.042, -0.35, -0.02);
      handR.position.set(0, -0.095, 0.16);
      handR.rotation.x = -0.3;
      handL.position.set(-0.005, -0.055, -0.2);
      handL.rotation.set(-0.4, 0.2, 1.3);
      break;
    }
    case 'lr30': {
      const receiver = bx(POLYMER, 0.048, 0.08, 0.3, 0, 0, 0.04, 0.008);
      const barrel = cyl(STEEL_DARK, 0.013, 0.36, 0, 0.012, -0.34);
      const brake = cyl(STEEL_DARK, 0.02, 0.06, 0, 0.012, -0.52);
      const chassis = bx(POLYMER2, 0.044, 0.05, 0.24, 0, -0.02, -0.2, 0.009);
      const stock = bx(POLYMER2, 0.042, 0.1, 0.16, 0, -0.01, 0.26, 0.01);
      const grip = bx(POLYMER, 0.033, 0.1, 0.05, 0, -0.08, 0.12, 0.008);
      grip.rotation.x = -0.25;
      // scope
      const scopeTube = cyl(STEEL_DARK, 0.024, 0.2, 0, 0.075, -0.02);
      const scopeFront = cyl(STEEL_DARK, 0.03, 0.045, 0, 0.075, -0.115);
      const scopeRear = cyl(STEEL_DARK, 0.028, 0.04, 0, 0.075, 0.075);
      const lens = cyl(SIGHT_DOT, 0.02, 0.004, 0, 0.075, 0.096);
      mag = new THREE.Group();
      mag.add(bx(STEEL, 0.034, 0.09, 0.07, 0, 0, 0, 0.007));
      mag.position.set(0, -0.06, -0.03);
      magHome.copy(mag.position);
      const muzzlePt = new THREE.Object3D();
      muzzlePt.name = 'muzzle';
      muzzlePt.position.set(0, 0.012, -0.55);
      root.add(receiver, barrel, brake, chassis, stock, grip, scopeTube, scopeFront, scopeRear, lens, mag, muzzlePt);
      handR.position.set(0, -0.105, 0.14);
      handR.rotation.x = -0.3;
      handL.position.set(-0.005, -0.06, -0.24);
      handL.rotation.set(-0.4, 0.2, 1.3);
      ads = { pos: new THREE.Vector3(0, -0.145, -0.28), rot: new THREE.Euler(0, 0, 0) };
      break;
    }
    case 'knife': {
      const blade = bx(BLADE, 0.006, 0.032, 0.17, 0, 0.01, -0.12, 0.003);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 4), BLADE);
      tip.rotation.x = -Math.PI / 2;
      tip.scale.set(0.45, 1, 1.6);
      tip.position.set(0, 0.012, -0.225);
      const guard = bx(STEEL_DARK, 0.014, 0.05, 0.014, 0, 0.005, -0.03);
      const handle = bx(POLYMER2, 0.026, 0.038, 0.11, 0, 0, 0.04, 0.009);
      root.add(blade, tip, guard, handle);
      handR.position.set(0, -0.035, 0.055);
      handR.rotation.x = -0.4;
      handL.visible = false;
      hip = { pos: new THREE.Vector3(0.2, -0.22, -0.42), rot: new THREE.Euler(0.1, -0.25, 0.1) };
      ads = hip;
      break;
    }
    case 'flash':
    case 'smoke': {
      const mat = id === 'flash' ? CAN_GRAY : CAN_GREEN;
      const body = cyl(mat, 0.03, 0.115, 0, 0, 0, false);
      const cap = cyl(STEEL, 0.018, 0.03, 0, 0.07, 0, false);
      const lever = bx(STEEL, 0.014, 0.07, 0.006, 0.02, 0.045, 0.024);
      lever.rotation.x = 0.25;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0035, 6, 14), STEEL);
      ring.position.set(0, 0.075, 0.026);
      const band = cyl(id === 'flash' ? new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.5 }) : new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 }), 0.0305, 0.02, 0, 0.03, 0, false);
      root.add(body, cap, lever, ring, band);
      handR.position.set(0, -0.05, 0.03);
      handR.rotation.x = -0.5;
      handL.visible = false;
      hip = { pos: new THREE.Vector3(0.19, -0.2, -0.4), rot: new THREE.Euler(0.15, -0.2, 0) };
      ads = hip;
      break;
    }
  }

  root.add(handL, handR);
  // forearms from hands to off-screen elbow anchors
  root.add(mkForearm(handR.position, new THREE.Vector3(0.24, -0.46, 0.42)));
  if (handL.visible) {
    root.add(mkForearm(handL.position, new THREE.Vector3(-0.3, -0.44, 0.3)));
  }
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      (o as THREE.Mesh).frustumCulled = false;
    }
  });
  return { root, mag, slide, handL, handR, hip, ads, magHome };
}

/** First-person view model rig with full procedural animation. */
export class ViewModel {
  readonly group = new THREE.Group();
  private models = new Map<WeaponId, WeaponModel>();
  private current: WeaponModel | null = null;
  private currentId: WeaponId | null = null;
  private swayX = 0;
  private swayY = 0;
  private kick = 0;
  private kickRot = 0;
  private bob = 0;
  private landDip = 0;
  private slideBack = 0;

  constructor(vmScene: THREE.Scene, vmCamera: THREE.PerspectiveCamera) {
    vmScene.add(vmCamera);
    vmCamera.add(this.group);
    // dedicated view-model lighting (subtle key + fill)
    const key = new THREE.DirectionalLight(0xdfe8f2, 1.8);
    key.position.set(0.6, 1.2, 0.4);
    const fill = new THREE.HemisphereLight(0xb8c8d8, 0x3a4048, 0.9);
    vmScene.add(key, fill);
  }

  setWeapon(id: WeaponId): void {
    if (this.currentId === id) return;
    if (this.current) this.group.remove(this.current.root);
    let model = this.models.get(id);
    if (!model) {
      model = buildModel(id);
      this.models.set(id, model);
    }
    this.current = model;
    this.currentId = id;
    this.group.add(model.root);
  }

  onFire(): void {
    this.kick = Math.min(1.6, this.kick + 1);
    this.kickRot = Math.min(1.5, this.kickRot + 1);
    this.slideBack = 1;
  }

  onLand(power: number): void {
    this.landDip = Math.min(1, this.landDip + power);
  }

  update(dt: number, player: Player, rig: WeaponRig, lookDx: number, lookDy: number): void {
    if (!this.current) return;
    const m = this.current;
    const reduced = settings.get('reducedMotion');
    const aim = rig.aimT;

    // sway from look input
    const swayScale = reduced ? 0.3 : 1;
    this.swayX = THREE.MathUtils.damp(this.swayX, THREE.MathUtils.clamp(-lookDx * 0.00075, -0.03, 0.03) * swayScale, 9, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, THREE.MathUtils.clamp(lookDy * 0.0006, -0.025, 0.025) * swayScale, 9, dt);
    // bob from movement
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    this.bob = player.bobPhase;
    const bobAmp = player.bobAmp * (reduced ? 0.35 : 1) * (1 - aim * 0.75);
    const bobX = Math.sin(this.bob) * 0.011 * bobAmp;
    const bobY = -Math.abs(Math.cos(this.bob)) * 0.011 * bobAmp;
    // recoil decay
    this.kick = THREE.MathUtils.damp(this.kick, 0, 11, dt);
    this.kickRot = THREE.MathUtils.damp(this.kickRot, 0, 9, dt);
    this.landDip = THREE.MathUtils.damp(this.landDip, 0, 7, dt);
    this.slideBack = THREE.MathUtils.damp(this.slideBack, 0, 16, dt);

    // base pose interp
    const pos = new THREE.Vector3().lerpVectors(m.hip.pos, m.ads.pos, aim);
    const rot = new THREE.Euler(
      THREE.MathUtils.lerp(m.hip.rot.x, m.ads.rot.x, aim),
      THREE.MathUtils.lerp(m.hip.rot.y, m.ads.rot.y, aim),
      THREE.MathUtils.lerp(m.hip.rot.z, m.ads.rot.z, aim),
    );

    // phase-driven offsets
    const t = rig.phaseT;
    const dur = Math.max(0.001, rig.phaseDur);
    const p = THREE.MathUtils.clamp(t / dur, 0, 1);
    let phasePosY = 0;
    let phasePosZ = 0;
    let phaseRotX = 0;
    let phaseRotZ = 0;
    if (rig.phase === 'draw') {
      const e = 1 - Math.pow(1 - p, 2.4);
      phasePosY = -0.24 * (1 - e);
      phaseRotX = -0.9 * (1 - e);
      phaseRotZ = 0.35 * (1 - e);
    } else if (rig.phase === 'holster') {
      const e = p * p;
      phasePosY = -0.24 * e;
      phaseRotX = -0.8 * e;
    } else if (rig.phase === 'reload') {
      // three-stage: mag out (0..0.35), mag in (0.35..0.75), chamber (0.75..1)
      if (m.mag) {
        if (p < 0.35) {
          const k = p / 0.35;
          m.mag.position.y = m.magHome.y - k * 0.24;
          m.mag.position.z = m.magHome.z + k * 0.06;
          m.mag.visible = k < 0.92;
        } else if (p < 0.75) {
          const k = (p - 0.35) / 0.4;
          m.mag.visible = k > 0.25;
          m.mag.position.y = m.magHome.y - (1 - k) * 0.24;
          m.mag.position.z = m.magHome.z + (1 - k) * 0.06;
        } else {
          m.mag.position.copy(m.magHome);
          m.mag.visible = true;
          if (rig.reloadingEmpty && m.slide) {
            const k = (p - 0.75) / 0.25;
            this.slideBack = Math.sin(Math.min(1, k) * Math.PI);
          }
        }
      }
      phaseRotX = -0.28 * Math.sin(p * Math.PI);
      phaseRotZ = 0.14 * Math.sin(p * Math.PI);
      phasePosY = -0.05 * Math.sin(p * Math.PI);
    } else if (rig.phase === 'melee') {
      const e = Math.sin(p * Math.PI);
      phasePosZ = -0.22 * e;
      phaseRotX = 0.35 * e;
      phaseRotZ = -0.3 * e;
    } else if (rig.phase === 'throw') {
      const e = Math.sin(p * Math.PI);
      phasePosZ = -0.16 * e;
      phasePosY = 0.06 * e;
      phaseRotX = 0.8 * e;
    } else if (m.mag) {
      m.mag.position.copy(m.magHome);
      m.mag.visible = true;
    }

    // slide/pump animation
    if (m.slide && this.currentId !== 'br8') {
      m.slide.position.z = (m.slide.userData.homeZ ?? (m.slide.userData.homeZ = m.slide.position.z)) + this.slideBack * 0.035;
    } else if (m.slide && this.currentId === 'br8') {
      m.slide.position.z = (m.slide.userData.homeZ ?? (m.slide.userData.homeZ = m.slide.position.z)) + Math.sin(Math.min(1, (1 - this.slideBack)) * Math.PI) * 0 + this.slideBack * 0.09;
    }

    const kickZ = this.kick * (0.035 + (this.currentId === 'br8' || this.currentId === 'lr30' ? 0.045 : 0));
    this.group.position.set(
      pos.x + this.swayX + bobX,
      pos.y + this.swayY + bobY - this.landDip * 0.05 + phasePosY,
      pos.z + kickZ + phasePosZ,
    );
    this.group.rotation.set(
      rot.x + this.kickRot * 0.05 + this.swayY * 1.6 + phaseRotX - this.landDip * 0.08,
      rot.y + this.swayX * 2.2,
      rot.z + this.swayX * 1.2 + phaseRotZ,
    );
  }

  /** muzzle world position approximated from player pose (world scene space). */
  muzzleWorld(player: Player, out = new THREE.Vector3()): THREE.Vector3 {
    const f = player.forward(new THREE.Vector3());
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    return out.copy(player.eyePos()).addScaledVector(f, 0.55).addScaledVector(right, 0.14).add(new THREE.Vector3(0, -0.12, 0));
  }
}
