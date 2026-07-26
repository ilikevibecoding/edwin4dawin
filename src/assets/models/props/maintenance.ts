import { P, type PropProto, boxGeo } from './kit';
import { M, screenMat } from './mats';
import { hash2 } from '../../../core/rng';
import { registerAsset } from '../../registry';
import { kestrelBanner } from '../../textures/signage';
import * as THREE from 'three';

/** Maintenance, loading & garage assets (Fable 3). */

function reg(id: string, name: string, dims: string, where = 'service spaces'): void {
  registerAsset({
    id: `prop.${id}`, name, category: 'maintenance', agent: 'Fable 3',
    files: 'src/assets/models/props/maintenance.ts', where,
    dims, materials: 'galv/steel/plastics', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'industrial read; believable wear-ready forms',
  });
}

export function electricalPanel(): PropProto {
  reg('mech.panel', 'Electrical panel + breakers', '0.7×0.25×1.9', 'mechanical room');
  const p = new P();
  p.box(M.steel, 0.7, 1.2, 0.18, 0, 0.5, 0.05, { bevel: 0.012 });
  p.box(M.steelDark, 0.6, 1.06, 0.02, 0, 0.57, 0.15, { bevel: 0.008 });
  for (let i = 0; i < 8; i++) {
    p.box(M.plasticBlack, 0.05, 0.09, 0.02, -0.18 + (i % 4) * 0.12, 0.8 + Math.floor(i / 4) * 0.35, 0.16);
  }
  p.box(M.safetyYellow, 0.16, 0.06, 0.01, 0, 1.5, 0.15);
  p.box(M.ledRed, 0.02, 0.02, 0.01, 0.22, 1.55, 0.15);
  // conduit up
  p.cyl(M.galv(), 0.025, 1.1, -0.2, 1.7, 0.08);
  p.cyl(M.galv(), 0.025, 1.1, 0.2, 1.7, 0.08);
  p.col('metal', 0.7, 1.9, 0.3, 0, 0, 0.05);
  return p.proto('mech.panel');
}

export function hvacUnit(): PropProto {
  reg('mech.hvac', 'HVAC air handler', '1.6×1.2×1.5', 'mechanical room');
  const p = new P();
  p.box(M.galv(), 1.6, 1.4, 1.1, 0, 0, 0, { bevel: 0.02 });
  p.box(M.steelDark, 0.5, 0.5, 0.04, -0.4, 0.4, 0.56);
  for (let i = 0; i < 6; i++) p.box(M.steel, 0.44, 0.03, 0.02, -0.4, 0.44 + i * 0.07, 0.575);
  p.box(M.plasticBlack, 0.3, 0.4, 0.03, 0.4, 0.45, 0.56);
  p.box(M.ledGreen, 0.03, 0.03, 0.01, 0.3, 0.98, 0.565);
  p.cyl(M.galv(), 0.24, 0.9, -0.3, 1.4, 0, { seg: 14 });
  p.cyl(M.galv(), 0.18, 0.7, 0.4, 1.4, 0.1, { seg: 12 });
  p.col('metal', 1.6, 1.5, 1.15, 0, 0, 0);
  return p.proto('mech.hvac');
}

export function pipeRun(len: number, vertical = false): PropProto {
  reg('mech.pipes', 'Pipe & conduit run', `${len} m`);
  const p = new P();
  const radii = [0.05, 0.032, 0.02];
  for (const [i, r] of radii.entries()) {
    if (vertical) {
      p.cyl(i === 1 ? M.safetyRed : M.galv(), r, len, i * 0.14 - 0.14, 0, 0);
    } else {
      p.cyl(i === 1 ? M.safetyRed : M.galv(), r, len, 0, i * 0.14, 0, { rz: Math.PI / 2 });
    }
  }
  // valve
  if (!vertical) {
    p.cyl(M.safetyRed, 0.06, 0.03, len * 0.2, 0.2, 0, { seg: 10 });
    p.cyl(M.steel, 0.012, 0.09, len * 0.2, 0.12, 0);
  }
  return p.proto('mech.pipes');
}

export function fireExtinguisher(withCabinet = false): PropProto {
  reg('safety.extinguisher', 'Fire extinguisher' + (withCabinet ? ' cabinet' : ''), '0.16×0.5');
  const p = new P();
  if (withCabinet) {
    p.box(M.safetyRed, 0.36, 0.7, 0.2, 0, 0, 0.02, { bevel: 0.012 });
    p.geo(M.glassTint, boxGeo(0.26, 0.5, 0.01).clone().translate(0, 0.35, 0.13));
    p.cyl(M.safetyRed, 0.07, 0.42, 0, 0.1, 0.02, { seg: 10 });
  } else {
    p.cyl(M.safetyRed, 0.075, 0.46, 0, 0.08, 0.06, { seg: 12 });
    p.cyl(M.steelDark, 0.02, 0.09, 0, 0.54, 0.06);
    p.box(M.steelDark, 0.1, 0.03, 0.03, 0.02, 0.56, 0.06);
    p.cyl(M.plasticBlack, 0.012, 0.2, 0.06, 0.3, 0.06, { rx: 0.9 });
  }
  return p.proto('safety.extinguisher');
}

export function crateStack(seed = 0, tall = false): PropProto {
  reg('loading.crates', 'Cardboard box stack', '1.2×1.2×~1.2', 'loading/garage');
  const p = new P();
  const n = tall ? 5 : 3;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 + hash2(i, seed) * 0.3;
    const h = 0.3 + hash2(i, seed + 2) * 0.15;
    const d = 0.45 + hash2(i, seed + 4) * 0.3;
    const x = (hash2(i, seed + 6) - 0.5) * 0.3;
    const z = (hash2(i, seed + 8) - 0.5) * 0.3;
    const mat = hash2(i, seed + 10) > 0.4 ? M.cardboard : M.cardboardDark;
    p.box(mat, w, h, d, x, y, z, { bevel: 0.01, ry: (hash2(i, seed + 12) - 0.5) * 0.3 });
    // tape + label
    p.box(M.paper, 0.12, 0.005, 0.16, x + 0.1, y + h, z, { ry: (hash2(i, seed + 14) - 0.5) * 0.4 });
    y += h;
  }
  p.col('paper', 1.0, y, 1.0, 0, 0, 0);
  return p.proto('loading.crates');
}

export function palletBoxes(): PropProto {
  reg('loading.pallet', 'Pallet with shrink-wrapped boxes', '1.2×1.0×1.1', 'loading');
  const p = new P();
  // pallet
  for (let i = 0; i < 5; i++) p.box(M.cardboardDark, 1.2, 0.02, 0.14, 0, 0.12, -0.4 + i * 0.2);
  for (const x of [-0.5, 0, 0.5]) p.box(M.cardboardDark, 0.14, 0.1, 1.0, x, 0, 0);
  // boxes
  for (let gx = 0; gx < 2; gx++) for (let gz = 0; gz < 2; gz++) for (let gy = 0; gy < 2; gy++) {
    p.box(hash2(gx + gy, gz) > 0.4 ? M.cardboard : M.cardboardDark, 0.5, 0.36, 0.42,
      -0.27 + gx * 0.54, 0.14 + gy * 0.37, -0.22 + gz * 0.45, { bevel: 0.01 });
  }
  p.col('paper', 1.2, 1.1, 1.0, 0, 0, 0);
  return p.proto('loading.pallet');
}

export function handTruck(): PropProto {
  reg('loading.handtruck', 'Hand truck', '0.5×0.5×1.2', 'loading');
  const p = new P();
  p.box(M.steelDark, 0.42, 1.15, 0.04, 0, 0.05, -0.08, { rx: -0.18 });
  p.box(M.steelDark, 0.44, 0.04, 0.3, 0, 0.03, 0.08);
  for (const s of [-1, 1]) {
    p.cyl(M.rubber, 0.1, 0.05, s * 0.24, 0.1, -0.06, { rz: Math.PI / 2, seg: 14 });
  }
  p.col('metal', 0.52, 1.2, 0.45, 0, 0, 0);
  return p.proto('loading.handtruck');
}

export function ladder(): PropProto {
  reg('loading.ladder', 'A-frame ladder (folded, against wall)', '0.45×0.15×2.0');
  const p = new P();
  for (const s of [-1, 1]) {
    p.box(M.safetyYellow, 0.06, 2.0, 0.04, s * 0.2, 0, 0, { rx: -0.1 });
  }
  for (let i = 0; i < 6; i++) {
    p.box(M.alu, 0.36, 0.04, 0.03, 0, 0.2 + i * 0.32, 0.02 + i * 0.032, {});
  }
  p.col('metal', 0.5, 2.0, 0.3, 0, 0, 0);
  return p.proto('loading.ladder');
}

export function warningCone(): PropProto {
  reg('loading.cone', 'Warning cone', '0.3×0.3×0.5');
  const p = new P();
  p.box(M.safetyYellow, 0.3, 0.02, 0.3, 0, 0, 0, { bevel: 0.008 });
  p.cyl(M.safetyYellow, 0.11, 0.48, 0, 0.02, 0, { r1: 0.03, seg: 12 });
  p.cyl(M.plasticWhite, 0.085, 0.09, 0, 0.24, 0, { r1: 0.065, seg: 12 });
  return p.proto('loading.cone');
}

export function barrelGroup(): PropProto {
  reg('garage.barrels', 'Drum group', '1.2×1.2×0.9', 'garage');
  const p = new P();
  const pos: [number, number][] = [[-0.28, -0.2], [0.3, -0.1], [0, 0.32]];
  for (const [i, [x, z]] of pos.entries()) {
    const c = [M.steelDark, M.tealAccent, M.safetyYellow][i];
    p.cyl(c, 0.28, 0.88, x, 0, z, { seg: 16 });
    p.cyl(M.steel, 0.285, 0.03, x, 0.28, z, { seg: 16 });
    p.cyl(M.steel, 0.285, 0.03, x, 0.6, z, { seg: 16 });
  }
  p.col('metal', 1.2, 0.9, 1.2, 0, 0, 0);
  return p.proto('garage.barrels');
}

export function workbench(): PropProto {
  reg('garage.workbench', 'Workbench + tools', '1.6×0.7×0.95', 'garage');
  const p = new P();
  p.box(M.birch(), 1.6, 0.05, 0.7, 0, 0.85, 0, { bevel: 0.012 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.box(M.steelDark, 0.06, 0.85, 0.06, sx * 0.72, 0, sz * 0.28);
  }
  p.box(M.steelDark, 1.5, 0.04, 0.6, 0, 0.3, 0);
  // tool case + parts
  p.box(M.safetyRed, 0.45, 0.18, 0.24, -0.4, 0.9, 0, { bevel: 0.015 });
  p.box(M.plasticBlack, 0.2, 0.05, 0.14, 0.3, 0.9, 0.1, { ry: 0.4 });
  p.cyl(M.steel, 0.03, 0.16, 0.55, 0.9, -0.15, { rz: Math.PI / 2 });
  p.col('wood', 1.6, 0.95, 0.72, 0, 0, 0);
  return p.proto('garage.workbench');
}

export function responseVan(): PropProto {
  registerAsset({
    id: 'prop.garage.van', name: 'Norrsken response van', category: 'maintenance', agent: 'Fable 3',
    files: 'src/assets/models/props/maintenance.ts', where: 'extraction garage',
    dims: '2.1×4.6×2.2', materials: 'painted metal, rubber, glass', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'clearly a service van; anchors the extraction fantasy',
  });
  const p = new P();
  // body
  p.box(M.vanWhite, 2.0, 1.5, 4.5, 0, 0.42, 0, { bevel: 0.07 });
  p.box(M.vanWhite, 1.9, 0.55, 1.4, 0, 0.9, 1.45, { bevel: 0.09 }); // cab slope
  // windshield + windows
  p.geo(M.glassTint, boxGeo(1.7, 0.5, 0.04).clone().rotateX(-0.35).translate(0, 1.35, 1.98));
  p.geo(M.glassTint, boxGeo(0.04, 0.4, 0.9).clone().translate(-1.0, 1.3, 1.4));
  p.geo(M.glassTint, boxGeo(0.04, 0.4, 0.9).clone().translate(1.0, 1.3, 1.4));
  // teal brand stripe + logo dot
  p.box(M.tealAccent, 2.04, 0.18, 4.4, 0, 0.95, -0.1);
  // wheels
  for (const [sx, sz] of [[-1, 1.35], [1, 1.35], [-1, -1.45], [1, -1.45]]) {
    p.cyl(M.rubber, 0.36, 0.24, sx * 0.92, 0.36, sz as number, { rz: Math.PI / 2, seg: 16 });
    p.cyl(M.steel, 0.18, 0.26, sx * 0.92, 0.36, sz as number, { rz: Math.PI / 2, seg: 12 });
  }
  // lights
  p.box(M.ledAmber, 0.3, 0.1, 0.04, -0.6, 1.05, 2.26);
  p.box(M.ledAmber, 0.3, 0.1, 0.04, 0.6, 1.05, 2.26);
  p.box(M.ledRed, 0.24, 0.1, 0.04, -0.7, 0.9, -2.27);
  p.box(M.ledRed, 0.24, 0.1, 0.04, 0.7, 0.9, -2.27);
  // rear doors seam
  p.box(M.steelDark, 0.02, 1.3, 0.02, 0, 0.5, -2.26);
  p.col('metal', 2.1, 2.1, 4.6, 0, 0, 0);
  return p.proto('garage.van');
}

export function garageControls(): PropProto {
  reg('garage.controls', 'Garage door controls', '0.3×0.12×0.4', 'garage');
  const p = new P();
  p.box(M.steel, 0.26, 0.36, 0.1, 0, 0, 0.05, { bevel: 0.01 });
  p.box(M.ledGreen, 0.05, 0.05, 0.02, -0.05, 0.24, 0.1);
  p.box(M.safetyRed, 0.05, 0.05, 0.02, 0.05, 0.24, 0.1);
  p.box(M.plasticBlack, 0.14, 0.08, 0.02, 0, 0.08, 0.1);
  return p.proto('garage.controls');
}

export function utilityShelving(seed = 0): PropProto {
  reg('mech.shelving', 'Utility shelving', '1.8×0.5×1.9');
  const p = new P();
  for (const x of [-0.85, 0.85]) p.box(M.steelDark, 0.05, 1.9, 0.5, x, 0, 0);
  for (let s = 0; s < 4; s++) {
    const y = 0.15 + s * 0.5;
    p.box(M.galv(), 1.76, 0.03, 0.5, 0, y, 0);
    for (let i = 0; i < 3; i++) {
      if (hash2(i, seed + s) > 0.3) {
        // muted storage palette (cardboard-dominant, rare color accents)
        const roll = hash2(i, seed + s + 5);
        const mat = roll < 0.45 ? M.cardboard : roll < 0.7 ? M.cardboardDark : roll < 0.85 ? M.plasticGray : roll < 0.95 ? M.steelDark : M.safetyYellow;
        p.box(mat,
          0.34 + hash2(i, s) * 0.14, 0.24 + hash2(i, s + 2) * 0.14, 0.4,
          -0.55 + i * 0.55, y + 0.03, 0, { bevel: 0.01 });
      }
    }
  }
  p.col('metal', 1.8, 1.9, 0.52, 0, 0, 0);
  return p.proto('mech.shelving');
}

export function kestrelBannerProp(): PropProto {
  registerAsset({
    id: 'prop.kestrel.banner', name: 'Kestrel Cell banner (occupation storytelling)', category: 'signage', agent: 'Fable 4',
    files: 'src/assets/models/props/maintenance.ts', where: 'lobby/garage',
    dims: '0.8×1.2', materials: 'fabric print', collision: 'none', lod: 'merged-static',
    status: 'integrated', accept: 'original insignia; reads as hostile occupation',
  });
  const p = new P();
  p.cyl(M.steelDark, 0.015, 0.9, 0, 1.98, 0, { rz: Math.PI / 2 });
  p.geo(new THREE.MeshStandardMaterial({ map: kestrelBanner(), roughness: 0.9, name: 'kestrel-banner' }),
    boxGeo(0.8, 1.2, 0.01).clone().translate(0, 1.35, 0));
  return p.proto('kestrel.banner');
}

export function ammoCrate(): PropProto {
  registerAsset({
    id: 'prop.kestrel.crate', name: 'Kestrel equipment crate', category: 'maintenance', agent: 'Fable 4',
    files: 'src/assets/models/props/maintenance.ts', where: 'occupied rooms',
    dims: '0.8×0.4×0.35', materials: 'olive steel', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'reads as hostile materiel',
  });
  const p = new P();
  p.box(new THREE.MeshStandardMaterial({ color: 0x4a5240, roughness: 0.7, metalness: 0.3, name: 'olive' }), 0.8, 0.32, 0.35, 0, 0, 0, { bevel: 0.012 });
  p.box(M.steelDark, 0.82, 0.04, 0.37, 0, 0.32, 0, { bevel: 0.01 });
  p.box(M.safetyRed, 0.12, 0.08, 0.005, 0, 0.12, 0.178);
  p.col('metal', 0.8, 0.38, 0.35, 0, 0, 0);
  return p.proto('kestrel.crate');
}
