import * as THREE from 'three';
import {
  addMarkings,
  addSerial,
  addWear,
  buildChamberedCase,
  buildEjectionPort,
  buildPistolGrip,
  buildPlainMuzzle,
  buildStickMag,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import {
  Assembler,
  boreGeo,
  boxGeo,
  cylGeo,
  cylGeoX,
  discGeo,
  extrudeProfileX,
  framesAlongPath,
  latheZ,
  loft,
  railGeo,
  ringGeo,
  roundBoxGeo,
} from './Parts';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Sidearms.
 *
 * A pistol is 200 mm of hardware held at arm's length, so it fills less of the
 * frame than a rifle but every part of it is close to the camera: the slide
 * serrations, the trigger face and the tritium dots all read individually. Both
 * weapons therefore carry more small detail per centimetre than the rifles do.
 */

/** Striker-fired 9 mm service pistol: polymer frame, 17 rounds. */
export function buildSidearm({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('m19');
  const slideTop = 0.019;

  // --- slide ---------------------------------------------------------------
  const slide = asm.part('slide');
  slide.add(mesh(roundBoxGeo(0.026, 0.028, 0.19, 0.0035, 2), pal.metal, [0, 0.005, -0.006]));
  // Nose taper and the muzzle crown.
  slide.add(mesh(roundBoxGeo(0.024, 0.024, 0.02, 0.005, 2), pal.metal, [0, 0.004, -0.094]));
  slide.add(mesh(ringGeo(0.0092, 0.0048, 16), pal.metalWorn, [0, 0.002, -0.1045]));
  slide.add(mesh(boreGeo(0.0048, 0.05, 14), pal.bore, [0, 0.002, -0.104]));
  // Recoil-spring plug below the barrel.
  slide.add(mesh(discGeo(0.0052, 12), pal.metalDark, [0, -0.008, -0.1045]));
  // Rear and forward cocking serrations.
  for (let i = 0; i < 7; i++) {
    slide.add(mesh(boxGeo(0.0272, 0.02, 0.0022, 0.0005), pal.metalDark, [0, 0.006, 0.052 + i * 0.005]));
  }
  for (let i = 0; i < 4; i++) {
    slide.add(mesh(boxGeo(0.0272, 0.016, 0.0022, 0.0005), pal.metalDark, [0, 0.006, -0.052 - i * 0.005]));
  }
  const port = buildEjectionPort(pal, { width: 0.03, height: 0.016, side: 1 });
  port.port.position.set(0.0132, 0.011, -0.014);
  slide.add(port.port);
  const chamberedCase = buildChamberedCase(pal, 'pistol');
  chamberedCase.position.set(0.003, 0.009, -0.026);
  asm.part('chamberedCase').add(chamberedCase);

  // Sights, on the slide so they cycle with it. The rear is two blades with a real
  // gap: an inset dark panel looks like a notch from the side and blacks out the
  // target from behind it.
  // The aiming reference is the top of the rear blades, and the front post is
  // solved up to it: a post that stops at the notch floor is invisible in the one
  // view that matters, because the floor bar is nearer the eye and covers it.
  const rearH = 0.0062;
  const sightLine = slideTop + 0.0104;
  const notch = 0.0062;
  const blade = 0.0064;
  const front = asm.part('frontSight');
  const postH = sightLine - slideTop;
  front.add(mesh(boxGeo(0.0042, postH, 0.004, 0.0008), pal.metalDark, [0, slideTop + postH * 0.5, -0.082]));
  front.add(mesh(new THREE.SphereGeometry(0.0016, 8, 6), pal.tritium, [0, sightLine - 0.0018, -0.0842]));
  const rear = asm.part('rearSight');
  rear.add(mesh(boxGeo(0.0198, sightLine - rearH - slideTop, 0.0058, 0.0009), pal.metalDark,
    [0, (slideTop + sightLine - rearH) * 0.5, 0.072]));
  for (const s of [-1, 1]) {
    const x = s * (notch + blade) * 0.5;
    rear.add(mesh(boxGeo(blade, rearH, 0.0058, 0.0009), pal.metalDark, [x, sightLine - rearH * 0.5, 0.072]));
    rear.add(mesh(new THREE.SphereGeometry(0.0014, 8, 6), pal.tritium, [x, sightLine - 0.0026, 0.069]));
  }
  const sight = asm.anchor('sight', [0, sightLine, 0.072]);

  // --- frame ---------------------------------------------------------------
  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.028, 0.026, 0.13, 0.004, 2), pal.polymerDark, [0, -0.016, 0.006]));
  // Dust cover with an accessory rail, and the trigger-guard undercut.
  receiver.add(mesh(roundBoxGeo(0.024, 0.014, 0.07, 0.004, 2), pal.polymerDark, [0, -0.014, -0.05]));
  receiver.add(mesh(railGeo(0.045, 0.017), pal.polymerDark, [0, -0.022, -0.058], [Math.PI, 0, 0]));
  receiver.add(mesh(boxGeo(0.0292, 0.008, 0.05, 0.0012), pal.metalDark, [0, -0.003, 0.02]));
  // Slide-stop lever and takedown catch on the left.
  receiver.add(mesh(roundBoxGeo(0.005, 0.008, 0.024, 0.0018, 1), pal.metalWorn, [-0.0155, -0.005, -0.008]));
  receiver.add(mesh(cylGeoX(0.0036, 0.005, 10), pal.metalWorn, [-0.0155, -0.012, 0.016]));

  const magWell = asm.part('magWell');
  magWell.add(mesh(roundBoxGeo(0.03, 0.086, 0.036, 0.005, 2), pal.polymerDark, [0, -0.068, 0.052], [-0.3, 0, 0]));
  const magRelease = asm.part('magRelease');
  magRelease.add(mesh(roundBoxGeo(0.006, 0.011, 0.011, 0.0022, 1), pal.polymerDark, [-0.0155, -0.03, 0.032]));

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.036, width: 0.023, bar: 0.0062, drop: 0.0252 });
  trigger.guard.position.set(0, -0.024, 0.012);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.024, 0.012);
  asm.part('trigger').add(trigger.trigger);

  const grip = buildPistolGrip(pal, { length: 0.098, radius: 0.0175, rake: 0.31, material: pal.polymerDark });
  grip.group.position.set(0, -0.03, 0.05);
  asm.part('pistolGrip').add(grip.group);
  // Grip-tape border around the stippled area, and the beavertail undercut.
  for (const s of [-1, 1]) {
    asm.part('pistolGrip').add(
      mesh(boxGeo(0.0032, 0.052, 0.0022, 0.0006), pal.polymer, [s * 0.0152, -0.062, 0.0448], [-0.31, 0, 0]),
    );
    asm.part('pistolGrip').add(
      mesh(boxGeo(0.0032, 0.052, 0.0022, 0.0006), pal.polymer, [s * 0.0152, -0.062, 0.0712], [-0.31, 0, 0]),
    );
  }

  const mag = asm.part('magazine');
  const magGroup = buildStickMag(pal, { length: 0.1, width: 0.024, depth: 0.03, curve: 0.03, material: pal.metalDark });
  magGroup.position.set(0, -0.026, 0.048);
  magGroup.rotation.x = -0.31;
  mag.add(magGroup);

  addSerial(asm.part('markings'), pal, rng, [-0.0142, -0.012, 0.028], 'left');
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0132, 0.008, 0.03],
    face: 'left',
    lines: ['9x19'],
    height: 0.003,
  });
  addWear(asm.part('slide'), pal, rng, { count: 7, center: [0.0132, 0.006, 0.0], area: [0.0006, 0.011, 0.07] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0.002, -0.106]),
    sight,
    eject: asm.anchor('eject', [0.02, 0.014, -0.014], [0.4, -Math.PI / 2 + 0.3, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.11, 0.062]),
    grip: grip.anchor,
    // Support hand cups the firing hand from the left.
    support: asm.anchor('support', [0, -0.05, 0.062], [-0.31, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.265,
    // A pistol is punched out in front of the chest rather than shouldered.
    hipTrim: [0.012, -0.026, -0.05],
    hipTrimRotation: [0.02, 0, 0],
    travel: { slide: 0.036, mag: 0.12 },
    gripRadius: 0.0175,
    supportRadius: 0.03,
    supportStyle: 'cup',
  };
}

/** .44 magnum revolver: six shots, 152 mm vented-rib barrel, wood grips. */
export function buildRevolver({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('m29');
  /** Bore height: the radius of the chamber circle, so the bore meets a chamber. */
  const BORE_Y = 0.0128;

  // --- frame ---------------------------------------------------------------
  // A revolver is read from its window: the cylinder has to sit in a gap that is
  // open on both sides, bridged only by the top strap and the bottom rail. Any
  // frame block that overlaps the cylinder turns the whole gun into a slab.
  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.036, 0.05, 0.062, 0.005, 2), pal.metal, [0, 0.001, 0.055]));
  // Recoil shield: the round boss the cartridge heads bear on, with the firing-pin
  // bushing through it.
  receiver.add(mesh(cylGeo(0.0225, 0.0225, 0.008, 20), pal.metal, [0, 0, 0.028]));
  receiver.add(mesh(cylGeo(0.0058, 0.0058, 0.014, 10), pal.bore, [0, 0, 0.03]));
  // Top strap bridging the window, sight groove milled along it.
  receiver.add(mesh(roundBoxGeo(0.029, 0.011, 0.09, 0.003, 2), pal.metal, [0, 0.0272, 0.013]));
  receiver.add(mesh(boxGeo(0.0058, 0.004, 0.082, 0.0008), pal.bore, [0, 0.0315, 0.011]));
  // Bottom rail under the window carrying the crane, and the thin frame web ahead
  // of the cylinder that the barrel screws into. The web stays narrow: a block
  // there reads as a spool joining barrel to frame instead of a window.
  receiver.add(mesh(roundBoxGeo(0.027, 0.015, 0.058, 0.004, 2), pal.metal, [0, -0.0208, 0.006]));
  receiver.add(mesh(roundBoxGeo(0.0292, 0.048, 0.012, 0.0025, 2), pal.metal, [0, 0.0032, -0.0295]));
  receiver.add(mesh(latheZ([[0.0088, 0], [0.0098, 0.0035], [0.0098, 0.007]], 14), pal.metalWorn, [0, BORE_Y, -0.0225]));
  // Side plate with its screws, and the two frame pins.
  receiver.add(mesh(roundBoxGeo(0.0035, 0.034, 0.046, 0.003, 1), pal.metal, [0.018, 0.0, 0.056]));
  for (const p of [
    [0.0192, 0.014, 0.07],
    [0.0192, -0.012, 0.066],
    [0.0192, 0.0, 0.04],
  ] as const) {
    receiver.add(mesh(cylGeoX(0.0022, 0.0013, 8), pal.metalWorn, [p[0], p[1], p[2]]));
  }
  for (const s of [-1, 1]) {
    receiver.add(mesh(cylGeoX(0.0016, 0.0016, 8), pal.metalWorn, [s * 0.0182, 0.012, 0.032]));
  }

  // --- barrel with vented rib and underlug ---------------------------------
  // Barrel, rib and underlug all start at the frame web so the assembly reads as
  // one forging. Any gap between them shows up as the barrel floating.
  // The bore lines up with the chamber at the top of the cylinder, not with the
  // cylinder's own axis. Centring it is the classic revolver modelling mistake:
  // the barrel hangs 12 mm too low, the vent rib drops below the frame's top
  // strap instead of running flush with it, and the front sight then has to grow
  // into a 20 mm stalk to reach the rear notch.
  const barrel = asm.part('barrel');
  const bore = new THREE.Group();
  bore.position.y = BORE_Y;
  barrel.add(bore);
  bore.add(
    mesh(
      latheZ(
        [
          [0.0132, 0],
          [0.0138, 0.005],
          [0.0118, 0.014],
          [0.011, 0.166],
          [0.0116, 0.172],
          [0.0101, 0.174],
        ],
        18,
      ),
      pal.metal,
      [0, 0, -0.03],
    ),
  );
  bore.add(mesh(boreGeo(0.0056, 0.16, 16), pal.bore, [0, 0, -0.2]));
  // Vent rib on top: a flat bar with real slots cut through it.
  bore.add(mesh(boxGeo(0.014, 0.008, 0.172, 0.0014), pal.metal, [0, 0.0158, -0.114]));
  for (let i = 0; i < 7; i++) {
    bore.add(mesh(boxGeo(0.0148, 0.009, 0.0055, 0.0008), pal.bore, [0, 0.0158, -0.062 - i * 0.019]));
  }
  // Full underlug shrouding the ejector rod, with the rod's knurled head and the
  // detent boss at the front. It stays down on the rod rather than riding up with
  // the bore, so the lug still fills the space over the crane.
  barrel.add(mesh(roundBoxGeo(0.0158, 0.019, 0.148, 0.0035, 2), pal.metal, [0, -0.0074, -0.104]));
  barrel.add(mesh(cylGeo(0.0042, 0.0042, 0.05, 10), pal.metalWorn, [0, -0.0074, -0.054]));
  barrel.add(mesh(latheZ([[0.0058, 0], [0.007, 0.003], [0.007, 0.011], [0.0056, 0.013]], 12), pal.metalWorn, [0, -0.0074, -0.032]));
  barrel.add(mesh(roundBoxGeo(0.011, 0.009, 0.014, 0.0022, 1), pal.metalDark, [0, -0.0122, -0.172]));

  const muzzle = asm.part('muzzleDevice');
  const crown = buildPlainMuzzle(pal, { bodyR: 0.0104, boreR: 0.0056, length: 0.012 });
  crown.position.set(0, BORE_Y, -0.202);
  muzzle.add(crown);

  // --- cylinder ------------------------------------------------------------
  const cylinder = asm.part('cylinder');
  cylinder.position.set(0, 0, 0.0);
  const cylBody = new THREE.Group();
  cylBody.position.z = 0.001;
  cylinder.add(cylBody);
  // Flutes have to be in the silhouette, not painted on it: a dark panel laid over
  // a plain cylinder still shows a round edge against the frame window. The
  // cross-section itself is scalloped between the six chamber bosses and lofted,
  // so the flutes catch light on their walls and break the outline.
  const CYL_R = 0.0212;
  const fluted: THREE.Vector2[] = [];
  for (let i = 0; i < 66; i++) {
    const a = (i / 66) * Math.PI * 2;
    const lobe = Math.max(0, -Math.cos(a * 6));
    const r = 1 - 0.135 * Math.pow(lobe, 0.55);
    fluted.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const cylZ = [-0.023, -0.0212, -0.0192, 0.0192, 0.0212, 0.023].map((z) => new THREE.Vector3(0, 0, z));
  const cylMesh = new THREE.Mesh(
    loft(fluted, framesAlongPath(cylZ, [CYL_R * 0.9, CYL_R * 0.985, CYL_R, CYL_R, CYL_R * 0.985, CYL_R * 0.9]), true, true),
    pal.metalDark,
  );
  cylMesh.frustumCulled = false;
  cylBody.add(cylMesh);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const r = 0.0128;
    cylBody.add(mesh(boreGeo(0.0058, 0.042, 10), pal.bore, [Math.cos(a) * r, Math.sin(a) * r, -0.0225]));
    // Bolt notches around the rear face, one per chamber.
    cylBody.add(
      mesh(boxGeo(0.0032, 0.0026, 0.005, 0.0004), pal.bore, [Math.cos(a - 0.52) * 0.0206, Math.sin(a - 0.52) * 0.0206, 0.0205]),
    );
  }
  // Ratchet and extractor star at the rear, centre pin through the front.
  cylBody.add(mesh(cylGeo(0.0068, 0.0068, 0.052, 12), pal.metalWorn, [0, 0, 0]));
  cylBody.add(mesh(ringGeo(0.0132, 0.0068, 18), pal.metalWorn, [0, 0, -0.0232]));
  cylBody.add(mesh(cylGeo(0.0104, 0.0104, 0.004, 14), pal.metalWorn, [0, 0, 0.0245]));
  // Crane and cylinder latch.
  asm.part('magRelease').add(mesh(roundBoxGeo(0.0065, 0.011, 0.024, 0.0022, 1), pal.metalWorn, [-0.019, -0.005, 0.034]));

  // --- action --------------------------------------------------------------
  // One extruded spur rather than a stack of blocks: the hammer is silhouetted
  // against the sky above the frame, so every seam in it shows.
  const hammer = asm.part('hammer');
  hammer.position.set(0, 0.004, 0.066);
  hammer.add(
    mesh(
      extrudeProfileX(
        [
          [-0.005, 0.0],
          [-0.006, 0.014],
          [-0.0035, 0.0202],
          [0.006, 0.0236],
          [0.0122, 0.0254],
          [0.0128, 0.0206],
          [0.0055, 0.0176],
          [0.0042, 0.011],
          [0.005, 0.0],
        ],
        0.0072,
        0.0016,
      ),
      pal.metalWorn,
    ),
  );
  // Checkered thumb pad on the top of the spur.
  for (let i = 0; i < 4; i++) {
    hammer.add(mesh(boxGeo(0.0092, 0.0018, 0.0022, 0.0004), pal.metalDark, [0, 0.0242 + i * 0.0006, 0.0062 + i * 0.0018]));
  }

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.044, width: 0.022, bar: 0.0072, drop: 0.028 });
  trigger.guard.position.set(0, -0.014, 0.042);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.014, 0.042);
  asm.part('trigger').add(trigger.trigger);

  // --- grips ---------------------------------------------------------------
  const grip = buildPistolGrip(pal, {
    length: 0.1,
    radius: 0.019,
    rake: 0.34,
    material: pal.wood,
    beavertail: false,
  });
  grip.group.position.set(0, -0.024, 0.07);
  asm.part('pistolGrip').add(grip.group);
  // Steel backstrap the wood panels are screwed to, plus the escutcheon.
  asm.part('pistolGrip').add(
    mesh(roundBoxGeo(0.0155, 0.086, 0.007, 0.002, 2), pal.metal, [0, -0.068, 0.1055], [-0.34, 0, 0]),
  );
  asm.part('pistolGrip').add(mesh(cylGeoX(0.0035, 0.0018, 10), pal.metalWorn, [0.0155, -0.058, 0.084]));

  // --- sights --------------------------------------------------------------
  // Both sights are solved off one number. The aiming reference on an open sight
  // is the top of the rear blades, not the floor of the notch: put the axis on the
  // floor and the front blade's tip is exactly the part of it the notch hides.
  const RIB_TOP = BORE_Y + 0.0198;
  const STRAP_TOP = 0.0327;
  const rearH = 0.0096;
  const sightLine = STRAP_TOP + rearH;
  const front = asm.part('frontSight');
  const bladeH = sightLine - RIB_TOP;
  front.add(mesh(boxGeo(0.0044, bladeH, 0.011, 0.0008), pal.metalDark, [0, RIB_TOP + bladeH * 0.5, -0.1915]));
  front.add(mesh(boxGeo(0.0048, bladeH * 0.82, 0.0022, 0.0004), pal.tritium, [0, RIB_TOP + bladeH * 0.5, -0.1968]));
  // Ramp running back down onto the rib.
  front.add(mesh(boxGeo(0.0062, 0.0034, 0.03, 0.0008), pal.metal, [0, RIB_TOP + 0.0026, -0.178], [-0.2, 0, 0]));
  const rear = asm.part('rearSight');
  const notch = 0.0066;
  const rearBlade = 0.0062;
  for (const s of [-1, 1]) {
    const x = s * (notch + rearBlade) * 0.5;
    rear.add(mesh(boxGeo(rearBlade, rearH, 0.009, 0.0009), pal.metalDark, [x, STRAP_TOP + rearH * 0.5, 0.0505]));
    // White outline, on the blades only — a bar across the full width would sit
    // in the notch, nearer the eye than anything else on the gun.
    rear.add(mesh(boxGeo(rearBlade, 0.0042, 0.0022, 0.0005), pal.metalWorn, [x, sightLine - 0.0024, 0.0556]));
  }
  rear.add(mesh(boxGeo(0.0192, rearH * 0.52, 0.009, 0.0009), pal.metalDark, [0, STRAP_TOP + rearH * 0.26, 0.0505]));
  rear.add(mesh(boxGeo(0.0206, 0.0042, 0.014, 0.0009), pal.metal, [0, STRAP_TOP + 0.0018, 0.0592]));
  const sight = asm.anchor('sight', [0, sightLine, 0.0505]);

  addSerial(asm.part('markings'), pal, rng, [-0.0182, -0.008, 0.04], 'left');
  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0072, 0.0, -0.12],
    face: 'left',
    lines: ['.44 MAGNUM'],
    height: 0.0034,
  });
  addWear(asm.part('receiver'), pal, rng, { count: 6, center: [0.018, 0.0, 0.03], area: [0.0006, 0.014, 0.03] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.204]),
    sight,
    eject: asm.anchor('eject', [0.0, -0.02, 0.0], [-1.2, 0, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.02, 0.0]),
    grip: grip.anchor,
    support: asm.anchor('support', [0, -0.05, 0.084], [-0.34, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.275,
    hipTrim: [0.012, -0.026, -0.052],
    hipTrimRotation: [0.02, 0, 0],
    travel: { mag: 0.0, cylinderStep: Math.PI / 3 },
    gripRadius: 0.019,
    supportRadius: 0.03,
    supportStyle: 'cup',
  };
}
