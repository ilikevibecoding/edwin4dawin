import * as THREE from 'three';
import { Kit, bolt, rbox, tube } from '../lib/geo.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Cabin. Mostly seen through glass, but an empty greenhouse instantly reads as
// a toy, so the seats, dash and cage all need to be there.
// ---------------------------------------------------------------------------

export function buildInterior() {
  const k = new Kit('interior');
  const hw = S.bodyHalfWidth;

  // floor + headliner
  k.add('interiorPlastic', rbox(hw * 2 - 0.2, 0.03, S.cabFrontZ - S.cabRearZ - 0.1, 0.01), {
    pos: [0, S.floorY + 0.02, (S.cabFrontZ + S.cabRearZ) * 0.5],
  });
  k.add('fabric', rbox(hw * 2 - 0.26, 0.02, 1.1, 0.01), {
    pos: [0, S.floorY + 0.045, (S.cabFrontZ + S.cabRearZ) * 0.5 - 0.1],
  });
  k.add('interiorPlastic', rbox(hw * 2 - 0.2, 0.03, S.cabFrontZ - S.cabRearZ - 0.2, 0.01), {
    pos: [0, S.roofY - 0.075, (S.cabFrontZ + S.cabRearZ) * 0.5 - 0.05],
  });

  // dash
  const dashZ = S.windshieldBottomZ - 0.18;
  k.add('interiorPlastic', rbox(hw * 2 - 0.18, 0.3, 0.36, 0.05), { pos: [0, S.beltlineY - 0.06, dashZ] });
  k.add('interiorPlastic', rbox(hw * 2 - 0.2, 0.06, 0.3, 0.03), { pos: [0, S.beltlineY + 0.1, dashZ + 0.04] });
  k.add('trimGloss', rbox(0.42, 0.16, 0.04, 0.015), { pos: [0.0, S.beltlineY - 0.02, dashZ - 0.17] });
  k.add('amber', rbox(0.36, 0.11, 0.01, 0.004), { pos: [0.0, S.beltlineY - 0.02, dashZ - 0.19] });
  // instrument binnacle
  k.add('interiorPlastic', rbox(0.4, 0.2, 0.24, 0.05), { pos: [0.36, S.beltlineY + 0.02, dashZ - 0.06] });
  for (const dx of [-0.09, 0.09]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16), {
      pos: [0.36 + dx, S.beltlineY + 0.03, dashZ - 0.18],
      rot: [Math.PI / 2 + 0.25, 0, 0],
    });
  }
  // vents
  for (const dx of [-0.62, -0.2, 0.62]) {
    k.add('trim', rbox(0.16, 0.07, 0.03, 0.01), { pos: [dx, S.beltlineY + 0.02, dashZ - 0.175] });
  }
  // switch panel
  for (let i = 0; i < 4; i++) {
    k.add('trimGloss', rbox(0.05, 0.035, 0.02, 0.006), { pos: [-0.05 + i * 0.06, S.beltlineY - 0.18, dashZ - 0.16] });
  }

  // steering column + wheel
  const swPos = [0.36, S.beltlineY - 0.06, dashZ - 0.3];
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.045, 0.05, 0.3, 12), {
    pos: [0.36, S.beltlineY - 0.13, dashZ - 0.17],
    rot: [1.1, 0, 0],
  });
  k.add('trimGloss', new THREE.TorusGeometry(0.16, 0.019, 8, 26), { pos: swPos, rot: [1.15, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    k.add('interiorPlastic', rbox(0.035, 0.02, 0.15, 0.008), {
      pos: [swPos[0] + Math.cos(a) * 0.08, swPos[1] - Math.sin(a) * 0.03, swPos[2] + Math.sin(a) * 0.07],
      rot: [1.15, 0, -a],
    });
  }
  k.add('trimGloss', new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14), { pos: swPos, rot: [1.15 + Math.PI / 2, 0, 0] });

  // centre console, shifter, transfer case lever, handbrake
  k.add('interiorPlastic', rbox(0.3, 0.24, 0.7, 0.04), { pos: [0, S.floorY + 0.14, dashZ - 0.6] });
  for (const [dx, h] of [
    [0.05, 0.2],
    [-0.06, 0.15],
  ]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.014, 0.018, h, 8), {
      pos: [dx, S.floorY + 0.28 + h * 0.4, dashZ - 0.62],
      rot: [-0.15, 0, 0],
    });
    k.add('trim', new THREE.SphereGeometry(0.032, 12, 8), { pos: [dx, S.floorY + 0.29 + h, dashZ - 0.63] });
  }

  // seats
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    const z = S.cabFrontZ - 0.78;
    k.add('fabric', rbox(0.5, 0.14, 0.5, 0.06), { pos: [x, S.floorY + 0.34, z] });
    k.add('fabric', rbox(0.5, 0.62, 0.16, 0.06), { pos: [x, S.floorY + 0.68, z - 0.24], rot: [-0.16, 0, 0] });
    k.add('fabric', rbox(0.22, 0.16, 0.14, 0.05), { pos: [x, S.floorY + 1.02, z - 0.28] });
    // bolsters
    for (const bx of [-1, 1]) {
      k.add('fabric', rbox(0.09, 0.12, 0.44, 0.04), { pos: [x + bx * 0.21, S.floorY + 0.4, z] });
      k.add('fabric', rbox(0.08, 0.5, 0.13, 0.04), { pos: [x + bx * 0.2, S.floorY + 0.7, z - 0.21], rot: [-0.16, 0, 0] });
    }
    // frame + rails
    k.add('steelDark', rbox(0.42, 0.05, 0.06, 0.012), { pos: [x, S.floorY + 0.24, z] });
    k.add('steelDark', rbox(0.05, 0.12, 0.44, 0.012), { pos: [x, S.floorY + 0.18, z] });
    // belt
    k.add('trim', rbox(0.05, 0.5, 0.012, 0.004), {
      pos: [x + sx * 0.19, S.floorY + 0.66, z - 0.16],
      rot: [0.1, 0, sx * 0.22],
    });
  }
  // rear bench
  k.add('fabric', rbox(1.5, 0.14, 0.4, 0.05), { pos: [0, S.floorY + 0.3, S.cabRearZ + 0.32] });
  k.add('fabric', rbox(1.5, 0.46, 0.14, 0.05), { pos: [0, S.floorY + 0.55, S.cabRearZ + 0.14], rot: [-0.1, 0, 0] });

  // roll cage
  const cageY = S.roofY - 0.12;
  for (const sx of [-1, 1]) {
    k.add('steelDark', tube(
      [
        [sx * (S.bodyHalfWidth - 0.12), S.floorY + 0.06, S.cabRearZ + 0.16],
        [sx * (S.bodyHalfWidth - 0.14), cageY - 0.2, S.cabRearZ + 0.18],
        [sx * (S.bodyHalfWidth - 0.2), cageY, S.cabRearZ + 0.34],
        [sx * (S.bodyHalfWidth - 0.22), cageY, S.windshieldTopZ + 0.2],
      ],
      0.032,
      9,
    ));
  }
  k.add('steelDark', new THREE.CylinderGeometry(0.03, 0.03, S.bodyHalfWidth * 2 - 0.4, 10), {
    pos: [0, cageY, S.cabRearZ + 0.34],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('steelDark', new THREE.CylinderGeometry(0.028, 0.028, S.bodyHalfWidth * 2 - 0.44, 10), {
    pos: [0, cageY, S.windshieldTopZ + 0.22],
    rot: [0, 0, Math.PI / 2],
  });
  // grab handle + padding
  for (const sx of [-1, 1]) {
    k.add('trim', new THREE.CylinderGeometry(0.042, 0.042, 0.3, 10), {
      pos: [sx * (S.bodyHalfWidth - 0.21), cageY, S.windshieldTopZ + 0.4],
      rot: [Math.PI / 2, 0, 0],
    });
  }

  // door cards
  for (const sx of [-1, 1]) {
    k.add('interiorPlastic', rbox(0.04, 0.5, 1.1, 0.02), {
      pos: [sx * (S.bodyHalfWidth - 0.08), S.beltlineY - 0.24, S.cabFrontZ - 0.62],
    });
    k.add('fabric', rbox(0.03, 0.2, 0.6, 0.02), {
      pos: [sx * (S.bodyHalfWidth - 0.11), S.beltlineY - 0.26, S.cabFrontZ - 0.62],
    });
    k.add('trimGloss', rbox(0.06, 0.05, 0.18, 0.015), {
      pos: [sx * (S.bodyHalfWidth - 0.1), S.beltlineY - 0.06, S.cabFrontZ - 0.36],
    });
  }

  // rear-view mirror + a dangling detail
  k.add('trim', rbox(0.24, 0.07, 0.04, 0.015), { pos: [0, S.roofY - 0.16, S.windshieldTopZ + 0.16] });
  k.add('trim', new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), {
    pos: [0, S.roofY - 0.11, S.windshieldTopZ + 0.14],
  });

  return k;
}
