import * as THREE from 'three';
import { GunKit, type WeaponModel } from './GunKit';
import { addScrews } from './AssaultRifle';

/**
 * lmg_bulwark — belt-fed light machine gun.
 * Heavy barrel with a carry handle, top-cover feed tray, folded bipod, a box
 * mag with a visible belt of linked rounds and a big stock.
 */
export function buildLmg(kit: GunKit): WeaponModel {
  const group = new THREE.Group();
  group.name = 'lmg_bulwark';
  const boreY = 0.016;

  // Big receiver.
  const receiver = kit.box(0.06, 0.07, 0.26, 'gunmetal', 0.008);
  receiver.position.set(0, 0.02, -0.02);
  group.add(receiver);

  // Top-cover feed tray with a carry handle.
  const feedCover = kit.box(0.056, 0.02, 0.14, 'gunmetal', 0.005);
  feedCover.position.set(0, 0.06, -0.02);
  group.add(feedCover);
  const carryHandle = new THREE.Group();
  const hTop = kit.box(0.02, 0.012, 0.09, 'black', 0.004);
  hTop.position.set(0, 0.11, -0.02);
  carryHandle.add(hTop);
  for (const z of [-0.05, 0.03]) {
    const strut = kit.box(0.014, 0.04, 0.012, 'black', 0.003);
    strut.position.set(0, 0.09, -0.02 + z * 0.4);
    carryHandle.add(strut);
  }
  group.add(carryHandle);

  // Heavy fluted barrel + flash hider.
  const barrel = kit.tubeZ(0.016, 0.018, 0.4, 'gunmetal', 22);
  barrel.position.set(0, boreY, -0.48);
  group.add(barrel);
  for (let i = 0; i < 8; i++) {
    // Cooling fins near the chamber.
    const fin = kit.cylY(0.022, 0.022, 0.004, 'gunmetal', 18);
    fin.rotation.x = Math.PI / 2;
    fin.position.set(0, boreY, -0.3 - i * 0.012);
    group.add(fin);
  }
  const flash = kit.muzzleDevice(0.014, 'gunmetal');
  flash.position.set(0, boreY, -0.68);
  group.add(flash);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, boreY, -0.73);
  group.add(muzzle);

  // Bipod (folded forward under the barrel).
  const bipodBase = kit.box(0.024, 0.024, 0.03, 'black', 0.004);
  bipodBase.position.set(0, -0.02, -0.5);
  group.add(bipodBase);
  for (const s of [-1, 1]) {
    const leg = kit.tubeZ(0.006, 0.006, 0.16, 'gunmetal', 10);
    leg.position.set(s * 0.012, -0.03, -0.52);
    leg.rotation.x = -1.4;
    group.add(leg);
  }

  // Sights.
  const rail = kit.picatinnyRail(0.1, 0.02, 'black');
  rail.position.set(0, 0.072, -0.12);
  group.add(rail);
  const rearAperture = kit.tubeZ(0.006, 0.006, 0.008, 'gunmetal', 14, true);
  rearAperture.rotation.x = Math.PI / 2;
  rearAperture.position.set(0, 0.086, 0.06);
  group.add(rearAperture);
  const frontPost = kit.box(0.003, 0.02, 0.003, 'black', 0);
  frontPost.position.set(0, 0.086, -0.3);
  group.add(frontPost);
  const sightPoint = new THREE.Object3D();
  sightPoint.position.set(0, 0.086, 0.06);
  group.add(sightPoint);

  // Pistol grip + trigger.
  const grip = kit.pistolGrip('polymer_grey', 0.3, 0.11);
  grip.position.set(0, -0.03, 0.06);
  group.add(grip);
  const tg = kit.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.018, 0.03);
  group.add(tg.group);

  // Big stock.
  const stock = kit.fixedStock('polymer_grey', 0.24);
  stock.position.set(0, 0.02, 0.1);
  group.add(stock);

  // Box mag with a visible belt of linked rounds.
  const box = kit.magazine(100, 'fde');
  box.position.set(0, -0.06, 0.0);
  group.add(box);
  // Belt links leading up into the feed tray.
  for (let i = 0; i < 8; i++) {
    const round = kit.tubeZ(0.005, 0.005, 0.02, 'brass', 8);
    round.rotation.x = Math.PI / 2;
    round.position.set(-0.03 + i * 0.001, 0.0 - i * 0.006, -0.02 - i * 0.004);
    group.add(round);
    const link = kit.box(0.006, 0.006, 0.006, 'gunmetal', 0.001);
    link.position.set(-0.03 + i * 0.001, 0.006 - i * 0.006, -0.02 - i * 0.004);
    group.add(link);
  }

  addScrews(kit, group, [
    [0.03, 0.02, -0.02],
    [-0.03, 0.02, -0.02],
    [0.03, 0.02, -0.16],
    [0.03, 0.0, 0.06],
  ]);

  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.06, 0.065);
  group.add(gripRear);
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, -0.03, -0.4);
  group.add(gripFront);
  const ejectPoint = new THREE.Object3D();
  ejectPoint.position.set(0.034, 0.01, -0.02);
  group.add(ejectPoint);

  return {
    id: 'lmg_bulwark',
    group,
    muzzle,
    sightPoint,
    adsDepth: 0.2,
    mag: box,
    trigger: tg.trigger,
    gripRear,
    gripFront,
    ejectPoint,
    flashScale: 1.3,
  };
}
