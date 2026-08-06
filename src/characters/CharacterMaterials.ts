/**
 * Materials for characters: skin with a cheap but convincing subsurface term,
 * eyes, hair and clothing.
 *
 * The subsurface approximation is driven by an explicit key-light direction
 * rather than three's light loop, which keeps the shader patch small: back-lit
 * thin areas glow warm, and the diffuse terminator is wrapped so faces never go
 * abruptly black.
 */
import * as THREE from 'three';
import { buildSurface, fabric, hairStrands, skinSurface, surfaceMaterial } from '../engine/Textures';
import { fbm2D } from '../engine/Noise';

export interface SkinMaterialOptions {
  tone: [number, number, number];
  android?: boolean;
  roughness?: number;
  subsurfaceColor?: THREE.ColorRepresentation;
  subsurfaceStrength?: number;
  textureRepeat?: number;
  textureSize?: number;
}

const skinRegistry: { uniforms: Record<string, THREE.IUniform> }[] = [];

export function makeSkinMaterial(opts: SkinMaterialOptions): THREE.MeshPhysicalMaterial {
  const size = opts.textureSize ?? 512;
  const key = `skin_${opts.tone.join('_')}_${opts.android ? 'a' : 'h'}_${size}`;
  const maps = buildSurface(key, skinSurface(opts.tone, opts.android), {
    size,
    // Pores must stay shallow or the face reads as orange peel
    normalStrength: opts.android ? 0.4 : 0.8,
    repeat: opts.textureRepeat ?? 1,
  });

  const mat = surfaceMaterial(maps, {
    roughness: opts.roughness ?? (opts.android ? 0.92 : 1),
    metalness: 0,
    clearcoat: opts.android ? 0.1 : 0.06,
    clearcoatRoughness: opts.android ? 0.32 : 0.45,
    sheen: 0.08,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0xffd8cf),
    normalScale: new THREE.Vector2(0.3, 0.3),
  });
  mat.name = key;
  // The ORM map's AO channel is far too strong for skin pores
  mat.aoMapIntensity = 0.35;

  const uniforms: Record<string, THREE.IUniform> = {
    uKeyDir: { value: new THREE.Vector3(0, 0.3, 1).normalize() },
    uKeyColor: { value: new THREE.Color(1, 0.95, 0.9) },
    uSSSColor: { value: new THREE.Color(opts.subsurfaceColor ?? 0xd8564a) },
    uSSSStrength: { value: opts.subsurfaceStrength ?? (opts.android ? 0.35 : 0.75) },
    uWrap: { value: 0.42 },
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uKeyDir;
        uniform vec3 uKeyColor;
        uniform vec3 uSSSColor;
        uniform float uSSSStrength;
        uniform float uWrap;`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 L = normalize(uKeyDir);
          vec3 V = normalize(vViewPosition);
          // Light travelling through the surface toward the eye
          float back = pow(clamp(dot(-V, -L), 0.0, 1.0), 3.0);
          // Wrapped diffuse keeps the terminator soft and fleshy
          float wrapD = clamp((dot(normal, L) + uWrap) / (1.0 + uWrap), 0.0, 1.0);
          float shadowed = 1.0 - clamp(dot(normal, L), 0.0, 1.0);
          reflectedLight.indirectDiffuse +=
            uSSSColor * uKeyColor * uSSSStrength * (back * 0.55 + wrapD * shadowed * 0.5) * diffuseColor.rgb;
        }`
      );
  };
  mat.customProgramCacheKey = () => key;
  skinRegistry.push({ uniforms });
  return mat;
}

/** Updates the key-light direction on every skin material at once. */
export function updateSkinKeyLight(directionWorld: THREE.Vector3, color: THREE.Color, camera: THREE.Camera) {
  // `normal` and `vViewPosition` are in view space, so the direction must be too
  const v = directionWorld.clone().normalize().transformDirection(camera.matrixWorldInverse);
  for (const entry of skinRegistry) {
    (entry.uniforms.uKeyDir.value as THREE.Vector3).copy(v);
    (entry.uniforms.uKeyColor.value as THREE.Color).copy(color);
  }
}

// ---------------------------------------------------------------------------
// Eyes
// ---------------------------------------------------------------------------

/**
 * Equirectangular eyeball texture with the iris at the centre, so the sphere can
 * simply be rotated to aim the gaze. A real iris subtends about 30 degrees of
 * the globe, which is 1/6 of the 180-degree vertical span.
 */
export function eyeballTexture(irisColor: [number, number, number], size = 1024): THREE.Texture {
  const w = size;
  const h = size / 2;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;

  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#cfc8c4');
  base.addColorStop(0.42, '#f4efeb');
  base.addColorStop(1, '#ded6d1');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  // Capillaries
  g.lineCap = 'round';
  for (let i = 0; i < 200; i++) {
    const a = (i / 200) * Math.PI * 2 + Math.sin(i * 3.7) * 0.4;
    let px = w * 0.5 + Math.cos(a) * w * (0.14 + (i % 7) * 0.018);
    let py = h * 0.5 + Math.sin(a) * h * (0.2 + (i % 5) * 0.03);
    g.strokeStyle = `rgba(${170 + (i % 30)},${40 + (i % 20)},${38 + (i % 16)},${0.05 + (i % 4) * 0.02})`;
    g.lineWidth = 0.7 + (i % 3) * 0.5;
    g.beginPath();
    g.moveTo(px, py);
    for (let s = 0; s < 4; s++) {
      px += Math.cos(a + Math.sin(s * 2.3 + i) * 0.9) * (7 + (i % 5) * 3);
      py += Math.sin(a + Math.cos(s * 1.7 + i) * 0.9) * (5 + (i % 4) * 2);
      g.lineTo(px, py);
    }
    g.stroke();
  }

  const cx = w * 0.5;
  const cy = h * 0.5;
  const irisR = h * 0.185;
  const hex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  const [ir, ig, ib] = irisColor;
  const irisHex = `rgb(${hex(ir)},${hex(ig)},${hex(ib)})`;
  const irisDark = `rgb(${hex(ir * 0.38)},${hex(ig * 0.38)},${hex(ib * 0.42)})`;
  const irisBright = `rgb(${hex(ir * 1.5)},${hex(ig * 1.45)},${hex(ib * 1.4)})`;

  const irisGrad = g.createRadialGradient(cx, cy, irisR * 0.2, cx, cy, irisR);
  irisGrad.addColorStop(0, irisDark);
  irisGrad.addColorStop(0.35, irisHex);
  irisGrad.addColorStop(0.78, irisBright);
  irisGrad.addColorStop(0.94, irisHex);
  irisGrad.addColorStop(1, irisDark);
  g.save();
  g.beginPath();
  g.arc(cx, cy, irisR, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = irisGrad;
  g.fillRect(cx - irisR, cy - irisR, irisR * 2, irisR * 2);
  // Fibrous stroma
  for (let i = 0; i < 380; i++) {
    const a = (i / 380) * Math.PI * 2;
    const jitter = fbm2D(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + 5, { octaves: 3, period: 8, seed: 4 });
    const r0 = irisR * (0.24 + jitter * 0.12);
    const r1 = irisR * (0.86 + jitter * 0.16);
    g.strokeStyle = `rgba(255,255,255,${0.015 + (i % 5) * 0.012})`;
    g.lineWidth = 0.8 + (i % 3) * 0.6;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.stroke();
    if (i % 3 === 0) {
      g.strokeStyle = `rgba(0,0,0,${0.03 + (i % 4) * 0.02})`;
      g.beginPath();
      g.moveTo(cx + Math.cos(a + 0.01) * r0, cy + Math.sin(a + 0.01) * r0);
      g.lineTo(cx + Math.cos(a + 0.01) * r1, cy + Math.sin(a + 0.01) * r1);
      g.stroke();
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = irisR * 0.06;
  g.beginPath();
  g.arc(cx, cy, irisR * 0.42, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  // Limbal ring
  g.strokeStyle = 'rgba(12,10,14,0.72)';
  g.lineWidth = irisR * 0.13;
  g.beginPath();
  g.arc(cx, cy, irisR * 0.965, 0, Math.PI * 2);
  g.stroke();

  // Pupil
  const pupilR = irisR * 0.36;
  const pupilGrad = g.createRadialGradient(cx, cy, pupilR * 0.1, cx, cy, pupilR);
  pupilGrad.addColorStop(0, '#000000');
  pupilGrad.addColorStop(0.82, '#050406');
  pupilGrad.addColorStop(1, 'rgba(8,6,10,0.85)');
  g.fillStyle = pupilGrad;
  g.beginPath();
  g.arc(cx, cy, pupilR, 0, Math.PI * 2);
  g.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export function makeEyeMaterial(irisColor: [number, number, number]): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    map: eyeballTexture(irisColor),
    roughness: 0.24,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
}

/** A thin shell over the iris; its highlight is the eye's catchlight. */
export function makeCorneaMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.14,
    roughness: 0.02,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.015,
    depthWrite: false,
    ior: 1.376,
  });
}

// ---------------------------------------------------------------------------
// Hair, brows, clothing
// ---------------------------------------------------------------------------

export function makeHairMaterial(color: THREE.ColorRepresentation, gloss = 0.5): THREE.MeshPhysicalMaterial {
  const maps = buildSurface('hairStrands', hairStrands, { size: 256, normalStrength: 1.2 });
  return new THREE.MeshPhysicalMaterial({
    color,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 1 - gloss * 0.62,
    metalness: 0.02,
    sheen: 0.4,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xb9a893),
    clearcoat: 0.18,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
  });
}

export function makeBrowMaterial(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
}

export interface ClothOptions {
  color: [number, number, number];
  weave?: number;
  roughness?: number;
  sheen?: number;
  metalness?: number;
  size?: number;
}

export function makeClothMaterial(key: string, opts: ClothOptions): THREE.MeshPhysicalMaterial {
  const maps = buildSurface(`cloth_${key}`, fabric(opts.color, opts.weave ?? 64), {
    size: opts.size ?? 512,
    normalStrength: 0.7,
  });
  // Sheen is additive, so it must be faint and tinted toward the cloth colour
  // or a dark garment reads as pale grey under strong light.
  const tint = new THREE.Color(opts.color[0], opts.color[1], opts.color[2]);
  return surfaceMaterial(maps, {
    roughness: opts.roughness ?? 1,
    metalness: opts.metalness ?? 0,
    sheen: (opts.sheen ?? 0.4) * 0.18,
    sheenRoughness: 0.75,
    sheenColor: tint.clone().lerp(new THREE.Color(0xffffff), 0.35),
    normalScale: new THREE.Vector2(0.45, 0.45),
  });
}

export function makeShoeMaterial(color: THREE.ColorRepresentation = 0x15161a): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.3 });
}

export function makeLedMaterial(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, toneMapped: true });
}
