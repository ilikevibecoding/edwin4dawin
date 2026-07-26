import { P, type PropProto, boxGeo } from './kit';
import { M, screenMat } from './mats';
import { registerAsset } from '../../registry';
import { norrskenLogo, deptSign } from '../../textures/signage';
import * as THREE from 'three';

/** Lobby, vestibule & security furniture (Fable 3 / Fable 1 brand). */

function reg(id: string, name: string, dims: string, where = 'lobby'): void {
  registerAsset({
    id: `prop.${id}`, name, category: 'furniture', agent: 'Fable 3',
    files: 'src/assets/models/props/lobbyset.ts', where,
    dims, materials: 'walnut/stone/steel/brand teal', collision: 'static-aabb', lod: 'merged-static',
    status: 'integrated', accept: 'hero-quality read; brand accents per visual bible',
  });
}

export function receptionDesk(): PropProto {
  reg('reception.desk', 'Reception desk', '3.4×1.1×1.12');
  const p = new P();
  // stone front with reveal + wood work surface behind
  p.box(M.walnut, 3.4, 1.06, 0.5, 0, 0, 0.28, { bevel: 0.02 });
  p.geo(new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.3, name: 'stone-front' }),
    boxGeo(3.42, 0.9, 0.06).clone().translate(0, 0.55, 0.56));
  p.box(M.laminateDark, 3.44, 0.06, 0.6, 0, 1.06, 0.28, { bevel: 0.015 });
  p.box(M.birch(), 3.0, 0.035, 0.6, 0, 0.72, -0.25, { bevel: 0.01 });
  // under-counter warm strip
  p.box(M.lampWarm, 3.3, 0.02, 0.02, 0, 0.96, 0.545);
  // logo puck on front
  p.geo(new THREE.MeshStandardMaterial({ map: norrskenLogo(256), transparent: true, roughness: 0.5, name: 'logo-puck' }),
    boxGeo(0.5, 0.5, 0.01).clone().translate(0, 0.5, 0.6));
  // monitor + phone + clutter on work surface
  p.box(M.plasticBlack, 0.5, 0.3, 0.03, -0.8, 0.9, -0.2, { bevel: 0.006, ry: 0.3 });
  p.geo(screenMat('logo'), boxGeo(0.46, 0.26, 0.012).clone().rotateY(0.3).translate(-0.8, 1.05, -0.185));
  p.box(M.plasticBlack, 0.4, 0.016, 0.13, -0.75, 0.735, 0.0, { bevel: 0.006, ry: 0.2 });
  p.box(M.plasticDark, 0.18, 0.045, 0.16, 0.4, 0.735, -0.1, { bevel: 0.008 });
  p.box(M.paper, 0.24, 0.03, 0.3, 0.85, 0.735, -0.15, { ry: -0.2 });
  p.cyl(M.tealAccent, 0.04, 0.1, 1.2, 0.735, -0.05, { seg: 10 });
  p.col('wood', 3.4, 1.12, 1.1, 0, 0, 0.05);
  return p.proto('reception.desk');
}

export function badgeGate(): PropProto {
  reg('vestibule.gate', 'Badge gate (speed-stile)', '0.24×1.0×1.0', 'vestibule');
  const p = new P();
  p.box(M.stainless, 0.22, 1.0, 1.0, 0, 0, 0, { bevel: 0.03 });
  p.box(M.plasticBlack, 0.24, 0.06, 0.3, 0, 0.94, 0.3, { bevel: 0.012 });
  p.box(M.ledGreen, 0.05, 0.012, 0.1, 0, 1.0, 0.3);
  p.geo(M.glassTint, boxGeo(0.015, 0.5, 0.55).clone().translate(0.12, 0.5, -0.1));
  p.col('metal', 0.24, 1.05, 1.0, 0, 0, 0);
  return p.proto('vestibule.gate');
}

export function wetFloorMat(): PropProto {
  reg('vestibule.mat', 'Entrance walk-off mat', '2.0×1.2×0.02', 'vestibule');
  const p = new P();
  p.box(M.rubber, 2.0, 0.02, 1.2, 0, 0, 0, { bevel: 0.008 });
  p.box(new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1, name: 'mat-fiber' }), 1.9, 0.012, 1.1, 0, 0.012, 0);
  return p.proto('vestibule.mat');
}

export function deptSignProp(text: string, sub = ''): PropProto {
  registerAsset({
    id: `prop.sign.${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: `Department sign — ${text}`, category: 'signage', agent: 'Fable 1',
    files: 'src/assets/models/props/lobbyset.ts', where: 'doors/corridors',
    dims: '0.5×0.13', materials: 'printed plate', collision: 'none', lod: 'merged-static',
    status: 'integrated', accept: 'legible at 3 m',
  });
  const p = new P();
  p.geo(new THREE.MeshStandardMaterial({ map: deptSign(text, sub), roughness: 0.5, name: `sign-${text}` }),
    boxGeo(0.5, 0.125, 0.012).clone().translate(0, 0, 0));
  return p.proto(`sign.${text}`);
}

export function magazineRack(): PropProto {
  reg('waiting.magrack', 'Brochure rack', '0.6×0.25×1.2', 'waiting');
  const p = new P();
  p.box(M.steelDark, 0.6, 1.2, 0.06, 0, 0, -0.06, { bevel: 0.01 });
  for (let s = 0; s < 3; s++) {
    p.box(M.alu, 0.56, 0.03, 0.12, 0, 0.24 + s * 0.32, 0.02);
    for (let i = 0; i < 3; i++) {
      const c = [M.tealAccent, M.plasticWhite, M.safetyYellow][((i + s) % 3)];
      p.box(c, 0.14, 0.2, 0.01, -0.18 + i * 0.18, 0.26 + s * 0.32, 0.02, { rx: -0.15 });
    }
  }
  p.col('metal', 0.6, 1.2, 0.2, 0, 0, 0);
  return p.proto('waiting.magrack');
}

export function flagStand(): PropProto {
  reg('lobby.flag', 'Norrsken standing banner', '0.6×0.4×2.0');
  const p = new P();
  p.cyl(M.steelDark, 0.18, 0.02, 0, 0, 0, { seg: 12 });
  p.cyl(M.steelDark, 0.015, 1.95, 0, 0.02, 0);
  p.geo(new THREE.MeshStandardMaterial({ color: 0x24444b, roughness: 0.85, name: 'banner-teal' }),
    boxGeo(0.55, 1.5, 0.01).clone().translate(0.0, 1.15, 0.04));
  p.geo(new THREE.MeshStandardMaterial({ map: norrskenLogo(256), transparent: true, roughness: 0.8, name: 'banner-logo' }),
    boxGeo(0.4, 0.4, 0.005).clone().translate(0, 1.5, 0.052));
  p.col('metal', 0.4, 2.0, 0.4, 0, 0, 0);
  return p.proto('lobby.flag');
}
