import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeCanvas, toTexture } from '../assets/textures/gen';
import { hash2 } from '../core/rng';
import { registerAsset } from '../assets/registry';
import { paperTex } from '../assets/textures/signage';

registerAsset({
  id: 'decal.suite',
  name: 'Environmental decal suite (wear, scuffs, stains, tracks, papers, cables, ceiling damage)',
  category: 'decal',
  agent: 'Fable 3',
  files: 'src/world/decals.ts',
  where: 'all rooms per storytelling plan',
  dims: '0.3–3 m patches',
  materials: 'alpha-blended overlays, polygon-offset',
  textures: 'procedural',
  collision: 'none',
  lod: 'merged per texture',
  status: 'integrated',
  accept: 'no z-fighting/flicker; no conspicuous repetition; grounded storytelling',
});

type DecalKind = 'grime' | 'scuff' | 'wear' | 'stain' | 'footprints' | 'cable' | 'ceilstain' | 'paper0' | 'paper1' | 'paper2' | 'paper3' | 'blood';

function grimeTex(): THREE.Texture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const x = hash2(i, 51) * S;
    const y = hash2(i, 52) * S;
    const cx = S / 2, cy = S / 2;
    const d = Math.hypot(x - cx, y - cy) / (S / 2);
    if (d > 1) continue;
    ctx.fillStyle = `rgba(30,28,24,${(1 - d) * 0.28 * hash2(i, 53)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + hash2(i, 54) * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, { repeat: false });
}

function scuffTex(): THREE.Texture {
  // dense low wall scuffing: soft dark smudges + short marks, heaviest at the bottom
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) {
    const yFrac = Math.pow(hash2(i, 60), 0.45); // bias toward bottom
    const y = S * (0.35 + yFrac * 0.6);
    const x = 20 + hash2(i, 64) * (S - 40);
    const w = 8 + hash2(i, 66) * 34;
    const fade = 1 - Math.abs(x - S / 2) / (S / 2);
    ctx.strokeStyle = `rgba(46,44,40,${(0.05 + hash2(i, 61) * 0.12) * fade})`;
    ctx.lineWidth = 2 + hash2(i, 62) * 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + (hash2(i, 65) - 0.5) * 8, x + w / 2, y + (hash2(i, 67) - 0.5) * 6);
    ctx.stroke();
  }
  // soft overall smudge near base
  const g = ctx.createLinearGradient(0, S * 0.5, 0, S);
  g.addColorStop(0, 'rgba(50,48,44,0)');
  g.addColorStop(1, 'rgba(50,48,44,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(10, S * 0.5, S - 20, S * 0.5);
  return toTexture(canvas, { repeat: false });
}

function wearTex(): THREE.Texture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(228,224,214,0.34)');
  g.addColorStop(0.6, 'rgba(228,224,214,0.18)');
  g.addColorStop(1, 'rgba(228,224,214,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(S / 2, S / 2, S * 0.48, S * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas, { repeat: false });
}

function stainTex(): THREE.Texture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  for (let ring = 0; ring < 3; ring++) {
    const r = 40 + ring * 30 + hash2(ring, 71) * 18;
    ctx.strokeStyle = `rgba(96,84,60,${0.22 - ring * 0.05})`;
    ctx.lineWidth = 3 + hash2(ring, 72) * 4;
    ctx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const rr = r * (0.92 + hash2(a, ring) * 0.16);
      const x = S / 2 + Math.cos(ang) * rr;
      const y = S / 2 + Math.sin(ang) * rr * 0.85;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(110,96,68,${0.1 - ring * 0.025})`;
    ctx.fill();
  }
  return toTexture(canvas, { repeat: false });
}

function footprintsTex(): THREE.Texture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  // alternating wet boot prints walking "up" the texture
  for (let step = 0; step < 6; step++) {
    const side = step % 2 === 0 ? -1 : 1;
    const x = S / 2 + side * 26;
    const y = S - 30 - step * 38;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((hash2(step, 81) - 0.5) * 0.25);
    ctx.fillStyle = `rgba(40,48,58,${0.4 - step * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(0, -8, 9, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 12, 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // tread
    ctx.fillStyle = `rgba(220,230,240,${0.16 - step * 0.02})`;
    for (let t = 0; t < 3; t++) ctx.fillRect(-6, -14 + t * 6, 12, 2);
    ctx.restore();
  }
  return toTexture(canvas, { repeat: false });
}

function cableTex(): THREE.Texture {
  // cables run along V (the long axis of cable decal strips)
  const { canvas, ctx } = makeCanvas(64, 256);
  ctx.clearRect(0, 0, 64, 256);
  for (const [x, c, w] of [[22, 'rgba(20,22,26,0.9)', 5], [34, 'rgba(46,90,96,0.85)', 3.5], [42, 'rgba(20,22,26,0.8)', 4]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= 256; y += 16) {
      ctx.lineTo(x + Math.sin(y * 0.08 + x) * 3, y);
    }
    ctx.stroke();
  }
  // gaffer tape crossings
  ctx.fillStyle = 'rgba(120,120,116,0.85)';
  ctx.fillRect(12, 60, 40, 18);
  ctx.fillRect(12, 170, 40, 18);
  return toTexture(canvas, { repeat: false });
}

function ceilStainTex(): THREE.Texture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S * 0.4);
  g.addColorStop(0, 'rgba(140,116,76,0.5)');
  g.addColorStop(0.5, 'rgba(150,130,92,0.28)');
  g.addColorStop(1, 'rgba(150,130,92,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(120,98,62,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.3, 0.3, Math.PI * 1.6);
  ctx.stroke();
  return toTexture(canvas, { repeat: false });
}

function bloodTex(): THREE.Texture {
  const S = 128;
  const { canvas, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) {
    const d = hash2(i, 95);
    ctx.fillStyle = `rgba(96,20,14,${0.5 - d * 0.3})`;
    ctx.beginPath();
    ctx.arc(S / 2 + (hash2(i, 96) - 0.5) * S * 0.7 * d, S / 2 + (hash2(i, 97) - 0.5) * S * 0.7 * d, 2 + hash2(i, 98) * 9 * (1 - d), 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, { repeat: false });
}

const texMakers: Record<DecalKind, () => THREE.Texture> = {
  grime: grimeTex, scuff: scuffTex, wear: wearTex, stain: stainTex,
  footprints: footprintsTex, cable: cableTex, ceilstain: ceilStainTex,
  paper0: () => paperTex(0), paper1: () => paperTex(1), paper2: () => paperTex(2), paper3: () => paperTex(3),
  blood: bloodTex,
};

interface DecalSpec {
  kind: DecalKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rot?: number;
  /** 'floor' | 'ceil' | wall normal axis */
  face?: 'floor' | 'ceil' | '+x' | '-x' | '+z' | '-z';
  opacity?: number;
}

export function buildDecals(parent: THREE.Group): void {
  const specs: DecalSpec[] = [];
  const A = (kind: DecalKind, x: number, y: number, z: number, w: number, h: number, rot = 0, face: DecalSpec['face'] = 'floor', opacity = 1): void => {
    specs.push({ kind, x, y, z, w, h, rot, face, opacity });
  };

  // --- entrance & vestibule: snow tracks + wet grime ---
  A('footprints', 9, 0.008, 8.2, 1.6, 3.2, 0.05);
  A('footprints', 9.4, 0.008, 11.6, 1.5, 3, -0.2, 'floor', 0.7);
  A('grime', 9, 0.006, 10.2, 2.6, 2.2, 0.4, 'floor', 0.8);
  A('wear', 9, 0.007, 12.5, 2.2, 1.6, 0, 'floor', 0.6);
  // --- lobby: entry wear路径 + scuffs at reception ---
  A('footprints', 13.3, 0.008, 11.5, 1.4, 2.8, 1.45, 'floor', 0.5);
  A('wear', 16, 0.007, 12, 4, 2.6, 0.5, 'floor', 0.7);
  A('wear', 19, 0.007, 17, 3, 2, 0, 'floor', 0.8);
  A('grime', 25, 0.006, 7, 2.4, 2, 1, 'floor', 0.6);
  A('scuff', 21.5, 0.12, 17.895, 2.2, 0.9, 0, '-z', 0.55);
  // --- main hall: heavy traffic wear path + scuffs ---
  A('wear', 18, 0.007, 19.5, 5, 2.2, 0, 'floor', 0.9);
  A('wear', 28, 0.007, 19.5, 6, 2.2, 0, 'floor', 0.75);
  A('wear', 40, 0.007, 19.5, 6, 2.2, 0, 'floor', 0.85);
  A('scuff', 26, 0.1, 18.12, 1.8, 0.85, 0, '+z', 0.6);
  A('scuff', 36.5, 0.1, 20.895, 2.0, 0.85, 0, '-z', 0.55);
  A('grime', 47, 0.006, 19.8, 2.2, 1.8, 0.7, 'floor', 0.7);
  // --- cubicles: wear at entries + coffee stain + papers (Kestrel searched desks) ---
  A('wear', 26, 0.007, 22, 3, 1.8, 0, 'floor', 0.7);
  A('wear', 28, 0.007, 29.5, 8, 2.4, 0, 'floor', 0.5);
  A('stain', 24.6, 0.007, 26.8, 0.5, 0.5, 0.3, 'floor', 0.8);
  A('paper0', 24.5, 0.008, 24.9, 0.22, 0.3, 0.4);
  A('paper1', 24.9, 0.0085, 25.2, 0.22, 0.3, -1.1);
  A('paper2', 30.6, 0.008, 26.3, 0.22, 0.3, 2.3);
  A('paper0', 31.2, 0.0085, 26.7, 0.22, 0.3, 0.9);
  A('paper3', 27.5, 0.008, 33.8, 0.22, 0.3, -0.5);
  A('paper1', 27.9, 0.0085, 34.3, 0.22, 0.3, 1.8);
  A('paper2', 21.5, 0.008, 27.3, 0.22, 0.3, -2.2);
  // --- break room: floor grime near bins + counter stain ---
  A('grime', 13.2, 0.006, 31.8, 1.8, 1.6, 0.2, 'floor', 0.8);
  A('stain', 16.9, 0.007, 30.2, 0.4, 0.4, 1.2, 'floor', 0.9);
  A('scuff', 19.3, 0.1, 27.5, 1.5, 0.8, 0, '-x', 0.5);
  // --- copy room: toner grime + papers ---
  A('grime', 37.6, 0.006, 23.4, 1.6, 1.4, 0.5, 'floor', 0.9);
  A('paper0', 37.9, 0.008, 24.5, 0.22, 0.3, 0.7);
  A('paper2', 38.4, 0.0085, 24.1, 0.22, 0.3, -0.9);
  A('paper1', 37.2, 0.008, 25.4, 0.22, 0.3, 2.8);
  // --- service corridor & mech: heavy grime, cable runs, stains ---
  A('grime', 51, 0.006, 19, 2.2, 2.4, 0, 'floor', 1);
  A('grime', 51, 0.006, 25, 2.2, 3, 0.8, 'floor', 0.9);
  A('cable', 50.2, 0.009, 23, 0.5, 6, Math.PI / 2, 'floor', 0.9);
  A('stain', 52.5, 0.007, 28.5, 0.9, 0.9, 0, 'floor', 0.8);
  A('grime', 52, 0.006, 34, 2.6, 3, 0.4, 'floor', 1);
  A('cable', 52.9, 0.009, 32.4, 0.4, 3.4, Math.PI / 2, 'floor', 0.85);
  A('scuff', 53.895, 0.12, 24, 2.2, 0.95, 0, '-x', 0.7);
  // --- loading & garage: tire wear, oil stains, scuffs ---
  A('grime', 44, 0.006, 24.5, 2.8, 2.4, 0.3, 'floor', 0.8);
  A('stain', 40.5, 0.007, 32.6, 1.6, 1.4, 0.4, 'floor', 0.9);
  A('stain', 43.8, 0.007, 35.2, 1.1, 1, 2.1, 'floor', 0.7);
  A('wear', 43, 0.008, 33.9, 2.2, 6.5, 0, 'floor', 0.55);
  A('scuff', 47.9, 0.1, 27, 1.9, 0.85, 0, '-x', 0.6);
  A('footprints', 42.5, 0.009, 31.5, 1.4, 2.8, 0.3, 'floor', 0.4);
  // --- server & IT: cable runs ---
  A('cable', 44.5, 0.009, 13.8, 0.5, 3.6, 0, 'floor', 0.9);
  A('grime', 47, 0.006, 16.5, 1.6, 1.4, 0.9, 'floor', 0.6);
  A('cable', 50.5, 0.009, 8.4, 0.4, 2.8, Math.PI / 2, 'floor', 0.8);
  // --- restrooms: damp grime ---
  A('grime', 33.4, 0.006, 13.4, 1.2, 1.2, 0.4, 'floor', 0.5);
  A('grime', 38.6, 0.006, 13.4, 1.2, 1.2, 1.1, 'floor', 0.5);
  // --- stairwell: step wear + scuffs ---
  A('wear', 29, 0.007, 16.8, 2.2, 1.4, 0, 'floor', 0.8);
  A('scuff', 26.65, 0.12, 14, 2.0, 0.9, 0, '+x', 0.6);
  A('grime', 29, 3.32 + 0.007, 11, 2, 1.4, 0.4, 'floor', 0.6);
  // --- upper floor ---
  A('wear', 29, 3.607, 8, 4, 1.8, 0, 'floor', 0.6);
  A('wear', 38, 3.607, 8, 4, 1.8, 0, 'floor', 0.5);
  A('wear', 19, 3.607, 8, 3.4, 1.8, 0, 'floor', 0.55);
  A('paper3', 38.5, 3.608, 13.2, 0.22, 0.3, 1.3);
  A('paper0', 39.1, 3.6085, 13.6, 0.22, 0.3, -0.4);
  A('paper1', 8.4, 3.608, 12.5, 0.22, 0.3, 0.8);
  A('grime', 8, 3.606, 18.5, 1.8, 1.6, 0.2, 'floor', 0.6);
  A('stain', 33.2, 3.607, 11.4, 0.4, 0.4, 0.6, 'floor', 0.8);
  // --- ceiling stains + leak rings (offices) ---
  A('ceilstain', 34, 2.693, 16.5, 1.2, 1.2, 0.4, 'ceil');
  A('ceilstain', 22.5, 2.893, 35.5, 1.4, 1.4, 1.5, 'ceil');
  A('ceilstain', 16.5, 2.693, 27, 1.1, 1.1, 0.2, 'ceil');
  A('ceilstain', 44, 2.693, 19, 1.2, 1.2, 2.4, 'ceil');
  A('stain', 22.5, 0.007, 35.5, 0.9, 0.9, 0.3, 'floor', 0.55); // drip below leak

  // build merged meshes per texture kind
  const byKind = new Map<DecalKind, THREE.BufferGeometry[]>();
  for (const s of specs) {
    const geo = new THREE.PlaneGeometry(s.w, s.h);
    const m4 = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    switch (s.face ?? 'floor') {
      case 'floor':
        rot.makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(s.rot ?? 0));
        break;
      case 'ceil':
        rot.makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(s.rot ?? 0));
        break;
      case '+x':
        rot.makeRotationY(Math.PI / 2);
        break;
      case '-x':
        rot.makeRotationY(-Math.PI / 2);
        break;
      case '+z':
        rot.identity();
        break;
      case '-z':
        rot.makeRotationY(Math.PI);
        break;
    }
    m4.copy(rot).setPosition(s.x, s.y, s.z);
    geo.applyMatrix4(m4);
    // encode opacity into vertex alpha via color attribute? keep per-kind opacity, vary by 4 kinds
    let list = byKind.get(s.kind);
    if (!list) {
      list = [];
      byKind.set(s.kind, list);
    }
    geo.userData = {};
    list.push(geo);
  }
  for (const [kind, geos] of byKind) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mat = new THREE.MeshStandardMaterial({
      map: texMakers[kind](),
      transparent: true,
      depthWrite: false,
      roughness: 0.9,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      name: `decal-${kind}`,
    });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.renderOrder = 4;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.name = `decals:${kind}`;
    parent.add(mesh);
  }
}
