import * as THREE from 'three';
import { GunKit, type WeaponModel } from './GunKit';

/**
 * ar_wolverine — M4/416-style carbine.
 * Flat-top receiver with a full-length top rail, quad-rail handguard,
 * collapsible stock, red-dot optic and a 30-round STANAG magazine.
 */
export function buildAssaultRifle(kit: GunKit): WeaponModel {
  const group = new THREE.Group();
  group.name = 'ar_wolverine';

  const boreY = 0.012;

  // --- Upper + lower receiver ------------------------------------------------
  const upper = kit.box(0.046, 0.05, 0.22, 'gunmetal', 0.006);
  upper.position.set(0, 0.03, -0.03);
  group.add(upper);

  const lower = kit.box(0.042, 0.045, 0.14, 'black', 0.006);
  lower.position.set(0, -0.002, 0.0);
  group.add(lower);

  // Magwell flares into the lower.
  const magwell = kit.box(0.03, 0.05, 0.05, 'black', 0.004);
  magwell.position.set(0, -0.02, -0.02);
  group.add(magwell);

  // --- Full-length top rail --------------------------------------------------
  const rail = kit.picatinnyRail(0.36, 0.022, 'black');
  rail.position.set(0, 0.055, -0.06);
  group.add(rail);

  // --- Quad-rail handguard ---------------------------------------------------
  const handguard = kit.box(0.05, 0.05, 0.17, 'black', 0.006);
  handguard.position.set(0, 0.02, -0.24);
  group.add(handguard);
  // Side rails (slots) on the handguard.
  for (const s of [-1, 1]) {
    const side = kit.picatinnyRail(0.15, 0.014, 'black');
    side.rotation.z = s * Math.PI * 0.5;
    side.position.set(s * 0.027, 0.02, -0.24);
    group.add(side);
  }
  const bottomRail = kit.picatinnyRail(0.15, 0.014, 'black');
  bottomRail.rotation.z = Math.PI;
  bottomRail.position.set(0, -0.006, -0.24);
  group.add(bottomRail);

  // --- Barrel + muzzle -------------------------------------------------------
  const barrel = kit.tubeZ(0.008, 0.009, 0.14, 'steel', 18);
  barrel.position.set(0, boreY, -0.28);
  group.add(barrel);
  const gasBlock = kit.box(0.016, 0.02, 0.02, 'gunmetal', 0.002);
  gasBlock.position.set(0, boreY + 0.008, -0.3);
  group.add(gasBlock);
  const gasTube = kit.tubeZ(0.0025, 0.0025, 0.14, 'steel', 8);
  gasTube.position.set(0, boreY + 0.014, -0.28);
  group.add(gasTube);

  const muzzleDevice = kit.muzzleDevice(0.009, 'gunmetal');
  muzzleDevice.position.set(0, boreY, -0.36);
  group.add(muzzleDevice);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, boreY, -0.41);
  group.add(muzzle);

  // --- Red-dot optic + co-witness iron sights --------------------------------
  const optic = kit.redDot('black', 0xff2e2e);
  optic.position.set(0, 0.062, 0.02);
  group.add(optic);

  const sightPoint = new THREE.Object3D();
  // Centre of the red-dot glass/reticle.
  sightPoint.position.set(0, 0.082, 0.015);
  group.add(sightPoint);

  // Flip-up backup front sight on the gas block for detail.
  const irons = kit.ironSights('gunmetal');
  irons.group.position.set(0, 0.056, -0.3);
  group.add(irons.group);

  // --- Pistol grip + trigger -------------------------------------------------
  const grip = kit.pistolGrip('polymer_grey', 0.32, 0.1);
  grip.position.set(0, -0.024, 0.045);
  group.add(grip);

  const tg = kit.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.01, 0.02);
  group.add(tg.group);

  // --- Collapsible stock -----------------------------------------------------
  const stock = kit.collapsibleStock('polymer_grey');
  stock.position.set(0, 0.01, 0.06);
  group.add(stock);

  // --- Charging handle + ejection port ---------------------------------------
  const charging = kit.box(0.03, 0.012, 0.02, 'gunmetal', 0.003);
  charging.position.set(0, 0.05, 0.075);
  group.add(charging);

  const ejectionPort = new THREE.Group();
  const cover = kit.box(0.03, 0.022, 0.004, 'gunmetal', 0.002);
  cover.position.set(0.024, 0.028, -0.02);
  ejectionPort.add(cover);
  group.add(ejectionPort);

  const forwardAssist = kit.cylY(0.005, 0.005, 0.014, 'gunmetal', 10);
  forwardAssist.rotation.z = Math.PI / 2;
  forwardAssist.position.set(0.026, 0.02, 0.01);
  group.add(forwardAssist);

  // Fire selector + mag release studs.
  const selector = kit.cylY(0.006, 0.006, 0.01, 'black', 10);
  selector.rotation.z = Math.PI / 2;
  selector.position.set(-0.022, 0.0, 0.03);
  group.add(selector);
  const magRelease = kit.box(0.008, 0.008, 0.008, 'black', 0.002);
  magRelease.position.set(0.022, -0.006, -0.02);
  group.add(magRelease);

  // --- Magazine --------------------------------------------------------------
  const mag = kit.magazine(30, 'polymer_grey');
  mag.position.set(0, -0.045, -0.02);
  mag.rotation.x = 0.12;
  group.add(mag);

  // --- Detailing: screws, QD sockets, sling ----------------------------------
  addScrews(kit, group, [
    [0.024, 0.03, -0.02],
    [0.024, 0.03, -0.14],
    [-0.024, 0.03, -0.02],
    [0.026, 0.02, -0.2],
    [-0.026, 0.02, -0.2],
  ]);
  const qd = kit.qdSocket('steel');
  qd.rotation.y = Math.PI / 2;
  qd.position.set(0.028, 0.0, 0.055);
  group.add(qd);

  // --- Grip anchors for the hands --------------------------------------------
  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.05, 0.05);
  group.add(gripRear);
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, -0.03, -0.24);
  group.add(gripFront);

  const ejectPoint = new THREE.Object3D();
  ejectPoint.position.set(0.03, 0.028, -0.02);
  group.add(ejectPoint);

  return {
    id: 'ar_wolverine',
    group,
    muzzle,
    sightPoint,
    adsDepth: 0.2,
    charging,
    chargingTravel: 0.03,
    ejectionPort,
    mag,
    trigger: tg.trigger,
    gripRear,
    gripFront,
    ejectPoint,
    flashScale: 1.0,
  };
}

export function addScrews(kit: GunKit, group: THREE.Group, positions: [number, number, number][]) {
  for (const [x, y, z] of positions) {
    const s = kit.screw(0.0028, 'steel');
    s.position.set(x, y, z);
    group.add(s);
  }
}
