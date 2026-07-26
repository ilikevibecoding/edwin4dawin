import * as THREE from 'three';
import type { HumanoidSkin } from './humanoid';
import { makeCanvas, toTexture } from '../../textures/gen';
import { hash2 } from '../../../core/rng';
import { registerAsset } from '../../registry';
import { bevelBoxGeo } from '../../../world/kit/geo';

/**
 * Character skins (Fable 4): Kestrel Cell hostiles (3 outfits × 4 heads) and
 * Norrsken civilian hostages (2 variants). Original, non-branded designs.
 */

registerAsset({
  id: 'char.kestrel',
  name: 'Kestrel Cell hostile (3 outfit variants, 4 head variants)',
  category: 'character',
  agent: 'Fable 4',
  files: 'src/assets/models/characters/skins.ts, humanoid.ts',
  where: 'patrols all rooms',
  dims: 'h 1.78–1.86 m',
  pivot: 'feet center',
  materials: 'fabric (camo/olive/charcoal), armor plate, rubber, metal',
  textures: 'procedural camo + fabric weave',
  collision: 'hit volumes: head sphere + body capsule',
  lod: 'shared-geometry',
  anim: 'idle/walk/run/aim/fire/flinch/search/crouch/death',
  audio: 'voice barks (radio)',
  status: 'integrated',
  accept: 'readable silhouette at 25 m; layered gear; no joint gaps; insignia original',
});

registerAsset({
  id: 'char.hostage',
  name: 'Norrsken civilian hostage (2 variants)',
  category: 'character',
  agent: 'Fable 4',
  files: 'src/assets/models/characters/skins.ts, humanoid.ts',
  where: 'server room, conference room',
  dims: 'h 1.68–1.76 m',
  pivot: 'feet center',
  materials: 'office fabric, skin, hair',
  textures: 'procedural fabric',
  collision: 'hit volumes: head sphere + body capsule',
  lod: 'shared-geometry',
  anim: 'kneel/fear/follow/idle/crouch/death',
  audio: 'voice (relief/fear)',
  status: 'integrated',
  accept: 'clearly non-combatant silhouette; readable at distance; follows without clipping',
});

function fabricTex(base: [number, number, number], salt: number): THREE.Texture {
  const S = 128;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const v = (hash2(i, salt) - 0.5) * 26;
    ctx.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v},0.5)`;
    ctx.fillRect(hash2(i, salt + 1) * S, hash2(i, salt + 2) * S, 2, 2);
  }
  return toTexture(canvas);
}

function camoTex(c0: [number, number, number], c1: [number, number, number], c2: [number, number, number], salt: number): THREE.Texture {
  const S = 128;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = `rgb(${c0[0]},${c0[1]},${c0[2]})`;
  ctx.fillRect(0, 0, S, S);
  for (const [c, n] of [[c1, 26], [c2, 18]] as const) {
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    for (let i = 0; i < n; i++) {
      const x = hash2(i, salt) * S, y = hash2(i, salt + 3) * S;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const r = 6 + hash2(i, salt + k) * 16;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.7;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  return toTexture(canvas);
}

export interface OutfitSpec {
  id: string;
  clothTex: THREE.Texture;
  clothColor: number;
  vestColor: number;
  pantColor: number;
  headKind: 0 | 1 | 2 | 3; // balaclava / beanie / helmet / hood
  skinTone: number;
  height: number;
}

const SKIN_TONES = [0xc79a76, 0x8a5f43, 0xe0b48e, 0x6e4a33];

export function kestrelOutfits(): OutfitSpec[] {
  return [
    {
      id: 'kestrel-charcoal',
      clothTex: fabricTex([56, 60, 66], 301), clothColor: 0xffffff,
      vestColor: 0x2e3338, pantColor: 0x3a3f45, headKind: 0, skinTone: SKIN_TONES[0], height: 1.82,
    },
    {
      id: 'kestrel-olive',
      clothTex: fabricTex([84, 88, 64], 302), clothColor: 0xffffff,
      vestColor: 0x3c4034, pantColor: 0x565a44, headKind: 1, skinTone: SKIN_TONES[1], height: 1.78,
    },
    {
      id: 'kestrel-snow',
      clothTex: camoTex([196, 202, 208], [150, 158, 166], [96, 104, 112], 303), clothColor: 0xffffff,
      vestColor: 0x4a5058, pantColor: 0x9aa2a8, headKind: 2, skinTone: SKIN_TONES[2], height: 1.86,
    },
  ];
}

let civilianCounter = 0;
export function civilianOutfits(): OutfitSpec[] {
  return [
    {
      id: 'civ-analyst',
      clothTex: fabricTex([116, 142, 164], 401), clothColor: 0xffffff,
      vestColor: 0x8494a2, pantColor: 0x3c4148, headKind: 3, skinTone: SKIN_TONES[0], height: 1.74,
    },
    {
      id: 'civ-engineer',
      clothTex: fabricTex([150, 118, 96], 402), clothColor: 0xffffff,
      vestColor: 0xa8562e, pantColor: 0x2e3644, headKind: 3, skinTone: SKIN_TONES[3], height: 1.69,
    },
  ];
}

export function buildSkin(outfit: OutfitSpec, headVariant: number, isHostile: boolean): HumanoidSkin {
  const H = outfit.height;
  const cloth = new THREE.MeshStandardMaterial({ map: outfit.clothTex, color: outfit.clothColor, roughness: 0.92 });
  const pants = new THREE.MeshStandardMaterial({ color: outfit.pantColor, roughness: 0.95 });
  const vest = new THREE.MeshStandardMaterial({ color: outfit.vestColor, roughness: 0.75 });
  const skin = new THREE.MeshStandardMaterial({ color: outfit.skinTone, roughness: 0.62 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1d2124, roughness: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x5b636b, roughness: 0.4, metalness: 0.7 });

  const grp = (...objs: THREE.Object3D[]): THREE.Group => {
    const g = new THREE.Group();
    g.add(...objs);
    return g;
  };
  const bx = (mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0, bevel = 0.015): THREE.Mesh => {
    const m = new THREE.Mesh(bevelBoxGeo(w, h, d, Math.min(bevel, w / 3.2, h / 3.2, d / 3.2)), mat);
    m.position.set(x, y, z);
    return m;
  };
  const cap = (mat: THREE.Material, r: number, len: number, x = 0, y = 0, z = 0): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 10), mat);
    m.position.set(x, y, z);
    return m;
  };

  return {
    height: H,
    pelvis: () => grp(
      bx(pants, H * 0.2, H * 0.1, H * 0.13, 0, H * 0.01),
      // belt
      bx(rubber, H * 0.205, H * 0.028, H * 0.135, 0, H * 0.055),
      ...(isHostile ? [bx(vest, 0.07, 0.1, 0.05, H * 0.08, 0.02, H * 0.075, 0.01)] : []), // hip pouch
    ),
    torso: () => {
      const parts: THREE.Object3D[] = [
        cap(cloth, H * 0.1, H * 0.14, 0, H * 0.13),
      ];
      if (isHostile) {
        parts.push(
          bx(vest, H * 0.185, H * 0.18, H * 0.135, 0, H * 0.14),                 // plate carrier
          bx(vest, 0.055, 0.075, 0.03, -0.045, H * 0.16, H * 0.075, 0.01),       // chest pouches
          bx(vest, 0.055, 0.075, 0.03, 0.045, H * 0.16, H * 0.075, 0.01),
          bx(metal, 0.03, 0.05, 0.02, 0.09, H * 0.21, H * 0.06, 0.006),          // radio
          // original Kestrel chevron patch
          bx(new THREE.MeshStandardMaterial({ color: 0x8a2f22, roughness: 0.8 }), 0.045, 0.03, 0.004, -0.078, H * 0.22, H * 0.072, 0.004),
        );
      } else {
        // office lanyard
        parts.push(bx(new THREE.MeshStandardMaterial({ color: 0x2e7d84, roughness: 0.7 }), 0.02, H * 0.12, 0.006, 0.02, H * 0.16, H * 0.1, 0.003));
        parts.push(bx(new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.5 }), 0.05, 0.065, 0.004, 0.02, H * 0.1, H * 0.1, 0.003));
      }
      return grp(...parts);
    },
    head: () => {
      const parts: THREE.Object3D[] = [];
      const headR = H * 0.062;
      if (outfit.headKind === 2) {
        // helmet
        parts.push(cap(skin, headR * 0.92, headR * 0.6, 0, headR * 0.9));
        const helm = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), vest);
        helm.position.y = headR * 1.15;
        parts.push(helm);
        parts.push(bx(rubber, headR * 1.6, 0.02, 0.02, 0, headR * 0.95, headR * 0.9, 0.006)); // goggle strap
      } else if (outfit.headKind === 0) {
        // balaclava
        parts.push(cap(rubber, headR, headR * 0.75, 0, headR));
        parts.push(bx(skin, headR * 1.1, headR * 0.5, 0.015, 0, headR * 1.15, headR * 0.85, 0.008)); // eye slot
      } else if (outfit.headKind === 1) {
        // beanie
        parts.push(cap(skin, headR * 0.95, headR * 0.65, 0, headR * 0.9));
        const beanie = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), pants);
        beanie.position.y = headR * 1.35;
        parts.push(beanie);
      } else {
        // bare head with hair
        parts.push(cap(skin, headR * 0.95, headR * 0.7, 0, headR * 0.9));
        const hairColors = [0x2d2118, 0x584434, 0x1c1c20, 0x6e5a3c];
        const hair = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: hairColors[(headVariant + civilianCounter++) % 4], roughness: 0.95 }));
        hair.position.y = headR * 1.28;
        parts.push(hair);
      }
      // head variant accents for hostiles
      if (isHostile && headVariant % 2 === 1) {
        parts.push(bx(rubber, 0.028, 0.02, 0.05, headR * 0.8, headR * 1.1, 0, 0.006)); // headset
      }
      return grp(...parts);
    },
    upperArmL: () => grp(cap(cloth, H * 0.036, H * 0.11, 0, -H * 0.075)),
    upperArmR: () => grp(
      cap(cloth, H * 0.036, H * 0.11, 0, -H * 0.075),
      ...(isHostile ? [bx(vest, 0.055, 0.05, 0.055, 0, -H * 0.05, 0, 0.012)] : []), // shoulder pad
    ),
    foreArmL: () => grp(cap(cloth, H * 0.03, H * 0.1, 0, -H * 0.07), cap(skin, H * 0.026, H * 0.03, 0, -H * 0.145)),
    foreArmR: () => grp(cap(cloth, H * 0.03, H * 0.1, 0, -H * 0.07), cap(skin, H * 0.026, H * 0.03, 0, -H * 0.145)),
    thighL: () => grp(cap(pants, H * 0.05, H * 0.13, 0, -H * 0.1)),
    thighR: () => grp(
      cap(pants, H * 0.05, H * 0.13, 0, -H * 0.1),
      ...(isHostile ? [bx(vest, 0.07, 0.09, 0.045, H * 0.01, -H * 0.1, H * 0.045, 0.012)] : []), // thigh rig
    ),
    calfL: () => grp(
      cap(pants, H * 0.04, H * 0.12, 0, -H * 0.09),
      bx(rubber, H * 0.055, H * 0.045, H * 0.1, 0, -H * 0.225, H * 0.02, 0.012), // boot
    ),
    calfR: () => grp(
      cap(pants, H * 0.04, H * 0.12, 0, -H * 0.09),
      bx(rubber, H * 0.055, H * 0.045, H * 0.1, 0, -H * 0.225, H * 0.02, 0.012),
    ),
    handItem: () => null,
  };
}
