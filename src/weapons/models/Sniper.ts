import * as THREE from 'three';
import { GunKit, type WeaponModel } from './GunKit';
import { addScrews } from './AssaultRifle';

/**
 * sniper_longbow — bolt-action precision rifle.
 * Long fluted heavy barrel, large scope on tall mounts, adjustable cheek riser,
 * folded bipod and a prominent bolt handle.
 */
export function buildSniper(kit: GunKit): WeaponModel {
  const group = new THREE.Group();
  group.name = 'sniper_longbow';
  const boreY = 0.01;

  // Chassis / stock body.
  const chassis = kit.box(0.05, 0.06, 0.34, 'fde', 0.008);
  chassis.position.set(0, 0.01, -0.02);
  group.add(chassis);
  const buttArea = kit.box(0.046, 0.08, 0.16, 'fde', 0.01);
  buttArea.position.set(0, 0.0, 0.16);
  group.add(buttArea);

  // Adjustable cheek riser.
  const cheek = kit.box(0.03, 0.024, 0.12, 'polymer_grey', 0.006);
  cheek.position.set(0, 0.05, 0.14);
  group.add(cheek);
  for (const z of [0.1, 0.19]) {
    const postL = kit.cylY(0.004, 0.004, 0.03, 'gunmetal', 8);
    postL.position.set(-0.012, 0.038, z);
    group.add(postL);
    const postR = kit.cylY(0.004, 0.004, 0.03, 'gunmetal', 8);
    postR.position.set(0.012, 0.038, z);
    group.add(postR);
  }
  const pad = kit.box(0.05, 0.1, 0.018, 'rubber', 0.006);
  pad.position.set(0, 0.0, 0.24);
  group.add(pad);

  // Long fluted heavy barrel.
  const barrel = kit.tubeZ(0.013, 0.015, 0.42, 'gunmetal', 24);
  barrel.position.set(0, boreY, -0.5);
  group.add(barrel);
  // Flutes.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const flute = kit.box(0.003, 0.003, 0.34, 'black', 0);
    flute.position.set(Math.cos(a) * 0.013, boreY + Math.sin(a) * 0.013, -0.48);
    group.add(flute);
  }
  const brake = kit.muzzleDevice(0.012, 'gunmetal');
  brake.position.set(0, boreY, -0.72);
  group.add(brake);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, boreY, -0.77);
  group.add(muzzle);

  // Handguard / fore-end with M-LOK look.
  const foreend = kit.box(0.045, 0.05, 0.22, 'fde', 0.008);
  foreend.position.set(0, 0.005, -0.34);
  group.add(foreend);

  // Big scope on tall rings.
  const rail = kit.picatinnyRail(0.22, 0.022, 'black');
  rail.position.set(0, 0.048, -0.05);
  group.add(rail);
  const scope = kit.scope(0.26, 'black', 0x000000);
  scope.position.set(0, 0.086, -0.05);
  group.add(scope);

  const sightPoint = new THREE.Object3D();
  // Ocular lens centre (rear of the scope).
  sightPoint.position.set(0, 0.086, 0.21);
  group.add(sightPoint);

  // Bolt handle (rotates up / pulls back).
  const boltHandle = new THREE.Group();
  const boltArm = kit.cylY(0.004, 0.004, 0.03, 'steel', 8);
  boltArm.rotation.z = Math.PI / 2;
  boltArm.position.set(0.02, 0, 0);
  boltHandle.add(boltArm);
  const boltKnob = kit.cylY(0.008, 0.008, 0.012, 'steel', 12);
  boltKnob.rotation.z = Math.PI / 2;
  boltKnob.position.set(0.035, 0, 0);
  boltHandle.add(boltKnob);
  boltHandle.position.set(0.02, 0.03, 0.05);
  group.add(boltHandle);

  // Pistol grip + trigger.
  const grip = kit.pistolGrip('polymer_grey', 0.22, 0.11);
  grip.position.set(0, -0.028, 0.05);
  group.add(grip);
  const tg = kit.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.016, 0.02);
  group.add(tg.group);

  // Folded bipod under the fore-end.
  const bipodBase = kit.box(0.02, 0.02, 0.03, 'black', 0.003);
  bipodBase.position.set(0, -0.028, -0.42);
  group.add(bipodBase);
  for (const s of [-1, 1]) {
    const leg = kit.tubeZ(0.005, 0.005, 0.12, 'gunmetal', 10);
    leg.position.set(s * 0.01, -0.03, -0.38);
    leg.rotation.x = -1.3; // folded back along the barrel
    group.add(leg);
  }

  // 5-round detachable box mag.
  const mag = kit.magazine(15, 'gunmetal');
  mag.position.set(0, -0.05, -0.04);
  group.add(mag);

  addScrews(kit, group, [
    [0.026, 0.02, -0.04],
    [-0.026, 0.02, -0.04],
    [0.024, 0.02, 0.14],
    [0.024, 0.005, -0.34],
  ]);

  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.055, 0.055);
  group.add(gripRear);
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, -0.04, -0.34);
  group.add(gripFront);
  const ejectPoint = new THREE.Object3D();
  ejectPoint.position.set(0.03, 0.02, 0.02);
  group.add(ejectPoint);

  return {
    id: 'sniper_longbow',
    group,
    muzzle,
    sightPoint,
    adsDepth: 0.11,
    boltHandle,
    action: boltHandle,
    actionTravel: 0.04,
    mag,
    trigger: tg.trigger,
    gripRear,
    gripFront,
    ejectPoint,
    flashScale: 1.4,
  };
}
