import * as THREE from 'three';
import { GunKit, type WeaponModel } from './GunKit';
import { addScrews } from './AssaultRifle';

/**
 * shotgun_breacher — pump-action.
 * Tube magazine under the barrel, ribbed forend (the pump), heat shield with
 * ghost-ring sights and a side saddle of spare shells.
 */
export function buildShotgun(kit: GunKit): WeaponModel {
  const group = new THREE.Group();
  group.name = 'shotgun_breacher';
  const boreY = 0.02;

  // Receiver.
  const receiver = kit.box(0.05, 0.06, 0.16, 'gunmetal', 0.008);
  receiver.position.set(0, 0.01, 0.0);
  group.add(receiver);

  // Barrel (large bore).
  const barrel = kit.tubeZ(0.018, 0.019, 0.38, 'gunmetal', 22);
  barrel.position.set(0, boreY, -0.44);
  group.add(barrel);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, boreY, -0.62);
  group.add(muzzle);

  // Heat shield with vent slots over the barrel.
  const shield = kit.tubeZ(0.024, 0.024, 0.24, 'black', 18, true);
  shield.position.set(0, boreY, -0.38);
  group.add(shield);
  for (let i = 0; i < 6; i++) {
    const vent = kit.box(0.006, 0.03, 0.006, 'black', 0);
    vent.position.set(0, boreY + 0.024, -0.3 - i * 0.03);
    group.add(vent);
  }

  // Tube magazine under the barrel.
  const tube = kit.tubeZ(0.014, 0.014, 0.34, 'gunmetal', 18);
  tube.position.set(0, boreY - 0.036, -0.4);
  group.add(tube);
  const tubeCap = kit.tubeZ(0.016, 0.016, 0.02, 'black', 14);
  tubeCap.position.set(0, boreY - 0.036, -0.55);
  group.add(tubeCap);

  // Ribbed forend (the pump) — this slides.
  const forend = new THREE.Group();
  const forendBody = kit.box(0.05, 0.05, 0.12, 'polymer_grey', 0.008);
  forend.add(forendBody);
  for (let i = 0; i < 6; i++) {
    const rib = kit.box(0.052, 0.008, 0.006, 'black', 0.001);
    rib.position.set(0, -0.02, -0.045 + i * 0.018);
    forend.add(rib);
  }
  forend.position.set(0, boreY - 0.018, -0.34);
  group.add(forend);

  // Ghost-ring sights.
  const rearRing = kit.tubeZ(0.008, 0.008, 0.008, 'gunmetal', 16, true);
  rearRing.rotation.x = Math.PI / 2;
  rearRing.position.set(0, 0.05, 0.05);
  group.add(rearRing);
  const frontBlade = kit.box(0.004, 0.018, 0.004, 'black', 0);
  frontBlade.position.set(0, 0.05, -0.22);
  group.add(frontBlade);
  const frontWing = kit.tubeZ(0.008, 0.008, 0.012, 'gunmetal', 12, true);
  frontWing.rotation.x = Math.PI / 2;
  frontWing.position.set(0, 0.05, -0.22);
  group.add(frontWing);

  const sightPoint = new THREE.Object3D();
  sightPoint.position.set(0, 0.05, 0.05);
  group.add(sightPoint);

  // Stock + grip (single-piece pistol-grip stock).
  const grip = kit.pistolGrip('polymer_grey', 0.36, 0.1);
  grip.position.set(0, -0.026, 0.05);
  group.add(grip);
  const tg = kit.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.012, 0.03);
  group.add(tg.group);
  const stockTube = kit.box(0.04, 0.06, 0.18, 'polymer_grey', 0.01);
  stockTube.position.set(0, 0.01, 0.14);
  group.add(stockTube);
  const pad = kit.box(0.045, 0.1, 0.016, 'rubber', 0.006);
  pad.position.set(0, 0.0, 0.23);
  group.add(pad);

  // Side saddle of spare shells.
  for (let i = 0; i < 4; i++) {
    const shell = kit.tubeZ(0.009, 0.009, 0.05, 'brass', 12);
    shell.position.set(-0.03, 0.02, 0.02 - i * 0.016);
    shell.rotation.x = Math.PI; // face rearward
    const hull = kit.tubeZ(0.0095, 0.0095, 0.03, 'polymer_grey', 12);
    hull.position.set(-0.03, 0.02, 0.0 - i * 0.016);
    group.add(shell);
    group.add(hull);
  }

  addScrews(kit, group, [
    [0.026, 0.02, 0.02],
    [-0.026, 0.02, 0.02],
    [0.026, 0.01, -0.04],
  ]);

  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.05, 0.055);
  group.add(gripRear);
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, boreY - 0.05, -0.34);
  group.add(gripFront);
  const ejectPoint = new THREE.Object3D();
  ejectPoint.position.set(0.03, 0.02, 0.0);
  group.add(ejectPoint);

  return {
    id: 'shotgun_breacher',
    group,
    muzzle,
    sightPoint,
    adsDepth: 0.19,
    action: forend,
    actionTravel: 0.06,
    trigger: tg.trigger,
    gripRear,
    gripFront,
    ejectPoint,
    flashScale: 1.5,
  };
}
