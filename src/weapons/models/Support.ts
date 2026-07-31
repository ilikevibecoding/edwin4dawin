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
  buildPistolGrip,
  buildQdSocket,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import { buildFrontSight, buildRearSight, frontPostFor, ironSightLine } from './Optics';
import { Assembler, boxGeo, cylGeo, cylGeoX, latheZ, railGeo, roundBoxGeo } from './Parts';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Belt-fed light machine gun.
 *
 * 1040 mm overall with a 465 mm barrel. What identifies the weapon in one glance
 * is the mass above the barrel — carry handle, heat shield and the hinged feed
 * tray cover — and the belt hanging out of the ammo box, so all of those are
 * real geometry rather than implied.
 */
export function buildM249({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('m249');
  const coverTop = 0.048;

  // --- receiver ------------------------------------------------------------
  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.052, 0.078, 0.3, 0.005, 2), pal.metalDark, [0, -0.002, 0.09]));
  // Feed tray cover: a stamped lid with a latch at the rear. The chamfer stays
  // small relative to the 26 mm height — bevel a shallow box by a quarter of its
  // thickness and it stops being a box and becomes a pillow.
  receiver.add(mesh(roundBoxGeo(0.056, 0.026, 0.16, 0.0025, 2), pal.metal, [0, 0.05, 0.0]));
  // Stiffening ribs either side of the rail, pressed into the cover.
  for (const s of [-1, 1]) {
    receiver.add(mesh(roundBoxGeo(0.008, 0.005, 0.15, 0.0014, 1), pal.metal, [s * 0.019, 0.064, 0.0]));
  }
  receiver.add(mesh(roundBoxGeo(0.05, 0.014, 0.05, 0.0025, 1), pal.metal, [0, 0.058, 0.098]));
  receiver.add(mesh(boxGeo(0.03, 0.01, 0.014, 0.0016), pal.metalWorn, [0, 0.058, 0.128]));
  // Riveted side plates.
  for (const s of [-1, 1]) {
    receiver.add(mesh(boxGeo(0.003, 0.052, 0.27, 0.0008), pal.metal, [s * 0.0265, 0.004, 0.09]));
    for (let i = 0; i < 5; i++) {
      receiver.add(
        mesh(new THREE.SphereGeometry(0.0022, 8, 6), pal.metalWorn, [s * 0.028, -0.02, -0.02 + i * 0.055]),
      );
    }
  }
  // Feed throat under the cover, where the belt enters.
  receiver.add(mesh(boxGeo(0.034, 0.014, 0.03, 0.0012), pal.bore, [0, 0.036, -0.03]));

  const rail = asm.part('upperRail');
  rail.add(mesh(railGeo(0.14), pal.metal, [0, coverTop + 0.016, 0.0]));
  rail.add(mesh(boxGeo(0.024, 0.012, 0.15, 0.0018), pal.metal, [0, coverTop + 0.008, 0.0]));

  // --- barrel group --------------------------------------------------------
  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.49, breechR: 0.0145, muzzleR: 0.0105, threadAt: 0.462, fluted: true });
  barrelGroup.position.z = -0.05;
  barrel.add(barrelGroup);
  // Gas cylinder and operating rod below the bore.
  barrel.add(mesh(cylGeo(0.0092, 0.0092, 0.34, 12), pal.metalDark, [0, -0.021, -0.22]));
  barrel.add(mesh(roundBoxGeo(0.02, 0.022, 0.05, 0.004, 1), pal.metalDark, [0, -0.02, -0.4]));

  const muzzle = asm.part('muzzleDevice');
  const hider = buildFlashHider(pal, { bodyR: 0.014, length: 0.066, boreR: 0.0044, prongs: 5 });
  hider.position.z = -0.6;
  muzzle.add(hider);

  const gas = asm.part('gasBlock');
  const gasBlock = new THREE.Group();
  gasBlock.name = 'gasBlock';
  gasBlock.add(mesh(roundBoxGeo(0.028, 0.036, 0.056, 0.005, 2), pal.metalDark, [0, -0.006, -0.36]));
  gasBlock.add(mesh(cylGeoX(0.006, 0.03, 10), pal.metalWorn, [0, -0.018, -0.372]));
  gas.add(gasBlock);

  // Heat shield over the barrel plus the carry handle that rides on it.
  const handguard = asm.part('handguard');
  handguard.add(
    mesh(
      latheZ(
        [
          [0.0225, 0],
          [0.0245, 0.006],
          [0.0245, 0.196],
          [0.0215, 0.204],
        ],
        14,
      ),
      pal.metalDark,
      [0, 0.001, -0.11],
    ),
  );
  // Cooling slots down both flanks of the shield.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      handguard.add(mesh(boxGeo(0.005, 0.012, 0.022, 0.0012), pal.bore, [s * 0.0215, 0.002, -0.14 - i * 0.026]));
    }
  }
  const carry = new THREE.Group();
  carry.position.set(0, 0.03, -0.2);
  handguard.add(carry);
  carry.add(mesh(roundBoxGeo(0.018, 0.014, 0.1, 0.005, 2), pal.polymerDark, [0, 0.03, 0]));
  for (const z of [-0.042, 0.042]) {
    carry.add(mesh(roundBoxGeo(0.014, 0.036, 0.012, 0.004, 1), pal.metalDark, [0, 0.014, z]));
  }
  const qd = buildQdSocket(pal);
  qd.position.set(-0.024, -0.008, -0.13);
  handguard.add(qd);

  // --- bipod ---------------------------------------------------------------
  const bipodGroup = buildBipod(pal, { legLength: 0.19 });
  bipodGroup.position.set(0, -0.032, -0.4);
  asm.part('bipod').add(bipodGroup);

  // --- ammunition ----------------------------------------------------------
  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.05, 0.024, 0.09, 0.005, 2), pal.metalDark, [0, -0.044, 0.02]));
  const magRelease = asm.part('magRelease');
  magRelease.add(mesh(roundBoxGeo(0.016, 0.012, 0.01, 0.003, 1), pal.metalWorn, [0.028, -0.042, 0.05]));

  const mag = asm.part('magazine');
  // 200-round plastic box in a nylon carrier, latched under the receiver.
  mag.add(mesh(roundBoxGeo(0.09, 0.108, 0.128, 0.009, 2), pal.polymerDark, [0, -0.114, 0.014]));
  mag.add(mesh(roundBoxGeo(0.094, 0.03, 0.132, 0.008, 2), pal.nylon, [0, -0.07, 0.014]));
  mag.add(mesh(roundBoxGeo(0.096, 0.012, 0.05, 0.004, 1), pal.nylon, [0, -0.166, 0.014]));
  mag.add(mesh(boxGeo(0.03, 0.05, 0.004, 0.0012), pal.nylon, [0.03, -0.11, -0.052]));
  // Belt climbing out of the box into the feed throat.
  const belt = new THREE.Group();
  belt.position.set(0.0, -0.056, -0.03);
  mag.add(belt);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const link = new THREE.Group();
    link.position.set(0, t * 0.05, -0.004 - t * 0.006);
    link.rotation.x = -0.2 + t * 0.2;
    belt.add(link);
    link.add(mesh(cylGeoX(0.0048, 0.03, 10), pal.brass, [0, 0, 0]));
    link.add(mesh(cylGeoX(0.0036, 0.014, 8), pal.metalDark, [0.019, 0, 0]));
    link.add(mesh(boxGeo(0.03, 0.0075, 0.0075, 0.0012), pal.metalWorn, [0, -0.005, 0]));
  }

  // --- controls and stock --------------------------------------------------
  const trigger = buildTriggerGroup(pal, { guardDepth: 0.05, width: 0.03 });
  trigger.guard.position.set(0, -0.036, 0.16);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.036, 0.16);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.112, radius: 0.02, rake: 0.26, material: pal.polymer });
  grip.group.position.set(0, -0.05, 0.192);
  asm.part('pistolGrip').add(grip.group);

  const selector = asm.part('safetySelector');
  selector.position.set(-0.028, -0.03, 0.15);
  selector.add(mesh(cylGeoX(0.006, 0.008, 10), pal.metalDark));
  selector.add(mesh(roundBoxGeo(0.006, 0.01, 0.026, 0.002, 1), pal.metalWorn, [-0.004, 0, 0.012]));

  const stock = asm.part('stock');
  stock.add(mesh(roundBoxGeo(0.046, 0.07, 0.14, 0.008, 2), pal.polymer, [0, 0.0, 0.3]));
  // Hollow behind the pistol grip and the folded shoulder rest.
  stock.add(mesh(boxGeo(0.03, 0.03, 0.06, 0.0016), pal.bore, [0, -0.014, 0.28]));
  stock.add(mesh(roundBoxGeo(0.042, 0.076, 0.014, 0.005, 2), pal.rubber, [0, 0.0, 0.378]));
  stock.add(mesh(roundBoxGeo(0.038, 0.012, 0.09, 0.004, 1), pal.polymerDark, [0, 0.042, 0.3]));
  stock.add(mesh(new THREE.TorusGeometry(0.008, 0.0026, 6, 12), pal.metalDark, [0.022, -0.03, 0.26], [0, Math.PI / 2, 0]));

  // --- bolt and ejection ---------------------------------------------------
  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(boxGeo(0.03, 0.028, 0.11, 0.002), pal.metalWorn, [0, 0.008, 0.08]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.03, 0.012, 0.022, 0.002), pal.metalDark, [0.03, 0.006, 0.11]));
  charging.add(mesh(boxGeo(0.008, 0.01, 0.07, 0.0016), pal.metalDark, [0.028, 0.006, 0.14]));

  const port = buildEjectionPort(pal, { width: 0.05, height: 0.02, side: 1 });
  port.port.position.set(0.0268, -0.014, 0.06);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'rifle');
  caseGroup.position.set(0.006, 0.006, 0.02);
  chambered.add(caseGroup);

  // --- sights --------------------------------------------------------------
  const rearBase = coverTop + 0.016;
  const frontBase = 0.03;
  const sightLine = ironSightLine(rearBase, 0.03, true);
  const front = buildFrontSight(pal, frontPostFor(sightLine, frontBase), { width: 0.02 });
  front.position.set(0, frontBase, -0.29);
  asm.part('frontSight').add(front);
  const rear = buildRearSight(pal, 0.03, true);
  rear.position.set(0, rearBase, 0.055);
  asm.part('rearSight').add(rear);
  const sight = asm.anchor('sight', [0, sightLine, 0.06]);

  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0282, 0.006, 0.06],
    face: 'left',
    lines: ['M249 5.56MM', 'MACHINE GUN'],
    height: 0.0082,
  });
  addSerial(asm.part('markings'), pal, rng, [-0.0282, -0.026, 0.14], 'left');
  addWear(asm.part('receiver'), pal, rng, { count: 10, center: [0.028, 0.0, 0.08], area: [0.0008, 0.024, 0.13] });
  addWear(asm.part('handguard'), pal, rng, { count: 6, center: [0.0248, 0.0, -0.2], area: [0.0008, 0.012, 0.08] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.602]),
    sight,
    eject: asm.anchor('eject', [0.034, -0.01, 0.06], [0.1, -Math.PI / 2 + 0.2, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.17, 0.014]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.014, -0.2], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.225,
    // Heavy and held low; the extra drop is what sells the weight.
    hipTrim: [0.008, -0.014, 0.012],
    travel: { bolt: 0.07, charging: 0.07, mag: 0.2 },
    gripRadius: 0.02,
    supportRadius: 0.027,
  };
}
