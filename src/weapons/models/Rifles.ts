import * as THREE from 'three';
import type { Rng } from '../../core/MathUtils';
import {
  addMarkings,
  addSerial,
  addWear,
  buildBarrel,
  buildChamberedCase,
  buildCollapsibleStock,
  buildEjectionPort,
  buildBlockStock,
  buildFlashHider,
  buildGasBlock,
  buildHandguard,
  buildMuzzleBrake,
  buildPistolGrip,
  buildQdSocket,
  buildRibbedForend,
  buildSlingLoop,
  buildStanagMag,
  buildTakedownPin,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import type { GunPalette } from './Materials';
import { buildAcog, buildFrontSight, buildHolo, buildRearSight, frontPostFor, ironSightLine } from './Optics';
import { Assembler, boxGeo, cylGeo, cylGeoX, cylGeoY, latheZ, railGeo, roundBoxGeo } from './Parts';
import type { WeaponBuild } from './WeaponModel';

/**
 * Assault rifles.
 *
 * Proportions come from the real hardware: the carbine is 840 mm from butt pad
 * to muzzle with a 368 mm barrel, the AK 900 mm, the bullpup 790 mm. Getting the
 * overall length and the relationship between the bore, the sight line and the
 * grip right is what makes a procedural gun read as observed rather than
 * invented — those are the ratios the eye knows even when the player could not
 * name a single part.
 *
 * Weapon space: bore on y = 0, -Z downrange, origin above the magazine well.
 */

export interface RifleContext {
  pal: GunPalette;
  rng: Rng;
}

/** M4-pattern carbine: flat-top upper, free-float rail, collapsible stock. */
export function buildMk4Carbine({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('mk4');
  const railTop = 0.0307;

  // --- upper receiver -------------------------------------------------------
  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.038, 0.042, 0.24, 0.004, 2), pal.metal, [0, 0.004, 0.058]));
  // Upper/lower joint fillet and the charging-handle raceway on top.
  receiver.add(mesh(boxGeo(0.03, 0.01, 0.235, 0.0016), pal.metal, [0, 0.026, 0.06]));
  // Forward assist and brass deflector, the two bumps that identify an AR upper.
  receiver.add(mesh(cylGeo(0.0072, 0.0072, 0.02, 12), pal.metalDark, [0.0125, 0.017, 0.168]));
  receiver.add(mesh(cylGeo(0.0052, 0.0052, 0.012, 10), pal.metalWorn, [0.0125, 0.017, 0.178]));
  receiver.add(mesh(roundBoxGeo(0.008, 0.018, 0.026, 0.005, 2), pal.metal, [0.018, 0.012, 0.107]));
  // Barrel nut shroud at the front of the upper.
  receiver.add(mesh(latheZ([[0.016, 0], [0.019, 0.004], [0.019, 0.016], [0.0165, 0.02]], 18), pal.metalDark, [0, 0, -0.05]));
  receiver.add(mesh(boxGeo(0.02, 0.03, 0.014, 0.0022), pal.metalDark, [0, 0.008, -0.058]));

  const upperRail = asm.part('upperRail');
  upperRail.add(mesh(railGeo(0.222), pal.metal, [0, railTop, 0.062]));

  // --- barrel group ---------------------------------------------------------
  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.42, breechR: 0.0118, muzzleR: 0.0088, threadAt: 0.396 });
  barrelGroup.position.z = -0.055;
  barrel.add(barrelGroup);

  const muzzle = asm.part('muzzleDevice');
  const hider = buildFlashHider(pal, { bodyR: 0.0112, length: 0.048, boreR: 0.0041 });
  hider.position.z = -0.477;
  muzzle.add(hider);

  const gas = asm.part('gasBlock');
  const gasBlock = buildGasBlock(pal, { width: 0.022, height: 0.03, depth: 0.032, tube: 0.245 });
  gasBlock.position.z = -0.325;
  gas.add(gasBlock);

  const handguard = asm.part('handguard');
  // 13.5 in of rail over a 14.5 in barrel, which is how a current carbine is
  // built: only the muzzle device and a thumb's width of barrel stay exposed.
  const hgGroup = buildHandguard(pal, { length: 0.345, radius: 0.031, rail: true, slotRows: 3, facets: 14 });
  hgGroup.position.z = -0.062;
  handguard.add(hgGroup);
  const qd = buildQdSocket(pal);
  qd.position.set(-0.022, -0.014, -0.14);
  handguard.add(qd);

  // --- lower receiver ------------------------------------------------------
  const magWell = asm.part('magWell');
  // Well is a shade wider than the magazine and no deeper; the trigger housing
  // behind it is what gives an AR lower its stepped underside.
  magWell.add(mesh(roundBoxGeo(0.033, 0.058, 0.05, 0.0045, 2), pal.metal, [0, -0.044, 0.0]));
  magWell.add(mesh(roundBoxGeo(0.032, 0.036, 0.07, 0.005, 2), pal.metal, [0, -0.033, 0.058]));
  magWell.add(mesh(boxGeo(0.035, 0.013, 0.03, 0.002), pal.metal, [0, -0.017, 0.002]));
  // Flared mouth at the top of the well.
  magWell.add(mesh(roundBoxGeo(0.037, 0.009, 0.054, 0.0025, 2), pal.metal, [0, -0.019, 0.0]));
  const pinFront = buildTakedownPin(pal, 0.0042);
  pinFront.position.set(0.0165, -0.016, -0.022);
  magWell.add(pinFront);
  const pinRear = buildTakedownPin(pal, 0.0042);
  pinRear.position.set(0.0165, -0.016, 0.096);
  magWell.add(pinRear);
  // Magazine release fence and button on the right.
  magWell.add(mesh(boxGeo(0.008, 0.014, 0.014, 0.0016), pal.metal, [0.018, -0.024, 0.04]));
  const magRelease = asm.part('magRelease');
  magRelease.add(mesh(cylGeoX(0.0042, 0.005, 10), pal.metalWorn, [0.0205, -0.024, 0.04]));
  // Bolt catch on the left.
  magWell.add(mesh(boxGeo(0.006, 0.012, 0.024, 0.0012), pal.metalDark, [-0.0185, -0.02, 0.03]));

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.044, width: 0.026 });
  trigger.guard.position.set(0, -0.026, 0.062);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.026, 0.062);
  asm.part('trigger').add(trigger.trigger);

  const selector = asm.part('safetySelector');
  selector.position.set(-0.017, -0.03, 0.078);
  selector.add(mesh(cylGeoX(0.0055, 0.006, 10), pal.metalDark));
  selector.add(mesh(roundBoxGeo(0.005, 0.008, 0.026, 0.002, 1), pal.metalDark, [-0.003, -0.002, 0.012]));

  const grip = buildPistolGrip(pal, { length: 0.104, radius: 0.0182, rake: 0.31, material: pal.polymer });
  grip.group.position.set(0, -0.05, 0.09);
  asm.part('pistolGrip').add(grip.group);

  // --- stock ---------------------------------------------------------------
  const stock = asm.part('stock');
  const stockGroup = buildCollapsibleStock(pal, { tubeLength: 0.16, bodyLength: 0.145, radius: 0.0165 });
  stockGroup.position.set(0, 0.002, 0.174);
  stock.add(stockGroup);

  // --- bolt / ejection -----------------------------------------------------
  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(cylGeo(0.0112, 0.0112, 0.086, 14), pal.metalWorn, [0, 0.006, 0.062]));
  bolt.add(mesh(boxGeo(0.006, 0.012, 0.03, 0.001), pal.metalWorn, [0.011, 0.008, 0.05]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.026, 0.0075, 0.05, 0.0014), pal.metalDark, [0, 0.0225, 0.156]));
  charging.add(mesh(boxGeo(0.042, 0.0065, 0.011, 0.0014), pal.metalDark, [0, 0.0235, 0.184]));
  charging.add(mesh(boxGeo(0.01, 0.009, 0.014, 0.0016), pal.metalWorn, [-0.014, 0.0225, 0.181]));

  const port = buildEjectionPort(pal, { width: 0.036, height: 0.017, side: 1 });
  port.port.position.set(0.019, 0.008, 0.078);
  asm.part('ejectionPort').add(port.port);
  const cover = asm.part('dustCover');
  cover.position.set(0.019, 0.0, 0.078);
  cover.add(port.cover);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'rifle');
  caseGroup.position.set(0.006, 0.007, 0.03);
  chambered.add(caseGroup);

  // --- magazine ------------------------------------------------------------
  const mag = asm.part('magazine');
  const magGroup = buildStanagMag(pal, { length: 0.185, curve: 0.32, width: 0.027, depth: 0.039, material: pal.polymerDark });
  // Seated 30 mm up inside the well, so what hangs below matches a real 30-round
  // STANAG: about 215 mm from the bore axis to the floorplate, not 255.
  magGroup.position.set(0, -0.046, 0.008);
  mag.add(magGroup);

  // --- sights --------------------------------------------------------------
  const optic = buildHolo(pal, rng);
  optic.group.position.set(0, railTop, 0.078);
  asm.part('optic').add(optic.group);

  const front = buildFrontSight(pal, 0.0345, { width: 0.019 });
  front.position.set(0, railTop, -0.392);
  // Folded down out of the optic's line of sight.
  front.rotation.x = -1.42;
  asm.part('frontSight').add(front);
  const rear = buildRearSight(pal, 0.0445, true);
  rear.position.set(0, railTop, 0.158);
  rear.rotation.x = -1.45;
  asm.part('rearSight').add(rear);

  const sling = asm.part('slingMount');
  const loop = buildSlingLoop(pal, 0.0075);
  loop.position.set(0, -0.012, 0.3);
  sling.add(loop);

  // --- markings and wear ---------------------------------------------------
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0162, -0.031, 0.072],
    face: 'left',
    lines: ['SAFE FIRE AUTO'],
    height: 0.0034,
  });
  addSerial(asm.part('markings'), pal, rng, [-0.0162, -0.049, 0.03], 'left');
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [0.0192, -0.006, -0.02],
    face: 'right',
    lines: ['CAL 5.56 NATO'],
    height: 0.003,
  });
  addWear(asm.part('receiver'), pal, rng, { count: 7, center: [0.019, 0.008, 0.06], area: [0.0006, 0.014, 0.09] });
  addWear(asm.part('magWell'), pal, rng, { count: 4, center: [-0.0165, -0.04, 0.02], area: [0.0006, 0.018, 0.03] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.479]),
    sight: optic.sight,
    eject: asm.anchor('eject', [0.026, 0.012, 0.078], [0.34, -Math.PI / 2 + 0.28, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.08, 0.008]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, 0, -0.2], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    reticle: optic.reticle,
    eyeRelief: optic.eyeRelief,
    hipTrim: [0, 0, 0.01],
    travel: { bolt: 0.055, charging: 0.055, mag: 0.17 },
    gripRadius: 0.0182,
    supportRadius: 0.031,
  };
}

/** AK-pattern rifle: stamped receiver, wood furniture, long-stroke piston. */
export function buildAk74({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('ak74');

  // --- receiver ------------------------------------------------------------
  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.036, 0.052, 0.23, 0.0035, 2), pal.metal, [0, -0.004, 0.062]));
  // Stamped dust cover with its characteristic rounded crown.
  receiver.add(
    mesh(
      latheZ([[0.0206, 0], [0.0212, 0.006], [0.0212, 0.2], [0.0186, 0.212]], 12),
      pal.metal,
      [0, 0.0, 0.176],
    ),
  );
  // Rivets along the receiver flat.
  for (let i = 0; i < 4; i++) {
    receiver.add(mesh(new THREE.SphereGeometry(0.0022, 8, 6), pal.metalWorn, [0.0182, -0.016, -0.01 + i * 0.045]));
    receiver.add(mesh(new THREE.SphereGeometry(0.0022, 8, 6), pal.metalWorn, [-0.0182, -0.016, -0.01 + i * 0.045]));
  }
  // Rear sight block and the trunnion.
  receiver.add(mesh(roundBoxGeo(0.03, 0.018, 0.03, 0.003, 1), pal.metalDark, [0, 0.018, 0.096]));
  receiver.add(mesh(roundBoxGeo(0.034, 0.03, 0.03, 0.004, 2), pal.metalDark, [0, 0.0, -0.05]));

  // --- barrel and gas system ----------------------------------------------
  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.4, breechR: 0.0122, muzzleR: 0.0092, threadAt: 0.374 });
  barrelGroup.position.z = -0.06;
  barrel.add(barrelGroup);
  // Gas tube above the barrel.
  barrel.add(mesh(cylGeo(0.0072, 0.0072, 0.2, 12), pal.metalDark, [0, 0.023, -0.2]));

  const muzzle = asm.part('muzzleDevice');
  const brake = buildMuzzleBrake(pal, { bodyR: 0.0134, length: 0.072, boreR: 0.0043 });
  brake.position.z = -0.462;
  muzzle.add(brake);

  const gas = asm.part('gasBlock');
  const gasBlock = buildGasBlock(pal, { width: 0.026, height: 0.036, depth: 0.036 });
  gasBlock.position.set(0, 0.006, -0.268);
  gas.add(gasBlock);
  // Angled gas port boss.
  gas.add(mesh(cylGeo(0.009, 0.009, 0.03, 12), pal.metalDark, [0, 0.019, -0.274], [0.55, 0, 0]));
  // Front sight base / bayonet lug boss near the muzzle.
  gas.add(mesh(roundBoxGeo(0.024, 0.03, 0.026, 0.003, 2), pal.metalDark, [0, 0.008, -0.404]));

  // --- furniture -----------------------------------------------------------
  // Both handguards run all the way to the gas block, the way they do on the real
  // rifle: only a thumb's width of barrel shows between block and front sight.
  const handguard = asm.part('handguard');
  const lower = buildRibbedForend(pal, { length: 0.155, width: 0.042, height: 0.036, ribs: 5, material: pal.wood });
  lower.position.set(0, -0.019, -0.09);
  handguard.add(lower);
  const upper = buildRibbedForend(pal, { length: 0.15, width: 0.036, height: 0.026, ribs: 4, material: pal.wood });
  upper.position.set(0, 0.026, -0.096);
  handguard.add(upper);
  // Retaining plates.
  handguard.add(mesh(boxGeo(0.044, 0.03, 0.008, 0.0014), pal.metalDark, [0, -0.018, -0.086]));
  handguard.add(mesh(boxGeo(0.04, 0.026, 0.008, 0.0014), pal.metalDark, [0, 0.024, -0.092]));

  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.03, 0.022, 0.05, 0.003, 1), pal.metal, [0, -0.03, 0.0]));
  const magRelease = asm.part('magRelease');
  magRelease.add(mesh(roundBoxGeo(0.014, 0.016, 0.008, 0.002, 1), pal.metalDark, [0, -0.034, 0.028]));

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.046, width: 0.024 });
  trigger.guard.position.set(0, -0.03, 0.072);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.03, 0.072);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.1, radius: 0.019, rake: 0.36, material: pal.wood, beavertail: false });
  grip.group.position.set(0, -0.04, 0.104);
  asm.part('pistolGrip').add(grip.group);

  const stock = asm.part('stock');
  // AK furniture: a laminate block bolted to the rear trunnion, combed slightly
  // above the bore, with the metal butt plate and its sling slot.
  const stockGroup = buildBlockStock(pal, {
    length: 0.27,
    material: pal.wood,
    frontHeight: 0.05,
    buttHeight: 0.066,
    rise: 0.008,
    width: 0.038,
  });
  stockGroup.position.set(0, -0.006, 0.174);
  stockGroup.rotation.x = 0.035;
  stock.add(stockGroup);

  // --- controls ------------------------------------------------------------
  // The AK selector is a long lever on the right; it doubles as the dust wiper.
  const selector = asm.part('safetySelector');
  selector.position.set(0.019, -0.006, 0.088);
  selector.add(mesh(roundBoxGeo(0.0042, 0.052, 0.014, 0.0018, 1), pal.metal, [0, 0.012, 0]));
  selector.add(mesh(roundBoxGeo(0.004, 0.012, 0.03, 0.0016, 1), pal.metal, [0, 0.03, -0.012]));

  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(cylGeo(0.0128, 0.0128, 0.1, 14), pal.metalWorn, [0, 0.006, 0.055]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.014, 0.011, 0.024, 0.0022), pal.metalWorn, [0.0225, 0.008, 0.014]));
  charging.add(mesh(boxGeo(0.006, 0.01, 0.05, 0.0012), pal.metalWorn, [0.0185, 0.008, 0.03]));

  const port = buildEjectionPort(pal, { width: 0.05, height: 0.019, side: 1 });
  port.port.position.set(0.0178, 0.008, 0.05);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'rifle');
  caseGroup.position.set(0.004, 0.007, 0.018);
  chambered.add(caseGroup);

  const mag = asm.part('magazine');
  const magGroup = buildStanagMag(pal, { length: 0.2, curve: 0.62, width: 0.028, depth: 0.042, material: pal.polymerDark });
  magGroup.position.set(0, -0.038, 0.0);
  mag.add(magGroup);

  // --- sights --------------------------------------------------------------
  const rearBase = 0.0325;
  const frontBase = 0.023;
  const sightLine = ironSightLine(rearBase, 0.015, false);
  const front = buildFrontSight(pal, frontPostFor(sightLine, frontBase), { width: 0.017 });
  front.position.set(0, frontBase, -0.318);
  asm.part('frontSight').add(front);
  const rear = buildRearSight(pal, 0.015, false);
  rear.position.set(0, rearBase, 0.096);
  asm.part('rearSight').add(rear);
  const sightAnchor = asm.anchor('sight', [0, sightLine, 0.1]);

  const sling = asm.part('slingMount');
  const loop = buildSlingLoop(pal, 0.008);
  loop.position.set(-0.02, -0.016, -0.15);
  sling.add(loop);

  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0182, -0.008, 0.09],
    face: 'left',
    lines: ['AB', 'AP'],
    height: 0.0072,
  });
  addSerial(asm.part('markings'), pal, rng, [-0.0182, -0.024, 0.02], 'left');
  addWear(asm.part('receiver'), pal, rng, { count: 9, center: [0.0182, -0.006, 0.06], area: [0.0006, 0.018, 0.1] });
  addWear(asm.part('handguard'), pal, rng, { count: 5, center: [0.0215, -0.018, -0.155], area: [0.0006, 0.008, 0.05] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.464]),
    sight: sightAnchor,
    eject: asm.anchor('eject', [0.026, 0.012, 0.05], [0.32, -Math.PI / 2 + 0.24, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.05, 0.0]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.019, -0.16], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.215,
    hipTrim: [0, 0.004, 0.008],
    travel: { bolt: 0.062, charging: 0.062, mag: 0.18 },
    gripRadius: 0.019,
    supportRadius: 0.023,
  };
}

/**
 * Bullpup rifle. The action sits behind the trigger, which shortens the weapon
 * dramatically and moves the magazine into the stock — a silhouette nothing else
 * in the arsenal shares, so it has to be right or the whole class reads wrong.
 */
export function buildBullpup(
  { pal, rng }: RifleContext,
  variant: 'aug' | 'famas',
): WeaponBuild {
  const asm = new Assembler(variant);
  const shellTop = 0.03;

  const receiver = asm.part('receiver');
  // One-piece polymer chassis from the muzzle end of the trigger group to butt.
  receiver.add(mesh(roundBoxGeo(0.046, 0.062, 0.34, 0.008, 2), pal.polymer, [0, -0.004, 0.13]));
  receiver.add(mesh(roundBoxGeo(0.05, 0.03, 0.12, 0.007, 2), pal.polymer, [0, 0.014, 0.03]));
  // Butt pad and sling loop.
  receiver.add(mesh(roundBoxGeo(0.044, 0.07, 0.014, 0.005, 2), pal.rubber, [0, -0.006, 0.298]));
  // Cheek rest ridge.
  receiver.add(mesh(roundBoxGeo(0.03, 0.016, 0.16, 0.005, 2), pal.polymerDark, [0, 0.03, 0.2]));

  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.036, 0.05, 0.07, 0.005, 2), pal.polymerDark, [0, -0.036, 0.196]));

  const mag = asm.part('magazine');
  const magGroup =
    variant === 'aug'
      ? buildStanagMag(pal, { length: 0.15, curve: 0.2, width: 0.03, depth: 0.04, material: pal.polymerDark })
      : buildStanagMag(pal, { length: 0.17, curve: 0.05, width: 0.027, depth: 0.038, material: pal.metalDark });
  magGroup.position.set(0, -0.052, 0.196);
  mag.add(magGroup);

  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.36, breechR: 0.0125, muzzleR: 0.0092, threadAt: 0.334, fluted: variant === 'aug' });
  barrelGroup.position.z = -0.02;
  barrel.add(barrelGroup);

  const muzzle = asm.part('muzzleDevice');
  const device = buildFlashHider(pal, { bodyR: 0.0116, length: 0.05, boreR: 0.0042, prongs: variant === 'aug' ? 5 : 6 });
  device.position.z = -0.382;
  muzzle.add(device);

  const gas = asm.part('gasBlock');
  const gasBlock = buildGasBlock(pal, { width: 0.024, height: 0.03, depth: 0.03, tube: 0.16 });
  gasBlock.position.set(0, 0.004, -0.212);
  gas.add(gasBlock);

  const handguard = asm.part('handguard');
  if (variant === 'aug') {
    // Folding vertical foregrip, the AUG's signature.
    const shroud = buildHandguard(pal, { length: 0.16, radius: 0.028, rail: false, slotRows: 2, facets: 12, material: pal.polymer });
    shroud.position.z = -0.03;
    handguard.add(shroud);
    const vgrip = new THREE.Group();
    vgrip.position.set(0, -0.024, -0.13);
    vgrip.rotation.x = -0.22;
    handguard.add(vgrip);
    vgrip.add(mesh(roundBoxGeo(0.026, 0.082, 0.032, 0.01, 2), pal.polymer, [0, -0.041, 0]));
    vgrip.add(mesh(roundBoxGeo(0.03, 0.008, 0.036, 0.003, 1), pal.polymerDark, [0, -0.082, 0]));
  } else {
    const forend = buildRibbedForend(pal, { length: 0.15, width: 0.04, height: 0.042, ribs: 7, material: pal.polymer });
    forend.position.set(0, -0.016, -0.04);
    handguard.add(forend);
    // Bipod stubs under the forend.
    handguard.add(mesh(roundBoxGeo(0.01, 0.03, 0.012, 0.003, 1), pal.polymerDark, [0.014, -0.042, -0.13], [0, 0, 0.3]));
    handguard.add(mesh(roundBoxGeo(0.01, 0.03, 0.012, 0.003, 1), pal.polymerDark, [-0.014, -0.042, -0.13], [0, 0, -0.3]));
  }

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.05, width: 0.03 });
  trigger.guard.position.set(0, -0.03, 0.078);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.03, 0.078);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.1, radius: 0.019, rake: 0.24, material: pal.polymer });
  grip.group.position.set(0, -0.046, 0.108);
  asm.part('pistolGrip').add(grip.group);

  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(cylGeo(0.012, 0.012, 0.11, 14), pal.metalWorn, [0, 0.006, 0.2]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.01, 0.012, 0.03, 0.002), pal.metalDark, [-0.026, 0.014, 0.09]));
  charging.add(mesh(boxGeo(0.03, 0.008, 0.008, 0.0016), pal.metalDark, [-0.036, 0.014, 0.09]));

  const port = buildEjectionPort(pal, { width: 0.044, height: 0.02, side: 1 });
  port.port.position.set(0.0235, 0.006, 0.16);
  asm.part('ejectionPort').add(port.port);
  const cover = asm.part('dustCover');
  cover.position.set(0.0235, -0.004, 0.16);
  cover.add(port.cover);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'rifle');
  caseGroup.position.set(0.006, 0.006, 0.14);
  chambered.add(caseGroup);

  const selector = asm.part('safetySelector');
  selector.position.set(-0.024, -0.026, 0.084);
  selector.add(mesh(cylGeoX(0.0058, 0.006, 10), pal.metalDark));
  selector.add(mesh(roundBoxGeo(0.005, 0.009, 0.022, 0.002, 1), pal.metalDark, [-0.003, 0, 0.01]));

  let sight: THREE.Object3D;
  let reticle;
  let eyeRelief: number;
  if (variant === 'aug') {
    const optic = buildAcog(pal, rng);
    optic.group.position.set(0, shellTop + 0.008, 0.06);
    asm.part('optic').add(optic.group);
    sight = optic.sight;
    reticle = optic.reticle;
    eyeRelief = optic.eyeRelief;
    const rail = asm.part('upperRail');
    rail.add(mesh(railGeo(0.14), pal.metal, [0, shellTop + 0.008, 0.06]));
  } else {
    // Tall carry handle with both sights inside it, the FAMAS signature. The
    // handle is a tunnel the player looks down, so its clear internal volume is
    // the design constraint: bridge, legs and rail all have to sit outside the
    // cone from the eye through the rear aperture, or they crop the sight picture
    // into a letterbox. The bridge therefore rides 19 mm above the sight axis and
    // the rail goes on top of it rather than under.
    const rearBase = shellTop + 0.03;
    const frontBase = shellTop + 0.03;
    const sightLine = ironSightLine(rearBase, 0.018, true);
    const bridge = sightLine + 0.019;
    const rail = asm.part('upperRail');
    rail.add(mesh(boxGeo(0.024, 0.007, 0.3, 0.0018), pal.metal, [0, bridge, 0.0]));
    // The legs are a pair of side plates, not a post on the centreline.
    for (const z of [-0.128, 0.138]) {
      for (const s of [-1, 1]) {
        const h = bridge - shellTop - 0.0035;
        rail.add(mesh(boxGeo(0.0045, h, 0.016, 0.001), pal.metal, [s * 0.0175, shellTop + h * 0.5, z]));
      }
    }
    rail.add(mesh(railGeo(0.12), pal.metal, [0, bridge + 0.0035, 0.03]));
    const rear = buildRearSight(pal, 0.018, true);
    rear.position.set(0, rearBase, 0.12);
    asm.part('rearSight').add(rear);
    // No ears: at a 235 mm sight radius against a 210 mm eye relief they would sit
    // inside the aperture and crowd the post into an unreadable smear.
    const front = buildFrontSight(pal, frontPostFor(sightLine, frontBase), { width: 0.016, wings: false });
    front.position.set(0, frontBase, -0.115);
    asm.part('frontSight').add(front);
    sight = asm.anchor('sight', [0, sightLine, 0.125]);
    eyeRelief = 0.21;
  }

  addSerial(asm.part('markings'), pal, rng, [-0.0235, -0.016, 0.14], 'left');
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0235, -0.028, 0.076],
    face: 'left',
    lines: variant === 'aug' ? ['S F A'] : ['S 1 3 A'],
    height: 0.0034,
  });
  addWear(asm.part('receiver'), pal, rng, { count: 6, center: [0.0232, -0.004, 0.13], area: [0.0006, 0.02, 0.12] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.384]),
    sight,
    eject: asm.anchor('eject', [0.03, 0.01, 0.16], [0.3, -Math.PI / 2 + 0.2, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.06, 0.196]),
    grip: grip.anchor,
    support:
      variant === 'aug'
        ? asm.anchor('support', [0, -0.062, -0.132], [0, 0, 0])
        : asm.anchor('support', [0, -0.016, -0.1], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    reticle,
    eyeRelief,
    // A bullpup's mass is all behind the grip, so it rides a touch further out.
    hipTrim: [0.004, 0, -0.014],
    travel: { bolt: 0.05, charging: 0.05, mag: 0.16 },
    gripRadius: 0.019,
    supportRadius: variant === 'aug' ? 0.014 : 0.021,
  };
}
