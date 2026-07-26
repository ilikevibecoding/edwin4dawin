import * as THREE from 'three';
import { Kit, bend, bolt, rbox, rivet, tube } from '../lib/geo.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Bolt-on overland gear. This is where the "somebody owns this truck and
// drives it hard" reading comes from: rack, light bar, winch, recovery kit.
// ---------------------------------------------------------------------------

export function buildDetails() {
  const k = new Kit('gear');
  roofRack(k);
  lightBar(k);
  winch(k);
  snorkel(k);
  bedGear(k);
  mudFlaps(k);
  return k;
}

function roofRack(k) {
  const hw = S.bodyHalfWidth;
  const y = S.roofY + 0.09;
  const zFront = S.cabFrontZ - 0.06;
  const zRear = S.bedRearZ + 0.35;
  const railX = hw - 0.12;

  // side rails run from the cab back over the bed
  for (const side of [-1, 1]) {
    k.add('steelDark', tube(
      [
        [side * railX, y + 0.03, zFront + 0.12],
        [side * railX, y + 0.08, zFront - 0.05],
        [side * railX, y + 0.08, zRear + 0.1],
        [side * railX, y + 0.03, zRear],
      ],
      0.026,
      9,
    ));
  }
  // crossbars
  const bars = 6;
  for (let i = 0; i < bars; i++) {
    const z = zFront - 0.02 - (i / (bars - 1)) * (zFront - zRear - 0.1);
    k.add('steelDark', new THREE.CylinderGeometry(0.022, 0.022, railX * 2, 10), {
      pos: [0, y + 0.08, z],
      rot: [0, 0, Math.PI / 2],
    });
  }
  // mesh deck over the cab section
  k.add('mesh', new THREE.PlaneGeometry(railX * 2 - 0.05, 1.1), {
    pos: [0, y + 0.095, zFront - 0.6],
    rot: [-Math.PI / 2, 0, 0],
  });
  // legs down to the rain gutters
  for (const side of [-1, 1]) {
    for (const z of [zFront - 0.05, S.cabRearZ + 0.15, zRear + 0.2]) {
      k.add('steelDark', rbox(0.05, 0.13, 0.05, 0.012), { pos: [side * railX, S.roofY + 0.04, z] });
      k.add('alu', rbox(0.09, 0.02, 0.09, 0.006), { pos: [side * railX, S.roofY + 0.11, z] });
      for (const dx of [-0.03, 0.03]) {
        k.add('steel', rivet(0.009, 0.006), { pos: [side * railX + dx, S.roofY + 0.125, z] });
      }
    }
  }
  // rooftop gear: flat box + rolled awning
  k.add('trim', rbox(0.9, 0.16, 0.62, 0.04), { pos: [0.16, y + 0.19, zFront - 0.55] });
  k.add('trimGloss', rbox(0.92, 0.02, 0.06, 0.008), { pos: [0.16, y + 0.28, zFront - 0.55] });
  for (const dz of [-0.2, 0.2]) {
    k.add('paintAccent', rbox(0.94, 0.035, 0.05, 0.012), { pos: [0.16, y + 0.2, zFront - 0.55 + dz] });
  }
  k.add('canvasTop', new THREE.CylinderGeometry(0.09, 0.09, 1.4, 14), {
    pos: [-0.42, y + 0.18, zFront - 0.9],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('trim', new THREE.CylinderGeometry(0.095, 0.095, 0.08, 12), {
    pos: [-0.42, y + 0.18, zFront - 1.6],
    rot: [Math.PI / 2, 0, 0],
  });
}

function lightBar(k) {
  const y = S.roofY + 0.2;
  const z = S.cabFrontZ + 0.02;
  const len = 1.32;
  // housing
  k.add('trim', rbox(len, 0.1, 0.1, 0.022), { pos: [0, y, z] });
  k.add('alu', rbox(len + 0.02, 0.03, 0.11, 0.01), { pos: [0, y - 0.06, z] });
  // individual optics
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (len / n);
    k.add('reflector', new THREE.CylinderGeometry(0.032, 0.026, 0.05, 14), {
      pos: [x, y, z + 0.045],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('headlight', new THREE.CylinderGeometry(0.024, 0.024, 0.01, 12), {
      pos: [x, y, z + 0.072],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  k.add('lensClear', rbox(len - 0.02, 0.075, 0.012, 0.006), { pos: [0, y, z + 0.078] });
  // mounts
  for (const side of [-1, 1]) {
    k.add('steelDark', rbox(0.04, 0.14, 0.05, 0.01), { pos: [side * (len * 0.42), y - 0.1, z + 0.01] });
    k.add('steel', bolt(0.013, 0.01), { pos: [side * (len * 0.42), y - 0.02, z + 0.04], rot: [Math.PI / 2, 0, 0] });
  }
  // wiring loom down the A pillar
  k.add('trim', tube(
    [
      [0.5, y - 0.05, z],
      [0.66, S.roofY - 0.02, z - 0.05],
      [0.78, S.beltlineY + 0.4, S.windshieldBottomZ - 0.1],
    ],
    0.011,
  ));
}

function winch(k) {
  const z = S.noseZ - 0.02;
  const y = 0.94;
  k.add('trim', new THREE.CylinderGeometry(0.085, 0.085, 0.46, 16), {
    pos: [0, y, z],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('steel', new THREE.CylinderGeometry(0.055, 0.055, 0.3, 14), {
    pos: [0, y, z],
    rot: [0, 0, Math.PI / 2],
  });
  for (const sx of [-1, 1]) {
    k.add('steelDark', new THREE.CylinderGeometry(0.07, 0.07, 0.09, 14), {
      pos: [sx * 0.28, y, z],
      rot: [0, 0, Math.PI / 2],
    });
    k.add('alu', rbox(0.06, 0.14, 0.16, 0.02), { pos: [sx * 0.36, y, z] });
  }
  // fairlead + hook
  k.add('alu', rbox(0.3, 0.1, 0.04, 0.012), { pos: [0, y - 0.06, z + 0.13] });
  k.add('steelDark', rbox(0.24, 0.05, 0.03, 0.008), { pos: [0, y - 0.06, z + 0.15] });
  k.add('steel', tube(
    [
      [0.0, y - 0.06, z + 0.16],
      [0.18, y - 0.12, z + 0.14],
      [0.3, y - 0.2, z + 0.05],
    ],
    0.007,
  ));
  k.add('paintAccent', bend(0.035, 0.012, Math.PI * 1.4), { pos: [0.32, y - 0.26, z + 0.02], rot: [0, 0.3, 0.6] });
}

function snorkel(k) {
  const hw = S.bodyHalfWidth;
  const x = hw - 0.02;
  const pts = [
    [x, S.hoodY - 0.16, S.hoodRearZ + 0.06],
    [x + 0.04, S.hoodY + 0.16, S.hoodRearZ - 0.02],
    [x + 0.02, S.beltlineY + 0.42, S.windshieldBottomZ - 0.1],
    [x - 0.02, S.roofY - 0.04, S.windshieldTopZ + 0.14],
  ];
  k.add('trim', tube(pts, 0.055, 12, 0.5));
  // ram head
  k.add('trim', rbox(0.11, 0.13, 0.24, 0.035), { pos: [x - 0.02, S.roofY + 0.03, S.windshieldTopZ + 0.2] });
  k.add('mesh', new THREE.PlaneGeometry(0.1, 0.11), {
    pos: [x - 0.02, S.roofY + 0.03, S.windshieldTopZ + 0.322],
  });
  // clamps
  for (const t of [0.3, 0.62]) {
    const p = [
      x + 0.03 * (1 - t),
      S.hoodY - 0.16 + t * (S.roofY - S.hoodY + 0.1),
      S.hoodRearZ + 0.06 - t * 0.24,
    ];
    k.add('alu', new THREE.TorusGeometry(0.062, 0.008, 6, 14), { pos: p, rot: [0.2, Math.PI / 2, 0] });
  }
}

function bedGear(k) {
  const hw = S.bodyHalfWidth;
  const bedZ = (S.bedFrontZ + S.bedRearZ) * 0.5;

  // spare tyre laid flat at the front of the bed
  k.add('rubber', new THREE.TorusGeometry(0.33, 0.115, 12, 28), {
    pos: [0.34, S.bedFloorY + 0.14, S.bedFrontZ - 0.42],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('alu', new THREE.CylinderGeometry(0.23, 0.23, 0.14, 24), {
    pos: [0.34, S.bedFloorY + 0.14, S.bedFrontZ - 0.42],
  });
  k.add('trimGloss', new THREE.CylinderGeometry(0.07, 0.07, 0.16, 14), {
    pos: [0.34, S.bedFloorY + 0.15, S.bedFrontZ - 0.42],
  });

  // jerry cans
  for (let i = 0; i < 2; i++) {
    const x = -0.42 - i * 0.22;
    k.add('paintAccent', rbox(0.17, 0.44, 0.32, 0.035), { pos: [x, S.bedFloorY + 0.24, S.bedFrontZ - 0.36] });
    k.add('trimGloss', rbox(0.05, 0.06, 0.06, 0.015), { pos: [x, S.bedFloorY + 0.47, S.bedFrontZ - 0.36] });
    k.add('steelDark', rbox(0.18, 0.02, 0.06, 0.006), { pos: [x, S.bedFloorY + 0.44, S.bedFrontZ - 0.36] });
    for (const dz of [-0.1, 0.1]) {
      k.add('paintAccent', rbox(0.175, 0.3, 0.03, 0.01), { pos: [x, S.bedFloorY + 0.24, S.bedFrontZ - 0.36 + dz] });
    }
  }

  // toolbox across the bed
  k.add('plate', rbox(hw * 2 - 0.22, 0.26, 0.4, 0.03), { pos: [0, S.bedFloorY + 0.15, bedZ + 0.18] });
  k.add('alu', rbox(hw * 2 - 0.2, 0.03, 0.42, 0.012), { pos: [0, S.bedFloorY + 0.29, bedZ + 0.18] });
  for (const sx of [-1, 1]) {
    k.add('steelDark', rbox(0.09, 0.05, 0.04, 0.01), { pos: [sx * 0.4, S.bedFloorY + 0.24, bedZ - 0.02] });
  }

  // traction boards strapped to the bed side
  for (let i = 0; i < 2; i++) {
    k.add('paintAccent', rbox(0.035, 0.26, 1.05, 0.02), {
      pos: [hw - 0.09 - i * 0.045, S.bedTopY - 0.02, bedZ - 0.3],
      rot: [0, 0, 0.02],
    });
  }
  for (const dz of [-0.65, 0.05]) {
    k.add('trim', rbox(0.12, 0.05, 0.04, 0.008), { pos: [hw - 0.1, S.bedTopY - 0.02, bedZ + dz] });
  }

  // rolled recovery strap + a coil of rope
  k.add('canvasTop', new THREE.TorusGeometry(0.11, 0.045, 8, 18), {
    pos: [-0.5, S.bedFloorY + 0.09, bedZ - 0.5],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('trim', new THREE.TorusGeometry(0.13, 0.028, 7, 20), {
    pos: [-0.15, S.bedFloorY + 0.07, bedZ - 0.62],
    rot: [Math.PI / 2, 0.2, 0],
  });

  // tie-down cleats
  for (const sx of [-1, 1]) {
    for (const dz of [-0.55, 0.05, 0.6]) {
      k.add('steel', bend(0.028, 0.009, Math.PI), {
        pos: [sx * (hw - 0.11), S.bedFloorY + 0.05, bedZ + dz],
        rot: [0, Math.PI / 2, 0],
      });
    }
  }
}

function mudFlaps(k) {
  const hw = S.bodyHalfWidth;
  for (const [z, sign] of [
    [S.frontAxleZ - 0.68, -1],
    [S.rearAxleZ - 0.68, -1],
  ]) {
    for (const sx of [-1, 1]) {
      k.add('trim', rbox(0.3, 0.34, 0.02, 0.01), { pos: [sx * (hw - 0.02), 0.34, z], rot: [0.1 * sign, 0, 0] });
      k.add('paintAccent', rbox(0.16, 0.05, 0.024, 0.008), { pos: [sx * (hw - 0.02), 0.4, z + 0.004] });
      for (const dx of [-0.1, 0.1]) {
        k.add('steel', rivet(0.01, 0.006), { pos: [sx * (hw - 0.02) + dx, 0.47, z + 0.014], rot: [Math.PI / 2, 0, 0] });
      }
    }
  }
}
