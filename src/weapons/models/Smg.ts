import * as THREE from 'three';
import { GunKit, type WeaponModel } from './GunKit';
import { addScrews } from './AssaultRifle';

/**
 * smg_viper — MP5/MPX-style compact SMG.
 * Top-folding single-strut stock, tri-lug muzzle, vertical foregrip, short mag,
 * hooded front post + drum rear sight.
 */
export function buildSmg(kit: GunKit): WeaponModel {
  const group = new THREE.Group();
  group.name = 'smg_viper';
  const boreY = 0.014;

  const receiver = kit.box(0.044, 0.052, 0.19, 'gunmetal', 0.008);
  receiver.position.set(0, 0.02, -0.02);
  group.add(receiver);
  // Distinctive ribbed cocking-tube on top-left.
  const cockTube = kit.tubeZ(0.01, 0.01, 0.18, 'gunmetal', 16);
  cockTube.position.set(0, 0.05, -0.06);
  group.add(cockTube);
  const cockHandle = kit.box(0.014, 0.012, 0.02, 'black', 0.003);
  cockHandle.position.set(-0.014, 0.05, 0.02);
  group.add(cockHandle);

  // Handguard + vertical foregrip.
  const handguard = kit.box(0.04, 0.036, 0.11, 'black', 0.006);
  handguard.position.set(0, 0.006, -0.16);
  group.add(handguard);
  const foregrip = kit.pistolGrip('polymer_grey', 0.0, 0.07);
  foregrip.position.set(0, -0.02, -0.17);
  group.add(foregrip);

  // Barrel + tri-lug muzzle.
  const barrel = kit.tubeZ(0.008, 0.009, 0.09, 'steel', 16);
  barrel.position.set(0, boreY, -0.21);
  group.add(barrel);
  const triLug = kit.tubeZ(0.014, 0.014, 0.024, 'gunmetal', 18);
  triLug.position.set(0, boreY, -0.26);
  group.add(triLug);
  for (let i = 0; i < 3; i++) {
    const lug = kit.box(0.006, 0.006, 0.02, 'gunmetal', 0.001);
    const a = (i / 3) * Math.PI * 2;
    lug.position.set(Math.cos(a) * 0.013, boreY + Math.sin(a) * 0.013, -0.26);
    group.add(lug);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, boreY, -0.28);
  group.add(muzzle);

  // Sights: hooded front post + drum rear.
  const rearDrum = kit.cylY(0.012, 0.012, 0.012, 'gunmetal', 14);
  rearDrum.position.set(0, 0.058, 0.03);
  group.add(rearDrum);
  const rearHole = kit.tubeZ(0.003, 0.003, 0.014, 'black', 10, true);
  rearHole.position.set(0, 0.062, 0.03);
  group.add(rearHole);
  const frontHood = kit.tubeZ(0.01, 0.01, 0.016, 'gunmetal', 14, true);
  frontHood.rotation.x = Math.PI / 2;
  frontHood.position.set(0, 0.06, -0.2);
  group.add(frontHood);
  const frontPost = kit.box(0.002, 0.016, 0.002, 'black', 0);
  frontPost.position.set(0, 0.056, -0.2);
  group.add(frontPost);

  const sightPoint = new THREE.Object3D();
  sightPoint.position.set(0, 0.062, 0.03);
  group.add(sightPoint);

  // Pistol grip + trigger.
  const grip = kit.pistolGrip('polymer_grey', 0.34, 0.1);
  grip.position.set(0, -0.024, 0.04);
  group.add(grip);
  const tg = kit.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.01, 0.02);
  group.add(tg.group);

  // Top-folding stock (single strut with a butt).
  const strut = kit.tubeZ(0.008, 0.008, 0.18, 'gunmetal', 12);
  strut.position.set(-0.012, 0.03, 0.12);
  group.add(strut);
  const strut2 = kit.tubeZ(0.008, 0.008, 0.18, 'gunmetal', 12);
  strut2.position.set(0.012, 0.03, 0.12);
  group.add(strut2);
  const butt = kit.box(0.05, 0.03, 0.016, 'gunmetal', 0.004);
  butt.position.set(0, 0.03, 0.22);
  group.add(butt);

  // Short curved mag.
  const mag = kit.magazine(20, 'gunmetal');
  mag.position.set(0, -0.04, -0.02);
  mag.rotation.x = 0.18;
  group.add(mag);

  addScrews(kit, group, [
    [0.023, 0.02, -0.02],
    [0.023, 0.02, -0.12],
    [-0.023, 0.02, -0.02],
  ]);

  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.05, 0.045);
  group.add(gripRear);
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, -0.06, -0.17);
  group.add(gripFront);
  const ejectPoint = new THREE.Object3D();
  ejectPoint.position.set(0.028, 0.03, -0.02);
  group.add(ejectPoint);

  return {
    id: 'smg_viper',
    group,
    muzzle,
    sightPoint,
    adsDepth: 0.18,
    charging: cockHandle,
    chargingTravel: 0.025,
    mag,
    trigger: tg.trigger,
    gripRear,
    gripFront,
    ejectPoint,
    flashScale: 0.85,
  };
}
