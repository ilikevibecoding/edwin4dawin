import { P, type PropProto, boxGeo } from './kit';
import { M, screenMat } from './mats';
import { hash2 } from '../../../core/rng';
import { registerAsset } from '../../registry';
import * as THREE from 'three';

/** Break-room & kitchen assets (Fable 3). */

function reg(id: string, name: string, dims: string): void {
  registerAsset({
    id: `prop.${id}`, name, category: 'breakroom', agent: 'Fable 3',
    files: 'src/assets/models/props/breakroom.ts', where: 'break room',
    dims, materials: 'prop palette', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'silhouette/material ≥4; correct scale vs counter standard 0.92',
  });
}

export function kitchenCounter(len = 2.4): PropProto {
  reg('kitchen.counter', 'Kitchen counter + cabinets + sink', `${len}×0.65×0.92`);
  const p = new P();
  // base cabinets
  p.box(M.plasticBeige, len, 0.82, 0.6, 0, 0.05, 0, { bevel: 0.01 });
  const doors = Math.floor(len / 0.6);
  for (let i = 0; i < doors; i++) {
    const x = -len / 2 + 0.3 + i * 0.6;
    p.box(M.plasticWhite, 0.54, 0.72, 0.02, x, 0.1, 0.3, { bevel: 0.006 });
    p.box(M.alu, 0.02, 0.14, 0.02, x + 0.2, 0.44, 0.315);
  }
  p.box(M.plasticDark, len, 0.05, 0.6, 0, 0, 0);
  // countertop
  p.box(M.laminateDark, len + 0.04, 0.04, 0.64, 0, 0.87, 0.01, { bevel: 0.012 });
  // sink + faucet
  p.box(M.stainless, 0.5, 0.02, 0.4, -len / 4, 0.895, 0, { bevel: 0.006 });
  p.box(M.plasticBlack, 0.42, 0.012, 0.32, -len / 4, 0.9, 0);
  p.cyl(M.stainless, 0.02, 0.24, -len / 4 + 0.14, 0.91, -0.14);
  p.box(M.stainless, 0.02, 0.02, 0.18, -len / 4 + 0.14, 1.13, -0.06);
  // backsplash
  p.box(M.plasticWhite, len, 0.4, 0.02, 0, 0.91, -0.3);
  // upper cabinets
  p.box(M.plasticBeige, len, 0.6, 0.34, 0, 1.5, -0.14, { bevel: 0.01 });
  for (let i = 0; i < doors; i++) {
    const x = -len / 2 + 0.3 + i * 0.6;
    p.box(M.plasticWhite, 0.54, 0.52, 0.02, x, 1.54, 0.035, { bevel: 0.006 });
    p.box(M.alu, 0.02, 0.1, 0.02, x + 0.2, 1.62, 0.05);
  }
  // clutter on counter
  p.cyl(M.plasticWhite, 0.04, 0.1, len / 4, 0.895, 0.1, { seg: 10 });
  p.cyl(M.tealAccent, 0.04, 0.1, len / 4 + 0.12, 0.895, -0.08, { seg: 10 });
  p.box(M.paper, 0.22, 0.24, 0.18, len / 2 - 0.28, 0.895, 0, { bevel: 0.02 }); // paper towels
  p.col('wood', len, 0.92, 0.65, 0, 0, 0);
  p.col('wood', len, 0.62, 0.36, 0, 1.48, -0.14);
  return p.proto('kitchen.counter');
}

export function fridge(): PropProto {
  reg('kitchen.fridge', 'Refrigerator', '0.7×0.7×1.8');
  const p = new P();
  p.box(M.stainless, 0.7, 1.8, 0.68, 0, 0, 0, { bevel: 0.015 });
  p.box(M.steel, 0.66, 0.72, 0.02, 0, 1.02, 0.345, { bevel: 0.008 });
  p.box(M.steel, 0.66, 0.94, 0.02, 0, 0.04, 0.345, { bevel: 0.008 });
  p.box(M.alu, 0.03, 0.5, 0.03, -0.26, 1.1, 0.36);
  p.box(M.alu, 0.03, 0.6, 0.03, -0.26, 0.3, 0.36);
  // magnets + note
  p.box(M.safetyRed, 0.03, 0.03, 0.008, 0.12, 1.4, 0.36);
  p.box(M.paper, 0.12, 0.15, 0.004, 0.1, 1.2, 0.36);
  p.col('metal', 0.7, 1.8, 0.7, 0, 0, 0);
  return p.proto('kitchen.fridge');
}

export function vendingMachine(): PropProto {
  reg('kitchen.vending', 'Vending machine ("Polar Bites")', '0.9×0.8×1.85');
  const p = new P();
  p.box(M.plasticDark, 0.9, 1.85, 0.78, 0, 0, 0, { bevel: 0.015 });
  // glass front + shelves of snacks
  p.geo(M.glassTint, boxGeo(0.58, 1.2, 0.02).clone().translate(-0.1, 1.0, 0.4));
  for (let s = 0; s < 4; s++) {
    p.box(M.plasticBlack, 0.56, 0.02, 0.3, -0.1, 0.52 + s * 0.28, 0.22);
    for (let i = 0; i < 5; i++) {
      const c = [M.safetyRed, M.tealAccent, M.safetyYellow, M.plasticWhite, M.ledAmber][Math.floor(hash2(i, s) * 5)];
      p.box(c, 0.08, 0.14, 0.03, -0.32 + i * 0.11, 0.54 + s * 0.28, 0.3, { bevel: 0.008 });
    }
  }
  // lit header + coin panel
  p.box(M.ledCyan, 0.84, 0.22, 0.02, 0, 1.56, 0.4);
  p.box(M.plasticBlack, 0.16, 0.5, 0.03, 0.34, 0.9, 0.4);
  p.box(M.ledGreen, 0.05, 0.02, 0.01, 0.34, 1.24, 0.42);
  p.box(M.plasticBlack, 0.5, 0.12, 0.04, -0.1, 0.16, 0.4); // pickup flap
  p.col('plastic', 0.9, 1.85, 0.8, 0, 0, 0);
  return p.proto('kitchen.vending');
}

export function coffeeMachine(): PropProto {
  reg('kitchen.coffee', 'Coffee machine + pot', '0.3×0.4×0.42');
  const p = new P();
  p.box(M.plasticBlack, 0.28, 0.4, 0.3, 0, 0, 0, { bevel: 0.012 });
  p.box(M.plasticDark, 0.24, 0.06, 0.26, 0, 0.02, 0.02);
  p.cyl(M.glassTint as unknown as THREE.MeshStandardMaterial, 0.09, 0.16, 0, 0.06, 0.05, { seg: 12 });
  p.box(M.plasticBlack, 0.03, 0.05, 0.06, 0.1, 0.14, 0.08);
  p.box(M.ledAmber, 0.02, 0.015, 0.01, -0.08, 0.3, 0.15);
  return p.proto('kitchen.coffee');
}

export function microwave(): PropProto {
  reg('kitchen.microwave', 'Microwave', '0.5×0.35×0.3');
  const p = new P();
  p.box(M.plasticDark, 0.5, 0.3, 0.35, 0, 0, 0, { bevel: 0.01 });
  p.box(M.plasticBlack, 0.32, 0.22, 0.02, -0.05, 0.04, 0.18);
  p.geo(M.glassTint, boxGeo(0.28, 0.18, 0.008).clone().translate(-0.05, 0.15, 0.19));
  p.box(M.plasticBlack, 0.1, 0.24, 0.02, 0.17, 0.03, 0.18);
  p.box(M.ledGreen, 0.06, 0.02, 0.008, 0.17, 0.22, 0.19);
  return p.proto('kitchen.microwave');
}

export function waterCooler(): PropProto {
  reg('kitchen.watercooler', 'Water cooler', '0.35×0.35×1.3');
  const p = new P();
  p.box(M.plasticWhite, 0.34, 0.95, 0.34, 0, 0, 0, { bevel: 0.015 });
  p.cyl(M.glassTint as unknown as THREE.MeshStandardMaterial, 0.14, 0.36, 0, 0.95, 0, { seg: 14 });
  p.box(M.plasticBlack, 0.26, 0.06, 0.1, 0, 0.72, 0.15);
  p.box(M.tealAccent, 0.03, 0.04, 0.03, -0.06, 0.66, 0.17);
  p.box(M.plasticGray, 0.03, 0.04, 0.03, 0.06, 0.66, 0.17);
  p.col('plastic', 0.35, 1.3, 0.35, 0, 0, 0);
  return p.proto('kitchen.watercooler');
}

export function trashBins(): PropProto {
  reg('kitchen.bins', 'Trash & recycling bins', '0.85×0.4×0.65');
  const p = new P();
  for (const [i, c] of [M.plasticDark, M.tealAccent].entries()) {
    p.box(c, 0.38, 0.6, 0.38, -0.22 + i * 0.44, 0, 0, { bevel: 0.02 });
    p.box(M.plasticBlack, 0.4, 0.04, 0.4, -0.22 + i * 0.44, 0.6, 0, { bevel: 0.012 });
  }
  p.col('plastic', 0.86, 0.66, 0.42, 0, 0, 0);
  return p.proto('kitchen.bins');
}

export function wellnessCot(): PropProto {
  reg('wellness.cot', 'Wellness cot', '2.0×0.9×0.6');
  const p = new P();
  p.box(M.steelDark, 1.95, 0.08, 0.85, 0, 0.32, 0, { bevel: 0.01 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.box(M.steelDark, 0.05, 0.32, 0.05, sx * 0.9, 0, sz * 0.36);
  }
  p.box(M.plasticWhite, 1.9, 0.14, 0.8, 0, 0.4, 0, { bevel: 0.04 });
  p.box(M.sofaBlue, 0.5, 0.1, 0.7, -0.65, 0.54, 0, { bevel: 0.045 }); // pillow
  p.box(M.tealAccent, 1.0, 0.06, 0.82, 0.35, 0.54, 0, { bevel: 0.03 }); // blanket
  p.col('fabric', 2.0, 0.6, 0.9, 0, 0, 0);
  return p.proto('wellness.cot');
}

export function medCabinet(): PropProto {
  reg('wellness.cabinet', 'First-aid cabinet', '1.1×0.5×1.3');
  const p = new P();
  p.box(M.plasticWhite, 1.1, 1.3, 0.5, 0, 0, 0, { bevel: 0.012 });
  p.geo(M.glassTint, boxGeo(0.44, 0.5, 0.02).clone().translate(-0.26, 0.7, 0.25));
  p.geo(M.glassTint, boxGeo(0.44, 0.5, 0.02).clone().translate(0.26, 0.7, 0.25));
  p.box(M.safetyRed, 0.3, 0.3, 0.02, 0, 0.45, 0.251);
  p.box(M.plasticWhite, 0.22, 0.07, 0.019, 0, 0.565, 0.253);
  p.box(M.plasticWhite, 0.07, 0.22, 0.019, 0, 0.49, 0.253);
  p.col('plastic', 1.1, 1.3, 0.5, 0, 0, 0);
  return p.proto('wellness.cabinet');
}
