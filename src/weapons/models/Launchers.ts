import * as THREE from 'three';
import {
  addMarkings,
  addSerial,
  addWear,
  buildPistolGrip,
  buildQdSocket,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import { buildAcog, buildFrontSight, buildRearSight } from './Optics';
import { Assembler, boreGeo, boxGeo, cylGeo, cylGeoX, latheZ, roundBoxGeo } from './Parts';
import type { GunPalette } from './Materials';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Shoulder-fired rocket launcher.
 *
 * 950 mm of steel tube with the grenade protruding another 350 mm past the
 * muzzle, which makes it the longest thing in the arsenal and the only weapon
 * whose ammunition is visible before it is fired. The optic sits on a left-side
 * bracket, so the tube deliberately does not centre on the screen when aiming —
 * that offset is the single most recognisable thing about the weapon.
 */
export function buildRpg({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('rpg7');
  const tubeR = 0.0228;

  const receiver = asm.part('receiver');
  // Main tube: thin walls, a swell at the chamber and the flared venturi.
  receiver.add(
    mesh(
      latheZ(
        [
          [tubeR * 0.86, 0],
          [tubeR, 0.012],
          [tubeR, 0.28],
          [tubeR * 1.24, 0.31],
          [tubeR * 1.3, 0.44],
          [tubeR * 1.24, 0.47],
          [tubeR, 0.5],
          [tubeR, 0.83],
          [tubeR * 1.06, 0.85],
          [tubeR * 1.5, 0.9],
          [tubeR * 1.62, 0.95],
        ],
        22,
      ),
      pal.metalDark,
      [0, 0, 0.42],
    ),
  );
  receiver.add(mesh(boreGeo(tubeR * 0.82, 0.3, 20), pal.bore, [0, 0, -0.53]));
  // Blast plate at the rear of the venturi.
  receiver.add(mesh(cylGeo(tubeR * 1.62, tubeR * 1.62, 0.004, 22, true), pal.metalDark, [0, 0, 0.418]));

  // Wooden heat shield in two halves with the seam showing.
  const handguard = asm.part('handguard');
  for (const s of [-1, 1]) {
    handguard.add(
      mesh(
        latheZ(
          [
            [tubeR * 1.08, 0],
            [tubeR * 1.36, 0.008],
            [tubeR * 1.36, 0.25],
            [tubeR * 1.1, 0.26],
          ],
          14,
        ),
        pal.wood,
        [s * 0.0006, 0, 0.145],
      ),
    );
  }
  handguard.add(mesh(cylGeo(tubeR * 1.42, tubeR * 1.42, 0.008, 16), pal.metalDark, [0, 0, 0.14]));
  handguard.add(mesh(cylGeo(tubeR * 1.42, tubeR * 1.42, 0.008, 16), pal.metalDark, [0, 0, -0.108]));

  // --- grips and trigger ---------------------------------------------------
  const trigger = buildTriggerGroup(pal, { guardDepth: 0.05, width: 0.028 });
  trigger.guard.position.set(0, -tubeR - 0.014, 0.075);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -tubeR - 0.014, 0.075);
  asm.part('trigger').add(trigger.trigger);
  asm.part('triggerGuard').add(mesh(roundBoxGeo(0.03, 0.05, 0.07, 0.006, 2), pal.metalDark, [0, -tubeR - 0.014, 0.096]));

  const grip = buildPistolGrip(pal, { length: 0.112, radius: 0.0195, rake: 0.16, material: pal.wood });
  grip.group.position.set(0, -tubeR - 0.032, 0.12);
  asm.part('pistolGrip').add(grip.group);

  // Front grip under the heat shield: where the support hand actually goes.
  const foregrip = new THREE.Group();
  foregrip.position.set(0, -tubeR - 0.01, -0.02);
  foregrip.rotation.x = -0.1;
  asm.part('handguard').add(foregrip);
  foregrip.add(mesh(roundBoxGeo(0.03, 0.098, 0.036, 0.011, 2), pal.wood, [0, -0.049, 0]));
  foregrip.add(mesh(roundBoxGeo(0.034, 0.01, 0.04, 0.004, 1), pal.metalDark, [0, -0.098, 0]));
  const qd = buildQdSocket(pal);
  qd.position.set(-tubeR - 0.006, -0.01, 0.2);
  asm.part('slingMount').add(qd);

  // --- optic on a left-side bracket ---------------------------------------
  const optic = buildAcog(pal, rng);
  optic.group.position.set(-0.052, 0.038, 0.05);
  asm.part('optic').add(optic.group);
  asm.part('optic').add(mesh(roundBoxGeo(0.03, 0.03, 0.05, 0.004, 2), pal.metalDark, [-0.036, 0.03, 0.05]));
  asm.part('optic').add(mesh(boxGeo(0.03, 0.014, 0.04, 0.0016), pal.metalDark, [-0.02, 0.016, 0.05], [0, 0, 0.5]));

  // Backup irons on the tube itself.
  const front = buildFrontSight(pal, 0.022, { width: 0.016 });
  front.position.set(0, tubeR * 1.36, -0.16);
  asm.part('frontSight').add(front);
  const rear = buildRearSight(pal, 0.016, false);
  rear.position.set(0, tubeR + 0.004, 0.16);
  asm.part('rearSight').add(rear);

  // --- the loaded grenade --------------------------------------------------
  const ordnance = asm.part('ordnance');
  ordnance.add(buildRocketBody(pal, { tip: -0.83, tubeMouth: -0.5 }));

  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-tubeR - 0.001, 0.0, 0.3],
    face: 'left',
    lines: ['RPG-7V'],
    height: 0.0072,
  });
  addSerial(asm.part('markings'), pal, rng, [-tubeR - 0.001, -0.01, 0.36], 'left');
  addWear(asm.part('receiver'), pal, rng, { count: 10, center: [tubeR, 0.0, 0.2], area: [0.0008, 0.014, 0.22] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.84]),
    sight: optic.sight,
    eject: asm.anchor('eject', [0, 0, 0.44], [0, Math.PI, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.02, -0.5]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -tubeR - 0.055, -0.028], [0, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    reticle: optic.reticle,
    eyeRelief: optic.eyeRelief,
    hipTrim: [0.004, -0.01, 0.016],
    travel: { mag: 0.0, bolt: 0.0 },
    shoulderTube: true,
    gripRadius: 0.0195,
    supportRadius: 0.017,
    supportStyle: 'vertical',
  };
}

/**
 * PG-7 style grenade: ogive warhead, tapered standoff, motor tube and the
 * folded fin assembly at the tail. Used both for the loaded round on the
 * launcher and for the projectile in flight, so they cannot disagree.
 */
export function buildRocketBody(pal: GunPalette, opts: { tip: number; tubeMouth: number }): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rocket';
  const tip = opts.tip;
  const ogiveRear = tip + 0.22;

  // Piezo fuse cap on the nose.
  group.add(mesh(cylGeo(0.0044, 0.0062, 0.028, 12), pal.metalWorn, [0, 0, tip + 0.014]));
  // Ogive: widest just behind the shoulder, tapering to the fuse.
  group.add(
    mesh(
      latheZ(
        [
          [0.0168, 0],
          [0.0264, 0.022],
          [0.0356, 0.05],
          [0.0408, 0.082],
          [0.0402, 0.104],
          [0.0322, 0.14],
          [0.0198, 0.172],
          [0.0062, 0.19],
        ],
        20,
      ),
      pal.metalDark,
      [0, 0, ogiveRear],
    ),
  );
  // Motor tube running back into the launcher mouth.
  const motorLen = Math.max(0.06, ogiveRear - opts.tubeMouth + 0.06);
  group.add(mesh(cylGeo(0.0168, 0.0186, motorLen, 16), pal.metal, [0, 0, ogiveRear + motorLen * 0.5]));
  group.add(mesh(cylGeo(0.0208, 0.0208, 0.012, 16), pal.metalDark, [0, 0, ogiveRear + 0.01]));
  group.add(mesh(cylGeoX(0.0036, 0.048, 8), pal.metalWorn, [0, 0, ogiveRear + 0.03]));
  // Folded fin assembly around the tail.
  const finZ = ogiveRear + motorLen - 0.04;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    group.add(
      mesh(
        boxGeo(0.0022, 0.015, 0.055, 0.0005),
        pal.metalDark,
        [Math.cos(a) * 0.0208, Math.sin(a) * 0.0208, finZ],
        [0, 0, a - Math.PI / 2],
      ),
    );
  }
  return group;
}
