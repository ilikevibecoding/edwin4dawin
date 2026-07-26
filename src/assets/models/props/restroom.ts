import { P, type PropProto, boxGeo } from './kit';
import { M } from './mats';
import { registerAsset } from '../../registry';

/** Restroom assets (Fable 3). */

function reg(id: string, name: string, dims: string): void {
  registerAsset({
    id: `prop.${id}`, name, category: 'restroom', agent: 'Fable 3',
    files: 'src/assets/models/props/restroom.ts', where: 'restrooms',
    dims, materials: 'ceramic/stainless/laminate', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'reads as commercial restroom fixture; correct heights',
  });
}

export function sinkCounter(len = 1.6): PropProto {
  reg('restroom.sink', 'Sink counter + mirrors', `${len}×0.55×0.85`);
  const p = new P();
  p.box(M.laminateDark, len, 0.06, 0.55, 0, 0.82, 0, { bevel: 0.012 });
  p.box(M.plasticGray, len - 0.1, 0.3, 0.45, 0, 0.5, 0, { bevel: 0.01 });
  const basins = Math.floor(len / 0.8);
  for (let i = 0; i < basins; i++) {
    const x = -len / 2 + 0.4 + i * 0.8;
    p.box(M.ceramic, 0.42, 0.05, 0.34, x, 0.86, 0.02, { bevel: 0.02 });
    p.box(M.plasticDark, 0.3, 0.03, 0.24, x, 0.87, 0.02);
    p.cyl(M.chrome, 0.015, 0.15, x, 0.88, -0.16);
    p.box(M.chrome, 0.012, 0.012, 0.1, x, 1.02, -0.12);
    // mirror above
    p.geo(M.mirror, boxGeo(0.6, 0.8, 0.015).clone().translate(x, 1.25, -0.26));
    p.box(M.alu, 0.64, 0.84, 0.01, x, 1.23, -0.27);
    // soap dispenser
    p.box(M.plasticWhite, 0.09, 0.14, 0.06, x + 0.28, 1.1, -0.24, { bevel: 0.012 });
  }
  p.col('tile', len, 0.9, 0.56, 0, 0, 0);
  return p.proto('restroom.sink');
}

export function toilet(): PropProto {
  reg('restroom.toilet', 'Toilet', '0.4×0.65×0.78');
  const p = new P();
  p.box(M.ceramic, 0.24, 0.4, 0.2, 0, 0.15, -0.2, { bevel: 0.03 });   // tank... wall-mount style: flush panel
  p.box(M.ceramic, 0.38, 0.2, 0.5, 0, 0.24, 0.05, { bevel: 0.06 });    // bowl body
  p.box(M.plasticWhite, 0.4, 0.04, 0.52, 0, 0.44, 0.05, { bevel: 0.05 }); // seat
  p.box(M.chrome, 0.1, 0.04, 0.02, 0, 0.62, -0.28);
  p.col('tile', 0.42, 0.62, 0.72, 0, 0, 0);
  return p.proto('restroom.toilet');
}

export function urinal(): PropProto {
  reg('restroom.urinal', 'Urinal', '0.36×0.3×0.6');
  const p = new P();
  p.box(M.ceramic, 0.34, 0.55, 0.26, 0, 0.6, 0.02, { bevel: 0.05 });
  p.box(M.ceramic, 0.3, 0.1, 0.3, 0, 0.55, 0.06, { bevel: 0.04 });
  p.box(M.chrome, 0.06, 0.1, 0.04, 0, 1.2, 0.05);
  p.col('tile', 0.36, 1.3, 0.34, 0, 0, 0);
  return p.proto('restroom.urinal');
}

export function stallRow(count = 2): PropProto {
  reg('restroom.stalls', 'Toilet stalls', `${count * 0.95}×1.4×2.0`);
  const p = new P();
  const w = 0.95;
  for (let i = 0; i <= count; i++) {
    p.box(M.laminateDark, 0.025, 1.5, 1.35, -count * w / 2 + i * w, 0.3, 0, { bevel: 0.008 });
  }
  for (let i = 0; i < count; i++) {
    const x = -count * w / 2 + i * w + w / 2;
    const openAngle = i === 0 ? 0.5 : 0.06;
    p.box(M.laminateDark, w - 0.12, 1.4, 0.025, x + (i === 0 ? -0.1 : 0), 0.35, 0.62, { bevel: 0.008, ry: openAngle });
    p.box(M.chrome, 0.05, 0.05, 0.03, x + 0.3, 1.0, 0.64, { ry: openAngle });
  }
  p.col('plastic', count * w + 0.05, 1.9, 1.4, 0, 0, -0.05);
  return p.proto('restroom.stalls');
}

export function handDryer(): PropProto {
  reg('restroom.dryer', 'Hand dryer', '0.3×0.22×0.34');
  const p = new P();
  p.box(M.stainless, 0.3, 0.34, 0.22, 0, 0, 0.11, { bevel: 0.02 });
  p.box(M.plasticBlack, 0.2, 0.05, 0.06, 0, 0.02, 0.2);
  return p.proto('restroom.dryer');
}

export function towelDispenser(): PropProto {
  reg('restroom.towel', 'Paper-towel dispenser', '0.3×0.15×0.4');
  const p = new P();
  p.box(M.plasticGray, 0.3, 0.4, 0.15, 0, 0, 0.075, { bevel: 0.012 });
  p.box(M.paper, 0.2, 0.04, 0.02, 0, 0.02, 0.12);
  return p.proto('restroom.towel');
}

export function janitorShelf(): PropProto {
  registerAsset({
    id: 'prop.janitor.shelf', name: 'Janitor shelving + supplies', category: 'maintenance', agent: 'Fable 3',
    files: 'src/assets/models/props/restroom.ts', where: 'janitor closet',
    dims: '0.9×0.4×1.8', materials: 'galv steel, plastics', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'dense believable supplies',
  });
  const p = new P();
  for (const x of [-0.42, 0.42]) p.box(M.galv(), 0.05, 1.8, 0.4, x, 0, 0);
  for (let s = 0; s < 4; s++) {
    const y = 0.15 + s * 0.48;
    p.box(M.galv(), 0.86, 0.03, 0.4, 0, y, 0);
    // bottles & supplies
    for (let i = 0; i < 4; i++) {
      const c = [M.safetyYellow, M.tealAccent, M.plasticWhite, M.safetyRed][((i + s) % 4)];
      p.cyl(c, 0.045, 0.2 + (i % 2) * 0.06, -0.3 + i * 0.2, y + 0.03, 0, { seg: 8 });
    }
  }
  p.col('metal', 0.9, 1.8, 0.42, 0, 0, 0);
  return p.proto('janitor.shelf');
}

export function janitorCart(): PropProto {
  registerAsset({
    id: 'prop.janitor.cart', name: 'Janitor cart + mop + bucket', category: 'maintenance', agent: 'Fable 3',
    files: 'src/assets/models/props/restroom.ts', where: 'janitor/service',
    dims: '0.9×0.5×1.0', materials: 'plastics', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'recognizable at a glance',
  });
  const p = new P();
  p.box(M.safetyYellow, 0.8, 0.08, 0.45, 0, 0.12, 0, { bevel: 0.015 });
  p.box(M.plasticGray, 0.76, 0.5, 0.42, 0, 0.2, 0, { bevel: 0.012 });
  p.box(M.plasticDark, 0.7, 0.2, 0.36, 0, 0.72, 0, { bevel: 0.02 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.cyl(M.plasticBlack, 0.05, 0.04, sx * 0.32, 0.02, sz * 0.16, { rz: Math.PI / 2 });
  }
  p.box(M.alu, 0.02, 0.5, 0.02, 0.34, 0.75, 0);
  // bucket + mop
  p.cyl(M.safetyYellow, 0.16, 0.3, -0.55, 0, 0.05, { seg: 10, r1: 0.13 });
  p.cyl(M.alu, 0.012, 1.3, -0.6, 0.02, -0.06, { rz: 0.15 });
  p.sphere(M.paper, 0.09, -0.68, 0.1, -0.02, { sy: 0.6 });
  p.col('plastic', 1.3, 1.0, 0.6, -0.15, 0, 0);
  return p.proto('janitor.cart');
}
