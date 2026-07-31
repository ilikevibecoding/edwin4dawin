import * as THREE from 'three';
import { addSerial, addWear, partMesh as mesh } from './Common';
import type { GunPalette } from './Materials';
import {
  Assembler,
  boxGeo,
  circleProfile,
  cylGeo,
  cylGeoX,
  framesAlongPath,
  loft,
  ovalProfile,
  roundBoxGeo,
} from './Parts';
import type { RifleContext } from './Rifles';
import type { WeaponBuild } from './WeaponModel';

/**
 * Combat knife.
 *
 * A 178 mm drop-point blade. The blade is a swept lens cross-section rather than
 * a flattened box, because the two things that sell a knife are the highlight
 * running along the primary bevel and the way the spine catches light separately
 * from the flat — both of which need real thickness taper.
 */

/** Lens-shaped blade cross-section: thick at the spine, keen at the edge. */
function bladeProfile(segments = 12): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    // y is blade width (spine at +1, edge at -1), x is thickness.
    const y = Math.cos(a);
    const taper = Math.pow(Math.max(0, 1 - Math.abs(y)), 0.55);
    pts.push(new THREE.Vector2(Math.sin(a) * taper, y));
  }
  return pts;
}

export function buildKnife({ pal, rng }: RifleContext): WeaponBuild {
  const asm = new Assembler('knife');

  // --- blade ---------------------------------------------------------------
  // Spine and edge are authored as two separate curves and the loft is driven from
  // their midline and half-distance. Tapering a single centred width instead makes
  // the last third neck down symmetrically and the blade reads as a spike; a drop
  // point is asymmetric — the spine falls, the edge rises to meet it.
  const blade = asm.part('blade');
  const SPINE_Y = 0.0155;
  const EDGE_Y = -0.0155;
  const centreLine: THREE.Vector3[] = [];
  const thickness: number[] = [];
  const halfWidth: number[] = [];
  const bevelLine: THREE.Vector3[] = [];
  const bevelThick: number[] = [];
  const bevelWidth: number[] = [];
  const steps = 13;
  const BEVEL = 0.0026;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const u = Math.max(0, (t - 0.5) / 0.5);
    const spineY = SPINE_Y - Math.pow(u, 2.1) * 0.021;
    const edgeY = EDGE_Y + Math.pow(u, 1.8) * 0.009;
    centreLine.push(new THREE.Vector3(0, (spineY + edgeY) * 0.5, -t * 0.178));
    thickness.push(0.0022 * (1 - t * 0.4));
    halfWidth.push(Math.max(0.0006, (spineY - edgeY) * 0.5));
    // The bevel rides the edge curve. A straight strip would stay level while the
    // edge sweeps up to the tip and end up hanging below the blade like a shim.
    bevelLine.push(new THREE.Vector3(0, edgeY + BEVEL * (0.92 - u * 0.6), -t * 0.178));
    bevelThick.push(0.0019 * (1 - t * 0.4));
    bevelWidth.push(BEVEL * (1 - Math.pow(u, 1.4) * 0.82));
  }
  // A coated blade with a bright ground edge, not bare steel. Fully metallic dark
  // steel has no diffuse term, so against a dim surround the blade returns almost
  // nothing and vanishes; the coating gives it a value to read its form by and
  // confines the bright metal to the bevel, which is where the eye wants it.
  const bladeMesh = new THREE.Mesh(
    loft(bladeProfile(14), framesAlongPath(centreLine, thickness, halfWidth), true, true),
    pal.coating,
  );
  bladeMesh.frustumCulled = false;
  blade.add(bladeMesh);
  // Primary bevel: the one genuinely bright line on the whole weapon.
  const bevelMesh = new THREE.Mesh(
    loft(bladeProfile(10), framesAlongPath(bevelLine, bevelThick, bevelWidth), false, true),
    pal.metalWorn,
  );
  bevelMesh.frustumCulled = false;
  blade.add(bevelMesh);
  // Fuller: a shallow groove down both flats, following the midline.
  for (const s of [-1, 1]) {
    blade.add(mesh(boxGeo(0.0007, 0.0055, 0.082, 0.0002), pal.bore, [s * 0.0015, 0.0016, -0.055]));
  }
  // Sawback: teeth set into the spine rather than perched on it, so the set reads
  // as a saw cut into the steel instead of a row of studs.
  for (let i = 0; i < 11; i++) {
    blade.add(
      mesh(
        boxGeo(0.0024, 0.0038, 0.0038, 0.0003),
        pal.metalWorn,
        [0, SPINE_Y - 0.0019, -0.03 - i * 0.0062],
        [0, 0, Math.PI / 4],
      ),
    );
  }
  // Ricasso: the unsharpened flat between guard and edge, with the maker's flat.
  blade.add(mesh(boxGeo(0.0042, 0.024, 0.015, 0.0008), pal.coating, [0, 0.0012, -0.009]));

  // --- guard and handle ----------------------------------------------------
  const guard = asm.part('triggerGuard');
  guard.add(mesh(roundBoxGeo(0.008, 0.034, 0.011, 0.0025, 2), pal.metalDark, [0, 0.001, 0.008]));
  guard.add(mesh(roundBoxGeo(0.0075, 0.011, 0.02, 0.003, 1), pal.metalDark, [0, -0.014, 0.016]));

  const handle = asm.part('pistolGrip');
  // Finger grooves are cut into the loft as radius dips rather than added as rings
  // around it: rings the size a finger needs read as a stack of beads, and the
  // handle is the part of a knife closest to the camera.
  const handleSpine: THREE.Vector3[] = [];
  const handleR: number[] = [];
  const sections = 21;
  for (let i = 0; i < sections; i++) {
    const t = i / (sections - 1);
    handleSpine.push(new THREE.Vector3(0, 0, 0.016 + t * 0.104));
    const swell = 0.0128 + Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.0022;
    handleR.push(swell - Math.pow(Math.abs(Math.sin(Math.PI * (t * 4.1 - 0.12))), 2.4) * 0.0013);
  }
  const handleMesh = new THREE.Mesh(
    loft(ovalProfile(14, 0.8, 1), framesAlongPath(handleSpine, handleR), true, true),
    pal.rubber,
  );
  handleMesh.frustumCulled = false;
  handle.add(handleMesh);
  // Moulded checkering on the side panels.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      handle.add(
        mesh(boxGeo(0.0016, 0.019, 0.0022, 0.0004), pal.polymerDark, [s * 0.0104, 0.0005, 0.03 + i * 0.0092]),
      );
    }
  }
  handle.add(mesh(roundBoxGeo(0.0195, 0.024, 0.014, 0.004, 2), pal.metalDark, [0, 0, 0.126]));
  handle.add(mesh(cylGeo(0.0034, 0.0052, 0.012, 10), pal.metalWorn, [0, 0, 0.138], [Math.PI, 0, 0]));
  // Lanyard hole through the pommel.
  handle.add(mesh(cylGeoX(0.0022, 0.022, 8), pal.bore, [0, 0.005, 0.128]));

  const spineGeo = new THREE.Mesh(
    loft(circleProfile(8, 1), framesAlongPath([new THREE.Vector3(0, 0, 0.004), new THREE.Vector3(0, 0, 0.018)], [0.0055]), true, true),
    pal.metalWorn,
  );
  spineGeo.frustumCulled = false;
  asm.part('receiver').add(spineGeo);

  addSerial(asm.part('markings'), pal, rng, [-0.0022, 0.004, -0.03], 'left');
  addWear(asm.part('blade'), pal, rng, { count: 5, center: [0.0018, 0.002, -0.07], area: [0.0004, 0.006, 0.05] });

  const anchors = {
    muzzle: asm.anchor('muzzle', [0, -0.004, -0.176]),
    sight: asm.anchor('sight', [0, 0.012, -0.02]),
    eject: asm.anchor('eject', [0, 0.01, 0.0], [0, 0, 0]),
    magWell: asm.anchor('magWellAnchor', [0, -0.01, 0.06]),
    // Handle runs fore-aft, so the fist is rotated to grip along the blade axis.
    grip: asm.anchor('gripAnchor', [0, 0, 0.07], [-Math.PI / 2, 0, 0]),
    support: asm.anchor('support', [0, 0, 0.07], [-Math.PI / 2, 0, 0]),
  };

  return {
    assembler: asm,
    anchors,
    eyeRelief: 0.2,
    // Held across the body, blade angled inboard, not presented at the eye.
    hipTrim: [0.03, 0.01, -0.12],
    hipTrimRotation: [0.14, 0.42, -0.5],
    travel: { mag: 0 },
    oneHanded: true,
    gripRadius: 0.0146,
  };
}