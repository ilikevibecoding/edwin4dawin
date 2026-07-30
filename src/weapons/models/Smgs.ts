import * as THREE from 'three';
import {
  addMarkings,
  addSerial,
  addWear,
  buildBarrel,
  buildChamberedCase,
  buildEjectionPort,
  buildBlockStock,
  buildFlashHider,
  buildHandguard,
  buildPistolGrip,
  buildPlainMuzzle,
  buildQdSocket,
  buildStanagMag,
  buildStickMag,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import { buildFrontSight, buildGhostRing, buildRearSight, buildRedDot, frontPostFor, ironSightLine } from './Optics';
import { Assembler, boxGeo, cylGeo, cylGeoX, latheZ, railGeo, roundBoxGeo } from './Parts';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Submachine guns. Both are 680 mm and 610 mm class weapons, so the whole gun
 * fits comfortably in frame — which means every part is on screen at all times
 * and none of them can be approximated.
 */

/** Roller-delayed 9 mm SMG: tubular receiver, drum sight, slim forend. */
export function buildMp5({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('mp5');
  const sightLine = 0.045;

  const receiver = asm.part('receiver');
  // Round stamped receiver with a flat top and a squared magwell housing.
  receiver.add(
    mesh(
      latheZ(
        [
          [0.0196, 0],
          [0.0212, 0.006],
          [0.0212, 0.226],
          [0.0192, 0.236],
        ],
        14,
      ),
      pal.metal,
      [0, 0.002, 0.142],
    ),
  );
  receiver.add(mesh(boxGeo(0.03, 0.012, 0.2, 0.0018), pal.metal, [0, 0.019, 0.03]));
  // Trunnion and the cocking-tube boss on the left.
  receiver.add(mesh(roundBoxGeo(0.036, 0.036, 0.03, 0.004, 2), pal.metalDark, [0, 0.002, -0.088]));
  receiver.add(
    mesh(
      latheZ([[0.0092, 0], [0.0104, 0.004], [0.0104, 0.15], [0.009, 0.156]], 12),
      pal.metalDark,
      [-0.018, 0.02, -0.09],
    ),
  );

  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.215, breechR: 0.0112, muzzleR: 0.0084, threadAt: 0.192 });
  barrelGroup.position.z = -0.09;
  barrel.add(barrelGroup);

  const muzzle = asm.part('muzzleDevice');
  const device = buildPlainMuzzle(pal, { bodyR: 0.0096, boreR: 0.0044, length: 0.02 });
  device.position.z = -0.305;
  muzzle.add(device);
  // Three-lug barrel collar.
  muzzle.add(mesh(latheZ([[0.0122, 0], [0.0132, 0.003], [0.0132, 0.012], [0.0116, 0.015]], 14), pal.metalDark, [0, 0, -0.288]));

  const handguard = asm.part('handguard');
  const hg = buildHandguard(pal, { length: 0.15, radius: 0.024, rail: false, slotRows: 2, facets: 12, material: pal.polymer });
  hg.position.z = -0.096;
  handguard.add(hg);
  handguard.add(mesh(roundBoxGeo(0.03, 0.012, 0.13, 0.004, 1), pal.polymerDark, [0, -0.022, -0.16]));
  const qd = buildQdSocket(pal);
  qd.position.set(-0.02, -0.012, -0.1);
  handguard.add(qd);

  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.03, 0.03, 0.05, 0.004, 2), pal.metal, [0, -0.026, -0.014]));

  const mag = asm.part('magazine');
  // A 9 mm stick is nearly straight and slim: the double-stack taper is what
  // gives an MP5 mag its read, not a curve.
  const magGroup = buildStanagMag(pal, { length: 0.2, curve: 0.1, width: 0.025, depth: 0.028, material: pal.metalDark });
  magGroup.position.set(0, -0.04, -0.014);
  mag.add(magGroup);

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.042, width: 0.028 });
  trigger.guard.position.set(0, -0.026, 0.058);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.026, 0.058);
  asm.part('trigger').add(trigger.trigger);
  // Polymer trigger group housing.
  asm.part('triggerGuard').add(mesh(roundBoxGeo(0.032, 0.03, 0.09, 0.005, 2), pal.polymer, [0, -0.022, 0.07]));

  const grip = buildPistolGrip(pal, { length: 0.098, radius: 0.0178, rake: 0.3, material: pal.polymer });
  grip.group.position.set(0, -0.036, 0.088);
  asm.part('pistolGrip').add(grip.group);

  const selector = asm.part('safetySelector');
  selector.position.set(-0.018, -0.024, 0.072);
  selector.add(mesh(cylGeoX(0.0055, 0.006, 10), pal.metalDark));
  selector.add(mesh(roundBoxGeo(0.005, 0.008, 0.024, 0.002, 1), pal.metalDark, [-0.003, 0, 0.01]));

  const stock = asm.part('stock');
  const stockGroup = buildBlockStock(pal, {
    length: 0.235,
    material: pal.polymer,
    // A retractable SMG stock is a near-constant section, not a wedge.
    frontHeight: 0.04,
    buttHeight: 0.046,
    rise: 0.002,
    width: 0.032,
  });
  stockGroup.position.set(0, 0.002, 0.152);
  stock.add(stockGroup);

  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(cylGeo(0.0116, 0.0116, 0.09, 14), pal.metalWorn, [0, 0.002, 0.05]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.016, 0.0092, 0.026, 0.0018), pal.metalDark, [-0.026, 0.02, -0.212]));
  charging.add(mesh(cylGeo(0.005, 0.005, 0.05, 8), pal.metalDark, [-0.018, 0.02, -0.19]));

  const port = buildEjectionPort(pal, { width: 0.03, height: 0.016, side: 1 });
  port.port.position.set(0.0202, 0.006, 0.05);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'pistol');
  caseGroup.position.set(0.005, 0.005, 0.03);
  chambered.add(caseGroup);

  // Rotating drum rear sight and hooded front post. The drum is a real aperture
  // through the middle: on a sight this size the hole IS the sight picture, and a
  // blanked-off drum blacks out the target the player is aiming at.
  const rear = asm.part('rearSight');
  const drum = new THREE.Group();
  drum.position.set(0, sightLine, 0.132);
  rear.add(drum);
  // The drum is a solid body of revolution with the selected aperture bored
  // straight through it, which is what the real sight is: four holes around a
  // rotating cylinder, one of them on the optical axis at a time. Building it as
  // open shells instead leaves a second, larger window around the aperture and the
  // player cannot tell which of the two holes is the sight.
  //
  // The bore is oversized against scale, deliberately: at a viewmodel eye relief
  // of 200 mm a true 3 mm peep is two pixels across, and this hole is the thing
  // the player spends the match looking through.
  const DRUM_R = 0.0176;
  drum.add(buildGhostRing(pal, { ringR: DRUM_R, holeR: 0.0072, depth: 0.017, segments: 22 }));
  // Knurled thumb tabs on the drum's rim. Nothing spun about the drum's own axis
  // can go here: seen from the eye it projects to a bar straight across the bore,
  // whatever its radius, and crops the aperture into a letterbox.
  for (const s of [-1, 1]) {
    for (const a of [-0.5, 0.5]) {
      drum.add(mesh(roundBoxGeo(0.005, 0.0062, 0.013, 0.0016, 1), pal.metalDark,
        [s * 0.0112, Math.cos(a) * DRUM_R * 0.9, Math.sin(a) * DRUM_R * 0.9], [-a, 0, 0]));
    }
  }
  // Range settings stamped around the circumference.
  for (const a of [-0.62, 0, 0.62]) {
    drum.add(mesh(boxGeo(0.011, 0.0016, 0.004, 0.0004), pal.metalWorn,
      [0, Math.cos(a) * DRUM_R, Math.sin(a) * DRUM_R], [-a + Math.PI / 2, 0, 0]));
  }
  rear.add(mesh(boxGeo(0.013, 0.016, 0.01, 0.0012), pal.metalDark, [0, sightLine - 0.018, 0.118]));

  const front = asm.part('frontSight');
  const postTop = sightLine;
  front.add(
    mesh(
      latheZ([[0.0092, 0], [0.0102, 0.003], [0.0102, 0.02], [0.0092, 0.023]], 14),
      pal.metalDark,
      [0, sightLine, -0.244],
    ),
  );
  // Wider than scale. The post has to be legible inside the rear aperture, and at
  // 375 mm in front of a 200 mm eye relief a true 2.5 mm blade is two pixels wide.
  front.add(mesh(boxGeo(0.0046, 0.013, 0.003, 0.0007), pal.metalWorn, [0, postTop - 0.0065, -0.256]));
  const sight = asm.anchor('sight', [0, sightLine, 0.13]);

  addSerial(asm.part('markings'), pal, rng, [-0.0215, 0.0, 0.02], 'left');
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0195, -0.024, 0.066],
    face: 'left',
    lines: ['S E F'],
    height: 0.0032,
  });
  // The one marking on this weapon meant to be read rather than just seen. The
  // serial and the selector letters above are 3 mm, which is right for a 9 mm
  // receiver and four pixels on screen; without something at ten times the area
  // the gun carries no legible stencil at all, which is the review's "one
  // illegible decal" for every weapon that is not the carbine.
  //
  // On the upper-left of the forend, because that facet is flat — the shell is a
  // 12-sided lathe, so 12 mm of facet is a plane and a flat quad sits flush on
  // it, where the same quad across the receiver tube behind would bury its first
  // and last glyph 2.5 mm deep. Forward of the barrel-nut collar at -0.116 and
  // behind the support hand at -0.17. The other two flats there carry the slot
  // rows, which for a two-row forend are the underside and the right.
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.014, 0.014, -0.135],
    face: 'upperLeft',
    lines: ['MP5'],
    height: 0.0105,
    color: 0xdcd8cd,
    wear: 0.1,
  });
  addWear(asm.part('receiver'), pal, rng, { count: 7, center: [0.0212, 0.004, 0.08], area: [0.0006, 0.012, 0.09] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.307]),
    sight,
    eject: asm.anchor('eject', [0.026, 0.01, 0.05], [0.3, -Math.PI / 2 + 0.24, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.05, -0.014]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.004, -0.17], [Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.2,
    hipTrim: [0, 0, 0.006],
    travel: { bolt: 0.05, charging: 0.05, mag: 0.16 },
    gripRadius: 0.0178,
    supportRadius: 0.024,
  };
}

/** Delayed-recoil .45 SMG: boxy upper, in-line magazine, folding stock. */
export function buildVector({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('vector');
  const railTop = 0.036;

  const receiver = asm.part('receiver');
  // Squared polymer upper with the distinctive down-swept lower housing.
  receiver.add(mesh(roundBoxGeo(0.042, 0.058, 0.24, 0.006, 2), pal.polymer, [0, 0.006, 0.052]));
  receiver.add(mesh(roundBoxGeo(0.04, 0.062, 0.1, 0.007, 2), pal.polymer, [0, -0.032, 0.104], [-0.3, 0, 0]));
  receiver.add(mesh(roundBoxGeo(0.044, 0.024, 0.08, 0.005, 2), pal.polymerDark, [0, -0.016, -0.03]));

  const upperRail = asm.part('upperRail');
  upperRail.add(mesh(railGeo(0.23), pal.metal, [0, railTop, 0.05]));

  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.17, breechR: 0.011, muzzleR: 0.0086, threadAt: 0.146 });
  barrelGroup.position.z = -0.062;
  barrel.add(barrelGroup);

  const muzzle = asm.part('muzzleDevice');
  const device = buildFlashHider(pal, { bodyR: 0.0108, length: 0.042, boreR: 0.0052, prongs: 4 });
  device.position.z = -0.238;
  muzzle.add(device);

  const handguard = asm.part('handguard');
  handguard.add(mesh(roundBoxGeo(0.038, 0.036, 0.1, 0.006, 2), pal.polymer, [0, -0.012, -0.115]));
  handguard.add(mesh(railGeo(0.09), pal.metal, [0, 0.007, -0.115]));
  for (const s of [-1, 1]) {
    handguard.add(mesh(railGeo(0.07, 0.018), pal.metal, [s * 0.019, -0.012, -0.115], [0, 0, (s * Math.PI) / 2]));
  }
  // Angled foregrip.
  const fg = new THREE.Group();
  fg.position.set(0, -0.03, -0.12);
  fg.rotation.x = -0.45;
  handguard.add(fg);
  fg.add(mesh(roundBoxGeo(0.024, 0.07, 0.03, 0.009, 2), pal.polymerDark, [0, -0.035, 0]));

  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.032, 0.03, 0.036, 0.004, 2), pal.polymerDark, [0, -0.03, -0.008]));

  const mag = asm.part('magazine');
  const magGroup = buildStickMag(pal, { length: 0.14, width: 0.028, depth: 0.032, curve: 0.04, material: pal.polymerDark });
  magGroup.position.set(0, -0.042, -0.008);
  mag.add(magGroup);

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.042, width: 0.03 });
  trigger.guard.position.set(0, -0.03, 0.052);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.03, 0.052);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.1, radius: 0.0178, rake: 0.2, material: pal.polymer });
  grip.group.position.set(0, -0.05, 0.086);
  asm.part('pistolGrip').add(grip.group);

  const stock = asm.part('stock');
  // Side-folding stock: struts plus a thin butt plate.
  stock.add(mesh(roundBoxGeo(0.03, 0.03, 0.03, 0.005, 1), pal.polymerDark, [0, 0.014, 0.176]));
  for (const s of [-1, 1]) {
    stock.add(mesh(cylGeo(0.0055, 0.0055, 0.12, 8), pal.metalDark, [s * 0.011, 0.016, 0.235]));
  }
  stock.add(mesh(roundBoxGeo(0.036, 0.056, 0.012, 0.005, 2), pal.rubber, [0, 0.008, 0.298]));
  stock.add(mesh(roundBoxGeo(0.024, 0.014, 0.06, 0.004, 1), pal.polymerDark, [0, 0.032, 0.25]));

  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(boxGeo(0.026, 0.024, 0.07, 0.002), pal.metalWorn, [0, 0.008, 0.05]));
  const charging = asm.part('chargingHandle');
  charging.add(mesh(boxGeo(0.026, 0.008, 0.014, 0.0016), pal.metalDark, [-0.02, 0.026, 0.108]));

  const port = buildEjectionPort(pal, { width: 0.032, height: 0.018, side: 1 });
  port.port.position.set(0.0212, 0.01, 0.05);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const caseGroup = buildChamberedCase(pal, 'pistol');
  caseGroup.position.set(0.005, 0.008, 0.028);
  chambered.add(caseGroup);

  const selector = asm.part('safetySelector');
  selector.position.set(-0.021, -0.028, 0.062);
  selector.add(mesh(cylGeoX(0.005, 0.005, 10), pal.metalDark));
  selector.add(mesh(roundBoxGeo(0.0045, 0.008, 0.02, 0.0018, 1), pal.metalDark, [-0.003, 0, 0.008]));

  // Tube reflex rather than the holo the carbine carries: two guns with the
  // same sight picture is a wasted difference between them.
  const optic = buildRedDot(pal, rng);
  optic.group.position.set(0, railTop, 0.062);
  asm.part('optic').add(optic.group);

  const front = buildFrontSight(pal, 0.024, { width: 0.017 });
  front.position.set(0, 0.0125, -0.16);
  front.rotation.x = -1.44;
  asm.part('frontSight').add(front);
  const rear = buildRearSight(pal, 0.03, true);
  rear.position.set(0, railTop, 0.14);
  rear.rotation.x = -1.44;
  asm.part('rearSight').add(rear);

  addSerial(asm.part('markings'), pal, rng, [-0.0215, -0.012, 0.012], 'left');
  // Calibre on the left flank of the upper, at a size that survives hipfire. This
  // receiver is a rounded box rather than a tube, so its flank is genuinely flat
  // and the stencil can be as long as it likes; 43 mm of it sits between the
  // magwell shoulder and the charging handle slot at 0.101.
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.021, 0.016, 0.078],
    face: 'left',
    lines: ['.45 ACP'],
    height: 0.0105,
    color: 0xdcd8cd,
    wear: 0.1,
  });
  addWear(asm.part('receiver'), pal, rng, { count: 5, center: [0.0212, 0.006, 0.05], area: [0.0006, 0.016, 0.08] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.24]),
    sight: optic.sight,
    eject: asm.anchor('eject', [0.028, 0.012, 0.05], [0.34, -Math.PI / 2 + 0.26, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.05, -0.008]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.058, -0.128], [0, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    reticle: optic.reticle,
    eyeRelief: optic.eyeRelief,
    hipTrim: [0, 0, 0.004],
    travel: { bolt: 0.042, charging: 0.042, mag: 0.14 },
    gripRadius: 0.0178,
    supportRadius: 0.014,
    supportStyle: 'vertical',
  };
}
