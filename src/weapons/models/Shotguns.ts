import * as THREE from 'three';
import {
  addMarkings,
  addSerial,
  addWear,
  buildBarrel,
  buildChamberedCase,
  buildEjectionPort,
  buildFixedStock,
  buildPlainMuzzle,
  buildRibbedForend,
  buildSlingLoop,
  buildTriggerGroup,
  partMesh as mesh,
} from './Common';
import { buildGhostRing } from './Optics';
import { Assembler, boxGeo, cylGeo, cylGeoX, discGeo, latheZ, ringGeo, roundBoxGeo } from './Parts';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Pump-action 12 gauge, 1000 mm with an 18.5 inch barrel.
 *
 * The pump is the whole point: it is a separate part on its own travel axis with
 * the support hand anchored inside it, so cycling the action drags the left arm
 * with it for free. A tube magazine under the barrel and a loading port in the
 * bottom of the receiver make the shell-at-a-time reload legible.
 */
export function buildPumpShotgun({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('m870');
  const sightLine = 0.036;

  // --- receiver ------------------------------------------------------------
  const receiver = asm.part('receiver');
  receiver.add(mesh(roundBoxGeo(0.042, 0.05, 0.19, 0.005, 2), pal.metal, [0, -0.008, 0.058]));
  // Milled top with a ghost-ring base, and the bevel down to the loading port.
  receiver.add(mesh(roundBoxGeo(0.036, 0.016, 0.17, 0.004, 2), pal.metal, [0, 0.02, 0.05]));
  receiver.add(mesh(roundBoxGeo(0.03, 0.014, 0.09, 0.004, 1), pal.metalDark, [0, -0.034, 0.03]));
  // Loading port: a real recess in the underside.
  receiver.add(mesh(boxGeo(0.024, 0.006, 0.07, 0.0016), pal.bore, [0, -0.038, 0.02]));
  receiver.add(mesh(roundBoxGeo(0.034, 0.03, 0.026, 0.004, 1), pal.metal, [0, -0.006, -0.044]));

  // --- barrel and magazine tube -------------------------------------------
  const barrel = asm.part('barrel');
  const barrelGroup = buildBarrel(pal, { length: 0.5, breechR: 0.0148, muzzleR: 0.0126, threadAt: 0.48 });
  barrelGroup.position.z = -0.055;
  barrel.add(barrelGroup);
  // Barrel-to-tube bridge and the magazine tube itself.
  barrel.add(mesh(cylGeo(0.0132, 0.0132, 0.36, 14), pal.metalDark, [0, -0.026, -0.235]));
  barrel.add(
    mesh(
      latheZ(
        [
          [0.0142, 0],
          [0.0148, 0.004],
          [0.0148, 0.016],
          [0.0126, 0.02],
        ],
        14,
      ),
      pal.metal,
      [0, -0.026, -0.415],
    ),
  );
  barrel.add(mesh(roundBoxGeo(0.018, 0.03, 0.022, 0.004, 1), pal.metalDark, [0, -0.014, -0.078]));

  const muzzle = asm.part('muzzleDevice');
  const choke = buildPlainMuzzle(pal, { bodyR: 0.0132, boreR: 0.0092, length: 0.024 });
  choke.position.z = -0.578;
  muzzle.add(choke);

  // --- pump ----------------------------------------------------------------
  const pump = asm.part('pumpHandle');
  const forend = buildRibbedForend(pal, { length: 0.132, width: 0.046, height: 0.044, ribs: 8, material: pal.polymer });
  forend.position.set(0, -0.017, -0.208);
  pump.add(forend);
  // Action bars running back into the receiver.
  for (const s of [-1, 1]) {
    pump.add(mesh(boxGeo(0.005, 0.008, 0.15, 0.0012), pal.metalWorn, [s * 0.016, -0.024, -0.115]));
  }
  pump.add(mesh(ringGeo(0.023, 0.0148, 16), pal.metalDark, [0, -0.026, -0.34]));

  // --- stock ---------------------------------------------------------------
  const stock = asm.part('stock');
  const stockGroup = buildFixedStock(pal, { length: 0.29, material: pal.polymer, drop: 0.075 });
  stockGroup.position.set(0, -0.006, 0.144);
  stockGroup.rotation.x = 0.03;
  stock.add(stockGroup);
  const sling = asm.part('slingMount');
  const loop = buildSlingLoop(pal, 0.0085);
  loop.position.set(0, -0.078, 0.4);
  sling.add(loop);

  const trigger = buildTriggerGroup(pal, { guardDepth: 0.05, width: 0.028 });
  trigger.guard.position.set(0, -0.03, 0.078);
  asm.part('triggerGuard').add(trigger.guard);
  trigger.trigger.position.set(0, -0.03, 0.078);
  asm.part('trigger').add(trigger.trigger);
  // Cross-bolt safety through the rear of the guard.
  const selector = asm.part('safetySelector');
  selector.position.set(0, -0.018, 0.104);
  selector.add(mesh(cylGeoX(0.0042, 0.03, 10), pal.metalDark));
  selector.add(mesh(cylGeoX(0.0052, 0.005, 10), pal.metalWorn, [0.015, 0, 0]));

  // --- action --------------------------------------------------------------
  const bolt = asm.part('boltCarrier');
  bolt.add(mesh(boxGeo(0.026, 0.026, 0.08, 0.002), pal.metalWorn, [0, -0.004, 0.05]));
  const port = buildEjectionPort(pal, { width: 0.062, height: 0.024, side: 1 });
  port.port.position.set(0.0212, 0.0, 0.04);
  asm.part('ejectionPort').add(port.port);
  const chambered = asm.part('chamberedCase');
  const shell = buildChamberedCase(pal, 'shotgun');
  shell.position.set(0.004, -0.002, 0.02);
  chambered.add(shell);
  // Shell carrier visible in the loading port when the tube is full.
  chambered.add(mesh(cylGeo(0.0088, 0.0088, 0.05, 12), pal.rubber, [0, -0.034, -0.05]));

  // --- sights: bead on a ramp, ghost ring at the rear ----------------------
  // The ring is a real annulus and the bead is solved onto its centre, so the
  // sight picture is bead-in-ring rather than a bead beside a blanked-off disc.
  const front = asm.part('frontSight');
  // The bead's centre is the aiming reference, so it goes on the sight line and
  // the ramp is built up to it — not the other way round.
  front.add(mesh(roundBoxGeo(0.008, 0.021, 0.026, 0.0022, 1), pal.metalDark, [0, sightLine - 0.0135, -0.53]));
  front.add(mesh(new THREE.SphereGeometry(0.0028, 10, 8), pal.tritium, [0, sightLine, -0.536]));
  const rear = asm.part('rearSight');
  const ring = buildGhostRing(pal, { ringR: 0.0098, holeR: 0.0062, depth: 0.008, segments: 18 });
  ring.position.set(0, sightLine, 0.128);
  rear.add(ring);
  // Protective ears either side of the ring, and the base it stands on.
  for (const s of [-1, 1]) {
    rear.add(mesh(boxGeo(0.003, 0.019, 0.012, 0.0008), pal.metal, [s * 0.0122, sightLine - 0.004, 0.128]));
  }
  rear.add(mesh(boxGeo(0.024, 0.011, 0.015, 0.0014), pal.metalDark, [0, sightLine - 0.0138, 0.127]));
  const sight = asm.anchor('sight', [0, sightLine, 0.13]);

  addMarkings(asm.part('markings'), pal, rng, {
    pos: [-0.0212, -0.006, 0.06],
    face: 'left',
    lines: ['12 GA 2 3/4'],
    height: 0.0032,
  });
  addSerial(asm.part('markings'), pal, rng, [-0.0212, -0.024, 0.0], 'left');
  addWear(asm.part('receiver'), pal, rng, { count: 9, center: [0.0212, -0.006, 0.05], area: [0.0008, 0.018, 0.08] });
  addWear(asm.part('pumpHandle'), pal, rng, { count: 5, center: [0.0235, -0.017, -0.21], area: [0.0008, 0.012, 0.06] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, 0, -0.58]),
    sight,
    eject: asm.anchor('eject', [0.028, 0.006, 0.04], [0.24, -Math.PI / 2 + 0.2, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.04, 0.02]),
    // Placed inside the pump so the support hand rides the action.
    grip: asm.anchor('gripAnchor', [0, -0.062, 0.19], [-0.34, 0, 0]),
    support: asm.anchor('support', [0, -0.017, -0.208], [Math.PI / 2, 0, 0], 'pumpHandle'),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.215,
    hipTrim: [0, 0, 0.008],
    travel: { pump: 0.075, bolt: 0.04, mag: 0.0 },
    supportOnPump: true,
    gripRadius: 0.019,
    supportRadius: 0.023,
  };
}
