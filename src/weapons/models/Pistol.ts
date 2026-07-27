import * as THREE from 'three';
import { GunKit, type WeaponModel } from './GunKit';

/**
 * pistol_sidearm — striker-fired handgun.
 * Slide with rear/front cocking serrations, accessory rail, beavertail and a
 * visible chamber. The slide reciprocates on fire.
 */
export function buildPistol(kit: GunKit): WeaponModel {
  const group = new THREE.Group();
  group.name = 'pistol_sidearm';
  const boreY = 0.02;

  // Polymer frame.
  const frame = kit.box(0.026, 0.03, 0.16, 'polymer_grey', 0.004);
  frame.position.set(0, 0.006, -0.04);
  group.add(frame);

  // Slide (reciprocates).
  const slide = new THREE.Group();
  const slideBody = kit.box(0.028, 0.032, 0.17, 'gunmetal', 0.004);
  slide.add(slideBody);
  // Rear + front cocking serrations.
  for (let i = 0; i < 6; i++) {
    const ser = kit.box(0.03, 0.026, 0.003, 'black', 0);
    ser.position.set(0, 0, 0.05 + i * 0.006);
    slide.add(ser);
  }
  for (let i = 0; i < 4; i++) {
    const ser = kit.box(0.03, 0.026, 0.003, 'black', 0);
    ser.position.set(0, 0, -0.05 - i * 0.006);
    slide.add(ser);
  }
  // Ejection port + visible chamber.
  const port = kit.box(0.03, 0.014, 0.03, 'black', 0.002);
  port.position.set(0.006, 0.008, -0.02);
  slide.add(port);
  slide.position.set(0, boreY, -0.04);
  group.add(slide);

  // Barrel hood peeking from the port.
  const barrel = kit.tubeZ(0.008, 0.008, 0.02, 'steel', 14);
  barrel.position.set(0, boreY, -0.12);
  group.add(barrel);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, boreY, -0.125);
  group.add(muzzle);

  // Accessory rail under the dust cover.
  const rail = kit.picatinnyRail(0.05, 0.012, 'black');
  rail.rotation.z = Math.PI;
  rail.position.set(0, boreY - 0.02, -0.1);
  group.add(rail);

  // Sights: rear notch + front post (aligned on the bore centreline).
  const rearNotch = kit.box(0.016, 0.008, 0.006, 'black', 0.001);
  rearNotch.position.set(0, boreY + 0.02, 0.03);
  group.add(rearNotch);
  const frontPost = kit.box(0.003, 0.008, 0.004, 'black', 0);
  frontPost.position.set(0, boreY + 0.02, -0.11);
  group.add(frontPost);
  const sightPoint = new THREE.Object3D();
  sightPoint.position.set(0, boreY + 0.022, 0.03);
  group.add(sightPoint);

  // Grip with beavertail + trigger.
  const grip = kit.pistolGrip('polymer_grey', 0.3, 0.1);
  grip.position.set(0, -0.02, 0.0);
  group.add(grip);
  const beaver = kit.box(0.022, 0.014, 0.02, 'polymer_grey', 0.004);
  beaver.position.set(0, 0.014, 0.04);
  group.add(beaver);
  const tg = kit.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.006, -0.02);
  group.add(tg.group);

  // Magazine in the grip.
  const mag = kit.magazine(15, 'black');
  mag.position.set(0, -0.03, 0.0);
  group.add(mag);
  const magBase = kit.box(0.028, 0.01, 0.04, 'black', 0.003);
  magBase.position.set(0, -0.12, 0.0);
  group.add(magBase);

  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.05, 0.0);
  group.add(gripRear);
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, -0.03, -0.02);
  group.add(gripFront);
  const ejectPoint = new THREE.Object3D();
  ejectPoint.position.set(0.026, boreY + 0.008, -0.02);
  group.add(ejectPoint);

  return {
    id: 'pistol_sidearm',
    group,
    muzzle,
    sightPoint,
    adsDepth: 0.16,
    action: slide,
    actionTravel: 0.03,
    mag,
    trigger: tg.trigger,
    gripRear,
    gripFront,
    ejectPoint,
    flashScale: 0.8,
  };
}
