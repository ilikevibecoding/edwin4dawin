import * as THREE from 'three';
import {
  addMarkings,
  addSerial,
  addWear,
  buildBarrel,
  buildBipod,
  buildChamberedCase,
  buildEjectionPort,
  buildFlashHider,
  buildGasBlock,
  buildPistolGrip,
  buildPlainMuzzle,
  buildQdSocket,
  buildStanagMag,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import { buildAcog, buildFrontSight, buildRearSight, buildSniperScope } from './Optics';
import { Assembler, boxGeo, cylGeo, cylGeoX, cylGeoY, latheZ, railGeo, roundBoxGeo } from './Parts';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Precision rifles.
 *
 * Both are built around the scope rather than the other way round: the rail sits
 * low, the comb is raised to meet the ocular, and the whole weapon is longer and
 * heavier in silhouette than anything else in the arsenal. The bolt gun gets a
 * real bolt handle on its own pivot because the between-shots cycle is the most
 * visible animation in the game.
 */

/** Bolt-action magnum rifle: 1230 mm, thumbhole chassis, 660 mm heavy barrel. */
export function buildBoltSniper({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('l96');
  const railTop = 0.03;

  // --- receiver ------------------------------------------------------------
  const receiver = asm.part('receiver');
  receiver.add(
    mesh(
      latheZ(
        [
          [0.019, 0],
          [0.0208, 0.006],
          [0.0208, 0.24],
          [0.0188, 0.248],
        ],
        16,
      ),
      pal.metalDark,
      [0, 0, 0.152],
    ),
  );
  receiver.add(mesh(roundBoxGeo(0.042, 0.03, 0.25, 0.004, 2), pal.metalDark, [0, -0.016, 0.03]));
  // Recoil lug and the flat the rail screws to.
  receiver.add(mesh(boxGeo(0.03, 0.012, 0.24, 0.0018), pal.metal, [0, 0.021, 0.03]));
  receiver.add(mesh(roundBoxGeo(0.036, 0.026, 0.03, 0.004, 1), pal.metalDark, [0, -0.014, -0.078]));

  const rail = asm.part('upperRail');
  rail.add(mesh(railGeo(0.2), pal.metal, [0, railTop, 0.03]));

  // --- barrel --------------------------------------------------------------
  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.6, breechR: 0.017, muzzleR: 0.0115, threadAt: 0.572, fluted: true });
  barrelGroup.position.z = -0.09;
  barrel.add(barrelGroup);

  const muzzle = asm.part('muzzleDevice');
  const brake = buildPlainMuzzle(pal, { bodyR: 0.0142, boreR: 0.0052, length: 0.048 });
  brake.position.z = -0.702;
  muzzle.add(brake);
  // Ported brake body: three pairs of side vents.
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      muzzle.add(mesh(boxGeo(0.006, 0.0042, 0.012, 0.001), pal.bore, [s * 0.0126, 0.002, -0.664 - i * 0.014]));
    }
  }

  // --- chassis / stock -----------------------------------------------------
  const stock = asm.part('stock');
  // Fore-end: a squared aluminium chassis with an accessory rail underneath.
  stock.add(mesh(roundBoxGeo(0.05, 0.056, 0.34, 0.008, 2), pal.polymer, [0, -0.03, -0.24]));
  stock.add(mesh(railGeo(0.16, 0.019), pal.metal, [0, -0.058, -0.32], [Math.PI, 0, 0]));
  for (const s of [-1, 1]) {
    stock.add(mesh(boxGeo(0.006, 0.03, 0.28, 0.0016), pal.polymerDark, [s * 0.0245, -0.032, -0.24]));
  }
  // Grip section and butt, as one continuous machined side profile. Chamfers
  // here have to stay small: a wide bevel on a 50 mm block turns it into a
  // lozenge, which is what makes a chassis rifle read as a toy.
  stock.add(mesh(roundBoxGeo(0.05, 0.09, 0.17, 0.006, 2), pal.polymer, [0, -0.038, 0.135]));
  stock.add(mesh(roundBoxGeo(0.048, 0.062, 0.2, 0.005, 2), pal.polymer, [0, 0.0, 0.26]));
  // Thumb shelf cut through the flank behind the grip.
  stock.add(mesh(boxGeo(0.054, 0.036, 0.05, 0.0026), pal.bore, [0, -0.028, 0.222]));
  // Adjustable comb on two posts, and the spacered butt pad.
  for (const s of [-1, 1]) {
    stock.add(mesh(cylGeo(0.0042, 0.0042, 0.026, 8), pal.metalWorn, [s * 0.012, 0.042, 0.24], [Math.PI / 2, 0, 0]));
  }
  stock.add(mesh(roundBoxGeo(0.034, 0.024, 0.15, 0.004, 2), pal.polymerDark, [0, 0.044, 0.285]));
  stock.add(mesh(roundBoxGeo(0.046, 0.06, 0.012, 0.003, 1), pal.metalDark, [0, 0.0, 0.366]));
  stock.add(mesh(roundBoxGeo(0.042, 0.09, 0.016, 0.004, 2), pal.rubber, [0, -0.006, 0.382]));
  stock.add(mesh(roundBoxGeo(0.02, 0.028, 0.028, 0.004, 1), pal.polymerDark, [0, -0.052, 0.36]));
  const qd = buildQdSocket(pal);
  qd.position.set(-0.026, -0.05, -0.3);
  stock.add(qd);

  const bipodGroup = buildBipod(pal, { legLength: 0.21 });
  bipodGroup.position.set(0, -0.06, -0.38);
  asm.part('bipod').add(bipodGroup);

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.046, width: 0.026 });
  trigger.guard.position.set(0, -0.04, 0.086);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.04, 0.086);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.106, radius: 0.0192, rake: 0.2, material: pal.polymer });
  grip.group.position.set(0, -0.058, 0.132);
  asm.part('pistolGrip').add(grip.group);

  const selector = asm.part('safetySelector');
  selector.position.set(0.021, -0.006, 0.116);
  selector.add(mesh(roundBoxGeo(0.005, 0.03, 0.01, 0.0018, 1), pal.metalDark, [0, 0.008, 0]));

  // --- bolt ----------------------------------------------------------------
  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(cylGeo(0.0148, 0.0148, 0.14, 16), pal.metalWorn, [0, 0, 0.09]));
  bolt.add(mesh(cylGeo(0.0168, 0.0168, 0.012, 16), pal.metalWorn, [0, 0, 0.152]));
  const boltHandle = asm.part('boltHandle');
  // Pivot at the bolt body so the handle lifts and rotates about the bore.
  boltHandle.position.set(0, 0, 0.15);
  boltHandle.add(mesh(cylGeoX(0.0055, 0.036, 10), pal.metalWorn, [0.026, 0, 0]));
  boltHandle.add(mesh(new THREE.SphereGeometry(0.0092, 12, 10), pal.metalWorn, [0.046, 0, 0]));
  boltHandle.add(mesh(roundBoxGeo(0.012, 0.014, 0.02, 0.004, 1), pal.metalWorn, [0.012, 0, 0.006]));

  const port = buildEjectionPort(pal, { width: 0.06, height: 0.022, side: 1 });
  port.port.position.set(0.0208, 0.002, 0.09);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'rifle');
  caseGroup.position.set(0.005, 0.002, 0.06);
  caseGroup.scale.set(1.2, 1.2, 1.25);
  chambered.add(caseGroup);

  // --- magazine ------------------------------------------------------------
  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.036, 0.026, 0.075, 0.004, 2), pal.metalDark, [0, -0.036, 0.02]));
  const mag = asm.part('magazine');
  const magGroup = buildStanagMag(pal, { length: 0.075, curve: 0.06, width: 0.03, depth: 0.046, material: pal.metalDark });
  magGroup.position.set(0, -0.046, 0.02);
  mag.add(magGroup);
  const magRelease = asm.part('magRelease');
  magRelease.add(mesh(roundBoxGeo(0.014, 0.014, 0.008, 0.002, 1), pal.metalWorn, [0, -0.042, -0.02]));

  // --- optic ---------------------------------------------------------------
  const optic = buildSniperScope(pal, rng);
  optic.group.position.set(0, railTop, 0.03);
  asm.part('optic').add(optic.group);

  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0212, -0.006, 0.1],
    face: 'left',
    lines: ['.338 LAPUA MAG'],
    height: 0.0032,
  });
  addSerial(asm.part('markings'), pal, rng, [-0.0212, -0.02, 0.02], 'left');
  addWear(asm.part('receiver'), pal, rng, { count: 8, center: [0.021, -0.004, 0.06], area: [0.0008, 0.014, 0.1] });
  addWear(asm.part('stock'), pal, rng, { count: 6, center: [0.0248, -0.03, -0.24], area: [0.0008, 0.02, 0.14] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.704]),
    sight: optic.sight,
    eject: asm.anchor('eject', [0.03, 0.006, 0.09], [0.26, -Math.PI / 2 + 0.22, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.055, 0.02]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.03, -0.24], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    reticle: optic.reticle,
    eyeRelief: optic.eyeRelief,
    hipTrim: [0.006, -0.006, 0.014],
    travel: { bolt: 0.1, charging: 0.1, mag: 0.11, boltHandleAngle: 1.1 },
    gripRadius: 0.0192,
    supportRadius: 0.026,
  };
}

/** Semi-automatic 7.62 designated marksman rifle: 1120 mm, chassis stock. */
export function buildDmr({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('mk14');
  const railTop = 0.036;

  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.044, 0.056, 0.28, 0.005, 2), pal.metalDark, [0, -0.004, 0.06]));
  // Aluminium chassis shell wrapping the action.
  receiver.add(mesh(roundBoxGeo(0.05, 0.03, 0.3, 0.006, 2), pal.polymerDark, [0, -0.026, 0.05]));
  receiver.add(mesh(boxGeo(0.032, 0.014, 0.26, 0.002), pal.metal, [0, 0.03, 0.05]));
  receiver.add(mesh(roundBoxGeo(0.03, 0.026, 0.04, 0.004, 1), pal.metalDark, [0, 0.012, -0.096]));

  const rail = asm.part('upperRail');
  rail.add(mesh(railGeo(0.25), pal.metal, [0, railTop, 0.05]));

  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.46, breechR: 0.0148, muzzleR: 0.0104, threadAt: 0.432 });
  barrelGroup.position.z = -0.08;
  barrel.add(barrelGroup);
  barrel.add(mesh(cylGeo(0.0082, 0.0082, 0.3, 12), pal.metalDark, [0, -0.019, -0.2]));

  const muzzle = asm.part('muzzleDevice');
  const device = buildFlashHider(pal, { bodyR: 0.0132, length: 0.056, boreR: 0.0048, prongs: 6 });
  device.position.z = -0.544;
  muzzle.add(device);

  const gas = asm.part('gasBlock');
  const gasBlock = buildGasBlock(pal, { width: 0.026, height: 0.034, depth: 0.04 });
  gasBlock.position.set(0, -0.004, -0.35);
  gas.add(gasBlock);

  const handguard = asm.part('handguard');
  handguard.add(mesh(roundBoxGeo(0.046, 0.052, 0.26, 0.008, 2), pal.polymer, [0, -0.014, -0.21]));
  handguard.add(mesh(railGeo(0.2), pal.metal, [0, 0.012, -0.21]));
  for (const s of [-1, 1]) {
    handguard.add(mesh(railGeo(0.12, 0.018), pal.metal, [s * 0.023, -0.016, -0.24], [0, 0, (s * Math.PI) / 2]));
    for (let i = 0; i < 4; i++) {
      handguard.add(mesh(boxGeo(0.007, 0.008, 0.02, 0.0016), pal.bore, [s * 0.0228, -0.03, -0.13 - i * 0.036]));
    }
  }
  const qd = buildQdSocket(pal);
  qd.position.set(-0.024, -0.03, -0.16);
  handguard.add(qd);

  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.034, 0.03, 0.062, 0.004, 2), pal.metalDark, [0, -0.05, 0.0]));
  const mag = asm.part('magazine');
  const magGroup = buildStanagMag(pal, { length: 0.16, curve: 0.44, width: 0.03, depth: 0.05, material: pal.metalDark });
  magGroup.position.set(0, -0.06, 0.0);
  mag.add(magGroup);
  const magRelease = asm.part('magRelease');
  magRelease.add(mesh(roundBoxGeo(0.012, 0.02, 0.01, 0.003, 1), pal.metalWorn, [0, -0.056, 0.04]));

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.048, width: 0.028 });
  trigger.guard.position.set(0, -0.044, 0.078);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.044, 0.078);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.108, radius: 0.019, rake: 0.28, material: pal.polymer });
  grip.group.position.set(0, -0.062, 0.114);
  asm.part('pistolGrip').add(grip.group);

  const selector = asm.part('safetySelector');
  selector.position.set(-0.023, -0.038, 0.098);
  selector.add(mesh(cylGeoX(0.0055, 0.006, 10), pal.metalDark));
  selector.add(mesh(roundBoxGeo(0.005, 0.009, 0.024, 0.002, 1), pal.metalDark, [-0.003, 0, 0.011]));

  const stock = asm.part('stock');
  stock.add(mesh(roundBoxGeo(0.042, 0.062, 0.15, 0.008, 2), pal.polymer, [0, -0.006, 0.26]));
  stock.add(mesh(roundBoxGeo(0.03, 0.03, 0.12, 0.008, 2), pal.polymerDark, [0, 0.034, 0.28]));
  stock.add(mesh(roundBoxGeo(0.04, 0.078, 0.014, 0.005, 2), pal.rubber, [0, -0.006, 0.34]));
  stock.add(mesh(roundBoxGeo(0.016, 0.02, 0.036, 0.004, 1), pal.polymerDark, [0, -0.044, 0.31]));
  stock.add(mesh(cylGeoY(0.006, 0.006, 0.03, 10), pal.metalDark, [0, 0.05, 0.238]));

  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(cylGeo(0.0132, 0.0132, 0.12, 14), pal.metalWorn, [0, 0.004, 0.07]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.02, 0.011, 0.024, 0.002), pal.metalDark, [0.024, 0.012, 0.03]));
  charging.add(mesh(boxGeo(0.006, 0.01, 0.06, 0.0014), pal.metalWorn, [0.021, 0.012, 0.056]));

  const port = buildEjectionPort(pal, { width: 0.052, height: 0.02, side: 1 });
  port.port.position.set(0.0222, 0.006, 0.07);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'rifle');
  caseGroup.position.set(0.005, 0.005, 0.04);
  caseGroup.scale.set(1.1, 1.1, 1.15);
  chambered.add(caseGroup);

  const optic = buildAcog(pal, rng);
  optic.group.position.set(0, railTop, 0.04);
  asm.part('optic').add(optic.group);

  const front = buildFrontSight(pal, 0.024, { width: 0.018 });
  front.position.set(0, 0.014, -0.31);
  front.rotation.x = -1.44;
  asm.part('frontSight').add(front);
  const rear = buildRearSight(pal, 0.028, true);
  rear.position.set(0, railTop, 0.15);
  rear.rotation.x = -1.44;
  asm.part('rearSight').add(rear);

  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0252, -0.02, 0.06],
    face: 'left',
    lines: ['7.62 NATO', 'SEMI ONLY'],
    height: 0.0068,
  });
  addSerial(asm.part('markings'), pal, rng, [-0.0252, -0.04, -0.02], 'left');
  addWear(asm.part('receiver'), pal, rng, { count: 8, center: [0.0225, 0.0, 0.06], area: [0.0008, 0.018, 0.11] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.546]),
    sight: optic.sight,
    eject: asm.anchor('eject', [0.03, 0.01, 0.07], [0.3, -Math.PI / 2 + 0.24, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.07, 0.0]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.014, -0.22], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    reticle: optic.reticle,
    eyeRelief: optic.eyeRelief,
    hipTrim: [0.004, -0.004, 0.012],
    travel: { bolt: 0.075, charging: 0.075, mag: 0.17 },
    gripRadius: 0.019,
    supportRadius: 0.024,
  };
}
