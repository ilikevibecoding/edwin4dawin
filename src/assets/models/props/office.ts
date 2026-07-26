import * as THREE from 'three';
import { P, type PropProto, boxGeo } from './kit';
import { M, screenMat } from './mats';
import { hash2 } from '../../../core/rng';
import { registerAsset } from '../../registry';
import { whiteboardTex, noticeBoardTex, brandWall, paperTex, screen } from '../../textures/signage';

/**
 * Office furniture & electronics library (Fable 3).
 * Origin: floor-center. Front: +Z. All dims meters.
 */

function reg(id: string, name: string, dims: string, extra: Partial<Parameters<typeof registerAsset>[0]> = {}): void {
  registerAsset({
    id: `prop.${id}`,
    name,
    category: 'furniture',
    agent: 'Fable 3',
    files: 'src/assets/models/props/office.ts',
    where: 'offices',
    dims,
    materials: 'prop palette',
    collision: 'static-aabb',
    lod: 'merged-static',
    status: 'integrated',
    accept: 'silhouette/proportion/material ≥4; natural placement; correct collision',
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------
export function taskChair(seed = 0): PropProto {
  reg('chair.task', 'Task chair', '0.62×0.62×0.9');
  const p = new P();
  const fabric = seed % 2 ? M.seatFabricWarm : M.seatFabric;
  // star base
  for (let i = 0; i < 5; i++) {
    p.box(M.plasticBlack, 0.055, 0.035, 0.3, 0, 0.02, 0, { ry: (i / 5) * Math.PI * 2, bevel: 0.01 });
  }
  p.cyl(M.plasticBlack, 0.035, 0.02, 0.24, 0.008, 0, { rx: Math.PI / 2 }); // casters approx
  p.cyl(M.chrome, 0.024, 0.3, 0, 0.05, 0);
  p.box(fabric, 0.5, 0.075, 0.48, 0, 0.44, 0.02, { bevel: 0.025 });        // seat
  p.box(fabric, 0.46, 0.52, 0.07, 0, 0.52, -0.235, { bevel: 0.028 });      // back
  p.box(M.plasticBlack, 0.4, 0.05, 0.05, 0, 0.5, -0.26, { bevel: 0.012 }); // back spine
  for (const s of [-1, 1]) {
    p.box(M.plasticBlack, 0.05, 0.2, 0.05, s * 0.26, 0.44, 0.02);
    p.box(M.plasticDark, 0.07, 0.03, 0.26, s * 0.26, 0.62, 0.02, { bevel: 0.012 });
  }
  p.col('fabric', 0.6, 0.95, 0.6, 0, 0, 0);
  return p.proto('chair.task');
}

export function confChair(): PropProto {
  reg('chair.conf', 'Conference chair', '0.58×0.6×0.86');
  const p = new P();
  for (const s of [-1, 1]) {
    p.box(M.chrome, 0.04, 0.8, 0.045, s * 0.24, 0, 0.18, { rx: -0.15 });
    p.box(M.chrome, 0.04, 0.045, 0.5, s * 0.24, 0.0, -0.05);
  }
  p.box(M.leather, 0.5, 0.07, 0.48, 0, 0.46, 0.02, { bevel: 0.02 });
  p.box(M.leather, 0.5, 0.48, 0.07, 0, 0.53, -0.22, { bevel: 0.02, rx: -0.08 });
  p.col('fabric', 0.56, 0.9, 0.58, 0, 0, 0);
  return p.proto('chair.conf');
}

export function waitingChair(): PropProto {
  reg('chair.waiting', 'Waiting chair', '0.56×0.58×0.8');
  const p = new P();
  p.box(M.steelDark, 0.5, 0.04, 0.04, 0, 0.38, 0.22);
  for (const s of [-1, 1]) {
    p.box(M.steelDark, 0.04, 0.42, 0.5, s * 0.24, 0, 0);
  }
  p.box(M.sofaBlue, 0.5, 0.08, 0.46, 0, 0.42, 0.02, { bevel: 0.02 });
  p.box(M.sofaBlue, 0.5, 0.4, 0.08, 0, 0.48, -0.2, { bevel: 0.02 });
  p.col('fabric', 0.54, 0.82, 0.56, 0, 0, 0);
  return p.proto('chair.waiting');
}

export function sofa(): PropProto {
  reg('sofa', 'Two-seat sofa', '1.7×0.85×0.8');
  const p = new P();
  p.box(M.sofaBlue, 1.7, 0.28, 0.8, 0, 0.12, 0, { bevel: 0.03 });
  p.box(M.sofaBlue, 1.7, 0.42, 0.22, 0, 0.3, -0.29, { bevel: 0.035 });
  for (const s of [-1, 1]) {
    p.box(M.sofaBlue, 0.18, 0.34, 0.72, s * 0.76, 0.26, 0.02, { bevel: 0.035 });
  }
  for (const s of [-1, 1]) {
    p.box(M.sofaBlue, 0.72, 0.13, 0.6, s * 0.4, 0.38, 0.06, { bevel: 0.045 }); // cushions
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.cyl(M.walnut, 0.025, 0.1, sx * 0.78, 0.0, sz * 0.33);
  }
  p.col('fabric', 1.72, 0.75, 0.82, 0, 0, 0);
  return p.proto('sofa');
}

// ---------------------------------------------------------------------------
// Desks & tables
// ---------------------------------------------------------------------------
export function standardDesk(): PropProto {
  reg('desk.standard', 'Standard desk', '1.5×0.75×0.74');
  const p = new P();
  p.box(M.birch(), 1.5, 0.035, 0.75, 0, 0.72, 0, { bevel: 0.012 });
  for (const s of [-1, 1]) {
    p.box(M.graphite, 0.05, 0.7, 0.62, s * 0.7, 0, 0, { bevel: 0.012 });
  }
  p.box(M.graphite, 1.34, 0.32, 0.025, 0, 0.28, -0.32); // modesty panel
  p.col('wood', 1.5, 0.76, 0.75, 0, 0, 0);
  return p.proto('desk.standard');
}

export function execDesk(): PropProto {
  reg('desk.exec', 'Executive desk', '2.2×1.0×0.76', { where: 'executive office' });
  const p = new P();
  p.box(M.walnut, 2.2, 0.045, 1.0, 0, 0.72, 0, { bevel: 0.015 });
  p.box(M.walnut, 0.55, 0.68, 0.9, -0.78, 0.02, 0, { bevel: 0.012 });
  p.box(M.walnut, 0.55, 0.68, 0.9, 0.78, 0.02, 0, { bevel: 0.012 });
  p.box(M.walnut, 2.05, 0.5, 0.04, 0, 0.2, -0.44);
  // drawer lines
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      p.box(M.brass, 0.12, 0.02, 0.012, s * 0.78, 0.14 + i * 0.21, 0.452);
    }
  }
  p.col('wood', 2.2, 0.78, 1.0, 0, 0, 0);
  return p.proto('desk.exec');
}

export function conferenceTable(): PropProto {
  reg('table.conference', 'Conference table', '4.2×1.5×0.76', { where: 'conference room' });
  const p = new P();
  p.box(M.walnut, 4.2, 0.05, 1.5, 0, 0.72, 0, { bevel: 0.02 });
  p.box(M.graphite, 0.22, 0.7, 1.0, -1.7, 0, 0, { bevel: 0.015 });
  p.box(M.graphite, 0.22, 0.7, 1.0, 1.7, 0, 0, { bevel: 0.015 });
  p.box(M.graphite, 3.0, 0.09, 0.3, 0, 0.32, 0); // spine
  // center cable well
  p.box(M.plasticBlack, 0.6, 0.012, 0.18, 0, 0.772, 0);
  p.col('wood', 4.2, 0.78, 1.5, 0, 0, 0);
  return p.proto('table.conference');
}

export function lowTable(): PropProto {
  reg('table.low', 'Coffee table', '1.1×0.6×0.42');
  const p = new P();
  p.box(M.birch(), 1.1, 0.03, 0.6, 0, 0.4, 0, { bevel: 0.012 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.box(M.steelDark, 0.04, 0.4, 0.04, sx * 0.5, 0, sz * 0.25);
  }
  p.col('wood', 1.1, 0.44, 0.6, 0, 0, 0);
  return p.proto('table.low');
}

export function breakTable(): PropProto {
  reg('table.break', 'Break-room table', '1.2×1.2×0.74');
  const p = new P();
  p.cyl(M.laminate, 0.6, 0.04, 0, 0.71, 0, { seg: 20 });
  p.cyl(M.steelDark, 0.04, 0.7, 0, 0, 0);
  p.cyl(M.steelDark, 0.26, 0.03, 0, 0, 0, { seg: 16 });
  p.col('wood', 1.15, 0.76, 1.15, 0, 0, 0);
  return p.proto('table.break');
}

export function sideTable(): PropProto {
  reg('table.side', 'Side table', '0.5×0.5×0.5');
  const p = new P();
  p.cyl(M.birch(), 0.25, 0.03, 0, 0.48, 0, { seg: 16 });
  p.cyl(M.steelDark, 0.025, 0.48, 0, 0, 0);
  p.cyl(M.steelDark, 0.16, 0.02, 0, 0, 0, { seg: 14 });
  p.col('wood', 0.5, 0.52, 0.5, 0, 0, 0);
  return p.proto('table.side');
}

// ---------------------------------------------------------------------------
// Electronics
// ---------------------------------------------------------------------------
export function monitorProto(kind: Parameters<typeof screenMat>[0], dual = false): PropProto {
  reg('electronics.monitor', 'Monitor (single/dual)', '0.56×0.34 screen', { category: 'electronics' });
  const p = new P();
  const one = (x: number, ry: number): void => {
    p.box(M.plasticBlack, 0.56, 0.34, 0.03, x, 0.14, 0, { bevel: 0.006, ry });
    p.geo(screenMat(kind), boxGeo(0.52, 0.3, 0.012).clone().translate(0, 0.31, 0.012).clone().applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, 0)));
    p.box(M.plasticBlack, 0.06, 0.12, 0.05, x, 0.02, -0.02, { ry });
    p.box(M.plasticBlack, 0.2, 0.02, 0.16, x, 0, -0.02, { ry, bevel: 0.006 });
  };
  if (dual) {
    one(-0.3, 0.14);
    one(0.3, -0.14);
  } else {
    one(0, 0);
  }
  return p.proto('electronics.monitor');
}

export function laptop(kind: Parameters<typeof screenMat>[0] = 'code'): PropProto {
  reg('electronics.laptop', 'Laptop', '0.34×0.24', { category: 'electronics' });
  const p = new P();
  p.box(M.alu, 0.34, 0.018, 0.24, 0, 0, 0, { bevel: 0.005 });
  p.box(M.plasticBlack, 0.3, 0.004, 0.18, 0, 0.018, 0.005);
  p.box(M.alu, 0.34, 0.23, 0.012, 0, 0.015, -0.115, { rx: -0.28, bevel: 0.005 });
  p.geo(screenMat(kind), boxGeo(0.31, 0.2, 0.006).clone().rotateX(-0.28).translate(0, 0.128, -0.146));
  return p.proto('electronics.laptop');
}

export function pcTower(): PropProto {
  reg('electronics.pc', 'Computer tower', '0.18×0.42×0.4', { category: 'electronics' });
  const p = new P();
  p.box(M.plasticDark, 0.18, 0.4, 0.42, 0, 0, 0, { bevel: 0.008 });
  p.box(M.plasticBlack, 0.16, 0.36, 0.02, 0, 0.02, 0.21);
  p.box(M.ledGreen, 0.012, 0.012, 0.008, 0.05, 0.34, 0.22);
  p.col('plastic', 0.18, 0.42, 0.42, 0, 0, 0);
  return p.proto('electronics.pc');
}

export function keyboardMouse(): PropProto {
  reg('electronics.keyboard', 'Keyboard + mouse + pad', '0.45×0.15', { category: 'electronics' });
  const p = new P();
  p.box(M.rubber, 0.68, 0.004, 0.3, 0.04, 0, 0);       // desk pad
  p.box(M.plasticBlack, 0.44, 0.02, 0.15, -0.06, 0.004, 0, { bevel: 0.006 });
  p.box(M.plasticDark, 0.4, 0.008, 0.11, -0.06, 0.022, 0);
  p.box(M.plasticBlack, 0.06, 0.025, 0.1, 0.26, 0.004, 0.01, { bevel: 0.012 });
  return p.proto('electronics.keyboard');
}

export function deskPhone(): PropProto {
  reg('electronics.phone', 'Desk phone', '0.2×0.18', { category: 'electronics' });
  const p = new P();
  p.box(M.plasticDark, 0.2, 0.05, 0.18, 0, 0, 0, { bevel: 0.01, rx: -0.1 });
  p.box(M.plasticBlack, 0.05, 0.04, 0.16, -0.07, 0.045, 0, { bevel: 0.012 });
  p.box(M.plasticGray, 0.09, 0.01, 0.1, 0.03, 0.045, 0.01);
  return p.proto('electronics.phone');
}

export function deskLamp(): PropProto {
  reg('electronics.lamp', 'Desk lamp', '0.16 base, 0.45 tall', { category: 'electronics' });
  const p = new P();
  p.cyl(M.steelDark, 0.08, 0.02, 0, 0, 0);
  p.box(M.steelDark, 0.02, 0.3, 0.02, 0, 0.02, 0, { rz: 0.25 });
  p.box(M.steelDark, 0.02, 0.22, 0.02, -0.09, 0.28, 0, { rz: 1.35 });
  p.box(M.lampWarm, 0.16, 0.05, 0.09, -0.17, 0.24, 0, { bevel: 0.015, rz: 0.4 });
  return p.proto('electronics.lamp');
}

export function printerSmall(): PropProto {
  reg('electronics.printer', 'Desktop printer', '0.42×0.36×0.26', { category: 'electronics' });
  const p = new P();
  p.box(M.plasticGray, 0.42, 0.22, 0.36, 0, 0, 0, { bevel: 0.012 });
  p.box(M.plasticDark, 0.3, 0.03, 0.2, 0, 0.22, -0.04, { bevel: 0.008 });
  p.box(M.paper, 0.26, 0.02, 0.16, 0, 0.225, 0.06);
  p.box(M.ledCyan, 0.02, 0.008, 0.01, 0.15, 0.18, 0.18);
  p.col('plastic', 0.42, 0.26, 0.36, 0, 0, 0);
  return p.proto('electronics.printer');
}

export function copier(): PropProto {
  reg('electronics.copier', 'Large copier', '1.3×0.75×1.15', { where: 'copy room', category: 'electronics' });
  const p = new P();
  p.box(M.plasticWhite, 1.1, 0.55, 0.7, 0, 0.12, 0, { bevel: 0.015 });
  p.box(M.plasticGray, 1.1, 0.12, 0.7, 0, 0, 0, { bevel: 0.012 });
  p.box(M.plasticWhite, 1.15, 0.18, 0.72, 0, 0.67, 0, { bevel: 0.02 });
  p.box(M.plasticDark, 0.5, 0.05, 0.5, -0.2, 0.85, 0, { bevel: 0.012 });
  p.box(M.plasticGray, 0.36, 0.03, 0.3, 0.35, 0.88, 0, { bevel: 0.008, rx: -0.3 });  // control panel
  p.geo(screenMat('logo'), boxGeo(0.14, 0.008, 0.1).clone().rotateX(-0.3).translate(0.35, 0.9, 0.02));
  p.box(M.paper, 0.42, 0.09, 0.32, -0.32, 0.3, 0.36);  // paper trays
  p.box(M.plasticGray, 0.46, 0.04, 0.4, -0.28, 0.42, 0.3, { bevel: 0.008 });
  p.col('plastic', 1.3, 1.0, 0.75, 0, 0, 0);
  return p.proto('electronics.copier');
}

export function serverRack(withLeds = true): PropProto {
  reg('electronics.serverrack', 'Server rack', '0.6×0.8×2.0', { where: 'server room', category: 'electronics' });
  const p = new P();
  p.box(M.plasticBlack, 0.6, 2.0, 0.8, 0, 0, 0, { bevel: 0.012 });
  p.box(M.steelDark, 0.56, 1.9, 0.03, 0, 0.05, 0.4);
  // unit faces + LEDs
  for (let i = 0; i < 9; i++) {
    const y = 0.14 + i * 0.2;
    p.box(M.graphite, 0.5, 0.16, 0.02, 0, y, 0.415, { bevel: 0.004 });
    if (withLeds) {
      const on = hash2(i, 7) > 0.25;
      p.box(on ? M.ledCyan : M.ledAmber, 0.015, 0.015, 0.01, -0.2, y + 0.07, 0.425);
      if (hash2(i, 9) > 0.5) p.box(M.ledGreen, 0.015, 0.015, 0.01, -0.17, y + 0.07, 0.425);
      // vent slots
      for (let v = 0; v < 5; v++) {
        p.box(M.plasticBlack, 0.06, 0.1, 0.005, 0.08 + (v - 2) * 0.075, y + 0.03, 0.427);
      }
    }
  }
  p.col('metal', 0.62, 2.0, 0.82, 0, 0, 0);
  return p.proto('electronics.serverrack');
}

export function upsUnit(): PropProto {
  reg('electronics.ups', 'UPS unit', '0.8×1.1×0.6', { where: 'server room', category: 'electronics' });
  const p = new P();
  p.box(M.steelDark, 0.8, 1.1, 0.6, 0, 0, 0, { bevel: 0.015 });
  p.box(M.plasticBlack, 0.7, 0.2, 0.02, 0, 0.8, 0.3);
  p.geo(screenMat('server-status'), boxGeo(0.2, 0.12, 0.01).clone().translate(-0.18, 0.9, 0.31));
  p.box(M.ledGreen, 0.02, 0.02, 0.01, 0.24, 0.9, 0.31);
  p.col('metal', 0.8, 1.1, 0.6, 0, 0, 0);
  return p.proto('electronics.ups');
}

export function securityConsole(): PropProto {
  reg('electronics.security', 'Security console (3 monitors)', '2.6×0.8×1.4', { where: 'security office', category: 'electronics' });
  const p = new P();
  p.box(M.laminateDark, 2.6, 0.04, 0.8, 0, 0.72, 0, { bevel: 0.012 });
  for (const s of [-1, 0, 1]) {
    p.box(M.graphite, 0.06, 0.7, 0.7, s * 1.2, 0, 0);
  }
  for (const s of [-1, 0, 1]) {
    const ry = -s * 0.3;
    p.box(M.plasticBlack, 0.5, 0.32, 0.03, s * 0.78, 0.9, -0.14, { ry, bevel: 0.006 });
    p.geo(screenMat('security'), boxGeo(0.46, 0.28, 0.012).clone().translate(0, 0, 0.02).applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(s * 0.78, 1.06, -0.14)));
    p.box(M.plasticBlack, 0.1, 0.14, 0.06, s * 0.78, 0.76, -0.16, { ry });
  }
  p.box(M.plasticBlack, 0.44, 0.02, 0.15, 0, 0.76, 0.16, { bevel: 0.006 });
  p.col('wood', 2.6, 1.15, 0.8, 0, 0, 0);
  return p.proto('electronics.security');
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
export function filingCabinet(tall = true): PropProto {
  reg('storage.filing', 'Filing cabinet', '0.47×0.62×1.32/0.72');
  const p = new P();
  const h = tall ? 1.32 : 0.66;
  const drawers = tall ? 4 : 2;
  p.box(M.steel, 0.47, h, 0.62, 0, 0, 0, { bevel: 0.01 });
  for (let i = 0; i < drawers; i++) {
    const y = 0.08 + i * (h - 0.12) / drawers;
    p.box(M.steelDark, 0.4, (h - 0.16) / drawers - 0.03, 0.02, 0, y, 0.31, { bevel: 0.005 });
    p.box(M.alu, 0.14, 0.025, 0.02, 0, y + (h - 0.16) / drawers / 2 - 0.045, 0.325);
  }
  p.col('metal', 0.47, h, 0.62, 0, 0, 0);
  return p.proto('storage.filing');
}

export function drawerUnit(): PropProto {
  reg('storage.drawer', 'Under-desk drawer unit', '0.4×0.5×0.6');
  const p = new P();
  p.box(M.graphite, 0.4, 0.6, 0.5, 0, 0, 0, { bevel: 0.01 });
  for (let i = 0; i < 3; i++) {
    p.box(M.plasticDark, 0.34, 0.15, 0.015, 0, 0.06 + i * 0.18, 0.25);
    p.box(M.alu, 0.12, 0.02, 0.015, 0, 0.14 + i * 0.18, 0.26);
  }
  p.col('metal', 0.4, 0.6, 0.5, 0, 0, 0);
  return p.proto('storage.drawer');
}

export function bookcase(seed = 0): PropProto {
  reg('storage.bookcase', 'Bookcase with binders', '0.9×0.32×1.9');
  const p = new P();
  p.box(M.birch(), 0.9, 1.9, 0.32, 0, 0, 0, { bevel: 0.01 });
  for (let s = 0; s < 4; s++) {
    const y = 0.14 + s * 0.44;
    p.box(M.birch(), 0.82, 0.025, 0.28, 0, y, 0);
    // binder/book fills
    let x = -0.36;
    let i = 0;
    while (x < 0.32) {
      const w = 0.035 + hash2(i, seed) * 0.035;
      const h = 0.24 + hash2(i, seed + 3) * 0.1;
      const colors = [M.tealAccent, M.safetyRed, M.plasticDark, M.plasticBeige, M.cardboardDark, M.plasticGray];
      if (hash2(i, seed + s) > 0.18) {
        p.box(colors[Math.floor(hash2(i, seed + 7) * 6)], w, h, 0.22, x + w / 2, y + 0.025, 0, { bevel: 0.004 });
      }
      x += w + 0.006;
      i++;
    }
  }
  p.col('wood', 0.9, 1.9, 0.32, 0, 0, 0);
  return p.proto('storage.bookcase');
}

export function archiveRack(seed = 0): PropProto {
  reg('storage.archive', 'Archive rack with boxes', '3.4×0.65×2.0', { where: 'records archive' });
  const p = new P();
  for (const x of [-1.65, 0, 1.65]) {
    p.box(M.steel, 0.06, 2.0, 0.6, x, 0, 0);
  }
  for (let s = 0; s < 4; s++) {
    const y = 0.12 + s * 0.5;
    p.box(M.galv(), 3.36, 0.035, 0.62, 0, y, 0);
    // archive boxes
    let x = -1.55;
    let i = 0;
    while (x < 1.45) {
      if (hash2(i, seed + s * 9) > 0.22) {
        const mat = hash2(i, seed + s) > 0.5 ? M.cardboard : M.cardboardDark;
        p.box(mat, 0.34, 0.26, 0.42, x + 0.17, y + 0.035, 0, { bevel: 0.008 });
        p.box(M.paper, 0.1, 0.06, 0.005, x + 0.17, y + 0.13, 0.215);
      }
      x += 0.37;
      i++;
    }
  }
  p.col('metal', 3.4, 2.0, 0.65, 0, 0, 0);
  return p.proto('storage.archive');
}

export function lockerBank(): PropProto {
  reg('storage.locker', 'Locker bank', '1.2×0.5×1.8', { where: 'security office' });
  const p = new P();
  p.box(M.steelDark, 1.2, 1.8, 0.5, 0, 0, 0, { bevel: 0.01 });
  for (let i = 0; i < 4; i++) {
    const x = -0.45 + i * 0.3;
    p.box(M.steel, 0.26, 1.66, 0.02, x, 0.07, 0.25, { bevel: 0.005 });
    p.box(M.plasticBlack, 0.04, 0.08, 0.02, x + 0.08, 1.0, 0.26);
    for (let v = 0; v < 3; v++) {
      p.box(M.steelDark, 0.16, 0.015, 0.01, x, 1.5 + v * 0.05, 0.262);
    }
  }
  p.col('metal', 1.2, 1.8, 0.5, 0, 0, 0);
  return p.proto('storage.locker');
}

// ---------------------------------------------------------------------------
// Cubicles
// ---------------------------------------------------------------------------
export function cubiclePod(seed: number): PropProto {
  reg('cubicle.pod', 'Cubicle pod (2 workstations)', '3.2×1.9×1.24', { where: 'open-plan office' });
  const p = new P();
  const panel = seed % 2 ? M.panelFabric : M.panelFabricBlue;
  const PH = 1.24;
  // spine panel along X + two end panels
  p.box(panel, 3.2, PH, 0.06, 0, 0, 0, { bevel: 0.012 });
  p.box(M.alu, 3.2, 0.03, 0.08, 0, PH, 0);
  for (const s of [-1, 1]) {
    p.box(panel, 0.06, PH, 1.9, s * 1.57, 0, 0, { bevel: 0.012 });
    p.box(M.alu, 0.08, 0.03, 1.9, s * 1.57, PH, 0);
  }
  // desks on both sides
  for (const side of [-1, 1]) {
    const z = side * 0.42;
    p.box(M.birch(), 2.9, 0.03, 0.7, 0, 0.72, z, { bevel: 0.01 });
    p.box(M.graphite, 0.05, 0.72, 0.6, -1.4, 0, z);
    p.box(M.graphite, 0.05, 0.72, 0.6, 1.4, 0, z);
    p.box(M.graphite, 0.05, 0.72, 0.6, 0.02, 0, z);
    // per-side setup varies with seed
    const s2 = seed * 2 + (side + 1) / 2;
    const kinds = ['spreadsheet', 'code', 'map', 'off', 'logo'] as const;
    const kind = kinds[Math.floor(hash2(s2, 3) * 5)];
    const mx = -0.7 + hash2(s2, 5) * 1.2;
    // monitor
    p.box(M.plasticBlack, 0.56, 0.34, 0.03, mx, 0.9, z - side * 0.22, { bevel: 0.006 });
    p.geo(screenMat(kind), boxGeo(0.52, 0.3, 0.012).clone().translate(mx, 1.07, z - side * 0.22 + side * 0.02));
    p.box(M.plasticBlack, 0.06, 0.14, 0.05, mx, 0.75, z - side * 0.24);
    // keyboard + mouse
    p.box(M.plasticBlack, 0.42, 0.018, 0.14, mx + 0.05, 0.752, z + side * 0.08, { bevel: 0.006 });
    p.box(M.plasticBlack, 0.055, 0.022, 0.09, mx + 0.32, 0.752, z + side * 0.06, { bevel: 0.01 });
    // pc tower under desk
    if (hash2(s2, 8) > 0.3) {
      p.box(M.plasticDark, 0.17, 0.38, 0.4, mx + 0.9 * (hash2(s2, 4) > 0.5 ? 1 : -1), 0.02, z, { bevel: 0.008 });
    }
    // clutter: papers, mug, folders, phone
    if (hash2(s2, 11) > 0.35) {
      p.geo(new THREE.MeshStandardMaterial({ map: paperTex(Math.floor(hash2(s2, 12) * 4)), roughness: 0.9, name: 'paper-print' }),
        boxGeo(0.21, 0.003, 0.29).clone().rotateY(hash2(s2, 13) * 0.7 - 0.3).translate(mx - 0.55, 0.752, z + side * 0.12));
    }
    if (hash2(s2, 14) > 0.4) {
      p.cyl(hash2(s2, 15) > 0.5 ? M.tealAccent : M.plasticWhite, 0.04, 0.1, mx + 0.55, 0.752, z + side * 0.16, { seg: 10 });
    }
    if (hash2(s2, 16) > 0.5) {
      p.box(M.plasticDark, 0.18, 0.045, 0.16, mx - 0.85, 0.752, z + side * 0.05, { bevel: 0.008, rx: -0.08 }); // phone
    }
    if (hash2(s2, 17) > 0.55) {
      p.box(M.safetyRed, 0.24, 0.05, 0.3, mx + 0.82, 0.752, z, { ry: hash2(s2, 18) * 0.4 }); // binder
    }
  }
  p.col('wood', 3.2, PH, 1.9, 0, 0, 0);
  return p.proto('cubicle.pod');
}

// ---------------------------------------------------------------------------
// Wall-mounted
// ---------------------------------------------------------------------------
export function whiteboard(): PropProto {
  reg('wall.whiteboard', 'Whiteboard (written)', '1.8×1.0');
  const p = new P();
  p.box(M.alu, 1.84, 1.04, 0.03, 0, 0, 0.02, { bevel: 0.008 });
  p.geo(new THREE.MeshStandardMaterial({ map: whiteboardTex(), roughness: 0.25, name: 'whiteboard-face' }),
    boxGeo(1.76, 0.96, 0.01).clone().translate(0, 0.52, 0.04));
  p.box(M.alu, 0.5, 0.03, 0.06, 0, -0.5, 0.05);
  p.box(M.safetyRed, 0.1, 0.022, 0.022, -0.12, -0.47, 0.05, { bevel: 0.008 });
  p.box(M.plasticBlack, 0.1, 0.022, 0.022, 0.05, -0.47, 0.05, { bevel: 0.008 });
  return p.proto('wall.whiteboard');
}

export function noticeBoard(): PropProto {
  reg('wall.noticeboard', 'Notice board', '1.2×0.9');
  const p = new P();
  p.box(M.walnut, 1.24, 0.94, 0.03, 0, 0, 0.02, { bevel: 0.008 });
  p.geo(new THREE.MeshStandardMaterial({ map: noticeBoardTex(), roughness: 0.9, name: 'notice-face' }),
    boxGeo(1.16, 0.86, 0.012).clone().translate(0, 0.47, 0.04));
  return p.proto('wall.noticeboard');
}

export function wallClock(): PropProto {
  reg('wall.clock', 'Wall clock', 'Ø0.34');
  const p = new P();
  p.cyl(M.plasticBlack, 0.17, 0.04, 0, 0.17, 0, { rx: Math.PI / 2, seg: 20 });
  p.cyl(M.plasticWhite, 0.15, 0.012, 0, 0.17, 0.02, { rx: Math.PI / 2, seg: 20 });
  p.box(M.plasticBlack, 0.012, 0.1, 0.008, 0, 0.17, 0.028);
  p.box(M.plasticBlack, 0.09, 0.012, 0.008, 0.03, 0.17, 0.028);
  return p.proto('wall.clock');
}

export function presentationDisplay(): PropProto {
  reg('wall.display', 'Conference display', '1.6×0.95', { category: 'electronics' });
  const p = new P();
  p.box(M.plasticBlack, 1.64, 0.98, 0.06, 0, 0, 0.03, { bevel: 0.01 });
  p.geo(screenMat('map'), boxGeo(1.54, 0.88, 0.015).clone().translate(0, 0.49, 0.065));
  return p.proto('wall.display');
}

export function brandWallPanel(): PropProto {
  reg('wall.brand', 'Norrsken brand wall', '4.6×2.2', { where: 'lobby', category: 'signage' });
  const p = new P();
  p.box(M.tealAccent, 4.7, 2.3, 0.06, 0, 0, 0.01, { bevel: 0.015 });
  p.geo(new THREE.MeshStandardMaterial({ map: brandWall(), roughness: 0.6, name: 'brand-face' }),
    boxGeo(4.5, 2.1, 0.02).clone().translate(0, 1.15, 0.05));
  return p.proto('wall.brand');
}

// ---------------------------------------------------------------------------
// Decor & misc
// ---------------------------------------------------------------------------
export function officePlant(tall = true): PropProto {
  reg('decor.plant', 'Office plant', tall ? 'Ø0.4×1.5' : 'Ø0.3×0.5');
  const p = new P();
  const h = tall ? 0.42 : 0.2;
  p.cyl(M.plasticDark, tall ? 0.19 : 0.12, h, 0, 0, 0, { seg: 14, r1: tall ? 0.15 : 0.1 });
  p.cyl(M.soil, tall ? 0.16 : 0.1, 0.02, 0, h - 0.02, 0, { seg: 12 });
  const leaves = tall ? 7 : 5;
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2;
    const lh = tall ? 0.7 + hash2(i, 3) * 0.5 : 0.25 + hash2(i, 3) * 0.15;
    p.box(i % 2 ? M.plant : M.plantDark, 0.1, lh, 0.02, Math.cos(a) * 0.08, h - 0.05, Math.sin(a) * 0.08,
      { ry: a, rz: 0.3 + hash2(i, 5) * 0.4, bevel: 0.01 });
  }
  p.col('plastic', 0.36, tall ? 1.3 : 0.5, 0.36, 0, 0, 0);
  return p.proto('decor.plant');
}

export function planterBox(): PropProto {
  reg('decor.planter', 'Planter box', '0.9×0.9×0.75', { where: 'lobby/main hall' });
  const p = new P();
  p.box(M.graphite, 0.9, 0.5, 0.9, 0, 0, 0, { bevel: 0.02 });
  p.box(M.soil, 0.8, 0.04, 0.8, 0, 0.48, 0);
  for (let i = 0; i < 10; i++) {
    const a = hash2(i, 21) * Math.PI * 2;
    const r = hash2(i, 22) * 0.3;
    p.box(i % 2 ? M.plant : M.plantDark, 0.12, 0.5 + hash2(i, 23) * 0.4, 0.025,
      Math.cos(a) * r, 0.5, Math.sin(a) * r, { ry: a, rz: (hash2(i, 24) - 0.5) * 0.5, bevel: 0.01 });
  }
  p.col('wood', 0.9, 0.75, 0.9, 0, 0, 0);
  return p.proto('decor.planter');
}

export function lobbyBench(): PropProto {
  reg('decor.bench', 'Lobby bench', '1.8×0.55×0.45');
  const p = new P();
  p.box(M.birch(), 1.8, 0.07, 0.55, 0, 0.38, 0, { bevel: 0.02 });
  for (const s of [-1, 1]) {
    p.box(M.steelDark, 0.06, 0.38, 0.45, s * 0.8, 0, 0, { bevel: 0.01 });
  }
  p.col('wood', 1.8, 0.46, 0.55, 0, 0, 0);
  return p.proto('decor.bench');
}

export function coatRack(withCoats = true): PropProto {
  reg('decor.coatrack', 'Coat rack', 'Ø0.5×1.75');
  const p = new P();
  p.cyl(M.steelDark, 0.22, 0.02, 0, 0, 0, { seg: 14 });
  p.cyl(M.steelDark, 0.02, 1.72, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    p.box(M.steelDark, 0.02, 0.02, 0.18, Math.cos(a) * 0.1, 1.6, Math.sin(a) * 0.1, { ry: -a });
  }
  if (withCoats) {
    p.box(M.seatFabric, 0.34, 0.7, 0.12, 0.12, 0.85, 0.05, { bevel: 0.04, ry: 0.5 });
    p.box(M.sofaBlue, 0.3, 0.62, 0.1, -0.12, 0.9, -0.06, { bevel: 0.04, ry: 2.2 });
  }
  p.col('metal', 0.44, 1.75, 0.44, 0, 0, 0);
  return p.proto('decor.coatrack');
}

export function backpack(seed = 0): PropProto {
  reg('decor.backpack', 'Backpack', '0.32×0.2×0.45');
  const p = new P();
  const mat = seed % 2 ? M.seatFabric : M.cardboardDark;
  p.box(mat, 0.32, 0.42, 0.18, 0, 0, 0, { bevel: 0.04, ry: seed * 0.6 });
  p.box(mat, 0.26, 0.2, 0.08, 0, 0.08, 0.11, { bevel: 0.03, ry: seed * 0.6 });
  return p.proto('decor.backpack');
}
