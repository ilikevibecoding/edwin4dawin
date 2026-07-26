import * as THREE from 'three';
import { Kit, bolt, boxUV, profile, rbox, rivet, tube } from '../lib/geo.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// The hull: frame, floor, front clip, cab, bed. Boxy 4x4 pickup in the Jeep
// Gladiator / Bronco neighbourhood.
//
// Everything is chamfered and every large panel is broken up by a swage line,
// a vent, a seam or a row of fasteners.
// ---------------------------------------------------------------------------

export function buildBody() {
  const k = new Kit('body');

  frame(k);
  floorAndRockers(k);
  frontClip(k);
  grille(k);
  cab(k);
  bed(k);

  return k;
}

// --- ladder frame -----------------------------------------------------------
function frame(k) {
  const railL = S.noseZ - 0.15 - (S.tailZ + 0.12);
  const railZ = (S.noseZ - 0.15 + S.tailZ + 0.12) * 0.5;
  const rail = rbox(0.12, 0.17, railL, 0.02);
  k.addMirrored('steelDark', rail, { pos: [S.frameHalfWidth, S.frameY - 0.09, railZ] });

  // crossmembers
  for (const z of [2.1, 1.5, 0.6, -0.5, -1.5, -2.25]) {
    k.add('steelDark', rbox(S.frameHalfWidth * 2 - 0.05, 0.1, 0.09, 0.015), {
      pos: [0, S.frameY - 0.09, z],
    });
  }
  // frame lightening holes + gussets
  for (let i = 0; i < 9; i++) {
    const z = -2.1 + i * 0.53;
    k.addMirrored('steelDark', new THREE.CylinderGeometry(0.035, 0.035, 0.125, 10), {
      pos: [S.frameHalfWidth, S.frameY - 0.09, z],
      rot: [0, 0, Math.PI / 2],
    });
  }
  // fuel tank + transfer case lumps so the underside is not empty
  k.add('trim', rbox(0.62, 0.28, 0.5, 0.06), { pos: [0.18, S.frameY - 0.18, -0.95] });
  k.add('steelDark', rbox(0.34, 0.3, 0.55, 0.05), { pos: [-0.05, S.frameY - 0.1, 0.2] });
  k.add('alu', rbox(0.28, 0.26, 0.42, 0.04), { pos: [0.0, S.frameY - 0.05, 0.95] });
  // driveshaft
  k.add('steel', new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10), {
    pos: [0, S.frameY - 0.2, -0.3],
    rot: [Math.PI / 2, 0, 0],
  });
  // exhaust run
  k.add('steelDark', tube(
    [
      [0.12, 0.44, 1.0],
      [0.3, 0.4, 0.2],
      [0.34, 0.38, -0.9],
      [0.4, 0.42, -1.8],
      [0.55, 0.46, -2.35],
    ],
    0.038,
  ));
  k.add('steel', new THREE.CylinderGeometry(0.055, 0.05, 0.16, 12), {
    pos: [0.62, 0.47, -2.44],
    rot: [Math.PI / 2, 0, 0.1],
  });
}

// --- floor pan, rockers, sliders -------------------------------------------
function floorAndRockers(k) {
  const floorZ = (S.cabFrontZ + S.bedRearZ) * 0.5;
  const floorL = S.cabFrontZ - S.bedRearZ;
  k.add('steelDark', rbox(S.bodyHalfWidth * 2 - 0.06, 0.06, floorL, 0.02), {
    pos: [0, S.floorY - 0.03, floorZ],
  });

  // rocker panel with a swage line
  const rockerL = S.cabFrontZ - S.cabRearZ + 0.5;
  const rockerZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  k.addMirrored('paint', rbox(0.1, 0.3, rockerL, 0.03), {
    pos: [S.bodyHalfWidth - 0.03, S.floorY - 0.06, rockerZ],
  });
  k.addMirrored('trim', rbox(0.055, 0.13, rockerL - 0.1, 0.02), {
    pos: [S.bodyHalfWidth + 0.02, S.floorY - 0.14, rockerZ],
  });

  // rock sliders
  const sliderL = 1.85;
  k.addMirrored('plate', rbox(0.11, 0.075, sliderL, 0.025), {
    pos: [S.bodyHalfWidth + 0.045, S.floorY - 0.3, rockerZ],
  });
  for (const z of [-0.7, 0.05, 0.8]) {
    k.addMirrored('steelDark', rbox(0.26, 0.06, 0.075, 0.015), {
      pos: [S.bodyHalfWidth - 0.09, S.floorY - 0.3, z],
    });
  }
  k.addMirrored('steelDark', tube(
    [
      [S.bodyHalfWidth + 0.045, S.floorY - 0.31, rockerZ - sliderL * 0.5],
      [S.bodyHalfWidth + 0.02, S.floorY - 0.22, rockerZ - sliderL * 0.5 - 0.16],
    ],
    0.035,
  ), {});
  k.addMirrored('steelDark', tube(
    [
      [S.bodyHalfWidth + 0.045, S.floorY - 0.31, rockerZ + sliderL * 0.5],
      [S.bodyHalfWidth + 0.02, S.floorY - 0.22, rockerZ + sliderL * 0.5 + 0.16],
    ],
    0.035,
  ), {});
}

// --- hood, fenders, front bumper -------------------------------------------
function frontClip(k) {
  const hw = S.bodyHalfWidth;
  const hoodL = S.hoodFrontZ - S.hoodRearZ;
  const hoodZ = (S.hoodFrontZ + S.hoodRearZ) * 0.5;

  // hood: slight forward rake, power bulge, vents
  k.add('paint', rbox(hw * 2 - 0.14, 0.075, hoodL, 0.035), {
    pos: [0, S.hoodY, hoodZ],
    rot: [-0.022, 0, 0],
  });
  k.add('paint', rbox(0.72, 0.055, hoodL - 0.34, 0.04), {
    pos: [0, S.hoodY + 0.05, hoodZ - 0.02],
    rot: [-0.022, 0, 0],
  });
  // shut line around the bulge
  k.add('trimGloss', rbox(0.79, 0.05, hoodL - 0.3, 0.012), {
    pos: [0, S.hoodY + 0.035, hoodZ - 0.02],
    rot: [-0.022, 0, 0],
  });
  // hood vents
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      k.add('trim', rbox(0.2, 0.03, 0.055, 0.01), {
        pos: [side * 0.5, S.hoodY + 0.035, hoodZ + 0.22 - i * 0.11],
        rot: [-0.022, 0, 0],
      });
      k.add('steelDark', rbox(0.18, 0.02, 0.035, 0.008), {
        pos: [side * 0.5, S.hoodY + 0.02, hoodZ + 0.22 - i * 0.11],
      });
    }
  }
  // hood latches and hinges
  k.addMirrored('alu', rbox(0.07, 0.03, 0.11, 0.008), { pos: [0.42, S.hoodY + 0.055, S.hoodFrontZ - 0.06] });
  k.addMirrored('steelDark', rbox(0.05, 0.05, 0.14, 0.01), { pos: [0.6, S.hoodY - 0.02, S.hoodRearZ + 0.05] });

  // panel gap between hood and fenders
  k.addMirrored('trimGloss', rbox(0.018, 0.06, hoodL, 0.004), {
    pos: [hw - 0.075, S.hoodY + 0.005, hoodZ],
  });

  // front fenders (top surface + outer skin)
  k.addMirrored('paint', rbox(0.24, 0.09, hoodL + 0.2, 0.04), {
    pos: [hw - 0.12, S.hoodY - 0.02, hoodZ - 0.02],
  });
  k.addMirrored('paint', rbox(0.075, 0.5, hoodL + 0.2, 0.035), {
    pos: [hw - 0.02, S.hoodY - 0.28, hoodZ - 0.02],
  });
  // wheel arch cut-out lip
  wheelArch(k, S.frontAxleZ, 0.63);

  // cowl / wiper area
  k.add('trim', rbox(hw * 2 - 0.16, 0.07, 0.14, 0.02), { pos: [0, S.hoodY - 0.01, S.hoodRearZ - 0.06] });
  for (const side of [-1, 1]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.014, 0.014, 0.5, 8), {
      pos: [side * 0.28, S.hoodY + 0.03, S.hoodRearZ - 0.1],
      rot: [0, 0, Math.PI / 2 + side * 0.25],
    });
    k.add('trim', rbox(0.42, 0.012, 0.02, 0.004), {
      pos: [side * 0.28, S.hoodY + 0.055, S.hoodRearZ - 0.1],
      rot: [0, 0, side * 0.25],
    });
  }

  // front bumper: steel winch bumper with wings
  const bz = S.noseZ + 0.02;
  k.add('steelDark', rbox(1.86, 0.24, 0.2, 0.045), { pos: [0, 0.86, bz] });
  k.addMirrored('steelDark', rbox(0.22, 0.3, 0.26, 0.05), { pos: [0.82, 0.88, bz - 0.06], rot: [0, -0.22, 0] });
  k.add('plate', rbox(1.2, 0.02, 0.3, 0.008), { pos: [0, 0.99, bz - 0.05] });
  // skid plate under the bumper
  k.add('plate', rbox(1.1, 0.03, 0.42, 0.01), { pos: [0, 0.72, bz - 0.16], rot: [0.45, 0, 0] });
  // bumper bolt row
  for (let i = -3; i <= 3; i++) {
    k.add('steel', bolt(0.017, 0.014), { pos: [i * 0.24, 0.995, bz + 0.02], rot: [0, 0, 0] });
  }
  // recovery shackles
  for (const side of [-1, 1]) {
    k.add('paintAccent', new THREE.TorusGeometry(0.055, 0.016, 8, 14, Math.PI * 1.35), {
      pos: [side * 0.42, 0.83, bz + 0.11],
      rot: [Math.PI / 2, 0, 0.4],
    });
    k.add('steel', new THREE.CylinderGeometry(0.014, 0.014, 0.11, 8), {
      pos: [side * 0.42, 0.885, bz + 0.11],
      rot: [0, 0, Math.PI / 2],
    });
  }
  // tow hitch loop / D-ring mounts
  k.add('steelDark', rbox(0.36, 0.14, 0.1, 0.02), { pos: [0, 0.86, bz + 0.06] });
}

/** Rolled arch lip + bolt-on flare over a wheel opening. */
function wheelArch(k, z, radius) {
  const hw = S.bodyHalfWidth;
  // arch lip
  const lip = new THREE.TorusGeometry(radius, 0.028, 7, 22, Math.PI);
  k.addMirrored('paint', lip, { pos: [hw - 0.04, S.axleY + 0.02, z], rot: [0, Math.PI / 2, 0] });
  // flare
  const flare = new THREE.TorusGeometry(radius + 0.02, 0.075, 8, 24, Math.PI * 1.02);
  flare.scale(1, 1, 2.6);
  k.addMirrored('trim', flare, { pos: [hw + 0.02, S.axleY + 0.02, z], rot: [0, Math.PI / 2, -0.01] });
  // flare fasteners
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * (0.05 + (i / 6) * 0.9);
    const px = hw + 0.09;
    const py = S.axleY + 0.02 + Math.sin(a) * (radius + 0.02);
    const pz = z + Math.cos(a) * (radius + 0.02);
    k.addMirrored('steelDark', rivet(0.014, 0.008), { pos: [px, py, pz], rot: [0, 0, -Math.PI / 2] });
  }
  // inner arch liner so there is no hole through the body
  const liner = new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, 0.34, 18, 1, true, 0, Math.PI);
  k.addMirrored('trim', liner, { pos: [hw - 0.19, S.axleY + 0.02, z], rot: [0, 0, Math.PI / 2] });
}

// --- grille and lights ------------------------------------------------------
function grille(k) {
  const gz = S.hoodFrontZ + 0.09;
  const top = S.grilleTopY;
  const bot = S.grilleBottomY;
  const h = top - bot;
  const cy = (top + bot) * 0.5;

  // surround
  k.add('paint', rbox(1.56, h + 0.06, 0.1, 0.025), { pos: [0, cy, gz - 0.03] });
  k.add('trimGloss', rbox(1.44, h - 0.02, 0.04, 0.012), { pos: [0, cy, gz + 0.015] });

  // seven slots
  const slots = 7;
  for (let i = 0; i < slots; i++) {
    const x = (i - (slots - 1) / 2) * 0.185;
    k.add('trim', rbox(0.13, h - 0.09, 0.1, 0.02), { pos: [x, cy, gz - 0.035] });
    k.add('mesh', new THREE.PlaneGeometry(0.125, h - 0.1), { pos: [x, cy, gz - 0.055] });
    k.add('chrome', rbox(0.145, 0.014, 0.028, 0.005), { pos: [x, cy + (h - 0.09) * 0.5, gz + 0.005] });
    k.add('chrome', rbox(0.145, 0.014, 0.028, 0.005), { pos: [x, cy - (h - 0.09) * 0.5, gz + 0.005] });
  }

  // round headlights
  for (const side of [-1, 1]) {
    const hx = side * 0.72;
    k.add('trim', new THREE.CylinderGeometry(0.155, 0.155, 0.12, 24), {
      pos: [hx, cy, gz - 0.02],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('reflector', new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), {
      pos: [hx, cy, gz - 0.03],
      rot: [Math.PI / 2, 0, 0],
      scale: [1, 0.7, 1],
    });
    k.add('headlight', new THREE.CylinderGeometry(0.105, 0.105, 0.012, 20), {
      pos: [hx, cy, gz + 0.028],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('lensClear', new THREE.SphereGeometry(0.142, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), {
      pos: [hx, cy, gz + 0.015],
      rot: [Math.PI / 2, 0, 0],
      scale: [1, 0.32, 1],
    });
    k.add('chrome', new THREE.TorusGeometry(0.146, 0.012, 8, 24), {
      pos: [hx, cy, gz + 0.028],
    });
    // turn signal in the grille surround
    k.add('amber', new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), {
      pos: [side * 0.78, cy + 0.24, gz + 0.005],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('trim', new THREE.TorusGeometry(0.04, 0.008, 6, 12), { pos: [side * 0.78, cy + 0.24, gz + 0.01] });
  }

  // badge bar and washer nozzles
  k.add('paintAccent', rbox(0.3, 0.035, 0.02, 0.008), { pos: [-0.02, bot - 0.02, gz + 0.02] });
}

// --- cab --------------------------------------------------------------------
function cab(k) {
  const hw = S.bodyHalfWidth;
  const cabL = S.cabFrontZ - S.cabRearZ;
  const cabZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  const beltY = S.beltlineY;

  // lower body sides (door skins)
  k.addMirrored('paint', rbox(0.08, beltY - S.floorY + 0.16, cabL, 0.035), {
    pos: [hw - 0.02, (beltY + S.floorY) * 0.5 - 0.06, cabZ],
  });
  // swage line down the doors
  k.addMirrored('paint', rbox(0.035, 0.07, cabL - 0.12, 0.02), {
    pos: [hw + 0.015, beltY - 0.34, cabZ],
  });
  // door shut lines
  for (const z of [S.cabFrontZ - 0.02, S.cabRearZ + 0.02]) {
    k.addMirrored('trimGloss', rbox(0.075, beltY - S.floorY + 0.14, 0.02, 0.005), {
      pos: [hw - 0.018, (beltY + S.floorY) * 0.5 - 0.06, z],
    });
  }
  // beltline moulding
  k.addMirrored('trim', rbox(0.09, 0.045, cabL, 0.015), { pos: [hw - 0.015, beltY + 0.02, cabZ] });

  // door handles + hinges + mirror bases
  for (const side of [-1, 1]) {
    k.add('trimGloss', rbox(0.05, 0.05, 0.19, 0.018), { pos: [side * (hw + 0.015), beltY - 0.12, cabZ - 0.25] });
    k.add('chrome', rbox(0.03, 0.028, 0.13, 0.01), { pos: [side * (hw + 0.045), beltY - 0.12, cabZ - 0.26] });
    for (const hz of [S.cabFrontZ - 0.06, S.cabRearZ + 0.06]) {
      k.add('steelDark', rbox(0.055, 0.06, 0.055, 0.012), { pos: [side * (hw + 0.01), beltY - 0.05, hz] });
      k.add('steelDark', rbox(0.055, 0.06, 0.055, 0.012), { pos: [side * (hw + 0.01), S.floorY + 0.16, hz] });
    }
  }

  // A pillars (raked)
  const wsBottom = S.windshieldBottomZ;
  const wsTop = S.windshieldTopZ;
  for (const side of [-1, 1]) {
    k.add('paint', tube(
      [
        [side * (hw - 0.04), beltY, wsBottom + 0.02],
        [side * (hw - 0.07), (beltY + S.roofY) * 0.5, (wsBottom + wsTop) * 0.5],
        [side * (hw - 0.1), S.roofY - 0.02, wsTop],
      ],
      0.05,
      10,
    ));
  }
  // windshield header + cowl bar
  k.add('paint', rbox(hw * 2 - 0.16, 0.09, 0.11, 0.03), { pos: [0, S.roofY - 0.04, wsTop + 0.02] });
  k.add('trim', rbox(hw * 2 - 0.2, 0.05, 0.05, 0.015), { pos: [0, S.roofY - 0.09, wsTop + 0.05] });

  // windshield glass
  const wsAngle = Math.atan2(S.roofY - beltY, wsBottom - wsTop);
  const wsLen = Math.hypot(S.roofY - beltY, wsBottom - wsTop);
  k.add('glass', new THREE.PlaneGeometry(hw * 2 - 0.19, wsLen), {
    pos: [0, (S.roofY + beltY) * 0.5 - 0.01, (wsBottom + wsTop) * 0.5],
    rot: [wsAngle - Math.PI / 2, 0, 0],
  });

  // B pillars + rear cab wall
  for (const side of [-1, 1]) {
    k.add('paint', rbox(0.085, S.roofY - beltY, 0.09, 0.025), {
      pos: [side * (hw - 0.03), (S.roofY + beltY) * 0.5, S.cabRearZ + 0.05],
    });
  }
  k.add('paint', rbox(hw * 2 - 0.06, S.roofY - beltY - 0.02, 0.08, 0.03), {
    pos: [0, (S.roofY + beltY) * 0.5, S.cabRearZ + 0.02],
  });
  k.add('glassDark', new THREE.PlaneGeometry(1.24, 0.46), {
    pos: [0, beltY + 0.34, S.cabRearZ + 0.065],
  });
  k.add('trim', rbox(1.34, 0.55, 0.02, 0.01), { pos: [0, beltY + 0.34, S.cabRearZ + 0.045] });

  // side glass + frames
  for (const side of [-1, 1]) {
    k.add('glass', new THREE.PlaneGeometry(cabL - 0.22, S.roofY - beltY - 0.14), {
      pos: [side * (hw - 0.035), beltY + (S.roofY - beltY) * 0.5 - 0.05, cabZ - 0.02],
      rot: [0, side * Math.PI * 0.5, 0],
    });
    k.add('trim', rbox(0.02, 0.045, cabL - 0.2, 0.008), {
      pos: [side * (hw - 0.02), S.roofY - 0.1, cabZ - 0.02],
    });
    // door mirror
    k.add('steelDark', rbox(0.05, 0.05, 0.1, 0.012), { pos: [side * (hw + 0.02), beltY + 0.1, S.cabFrontZ - 0.12] });
    k.add('trimGloss', tube(
      [
        [side * (hw + 0.03), beltY + 0.12, S.cabFrontZ - 0.12],
        [side * (hw + 0.16), beltY + 0.2, S.cabFrontZ - 0.1],
      ],
      0.022,
    ));
    k.add('trim', rbox(0.06, 0.19, 0.13, 0.03), { pos: [side * (hw + 0.2), beltY + 0.23, S.cabFrontZ - 0.1] });
    k.add('chrome', new THREE.PlaneGeometry(0.16, 0.11), {
      pos: [side * (hw + 0.235), beltY + 0.23, S.cabFrontZ - 0.1],
      rot: [0, side * Math.PI * 0.5, 0],
    });
  }

  // roof with a slight crown and rain gutters
  k.add('paintRoof', rbox(hw * 2 - 0.08, 0.07, cabL + 0.06, 0.05), {
    pos: [0, S.roofY, cabZ - 0.02],
  });
  k.add('paintRoof', rbox(hw * 2 - 0.34, 0.05, cabL - 0.16, 0.045), {
    pos: [0, S.roofY + 0.03, cabZ - 0.02],
  });
  k.addMirrored('trim', rbox(0.04, 0.05, cabL, 0.012), { pos: [hw - 0.06, S.roofY + 0.015, cabZ - 0.02] });
  // roof ribs
  for (const z of [-0.5, -0.05, 0.4]) {
    k.add('paintRoof', rbox(hw * 2 - 0.4, 0.022, 0.05, 0.01), { pos: [0, S.roofY + 0.055, cabZ + z] });
  }
}

// --- bed --------------------------------------------------------------------
function bed(k) {
  const hw = S.bodyHalfWidth;
  const bedL = S.bedFrontZ - S.bedRearZ;
  const bedZ = (S.bedFrontZ + S.bedRearZ) * 0.5;

  // bed floor with ribs
  k.add('plate', rbox(hw * 2 - 0.16, 0.04, bedL - 0.04, 0.012), { pos: [0, S.bedFloorY, bedZ] });
  for (let i = 0; i < 7; i++) {
    k.add('steelDark', rbox(0.055, 0.03, bedL - 0.08, 0.008), {
      pos: [-0.72 + i * 0.24, S.bedFloorY + 0.025, bedZ],
    });
  }

  // bed sides
  const sideH = S.bedTopY - S.bedFloorY + 0.2;
  k.addMirrored('paint', rbox(0.08, sideH, bedL, 0.03), {
    pos: [hw - 0.02, S.bedFloorY + sideH * 0.5 - 0.12, bedZ],
  });
  k.addMirrored('paint', rbox(0.03, 0.06, bedL - 0.1, 0.015), {
    pos: [hw + 0.02, S.bedFloorY + 0.16, bedZ],
  });
  // bed rail caps + stake pockets
  k.addMirrored('trim', rbox(0.115, 0.05, bedL, 0.018), { pos: [hw - 0.015, S.bedTopY + 0.09, bedZ] });
  for (const z of [-0.35, 0.3]) {
    k.addMirrored('trimGloss', rbox(0.07, 0.035, 0.16, 0.008), {
      pos: [hw - 0.015, S.bedTopY + 0.115, bedZ + z],
    });
  }
  // front bed wall
  k.add('paint', rbox(hw * 2 - 0.06, sideH, 0.07, 0.025), {
    pos: [0, S.bedFloorY + sideH * 0.5 - 0.12, S.bedFrontZ - 0.02],
  });
  k.add('trim', rbox(hw * 2 - 0.1, 0.05, 0.1, 0.015), { pos: [0, S.bedTopY + 0.09, S.bedFrontZ - 0.02] });

  // tailgate
  k.add('paint', rbox(hw * 2 - 0.08, sideH - 0.04, 0.07, 0.03), {
    pos: [0, S.bedFloorY + sideH * 0.5 - 0.14, S.bedRearZ + 0.02],
  });
  k.add('paint', rbox(hw * 2 - 0.5, 0.16, 0.03, 0.02), {
    pos: [0, S.bedFloorY + 0.22, S.bedRearZ - 0.015],
  });
  k.add('trimGloss', rbox(0.24, 0.06, 0.05, 0.015), { pos: [0.3, S.bedTopY + 0.02, S.bedRearZ - 0.02] });
  k.add('trim', rbox(hw * 2 - 0.1, 0.045, 0.09, 0.015), { pos: [0, S.bedTopY + 0.09, S.bedRearZ + 0.01] });
  // tailgate hinges + cables
  for (const side of [-1, 1]) {
    k.add('steelDark', rbox(0.07, 0.05, 0.05, 0.01), { pos: [side * 0.7, S.bedFloorY + 0.02, S.bedRearZ + 0.02] });
  }

  // rear arches
  wheelArch(k, S.rearAxleZ, 0.63);

  // rear bumper
  const rz = S.tailZ - 0.02;
  k.add('steelDark', rbox(1.8, 0.2, 0.16, 0.04), { pos: [0, 0.82, rz] });
  k.add('plate', rbox(0.5, 0.02, 0.22, 0.008), { pos: [0, 0.92, rz - 0.03] });
  k.add('steelDark', rbox(0.14, 0.14, 0.3, 0.03), { pos: [0, 0.72, rz + 0.08] });
  k.add('steel', new THREE.CylinderGeometry(0.026, 0.026, 0.16, 10), { pos: [0, 0.74, rz - 0.06] });
  k.add('steel', new THREE.SphereGeometry(0.038, 12, 8), { pos: [0, 0.82, rz - 0.06] });
  for (let i = -2; i <= 2; i++) {
    k.add('steel', bolt(0.015, 0.012), { pos: [i * 0.32, 0.9, rz + 0.02] });
  }

  // tail lights
  for (const side of [-1, 1]) {
    const tx = side * 0.74;
    k.add('trim', rbox(0.19, 0.36, 0.09, 0.02), { pos: [tx, S.bedFloorY + 0.32, S.bedRearZ + 0.0] });
    k.add('taillight', rbox(0.15, 0.16, 0.035, 0.012), { pos: [tx, S.bedFloorY + 0.4, S.bedRearZ - 0.045] });
    k.add('amber', rbox(0.15, 0.075, 0.032, 0.01), { pos: [tx, S.bedFloorY + 0.27, S.bedRearZ - 0.045] });
    k.add('trimGloss', rbox(0.2, 0.02, 0.04, 0.006), { pos: [tx, S.bedFloorY + 0.325, S.bedRearZ - 0.045] });
  }
  // licence plate + lamp
  k.add('steelDark', rbox(0.34, 0.18, 0.02, 0.008), { pos: [-0.3, 0.98, rz - 0.05] });
  k.add('trim', rbox(0.06, 0.04, 0.05, 0.01), { pos: [-0.3, 1.1, rz - 0.03] });
}
